// Separate capacities (docs/plans/separate-capacities.md, step 1; owner, 17 November 2026): each kind has its own row
// on a back (logs 8, 16 with the pack; stone 8, 16 with the breaker; rails 8), a full kind refuses only that kind, a
// hit gives 1 until Station 3 is funded and 2 after (the proper axe 5 on trees), and a save over a kind's row fails.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import type { RailAction } from '../src/sim/railway.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 } from '../src/sim/railway-layout.ts';
import { LINE1_STATIONS } from '../src/sim/railway-line-layout.ts';
import { RAILS } from '../src/sim/railway-line2-layout.ts';
import { Account, Pile, Rail } from '../src/sim/railway-components.ts';
import { WORKS_ROCKS } from '../src/sim/railway-works-layout.ts';
import { LOOSE_PILE_CAPACITY } from '../src/sim/railway-supply.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { advance, logs, type Seed } from '../src/sim/railway-seed-route.ts';
import { chopTo } from '../src/sim/railway-seed-works.ts';
import { railPredict } from '../src/world/railway-predict.ts';
import { accepted } from '../src/adapters/railway-effects.ts';
import {
  account,
  apply,
  beam,
  forge,
  buildSeedWorld,
  capacityOf,
  hitYield,
  invariant,
  keenEdge,
  LOGS,
  pilesWithIds,
  rail,
  restore,
  rocks,
  roomOf,
  STONE,
  trees,
  works,
} from './helpers/rail.ts';

const caps = (w: World) => [capacityOf(w, LOGS), capacityOf(w, STONE), capacityOf(w, RAILS)];
function send(s: Seed, pid: string, op: string, fields: Partial<RailAction> = {}) {
  const a = account(s.w, pid)!;
  return apply(s.w, pid, { op, epoch: a.epoch, request: a.request + 1, ...fields }, s.t).accepted;
}
/** One chop at the first tree with more than a hit's worth left; returns the logs it gave. */
function chop(s: Seed, pid = 'a') {
  const k = trees(s.w).findIndex((t) => t.left > 5);
  return send(s, pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false });
}
const mine = (s: Seed, id: number, pid = 'a') => send(s, pid, 'rail.mine', { id });
/** Stations 1 and 2 laid, Station 3 taking its bill: the 1-a-hit stretch's end. */
function atStation3(): Seed {
  const s = buildSeedWorld('awake');
  logs(s, 'a', 'T1', LINE1_STATIONS[0]!.bill[0]);
  advance(s, 300);
  for (let i = 0; i < LINE1_STATIONS[1]!.bill[1];) {
    const n = mine(
      s,
      rocks(s.w).findIndex((r) => r.left > 0),
    );
    assert.equal(send(s, 'a', 'rail.deposit', { station: 'T2', kind: 1, n }), n);
    i += n;
  }
  logs(s, 'a', 'T2', LINE1_STATIONS[1]!.bill[0]);
  advance(s, 300);
  return s;
}

test('capacities: logs, stone and rails start at 8, each its own row; a full kind refuses only that kind', () => {
  const s = buildSeedWorld('awake');
  assert.deepEqual(caps(s.w), [8, 8, 8]);
  for (let i = 0; i < 8; i++) assert.equal(chop(s), 1, 'one log a hit before the keener edge');
  const before = trees(s.w).map((t) => t.left);
  assert.equal(chop(s), 0, 'logs full: the chop gives nothing');
  assert.deepEqual(
    trees(s.w).map((t) => t.left),
    before,
    'and spends no tree',
  );
  assert.equal(mine(s, 0), 1, 'stone still fits beside a full row of logs');
  assert.equal(roomOf(s.w, account(s.w, 'a')!, LOGS), 0);
  assert.equal(roomOf(s.w, account(s.w, 'a')!, STONE), 7);
  assert.equal(invariant(s.w), null);
  // A pile take stops at that kind's room.
  assert.equal(send(s, 'a', 'rail.drop', { n: 3, x: RAILWAY_T1.x, y: 0, z: RAILWAY_T1.z, kind: 0 }), 3);
  const id = pilesWithIds(s.w)[0]!.id;
  assert.equal(chop(s), 1);
  assert.equal(chop(s), 1);
  assert.equal(send(s, 'a', 'rail.take', { id, kind: 0 }), 1, 'one log fits of the pile of three');
  assert.equal(account(s.w, 'a')!.carry, 8);
  assert.equal(pilesWithIds(s.w)[0]!.n, 2);
  assert.equal(invariant(s.w), null);
});

