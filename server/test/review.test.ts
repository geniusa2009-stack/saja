// @vitest-environment node
/**
 * The content review system end to end: missions (text-only edits), new knowledge
 * drafts, texts that live in code (claim rules, stories, quizzes, hadith), and the staff
 * status dashboard — every state counted from the database, nothing assumed.
 */
import { createTestServer, account, grantRole, makeScholar, traveller, type Client } from './harness.ts';
import { syncContentBlocks, codeBlocks } from '../modules/content/blocks.ts';

let t: Awaited<ReturnType<typeof createTestServer>>;
beforeAll(async () => (t = await createTestServer()), 60_000);
afterAll(() => t.close());

const L = (s: string) => ({ en: s, ar: `${s} (ar)` });
const uid = async (c: Client) => (await c.get('/auth/me')).data.user.id as string;

async function team() {
  const admin = await account(t.client(), 'adult', `admin-${Math.random()}@example.com`);
  await grantRole(t.services, await uid(admin), 'admin');
  const moderator = await account(t.client(), 'adult', `mod-${Math.random()}@example.com`);
  await grantRole(t.services, await uid(moderator), 'moderator');
  const author = await account(t.client(), 'adult', `author-${Math.random()}@example.com`);
  await makeScholar(t.services, await uid(author), 'verified');
  const reviewer = await account(t.client(), 'adult', `reviewer-${Math.random()}@example.com`);
  const reviewerProfile = await makeScholar(t.services, await uid(reviewer), 'verified');
  const pending = await account(t.client(), 'adult', `pending-${Math.random()}@example.com`);
  await makeScholar(t.services, await uid(pending), 'pending');
  return { admin, moderator, author, reviewer, reviewerProfile, pending };
}

const step = (c: Client, path: string, to: string) => c.post(`${path}/review`, { to, scope: 'full text, both languages' });

