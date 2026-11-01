import type { AgeBand, L10n, Locale } from '@/domain/types';

/**
 * DEMO community data. Circles, mentors and members below are fictional sample
 * profiles used to show how circles work; the UI labels them as samples.
 */

export type MemberRole = 'member' | 'mentor' | 'scholar' | 'you';

export interface Member {
  id: string;
  name: string;
  role: MemberRole;
  look: { skin: number; hair: 'short' | 'curly' | 'long' | 'hijab' | 'kufi' | 'wrap'; hairColor: number; outfit: 'thobe' | 'abaya' | 'tunic' | 'hoodie' | 'jubba'; outfitColor: number; accessory: 'none' | 'glasses' | 'scarf' | 'satchel' | 'lantern' };
}

export interface Circle {
  id: string;
  name: L10n;
  tagline: L10n;
  ageBand: AgeBand;
  ageLabel: L10n;
  languages: Locale[];
  path: L10n;
  moderated: boolean;
  mentorId: string;
  memberIds: string[];
  weeklyGoal: { label: L10n; target: number; current: number };
  pinned: L10n;
  challenge: { title: L10n; missionId: string; joined: number };
  resources: { title: L10n; knowledgeId: string }[];
}

export interface ChatMessage {
  id: string;
  circleId: string;
  authorId: string;
  text: string;
  at: number;
  replyTo?: string;
  reactions: Record<string, string[]>; // reaction key → member ids
  status?: 'sent' | 'held' | 'removed';
  pinned?: boolean;
}

export const MEMBERS: Record<string, Member> = {
  mariam: { id: 'mariam', name: 'Ustadha Mariam', role: 'mentor', look: { skin: 3, hair: 'hijab', hairColor: 1, outfit: 'abaya', outfitColor: 2, accessory: 'glasses' } },
  daniel: { id: 'daniel', name: 'Daniel', role: 'mentor', look: { skin: 0, hair: 'short', hairColor: 3, outfit: 'hoodie', outfitColor: 0, accessory: 'none' } },
  hamza: { id: 'hamza', name: 'Ustadh Hamza', role: 'mentor', look: { skin: 4, hair: 'kufi', hairColor: 0, outfit: 'jubba', outfitColor: 1, accessory: 'none' } },
  amina: { id: 'amina', name: 'Amina', role: 'member', look: { skin: 2, hair: 'hijab', hairColor: 0, outfit: 'tunic', outfitColor: 3, accessory: 'satchel' } },
  yusuf: { id: 'yusuf', name: 'Yusuf', role: 'member', look: { skin: 1, hair: 'curly', hairColor: 0, outfit: 'thobe', outfitColor: 0, accessory: 'none' } },
  zara: { id: 'zara', name: 'Zara', role: 'member', look: { skin: 5, hair: 'wrap', hairColor: 0, outfit: 'tunic', outfitColor: 4, accessory: 'none' } },
  ilyas: { id: 'ilyas', name: 'Ilyas', role: 'member', look: { skin: 3, hair: 'short', hairColor: 0, outfit: 'hoodie', outfitColor: 2, accessory: 'glasses' } },
  noor: { id: 'noor', name: 'Noor', role: 'member', look: { skin: 1, hair: 'long', hairColor: 2, outfit: 'tunic', outfitColor: 1, accessory: 'scarf' } },
  sam: { id: 'sam', name: 'Sam', role: 'member', look: { skin: 0, hair: 'short', hairColor: 2, outfit: 'hoodie', outfitColor: 4, accessory: 'none' } },
  aisha: { id: 'aisha', name: 'Aisha', role: 'member', look: { skin: 4, hair: 'hijab', hairColor: 0, outfit: 'abaya', outfitColor: 0, accessory: 'none' } },
  khalid: { id: 'khalid', name: 'خالد', role: 'member', look: { skin: 2, hair: 'kufi', hairColor: 0, outfit: 'thobe', outfitColor: 0, accessory: 'none' } },
  layan: { id: 'layan', name: 'ليان', role: 'member', look: { skin: 2, hair: 'hijab', hairColor: 0, outfit: 'tunic', outfitColor: 2, accessory: 'satchel' } },
};

