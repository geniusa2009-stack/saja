/**
 * Shared plumbing for the HTTP provider adapters: one request helper that maps
 * every transport outcome to a FailureReason, rate-limit header parsing, JSON
 * extraction and schema validation. Nothing here logs or returns content.
 */
import type { FailureReason, RateInfo, StructuredResult } from './types.ts';

export type FetchLike = typeof fetch;

export const redact = (s: string) => s.replace(/(sk|pa|gsk|key|AIza)[-_]?[\w-]{8,}/g, '[redacted]').replace(/\/\/[^/\s:@]+:[^/\s@]+@/g, '//[redacted]@');

/** "7.66s", "2m59.56s", "1h2m", "250ms" → milliseconds. */
export function parseDuration(v: string | null | undefined): number | undefined {
  if (!v) return undefined;
  const t = v.trim();
  if (/^\d+(\.\d+)?$/.test(t)) return Math.round(Number(t) * 1000); // Retry-After: seconds
  let ms = 0;
  let matched = false;
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)) {
    matched = true;
    const n = Number(m[1]);
    ms += m[2] === 'h' ? n * 3_600_000 : m[2] === 'm' ? n * 60_000 : m[2] === 's' ? n * 1000 : n;
  }
  return matched ? Math.round(ms) : undefined;
}

/** Common rate-limit headers (Groq, OpenRouter, Mistral, Anthropic all use some of these). */
export function rateFromHeaders(h: Headers): RateInfo | undefined {
  const num = (k: string) => {
    const v = h.get(k);
    return v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined;
  };
  const rate: RateInfo = {
    retryAfterMs: parseDuration(h.get('retry-after')),
    remainingRequests: num('x-ratelimit-remaining-requests') ?? num('x-ratelimit-remaining') ?? num('x-ratelimit-remaining-req-minute'),
    remainingTokens: num('x-ratelimit-remaining-tokens') ?? num('x-ratelimit-remaining-tokens-minute'),
  };
  const reset = h.get('x-ratelimit-reset-requests') ?? h.get('x-ratelimit-reset');
  if (reset) {
    const n = Number(reset);
    // OpenRouter sends an epoch in ms; Groq sends a duration ("2m59.56s").
    rate.resetMs = Number.isFinite(n) && n > 1e12 ? Math.max(0, n - Date.now()) : parseDuration(reset);
  }
  return Object.values(rate).some((x) => x !== undefined) ? rate : undefined;
}

export type HttpOutcome = { ok: true; status: number; json: unknown; headers: Headers } | { ok: false; reason: FailureReason; detail?: string; rate?: RateInfo; status?: number; body?: unknown };

/** POST JSON with a timeout; maps the outcome. `detail` is short, operational and redacted. */
export async function postJson(f: FetchLike, url: string, headers: Record<string, string>, body: unknown, timeoutMs: number): Promise<HttpOutcome> {
  let res: Response;
  try {
    res = await f(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    const name = (e as Error)?.name;
    if (name === 'TimeoutError' || name === 'AbortError') return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'unavailable', detail: 'network' };
  }
  let json: unknown;
  const text = await res.text().catch(() => '');
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  const rate = rateFromHeaders(res.headers);
  if (res.ok) return { ok: true, status: res.status, json, headers: res.headers };
  const message = errorMessage(json);
  const detail = `HTTP ${res.status}${message ? `: ${redact(message).slice(0, 140)}` : ''}`;
  if (res.status === 401 || res.status === 403) return { ok: false, reason: 'auth', detail, status: res.status, body: json };
  if (res.status === 429) return { ok: false, reason: 'rate_limited', detail, rate: { ...rate, retryAfterMs: rate?.retryAfterMs ?? retryFromBody(json) }, status: res.status, body: json };
  if (res.status === 402) return { ok: false, reason: 'quota', detail, status: res.status, body: json };
  if (res.status === 408) return { ok: false, reason: 'timeout', detail, status: res.status };
  if (res.status >= 500) return { ok: false, reason: 'unavailable', detail, status: res.status, rate };
  return { ok: false, reason: 'error', detail, status: res.status, body: json };
}

function errorMessage(json: unknown): string | undefined {
  const j = json as { error?: { message?: unknown } | string; message?: unknown } | null;
  if (!j) return undefined;
  if (typeof j.error === 'string') return j.error;
  if (j.error && typeof j.error.message === 'string') return j.error.message;
  if (typeof j.message === 'string') return j.message;
  return undefined;
}

/** Google-style RetryInfo ("37s") or "Please retry in 37.2s." in the message. */
export function retryFromBody(json: unknown): number | undefined {
  const err = (json as { error?: { message?: string; details?: { '@type'?: string; retryDelay?: string }[] } } | null)?.error;
  const info = err?.details?.find((d) => d['@type']?.endsWith('RetryInfo'));
  if (info?.retryDelay) return parseDuration(info.retryDelay);
  const m = err?.message?.match(/retry in ([\d.]+)\s*s/i);
  return m ? Math.round(Number(m[1]) * 1000) : undefined;
}

/** Models sometimes wrap JSON in prose or code fences; take the outermost object. */
export function parseJsonObject(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(t.slice(start, end + 1));
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}

/**
 * Validates `value` against the JSON Schema subset SAJA's schemas use
 * (type, properties, required, items, enum). Callers only ever read declared fields.
 * Returns null when valid, else a short path-level reason.
 */
export function schemaError(schema: Record<string, unknown>, value: unknown, path = '$'): string | null {
  const type = schema.type as string | undefined;
  const en = schema.enum as unknown[] | undefined;
  if (en && !en.includes(value)) return `${path}: not one of the allowed values`;
  if (type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return `${path}: expected object`;
    const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
    for (const r of (schema.required as string[] | undefined) ?? []) if (!(r in (value as object))) return `${path}.${r}: missing`;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Unknown extra fields are ignored (never read), not treated as failure: only declared fields are used.
      if (props[k]) {
        const e = schemaError(props[k], v, `${path}.${k}`);
        if (e) return e;
      }
    }
    return null;
  }
  if (type === 'array') {
    if (!Array.isArray(value)) return `${path}: expected array`;
    const items = schema.items as Record<string, unknown> | undefined;
    if (items) for (let i = 0; i < value.length; i++) {
      const e = schemaError(items, value[i], `${path}[${i}]`);
      if (e) return e;
    }
    return null;
  }
  if (type === 'string') return typeof value === 'string' ? null : `${path}: expected string`;
  if (type === 'boolean') return typeof value === 'boolean' ? null : `${path}: expected boolean`;
  if (type === 'integer') return Number.isInteger(value) ? null : `${path}: expected integer`;
  if (type === 'number') return typeof value === 'number' ? null : `${path}: expected number`;
  return null;
}

/** Parses model text into schema-valid data, or reports invalid_output. */
export function structuredFrom<T>(text: string, schema: Record<string, unknown>, meta: { model: string; provider: string; usage: { input: number; output: number }; rate?: RateInfo }): StructuredResult<T> {
  const data = parseJsonObject(text);
  if (data === undefined) return { ok: false, reason: 'invalid_output', detail: 'not JSON' };
  const err = schemaError(schema, data);
  if (err) return { ok: false, reason: 'invalid_output', detail: `schema: ${err}` };
  return { ok: true, data: data as T, ...meta };
}

/** Instruction appended for providers that only offer a generic JSON mode. */
export const jsonInstruction = (schema: Record<string, unknown>) =>
  `\n\nRespond with ONE JSON object only — no prose, no code fences — that matches this JSON Schema exactly:\n${JSON.stringify(schema)}`;
