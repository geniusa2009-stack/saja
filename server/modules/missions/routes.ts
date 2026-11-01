/**
 * Persistent learning. The server is authoritative for unlocks, completions and
 * rewards; the learner model is recomputed with the same adaptive engine the
 * client uses (src/domain/adaptive.ts), within the person's memory settings.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../../context.ts';
import type { Queryable } from '../../db/index.ts';
import { one } from '../../db/index.ts';
import { AppError } from '../../lib/errors.ts';
import { body, Id, query } from '../../lib/http.ts';
import { requireAccess, requireRole } from '../../auth/middleware.ts';
import type { Access } from '../../auth/access.ts';
import { applySignal, createLearnerModel, recommend, strengths, topicsToRevisit, type LearnerModel, type LearningSignal } from '../../../src/domain/adaptive.ts';
import { newlyUnlocked, unlockedLocations } from '../../../src/domain/world.ts';
import { LOCATIONS } from '../../../src/content/world.ts';
import { MISSIONS, MISSION_BY_ID } from '../../../src/content/missions.ts';
import { validateMissionDefinition, type MissionDefinition } from './definitions.ts';
import { listTexts, applyTexts } from './texts.ts';
import { nextSteps, reviewsFor, transition, type ReviewStatus } from '../content/review.ts';
import { ReviewIn } from '../knowledge/routes.ts';
import type { Modality, TopicId } from '../../../src/domain/types.ts';
import { track } from '../analytics.ts';
import { notify } from '../notifications/service.ts';

const MODALITY = z.enum(['hands-on', 'visual', 'story', 'guided']);

export async function completedIds(q: Queryable, userId: string): Promise<string[]> {
  return (await q.query<{ mission_id: string }>("select distinct mission_id from mission_attempts where user_id = $1 and status = 'completed'", [userId])).map((r) => r.mission_id);
}

export async function loadModel(q: Queryable, a: Access): Promise<LearnerModel> {
  const row = await one<{ model: Partial<LearnerModel> }>(q, 'select model from learner_models where user_id = $1', [a.userId]);
  const p = await one<{ modality: Modality }>(q, 'select modality from profiles where user_id = $1', [a.userId]);
  const base = createLearnerModel(p?.modality ?? 'hands-on');
  return { ...base, ...(row?.model ?? {}), modalities: { ...base.modalities, ...(row?.model?.modalities ?? {}) } } as LearnerModel;
}

/** Persists only what the person allows SAJA to remember. */
async function saveModel(q: Queryable, a: Access, m: LearnerModel) {
  const fresh = createLearnerModel(m.preferred, m.difficulty);
  const stored: Partial<LearnerModel> = { preferred: m.preferred, difficulty: m.difficulty };
  if (a.memory.style) Object.assign(stored, { modalities: m.modalities, pace: m.pace });
  else Object.assign(stored, { modalities: fresh.modalities });
  if (a.memory.topics) Object.assign(stored, { topics: m.topics, concepts: m.concepts });
  await q.query('insert into learner_models (user_id, model) values ($1, $2) on conflict (user_id) do update set model = $2, updated_at = now()', [a.userId, JSON.stringify(stored)]);
}

/** The adaptive engine's next missions for this person — the same logic the client uses offline. */
export async function recommendationsFor(q: Queryable, a: Access) {
  const completed = await completedIds(q, a.userId);
  const model = await loadModel(q, a);
  const unlocked = unlockedLocations(LOCATIONS, { completed }, MISSIONS);
  const p = await one<{ interests: TopicId[] }>(q, 'select interests from profiles where user_id = $1', [a.userId]);
  return recommend({ model, missions: MISSIONS, completed, unlocked, ageBand: a.ageBand, interests: p?.interests ?? [] });
}

async function progressView(q: Queryable, a: Access) {
  const completed = await completedIds(q, a.userId);
  const model = await loadModel(q, a);
  const unlocked = unlockedLocations(LOCATIONS, { completed }, MISSIONS);
  const p = await one<{ interests: TopicId[] }>(q, 'select interests from profiles where user_id = $1', [a.userId]);
  const recs = recommend({ model, missions: MISSIONS, completed, unlocked, ageBand: a.ageBand, interests: p?.interests ?? [] });
  const results = await q.query(
    `select distinct on (mission_id) mission_id, completed_at, mistakes, hints, modality, helper_modality, duration_ms
       from mission_attempts where user_id = $1 and status = 'completed' order by mission_id, completed_at desc`,
    [a.userId],
  );
  const achievements = await q.query('select achievement_id as id, kind, mission_id, location_id, earned_at from achievements where user_id = $1 order by earned_at', [a.userId]);
  const world = await one(q, 'select location, visited from world_state where user_id = $1', [a.userId]);
  return {
    completed,
    results,
    achievements,
    world: world ?? { location: 'village', visited: ['village'] },
    unlocked: [...unlocked],
    model,
    insights: { strengths: strengths(model), revisit: topicsToRevisit(model) },
    next: recs.slice(0, 3).map((r) => ({ missionId: r.mission.id, reason: r.reason })),
  };
}

