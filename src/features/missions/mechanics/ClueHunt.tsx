/**
 * Clue Hunt — discover glowing clues hidden in a scene, then reconstruct the
 * answer yourself by placing fragments (some are decoys) into the sentence.
 */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon, type IconName } from '@/brand/Icon';
import { Button } from '@/design-system';
import { useI18n } from '@/i18n';
import type { MechanicProps } from '../types';
import './clue.css';
import { useClueHunt } from '../payload';

const CLUE_ICONS: IconName[] = ['map', 'moon', 'learn', 'sun', 'file'];

export default function ClueHunt({ mission, guided, onStep, setHint, setProgress, onComplete }: MechanicProps) {
  const { t, l } = useI18n();
  const hunt = useClueHunt(mission.id);
  const [found, setFound] = useState<string[]>([]);
  const [phase, setPhase] = useState<'find' | 'build'>('find');
  const [filled, setFilled] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongBlank, setWrongBlank] = useState<number | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);
  const blanks = hunt.sentence.map((p, i) => ('blank' in p ? i : -1)).filter((i) => i >= 0);
  const chips = useMemo(() => {
    const all = [...hunt.clues.map((c) => ({ id: c.id, fragment: c.fragment })), ...hunt.distractors];
    return all.sort((a, b) => (a.id > b.id ? 1 : -1));
  }, [hunt]);
  const filledCount = Object.keys(filled).length;
  const done = phase === 'build' && filledCount === blanks.length;
  const firstEmpty = blanks.find((b) => !filled[b]);

  useEffect(() => {
    const total = hunt.clues.length + blanks.length;
    setProgress((found.length + filledCount) / total);
    if (phase === 'find') setHint({ en: 'Clues glow softly. Look near shelves, corners and anything that catches the light.', ar: 'الأدلة تتوهج بهدوء. انظر قرب الرفوف والزوايا وكل ما يلمع.' });
    else if (firstEmpty !== undefined) {
      const expect = (hunt.sentence[firstEmpty] as { blank: string }).blank;
      const clue = hunt.clues.find((c) => c.id === expect)!;
      setHint({ en: `Remember the clue: ${clue.object.en}.`, ar: `تذكّر الدليل: ${clue.object.ar}.` });
    }
  }, [found.length, filledCount, phase, firstEmpty, hunt, blanks.length, setHint, setProgress]);

  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(onComplete, 1400);
    return () => window.clearTimeout(id);
  }, [done, onComplete]);

  const collect = (id: string) => {
    if (found.includes(id)) return;
    const c = hunt.clues.find((x) => x.id === id)!;
    setFound((f) => [...f, id]);
    setToastText(t('clue.clueFound', { object: l(c.object) }));
    onStep(true);
  };

  const place = (blankIdx: number) => {
    if (!selected || filled[blankIdx]) return;
    const expect = (hunt.sentence[blankIdx] as { blank: string }).blank;
    if (selected === expect) {
      setFilled((f) => ({ ...f, [blankIdx]: selected }));
      setSelected(null);
      onStep(true);
    } else {
      setWrongBlank(blankIdx);
      window.setTimeout(() => setWrongBlank(null), 400);
      setToastText(t('clue.wrong'));
      onStep(false);
    }
  };

  const used = new Set(Object.values(filled));
  const guidedTarget = guided && firstEmpty !== undefined ? (hunt.sentence[firstEmpty] as { blank: string }).blank : null;

  return (
    <div className="mech clue">
      <div className="mech-head">
        <p className="mech-instruction" style={{ color: 'var(--text)', fontSize: '1.0625rem' }}>
          {l(hunt.intro)}
        </p>
        <span className="mech-next">
          {phase === 'find' ? t('clue.found', { n: found.length, total: hunt.clues.length }) : t('clue.build')}
        </span>
      </div>

      {phase === 'find' ? (
        <>
          <div className="clue-scene" data-scene={hunt.scene} dir="ltr">
            <SceneArt scene={hunt.scene} />
            {hunt.clues.map((c, i) => {
              const got = found.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  className="clue-spot"
                  data-found={got || undefined}
                  data-hint={(guided && !got && hunt.clues.find((x) => !found.includes(x.id))?.id === c.id) || undefined}
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                  onClick={() => collect(c.id)}
                  aria-label={got ? l(c.object) : `${t('clue.find')} ${i + 1}`}
                  disabled={got}
                >
                  <Icon name={got ? 'check' : CLUE_ICONS[i % CLUE_ICONS.length]} size={18} />
                </button>
              );
            })}
          </div>
          <p className="mech-feedback" data-tone="right" role="status">
            {toastText}
          </p>
          <div className="clue-journal" aria-label={t('clue.fragments')}>
            <AnimatePresence>
              {found.map((id) => {
                const c = hunt.clues.find((x) => x.id === id)!;
                return (
                  <motion.div key={id} className="clue-card" initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
                    <span className="t-small muted">{l(c.object)}</span>
                    <strong>{l(c.fragment)}</strong>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          {found.length === hunt.clues.length && (
            <Button size="lg" iconEnd="forward" onClick={() => { setPhase('build'); setToastText(null); }} style={{ justifySelf: 'center' }}>
              {t('clue.build')}
            </Button>
          )}
        </>
      ) : (
        <>
          <p className="mech-instruction" style={{ textAlign: 'center', justifySelf: 'center' }}>
            {t('clue.buildSub')}
          </p>
          <div className="clue-sentence">
            {hunt.sentence.map((p, i) =>
              'text' in p ? (
                <span key={i} className="clue-sentence__text">
                  {l(p.text)}
                </span>
              ) : (
                <button
                  key={i}
                  type="button"
                  className={`clue-blank ${wrongBlank === i ? 'is-wrong' : ''}`}
                  data-filled={filled[i] ? '' : undefined}
                  data-target={(guided && i === firstEmpty) || undefined}
                  data-ready={(!!selected && !filled[i]) || undefined}
                  onClick={() => place(i)}
                  aria-label={filled[i] ? l(chips.find((c) => c.id === filled[i])!.fragment) : t('clue.blank')}
                >
                  {filled[i] ? l(chips.find((c) => c.id === filled[i])!.fragment) : '···'}
                </button>
              ),
            )}
          </div>
          <p className="mech-feedback" data-tone={toastText ? 'wrong' : undefined} role="status">
            {done ? '✦' : toastText}
          </p>
          <div className="clue-chips" role="group" aria-label={t('clue.fragments')}>
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                className="chip clue-chip"
                aria-pressed={selected === c.id}
                data-hint={guidedTarget === c.id || undefined}
                data-dim={(guided && guidedTarget !== c.id && !used.has(c.id)) || undefined}
                disabled={used.has(c.id)}
                onClick={() => { setSelected((s) => (s === c.id ? null : c.id)); setToastText(null); }}
              >
                {l(c.fragment)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SceneArt({ scene }: { scene: 'library' | 'desert' | 'mountain' }) {
  if (scene === 'library')
    return (
      <svg className="clue-art" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden>
        {[8, 30, 52, 74].map((x) => (
          <g key={x}>
            <rect x={x} y="6" width="18" height="46" fill="#1f2a55" />
            {[12, 22, 32, 42].map((y) => (
              <g key={y}>
                <rect x={x} y={y + 7} width="18" height="1.2" fill="#3a2f2a" />
                {[0, 3, 6, 9, 12, 15].map((b) => (
                  <rect key={b} x={x + 0.6 + b} y={y + 0.5} width="2.2" height="6.5" fill={['#6b4a2e', '#0f6b55', '#5e4d8e', '#8e4b3c', '#2b4378', '#9a7a3a'][(b + y) % 6]} opacity="0.85" />
                ))}
              </g>
            ))}
          </g>
        ))}
        <rect x="0" y="52" width="100" height="8" fill="#141c3d" />
      </svg>
    );
  if (scene === 'desert')
    return (
      <svg className="clue-art" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden>
        <path d="M0 40 Q25 28 50 38 T100 34 V60 H0Z" fill="#5a4a5e" />
        <path d="M0 48 Q30 38 60 48 T100 46 V60 H0Z" fill="#7a6068" />
        <path d="M70 34 L78 22 L86 34Z" fill="#8e4b3c" />
        <path d="M20 38 V28 M20 28 q4 -3 8 0 M20 28 q-4 -3 -8 0" stroke="#127a62" strokeWidth="1.2" fill="none" />
      </svg>
    );
  return (
    <svg className="clue-art" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden>
      <path d="M0 60 L30 22 L45 30 L60 12 L100 60Z" fill="#16264f" />
      <path d="M52 20 Q60 6 68 20Z" fill="#1f5a64" />
      <rect x="52" y="20" width="16" height="6" fill="#22325e" />
    </svg>
  );
}
