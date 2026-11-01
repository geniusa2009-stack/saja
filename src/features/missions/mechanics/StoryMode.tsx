/** Adaptive mode: the same idea told as a short narrated story. */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { L10n } from '@/domain/types';
import { CONCEPT_STORIES } from '@/content/missions';
import { getKnowledge } from '@/content/knowledge';
import { NPCS } from '@/content/npcs';
import { Button } from '@/design-system';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { useProfile } from '@/store/profile';
import { Character } from '@/features/character/Character';
import type { MechanicProps } from '../types';
import './explainer.css';

export default function StoryMode({ mission, setHint, setProgress, onComplete }: MechanicProps) {
  const { t, l } = useI18n();
  const look = useProfile((s) => s.profile!.look);
  const npc = NPCS.find((n) => n.at === mission.location) ?? NPCS[1];
  const k = getKnowledge(mission.knowledge[0]);
  const pages: L10n[] = CONCEPT_STORIES[mission.concept] ?? (k ? [k.example, k.simple, k.why] : []);
  const [i, setI] = useState(0);
  const last = i === pages.length - 1;

  useEffect(() => {
    setProgress((i + 1) / pages.length);
    setHint(null);
  }, [i, pages.length, setHint, setProgress]);

  return (
    <div className="mech vx story">
      <div className="mech-head">
        <span className="chip chip--turquoise">
          <Icon name="quote" size={14} /> {t('story.title')}
        </span>
      </div>
      <div className="story-stage">
        <Character look={npc.look} size={120} facing="right" expression="happy" pose={i === 0 ? 'wave' : 'idle'} />
        <Character look={look} size={110} facing="left" expression={last ? 'happy' : 'calm'} />
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={i} className="story-text" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.45 }}>
          {l(pages[i])}
        </motion.p>
      </AnimatePresence>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Button variant="ghost" icon="back" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>
          {t('a.back')}
        </Button>
        {last ? (
          <Button variant="emerald" icon="check" onClick={onComplete}>
            {t('story.gotIt')}
          </Button>
        ) : (
          <Button iconEnd="forward" onClick={() => setI((x) => x + 1)}>
            {t('a.next')}
          </Button>
        )}
      </div>
    </div>
  );
}
