/**
 * AI provider abstraction — routed by capability, not by brand.
 *
 * A provider declares what it can do (see PROVIDER_CAPABILITIES in models.ts);
 * the router (router.ts) only sends a request to a provider whose declared
 * capabilities cover it. Callers talk to the router, never to a provider.
 */
export type AICapability = 'text' | 'structured_output' | 'vision' | 'pdf' | 'audio' | 'video' | 'embeddings';

export type ProviderId = 'gemini' | 'groq' | 'openrouter' | 'mistral' | 'anthropic';

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: string; base64: string }
  | { type: 'document'; mediaType: 'application/pdf'; base64: string }
  | { type: 'audio'; mediaType: string; base64: string }
  | { type: 'video'; mediaType: string; base64: string };

export type AiPurpose = 'siraj-answer' | 'question-organize' | 'ocr' | 'claim-extraction' | 'frame-ocr' | 'transcription' | 'health-check';

/** Router inputs beyond the content itself. All optional; the defaults are the conservative choice. */
export interface RoutingHints {
  /** Language of the expected answer: providers with stronger support for it are preferred. */
  language?: 'en' | 'ar';
  /** 'fast' prefers providers declared fast (short text tasks only). */
  latency?: 'fast' | 'normal';
  /** Overall time allowed across every attempt, including fallbacks. */
  latencyBudgetMs?: number;
  /** Paid providers are used only when SAJA_AI_ALLOW_PAID=true, and never for a request marked 'free'. */
  cost?: 'free' | 'any';
  /** 'sensitive' routes only to providers listed in SAJA_AI_SENSITIVE_PROVIDERS. */
  privacy?: 'standard' | 'sensitive';
}

export interface StructuredRequest {
  system: string;
  user: string | ContentBlock[];
  /** JSON Schema of the expected output. Every provider's output is validated against it. */
  schema: Record<string, unknown>;
  maxTokens: number;
  /** Depth vs cost: 'low' for classification/extraction, 'medium' for grounded answers. */
  effort: 'low' | 'medium' | 'high';
  timeoutMs?: number;
  /** What the call is for — logged (never the content) for cost and failure monitoring. */
  purpose?: AiPurpose;
  routing?: RoutingHints;
}

export type FailureReason =
  | 'refused' // the model declined (safety): never retried elsewhere
  | 'invalid_output' // cut off, unparseable, or not matching the schema
  | 'timeout'
  | 'unavailable' // provider overloaded / network / 5xx
  | 'rate_limited' // 429 from the provider
  | 'auth' // invalid or revoked key
  | 'quota' // SAJA's own free-tier cap for this provider is used up, or the provider says credits are exhausted
  | 'capability' // no configured provider can do this
  | 'error';

/** Rate-limit metadata a provider reported (headers or error details). Never contains content. */
export interface RateInfo {
  retryAfterMs?: number;
  remainingRequests?: number;
  remainingTokens?: number;
  resetMs?: number;
  /** Which limit was hit, when the provider says (e.g. per-day vs per-minute). */
  window?: 'minute' | 'day';
}

export interface Attempt {
  provider: string;
  outcome: 'ok' | FailureReason | 'skipped';
  /** Why a provider was skipped or failed (operational, never content). */
  note?: string;
}

export type StructuredResult<T> =
  | { ok: true; data: T; model: string; provider?: string; usage: { input: number; output: number }; rate?: RateInfo; attempts?: Attempt[]; fallback?: boolean }
  | { ok: false; reason: FailureReason; detail?: string; rate?: RateInfo; attempts?: Attempt[] };

/** One configured model behind one provider's API. */
export interface AIProvider {
  readonly id: ProviderId | (string & {});
  readonly model: string;
  readonly capabilities: ReadonlySet<AICapability>;
  structured<T>(req: StructuredRequest): Promise<StructuredResult<T>>;
}

/** Overall AI state as people see it — derived from real calls, never assumed. */
export type AiState =
  | 'offline' // no provider configured: curated, extractive behaviour
  | 'unverified' // configured, but no request has succeeded yet in this process
  | 'available' // the last request succeeded with the first-choice provider
  | 'fallback' // working, but through a backup provider
  | 'unavailable'; // every configured provider is rate-limited, out of quota, failing or rejected the key

/** What the rest of SAJA calls: the router. */
export interface AIService {
  readonly id: 'router';
  /** Capabilities at least one provider can serve RIGHT NOW (rate limits, quotas and failures considered). */
  readonly capabilities: ReadonlySet<AICapability>;
  structured<T>(req: StructuredRequest): Promise<StructuredResult<T>>;
  state(): AiState;
  /** Operational view for operators (doctor, logs). Contains provider names — not for learners. */
  usage(): ProviderUsage[];
}

export interface ProviderUsage {
  provider: string;
  model: string;
  day: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  dailyLimit: number | null;
  perMinuteLimit: number | null;
  lastOutcome: Attempt['outcome'] | null;
  blockedUntil: string | null;
  blockedReason: string | null;
  rate: RateInfo | null;
}

export interface EmbeddingProvider {
  readonly id: string;
  readonly dimensions: number;
  embed(texts: string[], kind: 'document' | 'query'): Promise<number[][]>;
}

export type TranscriptionResult = { ok: true; text: string } | { ok: false; reason: 'unavailable' | 'error'; detail?: string };
export interface TranscriptionProvider {
  readonly id: 'remote' | 'unavailable';
  transcribe(file: { data: Buffer; mime: string; name: string }): Promise<TranscriptionResult>;
}
