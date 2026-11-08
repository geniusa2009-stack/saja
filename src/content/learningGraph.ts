/** Curated navigation graph. These edges indicate related learning experiences,
 * not claims about an ayah/hadith's meaning or scholarly endorsement. */
import type { LocationId, L10n, Profile, TopicId } from '@/domain/types';
import { pathFor, primaryTopics, type LearningPath } from '@/domain/journeyEngine';

export type ResourceKind = 'knowledge' | 'story' | 'mission' | 'quran' | 'hadith';
export interface LearningResource {
  id: string;
  kind: ResourceKind;
  title: L10n;
  description: L10n;
  href: string;
  topics: readonly TopicId[];
  paths?: readonly LearningPath[];
  missionId?: string;
  location?: LocationId;
}
export interface LearningConcept { id: string; topics: readonly TopicId[]; resources: readonly string[]; related: readonly string[] }

export const LEARNING_RESOURCES: readonly LearningResource[] = [
  { id: 'explore-knowledge', kind: 'knowledge', title: { ar: 'تعرّف على الأفكار الأساسية', en: 'Explore the foundations' }, description: { ar: 'أسئلة وإجابات مع مصادرها وسياقها.', en: 'Questions and answers with source context.' }, href: '/learn', topics: ['beliefs', 'terminology'], paths: ['exploring'] },
  { id: 'words-of-peace', kind: 'mission', title: { ar: 'مهمة كلمات السلام', en: 'Words of Peace mission' }, description: { ar: 'اكتشف معاني كلمات تُستخدم كل يوم.', en: 'Discover the meaning of everyday expressions.' }, href: '/mission/m-words-of-peace', topics: ['terminology'], paths: ['exploring'], missionId: 'm-words-of-peace', location: 'village' },
  { id: 'village-stories', kind: 'story', title: { ar: 'حكايات القرية', en: 'Village stories' }, description: { ar: 'مواقف خيالية للتفكير في القرارات.', en: 'Fictional choices to think through.' }, href: '/stories/village', topics: ['terminology', 'character'], paths: ['exploring'] },
  { id: 'wudu', kind: 'mission', title: { ar: 'تجربة الوضوء', en: 'Explore wudu' }, description: { ar: 'خطوات عملية تفاعلية في ساحة المسجد.', en: 'A hands-on journey through the courtyard.' }, href: '/mission/m-water-path', topics: ['purification'], paths: ['new-muslim'], missionId: 'm-water-path', location: 'mosque' },
  { id: 'prayer', kind: 'mission', title: { ar: 'تجربة الصلاة', en: 'Walk the prayer path' }, description: { ar: 'تعلّم ترتيب الحركات في تجربة موجهة.', en: 'Learn the sequence of movements interactively.' }, href: '/mission/m-five-pauses', topics: ['prayer'], paths: ['new-muslim'], missionId: 'm-five-pauses', location: 'mosque' },
  { id: 'fatiha', kind: 'quran', title: { ar: 'سورة الفاتحة', en: 'Surah Al-Fatihah' }, description: { ar: 'اقرأ السورة كاملة من المصحف.', en: 'Read the complete surah in the Mushaf.' }, href: '/mushaf/1', topics: ['quran', 'prayer'], paths: ['new-muslim'] },
  { id: 'quran-studio', kind: 'quran', title: { ar: 'استوديو الفاتحة', en: 'Al-Fatihah Studio' }, description: { ar: 'اكتشف الكلمات والشرح المتاح في الاستوديو.', en: 'Explore word study and available guided context.' }, href: '/quran-studio', topics: ['quran'], paths: ['learn-more'] },
  { id: 'mushaf', kind: 'quran', title: { ar: 'المصحف الكامل', en: 'Complete Mushaf' }, description: { ar: 'اقرأ السور واحفظ موضع القراءة.', en: 'Read surahs and save your place.' }, href: '/mushaf', topics: ['quran'], paths: ['learn-more', 'exploring'] },
  { id: 'first-revelation', kind: 'mission', title: { ar: 'قصة بداية الوحي', en: 'The First Word' }, description: { ar: 'مهمة تفاعلية في مكتبة النور.', en: 'A discovery mission in the library.' }, href: '/mission/m-first-word', topics: ['quran', 'history'], missionId: 'm-first-word', location: 'library' },
  { id: 'hadith', kind: 'hadith', title: { ar: 'مكتبة الأحاديث والأدعية', en: 'Hadith and du’a library' }, description: { ar: 'ابحث في النصوص والمراجع والدرجات المنشورة.', en: 'Browse original texts, references and published grades.' }, href: '/hadith-library', topics: ['character', 'prayer', 'beliefs', 'quran'], paths: ['learn-more'] },
  { id: 'honesty', kind: 'mission', title: { ar: 'الميزان الصادق', en: 'The Honest Scale' }, description: { ar: 'تجربة اختيار تفاعلية عن الأمانة في السوق.', en: 'An interactive choice about honesty in the market.' }, href: '/mission/m-honest-scale', topics: ['character'], missionId: 'm-honest-scale', location: 'market' },
  { id: 'market-stories', kind: 'story', title: { ar: 'حكايات السوق', en: 'Market stories' }, description: { ar: 'تدرّب على التفكير في آثار الاختيارات.', en: 'Explore consequences through fictional scenarios.' }, href: '/stories/market', topics: ['character'], paths: ['learn-more'] },
  { id: 'pillars', kind: 'mission', title: { ar: 'أركان البيت', en: 'Pillars of the House' }, description: { ar: 'نشاط تفاعلي للتعرّف على الأركان الخمسة.', en: 'An interactive introduction to the five pillars.' }, href: '/mission/m-pillars', topics: ['beliefs'], missionId: 'm-pillars', location: 'house' },
  { id: 'dua', kind: 'hadith', title: { ar: 'أدعية من آيات القرآن', en: 'Supplications in Quranic verses' }, description: { ar: 'اقرأ الآيات كاملة داخل مكتبة الأدعية.', en: 'Explore complete verses containing supplications.' }, href: '/hadith-library', topics: ['quran', 'beliefs'] },
  { id: 'history-stories', kind: 'story', title: { ar: 'حكايات الصحراء', en: 'Desert stories' }, description: { ar: 'قصص خيالية للتفكير؛ ليست روايات تاريخية.', en: 'Fictional reflections, not historical reports.' }, href: '/stories/desert', topics: ['history'] },
] as const;

