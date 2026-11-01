// @vitest-environment node
/**
 * Contract test for the Claude provider: the real Anthropic SDK builds and
 * sends each request, and parses realistic API responses, but `fetch` is local.
 * This proves the request shape and every failure path WITHOUT a live key —
 * it is not a substitute for a live call (see the final report).
 */
import { claudeProvider } from '../ai/claude.ts';

type Seen = { url: string; headers: Record<string, string>; body: Record<string, unknown> };

function fakeFetch(respond: (n: number) => Response | Promise<Response>) {
  const seen: Seen[] = [];
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((v, k) => (headers[k] = v));
    seen.push({ url: String(input), headers, body: JSON.parse(String(init?.body ?? '{}')) });
    return respond(seen.length);
  }) as typeof fetch;
  return { f, seen };
}

const message = (over: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      model: 'claude-opus-5',
      content: [{ type: 'text', text: JSON.stringify({ status: 'supported', answer: 'Wudu comes before prayer.', citations: ['k-wudu#E1'] }) }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 812, output_tokens: 64 },
      ...over,
    }),
    { status: 200, headers: { 'content-type': 'application/json', 'request-id': 'req_test' } },
  );
const error = (status: number, type: string) => new Response(JSON.stringify({ type: 'error', error: { type, message: type } }), { status, headers: { 'content-type': 'application/json' } });

const req = {
  purpose: 'siraj-answer' as const,
  system: 'Answer only from the evidence.',
  user: 'EVIDENCE: [k-wudu#E1] …\n\nQUESTION: How do I do wudu?',
  schema: { type: 'object', additionalProperties: false, properties: { answer: { type: 'string' } }, required: ['answer'] },
  maxTokens: 1500,
  effort: 'medium' as const,
};

describe('Claude provider ↔ Anthropic SDK contract (no network)', () => {
  it('sends the model, limits, cached system prompt, JSON schema and effort; parses the answer and usage', async () => {
    const { f, seen } = fakeFetch(() => message());
    const r = await claudeProvider('sk-test-not-a-real-key', 'claude-opus-5', 10_000, { fetch: f }).structured<{ answer: string }>(req);
    expect(r).toMatchObject({ ok: true, data: { answer: 'Wudu comes before prayer.' }, usage: { input: 812, output: 64 } });
    const [call] = seen;
    expect(call.url).toMatch(/^https:\/\/api\.anthropic\.com\/v1\/messages/);
    expect(call.headers['x-api-key']).toBe('sk-test-not-a-real-key');
    expect(call.headers['anthropic-version']).toBeTruthy();
    expect(call.headers['anthropic-beta']).toContain('server-side-fallback');
    expect(call.body).toMatchObject({
      model: 'claude-opus-5',
      max_tokens: 1500,
      system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: [{ type: 'text', text: req.user }] }],
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: req.schema } },
    });
    expect(call.body).not.toHaveProperty('thinking.budget_tokens'); // retired parameter
  });

  it('images and PDFs are sent as base64 content blocks', async () => {
    const { f, seen } = fakeFetch(() => message({ content: [{ type: 'text', text: '{"text":"On-screen words"}' }] }));
    await claudeProvider('k', 'claude-opus-5', 10_000, { fetch: f }).structured({
      ...req,
      user: [
        { type: 'image', mediaType: 'image/png', base64: 'iVBORw0KGgo=' },
        { type: 'document', mediaType: 'application/pdf', base64: 'JVBERi0=' },
        { type: 'text', text: 'Read the text.' },
      ],
    });
    expect((seen[0].body.messages as { content: unknown[] }[])[0].content).toEqual([
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'iVBORw0KGgo=' } },
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'JVBERi0=' } },
      { type: 'text', text: 'Read the text.' },
    ]);
  });

  it('a refusal, a cut-off answer or unparseable output is never used', async () => {
    const refusal = fakeFetch(() => message({ stop_reason: 'refusal', content: [] }));
    expect(await claudeProvider('k', 'm', 10_000, { fetch: refusal.f }).structured(req)).toMatchObject({ ok: false, reason: 'refused' });
    const cut = fakeFetch(() => message({ stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"answer":"Wudu is"}' }] }));
    expect(await claudeProvider('k', 'm', 10_000, { fetch: cut.f }).structured(req)).toMatchObject({ ok: false, reason: 'invalid_output' });
    const junk = fakeFetch(() => message({ content: [{ type: 'text', text: 'not json' }] }));
    expect(await claudeProvider('k', 'm', 10_000, { fetch: junk.f }).structured(req)).toMatchObject({ ok: false, reason: 'invalid_output' });
  });

  it('overload is "unavailable" and a 429 is "rate_limited" after one retry; bad requests are errors and a bad key is "auth", not retried', async () => {
    const overloaded = fakeFetch(() => error(529, 'overloaded_error'));
    expect(await claudeProvider('k', 'm', 10_000, { fetch: overloaded.f }).structured(req)).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(overloaded.seen).toHaveLength(2); // maxRetries: 1
    const limited = fakeFetch((n) => (n === 1 ? error(429, 'rate_limit_error') : message()));
    expect(await claudeProvider('k', 'm', 10_000, { fetch: limited.f }).structured(req)).toMatchObject({ ok: true }); // the one retry succeeded
    const stillLimited = fakeFetch(() => error(429, 'rate_limit_error'));
    expect(await claudeProvider('k', 'm', 10_000, { fetch: stillLimited.f }).structured(req)).toMatchObject({ ok: false, reason: 'rate_limited' });
    expect(stillLimited.seen).toHaveLength(2);
    const bad = fakeFetch(() => error(400, 'invalid_request_error'));
    expect(await claudeProvider('k', 'm', 10_000, { fetch: bad.f }).structured(req)).toMatchObject({ ok: false, reason: 'error', detail: '400' });
    expect(bad.seen).toHaveLength(1);
    const auth = fakeFetch(() => error(401, 'authentication_error'));
    expect(await claudeProvider('k', 'm', 10_000, { fetch: auth.f }).structured(req)).toMatchObject({ ok: false, reason: 'auth', detail: '401' });
  });

  it('a hung request times out instead of blocking the learner', async () => {
    const hang = (async (_: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))))) as typeof fetch;
    const started = Date.now();
    const r = await claudeProvider('k', 'm', 10_000, { fetch: hang }).structured({ ...req, timeoutMs: 150 });
    expect(r).toMatchObject({ ok: false, reason: 'timeout' });
    expect(Date.now() - started).toBeLessThan(8_000);
  });
});
