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
import { names } from '../src/prefab/names.ts';
import {
  validateArtifact,
  validateLevel,
  validateLevelArtifact,
  validatePrefab,
  validateColliderScale,
} from '../src/prefab/validate.ts';
import type { Placement, PrefabArtifact } from '../src/prefab/types.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import workshop from '../content/built/levels/workshop.json' with { type: 'json' };

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
  const createOwnedView = sourceFunction<typeof import('../src/render/owned-view.ts').createOwnedView>(
    'src/render/owned-view.ts',
    'createOwnedView',
    { THREE, owners: new WeakMap(), addBody: () => {}, removeBody: () => {} },
  );
  const runtime = sourceModule<{
    instantiate: typeof import('../src/prefab/instantiate.ts').instantiate;
    workshopChair: Placement;
  }>(fs.readFileSync('src/prefab/instantiate.ts', 'utf8'), {
    THREE,
    artifact,
    workshop,
    names,
    validateArtifact,
    validateColliderScale,
    validatePrefab,
    validateLevel,
    validateLevelArtifact,
    builders: new Map([['seat.chair', () => chair]]),
    registerSeat,
    ROOM_GROUP: 8,
    staticBody,
  });
  let chairRoot = chair;
  const instantiate: typeof runtime.instantiate = (...args) => {
    const instance = runtime.instantiate(...args);
    chairRoot = instance.root;
    return instance;
  };
  const makeWorkshop = sourceFunction<typeof import('../src/entities/town/workshop.ts').makeWorkshop>(
    'src/entities/town/workshop.ts',
    'makeWorkshop',
    {
      THREE,
      instantiate,
      workshopChair: runtime.workshopChair,
      createOwnedView,
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
    local: chairRoot.position.toArray(),
    world: chairRoot.getWorldPosition(new THREE.Vector3()).toArray(),
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

// The same source-owned boundary as the golden, with real ownership and recording allocation services.
function runtimeHarness() {
  const active = new Set<Body>(),
    seats: Seat[] = [];
  let allocations = 0;
  const createOwnedView = sourceFunction<typeof import('../src/render/owned-view.ts').createOwnedView>(
    'src/render/owned-view.ts',
    'createOwnedView',
    {
      THREE,
      owners: new WeakMap(),
      addBody: (body: Body) => active.add(body),
      removeBody: (body: Body) => active.delete(body),
    },
  );
  const registerSeat = sourceFunction<typeof import('../src/entities/railway/seat.ts').registerSeat>(
    'src/entities/railway/seat.ts',
    'registerSeat',
    { seats, sitting: null, standUp: () => {} },
  );
  const data = structuredClone(artifact) as unknown as PrefabArtifact;
  const runtime = sourceModule<typeof import('../src/prefab/instantiate.ts')>(
    fs.readFileSync('src/prefab/instantiate.ts', 'utf8'),
    {
      THREE,
      artifact: data,
      workshop,
      names,
      validateArtifact,
      validateColliderScale,
      validateLevel,
      validateLevelArtifact,
      validatePrefab,
      builders: new Map([
        [
          'seat.chair',
          () => {
            allocations++;
            return new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardNodeMaterial());
          },
        ],
      ]),
      registerSeat,
      ROOM_GROUP: 8,
      staticBody: () => ({}) as Body,
    },
  );
  const owner = createOwnedView();
  return {
    owner,
    data,
    placement: runtime.workshopChair,
    active,
    seats,
    get allocations() {
      return allocations;
    },
    spawn(
      placement: Placement = runtime.workshopChair,
      gates: Readonly<Record<string, () => boolean>> = { open: () => true },
    ) {
      return runtime.instantiate(placement.prefab, placement, { owner, gates });
    },
  };
}

test('review regression: disposed owner refuses instantiation before allocation', () => {
  const h = runtimeHarness();
  h.owner.dispose();
  try {
    assert.throws(() => h.spawn(), /disposed/);
    assert.equal(h.allocations, 0);
    assert.equal(h.owner.root.children.length, 0);
    assert.equal(h.seats.length, 0);
    assert.equal(h.active.size, 0);
  } finally {
    h.owner.dispose();
  }
});

test('review regression: unsupported capsule is rejected without orphaning a mesh', () => {
  const h = runtimeHarness();
  const record = h.data.prefabs['town.workshop-chair']!;
  record.colliders = [{ shape: 'capsule', at: [0, 0, 0], r: 1, halfHeight: 1 }];
  try {
    assert.throws(() => h.spawn(), /capsule/);
    assert.equal(h.owner.root.children.length, 0);
    assert.equal(h.owner.counts().meshes, 0);
    assert.equal(h.allocations, 0);
    assert.equal(h.seats.length, 0);
    assert.equal(h.active.size, 0);
    assert.throws(() => validatePrefab(record), /capsule/);
  } finally {
    h.owner.dispose();
  }
});

test('review regression: rotated collider rejects every nonuniform axis pair', () => {
  const h = runtimeHarness();
  h.data.prefabs['town.workshop-chair']!.colliders = [
    { shape: 'box', at: [0, 0, 0], half: [1, 1, 1], rot: [Math.PI / 4, 0, 0] },
  ];
  try {
    for (const scale of [
      [2, 1, 1],
      [1, 2, 1],
      [1, 1, 2],
    ] as const) {
      assert.throws(() => h.spawn({ ...h.placement, scale }), /nonuniform/);
      assert.equal(h.owner.root.children.length, 0);
    }
    assert.equal(h.allocations, 0);
    assert.equal(h.seats.length, 0);
    assert.equal(h.active.size, 0);
    const valid = h.spawn({ ...h.placement, scale: [2, 2, 2] });
    valid.setEnabled(true);
    assert.equal(h.active.size, 1);
    assert.equal(h.seats.length, 1);
    h.owner.dispose();
    assert.equal(h.active.size, 0);
    assert.equal(h.seats.length, 0);
  } finally {
    h.owner.dispose();
  }
});

test('re-review: rotated unit-scale placement survives decomposition roundoff', () => {
  const h = runtimeHarness();
  h.data.prefabs['town.workshop-chair']!.colliders = [
    { shape: 'box', at: [0, 0, 0], half: [1, 1, 1], rot: [0.3, 0, 0] },
  ];
  const placement: Placement = { ...h.placement, rot: [0, 0.7, 0], scale: [1, 1, 1] };
  try {
    validateLevel({ place: 'runtime', placements: [placement] }, h.data.prefabs);
    const instance = h.spawn(placement);
    instance.setEnabled(true);
    assert.equal(h.active.size, 1);
    assert.equal(h.seats.length, 1);
  } finally {
    h.owner.dispose();
  }
  assert.equal(h.active.size, 0);
  assert.equal(h.seats.length, 0);
});

test('re-review: runtime refuses gates inherited through the prototype', () => {
  const h = runtimeHarness();
  const gates = Object.create({ open: () => true }) as Readonly<Record<string, () => boolean>>;
  try {
    assert.throws(() => h.spawn(h.placement, gates), /missing gate/);
    assert.equal(h.allocations, 0);
    assert.equal(h.owner.root.children.length, 0);
    assert.equal(h.active.size, 0);
    assert.equal(h.seats.length, 0);
  } finally {
    h.owner.dispose();
  }
});
