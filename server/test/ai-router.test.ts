// @vitest-environment node
/**
 * Provider-agnostic AI: the real adapters (Gemini, Groq, OpenRouter, Mistral) and
 * the real router, with each provider's HTTP API faked at the network layer.
 * Proves request/response contracts, deterministic routing, fallback, 429
 * handling, timeouts, bad keys, capability checks, free-tier caps, privacy and
 * that NO provider failure ever becomes a trusted answer. Not a substitute for
 * a live call: see `npm run saja -- doctor` and `npm run test:live`.
 */
import { loadConfig } from '../config.ts';
import { createAiRouter, createEmbeddings, guardedEmbeddings } from '../ai/providers.ts';
import { AIProviderRouter, requiredCapabilities } from '../ai/router.ts';
import { geminiEmbeddings, toGeminiSchema } from '../ai/gemini.ts';
import { lexicalEmbed } from '../ai/embeddings.ts';
import { parseDuration, schemaError } from '../ai/wire.ts';
import type { AIProvider, StructuredRequest } from '../ai/types.ts';
import { reindexStaleChunks } from '../modules/knowledge/reindex.ts';
import { resetSirajCaches } from '../modules/siraj/pipeline.ts';
import { createTestServer, traveller } from './harness.ts';
import { setLogSilent } from '../lib/log.ts';

type Prov = 'gemini' | 'groq' | 'openrouter' | 'mistral' | 'gemini-embed';
type Behaviour = 'ok' | 'rate' | 'rate-day' | 'auth' | 'down' | 'timeout' | 'network' | 'junk' | 'schema' | 'refuse' | 'cut' | 'upstream-429';
type Call = { provider: Prov; url: string; headers: Record<string, string>; body: any };

const providerOf = (url: string): Prov =>
  url.includes('batchEmbedContents') ? 'gemini-embed' : url.includes('generativelanguage') ? 'gemini' : url.includes('groq.com') ? 'groq' : url.includes('openrouter.ai') ? 'openrouter' : 'mistral';

/** The text a provider received (Gemini parts or chat messages) — used by the fake to cite real evidence IDs. */
const promptOf = (c: Call): string =>
  c.provider === 'gemini' ? c.body.contents[0].parts.map((p: { text?: string }) => p.text ?? '').join(' ') : JSON.stringify(c.body.messages[1].content);

/** Answers like the model would: cite the first evidence ID it was given, in the question's language. */
function defaultAnswer(c: Call): unknown {
  const prompt = promptOf(c);
  const system = c.provider === 'gemini' ? c.body.systemInstruction.parts[0].text : c.body.messages[0].content;
  if (/connectivity check/.test(system)) return { ok: true };
  if (/Siraj/.test(system)) {
    const id = prompt.match(/\[([^\]\s]+#E1)\]/)?.[1];
    return { status: 'supported', answer: /Arabic/.test(system) ? 'الوضوء يكون قبل الصلاة كما في الدليل.' : 'Wudu comes before prayer, as the evidence says.', citations: id ? [id] : [] };
  }
  if (/Transcribe the speech/.test(system)) return { speech: 'Fasting in Ramadan is one of the five pillars of Islam.', on_screen: '' };
  if (/Transcribe all readable text/.test(system)) return { text: 'Every child must fast from the age of seven.' };
  if (/qualified Islamic scholar/.test(system)) return { question: 'How should I make up missed fasts?', topic: 'fasting', missing_context: [] };
  return { claims: [] };
}

function wire(opts: { script?: Partial<Record<Prov, Behaviour | ((n: number) => Behaviour)>>; answer?: (c: Call) => unknown } = {}) {
  const calls: Call[] = [];
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((v, k) => (headers[k] = v));
    const call: Call = { provider: providerOf(url), url, headers, body: JSON.parse(String(init?.body ?? '{}')) };
    calls.push(call);
    const n = calls.filter((c) => c.provider === call.provider).length;
    const s = opts.script?.[call.provider];
    const b: Behaviour = (typeof s === 'function' ? s(n) : s) ?? 'ok';
    const json = (x: unknown, status = 200, h: Record<string, string> = {}) => new Response(JSON.stringify(x), { status, headers: { 'content-type': 'application/json', ...h } });
    if (b === 'network') throw new TypeError('fetch failed');
    if (b === 'timeout')
      return new Promise<Response>((_r, reject) => init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'TimeoutError' }))));
    if (b === 'rate') return json({ error: { code: 429, message: 'Rate limit reached. Please retry in 20s.', details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '20s' }] } }, 429, { 'retry-after': '20' });
    if (b === 'rate-day')
      return json({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded', details: [{ '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }] } }, 429);
    if (b === 'auth')
      return call.provider.startsWith('gemini')
        ? json({ error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } }, 400)
        : json({ error: { message: 'Invalid API Key' } }, 401);
    if (b === 'down') return json({ error: { message: 'overloaded' } }, 503);
    if (call.provider === 'gemini-embed') return json({ embeddings: call.body.requests.map((r: { content: { parts: { text: string }[] } }) => ({ values: lexicalEmbed(r.content.parts[0].text) })) });
    const data = b === 'junk' ? 'Sure! Here is my answer.' : JSON.stringify(b === 'schema' ? { status: 'supported', answer: 42 } : (opts.answer ?? defaultAnswer)(call));
    if (call.provider === 'gemini') {
      if (b === 'refuse') return json({ promptFeedback: { blockReason: 'SAFETY' } });
      return json({ candidates: [{ content: { parts: [{ text: data }] }, finishReason: b === 'cut' ? 'MAX_TOKENS' : 'STOP' }], usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 30 }, modelVersion: 'gemini-3.5-flash-lite' });
    }
    if (b === 'upstream-429') return json({ error: { code: 429, message: 'upstream rate limited' } });
    if (b === 'refuse') return json({ choices: [{ message: { content: null, refusal: 'I cannot help with that.' }, finish_reason: 'stop' }] });
    return json(
      { model: `${call.provider}-model`, choices: [{ message: { content: data }, finish_reason: b === 'cut' ? 'length' : 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 20 } },
      200,
      call.provider === 'groq' ? { 'x-ratelimit-remaining-requests': '999', 'x-ratelimit-reset-requests': '1m26.4s' } : {},
    );
  }) as typeof fetch;
  return { f, calls, providers: () => calls.map((c) => c.provider) };
}

