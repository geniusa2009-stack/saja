/**
 * World scenery — painterly-stylised SVG. Colours come from CSS variables set
 * per sky phase (Fajr · Duha · Maghrib · Layl), so the same art is lit by the
 * real time of day. Places not yet learned "sleep" in blue night.
 */
import { memo, type ReactNode } from 'react';
import type { LocationId } from '@/domain/types';
import { HORIZON_Y, PATH_D, WORLD_H, WORLD_W, pointAtT, seeded } from './geometry';

/* ── shared bits ─────────────────────────────────────────── */

function Lantern({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className="w-lantern">
      <circle r="26" className="w-glow" />
      <path d="M0 -22 V-14" stroke="var(--metal)" strokeWidth="2" />
      <path d="M-8 -14 H8 L6 8 Q0 13 -6 8 Z" className="w-lamp" />
      <path d="M-7 -14 Q0 -22 7 -14" fill="var(--metal)" />
    </g>
  );
}

function LampPost({ x, h = 120 }: { x: number; h?: number }) {
  return (
    <g>
      <rect x={x - 2.5} y={-h} width="5" height={h} rx="2" fill="var(--metal)" />
      <Lantern x={x} y={-h + 4} />
    </g>
  );
}

function ArchWindow({ x, y, w = 26, h = 44, lit = true }: { x: number; y: number; w?: number; h?: number; lit?: boolean }) {
  const r = w / 2;
  return <path d={`M${x} ${y + h} V${y + r} Q${x} ${y} ${x + r} ${y - r * 0.35} Q${x + w} ${y} ${x + w} ${y + r} V${y + h} Z`} className={lit ? 'w-window' : 'w-window w-window--off'} />;
}

