// @vitest-environment node
/**
 * The village model is served from public/ with a one-year immutable cache, so its URL must
 * change whenever the file changes. The ?v= value is the first 8 hex digits of its SHA-256:
 * re-exporting the GLB without updating it would keep returning players on the old model.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', '..');

it('the village model URL carries the hash of the file it points to', () => {
  const source = readFileSync(join(root, 'src/features/world/villageAssets.ts'), 'utf8');
  const url = source.match(/VILLAGE_ASSET_URL = '([^']+)'/)?.[1];
  expect(url).toMatch(/^\/assets\/game\/saja-village\.glb\?v=[0-9a-f]{8}$/);
  const file = readFileSync(join(root, 'public', url!.split('?')[0]));
  expect(url).toBe(`/assets/game/saja-village.glb?v=${createHash('sha256').update(file).digest('hex').slice(0, 8)}`);
});
