import type { CharacterLook, L10n, LocationId } from '@/domain/types';

/** People you meet in the world (fictional). Prophets and Companions are never depicted. */
export interface Npc {
  id: string;
  at: LocationId;
  dx: number; // world-unit offset from the location centre
  name: L10n;
  look: CharacterLook;
  lines: L10n[];
  missionId?: string;
}

export const NPCS: Npc[] = [
  {
    id: 'amina',
    at: 'village',
    dx: 250,
    name: { en: 'Amina', ar: 'أمينة' },
    look: { skin: 2, hair: 'hijab', hairColor: 3, outfit: 'tunic', outfitColor: 3, accessory: 'satchel' },
    lines: [
      { en: 'As-salamu alaykum! Are you new here? The lanterns light up when people greet each other.', ar: 'السلام عليكم! هل أنت جديد هنا؟ الفوانيس تضيء حين يتبادل الناس التحية.' },
      { en: 'Try the Words of Peace — every lantern has a word we say every day.', ar: 'جرّب «كلمات السلام» — كل فانوس فيه كلمة نقولها كل يوم.' },
    ],
    missionId: 'm-words-of-peace',
  },
  {
    id: 'grandpa',
    at: 'mosque',
    dx: 190,
    name: { en: 'Grandfather Yusuf', ar: 'الجد يوسف' },
    look: { skin: 3, hair: 'kufi', hairColor: 4, outfit: 'thobe', outfitColor: 0, accessory: 'glasses' },
    lines: [
      { en: 'Before we pray, we prepare. Water, calm, and a clear intention.', ar: 'قبل الصلاة نستعد: ماء وسكينة ونية صافية.' },
      { en: 'Come to the fountain with me — I’ll show you the water path.', ar: 'تعال معي إلى النافورة، سأريك درب الماء.' },
    ],
    missionId: 'm-water-path',
  },
  {
    id: 'idris',
    at: 'garden',
    dx: 120,
    name: { en: 'Idris', ar: 'إدريس' },
    look: { skin: 4, hair: 'curly', hairColor: 0, outfit: 'hoodie', outfitColor: 1, accessory: 'none' },
    lines: [
      { en: 'Everything in this garden grew from something small.', ar: 'كل ما في هذه الحديقة نما من شيء صغير.' },
      { en: 'I dropped my lunch here yesterday… it was not my best day.', ar: 'سقط غدائي هنا أمس… لم يكن أفضل أيامي.' },
    ],
    missionId: 'm-dropped-lunch',
  },
  {
    id: 'huda',
    at: 'library',
    dx: -240,
    name: { en: 'Librarian Huda', ar: 'أمينة المكتبة هدى' },
    look: { skin: 1, hair: 'hijab', hairColor: 2, outfit: 'abaya', outfitColor: 2, accessory: 'glasses' },
    lines: [
      { en: 'Every page here shows where it came from. We never guess about sources.', ar: 'كل صفحة هنا تبيّن مصدرها. لا نخمّن أبدًا في المصادر.' },
      { en: 'Five pages started glowing this morning. Can you find them?', ar: 'بدأت خمس صفحات تتوهج هذا الصباح. هل تجدها؟' },
    ],
    missionId: 'm-first-word',
  },
  {
    id: 'safiya',
    at: 'market',
    dx: 250,
    name: { en: 'Aunt Safiya', ar: 'الخالة صفية' },
    look: { skin: 5, hair: 'wrap', hairColor: 3, outfit: 'abaya', outfitColor: 3, accessory: 'lantern' },
    lines: [
      { en: 'A stall runs on trust. Lose it, and even the brightest lanterns won’t sell.', ar: 'الكشك يقوم على الثقة. إن ضاعت فلن تُباع حتى أجمل الفوانيس.' },
      { en: 'Could you watch my stall for a moment?', ar: 'هل تراقب كشكي لحظة؟' },
    ],
    missionId: 'm-honest-scale',
  },
  {
    id: 'tariq',
    at: 'desert',
    dx: -240,
    name: { en: 'Tariq the guide', ar: 'طارق الدليل' },
    look: { skin: 3, hair: 'wrap', hairColor: 0, outfit: 'jubba', outfitColor: 3, accessory: 'lantern' },
    lines: [
      { en: 'Travellers used the stars to cross this desert. Some journeys change history.', ar: 'كان المسافرون يعبرون هذه الصحراء بالنجوم. بعض الرحلات تغيّر التاريخ.' },
    ],
    missionId: 'm-caravan-stars',
  },
  {
    id: 'leena',
    at: 'mountain',
    dx: -300,
    name: { en: 'Stargazer Leena', ar: 'راصدة النجوم لينا' },
    look: { skin: 0, hair: 'long', hairColor: 3, outfit: 'hoodie', outfitColor: 4, accessory: 'glasses' },
    lines: [{ en: 'From up here, you can see how every path you walked connects.', ar: 'من هنا ترى كيف تتصل كل الدروب التي مشيتها.' }],
    missionId: 'm-summit-names',
  },
];
