import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeedWorld } from './helpers/rail.ts';
import { railRoom } from './helpers/rail-room.ts';
import { trainStops } from '../src/sim/railway-queries-trains.ts';
import { aperture } from '../src/sim/railway-rows.ts';
import { line2Trains } from '../src/sim/railway-queries-line2.ts';
import { q7Laid, ringHead } from '../src/sim/railway-queries.ts';
import { LINE2, RAIL_LINES } from '../src/sim/railway-lines.ts';
import { trainStopsOf } from '../src/sim/railway-train.ts';
import { RING_HEAD, RING_END, RING_S_HEAD, ringAt, ringDeckY } from '../src/sim/railway-ring-layout.ts';
import { PIER_STOP_CM } from '../src/sim/railway-works-layout.ts';
import { FORMATION, crossLat, lineAt, LINKS, railY } from '../src/place/layout.ts';
import { RING_S, endMergeM, line2At, line2Lat, line2World, line2Y } from '../src/entities/railway/line2-path.ts';

test('a joined client reads the ring stops and railhead at each construction stage', () => {
  for (const [stage, stops, laid, set, head, joined] of [
    ['crossing-done', 4, false, 0, 0, false],
    ['deck-laid', 5, true, 0, 0, false],
    ['gap-footed', 5, true, 14, 7, false],
    ['ring-joined', 6, true, 14, 7, true],
  ] as const) {
    const room = railRoom(buildSeedWorld(stage));
    const client = room.join('a', 'a');
    room.ready();
    const world = client.adapter.read.world();
    assert.equal(line2Trains(world), true, stage);
    assert.equal(trainStops(world, LINE2).length, stops, stage);
    assert.equal(q7Laid(world), laid, stage);
    assert.deepEqual([aperture(world).set, ringHead(world), aperture(world).joined >= 0], [set, head, joined], stage);
  }
});

// ---------------------------------------------------------------- line 2's path past the pier head
const P = { x: 0, z: 0, ux: 0, uz: 1 };
test("line2At is the layout's to the pier and the ring's from the pier head on; no step at the join", () => {
  const line = LINKS[1]!.line;
  for (const s of [50, 300, 556, 700, 730]) {
    lineAt(line, s, P);
    const here = line2At(s, { x: 0, z: 0, ux: 0, uz: 1 });
    assert.ok(Math.hypot(here.x - P.x, here.z - P.z) < 1e-9, `layout at ${s}`);
  }
  for (const u of [0, 800, 2000, 12000, 26000, 44800]) {
    const ring = ringAt(u, 0),
      world = line2World(RING_S + u / 100, 0, { x: 0, z: 0 });
    assert.ok(Math.hypot(world.x - ring.x / 100, world.z - ring.z / 100) < 0.011, `ring at u ${u}`);
    const east = ringAt(u, 400),
      at = line2World(RING_S + u / 100, 4, { x: 0, z: 0 });
    assert.ok(Math.hypot(at.x - east.x / 100, at.z - east.z / 100) < 0.011, `ring at u ${u}, lat 4`);
  }
  // The join: every metre from 725 to 760 moves the path by about a metre, never a step.
  let prev = line2At(725, { x: 0, z: 0, ux: 0, uz: 1 });
  for (let s = 726; s <= 760; s++) {
    const cur = line2At(s, { x: 0, z: 0, ux: 0, uz: 1 });
    const step = Math.hypot(cur.x - prev.x, cur.z - prev.z);
    assert.ok(step > 0.9 && step < 1.2, `a metre at ${s}: ${step.toFixed(3)}`);
    prev = cur;
  }
  // Heights: the layout's to the head, the bow after (24.3 to bent 1 at u 20 m, 8.0 m from u 427.5).
  assert.equal(line2Y(700), railY(LINKS[1]!.line, 700));
  assert.equal(line2Y(RING_S + 20), ringDeckY(2000) / 100);
  assert.equal(line2Y(RING_S + 120), ringDeckY(12000) / 100);
  assert.equal(line2Y(RING_S + 450), 8);
  assert.equal(line2Y(RING_S + 5), 24.3);
  assert.equal(RING_S, RING_S_HEAD / 100);
});

