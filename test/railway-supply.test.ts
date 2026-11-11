// Supply maintenance on the railway's world (the rail.supply system; docs/plans/ecs-e.md, step 3): recovery of
// abandoned piles to the racks, staged regrowth outside the track clearings, interval tuning that keeps earned progress.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { RailAction } from '../src/sim/railway.ts';
import type { World } from '../src/ecs/index.ts';
import { railMaxDuration } from '../src/sim/railway-queries-line1.ts';
import { railCounts } from '../src/sim/railway-queries-line2.ts';
import { railGrowthMask, railGrowthAllowed, RAILWAY_TRACK_CLEARINGS } from '../src/sim/railway-supply.ts';
import { RAILWAY_SUPPLY, RAILWAY_SOURCES } from '../src/sim/railway-layout.ts';
import { Account, Pile, Rail, RailClock, Tree, createRailwayWorld } from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import {
  account,
  apply,
  createRailway,
  hash,
  invariant,
  job,
  piles,
  rail,
  railSession,
  railSupplyPulse,
  railTick,
  restore,
  tree,
  trees,
} from './helpers/rail.ts';
const unseen = railGrowthMask(RAILWAY_SOURCES.map((_source, k) => k));
const watched = railGrowthMask([]);
/** The first catalog tree that may regrow (outside every clearing). */
const grows = RAILWAY_SOURCES.findIndex((_source, k) => railGrowthAllowed(k, true));
const T1_DURATION = railMaxDuration(createRailway());

function action(s: World, pid: string, fields: Omit<RailAction, 'epoch' | 'request'>) {
  const a = account(s, pid)!;
  const result = apply(s, pid, { epoch: a.epoch, request: a.request + 1, ...fields }, 100);
  assert.equal(invariant(s), null);
  return result;
}
/** Every tree felled, 255 departed full backs, 128 full piles, the rest of the logs on the recovery rack. */
function exhausted() {
  const s = createRailway();
  for (let k = 0; k < 255; k++) railSession(s, `departed${k}`, 1);
  railSession(s, 'visitor', 1);
  const w = s;
  const railEntity = w.single(Rail);
  w.mut(Rail, railEntity)!.awake = 0;
  w.mut(RailClock, railEntity)!.supplyMarker = 100;
  for (const id of w.ids(Tree)) Object.assign(w.mut(Tree, id)!, { left: 0, work: 15 });
  for (const id of w.ids(Account)) if (w.get(Account, id)!.pid !== 'visitor') w.mut(Account, id)!.carry = 8;
  for (let k = 0; k < 128; k++) w.spawn([Pile, { x: 100000 + k, z: -14000, y: 3000, n: 8, kind: 0, age: 0 }]);
  w.mut(Rail, railEntity)!.rack = RAILWAY_SUPPLY - 255 * 8 - 128 * 8;
  assert.equal(invariant(s), null);
  return s;
}
test('exhausted world with 255 departed full backs completes through conserved rack after restart', () => {
  let s = exhausted();
  railSupplyPulse(s, { marker: 120, grow: watched, recover: [...s.ids(Pile)] });
  assert.equal(piles(s).length, 128, 'twenty quantized minutes is not yet eligible');
  s = restore(s);
  const event = { marker: 121, grow: watched, recover: [...s.ids(Pile)] };
  assert.equal(railSupplyPulse(s, event), 1024);
  const replay = restore(s);
  assert.equal(railSupplyPulse(replay, event), 0);
  assert.equal(hash(s), hash(replay));
  for (let k = 0; k < 3; k++) {
    assert.equal(action(s, 'visitor', { op: 'rail.rackTake' }).accepted, 8);
    assert.equal(action(s, 'visitor', { op: 'rail.deposit', station: 'T1', kind: 0, n: 8 }).accepted, 8);
    s = restore(s);
  }
  railTick(s, 100 + T1_DURATION);
  assert.equal(job(s, 0).completion, 1);
  assert.equal(railCounts(s).total, RAILWAY_SUPPLY + 30);
  assert.equal(railCounts(s).carry, 255 * 8);
  assert.equal(invariant(s), null);
});

