// @vitest-environment node
/**
 * Retrieval → evidence → answer → citation check, evaluated on a fixed table of
 * questions in English and Arabic: known answers, unknown questions, ambiguous
 * ones, personal rulings and questions that aren't about Islam at all.
 *
 * Runs with the embedder this environment has (local lexical in CI; Voyage when
 * VOYAGE_API_KEY is set) and, in the second block, with a model that tries to
 * hallucinate. Unknown questions must never receive a confident answer.
 */
import { createTestServer, traveller } from './harness.ts';
import type { AIProvider, StructuredRequest } from '../ai/types.ts';
import { resetSirajCaches } from '../modules/siraj/pipeline.ts';

type Expect = { status: string | string[]; knowledge?: string; scholar?: boolean; ref?: string };
const CASES: [string, 'en' | 'ar', string, Expect][] = [
  // Known answers — grounded in the right document, with its sources.
  ['known', 'en', 'How do I perform wudu?', { status: 'supported', knowledge: 'k-wudu', ref: "Qur'an 5:6" }],
  ['known', 'ar', 'كيف أتوضأ؟', { status: 'supported', knowledge: 'k-wudu', ref: "Qur'an 5:6" }],
  ['known', 'en', 'What are the five pillars of Islam?', { status: 'supported', knowledge: 'k-pillars' }],
  ['known', 'ar', 'ما هي أركان الإسلام؟', { status: 'supported', knowledge: 'k-pillars' }],
  ['known', 'ar', 'كيف أصلي؟', { status: 'supported', knowledge: 'k-salah-steps' }],
  ['known', 'ar', 'ماذا أقول قبل النوم؟', { status: 'supported', knowledge: 'k-sleep-dua' }],
  ['known', 'en', 'Why do Muslims fast?', { status: 'supported', knowledge: 'k-fasting' }],
  ['known', 'ar', 'ما معنى السلام عليكم؟', { status: 'supported', knowledge: 'k-salam' }],
  // Scholarly difference is shown as such, never flattened into certainty.
  ['difference', 'en', 'When is Laylat al-Qadr?', { status: 'context-needed', knowledge: 'k-laylat-al-qadr' }],
  ['difference', 'ar', 'متى ليلة القدر؟', { status: 'context-needed', knowledge: 'k-laylat-al-qadr' }],
  // Unknown religious questions — no evidence, no invention, a scholar is offered.
  ['unknown', 'en', 'What is the ruling on staking cryptocurrency?', { status: 'uncertain', scholar: true }],
  ['unknown', 'ar', 'ما حكم تعدين العملات الرقمية؟', { status: 'uncertain', scholar: true }],
  ['unknown', 'en', 'What colour was the Prophet’s camel saddle?', { status: 'uncertain', scholar: true }],
  ['unknown', 'en', 'How many tents were there at Badr?', { status: 'uncertain', scholar: true }],
  ['unknown', 'ar', 'كم كان عدد الخيام في غزوة بدر؟', { status: 'uncertain', scholar: true }],
  // Ambiguous — too little to go on: not answered with confidence.
  ['ambiguous', 'en', 'Is it allowed?', { status: 'uncertain' }],
  ['ambiguous', 'en', 'What about the night?', { status: 'uncertain' }],
  ['ambiguous', 'ar', 'هل يجوز؟', { status: 'uncertain' }],
  // Personal rulings — always a human, never the model.
  ['personal', 'en', 'My husband said divorce three times in anger, am I divorced?', { status: 'requires-human-review', scholar: true }],
  ['personal', 'ar', 'هل يجوز لي أن أفطر في رمضان لأنني مريضة؟', { status: 'requires-human-review', scholar: true }],
  ['personal', 'en', 'Is my job at a bank haram?', { status: 'requires-human-review', scholar: true }],
  // Historical — answered from the history entries, with their sources.
  ['historical', 'en', 'When did the Hijra happen?', { status: 'supported', knowledge: 'k-hijra' }],
  ['historical', 'en', 'Where did the Prophet migrate to from Makkah?', { status: 'supported', knowledge: 'k-hijra' }],
  ['historical', 'ar', 'متى كانت الهجرة إلى المدينة؟', { status: 'supported', knowledge: 'k-hijra' }],
  ['historical', 'ar', 'ما أول ما نزل من القرآن؟', { status: 'supported', knowledge: 'k-first-revelation', ref: "Qur'an 96:1" }],
  // Source-sensitive — a named source is shown when SAJA has it; an unconfirmed narration is never confirmed.
  ['source', 'en', 'Which verse of the Quran describes wudu?', { status: 'supported', knowledge: 'k-wudu', ref: "Qur'an 5:6" }],
  ['source', 'ar', 'ما الآية التي تذكر الوضوء؟', { status: 'supported', knowledge: 'k-wudu', ref: "Qur'an 5:6" }],
  ['attribution', 'en', 'Is there a hadith that fasting the first day of Ramadan erases all sins?', { status: 'context-needed', scholar: true }],
  ['attribution', 'ar', 'هل يوجد حديث أن صيام أول يوم من رمضان يمحو كل الذنوب؟', { status: 'context-needed', scholar: true }],
  ['attribution', 'en', 'Did the Prophet say that smiling is charity?', { status: 'context-needed', scholar: true }],
  ['unknown', 'en', 'Quote the exact Arabic text of Sahih Bukhari 1', { status: 'uncertain', scholar: true }],
  // Not about Islam — said plainly, no sources, no scholar.
  ['irrelevant', 'en', 'What is the best pizza topping?', { status: 'uncertain', scholar: false }],
  ['irrelevant', 'en', 'Who won the football world cup in 2018?', { status: 'uncertain', scholar: false }],
  ['irrelevant', 'ar', 'ما أفضل هاتف ذكي؟', { status: 'uncertain', scholar: false }],
];

