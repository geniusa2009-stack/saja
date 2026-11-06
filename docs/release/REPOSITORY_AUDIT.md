# Repository audit

**Date:** 2026-11-06 · **Repository:** `geniusa2009-stack/saja` · **Machine:** Apple Silicon, 8 GB RAM

## Remote

`origin` = `https://github.com/geniusa2009-stack/saja.git` (public). Remote branches: `main` (96a7d7b), `feat/game-core` (ef456e8), `feat/threejs-locomotion` (62fadc2), `feat/quran-studio` (a21a2d8). No pull requests are open.

## Worktrees and what was found in them

| Worktree | Branch / HEAD | Committed beyond `main` | Uncommitted work found |
| --- | --- | --- | --- |
| `~/Documents/saja` | `feat/world-visuals` @ 96a7d7b | nothing | 9 files, +2293 / −528: new scenery components (`scenery/landmarks, mosque, primitives, village`), `scenery.css`, character art changes |
| `~/Documents/saja-3d` | `feat/threejs-locomotion` @ 62fadc2 | 3D village, Rapier character controller, rigged traveller GLB (8 clips), `e2e/game.mjs` (includes `feat/game-core`) | `vite.config.ts` hotfix (Rapier alias to the non-compat package removed, Rapier/three manual chunks removed) + a `.before-hotfix` copy |
| `~/Documents/saja-game-review` | detached @ ef456e8 | — | 3 regenerated screenshots in `docs/game/` |
| `~/Documents/saja-hadith` | `feat/hadith-learning` @ 96a7d7b | **nothing** | 40 files, +5074: the whole Hadith feature (library, detail, activities, server overlay, migration `006_hadith_content_blocks.sql`, tests, docs) |
| `~/Documents/saja-quests` | `feat/quest-system` @ 96a7d7b | **nothing** | 11 files, +2070: quest store, journal, NPC dialogue, clue discovery, quest runner, "Words of Peace" quest |
| `~/Documents/saja-quran` | `feat/quran-studio` @ a21a2d8 | Quran Odyssey (Al-Fatihah) | none |

The Hadith and quest features existed **only as uncommitted files** in their worktrees: no commit, no branch tip, nothing on GitHub.

## Protection performed (nothing deleted or reset)

Each worktree's uncommitted state was snapshotted into a commit **without touching its files or index** (temporary index → `write-tree` → `commit-tree`), and a local branch points at each snapshot:

| Backup branch | Commit |
| --- | --- |
| `backup/feat-world-visuals-20261106` | `ba84460` |
| `backup/feat-threejs-locomotion-20261106` | `3e62817` |
| `backup/game-review-20261106` | `3c43b36` |
| `backup/feat-hadith-learning-20261106` | `7faff24` |
| `backup/feat-quest-system-20261106` | `32a5eaf` |

The worktrees themselves still hold their uncommitted changes, untouched (other sessions may be working in them). The backup branches are local only: pushing them would publish unreviewed religious content to a public repository, which needs the owner's decision.

## Integration workspace

New worktree `~/Documents/saja-release` on branch **`release/integration`**, created from `main` (96a7d7b). Dependencies were cloned copy-on-write from `saja-3d/node_modules` (identical `package-lock.json`).

## Dependency map

- **Frontend:** React 19, React Router 7, Zustand 5, Motion, Vite 8 (Rolldown). Typed i18n dictionaries (`src/i18n/en.ts`, `ar.ts`; `TKey` derived from English).
- **3D:** three 0.187, @react-three/fiber 9, drei 10, @react-three/rapier 2.2 → **@dimforge/rapier3d-compat 0.19.2** (WASM inlined as base64; this is the package the runtime needs). `@dimforge/rapier3d` 0.19.2 (non-compat) is a declared dependency but imported nowhere after the hotfix.
- **Backend:** Hono on Node, PGlite (embedded Postgres + pgvector) or managed Postgres, provider-agnostic AI router (Gemini/Groq/OpenRouter/Mistral/optional Anthropic), web-push, nodemailer.
- **Content:** curated knowledge (`src/content/knowledge.ts`, demo, unreviewed), missions, Daily Deen, Quran data (`src/features/quran/data/fatiha.ts`), Hadith (`src/content/hadith.ts`), quest definitions, server content-review ledger (draft → review → approved → published).
- **Assets:** `public/assets/game/saja-village.glb` (village + rigged traveller), Blender sources in `assets/blender/`.
- **Tests:** Vitest (server tests on in-memory PGlite; frontend in jsdom), Playwright-core scripts in `e2e/` driving the installed Chrome.

## Experimental / incomplete / risky items found

| Item | Finding |
| --- | --- |
| 3D game e2e | Failed (see GAMEPLAY_QA.md): movement depended on frame rate; fixed. |
| Quest system | Did not compile: syntax errors (unescaped apostrophes), 12 missing translation keys, a rules-of-hooks error. **Not connected to any screen.** |
| Quran Odyssey | Shipped a translation its own data says must not be released (Saheeh International, rights unconfirmed). 44 unsafe `as unknown as` i18n casts. |
| Hadith | Arabic grading notes contained English collection names. Otherwise careful: every record is labelled demo/unreviewed. |
| Fonts | `index.html` loads Google Fonts; the production CSP blocks a `connect-src` fetch to it (console error the game test silently filtered). |
| Compression | `server/index.ts` compresses every response, including the SSE stream (to check). |
| `e2e/serve.sh` | Killed whatever was on port 8899, which could stop another worktree's server; now `E2E_PORT`. |
