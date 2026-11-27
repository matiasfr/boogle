// Step 11: captured on the unconverted code. Exact bytes, including native-math results; no tolerance.
// Terrain-clean steps 5–6 repin cleared trees and terrain-following source/body poses; classic scatter stays exact.
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
import { sourceFunction, sourceModule } from '../dev/level/source.ts';
import type { TreePose } from '../src/render/place-tree-view.ts';
import type { Body } from '../src/physics/engine.ts';
import { treeColliderCase } from './helpers/tree-collider-case.ts';
import { capturePoisAfter, sameTurns } from './helpers/poi-golden.ts';
import { captureLookoutAfter } from './helpers/lookout-golden.ts';
import { captureRingAfter } from './helpers/ring-island-golden.ts';
import { captureStallAfter } from './helpers/mushroom-stall-golden.ts';
import { captureSecrets } from './helpers/secrets-golden.ts';
import { prefabGolden } from './helpers/prefab-golden.ts';
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
    // Standing, growing, ordinary fall and compact fall use today's actual body code.
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

for (const carried of [true, false]) {
  test(`tree collider golden preserves ${carried ? 'a carried great trunk' : 'player avoidance'}`, () => {
    const golden = JSON.parse(
      fs.readFileSync(new URL('./fixtures/prefab-tree-interactions.json', import.meta.url), 'utf8'),
    );
    const actual = treeColliderCase(
      (bindings) =>
        sourceModule<typeof import('../src/render/place-tree-view.ts')>(
          fs.readFileSync('src/render/place-tree-view.ts', 'utf8'),
          bindings,
        ).createTreeSolids,
      TREE_SOURCES,
      H,
      carried,
    );
    assert.equal(
      JSON.stringify(actual),
      JSON.stringify(golden.cases.find((c: { carried: boolean }) => c.carried === carried)),
    );
  });
}

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

// Step 13 (src/pois/): the fixture was captured on the pre-record code (capturePoisBefore at 093f8029) and is never
// rewritten. Runtime values use the shared tolerance; part matrices are full precision, before Float32 quantization.
test('POI parts, poses, colliders and lights match the pre-record code', async () => {
  const actual = sameTurns(JSON.parse(JSON.stringify(await capturePoisAfter(loadLevel(null).groundAt))));
  prefabGolden(actual, sameTurns(JSON.parse(fs.readFileSync('test/fixtures/prefab-pois.json', 'utf8'))), 'pois');
  // The records' authored numbers that repeat a POI's own (content may not import src/pois/).
  const { MILLS } = await import('../src/pois/windmills/site.ts');
  const { TOWER_H, PLINTH_H, R_TOP, R_BOTTOM } = await import('../src/pois/windmills/model.ts');
  const { NODES } = await import('../src/pois/caves/network.ts');
  const { definitions } = await import('../src/prefab/catalogue.ts');
  const mills = JSON.parse(fs.readFileSync('content/built/levels/windmills.json', 'utf8')).placements;
  assert.deepEqual(
    mills.map((p: { pos: number[] }) => [p.pos[0], p.pos[2]]),
    MILLS.map((m) => [m.x, m.z]),
  );
  assert.deepEqual(definitions['poi.windmill']!.colliders, [
    { shape: 'cylinder', at: [0, 4.05, 0], rTop: R_TOP, rBottom: R_BOTTOM + 0.4, h: TOWER_H + PLINTH_H, segments: 8 },
    { shape: 'sphere', at: [0, TOWER_H + PLINTH_H, 0], r: R_TOP + 0.5 },
  ]);
  const rack = definitions['cave.rack-bay']!.visual,
    tower = definitions['poi.lighthouse']!.visual;
  assert.equal('builder' in rack && rack.params.length, NODES.cellar.half[0] * 2);
  const lantern = JSON.parse(fs.readFileSync('content/built/levels/lighthouse.json', 'utf8')).placements[1];
  assert.ok('builder' in tower);
  assert.equal(lantern.pos[1], (tower.params.plinthH as number) + (tower.params.towerH as number));
});

// Step 13 (the lookout): the fixture was captured on the pre-record code (captureLookoutBefore, in the commit "Capture
// the lookout world golden before the record conversion") and is never rewritten. Runtime values use the shared tolerance; buoy matrices are full precision, before Float32 quantization.
test('lookout meshes, buoys, colliders, footprint and view match the pre-record code', async () => {
  const actual = JSON.parse(JSON.stringify(await captureLookoutAfter()));
  prefabGolden(actual, JSON.parse(fs.readFileSync('test/fixtures/prefab-lookout.json', 'utf8')), 'lookout');
});

