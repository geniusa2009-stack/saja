# SAJA — Architecture

SAJA is a React single-page app (Vite + TypeScript) backed by a TypeScript API server (Hono on Node) and PostgreSQL. The world, missions and adaptive engine run in the browser so play stays instant; everything that must be trusted — who someone is, their age and consent, what they may see, what gets stored, verification and moderation — is decided by the server.

The app also runs with **no server at all** (static hosting, network down, tests). It then says so ("Offline demo") and keeps the Phase 1 on-device behaviour, with client-side safety rules as the only line of defence. The UI never presents a demo path as real.

```
src/                       Web app
  api/                       client.ts (fetch, CSRF header, typed errors, offline detection)
                             sync.ts (session bootstrap, server-authoritative cache, progress replay, SSE)
                             daySync.ts (My Day mirroring + real reminders) · push.ts (Web Push opt-in)
  domain/                    Pure logic shared by browser AND server (safety, adaptive, planner,
                             prayer times, world unlocks, mission definitions, scholar routing, question organiser)
  content/                   Demo seed content (world, missions, knowledge, claim rules, circles)
  services/                  tutor.ts (Siraj: server pipeline when online, offline guide otherwise)
                             verification.ts (curated verifier) · audits.ts (server AMANAH/NOUR)
  store/                     Zustand stores = device cache; connection.ts = online/offline + session
  features/                  Screens (world, missions, tutor, trust, scholar, community, day, profile…)
                             + account/ (account, inbox, capability sheet) + staff/ (moderation, review, verification)
server/                    API server
  config.ts                  Env → config + capability modes (real vs demo vs unavailable)
  db/                        Postgres (pg) or PGlite adapter · SQL migrations · idempotent demo seed
  auth/                      Guest/account sessions, access (roles, age, consent, policy, memory), middleware
  ai/                        AIProviderRouter + adapters (Gemini · Groq · OpenRouter · Mistral · Anthropic), capability
                             registry (models.ts), embeddings (Gemini | Voyage | local lexical), transcription adapter
  modules/                   knowledge (RAG, versions, review) · siraj · missions · day/prayer · notifications
                             community (circles, chat, reports, blocks, moderation, DMs) · scholar · trust (uploads, audits)
                             guardian · profile/memory · analytics · stream (SSE) · moderation classifier
  cli.ts                     Operator CLI: roles, VAPID keys, migrations, dev outbox
  test/                      Integration tests against a real in-memory Postgres (PGlite)
```

## Backend

