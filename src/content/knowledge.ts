import type { KnowledgeEntry } from '@/domain/types';

/**
 * SAJA's curated knowledge base (DEMO).
 *
 * ⚠️  Every entry is `reviewStatus: 'demo-unreviewed'`. References point to
 * well-known sources so reviewers can check them, but this build has NOT been
 * reviewed by SAJA's scholar board. The UI surfaces that status on every
 * evidence card — never remove it until an entry is actually reviewed.
 *
 * Conventions
 *  - Qur'an: `rendering: 'translation'` quotes Saheeh International; the Arabic
 *    field holds the original text of the cited portion.
 *  - Hadith: `rendering: 'meaning'` is a paraphrase of the meaning, not a quote,
 *    unless an Arabic original is included for a short, widely-known wording.
 */
const SI = 'Saheeh International';

export const KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'k-wudu',
    topics: ['purification', 'prayer'],
    keywords: ['wudu', 'wudhu', 'ablution', 'wash', 'وضوء', 'الوضوء', 'طهارة'],
    question: { en: 'How is wudu performed?', ar: 'كيف يكون الوضوء؟' },
    simple: {
      en: 'Wudu is a calm washing before prayer. You make the intention, then wash your face, your arms up to the elbows, wipe your head, and wash your feet up to the ankles. Many people also wash hands, mouth, nose and ears first, following the Prophet ﷺ.',
      ar: 'الوضوء غَسل هادئ قبل الصلاة. تنوي في قلبك، ثم تغسل وجهك، ويديك إلى المرفقين، وتمسح رأسك، وتغسل قدميك إلى الكعبين. ويبدأ كثيرون بغسل الكفين والمضمضة والاستنشاق ومسح الأذنين اتباعًا للنبي ﷺ.',
    },
    deep: {
      en: "Qur'an 5:6 names four acts that scholars agree are required: washing the face, washing the arms to the elbows, wiping the head, and washing the feet to the ankles. The hadith of 'Uthman describing the Prophet's ﷺ wudu adds the sunnah acts around them — washing the hands, rinsing the mouth and nose, and wiping the ears — and the Prophet ﷺ liked to begin with the right side.",
      ar: 'تذكر آية المائدة (٥:٦) أربعة أفعال اتفق العلماء على وجوبها: غسل الوجه، وغسل اليدين إلى المرفقين، ومسح الرأس، وغسل الرجلين إلى الكعبين. ويصف حديث عثمان رضي الله عنه وضوء النبي ﷺ ومعه السنن: غسل الكفين، والمضمضة والاستنشاق، ومسح الأذنين، وكان النبي ﷺ يحب التيمّن.',
    },
    example: {
      en: 'Before Maghrib, Layla turns on the tap gently, says "Bismillah", washes her hands, rinses her mouth and nose, washes her face, then her right arm before her left — and turns the tap off between steps so no water is wasted.',
      ar: 'قبل المغرب تفتح ليلى الصنبور بهدوء، وتقول «بسم الله»، وتغسل كفيها، وتتمضمض وتستنشق، وتغسل وجهها، ثم ذراعها اليمنى قبل اليسرى، وتغلق الماء بين الخطوات حتى لا تُسرف.',
    },
    why: {
      en: 'Wudu prepares the body and the heart. The order moves from the hands you work with, to the face you meet the world with, to the feet you walk with — arriving at prayer refreshed and present.',
      ar: 'الوضوء يهيّئ الجسد والقلب. يبدأ باليدين اللتين تعمل بهما، ثم الوجه الذي تقابل به الناس، ثم القدمين اللتين تمشي بهما — فتصل إلى الصلاة منتعشًا حاضرًا.',
    },
    confidence: 'consensus',
    evidence: [
      {
        kind: 'quran',
        ref: "Qur'an 5:6",
        rendering: 'translation',
        translationName: SI,
        text: {
          en: 'O you who have believed, when you rise to [perform] prayer, wash your faces and your forearms to the elbows and wipe over your heads and wash your feet to the ankles.',
          ar: 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا قُمْتُمْ إِلَى الصَّلَاةِ فَاغْسِلُوا وُجُوهَكُمْ وَأَيْدِيَكُمْ إِلَى الْمَرَافِقِ وَامْسَحُوا بِرُءُوسِكُمْ وَأَرْجُلَكُمْ إِلَى الْكَعْبَيْنِ',
        },
        arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا قُمْتُمْ إِلَى الصَّلَاةِ فَاغْسِلُوا وُجُوهَكُمْ وَأَيْدِيَكُمْ إِلَى الْمَرَافِقِ وَامْسَحُوا بِرُءُوسِكُمْ وَأَرْجُلَكُمْ إِلَى الْكَعْبَيْنِ',
      },
      {
        kind: 'hadith',
        ref: 'Sahih al-Bukhari 159',
        rendering: 'meaning',
        text: {
          en: "Humran described watching 'Uthman ibn 'Affan perform wudu — washing his hands, rinsing his mouth and nose, washing his face and arms, wiping his head and washing his feet — and saying he saw the Prophet ﷺ perform wudu like this.",
          ar: 'وصف حُمران كيف رأى عثمان بن عفان يتوضأ: غسل كفيه، وتمضمض واستنشق، وغسل وجهه ويديه، ومسح رأسه، وغسل رجليه، ثم قال إنه رأى النبي ﷺ يتوضأ نحو هذا الوضوء.',
        },
      },
      {
        kind: 'hadith',
        ref: 'Sahih al-Bukhari 168',
        rendering: 'meaning',
        text: {
          en: "'Aishah reported that the Prophet ﷺ liked to start with the right side — in putting on shoes, combing his hair and purifying himself.",
          ar: 'روت عائشة رضي الله عنها أن النبي ﷺ كان يعجبه التيمّن في تنعّله وترجّله وطهوره.',
        },
      },
    ],
    context: {
      en: 'Wudu is needed before the prayer. It stays valid until something breaks it, such as using the bathroom or deep sleep.',
      ar: 'الوضوء شرط للصلاة، ويبقى صحيحًا حتى ينتقض بشيء كقضاء الحاجة أو النوم العميق.',
    },
    uncertainty: {
      en: 'Schools differ on some details — for example whether the whole head or part of it must be wiped, and whether the order of the steps is obligatory or recommended. All of these views are valid.',
      ar: 'تختلف المذاهب في بعض التفاصيل، مثل مسح الرأس كله أو بعضه، وهل الترتيب واجب أم مستحب. وكلها آراء معتبرة.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-intention',
    topics: ['purification', 'prayer', 'character'],
    keywords: ['intention', 'niyyah', 'niyya', 'نية', 'النية'],
    question: { en: 'Why does intention matter?', ar: 'لماذا تهمّ النية؟' },
    simple: {
      en: 'Intention (niyyah) is deciding in your heart why you are doing something. It turns an ordinary action into worship. You don’t need to say it out loud.',
      ar: 'النية أن تقصد بقلبك لماذا تفعل الشيء. هي التي تجعل العمل العادي عبادة، ولا يلزم أن تنطق بها.',
    },
    deep: {
      en: 'The very first hadith in Sahih al-Bukhari teaches that actions are judged by their intentions. Scholars say the intention’s place is the heart; the same washing can be a habit or an act of worship depending on it.',
      ar: 'أول حديث في صحيح البخاري يعلّمنا أن الأعمال بالنيات. ويقرر العلماء أن محل النية القلب، فالغسل نفسه قد يكون عادة أو عبادة بحسب النية.',
    },
    example: {
      en: 'Two people wash their faces at the same fountain. One is cooling off; the other is preparing to meet Allah in prayer. Same water — different journey.',
      ar: 'شخصان يغسلان وجهيهما عند النافورة نفسها: أحدهما يتبرّد، والآخر يستعد للقاء الله في الصلاة. الماء واحد والرحلة مختلفة.',
    },
    why: {
      en: 'Because Allah looks at hearts. Intention keeps worship sincere and makes even small things count.',
      ar: 'لأن الله ينظر إلى القلوب. النية تحفظ الإخلاص وتجعل الأشياء الصغيرة ذات قيمة.',
    },
    confidence: 'consensus',
    evidence: [
      {
        kind: 'hadith',
        ref: 'Sahih al-Bukhari 1',
        rendering: 'meaning',
        text: {
          en: 'Actions are only by intentions, and each person will have what they intended.',
          ar: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى',
        },
        arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى',
      },
    ],
    context: {
      en: 'This hadith is so central that many scholars placed it first in their books.',
      ar: 'لهذا الحديث مكانة عظيمة حتى إن كثيرًا من العلماء افتتحوا به كتبهم.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-five-prayers',
    topics: ['prayer'],
    keywords: ['five', 'prayers', 'salah', 'salat', 'times', 'why pray', 'صلاة', 'الصلوات', 'خمس', 'مواقيت'],
    question: { en: 'Why do we pray five times?', ar: 'لماذا نصلي خمس مرات؟' },
    simple: {
      en: 'Allah made prayer due at set times through the day. The five daily prayers were given to the Prophet ﷺ on the Night Journey.',
      ar: 'جعل الله الصلاة في أوقات محددة خلال اليوم، وفُرضت الصلوات الخمس على النبي ﷺ في رحلة المعراج.',
    },
    deep: {
      en: 'The Qur’an describes prayer as “a decree of specified times”. In the account of the Night Journey, the prayers were first set at fifty and reduced to five, while keeping the reward of fifty. The times follow the sun: dawn, midday, afternoon, sunset and night.',
      ar: 'يصف القرآن الصلاة بأنها «كتابًا موقوتًا». وفي حديث المعراج فُرضت خمسين ثم خُففت إلى خمس مع بقاء أجر الخمسين. وتتبع أوقاتها الشمس: الفجر والظهر والعصر والمغرب والعشاء.',
    },
    example: {
      en: 'Think of five calm pauses: waking (Fajr), a break at midday (Dhuhr), the afternoon (Asr), sunset (Maghrib) and the evening (Isha). Each one resets the day.',
      ar: 'تخيّل خمس وقفات هادئة: عند الاستيقاظ (الفجر)، واستراحة الظهيرة (الظهر)، والعصر، وعند الغروب (المغرب)، والمساء (العشاء). كل واحدة تعيد ترتيب اليوم.',
    },
    why: {
      en: 'Spreading prayer through the day keeps a person connected to Allah from morning to night, not just once.',
      ar: 'توزيع الصلاة على اليوم يبقي الإنسان متصلًا بالله من الصباح إلى الليل لا مرة واحدة فقط.',
    },
    confidence: 'consensus',
    evidence: [
      {
        kind: 'quran',
        ref: "Qur'an 4:103",
        rendering: 'translation',
        translationName: SI,
        text: {
          en: 'Indeed, prayer has been decreed upon the believers a decree of specified times.',
          ar: 'إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا',
        },
        arabic: 'إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا',
      },
      {
        kind: 'hadith',
        ref: 'Sahih al-Bukhari 349',
        rendering: 'meaning',
        text: {
          en: 'In the long hadith of the Night Journey, fifty prayers were prescribed and then reduced to five, with the reward of fifty.',
          ar: 'في حديث المعراج الطويل فُرضت خمسون صلاة ثم خُففت إلى خمس، وهي خمس في العمل وخمسون في الأجر.',
        },
      },
    ],
    context: {
      en: 'Times follow the sun, so they shift through the year and by location.',
      ar: 'تتبع المواقيت الشمس، لذا تتغير خلال السنة وبحسب المكان.',
    },
    uncertainty: {
      en: 'Schools differ on when Asr begins (one or two shadow-lengths). Both are valid.',
      ar: 'تختلف المذاهب في بداية وقت العصر (مثل ظل الشيء أو مثليه)، وكلاهما معتبر.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-salah-steps',
    topics: ['prayer'],
    keywords: ['rakah', 'rak\'ah', 'ruku', 'sujud', 'bow', 'prostrate', 'how to pray', 'ركعة', 'ركوع', 'سجود', 'كيف أصلي'],
    question: { en: 'What happens in one unit (rak‘ah) of prayer?', ar: 'ماذا يحدث في الركعة الواحدة؟' },
    simple: {
      en: 'You begin with “Allahu Akbar”, stand and recite al-Fatihah, bow (ruku‘), rise, prostrate (sujud), sit briefly, and prostrate again. The prayer ends by sitting for the tashahhud and saying salam.',
      ar: 'تبدأ بـ«الله أكبر»، ثم تقف وتقرأ الفاتحة، ثم تركع، ثم ترفع، ثم تسجد، ثم تجلس قليلًا، ثم تسجد مرة ثانية. وتُختم الصلاة بالجلوس للتشهد ثم التسليم.',
    },
    deep: {
      en: 'The Prophet ﷺ said: “Pray as you have seen me praying.” When a man prayed hastily, the Prophet ﷺ taught him to be calm in every position — standing, bowing, rising, prostrating and sitting — until each one was complete.',
      ar: 'قال النبي ﷺ: «صلّوا كما رأيتموني أصلي». ولما صلى رجل مستعجلًا علّمه النبي ﷺ أن يطمئن في كل ركن: في القيام والركوع والرفع والسجود والجلوس.',
    },
    example: {
      en: 'Imagine each position as a room you walk through slowly. You don’t rush from the door to the window — you arrive, breathe, and then move on.',
      ar: 'تخيّل كل ركن غرفة تمرّ بها بهدوء؛ لا تركض من الباب إلى النافذة، بل تصل وتتنفس ثم تنتقل.',
    },
    why: {
      en: 'Each movement expresses something: standing in respect, bowing in humility, and prostrating in the closest nearness to Allah.',
      ar: 'لكل حركة معنى: القيام إجلالًا، والركوع خضوعًا، والسجود أقرب ما يكون العبد من ربه.',
    },
    confidence: 'consensus',
    evidence: [
      {
        kind: 'quran',
        ref: "Qur'an 22:77",
        rendering: 'translation',
        translationName: SI,
        text: {
          en: 'O you who have believed, bow and prostrate and worship your Lord and do good — that you may succeed.',
          ar: 'يَا أَيُّهَا الَّذِينَ آمَنُوا ارْكَعُوا وَاسْجُدُوا وَاعْبُدُوا رَبَّكُمْ وَافْعَلُوا الْخَيْرَ لَعَلَّكُمْ تُفْلِحُونَ',
        },
        arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا ارْكَعُوا وَاسْجُدُوا وَاعْبُدُوا رَبَّكُمْ وَافْعَلُوا الْخَيْرَ لَعَلَّكُمْ تُفْلِحُونَ',
      },
      {
        kind: 'hadith',
        ref: 'Sahih al-Bukhari 631',
        rendering: 'meaning',
        text: { en: 'Pray as you have seen me praying.', ar: 'صَلُّوا كَمَا رَأَيْتُمُونِي أُصَلِّي' },
        arabic: 'صَلُّوا كَمَا رَأَيْتُمُونِي أُصَلِّي',
      },
      {
        kind: 'hadith',
        ref: 'Sahih al-Bukhari 757',
        rendering: 'meaning',
        text: {
          en: 'A man prayed hastily; the Prophet ﷺ told him to pray again and taught him to be at rest in each position until it was complete.',
          ar: 'صلى رجل مستعجلًا فأمره النبي ﷺ أن يعيد، وعلّمه أن يطمئن في كل ركن حتى يتمه.',
        },
      },
    ],
    context: {
      en: 'Different prayers have a different number of units: Fajr 2, Dhuhr 4, Asr 4, Maghrib 3, Isha 4.',
      ar: 'تختلف عدد الركعات: الفجر ٢، والظهر ٤، والعصر ٤، والمغرب ٣، والعشاء ٤.',
    },
    uncertainty: {
      en: 'Details such as where the hands are placed while standing differ between schools; all follow reports from the Prophet ﷺ.',
      ar: 'تختلف المذاهب في تفاصيل مثل موضع اليدين في القيام، وكلها تستند إلى روايات عن النبي ﷺ.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-salam',
    topics: ['terminology', 'character'],
    keywords: ['salam', 'salaam', 'assalamu', 'greeting', 'peace', 'سلام', 'السلام', 'تحية'],
    question: { en: 'What does “As-salamu alaykum” mean?', ar: 'ما معنى «السلام عليكم»؟' },
    simple: {
      en: '“As-salamu alaykum” means “Peace be upon you.” The reply is “Wa alaykum as-salam” — “and upon you be peace.”',
      ar: '«السلام عليكم» دعاء بالسلامة والأمان، والرد: «وعليكم السلام».',
    },
    deep: {
      en: 'As-Salam (Peace) is one of the names of Allah. The Qur’an asks us to return a greeting with a better one or at least the same, and the Prophet ﷺ described spreading salam as a way to build love between people.',
      ar: '«السلام» من أسماء الله. ويأمرنا القرآن أن نرد التحية بأحسن منها أو مثلها، وأخبر النبي ﷺ أن إفشاء السلام طريق للمحبة بين الناس.',
    },
    example: {
      en: 'When Omar walks into class he says “As-salamu alaykum” — and his friend replies with the longer greeting, “Wa alaykum as-salam wa rahmatullah.”',
      ar: 'حين يدخل عمر الصف يقول «السلام عليكم» فيرد صديقه بتحية أطول: «وعليكم السلام ورحمة الله».',
    },
    why: {
      en: 'A greeting of peace reminds both people that they are safe with each other.',
      ar: 'تحية السلام تذكّر الطرفين بأن كلًا منهما في أمان مع الآخر.',
    },
    confidence: 'consensus',
    evidence: [
      {
        kind: 'quran',
        ref: "Qur'an 4:86",
        rendering: 'translation',
        translationName: SI,
        text: {
          en: 'And when you are greeted with a greeting, greet [in return] with one better than it or [at least] return it [in a like manner].',
          ar: 'وَإِذَا حُيِّيتُم بِتَحِيَّةٍ فَحَيُّوا بِأَحْسَنَ مِنْهَا أَوْ رُدُّوهَا',
        },
        arabic: 'وَإِذَا حُيِّيتُم بِتَحِيَّةٍ فَحَيُّوا بِأَحْسَنَ مِنْهَا أَوْ رُدُّوهَا',
      },
      {
        kind: 'hadith',
        ref: 'Sahih Muslim 54',
        rendering: 'meaning',
        text: {
          en: 'You will not truly believe until you love one another — shall I tell you something that will make you love one another? Spread salam among yourselves.',
          ar: 'لا تؤمنون حتى تحابّوا، أولا أدلكم على شيء إذا فعلتموه تحاببتم؟ أفشوا السلام بينكم.',
        },
      },
    ],
    context: {
      en: 'It is used by Muslims everywhere, in every language, as a shared greeting.',
      ar: 'يستخدمه المسلمون في كل مكان وبكل اللغات تحيةً مشتركة.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-phrases',
    topics: ['terminology'],
    keywords: ['bismillah', 'alhamdulillah', 'inshaallah', 'insha', 'mashaallah', 'subhanallah', 'phrases', 'بسم الله', 'إن شاء الله', 'ما شاء الله', 'الحمد لله'],
    question: { en: 'What do Muslims’ everyday phrases mean?', ar: 'ما معاني العبارات اليومية عند المسلمين؟' },
    simple: {
      en: 'Bismillah — “In the name of Allah” (before starting). Alhamdulillah — “All praise is for Allah” (thankfulness). SubhanAllah — “Glory be to Allah” (wonder). In sha’ Allah — “If Allah wills” (about the future). Masha’ Allah — “What Allah has willed” (appreciating something good).',
      ar: 'بسم الله: قبل البدء. الحمد لله: للشكر. سبحان الله: للتعجب والتنزيه. إن شاء الله: عند الحديث عن المستقبل. ما شاء الله: عند رؤية شيء حسن.',
    },
    deep: {
      en: 'Several of these come directly from the Qur’an. Surah al-Kahf teaches saying “if Allah wills” about future plans (18:23–24) and “what Allah willed” when admiring a blessing (18:39).',
      ar: 'بعض هذه العبارات من القرآن مباشرة؛ ففي سورة الكهف تعليم قول «إن شاء الله» عند الحديث عن المستقبل (١٨:٢٣–٢٤)، و«ما شاء الله» عند رؤية النعمة (١٨:٣٩).',
    },
    example: {
      en: '“I’ll finish the mission tomorrow, in sha’ Allah.” — “Your drawing is beautiful, masha’ Allah!”',
      ar: '«سأكمل المهمة غدًا إن شاء الله». — «رسمتك جميلة، ما شاء الله!»',
    },
    why: {
      en: 'They keep Allah in the small moments of the day — beginnings, plans, gratitude and wonder.',
      ar: 'تجعل ذكر الله حاضرًا في لحظات اليوم الصغيرة: البدايات والخطط والشكر والتعجب.',
    },
    confidence: 'consensus',
    evidence: [
      {
        kind: 'quran',
        ref: "Qur'an 18:23–24",
        rendering: 'translation',
        translationName: SI,
        text: {
          en: 'And never say of anything, “Indeed, I will do that tomorrow,” except [when adding], “If Allah wills.”',
          ar: 'وَلَا تَقُولَنَّ لِشَيْءٍ إِنِّي فَاعِلٌ ذَٰلِكَ غَدًا ۝ إِلَّا أَن يَشَاءَ اللَّهُ',
        },
        arabic: 'وَلَا تَقُولَنَّ لِشَيْءٍ إِنِّي فَاعِلٌ ذَٰلِكَ غَدًا ۝ إِلَّا أَن يَشَاءَ اللَّهُ',
      },
    ],
    context: {
      en: 'These are phrases of remembrance (dhikr), used by Arabic and non-Arabic speakers alike.',
      ar: 'هذه عبارات ذكر يستخدمها العرب وغير العرب على السواء.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-kindness',
    topics: ['character'],
    keywords: ['kind', 'kindness', 'help', 'smile', 'good', 'manners', 'لطف', 'رحمة', 'ابتسامة', 'أخلاق'],
    question: { en: 'What does Islam teach about kindness?', ar: 'ماذا يعلّمنا الإسلام عن اللطف؟' },
    simple: {
      en: 'Islam teaches us to want for others the good we want for ourselves. Even a smile is counted as charity.',
      ar: 'يعلّمنا الإسلام أن نحب للآخرين ما نحبه لأنفسنا، وحتى الابتسامة صدقة.',
    },
    deep: {
      en: 'The Prophet ﷺ linked faith itself to loving good for others. The Qur’an tells us to speak to people with good words, and the Sunnah counts small kindnesses — a smile, removing something harmful from a path — as charity.',
      ar: 'ربط النبي ﷺ الإيمان نفسه بحب الخير للآخرين، ويأمرنا القرآن بقول الحسن للناس، وتعدّ السنة الأعمال الصغيرة كالابتسامة وإماطة الأذى عن الطريق صدقات.',
    },
    example: {
      en: 'A classmate drops their lunch. Helping them pick it up — and sharing yours — is exactly the kind of small act that counts.',
      ar: 'زميل أسقط غداءه؛ مساعدتك له في جمعه ومشاركته طعامك هي هذا النوع من الأعمال الصغيرة العظيمة.',
    },
    why: {
      en: 'Because the way we treat people is part of how we worship Allah.',
      ar: 'لأن معاملتنا للناس جزء من عبادتنا لله.',
    },
    confidence: 'consensus',
    evidence: [
      {
        kind: 'hadith',
        ref: 'Sahih al-Bukhari 13',
        rendering: 'meaning',
        text: {
          en: 'None of you truly believes until he loves for his brother what he loves for himself.',
          ar: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
        },
        arabic: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
      },
      {
        kind: 'hadith',
        ref: "Jami' at-Tirmidhi 1956",
        rendering: 'meaning',
        text: { en: 'Your smile in the face of your brother is charity.', ar: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ' },
        arabic: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ',
      },
      {
        kind: 'quran',
        ref: "Qur'an 2:83",
        rendering: 'translation',
        translationName: SI,
        text: { en: 'And speak to people good [words].', ar: 'وَقُولُوا لِلنَّاسِ حُسْنًا' },
        arabic: 'وَقُولُوا لِلنَّاسِ حُسْنًا',
      },
    ],
    context: {
      en: '“Brother” in these narrations is understood broadly by many scholars to include people in general.',
      ar: 'يفهم كثير من العلماء لفظ «الأخ» في هذه النصوص بمعنى واسع يشمل الناس عمومًا.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-first-revelation',
    topics: ['quran', 'history'],
    keywords: ['first', 'revelation', 'iqra', 'read', 'hira', 'cave', 'وحي', 'اقرأ', 'حراء', 'أول'],
    question: { en: 'What were the first words revealed of the Qur’an?', ar: 'ما أول ما نزل من القرآن؟' },
    simple: {
      en: 'The first words revealed were “Read! (Iqra’)”, the opening of Surah al-‘Alaq, given to the Prophet ﷺ in the cave of Hira during Ramadan.',
      ar: 'أول ما نزل «اقرأ»، مطلع سورة العلق، نزل على النبي ﷺ في غار حراء في شهر رمضان.',
    },
    deep: {
      en: 'Sahih al-Bukhari describes the beginning of revelation: the Prophet ﷺ would retreat to the cave of Hira, where the angel Jibril came to him with the first verses of Surah al-‘Alaq (96:1–5). The Qur’an itself says it was revealed in the month of Ramadan (2:185).',
      ar: 'يصف صحيح البخاري بدء الوحي: كان النبي ﷺ يتعبد في غار حراء، فجاءه جبريل بأوائل سورة العلق (٩٦:١–٥). ويخبر القرآن أنه أُنزل في شهر رمضان (٢:١٨٥).',
    },
    example: {
      en: 'It’s striking that the very first command was about reading and learning — the same thing you are doing right now.',
      ar: 'من اللافت أن أول أمر كان عن القراءة والتعلّم، وهو ما تفعله الآن تمامًا.',
    },
    why: {
      en: 'Beginning with “Read” places knowledge at the heart of the message.',
      ar: 'البدء بـ«اقرأ» يضع المعرفة في قلب الرسالة.',
    },
    confidence: 'majority',
    evidence: [
      {
        kind: 'quran',
        ref: "Qur'an 96:1",
        rendering: 'translation',
        translationName: SI,
        text: { en: 'Recite in the name of your Lord who created —', ar: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ' },
        arabic: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ',
      },
      {
        kind: 'hadith',
        ref: 'Sahih al-Bukhari 3',
        rendering: 'meaning',
        text: {
          en: '‘Aishah describes how revelation began: the Prophet ﷺ used to seclude himself in the cave of Hira, where the angel came to him and said “Read.”',
          ar: 'تصف عائشة رضي الله عنها بدء الوحي: كان النبي ﷺ يخلو في غار حراء فجاءه الملك فقال: «اقرأ».',
        },
      },
      {
        kind: 'quran',
        ref: "Qur'an 2:185",
        rendering: 'translation',
        translationName: SI,
        text: {
          en: 'The month of Ramadhan [is that] in which was revealed the Qur’an.',
          ar: 'شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ',
        },
        arabic: 'شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ',
      },
    ],
    context: {
      en: 'SAJA never depicts the Prophet ﷺ or the angel; this story is told through light, place and narration.',
      ar: 'لا يصوّر سجى النبي ﷺ ولا الملك؛ تُروى القصة بالضوء والمكان والسرد.',
    },
    uncertainty: {
      en: 'This is the view of the great majority of scholars. A few early reports mention the opening of Surah al-Muddaththir, which most explain as the first revealed after a pause.',
      ar: 'هذا قول جمهور العلماء. وتذكر بعض الروايات مطلع سورة المدثر، ويفسره أكثرهم بأنه أول ما نزل بعد فترة انقطاع الوحي.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-pillars',
    topics: ['beliefs', 'prayer', 'fasting'],
    keywords: ['pillars', 'five pillars', 'shahada', 'zakat', 'zakah', 'hajj', 'أركان', 'الشهادة', 'الزكاة', 'الحج'],
    question: { en: 'What are the five pillars of Islam?', ar: 'ما أركان الإسلام الخمسة؟' },
    simple: {
      en: 'The five pillars are: the testimony of faith (shahadah), prayer (salah), charity (zakah), fasting in Ramadan (sawm), and pilgrimage to Makkah (hajj) for those able.',
      ar: 'أركان الإسلام: الشهادتان، وإقام الصلاة، وإيتاء الزكاة، وصوم رمضان، وحج البيت لمن استطاع.',
    },
    deep: {
      en: 'The Prophet ﷺ described Islam as a building standing on five pillars. The shahadah is the foundation; the other four are acts that shape a Muslim’s day (prayer), wealth (zakah), year (fasting) and life (hajj).',
      ar: 'شبّه النبي ﷺ الإسلام ببناء قائم على خمس: الشهادتان أساسه، والأركان الأخرى تنظم يوم المسلم (الصلاة)، وماله (الزكاة)، وسنته (الصيام)، وعمره (الحج).',
    },
    example: {
      en: 'Think of a house: the testimony is the ground it stands on, and the other pillars hold up the roof.',
      ar: 'تخيّل بيتًا: الشهادة هي الأرض التي يقوم عليها، والأركان الأخرى تحمل السقف.',
    },
    why: {
      en: 'They give structure: belief, daily connection, care for others, self-discipline, and a journey that unites Muslims.',
      ar: 'تمنح الحياة بنية: إيمان، وصلة يومية، ورعاية للآخرين، وتهذيب للنفس، ورحلة تجمع المسلمين.',
    },
    confidence: 'consensus',
    evidence: [
      {
        kind: 'hadith',
        ref: 'Sahih al-Bukhari 8',
        rendering: 'meaning',
        text: {
          en: 'Islam is built upon five: testifying that there is no god but Allah and that Muhammad is the Messenger of Allah, establishing prayer, giving zakah, hajj, and fasting Ramadan.',
          ar: 'بُنِيَ الإِسْلَامُ عَلَى خَمْسٍ: شَهَادَةِ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ، وَإِقَامِ الصَّلَاةِ، وَإِيتَاءِ الزَّكَاةِ، وَالْحَجِّ، وَصَوْمِ رَمَضَانَ',
        },
        arabic: 'بُنِيَ الإِسْلَامُ عَلَى خَمْسٍ: شَهَادَةِ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ، وَإِقَامِ الصَّلَاةِ، وَإِيتَاءِ الزَّكَاةِ، وَالْحَجِّ، وَصَوْمِ رَمَضَانَ',
      },
    ],
    context: {
      en: 'Zakah and hajj depend on ability — wealth above a threshold and the means to travel.',
      ar: 'الزكاة والحج مرتبطان بالاستطاعة: بلوغ المال النصاب والقدرة على السفر.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-honesty',
    topics: ['character'],
    keywords: ['honest', 'honesty', 'cheat', 'fair', 'trade', 'scale', 'صدق', 'أمانة', 'غش', 'الميزان'],
    question: { en: 'What does Islam say about honesty in trade?', ar: 'ماذا يقول الإسلام عن الصدق في البيع؟' },
    simple: {
      en: 'Be fair and honest: give full measure, and don’t hide faults in what you sell.',
      ar: 'كن عادلًا صادقًا: أوفِ الكيل والميزان، ولا تُخفِ عيب ما تبيع.',
    },
    deep: {
      en: 'The Qur’an commands establishing the scale with justice and warns those who give less than is due. When the Prophet ﷺ found wet grain hidden under dry grain in a market, he taught that deceiving people is not the way of his followers.',
      ar: 'يأمر القرآن بإقامة الوزن بالقسط ويحذّر المطففين. ولما وجد النبي ﷺ طعامًا مبلولًا مخفيًا تحت الجاف في السوق علّم أن الغش ليس من طريقة أتباعه.',
    },
    example: {
      en: 'A seller notices a small crack in a lantern. Telling the buyer — even if it means a lower price — is honesty that builds trust.',
      ar: 'بائع يلاحظ شرخًا صغيرًا في فانوس؛ إخباره المشتري ولو بسعر أقل صدق يبني الثقة.',
    },
    why: {
      en: 'Trust between people is an amanah — something we are responsible for.',
      ar: 'الثقة بين الناس أمانة نحن مسؤولون عنها.',
    },
    confidence: 'consensus',
    evidence: [
      {
        kind: 'quran',
        ref: "Qur'an 55:9",
        rendering: 'translation',
        translationName: SI,
        text: {
          en: 'And establish weight in justice and do not make deficient the balance.',
          ar: 'وَأَقِيمُوا الْوَزْنَ بِالْقِسْطِ وَلَا تُخْسِرُوا الْمِيزَانَ',
        },
        arabic: 'وَأَقِيمُوا الْوَزْنَ بِالْقِسْطِ وَلَا تُخْسِرُوا الْمِيزَانَ',
      },
      {
        kind: 'hadith',
        ref: 'Sahih Muslim 102',
        rendering: 'meaning',
        text: {
          en: 'Passing a heap of grain that was wet underneath, the Prophet ﷺ asked why it was hidden, and said that whoever deceives is not of him.',
          ar: 'مرّ النبي ﷺ على صُبرة طعام مبلولة من أسفلها فسأل عن ذلك، وأخبر أن من غشّ فليس منه.',
        },
      },
    ],
    context: {
      en: 'Honesty applies beyond markets — in schoolwork, games and online too.',
      ar: 'الصدق لا يقتصر على السوق، بل يشمل الدراسة والألعاب والإنترنت.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-gratitude',
    topics: ['character'],
    keywords: ['grateful', 'gratitude', 'thanks', 'shukr', 'شكر', 'الحمد'],
    question: { en: 'Why is gratitude important?', ar: 'لماذا الشكر مهم؟' },
    simple: {
      en: 'Gratitude (shukr) means noticing Allah’s gifts and thanking Him — with words, with the heart, and by using gifts well. Allah promises to increase those who are grateful.',
      ar: 'الشكر أن تلاحظ نِعم الله وتشكره بلسانك وقلبك وحسن استعمالها، وقد وعد الله الشاكرين بالزيادة.',
    },
    deep: {
      en: 'The Qur’an ties gratitude to increase and remembrance to being remembered by Allah. Scholars describe shukr as three parts: recognising the blessing in the heart, praising Allah with the tongue, and using the blessing in obedience.',
      ar: 'يربط القرآن الشكر بالزيادة، والذكر بذكر الله لعبده. ويصف العلماء الشكر بثلاثة أركان: الاعتراف بالنعمة بالقلب، والثناء على الله باللسان، واستعمالها في طاعته.',
    },
    example: {
      en: 'Before sleeping, name three things from today you are thankful for. It’s a small habit that changes how the whole day feels.',
      ar: 'قبل النوم، اذكر ثلاثة أشياء من يومك تشكر الله عليها. عادة صغيرة تغيّر إحساس اليوم كله.',
    },
    why: {
      en: 'Gratitude turns attention from what is missing to what is given.',
      ar: 'الشكر يحوّل الانتباه مما ينقص إلى ما أُعطي.',
    },
    confidence: 'consensus',
    evidence: [
      {
        kind: 'quran',
        ref: "Qur'an 14:7",
        rendering: 'translation',
        translationName: SI,
        text: { en: 'If you are grateful, I will surely increase you [in favor].', ar: 'لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ' },
        arabic: 'لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ',
      },
      {
        kind: 'quran',
        ref: "Qur'an 2:152",
        rendering: 'translation',
        translationName: SI,
        text: {
          en: 'So remember Me; I will remember you. And be grateful to Me and do not deny Me.',
          ar: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ',
        },
        arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ',
      },
    ],
    context: {
      en: 'Gratitude is often paired with patience (sabr) as two halves of a believer’s response to life.',
      ar: 'كثيرًا ما يقترن الشكر بالصبر بوصفهما وجهين لاستجابة المؤمن للحياة.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-hijra',
    topics: ['history'],
    keywords: ['hijra', 'hijrah', 'migration', 'madinah', 'medina', 'calendar', 'الهجرة', 'المدينة', 'التقويم'],
    question: { en: 'What was the Hijra?', ar: 'ما هي الهجرة؟' },
    simple: {
      en: 'The Hijra was the migration of the Prophet ﷺ and the early Muslims from Makkah to Madinah. The Islamic (Hijri) calendar counts its years from it.',
      ar: 'الهجرة انتقال النبي ﷺ والمسلمين الأوائل من مكة إلى المدينة، ومنها يبدأ التقويم الهجري.',
    },
    deep: {
      en: 'Facing persecution in Makkah, the Prophet ﷺ migrated to Madinah with Abu Bakr, sheltering in a cave on the way — the Qur’an refers to “the second of two, when they were in the cave” (9:40). Later, during the caliphate of ‘Umar, the Muslims began counting years from the Hijra.',
      ar: 'بعد الأذى في مكة هاجر النبي ﷺ إلى المدينة مع أبي بكر، واختبآ في الغار في الطريق، ويشير القرآن إلى ذلك بقوله «ثاني اثنين إذ هما في الغار» (٩:٤٠). وفي خلافة عمر بدأ المسلمون التأريخ بالهجرة.',
    },
    example: {
      en: 'When you see a date like 1448 AH, “AH” means “after the Hijra”.',
      ar: 'حين ترى تاريخًا مثل ١٤٤٨هـ، فحرف «هـ» يعني «هجري».',
    },
    why: {
      en: 'The Hijra marked the beginning of the first Muslim community — a new chapter built on faith and brotherhood.',
      ar: 'كانت الهجرة بداية أول مجتمع مسلم، فصلًا جديدًا قائمًا على الإيمان والأخوّة.',
    },
    confidence: 'consensus',
    evidence: [
      {
        kind: 'quran',
        ref: "Qur'an 9:40",
        rendering: 'meaning',
        text: {
          en: 'Allah supported him when those who disbelieved drove him out — the second of two, when they were in the cave, and he said to his companion, “Do not grieve; indeed Allah is with us.”',
          ar: 'ثَانِيَ اثْنَيْنِ إِذْ هُمَا فِي الْغَارِ إِذْ يَقُولُ لِصَاحِبِهِ لَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا',
        },
        arabic: 'ثَانِيَ اثْنَيْنِ إِذْ هُمَا فِي الْغَارِ إِذْ يَقُولُ لِصَاحِبِهِ لَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا',
      },
      {
        kind: 'scholarly',
        ref: 'Historical record · Hijri calendar',
        rendering: 'meaning',
        text: {
          en: 'Historians record that the counting of years from the Hijra was adopted during the caliphate of ‘Umar ibn al-Khattab.',
          ar: 'يذكر المؤرخون أن اعتماد التأريخ بالهجرة كان في خلافة عمر بن الخطاب.',
        },
      },
    ],
    context: {
      en: 'The Hijri calendar is lunar, so Islamic months move about 11 days earlier each solar year.',
      ar: 'التقويم الهجري قمري، لذلك تتقدم الأشهر نحو ١١ يومًا كل سنة شمسية.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-fasting',
    topics: ['fasting'],
    keywords: ['fast', 'fasting', 'ramadan', 'sawm', 'suhoor', 'iftar', 'صيام', 'صوم', 'رمضان', 'سحور', 'إفطار'],
    question: { en: 'What is fasting in Ramadan?', ar: 'ما هو صيام رمضان؟' },
    simple: {
      en: 'In Ramadan, adult Muslims who are able don’t eat or drink from dawn until sunset. People who are ill or travelling can make the days up later. Children are encouraged gently — fasting becomes required at puberty.',
      ar: 'في رمضان يمتنع المسلم البالغ القادر عن الأكل والشرب من الفجر إلى المغرب. ويقضي المريض والمسافر لاحقًا، ويُشجَّع الأطفال بلطف، ويجب الصيام عند البلوغ.',
    },
    deep: {
      en: 'The Qur’an prescribes fasting “as it was prescribed for those before you, that you may become righteous” (2:183), explains the timing from dawn to night (2:187), and gives relief to the ill and travellers (2:184). Companions trained their children to fast gradually.',
      ar: 'فرض القرآن الصيام «كما كُتب على الذين من قبلكم لعلكم تتقون» (٢:١٨٣)، وبيّن وقته من الفجر إلى الليل (٢:١٨٧)، ورخّص للمريض والمسافر (٢:١٨٤). وكان الصحابة يعوّدون أطفالهم الصيام تدريجيًا.',
    },
    example: {
      en: 'A family wakes before dawn for suhoor, fasts through the day, and breaks the fast together at sunset with dates and water.',
      ar: 'تستيقظ الأسرة قبل الفجر للسحور، وتصوم النهار، ثم تفطر معًا عند المغرب على التمر والماء.',
    },
    why: {
      en: 'Fasting builds taqwa — mindfulness of Allah — and empathy for people who are hungry.',
      ar: 'الصيام يربّي التقوى ويعلّم الإحساس بالجائعين.',
    },
    confidence: 'consensus',
    evidence: [
      {
        kind: 'quran',
        ref: "Qur'an 2:183",
        rendering: 'translation',
        translationName: SI,
        text: {
          en: 'O you who have believed, decreed upon you is fasting as it was decreed upon those before you that you may become righteous.',
          ar: 'يَا أَيُّهَا الَّذِينَ آمَنُوا كُتِبَ عَلَيْكُمُ الصِّيَامُ كَمَا كُتِبَ عَلَى الَّذِينَ مِن قَبْلِكُمْ لَعَلَّكُمْ تَتَّقُونَ',
        },
        arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا كُتِبَ عَلَيْكُمُ الصِّيَامُ كَمَا كُتِبَ عَلَى الَّذِينَ مِن قَبْلِكُمْ لَعَلَّكُمْ تَتَّقُونَ',
      },
      {
        kind: 'quran',
        ref: "Qur'an 2:184",
        rendering: 'meaning',
        text: {
          en: 'Whoever among you is ill or on a journey — then an equal number of other days.',
          ar: 'فَمَن كَانَ مِنكُم مَّرِيضًا أَوْ عَلَىٰ سَفَرٍ فَعِدَّةٌ مِّنْ أَيَّامٍ أُخَرَ',
        },
        arabic: 'فَمَن كَانَ مِنكُم مَّرِيضًا أَوْ عَلَىٰ سَفَرٍ فَعِدَّةٌ مِّنْ أَيَّامٍ أُخَرَ',
      },
      {
        kind: 'hadith',
        ref: 'Sahih al-Bukhari 1960',
        rendering: 'meaning',
        text: {
          en: 'Ar-Rubayyi‘ bint Mu‘awwidh described how the Companions had their young children fast, giving them toys made of wool to distract them until iftar.',
          ar: 'وصفت الرُّبيّع بنت معوّذ كيف كان الصحابة يصوّمون صبيانهم الصغار ويصنعون لهم اللعبة من الصوف ليتلهّوا بها حتى الإفطار.',
        },
      },
    ],
    context: {
      en: 'There is scholarly agreement that fasting becomes obligatory at puberty for those who are able.',
      ar: 'اتفق العلماء على أن الصيام يجب عند البلوغ على القادر.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-laylat-al-qadr',
    topics: ['fasting', 'quran'],
    keywords: ['laylat', 'qadr', 'night of power', 'decree', '27th', 'ليلة القدر', 'القدر'],
    question: { en: 'When is Laylat al-Qadr?', ar: 'متى ليلة القدر؟' },
    simple: {
      en: 'Laylat al-Qadr is in the last ten nights of Ramadan, most likely an odd night. Its exact date is not known for certain.',
      ar: 'ليلة القدر في العشر الأواخر من رمضان، وأرجاها الليالي الوتر، ولا يُعرف تاريخها يقينًا.',
    },
    deep: {
      en: 'The Prophet ﷺ told Muslims to seek it in the odd nights of the last ten. Many scholars held the 27th to be the most likely, but others named different nights — so it is a matter of scholarly difference, and the wisdom often given is to strive in all of them.',
      ar: 'أمر النبي ﷺ بتحرّيها في الوتر من العشر الأواخر. ورجّح كثير من العلماء ليلة السابع والعشرين، وذكر آخرون ليالي أخرى، فالمسألة محل خلاف، والحكمة المذكورة كثيرًا هي الاجتهاد فيها كلها.',
    },
    example: {
      en: 'Instead of waiting for “the” night, many families plan something small for each of the last ten nights.',
      ar: 'بدل انتظار ليلة واحدة، تخطط أسر كثيرة لعمل صغير في كل ليلة من العشر الأواخر.',
    },
    why: {
      en: 'Keeping it hidden encourages effort across all ten nights.',
      ar: 'إخفاؤها يدعو إلى الاجتهاد في الليالي العشر كلها.',
    },
    confidence: 'difference',
    evidence: [
      {
        kind: 'hadith',
        ref: 'Sahih al-Bukhari 2017',
        rendering: 'meaning',
        text: {
          en: 'Seek Laylat al-Qadr in the odd nights of the last ten nights of Ramadan.',
          ar: 'تَحَرَّوْا لَيْلَةَ الْقَدْرِ فِي الْوِتْرِ مِنَ الْعَشْرِ الأَوَاخِرِ مِنْ رَمَضَانَ',
        },
        arabic: 'تَحَرَّوْا لَيْلَةَ الْقَدْرِ فِي الْوِتْرِ مِنَ الْعَشْرِ الأَوَاخِرِ مِنْ رَمَضَانَ',
      },
      {
        kind: 'quran',
        ref: "Qur'an 97:3",
        rendering: 'translation',
        translationName: SI,
        text: { en: 'The Night of Decree is better than a thousand months.', ar: 'لَيْلَةُ الْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ' },
        arabic: 'لَيْلَةُ الْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ',
      },
    ],
    context: {
      en: 'Because Islamic nights begin at sunset, the “27th night” is the night before the 27th day.',
      ar: 'لأن الليلة تبدأ من المغرب، فليلة السابع والعشرين هي الليلة التي تسبق يومه.',
    },
    uncertainty: {
      en: 'The 27th is a common view, not a certainty.',
      ar: 'ليلة السابع والعشرين قول مشهور لا يقين فيه.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-names',
    topics: ['beliefs'],
    keywords: ['names of allah', 'asma', 'rahman', 'rahim', 'merciful', '99', 'أسماء الله', 'الرحمن', 'الرحيم'],
    question: { en: 'What are the Names of Allah?', ar: 'ما أسماء الله الحسنى؟' },
    simple: {
      en: 'Allah is described in the Qur’an with beautiful names, like Ar-Rahman (the Most Merciful) and Ar-Rahim (the Especially Merciful). Learning them helps us know who we worship.',
      ar: 'وصف الله نفسه في القرآن بأسماء حسنى، مثل الرحمن والرحيم. ومعرفتها تعرّفنا بمن نعبد.',
    },
    deep: {
      en: 'The Qur’an says the best names belong to Allah and to call on Him by them (7:180). A hadith mentions ninety-nine names and praises the one who learns and lives by them. Every surah but one begins with “In the name of Allah, the Most Merciful, the Especially Merciful.”',
      ar: 'يقول القرآن إن لله الأسماء الحسنى فادعوه بها (٧:١٨٠). ويذكر حديث تسعة وتسعين اسمًا ويمدح من أحصاها. وتبدأ السور كلها إلا واحدة بـ«بسم الله الرحمن الرحيم».',
    },
    example: {
      en: 'When you ask Allah for forgiveness, you might call on Him as Al-Ghafur — the Forgiving.',
      ar: 'حين تطلب المغفرة يمكنك أن تدعوه باسمه الغفور.',
    },
    why: {
      en: 'Knowing Allah’s names shapes how we pray, hope and trust.',
      ar: 'معرفة أسماء الله تشكّل طريقة دعائنا ورجائنا وتوكلنا.',
    },
    confidence: 'consensus',
    evidence: [
      {
        kind: 'quran',
        ref: "Qur'an 7:180",
        rendering: 'translation',
        translationName: SI,
        text: {
          en: 'And to Allah belong the best names, so invoke Him by them.',
          ar: 'وَلِلَّهِ الْأَسْمَاءُ الْحُسْنَىٰ فَادْعُوهُ بِهَا',
        },
        arabic: 'وَلِلَّهِ الْأَسْمَاءُ الْحُسْنَىٰ فَادْعُوهُ بِهَا',
      },
      {
        kind: 'hadith',
        ref: 'Sahih al-Bukhari 2736',
        rendering: 'meaning',
        text: {
          en: 'Allah has ninety-nine names; whoever learns and preserves them will enter Paradise.',
          ar: 'إن لله تسعة وتسعين اسمًا، من أحصاها دخل الجنة.',
        },
      },
    ],
    context: {
      en: 'Scholars note Allah’s names are not limited to ninety-nine; the hadith highlights a special set.',
      ar: 'ينبّه العلماء إلى أن أسماء الله لا تنحصر في تسعة وتسعين، وإنما يخص الحديث هذه منها.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-iman',
    topics: ['beliefs'],
    keywords: ['iman', 'faith', 'belief', 'angels', 'books', 'messengers', 'qadar', 'last day', 'إيمان', 'الملائكة', 'الكتب', 'الرسل', 'القدر'],
    question: { en: 'What are the pillars of faith (iman)?', ar: 'ما أركان الإيمان؟' },
    simple: {
      en: 'Faith has six pillars: believing in Allah, His angels, His books, His messengers, the Last Day, and His decree (qadar).',
      ar: 'أركان الإيمان ستة: الإيمان بالله، وملائكته، وكتبه، ورسله، واليوم الآخر، والقدر خيره وشره.',
    },
    deep: {
      en: 'In the famous hadith of Jibril, a man with very white clothes asked the Prophet ﷺ about Islam, iman and ihsan. For iman, the answer named these six. Islam describes outward practice, iman inner belief, and ihsan worshipping Allah as though you see Him.',
      ar: 'في حديث جبريل المشهور سأل رجل شديد بياض الثياب النبيَّ ﷺ عن الإسلام والإيمان والإحسان، فذكر في الإيمان هذه الستة. الإسلام أعمال ظاهرة، والإيمان اعتقاد باطن، والإحسان أن تعبد الله كأنك تراه.',
    },
    example: {
      en: 'If the five pillars are the house, the six pillars of faith are what you believe when you walk through its door.',
      ar: 'إن كانت أركان الإسلام هي البيت، فأركان الإيمان هي ما تؤمن به حين تدخل بابه.',
    },
    why: {
      en: 'Belief gives meaning to practice; practice gives shape to belief.',
      ar: 'الإيمان يعطي العمل معناه، والعمل يعطي الإيمان صورته.',
    },
    confidence: 'consensus',
    evidence: [
      {
        kind: 'hadith',
        ref: 'Sahih Muslim 8',
        rendering: 'meaning',
        text: {
          en: 'Iman is to believe in Allah, His angels, His books, His messengers, the Last Day, and to believe in the decree, its good and its bad.',
          ar: 'أَنْ تُؤْمِنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ وَالْيَوْمِ الْآخِرِ وَتُؤْمِنَ بِالْقَدَرِ خَيْرِهِ وَشَرِّهِ',
        },
        arabic: 'أَنْ تُؤْمِنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ وَالْيَوْمِ الْآخِرِ وَتُؤْمِنَ بِالْقَدَرِ خَيْرِهِ وَشَرِّهِ',
      },
    ],
    context: {
      en: 'This hadith is often called “the mother of the Sunnah” because it summarises the religion.',
      ar: 'يسمى هذا الحديث «أم السنة» لأنه يلخص الدين.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-capacity',
    topics: ['character', 'beliefs'],
    keywords: ['busy', 'tired', 'overwhelmed', 'capacity', 'burden', 'تعبان', 'مشغول', 'طاقة', 'وسع'],
    question: { en: 'What if I can’t do everything today?', ar: 'ماذا لو لم أستطع فعل كل شيء اليوم؟' },
    simple: {
      en: 'Allah does not burden a soul beyond what it can bear. Do what you can, sincerely — small and consistent is loved.',
      ar: 'لا يكلّف الله نفسًا إلا وسعها. افعل ما تستطيع بإخلاص، فالقليل الدائم محبوب.',
    },
    deep: {
      en: 'The Qur’an affirms that Allah only asks of a soul what is within its capacity (2:286), and the Prophet ﷺ taught that the most beloved deeds to Allah are the most consistent, even if small.',
      ar: 'يقرر القرآن أن الله لا يكلّف نفسًا إلا وسعها (٢:٢٨٦)، وعلّم النبي ﷺ أن أحب الأعمال إلى الله أدومها وإن قلّ.',
    },
    example: {
      en: 'On an exam day, five focused minutes of reflection still count. Tomorrow is a new path.',
      ar: 'في يوم الامتحان، خمس دقائق من التأمل الصادق لها قيمتها. وغدًا طريق جديد.',
    },
    why: {
      en: 'Faith is a lifelong journey, not a single race.',
      ar: 'الإيمان رحلة عمر، لا سباق واحد.',
    },
    confidence: 'consensus',
    evidence: [
      {
        kind: 'quran',
        ref: "Qur'an 2:286",
        rendering: 'translation',
        translationName: SI,
        text: {
          en: 'Allah does not charge a soul except [with that within] its capacity.',
          ar: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا',
        },
        arabic: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا',
      },
      {
        kind: 'hadith',
        ref: 'Sahih al-Bukhari 6464',
        rendering: 'meaning',
        text: {
          en: 'The most beloved deeds to Allah are those done consistently, even if they are small.',
          ar: 'أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ',
        },
      },
    ],
    context: {
      en: 'Obligations still matter — this is about kindness to yourself with everything beyond them.',
      ar: 'تبقى الفرائض مهمة، وهذا عن الرفق بالنفس فيما زاد عليها.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-knowledge-dua',
    topics: ['quran'],
    keywords: ['dua knowledge', 'increase me', 'زدني علما', 'علم'],
    question: { en: 'Is there a dua for learning?', ar: 'هل هناك دعاء لطلب العلم؟' },
    simple: {
      en: '“Rabbi zidni ‘ilma” — “My Lord, increase me in knowledge.” It is a short dua from the Qur’an.',
      ar: '«رَبِّ زِدْنِي عِلْمًا» دعاء قصير من القرآن.',
    },
    deep: {
      en: 'This is the only thing in the Qur’an that the Prophet ﷺ is told to ask for more of (20:114) — a sign of how much knowledge is valued.',
      ar: 'هو الشيء الذي أُمر النبي ﷺ في القرآن أن يطلب الزيادة منه (٢٠:١١٤)، دلالة على مكانة العلم.',
    },
    example: {
      en: 'Many students say it before opening a book or starting a lesson.',
      ar: 'يقوله كثير من الطلاب قبل فتح الكتاب أو بدء الدرس.',
    },
    why: {
      en: 'Learning is worship when it begins by asking Allah for it.',
      ar: 'التعلّم عبادة حين يبدأ بسؤال الله إياه.',
    },
    confidence: 'consensus',
    evidence: [
      {
        kind: 'quran',
        ref: "Qur'an 20:114",
        rendering: 'translation',
        translationName: SI,
        text: { en: 'My Lord, increase me in knowledge.', ar: 'رَّبِّ زِدْنِي عِلْمًا' },
        arabic: 'رَّبِّ زِدْنِي عِلْمًا',
      },
    ],
    context: {
      en: 'Some scholars note it was revealed alongside guidance not to rush the recitation of revelation.',
      ar: 'ذكر بعض العلماء أنها نزلت مع توجيه بعدم العجلة بالقرآن.',
    },
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'k-sleep-dua',
    topics: ['terminology'],
    keywords: ['sleep', 'night dua', 'bed', 'نوم', 'دعاء النوم'],
    question: { en: 'What can I say before sleeping?', ar: 'ماذا أقول قبل النوم؟' },
    simple: {
      en: '“Bismika Allahumma amutu wa ahya” — “In Your name, O Allah, I die and I live.”',
      ar: '«بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا».',
    },
    deep: {
      en: 'The Prophet ﷺ would say this when lying down to sleep, and on waking would thank Allah for giving life back after sleep.',
      ar: 'كان النبي ﷺ يقوله إذا أوى إلى فراشه، وإذا استيقظ حمد الله الذي أحياه بعد النوم.',
    },
    example: {
      en: 'Say it softly as you turn off the light — the day ends with remembrance.',
      ar: 'قلها بهدوء وأنت تطفئ النور، فيختم اليوم بالذكر.',
    },
    why: {
      en: 'Sleep is a small reminder of returning to Allah; the dua turns it into a moment of trust.',
      ar: 'النوم تذكير صغير بالرجوع إلى الله، والدعاء يحوله لحظة توكل.',
    },
    confidence: 'consensus',
    evidence: [
      {
        kind: 'hadith',
        ref: 'Sahih al-Bukhari 6324',
        rendering: 'meaning',
        text: { en: 'In Your name, O Allah, I die and I live.', ar: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا' },
        arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
      },
    ],
    context: { en: 'A short, widely taught bedtime dua.', ar: 'دعاء قصير مشهور عند النوم.' },
    reviewStatus: 'demo-unreviewed',
  },
];

export const KNOWLEDGE_BY_ID: Record<string, KnowledgeEntry> = Object.fromEntries(KNOWLEDGE.map((k) => [k.id, k]));

export function getKnowledge(id: string): KnowledgeEntry | undefined {
  return KNOWLEDGE_BY_ID[id];
}
