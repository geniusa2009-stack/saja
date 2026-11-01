/**
 * Adaptive learning engine — pure functions over a small learner model.
 *
 * Signals observed: step correctness, repeated mistakes, hesitation (time on a
 * step relative to the learner's own pace), hint use, completions and which
 * explanation style actually worked. The engine never repeats the same failing
 * mechanic: when someone struggles it switches *how* the concept is taught
 * (hands-on → visual → story → guided retry), preferring the styles that have
 * worked for this person before.
 */
import type { AgeBand, Mission, MissionResult, Modality, TopicId } from './types';

export interface TopicState {
  mastery: number; // 0..1
  attempts: number;
  mistakes: number;
  lastSeen: number;
}

export interface ConceptState {
  attempts: number;
  mistakes: number;
  tried: Modality[];
  struggling: boolean;
}

export interface ModalityStats {
  tries: number;
  successes: number;
}

export type DifficultyPreference = 'gentle' | 'balanced' | 'challenge';

export interface LearnerModel {
  topics: Partial<Record<TopicId, TopicState>>;
  concepts: Record<string, ConceptState>;
  modalities: Record<Modality, ModalityStats>;
  pace: { avgStepMs: number; samples: number };
  preferred: Modality;
  difficulty: DifficultyPreference;
}

export const MODALITIES: Modality[] = ['hands-on', 'visual', 'story', 'guided'];

export function createLearnerModel(preferred: Modality = 'hands-on', difficulty: DifficultyPreference = 'balanced'): LearnerModel {
  return {
    topics: {},
    concepts: {},
    modalities: {
      'hands-on': { tries: 0, successes: 0 },
      visual: { tries: 0, successes: 0 },
      story: { tries: 0, successes: 0 },
      guided: { tries: 0, successes: 0 },
    },
    pace: { avgStepMs: 6000, samples: 0 },
    preferred,
    difficulty,
  };
}

export type LearningSignal =
  | { type: 'step'; topic: TopicId; concept: string; correct: boolean; ms: number; at?: number }
  | { type: 'hint'; topic: TopicId; concept: string }
  | { type: 'complete'; topic: TopicId; concept: string; result: MissionResult };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function topicOf(model: LearnerModel, topic: TopicId): TopicState {
  return model.topics[topic] ?? { mastery: 0.2, attempts: 0, mistakes: 0, lastSeen: 0 };
}
function conceptOf(model: LearnerModel, concept: string): ConceptState {
  return model.concepts[concept] ?? { attempts: 0, mistakes: 0, tried: [], struggling: false };
}

/** Pure reducer: returns a new model with the signal applied. */
export function applySignal(model: LearnerModel, signal: LearningSignal): LearnerModel {
  const now = ('at' in signal && signal.at) || Date.now();
  const t = topicOf(model, signal.topic);
  const c = conceptOf(model, signal.concept);

  switch (signal.type) {
    case 'step': {
      const mastery = signal.correct ? t.mastery + 0.06 * (1 - t.mastery) : t.mastery - 0.05 * t.mastery;
      // Pace: exponential moving average of correct-step time; outliers capped so one long pause doesn't skew it.
      const ms = Math.min(signal.ms, 60_000);
      const samples = model.pace.samples + 1;
      const alpha = samples < 5 ? 1 / samples : 0.2;
      const avgStepMs = signal.correct ? model.pace.avgStepMs * (1 - alpha) + ms * alpha : model.pace.avgStepMs;
      return {
        ...model,
        pace: signal.correct ? { avgStepMs, samples } : model.pace,
        topics: {
          ...model.topics,
          [signal.topic]: { ...t, mastery: clamp01(mastery), mistakes: t.mistakes + (signal.correct ? 0 : 1), lastSeen: now },
        },
        concepts: {
          ...model.concepts,
          [signal.concept]: { ...c, mistakes: c.mistakes + (signal.correct ? 0 : 1) },
        },
      };
    }
    case 'hint':
      return { ...model, concepts: { ...model.concepts, [signal.concept]: { ...c } } };
    case 'complete': {
      const { result } = signal;
      const quality = 1 / (1 + result.mistakes * 0.5 + result.hintsUsed * 0.25);
      const mastery = clamp01(t.mastery + 0.35 * (1 - t.mastery) * quality);
      const success = result.mistakes <= 1;
      const ms = model.modalities[result.modality];
      const tried = c.tried.includes(result.modality) ? c.tried : [...c.tried, result.modality];
      return {
        ...model,
        topics: { ...model.topics, [signal.topic]: { ...t, mastery, attempts: t.attempts + 1, lastSeen: now } },
        concepts: {
          ...model.concepts,
          [signal.concept]: { ...c, attempts: c.attempts + 1, tried, struggling: result.mistakes >= 3 },
        },
        modalities: {
          ...model.modalities,
          [result.modality]: { tries: ms.tries + 1, successes: ms.successes + (success ? 1 : 0) },
        },
      };
    }
  }
}

/* ── In-mission detection ──────────────────────────────────── */

export interface MissionRunState {
  mistakes: number;
  consecutiveMistakes: number;
  hints: number;
}

/** True when the learner is repeatedly stuck — time to change the mechanism, not repeat it. */
export function isStruggling(run: MissionRunState): boolean {
  return run.consecutiveMistakes >= 2 || run.mistakes >= 3;
}

