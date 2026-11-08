/** Metadata only. Quran text is obtained verbatim from attributed upstream files. */
export const QURAN_VERSE_COUNTS = [
7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6,
] as const;

export const QURAN_SUPPLICATION_REFS: ReadonlyArray<readonly [number, number]> = [
[2,201],[2,250],[2,286],[3,8],[3,16],[3,53],[3,147],[3,191],[3,192],[3,193],[3,194],
[5,83],[7,23],[7,47],[7,89],[7,126],[7,151],[7,155],[10,85],[10,86],[11,47],[12,101],
[14,35],[14,40],[14,41],[17,24],[17,80],[18,10],[20,25],[20,26],[20,27],[20,28],[20,114],
[21,83],[21,87],[23,29],[23,97],[23,98],[23,109],[23,118],[25,65],[25,66],[25,74],
[26,83],[26,84],[26,85],[26,86],[26,87],[27,19],[28,16],[28,21],[28,22],[28,24],
[29,30],[37,100],[40,7],[40,8],[40,9],[59,10],[60,4],[60,5],[66,8],[71,28],
] as const;

export interface QuranChapter {
  id: number;
  verses: Array<{ id: number; text: string }>;
  notice?: string;
}
export interface QuranChapterName {
  id: number;
  name_arabic?: string;
  nameArabic?: string;
  name_simple?: string;
  nameSimple?: string;
  translated_name?: { name?: string };
  verses_count?: number;
  versesCount?: number;
}

export function validChapter(value: unknown, id: number): value is QuranChapter {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<QuranChapter>;
  return c.id === id && id >= 1 && id <= 114 &&
    Array.isArray(c.verses) && c.verses.length === QURAN_VERSE_COUNTS[id - 1] &&
    c.verses.every((v, i) => v && v.id === i + 1 && typeof v.text === 'string' && /[\u0621-\u064a]/.test(v.text));
}
export function getChapterName(chapter: QuranChapterName | undefined, fallback: number, isRTL: boolean): string {
  if (!chapter) return isRTL ? `سورة ${fallback}` : `Surah ${fallback}`;
  return isRTL ? chapter.name_arabic || chapter.nameArabic || `سورة ${fallback}` : chapter.name_simple || chapter.nameSimple || `Surah ${fallback}`;
}

export async function fetchVerified<T>(local: string, remote: string, verify: (data: unknown) => data is T, signal: AbortSignal): Promise<T> {
  let failure: unknown;
  for (const path of [local, remote]) {
    try {
      const response = await fetch(path, { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: unknown = await response.json();
      if (!verify(data)) throw new Error(`Integrity mismatch: ${path}`);
      return data;
    } catch (error) {
      if (signal.aborted) throw error;
      failure = error;
    }
  }
  throw failure instanceof Error ? failure : new Error('Content unavailable');
}
