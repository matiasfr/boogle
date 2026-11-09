import test from 'node:test';
import assert from 'node:assert/strict';
import { railwayAtTrains } from './helpers/railway-trains.ts';
import { railwayAtQ5, act, advance } from './helpers/railway-q2.ts';
import { restore, worldOf, edit, invariant, railResume, railSession, railSupplyPulse } from './railway-live.ts';
import { railBoilerRelease } from '../src/sim/railway-systems.ts';
import { Boiler, Rail, createRailwayWorld, railwayCheck } from '../src/sim/railway-world.ts';
import { LINE2_BOILER } from '../src/sim/railway-line2-layout.ts';
import { line2Schedule } from '../src/sim/railway-line2.ts';
import { TRAIN_HOME } from '../src/sim/railway-train.ts';

test('cast once when Q5 completes, at the apron', () => {
  const w = railwayAtQ5('q5-finishing');
  assert.equal(w.s.line2!.boiler.state, 'none');
  const ticks = line2Schedule(4, w.s.line2!.jobs[4]!).totalTicks;
  railResume(w.s, ticks, 1, w.t);
  const b = w.s.line2!.boiler;
  assert.equal(b.state, 'pedestal');
  assert.deepEqual([b.x, b.y, b.z], [LINE2_BOILER.x, LINE2_BOILER.y, LINE2_BOILER.z]);
  const revision = b.revision;
  advance(w, 20);
  assert.equal(b.revision, revision);
  assert.equal(restore(w.s).line2!.boiler.state, 'pedestal');
});
test('one boiler for two takers', () => {
  const w = railwayAtTrains('boiler'),
    b = w.s.line2!.boiler;
  const revision = b.revision;
  assert.equal(act(w, 'a', 'rail.boilerTake', { revision }), 1);
  assert.equal(act(w, 'b', 'rail.boilerTake', { revision }), 0);
  assert.equal(b.holder, 'a');
});
test('a held boiler blocks the back', () => {
  const w = railwayAtTrains('boiler');
  assert.equal(act(w, 'a', 'rail.forgeTake') > 0, true);
  assert.equal(act(w, 'a', 'rail.boilerTake', { revision: w.s.line2!.boiler.revision }), 0);
  assert.equal(act(w, 'b', 'rail.boilerTake', { revision: w.s.line2!.boiler.revision }), 1);
  for (const op of ['rail.forgeTake', 'rail.depotTake', 'rail.depotRailTake', 'rail.rackTake', 'rail.beamTake'])
    assert.equal(act(w, 'b', op, { revision: w.s.line!.beam.revision }), 0);
});
test('dropped where released, on Home only', () => {
  const w = railwayAtTrains('boiler-camp'),
    b = w.s.line2!.boiler;
  assert.equal(b.state, 'ground');
  assert.deepEqual([b.x, b.y, b.z], [100700, 3030, -14400]);
  act(w, 'a', 'rail.boilerTake', { revision: b.revision });
  act(w, 'a', 'rail.boilerDrop', { revision: b.revision, x: 120000, y: 0, z: -20000 });
  assert.equal(b.state, 'pedestal');
  assert.equal(b.x, LINE2_BOILER.x);
});
test('the holder leaves: back on the pedestal', () => {
  const w = railwayAtTrains('boiler'),
    b = w.s.line2!.boiler;
  act(w, 'a', 'rail.boilerTake', { revision: b.revision });
  const revision = b.revision;
  railSession(w.s, 'a', 2);
  edit(w.s, (e) => {
    assert.equal(railBoilerRelease(e, 'a', 1, revision), 0);
    assert.equal(railBoilerRelease(e, 'a', 2, revision - 1), 0);
    assert.equal(railBoilerRelease(e, 'a', 2, revision), 1);
  });
  assert.equal(b.state, 'pedestal');
  assert.equal(b.holder, '');
  assert.equal(invariant(w.s), null);
});
test('a ground boiler recovers after its minutes', () => {
  const w = railwayAtTrains('boiler-camp'),
    b = w.s.line2!.boiler;
  const revision = b.revision;
  railSupplyPulse(w.s, { marker: 100, grow: '', recover: [] });
  railSupplyPulse(w.s, { marker: 121, grow: '', recover: [] });
  assert.equal(b.age, 21);
  railSupplyPulse(w.s, { marker: 121, grow: '', recover: [], boiler: revision - 1 });
  assert.equal(b.state, 'ground');
  railSupplyPulse(w.s, { marker: 121, grow: '', recover: [], boiler: revision });
  assert.equal(b.state, 'pedestal');
  assert.equal(b.revision, revision + 1);
  assert.equal(invariant(w.s), null);
});
test('fit once, at the old train', () => {
  const w = railwayAtTrains('boiler'),
    l = w.s.line2!;
  act(w, 'a', 'rail.boilerTake', { revision: l.boiler.revision });
  assert.equal(act(w, 'a', 'rail.boilerFit', { revision: l.boiler.revision }), 1);
  assert.equal(l.trains, w.t);
  assert.equal(l.boiler.state, 'fitted');
  assert.deepEqual(
    l.train.map((r) => r.at),
    [...TRAIN_HOME],
  );
  assert.equal(act(w, 'a', 'rail.boilerFit', { revision: l.boiler.revision }), 0);
});
test('malformed boiler documents fail atomically', () => {
  const w = railwayAtTrains('boiler');
  for (const state of ['fitted', 'held', 'pedestal']) {
    const bad = restore(w.s);
    edit(bad, (e) => {
      e.mut(Boiler, e.single(Boiler))!.state = state;
      if (state === 'pedestal') e.mut(Rail, e.single(Rail))!.trains = 1;
    });
    const target = createRailwayWorld(),
      hash = target.hash();
    assert.throws(() => target.load(JSON.parse(JSON.stringify(worldOf(bad).snapshot())), railwayCheck), /boiler/);
    assert.equal(target.hash(), hash);
  }
  const early = createRailwayWorld();
  early.mut(Boiler, early.single(Boiler))!.state = 'pedestal';
  assert.throws(() => railwayCheck(early), /boiler/);
});
