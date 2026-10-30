// Settled water sleeps (DESIGN.md: "sleep settled regions"): on the real home land with the real rules, nothing
// re-wakes the water sim every tick (the ground copy, the sea pin), and a reload sleeps again.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSync } from '../src/world/sync.js';
import { installRules } from '../src/world/rules/index.js';
import { homeLand } from './helpers/land.mjs';

const SETTLE_TICKS = 40; // an untouched island or a reload must be fully asleep again within this many ticks

function peer() {
  const s = createSync({ env: { canPlantAt: () => true } });
  s.setSelfId('a');
  return { s, rules: installRules(s, homeLand()) };
}
const tick = (x, n = 1) => x.s.updateWorld(n * 0.1); // local mode: whole 100 ms ticks, edits apply next tick
function settles(x, what) {
  const { water } = x.rules.water;
  for (let k = 0; k < SETTLE_TICKS && water.stats().active; k++) tick(x);
  assert.equal(water.stats().active, 0, `${what}: still ${water.stats().active} active cells`);
  tick(x, 20); // and stays asleep (the sea pin and evaporation run in here)
  assert.equal(water.stats().active, 0, `${what}: woke up again`);
}

test('the idle island sleeps, and a reload sleeps again', () => {
  const x = peer();
  settles(x, 'idle island');

  // A reload wakes every wet cell (state-equivalent, src/sim/water.js); they fall asleep again.
  const y = peer();
  y.s.loadSnapshot(x.s.snapshot());
  assert.ok(y.rules.water.water.stats().active > 0);
  settles(y, 'after a snapshot load');
});
