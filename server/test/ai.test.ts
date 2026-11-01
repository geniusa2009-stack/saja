// @vitest-environment node
/**
 * Production AI boundaries: deterministic/retrieval first, cached, budgeted,
 * logged without content, and every multimodal adapter honest when missing.
 */
import { createTestServer, traveller } from './harness.ts';
import type { AIProvider, StructuredRequest, TranscriptionProvider } from '../ai/types.ts';
import { MemoryAiBudget } from '../ai/guard.ts';
import type { FrameExtractor } from '../ai/frames.ts';
import { resetSirajCaches } from '../modules/siraj/pipeline.ts';
import { setLogSilent } from '../lib/log.ts';

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 1]);
const MP4 = Uint8Array.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0]);

function fakeAI() {
  const calls: StructuredRequest[] = [];
  const ai: AIProvider = {
    id: 'anthropic',
    model: 'test-model',
    capabilities: new Set(['text', 'structured_output', 'vision', 'pdf']),
    async structured<T>(req: StructuredRequest) {
      calls.push(req);
      const data =
        req.purpose === 'siraj-answer'
          ? { status: 'supported', answer: 'Prayer is at set times.', citations: [String(req.user).match(/\[([^\]]+#E1)\]/)?.[1]].filter(Boolean) }
          : req.purpose === 'ocr' || req.purpose === 'frame-ocr'
            ? { text: 'Every child must fast from the age of seven.' }
            : req.purpose === 'claim-extraction'
              ? { claims: [] }
              : { question: 'How do I pray?', topic: 'prayer', missing_context: [] };
      return { ok: true as const, data: data as T, model: 'fake', usage: { input: 10, output: 5 } };
    },
  };
  return { ai, calls };
}

describe('Siraj cost controls', () => {
  const { ai, calls } = fakeAI();
  let t: Awaited<ReturnType<typeof createTestServer>>;
  beforeAll(async () => (t = await createTestServer({ ai, aiBudget: new MemoryAiBudget(2) })), 60_000);
  afterAll(() => t.close());
  beforeEach(() => resetSirajCaches());

  it('answers button intents deterministically — no model call', async () => {
    const c = await traveller(t.client());
    const before = calls.length;
    const r = (await c.post('/siraj/ask', { intent: 'deep', ctx: { locale: 'en', focusKnowledgeId: 'k-wudu' } })).data;
    expect(r.generatedBy).toBe('rules');
    expect(calls.length).toBe(before);
  });

  it('caches identical grounded questions and falls back to extractive answers when the daily budget is spent', async () => {
    const c = await traveller(t.client());
    const ask = (text: string) => c.post('/siraj/ask', { text, ctx: { locale: 'en' } }).then((r) => r.data);
    const start = calls.length;
    expect((await ask('Why do we pray five times a day?')).generatedBy).toBe('ai');
    expect((await ask('Why do we pray five times a day?')).cached).toBe(true);
    expect(calls.length - start).toBe(1);
    expect((await ask('What are the five pillars of Islam?')).generatedBy).toBe('ai');
    const third = await ask('Why do we pray five prayers each day?');
    expect(calls.length - start).toBe(2); // budget of 2 reached
    expect(third.generatedBy).toBe('extractive'); // still grounded, still cited
    expect(third.evidence.length).toBeGreaterThan(0);
  });

  it('never calls the model for questions with no grounding or that need a scholar', async () => {
    const c = await traveller(t.client());
    const start = calls.length;
    expect((await c.post('/siraj/ask', { text: 'What colour were the tents at Badr?', ctx: { locale: 'en' } })).data.status).toBe('uncertain');
    expect((await c.post('/siraj/ask', { text: 'Is my divorce valid if I said it angry?', ctx: { locale: 'en' } })).data.status).toBe('requires-human-review');
    expect(calls.length).toBe(start);
  });

  it('logs each model call with purpose and usage — never the prompt, question or answer', async () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((l: string) => void lines.push(l));
    setLogSilent(false);
    const c = await traveller(t.client());
    const other = new MemoryAiBudget(5);
    t.services.aiBudget = other;
    await c.post('/siraj/ask', { text: 'Why do Muslims make wudu before prayer?', ctx: { locale: 'en' } });
    setLogSilent(true);
    spy.mockRestore();
    const call = lines.map((l) => JSON.parse(l)).find((x) => x.event === 'ai.call');
    expect(call).toMatchObject({ purpose: 'siraj-answer', outcome: 'ok', usageIn: 10, usageOut: 5 });
    expect(lines.join('\n')).not.toMatch(/wudu before prayer/i);
    expect(lines.join('\n')).not.toMatch(/Prayer is at set times/);
  });
});

describe('AMANAH/NOUR multimodal adapters', () => {
  const { ai, calls } = fakeAI();
  const transcription: TranscriptionProvider = { id: 'remote', transcribe: async () => ({ ok: true, text: 'The Qur’an was revealed in Ramadan.' }) };
  let framesAvailable = true;
  const frames: FrameExtractor = {
    get id() {
      return framesAvailable ? ('ffmpeg' as const) : ('unavailable' as const);
    },
    extract: async () => (framesAvailable ? { ok: true, frames: [{ jpeg: Buffer.from([0xff, 0xd8, 0xff]), atSeconds: 0 }] } : { ok: false, reason: 'unavailable' }),
  };
  let t: Awaited<ReturnType<typeof createTestServer>>;
  beforeAll(async () => (t = await createTestServer({ ai, transcription, frames, aiBudget: new MemoryAiBudget(50) })), 60_000);
  afterAll(() => t.close());

  it('reuses the text of a file this person already had read — no second OCR call', async () => {
    const c = await traveller(t.client());
    const up1 = (await c.upload('post.png', 'image/png', PNG)).data;
    await c.post('/audits?wait=1', { tool: 'nour', inputKind: 'image', uploadId: up1.id });
    const ocr = calls.filter((x) => x.purpose === 'ocr').length;
    const up2 = (await c.upload('same.png', 'image/png', PNG)).data;
    const r = (await c.post('/audits?wait=1', { tool: 'nour', inputKind: 'image', uploadId: up2.id })).data;
    expect(calls.filter((x) => x.purpose === 'ocr').length).toBe(ocr);
    expect(r.stages.find((s: { stage: string }) => s.stage === 'extract').detail).toMatch(/reused/);
    expect(r.claims[0].verdict).toBe('mismatch');
  });

  it('video: transcript + on-screen text when both adapters exist, and says exactly what was not read otherwise', async () => {
    const c = await traveller(t.client());
    const up = (await c.upload('clip.mp4', 'video/mp4', MP4)).data;
    const both = (await c.post('/audits?wait=1', { tool: 'amanah', inputKind: 'video', uploadId: up.id })).data;
    expect(both.status).toBe('completed');
    expect(both.stages.find((s: { stage: string }) => s.stage === 'extract').detail).toMatch(/transcription; on-screen text from 1 frames/);
    expect(both.claims.map((x: { verdict: string }) => x.verdict).sort()).toEqual(['mismatch', 'supported']);

    framesAvailable = false;
    const up2 = (await c.upload('clip2.mp4', 'video/mp4', Uint8Array.from([...MP4, 1]))).data;
    const one = (await c.post('/audits?wait=1', { tool: 'amanah', inputKind: 'video', uploadId: up2.id })).data;
    expect(one.stages.find((s: { stage: string }) => s.stage === 'extract').detail).toMatch(/on-screen text not read \(frame OCR unavailable\)/);
    framesAvailable = true;
  });

  it('does not spend a model call on claim extraction for short texts', async () => {
    const c = await traveller(t.client());
    const before = calls.filter((x) => x.purpose === 'claim-extraction').length;
    await c.post('/audits?wait=1', { tool: 'nour', inputKind: 'text', text: 'Fasting in Ramadan is one of the five pillars of Islam.' });
    expect(calls.filter((x) => x.purpose === 'claim-extraction').length).toBe(before);
  });

  it('when the daily AI allowance is used up, reading an image is "unavailable", never guessed', async () => {
    t.services.aiBudget = new MemoryAiBudget(0);
    const c = await traveller(t.client());
    const up = (await c.upload('new.png', 'image/png', Uint8Array.from([...PNG, 7]))).data;
    const r = (await c.post('/audits?wait=1', { tool: 'nour', inputKind: 'image', uploadId: up.id })).data;
    expect(r).toMatchObject({ status: 'unavailable', error_code: 'ai_budget' });
    expect(r.claims).toHaveLength(0);
  });
});