// Step 13 (Ring Island): the fixture was captured on the pre-record code (captureRingBefore, in the commit "Capture the
// Ring Island world golden before the record conversion"). Both island fixtures include the approved J11 update.
// Runtime values use the shared
// tolerance; piece matrices are full precision, before Float32 quantization, and boxes read as unit boxes times size.
let ringCapture: Promise<unknown> | undefined;
const ringAfter = async () => JSON.parse(JSON.stringify(await (ringCapture ??= captureRingAfter()))) as unknown;
// The cliff kit now owns the 19 rim markers. Keep the historical fixtures intact and
// compare every other piece, collider and corresponding clearance probe as before.
function ringFixture(file: string) {
  const golden = JSON.parse(fs.readFileSync(file, 'utf8'));
  const centres = new Set<string>();
  for (const mesh of golden.meshes) {
    if (mesh.name === 'ring-island-ground') mesh.material.vertexColors = false;
    if (mesh.pieces)
      mesh.pieces = mesh.pieces.filter((p: { color: string; geometry: { type: string }; matrix: number[] }) => {
        if (p.color !== '#c4beb0' || p.geometry.type !== 'DodecahedronGeometry') return true;
        centres.add(p.matrix.slice(12, 15).join(','));
        return false;
      });
  }
  assert.equal(centres.size, 19);
  let probe = 0;
  const removed = new Set<number>();
  golden.colliders = golden.colliders.filter((c: { type: string; kind: string; at: number[] }) => {
    if (c.type !== 'fixed' || c.kind === 'heightfield') return true;
    const index = probe;
    probe += 2;
    // With the marker in the kit's wait set, the existing bridge can take its
    // normal clear exit onto the adjoining ground on these two deck probes.
    if (c.at[0] === 1399.3716546946312 && c.at[2] === -887.0963266693831) {
      golden.clear[index] = golden.clear[index + 1] = [1406.1613116642563, 16.036838042708325, -887.0963266693831];
    }
    if (!centres.has(c.at.join(','))) return true;
    removed.add(index);
    removed.add(index + 1);
    return false;
  });
  assert.equal(removed.size, 38);
  golden.clear = golden.clear.filter((_: unknown, i: number) => !removed.has(i));
  golden.inspect.solids -= centres.size;
  return golden;
}
test('Ring Island pieces, poses, colliders, clearance and frames match the pre-record code', async () => {
  const actual = await ringAfter();
  prefabGolden(actual, ringFixture('test/fixtures/prefab-ring-island.json'), 'ring');
  // The map table's size repeats state.ts's RING_MAP_TABLE (content may not import src/entities/).
  const { RING_MAP_TABLE } = await import('../src/entities/ring-island/state.ts');
  const { RING_HALT } = await import('../src/sim/railway-ring-layout.ts');
  const { definitions } = await import('../src/prefab/catalogue.ts');
  const table = definitions['ring.map-table']!.visual;
  assert.ok('builder' in table);
  assert.deepEqual(
    [table.params.w, table.params.d, table.params.legs],
    [RING_MAP_TABLE.w, RING_MAP_TABLE.d, +(RING_MAP_TABLE.top - (RING_HALT.y / 100 + 0.9)).toFixed(9)],
  );
});

// Step 13 (Ring Island's massing): captured on the view before its hand-authored massing (the hinge pier, the pennant
// pole's footing, the brace platform with its pier, handrail and gold strut, and the steps) became placements, in the
// commit "Capture the Ring Island massing golden before the record conversion". Same capture and
// tolerance as above; it pins the furnished island as it stood on main, piece by piece and in draw order. It holds the
// later sittings' cuts too (the sea ramps and the Pilgrims' Way became placements against it, unchanged).
test('Ring Island massing pieces, colliders and clearance match the pre-placement code', async () => {
  prefabGolden(await ringAfter(), ringFixture('test/fixtures/prefab-ring-massing.json'), 'ring-massing');
});

// Step 13 (the mushroom stall): the fixture was captured on the pre-record code (captureStallBefore, in the commit
// "Capture the mushroom stall world golden before the record conversion") and is never rewritten. Runtime values use the
// shared tolerance.
test('mushroom stall meshes, canvases, collider, footprint and Take target match the pre-record code', async () => {
  const actual = JSON.parse(JSON.stringify(await captureStallAfter()));
  prefabGolden(actual, JSON.parse(fs.readFileSync('test/fixtures/prefab-mushroom-stall.json', 'utf8')), 'stall');
});

// Step 13 (the secrets): the fixture was captured on the pre-record code (captureSecrets over the view as it was, in
// the commit "Capture the secrets world golden before the record conversion") and is never rewritten. Runtime values use
// the shared tolerance; primitive matrices are full precision, before Float32 quantization, and boxes and columns read as
// unit shapes times their size.
test('secrets ground, ladder, colliders, boxes and Open target match the pre-record code', async () => {
  const actual = JSON.parse(JSON.stringify(await captureSecrets()));
  prefabGolden(actual, JSON.parse(fs.readFileSync('test/fixtures/prefab-secrets.json', 'utf8')), 'secrets');
});
