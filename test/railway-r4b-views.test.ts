import test from "node:test";
import assert from "node:assert/strict";
import { LINE2, RAIL_LINES, TRAIN_EXTENT } from "../src/sim/railway-lines.ts";
import {
  RING_BUOYS,
  RING_GAP,
  RING_HEAD,
  RING_S_HEAD,
  RING_WALK,
  ringAt,
  ringDeckY,
} from "../src/sim/railway-ring-layout.ts";
import { WORKS } from "../src/sim/railway-works-layout.ts";
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
} from "../src/entities/railway/railhead-shape.ts";
import { RING_S } from "../src/entities/railway/line2-path.ts";
import {
  HAUL,
  haulEnd,
  haulSettled,
  haulU,
  type RailheadHaul,
} from "../src/sim/railway-ring-haul.ts";
import { leverAskTaken, railheadLever, railheadLeverUp } from "../src/entities/railway/lever-place.ts";
import { deckPlatform } from "../src/entities/railway/railhead-shape.ts";
import { mapStageOf } from "../src/entities/railway/halt-map.ts";
import { railwayAtRing } from "../src/sim/railway-seed-ring.ts";
import { act } from "../src/sim/railway-seed-route.ts";
import { advanceWorks } from "../src/sim/railway-seed-works.ts";
import { aperture } from "../src/sim/railway-rows.ts";
import { ringHead } from "../src/sim/railway-queries.ts";
import { railCallPlatform } from "../src/sim/railway-queries-trains.ts";
import { RAIL_HALTS } from "../src/sim/railway-lines.ts";

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
    assert.equal(headOf(2 * k), k, "a bent per two footings");
    assert.equal(headOf(2 * k + 1), k, "the odd footing is in the water, the railhead stays");
    const u = h.u;
    assert.deepEqual({ x: h.rack.x, z: h.rack.z }, ringAt(u - RACK_BACK * 100, 480));
    assert.deepEqual({ x: h.jib.x, z: h.jib.z }, ringAt(u - JIB_BACK * 100, 360));
    assert.deepEqual(
      { x: h.platform.x, z: h.platform.z },
      ringAt(u - (PLATFORM.len * 100) / 2, 405),
    );
    assert.equal(h.platform.y, ringDeckY(u - (PLATFORM.len * 100) / 2) + PLATFORM.up * 100);
    // The stub's merge is 30 m short of the end, the crossover the 20 m before it.
    assert.equal(h.mergeCm / 100 - RING_S, headU(k) - MERGE_BACK);
    assert.deepEqual(crossoverSpan(headU(k)), [headU(k) - MERGE_BACK - 20, headU(k) - MERGE_BACK]);
    // The buffer's face is 1.8 m short of the end (the sim's stop is 10 m short; the nose stops 2 m short of the face).
    assert.equal(h.s - RING_S_HEAD, u - 1000);
    assert.ok(noseU(k) < headU(k) - BUFFER_BACK, "the nose stands short of the buffer");
  }
  // The bents' u (140 .. 260) and the spans between them (from Q7's end at u 120).
  for (let j = 0; j < BENTS; j++) {
    assert.equal(bentU(j), headU(j + 1));
    assert.equal(spanFrom(j), j ? spanTo(j - 1) : 120);
    assert.equal(spanTo(j), bentU(j));
  }
  assert.equal(spanTo(BENTS - 1), RING_GAP.toe / 100, "the last bent is the leaf toe");
  assert.equal(
    RING_GAP.toe + RING_GAP.leaf,
    RING_GAP.hinge,
    "the leaf spans the rest to the hinge",
  );
});

