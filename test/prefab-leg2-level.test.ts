import { massingClearance } from '../src/entities/route-greybox/massing-clearance.ts';
// Review reproduction: missing/moved compiled placements must change the actual level-check verdict.
import '../dev/sim/hooks.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sourceModule } from '../dev/level/source.ts';
import * as stackHalts from '../src/entities/route-greybox/stack-halts.ts';
import { H } from '../src/place/terrain.ts';
import { inside, layout, parseMapPage } from '../src/sickle/map-data.ts';
import { ORIGIN } from '../src/place/layout.ts';
import { WORLD_LINES } from '../src/sim/railway-world-lines.ts';
import * as route from '../src/sim/railway-route.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import bellRaw from '../content/built/levels/bell.json' with { type: 'json' };
import westRaw from '../content/built/levels/west.json' with { type: 'json' };
import gorgeRaw from '../content/built/levels/gorge.json' with { type: 'json' };
import * as validation from '../src/prefab/validate.ts';
import { colliderFlood } from '../dev/level/route-leg4.ts';
import { flood } from '../dev/level/flood.ts';
import { Matrix4, Vector3 } from 'three';
import * as placed from '../dev/level/prefab-colliders.ts';
import { metadata, type LevelArtifact, type PrefabDef } from '../src/prefab/types.ts';
import { MOVER } from '../dev/level/mover.ts';
import * as THREE from 'three/webgpu';
import { sourceFunction } from '../dev/level/source.ts';
import * as lines from '../src/sim/railway-lines.ts';
import * as rows from '../src/sim/railway-rows.ts';
import * as progress from '../src/sim/railway-queries-route.ts';
import { RING_S_HEAD } from '../src/sim/railway-ring-layout.ts';
import { joinedCaveStop, lapSlots } from '../src/sim/railway-lap.ts';
import { TRAIN_PHASE, trainStopsOf } from '../src/sim/railway-train.ts';
import { Leg } from '../src/sim/railway-components.ts';
import { buildSeedWorld } from '../src/sim/railway-seeds.ts';
import * as path from '../src/entities/railway/line2-path.ts';
import * as row from '../src/entities/railway/row-path.ts';
import * as junctions from '../src/place/junctions.ts';
import { KIT } from '../src/place/turnout.ts';
import * as gorgeLayout from '../src/entities/route-greybox/massing.ts';
import { AREA_CENTRES, coverNear, LEG2_TEXT } from '../src/entities/route-greybox/leg2-layout.ts';
import { CANOPY_CENTRES, isleGround, landPoints } from '../src/content/levels/leg3.ts';
import type { Body, Shape } from '../src/physics/engine.ts';
import { resident } from '../src/render/lod-level.ts';
import { CAVE_GROUP, HEAD_OFFSET, PLAYER_R } from '../src/constants.ts';
import { createLiftOrWait, STEP, type Solid } from '../src/place/clearance.ts';
import canopy from '../content/built/levels/canopy.json' with { type: 'json' };
import notch from '../content/built/levels/notch.json' with { type: 'json' };
import original from '../content/built/levels/original.json' with { type: 'json' };
import south from '../content/built/levels/wall-south.json' with { type: 'json' };
import north from '../content/built/levels/wall-north.json' with { type: 'json' };
import quay from '../content/built/levels/quay.json' with { type: 'json' };

validation.validateArtifact(artifact);
const canopyLevel = validation.loadLevelArtifact(canopy, artifact.prefabs);
test('both Wall decks seat the Canopy stop 90 cm over rail and extend into the isle', () => {
  for (const name of ['out', 'home']) {
    const deck = canopyLevel.placements.find((p) => p.id === 'canopy.platform-wall-' + name)!;
    assert.deepEqual(deck.scale, [4, 2.4, 40]);
    assert.equal(Math.round(100 * (deck.pos[1] + deck.scale![1] / 2)), 1390);
    assert.equal(Math.round(100 * (deck.pos[1] - deck.scale![1] / 2)), 1150);
  }
});
const bell = validation.loadLevelArtifact(bellRaw, artifact.prefabs),
  west = validation.loadLevelArtifact(westRaw, artifact.prefabs),
  gorge = validation.loadLevelArtifact(gorgeRaw, artifact.prefabs);
function report(level: unknown, definitions: unknown = artifact) {
  const source = fs.readFileSync('dev/level/route-leg2.ts', 'utf8');
  assert.ok(source.includes('if (import.meta.main)'));
  const checker = sourceModule<typeof import('../dev/level/route-leg2.ts')>(
    fs.readFileSync('dev/level/route-leg2.ts', 'utf8').replace('if (import.meta.main)', 'if (false)'),
    {
      fs: {
        readFileSync: (file: string) =>
          file === 'content/built/levels/bell.json'
            ? JSON.stringify(level)
            : file === 'content/built/levels/west.json'
              ? JSON.stringify(west)
              : file === 'content/built/levels/gorge.json'
                ? JSON.stringify(gorge)
                : fs.readFileSync(file, 'utf8'),
      },
      H,
      inside,
      layout,
      parseMapPage,
      ORIGIN,
      WORLD_LINES,
      ...route,
      artifact: definitions,
      ...validation,
      flood,
      MOVER,
      Matrix4,
      Vector3,
      ...placed,
    },
  );
  return checker.checkLeg2();
}

test('the current route passes the level checker', () => {
  const { failures, entries } = report(bell);
  assert.equal(
    failures,
    0,
    entries
      .filter((entry) => entry.kind === 'assertion' && !entry.passed)
      .map((entry) => entry.message)
      .join('\n'),
  );
});
// A zero-failure count cannot see a check that stopped running or lost a target. The approved report pins which checks
// and facts run and what each reaches. Only the numbers in each message are masked: a retune that changes numbers alone
// passes, but one that changes a message's wording fails even with zero failures (a 0.25 to 1 m sideways move of
// bell.rock changes which optional clauses appear in seven messages).
test('the level checker still runs every approved check and fact', () => {
  const shape = (entries: readonly { kind: string; message: string }[]) =>
    entries.map((entry) => `${entry.kind}: ${entry.message.replace(/-?\d+(?:\.\d+)?/g, '#')}`);
  const approved = JSON.parse(fs.readFileSync('test/fixtures/prefab-leg2-report.json', 'utf8'));
  assert.deepEqual(shape(report(bell).entries), shape(approved.entries));
});
for (const mutation of ['height', 'lower', 'rotate', 'scale'] as const)
  test(`${mutation} change to the placed Bell Rock fails rim coverage`, () => {
    const changed = { ...structuredClone(bell), placements: structuredClone([...bell.placements]) };
    const rock = changed.placements.find((p) => p.id === 'bell.rock')!;
    if (mutation === 'height') rock.pos = [rock.pos[0], rock.pos[1] + 20, rock.pos[2]];
    else if (mutation === 'lower') rock.pos = [rock.pos[0], rock.pos[1] - 1, rock.pos[2]];
    else if (mutation === 'rotate') rock.rot = [Math.PI / 2, 0, 0];
    else rock.scale = [0.5, 1, 0.5];
    const result = report(changed);
    assert.ok(result.failures > 0, `${mutation}: misaligned runtime rim bodies cannot pass the checker`);
    assert.ok(
      result.entries.some((e) => e.kind === 'assertion' && !e.passed && /widest unsolid rim/.test(e.message)),
      `${mutation}: name the rim`,
    );
  });

test('Gorge clearance uses placed box dimensions; the unstaked West landing has its platform bodies', () => {
  const definitions = structuredClone(artifact);
  definitions.prefabs['greybox.box'].colliders[0]!.half[0] = 5;
  const result = report(bell, definitions);
  assert.ok(result.entries.some((e) => e.kind === 'assertion' && !e.passed && e.message.includes('incline-n')));
  // Greybox leg 2's rules unstake it (docs/plans/greybox-leg2.md, step 2): the bed, both platforms and the apron.
  assert.ok(west.placements.some((p) => p.prefab === 'greybox.box' || p.prefab === 'greybox.collider'));
});

