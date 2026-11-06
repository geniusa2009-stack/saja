/**
 * The Hadith library's server overlay.
 *
 * The bundled records are always DEMO. Online, the server may mark an *exact
 * published snapshot* as scholar-approved; only then does the UI drop the demo
 * label. A malformed or partial overlay is ignored rather than trusted.
 */
import { useEffect, useState } from 'react';
import { HADITHS } from '@/content/hadith';
import { hadithFromSnapshot, type HadithRecord } from '@/domain/hadith';
import { useConnection } from '@/store/connection';
import { api, ApiError } from './client';
import type { ContentReview } from './content';

export interface HadithProvenance {
  /** `server` means the status came from SAJA's review ledger; `bundled-demo` means offline. */
  source: 'server' | 'bundled-demo';
  status: 'demo' | 'published';
  version: number | null;
  reviews: ContentReview[];
}

export interface HadithItem {
  record: HadithRecord;
  provenance: HadithProvenance;
}

export interface HadithLibrary {
  items: HadithItem[];
  source: 'server' | 'bundled-demo';
}

interface ServerHadithItem {
  id: string;
  version: number;
  content: unknown;
  reviews: ContentReview[];
}
interface ServerHadithLibrary {
  items: ServerHadithItem[];
  demo: string[];
}

const demoProvenance = (source: HadithProvenance['source']): HadithProvenance => ({ source, status: 'demo', version: null, reviews: [] });

export function bundledHadithLibrary(): HadithLibrary {
  return { source: 'bundled-demo', items: HADITHS.map((record) => ({ record, provenance: demoProvenance('bundled-demo') })) };
}

/** Merge the server's published snapshots over the bundled demo records. Never mixes statuses silently. */
export function mergeHadithLibrary(server: ServerHadithLibrary): HadithLibrary {
  const published = new Map<string, { record: HadithRecord; version: number; reviews: ContentReview[] }>();
  for (const item of server.items ?? []) {
    const record = hadithFromSnapshot(item.id, item.content);
    // Anything incomplete or inconsistent stays demo. A partial overlay cannot create a review badge.
    if (record) published.set(item.id, { record, version: item.version, reviews: item.reviews ?? [] });
  }
  return {
    source: 'server',
    items: HADITHS.map((bundled) => {
      const overlay = published.get(bundled.id);
      return overlay
        ? { record: overlay.record, provenance: { source: 'server' as const, status: 'published' as const, version: overlay.version, reviews: overlay.reviews } }
        : { record: bundled, provenance: demoProvenance('server') };
    }),
  };
}

let libraryCache: Promise<HadithLibrary> | null = null;

/** Forget the pinned copy (sign-out / account switch / tests). */
export function resetHadithSession() {
  libraryCache = null;
}

export function fetchHadithLibrary(): Promise<HadithLibrary> {
  if (!libraryCache) {
    libraryCache = api
      .get<ServerHadithLibrary>('/hadith')
      .then(mergeHadithLibrary)
      .catch((e) => {
        libraryCache = null;
        if (e instanceof ApiError && e.code === 'not_found') return bundledHadithLibrary();
        throw e;
      });
  }
  return libraryCache;
}

export type HadithLibraryState = { state: 'loading' } | { state: 'ready'; data: HadithLibrary };

/**
 * Online: the server's published overlay, falling back to the labelled bundled
 * demo copy if it is unreachable. Offline: bundled demo immediately.
 */
export function useHadithLibrary(): HadithLibraryState {
  const online = useConnection((s) => s.status === 'online');
  const connecting = useConnection((s) => s.status === 'connecting');
  const [data, setData] = useState<HadithLibrary | null>(() => (online || connecting ? null : bundledHadithLibrary()));
  useEffect(() => {
    let live = true;
    if (!online) {
      setData(bundledHadithLibrary());
      return;
    }
    setData(null);
    fetchHadithLibrary()
      .then((lib) => live && setData(lib))
      .catch(() => live && setData(bundledHadithLibrary()));
    return () => {
      live = false;
    };
  }, [online]);
  return data ? { state: 'ready', data } : { state: 'loading' };
}

export function useHadithItem(id: string | null | undefined): { state: 'loading' } | { state: 'ready'; item: HadithItem } | { state: 'missing' } {
  const library = useHadithLibrary();
  if (!id) return { state: 'missing' };
  if (library.state === 'loading') return { state: 'loading' };
  const item = library.data.items.find((x) => x.record.id === id);
  return item ? { state: 'ready', item } : { state: 'missing' };
}

export const hadithPath = (id: string) => `/hadith/${id}`;
export const hadithDiscoverPath = '/hadith/discover';
export const hadithActivityPath = (id: string) => `/hadith/discover/${id}`;
