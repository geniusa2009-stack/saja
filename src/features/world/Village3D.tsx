import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { CapsuleCollider, CuboidCollider, Physics, RigidBody, useRapier, type RapierCollider, type RapierRigidBody } from '@react-three/rapier';
import { Html, Sky, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { CharacterLook } from '@/domain/types';
import { HAIR_COLORS, HIJAB_COLORS, OUTFIT_COLORS, SKIN_TONES } from '@/features/character/palette';
import type { GameScene } from './game/types';
import { useI18n } from '@/i18n';
import { VILLAGE_ASSET_URL } from './villageAssets';

interface Props {
  scene: GameScene;
  look: CharacterLook;
  playerName: string;
  keys: MutableRefObject<Set<string>>;
  joystick: MutableRefObject<{ x: number; y: number }>;
  talking: boolean;
  reducedMotion: boolean;
  sprint: MutableRefObject<boolean>;
  stageRef: RefObject<HTMLDivElement | null>;
  onNearby: (nearby: boolean) => void;
  onMoving: (moving: boolean) => void;
}

const WORLD_SCALE = 50;
/**
 * Longest slice of game time simulated in one frame. A stalled frame (shader compile, slow GPU,
 * background tab) slows the game down instead of teleporting the traveller — the same policy as
 * the 2D fallback's fixedSteps(). At 10 fps and above the game runs in real time.
 */
const MAX_FRAME_SECONDS = 0.1;
/** Contacts whose normal points mostly up are the ground, not a wall. */
const WALL_NORMAL_MAX_Y = 0.5;
const CLIP_HISTORY = 12;
const worldPoint = (x: number, y: number): [number, number, number] => [x / WORLD_SCALE - 18, 0, 11 - y / WORLD_SCALE];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function VillageAsset() {
  const gltf = useGLTF(VILLAGE_ASSET_URL);
  const environment = useMemo(() => {
    const clone = cloneSkinned(gltf.scene);
    clone.getObjectByName('TravelerRoot')?.removeFromParent();
    clone.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return clone;
  }, [gltf.scene]);
  return <primitive object={environment} dispose={null} />;
}

function VillagePhysics({ scene }: { scene: GameScene }) {
  return <group>
    {scene.obstacles.map((rect, index) => {
      const [x, , z] = worldPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return <RigidBody key={index} type="fixed" colliders={false} position={[x, 0, z]} userData={{ kind: 'village-obstacle', index }}>
        <CuboidCollider args={[rect.width / WORLD_SCALE / 2 + 0.18, 1.8, rect.height / WORLD_SCALE / 2 + 0.18]} position={[0, 1.8, 0]} />
      </RigidBody>;
    })}
    <RigidBody type="fixed" colliders={false} position={[0, -0.18, 0]} userData={{ kind: 'ground' }}><CuboidCollider args={[18, 0.18, 11]} /></RigidBody>
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[0.25, 2.5, 11]} position={[-18.15, 2.5, 0]} /><CuboidCollider args={[0.25, 2.5, 11]} position={[18.15, 2.5, 0]} />
      <CuboidCollider args={[18, 2.5, 0.25]} position={[0, 2.5, -11.15]} /><CuboidCollider args={[18, 2.5, 0.25]} position={[0, 2.5, 11.15]} />
    </RigidBody>
    <RigidBody type="fixed" colliders={false} position={[1.1, 0.42, 1.1]} userData={{ kind: 'well' }}><CuboidCollider args={[0.78, 0.42, 0.78]} /></RigidBody>
  </group>;
}

function LoadingVillage() {
  const { l } = useI18n();
  return <Html center><div className="play-world__loading-card" role="status">{l({ en: 'Loading the village…', ar: 'جارٍ تحميل القرية…' })}</div></Html>;
}

interface TravellerAnimationState {
  moving: boolean;
  running: boolean;
  speed: number;
  turnRequest: number;
  turnDirection: number;
  interaction: number;
  activeClip: string;
}

const REQUIRED_CLIPS = ['Idle', 'Walk', 'Run', 'WalkStart', 'WalkStop', 'TurnLeft', 'TurnRight', 'Interact'];

