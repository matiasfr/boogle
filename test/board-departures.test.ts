// The departures board's timetable (src/proto/board/departures.ts) agrees with wagonAt: a call it promises is a dwell.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dwells, nextCall } from '../src/proto/board/departures.ts';
import { wagonAt, wagonCycle } from '../src/sim/wagon.ts';

test('every stop is called at each way it can leave, and the ends one way only', () => {
  for (const laid of [1, 2, 3]) {
    const d = dwells(laid);
    assert.equal(d.length, 2 * laid);
    assert.equal(nextCall(laid, 0, -1, 0), null);
    assert.equal(nextCall(laid, laid, 1, 0), null);
    for (let k = 1; k < laid; k++) for (const dir of [1, -1] as const) assert.ok(nextCall(laid, k, dir, 0));
  }
  assert.equal(nextCall(0, 0, 1, 0), null);
});

test('the promised call is where the wagon really stands', () => {
  for (const laid of [1, 2, 3]) {
    const cycle = wagonCycle(laid);
    for (let now = -cycle; now < 2 * cycle; now += 37.5)
      for (let k = 0; k <= laid; k++)
        for (const dir of [1, -1] as const) {
          const c = nextCall(laid, k, dir, now);
          if (!c) continue;
          assert.ok(c.arrive >= 0 && c.arrive < cycle && c.leave > c.arrive, `laid ${laid} at ${now}`);
          const w = wagonAt(laid, now + c.arrive + 0.5 * Math.min(1, c.leave - c.arrive))!;
          assert.equal(w.stop, k);
          assert.equal(w.dir, dir);
          assert.notEqual(wagonAt(laid, now + c.leave + 0.5)!.stop, k);
        }
  }
});
