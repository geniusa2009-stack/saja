/**
 * Private messages — ADULTS ONLY, with accounts, between people who share a
 * circle, request → accept. Children and teens can neither send nor receive
 * DMs, in any direction (canDirectMessage). Every send re-checks age, blocks
 * and thread state; every message passes the moderation classifier; either
 * person can report, block (which closes the thread) or close the conversation.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, Services } from '../../context.ts';
import type { Access } from '../../auth/access.ts';
import { one } from '../../db/index.ts';
import { AppError } from '../../lib/errors.ts';
import { body, Id } from '../../lib/http.ts';
import { userChannel } from '../../lib/bus.ts';
import { requireAccount } from '../../auth/middleware.ts';
import { loadAccess } from '../../auth/access.ts';
import { canDirectMessage } from '../../../src/domain/safety.ts';
import { classify, logAction } from '../moderation.ts';
import { notify } from '../notifications/service.ts';
import { track } from '../analytics.ts';

export const dmRoutes = new Hono<AppEnv>();
const pair = (x: string, y: string) => (x < y ? [x, y] : [y, x]);

const blockedBetween = (s: Services, x: string, y: string) =>
  one(s.db, 'select 1 from user_blocks where (blocker_id = $1 and blocked_id = $2) or (blocker_id = $2 and blocked_id = $1)', [x, y]);

/** Both sides must be adults with accounts, not demo personas, not blocked, and still share a circle. */
async function assertPolicy(s: Services, a: Access, otherId: string, requireSharedCircle: boolean) {
  const other = await loadAccess(s.db, otherId);
  if (!other) throw new AppError('not_found', 'Person not found.');
  // Age first: an adult trying to reach a child always gets the same, explicit refusal.
  if (!canDirectMessage(a.ageBand, other.ageBand)) throw new AppError('forbidden', 'Private messages are only available between adults.', { reason: 'age-policy' });
  if (other.isDemo || other.isGuest) throw new AppError('not_found', 'Person not found.');
  if (await blockedBetween(s, a.userId, otherId)) throw new AppError('forbidden', 'You can’t message this person.', { reason: 'blocked' });
  if (requireSharedCircle) {
    const shared = await one(
      s.db,
      'select 1 from circle_members m1 join circle_members m2 on m1.circle_id = m2.circle_id where m1.user_id = $1 and m2.user_id = $2 and m1.left_at is null and m2.left_at is null',
      [a.userId, otherId],
    );
    if (!shared) throw new AppError('forbidden', 'You can only message people from your circles.', { reason: 'no-shared-circle' });
  }
  return other;
}

/** Private messages need an adult account — checked before anything else so children get a clear, consistent refusal. */
function requireDmAccess(c: Parameters<typeof requireAccount>[0]) {
  const a = requireAccount(c);
  if (!a.policy.directMessages) throw new AppError('forbidden', 'Private messages are only available between adults.', { reason: 'age-policy' });
  return a;
}

dmRoutes.get('/', async (c) => {
  const a = requireDmAccess(c);
  const rows = await c.get('services').db.query(
    `select t.id, t.status, t.requested_by = $1 as requested_by_me, t.updated_at,
            case when t.user_a = $1 then t.user_b else t.user_a end as other_id, p.display_name as other_name, p.character as other_look,
            (select json_build_object('body', m.body, 'mine', m.author_id = $1, 'at', m.created_at) from dm_messages m
              where m.thread_id = t.id and (m.status = 'visible' or m.author_id = $1) order by m.created_at desc limit 1) as last
       from dm_threads t join profiles p on p.user_id = (case when t.user_a = $1 then t.user_b else t.user_a end)
      where (t.user_a = $1 or t.user_b = $1) and t.status in ('requested','active')
        and not exists (select 1 from user_blocks b where b.blocker_id = $1 and b.blocked_id = (case when t.user_a = $1 then t.user_b else t.user_a end))
      order by t.updated_at desc`,
    [a.userId],
  );
  return c.json({ threads: rows });
});