export const missionRoutes = new Hono<AppEnv>();

/** The version a learner is served: PUBLISHED, else the seeded DEMO baseline. Drafts are never served. */
const SERVED_MISSION_SQL = 'coalesce(m.published_version, m.demo_version)';
const isContentStaff = (a: Access | null | undefined) => !!a && a.roles.some((r) => r === 'admin' || r === 'moderator' || r === 'scholar');

/**
 * Which version may this learner play? A pinned version is honoured only if it was
 * once served (the demo baseline or a published version); otherwise null.
 */
async function servedVersion(q: Queryable, id: string, pinned?: number | null): Promise<number | null> {
  const m = await one<{ served: number | null; demo_version: number | null; review_status: string }>(q, `select ${SERVED_MISSION_SQL} as served, m.demo_version, m.review_status from missions m where m.id = $1`, [id]);
  if (!m || m.served == null || m.review_status === 'archived') return null;
  if (pinned == null || pinned === m.served || pinned === m.demo_version) return pinned ?? m.served;
  const once = await one(q, "select 1 from content_reviews where mission_id = $1 and version = $2 and to_status = 'published'", [id, pinned]);
  return once ? pinned : null;
}

async function missionStatus(q: Queryable, id: string, version: number, m: { demo_version: number | null }) {
  const published = await one(q, "select 1 from content_reviews where mission_id = $1 and version = $2 and to_status = 'published'", [id, version]);
  return published ? 'published' : version === m.demo_version ? 'demo' : 'in-review';
}

missionRoutes.get('/', async (c) => {
  const rows = await c.get('services').db.query<{ definition: MissionDefinition; version: number; is_demo: boolean; published: boolean }>(
    `select v.definition, v.version, m.is_demo, (v.version = m.published_version) as published
       from missions m join mission_versions v on v.mission_id = m.id and v.version = ${SERVED_MISSION_SQL}
      where m.review_status <> 'archived' order by m.number`,
  );
  return c.json({ missions: rows.map((r) => ({ ...r.definition, version: r.version, isDemo: !r.published, status: r.published ? 'published' : 'demo' })) });
});

/* ── Staff: review queue, history, text edits, review steps ─────────── */

missionRoutes.get('/review/queue', async (c) => {
  requireRole(c, 'admin', 'moderator', 'scholar');
  const rows = await c.get('services').db.query(
    `select m.id, m.number, m.review_status, m.version as current_version, m.published_version, m.demo_version, m.is_demo, m.updated_at,
            ${SERVED_MISSION_SQL} as served_version, v.definition->'title' as title, m.interaction_type
       from missions m join mission_versions v on v.mission_id = m.id and v.version = m.version order by m.number`,
  );
  return c.json({ missions: rows });
});

missionRoutes.get('/:id/history', async (c) => {
  requireRole(c, 'admin', 'moderator', 'scholar');
  const db = c.get('services').db;
  const m = await one<{ review_status: ReviewStatus }>(db, 'select review_status from missions where id = $1', [c.req.param('id')]);
  if (!m) throw new AppError('not_found', 'Mission not found.');
  const versions = await db.query('select version, change_note, provenance, created_at from mission_versions where mission_id = $1 order by version desc', [c.req.param('id')]);
  return c.json({ status: m.review_status, next: nextSteps(m.review_status), versions, reviews: await reviewsFor(db, { type: 'mission', id: c.req.param('id') }) });
});

/** Staff: every EN/AR text of a version, for editing. */
missionRoutes.get('/:id/texts', async (c) => {
  requireRole(c, 'admin', 'moderator', 'scholar');
  const { version } = query(c, z.object({ version: z.coerce.number().int().min(1).max(100_000).optional() }));
  const r = await one<{ definition: MissionDefinition; version: number }>(
    c.get('services').db,
    'select v.definition, v.version from missions m join mission_versions v on v.mission_id = m.id and v.version = coalesce($2::int, m.version) where m.id = $1',
    [c.req.param('id'), version ?? null],
  );
  if (!r) throw new AppError('not_found', 'Mission not found.');
  return c.json({ version: r.version, texts: listTexts(r.definition) });
});

