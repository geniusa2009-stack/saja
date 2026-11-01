// @vitest-environment node
import { createTestServer, traveller } from './harness.ts';
import type { AIProvider, StructuredRequest } from '../ai/types.ts';
import { resetSirajCaches } from '../modules/siraj/pipeline.ts';

/** Test double for the model: scripted outputs, records every call. */
function fakeAI(script: (req: StructuredRequest) => unknown): AIProvider & { calls: StructuredRequest[] } {
  const calls: StructuredRequest[] = [];
  return {
    id: 'anthropic',
    model: 'test-model',
    capabilities: new Set(['text', 'structured_output']),
    calls,
    async structured<T>(req: StructuredRequest) {
      calls.push(req);
      const out = script(req);
      if (out instanceof Error) return { ok: false as const, reason: 'unavailable' as const };
      return { ok: true as const, data: out as T, model: 'fake', usage: { input: 1, output: 1 } };
    },
  };
}
const ctx = { locale: 'en' as const };

describe('Siraj in DEMO mode (no model configured)', () => {
  let t: Awaited<ReturnType<typeof createTestServer>>;
  beforeAll(async () => (t = await createTestServer()), 60_000);
  afterAll(() => t.close());

  it('answers extractively from curated knowledge with evidence and demo status', async () => {
    const c = await traveller(t.client());
    const r = (await c.post('/siraj/ask', { text: 'Why do we pray five times?', ctx })).data;
    expect(r.status).toBe('supported');
    expect(r.generatedBy).toBe('extractive');
    expect(r.knowledgeId).toBe('k-five-prayers');
    expect(r.evidence.map((e: { ref: string }) => e.ref)).toContain("Qur'an 4:103");
    expect(r.demoContent).toBe(true);
  });

  it('says it is uncertain instead of guessing, and offers a scholar', async () => {
    const c = await traveller(t.client());
    const r = (await c.post('/siraj/ask', { text: 'What colour were the tents at Badr?', ctx })).data;
    expect(r.status).toBe('uncertain');
    expect(r.evidence).toEqual([]);
    expect(r.route.kind).toBe('scholar');
  });

  it('routes personal rulings to a human and responds with care to distress', async () => {
    const c = await traveller(t.client());
    expect((await c.post('/siraj/ask', { text: 'Is it haram for me to take a mortgage?', ctx })).data.status).toBe('requires-human-review');
    const d = (await c.post('/siraj/ask', { text: 'I want to hurt myself', ctx })).data;
    expect(d.status).toBe('requires-human-review');
    expect(d.text).toMatch(/trusted adult/);
  });

  it('serves button intents deterministically', async () => {
    const c = await traveller(t.client());
    const r = (await c.post('/siraj/ask', { intent: 'deep', ctx: { ...ctx, focusKnowledgeId: 'k-wudu' } })).data;
    expect(r.generatedBy).toBe('rules');
    expect(r.text).toMatch(/Qur’an 5:6|5:6/);
  });

  it('keeps conversation history only when the person allows it', async () => {
    const c = await traveller(t.client());
    await c.post('/siraj/ask', { text: 'What is wudu?', ctx });
    expect((await c.get('/siraj/history')).data.remembered).toBe(false);
    await c.put('/profile/memory', { style: true, topics: true, schedule: false, conversations: true });
    await c.post('/siraj/ask', { text: 'What is wudu?', ctx });
    expect((await c.get('/siraj/history')).data.messages.length).toBe(2);
    await c.put('/profile/memory', { style: true, topics: true, schedule: false, conversations: false });
    const [{ n }] = await t.services.db.query<{ n: number }>("select count(*)::int as n from tutor_messages where user_id = (select id from users order by created_at desc limit 1)");
    expect(n).toBe(0);
  });
});

describe('Siraj with a model (grounding guarantees)', () => {
  let t: Awaited<ReturnType<typeof createTestServer>>;
  let ai: ReturnType<typeof fakeAI>;
  let next: unknown;
  beforeAll(async () => {
    ai = fakeAI(() => next);
    t = await createTestServer({ ai });
  }, 60_000);
  afterAll(() => t.close());
  beforeEach(() => resetSirajCaches());

  it('constrains generation to provided evidence and keeps only valid citations', async () => {
    next = { status: 'supported', answer: 'Allah made prayer due at set times.', citations: ['k-five-prayers#E1', 'bukhari#9999'] };
    const c = await traveller(t.client());
    const r = (await c.post('/siraj/ask', { text: 'Why do we pray five times a day?', ctx })).data;
    expect(r.generatedBy).toBe('ai');
    expect(r.status).toBe('supported');
    expect(r.evidence.map((e: { id: string }) => e.id)).toEqual(['k-five-prayers#E1']);
    const prompt = ai.calls.at(-1)!;
    expect(prompt.user).toContain("[k-five-prayers#E1] Qur'an 4:103");
    expect(prompt.system).toMatch(/Never invent references/);
    expect(JSON.stringify(prompt.user)).not.toContain('Yusuf'); // no personal data sent
  });

  it('downgrades to uncertain when the model cites nothing real', async () => {
    next = { status: 'supported', answer: 'It is in Bukhari 9999.', citations: ['bukhari#9999'] };
    const c = await traveller(t.client());
    const r = (await c.post('/siraj/ask', { text: 'Why do we pray five times a day?', ctx })).data;
    expect(r.status).toBe('uncertain');
    expect(r.route.kind).toBe('scholar');
  });

  it('downgrades when a quotation does not exist in the evidence', async () => {
    next = { status: 'supported', answer: 'The Prophet said “pray and you will never be sad again”.', citations: ['k-five-prayers#E1'] };
    const c = await traveller(t.client());
    expect((await c.post('/siraj/ask', { text: 'Why do we pray five times a day?', ctx })).data.status).toBe('uncertain');
  });

  it('marks scholarly difference as context-needed', async () => {
    next = { status: 'supported', answer: 'It is in the last ten nights, most likely an odd night.', citations: ['k-laylat-al-qadr#E1'] };
    const c = await traveller(t.client());
    expect((await c.post('/siraj/ask', { text: 'When is Laylat al-Qadr?', ctx })).data.status).toBe('context-needed');
  });

  it('caches repeat questions and falls back to curated answers when the model is unavailable', async () => {
    next = { status: 'supported', answer: 'Wudu prepares you for prayer.', citations: ['k-wudu#E1'] };
    const c = await traveller(t.client());
    const before = ai.calls.length;
    await c.post('/siraj/ask', { text: 'how do I do wudu', ctx });
    const again = (await c.post('/siraj/ask', { text: 'how do I do wudu', ctx })).data;
    expect(again.cached).toBe(true);
    expect(ai.calls.length - before).toBe(1);
    next = new Error('down');
    const r = (await c.post('/siraj/ask', { text: 'what are the five pillars of Islam', ctx })).data;
    expect(r.generatedBy).toBe('extractive');
    expect(r.knowledgeId).toBe('k-pillars');
  });

  it('never calls the model when retrieval finds nothing', async () => {
    const c = await traveller(t.client());
    const before = ai.calls.length;
    await c.post('/siraj/ask', { text: 'Who won the football match yesterday?', ctx });
    expect(ai.calls.length).toBe(before);
  });
});
