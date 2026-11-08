/**
 * World scenery — painterly 2.5D staging.
 *
 * Three camera-speed layers (far, mid, ground) plus in-layer depth planes give
 * the journey parallax without a render loop. Colours come from CSS variables
 * set per sky phase (Fajr · Duha · Maghrib · Layl), so the same art is lit by
 * the real time of day. Places not yet learned sleep in blue night.
 */
import { memo, type CSSProperties, type ReactNode } from 'react';
import type { LocationId } from '@/domain/types';
import { HORIZON_Y, PATH_D, WORLD_H, WORLD_W, pointAtT, seeded } from './geometry';
import { VillageArt } from './scenery/village';
import { MosqueArt } from './scenery/mosque';
import { DesertArt, GardenArt, HouseArt, LibraryArt, MarketArt, MountainArt, ReflectionArt } from './scenery/landmarks';
import { GrassTuft, LampPost, Lantern, Palm } from './scenery/primitives';
import './scenery.css';

/* ── Deterministic terrain helpers ───────────────────────── */

function ridgeD(seed: number, baseY: number, amp: number, step: number) {
  const r = seeded(seed);
  let d = `M0 ${baseY}`;
  for (let x = 0; x < WORLD_W; x += step) {
    const peak = baseY - amp * (0.38 + r() * 0.62);
    const end = baseY + (r() - 0.5) * amp * 0.14;
    d += ` Q${x + step * 0.52} ${peak.toFixed(1)} ${x + step} ${end.toFixed(1)}`;
  }
  return `${d} L${WORLD_W} ${WORLD_H} L0 ${WORLD_H}Z`;
}

const FAR_RIDGE_1 = ridgeD(11, 628, 176, 420);
const FAR_RIDGE_2 = ridgeD(47, 682, 104, 300);
const MID_RIDGE = ridgeD(83, 714, 86, 250);
const MID_RIDGE_2 = ridgeD(131, 752, 48, 190);

const FAR_TOWNS = [
  [360, 626, 0.8],
  [920, 636, 0.62],
  [1480, 620, 0.9],
  [2600, 632, 0.68],
  [3320, 618, 0.82],
  [4150, 634, 0.7],
  [4920, 624, 0.9],
  [5620, 634, 0.62],
] as const;

const MID_TREES = Array.from({ length: 26 }, (_, i) => {
  const r = seeded(i + 301);
  return { x: 70 + i * 228 + r() * 70, s: 0.5 + r() * 0.45, kind: r() > 0.62 ? 'round' : 'palm' };
});

const MID_LIGHTS = Array.from({ length: 34 }, (_, i) => {
  const r = seeded(i + 601);
  return { x: 80 + i * 174 + r() * 100, y: 690 + r() * 48, delay: r() * 4, r: 0.9 + r() * 1.3 };
});

const GROUND_PATCHES = Array.from({ length: 46 }, (_, i) => {
  const r = seeded(i + 901);
  return { x: r() * WORLD_W, y: 748 + r() * 250, rx: 22 + r() * 90, ry: 4 + r() * 12, o: 0.04 + r() * 0.08 };
});

const GROUND_BUSHES = Array.from({ length: 30 }, (_, i) => {
  const r = seeded(i + 1201);
  return { x: 40 + i * 202 + r() * 60, y: 726 + r() * 16, s: 0.35 + r() * 0.38, tone: r() > 0.5 };
});

const PATH_STONES = Array.from({ length: 84 }, (_, i) => {
  const r = seeded(i + 1501);
  const t = (i + 0.5) / 84;
  const p = pointAtT(t);
  return { x: p.x + (r() - 0.5) * 26, y: p.y + (r() - 0.5) * 22, rx: 2.5 + r() * 5, ry: 1.2 + r() * 2.2, rot: r() * 180, o: 0.16 + r() * 0.26 };
});

const FOREGROUND_GRASS = Array.from({ length: 54 }, (_, i) => {
  const r = seeded(i + 1801);
  return { x: r() * WORLD_W, y: 902 + r() * 116, s: 0.7 + r() * 0.95, delay: r() * 5 };
});