test('regrowth is staged, counted once and excluded only in the track clearings', () => {
  const s = exhausted();
  railSupplyPulse(s, { marker: 131, grow: unseen, recover: [] });
  assert.equal(rail(s).produced, 0);
  const recovered = restore(s);
  railSupplyPulse(s, { marker: 132, grow: watched, recover: [] });
  assert.equal(rail(s).produced, 0, 'an accepted pulse without growth ids preserves the cut');
  for (const state of [s, recovered])
    for (let marker = 133; marker <= 136; marker++) {
      const event = { marker, grow: unseen, recover: [] };
      railSupplyPulse(state, event);
      const before = hash(state);
      railSupplyPulse(state, event);
      assert.equal(hash(state), before, 'a repeated minute cannot advance a stage');
      if (marker < 136) assert.equal(rail(state).produced, 0);
    }
  assert.equal(hash(s), hash(recovered));
  const renewed = trees(s).filter((_t, k) => railGrowthAllowed(k, true)).length * 10;
  assert.equal(rail(s).produced, renewed);
  assert.equal(railCounts(s).total, RAILWAY_SUPPLY + 30 + renewed);
  assert.ok(renewed >= 24, 'renewable sources remain enough to complete');
  assert.ok(
    trees(s).some((t, k) => !railGrowthAllowed(k, true) && t.left === 0),
    'track clearing stays bare',
  );
  assert.equal(invariant(s), null);
});

test('supply intervals speed up or slow down compact progress without resetting earned age', () => {
  for (const interval of [1, 7, 31, 62, 1440]) {
    const state = exhausted();
    const tune = { regrow: interval, recover: interval };
    // Start at an interval boundary, then compare one gap with one-minute pulses across restart.
    state.mut(RailClock, state.single(Rail))!.supplyMarker = interval * 100;
    const batched = restore(state);
    for (let minute = 1; minute <= interval; minute++)
      railSupplyPulse(state, { marker: interval * 100 + minute, grow: watched, recover: [] }, tune);
    railSupplyPulse(batched, { marker: interval * 101, grow: watched, recover: [] }, tune);
    assert.equal(hash(state), hash(batched), `partition-independent wait at ${interval} minutes`);
    assert.equal(tree(state, 0).age, 31);
    assert.equal(piles(state)[0]!.age, 21);
    const recovered = restore(state);
    const event = { marker: interval * 101, grow: watched, recover: [...recovered.ids(Pile)] };
    assert.equal(railSupplyPulse(recovered, event, tune), 1024);
    assert.equal(invariant(recovered), null);
    for (let stage = 1; stage <= 4; stage++) {
      railSupplyPulse(recovered, { marker: interval * 101 + stage, grow: unseen, recover: [] }, tune);
      assert.equal(tree(recovered, grows).age, 31 + stage);
    }
    assert.ok(rail(recovered).produced > 0);
    assert.equal(invariant(recovered), null);
  }
  const changed = exhausted();
  railSupplyPulse(changed, { marker: 110, grow: watched, recover: [] });
  const age = tree(changed, grows).age!,
    pileAge = piles(changed)[0]!.age!;
  const resumed = restore(changed);
  for (const state of [changed, resumed])
    railSupplyPulse(state, { marker: 111, grow: watched, recover: [] }, { regrow: 1440, recover: 1440 });
  assert.equal(hash(changed), hash(resumed));
  assert.ok(tree(changed, grows).age! >= age, 'slowing the interval preserves earned growth progress');
  assert.ok(piles(changed)[0]!.age! >= pileAge, 'slowing the interval preserves earned recovery progress');
  railSupplyPulse(changed, { marker: 112, grow: unseen, recover: [] }, { regrow: 1, recover: 1 });
  assert.equal(tree(changed, grows).age, 31, 'speeding up finishes the wait but cannot skip a growth stage');
  assert.equal(rail(changed).produced, 0);
});

test('normalized supply progress stays integer and partition-independent near the maximum durable marker', () => {
  const state = exhausted();
  const start = Number.MAX_SAFE_INTEGER - 1440;
  state.mut(RailClock, state.single(Rail))!.supplyMarker = start;
  const batched = restore(state);
  const intervals = { regrow: 1440, recover: 1439 };
  let split = state;
  for (let minute = 1; minute <= 1440; minute++) {
    railSupplyPulse(split, { marker: start + minute, grow: watched, recover: [] }, intervals);
    if (minute === 719) split = restore(split);
  }
  railSupplyPulse(batched, { marker: Number.MAX_SAFE_INTEGER, grow: watched, recover: [] }, intervals);
  assert.equal(hash(split), hash(batched));
  assert.equal(tree(split, grows).age, 31);
  assert.equal(piles(split)[0]!.age, 21);
  const before = hash(split);
  railSupplyPulse(split, { marker: Number.MAX_SAFE_INTEGER, grow: unseen, recover: [] }, intervals);
  assert.equal(hash(split), before, 'same-marker pulses cannot add a growth stage');
  assert.equal(invariant(split), null);
});

