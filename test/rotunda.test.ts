// Step 1a's explicit spatial contract: the reusable kit and Home's full seven-bay keep-clear.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceFunction } from '../dev/level/source.ts';
import { ROTUNDA_KIT, bayFrame, rotundaBays, rotundaFootprint, rotundaSteelPallet } from '../src/place/rotunda.ts';
import { BUFFERS, ROTUNDA_HOME, legPoints, roadAt, spurPoints, type XZ } from '../src/place/home-station.ts';
import { LINKS, ORIGIN } from '../src/place/layout.ts';
import { H } from '../src/place/terrain.ts';
import { GARAGE_GEO, polarAt } from '../src/entities/railway/garage-geo.ts';
import { ENGINE } from '../src/entities/railway/engine.ts';
import { TRAILER, TRAIN_OFFSETS } from '../src/entities/railway/cars.ts';
import { TOWN_SLOTS, townBuilding, townLocal } from '../src/place/town-plan.ts';

const dist = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z);
const near = (a: number, b: number, epsilon = 1e-9) => assert.ok(Math.abs(a - b) < epsilon, `${a} ≈ ${b}`);

test('the apron steel token pallet clears the full table and kerb', () => {
  const centre = { x: ROTUNDA_HOME.centre.x + ORIGIN.x, z: ROTUNDA_HOME.centre.z };
  const p = sourceFunction<{ x: number; y: number; z: number; w: number; d: number }>(
    'src/entities/railway/boiler-install-view.ts',
    'TOKEN',
    { ROTUNDA_HOME, rotundaSteelPallet, ORIGIN, H },
  );
  const edge = Math.hypot(
    Math.max(0, Math.abs(p.x - centre.x) - p.w / 2),
    Math.max(0, Math.abs(p.z - centre.z) - p.d / 2),
  );
  assert.ok(edge > ROTUNDA_HOME.tableR + ROTUNDA_KIT.rim, `nearest pallet edge ${edge.toFixed(3)} m is inside the rim`);
  for (const x of [-p.w / 2, 0, p.w / 2])
    for (const z of [-p.d / 2, 0, p.d / 2]) {
      const ground = H(p.x + x, p.z + z);
      assert.ok(ground <= p.y && p.y - ground < 0.15, 'the pallet sits at the high edge of shallow supporting ground');
    }
  const larger = rotundaSteelPallet({ ...ROTUNDA_HOME, tableR: ROTUNDA_HOME.tableR + 2 });
  near(dist(larger, rotundaSteelPallet(ROTUNDA_HOME)), 2);
  console.log(
    `steel pallet: world (${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}), inner edge ${edge.toFixed(3)} m`,
  );
});

test('the kit has 4.86 m door chords, 8.68 m backs and shared edges between 20 degree bays', () => {
  const frames = ROTUNDA_HOME.order.map((bay) => bayFrame(ROTUNDA_HOME, bay));
  assert.deepEqual(
    frames.map((f) => f.bearing),
    [190, 170, 210, 150, 230, 130, 250],
  );
  for (const f of frames) {
    near(dist(f.corners[0], f.corners[1]), 4.86, 0.01);
    near(dist(f.corners[2], f.corners[3]), 8.68, 0.01);
    near(dist(f.door, f.back), ROTUNDA_KIT.depth);
    near(Math.sin(f.yaw), f.u.x);
    near(Math.cos(f.yaw), f.u.z);
  }
  for (let bay = -3; bay < 3; bay++) {
    const a = bayFrame(ROTUNDA_HOME, bay),
      b = bayFrame(ROTUNDA_HOME, bay + 1);
    assert.deepEqual(a.corners[1], b.corners[0]);
    assert.deepEqual(a.corners[2], b.corners[3]);
  }
});

test('the site owns the 0/3/5/7 ladder; the kit also serves a translated, turned nine-bay hub', () => {
  assert.deepEqual(
    [0, 1, 2, 3].map((s) => rotundaBays(ROTUNDA_HOME, s)),
    [[], [0, -1, 1], [0, -1, 1, -2, 2], [0, -1, 1, -2, 2, -3, 3]],
  );
  const other = {
    ...ROTUNDA_HOME,
    id: 'test-hub',
    centre: { x: 100, z: -80 },
    mid: 30,
    tableR: 7,
    order: [0, -1, 1, -2, 2, -3, 3, -4, 4],
    stages: [5, 9],
  };
  assert.equal(rotundaBays(other, 0).length, 5);
  assert.equal(rotundaBays(other, 1).length, 9);
  near(dist(bayFrame(other, 4).rim, other.centre), 7);
  assert.equal(bayFrame(other, 4).bearing, 110);
  assert.ok(rotundaFootprint(other, 9).every((p) => Number.isFinite(p.x + p.z)));
  const pit = rotundaFootprint(other, 0);
  assert.deepEqual(pit[0], pit.at(-1));
  assert.ok(pit.every((p) => dist(p, other.centre) >= other.tableR + ROTUNDA_KIT.rim));
});

