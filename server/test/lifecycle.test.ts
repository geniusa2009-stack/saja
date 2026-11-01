// @vitest-environment node
/** Account deletion removes every personal row AND private files; failures are retried, never orphaned. */
import { createTestServer, account, grantRole, traveller } from './harness.ts';
import { createMemoryStorage, type Storage } from '../lib/storage.ts';
import { runFileDeletions, runRetention } from '../modules/lifecycle.ts';

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

// Storage whose deletes can be made to fail, to prove nothing is orphaned.
const inner = createMemoryStorage();
const keys = new Set<string>();
let failDeletes = false;
const storage: Storage = {
  async put(d) {
    const k = await inner.put(d);
    keys.add(k);
    return k;
  },
  get: (k) => inner.get(k),
  async remove(k) {
    if (failDeletes) throw new Error('disk unavailable');
    keys.delete(k);
    await inner.remove(k);
  },
};

let t: Awaited<ReturnType<typeof createTestServer>>;
beforeAll(async () => (t = await createTestServer({ storage })), 60_000);
afterAll(() => t.close());

const count = async (sql: string, params: unknown[]) => (await t.services.db.query<{ n: number }>(`select count(*)::int as n from ${sql}`, params))[0].n;

describe('account deletion', () => {
  it('deletes personal rows everywhere and the private uploads, even for staff who acted on others', async () => {
    const c = await account(t.client(), 'adult', 'leaving@example.com');
    const id = (await c.get('/auth/me')).data.user.id;
    await grantRole(t.services, id, 'moderator');
    const up = (await c.upload('shot.png', 'image/png', PNG)).data;
    await c.post('/audits?wait=1', { tool: 'nour', inputKind: 'text', text: 'Fasting in Ramadan is one of the five pillars of Islam.' });
    await c.post('/circles/first-steps/join');
    await c.post('/circles/first-steps/messages', { body: 'Assalamu alaykum everyone' });
    await c.post('/scholar/questions', { question: 'How should I make up missed prayers?', topic: 'prayer' });
    await c.post('/analytics', { name: 'mission_started', props: {} });
    // Acting as staff creates rows that reference this person (these used to block deletion).
    const other = await traveller(t.client());
    await other.post('/scholar/questions', { question: 'Contact me on whatsapp about prayer please', topic: 'prayer' });
    const held = (await t.services.db.query<{ id: string }>("select id from scholar_questions where status = 'held' limit 1"))[0];
    if (held) await c.post(`/moderation/questions/${held.id}`, { action: 'reject', reason: 'contact request' });
    const [{ storage_key }] = await t.services.db.query<{ storage_key: string }>('select storage_key from uploads where id = $1', [up.id]);
    expect(keys.has(storage_key)).toBe(true);

    const r = await c.post('/auth/delete-account');
    expect(r.status).toBe(200);
    for (const table of ['users where id = $1', 'profiles where user_id = $1', 'uploads where owner_id = $1', 'content_audits where owner_id = $1', 'chat_messages where author_id = $1', 'scholar_questions where asker_id = $1', 'analytics_events where user_id = $1', 'sessions where user_id = $1', 'circle_members where user_id = $1']) {
      expect(await count(table, [id])).toBe(0);
    }
    expect(keys.has(storage_key)).toBe(false);
    expect(await count('pending_file_deletions where storage_key = $1', [storage_key])).toBe(0);
    // The moderation decision survives as an anonymous audit record.
    if (held) expect(await count("moderation_actions where target_id = $1 and actor_kind = 'human' and actor_id is null", [held.id])).toBe(1);
    expect((await c.get('/auth/me')).data.user).toBeNull();
  });

  it('keeps retrying file deletion when storage fails — no orphaned private files', async () => {
    const c = await traveller(t.client());
    await c.upload('a.png', 'image/png', PNG);
    const [{ storage_key }] = await t.services.db.query<{ storage_key: string }>('select u.storage_key from uploads u order by created_at desc limit 1');
    failDeletes = true;
    expect((await c.post('/auth/delete-account')).status).toBe(200); // the account is gone either way
    expect(keys.has(storage_key)).toBe(true);
    expect(await count('pending_file_deletions where storage_key = $1 and attempts = 1', [storage_key])).toBe(1);
    failDeletes = false;
    await t.services.db.query('update pending_file_deletions set next_attempt_at = now()');
    await runFileDeletions(t.services);
    expect(keys.has(storage_key)).toBe(false);
    expect(await count('pending_file_deletions where storage_key = $1', [storage_key])).toBe(0);
  });

  it('partial storage failure: the files that can go are removed; the rest wait with growing back-off', async () => {
    const c = await traveller(t.client());
    const a1 = (await c.upload('one.png', 'image/png', PNG)).data;
    const a2 = (await c.upload('two.png', 'image/png', PNG)).data;
    const rows = await t.services.db.query<{ id: string; storage_key: string }>('select id, storage_key from uploads where id = any($1)', [[a1.id, a2.id]]);
    const k1 = rows.find((r) => r.id === a1.id)!.storage_key;
    const k2 = rows.find((r) => r.id === a2.id)!.storage_key;
    const realRemove = storage.remove;
    storage.remove = async (k) => (k === k2 ? Promise.reject(new Error('disk unavailable')) : realRemove(k));
    try {
      expect((await c.post('/auth/delete-account')).status).toBe(200);
      expect(keys.has(k1)).toBe(false); // removed straight away
      expect(keys.has(k2)).toBe(true); // still on disk, but queued
      const [q1] = await t.services.db.query<{ attempts: number; wait: number }>(
        "select attempts, extract(epoch from next_attempt_at - now())::int as wait from pending_file_deletions where storage_key = $1",
        [k2],
      );
      expect(q1.attempts).toBe(1);
      expect(q1.wait).toBeGreaterThan(0); // not retried in a tight loop
      await runFileDeletions(t.services); // not due yet → untouched
      expect(keys.has(k2)).toBe(true);
      await t.services.db.query('update pending_file_deletions set next_attempt_at = now() where storage_key = $1', [k2]);
      await runFileDeletions(t.services); // still failing → back-off grows
      const [q2] = await t.services.db.query<{ attempts: number; wait: number }>(
        "select attempts, extract(epoch from next_attempt_at - now())::int as wait from pending_file_deletions where storage_key = $1",
        [k2],
      );
      expect(q2.attempts).toBe(2);
      expect(q2.wait).toBeGreaterThan(q1.wait);
      expect((await t.client().get('/system/health')).data.pendingFileDeletions).toBeGreaterThan(0); // visible to operators
    } finally {
      storage.remove = realRemove;
    }
    await t.services.db.query('update pending_file_deletions set next_attempt_at = now() where storage_key = $1', [k2]);
    await runFileDeletions(t.services);
    expect(keys.has(k2)).toBe(false);
    expect(await count('pending_file_deletions where storage_key = $1', [k2])).toBe(0);
  });

  it('a content editor and reviewer can delete their account; the review trail stays, without them', async () => {
    const admin = await account(t.client(), 'adult', `life-admin-${Math.random()}@example.com`);
    await grantRole(t.services, (await admin.get('/auth/me')).data.user.id, 'admin');
    const editor = await account(t.client(), 'adult', `life-editor-${Math.random()}@example.com`);
    const editorId = (await editor.get('/auth/me')).data.user.id;
    await grantRole(t.services, editorId, 'scholar');
    await t.services.db.query("insert into scholar_profiles (user_id, display_name, title, specialization, verification_status, credentials) values ($1, 'Editor', '{\"en\":\"x\",\"ar\":\"x\"}', '{\"en\":\"x\",\"ar\":\"x\"}', 'verified', '[{\"type\":\"Ijazah\",\"issuer\":\"Example\"}]')", [editorId]);
    const mission = 'm-words-of-peace';
    const first = ((await editor.get(`/missions/${mission}/texts`)).data.texts as { path: string; en: string; ar: string }[])[0];
    expect((await editor.post(`/missions/${mission}/draft`, { texts: [{ ...first, en: `${first.en} (edited)` }], changeNote: 'Edit before leaving' })).status).toBe(201);
    await admin.post(`/missions/${mission}/review`, { to: 'internal_review', scope: 'full text' });
    expect((await editor.post('/auth/delete-account')).status).toBe(200);
    // The version and its review steps remain; the person is no longer referenced.
    const [v] = await t.services.db.query<{ created_by: string | null; n: number }>(
      "select created_by, (select count(*)::int from content_reviews where mission_id = $1) as n from mission_versions where mission_id = $1 and version = 2",
      [mission],
    );
    expect(v.created_by).toBeNull();
    expect(v.n).toBeGreaterThanOrEqual(2);
    expect(await count('content_reviews where reviewer_id = $1', [editorId])).toBe(0);
    expect(await count('scholar_profiles where user_id = $1', [editorId])).toBe(0);
  });

  it('deleting a single upload queues and removes the file', async () => {
    const c = await traveller(t.client());
    const up = (await c.upload('b.png', 'image/png', PNG)).data;
    const [{ storage_key }] = await t.services.db.query<{ storage_key: string }>('select storage_key from uploads where id = $1', [up.id]);
    expect((await c.del(`/uploads/${up.id}`)).status).toBe(200);
    expect(keys.has(storage_key)).toBe(false);
    const other = await traveller(t.client());
    const mine = (await c.upload('c.png', 'image/png', PNG)).data;
    await other.del(`/uploads/${mine.id}`); // someone else's id: no effect
    expect(await count('uploads where id = $1 and deleted_at is null', [mine.id])).toBe(1);
  });

  it('when a guardian deletes their account, the child loses consent and leaves circles', async () => {
    const kid = await traveller(t.client(), 'child', 'Sara');
    const kidId = (await kid.get('/auth/me')).data.user.id;
    const { code } = (await kid.post('/guardian/link-code')).data;
    const parent = await account(t.client(), 'adult', 'parent-leaving@example.com');
    expect((await parent.post('/guardian/accept', { code, consent: true })).status).toBe(200);
    expect((await kid.post('/circles/garden/join')).status).toBe(403); // circle approval still required
    const appr = await parent.post(`/guardian/children/${kidId}/circles/garden`);
    expect(appr.data).toEqual({ ok: true });
    expect((await kid.post('/circles/garden/join')).status).toBe(200);
    expect((await parent.post('/auth/delete-account')).status).toBe(200);
    const me = (await kid.get('/auth/me')).data.user;
    expect(me.age.consent).toBe('revoked');
    expect(me.communityAllowed).toBe(false);
    expect(await count('circle_members where user_id = $1 and left_at is null', [kidId])).toBe(0);
  });
});

