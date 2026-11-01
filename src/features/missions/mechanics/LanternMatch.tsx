/**
 * Lantern Match — light each lantern by finding what its word means.
 * The meaning physically travels up to its lantern (shared layout animation).
 */
import { useEffect, useMemo, useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import { useI18n } from '@/i18n';
import type { MechanicProps } from '../types';
import './match.css';
import { useMatchSet } from '../payload';

function shuffled<T>(a: T[]): T[] {
  // Deterministic reorder that never matches the lantern order.
  return a.length < 2 ? a : [...a.slice(2), a[1], a[0]].reverse();
}

export default function LanternMatch({ mission, guided, onStep, setHint, setProgress, onComplete }: MechanicProps) {
  const { t, l } = useI18n();
  const set = useMatchSet(mission.id);
  const pairs = set.pairs;
  const pool = useMemo(() => shuffled(pairs), [pairs]);
  const [lit, setLit] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [flicker, setFlicker] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const finished = lit.length === pairs.length;

  useEffect(() => {
    setProgress(lit.length / pairs.length);
    const target = pairs.find((p) => p.id === picked) ?? pairs.find((p) => !lit.includes(p.id));
    setHint(target ? { en: `“${target.term.en}” — ${target.meaning.en.split('—')[0].trim()}…`, ar: `«${target.term.ar}» — ${target.meaning.ar.split('—')[0].trim()}…` } : null);
  }, [lit, picked, pairs, setHint, setProgress]);

  useEffect(() => {
    if (!finished) return;
    const id = window.setTimeout(onComplete, 1400);
    return () => window.clearTimeout(id);
  }, [finished, onComplete]);

  const chooseMeaning = (id: string) => {
    if (!picked) {
      setFeedback(t('match.instruction'));
      return;
    }
    if (id === picked) {
      setLit((x) => [...x, id]);
      setPicked(null);
      setFeedback(null);
      onStep(true);
    } else {
      setFlicker(picked);
      window.setTimeout(() => setFlicker(null), 700);
      setFeedback(t('match.wrong'));
      onStep(false);
    }
  };

  return (
    <div className="mech lm">
      <div className="mech-head">
        <p className="mech-instruction" style={{ fontSize: '1.0625rem', color: 'var(--text)' }}>
          {l(set.intro)}
        </p>
        <span className="mech-next">{t('match.lit', { n: lit.length, total: pairs.length })}</span>
      </div>

      <LayoutGroup>
        <div className="lm-string" role="group" aria-label={t('match.terms')}>
          <svg className="lm-rope" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden>
            <path d="M0 2 Q50 12 100 2" />
          </svg>
          {pairs.map((p, i) => {
            const isLit = lit.includes(p.id);
            return (
              <div key={p.id} className="lm-col" style={{ '--i': i } as React.CSSProperties}>
                <button
                  type="button"
                  className="lm-lantern"
                  data-lit={isLit || undefined}
                  data-picked={picked === p.id || undefined}
                  data-flicker={flicker === p.id || undefined}
                  aria-pressed={picked === p.id}
                  disabled={isLit}
                  onClick={() => setPicked((cur) => (cur === p.id ? null : p.id))}
                >
                  <svg viewBox="0 0 60 84" className="lm-lantern__svg" aria-hidden>
                    <path d="M30 0 V10" className="lm-metal" />
                    <path d="M18 12 Q30 4 42 12 Z" className="lm-metal-fill" />
                    <path d="M16 14 H44 L48 58 Q30 70 12 58 Z" className="lm-glass" />
                    <path d="M22 18 V56 M30 16 V60 M38 18 V56" className="lm-rib" />
                    <path d="M20 66 H40" className="lm-metal" />
                  </svg>
                  <span className="lm-term">{l(p.term)}</span>
                </button>
                {isLit && (
                  <motion.div layoutId={`meaning-${p.id}`} className="lm-meaning lm-meaning--lit" transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
                    {l(p.meaning)}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mech-feedback" data-tone={feedback && flicker ? 'wrong' : undefined} role="status">
          {finished ? '✦' : feedback}
        </p>

        <div className="lm-pool" role="group" aria-label={t('match.meanings')}>
          {pool
            .filter((p) => !lit.includes(p.id))
            .map((p) => (
              <motion.button
                key={p.id}
                layoutId={`meaning-${p.id}`}
                type="button"
                className="lm-meaning"
                data-hint={(guided && picked === p.id) || undefined}
                onClick={() => chooseMeaning(p.id)}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              >
                {l(p.meaning)}
              </motion.button>
            ))}
        </div>
      </LayoutGroup>
    </div>
  );
}
