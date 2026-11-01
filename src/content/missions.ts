import type { L10n, Mission } from '@/domain/types';

/**
 * Mission catalog. Numbers are what people say in circles ("Mission 5"),
 * so they are stable identifiers for deep-linking from chat.
 */
export const MISSIONS: Mission[] = [
  {
    id: 'm-water-path',
    number: 1,
    location: 'mosque',
    title: { en: 'The Water Path', ar: 'درب الماء' },
    summary: {
      en: 'Walk the courtyard fountain and prepare for prayer, one calm step at a time.',
      ar: 'امشِ إلى نافورة الساحة واستعد للصلاة خطوة هادئة بعد أخرى.',
    },
    topic: 'purification',
    concept: 'wudu-order',
    mechanic: 'wudu-journey',
    modality: 'hands-on',
    minutes: 3,
    difficulty: 1,
    knowledge: ['k-wudu', 'k-intention'],
    reward: { kind: 'artifact', id: 'keeper-of-wudu', name: { en: 'Keeper of Wudu', ar: 'حافظ الوضوء' } },
    kidSafe: true,
  },
  {
    id: 'm-words-of-peace',
    number: 2,
    location: 'village',
    title: { en: 'Words of Peace', ar: 'كلمات السلام' },
    summary: {
      en: 'Light the village lanterns by matching everyday words to what they mean.',
      ar: 'أضئ فوانيس القرية بمطابقة كلمات كل يوم مع معانيها.',
    },
    topic: 'terminology',
    concept: 'everyday-phrases',
    mechanic: 'lantern-match',
    modality: 'hands-on',
    minutes: 3,
    difficulty: 1,
    knowledge: ['k-phrases', 'k-salam'],
    reward: { kind: 'badge', id: 'bearer-of-salam', name: { en: 'Bearer of Salam', ar: 'ناشر السلام' } },
    kidSafe: true,
  },
  {
    id: 'm-dropped-lunch',
    number: 3,
    location: 'garden',
    title: { en: 'The Dropped Lunch', ar: 'الغداء الذي سقط' },
    summary: {
      en: 'Something small happens in the garden. What you do next grows something.',
      ar: 'يحدث شيء صغير في الحديقة، وما تفعله بعده يُنبت شيئًا.',
    },
    topic: 'character',
    concept: 'kindness',
    mechanic: 'kindness-choice',
    modality: 'story',
    minutes: 3,
    difficulty: 1,
    knowledge: ['k-kindness'],
    reward: { kind: 'item', id: 'garden-seedling', name: { en: 'Garden seedling', ar: 'شتلة الحديقة' } },
    kidSafe: true,
  },
  {
    id: 'm-five-pauses',
    number: 4,
    location: 'mosque',
    title: { en: 'Five Calm Pauses', ar: 'خمس وقفات هادئة' },
    summary: {
      en: 'Walk the prayer path and place each movement of one unit of salah.',
      ar: 'امشِ في درب الصلاة وضع كل حركة من حركات الركعة في مكانها.',
    },
    topic: 'prayer',
    concept: 'salah-order',
    mechanic: 'salah-path',
    modality: 'hands-on',
    minutes: 4,
    difficulty: 2,
    knowledge: ['k-salah-steps', 'k-five-prayers'],
    reward: { kind: 'artifact', id: 'lantern-of-pauses', name: { en: 'Lantern of the Five Pauses', ar: 'فانوس الوقفات الخمس' } },
    kidSafe: true,
  },
  {
    id: 'm-first-word',
    number: 5,
    location: 'library',
    title: { en: 'The First Word', ar: 'الكلمة الأولى' },
    summary: {
      en: 'Find five glowing clues among the shelves and piece together how the Qur’an began.',
      ar: 'ابحث عن خمسة أدلة مضيئة بين الرفوف، وركّب قصة بداية نزول القرآن.',
    },
    topic: 'quran',
    concept: 'first-revelation',
    mechanic: 'clue-hunt',
    modality: 'hands-on',
    minutes: 4,
    difficulty: 2,
    knowledge: ['k-first-revelation', 'k-knowledge-dua'],
    reward: { kind: 'story', id: 'cave-of-light', name: { en: 'Story: The Cave of Light', ar: 'قصة: غار النور' } },
    kidSafe: true,
  },
  {
    id: 'm-pillars',
    number: 6,
    location: 'house',
    title: { en: 'Pillars of the House', ar: 'أركان البيت' },
    summary: {
      en: 'Raise the five pillars of the Learning House by lighting each with its meaning.',
      ar: 'ارفع أركان بيت التعلّم الخمسة بإضاءة كل ركن بمعناه.',
    },
    topic: 'beliefs',
    concept: 'five-pillars',
    mechanic: 'lantern-match',
    modality: 'hands-on',
    minutes: 3,
    difficulty: 1,
    knowledge: ['k-pillars'],
    reward: { kind: 'artifact', id: 'keystone', name: { en: 'The Keystone', ar: 'حجر الأساس' } },
    kidSafe: true,
  },
  {
    id: 'm-honest-scale',
    number: 7,
    location: 'market',
    title: { en: 'The Honest Scale', ar: 'الميزان الصادق' },
    summary: {
      en: 'Help at a lantern stall in the night market — and decide what honesty looks like.',
      ar: 'ساعد في كشك الفوانيس في سوق الليل، وقرّر كيف يبدو الصدق.',
    },
    topic: 'character',
    concept: 'honesty',
    mechanic: 'kindness-choice',
    modality: 'story',
    minutes: 3,
    difficulty: 2,
    knowledge: ['k-honesty'],
    reward: { kind: 'item', id: 'brass-scale', name: { en: 'Brass scale', ar: 'ميزان نحاسي' } },
    kidSafe: true,
  },
  {
    id: 'm-evening-stillness',
    number: 8,
    location: 'reflection',
    title: { en: 'Evening Stillness', ar: 'سكينة المساء' },
    summary: {
      en: 'Slow your breath, notice three gifts from today, and leave them with the stars.',
      ar: 'هدّئ أنفاسك، وتأمّل ثلاث نِعم من يومك، واتركها مع النجوم.',
    },
    topic: 'character',
    concept: 'gratitude',
    mechanic: 'reflection',
    modality: 'guided',
    minutes: 3,
    difficulty: 1,
    knowledge: ['k-gratitude'],
    reward: { kind: 'badge', id: 'grateful-heart', name: { en: 'Grateful Heart', ar: 'القلب الشاكر' } },
    kidSafe: true,
  },
  {
    id: 'm-caravan-stars',
    number: 9,
    location: 'desert',
    title: { en: 'Stars of the Caravan', ar: 'نجوم القافلة' },
    summary: {
      en: 'Follow the clues a caravan left in the sand to understand the Hijra.',
      ar: 'تتبّع الأدلة التي تركتها القافلة في الرمال لتفهم الهجرة.',
    },
    topic: 'history',
    concept: 'hijra',
    mechanic: 'clue-hunt',
    modality: 'hands-on',
    minutes: 4,
    difficulty: 2,
    knowledge: ['k-hijra'],
    reward: { kind: 'story', id: 'second-of-two', name: { en: 'Story: The Second of Two', ar: 'قصة: ثاني اثنين' } },
    kidSafe: true,
  },
  {
    id: 'm-ramadan-moon',
    number: 10,
    location: 'desert',
    title: { en: 'The Ramadan Moon', ar: 'هلال رمضان' },
    summary: {
      en: 'Prepare the caravan for the fasting month by lighting each lantern with its meaning.',
      ar: 'جهّز القافلة لشهر الصيام بإضاءة كل فانوس بمعناه.',
    },
    topic: 'fasting',
    concept: 'fasting-basics',
    mechanic: 'lantern-match',
    modality: 'hands-on',
    minutes: 3,
    difficulty: 2,
    knowledge: ['k-fasting', 'k-laylat-al-qadr'],
    reward: { kind: 'item', id: 'crescent-lantern', name: { en: 'Crescent lantern', ar: 'فانوس الهلال' } },
    kidSafe: true,
  },
  {
    id: 'm-summit-names',
    number: 11,
    location: 'mountain',
    title: { en: 'The Names at the Summit', ar: 'الأسماء عند القمة' },
    summary: {
      en: 'Search the observatory for clues about how Allah describes Himself.',
      ar: 'ابحث في المرصد عن أدلة على كيف وصف الله نفسه.',
    },
    topic: 'beliefs',
    concept: 'names',
    mechanic: 'clue-hunt',
    modality: 'hands-on',
    minutes: 5,
    difficulty: 3,
    knowledge: ['k-names'],
    reward: { kind: 'artifact', id: 'observatory-lens', name: { en: 'Observatory lens', ar: 'عدسة المرصد' } },
    kidSafe: true,
  },
  {
    id: 'm-six-lights',
    number: 12,
    location: 'mountain',
    title: { en: 'Six Lights of Faith', ar: 'أنوار الإيمان الستة' },
    summary: {
      en: 'Light the six lamps of the observatory — each one a pillar of iman.',
      ar: 'أضئ مصابيح المرصد الستة، كل منها ركن من أركان الإيمان.',
    },
    topic: 'beliefs',
    concept: 'iman',
    mechanic: 'lantern-match',
    modality: 'hands-on',
    minutes: 4,
    difficulty: 3,
    knowledge: ['k-iman'],
    reward: { kind: 'badge', id: 'six-lights', name: { en: 'Six Lights', ar: 'الأنوار الستة' } },
    kidSafe: true,
  },
];

