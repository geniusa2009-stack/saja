/**
 * Adaptive mode: an illustrated walk-through of the same concept, derived from
 * the mission's own data — so "see it" teaches exactly what "do it" asked.
 */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { L10n } from '@/domain/types';
import { useClueHunt, useMatchSet, useSalahSteps, useWuduSteps } from '../payload';
import { Button } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { useProfile } from '@/store/profile';
import { Character } from '@/features/character/Character';
import type { MechanicProps } from '../types';
import { BODY_ANCHORS } from './anchors';
import { PoseGlyph } from './art';
import './explainer.css';

interface Slide {
  key: string;
  title: L10n;
  body: L10n;
  tag?: L10n;
  art: React.ReactNode;
}

export default function VisualExplainer({ mission, setHint, setProgress, onComplete }: MechanicProps) {
  const WUDU_STEPS = useWuduSteps();
  const SALAH_STEPS = useSalahSteps();
  const matchSet = useMatchSet(mission.id);
  const clueHunt = useClueHunt(mission.id);
  const { t, l } = useI18n();
  const look = useProfile((s) => s.profile!.look);
  const [i, setI] = useState(0);

  const slides: Slide[] = useMemo(() => {
    switch (mission.mechanic) {
      case 'wudu-journey':
        return WUDU_STEPS.map((s) => {
          const a = BODY_ANCHORS[s.id];
          return {
            key: s.id,
            title: s.label,
            body: s.action,
            tag: s.fard ? { en: 'Named in Qur’an 5:6', ar: 'مذكور في المائدة ٦' } : { en: 'Sunnah', ar: 'سنة' },
            art: (
              <div className="vx-figure">
                <Character look={look} size={150} animated={false} />
                <span className="vx-dot" style={{ left: `${(a.x / 120) * 100}%`, top: `${(a.y / 220) * 100}%` }} />
              </div>
            ),
          };
        });
      case 'salah-path':
        return SALAH_STEPS.map((s) => ({ key: s.id, title: s.label, body: s.meaning, tag: s.says, art: <PoseGlyph pose={s.id} size={150} color="#F6E8C6" /> }));
      case 'lantern-match':
        return matchSet.pairs.map((p) => ({
          key: p.id,
          title: p.term,
          body: p.meaning,
          art: (
            <div className="vx-lantern">
              <Icon name="lantern" size={96} strokeWidth={1.2} />
            </div>
          ),
        }));
      case 'clue-hunt': {
        const hunt = clueHunt;
        const blanks = hunt.sentence.filter((p): p is { blank: string } => 'blank' in p).map((p) => p.blank);
        return blanks.map((b, idx) => {
          const clue = hunt.clues.find((c) => c.id === b)!;
          const upTo = new Set(blanks.slice(0, idx + 1));
          return {
            key: b,
            title: clue.fragment,
            body: clue.object,
            art: (
              <p className="vx-sentence">
                {hunt.sentence.map((p, k) =>
                  'text' in p ? (
                    <span key={k}>{l(p.text)} </span>
                  ) : (
                    <mark key={k} data-on={upTo.has(p.blank) || undefined}>
                      {upTo.has(p.blank) ? l(hunt.clues.find((c) => c.id === p.blank)!.fragment) : '···'}{' '}
                    </mark>
                  ),
                )}
              </p>
            ),
          };
        });
      }
      default:
        return [];
    }
  }, [mission, look, l, WUDU_STEPS, SALAH_STEPS, matchSet, clueHunt]);

  useEffect(() => {
    setProgress((i + 1) / slides.length);
    setHint(null);
  }, [i, slides.length, setHint, setProgress]);

  const s = slides[i];
  const last = i === slides.length - 1;
  if (!s) return null;

  return (
    <div className="mech vx">
      <div className="mech-head">
        <span className="chip chip--turquoise">
          <Icon name="image" size={14} /> {t('vis.title')}
        </span>
      </div>
      <div className="vx-card">
        <AnimatePresence mode="wait">
          <motion.div key={s.key} className="vx-slide" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35 }}>
            <div className="vx-art">{s.art}</div>
            <div className="vx-text">
              <span className="vx-num">{t('m.progress', { n: i + 1, total: slides.length })}</span>
              <h2 className="t-h2">{l(s.title)}</h2>
              {s.tag && <span className="chip chip--gold">{l(s.tag)}</span>}
              <p className="t-body">{l(s.body)}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="vx-dots" role="tablist" aria-label={t('vis.title')}>
        {slides.map((x, k) => (
          <button key={x.key} role="tab" aria-selected={k === i} aria-label={l(x.title)} className="vx-dotbtn" data-seen={k <= i || undefined} onClick={() => setI(k)} />
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Button variant="ghost" icon="back" onClick={() => setI((k) => Math.max(0, k - 1))} disabled={i === 0}>
          {t('a.back')}
        </Button>
        {last ? (
          <Button variant="emerald" icon="check" onClick={onComplete}>
            {t('story.gotIt')}
          </Button>
        ) : (
          <Button iconEnd="forward" onClick={() => setI((k) => k + 1)}>
            {t('a.next')}
          </Button>
        )}
      </div>
    </div>
  );
}
