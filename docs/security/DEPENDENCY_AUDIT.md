# Dependency audit

Audit date: 2026-11-04  
Repository: geniusa2009-stack/saja  
Branch: feat/threejs-locomotion  
Scope: baseline captured before adding any Three.js packages; final verification includes the 3D stack.

## Baseline

- npm audit: 23 vulnerable package entries (17 moderate, 4 high, 2 critical).
- npm audit --omit=dev: 4 runtime entries (3 moderate, 1 high).

## Direct and transitive findings

| Dependency | Direct? | Exposure | Finding and applicability |
| --- | --- | --- | --- |
| @hono/node-server 2.1.1 | Direct | Production | Moderate static-path decoding issue. server/index.ts uses serveStatic, so this path is active. [GHSA-rmxm-3fg6-px4f](https://github.com/advisories/GHSA-rmxm-3fg6-px4f) |
| hono 4.13.10 | Direct | Production | Moderate static-path decoding issue; Hono routes are the live API/static host. [GHSA-5r4p-p66f-jhc7](https://github.com/advisories/GHSA-5r4p-p66f-jhc7) |
| nodemailer 10.0.12 | Direct | Production | Five moderate address-parsing and SMTP AUTH advisories. The app sends mail through SMTP; recipients are validated application addresses, but the library is in the runtime path. [Advisories](https://github.com/advisories/GHSA-8c8m-p3m8-cjg8) |
| zod 4.6.5 | Direct | Production | High memory exhaustion advisory for oversized constrained collections. Zod validates API bodies; schemas commonly cap fields/arrays, but JSON is parsed before validation and has no shared byte limit. [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) |
| concurrently 9.2.4 → shell-quote 1.9.0 | Direct → transitive | Development | Critical command-injection advisory. The repo invokes concurrently from fixed npm scripts with static commands, so no user-controlled command reaches it. [GHSA-pqg4-j6r4-53mv](https://github.com/advisories/GHSA-pqg4-j6r4-53mv) |
| vite 8.3.1 → launch-editor | Direct → transitive | Development | High and moderate dev-server/editor advisories. Vite serves local development and builds the production bundle; it is not in the production dependency set. |
| vitest 4.1.11 → @vitest/mocker 4.1.11 | Direct → transitive | Development | Moderate mock-registration/traversal advisories, limited to test tooling. |
| jsdom 29.1.1 → undici 7.30.0 and source-map-js 1.2.1 | Transitive | Development | High request/parser denial-of-service and source-map advisories in the test/browser-tooling tree; neither is shipped as a production dependency. |
| eslint 10.11.0, @eslint/js 10.0.1, typescript-eslint 8.71.0 → minimatch 10.2.6 | Direct tools → transitive | Development | Moderate glob-amplification advisory. Affected patterns are repository lint/parser config, not app request data. npm's resolver requires a forced major downgrade of the lint stack to fix it. [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) |

## Safe updates applied

Ran npm audit fix without --force after reviewing its dry-run. It changed 38 lockfile packages, added or removed none, and did not change package.json ranges. Key direct updates:

- @hono/node-server 2.1.1 → 2.1.6
- hono 4.13.10 → 4.13.16
- nodemailer 10.0.12 → 10.3.1
- zod 4.6.5 → 4.6.7
- concurrently 9.2.4 → 9.2.5
- vite 8.3.1 → 8.3.5
- vitest 4.1.11 → 4.1.12
- typescript-eslint 8.71.0 → 8.72.1
- Vulnerable transitive undici, source-map-js, and shell-quote were updated within their consumers' ranges.

Post-fix audit, before 3D dependencies:

- npm audit --omit=dev: 0 vulnerabilities.
- npm audit: 12 moderate package entries, all in the ESLint/TypeScript-ESLint minimatch dependency tree; 0 high and 0 critical.

## Final audit after 3D dependencies

Added direct runtime packages: `@react-three/fiber@9.8.2`, `@react-three/drei@10.7.9`, `@react-three/rapier@2.2.0`, and `three@0.187.0`. Their dependency trees introduce no new audit findings.

Final npm audit results (2026-11-04):

- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm audit`: 12 moderate vulnerabilities, 0 high, 0 critical. All remaining paths end at the development-only `minimatch <11.0.1` dependency described above.
- The first final audit request hit an npm registry connection reset. Retrying serially with fetch retries succeeded for production; the full report returned the 12 moderate `minimatch` findings.

## Remaining item

The only remaining report is minimatch <11.0.1, reached through @eslint/config-array and @typescript-eslint/typescript-estree. npm's proposed forced resolution downgrades typescript-eslint 8.72.1 to 8.14.0 (and its related lint stack across a major boundary). I left it unchanged: this is development-only, its configured patterns are trusted project files, and the major downgrade is not a safe fix for this branch. No production advisory remains after the compatible updates.

No production advisory remains. Keep the documented development-only `minimatch` item pinned to the compatible lint stack until an in-range fix is available; do not use `npm audit fix --force` for this branch.

