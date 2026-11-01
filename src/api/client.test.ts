import { api, ApiError } from './client';

type Call = { url: string; init: RequestInit };
function mockFetch(respond: (c: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const c = { url, init };
    calls.push(c);
    return respond(c);
  }) as typeof fetch;
  return calls;
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('API client', () => {
  it('sends the CSRF header on writes and same-origin credentials, never on reads', async () => {
    const calls = mockFetch(() => json(200, { ok: true }));
    await api.get('/x');
    await api.post('/y', { a: 1 });
    expect((calls[0].init.headers as Record<string, string>)['x-saja-csrf']).toBeUndefined();
    expect((calls[1].init.headers as Record<string, string>)['x-saja-csrf']).toBe('1');
    expect(calls[1].init.credentials).toBe('same-origin');
    expect(calls[1].url).toBe('/api/y');
  });

  it('turns network failures and non-JSON replies into an honest "offline" error', async () => {
    mockFetch(() => Promise.reject(new TypeError('down')));
    await expect(api.get('/x')).rejects.toMatchObject({ code: 'offline' });
    mockFetch(() => new Response('<!doctype html>', { status: 200 }));
    await expect(api.get('/x')).rejects.toMatchObject({ code: 'offline' });
  });

  it('keeps server refusals typed, with their details', async () => {
    mockFetch(() => json(422, { error: { code: 'policy_blocked', message: 'This message wasn’t sent.', details: { flags: ['phone'] } } }));
    const e = (await api.post("/circles/x/messages", { body: "call me" }).catch((x: unknown) => x)) as ApiError;
    expect(e).toBeInstanceOf(ApiError);
    expect(e.code).toBe('policy_blocked');
    expect(e.details).toEqual({ flags: ['phone'] });
    expect(e.offline).toBe(false);
  });
});
