import { useEffect, useState } from 'react';
import { useSettings } from '@/store/settings';

/** Brand motion tokens (seconds, for motion/react). */
export const EASE = [0.22, 0.61, 0.21, 1] as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const DUR = { xs: 0.18, sm: 0.32, md: 0.6, lg: 1.2 } as const;

export const spring = { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 } as const;
export const softSpring = { type: 'spring', stiffness: 170, damping: 26 } as const;

export function useMediaQuery(query: string): boolean {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [match, setMatch] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** Reduced motion = OS preference unless the person chose otherwise in settings. */
export function useReducedMotion(): boolean {
  const pref = useSettings((s) => s.motion);
  const os = useMediaQuery('(prefers-reduced-motion: reduce)');
  return pref === 'reduced' || (pref === 'system' && os);
}

export const useIsDesktop = () => useMediaQuery('(min-width: 900px)');
