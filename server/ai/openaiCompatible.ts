/**
 * Adapters for providers that speak the OpenAI-style /chat/completions API:
 * Groq, OpenRouter and Mistral. Generic JSON mode is used (widest model
 * support) with the schema in the instructions, and the output is validated
 * locally — a reply that doesn't match the schema is never used.
 */
import type { AICapability, AIProvider, ContentBlock, ProviderId, StructuredRequest, StructuredResult } from './types.ts';
import { THINKING_HEADROOM } from './models.ts';
import { jsonInstruction, postJson, rateFromHeaders, structuredFrom, type FetchLike } from './wire.ts';

interface Flavor {
  id: Extract<ProviderId, 'groq' | 'openrouter' | 'mistral'>;
  url: string;
  /** Mistral documents image_url as a plain data-URL string; the others use { url }. */
  imageUrl: (dataUrl: string) => unknown;
  extraHeaders?: Record<string, string>;
}

const FLAVORS: Record<Flavor['id'], Flavor> = {
  groq: { id: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', imageUrl: (url) => ({ url }) },
  openrouter: { id: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions', imageUrl: (url) => ({ url }), extraHeaders: { 'X-Title': 'SAJA' } },
  mistral: { id: 'mistral', url: 'https://api.mistral.ai/v1/chat/completions', imageUrl: (url) => url },
};

function content(user: StructuredRequest['user'], flavor: Flavor): string | unknown[] {
  if (typeof user === 'string') return user;
  return user.map((b: ContentBlock) => {
    if (b.type === 'text') return { type: 'text', text: b.text };
    if (b.type === 'image') return { type: 'image_url', image_url: flavor.imageUrl(`data:${b.mediaType};base64,${b.base64}`) };
    // The router never sends other media here (capability check); fail loudly if it ever does.
    throw new Error(`${flavor.id} adapter cannot send ${b.type}`);
  });
}

type ChatResponse = {
  choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  model?: string;
  error?: { message?: string; code?: number | string };
};

export function openAiCompatibleProvider(id: Flavor['id'], apiKey: string, model: string, capabilities: Iterable<AICapability>, defaultTimeoutMs: number, opts: { fetch?: FetchLike } = {}): AIProvider {
  const flavor = FLAVORS[id];
  const f = opts.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  return {
    id,
    model,
    capabilities: new Set(capabilities),
    async structured<T>(req: StructuredRequest): Promise<StructuredResult<T>> {
      const r = await postJson(
        f,
        flavor.url,
        { authorization: `Bearer ${apiKey}`, ...flavor.extraHeaders },
        {
          model,
          messages: [
            { role: 'system', content: req.system + jsonInstruction(req.schema) },
            { role: 'user', content: content(req.user, flavor) },
          ],
          max_tokens: req.maxTokens + (THINKING_HEADROOM[id] ?? 0),
          temperature: 0.2,
          response_format: { type: 'json_object' },
        },
        req.timeoutMs ?? defaultTimeoutMs,
      );
      if (!r.ok) return { ok: false, reason: r.reason, detail: r.detail, rate: r.rate };
      const json = r.json as ChatResponse;
      // OpenRouter can report an upstream failure inside a 200.
      if (json.error) {
        const code = Number(json.error.code);
        return { ok: false, reason: code === 429 ? 'rate_limited' : code === 401 || code === 403 ? 'auth' : code === 402 ? 'quota' : code >= 500 ? 'unavailable' : 'error', detail: `upstream ${json.error.code ?? 'error'}` };
      }
      const choice = json.choices?.[0];
      if (!choice) return { ok: false, reason: 'invalid_output', detail: 'no choice' };
      if (choice.message?.refusal || choice.finish_reason === 'content_filter') return { ok: false, reason: 'refused' };
      if (choice.finish_reason === 'length') return { ok: false, reason: 'invalid_output', detail: 'cut off' };
      return structuredFrom<T>(choice.message?.content ?? '', req.schema, {
        model: json.model ?? model,
        provider: id,
        usage: { input: json.usage?.prompt_tokens ?? 0, output: json.usage?.completion_tokens ?? 0 },
        rate: rateFromHeaders(r.headers),
      });
    },
  };
}