const TextEdit = z.object({ path: z.string().min(1).max(120), en: z.string().max(2000), ar: z.string().max(2000) });

/**
 * Staff: save text edits as a DRAFT. A version nobody reviewed yet is edited in place;
 * otherwise a new version is created. Learners keep the served version until publishing.
 */
missionRoutes.post('/:id/draft', async (c) => {
  const s = c.get('services');
  const a = requireRole(c, 'admin', 'scholar');
  const id = c.req.param('id');
  const b = await body(c, z.object({ texts: z.array(TextEdit).min(1).max(300), changeNote: z.string().trim().min(3).max(500) }));
  const out = await s.db.tx(async (q) => {
    const m = await one<{ version: number; published_version: number | null; demo_version: number | null; review_status: ReviewStatus }>(
      q,
      'select version, published_version, demo_version, review_status from missions where id = $1 for update',
      [id],
    );
    if (!m) throw new AppError('not_found', 'Mission not found.');
    const cur = await one<{ definition: MissionDefinition }>(q, 'select definition from mission_versions where mission_id = $1 and version = $2', [id, m.version]);
    const { definition, changed } = applyTexts(cur!.definition, b.texts);
    if (!changed) throw new AppError('bad_request', 'Nothing changed.');
    if (!validateMissionDefinition(definition)) throw new AppError('bad_request', 'The edited mission is not valid.');
    const reviewed = await one(q, "select 1 from content_reviews where mission_id = $1 and version = $2 and to_status <> 'draft'", [id, m.version]);
    const inPlace = m.review_status === 'draft' && !reviewed && m.version !== m.published_version && m.version !== m.demo_version;
    const version = inPlace ? m.version : m.version + 1;
    const provenance = { origin: 'staff-edit', basedOnVersion: inPlace ? null : m.version, editorRole: a.roles.includes('admin') ? 'admin' : 'scholar', textsChanged: changed };
    const def = { ...definition, version };
    if (inPlace) {
      await q.query('update mission_versions set definition = $3, change_note = $4, created_by = $5, provenance = $6, created_at = now() where mission_id = $1 and version = $2', [
        id,
        version,
        JSON.stringify(def),
        b.changeNote,
        a.userId,
        JSON.stringify(provenance),
      ]);
    } else {
      await q.query('insert into mission_versions (mission_id, version, definition, provenance, change_note, created_by) values ($1,$2,$3,$4,$5,$6)', [
        id,
        version,
        JSON.stringify(def),
        JSON.stringify(provenance),
        b.changeNote,
        a.userId,
      ]);
    }
    await q.query("update missions set version = $2, definition = $3, review_status = 'draft', updated_at = now() where id = $1", [id, version, JSON.stringify(def)]);
    await q.query(
      "insert into content_reviews (mission_id, version, from_status, to_status, reviewer_id, reviewer_role, scope, note) values ($1,$2,'-','draft',$3,$4,$5,$6)",
      [id, version, a.userId, provenance.editorRole, inPlace ? 'draft edited' : 'new version', b.changeNote],
    );
    return { id, version, inPlace, changed };
  });
  return c.json(out, 201);
});

missionRoutes.post('/:id/review', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const b = await body(c, ReviewIn);
  return c.json(await s.db.tx((q) => transition(q, a, { type: 'mission', id: c.req.param('id') }, b.to, b.scope, b.note)));
});

/** A mission definition; `?version=` pins the version a player already started with. Staff may preview any version. */
missionRoutes.get('/:id', async (c) => {
  const db = c.get('services').db;
  const a = c.get('access');
  const q = query(c, z.object({ version: z.coerce.number().int().min(1).max(100_000).optional(), as: z.enum(['staff']).optional() }));
  const id = c.req.param('id');
  const m = await one<{ version: number; demo_version: number | null; review_status: string }>(db, 'select version, demo_version, review_status from missions where id = $1', [id]);
  if (!m) throw new AppError('not_found', 'Mission not found.');
  const staff = q.as === 'staff' && isContentStaff(a);
  const version = staff ? (q.version ?? m.version) : await servedVersion(db, id, q.version);
  if (version == null) throw new AppError('not_found', 'Mission not found.');
  const r = await one<{ definition: MissionDefinition; version: number; provenance: Record<string, unknown>; change_note: string | null }>(
    db,
    'select definition, version, provenance, change_note from mission_versions where mission_id = $1 and version = $2',
    [id, version],
  );
  if (!r) throw new AppError('not_found', 'Mission not found.');
  const status = await missionStatus(db, id, r.version, m);
  return c.json({ ...r.definition, version: r.version, isDemo: status !== 'published', status, reviewStatus: m.review_status, provenance: r.provenance, changeNote: r.change_note });
});

