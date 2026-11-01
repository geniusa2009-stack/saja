/**
 * Anthropic provider (Claude, via the Anthropic SDK). OPTIONAL: SAJA runs without
 * it, and the router only uses it when ANTHROPIC_API_KEY is set and paid usage is
 * allowed (SAJA_AI_ALLOW_PAID=true). Adaptive thinking is the model default;
 * effort controls cost. Refusals are handled explicitly and server-side
 * fallbacks are enabled.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { AICapability, AIProvider, StructuredRequest, StructuredResult } from './types.ts';
import { PROVIDER_CAPABILITIES } from './models.ts';
import { parseDuration, schemaError } from './wire.ts';
import { log } from '../lib/log.ts';

/** `fetch` is injectable so the request/response contract can be tested against the real SDK without a network. */
export function claudeProvider(
  apiKey: string,
  model: string,
  defaultTimeoutMs: number,
  opts: { fetch?: typeof fetch; capabilities?: Iterable<AICapability> } = {},
): AIProvider {
  const client = new Anthropic({ apiKey, maxRetries: 1, ...(opts.fetch ? { fetch: opts.fetch } : {}) });
  return {
    id: 'anthropic',
    model,
    capabilities: new Set(opts.capabilities ?? PROVIDER_CAPABILITIES.anthropic.capabilities),
    async structured<T>(req: StructuredRequest): Promise<StructuredResult<T>> {
      const content: Anthropic.Beta.BetaContentBlockParam[] =
        typeof req.user === 'string'
          ? [{ type: 'text', text: req.user }]
          : req.user.map((b): Anthropic.Beta.BetaContentBlockParam =>
              b.type === 'text'
                ? { type: 'text', text: b.text }
                : b.type === 'document'
                  ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b.base64 } }
                  : b.type === 'image'
                    ? { type: 'image', source: { type: 'base64', media_type: b.mediaType as 'image/png', data: b.base64 } }
                    : // Audio/video are not declared for this provider, so the router never sends them here.
                      (() => {
                        throw new Error(`anthropic adapter cannot send ${b.type}`);
                      })(),
            );
      try {
        const response = await client.beta.messages.create(
          {
            model,
            max_tokens: req.maxTokens,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
            messages: [{ role: 'user', content }],
            output_config: { effort: req.effort, format: { type: 'json_schema', schema: req.schema } },
          },
          { timeout: req.timeoutMs ?? defaultTimeoutMs },
        );
        if (response.stop_reason === 'refusal') return { ok: false, reason: 'refused' };
        // A cut-off answer is never used, even if it happens to parse.
        if (response.stop_reason === 'max_tokens') return { ok: false, reason: 'invalid_output' };
        const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
        let data: T;
        try {
          data = JSON.parse(text) as T;
        } catch {
          return { ok: false, reason: 'invalid_output' };
        }
        const invalid = schemaError(req.schema, data);
        if (invalid) return { ok: false, reason: 'invalid_output', detail: `schema: ${invalid}` };
        return { ok: true, data, model: response.model, provider: 'anthropic', usage: { input: response.usage.input_tokens, output: response.usage.output_tokens } };
      } catch (e) {
        if (e instanceof Anthropic.APIConnectionTimeoutError) return { ok: false, reason: 'timeout' };
        if (e instanceof Anthropic.RateLimitError) {
          log.warn('ai.rate_limited', { provider: 'anthropic', status: e.status });
          return { ok: false, reason: 'rate_limited', detail: String(e.status), rate: { retryAfterMs: parseDuration(e.headers?.get('retry-after')) } };
        }
        if (e instanceof Anthropic.InternalServerError) {
          log.warn('ai.unavailable', { provider: 'anthropic', status: e.status });
          return { ok: false, reason: 'unavailable', detail: String(e.status) };
        }
        if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return { ok: false, reason: 'auth', detail: String(e.status) };
        if (e instanceof Anthropic.APIError) {
          log.error('ai.error', { provider: 'anthropic', status: e.status });
          return { ok: false, reason: 'error', detail: String(e.status) };
        }
        log.error('ai.error', { provider: 'anthropic', error: (e as Error)?.name });
        return { ok: false, reason: 'error' };
      }
    },
  };
}
