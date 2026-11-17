// Owner-requested regression: every allocated fleet slot and consist must fit, including trains still in the shed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RAIL_LINES, RAIL_TRAINS, LINE2 } from '../src/sim/railway-lines.ts';
import { consistOf } from '../src/entities/railway/cars.ts';
import { TRAIN_WHEEL_CAPACITY, WHEELS_PER_CAR, assertWheelCapacity } from '../src/entities/railway/train-capacity.ts';

test('each shared wheel batch fits every line and every consist in the full fleet', () => {
  for (const wagon of [false, true])
    for (const steel of [false, true]) {
      const need = { train: 0, answer: 0 };
      for (const line of RAIL_LINES.keys()) {
        const slots = RAIL_TRAINS.filter((r) => r.line === line).length;
        need[line === LINE2 ? 'answer' : 'train'] += slots * consistOf({ line, wagon, steel }).length * WHEELS_PER_CAR;
      }
      for (const rust of ['train', 'answer'] as const)
        assert.ok(
          TRAIN_WHEEL_CAPACITY[rust] >= need[rust],
          `${rust}: wagon=${wagon}, steel=${steel}, need ${need[rust]}, capacity ${TRAIN_WHEEL_CAPACITY[rust]}`,
        );
    }
});
test('wheel allocation cannot silently drop a vehicle at the capacity boundary', () => {
  assert.doesNotThrow(() => assertWheelCapacity(96, 96));
  assert.throws(() => assertWheelCapacity(100, 96), /Train wheel batch overflow: need 100, capacity 96/);
});
