import { useId } from 'react';

/**
 * The Gateway mark — geometry copied exactly from the SAJA brand board
 * (viewBox 0 0 120 140). Brand rules: never outline, rotate or recolour the
 * gateway; below 40px use the flat variant.
 */
export const GATEWAY_D = 'M60 4 C63 17 72 24 84 31 C97 39 104 51 104 68 V136 H16 V68 C16 51 23 39 36 31 C48 24 57 17 60 4 Z';
export const WINDOW_D = 'M60 16 C62.5 26 70 32 80 38 C90 44.5 96 54 96 68 V136 H24 V68 C24 54 30 44.5 40 38 C50 32 57.5 26 60 16 Z';
export const PATH_D = 'M45 136 C45 126 70 122 70 116 C70 110 62 106 60 100 C64 105 79 109 79 116 C79 124 67 128 67 136 Z';
export const STAR_D = 'M60 42 C61 52 62 55 70 56 C62 57 61 60 60 70 C59 60 58 57 50 56 C58 55 59 52 60 42 Z';
export const STAR_FLAT_D = 'M60 40 C61.2 51 62.5 54.5 72 56 C62.5 57.5 61.2 61 60 72 C58.8 61 57.5 57.5 48 56 C57.5 54.5 58.8 51 60 40 Z';

interface Props {
  size?: number;
  variant?: 'color' | 'flat';
  ink?: string;
  paper?: string;
  accent?: string;
  title?: string;
  className?: string;
}

export function SajaMark({ size = 48, variant, ink = '#F4ECDD', paper = '#0B1530', accent = '#DDBE7F', title, className }: Props) {
  const uid = useId().replace(/:/g, '');
  const v = variant ?? (size < 40 ? 'flat' : 'color');
  const h = (size * 140) / 120;
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };

  if (v === 'flat') {
    return (
      <svg viewBox="0 0 120 140" width={size} height={h} className={className} {...a11y}>
        <path d={GATEWAY_D} fill={ink} />
        <path d={PATH_D} fill={paper} />
        <path d={STAR_FLAT_D} fill={accent} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 140" width={size} height={h} className={className} style={{ overflow: 'visible' }} {...a11y}>
      <defs>
        <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#22B08C" />
          <stop offset="1" stopColor="#0A4F40" />
        </linearGradient>
        <linearGradient id={`${uid}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050A18" />
          <stop offset="0.62" stopColor="#13204A" />
          <stop offset="1" stopColor="#1E3A66" />
        </linearGradient>
        <radialGradient id={`${uid}g`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#F3E2BA" stopOpacity="0.95" />
          <stop offset="1" stopColor="#F3E2BA" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}o`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#C9A45C" />
          <stop offset="1" stopColor="#F6E8C6" />
        </linearGradient>
        <linearGradient id={`${uid}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3E2BA" stopOpacity="0.85" />
          <stop offset="1" stopColor="#F3E2BA" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${uid}c`}>
          <path d={WINDOW_D} />
        </clipPath>
      </defs>
      <path d={GATEWAY_D} fill={`url(#${uid}f)`} />
      <path d={WINDOW_D} fill={`url(#${uid}s)`} stroke="#DDBE7F" strokeWidth="0.8" strokeOpacity="0.55" />
      <g clipPath={`url(#${uid}c)`}>
        <ellipse cx="60" cy="102" rx="36" ry="13" fill={`url(#${uid}g)`} />
        <rect x="59.35" y="66" width="1.3" height="36" fill={`url(#${uid}b)`} />
        <path d="M24 104 C38 95 52 96 64 102 C76 97 88 96 96 99 V136 H24 Z" fill="#138A96" fillOpacity="0.55" />
        <path d="M24 116 C42 107 66 110 96 112 V136 H24 Z" fill="#0F7A5F" />
        <path d={PATH_D} fill={`url(#${uid}o)`} />
        <circle cx="38" cy="62" r="0.9" fill="#F3E2BA" />
        <circle cx="82" cy="50" r="1.1" fill="#F3E2BA" />
        <circle cx="86" cy="78" r="0.7" fill="#F3E2BA" />
        <circle cx="33" cy="84" r="0.6" fill="#F3E2BA" />
        <circle cx="72" cy="36" r="0.6" fill="#F3E2BA" />
      </g>
      <path d={STAR_D} fill="#F6E8C6" />
    </svg>
  );
}

/** The four-point guiding star on its own. */
export function Star({ size = 16, color = 'currentColor', className }: { size?: number; color?: string; className?: string }) {
  return (
    <svg viewBox="48 40 24 32" width={size} height={(size * 32) / 24} className={className} aria-hidden>
      <path d={STAR_D} fill={color} />
    </svg>
  );
}