export const CIRCLES: Circle[] = [
  {
    id: 'garden',
    name: { en: 'Garden Circle', ar: 'حلقة الحديقة' },
    tagline: { en: 'First steps in wudu, prayer and kindness', ar: 'خطوات أولى في الوضوء والصلاة واللطف' },
    ageBand: 'child',
    ageLabel: { en: 'Ages 9–12', ar: 'من ٩ إلى ١٢ سنة' },
    languages: ['en', 'ar'],
    path: { en: 'First Light', ar: 'النور الأول' },
    moderated: true,
    mentorId: 'mariam',
    memberIds: ['mariam', 'amina', 'yusuf', 'zara', 'ilyas'],
    weeklyGoal: { label: { en: 'Lanterns lit together this week', ar: 'فوانيس أضأناها معًا هذا الأسبوع' }, target: 150, current: 128 },
    pinned: { en: 'Who finished the wudu mission? 🌿 Share one thing you learned.', ar: 'من أنهى مهمة الوضوء؟ 🌿 شاركنا شيئًا تعلمته.' },
    challenge: { title: { en: 'Everyone completes The Water Path', ar: 'الجميع يُكمل درب الماء' }, missionId: 'm-water-path', joined: 4 },
    resources: [
      { title: { en: 'How is wudu performed?', ar: 'كيف يكون الوضوء؟' }, knowledgeId: 'k-wudu' },
      { title: { en: 'Why do we pray five times?', ar: 'لماذا نصلي خمس مرات؟' }, knowledgeId: 'k-five-prayers' },
    ],
  },
  {
    id: 'first-steps',
    name: { en: 'First Steps Circle', ar: 'حلقة الخطوات الأولى' },
    tagline: { en: 'For new Muslims — no question is too small', ar: 'للمسلمين الجدد — لا سؤال صغير هنا' },
    ageBand: 'adult',
    ageLabel: { en: 'Adults', ar: 'للبالغين' },
    languages: ['en'],
    path: { en: 'New to Islam', ar: 'جديد في الإسلام' },
    moderated: true,
    mentorId: 'daniel',
    memberIds: ['daniel', 'sam', 'aisha', 'noor'],
    weeklyGoal: { label: { en: 'Missions completed together', ar: 'مهام أنجزناها معًا' }, target: 12, current: 9 },
    pinned: { en: 'This week: learning the prayer, one movement at a time. Go at your own pace.', ar: 'هذا الأسبوع: تعلّم الصلاة حركة بعد حركة، على راحتك.' },
    challenge: { title: { en: 'Walk the prayer path together', ar: 'نمشي درب الصلاة معًا' }, missionId: 'm-five-pauses', joined: 3 },
    resources: [
      { title: { en: 'What happens in one unit of prayer?', ar: 'ماذا يحدث في الركعة؟' }, knowledgeId: 'k-salah-steps' },
      { title: { en: 'What if I can’t do everything today?', ar: 'ماذا لو لم أستطع فعل كل شيء؟' }, knowledgeId: 'k-capacity' },
    ],
  },
  {
    id: 'open-questions',
    name: { en: 'Open Questions', ar: 'أسئلة مفتوحة' },
    tagline: { en: 'Curious about Islam? Ask, listen, explore', ar: 'فضولي عن الإسلام؟ اسأل واستمع واستكشف' },
    ageBand: 'adult',
    ageLabel: { en: 'Adults', ar: 'للبالغين' },
    languages: ['en'],
    path: { en: 'Exploring', ar: 'استكشاف' },
    moderated: true,
    mentorId: 'hamza',
    memberIds: ['hamza', 'sam', 'noor'],
    weeklyGoal: { label: { en: 'Questions explored together', ar: 'أسئلة استكشفناها معًا' }, target: 10, current: 6 },
    pinned: { en: 'Respectful curiosity welcome. For personal rulings, use Ask a Scholar.', ar: 'الفضول المحترم مرحب به. للأحكام الشخصية استخدم «اسأل عالمًا».' },
    challenge: { title: { en: 'Discover how the Qur’an began', ar: 'اكتشف كيف بدأ نزول القرآن' }, missionId: 'm-first-word', joined: 2 },
    resources: [{ title: { en: 'The first words revealed', ar: 'أول ما نزل' }, knowledgeId: 'k-first-revelation' }],
  },
  {
    id: 'nour-teens',
    name: { en: 'Nour Circle', ar: 'حلقة النور' },
    tagline: { en: 'Arabic-speaking teens learning together', ar: 'شباب يتعلمون معًا بالعربية' },
    ageBand: 'teen',
    ageLabel: { en: 'Ages 13–17', ar: 'من ١٣ إلى ١٧ سنة' },
    languages: ['ar'],
    path: { en: 'Pillars and Paths', ar: 'أركان ودروب' },
    moderated: true,
    mentorId: 'hamza',
    memberIds: ['hamza', 'khalid', 'layan'],
    weeklyGoal: { label: { en: 'Pages of Qur’an read together', ar: 'صفحات قرأناها معًا' }, target: 60, current: 41 },
    pinned: { en: 'Challenge: one page a day, together.', ar: 'تحدي الأسبوع: صفحة يوميًا، معًا.' },
    challenge: { title: { en: 'Pillars of the House', ar: 'أركان البيت' }, missionId: 'm-pillars', joined: 5 },
    resources: [{ title: { en: 'The five pillars', ar: 'أركان الإسلام' }, knowledgeId: 'k-pillars' }],
  },
];

