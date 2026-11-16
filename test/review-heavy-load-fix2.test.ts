// Regressions from the independent 526db96dd review, updated for local bounded drops (fix3).
import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import type { RailAction } from '../src/sim/railway.ts';
import { Account, Forge, Pile, Rail } from '../src/sim/railway-components.ts';
import { LOOSE_PIECE_CAPACITY, RECOVERY_RACK } from '../src/sim/railway-supply.ts';
import { railValid, type Actor } from '../src/world/railway-server.ts';
import { railPredict } from '../src/world/railway-predict.ts';
import { railSupplyPulse } from '../src/sim/railway-sys-away.ts';
import { heavyLoad, reservedDropSlots, spareDropSlots } from '../src/sim/railway-queries.ts';
import { account, apply, buildSeedWorld, invariant, pilesWithIds, railSession, restore } from './helpers/rail.ts';

function send(w: World, pid: string, op: string, fields: Partial<RailAction> = {}) {
  const a = account(w, pid)!;
  return apply(w, pid, { op, epoch: a.epoch, request: a.request + 1, ...fields }, 100000);
}
function actorAt(x: number, z: number): Actor {
  return {
    reach: (px, pz, r) => (x - px) * (x - px) + (z - pz) * (z - pz) <= r * r,
    height: () => true,
    cadence: () => true,
  };
}
function fixture(kind: number) {
  const { w } = buildSeedWorld('q1-done');
  railSession(w, 'review', 1);
  const ids: number[] = [];
  for (let i = 0; i < LOOSE_PIECE_CAPACITY / 8; i++)
    ids.push(w.spawn([Pile, { kind, n: 8, x: 115000 + i * 300, y: 2500, z: 0, age: 0 }]));
  if (kind === 2) w.mut(Forge, w.single(Forge))!.poured += LOOSE_PIECE_CAPACITY;
  else {
    const r = w.mut(Rail, w.single(Rail))!;
    r.produced += 1025;
    r.rack += 1;
  }
  assert.equal(invariant(w), null, 'starting fixture is a conserved, reloadable world');
  return { w, ids };
}

test('review: overflow rail drop must leave the forge within the checkpoint domain', () => {
  const { w } = fixture(2);
  const f = w.mut(Forge, w.single(Forge))!;
  f.poured += 4096 - f.rack + 1;
  f.rack = 4096;
  w.mut(Account, w.lookup(Account, 'review')!)!.rails = 1;
  assert.equal(invariant(w), null);
  assert.equal(restore(w).hash(), w.hash());
  const drop = { op: 'rail.drop', epoch: 1, request: 1, kind: 2, n: 1, x: 120000, y: 2500, z: 0 };
  assert.equal(railValid(w, drop, actorAt(drop.x, drop.z), 100000), true);
  assert.equal(railValid(w, drop, actorAt(drop.x + 321, drop.z), 100000), false);
  assert.equal(
    railValid(w, drop, { ...actorAt(drop.x, drop.z), height: () => false }, 100000),
    false,
    'matching horizontal coordinates do not permit a drop onto another floor',
  );
  const before = pilesWithIds(w);
  assert.equal(apply(w, 'review', drop, 100000).accepted, 0, 'full table refuses a new ordinary pile');
  assert.equal(w.get(Forge, w.single(Forge))!.rack, 4096);
  assert.deepEqual(pilesWithIds(w), before);
  assert.equal(account(w, 'review')!.rails, 1);
  assert.equal(invariant(w), null);
  assert.equal(restore(w).hash(), w.hash());
  // A local partial pile still accepts the rail, with no recovery into the saturated forge.
  const target = before[0]!;
  assert.equal(send(w, 'review', 'rail.take', { id: target.id, kind: 2 }).accepted, 7);
  assert.equal(send(w, 'review', 'rail.drop', { ...target, kind: 2, n: 1 }).accepted, 1);
  assert.equal(w.get(Forge, w.single(Forge))!.rack, 4096);
  assert.equal(invariant(w), null);
  assert.equal(restore(w).hash(), w.hash());
  // Ordinary abandonment must also preserve this same checkpoint bound; retry when space exists.
  for (const id of w.ids(Pile)) w.mut(Pile, id)!.age = 21;
  assert.equal(railSupplyPulse(w, { marker: 1, grow: '', recover: [...w.ids(Pile)] }), 0);
  assert.equal(restore(w).hash(), w.hash());
});

