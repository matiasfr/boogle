// Review of M10 e (the ability and arrival views: ability-arrival, tools, glide, hook-shot, glide-device-view,
// sea-gate-view, back-down): the behaviour the review added, read as rows. A late joiner reads the room-wide abilities
// the server holds, and the view's frame keeps one tick when the wake ends inside it. The conversion proofs (the views'
// reads against the `inspect()` fields they replaced, over scripted ability runs and a random stream) and the cost
// guides went with `inspect()`; the views' reads are not restated here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { account, rail } from '../src/sim/railway-rows.ts';
import { railPhase } from '../src/sim/railway-queries-line1.ts';
import { railRoom, type RoomClient } from './helpers/rail-room.ts';
import { buildSeedWorld } from './helpers/rail.ts';

test('a late joiner reads its own account and the room-wide abilities, as the server holds them', () => {
  const seed = buildSeedWorld('glide-earned');
  assert.equal(rail(seed.w).glide, true, 'the seed has the glider earned');
  const r = railRoom(seed);
  r.join('a', 'a', 4);
  r.ready();
  r.run(10);
  const b = r.join('b', 'b', 6);
  r.run(80);
  const w = b.adapter.read.world();
  assert.equal(b.adapter.read.pid, 'b');
  assert.equal(rail(w).glide, true, 'the room-wide glider reaches the late joiner');
  assert.deepEqual(rail(w), rail(r.serverWorld()), 'the ability row, as the server holds it');
  assert.ok(account(w, 'b'), 'its own account arrived');
});

// ability-arrival takes `adapter.read.tick()`. A frame that straddles the tick that ends the wake must judge the phase
// once: the head of the frame and a later read in it see the same tick, so the wake ends at the next frame's head.
function wokenRoom() {
  const r = railRoom();
  const a = r.join('a', 'a', 0);
  r.ready();
  assert.equal(a.adapter.wake(), true);
  r.run(3);
  return { r, a };
}
/** The clock reading (ms) at which the mirror's step first passes into the next tick, found on a twin room. */
function edgeOf(twin: { r: ReturnType<typeof railRoom>; a: RoomClient }, tick: number) {
  const from = twin.r.clock.now;
  for (let ms = 0; ms < 400; ms += 0.25) {
    twin.r.clock.now = from + ms;
    if (Math.floor(twin.a.mirror.mirror.step(from + ms) / 6) > tick) return from + ms;
  }
  throw new Error('no tick boundary within 400 ms');
}
test("the wake's phase is judged once in a frame that straddles the wake's end", () => {
  const { r, a } = wokenRoom();
  const twin = wokenRoom();
  const read = a.adapter.read;
  const phase = () => railPhase(read.world(), read.tick(), read.tick());
  const awake = rail(read.world()).awake;
  for (let f = 0; f < 400 && read.tick() + 1 < awake + T1.wakeTicks; f++) {
    r.run(1);
    twin.r.run(1);
  }
  assert.equal(read.tick() + 1, awake + T1.wakeTicks);
  r.clock.now = edgeOf(twin, read.tick()) - 1;
  a.adapter.update(r.clock.now);
  // The frame's head.
  const tick = read.tick();
  assert.equal(phase(), 'waking', 'still waking at the head of the frame');
  // 2 ms later in the same frame, across the tick boundary: the same tick, the same phase.
  r.clock.now += 2;
  assert.equal(read.tick(), tick, 'one tick for the frame');
  assert.equal(phase(), 'waking', 'one phase per frame');
  // The next frame's head sees the wake over.
  a.adapter.update(r.clock.now);
  assert.equal(read.tick(), tick + 1);
  assert.notEqual(phase(), 'waking', 'the wake is over at the next head');
});