dmRoutes.post('/request', async (c) => {
  const s = c.get('services');
  const a = requireDmAccess(c);
  const { userId } = await body(c, z.object({ userId: Id }));
  if (userId === a.userId) throw new AppError('bad_request', 'You can’t message yourself.');
  await assertPolicy(s, a, userId, true);
  await s.limiter.take('chat', a.userId, 3);
  const [x, y] = pair(a.userId, userId);
  const existing = await one<{ id: string; status: string }>(s.db, 'select id, status from dm_threads where user_a = $1 and user_b = $2', [x, y]);
  if (existing && (existing.status === 'declined' || existing.status === 'closed')) throw new AppError('forbidden', 'This conversation is closed.', { reason: 'closed' });
  if (existing) return c.json({ threadId: existing.id, status: existing.status });
  const t = await one<{ id: string }>(s.db, 'insert into dm_threads (user_a, user_b, requested_by) values ($1,$2,$3) returning id', [x, y, a.userId]);
  await notify(s, userId, { category: 'circle', title: { en: 'A message request', ar: 'طلب مراسلة' }, body: { en: 'Someone from your circle would like to talk.', ar: 'شخص من حلقتك يرغب في الحديث.' }, url: '/messages', dedupeKey: `dm-${t!.id}` });
  s.bus.publish(userChannel(userId), { type: 'dm.thread', userId, threadId: t!.id, status: 'requested' });
  await track(s.db, a.userId, 'dm_requested', {});
  return c.json({ threadId: t!.id, status: 'requested' }, 201);
});

async function thread(c: Parameters<typeof requireAccount>[0], id: string) {
  const a = requireDmAccess(c);
  const t = await one<{ id: string; user_a: string; user_b: string; status: string; requested_by: string }>(c.get('services').db, 'select * from dm_threads where id = $1', [id]);
  if (!t || (t.user_a !== a.userId && t.user_b !== a.userId)) throw new AppError('not_found', 'Conversation not found.');
  return { a, t, other: t.user_a === a.userId ? t.user_b : t.user_a };
}

dmRoutes.post('/:id/respond', async (c) => {
  const s = c.get('services');
  const { a, t, other } = await thread(c, Id.parse(c.req.param('id')));
  if (t.requested_by === a.userId || t.status !== 'requested') throw new AppError('conflict', 'Nothing to respond to.');
  const { accept } = await body(c, z.object({ accept: z.boolean() }));
  if (accept) await assertPolicy(s, a, other, false);
  const status = accept ? 'active' : 'declined';
  await s.db.query('update dm_threads set status = $1, updated_at = now() where id = $2', [status, t.id]);
  if (accept) await notify(s, other, { category: 'circle', title: { en: 'Your message request was accepted', ar: 'قُبل طلب المراسلة' }, body: { en: 'You can talk now.', ar: 'يمكنكما الحديث الآن.' }, url: '/messages' });
  s.bus.publish(userChannel(other), { type: 'dm.thread', userId: other, threadId: t.id, status });
  return c.json({ status });
});

/** Either person can end the conversation; it can't be reopened by a new request. */
dmRoutes.post('/:id/close', async (c) => {
  const s = c.get('services');
  const { t, other } = await thread(c, Id.parse(c.req.param('id')));
  await s.db.query("update dm_threads set status = 'closed', updated_at = now() where id = $1", [t.id]);
  s.bus.publish(userChannel(other), { type: 'dm.thread', userId: other, threadId: t.id, status: 'closed' });
  return c.json({ status: 'closed' });
});

