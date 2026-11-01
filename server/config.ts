/**
 * Server configuration. Every external capability has an explicit mode so
 * the product (and the UI) always knows whether it is talking to a REAL
 * service or an honest local fallback.
 */
import { z } from 'zod';
import type { AICapability, ProviderId } from './ai/types.ts';
import { DEFAULT_SENSITIVE, EMBEDDING_MODELS, PROVIDER_CAPABILITIES, PROVIDER_IDS, parseCapabilities, parseLimits, parseOrder, parseProviderList } from './ai/models.ts';

const Env = z.object({
  SAJA_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(8787),
  APP_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().optional(),
  PGLITE_DIR: z.string().default('./.data/pglite'),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  /** Only trust X-Forwarded-For when running behind a known reverse proxy. */
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  /* AI providers — all optional, all server-side only. Priority: Gemini → Groq → OpenRouter → Mistral (→ Anthropic, paid, opt-in). */
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_EMBEDDING_MODEL: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
  MISTRAL_MODEL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
  /** Deprecated alias of ANTHROPIC_MODEL (kept so existing .env files keep working). */
  SAJA_AI_MODEL: z.string().optional(),
  SAJA_AI_PROVIDER_ORDER: z.string().optional(),
  SAJA_AI_ALLOW_PAID: z.enum(['true', 'false']).default('false'),
  SAJA_AI_CAPABILITIES: z.string().optional(),
  SAJA_AI_LIMITS: z.string().optional(),
  SAJA_AI_SENSITIVE_PROVIDERS: z.string().optional(),
  SAJA_AI_TIMEOUT_MS: z.coerce.number().default(45_000),
  SAJA_AI_DAILY_CALLS_PER_USER: z.coerce.number().default(60),
  /** auto (Gemini if GEMINI_API_KEY, else Voyage if VOYAGE_API_KEY, else local) | gemini | voyage | local */
  SAJA_EMBEDDINGS: z.enum(['auto', 'gemini', 'voyage', 'local']).default('auto'),
  VOYAGE_API_KEY: z.string().optional(),
  VOYAGE_MODEL: z.string().default('voyage-3.5'),
  TRANSCRIPTION_API_URL: z.string().optional(),
  TRANSCRIPTION_API_KEY: z.string().optional(),
  TRANSCRIPTION_MODEL: z.string().default('whisper-1'),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:hello@saja.app'),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('SAJA <no-reply@saja.app>'),
  UPLOAD_DIR: z.string().default('./.data/uploads'),
  MAX_UPLOAD_MB: z.coerce.number().default(20),
  /** Local ffmpeg binary for reading on-screen text in videos (optional). */
  FFMPEG_PATH: z.string().optional(),
  /** Built web app to serve from the same origin (production). Empty = API only. */
  STATIC_DIR: z.string().optional(),
});

export type Config = z.infer<typeof Env> & {
  modes: {
    database: 'postgres' | 'pglite' | 'pglite-memory';
    /** 'provider' when at least one AI provider may be used; whether it WORKS is the router's live state. */
    ai: 'provider' | 'demo';
    embeddings: 'gemini' | 'voyage' | 'local-lexical';
    ocr: 'provider-vision' | 'unavailable';
    transcription: 'remote' | 'provider-audio' | 'unavailable';
    frameOcr: 'provider-video' | 'ffmpeg+vision' | 'unavailable';
    push: 'web-push' | 'disabled';
    email: 'smtp' | 'dev-outbox';
  };
  cookieSecure: boolean;
  /** Deployment problems worth shouting about at boot (never secrets). */
  warnings: string[];
  /** Resolved provider settings (models, capabilities, caps) — see server/ai/models.ts. */
  ai: AiSettings;
};

export interface AiSettings {
  order: ProviderId[];
  allowPaid: boolean;
  sensitive: ProviderId[];
  providers: Record<ProviderId, { configured: boolean; model: string; capabilities: AICapability[]; paid: boolean; usable: boolean; limits: { perDay: number; perMinute: number } }>;
  embeddings: { provider: 'gemini' | 'voyage' | 'local'; model: string | null; limits: { perDay: number; perMinute: number } };
}

