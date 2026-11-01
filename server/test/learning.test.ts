// @vitest-environment node
import { chooseAdaptation } from '../../src/domain/adaptive.ts';
import { createTestServer, traveller } from './harness.ts';
import { runDue } from '../modules/notifications/service.ts';

let t: Awaited<ReturnType<typeof createTestServer>>;
let clock = new Date('2026-09-29T09:00:00Z');
beforeAll(async () => {
  t = await createTestServer({ now: () => clock });
}, 60_000);
afterAll(() => t.close());

async function play(c: ReturnType<typeof t.client>, missionId: string, mistakes = 0, helper: string | null = null) {
  const r = await c.post(`/missions/${missionId}/attempts`, { modality: 'hands-on' });
  if (r.status !== 201) return r;
  const id = r.data.attemptId;
  const signals = [...Array.from({ length: mistakes }, () => ({ kind: 'step', correct: false, ms: 3000 })), { kind: 'step', correct: true, ms: 2500 }];
  await c.post(`/attempts/${id}/signals`, { signals });
  return c.post(`/attempts/${id}/complete`, { modality: helper ? 'guided' : 'hands-on', helperModality: helper, durationMs: 60000 });
}

describe('persistent learning', () => {
  it('serves missions as validated data definitions', async () => {
    const r = await t.client().get('/missions');
    expect(r.data.missions).toHaveLength(12);
    const water = r.data.missions.find((m: { id: string }) => m.id === 'm-water-path');
    expect(water.interactionType).toBe('wudu-journey');
    expect(water.successCondition).toEqual({ type: 'sequence-complete', steps: 11 });
    expect(water.adaptiveAlternatives).toEqual(['visual', 'story', 'guided']);
    expect(water.isDemo).toBe(true);
  });

  it('refuses to start a mission in a place that is still asleep (server-authoritative)', async () => {
    const c = await traveller(t.client());
    const r = await c.post('/missions/m-summit-names/attempts', { modality: 'hands-on' });
    expect(r.status).toBe(403);
    expect(r.data.error.details.locked).toBe(true);
  });

  it('completes a mission, awards the artifact, wakes the next place and updates the learner model', async () => {
    const c = await traveller(t.client());
    const r = await play(c, 'm-water-path', 3, 'visual');
    expect(r.status).toBe(200);
    expect(r.data.earned).toBe(true);
    expect(r.data.woke).toEqual(['garden']);
    const p = r.data.progress;
    expect(p.completed).toEqual(['m-water-path']);
    expect(p.unlocked).toContain('garden');
    expect(p.achievements.map((a: { id: string }) => a.id)).toEqual(expect.arrayContaining(['keeper-of-wudu', 'place-garden']));
    expect(p.model.modalities.visual.tries).toBe(1); // the helper mode gets the credit
    expect(p.model.topics.purification.mastery).toBeGreaterThan(0.2);
    // Now the garden mission can start.
    expect((await c.post('/missions/m-dropped-lunch/attempts', { modality: 'story' })).status).toBe(201);
    // Unlock notification was delivered in-app.
    const n = (await c.get('/notifications')).data;
    expect(n.items.some((i: { category: string }) => i.category === 'unlock')).toBe(true);
  });

  it('adaptive loop: struggle → another mode → guided retry → success is remembered; the failed mode is not offered again', async () => {
    const c = await traveller(t.client());
    // Three mistakes by hand, then success after switching to the illustrated walk-through.
    const r = await play(c, 'm-water-path', 3, 'visual');
    expect(r.status).toBe(200);
    // A new request (a later visit) sees the same learner model: it is stored, not recomputed on the device.
    const model = (await c.get('/progress')).data.model;
    expect(model.modalities.visual).toMatchObject({ tries: 1, successes: 1 });
    expect(model.concepts['wudu-order'].tried).toContain('visual');
    // Struggling again on the same idea: never the mode that just failed, nor one already tried.
    const again = chooseAdaptation(model, 'wudu-order', 'hands-on');
    expect(['hands-on', 'visual']).not.toContain(again.modality);
    // On a new idea, the mode that worked for this learner comes first.
    expect(chooseAdaptation(model, 'salah-order', 'hands-on').modality).toBe('visual');
  });

  it('never double-completes an attempt and never accepts another user’s attempt', async () => {
    const c = await traveller(t.client());
    const { attemptId } = (await c.post('/missions/m-words-of-peace/attempts', { modality: 'hands-on' })).data;
    expect((await c.post(`/attempts/${attemptId}/complete`, { modality: 'hands-on', durationMs: 1000 })).status).toBe(200);
    expect((await c.post(`/attempts/${attemptId}/complete`, { modality: 'hands-on', durationMs: 1000 })).status).toBe(409);
    const other = await traveller(t.client());
    expect((await other.post(`/attempts/${attemptId}/signals`, { signals: [{ kind: 'hint' }] })).status).toBe(404);
  });

  it('respects memory settings: no stored signals or topic model when topics memory is off', async () => {
    const c = await traveller(t.client());
    await c.put('/profile/memory', { style: false, topics: false, schedule: false, conversations: false });
    await play(c, 'm-water-path', 2);
    const me = (await c.get('/auth/me')).data.user.id;
    const [{ n }] = await t.services.db.query<{ n: number }>('select count(*)::int as n from learning_signals where user_id = $1', [me]);
    expect(n).toBe(0);
    const [{ model }] = await t.services.db.query<{ model: Record<string, unknown> }>('select model from learner_models where user_id = $1', [me]);
    expect(model.topics).toBeUndefined();
    // Progress itself is still kept — it is the journey, not a memory.
    expect((await c.get('/progress')).data.completed).toEqual(['m-water-path']);
  });

  it('turning memory off deletes what was stored (server matches the UI)', async () => {
    const c = await traveller(t.client());
    await play(c, 'm-water-path', 2);
    const me = (await c.get('/auth/me')).data.user.id;
    const count = async () => (await t.services.db.query<{ n: number }>('select count(*)::int as n from learning_signals where user_id = $1', [me]))[0].n;
    expect(await count()).toBeGreaterThan(0);
    await c.put('/profile/memory', { style: true, topics: false, schedule: false, conversations: false });
    expect(await count()).toBe(0);
    const mem = (await c.get('/profile/memory')).data;
    expect(mem.data.topics.topics).toBeNull();
  });

  it('children cannot enable memory categories outside their policy', async () => {
    const c = await traveller(t.client(), 'child');
    expect((await c.put('/profile/memory', { style: true, topics: true, schedule: true, conversations: false })).status).toBe(403);
  });
});

