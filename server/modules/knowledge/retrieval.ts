/**
 * Hybrid retrieval over knowledge chunks:
 *   vector similarity (pgvector) + curated keyword hits + meaningful-token overlap,
 *   degrading to keyword hits + token overlap when the embedding provider is unavailable,
 *   with language / topic / source-kind filters and a GROUNDING requirement —
 *   common words alone can never surface a religious answer.
 */
import { SERVED_VERSION_SQL } from './store.ts';
import type { Services } from '../../context.ts';
import type { Queryable } from '../../db/index.ts';
import { normalizeText, stem, tokens, toPgVector } from '../../ai/embeddings.ts';
import { log } from '../../lib/log.ts';

export interface RetrieveOptions {
  query: string;
  language?: 'en' | 'ar';
  topics?: string[];
  sourceKinds?: ('quran' | 'hadith' | 'scholarly' | 'reference')[];
  limit?: number;
}

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  version: number;
  section: string;
  language: 'en' | 'ar';
  content: string;
  reference: string | null;
  sourceId: string | null;
  vectorScore: number;
}

export interface RetrievedDocument {
  documentId: string;
  score: number;
  keywordHits: number;
  tokenOverlap: number;
  confidence: string;
  reviewStatus: string;
  isDemo: boolean;
  /** The version these chunks belong to (the one learners are served). */
  version: number;
  chunks: RetrievedChunk[];
}

const MIN_SCORE = 0.3;
let keywordCache: { at: number; map: Map<string, string[]> } | null = null;

async function documentKeywords(q: Queryable): Promise<Map<string, string[]>> {
  if (keywordCache && Date.now() - keywordCache.at < 60_000) return keywordCache.map;
  const rows = await q.query<{ document_id: string; keywords: string[] }>('select distinct on (document_id) document_id, keywords from knowledge_chunks order by document_id');
  keywordCache = { at: Date.now(), map: new Map(rows.map((r) => [r.document_id, r.keywords.map(normalizeText)])) };
  return keywordCache.map;
}
export const invalidateKeywordCache = () => (keywordCache = null);

/**
 * Curated keyword hits: a verbatim phrase of several words counts 2, a verbatim word
 * or a stem match counts 1 — and keywords that share a stem count once, so a document
 * with many forms of one word doesn't outrank one whose exact phrase was asked.
 */
function keywordScoreFor(keywords: string[], qNorm: string, qStems: Set<string>): number {
  const seen = new Set<string>();
  let hits = 0;
  for (const k of keywords) {
    const words = tokens(k);
    if (!words.length) continue;
    const key = words.map(stem).join(' ');
    if (seen.has(key)) continue;
    if (qNorm.includes(k)) hits += words.length > 1 ? 2 : 1;
    else if (words.every((w) => qStems.has(stem(w)))) hits += 1;
    else continue;
    seen.add(key);
  }
  return hits;
}

export async function retrieve(s: Pick<Services, 'db' | 'embeddings'>, opts: RetrieveOptions): Promise<RetrievedDocument[]> {
  const qTokens = tokens(opts.query);
  if (qTokens.length === 0) return [];
  const qStems = new Set(qTokens.map(stem));
  const qNorm = normalizeText(opts.query);
  // A remote embedder can be rate-limited or out of free quota. Then search runs on curated keywords and
  // shared words only — vectors from different models are never compared.
  let qVec: number[] | null = null;
  try {
    [qVec] = await s.embeddings.embed([opts.query], 'query');
  } catch (error) {
    log.warn('retrieval.keyword_only', { model: s.embeddings.id, reason: (error as { reason?: string })?.reason ?? 'error' });
  }
  let rows = qVec ? await candidates(s, opts, qVec) : [];
  // No chunk embedded by the current model (re-indexing failed or is pending) → keyword-only as well.
  if (!rows.length) rows = await candidates(s, opts, null);
  return rank(s, rows, opts, qNorm, qStems);
}

