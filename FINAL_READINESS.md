# SAJA — Final readiness

**Date:** 30 September 2026 · **Product frozen for real-world validation.**

**SAJA is not production-ready.** The software works end to end and its safety rules hold under direct attack, but it has not yet been validated in the real world. All religious content is unreviewed demo content, and no real external service has been connected. The blockers are listed at the end.

## What was verified in this pass

| # | Check | Result |
| --- | --- | --- |
| 1–2 | `npm run saja -- doctor` | Every external service: **NOT CONFIGURED** (table below). Nothing is PASS, FAIL or NOT TESTED, because no credentials exist in this environment. |
| 3 | Environment variables vs `.env.example` | All 24 server settings are documented, with none missing and none extra. Each is labelled required, optional or development-only. The only other variables read are for the test tools (`SAJA_URL`, `SAJA_SHOTS`, `CHROME_PATH`, `SIZES`, `E2E_*`). The frontend reads no secrets, and the built bundle contains no secret names or keys. |
| 4 | Migration path | **Clean database:** all 5 migrations apply in order, and a second run applies none. **Existing data:** a database at the previous schema, holding a demo document with a staff draft, a mission, a sample and a real scholar, and review history, upgrades with only the missing migration. The draft stays unserved, the sample becomes `sample`, the real scholar stays `verified`, and history is kept (`migrations.test.ts`). A real on-disk database from earlier sessions also started cleanly: 226 chunks re-indexed in 112 ms, health `ok`. |
| 5 | Content-review workflow, end to end | `sh e2e/staff.sh`, **10/10** in a real browser on a throwaway database. Two scholars verified; a draft invisible to learners; author refused approval of their own version; approved ≠ published; after admin publishing the learner sees *Reviewed* and Siraj answers from v2. A mission text and a claim rule follow the same path; the dashboard and audit trail match. |
| 6 | Demo can't appear as published/reviewed | `honesty.test.ts`: all 19 entries, 12 missions, Daily Deen, Siraj answers and AMANAH/NOUR rules report demo or unreviewed on a seeded database. System status says `reviewed: false`. |
| 7 | Sample scholar can't appear as verified | Sample answers and public profiles say `sample`. 0 verified profiles; the database refuses `verified` for a sample (`honesty.test.ts`, `migrations.test.ts`, `review.test.ts`). |
| 8 | Child safety via direct API | 49 tests pass across the adversarial, community, private-message, time-limit and security suites, plus the Arabic child + guardian journey, 9/9. |
| 9 | Account deletion incl. private files | 8 tests pass, including storage failure on some files (retried with growing back-off, visible in `/health`), staff and content-editor accounts, and guardian cascade. |
| 10 | Notifications and reconnect | 18 tests pass: schedule, deliver, dedupe, cancel, preferences, no push for children, a real signed and encrypted push to a local HTTPS receiver; offline outbox, retry, stale-mark dropping, reconnect and flush. |
| 11 | AMANAH/NOUR without providers | 25 tests pass. Images: "OCR unavailable"; audio and video: "transcription unavailable"; video without ffmpeg reports what was not read; exhausted AI allowance means "unavailable", never a guess. The e2e covers an image in NOUR. |
| 12 | Final production build | `npm run check` passes: typecheck, lint, **380 tests** (243 server, 137 frontend) and build. End-to-end **35/35** (adult 16, child + guardian 9, staff 10); layout 17 screens × 375/768/1280 × EN/AR clean; axe-core WCAG 2.1 A/AA shows no serious or critical violations on 17 screens × EN/AR × 375/1280. |

### Service doctor (exact output)

| Service | Status |
| --- | --- |
| Claude (Siraj answers) | NOT CONFIGURED |
| OCR (images/PDFs) | NOT CONFIGURED |
| Voyage (retrieval) | NOT CONFIGURED |
| Transcription (audio/video) | NOT CONFIGURED |
| Video frames (ffmpeg) | NOT CONFIGURED |
| Push notifications | NOT CONFIGURED |
| Email (SMTP) | NOT CONFIGURED |
| Managed Postgres | NOT CONFIGURED |

## Readiness by area

