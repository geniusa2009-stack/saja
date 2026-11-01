/**
 * SIRAJ — retrieval-grounded guide.
 *
 *   input → normalise → intent (deterministic) → safety → retrieve → relevance filter
 *   → evidence assembly → [LLM generation, constrained to evidence] → citation validation
 *   → confidence check → ANSWER | CONTEXT-NEEDED | UNCERTAIN | REQUIRES HUMAN REVIEW
 *
 * The model (whichever provider the router picks) never answers without retrieved evidence, cannot add citations
 * that weren't provided, and never issues rulings. Button intents (simple,
 * deeper, example, why, source, quiz) are served deterministically from the
 * curated document — no model call.
 */
import { createHash } from 'node:crypto';
import { compact } from '../../ai/guard.ts';
import type { Services } from '../../context.ts';
import type { Access } from '../../auth/access.ts';
import { needsScholar } from '../../../src/domain/scholarRouting.ts';
import { detectFlags } from '../../../src/domain/safety.ts';
import { retrieve, type RetrievedDocument } from '../knowledge/retrieval.ts';
import { getKnowledge, type KnowledgeView } from '../knowledge/store.ts';
import { log } from '../../lib/log.ts';

export type SirajStatus = 'supported' | 'context-needed' | 'uncertain' | 'requires-human-review' | 'guide';
export type SirajIntent = 'simple' | 'deep' | 'example' | 'why' | 'source' | 'quiz';

export interface SirajContext {
  locale: 'en' | 'ar';
  lastMission?: { id: string; title: string };
  weakTopics?: string[];
  modality?: string;
  focusKnowledgeId?: string;
}

export interface EvidenceOut {
  id: string;
  ref: string;
  kind: string;
  rendering: string;
  translationName?: string;
  text: string;
  arabic?: string;
}

export interface SirajAnswer {
  status: SirajStatus;
  text: string;
  knowledgeId?: string;
  confidence?: string;
  evidence: EvidenceOut[];
  generatedBy: 'ai' | 'extractive' | 'rules';
  demoContent: boolean;
  reviewStatus?: string;
  /** Exact knowledge version the answer came from (provenance). */
  contentVersion?: number;
  route?: { kind: 'scholar'; draft: string } | { kind: 'evidence'; knowledgeId: string };
  followUps: SirajIntent[];
  related?: string[];
  cached?: boolean;
}

const MAX_INPUT = 600;
export const normalizeInput = (s: string) => [...s].map((ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? ' ' : ch)).join('').replace(/\s+/g, ' ').trim().slice(0, MAX_INPUT);

/**
 * Does the question touch Islam at all? Used only when retrieval found nothing, to tell
 * "no evidence for this religious question" (→ offer a scholar) from "not a question for
 * Siraj" (→ say so). It never makes an answer more confident.
 */
