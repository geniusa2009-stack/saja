/**
 * Server-authoritative content with session-stable versions.
 *
 * Online, knowledge and mission definitions come from the server: the version a
 * person first receives is pinned for the rest of the session (the server allows
 * re-reading a version that was published), so content never changes under them
 * mid-mission. Offline, the bundled demo copy is used — and labelled as such.
 * The two are never mixed silently: every result says where it came from.
 */
import { useEffect, useState } from 'react';
import type { Confidence, Evidence, KnowledgeEntry, L10n, TopicId } from '@/domain/types';
import type { MissionDefinition } from '@/domain/missionDefinitions';
import { KNOWLEDGE_BY_ID } from '@/content/knowledge';
import { useConnection } from '@/store/connection';
import { api, ApiError } from './client';

export interface ContentReview {
  fromStatus: string;
  toStatus: string;
  reviewerRole: string;
  scope: string;
  at: string;
  scholar: { id: string; name: string; verification: string } | null;
}

export interface Provenance {
  /** Where this copy came from. */
  source: 'server' | 'bundled-demo';
  version: number | null;
  /** demo = not scholar-reviewed; published = approved by a verified scholar and published. */
  status: 'demo' | 'published' | 'in-review';
  reviews: ContentReview[];
  origin: string | null;
  changeNote: string | null;
}

interface ServerKnowledge {
  id: string;
  version: number;
  topics: TopicId[];
  confidence: Confidence;
  status: Provenance['status'];
  isDemo: boolean;
  content: Record<string, unknown>;
  evidence: Evidence[];
  provenance: { origin?: string };
  changeNote: string | null;
  reviews: ContentReview[];
}

const L = (v: unknown): L10n => (v && typeof v === 'object' ? (v as L10n) : { en: '', ar: '' });

function toEntry(k: ServerKnowledge): KnowledgeEntry {
  const c = k.content;
  return {
    id: k.id,
    topics: k.topics,
    question: L(c.question),
    simple: L(c.simple),
    deep: L(c.deep),
    example: L(c.example),
    why: L(c.why),
    context: L(c.context),
    uncertainty: c.uncertainty ? L(c.uncertainty) : undefined,
    keywords: Array.isArray(c.keywords) ? (c.keywords as string[]) : [],
    confidence: k.confidence,
    evidence: k.evidence,
    reviewStatus: k.status === 'published' ? 'reviewed' : 'demo-unreviewed',
  };
}

/* ── session pinning ─────────────────────────────────────────── */
const pinnedKnowledge = new Map<string, number>();
const pinnedMissions = new Map<string, number>();
const knowledgeCache = new Map<string, Promise<{ entry: KnowledgeEntry; provenance: Provenance } | null>>();
const missionCache = new Map<string, Promise<(MissionDefinition & { isDemo: boolean; provenance: Record<string, unknown> }) | null>>();

/** Forget pins (sign-out / account switch). */
export function resetContentSession() {
  pinnedKnowledge.clear();
  pinnedMissions.clear();
  knowledgeCache.clear();
  missionCache.clear();
}

/** Re-read an entry from the server (e.g. after reconnecting) while keeping this session's pinned version. */
export function refreshKnowledge(id: string) {
  knowledgeCache.delete(id);
}

export function bundledKnowledge(id: string): { entry: KnowledgeEntry; provenance: Provenance } | null {
  const entry = KNOWLEDGE_BY_ID[id];
  if (!entry) return null;
  return { entry, provenance: { source: 'bundled-demo', version: null, status: 'demo', reviews: [], origin: 'bundled', changeNote: null } };
}

export function fetchKnowledge(id: string) {
  let p = knowledgeCache.get(id);
  if (!p) {
    const v = pinnedKnowledge.get(id);
    p = api
      .get<ServerKnowledge>(`/knowledge/${encodeURIComponent(id)}${v ? `?version=${v}` : ''}`)
      .then((k) => {
        pinnedKnowledge.set(id, k.version);
        return {
          entry: toEntry(k),
          provenance: { source: 'server' as const, version: k.version, status: k.status, reviews: k.reviews, origin: k.provenance?.origin ?? null, changeNote: k.changeNote },
        };
      })
      .catch((e) => {
        knowledgeCache.delete(id);
        if (e instanceof ApiError && e.code === 'not_found') return null;
        throw e;
      });
    knowledgeCache.set(id, p);
  }
  return p;
}

export type ContentState<T> = { state: 'loading' } | { state: 'ready'; data: T } | { state: 'missing' };

/**
 * A knowledge entry with provenance. Online → the server's (pinned) version;
 * offline or server unreachable → the bundled demo copy, labelled as such.
 */
