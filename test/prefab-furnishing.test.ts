// Owner-requested old-code conversion goldens: no renderer, physics engine or network.
import test from 'node:test';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceModule, sourceFunction } from '../dev/level/source.ts';
import { prefabGolden } from './helpers/prefab-golden.ts';
import { STOCK } from '../src/render/cosmetic-parts.ts';
import { BOARDS, SHOP } from '../src/entities/town/town-lines.ts';
import type { Part } from '../src/render/part-geometry.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import level from '../content/built/levels/workshop-kit.json' with { type: 'json' };
import { loadLevelArtifact, loadPrefabArtifact } from '../src/prefab/validate.ts';
import * as validation from '../src/prefab/validate.ts';
import { names } from '../src/prefab/names.ts';
import workshop from '../content/built/levels/workshop.json' with { type: 'json' };
import gorge from '../content/built/levels/gorge.json' with { type: 'json' };
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