// ---------------------------------------------------------------- a train's lateral: right-hand running (v45)
const OPEN = (laid: number, head = 0, joined = false) => trainStopsOf(LINE2, laid, { head, joined });
/** A train going out (track 0, the original track) and one going home (track 1, the offset track). */
const OUT = { track: 0, origin: 0 },
  HOME = { track: 1, origin: 0 };
type Left = { halt: number; s: number } | null;
/** The most the lateral moves over 0.05 m of the line along a run of metres, a train's lateral being the width of a
 * car's axle: a sideways jump is the whole 4 m in one step. */
function worstStep(stops: readonly number[], from: number, to: number, left: Left = null) {
  let worst = 0,
    prev = line2Lat({ ...HOME, origin: left ? left.s * 100 : 0 }, from, stops);
  for (let s = from + 0.05; s <= to; s += 0.05) {
    const cur = line2Lat({ ...HOME, origin: left ? left.s * 100 : 0 }, s, stops);
    worst = Math.max(worst, Math.abs(cur - prev));
    prev = cur;
  }
  return worst;
}
test('line 2 lateral: out on the original track, home on the offset one, and each end taken on the way out', () => {
  const far = OPEN(5),
    pier = OPEN(6),
    head = OPEN(7),
    island = OPEN(7, 7, true);
  assert.deepEqual([far.length, pier.length, head.length, island.length], [3, 4, 5, 6]);
  // A train going out is on the original track everywhere, at every stage: it runs straight in to each end.
  for (const stops of [far, pier, head, island])
    for (let s = 0; s <= 1200; s += 7) assert.equal(line2Lat(OUT, s, stops), 0, `out at s ${s}`);
  // Far Head the end: the homeward train leaves the east platform (s 524) on the original track and takes the
  // crossover (s 512 back to 490) out to the offset track.
  assert.equal(line2Lat(HOME, 524, far), 0);
  assert.equal(line2Lat(HOME, 513, far), 0);
  assert.equal(line2Lat(HOME, 490, far), crossLat(FORMATION.quarry, 490));
  assert.equal(line2Lat(HOME, 300, far), -4);
  assert.equal(line2Lat(HOME, 30, far), 0, 'one track at Home');
  assert.ok(worstStep(far, 30, 600) < 0.3, 'no jump at Far Head');
  // The pier opened (Q6), the end the Pier's stub: one terminal track from the stop back to the merge at s 556, then
  // the 20 m turnout out to the offset track.
  assert.equal(endMergeM(pier), 556);
  assert.equal(line2Lat(HOME, PIER_STOP_CM / 100, pier), 0);
  assert.equal(line2Lat(HOME, 556, pier), 0);
  assert.ok(Math.abs(line2Lat(HOME, 546, pier)) < 4 && Math.abs(line2Lat(HOME, 546, pier)) > 0);
  assert.equal(line2Lat(HOME, 520, pier), -4, 'past Far Head on the offset track: its west platform');
  assert.ok(worstStep(pier, 30, 740) < 0.3, 'no jump over the Pier stub');
  // A train that stood at Far Head (or was turning back there) as the pier opened leaves from the original track and
  // still takes the crossover: the accepted row retains its departure coordinate.
  const farLeft = { halt: 2, s: 524 };
  assert.equal(line2Lat({ ...HOME, origin: farLeft ? farLeft.s * 100 : 0 }, 524, pier), 0);
  assert.equal(
    line2Lat({ ...HOME, origin: farLeft ? farLeft.s * 100 : 0 }, 500, pier),
    crossLat(FORMATION.quarry, 500),
  );
  assert.equal(line2Lat({ ...HOME, origin: farLeft ? farLeft.s * 100 : 0 }, 480, pier), -4);
  assert.ok(worstStep(pier, 30, 524, farLeft) < 0.3, "no jump for the train the pier's opening caught at Far Head");
  // Q7 laid: the Pier is a middle halt on straight double track. A homeward train from beyond is on the offset track
  // there; one that stood at the Pier as the end keeps the old stub to its original merge at s 556.
  const pierLeft = { halt: 3, s: PIER_STOP_CM / 100 };
  assert.equal(line2Lat(HOME, PIER_STOP_CM / 100, head), -4, 'the offset track beside the Pier west platform');
  assert.equal(line2Lat({ ...HOME, origin: pierLeft ? pierLeft.s * 100 : 0 }, PIER_STOP_CM / 100, head), 0);
  assert.equal(line2Lat({ ...HOME, origin: pierLeft ? pierLeft.s * 100 : 0 }, PIER_STOP_CM / 100 - 20, head), 0);
  assert.equal(line2Lat({ ...HOME, origin: pierLeft ? pierLeft.s * 100 : 0 }, 600, head), 0);
  assert.ok(worstStep(head, 30, PIER_STOP_CM / 100, pierLeft) < 0.3, 'no jump for the train turned at the Pier');
  // The accepted origin changes nothing while its halt is still the end and its stop has not moved.
  for (let s = 500; s <= 740; s += 3)
    assert.equal(
      line2Lat({ ...HOME, origin: pierLeft ? pierLeft.s * 100 : 0 }, s, pier),
      line2Lat(HOME, s, pier),
      `s ${s}`,
    );
  // The railhead's stub: the merge is 20 m short of the stop and moves with `head`.
  assert.equal(endMergeM(head), RING_HEAD[0]!.mergeCm / 100);
  assert.equal(line2Lat(HOME, 800, head), -4);
  assert.equal(line2Lat(HOME, RING_HEAD[0]!.mergeCm / 100, head), 0);
  assert.equal(line2Lat(HOME, 850, head), 0);
  for (let k = 0; k < RING_HEAD.length; k++) {
    const stops = OPEN(7, k);
    assert.equal(endMergeM(stops), RING_HEAD[k]!.mergeCm / 100, `head ${k}`);
    assert.ok(worstStep(stops, 700, 1000) < 0.3, `no jump over the stub at head ${k}`);
  }
  // The railhead moves on a bent under a standing train: it stays on the original track where it stands and eases
  // out over the 20 m before its original merge.
  const stood = { halt: 4, s: head[4]! / 100 },
    moved = OPEN(7, 1);
  assert.equal(line2Lat({ ...HOME, origin: stood ? stood.s * 100 : 0 }, stood.s, moved), 0);
  assert.equal(line2Lat({ ...HOME, origin: stood ? stood.s * 100 : 0 }, stood.s - 20, moved), 0);
  assert.ok(worstStep(moved, 700, stood.s, stood) < 0.3, 'no jump for the train the railhead moved on from');
  // Ring Island the end (the rivet struck): the homeward train crosses out at RING_END.cross.
  assert.equal(endMergeM(island), RING_END.mergeCm / 100);
  assert.equal(line2Lat(HOME, RING_END.mergeCm / 100 + 22, island), 0);
  assert.equal(line2Lat(HOME, RING_END.mergeCm / 100, island), -4);
  assert.equal(line2Lat(HOME, 1100, island), -4);
  assert.ok(worstStep(island, 700, 1210) < 0.3, 'no jump over the island crossover');
  // The end's halt is the open stops' last, so the stops the lateral reads are the catalog's open ones: Ring Island the
  // sixth, then the greybox route's three stack heads and High Gorge (their laterals are step 4's).
  assert.equal(RAIL_LINES[LINE2]!.halts.length, 10);
  assert.equal(RAIL_LINES[LINE2]!.halts[5]!.name, 'Ring Island');
});
