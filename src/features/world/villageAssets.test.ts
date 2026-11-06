// @vitest-environment node
/**
 * The village model is served from public/ with a one-year immutable cache, so its URL must
 * change whenever the file changes. The ?v= value is the first 8 hex digits of its SHA-256:
 * re-exporting the GLB without updating it would keep returning players on the old model.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VILLAGE_ASSET_URL } from './villageAssets';

it('the village model URL carries the hash of the file it points to', () => {
  const file = readFileSync(join(process.cwd(), 'public', VILLAGE_ASSET_URL.split('?')[0]));
  const hash = createHash('sha256').update(file).digest('hex').slice(0, 8);
  expect(VILLAGE_ASSET_URL).toBe(`/assets/game/saja-village.glb?v=${hash}`);
});