export const MISSION_BY_ID: Record<string, Mission> = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));
export const MISSION_BY_NUMBER: Record<number, Mission> = Object.fromEntries(MISSIONS.map((m) => [m.number, m]));

/* ─────────────────────────────────────────────────────────────
 * Mechanic data. Kept next to the catalog so writers edit one file.
 * ──────────────────────────────────────────────────────────── */

export type BodyPart = 'heart' | 'hands' | 'mouth' | 'nose' | 'face' | 'arm-r' | 'arm-l' | 'head' | 'ears' | 'foot-r' | 'foot-l';

export interface WuduStep {
  id: BodyPart;
  label: L10n;
  action: L10n;
  /** Required by Qur'an 5:6 (scholarly agreement) vs sunnah. */
  fard: boolean;
  hint: L10n;
}

export const WUDU_STEPS: WuduStep[] = [
  { id: 'heart', fard: false, label: { en: 'Intention', ar: 'النية' }, action: { en: 'Make the intention and say Bismillah', ar: 'انوِ وقل بسم الله' }, hint: { en: 'Wudu begins inside — in the heart — before any water.', ar: 'يبدأ الوضوء من الداخل، من القلب، قبل الماء.' } },
  { id: 'hands', fard: false, label: { en: 'Hands', ar: 'الكفّان' }, action: { en: 'Wash both hands to the wrists', ar: 'اغسل كفيك إلى الرسغين' }, hint: { en: 'Start with the hands you’ll use for everything else.', ar: 'ابدأ باليدين اللتين ستستعملهما في كل ما بعد.' } },
  { id: 'mouth', fard: false, label: { en: 'Mouth', ar: 'الفم' }, action: { en: 'Rinse the mouth', ar: 'تمضمض' }, hint: { en: 'After the hands, water goes to the mouth.', ar: 'بعد الكفين يأتي الفم.' } },
  { id: 'nose', fard: false, label: { en: 'Nose', ar: 'الأنف' }, action: { en: 'Rinse the nose', ar: 'استنشق واستنثر' }, hint: { en: 'Mouth, then nose — both before the face.', ar: 'الفم ثم الأنف، وكلاهما قبل الوجه.' } },
  { id: 'face', fard: true, label: { en: 'Face', ar: 'الوجه' }, action: { en: 'Wash the whole face', ar: 'اغسل وجهك كله' }, hint: { en: 'The first act named in Qur’an 5:6 is the face.', ar: 'أول ما ذُكر في آية الوضوء هو الوجه.' } },
  { id: 'arm-r', fard: true, label: { en: 'Right arm', ar: 'الذراع اليمنى' }, action: { en: 'Wash the right arm to the elbow', ar: 'اغسل يدك اليمنى إلى المرفق' }, hint: { en: 'Arms come next — and the Prophet ﷺ liked to begin with the right.', ar: 'ثم الذراعان، وكان النبي ﷺ يحب البدء باليمين.' } },
  { id: 'arm-l', fard: true, label: { en: 'Left arm', ar: 'الذراع اليسرى' }, action: { en: 'Wash the left arm to the elbow', ar: 'اغسل يدك اليسرى إلى المرفق' }, hint: { en: 'Right arm done — now the left.', ar: 'انتهت اليمنى، الآن اليسرى.' } },
  { id: 'head', fard: true, label: { en: 'Head', ar: 'الرأس' }, action: { en: 'Wipe over the head', ar: 'امسح رأسك' }, hint: { en: 'The head is wiped with wet hands, not washed.', ar: 'الرأس يُمسح باليد المبلولة ولا يُغسل.' } },
  { id: 'ears', fard: false, label: { en: 'Ears', ar: 'الأذنان' }, action: { en: 'Wipe the ears', ar: 'امسح أذنيك' }, hint: { en: 'Ears follow the head.', ar: 'الأذنان تتبعان الرأس.' } },
  { id: 'foot-r', fard: true, label: { en: 'Right foot', ar: 'القدم اليمنى' }, action: { en: 'Wash the right foot to the ankle', ar: 'اغسل قدمك اليمنى إلى الكعب' }, hint: { en: 'Last come the feet — right first.', ar: 'في الأخير القدمان، اليمنى أولًا.' } },
  { id: 'foot-l', fard: true, label: { en: 'Left foot', ar: 'القدم اليسرى' }, action: { en: 'Wash the left foot to the ankle', ar: 'اغسل قدمك اليسرى إلى الكعب' }, hint: { en: 'One step left.', ar: 'بقيت خطوة واحدة.' } },
];

