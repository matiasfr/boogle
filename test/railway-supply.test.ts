import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRailway,
  railApply,
  railSession,
  railCounts,
  railwayInvariant,
  serializeRailway,
  loadRailway,
  hashRailway,
  railTick,
  RAILWAY_DURATION,
  type Railway,
  type RailAction,
} from '../src/sim/railway.ts';
import {
  railSupplyPulse,
  railGrowthMask,
  railGrowthAllowed,
  RAILWAY_TRACK_CLEARINGS,
} from '../src/sim/railway-supply.ts';
import { RAILWAY_SUPPLY, RAILWAY_SOURCES } from '../src/sim/railway-layout.ts';
const unseen = railGrowthMask(RAILWAY_SOURCES.map((_source, k) => k));
const watched = railGrowthMask([]);

function restore(s: Railway) {
  const copy = createRailway(true);
  loadRailway(
    copy,
    JSON.parse(JSON.stringify(serializeRailway(s))),
    s.accounts.map((a) => a.pid),
  );
  assert.equal(hashRailway(copy), hashRailway(s));
  return copy;
}
function action(s: Railway, pid: string, fields: Omit<RailAction, 'epoch' | 'request'>) {
  const a = s.accounts.find((a) => a.pid === pid)!;
  const result = railApply(s, pid, { epoch: a.epoch, request: a.request + 1, ...fields }, 100);
  assert.equal(railwayInvariant(s), null);
  return result;
}
function exhausted() {
  const s = createRailway(true);
  s.awake = 0;
  s.sources.fill(0);
  s.work.fill(15);
  s.supply!.marker = 100;
  for (let k = 0; k < 255; k++) {
    railSession(s, `departed${k}`, 1);
    s.accounts[k]!.carry = 8;
  }
  railSession(s, 'visitor', 1);
  for (let k = 0; k < 128; k++) s.piles.push({ id: s.nextPile++, x: 100000 + k, z: -14000, y: 3000, n: 8, age: 0 });
  s.supply!.rack = RAILWAY_SUPPLY - 255 * 8 - 128 * 8;
  assert.equal(railwayInvariant(s), null);
  return s;
}
test('exhausted world with 255 departed full backs completes through conserved rack after restart', () => {
  let s = exhausted();
  railSupplyPulse(s, { marker: 120, grow: watched, recover: s.piles.map((p) => p.id) });
  assert.equal(s.piles.length, 128, 'twenty quantized minutes is not yet eligible');
  s = restore(s);
  const event = { marker: 121, grow: watched, recover: s.piles.map((p) => p.id) };
  assert.equal(railSupplyPulse(s, event), 1024);
  const replay = restore(s);
  assert.equal(railSupplyPulse(replay, event), 0);
  assert.equal(hashRailway(s), hashRailway(replay));
  for (let k = 0; k < 3; k++) {
    assert.equal(action(s, 'visitor', { op: 'rail.rackTake' }).accepted, 8);
    assert.equal(action(s, 'visitor', { op: 'rail.deposit', n: 8 }).accepted, 8);
    s = restore(s);
  }
  railTick(s, 100 + RAILWAY_DURATION);
  assert.equal(s.completion, 1);
  assert.equal(railCounts(s).total, RAILWAY_SUPPLY);
  assert.equal(railCounts(s).carry, 255 * 8);
  assert.equal(railwayInvariant(s), null);
});
test('regrowth is staged, counted once and excluded only in the track clearings', () => {
  const s = exhausted();
  railSupplyPulse(s, { marker: 131, grow: unseen, recover: [] });
  assert.equal(s.supply!.produced, 0);
  const recovered = restore(s);
  railSupplyPulse(s, { marker: 132, grow: watched, recover: [] });
  assert.equal(s.supply!.produced, 0, 'an accepted pulse without growth ids preserves the cut');
  for (const state of [s, recovered])
    for (let marker = 133; marker <= 136; marker++) {
      const event = { marker, grow: unseen, recover: [] };
      railSupplyPulse(state, event);
      const hash = hashRailway(state);
      railSupplyPulse(state, event);
      assert.equal(hashRailway(state), hash, 'a repeated minute cannot advance a stage');
      if (marker < 136) assert.equal(state.supply!.produced, 0);
    }
  assert.equal(hashRailway(s), hashRailway(recovered));
  const renewed = s.sources.filter((_n, k) => railGrowthAllowed(k)).length * 10;
  assert.equal(s.supply!.produced, renewed);
  assert.equal(railCounts(s).total, RAILWAY_SUPPLY + renewed);
  assert.ok(renewed >= 24, 'renewable sources remain enough to complete');
  assert.ok(
    s.sources.some((n, k) => !railGrowthAllowed(k) && n === 0),
    'track clearing stays bare',
  );
  assert.equal(railwayInvariant(s), null);
  const funded = exhausted();
  for (let k = 0; k < 3; k++) {
    action(funded, 'visitor', { op: 'rail.rackTake' });
    action(funded, 'visitor', { op: 'rail.deposit', n: 8 });
  }
  railTick(funded, 100 + RAILWAY_DURATION);
  assert.equal(funded.completion, 1);
  for (const marker of [131, 132, 133, 134, 135]) railSupplyPulse(funded, { marker, grow: unseen, recover: [] });
  assert.equal(funded.supply!.produced, renewed, 'finished T1 does not disable other forest renewal');
  restore(funded);
});

