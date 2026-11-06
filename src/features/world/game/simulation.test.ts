import { describe, expect, it } from 'vitest';
import { GAME_SCENES, PLAYER_SPEED } from './scenes';
import { cameraOffset, fixedSteps, inInteractionRange, joystickFromPointer, keyboardInput, mergeInput, normalizedInput, renderPoint, renderedFacing, stepPlayer } from './simulation';
import type { PlayerState } from './types';

const village = GAME_SCENES.village;
const player = (x = 100, y = 700): PlayerState => ({ position: { x, y }, velocity: { x: 0, y: 0 }, facing: 'right' });

describe('playable world simulation', () => {
  it('normalizes diagonal movement', () => {
    const vector = normalizedInput({ x: 1, y: 1 });
    expect(Math.hypot(vector.x, vector.y)).toBeCloseTo(1);
  });

  it('keeps movement consistent at 30 and 60 Hz', () => {
    const input = { x: 1, y: 0, enabled: true };
    let at60 = player();
    let at30 = player();
    for (let i = 0; i < 60; i++) at60 = fixedSteps(at60, input, 1 / 60, village);
    for (let i = 0; i < 30; i++) at30 = fixedSteps(at30, input, 1 / 30, village);
    expect(at60.position.x).toBeCloseTo(at30.position.x, 1);
    expect(at60.velocity.x).toBeCloseTo(PLAYER_SPEED);
  });

  it('stops precisely when input is released', () => {
    let state = player();
    for (let i = 0; i < 60; i++) state = fixedSteps(state, { x: 1, y: 0, enabled: true }, 1 / 60, village);
    for (let i = 0; i < 30; i++) state = fixedSteps(state, { x: 0, y: 0, enabled: true }, 1 / 60, village);
    expect(state.velocity.x).toBe(0);
  });

  it('does not cross a building and slides along it', () => {
    const scene = { ...village, obstacles: [{ x: 200, y: 100, width: 100, height: 300 }] };
    const state = stepPlayer(player(150, 90), { x: 1, y: 1, enabled: true }, 0.1, scene);
    expect(state.position.x).toBeLessThan(200 - 22);
    expect(state.position.y).toBeGreaterThan(90);
  });

  it('clamps the camera and handles viewports larger than a scene', () => {
    expect(cameraOffset({ x: 1700, y: 1050 }, { x: 500, y: 400 }, village)).toEqual({ x: 1300, y: 700 });
    expect(cameraOffset({ x: 800, y: 500 }, { x: 2000, y: 1400 }, village)).toEqual({ x: 0, y: 0 });
  });

  it('mirrors scene coordinates for RTL', () => {
    expect(renderPoint({ x: 100, y: 300 }, village, true)).toEqual({ x: village.width - 100, y: 300 });
    const screenRight = keyboardInput(new Set(['ArrowRight']));
    expect(mergeInput(screenRight, { x: 0, y: 0 }, true, true).x).toBe(-1);
    expect(renderedFacing({ ...player(), facing: 'left' }, true)).toBe('right');
  });

  it('releases a disabled controller without continued movement', () => {
    const state = stepPlayer({ ...player(), velocity: { x: 100, y: 0 } }, { x: 0, y: 0, enabled: false }, 1 / 60, village);
    expect(state.velocity.x).toBeLessThan(100);
  });

  it('recognizes only interactions inside the proximity radius', () => {
    expect(inInteractionRange({ x: 0, y: 0 }, { x: 100, y: 0 }, 112)).toBe(true);
    expect(inInteractionRange({ x: 0, y: 0 }, { x: 113, y: 0 }, 112)).toBe(false);
  });

  it('applies a dead zone to the virtual joystick', () => {
    expect(joystickFromPointer({ x: 0, y: 0 }, { x: 0.1, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(joystickFromPointer({ x: 0, y: 0 }, { x: 1, y: 0 }).x).toBe(1);
  });
});
