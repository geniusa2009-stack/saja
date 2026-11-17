import { describe, expect, it } from 'vitest';
import { nextVillageDpr } from './renderQuality';

describe('Adaptive village resolution', () => {
  it('reduces resolution for sustained slow frames, with a floor', () => {
    expect(nextVillageDpr(1.5, 15, 1.5)).toBe(1.35);
    expect(nextVillageDpr(0.75, 12, 1.5)).toBe(0.75);
  });
  it('recovers gradually without exceeding the device cap', () => {
    expect(nextVillageDpr(0.8, 60, 1.5)).toBe(0.9);
    expect(nextVillageDpr(1, 60, 1)).toBe(1);
  });
  it('stays stable in the middle FPS range', () => {
    expect(nextVillageDpr(1.15, 42, 1.5)).toBe(1.15);
  });
  it('guards invalid measurements', () => {
    expect(nextVillageDpr(NaN, 12, 1.5)).toBe(1);
  });
});
