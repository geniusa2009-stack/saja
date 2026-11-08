# SAJA — Gameplay Quality Assurance

## Reported fixed failure

The combined branch initially failed `e2e:game`. The previous agent attributed intermittent failures to frame-time movement coupling: software-rendered headless Chrome at approximately 2–5 FPS made the avatar overshoot Amina's interaction radius. It reported capping frame movement, aligning movement with physics and making tests wait for game state rather than fixed sleeps. This reasoning is **reported**, not independently profiled here.

## Expected E2E coverage

- Village GLB + eight expected clips (`Idle`, `Walk`, `Run`, `WalkStart`, `WalkStop`, `TurnLeft`, `TurnRight`, `Interact`).
- Spawn matching canonical world coordinates, Rapier collision blocking, camera-relative keyboard motion.
- Rotation, orbit camera, NPC proximity, Amina conversation, mission start/accept/three clues, completion.
- Arabic and English, mobile joystick, 2D courtyard and Yusuf, accessibility scan.
- No console errors, network errors, asset 404s, or broken caching for hashed content.

## Test report from prior run

`npm run e2e:game` reportedly **passed** on the integration branch, including quest and bilingual flow; adult/child/staff separate E2Es also passed. No current stdout logfile or reproducible test environment was furnished here. Re-run before asserting launch readiness.

## Physical QA still needed

| Device category | Test | Pass criteria |
|---|---|---|
| Apple Silicon Mac GPU | 3D camera, frame pacing, WebGL startup | Smooth input; record median/p95 frame times; no crash |
| Mid-range Android phone | Touch movement, memory, battery, portrait | No unusable frame drops; stable loading/fallback |
| iPhone Safari | WebGL capability and gesture/zoom | Functional 3D or clear 2D alternative |
| WebGL-disabled device | Fallback state | 2D village fully navigable |
| Screen reader + keyboard | Quest, dialog, settings | All required actions possible, no focus loss |

## Remaining model optimization

Prior inspection reported ~80,000 triangles, 259 meshes, ~264 draw calls per frame, and a ~3 MB GLB. Treat these as initial baseline numbers; measure current GLB. Re-export compression/mesh merging must preserve skinned mesh hierarchy and animation clips; do not optimize blindly.

## Failure capture requirements

On any failing game E2E, capture: current branch SHA; screenshot; page exceptions; network errors; player position, yaw, collision count and active animation; system GPU/renderer; current test step and elapsed wall/game time.