test('pad clearance follows the placed scale', () => {
  const changed = { ...structuredClone(bell), placements: structuredClone([...bell.placements]) };
  changed.placements.find((p) => p.id === 'bell.pad-gorge')!.scale = [20, 1, 1];
  assert.ok(
    report(changed).entries.some((e) => e.kind === 'assertion' && !e.passed && e.message.includes('pad-gorge')),
  );
});

test('placed box geometry composes instance TRS, collider offset, rotation and half extents', () => {
  const box: PrefabDef = {
    key: 'test.box',
    scope: 'place',
    visual: { none: true },
    colliders: [{ shape: 'box', at: [1, 0, 0], rot: [Math.PI / 2, 0, 0], half: [1, 2, 3] }],
  };
  const frame: PrefabDef = { key: 'test.frame', scope: 'place', visual: { none: true }, colliders: [] };
  const level: LevelArtifact = {
    ...metadata,
    format: 'boogle-level',
    place: 'test',
    placements: [
      { id: 'frame', prefab: frame.key, pos: [5, 0, 0] },
      { id: 'box', prefab: box.key, pos: [15, 20, 30], rot: [Math.PI / 2, 0, 0], scale: [2, 2, 2] },
    ],
  };
  const { colliders } = placed.resolvePlacedColliders(level, { [box.key]: box, [frame.key]: frame });
  const volume = colliders[0]!.volume;
  assert.ok(volume.centre.distanceTo(new Vector3(15, 20, 28)) < 1e-9);
  assert.equal(placed.heightAt(volume.triangles, { x: 15, z: 28 }), 24);
  assert.equal(placed.heightAt(volume.triangles, { x: 18, z: 28 }), null);
  level.placements[1]!.parent = 'frame';
  assert.throws(() => placed.resolvePlacedColliders(level, { [box.key]: box, [frame.key]: frame }), /parented greybox/);
});

for (const mutation of ['remove', 'move'] as const)
  test(`raw authored artifact: ${mutation} rock fails rim coverage`, () => {
    const changed = structuredClone(bellRaw);
    if (mutation === 'remove') changed.layout.data.extras = [];
    else changed.layout.data.extras[0]!.pos[0] = 1000;
    const result = report(changed);
    assert.ok(result.failures > 0);
    assert.ok(result.entries.some((e) => e.kind === 'assertion' && !e.passed && /widest unsolid rim/.test(e.message)));
  });

test('review (greybox leg 2 step 4): no standable surface under a leg 2 deck leaves a body less than its height', async () => {
  // A lay makes route-greybox/leg-view.ts solidDeck's slabs solid at once (land.ts slab: 0.4 m thick, top at rail
  // height, 7.6 m wide), with no hold for a body inside them (only the standing pieces wait: leg-view.ts inBox). So
  // under every metre of each new line's deck, the highest level surface (an upward face of a compiled collider) must
  // either sit within a sphere's radius under the rail, so the deck only lifts a body standing there, or leave a whole body (two
  // PLAYER_R spheres HEAD_OFFSET apart) under the slab. Open sea is not a level surface. The incline's bore floor, open
  // before the first lay, failed this (0.4 to 1.1 m under the slab) until its unlaid bed filled it.
  const { rowWorld, rowY } = await import('../src/entities/railway/row-path.ts');
  const { PLAYER_R, HEAD_OFFSET } = await import('../src/constants.ts');
  const body = 2 * PLAYER_R + HEAD_OFFSET,
    SLAB = 0.4,
    // A body overlapped from below by less than a sphere's radius has its centre over the slab: the deck lifts it.
    STEP_UP = PLAYER_R;
  // A collider's top faces: its near-level triangles above its centre.
  const up = (level: LevelArtifact) =>
    placed
      .resolvePlacedColliders(level, artifact.prefabs as unknown as Readonly<Record<string, PrefabDef>>)
      .colliders.flatMap(({ volume }) =>
        volume.triangles.filter((t) => {
          const n = new Vector3().subVectors(t.b, t.a).cross(new Vector3().subVectors(t.c, t.a)).normalize();
          return Math.abs(n.y) > 0.5 && (t.a.y + t.b.y + t.c.y) / 3 > volume.centre.y;
        }),
      );
  const floors = [gorge, bell, west].flatMap(up);
  const bad: string[] = [];
  for (const [line, from, to] of [
    [route.ROW_LINE.ns, 16, 1172],
    [route.ROW_LINE.bay, 0.5, 1229],
  ] as const)
    for (let s = from; s <= to; s += 1)
      for (let lat = -3.6; lat <= 3.6 + 1e-9; lat += 0.6) {
        const p = rowWorld(line, s, lat, { x: 0, z: 0 }),
          rail = rowY(line, s),
          top = placed.heightAt(floors, p, rail);
        if (top === null || rail - top <= STEP_UP || rail - SLAB - top >= body) continue;
        bad.push(`line ${line} s ${s} lat ${lat.toFixed(1)}: surface ${top.toFixed(2)} m, rail ${rail.toFixed(2)} m`);
      }
  assert.equal(bad.length, 0, `${bad.length} spots, first: ${bad.slice(0, 3).join('; ')}`);
});

// Greybox leg 3, step 6's reviews (Astra, on 87d7edf12, 033182dbb and b5e0f7f49): a laid deck's slabs that switch on
// where a body stands lift it onto their top when it fits there, or wait, the set of them, neither solid nor drawn,
// until it is clear; never a push sideways (src/place/clearance.ts with the engine's real Rapier overlap query, the
// orchestrator's calls of 24 November). An area's mount is an ordinary static mount, far from anyone (580 m for Canopy,
// which covers every solid of it and counts them all). A row line's departure boards list only halts where a train
// stops. Each runs the view's own source.
const physics = await import('../src/physics/engine.ts');
const liftOrWait = createLiftOrWait(physics.capsuleOverlaps);

// The shared helper itself (src/place/clearance.ts with the engine's real Rapier query), for every owner that switches
// solids on near players (rule 67; build skill step 9): lift straight up or wait as one set, undrawn, until clear;
// never sideways, never switched off. Here beside its first user's cases rather than in a file of its own (test diet).

class Vec {
  x: number;
  y: number;
  z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}
/** A body standing with its feet (the bottom sphere's lowest point) at `feet`, far from anything else built. */
const bodyAt = (x: number, feet: number, z: number) => ({
  position: new Vec(x, feet + PLAYER_R, z),
  velocity: new Vec(0, -3, 0),
  interpolatedPosition: new Vec(x, feet + PLAYER_R, z),
});
const box = (x: number, top: number, z: number, hx = 2, hy = 1, hz = 2): Shape => ({
  kind: 'box',
  hx,
  hy,
  hz,
  offset: { x, y: top - hy, z },
});
/** A closed six-sided prism, a trimesh as the kits' rocks are: from (x0, z0) to (x1, z1), from y0 up to y1. */
function prism(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): Shape {
  const v = [x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1, x0, y1, z0, x1, y1, z0, x1, y1, z1, x0, y1, z1];
  // Outward-facing triangles (counter-clockwise seen from outside).
  const f = [
    0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0,
  ];
  return { kind: 'trimesh', vertices: v, indices: f };
}
/** Solids that record when they switch on (solid and drawn together): `on` is the only switch there is. */
function solids(...shapes: Shape[][]) {
  const switched: number[] = [];
  const list: (Solid & { i: number })[] = shapes.map((s, i) => ({ i, shapes: s, on: () => switched.push(i) }));
  return { list, switched };
}
/** A static roof built in the world, for headroom; removed after. */
function built(shape: Shape) {
  const body = physics.createBody({ type: 'static', shapes: [shape] });
  physics.addBody(body);
  return () => physics.removeBody(body);
}
const asBody = (b: ReturnType<typeof bodyAt>) => b as unknown as Body;

