# SAJA 3D Village

The Village location uses a lazy-loaded React Three Fiber v9 scene. The other locations and the existing 2D Village remain available; choose **2D mode** in the Village header to switch renderers.

## Controls

- W/A/S/D or arrow keys move relative to the camera.
- Drag on the scene to orbit the third-person camera.
- Hold Shift or use the Run button to accelerate.
- Use the virtual joystick on touch screens.
- Approach Amina and press E or use Talk. The existing dialogue and mission route still open.

## Runtime architecture

- `src/features/world/Village3D.tsx` loads the Village GLB, applies the player profile palette, drives named clips with `THREE.AnimationMixer`, and owns the Rapier character controller.
- `src/features/world/PlayableWorld.tsx` retains the existing HTML dialogue, navigation, focus, joystick, 2D fallback, and reduced-motion preference.
- `src/features/world/game/scenes.ts` remains the source for gameplay start/NPC coordinates and fixed obstacle rectangles. The renderer maps its 1800×1100 layout to a 36×22 metre XZ world.
- Rapier's kinematic capsule owns translation, collision sliding, grounding, and step handling. Animation clips are in place, with no root position tracks. The mixer crossfades Idle, Walk, Run, WalkStart, WalkStop, TurnLeft, TurnRight, and Interact. Gait speed follows the distance Rapier actually moved; walk/run clip cycle timing is calibrated to stride length.
- The character turns toward camera-relative input with smoothed heading. A large direction change plays a turn clip. Starting and stopping play finite transition clips. Opening NPC dialogue plays Interact on the player and NPC.
- A Rapier ray moves the camera forward around obstructions. Desktop shadows/antialiasing use a 1.5 DPR ceiling; coarse-pointer devices use DPR 1, disable shadows, and disable antialiasing.

## Blender assets

- Runtime GLB: `public/assets/game/saja-village.glb`
- Editable Blender source: `assets/blender/saja-village.blend`
- Phase 2 Blender script: `assets/blender/saja-village-phase2.py`
- GLB clip compiler: `assets/blender/compile-character-clips.py`
- Character contract and provenance: `assets/blender/CHARACTER_REPLACEMENT.md`

The asset keeps the existing Village scene: limestone homes, terracotta roofs, timber, olive trees, market stall, well, lanterns, and stone route. Character geometry is grouped by wearable and material to limit draw calls. All profile hair/head-covering variants are separate selectable meshes. The model and 8 animation clips are 3.40 MB raw; the Three.js world itself remains dynamically loaded only when the user opens 3D mode.

## Verification

The Phase 2 E2E run checks all eight `gltf.animations` names and observes Idle, WalkStart/Walk, WalkStop, a turn clip, Run, and Interact in the browser. The existing scenario still covers collision blocking, camera-relative movement, NPC proximity/dialogue, mission routing, English/Arabic, mobile joystick, and accessibility scans.

Headless SwiftShader timing is recorded as software-renderer data only. Hardware Chrome results are recorded separately when a hardware-backed browser session is available.

