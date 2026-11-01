/**
 * The Water Path — wudu as something you DO. The traveller stands by the
 * courtyard fountain; press and hold each part in order and the water
 * travels to it. Order mistakes are gentle; guided mode lights the next part.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { BodyPart } from '@/content/missions';
import { useWuduSteps } from '../payload';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { useProfile } from '@/store/profile';
import { useReducedMotion } from '@/design-system';
import { Character } from '@/features/character/Character';
import type { MechanicProps } from '../types';
import { BODY_ANCHORS } from './anchors';
import './wudu.css';

const HOLD_MS = 650;

export default function WuduJourney({ guided, onStep, setHint, setProgress, onComplete }: MechanicProps) {
  const WUDU_STEPS = useWuduSteps();
  const { t, l } = useI18n();
  const reduced = useReducedMotion();
  const look = useProfile((s) => s.profile!.look);
  const [done, setDone] = useState<BodyPart[]>([]);
  const [holding, setHolding] = useState<BodyPart | null>(null);
  const [wrong, setWrong] = useState<BodyPart | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'right' | 'wrong'; text: string } | null>(null);
  const [drops, setDrops] = useState<{ id: number; to: BodyPart }[]>([]);
  const [water, setWater] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const finished = done.length === WUDU_STEPS.length;
  const next = WUDU_STEPS[done.length];

  useEffect(() => {
    setProgress(done.length / WUDU_STEPS.length);
    setHint(next ? next.hint : null);
  }, [done.length, next, setHint, setProgress, WUDU_STEPS.length]);

  useEffect(() => {
    if (!finished) return;
    const id = window.setTimeout(onComplete, reduced ? 300 : 1600);
    return () => window.clearTimeout(id);
  }, [finished, onComplete, reduced]);

  const wash = (part: BodyPart) => {
    if (finished || done.includes(part)) return;
    const step = WUDU_STEPS.find((s) => s.id === part)!;
    setWater((w) => w + 1);
    if (part === next.id) {
      setDrops((d) => [...d.slice(-3), { id: Date.now(), to: part }]);
      setDone((d) => [...d, part]);
      setFeedback({ tone: 'right', text: l(step.action) });
      onStep(true);
    } else {
      setWrong(part);
      window.setTimeout(() => setWrong(null), 400);
      setFeedback({ tone: 'wrong', text: t('wudu.notYet', { part: l(step.label) }) });
      onStep(false);
    }
  };

  const startHold = (part: BodyPart) => {
    if (done.includes(part) || finished) return;
    setHolding(part);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setHolding(null);
      wash(part);
    }, reduced ? 10 : HOLD_MS);
  };
  const cancelHold = () => {
    window.clearTimeout(timer.current);
    setHolding(null);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Callouts are laid out by the side of the body they point to, not in order.
  const byside = useMemo(() => {
    const left = WUDU_STEPS.filter((s) => BODY_ANCHORS[s.id].side === 'left');
    const right = WUDU_STEPS.filter((s) => BODY_ANCHORS[s.id].side === 'right');
    return { left, right };
  }, [WUDU_STEPS]);

  const renderCallout = (id: BodyPart) => {
    const step = WUDU_STEPS.find((s) => s.id === id)!;
    const isDone = done.includes(id);
    const isNext = next?.id === id;
    const dim = guided && !isNext && !isDone;
    return (
      <button
        key={id}
        type="button"
        className={`wcall ${wrong === id ? 'is-wrong' : ''}`}
        data-done={isDone || undefined}
        data-next={(guided && isNext) || undefined}
        data-dim={dim || undefined}
        data-holding={holding === id || undefined}
        aria-label={`${l(step.label)} — ${isDone ? t('m.completed') : t('wudu.instructionTouch')}`}
        aria-pressed={isDone}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          startHold(id);
        }}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        onPointerLeave={cancelHold}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            wash(id);
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="wcall__ring" aria-hidden>
          <svg viewBox="0 0 36 36" className="wcall__progress">
            <circle cx="18" cy="18" r="15" />
          </svg>
          <Icon name={isDone ? 'check' : id === 'heart' ? 'heart' : 'water'} size={16} />
        </span>
        <span className="wcall__text">
          <span className="wcall__label">{l(step.label)}</span>
          <span className="wcall__tag">{step.fard ? t('wudu.fard') : t('wudu.sunnah')}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="mech wudu">
      <div className="mech-head">
        <h2 className="t-h3">{t('wudu.title')}</h2>
        <p className="mech-instruction">{t('wudu.instruction')}</p>
        {guided && next && (
          <span className="mech-next">
            <Icon name="star" size={16} /> {t('wudu.next', { step: l(next.label) })}
          </span>
        )}
      </div>

      <div className="wudu-scene" dir="ltr">
        <div className="wudu-col">{byside.left.map((s) => renderCallout(s.id))}</div>

        <div className="wudu-figure">
          <div className="wudu-fountain" aria-hidden>
            <span className="wudu-fountain__spout" />
            <span className="wudu-fountain__basin" />
          </div>
          <Character look={look} size={240} expression={finished ? 'happy' : wrong ? 'thinking' : 'calm'} pose={finished ? 'cheer' : 'idle'} />
          {WUDU_STEPS.map((s) => {
            const a = BODY_ANCHORS[s.id];
            const isDone = done.includes(s.id);
            return (
              <span
                key={s.id}
                className="wudu-dot"
                data-done={isDone || undefined}
                data-next={(guided && next?.id === s.id) || undefined}
                data-active={holding === s.id || undefined}
                style={{ left: `${(a.x / 120) * 100}%`, top: `${(a.y / 220) * 100}%` }}
                aria-hidden
              />
            );
          })}
          <AnimatePresence>
            {drops.map((d) => {
              const a = BODY_ANCHORS[d.to];
              return (
                <motion.span
                  key={d.id}
                  className="wudu-drop"
                  initial={{ left: '50%', top: '94%', opacity: 0, scale: 0.6 }}
                  animate={{ left: `${(a.x / 120) * 100}%`, top: `${(a.y / 220) * 100}%`, opacity: [0, 1, 1, 0], scale: [0.6, 1, 1, 1.8] }}
                  transition={{ duration: reduced ? 0.01 : 0.9, ease: [0.22, 0.61, 0.21, 1] }}
                  onAnimationComplete={() => setDrops((ds) => ds.filter((x) => x.id !== d.id))}
                  aria-hidden
                />
              );
            })}
          </AnimatePresence>
        </div>

        <div className="wudu-col">{byside.right.map((s) => renderCallout(s.id))}</div>
      </div>

      <p className="mech-feedback" data-tone={feedback?.tone} role="status" aria-live="polite">
        {finished ? '✦' : feedback?.text}
      </p>

      <div className="wudu-water">
        <span className="t-caption muted">{t('wudu.water')}</span>
        <div className="wudu-water__bar">
          <span style={{ width: `${Math.min(100, (water / (WUDU_STEPS.length + 4)) * 100)}%` }} />
        </div>
        <span className="t-small muted">{t('wudu.waterNote')}</span>
      </div>
    </div>
  );
}
