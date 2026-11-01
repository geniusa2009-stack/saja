/**
 * Reading knowledge documents with provenance.
 *
 * Which version does someone get?
 *   - Learners: the PUBLISHED version (reviewed and approved). Demo documents that
 *     were never published are served at their seeded DEMO version, always flagged
 *     `isDemo`. Drafts — including staff edits of demo documents — are never served.
 *   - Staff (admin/moderator/scholar): any version, current by default.
 * Editing never replaces what learners see until the new version is published.
 */
import type { Queryable } from '../../db/index.ts';
import { one } from '../../db/index.ts';
import type { Evidence } from '../../../src/domain/types.ts';

/** SQL for the version a learner is served (NULL = not visible to learners). */
export const SERVED_VERSION_SQL = 'coalesce(d.published_version, d.demo_version)';

export type Viewer = 'learner' | 'staff';

export interface KnowledgeView {
  id: string;
  version: number;
  currentVersion: number;
  publishedVersion: number | null;
  topics: string[];
  confidence: string;
  reviewStatus: string;
  /** What this specific version is: demo content, reviewed & published, or a draft in review (staff only). */
  status: 'demo' | 'published' | 'in-review';
  isDemo: boolean;
  content: Record<string, unknown>;
  evidence: (Evidence & { sourceId: string | null })[];
  provenance: Record<string, unknown>;
  changeNote: string | null;
  reviews: { fromStatus: string; toStatus: string; reviewerRole: string; scope: string; at: string; scholar: { id: string; name: string; verification: string } | null }[];
}

export async function getKnowledge(q: Queryable, id: string, opts: { version?: number; viewer?: Viewer } = {}): Promise<KnowledgeView | null> {
  const viewer = opts.viewer ?? 'learner';
  const d = await one<{ id: string; topics: string[]; confidence: string; review_status: string; is_demo: boolean; current_version: number; published_version: number | null; demo_version: number | null; served: number | null }>(
    q,
    `select d.id, d.topics, d.confidence, d.review_status, d.is_demo, d.current_version, d.published_version, d.demo_version, ${SERVED_VERSION_SQL} as served
       from knowledge_documents d where d.id = $1`,
    [id],
  );
  if (!d) return null;
  let version: number;
  if (viewer === 'staff') version = opts.version ?? d.current_version;
  else {
    if (d.served == null || d.review_status === 'archived') return null;
    version = d.served;
    if (opts.version != null && opts.version !== d.served) {
      // A learner may keep reading a version they were given earlier in a session only if it was once published (or is the demo baseline).
      const ok = opts.version === d.demo_version || (await one(q, "select 1 from content_reviews where document_id = $1 and version = $2 and to_status = 'published'", [id, opts.version]));
      if (!ok) return null;
      version = opts.version;
    }
  }
  const v = await one<{ version: number; content: Record<string, unknown>; evidence: Evidence[]; provenance: Record<string, unknown>; change_note: string | null }>(
    q,
    'select version, content, evidence, provenance, change_note from knowledge_document_versions where document_id = $1 and version = $2',
    [id, version],
  );
  if (!v) return null;
  const { sourceIdFor } = await import('../../db/seed.ts');
  const reviews = await q.query<{ from_status: string; to_status: string; reviewer_role: string; scope: string; created_at: string; sid: string | null; sname: string | null; sver: string | null }>(
    `select r.from_status, r.to_status, r.reviewer_role, r.scope, r.created_at, sp.id as sid, sp.display_name as sname, sp.verification_status as sver
       from content_reviews r left join scholar_profiles sp on sp.id = r.reviewer_scholar_id
      where r.document_id = $1 and r.version = $2 order by r.created_at`,
    [id, v.version],
  );
  const wasPublished = reviews.some((r) => r.to_status === 'published');
  return {
    id: d.id,
    version: v.version,
    currentVersion: d.current_version,
    publishedVersion: d.published_version,
    topics: d.topics,
    confidence: d.confidence,
    reviewStatus: d.review_status,
    status: wasPublished ? 'published' : v.version === d.demo_version ? 'demo' : 'in-review',
    isDemo: d.is_demo,
    content: v.content,
    evidence: v.evidence.map((e) => ({ ...e, sourceId: sourceIdFor(e.ref, e.kind) })),
    provenance: v.provenance ?? {},
    changeNote: v.change_note,
    reviews: reviews.map((r) => ({
      fromStatus: r.from_status,
      toStatus: r.to_status,
      reviewerRole: r.reviewer_role,
      scope: r.scope,
      at: r.created_at,
      scholar: r.sid ? { id: r.sid, name: r.sname!, verification: r.sver! } : null,
    })),
  };
}

/** Knowledge-graph neighbours used for related learning and mission recommendation. */
export async function related(q: Queryable, documentId: string) {
  const missions = await q.query<{ id: string }>("select from_id as id from knowledge_relationships where from_type = 'mission' and relation = 'illustrates' and to_type = 'document' and to_id = $1", [documentId]);
  const siblings = await q.query<{ id: string; shared: number }>(
    `select r2.from_id as id, count(*)::int as shared
       from knowledge_relationships r1
       join knowledge_relationships r2 on r2.to_type = 'topic' and r2.to_id = r1.to_id and r2.from_id <> r1.from_id and r2.relation = 'explains'
       join knowledge_documents d on d.id = r2.from_id
      where r1.from_type = 'document' and r1.from_id = $1 and r1.relation = 'explains' and ${SERVED_VERSION_SQL} is not null
      group by r2.from_id order by shared desc, r2.from_id limit 4`,
    [documentId],
  );
  const sources = await q.query<{ id: string; title: string; kind: string }>(
    `select s.id, s.title, s.kind from knowledge_relationships r join knowledge_sources s on s.id = r.from_id
      where r.from_type = 'source' and r.relation = 'supports' and r.to_type = 'document' and r.to_id = $1`,
    [documentId],
  );
  return { missions: missions.map((m) => m.id), documents: siblings.map((s) => s.id), sources };
}
