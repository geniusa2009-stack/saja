/**
 * ASK A SCHOLAR — a real human queue.
 *   composer → AI structuring (labelled as AI assistance) → private-data redaction
 *   → moderation → queue → verified scholar claims & answers → sources/notes → asker
 * AI never answers and never speaks as a scholar. "Verified" is shown only for
 * profiles an admin has verified, with who/when/scope recorded.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../context.ts';
import type { Queryable } from '../db/index.ts';
import { one } from '../db/index.ts';
import { AppError } from '../lib/errors.ts';
import { body, Id } from '../lib/http.ts';
import { userChannel } from '../lib/bus.ts';
import { requireAccess, requireRole } from '../auth/middleware.ts';
import { organizeQuestion } from '../../src/domain/questionOrganizer.ts';
import { classify, logAction } from './moderation.ts';
import { notify } from './notifications/service.ts';
import { track } from './analytics.ts';

const TOPIC = z.enum(['prayer', 'purification', 'quran', 'character', 'beliefs', 'terminology', 'fasting', 'history', 'other']);

async function scholarProfileOf(q: Queryable, userId: string) {
  return one<{ id: string; verification_status: string; is_demo: boolean; display_name: string; verification_scope: string | null; verified_at: string | null }>(
    q,
    'select id, verification_status, is_demo, display_name, verification_scope, verified_at from scholar_profiles where user_id = $1',
    [userId],
  );
}

async function requireVerifiedScholar(c: Parameters<typeof requireAccess>[0]) {
  const a = requireRole(c, 'scholar');
  const sp = await scholarProfileOf(c.get('services').db, a.userId);
  // Sample (demo) profiles can never act as scholars, whatever their stored status.
  if (!sp || sp.verification_status !== 'verified' || sp.is_demo) throw new AppError('forbidden', 'Only verified scholars can answer questions.');
  return { a, scholarId: sp.id, profile: sp };
}

/** The scholar workflow's audit trail. */
export async function questionEvent(q: Queryable, questionId: string, event: string, actor: { userId?: string | null; scholarId?: string | null } = {}, note?: string) {
  await q.query('insert into scholar_question_events (question_id, event, actor_user_id, actor_scholar_id, note) values ($1,$2,$3,$4,$5)', [
    questionId,
    event,
    actor.userId ?? null,
    actor.scholarId ?? null,
    note ?? null,
  ]);
}

const scholarJson = `json_build_object('id', sp.id, 'name', sp.display_name, 'title', sp.title, 'specialization', sp.specialization,
  'languages', sp.languages, 'verification', sp.verification_status, 'scope', sp.verification_scope, 'verifiedAt', sp.verified_at, 'isDemo', sp.is_demo)`;

async function questionsFor(q: Queryable, where: string, params: unknown[]) {
  return q.query(
    `select sq.id, sq.question, sq.context, sq.topic, sq.status, sq.redacted, sq.ai_assist, sq.created_at, sq.updated_at,
            case when sa.id is null then null else json_build_object('body', sa.body, 'sources', sa.sources, 'notes', sa.notes, 'createdAt', sa.created_at, 'isDemo', sa.is_demo, 'provenance', sa.provenance, 'scholar', ${scholarJson}) end as answer
       from scholar_questions sq
       left join scholar_answers sa on sa.question_id = sq.id
       left join scholar_profiles sp on sp.id = sa.scholar_id
      where ${where} order by sq.created_at desc`,
    params,
  );
}

export const scholarRoutes = new Hono<AppEnv>();