function Palm({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x} 0) scale(${s})`} className="w-sway">
      <path d="M0 0 Q-6 -80 6 -170" stroke="var(--trunk)" strokeWidth="10" fill="none" strokeLinecap="round" />
      {[-70, -30, 10, 50, 95, 140].map((a, i) => (
        <path key={i} d="M6 -170 q40 -18 78 8 q-40 -6 -78 -2Z" fill={i % 2 ? 'var(--foliage)' : 'var(--foliage-dark)'} transform={`rotate(${a} 6 -170)`} />
      ))}
    </g>
  );
}

function RoundTree({ x, s = 1, tone = 0 }: { x: number; s?: number; tone?: number }) {
  return (
    <g transform={`translate(${x} 0) scale(${s})`} className="w-sway">
      <rect x="-6" y="-70" width="12" height="70" rx="5" fill="var(--trunk)" />
      <circle cx="0" cy="-110" r="56" fill={tone ? 'var(--foliage-dark)' : 'var(--foliage)'} />
      <circle cx="-34" cy="-86" r="36" fill="var(--foliage-dark)" />
      <circle cx="30" cy="-84" r="38" fill={tone ? 'var(--foliage)' : 'var(--foliage-dark)'} />
      <circle cx="-14" cy="-134" r="26" fill="var(--foliage-hi)" opacity="0.5" />
    </g>
  );
}

/* ── Location art (origin = ground centre) ───────────────── */

const ART: Record<LocationId, () => ReactNode> = {
  village: () => (
    <>
      <Palm x={-250} s={1.05} />
      <g>
        <rect x="-170" y="-150" width="120" height="150" rx="4" fill="var(--wall)" />
        <rect x="-176" y="-158" width="132" height="12" rx="3" fill="var(--wall-shade)" />
        <ArchWindow x={-150} y={-120} />
        <path d="M-96 0 V-52 Q-96 -76 -76 -80 Q-56 -76 -56 -52 V0Z" fill="var(--door)" />
      </g>
      <g>
        <rect x="-40" y="-220" width="110" height="220" rx="4" fill="var(--wall-shade)" />
        <path d="M-10 -220 Q15 -275 40 -220Z" fill="var(--roof)" />
        <ArchWindow x={-24} y={-190} />
        <ArchWindow x={28} y={-190} />
        <ArchWindow x={-24} y={-110} w={78} h={50} />
        <path d="M5 0 V-40 Q5 -60 15 -62 Q25 -60 25 -40 V0Z" fill="var(--door)" />
      </g>
      <g>
        <rect x="80" y="-130" width="100" height="130" rx="4" fill="var(--wall)" />
        <rect x="74" y="-138" width="112" height="12" rx="3" fill="var(--wall-shade)" />
        <ArchWindow x={100} y={-104} w={22} h={36} lit={false} />
        <ArchWindow x={140} y={-104} w={22} h={36} />
      </g>
      <g transform="translate(240 0)">
        <ellipse cx="0" cy="-10" rx="36" ry="12" fill="var(--wall-shade)" />
        <rect x="-36" y="-40" width="72" height="30" fill="var(--wall)" />
        <ellipse cx="0" cy="-40" rx="36" ry="10" fill="var(--wall-shade)" />
        <path d="M-30 -40 V-96 M30 -40 V-96 M-36 -96 H36" stroke="var(--trunk)" strokeWidth="5" />
      </g>
      <LampPost x={-40} h={110} />
      <LampPost x={200} h={100} />
    </>
  ),
  mosque: () => (
    <>
      <rect x="-300" y="-130" width="600" height="130" fill="var(--wall-shade)" />
      {[-250, -170, -90, 50, 130, 210].map((x) => (
        <path key={x} d={`M${x} 0 V-70 Q${x} -104 ${x + 20} -112 Q${x + 40} -104 ${x + 40} -70 V0Z`} className="w-arch" />
      ))}
      <rect x="-306" y="-140" width="612" height="14" rx="3" fill="var(--wall)" />
      <g>
        <rect x="-110" y="-250" width="220" height="250" fill="var(--wall)" />
        <path d="M-96 -250 Q-96 -400 0 -420 Q96 -400 96 -250Z" fill="var(--dome)" />
        <path d="M-60 -262 Q-56 -370 0 -392" stroke="var(--dome-hi)" strokeWidth="6" fill="none" opacity="0.5" strokeLinecap="round" />
        <path d="M0 -420 V-448" stroke="var(--metal)" strokeWidth="4" />
        <circle cx="0" cy="-452" r="6" fill="var(--gold)" />
        <path d="M-40 0 V-110 Q-40 -160 0 -170 Q40 -160 40 -110 V0Z" fill="var(--door)" />
        <path d="M-30 0 V-106 Q-30 -150 0 -158 Q30 -150 30 -106 V0Z" className="w-window" opacity="0.8" />
        <ArchWindow x={-92} y={-210} w={30} h={60} />
        <ArchWindow x={62} y={-210} w={30} h={60} />
      </g>
      <g transform="translate(-205 -8) scale(0.72)">
        <ellipse cx="0" cy="0" rx="120" ry="26" fill="var(--wall-shade)" />
        <ellipse cx="0" cy="-6" rx="104" ry="18" className="w-water" />
        <rect x="-10" y="-50" width="20" height="44" rx="4" fill="var(--wall)" />
        <path className="w-spout" d="M0 -52 Q-30 -80 -56 -12 M0 -52 Q30 -80 56 -12" stroke="var(--water-hi)" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <Lantern x={-230} y={-160} />
      <Lantern x={230} y={-160} />
    </>
  ),
  garden: () => (
    <>
      <RoundTree x={-230} s={1.1} />
      <RoundTree x={200} s={1.25} tone={1} />
      <RoundTree x={330} s={0.8} />
      <g>
        <path d="M-70 0 V-150 C-70 -205 -38 -230 0 -262 C38 -230 70 -205 70 -150 V0" fill="none" stroke="var(--gold)" strokeWidth="7" opacity="0.85" />
        <path d="M-58 0 V-146 C-58 -196 -30 -218 0 -244 C30 -218 58 -196 58 -146 V0" fill="none" stroke="var(--foliage)" strokeWidth="10" strokeDasharray="14 10" />
      </g>
      {Array.from({ length: 18 }, (_, i) => {
        const r = seeded(i + 7);
        const x = -320 + i * 38 + r() * 14;
        return <circle key={i} cx={x} cy={-6 - r() * 10} r={4 + r() * 3} fill={i % 3 === 0 ? 'var(--flower-a)' : i % 3 === 1 ? 'var(--flower-b)' : 'var(--gold)'} />;
      })}
    </>
  ),
  library: () => (
    <>
      <rect x="-170" y="-400" width="340" height="400" fill="var(--wall)" />
      <rect x="-182" y="-412" width="364" height="18" rx="4" fill="var(--wall-shade)" />
      {[-120, 0, 120].map((x) => (
        <g key={x}>
          <path d={`M${x - 26} -412 Q${x - 26} -470 ${x} -482 Q${x + 26} -470 ${x + 26} -412Z`} fill="var(--dome)" />
        </g>
      ))}
      {[-130, -60, 30, 100].map((x) =>
        [-360, -250].map((y) => <ArchWindow key={`${x}${y}`} x={x} y={y} w={30} h={64} />),
      )}
      <path d="M-56 0 V-110 Q-56 -170 0 -186 Q56 -170 56 -110 V0Z" fill="var(--door)" />
      <path d="M-44 0 V-106 Q-44 -156 0 -170 Q44 -156 44 -106 V0Z" className="w-window" />
      <g className="w-pages">
        {[
          [-230, -300],
          [210, -340],
          [-200, -180],
          [240, -200],
        ].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y} l14 -6 l14 6 l-14 6Z`} fill="var(--gold-soft)" style={{ animationDelay: `${i * 0.9}s` }} />
        ))}
      </g>
      <LampPost x={-110} h={96} />
      <LampPost x={110} h={96} />
    </>
  ),
  house: () => (
    <>
      <rect x="-190" y="-40" width="380" height="40" fill="var(--wall-shade)" />
      <rect x="-170" y="-260" width="340" height="220" fill="var(--wall)" />
      <rect x="-186" y="-276" width="372" height="22" rx="4" fill="var(--wall-shade)" />
      {[-140, -70, 0, 70, 140].map((x) => (
        <g key={x}>
          <rect x={x - 11} y="-250" width="22" height="210" rx="4" fill="var(--pillar)" />
          <rect x={x - 15} y="-254" width="30" height="10" rx="3" fill="var(--wall-shade)" />
        </g>
      ))}
      {[-105, -35, 35, 105].map((x) => (
        <path key={x} d={`M${x - 24} -40 V-150 Q${x - 24} -200 ${x} -210 Q${x + 24} -200 ${x + 24} -150 V-40Z`} className="w-arch" />
      ))}
      <Lantern x={-105} y={-150} s={0.8} />
      <Lantern x={105} y={-150} s={0.8} />
      <RoundTree x={260} s={0.9} tone={1} />
    </>
  ),
  market: () => (
    <>
      {[
        [-230, 'var(--awning-a)'],
        [-40, 'var(--awning-b)'],
        [150, 'var(--awning-c)'],
      ].map(([x, c]) => (
        <g key={x as number} transform={`translate(${x} 0)`}>
          <rect x="-4" y="-170" width="8" height="170" fill="var(--trunk)" />
          <rect x="136" y="-170" width="8" height="170" fill="var(--trunk)" />
          <path d="M-20 -170 L70 -220 L160 -170Z" fill={c as string} />
          <path d="M-20 -170 q15 18 30 0 q15 18 30 0 q15 18 30 0 q15 18 30 0 q15 18 30 0 q15 18 30 0" fill={c as string} />
          <rect x="0" y="-80" width="140" height="16" rx="4" fill="var(--wall-shade)" />
          <circle cx="30" cy="-92" r="12" fill="var(--flower-b)" />
          <circle cx="58" cy="-90" r="10" fill="var(--gold)" />
          <circle cx="92" cy="-92" r="12" fill="var(--flower-a)" />
          <rect x="112" y="-104" width="18" height="24" rx="4" fill="var(--wall)" />
        </g>
      ))}
      <path d="M-270 -250 Q-40 -170 330 -250" stroke="var(--metal)" strokeWidth="2" fill="none" />
      {[-220, -140, -60, 20, 100, 180, 260].map((x, i) => {
        const y = -250 + 80 * Math.sin(((x + 270) / 600) * Math.PI) * 0.55;
        return <Lantern key={x} x={x} y={y + 10} s={0.7 + (i % 2) * 0.1} />;
      })}
    </>
  ),
  reflection: () => (
    <>
      <g transform="translate(0 -18) scale(0.85 0.7)">
        <ellipse cx="0" cy="0" rx="260" ry="46" fill="var(--wall-shade)" opacity="0.6" />
        <ellipse cx="0" cy="-4" rx="240" ry="36" className="w-water" />
        <ellipse cx="-60" cy="-8" rx="70" ry="6" fill="var(--water-hi)" opacity="0.35" className="w-shimmer" />
        <path d="M0 -40 l10 18 l20 -4 l-8 18 l14 14 l-20 2 l-6 20 l-10 -16 l-10 16 l-6 -20 l-20 -2 l14 -14 l-8 -18 l20 4Z" transform="translate(0 30) scale(0.9 0.3)" fill="none" stroke="var(--gold)" strokeWidth="3" opacity="0.6" />
      </g>
      <g transform="translate(-200 0)" className="w-sway">
        <path d="M0 0 Q-4 -90 10 -180" stroke="var(--trunk)" strokeWidth="12" fill="none" strokeLinecap="round" />
        {[-60, -30, 0, 30, 60].map((dx, i) => (
          <path key={i} d={`M10 -180 Q${10 + dx} -170 ${10 + dx * 1.6} -60`} stroke="var(--foliage)" strokeWidth={10 - Math.abs(dx) / 12} fill="none" strokeLinecap="round" opacity="0.9" />
        ))}
        <circle cx="10" cy="-186" r="46" fill="var(--foliage-dark)" />
      </g>
      <g transform="translate(180 -6)">
        <rect x="-50" y="-30" width="100" height="10" rx="4" fill="var(--trunk)" />
        <rect x="-44" y="-20" width="8" height="20" fill="var(--trunk)" />
        <rect x="36" y="-20" width="8" height="20" fill="var(--trunk)" />
      </g>
      {[-300, -250, 250, 300].map((x, i) => (
        <ellipse key={x} cx={x} cy={i % 2 ? -4 : -8} rx="18" ry="6" fill="var(--wall)" opacity="0.8" />
      ))}
    </>
  ),
  desert: () => (
    <>
      <path d="M-360 0 Q-200 -110 -40 -30 Q120 -140 360 0Z" fill="var(--sand)" />
      <path d="M-360 0 Q-200 -70 -60 -10 Q100 -80 360 0Z" fill="var(--sand-shade)" />
      <g transform="translate(-130 -30)">
        <path d="M-90 30 L0 -110 L90 30Z" fill="var(--awning-a)" />
        <path d="M0 -110 L-24 30 H24Z" fill="var(--door)" />
        <path d="M0 -110 V-130" stroke="var(--metal)" strokeWidth="3" />
      </g>
      <g transform="translate(120 -40)">
        <path d="M-70 40 L0 -80 L70 40Z" fill="var(--awning-c)" />
        <path d="M0 -80 L-18 40 H18Z" fill="var(--door)" />
      </g>
      <Palm x={-300} s={1.1} />
      <Palm x={280} s={0.9} />
      <Lantern x={20} y={-60} />
    </>
  ),
  mountain: () => (
    <>
      <path d="M-420 0 L-140 -470 Q-80 -540 -20 -520 L40 -560 Q100 -590 150 -520 L420 0Z" fill="var(--hill-far)" />
      <path d="M-420 0 L-140 -470 Q-100 -500 -60 -470 L-200 0Z" fill="var(--wall-shade)" opacity="0.35" />
      <path d="M-160 -40 L60 -140 L-80 -250 L90 -360 L20 -470" stroke="var(--path-soft)" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="2 14" />
      <g transform="translate(40 -560)">
        <rect x="-60" y="-10" width="120" height="50" fill="var(--wall)" />
        <path d="M-60 -10 Q-60 -90 0 -96 Q60 -90 60 -10Z" fill="var(--dome)" />
        <path d="M-6 -94 L6 -94 L8 -12 L-8 -12Z" className="w-window" />
        <ArchWindow x={-44} y={4} w={18} h={28} />
        <ArchWindow x={26} y={4} w={18} h={28} />
      </g>
    </>
  ),
};

