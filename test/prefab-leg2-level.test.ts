// Review reproduction: missing/moved compiled placements must change the actual level-check verdict.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sourceModule } from '../dev/level/source.ts';
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
import { LINE_SLOTS } from '../src/sim/railway-trains.ts';
import { TRAIN_PHASE, trainStopsOf } from '../src/sim/railway-train.ts';
import { Leg } from '../src/sim/railway-components.ts';
import { buildSeedWorld } from '../src/sim/railway-seeds.ts';
import * as path from '../src/entities/railway/line2-path.ts';
import * as row from '../src/entities/railway/row-path.ts';
import * as junctions from '../src/place/junctions.ts';
import { KIT } from '../src/place/turnout.ts';
import * as gorgeLayout from '../src/entities/route-greybox/massing.ts';
import { AREA_CENTRES, LEG2_TEXT } from '../src/entities/route-greybox/leg2-layout.ts';
import { isleGround } from '../src/content/levels/leg3.ts';
import { siteExit } from '../src/place/site-clearance.ts';
import { resident } from '../src/render/lod-level.ts';
import { HEAD_OFFSET, PLAYER_R } from '../src/constants.ts';
import canopy from '../content/built/levels/canopy.json' with { type: 'json' };

validation.validateArtifact(artifact);
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

// Greybox leg 3, step 6's review (Astra, on 87d7edf12): the leg view's lays and the route areas' mounts clear a body
// standing where a solid goes on (route-greybox/clear.ts), Canopy's residency covers its whole isle and counts every
// solid, and a row line's departure boards list only halts where a train stops. Each runs the view's own source.
const clearFor = (position: THREE.Vector3) =>
  sourceModule<typeof import('../src/entities/route-greybox/clear.ts')>(
    fs.readFileSync('src/entities/route-greybox/clear.ts', 'utf8'),
    {
      THREE,
      HEAD_OFFSET,
      PLAYER_R,
      me: { body: { position } },
      siteExit,
      outOf: sourceFunction('src/place/sites.ts', 'outOf', {}),
      compiled: artifact,
    },
  );
const ground = (value: unknown) =>
  placed.resolvePlacedColliders(
    validation.loadLevelArtifact(value, artifact.prefabs as unknown as Readonly<Record<string, PrefabDef>>),
    artifact.prefabs as unknown as Readonly<Record<string, PrefabDef>>,
  ).colliders;

// Run the view's actual draw and solid transitions, recording the sign and physics boundaries.
async function reachedView() {
  const p = row.rowWorld(route.ROW_LINE.bay, 1300, 0, { x: 0, z: 0 });
  const floor = placed.heightAt(
    ground(bellRaw).flatMap((c) => c.volume.triangles),
    p,
  );
  assert.ok(floor !== null);
  const position = new THREE.Vector3(p.x, floor + PLAYER_R, p.z);
  const signs = new Map<THREE.Group, string[]>();
  const overlaps: number[] = [];
  const slab = (ax: number, az: number, bx: number, bz: number, ya: number, yb: number, width: number) => {
    const dx = bx - ax,
      dz = bz - az,
      run = Math.hypot(dx, dz);
    const t = ((position.x - ax) * dx + (position.z - az) * dz) / (run * run);
    if (t < 0 || t > 1 || Math.abs((position.x - ax) * dz - (position.z - az) * dx) / run > width / 2) return {};
    const rail = ya + (yb - ya) * t;
    if (position.y - PLAYER_R < rail && position.y + HEAD_OFFSET + PLAYER_R > rail - 0.4) overlaps.push(rail);
    return {};
  };
  const source = fs
    .readFileSync('src/entities/route-greybox/leg-view.ts', 'utf8')
    .replace(/await Promise\.all\(\s*\[[\s\S]*?\],?\s*\)/, 'dependencies');
  const { createLegView } = sourceModule<{ createLegView: (adapter: unknown, owner: unknown) => Promise<unknown> }>(
    source,
    {
      THREE,
      ...route,
      ...lines,
      ...rows,
      ...progress,
      ...gorgeLayout,
      ...junctions,
      ...path,
      ...row,
      KIT,
      TRAIN_PHASE,
      RING_S_HEAD,
      LINE_SLOTS,
      AREA_CENTRES,
      trainStops: (_world: unknown, line: number) =>
        trainStopsOf(
          line,
          true,
          { joined: true, head: 2 },
          route.RAIL_LEGS.map((l) => l.sections.length),
        ),
      canopyGround: isleGround,
      bellPads: [],
      areaLabels: new Map(),
      ringIslandNear: { mounted: false },
      me: { body: { position } },
      camera: { position },
      dependencies: [
        { slab, addStatic: () => ({}) },
        { onIsland: () => false },
        { outOf: sourceFunction('src/place/sites.ts', 'outOf', {}) },
      ],
      ...clearFor(position),
      signBoard: () => ({ mesh: new THREE.Group() }),
      paintPlate: (s: { mesh: THREE.Group }, entries: { t: string }[]) =>
        signs.set(
          s.mesh,
          entries.map((l) => l.t),
        ),
      createBoxBatch: () => ({ mesh: new THREE.Group(), begin() {}, commit() {}, box() {}, between() {} }),
      playObjective() {},
    },
  );
  const seed = buildSeedWorld('awake');
  for (const [i, leg] of route.RAIL_LEGS.entries())
    if (lines.legBuilt(i)) seed.w.mut(Leg, progress.legId(seed.w, i))!.laid = leg.sections.length;
  await createLegView({ read: { whole: () => true, world: () => seed.w, tick: () => seed.t } }, { removeBody() {} });
  return { signs, overlaps, floor };
}

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

