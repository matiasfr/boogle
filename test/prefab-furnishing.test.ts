import { compiled, definitions } from '../src/prefab/catalogue.ts';
import assert from 'node:assert/strict';
import { merged } from '../src/render/part-geometry.ts';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
// Owner-requested old-code conversion goldens: no renderer, physics engine or network.
import test from 'node:test';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import * as museumTsl from 'three/tsl';
import { sourceModule, sourceFunction } from '../dev/level/source.ts';
import { recordMatrices, prefabGolden } from './helpers/prefab-golden.ts';
import { GIFTS, STOCK } from '../src/render/cosmetic-parts.ts';
import { BOARDS, SHOP } from '../src/entities/town/town-lines.ts';
import type { Part } from '../src/render/part-geometry.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import level from '../content/built/levels/workshop-kit.json' with { type: 'json' };
import { loadLevelArtifact, loadPrefabArtifact } from '../src/prefab/validate.ts';
import * as validation from '../src/prefab/validate.ts';
import { names } from '../src/prefab/names.ts';
import workshop from '../content/built/levels/workshop.json' with { type: 'json' };
import gorge from '../content/built/levels/gorge.json' with { type: 'json' };
import museumLevel from '../content/built/levels/museum.json' with { type: 'json' };
import shopLevel from '../content/built/levels/shop.json' with { type: 'json' };
import kitGolden from './fixtures/prefab-workshop-kit.json' with { type: 'json' };
import shopGolden from './fixtures/prefab-shop.json' with { type: 'json' };
const { shopParts } = sourceModule<typeof import('../src/prefab/builders/shop-parts.ts')>(
  fs.readFileSync('src/prefab/builders/shop-parts.ts', 'utf8'),
  { registerBuilder() {} },
);

const { workshopParts } = sourceModule<typeof import('../src/prefab/builders/workshop-parts.ts')>(
  fs.readFileSync('src/prefab/builders/workshop-parts.ts', 'utf8'),
  { registerBuilder() {} },
);

test('workshop furnishing matches the old authored parts, solids and glass', () => {
  const { workshopKit } = sourceModule<{ workshopKit(w: number, d: number): unknown }>(
    fs.readFileSync('src/entities/town/workshop-kit.ts', 'utf8'),
    {
      merged: (parts: Part[]) => parts,
      artifact,
      compiled,
      definitions,
      level,
      loadLevelArtifact,
      loadPrefabArtifact,
      instantiate: (key: string) => {
        const def = loadPrefabArtifact(artifact).prefabs[key]!;
        if (!('builder' in def.visual)) throw new Error('expected parts');
        const p = def.visual.params;
        return { ...workshopParts(p.piece as string, p.hw as number, p.hd as number), setEnabled() {} };
      },
    },
  );
  const actual = workshopKit(5, 4) as { geometry: Part[]; glass: unknown };
  const solids = loadLevelArtifact(level, loadPrefabArtifact(artifact).prefabs).placements.flatMap((p) =>
    loadPrefabArtifact(artifact).prefabs[p.prefab]!.colliders.map((c) => {
      if (c.shape !== 'box') throw new Error('expected box');
      return { x: c.at[0], y: c.at[1], z: c.at[2], w: c.half[0] * 2, h: c.half[1] * 2, d: c.half[2] * 2 };
    }),
  );
  golden('workshop-kit', { geometry: actual.geometry, solids, glass: actual.glass });
});

test('shop furnishing matches the old parts, solids and sign references in order', () => {
  const parts: Part[][] = [],
    solids: unknown[] = [],
    plates: unknown[] = [];
  const mesh = (p: Part[]) => {
    parts.push(p);
    return new THREE.Mesh(new THREE.BufferGeometry());
  };
  const r = {
    w: 10,
    d: 8,
    near: new THREE.Group(),
    over: new THREE.Group(),
    outside: new THREE.Group(),
    furnishings: [],
  };
  const { createShop } = sourceModule<{ createShop: (...args: unknown[]) => unknown }>(
    fs.readFileSync('src/entities/town/shop.ts', 'utf8'),
    {
      THREE,
      artifact,
      compiled,
      definitions,
      level: shopLevel,
      loadLevelArtifact,
      loadPrefabArtifact,
      createOwnedView: () => ({ root: new THREE.Group(), dispose() {} }),
      instantiate: (key: string, _placement: unknown, options: { makeLabel: (a: unknown, key: string) => unknown }) => {
        const def = loadPrefabArtifact(artifact).prefabs[key]!;
        for (const c of def.colliders) {
          if (c.shape !== 'box') throw new Error('expected box');
          solids.push([c.at[0], c.at[2], c.half[0], c.half[2], c.half[1] * 2]);
        }
        if (def.attach?.sign) options.makeLabel(def.attach.sign, 'shop');
        return {
          root: new THREE.Group(),
          ...('builder' in def.visual ? shopParts(def.visual.params) : { parts: [] }),
          targets: () => [],
        };
      },
      STOCK,
      SHOP,
      BOARDS,
      DOOR: { w: 2.6 },
      CLOTHES_SLOTS: ['hat', 'accessory', 'outfit'],
      roomMesh: mesh,
      paperMaterial: () => new THREE.MeshBasicNodeMaterial(),
      mergeGeometries: () => new THREE.BufferGeometry(),
      document: { createElement: () => ({ getContext: () => ({}) }) },
      addSolid: (_r: unknown, ...args: unknown[]) => solids.push(args),
      plate: (...args: unknown[]) => {
        plates.push(args);
        return new THREE.Group();
      },
    },
  );
  createShop({ cleanup() {} }, { rooms: { shop: r }, onRoom() {} }, {}, {}, () => {});
  golden('shop', { parts, solids, plates });
});

function golden(name: string, value: unknown) {
  const file = `test/fixtures/prefab-${name}.json`;
  if (process.env.GOLDEN === '1') fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  prefabGolden(JSON.parse(JSON.stringify(value)), name === 'shop' ? shopGolden : kitGolden, name);
}

