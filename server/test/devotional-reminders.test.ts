// @vitest-environment node
import { createTestServer, traveller } from './harness.ts';
import { runDevotionalRoutines, localDateAndMinute, routineIsDue } from '../modules/notifications/routines.ts';
import { runDue } from '../modules/notifications/service.ts';

describe('Opt-in devotional reminder schedules', () => {
  it('uses location-local day/time through timezone and handles DST without tracking worship', () => {
    expect(localDateAndMinute(new Date('2026-11-09T05:00:00Z'), 'Africa/Cairo')).toEqual({
      date: '2026-11-09', minute: 420,
    });
    expect(routineIsDue({
      user_id: 'u', kind: 'morning', enabled: true, time: '07:00',
      timeZone: 'Africa/Cairo', last_local_date: null,
    }, new Date('2026-11-09T05:01:00Z'))).toMatchObject({ due: true });
    expect(routineIsDue({
      user_id: 'u', kind: 'morning', enabled: false, time: '07:00',
      timeZone: 'Africa/Cairo', last_local_date: null,
    }, new Date('2026-11-09T05:01:00Z')).due).toBe(false);
  });

  it('requires explicit opt-in, deduplicates ticks, and can turn reminders off', async () => {
    let now = new Date('2026-11-09T06:59:00Z');
    const t = await createTestServer({ now: () => now });
    try {
      const c = await traveller(t.client(), 'adult');
      const initial = await c.get('/notifications/routines');
      expect(initial.data.routines).toEqual([
        { kind: 'morning', enabled: false, time: '07:00', timeZone: 'UTC' },
        { kind: 'evening', enabled: false, time: '17:00', timeZone: 'UTC' },
      ]);
      expect(await runDevotionalRoutines(t.services)).toBe(0);
      expect((await c.put('/notifications/routines/morning', { enabled: true, time: '07:00', timeZone: 'UTC' })).status).toBe(200);
      expect((await c.put('/notifications/routines/evening', { enabled: false, time: '17:00', timeZone: 'UTC' })).status).toBe(200);
      now = new Date('2026-11-09T07:00:00Z');
      expect(await runDevotionalRoutines(t.services)).toBe(1);
      await runDue(t.services);
      expect(await runDevotionalRoutines(t.services)).toBe(0);
      const list = await c.get('/notifications');
      expect(list.data.items.filter((x: { category: string }) => x.category === 'adhkar')).toHaveLength(1);
      expect(list.data.items[0].title.en).toContain('morning');
      await c.put('/notifications/routines/morning', { enabled: false, time: '07:00', timeZone: 'UTC' });
      now = new Date('2026-11-10T07:01:00Z');
      expect(await runDevotionalRoutines(t.services)).toBe(0);
    } finally { await t.close(); }
  }, 60_000);

  it('rejects invalid timezone and time and allows a child only app-safe reminders', async () => {
    const t = await createTestServer();
    try {
      const child = await traveller(t.client(), 'child');
      expect((await child.put('/notifications/routines/morning', { enabled: true, time: '33:00', timeZone: 'UTC' })).status).toBe(400);
      expect((await child.put('/notifications/routines/morning', { enabled: true, time: '08:00', timeZone: 'Not/AZone' })).status).toBe(400);
      expect((await child.put('/notifications/routines/morning', { enabled: true, time: '08:00', timeZone: 'UTC' })).status).toBe(200);
      const prefs = await child.get('/notifications/preferences');
      expect(prefs.data.categories.adhkar.push).toBe(false);
      expect(prefs.data.pushAllowed).toBe(false);
    } finally { await t.close(); }
  }, 60_000);
});
