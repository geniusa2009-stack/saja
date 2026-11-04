# Temporary traveler replacement contract

Replace the engineering placeholder before describing this as a finished character. Preserve the runtime interface below so SAJA can replace the model without changing movement or mission code.

## Root, scale, orientation

- glTF scene root must contain `TravelerRoot` at the ground midpoint.
- Author in Blender Z-up metres at approximately 1.64 m tall, with feet at z=0 and the character facing Blender -Y. The current GLB conversion yields Three.js Y-up; verify its forward direction after export.
- Keep all walk/run clips in place. Rapier owns world translation and collision.
- Keep the model centered over the kinematic capsule (0.28 m radius, 1.56 m overall height) with feet aligned to ground height 0.

## Skeleton and clips

Retain these case-sensitive bones or update the runtime mapping together with the asset:

`root`, `hips`, `spine`, `chest`, `neck`, `head`, `upper_arm.L`, `forearm.L`, `hand.L`, `upper_arm.R`, `forearm.R`, `hand.R`, `thigh.L`, `shin.L`, `foot.L`, `thigh.R`, `shin.R`, `foot.R`.

Required glTF animation clip names:

`Idle`, `Walk`, `Run`, `WalkStart`, `WalkStop`, `TurnLeft`, `TurnRight`, `Interact`.

Crossfade between locomotion states, scale walk/run playback from measured player speed, and keep foot contact stable. Confirm `gltf.animations` contains all eight names in the browser before removing the runtime gait. The current GLB has a skinned mesh but `gltf.animations` is empty; the `.blend` source contains draft actions only.

## Mesh/material mapping

Keep modest outfit meshes and separate semantic pieces. The temporary Three.js profile adapter currently uses these mesh names for palette/accessory changes:

- `Traveler anatomical base` — skin tone
- `Long modest tunic`, `Long robe sleeve`, `Tunic hem braid`, `Woven sleeve cuff`, `Woven waist sash` — outfit color
- `Kufi cap`, `Kufi gold band` — kufi/covering visibility
- `Satchel body`, `Satchel flap` — satchel visibility

Implement the remaining SAJA looks deliberately: tunic, thobe, abaya, jubba, hoodie, short/curly/long hair, hijab/wrap/kufi, and none/glasses/scarf/satchel/lantern accessories. Do not infer a finished or likeness-accurate design from the current placeholder.

## Export and validation

Export a self-contained GLB with skins, named armature, materials, UVs, and all eight named clips. Keep a clean editable `.blend` source. Before delivery, inspect the full-body silhouette and feet, confirm the skinned mesh deforms cleanly at shoulders/hips/knees, play every clip in Blender and the browser, and check material palette swaps for every supported modest outfit/head covering. Record the GLB hash and validate the final scene in Chrome at desktop and mobile viewport sizes.
