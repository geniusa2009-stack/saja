import { applySignal, chooseAdaptation, createLearnerModel, isHesitating, isStruggling, recommend, strengths, topicsToRevisit } from '../adaptive';
import { MISSIONS } from '@/content/missions';
import type { MissionResult } from '../types';

const result = (over: Partial<MissionResult> = {}): MissionResult => ({
  missionId: 'm-water-path',
  completedAt: 1,
  mistakes: 0,
  hintsUsed: 0,
  durationMs: 60000,
  mechanic: 'wudu-journey',
  modality: 'hands-on',
  ...over,
});

describe('adaptive engine', () => {
  it('raises mastery on correct steps and lowers it on mistakes', () => {
    let m = createLearnerModel();
    m = applySignal(m, { type: 'step', topic: 'prayer', concept: 'salah-order', correct: true, ms: 4000 });
    const up = m.topics.prayer!.mastery;
    m = applySignal(m, { type: 'step', topic: 'prayer', concept: 'salah-order', correct: false, ms: 4000 });
    expect(m.topics.prayer!.mastery).toBeLessThan(up);
    expect(m.topics.prayer!.mistakes).toBe(1);
  });

  it('detects struggle from repeated mistakes', () => {
    expect(isStruggling({ mistakes: 1, consecutiveMistakes: 1, hints: 0 })).toBe(false);
    expect(isStruggling({ mistakes: 2, consecutiveMistakes: 2, hints: 0 })).toBe(true);
    expect(isStruggling({ mistakes: 3, consecutiveMistakes: 0, hints: 0 })).toBe(true);
  });

  it('detects hesitation relative to the learner’s own pace', () => {
    const m = createLearnerModel();
    expect(isHesitating(m, 5000)).toBe(false);
    expect(isHesitating(m, 20000)).toBe(true);
  });

  it('switches the teaching mechanism instead of repeating the failing one', () => {
    const m = createLearnerModel('hands-on');
    const a = chooseAdaptation(m, 'wudu-order', 'hands-on');
    expect(a.modality).not.toBe('hands-on');
    expect(a.modality).toBe('visual');
  });

  it('prefers a style that has worked for this learner before', () => {
    let m = createLearnerModel('hands-on');
    for (let i = 0; i < 3; i++) {
      m = applySignal(m, { type: 'complete', topic: 'character', concept: 'kindness', result: result({ modality: 'story', mechanic: 'story' }) });
    }
    m = applySignal(m, { type: 'complete', topic: 'prayer', concept: 'x', result: result({ modality: 'visual', mistakes: 4 }) });
    const a = chooseAdaptation(m, 'salah-order', 'hands-on');
    expect(a.modality).toBe('story');
    expect(a.reason).toBe('worked-before');
  });

  it('never re-picks a modality already tried for the concept', () => {
    let m = createLearnerModel();
    m = applySignal(m, { type: 'complete', topic: 'purification', concept: 'wudu-order', result: result({ modality: 'visual', mistakes: 3 }) });
    const a = chooseAdaptation(m, 'wudu-order', 'hands-on');
    expect(['story', 'guided']).toContain(a.modality);
  });

  it('recommends unlocked, uncompleted missions and respects time available', () => {
    const m = createLearnerModel();
    const recs = recommend({ model: m, missions: MISSIONS, completed: ['m-water-path'], unlocked: new Set(['village', 'mosque', 'garden']), ageBand: 'child', interests: [], minutesAvailable: 3 });
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(r.mission.id).not.toBe('m-water-path');
      expect(['village', 'mosque', 'garden']).toContain(r.mission.location);
      expect(r.mission.minutes).toBeLessThanOrEqual(3);
    }
  });

  it('surfaces topics to revisit and strengths', () => {
    let m = createLearnerModel();
    for (let i = 0; i < 4; i++) m = applySignal(m, { type: 'step', topic: 'prayer', concept: 'salah-order', correct: false, ms: 3000 });
    m = applySignal(m, { type: 'complete', topic: 'prayer', concept: 'salah-order', result: result({ mistakes: 4 }) });
    for (let i = 0; i < 3; i++) m = applySignal(m, { type: 'complete', topic: 'terminology', concept: 'everyday-phrases', result: result() });
    expect(topicsToRevisit(m)).toContain('prayer');
    expect(strengths(m)).toContain('terminology');
  });
});
