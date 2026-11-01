import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, Services } from '../../context.ts';
import type { Access } from '../../auth/access.ts';
import { one } from '../../db/index.ts';
import { AppError } from '../../lib/errors.ts';
import { body, query } from '../../lib/http.ts';
import { requireAccess, requireRole } from '../../auth/middleware.ts';
import { retrieve, invalidateKeywordCache } from './retrieval.ts';
import { getKnowledge, related, SERVED_VERSION_SQL } from './store.ts';
import { nextSteps, reviewsFor, transition, type ReviewStatus } from '../content/review.ts';
import { chunksFor } from '../../db/seed.ts';
import { toPgVector } from '../../ai/embeddings.ts';
import type { KnowledgeEntry } from '../../../src/domain/types.ts';
import { MISSIONS } from '../../../src/content/missions.ts';
import { LOCATIONS } from '../../../src/content/world.ts';
import { track } from '../analytics.ts';

export const knowledgeRoutes = new Hono<AppEnv>();

knowledgeRoutes.get('/', async (c) => {
  const s = c.get('services');
  const q = query(c, z.object({ q: z.string().max(300).optional(), topic: z.string().max(30).optional(), lang: z.enum(['en', 'ar']).optional() }));
  if (q.q && q.q.trim()) {
    const a = c.get('access');
    await s.limiter.take('search', a?.userId ?? 'anon');
    const hits = await retrieve(s, { query: q.q, language: q.lang, topics: q.topic ? [q.topic] : undefined, limit: 20 });
    return c.json({ results: hits.map((h) => ({ id: h.documentId, score: Number(h.score.toFixed(3)), reviewStatus: h.reviewStatus, isDemo: h.isDemo })) });
  }
  // The learner-facing library: published versions, plus demo documents (flagged). Drafts in review are not listed.
  const rows = await s.db.query<{ id: string; topics: string[]; confidence: string; review_status: string; is_demo: boolean; version: number; published_version: number | null; content: { question: unknown; simple: unknown } }>(
    `select d.id, d.topics, d.confidence, d.review_status, d.is_demo, d.published_version, v.version, v.content
       from knowledge_documents d join knowledge_document_versions v on v.document_id = d.id and v.version = ${SERVED_VERSION_SQL}
      where d.review_status <> 'archived' ${q.topic ? 'and $1 = any(d.topics)' : ''} order by d.id`,
    q.topic ? [q.topic] : [],
  );
  return c.json({
    results: rows.map((r) => ({
      id: r.id,
      version: r.version,
      topics: r.topics,
      confidence: r.confidence,
      status: r.is_demo ? 'demo' : 'published',
      reviewStatus: r.review_status,
      isDemo: r.is_demo,
      question: r.content.question,
      simple: r.content.simple,
    })),
  });
});

knowledgeRoutes.get('/review/queue', async (c) => {
  requireRole(c, 'admin', 'moderator', 'scholar');
  const rows = await c.get('services').db.query(
    `select d.id, d.review_status, d.current_version, d.published_version, d.demo_version, d.is_demo, d.updated_at, d.topics,
            ${SERVED_VERSION_SQL} as served_version, v.content->'question' as question
       from knowledge_documents d join knowledge_document_versions v on v.document_id = d.id and v.version = d.current_version
      order by d.updated_at desc, d.id`,
  );
  return c.json({ documents: rows });
});

const isContentStaff = (a: { roles: string[] } | null | undefined) => !!a && a.roles.some((r) => r === 'admin' || r === 'moderator' || r === 'scholar');
const VersionQ = z.object({ version: z.coerce.number().int().min(1).max(100_000).optional(), as: z.enum(['staff']).optional() });

/** One document with provenance. `?version=` pins the version given earlier in a session. */
knowledgeRoutes.get('/:id', async (c) => {
  const s = c.get('services');
  const a = c.get('access');
  const q = query(c, VersionQ);
  const viewer = q.as === 'staff' && isContentStaff(a) ? 'staff' : 'learner';
  const view = await getKnowledge(s.db, c.req.param('id'), { version: q.version, viewer });
  if (!view) throw new AppError('not_found', 'Not found.');
  if (a && viewer === 'learner') await track(s.db, a.userId, 'evidence_opened', { document: view.id });
  return c.json({ ...view, related: await related(s.db, view.id) });
});

knowledgeRoutes.get('/:id/versions', async (c) => {
  const a = c.get('access');
  const staff = isContentStaff(a);
  // Learners see the history of what was published; staff see every draft too.
  const rows = await c
    .get('services')
    .db.query(
      `select v.version, v.change_note, v.created_at, v.provenance,
              exists(select 1 from content_reviews r where r.document_id = v.document_id and r.version = v.version and r.to_status = 'published') as published
         from knowledge_document_versions v join knowledge_documents d on d.id = v.document_id
        where v.document_id = $1 and ($2::boolean or v.version = d.demo_version or exists(select 1 from content_reviews r where r.document_id = v.document_id and r.version = v.version and r.to_status = 'published'))
        order by v.version desc`,
      [c.req.param('id'), staff],
    );
  return c.json({ versions: rows });
});