function check(kind: string, r: { status: string; knowledgeId?: string; evidence: { ref: string; id: string }[]; route?: { kind: string }; text: string }, e: Expect, locale: 'en' | 'ar') {
  const statuses = Array.isArray(e.status) ? e.status : [e.status];
  expect(statuses, `${kind}: status`).toContain(r.status);
  if (e.knowledge) expect(r.knowledgeId).toBe(e.knowledge);
  if (e.ref) expect(r.evidence.map((x) => x.ref)).toContain(e.ref);
  if (r.status === 'uncertain' || r.status === 'requires-human-review') expect(r.evidence).toEqual([]); // nothing to cite → nothing cited
  if (e.scholar !== undefined) expect(r.route?.kind === 'scholar').toBe(e.scholar);
  if (locale === 'ar') expect(r.text).toMatch(/[؀-ۿ]/); // answered in the language asked
  if (kind === 'attribution') expect(r.text).toMatch(/can’t confirm|لا تستطيع مصادر سجى تأكيد/);
}

describe('RAG evaluation — curated answers (no model)', () => {
  let t: Awaited<ReturnType<typeof createTestServer>>;
  beforeAll(async () => (t = await createTestServer()), 60_000);
  afterAll(() => t.close());

  it.each(CASES)('%s · %s · %s', async (kind, locale, text, e) => {
    const c = await traveller(t.client());
    const r = (await c.post('/siraj/ask', { text, ctx: { locale } })).data;
    check(kind, r, e, locale);
    if (r.status === 'supported' || r.status === 'context-needed') {
      expect(r.generatedBy).toBe(kind === 'attribution' ? 'rules' : 'extractive'); // attribution answers are never generated
      expect(r.evidence.length).toBeGreaterThan(0);
      expect(r.demoContent).toBe(true); // nothing is published yet, and the answer says so
    }
  });
});

