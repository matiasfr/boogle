// Step 1a's explicit spatial contract: the reusable kit and Home's full seven-bay keep-clear.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ROTUNDA_KIT, bayFrame, rotundaBays, rotundaFootprint } from '../src/place/rotunda.ts';
import { BUFFERS, ROTUNDA_HOME, legPoints, roadAt, type XZ } from '../src/place/home-station.ts';
import { LINKS } from '../src/place/layout.ts';
import { TOWN_SLOTS, townBuilding, townLocal } from '../src/place/town-plan.ts';

const dist = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z);
const near = (a: number, b: number, epsilon = 1e-9) => assert.ok(Math.abs(a - b) < epsilon, `${a} ≈ ${b}`);

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
