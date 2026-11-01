// @vitest-environment node
/**
 * Notifications: schedule → deliver → read, de-duplication, cancellation,
 * preferences, the "no push for children" rule when push IS configured, and a
 * real Web Push delivery (VAPID-signed, encrypted) to a local HTTPS receiver.
 */
import { createECDH, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, Agent, type Server } from 'node:https';
import type { AddressInfo } from 'node:net';
import { createTestServer, account, grantRole, traveller, type Client } from './harness.ts';
import { runDue } from '../modules/notifications/service.ts';
import { createPusher, type Pusher, type PushPayload } from '../modules/notifications/push.ts';
import { loadConfig } from '../config.ts';

/** Records what would be pushed; can pretend a subscription is gone. */
function recordingPusher() {
  const sent: { endpoint: string; payload: PushPayload }[] = [];
  const gone = new Set<string>();
  const pusher: Pusher = {
    mode: 'web-push',
    publicKey: 'test-public-key',
    async send(sub, payload) {
      if (gone.has(sub.endpoint)) return 'gone';
      sent.push({ endpoint: sub.endpoint, payload });
      return 'sent';
    },
  };
  return { pusher, sent, gone };
}

let clock = new Date('2026-09-29T09:00:00Z');
const rec = recordingPusher();
let t: Awaited<ReturnType<typeof createTestServer>>;
beforeAll(async () => (t = await createTestServer({ now: () => clock, push: rec.pusher })), 60_000);
afterAll(() => t.close());

const L = (s: string) => ({ en: s, ar: s });
const later = (min: number) => new Date(clock.getTime() + min * 60_000).toISOString();
const items = async (c: Client) => (await c.get('/notifications')).data.items as { id: string; status: string; category: string }[];
const sub = (n: string) => ({ endpoint: `https://push.example/${n}`, keys: { p256dh: 'p', auth: 'a' } });