// ---------------------------------------------------------------- nothing a train can stand on is undrawn
test("at every footing count the drawn deck reaches the nose of every train the line allows", () => {
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
  assert.ok(
    noseU(0) + rear > 0,
    "a train at the first railhead has its whole length on Q7 or the pier",
  );
  // Once the line is a through one: Q7's deck, bents 7-13, the leaf (the island's near view, at its true angle on the
  // rivet) and the Way from the hinge.
  assert.equal(deckEnd(BENTS), RING_GAP.toe / 100);
  assert.ok(extrasOn(BENTS) && !extrasOn(BENTS - 1));
});
test("the walkway behind a moving railhead holds the old platform's whole place, at the platform's width", () => {
  for (let k = 0; k < BENTS; k++) {
    const [p0, p1] = platformSpan(headU(k)),
      [w0, w1] = walkwaySpan(headU(k + 1));
    assert.ok(
      w0 <= p0 && w1 >= p1,
      `railhead ${k} to ${k + 1}: the old platform's place is walkway`,
    );
    // The sim's walkway (RING_WALK) is the same span and lat, 4.5 m wide.
    const walk = RING_WALK(k + 1);
    assert.deepEqual([walk.u0 / 100, walk.u1 / 100], [w0, w1]);
    assert.deepEqual([walk.lat0 / 100, walk.lat1 / 100], [SIDE.lat0, SIDE.lat1]);
    // And the new railhead's platform lies over it for its back 5 m, with 20 m of new deck for the rest.
    const [n0] = platformSpan(headU(k + 1));
    assert.ok(n0 >= w0 && n0 < p1, "the new platform starts over the old one");
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
    assert.equal(
      spansDue(a, a.moved + HAUL.after - 0.25),
      0,
      "nothing is forced while the footing goes down",
    );
    assert.equal(
      haulU(a, a.moved + HAUL.after + HAUL.ready),
      a.from,
      "the deck waits out the told second",
    );
  }
});
test("prompts wait until the haul has settled", () => {
  // railhead-view.ts `settled`: its rack and jib prompts. The Railhead lever no longer waits: it stands at the trains'
  // stop, which holds still through the haul (below).
  for (const a of hauls) {
    let lastMove = -1;
    for (const t of ticks(a)) {
      if (t > a.moved && haulU(a, t) !== haulU(a, t - 0.25)) lastMove = t;
      assert.equal(haulSettled(a, t), t >= haulEnd(a), `haul to ${a.set >> 1} at tick ${t}`);
    }
    assert.ok(
      lastMove > 0 && lastMove + HAUL.settle <= haulEnd(a),
      "the deck is chocked a while before the prompts",
    );
    assert.equal(haulU(a, haulEnd(a)), RING_HEAD[a.set >> 1]!.u, "settled at the new head");
  }
  assert.ok(
    haulSettled({ set: 1, moved: -1, from: 0 }, 0),
    "before any pair the railhead is at rest",
  );
});
// ---------------------------------------------------------------- the railhead re-route (docs/plans/railhead-reroute.md,
// step 3): the trains' Railhead (`Aperture.stop`) holds at the old head until the haul settles, and the views follow it.
/** The stop the trains serve at tick t of haul a, as rail.ringStop moves it (once, at haulEnd). */
const stopAt = (a: RailheadHaul, t: number) => (t >= haulEnd(a) ? a.set >> 1 : (a.set >> 1) - 1);

test("the lever stands at the trains' stop through a haul, where the server takes its ask, and on what is drawn", () => {
  // halts-view.ts's Railhead lever: `railheadLever(ringOpen(w).head)`, lifted by `railheadLeverUp(u, railheadEnd())`.
  for (const a of hauls) {
    for (const t of ticks(a)) {
      const stop = stopAt(a, t),
        end = haulU(a, t) / 100,
        { u, lat } = railheadLever(stop),
        up = railheadLeverUp(u, end);
      const [p0, p1] = platformSpan(end),
        [w0] = walkwaySpan(end);
      if (up) assert.ok(u > p0 && u <= p1, `haul to ${a.set >> 1} at tick ${t}: lifted, but off the deck`);
      else assert.ok(u >= w0 && u <= p0, `haul to ${a.set >> 1} at tick ${t}: down, but not on the walkway`);
      // A player standing at the lever, on the dais or the walkway under it: the server takes the ask there.
      const at = ringAt(Math.round(u * 100), Math.round(lat * 100)),
        y = (ringDeckY(Math.round(u * 100)) + up * 100) / 100;
      assert.ok(
        leverAskTaken(RING_HEAD[stop]!.platform, at.x / 100, y, at.z / 100),
        `haul to ${a.set >> 1} at tick ${t}: the ask is refused at the lever`,
      );
    }
    // On the deck until it leaves, on the walkway through the travel, on the new deck at the settle.
    const k = a.set >> 1;
    assert.equal(railheadLeverUp(railheadLever(k - 1).u, haulU(a, a.moved) / 100), 0.9, "on the deck at the pair");
    assert.equal(railheadLeverUp(railheadLever(k - 1).u, haulU(a, haulEnd(a) - 1) / 100), 0, "the walkway, settling");
    assert.equal(railheadLeverUp(railheadLever(k).u, haulU(a, haulEnd(a)) / 100), 0.9, "on the new deck");
  }
});

