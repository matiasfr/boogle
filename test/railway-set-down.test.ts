import test from 'node:test';
import assert from 'node:assert/strict';
import {
  account,
  act,
  boiler,
  buildSeedWorld,
  chopTo,
  haltYard,
  invariant,
  LOGS,
  piles,
  rail,
  railwayAtTrains,
  restore,
  roomOf,
  type Seed,
} from './helpers/rail.ts';
import { line2Rails, railCounts } from '../src/sim/railway-queries-line2.ts';
import { plan } from '../src/entities/railway/back-down-plan.ts';
import { createDropHold, DROP_HOLD_MS } from '../src/player/drop-hold.ts';

// docs/brainstorms/station-deposit.md build 0: a full back goes down as piles and the big thing is taken, all from the
// existing ops, in one tick and in order.
const logsIn = (s: Seed) =>
  piles(s.w)
    .filter((p) => p.kind === 0)
    .reduce((n, p) => n + p.n, 0);

test('16 logs on the back: two drops and a boilerTake in one tick are all accepted and nothing is lost', () => {
  const s = railwayAtTrains('boiler'),
    first = boiler(s.w).revision;
  const before = logsIn(s);
  act(s, 'a', 'rail.pack'); // the pack frame: a back of 16
  chopTo(s, 'a', 16);
  const a = () => account(s.w, 'a')!;
  assert.equal(a().carry, 16);
  const carried = a().carry + logsIn(s);
  assert.equal(act(s, 'a', 'rail.boilerTake', { revision: first }), 0, 'a loaded back is still refused by the rule');
  assert.equal(act(s, 'a', 'rail.drop', { x: 100000, y: 3000, z: -15000, n: 8, kind: 0 }), 8);
  assert.equal(act(s, 'a', 'rail.drop', { x: 100000, y: 3000, z: -14000, n: 8, kind: 0 }), 8);
  assert.equal(a().carry, 0);
  assert.equal(act(s, 'a', 'rail.boilerTake', { revision: boiler(s.w).revision }), 1);
  assert.equal(boiler(s.w).holder, 'a');
  assert.equal(logsIn(s), before + 16, 'every log is in a pile, none lost');
  assert.equal(logsIn(s) + a().carry, carried);
  const at = piles(s.w).filter((p) => p.x === 100000 && (p.z === -15000 || p.z === -14000));
  assert.deepEqual(at.map((p) => p.n).sort(), [8, 8], 'the pile is where it was set down');
});

test('a single drop of a whole back takes only a pile (8): the planner sends two', () => {
  const s = railwayAtTrains('boiler');
  act(s, 'a', 'rail.pack'); // the pack frame: a back of 16
  chopTo(s, 'a', 16);
  assert.equal(act(s, 'a', 'rail.drop', { x: 100000, y: 3000, z: -15000, n: 16, kind: 0 }), 8);
});

const spots = [0, 1, 2, 3].map((i) => ({ x: i, y: 0, z: 0 }));
test('plan: a back of 16 is two piles of 8 at the first two spots; 5 is one', () => {
  assert.deepEqual(
    plan([16, 0, 0], [], spots).map((d) => [d.x, d.n, d.kind]),
    [
      [0, 8, 0],
      [1, 8, 0],
    ],
  );
  assert.deepEqual(
    plan([5, 0, 0], [], spots).map((d) => [d.x, d.n]),
    [[0, 5]],
  );
});
test('plan: a part-full pile of the kind in reach is topped up first; other kinds get their own spots', () => {
  const near = { x: 50, y: 0, z: 0, n: 6, kind: 0 };
  assert.deepEqual(
    plan([5, 3, 0], [near], spots).map((d) => [d.x, d.n, d.kind]),
    [
      [0.5, 2, 0],
      [0, 3, 0],
      [1, 3, 1],
    ],
  );
  assert.deepEqual(plan([0, 0, 0], [], spots), []);
});