test('capacities: the notch and the crack track pieces taken, so the last hit at 1 fells or breaks', () => {
  const s = buildSeedWorld('awake');
  const k = trees(s.w).findIndex((t) => t.left > 0);
  const hit = () => send(s, 'a', 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false });
  for (let i = 0; i < 8; i++) assert.equal(hit(), 1);
  assert.equal(send(s, 'a', 'rail.drop', { n: 8, x: RAILWAY_T1.x, y: 0, z: RAILWAY_T1.z, kind: 0 }), 8);
  assert.equal(hit(), 1);
  assert.equal(trees(s.w)[k]!.work, 13);
  assert.equal(hit(), 1);
  assert.equal(trees(s.w)[k]!.left, 0);
  assert.equal(trees(s.w)[k]!.work, 15, 'a felled tree is cut through');
  for (let i = 0; i < 8; i++) assert.equal(mine(s, 0), 1);
  assert.equal(rocks(s.w)[0]!.left, 0);
  assert.equal(rocks(s.w)[0]!.work, 4, 'a broken rock shows broken');
  assert.equal(invariant(s.w), null);
});

test('capacities: a hit gives 1 through Station 2 and Station 3 until it is funded, then 2 (the keener edge)', () => {
  const s = atStation3();
  assert.equal(keenEdge(s.w), false);
  assert.equal(hitYield(s.w), 1, 'still 1 after Station 2');
  assert.equal(chop(s), 1);
  assert.equal(
    mine(
      s,
      rocks(s.w).findIndex((r) => r.left > 0),
    ),
    1,
  );
  assert.equal(send(s, 'a', 'rail.drop', { n: 1, x: 100000, y: 2000, z: 3000, kind: 0 }), 1);
  assert.equal(send(s, 'a', 'rail.drop', { n: 1, x: 100100, y: 2000, z: 3000, kind: 1 }), 1);
  logs(s, 'a', 'T3', LINE1_STATIONS[2]!.bill[0]);
  assert.equal(LINE1_STATIONS[2]!.bill[0], 32, "Station 3's bill");
  assert.equal(hitYield(s.w), 1, 'the logs alone do not fund Station 3: the beam is still owed');
  for (let i = 0; i < 12; i++) send(s, 'a', 'rail.beamChop');
  assert.equal(send(s, 'a', 'rail.beamTake', { revision: beam(s.w).revision }), 1);
  assert.equal(send(s, 'a', 'rail.beamDeposit', { revision: beam(s.w).revision, station: 'T3' }), 1);
  assert.equal(keenEdge(s.w), true, 'funded');
  assert.equal(hitYield(s.w), 2);
  assert.equal(chop(s), 2);
  assert.equal(
    mine(
      s,
      rocks(s.w).findIndex((r) => r.left > 1),
    ),
    2,
  );
  assert.equal(invariant(s.w), null);
});

test('capacities: the pack lifts logs to 16 and the breaker stone to 16, each its own step; the axe gives 5 on trees', () => {
  const forge = buildSeedWorld('forge-frame-last');
  assert.deepEqual(caps(forge.w), [8, 8, 8]);
  assert.equal(send(forge, 'a', 'rail.deposit', { station: 'F', kind: 0, n: 1 }), 1);
  assert.equal(send(forge, 'a', 'rail.pack'), 1);
  assert.deepEqual(caps(forge.w), [16, 8, 8], 'the pack is the logs step only');
  const works = buildSeedWorld('works-arrive');
  if (!rail(works.w).axe) assert.equal(send(works, 'a', 'rail.axe'), 1);
  assert.deepEqual(caps(works.w), [16, 8, 16], 'the seeds take the yoke at Q1');
  assert.equal(chop(works), 5, 'the proper axe: 5 a hit on a tree');
  assert.equal(send(works, 'a', 'rail.breaker'), 1);
  assert.deepEqual(caps(works.w), [16, 16, 16], 'the breaker is the stone step only');
  assert.equal(invariant(works.w), null);
});