export type SalahPose = 'takbir' | 'qiyam' | 'ruku' | 'itidal' | 'sujud' | 'jalsa' | 'sujud2' | 'tashahhud' | 'tasleem';

export interface SalahStep {
  id: SalahPose;
  label: L10n;
  says: L10n;
  meaning: L10n;
}

export const SALAH_STEPS: SalahStep[] = [
  { id: 'takbir', label: { en: 'Opening takbir', ar: 'تكبيرة الإحرام' }, says: { en: '“Allahu Akbar”', ar: '«الله أكبر»' }, meaning: { en: 'Allah is greater — the world is set aside.', ar: 'الله أكبر من كل شيء، فتُترك الدنيا خلفك.' } },
  { id: 'qiyam', label: { en: 'Standing', ar: 'القيام' }, says: { en: 'Recite al-Fatihah', ar: 'قراءة الفاتحة' }, meaning: { en: 'Standing in respect, speaking to Allah.', ar: 'قيام إجلال ومناجاة لله.' } },
  { id: 'ruku', label: { en: 'Bowing (ruku‘)', ar: 'الركوع' }, says: { en: '“Subhana Rabbiyal ‘Adheem”', ar: '«سبحان ربي العظيم»' }, meaning: { en: 'Bowing in humility.', ar: 'انحناء خضوع وتواضع.' } },
  { id: 'itidal', label: { en: 'Rising', ar: 'الرفع من الركوع' }, says: { en: '“Sami‘ Allahu liman hamidah”', ar: '«سمع الله لمن حمده»' }, meaning: { en: 'Allah hears the one who praises Him.', ar: 'الله يسمع من يحمده.' } },
  { id: 'sujud', label: { en: 'Prostration (sujud)', ar: 'السجود' }, says: { en: '“Subhana Rabbiyal A‘la”', ar: '«سبحان ربي الأعلى»' }, meaning: { en: 'The closest a person is to Allah.', ar: 'أقرب ما يكون العبد من ربه.' } },
  { id: 'jalsa', label: { en: 'Sitting', ar: 'الجلسة بين السجدتين' }, says: { en: '“Rabbighfir li”', ar: '«ربّ اغفر لي»' }, meaning: { en: 'A brief rest between two prostrations.', ar: 'استراحة قصيرة بين السجدتين.' } },
  { id: 'sujud2', label: { en: 'Second prostration', ar: 'السجدة الثانية' }, says: { en: '“Subhana Rabbiyal A‘la”', ar: '«سبحان ربي الأعلى»' }, meaning: { en: 'Every unit has two prostrations.', ar: 'في كل ركعة سجدتان.' } },
  { id: 'tashahhud', label: { en: 'Tashahhud', ar: 'التشهد' }, says: { en: 'The testimony of faith, seated', ar: 'التشهد جالسًا' }, meaning: { en: 'At the end, you sit and bear witness.', ar: 'في الختام تجلس وتشهد.' } },
  { id: 'tasleem', label: { en: 'Salam', ar: 'التسليم' }, says: { en: '“As-salamu ‘alaykum wa rahmatullah”', ar: '«السلام عليكم ورحمة الله»' }, meaning: { en: 'The prayer ends with peace, to the right and left.', ar: 'تُختم الصلاة بالسلام يمينًا وشمالًا.' } },
];