export function useKnowledgeEntry(id: string | null | undefined): ContentState<{ entry: KnowledgeEntry; provenance: Provenance }> {
  const online = useConnection((s) => s.status === 'online');
  const connecting = useConnection((s) => s.status === 'connecting');
  const [st, setSt] = useState<ContentState<{ entry: KnowledgeEntry; provenance: Provenance }>>({ state: 'loading' });
  useEffect(() => {
    let live = true;
    if (!id) return setSt({ state: 'missing' });
    if (connecting) return setSt({ state: 'loading' });
    if (!online) {
      const b = bundledKnowledge(id);
      return setSt(b ? { state: 'ready', data: b } : { state: 'missing' });
    }
    setSt({ state: 'loading' });
    fetchKnowledge(id)
      .then((r) => live && setSt(r ? { state: 'ready', data: r } : { state: 'missing' }))
      .catch(() => {
        // Server unreachable mid-session: fall back to the labelled demo copy.
        const b = bundledKnowledge(id);
        if (live) setSt(b ? { state: 'ready', data: b } : { state: 'missing' });
      });
    return () => {
      live = false;
    };
  }, [id, online, connecting]);
  return st;
}

export function fetchMission(id: string) {
  let p = missionCache.get(id);
  if (!p) {
    const v = pinnedMissions.get(id);
    p = api
      .get<MissionDefinition & { isDemo: boolean; provenance: Record<string, unknown> }>(`/missions/${encodeURIComponent(id)}${v ? `?version=${v}` : ''}`)
      .then((m) => {
        pinnedMissions.set(id, m.version);
        return m;
      })
      .catch((e) => {
        missionCache.delete(id);
        if (e instanceof ApiError && e.code === 'not_found') return null;
        throw e;
      });
    missionCache.set(id, p);
  }
  return p;
}

/**
 * The mission definition to play. Online → the server's pinned version (payload,
 * version, demo flag). Offline → null, and mechanics use the bundled demo tables.
 */
export function useMissionDefinition(id: string) {
  const online = useConnection((s) => s.status === 'online');
  const [def, setDef] = useState<(MissionDefinition & { isDemo: boolean }) | null>(null);
  const [state, setState] = useState<'bundled' | 'loading' | 'server'>(online ? 'loading' : 'bundled');
  useEffect(() => {
    let live = true;
    if (!online) {
      setDef(null);
      setState('bundled');
      return;
    }
    setState('loading');
    fetchMission(id)
      .then((m) => {
        if (!live) return;
        setDef(m);
        setState(m ? 'server' : 'bundled');
      })
      .catch(() => live && setState('bundled'));
    return () => {
      live = false;
    };
  }, [id, online]);
  return { def, state };
}

export const pinnedMissionVersion = (id: string) => pinnedMissions.get(id);

export interface LibraryItem {
  id: string;
  question: L10n;
  simple: L10n;
  confidence: Confidence;
  topics: TopicId[];
  refs: string[];
  status: 'demo' | 'published';
}

/**
 * The learner library. Online: what the server serves (published + labelled demo).
 * Offline: the bundled demo entries. `search` uses server retrieval when online.
 */
export function useLibrary(search: string): { items: LibraryItem[] | null; source: 'server' | 'bundled-demo' } {
  const online = useConnection((s) => s.status === 'online');
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [all, setAll] = useState<LibraryItem[] | null>(null);
  useEffect(() => {
    if (!online) return;
    let live = true;
    api
      .get<{ results: { id: string; question: L10n; simple: L10n; confidence: Confidence; topics: TopicId[]; status: 'demo' | 'published' }[] }>('/knowledge')
      .then((r) => live && setAll(r.results.map((x) => ({ ...x, refs: KNOWLEDGE_BY_ID[x.id]?.evidence.map((e) => e.ref) ?? [] }))))
      .catch(() => live && setAll(null));
    return () => {
      live = false;
    };
  }, [online]);
  useEffect(() => {
    if (!online || !all) return setItems(null);
    const q = search.trim();
    if (q.length < 2) return setItems(all);
    let live = true;
    const timer = setTimeout(() => {
      api
        .get<{ results: { id: string }[] }>(`/knowledge?q=${encodeURIComponent(q)}`)
        .then((r) => live && setItems(r.results.map((h) => all.find((a) => a.id === h.id)).filter((x): x is LibraryItem => !!x)))
        .catch(() => live && setItems([]));
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [online, all, search]);
  return { items: online ? items : null, source: online && items ? 'server' : 'bundled-demo' };
}
