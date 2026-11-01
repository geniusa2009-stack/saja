/**
 * MY DAY — persisted planner + prayer companion.
 * Plans are recomputed by the planner service (src/domain/planner.ts) whenever
 * the person says something about their day. Prayer tracking is private,
 * self-reported and optional; nothing is ever locked behind it.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, Services } from '../context.ts';
import type { Access } from '../auth/access.ts';
import { one } from '../db/index.ts';
import { AppError } from '../lib/errors.ts';
import { body, Id, query } from '../lib/http.ts';
import { requireAccess } from '../auth/middleware.ts';
import { buildPlan, DEFAULT_PREFS, parseConstraints, planHeadline, type Constraint, type DayPrefs } from '../../src/domain/planner.ts';
import { CITIES, coarsen, computePrayerTimes, localNow, nextPrayer, type MethodId } from '../../src/domain/prayerTimes.ts';
import type { GoalId } from '../../src/domain/types.ts';
import { track } from './analytics.ts';

const PRAYER = z.enum(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);

async function prayerSetup(s: Services, userId: string) {
  const p = await one<{ city_id: string | null; lat: string | null; lng: string | null; time_zone: string; method: string; asr: 'standard' | 'hanafi' }>(
    s.db,
    'select city_id, lat, lng, time_zone, method, asr from prayer_preferences where user_id = $1',
    [userId],
  );
  const city = CITIES.find((x) => x.id === (p?.city_id ?? 'makkah')) ?? CITIES[0];
  const custom = p?.lat != null && p?.lng != null;
  const loc = custom ? { lat: Number(p!.lat), lng: Number(p!.lng), timeZone: p!.time_zone } : { lat: city.lat, lng: city.lng, timeZone: city.timeZone };
  const method = (p?.method && p.method !== 'auto' ? p.method : custom ? 'MWL' : city.method) as MethodId;
  return { loc, method, asr: p?.asr ?? 'standard', cityId: custom ? null : city.id };
}

export async function computeToday(s: Services, userId: string) {
  const setup = await prayerSetup(s, userId);
  const ln = localNow(setup.loc.timeZone, s.now());
  const times = computePrayerTimes(ln, setup.loc, { method: setup.method, asr: setup.asr });
  const date = `${ln.year}-${String(ln.month).padStart(2, '0')}-${String(ln.day).padStart(2, '0')}`;
  const weekday = new Date(Date.UTC(ln.year, ln.month - 1, ln.day)).getUTCDay();
  return { ...setup, times, date, nowHours: ln.hours, weekday, next: nextPrayer(times, ln.hours) };
}

async function dayPrefs(s: Services, a: Access): Promise<DayPrefs> {
  if (!a.memory.schedule) return DEFAULT_PREFS;
  const row = await one<{ prefs: DayPrefs }>(s.db, 'select prefs from day_preferences where user_id = $1', [a.userId]);
  return { ...DEFAULT_PREFS, ...(row?.prefs ?? {}) };
}

/**
 * The durable plan is produced here, by the shared planner, from:
 * prayer times (server-computed), schedule preferences (only if remembered),
 * parsed constraints (never the person's raw words unless schedule memory is on),
 * goals, and the adaptive engine's next mission.
 */
async function recompute(s: Services, a: Access, input: { note?: string | null; constraints?: Constraint[] }) {
  const today = await computeToday(s, a.userId);
  const prefs = await dayPrefs(s, a);
  const note = input.note ?? null;
  const constraints = input.constraints ?? parseConstraints(note ?? '');
  const profile = await one<{ goals: GoalId[] }>(s.db, 'select goals from profiles where user_id = $1', [a.userId]);
  const { recommendationsFor } = await import('./missions/routes.ts');
  const nextMission = (await recommendationsFor(s.db, a))[0]?.mission;
  const items = buildPlan({
    prefs,
    prayerTimes: today.times,
    weekday: today.weekday,
    now: today.nowHours,
    constraints,
    goals: profile?.goals ?? [],
    mission: nextMission ? { id: nextMission.id, title: nextMission.title, minutes: nextMission.minutes } : undefined,
  });
  // The note is schedule memory: kept only if allowed.
  await s.db.query(
    `insert into daily_plans (user_id, plan_date, note, constraints, items) values ($1,$2,$3,$4,$5)
     on conflict (user_id, plan_date) do update set note = $3, constraints = $4, items = $5, generated_at = now()`,
    [a.userId, today.date, a.memory.schedule ? note : null, JSON.stringify(constraints), JSON.stringify(items)],
  );
  return { today, constraints, items };
}

