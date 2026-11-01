/**
 * Guardian consent. States are explicit: AGE DECLARED → (optionally) AGE APPROVED
 * → GUARDIAN CONSENTED. None of this is legal identity verification; it links a
 * child's account to an adult account that accepted responsibility.
 */
import { loadAccess } from '../auth/access.ts';
import { ExtendBody, usageStatus } from './usage.ts';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../context.ts';
import { one } from '../db/index.ts';
import { AppError } from '../lib/errors.ts';
import { body, Id } from '../lib/http.ts';
import { humanCode, sha256 } from '../lib/crypto.ts';
import { requireAccess, requireAccount } from '../auth/middleware.ts';
import { CIRCLES } from '../../src/content/community.ts';

export const guardianRoutes = new Hono<AppEnv>();

/** A child asks for a code to give to their parent/guardian. */
guardianRoutes.post('/link-code', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  if (a.ageBand !== 'child' && a.ageBand !== 'teen') throw new AppError('forbidden', 'Guardian links are for children and teens.');
  await s.limiter.take('auth', `link:${a.userId}`);
  const code = humanCode(8);
  await s.db.query("update guardian_links set status = 'revoked' where child_user_id = $1 and status = 'pending'", [a.userId]);
  await s.db.query("insert into guardian_links (child_user_id, code_hash, code_expires_at) values ($1, $2, now() + interval '7 days')", [a.userId, sha256(code)]);
  return c.json({ code, expiresInDays: 7 });
});

async function assertGuardianOf(c: Parameters<typeof requireAccess>[0], childId: string) {
  const a = requireAccount(c);
  const link = await one(c.get('services').db, "select 1 from guardian_links where guardian_user_id = $1 and child_user_id = $2 and status = 'active'", [a.userId, childId]);
  if (!link) throw new AppError('forbidden', 'You are not the guardian of this account.');
  return a;
}

/** An adult account enters the code and gives consent. */
guardianRoutes.post('/accept', async (c) => {
  const s = c.get('services');
  const a = requireAccount(c);
  if (a.ageBand !== 'adult') throw new AppError('forbidden', 'Only adult accounts can act as guardians.');
  await s.limiter.take('auth', `accept:${a.userId}`);
  const { code } = await body(c, z.object({ code: z.string().trim().toUpperCase().length(8), consent: z.literal(true) }));
  const link = await one<{ id: string; child_user_id: string }>(s.db, "select id, child_user_id from guardian_links where code_hash = $1 and status = 'pending' and code_expires_at > now()", [sha256(code)]);
  if (!link) throw new AppError('bad_request', 'This code is invalid or has expired.');
  if (link.child_user_id === a.userId) throw new AppError('forbidden', 'You cannot be your own guardian.');
  await s.db.tx(async (q) => {
    await q.query("update guardian_links set guardian_user_id = $1, status = 'active', consented_at = now() where id = $2", [a.userId, link.id]);
    await q.query("update age_status set guardian_consent = 'granted', consent_by = $1, consent_at = now() where user_id = $2", [a.userId, link.child_user_id]);
    await q.query("insert into user_roles (user_id, role, granted_by) values ($1, 'guardian', $1) on conflict do nothing", [a.userId]);
    await q.query('insert into parental_settings (child_user_id, updated_by) values ($1, $2) on conflict do nothing', [link.child_user_id, a.userId]);
  });
  return c.json({ ok: true, childId: link.child_user_id });
});

guardianRoutes.get('/children', async (c) => {
  const s = c.get('services');
  const a = requireAccount(c);
  const rows = await s.db.query(
    `select l.child_user_id as id, p.display_name as name, a.declared_band, a.approved_band, a.guardian_consent,
            ps.approve_circles, ps.quick_replies_only, ps.daily_minutes,
            coalesce((select array_agg(circle_id) from circle_approvals ca where ca.child_user_id = l.child_user_id), '{}') as approved_circles
       from guardian_links l
       left join profiles p on p.user_id = l.child_user_id
       left join age_status a on a.user_id = l.child_user_id
       left join parental_settings ps on ps.child_user_id = l.child_user_id
      where l.guardian_user_id = $1 and l.status = 'active'`,
    [a.userId],
  );
  // Today's usage, measured by the server, so the guardian sees the same number the limit uses.
  const children = [];
  for (const r of rows as { id: string }[]) {
    const ca = await loadAccess(s.db, r.id);
    children.push({ ...r, usage: ca ? await usageStatus(s, ca) : null });
  }
  return c.json({ children });
});

