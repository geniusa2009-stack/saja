/**
 * Structured JSON logging. Never logs message bodies, questions, passwords or
 * tokens — only identifiers, codes and sizes.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';
const REDACT = /(password|token|body|question|content|text|lines|email|secret|key)/i;

function scrub(v: unknown, depth = 0): unknown {
  if (depth > 3 || v == null) return v;
  if (v instanceof Error) return { name: v.name, message: v.message.slice(0, 300) };
  if (Array.isArray(v)) return v.slice(0, 20).map((x) => scrub(x, depth + 1));
  if (typeof v === 'object') {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, REDACT.test(k) ? '[redacted]' : scrub(x, depth + 1)]));
  }
  return typeof v === 'string' && v.length > 300 ? `${v.slice(0, 300)}…` : v;
}

let silent = process.env.SAJA_ENV === 'test';
export const setLogSilent = (s: boolean) => (silent = s);

function write(level: Level, event: string, data?: Record<string, unknown>) {
  if (silent && level !== 'error') return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...(data ? (scrub(data) as object) : {}) });
  (level === 'error' ? console.error : console.log)(line);
}

export const log = {
  debug: (e: string, d?: Record<string, unknown>) => write('debug', e, d),
  info: (e: string, d?: Record<string, unknown>) => write('info', e, d),
  warn: (e: string, d?: Record<string, unknown>) => write('warn', e, d),
  error: (e: string, d?: Record<string, unknown>) => write('error', e, d),
};
