/**
 * Completes an active quest when its mission is completed — wherever the mission was played
 * (normally the mission screen, not the world). Mission completion itself stays
 * server-authoritative (MissionRunner → progress store); this only follows it.
 * completeQuest() is idempotent, so a quest can never be rewarded twice.
 */
import { useEffect } from 'react';
import { useProgress } from '@/store/progress';
import { useQuests } from '@/store/quests';
import { toast } from '@/design-system';
import { useI18n } from '@/i18n';
import { QUESTS } from './definitions';

export function QuestSync() {
  const results = useProgress((s) => s.results);
  const quests = useQuests((s) => s.quests);
  const completeQuest = useQuests((s) => s.completeQuest);
  const { l } = useI18n();
  useEffect(() => {
    for (const quest of QUESTS) {
      if (quests[quest.id]?.status !== 'active' || !results[quest.missionId]) continue;
      completeQuest(quest.id);
      toast(l(quest.reward.fanfare));
    }
  }, [results, quests, completeQuest, l]);
  return null;
}
