/**
 * Astronomical prayer-time calculation, computed on-device.
 * Based on the widely used PrayTimes.org formulas (sun declination + equation of time).
 *
 * Privacy: coordinates never leave the device and are rounded to ~1 km before storage.
 */

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export const PRAYERS: Exclude<PrayerName, 'sunrise'>[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export type MethodId = 'MWL' | 'ISNA' | 'Egypt' | 'Makkah' | 'Karachi';
export type AsrSchool = 'standard' | 'hanafi';

interface Method {
  fajr: number; // degrees below horizon
  isha: number | { minutes: number }; // degrees, or minutes after maghrib
}

export const METHODS: Record<MethodId, Method> = {
  MWL: { fajr: 18, isha: 17 },
  ISNA: { fajr: 15, isha: 15 },
  Egypt: { fajr: 19.5, isha: 17.5 },
  Makkah: { fajr: 18.5, isha: { minutes: 90 } },
  Karachi: { fajr: 18, isha: 18 },
};

export interface PrayerLocation {
  lat: number;
  lng: number;
  timeZone: string; // IANA
}

export interface PrayerSettings {
  method: MethodId;
  asr: AsrSchool;
}

export type PrayerTimes = Record<PrayerName, number>; // fractional hours, location-local

/* ── math helpers (degrees) ─────────────────────────────────── */
const dtr = (d: number) => (d * Math.PI) / 180;
const rtd = (r: number) => (r * 180) / Math.PI;
const sin = (d: number) => Math.sin(dtr(d));
const cos = (d: number) => Math.cos(dtr(d));
const tan = (d: number) => Math.tan(dtr(d));
const arcsin = (x: number) => rtd(Math.asin(x));
const arccos = (x: number) => rtd(Math.acos(x));
const arctan2 = (y: number, x: number) => rtd(Math.atan2(y, x));
const arccot = (x: number) => rtd(Math.atan(1 / x));
const fix = (a: number, b: number) => {
  const r = a - b * Math.floor(a / b);
  return r < 0 ? r + b : r;
};
const fixAngle = (a: number) => fix(a, 360);
const fixHour = (a: number) => fix(a, 24);

function julian(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function sunPosition(jd: number) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * sin(g) + 0.02 * sin(2 * g));
  const e = 23.439 - 0.00000036 * D;
  const RA = arctan2(cos(e) * sin(L), cos(L)) / 15;
  const equation = q / 15 - fixHour(RA);
  const declination = arcsin(sin(e) * sin(L));
  return { declination, equation };
}

/** Offset (hours) of an IANA time zone from UTC on a given date. */
export function tzOffsetHours(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round(((asUTC - date.getTime()) / 3_600_000) * 4) / 4;
}

/** Calendar date (y, m, d) and fractional hour "now" in the location's zone. */
export function localNow(timeZone: string, now: Date = new Date()) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const p = Object.fromEntries(dtf.formatToParts(now).map((x) => [x.type, x.value]));
  return { year: +p.year, month: +p.month, day: +p.day, hours: +p.hour + +p.minute / 60 };
}

export function computePrayerTimes(
  date: { year: number; month: number; day: number },
  loc: PrayerLocation,
  settings: PrayerSettings = { method: 'MWL', asr: 'standard' },
): PrayerTimes {
  const method = METHODS[settings.method];
  const tz = tzOffsetHours(loc.timeZone, new Date(Date.UTC(date.year, date.month - 1, date.day, 12)));
  const jDate = julian(date.year, date.month, date.day) - loc.lng / (15 * 24);

  const midDay = (t: number) => fixHour(12 - sunPosition(jDate + t).equation);
  const sunAngleTime = (angle: number, t: number, ccw: boolean) => {
    const decl = sunPosition(jDate + t).declination;
    const noon = midDay(t);
    const T = (1 / 15) * arccos((-sin(angle) - sin(decl) * sin(loc.lat)) / (cos(decl) * cos(loc.lat)));
    return noon + (ccw ? -T : T);
  };
  const asrTime = (factor: number, t: number) => {
    const decl = sunPosition(jDate + t).declination;
    const angle = -arccot(factor + tan(Math.abs(loc.lat - decl)));
    return sunAngleTime(angle, t, false);
  };

  // Two refinement passes starting from default estimates (hours → day portion).
  let times = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, maghrib: 18, isha: 18 };
  for (let i = 0; i < 2; i++) {
    const p = Object.fromEntries(Object.entries(times).map(([k, v]) => [k, v / 24])) as typeof times;
    times = {
      fajr: sunAngleTime(method.fajr, p.fajr, true),
      sunrise: sunAngleTime(0.833, p.sunrise, true),
      dhuhr: midDay(p.dhuhr),
      asr: asrTime(settings.asr === 'hanafi' ? 2 : 1, p.asr),
      maghrib: sunAngleTime(0.833, p.maghrib, false),
      isha: typeof method.isha === 'number' ? sunAngleTime(method.isha, p.isha, false) : 0,
    };
  }

  const shift = tz - loc.lng / 15;
  const out = Object.fromEntries(Object.entries(times).map(([k, v]) => [k, v + shift])) as PrayerTimes;
  if (typeof method.isha !== 'number') out.isha = out.maghrib + method.isha.minutes / 60;

  // High-latitude safety net ("night middle"): if twilight never ends, bound by half the night.
  const night = fixHour(out.sunrise - out.maghrib);
  if (!Number.isFinite(out.fajr) || fixHour(out.sunrise - out.fajr) > night / 2) out.fajr = out.sunrise - night / 2;
  if (!Number.isFinite(out.isha) || fixHour(out.isha - out.maghrib) > night / 2) out.isha = out.maghrib + night / 2;

  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, fixHour(v)])) as PrayerTimes;
}