export interface MatchPair {
  id: string;
  term: L10n;
  meaning: L10n;
}

export const MATCH_SETS: Record<string, { intro: L10n; pairs: MatchPair[] }> = {
  'm-words-of-peace': {
    intro: { en: 'Each lantern holds a word people say every day. Light it by finding what it means.', ar: 'كل فانوس يحمل كلمة يقولها الناس كل يوم. أضئه بإيجاد معناها.' },
    pairs: [
      { id: 'salam', term: { en: 'As-salamu alaykum', ar: 'السلام عليكم' }, meaning: { en: 'Peace be upon you', ar: 'تحية بالسلام والأمان' } },
      { id: 'bismillah', term: { en: 'Bismillah', ar: 'بسم الله' }, meaning: { en: 'In the name of Allah — before starting', ar: 'قبل البدء بأي عمل' } },
      { id: 'alhamdulillah', term: { en: 'Alhamdulillah', ar: 'الحمد لله' }, meaning: { en: 'All praise is for Allah — thankfulness', ar: 'للشكر والثناء على الله' } },
      { id: 'inshaallah', term: { en: 'In sha’ Allah', ar: 'إن شاء الله' }, meaning: { en: 'If Allah wills — about the future', ar: 'عند الحديث عن المستقبل' } },
      { id: 'mashaallah', term: { en: 'Masha’ Allah', ar: 'ما شاء الله' }, meaning: { en: 'What Allah has willed — admiring something good', ar: 'عند رؤية شيء حسن' } },
    ],
  },
  'm-pillars': {
    intro: { en: 'Five pillars hold the Learning House. Raise each one by lighting it with its meaning.', ar: 'خمسة أركان تحمل بيت التعلّم. ارفع كل ركن بإضاءته بمعناه.' },
    pairs: [
      { id: 'shahadah', term: { en: 'Shahadah', ar: 'الشهادتان' }, meaning: { en: 'Testifying there is no god but Allah and Muhammad ﷺ is His messenger', ar: 'شهادة أن لا إله إلا الله وأن محمدًا رسول الله' } },
      { id: 'salah', term: { en: 'Salah', ar: 'الصلاة' }, meaning: { en: 'The five daily prayers', ar: 'الصلوات الخمس في اليوم' } },
      { id: 'zakah', term: { en: 'Zakah', ar: 'الزكاة' }, meaning: { en: 'Giving a share of wealth to those in need', ar: 'إخراج جزء من المال للمحتاجين' } },
      { id: 'sawm', term: { en: 'Sawm', ar: 'الصوم' }, meaning: { en: 'Fasting in the month of Ramadan', ar: 'صيام شهر رمضان' } },
      { id: 'hajj', term: { en: 'Hajj', ar: 'الحج' }, meaning: { en: 'Pilgrimage to Makkah, for those able', ar: 'حج البيت لمن استطاع' } },
    ],
  },
  'm-ramadan-moon': {
    intro: { en: 'The caravan is getting ready for Ramadan. Light each lantern with what it means.', ar: 'القافلة تستعد لرمضان. أضئ كل فانوس بمعناه.' },
    pairs: [
      { id: 'suhoor', term: { en: 'Suhoor', ar: 'السحور' }, meaning: { en: 'The meal before dawn', ar: 'وجبة ما قبل الفجر' } },
      { id: 'iftar', term: { en: 'Iftar', ar: 'الإفطار' }, meaning: { en: 'Breaking the fast at sunset', ar: 'الفطر عند المغرب' } },
      { id: 'taqwa', term: { en: 'Taqwa', ar: 'التقوى' }, meaning: { en: 'Mindfulness of Allah — the goal of fasting', ar: 'مراقبة الله، وهي غاية الصيام' } },
      { id: 'qadr', term: { en: 'Laylat al-Qadr', ar: 'ليلة القدر' }, meaning: { en: 'A night better than a thousand months, in the last ten', ar: 'ليلة خير من ألف شهر في العشر الأواخر' } },
      { id: 'qada', term: { en: 'Making up days', ar: 'القضاء' }, meaning: { en: 'What the ill or travelling do for missed fasts', ar: 'ما يفعله المريض والمسافر للأيام الفائتة' } },
    ],
  },
  'm-six-lights': {
    intro: { en: 'Six lamps wait in the observatory. Each is a pillar of faith.', ar: 'ستة مصابيح تنتظر في المرصد، كل منها ركن من أركان الإيمان.' },
    pairs: [
      { id: 'allah', term: { en: 'Belief in Allah', ar: 'الإيمان بالله' }, meaning: { en: 'The One Creator, without partner', ar: 'الخالق الواحد لا شريك له' } },
      { id: 'angels', term: { en: 'The angels', ar: 'الملائكة' }, meaning: { en: 'Created from light, they obey Allah', ar: 'خُلقوا من نور ويطيعون الله' } },
      { id: 'books', term: { en: 'The books', ar: 'الكتب' }, meaning: { en: 'Revealed scriptures, ending with the Qur’an', ar: 'الكتب المنزلة وآخرها القرآن' } },
      { id: 'messengers', term: { en: 'The messengers', ar: 'الرسل' }, meaning: { en: 'Chosen people who brought guidance', ar: 'مصطفَون جاؤوا بالهدى' } },
      { id: 'lastday', term: { en: 'The Last Day', ar: 'اليوم الآخر' }, meaning: { en: 'The Day everyone returns to Allah', ar: 'يوم يرجع الناس جميعًا إلى الله' } },
      { id: 'qadar', term: { en: 'Divine decree', ar: 'القدر' }, meaning: { en: 'Allah’s knowledge and will over all things', ar: 'علم الله ومشيئته في كل شيء' } },
    ],
  },
};

