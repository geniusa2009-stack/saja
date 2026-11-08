/** A small, session-only signal that connects places the traveller just visited.
 * No reading history, faith identity, raw text or conversations are persisted. */
import { create } from 'zustand';
import type { TopicId } from '@/domain/types';

export type TrailKind = 'story' | 'quran';
interface TrailState {
  lastTopic: TopicId | null;
  lastKind: TrailKind | null;
  record: (topic: TopicId, kind: TrailKind) => void;
  clear: () => void;
}

export const useLearningTrail = create<TrailState>((set) => ({
  lastTopic: null,
  lastKind: null,
  record: (lastTopic, lastKind) => set({ lastTopic, lastKind }),
  clear: () => set({ lastTopic: null, lastKind: null }),
}));
