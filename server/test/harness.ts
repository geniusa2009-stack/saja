import { loadConfig } from '../config.ts';
import { createServices, type Overrides } from '../services.ts';
import { createApp } from '../app.ts';
import type { Services } from '../context.ts';

/** A browser-like client: keeps its own session cookie and sends the CSRF header. */
let ipSeq = 0;
export class Client {
  cookie = '';
  ip = `10.0.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;
  constructor(private app: ReturnType<typeof createApp>) {}
  async req<T = any>(method: string, path: string, body?: unknown, opts: { csrf?: boolean; origin?: string } = {}): Promise<{ status: number; data: T }> {
    const form = body instanceof FormData;
    const headers: Record<string, string> = form ? {} : { 'content-type': 'application/json' };
    if (opts.csrf !== false) headers['x-saja-csrf'] = '1';
    if (opts.origin) headers.origin = opts.origin;
    headers['x-forwarded-for'] = this.ip;
    if (this.cookie) headers.cookie = this.cookie;
    const res = await this.app.request(`/api${path}`, { method, headers, body: body === undefined ? undefined : form ? body : JSON.stringify(body) });
    const set = res.headers.get('set-cookie');
    if (set) {
      const m = set.match(/saja_session=([^;]*)/);
      if (m) this.cookie = m[1] ? `saja_session=${m[1]}` : '';
    }
    const text = await res.text();
    return { status: res.status, data: text ? JSON.parse(text) : null };
  }
  get = <T = any>(p: string) => this.req<T>('GET', p);
  post = <T = any>(p: string, b?: unknown) => this.req<T>('POST', p, b ?? {});
  put = <T = any>(p: string, b?: unknown) => this.req<T>('PUT', p, b ?? {});
  del = <T = any>(p: string) => this.req<T>('DELETE', p);
  upload = <T = any>(name: string, type: string, data: Uint8Array | string) => {
    const f = new FormData();
    f.set('file', new File([typeof data === 'string' ? data : new Uint8Array(data)], name, { type }));
    return this.req<T>('POST', '/uploads', f);
  };
}

export async function createTestServer(overrides: Overrides = {}) {
  const config = loadConfig({ SAJA_ENV: 'test', TRUST_PROXY: 'true' } as NodeJS.ProcessEnv);
  const services = await createServices(config, overrides);
  const app = createApp(services);
  return { app, services, client: () => new Client(app), close: () => services.db.close() };
}

export const CHARACTER = { skin: 2, hair: 'short', hairColor: 0, outfit: 'tunic', outfitColor: 1, accessory: 'satchel' };

/** Creates a guest with a completed profile and declared age band. */
export async function traveller(c: Client, band: 'child' | 'teen' | 'adult' = 'adult', name = 'Yusuf') {
  await c.post('/auth/guest');
  await c.post('/profile/age', { band });
  await c.put('/profile', { displayName: name, locale: 'en', purpose: band === 'child' ? 'child' : 'learn-more', level: 'beginner', modality: 'hands-on', goals: ['prayer'], interests: ['prayer'], character: CHARACTER, completed: true });
  return c;
}

export async function account(c: Client, band: 'child' | 'teen' | 'adult', email: string) {
  await traveller(c, band);
  const r = await c.post('/auth/signup', { email, password: 'correct horse battery' });
  if (r.status !== 201) throw new Error(`signup failed: ${JSON.stringify(r.data)}`);
  return c;
}

export async function grantRole(s: Services, userId: string, role: string) {
  await s.db.query('insert into user_roles (user_id, role) values ($1, $2) on conflict do nothing', [userId, role]);
}

export async function makeScholar(s: Services, userId: string, status: 'unverified' | 'pending' | 'verified' = 'verified') {
  await grantRole(s, userId, 'scholar');
  const [row] = await s.db.query<{ id: string }>(
    `insert into scholar_profiles (user_id, display_name, title, specialization, verification_status, verification_scope, verified_at)
     values ($1, 'Test Scholar', '{"en":"Scholar","ar":"عالم"}', '{"en":"Fiqh","ar":"فقه"}', $2, 'fiqh of worship', case when $2 = 'verified' then now() end) returning id`,
    [userId, status],
  );
  return row.id;
}
