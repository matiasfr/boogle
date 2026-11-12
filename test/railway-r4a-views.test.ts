// R4a, the line goes out (views; docs/plans/ring-island-build1.md, step 4a): the ring seeds put the stops, the relay and
// Q7's panels where the views read them, through the read facade's world; and line 2's path and lateral past the pier
// head (src/entities/railway/line2-path.ts) join the layout's, follow the ring's rows, and never jump a train sideways.
// The views need three.js and a DOM, so their reads are reproduced here as written (train-view's stops and halts-view's stops and head; ring-deck's relay); a change
// to a view's read is a change to the function below. The differential proof against `inspect()` went with it (X2 of
// docs/plans/ecs-m12-m13.md). Modelled on test/railway-m10d-review.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeedWorld, type SeedStage } from './helpers/rail.ts';
import { railRoom } from './helpers/rail-room.ts';
import { trainStops } from '../src/sim/railway-queries-trains.ts';
import { q7Laid, ringHead } from '../src/sim/railway-queries.ts';
import { LINE2, RAIL_LINES } from '../src/sim/railway-lines.ts';
import { trainStopsOf } from '../src/sim/railway-train.ts';
import { RING_HEAD, RING_END, RING_S_HEAD, ringAt, ringDeckY } from '../src/sim/railway-ring-layout.ts';
import { PIER_STOP_CM } from '../src/sim/railway-works-layout.ts';
import { FORMATION, crossLat, lineAt, LINKS, railY } from '../src/place/layout.ts';
import { RING_S, endMergeM, line2At, line2Lat, line2World, line2Y } from '../src/entities/railway/line2-path.ts';

// ---------------------------------------------------------------- a client at a seed
/** The read facade's world of one client that has the seed's state: a room at the seed, stepped until it is ready. */
function client(stage: SeedStage) {
  const r = railRoom(buildSeedWorld(stage));
  const c = r.join('a', 'a');
  r.ready();
  return c.adapter;
}

