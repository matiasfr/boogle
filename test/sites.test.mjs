// Work sites (src/sim/sites.js) and tiers (src/sim/tiers.js): pours fill rings up to their cost, a full Helper ring
// builds a hut, plaque points keep their remainder so rounding never loses credit, tiers follow points, and
// serialize/load round-trips with the same hash.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSites, ringRoom, stock, pointsOf, serializeSites, loadSites, hashSites } from '../src/sim/sites.js';
import { TRACK, HELPER, costOf } from '../src/sim/route.js';
import { tierOf, TIERS } from '../src/sim/tiers.js';

test('rings take up to their cost; a full Helper ring builds the hut and closes', () => {
  const st = createSites();
  assert.equal(ringRoom(st, 0, TRACK), costOf(0, TRACK));
  stock(st, 0, TRACK, 0, 50);
  assert.equal(ringRoom(st, 0, TRACK), costOf(0, TRACK) - 50);
  const r = stock(st, 0, HELPER, 1, costOf(0, HELPER));
  assert.equal(r.built, true);
  assert.equal(st.list[0].helpers, 1);
  assert.equal(st.list[0].stock[HELPER], 0);
  assert.equal(ringRoom(st, 0, HELPER), 0);
});

test('plaque points: 1 point per 1% of a section, remainders carried so 60 single logs make exactly 100', () => {
  const st = createSites();
  for (let k = 0; k < 60; k++) stock(st, 0, TRACK, 3, 1);
  assert.equal(pointsOf(st, 3), 100);
  assert.deepEqual(st.list[0].plaque, [[3, 100, 0]]);
  stock(st, 1, TRACK, 3, 1);
  assert.equal(pointsOf(st, 3), 101, 'one log is 1.67 points: 1 now, the rest carried');
  assert.equal(st.list[1].plaque[0][2], 40);
});

test('tiers follow points and only rise with them', () => {
  assert.equal(tierOf(0), -1);
  assert.equal(tierOf(24), -1);
  assert.equal(tierOf(25), 0);
  assert.equal(tierOf(99), 0);
  assert.equal(tierOf(100), 1);
  assert.equal(tierOf(1e9), TIERS.length - 1);
});

test('serialize/load round-trips with the same hash; bad data throws', () => {
  const st = createSites();
  stock(st, 0, TRACK, 0, 7);
  stock(st, 0, HELPER, 2, 5);
  const t = createSites();
  loadSites(t, JSON.parse(JSON.stringify(serializeSites(st))));
  assert.equal(hashSites(t), hashSites(st));
  assert.deepEqual(serializeSites(t), serializeSites(st));
  assert.notEqual(hashSites(createSites()), hashSites(st));
  assert.throws(() => loadSites(t, { a: 0, o: 0, s: [[1, 2, 3]] }), /bad site/);
  assert.throws(() => loadSites(t, { a: 0, o: 0, s: [[0, 0, 0, 0, 0, 0, -1, -1, 0, [1, 2]]] }), /bad plaque/);
});

// The whole loop on the real rules in local mode: shake, pour, run, lay, refill, and the age change at the end.
import { createSync } from '../src/world/sync.js';
import { installRules } from '../src/world/rules/index.js';
import { homeLand } from './helpers/land.mjs';
import { FULL } from '../src/sim/sources.js';
import { RUN_BONUS } from '../src/sim/sites.js';
import { lengthOf, MACHINE_RUN } from '../src/sim/scripted-run.js';

test('a run lays its section, credits the starter, refills sources and opens the next site; the age then moves on', () => {
  const s = createSync({ env: { canPlantAt: () => true } });
  s.setSelfId('a');
  s.setPid('ana');
  const rules = installRules(s, homeLand());
  const step = (e, n = 3) => {
    if (e) assert.equal(s.submitEdit(e), true, JSON.stringify(e));
    for (let k = 0; k < n; k++) s.updateWorld(0.1);
  };
  step(null, 2);
  for (let t = 0; t < 15; t++) step({ op: 'src.take', i: 0, j: 0, id: t }); // 60 logs
  assert.equal(rules.stacks.count('ana'), 60);
  assert.equal(rules.sources.charges(0), FULL - 1);
  step({ op: 'site.stock', i: 0, j: 0, s: 0, ring: TRACK, n: 60 });
  assert.equal(rules.sites.canRun(0), true);
  step({ op: 'site.run', i: 0, j: 0, s: 0 });
  assert.equal(s.submitEdit({ op: 'site.run', i: 0, j: 0, s: 0 }), false, 'already running');
  step(null, lengthOf(MACHINE_RUN));
  const st = rules.sites.sites;
  assert.equal(rules.sites.isDone(0), true);
  assert.equal(st.open, 1);
  assert.equal(rules.sites.points('ana'), 100 + RUN_BONUS);
  assert.equal(rules.sources.charges(0), FULL, 'R1 refilled every palm');
  // Lay the other two by freight; keep some logs on your back for the age change.
  for (let t = 15; t < 18; t++) step({ op: 'src.take', i: 0, j: 0, id: t }); // 12 logs
  for (const site of [1, 2]) {
    rules.sites.addFreight(60);
    step({ op: 'site.run', i: 0, j: 0, s: site }, lengthOf(MACHINE_RUN) + 3);
  }
  assert.equal(st.open, 3);
  assert.equal(rules.sites.age(), 1, 'the wood age is over');
  assert.equal(rules.stacks.count('ana'), 0, 'the leftover logs poured themselves');
  assert.equal(st.list[2].poured, 12);
  assert.equal(st.list[2].plaque.find((r) => r[0] === 0)[1], 20 + RUN_BONUS);
  assert.equal(rules.sources.charges(0), 0, 'no iron sources yet');
});
