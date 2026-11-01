// @vitest-environment node
import { createTestServer, traveller, account, grantRole, makeScholar } from './harness.ts';

let t: Awaited<ReturnType<typeof createTestServer>>;
beforeAll(async () => (t = await createTestServer()), 60_000);
afterAll(() => t.close());

describe('Ask a Scholar workflow', () => {
  it('organises a question as labelled AI assistance and redacts personal details', async () => {
    const c = await traveller(t.client());
    const r = (await c.post('/scholar/organize', { question: 'i am travelling for a week call me 0551234567 how do i pray' })).data;
    expect(r.kind).toBe('ai-assistance');
    expect(r.question).toMatch(/number removed/);
    expect(r.topic).toBe('prayer');
  });

  it('runs the full queue: submit → verified scholar claims → answers → asker notified', async () => {
    const learner = await traveller(t.client());
    const sub = (await learner.post('/scholar/questions', { question: 'My number is 0551234567. How should I pray while travelling?', topic: 'prayer' })).data.question;
    expect(sub.status).toBe('queued');
    expect(sub.question).not.toMatch(/0551234567/);
    expect(sub.redacted).toBe(true);

    const pending = await account(t.client(), 'adult', 'pending@example.com');
    await makeScholar(t.services, (await pending.get('/auth/me')).data.user.id, 'pending');
    expect((await pending.get('/scholar/inbox')).status).toBe(403);

    const scholar = await account(t.client(), 'adult', 'verified@example.com');
    await makeScholar(t.services, (await scholar.get('/auth/me')).data.user.id, 'verified');
    const inbox = (await scholar.get('/scholar/inbox')).data.questions;
    const item = inbox.find((q: { id: string }) => q.id === sub.id);
    expect(item).toBeTruthy();
    expect(item.asker_id).toBeUndefined(); // scholars never see who asked
    expect((await scholar.post(`/scholar/questions/${sub.id}/answer`, { body: { en: 'x' }, sources: [] })).status).toBe(403); // must claim first
    expect((await scholar.post(`/scholar/questions/${sub.id}/claim`)).status).toBe(200);
    expect((await scholar.post(`/scholar/questions/${sub.id}/answer`, { body: { en: 'Shorten and combine as travellers may, per your school.' }, sources: ["Qur'an 4:101"] })).status).toBe(201);

    const mine = (await learner.get('/scholar/questions')).data.questions[0];
    expect(mine.status).toBe('answered');
    expect(mine.answer.scholar.verification).toBe('verified');
    expect(mine.answer.scholar.isDemo).toBe(false);
    expect((await learner.get('/notifications')).data.items.some((n: { category: string }) => n.category === 'scholar')).toBe(true);
  });

  it('never shows sample profiles as verified, and they can never be verified', async () => {
    const samples = (await t.client().get('/scholar/samples')).data.questions;
    expect(samples.length).toBe(2);
    for (const q of samples) {
      expect(q.answer.isDemo).toBe(true);
      expect(q.answer.scholar.verification).toBe('sample'); // an explicit state of its own, never 'verified'
      expect(q.answer.scholar.name).toMatch(/sample/);
    }
    const admin = await account(t.client(), 'adult', 'admin2@example.com');
    await grantRole(t.services, (await admin.get('/auth/me')).data.user.id, 'admin');
    const list = (await admin.get('/admin/scholars')).data.scholars;
    const demo = list.find((x: { profile: { isDemo: boolean } }) => x.profile.isDemo);
    expect((await admin.post(`/admin/scholars/${demo.profile.id}/verification`, { status: 'verified', scope: 'test' })).status).toBe(403);
    // Nor can a sample be moved to any other state (pending, suspended, …).
    for (const status of ['pending', 'unverified', 'suspended']) expect((await admin.post(`/admin/scholars/${demo.profile.id}/verification`, { status, scope: 'test' })).status).toBe(403);
    expect((await admin.post(`/admin/scholars/${demo.profile.id}/verification`, { status: 'sample', scope: 'test' })).status).toBe(400);
  });

  it('records who verified a scholar, when, and for what scope', async () => {
    const admin = await account(t.client(), 'adult', 'admin3@example.com');
    const adminId = (await admin.get('/auth/me')).data.user.id;
    await grantRole(t.services, adminId, 'admin');
    const person = await account(t.client(), 'adult', 'new-scholar@example.com');
    const pid = (await person.get('/auth/me')).data.user.id;
    const created = (await admin.post('/admin/scholars', { userId: pid, displayName: 'Dr. Test', title: { en: 'Scholar', ar: 'عالم' }, specialization: { en: 'Fiqh', ar: 'فقه' }, languages: ['English'], credentials: [{ type: 'Ijazah', issuer: 'Example Institute', year: 2015 }] })).data;
    expect(created.status).toBe('pending');
    expect((await person.get('/scholar/inbox')).status).toBe(403);
    await admin.post(`/admin/scholars/${created.id}/verification`, { status: 'verified', scope: 'worship (ibadat)' });
    const p = (await t.client().get(`/scholars/${created.id}`)).data.profile;
    expect(p.verification).toBe('verified');
    expect(p.scope).toBe('worship (ibadat)');
    expect(p.verifiedAt).toBeTruthy();
    expect((await person.get('/scholar/inbox')).status).toBe(200);
    expect((await traveller(t.client()).then((c) => c.post(`/admin/scholars/${created.id}/verification`, { status: 'suspended', scope: 'x' }))).status).toBe(403);
  });

  it('holds unsafe questions for moderation and lets askers withdraw', async () => {
    const c = await traveller(t.client());
    const held = (await c.post('/scholar/questions', { question: 'send me money via gift cards and I will pray for you', topic: 'other' })).data.question;
    expect(held.status).toBe('held');
    const ok = (await c.post('/scholar/questions', { question: 'Is it ok to read Quran from my phone?', topic: 'quran' })).data.question;
    expect((await c.del(`/scholar/questions/${ok.id}`)).status).toBe(200);
    expect((await c.get('/scholar/questions')).data.questions.some((q: { id: string }) => q.id === ok.id)).toBe(false);
  });
});

