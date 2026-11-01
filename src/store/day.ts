import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_PREFS, type DayPrefs } from '@/domain/planner';
import type { PrayerName } from '@/domain/prayerTimes';
import { KEY, storage } from './storage';
import { useProfile } from './profile';

export type PrayerMark = 'prayed' | 'later';

export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface DayState {
  prefs: DayPrefs;
  prefsConfigured: boolean;
  /** What the person told the planner today, keyed by date. */
  notes: Record<string, string>;
  done: Record<string, string[]>; // date → plan item ids
  prayers: Record<string, Partial<Record<Exclude<PrayerName, 'sunrise'>, PrayerMark>>>;
  /** `sid` is the server id once the goal has been saved there. */
  goals: { id: string; text: string; done: boolean; sid?: string }[];
  setPrefs: (p: Partial<DayPrefs>) => void;
  setNote: (text: string) => void;
  toggleDone: (itemId: string) => void;
  markPrayer: (p: Exclude<PrayerName, 'sunrise'>, m: PrayerMark | null) => void;
  addGoal: (text: string) => string;
  setGoalSid: (id: string, sid: string) => void;
  toggleGoal: (id: string) => void;
  removeGoal: (id: string) => void;
  forgetSchedule: () => void;
}

export const useDay = create<DayState>()(
  persist(
    (set, get) => ({
      prefs: DEFAULT_PREFS,
      prefsConfigured: false,
      notes: {},
      done: {},
      prayers: {},
      goals: [],
      setPrefs: (p) => set({ prefs: { ...get().prefs, ...p }, prefsConfigured: true }),
      setNote: (text) => set({ notes: { ...get().notes, [todayKey()]: text } }),
      toggleDone: (id) => {
        const k = todayKey();
        const cur = get().done[k] ?? [];
        set({ done: { ...get().done, [k]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] } });
      },
      markPrayer: (p, m) => {
        const k = todayKey();
        const cur = { ...(get().prayers[k] ?? {}) };
        if (m) cur[p] = m;
        else delete cur[p];
        set({ prayers: { ...get().prayers, [k]: cur } });
      },
      addGoal: (text) => {
        const id = `g${Date.now()}`;
        set({ goals: [...get().goals, { id, text, done: false }] });
        return id;
      },
      setGoalSid: (id, sid) => set({ goals: get().goals.map((g) => (g.id === id ? { ...g, sid } : g)) }),
      toggleGoal: (id) => set({ goals: get().goals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)) }),
      removeGoal: (id) => set({ goals: get().goals.filter((g) => g.id !== id) }),
      forgetSchedule: () => set({ prefs: DEFAULT_PREFS, prefsConfigured: false }),
    }),
    {
      name: KEY('day'),
      storage,
      partialize: (s) => {
        const mem = useProfile.getState().memory;
        // Schedule details are only kept on the device if the person allowed it.
        return mem.schedule ? s : { ...s, prefs: DEFAULT_PREFS, prefsConfigured: false, notes: {} };
      },
    },
  ),
);
