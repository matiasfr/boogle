// Ring Island's steel works on the world (docs/plans/ring-island-build2.md, R1; design review rulings B and E, finding
// 2): each op's refusals (before the rivet, an empty yard, a full back, a lit works), the bill lighting on its last item
// whichever kind brings it, the casts up to the rack's cap, the load check's refusals of a broken Steel row, and a seeded
// op fuzz that holds every invariant and can always complete the bill. Every `act` checks the whole world
// (railwayCheck, and a save round trip) after its op. Until R2's train, `landKit` stands in for it: what the kit still
// needs (steelNeed), logs made at the Village and rails off the forge rack, straight into the island yard.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { Forge, Steel, SteelClock } from '../src/sim/railway-components.ts';
import { STEEL } from '../src/sim/railway-ring-layout.ts';
import { fuzzSeeds } from './helpers/fuzz.ts';
import { stageWorld, worldVerdict } from './helpers/railway-check.ts';
import {
  account,
  act,
  advance,
  carryMax,
  forge,
  invariant,
  pilesWithIds,
  railwayAtRing,
  restore,
  steel,
  steelNeed,
  type Seed,
} from './helpers/rail.ts';

const seed = (s: Seed): Seed => ({ w: restore(s.w), t: s.t });
/** R2's train in one step: the kit's need, logs made at the Village and rails off the forge rack, into the yard. */
function landKit(s: Seed) {
  const need = steelNeed(s.w),
    rails = Math.min(need.rails, forge(s.w).rack);
  const m = s.w.mut(Steel, s.w.single(Steel))!;
  m.yardLogs += need.logs;
  m.outLogs += need.logs;
  m.yardRails += rails;
  m.outRails += rails;
  s.w.mut(Forge, s.w.single(Forge))!.rack -= rails;
  assert.equal(invariant(s.w), null, 'the landed kit');
}
/** Take what the yard holds of a kind and feed it, until the yard is empty or nothing moves. */
function feedAll(s: Seed, pid: string, kinds: readonly number[] = [0, 1]) {
  for (const kind of kinds)
    for (let k = 0; k < 8; k++) {
      act(s, pid, 'rail.steelTake', { kind });
      if (!act(s, pid, 'rail.steel')) break;
    }
}

test('before the rivet the yard is empty, nothing is owed, and the works takes nothing', () => {
  const s = seed(railwayAtRing('leaf-raised'));
  assert.deepEqual(steelNeed(s.w), { logs: 0, rails: 0 });
  const logs = pilesWithIds(s.w).find((p) => p.kind === 0)!;
  assert.ok(act(s, 'a', 'rail.take', { id: logs.id, kind: 0 }) > 0, 'logs on the back');
  for (const kind of [0, 1]) assert.equal(act(s, 'a', 'rail.steelTake', { kind }), 0, `take ${kind}`);
  assert.equal(act(s, 'a', 'rail.steel'), 0, 'feed before the rivet');
  assert.equal(steel(s.w).logs, 0);
});

test('after the rivet: an empty yard, a bad kind, an empty or full back and a lit works are refused', () => {
  const s = seed(railwayAtRing('ring-joined'));
  assert.deepEqual(steelNeed(s.w), { logs: STEEL.logs, rails: STEEL.rails }, 'the whole bill is owed');
  assert.equal(act(s, 'a', 'rail.steelTake', { kind: 0 }), 0, 'an empty yard');
  assert.equal(act(s, 'a', 'rail.steel'), 0, 'an empty back');
  landKit(s);
  assert.deepEqual(steelNeed(s.w), { logs: 0, rails: 0 }, 'the yard holds the bill');
  for (const kind of [2, -1, 0.5, undefined]) assert.equal(act(s, 'a', 'rail.steelTake', { kind }), 0, `kind ${kind}`);
  // A full back takes no more: fill it with rails, then ask for logs.
  const max = carryMax(s.w);
  assert.equal(act(s, 'a', 'rail.steelTake', { kind: 1 }), Math.min(max, STEEL.rails));
  if (max <= STEEL.rails) assert.equal(act(s, 'a', 'rail.steelTake', { kind: 0 }), 0, 'a full back');
  assert.equal(act(s, 'a', 'rail.steel'), Math.min(max, STEEL.rails), 'the rails fed');
  feedAll(s, 'a');
  assert.ok(steel(s.w).lit >= 0, 'lit');
  // Lit: the bill takes nothing more, whatever is on the back.
  const logs = pilesWithIds(s.w).find((p) => p.kind === 0)!;
  assert.ok(act(s, 'b', 'rail.take', { id: logs.id, kind: 0 }) > 0);
  assert.equal(act(s, 'b', 'rail.steel'), 0, 'a lit works');
  assert.deepEqual(steelNeed(s.w), { logs: 0, rails: 0 }, 'nothing owed once lit');
});

