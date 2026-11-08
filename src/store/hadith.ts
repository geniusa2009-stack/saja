import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { KEY, storage } from './storage';

/**
 * A separate, quiet store for the Hadith module.
 *
 * It deliberately does not touch the mission progress store: saving a hadith or
 * finishing a reflection is not a reward, a score or a measure of faith. A
 * reflection stays on this device, like a private notebook.
 */
export interface HadithReflection {
  id: string;
  activityId: string;
  at: number;
  lines: string[];
}

interface HadithState {
  saved: string[];
  explored: string[];
  completed: string[];
  reflections: HadithReflection[];
  toggleSaved: (id: string) => void;
  markExplored: (id: string) => void;
  completeActivity: (id: string) => void;
  addReflection: (activityId: string, lines: string[]) => void;
  deleteReflection: (id: string) => void;
  reset: () => void;
}

const initial = {
  saved: [] as string[],
  explored: [] as string[],
  completed: [] as string[],
  reflections: [] as HadithReflection[],
};

export const useHadith = create<HadithState>()(
  persist(
    (set, get) => ({
      ...initial,
      toggleSaved: (id) => set({ saved: get().saved.includes(id) ? get().saved.filter((x) => x !== id) : [...get().saved, id] }),
      markExplored: (id) => (get().explored.includes(id) ? undefined : set({ explored: [...get().explored, id] })),
      completeActivity: (id) => (get().completed.includes(id) ? undefined : set({ completed: [...get().completed, id] })),
      addReflection: (activityId, lines) => {
        const kept = lines.map((l) => l.trim()).filter(Boolean);
        if (!kept.length) return;
        set({
          reflections: [{ id: `hr${Date.now()}`, activityId, at: Date.now(), lines: kept }, ...get().reflections].slice(0, 100),
        });
      },
      deleteReflection: (id) => set({ reflections: get().reflections.filter((r) => r.id !== id) }),
      reset: () => set(initial),
    }),
    { name: KEY('hadith'), storage },
  ),
);
