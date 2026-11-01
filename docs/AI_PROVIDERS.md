# AI providers (zero-cost setup)

SAJA can run on free-tier AI accounts that you create yourself, with no paid AI at all. Every provider is optional. With none configured, SAJA keeps working in **offline mode**: Siraj answers from curated text, and image, audio and video checks say "unavailable". Keys are read only by the server and never reach the browser.

| Role | Provider | Key | Default model (override) | Declared capabilities |
| --- | --- | --- | --- | --- |
| **Primary** | Google Gemini | `GEMINI_API_KEY` | `gemini-3.5-flash-lite` (`GEMINI_MODEL`) | text, structured output, vision, PDF, audio, video · embeddings `gemini-embedding-001` (`GEMINI_EMBEDDING_MODEL`) |
| Fallback 1 | Groq | `GROQ_API_KEY` | `llama-3.3-70b-versatile` (`GROQ_MODEL`) | text, structured output · *fast* |
| Fallback 2 | OpenRouter | `OPENROUTER_API_KEY` | `openrouter/free` (`OPENROUTER_MODEL`) | text, structured output |
| Fallback 3 | Mistral | `MISTRAL_API_KEY` | `mistral-small-latest` (`MISTRAL_MODEL`) | text, structured output, vision |
| Optional, **paid** | Anthropic | `ANTHROPIC_API_KEY` + `SAJA_AI_ALLOW_PAID=true` | `claude-opus-5` (`ANTHROPIC_MODEL`) | text, structured output, vision, PDF |

The defaults were checked against each provider's documentation in October 2026. Model names and free tiers change, so SAJA assumes neither will last. Every value lives in one registry (`server/ai/models.ts`) and can be overridden from the environment. `npm run saja -- doctor` checks the model you configured with a real request. If you pick a model with different abilities, declare them, for example `SAJA_AI_CAPABILITIES=groq=text,structured_output,vision`. SAJA routes only by declared capabilities and never assumes a provider can do everything.

## Which features need what

| Feature | Needs | Without it |
| --- | --- | --- |
| Siraj written answers (from cited sources) | any text provider | curated extractive answers (offline mode) |
| Organising a question for a scholar | a text provider allowed for sensitive tasks | the deterministic organiser (it redacts personal details in the question) |
| Reading images (NOUR/AMANAH) | a **vision** provider (Gemini, Mistral) | "reading images isn't available" |
| Reading PDFs | a **PDF** provider (Gemini) | "unavailable" |
| Audio / voice notes | `TRANSCRIPTION_API_URL`/`_KEY`, or an **audio** provider (Gemini) | "transcription unavailable" |
| Video: speech + on-screen text | a **video** provider (Gemini), or a transcription service + `FFMPEG_PATH` + a vision provider | transcript only, or "unavailable"; the result says what wasn't read |
| Meaning-aware retrieval (RAG) | `GEMINI_API_KEY` (Gemini embeddings) or `VOYAGE_API_KEY` | local keyword-level search |

**Gemini alone covers everything above.** Groq, OpenRouter and Mistral are text fallbacks (Mistral also handles images). Groq's free Whisper can be used as the transcription service: set `TRANSCRIPTION_API_URL=https://api.groq.com/openai/v1/audio/transcriptions`, use your Groq key, and set `TRANSCRIPTION_MODEL=whisper-large-v3-turbo`.

## Routing

1. Required capabilities come from the request's content (an image needs `vision`, and so on).
2. Candidates are the configured providers in `SAJA_AI_PROVIDER_ORDER` (default `gemini,groq,openrouter,mistral,anthropic`).
3. A provider is skipped if it lacks a needed capability, the file is too large for it, it isn't allowed for a sensitive task, it is paid and paid use is off, it is cooling down after a 429, its key was rejected, or SAJA's own cap for it is reached.
4. Preferences re-order without randomness: short "fast" text tasks (question organising) go to Groq first, and an answer in Arabic goes to a provider strong in Arabic (Gemini) first.
5. Up to 3 providers are tried. A refusal is final. Anything else moves on to the next provider. If nothing works, SAJA uses its deterministic or curated path.

People see only "AI available", "Using fallback", "AI temporarily unavailable" or "Offline mode", never provider names. "Available" appears only after a real request has succeeded.

## The model never decides religion

Whichever provider answers, the same rules apply. Siraj's pipeline (intent → safety → retrieval → evidence → model → citation validation → confidence) gives the model only retrieved evidence. Output must match the JSON schema. Citations that weren't supplied are dropped, and invented quotes or references named in the prose make the answer `uncertain` (and it is not shown). Personal rulings never reach a model: they go to the scholar route. AMANAH/NOUR verdicts come only from curated rules. The model may only extract text and list claims, which must appear verbatim. The scholar flow (AI organisation → redaction → moderation → scholar queue) is unchanged. A provider failure is never turned into an answer.