const H = 3_600_000;
export function seedMessages(now = Date.now()): ChatMessage[] {
  return [
    { id: 'g1', circleId: 'garden', authorId: 'mariam', text: 'As-salamu alaykum everyone! Who finished the wudu mission? 🌿 Share one thing you learned.', at: now - 26 * H, reactions: { heart: ['amina', 'yusuf', 'zara'] }, pinned: true },
    { id: 'g2', circleId: 'garden', authorId: 'amina', text: 'We start with the right side!', at: now - 25 * H, reactions: { mashaallah: ['mariam', 'zara'] } },
    { id: 'g3', circleId: 'garden', authorId: 'yusuf', text: 'MashaAllah, me too. I didn’t know the head is wiped and not washed', at: now - 24.5 * H, replyTo: 'g2', reactions: { helpful: ['mariam'] } },
    { id: 'g4', circleId: 'garden', authorId: 'zara', text: 'Has anyone done Mission 5? The library one looks so cool', at: now - 3 * H, reactions: {} },
    { id: 'g5', circleId: 'garden', authorId: 'mariam', text: 'Mission 5 opens after a couple more missions, Zara — keep going, you’re close!', at: now - 2.6 * H, replyTo: 'g4', reactions: { keepgoing: ['zara', 'ilyas'] } },
    { id: 'f1', circleId: 'first-steps', authorId: 'daniel', text: 'Welcome, everyone. This week we’re learning the prayer one movement at a time. No rush.', at: now - 40 * H, reactions: { heart: ['sam', 'aisha'] }, pinned: true },
    { id: 'f2', circleId: 'first-steps', authorId: 'sam', text: 'I keep mixing up what comes after ruku. Mission 4 helped a lot though.', at: now - 20 * H, reactions: { proud: ['daniel'] } },
    { id: 'f3', circleId: 'first-steps', authorId: 'aisha', text: 'Same! The “walk slowly through each room” example made it click for me.', at: now - 19 * H, replyTo: 'f2', reactions: {} },
    { id: 'o1', circleId: 'open-questions', authorId: 'hamza', text: 'Welcome! Ask anything you’re curious about. I’ll share sources where I can.', at: now - 50 * H, reactions: {}, pinned: true },
    { id: 'o2', circleId: 'open-questions', authorId: 'noor', text: 'Why does Ramadan move every year?', at: now - 8 * H, reactions: { helpful: ['sam'] } },
    { id: 'o3', circleId: 'open-questions', authorId: 'hamza', text: 'Because Islamic months follow the moon — about 11 days shorter than the solar year. The Desert Caravan missions cover it.', at: now - 7.5 * H, replyTo: 'o2', reactions: { helpful: ['noor', 'sam'] } },
    { id: 'n1', circleId: 'nour-teens', authorId: 'hamza', text: 'السلام عليكم يا شباب! تحدي الأسبوع: صفحة من القرآن يوميًا.', at: now - 30 * H, reactions: { heart: ['khalid', 'layan'] }, pinned: true },
    { id: 'n2', circleId: 'nour-teens', authorId: 'layan', text: 'أنهيت المهمة ٦ اليوم، الحمد لله', at: now - 5 * H, reactions: { mashaallah: ['khalid', 'hamza'] } },
  ];
}

export const REACTIONS: { key: string; emoji: string; label: L10n }[] = [
  { key: 'heart', emoji: '🤍', label: { en: 'Love this', ar: 'أحببته' } },
  { key: 'mashaallah', emoji: '✨', label: { en: 'MashaAllah', ar: 'ما شاء الله' } },
  { key: 'helpful', emoji: '💡', label: { en: 'Helpful', ar: 'مفيد' } },
  { key: 'keepgoing', emoji: '🌿', label: { en: 'Keep going', ar: 'واصل' } },
  { key: 'proud', emoji: '⭐', label: { en: 'Proud of you', ar: 'فخور بك' } },
];