test('the bill lights on its last item, whichever kind brings it, and casts up to the rack cap', () => {
  for (const order of [
    [1, 0],
    [0, 1],
  ] as const) {
    const s = seed(railwayAtRing('ring-joined'));
    landKit(s);
    feedAll(s, 'a', [order[0]]);
    assert.equal(steel(s.w).lit, -1, `not lit on the first kind (${order[0]})`);
    // All of the second kind but one, then the last one: it lights on that op's tick.
    const last = order[1];
    act(s, 'a', 'rail.steelTake', { kind: last });
    const a = account(s.w, 'a')!,
      held = last ? a.rails : a.carry,
      owed = last ? STEEL.rails : STEEL.logs;
    assert.equal(held, Math.min(owed, carryMax(s.w)));
    feedAll(s, 'a', [last]);
    assert.equal(steel(s.w).lit, s.t, `lit on the ${last ? 'rails' : 'logs'}' op`);
    assert.deepEqual(
      { logs: steel(s.w).logs, rails: steel(s.w).rails, yard: steel(s.w).yardLogs + steel(s.w).yardRails },
      { logs: STEEL.logs, rails: STEEL.rails, yard: 0 },
    );
    // One steel every castTicks while the rack has room; a full rack waits (R2's train takes it).
    advance(s, STEEL.castTicks - 1);
    assert.equal(steel(s.w).rack, 0, 'not before castTicks');
    advance(s, 1);
    assert.equal(steel(s.w).rack, 1, 'the first cast');
    advance(s, STEEL.castTicks * (STEEL.rackCap + 2));
    assert.equal(steel(s.w).rack, STEEL.rackCap, 'the rack is full');
    assert.equal(steel(s.w).poured, STEEL.rackCap, 'and waits');
    assert.equal(invariant(s.w), null);
  }
});

test('the load check refuses a broken Steel row, each with its message', () => {
  const joined = stageWorld('ring-joined'),
    before = stageWorld('leaf-raised');
  // A works lit by its ops (a full bill set by hand would break the conserved logs and rails).
  const lit = seed(railwayAtRing('ring-joined'));
  landKit(lit);
  feedAll(lit, 'a');
  assert.ok(steel(lit.w).lit >= 0);
  const verdict = (base: World, row: Partial<Record<keyof typeof Steel.defaults, number>>, lastCast?: number) => {
    const w = base.clone(),
      id = w.single(Steel);
    Object.assign(w.mut(Steel, id)!, row);
    if (lastCast !== undefined) w.mut(SteelClock, id)!.lastCast = lastCast;
    return worldVerdict(w);
  };
  const at = steel(lit.w).lit;
  assert.equal(verdict(joined, {}), null);
  assert.equal(verdict(lit.w, {}), null);
  assert.equal(verdict(joined, { lit: -2 }), 'railway: steel bounds');
  assert.equal(verdict(lit.w, { rack: STEEL.rackCap + 1, poured: STEEL.rackCap + 1 }), 'railway: steel bounds');
  assert.equal(verdict(before, { outLogs: 1 }), 'railway: steel before the rivet');
  assert.equal(verdict(joined, { yardLogs: 1 }), 'railway: steel yard');
  assert.equal(verdict(joined, { lit: 5 }), 'railway: steel lit');
  assert.equal(verdict(lit.w, {}, at - 1), 'railway: steel cast clock');
  assert.equal(verdict(joined, { rack: 1, poured: 1 }), 'railway: steel unlit cast');
  assert.equal(verdict(lit.w, { poured: 1 }), 'railway: steel conservation');
  assert.equal(verdict(lit.w, { poured: 1, rack: 1 }, at + STEEL.castTicks), null, 'a lit works with a cast');
});

/** The bill can still be completed from here (finding 2): the players feed their backs, the train brings what is owed,
 * and every load is fed, with time between loads for the forge to pour. */
function completes(from: Seed) {
  const s = seed(from);
  for (let round = 0; round < 12 && steel(s.w).lit < 0; round++) {
    for (const pid of ['a', 'b']) act(s, pid, 'rail.steel');
    landKit(s);
    feedAll(s, 'a');
    advance(s, 200);
  }
  return steel(s.w).lit >= 0;
}

for (const rngSeed of fuzzSeeds([0x57ee1, 0x2b0])) {
  test(`seed ${rngSeed.toString(16)}: 1,500 random steel ops by two accounts hold every invariant and the bill can always be completed`, () => {
    const rand = mulberry32(rngSeed);
    const base = railwayAtRing('ring-joined');
    let s = seed(base),
      lit = 0;
    const pids = ['a', 'b'];
    const spot = { x: 141000, y: 890, z: -81500 };
    const ops = [
      () => ({ op: 'rail.steelTake', f: { kind: Math.floor(rand() * 3) } }),
      () => ({ op: 'rail.steel', f: {} }),
      () => ({ op: 'rail.drop', f: { kind: rand() < 0.5 ? 0 : 2, n: 1 + Math.floor(rand() * 6), ...spot } }),
      () => {
        const ps = pilesWithIds(s.w);
        const p = ps[Math.floor(rand() * ps.length)];
        return { op: 'rail.take', f: p ? { id: p.id, kind: p.kind } : {} };
      },
    ];
    let accepted = 0;
    for (let k = 0; k < 1500; k++) {
      if (rand() < 0.04) landKit(s);
      const pid = pids[Math.floor(rand() * pids.length)]!;
      const { op, f } = ops[Math.floor(rand() * ops.length)]!();
      if (op.startsWith('rail.steel')) accepted += Number(act(s, pid, op, f) > 0);
      else act(s, pid, op, f);
      advance(s, Math.floor(rand() * 4));
      const st = steel(s.w);
      assert.equal(st.lit >= 0, st.logs === STEEL.logs && st.rails === STEEL.rails, `lit at op ${k}`);
      if (k % 500 === 499) assert.ok(completes(s), `the bill can be completed at op ${k}`);
      // A lit works takes nothing more: a while for its casts, then a fresh island for the next run of ops.
      if (st.lit >= 0 && rand() < 0.05) {
        lit++;
        s = seed(base);
      } else if (rand() < 0.002) s = seed(s);
    }
    assert.ok(completes(s), 'the bill can be completed at the end');
    assert.ok(accepted > 60 && lit > 3, `${accepted} steel ops accepted, ${lit} works lit`);
  });
}
