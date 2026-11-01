/**
 * Privacy-conscious product analytics: a closed list of event names and small,
 * non-content properties. Never message text, questions or answers.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../context.ts';
import type { Queryable } from '../db/index.ts';
import { body } from '../lib/http.ts';
import { requireAccess } from '../auth/middleware.ts';

export const EVENTS = [
  'onboarding_completed',
  'account_created',
  'mission_started',
  'mission_completed',
  'mission_failed',
  'adaptive_switch_triggered',
  'adaptive_switch_accepted',
  'evidence_opened',
  'siraj_answered',
  'siraj_escalated',
  'scholar_question_submitted',
  'circle_joined',
  'message_sent',
  'daily_plan_completed',
  'reminder_scheduled',
  'audit_completed',
  'dm_requested',
] as const;
export type EventName = (typeof EVENTS)[number];

const Props = z.record(z.string().max(40), z.union([z.string().max(60), z.number(), z.boolean()])).refine((o) => Object.keys(o).length <= 8);

export async function track(q: Queryable, userId: string | null, name: EventName, props: Record<string, string | number | boolean> = {}) {
  await q.query('insert into analytics_events (user_id, name, props) values ($1, $2, $3)', [userId, name, JSON.stringify(props)]);
}

export const analyticsRoutes = new Hono<AppEnv>();
analyticsRoutes.post('/', async (c) => {
  const a = requireAccess(c);
  const { name, props } = await body(c, z.object({ name: z.enum(EVENTS), props: Props.default({}) }));
  await c.get('services').limiter.take('write', a.userId);
  await track(c.get('services').db, a.userId, name, props);
  return c.json({ ok: true });
});
