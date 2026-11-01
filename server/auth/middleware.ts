import type { Context, MiddlewareHandler } from 'hono';
import type { AppEnv } from '../context.ts';
import { AppError } from '../lib/errors.ts';
import { hasRole, loadAccess, type Access, type Role } from './access.ts';
import { readSessionCookie, resolveSession } from './sessions.ts';

/** Loads the session (if any). Never trusts client-provided identity. */
export const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const { db } = c.get('services');
  const s = await resolveSession(db, readSessionCookie(c));
  c.set('sessionId', s?.id ?? null);
  c.set('access', s ? await loadAccess(db, s.userId) : null);
  await next();
};

/**
 * CSRF defence for cookie-authenticated writes: a custom header (which forces a
 * CORS preflight cross-site) plus an Origin check when the browser sends one.
 */
export const csrfMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    if (c.req.header('x-saja-csrf') !== '1') throw new AppError('forbidden', 'Missing request header.');
    const origin = c.req.header('origin');
    const allowed = c.get('services').config.APP_ORIGIN;
    const self = new URL(c.req.url).origin;
    if (origin && origin !== allowed && origin !== self) throw new AppError('forbidden', 'Cross-origin request refused.');
  }
  await next();
};

export function requireAccess(c: Context<AppEnv>): Access {
  const a = c.get('access');
  if (!a) throw new AppError('unauthenticated', 'Please start or sign in to your journey first.');
  return a;
}

export function requireRole(c: Context<AppEnv>, ...roles: Role[]): Access {
  const a = requireAccess(c);
  if (!hasRole(a, ...roles)) throw new AppError('forbidden', 'You do not have permission for this.');
  return a;
}

/** Signed-in (non-guest) accounts only — for actions that must be tied to a recoverable identity. */
export function requireAccount(c: Context<AppEnv>): Access {
  const a = requireAccess(c);
  if (a.isGuest) throw new AppError('forbidden', 'Save your journey with an account to do this.', { needsAccount: true });
  return a;
}
