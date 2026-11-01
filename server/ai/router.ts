/**
 * AIProviderRouter — chooses ONE provider per request, deterministically.
 *
 *   required capabilities (from the request's content) → candidates in priority order
 *   → drop: missing capability, too-large media, privacy, paid-but-not-allowed,
 *           cooling down after a 429, rejected key, local free-tier cap reached
 *   → prefer: 'fast' providers for fast text tasks; providers strong in the answer language
 *   → try in that order (max attempts, overall latency budget) until one succeeds.
 *
 * Every provider failure is classified; a refusal is final (never shopped
 * around); anything else moves to the next configured provider. When nothing
 * is left the caller gets { ok: false } and uses its deterministic/extractive
 * path — a failure never becomes an answer.
 *
 * Telemetry: provider, model, purpose, latency, token counts and outcome —
 * never prompts, files or answers.
 */
import { createHash } from 'node:crypto';
import type { AICapability, AIProvider, AIService, AiState, Attempt, ContentBlock, ProviderUsage, RateInfo, StructuredRequest, StructuredResult } from './types.ts';
import { log } from '../lib/log.ts';

export interface RoutedProvider {
  provider: AIProvider;
  /** Marked paid: used only when paid usage is allowed. */
  paid: boolean;
  fast: boolean;
  strongLanguages: ('en' | 'ar')[];
  maxInlineBytes: number;
  /** Allowed for privacy: 'sensitive' requests. */
  sensitiveOk: boolean;
  limits: { perDay: number; perMinute: number };
}

export interface RouterOptions {
  allowPaid?: boolean;
  maxAttempts?: number;
  defaultTimeoutMs?: number;
  now?: () => number;
}

const COOLDOWN = { rateLimitedMs: 60_000, dayLimitMs: 3_600_000, authMs: 3_600_000, failuresMs: 120_000, failuresBeforeCooldown: 3 } as const;

/** Capabilities a request needs, derived from its content — not from what the caller claims. */
export function requiredCapabilities(req: StructuredRequest): Set<AICapability> {
  const caps = new Set<AICapability>(['text', 'structured_output']);
  if (typeof req.user !== 'string') {
    for (const b of req.user) {
      if (b.type === 'image') caps.add('vision');
      if (b.type === 'document') caps.add('pdf');
      if (b.type === 'audio') caps.add('audio');
      if (b.type === 'video') caps.add('video');
    }
  }
  return caps;
}

const inlineBytes = (user: StructuredRequest['user']) => (typeof user === 'string' ? 0 : user.reduce((n, b: ContentBlock) => n + (b.type === 'text' ? 0 : Math.floor((b.base64.length * 3) / 4)), 0));

interface ProviderState {
  day: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  minute: number[];
  failures: number;
  blockedUntil: number;
  blockedReason: string | null;
  lastOutcome: Attempt['outcome'] | null;
  lastSuccessAt: number;
  rate: RateInfo | null;
}

export class AIProviderRouter implements AIService {
  readonly id = 'router' as const;
  private states = new Map<string, ProviderState>();
  private inflight = new Map<string, Promise<StructuredResult<unknown>>>();
  private last: { ok: boolean; fallback: boolean } | null = null;
  private now: () => number;

  constructor(
    private providers: RoutedProvider[],
    private opts: RouterOptions = {},
  ) {
    this.now = opts.now ?? (() => Date.now());
  }

  /** Providers that may be used at all (configured, and paid ones only if allowed). */
  private usable() {
    return this.providers.filter((p) => !p.paid || this.opts.allowPaid);
  }

  private stateOf(id: string): ProviderState {
    const day = new Date(this.now()).toISOString().slice(0, 10);
    let s = this.states.get(id);
    if (!s) {
      s = { day, requests: 0, inputTokens: 0, outputTokens: 0, minute: [], failures: 0, blockedUntil: 0, blockedReason: null, lastOutcome: null, lastSuccessAt: 0, rate: null };
      this.states.set(id, s);
    }
    if (s.day !== day) Object.assign(s, { day, requests: 0, inputTokens: 0, outputTokens: 0 });
    return s;
  }

  /** Why a provider can't take a request right now (null = it can). Operational reason only. */
  private blocked(p: RoutedProvider): string | null {
    const s = this.stateOf(p.provider.id);
    const t = this.now();
    if (s.blockedUntil > t) return s.blockedReason ?? 'cooling down';
    if (p.limits.perDay > 0 && s.requests >= p.limits.perDay) return 'daily cap reached';
    s.minute = s.minute.filter((x) => t - x < 60_000);
    if (p.limits.perMinute > 0 && s.minute.length >= p.limits.perMinute) return 'per-minute cap reached';
    if (s.rate?.remainingRequests === 0 && s.rate.resetMs !== undefined && s.lastSuccessAt + s.rate.resetMs > t) return 'provider reports no requests left';
    return null;
  }

