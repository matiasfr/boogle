// The town facts (src/sim/town-facts.ts) on the accepted-op fixtures `dev/look/rail-seed.ts` seeds from, read from the
// rows (townRead).
import test from 'node:test';
import assert from 'node:assert/strict';
import { TOWN_FACTS, newestTownFact, townHas, townLevel, townRead, type TownFact } from '../src/sim/town-facts.ts';
import { TRADE } from '../src/sim/railway-trade-layout.ts';
import { plotPrice } from '../src/sim/railway-queries-trade.ts';
import { till } from '../src/sim/railway-rows.ts';
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
  logs(s, 'a', 'T3', 32);
  act(s, 'a', 'rail.axe');
  for (let i = 0; i < 12; i++) act(s, 'a', 'rail.beamChop');
  act(s, 'a', 'rail.beamTake', { revision: beam(w).revision });
  assert.equal(act(s, 'a', 'rail.beamDeposit', { revision: beam(w).revision, station: 'T3' }), 1);
  advance(s, 600);
  return w;
}

test('accepted railway milestones expose their facts in order', () => {
  const milestones: [string, () => World, readonly TownFact[]][] = [
    ['fresh', createRailway, []],
    ['T3', railwayAtPath, ['path']],
    ['Q1', () => buildSeedWorld('q1-done').w, ['path', 'forge', 'depot']],
    ['trains', () => buildSeedWorld('trains-on').w, ['path', 'forge', 'depot', 'head', 'trains']],
    ['Q6', () => buildSeedWorld('q6-done').w, ['path', 'forge', 'depot', 'head', 'trains', 'pier']],
  ];
  for (const [stage, world, expected] of milestones) {
    const read = townRead(world());
    assert.deepEqual(
      TOWN_FACTS.filter((fact) => townHas(read, fact)),
      expected,
      stage,
    );
    assert.equal(newestTownFact(read), expected.at(-1) ?? null, `${stage}: newest fact`);
    assert.equal(townLevel(read), expected.length, `${stage}: fact count`);
  }
});

test('town flips only at the first house completion; stone needs the third priced plot built', () => {
  const s = buildSeedWorld('house-ready');
  assert.equal(townHas(townRead(s.w, s.t), 'town'), false);
  assert.equal(act(s, 'a', 'rail.buy', { id: 0, kind: 1 }), 1);
  advance(s, TRADE.buildTicks - 1);
  assert.equal(townHas(townRead(s.w, s.t), 'town'), false);
  advance(s, 1);
  assert.equal(townHas(townRead(s.w, s.t), 'town'), true);
  assert.equal(townHas(townRead(s.w, s.t), 'stone'), false);
  const stone = buildSeedWorld('crossing-done');
  // Free an offer, then earn the third plot through freight and fares, not hand-set state.
  while (till(stone.w).boogles < plotPrice(stone.w, 0, 0, 50)) advance(stone, 1);
  assert.equal(act(stone, 'a', 'rail.buy', { id: 0, kind: 1 }), 1);
  let waited = 0;
  while (till(stone.w).boogles < plotPrice(stone.w, 0, 2, 50)) {
    assert.ok(waited++ < 100000, 'third plot becomes affordable');
    advance(stone, 1);
  }
  assert.equal(act(stone, 'a', 'rail.buy', { id: 2, kind: 1 }), 0, 'first plot already supplies seeds');
  assert.equal(act(stone, 'a', 'rail.buy', { id: 2, kind: 3 }), 1);
  assert.equal(act(stone, 'b', 'rail.buy', { id: 2, kind: 2 }), 0, 'second buyer spends nothing');
  assert.equal(townHas(townRead(stone.w, stone.t + 99), 'stone'), false);
  assert.equal(townHas(townRead(stone.w, stone.t + 100), 'stone'), true);
});

test('newest is the last true fact in story order, including the two house facts', () => {
  const read = { path: true, forge: true, completed: 5, trains: true, houses: [0, 2] };
  assert.equal(newestTownFact({ ...read, houses: [0] }), 'town');
  assert.equal(newestTownFact(read), 'stone');
  assert.equal(newestTownFact({ ...read, completed: 6 }), 'pier');
});
