import type { LocationId, Mission, WorldLocation } from './types';

export interface ProgressSnapshot {
  completed: string[]; // mission ids
}

export function isUnlocked(location: WorldLocation, progress: ProgressSnapshot, missions: Mission[]): boolean {
  const rule = location.unlock;
  if (rule.kind === 'start') return true;
  const pool = rule.at ? missions.filter((m) => m.location === rule.at).map((m) => m.id) : null;
  const count = pool ? progress.completed.filter((id) => pool.includes(id)).length : progress.completed.length;
  return count >= rule.count;
}

export function unlockedLocations(locations: WorldLocation[], progress: ProgressSnapshot, missions: Mission[]): Set<LocationId> {
  return new Set(locations.filter((l) => isUnlocked(l, progress, missions)).map((l) => l.id));
}

/** Locations that became available because of the change from `before` to `after`. */
export function newlyUnlocked(
  locations: WorldLocation[],
  before: ProgressSnapshot,
  after: ProgressSnapshot,
  missions: Mission[],
): WorldLocation[] {
  const a = unlockedLocations(locations, before, missions);
  return locations.filter((l) => !a.has(l.id) && isUnlocked(l, after, missions));
}

/** Missions still needed before `location` wakes up (0 when already open). */
export function missionsUntilUnlock(location: WorldLocation, progress: ProgressSnapshot): number {
  const rule = location.unlock;
  if (rule.kind === 'start') return 0;
  return Math.max(0, rule.count - progress.completed.length);
}

export type MarkerState = 'done' | 'current' | 'open' | 'asleep';

/** Brand marker states: Done · Current · Open · Asleep. */
export function locationState(
  location: WorldLocation,
  progress: ProgressSnapshot,
  missions: Mission[],
  currentId: LocationId | null,
): MarkerState {
  if (!isUnlocked(location, progress, missions)) return 'asleep';
  if (location.id === currentId) return 'current';
  const here = missions.filter((m) => m.location === location.id && !m.adaptive);
  if (here.length > 0 && here.every((m) => progress.completed.includes(m.id))) return 'done';
  return 'open';
}
