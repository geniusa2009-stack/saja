# SAJA — Public Release Gate Checklist

**Current recommendation: NO-GO for public release (2026-11-07).** Historical test passes are not the same as content, legal, security and deployment authorization.

## Engineering — historical pass; re-run on candidate SHA

- [ ] Record exact `release/integration` SHA and clean/understood Git status.
- [ ] Fresh `npm run check` passes with zero unexpected skips.
- [ ] Fresh game E2E, adult/guardian/staff journeys all pass against candidate build.
- [ ] Fresh Arabic/English layout and keyboard/accessibility sweeps, plus real assistive technology.
- [ ] Real GPU/mobile performance captures and fallback validation.

## Religious content and rights — blocking

- [ ] Expert review and sign-off on Quran explanation, morphology and tafsir.
- [ ] Authorized source license and attribution for Quran corpus recorded.
- [ ] Full-verse English translation rights secured or all restricted material absent from every public bundle and data route.
- [ ] Hadith matns and grading validated against the cited editions by a qualified reviewer.
- [ ] Scholar-approved content revision manifest exists; drafts are not labeled approved.

## Security and privacy — blocking

- [ ] Child-appropriate privacy, consent, retention, deletion, guardian and moderation review complete.
- [ ] Independent security assessment of public/staff/auth flows complete and severe findings closed.
- [ ] Current dependency audit complete and exemptions documented.
- [ ] Secrets, TLS, trusted proxy, secure cookies, backups and logging verified.

## Operations and launch — blocking

- [ ] HTTPS staging URL exists and is independently reachable.
- [ ] Staging user journeys and 3D/static asset smoke checks pass.
- [ ] DB/upload persistence and restore drill pass.
- [ ] Operator runbook, monitoring alerts, ownership and rollback tested.
- [ ] Public release approval recorded with accountable named reviewers.

## Decision

**NO-GO.** Missing approvals and infrastructure are product/release blockers, not software compilation failures. A limited internal test may continue without waiving public release criteria.
