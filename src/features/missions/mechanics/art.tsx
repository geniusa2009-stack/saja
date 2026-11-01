/**
 * Posture glyphs for the salah path. Postures show an ordinary person
 * praying — never a prophet or companion.
 */
import type { SalahPose } from '@/content/missions';

const INK = '#F4ECDD';

export function PoseGlyph({ pose, size = 56, color = INK }: { pose: SalahPose; size?: number; color?: string }) {
  const common = { fill: color };
  const stroke = { stroke: color, strokeWidth: 7, strokeLinecap: 'round' as const, fill: 'none' };
  let body: React.ReactNode;
  switch (pose) {
    case 'takbir':
      body = (
        <>
          <circle cx="50" cy="18" r="9" {...common} />
          <path d="M50 30 V66 M50 66 L43 94 M50 66 L57 94" {...stroke} />
          <path d="M50 38 L38 30 L36 16 M50 38 L62 30 L64 16" {...stroke} strokeWidth={6} />
        </>
      );
      break;
    case 'qiyam':
    case 'itidal':
      body = (
        <>
          <circle cx="50" cy="18" r="9" {...common} />
          <path d="M50 30 V66 M50 66 L43 94 M50 66 L57 94" {...stroke} />
          <path d={pose === 'qiyam' ? 'M50 40 L40 52 L52 54' : 'M50 40 L42 62 M50 40 L58 62'} {...stroke} strokeWidth={6} />
        </>
      );
      break;
    case 'ruku':
      body = (
        <>
          <circle cx="24" cy="44" r="9" {...common} />
          <path d="M34 48 H66 M66 48 L62 94 M62 50 L66 94" {...stroke} />
          <path d="M44 50 L52 72" {...stroke} strokeWidth={6} />
        </>
      );
      break;
    case 'sujud':
    case 'sujud2':
      body = (
        <>
          <circle cx="22" cy="82" r="9" {...common} />
          <path d="M30 78 Q50 52 66 64 L72 90 M66 64 L84 92" {...stroke} />
          <path d="M40 70 L28 92" {...stroke} strokeWidth={6} />
          <path d="M8 96 H92" stroke={color} strokeOpacity="0.35" strokeWidth="3" />
        </>
      );
      break;
    case 'jalsa':
    case 'tashahhud':
    case 'tasleem':
      body = (
        <>
          <circle cx={pose === 'tasleem' ? 54 : 48} cy="30" r="9" {...common} />
          {pose === 'tasleem' && <path d="M60 26 L66 24" {...stroke} strokeWidth={4} />}
          <path d="M48 42 V72 L74 80 M48 72 L34 92 H74" {...stroke} />
          <path d={pose === 'tashahhud' ? 'M48 52 L62 68 L68 58' : 'M48 52 L64 70'} {...stroke} strokeWidth={6} />
          <path d="M8 96 H92" stroke={color} strokeOpacity="0.35" strokeWidth="3" />
        </>
      );
      break;
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      {body}
    </svg>
  );
}
