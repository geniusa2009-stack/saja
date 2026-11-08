/**
 * One review workflow for all religious content — knowledge documents, missions,
 * and the texts that ship in code (claim rules, explainer stories, quizzes):
 *
 *   DRAFT → INTERNAL REVIEW → SCHOLAR REVIEW → APPROVED → PUBLISHED (versioned)
 *
 * - Only a VERIFIED, non-sample scholar can approve, and never a version they wrote.
 * - Only an admin can publish, and only what a scholar approved.
 * - Every transition is recorded with the reviewer, role, scope, note and time.
 * Nothing becomes "reviewed" automatically, and nothing the client sends can skip a step.
 */
import type { Access } from '../../auth/access.ts';
import type { Queryable } from '../../db/index.ts';
import { one } from '../../db/index.ts';
import { AppError } from '../../lib/errors.ts';
import { log } from '../../lib/log.ts';

export type ReviewStatus = 'draft' | 'internal_review' | 'scholar_review' | 'approved' | 'published' | 'archived';
export const REVIEW_STATUSES: ReviewStatus[] = ['draft', 'internal_review', 'scholar_review', 'approved', 'published', 'archived'];
export type BlockKind = 'claim_rule' | 'concept_story' | 'quiz' | 'hadith';
export type Subject = { type: 'knowledge'; id: string } | { type: 'mission'; id: string } | { type: 'block'; kind: BlockKind; id: string };

type Needs = 'staff' | 'admin' | 'verified_scholar';
const TRANSITIONS: Record<ReviewStatus, Partial<Record<ReviewStatus, Needs>>> = {
  draft: { internal_review: 'staff' },
  internal_review: { scholar_review: 'staff', draft: 'staff' },
  scholar_review: { approved: 'verified_scholar', draft: 'verified_scholar' },
  approved: { published: 'admin', draft: 'admin' },
  published: { archived: 'admin', draft: 'admin' },
  archived: { draft: 'admin' },
};

/** Next steps from a status (for UIs; the server still checks the actor). */
export const nextSteps = (from: ReviewStatus) => Object.keys(TRANSITIONS[from]) as ReviewStatus[];

interface Row {
  review_status: ReviewStatus;
  version: number;
  author: string | null;
}

async function load(q: Queryable, s: Subject): Promise<Row | undefined> {
  switch (s.type) {
    case 'knowledge':
      return one<Row>(
        q,
        `select d.review_status, d.current_version as version, v.created_by as author
           from knowledge_documents d left join knowledge_document_versions v on v.document_id = d.id and v.version = d.current_version
          where d.id = $1 for update of d`,
        [s.id],
      );
    case 'mission':
      return one<Row>(
        q,
        `select m.review_status, m.version, v.created_by as author
           from missions m left join mission_versions v on v.mission_id = m.id and v.version = m.version
          where m.id = $1 for update of m`,
        [s.id],
      );
    case 'block':
      return one<Row>(q, 'select review_status, current_version as version, null::uuid as author from content_blocks where kind = $1 and id = $2 for update', [s.kind, s.id]);
  }
}

async function authorise(q: Queryable, actor: Access, needs: Needs, author: string | null) {
  if (needs === 'verified_scholar') {
    const sp = await one<{ id: string; verification_status: string; is_demo: boolean }>(q, 'select id, verification_status, is_demo from scholar_profiles where user_id = $1', [actor.userId]);
    if (!actor.roles.includes('scholar') || sp?.verification_status !== 'verified' || sp.is_demo) throw new AppError('forbidden', 'Only a verified scholar can approve religious content.');
    // Four eyes: the person who wrote a version can't be the one who approves it.
    if (author && author === actor.userId) throw new AppError('forbidden', 'A version must be approved by a scholar other than its author.');
    return { role: 'verified_scholar', scholarProfileId: sp.id };
  }
  if (needs === 'admin') {
    if (!actor.roles.includes('admin')) throw new AppError('forbidden', 'Only an admin can do this.');
    return { role: 'admin', scholarProfileId: null };
  }
  if (!actor.roles.some((r) => r === 'admin' || r === 'moderator' || r === 'scholar')) throw new AppError('forbidden', 'Only content staff can do this.');
  return { role: actor.roles.includes('admin') ? 'admin' : actor.roles.includes('scholar') ? 'scholar' : 'moderator', scholarProfileId: null };
}

