/**
 * The content a mission mechanic plays with. Online it is the server's pinned
 * mission version; offline (or if the server has none) it is the bundled demo
 * table. Mechanics read through these hooks and never import content directly.
 */
import { createContext, useContext } from 'react';
import type { InteractionPayload } from '@/domain/missionDefinitions';
import { CHOICE_STORIES, CLUE_HUNTS, MATCH_SETS, REFLECTION_PROMPTS, SALAH_STEPS, WUDU_STEPS } from '@/content/missions';

const PayloadCtx = createContext<InteractionPayload | null>(null);
export const MissionPayloadProvider = PayloadCtx.Provider;

function usePayload<T extends InteractionPayload['type']>(type: T): Extract<InteractionPayload, { type: T }> | null {
  const p = useContext(PayloadCtx);
  return p && p.type === type ? (p as Extract<InteractionPayload, { type: T }>) : null;
}

export const useWuduSteps = () => usePayload('wudu-journey')?.steps ?? WUDU_STEPS;
export const useSalahSteps = () => usePayload('salah-path')?.steps ?? SALAH_STEPS;
export function useMatchSet(missionId: string) {
  const p = usePayload('lantern-match');
  return p ? { intro: p.intro, pairs: p.pairs } : MATCH_SETS[missionId];
}
export function useChoiceStory(missionId: string) {
  const p = usePayload('kindness-choice');
  return p ? { start: p.start, nodes: p.nodes } : CHOICE_STORIES[missionId];
}
export function useClueHunt(missionId: string) {
  return usePayload('clue-hunt')?.hunt ?? CLUE_HUNTS[missionId];
}
export function useReflectionPrompt(missionId: string) {
  const p = usePayload('reflection');
  return p ? { breaths: p.breaths, prompt: p.prompt, slots: p.slots } : REFLECTION_PROMPTS[missionId];
}
