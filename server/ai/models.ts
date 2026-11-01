/**
 * Provider capability registry and model configuration — the ONE place where
 * provider facts live. Model IDs and free-tier allowances change; every value
 * here can be overridden from the environment (see .env.example), and
 * `npm run saja -- doctor` checks the configured model with a real request.
 *
 * Nothing here assumes a free tier will exist forever: limits are SAJA's own
 * safety caps (it stops calling a provider when one is reached), not promises
 * about what a provider allows.
 */
import type { AICapability, ProviderId } from './types.ts';

export interface ProviderSpec {
  id: ProviderId;
  label: string;
  keyVar: string;
  modelVar: string;
  defaultModel: string;
  /** Declared capabilities of the default model. Override with SAJA_AI_CAPABILITIES when you pick another model. */
  capabilities: AICapability[];
  /** Languages this provider/model is preferred for (others are still served). */
  strongLanguages: ('en' | 'ar')[];
  /** Low-latency text generation. */
  fast: boolean;
  /** Largest file the adapter will send inline (bytes, before base64). */
  maxInlineBytes: number;
  /** Default safety caps: requests per day / per minute (0 = no cap). */
  limits: { perDay: number; perMinute: number };
  /** Paid unless the configured model is a known free variant. */
  isPaid(model: string): boolean;
}

export const PROVIDER_CAPABILITIES: Record<ProviderId, ProviderSpec> = {
  gemini: {
    id: 'gemini',
    label: 'Gemini',
    keyVar: 'GEMINI_API_KEY',
    modelVar: 'GEMINI_MODEL',
    // Free-tier model that accepts text, images, PDFs, audio and video (Oct 2026). Change GEMINI_MODEL if Google retires it.
    defaultModel: 'gemini-3.5-flash-lite',
    capabilities: ['text', 'structured_output', 'vision', 'pdf', 'audio', 'video', 'embeddings'],
    strongLanguages: ['en', 'ar'],
    fast: false,
    maxInlineBytes: 14 * 1024 * 1024, // inline request limit is 20 MB after base64
    limits: { perDay: 200, perMinute: 10 },
    isPaid: () => false, // a free-tier key is free; a key on a billed project is not — SAJA cannot tell
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    keyVar: 'GROQ_API_KEY',
    modelVar: 'GROQ_MODEL',
    defaultModel: 'llama-3.3-70b-versatile',
    capabilities: ['text', 'structured_output'],
    strongLanguages: ['en'],
    fast: true,
    maxInlineBytes: 4 * 1024 * 1024,
    limits: { perDay: 1000, perMinute: 30 },
    isPaid: () => false,
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    keyVar: 'OPENROUTER_API_KEY',
    modelVar: 'OPENROUTER_MODEL',
    // The free-models router: OpenRouter picks an available free model per request.
    defaultModel: 'openrouter/free',
    capabilities: ['text', 'structured_output'],
    strongLanguages: [],
    fast: false,
    maxInlineBytes: 4 * 1024 * 1024,
    // Free plan without purchased credits: 50 requests/day, 20/minute.
    limits: { perDay: 50, perMinute: 20 },
    isPaid: (model) => !(model === 'openrouter/free' || model.endsWith(':free')),
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral',
    keyVar: 'MISTRAL_API_KEY',
    modelVar: 'MISTRAL_MODEL',
    defaultModel: 'mistral-small-latest',
    capabilities: ['text', 'structured_output', 'vision'],
    strongLanguages: ['en'],
    fast: false,
    maxInlineBytes: 8 * 1024 * 1024,
    limits: { perDay: 500, perMinute: 30 },
    isPaid: () => false,
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    keyVar: 'ANTHROPIC_API_KEY',
    modelVar: 'ANTHROPIC_MODEL',
    defaultModel: 'claude-opus-5',
    capabilities: ['text', 'structured_output', 'vision', 'pdf'],
    strongLanguages: ['en', 'ar'],
    fast: false,
    maxInlineBytes: 20 * 1024 * 1024,
    limits: { perDay: 0, perMinute: 0 },
    isPaid: () => true,
  },
};

export const PROVIDER_IDS = Object.keys(PROVIDER_CAPABILITIES) as ProviderId[];
export const DEFAULT_ORDER: ProviderId[] = ['gemini', 'groq', 'openrouter', 'mistral', 'anthropic'];
/** OpenRouter forwards prompts to whichever third party hosts the free model, so it is left out of sensitive tasks by default. */
export const DEFAULT_SENSITIVE: ProviderId[] = ['gemini', 'groq', 'mistral', 'anthropic'];

/** Embedding models (RAG). Gemini's is preferred when GEMINI_API_KEY is set. */
export const EMBEDDING_MODELS = {
  gemini: { defaultModel: 'gemini-embedding-001', limits: { perDay: 500, perMinute: 60 }, batch: 100, supportsTaskType: (m: string) => m === 'gemini-embedding-001' },
  voyage: { defaultModel: 'voyage-3.5' },
};

/** Extra output tokens for models that think before answering (thinking counts against the output limit). */
export const THINKING_HEADROOM: Partial<Record<ProviderId, number>> = { gemini: 2048, groq: 1024, openrouter: 1024 };

/* ── environment parsing ──────────────────────────────────────────────── */

const isProvider = (x: string): x is ProviderId => (PROVIDER_IDS as string[]).includes(x);

export function parseOrder(v: string | undefined): ProviderId[] {
  const list = (v ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(isProvider);
  const order = list.length ? [...new Set(list)] : DEFAULT_ORDER;
  // Providers left out of the list still come last, in default order, so a key is never silently ignored.
  return [...order, ...DEFAULT_ORDER.filter((p) => !order.includes(p))];
}

export function parseProviderList(v: string | undefined, fallback: ProviderId[]): ProviderId[] {
  if (v === undefined) return fallback;
  return v.split(',').map((x) => x.trim().toLowerCase()).filter(isProvider);
}

/** "groq=text,structured_output,vision; mistral=text,structured_output" */
export function parseCapabilities(v: string | undefined): Partial<Record<ProviderId, AICapability[]>> {
  const out: Partial<Record<ProviderId, AICapability[]>> = {};
  const valid: AICapability[] = ['text', 'structured_output', 'vision', 'pdf', 'audio', 'video', 'embeddings'];
  for (const part of (v ?? '').split(';')) {
    const [p, caps] = part.split('=').map((x) => x?.trim().toLowerCase());
    if (!p || !caps || !isProvider(p)) continue;
    out[p] = caps.split(',').map((c) => c.trim()).filter((c): c is AICapability => (valid as string[]).includes(c));
  }
  return out;
}

/** "gemini=200/10, openrouter=50/20" → requests per day / per minute (0 = no cap). */
export function parseLimits(v: string | undefined): Partial<Record<ProviderId | 'gemini-embeddings', { perDay: number; perMinute: number }>> {
  const out: Partial<Record<string, { perDay: number; perMinute: number }>> = {};
  for (const part of (v ?? '').split(',')) {
    const m = part.trim().toLowerCase().match(/^([a-z-]+)=(\d+)(?:\/(\d+))?$/);
    if (m && (isProvider(m[1]) || m[1] === 'gemini-embeddings')) out[m[1]] = { perDay: Number(m[2]), perMinute: Number(m[3] ?? 0) };
  }
  return out;
}
