# SAJA traveler character and animation contract

## Delivered character

The Village GLB now contains a complete, stylized rigged traveler with face details, neck, ears, hands, tailored tunic and trim, sleeves, trousers, shoes, a cross-body satchel, and six separately selectable hair/headwear styles. The profile adapter applies skin, outfit, hair, and head-covering colors and toggles the selected style and accessory.

- Editable source: `assets/blender/saja-village.blend`
- Phase 2 Blender revision: `assets/blender/saja-village-phase2.py`
- GLB animation compiler: `assets/blender/compile-character-clips.py`
- Runtime asset: `public/assets/game/saja-village.glb`
- Runtime controller: `src/features/world/Village3D.tsx`

The character uses original SAJA geometry and original keyframed motion created for this project. No third-party motion files or motion-library licenses are involved. The character is a polished stylized game model; it is not presented as photorealistic or likeness-accurate.

## Rig and motion

The glTF skeleton retains these case-sensitive bone names:

`root`, `hips`, `spine`, `chest`, `neck`, `head`, `upper_arm.L`, `forearm.L`, `hand.L`, `upper_arm.R`, `forearm.R`, `hand.R`, `thigh.L`, `shin.L`, `foot.L`, `thigh.R`, `shin.R`, `foot.R`.

The GLB's `gltf.animations` contains eight usable clips: `Idle`, `Walk`, `Run`, `WalkStart`, `WalkStop`, `TurnLeft`, `TurnRight`, and `Interact`. Walk and Run are closed cycles with alternating leg and arm swing, knee flex, ankle movement, and torso counter-motion. The transition, turn, and interaction actions are finite clips. Every clip has 18 bone rotation channels.

All clips are in place. They contain no root position track. Rapier remains the only owner of world translation, collision, and ground contact. The runtime crossfades between actions and derives gait playback rate from the Rapier controller's actual displacement and the authored stride length, which keeps footfalls closer to planted at both walking and running speeds.

## Export path

The editable Blender source contains the eight named actions on separate NLA tracks. The hosted Blender compatibility export bakes the current scene as a single animation named `Scene`; it does not preserve the action library as separate glTF clips. `compile-character-clips.py` is the deterministic post-export step: it replaces that combined animation with the eight named standard glTF clips and writes the result back into the GLB binary. The browser and end-to-end checks verify the final names and play the clips through Three.js `AnimationMixer`.

To revise the model, open the saved `.blend`, run `saja-village-phase2.py` against its `TravelerRoot` and `TravelerArmature`, export the scene, then run:

```sh
python3 assets/blender/compile-character-clips.py exported-scene.glb public/assets/game/saja-village.glb
```

## Profile mapping

The runtime uses the mesh groups `Traveler Skin`, `Traveler Outfit`, `Traveler Outfit Trim`, `Traveler Trousers`, `Traveler Shoes`, `Traveler Satchel`, `Traveler Eyes`, `Traveler Irises`, `Traveler Pupils`, `Traveler Brows`, and the style groups `Traveler Style Short/Curly/Long/Hijab/Wrap/Kufi`. Outfit choices use the same modest tunic silhouette with the selected palette; the existing profile and 2D character flows remain available.

