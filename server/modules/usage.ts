/**
 * Guardian daily time limits — measured and enforced by the server.
 *
 * Usage is counted from the child's own authenticated activity: every request
 * adds the time since the previous one (gaps longer than 5 minutes count as a
 * break, not usage). The app sends a heartbeat while it is visible so quiet play
 * is counted too; skipping heartbeats never *reduces* time, and any API call
 * still counts. When the limit is reached, NEW experiences are refused
 * (starting missions, Siraj, chat, scholar questions, AMANAH/NOUR, uploads)
 * while progress is preserved: an attempt already in progress can still be
 * completed and saved. A guardian can grant extra minutes for today.
 */
import { Hono, type MiddlewareHandler } from 'hono';
import { z } from 'zod';
import type { AppEnv, Services } from '../context.ts';
import type { Access } from '../auth/access.ts';
import { one } from '../db/index.ts';
import { AppError } from '../lib/errors.ts';
import { requireAccess } from '../auth/middleware.ts';

const MAX_GAP_S = 300;

export interface UsageStatus {
  /** False when no limit applies (not a child, or the guardian chose "no limit"). */
  enforced: boolean;
  limitMinutes: number;
  extraMinutes: number;
  usedSeconds: number;
  remainingSeconds: number;
  limited: boolean;
  date: string;
}

/** The child's local date (from their prayer location) so "today" resets at their midnight. */
async function localDate(s: Services, userId: string) {
  const p = await one<{ time_zone: string }>(s.db, 'select time_zone from prayer_preferences where user_id = $1', [userId]);
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: p?.time_zone ?? 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(s.now());
  } catch {
    return s.now().toISOString().slice(0, 10);
  }
}

export const appliesTo = (a: Access) => a.ageBand === 'child' && a.parental.dailyMinutes > 0;

export async function usageStatus(s: Services, a: Access): Promise<UsageStatus> {
  const date = await localDate(s, a.userId);
  const row = await one<{ seconds: number; extra_minutes: number }>(s.db, 'select seconds, extra_minutes from daily_usage where user_id = $1 and usage_date = $2', [a.userId, date]);
  const enforced = appliesTo(a);
  const limitMinutes = enforced ? a.parental.dailyMinutes : 0;
  const extraMinutes = row?.extra_minutes ?? 0;
  const usedSeconds = row?.seconds ?? 0;
  const remainingSeconds = enforced ? Math.max(0, (limitMinutes + extraMinutes) * 60 - usedSeconds) : 0;
  return { enforced, limitMinutes, extraMinutes, usedSeconds, remainingSeconds, limited: enforced && remainingSeconds <= 0, date };
}

/** Adds the time since the child's previous activity (bounded) to today's usage. */
export async function recordActivity(s: Services, a: Access) {
  const date = await localDate(s, a.userId);
  const now = s.now();
  await s.db.query(
    `insert into daily_usage (user_id, usage_date, seconds, last_activity_at) values ($1, $2, 0, $3)
     on conflict (user_id, usage_date) do update set
       seconds = daily_usage.seconds + case
         when daily_usage.last_activity_at is null then 0
         when extract(epoch from ($3::timestamptz - daily_usage.last_activity_at)) between 0 and ${MAX_GAP_S}
           then floor(extract(epoch from ($3::timestamptz - daily_usage.last_activity_at)))::int
         else 0 end,
       last_activity_at = greatest(coalesce(daily_usage.last_activity_at, $3::timestamptz), $3::timestamptz)`,
    [a.userId, date, now.toISOString()],
  );
}

/** New experiences a child can't start once today's time is used up. */
const RESTRICTED: RegExp[] = [
  /^\/api\/missions\/[^/]+\/attempts$/,
  /^\/api\/siraj\/ask$/,
  /^\/api\/circles\/[^/]+\/(messages|join)$/,
  /^\/api\/messages\/[^/]+\/reactions$/,
  /^\/api\/scholar\/(questions|organize)$/,
  /^\/api\/audits$/,
  /^\/api\/uploads$/,
];

export const timeLimitMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const a = c.get('access');
  if (a && appliesTo(a)) {
    const s = c.get('services');
    await recordActivity(s, a);
    if (c.req.method === 'POST' && RESTRICTED.some((re) => re.test(c.req.path))) {
      const st = await usageStatus(s, a);
      if (st.limited) throw new AppError('forbidden', 'That’s all the time for today. Your progress is saved.', { reason: 'time-limit', usage: st });
    }
  }
  await next();
};

export const usageRoutes = new Hono<AppEnv>();
usageRoutes.get('/', async (c) => c.json(await usageStatus(c.get('services'), requireAccess(c))));
/** Sent every minute while the app is visible. Recording happened in the middleware. */
usageRoutes.post('/heartbeat', async (c) => c.json(await usageStatus(c.get('services'), requireAccess(c))));

export const ExtendBody = z.object({ minutes: z.number().int().min(5).max(120) });
