/**
 * Shown when a guardian's daily time limit — measured by SAJA's server — is
 * reached. Nothing is lost: progress is saved, and a guardian can add time
 * from their own account. Only appears when the server says so.
 */
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Icon } from '@/brand/Icon';
import { Star } from '@/brand/SajaMark';
import { useReducedMotion } from '@/design-system';
import { useI18n } from '@/i18n';
import { useConnection } from '@/store/connection';
import './account.css';

export function RestScreen() {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const usage = useConnection((s) => s.usage);
  if (!usage?.limited) return null;
  return (
    <div className="rest-screen" role="dialog" aria-modal="true" aria-labelledby="rest-title">
      <motion.div className="rest-card" initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <span className="rest-moon" aria-hidden>
          <Icon name="moon" size={44} />
          <Star size={14} color="currentColor" />
        </span>
        <h2 id="rest-title" className="t-h2">
          {t('rest.title')}
        </h2>
        <p>{t('rest.body', { n: usage.limitMinutes + usage.extraMinutes })}</p>
        <p className="t-small muted">
          <Icon name="check" size={14} /> {t('rest.saved')}
        </p>
        <p className="t-small muted">{t('rest.more')}</p>
        <Link to="/journey" className="t-small">
          {t('rest.journey')}
        </Link>
      </motion.div>
    </div>
  );
}

/** "12 of 45 minutes today" — only when the server is measuring it. */
export function UsageLine() {
  const { t, num } = useI18n();
  const usage = useConnection((s) => s.usage);
  const online = useConnection((s) => s.status === 'online');
  if (!online) return <p className="t-small muted">{t('rest.notTracked')}</p>;
  if (!usage) return null;
  return <p className="t-small">{t('rest.today', { used: num(Math.floor(usage.usedSeconds / 60)), total: num(usage.limitMinutes + usage.extraMinutes) })}</p>;
}
