/**
 * Quest: Words of Peace
 * NPC: Amina (village)
 * Mission: m-words-of-peace (lantern-match mechanic)
 *
 * Amina asks the learner to help her understand why the village lanterns are dark.
 * The learner discovers three clues about everyday phrases, then plays the
 * Words of Peace mission to light them all.
 *
 * Religious content: only phrases from established everyday Islamic use.
 * No Quranic verses or Hadith are invented or paraphrased here.
 */
import type { QuestDef } from '../types';

export const WORDS_OF_PEACE_QUEST: QuestDef = {
  id: 'q-words-of-peace',
  missionId: 'm-words-of-peace',
  npcId: 'amina',
  title: { en: 'Words of Peace', ar: 'كلمات السلام' },
  description: {
    en: 'Amina needs your help. The village lanterns have gone dark — and the only way to light them is to learn the words that connect people.',
    ar: 'أمينة تحتاج مساعدتك. انطفأت فوانيس القرية وسبيل إضاءتها هو تعلم الكلمات التي تجمع الناس.',
  },
  hook: {
    en: 'As-salamu alaykum! The lanterns are waiting…',
    ar: 'السلام عليكم! الفوانيس تنتظر…',
  },

  /* ── Dialogue tree ──────────────────────────────────── */
  dialogueStart: 'd-greet',
  dialogue: {
    'd-greet': {
      id: 'd-greet',
      speaker: 'npc',
      text: {
        en: 'As-salamu alaykum! Oh good, you\'re here. Do you see the lanterns? Every single one has gone dark.',
        ar: 'السلام عليكم! أهلًا بك. هل ترى الفوانيس؟ لقد انطفأت جميعها.',
      },
      choices: [
        {
          label: { en: 'Why did they go dark?', ar: 'لماذا انطفأت؟' },
          next: 'd-why',
          tone: 'curious',
        },
        {
          label: { en: 'Wa alaykum as-salam! How can I help?', ar: 'وعليكم السلام! كيف أساعد؟' },
          next: 'd-help',
          tone: 'warm',
        },
      ],
    },
    'd-why': {
      id: 'd-why',
      speaker: 'npc',
      text: {
        en: 'Each lantern holds a word — a greeting, a blessing, a hope. When people forget the words, the lanterns forget how to glow.',
        ar: 'كل فانوس يحمل كلمة — تحية أو بركة أو أمل. حين ينسى الناس الكلمات، تنسى الفوانيس كيف تضيء.',
      },
      next: 'd-ask',
    },
    'd-help': {
      id: 'd-help',
      speaker: 'npc',
      text: {
        en: 'What a kind heart! I knew you\'d want to help. These words carry so much warmth — let me show you.',
        ar: 'يا لطيب قلبك! كنت أعلم أنك ستريد المساعدة. هذه الكلمات تحمل دفئًا كبيرًا — دعني أريك.',
      },
      next: 'd-ask',
    },
    'd-ask': {
      id: 'd-ask',
      speaker: 'npc',
      text: {
        en: 'I\'ve hidden three little notes around the village — small clues about what these words mean. Find them, then come back and we\'ll light every lantern together.',
        ar: 'لقد أخفيت ثلاث مذكرات صغيرة في أرجاء القرية — أدلة عن معاني هذه الكلمات. اعثر عليها، ثم عُد وسنضيء كل فانوس معًا.',
      },
      questOffer: true,
    },
  },

  /* ── Three discoverable clues ──────────────────────── */
  clues: [
    {
      id: 'clue-salam',
      scene: 'village',
      object: { en: 'A folded note near the fountain', ar: 'مذكرة مطوية قرب النافورة' },
      fragment: {
        en: '“As-salamu alaykum” — peace be upon you. It’s how Muslims greet one another.',
        ar: '«السلام عليكم» — أي: السلامُ عليكم ورحمةُ الله. هكذا يُحيّي المسلمون بعضُهم بعضًا.',
      },
      position: { x: 30, y: 55 },
    },
    {
      id: 'clue-bismillah',
      scene: 'village',
      object: { en: 'A small scroll on the doorstep', ar: 'لفافة صغيرة على العتبة' },
      fragment: {
        en: '"Bismillah" — in the name of Allah. Said before starting anything important.',
        ar: '«بسم الله» — باسم الله. تُقال قبل البدء بأي عمل مهم.',
      },
      position: { x: 65, y: 40 },
    },
    {
      id: 'clue-alhamdulillah',
      scene: 'village',
      object: { en: 'A lantern with a paper tucked inside', ar: 'فانوس بداخله ورقة مطوية' },
      fragment: {
        en: '"Alhamdulillah" — all praise is for Allah. A word of gratitude for every good thing.',
        ar: '«الحمد لله» — الحمد كله لله. كلمة شكر على كل خير.',
      },
      position: { x: 80, y: 65 },
    },
  ],

  /* ── Objectives ────────────────────────────────────── */
  objectives: [
    {
      id: 'obj-find-salam',
      label: { en: 'Find the note about As-salamu alaykum', ar: 'ابحث عن مذكرة السلام عليكم' },
      kind: { type: 'discover-clue', clueId: 'clue-salam' },
    },
    {
      id: 'obj-find-bismillah',
      label: { en: 'Find the scroll about Bismillah', ar: 'ابحث عن لفافة البسملة' },
      kind: { type: 'discover-clue', clueId: 'clue-bismillah' },
    },
    {
      id: 'obj-find-alhamdulillah',
      label: { en: 'Find the lantern note about Alhamdulillah', ar: 'ابحث عن ورقة الحمد لله' },
      kind: { type: 'discover-clue', clueId: 'clue-alhamdulillah' },
    },
    {
      id: 'obj-light-lanterns',
      label: { en: 'Light all five village lanterns with Amina', ar: 'أضئ فوانيس القرية الخمسة مع أمينة' },
      kind: { type: 'complete-mission', missionId: 'm-words-of-peace' },
    },
  ],

  offerText: {
    en: 'Accept Amina’s quest and help light the village lanterns?',
    ar: 'هل تقبل مهمة أمينة وتساعد في إضاءة فوانيس القرية؟',
  },

  journalEntry: {
    en: 'Amina asked me to find three hidden notes and discover the words that light the lanterns. Once I know what the words mean, we\'ll light them together.',
    ar: 'طلبت مني أمينة أن أجد ثلاث مذكرات مخفية وأتعلم الكلمات التي تضيء الفوانيس. بمجرد أن أعرف معانيها، سنضيئها معًا.',
  },

  hints: [
    {
      en: 'Look for something glowing near the fountain — notes hide in unexpected places.',
      ar: 'ابحث عن شيء يتوهج قرب النافورة — المذكرات تختبئ في أماكن غير متوقعة.',
    },
    {
      en: 'Check doorsteps and quiet corners — Amina left clues where people pass by each day.',
      ar: 'تفقد العتبات والزوايا الهادئة — أمينة تركت الأدلة في الأماكن التي يمر بها الناس يوميًا.',
    },
    {
      en: 'One clue is hidden inside a lantern itself. Maybe the lanterns know their own secret.',
      ar: 'أحد الأدلة مخفي داخل فانوس بعينه. ربما تعرف الفوانيس سرها الخاص.',
    },
    {
      en: 'Once you have all three clues, return to Amina — she’ll show you how to light them all at once.',
      ar: 'حين تجمع الأدلة الثلاثة، عُد إلى أمينة — ستريك كيف تضيئها جميعًا دفعة واحدة.',
    },
  ],

  completionEvent: 'quest:words-of-peace:complete',

  reward: {
    knowledgeIds: ['k-phrases', 'k-salam'],
    fanfare: {
      en: 'The village lanterns glow again. You know the words of peace.',
      ar: 'عادت فوانيس القرية تضيء. أنت تعرف الآن كلمات السلام.',
    },
  },
};
