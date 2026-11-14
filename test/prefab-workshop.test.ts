import { compiled, definitions } from '../src/prefab/catalogue.ts';
import { prefabGolden } from './helpers/prefab-golden.ts';
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
import kitLevel from '../content/built/levels/workshop-kit.json' with { type: 'json' };
import { merged } from '../src/render/part-geometry.ts';
import { PLAYER_R } from '../src/constants.ts';
import type { Body, Shape } from '../src/physics/engine.ts';
import type { Seat } from '../src/entities/railway/seat.ts';
import type { Plan } from '../src/place/building-plans.ts';
import { names } from '../src/prefab/names.ts';
import {
  validateArtifact,
  loadPrefabArtifact,
  validateLevel,
  validateLevelArtifact,
  loadLevelArtifact,
  validatePrefab,
  validateColliderWorldTransforms,
  validatePlacement,
} from '../src/prefab/validate.ts';
import {
  metadata,
  type Placement,
  type PrefabArtifact,
  type PrefabDef,
  type Vec3,
  type LevelArtifact,
  type LevelDef,
} from '../src/prefab/types.ts';
import { compile } from '../dev/prefab/compiler.ts';
import { prefabs as authoredPrefabs } from '../src/content/prefabs/town.ts';
import { levels as authoredLevels } from '../src/content/levels/workshop.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import workshop from '../content/built/levels/workshop.json' with { type: 'json' };
import gorge from '../content/built/levels/gorge.json' with { type: 'json' };

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
const { workshopParts } = sourceModule<typeof import('../src/prefab/builders/workshop-parts.ts')>(
  fs.readFileSync('src/prefab/builders/workshop-parts.ts', 'utf8'),
  { registerBuilder() {} },
);
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
    compiled,
    definitions,
    workshop,
    gorge,
    names,
    validateArtifact,
    loadPrefabArtifact,
    validateColliderWorldTransforms,
    validatePlacement,
    validatePrefab,
    validateLevel,
    validateLevelArtifact,
    loadLevelArtifact,
    builders: new Map<string, import('../src/prefab/builders.ts').Builder>([
      ['seat.chair', () => chair],
      ['greybox.box', () => chair],
      ['town.shop-parts', () => chair],
      ['town.curio-parts', () => chair],
      ['town.museum-parts', () => chair],
      ['town.museum-exhibit', () => chair],
      ['town.house-parts', () => chair],
      ['town.room-shell', () => chair],
      ['town.room-proxy', () => chair],
      ['railway.halt-parts', () => chair],
      ['railway.halt-ramp', () => chair],
      [
        'town.workshop-parts',
        (params) => workshopParts(params.piece as string, params.hw as number, params.hd as number),
      ],
    ]),
    registerSeat,
    ROOM_GROUP: 8,
    staticBody,
  });
  const workshopKit = sourceFunction<typeof import('../src/entities/town/workshop-kit.ts').workshopKit>(
    'src/entities/town/workshop-kit.ts',
    'workshopKit',
    {
      merged,
      instantiate: runtime.instantiate,
      artifact,
      compiled,
      definitions,
      level: kitLevel,
      loadLevelArtifact,
      loadPrefabArtifact,
    },
  );
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
test('workshop collider and placement values match the pre-conversion code', () => {
  const actual = captureWorkshop();
  for (const [file, value] of [
    ['test/fixtures/prefab-colliders.json', actual.colliders],
    ['test/fixtures/prefab-placements.json', actual.placement],
  ] as const) {
    const bytes = JSON.stringify(value, null, 2) + '\n';
    if (process.env.GOLDEN === '1') fs.writeFileSync(file, bytes);
    prefabGolden(JSON.parse(bytes), JSON.parse(fs.readFileSync(file, 'utf8')), file);
  }
});

