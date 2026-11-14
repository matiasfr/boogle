// Owner-requested conversion golden, captured with the old curio implementation first.
import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sourceModule } from '../dev/level/source.ts';
import { merged } from '../src/render/part-geometry.ts';
import { GIFTS, type Part } from '../src/render/cosmetic-parts.ts';
import { prefabGolden } from './helpers/prefab-golden.ts';

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
  const bindings: Record<string, unknown> = {
    THREE,
    mergeGeometries,
    GIFTS,
    dependencies,
    me: { body: null },
    emit: (e: unknown) => effects.push(e),
    readableIntensity: () => 1,
  };
  // The adapter supplies old dynamic dependencies without loading the browser's terrain/physics setup.
  const source = fs
    .readFileSync('src/entities/town/curio-shelf.ts', 'utf8')
    .replace(/await Promise\.all\(\[[\s\S]*?\]\)/, 'dependencies');
  const { createCurioShelf } = sourceModule<{
    createCurioShelf: (...args: unknown[]) => Promise<{
      inspect(): unknown;
      shelfGroup: THREE.Group;
      crystalPeg(k: number, n: number, out: THREE.Vector3): THREE.Vector3;
      bayPeg(k: number, out: THREE.Vector3): THREE.Vector3;
    }>;
  }>(source, bindings);
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
