import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consistOf, consistBounds, offsetOf, TRAIN_TAIL_M } from '../src/entities/railway/cars.ts';
for (const line of [0, 1])
  for (const wagon of [false, true])
    for (const steel of [false, true]) {
      test(`legacy consist line ${line}, wagon ${wagon}, steel ${steel}`, () => {
        const actual = consistOf({ line, wagon, steel });
        assert.deepEqual(
          actual.map((c) => c.role),
          ['engine', 'player', 'kit', ...(wagon ? ['wagon'] : []), ...(steel ? ['steel'] : [])],
        );
        assert.deepEqual(
          actual.map((c) => c.offset),
          [4.2, 0, -3.7, ...(wagon ? [-7.4] : []), ...(steel ? [wagon ? -7.4 - 3.7 : -7.4] : [])],
        );
        assert.deepEqual(
          actual.map((c) => c.spec),
          [
            { hx: 1, hz: 2, top: 1.295 },
            { hx: 1.1, hz: 1.6, top: 0.7 },
            { hx: 1.1, hz: 1.6, top: 0.7 },
            ...(wagon ? [{ hx: 1.1, hz: 1.6, top: 0.5 }] : []),
            ...(steel ? [{ hx: 1.1, hz: 1.6, top: 0.7 }] : []),
          ],
        );
        assert.equal(consistOf({ line, wagon, steel }), actual);
        assert.deepEqual(consistBounds(actual), {
          lo: steel && wagon ? -12.700000000000001 : steel || wagon ? -9 : -5.300000000000001,
          hi: 6.2,
        });
        assert.equal(
          Math.min(...actual.map((c) => c.offset - c.spec.hz)),
          steel && wagon ? -12.700000000000001 : steel || wagon ? -9 : -5.300000000000001,
        );
        assert.equal(offsetOf(actual, 'player'), 0);
      });
    }
test('legacy maximum tail', () => assert.equal(TRAIN_TAIL_M, 12.700000000000001));
