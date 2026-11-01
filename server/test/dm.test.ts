// @vitest-environment node
/** Adult-only private messages: full flow, and every way it must refuse. */
import { createTestServer, account, grantRole, traveller } from './harness.ts';
import type { Client } from './harness.ts';

let t: Awaited<ReturnType<typeof createTestServer>>;
beforeAll(async () => (t = await createTestServer()), 60_000);
afterAll(() => t.close());

let n = 0;
async function adult(circle = 'first-steps'): Promise<[Client, string]> {
  const c = await account(t.client(), 'adult', `dm-user-${++n}@example.com`);
  await c.post(`/circles/${circle}/join`);
  return [c, (await c.get('/auth/me')).data.user.id];
}

describe('private messages (adults only)', () => {
  it('request → accept → message → report → moderator decision, with notifications', async () => {
    const [a] = await adult();
    const [b, bId] = await adult();
    const req = await a.post('/dm/request', { userId: bId });
    expect(req.status).toBe(201);
    const { threadId } = req.data;
    expect((await b.get('/dm')).data.threads[0]).toMatchObject({ id: threadId, status: 'requested', requested_by_me: false });
    expect((await b.get('/notifications')).data.items.some((i: { title: { en: string } }) => i.title.en === 'A message request')).toBe(true);
    expect((await a.post(`/dm/${threadId}/respond`, { accept: true })).status).toBe(409); // the requester can't accept for the other person
    expect((await b.post(`/dm/${threadId}/respond`, { accept: true })).data.status).toBe('active');

    const sent = await a.post(`/dm/${threadId}/messages`, { body: 'Thanks for explaining ruku yesterday!' });
    expect(sent.data.status).toBe('visible');
    const got = (await b.get(`/dm/${threadId}/messages`)).data.messages;
    expect(got.map((m: { body: string }) => m.body)).toContain('Thanks for explaining ruku yesterday!');
    expect((await b.get('/dm')).data.threads[0].last.body).toBe('Thanks for explaining ruku yesterday!');

    // Off-platform contact is held for a moderator and never reaches the other person.
    const held = await a.post(`/dm/${threadId}/messages`, { body: 'add me on whatsapp 0551234567' });
    expect(held.data.status).toBe('held');
    expect((await b.get(`/dm/${threadId}/messages`)).data.messages.some((m: { id: string }) => m.id === held.data.id)).toBe(false);

    // Report as unsafe: hidden immediately, visible to moderators.
    expect((await b.post(`/dm/${threadId}/messages/${sent.data.id}/report`, { reason: 'unsafe' })).status).toBe(201);
    expect((await b.get(`/dm/${threadId}/messages`)).data.messages.some((m: { id: string }) => m.id === sent.data.id)).toBe(false);
    const [mod, modId] = await adult();
    await grantRole(t.services, modId, 'moderator');
    const q = (await mod.get('/moderation/queue')).data.dms;
    expect(q.map((m: { id: string }) => m.id)).toEqual(expect.arrayContaining([held.data.id, sent.data.id]));
    expect((await mod.post(`/moderation/dm/${held.data.id}`, { action: 'remove', reason: 'off-platform contact' })).status).toBe(200);
    expect((await a.get('/notifications')).data.items.some((i: { title: { en: string } }) => i.title.en === 'A moderator reviewed your message')).toBe(true);
    // Learners can't use moderator actions.
    expect((await a.post(`/moderation/dm/${sent.data.id}`, { action: 'allow', reason: 'self-approve' })).status).toBe(403);
  });

  it('children, teens and guests can neither send nor receive; adults can’t reach them', async () => {
    const kid = await traveller(t.client(), 'child', 'Sara');
    const kidId = (await kid.get('/auth/me')).data.user.id;
    const teen = await account(t.client(), 'teen', 'dm-teen@example.com');
    const teenId = (await teen.get('/auth/me')).data.user.id;
    const guest = await traveller(t.client());
    const [a] = await adult();
    for (const c of [kid, teen, guest]) {
      expect((await c.get('/dm')).status).toBe(403);
      expect((await c.post('/dm/request', { userId: kidId })).status).toBe(403);
    }
    expect((await a.post('/dm/request', { userId: kidId })).data.error.details.reason).toBe('age-policy');
    expect((await a.post('/dm/request', { userId: teenId })).data.error.details.reason).toBe('age-policy');
  });

  it('requires a shared circle, refuses demo personas and self-messaging', async () => {
    const [a, aId] = await adult('first-steps');
    const [, otherId] = await adult('open-questions');
    await t.services.db.query("update circle_members set left_at = now() where user_id = $1 and circle_id = 'first-steps'", [otherId]);
    expect((await a.post('/dm/request', { userId: otherId })).data.error.details.reason).toBe('no-shared-circle');
    const [persona] = await t.services.db.query<{ id: string }>('select id from users where is_demo = true limit 1');
    expect((await a.post('/dm/request', { userId: persona.id })).status).toBe(404);
    expect((await a.post('/dm/request', { userId: aId })).status).toBe(400);
  });

  it('declining or closing ends it for good; blocking closes it and stops messages', async () => {
    const [a] = await adult();
    const [b, bId] = await adult();
    const { threadId } = (await a.post('/dm/request', { userId: bId })).data;
    await b.post(`/dm/${threadId}/respond`, { accept: false });
    expect((await a.post('/dm/request', { userId: bId })).data.error.details.reason).toBe('closed');

    const [c] = await adult();
    const [d, dId] = await adult();
    const th = (await c.post('/dm/request', { userId: dId })).data.threadId;
    await d.post(`/dm/${th}/respond`, { accept: true });
    const cId = (await c.get('/auth/me')).data.user.id;
    await d.post(`/blocks/${cId}`);
    expect((await c.post(`/dm/${th}/messages`, { body: 'hello?' })).status).toBe(403);
    expect((await d.get('/dm')).data.threads.some((x: { id: string }) => x.id === th)).toBe(false);
    expect((await c.get(`/dm/${th}/messages`)).data.status).toBe('closed');
  });

  it('a third person can’t read or write a thread, and an age change closes the door', async () => {
    const [a] = await adult();
    const [b, bId] = await adult();
    const [x] = await adult();
    const { threadId } = (await a.post('/dm/request', { userId: bId })).data;
    await b.post(`/dm/${threadId}/respond`, { accept: true });
    expect((await x.get(`/dm/${threadId}/messages`)).status).toBe(404);
    expect((await x.post(`/dm/${threadId}/messages`, { body: 'hi' })).status).toBe(404);
    // A guardian/admin later approves b as a teen: messages stop immediately.
    await t.services.db.query("update age_status set approved_band = 'teen' where user_id = $1", [bId]);
    expect((await a.post(`/dm/${threadId}/messages`, { body: 'still there?' })).status).toBe(403);
  });
});
