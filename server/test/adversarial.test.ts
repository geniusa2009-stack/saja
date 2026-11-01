// @vitest-environment node
/**
 * Malicious direct API requests. Nothing here goes through the UI: every
 * restriction must hold at the server, whatever the client sends.
 */
import { createTestServer, account, grantRole, makeScholar, traveller, CHARACTER } from './harness.ts';

let t: Awaited<ReturnType<typeof createTestServer>>;
beforeAll(async () => (t = await createTestServer()), 60_000);
afterAll(() => t.close());

async function consentedChild() {
  const kid = await traveller(t.client(), 'child', 'Sara');
  const kidId = (await kid.get('/auth/me')).data.user.id;
  const { code } = (await kid.post('/guardian/link-code')).data;
  const parent = await account(t.client(), 'adult', `adv-parent-${Math.random()}@example.com`);
  await parent.post('/guardian/accept', { code, consent: true });
  await parent.post(`/guardian/children/${kidId}/circles/garden`);
  await kid.post('/circles/garden/join');
  return { kid, kidId, parent };
}

describe('age separation', () => {
  it('an adult can’t see, join or read a children’s circle', async () => {
    const adult = await account(t.client(), 'adult', 'adv-adult@example.com');
    expect((await adult.get('/circles/garden')).status).toBe(404);
    expect((await adult.post('/circles/garden/join')).status).toBe(404);
    expect((await adult.get('/circles/garden/messages')).status).toBe(404);
    expect((await adult.post('/circles/garden/messages', { body: 'hi kids' })).status).toBe(404);
    expect((await adult.get('/circles')).data.circles.some((c: { id: string }) => c.id === 'garden')).toBe(false);
  });

  it('bands never mix: a teen can’t enter an adult circle, a child can’t read a teen circle', async () => {
    const teen = await account(t.client(), 'teen', 'adv-teen@example.com');
    expect((await teen.post('/circles/first-steps/join')).status).toBe(404);
    const { kid } = await consentedChild();
    expect((await kid.get('/circles/nour-teens/messages')).status).toBe(404);
  });

  it('a forged age is ignored: the profile can’t carry an age, and a child can’t declare themselves older', async () => {
    const kid = await traveller(t.client(), 'child', 'Omar');
    await kid.put('/profile', { displayName: 'Omar', locale: 'en', purpose: 'child', level: 'beginner', modality: 'hands-on', goals: [], interests: [], character: CHARACTER, completed: true, ageBand: 'adult', age: { approved: 'adult' } });
    expect((await kid.post('/profile/age', { band: 'adult' })).status).toBe(403);
    const me = (await kid.get('/auth/me')).data.user;
    expect(me.ageBand).toBe('child');
    expect((await kid.get('/circles')).data.circles.every((c: { id: string }) => c.id === 'garden')).toBe(true);
  });
});