knowledgeRoutes.get('/:id/versions/:v', async (c) => {
  const a = c.get('access');
  const v = z.coerce.number().int().min(1).parse(c.req.param('v'));
  const view = await getKnowledge(c.get('services').db, c.req.param('id'), { version: v, viewer: isContentStaff(a) ? 'staff' : 'learner' });
  if (!view) throw new AppError('not_found', 'Not found.');
  return c.json(view);
});

const L = z.object({ en: z.string().min(1).max(4000), ar: z.string().min(1).max(4000) });
export const ReviewIn = z.object({ to: z.enum(['draft', 'internal_review', 'scholar_review', 'approved', 'published', 'archived']), scope: z.string().min(3).max(200), note: z.string().max(1000).optional() });
const EvidenceIn = z.object({
  kind: z.enum(['quran', 'hadith', 'scholarly']),
  ref: z.string().min(2).max(120),
  text: L,
  rendering: z.enum(['translation', 'meaning']),
  translationName: z.string().max(80).optional(),
  arabic: z.string().max(4000).optional(),
});

const DraftIn = z.object({
  content: z.object({ question: L, simple: L, deep: L, example: L, why: L, context: L, uncertainty: L.optional(), keywords: z.array(z.string().max(40)).max(30) }),
  evidence: z.array(EvidenceIn).min(1).max(12),
  confidence: z.enum(['consensus', 'majority', 'difference', 'review']),
  changeNote: z.string().min(3).max(500),
});
type DraftIn = z.infer<typeof DraftIn>;

/**
 * Saves staff edits as a DRAFT. A version nobody has reviewed yet is edited in place;
 * once a version has entered review, been served (demo) or published, it is frozen and
 * the edit becomes a new version. Either way the document goes back to DRAFT and what
 * learners receive does not change until a new version is approved and published.
 */
async function saveDraft(s: Services, a: Access, id: string, b: DraftIn, opts: { create?: { topics: string[] } } = {}) {
  const editorRole = a.roles.includes('admin') ? 'admin' : 'scholar';
  const entry = { id, topics: opts.create?.topics ?? [], ...b.content, confidence: b.confidence, evidence: b.evidence, reviewStatus: 'demo-unreviewed' } as unknown as KnowledgeEntry;
  const chunks = chunksFor(entry);
  const vectors = await s.embeddings.embed(chunks.map((x) => x.content), 'document');
  const sources = b.evidence.map((ev) => ({ ref: ev.ref, kind: ev.kind, rendering: ev.rendering, translationName: ev.translationName ?? null }));
  return s.db.tx(async (q) => {
    let version: number;
    let inPlace = false;
    let basedOn: number | null = null;
    if (opts.create) {
      if (await one(q, 'select 1 from knowledge_documents where id = $1', [id])) throw new AppError('conflict', 'A document with this id already exists.');
      await q.query("insert into knowledge_documents (id, topics, confidence, review_status, is_demo, current_version) values ($1,$2,$3,'draft',false,1)", [id, opts.create.topics, b.confidence]);
      version = 1;
    } else {
      const doc = await one<{ current_version: number; published_version: number | null; demo_version: number | null; review_status: ReviewStatus }>(
        q,
        'select current_version, published_version, demo_version, review_status from knowledge_documents where id = $1 for update',
        [id],
      );
      if (!doc) throw new AppError('not_found', 'Not found.');
      const reviewed = await one(q, "select 1 from content_reviews where document_id = $1 and version = $2 and to_status <> 'draft'", [id, doc.current_version]);
      inPlace = doc.review_status === 'draft' && !reviewed && doc.current_version !== doc.published_version && doc.current_version !== doc.demo_version;
      version = inPlace ? doc.current_version : doc.current_version + 1;
      basedOn = inPlace ? null : doc.current_version;
      if (inPlace) {
        await q.query('delete from knowledge_chunks where document_id = $1 and version = $2', [id, version]);
        await q.query('delete from knowledge_document_versions where document_id = $1 and version = $2', [id, version]);
      }
    }
    const provenance = { origin: opts.create ? 'staff-created' : 'staff-edit', basedOnVersion: basedOn, editorRole, sources };
    await q.query('insert into knowledge_document_versions (document_id, version, content, evidence, change_note, created_by, provenance) values ($1,$2,$3,$4,$5,$6,$7)', [
      id,
      version,
      JSON.stringify({ ...b.content, confidence: b.confidence }),
      JSON.stringify(b.evidence),
      b.changeNote,
      a.userId,
      JSON.stringify(provenance),
    ]);
    for (let i = 0; i < chunks.length; i++) {
      const ch = chunks[i];
      await q.query(
        `insert into knowledge_chunks (document_id, version, source_id, language, section, reference, content, keywords, embedding, embedding_model, review_status)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft')`,
        [id, version, ch.sourceId, ch.language, ch.section, ch.reference, ch.content, b.content.keywords, toPgVector(vectors[i]), s.embeddings.id],
      );
    }
    await q.query("update knowledge_documents set current_version = $1, confidence = $2, review_status = 'draft', updated_at = now() where id = $3", [version, b.confidence, id]);
    await q.query(
      "insert into content_reviews (document_id, version, from_status, to_status, reviewer_id, reviewer_role, scope, note) values ($1,$2,'-','draft',$3,$4,$5,$6)",
      [id, version, a.userId, editorRole, opts.create ? 'created' : inPlace ? 'draft edited' : 'new version', b.changeNote],
    );
    return { id, version, inPlace };
  });
}

