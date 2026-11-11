// Review of M10 a (branch ecs/m10a-trains-halts): the per-train queries in src/sim/railway-queries-trains.ts
// (railTrainHeld, railOpenEnd) at the edges a random stream at the frame clock rarely lands on, held to literals: the
// wake's end, a stand's dwell, a train at a signal, the Pier stub, the railhead's open end moving bent by bent; the
// trains' catalog the views index by; and the trains staying drawn with the window full. The queries were once held
// equal to the adapter's functions over the inspection; those twins went with the inspection.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeedWorld } from './helpers/rail.ts';
import { railRoom } from './helpers/rail-room.ts';
import { rail, type ReadWorld } from '../src/sim/railway-rows.ts';
import { apertureId, railId, trainId } from '../src/sim/railway-queries.ts';
import { line2Trains } from '../src/sim/railway-queries-line2.ts';
import { railOpenEnd, railTrainAsked, railTrainHeld, trainStops } from '../src/sim/railway-queries-trains.ts';
import { LINE2, RAIL_LINES, RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { LINE_HALTS, TRAIN, TRAIN_PHASE } from '../src/sim/railway-train.ts';
import { LINE_SLOTS } from '../src/sim/railway-trains.ts';
import { RAILWAY_WINDOW } from '../src/sim/railway.ts';
import { Aperture, Rail, Train } from '../src/sim/railway-components.ts';
import type { World } from '../src/ecs/index.ts';
import { createFirstReady } from '../src/entities/railway/first-ready.ts';

const mutTrain = (w: World, slot: number) => w.mut(Train, trainId(w, slot))!;

test('line 2 has three trains, and the views index the shared stops by a train line that has them', () => {
  assert.equal(LINE_SLOTS[LINE2]!.length, 3, 'line 2 runs three trains');
  assert.equal(RAIL_LINES.length, 2, "halts-view's refreshStops covers lines [0, 1] only");
  assert.equal(LINE2, 1, "train-view's stops = [trainStops(w, 0), trainStops(w, LINE2)] is indexed by tr.line");
  for (const t of RAIL_TRAINS) assert.ok(t.line === 0 || t.line === LINE2);
});

for (const stage of ['trains-on', 'q6-done', 'crossing-done', 'deck-laid', 'ring-joined'] as const)
  test(`${stage}: a train is held from its dwell's end (+10 ticks) at a halt, at once at a signal, and never asked while it stands at a halt`, () => {
    const w = buildSeedWorld(stage).w as World;
    const t0 = rail(w as unknown as ReadWorld).trains + TRAIN.wakeTicks + 200;
    for (const slot of RAIL_TRAINS.keys()) {
      const n = trainStops(w, RAIL_TRAINS[slot]!.line).length;
      for (let at = -1; at < n; at++)
        for (const track of [0, 1]) {
          Object.assign(mutTrain(w, slot), {
            phase: TRAIN_PHASE.STAND,
            at,
            to: Math.max(0, at),
            track,
            depart: t0,
            req: 0,
          });
          if (at >= 0) {
            assert.equal(
              railTrainHeld(w, slot, t0 + TRAIN.dwellTicks + 10),
              true,
              `${slot} at ${at}: held at the edge`,
            );
            assert.equal(railTrainHeld(w, slot, t0 + TRAIN.dwellTicks + 9.5), false, `${slot} at ${at}: not before it`);
            assert.equal(railTrainAsked(w, slot, t0), false, `${slot} at ${at}: a standing train shows no ask lamp`);
          } else assert.equal(railTrainHeld(w, slot, t0), true, `${slot}: a signal stand is held at once`);
        }
    }
  });

test("the wake: no lamp before the trains' wake ends, exactly at its end and half a tick before; asleep, none", () => {
  const w = buildSeedWorld('trains-on').w as World;
  const at = rail(w as unknown as ReadWorld).trains;
  // Every train standing at a signal (held as soon as the wake is over).
  for (const slot of RAIL_TRAINS.keys()) Object.assign(mutTrain(w, slot), { phase: TRAIN_PHASE.STAND, at: -1 });
  const held = (t: number) => RAIL_TRAINS.map((_t, k) => railTrainHeld(w, k, t));
  assert.deepEqual(
    held(at + TRAIN.wakeTicks - 0.5),
    RAIL_TRAINS.map(() => false),
  );
  assert.deepEqual(
    held(at + TRAIN.wakeTicks),
    RAIL_TRAINS.map(() => true),
  );
  // Asleep (Rail.trains -1): nothing held, nothing asked.
  w.mut(Rail, railId(w))!.trains = -1;
  assert.deepEqual(
    held(at + TRAIN.wakeTicks),
    RAIL_TRAINS.map(() => false),
  );
  assert.deepEqual(
    RAIL_TRAINS.map((_t, k) => railTrainAsked(w, k, at + TRAIN.wakeTicks)),
    RAIL_TRAINS.map(() => false),
  );
});

test('the Pier stub: the Pier is the open end at q6-done, for a turned train on each track', () => {
  const w = buildSeedWorld('q6-done').w as World;
  const pier = trainStops(w, LINE2).length - 1;
  assert.ok(railOpenEnd(w, LINE2, pier), 'the Pier is the open end at q6-done');
  const t0 = rail(w as unknown as ReadWorld).trains + TRAIN.wakeTicks + 500;
  for (const slot of LINE_SLOTS[LINE2]!)
    for (const track of [0, 1])
      for (const phase of [TRAIN_PHASE.STAND, TRAIN_PHASE.RUN]) {
        Object.assign(mutTrain(w, slot), { phase, at: pier, to: pier - 1, track, depart: t0, turn: true, req: 0 });
        assert.ok(
          railOpenEnd(w, LINE2, pier),
          `the Pier stays the open end (train ${slot}, track ${track}, phase ${phase})`,
        );
      }
});

test('the open end moving: line 2 from Q6 to the ring joined, bent by bent', () => {
  const w = buildSeedWorld('ring-joined').w as World;
  const ap = w.mut(Aperture, apertureId(w))!;
  const joined = ap.joined;
  const ends = new Set<string>();
  for (const j of [-1, joined])
    for (let set = 0; set <= 14; set++) {
      ap.set = set;
      ap.joined = j;
      ends.add(JSON.stringify(LINE_HALTS.filter((h) => h.line === LINE2).map((h) => railOpenEnd(w, LINE2, h.stop))));
    }
  assert.ok(ends.size > 1, 'the open end moved with the railhead');
});

// Pre-existing before M10 a: the hide condition. train-view.ts step() hid every car (y -60) while `!read.ready()`.
// ready() is false not only before the whole state is in but also while RAILWAY_WINDOW actions are pending, so a player
// with a full window (a burst of presses on a slow link) saw every train vanish until an answer came back. The view now
// hides them only until the first whole state is in (first-ready.ts, the latch step() calls each frame), and draws
// them from read.world() after that.
test('a full pending window keeps every train shown (train-view.ts step: hidden = !trainsShown())', () => {
  const r = railRoom(buildSeedWorld('trains-on'));
  const a = r.join('a', 'a', 30);
  const shown = createFirstReady(a.adapter.read.ready);
  assert.equal(shown(), false, 'hidden before the whole state is in');
  r.ready();
  assert.equal(shown(), true, 'shown once it is');
  let pressed = 0;
  for (let k = 0; k < 40 && a.adapter.read.pending() < RAILWAY_WINDOW; k++)
    if (a.adapter.callTrain(k % LINE_HALTS.length, k % 2 ? 1 : -1)) pressed++;
  assert.equal(a.adapter.read.pending(), RAILWAY_WINDOW, `the window filled (${pressed} presses)`);
  assert.equal(a.adapter.read.ready(), false, 'ready() is false with the window full');
  assert.ok(a.mirror.synced() && line2Trains(a.adapter.read.world()), 'whole and running');
  assert.equal(shown(), true, 'the trains stay shown while the whole state is in and the window is full');
});
