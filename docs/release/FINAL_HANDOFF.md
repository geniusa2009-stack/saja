# Final handoff — release/integration

**Status: NOT READY FOR PUBLIC LAUNCH.** Engineering gates pass; content and deployment gates do not.

## Verified (2026-11-07, branch `release/integration`, worktree `~/Documents/saja-release`)

| Check | Result |
| --- | --- |
| `npm run check` (typecheck, lint, tests, build) | pass — 493 tests passed, 16 skipped (live AI tests; no keys) |
| `e2e/game.mjs` (3D village, quest, 2D courtyard) | pass, zero browser errors |
| Adult / child + guardian / staff journeys | 16/16 · 9/9 · 10/10 |
| Layout: 27 screens × 3 sizes × EN/AR | pass |
| axe WCAG 2.1 A/AA: 27 screens × EN/AR × 375/1280 | no serious or critical violations |
| Production Docker image (local staging stand-in) | health, CSP, caching, SPA routing, restart persistence; adult/child/game e2e pass against it |

## Done
- 3D: frame-rate-independent locomotion (root cause of the Amina e2e failure), one physics step per frame, wall-only collision count, clip history telemetry, state-driven game test with failure diagnostics.
- Integrated: 3D village, Quran Odyssey, world visuals, Hadith library, quest system (all uncommitted worktree work snapshotted to `backup/*-20261106` first).
- Quest "Words of Peace" playable end to end; duplicate-reward and lost-last-clue bugs fixed.
- Quran Al-Fatihah byte-identical to Tanzil Uthmani 1.1 (test-enforced); Saheeh translation excluded from production builds.
- Hadith: 11/11 matns corroborated against an independent dataset (Sunnah.com refuses automated access); Arabic grading-note bug fixed.
- Privacy: fonts self-hosted, strict font CSP. Learn hub IA, accessible study paths, WebGL detection with 2D fallback, 3D prefetch (−33% wait on 4G), Dockerfile.

## Launch blockers (need people or permissions)
1. Scholar review of all religious explanations, tafsir notes, Hadith meanings and knowledge entries (0 reviewed).
2. Written permission for Saheeh International (also quoted in `src/content/knowledge.ts`); word-gloss provenance.
3. Human confirmation of Hadith matns/gradings on Sunnah.com.
4. Real staging host (no hosting credentials or provider configured); production behind HTTPS.
5. Legal/privacy review for children; external penetration test; real-device testing (phones, screen readers).
6. GLB optimisation (80k tris, 264 draw calls, 3 MB uncompressed) needs a glTF tool or Blender re-export.

## Not yet written
The other docs/release files (IMPLEMENTATION_LOG, DESIGN_AUDIT, GAMEPLAY_QA, CONTENT_VERIFICATION, SECURITY_REVIEW, PERFORMANCE_REPORT, TEST_RESULTS, DEPLOYMENT_GUIDE) — their evidence is in the commit messages on this branch.

Nothing has been pushed; the backup and integration branches are local.
