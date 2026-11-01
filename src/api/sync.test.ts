import { DEFAULT_LOOK } from '@/features/character/palette';
import type { Me } from './types';

const me = (over: Partial<Me['user']> = {}): Me => ({
  user: {
    id: 'u1',
    email: null,
    isGuest: true,
    roles: ['learner'],
    ageBand: 'child',
    age: { declared: 'child', approved: null, consent: 'pending' },
    communityAllowed: false,
    parental: { approveCircles: true, quickRepliesOnly: true, dailyMinutes: 30, approvedCircles: [] },
    memory: { style: true, topics: true, schedule: false, conversations: false },
    ...over,
  },
  profile: { display_name: 'Maryam', locale: 'en', purpose: 'child', level: 'beginner', modality: 'hands-on', goals: ['prayer'], interests: ['prayer'], character: DEFAULT_LOOK, onboarding_completed_at: '2026-09-01T00:00:00Z', created_at: '2026-09-01T00:00:00Z' },
});

function server(routes: Record<string, unknown>) {
  globalThis.fetch = (async (url: string) => {
    const path = url.replace(/^\/api/, '').split('?')[0];
    const body = routes[path];
    if (body === undefined) return new Response(JSON.stringify({ error: { code: 'not_found', message: 'x' } }), { status: 404 });
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
}

// Each test gets fresh module instances (bootstrap runs once per module), so stores are imported alongside.
async function fresh() {
  vi.resetModules();
  const [{ bootstrap }, { useConnection }, { useProfile }] = await Promise.all([import('./sync'), import('@/store/connection'), import('@/store/profile')]);
  useProfile.getState().reset();
  return { bootstrap, useConnection, useProfile };
}

describe('connection bootstrap', () => {
  it('falls back to offline demo mode when there is no server', async () => {
    globalThis.fetch = (() => Promise.reject(new TypeError('down'))) as typeof fetch;
    const { bootstrap, useConnection } = await fresh();
    await bootstrap();
    expect(useConnection.getState().status).toBe('offline');
  });

  it('treats the server as the authority on age, parental settings and memory — not the device', async () => {
    const { bootstrap, useConnection, useProfile } = await fresh();
    // The device claims "adult" (e.g. edited storage); the server says this is a child with guardian-set limits.
    useProfile.setState({ profile: { name: 'Maryam', look: DEFAULT_LOOK, purpose: 'child', ageBand: 'adult', level: 'beginner', goals: ['prayer'], interests: ['prayer'], modality: 'hands-on', createdAt: Date.parse('2026-09-01T00:00:00Z') } });
    server({
      '/system/status': { ok: true, modes: { ai: 'demo' }, content: { reviewed: false } },
      '/auth/me': me(),
      '/progress': { completed: [], results: [], achievements: [], world: { location: 'village', visited: ['village'] }, unlocked: ['village'] },
      '/day': { prayer: { log: {} }, plan: { done: [] }, goals: [] },
      '/notifications': { items: [], unread: 2 },
    });
    await bootstrap();
    const s = useProfile.getState();
    expect(useConnection.getState().status).toBe('online');
    expect(s.profile?.ageBand).toBe('child');
    expect(s.parental.quickRepliesOnly).toBe(true);
    expect(s.memory.schedule).toBe(false);
  });
});