function RiggedTraveller({ look, animation, reducedMotion }: { look: CharacterLook; animation: MutableRefObject<TravellerAnimationState>; reducedMotion: boolean }) {
  const gltf = useGLTF(VILLAGE_ASSET_URL);
  const rig = useMemo(() => {
    const source = gltf.scene.getObjectByName('TravelerRoot');
    const clone = source ? cloneSkinned(source) : new THREE.Group();
    const outfitColor = OUTFIT_COLORS[look.outfitColor] ?? OUTFIT_COLORS[1];
    const skinColor = SKIN_TONES[look.skin] ?? SKIN_TONES[2];
    const hairColor = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0];
    const hijabColor = HIJAB_COLORS[look.outfitColor % HIJAB_COLORS.length] ?? HIJAB_COLORS[0];
    const visibleStyle = 'Traveler Style ' + (look.hair === 'kufi' ? 'Kufi' : look.hair[0].toUpperCase() + look.hair.slice(1));
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (object.name.startsWith('Traveler Style ')) object.visible = object.name === visibleStyle;
      if (object.name === 'Traveler Satchel') object.visible = look.accessory === 'satchel';
      const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
      const materials = sourceMaterials.map((original) => {
        const material = original.clone();
        if (material.name === 'Traveler Skin') material.color.set(skinColor);
        if (material.name === 'Traveler Garment') material.color.set(outfitColor);
        if (material.name === 'Traveler Trousers') material.color.set(outfitColor).multiplyScalar(0.74);
        if (material.name === 'Traveler Hair' || material.name === 'Traveler Pupil and Brows') material.color.set(hairColor);
        if (material.name === 'Traveler Head Covering') material.color.set(hijabColor);
        return material;
      });
      object.material = Array.isArray(object.material) ? materials : materials[0];
    });
    return clone;
  }, [gltf.scene, look.accessory, look.hair, look.hairColor, look.outfitColor, look.skin]);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Map<string, THREE.AnimationAction>>(new Map());
  const driver = useRef<{ action: THREE.AnimationAction | null; name: string; oneShot: boolean; lastMoving: boolean; lastInteraction: number; lastTurn: number }>({
    action: null, name: '', oneShot: false, lastMoving: false, lastInteraction: animation.current.interaction, lastTurn: animation.current.turnRequest,
  });

  useEffect(() => {
    const mixer = new THREE.AnimationMixer(rig);
    const actions = new Map<string, THREE.AnimationAction>();
    for (const clip of gltf.animations) actions.set(clip.name, mixer.clipAction(clip));
    mixerRef.current = mixer;
    actionsRef.current = actions;
    const state = driver.current;
    state.action = null;
    state.name = '';
    state.oneShot = false;
    state.lastMoving = false;
    state.lastInteraction = animation.current.interaction;
    state.lastTurn = animation.current.turnRequest;
    const onFinished = (event: { action: THREE.AnimationAction }) => {
      if (event.action === state.action && state.oneShot) state.oneShot = false;
    };
    mixer.addEventListener('finished', onFinished);
    const idle = actions.get('Idle');
    if (idle) {
      idle.setLoop(THREE.LoopRepeat, Infinity);
      idle.play();
      state.action = idle;
      state.name = 'Idle';
      animation.current.activeClip = 'Idle';
    } else {
      animation.current.activeClip = 'Missing clips';
    }
    return () => {
      mixer.removeEventListener('finished', onFinished);
      mixer.stopAllAction();
      mixer.uncacheRoot(rig);
      actions.clear();
      actionsRef.current = new Map();
      mixerRef.current = null;
      rig.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
    };
  }, [animation, gltf.animations, rig]);

  useFrame((_, delta) => {
    const mixer = mixerRef.current;
    const actions = actionsRef.current;
    if (!mixer) return;
    const state = animation.current;
    const current = driver.current;
    const play = (name: string, loop = true) => {
      const next = actions.get(name);
      if (!next) {
        state.activeClip = 'Missing clips';
        return;
      }
      if (current.name === name && next.isRunning()) return;
      next.reset();
      next.enabled = true;
      next.setEffectiveWeight(1);
      next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      next.clampWhenFinished = !loop;
      if (current.action && current.action !== next) next.crossFadeFrom(current.action, loop ? 0.18 : 0.12, true);
      else next.fadeIn(0.12);
      next.play();
      current.action = next;
      current.name = name;
      current.oneShot = !loop;
      state.activeClip = name;
    };

    // The mixer's finished event releases clamped one-shot animations reliably.
    if (state.interaction !== current.lastInteraction) {
      current.lastInteraction = state.interaction;
      play('Interact', false);
    } else if (state.turnRequest !== current.lastTurn) {
      current.lastTurn = state.turnRequest;
      play(state.turnDirection < 0 ? 'TurnRight' : 'TurnLeft', false);
    } else if (!current.oneShot) {
      if (state.moving !== current.lastMoving) {
        current.lastMoving = state.moving;
        play(state.moving ? 'WalkStart' : 'WalkStop', false);
      } else {
        play(state.moving ? (state.running ? 'Run' : 'Walk') : 'Idle', true);
      }
    }

    if (current.action) {
      const cycleSeconds = current.name === 'Run' ? 0.8 : 1;
      const strideLength = current.name === 'Run' ? 3.2 : 2.05;
      const playbackRate = current.name === 'Walk' || current.name === 'Run'
        ? clamp(state.speed * cycleSeconds / strideLength, 0.68, 2.2)
        : current.name === 'WalkStart' || current.name === 'WalkStop'
          ? clamp(state.speed / 4.1, 0.78, 1.18)
          : 1;
      current.action.setEffectiveTimeScale(playbackRate);
    }
    // Slow idle and interaction motion for reduced-motion users while keeping gait synced to Rapier.
    const motionScale = reducedMotion && !state.moving ? 0.7 : 1;
    // Same cap as movement, so the gait stays in step with the distance actually covered.
    mixer.update(Math.min(delta, MAX_FRAME_SECONDS) * motionScale);
  });

  const availableClips = gltf.animations.map((clip) => clip.name).join('|');
  return <group position={[0, -0.78, 0]} userData={{ source: 'Blender SAJA rig', animationClips: availableClips }}><primitive object={rig} dispose={null} /></group>;
}
function Player(props: Props) {
  const { scene, look, playerName, keys, joystick, talking, reducedMotion, sprint, stageRef, onNearby, onMoving } = props;
  const gltf = useGLTF(VILLAGE_ASSET_URL);
  const availableClips = gltf.animations.map((clip) => clip.name).join('|');
  const playerAnimation = useRef<TravellerAnimationState>({ moving: false, running: false, speed: 0, turnRequest: 0, turnDirection: 1, interaction: 0, activeClip: 'Idle' });
  const npcAnimation = useRef<TravellerAnimationState>({ moving: false, running: false, speed: 0, turnRequest: 0, turnDirection: 1, interaction: 0, activeClip: 'Idle' });
  const previousTalking = useRef(talking);
  useEffect(() => {
    if (talking && !previousTalking.current) {
      playerAnimation.current.interaction += 1;
      npcAnimation.current.interaction += 1;
    }
    previousTalking.current = talking;
  }, [talking]);
  const body = useRef<RapierRigidBody>(null);
  const capsule = useRef<RapierCollider>(null);
  const visual = useRef<THREE.Group>(null);
  const { world, rapier } = useRapier();
  const controller = useRef<ReturnType<typeof world.createCharacterController> | null>(null);
  const velocity = useRef(new THREE.Vector3());
  const verticalSpeed = useRef(-0.5);
  const heading = useRef(Math.PI / 2);
  const yaw = useRef(Math.PI / 2);
  const pitch = useRef(0.24);
  const cameraDistance = useRef(6.6);
  const nearby = useRef(false);
  const nearbyGrace = useRef(0);
  const npcDistance = useRef(Number.POSITIVE_INFINITY);
  const moving = useRef(false);
  const running = useRef(false);
  const lastTelemetry = useRef(0);
  const lastDesiredHeading = useRef(heading.current);
  const lastTurnRequestAt = useRef(0);
  const collisionCount = useRef(0);
  const clipHistory = useRef<string[]>(['Idle']);
  const [telemetry, setTelemetry] = useState({ x: 0, z: 0, hits: 0, cameraYaw: yaw.current, facingYaw: heading.current, animation: 'Idle', history: 'Idle' });
  const direction = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const forward = useMemo(() => new THREE.Vector3(), []);
  const delta = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const cameraPos = useMemo(() => new THREE.Vector3(), []);
  const desiredVelocity = useMemo(() => new THREE.Vector3(), []);
  const rayDir = useMemo(() => new THREE.Vector3(), []);
  const rayFrom = useMemo(() => new THREE.Vector3(), []);
  const [startX, , startZ] = worldPoint(scene.start.x, scene.start.y);
  const [npcX, , npcZ] = worldPoint(scene.npc.x, scene.npc.y);

  useEffect(() => {
    if (!body.current || !capsule.current) return;
    const character = world.createCharacterController(0.025);
    character.setSlideEnabled(true);
    character.setMaxSlopeClimbAngle(Math.PI / 3);
    character.setMinSlopeSlideAngle(Math.PI / 4);
    character.enableAutostep(0.22, 0.16, false);
    character.enableSnapToGround(0.18);
    character.setApplyImpulsesToDynamicBodies(false);
    controller.current = character;
    return () => { controller.current = null; world.removeCharacterController(character); };
  }, [world]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let pointer: number | null = null;
    let lastX = 0;
    let lastY = 0;
    const down = (event: PointerEvent) => {
      if (!(event.target instanceof HTMLCanvasElement) || event.button !== 0) return;
      pointer = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      stage.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (pointer !== event.pointerId) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      yaw.current -= dx * 0.0045;
      pitch.current = clamp(pitch.current + dy * 0.0035, -0.04, 0.62);
    };
    const up = (event: PointerEvent) => { if (pointer === event.pointerId) pointer = null; };
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    return () => {
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', up);
    };
  }, [stageRef]);

  useFrame(({ camera }, frameSeconds) => {
    const rigidBody = body.current;
    const playerCollider = capsule.current;
    const character = controller.current;
    if (!rigidBody || !playerCollider || !character) return;
    const dt = Math.min(frameSeconds, MAX_FRAME_SECONDS);

    const keySet = keys.current;
    const rawX = Number(keySet.has('ArrowRight') || keySet.has('KeyD')) - Number(keySet.has('ArrowLeft') || keySet.has('KeyA'));
    const rawY = Number(keySet.has('ArrowDown') || keySet.has('KeyS')) - Number(keySet.has('ArrowUp') || keySet.has('KeyW'));
    const stick = joystick.current;
    const inputX = stick.x || rawX;
    const inputY = stick.y || rawY;
    const enabled = !talking;
    const camSin = Math.sin(yaw.current);
    const camCos = Math.cos(yaw.current);
    right.set(camCos, 0, -camSin);
    forward.set(camSin, 0, camCos);
    direction.set(0, 0, 0);
    if (enabled) direction.addScaledVector(right, inputX).addScaledVector(forward, -inputY);
    if (direction.lengthSq() > 1) direction.normalize();

    const isMoving = direction.lengthSq() > 0.01;
    const currentMoving = isMoving && enabled;
    if (currentMoving !== moving.current) {
      moving.current = currentMoving;
      onMoving(currentMoving);
    }
    const state = rigidBody.translation();
    if (isMoving) {
      heading.current = Math.atan2(direction.x, direction.z);
      const turn = Math.atan2(Math.sin(heading.current - lastDesiredHeading.current), Math.cos(heading.current - lastDesiredHeading.current));
      const now = performance.now();
      if (Math.abs(turn) > 1.05 && now - lastTurnRequestAt.current > 650) {
        playerAnimation.current.turnRequest += 1;
        playerAnimation.current.turnDirection = Math.sign(turn);
        lastTurnRequestAt.current = now;
      }
      lastDesiredHeading.current = heading.current;
    }
    const maxSpeed = sprint.current || keySet.has('ShiftLeft') || keySet.has('ShiftRight') ? 6.3 : 4.1;
    running.current = isMoving && maxSpeed > 5;
    const desiredSpeed = isMoving && enabled ? maxSpeed : 0;
    const acceleration = isMoving ? 13 : 16;
    desiredVelocity.copy(direction).multiplyScalar(desiredSpeed);
    velocity.current.lerp(desiredVelocity, 1 - Math.exp(-acceleration * dt));
    verticalSpeed.current = Math.max(-18, verticalSpeed.current - 9.81 * dt);
    delta.set(velocity.current.x * dt, verticalSpeed.current * dt, velocity.current.z * dt);
    character.computeColliderMovement(playerCollider, delta);
    // Count walls only: standing on the ground is a contact every frame and must not look like a collision.
    for (let i = 0; i < character.numComputedCollisions(); i++) {
      const hit = character.computedCollision(i);
      if (hit && Math.abs(hit.normal1.y) < WALL_NORMAL_MAX_Y) collisionCount.current += 1;
    }
    const allowed = character.computedMovement();
    if (character.computedGrounded() && verticalSpeed.current < 0) verticalSpeed.current = -1.2;
    const actualSpeed = Math.hypot(allowed.x, allowed.z) / Math.max(dt, 0.001);
    playerAnimation.current.moving = currentMoving && actualSpeed > 0.16;
    playerAnimation.current.running = playerAnimation.current.moving && running.current;
    playerAnimation.current.speed = actualSpeed;
    const next = { x: state.x + allowed.x, y: state.y + allowed.y, z: state.z + allowed.z };
    rigidBody.setNextKinematicTranslation(next);

    if (visual.current) {
      visual.current.rotation.y += Math.atan2(Math.sin(heading.current - visual.current.rotation.y), Math.cos(heading.current - visual.current.rotation.y)) * (reducedMotion ? 1 : 1 - Math.exp(-10 * dt));
    }
    const dNpc = Math.hypot(next.x - npcX, next.z - npcZ);
    npcDistance.current = dNpc;
    // Test the swept movement segment too: at low frame rates a step can cross
    // the interaction radius without stopping inside it.
    const pathLengthSq = allowed.x * allowed.x + allowed.z * allowed.z;
    const nearestT = pathLengthSq > 1e-8
      ? clamp(((npcX - state.x) * allowed.x + (npcZ - state.z) * allowed.z) / pathLengthSq, 0, 1)
      : 0;
    const nearestX = state.x + allowed.x * nearestT;
    const nearestZ = state.z + allowed.z * nearestT;
    const enteredRange = dNpc <= 3 || Math.hypot(nearestX - npcX, nearestZ - npcZ) <= 3;
    if (enteredRange) nearbyGrace.current = 1.25;
    else nearbyGrace.current = Math.max(0, nearbyGrace.current - dt);
    const isNear = enteredRange || nearbyGrace.current > 0;
    if (isNear !== nearby.current) {
      nearby.current = isNear;
      onNearby(isNear);
    }

    target.set(next.x, next.y + 1.05, next.z);
    const horizontalDistance = cameraDistance.current * Math.cos(pitch.current);
    const wanted = cameraPos.set(
      target.x - Math.sin(yaw.current) * horizontalDistance,
      target.y + Math.sin(pitch.current) * cameraDistance.current + 0.18,
      target.z - Math.cos(yaw.current) * horizontalDistance,
    );
    rayFrom.copy(target);
    rayDir.subVectors(wanted, target);
    const desiredDistance = rayDir.length();
    rayDir.normalize();
    const hit = world.castRay(new rapier.Ray(rayFrom, rayDir), desiredDistance, true, undefined, undefined, playerCollider);
    const safeDistance = hit ? Math.max(1.55, hit.timeOfImpact - 0.35) : desiredDistance;
    wanted.copy(target).addScaledVector(rayDir, safeDistance);
    camera.position.lerp(wanted, reducedMotion ? 1 : 1 - Math.exp(-8 * dt));
    camera.lookAt(target);

    // Clip changes are published at once (one-shot clips can be shorter than the sampling interval).
    const clip = playerAnimation.current.activeClip;
    const clipChanged = clip !== clipHistory.current[clipHistory.current.length - 1];
    if (clipChanged) clipHistory.current = [...clipHistory.current, clip].slice(-CLIP_HISTORY);
    if (clipChanged || performance.now() - lastTelemetry.current > 140) {
      lastTelemetry.current = performance.now();
      setTelemetry({ x: (next.x + 18) * WORLD_SCALE, z: (11 - next.z) * WORLD_SCALE, hits: collisionCount.current, cameraYaw: yaw.current, facingYaw: visual.current?.rotation.y ?? heading.current, animation: clip, history: clipHistory.current.join('|') });
    }
  });

  return <>
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[startX, 0.78, startZ]} enabledRotations={[false, false, false]} userData={{ kind: 'player', displayName: playerName }}>
      <CapsuleCollider ref={capsule} args={[0.5, 0.28]} />
      <group ref={visual}><RiggedTraveller look={look} animation={playerAnimation} reducedMotion={reducedMotion} /></group>
    </RigidBody>
    <RigidBody type="fixed" colliders={false} position={[npcX, 0.78, npcZ]} userData={{ kind: 'npc', id: scene.npc.id }}>
      <CapsuleCollider args={[0.52, 0.28]} />
      <RiggedTraveller look={{ skin: 2, hair: 'wrap', hairColor: 1, outfit: 'abaya', outfitColor: 3, accessory: 'none' }} animation={npcAnimation} reducedMotion={reducedMotion} />
    </RigidBody>
    <mesh position={[npcX, 2.35, npcZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.88, 2.96, 40]} /><meshBasicMaterial color={nearby.current ? '#f4d991' : '#4f8574'} transparent opacity={0.8} />
    </mesh>
    <Html style={{ display: 'none' }}>
      <span data-testid="three-player-state" data-x={telemetry.x.toFixed(1)} data-z={telemetry.z.toFixed(1)} data-collisions={telemetry.hits} data-camera-yaw={telemetry.cameraYaw.toFixed(3)} data-facing-yaw={telemetry.facingYaw.toFixed(3)} data-animation={telemetry.animation} data-animation-history={telemetry.history} data-npc-distance={npcDistance.current.toFixed(2)} data-npc-nearby={String(nearby.current)} data-animations={availableClips} data-required-animations={REQUIRED_CLIPS.join('|')} />
    </Html>
  </>;
}

