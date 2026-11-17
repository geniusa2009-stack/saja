// @vitest-environment node
import { createTestServer, traveller } from './harness.ts';
import { computeToday } from '../modules/day.ts';
import { prayerWindow, runDailyPrayerAlerts } from '../modules/notifications/prayerAlerts.ts';

describe('Opt-in daily prayer time alerts', () => {
  it('uses a short delivery window and does not send hours late', () => {
    expect(prayerWindow(300, 300)).toBe(true);
    expect(prayerWindow(304, 300)).toBe(true);
    expect(prayerWindow(305, 300)).toBe(false);
    expect(prayerWindow(299, 300)).toBe(false);
  });

  it('requires a chosen prayer location, sends only a selected prayer and dedupes ticks', async () => {
    let now = new Date('2026-11-09T00:00:00Z');
    const t = await createTestServer({ now: () => now });
    try {
      const c = await traveller(t.client(), 'adult');
      const initial = await c.get('/notifications/prayer-alerts');
      expect(initial.data.enabled).toBe(false);
      expect(initial.data.locationConfigured).toBe(false);
      expect((await c.put('/notifications/prayer-alerts', { enabled: true, prayers: ['fajr'] })).status).toBe(400);
      expect((await c.put('/prayer/preferences', {
        cityId: 'makkah', coords: null, timeZone: 'Asia/Riyadh', method: 'Makkah', asr: 'standard',
      })).status).toBe(200);
      expect((await c.put('/notifications/prayer-alerts', { enabled: true, prayers: ['fajr', 'fajr'] })).status).toBe(200);
      const uid = (await c.get('/auth/me')).data.user.id;
      const times = (await computeToday(t.services, uid)).times;
      const fajrMins = Math.round(times.fajr * 60);
      now = new Date(Date.UTC(2026, 10, 9, Math.floor(fajrMins / 60) - 3, fajrMins % 60));
      expect(await runDailyPrayerAlerts(t.services)).toBe(1);
      expect(await runDailyPrayerAlerts(t.services)).toBe(1);
      const got = (await c.get('/notifications')).data.items as { category: string; status: string }[];
      expect(got.filter((n) => n.category === 'prayer')).toHaveLength(1);
      expect(got.filter((n) => n.category === 'prayer')[0].status).toBe('delivered');
      await c.put('/notifications/prayer-alerts', { enabled: false, prayers: ['fajr'] });
      now = new Date(Date.UTC(2026, 10, 10, Math.floor(fajrMins / 60) - 3, fajrMins % 60));
      expect(await runDailyPrayerAlerts(t.services)).toBe(0);
    } finally { await t.close(); }
  }, 60_000);

  it('rejects an active plan without selected prayers and protects children from system push', async () => {
    const t = await createTestServer();
    try {
      const c = await traveller(t.client(), 'child');
      await c.put('/prayer/preferences', {
        cityId: 'cairo', coords: null, timeZone: 'Africa/Cairo', method: 'Egypt', asr: 'standard',
      });
      expect((await c.put('/notifications/prayer-alerts', { enabled: true, prayers: [] })).status).toBe(400);
      expect((await c.put('/notifications/prayer-alerts', { enabled: true, prayers: ['maghrib'] })).status).toBe(200);
      const prefs = await c.get('/notifications/preferences');
      expect(prefs.data.categories.prayer.push).toBe(false);
      expect(prefs.data.pushAllowed).toBe(false);
    } finally { await t.close(); }
  }, 60_000);
});
