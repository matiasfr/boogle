// The snapshot budget (brief 10 M9): with every state filled to its caps, a saved world stays under 60 KB, so the
// pagehide upload still gets fetch keepalive (src/world/sync.ts persist) and snapshots stay quick to serve.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSync } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { homeLand } from './helpers/land.mjs';
import { setWho, MAX_PLAYERS } from '../src/sim/roster.ts';
import { addTo, HARD_CAP } from '../src/sim/stacks.ts';
import { MAX_PILES, MAX_N } from '../src/sim/piles.ts';
import { MAX_ITEMS, tossItem } from '../src/sim/gifts.ts';
import { plant, MAX_PLOTS, PATCH } from '../src/sim/mushrooms.ts';
import { TRACK, HELPER, costOf } from '../src/sim/route.ts';

const BUDGET = 60000;

test('a world filled to every cap serializes under 60 KB', () => {
  const s = createSync({ env: { canPlantAt: () => true } });
  s.setSelfId('a');
  const rules = installRules(s, homeLand());
  s.updateWorld(0.1); // the layout-sized states (sources) size themselves on the first tick
  const r = rules.roster.roster;
  for (let k = 0; k < MAX_PLAYERS; k++)
    setWho(r, `p${String(k).padStart(9, '0')}`, `Player name ${k}`.padEnd(16, 'x'), k % 8);
  for (let k = 0; k < MAX_PLAYERS; k++) addTo(rules.stacks.stacks, k, 0, HARD_CAP);
  const piles = rules.piles.piles;
  for (let k = 0; k < MAX_PILES; k++)
    piles.list.push({ id: piles.nextId++, i: 100 + (k % 16) * 9, j: 100 + Math.floor(k / 16) * 9, k: k % 7, n: MAX_N });
  for (const site of rules.sites.sites.list) {
    site.stock = [costOf(0, TRACK), costOf(0, HELPER) - 1];
    Object.assign(site, { used: 999999, poured: 999999, freight: 999999, helpers: 1, t0: 9999999, starter: 255 });
    site.plaque = Array.from({ length: MAX_PLAYERS }, (_, k) => [k, 99999, 59]);
  }
  const g = rules.gifts.gifts;
  for (let k = 0; k < MAX_ITEMS; k++) tossItem(g, k % 3, 200 + k, 200, 12345, 9999999);
  for (let k = 0; k < MAX_PLOTS; k++)
    plant(rules.mushrooms.garden, PATCH.i0 + (k % 7) * 3, PATCH.j0 + Math.floor(k / 7) * 3);
  rules.bank.bank.ms = 9_999_999_999;
  rules.ball.ball.p = [-25500, 19999, 25500];
  rules.ball.ball.at = 99_999_999;
  s.world.tick = 99_999_999;
  const json = JSON.stringify(s.snapshot());
  const sizes = Object.fromEntries(Object.entries(s.snapshot().data).map(([k, v]) => [k, JSON.stringify(v).length]));
  assert.ok(json.length < BUDGET, `${json.length} chars: ${JSON.stringify(sizes)}`);
  assert.equal(r.pids.length, MAX_PLAYERS);
  assert.equal(piles.list.length, MAX_PILES);
  assert.ok(rules.mushrooms.garden.plots.length >= MAX_PLOTS - 5, 'the garden is (nearly) full');
  console.log(`[world-size] ${json.length} chars at the caps: ${JSON.stringify(sizes)}`);
});
