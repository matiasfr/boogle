import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chargeOf } from '../src/player/throw-curve.ts';

test('elapsed time cannot undercharge or overcharge a throw', () => {
  assert.equal(chargeOf(5000), 1);
  assert.equal(chargeOf(-20), 0);
});
