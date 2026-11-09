import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile } from '@/domain/types';
import { DEFAULT_PARENTAL, getSafetyPolicy, type ParentalSettings, type SafetyPolicy } from '@/domain/safety';
import { KEY, storage } from './storage';
import { useExperience } from '@/features/experience/experienceStore';

export type MemoryCategory = 'style' | 'topics' | 'schedule' | 'conversations';

interface ProfileState {
  profile: Profile | null;
  parental: ParentalSettings;
  memory: Record<MemoryCategory, boolean>;
  setProfile: (p: Profile) => void;
  updateProfile: (p: Partial<Profile>) => void;
  setParental: (p: Partial<ParentalSettings>) => void;
  setMemory: (c: MemoryCategory, on: boolean) => void;
  reset: () => void;
}

/** Memory defaults follow the safety policy: children start with the minimum. */
export function defaultMemory(policy: SafetyPolicy): Record<MemoryCategory, boolean> {
  const allowed = new Set(policy.memoryAllowed);
  return {
    style: allowed.has('style'),
    topics: allowed.has('topics'),
    schedule: allowed.has('schedule') && policy.ageBand === 'adult',
    conversations: false, // always opt-in
  };
}

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      parental: DEFAULT_PARENTAL,
      memory: { style: true, topics: true, schedule: false, conversations: false },
      setProfile: (profile) => set({ profile, memory: defaultMemory(getSafetyPolicy(profile.ageBand)) }),
      updateProfile: (p) => {
        const cur = get().profile;
        if (cur) set({ profile: { ...cur, ...p } });
      },
      setParental: (p) => set({ parental: { ...get().parental, ...p } }),
      setMemory: (c, on) => {
        const profile = get().profile;
        // Enforced here, not only in the UI: categories outside the policy cannot be enabled.
        if (on && profile && !getSafetyPolicy(profile.ageBand).memoryAllowed.includes(c)) return;
        set({ memory: { ...get().memory, [c]: on } });
      },
      reset: () => { useExperience.getState().reset(); set({ profile: null, parental: DEFAULT_PARENTAL }); },
    }),
    { name: KEY('profile'), storage },
  ),
);

export function usePolicy(): SafetyPolicy {
  const band = useProfile((s) => s.profile?.ageBand ?? 'adult');
  const parental = useProfile((s) => s.parental);
  return getSafetyPolicy(band, parental);
}