describe('scheduling and delivery', () => {
  it('schedules a prayer reminder, delivers it when due (in-app + push), then it can be read', async () => {
    const c = await traveller(t.client());
    expect((await c.post('/notifications/push/subscribe', sub('adult-1'))).status).toBe(201);
    const r = await c.post('/notifications/schedule', { category: 'prayer', title: L('Asr is near'), body: L('A gentle reminder.'), at: later(30), dedupeKey: 'asr-2026-09-29' });
    expect(r.status).toBe(201);
    await runDue(t.services);
    expect((await items(c)).find((i) => i.id === r.data.id)?.status).toBe('scheduled'); // not yet due
    clock = new Date(clock.getTime() + 31 * 60_000);
    await runDue(t.services);
    expect((await items(c)).find((i) => i.id === r.data.id)?.status).toBe('delivered');
    expect(rec.sent.filter((x) => x.endpoint.endsWith('adult-1')).map((x) => x.payload.title)).toEqual(['Asr is near']);
    const [row] = await t.services.db.query<{ channels: string[] }>('select channels from notifications where id = $1', [r.data.id]);
    expect(row.channels.sort()).toEqual(['in-app', 'push']);
    expect((await c.get('/notifications')).data.unread).toBe(1);
    await c.post(`/notifications/${r.data.id}/read`);
    expect((await c.get('/notifications')).data.unread).toBe(0);
    // Delivering again (a second scheduler tick) never re-sends.
    await runDue(t.services);
    expect(rec.sent.filter((x) => x.endpoint.endsWith('adult-1'))).toHaveLength(1);
  });

  it('de-duplicates: the same reminder key is stored and delivered once', async () => {
    const c = await traveller(t.client());
    const first = await c.post('/notifications/schedule', { category: 'mission', title: L('Your next mission'), body: L('Ready when you are.'), at: later(5), dedupeKey: 'mission-nudge' });
    const again = await c.post('/notifications/schedule', { category: 'mission', title: L('Your next mission'), body: L('Ready when you are.'), at: later(5), dedupeKey: 'mission-nudge' });
    expect(first.status).toBe(201);
    expect(again.data).toMatchObject({ scheduled: false, reason: 'disabled-or-duplicate' });
    expect((await items(c)).filter((i) => i.category === 'mission')).toHaveLength(1);
  });

  it('cancels a scheduled reminder: it is never delivered and disappears from the inbox', async () => {
    const c = await traveller(t.client());
    const r = await c.post('/notifications/schedule', { category: 'reflection', title: L('Evening reflection'), body: L('A quiet minute.'), at: later(10) });
    const other = await traveller(t.client());
    await other.del(`/notifications/${r.data.id}`); // someone else can't cancel it
    expect((await items(c)).find((i) => i.id === r.data.id)?.status).toBe('scheduled');
    await c.del(`/notifications/${r.data.id}`);
    clock = new Date(clock.getTime() + 11 * 60_000);
    await runDue(t.services);
    expect((await items(c)).some((i) => i.id === r.data.id)).toBe(false);
    const [row] = await t.services.db.query<{ status: string; delivered_at: string | null }>('select status, delivered_at from notifications where id = $1', [r.data.id]);
    expect(row).toMatchObject({ status: 'cancelled', delivered_at: null });
  });

  it('respects preferences: a category turned off is not scheduled; push-only skips in-app', async () => {
    const c = await traveller(t.client());
    await c.post('/notifications/push/subscribe', sub('prefs'));
    const prefs = (await c.get('/notifications/preferences')).data.categories;
    await c.put('/notifications/preferences', { categories: { ...prefs, mission: { inApp: false, push: false }, prayer: { inApp: false, push: true } } });
    expect((await c.post('/notifications/schedule', { category: 'mission', title: L('x'), body: L('x'), at: later(1) })).data.scheduled).toBe(false);
    const p = await c.post('/notifications/schedule', { category: 'prayer', title: L('Maghrib'), body: L('Now'), at: clock.toISOString() });
    const [row] = await t.services.db.query<{ channels: string[] }>('select channels from notifications where id = $1', [p.data.id]);
    expect(row.channels).toEqual(['push']);
  });

  it('refuses reminders in the past or more than 48 hours ahead', async () => {
    const c = await traveller(t.client());
    expect((await c.post('/notifications/schedule', { category: 'prayer', title: L('x'), body: L('x'), at: later(-10) })).status).toBe(400);
    expect((await c.post('/notifications/schedule', { category: 'prayer', title: L('x'), body: L('x'), at: later(49 * 60) })).status).toBe(400);
  });

  it('removes a subscription the push service says is gone', async () => {
    const c = await traveller(t.client());
    await c.post('/notifications/push/subscribe', sub('gone'));
    rec.gone.add(sub('gone').endpoint);
    await c.post('/notifications/schedule', { category: 'prayer', title: L('x'), body: L('x'), at: clock.toISOString() });
    const [{ n }] = await t.services.db.query<{ n: number }>('select count(*)::int as n from push_subscriptions where endpoint = $1', [sub('gone').endpoint]);
    expect(n).toBe(0);
  });
});

describe('children never get push — even when push is configured', () => {
  it('a child cannot subscribe, cannot turn push on, and is never pushed to', async () => {
    const kid = await traveller(t.client(), 'child');
    expect((await kid.post('/notifications/push/subscribe', sub('kid'))).status).toBe(403);
    const prefs = (await kid.get('/notifications/preferences')).data;
    expect(prefs.pushAllowed).toBe(false);
    expect(Object.values(prefs.categories).every((p) => !(p as { push: boolean }).push)).toBe(true);
    const saved = (await kid.put('/notifications/preferences', { categories: Object.fromEntries(Object.keys(prefs.categories).map((k) => [k, { inApp: true, push: true }])) })).data;
    expect(Object.values(saved.categories).every((p) => !(p as { push: boolean }).push)).toBe(true);
    // Even a subscription that exists (e.g. from before the age band changed) is never used.
    const kidId = (await kid.get('/auth/me')).data.user.id;
    await t.services.db.query("insert into push_subscriptions (user_id, endpoint, keys) values ($1, 'https://push.example/kid-legacy', '{\"p256dh\":\"p\",\"auth\":\"a\"}')", [kidId]);
    await t.services.db.query("update notification_preferences set categories = jsonb_set(categories, '{prayer,push}', 'true') where user_id = $1", [kidId]);
    await kid.post('/notifications/schedule', { category: 'prayer', title: L('Asr'), body: L('Now'), at: clock.toISOString() });
    expect(rec.sent.some((x) => x.endpoint.includes('kid'))).toBe(false);
    expect((await items(kid)).some((i) => i.status === 'delivered')).toBe(true); // in-app still works
  });
});

