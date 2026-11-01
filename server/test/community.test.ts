// @vitest-environment node
import { createTestServer, traveller, account, grantRole } from './harness.ts';

let t: Awaited<ReturnType<typeof createTestServer>>;
beforeAll(async () => (t = await createTestServer()), 60_000);
afterAll(() => t.close());

async function consentedChild(name = 'Zaid', approve: string[] = ['garden'], settings?: Record<string, unknown>) {
  const child = await traveller(t.client(), 'child', name);
  const { code } = (await child.post('/guardian/link-code')).data;
  const guardian = await account(t.client(), 'adult', `guardian-${name}-${Math.random().toString(36).slice(2)}@example.com`);
  await guardian.post('/guardian/accept', { code, consent: true });
  const childId = (await child.get('/auth/me')).data.user.id;
  for (const id of approve) await guardian.post(`/guardian/children/${childId}/circles/${id}`);
  if (settings) await guardian.put(`/guardian/children/${childId}/settings`, settings);
  return { child, guardian, childId };
}

describe('child safety (server-enforced)', () => {
  it('an adult can neither see nor join a children’s circle, even by calling the API directly', async () => {
    const adult = await account(t.client(), 'adult', 'curious-adult@example.com');
    const list = (await adult.get('/circles')).data.circles.map((c: { id: string }) => c.id);
    expect(list).not.toContain('garden');
    expect((await adult.get('/circles/garden')).status).toBe(404);
    expect((await adult.post('/circles/garden/join')).status).toBe(404);
    expect((await adult.post('/circles/garden/messages', { body: 'hi kids' })).status).toBe(404);
  });

  it('a child needs guardian consent and per-circle approval before joining', async () => {
    const child = await traveller(t.client(), 'child');
    const r = await child.post('/circles/garden/join');
    expect(r.status).toBe(403);
    expect(r.data.error.details.reason).toBe('needs-consent');
    const { child: ok } = await consentedChild('Lina', []);
    expect((await ok.post('/circles/garden/join')).data.error.details.reason).toBe('needs-guardian');
    const { child: approved } = await consentedChild('Musa', ['garden']);
    expect((await approved.post('/circles/garden/join')).status).toBe(200);
  });

  it('a child can never start or receive a private message', async () => {
    const { child, childId } = await consentedChild('Huda');
    await child.post('/circles/garden/join');
    expect((await child.post('/dm/request', { userId: childId })).status).toBe(403); // guests/children: account required
    const adult = await account(t.client(), 'adult', 'dm-adult@example.com');
    const r = await adult.post('/dm/request', { userId: childId });
    expect(r.status).toBe(403);
    expect(r.data.error.details.reason).toBe('age-policy');
  });

  it('blocks personal information from children before it is stored', async () => {
    const { child } = await consentedChild('Adam');
    await child.post('/circles/garden/join');
    const r = await child.post('/circles/garden/messages', { body: 'my number is 055 123 4567 text me' });
    expect(r.status).toBe(422);
    expect(r.data.error.details.categories).toEqual(expect.arrayContaining(['personal_info', 'unsafe_contact']));
    const [{ n }] = await t.services.db.query<{ n: number }>("select count(*)::int as n from chat_messages where body like '%055 123%'");
    expect(n).toBe(0);
  });

  it('applies guardian “encouragement replies only” on the server', async () => {
    const { child } = await consentedChild('Sara', ['garden'], { approveCircles: true, quickRepliesOnly: true, dailyMinutes: 30 });
    await child.post('/circles/garden/join');
    expect((await child.post('/circles/garden/messages', { body: 'hello everyone' })).data.error.details.reason).toBe('quick-replies-only');
    expect((await child.post('/circles/garden/messages', { body: 'Great job!', quickReply: true })).status).toBe(201);
    expect((await child.post('/circles/garden/messages', { body: 'call me later', quickReply: true })).status).toBe(400);
  });

  it('a young member reporting something unsafe hides it immediately and escalates', async () => {
    const { child } = await consentedChild('Ilyas');
    await child.post('/circles/garden/join');
    const msgs = (await child.get('/circles/garden/messages')).data.messages;
    const target = msgs.find((m: { author: { isYou: boolean } }) => !m.author.isYou);
    expect((await child.post(`/messages/${target.id}/report`, { reason: 'unsafe' })).status).toBe(201);
    const [{ status }] = await t.services.db.query<{ status: string }>('select status from chat_messages where id = $1', [target.id]);
    expect(status).toBe('hidden');
  });

  it('requires guardian consent again after it is revoked', async () => {
    const { child, guardian, childId } = await consentedChild('Yahya');
    await child.post('/circles/garden/join');
    await guardian.post(`/guardian/children/${childId}/revoke`);
    expect((await child.post('/circles/garden/messages', { body: 'Great job!', quickReply: true })).status).toBe(403);
  });
});