- **HTTP**: Hono under `/api`. JSON in/out, every body validated with zod. Errors are typed (`bad_request`, `unauthenticated`, `forbidden`, `not_found`, `conflict`, `rate_limited`, `policy_blocked`, `unavailable`, …); malformed ids become 404, never 500.
- **Database**: PostgreSQL with pgvector. `DATABASE_URL` → node-postgres pool. Without it, PGlite (real Postgres compiled to WASM) on local disk, guarded by a single-process lock, or in memory for tests. Plain SQL migrations (`server/db/migrations`) run on start.
- **Sessions**: opaque random tokens, stored as SHA-256 hashes, sent as an `HttpOnly; SameSite=Lax` cookie (`Secure` in production), rotated on sign-in/sign-up. Passwords use scrypt. Password reset tokens are single-use, expire in 30 minutes, and sign the account out everywhere.
- **CSRF**: every non-GET request must carry `x-saja-csrf: 1` (a header browsers can't send cross-site without a CORS preflight, which the API never grants) and, when present, a matching `Origin`.
- **Rate limits**: token buckets per user/IP for auth, AI, chat, scholar, audits, uploads, search, plus a general write budget on every state-changing request.
- **Scaling seams**: `EventBus`, `RateLimiter` and `AiBudget` are interfaces with single-process defaults (see DEPLOYMENT.md).
- **Realtime**: Server-Sent Events (`/api/stream`) fed by an in-process bus: chat messages and reactions for the person's circles, notifications, scholar-answer and audit updates. Blocked authors are filtered server-side.
- **Scheduler**: a 30-second loop delivers due notifications (in-app via SSE; Web Push when configured and allowed).
- **Static**: in production the same process serves the built app with CSP, HSTS, `nosniff` and immutable asset caching, so the app and API share one origin.

## Identity, age and roles

- **Guest first.** A guest session is created only once someone has made a traveller. Signing up upgrades that guest in place, so the journey is kept.
- **Roles** (`learner`, `guardian`, `mentor`, `scholar`, `moderator`, `admin`) live in `user_roles`. They are granted by the operator CLI or by server actions (for example accepting a guardian link grants `guardian`), never by the client.
- **Age** is stored as `declared_band`, `approved_band` and `guardian_consent` (`not_required | pending | granted | revoked`). Someone who declared a younger band can't move themselves older (403 + `needsGuardian`). A child's community access requires consent from an adult account that entered the child's one-time link code. The guardian then controls circle approvals, reply mode, daily time and the approved band, and can revoke consent (which removes the child from every circle).
- `loadAccess()` computes the effective band, safety policy, community permission and memory permissions for **every request**. The client's copy is a display cache that the server overwrites on each session start.

## Knowledge & trust

- Tables: `knowledge_sources`, `knowledge_documents` (+ append-only `knowledge_document_versions`), `knowledge_chunks` (text + `vector(256)` embedding + keywords), `knowledge_claims`, `knowledge_relationships` (typed graph), `content_reviews` (audit of every status change), `daily_content`.
- **One review workflow for all religious content** (`server/modules/content/review.ts`): `draft → internal_review → scholar_review → approved → published` (+ `archived`) for knowledge documents, **missions**, and the texts that ship in code (**AMANAH/NOUR claim rules, explainer stories, Siraj quizzes**). Staff (moderator/scholar/admin) move drafts forward; only a **verified, non-sample scholar** can approve, and **never a version they wrote** (four eyes); only an **admin** can publish, and only what was approved. Every step goes to one ledger, `content_reviews` (subject, version, from/to, reviewer, role, scope, note, reviewing scholar) and into the staff audit trail. Demo content is seeded as `draft` with `is_demo = true`, so it can never pass for reviewed content.
- **Texts in code** (`content_blocks`): at start-up the server hashes each claim rule, story and quiz and records a version per distinct text. A review applies to that exact snapshot: if the code's wording changes, the block gets a new version and goes back to `draft`, losing `published`, with a warning logged.
- **Editing**: knowledge documents can be created (as invisible drafts) and edited through the staff content studio. Missions are edited **text-only**: every EN/AR pair can change, the structure (ids, order, answers, rewards, unlocks, interaction type) can't, so an edit can never break a mission. A version nobody reviewed is edited in place; a version that entered review, was served as demo or was published is frozen and the edit becomes a new version.
- **Status dashboard** (`GET /api/content/status`): per content type, counts by review state and by what learners receive (published / demo / not shown), Daily Deen (which follows its documents), scholar profiles by verification state and sample vs. real answers. All counted from the database.
- **Served versions**: learners get `published_version` (the last version a verified scholar approved and an admin published) or, until something is published, the seeded **demo baseline** (`demo_version`, flagged as demo everywhere). A staff draft, including an edit of demo content, is never served. Editing never replaces what learners see until that version is published. Production documents still in review are invisible to learners: not listed, not retrievable, not answerable by Siraj. Staff can preview any version with `?as=staff`, which the server checks against their roles.
- **Provenance**: each version stores its origin (seed-demo / staff-edit), sources (ref, kind, rendering) and change note. Each review step records role, scope and, for approvals, the reviewing scholar's profile. The client pins the version a person first received (`?version=`) for the whole session.
- **Missions** are versioned and served the same way (`mission_versions`, `published_version`, `demo_version`). The client plays the server's pinned definition (payload, title and summary included), and every attempt records the `mission_version` played. Offline, the bundled demo definitions are used and labelled.
- **Retrieval**: hybrid scoring = 0.5 × vector similarity + 0.35 × keyword match + 0.15 × token overlap, with a grounding floor (keyword hit or ≥ 2 overlapping stems) and a minimum score. Filters: language, topics, source kinds, served version, not archived. The local embedder normalises Arabic (hamza forms, taa marbuta, diacritics) and applies light stemming in both languages (أتوضأ ↔ الوضوء, prayers ↔ prayer); keyword hits are de-duplicated by stem and exact multi-word phrases count double. It is keyword-level, not semantic: `GEMINI_API_KEY` (Gemini embeddings, the default when set) or `VOYAGE_API_KEY` gives real semantic retrieval. If the remote embedder is rate-limited, out of quota or failing for a query, or no chunk carries the current model's vectors yet, retrieval runs on keywords and shared words only. It never compares vectors from different models.
- **Re-indexing**: embeddings are tagged with the model that made them and retrieval only compares like with like. On start-up, chunks embedded by another model (after adding `GEMINI_API_KEY`, changing the embedding model, or upgrading the local embedder) are re-embedded once. A failure is logged and shown in `/api/system/health` (`staleEmbeddings`, `ok: false`).

## Siraj (AI guide)

Pipeline: normalise → distress check (caring human reply, no model) → personal-info note → **needs-a-scholar check** (ruling / personal situation / any "is X haram/halal?" → `requires-human-review` + scholar route) → retrieve → nothing grounded → `uncertain` + scholar route (or, if the question isn't about Islam at all, an honest "outside what I can help with", with no scholar offer) → extractive answer from curated text → optional model call → **citation validation** → status.

- The model is chosen per request by the provider router (see *AI providers* below): Gemini first, then Groq, OpenRouter and Mistral, preferring a provider strong in the answer's language. It sees only the retrieved evidence, returns JSON (status, answer, citations) that is validated against the schema, and must cite evidence IDs. Citations that weren't provided are dropped. Quotes that don't appear in the evidence, and **references named in the prose** (Qur'an verse, hadith collection + number, in English or Arabic, ranges expanded) that weren't among the supplied sources, downgrade the answer to `uncertain`; the invented text is never shown. Any failure on every provider (refusal, timeout, invalid output, rate limit, quota, bad key) falls back to the extractive answer. A failure never becomes an answer, and the same validation applies whichever provider answered.
- Statuses shown to people: `supported`, `context-needed`, `uncertain`, `requires-human-review`, `guide`, plus how the text was produced (`ai` from cited sources / `extractive` / `rules`) and whether the underlying content is demo.
- Cost controls: deterministic answers for simple/deep/example/why/source intents; a 24-hour answer cache keyed by document version; a per-user daily model budget; low/medium effort; an AI rate limit.
- Without any usable provider, answers are extractive (offline mode) and `/api/system/status` says `modes.ai: demo`, `ai.state: offline`.

## AMANAH / NOUR

`POST /api/uploads` (magic-byte sniffing and extension/type/size checks; stored privately under random keys, never served back) → `POST /api/audits` → ingest → extract (plain text; images and PDFs through a provider with vision/PDF capability; audio and video through a Whisper-compatible transcription service, or else a provider that accepts audio/video natively (Gemini), which also reads on-screen text in videos) → claim detection (curated rules, optionally extended by model-listed claims that must appear verbatim in the text) → retrieval → verdict from **curated rules only** → persisted claims with evidence and suggestions.

Verdicts: `supported`, `needs-context`, `mismatch`, `unverified` (no source found), `review` (a human must decide). The model never produces a verdict. A missing OCR or transcription provider gives `status: unavailable` with `ocr_unavailable` / `transcription_unavailable`, never a guessed result. SUGGEST REVISION records a `content_revisions` row. SEND TO SCHOLAR REVIEW creates a real `scholar_questions` row tagged `amanah`/`nour`.

## Community & safety (server-enforced)

- Circles are visible only to their age band (staff excepted). Joining needs, depending on the person: guardian consent (children), guardian approval of that circle, or an account (non-child guests).
- Messages: membership check → consent check → quick-reply-only mode (guardian setting) → reply target in the same circle → idempotent `clientId` → classifier (`spam`, `harassment`, `personal_info`, `scam`, `unsafe_contact`, `sexual`, `threat`, `off_platform`). For children and teens, contact/harm categories are **blocked** (422, not stored as visible). For adults they are **held** for a moderator and visible only to the author.
- Reports hide a message immediately when a young member reports "unsafe" or when three people report it. Blocks hide the blocked person's messages everywhere, including the live stream.
- Moderators work from a queue (held messages, reports, held scholar questions). Every action needs a reason, is written to `moderation_actions` with actor kind (`system` / `human`), and notifies the author.
- Direct messages exist only between adults with accounts who share a circle, are re-checked on every send (age, blocks), and are moderated.

## Scholars

Questions are redacted (phone numbers, emails, handles), classified, then `queued`, or `held` for a moderator. The "Help me phrase it" step is labelled AI assistance and never answers. Scholars see an inbox with the question and topic, **never the asker**. They must be verified and must claim a question before answering. Admins create scholar profiles (as `pending`) and verify them with a recorded scope, verifier and timestamp; verifying requires a linked account and the credentials the admin checked (outside SAJA) to be recorded. Verification states are explicit: `unverified`, `pending`, `verified`, `suspended` and `sample`. `sample` is its own state, tied to `is_demo` by a database constraint, and can never be changed. The VERIFIED badge appears only for a verified, non-sample profile. Display names can't claim a role or verification ("Verified Scholar", "SAJA Moderator", "مشرف"…); badges come only from server state.

## Guardian time limits

Measured by the server, not the client (`server/modules/usage.ts`). Every authenticated request from a child adds the time since their previous activity; gaps over 5 minutes count as breaks. The app sends a heartbeat while visible so quiet play counts too. Skipping heartbeats never reduces the total, and client-sent numbers are ignored. At the limit, **new** experiences are refused (starting missions, Siraj, chat, reactions, scholar questions, AMANAH/NOUR, uploads) with `reason: time-limit`. Completing an attempt already in progress is allowed, so progress is kept. Guardians see today's usage and can add time; the child can't. Offline the limit can't be measured, and the UI says so rather than pretending.

## Private messages (adults only)

Request → accept/decline → messages, with close, block and report. Both people must be adults with accounts who share a circle, and the server re-checks age, account, blocks and thread state on every send. The classifier holds contact-sharing for moderators, reports hide a message for the reporter (and for everyone when reported as unsafe), and moderators act from the same queue with a required reason. Children and teens are refused before anything else.

## Data lifecycle

Account deletion removes every personal row in one transaction and queues private files in `pending_file_deletions` in the same transaction; the scheduler retries until they are gone. Hourly retention purges expired sessions and reset tokens, old analytics and read notifications, abandoned guest journeys and usage counters. See [PRIVACY.md](PRIVACY.md).

## AI providers

Every model call goes through one `AIService`, the `AIProviderRouter` (`server/ai/router.ts`). Provider facts (default model, declared capabilities, languages, inline size limit, free-tier caps, paid or not) live in one registry, `PROVIDER_CAPABILITIES` (`server/ai/models.ts`). Each fact can be overridden from the environment. See [AI_PROVIDERS.md](AI_PROVIDERS.md).

- **Routing** is deterministic. Required capabilities come from the request content (text, image → `vision`, PDF → `pdf`, audio, video). Candidates are the configured providers in priority order (`SAJA_AI_PROVIDER_ORDER`, default Gemini → Groq → OpenRouter → Mistral → Anthropic). A provider is dropped if it lacks a capability, the file is too large, it isn't allowed for sensitive tasks, it is paid while paid use isn't allowed, it is cooling down after a 429 or failures, its key was rejected, or SAJA's own daily/minute cap is reached. Hints re-rank without breaking ties randomly: `latency: fast` puts fast providers first for text-only tasks, and `language` puts providers strong in that language first. At most 3 providers are tried within a latency budget.
- **Failures**: `refused` is final (never shopped to another provider). Timeouts, 5xx, network errors, invalid or schema-mismatched output, 429 and rejected keys move on to the next provider. 429 retry times (header or Google `RetryInfo`) are respected, and a per-day limit or a rejected key sets the provider aside for an hour. Nothing left → `{ ok: false }` → the deterministic path.
- **State** (`offline`, `unverified`, `available`, `fallback`, `unavailable`) comes from real calls. People see "AI available / Using fallback / AI temporarily unavailable / Offline mode", never provider names.
- **Embeddings**: `EmbeddingProvider` (`gemini` by default when keyed, `voyage`, `local`), guarded for free tiers: a query cache, local caps, and a cool-down after 429.

## AI cost & safety guard

Every model call goes through the router's telemetry (purpose, provider, model, latency, tokens, outcome; never content), its per-provider free-tier caps and cool-downs, and a per-user daily `AiBudget` shared by Siraj, question organising, OCR, frame OCR and claim extraction. Cheaper paths come first: deterministic intents, a 24-hour answer cache keyed by document version, reuse of an earlier extraction of the same file, no claim-extraction call for short texts. Model inputs are compacted, outputs are capped (Siraj: 900 tokens), and identical in-flight requests share one call. Exhausted budgets or providers fall back to extractive answers, or to an honest "unavailable".

## Offline & reconnect

Without a server the app runs as the Offline Demo. If the server drops mid-session, the badge says "Offline · will sync". Safe, idempotent writes (prayer marks, plan items, goals) are queued in a small outbox, with last write per key winning and day-specific marks dropped once the day has passed. Missions are replayed and re-validated by the server. Anything that reaches another person (messages, questions, reports, audits) is never queued; it is refused while offline. A probe (every 30 seconds, and on the browser's `online` event) reconnects, re-bootstraps and flushes the queue.

## Memory & privacy

Four categories (style, topics, schedule, conversations) with policy limits by age. The server stores learning signals, schedule preferences and Siraj conversations **only if the category is on**, and turning a category off deletes what it stored. Prayer coordinates are coarsened to ~1 km before storage. Analytics is a closed list of event names with small non-content properties. The logger redacts passwords, tokens, bodies, questions, message text and emails.

## Releases and loading

The app shell is served with `cache-control: no-cache`; hashed assets are immutable for a year. A request for a hashed file that no longer exists (a tab still open from the previous release) gets a 404, never the app shell, and the client reloads once into the new release (`vite:preloadError`). The world and mission screens are preloaded when the browser is idle and render without suspending once loaded, so moving between them never flashes a loader.

## Frontend sync model

`api/sync.ts` bootstraps once: system status → session → server profile or push the local traveller → apply the server's age, parental settings and memory → replay offline-completed missions once (the server re-checks every unlock rule) → hydrate progress, learner model and My Day → open SSE. Missions play locally and are mirrored (`MissionSync`: attempt → batched signals → complete). The server's response then reconciles progress. If a device's cached age disagrees with the server, the server wins.

## Quality gates

`npm run check` runs typecheck (app + server) → lint → tests → production build. Beyond the unit and HTTP tests there are: a RAG evaluation table (known / unknown / ambiguous / personal-ruling / off-topic questions in English and Arabic, with and without a model that tries to hallucinate); contract tests for every AI adapter (Gemini, Groq, OpenRouter, Mistral, the Anthropic SDK), the router (fallback, 429, timeout, bad key, capability, privacy, caps), Gemini/Voyage embeddings and transcription (no network); opt-in live tests (`npm run test:live`); a real signed and encrypted Web Push delivery to a local HTTPS receiver; and real SMTP delivery to a local sink. The server tests boot the real app on an in-memory Postgres and exercise it over HTTP: auth, knowledge and review, Siraj (with a fake model to test citation validation), learning and notifications (mocked clock), community (including SSE and child-safety bypass attempts), scholars, and AMANAH/NOUR.