describe('held scholar questions need a human decision', () => {
  let t: Awaited<ReturnType<typeof createTestServer>>;
  beforeAll(async () => (t = await createTestServer()), 60_000);
  afterAll(() => t.close());

  it('a moderator releases or rejects a held question; learners cannot', async () => {
    const learner = await traveller(t.client());
    const sub = (await learner.post('/scholar/questions', { question: 'Message me on whatsapp to discuss how to pray, add me there', topic: 'prayer' })).data.question;
    expect(sub.status).toBe('held');
    expect((await learner.post(`/moderation/questions/${sub.id}`, { action: 'release', reason: 'self-release' })).status).toBe(403);
    const mod = await account(t.client(), 'adult', 'mod-q@example.com');
    await grantRole(t.services, (await mod.get('/auth/me')).data.user.id, 'moderator');
    expect((await mod.get('/moderation/queue')).data.questions.some((q: { id: string }) => q.id === sub.id)).toBe(true);
    expect((await mod.post(`/moderation/questions/${sub.id}`, { action: 'reject', reason: 'asks for off-platform contact' })).status).toBe(200);
    expect((await mod.post(`/moderation/questions/${sub.id}`, { action: 'release', reason: 'again' })).status).toBe(409);
    expect((await learner.get('/scholar/questions')).data.questions[0].status).toBe('rejected');
    const audit = (await mod.get(`/moderation/audit/question/${sub.id}`)).data.actions;
    expect(audit.at(-1)).toMatchObject({ actor_kind: 'human', action: 'remove' });
  });
});

