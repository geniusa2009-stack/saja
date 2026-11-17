/**
 * Opt-in reminder at each selected prayer time, using already-saved coarse
 * prayer preferences. No location access or worship-tracking stored here.
 */
import type { Services } from '../../context.ts';
import type { Queryable } from '../../db/index.ts';
import { one } from '../../db/index.ts';
import { PRAYERS, type PrayerName } from '../../../src/domain/prayerTimes.ts';
import { computeToday } from '../day.ts';
import { notify } from './service.ts';
import { AppError } from '../../lib/errors.ts';
import { log } from '../../lib/log.ts';

export type AlertPrayer = Exclude<PrayerName, 'sunrise'>;
export type PrayerAlertPrefs = { enabled: boolean; prayers: AlertPrayer[]; locationConfigured: boolean };

const names: Record<AlertPrayer, { ar: string; en: string }> = {
  fajr: { ar: 'الفجر', en: 'Fajr' },
  dhuhr: { ar: 'الظهر', en: 'Dhuhr' },
  asr: { ar: 'العصر', en: 'Asr' },
  maghrib: { ar: 'المغرب', en: 'Maghrib' },
  isha: { ar: 'العشاء', en: 'Isha' },
};

export function prayerWindow(nowMinutes: number, prayerMinutes: number): boolean {
  // Never deliver late alerts more than five minutes after scheduled time.
  const delta = nowMinutes - prayerMinutes;
  return delta >= 0 && delta < 5;
}

export async function getPrayerAlertPrefs(db: Queryable, userId: string): Promise<PrayerAlertPrefs> {
  const [pref, location] = await Promise.all([
    one<{ enabled: boolean; prayers: AlertPrayer[] }>(
      db, 'select enabled, prayers from prayer_alert_preferences where user_id = $1', [userId],
    ),
    one<{ configured: boolean }>(
      db, 'select true as configured from prayer_preferences where user_id = $1', [userId],
    ),
  ]);
  return { enabled: pref?.enabled ?? false, prayers: pref?.prayers ?? [...PRAYERS], locationConfigured: !!location };
}

export async function setPrayerAlertPrefs(
  db: Queryable, userId: string, input: Pick<PrayerAlertPrefs, 'enabled' | 'prayers'>,
): Promise<PrayerAlertPrefs> {
  const previous = await getPrayerAlertPrefs(db, userId);
  if (input.enabled && !previous.locationConfigured) {
    throw new AppError('bad_request', 'Save your selected prayer city or method first.');
  }
  const prayers = [...new Set(input.prayers)].filter((prayer): prayer is AlertPrayer => PRAYERS.includes(prayer));
  if (input.enabled && !prayers.length) {
    throw new AppError('bad_request', 'Select at least one prayer.');
  }
  const [row] = await db.query<{ enabled: boolean; prayers: AlertPrayer[] }>(
    `insert into prayer_alert_preferences (user_id, enabled, prayers) values ($1,$2,$3)
     on conflict (user_id) do update set enabled=$2, prayers=$3, updated_at=now()
     returning enabled, prayers`,
    [userId, input.enabled, prayers],
  );
  return { enabled: row.enabled, prayers: row.prayers, locationConfigured: true };
}

export async function runDailyPrayerAlerts(s: Services, limit = 500): Promise<number> {
  const rows = await s.db.query<{ user_id: string; prayers: AlertPrayer[] }>(
    'select user_id, prayers from prayer_alert_preferences where enabled = true limit $1',
    [limit],
  );
  let attempted = 0;
  for (const entry of rows) {
    try {
      const hasLocation = await one<{ configured: boolean }>(
        s.db, 'select true as configured from prayer_preferences where user_id = $1', [entry.user_id],
      );
      if (!hasLocation) continue;
      const plan = await computeToday(s, entry.user_id);
      for (const prayer of entry.prayers) {
        if (!PRAYERS.includes(prayer)) continue;
        if (!prayerWindow(plan.nowHours * 60, Math.round(plan.times[prayer] * 60))) continue;
        await notify(s, entry.user_id, {
          category: 'prayer',
          title: { ar: `حان وقت صلاة ${names[prayer].ar}`, en: `Time for ${names[prayer].en}` },
          body: { ar: 'تذكير هادئ حسب المدينة وطريقة الحساب التي اخترتها.', en: 'A gentle reminder based on your saved location and calculation method.' },
          url: '/day', dedupeKey: `daily-prayer-${plan.date}-${prayer}`,
        });
        attempted++;
      }
    } catch (error) { log.error('scheduler.daily_prayer_failed', { error }); }
  }
  return attempted;
}
