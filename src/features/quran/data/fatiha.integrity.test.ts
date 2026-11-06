/**
 * Source-text integrity for Surah Al-Fatihah.
 *
 * The Arabic must stay byte-identical to the attributed source, the Tanzil Quran Text
 * (Uthmani 1.1, CC BY 3.0), checked in verbatim at __reference__/tanzil-uthmani-001.txt.
 * Word segmentation and the ayah-builder puzzles must rebuild exactly that text.
 * This proves fidelity to the source — not translation rights or scholarly review of the
 * explanations (see docs/release/CONTENT_VERIFICATION.md).
 */
import reference from './__reference__/tanzil-uthmani-001.txt?raw';
import { FATIHA_BUILDER_PUZZLES, FATIHA_VOCAB_CHALLENGES, SURAH_AL_FATIHA } from './fatiha';

const REF = new Map(
  reference
    .split('\n')
    .filter((line) => /^1\|\d+\|/.test(line))
    .map((line) => {
      const [, ayah, text] = line.split('|');
      return [Number(ayah), text] as const;
    }),
);

describe('Al-Fatihah source text', () => {
  it('the reference holds all seven ayat', () => {
    expect([...REF.keys()]).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('every ayah is byte-identical to Tanzil Uthmani 1.1, in order', () => {
    expect(SURAH_AL_FATIHA.ayahs.map((a) => a.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const ayah of SURAH_AL_FATIHA.ayahs) expect(ayah.arabic).toBe(REF.get(ayah.number));
  });

  it('word segmentation rebuilds each ayah exactly, with sequential ids', () => {
    for (const ayah of SURAH_AL_FATIHA.ayahs) {
      expect(ayah.words.map((w) => w.arabic).join(' ')).toBe(ayah.arabic);
      expect(ayah.words.map((w) => w.id)).toEqual(ayah.words.map((_, i) => `1:${ayah.number}:${i + 1}`));
    }
  });

  it('ayah-builder puzzles use the exact words of their ayah, and the solution is the ayah', () => {
    for (const puzzle of FATIHA_BUILDER_PUZZLES) {
      const ayah = SURAH_AL_FATIHA.ayahs.find((a) => a.number === puzzle.ayahNumber)!;
      expect(puzzle.targetArabic).toBe(ayah.arabic);
      const solved = [...puzzle.scrambledWords].sort((a, b) => a.correctIndex - b.correctIndex).map((w) => w.arabic);
      expect(solved.join(' ')).toBe(ayah.arabic);
    }
  });

  it('vocabulary challenges point at real words of the surah, with exactly one correct option', () => {
    const words = new Set(SURAH_AL_FATIHA.ayahs.flatMap((a) => a.words.map((w) => `${w.id}|${w.arabic}`)));
    for (const c of FATIHA_VOCAB_CHALLENGES) {
      expect(words.has(`${c.word.id}|${c.word.arabic}`)).toBe(true);
      expect(c.options.filter((o) => o.correct)).toHaveLength(1);
    }
  });
});
