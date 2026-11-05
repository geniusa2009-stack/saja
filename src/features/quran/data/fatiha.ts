import type { QuranSurah, VocabChallenge, AyahBuilderPuzzle } from '../types';

export const SURAH_AL_FATIHA: QuranSurah = {
  id: 'al-fatiha',
  number: 1,
  name: {
    en: 'Al-Fatihah',
    ar: 'الفَاتِحَة',
  },
  titleMeaning: {
    en: 'The Opening',
    ar: 'فاتحة الكتاب وأم القرآن',
  },
  revelationPlace: 'makkah',
  ayahsCount: 7,
  orderInMushaf: 1,
  description: {
    en: 'The greatest Surah in the Qur’an, recited in every prayer unit. A dialogue of praise, worship, and humble supplication for guidance.',
    ar: 'أعظم سورة في كتاب الله، تُتلى في كل ركعة، وهي مناجاة بين العبد وربه تفيض بالحمد والعبودية وطلب الهداية إلى الصراط المستقيم.',
  },
  sources: {
    mushaf: 'King Fahd Complex for the Printing of the Holy Quran (Madinah Mushaf, Hafs ‘an ‘Asim standard). Tanzil.net verified corpus.',
    translation: 'Saheeh International (widely attested contemporary English translation).',
    tafsir: 'Tafsir al-Muyassar (King Fahd Complex) and Al-Tafsir al-Mukhtasar.',
    verificationNotice: 'Standard Uthmani calligraphy with full diacritics. Religious review status: draft · Awaiting verified scholar board seal.',
  },
  reviewStatus: 'draft',
  ayahs: [
    {
      number: 1,
      surahNumber: 1,
      arabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
      transliteration: 'Bismillāhir-Raḥmānir-Raḥīm',
      translation: {
        en: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
        ar: 'أبدأ قراءتي مستعينًا باسم الله وحده، الرحمن بجميع خلقه، الرحيم بالمؤمنين.',
      },
      tafsir: {
        en: 'The believer begins every noble matter in the name of Allah, seeking His blessing, remembering that His mercy encompasses all creation.',
        ar: 'يبدأ القارئ باسم الله مستعينًا به ومتبركًا بذكره. و«الله» علم على الرب تبارك وتعالى، و«الرحمن» ذو الرحمة الشاملة لجميع الخلائق، و«الرحيم» ذو الرحمة الخاصة بالمؤمنين.',
      },
      reflectionTheme: {
        en: 'Beginning with Divine Grace & Mercy',
        ar: 'البدء بنعمة الله ورحمته الشاملة',
      },
      words: [
        {
          id: '1:1:1',
          arabic: 'بِسْمِ',
          transliteration: 'Bismi',
          translation: { en: 'In [the] name', ar: 'بِاسْمِ' },
          root: 'س م و',
          grammar: { en: 'Preposition + Noun', ar: 'جار ومجرور' },
        },
        {
          id: '1:1:2',
          arabic: 'ٱللَّهِ',
          transliteration: 'Allāh',
          translation: { en: 'of Allah', ar: 'لفظ الجلالة' },
          root: 'أ ل ه',
          grammar: { en: 'Proper Noun (Genitive)', ar: 'مضاف إليه مجرور' },
        },
        {
          id: '1:1:3',
          arabic: 'ٱلرَّحْمَٰنِ',
          transliteration: 'ar-Raḥmān',
          translation: { en: 'the Entirely Merciful', ar: 'الواسع الرحمة' },
          root: 'ر ح م',
          grammar: { en: 'Adjective / Divine Name', ar: 'نعت مجرور' },
        },
        {
          id: '1:1:4',
          arabic: 'ٱلرَّحِيمِ',
          transliteration: 'ar-Raḥīm',
          translation: { en: 'the Especially Merciful', ar: 'الدائم الإحسان' },
          root: 'ر ح م',
          grammar: { en: 'Adjective / Divine Name', ar: 'نعت ثانٍ مجرور' },
        },
      ],
    },
    {
      number: 2,
      surahNumber: 1,
      arabic: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ',
      transliteration: 'Al-ḥamdu lillāhi Rabbil-‘ālamīn',
      translation: {
        en: '[All] praise is [due] to Allah, Lord of the worlds -',
        ar: 'الثناء الكامل والمحبة الخالصة لله وحده، مالك جميع الخلائق ومربيهم بنعمه.',
      },
      tafsir: {
        en: 'All gratitude, veneration, and praise belong to Allah alone, who sustains, nurtures, and guides every realm of existence.',
        ar: '«الحمد» هو الثناء على الله بصفات كماله وبنعمه الظاهرة والباطنة. و«الرب» هو المربي خلقه بنعمه والمالك المدبر لشؤونهم، و«العالمين» جمع عالَم، وهو كل ما سوى الله.',
      },
      reflectionTheme: {
        en: 'Gratitude as the Soul’s Foundation',
        ar: 'الحمد والشكر أساس حياة القلب',
      },
      words: [
        {
          id: '1:2:1',
          arabic: 'ٱلْحَمْدُ',
          transliteration: 'al-Ḥamdu',
          translation: { en: '[All] praise', ar: 'الثَّنَاءُ التَّامُّ' },
          root: 'ح م د',
          grammar: { en: 'Definite Noun (Nominative)', ar: 'مبتدأ مرفوع' },
        },
        {
          id: '1:2:2',
          arabic: 'لِلَّهِ',
          transliteration: 'lillāh',
          translation: { en: 'is [due] to Allah', ar: 'خَالِصٌ لِلَّهِ' },
          root: 'أ ل ه',
          grammar: { en: 'Preposition + Noun', ar: 'شبه جملة خبر' },
        },
        {
          id: '1:2:3',
          arabic: 'رَبِّ',
          transliteration: 'Rabbi',
          translation: { en: 'Lord / Sustainer', ar: 'مَالِكِ وَمُرَبِّي' },
          root: 'ر ب ب',
          grammar: { en: 'Noun (Genitive)', ar: 'نعت مجرور' },
        },
        {
          id: '1:2:4',
          arabic: 'ٱلْعَٰلَمِينَ',
          transliteration: 'al-‘ālamīn',
          translation: { en: 'of the worlds', ar: 'الْخَلَائِقِ كُلِّهَا' },
          root: 'ع ل م',
          grammar: { en: 'Noun Plural (Genitive)', ar: 'مضاف إليه مجرور بالياء' },
        },
      ],
    },
    {
      number: 3,
      surahNumber: 1,
      arabic: 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
      transliteration: 'Ar-Raḥmānir-Raḥīm',
      translation: {
        en: 'The Entirely Merciful, the Especially Merciful,',
        ar: 'الرحمن الذي وسعت رحمته كل شيء، الرحيم بعباده المؤمنين.',
      },
      tafsir: {
        en: 'Reiterating the dual names of mercy immediately after mentioning His lordship reminds the worshipper that divine sovereignty is exercised through boundless compassion.',
        ar: 'تكرار هذين الاسمين الجليلين بعد «رب العالمين» لبيان أن ربوبيته تعالى مبنية على الرحمة والإحسان لا على القهر والجبروت.',
      },
      reflectionTheme: {
        en: 'Lordship Governed by Compassion',
        ar: 'الربوبية قائمة على الرحمة واللطف',
      },
      words: [
        {
          id: '1:3:1',
          arabic: 'ٱلرَّحْمَٰنِ',
          transliteration: 'ar-Raḥmān',
          translation: { en: 'The Entirely Merciful', ar: 'الرَّحْمَنِ' },
          root: 'ر ح م',
          grammar: { en: 'Adjective (Genitive)', ar: 'نعت مجرور' },
        },
        {
          id: '1:3:2',
          arabic: 'ٱلرَّحِيمِ',
          transliteration: 'ar-Raḥīm',
          translation: { en: 'the Especially Merciful', ar: 'الرَّحِيمِ' },
          root: 'ر ح م',
          grammar: { en: 'Adjective (Genitive)', ar: 'نعت ثانٍ مجرور' },
        },
      ],
    },
    {
      number: 4,
      surahNumber: 1,
      arabic: 'مَٰلِكِ يَوْمِ ٱلدِّينِ',
      transliteration: 'Māliki Yawmid-Dīn',
      translation: {
        en: 'Sovereign of the Day of Recompense.',
        ar: 'المالك المتصرف وحده في يوم القيامة والجزاء والحساب.',
      },
      tafsir: {
        en: 'On the Day of Judgment, all claims to power dissolve and the absolute justice and dominion of Allah alone is made manifest to all beings.',
        ar: '«يوم الدين» هو يوم الجزاء والحساب يوم القيامة، وخصه بالذكر مع أنه مالك كل الأيام لأنه يوم يظهر فيه كمال ملكه وعدله وتنقطع فيه دعاوي المتكبرين.',
      },
      reflectionTheme: {
        en: 'Accountability and Eternal Justice',
        ar: 'المسؤولية والعدل الإلهي المطلق',
      },
      words: [
        {
          id: '1:4:1',
          arabic: 'مَٰلِكِ',
          transliteration: 'Māliki',
          translation: { en: 'Sovereign / Master', ar: 'مَالِكِ وَصَاحِبِ' },
          root: 'م ل ك',
          grammar: { en: 'Noun (Genitive)', ar: 'نعت مجرور' },
        },
        {
          id: '1:4:2',
          arabic: 'يَوْمِ',
          transliteration: 'Yawmi',
          translation: { en: 'of [the] Day', ar: 'يَوْمِ' },
          root: 'ي و م',
          grammar: { en: 'Noun (Genitive)', ar: 'مضاف إليه مجرور' },
        },
        {
          id: '1:4:3',
          arabic: 'ٱلدِّينِ',
          transliteration: 'ad-Dīn',
          translation: { en: 'of Recompense', ar: 'الْجَزَاءِ وَالْحِسَابِ' },
          root: 'د ي ن',
          grammar: { en: 'Noun (Genitive)', ar: 'مضاف إليه مجرور' },
        },
      ],
    },
    {
      number: 5,
      surahNumber: 1,
      arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
      transliteration: 'Iyyāka na‘budu wa-iyyāka nasta‘īn',
      translation: {
        en: 'It is You we worship and You we ask for help.',
        ar: 'نخصك وحدك بالعبادة، ونطلب منك وحدك العون والتوفيق في كل أمورنا.',
      },
      tafsir: {
        en: 'The turning point of the Surah and the heart of Tawhid: placing worship first as devotion, followed immediately by seeking help, acknowledging human weakness.',
        ar: 'هذه الآية هي سر الفاتحة ولب العبودية، فتقديم «إياك» يفيد الحصر: أي لا نعبد غيرك ولا نستعين بأحد سواك. والعبادة غاية، والاستعانة وسيلة لتحقيقها.',
      },
      reflectionTheme: {
        en: 'Pure Devotion & Radical Reliance',
        ar: 'إخلاص العبادة والاستعانة بالله وحده',
      },
      words: [
        {
          id: '1:5:1',
          arabic: 'إِيَّاكَ',
          transliteration: 'Iyyāka',
          translation: { en: 'You alone', ar: 'إِيَّاكَ وَحْدَكَ' },
          root: null,
          grammar: { en: 'Separated Object Pronoun', ar: 'ضمير نصب منفصل في محل نصب مفعول به' },
        },
        {
          id: '1:5:2',
          arabic: 'نَعْبُدُ',
          transliteration: 'na‘budu',
          translation: { en: 'we worship', ar: 'نَخْضَعُ وَنُطِيعُ' },
          root: 'ع ب د',
          grammar: { en: 'Present Tense Verb', ar: 'فعل مضارع مرفوع' },
        },
        {
          id: '1:5:3',
          arabic: 'وَإِيَّاكَ',
          transliteration: 'wa-iyyāka',
          translation: { en: 'and You alone', ar: 'وَإِيَّاكَ وَحْدَكَ' },
          root: null,
          grammar: { en: 'Conjunction + Pronoun', ar: 'واو العطف + ضمير نصب' },
        },
        {
          id: '1:5:4',
          arabic: 'نَسْتَعِينُ',
          transliteration: 'nasta‘īn',
          translation: { en: 'we ask for help', ar: 'نَطْلُبُ الْعَوْنَ' },
          root: 'ع و ن',
          grammar: { en: 'Present Tense Verb', ar: 'فعل مضارع مرفوع' },
        },
      ],
    },
    {
      number: 6,
      surahNumber: 1,
      arabic: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
      transliteration: 'Ihdinaṣ-ṣirāṭal-mustaqīm',
      translation: {
        en: 'Guide us to the straight path -',
        ar: 'دُلَّنا وأرشدنا وثبّتنا على الطريق الواضح القويم الموصل إلى رضاك وجنتك.',
      },
      tafsir: {
        en: 'The most comprehensive prayer a human can utter: asking not just for direction, but for clarity, steadfastness, and ease upon the true path.',
        ar: 'طلب الهداية يتضمن الإرشاد والتوفيق والتثبيت. والصراط المستقيم هو دين الإسلام الواضح الذي لا اعوجاج فيه، الموصل إلى رضوان الله وجنته.',
      },
      reflectionTheme: {
        en: 'The Essential Prayer for Guidance',
        ar: 'الدعاء الأعظم للهداية والثبات',
      },
      words: [
        {
          id: '1:6:1',
          arabic: 'ٱهْدِنَا',
          transliteration: 'Ihdinā',
          translation: { en: 'Guide us', ar: 'أَرْشِدْنَا وَثَبِّتْنَا' },
          root: 'ه د ي',
          grammar: { en: 'Imperative (Supplication)', ar: 'فعل دعاء ومسألة' },
        },
        {
          id: '1:6:2',
          arabic: 'ٱلصِّرَٰطَ',
          transliteration: 'aṣ-Ṣirāṭa',
          translation: { en: 'the path', ar: 'الطَّرِيقَ الْوَاضِحَ' },
          root: 'ص ر ط',
          grammar: { en: 'Definite Noun (Accusative)', ar: 'مفعول به ثانٍ منصوب' },
        },
        {
          id: '1:6:3',
          arabic: 'ٱلْمُسْتَقِيمَ',
          transliteration: 'al-Mustaqīm',
          translation: { en: 'the straight', ar: 'الْقَوِيمَ الَّذِي لَا اعْوِجَاجَ فِيهِ' },
          root: 'ق و م',
          grammar: { en: 'Adjective (Accusative)', ar: 'نعت منصوب' },
        },
      ],
    },
    {
      number: 7,
      surahNumber: 1,
      arabic: 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ',
      transliteration: 'Ṣirāṭal-ladhīna an‘amta ‘alayhim ghayril-maghḍūbi ‘alayhim wa-laḍ-ḍāllīn',
      translation: {
        en: 'The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray.',
        ar: 'طريق الأنبياء والصديقين والشهداء والصالحين، لا طريق من عرف الحق وتركه، ولا طريق من ضل عن جهل وهوى.',
      },
      tafsir: {
        en: 'A vivid clarification: the straight path is the lived path of the righteous, steering clear of knowing the truth yet defying it, or acting without knowledge and wisdom.',
        ar: 'بيان للصراط المستقيم: أنه طريق المنعَم عليهم من النبيين والصدّيقين والشهداء والصالحين. ومجانبة طريق المغضوب عليهم وهم الذين عرفوا الحق ولم يعملوا به، والضالين الذين تاهوا بلا علم.',
      },
      reflectionTheme: {
        en: 'The Companions of Truth vs. Straying Paths',
        ar: 'صحبة أهل الإيمان والسلامة من طرق الغواية',
      },
      words: [
        {
          id: '1:7:1',
          arabic: 'صِرَٰطَ',
          transliteration: 'Ṣirāṭa',
          translation: { en: 'The path of', ar: 'طَرِيقَ' },
          root: 'ص ر ط',
          grammar: { en: 'Noun (Accusative)', ar: 'بدل منصوب' },
        },
        {
          id: '1:7:2',
          arabic: 'ٱلَّذِينَ',
          transliteration: 'alladhīna',
          translation: { en: 'those who', ar: 'الَّذِينَ' },
          root: null,
          grammar: { en: 'Relative Pronoun', ar: 'اسم موصول في محل جر مضاف إليه' },
        },
        {
          id: '1:7:3',
          arabic: 'أَنْعَمْتَ',
          transliteration: 'an‘amta',
          translation: { en: 'You have bestowed favor', ar: 'تَفَضَّلْتَ عَلَيْهِمْ بِالْهِدَايَةِ' },
          root: 'ن ع م',
          grammar: { en: 'Past Verb + Subject Pronoun', ar: 'فعل ماضٍ وفاعله التاء' },
        },
        {
          id: '1:7:4',
          arabic: 'عَلَيْهِمْ',
          transliteration: '‘alayhim',
          translation: { en: 'upon them', ar: 'عَلَيْهِمْ' },
          root: null,
          grammar: { en: 'Preposition + Pronoun', ar: 'جار ومجرور' },
        },
        {
          id: '1:7:5',
          arabic: 'غَيْرِ',
          transliteration: 'ghayri',
          translation: { en: 'not [of]', ar: 'سِوَى طَرِيقِ' },
          root: 'غ ي ر',
          grammar: { en: 'Noun (Genitive)', ar: 'بدل مجرور' },
        },
        {
          id: '1:7:6',
          arabic: 'ٱلْمَغْضُوبِ',
          transliteration: 'al-maghḍūbi',
          translation: { en: 'those who evoked anger', ar: 'مَنْ غَضِبْتَ عَلَيْهِمْ' },
          root: 'غ ض ب',
          grammar: { en: 'Passive Participle (Genitive)', ar: 'مضاف إليه مجرور' },
        },
        {
          id: '1:7:7',
          arabic: 'عَلَيْهِمْ',
          transliteration: '‘alayhim',
          translation: { en: 'upon them', ar: 'عَلَيْهِمْ' },
          root: null,
          grammar: { en: 'Preposition + Pronoun', ar: 'جار ومجرور' },
        },
        {
          id: '1:7:8',
          arabic: 'وَلَا',
          transliteration: 'wa-lā',
          translation: { en: 'and not [of]', ar: 'وَلَا طَرِيقِ' },
          root: null,
          grammar: { en: 'Conjunction + Negative Particle', ar: 'حرف عطف ونفي' },
        },
        {
          id: '1:7:9',
          arabic: 'ٱلضَّآلِّينَ',
          transliteration: 'aḍ-ḍāllīn',
          translation: { en: 'those who are astray', ar: 'التَّائِهِينَ عَنِ الْحَقِّ' },
          root: 'ض ل ل',
          grammar: { en: 'Active Participle Plural (Genitive)', ar: 'معطوف مجرور بالياء' },
        },
      ],
    },
  ],
};

