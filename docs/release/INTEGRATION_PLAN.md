# SAJA — Integration Plan and Current State

**State:** Integration implementation reported complete, release approval **blocked**. This plan updates the earlier work-in-progress drafts without pretending that a remote integration branch exists.

## Completed according to previous implementation report

- Phase A: repaired 3D runtime and timing, stabilized the animation/game test, preserved original worktrees.
- Phase B: combined Quran Studio, Hadith, quest, world-visuals, and 3D in `release/integration`.
- Phase C: connected Words of Peace into NPC dialogue and mission completion; repaired idempotent quest reward logic and last-clue presentation.
- Phase D: self-hosted fonts; revised Learn navigation; RTL and 2D fallback corrections.
- Phase E: production Docker check, static assets/SPA/headers, basic persistence and adult/child/game flows.

Each statement above is based on the user's supplied Claude execution report; it must be checked on the actual integration branch before a final release.

## Remaining work in the correct order

1. **Evidence capture:** run `npm run check` and game, journey, a11y and layout suites on the exact candidate commit. Preserve exit codes and summary logs.
2. **Content approvals:** scholar-reviewed Quran explanations and Hadith meanings; direct source checks for 11 Hadith entries; translation and content reuse rights. Keep unlicensed full-verse translation absent from public builds.
3. **Security and privacy:** review age/consent flows, retention, deletion, report/block, moderation, authz and real deployment configuration; independent penetration assessment for major risks.
4. **Performance:** physical-device GPU, memory and frame-time measurements; GLB size/mesh reduction without breaking rig or clip names.
5. **Staging:** secure HTTPS domain, persistent storage, backups, deploy, smoke tests and rollback drill.
6. **Release review:** content, privacy and security approvals recorded by accountable people, then a GO/NO-GO decision.

## Git integration process

Use a separate release-candidate branch from the locally integrated worktree **after** verifying its history and cleanliness. Keep existing backups. Never force-push or fast-forward the public `main` without a diff review and permissions. If a remote preview is needed before approvals, use a verified private destination or remove gated/restricted content first.

## Definitions of done

- Implemented ≠ tested; tested locally ≠ deployed; deployed to staging ≠ approved for public launch.
- Every blocker is assigned an owner and a verifiable closure artifact (rights document, reviewed content manifest, security findings, staging URL, device test report).