/** Publishing makes THIS version the one learners receive; later edits stay drafts until published again. */
const SET = `review_status = $1, updated_at = now(),
  is_demo = case when $1 = 'published' then false else is_demo end,
  published_version = case when $1 = 'published' then {v} when $1 = 'archived' then null else published_version end`;

export async function transition(q: Queryable, actor: Access, subject: Subject, to: ReviewStatus, scope: string, note?: string) {
  const row = await load(q, subject);
  if (!row) throw new AppError('not_found', 'Not found.');
  const needs = TRANSITIONS[row.review_status][to];
  if (!needs) throw new AppError('conflict', `Cannot move from ${row.review_status} to ${to}.`);
  const { role, scholarProfileId } = await authorise(q, actor, needs, row.author);
  const v = row.version;

  if (subject.type === 'knowledge') {
    await q.query(`update knowledge_documents set ${SET.replace('{v}', 'current_version')}, demo_version = case when $1 = 'published' then null else demo_version end where id = $2`, [to, subject.id]);
    await q.query('update knowledge_chunks set review_status = $1 where document_id = $2 and version = $3', [to, subject.id, v]);
    await q.query('update knowledge_claims set review_status = $1 where document_id = $2 and version = $3', [to, subject.id, v]);
    if (to === 'approved') {
      await q.query("insert into knowledge_relationships (from_type, from_id, relation, to_type, to_id) values ('document', $1, 'reviewed_by', 'review', $2) on conflict do nothing", [subject.id, actor.userId]);
    }
  } else if (subject.type === 'mission') {
    await q.query(`update missions set ${SET.replace('{v}', 'version')}, demo_version = case when $1 = 'published' then null else demo_version end where id = $2`, [to, subject.id]);
  } else {
    await q.query(`update content_blocks set ${SET.replace('{v}', 'current_version')} where kind = $2 and id = $3`, [to, subject.kind, subject.id]);
  }
  await q.query(
    `insert into content_reviews (document_id, mission_id, block_kind, block_id, version, from_status, to_status, reviewer_id, reviewer_role, scope, note, reviewer_scholar_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      subject.type === 'knowledge' ? subject.id : null,
      subject.type === 'mission' ? subject.id : null,
      subject.type === 'block' ? subject.kind : null,
      subject.type === 'block' ? subject.id : null,
      v,
      row.review_status,
      to,
      actor.userId,
      role,
      scope,
      note ?? null,
      scholarProfileId,
    ],
  );
  log.info('content.review', { subject: subject.type, id: subject.id, version: v, from: row.review_status, to, role });
  return { from: row.review_status, to, version: v };
}

/** The review trail of one version, with the reviewing scholar where there was one. */
export async function reviewsFor(q: Queryable, subject: Subject, version?: number) {
  const where =
    subject.type === 'knowledge' ? 'r.document_id = $1' : subject.type === 'mission' ? 'r.mission_id = $1' : 'r.block_id = $1 and r.block_kind = $3';
  const params: unknown[] = [subject.id, version ?? null];
  if (subject.type === 'block') params.push(subject.kind);
  const rows = await q.query<{ version: number; from_status: string; to_status: string; reviewer_role: string; scope: string; note: string | null; created_at: string; sid: string | null; sname: string | null; sver: string | null }>(
    `select r.version, r.from_status, r.to_status, r.reviewer_role, r.scope, r.note, r.created_at, sp.id as sid, sp.display_name as sname, sp.verification_status as sver
       from content_reviews r left join scholar_profiles sp on sp.id = r.reviewer_scholar_id
      where ${where} and ($2::int is null or r.version = $2) order by r.created_at`,
    params,
  );
  return rows.map((r) => ({
    version: r.version,
    fromStatus: r.from_status,
    toStatus: r.to_status,
    reviewerRole: r.reviewer_role,
    scope: r.scope,
    note: r.note,
    at: r.created_at,
    scholar: r.sid ? { id: r.sid, name: r.sname!, verification: r.sver! } : null,
  }));
}
