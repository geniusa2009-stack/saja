/**
 * A situation, your choice, a consequence. Branching scenes where the world
 * responds — the other person's face, a seedling or a scale — and every ending
 * closes with a reflection, never a score or a scolding.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { NPCS } from '@/content/npcs';
import { Button } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { useProfile } from '@/store/profile';
import { Character } from '@/features/character/Character';
import type { Expression } from '@/features/character/palette';
import type { MechanicProps } from '../types';
import './choice.css';
import { useChoiceStory } from '../payload';

export default function KindnessChoice({ mission, onStep, setHint, setProgress, onComplete }: MechanicProps) {
  const { t, l } = useI18n();
  const look = useProfile((s) => s.profile!.look);
  const story = useChoiceStory(mission.id);
  const npc = NPCS.find((n) => n.missionId === mission.id) ?? NPCS[0];
  const [nodeId, setNodeId] = useState(story.start);
  const [kind, setKind] = useState(0);
  const [depth, setDepth] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [mood, setMood] = useState<Expression>('thinking');
  const node = story.nodes[nodeId];
  const isMarket = mission.location === 'market';

  useEffect(() => {
    setProgress(node.ending ? 1 : Math.min(0.9, depth / 3));
    setHint({ en: 'Imagine being in their place. What would you hope someone does for you?', ar: 'تخيّل نفسك مكانه. ماذا تتمنى أن يفعل أحد لأجلك؟' });
  }, [node, depth, setHint, setProgress]);

  const choose = (i: number) => {
    const c = node.choices![i];
    onStep(c.tone !== 'unkind');
    setKind((k) => k + (c.tone === 'kind' ? 1 : 0));
    setMood(c.tone === 'kind' ? 'happy' : c.tone === 'unkind' ? 'surprised' : 'thinking');
    setNote(c.feedback ? l(c.feedback) : null);
    setDepth((d) => d + 1);
    setNodeId(c.next);
  };

  const restart = () => {
    setNodeId(story.start);
    setKind(0);
    setDepth(0);
    setNote(null);
    setMood('thinking');
  };

  const growth = Math.min(3, kind);

  return (
    <div className="mech choice">
      <div className="choice-scene" data-location={mission.location}>
        <div className="choice-ground" aria-hidden />
        <div className="choice-actors">
          <Character look={look} size={130} facing="right" expression={node.ending ? 'happy' : 'calm'} pose={node.ending && kind > 0 ? 'wave' : 'idle'} />
          <div className="choice-prop" aria-hidden>
            {isMarket ? <Scale level={growth} /> : <Seedling stage={growth} />}
          </div>
          <Character look={npc.look} size={130} facing="left" expression={node.ending ? (kind > 0 ? 'happy' : 'calm') : mood} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={nodeId} className="choice-box" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35 }}>
          {node.ending ? (
            <>
              <span className="t-caption gold">{t('choice.endingTitle')}</span>
              <h2 className="t-h3">{l(node.ending.title)}</h2>
              <p className="choice-text">{l(node.ending.reflection)}</p>
              <div className="row wrap" style={{ marginTop: 6 }}>
                <Button iconEnd="forward" onClick={onComplete}>
                  {t('a.continue')}
                </Button>
                <Button variant="ghost" icon="refresh" onClick={restart}>
                  {t('choice.tryOther')}
                </Button>
              </div>
            </>
          ) : (
            <>
              {node.speaker && <span className="t-caption gold">{l(node.speaker)}</span>}
              {note && (
                <p className="choice-note">
                  <Icon name="sparkle" size={14} /> {note}
                </p>
              )}
              <p className="choice-text">{l(node.scene)}</p>
              <p className="t-caption muted" style={{ marginTop: 6 }}>
                {t('choice.whatDo')}
              </p>
              <div className="choice-options">
                {node.choices!.map((c, i) => (
                  <button key={i} type="button" className="choice-path" onClick={() => choose(i)}>
                    <svg viewBox="0 0 40 24" aria-hidden className="flip-rtl">
                      <path d="M2 20 C12 20 14 6 24 6 C30 6 32 10 38 10" />
                    </svg>
                    <span>{l(c.label)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Seedling({ stage }: { stage: number }) {
  return (
    <svg viewBox="0 0 80 90" width="80" height="90">
      <ellipse cx="40" cy="84" rx="26" ry="6" fill="#3b2a2a" opacity="0.6" />
      <motion.path d="M40 84 C40 70 40 60 40 48" stroke="#22b08c" strokeWidth="4" fill="none" strokeLinecap="round" initial={false} animate={{ pathLength: stage === 0 ? 0.25 : stage === 1 ? 0.55 : 1 }} transition={{ duration: 1.2 }} />
      <motion.path d="M40 70 C30 64 24 66 20 58 C30 56 36 60 40 70Z" fill="#127a62" initial={false} animate={{ scale: stage >= 1 ? 1 : 0.2, opacity: stage >= 1 ? 1 : 0.3 }} style={{ transformOrigin: '40px 70px' }} transition={{ duration: 0.9 }} />
      <motion.path d="M40 60 C50 54 56 56 60 48 C50 46 44 50 40 60Z" fill="#22b08c" initial={false} animate={{ scale: stage >= 2 ? 1 : 0, opacity: stage >= 2 ? 1 : 0 }} style={{ transformOrigin: '40px 60px' }} transition={{ duration: 0.9 }} />
      <motion.circle cx="40" cy="44" r="7" fill="#f6e8c6" initial={false} animate={{ scale: stage >= 3 ? 1 : 0, opacity: stage >= 3 ? 1 : 0 }} style={{ transformOrigin: '40px 44px', filter: 'drop-shadow(0 0 6px rgb(246 232 198 / .9))' }} transition={{ duration: 0.9 }} />
    </svg>
  );
}

function Scale({ level }: { level: number }) {
  const tilt = level >= 2 ? 0 : level === 1 ? -5 : -12;
  return (
    <svg viewBox="0 0 90 90" width="90" height="90">
      <path d="M45 18 V80 M30 82 H60" stroke="#c9a45c" strokeWidth="4" strokeLinecap="round" />
      <motion.g initial={false} animate={{ rotate: tilt }} style={{ transformOrigin: '45px 20px' }} transition={{ type: 'spring', stiffness: 80, damping: 10 }}>
        <path d="M12 20 H78" stroke="#c9a45c" strokeWidth="4" strokeLinecap="round" />
        <path d="M12 20 L4 44 H20 Z M78 20 L70 44 H86 Z" fill="none" stroke="#c9a45c" strokeWidth="2" />
        <path d="M2 44 Q12 52 22 44 Z M68 44 Q78 52 88 44 Z" fill="#c9a45c" />
      </motion.g>
      <circle cx="45" cy="18" r="4" fill="#f6e8c6" />
    </svg>
  );
}
