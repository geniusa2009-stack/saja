import type { PlayerState } from './types';

export function isPlayerMoving(player: PlayerState): boolean {
  return Math.hypot(player.velocity.x, player.velocity.y) > 8;
}

export function renderedFacing(player: PlayerState, rtl: boolean): 'left' | 'right' {
  return rtl ? (player.facing === 'left' ? 'right' : 'left') : player.facing;
}
