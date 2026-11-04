import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { CapsuleCollider, CuboidCollider, Physics, RigidBody, useRapier, type RapierCollider, type RapierRigidBody } from '@react-three/rapier';
import { Html, Sky, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { CharacterLook } from '@/domain/types';
import { HAIR_COLORS, OUTFIT_COLORS, SKIN_TONES } from '@/features/character/palette';
import type { GameScene } from './game/types';

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
const worldPoint = (x: number, y: number): [number, number, number] => [x / WORLD_SCALE - 18, 0, 11 - y / WORLD_SCALE];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function VillageAsset() {
  const gltf = useGLTF('/assets/game/saja-village.glb');
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
  return <Html center><div className="play-world__loading-card">Loading village</div></Html>;
}

function RiggedTraveller({ look, moving, running, greeting, reducedMotion }: { look: CharacterLook; moving: boolean; running: boolean; greeting: boolean; reducedMotion: boolean }) {
  const gltf = useGLTF('/assets/game/saja-village.glb');
  const rig = useMemo(() => {
    const source = gltf.scene.getObjectByName('TravelerRoot');
    const clone = source ? cloneSkinned(source) : new THREE.Group();
    const outfitColor = OUTFIT_COLORS[look.outfitColor] ?? OUTFIT_COLORS[1];
    const skinColor = SKIN_TONES[look.skin] ?? SKIN_TONES[2];
    const hairColor = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0];
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
      const materials = sourceMaterials.map((original) => {
        const material = original.clone();
        if (/Traveler anatomical base/i.test(object.name)) material.color.set(skinColor);
        if (/Long modest tunic|Long robe sleeve|Tunic hem braid|Woven sleeve cuff|Woven waist sash/i.test(object.name)) material.color.set(outfitColor);
        if (/Kufi cap|Kufi gold band/i.test(object.name) && !['kufi', 'hijab', 'wrap'].includes(look.hair)) object.visible = false;
        if (/Satchel/i.test(object.name) && look.accessory !== 'satchel') object.visible = false;
        return material;
      });
      object.material = Array.isArray(object.material) ? materials : materials[0];
    });
    if (look.hair !== 'kufi') {
      const head = clone.getObjectByName('head');
      if (head) {
        const covering = look.hair === 'hijab' || look.hair === 'wrap';
        const hair = new THREE.Mesh(
          new THREE.SphereGeometry(covering ? 0.235 : 0.205, 14, 10),
          new THREE.MeshStandardMaterial({ color: covering ? outfitColor : hairColor, roughness: 0.94 }),
        );
        hair.name = covering ? 'SAJA profile hijab placeholder' : 'SAJA profile hair placeholder';
        hair.position.set(0, 0.12, 0);
        hair.scale.set(1, covering ? 0.92 : 0.74, 1.08);
        hair.castShadow = true;
        head.add(hair);
      }
    }
    return clone;
  }, [gltf.scene, look.accessory, look.hair, look.hairColor, look.outfitColor, look.skin]);
  const bindPose = useRef<Map<string, THREE.Euler>>(new Map());
  useEffect(() => {
    bindPose.current.clear();
    const names = ['thigh.L', 'thigh.R', 'shin.L', 'shin.R', 'upper_arm.L', 'upper_arm.R', 'forearm.L', 'forearm.R', 'spine', 'chest'];
    for (const name of names) {
      const bone = rig.getObjectByName(name);
      if (bone) bindPose.current.set(name, bone.rotation.clone());
    }
    return () => {
      rig.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
    };
  }, [rig]);
  useFrame(({ clock }) => {
    const phase = clock.elapsedTime * (running ? 12 : 9);
    const swing = moving && !reducedMotion ? Math.sin(phase) * (running ? 0.62 : 0.43) : 0;
    const set = (name: string, x: number, y = 0, z = 0) => {
      const bone = rig.getObjectByName(name);
      const base = bindPose.current.get(name);
      if (bone && base) bone.rotation.set(base.x + x, base.y + y, base.z + z);
    };
    set('thigh.L', swing);
    set('thigh.R', -swing);
    set('shin.L', Math.max(0, -swing) * 0.5);
    set('shin.R', Math.max(0, swing) * 0.5);
    set('upper_arm.L', -swing * 0.62);
    set('upper_arm.R', greeting ? -1.05 + Math.sin(phase * 1.7) * 0.12 : swing * 0.62, 0, greeting ? -0.22 : 0);
    set('forearm.R', greeting ? -0.28 : 0);
    set('spine', 0, 0, moving && !reducedMotion ? Math.sin(phase * 2) * 0.018 : 0);
  });
  return <group position={[0, -0.78, 0]} userData={{ temporaryPlaceholder: true, source: 'Blender SAJA humanoid rig' }}><primitive object={rig} dispose={null} /></group>;
}

