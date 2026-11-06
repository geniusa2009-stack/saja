import type { QuestDef } from '../types';
import { WORDS_OF_PEACE_QUEST } from './wordsOfPeace';

export const QUESTS: QuestDef[] = [WORDS_OF_PEACE_QUEST];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

/** Look up the quest that wraps a given mission. */
export const QUEST_BY_MISSION_ID: Record<string, QuestDef> = Object.fromEntries(
  QUESTS.filter((q) => q.missionId).map((q) => [q.missionId, q]),
);

/** Look up the quest(s) given by a specific NPC. */
export function questsForNpc(npcId: string): QuestDef[] {
  return QUESTS.filter((q) => q.npcId === npcId);
}