test('fresh drops reset the merged pile timer and withheld recovery ids retain all logs', () => {
  const s = createRailway();
  railSession(s, 'a', 1);
  s.mut(Rail, s.single(Rail))!.awake = 0;
  railSupplyPulse(s, { marker: 100, grow: watched, recover: [] });
  action(s, 'a', { op: 'rail.chop', id: RAILWAY_SOURCES[0]![0], yaw: 0, collapsed: false });
  action(s, 'a', { op: 'rail.drop', x: 0, y: 3000, z: 0, n: 1 });
  railSupplyPulse(s, { marker: 121, grow: watched, recover: [] });
  assert.equal(piles(s)[0]!.n, 1);
  action(s, 'a', { op: 'rail.drop', x: 0, y: 3000, z: 0, n: 1 });
  const id = s.ids(Pile)[0]!;
  railSupplyPulse(s, { marker: 122, grow: watched, recover: [id] });
  assert.equal(rail(s).rack, 0);
  railSupplyPulse(s, { marker: 142, grow: watched, recover: [id] });
  assert.equal(rail(s).rack, 2);
  assert.equal(invariant(s), null);
});

test('malformed production accounting fails atomically without replacing the last good state', () => {
  const s = exhausted();
  const w = s;
  const before = w.hash();
  const col = (j: ReturnType<typeof w.snapshot>, c: { kind: string; names: readonly string[] }, f: string) =>
    j.c[c.kind]![1 + c.names.indexOf(f)]!;
  for (const mutate of [
    (j: ReturnType<typeof w.snapshot>) => (col(j, Rail, 'produced')[0] = 10),
    (j: ReturnType<typeof w.snapshot>) => (col(j, Rail, 'rack')[0] = (col(j, Rail, 'rack')[0] as number) - 1),
    (j: ReturnType<typeof w.snapshot>) => (col(j, Tree, 'age')[0] = 40),
    (j: ReturnType<typeof w.snapshot>) => (col(j, Pile, 'age')[0] = -1),
  ]) {
    const json = JSON.parse(JSON.stringify(w.snapshot()));
    mutate(json);
    assert.throws(() => w.load(json, railwayCheck));
    assert.throws(() => createRailwayWorld().load(json, railwayCheck));
    assert.equal(w.hash(), before);
  }
});

test('renewal alone completes an exhausted run while every old resource remains unavailable', () => {
  const s = exhausted();
  for (const marker of [131, 132, 133, 134, 135]) railSupplyPulse(s, { marker, grow: unseen, recover: [] });
  const originalCarry = railCounts(s).carry,
    originalLoose = railCounts(s).loose,
    originalRack = rail(s).rack;
  const ids = RAILWAY_SOURCES.filter((_source, k) => railGrowthAllowed(k, true))
    .slice(0, 3)
    .map(([id]) => id);
  for (const id of ids) {
    for (let stroke = 0; stroke < 4; stroke++)
      assert.equal(action(s, 'visitor', { op: 'rail.chop', id, yaw: 0, collapsed: false }).accepted, 2);
    assert.equal(action(s, 'visitor', { op: 'rail.deposit', station: 'T1', kind: 0, n: 8 }).accepted, 8);
    restore(s);
  }
  railTick(s, 100 + T1_DURATION);
  assert.equal(job(s, 0).completion, 1);
  assert.equal(railCounts(s).carry, originalCarry);
  assert.equal(railCounts(s).loose, originalLoose);
  assert.equal(rail(s).rack, originalRack);
  assert.equal(invariant(s), null);
});

test('pinned clearings contain initial stubs and all finished T1 track with eight metres of clearance', async () => {
  const { LINKS, ORIGIN, lineAt } = await import('../src/place/layout.ts');
  const line = LINKS[0]!.line;
  for (let s = 0; s <= line.len; s += 0.5) {
    if (s > 30 && s < 150) continue;
    const p = lineAt(line, s, { x: 0, z: 0, ux: 0, uz: 0 });
    const x = (p.x + ORIGIN.x) * 100,
      z = p.z * 100;
    assert.ok(
      RAILWAY_TRACK_CLEARINGS.some(
        ([x0, x1, z0, z1]) => x >= x0 + 799 && x <= x1 - 799 && z >= z0 + 799 && z <= z1 - 799,
      ),
    );
  }
});