test("the old platform's place is walkway at every tick of a haul", () => {
  // Where the trains stand and riders step off until the settle: the old platform's 25 m, all walkway or deck.
  for (const a of hauls)
    for (const t of ticks(a)) {
      const end = haulU(a, t) / 100,
        [o0, o1] = platformSpan(headU(stopAt(a, t))),
        [w0, w1] = walkwaySpan(end);
      assert.ok(o0 >= w0 && o1 <= w1, `haul to ${a.set >> 1} at tick ${t}: the stop's platform over the sea`);
    }
});

test("the far crowd rides the drawn deck and stands on the new platform at the settle", () => {
  // riders-view.ts: `deckPlatform(railheadEnd())` while the build head is ahead of the stop.
  for (let k = 0; k <= BENTS; k++)
    assert.deepEqual(deckPlatform(headU(k)), RING_HEAD[k]!.platform, `head ${k}: the deck's platform at rest`);
  for (const a of hauls) {
    let was = deckPlatform(haulU(a, a.moved) / 100);
    for (const t of ticks(a)) {
      const p = deckPlatform(haulU(a, t) / 100),
        step = Math.hypot(p.x - was.x, p.z - was.z);
      assert.ok(step <= HAUL.speed * 0.25 + 2, `haul to ${a.set >> 1} at tick ${t}: the crowd jumps ${step} cm`);
      was = p;
    }
    assert.deepEqual(was, RING_HEAD[a.set >> 1]!.platform, "settled on the new platform");
  }
});

// A real room's row through one haul (deck-laid, a pair set): the stop, the build head and the map, rule tick by tick.
const RAILHEAD_HALT = RAIL_HALTS.findIndex((h) => h.name === "Railhead");
const REROUTE = (() => {
  const s = railwayAtRing("deck-laid");
  for (let g = 0; aperture(s.w).rack < 2; g++) {
    assert.ok(g < 6000, "two footings on the railhead rack");
    advanceWorks(s, 1);
  }
  for (let k = 0; k < 2; k++) {
    assert.equal(act(s, "a", "rail.footTake", { rack: 2 }), 1);
    assert.equal(act(s, "a", "rail.footSet", { site: 3 }), 1);
  }
  const at = s.t,
    end = haulEnd(aperture(s.w)),
    frames: { t: number; stop: number; build: number; map: number; platform: object }[] = [];
  for (;;) {
    frames.push({
      t: s.t,
      stop: aperture(s.w).stop,
      build: ringHead(s.w),
      map: mapStageOf(s.w).head,
      platform: railCallPlatform(s.w, RAILHEAD_HALT, -1, s.t),
    });
    if (s.t > end + 10) break;
    advanceWorks(s, 1);
  }
  return { at, end, frames };
})();

test("the map redraws at the settle, not at the pair", () => {
  const { end, frames } = REROUTE;
  for (const f of frames) {
    assert.equal(f.map, f.t >= end ? 1 : 0, `tick ${f.t}: the map's railhead`);
    assert.equal(f.map, f.stop, "the map follows the trains' stop");
    // The far crowd rides the deck exactly while the build head is ahead of the stop; the lever's platform is the stop's.
    assert.equal(f.build !== f.stop, f.t < end, `tick ${f.t}: riding the deck`);
    assert.deepEqual(f.platform, RING_HEAD[f.stop]!.platform, `tick ${f.t}: the lever's platform`);
  }
  assert.deepEqual(
    frames.filter((f, i) => i > 0 && f.map !== frames[i - 1]!.map).map((f) => f.t),
    [end],
    "one redraw, at the settle",
  );
});

