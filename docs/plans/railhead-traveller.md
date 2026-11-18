> **Status:** Steps 1–2 shipped in #1841 as v46; Checkpoint A is verified below. Steps 3 to 5 are built on the implementation branch (step 5 fresh: the archived branch is gone); Checkpoint B is next. Design base:
> `origin/main` at `35e1c3431`. Replaces
> steps 2 and 4 of [gap-readability](gap-readability.md) (the railhead's move), which were built on branch
> `worktree-agent-af55e2f2172764ff8` (tag `archive/worktree/railhead-traveller`, tip `9b9845fbb`) and failed three
> independent reviews on timing agreement between tabs. Uses `WORLD_NS` v46 (the shared bump; v45 shipped in #1827).
> Not a port from Place:
> no fit check applies.

# The railhead traveller: one move on every tab

## Goal

When a bent's second footing is set, the railhead platform hauls itself out 20 m as a piece of construction apparatus
and carries whoever stands on it, and every tab shows the same deck in the same place at the same moment
([owner, 14 November](../decisions-rail.md#d-2026-11-14-gap-readability-answered): players ride the railhead; "a more
bespoke animation... part of a construction apparatus"). Serves DESIGN.md 7 (Telegraph everything), 11 (Show, don't
tell: "What's on screen is true"), the technical principle Clear authority, and
[what looks solid is solid](../decisions-rail.md#d-2026-11-02-what-looks-solid-is-solid). It bends none.

**Research:** [coop-physics-vehicles-netcode](../research/coop-physics-vehicles-netcode.md), recommendations 1 to 3:
send riders in the vehicle's frame (shipped as the `riding` presence), "timetabled vehicles are a pure function of the
tick, so every tab can place the deck now", and a blend on boarding. The plan uses all three as they already exist in
`src/physics/platforms.ts` and `src/entities/remote-player/`; it departs from none.

## Why the archived design could not work

The three reports (`.look/codex/review-gap/report.md`, `review-gap-2/report.md`, `review-gap-3/report.md`) name six
defects. They have two causes, and both are ownership, not arithmetic.

1. **The move's start was an event, kept by the view.** The `Aperture` row holds only `set` (how many footings); the
   tick the pair completed is not state. The view rebuilt it from receipts: a predicted tick on the acting tab, a
   packet tick on peers, a FIFO of ticks matched to footings, an added `onConfirmed` read in the adapter. Every repair
   added another way for two tabs to hold different numbers (late receipt, batched footings, a backed-up peer's later
   packet tick, two setters each ordering themselves first).
2. **The deck was a static slab moved by hand.** A static body is not interpolated by the engine, so the view set its
   drawn pose itself and needed the engine's step fraction, which views may not import. Counting it or reading it off
   the local player's body gave up to 8.3 cm between deck and rider.

## Design

How the things that already agree across tabs do it: the cart (`src/sim/railway-cart.ts`, `cart-view.ts`) and the
trains (`stopMoved` in `src/sim/railway-trains.ts`) keep `depart` (the server's rule tick) and `from` in their
replicated row; the pose is a pure sim function of the row and a tick (`cartAlong(row, tick)`, `trainPose`); the view
evaluates it at `adapter.read.tickNow()` (the one RTT-compensated clock every replicated mover uses) inside a
kinematic car's `move`, and the car is a `shared` platform, so the engine interpolates deck and rider together and a
friend is drawn in the deck's frame on each tab's own copy. The traveller becomes one more of these. Nothing new is
invented.

| Piece | Sync kind | Authority | API |
| --- | --- | --- | --- |
| When the haul started and from where (`moved`, `from` on `Aperture`) | Server | The server's `rail.footSet` apply | The existing command, checkpoint and row replication; clients read `adapter.read.world()` |
| Where the deck is now | Derived, on every tab | Nobody: `haulU(row, tick)` in `src/sim/` | `adapter.read.tickNow()`, the cart's lean clock |
| The deck's body and its riders | Owner (each tab's physics; a rider's `riding` presence, unchanged) | Each player for their own body | `makeCar` + `registerPlatform`, `id: 'railway:railhead'`, `shared: true` |
| Apparatus picture, bell, lamps, chocks, dust | Local | Cosmetic | The view; fired from the haul's phase time |

**Decision: accepted state, not a view record on an existing row.** No existing accepted row holds the tick: `set` is
a count, and `stopMoved` stamps `depart` only on a train that happens to be running to the railhead. A late joiner or
a reload mid-haul can only know the start from state. So the row grows two integers, which is a saved and wire shape
change: **`WORLD_NS` v46**, no migration, starting the shared reset that the great tree and rack moves will join.
The owner requested the namespace bump in its own commit; v45 shipped on 14 November (#1827).

### Sim

- `src/sim/railway-components.ts`: `Aperture` gains `moved: 'int'` (default `-1`: the rule tick the last pair was
  accepted) and `from: 'int'` (default `0`: where the traveller's end stood at `moved`, cm out, `RING_HEAD[k].u`
  units). Both replicate and checkpoint with the row; no new state key, no new op, no `env` fact, no types.ts entry
  (the railway row schema is the wire schema).
- New `src/sim/railway-ring-haul.ts` (pure; `+ - * /`, `Math.floor`, `Math.max`, `Math.min` only; covered by
  `LOCKSTEP_FILES`; `src/sim` is already listed for the server image as a directory):
  - `HAUL = { after: 60, ready: 10, speed: 50, ramp: 8, settle: 9 }` in rule ticks and cm per tick: 6 s for the
    footing to go down, the bent to stand and the span to land; 1 s told; 5 m/s with 0.8 s of ease each end; 0.9 s to
    chock. The archived `MOVE` numbers, as integers.
  - `haulTravel(dist)` and `haulAlong(dist, t)`: the archived `travelSeconds` and `travelAt`, in cm and ticks.
  - `haulTarget(a)`: `RING_HEAD[min(7, floor(a.set / 2))].u`.
  - `haulU(a, tick)`: before any pair, `haulTarget(a)`; otherwise the canonical pose at a whole rule tick is
    `a.from + Math.floor(haulAlong(haulTarget(a) - a.from, tick - a.moved - HAUL.after - HAUL.ready))`, in integer
    centimetres. Fractional view ticks linearly interpolate the two surrounding whole-tick poses. A fractional
    travel duration reaches the exact target on the next whole tick; the settlement calculation already rounds up.
  - `haulPhase(a, tick)`: ticks since told (`tick - a.moved - HAUL.after`), for cues; `haulEnd(a)`: the tick it is
    settled (`moved + after + ready + ceil(haulTravel) + settle`, or `-1`); `haulSettled(a, tick)`.
- `src/sim/railway-sys-ring.ts`, `ringFootSet`, where `m.set % 2 === 0` (three lines, before `stopMoved`): read
  `from = haulU(rowBeforeTheIncrement, tick)`, the canonical integer pose at this whole rule tick, then
  `m.from = from; m.moved = tick`. Do not quantize a separate fractional curve for the stamp. As `stopMoved` replans
  a running train "from its pose now", a pair completed while a haul is still running replans from where the traveller
  is: the pose is continuous for every accepted sequence. The UI cannot reach that case (prompts wait for
  `haulSettled`); seeds, bots and races can, and they must not make a jump.
- **No new refusal.** The server still accepts a footing at the new head's rack and jib during a haul, as today; the
  view keeps hiding the prompts until settled. No gameplay rule changes.
- `src/sim/railway-check-ring.ts` `checkRing` invariants: `moved` in `-1..RAILWAY_MAX_INT`; `(moved >= 0) === (set >= 2)`;
  `moved < 0` implies `from === 0`; otherwise `RING_HEAD[0].u <= from <= haulTarget(a)`.
- `src/sim/railway-seed-ring.ts`: after each `setFootings`, advance until `haulSettled` (a new `settleHaul(s)`), so a
  seeded room and every still open at rest. The seeds set footings through the op, so the stamps are real.
- `src/world/namespace.ts`: v46 with a dated line: "the Aperture row carries the railhead haul's start tick and origin".
- Prediction (`rail.footSet` is in `RAIL_PREDICTED`) runs the same apply on the clone, so the acting tab's row holds
  its predicted tick until the server's row replaces it. No adapter change.

### View

- **The deck is a kinematic car.** `src/entities/railway/line2-view.ts` (Line 2's view, already an importer of
  `makeCar`) builds it: `rail.makeCar({ hx: 2.25, hz: 12.5, top }, new THREE.Group(), () => drive?.(), { shapes: [pitched box] }, owner)`
  and returns `railheadDeck: { car, snap: () => rail.snapCar(car), drive(fn) }`; `view.ts` hands it to
  `createRailwayWorksLive` and on to `createRailwayRailhead` (type-only import of `Car`). The line there is straight
  (yaw 3.1146 from u 95 to 262, measured) and falls 4 cm a metre, so the walking surface is the extra box shape with
  `rotation` pitched to the grade, the car's own level box sits just under it, and
  `car.platform.topAt = (_x, z) => top + GRADE * z` gives `carryStep` the same surface. `car.platform.id =
  'railway:railhead'`, `shared = true`, `car.speedLimit = 7.5` (5 m/s and a little reconciliation). Before Q7 the car
  waits at `y = -60`, as the cart does. The `plat{k}` static slab and its made-afresh-at-rest swap are deleted: the
  same body stands at rest and moves.
- **Its pose, every fixed step** (the `drive` callback, which is the platform's `move`; pre-step order 10, before the
  controller): `clock = leanClock(clock, adapter.read.tickNow(), FIXED)`; `u = haulU(aperture(wd), clock) / 100`; set
  `car.x, car.y, car.z, car.yaw` to the deck's middle at `u - 12.5`. `moveCar` chases it with a velocity, so Rapier
  interpolates it; a gap over the speed limit is a `snapCar`, which relocates the rider with the deck.
- **What is drawn.** `drawnU` is read back from `car.body.interpolatedPosition` (projected on the line) once a frame
  and written to `railheadDrawn.u`; the deck boards, rack, jib, apparatus, tag and (in `halts-view.ts` `placeRing`) the
  Railhead lever are placed from it. A friend's rider is `fromPlatform(p, local, true)`, which reads the same
  `interpolatedPosition`. No view reads a step fraction; `stepAlpha` is not imported and `platforms.ts` gains no export.
- **Lifted aboard, never shoved.** In `drive`, the archived rule: the local player standing within 0.9 m ahead of the
  deck's leading face on the new span is set onto the deck (Owner physics, local body only).
- **The span is there first.** At `clock >= a.moved + HAUL.after` every bent below `headOf(set)` is forced stood and
  decked (the existing "a bent whose pair arrived without a lowering still rises" path, snapped), so the deck never
  rolls onto a span a slow tab has not drawn.
- **Cues** fire from `haulPhase(row, clock)` with the archived `passed(x)` latch (`seen < x <= t`); a tab whose first
  sight of a haul is more than 0.2 s in skips the cues already past. Prompts (`targets()`) and the lever's wait for
  `haulSettled(row, clock)`.
- Controls: none added. No action id, pad slot, key, touch button or guide row.

### Why each failure cannot recur

| Review finding | Why it is gone |
| --- | --- |
| Acting tab timed from a predicted tick, peers from the server's (2, P1) | The tick is a row field. The predicted row is replaced by the server's row on confirmation, as every predicted row is. For the first 6 s (`HAUL.after`) the pose does not depend on `moved` at all, so any confirmation under 6 s is invisible; past that, the car chases the corrected target with its rider |
| A late receipt restarted the move (1 P1; 2 P2) | No receipt starts anything. A tab that learns late evaluates `haulU(row, tick)` and is mid-haul or at rest |
| Batched footings lost a timestamp (2 P2) | There are no per-footing timestamps to match: one row, last write, replicated whole |
| `onConfirmed` gave a backed-up peer a later packet tick, 7.5 m (3 P1) | The adapter read is not added. `moved` is the tick the server's apply ran at, the same integer in every packet and checkpoint |
| Simultaneous setters ordered themselves first, 1 m (3 P1) | The server's apply order decides which footing completes the pair and stamps it; each tab's guess lasts until its packet, inside the 6 s |
| Deck and rider 8.3 cm apart; the step fraction (1 P2; 2 P2; 3 P2) | The deck is a kinematic body the engine interpolates; picture and rider read one `interpolatedPosition` |

What remains is the clock estimate's error (`tickNow`), the same few milliseconds every train and the cart carry.

## From the archived branch

**Reusable** (port the hunks, not the files; `railhead-view.ts` has moved on since PR 1797):

- The apparatus look: `drawTraveller`, `guy`, `drawKit`, the bogies, haul line, bell, lamps and chocks, the jib's
  `fold`, and the cue list in `stepMove` (sounds, dust, splash, socket flare).
- The numbers: `MOVE` (as `HAUL`), `travelSeconds`, `travelAt`, `leanClock`.
- The lift-aboard rule in the platform's `move`; `platform.topAt` on the grade; `onPlatform`; the `railhead slide`
  playtest mark with `aboard` (its `authority` becomes `'row'`).
- `src/entities/railway/railhead-state.ts` (`railheadDrawn`) and the `placeRing` change in `halts-view.ts`.
- `dev/look/evals/railhead-move.ts`, with its timing read from the row.
- Tests in `test/railway-r4b-views.test.ts`: the travel-curve cases (speed never over 5 m/s, eased ends, a restore
  snaps), the walkway-holds-the-old-platform case, the lift-aboard case. `restStep`'s cases carry over as cases of
  `haulU`: learned late joins part-way, learned after the end is at rest, the goal never pulls the deck back.

**Discarded:**

- `restStep` itself, `pendingTold`, `toldTick`, the local-picture fallback ("with no accepted tick, the tab's own
  picture starts it, from now"): a tab never starts a haul.
- `createFootingTicks` and `retime`; `onConfirmed` in `src/adapters/railway-session.ts` and its wiring in `view.ts`
  and `works-live.ts`; the adapter test for it.
- The static slab as a platform, `placeDeck`'s spent and fresh slabs, `drawDeck`, `stepFractionOf`, `drawnSeconds`,
  the `postPhysics: 12` slot on the `railway` kind and `view.postPhysics`.
- `MOVE.landed` as a gate (the sim's `after` replaces it).

## Steps

Rows are from `npm run models` (mode withCodex, 14 November).

- [x] **1. The haul's pure functions. Tier: sim. Row: high-risk implementation, Codex gpt-6-astra high.** Create
      `src/sim/railway-ring-haul.ts` as above and `test/railway-ring-haul.test.ts`:
      - `haul: at rest before any pair, and at the target once settled`
      - `haul: holds for 60 ticks, told for 10, then never faster than 50 cm a tick, eased at both ends`
      - `haul: continuous and never backwards over fractional ticks`
      - `haul: learned late joins part-way; learned after the end is at rest` (the reviewers' late case, pure)
      - `haul: a short remainder and a 140 m replan both end exactly on the target`
      Verify: the test file; `node dev/ship-check.ts`. No row reads it yet, so no bump.
- [x] **2. The row, the stamp, the invariants, the bump. Tier: sim, world, server; high risk; `WORLD_NS` v46. Row:
      Codex gpt-6-astra high.** Edit `src/sim/railway-components.ts`, `src/sim/railway-sys-ring.ts`,
      `src/sim/railway-check-ring.ts`, `src/sim/railway-seed-ring.ts`, `src/world/namespace.ts`. Tests:
      - `test/railway-ring.test.ts`: `a bent's second footing stamps moved and from; its first does not`;
        `a pair completed mid-haul replans from where the traveller is` (stamp the canonical integer pose; no jump:
        `haulU(oldRow, tick) === haulU(newRow, tick)` at the same accepted rule tick before and after applying the pair);
        `5,000 random ring ops keep the haul invariants`; each seed stage is settled and passes `railwayCheck`.
      - `test/railway-check-ring.test.ts`: each new invariant refused when broken.
      - `server/test/railway-ring-host.test.ts`, real host and two mirrors:
        `concurrent: two sessions set a pair's footings in one tick; both mirrors hold the server's set, moved and from`;
        `predicted: the setter's predicted moved is replaced by the server's on its packet, and haulU agrees on both mirrors at every later tick`;
        `backed up: a mirror whose packets arrive 1.5 s late holds the same moved`;
        `late: a mirror that hears 15 s late is at rest at the new head and starts nothing`;
        `batched: both footings in one packet give the same row as two packets`;
        `reload and late join mid-haul: the checkpoint round-trips moved and from`.
      - `test/world-replay.test.ts` stays green; if a pinned result changes, name the changed input (the two fields)
        in the commit.
      Verify: those files; `node dev/ship-check.ts`. The view still slides as today (it ignores the fields).
- [x] **Checkpoint A (step 2 shipped on the shared v46 in #1841).** Verified on `d2abaf31`: the loop passed for 1–4 players (14 footings each, wagon supply, 14 × 15 m to carry; rack and jib advance a bent each pair). The network suite passed 208/208. The exclusive `deck-laid` to `gap-footed` ring bot shouldered and set all 14 without recovery, ending at head 7 with 4 racked, no graphics errors. Proofs, once:
      `npm run loop -- run` (the `bents` beat: bill, supply and cue unchanged); `npm run test:net`; the ring bot
      (`dev/look/evals/railway-ring-bot.ts` with `--rail-seed deck-laid`: its route sets the fourteen bent footings and
      waits out each haul). Independent review before merge (sim, world, server): a fresh Codex
      review job, gpt-6-astra, a failing test per suspected defect. Code review before shipping: Codex review job on
      the committed branch, gpt-6-astra high.
- [x] **3. The deck is a car. Tier: view (physics, Owner). Row: player-visible implementation, implementer agent,
      fable medium.** Edit `line2-view.ts` (build and return `railheadDeck`), `view.ts`, `works-live.ts`,
      `railhead-view.ts` (take the deck; `drive`; delete `plat{k}` and `slide`), `railhead-shape.ts` (drop `SLIDE`,
      `slide`; add `leanClock`), new `railhead-state.ts`. Lower `railhead-view.ts`'s count in
      `dev/lint/prefab-debt.json` if the lint asks; never raise one. Use the existing `test/platforms-carry.test.ts`
      on the production physics backend (orchestrator state rule 7):
      - `a rider standing on the deck keeps their place in its frame within 1 mm through a 20 m haul`
      - `the deck's drawn pose and a remote rider's are the same interpolated pose at alpha 0.25, 0.5 and 0.75` (the
        reviewers' 8.3 cm case)
      - `interpolation is right on the first step after Q7 opens, with no player moving` (review 2 and 3, P2)
      - `someone on the new span ahead is lifted aboard, never pushed off the end`
      - `a correction past the speed limit relocates deck and rider together`
      Verify: the test; `npm run lint` and `npm run registry` (the `car.ts#makeCar` importer count stays 5: measured
      on this base with the call added in `line2-view.ts`); a `/look` still at ring stage `deck-laid` (`railwayAtRing`), standing on the platform at rest.
      As built: Line 2 and the carry test both use `createRailheadDeck` in `railhead-state.ts`. Line 2 no longer acquires the entire rail kit; `makeCar` stays at five importers, and `buildMachine` falls from three to two. All five carry cases passed. Menu-closed WebGPU stills with the rider aboard: [rest](../world/railhead-deck-car/rest.png) (u 120.00 m) and [haul](../world/railhead-deck-car/haul.png) (u 127.17 m).
- [x] **4. Prompts, spans and the lever follow the row. Tier: view. Row: implementer agent, fable medium.**
      `railhead-view.ts`: `settled()` is `haulSettled(row, clock)`; spans forced at `moved + after`; `halts-view.ts`
      `placeRing` reads `railheadDrawn.u`. Tests in `test/railway-r4b-views.test.ts`: `prompts wait until the haul has
      settled`; `the lever stands on the drawn deck`; `the walkway behind a moving railhead holds the old platform's
      whole place`. Verify: the tests (no ring scenario exists; the ring bot, `dev/look/bots/railway-ring.ts`, is the checkpoint's).
      As built (18 November): `settled()` is `haulSettled(row, ruleClock)` and is written to `railheadDrawn.settled`,
      which the Railhead lever's prompt also waits for. The spans are forced, not the deck held: `spansDue(row, clock)`
      (`railhead-shape.ts`) stands and decks every bent below the haul's head from `moved + after`, snapped, and drops
      any of their footings still on the rope, so a tab whose bent animation runs a second or more behind the game clock
      has the span before the deck's told second and travel. The lever's u is `railheadLeverOn(railheadEnd())`
      (`lever-place.ts`, `railhead-state.ts`): the deck's end read off the car's interpolated pose, so it rides the deck
      instead of easing ahead to the next head, and is not a frame behind although `halts-view.ts` updates before the
      works. The view's driver moved into `railhead-state.ts` as `driveDeck` (the view calls it unchanged), so
      `test/platforms-carry.test.ts` now drives the deck through it from a real room's row at `gap-footed`. The walkway
      test also asserts, on every quarter tick of every haul, that the deck's end is never past a span the lagging tab
      draws. `test/prefab-halts.test.ts` injects the two new bindings; its catalog golden is unchanged.
- [x] **5. The apparatus and its cues. Tier: view. Row: implementer agent, fable medium. Built fresh, not ported**
      (owner, 18 November: the archived branch is gone; no `archive/worktree/railhead-traveller` tag, remote ref or
      object `9b9845fbb` survives). Design: [Step 5 design note](#step-5-design-note-18-november) and its
      [review](#design-review-2026-11-18). Write `dev/look/evals/railhead-move.ts`. Verify: the eval's motion sheet
      (told before any movement, eased start, chock and flare at rest).
      As built (18 November), **fresh, not a port**: the design note's parts and timeline in `railhead-view.ts`
      (`stepRig`, `drawTraveller`, the jib's fold in `drawKit`, `bollard` on each span), driven by `haulPhase` on
      the view's rule clock; `inspect().railheadView.traveller` reports the rig. The only change from the note: the
      wheels grew from r 0.35 to 0.42 m with a grey disc behind the spokes, because at 0.35 they read as brackets.
      Cost: no new draw call (all in the existing `live` and static box batches); about 79 boxes at rest and 82 at
      most while moving (about 980 triangles; the bell became four boxes at Checkpoint B) in `live`, and 16 boxes (192 triangles) for the 8 bollards in the static
      batch; the peak `live` count measured at `gap-footed` is 385 of 2,600. Evidence with `dev/look/evals/railhead-move.ts`
      at `ring-set-3` (real input sets the pair's second footing): [motion sheet](../world/railhead-deck-car/traveller-motion.png)
      (10 frames over 9 s: rest, told with the jib folding and a lamp lit, the eased start, travel, the stop's flare,
      chocks down and lamps dark at rest), [mid-haul, the winch slung on the front face and the four-box bell after Checkpoint B](../world/railhead-deck-car/traveller-kit.png),
      [rest](../world/railhead-deck-car/traveller-rest.png) and step 4's [lever riding the deck](../world/railhead-deck-car/lever-mid.png),
      all with the menu closed. The eval's log matched the timeline (told at phase 0, moving from phase 10, at u 160
      by phase 60, settled at 70). The motion sheet and rest still predate Checkpoint B's winch and bell. Not seen: sounds, reduced motion, a second tab, and the bell's swing at sheet size.
      Seen in passing (sim, not this step): a train runs to the new head's nose as soon as the pair is accepted, onto
      the new span ahead of the still-chocked deck.
- [ ] **Checkpoint B (steps 3 to 5, one ship, after A is live).** Proofs, once: real input standing on the platform
      through a haul (no fall, `carry.on` is the deck throughout); two tabs with `&railLag=400` on one, the friend
      drawn on the deck throughout and both `railheadView.shownU` within 0.1 m at the same wall time; a third tab
      joining mid-haul; `npm run perf` at the railhead (report the cost of the apparatus boxes). Visual review by a
      fresh subagent that did not build it (fable medium). Runner for the owed proofs: Codex gpt-6.1-sol medium.
      Then: `docs/game-design/place.md` (the railhead's section), [gap-readability](gap-readability.md)'s status
      block, an agent-calls row for the `HAUL` timings.

## Step 5 design note (18 November)

The owner's ask ([14 November](../decisions-rail.md#d-2026-11-14-gap-readability-answered)): the move reads as
construction apparatus doing a job, "not just shifting like a bug". The railhead platform becomes a **traveller**: a
wheeled carriage that unchocks, takes up a line to the new span's end and winches itself out, then chocks and locks in.
All boxes in the railhead's existing `live` batch (one instanced draw, `works-box-view.ts`) and the spans' static
batch, in the view's existing colours; no texture, no model, no collider, no string.

**Parts** (on the platform, so they ride the deck):

| Part | Where | At rest | Moving |
| --- | --- | --- | --- |
| Bogies | 4 (2 m and 8 m in from each end), a wheel pair on each long face at the walkway, a side frame between | still | spokes turn with the distance hauled (r 0.42 m) |
| Chocks | an orange block at each bogie, each face (8) | down on the walkway against the wheels | lifted 0.5 m and tucked against the face |
| Winch | a drum on two cheeks slung on the front face below the deck top, track side (Checkpoint B: moved off the walking surface, no part over 0.3 m) | still | the drum turns with the line taken in |
| Haul line | winch to a bollard at the new span's end (lat 1.5, just off the platform's track side) | not shown | sags, goes taut over the told second, shortens as it hauls |
| Bollards | one at each built span's end, in the span's static picture | where the line will run to | |
| Lamps | an amber lamp on a post at each front corner | dark | blinking at 2 Hz from told until settled |
| Bell | on a bracket off the jib mast, a flared bell of four stacked boxes | still | swings for the told second |
| Guys | two stays from the jib mast's top to the platform's back corners | taut | taut (they ride with it) |
| Jib | the existing arm | out over the gap | folds up toward the mast for the move, out again at rest |
| Flare | a gold glow at the winch and bollard as it seats | | fades over 0.6 s at the stop |

**Timeline** against `haulPhase(row, ruleClock)` (`p`, rule ticks since told; `T = ceil(haulTravel(dist))`):

| p | What a player sees and hears |
| --- | --- |
| -60 to 0 | Unchanged: the footing goes down, the bent rises, the span lands (forced by step 4 at p = -60 at the latest) |
| 0 | Told. **Bell**, lamps start blinking, chocks lift over 0.3 s with a **clank**, the jib folds over 0.8 s, the haul line appears and takes up its slack over the second |
| 10 | Eased start (`haulAlong`'s ramp). **Chuff** at the winch and a little dust at each bogie; wheels and drum turn |
| 10 to 10 + T | Travel at up to 5 m/s; a **chuff** every 0.8 s from the winch |
| 10 + T | Stopped at the new head. Chocks drop over 0.3 s, **thump** at each end, dust; the flare; the jib unfolds |
| 10 + T + 9 | Settled (`haulEnd`): **bell** again, lamps dark, line gone; the prompts and the lever come back (step 4) |

Sounds are the existing `machine-sfx` ones (`bell`, `clank`, `chuff`, `thump`). Cues fire with a latch on the
highest phase seen for the pair (`seen < x <= p`), so a clock correction backward never repeats one; a cue more
than 0.2 s behind the clock when the clock gets there is skipped, whether the pair is first seen late (late join,
reload, a backed-up peer) or the clock jumps forward (a tab back from the background, a pause, a stall: Checkpoint B). **Reduced motion** keeps every
sound, the chocks, the fold, the wheels and the line (they are the mechanism), and drops the lamps' blink (steady on
instead) and the bell's swing.

## Design review (2026-11-18)

Reviewed in the builder's context against DESIGN.md 7 (Telegraph everything), 10 (Slapstick over precision) and 11
(Show, don't tell), the 14 November and 2 November rail decisions and `HAUL`.

| Call | Kind | Source or recommendation |
| --- | --- | --- |
| The move is apparatus, riders carried, 1 s told and about 5 m/s | Decided | [14 November](../decisions-rail.md#d-2026-11-14-gap-readability-answered) |
| The look is the builder's | Decided | Same entry: "How the apparatus looks is the builder's" |
| A wheeled, self-winching traveller: the parts table above | Default | Reads as a job being done with no words (11); every part is cheap boxes and can be cut or retuned |
| The cue timeline above (bell at told and settled, clank, chuffs, thumps) | Default | Telegraphs the move a full second before anything moves (7), with existing sounds only |
| The lamps and line start at told, not earlier | Default | `HAUL.after`'s 6 s already shows the bent rising and the span landing; a longer warning is a `HAUL` retune, not view work |
| Reduced motion drops the blink and the swing, keeps the rest | Default | The plan's rule; the wheels and line are the move itself |
| Late tabs skip cues more than 0.2 s past | Default | The plan's rule; no bell for a haul you joined halfway |
| The new props have no colliders | Default | Finding 1 |

**Findings.**

1. *What looks solid is solid* (2 November) covers track, trains and the track layer. The lamp posts, bell post and
   winch would be walk-through props on a deck a player stands on; the jib mast and rack are already drawn only. They
   are kept small (at most 0.3 m) and at the platform's edges and corners, away from the rack and the jib's working
   spot. Making them car shapes is a physics change for a later step if a playtest shows a player walking through one.
2. Co-op: every tab derives the same phase from the row, so a friend sees the same bell at the same moment, and the
   solo player gets the same telegraph. A friend arriving mid-haul sees it moving with no bell (the skip rule).
3. First meeting: the first haul is the first pair at the ring; the told second plus the line run out to the bollard
   says where it is going before it goes.

No owner questions; no new strings.

## Step 2 implementation notes (14 November)

The namespace bump is a separate commit, as the owner requested. The row, accepted stamp, load invariants and
settled jump-ins are implemented; no view or adapter behavior was changed. The focused sim/replay/host run passes
40 tests, including both mirrors, prediction correction, 15/150-tick delivery delays and a verified checkpoint with
a noninitial replan origin. Checkpoint A remains the orchestrator's work; the worker does not run `test:net` or ship.

The deliberate hash inputs are `Aperture.moved` and `Aperture.from` (including their defaults in every world).
Schema, seed, tick-order, op-stream and client-read trace goldens were regenerated for v46. Every recorded tick's
system sequence and every scripted op's label/result are unchanged. Settling moves `gap-footed`, `leaf-raised` and
`ring-joined` by 127 rule ticks; later steel/Gorge seeds inherit the different fleet phase. The halt fixture changes
only request/calling state and its lever pose/target, not catalog, colliders or plaque copy.

The original train pacing workloads now use `test/helpers/railway-rivet-sequence.ts`: the same accepted actions,
including a rivet during the haul (still legal), independent of settled dev jump-ins. Their existing time limits
remain unchanged. The load-check corruption fixtures subtract rails from the seed's actual forge rack, and the
host-read literals reflect that the settled `ring-joined` seed has not loaded its steel kit yet. The 180 affected
regression tests pass with those explicit inputs. These are simulated rule ticks, not performance measurements.

The server hold-cap tests use that same explicit sequence. The frozen host trace retains all 8,596 ordered records:
only its 205 checkpoints' namespace, added Aperture columns, hashes/checksums and 5,667 snapshot-byte samples change.
All inputs, messages and replica packets are identical. The 18 steel-host/trace regressions pass; the full local
check passes (2,142 tests plus one existing TODO), as does the rebased ship-check (1,478 plus that TODO). The loop
run passes for 1–4 players. Browser runs remain separate evidence; no timing or device claim follows from these checks.

## Level findings

Nothing is placed or moved: the platform, rack, jib and lever rest where `RING_HEAD[k]` already puts them, and no gate
changes. `npm run level-check` on this base: track continuity ok, 13 existing reports, none at the railhead. The one
reach question is temporal: during a haul the server judges rack and jib reach at the new head while the deck is still
on its way, exactly as today; prompts stay hidden until settled.

## Risks

- **Room safety.** No effect in `apply` (it writes two integers); no wall clock or per-peer counter (the stamp is the
  rule tick); cues follow the row, and the setter's predicted cue does not replay on confirmation because cues latch
  on phase time, not on receipts. No presence field is added (`riding` is the existing one).
- **Mixed builds.** Dev phase: no compatibility code. The row shape breaks saves and the wire: v46 with a dated line.
  Step 2 must not ship mid-session.
- **Hotspots.** `railhead-view.ts` (1,005 lines; PR 1797 and the lever branch touched it), `halts-view.ts`,
  `railway-components.ts` and `namespace.ts`. The great tree and rack moves will stack on step 2's branch and share
  v46; the rotunda and running-side changes already shipped on v45.
- **The lint ratchet.** A kinematic body cannot come through the prefab door yet ("moving colliders await their
  conversion") and a new `makeCar` importer is refused (measured: `6 > 5` when `railhead-view.ts` or `view.ts`
  receives the kit). Building the car in `line2-view.ts` passes with no ratchet change (measured); handing the
  finished `Car` down is not yet measured, so step 3 checks it first and stops for the owner if it fails.
- **Seeds mid-haul.** Without `settleHaul` a seeded room opens with a 140 m haul running; step 2 adds it.
- **Performance.** One kinematic body replaces one static; the apparatus adds boxes to the existing `live` batch.
  Report `npm run perf`; it is not a reason to cut.

## Open questions

1. **Reset: resolved by the owner, 14 November.** Step 2 starts v46 in its own namespace commit; the great tree and
   rack moves stack later. v45 shipped in #1827. No push or ship from the step 2 worker; Checkpoint A belongs to the
   orchestrator, including `test:net` outside the sandbox.
2. **Build the deck in `line2-view.ts` (no ratchet change), or approve one more `makeCar` importer so the railhead
   view owns it?** Recommended: `line2-view.ts`; the ratchet stays untouched.
3. **The haul's timing: 6 s after the footing, 1 s told, about 4.8 s at 5 m/s, 0.9 s to chock (about 12.7 s with the
   rack and jib prompts away, against a measured bent every 16 s)?** Recommended: keep these; they are constants in
   one sim file and can be retuned later without another bump.