test('hold Drop: released early is one tap; held to the threshold puts it all down once and the release adds nothing', () => {
  const log: string[] = [];
  const h = createDropHold({ tap: () => log.push('tap'), all: () => log.push('all') });
  h.down(1000, true);
  h.tick(1000 + DROP_HOLD_MS - 1);
  h.up(1000 + DROP_HOLD_MS - 1);
  assert.deepEqual(log, ['tap']);
  h.down(5000, true);
  assert.ok(h.progress(5000 + DROP_HOLD_MS / 2) > 0.45 && h.progress(5000 + DROP_HOLD_MS / 2) < 0.55);
  h.tick(5000 + DROP_HOLD_MS);
  h.tick(5000 + DROP_HOLD_MS + 16);
  h.up(5000 + 2 * DROP_HOLD_MS);
  assert.deepEqual(log, ['tap', 'all']);
  assert.equal(h.progress(9000), 0);
  h.down(9000, false);
  assert.deepEqual(log, ['tap', 'all', 'tap'], 'one piece or none: taps at once, no hold');
  h.down(9500, true);
  h.cancel();
  h.up(9600);
  assert.equal(log.length, 3, 'a cancelled hold does nothing');
});

// docs/plans/halt-yard.md step 1: a halt yard takes a whole kind off the back and gives it back to anyone, on the
// world's own rules (the server's reach, open and kind checks are the host test's).
const yardRow = (s: Seed, k: number) => {
  const y = haltYard(s.w, k);
  return [y.logs, y.stone, y.rails];
};
/** Every conserved total: the logs, the stone and the rails. */
const totals = (s: Seed) => {
  const c = railCounts(s.w);
  return [c.total, c.stone.total, line2Rails(s.w)];
};
test('halt yard: leave it here, pick it up, nothing lost', () => {
  const s = buildSeedWorld('q3-done');
  act(s, 'a', 'rail.pack'); // a back of 16 logs
  chopTo(s, 'a', 10);
  assert.ok(act(s, 'a', 'rail.forgeTake') > 0);
  const a = () => account(s.w, 'a')!;
  const [logs, rails] = [a().carry, a().rails];
  const before = totals(s);
  assert.equal(act(s, 'a', 'rail.haltPut', { yard: 3, kind: 0 }), 0, 'Far Head is closed before Q5 is laid');
  assert.equal(act(s, 'a', 'rail.haltPut', { yard: 2, kind: 1 }), 0, 'no stone on the back');
  assert.equal(act(s, 'a', 'rail.haltPut', { yard: 2, kind: 0 }), logs);
  assert.equal(act(s, 'a', 'rail.haltPut', { yard: 2, kind: 2 }), rails);
  assert.deepEqual([a().carry, a().rails], [0, 0]);
  assert.deepEqual(yardRow(s, 2), [logs, 0, rails]);
  assert.deepEqual(totals(s), before, 'the yard is in the conserved counts');
  const room = roomOf(s.w, account(s.w, 'b')!, LOGS);
  assert.equal(act(s, 'b', 'rail.haltTake', { yard: 3, kind: 0 }), 0, 'nothing from a closed yard');
  assert.equal(act(s, 'b', 'rail.haltTake', { yard: 2, kind: 0 }), Math.min(logs, room));
  assert.deepEqual(yardRow(s, 2), [logs - Math.min(logs, room), 0, rails]);
  assert.deepEqual(totals(s), before);
  assert.equal(invariant(s.w), null);
  assert.equal(restore(s.w).hash(), s.w.hash(), 'the row survives a save');
});
test('the Village yard: logs to the rack, rails to its shelf, the rack take unchanged', () => {
  const s = buildSeedWorld('q3-done');
  chopTo(s, 'a', 4);
  assert.ok(act(s, 'a', 'rail.forgeTake') > 0);
  const a = () => account(s.w, 'a')!;
  const [rack, logs, rails, before] = [rail(s.w).rack, a().carry, a().rails, totals(s)];
  assert.equal(act(s, 'a', 'rail.haltPut', { yard: 0, kind: 0 }), logs);
  assert.equal(act(s, 'a', 'rail.haltPut', { yard: 0, kind: 2 }), rails);
  assert.equal(rail(s.w).rack, rack + logs, 'the logs are on the recovery rack');
  assert.deepEqual(yardRow(s, 0), [0, 0, rails], 'only its rails on its row');
  assert.equal(act(s, 'b', 'rail.haltTake', { yard: 0, kind: 0 }), 0, "the rack's logs are rail.rackTake's");
  assert.equal(act(s, 'b', 'rail.rackTake', { kind: 0 }), Math.min(rack + logs, 8));
  assert.equal(act(s, 'a', 'rail.haltTake', { yard: 0, kind: 2 }), rails);
  assert.deepEqual(totals(s), before);
});
