/**
 * Siraj — SAJA's guide. A service boundary with two adapters:
 *
 *  - `OfflineGuide` (default): deterministic, grounded ONLY in the curated
 *    knowledge base. It never generates religious claims of its own; when it
 *    cannot ground an answer, or the question needs a personal ruling, it says
 *    so and routes to Ask a Scholar.
 *  - `ConnectedGuide`: the SAJA server's retrieval-grounded pipeline
 *    (POST /api/siraj/ask) with citation validation and escalation states.
 *
 * Siraj never issues fatwa and never claims to be a scholar.
 */
import type { AgeBand, Confidence, L10n, Locale, TopicId, Purpose, Level } from '@/domain/types';
import { KNOWLEDGE_BY_ID } from '@/content/knowledge';
import { QUIZZES } from '@/content/quizzes';
import { searchKnowledge } from './knowledge';
import { api, ApiError } from '@/api/client';

export type TutorIntent = 'simple' | 'deep' | 'example' | 'quiz' | 'source' | 'why' | 'continue' | 'plan' | 'next';

export interface JourneyContext {
  name: string;
  ageBand: AgeBand;
  purpose?: Purpose;
  level?: Level;
  locale: Locale;
  lastMission?: { id: string; title: L10n; knowledge: string[]; struggled: boolean };
  nextMission?: { id: string; title: L10n; minutes: number };
  weakTopics: TopicId[];
  nextPrayer?: { name: L10n; inMinutes: number };
  focusKnowledgeId?: string;
  completedCount: number;
}

export type TutorRoute = { kind: 'mission'; id: string } | { kind: 'scholar'; draft: string } | { kind: 'day' } | { kind: 'evidence'; knowledgeId: string };

export interface TutorReply {
  id: string;
  text: string;
  state: 'answer' | 'unsure' | 'scholar' | 'guide';
  knowledgeId?: string;
  confidence?: Confidence;
  followUps: TutorIntent[];
  route?: TutorRoute;
  quiz?: { question: string; options: { label: string; correct: boolean; why: string }[] };
  /** Always true for answers built from content that hasn't been scholar-reviewed. */
  demoContent?: boolean;
  /** Trust status from the server pipeline (absent for on-device replies). */
  status?: 'supported' | 'context-needed' | 'uncertain' | 'requires-human-review' | 'guide';
  /** How the text was produced: model constrained to evidence, extracted verbatim, or fixed rules. */
  generatedBy?: 'ai' | 'extractive' | 'rules';
  /** The server was unreachable, so this came from the on-device guide. */
  offlineFallback?: boolean;
}

export interface TutorRequest {
  intent?: TutorIntent;
  text?: string;
  ctx: JourneyContext;
}

export interface TutorService {
  readonly mode: 'offline' | 'connected';
  greet(ctx: JourneyContext): TutorReply;
  respond(req: TutorRequest): Promise<TutorReply>;
}

/* ── Scholar routing (shared with the server) ─────────────────── */

import { needsScholar } from '@/domain/scholarRouting';
export { needsScholar };

/* ── Offline guide ───────────────────────────────────────────── */