test('shop world bodies retain the old solid order, dimensions and room transform', () => {
  const bodies: unknown[] = [];
  const owner = sourceFunction<typeof import('../src/render/owned-view.ts').createOwnedView>(
    'src/render/owned-view.ts',
    'createOwnedView',
    { THREE, owners: new WeakMap(), addBody() {}, removeBody() {} },
  )();
  const r = { x: 878.5, y: 18.14, z: 31, yaw: 2.05 };
  owner.root.position.set(r.x, r.y, r.z);
  owner.root.rotation.y = r.yaw;
  const builders = new Map<string, import('../src/prefab/builders.ts').Builder>(
    names.builders.map((name) => [name, () => new THREE.Group()]),
  );
  builders.set('town.shop-parts', shopParts);
  const runtime = sourceModule<typeof import('../src/prefab/instantiate.ts')>(
    fs.readFileSync('src/prefab/instantiate.ts', 'utf8'),
    {
      THREE,
      artifact,
      compiled,
      definitions,
      workshop,
      gorge,
      names,
      builders,
      ...validation,
      ROOM_GROUP: 8,
      staticBody: (shape: unknown, p: THREE.Vector3, q?: THREE.Quaternion) => {
        bodies.push({ shape, position: p.toArray(), rotation: q?.toArray() });
        return {};
      },
    },
  );
  for (const p of loadLevelArtifact(shopLevel, loadPrefabArtifact(artifact).prefabs).placements) {
    runtime
      .instantiate(p.prefab, p, {
        owner,
        makeLabel: () => new THREE.Group(),
        handlers: { 'town.shop-stock': () => [], 'town.shop-rail': () => [] },
      })
      .setEnabled(true);
  }
  const roomToWorld = sourceFunction<typeof import('../src/entities/town/rooms.ts').roomToWorld>(
    'src/entities/town/rooms.ts',
    'roomToWorld',
    {},
  );
  const q = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, r.yaw);
  const expected = shopGolden.solids.map(([x, z, hx, hz, h]) => ({
    shape: { kind: 'box', hx, hy: h! / 2, hz },
    position: roomToWorld(
      r as import('../src/entities/town/rooms.ts').Room,
      x!,
      h! / 2,
      z!,
      new THREE.Vector3(),
    ).toArray(),
    rotation: q.toArray(),
  }));
  prefabGolden(bodies, expected, 'shop-world');
  owner.dispose();
});

const fixture = 'test/fixtures/prefab-curio.json';
test('curio frames, every covered/uncovered gift, pegs, footprints and bodies match old code', async () => {
  const calls: unknown[] = [],
    bodies: unknown[] = [],
    feet: unknown[] = [],
    effects: unknown[] = [];
  const recordMerged = (parts: Part[], grow = 1) => {
    calls.push(JSON.parse(JSON.stringify({ parts, grow })));
    return merged(parts, grow);
  };
  const root = new THREE.Group();
  const cleanups: (() => void)[] = [];
  const owner = { add: (g: THREE.Object3D) => root.add(g), cleanup: (f: () => void) => cleanups.push(f) };
  const owned = new Set<string>();
  let changed: (e: { kind: string; id?: string }) => void = () => {};
  const wardrobe = {
    isOwned: (id: string) => owned.has(id),
    onWardrobe: (fn: typeof changed) => {
      changed = fn;
      return () => {};
    },
  };
  const H = (x: number, z: number) => 10 + x / 100 + z / 1000;
  const SHELF = { x: 12, z: 3, y: 14, yaw: 0.7 };
  const FINDERS_B = { x: -4, z: 9, yaw: -2.1 };
  const toWorld = (x: number) => x + 800;
  const bayBoxPoint = (k: number) => ({ x: k * 0.7 - 4, z: k * 0.3 + 9 });
  const dependencies = [
    { merged: recordMerged },
    {
      H,
      addStatic: (shape: unknown, p: unknown, q: THREE.Quaternion) => {
        bodies.push({ shape, position: p, rotation: q.toArray() });
      },
    },
    { SHELF, toWorld },
    { addFoot: (...args: unknown[]) => feet.push(args.slice(0, 5)) },
    { FINDERS_B, bayBoxPoint },
  ];
  const createOwnedView = sourceFunction<typeof import('../src/render/owned-view.ts').createOwnedView>(
    'src/render/owned-view.ts',
    'createOwnedView',
    { THREE, owners: new WeakMap(), addBody() {}, removeBody() {} },
  );
  const { curioParts } = sourceModule<typeof import('../src/prefab/builders/curio-parts.ts')>(
    fs.readFileSync('src/prefab/builders/curio-parts.ts', 'utf8'),
    { GIFTS, registerBuilder() {} },
  );
  const builders = new Map<string, import('../src/prefab/builders.ts').Builder>(
    names.builders.map((name) => [name, () => new THREE.Group()]),
  );
  builders.set('town.curio-parts', curioParts);
  const runtime = sourceModule<typeof import('../src/prefab/instantiate.ts')>(
    fs.readFileSync('src/prefab/instantiate.ts', 'utf8'),
    {
      THREE,
      artifact,
      compiled,
      definitions,
      workshop,
      gorge,
      names,
      builders,
      ...validation,
      ROOM_GROUP: 8,
      staticBody(shape: unknown, p: THREE.Vector3, q: THREE.Quaternion) {
        // q and -q encode the same physical orientation. Old yaw quaternions use positive w.
        const rotation = q.toArray().map((v) => (q.w < 0 ? -v : v));
        bodies.push({ shape, position: { x: p.x, y: p.y, z: p.z }, rotation });
        return {};
      },
    },
  );
  const currentDependencies = [...dependencies, runtime];
  const bindings: Record<string, unknown> = {
    THREE,
    createOwnedView,
    artifact,
    compiled,
    definitions,
    loadPrefabArtifact: validation.loadPrefabArtifact,
    mergeGeometries,
    GIFTS,
    dependencies: currentDependencies,
    me: { body: null },
    emit: (e: unknown) => effects.push(e),
    readableIntensity: () => 1,
  };
  // The adapter supplies old dynamic dependencies without loading the browser's terrain/physics setup.
  const { createCurioShelf } = sourceModule<{
    createCurioShelf: (...args: unknown[]) => Promise<{
      inspect(): unknown;
      shelfGroup: THREE.Group;
      crystalPeg(k: number, n: number, out: THREE.Vector3): THREE.Vector3;
      bayPeg(k: number, out: THREE.Vector3): THREE.Vector3;
    }>;
  }>(
    fs
      .readFileSync('src/entities/town/curio-shelf.ts', 'utf8')
      .replace(/await Promise\.all\(\[[\s\S]*?\]\)/, 'dependencies'),
    bindings,
  );
  const shelf = await createCurioShelf(owner, wardrobe);
  const state = () => ({
    inspect: shelf.inspect(),
    meshes: shelf.shelfGroup.children
      .filter((g): g is THREE.Mesh => g instanceof THREE.Mesh)
      .map((g) => {
        g.geometry.computeBoundingBox();
        return {
          visible: g.visible,
          castShadow: g.castShadow,
          receiveShadow: g.receiveShadow,
          bounds: g.geometry.boundingBox?.isEmpty()
            ? null
            : { min: g.geometry.boundingBox?.min.toArray(), max: g.geometry.boundingBox?.max.toArray() },
        };
      }),
  });
  const states = [state()];
  for (const g of GIFTS) {
    owned.add(g.id);
    changed({ kind: 'grant', id: g.id });
    states.push(state());
  }
  const callCount = calls.length;
  changed({ kind: 'wear' });
  assert.equal(calls.length, callCount, 'wearing does not rebuild display geometry');
  assert.equal(effects.length, 0, 'no player nearby: no reveal particles');
  const value = JSON.parse(
    JSON.stringify({
      calls,
      bodies,
      feet,
      states,
      crystalPegs: [1, 3, 9].map((n) =>
        Array.from({ length: n }, (_, k) => shelf.crystalPeg(k, n, new THREE.Vector3()).toArray()),
      ),
      bayPegs: Array.from({ length: 9 }, (_, k) => shelf.bayPeg(k, new THREE.Vector3()).toArray()),
    }),
  );
  if (process.env.GOLDEN === '1') fs.writeFileSync(fixture, JSON.stringify(value, null, 2) + '\n');
  prefabGolden(value, JSON.parse(fs.readFileSync(fixture, 'utf8')), 'curio');
  for (const cleanup of cleanups.reverse()) cleanup();
});

