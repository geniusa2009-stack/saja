/**
 * Learning Circles & group chat. Every write is policy-checked HERE, on the
 * server: age bands never mix, children need guardian consent (and per-circle
 * approval when required), messages pass the moderation engine, and blocked
 * people disappear for the blocker.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, Services } from '../../context.ts';
import type { Access } from '../../auth/access.ts';
import { hasRole } from '../../auth/access.ts';
import type { Queryable } from '../../db/index.ts';
import { one } from '../../db/index.ts';
import { AppError } from '../../lib/errors.ts';
import { body, Id, query } from '../../lib/http.ts';
import { circleChannel } from '../../lib/bus.ts';
import { requireAccess } from '../../auth/middleware.ts';
import { canJoinCircle, QUICK_REPLIES } from '../../../src/domain/safety.ts';
import { classify, logAction } from '../moderation.ts';
import { track } from '../analytics.ts';
import { notify } from '../notifications/service.ts';
import { questionEvent } from '../scholar.ts';

interface CircleRow {
  id: string;
  name: unknown;
  tagline: unknown;
  age_band: 'child' | 'teen' | 'adult';
  languages: string[];
  path: unknown;
  moderated: boolean;
  rules: unknown;
  weekly_goal: unknown;
  challenge: unknown;
  resources: unknown;
  is_demo: boolean;
}

const isStaff = (a: Access) => hasRole(a, 'moderator', 'admin');

async function circleOr404(q: Queryable, id: string) {
  const c = await one<CircleRow>(q, 'select * from circles where id = $1', [id]);
  if (!c) throw new AppError('not_found', 'Circle not found.');
  return c;
}

/** Can this person see the circle at all? Age bands never mix (staff excepted). */
function assertVisible(a: Access, c: CircleRow) {
  if (c.age_band !== a.ageBand && !isStaff(a)) throw new AppError('not_found', 'Circle not found.');
}

async function membership(q: Queryable, circleId: string, userId: string) {
  return one<{ role: 'member' | 'mentor' | 'moderator' }>(q, 'select role from circle_members where circle_id = $1 and user_id = $2 and left_at is null', [circleId, userId]);
}

export type JoinOutcome = { ok: true } | { ok: false; reason: 'age-band' | 'unmoderated' | 'needs-guardian' | 'needs-consent' | 'needs-account' };

export function joinPolicy(a: Access, c: CircleRow): JoinOutcome {
  if (a.ageBand === 'child' && !a.communityAllowed) return { ok: false, reason: 'needs-consent' };
  if (a.ageBand !== 'child' && a.isGuest) return { ok: false, reason: 'needs-account' };
  const d = canJoinCircle(a.policy, { id: c.id, ageBand: c.age_band, moderated: c.moderated }, a.parental);
  return d;
}

async function messageView(q: Queryable, viewer: Access, where: string, params: unknown[]) {
  const staff = isStaff(viewer);
  const rows = await q.query<Record<string, unknown>>(
    `select m.id, m.circle_id, m.author_id, m.body, m.reply_to, m.status, m.pinned, m.is_quick_reply, m.created_at, m.moderation,
            p.display_name, p.character, cm.role as author_role,
            (select body from chat_messages r where r.id = m.reply_to) as reply_body,
            coalesce((select json_object_agg(reaction, n) from (select reaction, count(*)::int as n from chat_reactions where message_id = m.id group by reaction) x), '{}'::json) as reactions,
            coalesce((select array_agg(reaction) from chat_reactions where message_id = m.id and user_id = $1), '{}') as mine
       from chat_messages m
       left join profiles p on p.user_id = m.author_id
       left join circle_members cm on cm.circle_id = m.circle_id and cm.user_id = m.author_id
      where ${where}
        and m.author_id not in (select blocked_id from user_blocks where blocker_id = $1)
        and m.id not in (select message_id from chat_reports where reporter_id = $1)
        and (m.status = 'visible' or (m.status = 'held' and m.author_id = $1) or $2::boolean)
      order by m.created_at`,
    [viewer.userId, staff, ...params],
  );
  return rows.map((r) => ({
    id: r.id,
    circleId: r.circle_id,
    author: { id: r.author_id, name: r.display_name ?? '—', look: r.character, role: r.author_role ?? 'member', isYou: r.author_id === viewer.userId },
    body: r.body,
    replyTo: r.reply_to,
    replyPreview: r.reply_body ? String(r.reply_body).slice(0, 120) : null,
    status: r.status,
    pinned: r.pinned,
    isQuickReply: r.is_quick_reply,
    createdAt: r.created_at,
    reactions: r.reactions,
    mine: r.mine,
    moderation: r.author_id === viewer.userId || staff ? r.moderation : undefined,
  }));
}

