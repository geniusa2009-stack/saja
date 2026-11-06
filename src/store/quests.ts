/**
 * Quest progress store — persists locally (same pattern as useProgress).
 *
 * What this stores:
 *   - Which quests have been accepted / completed
 *   - Which clues the player has found per quest
 *   - Which objectives are done
 *   - Hint usage count
 *
 * What this does NOT store:
 *   - Quest definitions (those are in src/features/quests/definitions)
 *   - Server-side completion — that still goes through the existing
 *     mission attempt + MissionSync pipeline.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QuestState, QuestStatus } from '@/features/quests/types';
import { KEY, storage } from './storage';
import { QUEST_BY_ID } from '@/features/quests/definitions';

/** Emitted when a quest changes state — consumed by the 3D world layer. */
const QUEST_EVENTS = new EventTarget();
export function onQuestEvent(cb: (e: CustomEvent) => void): () => void {
  const handler = (e: Event) => cb(e as CustomEvent);
  QUEST_EVENTS.addEventListener('quest', handler);
  return () => QUEST_EVENTS.removeEventListener('quest', handler);
}
function emitQuestEvent(type: string, detail: unknown) {
  QUEST_EVENTS.dispatchEvent(new CustomEvent('quest', { detail: { type, ...((detail as object) ?? {}) } }));
}

interface QuestsState {
  quests: Record<string, QuestState>;

  /** Accept a quest — switches it from 'available' to 'active'. */
  acceptQuest: (questId: string) => void;

  /** Mark a clue as found. Auto-completes the corresponding objective. */
  discoverClue: (questId: string, clueId: string) => void;

  /** Mark a specific objective as completed. */
  completeObjective: (questId: string, objectiveId: string) => void;

  /** Mark the whole quest as completed and emit the world event. */
  completeQuest: (questId: string) => void;

  /** Increment hint counter for a quest. */
  takeHint: (questId: string) => void;

  /** Read a single quest's state (returns a sensible default if unknown). */
  getQuest: (questId: string) => QuestState;

  /** All active quests. */
  activeQuests: () => QuestState[];

  /** All completed quests. */
  completedQuests: () => QuestState[];

  reset: () => void;
}

const initialState: { quests: Record<string, QuestState> } = { quests: {} };

function defaultState(questId: string): QuestState {
  return {
    questId,
    status: 'available',
    foundClues: [],
    completedObjectives: [],
    hintsUsed: 0,
  };
}

export const useQuests = create<QuestsState>()(
  persist(
    (set, get) => ({
      ...initialState,

      acceptQuest: (questId) => {
        // Accepting again (or after completion) changes nothing and emits nothing.
        if (get().quests[questId]?.status === 'active' || get().quests[questId]?.status === 'completed') return;
        set((s) => ({
          quests: {
            ...s.quests,
            [questId]: {
              ...(s.quests[questId] ?? defaultState(questId)),
              status: 'active' as QuestStatus,
              startedAt: Date.now(),
            },
          },
        }));
        emitQuestEvent('quest:accepted', { questId });
      },

      discoverClue: (questId, clueId) => {
        const def = QUEST_BY_ID[questId];
        if (!def) return;
        set((s) => {
          const cur = s.quests[questId] ?? defaultState(questId);
          if (cur.foundClues.includes(clueId)) return s; // idempotent
          const foundClues = [...cur.foundClues, clueId];

          // Auto-complete any objective that depends on this clue.
          const justDone = def.objectives
            .filter((o) => {
              if (cur.completedObjectives.includes(o.id)) return false;
              if (o.kind.type === 'discover-clue' && o.kind.clueId === clueId) return true;
              if (o.kind.type === 'all-clues-found' && foundClues.length === def.clues.length) return true;
              return false;
            })
            .map((o) => o.id);

          const completedObjectives = [...cur.completedObjectives, ...justDone];
          return {
            quests: {
              ...s.quests,
              [questId]: { ...cur, foundClues, completedObjectives },
            },
          };
        });
        emitQuestEvent('quest:clue-found', { questId, clueId });
      },

      completeObjective: (questId, objectiveId) => {
        set((s) => {
          const cur = s.quests[questId] ?? defaultState(questId);
          if (cur.completedObjectives.includes(objectiveId)) return s;
          return {
            quests: {
              ...s.quests,
              [questId]: { ...cur, completedObjectives: [...cur.completedObjectives, objectiveId] },
            },
          };
        });
        emitQuestEvent('quest:objective-done', { questId, objectiveId });
      },

      completeQuest: (questId) => {
        const def = QUEST_BY_ID[questId];
        if (!def) return;
        // A quest completes once: no second completion event, fanfare or timestamp.
        if (get().quests[questId]?.status === 'completed') return;
        set((s) => {
          const cur = s.quests[questId] ?? defaultState(questId);
          // Satisfy all remaining objectives.
          const completedObjectives = def.objectives.map((o) => o.id);
          return {
            quests: {
              ...s.quests,
              [questId]: {
                ...cur,
                status: 'completed' as QuestStatus,
                completedObjectives,
                completedAt: Date.now(),
              },
            },
          };
        });
        // Emit the quest-specific completion event (used by the 3D world layer).
        emitQuestEvent(def.completionEvent, { questId });
        emitQuestEvent('quest:completed', { questId });
      },

      takeHint: (questId) => {
        set((s) => ({
          quests: {
            ...s.quests,
            [questId]: {
              ...(s.quests[questId] ?? defaultState(questId)),
              hintsUsed: (s.quests[questId]?.hintsUsed ?? 0) + 1,
            },
          },
        }));
      },

      getQuest: (questId) => get().quests[questId] ?? defaultState(questId),

      activeQuests: () =>
        Object.values(get().quests).filter((q) => q.status === 'active'),

      completedQuests: () =>
        Object.values(get().quests).filter((q) => q.status === 'completed'),

      reset: () => set(initialState),
    }),
    {
      name: KEY('quests'),
      storage,
    },
  ),
);
