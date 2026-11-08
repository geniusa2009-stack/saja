import { HADITHS } from '@/content/hadith';
import { hadithSnapshot } from '@/domain/hadith';
import { fakeServer, offlineFetch } from '@/test/server';
import { bundledHadithLibrary, fetchHadithLibrary, mergeHadithLibrary, resetHadithSession } from './hadith';

beforeEach(() => {
  resetHadithSession();
});
afterEach(() => {
  offlineFetch();
  resetHadithSession();
});

describe('hadith library overlay', () => {
  it('starts every bundled record as demo and says where it came from', () => {
    const library = bundledHadithLibrary();
    expect(library.source).toBe('bundled-demo');
    expect(library.items).toHaveLength(HADITHS.length);
    expect(library.items.every((i) => i.provenance.status === 'demo' && i.provenance.source === 'bundled-demo' && i.provenance.reviews.length === 0)).toBe(true);
  });

  it('marks only an exact published snapshot as scholar-approved', () => {
    const record = HADITHS[0];
    const other = HADITHS[1];
    const library = mergeHadithLibrary({
      items: [{ id: record.id, version: 3, content: hadithSnapshot(record), reviews: [{ fromStatus: 'approved', toStatus: 'published', reviewerRole: 'admin', scope: 'full text', at: '2026-01-01T00:00:00.000Z', scholar: null }] }],
      demo: [other.id],
    });
    const published = library.items.find((i) => i.record.id === record.id)!;
    expect(published.provenance).toMatchObject({ status: 'published', source: 'server', version: 3 });
    expect(published.provenance.reviews[0]?.toStatus).toBe('published');
    const demo = library.items.find((i) => i.record.id === other.id)!;
    expect(demo.provenance.status).toBe('demo');
    expect(demo.provenance.source).toBe('server');
  });

  it('ignores a malformed or partial overlay: it can never create a review badge', () => {
    const record = HADITHS[0];
    const library = mergeHadithLibrary({
      items: [
        { id: record.id, version: 2, content: { record: hadithSnapshot(record) }, reviews: [] }, // wrapped shape is not the snapshot
        { id: HADITHS[1].id, version: 2, content: { ...hadithSnapshot(HADITHS[1]), arabic: '' }, reviews: [] },
      ],
      demo: [],
    });
    expect(library.source).toBe('server');
    expect(library.items.every((i) => i.provenance.status === 'demo')).toBe(true);
  });

  it('never invents a record the server sent that is not in the curated set', () => {
    const library = mergeHadithLibrary({
      items: [{ id: 'h-not-real', version: 1, content: hadithSnapshot(HADITHS[0]), reviews: [] }],
      demo: [],
    });
    expect(library.items.map((i) => i.record.id)).toEqual(HADITHS.map((h) => h.id));
    expect(library.items.every((i) => i.provenance.status === 'demo')).toBe(true);
  });

  it('fetches the server overlay once and falls back to the labelled demo library when there is no server', async () => {
    fakeServer({
      '/hadith': () => [200, { items: [], demo: HADITHS.map((h) => h.id) }],
    });
    const first = await fetchHadithLibrary();
    expect(first.source).toBe('server');
    expect(first.items.every((i) => i.provenance.status === 'demo')).toBe(true);
    // A second call is pinned for this session, not refetched on every screen.
    const second = await fetchHadithLibrary();
    expect(second).toBe(first);

    resetHadithSession();
    fakeServer({}); // no /hadith endpoint → the client serves the bundled, labelled demo copy
    const noServer = await fetchHadithLibrary();
    expect(noServer.source).toBe('bundled-demo');
  });
});