describe('retention', () => {
  it('removes expired sessions, old analytics and abandoned guest journeys', async () => {
    const g = await traveller(t.client());
    const gid = (await g.get('/auth/me')).data.user.id;
    await g.upload('d.png', 'image/png', PNG);
    await t.services.db.query("update users set created_at = now() - interval '120 days' where id = $1", [gid]);
    await t.services.db.query("update sessions set last_seen_at = now() - interval '120 days' where user_id = $1", [gid]);
    const keep = await traveller(t.client());
    const kid = (await keep.get('/auth/me')).data.user.id;
    await t.services.db.query("insert into analytics_events (user_id, name, created_at) values ($1, 'mission_started', now() - interval '400 days')", [kid]);
    await t.services.db.query("insert into sessions (user_id, token_hash, expires_at) values ($1, 'expired-token-hash', now() - interval '1 day')", [kid]);
    const r = await runRetention(t.services);
    expect(r.guests).toBeGreaterThanOrEqual(1);
    expect(await count('users where id = $1', [gid])).toBe(0);
    expect(await count('users where id = $1', [kid])).toBe(1);
    expect(await count("analytics_events where user_id = $1 and created_at < now() - interval '200 days'", [kid])).toBe(0);
    expect(await count("sessions where token_hash = 'expired-token-hash'", [])).toBe(0);
  });
});

describe('privacy minimisation', () => {
  it('does not keep uploaded file names, and lets people delete an audit together with its file', async () => {
    const c = await traveller(t.client());
    const up = (await c.upload('Maryam Ahmed passport scan.png', 'image/png', PNG)).data;
    const [row] = await t.services.db.query<{ original_name: string; storage_key: string }>('select original_name, storage_key from uploads where id = $1', [up.id]);
    expect(row.original_name).toBe('upload.png');
    const au = (await c.post('/audits?wait=1', { tool: 'nour', inputKind: 'image', uploadId: up.id })).data;
    const other = await traveller(t.client());
    await other.del(`/audits/${au.id}`);
    expect(await count('content_audits where id = $1', [au.id])).toBe(1);
    expect((await c.del(`/audits/${au.id}`)).status).toBe(200);
    expect(await count('content_audits where id = $1', [au.id])).toBe(0);
    expect(keys.has(row.storage_key)).toBe(false);
  });
});
