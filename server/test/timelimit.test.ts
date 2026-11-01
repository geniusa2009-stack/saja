// @vitest-environment node
/** Guardian daily time limits are measured and enforced by the server — attempts to bypass them from the client fail. */
import { createTestServer, account, traveller } from './harness.ts';
import type { Client } from './harness.ts';

let clock = new Date('2026-09-29T08:00:00Z').getTime();
let t: Awaited<ReturnType<typeof createTestServer>>;
beforeAll(async () => (t = await createTestServer({ now: () => new Date(clock) })), 60_000);
afterAll(() => t.close());

const advance = (min: number) => (clock += min * 60_000);

async function childWithGuardian(minutes: number) {
  const kid = await traveller(t.client(), 'child', 'Sara');
  const kidId = (await kid.get('/auth/me')).data.user.id;
  const { code } = (await kid.post('/guardian/link-code')).data;
  const parent = await account(t.client(), 'adult', `parent-${Math.random()}@example.com`);
  await parent.post('/guardian/accept', { code, consent: true });
  await parent.put(`/guardian/children/${kidId}/settings`, { approveCircles: true, quickRepliesOnly: false, dailyMinutes: minutes });
  return { kid, kidId, parent };
}

/** Plays for `min` minutes: activity every 4 minutes, like the app's heartbeat would. */
async function play(c: Client, min: number) {
  for (let m = 0; m < min; m += 4) {
    advance(4);
    await c.post('/usage/heartbeat');
  }
}

describe('guardian time limit', () => {
  it('counts real activity and pauses new experiences at the limit, while progress is kept', async () => {
    const { kid } = await childWithGuardian(30);
    const started = (await kid.post('/missions/m-water-path/attempts', { modality: 'hands-on' })).data.attemptId;
    await play(kid, 32);
    const st = (await kid.get('/usage')).data;
    expect(st).toMatchObject({ enforced: true, limitMinutes: 30, limited: true });
    expect(st.usedSeconds).toBeGreaterThanOrEqual(30 * 60);

    const blocked = await kid.post('/missions/m-words-of-peace/attempts', { modality: 'hands-on' });
    expect(blocked.status).toBe(403);
    expect(blocked.data.error.details.reason).toBe('time-limit');
    expect((await kid.post('/siraj/ask', { text: 'What is wudu?', ctx: { locale: 'en' } })).data.error.details.reason).toBe('time-limit');
    expect((await kid.post('/scholar/questions', { question: 'How do I make wudu properly?', topic: 'purification' })).status).toBe(403);
    expect((await kid.post('/audits?wait=1', { tool: 'nour', inputKind: 'text', text: 'Fasting in Ramadan is one of the five pillars of Islam.' })).status).toBe(403);
    // Finishing what was already started is allowed: progress is preserved.
    expect((await kid.post(`/attempts/${started}/complete`, { modality: 'hands-on', durationMs: 60_000 })).status).toBe(200);
    expect((await kid.get('/progress')).data.completed).toContain('m-water-path');
  });

  it('cannot be bypassed by skipping heartbeats, sending fake usage, or long pauses', async () => {
    const { kid } = await childWithGuardian(30);
    // No heartbeats at all — just using the API every few minutes still counts.
    for (let m = 0; m < 34; m += 3) {
      advance(3);
      await kid.get('/progress');
    }
    expect((await kid.get('/usage')).data.limited).toBe(true);
    // Client-supplied numbers are ignored.
    await kid.post('/usage/heartbeat', { seconds: -100000, usedSeconds: 0, limited: false });
    expect((await kid.get('/usage')).data.limited).toBe(true);
    // A long break doesn't count as usage, but it doesn't reset today's total either.
    advance(120);
    expect((await kid.get('/usage')).data.limited).toBe(true);
    expect((await kid.post('/missions/m-water-path/attempts', { modality: 'hands-on' })).status).toBe(403);
  });

  it('a guardian can grant extra time; the child cannot grant it to themselves', async () => {
    const { kid, kidId, parent } = await childWithGuardian(30);
    await play(kid, 32);
    expect((await kid.post(`/guardian/children/${kidId}/extend`, { minutes: 60 })).status).toBe(403);
    const other = await account(t.client(), 'adult', `stranger-${Math.random()}@example.com`);
    expect((await other.post(`/guardian/children/${kidId}/extend`, { minutes: 60 })).status).toBe(403);
    const r = await parent.post(`/guardian/children/${kidId}/extend`, { minutes: 15 });
    expect(r.status).toBe(200);
    expect(r.data.limited).toBe(false);
    expect((await kid.post('/missions/m-water-path/attempts', { modality: 'hands-on' })).status).toBe(201);
    const kids = (await parent.get('/guardian/children')).data.children;
    expect(kids.find((k: { id: string }) => k.id === kidId).usage.extraMinutes).toBe(15);
  });

  it('does not apply to adults, or when the guardian chose no limit', async () => {
    const adult = await traveller(t.client());
    await play(adult, 200);
    expect((await adult.get('/usage')).data.enforced).toBe(false);
    expect((await adult.post('/missions/m-water-path/attempts', { modality: 'hands-on' })).status).toBe(201);
    const { kid } = await childWithGuardian(0);
    await play(kid, 200);
    expect((await kid.get('/usage')).data).toMatchObject({ enforced: false, limited: false });
  });

  it('a new day starts fresh', async () => {
    const { kid } = await childWithGuardian(30);
    await play(kid, 32);
    expect((await kid.get('/usage')).data.limited).toBe(true);
    advance(24 * 60);
    expect((await kid.get('/usage')).data.limited).toBe(false);
  });
});
