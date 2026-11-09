import { useEffect, useRef } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import {
  VILLAGE_3D_BOUNDS, VILLAGE_BUILDINGS, VILLAGE_DISCOVERIES,
  VILLAGE_GATE_X, VILLAGE_TREE_POSITIONS,
  type VillageBuilding,
} from './game/villageDistricts';

const STONE_COUNT = 360;
const ROAD_START = 18.25;

/** One draw call for a stone road rather than hundreds of individual meshes. */
function StoneRoad() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const stamp = new THREE.Object3D();
    for (let i = 0; i < STONE_COUNT; i++) {
      const row = Math.floor(i / 72);
      const column = i % 72;
      stamp.position.set(ROAD_START + column * 0.5 + (row % 2) * 0.18, 0.027, -1.48 + row * 0.74);
      stamp.rotation.set(0, ((column * 17 + row * 11) % 13 - 6) * 0.012, 0);
      stamp.scale.set(0.91 + (column % 3) * 0.018, 1, 0.9);
      stamp.updateMatrix();
      instanced.setMatrixAt(i, stamp.matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;
    instanced.computeBoundingSphere();
  }, []);
  return <instancedMesh ref={mesh} args={[undefined, undefined, STONE_COUNT]} receiveShadow>
    <boxGeometry args={[0.47, 0.048, 0.64]} />
    <meshStandardMaterial color="#d7bb8e" roughness={0.96} />
  </instancedMesh>;
}

/** A pair of shared instanced meshes keeps tree density inexpensive on mobile. */
function Orchard() {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const wood = trunks.current;
    const leaves = crowns.current;
    if (!wood || !leaves) return;
    const stamp = new THREE.Object3D();
    VILLAGE_TREE_POSITIONS.forEach(([x, z], index) => {
      stamp.position.set(x, 1.04, z);
      stamp.rotation.set(0, (index * 0.8) % (Math.PI * 2), 0);
      stamp.scale.setScalar(1);
      stamp.updateMatrix();
      wood.setMatrixAt(index, stamp.matrix);
      stamp.position.set(x, 2.6 + (index % 3) * 0.13, z);
      stamp.rotation.set(index * 0.17, index * 0.41, 0);
      stamp.scale.setScalar(0.93 + (index % 4) * 0.07);
      stamp.updateMatrix();
      leaves.setMatrixAt(index, stamp.matrix);
    });
    wood.instanceMatrix.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;
    wood.computeBoundingSphere();
    leaves.computeBoundingSphere();
  }, []);
  return <>
    <instancedMesh ref={trunks} args={[undefined, undefined, VILLAGE_TREE_POSITIONS.length]} castShadow>
      <cylinderGeometry args={[0.14, 0.23, 2.1, 7]} />
      <meshStandardMaterial color="#7e5740" roughness={1} />
    </instancedMesh>
    <instancedMesh ref={crowns} args={[undefined, undefined, VILLAGE_TREE_POSITIONS.length]}>
      <icosahedronGeometry args={[1.12, 1]} />
      <meshStandardMaterial color="#527b5d" roughness={1} flatShading />
    </instancedMesh>
  </>;
}

function House({ building }: { building: VillageBuilding }) {
  const { x, z, width, depth, height, wall, roof, kind } = building;
  const towardsRoad = z < 0 ? 1 : -1;
  const facadeZ = towardsRoad * (depth / 2 + 0.045);
  return <group position={[x, 0, z]} name={building.id}>
    <mesh position={[0, 0.15, 0]} receiveShadow>
      <boxGeometry args={[width + 0.34, 0.3, depth + 0.34]} />
      <meshStandardMaterial color="#9c7b60" roughness={1} />
    </mesh>
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={wall} roughness={0.94} />
    </mesh>
    <mesh position={[0, height + 0.38, 0]} castShadow>
      <coneGeometry args={[Math.max(width, depth) * 0.77, 1.25, 4]} />
      <meshStandardMaterial color={roof} roughness={0.92} flatShading />
    </mesh>
    <mesh position={[0, 1.08, facadeZ]}>
      <boxGeometry args={[1.07, 2.14, 0.13]} />
      <meshStandardMaterial color="#6e4d39" roughness={0.92} />
    </mesh>
    <mesh position={[0.4, 1.07, facadeZ + towardsRoad * 0.079]}>
      <sphereGeometry args={[0.069, 8, 6]} />
      <meshStandardMaterial color="#dbb579" metalness={0.65} roughness={0.35} />
    </mesh>
    {[-1, 1].map((side) => <group key={side}>
      <mesh position={[side * width * 0.3, 1.93, facadeZ]}>
        <boxGeometry args={[0.95, 1.02, 0.15]} />
        <meshStandardMaterial color="#446e70" roughness={0.38} metalness={0.08} />
      </mesh>
      <mesh position={[side * width * 0.3, 1.93, facadeZ + towardsRoad * 0.09]}>
        <boxGeometry args={[0.08, 1.13, 0.065]} />
        <meshStandardMaterial color="#f0debc" />
      </mesh>
      <mesh position={[side * width * 0.3, 1.93, facadeZ + towardsRoad * 0.09]}>
        <boxGeometry args={[1.01, 0.08, 0.068]} />
        <meshStandardMaterial color="#f0debc" />
      </mesh>
    </group>)}
    {kind !== 'house' && <>
      <mesh position={[0, height - 0.16, facadeZ + towardsRoad * 0.55]} castShadow>
        <boxGeometry args={[width * 0.88, 0.10, 1.15]} />
        <meshStandardMaterial color={kind === 'stall' ? '#b37c61' : '#e2b67d'} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.66, facadeZ + towardsRoad * 0.8]}>
        <boxGeometry args={[width * 0.76, 0.13, 0.75]} />
        <meshStandardMaterial color="#836246" roughness={0.98} />
      </mesh>
    </>}
  </group>;
}

