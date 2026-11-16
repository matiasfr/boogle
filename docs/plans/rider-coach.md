> **Status: plan, nothing built; for the designer.** Planner, 16 November 2026, against origin/main `916f570fb`,
> `WORLD_NS` v54 on main (v55 is taken by V1 on `t3/first-town-rider-places`). Builds the owner's
> [coach A, the rework and the allowance](../decisions-rail.md#d-2026-11-16-rider-coach-a-and-rework) and
> [riders get a dedicated car](../decisions-rail.md#d-2026-11-16-riders-get-a-dedicated-car) on the
> [fit check](../research/rider-car-fit.md) and the [coach previz](../world/rider-coach.html). Replaces
> [first-town-lesson](first-town-lesson.md)'s step A from its build on. `npm run inflight`: nothing unmerged on
> wip/, ship/ or claude/; the local V1 branch (`folk.ts`, `train-view.ts`, `garage-data.ts`) is the overlap.

# The riders' coach: Home and Ring reworked, then the coach

## Goal

Every line 2 train pulls a small panelled period coach behind the players' knifeboard, and the eight riders who pay
fares sit in it where everyone can see them. Serves **11. Show, don't tell** (eight figures are the count; no
counter) and the core loop's "grown towns" (riders read as passengers, not stowaways on the players' bench). The
track is reworked and proven before any art is made (owner's point 2). Bends nothing. **Research:**
[rider-car-fit](../research/rider-car-fit.md) (envelope 2.90 × 1.60 m, index 2, both fixes, the index audit; used
throughout), [rider-coach README](../world/rider-coach/README.md) (unjudged items: R3, R4); no departure except
Level finding 2 (the fit check's "extend the straight" cannot keep today's s 84 join).

## Design

| State | Sync kind | Authority and API |
| --- | --- | --- |
| Home's road 2 head, the cart's leg, Q2's frame, line 2's path samples, `CART_ROAD.forgeCm` (R1) | data (catalog) | `src/place/home-station.ts` (drawn), pinned in `src/sim/railway-lines.ts`, `railway-cart.ts`, `railway-line2-layout.ts`; read by rules and views |
| Line 2's Village and Ring Island stops, `TRAIN_EXTENT.behindCm` (R2b) | data (catalog) | `src/sim/railway-lines.ts`, `railway-ring-layout.ts`; the host's rule tick reads them; signals, end blocks, `trainPlaces`, `within`, `retainedEndBlock` follow |
| The consist: which cars a train pulls, in which order, at which offsets | Local, derived | `src/entities/railway/cars.ts` `consistOf(...)`, from the train's row (`wagon`, `boiler`) and its line; no field |
| The coach's mesh, collider, seat anchors; riders seated in it | Local | `train-view.ts`, `folk.ts`; riders' count is today's `Train.riders` (Server, unchanged) |
| Boiler readouts "Cars it pulls" 4 / 4 / 5 | data | `garage-data.ts` `BOILERS`; display only (nothing enforces `pulls`) |

No new op, component, field, projection, prediction or registration. The coach is a view of every line 2 train; the
sim never knows it exists except through the longer `TRAIN_EXTENT` and the two moved stops. Saves: no new key.

**The consist by roles (R2a).** `type CarRole = 'engine' | 'player' | 'rider' | 'kit' | 'wagon' | 'steel'`;
`consistOf({ line, wagon, steel })` returns `{ role, spec, offset }[]` engine first. Offsets pack: engine at
`TRAILER.hz + 0.6 + ENGINE.hz`, player 0, each next car `prev.offset − prev.hz − 0.5 − spec.hz` (today's 3.7 m
pitch). `roleIndex(consist, role)` and `offsetOf(consist, role)`; `TRAIN_OFFSETS`/`TRAIN_CARS`/`steelCarOffset`
become derived views kept for the tools. With the coach (`RIDER_CAR = { hx: 0.8, hz: 1.45, top: 2.05 }`) a line 2
train is engine, player 0, **rider −3.55**, kit −7.10, wagon −10.80, steel −14.50 (−10.80 without the wagon); tail
16.10 m. Line 1 stays engine, player, kit (owner question 2). The garage's works copy builds `consistOf` with no rider.

**Rules that key on extent or spacing.**

| Rule | Today | Changed by |
| --- | --- | --- |
| `TRAIN_EXTENT.aheadCm` | 820 | nothing (nose unchanged relative to the player car) |
| `TRAIN_EXTENT.behindCm` (end signals at side −1, `within`, `trainPlaces`, `retainedEndBlock`) | 1270 | **R2b → 1610** (`TRAIN_TAIL_M` 16.10); Village signals move 3.4 m out: line 2's 66.7 → 70.1 m |
| `TRAIN.sepCm` | 2740 | nothing: reserved nose-to-tail 3.10 m at the floor; the fit check's curved worst +0.93 m |
| `car-spacing.ts` max vehicles | 5 | **R2b → 6** |
| Village line 2 stop | 18.25 m | **R2b → 21.65** (not R1: Level finding 1) |
| Ring Island stop (`RING_END.u`) | u 448 (platform middle) | **R2b → u 451.4**, `RING_END.u = RING_END_U + 340`, comment says why |
| `WAGON_S` | 1085 | nothing; R2b asserts it equals the stop − `offsetOf('wagon')` (2165 − 1080) |
| Quarry, Far Head, Pier, Railhead, stack, Gorge stops | | nothing (fit check table: every rider car boards) |

## Steps

Each leaves `node dev/ship-check.ts` green. Tier is `npm run review-stamp`'s rule; builders from `npm run models`.

- [ ] **R1. Home's road 2 rework, no coach (M).** Sync: Server data (catalog). Tier: **independent review** + visual.
  Builds: Codex gpt-6-astra high (player-visible track); review a fresh gpt-6-astra high (or opus high). Bump: **yes**,
  the next free number: "Home's road 2 straight to 28.4 m, the head rejoins line 2 at s 89, the cart's leg lands at
  s 29.4; rooms start fresh". Today's trains, stops and cars are unchanged.
  - `src/place/home-station.ts`: `HEADS[1]` becomes `straight(28.4)`, right arc, straight, left arc, **`join: 89`**
    (an integer: the head is 1 m samples onto today's line), both arcs ≥ 18 m (solve the four lengths and the first
    radius so the end meets `LINES.east` at s 89 within 0.03 m and 0.5°; measured: r 18 closes at s 88.55 within
    0.026 m). `LEG`: from line 1 s 54, left R 15, straight, right R 15, `to: 29.4` (measured on the r 20 head: 8.11 /
    5.22 / 24.27 m, 37.61 m; re-solve on the final head). `CROSSING` comment's numbers. `SHUNT_CUSP_S`, `SPUR`,
    `BUFFERS`, `ISLAND`, the table, stalls, rack, till, hall: unchanged (all before s 25).
  - `src/sim/railway-lines.ts`: line 2's first nine path samples (s 0–80) re-pinned from the new head (line 1's
    untouched). `src/sim/railway-cart.ts`: `CART_ROAD.forgeCm` = 142 + `LEG.len` + 29.4 (about 20901, from 20632).
    `src/sim/railway-line2-layout.ts`: Q2's frame `x, z` moved with the track (Level finding 3). `src/place/layout.ts`:
    no change (stops stay 18.25).
  - Tests: `test/home-station.test.ts` (head samples and join; "both stops on the straight" gains R2's planned row:
    the steel train at 21.65 with a 3.40 m coach pitch has its nose ≤ 28.4 on both engines; "road 2 in order" with the
    leg at 29.4 and the planned row's nose ≥ 1.05 m short of it; the crossing's "far end has no room" assertion
    rewritten to the planned row; cart road continuous, `forgeCm` pinned), `test/railway-lines.test.ts` (HOME_PATHS,
    nine changed samples), `test/railway-cart.test.ts`, `test/island-map-path.test.ts`, `test/path-refuge.test.ts`;
    `dev/level/home-station-page.ts`, `dev/level/zfight-baseline.json`, `dev/level/world-blockout-authored.json`
    regenerated; replay goldens re-pinned naming the path and `forgeCm`.
  - **Proof:** `npm run level-check` exit 0 with no new problem, and these rows read: line2-down/up radii (up track
    ≥ 14.1 m, today's tightest), timber against track, machine clearance (Q1 and Q2 lay on the new head), the leg vs
    the up track's turnout (fouling zone s 34–46) and its crossing, the rotunda/garage/yard margins (Level finding 4).
    A new `dev/level` row: **the cart through the leg** (body swept every 0.25 m from line 1 s 54 to road 2 s 0 against
    the up track, the island's end ramp and a train standing at 18.25 and at the planned 21.65, 0.25 m envelope).
    `npm run look -- --rail-seed wagon-on`: Home from the hall's front and from above the leg; a line 2 train leaving;
    the cart arriving (`depot` seed). **Done means** tests and level-check pass, stills opened, `npm run loop -- run`
    unmoved.
- [ ] **R2a. The consist by roles, no coach (S).** Sync: Local. Tier: normal. Builds: Codex gpt-6.1-sol medium.
  Bump: no. After V1 ships (shares `train-view.ts`); before V2 starts, so V2 is written against roles.
  - `cars.ts` as in Design (`consistOf`, `roleIndex`, `offsetOf`; derived `TRAIN_OFFSETS`). Every row of the fit
    check's [index audit](../research/rider-car-fit.md#4-car-position-and-every-production-index-assumption-found):
    `train-view.ts` (`WAGON=3`, `cars[n]` kit/player uses, `offsets[n]`, steel, the bounds that end at the kit, the
    `n===1` coupling, `riderCar`), `garage-view.ts` (its own roles), `look-kit.ts` :817 and `wagon-look.ts` :202 (keep
    `[loco, ...beds]`, read roles), `forge-finish.ts` comment, `town/view.ts` :130. Machine and prototype arrays
    (`machine-model.ts`, `track-machine.ts`, `proto/crossing/train.ts`): **not touched**.
  - Tests: a new `test/consist.test.ts`: `consistOf` reproduces today's offsets exactly for line 1, line 2, the wagon's
    train and the steel train; `rg -n 'cars\[[1-9]\]|TRAIN_OFFSETS\[' src/entities` finds nothing outside `cars.ts`.
  - **Proof:** one `look -- --rail-seed wagon-on` still at Home matching main's (nothing moved). **Done means** that.
- [ ] **R2b. The coach in the train, a grey blockout (M).** Sync: Server data + Local. Tier: **independent review** +
  visual. Builds: Codex gpt-6-astra high; review a fresh gpt-6-astra high (or opus high). Bump: **yes**, the next
  free number: "every line 2 train pulls the riders' coach behind the players' car; the tail reaches 16.1 m; line 2's
  Village stop 21.65 m, Ring Island's 3.4 m on". After R1, L1 and V2 (Order).
  - `cars.ts`: `RIDER_CAR`, the rider role at index 2 on line 2. `src/sim/railway-lines.ts`, `railway-ring-layout.ts`,
    `src/place/layout.ts` `LINKS` stops, `car-spacing.ts`: as the rules table.
  - `train-view.ts`: the blockout in the 2.90 × 1.60 × 2.05 m envelope (over rail), grey, so riders show: deck at
    0.70, waist-high sides and ends to 1.30, four corner posts, flat roof slab at 1.95–2.05, two bench blocks 0.22 m
    over the deck along the sides. One kinematic box collider of the whole envelope (players stand on its roof as on
    the boiler top; they cannot sit with riders: the [separate seats](../decisions-rail.md#d-2026-11-16-rider-seats-are-not-player-seats)).
    Rendering, hiding, grow-in, carry, bounds include it; `riderCar` points at it.
  - `folk.ts`: V1's `RIDER_PLACES` on car 1 go; `COACH_SEATS`, eight anchors 4 + 4 on the benches facing in, 0.60 m
    pitch (previz A), `rideUp` the bench height; riders sit (the pose riders had before V1). Boarding: today's walk
    from the platform to the nearest door end; the 0.85 m gap is R3's (owner question 1).
  - `garage-data.ts`: `BOILERS` `pulls` 4 / 4 / 5 with a comment (the coach comes with every passenger train and does
    not use the allowance, owner 16 November; Strong's extra car stays cargo). Cars tile copy (V1's) per Strings.
    `docs/plans/garage-choices.md` and `train-progression.md` readouts follow. `garage-view.ts`: no coach.
  - `works-view.ts` (V2's arm), `train-view.ts` footing flights: their target is the kit role's pose, now 3.4 m aft at
    the Quarry; if V2 shipped a literal, it moves here.
  - Tests: `test/railway-lines.test.ts` (behindCm 1610 = `TRAIN_TAIL_M`), `test/home-station.test.ts` (stop 21.65,
    4.65 m ahead of abeam; R1's planned rows become the real ones), `test/railway-works-layout.test.ts` (`WAGON_S`
    derivation; Pier nose unchanged 733.20, 1.20 m off the parked layer), `test/railway-ring-layout.test.ts`,
    `test/railway-ring.test.ts`, `test/train-car-clearance.test.ts` (the coach in the sweep), `test/railway-placement`,
    `-retained-blocks`, `-end-path`, `-trains`, `-route-rules`, `-r4b-views`, `review-v26`, `greybox-works`,
    `garage-geo`, `rotunda` (copy unchanged), `server/test/railway-steel-host.test.ts`; `dev/level/{ring,rail-network,
    rail-map}.ts` read `TRAIN_EXTENT` and the stop (no 1270 literal). New: **every served halt** (the fit check's
    table, production `trainPlaces`/`deckAt` poses): player and rider car bodies beside their platform's deck, except
    the Quarry offset player car's existing −1.62 m (asserted no worse); **the staged queue**: two line 2 steel trains
    at `sepCm` on line 2's offset approach (worst s 85), body gap ≥ 0.5 m; the Home spans (tail 5.55 m past the spur's
    points at 5.5, boards 1.95 m behind, nose 28.35 on the 28.4 straight, 1.05 m short of the leg).
  - **Proof:** `npm run level-check` (Ring rows: Level finding 5); `look --rail-seed fares-running`: the coach at Home
    from the island and from both sides with eight seated, at the Pier, at Ring Island (the steel gantry on the steel
    car), at the Quarry (the Works arm onto the kit car); `npm run perf` cost reported (seven more car meshes, one
    collider each). **Done means** tests, level-check, stills opened, `npm run loop -- run` with order and bills unmoved.
- [ ] **R3. The coach's art (M; sheets S).** Sync: Local. Tier: normal + visual. Sheets: Codex gpt-6.1-sol medium (only
  Codex paints); build: Codex gpt-6-astra high with the asset-author skill. Bump: no. After R2b.
  - **Brief.** Candidate A of the [previz](../world/rider-coach.html), the panelled four-wheel bug box, inside the R2
    envelope: **2.90 × 1.60 m, roof ≤ 2.05 m over rail**, deck 0.70, 2.20 m axle spacing (the fit check's sweep; the
    previz drew 2.80 × 1.80, and a wider body needs a new sweep). Panelled lower shell, low arc roof, window posts,
    **four unglazed droplight openings a side**, low sills so hats and faces show, two benches 4 + 4 facing in, a door
    at each bench end on both sides, dark iron four-wheel underframe, couplers at the kit's height. Palette: honey
    timber #b98a52, brown posts #5c4530, dark iron #2f3131, restrained red #a33a2c, small brass; no lettering, lining,
    rivets, lamps or glass. Empty: light through the openings and bench slats; full: four hats a side, the far four
    partly behind. Boarding across the 0.85 m gap (1.65 m edge − 0.80 half width): owner question 1's answer.
  - Asset-author steps: anchor still from R2b's `fares-running` capture; front/side/back/three-quarter sheets plus
    close-ups of a droplight, the door and step; `assets/src/rider-coach.py` with named parts and the eight seat
    sockets; `npm run assets -- rider-coach`; `dev/assets/inspect.ts`; Buddy stage. `src/entities/railway/coach-kit.ts`
    loads it as `car-kit.ts` does; `train-view.ts` swaps the blockout; `COACH_SEATS` read from the sockets; collider
    unchanged unless the roof's arc needs a lower top (designer).
  - Riders: seated folk at each socket (hats clear of the roof and posts, knees clear of the opposite bench); board
    and alight through the doors, never through a wall. **Done means** the stage stills, the in-game stills empty and
    full from both sides at game zoom, and the one owner question the skill ends with.
- [ ] **R4. Evidence and checkpoint (S).** Runner: Codex gpt-6.1-sol medium; the main session opens the media.
  `npm run check:full`; `npm run loop -- run`; `npm run test:net`; stills of each halt in R2b's list with the art; a
  **real-time clip** of riders boarding and alighting at Home and at the Pier (`npm run video`); `docs/game-design/
  place.md`'s train section gains the coach; the backlog row updated. Stays unmeasured: Level finding 8's list.

**Order against L1.** V1 (v55) ships first. **R1 runs in parallel with L1** (no shared file except
`namespace.ts` and the goldens: the second to ship rebases, re-pins and takes the next number). **R2a lands after
V1 and before V2 is built**, so V2 targets the kit role and its arm stands beside the kit role's pose at the Quarry
stop, not a literal; L1's sim rules are index-free. **R2b after R1 and after L1+V2 ship** (V2 and R2b both edit
`train-view.ts` and the arm's target; R2b moves the kit 3.4 m aft at the Quarry and the arm follows by data). Then
R3, then R4. Bumps: **R1 and R2b, one each** (with V1 v55 and L1 next, likely v57 and v58); R2a, R3, R4 none. They
cannot share one: R1 must ship and be proven alone (owner's point 2), and moving the stops without the coach
(R1 as first sketched) would shift every freight car 3.4 m and then shift it back (Level finding 1).

## Level findings

Measured at `916f570fb` with production `march`/`roadAt`/`lineAt` (scratch scripts, not committed) and
`npm run level-check` (exit 0, 17 reports, 15 known planned-track failures, none new).
1. **The stops move in R2b, not R1.** Moving both marks +3.4 m with today's trains moves the kit, wagon and steel
   3.4 m forward: the waiting wagon (`WAGON_S`) and the shunt misalign at Home, and at Ring the steel car's centre
   (S 444.0) falls 3.4 m off the jib's arm (u 440.4–440.8). With the coach, the same move keeps every freight car
   where it stands today (Home kit 14.55, kit rear 12.95, wagon wait 10.85 with its 0.50 m gap; Ring steel 440.6 S
   / 436.9 WS) and moves only the engine and the two passenger cars. Depots, boards, till and gantry stay.
2. **Home's head cannot keep its s 84 join.** A 28.4 m straight closing on today's line at s 84 needs arcs of about
   10–12 m (offset track 6–8 m): fails. Moving the join out: r 16 at s 87 (moves the track up to 3.65 m; offset 12 m,
   tighter than today's 14.1), **r 18 at s 88.5–89 (up to 4.5 m)**, r 20 at s 90 (5.6 m, offset 16 m). Recommended:
   r ≥ 18 both arcs, join s 89. Every move is north (away from the table), largest at s 60–70.
3. **Q2's frame must move.** Today 7.49 m from the down track and 3.49 m from the up track (s 40.5); on the r 20
   head the up track passes 0.51 m from it. It moves with the track in R1 (a catalog row: part of R1's bump).
4. **The rotunda side gains room.** Nearest drawn-track distances grow: garage crew 8.98 → ~13 m, jib 9.29 → ~13.6,
   stall −3 door 17.4 → ~22; table centre (15.83), yard (5.34) and stalls 0–3 unchanged (their nearest point is at
   s ≤ 25). North of the track (road 1, the leg, the town's plots) is R1's level-check to report.
5. **Ring Island after R2b** (tail 16.1, nose 8.2, stop u 451.4): tail 435.3 (as today), 18.3 m clear of the
   crossover, 4.8 m north of the planks (≥ 3), 0.7 m past the ramp top, nose 459.6 ≤ 468, 23.4 m short of the buffers
   (≥ 14.7); held at the signal the tail is at u 370.7, 93.7 m past the hinge, 120.7 m past the Railhead's stop.
6. **Home after R2b:** player car 20.05–23.25 on the deck (5.70–23.70; 0.45 m inside), coach 16.65–19.55; the
   road 2 lever (s 22.3) now stands beside the player car, 0.55 m off its body; boards end 1.95 m behind the tail.
7. **The leg closes** with R 15 arcs from line 1 s 54 to road 2 s 29.4 (37.61 m vs 38.32 today). It lands 4.6 m
   before the up track's merge at s 34 (8 m today): the cart-through-the-leg row (R1) is the proof.
8. **Not measured, owed by the steps:** the leg against the up track's turnout and the cart's swept body (R1); a
   queued train's chord poses at the new Home signal (s 70.1) on the new head (R2b); seated knees, hats and door
   access (R3); each player seat exit at the Quarry; boarding in motion, multiplayer, device cost (R4); future
   Strong consists and later lines' stops (not certified here).

## Risks

- **Hotspots:** `train-view.ts` (V1, V2, R2a, R2b), `railway-lines.ts`, `namespace.ts`, the goldens: rebase first.
- **Room safety:** no op, apply or receipt changes; the extent change moves signals and end blocks on a live host,
  so R2b is a fresh-world bump with replay and `trainPlaces` tests, not a hot change.
- **Mixed builds:** dev phase; each bump has its dated history line, no compatibility code.
- **The rework misses what the fit check did not sweep:** the 4.5 m move between s 28 and 89 is new geometry the
  fit check never saw; R1's level-check rows and its two stills are the gate, before any coach exists.
- **Performance:** seven coach meshes and colliders, eight seated figures a train (V1 already drew eight standing);
  reported with `npm run perf` in R2b, not a reason to cut.

## Strings (placeholders; none of The Boogler's copy touched, no suspect line found)

- Garage Cars tile, after V1's "Four seats, eight riders": **"Four seats; the riders' coach"** and desc "The
  knifeboard passenger car: four seats for players. The riders' coach behind it seats eight." Stats: Seats 4,
  Riders 8 (unchanged).
- Boiler readout "Cars it pulls": numbers only, 4 / 4 / 5.

## Owner questions (each step builds on the recommendation; nothing waits)

1. **How do riders cross the 0.85 m gap to the coach?** (a) **Recommended:** a short fold-down step at each door,
   drawn only while the train stands at a halt, no collider; (b) they hop the gap, no step; (c) a fixed footboard
   along the body (outside the swept 1.60 m: a new sweep).
2. **Line 1's timber train carries no riders today. Does it pull a coach?** (a) **Recommended:** not yet; the coach
   comes with every train on a line that carries riders, line 1 gets one with its rider route; (b) yes, an empty
   coach on line 1 now (it fits: the fit check's line 1 row).