const RELIGIOUS =
  /\b(allah|god|islam\w*|muslims?|qur'?an|koran|hadith|sunnah?|prophet|messenger|pray\w*|salah|salat|wudu|ablution|fast\w*|ramadan|eid|hajj|umrah|zaka[ht]|charity|sadaqah|mosque|masjid|imam|scholars?|fatwa|halal|haram|sins?|du'?a|dhikr|jannah|paradise|hell|angels?|companions?|sahaba|fiqh|tafsir|shari'?a\w*|faith|iman|worship|hijab|qibla|makkah|mecca|madinah|medina|jerusalem|laylat|qadr|jumu'?ah|seerah|sira|revelation|surah?|ayah|verses?|recit\w*|bismillah|salam|repent\w*|tawbah|forgiv\w*|rulings?|allowed|permissible|forbidden|obligatory|religio\w*|spiritual\w*|soul|akhirah|hereafter|angel|jinn|night journey|isra|mi'?raj|hijra|hadiths?|narrations?|sahih|bukhari|tirmidhi|nasa'?i|ibn majah|abu dawud|muwatta|sunan|isnad|badr|uhud|khandaq|trench|hudaybiyy?ah|caliphs?|khalifa|abu bakr|umar|uthman|ali ibn|aisha|khadijah?|fatimah?|bilal|ka'?bah?|zamzam|safa|marwa|arafat|mina|ummah|sahabi|tabi'?in|makkan|madinan|quraysh|ansar|muhajir\w*|adhan|iqamah|takbir|tasbih|witr|tahajjud|taraweeh|sujud|ruku|khutbah|nikah|janazah|ghusl|tayammum|qur'?anic|islamic)\b|الله|إسلام|اسلام|مسلم|قرآن|القرآن|حديث|سنة|النبي|رسول|صلا|صلي|وضوء|توضأ|صوم|صيام|رمضان|عيد|حج|عمرة|زكا|صدق|مسجد|إمام|عالم|علماء|فتوى|حلال|حرام|يجوز|ذنب|دعاء|ذكر|الجنة|النار|ملائك|صحاب|فقه|تفسير|شريعة|إيمان|ايمان|عبادة|حجاب|قبلة|مكة|المدينة|القدس|ليلة القدر|الجمعة|سيرة|وحي|سورة|آية|بسم الله|السلام|توبة|استغفار|الهجرة|الآخرة|حكم|جائز|محرم|واجب|مباح|البخاري|الترمذي|النسائي|ابن ماجه|أبي داود|رواية|إسناد|بدر|أحد|الخندق|الحديبية|خليفة|الخلفاء|أبو بكر|عمر|عثمان|علي بن|عائشة|خديجة|فاطمة|بلال|الكعبة|زمزم|الصفا|المروة|عرفة|منى|الأمة|قريش|الأنصار|المهاجر|أذان|إقامة|تكبير|تسبيح|وتر|تهجد|تراويح|سجود|ركوع|خطبة|جنازة|غسل|تيمم|إسلامي/iu;

/**
 * "Is there a hadith that…?", "Did the Prophet say…?" — confirming that specific words
 * exist or are authentic is scholars' work. SAJA shows what its sources DO say, but
 * never answers such a question with confidence from merely related material.
 */
const ATTRIBUTION_QUESTION =
  /\b(is there|is it true that there is|does a|is this) (a |an )?(authentic |sahih )?(hadith|narration|verse|ayah)\b|\bdid (the )?(prophet|messenger)\b[^?]{0,20}\b(say|said|tell|teach)\b|\bis (this|that|it) (hadith|narration) (authentic|sahih|real|true|weak)\b|هل (يوجد|هناك|ورد|صح) (حديث|آية|أثر)|هل قال (النبي|الرسول|رسول الله)|هل (هذا|هذه) (الحديث|الرواية) (صحيح|صحيحة|ضعيف)/iu;

/** Distress signals get a caring, human-directed reply — never a ruling or a model call. */
const DISTRESS = /\b(kill myself|suicide|self[- ]harm|hurt myself|want to die|someone is hurting me|abuse[sd]? me)\b|أريد أن أموت|انتحار|أؤذي نفسي|يؤذيني/iu;

const COPY = {
  distress: {
    en: 'I’m really glad you told me. This is important, and you deserve help from a real person right now. Please talk to a trusted adult or someone you trust, or contact your local emergency number. You are not alone.',
    ar: 'أنا سعيد جدًا لأنك أخبرتني. هذا أمر مهم، وتستحق مساعدة من شخص حقيقي الآن. تحدّث إلى شخص كبير تثق به، أو اتصل برقم الطوارئ في بلدك. لست وحدك.',
  },
  ruling: {
    en: 'This sounds like it depends on your situation, so it needs a qualified scholar — not me. I’ve prepared it for Ask a Scholar; you can edit it before sending.',
    ar: 'يبدو أن الجواب يعتمد على حالتك، فيحتاج إلى عالم مؤهل لا إليّ. جهّزته لك في «اسأل عالمًا» ويمكنك تعديله قبل الإرسال.',
  },
  uncertain: {
    en: 'I’m not confident there is enough reliable evidence in my available sources to answer this properly. You could look at related learning, add more context, or ask a scholar.',
    ar: 'لست واثقًا من وجود أدلة كافية وموثوقة في مصادري للإجابة عن هذا كما ينبغي. يمكنك الاطلاع على تعلّم ذي صلة، أو إضافة سياق، أو سؤال عالم.',
  },
  attribution: {
    en: 'SAJA’s sources can’t confirm those exact words or that they are authentic, and checking a specific narration is scholars’ work. Here is what the sources I have do say:',
    ar: 'لا تستطيع مصادر سجى تأكيد هذه الألفاظ بعينها ولا صحتها، والتحقق من رواية بعينها عمل العلماء. هذا ما تقوله المصادر المتاحة لديّ:',
  },
  offTopic: {
    en: 'I’m here for learning about Islam on your SAJA journey, and this looks outside that, so I won’t guess. If it is a question about Islam, try asking it another way.',
    ar: 'أنا هنا للتعلّم عن الإسلام في رحلتك مع سجى، ويبدو هذا خارج ذلك، فلن أخمّن. إن كان سؤالًا عن الإسلام فجرّب صياغته بطريقة أخرى.',
  },
  source: { en: 'Here is where this comes from — each source, its context, and what scholars differ on.', ar: 'هذا مصدر المعلومة — كل مصدر وسياقه وما اختلف فيه العلماء.' },
  personalInfo: { en: 'Please don’t share personal details like phone numbers or addresses here — I’ve left them out.', ar: 'من فضلك لا تشارك بيانات شخصية مثل الأرقام أو العناوين هنا — لقد تجاهلتها.' },
};

function evidenceOf(k: KnowledgeView, locale: 'en' | 'ar'): EvidenceOut[] {
  return k.evidence.map((e, i) => ({
    id: `${k.id}#E${i + 1}`,
    ref: e.ref,
    kind: e.kind,
    rendering: e.rendering,
    translationName: e.translationName,
    text: e.text[locale] ?? e.text.en,
    arabic: e.arabic,
  }));
}

const l = (v: unknown, locale: 'en' | 'ar'): string => {
  const x = v as { en?: string; ar?: string } | undefined;
  return (x?.[locale] ?? x?.en ?? '') as string;
};

function statusFromConfidence(conf: string): SirajStatus {
  if (conf === 'review') return 'requires-human-review';
  if (conf === 'difference') return 'context-needed';
  return 'supported';
}

/* ── references named in prose ─────────────────────────────────────────── */
const DIGITS = (x: string) => x.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
const COLLECTIONS: [RegExp, string][] = [
  [/bukhari|البخاري/iu, 'bukhari'],
  [/muslim|مسلم/iu, 'muslim'],
  [/ab[ui] dawu?d|أبي داود|أبو داود|ابي داود|ابو داود/iu, 'abudawud'],
  [/tirmidhi|الترمذي/iu, 'tirmidhi'],
  [/nasa'?i|النسائي/iu, 'nasai'],
  [/ibn majah|ابن ماجه/iu, 'ibnmajah'],
  [/muwatta|الموطأ/iu, 'muwatta'],
  [/ahmad|أحمد|احمد/iu, 'ahmad'],
];
const REF_RE =
  /(qur'?an|quran|القرآن|سورة\s+\S+)\s*[(（]?\s*([\d٠-٩]{1,3})\s*[:：]\s*([\d٠-٩]{1,3})(?:\s*[–-]\s*([\d٠-٩]{1,3}))?|((?:sahih\s+|sunan\s+|jami['‘’]?\s+)?(?:al-)?(?:bukhari|muslim|ab[ui] dawu?d|tirmidhi|nasa'?i|ibn majah|muwatta|ahmad)|صحيح البخاري|صحيح مسلم|البخاري|مسلم|أبي داود|أبو داود|الترمذي|النسائي|ابن ماجه|الموطأ|أحمد)[\s,،#:]*(?:no\.?\s*|رقم\s*)?([\d٠-٩]{1,6})/giu;

/** Every Qur'an verse / hadith number a text names, as comparable keys (ranges expanded). */
export function referenceKeys(text: string): Set<string> {
  const keys = new Set<string>();
  // Models write Qur’an with typographic quotes; references must be caught either way.
  for (const m of text.replace(/[’‘`ʼ]/g, "'").matchAll(REF_RE)) {
    if (m[2]) {
      const sura = Number(DIGITS(m[2]));
      const from = Number(DIGITS(m[3]));
      const to = m[4] ? Number(DIGITS(m[4])) : from;
      for (let v = from; v <= Math.min(to, from + 300); v++) keys.add(`quran:${sura}:${v}`);
    } else if (m[5] && m[6]) {
      const coll = COLLECTIONS.find(([re]) => re.test(m[5]))?.[1] ?? 'other';
      keys.add(`${coll}:${Number(DIGITS(m[6]))}`);
    }
  }
  return keys;
}

/* ── response cache (cost control; the per-user budget lives in services.aiBudget) ── */
const cache = new Map<string, { at: number; answer: SirajAnswer }>();
const CACHE_TTL = 24 * 3_600_000;
export function resetSirajCaches() {
  cache.clear();
}

/** Deterministic answer to a button intent from a curated document. */
export async function answerIntent(s: Services, intent: SirajIntent, knowledgeId: string, locale: 'en' | 'ar'): Promise<SirajAnswer | null> {
  const k = await getKnowledge(s.db, knowledgeId);
  if (!k) return null;
  const field = intent === 'deep' ? 'deep' : intent === 'example' ? 'example' : intent === 'why' ? 'why' : 'simple';
  return {
    status: statusFromConfidence(k.confidence),
    text: intent === 'source' ? COPY.source[locale] : l(k.content[field], locale),
    knowledgeId: k.id,
    confidence: k.confidence,
    evidence: evidenceOf(k, locale),
    generatedBy: 'rules',
    demoContent: k.status !== 'published',
    reviewStatus: k.reviewStatus,
    contentVersion: k.version,
    route: intent === 'source' ? { kind: 'evidence', knowledgeId: k.id } : undefined,
    followUps: intent === 'simple' ? ['deep', 'example', 'source'] : intent === 'deep' ? ['example', 'source', 'quiz'] : ['why', 'source', 'quiz'],
  };
}

const SYSTEM = `You are Siraj, the calm guide inside SAJA, an Islamic learning app for children, new Muslims and curious learners.

You answer ONLY from the EVIDENCE provided in the user message. Rules:
- Use only facts stated in the evidence. If the evidence does not answer the question, set status "uncertain" and say so briefly.
- Never issue a religious ruling (fatwa) or apply rulings to someone's personal situation; set status "requires-human-review" for those.
- If valid scholarly views differ in the evidence, say so and set status "context-needed".
- Cite the evidence IDs you relied on in "citations". Never invent references, quotations, hadith numbers or verse numbers.
- Quotations must be copied exactly from the evidence; otherwise paraphrase and do not use quotation marks.
- Be warm, concise and transparent: at most {limit} words. Match the reader: {reader}.
- Reply in {language}.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string', enum: ['supported', 'context-needed', 'uncertain', 'requires-human-review'] },
    answer: { type: 'string' },
    citations: { type: 'array', items: { type: 'string' } },
  },
  required: ['status', 'answer', 'citations'],
} as const;

interface LlmOut {
  status: Exclude<SirajStatus, 'guide'>;
  answer: string;
  citations: string[];
}

export async function ask(s: Services, access: Access, rawText: string, ctx: SirajContext): Promise<SirajAnswer> {
  const locale = ctx.locale;
  const text = normalizeInput(rawText);

  // Safety first — deterministic.
  if (DISTRESS.test(text)) return { status: 'requires-human-review', text: COPY.distress[locale], evidence: [], generatedBy: 'rules', demoContent: false, followUps: [] };
  const flags = detectFlags(text);
  const personal = flags.some((f) => ['phone', 'email', 'address', 'handle'].includes(f));
  if (needsScholar(text)) {
    return { status: 'requires-human-review', text: COPY.ruling[locale], evidence: [], generatedBy: 'rules', demoContent: false, route: { kind: 'scholar', draft: text }, followUps: [] };
  }

  // Retrieval + relevance filter.
  let hits: RetrievedDocument[];
  try {
    hits = await retrieve(s, { query: text, limit: 3 });
  } catch (e) {
    // Retrieval down → say we can't check sources right now; never answer without them.
    log.error('retrieval.failed', { error: e });
    return { status: 'uncertain', text: COPY.uncertain[locale], evidence: [], generatedBy: 'rules', demoContent: false, route: { kind: 'scholar', draft: text }, followUps: [] };
  }
  if (hits.length === 0) {
    if (!RELIGIOUS.test(text)) return { status: 'uncertain', text: COPY.offTopic[locale], evidence: [], generatedBy: 'rules', demoContent: false, followUps: [] };
    return { status: 'uncertain', text: `${personal ? `${COPY.personalInfo[locale]} ` : ''}${COPY.uncertain[locale]}`, evidence: [], generatedBy: 'rules', demoContent: false, route: { kind: 'scholar', draft: text }, followUps: [] };
  }
  const top = hits[0];
  const k = await getKnowledge(s.db, top.documentId, { version: top.version });
  if (!k) return { status: 'uncertain', text: COPY.uncertain[locale], evidence: [], generatedBy: 'rules', demoContent: false, route: { kind: 'scholar', draft: text }, followUps: [] };
  const evidence = evidenceOf(k, locale);
  const demoContent = k.status !== 'published';
  const extractive: SirajAnswer = {
    status: statusFromConfidence(k.confidence),
    text: l(k.content.simple, locale),
    knowledgeId: k.id,
    confidence: k.confidence,
    evidence,
    generatedBy: 'extractive',
    demoContent,
    reviewStatus: k.reviewStatus,
    contentVersion: k.version,
    followUps: ['deep', 'example', 'source'],
    related: hits.slice(1).map((h) => h.documentId),
  };

  // Attribution questions: related evidence is shown, but never as confirmation — and no model call.
  if (ATTRIBUTION_QUESTION.test(text)) {
    return {
      ...extractive,
      status: extractive.status === 'requires-human-review' ? 'requires-human-review' : 'context-needed',
      text: `${COPY.attribution[locale]} ${extractive.text}`,
      route: { kind: 'scholar', draft: text },
      generatedBy: 'rules',
    };
  }

  // No model configured, or evidence is thin → curated extractive answer (honest and free).
  if (!s.ai.capabilities.has('structured_output')) return extractive;

  const key = createHash('sha256').update(`${locale}|${access.ageBand}|${k.id}@${k.version}|${text.toLowerCase()}`).digest('hex');
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return { ...hit.answer, cached: true };

  // Budget reached → still grounded, just no model call.
  if (!(await s.aiBudget.tryConsume(access.userId, 'siraj-answer'))) return extractive;

  const passages = top.chunks.filter((c) => c.section !== 'evidence').slice(0, 3);
  const evidenceBlock = [
    ...evidence.map((e) => `[${e.id}] ${e.ref} (${e.rendering === 'translation' ? `translation: ${e.translationName ?? ''}` : 'paraphrased meaning'}): ${e.text}`),
    ...passages.map((p, i) => `[${k.id}#C${i + 1}] Curated explanation (${p.section}): ${compact(p.content, 1200)}`),
    `Scholarly confidence recorded for this topic: ${k.confidence}.`,
    k.content.uncertainty ? `Known differences of opinion: ${l(k.content.uncertainty, locale)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const reader = access.ageBand === 'child' ? 'a child aged 9–12; short sentences, simple words' : ctx.modality === 'story' ? 'an adult learner who likes examples' : 'an adult learner';
  const system = SYSTEM.replace('{limit}', access.ageBand === 'child' ? '90' : '160').replace('{reader}', reader).replace('{language}', locale === 'ar' ? 'Arabic' : 'English');
  const user = `EVIDENCE:\n${evidenceBlock}\n\nLEARNER CONTEXT: ${ctx.lastMission ? `just finished "${ctx.lastMission.title}". ` : ''}${ctx.weakTopics?.length ? `finds ${ctx.weakTopics.join(', ')} tricky.` : ''}\n\nQUESTION: ${text}`;

  // Small output limit (≤160 words asked); the router picks a provider strong in the answer's language.
  const out = await s.ai.structured<LlmOut>({ system, user, schema: SCHEMA as unknown as Record<string, unknown>, maxTokens: 900, effort: 'medium', purpose: 'siraj-answer', routing: { language: locale } });
  if (!out.ok) {
    // Every provider failed, was rate-limited or is out of quota: the curated answer, never a guess.
    log.warn('siraj.llm_fallback', { reason: out.reason });
    return extractive;
  }

  // Citation validation: only IDs we provided survive.
  const allowed = new Set([...evidence.map((e) => e.id), ...passages.map((_, i) => `${k.id}#C${i + 1}`)]);
  const citations = (out.data.citations ?? []).filter((cId) => allowed.has(cId));
  const invented = (out.data.citations ?? []).length - citations.length;
  if (invented > 0) log.warn('siraj.invalid_citations', { count: invented });
  const quoted = [...(out.data.answer ?? '').matchAll(/“([^”]{12,})”|"([^"]{12,})"/g)].map((m) => m[1] ?? m[2]);
  const fabricatedQuote = quoted.some((qt) => !evidence.some((e) => e.text.includes(qt) || (e.arabic ?? '').includes(qt)));
  // A reference named in the prose must be one of the sources we supplied — not only the citation list.
  const suppliedRefs = new Set(evidence.flatMap((e) => [...referenceKeys(e.ref)]));
  const namedRefs = [...referenceKeys(out.data.answer ?? '')];
  const fabricatedReference = namedRefs.some((r) => !suppliedRefs.has(r));
  if (fabricatedQuote || fabricatedReference) log.warn('siraj.fabricated_evidence', { quote: fabricatedQuote, references: namedRefs.filter((r) => !suppliedRefs.has(r)).length });

  let status: SirajStatus = out.data.status;
  if (status === 'supported' && citations.length === 0) status = 'uncertain';
  if (fabricatedQuote || fabricatedReference) status = 'uncertain';
  if (status === 'supported' && k.confidence === 'difference') status = 'context-needed';

  const answer: SirajAnswer =
    status === 'uncertain'
      ? // The answer claims nothing, so it cites nothing: evidence must match what is said.
        { ...extractive, status: 'uncertain', text: COPY.uncertain[locale], evidence: [], route: { kind: 'scholar', draft: text }, generatedBy: 'rules' }
      : {
          ...extractive,
          status,
          text: out.data.answer.slice(0, 1400),
          evidence: evidence.filter((e) => citations.includes(e.id)).length ? evidence.filter((e) => citations.includes(e.id)) : evidence,
          generatedBy: 'ai',
          route: status === 'requires-human-review' ? { kind: 'scholar', draft: text } : undefined,
        };
  cache.set(key, { at: Date.now(), answer });
  if (cache.size > 5000) cache.clear();
  return answer;
}
