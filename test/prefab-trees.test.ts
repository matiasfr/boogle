// Step 11: captured on the unconverted code. Exact bytes, including native-math results; no tolerance.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { LAND_TREES } from '../src/place/tree-catalog.ts';
import { TREE_SOURCES } from '../src/place/tree-sources.ts';
import { H } from '../src/place/terrain.ts';
import { collidersOf, footprintOf } from '../src/prefab/scenery.ts';
import { validateLevel } from '../src/prefab/validate.ts';
import {
  PROP_PREFABS as PROP_BLUEPRINTS,
  scatterProps,
  propSample,
  isHomePalm,
  tileKey,
} from '../src/blueprints/props.ts';
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
  const layouts = fs
    .readdirSync(new URL('../dev/layouts/', import.meta.url))
    .filter((name) => name.endsWith('.json'))
    .sort();
  const scatters = [null, ...layouts.map((name) => `dev/layouts/${name}`)].map((file) => {
    const level = loadLevel(file);
    const island = createIsland(level.sites);
    const all = scatterProps({ groundHeight: level.groundAt, keptOut: island.keptOut }).map(propSample);
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

test('resolved tree ids and scatter placements retain the authored generator inputs', async () => {
  const { TREE_PLACEMENTS } = await import('../src/place/tree-sources.ts');
  const { definitions } = await import('../src/prefab/catalogue.ts');

  const treeLevel = JSON.parse(fs.readFileSync('content/built/levels/land-trees.json', 'utf8'));
  const propLevel = JSON.parse(fs.readFileSync('content/built/levels/island-props.json', 'utf8'));
  assert.deepEqual(treeLevel.generator.seeds, [31, 77]);
  assert.deepEqual(propLevel.generator.seeds, [20261028, 20261029]);
  assert.deepEqual(
    TREE_PLACEMENTS.map((p) => p.id),
    TREE_SOURCES.map((t) => String(t.index)),
  );
  const ground = loadLevel(null);
  const island = createIsland(ground.sites);
  const input = { groundHeight: ground.groundAt, keptOut: island.keptOut };
  const placements = scatterProps(input);
  validateLevel({ place: 'resolved-scatter', placements }, definitions);
  assert.deepEqual(
    placements.map((p) => p.id),
    placements.map((_, i) => `island-props.${i}`),
  );
  // A changed seed must change this proof, even while yielding valid placements.
  assert.notDeepEqual(scatterProps(input, { ...propLevel.generator, seeds: [20261029, 20261029] }), placements);
});

test('runtime scatter body grouping retains the golden home bodies and tile order', () => {
  const golden = JSON.parse(fs.readFileSync(new URL('./fixtures/prefab-trees.json', import.meta.url), 'utf8')) as {
    scatters: { all: ReturnType<typeof propSample>[]; shapes: { home: boolean; tile: number; spheres: unknown[] }[] }[];
  };
  const baseline = golden.scatters[0]!;
  const expected: unknown[][] = [],
    tiles = new Map<number, unknown[]>();
  for (const shape of baseline.shapes) {
    if (shape.home) expected.push(shape.spheres);
    else {
      if (!tiles.has(shape.tile)) tiles.set(shape.tile, []);
      tiles.get(shape.tile)!.push(...shape.spheres);
    }
  }
  expected.push(...tiles.values());
  const actual: unknown[][] = [];
  const ground = loadLevel(null);
  const island = createIsland(ground.sites);
  const buildBodies = sourceFunction<() => Body[]>('src/entities/props/state.ts', 'buildBodies', {
    placements: scatterProps({ groundHeight: ground.groundAt, keptOut: island.keptOut }).map(propSample),
    collidersOf,
    PROP_PREFABS: PROP_BLUEPRINTS,
    isHomePalm,
    tileKey,
    clearedAt: () => false, // Today's golden has no cleared scatter; alternate-layout clearance is covered above.
    staticSpheresBody: (spheres: unknown[]) => {
      actual.push(spheres);
      return {} as Body;
    },
  });
  buildBodies();
  assert.deepEqual(actual, expected);
});
