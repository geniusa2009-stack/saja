import type { HadithActivity } from '@/domain/hadith';

/**
 * SAJA-created activities around the curated Hadith library.
 *
 * These are NOT hadith. Scenarios and stories are original teaching material,
 * clearly labelled as such in the UI. Where an activity asks about a hadith, the
 * exact matn and its source are always one tap away.
 */
export const HADITH_ACTIVITIES: HadithActivity[] = [
  {
    id: 'scenario-new-neighbour',
    kind: 'scenario',
    title: { en: 'The new neighbour', ar: 'الجار الجديد' },
    summary: {
      en: 'A moving van, a rumour, and a loud evening. Choose a gentle response at each turn.',
      ar: 'شاحنة نقل، وهمسة في الممر، ومساء صاخب. اختر استجابة لطيفة في كل موقف.',
    },
    label: { en: 'Original scenario · not a hadith', ar: 'سيناريو من تأليف سجى · ليس حديثًا' },
    hadithIds: ['h-bukhari-6018', 'h-bukhari-10', 'h-bukhari-69'],
    ageBands: ['child', 'teen', 'adult'],
    minutes: 4,
    scenario: {
      en: 'A new family moves in next door. You do not know them yet. Over one day, three small moments ask what faith looks like when no one is watching.',
      ar: 'انتقلت أسرة جديدة إلى المنزل المجاور، ولا تعرفها بعد. على مدار يوم واحد، ثلاث لحظات صغيرة تسأل: كيف يظهر الإيمان حين لا يراك أحد؟',
    },
    steps: [
      {
        id: 'step-move',
        prompt: {
          en: 'A box slips from the moving van. The new neighbour is trying to carry it alone while keeping a child calm.',
          ar: 'سقط صندوق من شاحنة النقل. والجار الجديد يحاول حمله وحده بينما يهدّئ طفلًا صغيرًا.',
        },
        choices: [
          {
            id: 'help',
            label: { en: 'Offer to carry one box and ask if they need anything.', ar: 'أعرض حمل صندوق واحد وأسأل إن كانوا يحتاجون شيئًا.' },
            feedback: {
              en: 'A small, practical help can make a new place feel safer. The hadith about neighbours begins with not harming — and grows into care.',
              ar: 'مساعدة عملية صغيرة تجعل المكان الجديد أكثر أمانًا. حديث الجار يبدأ بترك الأذى ثم ينمو إلى الرعاية.',
            },
            tone: 'gentle',
          },
          {
            id: 'wait',
            label: { en: 'Smile, stay nearby, and help only if they ask.', ar: 'أبتسم وأبقى قريبًا وأساعد فقط إن طلبوا.' },
            feedback: {
              en: 'Respecting someone’s space is also kind. A smile leaves the door open without pushing in.',
              ar: 'احترام مساحة الآخر لطف أيضًا. الابتسامة تفتح الباب دون اقتحام.',
            },
            tone: 'pause',
          },
          {
            id: 'ignore',
            label: { en: 'Pretend you did not see and keep walking.', ar: 'أتظاهر بأني لم أرَ وأكمل طريقي.' },
            feedback: {
              en: 'It is easy to miss a small chance to help. The library can be a place to pause and ask what “neighbour” includes.',
              ar: 'من السهل أن تفوتنا فرصة صغيرة للمساعدة. وتأتي المكتبة لتساعدنا على التوقف والسؤال: من هو الجار؟',
            },
            tone: 'pause',
          },
        ],
      },
      {
        id: 'step-rumour',
        prompt: {
          en: 'At school, someone repeats an unkind rumour about the new neighbour and waits for you to laugh.',
          ar: 'في المدرسة، يكرر أحدهم همسة قاسية عن الجار الجديد وينتظر منك أن تضحك.',
        },
        choices: [
          {
            id: 'refuse',
            label: { en: 'Say you will not pass it on, and change the subject.', ar: 'أقول إنني لن أنقلها وأغيّر الموضوع.' },
            feedback: {
              en: 'Guarding the tongue can protect a whole home. The hadith says: speak good, or remain silent.',
              ar: 'حفظ اللسان قد يحمي بيتًا كاملًا. يقول الحديث: فليقل خيرًا أو ليصمت.',
            },
            tone: 'gentle',
          },
          {
            id: 'ask',
            label: { en: 'Ask the person whether they know it is true.', ar: 'أسأل الشخص: هل تأكدت أن هذا صحيح؟' },
            feedback: {
              en: 'A calm question can stop a rumour without embarrassing anyone. It gives truth a chance.',
              ar: 'سؤال هادئ قد يوقف الهمسة دون إحراج أحد. إنه يعطي الصدق فرصة.',
            },
            tone: 'gentle',
          },
          {
            id: 'join',
            label: { en: 'Laugh along so you do not feel left out.', ar: 'أضحك معهم حتى لا أشعر بالوحدة.' },
            feedback: {
              en: 'Belonging matters, but a laugh can become harm. Next time, even one sentence can change the direction.',
              ar: 'الانتماء مهم، لكن الضحك قد يتحول إلى أذى. في المرة القادمة، حتى جملة واحدة قد تغيّر الاتجاه.',
            },
            tone: 'pause',
          },
        ],
      },
      {
        id: 'step-noise',
        prompt: {
          en: 'Late in the evening, your neighbour’s music is still loud. You are tired and have school tomorrow.',
          ar: 'في وقت متأخر من المساء، ما زال صوت جارك مرتفعًا. أنت متعب وعندك مدرسة غدًا.',
        },
        choices: [
          {
            id: 'breathe',
            label: { en: 'Take a breath, then knock and ask kindly for a quieter hour.', ar: 'أتنفس، ثم أطرق الباب وأطلب بلطف ساعة أهدأ.' },
            feedback: {
              en: 'Self-control is strength. A calm request is more likely to be heard than a hard knock.',
              ar: 'ضبط النفس قوة. والطلب الهادئ أقرب إلى أن يُسمع من الطرق العنيف.',
            },
            tone: 'gentle',
          },
          {
            id: 'message',
            label: { en: 'Send a message in the morning instead of reacting now.', ar: 'أرسل رسالة في الصباح بدل التصرف الآن.' },
            feedback: {
              en: 'Waiting can protect you from saying something you would regret. Choose a clear, respectful message.',
              ar: 'الانتظار قد يحميك من كلمة تندم عليها. اختر رسالة واضحة ومحترمة.',
            },
            tone: 'pause',
          },
          {
            id: 'bang',
            label: { en: 'Bang on the wall until the music stops.', ar: 'أطرق الجدار بقوة حتى يتوقف الصوت.' },
            feedback: {
              en: 'Anger is a signal, not a master. The hadith calls the one who controls themselves strong.',
              ar: 'الغضب إشارة لا سيد. ويسمي الحديث من يملك نفسه عند الغضب قويًا.',
            },
            tone: 'pause',
          },
        ],
      },
    ],
  },
  {
    id: 'match-mercy-words',
    kind: 'match',
    title: { en: 'Words from the library', ar: 'كلمات من المكتبة' },
    summary: {
      en: 'Match four Arabic words from these hadith to the meaning they carry.',
      ar: 'اربط أربع كلمات عربية من هذه الأحاديث بمعانيها.',
    },
    hadithIds: ['h-tirmidhi-1956', 'h-bukhari-7376', 'h-bukhari-6018', 'h-bukhari-6114'],
    ageBands: ['child', 'teen', 'adult'],
    minutes: 3,
    pairs: [
      { id: 'p-sadaqah', arabic: 'صَدَقَة', transliteration: 'ṣadaqah', meaning: { en: 'charity — a giving of good', ar: 'الصدقة — عطاء الخير' } },
      { id: 'p-rahmah', arabic: 'رَحْمَة', transliteration: 'raḥmah', meaning: { en: 'mercy and compassion', ar: 'الرحمة والعطف' } },
      { id: 'p-jar', arabic: 'جَار', transliteration: 'jār', meaning: { en: 'neighbour', ar: 'الجار' } },
      { id: 'p-ghadab', arabic: 'غَضَب', transliteration: 'ghaḍab', meaning: { en: 'anger', ar: 'الغضب' } },
    ],
  },
  {
    id: 'story-two-lamps',
    kind: 'story',
    title: { en: 'The two lamps', ar: 'المصباحان' },
    summary: {
      en: 'An original story about a small habit that outlasts a big promise.',
      ar: 'قصة من تأليف سجى عن عادة صغيرة تدوم أطول من وعد كبير.',
    },
    hadithIds: ['h-bukhari-6464'],
    ageBands: ['child', 'teen', 'adult'],
    minutes: 4,
    label: { en: 'Original SAJA story · not a hadith', ar: 'قصة من تأليف سجى · ليست حديثًا' },
    disclosure: {
      en: 'This story is SAJA’s own teaching material, not a hadith. It is an illustration of the hadith about steady, small deeds — read the hadith and its source alongside it.',
      ar: 'هذه القصة من مواد سجى التعليمية وليست حديثًا. وهي توضيح للحديث الوارد عن دوام العمل القليل، فاقرأ الحديث ومصدره إلى جانبها.',
    },
    pages: [
      {
        title: { en: 'A promise at the gate', ar: 'وعد عند البوابة' },
        body: {
          en: 'Noura promised to water the library’s two new lamps every evening. On the first day she ran there with a full jug. On the third day she was tired and almost forgot.',
          ar: 'وعدت نورة بأن تسقي مصباحي المكتبة الجديدين كل مساء. في اليوم الأول ركضت وهي تحمل إبريقًا ممتلئًا، وفي اليوم الثالث تعبت وكادت تنسى.',
        },
      },
      {
        title: { en: 'The smaller choice', ar: 'الاختيار الأصغر' },
        body: {
          en: 'She chose one small cup of water instead of a full jug. It took less than a minute. The next evening she did the same. Slowly, the tiny act became part of her day.',
          ar: 'اختارت كوبًا صغيرًا من الماء بدل الإبريق الممتلئ. لم يستغرق الأمر دقيقة. وفي المساء التالي فعلت مثل ذلك. بهدوء صار العمل الصغير جزءًا من يومها.',
        },
      },
      {
        title: { en: 'Two steady lights', ar: 'نوران ثابتان' },
        body: {
          en: 'Weeks later, both lamps were still glowing. Noura had not done anything dramatic, but she had kept returning. Her teacher smiled and said, “The deed Allah loves most is the steady one, even when it is small.”',
          ar: 'بعد أسابيع، كان المصباحان ما زالا يضيئان. لم تفعل نورة شيئًا مبهرًا، لكنها عادت كل يوم. ابتسمت معلمتها وقالت: «أحب الأعمال إلى الله أدومها وإن قلّ».',
        },
      },
    ],
  },
  {
    id: 'sort-where-from',
    kind: 'sort',
    title: { en: 'Where does it come from?', ar: 'من أين جاءت العبارة؟' },
    summary: {
      en: 'Separate a hadith matn, a SAJA explanation, and an original scenario.',
      ar: 'ميّز بين متن حديث، وشرح من سجى، وسيناريو من تأليف سجى.',
    },
    hadithIds: ['h-bukhari-5027', 'h-bukhari-7376'],
    ageBands: ['child', 'teen', 'adult'],
    minutes: 4,
    items: [
      {
        id: 'sort-1',
        text: {
          en: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
          ar: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
        },
        correct: 'hadith',
        why: {
          en: 'This is the exact Arabic matn of Sahih al-Bukhari 5027, not a SAJA explanation.',
          ar: 'هذا متن صحيح البخاري ٥٠٢٧ بالعربية، وليس شرحًا من سجى.',
        },
      },
      {
        id: 'sort-2',
        text: {
          en: 'Learning becomes a gift when it is passed on; you do not need to know everything to help someone with what you have learnt.',
          ar: 'يصبح العلم عطاءً حين تنقله؛ لا تحتاج أن تعرف كل شيء لتساعد غيرك بما تعلمته.',
        },
        correct: 'explanation',
        why: {
          en: 'This is SAJA’s explanation of the hadith’s meaning, written for this library.',
          ar: 'هذا شرح من سجى لمعنى الحديث، كُتب لهذه المكتبة.',
        },
      },
      {
        id: 'sort-3',
        text: {
          en: 'A girl helps her younger brother revise one verse before bed, then asks him to teach it back to her.',
          ar: 'تساعد فتاة أخاها الصغير على مراجعة آية قبل النوم، ثم تطلب منه أن يعلّمها إياها.',
        },
        correct: 'scenario',
        why: {
          en: 'This is an original SAJA learning scenario. It is not narrated from the Prophet ﷺ.',
          ar: 'هذا سيناريو تعليمي من تأليف سجى، وليس مرويًا عن النبي ﷺ.',
        },
      },
      {
        id: 'sort-4',
        text: {
          en: 'لَا يَرْحَمُ اللَّهُ مَنْ لَا يَرْحَمُ النَّاسَ',
          ar: 'لَا يَرْحَمُ اللَّهُ مَنْ لَا يَرْحَمُ النَّاسَ',
        },
        correct: 'hadith',
        why: {
          en: 'This is the exact Arabic matn of Sahih al-Bukhari 7376.',
          ar: 'هذا متن صحيح البخاري ٧٣٧٦ بالعربية.',
        },
      },
    ],
  },
  {
    id: 'reflection-mercy',
    kind: 'reflection',
    title: { en: 'A quiet reflection', ar: 'تأمل هادئ' },
    summary: {
      en: 'Two prompts about mercy and small kindness. Nothing is scored.',
      ar: 'سؤالان عن الرحمة واللطف الصغير. لا توجد درجات.',
    },
    hadithIds: ['h-bukhari-7376', 'h-tirmidhi-1956'],
    ageBands: ['child', 'teen', 'adult'],
    minutes: 5,
    prompts: [
      {
        en: 'Where did someone show you mercy or patience this week? How did it feel in your body?',
        ar: 'أين أظهر لك أحدهم رحمة أو صبرًا هذا الأسبوع؟ كيف شعرت بذلك في جسدك؟',
      },
      {
        en: 'What is one small kindness you could offer tomorrow — a smile, a message, or a few minutes of listening?',
        ar: 'ما لطف صغير يمكنك تقديمه غدًا: ابتسامة، أو رسالة، أو بضع دقائق من الإنصات؟',
      },
    ],
  },
  {
    id: 'review-foundations',
    kind: 'review',
    title: { en: 'Gentle review', ar: 'مراجعة لطيفة' },
    summary: {
      en: 'Turn six cards and revisit the meanings you have met.',
      ar: 'اقلب ست بطاقات وراجع المعاني التي تعرّفت عليها.',
    },
    hadithIds: ['h-bukhari-1', 'h-bukhari-69', 'h-bukhari-6018', 'h-bukhari-6114', 'h-bukhari-6464', 'h-tirmidhi-1956'],
    ageBands: ['child', 'teen', 'adult'],
    minutes: 4,
    cards: [
      {
        id: 'card-intention',
        prompt: { en: 'What makes an ordinary action an act of worship?', ar: 'ما الذي يجعل العمل العادي عبادة؟' },
        answer: {
          en: 'The intention behind it. Actions are judged with their intentions, and a good deed can be offered for Allah.',
          ar: 'النية وراءه؛ فالأعمال بالنيات، ويمكن أن يُقصد بالعمل الصالح وجه الله.',
        },
        reference: 'Sahih al-Bukhari 1',
      },
      {
        id: 'card-gentle',
        prompt: { en: 'How should religious teaching be offered?', ar: 'كيف ينبغي تقديم التعليم الديني؟' },
        answer: {
          en: 'With ease and good news, not harshness that pushes people away.',
          ar: 'بالتيسير والبشرى، لا بالقسوة التي تنفّر الناس.',
        },
        reference: 'Sahih al-Bukhari 69',
      },
      {
        id: 'card-neighbour',
        prompt: { en: 'What three duties does the hadith connect with faith?', ar: 'ما الواجبات الثلاثة التي يربطها الحديث بالإيمان؟' },
        answer: {
          en: 'Not harming a neighbour, honouring a guest, and speaking good or remaining silent.',
          ar: 'عدم أذى الجار، وإكرام الضيف، والقول الحسن أو الصمت.',
        },
        reference: 'Sahih al-Bukhari 6018',
      },
      {
        id: 'card-strong',
        prompt: { en: 'Who is the truly strong person?', ar: 'من هو القوي حقًا؟' },
        answer: {
          en: 'The one who controls themselves when anger rises.',
          ar: 'الذي يملك نفسه عند الغضب.',
        },
        reference: 'Sahih al-Bukhari 6114',
      },
      {
        id: 'card-steady',
        prompt: { en: 'Which deeds does Allah love most?', ar: 'أي الأعمال أحب إلى الله؟' },
        answer: {
          en: 'The steady, constant ones — even if they are small.',
          ar: 'الأدوم منها، وإن كانت قليلة.',
        },
        reference: 'Sahih al-Bukhari 6464',
      },
      {
        id: 'card-smile',
        prompt: { en: 'What did the Prophet ﷺ call a smile?', ar: 'بماذا وصف النبي ﷺ الابتسامة؟' },
        answer: {
          en: 'Charity. Small acts of kindness are counted as giving.',
          ar: 'بأنها صدقة؛ فالأعمال الصغيرة من اللطف عطاء.',
        },
        reference: 'Jami‘ at-Tirmidhi 1956',
      },
    ],
  },
];

export const HADITH_ACTIVITY_BY_ID: Record<string, HadithActivity> = Object.fromEntries(HADITH_ACTIVITIES.map((a) => [a.id, a]));
