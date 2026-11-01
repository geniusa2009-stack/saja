import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seedAnswered, type ScholarQuestion } from '@/services/scholar';
import { KEY, storage } from './storage';

interface ScholarState {
  questions: ScholarQuestion[];
  draft: string;
  submit: (q: Omit<ScholarQuestion, 'id' | 'createdAt' | 'status'>) => ScholarQuestion;
  withdraw: (id: string) => void;
  setDraft: (d: string) => void;
}

export const useScholar = create<ScholarState>()(
  persist(
    (set, get) => ({
      questions: seedAnswered(),
      draft: '',
      submit: (q) => {
        const item: ScholarQuestion = { ...q, id: `q${Date.now()}`, createdAt: Date.now(), status: 'pending' };
        set({ questions: [item, ...get().questions], draft: '' });
        return item;
      },
      withdraw: (id) => set({ questions: get().questions.filter((q) => q.id !== id) }),
      setDraft: (draft) => set({ draft }),
    }),
    { name: KEY('scholar'), storage },
  ),
);