function pointSegment(p: XZ, a: XZ, b: XZ) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return dist(p, { x: a.x + t * dx, z: a.z + t * dz });
}
const cross = (a: XZ, b: XZ, p: XZ) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
function segmentGap(a: XZ, b: XZ, c: XZ, d: XZ) {
  if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return 0;
  return Math.min(pointSegment(a, c, d), pointSegment(b, c, d), pointSegment(c, a, b), pointSegment(d, a, b));
}
function inside(p: XZ, polygon: XZ[]) {
  let hit = false;
  for (let i = 1; i < polygon.length; i++) {
    const a = polygon[i - 1]!,
      b = polygon[i]!;
    if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) hit = !hit;
  }
  return hit;
}
function clearance(outline: XZ[], line: XZ[], closed = false) {
  if (line.some((p) => inside(p, outline)) || (closed && outline.some((p) => inside(p, line)))) return 0;
  let gap = Infinity;
  for (let i = 1; i < outline.length; i++)
    for (let j = 1; j < line.length; j++)
      gap = Math.min(gap, segmentGap(outline[i - 1]!, outline[i]!, line[j - 1]!, line[j]!));
  return gap;
}

test('the steel pallet leaves the approach, all seven stall roads and garage furniture clear', () => {
  const p = rotundaSteelPallet(ROTUNDA_HOME);
  const outline = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
    [-1, -1],
  ].map(([x, z]) => ({
    x: p.x + (x! * p.w) / 2,
    z: p.z + (z! * p.d) / 2,
  }));
  const paths = LINKS.map(({ line }) => Array.from(line.xs, (x, i) => ({ x, z: line.zs[i]! })));
  paths.push(legPoints(), spurPoints());
  for (const road of [0, 1] as const) paths.push([roadAt(road, BUFFERS[road]), roadAt(road, 0)]);
  for (const bay of ROTUNDA_HOME.order) {
    const f = bayFrame(ROTUNDA_HOME, bay);
    paths.push([f.rim, f.back]);
  }
  const rail = Math.min(...paths.map((line) => clearance(outline, line)));
  assert.ok(rail >= 3.5, `pallet edge is ${rail.toFixed(3)} m from a track centre`);
  for (const [name, at] of Object.entries({ post: GARAGE_GEO.post, jib: GARAGE_GEO.jib, stand: GARAGE_GEO.stand })) {
    const point = polarAt(ROTUNDA_HOME.centre, at);
    const gap = clearance(outline, [point, point]);
    assert.ok(gap > 3, `${name}: ${gap.toFixed(3)} m`);
  }
  type Cameras = Record<string, { pos: [number, number, number] }>;
  const cams = sourceFunction<Cameras>('src/entities/railway/garage-view.ts', 'CAMS', {});
  const portrait = sourceFunction<Cameras>('src/entities/railway/garage-view.ts', 'PORTRAIT', {});
  const shift = (TRAIN_OFFSETS[0]! + ENGINE.hz - TRAILER.hz) / 2;
  const yaw =
    Math.PI - (GARAGE_GEO.camBearing * Math.PI) / 180 - Math.atan2(cams.engine!.pos[0], cams.engine!.pos[2] - shift);
  let cameraGap = Infinity;
  for (const c of [...Object.values(cams), ...Object.values(portrait)]) {
    const [x, , z] = c.pos;
    const at = {
      x: ROTUNDA_HOME.centre.x + Math.cos(yaw) * x + Math.sin(yaw) * (z - shift),
      z: ROTUNDA_HOME.centre.z - Math.sin(yaw) * x + Math.cos(yaw) * (z - shift),
    };
    cameraGap = Math.min(cameraGap, clearance(outline, [at, at]));
  }
  assert.ok(cameraGap > 2, `garage camera ${cameraGap.toFixed(3)} m from pallet`);
  console.log(`steel pallet: camera clearance ${cameraGap.toFixed(3)} m`);
  console.log(`steel pallet: ${paths.length} track paths, minimum edge clearance ${rail.toFixed(3)} m`);
});

test('the full Home footprint clears every LINKS track, the leg and both stubs by 3.5 m, town footprints by 4 m', () => {
  const footprint = rotundaFootprint(ROTUNDA_HOME, 7);
  const tracks: { id: string; pts: XZ[] }[] = LINKS.map(({ id, line }) => ({
    id,
    pts: Array.from(line.xs, (x, i) => ({ x, z: line.zs[i]! })),
  }));
  tracks.push({ id: 'leg', pts: legPoints() });
  for (const road of [0, 1] as const)
    tracks.push({ id: `stub-${road}`, pts: [roadAt(road, BUFFERS[road]), roadAt(road, 0)] });
  let rail = Infinity,
    town = Infinity;
  for (const { id, pts } of tracks) {
    const gap = clearance(footprint, pts);
    assert.ok(gap >= 3.5, `${id}: ${gap.toFixed(3)} m`);
    rail = Math.min(rail, gap);
  }
  for (const { id } of TOWN_SLOTS) {
    const b = townBuilding(id);
    const corners = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
      [-1, -1],
    ].map(([x, z]) => townLocal(b, (x! * b.w) / 2, (z! * b.d) / 2));
    const gap = clearance(footprint, corners, true);
    assert.ok(gap >= 4, `${id}: ${gap.toFixed(3)} m`);
    town = Math.min(town, gap);
  }
  console.log(
    `rotunda clearances: ${tracks.length} tracks >= ${rail.toFixed(3)} m; ${TOWN_SLOTS.length} town footprints >= ${town.toFixed(3)} m`,
  );
});
