/**
 * Scenery primitives — the shared visual vocabulary of the SAJA world.
 *
 * Everything is drawn for a 2.5D side-on camera: a warm light from the upper
 * left, cool bounce light from the ground, and contact shadows that keep each
 * object anchored. Glows and shadows are gradients rather than SVG filters so
 * the world stays cheap to paint on low-memory phones.
 */
import type { CSSProperties } from 'react';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const swayStyle = (delay = 0, duration = 8): Vars => ({
  '--sway-delay': `${delay}s`,
  '--sway-duration': `${duration}s`,
});

/* ── Light ───────────────────────────────────────────────── */

export function Lantern({
  x = 0,
  y = 0,
  s = 1,
  delay = 0,
  tone = 'brass',
}: {
  x?: number;
  y?: number;
  s?: number;
  delay?: number;
  tone?: 'brass' | 'clay';
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${s})`}
      className={`w-lantern w-lantern--${tone}`}
      style={{ '--lantern-delay': `${delay}s` } as Vars}
    >
      <ellipse className="w-lantern__halo" rx="30" ry="34" fill="url(#w-glow-grad)" />
      <path d="M0 -27 V-13" stroke="var(--metal)" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M-7 -13 H7 L5 -9 H-5Z" fill="var(--metal)" />
      <path d="M-6 -9 H6 L5 10 Q0 14 -5 10Z" fill="url(#w-lamp-grad)" className="w-lamp" />
      <path d="M-6 -9 H6 L5 10 Q0 14 -5 10Z" fill="none" stroke="var(--metal)" strokeWidth="1" opacity="0.7" />
      <path className="w-lantern__flame" d="M0 -5 Q3 0 0 5 Q-3 0 0 -5Z" fill="var(--flame)" />
      <path d="M-3 -9 L-2 10 M3 -9 L2 10" stroke="var(--metal)" strokeWidth="0.7" opacity="0.35" />
      <path d="M-9 10 H9" stroke="var(--metal)" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

export function LampPost({ x = 0, h = 118, delay = 0, s = 1 }: { x?: number; h?: number; delay?: number; s?: number }) {
  return (
    <g transform={`translate(${x} 0) scale(${s})`}>
      <ellipse cx="0" cy="1" rx="18" ry="5" fill="url(#w-shadow-grad)" />
      <rect x="-3" y={-h} width="6" height={h} rx="2.5" fill="var(--metal)" />
      <rect x="-1.2" y={-h + 10} width="2.4" height={h - 12} rx="1" fill="var(--metal-light)" opacity="0.45" />
      <path d={`M0 ${-h} Q0 ${-h - 12} 13 ${-h - 12}`} stroke="var(--metal)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="0" cy={-h + 4} r="5" fill="var(--metal)" />
      <circle cx="0" cy={-h + 4} r="2.2" fill="var(--gold-soft)" opacity="0.8" />
      <Lantern x={14} y={-h - 5} s={0.92} delay={delay} />
    </g>
  );
}

export function StringLights({
  x1,
  y1,
  x2,
  y2,
  sag = 40,
  count = 5,
  delay = 0,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  sag?: number;
  count?: number;
  delay?: number;
}) {
  const cx = (x1 + x2) / 2;
  const cy = Math.max(y1, y2) + sag;
  const at = (t: number) => {
    const u = 1 - t;
    return { x: u * u * x1 + 2 * u * t * cx + t * t * x2, y: u * u * y1 + 2 * u * t * cy + t * t * y2 };
  };
  const lamps = Array.from({ length: count }, (_, i) => at((i + 1) / (count + 1)));
  return (
    <g>
      <path d={`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`} stroke="var(--metal)" strokeWidth="1.4" fill="none" opacity="0.65" />
      {lamps.map((p, i) => (
        <Lantern key={i} x={p.x} y={p.y + 8} s={0.48 + (i % 2) * 0.08} delay={delay + i * 0.7} tone={i % 3 === 1 ? 'clay' : 'brass'} />
      ))}
    </g>
  );
}

export function GroundShadow({ rx = 80, ry = 12, cx = 0, cy = 2, opacity = 1 }: { rx?: number; ry?: number; cx?: number; cy?: number; opacity?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#w-shadow-grad)" opacity={opacity} />;
}

/* ── Architecture ────────────────────────────────────────── */

export function ArchWindow({
  x,
  y,
  w = 26,
  h = 44,
  lit = true,
  shape = 'pointed',
  frame = true,
  grille = false,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  lit?: boolean;
  shape?: 'pointed' | 'round';
  frame?: boolean;
  grille?: boolean;
}) {
  const r = w / 2;
  const arch =
    shape === 'pointed'
      ? `M${x} ${y + h} V${y + w * 0.62} C${x} ${y + w * 0.18} ${x + w * 0.18} ${y + w * 0.02} ${x + r} ${y - w * 0.24} C${x + w * 0.82} ${y + w * 0.02} ${x + w} ${y + w * 0.18} ${x + w} ${y + w * 0.62} V${y + h}Z`
      : `M${x} ${y + h} V${y + r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h}Z`;
  return (
    <g className={`w-window-frame ${lit ? 'is-lit' : ''}`}>
      {lit && <ellipse className="w-window-halo" cx={x + r} cy={y + h * 0.55} rx={w * 0.95} ry={h * 0.72} fill="url(#w-window-glow-grad)" />}
      <path d={arch} className="w-window" />
      {frame && <path d={arch} fill="none" stroke="var(--window-frame)" strokeWidth="1.6" opacity="0.9" />}
      {grille && (
        <g stroke="var(--window-frame)" strokeWidth="0.8" opacity="0.45">
          <path d={`M${x + r} ${y - w * 0.05} V${y + h}`} />
          <path d={`M${x} ${y + h * 0.44} H${x + w}`} />
        </g>
      )}
    </g>
  );
}

export function Door({
  x = 0,
  w = 58,
  h = 104,
  glow = true,
  double = true,
}: {
  x?: number;
  w?: number;
  h?: number;
  glow?: boolean;
  double?: boolean;
}) {
  const r = w / 2;
  const arch = `M${x} 0 V${-h + r} A${r} ${r} 0 0 1 ${x + w} ${-h + r} V0Z`;
  return (
    <g>
      {glow && <ellipse className="w-door-glow" cx={x + r} cy={-h * 0.38} rx={w * 0.95} ry={h * 0.6} fill="url(#w-window-glow-grad)" />}
      <path d={arch} fill="var(--door)" />
      <path d={arch} fill="none" stroke="var(--wood-light)" strokeWidth="2.2" opacity="0.75" />
      <path d={`M${x + r} 0 V${-h + r * 0.8}`} stroke="var(--wood)" strokeWidth="1.4" opacity="0.9" />
      {double && (
        <>
          <path d={`M${x + w * 0.27} ${-h * 0.72} V${-h * 0.1}`} stroke="var(--wood-light)" strokeWidth="1" opacity="0.4" />
          <path d={`M${x + w * 0.73} ${-h * 0.72} V${-h * 0.1}`} stroke="var(--wood-light)" strokeWidth="1" opacity="0.4" />
        </>
      )}
      <circle cx={x + r - 8} cy={-h * 0.34} r="2" fill="var(--gold)" opacity="0.85" />
      <circle cx={x + r + 8} cy={-h * 0.34} r="2" fill="var(--gold)" opacity="0.85" />
      <path d={`M${x - 6} 0 H${x + w + 6} V6 H${x - 6}Z`} fill="var(--stone-light)" opacity="0.8" />
      <path d={`M${x - 10} 6 H${x + w + 10} V10 H${x - 10}Z`} fill="var(--stone)" opacity="0.65" />
    </g>
  );
}

export function Crenellations({ x, y, w, step = 18, h = 7 }: { x: number; y: number; w: number; step?: number; h?: number }) {
  const n = Math.max(1, Math.floor(w / step));
  return (
    <g fill="var(--roof-deep)">
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={x + i * step + 2} y={y - h} width={step * 0.55} height={h} rx="1.5" />
      ))}
    </g>
  );
}

/* ── Trees & planting ───────────────────────────────────── */

export function Palm({
  x,
  s = 1,
  delay = 0,
  tone = 0,
  flip = false,
}: {
  x: number;
  s?: number;
  delay?: number;
  tone?: 0 | 1;
  flip?: boolean;
}) {
  const fronds = [-154, -122, -88, -54, -20, 14, 48, 76];
  return (
    <g transform={`translate(${x} 0) scale(${s * (flip ? -1 : 1)} ${s})`}>
      <g className="w-sway" style={swayStyle(delay, 7.5 + delay * 0.35)}>
        <GroundShadow rx={34} ry={7} />
        <path d="M0 0 C-5 -46 -3 -112 5 -166" stroke="url(#w-trunk-grad)" strokeWidth="13" fill="none" strokeLinecap="round" />
        <path d="M0 -4 C-3 -48 -1 -112 7 -162" stroke="var(--trunk-light)" strokeWidth="2.2" fill="none" opacity="0.32" strokeLinecap="round" />
        {[-24, -52, -82, -112, -140].map((y, i) => (
          <path
            key={y}
            d={`M${-4 + i * 0.7} ${y} q5 -4 10 -1`}
            stroke="var(--trunk)"
            strokeWidth="2.4"
            fill="none"
            opacity="0.55"
            strokeLinecap="round"
          />
        ))}
        <g transform="translate(5 -166)">
          {fronds.map((a, i) => (
            <g key={a} transform={`rotate(${a})`}>
              <path
                d="M0 0 Q24 -14 54 -5 Q68 -1 78 10 Q53 6 30 8 Q12 9 0 4Z"
                fill={i % 3 === 1 ? 'var(--foliage-dark)' : i % 3 === 2 ? 'var(--foliage-mid)' : 'var(--foliage)'}
                opacity={tone ? 0.92 : 1}
              />
              <path d="M2 1 Q34 -3 72 8" stroke="var(--foliage-hi)" strokeWidth="1" fill="none" opacity="0.42" />
            </g>
          ))}
          <circle cx="-7" cy="8" r="4" fill="var(--gold)" opacity="0.7" />
          <circle cx="6" cy="10" r="3.4" fill="var(--gold-soft)" opacity="0.55" />
        </g>
      </g>
    </g>
  );
}

export function Cypress({ x, s = 1, delay = 0 }: { x: number; s?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} 0) scale(${s})`}>
      <g className="w-sway" style={swayStyle(delay, 9)}>
        <GroundShadow rx={22} ry={5} />
        <path d="M0 0 C-18 -22 -22 -58 -11 -92 C-5 -112 -2 -126 0 -148 C2 -126 5 -112 11 -92 C22 -58 18 -22 0 0Z" fill="var(--foliage-dark)" />
        <path d="M0 -4 C-10 -28 -13 -58 -6 -88 C-2 -108 0 -120 0 -136 C2 -118 4 -102 8 -82 C14 -56 10 -28 0 -4Z" fill="var(--foliage)" opacity="0.75" />
        <path d="M0 -10 C2 -42 3 -80 0 -132" stroke="var(--foliage-hi)" strokeWidth="1.2" opacity="0.35" fill="none" />
      </g>
    </g>
  );
}

