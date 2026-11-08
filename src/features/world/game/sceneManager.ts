import { GAME_SCENES } from './scenes';
import type { GameSceneId, PlayerState } from './types';

export function getGameScene(id: GameSceneId) {
  return GAME_SCENES[id];
}

export function createPlayer(sceneId: GameSceneId, rtl: boolean): PlayerState {
  const scene = getGameScene(sceneId);
  return { position: { ...scene.start }, velocity: { x: 0, y: 0 }, facing: rtl ? 'left' : 'right' };
}
