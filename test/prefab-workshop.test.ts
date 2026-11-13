// Capture the real makeWorkshop boundary before conversion; browser services are explicit recording dependencies.
// This owner-requested conversion golden exercises no renderer, DOM, network or physics engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sourceFunction, sourceModule } from '../dev/level/source.ts';
import { H } from '../src/place/terrain.ts';
import * as layout from '../src/place/layout.ts';
import { housePlan, towerPlan, blockPlan } from '../src/place/building-plans.ts';
import { workshopKit } from '../src/entities/town/workshop-kit.ts';
import { PLAYER_R } from '../src/constants.ts';
import type { Body, Shape } from '../src/physics/engine.ts';
import type { Seat } from '../src/entities/railway/seat.ts';
import type { Plan } from '../src/place/building-plans.ts';

const opening = sourceModule<{ forgePlan(): Plan }>(fs.readFileSync('src/place/opening-plans.ts', 'utf8'), {
  FORGE: layout.FORGE,
  ORIGIN: layout.ORIGIN,
  TOWN: layout.TOWN,
  toWorld: layout.toWorld,
  H,
  planHouse: housePlan,
  planTower: towerPlan,
  planBlock: blockPlan,
});
export function captureWorkshop() {
  const plan = opening.forgePlan();
  const colliders: unknown[] = [],
    seats: unknown[] = [];
  const scene = new THREE.Group();
  const material = new THREE.MeshStandardNodeMaterial();
  const registerSeat = (seat: Seat) => {
    seats.push({ id: seat.id, group: seat.group, at: seat.at, exit: seat.exit, available: seat.available() });
    return () => {};
  };
  const staticBody = (shape: Shape, position: unknown, rotation?: THREE.Quaternion, group = 2) => {
    colliders.push({ shape, position, ...(rotation ? { rotation: rotation.toArray() } : {}), group });
    return {} as Body;
  };
  const chair = new THREE.Group();
  chair.name = 'captured-chair';
  const makeWorkshop = sourceFunction<typeof import('../src/entities/town/workshop.ts').makeWorkshop>(
    'src/entities/town/workshop.ts',
    'makeWorkshop',
    {
      THREE,
      reducedMotion: true,
      addBody: () => {},
      getMask: () => 0,
      removeBody: () => {},
      makeCameraArm: () => ({ solve() {} }),
      camConstraints: [],
      me: {},
      camera: new THREE.PerspectiveCamera(),
      scene,
      readableGlow: (m: unknown) => m,
      flat: () => material,
      draw: () => {},
      makeSet: () => ({ mesh: new THREE.Mesh(new THREE.BoxGeometry(), material) }),
      ROOM_GROUP: 8,
      staticBody,
      ROOM_CAM: { enter: 1 },
      WORKSHOP_DOOR: { x: -2.9, w: 2.8, rows: 3 },
      kitMaterial: material,
      registerSeat,
      seatHeight: 0.55 + PLAYER_R,
      seatMesh: () => chair,
      workshopKit,
      mergeGeometries,
    },
  );
  const view = makeWorkshop(
    plan,
    { snap() {}, lift() {} } as unknown as Parameters<typeof makeWorkshop>[1],
    () => true,
  );
  view.update(0);
  scene.updateMatrixWorld(true);
  const placement = {
    id: 'forge-workshop',
    local: chair.position.toArray(),
    world: chair.getWorldPosition(new THREE.Vector3()).toArray(),
    seats,
  };
  view.dispose();
  return { colliders, placement };
}
test('workshop collider and placement bytes match the pre-conversion code', () => {
  const actual = captureWorkshop();
  for (const [file, value] of [
    ['test/fixtures/prefab-colliders.json', actual.colliders],
    ['test/fixtures/prefab-placements.json', actual.placement],
  ] as const) {
    const bytes = JSON.stringify(value, null, 2) + '\n';
    if (process.env.GOLDEN === '1') fs.writeFileSync(file, bytes);
    assert.equal(bytes, fs.readFileSync(file, 'utf8'), file);
  }
});
