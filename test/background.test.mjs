import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBackgroundAdvance } from '../src/world/background.ts';

test('background advance: slices elapsed time, caps catch-up, does not double count', () => {
  const calls = [];
  const adv = createBackgroundAdvance((dt) => calls.push(dt), 0);
  adv(1000, true);
  assert.ok(calls.every((d) => d <= 0.4 + 1e-9));
  assert.ok(Math.abs(calls.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  calls.length = 0;
  adv(1500, false); // visible: time passes but nothing is fed
  adv(1600, true);
  assert.ok(Math.abs(calls.reduce((a, b) => a + b, 0) - 0.1) < 1e-9);
  calls.length = 0;
  adv(1600 + 600000, true); // throttled for 10 minutes
  assert.ok(Math.abs(calls.reduce((a, b) => a + b, 0) - 5) < 1e-9);
});