export const circleRoutes = new Hono<AppEnv>();

circleRoutes.get('/', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const rows = await s.db.query<CircleRow & { members: number; joined: boolean; approved: boolean }>(
    `select ci.*, (select count(*)::int from circle_members m where m.circle_id = ci.id and m.left_at is null) as members,
            exists(select 1 from circle_members m where m.circle_id = ci.id and m.user_id = $1 and m.left_at is null) as joined,
            exists(select 1 from circle_approvals ap where ap.circle_id = ci.id and ap.child_user_id = $1) as approved
       from circles ci where ci.age_band = $2 or $3::boolean order by ci.id`,
    [a.userId, a.ageBand, isStaff(a)],
  );
  return c.json({
    circles: rows.map((r) => ({ id: r.id, name: r.name, tagline: r.tagline, ageBand: r.age_band, languages: r.languages, path: r.path, moderated: r.moderated, weeklyGoal: r.weekly_goal, members: r.members, joined: r.joined, isDemo: r.is_demo, join: r.joined ? null : joinPolicy(a, r) })),
    communityAllowed: a.communityAllowed,
  });
});

circleRoutes.get('/:id', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const ci = await circleOr404(s.db, c.req.param('id'));
  assertVisible(a, ci);
  const members = await s.db.query<{ user_id: string; role: string; display_name: string; character: unknown; is_demo: boolean }>(
    `select m.user_id, m.role, p.display_name, p.character, u.is_demo from circle_members m join profiles p on p.user_id = m.user_id join users u on u.id = m.user_id
      where m.circle_id = $1 and m.left_at is null order by m.role desc, p.display_name`,
    [ci.id],
  );
  const mine = await membership(s.db, ci.id, a.userId);
  return c.json({
    id: ci.id,
    name: ci.name,
    tagline: ci.tagline,
    ageBand: ci.age_band,
    languages: ci.languages,
    path: ci.path,
    moderated: ci.moderated,
    rules: ci.rules,
    weeklyGoal: ci.weekly_goal,
    challenge: ci.challenge,
    resources: ci.resources,
    isDemo: ci.is_demo,
    // Only names, avatars and roles — never contact details or ages.
    members: members.map((m) => ({ id: m.user_id, name: m.display_name, look: m.character, role: m.role, isYou: m.user_id === a.userId, isSample: m.is_demo })),
    membership: mine?.role ?? null,
    join: mine ? null : joinPolicy(a, ci),
    policy: { freeText: a.policy.freeText, quickReplies: QUICK_REPLIES, directMessages: a.policy.directMessages },
  });
});

circleRoutes.post('/:id/join', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const ci = await circleOr404(s.db, c.req.param('id'));
  assertVisible(a, ci);
  const d = joinPolicy(a, ci);
  if (!d.ok) throw new AppError('forbidden', 'You can’t join this circle yet.', { reason: d.reason });
  await s.db.query(
    `insert into circle_members (circle_id, user_id) values ($1,$2)
     on conflict (circle_id, user_id) do update set left_at = null, joined_at = now()`,
    [ci.id, a.userId],
  );
  await track(s.db, a.userId, 'circle_joined', { circle: ci.id });
  return c.json({ ok: true });
});

circleRoutes.post('/:id/leave', async (c) => {
  const a = requireAccess(c);
  await c.get('services').db.query('update circle_members set left_at = now() where circle_id = $1 and user_id = $2', [c.req.param('id'), a.userId]);
  return c.json({ ok: true });
});