const FLOWERS = Array.from({ length: 28 }, (_, i) => {
  const r = seeded(i + 2101);
  return { x: r() * WORLD_W, y: 872 + r() * 110, s: 0.6 + r() * 0.7, tone: i % 4, delay: r() * 4 };
});

const MOTES = Array.from({ length: 18 }, (_, i) => {
  const r = seeded(i + 2401);
  return { x: r() * WORLD_W, y: 720 + r() * 170, delay: r() * 7, size: 1.2 + r() * 1.8 };
});

const LOC_HALO: Record<LocationId, number> = {
  village: 308,
  mosque: 372,
  garden: 318,
  library: 270,
  house: 296,
  market: 338,
  reflection: 330,
  desert: 370,
  mountain: 440,
};

/* ── Far layer: atmosphere, mountains, distant towns ─────── */

export const FarLayer = memo(function FarLayer() {
  return (
    <svg className="w-layer w-layer--far" viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="w-sky-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--haze)" stopOpacity="0" />
          <stop offset="0.68" stopColor="var(--haze)" stopOpacity="0.1" />
          <stop offset="1" stopColor="var(--haze)" stopOpacity="0.34" />
        </linearGradient>
        <linearGradient id="w-far-1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--hill-far)" />
          <stop offset="1" stopColor="var(--hill-far)" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="w-far-2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--hill-mid)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--hill-mid)" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="w-cloud-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--cloud)" stopOpacity="0" />
          <stop offset="0.3" stopColor="var(--cloud)" stopOpacity="0.18" />
          <stop offset="0.68" stopColor="var(--cloud)" stopOpacity="0.12" />
          <stop offset="1" stopColor="var(--cloud)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width={WORLD_W} height={HORIZON_Y + 100} fill="url(#w-sky-haze)" />

      <g className="w-clouds">
        {[
          [420, 214, 300, 34, 0],
          [1180, 300, 230, 22, 1],
          [1920, 168, 380, 40, 2],
          [2920, 262, 270, 26, 1],
          [3820, 200, 420, 42, 0],
          [4820, 318, 250, 24, 2],
          [5620, 146, 300, 32, 1],
        ].map(([cx, cy, rx, ry, k], i) => (
          <g key={i} className={`w-cloud w-cloud--${k}`} style={{ '--cloud-delay': `${i * 1.7}s` } as CSSProperties}>
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#w-cloud-g)" />
            <ellipse cx={cx + rx * 0.22} cy={cy - ry * 0.55} rx={rx * 0.55} ry={ry * 0.78} fill="url(#w-cloud-g)" opacity="0.75" />
            <ellipse cx={cx - rx * 0.34} cy={cy + ry * 0.4} rx={rx * 0.5} ry={ry * 0.6} fill="url(#w-cloud-g)" opacity="0.5" />
          </g>
        ))}
      </g>

      <path d={FAR_RIDGE_1} fill="url(#w-far-1)" opacity="0.72" />
      <path d={FAR_RIDGE_2} fill="url(#w-far-2)" opacity="0.86" />

      <g className="w-far-towns" fill="var(--far-silhouette)">
        {FAR_TOWNS.map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`} opacity="0.58">
            <rect x="-30" y="-24" width="60" height="24" fill="var(--far-silhouette)" />
            <path d="M-34 -24 Q-34 -48 0 -54 Q34 -48 34 -24Z" fill="var(--far-silhouette)" />
            <rect x="-16" y="-28" width="8" height="10" fill="var(--window)" opacity="0.5" />
            <rect x="8" y="-30" width="6" height="12" fill="var(--window)" opacity="0.35" />
            <rect x="-2" y="-70" width="5" height="16" fill="var(--far-silhouette)" />
            <path d="M-4 -70 Q-4 -78 0 -80 Q4 -78 4 -70Z" fill="var(--far-silhouette)" />
            <path d="M-22 -24 Q-22 -38 -8 -42 Q6 -38 6 -24Z" fill="var(--far-silhouette)" opacity="0.8" />
          </g>
        ))}
      </g>

      <g className="w-sky-birds" fill="var(--far-silhouette)" opacity="0.38">
        {[700, 1480, 2380, 3560, 4680].map((x, i) => (
          <path key={x} className="w-bird" style={{ '--bird-delay': `${i * 1.3}s` } as CSSProperties} transform={`translate(${x} ${180 + (i % 3) * 42})`} d="M-8 0 Q-4 -4 -1 0 Q2 -4 5 0 Q2 -1 0 1 Q-3 -1 -8 0Z" />
        ))}
      </g>
    </svg>
  );
});

/* ── Mid layer: rolling hills, tree line, tiny village lights ── */

export const MidLayer = memo(function MidLayer() {
  return (
    <svg className="w-layer w-layer--mid" viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="w-mid-hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--hill-mid)" />
          <stop offset="1" stopColor="var(--mid-tree)" stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id="w-mist-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--mist)" stopOpacity="0" />
          <stop offset="0.46" stopColor="var(--mist)" stopOpacity="0.8" />
          <stop offset="1" stopColor="var(--mist)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="w-mid-light-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--lamp)" stopOpacity="0.8" />
          <stop offset="1" stopColor="var(--lamp)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <path d={MID_RIDGE} fill="url(#w-mid-hill)" />
      <path d={MID_RIDGE_2} fill="var(--mid-tree)" opacity="0.55" />

      <g className="w-mid-trees">
        {MID_TREES.map((t, i) =>
          t.kind === 'palm' ? (
            <g key={i} transform={`translate(${t.x} 704) scale(${t.s})`} fill="var(--mid-tree)" opacity="0.72">
              <path d="M0 0 Q-3 -26 2 -52" stroke="var(--mid-tree)" strokeWidth="3.4" fill="none" />
              {[-150, -112, -74, -36, 4].map((a) => (
                <path key={a} transform={`rotate(${a} 2 -52)`} d="M2 -52 Q18 -60 34 -52 Q20 -48 2 -50Z" />
              ))}
            </g>
          ) : (
            <g key={i} transform={`translate(${t.x} 708) scale(${t.s})`} opacity="0.68">
              <rect x="-2" y="-24" width="4" height="24" fill="var(--mid-tree)" />
              <circle cx="0" cy="-34" r="20" fill="var(--mid-tree)" />
              <circle cx="-12" cy="-26" r="12" fill="var(--mid-tree)" />
              <circle cx="13" cy="-27" r="13" fill="var(--mid-tree)" />
            </g>
          ),
        )}
      </g>

      <g className="w-mid-lights">
        {MID_LIGHTS.map((l, i) => (
          <g key={i} className="w-mid-light" style={{ '--light-delay': `${l.delay}s` } as CSSProperties}>
            <circle cx={l.x} cy={l.y} r={l.r * 4} fill="url(#w-mid-light-glow)" opacity="0.55" />
            <circle cx={l.x} cy={l.y} r={l.r} fill="var(--lamp)" />
          </g>
        ))}
      </g>

      <rect x="0" y={HORIZON_Y - 58} width={WORLD_W} height="240" fill="url(#w-mist-g)" className="w-mist" />
    </svg>
  );
});

/* ── Ground layer: the playable band ─────────────────────── */

export interface PlacedLocation {
  id: LocationId;
  t: number;
  asleep: boolean;
  justWoke?: boolean;
}

function artFor(id: LocationId): ReactNode {
  switch (id) {
    case 'village':
      return <VillageArt />;
    case 'mosque':
      return <MosqueArt />;
    case 'garden':
      return <GardenArt />;
    case 'library':
      return <LibraryArt />;
    case 'house':
      return <HouseArt />;
    case 'market':
      return <MarketArt />;
    case 'reflection':
      return <ReflectionArt />;
    case 'desert':
      return <DesertArt />;
    case 'mountain':
      return <MountainArt />;
  }
}

export const GroundLayer = memo(function GroundLayer({ places, litT, mirror }: { places: PlacedLocation[]; litT: number; mirror: boolean }) {
  return (
    <svg className="w-layer w-ground" viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="w-ground-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ground-top)" />
          <stop offset="0.42" stopColor="var(--ground)" />
          <stop offset="1" stopColor="var(--ground-deep)" />
        </linearGradient>
        <radialGradient id="w-glow-grad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--lamp)" stopOpacity="0.58" />
          <stop offset="0.42" stopColor="var(--lamp)" stopOpacity="0.2" />
          <stop offset="1" stopColor="var(--lamp)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="w-window-glow-grad" cx="0.5" cy="0.55" r="0.5">
          <stop offset="0" stopColor="var(--window)" stopOpacity="0.4" />
          <stop offset="0.55" stopColor="var(--window)" stopOpacity="0.12" />
          <stop offset="1" stopColor="var(--window)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="w-shadow-grad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--shadow-color)" stopOpacity="0.52" />
          <stop offset="0.58" stopColor="var(--shadow-color)" stopOpacity="0.26" />
          <stop offset="1" stopColor="var(--shadow-color)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="w-loc-halo" cx="0.5" cy="0.55" r="0.5">
          <stop offset="0" stopColor="var(--loc-glow)" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="var(--loc-glow)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--loc-glow)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="w-veil" cx="0.5" cy="0.6" r="0.6">
          <stop offset="0" stopColor="#0b1a3f" stopOpacity="0.68" />
          <stop offset="1" stopColor="#0b1a3f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="w-lamp-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--flame)" />
          <stop offset="1" stopColor="var(--lamp)" />
        </linearGradient>
        <linearGradient id="w-trunk-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--trunk-light)" />
          <stop offset="0.55" stopColor="var(--trunk)" />
          <stop offset="1" stopColor="var(--trunk)" />
        </linearGradient>
      </defs>

      <g transform={mirror ? `translate(${WORLD_W} 0) scale(-1 1)` : undefined}>
        <path
          d={`M0 ${HORIZON_Y + 96} Q${WORLD_W * 0.18} ${HORIZON_Y + 68} ${WORLD_W * 0.36} ${HORIZON_Y + 96} T${WORLD_W * 0.72} ${HORIZON_Y + 92} T${WORLD_W} ${HORIZON_Y + 88} V${WORLD_H} H0Z`}
          fill="url(#w-ground-g)"
        />
        <path
          d={`M0 ${HORIZON_Y + 96} Q${WORLD_W * 0.18} ${HORIZON_Y + 68} ${WORLD_W * 0.36} ${HORIZON_Y + 96} T${WORLD_W * 0.72} ${HORIZON_Y + 92} T${WORLD_W} ${HORIZON_Y + 88}`}
          stroke="var(--ground-top)"
          strokeWidth="3"
          fill="none"
          opacity="0.5"
        />

        {GROUND_PATCHES.map((p, i) => (
          <ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill={i % 3 === 0 ? 'var(--ground-top)' : 'var(--ground-deep)'} opacity={p.o} />
        ))}

        <g className="w-ground-bushes">
          {GROUND_BUSHES.map((b, i) => (
            <g key={i} transform={`translate(${b.x} ${b.y}) scale(${b.s})`} opacity="0.5">
              <ellipse cx="0" cy="0" rx="28" ry="6" fill="var(--shadow-color)" opacity="0.35" />
              <circle cx="-11" cy="-10" r="12" fill={b.tone ? 'var(--foliage-mid)' : 'var(--foliage-dark)'} />
              <circle cx="10" cy="-11" r="13" fill="var(--foliage-dark)" />
              <circle cx="0" cy="-18" r="12" fill="var(--foliage-mid)" />
            </g>
          ))}
        </g>

        <g className="w-ground-flora">
          {FOREGROUND_GRASS.map((g, i) => (
            <GrassTuft key={i} x={g.x} y={g.y} s={g.s} delay={g.delay} />
          ))}
          {FLOWERS.map((f, i) => (
            <g key={i} transform={`translate(${f.x} ${f.y}) scale(${f.s})`} className="w-flower" style={{ '--flower-delay': `${f.delay}s` } as CSSProperties}>
              <path d="M0 0 Q2 -10 0 -16" stroke="var(--foliage-dark)" strokeWidth="2" fill="none" />
              <circle cx="0" cy="-18" r="3.6" fill={f.tone === 0 ? 'var(--flower-a)' : f.tone === 1 ? 'var(--flower-b)' : f.tone === 2 ? 'var(--flower-c)' : 'var(--gold)'} />
              <circle cx="0" cy="-18" r="1.2" fill="var(--gold-soft)" opacity="0.7" />
            </g>
          ))}
        </g>

        {places.map((p) => {
          const pt = pointAtT(p.t);
          return (
            <g key={p.id} data-loc={p.id} className={`w-loc ${p.asleep ? 'w-loc--asleep' : ''} ${p.justWoke ? 'w-loc--waking' : ''}`} transform={`translate(${pt.x} ${pt.y - 34})`}>
              <ellipse className="w-loc-halo" cx="0" cy="-24" rx={LOC_HALO[p.id]} ry="84" fill="url(#w-loc-halo)" />
              <ellipse className="w-loc-shadow" cx="0" cy="4" rx={LOC_HALO[p.id] * 0.86} ry="18" fill="url(#w-shadow-grad)" />
              <g className="w-loc-art">{artFor(p.id)}</g>
              <ellipse className="w-veil" cx="0" cy="-150" rx="430" ry="350" fill="url(#w-veil)" />
            </g>
          );
        })}

        {/* The road: a worn stone band, with the unlocked stretch lit gold. */}
        <path d={PATH_D} stroke="var(--path-under)" strokeWidth="66" fill="none" strokeLinecap="round" opacity="0.34" />
        <path d={PATH_D} stroke="var(--path-soft)" strokeWidth="48" fill="none" strokeLinecap="round" />
        <path d={PATH_D} stroke="var(--path)" strokeWidth="30" fill="none" strokeLinecap="round" opacity="0.94" />
        <path d={PATH_D} stroke="var(--path-edge)" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.45" transform="translate(0 -16)" />
        <path d={PATH_D} stroke="var(--path-edge)" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.28" transform="translate(0 16)" />
        <g className="w-path-stones">
          {PATH_STONES.map((s, i) => (
            <ellipse key={i} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} fill="var(--path-stone)" opacity={s.o} transform={`rotate(${s.rot} ${s.x} ${s.y})`} />
          ))}
        </g>
        <path className="w-path-lit" d={PATH_D} pathLength={1} stroke="var(--path-lit)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${litT} 1`} />

        {MOTES.map((m, i) => (
          <circle key={i} cx={m.x} cy={m.y} r={m.size} fill="var(--lamp)" className="w-mote" style={{ '--mote-delay': `${m.delay}s` } as CSSProperties} />
        ))}

        <g className="w-ground-foreground">
          <path d={`M0 ${WORLD_H - 10} Q${WORLD_W * 0.24} ${WORLD_H - 26} ${WORLD_W * 0.48} ${WORLD_H - 8} T${WORLD_W} ${WORLD_H - 18} V${WORLD_H} H0Z`} fill="var(--ground-deep)" opacity="0.5" />
          <Palm x={90} s={0.4} delay={2.4} tone={1} />
          <Palm x={WORLD_W - 90} s={0.38} delay={3.4} tone={1} flip />
          <LampPost x={WORLD_W * 0.25} h={78} delay={2.2} s={0.72} />
          <LampPost x={WORLD_W * 0.75} h={78} delay={3.1} s={0.72} />
        </g>

        <g className="w-ground-lanterns" aria-hidden>
          {[0.12, 0.28, 0.46, 0.64, 0.82].map((t, i) => {
            const p = pointAtT(t);
            return <Lantern key={t} x={p.x - 90} y={p.y - 92} s={0.32} delay={i * 0.9} tone={i % 2 ? 'clay' : 'brass'} />;
          })}
        </g>
      </g>
    </svg>
  );
});
