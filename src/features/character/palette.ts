import type { Accessory, CharacterLook, HairStyle, Outfit } from '@/domain/types';

/** Character palettes and options — diverse by default. */
export const SKIN_TONES = ['#F7DCC6', '#EDC3A2', '#D9A27B', '#BA7D57', '#8F5B3B', '#5F3B27'];
export const HAIR_COLORS = ['#1C1514', '#3A2419', '#6B4428', '#A9773F', '#BDB2A6'];
export const HIJAB_COLORS = ['#EDE3D1', '#0F6B55', '#2B4378', '#7D3F4C', '#4B4760'];
export const OUTFIT_COLORS = ['#EFE6D6', '#0F7A5F', '#27467A', '#9C5540', '#5E4D8E', '#C79B52'];

export const DEFAULT_LOOK: CharacterLook = { skin: 2, hair: 'short', hairColor: 0, outfit: 'tunic', outfitColor: 1, accessory: 'satchel' };

export type Expression = 'calm' | 'happy' | 'thinking' | 'surprised';
export type Pose = 'idle' | 'wave' | 'cheer' | 'kneel';

export const HAIRS: HairStyle[] = ['short', 'curly', 'long', 'hijab', 'kufi', 'wrap'];
export const OUTFITS: Outfit[] = ['tunic', 'thobe', 'abaya', 'jubba', 'hoodie'];
export const ACCESSORIES: Accessory[] = ['none', 'satchel', 'lantern', 'glasses', 'scarf'];

export function randomLook(): CharacterLook {
  const r = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
  return {
    skin: Math.floor(Math.random() * SKIN_TONES.length),
    hair: r(HAIRS),
    hairColor: Math.floor(Math.random() * HAIR_COLORS.length),
    outfit: r(OUTFITS),
    outfitColor: Math.floor(Math.random() * OUTFIT_COLORS.length),
    accessory: r(ACCESSORIES),
  };
}