// Capture the first call before the async WASM load finishes. All later tests use the ready engine.
const coldSolids = solids([box(1950, 3, 1000)]);
const cold = liftOrWait(coldSolids.list, bodyAt(1950, 0, 1000), { lift: false });
await physics.physicsReady;

test('a mount during physics startup keeps an occupied solid off', () => {
  assert.deepEqual(coldSolids.switched, []);
  assert.equal(cold.retry(bodyAt(1950, 0, 1000)), true);
  assert.equal(cold.retry(bodyAt(1970, 0, 1000)), false);
  assert.deepEqual(coldSolids.switched, [0]);
});

test('feet within a step of the top: lifted straight up onto it, and the solid switches on', () => {
  const b = bodyAt(1000, 0, 1000);
  const { list, switched } = solids([box(1000, 0.2, 1000)]);
  const c = liftOrWait(list, asBody(b), { lift: true });
  assert.equal(c.kind, 'lifted');
  assert.deepEqual(switched, [0]);
  assert.ok(Math.abs(b.position.y - (0.2 + PLAYER_R)) < 0.005, `stands at ${b.position.y}`);
  assert.equal(b.interpolatedPosition.y, b.position.y);
  assert.deepEqual([b.position.x, b.position.z], [1000, 1000], 'moved sideways');
  assert.equal(b.velocity.y, 0);
});

test('a trimesh prism lifts too, and a body wholly inside a tall one waits', () => {
  const low = bodyAt(1100, 0, 1000);
  const step = solids([prism(1098, 998, 1102, 1002, -1, 0.25)]);
  assert.equal(liftOrWait(step.list, asBody(low), { lift: true }).kind, 'lifted');
  assert.ok(Math.abs(low.position.y - (0.25 + PLAYER_R)) < 0.005);
  const inside = bodyAt(1100, 0, 1010);
  const tall = solids([prism(1095, 1005, 1105, 1015, -2, 5)]);
  const c = liftOrWait(tall.list, asBody(inside), { lift: true });
  assert.equal(c.kind, 'wait');
  assert.deepEqual(tall.switched, [], 'a waiting solid is neither solid nor drawn');
  assert.equal(inside.position.y, PLAYER_R);
});

test('a lift into a roof waits instead, the body unmoved', () => {
  const b = bodyAt(1200, 0, 1000);
  // The roof's underside is 0.1 m over the head now: clear where it stands, not where it would stand on the slab.
  const head = PLAYER_R + HEAD_OFFSET + PLAYER_R;
  const remove = built(box(1200, head + 0.1 + 0.5, 1000, 2, 0.25, 2));
  try {
    const { list, switched } = solids([box(1200, 0.2, 1000)]);
    const c = liftOrWait(list, asBody(b), { lift: true });
    assert.equal(c.kind, 'wait');
    assert.deepEqual(switched, []);
    assert.equal(b.position.y, PLAYER_R);
    assert.equal(c.waiting.length, 1);
  } finally {
    remove();
  }
});

test('the step is STEP exactly: a top 0.29 m over the feet lifts, 0.31 m waits', () => {
  const under = bodyAt(1250, 0, 1000);
  assert.equal(liftOrWait(solids([box(1250, STEP - 0.01, 1000)]).list, asBody(under), { lift: true }).kind, 'lifted');
  const over = bodyAt(1250, 0, 1010);
  assert.equal(liftOrWait(solids([box(1250, STEP + 0.01, 1010)]).list, asBody(over), { lift: true }).kind, 'wait');
  assert.equal(over.position.y, PLAYER_R);
});

test('a top more than a step over the feet waits; lift: false (a mount) only ever waits', () => {
  const high = bodyAt(1300, 0, 1000);
  const tall = solids([box(1300, STEP + 0.1, 1000)]);
  assert.equal(liftOrWait(tall.list, asBody(high), { lift: true }).kind, 'wait');
  assert.equal(high.position.y, PLAYER_R);
  const mount = bodyAt(1300, 0, 1010);
  const low = solids([box(1300, 0.1, 1010)]);
  assert.equal(liftOrWait(low.list, asBody(mount), { lift: false }).kind, 'wait');
  assert.equal(mount.position.y, PLAYER_R);
  assert.deepEqual(low.switched, []);
});

test('an overhang that holds only the head waits: nobody is lifted to where there is no ground under them', () => {
  const b = bodyAt(1350, 0, 1000);
  const overhang = solids([box(1350, PLAYER_R + HEAD_OFFSET + 0.3, 1000, 2, 0.2, 2)]);
  assert.equal(liftOrWait(overhang.list, asBody(b), { lift: true }).kind, 'wait');
  assert.equal(b.position.y, PLAYER_R);
});

test('two overlapping solids wait as one set; a partial exit keeps both off; clear of both, both come back together', () => {
  const b = bodyAt(1400, 0, 1000);
  // A and B overlap around x = 1400; each is too tall to be lifted onto.
  const { list, switched } = solids(
    [box(1399, 2, 1000, 1.5, 3, 2)],
    [box(1401, 2, 1000, 1.5, 3, 2)],
    [box(1450, 0.1, 1000)],
  );
  const c = liftOrWait(list, asBody(b), { lift: true });
  assert.equal(c.kind, 'wait');
  assert.deepEqual(switched, [2], 'the solid that holds nobody switches on at once');
  assert.deepEqual(
    c.waiting.map((s) => s.i),
    [0, 1],
  );
  b.position.set(1402, PLAYER_R, 1000); // out of A, still in B
  assert.equal(c.retry(asBody(b)), true);
  assert.deepEqual(switched, [2], 'A switched on while the body was still in B');
  b.position.set(1398, PLAYER_R, 1000); // back in A: still one set
  assert.equal(c.retry(asBody(b)), true);
  assert.deepEqual(switched, [2]);
  b.position.set(1420, PLAYER_R, 1000);
  assert.equal(c.retry(asBody(b)), false);
  assert.deepEqual(switched, [2, 0, 1], 'both return in the same retry');
  assert.deepEqual([b.position.x, b.position.z], [1420, 1000], 'the helper never moves a body sideways');
});

test('never sideways: a body grazing a tall solid from beside it waits where it is', () => {
  const b = bodyAt(1500, 0, 1000);
  const side = solids([box(1500 + PLAYER_R + 1.9, 3, 1000)]); // 0.1 m into its side face
  const c = liftOrWait(side.list, asBody(b), { lift: true });
  assert.equal(c.kind, 'wait');
  assert.deepEqual([b.position.x, b.position.y, b.position.z], [1500, PLAYER_R, 1000]);
});

test('resting on a top is not in it; once on, a landing or contact never switches a solid off', () => {
  const b = bodyAt(1600, 0.5, 1000); // feet on the box's top, within the solver's contact sink
  b.position.y -= 0.005;
  const { list, switched } = solids([box(1600, 0.5, 1000)]);
  const c = liftOrWait(list, asBody(b), { lift: true });
  assert.equal(c.kind, 'clear');
  assert.deepEqual(switched, [0]);
  b.position.set(1600, 0, 1000); // sunk into it (a hard landing): nothing waits, nothing is switched again
  assert.equal(c.retry(asBody(b)), false);
  assert.deepEqual(switched, [0]);
  assert.equal(c.waiting.length, 0);
  assert.equal(b.position.y, 0);
});

test('a retried set lifts the body once its feet come within a step of the top', () => {
  const b = bodyAt(1700, -1, 1000);
  const { list, switched } = solids([box(1700, 0.2, 1000)]);
  const c = liftOrWait(list, asBody(b), { lift: true });
  assert.equal(c.kind, 'wait');
  b.position.set(1700, PLAYER_R, 1000);
  assert.equal(c.retry(asBody(b)), false);
  assert.deepEqual(switched, [0]);
  assert.ok(Math.abs(b.position.y - (0.2 + PLAYER_R)) < 0.005);
});

test('no body: everything switches on', () => {
  const { list, switched } = solids([box(1800, 0.2, 1000)], [box(1810, 3, 1000)]);
  assert.equal(liftOrWait(list, null, { lift: true }).kind, 'clear');
  assert.deepEqual(switched, [0, 1]);
});