  get capabilities(): ReadonlySet<AICapability> {
    const caps = new Set<AICapability>();
    for (const p of this.usable()) if (!this.blocked(p)) for (const c of p.provider.capabilities) caps.add(c);
    return caps;
  }

  /** Ordered candidates for a request, plus why the others were skipped. */
  plan(req: StructuredRequest): { candidates: RoutedProvider[]; skipped: Attempt[]; blocked: string[] } {
    const need = requiredCapabilities(req);
    const bytes = inlineBytes(req.user);
    const hints = req.routing ?? {};
    const skipped: Attempt[] = [];
    const blocked: string[] = [];
    const candidates: RoutedProvider[] = [];
    for (const p of this.providers) {
      const id = p.provider.id;
      const missing = [...need].filter((c) => !p.provider.capabilities.has(c));
      if (missing.length) skipped.push({ provider: id, outcome: 'skipped', note: `lacks ${missing.join(', ')}` });
      else if (bytes > p.maxInlineBytes) skipped.push({ provider: id, outcome: 'skipped', note: 'file too large' });
      else if (hints.privacy === 'sensitive' && !p.sensitiveOk) skipped.push({ provider: id, outcome: 'skipped', note: 'not allowed for sensitive tasks' });
      else if (p.paid && !(this.opts.allowPaid && hints.cost !== 'free')) skipped.push({ provider: id, outcome: 'skipped', note: 'paid' });
      else {
        const why = this.blocked(p);
        if (why) {
          skipped.push({ provider: id, outcome: 'skipped', note: why });
          blocked.push(why);
        } else candidates.push(p);
      }
    }
    const textOnly = [...need].every((c) => c === 'text' || c === 'structured_output');
    const rank = (p: RoutedProvider) => (hints.latency === 'fast' && textOnly && p.fast ? 0 : 2) + (hints.language && !p.strongLanguages.includes(hints.language) ? 1 : 0);
    // Stable sort: equal rank keeps the configured priority order.
    candidates.sort((a, b) => rank(a) - rank(b));
    return { candidates, skipped, blocked };
  }

  async structured<T>(req: StructuredRequest): Promise<StructuredResult<T>> {
    // Identical requests already in flight share one provider call (deduplication).
    const key = createHash('sha256').update(JSON.stringify([req.purpose, req.system, req.user, req.schema, req.maxTokens, req.routing])).digest('hex');
    const pending = this.inflight.get(key);
    if (pending) return pending as Promise<StructuredResult<T>>;
    const p = this.route<T>(req).finally(() => this.inflight.delete(key));
    this.inflight.set(key, p as Promise<StructuredResult<unknown>>);
    return p;
  }

  private async route<T>(req: StructuredRequest): Promise<StructuredResult<T>> {
    const { candidates, skipped, blocked } = this.plan(req);
    const attempts: Attempt[] = [...skipped];
    const purpose = req.purpose ?? 'unspecified';
    if (!this.providers.length) return { ok: false, reason: 'unavailable', detail: 'no provider configured', attempts };
    if (!candidates.length) {
      // Capable providers exist but are cooling down / out of allowance → an outage. Otherwise nothing CAN do this task.
      const outage = blocked.length > 0;
      log.warn('ai.route', { purpose, outcome: outage ? 'all-blocked' : 'capability', skipped: skipped.map((s) => `${s.provider}:${s.note}`) });
      if (outage) this.last = { ok: false, fallback: false };
      const reason = !outage ? 'capability' : blocked.some((b) => /cap reached|allowance|daily limit|no requests left/.test(b)) ? 'quota' : 'unavailable';
      return { ok: false, reason, attempts };
    }
    const deadline = this.now() + (req.routing?.latencyBudgetMs ?? (req.timeoutMs ?? this.opts.defaultTimeoutMs ?? 45_000) * 2);
    const first = this.firstChoice(req);
    let lastFailure: StructuredResult<T> = { ok: false, reason: 'unavailable' };
    for (const p of candidates.slice(0, this.opts.maxAttempts ?? 3)) {
      const remaining = deadline - this.now();
      if (remaining < 1000) {
        attempts.push({ provider: p.provider.id, outcome: 'skipped', note: 'latency budget spent' });
        break;
      }
      const s = this.stateOf(p.provider.id);
      s.requests += 1;
      s.minute.push(this.now());
      const started = this.now();
      let r: StructuredResult<T>;
      try {
        r = await p.provider.structured<T>({ ...req, timeoutMs: Math.min(req.timeoutMs ?? this.opts.defaultTimeoutMs ?? 45_000, remaining) });
      } catch (e) {
        r = { ok: false, reason: 'error', detail: (e as Error)?.name ?? 'exception' };
      }
      const base = { purpose, provider: p.provider.id, model: p.provider.model, ms: this.now() - started, maxOut: req.maxTokens };
      if (r.rate) s.rate = { ...s.rate, ...r.rate };
      if (r.ok) {
        s.inputTokens += r.usage.input;
        s.outputTokens += r.usage.output;
        s.failures = 0;
        s.lastOutcome = 'ok';
        s.lastSuccessAt = this.now();
        attempts.push({ provider: p.provider.id, outcome: 'ok' });
        const fallback = p.provider.id !== first;
        this.last = { ok: true, fallback };
        log.info('ai.call', { ...base, outcome: 'ok', usageIn: r.usage.input, usageOut: r.usage.output, fallback });
        return { ...r, provider: p.provider.id, attempts, fallback };
      }
      s.lastOutcome = r.reason;
      attempts.push({ provider: p.provider.id, outcome: r.reason });
      log.warn('ai.call', { ...base, outcome: r.reason, retryAfterMs: r.rate?.retryAfterMs, window: r.rate?.window });
      this.penalise(p, r.reason, r.rate);
      lastFailure = r;
      // A refusal is the model declining on safety grounds: respected, never shopped to another provider.
      if (r.reason === 'refused') break;
    }
    this.last = { ok: false, fallback: false };
    if (lastFailure.ok) return lastFailure;
    return { ok: false, reason: lastFailure.reason, detail: lastFailure.detail, attempts };
  }

