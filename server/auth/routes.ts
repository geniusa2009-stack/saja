import { log } from '../lib/log.ts';
import { deleteAccount } from '../modules/lifecycle.ts';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../context.ts';
import { one } from '../db/index.ts';
import { AppError } from '../lib/errors.ts';
import { body, clientIp as ip } from '../lib/http.ts';
import { hashPassword, newToken, sha256, verifyPassword } from '../lib/crypto.ts';
import { track } from '../modules/analytics.ts';
import { clearSessionCookie, createSession, setSessionCookie } from './sessions.ts';
import { requireAccess } from './middleware.ts';
import { meView } from './me.ts';

const Email = z.string().trim().toLowerCase().email().max(200);
const Password = z.string().min(10, 'Use at least 10 characters.').max(200);

export const authRoutes = new Hono<AppEnv>();


/** Start a journey without any form: a private guest account on this device. */
authRoutes.post('/guest', async (c) => {
  const s = c.get('services');
  await s.limiter.take('auth', `guest:${ip(c)}`);
  const existing = c.get('access');
  if (existing) return c.json(await meView(s.db, existing));
  const user = await one<{ id: string }>(s.db, 'insert into users (is_guest) values (true) returning id');
  await s.db.query("insert into user_roles (user_id, role) values ($1, 'learner')", [user!.id]);
  const session = await createSession(s.db, user!.id);
  setSessionCookie(c, session.token);
  const { loadAccess } = await import('./access.ts');
  return c.json(await meView(s.db, (await loadAccess(s.db, user!.id))!), 201);
});

/** Create an account. A guest keeps their journey: the guest user is upgraded in place. */
authRoutes.post('/signup', async (c) => {
  const s = c.get('services');
  await s.limiter.take('auth', `signup:${ip(c)}`);
  const { email, password } = await body(c, z.object({ email: Email, password: Password }));
  const taken = await one(s.db, 'select 1 from users where lower(email) = $1', [email]);
  if (taken) throw new AppError('conflict', 'An account with this email already exists. Try signing in.');
  const hash = await hashPassword(password);
  const current = c.get('access');
  let userId: string;
  if (current?.isGuest) {
    userId = current.userId;
    await s.db.query('update users set email = $1, password_hash = $2, is_guest = false, updated_at = now() where id = $3', [email, hash, userId]);
  } else {
    const u = await one<{ id: string }>(s.db, 'insert into users (email, password_hash, is_guest) values ($1, $2, false) returning id', [email, hash]);
    userId = u!.id;
    await s.db.query("insert into user_roles (user_id, role) values ($1, 'learner')", [userId]);
  }
  // Rotate the session on privilege change.
  if (c.get('sessionId')) await s.db.query('delete from sessions where id = $1', [c.get('sessionId')]);
  const session = await createSession(s.db, userId);
  setSessionCookie(c, session.token);
  await track(s.db, userId, 'account_created', { upgradedGuest: !!current?.isGuest });
  const { loadAccess } = await import('./access.ts');
  return c.json(await meView(s.db, (await loadAccess(s.db, userId))!), 201);
});

authRoutes.post('/signin', async (c) => {
  const s = c.get('services');
  const { email, password } = await body(c, z.object({ email: Email, password: z.string().max(200) }));
  await s.limiter.take('auth', `signin:${email}`);
  await s.limiter.take('auth', `signin-ip:${ip(c)}`);
  const u = await one<{ id: string; password_hash: string; deleted_at: string | null }>(s.db, 'select id, password_hash, deleted_at from users where lower(email) = $1', [email]);
  // Same error and similar work whether or not the account exists.
  const ok = await verifyPassword(password, u?.password_hash ?? 'scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
  if (!u || !ok || u.deleted_at) throw new AppError('unauthenticated', 'That email and password don’t match.');
  if (c.get('sessionId')) await s.db.query('delete from sessions where id = $1', [c.get('sessionId')]);
  const session = await createSession(s.db, u.id);
  setSessionCookie(c, session.token);
  const { loadAccess } = await import('./access.ts');
  return c.json(await meView(s.db, (await loadAccess(s.db, u.id))!));
});

authRoutes.post('/signout', async (c) => {
  const s = c.get('services');
  if (c.get('sessionId')) await s.db.query('delete from sessions where id = $1', [c.get('sessionId')]);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

authRoutes.get('/me', async (c) => {
  const a = c.get('access');
  if (!a) return c.json({ user: null });
  return c.json(await meView(c.get('services').db, a));
});

/** Always answers the same way, so it can't be used to discover accounts. */
authRoutes.post('/reset/request', async (c) => {
  const s = c.get('services');
  const { email } = await body(c, z.object({ email: Email }));
  await s.limiter.take('auth', `reset:${email}`);
  const u = await one<{ id: string }>(s.db, 'select id from users where lower(email) = $1 and deleted_at is null', [email]);
  if (u) {
    const token = newToken();
    await s.db.query("insert into password_resets (user_id, token_hash, expires_at) values ($1, $2, now() + interval '30 minutes')", [u.id, sha256(token)]);
    const link = `${s.config.APP_ORIGIN}/account/reset?token=${encodeURIComponent(token)}`;
    // Sent in the background: a slow or failing mail server must not reveal (by an error or a delay) that this account exists.
    void s.mailer
      .send(email, 'Reset your SAJA password', `Use this link within 30 minutes to choose a new password:\n${link}\n\nIf you didn't ask for this, you can ignore this email.`)
      .catch((error: unknown) => log.error('email.failed', { purpose: 'password-reset', error }));
  }
  return c.json({ ok: true, delivery: s.mailer.mode });
});

authRoutes.post('/reset/confirm', async (c) => {
  const s = c.get('services');
  const { token, password } = await body(c, z.object({ token: z.string().min(20).max(200), password: Password }));
  await s.limiter.take('auth', `reset-confirm:${ip(c)}`);
  const r = await one<{ id: string; user_id: string }>(s.db, 'select id, user_id from password_resets where token_hash = $1 and used_at is null and expires_at > now()', [sha256(token)]);
  if (!r) throw new AppError('bad_request', 'This reset link has expired or was already used.');
  await s.db.tx(async (q) => {
    await q.query('update password_resets set used_at = now() where id = $1', [r.id]);
    await q.query('update users set password_hash = $1, updated_at = now() where id = $2', [await hashPassword(password), r.user_id]);
    await q.query('delete from sessions where user_id = $1', [r.user_id]); // sign out everywhere
  });
  return c.json({ ok: true });
});

/** Permanently delete the account: every personal row AND the private files it uploaded. */
authRoutes.post('/delete-account', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  await s.limiter.take('auth', `delete:${a.userId}`);
  await deleteAccount(s, a.userId);
  clearSessionCookie(c);
  return c.json({ ok: true });
});
