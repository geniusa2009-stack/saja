// @vitest-environment node
/**
 * `saja doctor` never turns a missing or failing service into PASS, and never prints secrets.
 * (Live providers are faked at the network layer here; the command itself calls the real ones.)
 */
import { loadConfig } from '../config.ts';
import { formatDoctor, runDoctor, type CheckResult } from '../doctor.ts';

const SERVICES = [
  'Gemini',
  'Groq',
  'OpenRouter',
  'Mistral',
  'Anthropic',
  'Embeddings (retrieval)',
  'Siraj answers',
  'OCR (images/PDFs)',
  'Transcription (audio/video)',
  'Video frames (ffmpeg)',
  'Push notifications',
  'Email (SMTP)',
  'Managed Postgres',
];
const statusOf = (r: CheckResult[]) => Object.fromEntries(r.map((x) => [x.service, x.status]));
const SECRETS = ['AIza-secret', 'gsk_secret', 'sk-or-secret', 'mistral-secret', 'sk-ant-secret', 'pa-secret', 'tr-secret', 'user:pass'];

const configured = async (extra: Record<string, string> = {}) => {
  const webpush = (await import('web-push')).default;
  const v = webpush.generateVAPIDKeys();
  return loadConfig({
    SAJA_ENV: 'test',
    GEMINI_API_KEY: 'AIza-secret-value-123456',
    GROQ_API_KEY: 'gsk_secret-value-123456',
    OPENROUTER_API_KEY: 'sk-or-secret-value-123456',
    MISTRAL_API_KEY: 'mistral-secret-value-123456',
    ANTHROPIC_API_KEY: 'sk-ant-secret-value-123456',
    SAJA_AI_ALLOW_PAID: 'true',
    TRANSCRIPTION_API_URL: 'https://transcribe.example.test/v1/audio/transcriptions',
    TRANSCRIPTION_API_KEY: 'tr-secret-value-123456',
    FFMPEG_PATH: '/usr/bin/ffmpeg',
    VAPID_PUBLIC_KEY: v.publicKey,
    VAPID_PRIVATE_KEY: v.privateKey,
    SMTP_URL: 'smtps://user:pass@smtp.example.test:465',
    DATABASE_URL: 'postgres://user:pass@db.example.test/saja',
    ...extra,
  } as NodeJS.ProcessEnv);
};

/** Realistic success bodies for each provider's wire format. */
const fetchOk = async (url: RequestInfo | URL) => {
  const u = String(url);
  const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } });
  if (u.includes('batchEmbedContents')) return json({ embeddings: [0, 1].map(() => ({ values: Array(256).fill(0.1) })) });
  if (u.includes('generativelanguage.googleapis.com')) return json({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 }, modelVersion: 'gemini-3.5-flash-lite' });
  if (u.includes('anthropic.com'))
    return json({ id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5', content: [{ type: 'text', text: '{"ok":true}' }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 5, output_tokens: 3 } });
  if (u.includes('/chat/completions')) return json({ model: 'm', choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }], usage: { prompt_tokens: 5, completion_tokens: 3 } });
  return new Response('{"text":""}', { status: 200 });
};
const infraOk = { run: async () => ({ stdout: 'ffmpeg version 7.1 Copyright (c) 2000-2024\n' }), smtpVerify: async () => undefined, postgres: async () => ({ vector: '0.8.0' }) };