describe('My Day & notifications', () => {
  it('recomputes the plan from what the person says', async () => {
    const c = await traveller(t.client());
    const base = (await c.get('/day')).data;
    expect(base.plan.items.filter((i: { kind: string }) => i.kind === 'prayer')).toHaveLength(5);
    const exam = (await c.put('/day/note', { note: 'I have an exam tomorrow' })).data;
    const kinds = exam.plan.items.map((i: { kind: string }) => i.kind);
    expect(kinds).toEqual(expect.arrayContaining(['study', 'break', 'review', 'mission', 'reflection']));
    expect(exam.plan.headline).toMatch(/exam/i);
    // Persisted: a fresh read returns the same plan.
    expect((await c.get('/day')).data.plan.items).toEqual(exam.plan.items);
    // Schedule memory is off by default, so the note itself is not kept.
    expect(exam.plan.note).toBeNull();
  });

  it('uses server-computed prayer times for the person’s place, rounded for privacy', async () => {
    const c = await traveller(t.client());
    const r = (await c.put('/prayer/preferences', { cityId: null, coords: { lat: 51.507234, lng: -0.127612 }, timeZone: 'Europe/London', method: 'auto', asr: 'standard' })).data;
    expect(r.prayer.timeZone).toBe('Europe/London');
    expect(r.prayer.times.fajr).toBeLessThan(r.prayer.times.dhuhr);
    const me = (await c.get('/auth/me')).data.user.id;
    const [row] = await t.services.db.query<{ lat: string }>('select lat from prayer_preferences where user_id = $1', [me]);
    expect(Number(row.lat)).toBe(51.51);
  });

  it('logs prayer privately and never requires it', async () => {
    const c = await traveller(t.client());
    await c.put('/prayer/log', { prayer: 'fajr', mark: 'prayed' });
    expect((await c.get('/day')).data.prayer.log).toEqual({ fajr: 'prayed' });
    await c.put('/prayer/log', { prayer: 'fajr', mark: null });
    expect((await c.get('/day')).data.prayer.log).toEqual({});
  });

  it('"Remind me later" becomes a real scheduled notification delivered when due', async () => {
    const c = await traveller(t.client());
    const at = new Date(clock.getTime() + 20 * 60_000).toISOString();
    const r = await c.post('/notifications/schedule', { category: 'prayer', title: { en: 'Asr is near', ar: 'اقترب العصر' }, body: { en: 'A gentle reminder.', ar: 'تذكير لطيف.' }, at, dedupeKey: 'asr-later' });
    expect(r.status).toBe(201);
    // Duplicate "later" taps don't stack.
    expect((await c.post('/notifications/schedule', { category: 'prayer', title: { en: 'x', ar: 'x' }, body: { en: 'x', ar: 'x' }, at, dedupeKey: 'asr-later' })).data.scheduled).toBe(false);
    expect((await c.get('/notifications')).data.items.find((i: { id: string }) => i.id === r.data.id).status).toBe('scheduled');
    clock = new Date(clock.getTime() + 21 * 60_000);
    await runDue(t.services);
    expect((await c.get('/notifications')).data.items.find((i: { id: string }) => i.id === r.data.id).status).toBe('delivered');
  });

  it('respects disabled categories and Kids Mode push rules', async () => {
    const c = await traveller(t.client(), 'child');
    const prefs = (await c.get('/notifications/preferences')).data;
    expect(prefs.pushAllowed).toBe(false);
    prefs.categories.prayer = { inApp: false, push: true };
    const saved = (await c.put('/notifications/preferences', { categories: prefs.categories })).data;
    expect(saved.categories.prayer.push).toBe(false);
    const r = await c.post('/notifications/schedule', { category: 'prayer', title: { en: 'x', ar: 'x' }, body: { en: 'x', ar: 'x' }, at: clock.toISOString() });
    expect(r.data.scheduled).toBe(false);
    expect((await c.post('/notifications/push/subscribe', { endpoint: 'https://push.example/x', keys: { p256dh: 'a', auth: 'b' } })).status).toBe(503);
  });
});