type Row = { id: string; document_id: string; version: number; section: string; language: 'en' | 'ar'; content: string; reference: string | null; source_id: string | null; vsim: number; confidence: string; review_status: string; is_demo: boolean };

async function candidates(s: Pick<Services, 'db' | 'embeddings'>, opts: RetrieveOptions, qVec: number[] | null): Promise<Row[]> {
  const params: unknown[] = qVec ? [toPgVector(qVec), s.embeddings.id] : [];
  // Only the version learners are served: published, or demo (flagged). Drafts in review never answer questions.
  const where = [...(qVec ? ['c.embedding_model = $2'] : []), "d.review_status <> 'archived'", `c.version = ${SERVED_VERSION_SQL}`];
  if (opts.language) {
    params.push(opts.language);
    where.push(`c.language = $${params.length}`);
  }
  if (opts.topics?.length) {
    params.push(opts.topics);
    where.push(`d.topics && $${params.length}::text[]`);
  }
  if (opts.sourceKinds?.length) {
    params.push(opts.sourceKinds);
    where.push(`(c.source_id is null or c.source_id in (select id from knowledge_sources where kind = any($${params.length}::text[])))`);
  }
  return s.db.query<Row>(
    `select c.id, c.document_id, c.version, c.section, c.language, c.content, c.reference, c.source_id,
            ${qVec ? '1 - (c.embedding <=> $1::vector)' : '0'} as vsim, d.confidence, d.review_status, d.is_demo
       from knowledge_chunks c join knowledge_documents d on d.id = c.document_id
      where ${where.join(' and ')}
      ${qVec ? 'order by c.embedding <=> $1::vector limit 60' : 'order by c.document_id, c.id limit 2000'}`,
    params,
  );
}

async function rank(s: Pick<Services, 'db'>, rows: Row[], opts: RetrieveOptions, qNorm: string, qStems: Set<string>): Promise<RetrievedDocument[]> {
  const keywords = await documentKeywords(s.db);
  const byDoc = new Map<string, RetrievedDocument>();
  for (const r of rows) {
    let doc = byDoc.get(r.document_id);
    if (!doc) {
      const kws = keywords.get(r.document_id) ?? [];
      doc = { documentId: r.document_id, score: 0, keywordHits: keywordScoreFor(kws, qNorm, qStems), tokenOverlap: 0, confidence: r.confidence, reviewStatus: r.review_status, isDemo: r.is_demo, version: r.version, chunks: [] };
      byDoc.set(r.document_id, doc);
    }
    const chunkStems = new Set(tokens(r.content).map(stem));
    const overlap = [...qStems].filter((t) => chunkStems.has(t)).length;
    doc.tokenOverlap = Math.max(doc.tokenOverlap, overlap);
    doc.chunks.push({ chunkId: r.id, documentId: r.document_id, version: r.version, section: r.section, language: r.language, content: r.content, reference: r.reference, sourceId: r.source_id, vectorScore: Number(r.vsim) });
  }

  const results: RetrievedDocument[] = [];
  for (const doc of byDoc.values()) {
    const best = Math.max(...doc.chunks.map((c) => c.vectorScore));
    const keywordScore = Math.min(1, doc.keywordHits / 2);
    const overlapScore = Math.min(1, doc.tokenOverlap / Math.max(2, qStems.size));
    doc.score = 0.5 * best + 0.35 * keywordScore + 0.15 * overlapScore;
    // Grounding: a curated keyword, or at least two meaningful words in common.
    const grounded = doc.keywordHits > 0 || doc.tokenOverlap >= 2;
    if (grounded && doc.score >= MIN_SCORE) {
      doc.chunks.sort((a, b) => b.vectorScore - a.vectorScore);
      doc.chunks = doc.chunks.slice(0, 6);
      results.push(doc);
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, opts.limit ?? 3);
}
