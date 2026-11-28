import test from 'node:test';
import assert from 'node:assert/strict';
import { act, advance, buildSeedWorld, chopTo, qjob, railSession, unaudited } from './helpers/rail.ts';
import { leaveTimber } from '../src/sim/railway-seed-route.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { QUARRY_YARD, quarryQueued, worksThanks } from '../src/sim/railway-queries-gift.ts';
import { haltYardStock } from '../src/sim/railway-queries-yard.ts';

test('taking the sixteen surplus Quarry logs preserves the donor of the eight promised to Q7', () => {
  const s = unaudited(buildSeedWorld('crossing-done'));
  for (const [pid, quantity] of [
    ['a', 8],
    ['b', 16],
  ] as const) {
    chopTo(s, pid, quantity);
    leaveTimber(s, pid, QUARRY_YARD, quantity);
  }
  railSession(s.w, 'c', 1);
  chopTo(s, 'c', 12);
  assert.equal(act(s, 'c', 'rail.deposit', { station: 'Q7', kind: 0, n: 12 }), 12);
  assert.equal(quarryQueued(s.w), 8);
  const expected = worksThanks(s.w, 3);
  assert.deepEqual(expected, ['a', 'c']);
  assert.equal(act(s, 'b', 'rail.haltTake', { yard: QUARRY_YARD, kind: 0 }), 16);
  assert.equal(haltYardStock(s.w, QUARRY_YARD, 0), 8);
  assert.equal(quarryQueued(s.w), 8);
  for (let ticks = 0; qjob(s.w, 6).stock < 20; ticks++) {
    assert.ok(ticks < 8000);
    advance(s, 1);
    railwayCheck(s.w);
  }
  assert.deepEqual(worksThanks(s.w, 3), expected);
});

test("a player retrieving another donor's entire rail load leaves no frame contribution", () => {
  const s = unaudited(buildSeedWorld('stack-rails'));
  const before = worksThanks(s.w);
  const n = act(s, 'a', 'rail.depotRailTake', { leg: 0 });
  assert.ok(n > 0);
  assert.equal(act(s, 'a', 'rail.haltPut', { yard: 0, kind: 2 }), n);
  railSession(s.w, 'guest', 1);
  assert.equal(act(s, 'guest', 'rail.haltTake', { yard: 0, kind: 2 }), n);
  assert.equal(haltYardStock(s.w, 0, 2), 0);
  railwayCheck(s.w);
  assert.deepEqual(worksThanks(s.w), before);
});
