# SAJA — Deployment and Recovery Guide

**Status:** Draft operational runbook. Prior agent built/tested a local Docker image; no genuine public staging or production host was deployed. Validate the exact current Dockerfile and config before using this runbook.

## Preconditions

- Approved release SHA on a protected release branch, with backup of existing worktrees.
- `npm run check`, browser E2E, content/legal and privacy/security reviews recorded.
- Managed HTTPS domain, DNS, host, persistent storage, monitoring, backups and rollbacks agreed.
- `.env` stored in secret manager (never committed). Set `SAJA_ENV=production` and the correct `APP_ORIGIN=https://…`.
- Secure cookies on for public HTTPS. If behind a proxy, verify trusted proxy configuration and `TRUST_PROXY` behavior.

## Backend environment (public code inspected)

`server/config.ts` recognizes `PORT`, `DATABASE_URL`, `PGLITE_DIR`, `STATIC_DIR`, `COOKIE_SECURE`, `APP_ORIGIN`, `UPLOAD_DIR`, and optional AI/mail/push provider settings. For a single-instance persistent PGlite deployment, mount its database and upload directories on durable storage and test backup/restore. For multi-instance deployments, use Postgres with tested migrations/connection pooling.

Email and optional AI services require separate explicit configuration. Do not expose API keys to browser code. If SMTP is absent, password-reset messages may be routed into a development outbox; that is **not** suitable for production account recovery.

## Staging workflow (commands depend on Dockerfile)

1. Review `Dockerfile`, image base/runtime user, build context and production port; use existing app scripts (`npm run check`, `npm run build`).
2. Build with a pinned SHA and tag. Run with separate staging secrets and a persistent staging volume; **never use production data**.
3. Check `/api/system/health` from inside the container and through the HTTPS endpoint.
4. Confirm SPA routing, assets (especially `saja-village.glb`), WASM MIME/CSP, immutable hashed caching, 404 behavior, and no stale cache keys.
5. Run real browser journeys against the public staging URL, including login, onboarding, Quran/learning, NPC dialogue, quest and mobile fallback.
6. Confirm monitoring, error logging, backup/restore, cookie settings, moderation staff access and rollback procedure.

## Rollback plan

- Keep last known-good tagged image and its database migration compatibility notes.
- Take a tested backup before new schema changes.
- If a candidate fails smoke tests, restore previous image and compatible DB state per migration policy; do not blindly downgrade irreversible migrations.
- Document incident, owner, test evidence, data integrity checks and communication plan.

## Explicit prohibition

Do not deploy a public site solely because Docker ran locally. Do not publish restricted religious translations, unreviewed claims, or child accounts without privacy/security release approval.
