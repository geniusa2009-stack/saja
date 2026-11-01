/**
 * Keeps stored embeddings in step with the configured embedding provider.
 * Retrieval only compares vectors from the same model, so after switching
 * provider (e.g. adding VOYAGE_API_KEY) or upgrading the local embedder, every
 * chunk is re-embedded once at start-up. Without this, search would silently
 * find nothing. Failures are logged and reported by /api/system/health.
 */
import type { Services } from '../../context.ts';
import { toPgVector } from '../../ai/embeddings.ts';
import { log } from '../../lib/log.ts';
import { invalidateKeywordCache } from './retrieval.ts';

const BATCH = 64;

export async function reindexStaleChunks(s: Pick<Services, 'db' | 'embeddings'>): Promise<number> {
  const stale = await s.db.query<{ id: string; content: string }>('select id, content from knowledge_chunks where embedding_model <> $1 order by id', [s.embeddings.id]);
  if (!stale.length) return 0;
  const started = Date.now();
  log.info('knowledge.reindex.start', { chunks: stale.length, model: s.embeddings.id });
  let done = 0;
  try {
    for (let i = 0; i < stale.length; i += BATCH) {
      const batch = stale.slice(i, i + BATCH);
      const vectors = await s.embeddings.embed(batch.map((c) => c.content), 'document');
      await s.db.tx(async (q) => {
        for (let j = 0; j < batch.length; j++) await q.query('update knowledge_chunks set embedding = $1, embedding_model = $2 where id = $3', [toPgVector(vectors[j]), s.embeddings.id, batch[j].id]);
      });
      done += batch.length;
    }
  } catch (error) {
    log.error('knowledge.reindex.failed', { done, remaining: stale.length - done, model: s.embeddings.id, error });
  }
  invalidateKeywordCache();
  log.info('knowledge.reindex.done', { chunks: done, ms: Date.now() - started });
  return done;
}