test('a level step exactly 0.30 m above the feet lifts', () => {
  const b = bodyAt(2000, 0, 1000);
  assert.equal(liftOrWait(solids([box(2000, STEP, 1000)]).list, b, { lift: true }).kind, 'lifted');
});

test('grazing the edge of a yawed 0.40 m step cannot lift onto empty space', () => {
  const yaw = Math.PI / 4;
  const edge = box(2100, 0.4, 1000, 2, 1, 4);
  edge.rotation = { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) };
  // Feet are 0.35 m outside its local +x edge. A sphere grazes the corner, but no top lies below the feet.
  const b = bodyAt(2100 + 2.35 * Math.cos(yaw), 0, 1000 - 2.35 * Math.sin(yaw));
  const { list, switched } = solids([edge]);
  assert.equal(liftOrWait(list, b, { lift: true }).kind, 'wait');
  assert.equal(b.position.y, PLAYER_R);
  assert.deepEqual(switched, []);
});

test('the complete upper sphere must fit under an existing roof after a lift', () => {
  const b = bodyAt(2200, 0, 1000);
  const headAfterLift = 2 * PLAYER_R + HEAD_OFFSET + 0.2;
  const remove = built(box(2200, headAfterLift - 0.015 + 0.2, 1000, 2, 0.1, 2));
  try {
    assert.equal(liftOrWait(solids([box(2200, 0.2, 1000)]).list, b, { lift: true }).kind, 'wait');
    assert.equal(b.position.y, PLAYER_R);
  } finally {
    remove();
  }
});

test('a roof mounted this frame blocks the lift before the next physics step', () => {
  const head = 2 * PLAYER_R + HEAD_OFFSET;
  const roof = physics.createBody({ type: 'static', shapes: [box(2300, head + 0.3, 1000, 2, 0.1, 2)] });
  physics.addBody(roof);
  try {
    const b = bodyAt(2300, 0, 1000);
    assert.equal(liftOrWait(solids([box(2300, 0.2, 1000)]).list, b, { lift: true }).kind, 'wait');
    assert.equal(b.position.y, PLAYER_R);
  } finally {
    physics.removeBody(roof);
  }
});

test('mounting a closed prism preserves the interior used for clearance', () => {
  const shape = prism(2395, 995, 2405, 1005, -3, 5);
  const p = bodyAt(2400, 0, 1000).position;
  const remove = built(shape);
  try {
    assert.equal(physics.capsuleOverlaps(p, PLAYER_R, HEAD_OFFSET, shape), true);
    assert.equal(physics.capsuleOverlaps(p, PLAYER_R, HEAD_OFFSET, { of: { position: p } }), true);
  } finally {
    remove();
  }
});

test('open land below its top holds a body only within the land footprint', () => {
  const land: Shape = {
    kind: 'trimesh',
    vertices: [2500, 5, 1000, 2510, 5, 1000, 2510, 5, 1010, 2500, 5, 1010],
    indices: [0, 2, 1, 0, 3, 2],
  };
  const inside = bodyAt(2505, 0, 1005);
  const { list, switched } = solids([land]);
  const clearing = liftOrWait(list, inside, { lift: false });
  assert.equal(clearing.kind, 'wait');
  assert.equal(clearing.retry(bodyAt(2525, 0, 1005)), false);
  assert.deepEqual(switched, [0]);
});

test('a reused shape at a new placement tests its current pose', () => {
  const door = box(2600, 3, 1000);
  const p = bodyAt(2600, 0, 1000).position;
  assert.equal(physics.capsuleOverlaps(p, PLAYER_R, HEAD_OFFSET, door), true);
  door.offset!.x += 10;
  assert.equal(physics.capsuleOverlaps(p, PLAYER_R, HEAD_OFFSET, door), false);
});

test('re-check: a cave-group roof the surface body never touches does not block its lift', () => {
  // The solver pairs groups both ways; the world query takes every group (mask -1), so a collider only underground
  // bodies meet (CAVE_GROUP: SURFACE_MASK leaves it out) turns a lift into a wait.
  const head = 2 * PLAYER_R + HEAD_OFFSET;
  const roof = physics.createBody({
    type: 'static',
    group: CAVE_GROUP,
    shapes: [box(3000, head + 0.3, 1000, 2, 0.1, 2)],
  });
  // A surface player's body, as src/pois/caves sets it: every group but the caves'.
  const player = physics.createBody({
    type: physics.BODY.DYNAMIC,
    mass: 1,
    mask: ~CAVE_GROUP,
    position: { x: 3000, y: PLAYER_R, z: 1000 },
    shapes: [{ kind: 'sphere', r: PLAYER_R }],
  });
  physics.addBody(roof);
  physics.addBody(player);
  try {
    assert.equal(liftOrWait(solids([box(3000, 0.2, 1000)]).list, player, { lift: true }).kind, 'lifted');
  } finally {
    physics.removeBody(roof);
    physics.removeBody(player);
  }
});

test('re-check: a kinematic body is not in its own way when lifted', () => {
  // Yours is kinematic in guest play (src/guest/play.ts); the world query then counts your own capsule.
  const b = physics.createBody({
    type: physics.BODY.KINEMATIC,
    mass: 0,
    position: { x: 3100, y: PLAYER_R, z: 1000 },
    shapes: [
      { kind: 'sphere', r: PLAYER_R },
      { kind: 'sphere', r: PLAYER_R, offset: { x: 0, y: HEAD_OFFSET, z: 0 } },
    ],
  });
  physics.addBody(b);
  try {
    assert.equal(liftOrWait(solids([box(3100, 0.2, 1000)]).list, b, { lift: true }).kind, 'lifted');
  } finally {
    physics.removeBody(b);
  }
});

test('re-check: a body sunk into a heightfield overlaps it, built or not', () => {
  // engine.ts: every static body, by the same test. A heightfield answers false even through its surface.
  const heights = [
    [5, 5, 5],
    [5, 5, 5],
    [5, 5, 5],
  ];
  const at = { x: 3310, y: 4.8, z: 990 }; // bottom sphere 0.65 m under the 5 m surface, inside the footprint
  const body = physics.createBody({
    type: 'static',
    position: { x: 3300, y: 0, z: 1000 },
    shapes: [{ kind: 'heightfield', heights, cell: 10 }],
  });
  physics.addBody(body);
  try {
    assert.equal(physics.capsuleOverlaps(at, PLAYER_R, 0, { of: { position: at } }), true, 'built');
    assert.equal(
      physics.capsuleOverlaps({ x: 10, y: 4.8, z: -10 }, PLAYER_R, 0, { kind: 'heightfield', heights, cell: 10 }),
      true,
      'unbuilt',
    );
  } finally {
    physics.removeBody(body);
  }
});

const flatField = (height: number): Shape => ({
  kind: 'heightfield',
  heights: [
    [height, height],
    [height, height],
  ],
  cell: 2,
});

test('final review: the capsule side intersects a terrain edge halfway between feet and waist', () => {
  // The flat edge at x=0, y=0.2 crosses the cylinder by 3 cm. Each sample centre is over a radius away.
  assert.equal(physics.capsuleOverlaps({ x: -0.42, y: 0, z: -1 }, PLAYER_R, HEAD_OFFSET, flatField(0.2)), true);
});

test('final review: resting exactly on flat terrain is clear', () => {
  assert.equal(physics.capsuleOverlaps({ x: 1, y: 5 + PLAYER_R, z: -1 }, PLAYER_R, HEAD_OFFSET, flatField(5)), false);
});

// A body wholly under a heightfield is not tested: a lift starts from where the solver already holds the body.

