import assert from 'node:assert/strict';
import test from 'node:test';
import { Train } from '../src/sim/railway-components.ts';
import { legKitCap, legRow } from '../src/sim/railway-queries-route.ts';
import { RAIL_GATES, ROW_LINE } from '../src/sim/railway-route.ts';
import { line, shed, train } from '../src/sim/railway-rows.ts';
import { BRING_TICKS } from '../src/sim/railway-works-layout.ts';
import { laySection } from '../src/sim/railway-seed-legs.ts';
import { TRAIN, TRAIN_PHASE, boilerCars, kitBills } from '../src/sim/railway-train.ts';
import { stopsOf } from '../src/sim/railway-queries.ts';
import { endBlocks, LINE_SLOTS } from '../src/sim/railway-trains.ts';
import { legRailheadHold } from '../src/sim/railway-sys-route-kit.ts';
import { act, advance, buildSeedWorld, invariant, restore, steelHome, unaudited, type Seed } from './helpers/rail.ts';

const BAY = ROW_LINE.bay,
  CUT = 2,
  CANOPY = 3;
const gate = RAIL_GATES.findIndex((g) => g.id === 'canopy');
function until(s: Seed, predicate: () => boolean, message: string) {
  for (let k = 0; !predicate(); k++) {
    assert.ok(k < 8000, message);
    advance(s, 1);
  }
}
/** bay-mid with the works lit and the first steel home, by accepted ops and ticks only (built once). */
let baySteel: Seed | undefined;
const bayMidSteel = () => unaudited((baySteel ??= steelHome(buildSeedWorld('bay-mid'))));
/** Garage step 4: the bay line's copy brought to the table, then the copies' swap waited out. */
function bringBay(s: Seed) {
  assert.equal(act(s, 'a', 'rail.bring', { line: BAY, revision: shed(s.w).bringRev }), 1);
  advance(s, BRING_TICKS);
}
/** Strong (part 6) installed on the bay line, by accepted rail.install. */
function fitStrong(s: Seed) {
  assert.equal(act(s, 'a', 'rail.install', { line: BAY, part: 6, revision: line(s.w, BAY).rev }), 1);
  assert.equal(line(s.w, BAY).boiler, 5);
}

test('Strong fitted by rail.bring and rail.install loads two bills, holds at Bell Rock and unloads at the next head', { timeout: 300000 }, (t) => {
  const s = bayMidSteel();
  bringBay(s);
  fitStrong(s);
  assert.equal(boilerCars(5), 1);
  assert.deepEqual([kitBills(0), kitBills(4), kitBills(5)], [1, 1, 2]);
  assert.deepEqual(legKitCap(s.w, CUT, 2), { logs: 20, rails: 20 }, 'the bay cut has one bill left');
  const slot = LINE_SLOTS[BAY]![0]!;
  const row = () => train(s.w, slot);
  until(s, () => row().logs === 40 && row().rails === 40, 'two Canopy bills aboard at West landing');
  assert.equal(row().at, 0);
  assert.equal(row().boiler, 5);
  laySection(s, CUT);
  assert.ok(act(s, 'a', 'rail.gate', { id: gate }));
  until(
    s,
    () => row().at === 2 && row().phase === TRAIN_PHASE.STAND && row().logs === 20,
    'section one unloaded at Bell Rock',
  );
  assert.equal(legRow(s.w, CANOPY).rackLogs, 20);
  assert.equal(legRailheadHold(s.w, slot, s.t), 'hold');
  for (const boiler of [0, 4]) {
    const other = restore(s.w);
    other.mut(Train, other.lookup(Train, slot)!)!.boiler = boiler;
    assert.equal(legRailheadHold(other, slot, s.t), 'on', 'standard and Quick carry on');
  }
  const idle = unaudited({ w: restore(s.w), t: s.t });
  const deadline = row().depart + TRAIN.dwellTicks + TRAIN.railheadHoldTicks;
  // Isolate the timeout on the quiet arrival snapshot; live traffic can release it sooner.
  assert.equal(legRailheadHold(idle.w, slot, deadline - 1), 'hold');
  assert.equal(legRailheadHold(idle.w, slot, deadline), 'on');
  until(idle, () => legRailheadHold(idle.w, slot, idle.t) === 'yield', 'pressure before timeout');
  const signal = endBlocks(BAY, stopsOf(idle.w, BAY))[1].signal;
  assert.ok(LINE_SLOTS[BAY]!.some(other => {
    const follower = train(idle.w, other);
    return other !== slot && follower.phase === TRAIN_PHASE.STAND && follower.at === -1 && follower.from === signal;
  }), 'a following bay train is standing at the approach signal');
  assert.ok(idle.t < deadline);
  assert.equal(train(idle.w, slot).logs, 20);
  until(idle, () => train(idle.w, slot).phase === TRAIN_PHASE.RUN, 'Strong leaves under pressure');
  t.diagnostic(`pressure departure at ${idle.t}, deadline ${deadline}`);
  laySection(s, CANOPY);
  const laid = s.t;
  assert.equal(legRow(s.w, CANOPY).laid, 1);
  assert.equal(legRailheadHold(s.w, slot, s.t), 'on', 'Bell Rock is now a middle halt');
  until(s, () => row().at === 3 && legRow(s.w, CANOPY).rackLogs === 20 && row().logs === 0, 'same train unloads at head 1');
  assert.equal(invariant(s.w), null);
  t.diagnostic(`head 1 racked ${s.t - laid} ticks after the lay; deadline ${deadline}`);
});

test('a train carrying one Canopy bill tops up at West landing when it adopts Strong', { timeout: 300000 }, () => {
  const s = bayMidSteel();
  bringBay(s);
  const slot = LINE_SLOTS[BAY]![0]!;
  const row = () => train(s.w, slot);
  until(
    s,
    () => legRow(s.w, CUT).rackLogs === 20 && row().legKit && row().logs === 20 && row().track === 0 && row().at === 0,
    'a standard train carries its first Canopy bill while the last bay section waits',
  );
  fitStrong(s);
  until(s, () => row().boiler === 5 && row().logs === 40 && row().rails === 40, 'top up the existing bill');
  assert.equal(row().at, 0);
  assert.equal(invariant(s.w), null);
});
