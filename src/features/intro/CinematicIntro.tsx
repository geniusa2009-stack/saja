/**
 * The 5-second cinematic opening — ONE orchestrated timeline (motion `useAnimate`
 * sequence), not a pile of unrelated CSS animations.
 *
 *   0.0 darkness · 0.2 particles · 0.5 horizon light · 1.0 point of light →
 *   guiding star · 1.7 path draws toward you · 2.1 the world grows out of the
 *   star's light · 2.3 the gateway resolves around it · 3.2 wordmark draws ·
 *   3.8 tagline · 4.6 the night parts along the horizon line (the line itself
 *   leaves before the page underneath is visible).
 *
 * Skip (button / Esc / Enter / Space) jumps to the horizon wipe instead of a
 * hard cut. Reduced motion: a still composition that cross-fades out.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { stagger, useAnimate, type AnimationSequence } from 'motion/react';
import { GATEWAY_D, PATH_D, STAR_D, WINDOW_D } from '@/brand/SajaMark';
import { WORDMARK_PATHS } from '@/brand/geometry';
import { EASE, EASE_OUT, useReducedMotion } from '@/design-system/motion';
import { useI18n } from '@/i18n';
import type { IntroMode } from '@/app/intro';
import './intro.css';

// Road centre-line used for the "path draws" beat (inside the mark's coordinates).
const ROAD_LINE = 'M56 138 C54 128 74 123 74 116 C74 110 64 106 60 100';

const PARTICLES = [
  [12, 22, 2.2],
  [84, 16, 1.6],
  [70, 34, 1.3],
  [22, 48, 1.4],
  [90, 52, 2],
  [8, 70, 1.2],
  [38, 12, 1.4],
  [58, 8, 1.1],
  [30, 30, 1],
  [78, 70, 1.3],
  [16, 86, 1.1],
  [94, 84, 1.5],
] as const; // brand rule: max 12 on screen

export function CinematicIntro({ mode, onDone }: { mode: Exclude<IntroMode, null>; onDone: () => void }) {
  const [scope, animate] = useAnimate();
  const reduced = useReducedMotion();
  const { t, isRTL } = useI18n();
  const uid = useId().replace(/:/g, '');
  const [phase, setPhase] = useState<'play' | 'out'>('play');
  const doneRef = useRef(false);
  const mainRef = useRef<ReturnType<typeof animate> | null>(null);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  const outro = useCallback(async () => {
    if (phase === 'out' || doneRef.current) return;
    setPhase('out');
    mainRef.current?.stop();
    if (reduced) {
      await animate(scope.current, { opacity: 0 }, { duration: 0.4 });
      finish();
      return;
    }
    await animate([
      ['.i-stage', { opacity: 0, scale: 1.04 }, { duration: 0.45, ease: EASE }],
      ['.i-line', { scaleX: [0, 1], opacity: [0, 1] }, { duration: 0.4, at: 0.1, ease: EASE_OUT }],
      ['.i-half--top', { y: '-100%' }, { duration: 0.85, at: 0.42, ease: EASE }],
      ['.i-half--bottom', { y: '100%' }, { duration: 0.85, at: 0.42, ease: EASE }],
      ['.i-line', { opacity: 0, scaleX: 1.15 }, { duration: 0.3, at: 0.45 }],
    ]);
    finish();
  }, [animate, finish, phase, reduced, scope]);

  useEffect(() => {
    if (reduced) {
      const id = window.setTimeout(() => void outro(), mode === 'full' ? 1400 : 700);
      return () => window.clearTimeout(id);
    }
    const short = mode === 'short';
    const seq: AnimationSequence = short
      ? [
          ['.i-horizon', { opacity: [0, 1] }, { duration: 0.6, at: 0 }],
          ['.i-star', { scale: [0, 1], opacity: [0, 1] }, { duration: 0.6, at: 0.1, ease: EASE_OUT }],
          ['.i-starglow', { opacity: [0, 0.8], scale: [0.3, 1] }, { duration: 0.7, at: 0.1 }],
          ['.i-roadfill', { opacity: [0, 1] }, { duration: 0.5, at: 0.4 }],
          ['.i-world', { opacity: [0, 1] }, { duration: 0.6, at: 0.4 }],
          ['.i-reveal', { scale: [0.3, 1] }, { duration: 0.7, at: 0.4, ease: EASE }],
          ['.i-frame', { opacity: [0, 1] }, { duration: 0.6, at: 0.5 }],
          ['.i-mark', { scale: [1.25, 1] }, { duration: 0.9, at: 0.2, ease: EASE }],
          ['.i-wm', { opacity: [0, 1] }, { duration: 0.5, at: 0.8 }],
          ['.i-ar', { opacity: [0, 1] }, { duration: 0.5, at: 0.9 }],
        ]
      : [
          ['.i-particles', { opacity: [0, 1] }, { duration: 1.6, at: 0.2 }],
          ['.i-horizon', { opacity: [0, 1], scaleY: [0.3, 1] }, { duration: 1.6, at: 0.5, ease: EASE }],
          ['.i-point', { opacity: [0, 1, 0], scale: [0.2, 1, 1.4] }, { duration: 0.8, at: 0.9 }],
          ['.i-star', { scale: [0, 1], opacity: [0, 1] }, { duration: 1, at: 1.1, ease: EASE_OUT }],
          ['.i-starglow', { opacity: [0, 1, 0.6], scale: [0.2, 1.35, 1] }, { duration: 1.4, at: 1.1 }],
          ['.i-beam', { opacity: [0, 1], scaleY: [0, 1] }, { duration: 0.8, at: 1.5, ease: EASE }],
          ['.i-road', { strokeDashoffset: [1, 0], opacity: [0, 1] }, { duration: 1, at: 1.7, ease: EASE }],
          ['.i-world', { opacity: [0, 1] }, { duration: 0.9, at: 2.1 }],
          ['.i-reveal', { scale: [0.08, 1] }, { duration: 1.2, at: 2.1, ease: EASE }],
          ['.i-roadfill', { opacity: [0, 1] }, { duration: 0.5, at: 2.45 }],
          ['.i-road', { opacity: 0 }, { duration: 0.4, at: 2.6 }],
          ['.i-mark', { scale: [1.85, 1] }, { duration: 1.3, at: 1.9, ease: EASE }],
          ['.i-frame', { opacity: [0, 1] }, { duration: 0.8, at: 2.35 }],
          ['.i-window-edge', { opacity: [0, 0.55] }, { duration: 0.8, at: 2.5 }],
          ['.i-wm .i-letter', { strokeDashoffset: [1, 0] }, { duration: 0.7, at: 3.15, delay: stagger(0.11), ease: EASE }],
          ['.i-wm', { opacity: [0, 1] }, { duration: 0.2, at: 3.1 }],
          ['.i-wmstar', { opacity: [0, 1], scale: [0.3, 1] }, { duration: 0.5, at: 3.7, ease: EASE_OUT }],
          ['.i-ar', { opacity: [0, 1], y: [10, 0] }, { duration: 0.7, at: 3.55, ease: EASE }],
          ['.i-tag', { opacity: [0, 1], y: [10, 0] }, { duration: 0.8, at: 3.85, ease: EASE }],
        ];
    const controls = animate(seq);
    mainRef.current = controls;
    let cancelled = false;
    controls.then(() => {
      if (cancelled) return;
      window.setTimeout(() => void outro(), short ? 250 : 650);
    });
    return () => {
      cancelled = true;
      controls.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        void outro();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [outro]);

  const still = reduced; // reduced motion: everything visible from the start

  return (
    <div ref={scope} className={`intro intro--${mode} ${still ? "intro--still" : ""}`} role="dialog" aria-modal="true" aria-label={t('intro.label')}>
      <div className="i-half i-half--top" aria-hidden />
      <div className="i-half i-half--bottom" aria-hidden />
      <div className="i-line" aria-hidden />

      <div className="i-stage">
        <div className="i-horizon" aria-hidden />
        <div className="i-particles" aria-hidden>
          {PARTICLES.map(([x, y, s], i) => (
            <span key={i} style={{ left: `${x}%`, top: `${y}%`, width: s * 2, height: s * 2, animationDelay: `${(i * 0.37) % 3}s` }} />
          ))}
        </div>

        <div className="i-center">
          <div className="i-mark">
            <svg viewBox="0 0 120 140" className="i-mark-svg" aria-hidden>
              <defs>
                <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0.6" y2="1">
                  <stop offset="0" stopColor="#22B08C" />
                  <stop offset="1" stopColor="#0A4F40" />
                </linearGradient>
                <linearGradient id={`${uid}s`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#050A18" />
                  <stop offset="0.62" stopColor="#13204A" />
                  <stop offset="1" stopColor="#1E3A66" />
                </linearGradient>
                <radialGradient id={`${uid}g`} cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0" stopColor="#F3E2BA" stopOpacity="0.95" />
                  <stop offset="1" stopColor="#F3E2BA" stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${uid}sg`} cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0" stopColor="#F6E8C6" stopOpacity="0.9" />
                  <stop offset="0.4" stopColor="#F3E2BA" stopOpacity="0.25" />
                  <stop offset="1" stopColor="#F3E2BA" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={`${uid}o`} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0" stopColor="#C9A45C" />
                  <stop offset="1" stopColor="#F6E8C6" />
                </linearGradient>
                <linearGradient id={`${uid}b`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#F3E2BA" stopOpacity="0.85" />
                  <stop offset="1" stopColor="#F3E2BA" stopOpacity="0" />
                </linearGradient>
                <clipPath id={`${uid}c`}>
                  <path d={WINDOW_D} />
                </clipPath>
                {/* The world grows out of the star's light, instead of fading in as a box before the gateway exists. */}
                <radialGradient id={`${uid}rv`} cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0" stopColor="#fff" />
                  <stop offset="0.72" stopColor="#fff" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
                <mask id={`${uid}m`} maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="140">
                  <circle className="i-reveal" cx="60" cy="72" r="82" fill={`url(#${uid}rv)`} />
                </mask>
              </defs>

              <path className="i-frame" d={GATEWAY_D} fill={`url(#${uid}f)`} />
              <g className="i-world" mask={`url(#${uid}m)`}>
                <path d={WINDOW_D} fill={`url(#${uid}s)`} />
                <g clipPath={`url(#${uid}c)`}>
                  <ellipse cx="60" cy="102" rx="36" ry="13" fill={`url(#${uid}g)`} />
                  <path d="M24 104 C38 95 52 96 64 102 C76 97 88 96 96 99 V136 H24 Z" fill="#138A96" fillOpacity="0.55" />
                  <path d="M24 116 C42 107 66 110 96 112 V136 H24 Z" fill="#0F7A5F" />
                  <circle cx="38" cy="62" r="0.9" fill="#F3E2BA" />
                  <circle cx="82" cy="50" r="1.1" fill="#F3E2BA" />
                  <circle cx="86" cy="78" r="0.7" fill="#F3E2BA" />
                  <circle cx="33" cy="84" r="0.6" fill="#F3E2BA" />
                  <circle cx="72" cy="36" r="0.6" fill="#F3E2BA" />
                </g>
              </g>
              <path className="i-window-edge" d={WINDOW_D} fill="none" stroke="#DDBE7F" strokeWidth="0.8" />
              <rect className="i-beam" x="59.35" y="66" width="1.3" height="36" fill={`url(#${uid}b)`} />
              <g clipPath={`url(#${uid}c)`}>
                <path className="i-roadfill" d={PATH_D} fill={`url(#${uid}o)`} />
              </g>
              <path className="i-road" d={ROAD_LINE} pathLength={1} fill="none" stroke="#F3E2BA" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="1 1" />
              <circle className="i-starglow" cx="60" cy="56" r="22" fill={`url(#${uid}sg)`} />
              <circle className="i-point" cx="60" cy="56" r="1.6" fill="#FFF8E8" />
              <path className="i-star" d={STAR_D} fill="#F6E8C6" />
            </svg>
          </div>

          <div className="i-type">
            <svg viewBox="0 -4 180 64" className="i-wm" role="img" aria-label="SAJA">
              <g fill="none" stroke="#F4ECDD" strokeWidth="4.4">
                {(['S', 'A1', 'J', 'A2'] as const).map((k) => (
                  <path key={k} className="i-letter" d={WORDMARK_PATHS[k]} pathLength={1} strokeDasharray="1 1" />
                ))}
              </g>
              <path className="i-wmstar" d={WORDMARK_PATHS.star} fill="#DDBE7F" />
            </svg>
            <div className="i-ar" lang="ar" dir="rtl">
              سَجَى
            </div>
            <p className="i-tag" dir={isRTL ? 'rtl' : 'ltr'}>
              {t('app.tagline')}
            </p>
          </div>
        </div>
      </div>

      {phase === 'play' && (
        <button type="button" className="i-skip" onClick={() => void outro()}>
          {t('intro.skip')}
        </button>
      )}
    </div>
  );
}