test("the railhead clock advances in rule ticks and snaps to a restored clock", () => {
  assert.equal(leanClock(-1, 100, 1 / 60), 100);
  assert.equal(leanClock(100, 100, 1 / 60), 100 + 1 / 6);
  assert.equal(leanClock(100, 210, 1 / 60), 210);
});

// ---------------------------------------------------------------- the lookout's buoys
test("the buoys lift as RING_BUOYS says, and a rewind puts them back", () => {
  const at = (head: number, joined: boolean) =>
    RING_BUOYS.map((_, i) => buoyLifted(i, head, joined));
  assert.deepEqual(at(0, false), [true, true, false, false, false, false, false]);
  assert.deepEqual(at(1, false), [true, true, false, false, false, false, false]);
  assert.deepEqual(
    at(2, false),
    [true, true, true, false, false, false, false],
    "buoy 3 at bent 8",
  );
  assert.deepEqual(at(4, false), [true, true, true, false, false, false, false]);
  assert.deepEqual(
    at(5, false),
    [true, true, true, true, false, false, false],
    "buoy 4 at bent 11",
  );
  assert.deepEqual(
    at(7, false),
    [true, true, true, true, false, false, false],
    "none past the gap before the rivet",
  );
  assert.deepEqual(
    at(7, true),
    [true, true, true, true, true, true, true],
    "buoys 5-7 on the rivet",
  );
  assert.deepEqual(at(0, false), [true, true, false, false, false, false, false]);
});

// ---------------------------------------------------------------- the catalog the view leans on
test("line 2's last halt is the Railhead with `heads`, so its drawn end follows RING_HEAD", () => {
  const halts = RAIL_LINES[LINE2]!.halts;
  const railhead = halts.find((h) => h.heads);
  assert.ok(railhead && railhead.name === "Railhead");
  assert.deepEqual(
    railhead.heads,
    RING_HEAD.map((h) => h.s),
  );
});

