export type GameSceneId = 'village' | 'mosque';
export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };

export interface GameScene {
  id: GameSceneId;
  width: number;
  height: number;
  start: Point;
  obstacles: Rect[];
  npc: { id: string; x: number; y: number; missionId: string };
}

export interface PlayerState {
  position: Point;
  velocity: Point;
  facing: 'left' | 'right';
}

export interface InputVector extends Point {
  enabled: boolean;
}
