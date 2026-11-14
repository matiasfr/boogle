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
  const plankFloor = sourceFunction<typeof import('../src/entities/town/rooms.ts').plankFloor>(
    'src/entities/town/rooms.ts',
    'plankFloor',
    {},
  );
  const { createShop } = sourceModule<{ createShop: (...args: unknown[]) => unknown }>(
    fs.readFileSync('src/entities/town/shop.ts', 'utf8'),
    {
      THREE,
      artifact,
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
      plankFloor,
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
  const file = 'test/fixtures/prefab-museum.json';
  if (process.env.GOLDEN === '1') fs.writeFileSync(file, JSON.stringify(value) + '\n');
  matrices.restore();
  prefabGolden(value, JSON.parse(fs.readFileSync(file, 'utf8')), 'museum');
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
  const oldSolids = JSON.parse(fs.readFileSync(file, 'utf8')).staticState.solids as number[][];
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