function Player(props: Props) {
  const { scene, look, playerName, keys, joystick, talking, reducedMotion, sprint, stageRef, onNearby, onMoving } = props;
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
  const moving = useRef(false);
  const running = useRef(false);
  const lastTelemetry = useRef(0);
  const collisionCount = useRef(0);
  const [telemetry, setTelemetry] = useState({ x: 0, z: 0, hits: 0, cameraYaw: yaw.current, facingYaw: heading.current });
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

  useFrame(({ camera }, dt) => {
    const rigidBody = body.current;
    const playerCollider = capsule.current;
    const character = controller.current;
    if (!rigidBody || !playerCollider || !character) return;

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
    if (isMoving) heading.current = Math.atan2(direction.x, direction.z);
    const maxSpeed = sprint.current || keySet.has('ShiftLeft') || keySet.has('ShiftRight') ? 6.3 : 4.1;
    running.current = isMoving && maxSpeed > 5;
    const desiredSpeed = isMoving && enabled ? maxSpeed : 0;
    const acceleration = isMoving ? 13 : 16;
    desiredVelocity.copy(direction).multiplyScalar(desiredSpeed);
    velocity.current.lerp(desiredVelocity, 1 - Math.exp(-acceleration * Math.min(dt, 0.05)));
    verticalSpeed.current = Math.max(-18, verticalSpeed.current - 9.81 * Math.min(dt, 0.05));
    delta.set(velocity.current.x * dt, verticalSpeed.current * dt, velocity.current.z * dt);
    character.computeColliderMovement(playerCollider, delta);
    collisionCount.current += character.numComputedCollisions();
    const allowed = character.computedMovement();
    if (character.computedGrounded() && verticalSpeed.current < 0) verticalSpeed.current = -1.2;
    const next = { x: state.x + allowed.x, y: state.y + allowed.y, z: state.z + allowed.z };
    rigidBody.setNextKinematicTranslation(next);

    if (visual.current) {
      visual.current.rotation.y += Math.atan2(Math.sin(heading.current - visual.current.rotation.y), Math.cos(heading.current - visual.current.rotation.y)) * (reducedMotion ? 1 : 1 - Math.exp(-10 * Math.min(dt, 0.05)));
    }
    const dNpc = Math.hypot(next.x - npcX, next.z - npcZ);
    const isNear = dNpc <= 2.25;
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
    camera.position.lerp(wanted, reducedMotion ? 1 : 1 - Math.exp(-8 * Math.min(dt, 0.05)));
    camera.lookAt(target);

    if (performance.now() - lastTelemetry.current > 140) {
      lastTelemetry.current = performance.now();
      setTelemetry({ x: (next.x + 18) * WORLD_SCALE, z: (11 - next.z) * WORLD_SCALE, hits: collisionCount.current, cameraYaw: yaw.current, facingYaw: visual.current?.rotation.y ?? heading.current });
    }
  });

  return <>
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[startX, 0.78, startZ]} enabledRotations={[false, false, false]} userData={{ kind: 'player', displayName: playerName }}>
      <CapsuleCollider ref={capsule} args={[0.5, 0.28]} />
      <group ref={visual}><RiggedTraveller look={look} moving={moving.current} running={running.current} greeting={false} reducedMotion={reducedMotion} /></group>
    </RigidBody>
    <RigidBody type="fixed" colliders={false} position={[npcX, 0.78, npcZ]} userData={{ kind: 'npc', id: scene.npc.id }}>
      <CapsuleCollider args={[0.52, 0.28]} />
      <RiggedTraveller look={{ skin: 2, hair: 'wrap', hairColor: 1, outfit: 'abaya', outfitColor: 3, accessory: 'none' }} moving={false} running={false} greeting={talking} reducedMotion={reducedMotion} />
    </RigidBody>
    <mesh position={[npcX, 2.35, npcZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.15, 2.22, 40]} /><meshBasicMaterial color={nearby.current ? '#f4d991' : '#4f8574'} transparent opacity={0.8} />
    </mesh>
    <Html style={{ display: 'none' }}>
      <span data-testid="three-player-state" data-x={telemetry.x.toFixed(1)} data-z={telemetry.z.toFixed(1)} data-collisions={telemetry.hits} data-camera-yaw={telemetry.cameraYaw.toFixed(3)} data-facing-yaw={telemetry.facingYaw.toFixed(3)} />
    </Html>
  </>;
}

export function Village3D(props: Props) {
  const coarse = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches, []);
  return <div className="play-world__three">
    <Canvas
      shadows={!coarse}
      dpr={coarse ? 1 : [1, 1.5]}
      camera={{ position: [-6, 2.8, -3.5], fov: 48, near: 0.1, far: 140 }}
      fallback={<div role="status">3D graphics are unavailable on this device. Switch to 2D mode.</div>}
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
      <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60} colliders={false}>
        <VillagePhysics scene={props.scene} />
        <Suspense fallback={<LoadingVillage />}>
          <VillageAsset />
          <Player {...props} />
        </Suspense>
      </Physics>
    </Canvas>
  </div>;
}

