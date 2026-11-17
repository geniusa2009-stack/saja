/** GPU resolution adapts independently from movement physics and screen text. */
export function nextVillageDpr(current: number, fps: number, cap: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(fps) || !Number.isFinite(cap) || cap <= 0) return 1;
  const maximum = Math.max(0.75, Math.min(1.5, cap));
  const safe = Math.max(0.75, Math.min(maximum, current));
  if (fps < 24) return Math.max(0.75, Math.round((safe - 0.15) * 100) / 100);
  if (fps > 54) return Math.min(maximum, Math.round((safe + 0.1) * 100) / 100);
  return safe;
}
