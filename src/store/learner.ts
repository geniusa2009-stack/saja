import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applySignal, createLearnerModel, type LearnerModel, type LearningSignal } from '@/domain/adaptive';
import type { Modality } from '@/domain/types';
import { KEY, storage } from './storage';
import { useProfile } from './profile';

interface LearnerState {
  model: LearnerModel;
  signal: (s: LearningSignal) => void;
  setPreferred: (m: Modality) => void;
  setDifficulty: (d: LearnerModel['difficulty']) => void;
  forgetStyle: () => void;
  forgetTopics: () => void;
  reset: (preferred?: Modality) => void;
}

export const useLearner = create<LearnerState>()(
  persist(
    (set, get) => ({
      model: createLearnerModel(),
      signal: (s) => set({ model: applySignal(get().model, s) }),
      setPreferred: (preferred) => set({ model: { ...get().model, preferred } }),
      setDifficulty: (difficulty) => set({ model: { ...get().model, difficulty } }),
      forgetStyle: () => {
        const fresh = createLearnerModel(get().model.preferred);
        set({ model: { ...get().model, modalities: fresh.modalities, pace: fresh.pace } });
      },
      forgetTopics: () => set({ model: { ...get().model, topics: {}, concepts: {} } }),
      reset: (preferred) => set({ model: createLearnerModel(preferred) }),
    }),
    {
      name: KEY('learner'),
      storage,
      // "What SAJA remembers": only categories the person allows are written to the device.
      // Disabled categories still adapt within the session, then are forgotten.
      partialize: (s) => {
        const mem = useProfile.getState().memory;
        const fresh = createLearnerModel(s.model.preferred, s.model.difficulty);
        return {
          model: {
            ...s.model,
            modalities: mem.style ? s.model.modalities : fresh.modalities,
            pace: mem.style ? s.model.pace : fresh.pace,
            topics: mem.topics ? s.model.topics : {},
            concepts: mem.topics ? s.model.concepts : {},
          },
        } as unknown as LearnerState;
      },
    },
  ),
);