// Old-code museum proof: all primitive parts, full exhibit geometry, labels, solids and live table states.
test('museum furnishing and live displays retain the old geometry, copy, order and state behavior', () => {
  const parts: Part[][] = [],
    solids: unknown[] = [],
    plates: unknown[] = [];
  const r = {
    w: 13,
    d: 12,
    high: 5,
    near: new THREE.Group(),
    over: new THREE.Group(),
    outside: new THREE.Group(),
    furnishings: [] as ReturnType<typeof import('../src/prefab/instantiate.ts').instantiate>[],
  };
  const cleanups: (() => void)[] = [];
  const root = new THREE.Group();
  const owner = { add: (g: THREE.Object3D) => root.add(g), cleanup: (f: () => void) => cleanups.push(f) };
  const terrain = {
    NX: 4,
    NZ: 4,
    GRID: { x0: -220, z0: -238, cell: 150 },
    heights: Array.from({ length: 16 }, (_, k) => (k % 5 === 0 ? 0 : k * 2)),
    pathMask: Array.from({ length: 16 }, (_, k) => (k % 3) / 2),
    cellAt: (i: number, j: number) => i + j * 4,
    cellX: (i: number) => -220 + i * 150,
    cellZ: (j: number) => -238 + j * 150,
    gorgeD: () => 20,
  };
  const mesh = (p: Part[], shadow = true) => {
    parts.push(p);
    const m = new THREE.Mesh(merged(p));
    m.castShadow = shadow;
    m.receiveShadow = true;
    return m;
  };
  const player = { body: null as null | { position: { x: number; y: number; z: number } } };
  let populated = true,
    lit = false;
  const env = {
    buildings: () =>
      populated
        ? [0, 0.4, 1, 2].map((grow, k) => ({
            grow,
            plan: {
              x: 800 + k * 10,
              z: 10,
              y: 18,
              top: { y: 24 },
              hw: 3,
              hd: 2,
              yaw: 0.2,
              FRAME: 0,
              ROOFED: 2,
              pieces: [{ color: new THREE.Color('#c8c3b4') }],
            },
          }))
        : [],
    forgeLit: () => lit,
    trees: () =>
      populated
        ? [
            { x: 800, z: 20, great: true },
            { x: 830, z: 30, great: false },
            { x: 5000, z: 20, great: false },
          ]
        : [],
    rails: () =>
      populated
        ? [{ line: { len: 21, xs: Array.from({ length: 22 }, (_, k) => k), zs: Array(22).fill(0) }, lo: -5, hi: 25 }]
        : [],
    people: () => (populated ? 35 : 0),
    movers: () =>
      populated
        ? [
            { x: 800, y: 24, z: 20, kind: 'machine' },
            { x: 830, y: 20, z: 20, kind: 'train' },
          ]
        : [],
  };
  const bindings = {
    THREE,
    mergeGeometries,
    ...terrain,
    me: player,
    smoothstep: (lo: number, hi: number, x: number) => {
      const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
      return t * t * (3 - 2 * t);
    },
    mulberry32: sourceFunction('src/sim/rng.ts', 'mulberry32', {}),
    readableGlow: (m: unknown) => m,
    readableUnlit: (m: unknown) => m,
    softGlow: () => ({ mat: new THREE.MeshBasicNodeMaterial() }),
    H: () => 18,
    toWorld: (x: number) => x + 800,
    railY: () => 24,
    ORIGIN: { x: 800, z: 0 },
    FORGE: { x: 0, z: 0 },
    SPIRE: { x: 100, z: 20 },
    BOARDS,
    roomMesh: mesh,
    addSolid: (_r: unknown, ...a: unknown[]) => solids.push(a),
    plate: (...a: unknown[]) => {
      plates.push(a);
      return new THREE.Mesh(new THREE.PlaneGeometry(a[1] as number, a[2] as number));
    },
  };
  const activeBodies = new Set<unknown>(),
    bodies: unknown[] = [];
  const createOwnedView = sourceFunction<typeof import('../src/render/owned-view.ts').createOwnedView>(
    'src/render/owned-view.ts',
    'createOwnedView',
    {
      THREE,
      owners: new WeakMap(),
      addBody(b: unknown) {
        activeBodies.add(b);
      },
      removeBody(b: unknown) {
        activeBodies.delete(b);
      },
    },
  );
  const builders = new Map<string, import('../src/prefab/builders.ts').Builder>(
    names.builders.map((name) => [name, () => new THREE.Group()]),
  );
  const registerBuilder = (name: string, build: import('../src/prefab/builders.ts').Builder) =>
    builders.set(name, build);
  sourceModule(fs.readFileSync('src/prefab/builders/museum-parts.ts', 'utf8'), { ...bindings, registerBuilder });
  sourceModule(fs.readFileSync('src/prefab/builders/museum-exhibit.ts', 'utf8'), {
    ...bindings,
    ...museumTsl,
    registerBuilder,
  });
  const runtime = sourceModule<typeof import('../src/prefab/instantiate.ts')>(
    fs.readFileSync('src/prefab/instantiate.ts', 'utf8'),
    {
      THREE,
      artifact,
      compiled,
      definitions,
      workshop,
      gorge,
      names,
      builders,
      ...validation,
      staticBody: (shape: { hx: number; hy: number; hz: number }, at: THREE.Vector3, q?: THREE.Quaternion) => {
        solids.push([at.x, at.z, shape.hx, shape.hz, shape.hy * 2]);
        bodies.push({ shape, position: at.toArray(), ...(q ? { rotation: q.toArray() } : {}) });
        return {};
      },
    },
  );

  const matrices = recordMatrices();
  const { createMuseum } = sourceModule<{
    createMuseum: (...a: unknown[]) => { update(dt: number): void; shown(): number };
  }>(fs.readFileSync('src/entities/town/museum.ts', 'utf8'), {
    ...bindings,
    ...museumTsl,
    artifact,
    compiled,
    definitions,
    level: museumLevel,
    loadPrefabArtifact,
    loadLevelArtifact,
    createOwnedView,
    instantiate: runtime.instantiate,
  });
  const museum = createMuseum(owner, { rooms: { museum: r } }, env);
  for (const p of r.furnishings) p.setEnabled(true);
  const geometry = (g: THREE.BufferGeometry) => ({
    index: g.index ? Array.from(g.index.array) : null,
    attributes: Object.fromEntries(
      Object.entries(g.attributes).map(([key, a]) => [key, { size: a.itemSize, array: Array.from(a.array) }]),
    ),
  });
  const meshes = (group: THREE.Group) => {
    const out: unknown[] = [];
    group.updateWorldMatrix(true, true);
    group.traverse((g) => {
      if (g instanceof THREE.Mesh)
        out.push({
          matrix: g.matrixWorld.toArray(),
          castShadow: g.castShadow,
          receiveShadow: g.receiveShadow,
          frustumCulled: g.frustumCulled,
          geometry: geometry(g.geometry),
        });
    });
    return out;
  };
  const staticState = { parts, solids, plates, near: meshes(r.near), over: meshes(r.over), outside: meshes(r.outside) };
  const bits = (() => {
    let found: THREE.InstancedMesh | undefined;
    r.near.traverse((g) => {
      if (g instanceof THREE.InstancedMesh) found = g;
    });
    return found!;
  })();
  const state = () => ({
    count: museum.shown(),
    matrices: Array.from({ length: bits.count }, (_, k) => matrices.get(bits, k).toArray()),
    colors: Array.from({ length: bits.count }, (_, k) => matrices.colour(bits, k).toArray()),
  });
  const states = [state()];
  museum.update(0.04);
  states.push(state());
  museum.update(0.06);
  states.push(state());
  lit = true;
  player.body = { position: { x: 805, y: 18, z: 12 } };
  museum.update(0.1);
  states.push(state());
  r.near.visible = false;
  populated = false;
  museum.update(1);
  states.push(state());
  r.near.visible = true;
  museum.update(0.1);
  states.push(state());
  player.body = null;
  lit = false;
  museum.update(0.1);
  states.push(state());
  const value = JSON.parse(JSON.stringify({ staticState, states }));
  const museumFixture = 'test/fixtures/prefab-museum.json';
  if (process.env.GOLDEN === '1') fs.writeFileSync(museumFixture, JSON.stringify(value) + '\n');
  matrices.restore();
  prefabGolden(value, JSON.parse(fs.readFileSync(museumFixture, 'utf8')), 'museum');
  assert.equal(activeBodies.size, 10, 'six interior solids and four columns');
  const localBodies = bodies.slice();
  for (const p of r.furnishings) {
    assert.deepEqual(p.targets(), [], 'the museum adds no E action');
    p.setEnabled(false);
    assert.equal(p.root.visible, false);
  }
  assert.equal(activeBodies.size, 0, 'unready/removed museum removes every furnishing body');
  for (const p of r.furnishings) {
    p.setEnabled(true);
    p.setEnabled(true);
  }
  assert.equal(activeBodies.size, 10, 'restoring readiness creates each body exactly once');
  prefabGolden(bodies.slice(10), localBodies, 'museum restored bodies');
  const worldOwner = createOwnedView();
  const frame = { x: 675, y: 18.14, z: -8, yaw: 0.97 };
  worldOwner.root.position.set(frame.x, frame.y, frame.z);
  worldOwner.root.rotation.y = frame.yaw;
  const start = bodies.length;
  for (const placement of loadLevelArtifact(museumLevel, loadPrefabArtifact(artifact).prefabs).placements)
    runtime
      .instantiate(placement.prefab, placement, { owner: worldOwner, makeLabel: () => new THREE.Group() })
      .setEnabled(true);
  const roomToWorld = sourceFunction<typeof import('../src/entities/town/rooms.ts').roomToWorld>(
    'src/entities/town/rooms.ts',
    'roomToWorld',
    {},
  );
  const rotation = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, frame.yaw).toArray();
  const oldSolids = JSON.parse(fs.readFileSync(museumFixture, 'utf8')).staticState.solids as number[][];
  prefabGolden(
    bodies.slice(start),
    oldSolids.map(([x, z, hx, hz, h]) => ({
      shape: { kind: 'box', hx, hy: h! / 2, hz },
      position: roomToWorld(
        frame as import('../src/entities/town/rooms.ts').Room,
        x!,
        h! / 2,
        z!,
        new THREE.Vector3(),
      ).toArray(),
      rotation,
    })),
    'museum world bodies',
  );
  worldOwner.dispose();

  for (const cleanup of cleanups.reverse()) cleanup();
  assert.equal(activeBodies.size, 0, 'museum disposal removes bodies');
});

