// R4b, the railhead and the gap (views; docs/plans/ring-island-build1.md, step 4b): the ring seeds put the railhead
// where the view draws it, through the read facade's world; and the railhead's numbers (src/entities/railway/railhead-shape.ts) agree with the sim's (RING_HEAD) and keep the step's
// promises: every metre of line 2 a train can stand on has its deck drawn at every footing count, the walkway under a
// moving platform's old place never leaves a player over the sea, the kit slides a bent in about 3 s, and the buoys lift
// where RING_BUOYS says. The views need three.js and a DOM, so their reads are reproduced here as written
// (railhead-view.ts's `refresh`, the lookout's `readLifted`); a change to a view's read is a change to its function
// below. The differential proof against `inspect()` went with it (X2 of docs/plans/ecs-m12-m13.md). Modelled on
// test/railway-r4a-views.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeedWorld, type SeedStage } from './helpers/rail.ts';
import { railRoom } from './helpers/rail-room.ts';
import { aperture } from '../src/sim/railway-rows.ts';
import { q7Laid, ringHead } from '../src/sim/railway-queries.ts';
import { line2Trains } from '../src/sim/railway-queries-line2.ts';
import { LINE2, RAIL_LINES } from '../src/sim/railway-lines.ts';
import {
  RING_BUOYS,
  RING_GAP,
  RING_HEAD,
  RING_S_HEAD,
  RING_WALK,
  ringAt,
  ringDeckY,
} from '../src/sim/railway-ring-layout.ts';
import { WORKS } from '../src/sim/railway-works-layout.ts';
import { TRAIN_OFFSETS } from '../src/entities/railway/cars.ts';
import {
  BENTS,
  BUFFER_BACK,
  JIB_BACK,
  MERGE_BACK,
  PLATFORM,
  RACK_BACK,
  SIDE,
  SLIDE,
  bentU,
  buoyLifted,
  crossoverSpan,
  deckEnd,
  extrasOn,
  headOf,
  headU,
  noseU,
  platformSpan,
  slide,
  spanFrom,
  spanTo,
  walkwaySpan,
} from '../src/entities/railway/railhead-shape.ts';
import { RING_S } from '../src/entities/railway/line2-path.ts';

// ---------------------------------------------------------------- a client at a seed
/** The read facade's world of one client that has the seed's state: a room at the seed, stepped until it is ready. */
function client(stage: SeedStage) {
  const r = railRoom(buildSeedWorld(stage));
  const c = r.join('a', 'a');
  r.ready();
  return c.adapter;
}

// ---------------------------------------------------------------- the views' reads, as written
type Adapter = ReturnType<typeof client>;
/** railhead-view.ts `refresh` (opened, set, rack, joined, as the view takes them) and the lookout's `readLifted`
 * (head and joined, then each buoy's lifted flag), read once a frame through the facade. */
function newReads(adapter: Adapter) {
  const wd = adapter.read.world();
  const opened = adapter.read.ready() && line2Trains(wd) && q7Laid(wd);
  const a = opened ? aperture(wd) : null;
  const head = ringHead(wd),
    joined = aperture(wd).joined >= 0;
  return {
    opened,
    set: a?.set ?? 0,
    rack: a?.rack ?? 0,
    joined: !!a && a.joined >= 0,
    head,
    lifted: RING_BUOYS.map((_, i) => buoyLifted(i, head, joined)),
  };
}
test('the ring seeds put the railhead where the view draws it', () => {
  const at = (stage: SeedStage) => newReads(client(stage));
  assert.equal(at('crossing-done').opened, false, 'nothing of the railhead before Q7');
  const laid = at('deck-laid');
  assert.deepEqual([laid.opened, laid.set, laid.head, laid.joined], [true, 0, 0, false]);
  const footed = at('gap-footed');
  assert.deepEqual([footed.set, footed.head, footed.joined], [WORKS.ring, BENTS, false]);
  assert.equal(at('ring-joined').joined, true);
  // The buoys: 1-2 from the start, 3 at bent 8, 4 at bent 11, 5-7 on the rivet.
  assert.deepEqual(laid.lifted, [true, true, false, false, false, false, false]);
  assert.deepEqual(footed.lifted, [true, true, true, true, false, false, false]);
  assert.deepEqual(at('ring-joined').lifted, [true, true, true, true, true, true, true]);
});

// ---------------------------------------------------------------- the railhead's numbers against the sim's
test("the shape's railheads are RING_HEAD's, and its fixtures stand where the sim reads them", () => {
  for (let k = 0; k <= BENTS; k++) {
    const h = RING_HEAD[k]!;
    assert.equal(headU(k), 120 + 20 * k);
    assert.equal(headOf(2 * k), k, 'a bent per two footings');
    assert.equal(headOf(2 * k + 1), k, 'the odd footing is in the water, the railhead stays');
    const u = h.u;
    assert.deepEqual({ x: h.rack.x, z: h.rack.z }, ringAt(u - RACK_BACK * 100, 480));
    assert.deepEqual({ x: h.jib.x, z: h.jib.z }, ringAt(u - JIB_BACK * 100, 360));
    assert.deepEqual({ x: h.platform.x, z: h.platform.z }, ringAt(u - (PLATFORM.len * 100) / 2, 405));
    assert.equal(h.platform.y, ringDeckY(u - (PLATFORM.len * 100) / 2) + PLATFORM.up * 100);
    // The stub's merge is 30 m short of the end, the crossover the 20 m before it.
    assert.equal(h.mergeCm / 100 - RING_S, headU(k) - MERGE_BACK);
    assert.deepEqual(crossoverSpan(headU(k)), [headU(k) - MERGE_BACK - 20, headU(k) - MERGE_BACK]);
    // The buffer's face is 1.8 m short of the end (the sim's stop is 10 m short; the nose stops 2 m short of the face).
    assert.equal(h.s - RING_S_HEAD, u - 1000);
    assert.ok(noseU(k) < headU(k) - BUFFER_BACK, 'the nose stands short of the buffer');
  }
  // The bents' u (140 .. 260) and the spans between them (from Q7's end at u 120).
  for (let j = 0; j < BENTS; j++) {
    assert.equal(bentU(j), headU(j + 1));
    assert.equal(spanFrom(j), j ? spanTo(j - 1) : 120);
    assert.equal(spanTo(j), bentU(j));
  }
  assert.equal(spanTo(BENTS - 1), RING_GAP.toe / 100, 'the last bent is the leaf toe');
  assert.equal(RING_GAP.toe + RING_GAP.leaf, RING_GAP.hinge, 'the leaf spans the rest to the hinge');
});

