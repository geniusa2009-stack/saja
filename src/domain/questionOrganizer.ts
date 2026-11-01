/**
 * Deterministic question organiser for Ask a Scholar: tidies wording, removes
 * personal details, detects the topic and suggests context a scholar may need.
 * It structures the question — it never answers it.
 */
import type { L10n, TopicId } from './types';
import { KNOWLEDGE } from '../content/knowledge';

export interface OrganizedQuestion {
  question: string;
  topic: TopicId | 'other';
  removedPersonalInfo: boolean;
  clarifiers: L10n[];
  related: { id: string; question: L10n }[];
}

const TOPIC_HINTS: [TopicId, RegExp][] = [
  ['prayer', /pray|salah|salat|fajr|dhuhr|asr|maghrib|isha|صلا|الفجر|الظهر|العصر|المغرب|العشاء/i],
  ['purification', /wudu|ablution|ghusl|pure|najas|وضوء|غسل|طهار/i],
  ['fasting', /fast|ramadan|suhoor|iftar|صيام|صوم|رمضان/i],
  ['quran', /qur'?an|surah|verse|ayah|recite|قرآن|سورة|آية/i],
  ['beliefs', /believe|belief|iman|aqeedah|angel|qadar|إيمان|عقيدة|القدر/i],
  ['character', /parents|friend|kind|honest|anger|family|والد|صديق|صدق|غضب|أسرة/i],
];

/** AI-assisted organisation — structure only, never an answer. */
export function organizeQuestion(raw: string, context?: string): OrganizedQuestion {
  let q = raw.trim().replace(/\s+/g, ' ');
  const before = q;
  q = q
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email removed]')
    .replace(/(?:\+?[\d٠-٩][\s\-.()]*){7,}/gu, '[number removed] ');
  if (q && !/[?؟]$/.test(q)) q += /[؀-ۿ]/.test(q) ? '؟' : '?';
  q = q.charAt(0).toUpperCase() + q.slice(1);

  const all = `${raw} ${context ?? ''}`;
  const topic = TOPIC_HINTS.find(([, re]) => re.test(all))?.[0] ?? 'other';

  const clarifiers: L10n[] = [];
  if (!context || context.length < 10) clarifiers.push({ en: 'Add a little context — what situation are you in?', ar: 'أضف قليلًا من السياق — ما الموقف الذي تمر به؟' });
  if (/travel|journey|trip|سفر|مسافر/i.test(all)) clarifiers.push({ en: 'How long is the trip, and how far?', ar: 'كم مدة السفر ومسافته؟' });
  if (topic === 'prayer' || topic === 'purification' || topic === 'fasting') clarifiers.push({ en: 'Do you follow a particular school (madhhab)? It’s fine if not.', ar: 'هل تتبع مذهبًا معينًا؟ لا بأس إن لم يكن.' });

  const related = KNOWLEDGE.filter((k) => topic !== 'other' && k.topics.includes(topic)).slice(0, 2).map((k) => ({ id: k.id, question: k.question }));

  return { question: q, topic, removedPersonalInfo: q !== before && /removed/.test(q), clarifiers, related };
}