test('supply intervals speed up or slow down compact progress without resetting earned age', () => {
  for (const interval of [1, 7, 31, 62, 1440]) {
    const state = exhausted();
    const tune = { regrow: interval, recover: interval };
    // Start at an interval boundary, then compare one gap with one-minute pulses across restart.
    state.supply!.marker = interval * 100;
    const batched = restore(state);
    for (let minute = 1; minute <= interval; minute++) {
      railSupplyPulse(state, { marker: interval * 100 + minute, grow: watched, recover: [] }, tune);
    }
    railSupplyPulse(batched, { marker: interval * 101, grow: watched, recover: [] }, tune);
    assert.equal(hashRailway(state), hashRailway(batched), `partition-independent wait at ${interval} minutes`);
    assert.equal(state.supply!.ages[0], 31);
    assert.equal(state.piles[0]!.age, 21);
    const recovered = restore(state);
    const event = { marker: interval * 101, grow: watched, recover: recovered.piles.map((p) => p.id) };
    assert.equal(railSupplyPulse(recovered, event, tune), 1024);
    assert.equal(railwayInvariant(recovered), null);
    for (let stage = 1; stage <= 4; stage++) {
      railSupplyPulse(recovered, { marker: interval * 101 + stage, grow: unseen, recover: [] }, tune);
      assert.equal(recovered.supply!.ages[5], 31 + stage);
    }
    assert.ok(recovered.supply!.produced > 0);
    assert.equal(railwayInvariant(recovered), null);
  }
  const changed = exhausted();
  railSupplyPulse(changed, { marker: 110, grow: watched, recover: [] });
  const age = changed.supply!.ages[5],
    pileAge = changed.piles[0]!.age;
  const resumed = restore(changed);
  for (const state of [changed, resumed])
    railSupplyPulse(state, { marker: 111, grow: watched, recover: [] }, { regrow: 1440, recover: 1440 });
  assert.equal(hashRailway(changed), hashRailway(resumed));
  assert.ok(changed.supply!.ages[5]! >= age!, 'slowing the interval preserves earned growth progress');
  assert.ok(changed.piles[0]!.age! >= pileAge!, 'slowing the interval preserves earned recovery progress');
  railSupplyPulse(changed, { marker: 112, grow: unseen, recover: [] }, { regrow: 1, recover: 1 });
  assert.equal(changed.supply!.ages[5], 31, 'speeding up finishes the wait but cannot skip a growth stage');
  assert.equal(changed.supply!.produced, 0);
});