circleRoutes.get('/:id/messages', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const ci = await circleOr404(s.db, c.req.param('id'));
  assertVisible(a, ci);
  if (!(await membership(s.db, ci.id, a.userId)) && !isStaff(a)) throw new AppError('forbidden', 'Join this circle to read the conversation.');
  const { before } = query(c, z.object({ before: z.string().datetime().optional() }));
  const msgs = await messageView(s.db, a, `m.circle_id = $3 ${before ? 'and m.created_at < $4' : ''}`, before ? [ci.id, before] : [ci.id]);
  const last = await one<{ last_read_at: string }>(s.db, 'select last_read_at from chat_reads where circle_id = $1 and user_id = $2', [ci.id, a.userId]);
  return c.json({ messages: msgs.slice(-100), lastReadAt: last?.last_read_at ?? null });
});

circleRoutes.post('/:id/read', async (c) => {
  const a = requireAccess(c);
  await c
    .get('services')
    .db.query('insert into chat_reads (circle_id, user_id) values ($1,$2) on conflict (circle_id, user_id) do update set last_read_at = now()', [c.req.param('id'), a.userId]);
  return c.json({ ok: true });
});

const QUICK = new Set<string>(QUICK_REPLIES.flatMap((q) => [q.en, q.ar]));

circleRoutes.post('/:id/messages', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const ci = await circleOr404(s.db, c.req.param('id'));
  assertVisible(a, ci);
  const b = await body(c, z.object({ body: z.string().trim().min(1).max(500), replyTo: Id.optional(), quickReply: z.boolean().default(false), clientId: z.string().max(60).optional() }));
  await s.limiter.take('chat', a.userId);
  if (!(await membership(s.db, ci.id, a.userId))) throw new AppError('forbidden', 'Join this circle to take part.');
  if (a.ageBand === 'child' && !a.communityAllowed) throw new AppError('forbidden', 'A guardian needs to give consent first.', { reason: 'needs-consent' });
  if (b.quickReply && !QUICK.has(b.body)) throw new AppError('bad_request', 'Unknown quick reply.');
  if (!a.policy.freeText && !b.quickReply) throw new AppError('forbidden', 'In this circle you can send encouragement replies.', { reason: 'quick-replies-only' });
  // Only a message this person can see can be replied to (never one held for a moderator, hidden or removed).
  if (b.replyTo && !(await one(s.db, "select 1 from chat_messages where id = $1 and circle_id = $2 and (status = 'visible' or author_id = $3)", [b.replyTo, ci.id, a.userId]))) {
    throw new AppError('bad_request', 'Reply target not found.');
  }
  if (b.clientId) {
    const dup = await one<{ id: string }>(s.db, 'select id from chat_messages where author_id = $1 and client_id = $2', [a.userId, b.clientId]);
    if (dup) return c.json({ message: (await messageView(s.db, a, 'm.id = $3', [dup.id]))[0], duplicate: true });
  }
  const decision = b.quickReply ? { action: 'allow' as const, categories: [], flags: [] } : classify(b.body, a.policy);
  if (decision.action === 'block') {
    await logAction(s.db, { targetType: 'user', targetId: a.userId, action: 'hold', categories: decision.categories, reason: 'message blocked before sending' });
    throw new AppError('policy_blocked', 'This message wasn’t sent.', { flags: decision.flags, categories: decision.categories });
  }
  const status = decision.action === 'hold' ? 'held' : 'visible';
  const row = await one<{ id: string }>(
    s.db,
    'insert into chat_messages (circle_id, author_id, body, reply_to, status, moderation, is_quick_reply, client_id) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id',
    [ci.id, a.userId, b.body, b.replyTo ?? null, status, decision.categories.length ? JSON.stringify(decision) : null, b.quickReply, b.clientId ?? null],
  );
  if (status === 'held') await logAction(s.db, { targetType: 'message', targetId: row!.id, action: 'hold', categories: decision.categories, reason: 'automatic' });
  const [msg] = await messageView(s.db, a, 'm.id = $3', [row!.id]);
  if (status === 'visible') s.bus.publish(circleChannel(ci.id), { type: 'chat.message', circleId: ci.id, message: msg });
  await track(s.db, a.userId, 'message_sent', { held: status === 'held', quick: b.quickReply });
  return c.json({ message: msg }, 201);
});

