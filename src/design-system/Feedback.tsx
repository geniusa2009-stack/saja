import { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Star } from '@/brand/SajaMark';
import { Icon, type IconName } from '@/brand/Icon';
import { useI18n } from '@/i18n';
import { Button } from './Button';
import { useToasts } from './toast';

/** Loading = the star breathing (brand motion spec). */
export function StarLoader({ label, size = 28 }: { label?: string; size?: number }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="star-breath">
        <Star size={size} color="currentColor" />
      </span>
      {label && <span className="t-small">{label}</span>}
    </div>
  );
}

export function InlineStar({ size = 14 }: { size?: number }) {
  return (
    <span className="star-breath" aria-hidden>
      <Star size={size} color="currentColor" />
    </span>
  );
}

export function EmptyState({ icon = 'star', title, body, action }: { icon?: IconName; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state">
      <div className="state__art" aria-hidden>
        <span className="arch" style={{ width: 64, height: 76, placeItems: 'center', color: 'var(--gold-300)' }}>
          <Icon name={icon} size={26} />
        </span>
      </div>
      <p className="state__title">{title}</p>
      {body && <p className="state__body">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title, body, onRetry }: { title?: string; body?: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="state" role="alert">
      <div className="state__art" aria-hidden>
        <span className="arch" style={{ width: 64, height: 76, placeItems: 'center', color: 'var(--warning)' }}>
          <Icon name="moon" size={26} />
        </span>
      </div>
      <p className="state__title">{title ?? t('state.error')}</p>
      <p className="state__body">{body ?? t('state.errorBody')}</p>
      {onRetry && (
        <Button variant="secondary" icon="refresh" onClick={onRetry}>
          {t('a.retry')}
        </Button>
      )}
    </div>
  );
}

export function DemoNote({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="demo-note">
      <Icon name="info" size={16} />
      <span>{children ?? t('state.demoContentLong')}</span>
    </div>
  );
}

export function Toasts() {
  const items = useToasts((s) => s.items);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            className={`toast ${t.tone && t.tone !== 'info' ? `toast--${t.tone}` : ''}`}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.28 }}
          >
            <span>{t.text}</span>
            {t.action && (
              <button
                className="btn btn--sm"
                style={{ background: 'var(--midnight-900)', color: 'var(--sand-100)' }}
                onClick={() => {
                  t.action!.run();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