const ALL = { GEMINI_API_KEY: 'AIza-test-key-000000', GROQ_API_KEY: 'gsk_test-key-000000', OPENROUTER_API_KEY: 'sk-or-test-key-000000', MISTRAL_API_KEY: 'mistral-test-key-000000' };
const cfg = (env: Record<string, string> = {}) => loadConfig({ SAJA_ENV: 'test', TRUST_PROXY: 'true', ...env } as NodeJS.ProcessEnv);
const SCHEMA = { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean' } }, required: ['ok'] };
const ping = (over: Partial<StructuredRequest> = {}): StructuredRequest => ({ system: 'This is a connectivity check. Reply with {"ok": true}.', user: 'Health check.', schema: SCHEMA, maxTokens: 64, effort: 'low', purpose: 'health-check', ...over });
const IMAGE = { type: 'image' as const, mediaType: 'image/png', base64: 'iVBORw0KGgo=' };

beforeAll(() => setLogSilent(true));
afterAll(() => setLogSilent(false));

describe('capability registry and configuration', () => {
  it('only providers with credentials exist; default priority is Gemini → Groq → OpenRouter → Mistral; Anthropic is optional and paid', () => {
    const none = cfg();
    expect(none.modes).toMatchObject({ ai: 'demo', embeddings: 'local-lexical', ocr: 'unavailable', transcription: 'unavailable', frameOcr: 'unavailable' });
    expect(createAiRouter(none).state()).toBe('offline');

    const c = cfg(ALL);
    expect(c.ai.order).toEqual(['gemini', 'groq', 'openrouter', 'mistral', 'anthropic']);
    expect(c.modes).toMatchObject({ ai: 'provider', embeddings: 'gemini', ocr: 'provider-vision', transcription: 'provider-audio', frameOcr: 'provider-video' });
    expect(c.ai.providers.gemini).toMatchObject({ configured: true, model: 'gemini-3.5-flash-lite', usable: true });
    expect(c.ai.providers.anthropic).toMatchObject({ configured: false, paid: true, usable: false });
    expect(c.ai.providers.openrouter).toMatchObject({ model: 'openrouter/free', paid: false });
  });

  it('models, order, capabilities, limits and sensitive providers come from the environment', () => {
    const c = cfg({
      ...ALL,
      GROQ_MODEL: 'meta-llama/llama-4-scout-17b-16e-instruct',
      OPENROUTER_MODEL: 'some/paid-model',
      SAJA_AI_PROVIDER_ORDER: 'groq, mistral',
      SAJA_AI_CAPABILITIES: 'groq=text,structured_output,vision',
      SAJA_AI_LIMITS: 'gemini=20/5, gemini-embeddings=100/10',
      SAJA_AI_SENSITIVE_PROVIDERS: 'mistral',
    });
    expect(c.ai.order).toEqual(['groq', 'mistral', 'gemini', 'openrouter', 'anthropic']); // unlisted keys are never silently ignored
    expect(c.ai.providers.groq).toMatchObject({ model: 'meta-llama/llama-4-scout-17b-16e-instruct', capabilities: ['text', 'structured_output', 'vision'] });
    expect(c.ai.providers.openrouter).toMatchObject({ paid: true, usable: false }); // not a :free model → not used on a zero budget
    expect(c.warnings.join(' ')).toMatch(/OPENROUTER_MODEL "some\/paid-model" is not a free model/);
    expect(c.ai.providers.gemini.limits).toEqual({ perDay: 20, perMinute: 5 });
    expect(c.ai.embeddings.limits).toEqual({ perDay: 100, perMinute: 10 });
    expect(c.ai.sensitive).toEqual(['mistral']);
  });

  it('required capabilities come from the request content, not from the caller', () => {
    expect([...requiredCapabilities(ping())]).toEqual(['text', 'structured_output']);
    expect([...requiredCapabilities(ping({ user: [IMAGE, { type: 'document', mediaType: 'application/pdf', base64: 'JVBE' }, { type: 'audio', mediaType: 'audio/wav', base64: 'UklG' }] }))]).toEqual([
      'text',
      'structured_output',
      'vision',
      'pdf',
      'audio',
    ]);
  });
});

describe('wire contracts (each provider’s real request shape)', () => {
  it('Gemini: key in a header (never the URL), system instruction, schema-constrained JSON, inline media, thinking headroom', async () => {
    const w = wire();
    const r = await createAiRouter(cfg({ GEMINI_API_KEY: ALL.GEMINI_API_KEY }), { fetch: w.f }).structured<{ ok: boolean }>(ping({ user: [IMAGE, { type: 'text', text: 'Health check.' }] }));
    expect(r).toMatchObject({ ok: true, data: { ok: true }, provider: 'gemini', model: 'gemini-3.5-flash-lite', usage: { input: 120, output: 30 }, fallback: false });
    const [c] = w.calls;
    expect(c.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    expect(c.url).not.toContain('key=');
    expect(c.headers['x-goog-api-key']).toBe(ALL.GEMINI_API_KEY);
    expect(c.body).toMatchObject({
      systemInstruction: { parts: [{ text: expect.stringContaining('connectivity check') }] },
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/png', data: 'iVBORw0KGgo=' } }, { text: 'Health check.' }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties: { ok: { type: 'BOOLEAN' } }, required: ['ok'] }, maxOutputTokens: 64 + 2048 },
    });
    expect(toGeminiSchema(SCHEMA)).not.toHaveProperty('additionalProperties');
  });

  it('Groq / OpenRouter / Mistral: bearer key, JSON mode with the schema in the instructions, provider-specific image format', async () => {
    const w = wire();
    const c = cfg({ GROQ_API_KEY: ALL.GROQ_API_KEY, OPENROUTER_API_KEY: ALL.OPENROUTER_API_KEY, MISTRAL_API_KEY: ALL.MISTRAL_API_KEY, SAJA_AI_PROVIDER_ORDER: 'groq,openrouter,mistral' });
    const router = createAiRouter(c, { fetch: w.f });
    expect(await router.structured(ping())).toMatchObject({ ok: true, provider: 'groq' });
    const [g] = w.calls;
    expect(g.url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(g.headers.authorization).toBe(`Bearer ${ALL.GROQ_API_KEY}`);
    expect(g.body).toMatchObject({ model: 'llama-3.3-70b-versatile', response_format: { type: 'json_object' }, messages: [{ role: 'system' }, { role: 'user', content: 'Health check.' }] });
    expect(g.body.messages[0].content).toContain(JSON.stringify(SCHEMA));
    // Only Mistral declares vision among these three → the image goes there, as a data-URL string.
    expect(await router.structured(ping({ user: [IMAGE, { type: 'text', text: 'x' }] }))).toMatchObject({ ok: true, provider: 'mistral' });
    const m = w.calls.at(-1)!;
    expect(m.url).toBe('https://api.mistral.ai/v1/chat/completions');
    expect(m.body.messages[1].content[0]).toEqual({ type: 'image_url', image_url: 'data:image/png;base64,iVBORw0KGgo=' });
    expect(w.providers()).toEqual(['groq', 'mistral']);
  });

  it('wire helpers: retry durations, schema validation', () => {
    expect(parseDuration('20')).toBe(20_000);
    expect(parseDuration('2m59.56s')).toBe(179_560);
    expect(parseDuration('37s')).toBe(37_000);
    expect(schemaError(SCHEMA, { ok: true })).toBeNull();
    expect(schemaError(SCHEMA, { ok: 'yes' })).toMatch(/expected boolean/);
    expect(schemaError(SCHEMA, {})).toMatch(/missing/);
  });
});

describe('routing and fallback', () => {
  it('provider selection is deterministic: the first configured provider in priority order', async () => {
    for (let i = 0; i < 3; i++) {
      const w = wire();
      expect(await createAiRouter(cfg(ALL), { fetch: w.f }).structured(ping())).toMatchObject({ ok: true, provider: 'gemini' });
      expect(w.providers()).toEqual(['gemini']);
    }
  });

  it('unavailable (5xx), network failure and invalid output each fall through to the next provider', async () => {
    for (const b of ['down', 'network', 'junk', 'schema', 'cut'] as Behaviour[]) {
      const w = wire({ script: { gemini: b } });
      const router = createAiRouter(cfg(ALL), { fetch: w.f });
      const r = await router.structured(ping());
      expect(r).toMatchObject({ ok: true, provider: 'groq', fallback: true });
      expect(w.providers()).toEqual(['gemini', 'groq']);
      expect(router.state()).toBe('fallback');
    }
  });

  it('429: respects the retry time, routes to the next provider, and tries the first again only after it', async () => {
    let now = Date.parse('2026-10-02T10:00:00Z');
    const w = wire({ script: { gemini: (n) => (n === 1 ? 'rate' : 'ok') } });
    const c = cfg(ALL);
    const base = createAiRouter(c, { fetch: w.f });
    // Same providers, controllable clock.
    const router = new AIProviderRouter((base as unknown as { providers: never[] }).providers, { now: () => now, defaultTimeoutMs: 45_000 });
    expect(await router.structured(ping())).toMatchObject({ ok: true, provider: 'groq', attempts: [{ provider: 'gemini', outcome: 'rate_limited' }, { provider: 'groq', outcome: 'ok' }] });
    expect(router.usage().find((u) => u.provider === 'gemini')).toMatchObject({ blockedReason: 'rate limited by provider', rate: { retryAfterMs: 20_000 } });
    now += 10_000;
    expect(await router.structured(ping({ user: 'second' }))).toMatchObject({ ok: true, provider: 'groq' });
    expect(w.providers().filter((p) => p === 'gemini')).toHaveLength(1); // not retried during the cool-down
    now += 11_000;
    expect(await router.structured(ping({ user: 'third' }))).toMatchObject({ ok: true, provider: 'gemini' });
    expect(router.state()).toBe('available');
  });

  it('a per-day 429 keeps the provider out much longer than a per-minute one', async () => {
    const now = Date.parse('2026-10-02T10:00:00Z');
    const w = wire({ script: { gemini: 'rate-day' } });
    const base = createAiRouter(cfg(ALL), { fetch: w.f });
    const router = new AIProviderRouter((base as unknown as { providers: never[] }).providers, { now: () => now });
    await router.structured(ping());
    const g = router.usage().find((u) => u.provider === 'gemini')!;
    expect(g.blockedReason).toBe('provider daily limit reached');
    expect(Date.parse(g.blockedUntil!) - now).toBe(3_600_000);
  });

  it('timeout: a hung provider is abandoned and the next one answers', async () => {
    const w = wire({ script: { gemini: 'timeout' } });
    const started = Date.now();
    const r = await createAiRouter(cfg(ALL), { fetch: w.f }).structured(ping({ timeoutMs: 200, routing: { latencyBudgetMs: 10_000 } }));
    expect(r).toMatchObject({ ok: true, provider: 'groq', attempts: [{ provider: 'gemini', outcome: 'timeout' }, { provider: 'groq', outcome: 'ok' }] });
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it('invalid key: classified as auth, the provider is set aside, the next one answers', async () => {
    const w = wire({ script: { gemini: 'auth', groq: 'auth' } });
    const router = createAiRouter(cfg(ALL), { fetch: w.f });
    expect(await router.structured(ping())).toMatchObject({ ok: true, provider: 'openrouter', attempts: [{ outcome: 'auth' }, { outcome: 'auth' }, { outcome: 'ok' }] });
    expect(router.usage().filter((u) => u.blockedReason === 'key rejected').map((u) => u.provider)).toEqual(['gemini', 'groq']);
    await router.structured(ping({ user: 'again' }));
    expect(w.providers().filter((p) => p === 'gemini')).toHaveLength(1);
  });

  it('OpenRouter reporting an upstream 429 inside a 200 is treated as rate limited', async () => {
    const w = wire({ script: { openrouter: 'upstream-429' } });
    const r = await createAiRouter(cfg({ OPENROUTER_API_KEY: ALL.OPENROUTER_API_KEY, MISTRAL_API_KEY: ALL.MISTRAL_API_KEY }), { fetch: w.f }).structured(ping());
    expect(r).toMatchObject({ ok: true, provider: 'mistral', attempts: [{ provider: 'openrouter', outcome: 'rate_limited' }, { outcome: 'ok' }] });
  });

  it('a refusal is final — never shopped around to another provider', async () => {
    const w = wire({ script: { gemini: 'refuse' } });
    expect(await createAiRouter(cfg(ALL), { fetch: w.f }).structured(ping())).toMatchObject({ ok: false, reason: 'refused' });
    expect(w.providers()).toEqual(['gemini']);
  });

  it('capability mismatch: an image is never sent to a text-only provider', async () => {
    const w = wire();
    const router = createAiRouter(cfg({ GROQ_API_KEY: ALL.GROQ_API_KEY, OPENROUTER_API_KEY: ALL.OPENROUTER_API_KEY }), { fetch: w.f });
    expect(router.capabilities.has('vision')).toBe(false);
    const r = await router.structured(ping({ user: [IMAGE] }));
    expect(r).toMatchObject({ ok: false, reason: 'capability' });
    expect(r.attempts?.map((a) => a.note)).toEqual(['lacks vision', 'lacks vision']);
    expect(w.calls).toHaveLength(0);
    expect(router.state()).toBe('unverified'); // a mismatch is not an outage
  });

  it('at most 3 providers are tried per request (cost control); the next request reaches the remaining one', async () => {
    const w = wire({ script: { gemini: 'rate', groq: 'rate', openrouter: 'rate' } });
    const router = createAiRouter(cfg(ALL), { fetch: w.f });
    expect(await router.structured(ping())).toMatchObject({ ok: false, reason: 'rate_limited' });
    expect(w.calls).toHaveLength(3);
    expect(router.state()).toBe('unavailable');
    expect(await router.structured(ping({ user: 'x' }))).toMatchObject({ ok: true, provider: 'mistral', fallback: true });
    expect(router.state()).toBe('fallback');
  });

  it('all providers unavailable: { ok: false }, state "unavailable", capabilities withdrawn, no further calls while cooling down', async () => {
    const w = wire({ script: { gemini: 'rate', groq: 'rate', openrouter: 'rate', mistral: 'rate' } });
    const router = createAiRouter(cfg(ALL), { fetch: w.f });
    await router.structured(ping());
    await router.structured(ping({ user: 'x' }));
    expect(w.calls).toHaveLength(4);
    expect(router.state()).toBe('unavailable');
    expect(router.capabilities.size).toBe(0);
    expect(await router.structured(ping({ user: 'y' }))).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(w.calls).toHaveLength(4);
  });

  it('fast short tasks prefer Groq; Arabic answers prefer a provider strong in Arabic', async () => {
    const w = wire();
    const router = createAiRouter(cfg({ ...ALL, SAJA_AI_PROVIDER_ORDER: 'groq,gemini,openrouter,mistral' }), { fetch: w.f });
    expect(await router.structured(ping({ routing: { language: 'ar' } }))).toMatchObject({ provider: 'gemini' });
    expect(await router.structured(ping({ user: 'en', routing: { language: 'en' } }))).toMatchObject({ provider: 'groq' });
    const g = createAiRouter(cfg(ALL), { fetch: w.f });
    expect(await g.structured(ping({ user: 'fast', routing: { latency: 'fast' } }))).toMatchObject({ provider: 'groq', fallback: false });
    // "fast" never pulls a media task to a text-only provider.
    expect(await g.structured(ping({ user: [IMAGE], routing: { latency: 'fast' } }))).toMatchObject({ provider: 'gemini' });
  });

  it('privacy: sensitive tasks never go to providers outside SAJA_AI_SENSITIVE_PROVIDERS (OpenRouter by default)', async () => {
    const w = wire();
    const router = createAiRouter(cfg({ OPENROUTER_API_KEY: ALL.OPENROUTER_API_KEY }), { fetch: w.f });
    expect(await router.structured(ping({ routing: { privacy: 'sensitive' } }))).toMatchObject({ ok: false, reason: 'capability' });
    expect(w.calls).toHaveLength(0);
  });

  it('cost: paid providers are only used when explicitly allowed', async () => {
    const anthropic: AIProvider = { id: 'anthropic', model: 'x', capabilities: new Set(['text', 'structured_output']), structured: async () => ({ ok: true, data: { ok: true } as never, model: 'x', usage: { input: 1, output: 1 } }) };
    const routed = { provider: anthropic, paid: true, fast: false, strongLanguages: [] as ('en' | 'ar')[], maxInlineBytes: 1e9, sensitiveOk: true, limits: { perDay: 0, perMinute: 0 } };
    expect(await new AIProviderRouter([routed]).structured(ping())).toMatchObject({ ok: false, attempts: [{ note: 'paid' }] });
    expect(new AIProviderRouter([routed]).state()).toBe('offline');
    expect(await new AIProviderRouter([routed], { allowPaid: true }).structured(ping())).toMatchObject({ ok: true });
    expect(await new AIProviderRouter([routed], { allowPaid: true }).structured(ping({ routing: { cost: 'free' } }))).toMatchObject({ ok: false });
  });

  it('free-tier safety: SAJA’s own daily cap stops calls before the provider has to; usage is tracked without content', async () => {
    const w = wire();
    const router = createAiRouter(cfg({ GEMINI_API_KEY: ALL.GEMINI_API_KEY, SAJA_AI_LIMITS: 'gemini=2/0' }), { fetch: w.f });
    await router.structured(ping({ user: 'a' }));
    await router.structured(ping({ user: 'b' }));
    expect(await router.structured(ping({ user: 'c' }))).toMatchObject({ ok: false, reason: 'quota', attempts: [{ note: 'daily cap reached' }] });
    expect(w.calls).toHaveLength(2);
    expect(router.state()).toBe('unavailable');
    const [u] = router.usage();
    expect(u).toMatchObject({ provider: 'gemini', requests: 2, inputTokens: 240, outputTokens: 60, dailyLimit: 2, lastOutcome: 'ok' });
    expect(JSON.stringify(u)).not.toMatch(/Health check/);
  });

  it('provider rate headers are kept (Groq remaining requests / reset)', async () => {
    const w = wire();
    const router = createAiRouter(cfg({ GROQ_API_KEY: ALL.GROQ_API_KEY }), { fetch: w.f });
    await router.structured(ping());
    expect(router.usage()[0].rate).toMatchObject({ remainingRequests: 999, resetMs: 86_400 });
  });

  it('identical requests in flight share one provider call (deduplication)', async () => {
    const w = wire();
    const router = createAiRouter(cfg({ GEMINI_API_KEY: ALL.GEMINI_API_KEY }), { fetch: w.f });
    const [a, b] = await Promise.all([router.structured(ping()), router.structured(ping())]);
    expect(a).toEqual(b);
    expect(w.calls).toHaveLength(1);
  });

  it('state is never "available" before a real request has succeeded', async () => {
    const w = wire({ script: { gemini: (n) => (n === 1 ? 'down' : 'ok') } });
    const router = createAiRouter(cfg({ GEMINI_API_KEY: ALL.GEMINI_API_KEY }), { fetch: w.f });
    expect(router.state()).toBe('unverified');
    await router.structured(ping());
    expect(router.state()).toBe('unavailable');
    await router.structured(ping({ user: 'retry' }));
    expect(router.state()).toBe('available');
  });
});

describe('Siraj through the provider router', () => {
  let t: Awaited<ReturnType<typeof createTestServer>>;
  let w: ReturnType<typeof wire>;
  let answer: ((c: Call) => unknown) | undefined;
  let script: Partial<Record<Prov, Behaviour>> = {};
  beforeAll(async () => {
    w = wire({ script: new Proxy({}, { get: (_t, p: string) => script[p as Prov] }) as never, answer: (c) => (answer ?? defaultAnswer)(c) });
    t = await createTestServer({ ai: createAiRouter(cfg(ALL), { fetch: w.f }) });
  }, 60_000);
  afterAll(() => t.close());
  beforeEach(() => {
    resetSirajCaches();
    answer = undefined;
    script = {};
  });
  const ask = async (text: string, locale: 'en' | 'ar' = 'en') => (await (await traveller(t.client())).post('/siraj/ask', { text, ctx: { locale } })).data;

  it('English: retrieval → evidence → model (Gemini) → citation validation → answer', async () => {
    const r = await ask('How do I perform wudu?');
    expect(r).toMatchObject({ status: 'supported', generatedBy: 'ai', knowledgeId: 'k-wudu' });
    expect(r.evidence.map((e: { id: string }) => e.id)).toEqual(['k-wudu#E1']);
    const call = w.calls.at(-1)!;
    expect(call.provider).toBe('gemini');
    expect(promptOf(call)).toContain('[k-wudu#E1]');
    expect(call.body.systemInstruction.parts[0].text).toMatch(/Never invent references/);
    expect(call.body.generationConfig.maxOutputTokens).toBe(900 + 2048);
  });

  it('Arabic: the answer is requested in Arabic and served in Arabic', async () => {
    const r = await ask('ما هي أركان الإسلام؟', 'ar');
    expect(r.generatedBy).toBe('ai');
    expect(r.text).toMatch(/[؀-ۿ]/);
    expect(w.calls.at(-1)!.body.systemInstruction.parts[0].text).toMatch(/Reply in Arabic/);
  });

  it('the model cannot invent citations, references or quotes: the answer becomes uncertain', async () => {
    answer = () => ({ status: 'supported', answer: 'This is in Sahih al-Bukhari 9999.', citations: ['bukhari#9999'] });
    const r = await ask('How do I perform wudu?');
    expect(r).toMatchObject({ status: 'uncertain', generatedBy: 'rules', evidence: [], route: { kind: 'scholar' } });
    answer = (c) => ({ status: 'supported', answer: 'As Qur’an 2:255 says, wash first.', citations: [promptOf(c).match(/\[([^\]\s]+#E1)\]/)![1]] });
    expect(await ask('How do I perform wudu before prayer?')).toMatchObject({ status: 'uncertain' });
  });

  it('uncertain answers stay uncertain and offer a scholar', async () => {
    answer = () => ({ status: 'uncertain', answer: 'The evidence does not say.', citations: [] });
    expect(await ask('How do I perform wudu?')).toMatchObject({ status: 'uncertain', route: { kind: 'scholar' } });
  });

  it('personal rulings never reach a model: scholar route, deterministic', async () => {
    const before = w.calls.length;
    const r = await ask('My husband said divorce three times, am I divorced?');
    expect(r).toMatchObject({ status: 'requires-human-review', generatedBy: 'rules', route: { kind: 'scholar' } });
    expect(w.calls.length).toBe(before);
  });

  it('a primary failure falls back to the next provider; still grounded and cited', async () => {
    script = { gemini: 'down' };
    const r = await ask('How do I perform wudu?');
    expect(r).toMatchObject({ status: 'supported', generatedBy: 'ai' });
    expect(w.calls.slice(-2).map((c) => c.provider)).toEqual(['gemini', 'groq']);
  });

  it('structured-output failure everywhere → the curated extractive answer, never the broken output', async () => {
    script = { gemini: 'schema', groq: 'junk', openrouter: 'schema', mistral: 'junk' };
    const r = await ask('How do I perform wudu?');
    expect(r).toMatchObject({ generatedBy: 'extractive', knowledgeId: 'k-wudu' });
  });

  it('all providers unavailable → the curated answer, and the status says AI is temporarily unavailable', async () => {
    script = { gemini: 'rate', groq: 'rate', openrouter: 'rate', mistral: 'rate' };
    const r = await ask('How do I perform wudu?');
    expect(r).toMatchObject({ status: 'supported', generatedBy: 'extractive', knowledgeId: 'k-wudu' });
    resetSirajCaches();
    expect(await ask('How do I perform wudu before prayer?')).toMatchObject({ generatedBy: 'extractive' }); // the 4th provider, also rate-limited
    expect((await t.client().get('/system/status')).data.ai).toEqual({ state: 'unavailable' });
    expect((await t.client().get('/system/health')).data.ai).toEqual({ state: 'unavailable' });
    // While everything cools down, no further provider is even called.
    const before = w.calls.length;
    resetSirajCaches();
    expect(await ask('What are the five pillars of Islam?')).toMatchObject({ generatedBy: 'extractive' });
    expect(w.calls.length).toBe(before);
  });

  it('the public status names no provider; admins see per-provider usage', async () => {
    const status = JSON.stringify((await t.client().get('/system/status')).data);
    expect(status).not.toMatch(/gemini|groq|openrouter|mistral|anthropic/i);
  });
});

describe('scholar boundary and multimodal AMANAH/NOUR through the router', () => {
  const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 2]);
  const WAV = Uint8Array.from([...Buffer.from('RIFF'), 36, 0, 0, 0, ...Buffer.from('WAVEfmt '), 16, 0, 0, 0, 1, 0, 1, 0]);
  // One database for the block; each test swaps in the router (providers) it needs.
  let t: Awaited<ReturnType<typeof createTestServer>>;
  beforeAll(async () => (t = await createTestServer()), 60_000);
  afterAll(() => t.close());
  const use = (env: Record<string, string>) => {
    const w = wire();
    t.services.ai = createAiRouter(cfg(env), { fetch: w.f });
    return w;
  };

  it('question organising uses only sensitive-allowed providers and never answers; the queue logic is unchanged', async () => {
    const w = use({ OPENROUTER_API_KEY: ALL.OPENROUTER_API_KEY, GROQ_API_KEY: ALL.GROQ_API_KEY });
    const c = await traveller(t.client());
    const r = (await c.post('/scholar/organize', { question: 'I missed some fasts last Ramadan, what should I do? call me 0501234567' })).data;
    expect(r).toMatchObject({ kind: 'ai-assistance', by: 'ai' });
    expect(w.providers()).toEqual(['groq']); // OpenRouter is not allowed for sensitive tasks by default
    expect(JSON.stringify(w.calls[0].body)).not.toContain('0501234567'); // redacted before any provider sees it
  });

  it('image OCR goes to a vision provider; with text-only providers it is honestly unavailable', async () => {
    const w = use(ALL);
    const c = await traveller(t.client());
    const up = (await c.upload('post.png', 'image/png', PNG)).data;
    const r = (await c.post('/audits?wait=1', { tool: 'nour', inputKind: 'image', uploadId: up.id })).data;
    expect(r.stages.find((s: { stage: string }) => s.stage === 'extract').detail).toBe('ai-vision');
    expect(r.claims[0].verdict).toBe('mismatch'); // the verdict comes from curated rules, not the model
    expect(w.calls.find((x) => x.provider === 'gemini')!.body.contents[0].parts[0].inlineData.mimeType).toBe('image/png');

    use({ GROQ_API_KEY: ALL.GROQ_API_KEY });
    const c2 = await traveller(t.client());
    const up2 = (await c2.upload('post.png', 'image/png', PNG)).data;
    expect((await c2.post('/audits?wait=1', { tool: 'nour', inputKind: 'image', uploadId: up2.id })).data).toMatchObject({ status: 'unavailable', error_code: 'ocr_unavailable' });
  });

  it('audio without a transcription adapter: Gemini’s native audio input transcribes it', async () => {
    const w = use({ GEMINI_API_KEY: ALL.GEMINI_API_KEY });
    const c = await traveller(t.client());
    const up = (await c.upload('note.wav', 'audio/wav', WAV)).data;
    const r = (await c.post('/audits?wait=1', { tool: 'amanah', inputKind: 'audio', uploadId: up.id })).data;
    expect(r.status).toBe('completed');
    expect(r.stages.find((s: { stage: string }) => s.stage === 'extract').detail).toBe('ai-transcription');
    expect(r.claims[0].verdict).toBe('supported');
    expect(w.calls.at(0)!.body.contents[0].parts[0].inlineData.mimeType).toBe('audio/wav');
  });
});

describe('embeddings: Gemini instead of Voyage, re-indexing on change, never mixing models', () => {
  let t: Awaited<ReturnType<typeof createTestServer>>;
  beforeAll(async () => (t = await createTestServer()), 60_000);
  afterAll(() => t.close());

  it('Gemini embedding contract: header key, task type, 256 dimensions, unit vectors, batches of ≤100', async () => {
    const w = wire();
    const e = geminiEmbeddings(ALL.GEMINI_API_KEY, 'gemini-embedding-001', 256, { fetch: w.f });
    expect(e.id).toBe('gemini:gemini-embedding-001:256');
    const v = await e.embed(Array.from({ length: 150 }, (_, i) => `text ${i}`), 'document');
    expect(v).toHaveLength(150);
    expect(Math.hypot(...v[0])).toBeCloseTo(1, 5);
    expect(w.calls.map((c) => c.body.requests.length)).toEqual([100, 50]);
    expect(w.calls[0].url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents');
    expect(w.calls[0].headers['x-goog-api-key']).toBe(ALL.GEMINI_API_KEY);
    expect(w.calls[0].body.requests[0]).toMatchObject({ model: 'models/gemini-embedding-001', taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: 256 });
  });

  it('switching to Gemini re-embeds the library once; a rate-limited embedder degrades search to keywords, never to stale vectors', async () => {
    const [{ n: total }] = await t.services.db.query<{ n: number }>('select count(*)::int as n from knowledge_chunks');
    let mode: Behaviour = 'ok';
    const w = wire({ script: { 'gemini-embed': () => mode } });
    const gemini = createEmbeddings(cfg({ GEMINI_API_KEY: ALL.GEMINI_API_KEY }), { fetch: w.f });
    expect(gemini.id).toBe('gemini:gemini-embedding-001:256');
    t.services.embeddings = gemini;

    // Before re-indexing: no chunk carries the new model's vectors → health says so, search uses keywords only.
    expect((await t.client().get('/system/health')).data).toMatchObject({ ok: false, staleEmbeddings: total });
    const c = await traveller(t.client());
    expect((await c.post('/siraj/ask', { text: 'How do I perform wudu?', ctx: { locale: 'en' } })).data).toMatchObject({ knowledgeId: 'k-wudu' });

    const fromReindex = w.calls.length;
    expect(await reindexStaleChunks(t.services)).toBe(total);
    expect(await reindexStaleChunks(t.services)).toBe(0);
    const reindexCalls = w.calls.slice(fromReindex);
    expect((await t.client().get('/system/health')).data).toMatchObject({ ok: true, staleEmbeddings: 0 });
    const [{ models }] = await t.services.db.query<{ models: string[] }>('select array_agg(distinct embedding_model) as models from knowledge_chunks');
    expect(models).toEqual(['gemini:gemini-embedding-001:256']);
    expect(reindexCalls.length).toBe(Math.ceil(total / 64));
    expect(reindexCalls.every((x) => x.body.requests.every((r: { taskType: string }) => r.taskType === 'RETRIEVAL_DOCUMENT'))).toBe(true);

    resetSirajCaches();
    expect((await c.post('/siraj/ask', { text: 'Why do we pray five times a day?', ctx: { locale: 'en' } })).data).toMatchObject({ knowledgeId: 'k-five-prayers' });
    expect(w.calls.at(-1)!.body.requests[0].taskType).toBe('RETRIEVAL_QUERY');

    // 429 on the query embedding: keyword search still finds the curated answer, and the guard stops calling.
    mode = 'rate';
    resetSirajCaches();
    const before = w.calls.length;
    expect((await c.post('/siraj/ask', { text: 'What are the five pillars of Islam?', ctx: { locale: 'en' } })).data).toMatchObject({ knowledgeId: 'k-pillars' });
    // During the cool-down the embedder is not called again.
    expect((await c.post('/siraj/ask', { text: 'How do I perform wudu?', ctx: { locale: 'en' } })).data).toMatchObject({ knowledgeId: 'k-wudu' });
    expect(w.calls.length).toBe(before + 1);
  });

  it('a repeated query is embedded once (cache), and the local cap is respected', async () => {
    const w = wire();
    const e = guardedEmbeddings(geminiEmbeddings(ALL.GEMINI_API_KEY, 'gemini-embedding-001', 256, { fetch: w.f }), { perDay: 2, perMinute: 0 });
    await e.embed(['wudu'], 'query');
    await e.embed(['wudu'], 'query');
    expect(w.calls).toHaveLength(1);
    await e.embed(['salah'], 'query');
    await expect(e.embed(['zakat'], 'query')).rejects.toThrow(/daily embedding cap/);
    expect(w.calls).toHaveLength(2);
  });
});
