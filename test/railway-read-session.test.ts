// The read facade's session members and M10's two line-one queries (docs/plans/ecs-migration-railway.md, M10): what
// the view groups read once they left inspect(). `read.movement()` is one frozen object until a movement tunable
// changes, and reads the tunables again only when the tune rev moves; `read.tick()` holds one value for a frame;
// `read.ready()` is false at a full pending window while `status()` is still 'ready'; `read.stalled()` names the oldest
// action left unanswered. `treeGrowth` and `freeCarryIgnoringBig` are asserted against literals on seeded worlds.
// The differential proofs (each member against `inspect()`'s field along a random stream) went with `inspect()`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { RAILWAY_WINDOW } from '../src/sim/railway.ts';
import { Account, Boiler, Rail, Tree } from '../src/sim/railway-components.ts';
import { boilerId, free, railAccount, railId } from '../src/sim/railway-queries.ts';
import { freeCarryIgnoringBig, railPhase, treeGrowth } from '../src/sim/railway-queries-line1.ts';
import { buildSeedWorld } from '../src/sim/railway-seeds.ts';
import { railRoom } from './helpers/rail-room.ts';

test('read.movement() reads the tunables only when their rev moves, and is the same object until a value changes', () => {
  const r = railRoom();
  const a = r.join('a', 'alice');
  const m = a.adapter.read.movement();
  assert.ok(Object.isFrozen(m));
  const reads = a.movementReads();
  for (let k = 0; k < 100; k++) assert.equal(a.adapter.read.movement(), m);
  assert.equal(a.movementReads(), reads, 'out of the loop: a rev check per call, no tunable read');
  a.set('railRegrowMinutes', 40); // not a movement tunable: read again, the same object
  assert.equal(a.adapter.read.movement(), m);
  assert.equal(a.movementReads(), reads + 1);
  a.set('railJumpTurn', 250);
  const n = a.adapter.read.movement();
  assert.notEqual(n, m);
  assert.equal(n.jumpTurn, 2.5);
  // In the loop: taken once a frame at its first read, so an edit after it shows at the next frame.
  r.run(1);
  assert.equal(a.adapter.read.movement(), n);
  a.set('railJumpTurn', 300);
  assert.equal(a.adapter.read.movement(), n);
  r.run(1);
  assert.equal(a.adapter.read.movement().jumpTurn, 3);
  a.adapter.dispose();
});

test('read.movement() without a rev reads the tunables and still returns one object while the values hold', () => {
  const r = railRoom();
  const b = r.join('b', 'bob', 0, false);
  const m = b.adapter.read.movement();
  assert.equal(b.adapter.read.movement(), m);
  b.set('railJumpTurn', 250);
  assert.equal(b.adapter.read.movement().jumpTurn, 2.5);
  assert.equal(b.adapter.read.movement(), b.adapter.read.movement());
});

test('read.ready() is false at a full pending window while status() is still ready, and read.stalled() names the oldest', () => {
  const r = railRoom();
  const a = r.join('a', 'alice', 20);
  r.run(80);
  r.ready();
  assert.equal(a.adapter.wake(), true);
  r.run(200);
  const read = a.adapter.read;
  assert.equal(read.ready(), true, 'ready once the state and session arrived');
  assert.equal(read.pending(), 0);
  assert.equal(read.stalled(), null);
  // Chops and drops, a moment apart (a chop fills the back, a drop empties it): the window fills before the back.
  for (let n = 0; n < RAILWAY_WINDOW + 4; n++) {
    r.advance(300);
    if (n % 2) a.adapter.drop(T1.x + n * 100, 3000, T1.z, 1);
    else a.adapter.chop(RAILWAY_SOURCES[n % RAILWAY_SOURCES.length]![0], 0, false);
  }
  assert.equal(read.pending(), RAILWAY_WINDOW, 'the window filled, the rest were refused');
  assert.equal(read.status(), 'ready');
  assert.equal(read.ready(), false, 'no action can be sent at a full window');
  r.frame();
  assert.equal(read.stalled(), 'rail.chop', 'the oldest action, unanswered for longer than the stall cue waits');
  r.run(200);
  assert.equal(read.pending(), 0, 'answered');
  assert.equal(read.stalled(), null);
  assert.equal(read.ready(), true);
});

