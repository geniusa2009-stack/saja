/**
 * Religious texts that ship in code rather than the database: the AMANAH/NOUR
 * claim rules, the adaptive explainer stories and Siraj's quiz questions.
 *
 * They go through the same review workflow as everything else. What a scholar
 * reviews is an exact snapshot (a content hash). At start-up the server compares
 * the code with the last snapshot; if the text changed, a new version is recorded
 * and it goes back to DRAFT (and loses PUBLISHED) — a review never silently
 * carries over to words the scholar didn't see.
 */
import { createHash } from 'node:crypto';
import type { Db } from '../../db/index.ts';
import { log } from '../../lib/log.ts';
import { CLAIM_RULES } from '../../../src/content/claims.ts';
import { CONCEPT_STORIES } from '../../../src/content/missions.ts';
import { QUIZZES } from '../../../src/content/quizzes.ts';
import type { BlockKind } from './review.ts';

export interface CodeBlock {
  kind: BlockKind;
  id: string;
  content: unknown;
}

export function codeBlocks(): CodeBlock[] {
  return [
    ...CLAIM_RULES.map((r) => ({
      kind: 'claim_rule' as const,
      id: r.id,
      content: {
        verdict: r.verdict,
        patterns: r.patterns.map((p) => `/${p.source}/${p.flags}`),
        unless: r.unless?.map((p) => `/${p.source}/${p.flags}`) ?? [],
        knowledge: r.knowledge,
        explanation: r.explanation,
        suggestion: r.suggestion ?? null,
      },
    })),
    ...Object.entries(CONCEPT_STORIES).map(([id, pages]) => ({ kind: 'concept_story' as const, id, content: { pages } })),
    ...Object.entries(QUIZZES).map(([id, quiz]) => ({ kind: 'quiz' as const, id, content: quiz })),
  ];
}

export const hashContent = (content: unknown) => createHash('sha256').update(JSON.stringify(content)).digest('hex');

/** Records new and changed code texts. Idempotent; safe to run on every start. */
export async function syncContentBlocks(db: Db, blocks: CodeBlock[] = codeBlocks()) {
  const existing = new Map(
    (await db.query<{ kind: string; id: string; content_hash: string; current_version: number; review_status: string }>('select kind, id, content_hash, current_version, review_status from content_blocks')).map((r) => [
      `${r.kind}:${r.id}`,
      r,
    ]),
  );
  const seen = new Set<string>();
  for (const b of blocks) {
    const key = `${b.kind}:${b.id}`;
    seen.add(key);
    const hash = hashContent(b.content);
    const row = existing.get(key);
    if (row?.content_hash === hash) continue;
    await db.tx(async (q) => {
      if (!row) {
        await q.query('insert into content_blocks (kind, id, content_hash) values ($1,$2,$3)', [b.kind, b.id, hash]);
        await q.query('insert into content_block_versions (kind, id, version, content_hash, content) values ($1,$2,1,$3,$4)', [b.kind, b.id, hash, JSON.stringify(b.content)]);
        return;
      }
      const version = row.current_version + 1;
      await q.query('insert into content_block_versions (kind, id, version, content_hash, content) values ($1,$2,$3,$4,$5)', [b.kind, b.id, version, hash, JSON.stringify(b.content)]);
      await q.query(
        "update content_blocks set current_version = $3, content_hash = $4, review_status = 'draft', published_version = null, is_demo = true, updated_at = now() where kind = $1 and id = $2",
        [b.kind, b.id, version, hash],
      );
      if (row.review_status !== 'draft') log.warn('content.block_changed_after_review', { kind: b.kind, id: b.id, version, was: row.review_status });
    });
  }
  // Texts removed from the code are archived, not deleted: their review history stays.
  for (const [key, row] of existing) {
    if (!seen.has(key) && row.review_status !== 'archived') await db.query("update content_blocks set review_status = 'archived', published_version = null, updated_at = now() where kind = $1 and id = $2", key.split(/:(.*)/s).slice(0, 2));
  }
}
