// The town facts (src/sim/town-facts.ts) on the accepted-op fixtures `dev/look/rail-seed.ts` seeds from.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOWN_FACTS,
  newestTownFact,
  townHas,
  townLevel,
  townPopulation,
  townRead,
  townReadOf,
  type TownFact,
} from '../src/sim/town-facts.ts';
import type { Railway } from '../src/sim/railway.ts';
import { railJobs } from '../src/sim/railway-line.ts';
import { line2Completed, line2Trains } from '../src/sim/railway-line2.ts';
import { createRailway, railApply, railSession } from './railway-live.ts';
import { act, advance, logs, railwayAtQ2 } from './helpers/railway-q2.ts';
import { railwayAtTrains } from './helpers/railway-trains.ts';

// Each fixture is built once and only read.
const once = <T>(make: () => T) => {
  let v: T | undefined;
  return () => (v ??= make());
};
const atPath = once(() => railwayAtPath());
const atQ1 = once(() => railwayAtQ2().s);
const atTrains = once(() => railwayAtTrains('trains-on').s);
const atPier = once(() => railwayAtTrains('q6-done').s);
const facts = (s: Railway) => TOWN_FACTS.filter((f) => townHas(townRead(s), f));
/** Line one played to T3 laid, the forge not yet fed: railwayAtQ2's first half. */
function railwayAtPath(): Railway {
  const s = createRailway();
  for (const pid of ['a', 'b']) railSession(s, pid, 1);
  railApply(s, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  const w = { s, t: 40 };
  logs(w, 'a', 'T1', 24);
  advance(w, 300);
  for (let i = 0; i < 8;) {
    const n = act(w, 'b', 'rail.mine', { id: s.line!.rocks.findIndex((r) => r > 0) });
    assert.equal(act(w, 'b', 'rail.deposit', { station: 'T2', kind: 1, n }), n);
    i += n;
  }
  logs(w, 'a', 'T2', 32);
  advance(w, 300);
  logs(w, 'a', 'T3', 40);
  act(w, 'a', 'rail.axe');
  for (let i = 0; i < 12; i++) act(w, 'a', 'rail.beamChop');
  act(w, 'a', 'rail.beamTake', { revision: s.line!.beam.revision });
  assert.equal(act(w, 'a', 'rail.beamDeposit', { revision: s.line!.beam.revision, station: 'T3' }), 1);
  advance(w, 600);
  return s;
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

test("the adapter's read model gives the same facts as the state", () => {
  for (const s of [createRailway(), atPath(), atQ1(), atPier()]) {
    const shaped = {
      stations: railJobs(s).map((j) => ({ completion: j.completion })),
      line2: { forge: { lit: s.line2!.forge.lit }, completed: line2Completed(s), trains: line2Trains(s) },
    };
    assert.deepEqual(townReadOf(shaped), townRead(s));
  }
});