export function RoundTree({ x, s = 1, tone = 0, delay = 0 }: { x: number; s?: number; tone?: 0 | 1; delay?: number }) {
  return (
    <g transform={`translate(${x} 0) scale(${s})`}>
      <g className="w-sway" style={swayStyle(delay, 8.6)}>
        <GroundShadow rx={44} ry={9} />
        <path d="M0 0 C-1 -24 -4 -46 -2 -66 M-2 -48 C-12 -58 -18 -66 -22 -78 M-1 -52 C10 -62 16 -70 20 -82" stroke="url(#w-trunk-grad)" strokeWidth="8" fill="none" strokeLinecap="round" />
        <circle cx="-30" cy="-88" r="31" fill="var(--foliage-dark)" />
        <circle cx="26" cy="-86" r="34" fill="var(--foliage-mid)" />
        <circle cx="-4" cy="-112" r="39" fill={tone ? 'var(--foliage-mid)' : 'var(--foliage)'} />
        <circle cx="-38" cy="-112" r="24" fill="var(--foliage)" opacity="0.9" />
        <circle cx="31" cy="-116" r="23" fill="var(--foliage-dark)" opacity="0.85" />
        <circle cx="-17" cy="-134" r="20" fill="var(--foliage-hi)" opacity="0.28" />
        <circle cx="13" cy="-126" r="15" fill="var(--foliage-hi)" opacity="0.2" />
      </g>
    </g>
  );
}