export const FATIHA_VOCAB_CHALLENGES: VocabChallenge[] = [
  {
    id: 'vc-1',
    word: SURAH_AL_FATIHA.ayahs[1].words[0], // ٱلْحَمْدُ
    options: [
      { id: 'opt-1', text: { en: '[All] praise and gratitude', ar: 'الثناء الكامل والمحبة' }, correct: true },
      { id: 'opt-2', text: { en: 'Supplication and asking', ar: 'الدعاء والمسألة' }, correct: false },
      { id: 'opt-3', text: { en: 'The straight path', ar: 'الطريق المستقيم' }, correct: false },
    ],
    hint: {
      en: 'It is the very first word spoken in gratitude in the second verse of Al-Fatihah.',
      ar: 'أول كلمة نستهل بها شكر نعم الله في الآية الثانية.',
    },
  },
  {
    id: 'vc-2',
    word: SURAH_AL_FATIHA.ayahs[1].words[2], // رَبِّ
    options: [
      { id: 'opt-1', text: { en: 'Lord, Creator and Sustainer', ar: 'الرب المربي بنعمه والمالك' }, correct: true },
      { id: 'opt-2', text: { en: 'The Eternal Judge', ar: 'الحاكم والقاضي' }, correct: false },
      { id: 'opt-3', text: { en: 'The Angels', ar: 'الملائكة الكرام' }, correct: false },
    ],
    hint: {
      en: 'From the root (ر ب ب) which means to nurture, raise, and sustain with boundless care.',
      ar: 'من مادة (ربب) التي تفيد التربية والتعهد بالرعاية والإنعام.',
    },
  },
  {
    id: 'vc-3',
    word: SURAH_AL_FATIHA.ayahs[4].words[3], // نَسْتَعِينُ
    options: [
      { id: 'opt-1', text: { en: 'We seek help and strength', ar: 'نطلب العون والتوفيق' }, correct: true },
      { id: 'opt-2', text: { en: 'We give charity', ar: 'نبذل الصدقات' }, correct: false },
      { id: 'opt-3', text: { en: 'We listen carefully', ar: 'نستمع بإنصات' }, correct: false },
    ],
    hint: {
      en: 'Comes from root (ع و ن): seeking divine support when human capacity falls short.',
      ar: 'من جذر (عون): طلب المدد من الله وحده عند شعور الإنسان بضعفه.',
    },
  },
  {
    id: 'vc-4',
    word: SURAH_AL_FATIHA.ayahs[5].words[1], // ٱلصِّرَٰطَ
    options: [
      { id: 'opt-1', text: { en: 'The wide, clear way or path', ar: 'الطريق الواضح المستقيم' }, correct: true },
      { id: 'opt-2', text: { en: 'The sacred mountain', ar: 'الجبل الشامخ' }, correct: false },
      { id: 'opt-3', text: { en: 'The illuminated book', ar: 'الكتاب المنير' }, correct: false },
    ],
    hint: {
      en: 'The clear and luminous highway leading straight to Allah’s pleasure.',
      ar: 'السبيل المستقيم البين الذي لا عوج فيه.',
    },
  },
  {
    id: 'vc-5',
    word: SURAH_AL_FATIHA.ayahs[5].words[2], // ٱلْمُسْتَقِيمَ
    options: [
      { id: 'opt-1', text: { en: 'The upright and straight, without deviation', ar: 'القويم الخالي من أي عوج' }, correct: true },
      { id: 'opt-2', text: { en: 'The ancient and hidden', ar: 'القديم المتوارث' }, correct: false },
      { id: 'opt-3', text: { en: 'The difficult trial', ar: 'الامتحان الشديد' }, correct: false },
    ],
    hint: {
      en: 'From (ق و م): standing upright, steadfast and true.',
      ar: 'من جذر (قوم): الاعتدال والثبات على الجادة السوية.',
    },
  },
];