// The review of M10 b: a view that read the tick twice in one frame across a tick boundary lost the waking to idle edge.
test('read.tick() holds one value for a whole frame, and the waking to idle edge is seen once', () => {
  const r = railRoom();
  const a = r.join('a', 'alice', 2);
  r.run(40);
  assert.equal(a.adapter.wake(), true);
  const read = a.adapter.read;
  const phase = (t: number) => railPhase(read.world(), t, t);
  let frames = 0,
    held = 0,
    edges = 0,
    last = read.tick(),
    was = phase(last);
  // Frames of three server steps each (a slow client): the sim, its packets and clock stamps advance inside a frame.
  for (let k = 0; k < 120 && was !== 'idle'; k++) {
    r.frame();
    frames++;
    const t = read.tick();
    assert.ok(t >= last, 'never backwards');
    if (t > last) held++;
    const at = phase(t);
    for (let step = 0; step < 3; step++) {
      r.run(1, { loop: false });
      assert.equal(read.tick(), t, `frame ${k} step ${step}: one tick in the frame`);
    }
    // A press inside the frame rebuilds the read; the frame keeps its tick.
    if (k % 7 === 3) a.adapter.chop(RAILWAY_SOURCES[0]![0], 0, false);
    assert.equal(read.tick(), t);
    if (at !== was) edges++;
    was = at;
    last = t;
  }
  assert.equal(was, 'idle', 'woke');
  assert.ok(edges >= 1, 'the waking to idle edge was seen');
  assert.ok(held > frames / 2, `the tick advanced across frames (${held} of ${frames})`);
  // tickNow() stays live: it moves inside a frame.
  r.frame();
  const now0 = read.tickNow();
  r.run(2, { loop: false });
  assert.ok(read.tickNow() > now0, 'tickNow() is live');
  // Outside the loop (no update() yet) read.tick() is live.
  const b = r.join('b', 'bob', 0);
  r.run(40, { loop: false });
  const t0 = b.adapter.read.tick();
  r.run(2, { loop: false });
  assert.ok(b.adapter.read.tick() > t0);
});

// Built at module scope (the unit tests' 5 s timeout): line one waking, and laid with line two begun.
const SEEDED = (['awake', 'q1-done'] as const).map((stage) => [stage, buildSeedWorld(stage).w] as const);

test('treeGrowth is the minutes a felled tree is past regrowth (31), 0 for a standing tree or no such tree', () => {
  for (const [stage, w] of SEEDED) {
    const ages = [0, 31, 32, 40, 35, 60];
    ages.forEach((age, slot) => Object.assign(w.mut(Tree, w.lookup(Tree, slot)!)!, { left: 0, age }));
    assert.deepEqual(
      ages.map((_a, slot) => treeGrowth(w, slot)),
      [0, 0, 1, 9, 4, 29],
      stage,
    );
    assert.equal(treeGrowth(w, RAILWAY_SOURCES.length), 0, `${stage}: no such tree`);
  }
});

test('freeCarryIgnoringBig is the back less its load by count alone (8, 16 with the pack), whatever is held', () => {
  const [, w] = SEEDED[1]!;
  const pid = 'a';
  const row = () => railAccount(w, pid)!;
  const set = (load: Partial<{ carry: number; stone: number; rails: number; foot: number }>) =>
    Object.assign(w.mut(Account, w.lookup(Account, pid)!)!, { carry: 0, stone: 0, rails: 0, foot: 0 }, load);
  set({});
  assert.equal(freeCarryIgnoringBig(w, pid), 8, 'an empty back');
  assert.equal(freeCarryIgnoringBig(w, 'nobody'), 8, 'no account: the whole back');
  set({ carry: 3, stone: 2, rails: 1 });
  assert.equal(freeCarryIgnoringBig(w, pid), 2);
  assert.equal(free(w, row()), 2, 'no big load: the same as free');
  set({ carry: 8 });
  assert.equal(freeCarryIgnoringBig(w, pid), 0, 'a full back');
  // A big load makes free 0 and leaves the count alone: the boiler held, then a footing worn.
  set({ carry: 3 });
  Object.assign(w.mut(Boiler, boilerId(w))!, { state: 'held', holder: pid });
  assert.equal(free(w, row()), 0, 'the boiler held: no room');
  assert.equal(freeCarryIgnoringBig(w, pid), 5, 'by count, five');
  Object.assign(w.mut(Boiler, boilerId(w))!, { state: 'stood', holder: '' });
  set({ foot: 1 });
  assert.equal(free(w, row()), 0, 'a footing worn: no room');
  assert.equal(freeCarryIgnoringBig(w, pid), 8, 'by count, the whole back');
  // The pack doubles the back.
  Object.assign(w.mut(Rail, railId(w))!, { pack: true });
  set({ carry: 3, stone: 2, rails: 1 });
  assert.equal(freeCarryIgnoringBig(w, pid), 10);
});