// Drive a cold residency update with camera and player together, as on arrival from the sea.
async function mountAt(position: THREE.Vector3) {
  let update: (() => void) | undefined;
  let describe: (() => Record<string, { solids: number }>) | undefined;
  const pending: Promise<void>[] = [];
  const enabled: string[] = [];
  const overlaps: string[] = [];
  const colliders = ground(canopy);
  const instantiate = (_key: string, placement: { id: string }) => {
    const solids = colliders.filter((c) => c.placement.id === placement.id);
    return {
      bodies: solids,
      setEnabled(on: boolean) {
        if (!on) return;
        enabled.push(placement.id);
        if (
          solids.some(
            (c) =>
              placed.heightAt(c.volume.triangles, position) !== null && c.volume.centre.distanceTo(position) < PLAYER_R,
          )
        )
          overlaps.push(placement.id);
      },
    };
  };
  const helpers = sourceModule<typeof import('../src/entities/route-greybox/leg2-draw.ts')>(
    fs.readFileSync('src/entities/route-greybox/leg2-draw.ts', 'utf8'),
    {
      records: artifact,
      loadLevelArtifact: validation.loadLevelArtifact,
      LEG2_TEXT,
      areaLabels: new Map(),
      instantiate,
    },
  );
  type Draw = typeof import('../src/entities/route-greybox/boxes.ts').drawGreyBoxes;
  const draw = sourceFunction<Draw>('src/entities/route-greybox/boxes.ts', 'drawGreyBoxes', {
    compiled: artifact,
    gorgeSurfaces: () => new Map(),
    createPrefabBatch: () => ({
      mesh: new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 100),
    }),
    instantiate,
  });
  sourceModule(fs.readFileSync('src/entities/route-greybox/index.ts', 'utf8'), {
    productionRailway: true,
    location: { search: '' },
    AREA_CENTRES,
    resident,
    camera: { position },
    me: { body: { position } },
    defineKind() {},
    routeAreas: new Map(),
    spawn: (entity: { update?: () => void; describe?: typeof describe }) => {
      if (entity.update) {
        update = entity.update;
        describe = entity.describe;
      }
      return entity;
    },
    createOwnedView: () => ({ root: new THREE.Group(), cleanup() {} }),
    ...clearFor(position),
    MOUNT_NEAR: 400,
    FREE_MORE: 150,
    canopyNear: sourceFunction<typeof import('../src/entities/route-greybox/leg2-layout.ts').coverNear>(
      'src/entities/route-greybox/leg2-layout.ts',
      'coverNear',
      { MOUNT_NEAR: 400, ARRIVAL: 40 },
    )(helpers.leg2Massing(canopy), AREA_CENTRES.canopy),
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
  return { enabled, overlaps, report: describe().canopy };
}

test('a swimmer arriving at the western beach finds its collider at the shoreline', async () => {
  const beach = ground(canopy).find((c) => c.placement.id === 'canopy.beach-27')!;
  const p = beach.volume.centre.clone();
  assert.ok((placed.heightAt(beach.volume.triangles, p) ?? -1) > 0);
  p.y = 0;
  assert.ok((await mountAt(p)).enabled.includes(beach.placement.id));
});

test('a Canopy remount clears a player inside the platform before enabling its box', async () => {
  const platform = ground(canopy).find((c) => c.placement.id === 'canopy.platform-out')!;
  const { overlaps } = await mountAt(platform.volume.centre.clone());
  assert.deepEqual(overlaps, []);
});

test('the Canopy residency report counts every mounted collider', async () => {
  const p = AREA_CENTRES.canopy;
  const { report } = await mountAt(new THREE.Vector3(p.x, 200, p.z));
  assert.equal(report?.solids, ground(canopy).length);
});