function Gate({ x }: { x: number }) {
  return <group position={[x, 0, 0]}>
    {[-1, 1].map((side) => <group key={side} position={[0, 0, side * 3.4]}>
      <mesh position={[0, 1.76, 0]} castShadow>
        <boxGeometry args={[0.66, 3.52, 0.66]} />
        <meshStandardMaterial color="#e5d1ac" roughness={0.98} />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <boxGeometry args={[0.96, 0.34, 0.96]} />
        <meshStandardMaterial color="#b58e63" />
      </mesh>
    </group>)}
    <mesh position={[0, 3.68, 0]} castShadow>
      <boxGeometry args={[0.84, 0.52, 7.48]} />
      <meshStandardMaterial color="#d9bc90" roughness={0.9} />
    </mesh>
    <mesh position={[0, 4.1, 0]}>
      <boxGeometry args={[1.08, 0.26, 7.9]} />
      <meshStandardMaterial color="#805c47" roughness={1} />
    </mesh>
  </group>;
}

const LANTERN_POSITIONS = Array.from({ length: 16 }, (_, index): [number, number] => [
  20 + (index % 8) * 4.6,
  index < 8 ? -3.9 : 3.9,
]);

/** Three instanced draw calls replace 48 individual lantern meshes. */
function Lanterns() {
  const poles = useRef<THREE.InstancedMesh>(null);
  const lights = useRef<THREE.InstancedMesh>(null);
  const roofs = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const stamp = new THREE.Object3D();
    const layers = [
      { mesh: poles.current, height: 1.13 },
      { mesh: lights.current, height: 2.36 },
      { mesh: roofs.current, height: 2.72 },
    ];
    for (const { mesh, height } of layers) {
      if (!mesh) continue;
      LANTERN_POSITIONS.forEach(([x, z], index) => {
        stamp.position.set(x, height, z);
        stamp.rotation.set(0, 0, 0);
        stamp.scale.set(1, 1, 1);
        stamp.updateMatrix();
        mesh.setMatrixAt(index, stamp.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, []);
  return <>
    <instancedMesh ref={poles} args={[undefined, undefined, LANTERN_POSITIONS.length]}>
      <cylinderGeometry args={[0.09, 0.13, 2.26, 7]} />
      <meshStandardMaterial color="#604c39" metalness={0.15} roughness={0.7} />
    </instancedMesh>
    <instancedMesh ref={lights} args={[undefined, undefined, LANTERN_POSITIONS.length]}>
      <cylinderGeometry args={[0.36, 0.28, 0.55, 6]} />
      <meshStandardMaterial color="#f6c97c" emissive="#efad55" emissiveIntensity={0.9} roughness={0.3} />
    </instancedMesh>
    <instancedMesh ref={roofs} args={[undefined, undefined, LANTERN_POSITIONS.length]}>
      <coneGeometry args={[0.43, 0.32, 6]} />
      <meshStandardMaterial color="#5b4941" metalness={0.18} roughness={0.7} />
    </instancedMesh>
  </>;
}

function DiscoveryBeacon({ x, z }: { x: number; z: number }) {
  return <group position={[x, 0, z]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.095, 0]}>
      <ringGeometry args={[0.79, 0.86, 48]} />
      <meshBasicMaterial color="#efd293" transparent opacity={0.9} depthWrite={false} />
    </mesh>
    <mesh position={[0, 0.15, 0]}>
      <cylinderGeometry args={[0.25, 0.32, 0.3, 8]} />
      <meshStandardMaterial color="#c2ad87" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.36, 0]}>
      <octahedronGeometry args={[0.22, 0]} />
      <meshStandardMaterial color="#ffe0a0" emissive="#edb96c" emissiveIntensity={1.1} />
    </mesh>
  </group>;
}

/** Physical buildings, lit environmental storytelling and accessible player-triggered discovery. */
export function VillageDistricts() {
  const width = VILLAGE_3D_BOUNDS.right - 18;
  const center = 18 + width / 2;
  return <group name="SAJA Living Village V2">
    <mesh position={[center, -0.053, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width, 22]} />
      <meshStandardMaterial color="#bea982" roughness={1} />
    </mesh>
    {[-1, 1].map((side) => <mesh key={side} position={[center, -0.037, side * 6.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width, 8.4]} />
      <meshStandardMaterial color={side < 0 ? '#9f9c75' : '#b0a77b'} roughness={1} />
    </mesh>)}
    <StoneRoad />
    <Orchard />
    {VILLAGE_BUILDINGS.map((building) => <House key={building.id} building={building} />)}
    {VILLAGE_GATE_X.map((x) => <Gate key={x} x={x} />)}
    <Lanterns />
    {VILLAGE_DISCOVERIES.map((discovery) => <DiscoveryBeacon key={discovery.id} x={discovery.x} z={discovery.z} />)}
    <RigidBody type="fixed" colliders={false} userData={{ kind: 'village-extension' }}>
      {VILLAGE_BUILDINGS.map((building) => <CuboidCollider
        key={building.id}
        args={[building.width / 2 + 0.08, building.height / 2, building.depth / 2 + 0.08]}
        position={[building.x, building.height / 2, building.z]}
      />)}
      {VILLAGE_GATE_X.flatMap((x) => [-3.4, 3.4].map((z) => <CuboidCollider key={`${x}:${z}`} args={[0.38, 1.76, 0.38]} position={[x, 1.76, z]} />))}
      {VILLAGE_TREE_POSITIONS.map(([x, z], index) => <CuboidCollider key={index} args={[0.2, 1.05, 0.2]} position={[x, 1.05, z]} />)}
    </RigidBody>
  </group>;
}
