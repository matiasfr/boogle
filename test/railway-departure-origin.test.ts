// Running-side review P1: accepted rows, including a late join/save, own the departure track.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LINE2 } from '../src/sim/railway-lines.ts';
import { TRAIN_PHASE, trainArrives } from '../src/sim/railway-train.ts';
import { endMoved, stopMoved, trainStepLine, trainRowBroken } from '../src/sim/railway-trains.ts';
import { line2Lat } from '../src/entities/railway/line2-path.ts';
import { FixtureLine, line2Stops, standingAt } from './helpers/rail-rows.ts';
import { buildSeedWorld, train, restore, advance } from './helpers/rail.ts';
import { railRoom } from './helpers/rail-room.ts';

// Reviewer case: the resident remembered Far Head; a fresh view given the same row drew it 4 m away.
test('a late view reads the Far Head departure from the accepted row after Q6', () => {
  const row = { track: 1, origin: 52400 };
  assert.equal(line2Lat(row, 524, line2Stops(6)), 0);
  assert.equal(line2Lat(structuredClone(row), 524, line2Stops(6)), 0);
});

test('arrival sets the origin, Q6 and a replan retain it, the next halt clears it', () => {
  const f = new FixtureLine(line2Stops(5), 0, 0);
  f.rows = [{ ...standingAt(f.stops, 1, 0), phase: TRAIN_PHASE.RUN, to: 2, dest: f.stops[2]! }];
  // One train isolates the lifecycle from holds by other trains.
  f.line = { ...f.line, trains: 1, fleet: undefined };
  const arrival = trainArrives(f.rows[0]!, f.line);
  trainStepLine(f.io(), f.line, arrival);
  assert.equal(f.rows[0]!.origin, 52400);
  f.stops = line2Stops(6);
  endMoved(f.io(), f.line, 2, arrival);
  f.restore();
  assert.equal(f.rows[0]!.origin, 52400);
  for (let tick = arrival + 1; tick < arrival + 1000; tick++) {
    trainStepLine(f.io(), f.line, tick);
    if (f.rows[0]!.phase === TRAIN_PHASE.STAND && f.rows[0]!.at === 0) break;
    assert.equal(f.rows[0]!.origin, 52400);
  }
  assert.equal(f.rows[0]!.at, 0);
  assert.equal(f.rows[0]!.origin, 0);
});

test('a moved Railhead keeps its old departure coordinate at a signal', () => {
  const f = new FixtureLine(line2Stops(7));
  f.rows[1] = standingAt(f.stops, 4, 1);
  const origin = f.rows[1]!.from;
  f.stops = line2Stops(7, 1);
  stopMoved(f.io(), f.line, 4, 1);
  assert.equal(f.rows[1]!.at, -1);
  assert.equal(f.rows[1]!.origin, origin);
  assert.equal(trainRowBroken(f.rows[1]!, f.line, f.stops, 32), null);
});

test('departure origins survive server save, replication, late join and reconnect', () => {
  const seed = buildSeedWorld('trains-on');
  while (train(seed.w, 1).origin !== 52400) {
    assert.ok(seed.t < 100000, 'the first train reaches Far Head');
    advance(seed, 1);
  }
  const original = train(seed.w, 1);
  assert.equal(original.origin, 52400);
  const saved = restore(seed.w);
  assert.equal(train(saved, 1).origin, original.origin);
  const room = railRoom({ ...seed, w: saved });
  const resident = room.join('a', 'a');
  room.ready();
  const late = room.join('b', 'b');
  room.ready();
  for (const c of [resident, late]) assert.equal(train(c.adapter.read.world(), 1).origin, original.origin);
  resident.disconnect();
  resident.reconnect();
  room.run(4);
  assert.equal(train(resident.adapter.read.world(), 1).origin, original.origin);
});

test('the save check refuses malformed or wrong-way departure origins', () => {
  const stops = line2Stops(7);
  const good = standingAt(stops, 4, 1);
  for (const origin of [-1, 1.5, 12345, stops[4]! + 1, NaN])
    assert.equal(trainRowBroken({ ...good, origin }, LINE2, stops, 32), 'railway: train');
  assert.equal(trainRowBroken({ ...good, track: 0 }, LINE2, stops, 32), 'railway: train');
});
