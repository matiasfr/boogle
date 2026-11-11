// The town facts (src/sim/town-facts.ts) on the accepted-op fixtures `dev/look/rail-seed.ts` seeds from, read from the
// rows (townRead).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOWN_FACTS,
  newestTownFact,
  townHas,
  townLevel,
  townPopulation,
  townRead,
  type TownFact,
} from '../src/sim/town-facts.ts';
import type { World } from '../src/ecs/index.ts';
import {
  act,
  advance,
  apply,
  beam,
  buildSeedWorld,
  createRailway,
  logs,
  railSession,
  rocks,
  type Seed,
} from './helpers/rail.ts';

// Each fixture is built once and only read.
const once = <T>(make: () => T) => {
  let v: T | undefined;
  return () => (v ??= make());
};
const atPath = once(() => railwayAtPath());
const atQ1 = once(() => buildSeedWorld('q1-done').w);
const atTrains = once(() => buildSeedWorld('trains-on').w);
const atPier = once(() => buildSeedWorld('q6-done').w);
const facts = (s: World) => TOWN_FACTS.filter((f) => townHas(townRead(s), f));
/** Line one played to T3 laid, the forge not yet fed: railwayAtQ2's first half. */
function railwayAtPath(): World {
  const w = createRailway();
  for (const pid of ['a', 'b']) railSession(w, pid, 1);
  apply(w, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  const s: Seed = { w, t: 40 };
  logs(s, 'a', 'T1', 24);
  advance(s, 300);
  for (let i = 0; i < 8;) {
    const n = act(s, 'b', 'rail.mine', { id: rocks(w).findIndex((r) => r.left > 0) });
    assert.equal(act(s, 'b', 'rail.deposit', { station: 'T2', kind: 1, n }), n);
    i += n;
  }
  logs(s, 'a', 'T2', 32);
  advance(s, 300);
  logs(s, 'a', 'T3', 40);
  act(s, 'a', 'rail.axe');
  for (let i = 0; i < 12; i++) act(s, 'a', 'rail.beamChop');
  act(s, 'a', 'rail.beamTake', { revision: beam(w).revision });
  assert.equal(act(s, 'a', 'rail.beamDeposit', { revision: beam(w).revision, station: 'T3' }), 1);
  advance(s, 600);
  return w;
}

test('a fresh railway has no facts and 12 people', () => {
  const s = createRailway();
  assert.deepEqual(facts(s), []);
  assert.equal(newestTownFact(townRead(s)), null);
  assert.equal(townLevel(townRead(s)), 0);
  assert.equal(townPopulation(townRead(s)), 12);
});

test('the first path opens on T3 completion: path, 20 people', () => {
  const s = atPath();
  assert.deepEqual(facts(s), ['path']);
  assert.equal(townPopulation(townRead(s)), 20);
});

test('q1-done: path, forge, depot', () => {
  const s = atQ1();
  assert.deepEqual(facts(s), ['path', 'forge', 'depot']);
  assert.equal(townPopulation(townRead(s)), 20);
});

test('trains-on adds trains', () => {
  const s = atTrains();
  assert.deepEqual(facts(s), ['path', 'forge', 'depot', 'head', 'trains']);
  assert.equal(townPopulation(townRead(s)), 26);
});

test('q6-done: every milestone fact, 32 people', () => {
  const s = atPier();
  assert.deepEqual(facts(s), ['path', 'forge', 'depot', 'head', 'trains', 'pier']);
  assert.equal(townLevel(townRead(s)), 6);
  assert.equal(townPopulation(townRead(s)), 32);
});

test('town and stone stay false (until slice 5 brings train cargo)', () => {
  const r = townRead(atPier());
  assert.equal(townHas(r, 'town'), false);
  assert.equal(townHas(r, 'stone'), false);
});

test('newest is the last true fact in TOWN_FACTS order', () => {
  assert.equal(newestTownFact(townRead(atPath())), 'path');
  assert.equal(newestTownFact(townRead(atQ1())), 'depot');
  assert.equal(newestTownFact(townRead(atTrains())), 'trains');
  assert.equal(newestTownFact(townRead(atPier())), 'pier');
  const order: TownFact[] = [...TOWN_FACTS];
  assert.deepEqual(order, ['path', 'forge', 'depot', 'head', 'trains', 'town', 'stone', 'pier']);
});