export interface ChoiceNode {
  id: string;
  scene?: L10n;
  speaker?: L10n;
  choices?: { label: L10n; next: string; tone: 'kind' | 'neutral' | 'unkind'; feedback?: L10n }[];
  ending?: { title: L10n; reflection: L10n };
}

export const CHOICE_STORIES: Record<string, { start: string; nodes: Record<string, ChoiceNode> }> = {
  'm-dropped-lunch': {
    start: 'a',
    nodes: {
      a: {
        id: 'a',
        speaker: { en: 'In the garden', ar: 'في الحديقة' },
        scene: {
          en: 'At the garden gate, Idris trips. His lunchbox pops open and his bread rolls into the grass. A few kids nearby start to laugh.',
          ar: 'عند باب الحديقة يتعثر إدريس، فينفتح صندوق غدائه ويتدحرج خبزه في العشب. يبدأ بعض الأطفال بالضحك.',
        },
        choices: [
          { label: { en: 'Kneel down and help him gather it', ar: 'أنحني وأساعده في جمعه' }, next: 'b', tone: 'kind' },
          { label: { en: 'Pretend you didn’t see', ar: 'أتظاهر بأني لم أرَ' }, next: 'c', tone: 'neutral' },
          { label: { en: 'Laugh along with the others', ar: 'أضحك مع الآخرين' }, next: 'd', tone: 'unkind' },
        ],
      },
      b: {
        id: 'b',
        speaker: { en: 'Idris', ar: 'إدريس' },
        scene: {
          en: '“Thanks…” Idris says quietly. The bread is muddy. You still have your own lunch.',
          ar: '«شكرًا…» يقول إدريس بصوت خافت. الخبز متّسخ، وما زال غداؤك معك.',
        },
        choices: [
          { label: { en: 'Share half of your lunch', ar: 'أشاركه نصف غدائي' }, next: 'e', tone: 'kind' },
          { label: { en: 'Smile and walk with him to class', ar: 'أبتسم وأمشي معه إلى الصف' }, next: 'f', tone: 'kind' },
        ],
      },
      c: {
        id: 'c',
        speaker: { en: 'A quiet moment', ar: 'لحظة هادئة' },
        scene: {
          en: 'You walk past. Behind you, Idris is still picking up crumbs alone. It’s not too late to turn around.',
          ar: 'تمضي. خلفك ما زال إدريس يجمع الفتات وحده. لم يفت الأوان لتعود.',
        },
        choices: [
          { label: { en: 'Turn around and help', ar: 'أعود وأساعده' }, next: 'b', tone: 'kind', feedback: { en: 'Turning back takes courage. That counts.', ar: 'العودة تحتاج شجاعة، وهذا له قيمته.' } },
          { label: { en: 'Keep walking', ar: 'أواصل المشي' }, next: 'g', tone: 'neutral' },
        ],
      },
      d: {
        id: 'd',
        speaker: { en: 'A pause', ar: 'وقفة' },
        scene: {
          en: 'The laughter gets louder. Idris’s eyes look wet. You notice how it feels from where he is standing.',
          ar: 'يعلو الضحك. تلمع عينا إدريس. تشعر كيف يبدو الأمر من مكانه.',
        },
        choices: [
          { label: { en: 'Stop laughing and say sorry', ar: 'أتوقف عن الضحك وأعتذر' }, next: 'b', tone: 'kind', feedback: { en: 'Changing course is part of good character.', ar: 'تغيير الطريق جزء من حسن الخلق.' } },
          { label: { en: 'Ask the others to stop', ar: 'أطلب من الآخرين التوقف' }, next: 'f', tone: 'kind' },
        ],
      },
      e: {
        id: 'e',
        ending: {
          title: { en: 'A seedling breaks the soil', ar: 'شتلة تشق التراب' },
          reflection: {
            en: 'You wanted for Idris what you’d want for yourself — a meal and a friend. That is exactly how the Prophet ﷺ described faith.',
            ar: 'أحببت لإدريس ما تحبه لنفسك: طعامًا وصديقًا. هكذا وصف النبي ﷺ الإيمان.',
          },
        },
      },
      f: {
        id: 'f',
        ending: {
          title: { en: 'Two paths become one', ar: 'دربان يصيران دربًا واحدًا' },
          reflection: {
            en: 'A smile and some company changed his whole morning. Even a smile is charity.',
            ar: 'ابتسامة وصحبة غيّرت صباحه كله. وتبسّمك في وجه أخيك صدقة.',
          },
        },
      },
      g: {
        id: 'g',
        ending: {
          title: { en: 'The garden waits', ar: 'الحديقة تنتظر' },
          reflection: {
            en: 'Not every day goes the way we hope. Tomorrow you’ll pass this gate again — and the garden will be ready when you are.',
            ar: 'لا تسير كل الأيام كما نحب. ستمر من هذا الباب غدًا، وستكون الحديقة جاهزة حين تكون أنت جاهزًا.',
          },
        },
      },
    },
  },
  'm-honest-scale': {
    start: 'a',
    nodes: {
      a: {
        id: 'a',
        speaker: { en: 'Aunt Safiya, lantern seller', ar: 'الخالة صفية، بائعة الفوانيس' },
        scene: {
          en: '“Can you watch my stall for a moment?” Aunt Safiya hurries off. A customer picks up a brass lantern — you notice a small crack near its base.',
          ar: '«هل تراقب الكشك لحظة؟» تسرع الخالة صفية. يلتقط زبون فانوسًا نحاسيًا، وتلاحظ شرخًا صغيرًا قرب قاعدته.',
        },
        choices: [
          { label: { en: 'Point out the crack', ar: 'أنبّهه إلى الشرخ' }, next: 'b', tone: 'kind' },
          { label: { en: 'Say nothing — it’s tiny', ar: 'لا أقول شيئًا، إنه صغير' }, next: 'c', tone: 'unkind' },
          { label: { en: 'Turn it so the crack doesn’t show', ar: 'أديره حتى لا يظهر الشرخ' }, next: 'c', tone: 'unkind' },
        ],
      },
      b: {
        id: 'b',
        speaker: { en: 'The customer', ar: 'الزبون' },
        scene: {
          en: '“Thank you for telling me! Is there a better one?” On the scale, you weigh a bag of dates for him too.',
          ar: '«شكرًا لأنك أخبرتني! هل هناك واحد أفضل؟» وتزن له أيضًا كيسًا من التمر على الميزان.',
        },
        choices: [
          { label: { en: 'Weigh carefully, full measure', ar: 'أزن بدقة وأوفي الميزان' }, next: 'd', tone: 'kind' },
          { label: { en: 'Rest a finger on the scale — just a bit', ar: 'أضع إصبعي على الميزان قليلًا' }, next: 'e', tone: 'unkind' },
        ],
      },
      c: {
        id: 'c',
        speaker: { en: 'Aunt Safiya returns', ar: 'تعود الخالة صفية' },
        scene: {
          en: 'The customer finds the crack at home and comes back, upset. Aunt Safiya looks at you, then gently asks what happened.',
          ar: 'يكتشف الزبون الشرخ في بيته ويعود منزعجًا. تنظر إليك الخالة صفية وتسألك بلطف عمّا حدث.',
        },
        choices: [
          { label: { en: 'Tell the truth and apologise', ar: 'أقول الحقيقة وأعتذر' }, next: 'd', tone: 'kind', feedback: { en: 'Owning a mistake is honesty too.', ar: 'الاعتراف بالخطأ صدق أيضًا.' } },
          { label: { en: 'Blame the customer', ar: 'ألوم الزبون' }, next: 'f', tone: 'unkind' },
        ],
      },
      d: {
        id: 'd',
        ending: {
          title: { en: 'The scale stays level', ar: 'يبقى الميزان مستقيمًا' },
          reflection: {
            en: '“Establish the weight with justice.” Aunt Safiya smiles: a stall runs on trust, and today you kept it.',
            ar: '«وأقيموا الوزن بالقسط». تبتسم الخالة صفية: الكشك يقوم على الثقة، واليوم حفظتها.',
          },
        },
      },
      e: {
        id: 'e',
        speaker: { en: 'A second look', ar: 'نظرة ثانية' },
        scene: {
          en: 'The scale tips. It’s only a few dates — but the customer trusted you. You still have time to lift your finger.',
          ar: 'يميل الميزان. إنها بضع تمرات فقط، لكن الزبون وثق بك. ما زال بإمكانك رفع إصبعك.',
        },
        choices: [{ label: { en: 'Lift your finger and weigh again', ar: 'أرفع إصبعي وأعيد الوزن' }, next: 'd', tone: 'kind', feedback: { en: 'Fixing it before anyone noticed — that is integrity.', ar: 'أن تصلحه قبل أن يلاحظ أحد، هذه هي النزاهة.' } }],
      },
      f: {
        id: 'f',
        ending: {
          title: { en: 'A lantern dims', ar: 'فانوس يخفت' },
          reflection: {
            en: 'Trust is hard to rebuild — but it can be. Aunt Safiya says the stall will be open tomorrow, and so will your chance.',
            ar: 'الثقة صعبة البناء من جديد، لكنها ممكنة. تقول الخالة صفية إن الكشك سيفتح غدًا، وكذلك فرصتك.',
          },
        },
      },
    },
  },
};

