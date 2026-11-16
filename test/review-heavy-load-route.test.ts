// Regression reduced from the parent's unmodified railway-route-rules gate 14.
// Keep the original accepted action sequence: two players take logs, take rails, then feed every tick.
// docs/plans/greybox-route.md: gate 14 requires <= 3,700 ticks from the rivet to High Gorge.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ringRivetSequence } from './helpers/railway-rivet-sequence.ts';
import { apply, invariant } from '../src/sim/railway-drive.ts';
import { advance } from '../src/sim/railway-seed-route.ts';
import { account, rail } from '../src/sim/railway-rows.ts';
import { legRow } from '../src/sim/railway-queries-route.ts';

test('review: deliberate mixed overfill retains the existing High Gorge delivery timing bound', (t) => {
  const s = ringRivetSequence();
  const start = s.t;
  const idle: number[] = [];
  let ready = s.t,
    complete = -1;
  while (legRow(s.w, 0).laid < 4) {
    assert.ok(s.t - start < 12000, 'the leg completes');
    const g = legRow(s.w, 0),
      laid = g.laid;
    if (complete < 0 && g.logs + rail(s.w).depot >= 20 && g.rails + rail(s.w).depotRails >= 20) complete = s.t;
    if (g.start < 0) {
      for (const pid of ['a', 'b']) {
        for (const op of ['rail.depotTake', 'rail.depotRailTake', 'rail.legStock']) {
          const a = account(s.w, pid)!;
          apply(s.w, pid, { op, epoch: a.epoch, request: a.request + 1, leg: 0 }, s.t);
        }
      }
    }
    advance(s, 1);
    if (legRow(s.w, 0).laid > laid) {
      idle.push(complete - ready);
      ready = s.t;
      complete = -1;
    }
  }
  assert.equal(invariant(s.w), null);
  t.diagnostic(`rivet to Gorge ${s.t - start}; idle per frame ${idle.join(', ')}`);
  assert.ok(s.t - start <= 3700, `High Gorge took ${s.t - start} ticks; existing bound is 3700`);
  assert.ok(idle[0]! <= 1200, 'first frame idle bound');
  for (const n of idle.slice(1)) assert.ok(n <= 600, `later frame idle ${n} exceeds 600`);
});
