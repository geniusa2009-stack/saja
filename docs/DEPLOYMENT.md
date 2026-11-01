# Deploying SAJA

One Node process serves both the API (`/api`) and the built web app. That keeps a single origin, so the session cookie stays `SameSite=Lax`, there's no CORS surface, and CSP can be strict.

## Requirements

- Node 20.19+.
- PostgreSQL 15+ with the `vector` extension (Neon, Supabase, RDS, Cloud SQL and Crunchy all support it). The first migration runs `create extension if not exists vector`, so the database user needs permission to do that, or you enable the extension once yourself.
- HTTPS in front of the app (a load balancer or reverse proxy). Set `TRUST_PROXY=true` only when that proxy sets `X-Forwarded-For`.

## Steps

```bash
npm ci
npm run check                 # typecheck · lint · tests · build (creates dist/)
cp .env.example .env          # then fill it in — see below
npm run saja -- doctor        # live-check every configured AI provider and service: PASS / FAIL / NOT CONFIGURED / NOT TESTED
npm run saja -- migrate       # applies migrations, seeds demo content into an empty DB
npm start                     # SAJA_ENV=production, serves dist/ + /api on $PORT
```

Create the first administrator after they have signed up in the app:

```bash
npm run saja -- grant-role admin@yourdomain.org admin
npm run saja -- grant-role moderator@yourdomain.org moderator
```

Scholars: an admin opens **Staff console → Scholar verification**, adds a profile for an existing account (it starts as *Pending*), checks credentials outside SAJA, then verifies it with a written scope. Only then can that scholar approve content or answer questions.

## Environment

See [`.env.example`](../.env.example). Every external service is optional, and the app reports what's real at `GET /api/system/status` and in the in-app "What's real right now" sheet.

