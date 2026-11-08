import type { HadithRecord } from '@/domain/hadith';

/**
 * SAJA Hadith library — a deliberately small, curated demo set.
 *
 * ⚠️  Every record is DEMO until a verified scholar approves the exact snapshot
 * and an admin publishes it through the content-review workflow. The Arabic
 * matn below was copied from the direct Sunnah.com page named in each record;
 * the isnad is omitted from the reading view, not edited. The English is SAJA's
 * own meaning explanation — never a copied or published translation.
 *
 * If you add a hadith: use a stable id, verify the Arabic and grading on the
 * direct source page, and never fill a gap from memory or an AI answer.
 */

const meaningNote = {
  en: 'SAJA’s own explanation of the meaning — not a published translation. Check the Arabic and the direct source link.',
  ar: 'شرح من سجى لمعنى الحديث، وليس ترجمة منشورة. راجع النص العربي ورابط المصدر المباشر.',
};

const sahihNote = (collection: { en: string; ar: string }) => ({
  en: `${collection.en} is received as an authentic collection in Sunni scholarship. Sunnah.com does not print a separate grade for this entry; this note describes the collection, not a fresh grading by SAJA.`,
  ar: `${collection.ar} من الكتب المتلقّاة بالقبول عند أهل السنة. ولا يعرض موقع سنّة.كوم درجة منفصلة لهذا الحديث؛ وهذه الملاحظة تصف الكتاب ولا تُعدّ تصنيفًا علميًا جديدًا من سجى.`,
});