// ---------------------------------------------------------------- nothing a train can stand on is undrawn
test('at every footing count the drawn deck reaches the nose of every train the line allows', () => {
  for (let set = 0; set <= WORKS.ring; set++) {
    const head = headOf(set);
    // The sim's end is the railhead of `head` (RING_HEAD) and the view's deck stands up to its bent: `stood` catches
    // up with `head` within a few seconds, never the other way round.
    assert.ok(deckEnd(head) >= headU(head), `set ${set}: deck to the end`);
    assert.ok(deckEnd(head) >= noseU(head), `set ${set}: deck to the nose`);
    // A train ahead of its old end (one that was running when the end moved) runs on to the new one, at most 20 m.
    assert.ok(noseU(head) - noseU(Math.max(0, head - 1)) <= 20);
  }
  // Whatever length the consist is, its rear is on deck too: Q7's deck begins at the pier head (u 0) and the pier before.
  const rear = Math.min(...TRAIN_OFFSETS);
  assert.ok(noseU(0) + rear > 0, 'a train at the first railhead has its whole length on Q7 or the pier');
  // Once the line is a through one: Q7's deck, bents 7-13, the leaf (the island's near view, at its true angle on the
  // rivet) and the Way from the hinge.
  assert.equal(deckEnd(BENTS), RING_GAP.toe / 100);
  assert.ok(extrasOn(BENTS) && !extrasOn(BENTS - 1));
});
test("the walkway behind a moving railhead holds the old platform's whole place, at the platform's width", () => {
  for (let k = 0; k < BENTS; k++) {
    const [p0, p1] = platformSpan(headU(k)),
      [w0, w1] = walkwaySpan(headU(k + 1));
    assert.ok(w0 <= p0 && w1 >= p1, `railhead ${k} to ${k + 1}: the old platform's place is walkway`);
    // The sim's walkway (RING_WALK) is the same span and lat, 4.5 m wide.
    const walk = RING_WALK(k + 1);
    assert.deepEqual([walk.u0 / 100, walk.u1 / 100], [w0, w1]);
    assert.deepEqual([walk.lat0 / 100, walk.lat1 / 100], [SIDE.lat0, SIDE.lat1]);
    // And the new railhead's platform lies over it for its back 5 m, with 20 m of new deck for the rest.
    const [n0] = platformSpan(headU(k + 1));
    assert.ok(n0 >= w0 && n0 < p1, 'the new platform starts over the old one');
  }
});
test('the kit slides a bent in about 3 s, never faster than SLIDE, and a restore snaps', () => {
  let shown = headU(2);
  const goal = headU(3);
  let t = 0;
  for (; shown < goal; t += 1 / 60) {
    const next = slide(shown, goal, 1 / 60);
    assert.ok(next - shown <= SLIDE / 60 + 1e-9, 'a frame never moves more than SLIDE');
    shown = next;
  }
  assert.ok(t > 2.7 && t < 3.1, `a bent takes about 3 s: ${t.toFixed(2)}`);
  assert.equal(slide(headU(0), headU(7), 1 / 60), headU(7), 'a long way (a restore) snaps');
  assert.equal(slide(headU(3), headU(3), 1 / 60), headU(3));
});

// ---------------------------------------------------------------- the lookout's buoys
test('the buoys lift as RING_BUOYS says, and a rewind puts them back', () => {
  const at = (head: number, joined: boolean) => RING_BUOYS.map((_, i) => buoyLifted(i, head, joined));
  assert.deepEqual(at(0, false), [true, true, false, false, false, false, false]);
  assert.deepEqual(at(1, false), [true, true, false, false, false, false, false]);
  assert.deepEqual(at(2, false), [true, true, true, false, false, false, false], 'buoy 3 at bent 8');
  assert.deepEqual(at(4, false), [true, true, true, false, false, false, false]);
  assert.deepEqual(at(5, false), [true, true, true, true, false, false, false], 'buoy 4 at bent 11');
  assert.deepEqual(at(7, false), [true, true, true, true, false, false, false], 'none past the gap before the rivet');
  assert.deepEqual(at(7, true), [true, true, true, true, true, true, true], 'buoys 5-7 on the rivet');
  assert.deepEqual(at(0, false), [true, true, false, false, false, false, false]);
});

// ---------------------------------------------------------------- the catalog the view leans on
test("line 2's last halt is the Railhead with `heads`, so its drawn end follows RING_HEAD", () => {
  const halts = RAIL_LINES[LINE2]!.halts;
  const railhead = halts.find((h) => h.heads);
  assert.ok(railhead && railhead.name === 'Railhead');
  assert.deepEqual(
    railhead.heads,
    RING_HEAD.map((h) => h.s),
  );
});