test('a body in the open gap below a rotated heightfield lip is clear', () => {
  // The two strips meet at (4,0). After a 45-degree roll their planes are y=x-4 and y=3*(4-x).
  // At x=2.5 the bottom sphere is 1.77 m above the floor and the top sphere 0.85 m below the lip,
  // measured along the normals. Both clear the 0.45 m radius, but a world-up ray hits the lip.
  const shape: Shape = {
    kind: 'heightfield',
    heights: [
      [0, 0],
      [0, 0],
      [8, 8],
    ],
    cell: 4,
    rotation: { x: 0, y: 0, z: Math.sin(Math.PI / 8), w: Math.cos(Math.PI / 8) },
  };
  assert.equal(physics.capsuleOverlaps({ x: 2.5, y: 1, z: -2 }, PLAYER_R, HEAD_OFFSET, shape), false);
});

// Back to leg 3's lays.
/** Whether a body standing at `p` is in solid `s`, as the helper measures it (resting on a top is not). */
const holds = (s: Shape, p: { x: number; y: number; z: number }) =>
  physics.capsuleOverlaps(p, PLAYER_R - 0.02, HEAD_OFFSET, s);
/** Your body at `position`, as the views read it (me.body). */
const bodyOf = (position: THREE.Vector3) => ({ position, velocity: new THREE.Vector3() });
/** A greybox box (yaw, then pitch about its x) as the physics shape its collider is. */
function boxShape(b: {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  yaw: number;
  pitch?: number;
}) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-(b.pitch ?? 0), b.yaw, 0, 'YXZ'));
  return {
    kind: 'box',
    hx: b.w / 2,
    hy: b.h / 2,
    hz: b.d / 2,
    offset: { x: b.x, y: b.y, z: b.z },
    rotation: { x: q.x, y: q.y, z: q.z, w: q.w },
  } satisfies Shape;
}
/** The greybox levels' solids (High Gorge's, leg 2's and leg 3's) built in the world once, as they stand when a lay
 * happens near them: what a lifted body must also have room in. */
let scenery = false;
function buildScenery() {
  if (scenery) return;
  scenery = true;
  for (const raw of [gorgeRaw, bellRaw, canopy, westRaw])
    physics.addBody(physics.createBody({ type: 'static', shapes: ground(raw).map(shapeOf) }));
}
/** A resolved collider as the physics shape its prefab's instance makes (a box from its axes, a trimesh as is). */
function shapeOf(c: ReturnType<typeof ground>[number]): Shape {
  const v = c.volume;
  if (c.definition.shape === 'box') {
    const [x, y, z] = v.edges,
      q = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(x!.clone().normalize(), y!.clone().normalize(), z!.clone().normalize()),
      );
    return {
      kind: 'box',
      hx: x!.length(),
      hy: y!.length(),
      hz: z!.length(),
      offset: { x: v.centre.x, y: v.centre.y, z: v.centre.z },
      rotation: { x: q.x, y: q.y, z: q.z, w: q.w },
    };
  }
  const vertices = v.triangles.flatMap((t) => [t.a, t.b, t.c].flatMap((p) => [p.x, p.y, p.z]));
  return { kind: 'trimesh', vertices, indices: vertices.map((_v, i) => i).slice(0, vertices.length / 3) };
}
const ground = (value: unknown) =>
  placed.resolvePlacedColliders(
    validation.loadLevelArtifact(value, artifact.prefabs as unknown as Readonly<Record<string, PrefabDef>>),
    artifact.prefabs as unknown as Readonly<Record<string, PrefabDef>>,
  ).colliders;

test('the quay planks carry both tracks at rail height beyond the temporary buffers', () => {
  const planks = ground(quay)
    .filter((c) => c.placement.id.startsWith('quay.foot-plank-'))
    .flatMap((c) => c.volume.triangles);
  const wall = route.RAIL_LEGS.find((leg) => leg.id === 'wall')!;
  for (const lateral of [-600, -200, 0, 200, 600]) {
    const p = route.rowSide('cave', wall.fromCm + 2900, lateral, 0, 0);
    assert.equal(placed.heightAt(planks, { x: p.x / 100, z: p.z / 100 }), p.y / 100);
  }
});

test('the West landing supports the cave frame and rack at their catalog heights', () => {
  const cave = route.RAIL_LEGS.find((leg) => leg.id === 'cave')!;
  const floors = ground(westRaw).flatMap((c) => c.volume.triangles);
  for (const p of [route.legFrame(cave, 0), route.legRack(cave, 0)]) {
    const height = placed.heightAt(floors, { x: p.x / 100, z: p.z / 100 });
    assert.ok(height !== null && Math.abs(height - p.y / 100) < 0.01);
  }
});

