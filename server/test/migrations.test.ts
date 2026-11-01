// @vitest-environment node
/**
 * Production migration paths: a clean database, and a database that already holds
 * data from before the latest migration (the upgrade a live deployment goes through).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../config.ts';
import { createDb } from '../db/index.ts';
import { migrate } from '../db/migrate.ts';
import { createServices } from '../services.ts';
import { syncContentBlocks } from '../modules/content/blocks.ts';

const DIR = join(import.meta.dirname, '..', 'db', 'migrations');
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const config = () => loadConfig({ SAJA_ENV: 'test' } as NodeJS.ProcessEnv);

describe('migrations', () => {
  it('a clean database gets every migration once, in order; running again changes nothing', async () => {
    const db = await createDb(config());
    try {
      expect(await migrate(db)).toEqual(FILES);
      expect(await migrate(db)).toEqual([]);
      const s = await createServices(config(), { db });
      const [k] = await s.db.query<{ n: number; demo: number }>('select count(*)::int as n, count(*) filter (where demo_version = 1)::int as demo from knowledge_documents');
      expect(k).toEqual({ n: 19, demo: 19 });
      const [sp] = await s.db.query<{ n: number }>("select count(*)::int as n from scholar_profiles where verification_status = 'sample' and is_demo");
      expect(sp.n).toBe(2);
    } finally {
      await db.close();
    }
  });

  it('upgrades a database with existing data: demo baselines, sample scholars and review history are preserved', async () => {
    const db = await createDb(config());
    try {
      // The schema as it was before the latest migration…
      await db.exec('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
      const previous = FILES.slice(0, -1);
      for (const f of previous) {
        await db.exec(readFileSync(join(DIR, f), 'utf8'));
        await db.query('insert into schema_migrations (name) values ($1)', [f]);
      }
      // …holding real-looking data: a demo document with a staff draft (v2), a real verified scholar, a sample scholar, a mission, a review record.
      const [admin] = await db.query<{ id: string }>("insert into users (email, is_guest) values ('admin@example.test', false) returning id");
      await db.query("insert into knowledge_documents (id, topics, confidence, review_status, is_demo, current_version) values ('k-old', '{prayer}', 'consensus', 'draft', true, 2)");
      for (const v of [1, 2]) {
        await db.query("insert into knowledge_document_versions (document_id, version, content, evidence, change_note) values ('k-old', $1, $2, '[]', $3)", [v, JSON.stringify({ simple: { en: `v${v}`, ar: `v${v}` } }), v === 1 ? 'seed' : 'staff draft']);
      }
      await db.query("insert into content_reviews (document_id, version, from_status, to_status, reviewer_id, reviewer_role, scope) values ('k-old', 2, '-', 'draft', $1, 'admin', 'new version')", [admin.id]);
      await db.query(
        `insert into missions (id, number, location, chapter, topic, concept, interaction_type, modality, difficulty, minutes, definition, is_demo)
         values ('m-old', 99, 'village', 1, 'prayer', 'x', 'reflection', 'hands-on', 1, 3, '{}', true)`,
      );
      await db.query("insert into mission_versions (mission_id, version, definition) values ('m-old', 1, '{}')");
      await db.query("insert into scholar_profiles (display_name, title, specialization, verification_status, is_demo) values ('Sample (old)', '{}', '{}', 'unverified', true)");
      await db.query("insert into scholar_profiles (user_id, display_name, title, specialization, verification_status, is_demo, verification_scope, verified_by) values ($1, 'Real Scholar', '{}', '{}', 'verified', false, 'fiqh', $1)", [admin.id]);

      // The upgrade applies only what is missing.
      expect(await migrate(db)).toEqual(FILES.slice(-1));

      const [doc] = await db.query<{ demo_version: number; published_version: number | null; current_version: number }>("select demo_version, published_version, current_version from knowledge_documents where id = 'k-old'");
      expect(doc).toEqual({ demo_version: 1, published_version: null, current_version: 2 }); // the staff draft (v2) is NOT served; the seeded demo (v1) is
      const [m] = await db.query<{ demo_version: number; review_status: string }>("select demo_version, review_status from missions where id = 'm-old'");
      expect(m).toEqual({ demo_version: 1, review_status: 'draft' });
      const scholars = await db.query<{ display_name: string; verification_status: string }>('select display_name, verification_status from scholar_profiles order by display_name');
      expect(scholars).toEqual([
        { display_name: 'Real Scholar', verification_status: 'verified' },
        { display_name: 'Sample (old)', verification_status: 'sample' }, // a sample can never read as merely "unverified", nor become verified
      ]);
      const [r] = await db.query<{ n: number }>("select count(*)::int as n from content_reviews where document_id = 'k-old'");
      expect(r.n).toBe(1);
      await expect(db.query("update scholar_profiles set verification_status = 'verified' where display_name = 'Sample (old)'")).rejects.toThrow();

      // Start-up on the upgraded database: no re-seeding over existing content; code-held texts are registered.
      await syncContentBlocks(db);
      const [blocks] = await db.query<{ n: number; published: number }>('select count(*)::int as n, count(*) filter (where published_version is not null)::int as published from content_blocks');
      expect(blocks.n).toBeGreaterThan(20);
      expect(blocks.published).toBe(0);
    } finally {
      await db.close();
    }
  });
});