let seq = 0;
const nid = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;
const pick = (l: L10n, locale: Locale) => l[locale];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const T = {
  greetFirst: { en: 'Welcome, {name}. I’m Siraj. We can learn together at your own pace, beginning wherever you feel comfortable.', ar: 'أهلًا يا {name}. أنا سراج، ونقدر نستكشف المعرفة معًا براحتك، من المكان اللي تختاره.' },
  greetExplore: { en: 'Welcome, {name}. What would you like to discover about Islam? You can ask questions freely.', ar: 'أهلًا يا {name}. تحب تكتشف إيه عن الإسلام؟ اسأل بحرية ومن غير افتراضات.' },
  greetNew: { en: 'Welcome, {name}. Small steps are enough; we can explore prayer, Al-Fatihah or any question you have.', ar: 'أهلًا يا {name}. نمشي خطوة بخطوة، ونقدر نبدأ بالصلاة أو الفاتحة أو أي سؤال عندك.' },
  greetAfter: { en: 'You just finished “{mission}”. Want to understand why each step matters?', ar: 'أنهيت للتو «{mission}». هل تحب أن تفهم لماذا تهمّ كل خطوة؟' },
  greetStruggled: { en: '“{mission}” had some tricky moments — that’s how learning works. Want me to show it another way?', ar: 'كانت في «{mission}» لحظات صعبة، وهكذا يكون التعلّم. هل أعرضها لك بطريقة أخرى؟' },
  greetPrayer: { en: '{prayer} is in {minutes} minutes. Want a short mission before then?', ar: 'بقي على {prayer} {minutes} دقيقة. هل تريد مهمة قصيرة قبلها؟' },
  greetNext: { en: 'Welcome back, {name}. “{mission}” is waiting — about {minutes} minutes.', ar: 'أهلًا بعودتك يا {name}. «{mission}» في انتظارك — نحو {minutes} دقائق.' },
  unsure: { en: 'I’m not certain about that, and I don’t want to guess on something that matters. I can help you send it to a verified scholar.', ar: 'لست متأكدًا من ذلك، ولا أريد أن أخمّن في أمر مهم. يمكنني مساعدتك في إرساله إلى عالم موثّق.' },
  scholar: { en: 'This sounds like it depends on your situation, so it needs a qualified scholar — not me. I’ve drafted it for Ask a Scholar; you can edit it before sending.', ar: 'يبدو أن الجواب يعتمد على حالتك، فيحتاج إلى عالم مؤهل لا إليّ. جهّزت لك مسودة في «اسأل عالمًا» ويمكنك تعديلها قبل الإرسال.' },
  source: { en: 'Here’s where this comes from. Tap “Show evidence” to see each source, its context, and what scholars differ on.', ar: 'هذا مصدر المعلومة. اضغط «أظهر الدليل» لترى كل مصدر وسياقه وما اختلف فيه العلماء.' },
  continue: { en: 'Let’s keep going. “{mission}” is next — it builds on what you just did.', ar: 'لنواصل. التالي «{mission}» ويبني على ما فعلته للتو.' },
  continueNone: { en: 'You’ve explored everything that’s awake right now. New places open as you learn — check the map.', ar: 'استكشفت كل ما هو مستيقظ الآن. تفتح أماكن جديدة كلما تعلّمت — انظر الخريطة.' },
  plan: { en: 'Let’s plan today together. Tell me how your day looks — “I’m busy”, “exam tomorrow”, or “only 20 minutes” — and I’ll shape it.', ar: 'لنخطط ليومك معًا. أخبرني كيف يبدو يومك — «مشغول» أو «عندي امتحان غدًا» أو «عندي ٢٠ دقيقة فقط» — وسأرتبه لك.' },
  nextRevisit: { en: 'I noticed {topic} felt tricky. “{mission}” approaches it from a new angle.', ar: 'لاحظت أن {topic} كان صعبًا بعض الشيء. «{mission}» يتناوله من زاوية جديدة.' },
  quizIntro: { en: 'Quick check — no pressure:', ar: 'سؤال سريع — بلا ضغط:' },
  noFocus: { en: 'Ask me anything about your journey, or pick one of these.', ar: 'اسألني عن أي شيء في رحلتك، أو اختر واحدًا من هذه.' },
};

const TOPIC_NAMES: Record<TopicId, L10n> = {
  prayer: { en: 'prayer', ar: 'الصلاة' },
  purification: { en: 'wudu', ar: 'الوضوء' },
  quran: { en: 'the Qur’an', ar: 'القرآن' },
  character: { en: 'character', ar: 'الأخلاق' },
  beliefs: { en: 'beliefs', ar: 'العقيدة' },
  terminology: { en: 'key terms', ar: 'المصطلحات' },
  fasting: { en: 'fasting', ar: 'الصيام' },
  history: { en: 'history', ar: 'التاريخ' },
};

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

export class OfflineGuide implements TutorService {
  readonly mode = 'offline' as const;

