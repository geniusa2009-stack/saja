import { WORDMARK_PATHS } from './geometry';

/**
 * Custom monoline wordmark — open-gateway A's, the second holding the star.
 * Paths from the brand board (viewBox 0 -4 180 64).
 */

export function SajaWordmark({ width = 120, color = '#F4ECDD', accent = '#DDBE7F', title = 'SAJA', className }: { width?: number; color?: string; accent?: string; title?: string; className?: string }) {
  return (
    <svg viewBox="0 -4 180 64" width={width} height={(width * 64) / 180} className={className} role="img" aria-label={title} style={{ overflow: 'visible' }}>
      <g fill="none" stroke={color} strokeWidth="4.4" strokeLinejoin="miter" strokeLinecap="butt">
        <path d={WORDMARK_PATHS.S} />
        <path d={WORDMARK_PATHS.A1} />
        <path d={WORDMARK_PATHS.J} />
        <path d={WORDMARK_PATHS.A2} />
      </g>
      <path d={WORDMARK_PATHS.star} fill={accent} />
    </svg>
  );
}
