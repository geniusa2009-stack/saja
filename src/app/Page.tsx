import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { DUR, EASE, useReducedMotion } from '@/design-system';

/** Standard inner page: night backdrop, header, horizon-rise entrance. */
export function Page({ eyebrow, title, sub, actions, children, wide }: { eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode; wide?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <>
      <div className="night-backdrop" aria-hidden />
      <motion.div
        className="page"
        style={wide ? { maxWidth: 1320 } : undefined}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0.01 : DUR.md, ease: EASE }}
      >
        <header className="page-head">
          {eyebrow && <span className="t-caption eyebrow">{eyebrow}</span>}
          <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
            <h1 className="t-h1">{title}</h1>
            {actions}
          </div>
          {sub && (
            <p className="muted" style={{ maxWidth: 640 }}>
              {sub}
            </p>
          )}
        </header>
        {children}
      </motion.div>
    </>
  );
}