// Run the view's actual draw and solid transitions, recording the sign and physics boundaries.
async function reachedView(s = 1300, lat = 0, canopyLaid = 3, stackLayAt?: THREE.Vector3, wallLaid = 6) {
  const p = row.rowWorld(route.ROW_LINE.bay, s, lat, { x: 0, z: 0 });
  const floor = placed.heightAt(
    ground(bellRaw).flatMap((c) => c.volume.triangles),
    p,
  );
  assert.ok(floor !== null);
  const position = stackLayAt ?? new THREE.Vector3(p.x, floor + PLAYER_R, p.z);
  const signs = new Map<THREE.Group, string[]>();
  const peerPosition = new THREE.Vector3(5000, 50, 5000);
  const overlaps: number[] = [];
  const drawnDeck: Shape[] = [];
  const barrierPanels: { x: number; z: number }[] = [];
  const pieces: { volume: placed.Volume }[] = [];
  const addStatic = (b: { hx: number; hy: number; hz: number }, p: THREE.Vector3, q: THREE.Quaternion) => {
    const m = new Matrix4().compose(new Vector3(p.x, p.y, p.z), q, new Vector3(1, 1, 1));
    const piece = { volume: placed.boxVolume(m, [b.hx, b.hy, b.hz]) };
    pieces.push(piece);
    return piece;
  };
  let slabsEnabled = 0;
  const slab = (ax: number, az: number, bx: number, bz: number, ya: number, yb: number, width: number) => {
    slabsEnabled++;
    const dx = bx - ax,
      dz = bz - az,
      run = Math.hypot(dx, dz);
    const t = ((position.x - ax) * dx + (position.z - az) * dz) / (run * run);
    if (t < 0 || t > 1 || Math.abs((position.x - ax) * dz - (position.z - az) * dx) / run > width / 2) return {};
    const rail = ya + (yb - ya) * t;
    if (position.y - PLAYER_R < rail && position.y + HEAD_OFFSET + PLAYER_R > rail - 0.4) overlaps.push(rail);
    return {};
  };
  const { leg2Massing } = sourceModule<typeof import('../src/entities/route-greybox/leg2-draw.ts')>(
    fs.readFileSync('src/entities/route-greybox/leg2-draw.ts', 'utf8'),
    { records: artifact, loadLevelArtifact: validation.loadLevelArtifact, LEG2_TEXT },
  );
  const source = fs
    .readFileSync('src/entities/route-greybox/leg-view.ts', 'utf8')
    .replace(/await Promise\.all\(\s*\[[\s\S]*?\],?\s*\)/, 'dependencies');
  type View = { update(): void };
  const { createLegView } = sourceModule<{ createLegView: (adapter: unknown, owner: unknown) => Promise<View> }>(
    source,
    {
      THREE,
      ...route,
      ...lines,
      ...rows,
      ...progress,
      ...(await import('../src/sim/railway-queries-room.ts')),
      ...(await import('../src/entities/railway/works-lines.ts')),
      worksFace: () => new THREE.Group(),
      createSignalAnswers() {},
      createGorgeTownPlots: () => ({ targets: [], update() {} }),
      createCanopyTownPlots: () => ({ targets: [], update() {} }),
      ...gorgeLayout,
      ...junctions,
      ...path,
      ...stackHalts,
      ...row,
      KIT,
      TRAIN_PHASE,
      RING_S_HEAD,
      joinedCaveStop,
      lapSlots,
      AREA_CENTRES,
      trainStops: (_world: unknown, line: number) =>
        trainStopsOf(
          line,
          true,
          { joined: true, head: 2 },
          route.RAIL_LEGS.map((l) => l.sections.length),
        ),
      canopyGround: isleGround,
      gorgePlacements: gorge.placements,
      bellMassing: () => leg2Massing(bellRaw),
      canopyMassing: () => leg2Massing(canopy),
      westMassing: () => leg2Massing(westRaw),
      legKitFlight: route.RAIL_LEGS.map(() => ({ logs: 0, rails: 0 })),
      legYardFlight: { logs: 0, rails: 0 },
      bellPads: [],
      areaLabels: new Map(),
      areaBoardVisibility: new Map(),
      ringIslandNear: { mounted: false },
      me: { body: bodyOf(position) },
      camera: { position },
      dependencies: [
        { slab, addStatic },
        { onIsland: () => false },
        { outOf: sourceFunction('src/place/sites.ts', 'outOf', {}) },
      ],
      liftOrWait,
      frameOccupied: (frame: { holds(p: THREE.Vector3): boolean }) =>
        frame.holds(position) || frame.holds(peerPosition),
      signBoard: () => ({ mesh: new THREE.Group() }),
      paintPlate: (s: { mesh: THREE.Group }, entries: { t: string }[]) =>
        signs.set(
          s.mesh,
          entries.map((l) => l.t),
        ),
      createBoxBatch: () => ({
        mesh: new THREE.Group(),
        begin() {
          if (this.mesh.name === 'route-greybox:deck') drawnDeck.length = 0;
          if (this.mesh.name === 'route-greybox:things') barrierPanels.length = 0;
        },
        commit() {},
        box(x: number, y: number, z: number, w: number, h: number, d: number, colour: string, yaw: number, rx: number) {
          if (this.mesh.name === 'route-greybox:things' && colour === '#c8402c' && h === 1.6)
            barrierPanels.push({ x, z });
          if (this.mesh.name === 'route-greybox:deck' && colour === '#9c9ea1' && h === 0.5)
            drawnDeck.push(boxShape({ x, y, z, w, h, d, yaw, pitch: -rx }));
        },
        between() {},
      }),
      playObjective() {},
    },
  );
  buildScenery();
  const seed = buildSeedWorld('awake');
  for (const [i, leg] of route.RAIL_LEGS.entries())
    if (lines.legBuilt(i))
      seed.w.mut(Leg, progress.legId(seed.w, i))!.laid =
        leg.id === 'bell-canopy' ? canopyLaid : leg.id === 'wall' ? wallLaid : leg.sections.length;
  const firstLay = canopyLaid === 1;
  const leg = seed.w.mut(
    Leg,
    progress.legId(
      seed.w,
      route.RAIL_LEGS.findIndex((l) => l.id === 'bell-canopy'),
    ),
  )!;
  if (firstLay) leg.laid = 0;
  const stack = seed.w.mut(
    Leg,
    progress.legId(
      seed.w,
      route.RAIL_LEGS.findIndex((l) => l.id === 'stack'),
    ),
  )!;
  if (stackLayAt) stack.laid--;
  const view = await createLegView(
    { read: { whole: () => true, world: () => seed.w, tick: () => seed.t } },
    {
      animate() {},
      cleanup() {},
      removeBody(body: (typeof pieces)[number]) {
        const index = pieces.indexOf(body);
        if (index >= 0) pieces.splice(index, 1);
      },
    },
  );
  if (firstLay) {
    leg.laid = 1;
    view.update();
  }
  if (stackLayAt) {
    stack.laid++;
    view.update();
  }
  return {
    pieces,
    barrierPanels,
    peerPosition,
    setStackLaid(laid: number) {
      stack.laid = laid;
      view.update();
    },
    setWallLaid(laid: number) {
      seed.w.mut(Leg, progress.legId(seed.w, 5))!.laid = laid;
      view.update();
    },
    signs,
    overlaps,
    floor,
    position,
    drawnDeck,
    slabsEnabled: () => slabsEnabled,
    update: () => view.update(),
  };
}

test('a closing Stack west deck supports its last occupant until both players leave', async () => {
  const stop = lines.RAIL_LINES[lines.LINE2]!.halts[6]!.s / 100;
  const point = path.line2World(stop, stackHalts.STACK_WEST.lat, { x: 0, z: 0 });
  const deck = path.line2Y(stop) + stackHalts.STACK_WEST.up;
  const view = await reachedView();
  const floor = () =>
    placed.heightAt(
      view.pieces.flatMap((piece) => piece.volume.triangles),
      point,
    );
  view.setStackLaid(1);
  const absent = floor();
  view.setStackLaid(2);
  assert.ok(Math.abs(floor()! - deck) < 0.01);
  view.position.set(point.x, deck + PLAYER_R, point.z);
  view.peerPosition.copy(view.position);
  view.setStackLaid(3);
  view.position.x += 50;
  view.update();
  assert.ok(Math.abs(floor()! - deck) < 0.01);
  view.peerPosition.x += 50;
  view.update();
  assert.equal(floor(), absent);
});

test('a swimmer can reach each temporary Wall head from open water', async () => {
  const leg = route.RAIL_LEGS[5]!;
  for (const laid of [1, 2, 4, 5]) {
    const { pieces } = await reachedView(1300, 0, 3, undefined, laid);
    const stop = leg.sections[laid - 1]!.toCm / 100 - 10;
    const at = (lat: number) => row.rowWorld(leg.line, stop, lat, { x: 0, z: 0 });
    const grid = colliderFlood(pieces, at(0), 91);
    const wet = grid.reach(at(22), true);
    for (const side of [-5.8, 5.8]) {
      const platform = grid.node(at(side));
      assert.ok(Math.abs(grid.h[platform]! - row.rowY(leg.line, stop) - 0.9) < 0.02, 'the destination is a platform');
      assert.equal(wet[platform], 1, 'head ' + laid + ' platform ' + side);
    }
  }
});

test('closing Wall head one keeps the floor under a player still standing on its platform', async () => {
  const leg = route.RAIL_LEGS[5]!;
  const s = leg.sections[0]!.toCm / 100 - 10;
  const at = row.rowWorld(leg.line, s, 5.8, { x: 0, z: 0 });
  const top = row.rowY(leg.line, s) + 0.9;
  const view = await reachedView(1300, 0, 3, undefined, 2);
  view.position.set(at.x, top + PLAYER_R, at.z);
  const floor = (pieces = view.pieces) =>
    placed.heightAt(
      pieces.flatMap((p) => p.volume.triangles),
      at,
    );
  assert.ok(Math.abs(floor()! - top) < 0.01);
  view.setWallLaid(3);
  assert.ok(Math.abs(floor()! - top) < 0.01, 'head one removed the occupied platform over open water');
  view.setWallLaid(4);
  assert.ok(Math.abs(floor()! - top) < 0.01);
  view.peerPosition.copy(view.position);
  view.peerPosition.y += STEP - 0.01;
  view.position.x += 50;
  view.update();
  assert.ok(Math.abs(floor()! - top) < 0.01, 'a peer within a step still needs the platform');
  view.peerPosition.x += 50;
  view.update();
  assert.ok(floor() === null || Math.abs(floor()! - top) > 0.01, 'head one stayed after the player left');
  const fresh = await reachedView(1300, 0, 3, undefined, 4);
  assert.equal(floor(fresh.pieces), floor(), 'a fresh view rebuilt an already closed head');
});

test('the deep-span barrier first appears when the fifth Wall platform supports its frame', async () => {
  const frame = route.legFrame(route.RAIL_LEGS[5]!, 5);
  const view = await reachedView(1300, 0, 3, undefined, 2);
  view.position.set(frame.x / 100, 0, frame.z / 100);
  const panels = () => view.barrierPanels.filter((p) => Math.hypot(p.x - frame.x / 100, p.z - frame.z / 100) < 4);
  view.update();
  const before = panels().length;
  view.setWallLaid(5);
  assert.equal(panels().length, 1);
  assert.equal(before, 0, 'a shut barrier floats over the sea before the head exists');
});

