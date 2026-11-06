# SAJA — Data, privacy and retention

This page lists every kind of personal data SAJA stores on its server, why, and when it is deleted. It describes the code as built. It is **not** a legal privacy policy; that still needs legal review for each country SAJA operates in.

## Principles

- **Guest first.** No account is needed. A guest journey is created only after someone makes a traveller.
- **Memory is the person's choice.** Four categories (learning style, topics, schedule, Siraj conversations) can each be switched off. Switching one off deletes what was stored for it. Children get stricter defaults (schedule and conversations off, and they can't be turned on).
- **Children:** no private messages, no push notifications, community access only with guardian consent, and a daily time limit measured by the server (45 minutes by default).
- **Nothing is sold, and no third-party trackers run.** Analytics is a closed list of event names with small non-content properties, stored in SAJA's own database.

## What is stored

| Data | Why | Kept until |
| --- | --- | --- |
| Email and password hash (scrypt) | Signing in | Account deletion |
| Session token **hash**, created/expiry/last-seen times (no IP, no user agent) | Staying signed in | Expiry (60 days) or sign-out; expired rows are purged hourly |
| Password-reset token **hash** | Reset link (single use, 30 minutes) | Purged 1 day after use or expiry |
| Traveller: display name (max 24 characters), character look, purpose, level, goals, interests, locale | The journey | Account deletion |
| Age: declared band, approved band, guardian consent state (no birth date) | Child safety | Account deletion |
| Guardian link (hashed one-time code), parental settings, circle approvals | Child safety | Account deletion (either side). If a guardian deletes their account, the child's consent is revoked. |
| Mission attempts, results, achievements, world location | Progress | Account deletion |
| Learning signals, learner model | Adaptive learning | Only while "topics"/"style" memory is on; deleted when switched off |
| Daily plan: structured constraints ("busy", "exam tomorrow", minutes). The person's own words are sent only by the legacy note endpoint, and only kept if "schedule" memory is on. | My Day | Account deletion |
| Prayer location: city **or** coordinates rounded to ~1 km, time zone, method | Prayer times | Account deletion |
| Prayer marks (self-reported) | My Day | Account deletion |
| Daily usage seconds (children only) | Guardian time limit | 60 days |
| Siraj conversation history | Only if "conversations" memory is on (always off for children) | Deleted when switched off |
| Circle messages, reactions, reports, blocks | Community | Account deletion |
| Private messages (adults only) | Community | Account deletion (either participant deletes → thread deleted) |
| Scholar questions (with personal details redacted before storage) and answers | Ask a Scholar | Account deletion (asker). Answers stay attributed to the scholar profile. |
| Uploads (private files, random keys; original file names are **not** kept) | AMANAH/NOUR | Deleted with their audit, on request, or with the account. Deletion is queued and retried until the file is gone. |
| AMANAH/NOUR audits: extracted text, claims, verdicts | The person's audit history | Until they delete the audit or the account |
| Notifications | Inbox | Read or cancelled notifications: 90 days |
| Analytics events (name + small properties, no content) | Product health | 180 days, or account deletion |
| Moderation actions (who acted, why, which categories) | Accountability | Kept. If the acting person deletes their account, the record stays with no actor reference. |
| Content reviews and scholar workflow events | Accountability for religious content | Kept, same as above |
| Email outbox: without SMTP, the full message (including the reset link); with SMTP, only the recipient and "[sent via smtp]" | Development / delivery record | 1 day |

**Abandoned guest journeys** (no activity for 90 days, never upgraded to an account) are deleted automatically, files included.

## Deletion

`POST /api/auth/delete-account` removes the account and every row linked to it in one transaction. Private files are handled by an outbox: their storage keys go into `pending_file_deletions` inside the same transaction, then they are removed straight away. If storage fails, the scheduler retries with backoff until the files are gone. Records that exist for accountability (moderation decisions, content reviews) are kept without the person's identity.

## Logs

Logs are JSON lines. Fields named like passwords, tokens, bodies, questions, content, text, emails, secrets or keys are redacted automatically. AI calls log their purpose, provider, model, latency, token counts and outcome, never the prompt, the file or the answer. Which external AI providers may receive what is described in [AI_PROVIDERS.md](AI_PROVIDERS.md#privacy); free tiers may use submitted content to improve their products, so review each provider's terms before enabling it.

## Known limits

- **Age is declared, not verified.** A guardian link binds an account, not a device. A determined child can clear the app's data and start a new guest journey with a different age. Stronger age assurance would need an identity provider and a legal basis.
- Retention periods are product defaults and need legal review per jurisdiction.
- Backups (outside the app) must follow the same retention schedule. That is an operator task.

## Third-party requests from the browser

None for fonts: the web fonts (Manrope, Instrument Serif, IBM Plex Sans Arabic, Reem Kufi, Amiri, JetBrains Mono; SIL Open Font License 1.1) are bundled and served from SAJA's own origin, so opening SAJA does not send a visitor's IP address to a font CDN. The Content Security Policy only allows fonts from `'self'`.
