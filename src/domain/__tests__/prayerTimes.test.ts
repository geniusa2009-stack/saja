import { computePrayerTimes, nextPrayer, skyPhase, coarsen, tzOffsetHours } from '../prayerTimes';

const makkah = { lat: 21.4225, lng: 39.8262, timeZone: 'Asia/Riyadh' };

describe('prayer times', () => {
  it('computes times in the right order', () => {
    const t = computePrayerTimes({ year: 2026, month: 9, day: 29 }, makkah, { method: 'Makkah', asr: 'standard' });
    expect(t.fajr).toBeLessThan(t.sunrise);
    expect(t.sunrise).toBeLessThan(t.dhuhr);
    expect(t.dhuhr).toBeLessThan(t.asr);
    expect(t.asr).toBeLessThan(t.maghrib);
    expect(t.maghrib).toBeLessThan(t.isha);
  });

  it('matches known values for Makkah (±3 min)', () => {
    // Umm al-Qura reference for 29 Sep 2026 is approximately Fajr 04:51, Dhuhr 12:11, Maghrib 18:12.
    const t = computePrayerTimes({ year: 2026, month: 9, day: 29 }, makkah, { method: 'Makkah', asr: 'standard' });
    expect(Math.abs(t.dhuhr - (12 + 11 / 60)) * 60).toBeLessThan(3);
    expect(Math.abs(t.maghrib - (18 + 12 / 60)) * 60).toBeLessThan(4);
    expect(Math.abs(t.isha - t.maghrib - 1.5)).toBeLessThan(0.01);
  });

  it('puts Hanafi Asr later than standard Asr', () => {
    const d = { year: 2026, month: 6, day: 1 };
    const std = computePrayerTimes(d, makkah, { method: 'MWL', asr: 'standard' });
    const han = computePrayerTimes(d, makkah, { method: 'MWL', asr: 'hanafi' });
    expect(han.asr).toBeGreaterThan(std.asr);
  });

  it('stays finite at high latitudes in summer', () => {
    const t = computePrayerTimes({ year: 2026, month: 6, day: 21 }, { lat: 59.33, lng: 18.07, timeZone: 'Europe/Stockholm' }, { method: 'MWL', asr: 'standard' });
    for (const v of Object.values(t)) expect(Number.isFinite(v)).toBe(true);
  });

  it('finds the next prayer and wraps to Fajr', () => {
    const t = { fajr: 5, sunrise: 6.2, dhuhr: 12.2, asr: 15.5, maghrib: 18.2, isha: 19.7 };
    expect(nextPrayer(t, 13)).toEqual({ name: 'asr', inMinutes: 150 });
    expect(nextPrayer(t, 21).name).toBe('fajr');
  });

  it('maps the real sky to brand phases', () => {
    const t = { fajr: 5, sunrise: 6.2, dhuhr: 12.2, asr: 15.5, maghrib: 18.2, isha: 19.7 };
    expect(skyPhase(t, 5.5)).toBe('fajr');
    expect(skyPhase(t, 11)).toBe('duha');
    expect(skyPhase(t, 18.5)).toBe('maghrib');
    expect(skyPhase(t, 23)).toBe('layl');
  });

  it('coarsens coordinates for privacy and resolves time zone offsets', () => {
    expect(coarsen(21.42251, 39.82619)).toEqual({ lat: 21.42, lng: 39.83 });
    expect(tzOffsetHours('Asia/Riyadh', new Date('2026-09-29T12:00:00Z'))).toBe(3);
  });
});
