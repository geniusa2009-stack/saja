import type { L10n, LocationId } from '@/domain/types';

export type StoryChoice = { id: 'consider' | 'explore' | 'rush'; text: L10n; result: L10n };
export type SideStory = {
  id: string; region: LocationId; order: number; arc: number;
  kind: 'investigate' | 'help' | 'organize' | 'verify';
  title: L10n; scene: L10n; objective: L10n;
  choices: StoryChoice[]; reflection: L10n; keepsakeId: string;
  reviewStatus: 'demo-unreviewed'; category: 'fictional-ethical-scenario';
};
export type StoryKeepsake = { id: string; region: LocationId; title: L10n; description: L10n; afterEpisodes: string[] };
export type StoryRegion = { id: LocationId; name: L10n; order: number };
// All entries are original fictional situations. They do not include quotations, legal rulings,
// religious texts, or claims of scholarly verification. They earn no server-side rewards.
export const STORY_REGIONS: StoryRegion[] = [
  {
    "id": "village",
    "name": {
      "ar": "القرية",
      "en": "The Village"
    },
    "order": 1
  },
  {
    "id": "mosque",
    "name": {
      "ar": "ساحة المسجد",
      "en": "Masjid Courtyard"
    },
    "order": 2
  },
  {
    "id": "garden",
    "name": {
      "ar": "حديقة النمو",
      "en": "Garden of Growth"
    },
    "order": 3
  },
  {
    "id": "library",
    "name": {
      "ar": "مكتبة النور",
      "en": "Library of Light"
    },
    "order": 4
  },
  {
    "id": "house",
    "name": {
      "ar": "بيت التعلّم",
      "en": "Learning House"
    },
    "order": 5
  },
  {
    "id": "market",
    "name": {
      "ar": "سوق الليل",
      "en": "Night Market"
    },
    "order": 6
  },
  {
    "id": "reflection",
    "name": {
      "ar": "مساحة التأمل",
      "en": "Reflection Space"
    },
    "order": 7
  },
  {
    "id": "desert",
    "name": {
      "ar": "قافلة الصحراء",
      "en": "Desert Caravan"
    },
    "order": 8
  },
  {
    "id": "mountain",
    "name": {
      "ar": "مرصد الجبل",
      "en": "Mountain Observatory"
    },
    "order": 9
  }
];
export const SIDE_STORIES: SideStory[] = [
  {
    "id": "saja-tale-village-01",
    "region": "village",
    "order": 1,
    "arc": 1,
    "kind": "investigate",
    "title": {
      "ar": "فانوس عند الباب",
      "en": "A Lantern at the Door"
    },
    "scene": {
      "ar": "أمينة وجدت فانوسًا لا يحمل اسم صاحبه قرب الباب القديم.",
      "en": "Amina finds an unlabelled lantern beside the old gate."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تسأل الجيران عن علامته المميزة قبل أن تعيده.",
          "en": "Ask the neighbours about its distinguishing mark before returning it."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-village-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-village-02",
    "region": "village",
    "order": 2,
    "arc": 1,
    "kind": "help",
    "title": {
      "ar": "الزائر الجديد",
      "en": "The New Arrival"
    },
    "scene": {
      "ar": "وصل طفل إلى القرية ولا يعرف الطريق إلى الساحة.",
      "en": "A child arrives in the village and does not know the way to the square."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تعرض أن ترافقه إلى لوحة الإرشادات ثم تترك له الاختيار.",
          "en": "Offer to walk with him to the signpost, then let him choose."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-village-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-village-03",
    "region": "village",
    "order": 3,
    "arc": 1,
    "kind": "organize",
    "title": {
      "ar": "رسالة على الجدار",
      "en": "The Wall Message"
    },
    "scene": {
      "ar": "ظهرت رسالة ناقصة على جدار المدرسة وأخذ الناس يفسرونها بطرق مختلفة.",
      "en": "An incomplete message appears on the school wall and people interpret it differently."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تبحث عن صاحب الرسالة لتعرف سياقها.",
          "en": "Find the author and ask for the missing context."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-village-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-village-04",
    "region": "village",
    "order": 4,
    "arc": 2,
    "kind": "verify",
    "title": {
      "ar": "خبز الجارة",
      "en": "The Neighbour's Bread"
    },
    "scene": {
      "ar": "تركت جارة سلة خبز أمام بيت خالٍ ظنًّا أن أهله عادوا.",
      "en": "A neighbour leaves bread at an empty house, thinking its family has returned."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تتحقق ممن يسكن البيت قبل أن تحرك السلة.",
          "en": "Check who lives there before moving the basket."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-village-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-village-05",
    "region": "village",
    "order": 5,
    "arc": 2,
    "kind": "investigate",
    "title": {
      "ar": "الطريق الضيق",
      "en": "The Narrow Path"
    },
    "scene": {
      "ar": "عربة بطيئة تقف في ممر يستخدمه الجميع وقت الغروب.",
      "en": "A slow cart blocks a narrow lane used by everyone at dusk."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تسأل صاحب العربة إن كان يحتاج مساعدة في إفساح الطريق.",
          "en": "Ask the driver whether he needs help clearing the lane."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-village-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-village-06",
    "region": "village",
    "order": 6,
    "arc": 2,
    "kind": "help",
    "title": {
      "ar": "مفتاح من النحاس",
      "en": "The Brass Key"
    },
    "scene": {
      "ar": "وجدت مفتاحًا نحاسيًا قرب البئر، وثلاثة أبواب تشبه بعضها.",
      "en": "You find a brass key by the well, with three similar doors nearby."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تسجّل مكان العثور عليه وتسلّمه للمسؤول عن المفقودات.",
          "en": "Note where you found it and give it to the lost-property keeper."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-village-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-village-07",
    "region": "village",
    "order": 7,
    "arc": 3,
    "kind": "organize",
    "title": {
      "ar": "صوت خلف النافذة",
      "en": "A Voice at the Window"
    },
    "scene": {
      "ar": "ينادي شخص طلبًا للمساعدة لكنك لا ترى من ينادي.",
      "en": "Someone calls for help, but you cannot see who is calling."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تسأل عما يحتاجه وتحضر بالغًا مسؤولًا إن لزم.",
          "en": "Ask what is needed and involve a responsible adult if necessary."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-village-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-village-08",
    "region": "village",
    "order": 8,
    "arc": 3,
    "kind": "verify",
    "title": {
      "ar": "ضيف على المائدة",
      "en": "An Extra Place"
    },
    "scene": {
      "ar": "تجهز الأسرة مائدة بسيطة ثم يصل ضيف لم يكن في الحسبان.",
      "en": "A family lays a simple table and an unexpected guest arrives."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقترح تقسيم الطعام على نحو يراعي الجميع.",
          "en": "Suggest sharing the available food so everyone is considered."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-village-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-village-09",
    "region": "village",
    "order": 9,
    "arc": 3,
    "kind": "investigate",
    "title": {
      "ar": "دفتر الأسماء",
      "en": "The Book of Names"
    },
    "scene": {
      "ar": "تخطئ لوحة الحي في كتابة اسم أحد السكان.",
      "en": "The neighbourhood board misspells a resident's name."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تسأل صاحب الاسم عن كتابته الصحيحة وتصححها بإذنه.",
          "en": "Ask the resident how to spell it and correct it with permission."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-village-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-village-10",
    "region": "village",
    "order": 10,
    "arc": 4,
    "kind": "help",
    "title": {
      "ar": "الحذاء المفقود",
      "en": "The Missing Shoe"
    },
    "scene": {
      "ar": "اختفى حذاء طفل من أمام باب المكتبة الصغيرة.",
      "en": "A child's shoe goes missing outside the small library."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تبحث بهدوء دون اتهام أحد.",
          "en": "Search calmly without accusing anybody."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-village-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-village-11",
    "region": "village",
    "order": 11,
    "arc": 4,
    "kind": "organize",
    "title": {
      "ar": "الضوء الأخير",
      "en": "The Last Light"
    },
    "scene": {
      "ar": "تنطفئ مصابيح الطريق واحدًا بعد آخر، ويحتار الصغار في العودة.",
      "en": "The path lamps go out one by one and the younger children are unsure how to return."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تنظم مرافقة آمنة إلى البيوت وتخبر المسؤول عن المصابيح.",
          "en": "Arrange a safe walk home and report the broken lamps."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-village-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-village-12",
    "region": "village",
    "order": 12,
    "arc": 4,
    "kind": "verify",
    "title": {
      "ar": "رسمة مشتركة",
      "en": "A Shared Mural"
    },
    "scene": {
      "ar": "يريد ثلاثة أطفال رسم جدارية لكن كل واحد اختار تصميمًا مختلفًا.",
      "en": "Three children want to paint a mural but each has a different design."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تعطي كل واحد فرصة لعرض فكرته ثم تقترح دمج التفاصيل.",
          "en": "Let each child explain their idea, then combine details."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-village-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mosque-01",
    "region": "mosque",
    "order": 1,
    "arc": 1,
    "kind": "investigate",
    "title": {
      "ar": "دور عند النافورة",
      "en": "The Fountain Queue"
    },
    "scene": {
      "ar": "يتزاحم الزوار عند نافورة الساحة ويضيع الدور على شخص صغير.",
      "en": "Visitors crowd the courtyard fountain and a younger person loses their place."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تساعدهم في ترتيب دور واضح للجميع.",
          "en": "Help set up a clear turn-taking order for everyone."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-mosque-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mosque-02",
    "region": "mosque",
    "order": 2,
    "arc": 1,
    "kind": "help",
    "title": {
      "ar": "قطرة في الممر",
      "en": "A Drop on the Path"
    },
    "scene": {
      "ar": "يتجمع الماء قرب باب الساحة وقد ينزلق عليه الزائرون.",
      "en": "Water pools near the courtyard entrance and visitors might slip."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تنبه المشرف وتساعد في وضع إشارة مؤقتة.",
          "en": "Alert the caretaker and help place a temporary warning."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-mosque-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mosque-03",
    "region": "mosque",
    "order": 3,
    "arc": 1,
    "kind": "organize",
    "title": {
      "ar": "الركن الهادئ",
      "en": "The Quiet Corner"
    },
    "scene": {
      "ar": "يبحث زائر عن زاوية هادئة بينما يتحدث بعض الأصدقاء بصوت عالٍ.",
      "en": "A visitor looks for a quiet corner while friends speak loudly."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تطلب من الأصدقاء خفض الصوت بلطف.",
          "en": "Gently ask the friends to lower their voices."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-mosque-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mosque-04",
    "region": "mosque",
    "order": 4,
    "arc": 2,
    "kind": "verify",
    "title": {
      "ar": "حقيبة في الساحة",
      "en": "A Bag in the Courtyard"
    },
    "scene": {
      "ar": "بقيت حقيبة صغيرة بعد مغادرة أصحابها ولا تعرف لمن تعود.",
      "en": "A small bag remains after visitors leave and its owner is unknown."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تخبر المشرف بمكانها دون تفتيش محتوياتها.",
          "en": "Tell the caretaker where it is without searching inside."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-mosque-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mosque-05",
    "region": "mosque",
    "order": 5,
    "arc": 2,
    "kind": "investigate",
    "title": {
      "ar": "الساعة المتأخرة",
      "en": "The Late Clock"
    },
    "scene": {
      "ar": "تختلف ساعتان معروضتان على لوحة المواعيد في الساحة.",
      "en": "Two clocks on the courtyard noticeboard show different times."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تتحقق من المصدر المعلن قبل تحديث اللوحة.",
          "en": "Check the announced source before changing the board."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-mosque-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mosque-06",
    "region": "mosque",
    "order": 6,
    "arc": 2,
    "kind": "help",
    "title": {
      "ar": "الصفحة المبتلة",
      "en": "The Damp Page"
    },
    "scene": {
      "ar": "تتعرض ورقة تعليمية في المدخل لرذاذ النافورة.",
      "en": "A teaching sheet at the entrance gets splashed by the fountain."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تنقل الخبر للمشرف وتساعد في حفظ الورقة بعناية.",
          "en": "Tell the caretaker and help protect the sheet carefully."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-mosque-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mosque-07",
    "region": "mosque",
    "order": 7,
    "arc": 3,
    "kind": "organize",
    "title": {
      "ar": "الممر المفتوح",
      "en": "An Open Passage"
    },
    "scene": {
      "ar": "تحجب صناديق تنظيف الطريق المستخدم للكراسي المتحركة.",
      "en": "Cleaning boxes block the path used by wheelchair visitors."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تطلب إبعاد الصناديق وفتح الممر للجميع.",
          "en": "Ask for the boxes to be moved and the passage reopened."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-mosque-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mosque-08",
    "region": "mosque",
    "order": 8,
    "arc": 3,
    "kind": "verify",
    "title": {
      "ar": "نبات الساحة",
      "en": "The Courtyard Plant"
    },
    "scene": {
      "ar": "تبدو نبتة الساحة ذابلة لكن جدول ريّها غير معروف.",
      "en": "A courtyard plant looks dry, but nobody knows its watering schedule."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تسأل المسؤول قبل إضافة الماء حتى لا تضر الجذور.",
          "en": "Ask the caretaker before watering, to avoid harming the roots."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-mosque-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mosque-09",
    "region": "mosque",
    "order": 9,
    "arc": 3,
    "kind": "investigate",
    "title": {
      "ar": "إشارة باهتة",
      "en": "The Faded Sign"
    },
    "scene": {
      "ar": "بهتت إشارة مكان الأحذية وصار الزوار يضعونها في الطريق.",
      "en": "The shoe-area sign has faded and visitors leave shoes in the walkway."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تجهز مع المشرف إشارة واضحة ومتاحة للجميع.",
          "en": "Work with the caretaker on a clear, accessible sign."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-mosque-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mosque-10",
    "region": "mosque",
    "order": 10,
    "arc": 4,
    "kind": "help",
    "title": {
      "ar": "باب لكبار السن",
      "en": "A Door for Elders"
    },
    "scene": {
      "ar": "باب ثقيل يصعب فتحه على بعض كبار السن.",
      "en": "A heavy door is difficult for some older visitors to open."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تعرض المساعدة وتسأل إن كانوا يفضلون بابًا آخر أسهل.",
          "en": "Offer help and ask whether they prefer an easier entrance."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-mosque-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mosque-11",
    "region": "mosque",
    "order": 11,
    "arc": 4,
    "kind": "organize",
    "title": {
      "ar": "ماء بلا هدر",
      "en": "Water without Waste"
    },
    "scene": {
      "ar": "صنبور في الساحة لا يغلق جيدًا ويستمر في التنقيط.",
      "en": "A courtyard tap does not close properly and keeps dripping."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تبلغ المسؤول عن العطل وتضع علامة على الصنبور.",
          "en": "Report the fault and mark the tap for repair."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-mosque-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mosque-12",
    "region": "mosque",
    "order": 12,
    "arc": 4,
    "kind": "verify",
    "title": {
      "ar": "مائدة المشاركة",
      "en": "The Shared Table"
    },
    "scene": {
      "ar": "يريد المتطوعون توزيع الماء لكنهم لم يراعوا ازدحام الممر.",
      "en": "Volunteers want to offer water but have not considered the busy walkway."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقترح ركنًا لا يعيق الوصول للجميع.",
          "en": "Suggest a spot that leaves the path accessible."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-mosque-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-garden-01",
    "region": "garden",
    "order": 1,
    "arc": 1,
    "kind": "investigate",
    "title": {
      "ar": "البذرة الغريبة",
      "en": "The Unfamiliar Seed"
    },
    "scene": {
      "ar": "وجد إدريس بذرة مجهولة قرب أحواض الزراعة ويريد غرسها فورًا.",
      "en": "Idris finds an unknown seed near the beds and wants to plant it immediately."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تطلب معرفة نوعها وتأثيرها قبل زراعتها.",
          "en": "Find out what it is and whether it belongs here before planting."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-garden-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-garden-02",
    "region": "garden",
    "order": 2,
    "arc": 1,
    "kind": "help",
    "title": {
      "ar": "غصن مكسور",
      "en": "The Broken Branch"
    },
    "scene": {
      "ar": "انكسر غصن صغير في العاصفة، واختلف الأصدقاء حول طريقة إصلاحه.",
      "en": "A branch breaks in a storm and friends disagree about what to do."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تسأل البستاني عن طريقة آمنة للتعامل معه.",
          "en": "Ask the gardener for a safe way to handle it."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-garden-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-garden-03",
    "region": "garden",
    "order": 3,
    "arc": 1,
    "kind": "organize",
    "title": {
      "ar": "الماء بين الحوضين",
      "en": "Water Between Beds"
    },
    "scene": {
      "ar": "حوضان يحتاجان الريّ ولكن كمية الماء المتاحة محدودة.",
      "en": "Two beds need water, but the available amount is limited."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تفحص التربة واحتياج كل حوض قبل التوزيع.",
          "en": "Check the soil and each bed's needs before dividing water."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-garden-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-garden-04",
    "region": "garden",
    "order": 4,
    "arc": 2,
    "kind": "verify",
    "title": {
      "ar": "زائر ذو جناحين",
      "en": "A Winged Visitor"
    },
    "scene": {
      "ar": "دخلت فراشة إلى بيت النباتات وظلت تدور عند الزجاج.",
      "en": "A butterfly enters the greenhouse and keeps circling the window."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تفتح مخرجًا مناسبًا برفق وتترك لها مساحة.",
          "en": "Gently open a suitable exit and give it space."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-garden-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-garden-05",
    "region": "garden",
    "order": 5,
    "arc": 2,
    "kind": "investigate",
    "title": {
      "ar": "الأداة المفقودة",
      "en": "The Missing Trowel"
    },
    "scene": {
      "ar": "لم يجد فريق الحديقة مجرفته التي يحتاجها الجميع.",
      "en": "The garden team cannot find the trowel everybody shares."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تنظم البحث وتراجع مكان الأدوات دون لوم أحد.",
          "en": "Organise the search and check the tool station without blame."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-garden-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-garden-06",
    "region": "garden",
    "order": 6,
    "arc": 2,
    "kind": "help",
    "title": {
      "ar": "الشجرة الصغيرة",
      "en": "The Young Tree"
    },
    "scene": {
      "ar": "زرع الأطفال شجرة لكن لوحة الاسم تخص نوعًا آخر.",
      "en": "Children plant a tree, but its label belongs to another species."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تراجع الوصف مع البستاني وتصلح البطاقة.",
          "en": "Check the description with the gardener and correct the label."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-garden-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-garden-07",
    "region": "garden",
    "order": 7,
    "arc": 3,
    "kind": "organize",
    "title": {
      "ar": "طريق النمل",
      "en": "The Ant Trail"
    },
    "scene": {
      "ar": "يمر طريق النمل بجوار مكان اللعب، ويريد البعض إزالته بسرعة.",
      "en": "An ant trail crosses the play area, and some want it cleared immediately."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تبحث عن طريقة تحمي الأطفال والكائنات دون إيذاء غير لازم.",
          "en": "Look for a way to protect children and living things without needless harm."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-garden-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-garden-08",
    "region": "garden",
    "order": 8,
    "arc": 3,
    "kind": "verify",
    "title": {
      "ar": "حديقة للجميع",
      "en": "A Garden for Everyone"
    },
    "scene": {
      "ar": "توجد أحواض جميلة لكن الطريق بينها ضيق لكرسي متحرك.",
      "en": "The beds look beautiful, but the path between them is too narrow for a wheelchair."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقترح إعادة ترتيب الأحواض مع المشرف لتحسين الوصول.",
          "en": "Suggest rearranging the beds with the caretaker for better access."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-garden-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-garden-09",
    "region": "garden",
    "order": 9,
    "arc": 3,
    "kind": "investigate",
    "title": {
      "ar": "سماء بعد المطر",
      "en": "After the Rain"
    },
    "scene": {
      "ar": "انتهى المطر والطرق موحلة، ويريد الأطفال الدخول فورًا.",
      "en": "The rain has stopped, the paths are muddy, and children want to rush in."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تحدد مسارًا آمنًا وتحافظ على النباتات الصغيرة.",
          "en": "Mark a safe path that protects the young plants."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-garden-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-garden-10",
    "region": "garden",
    "order": 10,
    "arc": 4,
    "kind": "help",
    "title": {
      "ar": "زائر الحديقة",
      "en": "The Garden Guest"
    },
    "scene": {
      "ar": "يريد زائر قطف زهرة نادرة ليحتفظ بها ذكرى.",
      "en": "A visitor wants to pick a rare flower as a souvenir."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تعرض عليه تصوير الزهرة وتركها لتنمو.",
          "en": "Offer to photograph the flower and leave it growing."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-garden-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-garden-11",
    "region": "garden",
    "order": 11,
    "arc": 4,
    "kind": "organize",
    "title": {
      "ar": "صندوق السماد",
      "en": "The Compost Box"
    },
    "scene": {
      "ar": "اختلطت بقايا طعام بمواد لا تصلح لصندوق السماد.",
      "en": "Food scraps get mixed with materials that do not belong in the compost."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تفرز المحتويات مع المشرف باستخدام تعليمات الحديقة.",
          "en": "Sort the contents with the caretaker using the garden's guidance."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-garden-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-garden-12",
    "region": "garden",
    "order": 12,
    "arc": 4,
    "kind": "verify",
    "title": {
      "ar": "ظل المقعد",
      "en": "The Shady Bench"
    },
    "scene": {
      "ar": "المقعد الوحيد في الظل مشغول بالأغراض بينما يحتاجه زائر للتوقف.",
      "en": "The only shaded bench holds belongings while a visitor needs to rest."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تسأل أصحاب الأغراض بلطف أن يفسحوا مكانًا.",
          "en": "Politely ask the owners to make room."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-garden-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-library-01",
    "region": "library",
    "order": 1,
    "arc": 1,
    "kind": "investigate",
    "title": {
      "ar": "الصفحة بلا مصدر",
      "en": "The Unsourced Page"
    },
    "scene": {
      "ar": "تنتشر ورقة تدعي معلومة مهمة بلا اسم كتاب أو مؤلف.",
      "en": "A sheet makes an important claim without naming a book or author."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تطلب المصدر الأصلي قبل نشرها بين الزوار.",
          "en": "Ask for the original source before sharing it."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-library-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-library-02",
    "region": "library",
    "order": 2,
    "arc": 1,
    "kind": "help",
    "title": {
      "ar": "حكايتان مختلفتان",
      "en": "Two Different Accounts"
    },
    "scene": {
      "ar": "يصف كتابان الحدث نفسه بعبارات مختلفة.",
      "en": "Two books describe the same event differently."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقارن الإحالات والتواريخ وتدوّن مواضع الاختلاف.",
          "en": "Compare references and dates and note the differences."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-library-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-library-03",
    "region": "library",
    "order": 3,
    "arc": 1,
    "kind": "organize",
    "title": {
      "ar": "عنوان مضلل",
      "en": "A Misleading Title"
    },
    "scene": {
      "ar": "كتب أحدهم عنوانًا مثيرًا لا يعكس محتوى الصفحة.",
      "en": "Someone writes a dramatic title that misrepresents a page."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقترح عنوانًا أمينًا يلخص ما تقوله الصفحة فعلًا.",
          "en": "Suggest a fair title that reflects the page's actual content."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-library-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-library-04",
    "region": "library",
    "order": 4,
    "arc": 2,
    "kind": "verify",
    "title": {
      "ar": "الخريطة الممزقة",
      "en": "The Torn Map"
    },
    "scene": {
      "ar": "خريطة قديمة ممزقة وتحتاج إلى ترتيب القطع لفهم الطريق.",
      "en": "An old map is torn and its pieces need sorting to trace a route."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "ترتب القطع وفق العلامات الواضحة دون اختراع أجزاء مفقودة.",
          "en": "Arrange pieces using visible landmarks without inventing missing parts."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-library-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-library-05",
    "region": "library",
    "order": 5,
    "arc": 2,
    "kind": "investigate",
    "title": {
      "ar": "نسخة غير مكتملة",
      "en": "An Incomplete Copy"
    },
    "scene": {
      "ar": "تعرض المكتبة نسخة تفتقد آخر صفحتين.",
      "en": "The library displays a copy missing its last two pages."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تضع تنبيهًا واضحًا بالنقص وتبحث عن نسخة كاملة.",
          "en": "Label the missing pages clearly and look for a complete copy."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-library-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-library-06",
    "region": "library",
    "order": 6,
    "arc": 2,
    "kind": "help",
    "title": {
      "ar": "اقتباس على الباب",
      "en": "A Quote at the Door"
    },
    "scene": {
      "ar": "عُلّق اقتباس منسوب لشخصية معروفة دون مرجع.",
      "en": "A quotation is attributed to a famous person without a reference."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تتحقق من النسبة قبل اعتماد البطاقة.",
          "en": "Verify the attribution before approving the card."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-library-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-library-07",
    "region": "library",
    "order": 7,
    "arc": 3,
    "kind": "organize",
    "title": {
      "ar": "حبران مختلفان",
      "en": "Two Different Inks"
    },
    "scene": {
      "ar": "تظهر إضافة بحبر مختلف في هامش مخطوطة مصورة.",
      "en": "A photographed manuscript has a margin note in a different ink."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تسجل أنها ملاحظة لاحقة محتملة بدل الجزم بهويتها.",
          "en": "Record it as a possible later note rather than claiming certainty."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-library-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-library-08",
    "region": "library",
    "order": 8,
    "arc": 3,
    "kind": "verify",
    "title": {
      "ar": "فهرس جديد",
      "en": "A Better Catalogue"
    },
    "scene": {
      "ar": "يتوه الزوار بين عناوين متشابهة في فهرس المكتبة.",
      "en": "Visitors struggle with similar titles in the library catalogue."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقترح حقولًا للمؤلف والموضوع وتاريخ الطبعة.",
          "en": "Suggest fields for author, subject, and edition date."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-library-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-library-09",
    "region": "library",
    "order": 9,
    "arc": 3,
    "kind": "investigate",
    "title": {
      "ar": "كتاب للجميع",
      "en": "A Book for Everyone"
    },
    "scene": {
      "ar": "لا يستطيع أحد الزوار قراءة الخط الصغير في كتاب تعليمي.",
      "en": "A visitor cannot comfortably read the tiny print in a learning book."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تبحث عن نسخة بخط أكبر أو قراءة صوتية مأذون بها.",
          "en": "Look for a large-print version or permitted audio reading."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-library-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-library-10",
    "region": "library",
    "order": 10,
    "arc": 4,
    "kind": "help",
    "title": {
      "ar": "أرقام الصفحات",
      "en": "The Page Numbers"
    },
    "scene": {
      "ar": "تشير بطاقة المكتبة لصفحة لم تعد تطابق الطبعة الجديدة.",
      "en": "The catalogue points to a page that shifted in a newer edition."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تحدّث رقم الطبعة والصفحة معًا.",
          "en": "Update both the edition and page reference."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-library-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-library-11",
    "region": "library",
    "order": 11,
    "arc": 4,
    "kind": "organize",
    "title": {
      "ar": "خبر في الرسائل",
      "en": "A Message Making Rounds"
    },
    "scene": {
      "ar": "تصل رسالة منتشرة وتطلب إعادة إرسال معلومة غير موثقة.",
      "en": "A forwarded message asks people to reshare an unverified claim."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تتوقف عن إعادة النشر وتبحث عن مصدر موثوق.",
          "en": "Pause sharing and check a trustworthy source."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-library-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-library-12",
    "region": "library",
    "order": 12,
    "arc": 4,
    "kind": "verify",
    "title": {
      "ar": "أسئلة هدى",
      "en": "Huda's Questions"
    },
    "scene": {
      "ar": "تسأل هدى عن الفرق بين الرأي والمعلومة المدعومة بالدليل.",
      "en": "Huda asks how to tell an opinion from an evidence-backed claim."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تصنف العبارات بحسب الأدلة المتاحة وتشرح حدود معرفتك.",
          "en": "Sort statements by available evidence and explain uncertainty."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-library-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-house-01",
    "region": "house",
    "order": 1,
    "arc": 1,
    "kind": "investigate",
    "title": {
      "ar": "كرسي فارغ",
      "en": "An Empty Chair"
    },
    "scene": {
      "ar": "يريد فريق البيت استقبال زائر جديد لكن المقاعد محدودة.",
      "en": "The house team wants to welcome a new visitor but seats are limited."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تعيدون ترتيب المكان بموافقة الجميع ليجد الزائر موضعًا.",
          "en": "Rearrange the space together so the visitor has a place."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-house-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-house-02",
    "region": "house",
    "order": 2,
    "arc": 1,
    "kind": "help",
    "title": {
      "ar": "تعليم الأخت",
      "en": "Helping a Sister Learn"
    },
    "scene": {
      "ar": "تتعثر طفلة في قراءة تعليمات نشاط وتخجل من السؤال.",
      "en": "A younger girl struggles to read activity instructions and hesitates to ask."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تعرض الشرح خطوة خطوة دون إحراجها.",
          "en": "Offer a step-by-step explanation without embarrassing her."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-house-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-house-03",
    "region": "house",
    "order": 3,
    "arc": 1,
    "kind": "organize",
    "title": {
      "ar": "خطة الأسبوع",
      "en": "A Plan for the Week"
    },
    "scene": {
      "ar": "تتراكم الأنشطة المنزلية ولا يعرف الفريق من يبدأ.",
      "en": "House tasks pile up and nobody knows where to start."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقسم المهام بحسب الوقت والقدرة مع الجميع.",
          "en": "Divide tasks fairly by time and ability with everyone."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-house-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-house-04",
    "region": "house",
    "order": 4,
    "arc": 2,
    "kind": "verify",
    "title": {
      "ar": "النافذة المشرعة",
      "en": "The Open Window"
    },
    "scene": {
      "ar": "دخل الغبار من نافذة القاعة قبل وصول الضيوف.",
      "en": "Dust blows through the hall window before guests arrive."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقترح خطة بسيطة لتنظيف المكان وتقاسم العمل.",
          "en": "Suggest a simple clean-up plan and share the work."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-house-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-house-05",
    "region": "house",
    "order": 5,
    "arc": 2,
    "kind": "investigate",
    "title": {
      "ar": "الكأس المكسور",
      "en": "The Broken Cup"
    },
    "scene": {
      "ar": "انكسر كأس في بيت التعلم وخشي صاحبه إخبار الآخرين.",
      "en": "A cup breaks in the learning house and its owner is afraid to tell anyone."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تساعده على إبلاغ المسؤول وطلب تنظيف آمن.",
          "en": "Help him tell the caretaker and request safe clean-up."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-house-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-house-06",
    "region": "house",
    "order": 6,
    "arc": 2,
    "kind": "help",
    "title": {
      "ar": "ضيف يختلف عنا",
      "en": "A Guest with a Different View"
    },
    "scene": {
      "ar": "يشارك زائر رأيًا مختلفًا في نقاش عائلي هادئ.",
      "en": "A guest shares a different view during a calm family discussion."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تستمع كاملًا وتسأل سؤالًا لفهم مقصده قبل الرد.",
          "en": "Listen fully and ask what the guest means before responding."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-house-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-house-07",
    "region": "house",
    "order": 7,
    "arc": 3,
    "kind": "organize",
    "title": {
      "ar": "صندوق المشاركة",
      "en": "The Sharing Box"
    },
    "scene": {
      "ar": "وضع شخص أداة في صندوق المشاركة دون توضيح إن كانت للإعارة.",
      "en": "Someone puts a tool in the sharing box without saying if it is a loan."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تسأل عن شروط الاستخدام وتضيف بطاقة واضحة.",
          "en": "Ask about the terms of use and add a clear label."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-house-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-house-08",
    "region": "house",
    "order": 8,
    "arc": 3,
    "kind": "verify",
    "title": {
      "ar": "إصلاح المصباح",
      "en": "The Lamp Repair"
    },
    "scene": {
      "ar": "تعطل مصباح القراءة وتحمس بعض الصغار لإصلاح الكهرباء بأنفسهم.",
      "en": "A reading lamp fails and younger children want to fix the wiring themselves."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تبعدهم عن السلك وتطلب مساعدة بالغ مختص.",
          "en": "Keep them away from the wiring and ask a qualified adult for help."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-house-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-house-09",
    "region": "house",
    "order": 9,
    "arc": 3,
    "kind": "investigate",
    "title": {
      "ar": "عشاء مبكر",
      "en": "The Early Supper"
    },
    "scene": {
      "ar": "يفضل بعض أفراد البيت الأكل مبكرًا والبعض يتأخر.",
      "en": "Some household members eat early while others arrive later."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقترح ترتيبًا يحفظ نصيب المتأخرين دون إفساد الطعام.",
          "en": "Plan to keep food available for late arrivals safely."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-house-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-house-10",
    "region": "house",
    "order": 10,
    "arc": 4,
    "kind": "help",
    "title": {
      "ar": "كلمة طيبة",
      "en": "A Kind Word"
    },
    "scene": {
      "ar": "أساء طفل فهم تعليق فشعر أنه غير مرحب به.",
      "en": "A child misunderstands a comment and feels unwelcome."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تستمع لما سمعه ثم توضح المقصود بلطف.",
          "en": "Listen to what he heard and gently clarify the intention."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-house-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-house-11",
    "region": "house",
    "order": 11,
    "arc": 4,
    "kind": "organize",
    "title": {
      "ar": "مكان للكتب",
      "en": "Space for Books"
    },
    "scene": {
      "ar": "امتلأت الرفوف والكتب الجديدة مكدسة قرب الباب.",
      "en": "The shelves fill up and new books pile up near the door."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تنظم الرفوف وتترك الممر خاليًا.",
          "en": "Organise the shelves and keep the entrance clear."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-house-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-house-12",
    "region": "house",
    "order": 12,
    "arc": 4,
    "kind": "verify",
    "title": {
      "ar": "لوحة المواهب",
      "en": "The Skills Board"
    },
    "scene": {
      "ar": "يتردد صديق في المشاركة لأن موهبته مختلفة عن بقية المجموعة.",
      "en": "A friend hesitates to join because his skill differs from the group's."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تفتح المجال لمساهمات متعددة دون مقارنة الناس ببعض.",
          "en": "Welcome different contributions without comparing people."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-house-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-market-01",
    "region": "market",
    "order": 1,
    "arc": 1,
    "kind": "investigate",
    "title": {
      "ar": "ميزان بلا مؤشر",
      "en": "The Unmarked Scale"
    },
    "scene": {
      "ar": "لم يعد مؤشر الميزان واضحًا عند بائعة التوابل.",
      "en": "The spice seller's scale pointer is hard to read."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تطلب معايرة الميزان قبل إتمام البيع.",
          "en": "Ask for the scale to be calibrated before trading."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-market-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-market-02",
    "region": "market",
    "order": 2,
    "arc": 1,
    "kind": "help",
    "title": {
      "ar": "عملة في الأرض",
      "en": "A Coin on the Ground"
    },
    "scene": {
      "ar": "وجدت قطعة نقدية قرب كشك مزدحم ولا تعرف صاحبها.",
      "en": "You find a coin near a crowded stall and do not know who dropped it."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تسلمها لمسؤول السوق وفق نظام المفقودات.",
          "en": "Hand it to the market keeper under the lost-property rules."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-market-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-market-03",
    "region": "market",
    "order": 3,
    "arc": 1,
    "kind": "organize",
    "title": {
      "ar": "وصف ناقص",
      "en": "The Missing Description"
    },
    "scene": {
      "ar": "تعرض بطاقة سلعة مزاياها لكنها تخفي عيبًا معروفًا.",
      "en": "A product card lists benefits but hides a known flaw."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقترح إضافة الوصف الكامل قبل عرضها للبيع.",
          "en": "Suggest adding the complete description before selling."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-market-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-market-04",
    "region": "market",
    "order": 4,
    "arc": 2,
    "kind": "verify",
    "title": {
      "ar": "دور في الطابور",
      "en": "The Market Queue"
    },
    "scene": {
      "ar": "يحاول مشترٍ تجاوز الطابور لأن طلبه يبدو صغيرًا.",
      "en": "A buyer tries to skip the queue because the purchase looks small."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تطلب تنظيم الدور للجميع دون إحراج الشخص.",
          "en": "Ask everyone to follow the line without embarrassing him."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-market-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-market-05",
    "region": "market",
    "order": 5,
    "arc": 2,
    "kind": "investigate",
    "title": {
      "ar": "عقد مستعجل",
      "en": "A Rushed Agreement"
    },
    "scene": {
      "ar": "يريد تاجران الاتفاق سريعًا بينما لم يحددا وقت التسليم.",
      "en": "Two traders want a quick agreement without setting a delivery time."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقترح تدوين الشروط المتفق عليها أولًا.",
          "en": "Suggest writing down the agreed terms first."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-market-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-market-06",
    "region": "market",
    "order": 6,
    "arc": 2,
    "kind": "help",
    "title": {
      "ar": "الثمنان",
      "en": "Two Price Tags"
    },
    "scene": {
      "ar": "وضعت على سلعة بطاقتا سعر مختلفتان.",
      "en": "A product carries two different price tags."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تستوضح السعر الصحيح من المسؤول قبل الدفع.",
          "en": "Confirm the correct price with the seller before paying."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-market-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-market-07",
    "region": "market",
    "order": 7,
    "arc": 3,
    "kind": "organize",
    "title": {
      "ar": "إصلاح مجاني",
      "en": "A Free Repair"
    },
    "scene": {
      "ar": "يعرض صانع إصلاحًا مجانيًا لكنه لم يوضح ما يشمله.",
      "en": "A craftsperson offers a free repair but has not said what it covers."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تسأل عما سيصلح ومدة العمل قبل الموافقة.",
          "en": "Ask what will be repaired and how long it may take before agreeing."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-market-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-market-08",
    "region": "market",
    "order": 8,
    "arc": 3,
    "kind": "verify",
    "title": {
      "ar": "سلة ثقيلة",
      "en": "The Heavy Basket"
    },
    "scene": {
      "ar": "يحاول زائر حمل سلة أثقل من قدرته بين الأكشاك.",
      "en": "A visitor struggles with a heavy basket among stalls."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تعرض المساعدة أو إيجاد عربة بموافقته.",
          "en": "Offer help or find a cart with their permission."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-market-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-market-09",
    "region": "market",
    "order": 9,
    "arc": 3,
    "kind": "investigate",
    "title": {
      "ar": "منتج مشابه",
      "en": "An Almost Identical Product"
    },
    "scene": {
      "ar": "يشبه صندوق منتج معروفًا لكن اسمه مختلف قليلًا.",
      "en": "A box resembles a known product but has a slightly different name."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقرأ الملصق كاملًا وتسأل عن المنشأ والمحتوى.",
          "en": "Read the entire label and ask about origin and contents."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-market-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-market-10",
    "region": "market",
    "order": 10,
    "arc": 4,
    "kind": "help",
    "title": {
      "ar": "الطريق إلى المنزل",
      "en": "The Route Home"
    },
    "scene": {
      "ar": "اكتشف مشترٍ أن مشترياته لا تناسب وسيلة العودة.",
      "en": "A buyer realises their purchases are hard to carry home."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تساعده في مراجعة الخيارات قبل تحميل أي شيء.",
          "en": "Help review transport options before loading anything."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-market-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-market-11",
    "region": "market",
    "order": 11,
    "arc": 4,
    "kind": "organize",
    "title": {
      "ar": "صندوق التبرع",
      "en": "The Donation Box"
    },
    "scene": {
      "ar": "وضع أحد الأكشاك صندوق دعم دون توضيح الجهة المستفيدة.",
      "en": "A stall puts out a support box without saying who receives the money."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تسأل عن الجهة والمسؤولية وتطلب إعلانًا واضحًا.",
          "en": "Ask who receives it and request clear information."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-market-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-market-12",
    "region": "market",
    "order": 12,
    "arc": 4,
    "kind": "verify",
    "title": {
      "ar": "آخر قطعة",
      "en": "The Last Item"
    },
    "scene": {
      "ar": "يريد شخصان آخر قطعة من منتج ضروري لفعالية مشتركة.",
      "en": "Two people both need the final item for a shared event."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقترح حوارًا عن الحاجة أو بديلًا يرضيهما.",
          "en": "Suggest discussing their needs or finding an acceptable alternative."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-market-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-reflection-01",
    "region": "reflection",
    "order": 1,
    "arc": 1,
    "kind": "investigate",
    "title": {
      "ar": "رسالة لنفسك",
      "en": "A Note to Yourself"
    },
    "scene": {
      "ar": "انتهى يوم مزدحم وفي ذهنك أشياء كثيرة لم تكتمل.",
      "en": "A busy day ends with many unfinished thoughts."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تكتب خطوة صغيرة واقعية لليوم التالي دون لوم نفسك.",
          "en": "Write one realistic next step for tomorrow without self-criticism."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-reflection-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-reflection-02",
    "region": "reflection",
    "order": 2,
    "arc": 1,
    "kind": "help",
    "title": {
      "ar": "شيء لاحظته",
      "en": "Something You Noticed"
    },
    "scene": {
      "ar": "تذكرت مساعدة صغيرة قدّمها لك أحدهم اليوم.",
      "en": "You remember a small favour somebody offered today."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تفكر في طريقة بسيطة لشكره تحترم خصوصيته.",
          "en": "Think of a simple way to thank them while respecting privacy."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-reflection-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-reflection-03",
    "region": "reflection",
    "order": 3,
    "arc": 1,
    "kind": "organize",
    "title": {
      "ar": "لحظة هدوء",
      "en": "A Quiet Moment"
    },
    "scene": {
      "ar": "يوجد في الحديقة مقعد هادئ لكنه ليس متاحًا للجميع.",
      "en": "The garden has a quiet bench but not everyone can reach it."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقترح مكانًا آخر يمكن للجميع استخدامه.",
          "en": "Suggest another quiet spot everyone can access."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-reflection-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-reflection-04",
    "region": "reflection",
    "order": 4,
    "arc": 2,
    "kind": "verify",
    "title": {
      "ar": "بطاقة تقدير",
      "en": "An Appreciation Card"
    },
    "scene": {
      "ar": "يريد الفريق شكر متطوع خجول لا يحب الظهور أمام الناس.",
      "en": "The team wants to thank a shy volunteer who dislikes public attention."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تسأله إن كان يفضل الشكر على انفراد.",
          "en": "Ask if they prefer to be thanked privately."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-reflection-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-reflection-05",
    "region": "reflection",
    "order": 5,
    "arc": 2,
    "kind": "investigate",
    "title": {
      "ar": "إعادة المحاولة",
      "en": "Trying Again"
    },
    "scene": {
      "ar": "لم تنجح لعبة ترتيب القطع في المحاولة الأولى.",
      "en": "The pattern puzzle does not work on your first attempt."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تراجع خطوة واحدة وتجرب حلًا مختلفًا.",
          "en": "Review one step and try a different approach."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-reflection-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-reflection-06",
    "region": "reflection",
    "order": 6,
    "arc": 2,
    "kind": "help",
    "title": {
      "ar": "يوم بلا مقارنة",
      "en": "A Day without Comparison"
    },
    "scene": {
      "ar": "يخبرك صديق أنه يقارن سرعة تعلّمه بزملائه.",
      "en": "A friend says he compares his learning speed with classmates."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تساعده في ملاحظة تقدمه الخاص بدل ترتيب الناس.",
          "en": "Help him notice his own progress rather than ranking people."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-reflection-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-reflection-07",
    "region": "reflection",
    "order": 7,
    "arc": 3,
    "kind": "organize",
    "title": {
      "ar": "مساحة للصمت",
      "en": "Room for Silence"
    },
    "scene": {
      "ar": "يريد صديق التوقف قليلًا عن الحديث بعد يوم متعب.",
      "en": "A friend wants a break from conversation after a tiring day."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تحترم رغبته في الهدوء وتترك الباب مفتوحًا للمساعدة.",
          "en": "Respect the wish for quiet and keep help available."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-reflection-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-reflection-08",
    "region": "reflection",
    "order": 8,
    "arc": 3,
    "kind": "verify",
    "title": {
      "ar": "خطة قابلة للتغيير",
      "en": "A Flexible Plan"
    },
    "scene": {
      "ar": "تغيّر موعد نشاط مهم ولم تعد خطتك الأولى مناسبة.",
      "en": "An activity time changes and your original plan no longer fits."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تعيد ترتيب الأولويات وتخبر من يعتمدون على موعدك.",
          "en": "Reorder priorities and inform people who depend on your plan."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-reflection-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-reflection-09",
    "region": "reflection",
    "order": 9,
    "arc": 3,
    "kind": "investigate",
    "title": {
      "ar": "ثلاثة أشياء صغيرة",
      "en": "Three Small Things"
    },
    "scene": {
      "ar": "طلب منك دفتر التأمل ملاحظة تفاصيل جميلة من يوم عادي.",
      "en": "A reflection book invites you to notice small good things in an ordinary day."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تختار ما يناسبك دون مشاركة أي شيء خاص.",
          "en": "Choose what feels comfortable without sharing private thoughts."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-reflection-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-reflection-10",
    "region": "reflection",
    "order": 10,
    "arc": 4,
    "kind": "help",
    "title": {
      "ar": "الاعتذار الهادئ",
      "en": "A Quiet Apology"
    },
    "scene": {
      "ar": "أدرك أحد الأصدقاء أن تعليقًا منه أزعج زميلًا.",
      "en": "A friend realises a comment upset someone else."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقترح اعتذارًا مباشرًا دون تبريرات طويلة.",
          "en": "Suggest a direct apology without lengthy excuses."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-reflection-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-reflection-11",
    "region": "reflection",
    "order": 11,
    "arc": 4,
    "kind": "organize",
    "title": {
      "ar": "وقت الراحة",
      "en": "Time to Rest"
    },
    "scene": {
      "ar": "يخطط الفريق للعمل المتواصل دون توقف.",
      "en": "The team plans nonstop work without breaks."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقترح فترات راحة مناسبة وتحافظ على موعد الانتهاء.",
          "en": "Suggest reasonable breaks while keeping the finish time."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-reflection-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-reflection-12",
    "region": "reflection",
    "order": 12,
    "arc": 4,
    "kind": "verify",
    "title": {
      "ar": "رسالة لم تُرسل",
      "en": "An Unsent Message"
    },
    "scene": {
      "ar": "كتبت ردًا غاضبًا على سوء فهم ثم ترددت في إرساله.",
      "en": "You draft an angry reply to a misunderstanding and hesitate to send it."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تعيد قراءة الرسالة وتختار كلمات أوضح وأهدأ.",
          "en": "Reread the message and choose clearer, calmer words."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-reflection-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-desert-01",
    "region": "desert",
    "order": 1,
    "arc": 1,
    "kind": "investigate",
    "title": {
      "ar": "خريطة النجوم",
      "en": "The Star Map"
    },
    "scene": {
      "ar": "تبدو علامتان على الخريطة متشابهتين ويختلف الدليلان حولهما.",
      "en": "Two marks look alike on the map and the guides disagree."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تراجع نقاط الطريق المعروفة قبل اختيار المسار.",
          "en": "Check the known landmarks before choosing a route."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-desert-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-desert-02",
    "region": "desert",
    "order": 2,
    "arc": 1,
    "kind": "help",
    "title": {
      "ar": "قربة الماء",
      "en": "The Water Flask"
    },
    "scene": {
      "ar": "تحتاج القافلة إلى تنظيم الماء بين محطات استراحة معروفة.",
      "en": "The caravan needs to plan water across known rest stops."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تحسب الاحتياجات مع المسؤول وتتجنب التخمين.",
          "en": "Calculate needs with the guide rather than guessing."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-desert-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-desert-03",
    "region": "desert",
    "order": 3,
    "arc": 1,
    "kind": "organize",
    "title": {
      "ar": "أثر في الرمل",
      "en": "Tracks in the Sand"
    },
    "scene": {
      "ar": "تظهر آثار أقدام قرب المخيم ولا يعرف أحد مصدرها.",
      "en": "Footprints appear near camp and nobody knows their source."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تلاحظ الاتجاه وتبلغ الدليل دون افتراض قصة.",
          "en": "Note their direction and tell the guide without inventing a story."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-desert-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-desert-04",
    "region": "desert",
    "order": 4,
    "arc": 2,
    "kind": "verify",
    "title": {
      "ar": "رسالة للقافلة",
      "en": "A Message for the Caravan"
    },
    "scene": {
      "ar": "وصلت رسالة تحدد مكان الاجتماع لكن اسم الواحة ناقص.",
      "en": "A message names a meeting point but leaves out which oasis."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تطلب توضيح المكان قبل انطلاق الفريق.",
          "en": "Request the exact location before departure."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-desert-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-desert-05",
    "region": "desert",
    "order": 5,
    "arc": 2,
    "kind": "investigate",
    "title": {
      "ar": "الحقيبة الخفيفة",
      "en": "The Light Pack"
    },
    "scene": {
      "ar": "تريد القافلة تخفيف الحمولة قبل رحلة تعليمية قصيرة.",
      "en": "The caravan wants to lighten its load before a short guided trip."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تراجع الضروريات مع الدليل وتوزعها بعدل.",
          "en": "Review essentials with the guide and share the load fairly."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-desert-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-desert-06",
    "region": "desert",
    "order": 6,
    "arc": 2,
    "kind": "help",
    "title": {
      "ar": "اللافتة المائلة",
      "en": "The Leaning Sign"
    },
    "scene": {
      "ar": "مالت لافتة المسار بعد الريح وصار اتجاهها غير واضح.",
      "en": "A route sign tilts after the wind and its direction is unclear."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقارن اتجاهها بالخريطة وتبلغ مسؤول الطريق.",
          "en": "Compare it with the map and notify the path keeper."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-desert-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-desert-07",
    "region": "desert",
    "order": 7,
    "arc": 3,
    "kind": "organize",
    "title": {
      "ar": "حديث حول النار",
      "en": "A Campfire Conversation"
    },
    "scene": {
      "ar": "يروي زائر خبرًا تاريخيًا دون أن يذكر مصدره.",
      "en": "A visitor tells a historical claim without naming a source."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تسأل عن المرجع وتفرق بين القصة والمعلومة المثبتة.",
          "en": "Ask for a reference and separate storytelling from verified history."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-desert-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-desert-08",
    "region": "desert",
    "order": 8,
    "arc": 3,
    "kind": "verify",
    "title": {
      "ar": "وعد عند الواحة",
      "en": "A Promise at the Oasis"
    },
    "scene": {
      "ar": "اتفقت مجموعتان على موعد لكن إحداهما ستتأخر.",
      "en": "Two groups agree to meet but one will arrive late."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "ترسل إشعارًا مبكرًا وتراجع الوقت الجديد مع الجميع.",
          "en": "Send an early update and agree on a new time."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-desert-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-desert-09",
    "region": "desert",
    "order": 9,
    "arc": 3,
    "kind": "investigate",
    "title": {
      "ar": "محطة الاستراحة",
      "en": "The Rest Stop"
    },
    "scene": {
      "ar": "يريد بعض الرحالة متابعة الطريق رغم شعورهم بالتعب.",
      "en": "Some travellers want to keep moving even though they are tired."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقترح استراحة آمنة وتستمع لرأي الدليل.",
          "en": "Suggest a safe rest and follow the guide's advice."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-desert-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-desert-10",
    "region": "desert",
    "order": 10,
    "arc": 4,
    "kind": "help",
    "title": {
      "ar": "بوصلة قديمة",
      "en": "The Old Compass"
    },
    "scene": {
      "ar": "تعرض بوصلة قديمة قراءة غير متسقة مع العلامات الواضحة.",
      "en": "An old compass gives readings that clash with obvious landmarks."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تتحقق من صلاحيتها مع الدليل قبل استخدامها.",
          "en": "Have the guide check it before relying on it."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-desert-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-desert-11",
    "region": "desert",
    "order": 11,
    "arc": 4,
    "kind": "organize",
    "title": {
      "ar": "ضوء بعيد",
      "en": "A Distant Light"
    },
    "scene": {
      "ar": "ظهر ضوء بعيد ويريد أحدهم اللحاق به دون معرفة مصدره.",
      "en": "A distant light appears and someone wants to follow it without knowing its source."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تبقى مع المجموعة وتتحقق من الدليل بدل الانفراد.",
          "en": "Stay with the group and check with the guide rather than separating."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-desert-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-desert-12",
    "region": "desert",
    "order": 12,
    "arc": 4,
    "kind": "verify",
    "title": {
      "ar": "متحف الطريق",
      "en": "The Route Museum"
    },
    "scene": {
      "ar": "جمع الأطفال صورًا لأدوات سفر تاريخية لكن أسماؤها مختلطة.",
      "en": "Children gather pictures of historic travel tools but mix up their names."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تراجع بطاقات المتحف وتعيد تسمية الصور بدقة.",
          "en": "Check the museum labels and rename the pictures accurately."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-desert-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mountain-01",
    "region": "mountain",
    "order": 1,
    "arc": 1,
    "kind": "investigate",
    "title": {
      "ar": "مرصد فوق السحاب",
      "en": "The Cloud Observatory"
    },
    "scene": {
      "ar": "غطت السحب السماء وتوقفت جلسة رصد النجوم.",
      "en": "Clouds cover the sky and pause the stargazing session."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تقترح استخدام خريطة تعليمية إلى أن تتحسن الرؤية.",
          "en": "Use an educational sky map until visibility improves."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-mountain-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mountain-02",
    "region": "mountain",
    "order": 2,
    "arc": 1,
    "kind": "help",
    "title": {
      "ar": "نقطة على الأفق",
      "en": "A Dot on the Horizon"
    },
    "scene": {
      "ar": "يرى الفريق نقطة مضيئة ولا يعرف هل هي نجم أم طائرة.",
      "en": "The group sees a bright dot and cannot tell if it is a star or aircraft."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تراقب الحركة وتسجل الوقت قبل إصدار حكم.",
          "en": "Observe movement and record the time before deciding."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-mountain-01",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mountain-03",
    "region": "mountain",
    "order": 3,
    "arc": 1,
    "kind": "organize",
    "title": {
      "ar": "درج الجبل",
      "en": "The Mountain Steps"
    },
    "scene": {
      "ar": "يجد زائر صعوبة في الوصول إلى منصة المشاهدة.",
      "en": "A visitor struggles to reach the viewing platform."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تبحث مع المشرف عن مسار بديل آمن ومتاح.",
          "en": "Ask the caretaker for an accessible, safe alternative route."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-mountain-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mountain-04",
    "region": "mountain",
    "order": 4,
    "arc": 2,
    "kind": "verify",
    "title": {
      "ar": "العدسة الضبابية",
      "en": "The Foggy Lens"
    },
    "scene": {
      "ar": "تظهر الصور ضبابية ولا يعرف الفريق هل السبب من الجو أم العدسة.",
      "en": "Images turn hazy and the team cannot tell if it is weather or lens."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تجرب فحصًا بسيطًا آمنًا قبل تغيير أي إعداد.",
          "en": "Try a simple, safe check before changing settings."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-mountain-02",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mountain-05",
    "region": "mountain",
    "order": 5,
    "arc": 2,
    "kind": "investigate",
    "title": {
      "ar": "خطأ على اللوحة",
      "en": "A Label Error"
    },
    "scene": {
      "ar": "يبدو ترتيب الكواكب على اللوحة التعليمية غير متسق مع مرجعها.",
      "en": "A planet order on the learning board conflicts with its reference."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تراجع المرجع وتخبر المشرف قبل التصحيح.",
          "en": "Check the cited reference and tell the caretaker before correcting it."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-mountain-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mountain-06",
    "region": "mountain",
    "order": 6,
    "arc": 2,
    "kind": "help",
    "title": {
      "ar": "سجل الرصد",
      "en": "The Observation Log"
    },
    "scene": {
      "ar": "فقد سجل المرصد اسم اليوم الذي جُمعت فيه القياسات.",
      "en": "The observatory log lacks the date when readings were taken."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تميز البيانات الناقصة ولا تخترع تاريخًا.",
          "en": "Flag the missing information rather than invent a date."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-mountain-03",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mountain-07",
    "region": "mountain",
    "order": 7,
    "arc": 3,
    "kind": "organize",
    "title": {
      "ar": "مرآتان في المرصد",
      "en": "Two Mirrors"
    },
    "scene": {
      "ar": "تعكس مرآتان الضوء في اتجاهين وتربكان المتعلمين.",
      "en": "Two mirrors reflect light differently and confuse the group."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تختبر كل مرآة وحدها وتصف الفرق ببساطة.",
          "en": "Test the mirrors separately and describe what changes."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تسأل المسؤول عن أفضل خطوة آمنة.",
          "en": "Ask the caretaker for the safest next step."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما السؤال الذي كنت ستطرحه قبل اتخاذ القرار؟",
      "en": "What would you ask before deciding?"
    },
    "keepsakeId": "saja-keepsake-mountain-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mountain-08",
    "region": "mountain",
    "order": 8,
    "arc": 3,
    "kind": "verify",
    "title": {
      "ar": "خلاف العلماء",
      "en": "A Scientific Disagreement"
    },
    "scene": {
      "ar": "تصف لوحتان تفسيرين مختلفين لظاهرة ملاحظة.",
      "en": "Two panels offer different explanations for an observed phenomenon."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تشرح ما اتفق عليه الباحثون وما زال قيد البحث.",
          "en": "Explain what is established and what remains under study."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تدعو الفريق لتبادل الاقتراحات بهدوء.",
          "en": "Invite the group to compare ideas calmly."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "أي تفصيل ساعدك على فهم الموقف؟",
      "en": "Which detail helped you understand the situation?"
    },
    "keepsakeId": "saja-keepsake-mountain-04",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mountain-09",
    "region": "mountain",
    "order": 9,
    "arc": 3,
    "kind": "investigate",
    "title": {
      "ar": "الضوء والمحطة",
      "en": "Light and the Station"
    },
    "scene": {
      "ar": "تحتاج محطة الرصد إلى إطفاء أضواء غير ضرورية لإظهار السماء.",
      "en": "The station needs lower unnecessary lights to reveal the night sky."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تتفق مع المشرف على إضاءة آمنة محدودة.",
          "en": "Agree on safe, limited lighting with the caretaker."
        },
        "result": {
          "ar": "يتحول الارتباك إلى خطوة واضحة؛ يشعر الآخرون بأن رأيهم مسموع.",
          "en": "The confusion turns into a clear next step, and others feel heard."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "ترجع إلى التعليمات المكتوبة للتحقق.",
          "en": "Check the written guidance before proceeding."
        },
        "result": {
          "ar": "تجمع معلومات مفيدة، لكن لا يزال عليك اختيار فعل مناسب.",
          "en": "You gather useful information but still need to choose what to do."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تختار أول حل يخطر ببالك دون سؤال.",
          "en": "Try the first solution that comes to mind without asking."
        },
        "result": {
          "ar": "تظهر معلومة فاتتك في البداية. يمكنك العودة والتصحيح من دون لوم.",
          "en": "A detail you missed appears. You can go back and correct course without blame."
        }
      }
    ],
    "reflection": {
      "ar": "كيف يمكن احترام احتياجات أكثر من شخص؟",
      "en": "How could you respect more than one person’s needs?"
    },
    "keepsakeId": "saja-keepsake-mountain-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mountain-10",
    "region": "mountain",
    "order": 10,
    "arc": 4,
    "kind": "help",
    "title": {
      "ar": "الصخرة ذات العلامة",
      "en": "The Marked Stone"
    },
    "scene": {
      "ar": "وجد الأطفال حجرًا عليه علامة غامضة يريدون نسبها لشخص قديم.",
      "en": "Children find a marked stone and want to attribute it to someone from the past."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "توثق شكل العلامة وتترك تفسيرها لمصدر مختص.",
          "en": "Document the mark and leave interpretation to qualified sources."
        },
        "result": {
          "ar": "تكتشفون تفصيلًا صغيرًا كان من السهل تجاهله، فتتحسن الخطة.",
          "en": "You notice a small detail that was easy to miss, and the plan improves."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تعطي نفسك وقتًا لملاحظة التفاصيل.",
          "en": "Take time to notice the details."
        },
        "result": {
          "ar": "تظهر زاوية جديدة للموقف؛ السؤال الجيد فتح بابًا لم يكن واضحًا.",
          "en": "A new angle appears; a good question opens an unexpected path."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تعلن أنك فهمت الأمر قبل التحقق.",
          "en": "Announce that you have figured it out before checking."
        },
        "result": {
          "ar": "لا يحل التصرف السريع المشكلة كاملة؛ المحاولة الثانية تحتاج سؤالًا أوضح.",
          "en": "The quick action does not solve the whole problem; the next try needs a clearer question."
        }
      }
    ],
    "reflection": {
      "ar": "كيف تتأكد من معلومة دون أن تخمّن؟",
      "en": "How do you verify something without guessing?"
    },
    "keepsakeId": "saja-keepsake-mountain-05",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mountain-11",
    "region": "mountain",
    "order": 11,
    "arc": 4,
    "kind": "organize",
    "title": {
      "ar": "الليلة الأقصر",
      "en": "The Shorter Night"
    },
    "scene": {
      "ar": "تختلف مدة الليل على تقويمين موسميين في مرصد الجبل.",
      "en": "Two seasonal calendars show different night lengths."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تتحقق من الموقع والتاريخ وطريقة الحساب قبل المقارنة.",
          "en": "Check location, date, and calculation method before comparing."
        },
        "result": {
          "ar": "تتقدم المهمة بهدوء لأن الاختيار راعى الناس والمكان معًا.",
          "en": "The task moves forward calmly because your choice considers both people and place."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تستمع إلى طرف آخر قبل القرار.",
          "en": "Listen to another perspective before deciding."
        },
        "result": {
          "ar": "تمنحك الملاحظة وقتًا للتأكد، ثم يصبح القرار أسهل.",
          "en": "Observation gives you time to verify, making the next decision easier."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تبدأ وحدك قبل الاتفاق مع الآخرين.",
          "en": "Start alone without agreeing with the others."
        },
        "result": {
          "ar": "تكتشف أن القرار أثر في شخص آخر. تستدرك الأمر وتتفقان على خطوة أفضل.",
          "en": "You notice the decision affected someone else. Together you agree on a better step."
        }
      }
    ],
    "reflection": {
      "ar": "ما الذي ستفعله بشكل مختلف في محاولة ثانية؟",
      "en": "What might you do differently on a second try?"
    },
    "keepsakeId": "saja-keepsake-mountain-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  },
  {
    "id": "saja-tale-mountain-12",
    "region": "mountain",
    "order": 12,
    "arc": 4,
    "kind": "verify",
    "title": {
      "ar": "رسالة من القمة",
      "en": "A Message from the Summit"
    },
    "scene": {
      "ar": "وصلت رسالة قصيرة من الفريق الأعلى لكن كلماتها انقطعت.",
      "en": "A short message arrives from the upper team with missing words."
    },
    "objective": {
      "ar": "اختر طريقة التعامل مع الموقف، ثم لاحظ أثر القرار.",
      "en": "Choose how to approach the situation, then see what follows."
    },
    "choices": [
      {
        "id": "consider",
        "text": {
          "ar": "تطلب إعادة إرسالها بوضوح قبل اتخاذ قرار.",
          "en": "Request the full message again before acting."
        },
        "result": {
          "ar": "يصبح القرار مفهومًا للجميع، ويمكن للفريق متابعة العمل بثقة.",
          "en": "Everyone understands the decision, and the group can continue confidently."
        }
      },
      {
        "id": "explore",
        "text": {
          "ar": "تفحص العلامات المتاحة وتدوّن ما تعرفه.",
          "en": "Examine the clues and note what you know."
        },
        "result": {
          "ar": "يساعد النقاش على فهم احتياجات مختلفة قبل الاتفاق على خطة.",
          "en": "The discussion reveals different needs before a plan is agreed."
        }
      },
      {
        "id": "rush",
        "text": {
          "ar": "تتجاوز التفاصيل وتنجز الأمر بسرعة.",
          "en": "Skip the details and finish quickly."
        },
        "result": {
          "ar": "نجح جزء من الخطة، لكن تفصيلًا بقي بلا حل. مراجعة الخطوات تساعد.",
          "en": "Part of the plan works, but something remains unresolved. Reviewing the steps helps."
        }
      }
    ],
    "reflection": {
      "ar": "ما الخطوة الصغيرة التي تجعل المكان أفضل للجميع؟",
      "en": "What small step would improve the space for everyone?"
    },
    "keepsakeId": "saja-keepsake-mountain-06",
    "reviewStatus": "demo-unreviewed",
    "category": "fictional-ethical-scenario"
  }
];
export const STORY_KEEPSAKES: StoryKeepsake[] = [
  {
    "id": "saja-keepsake-village-01",
    "region": "village",
    "title": {
      "ar": "نجمة الباب",
      "en": "Gate Star"
    },
    "description": {
      "ar": "ذكرى من القرية تُفتح بعد إكمال حكايتين.",
      "en": "A memento from The Village, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-village-01",
      "saja-tale-village-02"
    ]
  },
  {
    "id": "saja-keepsake-village-02",
    "region": "village",
    "title": {
      "ar": "بطاقة الزائر",
      "en": "Visitor Card"
    },
    "description": {
      "ar": "ذكرى من القرية تُفتح بعد إكمال حكايتين.",
      "en": "A memento from The Village, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-village-03",
      "saja-tale-village-04"
    ]
  },
  {
    "id": "saja-keepsake-village-03",
    "region": "village",
    "title": {
      "ar": "مفتاح الطريق",
      "en": "Path Key"
    },
    "description": {
      "ar": "ذكرى من القرية تُفتح بعد إكمال حكايتين.",
      "en": "A memento from The Village, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-village-05",
      "saja-tale-village-06"
    ]
  },
  {
    "id": "saja-keepsake-village-04",
    "region": "village",
    "title": {
      "ar": "طبق المشاركة",
      "en": "Sharing Plate"
    },
    "description": {
      "ar": "ذكرى من القرية تُفتح بعد إكمال حكايتين.",
      "en": "A memento from The Village, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-village-07",
      "saja-tale-village-08"
    ]
  },
  {
    "id": "saja-keepsake-village-05",
    "region": "village",
    "title": {
      "ar": "دفتر الحي",
      "en": "Neighbourhood Book"
    },
    "description": {
      "ar": "ذكرى من القرية تُفتح بعد إكمال حكايتين.",
      "en": "A memento from The Village, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-village-09",
      "saja-tale-village-10"
    ]
  },
  {
    "id": "saja-keepsake-village-06",
    "region": "village",
    "title": {
      "ar": "فانوس التعاون",
      "en": "Cooperation Lantern"
    },
    "description": {
      "ar": "ذكرى من القرية تُفتح بعد إكمال حكايتين.",
      "en": "A memento from The Village, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-village-11",
      "saja-tale-village-12"
    ]
  },
  {
    "id": "saja-keepsake-mosque-01",
    "region": "mosque",
    "title": {
      "ar": "قطرة العناية",
      "en": "Careful Drop"
    },
    "description": {
      "ar": "ذكرى من ساحة المسجد تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Masjid Courtyard, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-mosque-01",
      "saja-tale-mosque-02"
    ]
  },
  {
    "id": "saja-keepsake-mosque-02",
    "region": "mosque",
    "title": {
      "ar": "بساط الهدوء",
      "en": "Quiet Mat"
    },
    "description": {
      "ar": "ذكرى من ساحة المسجد تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Masjid Courtyard, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-mosque-03",
      "saja-tale-mosque-04"
    ]
  },
  {
    "id": "saja-keepsake-mosque-03",
    "region": "mosque",
    "title": {
      "ar": "بطاقة المفقودات",
      "en": "Lost-and-Found Tag"
    },
    "description": {
      "ar": "ذكرى من ساحة المسجد تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Masjid Courtyard, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-mosque-05",
      "saja-tale-mosque-06"
    ]
  },
  {
    "id": "saja-keepsake-mosque-04",
    "region": "mosque",
    "title": {
      "ar": "علامة الوقت",
      "en": "Time Marker"
    },
    "description": {
      "ar": "ذكرى من ساحة المسجد تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Masjid Courtyard, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-mosque-07",
      "saja-tale-mosque-08"
    ]
  },
  {
    "id": "saja-keepsake-mosque-05",
    "region": "mosque",
    "title": {
      "ar": "إشارة الممر",
      "en": "Open Passage Sign"
    },
    "description": {
      "ar": "ذكرى من ساحة المسجد تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Masjid Courtyard, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-mosque-09",
      "saja-tale-mosque-10"
    ]
  },
  {
    "id": "saja-keepsake-mosque-06",
    "region": "mosque",
    "title": {
      "ar": "مصباح الساحة",
      "en": "Courtyard Lamp"
    },
    "description": {
      "ar": "ذكرى من ساحة المسجد تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Masjid Courtyard, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-mosque-11",
      "saja-tale-mosque-12"
    ]
  },
  {
    "id": "saja-keepsake-garden-01",
    "region": "garden",
    "title": {
      "ar": "بذرة السؤال",
      "en": "Question Seed"
    },
    "description": {
      "ar": "ذكرى من حديقة النمو تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Garden of Growth, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-garden-01",
      "saja-tale-garden-02"
    ]
  },
  {
    "id": "saja-keepsake-garden-02",
    "region": "garden",
    "title": {
      "ar": "ورقة الشفاء",
      "en": "Healing Leaf"
    },
    "description": {
      "ar": "ذكرى من حديقة النمو تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Garden of Growth, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-garden-03",
      "saja-tale-garden-04"
    ]
  },
  {
    "id": "saja-keepsake-garden-03",
    "region": "garden",
    "title": {
      "ar": "قطرة الاقتصاد",
      "en": "Water-Saving Drop"
    },
    "description": {
      "ar": "ذكرى من حديقة النمو تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Garden of Growth, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-garden-05",
      "saja-tale-garden-06"
    ]
  },
  {
    "id": "saja-keepsake-garden-04",
    "region": "garden",
    "title": {
      "ar": "جناح الحرية",
      "en": "Wing of Freedom"
    },
    "description": {
      "ar": "ذكرى من حديقة النمو تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Garden of Growth, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-garden-07",
      "saja-tale-garden-08"
    ]
  },
  {
    "id": "saja-keepsake-garden-05",
    "region": "garden",
    "title": {
      "ar": "خريطة الحديقة",
      "en": "Garden Map"
    },
    "description": {
      "ar": "ذكرى من حديقة النمو تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Garden of Growth, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-garden-09",
      "saja-tale-garden-10"
    ]
  },
  {
    "id": "saja-keepsake-garden-06",
    "region": "garden",
    "title": {
      "ar": "مقعد الظل",
      "en": "Shaded Seat"
    },
    "description": {
      "ar": "ذكرى من حديقة النمو تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Garden of Growth, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-garden-11",
      "saja-tale-garden-12"
    ]
  },
  {
    "id": "saja-keepsake-library-01",
    "region": "library",
    "title": {
      "ar": "ختم المصدر",
      "en": "Source Stamp"
    },
    "description": {
      "ar": "ذكرى من مكتبة النور تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Library of Light, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-library-01",
      "saja-tale-library-02"
    ]
  },
  {
    "id": "saja-keepsake-library-02",
    "region": "library",
    "title": {
      "ar": "فاصل المقارنة",
      "en": "Comparison Bookmark"
    },
    "description": {
      "ar": "ذكرى من مكتبة النور تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Library of Light, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-library-03",
      "saja-tale-library-04"
    ]
  },
  {
    "id": "saja-keepsake-library-03",
    "region": "library",
    "title": {
      "ar": "قلم الأمانة",
      "en": "Honest Pen"
    },
    "description": {
      "ar": "ذكرى من مكتبة النور تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Library of Light, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-library-05",
      "saja-tale-library-06"
    ]
  },
  {
    "id": "saja-keepsake-library-04",
    "region": "library",
    "title": {
      "ar": "قطعة الخريطة",
      "en": "Map Fragment"
    },
    "description": {
      "ar": "ذكرى من مكتبة النور تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Library of Light, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-library-07",
      "saja-tale-library-08"
    ]
  },
  {
    "id": "saja-keepsake-library-05",
    "region": "library",
    "title": {
      "ar": "بطاقة الطبعة",
      "en": "Edition Card"
    },
    "description": {
      "ar": "ذكرى من مكتبة النور تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Library of Light, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-library-09",
      "saja-tale-library-10"
    ]
  },
  {
    "id": "saja-keepsake-library-06",
    "region": "library",
    "title": {
      "ar": "مفتاح الفهرس",
      "en": "Catalogue Key"
    },
    "description": {
      "ar": "ذكرى من مكتبة النور تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Library of Light, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-library-11",
      "saja-tale-library-12"
    ]
  },
  {
    "id": "saja-keepsake-house-01",
    "region": "house",
    "title": {
      "ar": "كرسي الترحيب",
      "en": "Welcome Chair"
    },
    "description": {
      "ar": "ذكرى من بيت التعلّم تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Learning House, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-house-01",
      "saja-tale-house-02"
    ]
  },
  {
    "id": "saja-keepsake-house-02",
    "region": "house",
    "title": {
      "ar": "دفتر التعلم",
      "en": "Learning Notebook"
    },
    "description": {
      "ar": "ذكرى من بيت التعلّم تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Learning House, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-house-03",
      "saja-tale-house-04"
    ]
  },
  {
    "id": "saja-keepsake-house-03",
    "region": "house",
    "title": {
      "ar": "لوحة التعاون",
      "en": "Team Board"
    },
    "description": {
      "ar": "ذكرى من بيت التعلّم تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Learning House, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-house-05",
      "saja-tale-house-06"
    ]
  },
  {
    "id": "saja-keepsake-house-04",
    "region": "house",
    "title": {
      "ar": "قطعة الإصلاح",
      "en": "Repair Token"
    },
    "description": {
      "ar": "ذكرى من بيت التعلّم تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Learning House, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-house-07",
      "saja-tale-house-08"
    ]
  },
  {
    "id": "saja-keepsake-house-05",
    "region": "house",
    "title": {
      "ar": "بطاقة الإنصات",
      "en": "Listening Card"
    },
    "description": {
      "ar": "ذكرى من بيت التعلّم تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Learning House, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-house-09",
      "saja-tale-house-10"
    ]
  },
  {
    "id": "saja-keepsake-house-06",
    "region": "house",
    "title": {
      "ar": "نجمة المواهب",
      "en": "Skills Star"
    },
    "description": {
      "ar": "ذكرى من بيت التعلّم تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Learning House, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-house-11",
      "saja-tale-house-12"
    ]
  },
  {
    "id": "saja-keepsake-market-01",
    "region": "market",
    "title": {
      "ar": "وزن واضح",
      "en": "Clear Weight"
    },
    "description": {
      "ar": "ذكرى من سوق الليل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Night Market, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-market-01",
      "saja-tale-market-02"
    ]
  },
  {
    "id": "saja-keepsake-market-02",
    "region": "market",
    "title": {
      "ar": "قطعة الأمانة",
      "en": "Honesty Coin"
    },
    "description": {
      "ar": "ذكرى من سوق الليل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Night Market, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-market-03",
      "saja-tale-market-04"
    ]
  },
  {
    "id": "saja-keepsake-market-03",
    "region": "market",
    "title": {
      "ar": "بطاقة البيان",
      "en": "Clear Label"
    },
    "description": {
      "ar": "ذكرى من سوق الليل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Night Market, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-market-05",
      "saja-tale-market-06"
    ]
  },
  {
    "id": "saja-keepsake-market-04",
    "region": "market",
    "title": {
      "ar": "شارة الدور",
      "en": "Queue Badge"
    },
    "description": {
      "ar": "ذكرى من سوق الليل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Night Market, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-market-07",
      "saja-tale-market-08"
    ]
  },
  {
    "id": "saja-keepsake-market-05",
    "region": "market",
    "title": {
      "ar": "ورقة الاتفاق",
      "en": "Agreement Paper"
    },
    "description": {
      "ar": "ذكرى من سوق الليل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Night Market, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-market-09",
      "saja-tale-market-10"
    ]
  },
  {
    "id": "saja-keepsake-market-06",
    "region": "market",
    "title": {
      "ar": "سلة الإنصاف",
      "en": "Fairness Basket"
    },
    "description": {
      "ar": "ذكرى من سوق الليل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Night Market, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-market-11",
      "saja-tale-market-12"
    ]
  },
  {
    "id": "saja-keepsake-reflection-01",
    "region": "reflection",
    "title": {
      "ar": "خطوة الغد",
      "en": "Tomorrow Step"
    },
    "description": {
      "ar": "ذكرى من مساحة التأمل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Reflection Space, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-reflection-01",
      "saja-tale-reflection-02"
    ]
  },
  {
    "id": "saja-keepsake-reflection-02",
    "region": "reflection",
    "title": {
      "ar": "بطاقة الشكر",
      "en": "Thanks Card"
    },
    "description": {
      "ar": "ذكرى من مساحة التأمل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Reflection Space, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-reflection-03",
      "saja-tale-reflection-04"
    ]
  },
  {
    "id": "saja-keepsake-reflection-03",
    "region": "reflection",
    "title": {
      "ar": "مقعد السكينة",
      "en": "Quiet Bench"
    },
    "description": {
      "ar": "ذكرى من مساحة التأمل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Reflection Space, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-reflection-05",
      "saja-tale-reflection-06"
    ]
  },
  {
    "id": "saja-keepsake-reflection-04",
    "region": "reflection",
    "title": {
      "ar": "نجمة المحاولة",
      "en": "Try-Again Star"
    },
    "description": {
      "ar": "ذكرى من مساحة التأمل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Reflection Space, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-reflection-07",
      "saja-tale-reflection-08"
    ]
  },
  {
    "id": "saja-keepsake-reflection-05",
    "region": "reflection",
    "title": {
      "ar": "ورقة الذات",
      "en": "Personal Note"
    },
    "description": {
      "ar": "ذكرى من مساحة التأمل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Reflection Space, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-reflection-09",
      "saja-tale-reflection-10"
    ]
  },
  {
    "id": "saja-keepsake-reflection-06",
    "region": "reflection",
    "title": {
      "ar": "ظرف الاعتذار",
      "en": "Apology Envelope"
    },
    "description": {
      "ar": "ذكرى من مساحة التأمل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Reflection Space, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-reflection-11",
      "saja-tale-reflection-12"
    ]
  },
  {
    "id": "saja-keepsake-desert-01",
    "region": "desert",
    "title": {
      "ar": "خريطة الواحة",
      "en": "Oasis Map"
    },
    "description": {
      "ar": "ذكرى من قافلة الصحراء تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Desert Caravan, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-desert-01",
      "saja-tale-desert-02"
    ]
  },
  {
    "id": "saja-keepsake-desert-02",
    "region": "desert",
    "title": {
      "ar": "قربة الرحلة",
      "en": "Journey Flask"
    },
    "description": {
      "ar": "ذكرى من قافلة الصحراء تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Desert Caravan, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-desert-03",
      "saja-tale-desert-04"
    ]
  },
  {
    "id": "saja-keepsake-desert-03",
    "region": "desert",
    "title": {
      "ar": "أثر الطريق",
      "en": "Path Track"
    },
    "description": {
      "ar": "ذكرى من قافلة الصحراء تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Desert Caravan, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-desert-05",
      "saja-tale-desert-06"
    ]
  },
  {
    "id": "saja-keepsake-desert-04",
    "region": "desert",
    "title": {
      "ar": "رسالة القافلة",
      "en": "Caravan Letter"
    },
    "description": {
      "ar": "ذكرى من قافلة الصحراء تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Desert Caravan, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-desert-07",
      "saja-tale-desert-08"
    ]
  },
  {
    "id": "saja-keepsake-desert-05",
    "region": "desert",
    "title": {
      "ar": "بوصلة التحقق",
      "en": "Checking Compass"
    },
    "description": {
      "ar": "ذكرى من قافلة الصحراء تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Desert Caravan, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-desert-09",
      "saja-tale-desert-10"
    ]
  },
  {
    "id": "saja-keepsake-desert-06",
    "region": "desert",
    "title": {
      "ar": "بطاقة المتحف",
      "en": "Museum Card"
    },
    "description": {
      "ar": "ذكرى من قافلة الصحراء تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Desert Caravan, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-desert-11",
      "saja-tale-desert-12"
    ]
  },
  {
    "id": "saja-keepsake-mountain-01",
    "region": "mountain",
    "title": {
      "ar": "خريطة السماء",
      "en": "Sky Map"
    },
    "description": {
      "ar": "ذكرى من مرصد الجبل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Mountain Observatory, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-mountain-01",
      "saja-tale-mountain-02"
    ]
  },
  {
    "id": "saja-keepsake-mountain-02",
    "region": "mountain",
    "title": {
      "ar": "سجل الأفق",
      "en": "Horizon Log"
    },
    "description": {
      "ar": "ذكرى من مرصد الجبل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Mountain Observatory, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-mountain-03",
      "saja-tale-mountain-04"
    ]
  },
  {
    "id": "saja-keepsake-mountain-03",
    "region": "mountain",
    "title": {
      "ar": "درجة الوصول",
      "en": "Access Step"
    },
    "description": {
      "ar": "ذكرى من مرصد الجبل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Mountain Observatory, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-mountain-05",
      "saja-tale-mountain-06"
    ]
  },
  {
    "id": "saja-keepsake-mountain-04",
    "region": "mountain",
    "title": {
      "ar": "عدسة الوضوح",
      "en": "Clear Lens"
    },
    "description": {
      "ar": "ذكرى من مرصد الجبل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Mountain Observatory, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-mountain-07",
      "saja-tale-mountain-08"
    ]
  },
  {
    "id": "saja-keepsake-mountain-05",
    "region": "mountain",
    "title": {
      "ar": "بطاقة الرصد",
      "en": "Observation Card"
    },
    "description": {
      "ar": "ذكرى من مرصد الجبل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Mountain Observatory, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-mountain-09",
      "saja-tale-mountain-10"
    ]
  },
  {
    "id": "saja-keepsake-mountain-06",
    "region": "mountain",
    "title": {
      "ar": "شعاع القمة",
      "en": "Summit Beam"
    },
    "description": {
      "ar": "ذكرى من مرصد الجبل تُفتح بعد إكمال حكايتين.",
      "en": "A memento from Mountain Observatory, earned after two tales."
    },
    "afterEpisodes": [
      "saja-tale-mountain-11",
      "saja-tale-mountain-12"
    ]
  }
];
