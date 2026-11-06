// @vitest-environment node
/**
 * Hadith review end to end: the bundled content is registered as draft
 * snapshots, a learner only ever receives a PUBLISHED snapshot, and changing
 * the code resets the block to draft instead of carrying a review forward.
 */
import { createTestServer, account, grantRole, makeScholar, type Client } from './harness.ts';
import { syncContentBlocks, codeBlocks } from '../modules/content/blocks.ts';
import { HADITHS, HADITH_BY_ID } from '../../src/content/hadith.ts';

let t: Awaited<ReturnType<typeof createTestServer>>;
let s: Awaited<ReturnType<typeof team>>;

const uid = async (c: Client) => (await c.get('/auth/me')).data.user.id as string;

async function team() {
  const admin = await account(t.client(), 'adult', `h-admin-${Math.random()}@example.com`);
  await grantRole(t.services, await uid(admin), 'admin');
  const moderator = await account(t.client(), 'adult', `h-mod-${Math.random()}@example.com`);
  await grantRole(t.services, await uid(moderator), 'moderator');
  const reviewer = await account(t.client(), 'adult', `h-reviewer-${Math.random()}@example.com`);
  await makeScholar(t.services, await uid(reviewer), 'verified');
  return { admin, moderator, reviewer };
}

const step = (c: Client, path: string, to: string) => c.post(`${path}/review`, { to, scope: 'Arabic matn, reference, grading and SAJA meaning' });

beforeAll(async () => {
  t = await createTestServer();
  s = await team();
}, 60_000);
afterAll(() => t.close());

describe('hadith review and publication', () => {
  it('registers the curated library as draft and serves nothing publicly yet', async () => {
    const blocks = (await s.moderator.get('/content/blocks')).data.blocks.filter((b: { kind: string }) => b.kind === 'hadith');
    expect(blocks).toHaveLength(HADITHS.length);
    expect(blocks.every((b: { review_status: string; published_version: number | null; is_demo: boolean }) => b.review_status === 'draft' && b.published_version === null && b.is_demo)).toBe(true);
    for (const b of blocks) {
      expect(b.content.record).toMatchObject({ id: b.id, arabic: HADITH_BY_ID[b.id]!.arabic, source: HADITH_BY_ID[b.id]!.source });
      expect(b.content.record).not.toHaveProperty('reviewStatus');
    }

    const publicLibrary = await t.client().get('/hadith');
    expect(publicLibrary.status).toBe(200);
    expect(publicLibrary.data.items).toEqual([]);
    expect(publicLibrary.data.demo).toHaveLength(HADITHS.length);

    // Unknown or non-hadith kinds are not a review surface, and anonymous writes are refused.
    expect((await t.client().post('/content/blocks/hadith/h-bukhari-1/review', { to: 'internal_review', scope: 'x' })).status).toBe(401);
    expect((await s.moderator.post('/content/blocks/not_a_kind/h-bukhari-1/review', { to: 'internal_review', scope: 'x' })).status).toBe(404);
  });

  it('publishes one exact snapshot and then serves only that snapshot with its review trail', async () => {
    const path = '/content/blocks/hadith/h-bukhari-1';
    expect((await step(s.moderator, path, 'internal_review')).status).toBe(200);
    expect((await step(s.moderator, path, 'scholar_review')).status).toBe(200);
    expect((await step(s.moderator, path, 'approved')).status).toBe(403); // moderators can't approve
    expect((await step(s.reviewer, path, 'approved')).status).toBe(200);
    expect((await step(s.reviewer, path, 'published')).status).toBe(403); // only admins publish
    expect((await step(s.admin, path, 'published')).status).toBe(200);

    const library = (await t.client().get('/hadith')).data;
    expect(library.items).toHaveLength(1);
    const item = library.items[0];
    expect(item).toMatchObject({ id: 'h-bukhari-1', version: 1 });
    expect(item.content).toMatchObject({
      id: 'h-bukhari-1',
      arabic: HADITH_BY_ID['h-bukhari-1']!.arabic,
      source: { reference: 'Sahih al-Bukhari 1', url: 'https://sunnah.com/bukhari:1', number: '1' },
      grading: { authority: HADITH_BY_ID['h-bukhari-1']!.grading.authority },
      englishMeaning: { kind: 'saja-paraphrase' },
    });
    expect(item.content).not.toHaveProperty('reviewStatus');
    expect(item.reviews.some((r: { toStatus: string; scholar: { name: string } | null }) => r.toStatus === 'approved' && r.scholar?.name === 'Test Scholar')).toBe(true);
    expect(item.reviews.some((r: { toStatus: string }) => r.toStatus === 'published')).toBe(true);
    expect(library.demo).toHaveLength(HADITHS.length - 1);
    expect(library.demo).not.toContain('h-bukhari-1');

    const status = (await s.moderator.get('/content/status')).data.hadith;
    expect(status.served).toEqual({ published: 1, demo: HADITHS.length - 1, hidden: 0 });
    expect(status.byStatus.published).toBe(1);
    expect(status.byStatus.draft).toBe(HADITHS.length - 1);
  });

  it('returns a published hadith to draft when any reviewed text changes, and stops serving it', async () => {
    const original = HADITHS[0];
    const changed = codeBlocks().map((b) =>
      b.kind === 'hadith' && b.id === original.id
        ? { ...b, content: { record: { ...(b.content as { record: object }).record, meaning: { en: 'A changed meaning for review.', ar: 'معنى معدّل للمراجعة.' } } } }
        : b,
    );
    await syncContentBlocks(t.services.db, changed);

    const block = (await s.moderator.get('/content/blocks')).data.blocks.find((b: { kind: string; id: string }) => b.kind === 'hadith' && b.id === original.id);
    expect(block).toMatchObject({ review_status: 'draft', published_version: null, is_demo: true, current_version: 2 });
    const library = (await t.client().get('/hadith')).data;
    expect(library.items).toEqual([]);
    expect(library.demo).toContain(original.id);

    // Restoring the exact original text creates a new draft snapshot; it does not resurrect the old approval.
    await syncContentBlocks(t.services.db);
    const restored = (await s.moderator.get('/content/blocks')).data.blocks.find((b: { kind: string; id: string }) => b.kind === 'hadith' && b.id === original.id);
    expect(restored).toMatchObject({ review_status: 'draft', published_version: null, current_version: 3 });
    expect((await t.client().get('/hadith')).data.items).toEqual([]);
  });
});
