// Owner-requested old-code golden: execute the halt view with recording render/physics boundaries.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceFunction, sourceModule } from '../dev/level/source.ts';
import { prefabGolden } from './helpers/prefab-golden.ts';
import * as layout from '../src/place/layout.ts';
import * as home from '../src/place/home-station.ts';
import { H } from '../src/place/terrain.ts';
import { boxAt, place } from '../src/render/box-plan.ts';
import * as catalog from '../src/sim/railway-lines.ts';
import * as train from '../src/sim/railway-train.ts';
import * as rows from '../src/sim/railway-rows.ts';
import * as queries from '../src/sim/railway-queries.ts';
import * as trainQueries from '../src/sim/railway-queries-trains.ts';
import * as lineQueries from '../src/sim/railway-queries-line2.ts';
import * as ring from '../src/sim/railway-ring-layout.ts';
import * as line2Layout from '../src/sim/railway-line2-layout.ts';
import * as path from '../src/entities/railway/line2-path.ts';
import * as haltMap from '../src/entities/railway/halt-map.ts';
import { LINE_SLOTS } from '../src/sim/railway-trains.ts';
import { buildSeedWorld } from '../src/sim/railway-seeds.ts';
import { laySection } from '../src/sim/railway-seed-legs.ts';
import { HEAD_OFFSET, PLAYER_R, SEA } from '../src/constants.ts';
import type { Box } from '../src/render/box-plan.ts';
import type { Body, Shape } from '../src/physics/engine.ts';
import type { OwnedView } from '../src/render/owned-view.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import workshop from '../content/built/levels/workshop.json' with { type: 'json' };
import gorge from '../content/built/levels/gorge.json' with { type: 'json' };
import kitLevel from '../content/built/levels/halt-kit.json' with { type: 'json' };
import * as validation from '../src/prefab/validate.ts';
import { names } from '../src/prefab/names.ts';

