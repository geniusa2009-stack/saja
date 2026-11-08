import { useMemo } from 'react';
import { MISSION_BY_ID } from '@/content/missions';
import { useProfile } from '@/store/profile';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { useJourney, usePrayerInfo, PRAYER_NAMES } from '@/app/hooks';
import type { JourneyContext } from '@/services/tutor';

/** What Siraj knows about the journey right now — only what's useful, nothing personal beyond it. */
export function useJourneyContext(focusKnowledgeId?: string): JourneyContext | null {
  const profile = useProfile((s) => s.profile);
  const locale = useSettings((s) => s.locale);
  const lastId = useProgress((s) => s.lastMissionId);
  const struggled = useProgress((s) => s.lastStruggled);
  const journey = useJourney();
  const prayer = usePrayerInfo();
  return useMemo(() => {
    if (!profile) return null;
    const last = lastId ? MISSION_BY_ID[lastId] : undefined;
    return {
      name: profile.name,
      purpose: profile.purpose,
      level: profile.level,
      ageBand: profile.ageBand,
      locale,
      lastMission: last ? { id: last.id, title: last.title, knowledge: last.knowledge, struggled } : undefined,
      nextMission: journey.next ? { id: journey.next.mission.id, title: journey.next.mission.title, minutes: journey.next.mission.minutes } : undefined,
      weakTopics: journey.weak,
      nextPrayer: { name: PRAYER_NAMES[prayer.next.name], inMinutes: prayer.next.inMinutes },
      focusKnowledgeId,
      completedCount: journey.completed.length,
    };
  }, [profile, locale, lastId, struggled, journey, prayer.next, focusKnowledgeId]);
}
