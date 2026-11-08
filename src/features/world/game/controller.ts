import { PLAYER_SPEED } from './scenes';
import { resolveCollision } from './collision';
import { normalizedInput } from './input';
import type { GameScene, InputVector, PlayerState } from './types';

const ACCELERATION = 1500;
const FRICTION = 1900;

export function stepPlayer(player: PlayerState, rawInput: InputVector, dt: number, scene: GameScene): PlayerState {
  const input = rawInput.enabled ? normalizedInput(rawInput) : { x: 0, y: 0 };
  const velocity = { ...player.velocity };
  for (const axis of ['x', 'y'] as const) {
    const desired = input[axis] * PLAYER_SPEED;
    const amount = (input[axis] === 0 ? FRICTION : ACCELERATION) * dt;
    velocity[axis] = desired > velocity[axis] ? Math.min(desired, velocity[axis] + amount) : Math.max(desired, velocity[axis] - amount);
  }
  const moved = resolveCollision(player.position, velocity, dt, scene);
  const facing = moved.velocity.x < -4 ? 'left' : moved.velocity.x > 4 ? 'right' : player.facing;
  return { ...moved, facing };
}
