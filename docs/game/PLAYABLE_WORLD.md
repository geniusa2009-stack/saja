# Playable World Vertical Slice

## Architecture

`WorldHome` remains the location hub and continues to own progression, missions, prayer context, synchronization, and location travel. Its Village and Masjid Courtyard sheets add an **Explore** entry point. The new `PlayableWorld` scene is mounted only for those locations; leaving it returns to the hub. The other seven locations keep the original SVG path experience.

The scene uses a small, dependency-free Canvas renderer for procedural ground, buildings, arcades, and courtyard details; collision outlines appear only in development. React renders the existing parametric SVG character and NPC, localized interaction UI, and mission links. Typed engine responsibilities are split across `input.ts`, `controller.ts`, `collision.ts`, `fixedStep.ts`, `gameLoop.ts`, `camera.ts`, `sceneManager.ts`, `scenes.ts`, `types.ts`, `animation.ts`, and `interactions.ts`. `simulation.ts` is a barrel for pure functions used by tests.

This is a focused custom Canvas layer (option B), integrated with the existing React architecture. PixiJS and Phaser were evaluated but are not justified for two compact scenes: they would add a runtime and migration surface while the existing Character, application UI, SVG assets, and route model remain valuable. A full Canvas engine would weaken native UI and accessibility. The custom renderer keeps the scene small while React preserves buttons, dialog content, and screen-reader labels.

## Controls and interactions

- Desktop: WASD or arrow keys, E or Enter when the nearby NPC prompt appears.
- Touch: drag the virtual joystick. The active pointer is captured and cleared on pointer-up, cancel, or lost capture.
- Movement is normalized, accelerates toward a fixed maximum, decelerates after release, and resolves collisions axis by axis for wall sliding.
- The simulation caps elapsed frame time and subdivides it to at most 60 Hz steps. The camera follows with damping and clamps to scene boundaries; reduced motion removes the damping lag and character bob.
- Movement pauses while NPC dialogue is open. NPC conversation and mission buttons only become available within the authored interaction radius.
- Coordinates remain canonical; rendering mirrors scene positions and horizontal controls once for RTL.
- Player coordinates are transient in-memory state. Existing world and progress stores continue to own location and mission persistence; mission changes still flow through `MissionRunner` and the sync layer.

## Adding a scene

1. Add a `GameSceneId` and scene data in `game/scenes.ts`.
2. Place collision rectangles against solid geometry; keep entrances and navigation lanes clear.
3. Add a scene-specific background pass in `PlayableWorld.tsx` and keep decorative details independent from collision bodies.
4. Reuse existing localized NPC and mission content. Do not add educational claims in the scene layer.
5. Add unit coverage for new obstacles, bounds, camera limits, and proximity behavior.

## Art and NPC integration

The game loop does not own the React tree. Art collaborators can replace the scene background drawing with a scene texture/SVG rendered behind the actor, keeping each asset's authored coordinate system aligned to `GAME_SCENES`. Preserve the obstacle rectangles and `scene.npc` positions, or update those data in the same change. Keep player/NPC character transforms as separate entities so camera movement and proximity logic remain independent of background art.

## Verification

`npm run e2e:game` runs desktop keyboard movement in English, an Arabic/RTL keyboard journey in the Village, axe WCAG 2.1 A/AA checks in both locales, then joystick movement in a phone-sized Courtyard viewport and Yusuf's interaction. It captures the scenes below and samples `requestAnimationFrame` while the desktop Village is active. Joystick movement uses captured pointer events in headless Chrome on the local Mac host; no physical phone was used.

- Village in English: [village-playable.png](./village-playable.png)
- Village in Arabic/RTL: [village-playable-ar.png](./village-playable-ar.png)
- Courtyard on a phone-sized viewport: [courtyard-playable.png](./courtyard-playable.png)

The `simulation.test.ts` suite covers diagonal normalization, speed across frame rates, stopping, collision and sliding, camera clamping, RTL coordinates, disabled input, NPC radius, and joystick dead zone. Full test results and limitations are in `TOOL_CAPABILITIES.md` and the PR.
