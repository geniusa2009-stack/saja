/**
 * Keeps the on-device stores and the SAJA server in step.
 *
 * Rules:
 *  - The server is authoritative for everything safety-relevant (age band, consent,
 *    parental settings, memory permissions, roles) and for progress. Local values
 *    are a cache and are overwritten by what the server says.
 *  - The game never waits on the network: missions play locally and are mirrored
 *    to the server; the server's answer then reconciles the local cache.
 *  - When there is no server, nothing here throws — the app stays in offline demo mode.
 */
import type { LocationId, MissionResult, Modality, Profile } from '@/domain/types';
import { MISSION_BY_ID } from '@/content/missions';
import { useConnection, isOnline } from '@/store/connection';
import { useProfile } from '@/store/profile';
import { useProgress, type Achievement } from '@/store/progress';
import { useLearner } from '@/store/learner';
import { useHadith } from '@/store/hadith';
import { useSettings } from '@/store/settings';
import { todayKey, useDay } from '@/store/day';
import type { LearnerModel } from '@/domain/adaptive';
import { api, ApiError, onOffline, onRefusal } from './client';
import { flushOutbox, clearOutbox } from './outbox';
import { resetContentSession } from './content';
import { resetHadithSession } from './hadith';
import type { UsageStatus } from './types';
import type { Me, ServerProgress, SystemStatus } from './types';

/* ── Events from the live stream ─────────────────────────────── */

type Listener = (data: unknown) => void;
const listeners = new Map<string, Set<Listener>>();
export function onServerEvent(type: string, fn: Listener) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type)!.add(fn);
  return () => {
    listeners.get(type)!.delete(fn);
  };
}
function emit(type: string, data: unknown) {
  listeners.get(type)?.forEach((fn) => fn(data));
}

let source: EventSource | null = null;
export function openStream() {
  if (typeof EventSource === 'undefined' || !isOnline() || !useConnection.getState().me) return;
  source?.close();
  source = new EventSource('/api/stream', { withCredentials: true });
  for (const type of ['chat.message', 'chat.update', 'notification', 'scholar.update', 'audit.update', 'dm.message', 'dm.thread', 'usage.update']) {
    source.addEventListener(type, (e) => {
      try {
        emit(type, JSON.parse((e as MessageEvent).data));
      } catch {
        /* ignore malformed event */
      }
    });
  }
  // EventSource reconnects by itself; circles joined later need a fresh subscription (see reconnectStream).
}
export const reconnectStream = () => openStream();
function closeStream() {
  source?.close();
  source = null;
}

/* ── Session ─────────────────────────────────────────────────── */

