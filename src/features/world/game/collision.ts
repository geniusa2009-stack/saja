import { PLAYER_RADIUS } from './scenes';
import type { Point, Rect, GameScene } from './types';

function intersectsCircle(point: Point, radius: number, rect: Rect): boolean {
  const x = Math.max(rect.x, Math.min(point.x, rect.x + rect.width));
  const y = Math.max(rect.y, Math.min(point.y, rect.y + rect.height));
  return (point.x - x) ** 2 + (point.y - y) ** 2 < radius ** 2;
}

export function canOccupy(point: Point, scene: GameScene, radius = PLAYER_RADIUS): boolean {
  if (point.x < radius || point.y < radius || point.x > scene.width - radius || point.y > scene.height - radius) return false;
  return !scene.obstacles.some((obstacle) => intersectsCircle(point, radius, obstacle));
}

export function resolveCollision(position: Point, velocity: Point, dt: number, scene: GameScene): { position: Point; velocity: Point } {
  const nextPosition = { ...position };
  const nextVelocity = { ...velocity };
  // Moving each axis independently keeps tangential motion when the other axis meets a wall.
  for (const axis of ['x', 'y'] as const) {
    const candidate = { ...nextPosition, [axis]: nextPosition[axis] + nextVelocity[axis] * dt };
    if (canOccupy(candidate, scene)) nextPosition[axis] = candidate[axis];
    else nextVelocity[axis] = 0;
  }
  return { position: nextPosition, velocity: nextVelocity };
}
