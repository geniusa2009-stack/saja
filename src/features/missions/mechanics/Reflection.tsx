/**
 * Evening Stillness — slow breathing, then three gifts from today.
 * Writing is private (on-device) and optional; nothing is scored.
 */
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Button, TextInput, useReducedMotion } from '@/design-system';
import { Star } from '@/brand/SajaMark';
import { useI18n } from '@/i18n';
import { useProgress } from '@/store/progress';
import type { MechanicProps } from '../types';
import './explainer.css';
import { useReflectionPrompt } from '../payload';

const BREATH_S = 4;

export default function Reflection({ mission, onStep, setHint, setProgress, onComplete }: MechanicProps) {
  const { t, l } = useI18n();
  const reduced = useReducedMotion();
  const cfg = useReflectionPrompt(mission.id);
  const addReflection = useProgress((s) => s.addReflection);
  const [breath, setBreath] = useState(0); // counts half-breaths
  const [phase, setPhase] = useState<'breathe' | 'write' | 'stars'>('breathe');
  const [lines, setLines] = useState<string[]>(cfg.slots.map(() => ''));
  const totalHalf = cfg.breaths * 2;

  useEffect(() => {
    setHint({ en: 'There are no wrong answers here — even “warm bread” or “a friend’s smile” counts.', ar: 'لا إجابات خاطئة هنا — حتى «خبز دافئ» أو «ابتسامة صديق» تُحسب.' });
  }, [setHint]);

  useEffect(() => {
    if (phase !== 'breathe') return;
    if (breath >= totalHalf) {
      setPhase('write');
      return;
    }
    const id = window.setTimeout(() => setBreath((b) => b + 1), (reduced ? 1.2 : BREATH_S) * 1000);
    return () => window.clearTimeout(id);
  }, [breath, phase, totalHalf, reduced]);

  useEffect(() => {
    setProgress(phase === 'breathe' ? (breath / totalHalf) * 0.4 : phase === 'write' ? 0.4 + (lines.filter(Boolean).length / lines.length) * 0.5 : 1);
  }, [phase, breath, totalHalf, lines, setProgress]);

  const finish = () => {
    const kept = lines.map((x) => x.trim()).filter(Boolean);
    if (kept.length) addReflection(kept);
    onStep(true);
    setPhase('stars');
    window.setTimeout(onComplete, reduced ? 200 : 2000);
  };

  const inhale = breath % 2 === 0;

  return (
    <div className="mech refl">
      {phase === 'breathe' && (
        <div className="refl-breathe">
          <motion.div className="refl-orb" animate={{ scale: inhale ? 1.35 : 0.8 }} transition={{ duration: reduced ? 0 : BREATH_S, ease: 'easeInOut' }} aria-hidden />
          <p className="t-h2" aria-live="polite">
            {inhale ? t('refl.breathe') : t('refl.breatheOut')}
          </p>
          <p className="muted t-small">{t('refl.breathCount', { n: Math.min(cfg.breaths, Math.floor(breath / 2) + 1), total: cfg.breaths })}</p>
          <Button variant="ghost" size="sm" onClick={() => setPhase('write')}>
            {t('a.skip')}
          </Button>
        </div>
      )}
      {phase === 'write' && (
        <div className="refl-write">
          <h2 className="t-h1" style={{ textAlign: 'center' }}>
            {l(cfg.prompt)}
          </h2>
          <p className="muted t-small" style={{ textAlign: 'center' }}>
            {t('refl.write')}
          </p>
          {cfg.slots.map((s, i) => (
            <label key={i} className="refl-line">
              <Star size={14} color="var(--gold-300)" />
              <TextInput
                value={lines[i]}
                placeholder={l(s)}
                maxLength={120}
                onChange={(e) => setLines((ls) => ls.map((x, k) => (k === i ? e.target.value : x)))}
                aria-label={l(s)}
              />
            </label>
          ))}
          <p className="t-small muted" style={{ textAlign: 'center' }}>
            {t('refl.private')}
          </p>
          <Button variant="celebrate" size="lg" icon="star" onClick={finish} style={{ justifySelf: 'center' }}>
            {t('refl.saveToStars')}
          </Button>
        </div>
      )}
      {phase === 'stars' && (
        <div className="refl-stars" aria-hidden>
          {lines
            .filter(Boolean)
            .concat(lines.filter(Boolean).length ? [] : ['✦'])
            .slice(0, 3)
            .map((_, i) => (
              <motion.span key={i} initial={{ y: 80, opacity: 0 }} animate={{ y: -60 - i * 30, opacity: [0, 1, 1, 0.8] }} transition={{ duration: 1.8, delay: i * 0.25, ease: [0.16, 1, 0.3, 1] }}>
                <Star size={22} color="#F6E8C6" />
              </motion.span>
            ))}
        </div>
      )}
    </div>
  );
}
