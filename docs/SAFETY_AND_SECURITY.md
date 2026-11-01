# SAJA — child safety and security

What SAJA enforces on the server, what it does **not** do, and the tests that prove each point. Every rule below is checked by the server on every request; the app's screens only reflect it.

## Age: declared, approved, consent (and what SAJA does not verify)

SAJA stores three separate facts. It **never verifies identity or age** and never claims to.

| Fact | Set by | Meaning |
| --- | --- | --- |
| **Declared age group** (`child` under 13 · `teen` 13–17 · `adult`) | the person, during onboarding on their device | what they said. A declared younger group can't move itself older. |
| **Approved age group** | a linked guardian (for their child) or an administrator | someone responsible *confirmed* the group. Still not an identity check. |
| **Guardian consent** (`not_required · pending · granted · revoked`) | an adult account that entered the child's one-time code and ticked consent | required before a child can join any circle. Revoking removes the child from every circle. |

The effective age group is the approved one if set, otherwise the declared one. The account screen and the guardian panel show all three with these exact names, and say that none of them is an identity check.

**Known gap**: a child can clear the app's data and start a new guest journey declaring another age. A guardian link binds an *account*, not a device. Closing this gap would need an identity or age-assurance provider and a legal basis; it is a product/legal decision, not built.

## Child safety (server-enforced)

| Rule | Tests |
| --- | --- |
| Adults can't see, join or read children's circles; bands never mix | `adversarial.test.ts` › age separation |
| Children and teens can't send or receive private messages; adults can't reach them | `dm.test.ts` › children, teens and guests…; e2e child journey step 3 |
| Guardian consent required; codes can't be guessed, reused or self-issued; children/teens can't be guardians | `adversarial.test.ts` › forged guardians; e2e child journey steps 2, 5–7 |
| Daily time limit measured by the server; can't be bypassed by skipping heartbeats, fake usage or pauses; only the guardian adds time | `timelimit.test.ts`; e2e child journey step 6 |
| Phone numbers, emails, handles, addresses and "meet me" messages from children are refused **before storage**; from adults they're held for a moderator | `adversarial.test.ts` › child safety in messages; `community.test.ts`; e2e child step 8 |
| Roles and age can't be forged from the client | `adversarial.test.ts` › forged roles, forged age |
| Scholar verification can't be forged; names can't claim a role | `adversarial.test.ts` › scholar impersonation; `review.test.ts` › scholar verification states |
| Moderation can't be bypassed (held messages hidden, not reactable, not repliable) | `adversarial.test.ts` › moderation bypass |
| No push notifications for children, even when push is configured | `notifications.test.ts` › children never get push |
| Stricter memory defaults for children (schedule and conversations off, can't be enabled) | `learning.test.ts` › children cannot enable memory categories… |

## Security audit map

| Area | What is checked | Tests |
| --- | --- | --- |
| Authentication | scrypt hashes; sign-in rate limit; reset links single-use, 30 minutes; reset signs out everywhere; reset request identical for known/unknown emails, even when SMTP fails | `auth.test.ts`, `security.test.ts`, `providers-contract.test.ts` (SMTP) |
| Sessions | random tokens stored only as SHA-256 hashes; `HttpOnly; SameSite=Lax; Path=/` (+ `Secure` in production); rotated on sign-up/sign-in (no fixation); expiry; tampered/revoked cookies = signed out | `security.test.ts`, `adversarial.test.ts` › sessions and CSRF |
| CSRF | writes need the `x-saja-csrf` header and a same-origin `Origin` | `adversarial.test.ts`, `auth.test.ts` |
| Authorization | every staff endpoint refuses learners and guests; publishing only by admins after a verified scholar's approval; authors can't approve their own versions | `security.test.ts`, `review.test.ts`, `adversarial.test.ts` › publishing |
| IDOR | attempts, questions, notifications, audits, uploads, DM threads of others: 404 / no effect | `adversarial.test.ts` › object-level access, `security.test.ts`, `dm.test.ts` |
| Uploads & file access | extension + declared type + magic-byte sniffing; size limit; no SVG/HTML; original names not kept; random storage keys; **no endpoint returns raw files** | `adversarial.test.ts` › upload abuse |
| Role escalation | roles only via the operator CLI or admin action with a reason; no self-removal of admin | `adversarial.test.ts` › forged roles |
| Account deletion | every personal row, private files (queued in the same transaction, retried with back-off on storage failure), pending queues; accountability records kept without identity | `lifecycle.test.ts` |
| Transport & browser | strict CSP, HSTS (production), `nosniff`, `referrer-policy`, `frame-ancestors 'none'`; the audit tools' injected scripts are blocked by the CSP (they must bypass it deliberately) | production smoke checks; `e2e/a11y.mjs` note |
| AI safety | answers only from supplied evidence; invented citations, wrong verse numbers or hadith named in prose → `uncertain` and not shown; personal rulings → a scholar; "is there a hadith…?" never confirmed | `rag-eval.test.ts`, `siraj.test.ts` |

## Not done (needs people outside the codebase)

- **External penetration test**: none has been done.
- **Legal review**: retention periods, consent wording, children's-data obligations per country (COPPA, GDPR-K, UK Age-Appropriate Design Code…).
- **Age assurance**: see the known gap above.
- **Dependency and infrastructure review** of the real deployment (TLS, database access, backups, secrets storage).
