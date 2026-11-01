/** Tells the client which capabilities are REAL and which are DEMO/unavailable. */
import { Hono } from 'hono';
import type { AppEnv } from '../context.ts';

export const systemRoutes = new Hono<AppEnv>();

systemRoutes.get('/status', async (c) => {
  const s = c.get('services');
  const [counts] = await s.db.query<{ published: number; demo: number; missions_published: number; missions_demo: number }>(
    `select (select count(*) filter (where published_version is not null)::int from knowledge_documents) as published,
            (select count(*) filter (where published_version is null and demo_version is not null)::int from knowledge_documents) as demo,
            (select count(*) filter (where published_version is not null)::int from missions) as missions_published,
            (select count(*) filter (where published_version is null and demo_version is not null)::int from missions) as missions_demo`,
  );
  return c.json({
    ok: true,
    environment: s.config.SAJA_ENV,
    modes: { ...s.config.modes, embeddings: s.embeddings.id.startsWith('gemini') ? 'gemini' : s.embeddings.id.startsWith('voyage') ? 'voyage' : 'local-lexical' },
    // Live state from real calls ("available" only after a request actually succeeded). No provider names for learners.
    ai: { state: s.ai.state() },
    push: { mode: s.push.mode, publicKey: s.push.publicKey },
    // Counted, not assumed: "reviewed" only when documents have actually been approved and published.
    content: {
      reviewed: counts.published > 0 && counts.demo === 0 && counts.missions_demo === 0,
      publishedDocuments: counts.published,
      demoDocuments: counts.demo,
      publishedMissions: counts.missions_published,
      demoMissions: counts.missions_demo,
      note:
        counts.demo + counts.missions_demo > 0
          ? 'Some or all religious content is demo content pending scholar review.'
          : 'All knowledge and missions learners receive have been reviewed and published.',
    },
  });
});

/**
 * Liveness/readiness for load balancers and monitoring: database reachable,
 * files waiting for deletion, notifications overdue. No personal data.
 */
systemRoutes.get('/health', async (c) => {
  const s = c.get('services');
  const started = Date.now();
  try {
    const [row] = await s.db.query<{ files: number; overdue: number; stale: number }>(
      `select (select count(*)::int from pending_file_deletions) as files,
              (select count(*)::int from notifications where status = 'scheduled' and scheduled_for < now() - interval '5 minutes') as overdue,
              (select count(*)::int from knowledge_chunks where embedding_model <> $1) as stale`,
      [s.embeddings.id],
    );
    // Chunks embedded by another model are invisible to search (re-indexing failed or is running).
    // ai.state is informational: SAJA keeps working (curated answers) when every AI provider is down.
    return c.json({ ok: row.stale === 0, db: { ok: true, ms: Date.now() - started }, pendingFileDeletions: row.files, overdueNotifications: row.overdue, staleEmbeddings: row.stale, ai: { state: s.ai.state() } });
  } catch {
    return c.json({ ok: false, db: { ok: false } }, 503);
  }
});