guardianRoutes.put('/children/:id/settings', async (c) => {
  const s = c.get('services');
  const childId = Id.parse(c.req.param('id'));
  const a = await assertGuardianOf(c, childId);
  const b = await body(c, z.object({ approveCircles: z.boolean(), quickRepliesOnly: z.boolean(), dailyMinutes: z.number().int().min(0).max(600) }));
  await s.db.query(
    `insert into parental_settings (child_user_id, approve_circles, quick_replies_only, daily_minutes, updated_by) values ($1,$2,$3,$4,$5)
     on conflict (child_user_id) do update set approve_circles=$2, quick_replies_only=$3, daily_minutes=$4, updated_by=$5, updated_at=now()`,
    [childId, b.approveCircles, b.quickRepliesOnly, b.dailyMinutes, a.userId],
  );
  return c.json({ ok: true });
});

guardianRoutes.post('/children/:id/circles/:circleId', async (c) => {
  const s = c.get('services');
  const childId = Id.parse(c.req.param('id'));
  const a = await assertGuardianOf(c, childId);
  const circleId = c.req.param('circleId');
  const circle = CIRCLES.find((x) => x.id === circleId) ?? (await one<{ id: string }>(s.db, 'select id from circles where id = $1', [circleId]));
  if (!circle) throw new AppError('not_found', 'Circle not found.');
  await s.db.query('insert into circle_approvals (child_user_id, circle_id, approved_by) values ($1,$2,$3) on conflict do nothing', [childId, circleId, a.userId]);
  return c.json({ ok: true });
});

guardianRoutes.post('/children/:id/age', async (c) => {
  const s = c.get('services');
  const childId = Id.parse(c.req.param('id'));
  const a = await assertGuardianOf(c, childId);
  const { band } = await body(c, z.object({ band: z.enum(['child', 'teen', 'adult']) }));
  await s.db.query('update age_status set approved_band = $1, approved_by = $2, approved_at = now() where user_id = $3', [band, a.userId, childId]);
  return c.json({ ok: true });
});

guardianRoutes.post('/children/:id/revoke', async (c) => {
  const s = c.get('services');
  const childId = Id.parse(c.req.param('id'));
  await assertGuardianOf(c, childId);
  await s.db.tx(async (q) => {
    await q.query("update age_status set guardian_consent = 'revoked' where user_id = $1", [childId]);
    await q.query("update guardian_links set status = 'revoked' where child_user_id = $1", [childId]);
    // Consent withdrawn → leave all circles immediately.
    await q.query('update circle_members set left_at = now() where user_id = $1 and left_at is null', [childId]);
  });
  return c.json({ ok: true });
});

/** A guardian can give extra time for today — recorded with who granted it. */
guardianRoutes.post('/children/:id/extend', async (c) => {
  const s = c.get('services');
  const childId = Id.parse(c.req.param('id'));
  const a = await assertGuardianOf(c, childId);
  const { minutes } = await body(c, ExtendBody);
  const child = await loadAccess(s.db, childId);
  if (!child) throw new AppError('not_found', 'Not found.');
  const today = (await usageStatus(s, child)).date;
  await s.db.query(
    `insert into daily_usage (user_id, usage_date, extra_minutes, extra_granted_by) values ($1,$2,$3,$4)
     on conflict (user_id, usage_date) do update set extra_minutes = least(daily_usage.extra_minutes + $3, 240), extra_granted_by = $4`,
    [childId, today, minutes, a.userId],
  );
  return c.json(await usageStatus(s, child));
});
