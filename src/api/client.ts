/**
 * The only way the web app talks to the SAJA server.
 *
 * - Same-origin `/api` (Vite proxies it in dev; the server serves the app in production),
 *   so the httpOnly session cookie is sent automatically and never touched by JS.
 * - Every write carries the CSRF header the server requires.
 * - Errors are typed: `offline` (network/no server) is distinct from server refusals,
 *   so the UI can say "you're offline" vs. "that isn't allowed" honestly.
 * - No secrets live here: the browser only ever holds a session cookie.
 */
export type ApiErrorCode =
  | 'offline'
  | 'bad_request'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'policy_blocked'
  | 'payload_too_large'
  | 'unsupported_media'
  | 'unavailable'
  | 'internal';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status = 0,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  get offline() {
    return this.code === 'offline';
  }
}

export const API_BASE = '/api';

type RefusalListener = (e: ApiError) => void;
const refusalListeners = new Set<RefusalListener>();
const offlineListeners = new Set<() => void>();
/** Called when a request finds the server unreachable (network down, server stopped). */
export function onOffline(fn: () => void) {
  offlineListeners.add(fn);
  return () => {
    offlineListeners.delete(fn);
  };
}

/** Lets the app react to server refusals that affect the whole experience (e.g. the guardian time limit). */
export function onRefusal(fn: RefusalListener) {
  refusalListeners.add(fn);
  return () => {
    refusalListeners.delete(fn);
  };
}
const TIMEOUT_MS = 20_000;

async function request<T>(method: string, path: string, body?: unknown, opts: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['content-type'] = 'application/json';
  if (method !== 'GET') headers['x-saja-csrf'] = '1';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? TIMEOUT_MS);
  opts.signal?.addEventListener('abort', () => ctrl.abort());
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch {
    offlineListeners.forEach((fn) => fn());
    throw new ApiError('offline', 'Can’t reach SAJA right now.');
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text().catch(() => '');
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // A non-JSON reply (e.g. the dev server's HTML) means there is no API behind this origin.
    throw new ApiError('offline', 'The SAJA server isn’t available.', res.status);
  }
  if (!res.ok) {
    const e = (data as { error?: { code?: ApiErrorCode; message?: string; details?: Record<string, unknown> } } | null)?.error;
    if (res.status === 502 || res.status === 503 || res.status === 504) throw new ApiError(e?.code ?? 'offline', e?.message ?? 'The SAJA server isn’t available.', res.status);
    const err = new ApiError(e?.code ?? 'internal', e?.message ?? `Request failed (${res.status}).`, res.status, e?.details);
    if (err.code === 'forbidden') refusalListeners.forEach((fn) => fn(err));
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T>(p: string, o?: { timeoutMs?: number; signal?: AbortSignal }) => request<T>('GET', p, undefined, o),
  post: <T>(p: string, b: unknown = {}, o?: { timeoutMs?: number }) => request<T>('POST', p, b, o),
  put: <T>(p: string, b: unknown = {}) => request<T>('PUT', p, b),
  del: <T>(p: string) => request<T>('DELETE', p),
  upload: <T>(file: File) => {
    const f = new FormData();
    f.set('file', file);
    return request<T>('POST', '/uploads', f, { timeoutMs: 120_000 });
  },
};

/** Human copy for an error, localised by the caller's `t`. */
export function errorKey(e: unknown): string {
  if (e instanceof ApiError) return `err.${e.code}`;
  return 'err.internal';
}