describe('service doctor', () => {
  it('with nothing configured, every provider and service is NOT CONFIGURED — never PASS, and no call is made', async () => {
    const r = await runDoctor(loadConfig({ SAJA_ENV: 'test' } as NodeJS.ProcessEnv), {
      fetch: () => Promise.reject(new Error('no network call should happen')),
    });
    expect(r.map((x) => x.service)).toEqual(SERVICES);
    expect(r.every((x) => x.status === 'NOT CONFIGURED')).toBe(true);
    expect(r.find((x) => x.service === 'Gemini')!.detail).toBe('GEMINI_API_KEY unset.');
    expect(r.find((x) => x.service === 'Siraj answers')!.detail).toMatch(/curated text \(offline mode\)/);
  });

  it('configured but failing providers and services are FAIL, with the likely cause and no secret in the output', async () => {
    const config = await configured();
    const r = await runDoctor(
      { ...config, VAPID_PRIVATE_KEY: 'not-a-key' },
      {
        fetch: async () => new Response(JSON.stringify({ error: { message: 'invalid api key AIza-secret-value-123456' } }), { status: 401 }),
        run: () => Promise.reject(new Error('spawn ENOENT')),
        smtpVerify: () => Promise.reject(new Error('Invalid login: 535 Authentication failed')),
        postgres: () => Promise.reject(new Error('connect ECONNREFUSED')),
      },
    );
    const live = r.filter((x) => x.status !== 'NOT TESTED');
    expect(live.every((x) => x.status === 'FAIL')).toBe(true);
    // What can't be proven by a check is labelled as such, never PASS.
    expect(r.filter((x) => x.status === 'NOT TESTED').map((x) => x.service)).toEqual(['Gemini · pdf, video', 'Anthropic · pdf']);
    expect(r.find((x) => x.service === 'Gemini · chat')!.detail).toMatch(/auth .*key is wrong/);
    const text = JSON.stringify(r) + formatDoctor(r, config);
    for (const secret of SECRETS) expect(text).not.toContain(secret);
  });

  it('PASS only after a successful live call to each provider; derived features name their route', async () => {
    const config = await configured();
    const r = await runDoctor(config, { fetch: fetchOk as typeof fetch, ...infraOk });
    expect(statusOf(r)).toEqual({
      'Gemini · chat': 'PASS',
      'Gemini · vision': 'PASS',
      'Gemini · audio': 'PASS',
      'Gemini · pdf, video': 'NOT TESTED', // declared, but needs a real document/video
      'Groq · chat': 'PASS',
      'OpenRouter · chat': 'PASS',
      'Mistral · chat': 'PASS',
      'Mistral · vision': 'PASS',
      'Anthropic · chat': 'PASS',
      'Anthropic · vision': 'PASS',
      'Anthropic · pdf': 'NOT TESTED',
      'Embeddings (retrieval)': 'PASS',
      'Siraj answers': 'PASS',
      'OCR (images/PDFs)': 'PASS',
      'Transcription (audio/video)': 'PASS',
      'Video frames (ffmpeg)': 'PASS',
      'Push notifications': 'NOT TESTED', // keys are valid, but only a real subscribed device proves delivery
      'Email (SMTP)': 'PASS',
      'Managed Postgres': 'PASS',
    });
    expect(r.find((x) => x.service === 'Siraj answers')!.detail).toBe('Route: Gemini → Groq → OpenRouter → Mistral → Anthropic → curated offline answers.');
    expect(r.find((x) => x.service === 'Embeddings (retrieval)')!.detail).toMatch(/gemini gemini-embedding-001: 2 × 256-dim/);

    const report = formatDoctor(r, config);
    expect(report).toContain('Gemini\n  configured:   YES\n  model:        gemini-3.5-flash-lite\n  capabilities: text, structured_output, vision, pdf, audio, video, embeddings\n  chat:         PASS');
    for (const secret of SECRETS) expect(report).not.toContain(secret);

    // A database without pgvector is a failure, not a pass.
    const noVector = await runDoctor(config, { fetch: fetchOk as typeof fetch, ...infraOk, postgres: async () => ({ vector: null }) });
    expect(statusOf(noVector)['Managed Postgres']).toBe('FAIL');
  });

  it('a 429 is FAIL with "rate limit" as the cause; other providers still carry Siraj', async () => {
    const config = await configured();
    const r = await runDoctor(config, {
      fetch: (async (url: RequestInfo | URL) =>
        String(url).includes(':generateContent')
          ? new Response(JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded. Please retry in 30s.' } }), { status: 429 })
          : fetchOk(url)) as typeof fetch,
      ...infraOk,
    });
    expect(statusOf(r)['Gemini · chat']).toBe('FAIL');
    expect(r.find((x) => x.service === 'Gemini · chat')!.detail).toMatch(/rate_limited.*free-tier rate limit/);
    expect(r.find((x) => x.service === 'Siraj answers')).toMatchObject({ status: 'PASS', detail: 'Route: Groq → OpenRouter → Mistral → Anthropic → curated offline answers.' });
  });

  it('Anthropic alone, without SAJA_AI_ALLOW_PAID, is tested but never routed to (zero-cost default)', async () => {
    const config = loadConfig({ SAJA_ENV: 'test', ANTHROPIC_API_KEY: 'sk-ant-secret-value-123456' } as NodeJS.ProcessEnv);
    expect(config.modes.ai).toBe('demo');
    expect(config.warnings.join(' ')).toMatch(/SAJA_AI_ALLOW_PAID/);
    const r = await runDoctor(config, { fetch: fetchOk as typeof fetch });
    expect(statusOf(r)['Anthropic · chat']).toBe('PASS');
    expect(r.find((x) => x.service === 'Anthropic · chat')!.detail).toMatch(/Not used for routing: paid/);
    expect(r.find((x) => x.service === 'Siraj answers')).toMatchObject({ status: 'NOT CONFIGURED' });
  });
});
