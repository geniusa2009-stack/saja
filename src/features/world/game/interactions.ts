import { INTERACTION_RADIUS } from './scenes';
import type { Point } from './types';

export function inInteractionRange(position: Point, target: Point, radius = INTERACTION_RADIUS): boolean {
  return Math.hypot(position.x - target.x, position.y - target.y) <= radius;
}
