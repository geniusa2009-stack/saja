/** The village model (Blender GLB: environment + rigged traveller with 8 clips). */
import { useGLTF } from '@react-three/drei';

export const VILLAGE_ASSET_URL = '/assets/game/saja-village.glb?v=b45804f5';

/** Start fetching the village model early (e.g. when its location sheet opens). */
export function preloadVillageAssets() {
  useGLTF.preload(VILLAGE_ASSET_URL);
}
