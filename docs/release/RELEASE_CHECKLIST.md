# Release checklist

Status key: ✅ done with evidence · ⏳ in progress · ❌ not met (blocks launch) · ⚠️ met with a documented limitation

## Product

| Gate | Status | Evidence / blocker |
| --- | --- | --- |
| Main user journeys work | ⏳ | adult/child/staff e2e to be re-run on the integrated branch |
| No critical dead ends | ⏳ | quests not yet reachable from the world |
| No false feature promises | ⏳ | |
| Arabic and English complete for enabled features | ⏳ | translation-key audit pending |
| Mobile UX usable | ⏳ | |

## Game

| Gate | Status | Evidence / blocker |
| --- | --- | --- |
| 3D world loads reliably | ✅ | `npm run e2e:game` passes (headless, software WebGL, 2–5 fps) |
| Animations bound and functional | ✅ | 8 clips present; Idle → WalkStart → Walk → Run → WalkStop → Turn* → Interact observed in the clip history |
| Movement | ✅ | frame-rate independent since `a18a483` |
| Collision | ✅ | tree collider stops the traveller; wall contacts counted separately from the ground |
| Camera | ✅ | follow, orbit drag and collision ray; real-device feel not tested |
| NPC interactions | ✅ | Amina (EN/AR, keyboard, joystick), Grandpa Yusuf (2D, AR) |
| Quest progression | ❌ | quest system not wired in |
| Lightweight fallback | ✅ | 2D mode and the 2D courtyard pass |

## Engineering

| Gate | Status | Evidence / blocker |
| --- | --- | --- |
| TypeScript | ✅ | `npm run typecheck` exit 0 |
| ESLint | ✅ | exit 0 |
| Automated tests | ✅ | latest full run: 480 passed, 16 skipped (live AI tests, no keys) |
| Production build | ✅ | |
| Critical e2e journeys | ⏳ | |
| No blocking browser errors | ⏳ | Google Fonts CSP error to fix |
| No critical security defects | ⏳ | review pending |

## Content

| Gate | Status | Evidence / blocker |
| --- | --- | --- |
| Quranic text source-verified | ✅ | Al-Fatihah byte-identical to Tanzil Uthmani 1.1, enforced by a test |
| Hadith citations / gradings validated | ⚠️ | 11/11 matns corroborated against an independent dataset; Sunnah.com (the cited source) refuses automated access, so a person must confirm |
| Religious explanations reviewed | ❌ | no verified scholar has reviewed any explanation, tafsir summary, Hadith meaning or knowledge entry |
| Translation and media rights documented | ❌ | Saheeh International permission not on file (gated out of production builds); word glosses' provenance unconfirmed |
| Unverified content not presented as approved | ✅ | demo/draft labels throughout; honesty tests |

## Deployment

| Gate | Status | Evidence / blocker |
| --- | --- | --- |
| Staging verified | ❌ | to be attempted |
| Environment configuration documented | ✅ | `.env.example`, docs/DEPLOYMENT.md |
| Health checks | ✅ | `/api/system/health` |
| Deployment and rollback procedures | ⏳ | DEPLOYMENT_GUIDE.md |