describe('mission review: list → open → preview → edit draft → review → approve → publish', () => {
  it('edits only texts, keeps learners on the served version, and publishes through every step', async () => {
    const s = await team();
    const learner = await traveller(t.client());
    const queue = (await s.moderator.get('/missions/review/queue')).data.missions;
    expect(queue).toHaveLength(12);
    expect(queue.every((m: { review_status: string; is_demo: boolean }) => m.review_status === 'draft' && m.is_demo)).toBe(true);

    const texts = (await s.author.get('/missions/m-water-path/texts')).data;
    expect(texts.version).toBe(1);
    const hint = texts.texts.find((x: { path: string }) => x.path === 'payload.steps.3.hint');
    expect(hint).toBeTruthy();

    // Structure can't be edited: only existing EN/AR pairs.
    for (const path of ['id', 'payload.steps.0.id', 'payload.steps.0.fard', 'reward', 'payload.steps.99.hint', '__proto__.x', 'kidSafe']) {
      expect((await s.author.post('/missions/m-water-path/draft', { texts: [{ path, en: 'x', ar: 'x' }], changeNote: 'try structure' })).status).toBe(400);
    }
    // Both languages are required.
    expect((await s.author.post('/missions/m-water-path/draft', { texts: [{ path: hint.path, en: 'Only English', ar: ' ' }], changeNote: 'half' })).status).toBe(400);
    // Moderators review but don't write religious content; learners can't either.
    expect((await s.moderator.post('/missions/m-water-path/draft', { texts: [{ path: hint.path, en: 'x', ar: 'x' }], changeNote: 'nope' })).status).toBe(403);
    expect((await learner.post('/missions/m-water-path/draft', { texts: [{ path: hint.path, en: 'x', ar: 'x' }], changeNote: 'nope' })).status).toBe(403);

    const edit = await s.author.post('/missions/m-water-path/draft', { texts: [{ path: hint.path, en: 'Clearer hint', ar: 'تلميح أوضح' }], changeNote: 'Clarify the nose hint' });
    expect(edit.status).toBe(201);
    expect(edit.data).toMatchObject({ version: 2, inPlace: false, changed: 1 }); // v1 is the served demo baseline: frozen
    // A second save before review edits the same draft in place.
    const again = await s.author.post('/missions/m-water-path/draft', { texts: [{ path: hint.path, en: 'Clearer hint.', ar: 'تلميح أوضح.' }], changeNote: 'Punctuation' });
    expect(again.data).toMatchObject({ version: 2, inPlace: true });

    // Learners still get v1; the draft can't be requested; staff can preview it.
    expect((await learner.get('/missions/m-water-path')).data).toMatchObject({ version: 1, status: 'demo', isDemo: true });
    expect((await learner.get('/missions/m-water-path?version=2')).status).toBe(404);
    expect((await learner.get('/missions/m-water-path?version=2&as=staff')).status).toBe(404);
    const preview = (await s.moderator.get('/missions/m-water-path?as=staff')).data;
    expect(preview).toMatchObject({ version: 2, status: 'in-review' });
    expect(preview.payload.steps[3].hint.en).toBe('Clearer hint.');
    expect(preview.payload.steps[3].id).toBe('nose'); // structure untouched

    const path = '/missions/m-water-path';
    expect((await step(s.author, path, 'approved')).status).toBe(409); // can't skip steps
    expect((await step(s.moderator, path, 'internal_review')).status).toBe(200);
    expect((await step(s.moderator, path, 'scholar_review')).status).toBe(200);
    expect((await step(s.pending, path, 'approved')).status).toBe(403); // not verified
    expect((await step(s.author, path, 'approved')).status).toBe(403); // wrote it
    expect((await step(s.admin, path, 'approved')).status).toBe(403); // admins aren't scholars
    expect((await step(s.reviewer, path, 'approved')).status).toBe(200);
    expect((await step(s.reviewer, path, 'published')).status).toBe(403); // only admins publish
    expect((await learner.get(path)).data.version).toBe(1); // approved ≠ published
    expect((await step(s.admin, path, 'published')).status).toBe(200);

    const live = (await learner.get(path)).data;
    expect(live).toMatchObject({ version: 2, status: 'published', isDemo: false });
    expect(live.payload.steps[3].hint.en).toBe('Clearer hint.');
    const history = (await s.moderator.get(`${path}/history`)).data;
    expect(history.reviews.find((r: { toStatus: string }) => r.toStatus === 'approved').scholar.id).toBe(s.reviewerProfile);
    expect(history.versions[0]).toMatchObject({ version: 2, change_note: 'Punctuation' });

    // Attempts record v2 now; the list and the audit trail agree.
    const at = (await learner.post(`${path}/attempts`, { modality: 'hands-on' })).data;
    expect(at.version).toBe(2);
    expect((await learner.get('/missions')).data.missions.find((m: { id: string }) => m.id === 'm-water-path')).toMatchObject({ version: 2, status: 'published' });
    const audit = (await s.admin.get('/admin/audit')).data.entries;
    expect(audit.some((e: { target_type: string; target_id: string; action: string }) => e.target_type === 'mission' && e.target_id === 'm-water-path@v2' && e.action === 'published')).toBe(true);
  });
});

