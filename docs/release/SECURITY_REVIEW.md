# SAJA — Security and Privacy Review

**Scope:** previous implementation findings plus direct read-only inspection of public `server/config.ts` on 2026-11-07. No independent penetration test of `release/integration` was possible here.

## Existing controls

- Hono API with config parsing/validation via Zod; runtime warns on unsafe production settings.
- Public `server/config.ts` defines `SAJA_ENV`, `APP_ORIGIN`, `COOKIE_SECURE`, `TRUST_PROXY`, `DATABASE_URL`, `PGLITE_DIR`, server-only AI provider keys and upload limits.
- Prior agent reported CSP, non-root container, explicit publishing roles, content review and read-only Hadith public endpoints; these need live verification.
- Prior agent reported 10 moderate development-only dependency findings, no high/critical, and no committed `.env`/`.data` or secrets. Audit results may change; run fresh `npm audit --json` in controlled context.

## Public-release gates

1. Validate ages/guardian consent and data-retention/deletion flows; never treat demo accounts as real identity assurance.
2. Test account and session boundaries, CSRF/CORS, cookie flags, role-based staff endpoints and untrusted input.
3. Test community/chat abuse reporting, block/mute, escalation and moderation; enable only safe functionality for minors.
4. Confirm upload validation, size enforcement, content scanning and path traversal protections.
5. Ensure rate limits, password reset, audit logs and login flows work in staging.
6. Set `APP_ORIGIN` to the actual HTTPS origin. Keep secure cookies enabled; define trusted proxies precisely.
7. Confirm persistent PGlite is **single instance only** or move to managed Postgres for horizontal scaling; back up data/uploads and test restore.
8. Run independent security review and privacy/legal assessment appropriate to jurisdictions and age groups.
9. Re-run supply-chain audit after final dependency lockfile changes and document exceptions.

## Operational checklist

- No secret printed in docs, client JS, screenshots or CI logs.
- Server-only AI API keys remain out of Vite `VITE_*` variables.
- Production fails closed for missing critical configuration rather than using a misleading demo mode.
- Reverse proxy sets HTTPS and correct forwarded headers without trusting arbitrary internet clients.
- Staging uses test data and secrets distinct from production.

## Outcome

**Not approved for public release.** Existing automated tests and code inspection cannot certify security, privacy compliance or safety for child accounts.