## Free-tier protection (cost control)

- Cheaper paths come first: retrieval before generation, deterministic answers for button intents, a 24-hour Siraj answer cache, reuse of an earlier extraction of the same file, no claim-extraction call for short texts, and a cached query embedding for each repeated question.
- Small outputs: Siraj is capped at 900 tokens. Inputs are compacted. Identical requests already in flight share one call.
- Per person: `SAJA_AI_DAILY_CALLS_PER_USER` (default 60) plus HTTP rate limits.
- Per provider: `SAJA_AI_LIMITS` sets requests per day and per minute. The defaults are `gemini=200/10, groq=1000/30, openrouter=50/20, mistral=500/30, gemini-embeddings=500/60`. **Set these to your own plan's allowance.** These are SAJA's own safety caps; SAJA does not know your provider's current limits.
- On a 429, SAJA waits out the provider's retry time (`Retry-After`, or Google's `RetryInfo`). A per-day limit or a rejected key sets the provider aside for an hour, and 3 consecutive failures set it aside for 2 minutes. Rate-limit headers (remaining requests and reset) are recorded. SAJA never tries to bypass a limit.
- Paid providers are never called unless `SAJA_AI_ALLOW_PAID=true`. An OpenRouter model that isn't free (`openrouter/free` or an id ending in `:free`) counts as paid.
- When quota runs out, people see "AI temporarily unavailable" and curated answers. Image and audio checks say "unavailable".
- Usage per provider (requests, tokens, caps, cool-downs, last outcome) is available to admins at `GET /api/admin/ai-usage`. Counters are per process and reset daily.

## Privacy

- Logs contain operational metadata only: purpose, provider, model, latency, token counts and outcome. They never contain prompts, files, answers, private messages or scholar questions.
- `SAJA_AI_SENSITIVE_PROVIDERS` (default `gemini,groq,mistral,anthropic`) lists the providers allowed to see personal questions when organising them for a scholar. OpenRouter is excluded by default because it forwards requests to third-party hosts. The question's personal details (phone numbers, emails, addresses, handles) are redacted before a provider sees it. The optional *context* field is sent as the person wrote it, which is unchanged scholar behaviour.
- **Free tiers often allow the provider to use submitted content to improve its products**, and Gemini's free tier is one of them. Review each provider's current terms, and narrow `SAJA_AI_SENSITIVE_PROVIDERS` (or leave a provider unconfigured) according to your obligations, especially for children's data.

## Embeddings and re-indexing

`SAJA_EMBEDDINGS=auto` uses Gemini when `GEMINI_API_KEY` is set, otherwise Voyage when `VOYAGE_API_KEY` is set, otherwise the local lexical embedder. Vectors are stored in pgvector, tagged with the model that made them (`gemini:gemini-embedding-001:256`). At start-up, every chunk made by a different model is re-embedded once, in batches of 100. If re-indexing or a query embedding fails (429, quota or a bad key), search uses curated keywords only. It never compares vectors from different models. `/api/system/health` shows `staleEmbeddings` until re-indexing succeeds. To add another embedding provider, implement `EmbeddingProvider` (`server/ai/types.ts`) and select it in `server/ai/providers.ts`.

## Checking it: doctor and live tests

```bash
npm run saja -- doctor
```

For each provider the doctor prints whether it is configured, its model and capabilities, and a live result for chat, plus vision and audio where declared. PDF and video are `NOT TESTED`, because checking them needs a real document or video. It then checks embeddings, the features that depend on them, and the rest of the infrastructure. A status is `PASS` only after a successful real request. `FAIL` comes with the error and a likely cause, and `NOT CONFIGURED` names the missing variable. Keys are never printed. A run costs a few requests from each configured free tier.

```bash
npm run test:live
```

This opt-in suite sends real minimal English, Arabic, image (where declared) and embedding requests to each configured provider. Unconfigured providers are skipped and reported as NOT CONFIGURED, never passed. `npm run check` never calls a real provider. The adapters and router are tested against each provider's wire format with the network faked (`server/test/ai-router.test.ts`).

## Remaining limitations

- No provider has been called live from this repository's CI. Live behaviour (answer quality in Arabic, real rate limits, model availability) must be confirmed with your keys using the doctor and `npm run test:live`.
- Caps, cool-downs and usage counters live in memory, per process: run one instance, or move them to a shared store.
- Declared capabilities are configuration. If a model is retired or changes, the doctor fails it and SAJA falls back, but it cannot detect a model silently losing an ability.
- Free-tier terms (data use, limits, availability) are set by the providers and can change at any time.
- When a question is organised for a scholar, its optional context field reaches the provider unredacted, as it did before this migration. Redacting it would change scholar behaviour, so that is left as a product decision.