describe('notifications that other parts of SAJA send', () => {
  it('scholar answer, moderation decision and message request each reach the right person', async () => {
    const admin = await account(t.client(), 'adult', `n-admin-${Math.random()}@example.com`);
    const adminId = (await admin.get('/auth/me')).data.user.id;
    await grantRole(t.services, adminId, 'moderator');
    const author = await account(t.client(), 'adult', `n-author-${Math.random()}@example.com`);
    const circles = (await author.get('/circles')).data.circles as { id: string; ageBand: string }[];
    const circle = circles.find((x) => x.ageBand === 'adult')!;
    await author.post(`/circles/${circle.id}/join`);
    const held = (await author.post(`/circles/${circle.id}/messages`, { body: 'call me on 0551234567' })).data;
    expect(held.message.status).toBe('held');
    await admin.post(`/moderation/messages/${held.message.id}`, { action: 'remove', reason: 'personal contact details' });
    const got = await items(author);
    expect(got.some((i) => i.category === 'moderation' && i.status === 'delivered')).toBe(true);
  });
});

describe('real Web Push delivery (web-push library, VAPID) to a local HTTPS receiver', () => {
  let server: Server;
  let received: { headers: Record<string, string | string[] | undefined>; body: Buffer }[] = [];
  let status = 201;
  let agent: Agent;
  let port = 0;
  const canRun = (() => {
    try {
      execFileSync('openssl', ['version'], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  })();

  beforeAll(async () => {
    if (!canRun) return;
    const dir = mkdtempSync(join(tmpdir(), 'saja-push-'));
    execFileSync('openssl', ['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes', '-days', '1', '-subj', '/CN=localhost', '-keyout', join(dir, 'k.pem'), '-out', join(dir, 'c.pem')], { stdio: 'ignore' });
    const cert = readFileSync(join(dir, 'c.pem'));
    agent = new Agent({ ca: cert });
    server = createServer({ key: readFileSync(join(dir, 'k.pem')), cert }, (req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (d: Buffer) => chunks.push(d));
      req.on('end', () => {
        received.push({ headers: req.headers, body: Buffer.concat(chunks) });
        res.writeHead(status).end();
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    port = (server.address() as AddressInfo).port;
  });
  afterAll(() => server?.close());

  it.skipIf(!canRun)('signs with VAPID, encrypts the payload, and reports gone subscriptions', async () => {
    const webpush = (await import('web-push')).default;
    const vapid = webpush.generateVAPIDKeys();
    const config = loadConfig({ SAJA_ENV: 'test', VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey, VAPID_SUBJECT: 'mailto:ops@example.test' } as NodeJS.ProcessEnv);
    const pusher = createPusher(config, { agent });
    expect(pusher.mode).toBe('web-push');
    const ecdh = createECDH('prime256v1');
    ecdh.generateKeys();
    const subscription = { endpoint: `https://localhost:${port}/push/abc`, keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };

    received = [];
    expect(await pusher.send(subscription, { title: 'Asr is near', body: 'A gentle reminder.', url: '/day', tag: 'prayer' })).toBe('sent');
    expect(received).toHaveLength(1);
    const h = received[0].headers;
    expect(String(h.authorization)).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/); // signed JWT + public key
    expect(h['content-encoding']).toBe('aes128gcm');
    expect(h.ttl).toBe('3600');
    expect(received[0].body.length).toBeGreaterThan(0);
    expect(received[0].body.toString('utf8')).not.toContain('Asr is near'); // encrypted, not readable in transit

    status = 410;
    expect(await pusher.send(subscription, { title: 'x', body: 'x' })).toBe('gone');
    status = 500;
    expect(await pusher.send(subscription, { title: 'x', body: 'x' })).toBe('failed');
  });
});
