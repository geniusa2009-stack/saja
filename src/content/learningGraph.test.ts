import { describe, expect, it } from 'vitest';
import { LEARNING_CONCEPTS, LEARNING_RESOURCES, learningLinks, topicForRegion } from './learningGraph';
import type { Profile, Purpose } from '@/domain/types';
import { MISSIONS } from './missions';

function profile(purpose: Purpose): Profile {
  return { name: 'Traveller', look: { skin: 0, hair: 'short', hairColor: 0, outfit: 'tunic', outfitColor: 0, accessory: 'none' },
    purpose, ageBand: 'adult', level: 'beginner', goals: [], interests: [], modality: 'hands-on', createdAt: 1 };
}

describe('curated learning graph', () => {
  it('every edge resolves to an actual resource or concept', () => {
    const resources = new Set(LEARNING_RESOURCES.map((r) => r.id));
    const concepts = new Set(LEARNING_CONCEPTS.map((c) => c.id));
    for (const c of LEARNING_CONCEPTS) {
      for (const r of c.resources) expect(resources.has(r)).toBe(true);
      for (const r of c.related) expect(concepts.has(r)).toBe(true);
    }
  });
  it('every mission resource links to an existing mission', () => {
    const missions = new Set(MISSIONS.map((m) => m.id));
    for (const r of LEARNING_RESOURCES.filter((r) => r.kind === 'mission')) expect(missions.has(r.missionId!)).toBe(true);
  });
  it('makes different recommendations by purpose', () => {
    const unlocked = new Set(['village', 'mosque'] as const);
    const explore = learningLinks(profile('exploring'), { unlocked });
    const newMuslim = learningLinks(profile('new-muslim'), { unlocked });
    expect(explore.map((r) => r.id)).not.toEqual(newMuslim.map((r) => r.id));
    expect(explore.every((r) => r.id !== 'wudu' && r.id !== 'prayer')).toBe(true);
  });
  it('does not recommend a completed or locked mission', () => {
    const links = learningLinks(profile('new-muslim'), { completed: ['m-water-path'], unlocked: new Set(['village', 'mosque']), limit: 15 });
    expect(links.every((r) => r.missionId !== 'm-water-path' && r.location !== 'library')).toBe(true);
  });
  it('reacts to page context and resolves story-region topics', () => {
    expect(topicForRegion('library')).toBe('quran');
    const links = learningLinks(profile('learn-more'), { focus: 'quran', excludeHref: '/mushaf/1' });
    expect(links.some((r) => r.topics.includes('quran'))).toBe(true);
    expect(links.every((r) => r.href !== '/mushaf/1')).toBe(true);
  });
});
