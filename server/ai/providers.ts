/**
 * Builds the AI router and the embedding provider from configuration.
 * Only providers whose credentials exist are created; the order is
 * SAJA_AI_PROVIDER_ORDER (default Gemini → Groq → OpenRouter → Mistral → Anthropic).
 */
import type { Config } from '../config.ts';
import type { AIProvider, EmbeddingProvider, ProviderId } from './types.ts';
import { PROVIDER_CAPABILITIES } from './models.ts';
import { AIProviderRouter, type RoutedProvider } from './router.ts';
import { claudeProvider } from './claude.ts';
import { EmbeddingError, geminiEmbeddings, geminiProvider } from './gemini.ts';
import { openAiCompatibleProvider } from './openaiCompatible.ts';
import { EMBED_DIM, localEmbeddings, voyageEmbeddings } from './embeddings.ts';
import type { FetchLike } from './wire.ts';
import { log } from '../lib/log.ts';

const KEY: Record<ProviderId, keyof Config> = { gemini: 'GEMINI_API_KEY', groq: 'GROQ_API_KEY', openrouter: 'OPENROUTER_API_KEY', mistral: 'MISTRAL_API_KEY', anthropic: 'ANTHROPIC_API_KEY' };

/** One adapter for one provider (also used by the doctor to test providers one by one). */
export function createProvider(config: Config, id: ProviderId, opts: { fetch?: FetchLike; timeoutMs?: number } = {}): AIProvider | null {
  const key = config[KEY[id]] as string | undefined;
  if (!key) return null;
  const p = config.ai.providers[id];
  const timeout = opts.timeoutMs ?? config.SAJA_AI_TIMEOUT_MS;
  if (id === 'gemini') return geminiProvider(key, p.model, p.capabilities, timeout, opts);
  if (id === 'anthropic') return claudeProvider(key, p.model, timeout, { fetch: opts.fetch, capabilities: p.capabilities });
  return openAiCompatibleProvider(id, key, p.model, p.capabilities, timeout, opts);
}

export function createAiRouter(config: Config, opts: { fetch?: FetchLike } = {}): AIProviderRouter {
  const routed: RoutedProvider[] = [];
  for (const id of config.ai.order) {
    const provider = createProvider(config, id, opts);
    if (!provider) continue;
    const spec = PROVIDER_CAPABILITIES[id];
    const p = config.ai.providers[id];
    routed.push({ provider, paid: p.paid, fast: spec.fast, strongLanguages: spec.strongLanguages, maxInlineBytes: spec.maxInlineBytes, sensitiveOk: config.ai.sensitive.includes(id), limits: p.limits });
  }
  return new AIProviderRouter(routed, { allowPaid: config.ai.allowPaid, defaultTimeoutMs: config.SAJA_AI_TIMEOUT_MS });
}

/**
 * Protects a remote embedder on a free tier:
 *  - query embeddings are cached (the same question costs one call);
 *  - after a 429 it stops calling until the provider's retry time has passed;
 *  - a local per-day / per-minute cap.
 * Failures throw: retrieval then falls back to keyword search, it never mixes vector models.
 */
export function guardedEmbeddings(inner: EmbeddingProvider, limits: { perDay: number; perMinute: number }, now: () => number = () => Date.now()): EmbeddingProvider {
  const cache = new Map<string, number[]>();
  let blockedUntil = 0;
  let day = '';
  let today = 0;
  let minute: number[] = [];
  return {
    id: inner.id,
    dimensions: inner.dimensions,
    async embed(texts, kind) {
      if (kind === 'query' && texts.length === 1 && cache.has(texts[0])) return [cache.get(texts[0])!];
      const t = now();
      if (blockedUntil > t) throw new EmbeddingError('rate_limited', 'cooling down after a provider limit');
      const d = new Date(t).toISOString().slice(0, 10);
      if (d !== day) [day, today] = [d, 0];
      minute = minute.filter((x) => t - x < 60_000);
      if (limits.perDay > 0 && today >= limits.perDay) throw new EmbeddingError('quota', 'daily embedding cap reached');
      if (limits.perMinute > 0 && minute.length >= limits.perMinute) throw new EmbeddingError('rate_limited', 'per-minute embedding cap reached');
      today += 1;
      minute.push(t);
      try {
        const vectors = await inner.embed(texts, kind);
        if (kind === 'query') {
          texts.forEach((x, i) => cache.set(x, vectors[i]));
          if (cache.size > 1000) cache.delete(cache.keys().next().value!);
        }
        return vectors;
      } catch (e) {
        if (e instanceof EmbeddingError && (e.reason === 'rate_limited' || e.reason === 'quota' || e.reason === 'auth')) {
          blockedUntil = t + (e.retryAfterMs ?? (e.reason === 'rate_limited' ? 60_000 : 3_600_000));
          log.warn('embeddings.blocked', { provider: inner.id, reason: e.reason, retryAfterMs: blockedUntil - t });
        }
        throw e;
      }
    },
  };
}

export function createEmbeddings(config: Config, opts: { fetch?: FetchLike } = {}): EmbeddingProvider {
  const e = config.ai.embeddings;
  if (e.provider === 'gemini') return guardedEmbeddings(geminiEmbeddings(config.GEMINI_API_KEY!, e.model!, EMBED_DIM, opts), e.limits);
  if (e.provider === 'voyage') return voyageEmbeddings(config.VOYAGE_API_KEY!, config.VOYAGE_MODEL, opts.fetch);
  return localEmbeddings;
}