  greet(ctx: JourneyContext): TutorReply {
    const l = ctx.locale;
    const vars = { name: ctx.name };
    if (ctx.lastMission) {
      const tpl = ctx.lastMission.struggled ? T.greetStruggled : T.greetAfter;
      return {
        id: nid(),
        state: 'guide',
        text: fill(pick(tpl, l), { ...vars, mission: pick(ctx.lastMission.title, l) }),
        knowledgeId: ctx.lastMission.knowledge[0],
        followUps: ctx.lastMission.struggled ? ['example', 'simple', 'quiz'] : ['why', 'source', 'next'],
      };
    }
    if (ctx.purpose !== 'exploring' && ctx.nextPrayer && ctx.nextPrayer.inMinutes <= 30 && ctx.nextMission) {
      return { id: nid(), state: 'guide', text: fill(pick(T.greetPrayer, l), { prayer: pick(ctx.nextPrayer.name, l), minutes: ctx.nextPrayer.inMinutes }), followUps: ['next', 'plan'] };
    }
    if (ctx.completedCount === 0) {
      const greeting = ctx.purpose === 'exploring' ? T.greetExplore : ctx.purpose === 'new-muslim' ? T.greetNew : T.greetFirst;
      return { id: nid(), state: 'guide', text: fill(pick(greeting, l), vars), followUps: ['next', 'simple', 'plan'] };
    }
    if (ctx.nextMission)
      return { id: nid(), state: 'guide', text: fill(pick(T.greetNext, l), { ...vars, mission: pick(ctx.nextMission.title, l), minutes: ctx.nextMission.minutes }), followUps: ['next', 'plan', 'quiz'] };
    return { id: nid(), state: 'guide', text: pick(T.noFocus, l), followUps: ['plan', 'next'] };
  }

  async respond({ intent, text, ctx }: TutorRequest): Promise<TutorReply> {
    await wait(420 + Math.random() * 380); // gentle pacing so replies don't feel mechanical
    const l = ctx.locale;

    if (text && needsScholar(text)) {
      return { id: nid(), state: 'scholar', text: pick(T.scholar, l), followUps: [], route: { kind: 'scholar', draft: text } };
    }

    if (text) {
      const [hit] = searchKnowledge(text);
      if (!hit) return { id: nid(), state: 'unsure', text: pick(T.unsure, l), followUps: [], route: { kind: 'scholar', draft: text } };
      const e = hit.entry;
      return { id: nid(), state: 'answer', text: pick(e.simple, l), knowledgeId: e.id, confidence: e.confidence, followUps: ['deep', 'example', 'source', 'why'], demoContent: e.reviewStatus !== 'reviewed' };
    }

    const kid = ctx.focusKnowledgeId ?? ctx.lastMission?.knowledge[0];
    const entry = kid ? KNOWLEDGE_BY_ID[kid] : undefined;

    switch (intent) {
      case 'plan':
        return { id: nid(), state: 'guide', text: pick(T.plan, l), followUps: [], route: { kind: 'day' } };
      case 'next':
      case 'continue': {
        if (!ctx.nextMission) return { id: nid(), state: 'guide', text: pick(T.continueNone, l), followUps: ['plan'] };
        const weak = ctx.weakTopics[0];
        const txt = weak && intent === 'next'
          ? fill(pick(T.nextRevisit, l), { topic: pick(TOPIC_NAMES[weak], l), mission: pick(ctx.nextMission.title, l) })
          : fill(pick(T.continue, l), { mission: pick(ctx.nextMission.title, l) });
        return { id: nid(), state: 'guide', text: txt, followUps: ['plan'], route: { kind: 'mission', id: ctx.nextMission.id } };
      }
    }

    if (!entry) return { id: nid(), state: 'guide', text: pick(T.noFocus, l), followUps: ['next', 'plan'] };
    const base = { knowledgeId: entry.id, confidence: entry.confidence, demoContent: entry.reviewStatus !== 'reviewed' };
    switch (intent) {
      case 'deep':
        return { id: nid(), state: 'answer', text: pick(entry.deep, l), followUps: ['example', 'source', 'quiz'], ...base };
      case 'example':
        return { id: nid(), state: 'answer', text: pick(entry.example, l), followUps: ['why', 'quiz', 'next'], ...base };
      case 'why':
        return { id: nid(), state: 'answer', text: pick(entry.why, l), followUps: ['source', 'deep', 'next'], ...base };
      case 'source':
        return { id: nid(), state: 'answer', text: pick(T.source, l), followUps: ['deep', 'next'], route: { kind: 'evidence', knowledgeId: entry.id }, ...base };
      case 'quiz': {
        const q = QUIZZES[entry.id];
        if (!q) return { id: nid(), state: 'answer', text: pick(entry.example, l), followUps: ['why', 'next'], ...base };
        return {
          id: nid(),
          state: 'answer',
          text: pick(T.quizIntro, l),
          quiz: { question: pick(q.q, l), options: q.options.map((o) => ({ label: pick(o.label, l), correct: o.correct, why: pick(o.why, l) })) },
          followUps: ['why', 'next'],
          ...base,
        };
      }
      case 'simple':
      default:
        return { id: nid(), state: 'answer', text: pick(entry.simple, l), followUps: ['deep', 'example', 'source'], ...base };
    }
  }
}

