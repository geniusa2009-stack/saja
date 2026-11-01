/**
 * Data-driven mission definitions. A mission is data + an interaction type;
 * the engine renders it through a registry (client) and stores it as JSON
 * (server). Adding a mission means adding a definition — not new engine code —
 * as long as it uses an existing interaction type.
 */
import type { L10n, Mechanic, Mission, Modality } from './types';
import type { ChoiceNode, ClueHunt, MatchPair, SalahStep, WuduStep } from '../content/missions';

export const INTERACTION_TYPES = [
  'wudu-journey',
  'salah-path',
  'lantern-match',
  'kindness-choice',
  'clue-hunt',
  'reflection',
] as const satisfies readonly Mechanic[];
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export type SuccessCondition =
  | { type: 'sequence-complete'; steps: number }
  | { type: 'all-matched'; pairs: number }
  | { type: 'ending-reached' }
  | { type: 'blanks-filled'; blanks: number }
  | { type: 'reflection-saved' };

export type InteractionPayload =
  | { type: 'wudu-journey'; steps: WuduStep[] }
  | { type: 'salah-path'; steps: SalahStep[] }
  | { type: 'lantern-match'; intro: L10n; pairs: MatchPair[] }
  | { type: 'kindness-choice'; start: string; nodes: Record<string, ChoiceNode> }
  | { type: 'clue-hunt'; hunt: ClueHunt }
  | { type: 'reflection'; breaths: number; prompt: L10n; slots: L10n[] };

export interface MissionDefinition {
  id: string;
  version: number;
  number: number;
  title: L10n;
  summary: L10n;
  location: Mission['location'];
  topic: Mission['topic'];
  concept: string;
  difficulty: 1 | 2 | 3;
  minutes: number;
  interactionType: InteractionType;
  learningObjective: L10n;
  evidence: string[];
  states: ['intro', 'play', 'done'];
  successCondition: SuccessCondition;
  failureFeedback: L10n;
  adaptiveAlternatives: Modality[];
  reward: Mission['reward'];
  unlock: { location: Mission['location'] };
  localization: ('en' | 'ar')[];
  payload: InteractionPayload;
  kidSafe: boolean;
}

interface ContentTables {
  WUDU_STEPS: WuduStep[];
  SALAH_STEPS: SalahStep[];
  MATCH_SETS: Record<string, { intro: L10n; pairs: MatchPair[] }>;
  CHOICE_STORIES: Record<string, { start: string; nodes: Record<string, ChoiceNode> }>;
  CLUE_HUNTS: Record<string, ClueHunt>;
  REFLECTION_PROMPTS: Record<string, { breaths: number; prompt: L10n; slots: L10n[] }>;
}

const FEEDBACK: Record<InteractionType, L10n> = {
  'wudu-journey': { en: 'Not yet — something comes before that. Siraj can show you another way.', ar: 'ليس بعد — هناك ما يأتي قبله. يمكن لسراج أن يريك طريقة أخرى.' },
  'salah-path': { en: 'That movement comes a little later. What happens first?', ar: 'هذه الحركة تأتي لاحقًا. ما الذي يأتي أولًا؟' },
  'lantern-match': { en: 'That light flickers out — try another meaning.', ar: 'انطفأ الضوء — جرّب معنى آخر.' },
  'kindness-choice': { en: 'Every path teaches something. You can explore another choice.', ar: 'كل طريق يعلّم شيئًا. يمكنك تجربة اختيار آخر.' },
  'clue-hunt': { en: 'That fragment doesn’t fit there.', ar: 'هذه القطعة لا تناسب هنا.' },
  reflection: { en: 'There are no wrong answers here.', ar: 'لا إجابات خاطئة هنا.' },
};

export function buildMissionDefinition(m: Mission, c: ContentTables): MissionDefinition {
  const type = m.mechanic as InteractionType;
  let payload: InteractionPayload;
  let success: SuccessCondition;
  switch (type) {
    case 'wudu-journey':
      payload = { type, steps: c.WUDU_STEPS };
      success = { type: 'sequence-complete', steps: c.WUDU_STEPS.length };
      break;
    case 'salah-path':
      payload = { type, steps: c.SALAH_STEPS };
      success = { type: 'sequence-complete', steps: c.SALAH_STEPS.length };
      break;
    case 'lantern-match':
      payload = { type, ...c.MATCH_SETS[m.id] };
      success = { type: 'all-matched', pairs: c.MATCH_SETS[m.id].pairs.length };
      break;
    case 'kindness-choice':
      payload = { type, ...c.CHOICE_STORIES[m.id] };
      success = { type: 'ending-reached' };
      break;
    case 'clue-hunt':
      payload = { type, hunt: c.CLUE_HUNTS[m.id] };
      success = { type: 'blanks-filled', blanks: c.CLUE_HUNTS[m.id].sentence.filter((p) => 'blank' in p).length };
      break;
    case 'reflection':
      payload = { type, ...c.REFLECTION_PROMPTS[m.id] };
      success = { type: 'reflection-saved' };
      break;
    default:
      throw new Error(`Unknown interaction type: ${m.mechanic}`);
  }
  return {
    id: m.id,
    version: 1,
    number: m.number,
    title: m.title,
    summary: m.summary,
    location: m.location,
    topic: m.topic,
    concept: m.concept,
    difficulty: m.difficulty,
    minutes: m.minutes,
    interactionType: type,
    learningObjective: m.summary,
    evidence: m.knowledge,
    states: ['intro', 'play', 'done'],
    successCondition: success,
    failureFeedback: FEEDBACK[type],
    adaptiveAlternatives: type === 'kindness-choice' || type === 'reflection' ? [] : ['visual', 'story', 'guided'],
    reward: m.reward,
    unlock: { location: m.location },
    localization: ['en', 'ar'],
    payload,
    kidSafe: m.kidSafe,
  };
}

/** Structural validation for definitions coming from a CMS or the database. */
export function validateMissionDefinition(d: unknown): d is MissionDefinition {
  if (!d || typeof d !== 'object') return false;
  const x = d as Partial<MissionDefinition>;
  const l10n = (v: unknown) => !!v && typeof (v as L10n).en === 'string' && typeof (v as L10n).ar === 'string';
  return (
    typeof x.id === 'string' &&
    typeof x.number === 'number' &&
    l10n(x.title) &&
    l10n(x.summary) &&
    INTERACTION_TYPES.includes(x.interactionType as InteractionType) &&
    !!x.payload &&
    x.payload.type === x.interactionType &&
    !!x.successCondition &&
    Array.isArray(x.evidence) &&
    !!x.reward &&
    x.difficulty !== undefined &&
    [1, 2, 3].includes(x.difficulty)
  );
}
