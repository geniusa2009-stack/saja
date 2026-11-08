# SAJA — Verification Results

**Source:** user-supplied previous Claude execution report; these are historical results from local `release/integration`, **not tests rerun by this document author**. The verifier in this kit will create a fresh evidence report with exit codes.

## Previously reported

| Test suite | Reported result | Interpretation |
|---|---|---|
| `npm run check` | PASS; 493 tests, 16 live AI skipped | Types, lint, units, build; no provider keys |
| `npm run e2e:game` | PASS | English/Arabic 3D/quest/2D courtyard browser flow |
| Adult journey | PASS: 16/16 | Staging-like local server |
| Child + guardian | PASS: 9/9 | Staging-like local server |
| Staff journey | PASS: 10/10 | Publishing workbench |
| Responsive layout | PASS: 27 screens, 3 widths, 2 locales | Automated clipping/overflow only |
| Accessibility axe WCAG 2.1 A/AA | No serious or critical findings | Not full accessibility certification |
| Docker local production smoke | PASS | API health, headers, SPA, static files, persistence after restart |
| Public HTTPS staging | NOT RUN | No real host available |
| Real phone + physical GPU | NOT RUN | Launch gate |
| Religious content review / licensing | NOT APPROVED | Launch gate |
| External security/privacy | NOT RUN | Launch gate |

## Fresh local verification

Run `python3 tools/verify_release.py --project ~/Documents/saja-release --check`, then (only when a safe dedicated E2E port is configured) add `--game`. The script will write logs and a timestamped Markdown report outside the repository at `~/Documents/saja-release-evidence` by default.

Do not copy a historical pass count into a current report without current exit codes. E2E requires installed browser and test-specific server. Re-run after every significant feature/dependency/content change.

## Test exit policy

Any typecheck, lint, core unit, build, or critical browser journey failure is **NO-GO** for public release. Skipped provider tests must remain listed as unverified functionality; don't claim AI providers are tested if keys were absent.