// ---------------------------------------------------------------- the views' reads, as written
function reads(adapter: ReturnType<typeof client>) {
  const w = adapter.read.world();
  return {
    // train-view.ts (stops2) and halts-view.ts (refreshStops): the open stops of both lines
    stops: [0, 1].map((k) => [...trainStops(w, k)]),
    // halts-view.ts (ring levers' head and need)
    head: ringHead(w),
    // ring-deck.ts: the relay is down, Q7's panels laid
    relay: q7Laid(w),
  };
}
test('the ring seeds put the stops where the views expect them', () => {
  const at = (stage: SeedStage) => reads(client(stage));
  assert.equal(at('crossing-done').stops[1]!.length, 4, 'the Pier is the end before Q7');
  assert.equal(at('deck-laid').stops[1]!.length, 5, 'the Railhead is the end once Q7 is laid');
  assert.equal(at('deck-laid').relay, true);
  assert.equal(at('crossing-done').relay, false);
  assert.equal(at('ring-joined').stops[1]!.length, 6, 'Ring Island is the end once the rivet is struck');
  assert.equal(at('gap-footed').head, 7, 'the railhead at the last bent');
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

// ---------------------------------------------------------------- the up track's lateral
const OPEN = (laid: number, head = 0, joined = false) => trainStopsOf(LINE2, laid, { head, joined });
const up = (to: number, turn = false, dest = 0) => ({ track: 0, to, turn, dest });
/** The most the lateral moves over 0.05 m of the line along a run of metres, a train's lateral being the width of a
 * car's axle: a sideways jump is the whole 4 m in one step. */
function worstStep(row: ReturnType<typeof up>, stops: readonly number[], from: number, to: number, merge?: number) {
  let worst = 0,
    prev = line2Lat(row, from, stops, merge);
  for (let s = from + 0.05; s <= to; s += 0.05) {
    const cur = line2Lat(row, s, stops, merge);
    worst = Math.max(worst, Math.abs(cur - prev));
    prev = cur;
  }
  return worst;
}
test('line 2 up lateral: Far Head crossover while it is the end, the pier stub, the railhead stub, the island crossover', () => {
  const far = OPEN(5),
    pier = OPEN(6),
    head = OPEN(7),
    island = OPEN(7, 7, true);
  assert.deepEqual([far.length, pier.length, head.length, island.length], [3, 4, 5, 6]);
  // Far Head the end: the down track is 0; the body is the up track; the crossover carries up trains over.
  assert.equal(line2Lat({ track: 1, to: 0, turn: false, dest: 0 }, 300, far), 0);
  assert.equal(line2Lat(up(2), 300, far), -4);
  assert.equal(line2Lat(up(2), 490, far), crossLat(FORMATION.quarry, 490));
  assert.equal(line2Lat(up(2), 513, far), 0);
  assert.ok(worstStep(up(2), far, 30, 600) < 0.3, 'no jump at Far Head');
  // The pier opened (Q6), the end the Pier's stub: the 20 m turnout before the merge at s 556.
  assert.equal(endMergeM(pier), 556);
  assert.equal(line2Lat(up(3), 520, pier), -4);
  assert.ok(Math.abs(line2Lat(up(3), 546, pier)) < 4 && Math.abs(line2Lat(up(3), 546, pier)) > 0);
  assert.equal(line2Lat(up(3), 556, pier), 0);
  assert.ok(worstStep(up(3), pier, 30, 740) < 0.3, 'no jump over the Pier stub');
  // A train the pier's opening caught on Far Head's crossover still turns there.
  assert.equal(line2Lat(up(2, true), 500, pier), crossLat(FORMATION.quarry, 500));
  // The review's bug: a train Q7 turns at the Pier (bound there, `turn`) is not on Far Head's crossover. Past s 512 it
  // stays on the up track, then eases onto the down track over the 20 m before the stop it turns at.
  const caught = up(3, true, PIER_STOP_CM);
  assert.equal(line2Lat(caught, 520, head), -4, 'at s 520 it is on the up track, not 0 (was a 4 m jump)');
  assert.equal(line2Lat(caught, 600, head), -4);
  assert.equal(line2Lat(caught, PIER_STOP_CM / 100, head), 0);
  assert.ok(worstStep(caught, head, 30, 730) < 0.3, 'no jump for the train turned at the Pier');
  // The railhead's stub: the merge is 20 m short of the stop and moves with `head`.
  assert.equal(endMergeM(head), RING_HEAD[0]!.mergeCm / 100);
  assert.equal(line2Lat(up(4), 800, head), -4);
  assert.equal(line2Lat(up(4), RING_HEAD[0]!.mergeCm / 100, head), 0);
  assert.equal(line2Lat(up(4), 850, head), 0);
  for (let k = 0; k < RING_HEAD.length; k++) {
    const stops = OPEN(7, k);
    assert.equal(endMergeM(stops), RING_HEAD[k]!.mergeCm / 100, `head ${k}`);
    assert.ok(worstStep(up(4), stops, 700, 1000) < 0.3, `no jump over the stub at head ${k}`);
  }
  // Ring Island the end (the rivet struck): up trains cross at RING_END.cross onto the down track.
  assert.equal(endMergeM(island), RING_END.mergeCm / 100);
  assert.equal(line2Lat(up(5), 1100, island), -4);
  assert.equal(line2Lat(up(5), RING_END.mergeCm / 100, island), -4);
  assert.equal(line2Lat(up(5), RING_END.mergeCm / 100 + 22, island), 0);
  assert.ok(worstStep(up(5), island, 700, 1210) < 0.3, 'no jump over the island crossover');
  // The end's halt is the open stops' last, so the stops the lateral reads are the catalog's open ones: Ring Island the
  // sixth, then the greybox route's stack railhead and High Gorge (their laterals are step 4's).
  assert.equal(RAIL_LINES[LINE2]!.halts.length, 8);
  assert.equal(RAIL_LINES[LINE2]!.halts[5]!.name, 'Ring Island');
});
