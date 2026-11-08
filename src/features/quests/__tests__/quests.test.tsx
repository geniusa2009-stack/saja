/**
 * Quest system: one reward per quest, completion follows the (server-recorded) mission,
 * and every clue's teaching card can be read — including the last one.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { onQuestEvent, useQuests } from '@/store/quests';
import { useProgress } from '@/store/progress';
import type { MissionResult } from '@/domain/types';
import { WORDS_OF_PEACE_QUEST as QUEST } from '../definitions/wordsOfPeace';
import { QuestRunner } from '../QuestRunner';
import { QuestSync } from '../QuestSync';

const result = (missionId: string): MissionResult => ({ missionId, completedAt: Date.now(), mistakes: 0, hintsUsed: 0, durationMs: 60_000, mechanic: 'lantern-match' as MissionResult['mechanic'], modality: 'hands-on' });

beforeEach(() => {
  useQuests.getState().reset();
  useProgress.setState({ results: {} });
});

describe('quest store', () => {
  it('accepting twice or after completion changes nothing; completion is rewarded once', () => {
    const events: string[] = [];
    const off = onQuestEvent((e) => events.push(e.detail.type));
    const q = useQuests.getState();
    q.acceptQuest(QUEST.id);
    const startedAt = useQuests.getState().quests[QUEST.id].startedAt;
    q.acceptQuest(QUEST.id);
    expect(useQuests.getState().quests[QUEST.id].startedAt).toBe(startedAt);
    q.completeQuest(QUEST.id);
    const completedAt = useQuests.getState().quests[QUEST.id].completedAt;
    q.completeQuest(QUEST.id);
    q.acceptQuest(QUEST.id);
    off();
    expect(useQuests.getState().quests[QUEST.id]).toMatchObject({ status: 'completed', completedAt });
    expect(events.filter((e) => e === 'quest:completed')).toHaveLength(1);
    expect(events.filter((e) => e === 'quest:accepted')).toHaveLength(1);
  });

  it('clues are counted once each and complete their objectives', () => {
    const q = useQuests.getState();
    q.acceptQuest(QUEST.id);
    for (const clue of QUEST.clues) {
      q.discoverClue(QUEST.id, clue.id);
      q.discoverClue(QUEST.id, clue.id);
    }
    const state = useQuests.getState().quests[QUEST.id];
    expect(state.foundClues).toHaveLength(QUEST.clues.length);
    const clueObjectives = QUEST.objectives.filter((o) => o.kind.type !== 'complete-mission').map((o) => o.id);
    expect(clueObjectives.every((id) => state.completedObjectives.includes(id))).toBe(true);
  });
});

describe('QuestSync', () => {
  it('completes an active quest when its mission is completed — and only then', () => {
    render(<QuestSync />);
    act(() => useProgress.setState({ results: { [QUEST.missionId]: result(QUEST.missionId) } }));
    expect(useQuests.getState().quests[QUEST.id]).toBeUndefined(); // never accepted: nothing to complete
    act(() => useQuests.getState().acceptQuest(QUEST.id));
    expect(useQuests.getState().quests[QUEST.id].status).toBe('completed');
  });
});

describe('QuestRunner clue hunt', () => {
  it('the last clue’s card stays readable; the way into the mission appears once it is closed', () => {
    useQuests.getState().acceptQuest(QUEST.id);
    render(
      <MemoryRouter>
        <QuestRunner quest={QUEST} />
      </MemoryRouter>,
    );
    for (let i = 0; i < QUEST.clues.length; i++) {
      fireEvent.click(screen.getAllByRole('button', { name: /look here for a clue/i })[0]);
      expect(screen.getByRole('dialog', { name: /./ })).toBeInTheDocument();
      if (i === QUEST.clues.length - 1) {
        // The final fragment is on screen, and the mission prompt waits until it has been read.
        expect(screen.getByText(QUEST.clues[i].fragment.en)).toBeInTheDocument();
        expect(screen.queryByText(/Begin: Words of Peace/)).toBeNull();
      }
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    }
    expect(screen.getByRole('button', { name: /Begin: Words of Peace/ })).toBeInTheDocument();
  });
});