// Old-code room-shell proof: recipes, stake painting/geometry, camera cutaways and ready/unready transitions.
test('town rooms retain old shells, plot boards and state-driven transitions', () => {
  const geometry = (g: THREE.BufferGeometry) => ({
    index: g.index ? Array.from(g.index.array) : null,
    attributes: Object.fromEntries(
      Object.entries(g.attributes).map(([key, a]) => [key, { size: a.itemSize, array: Array.from(a.array) }]),
    ),
  });
  const boxes = sourceModule<typeof import('../src/render/box-plan.ts')>(
    fs.readFileSync('src/render/box-plan.ts', 'utf8'),
    { THREE },
  );
  const plans = sourceModule<typeof import('../src/place/building-plans.ts')>(
    fs.readFileSync('src/place/building-plans.ts', 'utf8'),
    { THREE, ...boxes },
  );
  const plots = sourceFunction<typeof import('../src/place/layout.ts').ROOM_PLOTS>(
    'src/place/layout.ts',
    'ROOM_PLOTS',
    {},
  );
  const added: THREE.Object3D[] = [],
    cleanups: (() => void)[] = [],
    sitePlans: unknown[] = [],
    paint: unknown[] = [],
    bodyCalls: unknown[] = [],
    pieceWrites: unknown[] = [],
    floorQueries: ((x: number, z: number) => unknown)[] = [];
  const activeBodies = new Set<unknown>();
  const owner = {
    add(g: THREE.Object3D) {
      added.push(g);
      return g;
    },
    cleanup(fn: () => void) {
      cleanups.push(fn);
    },
    removeBody(b: unknown) {
      assert.ok(activeBodies.delete(b));
    },
  };
  const up = { house: true, shop: false, museum: false };
  const player = { body: null as { interpolatedPosition: { x: number; y: number; z: number } } | null };
  const camera = new THREE.PerspectiveCamera();
  const cam = { pitch: 0, yaw: 0 };
  const constraints: unknown[] = [];
  let nextPole = 0;
  const ground = (x: number, z: number) => 18 + (x - 800) * 0.001 + z * 0.002;
  const createOwnedView = sourceFunction<typeof import('../src/render/owned-view.ts').createOwnedView>(
    'src/render/owned-view.ts',
    'createOwnedView',
    {
      THREE,
      owners: new WeakMap(),
      addBody: (b: unknown) => activeBodies.add(b),
      removeBody: (b: unknown) => assert.ok(activeBodies.delete(b)),
    },
  );
  const builders = new Map<string, import('../src/prefab/builders.ts').Builder>(
    names.builders.map((name) => [name, () => new THREE.Group()]),
  );
  const registerBuilder = (name: string, build: import('../src/prefab/builders.ts').Builder) =>
    builders.set(name, build);
  sourceModule(fs.readFileSync('src/prefab/builders/room-shell.ts', 'utf8'), {
    housePlan: plans.housePlan,
    registerBuilder,
  });
  sourceModule(fs.readFileSync('src/prefab/builders/room-proxy.ts', 'utf8'), { registerBuilder });
  const runtime = sourceModule<typeof import('../src/prefab/instantiate.ts')>(
    fs.readFileSync('src/prefab/instantiate.ts', 'utf8'),
    {
      THREE,
      artifact,
      compiled,
      definitions,
      workshop,
      gorge,
      names,
      builders,
      ...validation,
      ROOM_GROUP: 8,
      staticBody: (shape: unknown, at: THREE.Vector3, q?: THREE.Quaternion, group?: number) => {
        bodyCalls.push({
          shape,
          at: { x: at.x, y: at.y, z: at.z },
          rotation: q?.toArray(),
          ...(group ? { group } : {}),
        });
        return {};
      },
    },
  );
  // Construction boxes carry the shared site's world matrices; a second placement transform must fail.
  const shellPlacement = {
    id: 'room-house-pieces-0',
    prefab: 'town.room-house-shell' as const,
    pos: [0, 0, 0] as const,
    params: { phase: 'pieces', index: 0, x: 686, y: ground(686, 11), z: 11, yaw: 1.42 },
  };
  const rejectedOwner = createOwnedView();
  for (const change of [{ pos: [1, 0, 0] as const }, { rot: [0.5, 0, 0] as const }, { scale: [2, 2, 2] as const }])
    assert.throws(
      () => runtime.instantiate(shellPlacement.prefab, { ...shellPlacement, ...change }, { owner: rejectedOwner }),
      /identity local placement/,
    );
  assert.equal(rejectedOwner.root.children.length, 0, 'unsupported placement allocates no attached construction root');
  rejectedOwner.dispose();
  const instances: ReturnType<typeof runtime.instantiate>[] = [];
  const { createRooms, ROOM_CAM } = sourceModule<typeof import('../src/entities/town/rooms.ts')>(
    fs.readFileSync('src/entities/town/rooms.ts', 'utf8'),
    {
      THREE,
      vertexColor: museumTsl.vertexColor,
      reducedMotion: false,
      merged,
      mergeGeometries,
      H: ground,
      ROOM_GROUP: 8,
      ROOM_PLOTS: plots,
      toWorld: (x: number) => x + 800,
      artifact,
      compiled,
      definitions,
      loadLevelArtifact,
      loadPrefabArtifact,
      createOwnedView,
      houseShell: JSON.parse(fs.readFileSync('content/built/levels/room-house.json', 'utf8')),
      shopShell: JSON.parse(fs.readFileSync('content/built/levels/room-shop.json', 'utf8')),
      museumShell: JSON.parse(fs.readFileSync('content/built/levels/room-museum.json', 'utf8')),
      instantiate: (...args: Parameters<typeof runtime.instantiate>) => {
        const instance = runtime.instantiate(...args);
        instances.push(instance);
        return instance;
      },
      addSite: (id: string, plan: import('../src/place/building-plans.ts').Plan, speed: number) => {
        sitePlans.push({ id, plan, speed });
        const site = { pole1: nextPole, state: 'none' };
        nextPole += plan.pieces.length + 20;
        return site;
      },
      registerStepFloor: (fn: (x: number, z: number) => unknown) => {
        floorQueries.push(fn);
        return () => {};
      },
      paintBoard: (...args: unknown[]) => {
        paint.push(args);
        return new THREE.MeshBasicNodeMaterial();
      },
      woodV: sourceFunction('src/place/signs.ts', 'woodV', { WOOD_ROWS: 64 }),
      snapSite: (site: { state: string }, on: boolean) => {
        site.state = on ? 'done' : 'none';
      },
      startSite: (site: { state: string }) => {
        site.state = 'building';
      },
      showPiece: (...args: unknown[]) => pieceWrites.push(['show', ...args]),
      liftPiece: (...args: unknown[]) => pieceWrites.push(['lift', ...args]),
      precompile: () => Promise.resolve(),
      makeCameraArm: () => ({ reset() {}, solve() {} }),
      me: player,
      cam,
      camConstraints: constraints,
      camera,
      getMask: () => 0xffff,
    },
  );
  const rooms = createRooms(owner as unknown as import('../src/render/owned-view.ts').OwnedView, {
    up: (id) => up[id],
  });
  rooms.stakeBoard(rooms.rooms.shop, BOARDS.shopPlot);
  rooms.stakeBoard(rooms.rooms.museum, BOARDS.museumPlot);
  const staticMeshes = added.flatMap((g) => {
    const out: unknown[] = [];
    g.updateWorldMatrix(true, true);
    g.traverse((m) => {
      if (m instanceof THREE.Mesh)
        out.push({
          matrix: m.matrixWorld.toArray(),
          castShadow: m.castShadow,
          receiveShadow: m.receiveShadow,
          frustumCulled: m.frustumCulled,
          geometry: geometry(m.geometry),
        });
    });
    return out;
  });
  const roomList = Object.values(rooms.rooms);
  const furnishingOn = new Map<string, boolean>();
  for (const r of roomList) r.furnishings.push({ setEnabled: (on: boolean) => furnishingOn.set(r.id, on) });
  const callbacks: unknown[] = [];
  rooms.onRoom((r, inside) => callbacks.push([r.id, inside]));
  const states: unknown[] = [];
  const snap = (name: string) =>
    states.push({
      name,
      rooms: roomList.map((r) => ({
        id: r.id,
        up: r.up,
        ready: r.ready,
        site: r.site.state,
        pieces: r.pieces,
        corners: r.corners,
        t: r.t,
        shown: r.shown,
        proxy: r.proxy.visible,
        near: r.near.visible,
        over: r.over.visible,
        outside: r.outside.visible,
      })),
      indoors: rooms.indoors.room?.id ?? null,
      inside: rooms.indoors.inside?.id ?? null,
      bodies: activeBodies.size,
      callbacks: [...callbacks],
      floors: roomList.map((r, k) => floorQueries[k]!(r.x, r.z)),
    });
  // Freeze each snapshot before the next transition changes the view's objects.
  const capture = (name: string) => {
    for (const r of roomList)
      assert.equal(furnishingOn.get(r.id) ?? false, r.ready, `${name}: furnishing follows readiness`);
    snap(name);
    states[states.length - 1] = JSON.parse(JSON.stringify(states.at(-1)));
  };
  rooms.snap();
  rooms.update(0.1);
  rooms.cull();
  capture('initial');
  for (const r of roomList) {
    up[r.id] = true;
    rooms.update(0.1);
    capture(`${r.id}-building`);
    r.site.state = 'done';
    rooms.update(0.1);
    capture(`${r.id}-ready`);
    // The interior draws by distance to the door (room +z), not to the building: town-layout step 7.
    const camAt = (z: number) => {
      const v = new THREE.Vector3(0, 0, z).applyAxisAngle(THREE.Object3D.DEFAULT_UP, r.yaw);
      camera.position.set(r.x + v.x, r.y + 8, r.z + v.z);
      rooms.cull();
      return r.near.visible;
    };
    const within = ROOM_CAM.drawWithin;
    assert.equal(camAt(r.d / 2 + within - 1), true, `${r.id}: drawn approaching the door`);
    assert.equal(camAt(r.d / 2 + within + 0.5), true, `${r.id}: still drawn inside the slack past the line`);
    assert.equal(camAt(r.d / 2 + within + 2), false, `${r.id}: not drawn from beyond the door's radius`);
    assert.equal(camAt(r.d / 2 + within + 0.5), false, `${r.id}: not drawn again until inside the line`);
    assert.equal(camAt(-r.d / 2 - within + 2), false, `${r.id}: not drawn from as near behind`);
    const at = (z: number) => {
      const v = new THREE.Vector3(0, 0, z).applyAxisAngle(THREE.Object3D.DEFAULT_UP, r.yaw);
      player.body = { interpolatedPosition: { x: r.x + v.x, y: r.y + 0.5, z: r.z + v.z } };
    };
    camera.position.set(r.x, r.y + 8, r.z + 10);
    at(r.d / 2 + 0.3);
    rooms.update(0.12);
    rooms.cull();
    capture(`${r.id}-threshold`);
    at(0);
    rooms.update(0.12);
    rooms.cull();
    capture(`${r.id}-inside`);
    rooms.update(0.12);
    rooms.cull();
    capture(`${r.id}-cutaway`);
    at(r.d / 2 + 20);
    camera.position.set(r.x + 100, r.y + 8, r.z + 100);
    rooms.update(0.3);
    rooms.cull();
    capture(`${r.id}-left`);
    up[r.id] = false;
    rooms.update(0.1);
    rooms.cull();
    capture(`${r.id}-removed`);
    rooms.snap();
    rooms.update(0.1);
    rooms.cull();
    capture(`${r.id}-snap-removed`);
    up[r.id] = true;
    rooms.snap();
    rooms.update(0.1);
    rooms.cull();
    capture(`${r.id}-snap-restored`);
  }
  const value = JSON.parse(
    JSON.stringify({ plans: sitePlans, meshes: staticMeshes, paint, bodyCalls, states, pieceWrites }),
  );
  const roomFixture = 'test/fixtures/prefab-rooms.json';
  if (process.env.GOLDEN === '1') fs.writeFileSync(roomFixture, JSON.stringify(value) + '\n');
  prefabGolden(value, JSON.parse(fs.readFileSync(roomFixture, 'utf8')), 'rooms');
  const oldPlans = JSON.parse(fs.readFileSync(roomFixture, 'utf8')).plans as {
    id: string;
    plan: import('../src/place/building-plans.ts').Plan;
  }[];
  for (const { id, plan } of oldPlans) {
    const roomLevel = loadLevelArtifact(
      JSON.parse(fs.readFileSync(`content/built/levels/${id}.json`, 'utf8')),
      definitions,
    );
    const expectedIds = (
      [
        ['scaffold', plan.scaffold.length],
        ['pieces', plan.pieces.length],
        ['hulls', plan.hulls.length],
        ['poles', plan.poles.length],
        ['proxy', 7],
      ] as const
    ).flatMap(([phase, count]) => Array.from({ length: count }, (_, index) => `${id}-${phase}-${index}`));
    assert.deepEqual(
      roomLevel.placements.map((p) => p.id),
      expectedIds,
      `${id} retains every placement id in old order`,
    );
    for (const placement of roomLevel.placements.filter(
      (p) => p.id.includes('-scaffold-') || p.id.includes('-pieces-'),
    )) {
      const phase = placement.id.includes('-scaffold-') ? 'scaffold' : 'pieces';
      assert.equal(placement.prefab, `town.${id}-shell`);
      assert.deepEqual(placement.params, { phase, index: Number(placement.id.split('-').at(-1)) });
    }
    const frameOwner = createOwnedView();
    frameOwner.root.position.set(plan.x, plan.y, plan.z);
    frameOwner.root.rotation.y = plan.yaw;
    const at = bodyCalls.length;
    const mounted = (['hulls', 'poles'] as const).flatMap((phase) =>
      plan[phase].map((_h, index) => {
        const key = `town.${id}-${phase}-${index}` as const;
        const piece = runtime.instantiate(key, { id: key, prefab: key, pos: [0, 0, 0] }, { owner: frameOwner });
        piece.setEnabled(true);
        piece.setEnabled(true);
        return piece;
      }),
    );
    const c = Math.cos(plan.yaw),
      s = Math.sin(plan.yaw);
    prefabGolden(
      bodyCalls.slice(at),
      [...plan.hulls, ...plan.poles].map((h) => ({
        shape: { kind: 'box', hx: h.hx, hy: h.hy, hz: h.hz },
        at: { x: plan.x + h.dx * c + h.dz * s, y: plan.y + h.dy, z: plan.z - h.dx * s + h.dz * c },
        rotation: new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, plan.yaw).toArray(),
        ...(h.room ? { group: 8 } : {}),
      })),
      `${id} world hulls and scaffolding`,
    );
    for (const piece of mounted) {
      piece.setEnabled(false);
      piece.setEnabled(false);
    }
    frameOwner.dispose();
  }
  for (const instance of instances) assert.deepEqual(instance.targets(), [], 'room records add no E target');
  for (const fn of cleanups.reverse()) fn();
  assert.equal(constraints.length, 0, 'room disposal unregisters the indoor camera');
  assert.equal(activeBodies.size, 0, 'plot-board bodies leave with their record owners');
});

