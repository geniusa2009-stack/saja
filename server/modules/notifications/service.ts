/**
 * Notifications: stored, scheduled, delivered in-app (realtime) and via Web
 * Push where configured. Categories respect each person's preferences.
 * Children never receive push by default (guardian/product control).
 */
import type { Services } from '../../context.ts';
import type { Queryable } from '../../db/index.ts';
import { one } from '../../db/index.ts';
import { userChannel } from '../../lib/bus.ts';
import { log } from '../../lib/log.ts';

export const CATEGORIES = ['prayer', 'mission', 'circle', 'scholar', 'moderation', 'unlock', 'reflection', 'adhkar'] as const;
export type Category = (typeof CATEGORIES)[number];
export type CategoryPrefs = Record<Category, { inApp: boolean; push: boolean }>;
type L = { en: string; ar: string };

export function defaultPrefs(isChild: boolean): CategoryPrefs {
  return Object.fromEntries(CATEGORIES.map((c) => [c, { inApp: true, push: !isChild && (c === 'prayer' || c === 'scholar') }])) as CategoryPrefs;
}

export async function getPrefs(q: Queryable, userId: string): Promise<CategoryPrefs> {
  const row = await one<{ categories: CategoryPrefs }>(q, 'select categories from notification_preferences where user_id = $1', [userId]);
  const age = await one<{ band: string }>(q, 'select coalesce(approved_band, declared_band) as band from age_status where user_id = $1', [userId]);
  const base = defaultPrefs(age?.band === 'child');
  return { ...base, ...(row?.categories ?? {}) };
}

export interface NotifyInput {
  category: Category;
  title: L;
  body: L;
  url?: string;
  dedupeKey?: string;
  scheduledFor?: Date;
}

/**
 * A notification must never break the action that caused it (an answer, a moderation
 * decision…): failures are logged and reported as "not sent".
 */
export async function notify(s: Services, userId: string, n: NotifyInput): Promise<string | null> {
  try {
    return await notifyUnsafe(s, userId, n);
  } catch (e) {
    log.error('notification.failed', { category: n.category, error: e });
    return null;
  }
}

async function notifyUnsafe(s: Services, userId: string, n: NotifyInput): Promise<string | null> {
  const prefs = await getPrefs(s.db, userId);
  const p = prefs[n.category];
  if (!p.inApp && !p.push) return null; // category turned off by the person
  const row = await one<{ id: string }>(
    s.db,
    `insert into notifications (user_id, category, title, body, url, scheduled_for, dedupe_key)
     values ($1,$2,$3,$4,$5,$6,$7)
     on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing returning id`,
    [userId, n.category, JSON.stringify(n.title), JSON.stringify(n.body), n.url ?? null, (n.scheduledFor ?? s.now()).toISOString(), n.dedupeKey ?? null],
  );
  if (!row) return null;
  if (!n.scheduledFor || n.scheduledFor <= s.now()) await deliver(s, row.id);
  return row.id;
}

export async function deliver(s: Services, id: string) {
  const n = await one<{ id: string; user_id: string; category: Category; title: L; body: L; url: string | null; status: string; created_at: string }>(
    s.db,
    'select id, user_id, category, title, body, url, status, created_at from notifications where id = $1',
    [id],
  );
  if (!n || n.status !== 'scheduled') return;
  const prefs = await getPrefs(s.db, n.user_id);
  const age = await one<{ band: string }>(s.db, 'select coalesce(approved_band, declared_band) as band from age_status where user_id = $1', [n.user_id]);
  const channels: string[] = [];
  if (prefs[n.category].inApp) {
    s.bus.publish(userChannel(n.user_id), { type: 'notification', userId: n.user_id, notification: { ...n, status: 'delivered' } });
    channels.push('in-app');
  }
  if (prefs[n.category].push && s.push.mode === 'web-push' && age?.band !== 'child') {
    const subs = await s.db.query<{ id: string; endpoint: string; keys: { p256dh: string; auth: string } }>('select id, endpoint, keys from push_subscriptions where user_id = $1', [n.user_id]);
    const loc = (await one<{ locale: 'en' | 'ar' }>(s.db, 'select locale from profiles where user_id = $1', [n.user_id]))?.locale ?? 'en';
    for (const sub of subs) {
      const r = await s.push.send(sub, { title: n.title[loc], body: n.body[loc], url: n.url ?? '/', tag: n.category });
      if (r === 'sent') channels.push('push');
      else if (r === 'gone') await s.db.query('delete from push_subscriptions where id = $1', [sub.id]);
      else {
        await s.db.query('update push_subscriptions set failure_count = failure_count + 1 where id = $1', [sub.id]);
        log.warn('notification.push_failed', { notification: n.id });
      }
    }
  }
  await s.db.query("update notifications set status = 'delivered', delivered_at = now(), channels = $2 where id = $1", [n.id, [...new Set(channels)]]);
}

/** Deliver due scheduled notifications. Called by the scheduler loop (and tests). */
export async function runDue(s: Services, limit = 100): Promise<number> {
  const due = await s.db.query<{ id: string }>("select id from notifications where status = 'scheduled' and scheduled_for <= $1 order by scheduled_for limit $2", [s.now().toISOString(), limit]);
  for (const d of due) {
    try {
      await deliver(s, d.id);
    } catch (e) {
      log.error('notification.delivery_failed', { error: e });
      await s.db.query("update notifications set status = 'failed' where id = $1", [d.id]);
    }
  }
  return due.length;
}
