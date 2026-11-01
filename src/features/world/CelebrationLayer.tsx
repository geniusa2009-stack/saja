/**
 * Unlock celebrations. Brand rule: no confetti, no bursts — the star lifts and
 * the path lights gold from your feet to the gate. At most 12 particles.
 */
import { useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { LOCATION_BY_ID } from '@/content/world';
import { Button, Dialog, useReducedMotion } from '@/design-system';
import { SajaMark, Star } from '@/brand/SajaMark';
import { useI18n } from '@/i18n';
import { useProgress } from '@/store/progress';
import { useWorldCommand } from './commands';


export default function CelebrationLayer() {
  const { t, l } = useI18n();
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  const queue = useProgress((s) => s.celebrations);
  const shift = useProgress((s) => s.shiftCelebration);
  const requestWalk = useWorldCommand((s) => s.requestWalk);
  const item = pathname === '/' ? queue.find((c) => c.kind === 'unlock') : undefined;
  const loc = item?.locationId ? LOCATION_BY_ID[item.locationId] : undefined;

  return (
    <Dialog
      open={!!loc}
      onClose={shift}
      title={loc ? t('world.unlockTitle', { place: l(loc.name) }) : ''}
      art={
        <div style={{ position: 'relative', width: 120, height: 150, display: 'grid', placeItems: 'end center' }}>
          <motion.div initial={reduced ? false : { y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1.2, ease: [0.22, 0.61, 0.21, 1] }}>
            <SajaMark size={96} />
          </motion.div>
          <motion.span
            style={{ position: 'absolute', top: 0, color: '#F6E8C6', filter: 'drop-shadow(0 0 12px rgb(246 232 198 / .9))' }}
            initial={reduced ? false : { y: 40, opacity: 0, scale: 0.6 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Star size={22} color="currentColor" />
          </motion.span>
        </div>
      }
      actions={
        <>
          <Button variant="ghost" onClick={shift}>
            {t('world.later')}
          </Button>
          <Button
            variant="celebrate"
            iconEnd="forward"
            onClick={() => {
              if (loc) requestWalk(loc.id);
              shift();
            }}
          >
            {t('world.visit')}
          </Button>
        </>
      }
    >
      <p className="t-serif-italic" style={{ fontSize: '1.15rem', color: 'var(--gold-100)', marginBottom: 6 }}>
        {t('app.campaign')}
      </p>
      {loc && <p>{l(loc.purpose)}</p>}
    </Dialog>
  );
}