dmRoutes.get('/:id/messages', async (c) => {
  const { a, t, other } = await thread(c, Id.parse(c.req.param('id')));
  const s = c.get('services');
  const blocked = !!(await blockedBetween(s, a.userId, other));
  const rows = await s.db.query(
    `select m.id, m.author_id = $2 as mine, m.body, m.status, m.created_at from dm_messages m
      where m.thread_id = $1 and (m.status = 'visible' or m.author_id = $2)
        and not exists (select 1 from dm_reports r where r.message_id = m.id and r.reporter_id = $2)
      order by m.created_at limit 200`,
    [t.id, a.userId],
  );
  return c.json({ messages: rows, status: blocked ? 'closed' : t.status, requestedByMe: t.requested_by === a.userId });
});

dmRoutes.post('/:id/messages', async (c) => {
  const s = c.get('services');
  const { a, t, other } = await thread(c, Id.parse(c.req.param('id')));
  if (t.status !== 'active') throw new AppError('forbidden', 'This conversation isn’t open.', { reason: t.status });
  // Re-check every time: ages, accounts or blocks may have changed since the thread opened.
  await assertPolicy(s, a, other, false);
  await s.limiter.take('chat', a.userId);
  const { body: text } = await body(c, z.object({ body: z.string().trim().min(1).max(1000) }));
  const d = classify(text, a.policy);
  if (d.action === 'block') throw new AppError('policy_blocked', 'This message wasn’t sent.', { flags: d.flags, categories: d.categories });
  const status = d.action === 'allow' ? 'visible' : 'held';
  const row = await one<{ id: string; created_at: string }>(s.db, 'insert into dm_messages (thread_id, author_id, body, status, moderation) values ($1,$2,$3,$4,$5) returning id, created_at', [
    t.id,
    a.userId,
    text,
    status,
    d.categories.length ? JSON.stringify(d) : null,
  ]);
  await s.db.query('update dm_threads set updated_at = now() where id = $1', [t.id]);
  if (status === 'held') await logAction(s.db, { targetType: 'dm', targetId: row!.id, action: 'hold', categories: d.categories, reason: 'automatic' });
  else {
    s.bus.publish(userChannel(other), { type: 'dm.message', userId: other, threadId: t.id, message: { id: row!.id, mine: false, body: text, status, created_at: row!.created_at } });
    const hour = new Date().toISOString().slice(0, 13);
    await notify(s, other, { category: 'circle', title: { en: 'New private message', ar: 'رسالة خاصة جديدة' }, body: { en: 'Open Messages to read it.', ar: 'افتح الرسائل لقراءتها.' }, url: '/messages', dedupeKey: `dm-msg-${t.id}-${hour}` });
  }
  return c.json({ id: row!.id, status, created_at: row!.created_at }, 201);
});

/** Reporting hides the message for the reporter at once and sends it to moderators. */
dmRoutes.post('/:id/messages/:messageId/report', async (c) => {
  const s = c.get('services');
  const { a, t } = await thread(c, Id.parse(c.req.param('id')));
  const m = await one<{ id: string; author_id: string }>(s.db, "select id, author_id from dm_messages where id = $1 and thread_id = $2 and status = 'visible'", [Id.parse(c.req.param('messageId')), t.id]);
  if (!m) throw new AppError('not_found', 'Message not found.');
  if (m.author_id === a.userId) throw new AppError('bad_request', 'You can’t report your own message.');
  const { reason } = await body(c, z.object({ reason: z.enum(['unkind', 'unsafe', 'personal-info', 'wrong-info', 'other']) }));
  await s.db.query('insert into dm_reports (message_id, reporter_id, reason) values ($1,$2,$3) on conflict do nothing', [m.id, a.userId, reason]);
  await logAction(s.db, { targetType: 'dm', targetId: m.id, action: 'report', categories: [reason], actorId: a.userId });
  if (reason === 'unsafe') {
    await s.db.query("update dm_messages set status = 'hidden' where id = $1", [m.id]);
    await logAction(s.db, { targetType: 'dm', targetId: m.id, action: 'escalate', categories: [reason], reason: 'reported unsafe' });
  }
  return c.json({ ok: true }, 201);
});
