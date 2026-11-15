// Step 11: captured on the unconverted code. Exact bytes, including native-math results; no tolerance.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { LAND_TREES } from '../src/place/tree-catalog.ts';
import { TREE_SOURCES } from '../src/place/tree-sources.ts';
import { H } from '../src/place/terrain.ts';
import { collidersOf, footprintOf } from '../src/blueprints/blueprint.ts';
import { PROP_BLUEPRINTS, scatterProps, isHomePalm, tileKey } from '../src/blueprints/props.ts';
import '../dev/sim/hooks.ts';
import { createIsland } from '../src/island/stamps.ts';
import { sourceFunction } from '../dev/level/source.ts';
import type { TreePose } from '../src/render/place-tree-view.ts';
import type { Body } from '../src/physics/engine.ts';
const { loadLevel } = await import('../dev/level/level.ts');

test('tree identities, poses, scatter sequence and colliders are byte-identical to pre-prefab code', () => {
  const treeBodies: unknown[] = [];
  const solid = sourceFunction<typeof import('../src/render/place-tree-view.ts').createTreeSolids>(
    'src/render/place-tree-view.ts',
    'createTreeSolids',
    { THREE },
  );
  const trees = TREE_SOURCES.map(
    (t) => ({ ...t, body: null, stump: null, fall: -1, collapsed: false, fallYaw: 0 }) as TreePose,
  );
  const apply = solid(
    trees,
    H,
    (shape, position, rotation) => {
      treeBodies.push({ shape, position, ...(rotation ? { rotation: rotation.toArray() } : {}) });
      return {} as Body;
    },
    () => null,
    () => false,
    () => {},
  );
  for (const t of trees) {
    // Standing, growing, ordinary fall, compact fall, and carried great trunk use today's actual body code.
    for (const state of [
      { fall: -1 },
      { fall: -1, growth: 2 },
      { fall: 2, fallYaw: 0.7 },
      { fall: 2, collapsed: true },
    ]) {
      t.growth = undefined;
      t.collapsed = false;
      Object.assign(t, state);
      apply(t);
    }
  }
  const scatters = [null, ...fs.globSync('dev/layouts/*.json').sort()].map((file) => {
    const level = loadLevel(file);
    const island = createIsland(level.sites);
    const all = scatterProps({ groundHeight: level.groundAt, keptOut: island.keptOut });
    return {
      file,
      all,
      standing: level.placements,
      shapes: all.map((p) => ({
        home: isHomePalm(p),
        tile: tileKey(p.x, p.z),
        footprint: footprintOf(PROP_BLUEPRINTS[p.blueprint], p),
        spheres: collidersOf(PROP_BLUEPRINTS[p.blueprint], p),
      })),
    };
  });
  const actual = JSON.stringify({ land: LAND_TREES, sources: TREE_SOURCES, treeBodies, scatters }) + '\n';
  const file = new URL('./fixtures/prefab-trees.json', import.meta.url);
  if (process.env.GOLDEN === '1') fs.writeFileSync(file, actual);
  assert.equal(actual, fs.readFileSync(file, 'utf8'));
});