async function dayView(s: Services, a: Access) {
  const today = await computeToday(s, a.userId);
  let plan = await one<{ note: string | null; constraints: unknown[]; items: unknown[] }>(s.db, 'select note, constraints, items from daily_plans where user_id = $1 and plan_date = $2', [a.userId, today.date]);
  if (!plan) {
    const r = await recompute(s, a, {});
    plan = { note: null, constraints: r.constraints, items: r.items };
  }
  const status = await s.db.query<{ item_id: string; done: boolean }>('select item_id, done from plan_item_status where user_id = $1 and plan_date = $2', [a.userId, today.date]);
  const log = await s.db.query<{ prayer: string; mark: string }>('select prayer, mark from prayer_log where user_id = $1 and log_date = $2', [a.userId, today.date]);
  const goals = await s.db.query('select id, text, done from goals where user_id = $1 order by created_at', [a.userId]);
  const locale = (await one<{ locale: 'en' | 'ar' }>(s.db, 'select locale from profiles where user_id = $1', [a.userId]))?.locale ?? 'en';
  return {
    date: today.date,
    prayer: { times: today.times, next: today.next, method: today.method, asr: today.asr, cityId: today.cityId, timeZone: today.loc.timeZone, log: Object.fromEntries(log.map((l) => [l.prayer, l.mark])) },
    plan: {
      note: plan.note,
      constraints: plan.constraints,
      items: plan.items,
      done: status.filter((x) => x.done).map((x) => x.item_id),
      headline: planHeadline(plan.constraints as never, locale),
    },
    goals,
    scheduleRemembered: a.memory.schedule,
  };
}

export const dayRoutes = new Hono<AppEnv>();

dayRoutes.get('/', async (c) => c.json(await dayView(c.get('services'), requireAccess(c))));

const ConstraintIn = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('busy') }),
  z.object({ kind: z.literal('exam'), when: z.enum(['today', 'tomorrow']) }),
  z.object({ kind: z.literal('minutes'), value: z.number().int().min(1).max(240) }),
  z.object({ kind: z.literal('tired') }),
  z.object({ kind: z.literal('free') }),
]);

/**
 * Preferred: the app parses "I have an exam tomorrow" on the device and sends only
 * the structured constraints — the person's own words never leave the device.
 */
dayRoutes.put('/constraints', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const { constraints } = await body(c, z.object({ constraints: z.array(ConstraintIn).max(6) }));
  await recompute(s, a, { constraints });
  return c.json(await dayView(s, a));
});

/** "I have an exam tomorrow" → the planner recomputes the day (raw text kept only with schedule memory). */
dayRoutes.put('/note', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const { note } = await body(c, z.object({ note: z.string().max(300) }));
  await recompute(s, a, { note: note.trim() || null });
  return c.json(await dayView(s, a));
});

dayRoutes.put('/items/:itemId', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const { done } = await body(c, z.object({ done: z.boolean() }));
  const today = await computeToday(s, a.userId);
  const itemId = z.string().max(40).parse(c.req.param('itemId'));
  await s.db.query(
    `insert into plan_item_status (user_id, plan_date, item_id, done) values ($1,$2,$3,$4)
     on conflict (user_id, plan_date, item_id) do update set done = $4, updated_at = now()`,
    [a.userId, today.date, itemId, done],
  );
  const plan = await one<{ items: { id: string; kind: string }[] }>(s.db, 'select items from daily_plans where user_id = $1 and plan_date = $2', [a.userId, today.date]);
  const checkable = (plan?.items ?? []).filter((i) => i.kind !== 'prayer' && i.kind !== 'commitment').map((i) => i.id);
  const [{ n }] = await s.db.query<{ n: number }>('select count(*)::int as n from plan_item_status where user_id = $1 and plan_date = $2 and done and item_id = any($3::text[])', [a.userId, today.date, checkable]);
  if (checkable.length && n === checkable.length) await track(s.db, a.userId, 'daily_plan_completed', {});
  return c.json({ ok: true });
});

const PrefsIn = z.object({
  wake: z.number().min(3).max(12),
  sleep: z.number().min(18).max(26),
  commitments: z.array(z.object({ id: z.string().max(20), label: z.string().max(40), start: z.number().min(0).max(24), end: z.number().min(0).max(24), days: z.array(z.number().int().min(0).max(6)).max(7) })).max(4),
  studyTime: z.enum(['morning', 'afternoon', 'evening']),
  learningMinutes: z.number().int().min(5).max(120),
  reminderStyle: z.enum(['gentle', 'minimal', 'off']),
});

