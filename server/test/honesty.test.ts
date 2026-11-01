// @vitest-environment node
/**
 * Honesty sweep on a freshly seeded database: every learner-facing surface says DEMO,
 * nothing claims review, publication or verification that the database doesn't hold.
 */
import { createTestServer, traveller, type Client } from './harness.ts';

let t: Awaited<ReturnType<typeof createTestServer>>;
let learner: Client;
beforeAll(async () => {
  t = await createTestServer();
  learner = await traveller(t.client());
}, 60_000);
afterAll(() => t.close());

describe('no demo content can appear as published or reviewed', () => {
  it('knowledge: the library, every entry and its review trail', async () => {
    const list = (await learner.get('/knowledge')).data.results as { id: string; status: string; isDemo: boolean }[];
    expect(list).toHaveLength(19);
    expect(list.every((r) => r.status === 'demo' && r.isDemo)).toBe(true);
    for (const { id } of list) {
      const k = (await learner.get(`/knowledge/${id}`)).data;
      expect(k).toMatchObject({ status: 'demo', isDemo: true, publishedVersion: null });
      expect(k.reviews.some((r: { toStatus: string }) => ['approved', 'published'].includes(r.toStatus))).toBe(false);
    }
  });

  it('missions, Daily Deen and the system status', async () => {
    const missions = (await learner.get('/missions')).data.missions as { id: string; status: string; isDemo: boolean }[];
    expect(missions).toHaveLength(12);
    expect(missions.every((m) => m.status === 'demo' && m.isDemo)).toBe(true);
    for (const { id } of missions) expect((await learner.get(`/missions/${id}`)).data).toMatchObject({ status: 'demo', isDemo: true });
    const daily = (await learner.get('/daily')).data.items as { isDemo: boolean }[];
    expect(daily.length).toBeGreaterThan(0);
    expect(daily.every((d) => d.isDemo)).toBe(true);
    expect((await learner.get('/system/status')).data.content).toMatchObject({ reviewed: false, publishedDocuments: 0, publishedMissions: 0, demoDocuments: 19, demoMissions: 12 });
  });

  it('Siraj answers and AMANAH/NOUR verdicts say their content is not reviewed', async () => {
    for (const text of ['How do I perform wudu?', 'ما هي أركان الإسلام؟', 'When is Laylat al-Qadr?']) {
      const r = (await (await traveller(t.client())).post('/siraj/ask', { text, ctx: { locale: 'en' } })).data;
      expect(r.demoContent).toBe(true);
    }
    const audit = (await learner.post('/audits?wait=1', { tool: 'nour', inputKind: 'post', text: 'Fasting in Ramadan is one of the five pillars of Islam.' })).data;
    expect(audit.rules.published).toBe(0);
    expect(audit.rules.total).toBeGreaterThan(0);
  });
});

describe('no sample scholar can appear as verified', () => {
  it('sample answers, public profiles and the database all say SAMPLE', async () => {
    const samples = (await learner.get('/scholar/samples')).data.questions as { answer: { isDemo: boolean; scholar: { verification: string; isDemo: boolean } } }[];
    expect(samples.length).toBeGreaterThan(0);
    for (const q of samples) expect(q.answer).toMatchObject({ isDemo: true, scholar: { verification: 'sample', isDemo: true } });
    const ids = await t.services.db.query<{ id: string }>('select id from scholar_profiles where is_demo');
    expect(ids.length).toBe(2);
    for (const { id } of ids) expect((await learner.get(`/scholars/${id}`)).data.profile).toMatchObject({ verification: 'sample', isDemo: true });
    const [{ n }] = await t.services.db.query<{ n: number }>("select count(*)::int as n from scholar_profiles where verification_status = 'verified'");
    expect(n).toBe(0);
    await expect(t.services.db.query("update scholar_profiles set verification_status = 'verified' where is_demo")).rejects.toThrow();
  });
});