export interface ClueHunt {
  scene: 'library' | 'desert' | 'mountain';
  intro: L10n;
  clues: { id: string; x: number; y: number; object: L10n; fragment: L10n }[];
  /** Sentence with blanks; each blank expects a clue id. */
  sentence: ({ text: L10n } | { blank: string })[];
  distractors: { id: string; fragment: L10n }[];
}

export const CLUE_HUNTS: Record<string, ClueHunt> = {
  'm-first-word': {
    scene: 'library',
    intro: { en: 'Five pages in the Library of Light are glowing. Find them, then piece the story together.', ar: 'خمس صفحات في مكتبة النور تتوهج. اعثر عليها، ثم ركّب القصة.' },
    clues: [
      { id: 'cave', x: 18, y: 38, object: { en: 'A map of a mountain cave', ar: 'خريطة لغار في جبل' }, fragment: { en: 'in the cave of Hira', ar: 'في غار حراء' } },
      { id: 'month', x: 78, y: 30, object: { en: 'A crescent calendar', ar: 'تقويم الهلال' }, fragment: { en: 'during Ramadan', ar: 'في شهر رمضان' } },
      { id: 'word', x: 50, y: 22, object: { en: 'An open page, one word glowing', ar: 'صفحة مفتوحة تتوهج فيها كلمة' }, fragment: { en: '“Read!”', ar: '«اقرأ»' } },
      { id: 'angel', x: 32, y: 68, object: { en: 'A beam of light across the floor', ar: 'شعاع نور على الأرض' }, fragment: { en: 'the angel Jibril', ar: 'الملك جبريل' } },
      { id: 'prophet', x: 70, y: 70, object: { en: 'A letter sealed with a star', ar: 'رسالة مختومة بنجمة' }, fragment: { en: 'the Prophet Muhammad ﷺ', ar: 'النبي محمد ﷺ' } },
    ],
    sentence: [
      { text: { en: 'The first words revealed were', ar: 'كان أول ما نزل' } },
      { blank: 'word' },
      { text: { en: ', brought by', ar: '، جاء به' } },
      { blank: 'angel' },
      { text: { en: 'to', ar: 'إلى' } },
      { blank: 'prophet' },
      { blank: 'cave' },
      { blank: 'month' },
      { text: { en: '.', ar: '.' } },
    ],
    distractors: [
      { id: 'x-madinah', fragment: { en: 'in Madinah', ar: 'في المدينة' } },
      { id: 'x-write', fragment: { en: '“Write!”', ar: '«اكتب»' } },
    ],
  },
  'm-caravan-stars': {
    scene: 'desert',
    intro: { en: 'A caravan passed here long ago. Its clues are still glowing in the sand.', ar: 'مرّت قافلة من هنا منذ زمن، وما زالت أدلتها تتوهج في الرمال.' },
    clues: [
      { id: 'from', x: 16, y: 58, object: { en: 'A key to an old Makkan house', ar: 'مفتاح بيت قديم في مكة' }, fragment: { en: 'from Makkah', ar: 'من مكة' } },
      { id: 'to', x: 82, y: 54, object: { en: 'Palm trees on the horizon', ar: 'نخيل في الأفق' }, fragment: { en: 'to Madinah', ar: 'إلى المدينة' } },
      { id: 'companion', x: 44, y: 70, object: { en: 'Two sets of footprints', ar: 'أثر قدمين اثنين' }, fragment: { en: 'with Abu Bakr', ar: 'مع أبي بكر' } },
      { id: 'cave', x: 60, y: 30, object: { en: 'A cave with a web across it', ar: 'غار عليه نسيج' }, fragment: { en: 'sheltering in a cave on the way', ar: 'واختبآ في غار في الطريق' } },
      { id: 'calendar', x: 30, y: 26, object: { en: 'A calendar starting at year one', ar: 'تقويم يبدأ بالسنة الأولى' }, fragment: { en: 'the Hijri calendar', ar: 'التقويم الهجري' } },
    ],
    sentence: [
      { text: { en: 'The Prophet ﷺ migrated', ar: 'هاجر النبي ﷺ' } },
      { blank: 'from' },
      { blank: 'to' },
      { blank: 'companion' },
      { text: { en: ',', ar: '،' } },
      { blank: 'cave' },
      { text: { en: '— and', ar: '— ومنها يبدأ' } },
      { blank: 'calendar' },
      { text: { en: 'counts its years from it.', ar: '.' } },
    ],
    distractors: [
      { id: 'x-jerusalem', fragment: { en: 'to Jerusalem', ar: 'إلى القدس' } },
      { id: 'x-alone', fragment: { en: 'completely alone', ar: 'وحده تمامًا' } },
    ],
  },
  'm-summit-names': {
    scene: 'mountain',
    intro: { en: 'The observatory keeps clues about how Allah describes Himself in the Qur’an.', ar: 'يحفظ المرصد أدلة على كيف وصف الله نفسه في القرآن.' },
    clues: [
      { id: 'best', x: 24, y: 32, object: { en: 'A star chart titled “al-Husna”', ar: 'خريطة نجوم بعنوان «الحسنى»' }, fragment: { en: 'the best names', ar: 'الأسماء الحسنى' } },
      { id: 'invoke', x: 72, y: 26, object: { en: 'Hands raised in a drawing', ar: 'رسم ليدين مرفوعتين' }, fragment: { en: 'to call on Him by them', ar: 'أن ندعوه بها' } },
      { id: 'rahman', x: 50, y: 58, object: { en: 'The first line of every surah', ar: 'أول سطر في كل سورة' }, fragment: { en: 'Ar-Rahman, Ar-Rahim', ar: 'الرحمن الرحيم' } },
      { id: 'mercy', x: 18, y: 70, object: { en: 'A lamp that warms the whole room', ar: 'مصباح يدفئ الغرفة كلها' }, fragment: { en: 'Most Merciful', ar: 'الرحمة الواسعة' } },
      { id: 'ref', x: 82, y: 66, object: { en: 'A bookmark at Surah al-A‘raf', ar: 'علامة عند سورة الأعراف' }, fragment: { en: 'Qur’an 7:180', ar: 'الأعراف ١٨٠' } },
    ],
    sentence: [
      { text: { en: 'To Allah belong', ar: 'لله' } },
      { blank: 'best' },
      { text: { en: ', and we are taught', ar: '، وتعلّمنا' } },
      { blank: 'invoke' },
      { text: { en: '(', ar: '(' } },
      { blank: 'ref' },
      { text: { en: '). Every surah but one opens with', ar: '). وتبدأ السور إلا واحدة بـ' } },
      { blank: 'rahman' },
      { text: { en: '— names of', ar: '— أسماء' } },
      { blank: 'mercy' },
      { text: { en: '.', ar: '.' } },
    ],
    distractors: [
      { id: 'x-hundred', fragment: { en: 'exactly one hundred names', ar: 'مئة اسم بالضبط' } },
      { id: 'x-secret', fragment: { en: 'secret names no one may say', ar: 'أسماء سرية لا تُقال' } },
    ],
  },
};

