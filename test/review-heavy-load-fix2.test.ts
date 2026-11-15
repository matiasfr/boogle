// Independent review of 526db96dd against 0dfc13daa. No production changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import type { RailAction } from '../src/sim/railway.ts';
import { Account, Forge, Pile, Rail } from '../src/sim/railway-components.ts';
import { LOOSE_PIECE_CAPACITY, RECOVERY_RACK } from '../src/sim/railway-supply.ts';
import { railValid, type Actor } from '../src/world/railway-server.ts';
import { railPredict } from '../src/world/railway-predict.ts';
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
  assert.equal(apply(w, 'review', drop, 100000).accepted, 1);
  assert.equal(w.get(Forge, w.single(Forge))!.rack, 4104);
  assert.throws(() => restore(w), /railway: line2 bounds/, 'the resulting snapshot cannot reload');
  assert.equal(invariant(w), null, 'accepted drop must remain loadable (actual: railway: line2 bounds)');
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
  assert.equal(apply(w, 'review', drop, 100000).accepted, 8);
  assert.equal(invariant(w), null);
  assert.equal(railValid(w, pickup, actorAt(115000, 0), 100000), false, 'the victim loses a valid target');
  // At Home, endlessly take back the remotely recovered logs and drop them locally. No harvesting or travel.
  for (let i = 1; i < ids.length; i++) {
    assert.equal(send(w, 'review', 'rail.rackTake', { kind: 0 }).accepted, 8);
    assert.equal(send(w, 'review', 'rail.drop', { ...drop, request: account(w, 'review')!.request + 1 }).accepted, 8);
  }
  assert.equal(ids.filter((id) => w.has(Pile, id)).length, 0, 'all 128 distant piles have been recycled');
  assert.equal(account(w, 'victim')!.carry, 8, 'cargo already picked up stays on its owner');
  assert.equal(invariant(w), null);
  assert.ok(w.get(Pile, victim), 'a remote drop must not remove the pile just used by the other player');
});

test('review: interleaved cargo caps and oldest-first recovery survive reload', () => {
  const { w } = fixture(0);
  const f = w.mut(Forge, w.single(Forge))!;
  const r = w.mut(Rail, w.single(Rail))!;
  for (const kind of [1, 2]) {
    for (let i = 0; i < 128; i++) w.spawn([Pile, { kind, n: 8, x: 120000 + i * 300, y: 2500, z: kind * 300, age: 0 }]);
  }
  r.stoneProduced += 1032;
  r.produced += 10;
  r.rack += 2;
  f.poured += 1032;
  r.pack = true;
  Object.assign(w.mut(Account, w.lookup(Account, 'review')!)!, { carry: 8, stone: 8, rails: 8 });
  assert.equal(invariant(w), null);
  const replay = restore(w);
  for (const kind of [2, 0, 1]) {
    const others = pilesWithIds(w).filter((p) => p.kind !== kind);
    const oldest = pilesWithIds(w).find((p) => p.kind === kind)!.id;
    for (const state of [w, replay])
      assert.equal(send(state, 'review', 'rail.drop', { kind, n: 8, x: 130000, y: 2500, z: kind }).accepted, 8);
    assert.equal(w.get(Pile, oldest), undefined);
    assert.deepEqual(
      pilesWithIds(w).filter((p) => p.kind !== kind),
      others,
    );
    assert.equal(
      pilesWithIds(w)
        .filter((p) => p.kind === kind)
        .reduce((n, p) => n + p.n, 0),
      1024,
    );
    assert.equal(invariant(w), null);
    assert.equal(replay.hash(), w.hash());
  }
});

test('review: successive predictions recover temporary piles in server creation order', () => {
  const { w } = fixture(0);
  const r = w.mut(Rail, w.single(Rail))!;
  r.produced += 10;
  r.rack += 10;
  const predicted = restore(w);
  const rows = (state: World) =>
    pilesWithIds(state)
      .map(({ x, y, z, kind, n, age }) => ({ x, y, z, kind, n, age }))
      .sort((a, b) => a.x - b.x || a.z - b.z);
  // More than 128 drops exhaust confirmed piles and exercise the negative temporary ids as oldest candidates.
  for (let i = 0; i < 140; i++) {
    for (const op of ['rail.rackTake', 'rail.drop']) {
      const a = account(w, 'review')!;
      const e = { op, epoch: a.epoch, request: a.request + 1, kind: 0, n: 8, x: 80000 + i, y: 1800, z: 0 };
      assert.equal(railPredict(predicted, 'review', e, 100000).n, 8);
      assert.equal(apply(w, 'review', e, 100000).accepted, 8);
    }
    assert.deepEqual(rows(predicted), rows(w));
    assert.deepEqual(account(predicted, 'review'), account(w, 'review'));
    assert.equal(predicted.get(Rail, predicted.single(Rail))!.rack, w.get(Rail, w.single(Rail))!.rack);
  }
  assert.equal(invariant(w), null);
});