describe('child safety in messages', () => {
  it('blocks personal information and off-platform contact from children before storing it', async () => {
    const { kid } = await consentedChild();
    for (const body of ['my number is 0551234567', 'add me on snapchat @sara_22', 'lets meet at the park after school', 'email me sara@example.com']) {
      const r = await kid.post('/circles/garden/messages', { body });
      expect(r.status).toBe(422);
    }
    const [{ n }] = await t.services.db.query<{ n: number }>("select count(*)::int as n from chat_messages where body like '%0551234567%' or body like '%snapchat%'");
    expect(n).toBe(0);
  });

  it('altered requests are refused: fake quick replies, cross-circle replies, oversized bodies', async () => {
    const { kid, parent, kidId } = await consentedChild();
    await parent.put(`/guardian/children/${kidId}/settings`, { approveCircles: true, quickRepliesOnly: true, dailyMinutes: 45 });
    expect((await kid.post('/circles/garden/messages', { body: 'my own words' })).status).toBe(403);
    expect((await kid.post('/circles/garden/messages', { body: 'call me 0551234567', quickReply: true })).status).toBe(400);
    const [other] = await t.services.db.query<{ id: string }>("select id from chat_messages where circle_id = 'first-steps' limit 1");
    await parent.put(`/guardian/children/${kidId}/settings`, { approveCircles: true, quickRepliesOnly: false, dailyMinutes: 45 });
    expect((await kid.post('/circles/garden/messages', { body: 'nice!', replyTo: other.id })).status).toBe(400);
    expect((await kid.post('/circles/garden/messages', { body: 'x'.repeat(600) })).status).toBe(400);
  });

  it('a child can’t change their own guardian settings or approve their own circles', async () => {
    const { kid, kidId } = await consentedChild();
    expect((await kid.put(`/guardian/children/${kidId}/settings`, { approveCircles: false, quickRepliesOnly: false, dailyMinutes: 0 })).status).toBe(403);
    expect((await kid.post(`/guardian/children/${kidId}/circles/garden`)).status).toBe(403);
    expect((await kid.post(`/guardian/children/${kidId}/age`, { band: 'adult' })).status).toBe(403);
  });

  it('a blocked person’s messages disappear for the blocker', async () => {
    const a = await account(t.client(), 'adult', 'adv-block-a@example.com');
    const b = await account(t.client(), 'adult', 'adv-block-b@example.com');
    await a.post('/circles/first-steps/join');
    await b.post('/circles/first-steps/join');
    await b.post('/circles/first-steps/messages', { body: 'a message from b' });
    await a.post(`/blocks/${(await b.get('/auth/me')).data.user.id}`);
    const msgs = (await a.get('/circles/first-steps/messages')).data.messages;
    expect(msgs.some((m: { body: string }) => m.body === 'a message from b')).toBe(false);
  });
});

describe('forged roles and verification', () => {
  it('roles can’t be claimed by the client', async () => {
    const c = await account(t.client(), 'adult', 'adv-role@example.com');
    await c.put('/profile', { displayName: 'X', locale: 'en', purpose: 'learn-more', level: 'beginner', modality: 'hands-on', goals: [], interests: [], character: CHARACTER, completed: true, roles: ['admin'] });
    expect((await c.get('/auth/me')).data.user.roles).toEqual(['learner']);
    for (const [m, p] of [
      ['get', '/moderation/queue'],
      ['get', '/admin/users?q=example'],
      ['get', '/admin/audit'],
      ['get', '/admin/scholars'],
      ['get', '/knowledge/review/queue'],
    ] as const) {
      expect((await c[m](p)).status).toBe(403);
    }
    const self = (await c.get('/auth/me')).data.user.id;
    expect((await c.post(`/admin/users/${self}/roles`, { role: 'admin', grant: true, reason: 'please' })).status).toBe(403);
  });

  it('a scholar can’t verify themselves or act before verification', async () => {
    const c = await account(t.client(), 'adult', 'adv-scholar@example.com');
    const pid = await makeScholar(t.services, (await c.get('/auth/me')).data.user.id, 'pending');
    expect((await c.post(`/admin/scholars/${pid}/verification`, { status: 'verified', scope: 'everything' })).status).toBe(403);
    expect((await c.get('/scholar/inbox')).status).toBe(403);
    expect((await c.post('/knowledge/k-wudu/review', { to: 'internal_review', scope: 'x-scope' })).status).toBe(200); // staff can move drafts…
    await c.post('/knowledge/k-wudu/review', { to: 'scholar_review', scope: 'x-scope' });
    expect((await c.post('/knowledge/k-wudu/review', { to: 'approved', scope: 'x-scope' })).status).toBe(403); // …but only a verified scholar approves
  });

  it('admins manage roles with a recorded reason, and can’t lock themselves out', async () => {
    const admin = await account(t.client(), 'adult', 'adv-admin@example.com');
    const adminId = (await admin.get('/auth/me')).data.user.id;
    await grantRole(t.services, adminId, 'admin');
    const target = await account(t.client(), 'adult', 'adv-target@example.com');
    const tid = (await target.get('/auth/me')).data.user.id;
    const found = (await admin.get('/admin/users?q=adv-target')).data.users;
    expect(found[0].id).toBe(tid);
    expect((await admin.post(`/admin/users/${tid}/roles`, { role: 'moderator', grant: true, reason: 'community lead' })).status).toBe(200);
    expect((await target.get('/auth/me')).data.user.roles).toContain('moderator');
    expect((await admin.post(`/admin/users/${adminId}/roles`, { role: 'admin', grant: false, reason: 'oops' })).status).toBe(400);
    const guest = await traveller(t.client());
    expect((await admin.post(`/admin/users/${(await guest.get('/auth/me')).data.user.id}/roles`, { role: 'moderator', grant: true, reason: 'x-reason' })).status).toBe(400);
    const audit = (await admin.get('/admin/audit')).data.entries;
    expect(audit.some((e: { detail: string }) => /granted role moderator: community lead/.test(e.detail ?? ''))).toBe(true);
  });
});