// Built at module scope, outside the 5 s test timeout (as the golden shards do); the test gets its own copy.
buildSeedWorld('q1-last');
test("capacities: the rail yoke lifts rails to 16 once Q1's bill is in", () => {
  const s = buildSeedWorld('q1-last');
  assert.deepEqual(caps(s.w), [8, 8, 8]);
  assert.equal(send(s, 'a', 'rail.yoke'), 0, "no yoke before Q1's bill");
  assert.equal(rail(s.w).yoke, false);
  assert.equal(send(s, 'a', 'rail.deposit', { station: 'Q1', kind: 2, n: 1 }), 1, 'the last rail');
  assert.equal(send(s, 'a', 'rail.yoke'), 1);
  assert.deepEqual(caps(s.w), [8, 8, 16], 'the yoke is the rails step only');
  assert.equal(send(s, 'b', 'rail.yoke'), 0, 'one yoke for two openers');
  // The forge rack gives up to a back's 16 rails, its count permitting.
  while (forge(s.w).rack < 16) advance(s, 1);
  const before = account(s.w, 'a')!.rails;
  assert.equal(send(s, 'a', 'rail.forgeTake'), 16 - before);
  assert.equal(account(s.w, 'a')!.rails, 16);
  assert.equal(invariant(s.w), null);
  const saved = restore(s.w);
  assert.equal(account(saved, 'a')!.rails, 16, 'a save with 16 rails on a back loads');
  saved.mut(Rail, saved.single(Rail))!.yoke = false;
  assert.throws(() => railwayCheck(saved), /accounts/, '16 rails without the yoke');
});

test('capacities: a kiln feed of 16 logs and 16 stone is one accepted action, inside the wire bound', () => {
  const s = buildSeedWorld('works-open');
  chopTo(s, 'a', 16);
  for (const spot of WORKS_ROCKS) while (rocks(s.w)[spot.id]!.left > 0) assert.equal(mine(s, spot.id), 2, 'rocks at 2');
  assert.deepEqual([account(s.w, 'a')!.carry, account(s.w, 'a')!.stone], [16, 16]);
  assert.equal(send(s, 'a', 'rail.kiln'), 32);
  assert.ok(works(s.w).lit >= 0);
  assert.equal(accepted({ pid: 'a', request: 1, accepted: 32 }), true, 'the effect is not dropped');
  assert.equal(invariant(s.w), null);
});

test('capacities: a prediction agrees with the server on a full-kind refusal and on the other kind', () => {
  const s = buildSeedWorld('awake');
  for (let i = 0; i < 8; i++) chop(s);
  const k = trees(s.w).findIndex((t) => t.left > 0);
  for (const [op, fields, n] of [
    ['rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false }, 0],
    ['rail.mine', { id: 1 }, 1],
  ] as const) {
    const a = account(s.w, 'a')!;
    const e = { op, epoch: a.epoch, request: a.request + 1, ...fields } as RailAction;
    const predicted = restore(s.w);
    assert.equal(railPredict(predicted, 'a', e, s.t).n, n, op);
    assert.equal(apply(s.w, 'a', e, s.t).accepted, n, op);
    assert.deepEqual(account(predicted, 'a'), account(s.w, 'a'));
  }
});

test('capacities: a save over a kind row fails to load; at the pile ceiling a new pile is refused', () => {
  const s = buildSeedWorld('awake');
  const bad = restore(s.w);
  bad.mut(Account, bad.lookup(Account, 'a')!)!.carry = 9;
  assert.throws(() => railwayCheck(bad), /accounts/, '9 logs before the pack');
  for (let i = 0; i < LOOSE_PILE_CAPACITY; i++) {
    if (!account(s.w, 'a')!.carry) chop(s);
    assert.equal(send(s, 'a', 'rail.drop', { n: 1, kind: 0, x: 90000 + i, z: 0, y: 0 }), 1);
  }
  if (!account(s.w, 'a')!.carry) chop(s);
  const carried = account(s.w, 'a')!.carry;
  assert.equal(send(s, 'a', 'rail.drop', { n: 1, kind: 0, x: 80000, z: 0, y: 0 }), 0, 'no 129th pile');
  assert.equal(account(s.w, 'a')!.carry, carried, 'refused without spending');
  assert.equal(send(s, 'a', 'rail.drop', { n: 1, kind: 0, x: 90000, z: 0, y: 0 }), 1, 'a top-up still lands');
  assert.equal(s.w.ids(Pile).length, LOOSE_PILE_CAPACITY);
  assert.equal(invariant(s.w), null);
});