test('house furnishing retains old parts, solids, copy and every fact stage', () => {
  const parts: Part[][] = [],
    solids: unknown[] = [],
    plates: unknown[] = [];
  const room = {
    w: 7.4,
    d: 7.4,
    near: new THREE.Group(),
    over: new THREE.Group(),
    outside: new THREE.Group(),
    furnishings: [],
  };
  const cleanups: (() => void)[] = [];
  let facts = 0;
  const { houseParts } = sourceModule<typeof import('../src/prefab/builders/house-parts.ts')>(
    fs.readFileSync('src/prefab/builders/house-parts.ts', 'utf8'),
    { registerBuilder() {} },
  );
  const { createHouse } = sourceModule<{ createHouse: (...args: unknown[]) => { update(): void; stage(): number } }>(
    fs.readFileSync('src/entities/town/house.ts', 'utf8'),
    {
      BOARDS,
      artifact,
      compiled,
      definitions,
      level: JSON.parse(fs.readFileSync('content/built/levels/house.json', 'utf8')),
      loadLevelArtifact,
      loadPrefabArtifact,
      createOwnedView: () => ({ root: new THREE.Group(), dispose() {} }),
      instantiate: (
        key: string,
        placement: { labels?: Record<string, string> },
        options: {
          makeLabel: (a: unknown, key: string) => unknown;
        },
      ) => {
        const def = loadPrefabArtifact(artifact).prefabs[key]!;
        for (const c of def.colliders) {
          if (c.shape !== 'box') throw new Error('expected box');
          solids.push([c.at[0], c.at[2], c.half[0], c.half[2], c.half[1] * 2]);
        }
        if (def.attach?.sign) options.makeLabel(def.attach.sign, placement.labels!.sign!);
        return {
          root: new THREE.Group(),
          ...('builder' in def.visual ? houseParts(def.visual.params) : { parts: [] }),
          setEnabled() {},
          targets: () => [],
        };
      },
      DOOR: { w: 2.6, rows: 3 },
      addSolid: (_r: unknown, ...args: unknown[]) => solids.push(args),
      roomMesh: (p: Part[]) => {
        parts.push(p);
        return new THREE.Mesh(new THREE.BufferGeometry());
      },
      plate: (...args: unknown[]) => {
        plates.push(args);
        return new THREE.Group();
      },
    },
  );
  const house = createHouse({ cleanup: (fn: () => void) => cleanups.push(fn) }, room, {
    has: (fact: string) => !!(facts & (1 << ['path', 'forge', 'trains', 'town'].indexOf(fact))),
  });
  const stages: number[] = [];
  for (facts = 0; facts < 16; facts++) {
    house.update();
    stages.push(house.stage());
    const count = parts.length;
    house.update();
    assert.equal(parts.length, count, 'unchanged facts do not redraw');
  }
  const value = JSON.parse(JSON.stringify({ parts, solids, plates, stages }));
  const houseFixture = 'test/fixtures/prefab-house.json';
  if (process.env.GOLDEN === '1') fs.writeFileSync(houseFixture, JSON.stringify(value) + '\n');
  prefabGolden(value, JSON.parse(fs.readFileSync(houseFixture, 'utf8')), 'house');
  for (const fn of cleanups.reverse()) fn();
});

