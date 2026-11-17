/** 3D-only extension. Canonical 2D scene coordinates, missions and spawn never change. */
export const VILLAGE_3D_BOUNDS = Object.freeze({ left: -18, right: 55, front: -11, back: 11 });

export type DiscoveryId = 'pottery' | 'fairMarket' | 'kindnessGarden' | 'readingHouse';
export type Localized = { en: string; ar: string };

export interface VillageBuilding {
  id: string;
  zone: 'artisan' | 'knowledge';
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  wall: string;
  roof: string;
  kind: 'workshop' | 'stall' | 'house';
}

export interface VillageDiscovery {
  id: DiscoveryId;
  zone: 'artisan' | 'knowledge';
  x: number;
  z: number;
  title: Localized;
  description: Localized;
}

export const VILLAGE_BUILDINGS: readonly VillageBuilding[] = [
  { id: 'pottery-shop', zone: 'artisan', x: 23, z: -7.55, width: 5.0, depth: 3.7, height: 3.2, wall: '#d8af7d', roof: '#9c634c', kind: 'workshop' },
  { id: 'weaver', zone: 'artisan', x: 30, z: -7.55, width: 5.0, depth: 3.7, height: 3.0, wall: '#cfb18a', roof: '#8e6955', kind: 'workshop' },
  { id: 'woodcarver', zone: 'artisan', x: 36.0, z: -7.55, width: 4.1, depth: 3.6, height: 3.05, wall: '#d6be99', roof: '#8f6956', kind: 'workshop' },
  { id: 'woven-goods', zone: 'artisan', x: 23.8, z: 7.55, width: 5.2, depth: 3.8, height: 2.6, wall: '#c3a17b', roof: '#477c74', kind: 'stall' },
  { id: 'market-stall', zone: 'artisan', x: 31.4, z: 7.55, width: 4.6, depth: 3.8, height: 2.65, wall: '#c3a17b', roof: '#b17858', kind: 'stall' },
  { id: 'learning-house', zone: 'knowledge', x: 43.3, z: -7.35, width: 5.5, depth: 4.0, height: 3.65, wall: '#e1c8a3', roof: '#587d73', kind: 'house' },
  { id: 'archive', zone: 'knowledge', x: 51.3, z: -7.35, width: 5.15, depth: 4.0, height: 3.5, wall: '#d0b793', roof: '#777a67', kind: 'house' },
  { id: 'reading-pavilion', zone: 'knowledge', x: 45.0, z: 7.15, width: 5.4, depth: 4.0, height: 3.3, wall: '#e6d0a7', roof: '#5b7b73', kind: 'house' },
  { id: 'star-room', zone: 'knowledge', x: 52.1, z: 7.2, width: 4.1, depth: 3.9, height: 3.1, wall: '#dcc5a1', roof: '#687f83', kind: 'house' },
];

export const VILLAGE_DISCOVERIES: readonly VillageDiscovery[] = [
  {
    id: 'pottery', zone: 'artisan', x: 23, z: -3.0,
    title: { en: 'The Pottery Workshop', ar: 'ورشة الفخار' },
    description: {
      en: 'Notice how careful work shapes each vessel. What does patience look like in something you make?',
      ar: 'لاحظ كيف تشكّل العناية كل إناء. كيف يظهر الصبر في شيء تصنعه بيدك؟',
    },
  },
  {
    id: 'fairMarket', zone: 'artisan', x: 31.4, z: 3.0,
    title: { en: 'The Fair Market', ar: 'سوق الأمانة' },
    description: {
      en: 'Look at the scales and the signs. Clear prices and honest measurements make trade better for everyone.',
      ar: 'انظر إلى الموازين واللافتات. الأسعار الواضحة والموازين الدقيقة تجعل التعامل أفضل للجميع.',
    },
  },
  {
    id: 'kindnessGarden', zone: 'knowledge', x: 42.5, z: -3.0,
    title: { en: 'The Garden of Kindness', ar: 'حديقة الإحسان' },
    description: {
      en: 'Small, thoughtful actions add up. Think of one helpful thing you could do for your community today.',
      ar: 'الأعمال الصغيرة الواعية تتراكم. فكّر في شيء نافع يمكنك تقديمه لمجتمعك اليوم.',
    },
  },
  {
    id: 'readingHouse', zone: 'knowledge', x: 50.0, z: 3.0,
    title: { en: 'The Reading House', ar: 'بيت المعرفة' },
    description: {
      en: 'Curiosity is a good beginning. Ask thoughtful questions, check sources, and keep learning.',
      ar: 'الفضول بداية جميلة. اسأل أسئلة واعية، وتحقق من المصادر، وواصل التعلّم.',
    },
  },
];

/** Reachable on the village's unobstructed central path; returns the closest hotspot. */
export function nearbyVillageDiscovery(x: number, z: number, radius = 2.5): VillageDiscovery | null {
  let found: VillageDiscovery | null = null;
  let bestDistance = radius * radius;
  for (const discovery of VILLAGE_DISCOVERIES) {
    const distance = (x - discovery.x) ** 2 + (z - discovery.z) ** 2;
    if (distance <= bestDistance) { found = discovery; bestDistance = distance; }
  }
  return found;
}

/** Sites deliberately stay out of the original village GLB and its collision footprints. */
export const VILLAGE_GATE_X = [18.15, 37.8] as const;
export const VILLAGE_TREE_POSITIONS: readonly (readonly [number, number])[] = [
  [19.5, -9.9], [26.5, -9.9], [34.1, -9.9], [39.2, -9.9], [47.2, -9.9], [54.1, -9.9],
  [19.4, 9.9], [28.1, 9.9], [36.2, 9.9], [40.0, 9.9], [48.1, 9.9], [54.2, 9.9],
] as const;