function resolveAi(p: z.infer<typeof Env>): AiSettings {
  const caps = parseCapabilities(p.SAJA_AI_CAPABILITIES);
  const limits = parseLimits(p.SAJA_AI_LIMITS);
  const allowPaid = p.SAJA_AI_ALLOW_PAID === 'true';
  const keys: Record<ProviderId, string | undefined> = { gemini: p.GEMINI_API_KEY, groq: p.GROQ_API_KEY, openrouter: p.OPENROUTER_API_KEY, mistral: p.MISTRAL_API_KEY, anthropic: p.ANTHROPIC_API_KEY };
  const models: Record<ProviderId, string | undefined> = { gemini: p.GEMINI_MODEL, groq: p.GROQ_MODEL, openrouter: p.OPENROUTER_MODEL, mistral: p.MISTRAL_MODEL, anthropic: p.ANTHROPIC_MODEL ?? p.SAJA_AI_MODEL };
  const providers = Object.fromEntries(
    PROVIDER_IDS.map((id) => {
      const spec = PROVIDER_CAPABILITIES[id];
      const model = models[id] || spec.defaultModel;
      const paid = spec.isPaid(model);
      const configured = !!keys[id];
      return [id, { configured, model, capabilities: caps[id] ?? spec.capabilities, paid, usable: configured && (!paid || allowPaid), limits: limits[id] ?? spec.limits }];
    }),
  ) as AiSettings['providers'];
  const want = p.SAJA_EMBEDDINGS;
  const emb: AiSettings['embeddings']['provider'] =
    want === 'gemini' && p.GEMINI_API_KEY ? 'gemini' : want === 'voyage' && p.VOYAGE_API_KEY ? 'voyage' : want === 'local' ? 'local' : want !== 'auto' ? 'local' : p.GEMINI_API_KEY ? 'gemini' : p.VOYAGE_API_KEY ? 'voyage' : 'local';
  return {
    order: parseOrder(p.SAJA_AI_PROVIDER_ORDER),
    allowPaid,
    sensitive: parseProviderList(p.SAJA_AI_SENSITIVE_PROVIDERS, DEFAULT_SENSITIVE),
    providers,
    embeddings: {
      provider: emb,
      model: emb === 'gemini' ? p.GEMINI_EMBEDDING_MODEL || EMBEDDING_MODELS.gemini.defaultModel : emb === 'voyage' ? p.VOYAGE_MODEL : null,
      limits: limits['gemini-embeddings'] ?? EMBEDDING_MODELS.gemini.limits,
    },
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, overrides: Partial<z.input<typeof Env>> = {}): Config {
  const parsed = Env.parse({ ...env, ...overrides });
  const memory = parsed.SAJA_ENV === 'test' || parsed.PGLITE_DIR === ':memory:';
  const warnings: string[] = [];
  const ai = resolveAi(parsed);
  const usable = ai.order.filter((id) => ai.providers[id].usable);
  const can = (c: AICapability) => usable.some((id) => ai.providers[id].capabilities.includes(c));
  if (ai.providers.anthropic.configured && !ai.allowPaid) warnings.push('ANTHROPIC_API_KEY is set but SAJA_AI_ALLOW_PAID is not true: Anthropic (paid) will not be used.');
  if (ai.providers.openrouter.configured && ai.providers.openrouter.paid && !ai.allowPaid) warnings.push(`OPENROUTER_MODEL "${ai.providers.openrouter.model}" is not a free model: OpenRouter will not be used unless SAJA_AI_ALLOW_PAID=true.`);
  if (parsed.SAJA_ENV === 'production') {
    if (!parsed.DATABASE_URL) warnings.push('DATABASE_URL is not set: using embedded PGlite on local disk (single instance only, back it up).');
    if (/localhost|127\.0\.0\.1/.test(parsed.APP_ORIGIN)) warnings.push('APP_ORIGIN points at localhost: CSRF origin checks will reject your real domain.');
    if (parsed.COOKIE_SECURE === 'false') warnings.push('COOKIE_SECURE=false in production: session cookies can leak over plain HTTP.');
    if (!parsed.SMTP_URL) warnings.push('SMTP_URL is not set: password-reset emails are written to the dev outbox table, not sent.');
  }
  return {
    ...parsed,
    STATIC_DIR: parsed.STATIC_DIR ?? (parsed.SAJA_ENV === 'production' ? './dist' : undefined),
    warnings,
    cookieSecure: parsed.COOKIE_SECURE ? parsed.COOKIE_SECURE === 'true' : parsed.SAJA_ENV === 'production',
    ai,
    modes: {
      database: parsed.DATABASE_URL ? 'postgres' : memory ? 'pglite-memory' : 'pglite',
      ai: usable.length ? 'provider' : 'demo',
      embeddings: ai.embeddings.provider === 'local' ? 'local-lexical' : ai.embeddings.provider,
      ocr: can('vision') ? 'provider-vision' : 'unavailable',
      transcription: parsed.TRANSCRIPTION_API_URL && parsed.TRANSCRIPTION_API_KEY ? 'remote' : can('audio') ? 'provider-audio' : 'unavailable',
      frameOcr: can('video') ? 'provider-video' : parsed.FFMPEG_PATH && can('vision') ? 'ffmpeg+vision' : 'unavailable',
      push: parsed.VAPID_PUBLIC_KEY && parsed.VAPID_PRIVATE_KEY ? 'web-push' : 'disabled',
      email: parsed.SMTP_URL ? 'smtp' : 'dev-outbox',
    },
  };
}