export function OliveTree({ x, s = 1, delay = 0 }: { x: number; s?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} 0) scale(${s})`}>
      <g className="w-sway" style={swayStyle(delay, 10)}>
        <GroundShadow rx={40} ry={8} />
        <path d="M0 0 C-4 -18 -1 -34 -8 -48 C-14 -60 -10 -70 -2 -82 C6 -94 4 -104 8 -116" stroke="url(#w-trunk-grad)" strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M-4 -50 C-20 -58 -30 -68 -34 -82 M-2 -76 C10 -84 22 -90 28 -102" stroke="var(--trunk)" strokeWidth="5" fill="none" strokeLinecap="round" />
        {[
          [-34, -92, 22],
          [0, -112, 26],
          [30, -100, 21],
          [-14, -84, 19],
          [16, -78, 16],
          [-28, -72, 13],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill={i % 2 ? 'var(--foliage-mid)' : 'var(--foliage)'} opacity={i > 3 ? 0.8 : 1} />
        ))}
        <circle cx="-8" cy="-114" r="10" fill="var(--foliage-hi)" opacity="0.25" />
      </g>
    </g>
  );
}

export function Bush({ x, s = 1, tone = 0, delay = 0 }: { x: number; s?: number; tone?: 0 | 1; delay?: number }) {
  return (
    <g transform={`translate(${x} 0) scale(${s})`}>
      <g className="w-sway" style={swayStyle(delay, 11)}>
        <ellipse cx="0" cy="0" rx="26" ry="5" fill="url(#w-shadow-grad)" />
        <circle cx="-12" cy="-10" r="12" fill={tone ? 'var(--foliage-mid)' : 'var(--foliage)'} />
        <circle cx="10" cy="-11" r="13" fill="var(--foliage-dark)" />
        <circle cx="0" cy="-18" r="12" fill={tone ? 'var(--foliage)' : 'var(--foliage-mid)'} />
        <circle cx="-3" cy="-20" r="5" fill="var(--foliage-hi)" opacity="0.28" />
      </g>
    </g>
  );
}

export function PotPlant({ x, s = 1, flower = false }: { x: number; s?: number; flower?: boolean }) {
  return (
    <g transform={`translate(${x} 0) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="16" ry="4" fill="url(#w-shadow-grad)" />
      <path d="M-12 -20 H12 L9 0 Q0 4 -9 0Z" fill="var(--pot)" />
      <path d="M-13 -22 H13 V-16 H-13Z" fill="var(--pot-light)" />
      <path d="M-10 -18 H10 L8 -2 Q0 1 -8 -2Z" fill="var(--pot-dark)" opacity="0.35" />
      <path d="M0 -22 C-3 -38 -18 -44 -24 -40 C-18 -30 -8 -26 0 -24Z" fill="var(--foliage)" />
      <path d="M0 -22 C3 -38 18 -44 24 -40 C18 -30 8 -26 0 -24Z" fill="var(--foliage-mid)" />
      <path d="M0 -22 C0 -38 -4 -50 2 -58 C8 -48 7 -32 2 -23Z" fill="var(--foliage-dark)" />
      {flower && (
        <>
          <circle cx="-15" cy="-40" r="3.4" fill="var(--flower-a)" />
          <circle cx="18" cy="-43" r="3" fill="var(--flower-b)" />
          <circle cx="4" cy="-56" r="3.2" fill="var(--flower-c)" />
        </>
      )}
    </g>
  );
}

