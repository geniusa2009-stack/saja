import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Queryable } from '../db/index.ts';
import { one } from '../db/index.ts';
import { newToken, sha256 } from '../lib/crypto.ts';
import type { AppEnv } from '../context.ts';

export const COOKIE = 'saja_session';
const TTL_DAYS = 60;

export async function createSession(q: Queryable, userId: string): Promise<{ id: string; token: string }> {
  const token = newToken();
  const row = await one<{ id: string }>(q, `insert into sessions (user_id, token_hash, expires_at) values ($1, $2, now() + interval '${TTL_DAYS} days') returning id`, [userId, sha256(token)]);
  return { id: row!.id, token };
}

export async function resolveSession(q: Queryable, token: string | undefined): Promise<{ id: string; userId: string } | null> {
  if (!token || token.length > 128) return null;
  const row = await one<{ id: string; user_id: string }>(q, 'select id, user_id from sessions where token_hash = $1 and expires_at > now()', [sha256(token)]);
  if (!row) return null;
  // Touch at most once an hour to avoid a write per request.
  await q.query("update sessions set last_seen_at = now() where id = $1 and last_seen_at < now() - interval '1 hour'", [row.id]);
  return { id: row.id, userId: row.user_id };
}

export function setSessionCookie(c: Context<AppEnv>, token: string) {
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: c.get('services').config.cookieSecure,
    path: '/',
    maxAge: TTL_DAYS * 86400,
  });
}

export const readSessionCookie = (c: Context) => getCookie(c, COOKIE);
export const clearSessionCookie = (c: Context) => deleteCookie(c, COOKIE, { path: '/' });
