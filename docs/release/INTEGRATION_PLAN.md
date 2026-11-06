# Integration plan and progress

Branch: **`release/integration`** in worktree `~/Documents/saja-release`, based on `main` (96a7d7b). Work is merged with `--no-ff` so every source stays identifiable; nothing is squashed, force-pushed or reset.

## Merge order (done)

| # | Source | Commit | Conflicts | Result |
| --- | --- | --- | --- | --- |
| 1 | `feat/threejs-locomotion` (+ `feat/game-core`) + the local Rapier-compat hotfix | `1b9fa90` | none | the `.before-hotfix` copy removed (`05cf52c`) |
| 2 | `feat/quran-studio` a21a2d8 | `b72b808` | none | |
| 3 | world-visuals snapshot | `ba9e010` | `world.css` | kept the 3D `.play-world` rules; dropped the old scenery-detail rules that the visuals work moved into `scenery.css` |
| 4 | quest-system snapshot | `4fcfd04` | none | did not compile, fixed in `ec86eef` |
| 5 | hadith-learning snapshot | `3055f96` | `App.tsx` routes | kept both the Quran and the Hadith routes |

## Phases

| Phase | Status | Evidence |
| --- | --- | --- |
| A — Stabilisation | **Done** for the 3D runtime and the game e2e | `a18a483`; GAMEPLAY_QA.md |
| B — Feature integration | Merged and compiling; **quests still to be wired into the world** | 480 tests passing after the merges |
| C — Visual excellence | In progress | DESIGN_AUDIT.md |
| D — Functional completion | Pending | |
| E — Security and content | Quran text verified, translation gated, Hadith corroborated | `2b90031`, `53e4d17`; CONTENT_VERIFICATION.md |
| F — Performance | Pending | PERFORMANCE_REPORT.md |
| G — Release validation | Pending | TEST_RESULTS.md |
| H — Staging | Pending (infrastructure check) | DEPLOYMENT_GUIDE.md |

## Rules followed

- Uncommitted work was snapshotted before anything else; the original worktrees were not modified.
- Conflicts were resolved by reading both sides, not by taking one side wholesale.
- No assertion was removed from any test; changed waits are documented in the commit messages.
- Nothing is pushed to the public GitHub repository without the owner's decision (it would publish draft religious content).
