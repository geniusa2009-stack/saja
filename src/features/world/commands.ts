import { create } from 'zustand';
import type { LocationId } from '@/domain/types';

/** Commands for the world view (e.g. "walk to the place that just woke"). */
interface WorldCommandState {
  walk: LocationId | null;
  requestWalk: (id: LocationId) => void;
  consume: () => void;
}
export const useWorldCommand = create<WorldCommandState>((set) => ({
  walk: null,
  requestWalk: (walk) => set({ walk }),
  consume: () => set({ walk: null }),
}));
