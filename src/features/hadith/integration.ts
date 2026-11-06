/**
 * Hadith → world integration contract (pure data; no engine imports).
 *
 * The 3D world is deliberately untouched: no scene, camera, collision, movement
 * or Blender code imports this module. It is a small, stable interface a future
 * world build can read when it is ready to place hadith reading stations:
 *
 *   station.locationId  → which existing SAJA location hosts the station
 *   station.hadithId    → stable library id, opened with `hadithPath()`
 *   station.anchor      → a semantic spot for the engine to resolve later
 *
 * Nothing here renders, moves the player, grants rewards or changes review
 * state. A 3D station must open the same hadith detail screen as the web
 * library, so the Arabic, source, grading and demo/review label can never drift
 * from the reviewed record. The engine should resolve `record` through the
 * server overlay at runtime and show the demo label when it is not published.
 */
import type { L10n, LocationId } from '@/domain/types';
import type { HadithRecord } from '@/domain/hadith';
import { hadithPath } from '@/api/hadith';

/** Semantic anchors the future engine may map to actual geometry. */
export type HadithWorldAnchor = 'reading-nook' | 'courtyard-wall' | 'garden-bench' | 'caravan-stop' | 'night-stall' | 'stillness-mat';

export interface HadithWorldStation {
  /** Stable station id, independent of any scene object name. */
  id: string;
  locationId: LocationId;
  hadithId: string;
  anchor: HadithWorldAnchor;
  label: L10n;
  /** A short invitation, not a quotation and not a claim about the hadith. */
  invitation: L10n;
}

/**
 * Six stations, one per hosting location. All hadith records remain reachable
 * from the library; these are only places to begin reading in the world.
 */
export const HADITH_WORLD_STATIONS: readonly HadithWorldStation[] = [
  {
    id: 'station-village-salam',
    locationId: 'village',
    hadithId: 'h-bukhari-10',
    anchor: 'reading-nook',
    label: { en: 'A greeting remembered', ar: 'تحية تُذكر' },
    invitation: { en: 'A short narration about spreading peace.', ar: 'حديث قصير عن إفشاء السلام.' },
  },
  {
    id: 'station-masjid-intention',
    locationId: 'mosque',
    hadithId: 'h-bukhari-1',
    anchor: 'courtyard-wall',
    label: { en: 'Before the act', ar: 'قبل العمل' },
    invitation: { en: 'Begin with the intention behind the deed.', ar: 'ابدأ بالنية التي وراء العمل.' },
  },
  {
    id: 'station-garden-kindness',
    locationId: 'garden',
    hadithId: 'h-bukhari-6018',
    anchor: 'garden-bench',
    label: { en: 'A neighbour’s right', ar: 'حق الجار' },
    invitation: { en: 'Kindness, guests and guarding the tongue.', ar: 'الإحسان والضيافة وحفظ اللسان.' },
  },
  {
    id: 'station-library-knowledge',
    locationId: 'library',
    hadithId: 'h-bukhari-5027',
    anchor: 'reading-nook',
    label: { en: 'The road of knowledge', ar: 'طريق العلم' },
    invitation: { en: 'A narration about seeking a path of knowledge.', ar: 'حديث عن سلوك طريق العلم.' },
  },
  {
    id: 'station-reflection-mercy',
    locationId: 'reflection',
    hadithId: 'h-bukhari-7376',
    anchor: 'stillness-mat',
    label: { en: 'Mercy, not hardship', ar: 'رحمة لا مشقة' },
    invitation: { en: 'Pause on how ease is part of the message.', ar: 'تأمل كيف تكون السهولة جزءًا من الرسالة.' },
  },
  {
    id: 'station-desert-caravan',
    locationId: 'desert',
    hadithId: 'h-muslim-2699a',
    anchor: 'caravan-stop',
    label: { en: 'Mercy on the road', ar: 'الرحمة في الطريق' },
    invitation: { en: 'A narration about mercy in the journey.', ar: 'حديث عن الرحمة في السفر.' },
  },
] as const;

const BY_LOCATION = new Map<LocationId, HadithWorldStation[]>();
for (const station of HADITH_WORLD_STATIONS) {
  const list = BY_LOCATION.get(station.locationId) ?? [];
  list.push(station);
  BY_LOCATION.set(station.locationId, list);
}

export function hadithStationsForLocation(locationId: LocationId): HadithWorldStation[] {
  return [...(BY_LOCATION.get(locationId) ?? [])];
}

export function hadithStationFor(hadithId: string): HadithWorldStation | undefined {
  return HADITH_WORLD_STATIONS.find((s) => s.hadithId === hadithId);
}

/**
 * Resolve a station against the library the app is actually serving (bundled
 * demo or the server's published overlay). Returns null when the record is not
 * in that library, so a world build can never fall back to invented text.
 */
export function resolveHadithStation(station: HadithWorldStation, records: readonly HadithRecord[]): { station: HadithWorldStation; record: HadithRecord; path: string } | null {
  const record = records.find((r) => r.id === station.hadithId);
  if (!record) return null;
  return { station, record, path: hadithPath(record.id) };
}
