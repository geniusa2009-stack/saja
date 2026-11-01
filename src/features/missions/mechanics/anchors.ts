import type { BodyPart } from '@/content/missions';

/** Anchor points in the Character viewBox (120 × 220). Character faces the viewer: their RIGHT is the viewer's left. */
export const BODY_ANCHORS: Record<BodyPart, { x: number; y: number; side: 'left' | 'right' }> = {
  heart: { x: 64, y: 104, side: 'right' },
  hands: { x: 31, y: 142, side: 'left' },
  mouth: { x: 60, y: 64.5, side: 'left' },
  nose: { x: 60, y: 58, side: 'right' },
  face: { x: 70, y: 48, side: 'right' },
  'arm-r': { x: 33, y: 112, side: 'left' },
  'arm-l': { x: 87, y: 112, side: 'right' },
  head: { x: 60, y: 30, side: 'right' },
  ears: { x: 38, y: 54, side: 'left' },
  'foot-r': { x: 51, y: 203, side: 'left' },
  'foot-l': { x: 69, y: 203, side: 'right' },
};
