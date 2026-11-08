import { describe, expect, it } from 'vitest';
import { QURAN_VERSE_COUNTS, QURAN_SUPPLICATION_REFS, validChapter } from './catalogue';

describe('SAJA authoritative Quran catalogue constraints', () => {
  it('has 114 surahs and 6,236 Hafs-numbered verses', () => {
    expect(QURAN_VERSE_COUNTS).toHaveLength(114);
    expect(QURAN_VERSE_COUNTS.reduce((a, b) => a + b, 0)).toBe(6236);
    expect(QURAN_VERSE_COUNTS[0]).toBe(7);
    expect(QURAN_VERSE_COUNTS[1]).toBe(286);
    expect(QURAN_VERSE_COUNTS[113]).toBe(6);
  });
  it('only links deduplicated Quranic supplication references to real verse numbers', () => {
    const keys = QURAN_SUPPLICATION_REFS.map(([s, a]) => {
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(114);
      expect(a).toBeGreaterThanOrEqual(1);
      expect(a).toBeLessThanOrEqual(QURAN_VERSE_COUNTS[s - 1]);
      return `${s}:${a}`;
    });
    expect(keys.length).toBeGreaterThan(40);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('rejects incomplete or reordered verse data instead of rendering it as verified Quran', () => {
    expect(validChapter({ id: 1, verses: Array.from({ length: 7 }, (_, i) => ({ id: i + 1, text: 'بِسْمِ' })) }, 1)).toBe(true);
    expect(validChapter({ id: 1, verses: Array.from({ length: 6 }, (_, i) => ({ id: i + 1, text: 'بِسْمِ' })) }, 1)).toBe(false);
    expect(validChapter({ id: 1, verses: Array.from({ length: 7 }, (_, i) => ({ id: i + 2, text: 'بِسْمِ' })) }, 1)).toBe(false);
    expect(validChapter({ id: 1, verses: Array.from({ length: 7 }, (_, i) => ({ id: i + 1, text: 'placeholder' })) }, 1)).toBe(false);
  });
});