/** AI ASSISTANCE: structure only. Deterministic organiser, optionally refined by the model. */
scholarRoutes.post('/organize', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  await s.limiter.take('scholar', `org:${a.userId}`);
  const b = await body(c, z.object({ question: z.string().trim().min(8).max(1000), context: z.string().max(1000).optional() }));
  const o = organizeQuestion(b.question, b.context);
  let refined: { question: string; topic: string; missing_context: string[] } | null = null;
  // The deterministic organiser already did the job; the model only refines wording, within budget.
  if (s.ai.capabilities.has('structured_output') && (await s.aiBudget.tryConsume(a.userId, 'question-organize'))) {
    const r = await s.ai.structured<{ question: string; topic: string; missing_context: string[] }>({
      purpose: 'question-organize',
      system:
        'You help a person phrase a question for a qualified Islamic scholar. You do NOT answer it or state any ruling. Rewrite the question clearly and neutrally in its original language, remove names, phone numbers, emails, addresses and other identifying details, classify the topic, and list up to 3 short pieces of context the scholar might need.',
      user: `QUESTION: ${o.question}\nCONTEXT: ${b.context ?? '(none)'}`,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          question: { type: 'string' },
          topic: { type: 'string', enum: ['prayer', 'purification', 'quran', 'character', 'beliefs', 'terminology', 'fasting', 'history', 'other'] },
          missing_context: { type: 'array', items: { type: 'string' } },
        },
        required: ['question', 'topic', 'missing_context'],
      },
      maxTokens: 800,
      effort: 'low',
      // Personal questions: only providers allowed for sensitive tasks (SAJA_AI_SENSITIVE_PROVIDERS); a short task suits a fast provider.
      routing: { privacy: 'sensitive', latency: 'fast' },
    });
    if (r.ok && r.data.question.length >= 8) refined = r.data;
  }
  // Redaction is re-applied to the model's wording as well — defence in depth.
  const final = refined ? organizeQuestion(refined.question) : o;
  return c.json({
    kind: 'ai-assistance',
    by: refined ? 'ai' : 'rules',
    question: final.question,
    topic: refined?.topic ?? o.topic,
    removedPersonalInfo: o.removedPersonalInfo || final.removedPersonalInfo,
    clarifiers: refined ? refined.missing_context.slice(0, 3).map((x) => ({ en: x, ar: x })) : o.clarifiers,
    related: o.related,
  });
});

scholarRoutes.post('/questions', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  await s.limiter.take('scholar', a.userId);
  const b = await body(c, z.object({ question: z.string().trim().min(8).max(1000), context: z.string().max(1000).optional(), topic: TOPIC, aiAssisted: z.boolean().default(false) }));
  const clean = organizeQuestion(b.question, b.context);
  const cleanContext = b.context ? organizeQuestion(b.context).question.replace(/[?؟]$/, '') : null;
  const d = classify(`${b.question} ${b.context ?? ''}`, { ...a.policy, piiAction: 'hold' } as typeof a.policy);
  // Personal details were already redacted; anything else unsafe waits for a moderator.
  const risky = d.categories.filter((x) => x !== 'personal_info');
  const status = risky.length ? 'held' : 'queued';
  const row = await one<{ id: string }>(
    s.db,
    'insert into scholar_questions (asker_id, question, context, topic, redacted, ai_assist, status, moderation) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id',
    [a.userId, clean.question, cleanContext, b.topic, clean.removedPersonalInfo, b.aiAssisted ? JSON.stringify({ usedOrganizer: true }) : null, status, risky.length ? JSON.stringify(d) : null],
  );
  await questionEvent(s.db, row!.id, 'submitted', { userId: a.userId });
  if (status === 'held') {
    await logAction(s.db, { targetType: 'question', targetId: row!.id, action: 'hold', categories: risky });
    await questionEvent(s.db, row!.id, 'held', {}, `automatic: ${risky.join(', ')}`);
  }
  await track(s.db, a.userId, 'scholar_question_submitted', { topic: b.topic, held: status === 'held' });
  const [q] = await questionsFor(s.db, 'sq.id = $1', [row!.id]);
  return c.json({ question: q }, 201);
});

scholarRoutes.get('/questions', async (c) => {
  const a = requireAccess(c);
  return c.json({ questions: await questionsFor(c.get('services').db, 'sq.asker_id = $1 and sq.status <> $2', [a.userId, 'withdrawn']) });
});

/** Sample answers are demo data, clearly flagged, answered by UNVERIFIED sample profiles. */
scholarRoutes.get('/samples', async (c) => {
  return c.json({ questions: await questionsFor(c.get('services').db, 'sa.is_demo = true', []) });
});

scholarRoutes.delete('/questions/:id', async (c) => {
  const a = requireAccess(c);
  const r = await c.get('services').db.query("update scholar_questions set status = 'withdrawn', updated_at = now() where id = $1 and asker_id = $2 and status in ('held','queued','assigned') returning id", [Id.parse(c.req.param('id')), a.userId]);
  if (!r.length) throw new AppError('conflict', 'This question can no longer be withdrawn.');
  await questionEvent(c.get('services').db, Id.parse(c.req.param('id')), 'withdrawn', { userId: a.userId });
  return c.json({ ok: true });
});

/* ── Scholar inbox ─────────────────────────────────────────────────── */
scholarRoutes.get('/inbox', async (c) => {
  const s = c.get('services');
  const { scholarId } = await requireVerifiedScholar(c);
  // Scholars see the question and topic — never the asker's identity.
  const rows = await s.db.query(
    `select id, question, context, topic, status, source, created_at from scholar_questions
      where (status = 'queued') or (status = 'assigned' and assigned_scholar_id = $1) order by created_at`,
    [scholarId],
  );
  return c.json({ questions: rows });
});

