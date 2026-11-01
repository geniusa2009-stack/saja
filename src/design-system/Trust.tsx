import type { Confidence } from '@/domain/types';
import { Icon } from '@/brand/Icon';
import { useI18n } from '@/i18n';

export function ConfidenceBadge({ level, withSub }: { level: Confidence; withSub?: boolean }) {
  const { t } = useI18n();
  return (
    <span className={`trust trust--${level}`}>
      <span className="trust__dot" aria-hidden />
      <span>{t(`ev.conf.${level}`)}</span>
      {withSub && <span className="muted" style={{ fontWeight: 500 }}>· {t(`ev.conf.${level}Sub`)}</span>}
    </span>
  );
}

export function VerifiedBadge() {
  const { t } = useI18n();
  return (
    <span className="verified">
      <span className="verified__seal">
        <Icon name="check" size={13} strokeWidth={2.6} />
      </span>
      {t('sch.verified')}
    </span>
  );
}
