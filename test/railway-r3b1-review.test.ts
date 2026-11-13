// Review of ring/r3b-v27 (R3b-1): the balanced hold's bounds on the v27 fixture line. A griefer's lever asks at a held
// end, a waiter the exception does not match, a `balance` nothing refuses, and the hold's answer across a save.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TRAIN, TRAIN_PHASE } from '../src/sim/railway-train.ts';
import { trainPlaces } from '../src/sim/railway-lines.ts';
import { balancedHold, endBlocks, trainStepLine } from '../src/sim/railway-trains.ts';
import { FixtureLine, LINE2_ROWS as V, standingAt, line2Stops } from './helpers/rail-rows.ts';

const ISLAND = 5;
const FOREVER = 1e6;
/** Train 0 at the Village going up, its dwell from `depart`; train 1 at Far Head going up, train 2 at the island going
 * down, both dwelling for ever: the gap ahead of train 0 stays the shorter, so only the cap lets it go. */
function bunched(depart = 0) {
  const stops = line2Stops(7, 7, true);
  const f = new FixtureLine(stops);
  f.rows = [standingAt(stops, 0, 0, depart), standingAt(stops, 2, 0, FOREVER), standingAt(stops, ISLAND, 1, FOREVER)];
  return f;
}
/** The tick train 0 leaves (phase RUN), stepping from `from`, asking `ask(t)` before each step; -1 by `until`. */
function leaves(f: FixtureLine, from: number, until: number, ask: (t: number) => void) {
  for (let t = from; t <= until; t++) {
    ask(t);
    trainStepLine(f.io(), V, t);
    if (f.rows[0]!.phase === TRAIN_PHASE.RUN) return t;
  }
  return -1;
}

test('the cap: a bunched train leaves the tick its cap runs out, with no asks', () => {
  const f = bunched();
  assert.equal(
    leaves(f, 1, 5000, () => {}),
    TRAIN.dwellTicks + V.balance!,
  );
});

test('griefing: lever asks every tick at a held end never restart the cap (bounded, not a livelock)', () => {
  const f = bunched();
  let accepted = 0;
  const t = leaves(f, 1, 50000, (tick) => void (accepted += f.call(0, 1, tick)));
  assert.equal(accepted, 1, 'only the first ask is taken: the line keeps it until a train leaves that way');
  assert.equal(t, TRAIN.dwellTicks + V.balance!, 'the cap runs from the arrival, not the ask');
});

test('griefing, worst case: one ask on the last held tick adds its dwell, and no more', () => {
  const f = bunched();
  const last = TRAIN.dwellTicks + V.balance! - 1;
  let accepted = 0;
  const t = leaves(f, 1, 50000, (tick) => {
    if (tick >= last) accepted += f.call(0, 1, tick);
  });
  assert.equal(accepted, 1);
  assert.equal(t, last + TRAIN.dwellTicks, `held ${t} ticks: dwell + cap + one asker's dwell`);
});

test('a repeated end-platform call gets its dwell across the original hold cap without restarting that cap', () => {
  const f = bunched();
  const last = TRAIN.dwellTicks + V.balance! - 1;
  let accepted = 0;
  const t = leaves(f, 1, 5000, (tick) => {
    if (tick === 1 || tick === last) accepted += f.call(0, 1, tick);
  });
  assert.equal(accepted, 2, 'the pending platform ask refreshes the boarding dwell');
  assert.equal(f.rows[0]!.arrived, 0, 'the hold remains anchored to arrival');
  assert.equal(t, last + TRAIN.dwellTicks, 'departure at the full dwell, with no added hold');
});

test('the waiter exception misses a train held at the old far signal after the railhead moves on; the cap still ends it', () => {
  // Q7 laid, the railhead at bent 1: train 0 stands at the Railhead end (stop 4) going down. A second train stands at
  // bent 0's signal on the up track (the signal the bent moved on from), a third running down just ahead of train 0.
  const stops = line2Stops(7, 1),
    old = endBlocks(V, line2Stops(7, 0))[1].signal,
    now = endBlocks(V, stops)[1].signal;
  assert.notEqual(old, now);
  const f = new FixtureLine(stops);
  f.rows = [
    standingAt(stops, 4, 1),
    { ...standingAt([old], 0, 0, FOREVER), at: -1, to: -1 },
    // Running down off the end 42 m ahead of train 0, its leg to the Pier just begun.
    { ...standingAt([83000], 0, 1, 100), phase: TRAIN_PHASE.RUN, to: 3, dest: stops[3]! },
  ];
  assert.equal(f.broken(), null, 'a legal state');
  assert.equal(balancedHold(f.io(), V, stops, 0, 4, 100), true, 'held with a train waiting behind it, not matched');
  assert.equal(balancedHold(f.io(), V, stops, 0, 4, TRAIN.dwellTicks + V.balance!), false, 'the cap ends it');
});

test("the hold's answer survives a save and restore, and reads no slot order", () => {
  const f = bunched();
  const before = balancedHold(f.io(), V, f.stops, 0, 0, 100);
  f.restore();
  assert.equal(balancedHold(f.io(), V, f.stops, 0, 0, 100), before);
  // The other two trains' rows swapped: the same poses, the same answer.
  [f.rows[1], f.rows[2]] = [f.rows[2]!, f.rows[1]!];
  assert.equal(balancedHold(f.io(), V, f.stops, 0, 0, 100), before);
});

test('a line whose balance is not a whole number of ticks within reason is refused (trainPlaces), or its hold still ends', () => {
  const stops = line2Stops(7, 7, true);
  for (const balance of [Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53, -1, 0.5]) {
    const line = { ...V, balance };
    let refused = false;
    try {
      trainPlaces(line, stops);
    } catch {
      refused = true;
    }
    if (refused) continue;
    const f = bunched();
    // A day of ticks later the hold must have ended.
    assert.equal(balancedHold(f.io(), line, stops, 0, 0, 864000), false, `balance ${balance}: held for ever`);
  }
});