scholarRoutes.post('/questions/:id/claim', async (c) => {
  const s = c.get('services');
  const { a, scholarId } = await requireVerifiedScholar(c);
  const id = Id.parse(c.req.param('id'));
  // A scholar never answers their own question.
  const r = await s.db.query(
    "update scholar_questions set status = 'assigned', assigned_scholar_id = $1, claimed_at = now(), updated_at = now() where id = $2 and status = 'queued' and asker_id <> $3 returning asker_id",
    [scholarId, id, a.userId],
  );
  if (!r.length) throw new AppError('conflict', 'This question is no longer available.');
  await questionEvent(s.db, id, 'claimed', { userId: a.userId, scholarId });
  return c.json({ ok: true });
});

/** Hand a claimed question back to the queue (e.g. outside the scholar's scope). */
scholarRoutes.post('/questions/:id/release', async (c) => {
  const s = c.get('services');
  const { a, scholarId } = await requireVerifiedScholar(c);
  const id = Id.parse(c.req.param('id'));
  const r = await s.db.query("update scholar_questions set status = 'queued', assigned_scholar_id = null, claimed_at = null, updated_at = now() where id = $1 and status = 'assigned' and assigned_scholar_id = $2 returning id", [id, scholarId]);
  if (!r.length) throw new AppError('conflict', 'This question isn’t assigned to you.');
  await questionEvent(s.db, id, 'unclaimed', { userId: a.userId, scholarId });
  return c.json({ ok: true });
});

scholarRoutes.post('/questions/:id/answer', async (c) => {
  const s = c.get('services');
  const { a, scholarId, profile } = await requireVerifiedScholar(c);
  const id = Id.parse(c.req.param('id'));
  const b = await body(c, z.object({ body: z.object({ en: z.string().max(6000).default(''), ar: z.string().max(6000).default('') }).refine((x) => x.en.trim() || x.ar.trim()), sources: z.array(z.string().min(2).max(160)).max(12), notes: z.string().max(2000).optional() }));
  const q = await one<{ asker_id: string; status: string; assigned_scholar_id: string | null }>(s.db, 'select asker_id, status, assigned_scholar_id from scholar_questions where id = $1', [id]);
  if (!q || q.status !== 'assigned' || q.assigned_scholar_id !== scholarId) throw new AppError('forbidden', 'Claim this question before answering it.');
  await s.db.tx(async (tq) => {
    // Provenance: who answered, with which verification, at the time — kept even if the profile changes later.
    const provenance = { scholarId, name: profile.display_name, verification: profile.verification_status, scope: profile.verification_scope, verifiedAt: profile.verified_at, answeredAt: new Date().toISOString(), aiAssisted: false };
    await tq.query('insert into scholar_answers (question_id, scholar_id, body, sources, notes, provenance) values ($1,$2,$3,$4,$5,$6)', [
      id,
      scholarId,
      JSON.stringify(b.body),
      JSON.stringify(b.sources),
      b.notes ?? null,
      JSON.stringify(provenance),
    ]);
    await tq.query("update scholar_questions set status = 'answered', updated_at = now() where id = $1", [id]);
    await questionEvent(tq, id, 'answered', { userId: a.userId, scholarId });
  });
  s.bus.publish(userChannel(q.asker_id), { type: 'scholar.update', userId: q.asker_id, questionId: id, status: 'answered' });
  await notify(s, q.asker_id, { category: 'scholar', title: { en: 'A scholar answered your question', ar: 'أجاب عالم عن سؤالك' }, body: { en: 'Open Ask a Scholar to read it.', ar: 'افتح «اسأل عالمًا» لقراءته.' }, url: '/scholar', dedupeKey: `answer-${id}` });
  return c.json({ ok: true }, 201);
});

export const scholarProfileRoutes = new Hono<AppEnv>();
scholarProfileRoutes.get('/:id', async (c) => {
  const r = await one(c.get('services').db, `select ${scholarJson} as profile from scholar_profiles sp where sp.id = $1`, [Id.parse(c.req.param('id'))]);
  if (!r) throw new AppError('not_found', 'Not found.');
  return c.json(r);
});

/* ── Admin: scholar verification ───────────────────────────────────── */
export const adminScholarRoutes = new Hono<AppEnv>();

adminScholarRoutes.get('/', async (c) => {
  requireRole(c, 'admin');
  return c.json({ scholars: await c.get('services').db.query(`select ${scholarJson} as profile, sp.credentials, sp.verified_by, u.email from scholar_profiles sp left join users u on u.id = sp.user_id order by sp.created_at`) });
});

