import { describe, expect, it } from 'vitest';
import { SIDE_STORIES, STORY_KEEPSAKES, STORY_REGIONS } from '@/content/sideStories';

describe('SAJA original fictional side-story expansion', () => {
  it('ships 108 individual scenarios, 12 in each existing region', () => {
    expect(SIDE_STORIES).toHaveLength(108);
    expect(STORY_REGIONS).toHaveLength(9);
    for (const region of STORY_REGIONS) {
      const stories = SIDE_STORIES.filter((story) => story.region === region.id);
      expect(stories).toHaveLength(12);
      expect(stories.map((story) => story.order)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    }
  });

  it('has unique IDs and full Arabic / English content for every choice and consequence', () => {
    expect(new Set(SIDE_STORIES.map((story) => story.id)).size).toBe(108);
    for (const story of SIDE_STORIES) {
      expect(story.reviewStatus).toBe('demo-unreviewed');
      expect(story.category).toBe('fictional-ethical-scenario');
      for (const field of [story.title, story.scene, story.objective, story.reflection]) {
        expect(field.ar.trim().length).toBeGreaterThan(6);
        expect(field.en.trim().length).toBeGreaterThan(6);
      }
      expect(story.choices.map((choice) => choice.id)).toEqual(['consider', 'explore', 'rush']);
      for (const choice of story.choices) {
        for (const field of [choice.text, choice.result]) {
          expect(field.ar.trim()).not.toBe('');
          expect(field.en.trim()).not.toBe('');
        }
      }
    }
  });

  it('unlocks 54 unique keepsakes only from linked stories', () => {
    expect(STORY_KEEPSAKES).toHaveLength(54);
    expect(new Set(STORY_KEEPSAKES.map((item) => item.id)).size).toBe(54);
    const storyById = new Map(SIDE_STORIES.map((story) => [story.id, story]));
    for (const item of STORY_KEEPSAKES) {
      expect(item.afterEpisodes).toHaveLength(2);
      for (const id of item.afterEpisodes) {
        expect(storyById.get(id)?.region).toBe(item.region);
        expect(storyById.get(id)?.keepsakeId).toBe(item.id);
      }
    }
  });
});
