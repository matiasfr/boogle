import test from 'node:test';
import assert from 'node:assert/strict';
import { LINE2, RAIL_LINES, TRAIN_EXTENT } from '../src/sim/railway-lines.ts';
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
import {
  BENTS,
  BUFFER_BACK,
  JIB_BACK,
  MERGE_BACK,
  PLATFORM,
  RACK_BACK,
  SIDE,
  bentU,
  buoyLifted,
  crossoverSpan,
  deckEnd,
  extrasOn,
  headOf,
  headU,
  noseU,
  platformSpan,
  leanClock,
  spanFrom,
  spansDue,
  spanTo,
  walkwaySpan,
} from '../src/entities/railway/railhead-shape.ts';
import { RING_S } from '../src/entities/railway/line2-path.ts';
import { HAUL, haulEnd, haulSettled, haulU, type RailheadHaul } from '../src/sim/railway-ring-haul.ts';
import { railheadLever, railheadLeverOn } from '../src/entities/railway/lever-place.ts';

/** The haul to railhead k (its pair accepted at tick 1000, from where railhead k - 1 stood), and its ticks in quarters
 * from the accept to a second past the end: railhead-view.ts's `ruleClock` between fixed steps. */
const MOVED = 1000;
const hauls = Array.from({ length: BENTS }, (_, i): RailheadHaul => ({
  set: 2 * (i + 1),
  moved: MOVED,
  from: RING_HEAD[i]!.u,
}));
function* ticks(a: RailheadHaul) {
  for (let t = a.moved; t <= haulEnd(a) + 10; t += 0.25) yield t;
}

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
  const rear = -TRAIN_EXTENT.behindCm / 100; // R2b: the actual full coach train's reserved tail
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
  // While it hauls, everything under and behind the deck's end is walkway this tab draws (railhead-view.ts `walkway`:
  // the base to u 120, then each decked span's 20 m), on a tab whose own bent and span animation has not yet decked the
  // new span at all: `spansDue` forces it before the deck moves.
  for (const a of hauls) {
    const behind = (a.set >> 1) - 1;
    for (const t of ticks(a)) {
      const decked = Math.max(behind, spansDue(a, t)),
        drawnTo = decked ? spanTo(decked - 1) : spanFrom(0);
      const u = haulU(a, t) / 100;
      assert.ok(
        u <= drawnTo + 1e-9,
        `haul to ${a.set >> 1} at tick ${t}: the deck's end at u ${u} is over an undrawn span`,
      );
    }
    assert.equal(spansDue(a, a.moved + HAUL.after - 0.25), 0, 'nothing is forced while the footing goes down');
    assert.equal(haulU(a, a.moved + HAUL.after + HAUL.ready), a.from, 'the deck waits out the told second');
  }
});
test('prompts wait until the haul has settled', () => {
  // railhead-view.ts `settled` (its rack and jib prompts) and the Railhead lever (`railheadDrawn.settled`).
  for (const a of hauls) {
    let lastMove = -1;
    for (const t of ticks(a)) {
      if (t > a.moved && haulU(a, t) !== haulU(a, t - 0.25)) lastMove = t;
      assert.equal(haulSettled(a, t), t >= haulEnd(a), `haul to ${a.set >> 1} at tick ${t}`);
    }
    assert.ok(lastMove > 0 && lastMove + HAUL.settle <= haulEnd(a), 'the deck is chocked a while before the prompts');
    assert.equal(haulU(a, haulEnd(a)), RING_HEAD[a.set >> 1]!.u, 'settled at the new head');
  }
  assert.ok(haulSettled({ set: 1, moved: -1, from: 0 }, 0), 'before any pair the railhead is at rest');
});
test('the lever stands on the drawn deck', () => {
  // halts-view.ts's Railhead lever: `railheadLeverOn(railheadEnd())`, the deck's end as drawn.
  for (let k = 0; k <= BENTS; k++)
    for (const way of [-1, 1] as const)
      assert.ok(Math.abs(railheadLeverOn(headU(k), way) - railheadLever(k, way).u) < 1e-9, `head ${k} way ${way}`);
  for (const a of hauls) {
    const offset = headU(0) - railheadLever(0).u;
    let was = railheadLeverOn(haulU(a, a.moved) / 100);
    for (const t of ticks(a)) {
      const end = haulU(a, t) / 100,
        u = railheadLeverOn(end);
      const [p0, p1] = platformSpan(end);
      assert.ok(u > p0 && u < p1, `haul to ${a.set >> 1} at tick ${t}: the lever at u ${u} is off the deck`);
      assert.ok(Math.abs(end - u - offset) < 1e-9, 'it keeps its place on the platform');
      assert.ok(Math.abs(u - was) <= (HAUL.speed / 100) * 0.25 + 1e-9, `no jump at tick ${t}: ${was} to ${u}`);
      was = u;
    }
  }
});
test('the railhead clock advances in rule ticks and snaps to a restored clock', () => {
  assert.equal(leanClock(-1, 100, 1 / 60), 100);
  assert.equal(leanClock(100, 100, 1 / 60), 100 + 1 / 6);
  assert.equal(leanClock(100, 210, 1 / 60), 210);
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

// ---------------------------------------------------------------- the traveller's cues (Checkpoint B review)
// railhead-view.ts built from its own source with every import real except the sounds (counted), the dust and the
// deck's driver (`driveDeck` returns the rule clock the test sets, as the platform's `move` would). The row is a real
// room's at `gap-footed`, whose last pair stamped the haul from railhead 6 to 7.
async function railheadCues() {
  await import('../dev/sim/hooks.ts');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const { sourceModule } = await import('../dev/level/source.ts');
  const { buildSeedWorld } = await import('./helpers/rail.ts');
  const { aperture } = await import('../src/sim/railway-rows.ts');
  const { haulU: at } = await import('../src/sim/railway-ring-haul.ts');
  const { createOwnedView } = await import('../src/render/owned-view.ts');
  await (
    await import('../src/physics/engine.ts')
  ).physicsReady;
  const file = 'src/entities/railway/railhead-view.ts';
  const source = fs.readFileSync(file, 'utf8');
  const bindings: Record<string, unknown> = {};
  // Browser-only modules (the player, the net, sounds and effects) are given below instead.
  const browser =
    /player\/player|netplay\/net|machine-sfx|place-sfx|render\/splash|particle-effects|prefab\/instantiate|place\/sites|place\/land/;
  for (const m of source.matchAll(/^import\s+(\*\s+as\s+(\w+)|\{([^}]*)\})\s+from\s+'([^']+)';/gm)) {
    if (m[0].startsWith('import type')) continue;
    const spec = m[4]!;
    if (browser.test(spec)) continue;
    const url = spec.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(file), spec)).href : spec;
    const mod = (await import(url)) as Record<string, unknown>;
    if (m[2]) bindings[m[2]] = mod;
    for (const name of (m[3] ?? '').split(',').map((s) => s.trim())) {
      if (!name || name.startsWith('type ')) continue;
      const [from, as = from] = name.split(/\s+as\s+/);
      bindings[as!] = mod[from!];
    }
  }
  const { railRoom } = await import('./helpers/rail-room.ts');
  const room = railRoom(buildSeedWorld('gap-footed'));
  const read = room.join('a', 'a').adapter.read;
  room.ready();
  const world = read.world();
  const row = aperture(world);
  const heard: { cue: string; p: number }[] = [];
  let clock = -1;
  const phaseNow = () => clock - row.moved - HAUL.after;
  const cue = (name: string) => () => heard.push({ cue: name, p: phaseNow() });
  Object.assign(bindings, {
    bell: cue('bell'),
    chuff: cue('chuff'),
    clank: cue('clank'),
    thump: cue('thump'),
    placeSound() {},
    dustRing() {},
    splash() {},
    instantiate: () => ({ root: new (bindings.THREE as typeof import('three/webgpu')).Group(), dispose() {} }),
    me: { body: null, coyote: 0 },
    outOf: () => false,
    H: () => -10,
    slab: () => ({}),
    remotes: new Map(),
    driveDeck: () => clock,
    railheadEnd: () => at(row, Math.max(clock, 0)) / 100,
  });
  const { createRailwayRailhead } = sourceModule<typeof import('../src/entities/railway/railhead-view.ts')>(
    source,
    bindings,
  );
  let drive = () => {};
  const adapter = { read: { world: () => world, whole: () => true, pid: 'a', tickNow: () => clock } };
  const view = createRailwayRailhead(adapter as never, createOwnedView(), {
    deck: { car: null as never, snap() {}, drive: (fn: () => void) => void (drive = fn) },
    toRing: () => 0,
    hookRing() {},
  });
  /** One frame with the rule clock at `tick`. */
  const frame = (tick: number) => {
    clock = tick;
    drive();
    view.update(1 / 60);
    return (view.inspect() as { railheadView: { traveller: { lamps: boolean } } }).railheadView.traveller;
  };
  return { row, heard, frame };
}
test('a tab whose clock jumps forward (hidden, paused or stalled mid-haul) does not play the missed cues at once', async () => {
  // leanClock snaps the rule clock to tickNow when it is more than 3 ticks out, so a tab that comes back from the
  // background or a long stall reaches the present in one frame. Every cue between its last frame and now then passes
  // the `seen < x <= p` latch together: the told chuff, each travel chuff, both thumps and the settled bell in one frame.
  const { row, heard, frame } = await railheadCues();
  for (let t = row.moved; t <= row.moved + HAUL.after + 2; t += 1 / 6) frame(t);
  const before = heard.length;
  frame(haulEnd(row) + 5);
  const burst = heard.slice(before);
  assert.ok(burst.length <= 1, `${burst.length} cues in one frame: ${burst.map((h) => h.cue).join(', ')}`);
});
test('a tab drawing every frame through a haul hears each cue once, in order', async () => {
  const { row, heard, frame } = await railheadCues();
  for (let t = row.moved; t <= haulEnd(row) + 5; t += 1 / 6) frame(t);
  const names = heard.map((h) => h.cue);
  assert.deepEqual(names.slice(0, 3), ['bell', 'clank', 'chuff'], 'told, then the start');
  assert.deepEqual(names.slice(-3), ['thump', 'thump', 'bell'], 'chocked, then settled');
  assert.ok(names.filter((n) => n === 'chuff').length >= 3, `the winch chuffs while it travels: ${names.join(', ')}`);
  assert.ok(heard[0]!.p >= 0 && heard[0]!.p < 0.5, 'the bell rings at told');
});