describe('object-level access', () => {
  it('nobody can act on someone else’s attempts, questions, notifications or audits', async () => {
    const a = await traveller(t.client());
    const b = await traveller(t.client());
    const at = (await a.post('/missions/m-water-path/attempts', { modality: 'hands-on' })).data.attemptId;
    expect((await b.post(`/attempts/${at}/complete`, { modality: 'hands-on', durationMs: 1000 })).status).toBe(404);
    expect((await b.post(`/attempts/${at}/signals`, { signals: [{ kind: 'hint' }] })).status).toBe(404);
    const q = (await a.post('/scholar/questions', { question: 'What breaks wudu exactly?', topic: 'purification' })).data.question;
    expect((await b.del(`/scholar/questions/${q.id}`)).status).toBe(409);
    expect((await a.get('/scholar/questions')).data.questions[0].status).not.toBe('withdrawn');
    const audit = (await a.post('/audits?wait=1', { tool: 'nour', inputKind: 'text', text: 'Fasting in Ramadan is one of the five pillars of Islam.' })).data;
    expect((await b.get(`/audits/${audit.id}`)).status).toBe(404);
    expect((await b.post(`/audits/${audit.id}/claims/${audit.claims[0].id}/revision`, { after: 'x' })).status).toBe(404);
    expect((await b.get('/audits')).data.audits).toHaveLength(0);
  });

  it('malformed ids are 404, not server errors', async () => {
    const a = await traveller(t.client());
    for (const p of ['/audits/not-a-uuid', '/dm/xyz/messages', '/knowledge/%27%3Bdrop%20table%20users', '/missions/..%2F..%2Fetc']) {
      const r = await a.get(p);
      expect([400, 403, 404]).toContain(r.status);
    }
  });
});

describe('sessions and CSRF', () => {
  it('refuses writes without the CSRF header or from another origin', async () => {
    const c = await traveller(t.client());
    expect((await c.req('POST', '/siraj/ask', { text: 'x', ctx: { locale: 'en' } }, { csrf: false })).status).toBe(403);
    expect((await c.req('POST', '/siraj/ask', { text: 'x', ctx: { locale: 'en' } }, { origin: 'https://evil.example' })).status).toBe(403);
  });

  it('a tampered or stolen-then-revoked session cookie is just "signed out"', async () => {
    const c = await account(t.client(), 'adult', 'adv-session@example.com');
    const stolen = c.cookie;
    c.cookie = 'saja_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    expect((await c.get('/auth/me')).data.user).toBeNull();
    c.cookie = stolen;
    await c.post('/auth/signout');
    c.cookie = stolen; // replaying the old cookie after sign-out
    expect((await c.get('/auth/me')).data.user).toBeNull();
  });
});