export const FATIHA_BUILDER_PUZZLES: AyahBuilderPuzzle[] = [
  {
    ayahNumber: 1,
    targetArabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
    translation: {
      en: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
      ar: 'بسم الله الرحمن الرحيم',
    },
    scrambledWords: [
      { id: 'w-3', arabic: 'ٱلرَّحْمَٰنِ', correctIndex: 2 },
      { id: 'w-1', arabic: 'بِسْمِ', correctIndex: 0 },
      { id: 'w-4', arabic: 'ٱلرَّحِيمِ', correctIndex: 3 },
      { id: 'w-2', arabic: 'ٱللَّهِ', correctIndex: 1 },
    ],
  },
  {
    ayahNumber: 2,
    targetArabic: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ',
    translation: {
      en: '[All] praise is [due] to Allah, Lord of the worlds -',
      ar: 'الحمد لله رب العالمين',
    },
    scrambledWords: [
      { id: 'w-2', arabic: 'لِلَّهِ', correctIndex: 1 },
      { id: 'w-4', arabic: 'ٱلْعَٰلَمِينَ', correctIndex: 3 },
      { id: 'w-1', arabic: 'ٱلْحَمْدُ', correctIndex: 0 },
      { id: 'w-3', arabic: 'رَبِّ', correctIndex: 2 },
    ],
  },
  {
    ayahNumber: 5,
    targetArabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
    translation: {
      en: 'It is You we worship and You we ask for help.',
      ar: 'إياك نعبد وإياك نستعين',
    },
    scrambledWords: [
      { id: 'w-3', arabic: 'وَإِيَّاكَ', correctIndex: 2 },
      { id: 'w-1', arabic: 'إِيَّاكَ', correctIndex: 0 },
      { id: 'w-4', arabic: 'نَسْتَعِينُ', correctIndex: 3 },
      { id: 'w-2', arabic: 'نَعْبُدُ', correctIndex: 1 },
    ],
  },
  {
    ayahNumber: 6,
    targetArabic: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
    translation: {
      en: 'Guide us to the straight path -',
      ar: 'اهدنا الصراط المستقيم',
    },
    scrambledWords: [
      { id: 'w-2', arabic: 'ٱلصِّرَٰطَ', correctIndex: 1 },
      { id: 'w-3', arabic: 'ٱلْمُسْتَقِيمَ', correctIndex: 2 },
      { id: 'w-1', arabic: 'ٱهْدِنَا', correctIndex: 0 },
    ],
  },
];
