import test from 'node:test';
import assert from 'node:assert/strict';
import { railwayAtTrains, TRAIN_STAGES } from './helpers/railway-trains.ts';
import { chopTo } from './helpers/railway-works.ts';
import { railwayAtQ5, act, advance } from './helpers/railway-q2.ts';
import { restore, worldOf, edit, invariant, railResume, railSession, railSupplyPulse } from './railway-live.ts';
import { railBoilerRelease } from '../src/sim/railway-systems.ts';
import {
  Account,
  Boiler,
  Forge,
  Pile,
  QJob,
  Rail,
  createRailwayWorld,
  railwayCheck,
} from '../src/sim/railway-world.ts';
import { railAccount } from '../src/sim/railway.ts';
import { LINE2_BOILER } from '../src/sim/railway-line2-layout.ts';
import { line2Active, line2KitOwed, line2Rails, line2Schedule, line2Trains } from '../src/sim/railway-line2.ts';
import { trainOwed } from '../src/entities/railway/forge-offer.ts';
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
  chopTo(w, 'a', 1);
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

// Station 6 waits for the train (docs/plans/boiler-first-choice.md, step 3; owner, 9 November).
type Fixture = ReturnType<typeof railwayAtTrains>;
/** A doctored, conserved world: `logs` from the apron's leftover pile and `rails` off the forge rack moved onto station
 * 6's frame (a world hand-fed before the rule shipped), and `carried` rails off the rack onto a's back. */
function doctored(w: Fixture, logs: number, rails: number, carried = 0): Fixture {
  const s = restore(w.s);
  edit(s, (e) => {
    let left = logs,
      a = -1;
    const emptied: number[] = [];
    e.each([Pile], (id, p) => {
      const n = p.kind === 0 ? Math.min(left, p.n) : 0;
      if (n === p.n) emptied.push(id);
      else if (n) e.mut(Pile, id)!.n -= n;
      left -= n;
    });
    for (const id of emptied) e.despawn(id);
    e.each([Account], (id, row) => {
      if (row.pid === 'a') a = id;
    });
    assert.ok(left === 0 && a >= 0, "the apron keeps Q5's leftover logs");
    e.mut(Forge, e.single(Forge))!.rack -= rails + carried;
    e.mut(Account, a)!.rails += carried;
    const j = e.mut(QJob, e.lookup(QJob, 5)!)!;
    j.stock += logs;
    j.delivered += logs;
    j.railStock += rails;
    j.railDelivered += rails;
  });
  const out = { s: restore(s), t: w.t };
  assert.equal(invariant(out.s), null);
  assert.equal(line2Rails(out.s), out.s.line2!.forge.poured);
  return out;
}
const fit = (w: Fixture) => {
  const l = w.s.line2!;
  assert.equal(act(w, 'b', 'rail.boilerTake', { revision: l.boiler.revision }), 1);
  assert.equal(act(w, 'b', 'rail.boilerFit', { revision: l.boiler.revision }), 1);
};
test('station 6 takes nothing by hand and the forge gives no rails until trains run', () => {
  const w = doctored(railwayAtTrains('boiler'), 0, 0, 4),
    l = w.s.line2!;
  chopTo(w, 'a', 4); // a back holds 8: 4 logs beside the 4 rails
  const rack = l.forge.rack;
  assert.ok(rack > 0, 'the rack has rails');
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q6', kind: 0, n: 4 }), 0, 'no logs by hand');
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q6', kind: 2, n: 4 }), 0, 'no rails by hand');
  assert.equal(act(w, 'b', 'rail.forgeTake'), 0, 'the rack keeps its rails for the kit');
  assert.equal(l.forge.rack, rack);
  assert.deepEqual([l.jobs[5]!.stock, l.jobs[5]!.railStock], [0, 0]);
  assert.deepEqual([railAccount(w.s, 'a')!.carry, railAccount(w.s, 'a')!.rails], [4, 4], 'the back keeps its load');
  // The fit opens both: the frame takes a back's load and the rack gives rails again.
  fit(w);
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q6', kind: 0, n: 4 }), 4);
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q6', kind: 2, n: 4 }), 4);
  assert.ok(act(w, 'a', 'rail.forgeTake') > 0, 'the rack gives rails after the fit');
  assert.equal(line2Rails(w.s), l.forge.poured);
});
test('a station 6 part-filled by hand keeps its stock; the first train brings only the rest', () => {
  const w = doctored(railwayAtTrains('boiler'), 10, 6),
    l = w.s.line2!;
  assert.deepEqual(line2KitOwed(w.s), { logs: 22, rails: 26 });
  chopTo(w, 'a', 4);
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q6', kind: 0, n: 4 }), 0, 'the frame takes nothing more');
  assert.deepEqual([l.jobs[5]!.stock, l.jobs[5]!.railStock, l.jobs[5]!.start], [10, 6, -1]);
  fit(w);
  for (let ticks = 0; l.depot !== 22 || l.depotRails !== 26; ticks++) {
    assert.ok(ticks < 4000, 'the kit unloads at Far Head');
    advance(w, 1);
    assert.equal(line2Rails(w.s), l.forge.poured);
  }
  advance(w, 40);
  assert.deepEqual([l.depot, l.depotRails], [22, 26], 'only the rest came');
  assert.deepEqual([l.jobs[5]!.stock, l.jobs[5]!.railStock], [10, 6], 'what was in the frame stays there');
  assert.equal(invariant(w.s), null);
});
test('the rule never fires before station 6 or once trains run; every stage conserves', () => {
  const stages: [string, () => Fixture][] = [
    // Q5 still taking materials, then station 6 from the boiler to laid; the Works stages (after Q6) are in
    // railway-works.test.ts's forge offer test.
    ['q5-finishing', () => railwayAtQ5('q5-finishing')],
    ...TRAIN_STAGES.map((k): [string, () => Fixture] => [k, () => railwayAtTrains(k)]),
  ];
  const seen = { owed: 0, free: 0 };
  for (const [name, make] of stages) {
    const w = make(),
      s = w.s,
      l = s.line2!;
    const k = line2Active(s),
      owed = trainOwed(k, line2Trains(s));
    seen[owed ? 'owed' : 'free']++;
    assert.equal(owed, k === 5 && l.trains < 0, name);
    if (owed) {
      chopTo(w, 'a', 1);
      assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q6', kind: 0, n: 1 }), 0, name);
      assert.equal(act(w, 'b', 'rail.forgeTake'), 0, name);
    }
    assert.equal(invariant(s), null, name);
    assert.equal(line2Rails(s), l.forge.poured, name);
  }
  assert.ok(seen.owed > 0 && seen.free > 0, JSON.stringify(seen));
});
