// Review round two: platform authority must follow an accepted old-end departure through line growth.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LINE2, RAIL_HALTS, RAIL_LINES, TRAIN_EXTENT, type RailPlatform } from '../src/sim/railway-lines.ts';
import { Train } from '../src/sim/railway-components.ts';
import { LINE_SLOTS, retainedEndBlock } from '../src/sim/railway-trains.ts';
import { railCallReady, railPlatformEnd, railServing } from '../src/sim/railway-queries-trains.ts';
import { leverPlatform } from '../src/entities/railway/lever-place.ts';
import { line2Lat } from '../src/entities/railway/line2-path.ts';
import { railValid, type Actor } from '../src/world/railway-server.ts';
import { TRAIN_PHASE } from '../src/sim/railway-train.ts';
import { endTransitions } from './helpers/rail-transitions.ts';
import { standingAt, line2Stops } from './helpers/rail-rows.ts';
import { act, buildSeedWorld, trainId } from './helpers/rail.ts';

buildSeedWorld('deck-laid');
const id = RAIL_HALTS.findIndex((h) => h.line === LINE2 && h.stop === 3);
const slot = LINE_SLOTS[LINE2]![1]!;
const actorAt = (p: RailPlatform): Actor => ({
  reach: (x, z, r) => (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z) <= r * r,
  height: (y, r) => Math.abs(p.y - y) <= r,
  cadence: () => true,
});
const fixture = () => {
  const s = buildSeedWorld('deck-laid');
  Object.assign(s.w.mut(Train, trainId(s.w, slot))!, standingAt(line2Stops(6), 3, 1, s.t));
  return s;
};

test('the Pier lever still boards the retained east-side train selected after Q7', () => {
  const s = fixture();
  assert.equal(railServing(s.w, LINE2, 3, -1, s.t), slot);
  const row = s.w.get(Train, trainId(s.w, slot))!;
  assert.equal(row.origin, 72650);
  assert.equal(line2Lat(row, 730, line2Stops(7)), 0);
  assert.equal(
    railValid(
      s.w,
      { op: 'rail.call', epoch: 1, request: 1, id, dir: -1 },
      actorAt(RAIL_LINES[LINE2]!.halts[3]!.platforms[0]),
      s.t,
    ),
    true,
  );
  assert.equal(act(s, 'a', 'rail.call', { id, dir: -1 }), 1);
  assert.deepEqual(leverPlatform(s.w, id, -1, s.t), RAIL_LINES[LINE2]!.halts[3]!.platforms[0]);
});

test('the server refuses a west-only reach point while the Pier departure still occupies the old path', () => {
  const s = fixture();
  const [east, west] = RAIL_LINES[LINE2]!.halts[3]!.platforms;
  const valid = (p: RailPlatform) =>
    railValid(s.w, { op: 'rail.call', epoch: 1, request: 1, id, dir: -1 }, actorAt(p), s.t);
  assert.equal(valid({ ...west, x: west.x - 1000 }), false);
  assert.equal(valid({ ...east, x: east.x + 1000 }), true);
});