test('all halt kit placements, colliders, lever plaques and ordered prompts retain the old code', async () => {
  const bodies: unknown[] = [],
    sets: Box[][] = [],
    levers: ReturnType<typeof import('../src/entities/railway/request-lever.ts').createRequestLever>[] = [];
  const active = new Set<Body>();
  const createOwnedView = sourceFunction<typeof import('../src/render/owned-view.ts').createOwnedView>(
    'src/render/owned-view.ts',
    'createOwnedView',
    {
      THREE,
      owners: new WeakMap(),
      addBody: (b: Body) => active.add(b),
      removeBody: (b: Body) => active.delete(b),
    },
  );
  const owner = createOwnedView();
  const addStatic = (
    shape: Shape,
    at: { x: number; y: number; z: number },
    q: THREE.Quaternion,
    _group?: number,
    owned?: OwnedView,
  ) => {
    // Old yaw quaternions have positive w; decomposition can choose -q. At a half-turn use positive y:
    // an ULP perturbation of atan2 can put the tiny w on either side of zero without changing the rotation.
    const flip = Math.abs(q.w) < 1e-12 ? q.y < 0 : q.w < 0;
    bodies.push({ shape, at: [at.x, at.y, at.z], rotation: q.toArray().map((n) => (flip ? -n : n)) });
    const b = { position: new THREE.Vector3(at.x, at.y, at.z), quaternion: q.clone() } as unknown as Body;
    owned?.addBody(b);
    return b;
  };
  const slab = sourceFunction('src/place/land.ts', 'slab', {
    THREE,
    GROUP: { SCENERY: 1 },
    addStatic,
    tagStepSupport: (b: unknown) => b,
    segmentStepSupport() {},
  });
  const flat = (color: string) => new THREE.MeshBasicNodeMaterial({ color });
  const dropSet = (boxes: Box[]) => {
    sets.push(boxes);
    return {
      mesh: new THREE.Mesh(new THREE.BoxGeometry(), flat('#ffffff')),
      snap() {},
      drop() {},
      clear() {},
      update() {},
    };
  };
  const plaqueText: string[] = [];
  const leverModule = sourceModule<typeof import('../src/entities/railway/request-lever.ts')>(
    fs.readFileSync('src/entities/railway/request-lever.ts', 'utf8'),
    {
      THREE,
      document: {
        createElement: () => ({
          getContext: () => ({ fillRect() {}, strokeRect() {}, fillText: (s: string) => plaqueText.push(s) }),
        }),
      },
    },
  );
  const createRequestLever: typeof leverModule.createRequestLever = (...args) => {
    const lever = leverModule.createRequestLever(...args);
    levers.push(lever);
    return lever;
  };
  const builders = new Map(names.builders.map((name) => [name, () => new THREE.Group()]));
  sourceModule(fs.readFileSync('src/prefab/builders/halt-parts.ts', 'utf8'), {
    registerBuilder: (name: string, build: () => THREE.Group) => builders.set(name, build),
  });
  sourceModule(fs.readFileSync('src/prefab/builders/halt-ramp.ts', 'utf8'), {
    THREE,
    flat,
    registerBuilder: (name: string, build: () => THREE.Group) => builders.set(name, build),
  });
  const runtime = sourceModule<typeof import('../src/prefab/instantiate.ts')>(
    fs.readFileSync('src/prefab/instantiate.ts', 'utf8'),
    {
      THREE,
      compiled: validation.loadPrefabArtifact(artifact),
      workshop,
      gorge,
      names,
      ...validation,
      builders,
      staticBody: addStatic,
    },
  );
  const createHaltKit = sourceFunction('src/entities/railway/halt-kit.ts', 'createHaltKit', {
    createOwnedView,
    Euler: THREE.Euler,
    boxAt,
    place,
    tagStepSupport: (b: unknown) => b,
    segmentStepSupport() {},
    instantiate: runtime.instantiate,
    placements: validation.loadLevelArtifact(kitLevel, validation.loadPrefabArtifact(artifact).prefabs).placements,
  });
  const createUpPlatforms = sourceFunction('src/entities/railway/up-platforms.ts', 'createUpPlatforms', {
    THREE,
    createHaltKit,
    GROUP: { SCENERY: 1 },
    STONE: '#bdb8ac',
    BASE: '#9a9184',
    EDGE: '#f2d36a',
    WOOD: '#a9794c',
    POST: '#7f5630',
    ROOF: '#c4453a',
    PLANK: '#a97a45',
    thump() {},
  });
  const dependencies = [
    { flat },
    { place, box: (x: number, z: number, m: THREE.Matrix4, color: string) => boxAt(x, 0, z, m, color) },
    { H, addStatic, slab },
    layout,
    { boardMaterial: (m: unknown) => m },
    { dropSet, dustRing() {} },
    home,
  ];
  let seed = buildSeedWorld('trains-on');
  const me: { body: null | { position: THREE.Vector3 } } = { body: null };
  const calls: unknown[] = [];
  const { createRailwayHalts } = sourceModule<typeof import('../src/entities/railway/halts-view.ts')>(
    fs
      .readFileSync('src/entities/railway/halts-view.ts', 'utf8')
      .replace(/await Promise\.all\(\[[\s\S]*?\]\)/, 'dependencies'),
    {
      THREE,
      dependencies,
      ...catalog,
      ...train,
      ...queries,
      ...trainQueries,
      ...lineQueries,
      ...ring,
      ...line2Layout,
      ...path,
      ...haltMap,
      aperture: rows.aperture,
      lineRow: rows.line,
      railRow: rows.rail,
      trainRow: rows.train,
      worksRow: rows.works,
      LINE_SLOTS,
      HEAD_OFFSET,
      PLAYER_R,
      SEA,
      me,
      createUpPlatforms,
      createHaltKit,
      createRequestLever,
      GROUP: { SCENERY: 1 },
      clank() {},
      thump() {},
      forEachStatic() {},
      uiSound() {},
      roadPlaque: () => ({ mesh: new THREE.Group(), dispose() {} }),
      createIslandBoards: () => ({
        add: () => -1,
        redraw() {},
        set() {},
        heldMarks: () => 0,
        bytes: () => 0,
        goldMarks: () => [],
        gliderMark: () => false,
        faces: () => [],
      }),
      createBoxBatch: () => ({ mesh: new THREE.Group() }),
      createRingMapTable: () => ({ inspect: () => null }),
    },
  );
  const halt = await createRailwayHalts(
    {
      read: { world: () => seed.w, tickNow: () => seed.t },
      callTrain: (id: number, dir: number) => {
        calls.push([id, dir]);
        return true;
      },
    } as unknown as Parameters<typeof createRailwayHalts>[0],
    owner,
  );
  const states: unknown[] = [];
  const snapshot = (name: string) => {
    me.body = null;
    bodies.length = plaqueText.length = 0;
    halt.restore();
    const info = halt.inspect();
    const knobs = [...info.halts.flatMap((h) => h.lever), ...info.ringLevers];
    const targets = knobs.map((p) => {
      me.body = { position: new THREE.Vector3(p.x, p.y, p.z) };
      return halt
        .targets()
        .map(({ id, verb, at, blocked }) => ({ id, verb, at: at.toArray(), blocked: blocked ?? null }));
    });
    states.push({
      name,
      bodies: [...bodies],
      activeBodies: active.size,
      halts: info.halts,
      ringLevers: info.ringLevers,
      upPlatforms: info.upPlatforms,
      plaqueText: [...plaqueText],
      targets,
    });
  };
  snapshot('trains-on');
  for (const stage of ['q6-done', 'deck-laid', 'gap-footed', 'ring-joined', 'gorge-mid'] as const) {
    seed = buildSeedWorld(stage);
    snapshot(stage);
  }
  laySection(seed);
  snapshot('stack-3');
  laySection(seed);
  snapshot('gorge-reached');
  const boxValues = sets.map((boxes) =>
    boxes.map((b) => ({ ...b, local: b.local.toArray(), color: b.color.toArray() })),
  );
  // Mesh transforms include both plaque sizes and their side/orientation, plus all ramp placements.
  owner.root.updateWorldMatrix(true, true);
  const meshes: unknown[] = [];
  owner.root.traverse((o) => {
    if (o instanceof THREE.Mesh)
      meshes.push({
        matrix: o.matrixWorld.toArray(),
        geometry: o.geometry.type,
        parameters: Reflect.get(o.geometry, 'parameters'),
        castShadow: o.castShadow,
        receiveShadow: o.receiveShadow,
      });
  });
  const fixture = 'test/fixtures/prefab-halts.json';
  const actual = JSON.parse(JSON.stringify({ catalogs: catalog.RAIL_HALTS, boxValues, meshes, states }));
  if (process.env.GOLDEN === '1') fs.writeFileSync(fixture, JSON.stringify(actual, null, 2) + '\n');
  prefabGolden(actual, JSON.parse(fs.readFileSync(fixture, 'utf8')), 'halts');
  assert.equal(levers.length, 19);
  owner.dispose();
  assert.equal(active.size, 0);
});