test('the Canopy lay leaves a player standing on Bell Rock clear of the new deck', async () => {
  const { overlaps, floor } = await reachedView();
  assert.deepEqual(overlaps, [], `deck activated through a player on Bell Rock at height ${floor}`);
});

test('the completed bay line only advertises halts where a train can stop', async () => {
  const { signs } = await reachedView();
  const destinations = [...signs].filter(([mesh, text]) => mesh.visible && text.includes('Canopy Town'));
  assert.ok(destinations.length);
  const closed = lines.RAIL_LINES[route.ROW_LINE.bay]!.halts.find((h) => h.closesAt !== undefined)!;
  assert.ok(!destinations.some(([, text]) => text.includes(closed.name)), `advertises closed ${closed.name}`);
});

test('the first Canopy lay leaves a player on supported ground at the Bell Rock rim', async () => {
  const { position, floor } = await reachedView(1340, -2.25, 1);
  assert.equal(floor, 14);
  const groundAfter = placed.heightAt(
    ground(bellRaw).flatMap((c) => c.volume.triangles),
    position,
  );
  // At this point the new track is descending over the rock. Standing on the slab is also a safe exit.
  const onDeck =
    position.y > floor + PLAYER_R && Math.abs(position.y - (row.rowY(route.ROW_LINE.bay, 1340) + PLAYER_R)) < 0.1;
  assert.ok(groundAfter !== null || onDeck, `lay ejected the player over water at ${position.toArray()}`);
});

// Drive a cold residency update with camera and player together, as on arrival from the sea.
async function mountAt(position: THREE.Vector3) {
  let update: (() => void) | undefined;
  let describe: (() => Record<string, { solids: number }>) | undefined;
  const pending: Promise<void>[] = [];
  const on = new Set<string>(),
    shapes = new Map<string, Shape[]>();
  const colliders = [canopy, south, north, notch, original].flatMap(ground);
  const instantiate = (_key: string, placement: { id: string }) => {
    const mine = colliders.filter((c) => c.placement.id === placement.id);
    shapes.set(placement.id, mine.map(shapeOf));
    return {
      bodies: mine,
      solids: shapes.get(placement.id)!,
      setEnabled(enable: boolean) {
        if (enable) on.add(placement.id);
        else on.delete(placement.id);
      },
    };
  };
  /** The instances on now, and those of them that hold the body (none may, after any update). */
  const state = () => {
    const enabled = [...on];
    return {
      enabled,
      overlaps: enabled.filter((id) => shapes.get(id)!.some((x) => holds(x, position))),
    };
  };
  const standWhenClear = (shapes: readonly Shape[], on: () => void) =>
    liftOrWait([{ shapes, on }], bodyOf(position), { lift: true }).kind !== 'wait';
  const helpers = sourceModule<typeof import('../src/entities/route-greybox/leg2-draw.ts')>(
    fs.readFileSync('src/entities/route-greybox/leg2-draw.ts', 'utf8'),
    {
      massingClearance,
      standWhenClear,
      records: artifact,
      loadLevelArtifact: validation.loadLevelArtifact,
      LEG2_TEXT,
      areaLabels: new Map(),
      areaBoardVisibility: new Map(),
      instantiate,
    },
  );
  type Draw = typeof import('../src/entities/route-greybox/boxes.ts').drawGreyBoxes;
  const draw = sourceFunction<Draw>('src/entities/route-greybox/boxes.ts', 'drawGreyBoxes', {
    massingClearance,
    standWhenClear,
    compiled: artifact,
    gorgeSurfaces: () => new Map(),
    createPrefabBatch: () => ({
      mesh: new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 100),
    }),
    instantiate,
  });
  const area = (input: typeof south | typeof north | typeof notch | typeof original) => {
    const centre = AREA_CENTRES[input.place as keyof typeof AREA_CENTRES];
    return {
      id: input.place,
      centre,
      near: coverNear(helpers.leg2Placements(input), artifact.prefabs, centre),
      build: () => helpers.leg2Massing(input),
      baseExtras: (owner: Parameters<typeof helpers.leg2Extras>[0]) => helpers.leg2Extras(owner, input),
    };
  };
  sourceModule(fs.readFileSync('src/entities/route-greybox/index.ts', 'utf8'), {
    productionRailway: true,
    saltpanArea: { id: 'saltpan', centre: AREA_CENTRES.saltpan, build: () => [] },
    wallAreas: [south, north].map(area),
    notchAreas: [notch, original].map(area),
    quayArea: { id: 'quay', centre: AREA_CENTRES.quay, build: () => [] },
    location: { search: '' },
    AREA_CENTRES,
    resident,
    camera: { position },
    me: { body: { position } },
    defineKind() {},
    routeAreas: new Map(),
    returnArea: { platform: null },
    spawn: (entity: { update?: () => void; describe?: typeof describe }) => {
      if (entity.update) {
        update = entity.update;
        describe = entity.describe;
      }
      return entity;
    },
    createOwnedView: () => ({ root: new THREE.Group(), cleanup() {} }),
    MOUNT_NEAR: 400,
    FREE_MORE: 150,
    canopyNear: sourceFunction<typeof import('../src/entities/route-greybox/leg2-layout.ts').coverNear>(
      'src/entities/route-greybox/leg2-layout.ts',
      'coverNear',
      { MOUNT_NEAR: 400, ARRIVAL: 40 },
    )(helpers.leg2Placements(canopy), artifact.prefabs, AREA_CENTRES.canopy),
    canopyMassing: () => helpers.leg2Massing(canopy),
    canopyExtras: (owner: Parameters<typeof helpers.leg2Extras>[0]) => helpers.leg2Extras(owner, canopy),
    bellExtras() {},
    westExtras() {},
    bellMassing() {},
    westMassing() {},
    drawGreyBoxes: draw,
    precompile() {},
    routeSceneryMounted() {},
    background: (promise: Promise<void>) => pending.push(promise),
  });
  assert.ok(update);
  update();
  await Promise.all(pending);
  assert.ok(describe);
  const tick = update;
  return { ...state(), reports: describe(), report: describe().canopy, state, update: () => tick() };
}

for (const area of ['wall-north', 'wall-south'] as const)
  test(area + ' mounts two cliff colliders and no visible boxes', async () => {
    const { x, z } = AREA_CENTRES[area];
    const near = await mountAt(new THREE.Vector3(x, 2, z));
    assert.deepEqual(near.reports[area], { resident: true, boxes: 0, solids: 2 });
    const far = await mountAt(new THREE.Vector3(3000, 2, 3000));
    assert.deepEqual(far.reports[area], { resident: false });
  });

test('a swimmer arriving at the western beach finds its collider at the shoreline', async () => {
  const beach = ground(canopy).find((c) => c.placement.id === 'canopy.beach-27')!;
  const p = beach.volume.centre.clone();
  assert.ok((placed.heightAt(beach.volume.triangles, p) ?? -1) > 0);
  p.y = 0;
  assert.ok((await mountAt(p)).enabled.includes(beach.placement.id));
});

test('the Canopy residency report counts every mounted collider', async () => {
  const p = AREA_CENTRES.canopy;
  const { report } = await mountAt(new THREE.Vector3(p.x, 200, p.z));
  assert.equal(report?.solids, ground(canopy).length);
});

