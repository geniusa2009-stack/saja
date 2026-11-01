/**
 * Every mechanic (and the adaptive explainers) must render for every mission —
 * with the bundled offline content AND with a server-served mission payload.
 */
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType } from 'react';
import { MISSIONS, WUDU_STEPS, SALAH_STEPS, MATCH_SETS, CHOICE_STORIES, CLUE_HUNTS, REFLECTION_PROMPTS } from '@/content/missions';
import { buildMissionDefinition } from '@/domain/missionDefinitions';
import { useSettings } from '@/store/settings';
import { useProfile } from '@/store/profile';
import { DEFAULT_LOOK } from '@/features/character/palette';
import { MissionPayloadProvider } from './payload';
import type { MechanicProps } from './types';
import WuduJourney from './mechanics/WuduJourney';
import SalahPath from './mechanics/SalahPath';
import LanternMatch from './mechanics/LanternMatch';
import KindnessChoice from './mechanics/KindnessChoice';
import ClueHunt from './mechanics/ClueHunt';
import Reflection from './mechanics/Reflection';
import VisualExplainer from './mechanics/VisualExplainer';
import StoryMode from './mechanics/StoryMode';

const BY_MECHANIC: Record<string, ComponentType<MechanicProps>> = {
  'wudu-journey': WuduJourney,
  'salah-path': SalahPath,
  'lantern-match': LanternMatch,
  'kindness-choice': KindnessChoice,
  'clue-hunt': ClueHunt,
  reflection: Reflection,
};
const tables = { WUDU_STEPS, SALAH_STEPS, MATCH_SETS, CHOICE_STORIES, CLUE_HUNTS, REFLECTION_PROMPTS };
const noop = () => {};

beforeEach(() => {
  useSettings.setState({ locale: 'en' });
  useProfile.setState({ profile: { name: 'Sara', look: DEFAULT_LOOK, purpose: 'learn-more', ageBand: 'adult', level: 'beginner', goals: ['prayer'], interests: ['prayer'], modality: 'hands-on', createdAt: Date.now() } });
});
afterEach(cleanup);

const playable = MISSIONS.filter((m) => BY_MECHANIC[m.mechanic]);

describe.each([
  ['bundled (offline) content', false],
  ['server-served payload', true],
])('mission mechanics with %s', (_label, served) => {
  it.each(playable.map((m) => [m.id, m] as const))('%s renders its mechanic and both explainers', (_id, m) => {
    const props: MechanicProps = { mission: m, guided: false, onStep: noop, setHint: noop, setProgress: noop, onComplete: noop };
    const payload = served ? buildMissionDefinition(m, tables).payload : null;
    for (const C of [BY_MECHANIC[m.mechanic], VisualExplainer, StoryMode]) {
      const { unmount } = render(
        <MemoryRouter>
          <MissionPayloadProvider value={payload}>
            <C {...props} />
          </MissionPayloadProvider>
        </MemoryRouter>,
      );
      unmount();
    }
  });
});
