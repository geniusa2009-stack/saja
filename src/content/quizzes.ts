import type { L10n } from '@/domain/types';

/** Quiz questions derived from knowledge entries — reveals *why*, never just right/wrong. */
export const QUIZZES: Record<string, { q: L10n; options: { label: L10n; correct: boolean; why: L10n }[] }> = {
  'k-wudu': {
    q: { en: 'Which part is wiped, not washed, in wudu?', ar: 'أي عضو يُمسح ولا يُغسل في الوضوء؟' },
    options: [
      { label: { en: 'The head', ar: 'الرأس' }, correct: true, why: { en: 'Qur’an 5:6 says “wipe over your heads”.', ar: 'قال تعالى: «وامسحوا برؤوسكم».' } },
      { label: { en: 'The face', ar: 'الوجه' }, correct: false, why: { en: 'The face is washed — it’s the first thing named in 5:6.', ar: 'الوجه يُغسل، وهو أول ما ذُكر في الآية.' } },
      { label: { en: 'The arms', ar: 'الذراعان' }, correct: false, why: { en: 'Arms are washed up to the elbows.', ar: 'الذراعان تُغسلان إلى المرفقين.' } },
    ],
  },
  'k-five-prayers': {
    q: { en: 'Why do prayer times change through the year?', ar: 'لماذا تتغير مواقيت الصلاة خلال السنة؟' },
    options: [
      { label: { en: 'They follow the sun', ar: 'لأنها تتبع الشمس' }, correct: true, why: { en: 'Dawn, noon, afternoon, sunset and night move with the seasons.', ar: 'الفجر والظهر والعصر والمغرب والعشاء تتحرك مع الفصول.' } },
      { label: { en: 'Each masjid chooses', ar: 'كل مسجد يختار' }, correct: false, why: { en: 'Masjids follow the sun’s times, then set the iqamah nearby.', ar: 'تتبع المساجد أوقات الشمس ثم تحدد الإقامة قريبًا منها.' } },
    ],
  },
  'k-salah-steps': {
    q: { en: 'What comes right after bowing (ruku‘)?', ar: 'ماذا يأتي بعد الركوع مباشرة؟' },
    options: [
      { label: { en: 'Rising up again', ar: 'الرفع من الركوع' }, correct: true, why: { en: 'You rise and stand still before going into sujud.', ar: 'ترفع وتطمئن قائمًا قبل السجود.' } },
      { label: { en: 'Salam', ar: 'التسليم' }, correct: false, why: { en: 'Salam ends the whole prayer.', ar: 'التسليم يختم الصلاة كلها.' } },
    ],
  },
  'k-kindness': {
    q: { en: 'Which small act did the Prophet ﷺ call charity?', ar: 'أي عمل صغير سماه النبي ﷺ صدقة؟' },
    options: [
      { label: { en: 'Smiling at someone', ar: 'الابتسامة في وجه أخيك' }, correct: true, why: { en: 'Your smile in the face of your brother is charity (Tirmidhi 1956).', ar: '«تبسمك في وجه أخيك لك صدقة» (الترمذي ١٩٥٦).' } },
      { label: { en: 'Only giving money', ar: 'إعطاء المال فقط' }, correct: false, why: { en: 'Charity is wider than money in the Sunnah.', ar: 'الصدقة في السنة أوسع من المال.' } },
    ],
  },
};
