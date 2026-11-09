import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAIN,
  TRAIN_PHASE,
  TRAIN_STOPS,
  LINE_HALTS,
  trainLegTicks,
  trainLegAlong,
  trainAlong,
  trainArrives,
  trainEtaTicks,
  trainIdle,
} from '../src/sim/railway-train.ts';
import { railwayAtTrains, TRAIN_STAGES } from './helpers/railway-trains.ts';
import { act, advance } from './helpers/railway-q2.ts';
import { restore, invariant, edit, worldOf, railResume } from './railway-live.ts';
import { line2Active, line2Completed, line2Rails } from '../src/sim/railway-line2.ts';
import { railCounts } from '../src/sim/railway.ts';
import { Cart, Train, createRailwayWorld, railwayCheck } from '../src/sim/railway-world.ts';
import { CART_PHASE } from '../src/sim/railway-cart.ts';
import { HALTS, LINKS, ORIGIN, lineAt, railY } from '../src/proto/place/layout.ts';

test('train legs: eased, whole cm, eta = arrival', () => {
  assert.equal(trainLegTicks(15700), 136);
  for (const dist of [0, 20, 15700, 19300, 35000]) {
    let prev = 0;
    assert.equal(trainLegAlong(dist, -10), 0);
    for (let t = 0; t <= trainLegTicks(dist); t++) {
      const s = trainLegAlong(dist, t);
      assert.ok(Number.isInteger(s) && s >= prev && s <= dist);
      prev = s;
    }
    assert.equal(prev, dist);
  }
  const row = { ...trainIdle(1), phase: TRAIN_PHASE.RUN, at: 0, to: 1, depart: 100 };
  for (let t = 100; t <= trainArrives(row, 1); t++) assert.equal(trainEtaTicks(row, 1, 1, t), trainArrives(row, 1) - t);
});
test('halts and stops match the pinned Place layout', () => {
  TRAIN_STOPS.forEach((s, k) =>
    assert.deepEqual(
      s,
      LINKS[k]!.stops.map((v) => v * 100),
    ),
  );
  LINE_HALTS.forEach((h, k) => {
    const spec = HALTS[k]!,
      line = LINKS[spec.line]!.line,
      s = (spec.s0 + spec.s1) / 2;
    const q = { x: 0, z: 0, ux: 0, uz: 0 };
    lineAt(line, s, q);
    const x = (ORIGIN.x + q.x - q.uz * spec.lat) * 100;
    const z = (ORIGIN.z + q.z + q.ux * spec.lat) * 100;
    assert.ok(Math.abs(h.x - x) <= 5 && Math.abs(h.z - z) <= 5, h.name);
    assert.ok(Math.abs(h.y - (Math.min(railY(line, spec.s0), railY(line, spec.s1)) + 0.72) * 100) <= 5, h.name);
  });
});
test('pose is continuous across arrivals, departures and calls', () => {
  const w = railwayAtTrains('trains-on');
  const raw = worldOf(w.s);
  const rows = () => raw.ids(Train).map((id) => raw.get(Train, id)!);
  const prev = rows().map((r, k) => trainAlong(r, k, w.t));
  const arrivals = [0, 0];
  for (let t = 0; t < 2600; t++) {
    if (t === 160) act(w, 'a', 'rail.call', { id: 2 });
    if (t === 500) act(w, 'a', 'rail.call', { id: 4 });
    const phases = rows().map((r) => r.phase);
    advance(w, 1);
    rows().forEach((r, k) => {
      const at = trainAlong(r, k, w.t);
      assert.ok(Math.abs(at - prev[k]!) <= TRAIN.speed + 1, `line ${k} tick ${w.t}`);
      if (phases[k] === TRAIN_PHASE.RUN && r.phase === TRAIN_PHASE.STAND) arrivals[k]!++;
      prev[k] = at;
    });
  }
  assert.ok(arrivals.every((n) => n >= 6));
  assert.equal(invariant(w.s), null);
});
test('a call: next decision, idempotent, holds a standing train', () => {
  const w = railwayAtTrains('trains-on'),
    l = w.s.line2!;
  assert.equal(act(w, 'a', 'rail.call', { id: 4 }), 1);
  assert.equal(act(w, 'a', 'rail.call', { id: 4 }), 0);
  while (l.train[1]!.phase === 0) advance(w, 1);
  assert.equal(l.train[1]!.to, 2, 'called directly past the quarry');
  assert.equal(act(w, 'a', 'rail.call', { id: 2 }), 1);
  assert.equal(l.train[1]!.to, 2, 'running leg finishes before call changes its destination');
  while (l.train[1]!.phase === 1) advance(w, 1);
  advance(w, TRAIN.callDwellTicks);
  assert.equal(l.train[1]!.to, 0);
  while (l.train[1]!.phase === 1) advance(w, 1);
  advance(w, 1);
  assert.equal(act(w, 'a', 'rail.call', { id: 2 }), 1);
  const depart = l.train[1]!.depart;
  assert.equal(depart, w.t);
  advance(w, TRAIN.dwellTicks - 1);
  assert.equal(l.train[1]!.phase, 0);
});
test('line 1 waits for the cart to rest', () => {
  const w = railwayAtTrains('trains-on');
  edit(w.s, (e) => Object.assign(e.mut(Cart, e.single(Cart))!, { phase: CART_PHASE.LOAD, depart: w.t + 500 }));
  advance(w, 200);
  assert.equal(w.s.line2!.train[0]!.phase, 0);
  edit(w.s, (e) => Object.assign(e.mut(Cart, e.single(Cart))!, { phase: CART_PHASE.REST }));
  advance(w, 1);
  assert.equal(w.s.line2!.train[0]!.phase, 1);
});
test('the kit: every unit has one home; snapshot mid-trip', () => {
  const w = railwayAtTrains('trains-on'),
    l = w.s.line2!;
  let snapshot = false;
  for (let t = 0; l.depot !== 32 || l.depotRails !== 32; t++) {
    assert.ok(t < 3000);
    const before = railCounts(w.s);
    advance(w, 1);
    assert.equal(line2Rails(w.s), l.forge.poured);
    const counts = railCounts(w.s);
    assert.equal(counts.total - before.total, counts.produced - before.produced);
    assert.ok(l.depotOut[5]! <= 32);
    assert.equal(invariant(w.s), null);
    if (!snapshot && l.train[1]!.phase === 1 && l.train[1]!.logs) {
      const copy = restore(w.s);
      assert.deepEqual(copy.line2!.train, l.train);
      assert.equal(trainAlong(copy.line2!.train[1]!, 1, w.t), trainAlong(l.train[1]!, 1, w.t));
      snapshot = true;
    }
  }
  assert.ok(snapshot);
  assert.equal(l.train[1]!.logs + l.train[1]!.rails, 0);
  const rows = JSON.stringify(l.train);
  railResume(w.s, 0, w.t + 1, w.t, 50000);
  assert.equal(JSON.stringify(l.train), rows, 'away credit never advances trains');
});
test('eta equals the arrival tick', () => {
  const w = railwayAtTrains('trains-on');
  act(w, 'a', 'rail.call', { id: 4 });
  while (w.s.line2!.train[1]!.phase !== 1) advance(w, 1);
  const eta = trainEtaTicks(w.s.line2!.train[1]!, 1, 2, w.t);
  advance(w, eta);
  assert.equal(w.s.line2!.train[1]!.at, 2);
  assert.equal(trainEtaTicks(w.s.line2!.train[1]!, 1, 2, w.t), 0);
});
test('Q6 funds from the rack and lays to the pier; every new seed loads', () => {
  for (const stage of TRAIN_STAGES) {
    const w = railwayAtTrains(stage);
    assert.equal(invariant(w.s), null, stage);
    if (stage === 'q6-done') {
      assert.equal(line2Completed(w.s), 6);
      assert.equal(line2Active(w.s), -1);
    }
  }
});
test('malformed train rows fail atomically', () => {
  const w = railwayAtTrains('trains-on');
  for (const patch of [{ at: 9 }, { sweep: 0 }, { logs: 33 }, { call: -2 }, { phase: 2 }]) {
    const copy = restore(w.s);
    edit(copy, (e) => Object.assign(e.mut(Train, e.lookup(Train, 1)!)!, patch));
    const target = createRailwayWorld(),
      hash = target.hash();
    assert.throws(() => target.load(JSON.parse(JSON.stringify(worldOf(copy).snapshot())), railwayCheck), /railway:/);
    assert.equal(target.hash(), hash);
  }
});