export function formatHour(h: number, locale: string, hour12?: boolean): string {
  const total = Math.round(fixHour(h) * 60);
  const d = new Date(Date.UTC(2000, 0, 1, Math.floor(total / 60) % 24, total % 60));
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12, timeZone: 'UTC' }).format(d);
}

/** Next prayer after `nowHours` (wraps to tomorrow's Fajr). */
export function nextPrayer(times: PrayerTimes, nowHours: number): { name: (typeof PRAYERS)[number]; inMinutes: number } {
  for (const name of PRAYERS) {
    if (times[name] > nowHours) return { name, inMinutes: Math.round((times[name] - nowHours) * 60) };
  }
  return { name: 'fajr', inMinutes: Math.round((24 - nowHours + times.fajr) * 60) };
}

/** Which prayer's time we are currently in (null between sunrise and dhuhr). */
export function currentPrayer(times: PrayerTimes, nowHours: number): (typeof PRAYERS)[number] | null {
  if (nowHours < times.fajr) return 'isha';
  if (nowHours < times.sunrise) return 'fajr';
  if (nowHours < times.dhuhr) return null;
  if (nowHours < times.asr) return 'dhuhr';
  if (nowHours < times.maghrib) return 'asr';
  if (nowHours < times.isha) return 'maghrib';
  return 'isha';
}

/** Time-of-day phases from the brand board — the world's light follows the real sky. */
export type SkyPhase = 'fajr' | 'duha' | 'maghrib' | 'layl';

export function skyPhase(times: PrayerTimes, nowHours: number): SkyPhase {
  if (nowHours >= times.fajr && nowHours < times.sunrise + 0.5) return 'fajr';
  if (nowHours >= times.sunrise + 0.5 && nowHours < times.maghrib - 0.4) return 'duha';
  if (nowHours >= times.maghrib - 0.4 && nowHours < times.isha) return 'maghrib';
  return 'layl';
}

export interface City {
  id: string;
  name: { en: string; ar: string };
  lat: number;
  lng: number;
  timeZone: string;
  method: MethodId;
}

export const CITIES: City[] = [
  { id: 'makkah', name: { en: 'Makkah', ar: 'مكة المكرمة' }, lat: 21.4225, lng: 39.8262, timeZone: 'Asia/Riyadh', method: 'Makkah' },
  { id: 'madinah', name: { en: 'Madinah', ar: 'المدينة المنورة' }, lat: 24.4672, lng: 39.6111, timeZone: 'Asia/Riyadh', method: 'Makkah' },
  { id: 'cairo', name: { en: 'Cairo', ar: 'القاهرة' }, lat: 30.0444, lng: 31.2357, timeZone: 'Africa/Cairo', method: 'Egypt' },
  { id: 'dubai', name: { en: 'Dubai', ar: 'دبي' }, lat: 25.2048, lng: 55.2708, timeZone: 'Asia/Dubai', method: 'Makkah' },
  { id: 'amman', name: { en: 'Amman', ar: 'عمّان' }, lat: 31.9454, lng: 35.9284, timeZone: 'Asia/Amman', method: 'MWL' },
  { id: 'istanbul', name: { en: 'Istanbul', ar: 'إسطنبول' }, lat: 41.0082, lng: 28.9784, timeZone: 'Europe/Istanbul', method: 'MWL' },
  { id: 'london', name: { en: 'London', ar: 'لندن' }, lat: 51.5072, lng: -0.1276, timeZone: 'Europe/London', method: 'MWL' },
  { id: 'paris', name: { en: 'Paris', ar: 'باريس' }, lat: 48.8566, lng: 2.3522, timeZone: 'Europe/Paris', method: 'MWL' },
  { id: 'newyork', name: { en: 'New York', ar: 'نيويورك' }, lat: 40.7128, lng: -74.006, timeZone: 'America/New_York', method: 'ISNA' },
  { id: 'toronto', name: { en: 'Toronto', ar: 'تورنتو' }, lat: 43.6532, lng: -79.3832, timeZone: 'America/Toronto', method: 'ISNA' },
  { id: 'karachi', name: { en: 'Karachi', ar: 'كراتشي' }, lat: 24.8607, lng: 67.0011, timeZone: 'Asia/Karachi', method: 'Karachi' },
  { id: 'jakarta', name: { en: 'Jakarta', ar: 'جاكرتا' }, lat: -6.2088, lng: 106.8456, timeZone: 'Asia/Jakarta', method: 'MWL' },
  { id: 'kualalumpur', name: { en: 'Kuala Lumpur', ar: 'كوالالمبور' }, lat: 3.139, lng: 101.6869, timeZone: 'Asia/Kuala_Lumpur', method: 'MWL' },
  { id: 'lagos', name: { en: 'Lagos', ar: 'لاغوس' }, lat: 6.5244, lng: 3.3792, timeZone: 'Africa/Lagos', method: 'MWL' },
];

/** Round coordinates to 2 decimals (~1 km) — enough for prayer times, never precise enough to locate a home. */
export function coarsen(lat: number, lng: number) {
  return { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 };
}