/* ── Layers ──────────────────────────────────────────────── */

export const FarLayer = memo(function FarLayer() {
  const r = seeded(11);
  let d = `M0 ${HORIZON_Y}`;
  for (let x = 0; x <= WORLD_W; x += 160) d += ` L${x} ${HORIZON_Y - 70 - r() * 150}`;
  d += ` L${WORLD_W} ${HORIZON_Y + 40} L0 ${HORIZON_Y + 40}Z`;
  return (
    <svg className="w-layer" viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="var(--hill-far)" opacity="0.75" strokeLinejoin="round" />
    </svg>
  );
});

export const MidLayer = memo(function MidLayer() {
  const r = seeded(29);
  let d = `M0 ${HORIZON_Y + 60}`;
  for (let x = 0; x <= WORLD_W; x += 400) {
    const cx = x + 200;
    d += ` Q${cx} ${HORIZON_Y - 20 - r() * 70} ${x + 400} ${HORIZON_Y + 40 + r() * 20}`;
  }
  d += ` L${WORLD_W} ${WORLD_H} L0 ${WORLD_H}Z`;
  return (
    <svg className="w-layer" viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="var(--hill-mid)" />
    </svg>
  );
});

export interface PlacedLocation {
  id: LocationId;
  t: number;
  asleep: boolean;
  justWoke?: boolean;
}

