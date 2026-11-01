import { isUnlocked, newlyUnlocked, locationState } from '../world';
import { LOCATIONS, LOCATION_BY_ID } from '@/content/world';
import { MISSIONS } from '@/content/missions';

describe('knowledge unlocks the world', () => {
  it('starts with the village and the masjid open', () => {
    const open = LOCATIONS.filter((l) => isUnlocked(l, { completed: [] }, MISSIONS)).map((l) => l.id);
    expect(open).toEqual(['village', 'mosque']);
  });

  it('wakes the garden after the first mission', () => {
    const woke = newlyUnlocked(LOCATIONS, { completed: [] }, { completed: ['m-water-path'] }, MISSIONS);
    expect(woke.map((l) => l.id)).toEqual(['garden']);
  });

  it('reports marker states from the brand system', () => {
    expect(locationState(LOCATION_BY_ID.mountain, { completed: [] }, MISSIONS, null)).toBe('asleep');
    expect(locationState(LOCATION_BY_ID.mosque, { completed: [] }, MISSIONS, 'mosque')).toBe('current');
    expect(locationState(LOCATION_BY_ID.village, { completed: ['m-words-of-peace'] }, MISSIONS, null)).toBe('done');
  });

  it('every mission points at real knowledge and a real location', async () => {
    const { KNOWLEDGE_BY_ID } = await import('@/content/knowledge');
    for (const m of MISSIONS) {
      expect(LOCATION_BY_ID[m.location]).toBeDefined();
      for (const k of m.knowledge) expect(KNOWLEDGE_BY_ID[k], `${m.id} → ${k}`).toBeDefined();
    }
  });
});
