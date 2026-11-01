// @vitest-environment node
import { createTestServer, account, grantRole, makeScholar, traveller } from './harness.ts';
import { retrieve } from '../modules/knowledge/retrieval.ts';

let t: Awaited<ReturnType<typeof createTestServer>>;
beforeAll(async () => {
  t = await createTestServer();
}, 60_000);
afterAll(() => t.close());

describe('retrieval (RAG foundation)', () => {
  it('finds the right document in English and Arabic', async () => {
    expect((await retrieve(t.services, { query: 'how do I do wudu?' }))[0].documentId).toBe('k-wudu');
    expect((await retrieve(t.services, { query: 'ما هي أركان الإسلام الخمسة' }))[0].documentId).toBe('k-pillars');
    expect((await retrieve(t.services, { query: 'Why do we pray five times a day?' }))[0].documentId).toBe('k-five-prayers');
  });

  it('never grounds an answer on common words alone', async () => {
    expect(await retrieve(t.services, { query: 'What colour were the tents at Badr?' })).toEqual([]);
    expect(await retrieve(t.services, { query: 'what is the the and of' })).toEqual([]);
    expect(await retrieve(t.services, { query: '' })).toEqual([]);
  });

  it('filters by language, topic and source kind, and keeps provenance', async () => {
    const [ar] = await retrieve(t.services, { query: 'wudu ablution', language: 'ar' });
    expect(ar.chunks.every((c) => c.language === 'ar')).toBe(true);
    expect(await retrieve(t.services, { query: 'how do I do wudu', topics: ['fasting'] })).toEqual([]);
    const [q] = await retrieve(t.services, { query: 'wudu wash face arms', sourceKinds: ['quran'] });
    const evid = q.chunks.filter((c) => c.section === 'evidence');
    expect(evid.every((c) => c.sourceId === 'quran-saheeh-intl')).toBe(true);
    expect(evid.some((c) => c.reference === "Qur'an 5:6")).toBe(true);
  });

  it('exposes documents with evidence, review state and graph neighbours', async () => {
    const r = await t.client().get('/knowledge/k-wudu');
    expect(r.data.reviewStatus).toBe('draft');
    expect(r.data.isDemo).toBe(true);
    expect(r.data.evidence[0].ref).toBe("Qur'an 5:6");
    expect(r.data.related.missions).toContain('m-water-path');
    expect(r.data.related.sources.map((s: { id: string }) => s.id)).toContain('hadith-bukhari');
  });

  it('serves curated Daily Deen for a date (never generated)', async () => {
    const r = await t.client().get('/daily?date=2026-09-29');
    expect(r.data.items.length).toBeGreaterThanOrEqual(2);
    expect(r.data.items.every((i: { isDemo: boolean }) => i.isDemo)).toBe(true);
  });

  it('unified search spans missions, places and knowledge', async () => {
    const r = await t.client().get('/search?q=' + encodeURIComponent('Mission 5'));
    expect(r.data.missions.map((m: { number: number }) => m.number)).toContain(5);
    const w = await t.client().get('/search?q=wudu');
    expect(w.data.knowledge[0].id).toBe('k-wudu');
  });
});

describe('content versioning & review workflow', () => {
  it('only lets a verified scholar approve, and records every step', async () => {
    const admin = await account(t.client(), 'adult', 'admin@example.com');
    const adminId = (await admin.get('/auth/me')).data.user.id;
    await grantRole(t.services, adminId, 'admin');
    const mod = await account(t.client(), 'adult', 'mod@example.com');
    await grantRole(t.services, (await mod.get('/auth/me')).data.user.id, 'moderator');
    const unverified = await account(t.client(), 'adult', 'pending-scholar@example.com');
    await makeScholar(t.services, (await unverified.get('/auth/me')).data.user.id, 'pending');
    const scholar = await account(t.client(), 'adult', 'scholar@example.com');
    await makeScholar(t.services, (await scholar.get('/auth/me')).data.user.id, 'verified');
    const learner = await traveller(t.client());

    const step = (c: typeof admin, to: string) => c.post('/knowledge/k-salam/review', { to, scope: 'full text and evidence' });
    expect((await step(learner, 'internal_review')).status).toBe(403);
    expect((await step(mod, 'internal_review')).status).toBe(200);
    expect((await step(mod, 'scholar_review')).status).toBe(200);
    expect((await step(mod, 'approved')).status).toBe(403);
    expect((await step(unverified, 'approved')).status).toBe(403);
    expect((await step(scholar, 'published')).status).toBe(409); // can't skip approval
    expect((await step(scholar, 'approved')).status).toBe(200);
    expect((await step(scholar, 'published')).status).toBe(403); // publishing is an admin act
    expect((await step(admin, 'published')).status).toBe(200);

    const doc = (await t.client().get('/knowledge/k-salam')).data;
    expect(doc.reviewStatus).toBe('published');
    expect(doc.isDemo).toBe(false);
    expect(doc.reviews.map((r: { toStatus: string }) => r.toStatus)).toEqual(['internal_review', 'scholar_review', 'approved', 'published']);
    expect(doc.reviews.find((r: { toStatus: string }) => r.toStatus === 'approved').reviewerRole).toBe('verified_scholar');
  });

  it('creates new versions without overwriting evidence, and resets them to draft', async () => {
    const scholar = await account(t.client(), 'adult', 'editor@example.com');
    await makeScholar(t.services, (await scholar.get('/auth/me')).data.user.id);
    const v1 = (await t.client().get('/knowledge/k-kindness')).data;
    const L = (s: string) => ({ en: s, ar: s });
    const r = await scholar.post('/knowledge/k-kindness/versions', {
      content: { question: L('What does Islam teach about kindness?'), simple: L('Updated simple answer.'), deep: L('d'), example: L('e'), why: L('w'), context: L('c'), keywords: ['kindness'] },
      evidence: v1.evidence.map(({ sourceId: _s, ...e }: Record<string, unknown>) => e),
      confidence: 'consensus',
      changeNote: 'Clarify wording',
    });
    expect(r.status).toBe(201);
    expect(r.data.version).toBe(2);
    // Staff see the new draft; learners keep the demo baseline — a draft of demo content is still a draft.
    const cur = (await scholar.get('/knowledge/k-kindness?as=staff')).data;
    expect(cur.version).toBe(2);
    expect(cur.reviewStatus).toBe('draft');
    expect(cur.status).toBe('in-review');
    const learner = (await t.client().get('/knowledge/k-kindness')).data;
    expect(learner).toMatchObject({ version: 1, status: 'demo' });
    expect((await t.client().get('/knowledge/k-kindness?version=2')).status).toBe(404);
    const old = (await t.client().get('/knowledge/k-kindness/versions/1')).data;
    expect(old.content.simple.en).toBe(v1.content.simple.en);
    // Evidence of v1 is untouched and retrieval serves only the version learners receive.
    const hit = (await retrieve(t.services, { query: 'kindness Islam teach' }))[0];
    expect(hit.chunks.every((c) => c.version === 1)).toBe(true);
  });
});