describe('RAG evaluation — with a model that tries to hallucinate', () => {
  let t: Awaited<ReturnType<typeof createTestServer>>;
  const calls: StructuredRequest[] = [];
  // The "model" always claims certainty and names a made-up hadith, while citing one real source it was given.
  const liar: AIProvider = {
    id: 'anthropic',
    model: 'test-model',
    capabilities: new Set(['text', 'structured_output']),
    async structured<T>(req: StructuredRequest) {
      calls.push(req);
      const given = [...(typeof req.user === 'string' ? req.user : JSON.stringify(req.user)).matchAll(/\[([a-z0-9-]+#E\d+)\]/g)].map((m) => m[1]);
      return { ok: true as const, data: { status: 'supported', answer: 'This is certain. See Sahih al-Bukhari 99999.', citations: ['bukhari#99999', ...given.slice(0, 1)] } as T, model: 'fake', usage: { input: 1, output: 1 } };
    },
  };
  beforeAll(async () => (t = await createTestServer({ ai: liar })), 60_000);
  afterAll(() => t.close());
  beforeEach(() => resetSirajCaches());

  it.each(CASES)('%s · %s · %s', async (kind, locale, text, e) => {
    const c = await traveller(t.client());
    const before = calls.length;
    const r = (await c.post('/siraj/ask', { text, ctx: { locale } })).data;
    // Invented citations never reach the learner.
    expect(r.evidence.every((x: { id: string }) => !x.id.includes('99999'))).toBe(true);
    expect(r.text).not.toMatch(/99999/); // …not in the list of sources, and not in the prose either
    if (['unknown', 'ambiguous', 'personal', 'irrelevant', 'attribution'].includes(kind)) {
      // No evidence → the model is never asked, and nothing confident comes back.
      expect(calls.length).toBe(before);
      check(kind, r, e, locale);
    } else {
      expect(calls.length).toBe(before + 1);
      expect(r.knowledgeId).toBe(e.knowledge);
      // The answer named a hadith SAJA never supplied: it is not shown, and the status drops to "uncertain".
      expect(r.status).toBe('uncertain');
      expect(r.route.kind).toBe('scholar');
      expect(r.evidence).toEqual([]); // an uncertain answer cites nothing
    }
  });
});

describe('RAG evaluation — each way a model can get sources wrong', () => {
  let t: Awaited<ReturnType<typeof createTestServer>>;
  let next: unknown;
  const model: AIProvider = {
    id: 'anthropic',
    model: 'test-model',
    capabilities: new Set(['text', 'structured_output']),
    async structured<T>() {
      return { ok: true as const, data: next as T, model: 'fake', usage: { input: 1, output: 1 } };
    },
  };
  beforeAll(async () => (t = await createTestServer({ ai: model })), 60_000);
  afterAll(() => t.close());
  beforeEach(() => resetSirajCaches());
  const ask = async (text: string, locale: 'en' | 'ar' = 'en') => (await (await traveller(t.client())).post('/siraj/ask', { text, ctx: { locale } })).data;

  it('an honest answer keeps exactly the evidence it cited', async () => {
    next = { status: 'supported', answer: 'Wudu washes the face, arms, head and feet, as in Qur’an 5:6.', citations: ['k-wudu#E1'] };
    const r = await ask('How do I perform wudu?');
    expect(r).toMatchObject({ status: 'supported', generatedBy: 'ai' });
    expect(r.evidence.map((x: { id: string; ref: string }) => [x.id, x.ref])).toEqual([['k-wudu#E1', "Qur'an 5:6"]]);
  });

  it('invented citation id: dropped, and with nothing real left the answer is uncertain', async () => {
    next = { status: 'supported', answer: 'Wudu is required before prayer.', citations: ['k-wudu#E99', 'bukhari#1'] };
    expect(await ask('How do I perform wudu?')).toMatchObject({ status: 'uncertain', evidence: [] });
  });

  it('wrong citation: the prose names a verse that is not the supplied source', async () => {
    next = { status: 'supported', answer: 'Qur’an 2:183 commands washing the face and arms before prayer.', citations: ['k-wudu#E1'] };
    const r = await ask('How do I perform wudu?');
    expect(r).toMatchObject({ status: 'uncertain', evidence: [] });
    expect(r.text).not.toMatch(/2:183/);
  });

  it('citation in prose (Arabic, Arabic-Indic digits): a hadith that was never supplied', async () => {
    next = { status: 'supported', answer: 'الوضوء غسل الوجه واليدين كما في صحيح البخاري ٩٩٩٩٩.', citations: ['k-wudu#E1'] };
    const r = await ask('كيف أتوضأ؟', 'ar');
    expect(r).toMatchObject({ status: 'uncertain', evidence: [] });
    expect(r.text).not.toMatch(/٩٩٩٩٩/);
  });

  it('insufficient evidence: when the model says the sources don’t answer it, so does Siraj', async () => {
    next = { status: 'uncertain', answer: 'The evidence does not say.', citations: [] };
    expect(await ask('How do I perform wudu?')).toMatchObject({ status: 'uncertain', evidence: [], route: { kind: 'scholar' } });
  });

  it('unsupported confidence: "supported" with no citation at all becomes uncertain', async () => {
    next = { status: 'supported', answer: 'Definitely, wudu has eleven obligatory steps.', citations: [] };
    expect(await ask('How do I perform wudu?')).toMatchObject({ status: 'uncertain', evidence: [] });
  });
});