export const REFLECTION_PROMPTS: Record<string, { breaths: number; prompt: L10n; slots: L10n[] }> = {
  'm-evening-stillness': {
    breaths: 3,
    prompt: { en: 'What are three gifts from today — even small ones?', ar: 'ما ثلاث نِعم من يومك، ولو كانت صغيرة؟' },
    slots: [
      { en: 'Something I saw…', ar: 'شيء رأيته…' },
      { en: 'Someone who helped me…', ar: 'شخص ساعدني…' },
      { en: 'Something I can do…', ar: 'شيء أستطيع فعله…' },
    ],
  },
};

/** Narrated alternative explanations, used when the adaptive engine switches to `story`. */
export const CONCEPT_STORIES: Record<string, L10n[]> = {
  'wudu-order': [
    { en: 'Yusuf’s grandfather always did wudu slowly by the courtyard fountain. “Watch the water,” he said. “It travels like a guest through a house.”', ar: 'كان جد يوسف يتوضأ دائمًا ببطء عند نافورة الساحة. قال: «راقب الماء، إنه يمر كضيف في بيت».' },
    { en: '“First the heart decides why we’re here. Then the guest greets the hands at the door, visits the mouth and the nose, and then the face — the first thing Allah names in the verse.”', ar: '«أولًا يقرر القلب لماذا نحن هنا. ثم يسلّم الضيف على اليدين عند الباب، ويزور الفم والأنف، ثم الوجه — أول ما ذكره الله في الآية».' },
    { en: '“Then the arms, right before left, all the way to the elbows. A gentle wipe over the head, and the ears after it.”', ar: '«ثم الذراعان، اليمنى قبل اليسرى، إلى المرفقين. ثم مسح لطيف على الرأس، والأذنان بعده».' },
    { en: '“And the guest leaves through the feet — right, then left — to the ankles. Now,” he smiled, “we are ready to stand before Allah.”', ar: '«ويخرج الضيف من القدمين، اليمنى ثم اليسرى، إلى الكعبين. والآن» ابتسم، «نحن مستعدون للوقوف بين يدي الله».' },
  ],
  'salah-order': [
    { en: 'Mariam thought of each prayer as a short walk up a hill. At the bottom she raised her hands: “Allahu Akbar” — everything else could wait.', ar: 'كانت مريم تتخيل كل صلاة نزهة قصيرة إلى تلّ. في أسفله رفعت يديها: «الله أكبر» — كل شيء آخر يمكنه الانتظار.' },
    { en: 'She stood and recited al-Fatihah, then bowed, like a tree bending in the wind, and rose up again.', ar: 'وقفت وقرأت الفاتحة، ثم ركعت كشجرة تنحني للريح، ثم رفعت.' },
    { en: 'At the top of the hill she lowered herself into sujud — the closest place — sat for a breath, and bowed down once more.', ar: 'عند قمة التل سجدت، أقرب مكان، ثم جلست لحظة، ثم سجدت مرة أخرى.' },
    { en: 'At the end she sat, bore witness in the tashahhud, and turned her face right and left with “As-salamu alaykum”. The walk was over; the calm stayed.', ar: 'وفي الختام جلست وتشهدت، ثم التفتت يمينًا وشمالًا بالسلام. انتهت النزهة وبقيت السكينة.' },
  ],
  'everyday-phrases': [
    { en: 'In the village, Amina starts her bike ride with “Bismillah”.', ar: 'في القرية تبدأ أمينة ركوب دراجتها بـ«بسم الله».' },
    { en: 'She meets her neighbour — “As-salamu alaykum!” — and admires his new garden: “Masha’ Allah!”', ar: 'تلتقي جارها: «السلام عليكم!» وتُعجب بحديقته الجديدة: «ما شاء الله!»' },
    { en: 'He asks if she’ll come to the circle tomorrow. “In sha’ Allah,” she says.', ar: 'يسألها إن كانت ستأتي إلى الحلقة غدًا. تقول: «إن شاء الله».' },
    { en: 'Home safely, she smiles: “Alhamdulillah.”', ar: 'وحين تصل إلى البيت سالمة تبتسم: «الحمد لله».' },
  ],
  'five-pillars': [
    { en: 'Imagine building a house. First you stand on firm ground: the shahadah — belief in one God and His messenger ﷺ.', ar: 'تخيّل أنك تبني بيتًا. أولًا تقف على أرض ثابتة: الشهادتان.' },
    { en: 'Then you raise pillars you visit often: salah, five times a day.', ar: 'ثم ترفع أعمدة تزورها كثيرًا: الصلاة خمس مرات في اليوم.' },
    { en: 'One pillar opens the door to neighbours in need: zakah. One strengthens you from within each year: fasting Ramadan.', ar: 'عمود يفتح الباب للجار المحتاج: الزكاة. وعمود يقوّيك من الداخل كل عام: صوم رمضان.' },
    { en: 'And one is a journey of a lifetime, for those able: hajj. Five pillars — one house.', ar: 'وعمود رحلة العمر لمن استطاع: الحج. خمسة أعمدة، بيت واحد.' },
  ],
};

export function missionsAt(location: string): Mission[] {
  return MISSIONS.filter((m) => m.location === location && !m.adaptive);
}