export const messageRoutes = new Hono<AppEnv>();

async function visibleMessageFor(s: Services, a: Access, id: string) {
  const m = await one<{ id: string; circle_id: string; author_id: string; status: string }>(s.db, 'select id, circle_id, author_id, status from chat_messages where id = $1', [id]);
  if (!m) throw new AppError('not_found', 'Message not found.');
  if (!isStaff(a)) {
    if (!(await membership(s.db, m.circle_id, a.userId))) throw new AppError('not_found', 'Message not found.');
    if (m.status !== 'visible' && m.author_id !== a.userId) throw new AppError('not_found', 'Message not found.');
  }
  return m;
}

messageRoutes.post('/:id/reactions', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  await s.limiter.take('chat', a.userId);
  const m = await visibleMessageFor(s, a, Id.parse(c.req.param('id')));
  const { reaction } = await body(c, z.object({ reaction: z.enum(['heart', 'mashaallah', 'helpful', 'keepgoing', 'proud']) }));
  const removed = await s.db.query('delete from chat_reactions where message_id = $1 and user_id = $2 and reaction = $3 returning 1', [m.id, a.userId, reaction]);
  if (!removed.length) await s.db.query('insert into chat_reactions (message_id, user_id, reaction) values ($1,$2,$3)', [m.id, a.userId, reaction]);
  const [view] = await messageView(s.db, a, 'm.id = $3', [m.id]);
  s.bus.publish(circleChannel(m.circle_id), { type: 'chat.update', circleId: m.circle_id, message: { id: m.id, reactions: view.reactions } });
  return c.json({ message: view });
});

messageRoutes.post('/:id/report', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const m = await visibleMessageFor(s, a, Id.parse(c.req.param('id')));
  if (m.author_id === a.userId) throw new AppError('bad_request', 'You can’t report your own message.');
  const b = await body(c, z.object({ reason: z.enum(['unkind', 'unsafe', 'personal-info', 'wrong-info', 'other']), note: z.string().max(300).optional() }));
  const r = await one<{ id: string }>(s.db, 'insert into chat_reports (message_id, reporter_id, reason, note) values ($1,$2,$3,$4) on conflict do nothing returning id', [m.id, a.userId, b.reason, b.note ?? null]);
  if (r) await logAction(s.db, { targetType: 'message', targetId: m.id, action: 'report', categories: [b.reason], actorId: a.userId });
  // Escalation: a child feeling unsafe, or several reports, hides the message until a human reviews it.
  const [{ n }] = await s.db.query<{ n: number }>("select count(*)::int as n from chat_reports where message_id = $1 and status = 'open'", [m.id]);
  if ((b.reason === 'unsafe' && a.ageBand !== 'adult') || n >= 3) {
    await s.db.query("update chat_messages set status = 'hidden' where id = $1 and status = 'visible'", [m.id]);
    await logAction(s.db, { targetType: 'message', targetId: m.id, action: 'escalate', categories: [b.reason], reason: n >= 3 ? 'multiple reports' : 'young member felt unsafe' });
  }
  return c.json({ ok: true }, 201);
});

messageRoutes.post('/:id/pin', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const m = await visibleMessageFor(s, a, Id.parse(c.req.param('id')));
  const role = await membership(s.db, m.circle_id, a.userId);
  if (!isStaff(a) && role?.role !== 'mentor' && role?.role !== 'moderator') throw new AppError('forbidden', 'Only mentors can pin messages.');
  const { pinned } = await body(c, z.object({ pinned: z.boolean() }));
  await s.db.query('update chat_messages set pinned = $1 where id = $2', [pinned, m.id]);
  return c.json({ ok: true });
});