describe('forged guardians', () => {
  it('a guessed, reused or self-issued code never makes someone a guardian', async () => {
    const kid = await traveller(t.client(), 'child', 'Huda');
    const kidId = (await kid.get('/auth/me')).data.user.id;
    const stranger = await account(t.client(), 'adult', `adv-stranger-${Math.random()}@example.com`);
    expect((await stranger.post('/guardian/accept', { code: 'ABCDEFGH', consent: true })).status).toBe(400);
    const { code } = (await kid.post('/guardian/link-code')).data;
    expect((await stranger.post('/guardian/accept', { code, consent: false })).status).toBe(400); // consent must be explicit
    // Children and teens can't be anyone's guardian — not even with a valid code.
    const teen = await account(t.client(), 'teen', `adv-teen-g-${Math.random()}@example.com`);
    expect((await teen.post('/guardian/accept', { code, consent: true })).status).toBe(403);
    const parent = await account(t.client(), 'adult', `adv-real-parent-${Math.random()}@example.com`);
    expect((await parent.post('/guardian/accept', { code, consent: true })).status).toBe(200);
    // The code is single-use.
    expect((await stranger.post('/guardian/accept', { code, consent: true })).status).toBe(400);
    // An adult who isn't the guardian can't read or change anything about the child.
    expect((await stranger.get('/guardian/children')).data.children ?? []).toHaveLength(0);
    for (const [m, p, b] of [
      ['PUT', `/guardian/children/${kidId}/settings`, { approveCircles: false, quickRepliesOnly: false, dailyMinutes: 240 }],
      ['POST', `/guardian/children/${kidId}/circles/garden`, {}],
      ['POST', `/guardian/children/${kidId}/extend`, { minutes: 60 }],
      ['POST', `/guardian/children/${kidId}/age`, { band: 'adult' }],
      ['POST', `/guardian/children/${kidId}/revoke`, {}],
    ] as const) {
      expect([403, 404]).toContain((await stranger.req(m, p, b)).status);
    }
    // The child can't approve or extend for themselves either.
    expect([403, 404]).toContain((await kid.post(`/guardian/children/${kidId}/extend`, { minutes: 60 })).status);
    const me = (await kid.get('/auth/me')).data.user;
    expect(me.parental.dailyMinutes).toBe(45);
  });
});

describe('upload abuse', () => {
  it('refuses disguised, oversized and empty files, and never serves raw files back', async () => {
    const c = await traveller(t.client());
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    expect((await c.upload('photo.png', 'image/png', exe)).status).toBe(415); // content doesn't match the claimed type
    expect((await c.upload('script.svg', 'image/svg+xml', '<svg onload="alert(1)"/>')).status).toBe(415);
    expect((await c.upload('page.html', 'text/html', '<script>alert(1)</script>')).status).toBe(415);
    expect((await c.upload('empty.txt', 'text/plain', '')).status).toBe(400);
    const big = new Uint8Array(t.services.config.MAX_UPLOAD_MB * 1_048_576 + 10).fill(0x41);
    expect((await c.upload('big.txt', 'text/plain', big)).status).toBe(413);
    // A path in the name is not kept; the stored name is generic.
    const ok = await c.upload('../../etc/passwd.txt', 'text/plain', 'Fasting in Ramadan is one of the five pillars.');
    expect(ok.status).toBe(201);
    const [row] = await t.services.db.query<{ original_name: string; storage_key: string }>('select original_name, storage_key from uploads where id = $1', [ok.data.id]);
    expect(row.original_name).toBe('upload.txt');
    expect(row.storage_key).not.toMatch(/\.\.|passwd/);
    // There is no endpoint that returns an upload's bytes.
    expect([404, 405]).toContain((await c.get(`/uploads/${ok.data.id}`)).status);
    // Someone else can't audit or delete it.
    const other = await traveller(t.client());
    expect((await other.post('/audits?wait=1', { tool: 'nour', inputKind: 'document', uploadId: ok.data.id })).status).toBe(404);
    await other.del(`/uploads/${ok.data.id}`);
    const [still] = await t.services.db.query<{ deleted_at: string | null }>('select deleted_at from uploads where id = $1', [ok.data.id]);
    expect(still.deleted_at).toBeNull();
  });
});