for (const id of ['wall-cn', 'wall-cs'] as const)
  test(`an incoming swimmer meets ${id}'s chalk wall before crossing its tip`, async () => {
    const c = AREA_CENTRES.canopy;
    const outer = landPoints(id).reduce((a, b) =>
      Math.hypot(a.x - c.x, a.z - c.z) > Math.hypot(b.x - c.x, b.z - c.z) ? a : b,
    );
    const [cx, cz] = CANOPY_CENTRES[id];
    const triangles = ground(canopy).flatMap((k) => k.volume.triangles);
    // Just inland of the outermost vertex the wall stands 120 m; just outside it, the sea, where the swimmer is.
    const inside = new THREE.Vector3(outer.x * 0.98 + cx * 0.02, 0, outer.z * 0.98 + cz * 0.02);
    assert.equal(placed.heightAt(triangles, inside), 120);
    const p = new THREE.Vector3(outer.x * 1.01 - cx * 0.01, 0, outer.z * 1.01 - cz * 0.01);
    assert.equal(placed.heightAt(triangles, p), null);
    assert.ok((await mountAt(p)).enabled.includes('canopy.lands'), `no wall at ${p.toArray()}`);
    inside.y = 120 + PLAYER_R - 0.7;
    const occupied = await mountAt(inside);
    assert.ok(!occupied.enabled.includes('canopy.lands'), 'the cliff mounted through a player at its lip');
    inside.y = 124;
    occupied.update();
    assert.ok(occupied.state().enabled.includes('canopy.lands'), 'the cliff stayed off after the player cleared it');
  });

test('a waiting first-lay slab at the Bell Rock rim is hidden', async () => {
  const { position, floor, overlaps, drawnDeck } = await reachedView(1340, -2.25, 1);
  assert.equal(position.y, floor + PLAYER_R);
  assert.deepEqual(overlaps, []);
  assert.ok(drawnDeck.length);
  assert.ok(
    drawnDeck.every((s) => !holds(s, position)),
    'deck drawn through player',
  );
});

test('the Bell Rock lower-deck lift leaves headroom below the ramp', () => {
  const position = new THREE.Vector3(-72.99383527541504, 5.15, -860.5269921785417);
  const colliders = ground(bellRaw);
  const shapes = colliders.map(shapeOf);
  const ramp = shapes[colliders.findIndex((c) => c.placement.id === 'bell.ramp')]!;
  assert.equal(holds(ramp, position), false);
  const result = liftOrWait(
    shapes.map((x) => ({ shapes: [x], on() {} })),
    bodyOf(position),
    { lift: true },
  );
  assert.equal(holds(ramp, position), false, 'the lifted head intersects the ramp');
  assert.equal(result.kind, 'wait');
});

test("a lay's headroom reads the scenery as the world builds it", () => {
  // A slab whose top is 0.2 m over the feet under Bell Rock's ramp: alone (the same spot 3 km off, nothing built
  // there) it lifts the body; with the levels' solids built round it, the ramp is over the lifted head and it waits.
  // So a lift that left the scenery out would show here.
  buildScenery();
  const position = new THREE.Vector3(-72.99383527541504, 5.15, -860.5269921785417);
  const deck = (p: THREE.Vector3) => [
    { shapes: [boxShape({ x: p.x, y: p.y - PLAYER_R + 0.2 - 0.2, z: p.z, w: 4, h: 0.4, d: 4, yaw: 0 })], on() {} },
  ];
  const alone = position.clone().setX(position.x + 3000);
  assert.equal(liftOrWait(deck(alone), bodyOf(alone), { lift: true }).kind, 'lifted');
  const among = position.clone();
  assert.equal(liftOrWait(deck(among), bodyOf(among), { lift: true }).kind, 'wait');
  assert.deepEqual(among.toArray(), position.toArray(), 'moved while waiting');
});

test('residency covers the far face of a pitched box', () => {
  // Static levels support pitched boxes (Canopy's beach and both platform ramps).
  // A wide radial separation makes an omitted corner visible even after rounding to 10 m.
  const defs = { box: { colliders: [{ shape: 'box', at: [0, 0, 0], half: [1, 4, 1] }] } };
  const placement = { prefab: 'box', pos: [0, 0, 408], rot: [0, Math.PI / 4, 0] };
  const near = coverNear([placement], defs, { x: 0, z: 0 });
  const far = new THREE.Vector3(1, 4, 1).applyEuler(new THREE.Euler(Math.PI / 4, 0, 0, 'YXZ'));
  assert.ok(near >= Math.hypot(far.x, 408 + far.z) + 40, 'the outer corner is inside the arrival margin');
});
test('the first Canopy lay keeps both slabs at the Bell Rock seam off until the player clears both', async () => {
  const seam = row.BAY_CUT_END + 1.8 + 110;
  const view = await reachedView(seam, 0, 1);
  const first = view.slabsEnabled();
  const move = (s: number) => {
    const p = row.rowWorld(route.ROW_LINE.bay, s, 0, { x: 0, z: 0 });
    view.position.set(p.x, view.floor + PLAYER_R, p.z);
    view.update();
  };
  move(seam - 1);
  const partial = view.slabsEnabled() - first;
  view.position.y += 5;
  view.update();
  assert.equal(view.slabsEnabled() - first, 2, 'both colliders must return once clear');
  assert.equal(partial, 0, 'one slab returned while the player still overlapped the other');
});

test('a stack deck becoming solid at High Gorge leaves room for the player’s head', async () => {
  const position = new THREE.Vector3(-105.36, 3.3, -1983.2695);
  const solids = ground(gorgeRaw).map(shapeOf);
  // Rapier's overlap test reads about 2 mm generous, and this spot grazes a Gorge slab's underside by less: so the lay
  // may only keep what already held the body, never add to it.
  const held = () => solids.filter((solid) => holds(solid, position));
  const before = held();
  await reachedView(1300, 0, 3, position);
  assert.ok(
    held().every((s) => before.includes(s)),
    `deck lifted the player into High Gorge at ${position.toArray()}`,
  );
});

for (const raw of [notch, original]) {
  const level = validation.loadLevelArtifact(raw, artifact.prefabs);
  test(level.place + ' platforms stand 90 cm above rail for the full 40 m stop', () => {
    for (const side of [-1, 1]) {
      const deck = level.placements.find((p) => p.id === level.place + '.platform-' + side)!;
      assert.deepEqual(deck.scale, [4, 0.4, 40]);
      assert.equal(deck.pos[1], level.place === 'notch' ? 7.7 : 4.7);
    }
  });
}

test('two nearby horn players each get three wall echoes', () => {
  let now = 0;
  const sounds: number[] = [];
  const chords: boolean[] = [];
  let receive!: (message: unknown, from: string) => void;
  const world = { lookup: () => 0, single: () => 0, get: () => ({ at: 0, kind: 8 }) };
  const { createGorgeTownPlots } = sourceModule<{
    createGorgeTownPlots(owner: unknown): { update(dt: number): void };
  }>(fs.readFileSync('src/entities/route-greybox/gorge-town-plots.ts', 'utf8'), {
    THREE,
    site: route.GORGE_HANGOUT,
    gorgeAt: route.gorgeAt,
    me: {},
    performance: { now: () => now },
    createHangoutBuilding: (_owner: unknown, _ground: unknown, tower: boolean) => ({
      preview() {},
      construction: (fraction: number) => !tower && fraction >= 1,
    }),
    instantiate: () => ({ setEnabled() {} }),
    paintBoard() {},
    gorgeHookRings: new Set(),
    createLimiter: () => ({ allow: () => true }),
    onRoomReady: (ready: (room: unknown) => void) =>
      ready({ onMessage: (handler: typeof receive) => (receive = handler) }),
    railwayWorldRead: () => ({ ready: () => true, world: () => world, tick: () => 100, trade: () => ({}) }),
    Plot: {},
    Till: {},
    TRADE: { buildTicks: 100 },
    plotPrice: () => 150,
    canyonHorn: (_x: number, _z: number, beat: number, harmony: boolean) => {
      sounds.push(beat);
      if (beat === 0) chords.push(harmony);
    },
  });
  const view = createGorgeTownPlots({ add() {}, cleanup() {}, alive: true });
  view.update(0);
  for (now = 0; now <= 4000; now += 20) {
    if (now === 0 || now === 1000) receive({ t: 'echo', id: 32 }, now === 0 ? 'alice' : 'bob');
    view.update(0.02);
  }
  assert.deepEqual(
    sounds.filter((beat) => beat > 0),
    [1, 2, 1, 3, 2, 3],
  );
  assert.deepEqual(chords, [false, true]);
});
