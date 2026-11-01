// @vitest-environment node
import { createTestServer, traveller, account } from './harness.ts';

let t: Awaited<ReturnType<typeof createTestServer>>;
beforeAll(async () => {
  t = await createTestServer();
}, 60_000);
afterAll(() => t.close());

describe('authentication', () => {
  it('starts a guest journey without any form', async () => {
    const c = t.client();
    const r = await c.post('/auth/guest');
    expect(r.status).toBe(201);
    expect(r.data.user.isGuest).toBe(true);
    expect(c.cookie).toMatch(/saja_session=/);
    expect((await c.get('/auth/me')).data.user.id).toBe(r.data.user.id);
  });

  it('upgrades a guest into an account without losing the journey', async () => {
    const c = await traveller(t.client(), 'adult', 'Maryam');
    const guestId = (await c.get('/auth/me')).data.user.id;
    const r = await c.post('/auth/signup', { email: 'maryam@example.com', password: 'correct horse battery' });
    expect(r.status).toBe(201);
    expect(r.data.user.id).toBe(guestId);
    expect(r.data.user.isGuest).toBe(false);
    expect(r.data.profile.display_name).toBe('Maryam');
  });

  it('signs in, signs out and rejects wrong passwords with one generic message', async () => {
    await account(t.client(), 'adult', 'omar@example.com');
    const c = t.client();
    const bad = await c.post('/auth/signin', { email: 'omar@example.com', password: 'nope nope nope' });
    const unknown = await c.post('/auth/signin', { email: 'nobody@example.com', password: 'nope nope nope' });
    expect(bad.status).toBe(401);
    expect(unknown.data.error.message).toBe(bad.data.error.message);
    const ok = await c.post('/auth/signin', { email: 'OMAR@example.com', password: 'correct horse battery' });
    expect(ok.status).toBe(200);
    await c.post('/auth/signout');
    expect((await c.get('/auth/me')).data.user).toBeNull();
  });

  it('refuses duplicate emails and weak passwords', async () => {
    const c = t.client();
    await c.post('/auth/guest');
    expect((await c.post('/auth/signup', { email: 'omar@example.com', password: 'correct horse battery' })).status).toBe(409);
    expect((await c.post('/auth/signup', { email: 'x@example.com', password: 'short' })).status).toBe(400);
  });

  it('resets a password with a single-use token delivered via the outbox', async () => {
    await account(t.client(), 'adult', 'reset@example.com');
    const c = t.client();
    const r = await c.post('/auth/reset/request', { email: 'reset@example.com' });
    expect(r.data).toEqual({ ok: true, delivery: 'dev-outbox' });
    // The email is sent in the background (so the response can't reveal whether the account exists).
    let mail: { body: string } | undefined;
    for (let i = 0; i < 50 && !mail; i++) {
      [mail] = await t.services.db.query<{ body: string }>("select body from email_outbox where to_email = 'reset@example.com' order by created_at desc limit 1");
      if (!mail) await new Promise((r) => setTimeout(r, 20));
    }
    if (!mail) throw new Error('no reset email');
    const token = decodeURIComponent(mail.body.match(/token=([^\s]+)/)![1]);
    expect((await c.post('/auth/reset/confirm', { token, password: 'a brand new password' })).status).toBe(200);
    expect((await c.post('/auth/reset/confirm', { token, password: 'another new password' })).status).toBe(400);
    expect((await c.post('/auth/signin', { email: 'reset@example.com', password: 'a brand new password' })).status).toBe(200);
  });

  it('blocks cross-site writes (CSRF)', async () => {
    const c = t.client();
    expect((await c.req('POST', '/auth/guest', {}, { csrf: false })).status).toBe(403);
    expect((await c.req('POST', '/auth/guest', {}, { origin: 'https://evil.example' })).status).toBe(403);
  });

  it('reports honest capability modes', async () => {
    const r = await t.client().get('/system/status');
    expect(r.data.modes.ai).toBe('demo');
    expect(r.data.modes.transcription).toBe('unavailable');
    expect(r.data.content.reviewed).toBe(false);
  });
});

describe('age & consent states', () => {
  it('does not let a child self-promote to adult', async () => {
    const c = await traveller(t.client(), 'child');
    const r = await c.post('/profile/age', { band: 'adult' });
    expect(r.status).toBe(403);
    expect(r.data.error.details.needsGuardian).toBe(true);
    const me = (await c.get('/auth/me')).data.user;
    expect(me.ageBand).toBe('child');
    expect(me.age.consent).toBe('pending');
    expect(me.communityAllowed).toBe(false);
  });

  it('records guardian consent through a link code accepted by an adult account', async () => {
    const child = await traveller(t.client(), 'child', 'Zaid');
    const { code } = (await child.post('/guardian/link-code')).data;
    const guardian = await account(t.client(), 'adult', 'parent@example.com');
    expect((await guardian.post('/guardian/accept', { code, consent: true })).status).toBe(200);
    const me = (await child.get('/auth/me')).data.user;
    expect(me.age.consent).toBe('granted');
    expect(me.communityAllowed).toBe(true);
    const kids = (await guardian.get('/guardian/children')).data.children;
    expect(kids[0].name).toBe('Zaid');
  });

  it('refuses guardianship from guests and children', async () => {
    const child = await traveller(t.client(), 'child');
    const { code } = (await child.post('/guardian/link-code')).data;
    const guest = await traveller(t.client(), 'adult');
    expect((await guest.post('/guardian/accept', { code, consent: true })).status).toBe(403);
  });
});
