// Independent a7aa22d03 review: boundary refusals and reservation contention.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Account, Pile, Rail } from '../src/sim/railway-components.ts';
import { reservedDropSlots, spareDropSlots, heavyLoad } from '../src/sim/railway-queries.ts';
import { railPredict } from '../src/world/railway-predict.ts';
import { railValid } from '../src/world/railway-server.ts';
import { account, apply, buildSeedWorld, invariant, railSession, restore } from './helpers/rail.ts';
import { playOrder } from '../dev/loop/run.ts';

function fixture(count: number) {
  const { w } = buildSeedWorld('awake');
  railSession(w, 'reviewa', 1);
  railSession(w, 'reviewb', 1);
  for (const pid of ['reviewa', 'reviewb']) w.mut(Account, w.lookup(Account, pid)!)!.carry = 8;
  const ids = Array.from({ length: count }, (_, i) =>
    w.spawn([Pile, { kind: 0, n: 1, x: 90000 + i * 100, y: 1800, z: 0, age: 0 }]),
  );
  const r = w.mut(Rail, w.single(Rail))!;
  const produced = Math.ceil((count + 24) / 5) * 5;
  r.produced += produced;
  r.rack += produced - count - 16;
  assert.equal(invariant(w), null);
  assert.equal(restore(w).hash(), w.hash());
  return { w, ids };
}

test('review fix3: the real-host loop can clear its back and finish T2', () => {
  const result = playOrder(['wake', 'T1', 'T2'], 'review drop-height', 1);
  assert.equal(result.softlock, undefined, JSON.stringify(result.softlock));
  assert.ok(result.nodes.some((n) => n.id === 'T2'));
});

test('review fix3: only one of two predictions gets the last reservation; renewal and reload retain cargo', () => {
  let { w } = fixture(127);
  const e = { op: 'rail.rackTake', epoch: 1, request: 1, kind: 0 };
  for (const pid of ['reviewa', 'reviewb']) assert.equal(railPredict(restore(w), pid, e, 100000).n, 1);
  assert.equal(apply(w, 'reviewa', e, 100000).accepted, 1);
  assert.equal(apply(w, 'reviewb', e, 100000).accepted, 0);
  assert.equal(reservedDropSlots(w), 1);
  assert.equal(invariant(w), null);
  w = restore(w);
  assert.equal(railSession(w, 'reviewa', 2), true);
  assert.equal(account(w, 'reviewa')!.carry, 9);
  assert.equal(reservedDropSlots(w), 1);
  const remote = w.ids(Pile).map((id) => ({ id, ...w.get(Pile, id)! }));
  assert.equal(
    apply(w, 'reviewb', { op: 'rail.drop', epoch: 1, request: 2, n: 1, x: 1, y: 0, z: 1 }, 100000).accepted,
    0,
  );
  assert.equal(
    apply(w, 'reviewa', { op: 'rail.drop', epoch: 2, request: 1, n: 1, x: 1, y: 0, z: 1 }, 100000).accepted,
    1,
  );
  assert.equal(heavyLoad(w, 'reviewa'), false);
  assert.equal(reservedDropSlots(w), 0);
  assert.deepEqual(
    remote.map(({ id }) => ({ id, ...w.get(Pile, id)! })),
    remote,
  );
  assert.equal(invariant(w), null);
  assert.equal(restore(w).hash(), w.hash());
});

test('final: only whole-pile takes reclaim a slot, in prediction and after reload', () => {
  for (const [count, pieces, carry, accepted] of [
    [128, 1, 8, 1],
    [128, 2, 8, 0], // One freed slot cannot reserve two excess pieces.
    [127, 2, 8, 2], // One spare plus one reclaimed slot fits the whole pile.
    [127, 3, 8, 1], // A partial take may use only the pre-existing spare slot.
    [125, 5, 8, 3], // The carry ceiling prevents emptying this pile, even with slot credit.
    [128, 2, 7, 1], // The first take still stops at comfort, without reserving an excess piece.
  ] as const) {
    const { w, ids } = fixture(count);
    const id = ids[0]!;
    w.mut(Pile, id)!.n = pieces;
    w.mut(Account, w.lookup(Account, 'reviewa')!)!.carry = carry;
    w.mut(Rail, w.single(Rail))!.rack -= pieces - 1 + carry - 8;
    assert.equal(invariant(w), null);
    const e = { op: 'rail.take', epoch: 1, request: 1, id, kind: 0 };
    assert.equal(railValid(w, e, { reach: () => true, height: () => true, cadence: () => true }), true);
    const predicted = restore(w);
    assert.equal(railPredict(predicted, 'reviewa', e, 100000).n, accepted);
    assert.equal(apply(w, 'reviewa', e, 100000).accepted, accepted);
    assert.equal(account(w, 'reviewa')!.carry, carry + accepted);
    assert.equal(w.get(Pile, id)?.n ?? 0, pieces - accepted);
    assert.equal(w.ids(Pile).length, count - Number(pieces === accepted));
    assert.equal(reservedDropSlots(w), Math.max(0, carry + accepted - 8));
    assert.equal(spareDropSlots(w), 128 - w.ids(Pile).length - reservedDropSlots(w));
    assert.equal(invariant(w), null);
    assert.equal(restore(w).hash(), w.hash());
    assert.equal(account(predicted, 'reviewa')!.carry, account(w, 'reviewa')!.carry);
    assert.equal(predicted.get(Pile, id)?.n, w.get(Pile, id)?.n);
  }
});
