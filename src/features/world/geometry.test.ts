import { pointAtX, pointAtT, tToX, xToT, mirrorX, WORLD_W, PATH_D } from './geometry';
import { LOCATIONS } from '@/content/world';

describe('world geometry', () => {
  it('evaluates the road at any x, staying on the ground band', () => {
    for (let x = 0; x <= WORLD_W; x += 250) {
      const p = pointAtX(x);
      expect(Math.abs(p.x - x)).toBeLessThan(1);
      expect(p.y).toBeGreaterThan(730);
      expect(p.y).toBeLessThan(820);
    }
  });
  it('round-trips t ↔ x and mirrors for RTL', () => {
    expect(xToT(tToX(0.42))).toBeCloseTo(0.42);
    expect(mirrorX(100, true)).toBe(WORLD_W - 100);
    expect(mirrorX(100, false)).toBe(100);
  });
  it('spaces places far enough apart that their art never overlaps', () => {
    const xs = LOCATIONS.map((l) => pointAtT(l.t).x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThan(560);
  });
  it('produces a valid SVG path', () => {
    expect(PATH_D.startsWith('M')).toBe(true);
    expect(PATH_D).not.toContain('NaN');
  });
});
