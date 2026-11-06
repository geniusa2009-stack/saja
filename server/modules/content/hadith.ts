/**
 * The learner-facing Hadith library.
 *
 * Only PUBLISHED snapshots leave this route. A draft, a version in review or a
 * published block whose current text changed (and was reset to draft) must never
 * be served here. The client falls back to its labelled bundled demo record when
 * a hadith is not published, so a partial overlay can never create a review badge.
 */
import { Hono } from 'hono';
import type { AppEnv } from '../../context.ts';
import { HADITHS } from '../../../src/content/hadith.ts';
import { reviewsFor } from './review.ts';

export const hadithRoutes = new Hono<AppEnv>();

hadithRoutes.get('/', async (c) => {
  const db = c.get('services').db;
  const rows = await db.query<{ id: string; version: number; content: unknown }>(
    `select b.id, b.published_version as version, v.content
       from content_blocks b
       join content_block_versions v on v.kind = b.kind and v.id = b.id and v.version = b.published_version
      where b.kind = 'hadith' and b.published_version is not null and b.review_status <> 'archived'
      order by b.id`,
  );
  const published = new Set(rows.map((r) => r.id));
  const items = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      version: r.version,
      // The block stores `{ record: snapshot }`; the learner route returns only the snapshot.
      content: (r.content as { record?: unknown } | null)?.record ?? null,
      // The learner sees who approved this exact published version and why.
      reviews: await reviewsFor(db, { type: 'block', kind: 'hadith', id: r.id }, r.version),
    })),
  );
  return c.json({
    items,
    // Bundled records with no published snapshot. The client shows these with a demo label.
    demo: HADITHS.filter((h) => !published.has(h.id)).map((h) => h.id),
  });
});
