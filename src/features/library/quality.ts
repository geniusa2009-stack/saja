import { QURAN_VERSE_COUNTS } from './catalogue';

/** Search-only normalization. Never replace or alter displayed sacred text. */
export function normalizeArabic(value: string): string {
  return value.normalize('NFC')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[\u0671\u0622\u0623\u0625]/g, 'ا')
    .replace(/\u0649/g, 'ي')
    .replace(/\u0624/g, 'و')
    .replace(/\u0626/g, 'ي')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

export function safeReadStrings(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === 'string' && v.length < 120))].slice(0, 8000) : [];
  } catch { return []; }
}

export function safeReadObject(key: string): Record<string, number> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([k, v]) => /^([1-9]|[1-9]\d|1[01]\d|114)$/.test(k) && Number.isInteger(v) && (v as number) > 0 && (v as number) <= QURAN_VERSE_COUNTS[Number(k) - 1]));
  } catch { return {}; }
}

export function saveJSON(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing or blocked storage: degrade gracefully. */ }
}

export interface QuranSearchResult { surah: number; ayah: number; text: string }
export interface QuranSearchPack {
  source: string;
  chapters: number;
  verses: number;
  items: QuranSearchResult[];
}
export function validSearchPack(value: unknown): value is QuranSearchPack {
  if (!value || typeof value !== 'object') return false;
  const pack = value as Partial<QuranSearchPack>;
  if (pack.chapters !== 114 || pack.verses !== 6236 || !Array.isArray(pack.items) || pack.items.length !== 6236 || typeof pack.source !== 'string' || !pack.source.includes('Tanzil')) return false;
  const seen = new Set<string>();
  for (const item of pack.items) {
    if (!item || !Number.isInteger(item.surah) || !Number.isInteger(item.ayah) || item.surah < 1 || item.surah > 114 || item.ayah < 1 || item.ayah > QURAN_VERSE_COUNTS[item.surah - 1] || typeof item.text !== 'string' || !/[\u0621-\u064a]/.test(item.text)) return false;
    const key = `${item.surah}:${item.ayah}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return seen.size === 6236;
}

export type HadithItem = { id: string; title: string; hadeeth: string; attribution: string; grade: string; explanation: string; reference: string; category: string };
export type HadithPack = { items: HadithItem[]; source: string; status: string; fetched_at: string; publisher_edition?: string | null };
export type DuaItem = { surah: number; ayah: number; arabic: string; source: string };
export type DuaPack = { items: DuaItem[]; source: string };

export function validHadithPack(value: unknown): value is HadithPack {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<HadithPack>;
  if (!p.source?.startsWith('https://hadeethenc.com/') || !Array.isArray(p.items) || p.items.length < 1001 || typeof p.fetched_at !== 'string') return false;
  const ids = new Set<string>();
  for (const item of p.items) {
    if (!item || typeof item.id !== 'string' || !/^\d+$/.test(item.id) || ids.has(item.id) || typeof item.hadeeth !== 'string' || item.hadeeth.trim().length < 30 || typeof item.grade !== 'string' || !item.grade.trim() || typeof item.reference !== 'string' || typeof item.explanation !== 'string' || typeof item.title !== 'string' || typeof item.category !== 'string') return false;
    ids.add(item.id);
  }
  return true;
}

export function validDuaPack(value: unknown): value is DuaPack {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<DuaPack>;
  if (typeof p.source !== 'string' || !p.source.includes('Tanzil') || !Array.isArray(p.items) || p.items.length < 40) return false;
  const seen = new Set<string>();
  for (const item of p.items) {
    if (!item || !Number.isInteger(item.surah) || !Number.isInteger(item.ayah) || item.surah < 1 || item.surah > 114 || item.ayah < 1 || item.ayah > QURAN_VERSE_COUNTS[item.surah - 1] || typeof item.arabic !== 'string' || !/[\u0621-\u064a]/.test(item.arabic)) return false;
    const key = `${item.surah}:${item.ayah}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

export function findInQuran(items: QuranSearchResult[], query: string, limit = 120): QuranSearchResult[] {
  const target = normalizeArabic(query);
  if (target.length < 2) return [];
  const found: QuranSearchResult[] = [];
  for (const item of items) {
    if (normalizeArabic(item.text).includes(target) || `${item.surah}:${item.ayah}` === target) {
      found.push(item);
      if (found.length >= limit) break;
    }
  }
  return found;
}

/** For each picked verse only source text is used, never generated. */
export function makeMemorizationOptions(verses: ReadonlyArray<{ id: number; text: string }>, ayah: number): { answer: number; choices: Array<{ id: number; text: string }> } | null {
  if (verses.length < 4 || ayah < 1 || ayah >= verses.length) return null;
  const next = verses[ayah];
  if (!next || next.id !== ayah + 1) return null;
  const candidates = [next, ...verses.filter((v) => v.id !== next.id && v.id !== ayah)].slice(0, 3);
  if (candidates.length !== 3) return null;
  const choices = [candidates[2], candidates[0], candidates[1]];
  return { answer: next.id, choices };
}

export async function copyText(value: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(value);
    return true;
  } catch { return false; }
}