test('review: remote rack/drop spam must not recycle a pile being actively collected', () => {
  const { w, ids } = fixture(0);
  railSession(w, 'victim', 1);
  const victim = ids[0]!;
  // The victim takes two logs with six already on their back, leaving six at the work site.
  const a = w.mut(Account, w.lookup(Account, 'victim')!)!;
  a.carry = 6;
  const r = w.mut(Rail, w.single(Rail))!;
  r.produced += 15;
  r.rack += 9;
  assert.equal(invariant(w), null);
  assert.equal(send(w, 'victim', 'rail.take', { id: victim, kind: 0 }).accepted, 2);
  // Normal takes stop at comfort first (8). This freshly used pile still has the oldest id.
  assert.equal(w.get(Pile, victim)!.n, 6);
  const before = pilesWithIds(w)
    .filter((p) => p.kind === 0)
    .reduce((n, p) => n + p.n, 0);
  assert.equal(before, 1022);
  assert.equal(send(w, 'review', 'rail.rackTake', { kind: 0 }).accepted, 8);
  const drop = {
    op: 'rail.drop',
    epoch: 1,
    request: account(w, 'review')!.request + 1,
    kind: 0,
    n: 8,
    x: RECOVERY_RACK.x,
    y: 1800,
    z: RECOVERY_RACK.z,
  };
  assert.equal(railValid(w, drop, actorAt(drop.x, drop.z), 100000), true);
  const pickup = { op: 'rail.take', epoch: 1, request: 2, id: victim, kind: 0 };
  assert.equal(railValid(w, pickup, actorAt(115000, 0), 100000), true);
  const remote = pilesWithIds(w);
  assert.equal(apply(w, 'review', drop, 100000).accepted, 0);
  assert.equal(invariant(w), null);
  assert.equal(railValid(w, pickup, actorAt(115000, 0), 100000), true, 'the victim keeps a valid target');
  // Saturated local rack/drop attempts cannot consume stock, reserve extra cargo or touch a remote pile.
  for (let i = 1; i < ids.length; i++) {
    assert.equal(send(w, 'review', 'rail.rackTake', { kind: 0 }).accepted, 0);
    assert.equal(send(w, 'review', 'rail.drop', { ...drop, request: account(w, 'review')!.request + 1 }).accepted, 0);
  }
  assert.deepEqual(pilesWithIds(w), remote, 'every distant pile stays exactly where and as it was');
  assert.equal(account(w, 'victim')!.carry, 8, 'cargo already picked up stays on its owner');
  assert.equal(invariant(w), null);
  assert.ok(w.get(Pile, victim), 'a remote drop must not remove the pile just used by the other player');
  assert.equal(restore(w).hash(), w.hash());
});

test('review: interleaved cargo shares the pile bound and local top-ups survive reload', () => {
  const { w } = fixture(0);
  const f = w.mut(Forge, w.single(Forge))!;
  const r = w.mut(Rail, w.single(Rail))!;
  let logs = 0,
    stone = 0,
    rails = 0;
  const targets: number[] = [];
  for (const [i, id] of w.ids(Pile).entries()) {
    const p = w.mut(Pile, id)!;
    p.kind = i % 3;
    p.n = 7;
    targets[p.kind] = id;
    if (p.kind === 0) logs += p.n;
    else if (p.kind === 1) stone += p.n;
    else rails += p.n;
  }
  // Move the replaced logs into the recovery rack, then source the mixed one-piece carried load there.
  r.rack += 1024 - logs - 1;
  const madeStone = Math.ceil((stone + 1) / 8) * 8;
  r.stoneProduced += madeStone;
  r.stoneRack += madeStone - stone - 1;
  f.poured += rails + 1;
  r.pack = true;
  Object.assign(w.mut(Account, w.lookup(Account, 'review')!)!, { carry: 1, stone: 1, rails: 1 });
  assert.equal(invariant(w), null);
  const replay = restore(w);
  for (const kind of [2, 0, 1]) {
    const others = pilesWithIds(w).filter((p) => p.kind !== kind);
    const target = w.get(Pile, targets[kind]!)!;
    const before = pilesWithIds(w);
    for (const state of [w, replay])
      assert.equal(send(state, 'review', 'rail.drop', { kind, n: 1, x: 130000, y: 2500, z: kind }).accepted, 0);
    assert.deepEqual(pilesWithIds(w), before);
    for (const state of [w, replay])
      assert.equal(send(state, 'review', 'rail.drop', { ...target, kind, n: 1 }).accepted, 1);
    assert.equal(w.get(Pile, targets[kind]!)!.n, 8);
    assert.deepEqual(
      pilesWithIds(w).filter((p) => p.kind !== kind),
      others,
    );
    assert.equal(pilesWithIds(w).length, 128);
    assert.equal(invariant(w), null);
    assert.equal(replay.hash(), w.hash());
  }
});

