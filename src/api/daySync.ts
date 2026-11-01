/**
 * My Day mirrors to the server (plans, prayer marks, goals, places) and asks it
 * to schedule real reminders. The page keeps planning locally so it's instant;
 * offline, nothing here does anything and reminders say they can't be sent.
 */
import { useCallback, useEffect, useState } from 'react';
import type { L10n } from '@/domain/types';
import type { DayPrefs } from '@/domain/planner';
import { CITIES } from '@/domain/prayerTimes';
import type { PrayerPlace } from '@/store/settings';
import { useConnection } from '@/store/connection';
import { api, ApiError } from './client';
import { sendOrQueue } from './outbox';

const live = () => useConnection.getState().status === 'online' && !!useConnection.getState().me;
const quiet = (p: Promise<unknown>) => void p.catch(() => undefined);
/** Idempotent My Day writes are queued while offline and sent after reconnecting. */
const safeWrite = (key: string, method: 'PUT' | 'POST' | 'DELETE', path: string, body?: unknown) => void sendOrQueue({ key, method, path, body }, live());

export type ReminderResult = { status: 'scheduled'; at: Date } | { status: 'duplicate' | 'offline' | 'disabled' | 'error' };

export const daySync = {
  get live() {
    return live();
  },
  markPrayer(prayer: string, mark: 'prayed' | 'later' | null) {
    safeWrite(`prayer:${new Date().toDateString()}:${prayer}`, 'PUT', '/prayer/log', { prayer, mark });
  },

  itemDone(itemId: string, done: boolean) {
    safeWrite(`item:${new Date().toDateString()}:${itemId}`, 'PUT', `/day/items/${encodeURIComponent(itemId)}`, { done });
  },
  prefs(prefs: DayPrefs) {
    // The server only keeps these when "schedule" memory is on.
    if (live()) quiet(api.put('/day/preferences', { ...prefs, reminderStyle: prefs.reminderStyle ?? 'gentle' }));
  },
  prayerPlace(place: PrayerPlace, method: string, asr: 'standard' | 'hanafi') {
    if (!live()) return;
    const city = place.cityId ? CITIES.find((c) => c.id === place.cityId) : undefined;
    quiet(
      api.put('/prayer/preferences', {
        cityId: place.custom ? null : (city?.id ?? null),
        coords: place.custom ? { lat: place.custom.lat, lng: place.custom.lng } : null, // coarsened to ~1 km by the server
        timeZone: place.custom?.timeZone ?? city?.timeZone ?? 'UTC',
        method,
        asr,
      }),
    );
  },
  async addGoal(text: string): Promise<string | undefined> {
    if (!live()) return undefined;
    try {
      return (await api.post<{ id: string }>('/day/goals', { text })).id;
    } catch {
      return undefined;
    }
  },
  toggleGoal(sid: string | undefined, done: boolean) {
    if (live() && sid) quiet(api.put(`/day/goals/${sid}`, { done }));
  },
  removeGoal(sid: string | undefined) {
    if (live() && sid) quiet(api.del(`/day/goals/${sid}`));
  },
  /** "Remind me later": a real scheduled notification (in-app, plus push if the person enabled it). */
  async remind(prayer: string, name: L10n, at: Date): Promise<ReminderResult> {
    if (!live()) return { status: 'offline' };
    const date = at.toISOString().slice(0, 10);
    try {
      const r = await api.post<{ id: string | null; scheduled: boolean }>('/notifications/schedule', {
        category: 'prayer',
        title: { en: `Time for ${name.en}`, ar: `حان وقت ${name.ar}` },
        body: { en: 'You asked SAJA to remind you.', ar: 'طلبت من سجى أن تذكّرك.' },
        at: at.toISOString(),
        url: '/day',
        dedupeKey: `prayer-${date}-${prayer}`,
      });
      return r.scheduled ? { status: 'scheduled', at } : { status: 'duplicate' };
    } catch (e) {
      return { status: e instanceof ApiError && e.code === 'forbidden' ? 'disabled' : 'error' };
    }
  },
};

export interface ServerDay {
  date: string;
  plan: { items: import('@/domain/planner').PlanItem[]; done: string[]; constraints: import('@/domain/planner').Constraint[]; headline: unknown };
}

/**
 * The durable plan from the server. The device sends only structured constraints
 * parsed from what the person typed; their words stay on the device.
 */
export function useServerDay(online: boolean) {
  const [day, setDay] = useState<ServerDay | null>(null);
  const reload = useCallback(async () => {
    if (!live()) return setDay(null);
    try {
      setDay(await api.get<ServerDay>('/day'));
    } catch {
      setDay(null);
    }
  }, []);
  useEffect(() => {
    if (online) void reload();
    else setDay(null);
  }, [online, reload]);
  const setConstraints = useCallback(async (constraints: import('@/domain/planner').Constraint[]) => {
    if (!live()) return;
    try {
      setDay(await api.put<ServerDay>('/day/constraints', { constraints }));
    } catch {
      /* keep the on-device plan */
    }
  }, []);
  return { day, reload, setConstraints };
}
