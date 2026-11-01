import { create } from 'zustand';
import { useSettings } from '@/store/settings';

export type IntroMode = 'full' | 'short' | null;

const SESSION_KEY = 'saja:intro-played';
const REPLAY_GAP_MS = 6 * 3_600_000;

/**
 * Replay prevention: the full cinematic plays once; within 6 hours it's skipped,
 * after that a short 1.8s "star → gateway" version plays. Never twice per session.
 */
export function decideIntro(now = Date.now()): IntroMode {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return null;
  } catch {
    /* storage blocked → fall through */
  }
  const seen = useSettings.getState().introSeenAt;
  if (!seen) return 'full';
  if (now - seen < REPLAY_GAP_MS) return null;
  return 'short';
}

export function markIntroPlayed() {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* ignore */
  }
  useSettings.getState().markIntroSeen();
}

interface IntroState {
  mode: IntroMode;
  set: (m: IntroMode) => void;
}
export const useIntro = create<IntroState>((set) => ({ mode: null, set: (mode) => set({ mode }) }));
