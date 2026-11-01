/**
 * World geometry in world units (6000 × 1000). The path is a Catmull-Rom
 * spline converted to cubic Béziers, evaluated with plain math so walking,
 * camera and marker placement never depend on the DOM (and are testable).
 */
export const WORLD_W = 6000;
export const WORLD_H = 1000;
export const HORIZON_Y = 600;

type Pt = { x: number; y: number };

// A gently undulating road across the whole world (every ~340 units).
const WAVE = [790, 770, 800, 752, 790, 760, 800, 756, 792, 752, 788, 752, 772, 760];
export const PATH_POINTS: Pt[] = Array.from({ length: Math.ceil((WORLD_W + 160) / 340) + 1 }, (_, i) => ({
  x: -60 + i * 340,
  y: WAVE[i % WAVE.length],
}));

interface Seg {
  p0: Pt;
  c1: Pt;
  c2: Pt;
  p1: Pt;
}

function segments(pts: Pt[]): Seg[] {
  const segs: Seg[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p_1 = pts[i - 1] ?? pts[i];
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const p2 = pts[i + 2] ?? p1;
    segs.push({
      p0,
      c1: { x: p0.x + (p1.x - p_1.x) / 6, y: p0.y + (p1.y - p_1.y) / 6 },
      c2: { x: p1.x - (p2.x - p0.x) / 6, y: p1.y - (p2.y - p0.y) / 6 },
      p1,
    });
  }
  return segs;
}

const SEGS = segments(PATH_POINTS);

export const PATH_D = `M${SEGS[0].p0.x} ${SEGS[0].p0.y} ` + SEGS.map((s) => `C${s.c1.x.toFixed(1)} ${s.c1.y.toFixed(1)} ${s.c2.x.toFixed(1)} ${s.c2.y.toFixed(1)} ${s.p1.x} ${s.p1.y}`).join(' ');

function bez(s: Seg, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * s.p0.x + 3 * u * u * t * s.c1.x + 3 * u * t * t * s.c2.x + t * t * t * s.p1.x,
    y: u * u * u * s.p0.y + 3 * u * u * t * s.c1.y + 3 * u * t * t * s.c2.y + t * t * t * s.p1.y,
  };
}

/** Point on the path by horizontal position (the path is monotonic in x). */
export function pointAtX(x: number): Pt {
  const s = SEGS.find((g) => x >= g.p0.x && x <= g.p1.x) ?? (x < SEGS[0].p0.x ? SEGS[0] : SEGS[SEGS.length - 1]);
  // Binary search the Bézier parameter that yields x.
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (bez(s, mid).x < x) lo = mid;
    else hi = mid;
  }
  return bez(s, (lo + hi) / 2);
}

/** Location t (0..1) → world x. Leaves a margin at both ends. */
export const tToX = (t: number) => 140 + t * (WORLD_W - 280);
export const xToT = (x: number) => (x - 140) / (WORLD_W - 280);

export function pointAtT(t: number): Pt {
  return pointAtX(tToX(t));
}

/** Mirror for right-to-left journeys: the story reads the other way. */
export const mirrorX = (x: number, rtl: boolean) => (rtl ? WORLD_W - x : x);

/** Deterministic pseudo-random for scenery (stable across renders). */
export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
