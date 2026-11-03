import type { InputVector, Point } from './types';

export function normalizedInput(input: Point): Point {
  const length = Math.hypot(input.x, input.y);
  return length > 1 ? { x: input.x / length, y: input.y / length } : { x: input.x, y: input.y };
}

export function keyboardInput(keys: ReadonlySet<string>): Point {
  const x = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA'));
  return { x, y: Number(keys.has('ArrowDown') || keys.has('KeyS')) - Number(keys.has('ArrowUp') || keys.has('KeyW')) };
}

export function mergeInput(keyboard: Point, joystick: Point, enabled: boolean, rtl = false): InputVector {
  return { x: (joystick.x || keyboard.x) * (rtl ? -1 : 1), y: joystick.y || keyboard.y, enabled };
}

export function joystickFromPointer(origin: Point, pointer: Point, deadZone = 0.18): Point {
  const dx = pointer.x - origin.x;
  const dy = pointer.y - origin.y;
  const magnitude = Math.hypot(dx, dy);
  if (magnitude <= deadZone) return { x: 0, y: 0 };
  const amount = Math.min(1, (magnitude - deadZone) / (1 - deadZone));
  return { x: (dx / magnitude) * amount, y: (dy / magnitude) * amount };
}
