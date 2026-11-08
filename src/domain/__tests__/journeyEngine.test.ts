import { describe, expect, it } from 'vitest';
import { createLearnerModel, recommend } from '../adaptive';
import { pathFor, PATHS, personalizeRecommendations, primaryTopics } from '../journeyEngine';
import { MISSIONS } from '@/content/missions';
import type { Profile, Purpose } from '../types';

function profile(purpose: Purpose, opts: Partial<Profile> = {}): Profile {
  return { name: 'Traveller', look: { skin: 0, hair: 'short', hairColor: 0, outfit: 'tunic', outfitColor: 0, accessory: 'none' },
    createdAt: 1, purpose, ageBand: 'adult', level: 'beginner', goals: [], interests: [], modality: 'hands-on', ...opts };
}
function recommendations(p: Profile) {
  const model = createLearnerModel(p.modality);
  const recs = recommend({ model, missions: MISSIONS, completed: [], unlocked: new Set(['village', 'mosque']), ageBand: p.ageBand, interests: p.interests });
  return personalizeRecommendations(p, model, recs);
}

describe('personal journey engine', () => {
  it('has three distinct curricula and preserves legacy child status', () => {
    expect(pathFor('child')).toBe('learn-more');
    expect(new Set(Object.values(PATHS).map((p) => p.title.ar)).size).toBe(3);
  });
  it('does not treat an explorer as someone learning religious practice', () => {
    expect(recommendations(profile('exploring'))[0].mission.id).toBe('m-words-of-peace');
  });
  it('starts the new Muslim with a practical, unlocked step', () => {
    expect(recommendations(profile('new-muslim'))[0].mission.id).toBe('m-water-path');
  });
  it('changes a Muslim learner journey when they choose prayer', () => {
    const p = profile('learn-more', { goals: ['prayer'], interests: ['prayer'], level: 'confident' });
    expect(recommendations(p)[0].mission.id).toBe('m-five-pauses');
  });
  it('never suggests a locked mission or ignores the existing completion filter', () => {
    const p = profile('new-muslim'); const model = createLearnerModel();
    const recs = recommend({ model, missions: MISSIONS, completed: ['m-water-path'], unlocked: new Set(['village', 'mosque']), ageBand: p.ageBand, interests: [] });
    const ranked = personalizeRecommendations(p, model, recs);
    expect(ranked.every((r) => ['village', 'mosque'].includes(r.mission.location) && r.mission.id !== 'm-water-path')).toBe(true);
    expect(ranked[0].mission.id).toBe('m-five-pauses');
  });
  it('honours the child safety filter already applied by the base recommender', () => {
    const p = profile('child', { ageBand: 'child' });
    expect(recommendations(p).every((r) => r.mission.kidSafe)).toBe(true);
  });
  it('expands declared goals into consistent topic signals', () => {
    expect(primaryTopics(profile('learn-more', { goals: ['prayer'] }))).toEqual(['prayer', 'purification']);
  });
});