export const blockRoutes = new Hono<AppEnv>();
blockRoutes.get('/', async (c) => {
  const a = requireAccess(c);
  const rows = await c.get('services').db.query('select b.blocked_id as id, p.display_name as name from user_blocks b left join profiles p on p.user_id = b.blocked_id where b.blocker_id = $1', [a.userId]);
  return c.json({ blocked: rows });
});
blockRoutes.post('/:userId', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const target = Id.parse(c.req.param('userId'));
  if (target === a.userId) throw new AppError('bad_request', 'You can’t block yourself.');
  await s.db.query('insert into user_blocks (blocker_id, blocked_id) values ($1,$2) on conflict do nothing', [a.userId, target]);
  await s.db.query("update dm_threads set status = 'closed' where (user_a = $1 and user_b = $2) or (user_a = $2 and user_b = $1)", [a.userId, target]);
  return c.json({ ok: true });
});
blockRoutes.delete('/:userId', async (c) => {
  const a = requireAccess(c);
  await c.get('services').db.query('delete from user_blocks where blocker_id = $1 and blocked_id = $2', [a.userId, Id.parse(c.req.param('userId'))]);
  return c.json({ ok: true });
});

/* ── Moderation queue (human review & override) ─────────────────────── */
export const moderationRoutes = new Hono<AppEnv>();

function requireStaff(c: Parameters<typeof requireAccess>[0]) {
  const a = requireAccess(c);
  if (!isStaff(a)) throw new AppError('forbidden', 'Moderators only.');
  return a;
}

moderationRoutes.get('/queue', async (c) => {
  const s = c.get('services');
  requireStaff(c);
  const held = await s.db.query(
    `select m.id, m.circle_id, m.body, m.status, m.moderation, m.created_at, p.display_name as author
       from chat_messages m left join profiles p on p.user_id = m.author_id where m.status in ('held','hidden') order by m.created_at`,
  );
  const reports = await s.db.query(
    `select r.id, r.message_id, r.reason, r.note, r.created_at, m.body, m.status from chat_reports r join chat_messages m on m.id = r.message_id
      where r.status = 'open' order by r.created_at`,
  );
  const questions = await s.db.query("select id, question, topic, moderation, created_at from scholar_questions where status = 'held' order by created_at");
  // Private messages are only shown to moderators when held by the filter or reported.
  const dms = await s.db.query(
    `select m.id, m.body, m.status, m.moderation, m.created_at,
            (select json_agg(json_build_object('reason', r.reason, 'at', r.created_at)) from dm_reports r where r.message_id = m.id and r.status = 'open') as reports
       from dm_messages m
      where m.status in ('held','hidden') or exists (select 1 from dm_reports r where r.message_id = m.id and r.status = 'open')
      order by m.created_at`,
  );
  return c.json({ held, reports, questions, dms });
});

moderationRoutes.post('/messages/:id', async (c) => {
  const s = c.get('services');
  const a = requireStaff(c);
  const id = Id.parse(c.req.param('id'));
  const { action, reason } = await body(c, z.object({ action: z.enum(['allow', 'restore', 'hide', 'remove', 'warn', 'escalate']), reason: z.string().min(3).max(300) }));
  const m = await one<{ id: string; circle_id: string; author_id: string }>(s.db, 'select id, circle_id, author_id from chat_messages where id = $1', [id]);
  if (!m) throw new AppError('not_found', 'Message not found.');
  const status = action === 'allow' || action === 'restore' ? 'visible' : action === 'hide' ? 'hidden' : action === 'remove' ? 'removed' : null;
  await s.db.tx(async (q) => {
    if (status) await q.query('update chat_messages set status = $1 where id = $2', [status, id]);
    if (status) await q.query("update chat_reports set status = 'resolved', resolved_by = $1, resolved_at = now() where message_id = $2 and status = 'open'", [a.userId, id]);
    if (action === 'escalate') await q.query("update chat_reports set status = 'escalated' where message_id = $1 and status = 'open'", [id]);
    await logAction(q, { targetType: 'message', targetId: id, action, reason, actorId: a.userId });
  });
  if (status === 'visible') {
    const [msg] = await messageView(s.db, a, 'm.id = $3', [id]);
    s.bus.publish(circleChannel(m.circle_id), { type: 'chat.message', circleId: m.circle_id, message: { ...msg, author: { ...msg.author, isYou: false } } });
  }
  await notify(s, m.author_id, {
    category: 'moderation',
    title: { en: 'A moderator reviewed your message', ar: 'راجع مشرف رسالتك' },
    body: status === 'visible' ? { en: 'It is now visible to your circle.', ar: 'أصبحت ظاهرة لحلقتك.' } : { en: 'It will not be shown. Thank you for keeping the circle kind.', ar: 'لن تُعرض. شكرًا لحفاظك على لطف الحلقة.' },
  });
  return c.json({ ok: true, status });
});

