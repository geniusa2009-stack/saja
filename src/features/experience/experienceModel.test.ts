import { describe, expect, it } from 'vitest';
import type { Profile } from '@/domain/types';
import { allowedForAge, catalogSearch, effectivePurpose, recommendations, type ContentItem } from './experienceModel';
import { defaultDisplay, displayFor } from './experienceStore';

const profile: Profile = {
  name: 'Test Traveller', createdAt: 17, ageBand: 'adult', purpose: 'learn-more', level: 'confident',
  interests: ['quran'], goals: [], modality: 'guided',
  look: { skin: 0, hair: 'short', hairColor: 0, outfit: 'tunic', outfitColor: 0, accessory: 'none' },
};
const item = (id: string, changes: Partial<ContentItem> = {}): ContentItem => ({
  id, category: 'quran', format: 'study', title: { en: id, ar: id }, summary: { en: '', ar: '' },
  href: `/${id}`, topics: ['quran'], ageBands: ['child', 'teen', 'adult'], difficulty: 3, status: 'navigation',
  ...changes,
});

describe('SAJA experience safety and discovery rules', () => {
  it('keeps age-gating separate from identity and self-selected paths', () => {
    const children = { ...profile, ageBand: 'child' as const, purpose: 'learn-more' as const };
    expect(effectivePurpose(children)).toBe('child');
    expect(allowedForAge(item('adult', { ageBands: ['adult'] }), children.ageBand)).toBe(false);
    expect(catalogSearch([item('adult', { ageBands: ['adult'] })], children, '', 'all', 'all')).toEqual([]);
  });
  it('does not push beginner story activities as the experienced adult default', () => {
    const all = [item('beginners', { category: 'world', format: 'story', difficulty: 1, topics: [] }), item('advanced'), item('foundations', { difficulty: 1 })];
    const ranked = recommendations(all, profile, defaultDisplay(profile));
    expect(ranked[0].id).toBe('advanced');
    expect(ranked.some((r) => r.id === 'beginners')).toBe(false);
  });
  it('allows stories and world exploration only when requested on the home surface', () => {
    const story = item('story', { category: 'world', format: 'story' });
    expect(recommendations([story], profile, defaultDisplay(profile))).toHaveLength(0);
    expect(recommendations([story], profile, { ...defaultDisplay(profile), showStories: true })).toHaveLength(1);
    expect(catalogSearch([story], profile, '', 'all', 'all')).toHaveLength(1);
  });
  it('does not confuse stored display choices across traveller IDs', () => {
    const saved = { '17': { showStories: true, showWorld: false, showAdvanced: true } };
    expect(displayFor(profile, saved).showStories).toBe(true);
    expect(displayFor({ ...profile, createdAt: 18 }, saved).showStories).toBe(false);
  });
  it('supports bilingual search and topic filtering', () => {
    const source = [item('entry', { title: { ar: 'القرآن', en: 'Quran' } }), item('different', { category: 'worship' })];
    expect(catalogSearch(source, profile, 'القرآن', 'quran', 'study').map((r) => r.id)).toEqual(['entry']);
    expect(catalogSearch(source, profile, 'nonexistent', 'all', 'all')).toHaveLength(0);
  });
});
