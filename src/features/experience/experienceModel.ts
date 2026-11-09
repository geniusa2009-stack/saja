import type { AgeBand, L10n, Modality, Profile, Purpose, TopicId } from '@/domain/types';

export type ContentCategory = 'quran' | 'hadith' | 'faith' | 'worship' | 'character' | 'history' | 'daily' | 'world' | 'tools';
export type ContentFormat = 'study' | 'mission' | 'hadith' | 'activity' | 'story' | 'world' | 'tool';
export type ContentStatus = 'demo' | 'fiction' | 'navigation' | 'reviewed';

export interface ContentItem {
  id: string;
  category: ContentCategory;
  format: ContentFormat;
  title: L10n;
  summary: L10n;
  href: string;
  topics: readonly TopicId[];
  ageBands: readonly AgeBand[];
  purpose?: readonly Purpose[];
  difficulty: 1 | 2 | 3;
  modality?: Modality;
  status: ContentStatus;
}

export interface ExperienceDisplay {
  showStories: boolean;
  showWorld: boolean;
  showAdvanced: boolean;
}

export const DEFAULT_EXPERIENCE: ExperienceDisplay = {
  showStories: false,
  showWorld: false,
  showAdvanced: true,
};

export const CATEGORIES: readonly { id: ContentCategory; label: L10n }[] = [
  { id: 'quran', label: { ar: 'القرآن وعلومه', en: 'Qur’an & study' } },
  { id: 'hadith', label: { ar: 'الحديث والأدعية', en: 'Hadith & du’a' } },
  { id: 'faith', label: { ar: 'العقيدة والمعاني', en: 'Faith & foundations' } },
  { id: 'worship', label: { ar: 'العبادات', en: 'Worship & practice' } },
  { id: 'character', label: { ar: 'الأخلاق والحياة', en: 'Character & life' } },
  { id: 'history', label: { ar: 'السيرة والتاريخ', en: 'History & context' } },
  { id: 'daily', label: { ar: 'رحلتي اليومية', en: 'Daily journey' } },
  { id: 'world', label: { ar: 'القصص والعوالم', en: 'Stories & worlds' } },
  { id: 'tools', label: { ar: 'المصادر والأدوات', en: 'Tools & sources' } },
] as const;

export function effectivePurpose(profile: Pick<Profile, 'ageBand' | 'purpose'>): Purpose {
  return profile.ageBand === 'child' ? 'child' : profile.purpose;
}

/** Age governs visibility in this index; server access controls remain authoritative. */
export function allowedForAge(item: ContentItem, ageBand: AgeBand): boolean {
  return item.ageBands.includes(ageBand);
}

export function recommendationScore(item: ContentItem, profile: Profile): number {
  const purpose = effectivePurpose(profile);
  let score = 0;
  if (item.purpose?.includes(purpose)) score += 16;
  if (item.topics.some((topic) => profile.interests.includes(topic))) score += 9;
  if (item.modality === profile.modality) score += 3;
  if (item.category === 'world' && purpose === 'child') score += 4;
  if (item.category === 'quran' && purpose === 'learn-more') score += 5;
  if (item.category === 'faith' && purpose === 'exploring') score += 6;
  if (item.category === 'worship' && purpose === 'new-muslim') score += 8;
  if (item.category === 'hadith' && purpose === 'learn-more') score += 5;
  if (item.format === 'tool') score -= 5;
  if (item.format === 'story' && purpose !== 'child' && profile.modality !== 'story') score -= 13;
  if (profile.level === 'beginner') score += (4 - item.difficulty) * 3;
  else if (profile.level === 'confident') score += item.difficulty * 4 - (item.difficulty === 1 ? 9 : 0);
  else score += 4 - Math.abs(item.difficulty - 2) * 2;
  return score;
}

export function recommendations(items: readonly ContentItem[], profile: Profile, display: ExperienceDisplay, limit = 6): ContentItem[] {
  const scored = items.filter((item) => allowedForAge(item, profile.ageBand))
    .filter((item) => display.showStories || item.format !== 'story')
    .filter((item) => display.showWorld || item.format !== 'world')
    .filter((item) => display.showAdvanced || item.difficulty < 3)
    .map((item, i) => ({ item, score: recommendationScore(item, profile), i }))
    .sort((a, b) => b.score - a.score || a.i - b.i);
  const result: ContentItem[] = [];
  const byCategory = new Map<ContentCategory, number>();
  const usedHref = new Set<string>();
  for (const { item } of scored) {
    if (result.length >= limit) break;
    if ((byCategory.get(item.category) ?? 0) >= 2 || usedHref.has(item.href)) continue;
    result.push(item);
    byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + 1);
    usedHref.add(item.href);
  }
  return result;
}

export function catalogSearch(items: readonly ContentItem[], profile: Profile, query: string, category: ContentCategory | 'all', format: ContentFormat | 'all'): ContentItem[] {
  const needle = query.trim().toLocaleLowerCase();
  return items.filter((item) => allowedForAge(item, profile.ageBand))
    .filter((item) => category === 'all' || item.category === category)
    .filter((item) => format === 'all' || item.format === format)
    .filter((item) => !needle || [item.title.ar, item.title.en, item.summary.ar, item.summary.en, ...item.topics].some((s) => s.toLocaleLowerCase().includes(needle)));
}