export const LEARNING_CONCEPTS: readonly LearningConcept[] = [
  { id: 'belief-foundations', topics: ['beliefs'], resources: ['explore-knowledge', 'pillars', 'hadith'], related: ['everyday-words', 'quran-reading'] },
  { id: 'everyday-words', topics: ['terminology'], resources: ['words-of-peace', 'village-stories', 'explore-knowledge'], related: ['belief-foundations', 'character-choices'] },
  { id: 'prayer-journey', topics: ['prayer', 'purification'], resources: ['wudu', 'prayer', 'fatiha', 'hadith'], related: ['quran-reading'] },
  { id: 'quran-reading', topics: ['quran'], resources: ['fatiha', 'quran-studio', 'mushaf', 'first-revelation', 'dua'], related: ['belief-foundations', 'prayer-journey'] },
  { id: 'character-choices', topics: ['character'], resources: ['market-stories', 'honesty', 'hadith', 'village-stories'], related: ['everyday-words'] },
  { id: 'history', topics: ['history'], resources: ['history-stories', 'first-revelation'], related: ['quran-reading'] },
] as const;

export const topicForRegion = (region?: LocationId): TopicId => ({ village: 'terminology', mosque: 'prayer', garden: 'character', library: 'quran', house: 'beliefs', market: 'character', reflection: 'character', desert: 'history', mountain: 'beliefs' } as Partial<Record<LocationId, TopicId>>)[region ?? 'garden'] ?? 'character';

export interface LinkOptions { focus?: TopicId; completed?: readonly string[]; unlocked?: ReadonlySet<LocationId>; excludeHref?: string; limit?: number }
export function learningLinks(profile: Profile, options: LinkOptions = {}): LearningResource[] {
  const track = pathFor(profile.purpose);
  const interests = primaryTopics(profile);
  const preferredConcept = LEARNING_CONCEPTS.find((c) => options.focus && c.topics.includes(options.focus))
    ?? LEARNING_CONCEPTS.find((c) => c.topics.some((t) => interests.includes(t)))
    ?? LEARNING_CONCEPTS[0];
  const connected = new Set(preferredConcept.resources);
  for (const id of preferredConcept.related) {
    for (const resourceId of LEARNING_CONCEPTS.find((c) => c.id === id)?.resources ?? []) connected.add(resourceId);
  }
  const completed = new Set(options.completed ?? []);
  return LEARNING_RESOURCES
    .filter((r) => r.href !== options.excludeHref && (!r.missionId || (!completed.has(r.missionId) && (!options.unlocked || (r.location && options.unlocked.has(r.location))))))
    .filter((r) => track !== 'exploring' || r.paths?.includes('exploring') || r.kind !== 'mission' || r.id === 'first-revelation')
    .map((r, index) => {
      const score = (connected.has(r.id) ? 12 : 0) + (options.focus && r.topics.includes(options.focus) ? 10 : 0)
        + (r.paths?.includes(track) ? 7 : 0) + (r.topics.some((t) => interests.includes(t)) ? 4 : 0)
        + (r.kind === 'story' && profile.modality === 'story' ? 2 : 0)
        + (r.kind === 'mission' && profile.modality === 'hands-on' ? 2 : 0)
        + (track === 'exploring' && r.id === 'explore-knowledge' ? 6 : 0)
        + (track === 'new-muslim' && r.id === 'wudu' ? 8 : 0);
      return { r, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .filter(({ r }, index, all) => all.findIndex((item) => item.r.href === r.href) === index)
    .slice(0, options.limit ?? 3)
    .map(({ r }) => r);
}