/** Changes the server made to the local cache must not be echoed back to it. */
let applying = 0;
function fromServer(fn: () => void) {
  applying++;
  try {
    fn();
  } finally {
    applying--;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
/** Mirrors traveller edits (onboarding, name, look, modality…) to the server, debounced. */
export function watchProfile() {
  return useProfile.subscribe((s, prev) => {
    if (applying || s.profile === prev.profile || !s.profile) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void saveProfile(), 600);
  });
}

let booting: Promise<void> | null = null;
/** Called once at app start. Resolves quickly; never rejects. */
export function bootstrap(): Promise<void> {
  booting ??= run()
    .catch(() => useConnection.getState().set({ status: 'offline' }))
    .then(() => {
      if (useConnection.getState().status === 'offline') watchForReconnect();
    });
  return booting;
}

/* ── Offline → online ─────────────────────────────────────────── */

let probe: ReturnType<typeof setInterval> | undefined;
let reconnectListeners: (() => void)[] = [];
/** Called when the server comes back after this device was offline. */
export function onReconnect(fn: () => void) {
  reconnectListeners.push(fn);
  return () => {
    reconnectListeners = reconnectListeners.filter((x) => x !== fn);
  };
}

/** While offline, check quietly for the server; when it answers, reconcile everything once. */
export function watchForReconnect() {
  if (probe || typeof window === 'undefined') return;
  const tryNow = async () => {
    try {
      await api.get('/system/status', { timeoutMs: 4000 });
    } catch {
      return;
    }
    clearInterval(probe);
    probe = undefined;
    window.removeEventListener('online', tryNow);
    booting = null;
    await bootstrap();
    if (isOnline()) {
      await flushOutbox();
      reconnectListeners.forEach((fn) => fn());
    }
  };
  probe = setInterval(tryNow, 30_000);
  window.addEventListener('online', tryNow);
}

/** A request found the server unreachable mid-session: switch to offline honestly and start watching. */
onOffline(() => {
  if (useConnection.getState().status !== 'online') return;
  useConnection.getState().set({ status: 'offline' });
  source?.close();
  source = null;
  watchForReconnect();
});

async function run() {
  const c = useConnection.getState();
  c.set({ status: 'connecting' });
  let system: SystemStatus;
  try {
    system = await api.get<SystemStatus>('/system/status', { timeoutMs: 5000 });
  } catch {
    c.set({ status: 'offline' });
    return;
  }
  c.set({ system });
  const res = await api.get<Me | { user: null }>('/auth/me');
  let me: Me | null = res.user ? (res as Me) : null;
  c.set({ status: 'online', me });
  if (!me && useProfile.getState().profile) me = await startGuest();
  if (me) await afterSession(me);
}

/** A guest session is created only once someone has a traveller — nothing is stored before that. */
async function startGuest(): Promise<Me | null> {
  try {
    const me = await api.post<Me>('/auth/guest');
    useConnection.getState().set({ me });
    return me;
  } catch {
    return null;
  }
}

async function afterSession(me: Me) {
  const local = useProfile.getState().profile;
  if (me.profile?.onboarding_completed_at) {
    // The account already has a traveller: the server's version wins on this device.
    if (!local || local.name !== me.profile.display_name || local.createdAt !== Date.parse(me.profile.created_at)) {
      const p = profileFromServer(me);
      fromServer(() => useProfile.setState({ profile: p }));
    }
  } else if (local) {
    me = (await pushProfile(local)) ?? me;
  }
  applyMe(me);
  await syncProgress();
  await flushOutbox();
  void hydrateDay();
  openStream();
  void refreshUnread();
  startUsageHeartbeat();
}

/* ── Guardian time limit (measured by the server) ────────────── */

let heartbeat: ReturnType<typeof setInterval> | undefined;
/** While the app is visible, a child's device checks in every minute so quiet play is counted. */
export function startUsageHeartbeat() {
  clearInterval(heartbeat);
  const me = useConnection.getState().me;
  if (!me || me.user.ageBand !== 'child') return useConnection.getState().set({ usage: null });
  const beat = async () => {
    if (!isOnline() || (typeof document !== 'undefined' && document.visibilityState !== 'visible')) return;
    try {
      const usage = await api.post<UsageStatus>('/usage/heartbeat');
      useConnection.getState().set({ usage: usage.enforced ? usage : null });
    } catch {
      /* offline: the limit can't be measured, and the UI says so */
    }
  };
  void beat();
  heartbeat = setInterval(beat, 60_000);
}

// Any refusal because the limit was reached updates the state at once.
onRefusal((e) => {
  if (e.details?.reason === 'time-limit' && e.details.usage) useConnection.getState().set({ usage: e.details.usage as UsageStatus });
});

/** Today's prayer marks, finished plan items and goals from the server, merged into the device cache. */
async function hydrateDay() {
  try {
    const d = await api.get<{ prayer: { log: Record<string, 'prayed' | 'later'> }; plan: { done: string[] }; goals: { id: string; text: string; done: boolean }[] }>('/day');
    const k = todayKey();
    const cur = useDay.getState();
    const local = cur.goals;
    const fromServer = d.goals.filter((g) => !local.some((l) => l.sid === g.id)).map((g) => ({ id: `s-${g.id}`, text: g.text, done: g.done, sid: g.id }));
    useDay.setState({
      prayers: { ...cur.prayers, [k]: { ...(cur.prayers[k] ?? {}), ...d.prayer.log } },
      done: { ...cur.done, [k]: [...new Set([...(cur.done[k] ?? []), ...d.plan.done])] },
      goals: [...local.map((l) => ({ ...l, done: d.goals.find((g) => g.id === l.sid)?.done ?? l.done })), ...fromServer],
    });
    // Goals made offline are saved to the server once.
    for (const g of local.filter((x) => !x.sid)) {
      const r = await api.post<{ id: string }>('/day/goals', { text: g.text }).catch(() => null);
      if (r) useDay.getState().setGoalSid(g.id, r.id);
    }
  } catch {
    /* My Day keeps working locally */
  }
}

function profileFromServer(me: Me): Profile {
  const p = me.profile!;
  return {
    name: p.display_name,
    look: p.character,
    purpose: p.purpose,
    ageBand: me.user.ageBand,
    level: p.level,
    goals: p.goals,
    interests: p.interests,
    modality: p.modality,
    createdAt: Date.parse(p.created_at),
  };
}

/** What the server says about age, consent, parental settings and memory replaces the local cache. */
export function applyMe(me: Me) {
  useConnection.getState().set({ me });
  const s = useProfile.getState();
  const profile = s.profile && s.profile.ageBand !== me.user.ageBand ? { ...s.profile, ageBand: me.user.ageBand } : s.profile;
  fromServer(() => useProfile.setState({ profile, parental: me.user.parental, memory: me.user.memory }));
}

async function pushProfile(p: Profile): Promise<Me | null> {
  try {
    await api.post<Me>('/profile/age', { band: p.ageBand });
  } catch (e) {
    // A child can't self-promote: the server keeps the younger band and applyMe corrects the device.
    if (!(e instanceof ApiError) || e.code !== 'forbidden') throw e;
  }
  return api.put<Me>('/profile', {
    displayName: p.name.slice(0, 24),
    locale: useSettings.getState().locale,
    purpose: p.purpose,
    level: p.level,
    modality: p.modality,
    goals: p.goals,
    interests: p.interests,
    character: p.look,
    completed: true,
  });
}

/** Onboarding finished (or the traveller changed): make sure the server knows. */
export async function saveProfile(): Promise<void> {
  const p = useProfile.getState().profile;
  if (!p || useConnection.getState().status === 'offline') return;
  if (useConnection.getState().status === 'connecting') await bootstrap();
  if (!isOnline()) return;
  try {
    let me = useConnection.getState().me ?? (await startGuest());
    if (!me) return;
    me = (await pushProfile(p)) ?? me;
    applyMe(me);
    if (!source) {
      await syncProgress();
      openStream();
    }
  } catch {
    /* stays local; next start retries */
  }
}

export async function signIn(email: string, password: string) {
  const me = await api.post<Me>('/auth/signin', { email, password });
  resetLocal();
  useConnection.getState().set({ me });
  await afterSession(me);
  return me;
}

export async function signUp(email: string, password: string) {
  if (!useConnection.getState().me) await startGuest();
  const me = await api.post<Me>('/auth/signup', { email, password });
  applyMe(me);
  return me;
}

export async function signOut() {
  clearInterval(heartbeat);
  await api.post('/auth/signout').catch(() => undefined);
  closeStream();
  resetLocal();
  useConnection.getState().set({ me: null, unread: 0, usage: null });
}

/** Clears everything personal from this device (used on sign-out / account switch). */
export function resetLocal() {
  resetContentSession();
  resetHadithSession();
  clearOutbox();
  fromServer(() => useProfile.getState().reset());
  useProgress.getState().reset();
  useLearner.getState().reset();
  // Saved hadith and private reflections are personal to this device session.
  useHadith.getState().reset();
}

export async function refreshMe() {
  if (!isOnline()) return;
  const r = await api.get<Me | { user: null }>('/auth/me');
  if (r.user) applyMe(r as Me);
}

export async function refreshUnread() {
  if (!isOnline() || !useConnection.getState().me) return;
  try {
    const r = await api.get<{ unread: number }>('/notifications');
    useConnection.getState().set({ unread: r.unread });
  } catch {
    /* ignore */
  }
}

/* ── Progress ────────────────────────────────────────────────── */

async function syncProgress() {
  let sp = await api.get<ServerProgress & { model: LearnerModel }>('/progress');
  // Missions finished on this device before it could reach the server are replayed once, in order.
  // The server re-checks every unlock rule, so nothing can be claimed that wasn't earned.
  const local = Object.values(useProgress.getState().results).filter((r) => !sp.completed.includes(r.missionId));
  if (local.length) {
    for (const r of local.sort((a, b) => a.completedAt - b.completedAt)) {
      try {
        const { attemptId } = await api.post<{ attemptId: string }>(`/missions/${r.missionId}/attempts`, { modality: r.modality });
        await api.post(`/attempts/${attemptId}/complete`, { modality: r.modality, durationMs: Math.min(r.durationMs, 6 * 3_600_000) });
      } catch {
        break;
      }
    }
    sp = await api.get('/progress');
  }
  applyProgress(sp);
}

export function applyProgress(sp: ServerProgress & { model?: LearnerModel }) {
  const results: Record<string, MissionResult> = {};
  for (const r of sp.results) {
    const m = MISSION_BY_ID[r.mission_id];
    if (!m) continue;
    results[r.mission_id] = {
      missionId: r.mission_id,
      completedAt: Date.parse(r.completed_at),
      mistakes: r.mistakes,
      hintsUsed: r.hints,
      durationMs: r.duration_ms ?? 0,
      mechanic: m.mechanic,
      modality: r.helper_modality ?? r.modality,
    };
  }
  const achievements: Achievement[] = sp.achievements.map((a) => ({
    id: a.id,
    kind: a.kind as Achievement['kind'],
    at: Date.parse(a.earned_at),
    missionId: a.mission_id ?? undefined,
    locationId: (a.location_id ?? undefined) as LocationId | undefined,
  }));
  const cur = useProgress.getState();
  const visited = [...new Set([...cur.visited, ...(sp.world.visited as LocationId[])])];
  useProgress.setState({ results, achievements, visited });
  if (sp.model) useLearner.setState({ model: sp.model });
}

export function saveLocation(location: LocationId) {
  if (isOnline() && useConnection.getState().me) void api.put('/progress/world', { location }).catch(() => undefined);
}

/* ── Mission attempts ────────────────────────────────────────── */

type Signal = { kind: 'step' | 'hint' | 'adapt_offer' | 'adapt_accept'; correct?: boolean; ms?: number; modality?: Modality };

export class MissionSync {
  private attempt: Promise<string | null> = Promise.resolve(null);
  private queue: Signal[] = [];
  private flushing: Promise<unknown> = Promise.resolve();

  start(missionId: string, modality: Modality, version?: number) {
    if (!isOnline() || !useConnection.getState().me) return;
    this.attempt = api
      .post<{ attemptId: string }>(`/missions/${missionId}/attempts`, { modality, version })
      .then((r) => r.attemptId)
      .catch(() => null);
  }

  signal(s: Signal) {
    this.queue.push({ ...s, ms: s.ms === undefined ? undefined : Math.round(Math.min(s.ms, 3_600_000)) });
    if (this.queue.length >= 20) void this.flush();
  }

  private async flush() {
    const id = await this.attempt;
    if (!id || !this.queue.length) return;
    const batch = this.queue.splice(0, 100);
    this.flushing = this.flushing.then(() => api.post(`/attempts/${id}/signals`, { signals: batch }).catch(() => undefined));
    await this.flushing;
  }

  /** Mirrors a completed mission; the server's progress then reconciles local state. */
  async complete(r: { modality: Modality; helperModality: Modality | null; durationMs: number; retries: number }) {
    const id = await this.attempt;
    if (!id) return null;
    await this.flush();
    try {
      const res = await api.post<{ woke: string[]; progress: ServerProgress & { model: LearnerModel } }>(`/attempts/${id}/complete`, {
        modality: r.modality,
        helperModality: r.helperModality,
        durationMs: Math.min(Math.round(r.durationMs), 6 * 3_600_000),
        retries: r.retries,
      });
      applyProgress(res.progress);
      return res;
    } catch {
      return null;
    }
  }

  async abandon() {
    const id = await this.attempt;
    if (id) void api.post(`/attempts/${id}/abandon`).catch(() => undefined);
  }
}
