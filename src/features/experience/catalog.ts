/** Full lazy-loaded index of bundled SAJA material, preserving its original sources. */
import type {AgeBand, TopicId} from '@/domain/types';
import { KNOWLEDGE } from '@/content/knowledge';
import { HADITHS } from '@/content/hadith';
import { HADITH_ACTIVITIES } from '@/content/hadithActivities';
import { SIDE_STORIES } from '@/content/sideStories';
import { HOME_CATALOG, HOME_CATALOG_COUNTS, categoryForTopic } from './catalogCore';
import type { ContentItem } from './experienceModel';

const EVERYONE: readonly AgeBand[] = ['child', 'teen', 'adult'];
const TEEN_ADULT: readonly AgeBand[] = ['teen', 'adult'];

const knowledge: ContentItem[] = KNOWLEDGE.map((k): ContentItem => ({
  id: `knowledge:${k.id}`, category: categoryForTopic(k.topics[0] ?? 'beliefs'), format: 'study' as const,
  title: k.question, summary: k.simple, href: `/learn?q=${encodeURIComponent(k.question.en)}`,
  topics: k.topics, ageBands: TEEN_ADULT, difficulty: 2 as const,
  status: k.reviewStatus === 'reviewed' ? 'reviewed' as const : 'demo' as const,
}));

const hadith: ContentItem[] = HADITHS.map((h): ContentItem => ({
  id: `hadith:${h.id}`, category: 'hadith' as const, format: 'hadith' as const,
  title: h.title, summary: h.meaning, href: `/hadith/${h.id}`,
  topics: h.topics, ageBands: h.ageBands, difficulty: 2 as const,
  purpose: ['learn-more' as const], status: 'demo' as const,
}));

const hadithActivities: ContentItem[] = HADITH_ACTIVITIES.map((a): ContentItem => ({
  id: `activity:${a.id}`, category: 'hadith' as const, format: 'activity' as const,
  title: a.title, summary: a.summary, href: `/hadith/discover/${a.id}`,
  topics: ['character' as TopicId], ageBands: a.ageBands, difficulty: 1 as const,
  modality: 'hands-on' as const, status: 'demo' as const,
}));

const stories: ContentItem[] = SIDE_STORIES.map((s): ContentItem => ({
  id: `story:${s.id}`, category: 'world' as const, format: 'story' as const,
  title: s.title, summary: s.objective,
  href: `/stories/${s.region}?episode=${encodeURIComponent(s.id)}`,
  topics: ['character' as TopicId], ageBands: EVERYONE, difficulty: 1 as const,
  modality: 'story' as const, purpose: ['child' as const], status: 'fiction' as const,
}));

export const EXPERIENCE_CATALOG: readonly ContentItem[] = [...HOME_CATALOG, ...knowledge, ...hadith, ...hadithActivities, ...stories];

export const CATALOG_COUNTS = Object.freeze({
  missions: HOME_CATALOG_COUNTS.missions,
  knowledge: knowledge.length,
  hadith: hadith.length,
  activities: hadithActivities.length,
  stories: stories.length,
  linked: HOME_CATALOG_COUNTS.linked,
  hubs: HOME_CATALOG_COUNTS.hubs,
});
