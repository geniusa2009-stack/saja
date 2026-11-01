/**
 * Five Calm Pauses — walk the prayer path by placing each movement of one
 * rak‘ah on the next stone. Drag a card onto the stone, or tap it to place it.
 * The arch window shows the posture, what is said, and what it means.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import type { SalahPose } from '@/content/missions';
import { useSalahSteps } from '../payload';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { useReducedMotion } from '@/design-system';
import type { MechanicProps } from '../types';
import { PoseGlyph } from './art';
import './salah.css';

function shuffle<T>(a: T[], seed = 7): T[] {
  const out = [...a];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function SalahPath({ guided, onStep, setHint, setProgress, onComplete }: MechanicProps) {
  const SALAH_STEPS = useSalahSteps();
  const { t, l } = useI18n();
  const reduced = useReducedMotion();
  const [placed, setPlaced] = useState<SalahPose[]>([]);
  const [wrong, setWrong] = useState<SalahPose | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const cards = useMemo(() => shuffle(SALAH_STEPS, 11), [SALAH_STEPS]);
  const stoneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragged = useRef(false);
  const next = SALAH_STEPS[placed.length];
  const finished = placed.length === SALAH_STEPS.length;
  const shown = SALAH_STEPS[Math.max(0, placed.length - 1)];

  useEffect(() => {
    setProgress(placed.length / SALAH_STEPS.length);
    setHint(next ? { en: `${placed.length === 0 ? 'Every prayer begins by entering it.' : 'Think about what naturally comes next.'} Look for “${next.label.en}”.`, ar: `${placed.length === 0 ? 'كل صلاة تبدأ بالدخول فيها.' : 'فكّر فيما يأتي بعدها طبيعيًا.'} ابحث عن «${next.label.ar}».` } : null);
  }, [placed.length, next, setHint, setProgress, SALAH_STEPS.length]);

  useEffect(() => {
    if (!finished) return;
    const id = window.setTimeout(onComplete, reduced ? 300 : 1500);
    return () => window.clearTimeout(id);
  }, [finished, onComplete, reduced]);

  const attempt = (pose: SalahPose) => {
    if (finished || placed.includes(pose)) return;
    if (pose === next.id) {
      setPlaced((p) => [...p, pose]);
      setFeedback(null);
      onStep(true);
    } else {
      const step = SALAH_STEPS.find((s) => s.id === pose)!;
      setWrong(pose);
      window.setTimeout(() => setWrong(null), 400);
      setFeedback(t('salah.wrong', { move: l(step.label) }));
      onStep(false);
    }
  };

  const onDragEnd = (pose: SalahPose, info: PanInfo) => {
    const el = stoneRefs.current[placed.length];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pad = 28;
    if (info.point.x > r.left - pad && info.point.x < r.right + pad && info.point.y > r.top - pad && info.point.y < r.bottom + pad) attempt(pose);
  };

  const stones = SALAH_STEPS.map((_, i) => {
    const x = 6 + (i / (SALAH_STEPS.length - 1)) * 88;
    const y = 50 - Math.sin((i / (SALAH_STEPS.length - 1)) * Math.PI * 2) * 26;
    return { x, y };
  });
  const pathD = stones.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  const litD = placed.length > 1 ? stones.slice(0, placed.length).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ') : '';

  return (
    <div className="mech salah">
      <div className="mech-head">
        <h2 className="t-h3">{t('salah.title')}</h2>
        <p className="mech-instruction">{t('salah.instruction')}</p>
      </div>

      <div className="salah-top">
        <div className="salah-window" aria-live="polite">
          <AnimatePresence mode="wait">
            {placed.length > 0 ? (
              <motion.div key={shown.id} className="salah-window__inner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                <PoseGlyph pose={shown.id} size={78} color="#F6E8C6" />
                <strong>{l(shown.label)}</strong>
                <span className="t-small gold">{l(shown.says)}</span>
                <span className="t-small muted">{l(shown.meaning)}</span>
              </motion.div>
            ) : (
              <motion.div key="empty" className="salah-window__inner" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Icon name="star" size={28} />
                <span className="t-small muted">{t('salah.stone', { n: 1 })}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="salah-path" dir="ltr">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path d={pathD} className="salah-path__road" vectorEffect="non-scaling-stroke" />
            {litD && <path d={litD} className="salah-path__lit" vectorEffect="non-scaling-stroke" />}
          </svg>
          {stones.map((p, i) => {
            const pose = placed[i];
            const isNext = i === placed.length;
            return (
              <div
                key={i}
                ref={(el) => {
                  stoneRefs.current[i] = el;
                }}
                className="salah-stone"
                data-filled={pose ? '' : undefined}
                data-next={isNext || undefined}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                aria-label={pose ? l(SALAH_STEPS[i].label) : t('salah.stone', { n: i + 1 })}
                role="img"
              >
                {pose ? <PoseGlyph pose={pose} size={30} color="#0B1530" /> : <span>{i + 1}</span>}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mech-feedback" data-tone={feedback ? 'wrong' : undefined} role="status">
        {finished ? '✦' : feedback}
      </p>

      <div className="salah-tray" role="list" aria-label={t('salah.cards')}>
        {cards.map((c) => {
          const used = placed.includes(c.id);
          const isNext = next?.id === c.id;
          return (
            <motion.button
              key={c.id}
              role="listitem"
              type="button"
              className={`salah-card ${wrong === c.id ? 'is-wrong' : ''}`}
              data-used={used || undefined}
              data-dim={(guided && !isNext && !used) || undefined}
              data-next={(guided && isNext) || undefined}
              disabled={used}
              drag={!used && !reduced}
              dragSnapToOrigin
              dragElastic={0.9}
              whileDrag={{ scale: 1.06, zIndex: 10, rotate: -2 }}
              onDragStart={() => (dragged.current = true)}
              onDragEnd={(_, info) => onDragEnd(c.id, info)}
              onClick={() => {
                // A drag that ends away from the stone must not count as a tap.
                if (dragged.current) {
                  dragged.current = false;
                  return;
                }
                attempt(c.id);
              }}
              layout
              aria-label={`${l(c.label)} — ${l(c.says)}`}
            >
              <PoseGlyph pose={c.id} size={48} />
              <span className="salah-card__label">{l(c.label)}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
