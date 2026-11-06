import type { GameScene, GameSceneId } from './types';

/** Collision is authored in the same canonical world coordinates as the scene art. */
export const GAME_SCENES: Record<GameSceneId, GameScene> = {
  village: {
    id: 'village', width: 1800, height: 1100, start: { x: 220, y: 730 },
    obstacles: [
      { x: 95, y: 430, width: 130, height: 160 },
      { x: 300, y: 260, width: 360, height: 330 },
      { x: 800, y: 390, width: 130, height: 180 },
      { x: 1160, y: 250, width: 350, height: 360 },
      { x: 1020, y: 760, width: 250, height: 100 },
      { x: 1535, y: 430, width: 130, height: 160 },
    ],
    npc: { id: 'amina', x: 720, y: 690, missionId: 'm-words-of-peace' },
  },
  mosque: {
    id: 'mosque', width: 1800, height: 1100, start: { x: 260, y: 790 },
    obstacles: [
      { x: 180, y: 170, width: 580, height: 220 },
      { x: 1120, y: 170, width: 500, height: 220 },
      { x: 720, y: 120, width: 400, height: 100 },
      { x: 720, y: 560, width: 360, height: 250 },
      { x: 1150, y: 690, width: 240, height: 110 },
    ],
    npc: { id: 'grandpa', x: 420, y: 560, missionId: 'm-water-path' },
  },
};

export const PLAYER_RADIUS = 22;
export const INTERACTION_RADIUS = 112;
export const PLAYER_SPEED = 230;
