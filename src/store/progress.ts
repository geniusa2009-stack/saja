import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LocationId, MissionResult } from '@/domain/types';
import { KEY, storage } from './storage';

export interface Achievement {
  id: string;
  kind: 'artifact' | 'badge' | 'item' | 'story' | 'place';
  at: number;
  missionId?: string;
  locationId?: LocationId;
}

export interface Celebration {
  kind: 'mission' | 'unlock';
  missionId?: string;
  locationId?: LocationId;
}

interface ProgressState {
  results: Record<string, MissionResult>;
  location: LocationId;
  visited: LocationId[];
  achievements: Achievement[];
  saved: string[]; // saved knowledge ids
  reflections: { id: string; at: number; lines: string[] }[];
  celebrations: Celebration[];
  lastMissionId: string | null;
  lastStruggled: boolean;
  complete: (r: MissionResult, reward: Achievement, struggled: boolean) => void;
  moveTo: (l: LocationId) => void;
  unlockPlace: (l: LocationId) => void;
  toggleSaved: (id: string) => void;
  addReflection: (lines: string[]) => void;
  deleteReflection: (id: string) => void;
  pushCelebration: (c: Celebration) => void;
  shiftCelebration: () => void;
  clearLastMission: () => void;
  reset: () => void;
}

const initial = {
  results: {},
  location: 'village' as LocationId,
  visited: ['village'] as LocationId[],
  achievements: [] as Achievement[],
  saved: [] as string[],
  reflections: [] as ProgressState['reflections'],
  celebrations: [] as Celebration[],
  lastMissionId: null,
  lastStruggled: false,
};

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initial,
      complete: (r, reward, struggled) => {
        const s = get();
        const first = !s.results[r.missionId];
        set({
          results: { ...s.results, [r.missionId]: first ? r : { ...r, completedAt: r.completedAt } },
          achievements: first && !s.achievements.some((a) => a.id === reward.id) ? [...s.achievements, reward] : s.achievements,
          lastMissionId: r.missionId,
          lastStruggled: struggled,
        });
      },
      moveTo: (location) => set({ location, visited: get().visited.includes(location) ? get().visited : [...get().visited, location] }),
      unlockPlace: (l) => {
        if (get().achievements.some((a) => a.id === `place-${l}`)) return;
        set({ achievements: [...get().achievements, { id: `place-${l}`, kind: 'place', at: Date.now(), locationId: l }] });
      },
      toggleSaved: (id) => set({ saved: get().saved.includes(id) ? get().saved.filter((x) => x !== id) : [...get().saved, id] }),
      addReflection: (lines) => set({ reflections: [{ id: `r${Date.now()}`, at: Date.now(), lines }, ...get().reflections] }),
      deleteReflection: (id) => set({ reflections: get().reflections.filter((r) => r.id !== id) }),
      pushCelebration: (c) => set({ celebrations: [...get().celebrations, c] }),
      shiftCelebration: () => set({ celebrations: get().celebrations.slice(1) }),
      clearLastMission: () => set({ lastMissionId: null, lastStruggled: false }),
      reset: () => set(initial),
    }),
    { name: KEY('progress'), storage, partialize: ({ celebrations: _c, ...rest }) => rest },
  ),
);

export const completedIds = (s: { results: Record<string, MissionResult> }) => Object.keys(s.results);
