import { stepPlayer } from './controller';
import type { GameScene, InputVector, PlayerState } from './types';

/** Run at stable substeps, bounded to a maximum of 50 ms catch-up after a stalled frame. */
export function fixedSteps(player: PlayerState, input: InputVector, elapsed: number, scene: GameScene): PlayerState {
  const clamped = Math.min(Math.max(elapsed, 0), 0.05);
  const count = Math.max(1, Math.ceil(clamped / (1 / 60)));
  const dt = clamped / count;
  let next = player;
  for (let i = 0; i < count; i++) next = stepPlayer(next, input, dt, scene);
  return next;
}