dayRoutes.get('/preferences', async (c) => {
  const a = requireAccess(c);
  return c.json({ prefs: await dayPrefs(c.get('services'), a), remembered: a.memory.schedule });
});
dayRoutes.put('/preferences', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const prefs = await body(c, PrefsIn);
  if (!a.memory.schedule) return c.json({ prefs, remembered: false }); // used for this plan only, not stored
  await s.db.query('insert into day_preferences (user_id, prefs) values ($1,$2) on conflict (user_id) do update set prefs = $2, updated_at = now()', [a.userId, JSON.stringify(prefs)]);
  const last = await one<{ constraints: Constraint[] }>(s.db, 'select constraints from daily_plans where user_id = $1 order by plan_date desc limit 1', [a.userId]);
  await recompute(s, a, { constraints: last?.constraints ?? [] });
  return c.json({ prefs, remembered: true });
});

dayRoutes.post('/goals', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const { text } = await body(c, z.object({ text: z.string().trim().min(1).max(80) }));
  const [{ n }] = await s.db.query<{ n: number }>('select count(*)::int as n from goals where user_id = $1', [a.userId]);
  if (n >= 20) throw new AppError('conflict', 'That’s plenty of goals for now — try finishing one first.');
  return c.json(await one(s.db, 'insert into goals (user_id, text) values ($1,$2) returning id, text, done', [a.userId, text]), 201);
});
dayRoutes.put('/goals/:id', async (c) => {
  const a = requireAccess(c);
  const { done } = await body(c, z.object({ done: z.boolean() }));
  await c.get('services').db.query('update goals set done = $1 where id = $2 and user_id = $3', [done, Id.parse(c.req.param('id')), a.userId]);
  return c.json({ ok: true });
});
dayRoutes.delete('/goals/:id', async (c) => {
  const a = requireAccess(c);
  await c.get('services').db.query('delete from goals where id = $1 and user_id = $2', [Id.parse(c.req.param('id')), a.userId]);
  return c.json({ ok: true });
});

export const prayerRoutes = new Hono<AppEnv>();

prayerRoutes.put('/preferences', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const b = await body(
    c,
    z.object({
      cityId: z.string().max(30).nullable(),
      coords: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullable(),
      timeZone: z.string().max(60),
      method: z.enum(['auto', 'MWL', 'ISNA', 'Egypt', 'Makkah', 'Karachi']),
      asr: z.enum(['standard', 'hanafi']),
    }),
  );
  try {
    new Intl.DateTimeFormat('en', { timeZone: b.timeZone });
  } catch {
    throw new AppError('bad_request', 'Unknown time zone.');
  }
  if (b.cityId && !CITIES.some((x) => x.id === b.cityId)) throw new AppError('bad_request', 'Unknown city.');
  const c2 = b.coords ? coarsen(b.coords.lat, b.coords.lng) : null; // ~1 km: never precise enough to locate a home
  await s.db.query(
    `insert into prayer_preferences (user_id, city_id, lat, lng, time_zone, method, asr) values ($1,$2,$3,$4,$5,$6,$7)
     on conflict (user_id) do update set city_id=$2, lat=$3, lng=$4, time_zone=$5, method=$6, asr=$7, updated_at = now()`,
    [a.userId, b.coords ? null : b.cityId, c2?.lat ?? null, c2?.lng ?? null, b.timeZone, b.method, b.asr],
  );
  await s.db.query('delete from daily_plans where user_id = $1 and plan_date >= current_date - 1', [a.userId]); // times changed → re-plan
  return c.json(await dayView(s, a));
});

prayerRoutes.put('/log', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const b = await body(c, z.object({ prayer: PRAYER, mark: z.enum(['prayed', 'later']).nullable() }));
  const today = await computeToday(s, a.userId);
  if (b.mark) {
    await s.db.query(
      `insert into prayer_log (user_id, log_date, prayer, mark) values ($1,$2,$3,$4)
       on conflict (user_id, log_date, prayer) do update set mark = $4, updated_at = now()`,
      [a.userId, today.date, b.prayer, b.mark],
    );
  } else {
    await s.db.query('delete from prayer_log where user_id = $1 and log_date = $2 and prayer = $3', [a.userId, today.date, b.prayer]);
  }
  return c.json({ ok: true });
});

prayerRoutes.get('/history', async (c) => {
  const a = requireAccess(c);
  const { days } = query(c, z.object({ days: z.coerce.number().int().min(1).max(60).default(7) }));
  const rows = await c.get('services').db.query(`select log_date, prayer, mark from prayer_log where user_id = $1 and log_date >= current_date - $2::int order by log_date`, [a.userId, days]);
  return c.json({ log: rows, private: true });
});

