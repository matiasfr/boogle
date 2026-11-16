// Independent review of garage step 1 (docs/plans/garage-choices.md, section 7 step 1, v53): the free 20 m/s upgrade
// gates the footing wagon. These probe the states a room can sit in between the table turn, the install, the
// 50-tick hold and the roll-out: the wait bound a standing line 2 train is documented to keep, a save taken inside the
// hold, and the table never turning back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LINE2 } from '../src/sim/railway-lines.ts';
import { LINE_SLOTS } from '../src/sim/railway-trains.ts';
import { TRAIN, TRAIN_PHASE } from '../src/sim/railway-train.ts';
import { WORKS } from '../src/sim/railway-works-layout.ts';
import {
  act,
  advanceWorks,
  invariant,
  line as lineRow,
  railwayAtWorks,
  restore,
  shed,
  train,
  trains,
  unaudited,
  type Seed,
} from './helpers/rail.ts';

const [A] = LINE_SLOTS[LINE2] as [number];
const copy = (s: Seed): Seed => unaudited({ w: restore(s.w), t: s.t });
const upgrade = (s: Seed, pid = 'a') => act(s, pid, 'rail.install', { line: LINE2, part: 1, revision: 0 });
const standingHome = (s: Seed) => train(s.w, A).phase === TRAIN_PHASE.STAND && train(s.w, A).at === 0;

// src/sim/railway-sys-trains.ts says a line 2 train standing at the Village when the wagon is due "holds its departure
// for it (at most WORKS.rollTicks)", and test/railway-train.test.ts asserts `depart - arrived <= dwellTicks +
// rollTicks`. That test installs on the arrival tick, where 50 dwell ticks happen to equal the new 50-tick hold. An
// install on the last dwell tick shows the bound the code now keeps.
test('review: a Village train held for the wagon keeps the documented dwell + roll bound when the install lands late', () => {
  const s = copy(railwayAtWorks('cradle-fitted'));
  assert.equal(act(s, 'a', 'rail.turn', { to: 1, revision: shed(s.w).tableRev }), 1);
  // Away from the Village first, so the next stand there is a fresh arrival.
  for (let t = 0; standingHome(s); t++) {
    assert.ok(t < 4000);
    advanceWorks(s, 1);
  }
  for (let t = 0; !standingHome(s); t++) {
    assert.ok(t < 8000, 'A reaches the Village');
    advanceWorks(s, 1);
  }
  const arrived = train(s.w, A).depart;
  // The last tick it still stands on its own dwell.
  while (s.t < arrived + TRAIN.dwellTicks - 1 && standingHome(s)) advanceWorks(s, 1);
  assert.ok(standingHome(s), 'still standing at the Village');
  assert.equal(upgrade(s), 1);
  while (standingHome(s)) advanceWorks(s, 1);
  assert.equal(train(s.w, A).wagon, true, 'it left with the wagon');
  const held = train(s.w, A).depart - arrived;
  assert.ok(
    held <= TRAIN.dwellTicks + WORKS.rollTicks,
    `stood ${held} ticks at the Village (documented bound ${TRAIN.dwellTicks + WORKS.rollTicks})`,
  );
  assert.equal(invariant(s.w), null);
});

test('review: a save taken inside the 50-tick hold loads, and the wagon still rolls out and couples', () => {
  const s = copy(railwayAtWorks('cradle-fitted'));
  assert.equal(act(s, 'a', 'rail.turn', { to: 1, revision: shed(s.w).tableRev }), 1);
  assert.equal(upgrade(s), 1);
  const ready = shed(s.w).ready;
  for (const at of [1, WORKS.upgradeTicks - 1, WORKS.upgradeTicks, WORKS.upgradeTicks + 1]) {
    const mid = copy(s);
    advanceWorks(mid, at);
    const loaded = unaudited({ w: restore(mid.w), t: mid.t });
    assert.equal(invariant(loaded.w), null, `loads ${at} ticks in`);
    assert.equal(shed(loaded.w).ready, ready);
    for (const l of [0, LINE2]) assert.equal(lineRow(loaded.w, l).boiler, 1);
    // A second hold on the loaded room is refused and cannot move the roll-out.
    assert.equal(upgrade(loaded, 'b'), 0);
    assert.equal(act(loaded, 'b', 'rail.turn', { to: 0, revision: shed(loaded.w).tableRev }), 0, 'no turn back');
    assert.equal(shed(loaded.w).ready, ready);
    for (let t = 0; !trains(loaded.w).some((r) => r.wagon); t++) {
      assert.ok(t < 8000, `the wagon couples after a load ${at} ticks into the hold`);
      advanceWorks(loaded, 1);
    }
    assert.ok(loaded.t >= ready);
    assert.equal(invariant(loaded.w), null);
  }
});

test('review: between the turn and the install the table cannot be turned back, and the install stays offered', () => {
  const s = copy(railwayAtWorks('cradle-fitted'));
  assert.equal(act(s, 'a', 'rail.turn', { to: 1, revision: shed(s.w).tableRev }), 1);
  for (const to of [0, 1]) assert.equal(act(s, 'b', 'rail.turn', { to, revision: shed(s.w).tableRev }), 0);
  // A long wait (several round trips) keeps the room in the waiting state, still installable.
  advanceWorks(s, 6000);
  assert.equal(shed(s.w).table, 1);
  assert.equal(shed(s.w).ready, -1);
  assert.equal(invariant(restore(s.w)), null, 'the waiting state saves and loads');
  assert.equal(upgrade(s, 'b'), 1);
  assert.equal(invariant(s.w), null);
});