describe('My Day: server-authoritative plan from structured constraints', () => {
  it('builds the durable plan from constraints alone — the person’s words are not sent or stored', async () => {
    const c = await traveller(t.client());
    const r = await c.put('/day/constraints', { constraints: [{ kind: 'exam', when: 'tomorrow' }, { kind: 'minutes', value: 20 }] });
    expect(r.status).toBe(200);
    expect(r.data.plan.constraints).toEqual([{ kind: 'exam', when: 'tomorrow' }, { kind: 'minutes', value: 20 }]);
    expect(r.data.plan.note).toBeNull();
    expect(r.data.plan.items.length).toBeGreaterThan(0);
    const me = (await c.get('/auth/me')).data.user.id;
    const [row] = await t.services.db.query<{ note: string | null }>('select note from daily_plans where user_id = $1', [me]);
    expect(row.note).toBeNull();
    // On a free day the plan's mission is the adaptive engine's recommendation, as on the device.
    const free = (await c.put('/day/constraints', { constraints: [{ kind: 'free' }] })).data;
    const progress = (await c.get('/progress')).data;
    expect(free.plan.items.find((i: { kind: string }) => i.kind === 'mission')?.missionId ?? free.plan.items.find((i: { kind: string }) => i.kind === 'mission')?.ref).toBe(progress.next[0].missionId);
  });

  it('rejects malformed or oversized constraints', async () => {
    const c = await traveller(t.client());
    expect((await c.put('/day/constraints', { constraints: [{ kind: 'minutes', value: 9999 }] })).status).toBe(400);
    expect((await c.put('/day/constraints', { constraints: [{ kind: 'sleep-at-noon' }] })).status).toBe(400);
    expect((await c.put('/day/constraints', { constraints: Array(7).fill({ kind: 'busy' }) })).status).toBe(400);
  });
});