test('site body records retain the old construction, ejection, snap and teardown lifecycle', () => {
  function run(useRecords: boolean) {
    const events: unknown[] = [],
      states: unknown[] = [],
      active = new Set<import('../src/physics/engine.ts').Body>(),
      ids = new Map<import('../src/physics/engine.ts').Body, number>();
    let nextId = 0;
    const player = {
      position: { x: 70, y: 18.9, z: 31 },
      velocity: new THREE.Vector3(),
    };
    const ground = () => 18;
    const owner = {
      cleanup() {},
      removeBody(body: import('../src/physics/engine.ts').Body) {
        assert.ok(active.delete(body), 'each body is removed exactly once');
        events.push(['remove', ids.get(body)]);
      },
    };
    const addStatic = (
      shape: unknown,
      at: { x: number; y: number; z: number },
      q: THREE.Quaternion,
      group?: number,
    ) => {
      const body = {} as import('../src/physics/engine.ts').Body;
      const id = nextId++;
      ids.set(body, id);
      active.add(body);
      events.push(['add', id, shape, [at.x, at.y, at.z], q.toArray(), group ?? null]);
      return body;
    };
    const sites = sourceModule<typeof import('../src/place/sites.ts')>(fs.readFileSync('src/place/sites.ts', 'utf8'), {
      THREE,
      PLAYER_R: 0.45,
      ROOM_GROUP: 8,
      me: { body: player },
      H: ground,
      addStatic,
      removeBody: owner.removeBody,
      teleport: (_body: unknown, x: number, y: number, z: number) => {
        player.position = { x, y, z };
        events.push(['teleport', x, y, z]);
      },
      paintSite() {},
      dustRing() {},
      thump() {},
      dropSet: () => ({
        mesh: {},
        snap: (k: number, on: boolean) => events.push(['snap', k, on]),
        drop: (k: number, height: number, at: number) => events.push(['drop', k, height, at]),
        update() {},
        busy: () => false,
      }),
    });
    const box = () => ({
      x: 70,
      y: 18,
      z: 31,
      local: new THREE.Matrix4(),
      color: new THREE.Color('#7f5630'),
      tall: false,
      pop: 0.7,
    });
    const plan: import('../src/place/sites.ts').Plan = {
      x: 70,
      y: 18,
      z: 31,
      yaw: 0.7,
      scaffold: Array.from({ length: 3 }, box),
      pieces: Array.from({ length: 4 }, box),
      FRAME: 1,
      WALLS: 2,
      ROOFED: 3,
      hulls: [
        { dx: -2, dy: 2, dz: 0, hx: 0.14, hy: 2, hz: 3, room: true },
        { dx: 0, dy: 0.07, dz: 0, hx: 2.8, hy: 0.07, hz: 3.8 },
      ],
      poles: [
        { dx: -2.7, dy: 3, dz: -3.7, hx: 0.13, hy: 3, hz: 0.13 },
        { dx: 2.7, dy: 3, dz: 3.7, hx: 0.13, hy: 3, hz: 0.13 },
      ],
      keepOut: { dx: 0, dy: 2, dz: 0, hx: 2.1, hy: 2, hz: 3.1 },
      hw: 2.8,
      hd: 3.8,
      smoke: null,
      top: { x: 70, y: 24, z: 31 },
    };
    const record = (h: import('../src/place/sites.ts').Hull) => {
      const bodies: import('../src/physics/engine.ts').Body[] = [];
      let enabled = false;
      return {
        bodies,
        setEnabled(on: boolean) {
          if (on === enabled) return;
          enabled = on;
          if (!on) {
            for (const body of bodies) owner.removeBody(body);
            bodies.length = 0;
            return;
          }
          const c = Math.cos(plan.yaw),
            s = Math.sin(plan.yaw);
          bodies.push(
            addStatic(
              { kind: 'box', hx: h.hx, hy: h.hy, hz: h.hz },
              { x: plan.x + h.dx * c + h.dz * s, y: plan.y + h.dy, z: plan.z - h.dx * s + h.dz * c },
              new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, plan.yaw),
              h.room ? 8 : undefined,
            ),
          );
        },
      };
    };
    const site = sites.addSite(
      'room-lifecycle',
      plan,
      1.5,
      useRecords ? { hulls: plan.hulls.map(record), poles: plan.poles.map(record) } : undefined,
    );
    const dispose = sites.buildSites(owner as unknown as import('../src/render/owned-view.ts').OwnedView);
    const state = () =>
      states.push({
        state: site.state,
        t: site.t,
        bodies: site.bodies.map((b) => ids.get(b)),
        poles: site.poleBodies.map((b) => ids.get(b)),
        active: [...active].map((b) => ids.get(b)),
        struck: site.struck,
        player: { ...player.position },
      });
    sites.snapSite(site, false);
    state();
    sites.snapSite(site, true);
    state();
    sites.snapSite(site, true);
    state();
    sites.snapSite(site, false);
    player.position = { x: 70, y: 18.9, z: 31 };
    sites.startSite(site, 0.4);
    state();
    sites.updateSites(0.4 + site.solidAt - 0.1);
    state();
    sites.updateSites(0.1);
    state();
    sites.updateSites(1);
    state();
    sites.updateSites(site.doneAt + 2);
    state();
    sites.snapSite(site, false);
    state();
    sites.snapSite(site, true);
    state();
    dispose();
    dispose();
    state();
    assert.equal(active.size, 0, 'disposal leaves no hull or scaffold body');
    assert.equal(sites.sites.length, 0);
    assert.equal(sites.feet.length, 0);
    return JSON.parse(JSON.stringify({ events, states }));
  }
  const legacy = run(false),
    recorded = run(true);
  const siteFixture = 'test/fixtures/prefab-site-lifecycle.json';
  if (process.env.GOLDEN === '1') fs.writeFileSync(siteFixture, JSON.stringify(legacy) + '\n');
  const old = JSON.parse(fs.readFileSync(siteFixture, 'utf8'));
  prefabGolden(legacy, old, 'legacy site lifecycle');
  prefabGolden(recorded, old, 'record site lifecycle');
});
