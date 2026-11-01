/**
 * The mechanic for each interaction type. Used by the mission runner and by the
 * staff console's preview, so a draft is previewed with the real interaction.
 */
import { lazy, type ComponentType } from 'react';
import type { InteractionType } from '@/domain/missionDefinitions';
import type { MechanicProps } from './types';

export const MECHANICS: Record<InteractionType, ComponentType<MechanicProps>> = {
  'wudu-journey': lazy(() => import('./mechanics/WuduJourney')),
  'salah-path': lazy(() => import('./mechanics/SalahPath')),
  'lantern-match': lazy(() => import('./mechanics/LanternMatch')),
  'kindness-choice': lazy(() => import('./mechanics/KindnessChoice')),
  'clue-hunt': lazy(() => import('./mechanics/ClueHunt')),
  reflection: lazy(() => import('./mechanics/Reflection')),
};
