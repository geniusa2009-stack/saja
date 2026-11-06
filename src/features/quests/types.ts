/**
 * Quest system types.
 *
 * A Quest wraps a Mission with richer structure:
 *   - NPC dialogue tree that starts the quest
 *   - Discoverable clues that count as learning objectives
 *   - Objective tracking (before AND after the mission mechanic)
 *   - Completion events that the 3D world layer can consume
 *
 * Quests are modular: each quest file exports a QuestDef.
 * The engine (QuestRunner) renders them; the quest store persists them.
 */
import type { L10n } from '@/domain/types';

/* ── Dialogue ───────────────────────────────────────────── */

export interface DialogueLine {
  id: string;
  /** Who speaks. 'npc' = the NPC, 'player' = the learner. */
  speaker: 'npc' | 'player';
  text: L10n;
  /** Choices the player can make after this line (only for npc lines). */
  choices?: DialogueChoice[];
  /** After this line the dialogue ends and the quest is offered. */
  questOffer?: boolean;
  /** Jump to this line id next (for linear sequences). Omit if using choices. */
  next?: string;
}

export interface DialogueChoice {
  label: L10n;
  /** id of the next DialogueLine. */
  next: string;
  /** Optional reaction: 'warm' colors the choice button positively. */
  tone?: 'warm' | 'neutral' | 'curious';
}

/* ── Clues ──────────────────────────────────────────────── */

export type ClueScene = 'village' | 'library' | 'desert' | 'mountain';

export interface QuestClue {
  id: string;
  /** Scene the clue appears in (for future 3D placement). */
  scene: ClueScene;
  /** Visual object label shown when the learner spots it. */
  object: L10n;
  /** The knowledge fragment this clue carries. */
  fragment: L10n;
  /** Approximate position hint (0–100) for a 2D overlay or 3D world. */
  position: { x: number; y: number };
}

/* ── Objectives ─────────────────────────────────────────── */

export interface QuestObjective {
  id: string;
  label: L10n;
  /** How this objective is satisfied. */
  kind:
    | { type: 'discover-clue'; clueId: string }
    | { type: 'complete-mission'; missionId: string }
    | { type: 'all-clues-found' };
}

/* ── Quest definition ───────────────────────────────────── */

export interface QuestDef {
  id: string;
  /** The mission this quest wraps. */
  missionId: string;
  /** NPC that gives the quest. */
  npcId: string;
  title: L10n;
  description: L10n;
  /** Opening line the NPC speaks (ambient, shown in world). */
  hook: L10n;
  dialogue: Record<string, DialogueLine>;
  /** Id of the first dialogue line. */
  dialogueStart: string;
  clues: QuestClue[];
  objectives: QuestObjective[];
  /** Displayed when the player hasn't accepted the quest yet. */
  offerText: L10n;
  /** Displayed in the journal intro. */
  journalEntry: L10n;
  /** Contextual hints — shown one at a time when the player asks. */
  hints: L10n[];
  /** The event name broadcast on completion (for the 3D world). */
  completionEvent: string;
  reward: {
    /** ids of knowledge entries unlocked. */
    knowledgeIds: string[];
    /** Short celebratory text. */
    fanfare: L10n;
  };
}

/* ── Quest state (persisted) ──────────────────────────────── */

export type QuestStatus = 'available' | 'active' | 'completed';

export interface QuestState {
  questId: string;
  status: QuestStatus;
  /** Which clue ids the player has already found. */
  foundClues: string[];
  /** Which objective ids are satisfied. */
  completedObjectives: string[];
  /** How many hints have been shown. */
  hintsUsed: number;
  startedAt?: number;
  completedAt?: number;
}
