import { HADITHS, HADITH_BY_ID } from '@/content/hadith';
import { HADITH_ACTIVITIES } from '@/content/hadithActivities';
import { filterHadith, hadithFromSnapshot, hadithIntegrityIssues, hadithSearchText, hadithSnapshot, normalizeHadithText } from '../hadith';
import { HADITH_WORLD_STATIONS, hadithStationFor, hadithStationsForLocation, resolveHadithStation } from '@/features/hadith/integration';

describe('hadith library integrity', () => {
  it('has no editorial or source integrity issues', () => {
    expect(hadithIntegrityIssues(HADITHS)).toEqual([]);
  });

  it('keeps ids stable and reachable from related hadith', () => {
    expect(new Set(HADITHS.map((h) => h.id)).size).toBe(HADITHS.length);
    for (const h of HADITHS) {
      for (const id of h.relatedHadith) expect(HADITH_BY_ID[id]).toBeDefined();
      for (const id of h.relatedKnowledge) expect(id).toMatch(/^k-/);
    }
  });

  it('never embeds a review claim in the reviewed snapshot', () => {
    for (const h of HADITHS) {
      expect(h.reviewStatus).toBe('demo-unreviewed');
      expect(hadithSnapshot(h)).not.toHaveProperty('reviewStatus');
    }
  });
});

describe('hadith search and filters', () => {
  it('folds Arabic diacritics and letter variants', () => {
    expect(normalizeHadithText('الأَعْمَالُ')).toBe('الاعمال');
    expect(normalizeHadithText('النِّيَّة')).toBe('النيه');
    expect(normalizeHadithText('  A   B  ')).toBe('a b');
  });

  it('finds records by English meaning, Arabic matn and reference', () => {
    expect(filterHadith(HADITHS, { query: 'intention' }).map((h) => h.id)).toContain('h-bukhari-1');
    expect(filterHadith(HADITHS, { query: 'الاعمال' }).map((h) => h.id)).toContain('h-bukhari-1');
    expect(filterHadith(HADITHS, { query: 'bukhari 6018' }).map((h) => h.id)).toEqual(['h-bukhari-6018']);
    expect(hadithSearchText(HADITHS[0])).toContain('intention');
  });

  it('combines topic, collection, age and saved filters', () => {
    expect(filterHadith(HADITHS, { collection: 'muslim' }).map((h) => h.id)).toEqual(['h-muslim-2699a']);
    expect(filterHadith(HADITHS, { collection: 'tirmidhi' }).map((h) => h.id)).toEqual(['h-tirmidhi-1956']);
    expect(filterHadith(HADITHS, { topic: 'character' }).every((h) => h.topics.includes('character'))).toBe(true);
    expect(filterHadith(HADITHS, { ageBand: 'child' }).every((h) => h.ageBands.includes('child'))).toBe(true);
    expect(filterHadith(HADITHS, { savedOnly: true, saved: ['h-bukhari-13'] }).map((h) => h.id)).toEqual(['h-bukhari-13']);
    expect(filterHadith(HADITHS, { savedOnly: true, saved: [] })).toEqual([]);
  });

  it('returns nothing for an impossible query rather than everything', () => {
    expect(filterHadith(HADITHS, { query: 'zzz-no-such-hadith' })).toEqual([]);
  });
});

describe('published snapshot validation', () => {
  const snapshot = hadithSnapshot(HADITHS[0]);

  it('accepts an exact, complete snapshot and re-labels it demo for local rendering', () => {
    const parsed = hadithFromSnapshot(snapshot.id, snapshot);
    expect(parsed).toMatchObject({ id: snapshot.id, arabic: snapshot.arabic, reviewStatus: 'demo-unreviewed' });
  });

  it('rejects a malformed or partial overlay instead of trusting its badge', () => {
    expect(hadithFromSnapshot(snapshot.id, { ...snapshot, arabic: '' })).toBeNull();
    expect(hadithFromSnapshot(snapshot.id, { ...snapshot, source: { ...snapshot.source, url: 'https://example.com' } })).toBeNull();
    expect(hadithFromSnapshot(snapshot.id, { ...snapshot, englishMeaning: { kind: 'translation' } })).toBeNull();
    expect(hadithFromSnapshot('not-a-hadith-id', snapshot)).toBeNull();
    expect(hadithFromSnapshot(snapshot.id, { ...snapshot, id: 'h-bukhari-13' })).toBeNull();
  });
});

describe('discovery activities', () => {
  it('links only to real hadith and covers every interaction kind', () => {
    const kinds = new Set(HADITH_ACTIVITIES.map((a) => a.kind));
    expect(kinds).toEqual(new Set(['scenario', 'match', 'story', 'sort', 'reflection', 'review']));
    for (const activity of HADITH_ACTIVITIES) {
      expect(activity.hadithIds.length).toBeGreaterThan(0);
      for (const id of activity.hadithIds) expect(HADITH_BY_ID[id]).toBeDefined();
    }
    expect(new Set(HADITH_ACTIVITIES.map((a) => a.id)).size).toBe(HADITH_ACTIVITIES.length);
  });

  it('labels story and scenario activities as SAJA material, not hadith', () => {
    for (const activity of HADITH_ACTIVITIES) {
      if (activity.kind === 'story') expect(activity.disclosure.en).toMatch(/not a hadith/i);
      if (activity.kind === 'scenario') expect(activity.label.en).toMatch(/not a hadith/i);
    }
  });
});

describe('future world integration', () => {
  it('registers stations in existing locations and resolves only from the supplied library', () => {
    expect(HADITH_WORLD_STATIONS.length).toBeGreaterThan(0);
    for (const station of HADITH_WORLD_STATIONS) {
      const resolved = resolveHadithStation(station, HADITHS);
      expect(resolved?.record.id).toBe(station.hadithId);
      expect(resolved?.path).toBe(`/hadith/${station.hadithId}`);
      expect(hadithStationsForLocation(station.locationId)).toContain(station);
      expect(hadithStationFor(station.hadithId)).toBe(station);
    }
    const orphan = { ...HADITH_WORLD_STATIONS[0], hadithId: 'h-missing' };
    expect(resolveHadithStation(orphan, HADITHS)).toBeNull();
  });
});