export function Village3D(props: Props) {
  const { l } = useI18n();
  const coarse = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches, []);
  return <div className="play-world__three">
    <Canvas
      shadows={!coarse}
      dpr={coarse ? 1 : [1, 1.5]}
      camera={{ position: [-6, 2.8, -3.5], fov: 48, near: 0.1, far: 140 }}
      fallback={<div role="status">{l({ en: '3D graphics are unavailable on this device. Use 2D mode.', ar: 'الرسوم ثلاثية الأبعاد غير متاحة على هذا الجهاز. استخدم الوضع ثنائي الأبعاد.' })}</div>}
      gl={{ antialias: !coarse, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => {
        gl.setPixelRatio(coarse ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
        gl.shadowMap.enabled = !coarse;
        scene.background = new THREE.Color('#8caeaf');
      }}
    >
      <Sky sunPosition={[1.4, 2.6, -1.5]} turbidity={7} rayleigh={0.65} />
      <ambientLight intensity={1.15} color="#f5ead3" />
      <hemisphereLight intensity={1.15} color="#d4e2da" groundColor="#80694b" />
      <directionalLight position={[-6, 13, -5]} intensity={2.2} color="#ffe2b3" castShadow={!coarse} shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-bias={-0.0002} />
      {/* One physics step per rendered frame: the player is kinematic and moves by the frame's
          (capped) delta, so a fixed 1/60 step would either skip frames on fast displays (stale
          translation, lost movement) or run many full steps per frame on slow devices. */}
      <Physics gravity={[0, -9.81, 0]} timeStep="vary" colliders={false}>
        <VillagePhysics scene={props.scene} />
        <Suspense fallback={<LoadingVillage />}>
          <VillageAsset />
          <Player {...props} />
        </Suspense>
      </Physics>
    </Canvas>
  </div>;
}