test('review: successive predictions top up temporary piles and refuse overflow exactly as the server', () => {
  const { w } = fixture(0);
  const r = w.mut(Rail, w.single(Rail))!;
  // Free two slots by moving only these fixture piles to the rack; drops never do this.
  for (const id of w.ids(Pile).slice(-2)) {
    r.rack += w.get(Pile, id)!.n;
    w.despawn(id);
  }
  const predicted = restore(w);
  const rows = (state: World) =>
    pilesWithIds(state)
      .map(({ x, y, z, kind, n, age }) => ({ x, y, z, kind, n, age }))
      .sort((a, b) => a.x - b.x || a.z - b.z);
  // Two local temporary piles fill one piece at a time; further attempts must leave all remote rows intact.
  for (let i = 0; i < 140; i++) {
    for (const op of ['rail.rackTake', 'rail.drop']) {
      const a = account(w, 'review')!;
      const e = {
        op,
        epoch: a.epoch,
        request: a.request + 1,
        kind: 0,
        n: 1,
        x: 80000 + Math.floor(i / 8),
        y: 1800,
        z: 0,
      };
      const n = railPredict(predicted, 'review', e, 100000).n;
      assert.equal(apply(w, 'review', e, 100000).accepted, n);
    }
    assert.deepEqual(rows(predicted), rows(w));
    assert.deepEqual(account(predicted, 'review'), account(w, 'review'));
    assert.equal(predicted.get(Rail, predicted.single(Rail))!.rack, w.get(Rail, w.single(Rail))!.rack);
  }
  assert.equal(pilesWithIds(w).length, 128);
  assert.equal(invariant(w), null);
});

test('review: a confirmed and temporary partial pile at the same point top up in server order', () => {
  const { w, ids } = fixture(0);
  const last = ids.at(-1)!;
  w.mut(Rail, w.single(Rail))!.rack += w.get(Pile, last)!.n;
  w.despawn(last);
  const target = ids[0]!;
  const at = { x: 115000, y: 2500, z: 0, kind: 0, n: 1 };
  const predicted = restore(w);
  for (const [op, fields] of [
    ['rail.rackTake', {}],
    ['rail.drop', at],
    ['rail.take', { id: target }],
    ['rail.drop', at],
  ] as const) {
    const a = account(w, 'review')!;
    const e = { op, epoch: a.epoch, request: a.request + 1, ...fields };
    assert.equal(railPredict(predicted, 'review', e, 100000).n, apply(w, 'review', e, 100000).accepted);
    assert.deepEqual(predicted.get(Pile, target), w.get(Pile, target));
  }
  assert.equal(w.get(Pile, target)!.n, 8);
  assert.equal(w.get(Pile, w.ids(Pile).at(-1)!)!.n, 1);
  assert.equal(invariant(w), null);
  assert.equal(restore(w).hash(), w.hash());
});

test('review: two mixed heavy loads retain local escape slots through contention, prediction and reload', () => {
  const { w } = fixture(0);
  railSession(w, 'partner', 1);
  const r = w.mut(Rail, w.single(Rail))!;
  r.pack = true;
  // Make exactly sixteen empty slots, then allocate eight excess pieces to each player.
  for (const id of [...w.ids(Pile)].slice(-16)) {
    r.rack += w.get(Pile, id)!.n;
    w.despawn(id);
  }
  r.rack -= 16;
  r.stoneProduced += 16;
  w.mut(Forge, w.single(Forge))!.poured += 16;
  for (const pid of ['review', 'partner'])
    Object.assign(w.mut(Account, w.lookup(Account, pid)!)!, { carry: 8, stone: 8, rails: 8 });
  assert.equal(reservedDropSlots(w), 16);
  assert.equal(spareDropSlots(w), 0);
  assert.equal(invariant(w), null);
  const original = pilesWithIds(w);
  const replay = restore(w);
  // No live-presence dependency: partner could be disconnected, and these slots remain theirs.
  for (let i = 0; i < 8; i++)
    for (const [j, pid] of ['review', 'partner'].entries()) {
      const a = account(w, pid)!;
      const e = {
        op: 'rail.drop',
        epoch: 1,
        request: a.request + 1,
        kind: i % 3,
        n: 1,
        x: 80000 + i * 100,
        y: 2500,
        z: j * 1000,
      };
      assert.equal(railValid(w, e, actorAt(e.x, e.z), 100000), true);
      const predicted = restore(w); // Each player's predictor starts from the last confirmed server state.
      assert.equal(railPredict(predicted, pid, e, 100000).n, 1);
      assert.equal(apply(w, pid, e, 100000).accepted, 1);
      assert.equal(apply(replay, pid, e, 100000).accepted, 1);
      assert.equal(replay.hash(), w.hash());
      assert.deepEqual(account(predicted, pid), account(w, pid));
      assert.equal(invariant(w), null);
    }
  assert.equal(w.ids(Pile).length, 128);
  for (const pid of ['review', 'partner']) assert.equal(heavyLoad(w, pid), false);
  assert.deepEqual(pilesWithIds(w).slice(0, original.length), original);
  assert.equal(restore(w).hash(), w.hash());
  // A checkpoint cannot claim an overloaded account without its reserved drop capacity.
  w.mut(Account, w.lookup(Account, 'review')!)!.carry++;
  r.rack--;
  assert.equal(invariant(w), 'railway: piles');
  assert.throws(() => restore(w), /railway: piles/);
});