export const GroundLayer = memo(function GroundLayer({ places, litT, mirror }: { places: PlacedLocation[]; litT: number; mirror: boolean }) {
  const r = seeded(5);
  const grass = Array.from({ length: 90 }, (_, i) => ({ x: i * 45 + r() * 30, h: 8 + r() * 16, y: 860 + r() * 120 }));
  return (
    <svg className="w-layer w-ground" viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="w-ground-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ground-top)" />
          <stop offset="1" stopColor="var(--ground)" />
        </linearGradient>
        <radialGradient id="w-veil" cx="0.5" cy="0.6" r="0.6">
          <stop offset="0" stopColor="#0b1a3f" stopOpacity="0.7" />
          <stop offset="1" stopColor="#0b1a3f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform={mirror ? `translate(${WORLD_W} 0) scale(-1 1)` : undefined}>
        <path d={`M0 ${HORIZON_Y + 120} Q${WORLD_W * 0.25} ${HORIZON_Y + 80} ${WORLD_W * 0.5} ${HORIZON_Y + 118} T${WORLD_W} ${HORIZON_Y + 100} V${WORLD_H} H0Z`} fill="url(#w-ground-g)" />

        {places.map((p) => {
          const pt = pointAtT(p.t);
          const Art = ART[p.id];
          return (
            <g key={p.id} className={`w-loc ${p.asleep ? 'w-loc--asleep' : ''} ${p.justWoke ? 'w-loc--waking' : ''}`} transform={`translate(${pt.x} ${pt.y - 34})`}>
              <g className="w-loc-art">
                <Art />
              </g>
              <ellipse className="w-veil" cx="0" cy="-160" rx="420" ry="360" fill="url(#w-veil)" />
            </g>
          );
        })}

        {/* The road: a soft band, and the part you've unlocked lit gold from your feet to the gate. */}
        <path d={PATH_D} stroke="var(--path-soft)" strokeWidth="46" fill="none" strokeLinecap="round" />
        <path d={PATH_D} stroke="var(--path)" strokeWidth="30" fill="none" strokeLinecap="round" opacity="0.9" />
        <path className="w-path-lit" d={PATH_D} pathLength={1} stroke="var(--path-lit)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${litT} 1`} />

        {grass.map((g, i) => (
          <path key={i} d={`M${g.x} ${g.y} q3 ${-g.h} 6 0 M${g.x + 5} ${g.y} q4 ${-g.h * 1.3} 8 0`} stroke="var(--foliage-dark)" strokeWidth="3" fill="none" opacity="0.55" />
        ))}
      </g>
    </svg>
  );
});