describe('scholar workflow integrity', () => {
  let t: Awaited<ReturnType<typeof createTestServer>>;
  beforeAll(async () => (t = await createTestServer()), 60_000);
  afterAll(() => t.close());

  async function verifiedScholar(email: string) {
    const c = await account(t.client(), 'adult', email);
    const pid = await makeScholar(t.services, (await c.get('/auth/me')).data.user.id, 'verified');
    return { c, pid };
  }

  it('keeps answer provenance, even after the scholar is later suspended', async () => {
    const learner = await traveller(t.client());
    const q = (await learner.post('/scholar/questions', { question: 'Can I combine prayers when travelling?', topic: 'prayer' })).data.question;
    const { c: sch, pid } = await verifiedScholar('prov-scholar@example.com');
    await sch.post(`/scholar/questions/${q.id}/claim`);
    await sch.post(`/scholar/questions/${q.id}/answer`, { body: { en: 'Yes, travellers may combine, per the conditions your school sets.' }, sources: ["Sahih Muslim 705"] });
    const admin = await account(t.client(), 'adult', 'prov-admin@example.com');
    await grantRole(t.services, (await admin.get('/auth/me')).data.user.id, 'admin');
    await admin.post(`/admin/scholars/${pid}/verification`, { status: 'suspended', scope: 'credentials under review' });
    const mine = (await learner.get('/scholar/questions')).data.questions[0];
    expect(mine.answer.provenance).toMatchObject({ scholarId: pid, verification: 'verified', scope: 'fiqh of worship', aiAssisted: false });
    expect(mine.answer.scholar.verification).toBe('suspended'); // the UI shows today's status next to the historical record
    const events = (await admin.get(`/admin/scholars/questions/${q.id}/events`)).data.events.map((e: { event: string }) => e.event);
    expect(events).toEqual(['submitted', 'claimed', 'answered']);
    expect((await sch.get(`/admin/scholars/questions/${q.id}/events`)).status).toBe(403);
  });

  it('a scholar can’t claim their own question; release returns it to the queue; suspension frees claims', async () => {
    const { c: a } = await verifiedScholar('own-q@example.com');
    const own = (await a.post('/scholar/questions', { question: 'How long is the travel distance for shortening?', topic: 'prayer' })).data.question;
    expect((await a.post(`/scholar/questions/${own.id}/claim`)).status).toBe(409);
    const { c: b, pid: bId } = await verifiedScholar('other-q@example.com');
    expect((await b.post(`/scholar/questions/${own.id}/claim`)).status).toBe(200);
    expect((await a.post(`/scholar/questions/${own.id}/release`)).status).toBe(409); // not theirs
    expect((await b.post(`/scholar/questions/${own.id}/release`)).status).toBe(200);
    expect((await b.post(`/scholar/questions/${own.id}/claim`)).status).toBe(200);
    const admin = await account(t.client(), 'adult', 'susp-admin@example.com');
    await grantRole(t.services, (await admin.get('/auth/me')).data.user.id, 'admin');
    await admin.post(`/admin/scholars/${bId}/verification`, { status: 'suspended', scope: 'review' });
    const [row] = await t.services.db.query<{ status: string }>('select status from scholar_questions where id = $1', [own.id]);
    expect(row.status).toBe('queued');
    expect((await b.get('/scholar/inbox')).status).toBe(403);
  });

  it('a profile flagged as sample data can’t act as a scholar, and the AI never answers', async () => {
    const { c, pid } = await verifiedScholar('flagged@example.com');
    // The database refuses a profile that is both sample data and "verified"…
    await expect(t.services.db.query('update scholar_profiles set is_demo = true where id = $1', [pid])).rejects.toThrow();
    // …so the only way to be sample data is the SAMPLE state, which can't act.
    await t.services.db.query("update scholar_profiles set is_demo = true, verification_status = 'sample' where id = $1", [pid]);
    expect((await c.get('/scholar/inbox')).status).toBe(403);
    const learner = await traveller(t.client());
    const o = (await learner.post('/scholar/organize', { question: 'is it haram to pray in shoes?' })).data;
    expect(o.kind).toBe('ai-assistance');
    expect(Object.keys(o)).not.toContain('answer');
  });
});
