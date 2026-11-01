/**
 * Staff content status and the review of texts that ship in code.
 * Every number here is counted from the database — nothing is assumed reviewed.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../../context.ts';
import type { Queryable } from '../../db/index.ts';
import { one } from '../../db/index.ts';
import { AppError } from '../../lib/errors.ts';
import { body } from '../../lib/http.ts';
import { requireAccess, requireRole } from '../../auth/middleware.ts';
import { nextSteps, reviewsFor, REVIEW_STATUSES, transition, type BlockKind, type ReviewStatus } from './review.ts';
import { ReviewIn } from '../knowledge/routes.ts';

export const contentRoutes = new Hono<AppEnv>();

const BLOCK_KIND = z.enum(['claim_rule', 'concept_story', 'quiz']);

type Counts = { total: number; byStatus: Record<ReviewStatus, number>; served: { published: number; demo: number; hidden: number } };

async function count(q: Queryable, from: string, served: string): Promise<Counts> {
  const rows = await q.query<{ review_status: ReviewStatus; n: number; published: number; demo: number; hidden: number }>(
    `select review_status, count(*)::int as n,
            count(*) filter (where published_version is not null and review_status <> 'archived')::int as published,
            count(*) filter (where published_version is null and ${served} is not null and review_status <> 'archived')::int as demo,
            count(*) filter (where ${served} is null or review_status = 'archived')::int as hidden
       from ${from} group by review_status`,
  );
  const byStatus = Object.fromEntries(REVIEW_STATUSES.map((s) => [s, 0])) as Record<ReviewStatus, number>;
  const out: Counts = { total: 0, byStatus, served: { published: 0, demo: 0, hidden: 0 } };
  for (const r of rows) {
    byStatus[r.review_status] = r.n;
    out.total += r.n;
    out.served.published += r.published;
    out.served.demo += r.demo;
    out.served.hidden += r.hidden;
  }
  return out;
}

/** The staff dashboard: what learners actually receive, and where everything is in review. */
contentRoutes.get('/status', async (c) => {
  requireRole(c, 'admin', 'moderator', 'scholar');
  const db = c.get('services').db;
  const knowledge = await count(db, 'knowledge_documents', 'coalesce(published_version, demo_version)');
  const missions = await count(db, 'missions', 'coalesce(published_version, demo_version)');
  const blocks = {} as Record<BlockKind, Counts>;
  for (const kind of BLOCK_KIND.options) {
    // Texts in code are always served; "demo" means served without a published review of this exact text.
    blocks[kind] = await count(db, `content_blocks where kind = '${kind}'`, '1');
  }
  const daily = await one<{ total: number; published: number; demo: number; hidden: number }>(
    db,
    `select count(*)::int as total,
            count(*) filter (where d.published_version is not null)::int as published,
            count(*) filter (where d.published_version is null and d.demo_version is not null)::int as demo,
            count(*) filter (where coalesce(d.published_version, d.demo_version) is null or d.review_status = 'archived')::int as hidden
       from daily_content dc join knowledge_documents d on d.id = dc.document_id`,
  );
  const scholars = await db.query<{ verification_status: string; n: number }>('select verification_status, count(*)::int as n from scholar_profiles group by verification_status');
  const answers = await one<{ sample: number; real: number }>(db, 'select count(*) filter (where is_demo)::int as sample, count(*) filter (where not is_demo)::int as real from scholar_answers');
  return c.json({
    knowledge,
    missions,
    dailyDeen: { ...daily!, note: 'Daily Deen items are knowledge documents; each follows its document’s review state.' },
    claimRules: { ...blocks.claim_rule, usedBy: ['amanah', 'nour'] },
    conceptStories: blocks.concept_story,
    quizzes: blocks.quiz,
    scholars: Object.fromEntries(['unverified', 'pending', 'verified', 'suspended', 'sample'].map((s) => [s, scholars.find((r) => r.verification_status === s)?.n ?? 0])),
    scholarAnswers: answers,
  });
});

/** Texts that ship in code, with their current snapshot and review state. */
contentRoutes.get('/blocks', async (c) => {
  requireRole(c, 'admin', 'moderator', 'scholar');
  const rows = await c.get('services').db.query<{ kind: BlockKind; id: string; current_version: number; published_version: number | null; review_status: ReviewStatus; is_demo: boolean; updated_at: string; content: unknown }>(
    `select b.kind, b.id, b.current_version, b.published_version, b.review_status, b.is_demo, b.updated_at, v.content
       from content_blocks b join content_block_versions v on v.kind = b.kind and v.id = b.id and v.version = b.current_version
      order by b.kind, b.id`,
  );
  return c.json({ blocks: rows.map((r) => ({ ...r, next: nextSteps(r.review_status) })) });
});

contentRoutes.get('/blocks/:kind/:id/reviews', async (c) => {
  requireRole(c, 'admin', 'moderator', 'scholar');
  const kind = BLOCK_KIND.parse(c.req.param('kind'));
  return c.json({ reviews: await reviewsFor(c.get('services').db, { type: 'block', kind, id: c.req.param('id') }) });
});

contentRoutes.post('/blocks/:kind/:id/review', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const kind = BLOCK_KIND.safeParse(c.req.param('kind'));
  if (!kind.success) throw new AppError('not_found', 'Not found.');
  const b = await body(c, ReviewIn);
  return c.json(await s.db.tx((q) => transition(q, a, { type: 'block', kind: kind.data, id: c.req.param('id') }, b.to, b.scope, b.note)));
});
