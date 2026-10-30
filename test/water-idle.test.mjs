// Settled water sleeps (DESIGN.md: "sleep settled regions"): on the real home land with the real rules, nothing
// re-wakes the water sim every tick (the ground copy, the sea pin), and a dig wakes only the cells it touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSync } from '../src/world/sync.js';
import { installRules } from '../src/world/rules/index.js';
import { homeLand } from './helpers/land.mjs';

const SETTLE_TICKS = 40; // an untouched island, a dig or a reload must be fully asleep again within this many ticks

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

test('the idle island sleeps; a dig wakes its own cells only, then sleeps again', () => {
  const x = peer();
  settles(x, 'idle island');

  // A sand cell inside the water region, next to wet cells, with a 5x5 margin of sand around it.
  const { n, mask } = x.rules.terrain.state;
  const { water, region } = x.rules.water;
  const { i0, j0, w: W, h: H } = region;
  let at = null;
  for (let a = 4; a < W - 4 && !at; a++)
    for (let b = 4; b < H - 4 && !at; b++) {
      const sand = [-2, -1, 0, 1, 2].every((da) =>
        [-2, -1, 0, 1, 2].every((db) => mask[(a + da + i0) * n + b + db + j0]),
      );
      if (sand && water.depth[(a + 3) * H + b] > 0) at = [a, b];
    }
  assert.ok(at, 'no sand next to water in the region');
  let changed = null;
  x.s.onApplied((e, t, cells) => e.op === 'dig' && (changed = cells));
  assert.ok(x.s.submitEdit({ op: 'dig', i: at[0] + i0, j: at[1] + j0 }));
  tick(x); // applies the dig, copies its ground and steps the water once

  assert.ok(changed?.length > 0, 'the dig changed no cells');
  const near = new Set(); // the changed cells and their 2-ring: wake(r = 1), then one step can wake one more ring
  for (const g of changed) {
    const a = ((g / n) | 0) - i0,
      b = (g % n) - j0;
    assert.ok(water.isActive(a * H + b), `changed cell ${a},${b} asleep`);
    for (let da = -2; da <= 2; da++) for (let db = -2; db <= 2; db++) near.add((a + da) * H + b + db);
  }
  const active = [];
  for (let c = 0; c < W * H; c++) if (water.isActive(c)) active.push(c);
  assert.deepEqual(
    active.filter((c) => !near.has(c)),
    [],
    'cells woken away from the dig',
  );
  settles(x, 'after the dig');

  // A reload wakes every wet cell (state-equivalent, src/sim/water.js); they fall asleep again.
  const y = peer();
  y.s.loadSnapshot(x.s.snapshot());
  assert.ok(y.rules.water.water.stats().active > 0);
  settles(y, 'after a snapshot load');
});
