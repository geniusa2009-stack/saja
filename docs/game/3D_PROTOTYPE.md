# SAJA 3D Village prototype

The Village location now opens in a lazy-loaded React Three Fiber v9 scene. The other locations and the existing 2D Village remain available; choose **2D mode** in the Village header to switch renderers.

## Controls

- W/A/S/D or the arrow keys move relative to the camera.
- Drag on the scene to orbit the third-person camera.
- Hold Shift or the on-screen Run button to accelerate.
- Use the virtual joystick on touch screens.
- Approach Amina and press E or use the Talk button. Conversation still opens the existing mission route.

## Runtime architecture

- `src/features/world/Village3D.tsx` loads the authored GLB, sets lighting and camera, applies the player's profile palette, and owns the Rapier character controller.
- `src/features/world/PlayableWorld.tsx` keeps the existing HTML dialogue, navigation, focus, joystick, and 2D fallback around the 3D canvas.
- `src/features/world/game/scenes.ts` remains the source for gameplay start/NPC coordinates and fixed obstacle rectangles. The renderer maps its 1800×1100 canonical layout at 50 pixels per metre into a 36×22 metre XZ world.
- A Rapier kinematic capsule owns world translation. Acceleration, gravity, grounded snapping, step handling, and collision sliding are applied before `setNextKinematicTranslation`. The avatar bones pose from that movement; animation never moves the physics body.
- Camera orbit is independent from player translation. A Rapier ray pulls the camera forward when a building or obstacle blocks its desired third-person position.
- Desktop shadows and antialiasing use a 1.5 pixel-ratio ceiling. Coarse-pointer devices use pixel ratio 1 and disable shadow maps. The scene is not postprocessed.

## Blender assets

- Runtime GLB: `public/assets/game/saja-village.glb`
- Editable Blender scene: `assets/blender/saja-village.blend`
- Authoring script: `assets/blender/saja-village.py`
- Replacement contract: `assets/blender/CHARACTER_REPLACEMENT.md`

The environment uses warm limestone, terracotta, timber, planted olive trees, a market stall, a well, lanterns, and a winding stone route. Its environment root mirrors Blender Y into the game’s glTF Z coordinate so doors, landmarks, and collision footprints face the same way as the canonical scene.

The included traveler is an engineering placeholder based on the Blendstra package’s CC0 MakeHuman base mesh with original SAJA clothing. The GLB has a skinned mesh and named skeleton; the current delivered GLB has no animation clips. The runtime applies an in-place bone gait from Rapier movement. The Blender source includes named action drafts, but those actions still need to be exported and verified in GLTF before they can replace the runtime gait. The placeholder is not a finished AAA character. Exact artist handoff requirements are listed in the replacement contract.

Profile skin/outfit colors and covered-head options are applied in the 3D placeholder. Outfit options currently share one modest tunic silhouette, and non-satchel accessory variants are not modeled yet; the original 2D character remains unchanged.

## Verification

- `npm run lint`: passed.
- `npm run test -- --maxWorkers=2`: 42 files passed, 1 skipped; 430 tests passed, 16 skipped. The unconstrained `npm run check` test phase initially hit five timeouts; limiting Vitest to two workers removed them. TypeScript and production builds passed in the final `npm run e2e:game` build.
- `npm run e2e:game`: passed in installed Chrome with the SwiftShader WebGL2 software renderer. It verifies spawn/layout agreement, tree blocking, player facing, camera orbit, proximity-gated dialogue, mission routing, English/Arabic UI and WCAG 2.1 A/AA scans, the 3D mobile joystick, and the existing 2D courtyard touch controls. Screenshots are `docs/game/village-3d-en.png`, `docs/game/village-3d-ar.png`, `docs/game/village-3d-mobile-ar.png`, and `docs/game/courtyard-playable.png`.
- The desktop headless frame sample measured **3 FPS**, p50 **316.6 ms**, p95 **500.0 ms**, and 4 frames over 50 ms. This run used SwiftShader software rendering, so it is not a hardware performance claim or a representative desktop/mobile benchmark. The requested 60 FPS desktop and 30 FPS mobile targets remain unverified on physical hardware.
- Production build warns that the lazy `Village3D` chunk is **3.27 MB raw / 1.12 MB gzip**. It is loaded only when Village 3D mode is entered, but still needs asset/code splitting work before treating the experience as production-optimized.

The production server CSP permits WebAssembly compilation through `wasm-unsafe-eval` for Rapier. The 3D scene remains behind an explicit renderer switch. When WebGL is unavailable the Canvas fallback explains the issue and the 2D mode remains available.
