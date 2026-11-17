import { describe, expect, it } from 'vitest';
import { KNOWLEDGE } from '@/content/knowledge';
import { MISSIONS } from '@/content/missions';
import { HADITHS } from '@/content/hadith';
import { HADITH_ACTIVITIES } from '@/content/hadithActivities';
import { SIDE_STORIES } from '@/content/sideStories';
import { CATALOG_COUNTS, EXPERIENCE_CATALOG } from './catalog';

describe('Unified content catalogue', () => {
  it('indexes every existing source without changing its content', () => {
    expect(CATALOG_COUNTS.missions).toBe(MISSIONS.filter((m) => !m.adaptive).length);
    expect(CATALOG_COUNTS.knowledge).toBe(KNOWLEDGE.length);
    expect(CATALOG_COUNTS.hadith).toBe(HADITHS.length);
    expect(CATALOG_COUNTS.activities).toBe(HADITH_ACTIVITIES.length);
    expect(CATALOG_COUNTS.stories).toBe(SIDE_STORIES.length);
    expect(new Set(EXPERIENCE_CATALOG.map((item) => item.id)).size).toBe(EXPERIENCE_CATALOG.length);
  });
  it('opens exact episodes and questions instead of dropping readers at a generic landing page', () => {
    for (const tale of SIDE_STORIES) {
      expect(EXPERIENCE_CATALOG.find((entry) => entry.id === `story:${tale.id}`)?.href).toBe(`/stories/${tale.region}?episode=${encodeURIComponent(tale.id)}`);
    }
    for (const item of KNOWLEDGE) {
      expect(EXPERIENCE_CATALOG.find((entry) => entry.id === `knowledge:${item.id}`)?.href).toContain('/learn?q=');
    }
  });
  it('never upgrades bundled demo religious content to scholar-reviewed status', () => {
    for (const entry of EXPERIENCE_CATALOG.filter((item) => item.id.startsWith('hadith:'))) expect(entry.status).toBe('demo');
    for (const entry of EXPERIENCE_CATALOG.filter((item) => item.id.startsWith('story:'))) expect(entry.status).toBe('fiction');
    for (const entry of EXPERIENCE_CATALOG) expect(entry.href.startsWith('/')).toBe(true);
  });
});
