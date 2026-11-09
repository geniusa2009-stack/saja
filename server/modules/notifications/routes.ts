import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../../context.ts';
import { AppError } from '../../lib/errors.ts';
import { body, Id, L10n } from '../../lib/http.ts';
import { requireAccess } from '../../auth/middleware.ts';
import { CATEGORIES, getPrefs, notify } from './service.ts';
import { track } from '../analytics.ts';
import { getDevotionalRoutines, saveDevotionalRoutine } from './routines.ts';
import { getPrayerAlertPrefs, setPrayerAlertPrefs } from './prayerAlerts.ts';

export const notificationRoutes = new Hono<AppEnv>();

notificationRoutes.get('/', async (c) => {
  const a = requireAccess(c);
  const db = c.get('services').db;
  const items = await db.query(
    `select id, category, title, body, url, status, scheduled_for, delivered_at, read_at from notifications
      where user_id = $1 and status <> 'cancelled' order by coalesce(delivered_at, scheduled_for) desc limit 50`,
    [a.userId],
  );
  const [{ n }] = await db.query<{ n: number }>("select count(*)::int as n from notifications where user_id = $1 and status = 'delivered'", [a.userId]);
  return c.json({ items, unread: n });
});

notificationRoutes.post('/:id/read', async (c) => {
  const a = requireAccess(c);
  await c.get('services').db.query("update notifications set status = 'read', read_at = now() where id = $1 and user_id = $2 and status = 'delivered'", [Id.parse(c.req.param('id')), a.userId]);
  return c.json({ ok: true });
});

/** Personal reminders, e.g. "Remind me later" for a prayer. Up to 48 hours ahead. */
notificationRoutes.post('/schedule', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const b = await body(c, z.object({ category: z.enum(['prayer', 'mission', 'reflection']), title: L10n, body: L10n, at: z.string().datetime(), url: z.string().startsWith('/').max(120).optional(), dedupeKey: z.string().max(80).optional() }));
  const at = new Date(b.at);
  const now = s.now();
  if (at.getTime() < now.getTime() - 60_000 || at.getTime() > now.getTime() + 48 * 3_600_000) throw new AppError('bad_request', 'Reminders can be set up to 48 hours ahead.');
  const id = await notify(s, a.userId, { category: b.category, title: b.title, body: b.body, url: b.url, dedupeKey: b.dedupeKey, scheduledFor: at });
  if (id) await track(s.db, a.userId, 'reminder_scheduled', { category: b.category });
  return c.json({ id, scheduled: !!id, reason: id ? null : 'disabled-or-duplicate' }, id ? 201 : 200);
});

/** Opt-in recurring morning/evening reminders. User-chosen local time and IANA timezone only. */
notificationRoutes.get('/routines', async (c) => {
  const a = requireAccess(c);
  return c.json({ routines: await getDevotionalRoutines(c.get('services').db, a.userId) });
});

notificationRoutes.put('/routines/:kind', async (c) => {
  const a = requireAccess(c);
  const kind = z.enum(['morning', 'evening']).parse(c.req.param('kind'));
  const input = await body(c, z.object({
    enabled: z.boolean(),
    time: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/),
    timeZone: z.string().min(2).max(64),
  }));
  try { new Intl.DateTimeFormat('en-US', { timeZone: input.timeZone }); }
  catch { throw new AppError('bad_request', 'Use a valid timezone name.'); }
  return c.json({ routine: await saveDevotionalRoutine(c.get('services').db, a.userId, kind, input) });
});

/** Daily prayers are opt-in. Alerts require a saved prayer location on this account. */
notificationRoutes.get('/prayer-alerts', async (c) => {
  const a = requireAccess(c);
  return c.json(await getPrayerAlertPrefs(c.get('services').db, a.userId));
});

notificationRoutes.put('/prayer-alerts', async (c) => {
  const a = requireAccess(c);
  const input = await body(c, z.object({
    enabled: z.boolean(),
    prayers: z.array(z.enum(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'])).max(5),
  }));
  return c.json(await setPrayerAlertPrefs(c.get('services').db, a.userId, input));
});

notificationRoutes.delete('/:id', async (c) => {
  const a = requireAccess(c);
  await c.get('services').db.query("update notifications set status = 'cancelled' where id = $1 and user_id = $2 and status = 'scheduled'", [Id.parse(c.req.param('id')), a.userId]);
  return c.json({ ok: true });
});

notificationRoutes.get('/preferences', async (c) => {
  const a = requireAccess(c);
  return c.json({ categories: await getPrefs(c.get('services').db, a.userId), pushAllowed: a.ageBand !== 'child' });
});

notificationRoutes.put('/preferences', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const Pref = z.object({ inApp: z.boolean(), push: z.boolean() });
  const b = await body(c, z.object({ categories: z.object(Object.fromEntries(CATEGORIES.map((k) => [k, Pref])) as Record<(typeof CATEGORIES)[number], typeof Pref>) }));
  if (a.ageBand === 'child') for (const k of CATEGORIES) b.categories[k].push = false; // enforced, not just hidden
  await s.db.query('insert into notification_preferences (user_id, categories) values ($1, $2) on conflict (user_id) do update set categories = $2, updated_at = now()', [a.userId, JSON.stringify(b.categories)]);
  return c.json({ categories: b.categories });
});

notificationRoutes.get('/push/key', (c) => {
  const s = c.get('services');
  return c.json({ mode: s.push.mode, publicKey: s.push.publicKey });
});

notificationRoutes.post('/push/subscribe', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  if (s.push.mode !== 'web-push') throw new AppError('unavailable', 'Push notifications are not configured on this server.');
  if (a.ageBand === 'child') throw new AppError('forbidden', 'Push notifications are off in Kids Mode.');
  const b = await body(c, z.object({ endpoint: z.string().url().max(800), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) }));
  if (!b.endpoint.startsWith('https://')) throw new AppError('bad_request', 'Invalid push endpoint.');
  await s.db.query('insert into push_subscriptions (user_id, endpoint, keys) values ($1,$2,$3) on conflict (endpoint) do update set user_id = $1, keys = $3, failure_count = 0', [a.userId, b.endpoint, JSON.stringify(b.keys)]);
  return c.json({ ok: true }, 201);
});

notificationRoutes.post('/push/unsubscribe', async (c) => {
  const a = requireAccess(c);
  const { endpoint } = await body(c, z.object({ endpoint: z.string().max(800) }));
  await c.get('services').db.query('delete from push_subscriptions where user_id = $1 and endpoint = $2', [a.userId, endpoint]);
  return c.json({ ok: true });
});
