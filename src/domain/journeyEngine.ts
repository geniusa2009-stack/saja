/** Purpose-aware ranking on top of the existing safety/availability-aware mission engine. */
import type { LearnerModel, Recommendation } from './adaptive';
import type { L10n, Profile, Purpose, TopicId } from './types';

export type LearningPath = 'exploring' | 'new-muslim' | 'learn-more';

export const PATHS: Record<LearningPath, { title: L10n; intro: L10n; invitation: L10n }> = {
  exploring: {
    title: { ar: 'رحلة الاستكشاف', en: 'Explore Islam' },
    intro: { ar: 'تعرّف على الأفكار والقصص والمصادر بأسئلتك أنت، دون افتراض أنك مسلم.', en: 'Explore ideas, stories and sources with your own questions, without assumptions about your beliefs.' },
    invitation: { ar: 'ابدأ بكلمات ومعانٍ، ثم اختر ما تريد اكتشافه.', en: 'Begin with everyday words and meanings, then choose what to explore.' },
  },
  'new-muslim': {
    title: { ar: 'بداية المسلم الجديد', en: 'Your new beginning' },
    intro: { ar: 'خطوات عملية صغيرة، ومعاني واضحة، ومراجعة مريحة دون استعجال.', en: 'Small practical steps, clear meanings and relaxed review at your own pace.' },
    invitation: { ar: 'ابدأ بالوضوء والصلاة أو اقرأ الفاتحة حسب اهتمامك.', en: 'Start with wudu and prayer, or explore Al-Fatihah at your pace.' },
  },
  'learn-more': {
    title: { ar: 'رحلة التعلّم والتعمّق', en: 'Learn and go deeper' },
    intro: { ar: 'مهمات ومصادر مترابطة تتغيّر حسب أهدافك ومعرفتك الحالية.', en: 'Connected missions and sources shaped by your goals and current understanding.' },
    invitation: { ar: 'اختياراتك ومستواك يحددان ما نقترحه أولًا، ويمكنك تغييرهما دائمًا.', en: 'Your interests and experience guide your next steps, and you can change them anytime.' },
  },
};

/** 'child' is a legacy onboarding purpose, not a religion or fourth curriculum. */
export const pathFor = (purpose: Purpose): LearningPath => purpose === 'child' ? 'learn-more' : purpose;

const TRACK_SEQUENCE: Record<LearningPath, readonly string[]> = {
  exploring: ['m-words-of-peace', 'm-dropped-lunch', 'm-first-word', 'm-pillars', 'm-honest-scale', 'm-caravan-stars', 'm-evening-stillness', 'm-water-path', 'm-five-pauses'],
  'new-muslim': ['m-water-path', 'm-five-pauses', 'm-words-of-peace', 'm-pillars', 'm-first-word', 'm-dropped-lunch', 'm-evening-stillness', 'm-honest-scale'],
  'learn-more': ['m-first-word', 'm-honest-scale', 'm-five-pauses', 'm-six-lights', 'm-caravan-stars', 'm-summit-names', 'm-words-of-peace', 'm-dropped-lunch'],
};

const GOAL_TOPICS: Record<Profile['goals'][number], TopicId[]> = {
  prayer: ['prayer', 'purification'],
  quran: ['quran'],
  basics: ['beliefs', 'terminology'],
  character: ['character'],
  community: ['character', 'terminology'],
  consistency: ['prayer', 'quran'],
};

export function primaryTopics(profile: Pick<Profile, 'purpose' | 'goals' | 'interests'>): TopicId[] {
  const declared = [...new Set([...profile.interests, ...profile.goals.flatMap((g) => GOAL_TOPICS[g])])];
  if (declared.length) return declared;
  return pathFor(profile.purpose) === 'exploring' ? ['beliefs', 'terminology']
    : pathFor(profile.purpose) === 'new-muslim' ? ['purification', 'prayer'] : ['quran', 'character'];
}

/** Input candidates have already been filtered for age, unlocks, completion and time. */
export function personalizeRecommendations(profile: Profile, model: LearnerModel, candidates: readonly Recommendation[]): Recommendation[] {
  const track = pathFor(profile.purpose);
  const sequence = TRACK_SEQUENCE[track];
  const interests = new Set(primaryTopics(profile));
  return candidates.map((rec) => {
    const m = rec.mission;
    const index = sequence.indexOf(m.id);
    // The strongest signal for explorers and new Muslims is the learning path,
    // not generic topic mastery. No mission is made mandatory or inaccessible.
    const sequenceWeight = index === -1 ? 0 : track === 'learn-more' ? (sequence.length - index) * 0.4 : (sequence.length - index) * 2;
    const interestWeight = interests.has(m.topic) ? (track === 'learn-more' ? 11 : 2.5) : 0;
    const difficultyWeight = profile.level === 'beginner' ? (4 - m.difficulty) * 0.8
      : profile.level === 'confident' ? m.difficulty * 1.1 : (3 - Math.abs(m.difficulty - 2)) * 0.7;
    const styleWeight = m.modality === profile.modality || m.modality === model.preferred ? 0.8 : 0;
    const revisitWeight = rec.reason === 'revisit' ? 2.5 : 0;
    return { ...rec, score: rec.score + sequenceWeight + interestWeight + difficultyWeight + styleWeight + revisitWeight };
  }).sort((a, b) => b.score - a.score || a.mission.number - b.mission.number);
}
