import type { ClaimVerdict, L10n } from '@/domain/types';

/**
 * Claim rules for AMANAH / NOUR (DEMO).
 * A rule recognises a *specific* claim and states what the curated knowledge
 * base supports. Anything no rule recognises is marked "requires human review"
 * — the verifier never invents a verdict.
 */
export interface ClaimRule {
  id: string;
  patterns: RegExp[];
  verdict: ClaimVerdict;
  knowledge: string[];
  explanation: L10n;
  suggestion?: L10n;
  /** If any of these match, the rule does not apply (e.g. hedged phrasing). */
  unless?: RegExp[];
}

export const CLAIM_RULES: ClaimRule[] = [
  {
    id: 'child-fast-seven',
    patterns: [/(every|all) child(ren)? must fast.*(seven|7)/i, /(from|at) (the )?age (of )?(seven|7).*(must|obligat|required).*fast/i, /fast.*(obligat|required|must).*(seven|7)/i, /يجب.*الصيام.*(السابعة|سبع|٧)/u, /الطفل.*يصوم.*(السابعة|سبع|٧)/u],
    verdict: 'mismatch',
    knowledge: ['k-fasting'],
    explanation: {
      en: 'Fasting becomes obligatory at puberty. Children are encouraged gradually — the Companions trained their children with love, not obligation.',
      ar: 'يجب الصيام عند البلوغ، ويُشجَّع الأطفال تدريجيًا — كان الصحابة يعوّدون أبناءهم بلطف لا إلزامًا.',
    },
    suggestion: {
      en: 'Fasting becomes obligatory at puberty; many families gently encourage children to practise before then.',
      ar: 'يجب الصيام عند البلوغ، وتشجّع أسر كثيرة أطفالها على التدرّب عليه قبل ذلك بلطف.',
    },
  },
  {
    id: 'qadr-27',
    patterns: [/laylat al.?qadr (is|falls on) the 27/i, /night of (power|decree) is (on )?the 27/i, /ليلة القدر (هي|في) (ليلة )?(السابع والعشرين|٢٧|27)/u],
    unless: [/\b(may|might|often|likely|some)\b|\bmany\b.*\b(say|says|believe|hold|consider)\b/i, /يرجح|رجّح|قد تكون|الأرجح|قيل|كثير من العلماء/u],
    verdict: 'needs-context',
    knowledge: ['k-laylat-al-qadr'],
    explanation: {
      en: 'Sought in the odd nights of the last ten (Bukhari 2017); the 27th is a common view, not certain.',
      ar: 'تُتحرّى في الوتر من العشر الأواخر (البخاري ٢٠١٧)، والسابع والعشرون قول مشهور لا يقين فيه.',
    },
    suggestion: {
      en: 'Laylat al-Qadr is in the odd nights of the last ten of Ramadan; many scholars considered the 27th most likely.',
      ar: 'ليلة القدر في الوتر من العشر الأواخر من رمضان، ورجّح كثير من العلماء ليلة السابع والعشرين.',
    },
  },
  {
    id: 'pillars-fasting',
    patterns: [/fast(ing)? .*(one of )?the five pillars/i, /five pillars/i, /أركان الإسلام الخمسة|ركن من أركان الإسلام/u],
    verdict: 'supported',
    knowledge: ['k-pillars'],
    explanation: { en: 'Islam is built on five, including fasting Ramadan (Bukhari 8).', ar: 'بني الإسلام على خمس منها صوم رمضان (البخاري ٨).' },
  },
  {
    id: 'revelation-ramadan',
    patterns: [/qur'?an was (first )?revealed (in|during) (the month of )?ramadan/i, /qur'?an was (first )?revealed (in|during) this month/i, /(in|during) ramadan.*qur'?an (was )?(first )?revealed/i, /نزل القرآن في (شهر )?رمضان|أنزل القرآن في رمضان/u],
    verdict: 'supported',
    knowledge: ['k-first-revelation'],
    explanation: { en: '“The month of Ramadhan [is that] in which was revealed the Qur’an” (2:185).', ar: '«شهر رمضان الذي أنزل فيه القرآن» (البقرة ١٨٥).' },
  },
  {
    id: 'first-word-read',
    patterns: [/first (word|words|verse|verses) (revealed )?(was|were) .*(read|iqra|recite)/i, /أول ما نزل.*اقرأ/u],
    verdict: 'supported',
    knowledge: ['k-first-revelation'],
    explanation: { en: 'The view of the great majority: the opening of Surah al-‘Alaq (96:1) — Bukhari 3.', ar: 'قول الجمهور: مطلع سورة العلق (٩٦:١) — البخاري ٣.' },
  },
  {
    id: 'first-word-fatiha',
    patterns: [/first (surah|chapter|thing) (revealed )?was (al-)?fatiha/i, /أول ما نزل.*الفاتحة/u],
    verdict: 'needs-context',
    knowledge: ['k-first-revelation'],
    explanation: { en: 'Most scholars hold that the first revelation was the opening of al-‘Alaq; al-Fatihah is the first surah in the mushaf’s order, not the first revealed.', ar: 'يرى الجمهور أن أول ما نزل مطلع العلق، والفاتحة أول سورة في ترتيب المصحف لا في النزول.' },
    suggestion: { en: 'Al-Fatihah opens the Qur’an; the first verses revealed were the opening of Surah al-‘Alaq.', ar: 'الفاتحة فاتحة المصحف، وأول ما نزل مطلع سورة العلق.' },
  },
  {
    id: 'five-prayers',
    patterns: [/pray(er|ers)? five times (a|each|every) day/i, /five daily prayers/i, /الصلوات الخمس|خمس صلوات/u],
    verdict: 'supported',
    knowledge: ['k-five-prayers'],
    explanation: { en: 'Prayer is “a decree of specified times” (4:103); five were given on the Night Journey (Bukhari 349).', ar: '«كتابًا موقوتًا» (النساء ١٠٣)، وفُرضت خمسًا في المعراج (البخاري ٣٤٩).' },
  },
  {
    id: 'wudu-wash-head',
    patterns: [/wudu.*(wash|washing) (your |the )?head/i, /(wash|washing) (your |the )?head.*wudu/i, /غسل الرأس في الوضوء/u],
    verdict: 'mismatch',
    knowledge: ['k-wudu'],
    explanation: { en: 'In wudu the head is wiped, not washed — “wipe over your heads” (5:6).', ar: 'في الوضوء يُمسح الرأس ولا يُغسل: «وامسحوا برؤوسكم» (المائدة ٦).' },
    suggestion: { en: 'In wudu, you wipe over your head with wet hands.', ar: 'في الوضوء تمسح رأسك بيدين مبلولتين.' },
  },
  {
    id: 'wudu-parts',
    patterns: [/wudu.*(face).*(arms|elbows).*(head).*(feet|ankles)/i, /الوضوء.*الوجه.*المرفقين.*الرأس.*الكعبين/u],
    verdict: 'supported',
    knowledge: ['k-wudu'],
    explanation: { en: 'These four acts are named in Qur’an 5:6.', ar: 'هذه الأفعال الأربعة مذكورة في المائدة ٦.' },
  },
  {
    id: 'intention-aloud',
    patterns: [/(must|have to|need to) say (the |your )?intention (out )?loud/i, /intention (must|has to) be (said|spoken)/i, /يجب التلفظ بالنية|لا بد من النطق بالنية/u],
    verdict: 'needs-context',
    knowledge: ['k-intention'],
    explanation: { en: 'Scholars agree the intention’s place is the heart; saying it aloud is not a requirement (some considered it recommended, others discouraged it).', ar: 'اتفق العلماء على أن محل النية القلب، والتلفظ بها ليس شرطًا (استحبه بعضهم وكرهه آخرون).' },
    suggestion: { en: 'The intention is made in the heart; you don’t need to say it aloud.', ar: 'النية محلها القلب، ولا يلزم النطق بها.' },
  },
  {
    id: 'smile-charity',
    patterns: [/smil(e|ing).*(is )?(a )?charity/i, /تبسمك.*صدقة|الابتسامة صدقة/u],
    verdict: 'supported',
    knowledge: ['k-kindness'],
    explanation: { en: '“Your smile in the face of your brother is charity” (Tirmidhi 1956).', ar: '«تبسمك في وجه أخيك لك صدقة» (الترمذي ١٩٥٦).' },
  },
  {
    id: 'names-exactly-99',
    patterns: [/(only|exactly) (99|ninety.nine) names/i, /allah has (only )?(99|ninety.nine) names(?! .*(among|special|including))/i, /(فقط|بالضبط).*تسعة وتسعون اسم|تسعة وتسعين اسما فقط/u],
    verdict: 'needs-context',
    knowledge: ['k-names'],
    explanation: { en: 'The hadith mentions ninety-nine names (Bukhari 2736), but scholars note Allah’s names are not limited to them.', ar: 'ذكر الحديث تسعة وتسعين اسمًا (البخاري ٢٧٣٦)، وينبّه العلماء إلى أن أسماء الله لا تنحصر فيها.' },
    suggestion: { en: 'A hadith mentions ninety-nine of Allah’s names; His names are not limited to these.', ar: 'ذكر حديث تسعة وتسعين من أسماء الله، وأسماؤه لا تنحصر فيها.' },
  },
  {
    id: 'hijra-jerusalem',
    patterns: [/hij(ra|rah).*(to|towards) jerusalem/i, /الهجرة.*إلى القدس/u],
    verdict: 'mismatch',
    knowledge: ['k-hijra'],
    explanation: { en: 'The Hijra was from Makkah to Madinah. The journey to Jerusalem is the Night Journey (al-Isra’), a different event.', ar: 'الهجرة كانت من مكة إلى المدينة، أما الرحلة إلى القدس فهي الإسراء، وهو حدث مختلف.' },
    suggestion: { en: 'The Hijra was the migration from Makkah to Madinah.', ar: 'الهجرة هي الانتقال من مكة إلى المدينة.' },
  },
  {
    id: 'hijra-madinah',
    patterns: [/hij(ra|rah).*(makkah|mecca).*(madinah|medina)/i, /الهجرة.*من مكة.*المدينة/u],
    verdict: 'supported',
    knowledge: ['k-hijra'],
    explanation: { en: 'Consistent with the historical record and Qur’an 9:40.', ar: 'موافق للسجل التاريخي وآية التوبة ٤٠.' },
  },
  {
    id: 'calendar-birth',
    patterns: [/(hijri|islamic) calendar (starts|begins|counts) (from|with) the (prophet'?s )?birth/i, /التقويم الهجري يبدأ من (مولد|ولادة)/u],
    verdict: 'mismatch',
    knowledge: ['k-hijra'],
    explanation: { en: 'The Hijri calendar counts from the year of the Hijra, not the Prophet’s ﷺ birth.', ar: 'يبدأ التقويم الهجري من سنة الهجرة لا من المولد النبوي.' },
    suggestion: { en: 'The Hijri calendar counts its years from the Hijra.', ar: 'يبدأ التقويم الهجري من الهجرة.' },
  },
  {
    id: 'ramadan-fixed',
    patterns: [/ramadan (is )?always (in|during) (the )?(summer|winter|spring|autumn)/i, /ramadan (is|falls) on the same (date|day) every year/i, /رمضان دائما في (الصيف|الشتاء)/u],
    verdict: 'mismatch',
    knowledge: ['k-hijra'],
    explanation: { en: 'Islamic months follow the moon, so Ramadan moves about 11 days earlier each solar year and passes through every season.', ar: 'الأشهر الهجرية قمرية، فيتقدم رمضان نحو ١١ يومًا كل سنة شمسية ويمر بكل الفصول.' },
    suggestion: { en: 'Ramadan moves about 11 days earlier each year, so it passes through every season.', ar: 'يتقدم رمضان نحو ١١ يومًا كل عام فيمر بالفصول كلها.' },
  },
];

/** Words that make a sentence a religious *claim* worth checking. */
export const CLAIM_SIGNALS = [
  /\b(allah|god|prophet|messenger|qur'?an|koran|hadith|sunnah|islam|muslim|pray|prayer|salah|salat|fast|fasting|ramadan|wudu|ablution|pillar|revealed|revelation|hij(ra|rah)|zakat|zakah|hajj|haram|halal|obligatory|fard|laylat|angel|jibril|mecca|makkah|madinah|medina|surah|verse|names)\b/i,
  /الله|النبي|الرسول|القرآن|حديث|السنة|الإسلام|مسلم|صلاة|الصلاة|صيام|الصيام|رمضان|وضوء|الوضوء|ركن|نزل|الوحي|الهجرة|زكاة|الحج|حرام|حلال|واجب|فرض|ليلة القدر|ملك|جبريل|مكة|المدينة|سورة|آية/u,
];

/** Evaluative sentences ("Ramadan is a special month") are opinions, not claims to verify. */
export const OPINION = /^[^.]*\b(is|are) (a |an )?(very )?(special|beautiful|blessed|wonderful|great|lovely|amazing|important) (month|time|day|night|season|place)s?\b[^,;]*[.!]?$|^[^.،]*(شهر|وقت|يوم) (مميز|جميل|مبارك|عظيم)[^،]*[.!]?$/iu;

/** Hadith attributions no rule recognises must be checked by a human. */
export const ATTRIBUTION = /\b(the prophet|messenger of allah)\b.*\b(said|says|told)\b|قال (النبي|رسول الله)/iu;