describe('knowledge editor', () => {
  it('creates a new document as a draft no learner or Siraj can see until it is published', async () => {
    const s = await team();
    const learner = await traveller(t.client());
    const doc = {
      id: 'k-new-test-doc',
      topics: ['character'],
      content: { question: L('What is patience (sabr)?'), simple: L('Patience is steadiness.'), deep: L('Deep text.'), example: L('Example.'), why: L('Why.'), context: L('Context.'), keywords: ['sabr', 'patience'] },
      evidence: [{ kind: 'quran', ref: "Qur'an 2:153", text: L('Seek help through patience and prayer.'), rendering: 'meaning' }],
      confidence: 'consensus',
      changeNote: 'New entry on patience',
    };
    expect((await s.moderator.post('/knowledge', doc)).status).toBe(403);
    expect((await learner.post('/knowledge', doc)).status).toBe(403);
    expect((await s.author.post('/knowledge', doc)).status).toBe(201);
    expect((await s.author.post('/knowledge', doc)).status).toBe(409);

    expect((await learner.get('/knowledge/k-new-test-doc')).status).toBe(404);
    expect((await learner.get('/knowledge')).data.results.some((r: { id: string }) => r.id === 'k-new-test-doc')).toBe(false);
    expect((await learner.get('/knowledge?q=patience%20sabr')).data.results.some((r: { id: string }) => r.id === 'k-new-test-doc')).toBe(false);
    const staffView = (await s.moderator.get('/knowledge/k-new-test-doc?as=staff')).data;
    expect(staffView).toMatchObject({ version: 1, status: 'in-review', isDemo: false, provenance: { origin: 'staff-created' } });

    // Editing a never-reviewed draft changes it in place (no version churn).
    const e2 = await s.author.post('/knowledge/k-new-test-doc/versions', { ...doc, changeNote: 'Tighten wording' });
    expect(e2.data).toMatchObject({ version: 1, inPlace: true });

    for (const [who, to] of [
      [s.moderator, 'internal_review'],
      [s.moderator, 'scholar_review'],
      [s.reviewer, 'approved'],
      [s.admin, 'published'],
    ] as const) {
      expect((await step(who, '/knowledge/k-new-test-doc', to)).status).toBe(200);
    }
    expect((await learner.get('/knowledge/k-new-test-doc')).data).toMatchObject({ version: 1, status: 'published', isDemo: false });
    const trail = (await s.moderator.get('/knowledge/k-new-test-doc/reviews')).data;
    expect(trail.reviews.map((r: { toStatus: string }) => r.toStatus)).toEqual(['draft', 'draft', 'internal_review', 'scholar_review', 'approved', 'published']);
    expect(trail.next).toEqual(['archived', 'draft']);
  });

  it('a new version of reviewed content goes back to draft and starts review again', async () => {
    const s = await team();
    await t.services.db.query("update knowledge_documents set review_status = 'scholar_review' where id = 'k-salam'");
    const v1 = (await s.author.get('/knowledge/k-salam?as=staff')).data;
    const r = await s.author.post('/knowledge/k-salam/versions', {
      content: { ...v1.content, simple: L('Reworded') },
      evidence: v1.evidence.map(({ sourceId: _s, ...e }: Record<string, unknown>) => e),
      confidence: v1.confidence,
      changeNote: 'Reword during review',
    });
    expect(r.data).toMatchObject({ version: 2, inPlace: false });
    expect((await s.author.get('/knowledge/k-salam/reviews')).data.status).toBe('draft');
  });
});

