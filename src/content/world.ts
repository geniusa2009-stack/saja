import type { WorldLocation, LocationId } from '@/domain/types';

/**
 * The SAJA world, in path order. "Knowledge unlocks the world": each location
 * sleeps in blue night until enough missions are complete.
 *
 * `t` is the location's position along the world path (0 → 1).
 */
export const LOCATIONS: WorldLocation[] = [
  {
    id: 'village',
    chapter: 1,
    t: 0.06,
    lift: -30,
    name: { en: 'The Village', ar: 'القرية' },
    purpose: { en: 'Orientation, community and everyday words', ar: 'البداية والمجتمع وكلمات كل يوم' },
    arrival: { en: 'Lanterns hum as neighbours greet each other.', ar: 'تتوهج الفوانيس والجيران يتبادلون التحية.' },
    topics: ['terminology', 'character'],
    unlock: { kind: 'start' },
  },
  {
    id: 'mosque',
    chapter: 1,
    t: 0.17,
    lift: -60,
    name: { en: 'The Masjid Courtyard', ar: 'ساحة المسجد' },
    purpose: { en: 'Wudu, prayer and calm guidance', ar: 'الوضوء والصلاة والإرشاد الهادئ' },
    arrival: { en: 'Water murmurs in the fountain. Everything slows down here.', ar: 'الماء يهمس في النافورة. كل شيء يهدأ هنا.' },
    topics: ['purification', 'prayer'],
    unlock: { kind: 'start' },
  },
  {
    id: 'garden',
    chapter: 2,
    t: 0.29,
    lift: -18,
    name: { en: 'The Garden of Growth', ar: 'حديقة النمو' },
    purpose: { en: 'Character, values and daily reminders', ar: 'الأخلاق والقيم والتذكير اليومي' },
    arrival: { en: 'Every kind act here plants something that grows.', ar: 'كل عمل طيب هنا يزرع شيئًا ينمو.' },
    topics: ['character'],
    unlock: { kind: 'missions', count: 1 },
  },
  {
    id: 'library',
    chapter: 2,
    t: 0.41,
    lift: -64,
    name: { en: 'The Library of Light', ar: 'مكتبة النور' },
    purpose: { en: "Qur'an, knowledge and verified sources", ar: 'القرآن والمعرفة والمصادر الموثقة' },
    arrival: { en: 'Pages glow when someone reads them with care.', ar: 'تضيء الصفحات حين تُقرأ بعناية.' },
    topics: ['quran', 'history'],
    unlock: { kind: 'missions', count: 2 },
  },
  {
    id: 'house',
    chapter: 3,
    t: 0.52,
    lift: -26,
    name: { en: 'The Learning House', ar: 'بيت التعلّم' },
    purpose: { en: 'Foundations of belief and practice', ar: 'أسس الإيمان والعبادة' },
    arrival: { en: 'Five pillars hold this house steady.', ar: 'خمسة أركان تحمل هذا البيت.' },
    topics: ['beliefs'],
    unlock: { kind: 'missions', count: 3 },
  },
  {
    id: 'market',
    chapter: 3,
    t: 0.63,
    lift: -58,
    name: { en: 'The Night Market', ar: 'سوق الليل' },
    purpose: { en: 'Honesty, fairness and everyday choices', ar: 'الصدق والعدل واختيارات كل يوم' },
    arrival: { en: 'Scales, spices and small decisions that matter.', ar: 'موازين وتوابل وقرارات صغيرة مهمة.' },
    topics: ['character'],
    unlock: { kind: 'missions', count: 4 },
  },
  {
    id: 'reflection',
    chapter: 4,
    t: 0.73,
    lift: -14,
    name: { en: 'The Reflection Space', ar: 'مساحة التأمل' },
    purpose: { en: 'Stillness, gratitude and journaling', ar: 'السكينة والشكر والكتابة' },
    arrival: { en: 'The wind is quieter here. Take a breath.', ar: 'الريح هنا أهدأ. خذ نفسًا.' },
    topics: ['character'],
    unlock: { kind: 'missions', count: 5 },
  },
  {
    id: 'desert',
    chapter: 4,
    t: 0.84,
    lift: -46,
    name: { en: 'The Desert Caravan', ar: 'قافلة الصحراء' },
    purpose: { en: 'History, the Hijra and the fasting month', ar: 'التاريخ والهجرة وشهر الصيام' },
    arrival: { en: 'Caravans once crossed here by the light of stars.', ar: 'عبرت القوافل هنا يومًا على ضوء النجوم.' },
    topics: ['history', 'fasting'],
    unlock: { kind: 'missions', count: 6 },
  },
  {
    id: 'mountain',
    chapter: 5,
    t: 0.95,
    lift: -96,
    name: { en: 'The Mountain Observatory', ar: 'مرصد الجبل' },
    purpose: { en: 'Deeper concepts and advanced challenges', ar: 'مفاهيم أعمق وتحديات متقدمة' },
    arrival: { en: 'From up here, the whole path makes sense.', ar: 'من هنا يبدو الطريق كله واضحًا.' },
    topics: ['beliefs'],
    unlock: { kind: 'missions', count: 8 },
  },
];

export const LOCATION_BY_ID: Record<LocationId, WorldLocation> = Object.fromEntries(
  LOCATIONS.map((l) => [l.id, l]),
) as Record<LocationId, WorldLocation>;

export const CHAPTERS = [
  { n: 1, name: { en: 'First Light', ar: 'النور الأول' } },
  { n: 2, name: { en: 'The Garden of Growth', ar: 'حديقة النمو' } },
  { n: 3, name: { en: 'Pillars and Paths', ar: 'أركان ودروب' } },
  { n: 4, name: { en: 'Stillness and Stars', ar: 'سكينة ونجوم' } },
  { n: 5, name: { en: 'The Summit', ar: 'القمة' } },
] as const;