test('normalized supply progress stays integer and partition-independent near the maximum durable marker', () => {
  const state = exhausted();
  const start = Number.MAX_SAFE_INTEGER - 1440;
  state.supply!.marker = start;
  const batched = restore(state);
  const intervals = { regrow: 1440, recover: 1439 };
  let split = state;
  for (let minute = 1; minute <= 1440; minute++) {
    railSupplyPulse(split, { marker: start + minute, grow: watched, recover: [] }, intervals);
    if (minute === 719) split = restore(split);
  }
  railSupplyPulse(batched, { marker: Number.MAX_SAFE_INTEGER, grow: watched, recover: [] }, intervals);
  assert.equal(hashRailway(split), hashRailway(batched));
  assert.equal(split.supply!.ages[5], 31);
  assert.equal(split.piles[0]!.age, 21);
  const hash = hashRailway(split);
  railSupplyPulse(split, { marker: Number.MAX_SAFE_INTEGER, grow: unseen, recover: [] }, intervals);
  assert.equal(hashRailway(split), hash, 'same-marker pulses cannot add a growth stage');
  assert.equal(railwayInvariant(split), null);
});
test('fresh drops reset the merged pile timer and withheld recovery ids retain all logs', () => {
  const s = createRailway(true);
  railSession(s, 'a', 1);
  s.awake = 0;
  railSupplyPulse(s, { marker: 100, grow: watched, recover: [] });
  action(s, 'a', { op: 'rail.chop', id: 0, yaw: 0, collapsed: false });
  action(s, 'a', { op: 'rail.drop', x: 0, y: 3000, z: 0, n: 1 });
  railSupplyPulse(s, { marker: 121, grow: watched, recover: [] });
  assert.equal(s.piles[0]!.n, 1);
  action(s, 'a', { op: 'rail.drop', x: 0, y: 3000, z: 0, n: 1 });
  railSupplyPulse(s, { marker: 122, grow: watched, recover: [1] });
  assert.equal(s.supply!.rack, 0);
  railSupplyPulse(s, { marker: 142, grow: watched, recover: [1] });
  assert.equal(s.supply!.rack, 2);
  assert.equal(railwayInvariant(s), null);
});
test('malformed production accounting fails atomically without replacing the last good state', () => {
  const s = exhausted();
  const before = hashRailway(s);
  for (const mutate of [
    (j: ReturnType<typeof serializeRailway>) => (j.supply!.produced += 10),
    (j: ReturnType<typeof serializeRailway>) => j.supply!.rack--,
    (j: ReturnType<typeof serializeRailway>) => (j.supply!.ages = '!'.repeat(s.sources.length)),
    (j: ReturnType<typeof serializeRailway>) => (j.piles[0]![5] = -1),
  ]) {
    const json = serializeRailway(s);
    mutate(json);
    assert.throws(() =>
      loadRailway(
        s,
        json,
        s.accounts.map((a) => a.pid),
      ),
    );
    assert.equal(hashRailway(s), before);
  }
});

test('pinned clearings contain initial stubs and all finished T1 track with eight metres of clearance', async () => {
  const { LINKS, ORIGIN, lineAt } = await import('../src/proto/place/layout.ts');
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

test('renewal alone completes an exhausted run while every old resource remains unavailable', () => {
  const s = exhausted();
  for (const marker of [131, 132, 133, 134, 135]) railSupplyPulse(s, { marker, grow: unseen, recover: [] });
  const originalCarry = railCounts(s).carry,
    originalLoose = railCounts(s).loose,
    originalRack = s.supply!.rack;
  const ids = RAILWAY_SOURCES.filter((_source, k) => railGrowthAllowed(k))
    .slice(0, 3)
    .map(([id]) => id);
  for (const id of ids) {
    for (let stroke = 0; stroke < 4; stroke++)
      assert.equal(action(s, 'visitor', { op: 'rail.chop', id, yaw: 0, collapsed: false }).accepted, 2);
    assert.equal(action(s, 'visitor', { op: 'rail.deposit', n: 8 }).accepted, 8);
    restore(s);
  }
  railTick(s, 100 + RAILWAY_DURATION);
  assert.equal(s.completion, 1);
  assert.equal(railCounts(s).carry, originalCarry);
  assert.equal(railCounts(s).loose, originalLoose);
  assert.equal(s.supply!.rack, originalRack);
  assert.equal(railwayInvariant(s), null);
});
