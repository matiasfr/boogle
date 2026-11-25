> **Status, 25 November 2026: step 1 re-planned for way 1, nothing built.** The first step 1 build stopped before any
> edit (19 November): the planks at r − 31.3 to r − 28.9 lay on the stack crossover's toe, blades and points lever that
> turnouts step 7 drew at every head. The owner took way 1
> ([25 November, item 4](../decisions-rail.md#d-2026-11-25-recommendations-taken-rail)): planks 1.6 m wide at r − 28.5
> to r − 26.9, both ramps running into the decks' first 2 m. Step 1, the geometry table, findings 1, 3 and 4 and the
> [way 1 design review](#design-review-2026-11-25-way-1) are revised on main `bf315bacf` (world v72); steps 2 to 4 stand
> with the numbers noted there. **World version:** the owner approved this row's reset on 18 November ("All three
> heads, with the v62 reset"); main has moved on since, so step 2 takes the next free `WORLD_NS` when it ships.
> First planned 18 November against main `51d17145c` (world v60; measured at `ad7405c34`, docs-only changes since). Source: the P3
> backlog row "Small fixes found in the coach work", item (1), the only one left; [rider-coach](rider-coach.md),
> Level finding 12, and its [R2b.1 report](../reports/rider-coach-r2b1.md) for the shape of the work. Authority:
> [trains stop on request; one lever per platform side](../decisions-rail.md#d-2026-11-10-trains-stop-on-request-at-the),
> [the last sea platform a request stop](../decisions-rail.md#d-2026-11-12-greybox-waits-and-build-2-answered),
> [running side](running-side.md) ("the lever you pull is on your train's platform"), and
> [right over less work](../agents/owner-calls.md#right-over-less-work).

# Stack west platforms: a homeward deck at Stack halt and the served heads

## Goal

A homeward train that stops at a stack head stands beside a deck you can step onto, and the lever that called it stands
on that deck. Today a homeward request stop at Stack halt (line 2's stop 8), and at heads 1 and 2 while they are served,
stands its players' car **4.70 m** across the outward track from the only deck (the coach **5.00 m**). Serves
**7. Telegraph everything** and **11. Show, don't tell**: the side a train stops on and the deck its lever stands on say
which way it goes, as at the Quarry, Far Head, the Pier and Ring Island. It bends no principle.

**Research:** [level-design](../research/level-design.md) (walk-seconds; something to notice every few seconds),
[route-contract](../research/route-contract.md) (movement may skip a walk, never supply a route),
[progression-flow-layout](../research/progression-flow-layout.md#the-rules-as-lenses) (the three firm rules). Used as
lenses below; nothing departed from. **Port from Place:** nothing ported. **Rail route:** no bill, supply or cue moves;
the loop graph has no stack nodes yet (`test/loop-graph.test.ts`), so `npm run loop` does not cover the leg.
**In flight** (`npm run inflight`, 18 November): `ship/matias-franco-74cf469` (separate capacities) touches
`dev/look/bots/railway.ts` and `src/sim/railway-seed-route.ts`, neither of which this plan edits; no branch touches
`leg-view.ts`, `halts-view.ts`, `railway-lines.ts` or `dev/prefab/halts.ts`.

**A correction to the brief.** R2b built no west platform: R2b.1 moved the Pier's west *foot crossing* and lengthened its
start ramp (the Pier's west deck and its catalog point `PIER_WEST` came with running-side step 5, v45), and R2b.2 moved
High Gorge's crossover (the Gorge has no west platform). The shape of that work is copied (measured rows with minima and
pins, fixed-camera stills, a production walk, the fixture delta reviewed). The geometry precedent is closer to home:
**Ring Island's foot crossing** ([ring-island-crossing](ring-island-crossing.md): planks over both tracks at the
platforms' home end, a landing and a ramp each side) and **the Joint's west platform** on the same line 2 deck family
(lat −9.6..−5.8, 25 m, catalog point `RING_JOINT_UP` at its middle, lever 9.5 m toward home of the middle at lat −6.3).

## What "served" is, measured from the sim

Line 2's stops 6, 7 and 8 are `Stack head 1..3` (`src/sim/railway-lines.ts` `STACK_HALTS`); each is a **fixed** catalog
halt 10 m short of its section's end `R` (1700.1, 2210.2, 2720.3 m). What moves is which head is the line's end. With
`laid` sections laid, line 2 has `6 + laid` open stops, so head *k*:

| Head | The line's end (stub, both ways on the east deck) | Middle request stop, both ways: homeward on track 1, lat −4 | Closed behind (`closesAt`; passes both ways) |
| --- | --- | --- | --- |
| 1 (stop 6, s 1690.1) | `laid` 1 | `laid` 2 only | `laid` ≥ 3 (`closesAt` 9) |
| 2 (stop 7, s 2200.2) | `laid` 2 | `laid` 3 only | `laid` ≥ 4 (`closesAt` 10) |
| 3, Stack halt (stop 8, s 2710.3) | `laid` 3 | `laid` ≥ 4: to the end of the game | never |

A "served" head, in this plan, is one in the middle column: `trainPassesBy` lets homeward trains stop, and they stand on
the offset track (reproduced: `dev/level/rider-coach-stop.ts` at `gorge-reached`, accepted `rail.call` at stop 8, train
standing on track 1 at lateral −4, gap 5.00 m to the coach). While a head is the end, both ways board on the east deck
(`haltPlatform`'s `end`), and after the lay that makes it a middle stop the retained departure still leaves from the
east (`railPlatformEnd`, `railCallReady`).

**Fixed, moving or not built.** There is no moving head halt to ride with: each head is its own fixed halt.
- **Fixed per head, standing while the head is served (recommended).** The west deck, its crossing and its lever stand
  at head *k* from the lay that makes it a middle stop (`laid` = *k* + 1) and go with the east deck when it closes
  (heads 1 and 2 at *k* + 2; Stack halt stays). The view already draws each head's east deck by `laid`; the west side
  follows the same predicate plus "not the end". Size: S (view) + S (catalog, bump) + S (levers).
- **Moves with the head:** not a thing the rules have; it would mean a moving halt (`heads`, as the Ring Railhead) and
  a lockstep rule change. Size M–L, bump. Not right: the heads are deliberately separate halts (call 88).
- **Not built at heads 1 and 2 (the smallest version).** Stack halt alone; heads 1 and 2 keep the 4.70 m gap for their
  one stage each. Size: the same three steps, one head's rows instead of three (the code is the same loop).

**How often each is used.** Stack halt is served homeward from the Gorge's opening to the end; nothing else stands at it
(no frame, rack or buffer once the Gorge opens), so it is used by a player who rode to it or got off there. Heads 1 and 2
are served homeward for one section each: 760 to 840 ticks fed (76 to 84 s) in the rules test's runs
([greybox-route](greybox-route.md), call 88's measurement), longer for people. **But that stage starts with the whole
party standing on it:** section *k* + 1's frame and rack stand at head *k* (`legFrame`: `R[k−1] − 8`, lat +4.8), so the
lay that makes head *k* a middle stop happens with everyone on its east deck. The choice there is "ride on to the new
head" (the objective's line) or "go home" (end of a session, a friend leaving). The second is the 4.70 m gap, at the
moment the most people are there. On merit, all three: same moment, same fix, one data-driven loop. Size as fact: the
two extra heads add two sets of level rows, two lever placements and nothing else. Smallest version if the owner wants
it: Stack halt alone, the same steps with heads 1 and 2 filtered out (open question 1).

## Design

| Piece | Sync kind | Authority and API |
| --- | --- | --- |
| West deck, its sea ramp, the foot crossing (planks, slab, landings, two ramps), per served head | Local static scenery | `src/entities/route-greybox/leg-view.ts` `pieces(laid)` → `standing` boxes and their static colliders (the east deck's mechanism); numbers once in a new pure module `src/entities/route-greybox/stack-halts.ts` |
| Each stack head's homeward platform point (`RailHalt.platforms[1]`) | Server data (sim catalog) | `src/sim/railway-lines.ts` `STACK_HALTS`; read only by `railCallPlatform` → `rail.call` validation (`src/world/railway-server.ts`), the lever prompt's reach (`leverAskTaken`), and the coach's step side (`train-view.ts`). `platforms[0]` (east/outward, the centreline point) unchanged |
| The west homeward lever; the east homeward lever only while the head is the end | Local view of accepted state | `src/entities/railway/halts-view.ts` `ringSpot`s; placements `halt-ring-lever-<stop>-west` from `dev/prefab/halts.ts` |
| Which way a train stands, when it stops, who may ask | Server (rule), unchanged | `trainPassesBy`, `closesAt`, `haltPlatform`, `railPlatformEnd`, `railCallReady` |

No new op, component, field, projection, prediction, registration or rule; no save key; no wire shape. The sim learns
only a second platform point per stack head, which is what `RailHalt.platforms` already means ("[+s, −s]: original side,
offset side") and what every other two-sided halt has (`QUARRY_UP`, `FAR_HEAD_UP`, `PIER_WEST`, `RING_JOINT_UP`, Ring
Island's). Rule ticks and saves stay the server's; nothing here is predicted. Controls: none new (the lever is the
existing `railway.request-stop` interaction; no action id, pad slot, key or guide row).

**Why the catalog point moves, not only the view.** `train-view.ts` folds the coach's steps toward
`railCallPlatform(...)`; for the stack heads that is the centreline point at the stop, so a homeward train standing at a
new west deck would drop its steps on the outward-track side (measured: step side −1, east, at all three heads), and the
server would keep judging a west lever's ask from the track centreline at the stop (the lever spot below is 13.6 m
from that point, past the 12.6 m reach: no prompt). Moving `platforms[1]` to the west deck's middle fixes both with no view special case, as the
Pier, the Joint and Ring Island already do. It is a catalog entry change: **`WORLD_NS` v60 → v61**, in its own commit
([mixed-builds](../agents/mixed-builds.md); precedent: v45's `PIER_WEST` and reach-point moves). No replay golden's
stage hash moves (platform points are not state); the server host trace's checkpoint namespaces and checksums do.

### The geometry (line 2 metres: `s` along, `lat` + east; `r` = the head's section end)

Everything mirrors the east deck about the formation's middle (lat −2) except the crossing, which joins them. **Way 1
(25 November):** the crossing sits between the stack crossover's last timber and a standing train's tail, and the
ramps take the decks' first 2 m, so both decks are flat from r − 23 (the east deck's home end moves 2 m; its sea
ramp's landing moves with it).

| Piece | s | lat | Top over the rails (rail level 4.00 m) | Solid |
| --- | --- | --- | --- | --- |
| East deck, flat (today r − 25 .. r): segments from its new home end, a pile under each to the sea bed | r − 23 .. r | +1.8 .. +6.3 (centre +4.05) | +0.90 (4.90 m) | yes, whenever the east deck stands (call 13) |
| West deck, flat, the east mirrored | r − 23 .. r | −10.3 .. −5.8 (centre −8.05) | +0.90 | yes |
| Sea ramps, east and west: landing beside the flat deck, then a slip into the sea at the leg's sea-ramp pitch (0.54, 28.4°) | landing r − 23 .. r − 20; slip r − 20 .. r − 8.52 (today r − 25 .. r − 22 and r − 22 .. r − 10.52) | +6.3 .. +8.3 / −12.3 .. −10.3 | +0.90, slip down to 1.3 m under the sea | yes |
| Planks over both tracks, 1.6 m, five spans with a flangeway (0.08 m clear) by each rail | r − 28.5 .. r − 26.9 | +1.8 .. −5.8 | +0.29 (the rail tops), drawn | drawn only |
| One slab under the planks | r − 28.5 .. r − 26.9 | +1.8 .. −5.8 | +0.29 | yes |
| East and west landings, with a pile each | r − 28.5 .. r − 26.9 | +1.8 .. +6.3 / −10.3 .. −5.8 | +0.29 | yes (the east one whenever the east deck stands) |
| East and west ramps, each its deck's full width, from the planks' top to the flat deck (no step at either end; #2176's lesson at the Pier and Quarry) | r − 26.9 .. r − 23 (1.9 m beyond the old deck end and its first 2 m) | as the landings | +0.29 rising to +0.90 (0.61 m over 3.9 m, 8.89°) | yes |
| West lever, plaque ×2 facing onto the deck | r − 22 (9.5 m toward home of the 25 m stretch's middle, `RING_LEVER_OFF`; 1.0 m past the ramp top) | −6.3 (0.5 m in, as Ring Island's and the Joint's west levers) | deck | prefab lever, no collider |
| Catalog west point (`platforms[1]`), unchanged by way 1 | r − 12.5 | −8.05 | +0.90, reach 12.6 m | server data |

**What way 1 sits between** (production code, all three heads alike; `.look/stack-west/crossing.ts`, scratch):

| At every head (r = 1700.1, 2210.2, 2720.3) | s | lat | Source |
| --- | --- | --- | --- |
| J12.k's down-track toe `b` (the stub's merge, the stop less 20 m) | r − 30.00 | 0 | `src/place/junctions.ts:153` (`[m − TURNOUT, m]`), `src/sim/railway-lines.ts:156` (`HEAD_MERGE_CM`), `:182` |
| Its blades, toward home of the toe | r − 32.4 .. r − 30.00 | 0 ± 0.5 | `src/place/junctions.ts:203-206`; `KIT.bladeMax` 2.4 |
| Its points lever's pivot (0.2 m behind the toe, 2.0 m to the through road's right: between the tracks) | r − 29.80 | −2.00 (fit 0.004 m) | `src/place/turnout.ts:94-95`, `:298`; `lever: 1` at `junctions.ts:171` |
| The lever's box (0.8 m along, 0.5 across) and arm (0.85 m, leaning ±0.45 rad across the track: ±0.37 m) | r − 30.20 .. r − 29.40 | −2.25 .. −1.75; arm −2.37 .. −1.63 | `src/entities/railway/turnout-blades.ts:25-27`, `:124`, `:126-137` |
| The last headblock timber (0.3 m thick), its +s face | centre r − 28.82, face r − 28.67 | −2.35 .. +1.15 | `junctions.ts:232-236` (stations 1.176 m), `turnout.ts:89-91` (headblock 1.2 m on the lever side); `leg-view.ts:553-556` draws it |
| A train standing at the stop, either way: its reserved tail (`TRAIN_EXTENT.behindCm` 1610) | r − 26.10 | both tracks | `src/sim/railway-lines.ts:126`, the stop at r − 10 (`HEAD_BACK_CM`, `railway-route.ts:142`) |
| A train held at the head's block signal (s = r) | tail r − 16.10 | | `railway-lines.ts:557-559` |
| The rack and its plate while the head is the railhead (pallet 2.6 m along; plate 1.6 m toward home of it) | r − 19.3 .. r − 16.7, plate about r − 19.6 | +4.8 | `src/sim/railway-route.ts:516-519`, `leg-view.ts:1052-1054`, `:1095` |
| The frame (2.6 m along) | r − 9.3 .. r − 6.7 | +4.8 | `railway-route.ts:510-513`, `leg-view.ts:1056-1061` |
| The east levers (homeward at the stop, outward 4 m on), lat 2.45 | r − 10, r − 6 | +2.45 | `src/entities/railway/halts-view.ts:507-532` |

So the planks' home edge clears the last timber by **0.17 m**, the lever's box by **0.90 m** and its arm by **1.26 m**,
the blades by 1.50 m; their far edge stops **0.80 m** short of a standing train's tail (minimum 0.60, the Pier's) and
10.80 m short of a signal-held train's. The ramp top at r − 23 is 3.7 m short of the rack's pallet and 13 m short of
the homeward lever.

World positions (x, z, `line2World`): planks' middle at head 1 (999.27, −911.94), head 2 (577.16, −1176.32), Stack halt
(231.65, −1546.08) (the first plan's, at r − 30.1, were (1001.66, −911.64), (578.94, −1174.72), (232.96, −1544.07): the
same probe reproduces them); west lever, unchanged, at (993.04, −908.42), (570.05, −1176.89), (224.94, −1548.52); east
ramp top (r − 23, lat 4.05) at (995.39, −918.55), (577.67, −1183.96), (234.16, −1553.32); west ramp top at (993.82,
−906.55), (569.63, −1174.92), (224.02, −1546.72).

Nothing else at a head moves: the east deck's outer 23 m, its board (lat 5.8, r − 13), its levers (r − 10 and r − 6),
the frame and rack (east, only while the head is the railhead), the crossover, the block signal (between the tracks,
r + 3), the buffers and end board (only at the end). Copy: none. The west lever's plaque names its destination with
the existing lever label code (`targetsFor`); no new string.

## Steps

Each leaves `node dev/ship-check.ts origin/main HEAD` green. Builders and reviewers by `npm run models`; the tier is what
`npm run review-stamp` prints for the step's files. Order: view first, then the catalog and its bump (alone), then the
levers, which need the moved point to offer a prompt.

- [ ] **1. The west decks and the foot crossing, way 1 (S; re-planned 25 November).** Sync: Local. Tier: normal +
  visual (no file under `src/sim|net|world|ecs`, `server/src`). Build: by `npm run models` (Astra, player-visible).
  **Bump: no.** Read first: the geometry table above and "what way 1 sits between" (every number below is in metres
  short of the head's section end `r`).
  - New `src/entities/route-greybox/stack-halts.ts` (pure numbers, no three.js): `STACK_EAST = { len: 25, lat: 4.05, w:
    4.5, up: 0.9 }` (the stack spec's `plat`, `leg-view.ts:286`, moved here and read from there), `STACK_WEST = {
    ...STACK_EAST, lat: -8.05 }`, `STACK_CROSSING = { from: 28.5, to: 26.9, top: 0.29, rampTop: 23 }` (planks r − 28.5
    .. r − 26.9 across lat +1.8 .. −5.8; ramps r − 26.9 .. r − 23; each deck flat from r − 23; the sea ramps' landings
    r − 23 .. r − 20), `STACK_WEST_LEVER = { back: 22, lat: -6.3 }`, and `westStands(j, laid)` = the east deck's
    existing predicate (`laid ≥ j` and not closed behind, read from `RAIL_LINES[LINE2].halts[railheadHalt + j −
    1].closesAt`, as `leg-view.ts:690-691`) **and** `laid > j`. A header comment cites this plan and says why the
    planks sit where they do (between J12's last headblock timber and a standing train's tail). Register the module if
    `npm run registry` asks.
  - `leg-view.ts` `pieces(laid, through)` (`:653-727`), the stack's heads only (give the stack spec a `crossing:
    STACK_CROSSING` field, so the row legs' and the Wall's heads are untouched):
    - **East, whenever its deck stands** (call 13): the flat deck from r − 23 (a 3 m segment r − 23 .. r − 20, then
      the 5 m segments as today, a pile under each); the east ramp (`box(r − 26.9, r − 23, 4.05, 0.29, 0.90, 4.5, …)`:
      `box` already pitches a ramp); the east landing r − 28.5 .. r − 26.9 at +0.29 with a pile; the sea ramp's landing
      r − 23 .. r − 20 and its slip from r − 20 (`:715-720`: the `r − plat.len` offsets become `r − rampTop`).
    - **West, while `westStands`:** the mirror of all of that at `STACK_WEST.lat` (deck, piles, ramp, landing, sea ramp
      at lat −(8.05 + 2.25 + 1)), and the planks' slab r − 28.5 .. r − 26.9, lat +1.8 .. −5.8, top +0.29.
    - All of it in `standing`, so it becomes colliders exactly as the east deck's do (`stand`, `:729`: a collider
      waits for a player to step out; nothing moves anyone). The five plank spans drawn in `things` only (flangeways
      by the rails at lat ±0.5 and −4 ± 0.5), in the file's timber tone (`LOG`) over the slab in `BED`; decks,
      landings and ramps in the east deck's `GREY_LIGHT`/`GREY`. The header comment's "the heads" line (`:16`) gains
      the ramp, the west deck and the crossing.
  - New level report `dev/level/stack-halts.ts`, run from `dev/level/check.ts` beside `checkRing`/`checkRiderCoach`
    (rows with design minima and ±0.01 m pins, as the R2b rows), each **read from production code**
    (`seaCrossovers()`/`crossoverPlan()`, `turnout()`, `TRAIN_EXTENT`, the catalog's stops and signals, the view's own
    `pieces()` boxes), at each head k = 1, 2, 3:
    1. _Crossover timber:_ the planks' home edge past J12.k's last timber's +s face (`max(t.s) + 0.15`): minimum 0.10,
       pin 0.17.
    2. _Crossover lever:_ the planks' home edge past the lever box's +s face (pivot s + 0.4): minimum 0.50, pin 0.90;
       past its arm (pivot s + 0.04): pin 1.26; the box's and the leaned arm's footprints (lat −2.37 .. −1.63) inside
       no plank, landing or ramp box (0 overlaps). Past the blades' toe (r − 30): pin 1.50.
    3. _Standing train:_ the planks' far edge short of the reserved tail of a train standing at the stop, either way
       (`stop − TRAIN_EXTENT.behindCm`): minimum 0.60 (the Pier's), pin 0.80; of a train held at the head's block
       signal (s = r): minimum 0.60, pin 10.80. The one retained departure after a lay: its lateral over the planks
       within 0.05 m of its own track (`line2Lat`; it has merged at r − 30).
    4. _Planks:_ 1.60 m along; over no rail (0.08 m flangeway clear by each rail); planks and both landings at the rail
       tops (+0.29, pin 0).
    5. _Ramps, both:_ r − 26.9 .. r − 23, ≤ 15° and walkable at `WALKABLE_NY` (pin 8.89°); the step at the foot
       (landing to ramp) and at the top (ramp to flat deck) 0, pins 0.
    6. _Decks:_ both flat from r − 23 (pin 23.00); the rack's pallet and plate, the frame, the board stand and both
       east levers on the flat deck, at least 0.5 m past the ramp top (expected: plate about 3.4, pallet 3.7, homeward
       lever 13.0).
    7. _Sea ramps, both:_ landing r − 23 .. r − 20 level with the deck beside it (step 0); the slip walkable (28.37°);
       each touches its crossing ramp only at the corner (r − 23, lat +6.3 / −10.3).
    8. _West lever:_ on the flat deck, 1.00 m past the ramp top (minimum 0.50) and 0.5 m in from its inner edge. Its
       reach from the moved catalog point is step 2's row (9.66 to 9.87 m of 12.6, the prompt's 1.8 m inside).
    9. _Overlaps:_ no standing piece of the head overlaps another (decks, landings, ramps, sea ramps, the board stand)
       or the crossover's timbers, and the formation slab only by the decks' 0.5 m lip (as the east today).
    10. _When:_ `westStands` false while the head is the end and once closed behind, true between, at every `laid`
        0..4; the east ramp and landing stand exactly when the east deck does.
  - `dev/level/rider-coach.ts`: delete `knownGaps` (`:96-100`) and its report field; add rows `Stack head k homeward`
    with `curvedMargin(d, r − 23, r, STACK_WEST.lat, 5)` and `sideAt(s + offset, STACK_WEST.lat, STACK_WEST.w / 2, −4)`
    (the Joint row's form, `:175-180`); the stack heads' east rows (outward, `:204-214`, and terminal homeward,
    `:166-173`) measure from r − 23 (`s − 13`, read from `STACK_CROSSING`), High Gorge's unchanged. Expected: players'
    car lateral **0.70**, coach **1.00**; players' car on the deck s r − 11.6 .. r − 8.4 (11.4 m past its home end, was
    13.4), coach r − 14.9 .. r − 12.0 (8.1 m, was 10.1). Restate the coverage line (`:255`: no retained gaps).
  - `dev/level/rider-coach-stop.ts`: measure against `STACK_WEST` (gap 1.00 m for the coach) and say the finding is
    closed; or delete it with the rows above standing in for it (builder's call; say which).
  - `docs/game-design/place.md`: the stack line's paragraph ("At each railhead stand ...") gains the ramp at each
    deck's home end and, once a head is passed, the west deck and the planks; the rider-coach paragraph's "one-sided
    Stack heads remain a separate pre-existing level gap" sentence is replaced by what is built.
  - **Verify:** `npm run typecheck`, `npm run lint -- <files>`, `npm run level-check` (exit 0 with the new rows),
    `node dev/ship-check.ts origin/main HEAD`. **Stills, each opened:** (a) the plan's approach camera, `npm run look
    -- --rail-seed gorge-reached --cam 241.7,6.6,-1538.0 --look 220.3,5.0,-1559.8 --name stack-west-approach`; (b) the
    crossing from the east ramp's top, eye 1.7 m over the deck, looking across the planks at the west ramp with the
    crossover's lever in frame: `--cam 234.16,<deck y + 1.7>,-1553.32 --look 224.02,<deck y>,-1546.72 --name
    stack-west-crossing` (read the deck's y from `line2Y`); (c) top-down over r − 35 .. r at Stack halt, `--name
    stack-west-top`, the timbers, the lever box and the planks' 0.17 m gap readable. Say what each shows and what was
    not seen (no train stands in these seeds' stills).
- [ ] **2. The heads' homeward platform point, the next free `WORLD_NS` (S). Its own commit.** Sync: Server data
  (catalog). Tier: **independent review** (`src/sim`, `src/world`). Build: by `npm run models`. **Bump: the next free
  number when it ships** (main is v72 on 25 November and moves often; the owner approved this row's reset on 18
  November, then numbered v62; v61 below means that number): "the stack heads' homeward platform is their west deck:
  `RailHalt.platforms[1]` at each head's west deck middle; no state, op or save shape change; rooms start fresh".
  Way 1 changes nothing in this step: the point stays at r − 12.5, lat −8.05 (on the flat deck, 10.5 m past its home
  end), and the lever spot (r − 22) is where it was.
  - `src/sim/railway-route.ts`: `rowSide` is exported already (`:456`); `HALT_REACH` (`:120`, 1260) is not, so use 1260
    with a comment or export it.
  - `src/sim/railway-lines.ts` `STACK_HALTS`: `platforms: [STACK_HEAD_PLATFORMS[k], STACK_HEAD_WEST[k]]` where
    `STACK_HEAD_WEST = STACK_HEADS.map((at) => rowSide('ring', at + ROW_SHIFT.ring − 250, −805, 90, HALT_REACH))`
    (the deck's middle is the stop less 2.5 m: r − 12.5; lat −8.05; 0.90 m over the rails; reach 12.6 m; `HALT_REACH`
    or 1260 with a comment). Comment cites this plan. High Gorge unchanged.
  - `src/world/namespace.ts`: v61 with its dated history line.
  - `npm run prefabs` and `npm run prefabs -- --check`: the halt kit's source fingerprint includes `RAIL_HALTS`.
  - Re-pin under the bump, each with its own writer, and say in the commit what moved: the server host trace
    (`HOST_TRACE_RECORD=1`, a v61 line in its header comment: expect only the 205 checkpoint namespaces and checksums
    and snapBytes samples, as v48); `test/fixtures/railway-golden.json` only if its writer rewrites `worldNs` (`GOLDEN=1`
    must leave every stage hash unchanged: the catalog is not state; a moved hash is a defect, stop); the halt prefab
    fixture's `catalogs` field (`test/fixtures/prefab-halts.json`, `GOLDEN=1 node --test test/prefab-halts.test.ts`;
    only `RAIL_HALTS[*].platforms[1]` of stops 6–8 may change).
  - Tests (lockstep validation; the test diet allows these, extending existing tests, none new):
    `test/helpers/railway-route-rules.ts` "Each head's lever is judged at its own platform": for each head, a homeward
    ask from the planned west lever spot (r − 22, lat −6.3, deck height) is valid while the head is a middle stop; the
    same spot's ask is refused for another head; while the head is the end, the homeward ask is judged from
    `platforms[0]` (the east), unchanged. The existing head 1 / head 2 assertions keep passing (they read
    `platforms[1]`).
  - `dev/level/stack-halts.ts`: each head's catalog west point within 0.25 m of the view's west deck centre line at the
    deck's middle (measured 0.125 / 0.005 / 0.044 m), at the deck's height, and the planned lever spot inside its reach
    with the prompt's 1.8 m inside it (measured 9.66 to 9.87 m of 12.6).
  - **Verify:** typecheck, lint, the touched tests, `npm run level-check`, `node dev/ship-check.ts origin/main HEAD`,
    `node --test server/test/world-host-trace.test.ts` after re-recording; the full server suite is not required
    (`server/src` unchanged) but the bump is a checkpoint trigger (step 4). Visible effect alone: a homeward coach's steps
    fold down on the west, onto the step 1 deck.
- [ ] **3. The west lever; the east homeward lever only while the head is the end (S).** Sync: Local. Tier: normal +
  visual; the prefab fixture delta is read by an independent reviewer before ship (R2b.1's precedent). Build: Codex
  gpt-6.2-astra medium. **Bump: no** (rides v61).
  - `dev/prefab/halts.ts`: for each stack head (a `leg` stub halt), a third placement `halt-ring-lever-<stop>-west`,
    `side: −1`, `plaque: 2`, `ring: true`; `npm run prefabs` and `npm run prefabs -- --check`.
  - `src/entities/railway/halts-view.ts`, the stack heads' loop (`:507-532` on `bf315bacf`; `ringSpot` at `:418`
    already takes `west`): `ringSpot` takes an optional placement key
    (the id is today built from `up`, `:431`); the east homeward lever's `need` becomes `!shut() && platformEnd(LINE2, stop)`
    (it calls the train home only while the head is the end or its retained departure stands); add the west lever:
    `ringSpot(stop, true, STACK_WEST_LEVER.lat, () => (h.s − RING_S_HEAD) / 100 − 2.5 − RING_LEVER_OFF, () => !shut()
    && !platformEnd(LINE2, stop) && stopsNow[LINE2].length > stop + 1, HOME, true)` with key `west`. Update the loop's
    comment (one homeward lever on the deck its train stops at; the outward lever stays on the east deck).
  - `test/prefab-halts.test.ts` fixtures (`GOLDEN=1`): `levers.length` + 3 (59 → 62 on `bf315bacf`, `:330`); the new placements and the stack
    snapshots (`gorge-mid`, `stack-3`, `gorge-reached`) change only the stack heads' lever rows; `prefab-halt-requests.json`
    gains the west levers' accepted calls. Write the delta's summary in the commit (as R2b.1's 79 values).
  - `dev/look/evals/stack-levers.ts`: frame each lever on its own deck (`lever=home` now stands on the west deck); its
    header comment follows.
  - **Verify:** typecheck, lint, `test/prefab-halts.test.ts` (`test/halt-lever-place.test.ts` skips ring levers), `npm run level-check`,
    `node dev/ship-check.ts origin/main HEAD`. **Look:** `npm run look -- --rail-seed gorge-reached --eval
    dev/look/evals/stack-levers.ts --query 'head=3&lever=home' --until window.__leverDone --name stack-west-lever` (the
    west lever's prompt up on the west deck), opened.
- [ ] **4. Checkpoint (the bump's): proofs and the row (S).** Runner: the builder's thread (`npm run models`, "Owed
  proofs"). Tier: none beyond the steps'.
  - `npm run check:full` (the bump; `src/world/namespace.ts`), `npm run test:net`, `npm run level-check`,
    `npm run checkpoints -- gorge-mid gorge-reached` (host save path at both served stages).
  - **The one proof look:** a homeward call at Stack halt in the running game at `gorge-reached`: the production bot
    walks from the east deck's outward door spot down the east ramp (r − 23 to r − 26.9), across the planks (along
    their middle, r − 27.7, 2.1 m on from the crossover's points lever), up the west ramp to the west lever (`bot.walk`
    along the plan's waypoints, as R2b.1's walk), presses it (real Interact), waits for a homeward
    train to stand at stop 8 on track 1, and boards it by `railway-ride.ts`'s real jump. Stills, opened: (a) from the
    west deck beside the players' car's door (eye 1.7 m over the deck, looking along the car), the door and deck edge
    in frame, the gap **0.70 m measured** by the level row and seen; (b) the coach's steps folded onto the west deck;
    (c) top-down over s r − 35..r at Stack halt with the train standing. A real-time clip of the walk and the boarding
    (`--video`; the clip's playback is the orchestrator's to watch). The same walk at `gorge-mid` (head 1) only as a
    still of the deck standing, since its code path is the same.
  - The leg bot (`npm run look` segment `gorge-mid` → `railway-legs-bot.ts`) once: it rides outward from heads with
    `dir === 1` levers, which this plan leaves on the east deck; a pass proves nothing it relies on moved.
  - Backlog row (orchestrator's bookkeeping ship, not this branch); this plan's status line and checkboxes.

## Level findings

Measured on main `ad7405c34` (v60) with production code: `line2World`/`line2Y`, `coachTrain` (`dev/level/rider-coach.ts`,
the real coach consist, chord and buffer placement), `TRAIN_EXTENT`, the catalog's stops and signals, `MOVER`, `H`.
Probes are scratch, uncommitted: `.look/stack-west/probe.ts`, `planned.ts`, `catalog.ts` (run with
`node --import ./dev/sim/hooks.ts <file>`); `npm run level-check` on main: exit 0, the three Stack homeward gaps listed as
known (`rider-coach` `knownGaps`). The planned rows are step 1's and step 2's level report; the numbers below are what
they should pin. **Way 1 (25 November)** re-measured the crossing against the stack crossover on main `bf315bacf`
(`.look/stack-west/crossing.ts` and `pos.ts`, scratch); where a finding below changed, it says so.

1. **Reach on foot.** From the east deck (where outward trains and the lay put players) to the west lever: east deck to
   its home end, down the east ramp, over the planks, up the west ramp: **42.1 m, 7.5 s** at 5.6 m/s on the first plan; way 1 moves the
   crossing 2.4 m on and the ramps' tops 2 m on, so each deck's leg along s is 2 m shorter: **about 38.1 m, 6.8 s**
   (arithmetic on the first measurement; step 4's walk measures it). Lever to the players' car's home end 10.4 m
   (1.9 s), unchanged. The ramps rise 0.61 m over 3.9 m, **8.89°** (≤ 15°, walkable; the Pier's
   9.4 m ramp is 4.1°, Ring Island's 9.6°), and start at the planks' top: no step. The shortcut: drop 0.90 m into the
   bed, cross 7.6 m, jump the 0.90 m kerb (jump height 1.60 m): about 3 s. It skips a walk, never work (no gate here):
   allowed by the route contract. From the sea: the west deck's own sea ramp (28.4°, the leg's sea-ramp pitch; walkable
   at `WALKABLE_NY` 0.55, cos 28.4° = 0.88), as the east's.
2. **The train beside the deck.** Homeward at the stop, every car on track 1 at lat −4.00 (±0.002): lateral gap to the
   west deck **0.70 m** (players' car, kit, wagon, steel), **1.00 m** (coach), 0.79–0.80 m (engine): the east deck's
   outward 0.70 m and Ring Island's west 0.70 m. Players' car on the deck s r − 11.6..r − 8.4, coach r − 14.9..r − 12.0;
   the steel car's rear hangs 1.03 m past the old deck end (r − 26.03), so with way 1 the steel car's last 3.03 m stand
   beside the ramp, 0.7 m off it, 0.87 m short of the planks (freight, as the east); both passenger cars stand beside
   the flat deck, the coach's rear 8.1 m past its home end.
3. **What stands in the way.**
   - *Terrain:* none. Open sea under every footprint (Place terrain −6 m at all samples s r − 32..r + 1, lat −13..+7;
     the leg view's sea bed −8 m). No land or prefab level within 99 m (the bay-trestle row's nearest vertex to head 1;
     Bell Rock, West landing and the Gorge > 500 m).
   - *The stack line's own structures:* the formation slab (lat −6.3..+2.3) under the deck's 0.5 m lip, as the east;
     bent posts at lat −5.4 and +1.4 and their caps are under the slab (visual only, no collider); the block signal post
     between the tracks at r + 3 (33 m from the planks); the board stand on the east deck (lat 5.8, r − 13); the frame
     and rack on the east deck only while the head is the railhead, when no west piece stands; the buffers and end
     board only at the end. The east and west sea-ramp landings (moved to r − 23 .. r − 20) touch the crossing ramps only
     at a corner (r − 23, lat +6.3 / −10.3); nothing overlaps. The rack's pallet starts 3.7 m past the ramp top
     (r − 19.3), its plate about 3.4 m.
   - *The stack crossover (J12.k, turnouts step 7; way 1's reason):* toe `b` at r − 30.00 on the down track, its blades
     home of it, its points lever between the tracks at r − 29.80, lat −2.00 (box to r − 29.40, arm ±0.37 m across),
     its last headblock timber to r − 28.67. The planks' home edge clears them by 0.17 m (timber), 0.90 m (lever box),
     1.26 m (arm), 1.50 m (blades); the same at all three heads (the merge is the stop less 20 m at each). The first
     plan's planks (r − 31.3 .. r − 28.9) lay over all of it.
   - *The outward track's clearance envelope:* nothing new stands beside the outward track except the planks, flush
     with the rail tops with flangeways (as every plank crossing). The west deck, landings and ramps stand outside the
     homeward track's cars (0.70 m), lower than or level with every other deck.
   - *Trains on the planks:* a train standing at the stop, either way, ends **0.80 m** short of the planks (its 16.10 m
     reserved tail at r − 26.10; the extent is fixed in s, the engine at +s both ways; was 2.80 m); one held at the
     head's signal (s = r) ends 10.80 m short (was 12.80). Pier minimum 0.60. Nothing stands on them but a train passing. The one retained departure after a
     lay leaves the old end over its stub turnout, which starts at r − 30: its lateral at the planks is under 0.05 m
     (`line2Lat`'s ease), so it crosses them on its own track.
4. **What a player sees first.** Today's still from 30 m out on the formation's east edge (`stack-west-approach`,
   opened): the line runs straight to the Gorge's stacks on the horizon; the east deck is the only shape beside the
   track, with its piles and sea ramp, two lever posts and the board; open water on the left. After the change: the
   planks across both tracks are the first new thing, about 13 m ahead of that camera (way 1: 2.4 m further on; was about 10.6), just
   past the crossover's points lever, with both ramps rising from them; then the west deck mirrors the east across the
   tracks, its lever at its near (home) end, 1 m on from the ramp top (way 1; was 3 m). From
   the east deck after alighting, the west lever stands across the tracks, plaque away (it faces its own deck, as Ring
   Island's); the planks lie behind you toward home. From the homeward players' car, the west deck's edge is 0.70 m
   off the door. Top-down at Stack halt (`stack-west-top`, opened): the formation and its two tracks, the east deck with
   its two lever posts, the board stand and the sea ramp along its outer edge from the home end, the signal arm between
   the tracks just past the deck's far end, open water west of the formation for the whole length. Not seen: the
   planned geometry itself (not built), any train at the stop, the homeward car's eye view (that capture was queued
   behind other worktrees' runs and stopped), the head at `gorge-mid`.
5. **Co-op spacing.** Two to three players fit on a 23 × 4.5 m flat deck (way 1) beside a train whose two passenger cars use 6.5 m of
   it; the lever stands 10.4 m from the players' car, so one friend can call while the others wait at the door.
6. **Reached before the ability that should gate it:** nothing here is gated. The decks stand only when trains serve
   them.
7. **Pre-existing, outside this row (reported, not fixed here).** (a) The coach's step side at an *outward* stop at
   heads 1 and 3 is noise: the catalog's east point is on the centreline, within 0.03 m of the coach's own centre, so
   the sign `train-view.ts` reads is rounding: the steps fold west at heads 1 and 3 and east at head 2 (measured side
   +1, −1, +1; −1 is east, checked against Ring Island). (b) The riders' waiting crowd and
   its "Waiting" board at the line's open end are placed from that same centreline point (`riders-view.ts`), so at a
   terminal stack head they would stand on the track (read from code, not seen). Both are fixed by moving `platforms[0]`
   to the east deck's middle (lat +4.05), a catalog change that would ride the same v61; it is outside this row, so it
   is open question 2. (c) A passed head's decks vanish at the lay that closes it (heads 1 and 2, two lays on), with
   anyone standing on them falling 4.9 m into the sea: true of the east deck today; the west deck inherits it.

## Risks

- **Room safety:** no apply, accepted-effect, presence, transport or save change; `rail.call`'s validation reads one
  moved point. A west-lever ask is refused while the head is the end (the lever is not shown) and accepted at a middle
  stop; part of the east deck stays within 12.6 m of the west point (as at Ring Island), so the reach polices
  nothing new; no refusal anyone relied on. **Mixed builds:** dev phase, no compatibility code; v61 starts rooms fresh.
- **Hotspots:** `halts-view.ts` (every lever), `namespace.ts`, the host trace and prefab fixtures. The lever count and
  placement ids change in one place each; the fixture deltas are summarised in the commits and read independently.
- **Generated data:** `npm run prefabs` regenerates the halt kit; its source fingerprint includes `RAIL_HALTS`, so step 2
  alone makes the prefab check stale until regenerated (do it in step 2).
- **Push-aside:** the planks are a walked way across live track. The [one push-aside rule at halts](../decisions-rail.md#d-2026-11-16-push-aside-at-halts)
  is a next step not built; when it lands it covers these crossings as every halt's. No dependency.
- **Performance:** about 22 more boxes and as many static colliders at one head at a time, in the leg view's existing
  `things` batch (420) and `standing` bodies; no new draw call, light or tick work; one more lever placement visible. No
  `npm run perf` needed for that; the checkpoint reports the counts.

## Design review (2026-11-18)

Reviewed by the planner in the same context ([design-review](../../.claude/skills/design-review/SKILL.md)). Read:
DESIGN.md, owner-calls (index; right over less work; build more, test less; greybox before detail; perf guides;
resets never block), decisions-rail Current rules and the cited entries, direction.md (phase 1; this is a P3 fix, no
scope or order change, so no game-direction review), the running-side plan's owner words, greybox-route's answer g and call 98, rider-coach's finding 12 and R2b.1's report,
ring-island-crossing, the research tops above, `place.md`'s stack paragraph. Playtest data: the owner's 14 November run to
High Gorge (playtests.md) named "the running side and the levers at the Quarry and the Pier" as off, which is this
plan's reason; nothing in it touches Stack halt. The newest sessions (`node dev/playtest/cli.ts`) are 4–15 minutes in
Place; none reaches the stack line.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Stack halt is a request stop, served both ways, to the end | Decided | [12 November](../decisions-rail.md#d-2026-11-12-greybox-waits-and-build-2-answered) ("the last sea platform a request stop"); greybox-route call 98 |
| 2 | A homeward train stands on the offset (west) track; its lever stands on the deck it stops at | Decided | [running side](running-side.md) (owner's words at the Pier); [one lever per platform side](../decisions-rail.md#d-2026-11-10-trains-stop-on-request-at-the) |
| 3 | West decks at all three heads while served, not Stack halt alone | Default | The lay puts the party on the old head as it becomes a homeward stop; same fix, one loop. Owner question 1 |
| 4 | Each west deck is fixed at its head and stands from the lay that makes it a middle stop until it closes behind; never while it is the end | Default | A deck where no train stops would mislead (greybox-route answer g's reasoning) |
| 5 | West deck 25 × 4.5 m at lat −8.05, +0.90: the east deck mirrored | Default | Finding 12's proposal; the east deck and the Joint's west platform |
| 6 | A foot crossing at the decks' home end (planks r − 31.3..r − 28.9), not at the far end and not none | Default | Ring Island's precedent; the far end is where signal-held trains stand (12.8 m vs 2.8 m clear); no crossing leaves the 0.9 m kerb jump as the way, which Ring Island's crossing removed |
| 7 | Ramps 3.9 m (8.9°), outside both decks, starting at the planks' top | Default | Keeps both decks full height where the cars stand and the east sea ramp's landing level; #2176's no-step lesson |
| 8 | A sea ramp on the west deck too | Default | Each head deck has one (answer g: 4 m over open water); a fall off the west deck climbs out on its own side. Cheap to drop |
| 9 | The west lever 9.5 m toward home of the deck's middle (r − 22), 0.5 m in, plaque ×2 | Default | Ring Island's and the Joint's west levers (`RING_LEVER_OFF`); the end the train leaves toward (running side); the stack levers' plaque size |
| 10 | The east deck's homeward lever stands only while the head is the end; the outward lever stays where it is (r − 6) | Default | Running side: a lever calls only trains that stop at its deck |
| 11 | No board, sign or other furniture on the west deck | Default | Place's up platforms have "a lever each, no board or signal"; greybox before detail |
| 12 | The homeward platform point (server reach, coach steps) is the west deck's middle; v61 | Default | Every other two-sided halt's catalog; one source for reach and steps |

**Counts:** 2 Decided, 10 Default, 0 New. Calls 6 to 9 and 12 are re-reviewed for way 1 in the [25 November review](#design-review-2026-11-25-way-1); the first plan's crossing position (call 6) and ramps (call 7) are superseded there. **Findings and what they changed:**
- *The brief's lever spot was wrong for the rules.* Mirroring the east homeward lever (at the stop) puts it 2 m from the
  players' car but not at the end its train leaves toward, and 13.6 m from today's centreline reach point: no prompt.
  Changed: the lever follows the line 2 west-platform precedent (call 9) and step 2 moves the reach point (call 12).
- *Flow (rule 3, nobody stranded):* holds. Every deck has a walked way to the other (the crossing) and a way out of the
  sea; a player on a served head can always go either way; nothing here is a one-way. The closing-head drop (finding
  7c) is pre-existing and not made worse beyond the second deck.
- *Rule 1, the next goal can be found:* the homeward deck is visible across the tracks from where you alight, and the
  planks lead to it from the end you came in by. The lever's plaque faces its own deck (you read it once there); the
  running-side lesson (other side, other way) is taught four halts earlier.
- *Lens: something to notice every few seconds:* the 7.5 s walk passes the planks and two ramps; fine for a halt.
- *Missed and now in the plan:* the coach's steps (call 12) and the pre-existing outward-side noise and terminal crowd
  (finding 7, owner question 2), and the stills owed at the checkpoint.
- **Not seen:** the built geometry (none exists), a homeward train at a stack head in the running game, the head at
  `gorge-mid`. The checkpoint's proof look owes those.

**Copy:** none written or changed; no suspect line of The Boogler's.

## Design review (2026-11-25): way 1

Reviewed by the planner in the same context, on the two calls the owner's
[25 November item 4](../decisions-rail.md#d-2026-11-25-recommendations-taken-rail) changed (calls 6 and 7) and on what
they move (calls 8, 9 and 12, and a new call 13). Read this session: DESIGN.md (principles 7, 8, 10, 11), owner-calls
(level and world building; saves and rooms: "Nothing waits on a world bump", "Save resets never block"),
decisions-rail's 18 November and 25 November entries and the orchestrator log's 19 November finding, turnouts step 7,
and the code cited in the geometry table. No playtest since 14 November reaches the stack line
(`docs/playtests.md`); the 18 November review's other reading stands for the calls not listed here. Research:
[level-design](../research/level-design.md) and [route-contract](../research/route-contract.md) as lenses, nothing
departed from.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 6 | The foot crossing at the decks' home end, **planks 1.6 m at r − 28.5 .. r − 26.9**, between J12's last timber (0.17 m) and a standing train's tail (0.80 m) | Decided | [25 November, item 4](../decisions-rail.md#d-2026-11-25-recommendations-taken-rail) ("way 1, planks 1.6 m wide at r − 28.5 to r − 26.9"); was Default on 18 November |
| 7 | **Ramps r − 26.9 .. r − 23 (3.9 m, 8.89°)**, running into the decks' first 2 m, starting at the planks' top; the east deck's home end moves to r − 23 | Decided | The same item ("both ramps running into the decks' first 2 m (8.9°), which moves the east deck's home end"); no step at either end, #2176's lesson |
| 8 | The sea ramps' landings move with the decks' home ends, to r − 23 .. r − 20, the slip after them at the same pitch (28.4°), on both decks | Decided (that it moves), Default (where) | The same item ("and its sea-ramp landing"); beside the flat deck the landing is level with it, where beside the ramp it would stand up to 0.37 m over the ramp's side |
| 9 | The west lever stays at r − 22 (9.5 m toward home of the 25 m stretch's middle), now 1.0 m past the ramp top, 0.5 m in | Default | `RING_LEVER_OFF` as Ring Island and the Joint; it stays the end the train leaves toward and inside the unchanged reach. Moving it to keep the first plan's 3 m from the ramp top would take it 2 m nearer the players' car for no gain |
| 12 | The catalog's west point stays at r − 12.5, lat −8.05 | Default | Unchanged; 10.5 m onto the flat deck, the lever 9.66 to 9.87 m from it of 12.6 |
| 13 | **New:** the east deck's ramp and landing stand whenever the east deck does, including while its head is the line's end (no planks then; the ramp leads down to the track bed, 0.29 m over the slab) | Default | One shape for the deck the whole party stands on at the lay: nothing under them changes when a head becomes a stop, and the level rows measure one east deck. Owner question 3 |

**Counts (this review):** 3 Decided (6, 7, and 8's move), 4 Default (8's place, 9, 12, 13), 0 New. **Findings:**

- *The first plan's call 6 was placed against a track that changed under it.* Turnouts step 7 (19 November) drew the
  crossover the planks then covered: the lever's arm would have stood up through them. The level rows now read the
  crossover from `crossoverPlan()` and the lever from `turnout()`, so a later move of either fails `level-check` instead
  of a builder finding it (step 1's rows 1 and 2). Changed: step 1.
- *Flow (rule 3, nobody stranded):* holds. Both decks keep a walked way to each other and a way out of the sea; the
  planks are 1.6 m along the line (the first plan's 2.4), room for two players abreast; the 0.9 m kerb shortcut
  stays.
- *Rule 1, the next goal can be found:* holds and reads better. The planks now start where both ramps do, so from the
  approach camera the crossing, its two ramps and the crossover's lever read as one place at the decks' end; from the
  east deck the ramp down leads straight onto them.
- *Something to notice:* the walk is about 4 m shorter (about 6.8 s), passing the points lever 2.1 m away; the moving
  blades and lever (`turnout-blades.ts`) are the stack's one moving thing at the head, now beside the walk.
- *Slapstick (10):* a player on the planks stands 0.80 m beyond a standing train's reserved tail (the Pier's minimum is
  0.60) and on a passing train's track, as every plank crossing; the push-aside rule (Risks) covers it when built.
- *Call 13's cost at an end head:* a ramp that leads to the bed and no planks is a mild invitation onto the track, where
  a player can already drop. Seen in step 1's still at Stack halt while it is the end (`--rail-seed stack-laid-3`), judged there.
- **Not seen:** the built geometry (none), a still of the crossover's lever at a head (the code was read, not looked
  at), a train at the stop. Step 1's stills (b) and (c) and step 4's proof look owe them.

Every Default above is in [agent-calls](../agent-calls.md) (Rail, 25 November). **Copy:** none; no suspect line of The
Boogler's.

## Build hand-off (25 November)

For an Astra builder (models by `npm run models`), in order; each commit leaves `node dev/ship-check.ts origin/main
HEAD` green. Read this plan's geometry section (under Design) first.

1. **Step 1 (view, no bump):** `src/entities/route-greybox/stack-halts.ts` (new), `src/entities/route-greybox/leg-view.ts`
   (`pieces`, the stack spec's `plat` and `crossing`), `dev/level/stack-halts.ts` (new) and `dev/level/check.ts`,
   `dev/level/rider-coach.ts`, `dev/level/rider-coach-stop.ts`, `docs/game-design/place.md`. Checks: typecheck, lint
   on the files, `npm run level-check` (the ten row groups, exit 0), `npm run registry` if asked, the ship check. Stills
   (opened): `stack-west-approach`, `stack-west-crossing`, `stack-west-top` at `gorge-reached`, and one at `--rail-seed stack-laid-3`
   (Stack halt the end: the east ramp alone, call 13). Its own commit.
2. **Step 2 (catalog, the bump):** `src/sim/railway-lines.ts` (`STACK_HALTS` `platforms[1]`), `src/world/namespace.ts`
   (**the next free `WORLD_NS`**: read it from main when the commit is made, never a number from this plan; a dated
   history line), the halt prefab (`npm run prefabs`, `--check`), re-pins (host trace, prefab-halts `catalogs`,
   golden only if `worldNs` moves: no stage hash may move), the lever-judging test in
   `test/helpers/railway-route-rules.ts`, step 2's `stack-halts` rows. Independent review. Its own commit, rebased onto
   main just before the ship so the number is still free.
3. **Step 3 (levers, rides step 2's number):** `dev/prefab/halts.ts`, `src/entities/railway/halts-view.ts`, the prefab
   fixtures (`levers.length` + 3), `dev/look/evals/stack-levers.ts`. Still: `stack-west-lever`. Independent read of the
   fixture delta.
4. **Step 4 (checkpoint):** `npm run check:full`, `npm run test:net`, `npm run level-check`, `npm run checkpoints --
   gorge-mid gorge-reached`, the production bot's walk and boarding at Stack halt with stills (a) to (c) and the clip,
   and the leg bot once.

**In flight** on 25 November (`npm run inflight`): nothing unmerged touches these files.

## Open questions for the owner

Questions 1 and 2 were answered on 18 November ([decisions page](../decisions-rail.md#d-2026-11-18-decisions-page-rail));
way 1 was taken on 25 November. Question 3 is new and does not block: the build proceeds on its recommendation.

1. **West decks at all three heads, or Stack halt alone?** Heads 1 and 2 are homeward stops for one section each, but
   that section starts with everyone standing on them (the lay happens at their frame). **Recommended: all three**,
   same build. Does not block: the steps are the same either way; answer "Stack halt alone" and the builder filters
   heads 1 and 2 out of `westStands` and their rows. *Answered 18 November: all three heads.*
2. **Fix the outward step side and the terminal riders' crowd at the stack heads in the same v61?** Both come from the
   heads' east catalog point sitting on the track centreline (finding 7a, 7b; the crowd is read from code, not seen).
   **Recommended: yes, as its own small row after this one** (move `platforms[0]` to the east deck's middle, one line
   in `STACK_HALTS`, look at a terminal head with riders waiting). Does not block this build; if the answer is "fold it
   in", it joins step 2's commit and its look joins step 4. *Answered 18 November: its own row afterwards.*
3. **While a stack head is the line's end, does its east deck keep the new ramp at its home end?** Way 1 turns the
   deck's first 2 m into a ramp down to the planks. **Recommended: yes, always** (call 13): the deck the party stands
   on at the lay keeps one shape, and at an end head the ramp leads down to the track bed, where a player can already
   drop. The other way: the east deck stays flat to r − 25 until the lay that makes its head a stop, and changes then
   under whoever stands at its home end (they drop up to 0.37 m). Either is one predicate in step 1.