adminScholarRoutes.post('/', async (c) => {
  const s = c.get('services');
  requireRole(c, 'admin');
  const L = z.object({ en: z.string().max(120), ar: z.string().max(120) });
  const b = await body(
    c,
    z.object({
      userId: Id.optional(),
      email: z.string().email().max(200).optional(),
      displayName: z.string().min(2).max(80),
      title: L,
      specialization: L,
      languages: z.array(z.string().max(30)).max(8),
      credentials: z.array(z.object({ type: z.string().max(60), issuer: z.string().max(120), year: z.number().int().min(1950).max(2100).optional(), reference: z.string().max(200).optional() })).max(10),
    }),
  );
  // The person must already have an account; admins identify them by id or email.
  const user = b.userId
    ? await one<{ id: string }>(s.db, 'select id from users where id = $1 and is_guest = false', [b.userId])
    : b.email
      ? await one<{ id: string }>(s.db, 'select id from users where lower(email) = lower($1) and is_guest = false', [b.email])
      : null;
  if (!user) throw new AppError('not_found', 'No account found. The scholar must sign up first.');
  if (await one(s.db, 'select 1 from scholar_profiles where user_id = $1', [user.id])) throw new AppError('conflict', 'This person already has a scholar profile.');
  const row = await one<{ id: string }>(
    s.db,
    `insert into scholar_profiles (user_id, display_name, title, specialization, languages, credentials, verification_status) values ($1,$2,$3,$4,$5,$6,'pending') returning id`,
    [user.id, b.displayName, JSON.stringify(b.title), JSON.stringify(b.specialization), b.languages, JSON.stringify(b.credentials)],
  );
  await s.db.query("insert into user_roles (user_id, role) values ($1, 'scholar') on conflict do nothing", [user.id]);
  return c.json({ id: row!.id, status: 'pending' }, 201);
});

adminScholarRoutes.post('/:id/verification', async (c) => {
  const s = c.get('services');
  const a = requireRole(c, 'admin');
  const b = await body(c, z.object({ status: z.enum(['pending', 'verified', 'suspended', 'unverified']), scope: z.string().min(3).max(200) }));
  const sp = await one<{ is_demo: boolean; user_id: string | null; credentials: unknown[] }>(s.db, 'select is_demo, user_id, credentials from scholar_profiles where id = $1', [Id.parse(c.req.param('id'))]);
  if (!sp) throw new AppError('not_found', 'Not found.');
  // SAMPLE is a permanent state: a demo persona can't be verified, suspended or turned into a real profile.
  if (sp.is_demo) throw new AppError('forbidden', 'Sample profiles can never be verified or changed.');
  if (b.status === 'verified') {
    // Verification records a decision about a real person: a linked account and the credentials the admin checked.
    if (!sp.user_id) throw new AppError('bad_request', 'Link this profile to an account before verifying it.');
    if (!Array.isArray(sp.credentials) || sp.credentials.length === 0) throw new AppError('bad_request', 'Record the credentials you checked before verifying.');
  }
  await s.db.query(
    `update scholar_profiles set verification_status = $1, verification_scope = $2,
       verified_by = case when $1 = 'verified' then $3::uuid else verified_by end,
       verified_at = case when $1 = 'verified' then now() else verified_at end where id = $4`,
    [b.status, b.scope, a.userId, Id.parse(c.req.param('id'))],
  );
  await logAction(s.db, { targetType: 'user', targetId: c.req.param('id'), action: b.status === 'suspended' ? 'hide' : 'allow', reason: `scholar verification: ${b.status} (${b.scope})`, actorId: a.userId });
  if (b.status !== 'verified') {
    // Questions this scholar claimed go back to the queue for someone verified.
    const back = await s.db.query<{ id: string }>("update scholar_questions set status = 'queued', assigned_scholar_id = null, claimed_at = null where assigned_scholar_id = $1 and status = 'assigned' returning id", [Id.parse(c.req.param('id'))]);
    for (const q of back) await questionEvent(s.db, q.id, 'unclaimed', { userId: a.userId }, `scholar ${b.status}`);
  }
  return c.json({ ok: true });
});

/** Staff view of a question's full trail (never shown to scholars, who stay blind to the asker). */
adminScholarRoutes.get('/questions/:id/events', async (c) => {
  requireRole(c, 'admin', 'moderator');
  const rows = await c
    .get('services')
    .db.query('select event, actor_scholar_id, actor_user_id is not null as by_person, note, created_at from scholar_question_events where question_id = $1 order by created_at', [Id.parse(c.req.param('id'))]);
  return c.json({ events: rows });
});