// The same source-owned boundary as the golden, with real ownership and recording allocation services.
function runtimeHarness(input?: { prefabs: PrefabArtifact; level: LevelArtifact }) {
  const active = new Set<Body>(),
    seats: Seat[] = [];
  const physicsSpecs: { shape: Shape; position: { x: number; y: number; z: number }; rotation?: THREE.Quaternion }[] =
    [];
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
  const data = input ? structuredClone(input.prefabs) : (structuredClone(artifact) as unknown as PrefabArtifact);
  const runtime = sourceModule<typeof import('../src/prefab/instantiate.ts')>(
    fs.readFileSync('src/prefab/instantiate.ts', 'utf8'),
    {
      THREE,
      artifact: data,
      compiled: loadPrefabArtifact(data),
      workshop: input?.level ?? workshop,
      gorge: input ? { ...metadata, format: 'boogle-level', place: 'gorge', placements: [] } : gorge,
      names,
      validateArtifact,
      loadPrefabArtifact,
      validateColliderWorldTransforms,
      validatePlacement,
      validateLevel,
      validateLevelArtifact,
      loadLevelArtifact,
      validatePrefab,
      builders: new Map<string, () => THREE.Object3D>([
        ['greybox.box', () => new THREE.Group()],
        ['town.workshop-parts', () => new THREE.Group()],
        ['town.shop-parts', () => new THREE.Group()],
        ['town.curio-parts', () => new THREE.Group()],
        ['town.museum-parts', () => new THREE.Group()],
        ['town.museum-exhibit', () => new THREE.Group()],
        ['town.house-parts', () => new THREE.Group()],
        ['town.room-shell', () => new THREE.Group()],
        ['town.room-proxy', () => new THREE.Group()],
        ['railway.halt-parts', () => new THREE.Group()],
        ['railway.halt-ramp', () => new THREE.Group()],
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
      staticBody: (shape: Shape, position: { x: number; y: number; z: number }, rotation?: THREE.Quaternion) => {
        physicsSpecs.push({ shape, position: { ...position }, rotation: rotation?.clone() });
        return {} as Body;
      },
    },
  );
  const owner = createOwnedView();
  return {
    owner,
    data,
    placement: runtime.workshopChair,
    active,
    seats,
    physicsSpecs,
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

test('simplify review: a record mutated after load is re-validated on every instantiation', () => {
  const h = runtimeHarness();
  h.data.prefabs['town.workshop-chair']!.colliders = [{ shape: 'box', at: [0, 0, 0], half: [-1, 1, 1] }];
  try {
    assert.throws(() => h.spawn());
    assert.equal(h.owner.root.children.length, 0);
    assert.equal(h.allocations, 0);
    assert.equal(h.seats.length, 0);
    assert.equal(h.active.size, 0);
    assert.equal(h.physicsSpecs.length, 0);
  } finally {
    h.owner.dispose();
  }
});

test('review regression: rotated collider rejects sheared unequal axes', () => {
  const h = runtimeHarness();
  h.data.prefabs['town.workshop-chair']!.colliders = [
    { shape: 'box', at: [0, 0, 0], half: [1, 1, 1], rot: [Math.PI / 4, Math.PI / 6, Math.PI / 7] },
  ];
  try {
    for (const scale of [
      [2, 1, 1],
      [1, 2, 1],
      [1, 1, 2],
    ] as const) {
      assert.throws(() => h.spawn({ ...h.placement, scale }), /shear/);
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

type WorldTransformCase = {
  name: string;
  allowed: boolean;
  parentScale?: Vec3;
  parentRot?: Vec3;
  placementScale?: Vec3;
  placementRot?: Vec3;
  colliderRot?: Vec3;
  sheared?: true;
  placementPos?: Vec3;
  check?: 'build-shear' | 'runtime-shear' | 'precision' | 'disabled' | 'collider-frame';
};
const worldTransformCases: WorldTransformCase[] = [
  {
    name: 'collider rotation cancels frame shear and uses its world axes',
    allowed: true,
    parentScale: [2, 1, 1],
    parentRot: [-0.3, 0, 0],
    placementRot: [0.3, 0, 0],
    colliderRot: [-0.3, 0, 0],
    check: 'collider-frame',
  },
  {
    name: 'review-3 build rejects unrotated shear',
    allowed: false,
    parentScale: [2, 1, 1],
    placementRot: [0.7, 0, 0],
    check: 'build-shear',
  },
  {
    name: 'review-3 runtime rejects shear before allocation',
    allowed: false,
    parentScale: [2, 1, 1],
    placementRot: [0.7, 0, 0],
    check: 'runtime-shear',
  },
  {
    name: 'review-3 full precision through compensating scales',
    allowed: true,
    parentScale: [10000, 10000, 10000],
    placementScale: [0.0001, 0.0001, 0.0001],
    placementPos: [0, 0, 0],
    check: 'precision',
  },
  { name: 'review-3 initially disabled root is hidden', allowed: true, check: 'disabled' },
  { name: 'unrotated collider with nonuniform scale', allowed: true, placementScale: [2, 1, 1] },
  {
    name: 'rotated collider with uniform scales at every level',
    allowed: true,
    parentScale: [2, 2, 2],
    placementScale: [3, 3, 3],
    parentRot: [0.2, 0.4, 0.1],
    placementRot: [0.1, 0.3, 0.2],
    colliderRot: [0.3, 0.2, 0.1],
  },
  {
    name: 'compensating owner and placement scales',
    allowed: true,
    parentScale: [0.5, 1, 1],
    placementScale: [2, 1, 1],
    colliderRot: [0.3, 0, 0],
  },
  {
    name: 'rotated collider with nonuniform world scale',
    allowed: false,
    placementScale: [2, 1, 1],
    colliderRot: [0.3, 0, 0],
    sheared: true,
  },
  { name: 'rotation only on placement', allowed: true, placementRot: [0, 0.7, 0] },
  { name: 'rotation only on parent', allowed: true, parentRot: [0.2, 0.4, 0.1] },
  { name: 'rotation only on collider', allowed: true, colliderRot: [0.3, 0, 0] },
  { name: 'negative placement scale', allowed: false, placementScale: [-1, 1, 1] },
  { name: 'zero placement scale', allowed: false, placementScale: [0, 1, 1] },
  { name: 'previous decomposition roundoff', allowed: true, placementRot: [0, 0.7, 0], colliderRot: [0.3, 0, 0] },
  { name: 'negative owner scale', allowed: false, parentScale: [-1, 1, 1] },
  { name: 'zero owner scale', allowed: false, parentScale: [0, 1, 1] },
  {
    name: 'explicitly unrotated collider with nonuniform scale',
    allowed: true,
    placementScale: [2, 1, 1],
    colliderRot: [0, 0, 0],
  },
  {
    name: 'nonuniform scale inherited from owner',
    allowed: false,
    parentScale: [2, 1, 1],
    colliderRot: [0.3, 0, 0],
    sheared: true,
  },
];
for (const row of worldTransformCases)
  test(`world-transform table: ${row.name}`, () => {
    const h = runtimeHarness();
    const record = h.data.prefabs['town.workshop-chair']!;
    if (row.check !== 'precision')
      record.colliders = [
        { shape: 'box', at: [0, 0, 0], half: [1, 1, 1], ...(row.colliderRot ? { rot: row.colliderRot } : {}) },
      ];
    const frame: PrefabDef = { key: 'town.frame', visual: { none: true }, colliders: [], scope: 'owner' };
    const parent: Placement = {
      id: 'frame',
      prefab: frame.key,
      pos: [0, 0, 0],
      ...(row.parentScale ? { scale: row.parentScale } : {}),
      ...(row.parentRot ? { rot: row.parentRot } : {}),
    };
    const placement: Placement = {
      ...h.placement,
      ...(row.placementPos ? { pos: row.placementPos } : {}),
      ...(row.placementScale ? { scale: row.placementScale } : {}),
      ...(row.placementRot ? { rot: row.placementRot } : {}),
    };
    h.owner.root.scale.fromArray(row.parentScale ?? [1, 1, 1]);
    const rot = row.parentRot ?? [0, 0, 0];
    h.owner.root.rotation.set(rot[1], rot[0], rot[2], 'YXZ');
    const errorOf = (run: () => unknown): string | null => {
      try {
        run();
        return null;
      } catch (error) {
        assert.ok(error instanceof Error);
        return error.message;
      }
    };
    try {
      const buildError = errorOf(() =>
        compile([record, frame], [{ place: 'scale-table', placements: [parent, { ...placement, parent: parent.id }] }]),
      );
      const runtimeError = errorOf(() => {
        const instance = h.spawn(placement);
        if (row.check === 'disabled') {
          instance.setEnabled(false);
          assert.equal(instance.root.visible, false, 'a fresh disabled root must be hidden');
        }
        instance.setEnabled(true);
        assert.equal(instance.root.visible, true);
        if (row.check === 'precision') {
          assert.ok(
            Math.abs(instance.seats[0]!.exit.y - 0.46) < 1e-9,
            `expected exit y=0.46; got ${instance.seats[0]!.exit.y}`,
          );
          for (const [i, collider] of record.colliders.entries()) {
            const visual = new THREE.Vector3().fromArray(collider.at).applyMatrix4(instance.root.matrixWorld);
            const actual = h.physicsSpecs[i]!.position;
            assert.ok(
              visual.distanceTo(new THREE.Vector3(actual.x, actual.y, actual.z)) < 1e-9,
              'collider centre must match the drawn frame',
            );
          }
        }
        if (row.check === 'collider-frame') {
          const c = record.colliders[0]!;
          assert.equal(c.shape, 'box');
          const r = c.rot ?? [0, 0, 0];
          const visual = instance.root.matrixWorld
            .clone()
            .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(r[1], r[0], r[2], 'YXZ')));
          const actual = h.physicsSpecs[0]!;
          assert.ok(actual.shape.kind === 'box');
          const half = [actual.shape.hx, actual.shape.hy, actual.shape.hz];
          for (let axis = 0; axis < 3; axis++) {
            const expected = new THREE.Vector3().setFromMatrixColumn(visual, axis);
            assert.ok(
              Math.abs(half[axis]! - expected.length()) < 1e-9,
              'body dimensions must follow the collider world basis',
            );
            const direction = new THREE.Vector3()
              .setComponent(axis, 1)
              .applyQuaternion(actual.rotation ?? new THREE.Quaternion());
            assert.ok(
              direction.distanceTo(expected.normalize()) < 1e-9,
              'body orientation must follow the collider world basis',
            );
          }
          const forward = new THREE.Vector3(0, 0, 1).transformDirection(instance.root.matrixWorld);
          assert.ok(
            Math.abs(instance.seats[0]!.at.yaw - Math.atan2(forward.x, forward.z)) < 1e-9,
            'seat facing must use the full world frame',
          );
        }
      });
      if (row.check === 'runtime-shear') assert.match(runtimeError ?? '', /shear/);
      if (row.check === 'build-shear') assert.match(buildError ?? '', /shear/);
      assert.equal(buildError === null, row.allowed, `build: ${buildError}`);
      assert.equal(runtimeError === null, row.allowed, `runtime: ${runtimeError}`);
      if (row.sheared) {
        assert.match(buildError!, /shear/);
        assert.equal(runtimeError, buildError, 'build and runtime must reject with the same physical rule');
      }
      if (row.allowed) {
        assert.equal(h.active.size, record.colliders.length);
        assert.equal(h.seats.length, 1);
      } else {
        assert.equal(h.allocations, 0);
        assert.equal(h.owner.root.children.length, 0);
        assert.equal(h.active.size, 0);
        assert.equal(h.seats.length, 0);
      }
    } finally {
      h.owner.dispose();
    }
    assert.equal(h.active.size, 0);
    assert.equal(h.seats.length, 0);
  });

type RoundTripCase = {
  name: string;
  parentScale?: Vec3;
  scale?: Vec3;
  yaw?: number;
  colliderYaw?: number;
  expected: 'accept' | 'shear' | 'agree';
  chair?: true;
};
const roundTripCases: RoundTripCase[] = [
  { name: 'quarter-turn under stretched parent', expected: 'accept', parentScale: [2, 1, 1], yaw: Math.PI / 2 },
  { name: 'eighth-turn in equal radial axes', expected: 'accept', parentScale: [2, 1, 2], yaw: Math.PI / 4 },
  { name: 'arbitrary yaw in equal radial axes', expected: 'accept', parentScale: [2, 1, 2], yaw: 0.731234567890123 },
  {
    name: 'arbitrary cancelling collider yaw',
    expected: 'accept',
    parentScale: [2, 1, 1],
    yaw: 0.731234567890123,
    colliderYaw: -0.731234567890123,
  },
  {
    name: 'fractional compensating scales',
    expected: 'accept',
    parentScale: [0.123456789, 1, 1],
    scale: [1 / 0.123456789, 1, 1],
    colliderYaw: 0.3,
  },
  { name: 'authored workshop chair', expected: 'accept', chair: true },
  { name: 'quarter-turn at a large supported ratio', expected: 'accept', parentScale: [1e6, 1, 1], yaw: Math.PI / 2 },
  { name: 'genuine arbitrary-yaw shear', expected: 'shear', parentScale: [2, 1, 1], yaw: 0.7 },
  { name: 'genuine eighth-turn shear', expected: 'shear', parentScale: [2, 1, 1], yaw: Math.PI / 4 },
  {
    name: 'quarter-turn at the numerical tolerance boundary',
    expected: 'agree',
    parentScale: [1e7, 1, 1],
    yaw: Math.PI / 2,
  },
  {
    name: 'quarter-turn beyond the numerical tolerance boundary',
    expected: 'agree',
    parentScale: [1e9, 1, 1],
    yaw: Math.PI / 2,
  },
];
for (const row of roundTripCases)
  test(`round-trip property: ${row.name}`, () => {
    const frame: PrefabDef = { key: 'roundtrip.frame', visual: { none: true }, colliders: [], scope: 'owner' };
    const box: PrefabDef = {
      key: 'roundtrip.box',
      visual: { none: true },
      colliders: [
        {
          shape: 'box',
          at: [0, 0, 0],
          half: [1, 1, 1],
          ...(row.colliderYaw === undefined ? {} : { rot: [row.colliderYaw, 0, 0] as Vec3 }),
        },
      ],
      scope: 'owner',
    };
    const records: PrefabDef[] = row.chair ? authoredPrefabs : [frame, box];
    const level: LevelDef = row.chair
      ? authoredLevels[0]!
      : {
          place: 'roundtrip',
          placements: [
            { id: 'parent', prefab: frame.key, pos: [0, 0, 0], scale: row.parentScale ?? [1, 1, 1] },
            {
              id: 'child',
              prefab: box.key,
              parent: 'parent',
              pos: [0, 0, 0],
              rot: [row.yaw ?? 0, 0, 0],
              scale: row.scale ?? [1, 1, 1],
            },
          ],
        };
    const defs = Object.fromEntries(records.map((p) => [p.key, p]));
    let sourceError: string | null = null;
    try {
      validateLevel(level, defs);
    } catch (error) {
      assert.ok(error instanceof Error);
      sourceError = error.message;
    }
    if (row.expected === 'shear' || sourceError !== null) {
      assert.notEqual(row.expected, 'accept', sourceError ?? 'source unexpectedly accepted');
      assert.match(sourceError ?? '', /shear/);
      assert.throws(
        () => compile(records, [level]),
        (error: unknown) => error instanceof Error && error.message === sourceError,
      );
      const rawPrefabs: PrefabArtifact = { ...metadata, format: 'boogle-prefabs', prefabs: defs };
      const rawLevel: LevelArtifact = { ...metadata, format: 'boogle-level', ...level };
      assert.throws(
        () => runtimeHarness({ prefabs: rawPrefabs, level: rawLevel }),
        (error: unknown) => error instanceof Error && error.message === sourceError,
      );
      return;
    }
    const outputs = compile(records, [level]);
    const parsedPrefabs: unknown = JSON.parse(outputs.get('prefabs.json')!);
    validateArtifact(parsedPrefabs);
    const parsedLevel: unknown = JSON.parse(outputs.get(`levels/${level.place}.json`)!);
    validateLevelArtifact(parsedLevel, parsedPrefabs.prefabs);
    assert.deepEqual(parsedPrefabs.prefabs, defs, 'serialization must preserve accepted record numbers');
    assert.deepEqual(parsedLevel.placements, level.placements, 'serialization must preserve accepted transforms');
    const child = parsedLevel.placements.at(-1)!;
    const byId = new Map(parsedLevel.placements.map((p) => [p.id, p]));
    const parents: Placement[] = [];
    for (let p = child.parent; p; p = byId.get(p)!.parent) parents.unshift(byId.get(p)!);
    const h = runtimeHarness({ prefabs: parsedPrefabs, level: parsedLevel });
    let parent = new THREE.Group();
    for (const p of parents) {
      const next = new THREE.Group();
      next.position.fromArray(p.pos);
      next.scale.fromArray(p.scale ?? [1, 1, 1]);
      const r = p.rot ?? [0, 0, 0];
      next.rotation.set(r[1], r[0], r[2], 'YXZ');
      parent.add(next);
      parent = next;
    }
    parent.add(h.owner.root);
    try {
      const instance = h.spawn(child);
      instance.setEnabled(true);
      assert.equal(h.active.size, parsedPrefabs.prefabs[child.prefab]!.colliders.length);
      if (row.chair) assert.equal(instance.seats[0]!.id, 'forge-workshop');
    } finally {
      h.owner.dispose();
    }
    assert.equal(h.active.size, 0);
    assert.equal(h.seats.length, 0);
  });