describe('texts that live in code (claim rules, explainer stories, quizzes, hadith)', () => {
  it('registers every block, and a code change sends a published block back to draft', async () => {
    const blocks = codeBlocks();
    const s = await team();
    const list = (await s.moderator.get('/content/blocks')).data.blocks;
    expect(list.length).toBe(blocks.length);
    expect(new Set(list.map((b: { kind: string }) => b.kind))).toEqual(new Set(['claim_rule', 'concept_story', 'quiz', 'hadith']));

    const path = '/content/blocks/claim_rule/five-prayers';
    for (const [who, to] of [
      [s.moderator, 'internal_review'],
      [s.moderator, 'scholar_review'],
      [s.reviewer, 'approved'],
      [s.admin, 'published'],
    ] as const) {
      expect((await step(who, path, to)).status).toBe(200);
    }
    let rule = (await s.moderator.get('/content/blocks')).data.blocks.find((b: { id: string }) => b.id === 'five-prayers');
    expect(rule).toMatchObject({ review_status: 'published', published_version: 1, is_demo: false });

    // Same code → nothing changes on restart.
    await syncContentBlocks(t.services.db);
    rule = (await s.moderator.get('/content/blocks')).data.blocks.find((b: { id: string }) => b.id === 'five-prayers');
    expect(rule.review_status).toBe('published');

    // The code's wording changes → a new version, back to DRAFT, no longer published.
    const changed = blocks.map((b) => (b.id === 'five-prayers' ? { ...b, content: { ...(b.content as object), explanation: { en: 'changed', ar: 'تغيّر' } } } : b));
    await syncContentBlocks(t.services.db, changed);
    rule = (await s.moderator.get('/content/blocks')).data.blocks.find((b: { id: string }) => b.id === 'five-prayers');
    expect(rule).toMatchObject({ review_status: 'draft', published_version: null, is_demo: true, current_version: 2 });
    await syncContentBlocks(t.services.db); // restore the real code text (v3), still a draft
    expect((await t.client().post('/content/blocks/claim_rule/five-prayers/review', { to: 'internal_review', scope: 'x-scope' })).status).toBe(401);
    expect((await t.client().post('/content/blocks/not_a_kind/x/review', { to: 'internal_review', scope: 'x-scope' })).status).toBe(401);
  });
});

describe('staff content status', () => {
  it('is counted from the database and matches what learners receive', async () => {
    const s = await team();
    expect((await (await traveller(t.client())).get('/content/status')).status).toBe(403);
    const st = (await s.moderator.get('/content/status')).data;
    expect(st.knowledge.total).toBeGreaterThanOrEqual(19);
    expect(st.missions.total).toBe(12);
    // Earlier tests published m-water-path and k-new-test-doc; everything else seeded is still demo.
    expect(st.missions.served).toEqual({ published: 1, demo: 11, hidden: 0 });
    expect(st.knowledge.served.published).toBe(1);
    expect(st.knowledge.served.demo).toBe(19);
    expect(st.dailyDeen.total).toBe(19);
    expect(st.dailyDeen.published).toBe(0);
    expect(st.claimRules.usedBy).toEqual(['amanah', 'nour']);
    expect(st.claimRules.total).toBe(codeBlocks().filter((b) => b.kind === 'claim_rule').length);
    expect(st.hadith.total).toBe(codeBlocks().filter((b) => b.kind === 'hadith').length);
    expect(st.hadith.served).toEqual({ published: 0, demo: st.hadith.total, hidden: 0 });
    expect(st.scholars.sample).toBe(2);
    expect(st.scholars.verified).toBeGreaterThan(0);
    expect(st.scholarAnswers.sample).toBe(2);
    const sys = (await t.client().get('/system/status')).data.content;
    expect(sys).toMatchObject({ reviewed: false, publishedMissions: 1, demoMissions: 11 });
  });
});

describe('scholar verification states', () => {
  it('verifying needs a linked account and recorded credentials; samples never change', async () => {
    const s = await team();
    const person = await account(t.client(), 'adult', `no-creds-${Math.random()}@example.com`);
    const created = (
      await s.admin.post('/admin/scholars', { userId: await uid(person), displayName: 'No Credentials', title: L('Teacher'), specialization: L('Fiqh'), languages: ['English'], credentials: [] })
    ).data;
    expect(created.status).toBe('pending');
    expect((await s.admin.post(`/admin/scholars/${created.id}/verification`, { status: 'verified', scope: 'worship' })).status).toBe(400);
    const list = (await s.admin.get('/admin/scholars')).data.scholars as { profile: { verification: string; isDemo: boolean } }[];
    const states = new Set(list.map((x) => x.profile.verification));
    for (const st of ['pending', 'verified', 'sample']) expect(states.has(st)).toBe(true);
    expect(list.filter((x) => x.profile.isDemo).every((x) => x.profile.verification === 'sample')).toBe(true);
  });
});
