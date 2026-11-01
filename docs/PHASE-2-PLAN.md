# SAJA Phase 2 — implementation map (from the actual repository)

Baseline before changes: typecheck ✓ · lint ✓ · 72 tests ✓ · build ✓.
Environment: no Postgres, no ffmpeg/tesseract, no AI/embedding/push/email credentials.

| Area | Current | Keep | Improve / Replace | Connect / Add |
| --- | --- | --- | --- | --- |
| World, missions, mechanics, intro, onboarding | Client, local stores | All gameplay + visuals | Mission definitions become data (engine registry) | Attempts + signals persisted server-side |
| Adaptive engine (`src/domain/adaptive.ts`) | Pure, tested | Logic unchanged | — | Server recomputes learner model from stored signals |
| Safety (`src/domain/safety.ts`) | Pure, tested, client-enforced | Rules | Add moderation categories + escalation | Enforced in server services; client is a first line only |
| Siraj (`services/tutor.ts`) | Keyword responder | Offline guide as DEMO mode | — | Server RAG pipeline: normalize → intent → safety → retrieve → filter → evidence → LLM (Claude) → citation validation → confidence → answer/escalate |
| Knowledge (`content/knowledge.ts`) | Embedded TS | As seed source | — | `knowledge_sources/documents/chunks/claims/evidence/relationships` + versions + review workflow + hybrid retrieval (pgvector) |
| Scholar | Local queue, "Verified" badge on samples | UI | Samples labelled *Sample · not verified* | Queue, redaction, moderation, scholar role inbox, answers, verification states set by admin |
| Community | Local seed + local messages | UI, policy | — | Circles, membership, messages, reactions, reports, blocks, moderation queue, SSE realtime, audit trail |
| Guardian | Arithmetic gate | Gate as a *speed bump* label | — | age_declared / age_approved / guardian_consented; guardian accounts + link codes |
| My Day / prayer | Local | Planner + prayer math | — | Persisted plans, prayer prefs, marks; notifications (in-app + Web Push via VAPID) |
| AMANAH / NOUR | Text rules; media "unavailable" | Rules as a verifier stage | Add UNVERIFIED status | Uploads (validated), OCR via Claude vision, transcription adapter, audits persisted |
| Memory | Client partialize | Controls | — | Server memory prefs; disabling deletes server data |
| Auth | None | — | — | Guest sessions, sign up/in/out, reset, roles, CSRF, rate limits |

Order: B backend foundation → C knowledge → D Siraj → E learning → F My Day → G community → H scholars → I AMANAH/NOUR → J security → K polish → L QA.
