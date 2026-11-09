import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile } from '@/domain/types';
import { KEY, storage } from '@/store/storage';
import type { ExperienceDisplay } from './experienceModel';

export function defaultDisplay(profile: Pick<Profile, 'ageBand' | 'purpose' | 'level'>): ExperienceDisplay {
  if (profile.ageBand === 'child') return { showStories: true, showWorld: true, showAdvanced: false };
  return {
    showStories: false,
    showWorld: false,
    showAdvanced: profile.level === 'confident' && profile.purpose === 'learn-more',
  };
}

interface State {
  byTraveller: Record<string, ExperienceDisplay>;
  setDisplay: (traveller: number, defaults: ExperienceDisplay, change: Partial<ExperienceDisplay>) => void;
  reset: () => void;
}

/** Explicit UI choices only, scoped to a traveller. No inferred beliefs, scores or activity history. */
export const useExperience = create<State>()(
  persist((set) => ({
    byTraveller: {},
    setDisplay: (traveller, defaults, change) => set((s) => ({
      byTraveller: { ...s.byTraveller, [String(traveller)]: { ...defaults, ...s.byTraveller[String(traveller)], ...change } },
    })),
    reset: () => set({ byTraveller: {} }),
  }), { name: KEY('experience'), storage }),
);

export function displayFor(profile: Pick<Profile, 'createdAt' | 'ageBand' | 'purpose' | 'level'>, saved: Record<string, ExperienceDisplay>): ExperienceDisplay {
  return { ...defaultDisplay(profile), ...saved[String(profile.createdAt)] };
}