for (const { name, before, after } of endTransitions) {
  test(`${name}: accepted platform authority waits for full retained-block clearance`, () => {
    const s = fixture();
    for (const k of LINE_SLOTS[LINE2]!) s.w.mut(Train, trainId(s.w, k))!.origin = 0;
    const stop = before.length - 1;
    const row = s.w.mut(Train, trainId(s.w, slot))!;
    Object.assign(row, standingAt(before, stop, 1, s.t));
    const block = retainedEndBlock(row, LINE2, s.t)!;
    assert.ok(block);
    assert.equal(railPlatformEnd(s.w, LINE2, stop, s.t, after), true, 'retained stand');
    if (before.length !== after.length) {
      assert.equal(railCallReady(s.w, LINE2, stop, -1, s.t, after), true, 'old-side boarding still offered');
      assert.equal(railCallReady(s.w, LINE2, stop, 1, s.t, after), false, 'onward lever chained');
      assert.equal(railServing(s.w, LINE2, stop, -1, s.t, after), slot, 'retained train answers');
    }
    // A late mirror computes the same authority, without a tab-local remembered platform.
    assert.equal(railPlatformEnd(s.w.clone(), LINE2, stop, s.t, after), true, 'late mirror');
    row.from = row.dest = block.from - TRAIN_EXTENT.aheadCm + 1;
    assert.equal(railPlatformEnd(s.w, LINE2, stop, s.t, after), true, 'last centimetre still in block');
    if (before.length !== after.length)
      assert.equal(
        railCallReady(s.w, LINE2, stop, -1, s.t, after),
        false,
        'left platform, not clear: neither lever invites',
      );
    row.from = row.dest = block.from - TRAIN_EXTENT.aheadCm;
    assert.equal(railPlatformEnd(s.w, LINE2, stop, s.t, after), stop === after.length - 1, 'full clearance');
    if (before.length !== after.length) {
      Object.assign(row, standingAt(before, stop, 0, s.t), {
        phase: TRAIN_PHASE.RUN,
        turn: true,
        from: before[stop]! - 100,
        dest: before[stop]!,
        origin: 0,
      });
      assert.equal(railPlatformEnd(s.w, LINE2, stop, s.t, after), true, 'committed inbound turn');
      assert.equal(railCallReady(s.w, LINE2, stop, -1, s.t, after), true, 'arrival still boards on old side');
      assert.equal(railServing(s.w, LINE2, stop, -1, s.t, after), slot, 'committed turn answers');
    }
  });
}

test('a pending Far Head turn keeps homeward authority and refuses an onward lever until clear', () => {
  const s = buildSeedWorld('q6-done');
  const stop = 2;
  for (const k of LINE_SLOTS[LINE2]!) s.w.mut(Train, trainId(s.w, k))!.origin = 0;
  const halt = RAIL_HALTS.findIndex((h) => h.line === LINE2 && h.stop === stop);
  const row = s.w.mut(Train, trainId(s.w, slot))!;
  Object.assign(row, standingAt(line2Stops(5), stop, 0, s.t), {
    phase: TRAIN_PHASE.RUN,
    turn: true,
    from: 52300,
    dest: 52400,
    origin: 0,
  });
  const [east, west] = RAIL_LINES[LINE2]!.halts[stop]!.platforms;
  assert.deepEqual(leverPlatform(s.w, halt, -1, s.t), east);
  assert.equal(railServing(s.w, LINE2, stop, -1, s.t), slot, 'pending old-end arrival serves its homeward lever');
  assert.equal(railValid(s.w, { op: 'rail.call', epoch: 1, request: 1, id: halt, dir: 1 }, actorAt(east), s.t), false);
  assert.equal(railValid(s.w, { op: 'rail.call', epoch: 1, request: 1, id: halt, dir: -1 }, actorAt(east), s.t), true);
  Object.assign(row, standingAt(line2Stops(6), 0, 0, s.t));
  assert.deepEqual(leverPlatform(s.w, halt, -1, s.t), west);
  assert.equal(railValid(s.w, { op: 'rail.call', epoch: 1, request: 1, id: halt, dir: 1 }, actorAt(east), s.t), true);
});

test('the old Pier lever cannot invite a future west-side train after its east train has left', () => {
  const s = fixture();
  const row = s.w.mut(Train, trainId(s.w, slot))!;
  Object.assign(row, { phase: TRAIN_PHASE.RUN, to: 1, dest: 17400 });
  assert.ok(retainedEndBlock(row, LINE2, s.t + 5));
  assert.equal(railServing(s.w, LINE2, 3, -1, s.t + 5), -1, 'no future other-side assignment while blocked');
  assert.equal(railCallReady(s.w, LINE2, 3, -1, s.t + 5), false);
  const east = RAIL_LINES[LINE2]!.halts[3]!.platforms[0];
  assert.equal(railValid(s.w, { op: 'rail.call', epoch: 1, request: 1, id, dir: -1 }, actorAt(east), s.t + 5), false);
});