const bukhariNote = sahihNote({ en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' });
const muslimNote = sahihNote({ en: 'Sahih Muslim', ar: 'صحيح مسلم' });

export const HADITHS: HadithRecord[] = [
  {
    id: 'h-bukhari-1',
    title: { en: 'Actions and intentions', ar: 'الأعمال والنيات' },
    narrator: { en: '‘Umar ibn al-Khattab', ar: 'عمر بن الخطاب رضي الله عنه' },
    collection: 'bukhari',
    source: {
      collection: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' },
      collectionArabic: 'صحيح البخاري',
      number: '1',
      reference: 'Sahih al-Bukhari 1',
      inBookReference: 'Book 1, Hadith 1',
      url: 'https://sunnah.com/bukhari:1',
      arabicEdition: 'Sunnah.com Arabic text · isnad omitted from the reading view',
    },
    arabic:
      'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى، فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى دُنْيَا يُصِيبُهَا أَوْ إِلَى امْرَأَةٍ يَنْكِحُهَا فَهِجْرَتُهُ إِلَى مَا هَاجَرَ إِلَيْهِ',
    meaning: {
      en: 'The value of a deed is tied to the intention behind it. Each person receives what they intended — even when two outward actions look the same.',
      ar: 'قيمة العمل مرتبطة بالنية التي وراءه. ولكل إنسان ما قصده بنيّته، حتى لو تشابهت الأعمال في ظاهرها.',
    },
    explanation: {
      en: 'This hadith is placed at the very beginning of Sahih al-Bukhari. It teaches that worship is not only about what we do, but why we do it. The same outward act can be a habit, or it can become an act of worship when it is done for Allah.',
      ar: 'جاء هذا الحديث في أول صحيح البخاري. يعلّمنا أن العبادة ليست في ظاهر الفعل فقط، بل في قصده؛ فقد يكون العمل عادة، وقد يصبح عبادة إذا قُصد به وجه الله.',
    },
    context: {
      en: 'The narration mentions a person whose migration was for a worldly reason or to marry, and says that is what they receive. It is a call to check the motive behind an act, not a command to announce intentions aloud.',
      ar: 'يذكر الحديث من كانت هجرته لأمر دنيوي أو ليتزوج فله ما هاجر إليه. وفيه دعوة إلى مراجعة الدافع، وليس أمرًا بالجهر بالنية.',
    },
    why: {
      en: 'Intention turns ordinary moments into worship. A glass of water, a helping hand, or a lesson can become something offered for Allah.',
      ar: 'النية تحوّل اللحظات العادية إلى عبادة: كأس ماء، أو مساعدة، أو درس، يمكن أن يكون خالصًا لله.',
    },
    vocabulary: [
      { arabic: 'النِّيَّة', transliteration: 'niyyah', meaning: { en: 'intention in the heart', ar: 'القصد في القلب' } },
      { arabic: 'الأَعْمَال', transliteration: 'al-a‘māl', meaning: { en: 'deeds, actions', ar: 'الأفعال والأعمال' } },
      { arabic: 'هِجْرَة', transliteration: 'hijrah', meaning: { en: 'migration; here, leaving something for Allah', ar: 'الانتقال؛ وفي الحديث ترك شيء لله' } },
    ],
    topics: ['character', 'beliefs'],
    ageBands: ['child', 'teen', 'adult'],
    grading: {
      label: { en: 'Sahih', ar: 'صحيح' },
      authority: 'Sahih al-Bukhari (collection classification)',
      sourceUrl: 'https://sunnah.com/bukhari:1',
      note: bukhariNote,
    },
    englishMeaning: { kind: 'saja-paraphrase', note: meaningNote },
    relatedKnowledge: ['k-intention', 'k-gratitude'],
    relatedHadith: ['h-bukhari-6464', 'h-bukhari-10'],
    keywords: ['intention', 'niyyah', 'actions', 'sincerity', 'hijrah', 'نية', 'النية', 'إخلاص', 'أعمال'],
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'h-bukhari-10',
    title: { en: 'The tongue and the hand', ar: 'اللسان واليد' },
    narrator: { en: '‘Abdullah ibn ‘Amr', ar: 'عبد الله بن عمرو رضي الله عنهما' },
    collection: 'bukhari',
    source: {
      collection: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' },
      collectionArabic: 'صحيح البخاري',
      number: '10',
      reference: 'Sahih al-Bukhari 10',
      inBookReference: 'Book 2, Hadith 3',
      url: 'https://sunnah.com/bukhari:10',
      arabicEdition: 'Sunnah.com Arabic text · isnad omitted from the reading view',
    },
    arabic: 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ، وَالْمُهَاجِرُ مَنْ هَجَرَ مَا نَهَى اللَّهُ عَنْهُ',
    meaning: {
      en: 'A Muslim is the one from whose speech and hands other Muslims are safe. The one who truly migrates leaves behind what Allah has forbidden.',
      ar: 'المسلم من يسلم المسلمون من لسانه ويده، والمهاجر من يترك ما نهى الله عنه.',
    },
    explanation: {
      en: 'This hadith links faith with the everyday safety we give others. It names the tongue first because words can wound without leaving a visible mark, then the hand because faith should restrain harm. The second sentence widens “migration” from a physical journey to leaving sin behind.',
      ar: 'يربط هذا الحديث الإيمانَ بالأمان الذي نمنحه للآخرين في حياتنا اليومية. وقد ذكر اللسان أولًا لأن الكلمة قد تجرح بلا أثر ظاهر، ثم اليد لأن الإيمان يمنع الأذى. أما الجملة الثانية فتوسّع معنى الهجرة من السفر إلى ترك المعصية.',
    },
    context: {
      en: 'The narration appears in the Book of Faith in Sahih al-Bukhari. It pairs two words — Muslim and Muhajir — to show that both identity and migration have a moral meaning.',
      ar: 'ورد الحديث في كتاب الإيمان من صحيح البخاري، ويجمع بين لفظَي «المسلم» و«المهاجر» ليبين أن كليهما يحمل معنى أخلاقيًا.',
    },
    why: {
      en: 'Small choices matter: a joke, a message, or a push. Faith shapes what we do and say, including online.',
      ar: 'الاختيارات الصغيرة مهمة: مزحة أو رسالة أو دفعة. والإيمان يشكّل ما نفعله ونقوله، حتى على الإنترنت.',
    },
    vocabulary: [
      { arabic: 'اللِّسَان', transliteration: 'al-lisān', meaning: { en: 'tongue; speech', ar: 'اللسان والكلام' } },
      { arabic: 'الْيَد', transliteration: 'al-yad', meaning: { en: 'hand; physical action', ar: 'اليد والفعل' } },
      { arabic: 'الْمُهَاجِر', transliteration: 'al-muhājir', meaning: { en: 'emigrant; one who leaves something behind', ar: 'المهاجر الذي يترك شيئًا وراءه' } },
    ],
    topics: ['character', 'beliefs'],
    ageBands: ['child', 'teen', 'adult'],
    grading: {
      label: { en: 'Sahih', ar: 'صحيح' },
      authority: 'Sahih al-Bukhari (collection classification)',
      sourceUrl: 'https://sunnah.com/bukhari:10',
      note: bukhariNote,
    },
    englishMeaning: { kind: 'saja-paraphrase', note: meaningNote },
    relatedKnowledge: ['k-salam', 'k-kindness'],
    relatedHadith: ['h-bukhari-13', 'h-bukhari-6018'],
    keywords: ['tongue', 'hand', 'harm', 'muslim', 'migration', 'لسان', 'يد', 'أذى', 'هجرة'],
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'h-bukhari-13',
    title: { en: 'Want good for your brother', ar: 'محبة الخير للأخ' },
    narrator: { en: 'Anas ibn Malik', ar: 'أنس بن مالك رضي الله عنه' },
    collection: 'bukhari',
    source: {
      collection: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' },
      collectionArabic: 'صحيح البخاري',
      number: '13',
      reference: 'Sahih al-Bukhari 13',
      inBookReference: 'Book 2, Hadith 6',
      url: 'https://sunnah.com/bukhari:13',
      arabicEdition: 'Sunnah.com Arabic text · isnad omitted from the reading view',
    },
    arabic: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
    meaning: {
      en: 'None of you has complete faith until you wish for your brother the same good you wish for yourself.',
      ar: 'لا يكتمل إيمان أحدكم حتى يحب لأخيه من الخير ما يحبه لنفسه.',
    },
    explanation: {
      en: 'This short hadith sits in the Book of Faith. It turns faith into a daily test of the heart: do I want others to have the good things I want for myself? Many scholars understand “brother” here broadly, while the hadith begins within the community of believers.',
      ar: 'هذا حديث قصير من كتاب الإيمان، يجعل الإيمان اختبارًا يوميًا للقلب: هل أحب للناس من الخير ما أحبه لنفسي؟ ويفهم كثير من العلماء لفظ «الأخ» بمعنى واسع، مع أن الحديث يبدأ بمجتمع المؤمنين.',
    },
    context: {
      en: 'Anas ibn Malik narrated it. The wording is short because the teaching is a principle to return to, not a step-by-step ritual.',
      ar: 'رواه أنس بن مالك رضي الله عنه. وجاءت صياغته قصيرة لأنه أصل يُرجع إليه، لا خطوات منفصلة.',
    },
    why: {
      en: 'Envy narrows the heart; wanting good for others widens it. It can begin with a quiet prayer for someone else.',
      ar: 'الحسد يضيّق القلب، ومحبة الخير للآخرين توسّعه. ويمكن أن تبدأ بدعاء صادق لشخص آخر.',
    },
    vocabulary: [
      { arabic: 'يُؤْمِن', transliteration: 'yu’min', meaning: { en: 'believes', ar: 'يصدّق ويؤمن' } },
      { arabic: 'يُحِبّ', transliteration: 'yuḥibb', meaning: { en: 'loves; wishes', ar: 'يحب ويرغب' } },
      { arabic: 'لِنَفْسِه', transliteration: 'li-nafsih', meaning: { en: 'for himself or herself', ar: 'لنفسه' } },
    ],
    topics: ['beliefs', 'character'],
    ageBands: ['child', 'teen', 'adult'],
    grading: {
      label: { en: 'Sahih', ar: 'صحيح' },
      authority: 'Sahih al-Bukhari (collection classification)',
      sourceUrl: 'https://sunnah.com/bukhari:13',
      note: bukhariNote,
    },
    englishMeaning: { kind: 'saja-paraphrase', note: meaningNote },
    relatedKnowledge: ['k-kindness', 'k-iman'],
    relatedHadith: ['h-bukhari-10', 'h-tirmidhi-1956'],
    keywords: ['brother', 'love', 'faith', 'envy', 'good', 'أخ', 'محبة', 'إيمان', 'خير'],
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'h-bukhari-69',
    title: { en: 'Make it easy', ar: 'يسّروا ولا تعسّروا' },
    narrator: { en: 'Anas ibn Malik', ar: 'أنس بن مالك رضي الله عنه' },
    collection: 'bukhari',
    source: {
      collection: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' },
      collectionArabic: 'صحيح البخاري',
      number: '69',
      reference: 'Sahih al-Bukhari 69',
      inBookReference: 'Book 3, Hadith 11',
      url: 'https://sunnah.com/bukhari:69',
      arabicEdition: 'Sunnah.com Arabic text · isnad omitted from the reading view',
    },
    arabic: 'يَسِّرُوا وَلَا تُعَسِّرُوا، وَبَشِّرُوا وَلَا تُنَفِّرُوا',
    meaning: {
      en: 'Make things easy for people and do not make them hard. Give good news and do not push people away.',
      ar: 'يسّروا للناس ولا تعسّروا عليهم، وبشّروهم ولا تنفّروهم.',
    },
    explanation: {
      en: 'The Prophet ﷺ taught that the way religious teaching is delivered matters. A harsh or confusing approach can turn people away, while patient, clear teaching helps them take a step. The principle also applies to how adults teach and encourage children.',
      ar: 'علّم النبي ﷺ أن أسلوب تعليم الدين مهم؛ فالتعامل القاسي أو الغامض قد ينفّر الناس، أما التعليم الصبور الواضح فيعينهم على الخطوة التالية. ويشمل هذا الأصل أيضًا طريقة تعليم الكبار وتشجيعهم للأطفال.',
    },
    context: {
      en: 'The hadith is in the Book of Knowledge in Sahih al-Bukhari, near reports about teaching people gently and choosing a suitable time.',
      ar: 'ورد الحديث في كتاب العلم من صحيح البخاري، قريبًا من روايات عن الرفق في التعليم واختيار الوقت المناسب.',
    },
    why: {
      en: 'When you explain something, the goal is understanding, not winning. Ease is not carelessness; it is wisdom.',
      ar: 'حين تشرح شيئًا فهدفك أن يفهم الآخر، لا أن تنتصر. التيسير ليس تفريطًا، بل حكمة.',
    },
    vocabulary: [
      { arabic: 'يَسِّرُوا', transliteration: 'yassirū', meaning: { en: 'make easy', ar: 'سهّلوا' } },
      { arabic: 'تُعَسِّرُوا', transliteration: 'tu‘assirū', meaning: { en: 'make difficult', ar: 'شّددوا وعسّروا' } },
      { arabic: 'بَشِّرُوا', transliteration: 'bashshirū', meaning: { en: 'give good news and hope', ar: 'أعطوا البشرى والرجاء' } },
      { arabic: 'تُنَفِّرُوا', transliteration: 'tunaffirū', meaning: { en: 'push people away', ar: 'تنفّروا الناس' } },
    ],
    topics: ['character'],
    ageBands: ['child', 'teen', 'adult'],
    grading: {
      label: { en: 'Sahih', ar: 'صحيح' },
      authority: 'Sahih al-Bukhari (collection classification)',
      sourceUrl: 'https://sunnah.com/bukhari:69',
      note: bukhariNote,
    },
    englishMeaning: { kind: 'saja-paraphrase', note: meaningNote },
    relatedKnowledge: ['k-kindness', 'k-salam'],
    relatedHadith: ['h-tirmidhi-1956', 'h-bukhari-6018'],
    keywords: ['easy', 'gentle', 'teaching', 'good news', 'mercy', 'تيسير', 'رفق', 'تعليم', 'بشرى'],
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'h-bukhari-6018',
    title: { en: 'Neighbour, guest, and speech', ar: 'الجار والضيف والكلام' },
    narrator: { en: 'Abu Hurayrah', ar: 'أبو هريرة رضي الله عنه' },
    collection: 'bukhari',
    source: {
      collection: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' },
      collectionArabic: 'صحيح البخاري',
      number: '6018',
      reference: 'Sahih al-Bukhari 6018',
      inBookReference: 'Book 78, Hadith 49',
      url: 'https://sunnah.com/bukhari:6018',
      arabicEdition: 'Sunnah.com Arabic text · isnad omitted from the reading view',
    },
    arabic:
      'مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلَا يُؤْذِ جَارَهُ، وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيُكْرِمْ ضَيْفَهُ، وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ',
    meaning: {
      en: 'Whoever believes in Allah and the Last Day should not harm a neighbour, should honour a guest, and should speak good words or remain silent.',
      ar: 'من كان يؤمن بالله واليوم الآخر فلا يؤذِ جاره، ويكرم ضيفه، ويقل خيرًا أو ليصمت.',
    },
    explanation: {
      en: 'This hadith brings three ordinary relationships under one standard: faith. It does not treat harm as merely impolite; it says a believer should be safe to live beside. The third instruction is a practical rule for speech — if you cannot say something good, silence is better.',
      ar: 'يجمع الحديث ثلاث علاقات يومية تحت معيار واحد هو الإيمان. فالأذى ليس مجرد قلة أدب، بل ينبغي أن يكون المؤمن آمنًا لجاره. والوصية الثالثة قاعدة عملية في الكلام: إن لم تجد خيرًا تقوله فالصمت أفضل.',
    },
    context: {
      en: 'Abu Hurayrah narrated it, and it appears in the Book of Good Manners in Sahih al-Bukhari, among chapters on neighbours, hospitality and guarding the tongue.',
      ar: 'رواه أبو هريرة رضي الله عنه، وورد في كتاب الأدب من صحيح البخاري ضمن أبواب الجار والضيافة وحفظ اللسان.',
    },
    why: {
      en: 'Neighbours can be family, classmates, or anyone nearby. Small habits — a greeting, keeping noise down, listening — show faith in ordinary life.',
      ar: 'قد يكون الجار قريبًا أو زميلًا أو أي شخص قريب منك. والعادات الصغيرة، كالتحية وخفض الصوت والإنصات، تُظهر الإيمان في الحياة اليومية.',
    },
    vocabulary: [
      { arabic: 'الْجَار', transliteration: 'al-jār', meaning: { en: 'neighbour', ar: 'الجار' } },
      { arabic: 'الضَّيْف', transliteration: 'aḍ-ḍayf', meaning: { en: 'guest', ar: 'الضيف' } },
      { arabic: 'يُؤْذِي', transliteration: 'yu’dhī', meaning: { en: 'harms', ar: 'يؤذي ويضر' } },
      { arabic: 'لِيَصْمُت', transliteration: 'li-yaṣmut', meaning: { en: 'let them remain silent', ar: 'فليصمت' } },
    ],
    topics: ['character', 'beliefs'],
    ageBands: ['child', 'teen', 'adult'],
    grading: {
      label: { en: 'Sahih', ar: 'صحيح' },
      authority: 'Sahih al-Bukhari (collection classification)',
      sourceUrl: 'https://sunnah.com/bukhari:6018',
      note: bukhariNote,
    },
    englishMeaning: { kind: 'saja-paraphrase', note: meaningNote },
    relatedKnowledge: ['k-kindness', 'k-salam'],
    relatedHadith: ['h-bukhari-10', 'h-tirmidhi-1956'],
    keywords: ['neighbour', 'neighbor', 'guest', 'speech', 'silence', 'جار', 'ضيف', 'كلام', 'صمت'],
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'h-bukhari-6114',
    title: { en: 'Strength is self-control', ar: 'القوة ضبط النفس' },
    narrator: { en: 'Abu Hurayrah', ar: 'أبو هريرة رضي الله عنه' },
    collection: 'bukhari',
    source: {
      collection: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' },
      collectionArabic: 'صحيح البخاري',
      number: '6114',
      reference: 'Sahih al-Bukhari 6114',
      inBookReference: 'Book 78, Hadith 141',
      url: 'https://sunnah.com/bukhari:6114',
      arabicEdition: 'Sunnah.com Arabic text · isnad omitted from the reading view',
    },
    arabic: 'لَيْسَ الشَّدِيدُ بِالصُّرَعَةِ، إِنَّمَا الشَّدِيدُ الَّذِي يَمْلِكُ نَفْسَهُ عِنْدَ الْغَضَبِ',
    meaning: {
      en: 'The strong person is not the one who wins by physical force. The strong person is the one who controls themselves when anger rises.',
      ar: 'ليس القوي من يغلب الناس بقوته، بل القوي من يملك نفسه عند الغضب.',
    },
    explanation: {
      en: 'This hadith redefines strength. Winning a struggle is not the highest measure of power; self-control is. Teachers often use it to encourage pausing, breathing and choosing a response rather than acting on anger.',
      ar: 'يعيد الحديث تعريف القوة؛ فالفوز في الصراع ليس أعلى درجاتها، بل ضبط النفس. ويستعين به المعلمون كثيرًا في تشجيع التوقف والتنفس واختيار الاستجابة بدل التصرف بغضب.',
    },
    context: {
      en: 'Abu Hurayrah narrated it in the Book of Good Manners, in a chapter about being cautious of anger.',
      ar: 'رواه أبو هريرة رضي الله عنه في كتاب الأدب، في باب الحذر من الغضب.',
    },
    why: {
      en: 'Anger is a signal, not a master. A pause can protect a friendship, a family, or a choice you would later regret.',
      ar: 'الغضب إشارة لا سيد. والتوقف لحظة قد يحمي صداقة أو أسرة أو قرارًا ستندم عليه لاحقًا.',
    },
    vocabulary: [
      { arabic: 'الشَّدِيد', transliteration: 'ash-shadīd', meaning: { en: 'the strong one', ar: 'القوي الشديد' } },
      { arabic: 'الصُّرَعَة', transliteration: 'aṣ-ṣura‘ah', meaning: { en: 'a wrestling contest or throw', ar: 'المصارعة والصرع' } },
      { arabic: 'الْغَضَب', transliteration: 'al-ghaḍab', meaning: { en: 'anger', ar: 'الغضب' } },
      { arabic: 'يَمْلِكُ نَفْسَه', transliteration: 'yamliku nafsah', meaning: { en: 'controls himself or herself', ar: 'يملك نفسه ويضبطها' } },
    ],
    topics: ['character'],
    ageBands: ['child', 'teen', 'adult'],
    grading: {
      label: { en: 'Sahih', ar: 'صحيح' },
      authority: 'Sahih al-Bukhari (collection classification)',
      sourceUrl: 'https://sunnah.com/bukhari:6114',
      note: bukhariNote,
    },
    englishMeaning: { kind: 'saja-paraphrase', note: meaningNote },
    relatedKnowledge: ['k-kindness', 'k-capacity'],
    relatedHadith: ['h-bukhari-69', 'h-bukhari-6464'],
    keywords: ['anger', 'strength', 'self-control', 'patience', 'غضب', 'قوة', 'ضبط النفس', 'صبر'],
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'h-bukhari-6464',
    title: { en: 'Small, steady deeds', ar: 'العمل الدائم وإن قلّ' },
    narrator: { en: '‘A’ishah', ar: 'عائشة رضي الله عنها' },
    collection: 'bukhari',
    source: {
      collection: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' },
      collectionArabic: 'صحيح البخاري',
      number: '6464',
      reference: 'Sahih al-Bukhari 6464',
      inBookReference: 'Book 81, Hadith 53',
      url: 'https://sunnah.com/bukhari:6464',
      arabicEdition: 'Sunnah.com Arabic text · isnad omitted from the reading view',
    },
    arabic: 'سَدِّدُوا وَقَارِبُوا، وَاعْلَمُوا أَنْ لَنْ يُدْخِلَ أَحَدَكُمْ عَمَلُهُ الْجَنَّةَ، وَأَنَّ أَحَبَّ الأَعْمَالِ أَدْوَمُهَا إِلَى اللَّهِ، وَإِنْ قَلَّ',
    meaning: {
      en: 'Aim for what is right and come close to it. No one enters Paradise by their deeds alone, and the deeds Allah loves most are the steady ones, even if they are small.',
      ar: 'استقيموا واقتربوا من الصواب، واعلموا أن أحدًا لا يدخل الجنة بعمله وحده، وأن أحب الأعمال إلى الله أدومها وإن قلّ.',
    },
    explanation: {
      en: 'This hadith encourages balance rather than extremes. It says that even our best deeds do not earn Paradise as a payment; it is Allah’s mercy that admits us. At the same time, it values regular acts of worship and kindness over rare bursts of enthusiasm.',
      ar: 'يدعو الحديث إلى الاعتدال لا إلى الغلو. فحتى أفضل أعمالنا لا تكون ثمنًا للجنة، بل رحمة الله هي التي تُدخلها. وفي الوقت نفسه يُقدّم الأعمال المنتظمة من عبادة ولطف على الحماس العابر.',
    },
    context: {
      en: '‘A’ishah narrated it in the Book of Ar-Riqaq, a section of Sahih al-Bukhari on softening the heart and following a middle path.',
      ar: 'روته عائشة رضي الله عنها في كتاب الرقاق من صحيح البخاري، وهو باب في إلين القلوب وملازمة القصد.',
    },
    why: {
      en: 'A short daily habit is often better than a big effort that burns out. Choose something small you can return to.',
      ar: 'عادة يومية قصيرة خير من جهد كبير ينقطع. اختر شيئًا صغيرًا تستطيع العودة إليه.',
    },
    vocabulary: [
      { arabic: 'سَدِّدُوا', transliteration: 'saddidū', meaning: { en: 'aim rightly and do your best', ar: 'اقصدوا الصواب وأحسنوا' } },
      { arabic: 'قَارِبُوا', transliteration: 'qāribū', meaning: { en: 'draw near; approach the right', ar: 'اقتربوا من الصواب' } },
      { arabic: 'أَدْوَمُهَا', transliteration: 'adwamuhā', meaning: { en: 'the most constant of them', ar: 'أكثرها دوامًا' } },
      { arabic: 'وَإِنْ قَلَّ', transliteration: 'wa in qall', meaning: { en: 'even if it is little', ar: 'وإن كان قليلًا' } },
    ],
    topics: ['character', 'beliefs'],
    ageBands: ['child', 'teen', 'adult'],
    grading: {
      label: { en: 'Sahih', ar: 'صحيح' },
      authority: 'Sahih al-Bukhari (collection classification)',
      sourceUrl: 'https://sunnah.com/bukhari:6464',
      note: bukhariNote,
    },
    englishMeaning: { kind: 'saja-paraphrase', note: meaningNote },
    relatedKnowledge: ['k-intention', 'k-gratitude'],
    relatedHadith: ['h-bukhari-1', 'h-bukhari-6114'],
    keywords: ['consistency', 'steady', 'small deeds', 'habit', 'mercy', 'استقامة', 'دوام', 'عمل قليل'],
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'h-bukhari-7376',
    title: { en: 'Mercy for people', ar: 'الرحمة بالناس' },
    narrator: { en: 'Jarir ibn ‘Abdullah', ar: 'جرير بن عبد الله رضي الله عنه' },
    collection: 'bukhari',
    source: {
      collection: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' },
      collectionArabic: 'صحيح البخاري',
      number: '7376',
      reference: 'Sahih al-Bukhari 7376',
      inBookReference: 'Book 97, Hadith 6',
      url: 'https://sunnah.com/bukhari:7376',
      arabicEdition: 'Sunnah.com Arabic text · isnad omitted from the reading view',
    },
    arabic: 'لَا يَرْحَمُ اللَّهُ مَنْ لَا يَرْحَمُ النَّاسَ',
    meaning: {
      en: 'Allah does not show mercy to a person who does not show mercy to people.',
      ar: 'لا يرحم الله من لا يرحم الناس.',
    },
    explanation: {
      en: 'This hadith connects mercy toward people with receiving mercy from Allah. It is not a transaction we control; it shows that a heart closed to people is not a heart shaped by Allah’s mercy. The instruction is broad: family, strangers, animals, and those who cannot repay.',
      ar: 'يربط الحديث الرحمة بالناس برحمة الله. وليست معاملة نتحكم فيها، بل يبيّن أن القلب المغلق عن الناس ليس قلبًا تشكّلته رحمة الله. والتعليم واسع يشمل الأهل والغرباء والحيوان ومن لا يستطيع رد الجميل.',
    },
    context: {
      en: 'Jarir ibn ‘Abdullah narrated it in the Book of Tawhid in Sahih al-Bukhari.',
      ar: 'رواه جرير بن عبد الله رضي الله عنه في كتاب التوحيد من صحيح البخاري.',
    },
    why: {
      en: 'Mercy can be a listened ear, a second chance, or a gentle word. It is part of how faith is lived.',
      ar: 'الرحمة قد تكون إنصاتًا أو فرصة ثانية أو كلمة لطيفة. وهي جزء من عيش الإيمان.',
    },
    vocabulary: [
      { arabic: 'يَرْحَم', transliteration: 'yarḥam', meaning: { en: 'shows mercy', ar: 'يرحم' } },
      { arabic: 'النَّاس', transliteration: 'an-nās', meaning: { en: 'people', ar: 'الناس' } },
      { arabic: 'الرَّحْمَة', transliteration: 'ar-raḥmah', meaning: { en: 'mercy, compassion', ar: 'الرحمة والعطف' } },
    ],
    topics: ['beliefs', 'character'],
    ageBands: ['child', 'teen', 'adult'],
    grading: {
      label: { en: 'Sahih', ar: 'صحيح' },
      authority: 'Sahih al-Bukhari (collection classification)',
      sourceUrl: 'https://sunnah.com/bukhari:7376',
      note: bukhariNote,
    },
    englishMeaning: { kind: 'saja-paraphrase', note: meaningNote },
    relatedKnowledge: ['k-kindness', 'k-names'],
    relatedHadith: ['h-bukhari-13', 'h-tirmidhi-1956'],
    keywords: ['mercy', 'compassion', 'people', 'kindness', 'رحمة', 'رأفة', 'ناس'],
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'h-bukhari-5027',
    title: { en: 'Learn and teach the Qur’an', ar: 'تعلّم القرآن وعلّمه' },
    narrator: { en: '‘Uthman ibn ‘Affan', ar: 'عثمان بن عفان رضي الله عنه' },
    collection: 'bukhari',
    source: {
      collection: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' },
      collectionArabic: 'صحيح البخاري',
      number: '5027',
      reference: 'Sahih al-Bukhari 5027',
      inBookReference: 'Book 66, Hadith 49',
      url: 'https://sunnah.com/bukhari:5027',
      arabicEdition: 'Sunnah.com Arabic text · isnad omitted from the reading view',
    },
    arabic: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
    meaning: {
      en: 'The best among you are those who learn the Qur’an and then teach it.',
      ar: 'خيركم من تعلّم القرآن وعلّمه.',
    },
    explanation: {
      en: 'This hadith joins learning and sharing. It does not say only teachers are best; it says the movement from learning to teaching is precious. Teaching can be as simple as sharing one verse you understand with a sibling or friend.',
      ar: 'يجمع الحديث بين التعلّم والمشاركة؛ فليس المعنى أن المعلمين وحدهم خير الناس، بل إن انتقال العلم إلى التعليم عزيز. وقد يكون التعليم مشاركة آية واحدة فهمتها مع أخ أو صديق.',
    },
    context: {
      en: '‘Uthman ibn ‘Affan narrated it in the Book of the Virtues of the Qur’an in Sahih al-Bukhari.',
      ar: 'رواه عثمان بن عفان رضي الله عنه في كتاب فضائل القرآن من صحيح البخاري.',
    },
    why: {
      en: 'Learning becomes a gift when it is passed on. You do not need to know everything to help someone with what you have learnt.',
      ar: 'يصبح العلم عطاءً حين تنقله. لا تحتاج أن تعرف كل شيء لتساعد غيرك بما تعلمته.',
    },
    vocabulary: [
      { arabic: 'خَيْرُكُمْ', transliteration: 'khayrukum', meaning: { en: 'the best of you', ar: 'أفضلكم' } },
      { arabic: 'تَعَلَّمَ', transliteration: 'ta‘allama', meaning: { en: 'learned', ar: 'تعلّم' } },
      { arabic: 'عَلَّمَهُ', transliteration: '‘allamahu', meaning: { en: 'taught it', ar: 'علّمه لغيره' } },
    ],
    topics: ['quran', 'character'],
    ageBands: ['child', 'teen', 'adult'],
    grading: {
      label: { en: 'Sahih', ar: 'صحيح' },
      authority: 'Sahih al-Bukhari (collection classification)',
      sourceUrl: 'https://sunnah.com/bukhari:5027',
      note: bukhariNote,
    },
    englishMeaning: { kind: 'saja-paraphrase', note: meaningNote },
    relatedKnowledge: ['k-first-revelation', 'k-knowledge-dua'],
    relatedHadith: ['h-muslim-2699a', 'h-bukhari-1'],
    keywords: ['quran', 'learn', 'teach', 'knowledge', 'قرآن', 'تعلم', 'تعليم', 'علم'],
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'h-muslim-2699a',
    title: { en: 'Ease distress, find ease', ar: 'تنفيس الكرب' },
    narrator: { en: 'Abu Hurayrah', ar: 'أبو هريرة رضي الله عنه' },
    collection: 'muslim',
    source: {
      collection: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
      collectionArabic: 'صحيح مسلم',
      number: '2699a',
      reference: 'Sahih Muslim 2699a',
      inBookReference: 'Book 48, Hadith 48',
      url: 'https://sunnah.com/muslim:2699a',
      arabicEdition: 'Sunnah.com Arabic text · isnad omitted from the reading view',
    },
    arabic:
      'مَنْ نَفَّسَ عَنْ مُؤْمِنٍ كُرْبَةً مِنْ كُرَبِ الدُّنْيَا نَفَّسَ اللَّهُ عَنْهُ كُرْبَةً مِنْ كُرَبِ يَوْمِ الْقِيَامَةِ، وَمَنْ يَسَّرَ عَلَى مُعْسِرٍ يَسَّرَ اللَّهُ عَلَيْهِ فِي الدُّنْيَا وَالْآخِرَةِ، وَمَنْ سَتَرَ مُسْلِمًا سَتَرَهُ اللَّهُ فِي الدُّنْيَا وَالْآخِرَةِ، وَاللَّهُ فِي عَوْنِ الْعَبْدِ مَا كَانَ الْعَبْدُ فِي عَوْنِ أَخِيهِ، وَمَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ، وَمَا اجْتَمَعَ قَوْمٌ فِي بَيْتٍ مِنْ بُيُوتِ اللَّهِ يَتْلُونَ كِتَابَ اللَّهِ وَيَتَدَارَسُونَهُ بَيْنَهُمْ إِلَّا نَزَلَتْ عَلَيْهِمُ السَّكِينَةُ وَغَشِيَتْهُمُ الرَّحْمَةُ وَحَفَّتْهُمُ الْمَلَائِكَةُ وَذَكَرَهُمُ اللَّهُ فِيمَنْ عِنْدَهُ، وَمَنْ بَطَّأَ بِهِ عَمَلُهُ لَمْ يُسْرِعْ بِهِ نَسَبُهُ',
    meaning: {
      en: 'Easing a believer’s hardship, making things easier for someone in difficulty, covering another’s fault, and seeking knowledge are paths that bring Allah’s help and mercy. The hadith also praises circles of Qur’an study and reminds us that good deeds, not family background, carry a person forward.',
      ar: 'تنفيس الكرب عن مؤمن، والتيسير على من في ضيق، والستر على مسلم، وطلب العلم: كلها طرق تجلب عون الله ورحمته. ويثني الحديث على مجالس دراسة القرآن، ويذكّر أن العمل لا النسب هو الذي يرفع الإنسان.',
    },
    explanation: {
      en: 'This longer hadith brings together several acts of mercy: relieving pressure, making things easier, protecting someone’s dignity, and seeking knowledge. It also describes the quiet gift of sitting together with the Qur’an. The final line is a gentle correction: good deeds, not status or family name, move a person forward.',
      ar: 'يجمع هذا الحديث الطويل أعمال رحمة كثيرة: تنفيس الضيق، والتيسير، وحفظ كرامة الآخر، وطلب العلم. ويصف أيضًا هدية الجلوس مع القرآن. أما خاتمته فتصحيح لطيف: العمل لا المكانة ولا اسم العائلة هو الذي يقدّم الإنسان.',
    },
    context: {
      en: 'Abu Hurayrah narrated it in Sahih Muslim, in the Book of Remembrance, Supplication, Repentance and Seeking Forgiveness.',
      ar: 'رواه أبو هريرة رضي الله عنه في صحيح مسلم، في كتاب الذكر والدعاء والتوبة والاستغفار.',
    },
    why: {
      en: 'You do not need a big platform to help. A small relief — a reply, a hand, a quiet word — belongs to this hadith’s world.',
      ar: 'لا تحتاج إلى منصة كبيرة لتساعد. فالتنفيس الصغير، كرد أو مساعدة أو كلمة هادئة، من معاني هذا الحديث.',
    },
    vocabulary: [
      { arabic: 'نَفَّسَ', transliteration: 'naffasa', meaning: { en: 'relieved, eased', ar: 'نفّس وفرّج' } },
      { arabic: 'كُرْبَة', transliteration: 'kurbah', meaning: { en: 'distress, hardship', ar: 'الكرب والضيق' } },
      { arabic: 'مُعْسِر', transliteration: 'mu‘sir', meaning: { en: 'someone in difficulty or debt', ar: 'من في ضيق أو عسر' } },
      { arabic: 'سَتَرَ', transliteration: 'satara', meaning: { en: 'concealed, protected a fault', ar: 'ستر العيب' } },
      { arabic: 'السَّكِينَة', transliteration: 'as-sakīnah', meaning: { en: 'tranquillity', ar: 'السكينة والطمأنينة' } },
    ],
    topics: ['character', 'beliefs', 'quran'],
    ageBands: ['teen', 'adult'],
    grading: {
      label: { en: 'Sahih', ar: 'صحيح' },
      authority: 'Sahih Muslim (collection classification)',
      sourceUrl: 'https://sunnah.com/muslim:2699a',
      note: muslimNote,
    },
    englishMeaning: { kind: 'saja-paraphrase', note: meaningNote },
    relatedKnowledge: ['k-kindness', 'k-knowledge-dua', 'k-salam'],
    relatedHadith: ['h-bukhari-13', 'h-bukhari-5027'],
    keywords: ['distress', 'help', 'knowledge', 'quran', 'mercy', 'كرب', 'تنفيس', 'علم', 'قرآن'],
    reviewStatus: 'demo-unreviewed',
  },
  {
    id: 'h-tirmidhi-1956',
    title: { en: 'A smile is charity', ar: 'الابتسامة صدقة' },
    narrator: { en: 'Abu Dharr', ar: 'أبو ذر رضي الله عنه' },
    collection: 'tirmidhi',
    source: {
      collection: { en: 'Jami‘ at-Tirmidhi', ar: 'جامع الترمذي' },
      collectionArabic: 'جامع الترمذي',
      number: '1956',
      reference: 'Jami‘ at-Tirmidhi 1956',
      inBookReference: 'Book 27, Hadith 62',
      url: 'https://sunnah.com/tirmidhi:1956',
      arabicEdition: 'Sunnah.com Arabic text · isnad omitted from the reading view',
    },
    arabic:
      'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ، وَأَمْرُكَ بِالْمَعْرُوفِ وَنَهْيُكَ عَنِ الْمُنْكَرِ صَدَقَةٌ، وَإِرْشَادُكَ الرَّجُلَ فِي أَرْضِ الضَّلَالِ لَكَ صَدَقَةٌ، وَبَصَرُكَ لِلرَّجُلِ الرَّدِيءِ الْبَصَرِ لَكَ صَدَقَةٌ، وَإِمَاطَتُكَ الْحَجَرَ وَالشَّوْكَةَ وَالْعَظْمَ عَنِ الطَّرِيقِ لَكَ صَدَقَةٌ، وَإِفْرَاغُكَ مِنْ دَلْوِكَ فِي دَلْوِ أَخِيكَ لَكَ صَدَقَةٌ',
    meaning: {
      en: 'A smile offered to another person is charity. So are many small acts: encouraging what is good, guiding someone who is lost, helping someone see, removing a stone or thorn from a path, and sharing water.',
      ar: 'تبسّمك في وجه أخيك صدقة، وكذلك أمرك بالمعروف ونهيك عن المنكر، وإرشادك من ضل الطريق، وإعانتك من ضعف بصره، وإزالة الحجر أو الشوك أو العظم عن الطريق، وسكبك من دلوك في دلو أخيك.',
    },
    explanation: {
      en: 'This hadith expands charity beyond money. A smile, a kind word, practical help, and removing something harmful from a path are all counted. It gives children and adults simple, reachable ways to give.',
      ar: 'يوسّع الحديث معنى الصدقة ليتجاوز المال؛ فالابتسامة والكلمة الطيبة والمساعدة العملية وإزالة الأذى عن الطريق كلها صدقات. ويمنح الأطفال والكبار طرقًا بسيطة وقريبة للعطاء.',
    },
    context: {
      en: 'Abu Dharr narrated it in Jami‘ at-Tirmidhi. The collection records the grade as Hasan (Darussalam), and Imam at-Tirmidhi’s own note in the Arabic text describes it as hasan gharib.',
      ar: 'رواه أبو ذر رضي الله عنه في جامع الترمذي. وتذكر الطبعة درجة «حسن - دار السلام»، كما يصف الإمام الترمذي الحديث في تعليقه العربي بأنه «حسن غريب».',
    },
    why: {
      en: 'Charity can begin with a face, a greeting, or a small service. These acts cost little but change the atmosphere around us.',
      ar: 'قد تبدأ الصدقة بوجه مبتسم أو تحية أو خدمة صغيرة؛ فهي لا تكلف كثيرًا لكنها تغيّر الجو حولنا.',
    },
    vocabulary: [
      { arabic: 'تَبَسُّم', transliteration: 'tabassum', meaning: { en: 'smile', ar: 'الابتسامة' } },
      { arabic: 'صَدَقَة', transliteration: 'ṣadaqah', meaning: { en: 'charity, a giving of good', ar: 'الصدقة والعطاء' } },
      { arabic: 'الْمَعْرُوف', transliteration: 'al-ma‘rūf', meaning: { en: 'what is good and known to be right', ar: 'الخير المعروف' } },
      { arabic: 'إِمَاطَة', transliteration: 'imāṭah', meaning: { en: 'removing, clearing away', ar: 'الإزالة والتنحية' } },
    ],
    topics: ['character', 'beliefs'],
    ageBands: ['child', 'teen', 'adult'],
    grading: {
      label: { en: 'Hasan (Darussalam)', ar: 'حسن (دار السلام)' },
      authority: 'Darussalam, as published on Sunnah.com',
      sourceUrl: 'https://sunnah.com/tirmidhi:1956',
      note: {
        en: 'Sunnah.com records “Hasan (Darussalam)” for this entry. Imam at-Tirmidhi’s own Arabic note describes the hadith as hasan gharib. Darussalam’s grading is a publisher’s classification, not a quotation of the Imam’s words.',
        ar: 'يسجّل موقع سنّة.كوم درجة «حسن - دار السلام» لهذا الحديث. ويصف الإمام الترمذي الحديث في تعليقه العربي بأنه «حسن غريب». ودرجة دار السلام تصنيف ناشر، وليست نقلًا حرفيًا لكلام الإمام.',
      },
    },
    englishMeaning: { kind: 'saja-paraphrase', note: meaningNote },
    relatedKnowledge: ['k-kindness', 'k-gratitude'],
    relatedHadith: ['h-bukhari-13', 'h-bukhari-7376'],
    keywords: ['smile', 'charity', 'kindness', 'good', 'path', 'ابتسامة', 'صدقة', 'معروف', 'أذى'],
    reviewStatus: 'demo-unreviewed',
  },
];

export const HADITH_BY_ID: Record<string, HadithRecord> = Object.fromEntries(HADITHS.map((h) => [h.id, h]));

export const HADITH_COLLECTION_LABEL: Record<HadithRecord['collection'], { en: string; ar: string }> = {
  bukhari: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' },
  muslim: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
  tirmidhi: { en: 'Jami‘ at-Tirmidhi', ar: 'جامع الترمذي' },
};
