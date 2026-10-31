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
  assert.deepEqual(t, st);
  assert.notEqual(hashSites(createSites()), hashSites(st));
  assert.throws(() => loadSites(t, { a: 0, o: 0, s: [[1, 2, 3]] }), /bad site/);
  assert.throws(() => loadSites(t, { a: 0, o: 0, s: [[0, 0, 0, 0, 0, 0, -1, -1, 0, 0, [1, 2]]] }), /bad plaque/);
});