/* ── Connected adapter: the SAJA server's grounded pipeline ─── */

/** What the server's Siraj pipeline returns (see server/modules/siraj/pipeline.ts). */
interface ServerAnswer {
  status: 'supported' | 'context-needed' | 'uncertain' | 'requires-human-review' | 'guide';
  text: string;
  knowledgeId?: string;
  confidence?: Confidence;
  evidence: { id: string; ref: string }[];
  generatedBy: 'ai' | 'extractive' | 'rules';
  demoContent: boolean;
  route?: { kind: 'scholar'; draft: string } | { kind: 'evidence'; knowledgeId: string };
  followUps: TutorIntent[];
}

const STATE: Record<ServerAnswer['status'], TutorReply['state']> = {
  supported: 'answer',
  'context-needed': 'answer',
  uncertain: 'unsure',
  'requires-human-review': 'scholar',
  guide: 'guide',
};

/** Journey navigation (continue / next / plan) and quizzes stay local; knowledge answers come from the server. */
const SERVER_INTENTS = new Set<TutorIntent>(['simple', 'deep', 'example', 'why', 'source']);

export class ConnectedGuide implements TutorService {
  readonly mode = 'connected' as const;
  constructor(private local: OfflineGuide = new OfflineGuide()) {}

  greet(ctx: JourneyContext) {
    return this.local.greet(ctx);
  }

  async respond(req: TutorRequest): Promise<TutorReply> {
    const focus = req.ctx.focusKnowledgeId ?? req.ctx.lastMission?.knowledge[0];
    if (!req.text && (!req.intent || !SERVER_INTENTS.has(req.intent) || !focus)) return this.local.respond(req);
    // Only journey context is sent — never the name, contact details or location.
    const a = await api.post<ServerAnswer>('/siraj/ask', {
      text: req.text,
      intent: req.text ? undefined : req.intent,
      ctx: {
        locale: req.ctx.locale,
        focusKnowledgeId: focus,
        weakTopics: req.ctx.weakTopics.slice(0, 8),
        lastMission: req.ctx.lastMission ? { id: req.ctx.lastMission.id, title: req.ctx.lastMission.title[req.ctx.locale].slice(0, 80) } : undefined,
      },
    });
    return {
      id: nid(),
      text: a.text,
      state: STATE[a.status],
      status: a.status,
      generatedBy: a.generatedBy,
      knowledgeId: a.knowledgeId,
      confidence: a.confidence,
      followUps: a.followUps,
      route: a.route,
      demoContent: a.demoContent,
    };
  }
}

/**
 * Chooses per request: the server when it is reachable, the on-device guide when not.
 * A failed server call falls back to the offline guide and says so.
 */
class RoutedGuide implements TutorService {
  private offline = new OfflineGuide();
  private connected = new ConnectedGuide(this.offline);
  constructor(private isOnline: () => boolean) {}
  get mode() {
    return this.isOnline() ? ('connected' as const) : ('offline' as const);
  }
  greet(ctx: JourneyContext) {
    return this.offline.greet(ctx);
  }
  async respond(req: TutorRequest): Promise<TutorReply> {
    if (!this.isOnline()) return this.offline.respond(req);
    try {
      return await this.connected.respond(req);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'rate_limited') {
        return { id: nid(), state: 'guide', text: req.ctx.locale === 'ar' ? 'لنأخذ استراحة قصيرة — حاول بعد قليل.' : 'Let’s pause for a moment — try again shortly.', followUps: [] };
      }
      const r = await this.offline.respond(req);
      return { ...r, offlineFallback: true };
    }
  }
}

let onlineProbe: () => boolean = () => false;
/** Wired by the app at start-up so this module doesn't import the stores. */
export function setTutorConnectivity(probe: () => boolean) {
  onlineProbe = probe;
}

export const tutor: TutorService = new RoutedGuide(() => onlineProbe());
