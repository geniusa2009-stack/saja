import type { Context } from 'hono';
import { z } from 'zod';
import { AppError } from './errors.ts';

export async function body<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new AppError('bad_request', 'Expected a JSON body.');
  }
  const r = schema.safeParse(raw);
  if (!r.success) throw new AppError('bad_request', 'Some fields are invalid.', { issues: r.error.issues.slice(0, 8).map((i) => ({ path: i.path.join('.'), message: i.message })) });
  return r.data;
}

export function query<T extends z.ZodType>(c: Context, schema: T): z.infer<T> {
  const r = schema.safeParse(c.req.query());
  if (!r.success) throw new AppError('bad_request', 'Some query parameters are invalid.');
  return r.data;
}

export const Id = z.string().uuid();
export const Locale = z.enum(['en', 'ar']);
export const L10n = z.object({ en: z.string(), ar: z.string() });

/** Client address for rate limiting. X-Forwarded-For is spoofable, so it is used only behind a trusted proxy. */
export function clientIp(c: Context): string {
  const services = c.get('services') as { config: { TRUST_PROXY: string } } | undefined;
  if (services?.config.TRUST_PROXY === 'true') {
    const fwd = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
    if (fwd) return fwd;
  }
  const incoming = (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)?.incoming;
  return incoming?.socket?.remoteAddress ?? 'local';
}
