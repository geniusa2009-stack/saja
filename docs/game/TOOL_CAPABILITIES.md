# SAJA Game Engine — Tool Capability Audit

Audited on 2026-11-03 in the Codex desktop session for `geniusa2009-stack/saja`.

## Capabilities discovered

| Capability | Discovered / working | Relevant operations and use | Limits / approval |
|---|---|---|---|
| GitHub plugin | Discovered; authenticated and repository access verified | Read repository metadata and files; account reports push/admin permission. Used to inspect `saja`; Git branch and PR delivery remain available through GitHub tools. | No repository write was made through the API during implementation. Push/PR still need to be performed and verified. |
| Local terminal and Git | Discovered; working in task checkout | Clone, branch, inspect, edit, run scripts, commit. Created local `feat/game-core` from `main`. | First clone attempt was network-blocked; public repo clone succeeded through the approved terminal path. |
| Node.js / npm | System Node 26 is broken by a missing `simdjson` dylib. Bundled Node `24.22.1` works and meets the package's `>=20.19` requirement. `npm ci` installed the lockfile dependencies. | TypeScript, ESLint, Vitest, Vite build, Playwright scripts. | Network access was required for `npm ci`; no paid service or account setting was used. Set the bundled Node directory first in `PATH`. |
| Repository test tooling | Discovered; dependencies installed and project commands executed | `npm run typecheck`, `lint`, `test`, `build`, `check`; Playwright journey, visual, axe accessibility, FPS scripts, and new `e2e:game`. `playwright-core` and `axe-core` are declared dependencies. | Baseline `check` stopped after typecheck/lint when server tests hit sandbox `EPERM`; after loopback access was allowed, full Vitest had one SMTP contract timeout. |
| Browser automation | Playwright scripts and installed Chrome path found in `e2e/`; gameplay check executed in headless Chrome | `e2e:game` verified English keyboard movement, Arabic/RTL movement and dialogue, desktop proximity interaction, mobile-size joystick movement, Courtyard NPC interaction, and axe WCAG 2.1 A/AA scans in both locales. Captured three real screenshots. | This uses headless desktop Chrome and a phone-sized viewport, not a physical phone or GPU trace. No CUA browser tabs were attached at audit time; Playwright is repository tooling, not an MCP server. |
| Codex application tools | Discovered and working | Workspace dependency discovery, artifact and worktree management, PR attachment. `load_workspace_dependencies` provided bundled Node/Python paths. | No pre-attached checkout or PR artifacts existed. |
| Subagents | Available; used for three bounded read-only reviews | Architecture, QA tooling, and accessibility/localization audits; their findings informed this implementation. | Agents did not modify shared files. |
| Skills | Skills catalog discovered | Product-design audit, Three.js, website, and other design/document skills are available. | No game-engine-specific skill applies. Three.js is not this project's rendering stack; no skill was invoked. |
| Images / design tools | Image generation, Canva, Figma, Blendstra, Meshy/Tripo and other design apps appear in the tool catalog | Could produce artwork, design assets, or 3D source material. | No asset generation was needed for a code-first 2D/2.5D vertical slice. Availability in the catalog does not establish app authentication or licensing for a specific asset. |
| Phaser / PixiJS docs and runtime | Not present in this repository's dependencies; no dedicated official documentation MCP was found in the task tool inventory | Could be considered for a future larger engine migration. | No install was justified: the current React/SVG/Motion stack already supplies the rendering, assets, and accessibility surface. |
| axe-core / Lighthouse / DevTools | axe-core is installed as a project dependency and `e2e:a11y` exists. Chrome DevTools can be reached through available browser surfaces if a tab is opened. | Accessibility scan, browser inspection, performance traces where supported. | No Lighthouse CLI or dedicated Chrome DevTools MCP was found. |

## Repository instructions and baseline

- No `AGENTS.md` was found in the checkout or its parent folders.
- The checkout was cloned at `96a7d7b` (`SAJA: Islamic interactive journey (web app + API)`) and the implementation branch is `feat/game-core`, based on `main`.
- Baseline `npm run check` reached typecheck and lint, then Vitest reported 39 passing files, 2 failed suites, 1 skipped file; 417 tests passed, 20 skipped, with three `listen EPERM` errors for `127.0.0.1`. The aggregate command stopped before baseline build.
- Post-implementation `npm run check` passed: 42 test files passed, 1 skipped; 430 tests passed, 16 skipped. The run included typecheck, lint, Vitest, and production build. An earlier full run had one intermittent 20-second timeout in the existing SMTP contract test; the final aggregate rerun passed.
- The final `e2e:game` run passed desktop English keyboard movement, Arabic/RTL movement, proximity/dialog interactions, axe WCAG 2.1 A/AA scans in both locales, and phone-sized joystick navigation into Yusuf's interaction range. A 1.5-second frame sample in headless Google Chrome 156.0.8078.80 at 1280×800 with reduced motion enabled measured 57 fps, p50 16.7 ms, p95 16.8 ms, and one frame over 50 ms; these numbers describe this headless run only. Touch was simulated through captured pointer input in a phone-sized viewport; no physical phone was used.
- Baseline `npm run check` stopped on sandbox `listen EPERM` errors for test servers on `127.0.0.1` (417 tests passed, 20 skipped, two failed suites). Rerunning with loopback access removed the permission errors.

## Architecture decision

Keep the existing React + SVG + CSS + Motion presentation. Add a focused Canvas scene renderer for the two free-roam areas, while retaining React for the character, NPC dialogue, mission links, accessible controls, and application UI. This is a smaller change than introducing Phaser or PixiJS, preserves the existing SVG-based world for the other locations, and permits explicit typed collision geometry with a small simulation module. Revisit a dedicated engine only if measured scene complexity or performance warrants migration.
