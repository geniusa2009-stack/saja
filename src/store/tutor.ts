import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TutorReply } from '@/services/tutor';
import { KEY, storage } from './storage';
import { useProfile } from './profile';

export interface TutorTurn {
  id: string;
  from: 'you' | 'siraj';
  text?: string;
  reply?: TutorReply;
  at: number;
}

interface TutorState {
  open: boolean;
  focusKnowledgeId?: string;
  turns: TutorTurn[];
  evidenceFor: string | null;
  openTutor: (focusKnowledgeId?: string) => void;
  close: () => void;
  push: (t: TutorTurn) => void;
  clear: () => void;
  showEvidence: (knowledgeId: string | null) => void;
}

export const useTutor = create<TutorState>()(
  persist(
    (set, get) => ({
      open: false,
      turns: [],
      evidenceFor: null,
      openTutor: (focusKnowledgeId) => set({ open: true, focusKnowledgeId }),
      close: () => set({ open: false }),
      push: (t) => set({ turns: [...get().turns.slice(-60), t] }),
      clear: () => set({ turns: [] }),
      showEvidence: (evidenceFor) => set({ evidenceFor }),
    }),
    {
      name: KEY('tutor'),
      storage,
      // Conversation history is only remembered when the person opts in.
      partialize: (s) => (useProfile.getState().memory.conversations ? { turns: s.turns } : { turns: [] }) as unknown as TutorState,
    },
  ),
);