/** Hesitation = far slower than this learner's own pace (never compared to other people). */
export function isHesitating(model: LearnerModel, msOnStep: number): boolean {
  const baseline = Math.max(model.pace.avgStepMs, 3000);
  return msOnStep > Math.max(9000, baseline * 2.5);
}

/* ── Adaptation ────────────────────────────────────────────── */

export type AdaptReason = 'repeated-mistakes' | 'hesitation' | 'worked-before' | 'preferred-style';

export interface Adaptation {
  modality: Modality;
  reason: AdaptReason;
}

function successRate(s: ModalityStats) {
  // Laplace smoothing: unknown styles start at 0.5 so they still get a chance.
  return (s.successes + 1) / (s.tries + 2);
}

/**
 * Pick a different way to teach `concept`. Excludes the modality that just
 * failed and any already tried for this concept, then ranks by what has
 * worked for this learner, with a nudge toward their declared preference.
 */
export function chooseAdaptation(
  model: LearnerModel,
  concept: string,
  current: Modality,
  trigger: 'mistakes' | 'hesitation' = 'mistakes',
): Adaptation {
  const tried = new Set([...conceptOf(model, concept).tried, current]);
  // Order matters as a tie-breaker: see it, hear it as a story, then retry with support.
  const order: Modality[] = ['visual', 'story', 'guided', 'hands-on'];
  const candidates = order.filter((m) => !tried.has(m));
  const pool = candidates.length > 0 ? candidates : (['guided'] as Modality[]);

  let best = pool[0];
  let bestScore = -Infinity;
  for (const m of pool) {
    const score = successRate(model.modalities[m]) + (m === model.preferred ? 0.15 : 0) - order.indexOf(m) * 0.01;
    if (score > bestScore) {
      best = m;
      bestScore = score;
    }
  }
  const worked = model.modalities[best].tries > 0 && successRate(model.modalities[best]) > 0.6;
  const reason: AdaptReason =
    trigger === 'hesitation' ? 'hesitation' : worked ? 'worked-before' : best === model.preferred ? 'preferred-style' : 'repeated-mistakes';
  return { modality: best, reason };
}

/* ── Recommendations ───────────────────────────────────────── */

export type RecommendReason = 'revisit' | 'continue' | 'interest' | 'short' | 'challenge';

export interface Recommendation {
  mission: Mission;
  reason: RecommendReason;
  score: number;
}

export interface RecommendInput {
  model: LearnerModel;
  missions: Mission[];
  completed: string[];
  unlocked: Set<string>;
  ageBand: AgeBand;
  interests: TopicId[];
  minutesAvailable?: number;
}

export function recommend({ model, missions, completed, unlocked, ageBand, interests, minutesAvailable }: RecommendInput): Recommendation[] {
  const done = new Set(completed);
  const masteries = Object.values(model.topics).map((t) => t!.mastery);
  const avgMastery = masteries.length ? masteries.reduce((a, b) => a + b, 0) / masteries.length : 0.2;
  const targetDifficulty =
    model.difficulty === 'gentle' ? 1 : model.difficulty === 'challenge' ? 3 : avgMastery > 0.55 ? 2.5 : avgMastery > 0.35 ? 2 : 1.3;

  const recs: Recommendation[] = [];
  for (const m of missions) {
    if (m.adaptive || done.has(m.id) || !unlocked.has(m.location)) continue;
    if (ageBand === 'child' && !m.kidSafe) continue;
    if (minutesAvailable !== undefined && m.minutes > minutesAvailable) continue;

    const topic = model.topics[m.topic];
    const weakness = topic ? 1 - topic.mastery : 0.4;
    const struggling = model.concepts[m.concept]?.struggling ?? false;
    const interest = interests.includes(m.topic) ? 1 : 0;
    const difficultyFit = 1 - Math.abs(m.difficulty - targetDifficulty) / 2;
    const storyOrder = 1 - m.number / 20;

    const score = weakness * 0.9 + (struggling ? 0.6 : 0) + interest * 0.5 + difficultyFit * 0.6 + storyOrder * 0.8;
    let reason: RecommendReason = 'continue';
    if (struggling || (topic && topic.attempts > 0 && topic.mastery < 0.4)) reason = 'revisit';
    else if (minutesAvailable !== undefined && minutesAvailable <= 10) reason = 'short';
    else if (interest) reason = 'interest';
    else if (m.difficulty >= 3 && avgMastery > 0.55) reason = 'challenge';
    recs.push({ mission: m, reason, score });
  }
  return recs.sort((a, b) => b.score - a.score);
}

/* ── Profile insights ──────────────────────────────────────── */

export function strengths(model: LearnerModel): TopicId[] {
  return (Object.entries(model.topics) as [TopicId, TopicState][])
    .filter(([, t]) => t.attempts > 0 && t.mastery >= 0.55)
    .sort((a, b) => b[1].mastery - a[1].mastery)
    .map(([id]) => id);
}

export function topicsToRevisit(model: LearnerModel): TopicId[] {
  return (Object.entries(model.topics) as [TopicId, TopicState][])
    .filter(([, t]) => t.mistakes >= 3 && t.mastery < 0.55)
    .sort((a, b) => a[1].mastery - b[1].mastery)
    .map(([id]) => id);
}

export function bestModality(model: LearnerModel): Modality {
  let best: Modality = model.preferred;
  let bestRate = -1;
  for (const m of MODALITIES) {
    const s = model.modalities[m];
    if (s.tries === 0) continue;
    const r = successRate(s);
    if (r > bestRate) {
      bestRate = r;
      best = m;
    }
  }
  return best;
}