export function GrassTuft({ x, y = 0, s = 1, delay = 0 }: { x: number; y?: number; s?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="w-grass-sway" style={swayStyle(delay, 5.6)}>
        <path d="M0 0 Q-2 -10 -7 -16 M4 0 Q4 -12 10 -19 M-2 0 Q-6 -8 -12 -11 M6 0 Q10 -8 15 -10" stroke="var(--foliage-dark)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
      </g>
    </g>
  );
}

/* ── Small props ─────────────────────────────────────────── */

export function Jar({ x, s = 1, tall = false }: { x: number; s?: number; tall?: boolean }) {
  return (
    <g transform={`translate(${x} 0) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="10" ry="3" fill="url(#w-shadow-grad)" />
      <path d={tall ? 'M-7 -20 Q-13 -8 0 0 Q13 -8 7 -20Z' : 'M-9 -13 Q-13 -3 0 0 Q13 -3 9 -13Z'} fill="var(--pot)" />
      <path d="M-7 -20 H7 V-17 H-7Z" fill="var(--pot-light)" />
      <path d="M-5 -16 Q0 -12 5 -16" stroke="var(--pot-dark)" strokeWidth="1.4" fill="none" opacity="0.45" />
    </g>
  );
}

export function Crate({ x, s = 1, y = 0 }: { x: number; s?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="14" ry="3" fill="url(#w-shadow-grad)" />
      <rect x="-13" y="-19" width="26" height="19" rx="2" fill="var(--wood)" />
      <rect x="-13" y="-19" width="26" height="4" rx="1.5" fill="var(--wood-light)" opacity="0.65" />
      <path d="M-12 -17 L12 -2 M12 -17 L-12 -2" stroke="var(--wood-light)" strokeWidth="1.4" opacity="0.4" />
    </g>
  );
}

export function Bird({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) {
  return (
    <path
      className="w-bird"
      transform={`translate(${x} ${y}) scale(${s})`}
      style={{ '--bird-delay': `${delay}s` } as Vars}
      d="M-9 0 Q-5 -4 -2 0 Q1 -4 5 0 Q2 -1 0 1 Q-3 -1 -9 0Z"
      fill="var(--far-silhouette)"
      opacity="0.55"
    />
  );
}
