/**
 * Minimum staff administration: find accounts, grant/revoke roles (recorded with
 * a reason), and one audit trail across moderation, content review and the
 * scholar workflow. Admin-only except the audit trail (admins and moderators).
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../context.ts';
import { one } from '../db/index.ts';
import { AppError } from '../lib/errors.ts';
import { body, Id, query } from '../lib/http.ts';
import { requireRole } from '../auth/middleware.ts';
import { logAction } from './moderation.ts';

export const adminRoutes = new Hono<AppEnv>();
const ROLE = z.enum(['guardian', 'mentor', 'scholar', 'moderator', 'admin']);

adminRoutes.get('/users', async (c) => {
  requireRole(c, 'admin');
  const { q } = query(c, z.object({ q: z.string().trim().min(3).max(200) }));
  // Accounts only (guests have no email); ILIKE on email with escaped wildcards.
  const pattern = `%${q.toLowerCase().replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  const rows = await c.get('services').db.query(
    `select u.id, u.email, u.created_at, a.declared_band, a.approved_band, a.guardian_consent,
            coalesce((select array_agg(role order by role) from user_roles r where r.user_id = u.id), '{}') as roles
       from users u left join age_status a on a.user_id = u.id
      where u.email is not null and lower(u.email) like $1 and not u.is_demo order by u.created_at desc limit 25`,
    [pattern],
  );
  return c.json({ users: rows });
});

adminRoutes.post('/users/:id/roles', async (c) => {
  const s = c.get('services');
  const a = requireRole(c, 'admin');
  const id = Id.parse(c.req.param('id'));
  const b = await body(c, z.object({ role: ROLE, grant: z.boolean(), reason: z.string().trim().min(3).max(300) }));
  const u = await one<{ is_guest: boolean; is_demo: boolean }>(s.db, 'select is_guest, is_demo from users where id = $1', [id]);
  if (!u || u.is_demo) throw new AppError('not_found', 'Account not found.');
  if (u.is_guest) throw new AppError('bad_request', 'Roles can only be given to accounts, not guest journeys.');
  if (!b.grant && b.role === 'admin' && id === a.userId) throw new AppError('bad_request', 'You can’t remove your own admin role.');
  if (b.grant) await s.db.query('insert into user_roles (user_id, role, granted_by) values ($1,$2,$3) on conflict do nothing', [id, b.role, a.userId]);
  else await s.db.query('delete from user_roles where user_id = $1 and role = $2', [id, b.role]);
  await logAction(s.db, { targetType: 'user', targetId: id, action: b.grant ? 'allow' : 'hide', reason: `${b.grant ? 'granted' : 'revoked'} role ${b.role}: ${b.reason}`, actorId: a.userId });
  // A scholar ROLE is not verification: that is a separate, recorded admin decision.
  return c.json({ ok: true, note: b.role === 'scholar' && b.grant ? 'Scholar role granted. Verification is separate.' : undefined });
});

/** One timeline of staff and system decisions (no message content beyond what the decision was about). */
/** Free-tier usage per AI provider in this process (requests, tokens, limits, cool-downs). No content. */
adminRoutes.get('/ai-usage', async (c) => {
  requireRole(c, 'admin');
  const s = c.get('services');
  return c.json({ state: s.ai.state(), providers: s.ai.usage() });
});

adminRoutes.get('/audit', async (c) => {
  requireRole(c, 'admin', 'moderator');
  const { limit } = query(c, z.object({ limit: z.coerce.number().int().min(1).max(200).default(100) }));
  const rows = await c.get('services').db.query(
    `(select 'moderation' as kind, m.target_type as target_type, m.target_id as target_id, m.action as action, m.actor_kind as actor_kind,
             m.reason as detail, m.categories as categories, m.created_at from moderation_actions m)
     union all
     (select 'content-review', case when r.document_id is not null then 'knowledge' when r.mission_id is not null then 'mission' else r.block_kind end,
             coalesce(r.document_id, r.mission_id, r.block_id) || '@v' || r.version, r.to_status, r.reviewer_role, r.scope, null, r.created_at from content_reviews r)
     union all
     (select 'scholar-workflow', 'question', e.question_id::text, e.event, case when e.actor_scholar_id is not null then 'scholar' when e.actor_user_id is not null then 'human' else 'system' end, e.note, null, e.created_at from scholar_question_events e)
     order by created_at desc limit $1`,
    [limit],
  );
  return c.json({ entries: rows });
});
