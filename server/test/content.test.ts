// @vitest-environment node
/**
 * Server-authoritative content: learners receive the PUBLISHED version with its
 * provenance; new drafts never silently replace reviewed content; production
 * documents in review are invisible to learners; versions can be pinned.
 */
import { createTestServer, account, grantRole, makeScholar, traveller } from './harness.ts';
import { retrieve } from '../modules/knowledge/retrieval.ts';

let t: Awaited<ReturnType<typeof createTestServer>>;
beforeAll(async () => (t = await createTestServer()), 60_000);
afterAll(() => t.close());

const L = (s: string) => ({ en: s, ar: s });

async function staff() {
  const admin = await account(t.client(), 'adult', `admin-${Math.random()}@example.com`);
  await grantRole(t.services, (await admin.get('/auth/me')).data.user.id, 'admin');
  const scholar = await account(t.client(), 'adult', `scholar-${Math.random()}@example.com`);
  const scholarProfile = await makeScholar(t.services, (await scholar.get('/auth/me')).data.user.id, 'verified');
  const reviewer = await account(t.client(), 'adult', `reviewer-${Math.random()}@example.com`);
  const reviewerProfile = await makeScholar(t.services, (await reviewer.get('/auth/me')).data.user.id, 'verified');
  return { admin, scholar, scholarProfile, reviewer, reviewerProfile };
}

async function publish(docId: string, s: Awaited<ReturnType<typeof staff>>, approver: 'scholar' | 'reviewer' = 'scholar') {
  for (const [who, to] of [
    [s.admin, 'internal_review'],
    [s.admin, 'scholar_review'],
    [s[approver], 'approved'],
    [s.admin, 'published'],
  ] as const) {
    const r = await who.post(`/knowledge/${docId}/review`, { to, scope: 'full text and evidence' });
    expect(r.status).toBe(200);
  }
}

