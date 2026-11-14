// Owner-requested old-code conversion goldens: no renderer, physics engine or network.
import test from 'node:test';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceModule, sourceFunction } from '../dev/level/source.ts';
import { prefabGolden } from './helpers/prefab-golden.ts';
import { STOCK } from '../src/render/cosmetic-parts.ts';
import { BOARDS, SHOP } from '../src/entities/town/town-lines.ts';
import type { Part } from '../src/render/part-geometry.ts';

test('workshop furnishing matches the old authored parts, solids and glass', () => {
  const { workshopKit } = sourceModule<{ workshopKit(w: number, d: number): unknown }>(
    fs.readFileSync('src/entities/town/workshop-kit.ts', 'utf8'),
    { merged: (parts: Part[]) => parts },
  );
  golden('workshop-kit', workshopKit(5, 4));
});

test('shop furnishing matches the old parts, solids and sign references in order', () => {
  const parts: Part[][] = [],
    solids: unknown[] = [],
    plates: unknown[] = [];
  const mesh = (p: Part[]) => {
    parts.push(p);
    return new THREE.Mesh(new THREE.BufferGeometry());
  };
  const r = { w: 10, d: 8, near: new THREE.Group(), over: new THREE.Group(), outside: new THREE.Group() };
  const plankFloor = sourceFunction<typeof import('../src/entities/town/rooms.ts').plankFloor>(
    'src/entities/town/rooms.ts',
    'plankFloor',
    {},
  );
  const { createShop } = sourceModule<{ createShop: (...args: unknown[]) => unknown }>(
    fs.readFileSync('src/entities/town/shop.ts', 'utf8'),
    {
      THREE,
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
  prefabGolden(JSON.parse(JSON.stringify(value)), JSON.parse(fs.readFileSync(file, 'utf8')), name);
}