| AREA | STATUS | EVIDENCE | BLOCKER | EXACT NEXT ACTION |
| --- | --- | --- | --- | --- |
| Content | NOT READY | Workflow proven (staff e2e 10/10); honesty sweep; dashboard shows 0 published of 19 knowledge, 12 missions, 16 rules, 4 stories, 4 quizzes; 19 Daily Deen follow knowledge | No item reviewed by a real scholar | Verify ≥2 real scholars, then follow `docs/CONTENT_REVIEW.md` item by item, starting with the 19 knowledge entries |
| AI | NOT READY | Doctor: NOT CONFIGURED. SDK contract tests (request shape, refusal, cut-off, overload, timeout); budget and caching tests | No `ANTHROPIC_API_KEY`; never called live | Set `ANTHROPIC_API_KEY`, run `npm run saja -- doctor` (expect PASS), then run the RAG evaluation with the live model and read every answer |
| RAG | READY WITH LIMITATION | 34 EN/AR questions × with/without a hallucinating model, plus 6 source-error cases (`rag-eval.test.ts`); no invented sources; rulings escalate; off-topic not routed to scholars | Local keyword-level retrieval only (Voyage NOT CONFIGURED) | Set `VOYAGE_API_KEY`, restart (automatic re-index), run doctor, re-run the evaluation and compare results |
| Scholars | READY WITH LIMITATION | Five explicit states; sample locked by the database; verification needs a linked account and recorded credentials; no self-approval; impersonation tests | 0 real verified scholars; credential checking happens outside SAJA | Appoint the reviewing scholars, check their credentials offline, record and verify them in Staff console → Scholar verification |
| Community | READY WITH LIMITATION | Circles, chat, replies, reactions, pins, reports, blocks, moderation queue, adult private messages, live updates (community/dm/adversarial tests, e2e) | No trained moderators assigned | Grant `moderator` to trained people; agree response times for the moderation queue |
| Child Safety | READY WITH LIMITATION | 49 direct-API tests + child e2e 9/9: consent required, age bands separated, no private messages, contact details blocked before storage, server-side time limit, forged role/age/guardian/verification refused | Age is **declared**, not verified; a child can clear the app and start again; no legal review | Legal review of children's-data duties per market; decide on an age-assurance approach (see `docs/SAFETY_AND_SECURITY.md`) |
| Security | READY WITH LIMITATION | Auth, sessions (flags, rotation, hashing, expiry), CSRF, IDOR, uploads, file access, role escalation, moderation bypass, scholar impersonation, deletion — all tested; CSP verified | No external penetration test; the real infrastructure isn't reviewed | Commission an external penetration test of a staging deployment; review TLS, database access, secrets storage and backups |
| Notifications | READY WITH LIMITATION | 18 tests including real signed and encrypted push and real SMTP to local receivers | Push and SMTP NOT CONFIGURED; no real device or mail server | Generate VAPID keys, set `SMTP_URL`, run doctor; subscribe a real phone and confirm a reminder arrives; send a real reset email |
| AMANAH | READY WITH LIMITATION | Server audits, verdicts only from curated rules, honest "unavailable", review-state note (0 of 16 rules reviewed) | Claim rules unreviewed; OCR/transcription NOT CONFIGURED | Scholar review of the 16 rules; configure transcription if creators need audio/video |
| NOUR | READY WITH LIMITATION | Same pipeline; e2e checks text, and images degrade honestly | OCR, transcription and ffmpeg NOT CONFIGURED | Set `ANTHROPIC_API_KEY` (OCR), transcription and `FFMPEG_PATH`; run doctor; test real screenshots and voice notes in both languages |
| Game | READY WITH LIMITATION | Frame-by-frame review of intro, walking, camera, markers, unlocks, reward and Siraj's context; 60 fps median in headless Chrome | Not tested on real phones | Play the full journey on at least one mid-range Android and one iPhone, in both languages |
| Adaptive Learning | READY | Struggle → alternative mode → guided retry → success stored on the server; the failed mode isn't offered again; the mode that worked comes first (unit + server tests, e2e step 4) | — | Watch real learners' sessions and compare the recommendations with what helped |
| My Day | READY | Server plan from structured constraints (no raw notes stored), prayer times, reminders, goals, focus mode; layout checked at the longest countdown text | — | Check prayer times against a local mosque timetable for each launch city |
| Accessibility | READY WITH LIMITATION | axe-core clean (no serious or critical) on 17 screens × EN/AR × 375/1280; keyboard walking and missions; reduced motion | No real screen-reader session; staff console not audited | Test VoiceOver (iOS) and TalkBack (Android) on the onboarding → first mission flow in both languages |
| Deployment | READY WITH LIMITATION | Env vars documented and classified; migrations from clean and existing data; health endpoint; doctor command; no secrets in the bundle | Managed Postgres NOT CONFIGURED; single instance; embedded database is development-only | Provision Postgres 15+ with pgvector, set `DATABASE_URL`, `APP_ORIGIN`, `SAJA_ENV=production`; run `npm run saja -- migrate` then `doctor` on staging |

## Real-world blockers (all open)

1. **Scholar review**: 0 of the 19 knowledge entries, 12 missions, 16 claim rules, 4 stories and 4 quizzes are reviewed and published.
2. **Real scholar credential verification**: 0 verified scholars; the only profiles are 2 samples.
3. **Real AI provider credentials**: `ANTHROPIC_API_KEY` not set; Claude never called live.
4. **Real retrieval provider**: `VOYAGE_API_KEY` not set; retrieval is keyword-level.
5. **Real transcription/OCR where needed**: transcription, OCR and ffmpeg not configured.
6. **Real push/email infrastructure**: VAPID keys and SMTP not configured.
7. **Managed Postgres**: `DATABASE_URL` not set; only the embedded development database has been used.
8. **Legal/privacy review**: retention periods, consent wording, children's-data obligations.
9. **External penetration test**: not done.
10. **Real-device testing**: only headless Chrome with phone emulation; no real phones or screen readers.

## Known open issue

- The child + guardian journey failed once (steps 5–8) when the whole end-to-end suite ran twice back to back. It did not recur in 7 later runs, including the final 35/35. Cause not confirmed.