/** Create a new document. It starts as a DRAFT that no learner can see. */
knowledgeRoutes.post('/', async (c) => {
  const s = c.get('services');
  const a = requireRole(c, 'admin', 'scholar');
  const b = await body(c, DraftIn.extend({ id: z.string().regex(/^k-[a-z0-9-]{2,40}$/), topics: z.array(z.string().regex(/^[a-z-]{2,20}$/)).min(1).max(4) }));
  const out = await saveDraft(s, a, b.id, b, { create: { topics: b.topics } });
  invalidateKeywordCache();
  return c.json(out, 201);
});

/** Edit: saves a draft (in place if it was never reviewed, otherwise as a new version). */
knowledgeRoutes.post('/:id/versions', async (c) => {
  const s = c.get('services');
  const a = requireRole(c, 'admin', 'scholar');
  const out = await saveDraft(s, a, c.req.param('id'), await body(c, DraftIn));
  invalidateKeywordCache();
  return c.json(out, 201);
});

/** Staff: the review trail for a document (all versions), and the steps allowed from here. */
knowledgeRoutes.get('/:id/reviews', async (c) => {
  requireRole(c, 'admin', 'moderator', 'scholar');
  const d = await one<{ review_status: ReviewStatus }>(c.get('services').db, 'select review_status from knowledge_documents where id = $1', [c.req.param('id')]);
  if (!d) throw new AppError('not_found', 'Not found.');
  return c.json({ status: d.review_status, next: nextSteps(d.review_status), reviews: await reviewsFor(c.get('services').db, { type: 'knowledge', id: c.req.param('id') }) });
});

knowledgeRoutes.post('/:id/review', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const b = await body(c, ReviewIn);
  const result = await s.db.tx((q) => transition(q, a, { type: 'knowledge', id: c.req.param('id') }, b.to, b.scope, b.note));
  invalidateKeywordCache();
  return c.json(result);
});

/* ── Daily Deen (curated, never generated) ──────────────────────────── */
export const dailyRoutes = new Hono<AppEnv>();
dailyRoutes.get('/', async (c) => {
  const s = c.get('services');
  const date = query(c, z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() })).date ?? s.now().toISOString().slice(0, 10);
  const rows = await s.db.query<{ id: string; kind: string; document_id: string; is_demo: boolean }>(
    `select id, kind, document_id, is_demo from daily_content
      where (active_from is null or active_from <= $1::date) and (active_to is null or active_to >= $1::date) order by id`,
    [date],
  );
  const day = Math.floor(Date.parse(date) / 86_400_000);
  const pick = (kind: string, offset = 0) => {
    const pool = rows.filter((r) => r.kind === kind);
    return pool.length ? pool[(day + offset) % pool.length] : undefined;
  };
  const items = [pick('reflection'), pick('dua'), pick('learning', 3)].filter(Boolean) as typeof rows;
  const out = [];
  for (const it of items) {
    const k = await getKnowledge(s.db, it.document_id);
    // Demo or not is decided by the document's review state, not by a flag on the daily item.
    if (k) out.push({ id: it.id, kind: it.kind, isDemo: k.status !== 'published', knowledge: k });
  }
  return c.json({ date, items: out });
});

/* ── Unified search ─────────────────────────────────────────────────── */
export const searchRoutes = new Hono<AppEnv>();
searchRoutes.get('/', async (c) => {
  const s = c.get('services');
  const a = c.get('access');
  await s.limiter.take('search', a?.userId ?? 'anon');
  const { q, lang } = query(c, z.object({ q: z.string().min(1).max(200), lang: z.enum(['en', 'ar']).optional() }));
  const needle = q.trim().toLowerCase();
  const match = (l: { en: string; ar: string }) => l.en.toLowerCase().includes(needle) || l.ar.includes(q.trim());
  const knowledge = await retrieve(s, { query: q, language: lang, limit: 5 });
  const circles = await s.db.query<{ id: string; name: { en: string; ar: string }; age_band: string }>('select id, name, age_band from circles');
  return c.json({
    missions: MISSIONS.filter((m) => match(m.title) || match(m.summary) || new RegExp(`\\b(mission|m)\\s*#?${m.number}\\b`, 'i').test(q)).map((m) => ({ id: m.id, number: m.number })),
    places: LOCATIONS.filter((l) => match(l.name) || match(l.purpose)).map((l) => l.id),
    stories: MISSIONS.filter((m) => m.reward.kind === 'story' && match(m.reward.name)).map((m) => m.id),
    circles: circles.filter((x) => match(x.name) && (!a || x.age_band === a.ageBand)).map((x) => x.id),
    knowledge: knowledge.map((k) => ({ id: k.documentId, score: Number(k.score.toFixed(3)) })),
  });
});
