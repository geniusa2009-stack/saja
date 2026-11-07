# SAJA — Repository Audit

**Status:** Evidence-backed draft, 2026-11-07. **Source of local integration facts:** prior Claude execution report supplied by the project owner. The `release/integration` worktree was not available to this reviewer; statements about it must be independently reproduced on that machine.

## Repository and working copies

- Public remote: `geniusa2009-stack/saja`.
- Reported integration working copy: `~/Documents/saja-release`, branch `release/integration`. At last report, **not pushed**.
- Original checkout: `~/Documents/saja`. Additional worktrees: `saja-3d`, `saja-quran`, Hadith, quests, world visuals. The previous agent reports local `backup/*-20261106` snapshot branches preserving five dirty worktrees. Verify those refs exist with `git branch --list 'backup/*'` and `git worktree list` before any cleanup.
- Public remote still lacks `release/integration` as of the 2026-11-07 connector check; the public PR #1 is not the combined release.

## Integrated subsystems — reported, not re-run here

| Subsystem | Evidence from previous session | Review obligation |
|---|---|---|
| 3D village | Rapier/Three.js, eight clips, headless game journey passed | Real GPU, mobile, low-spec and WebGL fallback |
| Quran Odyssey | Al-Fatiha Uthmani comparison, learning modes, draft English full-verse gate | Religious review, translation licensing, rights scan across all content |
| Hadith | 11 entries corroborated with independent dataset | Direct citation/grade review against authoritative editions |
| Quest system | Amina → three clues → mission, double-award bug fixed | Accessibility and account persistence |
| Community, account, staff | Existing baseline flows reported passing | Children's data/privacy and external security review |

## Runtime observed in public branch

The public project's server is Hono with `server/config.ts`, a Vite/React client and optional PGlite or Postgres. Configuration includes `SAJA_ENV`, `APP_ORIGIN`, `DATABASE_URL`, `PGLITE_DIR`, `COOKIE_SECURE`, `STATIC_DIR`, and provider keys. Do not expose keys in client builds or documents.

## Baseline verification

The earlier integrated agent reported `npm run check` passing (493 tests; 16 live-provider tests skipped). This is historical evidence **not** an independent verification by this document author. Run `tools/verify_release.py` on the local integration worktree to capture current commit, git status and build/test outcomes.

## Non-negotiable working-copy safeguards

1. Do not merge or push `release/integration` while religious content or licenses remain unresolved; the destination repository is public.
2. Do not delete or reset the five source worktrees, archived branches, or their indexes.
3. Ensure a backup of PGlite/Postgres and user-generated uploads before migrations, staging, or deployment.
4. Verify current branch HEAD and dirty state before promoting a release candidate.
