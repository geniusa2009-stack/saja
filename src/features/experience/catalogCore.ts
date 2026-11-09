/** Lightweight recommendations: avoid loading the full story and hadith datasets on the home screen. */
import type { AgeBand, L10n, TopicId } from '@/domain/types';
import { MISSIONS } from '@/content/missions';
import { LEARNING_RESOURCES } from '@/content/learningGraph';
import type { ContentCategory, ContentItem } from './experienceModel';

const EVERYONE: readonly AgeBand[] = ['child', 'teen', 'adult'];
const TEEN_ADULT: readonly AgeBand[] = ['teen', 'adult'];
const L = (ar: string, en: string): L10n => ({ ar, en });

export function categoryForTopic(topic: TopicId): ContentCategory {
  if (topic === 'quran') return 'quran';
  if (topic === 'prayer' || topic === 'purification' || topic === 'fasting') return 'worship';
  if (topic === 'character') return 'character';
  if (topic === 'history') return 'history';
  return 'faith';
}

const hubs: ContentItem[] = [
  { id: 'hub-mushaf', category: 'quran', format: 'study', title: L('المصحف', 'The Mushaf'), summary: L('قراءة القرآن واختيار السورة.', 'Read the Qur’an and choose a surah.'), href: '/mushaf', topics: ['quran'], ageBands: EVERYONE, difficulty: 2, purpose: ['learn-more', 'exploring'], status: 'navigation' },
  { id: 'hub-quran', category: 'quran', format: 'study', title: L('رحاب القرآن', 'Qur’an Odyssey'), summary: L('التعلّم والتأمل في الآيات.', 'Explore verses through guided study.'), href: '/quran', topics: ['quran'], ageBands: EVERYONE, difficulty: 2, status: 'navigation' },
  { id: 'hub-quran-studio', category: 'quran', format: 'activity', title: L('استوديو الفاتحة', 'Al-Fatihah Studio'), summary: L('استكشاف الكلمات والمعاني.', 'Explore words and available explanations.'), href: '/quran-studio', topics: ['quran'], ageBands: EVERYONE, difficulty: 2, modality: 'visual', status: 'navigation' },
  { id: 'hub-hadith', category: 'hadith', format: 'study', title: L('مكتبة الحديث', 'Hadith Library'), summary: L('نصوص الحديث ومصادرها وحالة مراجعتها.', 'Hadith texts, sources and review status.'), href: '/hadith', topics: ['character'], ageBands: EVERYONE, difficulty: 2, purpose: ['learn-more'], status: 'navigation' },
  { id: 'hub-hadith-dua', category: 'hadith', format: 'study', title: L('مكتبة الحديث والأدعية', 'Hadith & Du’a Atlas'), summary: L('تصفح النصوص والأدعية مع مصادرها.', 'Browse texts and supplications with sources.'), href: '/hadith-library', topics: ['character', 'prayer'], ageBands: EVERYONE, difficulty: 3, purpose: ['learn-more'], status: 'navigation' },
  { id: 'hub-learning', category: 'faith', format: 'study', title: L('مكتبة المعرفة', 'Knowledge Library'), summary: L('أسئلة ومعلومات مع أدلتها وسياقها.', 'Questions and answers with sources and context.'), href: '/learn', topics: ['beliefs', 'terminology'], ageBands: EVERYONE, difficulty: 2, purpose: ['exploring', 'new-muslim'], status: 'navigation' },
  { id: 'hub-day', category: 'daily', format: 'tool', title: L('يومي', 'My Day'), summary: L('متابعة يومك وما تريد الالتزام به.', 'Organise your daily learning and routines.'), href: '/day', topics: ['prayer'], ageBands: EVERYONE, difficulty: 1, status: 'navigation' },
  { id: 'hub-journey', category: 'daily', format: 'tool', title: L('مسار التعلّم', 'My Journey'), summary: L('الخطوات التي أنجزتها وما تريد متابعته.', 'Follow your progress and next learning steps.'), href: '/journey', topics: [], ageBands: EVERYONE, difficulty: 1, status: 'navigation' },
  { id: 'hub-world', category: 'world', format: 'world', title: L('العالم التفاعلي', 'Explore the World'), summary: L('تجول في القرية والأماكن التفاعلية إذا أحببت.', 'Explore the village and interactive places, if you choose.'), href: '/', topics: ['character', 'terminology'], ageBands: EVERYONE, difficulty: 1, modality: 'hands-on', purpose: ['child'], status: 'navigation' },
  { id: 'hub-amanah', category: 'tools', format: 'tool', title: L('الأمانة', 'AMANAH'), summary: L('مراجعة النصوص والمصادر دون ادعاء توثيق غير موجود.', 'Examine evidence and source context.'), href: '/amanah', topics: ['beliefs'], ageBands: TEEN_ADULT, difficulty: 3, status: 'navigation' },
  { id: 'hub-nour', category: 'tools', format: 'tool', title: L('نور', 'NOUR'), summary: L('فحص المعلومات والوسائط بوضوح حول حدود التحقق.', 'Review media and claims with clear limits.'), href: '/nour', topics: ['beliefs'], ageBands: TEEN_ADULT, difficulty: 3, status: 'navigation' },
  { id: 'hub-scholar', category: 'tools', format: 'tool', title: L('اسأل متخصصًا', 'Ask a Scholar'), summary: L('الأسئلة المتخصصة تُوجَّه إلى أهل الاختصاص.', 'Route specialised questions to qualified people.'), href: '/scholar', topics: ['beliefs'], ageBands: TEEN_ADULT, difficulty: 3, status: 'navigation' },
];

const missions: ContentItem[] = MISSIONS.filter((m) => !m.adaptive).map((m): ContentItem => ({
  id: `mission:${m.id}`, category: categoryForTopic(m.topic), format: 'mission' as const,
  title: m.title, summary: m.summary, href: `/mission/${m.id}`, topics: [m.topic],
  ageBands: m.kidSafe ? EVERYONE : TEEN_ADULT, difficulty: m.difficulty,
  modality: m.modality, status: 'demo' as const,
  purpose: m.difficulty === 1 ? ['new-muslim', 'child'] : ['learn-more'],
}));

const graph: ContentItem[] = LEARNING_RESOURCES
  .filter((r) => !missions.some((m) => m.href === r.href) && !hubs.some((h) => h.href === r.href))
  .map((r): ContentItem => ({
    id: `linked:${r.id}`,
    category: r.kind === 'story' ? 'world' as const : r.kind === 'quran' ? 'quran' as const : r.kind === 'hadith' ? 'hadith' as const : categoryForTopic(r.topics[0] ?? 'beliefs'),
    format: r.kind === 'story' ? 'story' as const : r.kind === 'mission' ? 'mission' as const : 'study' as const,
    title: r.title, summary: r.description, href: r.href, topics: r.topics,
    ageBands: TEEN_ADULT, difficulty: 2 as const,
    status: r.kind === 'story' ? 'fiction' as const : 'navigation' as const,
  }));

export const HOME_CATALOG: readonly ContentItem[] = [...hubs, ...missions, ...graph];
export const HOME_CATALOG_COUNTS = Object.freeze({ missions: missions.length, hubs: hubs.length, linked: graph.length });