  /** Respect what the provider said: wait out a 429, stop using a rejected key, back off a failing provider. */
  private penalise(p: RoutedProvider, reason: Attempt['outcome'], rate?: RateInfo) {
    const s = this.stateOf(p.provider.id);
    const t = this.now();
    if (reason === 'rate_limited') {
      const wait = rate?.retryAfterMs ?? (rate?.window === 'day' ? COOLDOWN.dayLimitMs : COOLDOWN.rateLimitedMs);
      s.blockedUntil = t + Math.max(wait, 1000);
      s.blockedReason = rate?.window === 'day' ? 'provider daily limit reached' : 'rate limited by provider';
    } else if (reason === 'auth') {
      s.blockedUntil = t + COOLDOWN.authMs;
      s.blockedReason = 'key rejected';
    } else if (reason === 'quota') {
      s.blockedUntil = t + COOLDOWN.dayLimitMs;
      s.blockedReason = 'provider says allowance used up';
    } else if (reason === 'unavailable' || reason === 'timeout' || reason === 'error') {
      s.failures += 1;
      if (s.failures >= COOLDOWN.failuresBeforeCooldown) {
        s.blockedUntil = t + COOLDOWN.failuresMs;
        s.blockedReason = 'repeated failures';
        s.failures = 0;
      }
    }
  }

  /** The provider this request would go to if everything were healthy (for "using fallback"). */
  private firstChoice(req: StructuredRequest): string | undefined {
    const need = requiredCapabilities(req);
    const hints = req.routing ?? {};
    const eligible = this.usable().filter((p) => [...need].every((c) => p.provider.capabilities.has(c)) && (hints.privacy !== 'sensitive' || p.sensitiveOk));
    const textOnly = [...need].every((c) => c === 'text' || c === 'structured_output');
    const rank = (p: RoutedProvider) => (hints.latency === 'fast' && textOnly && p.fast ? 0 : 2) + (hints.language && !p.strongLanguages.includes(hints.language) ? 1 : 0);
    return [...eligible].sort((a, b) => rank(a) - rank(b))[0]?.provider.id;
  }

  state(): AiState {
    const usable = this.usable();
    if (!usable.length) return 'offline';
    const open = usable.filter((p) => !this.blocked(p));
    if (!open.length) return 'unavailable';
    if (!this.last) return [...this.states.values()].some((s) => s.lastSuccessAt > 0) ? 'available' : 'unverified';
    if (!this.last.ok) return 'unavailable';
    // Working, but the first-choice provider is out → people are being served by a backup.
    return this.last.fallback || this.blocked(usable[0]) ? 'fallback' : 'available';
  }

  usage(): ProviderUsage[] {
    return this.providers.map((p) => {
      const s = this.stateOf(p.provider.id);
      const blockedUntil = s.blockedUntil > this.now() ? new Date(s.blockedUntil).toISOString() : null;
      return {
        provider: p.provider.id,
        model: p.provider.model,
        day: s.day,
        requests: s.requests,
        inputTokens: s.inputTokens,
        outputTokens: s.outputTokens,
        dailyLimit: p.limits.perDay || null,
        perMinuteLimit: p.limits.perMinute || null,
        lastOutcome: s.lastOutcome,
        blockedUntil,
        blockedReason: blockedUntil ? s.blockedReason : null,
        rate: s.rate,
      };
    });
  }
}

/** A single provider presented as a router (tests, and wrapping one adapter). */
export function singleProviderRouter(provider: AIProvider, extra: Partial<Omit<RoutedProvider, 'provider'>> = {}): AIProviderRouter {
  return new AIProviderRouter([{ provider, paid: false, fast: false, strongLanguages: ['en', 'ar'], maxInlineBytes: 50 * 1024 * 1024, sensitiveOk: true, limits: { perDay: 0, perMinute: 0 }, ...extra }]);
}