describe('knowledge served by version with provenance', () => {
  it('demo content is served and labelled demo, with where it came from', async () => {
    const d = (await (await traveller(t.client())).get('/knowledge/k-wudu')).data;
    expect(d.status).toBe('demo');
    expect(d.provenance.origin).toBe('seed-demo');
    expect(d.provenance.sources.length).toBeGreaterThan(0);
  });

  it('keeps serving the reviewed version while a new draft is in review, then switches on publish', async () => {
    const s = await staff();
    const learner = await traveller(t.client());
    await publish('k-pillars', s);
    const v1 = (await learner.get('/knowledge/k-pillars')).data;
    expect(v1).toMatchObject({ version: 1, status: 'published', publishedVersion: 1, isDemo: false });
    expect(v1.reviews.find((r: { toStatus: string }) => r.toStatus === 'approved').scholar.id).toBe(s.scholarProfile);

    const edit = await s.scholar.post('/knowledge/k-pillars/versions', {
      content: { question: L('What are the five pillars?'), simple: L('DRAFT WORDING'), deep: L('d'), example: L('e'), why: L('w'), context: L('c'), keywords: ['pillars'] },
      evidence: v1.evidence.map(({ sourceId: _s, ...e }: Record<string, unknown>) => e),
      confidence: 'consensus',
      changeNote: 'Reword',
    });
    expect(edit.status).toBe(201);

    const still = (await learner.get('/knowledge/k-pillars')).data;
    expect(still.version).toBe(1);
    expect(still.content.simple.en).not.toBe('DRAFT WORDING');
    expect((await learner.get('/knowledge/k-pillars?version=2')).status).toBe(404); // drafts can't be requested
    expect((await learner.get('/knowledge/k-pillars/versions/2')).status).toBe(404);
    expect((await s.admin.get('/knowledge/k-pillars?as=staff')).data.version).toBe(2);
    // Siraj and retrieval use the served (published) version only.
    const [hit] = await retrieve(t.services, { query: 'five pillars of Islam' });
    expect(hit.documentId).toBe('k-pillars');
    expect(hit.version).toBe(1);
    const ans = (await learner.post('/siraj/ask', { text: 'What are the five pillars of Islam?', ctx: { locale: 'en' } })).data;
    expect(ans.contentVersion).toBe(1);
    expect(ans.demoContent).toBe(false);

    // Four eyes: the scholar who wrote v2 can't approve it; another verified scholar must.
    await s.admin.post('/knowledge/k-pillars/review', { to: 'internal_review', scope: 'full text and evidence' });
    await s.admin.post('/knowledge/k-pillars/review', { to: 'scholar_review', scope: 'full text and evidence' });
    expect((await s.scholar.post('/knowledge/k-pillars/review', { to: 'approved', scope: 'my own edit' })).status).toBe(403);
    expect((await s.reviewer.post('/knowledge/k-pillars/review', { to: 'approved', scope: 'full text and evidence' })).status).toBe(200);
    expect((await learner.get('/knowledge/k-pillars')).data.version).toBe(1); // approved is not published
    expect((await s.admin.post('/knowledge/k-pillars/review', { to: 'published', scope: 'release' })).status).toBe(200);
    expect((await learner.get('/knowledge/k-pillars')).data.version).toBe(2);
    // A session that started on v1 may keep reading it — it was published.
    expect((await learner.get('/knowledge/k-pillars?version=1')).data.version).toBe(1);
  });

  it('a production document still in review is invisible to learners everywhere', async () => {
    await t.services.db.query("update knowledge_documents set is_demo = false, published_version = null, demo_version = null, review_status = 'internal_review' where id = 'k-fasting'");
    const learner = await traveller(t.client());
    expect((await learner.get('/knowledge/k-fasting')).status).toBe(404);
    expect((await learner.get('/knowledge')).data.results.some((r: { id: string }) => r.id === 'k-fasting')).toBe(false);
    expect((await retrieve(t.services, { query: 'fasting Ramadan obligatory' })).some((h) => h.documentId === 'k-fasting')).toBe(false);
    const s = await staff();
    expect((await s.admin.get('/knowledge/k-fasting?as=staff')).data.status).toBe('in-review');
    // A learner can't claim to be staff with a query parameter.
    expect((await learner.get('/knowledge/k-fasting?as=staff')).status).toBe(404);
  });

  it('a profile flagged as sample data can never approve content, even if marked verified', async () => {
    const s = await staff();
    const fake = await account(t.client(), 'adult', 'sample-flagged@example.com');
    const pid = await makeScholar(t.services, (await fake.get('/auth/me')).data.user.id, 'verified');
    // "Sample but verified" can't exist in the database; a sample profile is the SAMPLE state.
    await expect(t.services.db.query('update scholar_profiles set is_demo = true where id = $1', [pid])).rejects.toThrow();
    await t.services.db.query("update scholar_profiles set is_demo = true, verification_status = 'sample' where id = $1", [pid]);
    await s.admin.post('/knowledge/k-salam/review', { to: 'internal_review', scope: 'x-scope' });
    await s.admin.post('/knowledge/k-salam/review', { to: 'scholar_review', scope: 'x-scope' });
    expect((await fake.post('/knowledge/k-salam/review', { to: 'approved', scope: 'x-scope' })).status).toBe(403);
  });
});

describe('missions are versioned and attempts record the version played', () => {
  it('serves a pinned mission version with provenance and records it on the attempt', async () => {
    const c = await traveller(t.client());
    const m = (await c.get('/missions/m-water-path')).data;
    expect(m).toMatchObject({ id: 'm-water-path', version: 1, isDemo: true, provenance: { origin: 'seed-demo' } });
    expect(m.payload.type).toBe('wudu-journey');
    expect((await c.get('/missions/m-water-path?version=1')).data.version).toBe(1);
    expect((await c.get('/missions/m-water-path?version=9')).status).toBe(404);
    const at = (await c.post('/missions/m-water-path/attempts', { modality: 'hands-on', version: 1 })).data;
    expect(at.version).toBe(1);
    const [row] = await t.services.db.query<{ mission_version: number }>('select mission_version from mission_attempts where id = $1', [at.attemptId]);
    expect(row.mission_version).toBe(1);
  });
});
