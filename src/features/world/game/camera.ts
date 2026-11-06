import type { GameScene, Point } from './types';

export function cameraOffset(position: Point, viewport: Point, scene: GameScene): Point {
  return {
    x: Math.max(0, Math.min(Math.max(0, scene.width - viewport.x), position.x - viewport.x / 2)),
    y: Math.max(0, Math.min(Math.max(0, scene.height - viewport.y), position.y - viewport.y * 0.56)),
  };
}

export function renderPoint(position: Point, scene: GameScene, rtl: boolean): Point {
  return { x: rtl ? scene.width - position.x : position.x, y: position.y };
}
