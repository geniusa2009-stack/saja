import type { L10n, Mission } from '@/domain/types';

/**
 * Contract every mission mechanic implements. The runner owns timing,
 * learning signals, hints and adaptation; mechanics own the interaction.
 */
export interface MechanicProps {
  mission: Mission;
  /** Guided retry: Siraj reveals the next step up-front and choices are narrowed. */
  guided: boolean;
  /** Report each attempt at a step. */
  onStep: (correct: boolean) => void;
  /** The current hint (shown when the learner taps Hint), or null. */
  setHint: (hint: L10n | null) => void;
  /** Progress through the mechanic, 0..1. */
  setProgress: (p: number) => void;
  onComplete: () => void;
}