moderationRoutes.get('/audit/:type/:id', async (c) => {
  requireStaff(c);
  const rows = await c
    .get('services')
    .db.query('select action, categories, reason, actor_kind, actor_id, created_at from moderation_actions where target_type = $1 and target_id = $2 order by created_at', [c.req.param('type'), c.req.param('id')]);
  return c.json({ actions: rows });
});

/** Held scholar questions (flagged by the classifier) are released to scholars or rejected — by a human. */
moderationRoutes.post('/questions/:id', async (c) => {
  const s = c.get('services');
  const a = requireStaff(c);
  const id = Id.parse(c.req.param('id'));
  const { action, reason } = await body(c, z.object({ action: z.enum(['release', 'reject']), reason: z.string().min(3).max(300) }));
  const q = await one<{ asker_id: string }>(s.db, "update scholar_questions set status = $1, updated_at = now() where id = $2 and status = 'held' returning asker_id", [action === 'release' ? 'queued' : 'rejected', id]);
  if (!q) throw new AppError('conflict', 'This question is not waiting for review.');
  await logAction(s.db, { targetType: 'question', targetId: id, action: action === 'release' ? 'allow' : 'remove', reason, actorId: a.userId });
  await questionEvent(s.db, id, action === 'release' ? 'released' : 'rejected', { userId: a.userId }, reason);
  await notify(s, q.asker_id, {
    category: 'scholar',
    title: action === 'release' ? { en: 'Your question is with the scholars', ar: 'سؤالك الآن عند العلماء' } : { en: 'Your question could not be sent', ar: 'تعذّر إرسال سؤالك' },
    body: action === 'release' ? { en: 'A moderator checked it and passed it on.', ar: 'راجعه مشرف وأحاله.' } : { en: 'Please rephrase it without personal details and try again.', ar: 'أعد صياغته دون تفاصيل شخصية وحاول مجددًا.' },
    url: '/scholar',
  });
  return c.json({ ok: true });
});

/** Human decision on a private message that was held or reported. */
moderationRoutes.post('/dm/:id', async (c) => {
  const s = c.get('services');
  const a = requireStaff(c);
  const id = Id.parse(c.req.param('id'));
  const { action, reason } = await body(c, z.object({ action: z.enum(['allow', 'hide', 'remove', 'escalate']), reason: z.string().min(3).max(300) }));
  const m = await one<{ author_id: string }>(s.db, 'select author_id from dm_messages where id = $1', [id]);
  if (!m) throw new AppError('not_found', 'Message not found.');
  const status = action === 'allow' ? 'visible' : action === 'hide' ? 'hidden' : action === 'remove' ? 'removed' : null;
  await s.db.tx(async (q) => {
    if (status) await q.query('update dm_messages set status = $1 where id = $2', [status, id]);
    await q.query(`update dm_reports set status = $1 where message_id = $2 and status = 'open'`, [action === 'escalate' ? 'escalated' : 'resolved', id]);
    await logAction(q, { targetType: 'dm', targetId: id, action, reason, actorId: a.userId });
  });
  await notify(s, m.author_id, {
    category: 'moderation',
    title: { en: 'A moderator reviewed your message', ar: 'راجع مشرف رسالتك' },
    body: status === 'visible' ? { en: 'It has been delivered.', ar: 'تم تسليمها.' } : { en: 'It will not be shown.', ar: 'لن تُعرض.' },
  });
  return c.json({ ok: true });
});
