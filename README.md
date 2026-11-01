# SAJA — سَجَى · The Islamic Interactive Journey

A living world to **learn** through interactive missions, **understand** with an adaptive guide, **trust** through evidence, **connect** in safe learning circles, **ask** verified scholars, and **live** each day with a gentle companion.

## Run it

```bash
npm install
npm run dev        # web on http://localhost:5173 + API on :8787 (embedded Postgres, no setup)
npm run check      # typecheck (app + server) · lint · tests · build
```

`npm run dev` needs no accounts or keys: the API uses an embedded Postgres in `.data/` and honest demo fallbacks for AI, OCR, transcription, push and email. AI runs on free-tier keys from your own accounts: **Gemini** is the primary provider (text, images, PDFs, audio, video and retrieval embeddings), with **Groq**, **OpenRouter** and **Mistral** as fallbacks and Anthropic as an optional paid provider that is off by default. Without any key, Siraj answers from curated text (offline mode). See [docs/AI_PROVIDERS.md](docs/AI_PROVIDERS.md). The in-app "What's real right now" sheet (the dot in the navigation) shows which is which. Add keys in `.env` (see `.env.example`) to switch services on. Run `npm run dev:web` alone for the offline-only demo.

End-to-end (drives your installed Chrome headlessly against a fresh production build): `npm run build && npm run e2e` runs the full user journey and the child + guardian journey; `npm run e2e:visual` checks 17 screens at 375/768/1280 px in English and Arabic and saves screenshots to `e2e/screenshots/`. `node e2e/review.mjs intro|journey|pages|walk|studio` captures frame sequences (intro, onboarding, walking, mission, adaptation, reward, unlock, Siraj, every screen) for a human visual review; `node e2e/sheet.mjs <dir>` turns a sequence into one contact sheet.

More checks: `npm run e2e` also runs the staff publishing workflow (`e2e/staff.sh`, on a throwaway database); `npm run e2e:a11y` runs axe-core (WCAG 2.1 A/AA) on every screen in both languages at phone and desktop widths; `node e2e/fps.mjs` measures frame timing during the intro, walking and missions.

Operator tasks: `npm run saja -- doctor` (live-checks every configured AI provider and service), `npm run test:live` (opt-in real requests to configured providers), `npm run saja -- grant-role <email> <admin|moderator|scholar|mentor>`, `npm run saja -- vapid`, `npm run saja -- outbox`. Deployment: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Publishing religious content: [docs/CONTENT_REVIEW.md](docs/CONTENT_REVIEW.md). Child safety and security: [docs/SAFETY_AND_SECURITY.md](docs/SAFETY_AND_SECURITY.md).

## What's inside

| Area | Where |
| --- | --- |
| 5-second cinematic intro (skip, reduced motion, replay prevention) | `src/features/intro` |
| Onboarding + character creation | `src/features/onboarding`, `src/features/character` |
| The world as home: walking, camera, markers, NPCs, real-sky lighting, unlocks | `src/features/world` |
| Missions: Water Path (wudu), Prayer Path, Lantern Match, Branching choices, Clue Hunt, Reflection + adaptive Illustrated/Story/Guided modes | `src/features/missions` |
| Siraj (AI guide) with evidence, quizzes and scholar routing | `src/features/tutor`, `src/services/tutor.ts` |
| Trust layer, AMANAH (creators), NOUR (verify) | `src/features/trust`, `src/services/verification.ts` |
| Ask a Scholar | `src/features/scholar` |
| Learning Circles + group chat with enforced child safety | `src/features/community`, `src/domain/safety.ts` |
| My Day: prayer companion, adaptive planner, Daily Deen, goals, focus mode | `src/features/day` |
| Journey, Learn, Explore, Profile, "What SAJA remembers", guardian controls | `src/features/*` |
| Accounts, notifications inbox, capability status | `src/features/account` |
| Staff console: moderation queue, content studio (status dashboard, knowledge editor, mission review with live preview, claim rules/stories/quizzes review), scholar inbox, scholar verification, users, audit trail | `src/features/staff` |
| API server: auth, roles, age/consent, RAG + Siraj, missions, My Day, notifications, circles, moderation, scholars, AMANAH/NOUR | `server/` |

Arabic and English are first-class (RTL mirrors the world itself). See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Important: content status

All religious content in this build is **demo content, not yet reviewed by a scholar board** (seeded as `draft`; only a verified scholar can approve it and an admin publish it). Sources are cited (Qur'an translations are Saheeh International; hadith are paraphrased meanings unless the Arabic is shown) so reviewers can check them, and the UI labels this everywhere. Scholar and circle profiles are **sample profiles**. Siraj is a guide, not a scholar, and never gives fatwa.

## Brand

Colours, type, the Gateway mark, the wordmark, icons and motion timings come from the SAJA Visual Identity System v1.0 (Claude Design artifact) and live in `src/styles/tokens.css` and `src/brand`.