| Variable | Class | Needed for | Without it |
| --- | --- | --- | --- |
| `SAJA_ENV=production` | **Required** | production headers, secure cookies, static serving | development defaults |
| `APP_ORIGIN` | **Required** | CSRF origin check; links in emails | localhost; your real domain is refused (logged at start) |
| `DATABASE_URL` | **Required for production** | persistent, backed-up, multi-instance-ready storage (Postgres 15+ with pgvector) | embedded PGlite on local disk: **development and demos only** |
| `TRUST_PROXY` | Required behind a proxy | real client IPs for rate limits | proxy IP used for everyone |
| `COOKIE_SECURE` | Leave unset | defaults to `true` in production | — (`false` is development-only) |
| `GEMINI_API_KEY` (+ `GEMINI_MODEL`, `GEMINI_EMBEDDING_MODEL`) | Optional — **primary** AI provider | Siraj answers from cited sources; OCR of images/PDFs; audio/video read natively; semantic retrieval (Gemini embeddings) | the fallbacks below, then offline mode |
| `GROQ_API_KEY` (+ `GROQ_MODEL`) | Optional — fallback | fast text tasks (question organising); text fallback | next provider |
| `OPENROUTER_API_KEY` (+ `OPENROUTER_MODEL`, free models only by default) | Optional — fallback | text fallback (not used for personal questions by default) | next provider |
| `MISTRAL_API_KEY` (+ `MISTRAL_MODEL`) | Optional — fallback | text and image fallback | offline mode |
| `ANTHROPIC_API_KEY` (+ `ANTHROPIC_MODEL`) + `SAJA_AI_ALLOW_PAID=true` | Optional, **paid** | kept for future use | never called on the zero-budget default |
| `SAJA_AI_PROVIDER_ORDER`, `SAJA_AI_CAPABILITIES`, `SAJA_AI_LIMITS`, `SAJA_AI_SENSITIVE_PROVIDERS`, `SAJA_AI_TIMEOUT_MS`, `SAJA_AI_DAILY_CALLS_PER_USER` | Optional | routing order, declared capabilities of a non-default model, free-tier caps, privacy, cost | safe defaults ([AI_PROVIDERS.md](AI_PROVIDERS.md)) |
| `SAJA_EMBEDDINGS` (`auto`), `VOYAGE_API_KEY` (+ `VOYAGE_MODEL`) | Optional | choose the embedding provider; Voyage is an alternative to Gemini | `auto`: Gemini → Voyage → local keyword-level |
| `TRANSCRIPTION_API_URL` + `TRANSCRIPTION_API_KEY` (+ `TRANSCRIPTION_MODEL`) | Optional | audio/video audits through a Whisper-compatible service (Groq's free Whisper works) | Gemini native audio if configured; else "transcription unavailable" |
| `FFMPEG_PATH` (+ a vision provider) | Optional | on-screen text in videos when no provider reads video natively | transcript only; the result says so |
| `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` (+ `VAPID_SUBJECT`) | Optional | device push notifications (never for children) | in-app notifications only |
| `SMTP_URL` + `MAIL_FROM` | **Required if people should be able to reset passwords** | password-reset email | written to `email_outbox` (**development only**) |
| `UPLOAD_DIR`, `MAX_UPLOAD_MB` | Optional | upload storage location and size | `./.data/uploads`, 20 MB (back this directory up) |
| `PGLITE_DIR` | **Development only** | embedded database folder | `./.data/pglite` |
| `STATIC_DIR`, `PORT` | Optional | where the built app is and which port to listen on | `./dist`, 8787 |

Check what is actually working with **`npm run saja -- doctor`**. For every AI provider it prints whether it is configured, its model and declared capabilities, and a live result per capability (chat, plus vision and audio where declared). It then checks embeddings, the features that depend on them (Siraj, OCR, transcription, video), push, SMTP and Postgres. Each line is `PASS`, `FAIL` (with the error and a likely cause), `NOT CONFIGURED` (naming the missing variable) or `NOT TESTED` (for what a check can't prove, e.g. PDF/video input or push delivery to a real device). It never reports PASS without a successful call, never prints keys, never sends personal data, and exits non-zero if anything fails. Each run costs a few requests from your free allowance (about 3 for Gemini, 1–2 per other provider, 1 embedding call). Run it after every configuration change; restart the server after changing the embedding provider (it re-indexes). `npm run test:live` runs real minimal English, Arabic, image and embedding requests against each configured provider (opt-in; unconfigured providers are skipped, never passed).

Secrets are read only by the server. Nothing in `src/` reads them, and no `VITE_` variable is needed.

## Operations

- **Backups**: back up Postgres, or `PGLITE_DIR` plus `UPLOAD_DIR` for embedded mode. The embedded database can be opened by one process only: stop the server before running the CLI against it (the CLI refuses otherwise).
- **Health**: `GET /api/system/health` returns database reachability, files waiting for deletion, overdue notifications, `staleEmbeddings` and `ai.state` (`offline`, `unverified`, `available`, `fallback`, `unavailable`; no personal data, no provider names). `ok` is false while any knowledge chunk is embedded by a different model than the configured one; the AI state is informational because SAJA keeps working without AI. Admins see per-provider usage (requests, tokens, caps, cool-downs, last outcome) at `GET /api/admin/ai-usage`.
- **Free-tier quotas**: SAJA stops calling a provider when its own cap (`SAJA_AI_LIMITS`) is reached, when the provider answers 429 (it waits the provider's retry time; a per-day limit sets it aside for an hour), or when a key is rejected. It then routes to the next provider, and finally to curated offline answers. Set the caps to your actual plan; SAJA does not know your provider's current allowance.
- **Switching embedding provider**: after adding `GEMINI_API_KEY` (or changing `GEMINI_EMBEDDING_MODEL`, `SAJA_EMBEDDINGS` or Voyage settings), the server re-embeds the whole library once at start-up (logged as `knowledge.reindex.*`, about 4 requests for the demo library). If that fails, search uses curated keywords only (never vectors from another model) until the next successful start; health says so.
- **Releases**: the app shell is `no-cache` and hashed assets are immutable. Keep the previous release's `dist/assets` for a few minutes behind a load balancer if you do rolling deploys; otherwise open tabs reload once into the new release.
- **Password-reset email** is sent in the background, so a slow or failing mail server can't reveal whether an account exists; failures are logged as `email.failed`.
- **Scaling**: three things are single-process today, each behind a small interface so product code doesn't change when you replace them:
  - `EventBus` (`server/lib/bus.ts`: `publish`, `subscribe`) → Postgres `LISTEN/NOTIFY`, Redis pub/sub or a managed realtime service.
  - `RateLimiter` (`server/lib/rateLimit.ts`: `await take(name, key, cost)`) → Redis or a database table.
  - `AiBudget` (`server/ai/guard.ts`: `tryConsume(userId, purpose)`) → a shared counter. The router's per-provider caps and cool-downs (`server/ai/router.ts`) are per process too.

  Until then, run **one** instance. The scheduler (notifications, file deletions, hourly retention) must run in exactly one process.
- **Privacy & retention**: see [PRIVACY.md](PRIVACY.md). Retention runs hourly inside the scheduler.
- **Logs**: JSON lines on stdout; personal fields are redacted.
- **Content**: see [CONTENT_REVIEW.md](CONTENT_REVIEW.md) for the full operational checklist. Everything seeded is demo content in `draft`. Nothing is presented as reviewed until a verified scholar approves it and an admin publishes it.

## Taking content from demo to published

1. Verify at least two scholars (Staff console → Scholar verification): a linked account, the credentials you checked, and a written scope. A scholar can't approve a version they wrote.
2. **Staff console → Content status** shows what learners receive today, per content type.
3. For each knowledge document, mission and code-held text (claim rules, stories, quizzes): open it, edit if needed (knowledge: full editor; missions: text only), then move it through *internal review → scholar review*. A verified scholar approves it, and an admin publishes it with a scope note.
4. Published items lose their demo label everywhere (Learn, evidence, Siraj answers, missions, AMANAH/NOUR notes). `/api/system/status` reports `content.reviewed: true` only when no demo knowledge or missions remain.
5. Changing a code-held text in a later release sends it back to draft automatically; review it again.