missionRoutes.post('/:id/attempts', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const mission = MISSION_BY_ID[c.req.param('id')];
  if (!mission) throw new AppError('not_found', 'Mission not found.');
  if (a.ageBand === 'child' && !mission.kidSafe) throw new AppError('forbidden', 'This mission is not available in Kids Mode.');
  const unlocked = unlockedLocations(LOCATIONS, { completed: await completedIds(s.db, a.userId) }, MISSIONS);
  if (!unlocked.has(mission.location)) throw new AppError('forbidden', 'This part of the world is still asleep.', { locked: true });
  const { modality, version } = await body(c, z.object({ modality: MODALITY, version: z.number().int().min(1).optional() }));
  // Record exactly which version was played; a version the learner could not have been served falls back to the served one.
  const v = (await servedVersion(s.db, mission.id, version ?? null)) ?? (await servedVersion(s.db, mission.id));
  const row = await one<{ id: string }>(s.db, 'insert into mission_attempts (user_id, mission_id, modality, mission_version) values ($1,$2,$3,$4) returning id', [a.userId, mission.id, modality, v]);
  await track(s.db, a.userId, 'mission_started', { mission: mission.id });
  return c.json({ attemptId: row!.id, version: v }, 201);
});

const Signal = z.object({
  kind: z.enum(['step', 'hint', 'adapt_offer', 'adapt_accept']),
  correct: z.boolean().optional(),
  ms: z.number().int().min(0).max(3_600_000).optional(),
  modality: MODALITY.optional(),
});

async function ownedAttempt(q: Queryable, attemptId: string, userId: string) {
  const at = await one<{ id: string; mission_id: string; status: string }>(q, 'select id, mission_id, status from mission_attempts where id = $1 and user_id = $2', [attemptId, userId]);
  if (!at) throw new AppError('not_found', 'Attempt not found.');
  return at;
}

export const attemptRoutes = new Hono<AppEnv>();

attemptRoutes.post('/:id/signals', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const attempt = await ownedAttempt(s.db, Id.parse(c.req.param('id')), a.userId);
  if (attempt.status !== 'started') throw new AppError('conflict', 'This attempt has ended.');
  const { signals } = await body(c, z.object({ signals: z.array(Signal).min(1).max(100) }));
  const m = MISSION_BY_ID[attempt.mission_id];
  await s.db.tx(async (q) => {
    let model = await loadModel(q, a);
    for (const sg of signals) {
      // Learning signals are memory: only stored when "topics" memory is on.
      if (a.memory.topics) {
        await q.query('insert into learning_signals (user_id, attempt_id, kind, topic, concept, correct, ms, modality) values ($1,$2,$3,$4,$5,$6,$7,$8)', [
          a.userId,
          attempt.id,
          sg.kind,
          m.topic,
          m.concept,
          sg.correct ?? null,
          sg.ms ?? null,
          sg.modality ?? null,
        ]);
      }
      if (sg.kind === 'step' && sg.correct !== undefined) model = applySignal(model, { type: 'step', topic: m.topic, concept: m.concept, correct: sg.correct, ms: sg.ms ?? 0 });
      if (sg.kind === 'hint') model = applySignal(model, { type: 'hint', topic: m.topic, concept: m.concept });
      if (sg.kind === 'adapt_offer') await track(q, a.userId, 'adaptive_switch_triggered', { mission: m.id });
      if (sg.kind === 'adapt_accept') await track(q, a.userId, 'adaptive_switch_accepted', { mission: m.id, to: sg.modality ?? 'unknown' });
    }
    await q.query('update mission_attempts set mistakes = mistakes + $1, hints = hints + $2 where id = $3', [
      signals.filter((x) => x.kind === 'step' && x.correct === false).length,
      signals.filter((x) => x.kind === 'hint').length,
      attempt.id,
    ]);
    await saveModel(q, a, model);
  });
  return c.json({ ok: true });
});

