// @vitest-environment node
/**
 * Session and authorization audit, pinned as regression tests:
 * cookie flags, session fixation, hashed storage, expiry, reset signs out everywhere,
 * brute-force limits, staff-only endpoints, and cross-account access to private data.
 */
import { createApp } from '../app.ts';
import { loadConfig } from '../config.ts';
import { createServices } from '../services.ts';
import { createTestServer, account, traveller, Client } from './harness.ts';

let t: Awaited<ReturnType<typeof createTestServer>>;
beforeAll(async () => (t = await createTestServer()), 60_000);
afterAll(() => t.close());

const setCookieOf = async (c: Client, path: string, body: unknown) => {
  const res = await t.app.request(`/api${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-saja-csrf': '1', cookie: c.cookie, 'x-forwarded-for': c.ip }, body: JSON.stringify(body) });
  return res.headers.get('set-cookie') ?? '';
};

describe('sessions', () => {
  it('the session cookie is HttpOnly, SameSite=Lax and path-wide; Secure in production', async () => {
    const cookie = await setCookieOf(t.client(), '/auth/guest', {});
    expect(cookie).toMatch(/saja_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).not.toMatch(/Secure/i); // test config serves plain HTTP
    const prod = await createServices(loadConfig({ SAJA_ENV: 'production', PGLITE_DIR: '', DATABASE_URL: '', APP_ORIGIN: 'https://saja.example' } as unknown as NodeJS.ProcessEnv), { db: t.services.db });
    const res = await createApp(prod).request('/api/auth/guest', { method: 'POST', headers: { 'content-type': 'application/json', 'x-saja-csrf': '1', origin: 'https://saja.example' }, body: '{}' });
    expect(res.headers.get('set-cookie')).toMatch(/Secure/i);
  });

  it('signing up or in issues a NEW session: a token known before login is useless after (no fixation)', async () => {
    const c = await traveller(t.client());
    const before = c.cookie;
    await c.post('/auth/signup', { email: 'fixation@example.com', password: 'correct horse battery' });
    expect(c.cookie).not.toBe(before);
    const attacker = new Client(t.app);
    attacker.cookie = before;
    expect((await attacker.get('/auth/me')).data.user).toBeNull();
    const again = new Client(t.app);
    await again.post('/auth/guest');
    const guestToken = again.cookie;
    await again.post('/auth/signin', { email: 'fixation@example.com', password: 'correct horse battery' });
    expect(again.cookie).not.toBe(guestToken);
  });

  it('tokens are stored only as hashes, and expired sessions are refused', async () => {
    const c = await account(t.client(), 'adult', 'hashed@example.com');
    const raw = decodeURIComponent(c.cookie.split('=')[1]);
    const [{ n }] = await t.services.db.query<{ n: number }>('select count(*)::int as n from sessions where token_hash = $1', [raw]);
    expect(n).toBe(0);
    const id = (await c.get('/auth/me')).data.user.id;
    await t.services.db.query("update sessions set expires_at = now() - interval '1 minute' where user_id = $1", [id]);
    expect((await c.get('/auth/me')).data.user).toBeNull();
  });

  it('a password reset signs the account out on every device', async () => {
    const laptop = await account(t.client(), 'adult', 'reset-all@example.com');
    const phone = new Client(t.app);
    await phone.post('/auth/signin', { email: 'reset-all@example.com', password: 'correct horse battery' });
    await t.client().post('/auth/reset/request', { email: 'reset-all@example.com' });
    let mail: { body: string } | undefined;
    for (let i = 0; i < 50 && !mail; i++) {
      [mail] = await t.services.db.query<{ body: string }>("select body from email_outbox where to_email = 'reset-all@example.com'");
      if (!mail) await new Promise((r) => setTimeout(r, 20));
    }
    const token = decodeURIComponent(mail!.body.match(/token=([^\s]+)/)![1]);
    expect((await t.client().post('/auth/reset/confirm', { token, password: 'a brand new password' })).status).toBe(200);
    expect((await laptop.get('/auth/me')).data.user).toBeNull();
    expect((await phone.get('/auth/me')).data.user).toBeNull();
  });

  it('password guessing is rate-limited', async () => {
    await account(t.client(), 'adult', 'guess@example.com');
    const c = t.client();
    const codes: number[] = [];
    for (let i = 0; i < 14; i++) codes.push((await c.post('/auth/signin', { email: 'guess@example.com', password: `wrong password ${i}` })).status);
    expect(codes.slice(0, 3).every((s) => s === 401)).toBe(true);
    expect(codes).toContain(429);
  });
});

describe('authorization', () => {
  it('every staff endpoint refuses learners and guests', async () => {
    const learner = await account(t.client(), 'adult', 'plain-learner@example.com');
    const guest = t.client();
    const endpoints: [string, string][] = [
      ['GET', '/admin/users'],
      ['GET', '/admin/audit'],
      ['GET', '/admin/scholars'],
      ['GET', '/moderation/queue'],
      ['GET', '/content/status'],
      ['GET', '/content/blocks'],
      ['GET', '/knowledge/review/queue'],
      ['GET', '/missions/review/queue'],
      ['GET', '/missions/m-water-path/texts'],
      ['GET', '/missions/m-water-path/history'],
      ['GET', '/knowledge/k-wudu/reviews'],
      ['GET', '/scholar/inbox'],
    ];
    for (const [m, p] of endpoints) {
      expect([401, 403]).toContain((await learner.req(m, p)).status);
      expect([401, 403]).toContain((await guest.req(m, p)).status);
    }
  });

  it('private data is never readable across accounts (IDOR)', async () => {
    const a = await traveller(t.client());
    const b = await traveller(t.client());
    const note = (await a.post('/notifications/schedule', { category: 'prayer', title: { en: 'x', ar: 'x' }, body: { en: 'x', ar: 'x' }, at: new Date(Date.now() + 60_000).toISOString() })).data.id;
    expect((await b.get('/notifications')).data.items.some((i: { id: string }) => i.id === note)).toBe(false);
    await b.post(`/notifications/${note}/read`);
    await b.del(`/notifications/${note}`);
    const [row] = await t.services.db.query<{ status: string }>('select status from notifications where id = $1', [note]);
    expect(row.status).toBe('scheduled');
    const up = (await a.upload('mine.txt', 'text/plain', 'Private words.')).data;
    expect((await b.post('/audits?wait=1', { tool: 'nour', inputKind: 'document', uploadId: up.id })).status).toBe(404);
    expect((await b.get('/day')).data.plan?.userId).not.toBe((await a.get('/auth/me')).data.user.id);
  });
});