describe('circles & chat', () => {
  it('holds adult personal info for a moderator, visible only to its author until reviewed', async () => {
    const a = await account(t.client(), 'adult', 'member1@example.com');
    const b = await account(t.client(), 'adult', 'member2@example.com');
    await a.post('/circles/first-steps/join');
    await b.post('/circles/first-steps/join');
    const r = await a.post('/circles/first-steps/messages', { body: 'email me at me@example.com for notes' });
    expect(r.status).toBe(201);
    expect(r.data.message.status).toBe('held');
    const id = r.data.message.id;
    expect((await b.get('/circles/first-steps/messages')).data.messages.some((m: { id: string }) => m.id === id)).toBe(false);
    expect((await a.get('/circles/first-steps/messages')).data.messages.some((m: { id: string }) => m.id === id)).toBe(true);

    const mod = await account(t.client(), 'adult', 'moderator@example.com');
    await grantRole(t.services, (await mod.get('/auth/me')).data.user.id, 'moderator');
    expect((await b.get('/moderation/queue')).status).toBe(403);
    const q = (await mod.get('/moderation/queue')).data;
    expect(q.held.some((m: { id: string }) => m.id === id)).toBe(true);
    expect((await mod.post(`/moderation/messages/${id}`, { action: 'allow', reason: 'Study notes, fine to share' })).data.status).toBe('visible');
    expect((await b.get('/circles/first-steps/messages')).data.messages.some((m: { id: string }) => m.id === id)).toBe(true);
    const audit = (await mod.get(`/moderation/audit/message/${id}`)).data.actions.map((x: { action: string; actor_kind: string }) => `${x.action}:${x.actor_kind}`);
    expect(audit).toEqual(['hold:system', 'allow:human']);
  });

  it('refuses posts from non-members and requires an account for adults', async () => {
    const guest = await traveller(t.client(), 'adult');
    expect((await guest.post('/circles/first-steps/join')).data.error.details.reason).toBe('needs-account');
    const outsider = await account(t.client(), 'adult', 'outsider@example.com');
    expect((await outsider.post('/circles/first-steps/messages', { body: 'hello' })).status).toBe(403);
    expect((await outsider.get('/circles/first-steps/messages')).status).toBe(403);
  });

  it('supports replies, reactions, idempotent sends and blocking', async () => {
    const a = await account(t.client(), 'adult', 'chat-a@example.com');
    const b = await account(t.client(), 'adult', 'chat-b@example.com');
    await a.post('/circles/open-questions/join');
    await b.post('/circles/open-questions/join');
    const first = (await a.post('/circles/open-questions/messages', { body: 'Has anyone done Mission 5?', clientId: 'c1' })).data.message;
    const again = await a.post('/circles/open-questions/messages', { body: 'Has anyone done Mission 5?', clientId: 'c1' });
    expect(again.data.duplicate).toBe(true);
    const reply = (await b.post('/circles/open-questions/messages', { body: 'Yes, the library one!', replyTo: first.id })).data.message;
    expect(reply.replyPreview).toMatch(/Mission 5/);
    const reacted = (await b.post(`/messages/${first.id}/reactions`, { reaction: 'helpful' })).data.message;
    expect(reacted.reactions.helpful).toBe(1);
    expect(reacted.mine).toContain('helpful');
    await b.post(`/blocks/${(await a.get('/auth/me')).data.user.id}`);
    expect((await b.get('/circles/open-questions/messages')).data.messages.some((m: { id: string }) => m.id === first.id)).toBe(false);
  });

  it('pins are for mentors and moderators; reports reach the moderation queue with a reason', async () => {
    const member = await account(t.client(), 'adult', 'pin-member@example.com');
    const mod = await account(t.client(), 'adult', 'pin-mod@example.com');
    await grantRole(t.services, (await mod.get('/auth/me')).data.user.id, 'moderator');
    await member.post('/circles/open-questions/join');
    const msg = (await member.post('/circles/open-questions/messages', { body: 'Weekly goal: pray Fajr on time three days.' })).data.message;
    expect((await member.post(`/messages/${msg.id}/pin`, { pinned: true })).status).toBe(403);
    expect((await mod.post(`/messages/${msg.id}/pin`, { pinned: true })).status).toBe(200);
    expect((await member.get('/circles/open-questions/messages')).data.messages.find((m: { id: string }) => m.id === msg.id).pinned).toBe(true);
    const reporter = await account(t.client(), 'adult', 'pin-reporter@example.com');
    await reporter.post('/circles/open-questions/join');
    expect((await reporter.post(`/messages/${msg.id}/report`, { reason: 'wrong-info', note: 'testing reports' })).status).toBeLessThan(300);
    const queue = (await mod.get('/moderation/queue')).data;
    expect(queue.reports.some((r: { message_id: string; reason: string }) => r.message_id === msg.id && r.reason === 'wrong-info')).toBe(true);
    expect((await reporter.get('/moderation/queue')).status).toBe(403);
  });

  it('delivers messages in realtime over SSE to circle members', async () => {
    const a = await account(t.client(), 'adult', 'rt-a@example.com');
    const b = await account(t.client(), 'adult', 'rt-b@example.com');
    await a.post('/circles/first-steps/join');
    await b.post('/circles/first-steps/join');
    const res = await t.app.request('/api/stream', { headers: { cookie: b.cookie } });
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    const until = async (needle: string) => {
      while (!buf.includes(needle)) buf += dec.decode((await reader.read()).value);
    };
    await until('event: ready');
    await a.post('/circles/first-steps/messages', { body: 'Salam, realtime!' });
    await until('Salam, realtime!');
    expect(buf).toMatch(/event: chat.message/);
    await reader.cancel();
  });

  it('allows adult-only DMs by request and acceptance between circle members', async () => {
    const a = await account(t.client(), 'adult', 'dm-a@example.com');
    const b = await account(t.client(), 'adult', 'dm-b@example.com');
    await a.post('/circles/first-steps/join');
    await b.post('/circles/first-steps/join');
    const bId = (await b.get('/auth/me')).data.user.id;
    const { threadId } = (await a.post('/dm/request', { userId: bId })).data;
    expect((await a.post(`/dm/${threadId}/messages`, { body: 'hi' })).status).toBe(403); // not accepted yet
    await b.post(`/dm/${threadId}/respond`, { accept: true });
    expect((await a.post(`/dm/${threadId}/messages`, { body: 'Thanks for the notes!' })).data.status).toBe('visible');
    await b.post(`/blocks/${(await a.get('/auth/me')).data.user.id}`);
    expect((await a.post(`/dm/${threadId}/messages`, { body: 'hello?' })).status).toBe(403);
  });
});