// ---------------------------------------------------------------- the traveller's cues (Checkpoint B review)
// railhead-view.ts built from its own source with every import real except the sounds (counted), the dust and the
// deck's driver (`driveDeck` returns the rule clock the test sets, as the platform's `move` would). The row is a real
// room's at `gap-footed`, whose last pair stamped the haul from railhead 6 to 7.
async function railheadCues(gate?: "near" | "far") {
  const far = gate === "far";
  await import("../dev/sim/hooks.ts");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  const { sourceModule } = await import("../dev/level/source.ts");
  const { buildSeedWorld } = await import("./helpers/rail.ts");
  const { aperture } = await import("../src/sim/railway-rows.ts");
  const { haulU: at } = await import("../src/sim/railway-ring-haul.ts");
  const { createOwnedView } = await import("../src/render/owned-view.ts");
  await (
    await import("../src/physics/engine.ts")
  ).physicsReady;
  const file = "src/entities/railway/railhead-view.ts";
  const source = fs.readFileSync(file, "utf8");
  const bindings: Record<string, unknown> = {};
  // Browser-only modules (the player, the net, sounds and effects, the camera's redraw gate) are given below instead.
  const browser =
    /player\/player|netplay\/net|machine-sfx|place-sfx|render\/splash|particle-effects|prefab\/instantiate|place\/sites|place\/land|render\/view-sleep/;
  for (const m of source.matchAll(
    /^import\s+(\*\s+as\s+(\w+)|\{([^}]*)\})\s+from\s+'([^']+)';/gm,
  )) {
    if (m[0].startsWith("import type")) continue;
    const spec = m[4]!;
    if (browser.test(spec)) continue;
    const url = spec.startsWith(".")
      ? pathToFileURL(path.resolve(path.dirname(file), spec)).href
      : spec;
    const mod = (await import(url)) as Record<string, unknown>;
    if (m[2]) bindings[m[2]] = mod;
    for (const name of (m[3] ?? "").split(",").map((s) => s.trim())) {
      if (!name || name.startsWith("type ")) continue;
      const [from, as = from] = name.split(/\s+as\s+/);
      bindings[as!] = mod[from!];
    }
  }
  const { railRoom } = await import("./helpers/rail-room.ts");
  const room = railRoom(buildSeedWorld("gap-footed"));
  const read = room.join("a", "a").adapter.read;
  room.ready();
  const world = read.world();
  const row = aperture(world);
  const heard: { cue: string; p: number }[] = [];
  let clock = -1;
  const phaseNow = () => clock - row.moved - HAUL.after;
  const cue = (name: string) => () => heard.push({ cue: name, p: phaseNow() });
  Object.assign(bindings, {
    bell: cue("bell"),
    chuff: cue("chuff"),
    clank: cue("clank"),
    thump: cue("thump"),
    placeSound() {},
    dustRing() {},
    splash() {},
    instantiate: () => ({
      root: new (bindings.THREE as typeof import("three/webgpu")).Group(),
      dispose() {},
    }),
    me: { body: null, coyote: 0 },
    outOf: () => false,
    H: () => -10,
    slab: () => ({}),
    remotes: new Map(),
    driveDeck: () => clock,
    railheadEnd: () => at(row, Math.max(clock, 0)) / 100,
    // Awake unless `gate` is 'far', which builds the real gate with the camera 10 km off; with either gate the view draws
    // with reduced motion
    // so the windsock (held still asleep by design) matches.
    createRedrawSleep: far
      ? sourceModule<typeof import("../src/render/view-sleep.ts")>(
          fs.readFileSync("src/render/view-sleep.ts", "utf8"),
          {
            resident: (await import("../src/render/lod-level.ts")).resident,
            viewDistance: () => 10_000,
          },
        ).createRedrawSleep
      : () => ({ redraw: () => true, awake: () => true }),
  });
  if (gate) bindings.reducedMotion = true;
  const { createRailwayRailhead } = sourceModule<
    typeof import("../src/entities/railway/railhead-view.ts")
  >(source, bindings);
  let drive = () => {};
  const adapter = {
    read: { world: () => world, whole: () => true, pid: "a", tickNow: () => clock },
  };
  const owner = createOwnedView();
  const view = createRailwayRailhead(adapter as never, owner, {
    deck: { car: null as never, snap() {}, drive: (fn: () => void) => void (drive = fn) },
    toRing: () => 0,
    hookRing() {},
  });
  /** One frame with the rule clock at `tick`. */
  const frame = (tick: number) => {
    clock = tick;
    drive();
    view.update(1 / 60);
    return (view.inspect() as { railheadView: { traveller: { lamps: boolean } } }).railheadView
      .traveller;
  };
  return { row, heard, frame, view, owner };
}
test("a tab whose clock jumps forward (hidden, paused or stalled mid-haul) does not play the missed cues at once", async () => {
  // leanClock snaps the rule clock to tickNow when it is more than 3 ticks out, so a tab that comes back from the
  // background or a long stall reaches the present in one frame. Every cue between its last frame and now then passes
  // the `seen < x <= p` latch together: the told chuff, each travel chuff, both thumps and the settled bell in one frame.
  const { row, heard, frame } = await railheadCues();
  for (let t = row.moved; t <= row.moved + HAUL.after + 2; t += 1 / 6) frame(t);
  const before = heard.length;
  frame(haulEnd(row) + 5);
  const burst = heard.slice(before);
  assert.ok(
    burst.length <= 1,
    `${burst.length} cues in one frame: ${burst.map((h) => h.cue).join(", ")}`,
  );
});
test("a railhead asleep far off draws, frame by frame through a haul, the batch an awake one draws", async () => {
  // The redraw gate (render/view-sleep.ts) skips the live batch's rebuild only while nothing it reads changes, so a
  // telescope or far camera that picks up the place mid-haul or after it sees what a near player sees. The frame the
  // haul settles (rig.line off) must be drawn too, or the taut haul line and lit lamps stand on the traveller.
  const near = await railheadCues("near"),
    far = await railheadCues("far");
  const live = (o: typeof near.owner) => {
    const meshes = o.root.children.filter(
      (c) => (c as { isInstancedMesh?: boolean }).isInstancedMesh,
    );
    const m = meshes.reduce((a, b) =>
      (b as never as { instanceMatrix: { count: number } }).instanceMatrix.count >
      (a as never as { instanceMatrix: { count: number } }).instanceMatrix.count
        ? b
        : a,
    ) as never as {
      count: number;
      instanceMatrix: { array: Float32Array };
      instanceColor: { array: Float32Array };
    };
    return m;
  };
  const differs: string[] = [];
  const asleep = () =>
    (far.view.inspect() as { railheadView: { asleep: boolean } }).railheadView.asleep;
  for (let t = near.row.moved - 2; t <= haulEnd(near.row) + 12; t += 1 / 6) {
    near.frame(t);
    far.frame(t);
    const a = live(near.owner),
      b = live(far.owner);
    const same =
      a.count === b.count &&
      a.instanceMatrix.array
        .subarray(0, a.count * 16)
        .every((v, i) => Math.abs(v - b.instanceMatrix.array[i]!) < 1e-5) &&
      a.instanceColor.array
        .subarray(0, a.count * 3)
        .every((v, i) => v === b.instanceColor.array[i]);
    if (!same && differs.length < 5)
      differs.push(`tick ${t.toFixed(2)} (phase ${(t - near.row.moved - HAUL.after).toFixed(2)})`);
  }
  assert.ok(asleep(), "the far view sleeps");
  assert.deepEqual(differs, [], "frames where the far batch differs from the near one");
});
test("a tab drawing every frame through a haul hears each cue once, in order", async () => {
  const { row, heard, frame } = await railheadCues();
  for (let t = row.moved; t <= haulEnd(row) + 5; t += 1 / 6) frame(t);
  const names = heard.map((h) => h.cue);
  assert.deepEqual(names.slice(0, 3), ["bell", "clank", "chuff"], "told, then the start");
  assert.deepEqual(names.slice(-3), ["thump", "thump", "bell"], "chocked, then settled");
  assert.ok(
    names.filter((n) => n === "chuff").length >= 3,
    `the winch chuffs while it travels: ${names.join(", ")}`,
  );
  assert.ok(heard[0]!.p >= 0 && heard[0]!.p < 0.5, "the bell rings at told");
});
test("a slow frame (200 ms) while the rule clock leans to catch up still hears the told bell", async () => {
  // leanClock adds up to 0.02 ticks a step while it trails tickNow (after dropped steps or a new server estimate), so a
  // 200 ms frame (12 steps) moves the clock up to 2.24 ticks: past the 2-tick skip window, though no cue is 0.2 s late
  // in wall time. Here tickNow steps 1 tick ahead just before told, then the tab draws every 12 steps.
  const { leanClock } = await import("../src/entities/railway/railhead-shape.ts");
  const missed: string[] = [];
  for (let off = 0; off < 12; off++) {
    const { row, heard, frame } = await railheadCues();
    let target = row.moved,
      clock = target,
      k = off;
    for (; target < row.moved + HAUL.after - 1.5; target += 1 / 6)
      frame((clock = leanClock(clock, target, 1 / 60)));
    target += 1;
    while (target <= haulEnd(row) + 5) {
      target += 1 / 6;
      clock = leanClock(clock, target, 1 / 60);
      if (++k % 12 === 0) frame(clock);
    }
    const names = heard.map((h) => h.cue);
    if (names[0] !== "bell" || names.filter((n) => n === "bell").length !== 2)
      missed.push(`${off}: ${names.join(", ")}`);
  }
  assert.deepEqual(missed, [], "frame alignments that lose a bell");
});
