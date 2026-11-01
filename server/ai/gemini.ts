/**
 * Google Gemini adapter (REST, server-side only; the key never reaches the browser).
 *   - generateContent with JSON output constrained by a response schema, then
 *     validated locally like every other provider.
 *   - Inline images, PDFs, audio and video when the configured model accepts them.
 *   - batchEmbedContents for retrieval embeddings.
 */
import type { AICapability, AIProvider, ContentBlock, EmbeddingProvider, StructuredRequest, StructuredResult } from './types.ts';
import { EMBEDDING_MODELS, THINKING_HEADROOM } from './models.ts';
import { postJson, retryFromBody, structuredFrom, type FetchLike } from './wire.ts';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Gemini's responseSchema is an OpenAPI subset: upper-case types, no additionalProperties. */
export function toGeminiSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'additionalProperties' || k === '$schema') continue;
    if (k === 'type' && typeof v === 'string') out.type = v.toUpperCase();
    else if (k === 'properties' && v && typeof v === 'object') out.properties = Object.fromEntries(Object.entries(v as Record<string, Record<string, unknown>>).map(([p, s]) => [p, toGeminiSchema(s)]));
    else if (k === 'items' && v && typeof v === 'object') out.items = toGeminiSchema(v as Record<string, unknown>);
    else out[k] = v;
  }
  return out;
}

function parts(user: StructuredRequest['user']) {
  const blocks: ContentBlock[] = typeof user === 'string' ? [{ type: 'text', text: user }] : user;
  return blocks.map((b) => (b.type === 'text' ? { text: b.text } : { inlineData: { mimeType: b.mediaType, data: b.base64 } }));
}

const REFUSALS = new Set(['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'IMAGE_SAFETY', 'LANGUAGE']);

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  modelVersion?: string;
};

/** Maps Google error bodies: an invalid key arrives as HTTP 400 API_KEY_INVALID; per-day quota vs per-minute. */
function googleFailure(body: unknown): { auth: boolean; window?: 'day' | 'minute' } {
  const err = (body as { error?: { status?: string; message?: string; details?: { reason?: string; violations?: { quotaId?: string }[] }[] } } | null)?.error;
  const auth = !!err?.details?.some((d) => d.reason === 'API_KEY_INVALID') || /api key not valid/i.test(err?.message ?? '');
  const quotaId = err?.details?.flatMap((d) => d.violations ?? []).map((v) => v.quotaId ?? '').join(' ') ?? '';
  return { auth, window: /PerDay/i.test(quotaId) ? 'day' : /PerMinute/i.test(quotaId) ? 'minute' : undefined };
}

export function geminiProvider(apiKey: string, model: string, capabilities: Iterable<AICapability>, defaultTimeoutMs: number, opts: { fetch?: FetchLike } = {}): AIProvider {
  const f = opts.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  return {
    id: 'gemini',
    model,
    capabilities: new Set(capabilities),
    async structured<T>(req: StructuredRequest): Promise<StructuredResult<T>> {
      const r = await postJson(
        f,
        `${BASE}/models/${encodeURIComponent(model)}:generateContent`,
        { 'x-goog-api-key': apiKey },
        {
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: 'user', parts: parts(req.user) }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: toGeminiSchema(req.schema),
            maxOutputTokens: req.maxTokens + (THINKING_HEADROOM.gemini ?? 0),
            temperature: 0.2,
          },
        },
        req.timeoutMs ?? defaultTimeoutMs,
      );
      if (!r.ok) {
        const g = googleFailure(r.body);
        if (g.auth) return { ok: false, reason: 'auth', detail: r.detail };
        if (r.reason === 'rate_limited') return { ok: false, reason: 'rate_limited', detail: r.detail, rate: { ...r.rate, retryAfterMs: r.rate?.retryAfterMs ?? retryFromBody(r.body), window: g.window } };
        return { ok: false, reason: r.reason, detail: r.detail, rate: r.rate };
      }
      const json = r.json as GeminiResponse;
      if (json.promptFeedback?.blockReason) return { ok: false, reason: 'refused', detail: json.promptFeedback.blockReason };
      const cand = json.candidates?.[0];
      if (!cand) return { ok: false, reason: 'invalid_output', detail: 'no candidate' };
      if (cand.finishReason && REFUSALS.has(cand.finishReason)) return { ok: false, reason: 'refused', detail: cand.finishReason };
      // A cut-off answer is never used, even if it happens to parse.
      if (cand.finishReason === 'MAX_TOKENS') return { ok: false, reason: 'invalid_output', detail: 'cut off' };
      if (cand.finishReason && cand.finishReason !== 'STOP') return { ok: false, reason: 'invalid_output', detail: cand.finishReason };
      const text = (cand.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? '').join('');
      return structuredFrom<T>(text, req.schema, {
        model: json.modelVersion ?? model,
        provider: 'gemini',
        usage: { input: json.usageMetadata?.promptTokenCount ?? 0, output: json.usageMetadata?.candidatesTokenCount ?? 0 },
      });
    },
  };
}

/** Error thrown by embedding providers: carries the failure class (never content or keys). */
export class EmbeddingError extends Error {
  constructor(
    public reason: 'rate_limited' | 'auth' | 'unavailable' | 'timeout' | 'quota' | 'error',
    detail: string,
    public retryAfterMs?: number,
  ) {
    super(`Embeddings ${reason}: ${detail}`);
  }
}

function unit(v: number[]): number[] {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

export function geminiEmbeddings(apiKey: string, model: string, dimensions: number, opts: { fetch?: FetchLike; timeoutMs?: number } = {}): EmbeddingProvider {
  const f = opts.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const spec = EMBEDDING_MODELS.gemini;
  return {
    id: `gemini:${model}:${dimensions}`,
    dimensions,
    async embed(texts, kind) {
      const out: number[][] = [];
      for (let i = 0; i < texts.length; i += spec.batch) {
        const batch = texts.slice(i, i + spec.batch);
        const r = await postJson(
          f,
          `${BASE}/models/${encodeURIComponent(model)}:batchEmbedContents`,
          { 'x-goog-api-key': apiKey },
          {
            requests: batch.map((text) => ({
              model: `models/${model}`,
              content: { parts: [{ text }] },
              outputDimensionality: dimensions,
              ...(spec.supportsTaskType(model) ? { taskType: kind === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT' } : {}),
            })),
          },
          opts.timeoutMs ?? 20_000,
        );
        if (!r.ok) {
          const reason = googleFailure(r.body).auth ? 'auth' : r.reason === 'refused' || r.reason === 'invalid_output' || r.reason === 'capability' ? 'error' : r.reason;
          throw new EmbeddingError(reason, r.detail ?? reason, r.rate?.retryAfterMs ?? (r.reason === 'rate_limited' ? retryFromBody(r.body) : undefined));
        }
        const vectors = ((r.json as { embeddings?: { values?: number[] }[] }).embeddings ?? []).map((e) => e.values ?? []);
        if (vectors.length !== batch.length || vectors.some((v) => v.length !== dimensions)) throw new EmbeddingError('error', `unexpected shape (${vectors.length} × ${vectors[0]?.length ?? 0})`);
        // Truncated (non-default size) Gemini vectors must be re-normalised before cosine comparison.
        out.push(...vectors.map(unit));
      }
      return out;
    },
  };
}