describe('moderation bypass', () => {
  it('held messages stay hidden from others, can’t be reacted or replied to, and only moderators decide', async () => {
    const author = await account(t.client(), 'adult', `adv-held-${Math.random()}@example.com`);
    const reader = await account(t.client(), 'adult', `adv-reader-${Math.random()}@example.com`);
    const circle = ((await author.get('/circles')).data.circles as { id: string }[])[0].id;
    await author.post(`/circles/${circle}/join`);
    await reader.post(`/circles/${circle}/join`);
    const held = (await author.post(`/circles/${circle}/messages`, { body: 'whatsapp me 0551234567' })).data.message;
    expect(held.status).toBe('held');
    expect(((await reader.get(`/circles/${circle}/messages`)).data.messages as { id: string }[]).some((m) => m.id === held.id)).toBe(false);
    expect([403, 404]).toContain((await reader.post(`/messages/${held.id}/reactions`, { emoji: 'heart' })).status);
    expect([400, 404]).toContain((await reader.post(`/circles/${circle}/messages`, { body: 'replying', replyTo: held.id })).status);
    for (const who of [author, reader]) expect((await who.post(`/moderation/messages/${held.id}`, { action: 'allow', reason: 'looks fine to me' })).status).toBe(403);
    expect((await reader.get('/moderation/queue')).status).toBe(403);
    const [row] = await t.services.db.query<{ status: string }>('select status from chat_messages where id = $1', [held.id]);
    expect(row.status).toBe('held');
  });
});

describe('scholar impersonation and publishing', () => {
  it('names can’t claim staff or scholar status, and only verified scholars answer', async () => {
    const c = await traveller(t.client());
    for (const displayName of ['Verified Scholar', 'SAJA Moderator', 'Mufti Ahmad', 'admin', 'عالم موثّق', 'مشرف سجى']) {
      expect((await c.put('/profile', { displayName, locale: 'en', purpose: 'learn-more', level: 'beginner', modality: 'hands-on', goals: [], interests: [], character: CHARACTER, completed: true })).status).toBe(400);
    }
    const learner = await account(t.client(), 'adult', `adv-imp-${Math.random()}@example.com`);
    const q = (await learner.post('/scholar/questions', { question: 'How do I make up missed prayers?', topic: 'prayer' })).data.question;
    const faker = await account(t.client(), 'adult', `adv-faker-${Math.random()}@example.com`);
    const answer = { body: { en: 'Here is my ruling.', ar: 'هذا حكمي.' }, sources: ["Qur'an 2:286"] };
    expect((await faker.post(`/scholar/questions/${q.id}/answer`, answer)).status).toBe(403);
    await grantRole(t.services, (await faker.get('/auth/me')).data.user.id, 'scholar'); // a role alone isn't verification
    expect((await faker.post(`/scholar/questions/${q.id}/claim`)).status).toBe(403);
    expect((await faker.post(`/scholar/questions/${q.id}/answer`, answer)).status).toBe(403);
    expect((await learner.get('/scholar/questions')).data.questions[0].answer).toBeNull();
  });

  it('the client can’t publish content or mark it reviewed', async () => {
    const learner = await account(t.client(), 'adult', `adv-pub-${Math.random()}@example.com`);
    const mod = await account(t.client(), 'adult', `adv-mod-${Math.random()}@example.com`);
    await grantRole(t.services, (await mod.get('/auth/me')).data.user.id, 'moderator');
    for (const who of [learner, mod]) {
      expect([403, 409]).toContain((await who.post('/knowledge/k-wudu/review', { to: 'published', scope: 'publish it' })).status);
      expect([403, 409]).toContain((await who.post('/missions/m-water-path/review', { to: 'published', scope: 'publish it' })).status);
      expect([403, 409]).toContain((await who.post('/content/blocks/claim_rule/five-prayers/review', { to: 'approved', scope: 'approve it' })).status);
    }
    const admin = await account(t.client(), 'adult', `adv-admin-pub-${Math.random()}@example.com`);
    await grantRole(t.services, (await admin.get('/auth/me')).data.user.id, 'admin');
    expect((await admin.post('/knowledge/k-wudu/review', { to: 'published', scope: 'skip review' })).status).toBe(409); // not approved
    const doc = (await learner.get('/knowledge/k-wudu')).data;
    expect(doc).toMatchObject({ status: 'demo', isDemo: true });
  });
});
