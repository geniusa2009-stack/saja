import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { IconButton } from './Button';
import { useFocusTrap } from './useFocusTrap';
import { DUR, EASE, EASE_OUT, useIsDesktop, useReducedMotion } from './motion';
import { useI18n } from '@/i18n';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Force a placement; default is side on desktop, bottom on mobile. */
  placement?: 'auto' | 'bottom' | 'side';
  labelledBy?: string;
  className?: string;
}

export function Sheet({ open, onClose, title, icon, children, footer, placement = 'auto', className = '' }: SheetProps) {
  const desktop = useIsDesktop();
  const reduced = useReducedMotion();
  const { isRTL, t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(ref, open, onClose);
  const side = placement === 'side' || (placement === 'auto' && desktop);

  const from = side ? { x: isRTL ? -40 : 40, opacity: 0 } : { y: '100%' };
  const to = side ? { x: 0, opacity: 1 } : { y: 0 };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : DUR.sm }} />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className={`sheet ${side ? 'sheet--side' : 'sheet--bottom'} ${className}`}
            initial={reduced ? { opacity: 0 } : from}
            animate={reduced ? { opacity: 1 } : to}
            exit={reduced ? { opacity: 0 } : from}
            transition={{ duration: reduced ? 0.01 : side ? DUR.sm : 0.42, ease: side ? EASE : EASE_OUT }}
            drag={!side && !reduced ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {!side && <div className="sheet__grip" aria-hidden />}
            {(title || icon) && (
              <div className="sheet__head">
                {icon}
                <h2 id={titleId} className="sheet__title" style={{ flex: 1 }}>
                  {title}
                </h2>
                <IconButton icon="close" label={t('a.close')} size="sm" onClick={onClose} />
              </div>
            )}
            <div className="sheet__body" onPointerDownCapture={(e) => e.stopPropagation()}>
              {children}
            </div>
            {footer && <div className="sheet__foot">{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  art?: ReactNode;
  dismissible?: boolean;
}

export function Dialog({ open, onClose, title, children, actions, art, dismissible = true }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const titleId = useId();
  useFocusTrap(ref, open, dismissible ? onClose : undefined);
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="dialog-wrap">
          <motion.div className="scrim" style={{ zIndex: 0 }} onClick={dismissible ? onClose : undefined} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="dialog"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: reduced ? 0.01 : DUR.sm, ease: EASE }}
          >
            {art && <div style={{ display: 'grid', placeItems: 'center', marginBottom: 16 }}>{art}</div>}
            <h2 id={titleId} className="t-h3" style={{ marginBottom: 8 }}>
              {title}
            </h2>
            {children && <div className="muted t-small">{children}</div>}
            {actions && (
              <div className="row wrap" style={{ marginTop: 24, justifyContent: 'flex-end' }}>
                {actions}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
