import { describe, expect, it } from 'vitest';
import {
  VILLAGE_3D_BOUNDS, VILLAGE_BUILDINGS, VILLAGE_DISCOVERIES,
  VILLAGE_GATE_X, VILLAGE_TREE_POSITIONS, nearbyVillageDiscovery,
} from './villageDistricts';

describe('Living Village V2 level contract', () => {
  it('keeps unique bilingual discovery points in the playable extension', () => {
    expect(VILLAGE_DISCOVERIES).toHaveLength(4);
    expect(new Set(VILLAGE_DISCOVERIES.map((p) => p.id)).size).toBe(4);
    for (const point of VILLAGE_DISCOVERIES) {
      expect(point.x).toBeGreaterThan(18);
      expect(point.x).toBeLessThan(VILLAGE_3D_BOUNDS.right - 1);
      expect(Math.abs(point.z)).toBeLessThan(4);
      expect(point.title.ar.length).toBeGreaterThan(3);
      expect(point.title.en.length).toBeGreaterThan(3);
      expect(point.description.ar.length).toBeGreaterThan(12);
      expect(point.description.en.length).toBeGreaterThan(12);
    }
  });

  it('provides distinct artisan and knowledge buildings outside the central walking lane', () => {
    expect(VILLAGE_BUILDINGS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(VILLAGE_BUILDINGS.map((building) => building.id)).size).toBe(VILLAGE_BUILDINGS.length);
    expect(VILLAGE_BUILDINGS.some((building) => building.zone === 'artisan')).toBe(true);
    expect(VILLAGE_BUILDINGS.some((building) => building.zone === 'knowledge')).toBe(true);
    for (const building of VILLAGE_BUILDINGS) {
      expect(building.x - building.width / 2).toBeGreaterThanOrEqual(18);
      expect(building.x + building.width / 2).toBeLessThanOrEqual(VILLAGE_3D_BOUNDS.right);
      expect(Math.abs(building.z) - building.depth / 2).toBeGreaterThan(4.8);
      expect(Math.abs(building.z) + building.depth / 2).toBeLessThan(VILLAGE_3D_BOUNDS.back);
    }
  });

  it('keeps the central corridor and discovered hotspots free of building footprints', () => {
    for (const point of VILLAGE_DISCOVERIES) {
      for (const building of VILLAGE_BUILDINGS) {
        const distanceX = Math.abs(point.x - building.x) - building.width / 2;
        const distanceZ = Math.abs(point.z - building.z) - building.depth / 2;
        expect(distanceX > 0.65 || distanceZ > 0.65).toBe(true);
      }
      expect(nearbyVillageDiscovery(point.x, point.z)?.id).toBe(point.id);
      expect(nearbyVillageDiscovery(point.x + 0.3, point.z + 0.2)?.id).toBe(point.id);
    }
    expect(nearbyVillageDiscovery(0, 0)).toBeNull();
    expect(nearbyVillageDiscovery(23, 6.2)).toBeNull();
    expect(VILLAGE_GATE_X).toHaveLength(2);
    expect(VILLAGE_TREE_POSITIONS).toHaveLength(12);
  });
});