attemptRoutes.post('/:id/complete', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const attempt = await ownedAttempt(s.db, Id.parse(c.req.param('id')), a.userId);
  if (attempt.status !== 'started') throw new AppError('conflict', 'This attempt was already completed.');
  const b = await body(c, z.object({ modality: MODALITY, helperModality: MODALITY.nullable().default(null), durationMs: z.number().int().min(0).max(6 * 3_600_000), retries: z.number().int().min(0).max(50).default(0) }));
  const m = MISSION_BY_ID[attempt.mission_id];
  const before = await completedIds(s.db, a.userId);
  const result = await s.db.tx(async (q) => {
    const row = await one<{ mistakes: number; hints: number }>(
      q,
      "update mission_attempts set status = 'completed', completed_at = now(), modality = $1, helper_modality = $2, duration_ms = $3, retries = $4 where id = $5 returning mistakes, hints",
      [b.modality, b.helperModality, b.durationMs, b.retries, attempt.id],
    );
    const credit: Modality = b.helperModality ?? b.modality;
    const signal: LearningSignal = {
      type: 'complete',
      topic: m.topic,
      concept: m.concept,
      result: { missionId: m.id, completedAt: Date.now(), mistakes: b.helperModality ? Math.min(row!.mistakes, 1) : row!.mistakes, hintsUsed: row!.hints, durationMs: b.durationMs, mechanic: m.mechanic, modality: credit },
    };
    await saveModel(q, a, applySignal(await loadModel(q, a), signal));
    const earned = await one(q, 'insert into achievements (user_id, achievement_id, kind, mission_id) values ($1,$2,$3,$4) on conflict do nothing returning achievement_id', [a.userId, m.reward.id, m.reward.kind, m.id]);
    const after = [...new Set([...before, m.id])];
    const woke = newlyUnlocked(LOCATIONS, { completed: before }, { completed: after }, MISSIONS).map((x) => x.id);
    for (const w of woke) await q.query("insert into achievements (user_id, achievement_id, kind, location_id) values ($1,$2,'place',$3) on conflict do nothing", [a.userId, `place-${w}`, w]);
    return { earned: !!earned, woke, mistakes: row!.mistakes };
  });
  for (const w of result.woke) {
    await notify(s, a.userId, { category: 'unlock', title: { en: 'A new place woke up', ar: 'استيقظ مكان جديد' }, body: { en: 'Knowledge unlocks the world.', ar: 'المعرفة تفتح العالم.' }, url: '/', dedupeKey: `unlock-${w}` });
  }
  await track(s.db, a.userId, 'mission_completed', { mission: m.id, mistakes: result.mistakes, helper: b.helperModality ?? 'none' });
  return c.json({ ...result, reward: m.reward, progress: await progressView(s.db, a) });
});

attemptRoutes.post('/:id/abandon', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const attempt = await ownedAttempt(s.db, Id.parse(c.req.param('id')), a.userId);
  if (attempt.status === 'started') {
    await s.db.query("update mission_attempts set status = 'abandoned' where id = $1", [attempt.id]);
    await track(s.db, a.userId, 'mission_failed', { mission: attempt.mission_id, reason: 'left' });
  }
  return c.json({ ok: true });
});

export const progressRoutes = new Hono<AppEnv>();
progressRoutes.get('/', async (c) => c.json(await progressView(c.get('services').db, requireAccess(c))));

progressRoutes.put('/world', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const { location } = await body(c, z.object({ location: z.enum(['village', 'mosque', 'garden', 'library', 'house', 'market', 'desert', 'reflection', 'mountain']) }));
  await s.db.query(
    `insert into world_state (user_id, location, visited) values ($1, $2, array[$2])
     on conflict (user_id) do update set location = $2, visited = (select array(select distinct unnest(world_state.visited || array[$2]))), updated_at = now()`,
    [a.userId, location],
  );
  return c.json({ ok: true });
});

progressRoutes.put('/preferences', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const b = await body(c, z.object({ difficulty: z.enum(['gentle', 'balanced', 'challenge']).optional(), preferred: MODALITY.optional() }));
  const m = await loadModel(s.db, a);
  await saveModel(s.db, a, { ...m, ...b });
  return c.json({ ok: true });
});

progressRoutes.get('/reflections', async (c) => {
  const a = requireAccess(c);
  return c.json({ reflections: await c.get('services').db.query('select id, lines, created_at from reflections where user_id = $1 order by created_at desc', [a.userId]) });
});
progressRoutes.post('/reflections', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const { lines } = await body(c, z.object({ lines: z.array(z.string().trim().min(1).max(120)).min(1).max(3) }));
  const r = await one(s.db, 'insert into reflections (user_id, lines) values ($1, $2) returning id, lines, created_at', [a.userId, lines]);
  return c.json(r, 201);
});
progressRoutes.delete('/reflections/:id', async (c) => {
  const a = requireAccess(c);
  await c.get('services').db.query('delete from reflections where id = $1 and user_id = $2', [Id.parse(c.req.param('id')), a.userId]);
  return c.json({ ok: true });
});
