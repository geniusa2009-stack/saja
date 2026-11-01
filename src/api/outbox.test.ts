import { useConnection } from '@/store/connection';
import { fakeServer, offlineFetch } from '@/test/server';
import { enqueue, flushOutbox, pendingCount, clearOutbox, sendOrQueue } from './outbox';

afterEach(() => {
  clearOutbox();
  offlineFetch();
  useConnection.setState({ status: 'offline', me: null });
});

describe('offline outbox (safe writes only)', () => {
  it('queues while offline, keeps only the last write per key, and sends in order on reconnect', async () => {
    await sendOrQueue({ key: 'prayer:today:asr', method: 'PUT', path: '/prayer/log', body: { prayer: 'asr', mark: 'later' } }, false);
    await sendOrQueue({ key: 'prayer:today:asr', method: 'PUT', path: '/prayer/log', body: { prayer: 'asr', mark: 'prayed' } }, false);
    await sendOrQueue({ key: 'item:today:m1', method: 'PUT', path: '/day/items/m1', body: { done: true } }, false);
    expect(pendingCount()).toBe(2);
    const calls = fakeServer({ 'PUT /prayer/log': () => [200, { ok: true }], 'PUT /day/items/m1': () => [200, { ok: true }] });
    const r = await flushOutbox();
    expect(r).toEqual({ sent: 2, dropped: 0 });
    expect(calls.map((c) => c.body)).toEqual([{ prayer: 'asr', mark: 'prayed' }, { done: true }]);
    expect(pendingCount()).toBe(0);
  });

  it('a network failure keeps the write queued; a server refusal drops it (never retried forever)', async () => {
    enqueue({ key: 'goal:x', method: 'PUT', path: '/day/goals/x', body: { done: true } });
    offlineFetch();
    expect((await flushOutbox()).sent).toBe(0);
    expect(pendingCount()).toBe(1);
    fakeServer({ 'PUT /day/goals/x': () => [403, { error: { code: 'forbidden', message: 'no' } }] });
    expect(await flushOutbox()).toEqual({ sent: 0, dropped: 1 });
    expect(pendingCount()).toBe(0);
  });

  it('drops day-specific marks made on an earlier day (the server records "today")', async () => {
    const yesterday = Date.now() - 36 * 3_600_000;
    localStorage.setItem('saja:outbox:v1', JSON.stringify([{ key: 'prayer:old:fajr', method: 'PUT', path: '/prayer/log', body: { prayer: 'fajr', mark: 'prayed' }, at: yesterday }]));
    const calls = fakeServer({ 'PUT /prayer/log': () => [200, { ok: true }] });
    expect(await flushOutbox()).toEqual({ sent: 0, dropped: 1 });
    expect(calls).toHaveLength(0);
  });
});

describe('reconnect', () => {
  it('switches back online when the server answers again, then flushes the queue', async () => {
    vi.resetModules();
    const { bootstrap } = await import('./sync');
    const { useConnection: conn } = await import('@/store/connection');
    const outbox = await import('./outbox');
    offlineFetch();
    await bootstrap();
    expect(conn.getState().status).toBe('offline');
    outbox.enqueue({ key: 'item:today:m2', method: 'PUT', path: '/day/items/m2', body: { done: true } });
    const calls = fakeServer({
      '/system/status': () => [200, { ok: true, modes: { ai: 'demo' }, content: { reviewed: false, publishedDocuments: 0, demoDocuments: 1 } }],
      '/auth/me': () => [200, { user: null }],
      'PUT /day/items/m2': () => [200, { ok: true }],
    });
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(conn.getState().status).toBe('online'));
    await vi.waitFor(() => expect(calls.some((c) => c.url === '/api/day/items/m2')).toBe(true));
    expect(outbox.pendingCount()).toBe(0);
  });
});
