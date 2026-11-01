import { useEffect, useMemo, useState } from 'react';
import { CITIES, computePrayerTimes, currentPrayer, localNow, nextPrayer, skyPhase, type MethodId, type PrayerLocation } from '@/domain/prayerTimes';
import { recommend, topicsToRevisit } from '@/domain/adaptive';
import { unlockedLocations } from '@/domain/world';
import { LOCATIONS } from '@/content/world';
import { MISSIONS } from '@/content/missions';
import { useSettings } from '@/store/settings';
import { useProgress } from '@/store/progress';
import { useProfile } from '@/store/profile';
import { useLearner } from '@/store/learner';
import type { L10n } from '@/domain/types';

/** Re-renders every `ms` (default 30s) — for clocks and countdowns. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

export const PRAYER_NAMES: Record<string, L10n> = {
  fajr: { en: 'Fajr', ar: 'الفجر' },
  sunrise: { en: 'Sunrise', ar: 'الشروق' },
  dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
  asr: { en: 'Asr', ar: 'العصر' },
  maghrib: { en: 'Maghrib', ar: 'المغرب' },
  isha: { en: 'Isha', ar: 'العشاء' },
};

export function usePrayerLocation(): { loc: PrayerLocation; label: L10n; method: MethodId } {
  const place = useSettings((s) => s.prayerPlace);
  const method = useSettings((s) => s.method);
  return useMemo(() => {
    if (place.custom) {
      const c = place.custom;
      return { loc: { lat: c.lat, lng: c.lng, timeZone: c.timeZone }, label: { en: c.label, ar: c.label }, method: method === 'auto' ? 'MWL' : method };
    }
    const city = CITIES.find((c) => c.id === place.cityId) ?? CITIES[0];
    return { loc: { lat: city.lat, lng: city.lng, timeZone: city.timeZone }, label: city.name, method: method === 'auto' ? city.method : method };
  }, [place, method]);
}

export function usePrayerInfo() {
  const now = useNow();
  const { loc, label, method } = usePrayerLocation();
  const asr = useSettings((s) => s.asr);
  return useMemo(() => {
    const ln = localNow(loc.timeZone, now);
    const times = computePrayerTimes(ln, loc, { method, asr });
    return { times, nowHours: ln.hours, next: nextPrayer(times, ln.hours), current: currentPrayer(times, ln.hours), phase: skyPhase(times, ln.hours), label, weekday: new Date(Date.UTC(ln.year, ln.month - 1, ln.day)).getUTCDay() };
  }, [now, loc, method, asr, label]);
}

export function useJourney() {
  const results = useProgress((s) => s.results);
  const profile = useProfile((s) => s.profile);
  const model = useLearner((s) => s.model);
  return useMemo(() => {
    const completed = Object.keys(results);
    const unlocked = unlockedLocations(LOCATIONS, { completed }, MISSIONS);
    const recs = recommend({ model, missions: MISSIONS, completed, unlocked, ageBand: profile?.ageBand ?? 'adult', interests: profile?.interests ?? [] });
    const openChapters = LOCATIONS.filter((l) => unlocked.has(l.id)).map((l) => l.chapter);
    return {
      completed,
      unlocked,
      recs,
      next: recs[0],
      weak: topicsToRevisit(model),
      chapter: Math.max(1, ...openChapters),
      lanterns: completed.length,
      total: MISSIONS.length,
    };
  }, [results, profile, model]);
}

export function formatDuration(mins: number, t: (k: 'time.min' | 'time.hmin', v: Record<string, number>) => string) {
  if (mins < 60) return t('time.min', { n: mins });
  return t('time.hmin', { h: Math.floor(mins / 60), m: mins % 60 });
}
