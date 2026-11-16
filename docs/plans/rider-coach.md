> **Status: designer-reviewed 16 November: build with changes (folded into the Design, R1, R2b, R3, the order and
> Strings); one owner question, nothing waits on it. Nothing built.** Fact changed after planning: today's car keeps
> **four** rider places with no world bump (S1 + V1 stay on v54); the eight places, the 4 → 8 rule and its golden
> move arrive with the coach in R2b. Planner, 16 November 2026, against origin/main `916f570fb`,
> `WORLD_NS` v54 on main (S1 + V1 on `t3/first-town-rider-places` keep v54). Builds the owner's
> [coach A, the rework and the allowance](../decisions-rail.md#d-2026-11-16-rider-coach-a-and-rework) and
> [riders get a dedicated car](../decisions-rail.md#d-2026-11-16-riders-get-a-dedicated-car) on the
> [fit check](../research/rider-car-fit.md) and the [coach previz](../world/rider-coach.html). Replaces
> [first-town-lesson](first-town-lesson.md)'s step A from its build on. `npm run inflight`: nothing unmerged on
> wip/, ship/ or claude/; the local V1 branch (`folk.ts`, `train-view.ts`, `garage-data.ts`) is the overlap.
> **Revised 16 November (planner, on `0b9933ec2`), after R1's builder stopped at the geometry proof:** R1 is now R1a
> (the trains wait for the cart, S, bump; the designer moved the wait from the pedestal, see its ruling), R1b (Home proven on today's track, S, no bump) and R1c (the relay, L, only
> on the owner's word); see [the revision note](#revision-16-november-r1-after-the-builders-stop). Nothing built.
> **Re-evaluated on merit 16 November** under [right over less work](../agents/owner-calls.md#right-over-less-work):
> today's track (A) still recommended, now for what it does at Home, not for its size; see
> [Home on merit](#home-on-merit-a-b-and-c-16-november).

# The riders' coach: Home and Ring reworked, then the coach

## Goal

Every line 2 train pulls a small panelled period coach behind the players' knifeboard, and the eight riders who pay
fares sit in it where everyone can see them (today's car carries four until then: eight cannot be drawn on it). Serves **11. Show, don't tell** (eight figures are the count; no
counter) and the core loop's "grown towns" (riders read as passengers, not stowaways on the players' bench). The
track is reworked and proven before any art is made (owner's point 2). Bends nothing. **Research:**
[rider-car-fit](../research/rider-car-fit.md) (envelope 2.90 × 1.60 m, index 2, both fixes, the index audit; used
throughout), [rider-coach README](../world/rider-coach/README.md) (unjudged items: R3, R4); no departure except
Level finding 2 (the fit check's "extend the straight" cannot keep today's s 84 join).

## Design

| State | Sync kind | Authority and API |
| --- | --- | --- |
| When line 2's trains wake: the boiler fitted **and** the depot cart at rest (R1a, [designer ruling](#r1a-designer-ruling)) | Server (rule) | `src/sim/railway-sys-line2.ts` `line2Wake`; invariant in `railway-check-line2.ts`; the host's rule tick owns it, no field |
| Only with R1c: Home's road 2 head, the cart's leg, Q2's frame and rack, line 2's path samples, `CART_ROAD.forgeCm` | data (catalog) | `src/place/home-station.ts` (drawn), pinned in `src/sim/railway-lines.ts`, `railway-cart.ts`, `railway-line2-layout.ts`; read by rules and views |
| Line 2's Village and Ring Island stops, `TRAIN_EXTENT.behindCm` (R2b) | data (catalog) | `src/sim/railway-lines.ts`, `railway-ring-layout.ts`; the host's rule tick reads them; signals, end blocks, `trainPlaces`, `within`, `retainedEndBlock` follow |
| The consist: which cars a train pulls, in which order, at which offsets | Local, derived | `src/entities/railway/cars.ts` `consistOf(...)`, from the train's row (`wagon`, `boiler`) and its line; no field |
| Rider places a train, `TRADE.riderPlaces` 4 → **8** (R2b) | Server data (catalog) | `src/sim/railway-trade-layout.ts`; boarding caps `Train.riders` at it; the garage tile and economy model read it |
| The coach's mesh, collider, seat anchors; riders seated in it | Local | `train-view.ts`, `folk.ts`; riders' count is `Train.riders` (Server, unchanged shape) |
| Boiler readouts "Cars it pulls" 4 / 4 / 5 | data | `garage-data.ts` `BOILERS`; display only (nothing enforces `pulls`) |

No new op, component, field, projection, prediction or registration. The coach is a view of every line 2 train; the
sim never knows it exists except through the longer `TRAIN_EXTENT`, the two moved stops and the rider places it
seats (4 → 8, a catalog number). Saves: no new key.

**The consist by roles (R2a).** `type CarRole = 'engine' | 'player' | 'rider' | 'kit' | 'wagon' | 'steel'`;
`consistOf({ line, wagon, steel })` returns `{ role, spec, offset }[]` engine first. Offsets pack: engine at
`TRAILER.hz + 0.6 + ENGINE.hz`, player 0, each next car `prev.offset − prev.hz − 0.5 − spec.hz` (today's 3.7 m
pitch). `roleIndex(consist, role)` and `offsetOf(consist, role)`; `TRAIN_OFFSETS`/`TRAIN_CARS`/`steelCarOffset`
become derived views kept for the tools. With the coach (`RIDER_CAR = { hx: 0.8, hz: 1.45, top: 2.05 }`) a line 2
train is engine, player 0, **rider −3.55**, kit −7.10, wagon −10.80, steel −14.50 (−10.80 without the wagon); tail
16.10 m. Line 1 stays engine, player, kit (owner question 2): the rider role is keyed on the line having a rider
route (`lineRoute(line) >= 0`), not on `line === 2`, so a line gets its coach when it gets riders (design review). The
garage's works copy builds `consistOf` with no rider.

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
| The depot cart and line 2's trains | may coexist (Level finding 9) | **R1a**: never; the leg's points may then stand under a train (R1b) |
| Home's "stops on the straight" and "nose short of the leg's points" tests | hold at 18.25 | **R1b** relaxes both for the planned row (engine ≤ 3.5 m into the arc), citing R1a |

## Steps

Each leaves `node dev/ship-check.ts` green. Tier is `npm run review-stamp`'s rule; builders from `npm run models`.

- [x] **R1a. The trains wait for the cart (S, top of S).** Sync: Server (rules). Tier: **independent review**. Builds:
  Codex gpt-6.1-sol medium; review a fresh gpt-6-astra (medium as a first pass). Bump: **yes**, the next free number:
  "line 2's trains wake once the depot cart is home; the cart never shares line 2 with a train". Needed under every
  option (Level finding 9: on main the cart drives through the line 2 train that has just woken) and depends on
  nothing in this plan: **it can start now**, ahead of the Home choice, L1 or the coach. Changed by the
  [designer ruling](#r1a-designer-ruling) below: the wait moved from the pedestal to the trains' wake.
  - `src/sim/railway-sys-line2.ts`: the boiler casts on Q5's completion as today. `boilerFit` keeps its checks and
    fits the boiler; the rest of its body (the breaker cast, `Rail.trains = tick`, the trains placed and timed) moves
    to one `line2Wake(w, tick)`, called by `boilerFit` when the cart is at `REST` and by `cartStep`'s move to `REST`
    when the boiler is fitted and `Rail.trains < 0`. No new field, op or refusal. Why it holds: after Q5 starts,
    `cartServing` is −1 for good (Q6 and Q7 are fed by train), so once the cart rests it never leaves again.
  - `src/sim/railway-check-line2.ts`: new: `Rail.trains >= 0` means the cart is at `REST`, `cartAlong` 0 and empty;
    `fitted ⇔ trains ≥ 0` becomes `trains ≥ 0 ⇒ fitted` and `fitted ∧ trains < 0 ⇒ cart not at REST` (nothing is left
    waiting on a cart at home); `railway-check-works.ts`'s `breaker > 0 ⇔ fitted` keys on `trains ≥ 0`.
    `src/sim/railway-seed-route.ts`: the `trains-on` stage advances from the fit until the trains wake (the seed fits
    20 ticks after `q5-done`, so about 257 ticks); fixtures and the host trace re-pinned naming this rule.
  - Views: the fit's wake beat (`boiler-view.ts` `accepted` for `rail.boilerFit`: `holdForgeCall(FIT.wake)`, the
    breaker's call, the "You got" timer) and the train's waking key on the trains' wake edge (`Rail.trains` from −1),
    not on the accepted fit; the fit's clank and the boiler landing stay on the fit. Far Head's show, its forge cut,
    the call, the hoist and the rack's board are untouched.
  - Tests (`test/railway-line2.test.ts`, `test/railway-cart.test.ts`): the pedestal stands the tick Q5 completes; a
    fit accepted with the cart out leaves `Rail.trains` −1 and the breaker uncast until the cart's `REST` tick, and
    wakes both that tick; a fit with the cart home wakes at once (today's beat); a save and restore during the wait
    wakes on the cart's rest; the invariant holds every tick from `q5-finishing` through `trains-on`, `wagon-on` and
    `deck-laid`; `test/railway-works.test.ts`'s cart-at-camp test stays and now follows from it.
  - **Proof:** `npm run checkpoints -- q5-done boiler trains-on`; `npm run loop -- run` (boiler beat unchanged; trains
    on at the same time on the route, since no real fit beats the cart: see the ruling); `dev/look/evals/forge-handoff.ts`
    passing unchanged. **Done means** those, and the ruling's acceptance below.

  **As built, 16 November:** shared `line2Wake` gates the trains and breaker on fit plus cart REST; the pedestal and
  Far Head handoff are unchanged. v56 follows the loader yard's v55, in a separate bump commit. Fitted boilers remain
  visible while cold; wake steam, the forge timer and peers' ability flourish follow trains-on. The seeded wake is
  tick 3376 (+257); boiler remains 3099. The loop's Q5-to-fit is 77.9 s (75.4 s for the 3-player canonical order),
  with a 31.0 s haul: no route wait and the old-rule control has identical wake times. Forced proof shows the cart
  visible late in the wait from the framed old train, then REST and first steam at wake tick 3376; the early cart
  is out of sight. See [implementation and evidence report](../reports/rider-coach-r1a.md) for checks, first-frame
  inspection limits and all artifacts. Independent review remains the next owner's workflow; nothing shipped here.

  <a id="r1a-designer-ruling"></a>**Designer ruling, 16 November: wait at the trains' wake, not at the pedestal.**
  *What plays at Q5 today* (`far-head-view.ts`, `far-head-show.ts`, `forge-call.ts`, `part-hoist.ts`): from the
  completion edge, behind any reward card, the fanfare, two whistles and rockets at Far Head and the Village, an 8.5 s
  shared shot (Far Head leg 6 s with the Act 2 card at 1.5–6.0 s, then a 2.5 s cut to the pedestal where the crane
  lifts the just-cast boiler as the forge's call sounds), and the camera home facing the forge's 62 m plume. That cut
  is D1's as-built fix (owner, 15 November: the longer Far Head cutscene) for "after Far Head, nothing calls you back".
  *R1a as planned* would leave the pedestal hidden (`boiler-view.ts` hides it while the boiler is `'none'`) for up to
  27.7 s: the cut lands on an empty apron, the camera hands back to a forge with no plume, and the call sounds alone
  up to ~19 s later with nothing tying it to the show. A teaching fault: the beat's one job is to point at the next
  goal, and the player 600 m away at Far Head, with the glider's summit as the other pull, is choosing where to go.
  *The options.* (a) Leave it: keeps the invariant, breaks D1's cut and plume. (b) Pedestal at once, take refused
  until the cart is home: the invariant then rests on trains anyway, and a refused take needs a reason (new copy) for
  a wait the player cannot see the cause of. (c) A marker or the forge call during the gap: nothing exists yet to
  point at, and the marker is only for where nothing else works (10 November); the call already works. (d) Shorten
  at source: the cart home ~2× faster on its last trip reads as a glitch, holding Q5's show delays the payoff up to
  27.7 s (principle 7), and neither closes a hand-filled Q5 (gap up to ~93 s). (e) **Wait at the trains' wake:**
  keeps the invariant in its "trains on ⇒ cart at rest" half, which is the half that matters (`boilerFit` was only
  ever the route to a train); costs the wake split out of the op and two invariants restated.
  *Ruling: (e).* The boiler casts and the show plays exactly as today. A player meets the wait only if the fit beats
  the cart home, which the route's timing never allows: the haul is 157 m between the reaches (172 m less 6.6 and
  8.0) at the helped 5.4 m/s, ≥ 29 s after Q5 completes, against the 27.7 s worst gap (estimated; the builder
  measures it). In a hand-filled Q5 or a fast-tuned room, the boiler clanks onto the old train, which stays cold
  while the cart rolls home, and wakes the tick the cart rests. No new string, no marker, no refusal.
  **Acceptance (observable):** (1) `forge-handoff` passes unchanged: at `q5-finishing` → complete, the cut shows the
  boiler lifted 1.6 m and the call at 6.05 s; (2) on the route, `loop -- run`'s Q5-complete-to-fit time ≥ 27.7 s and
  trains-on not later than today; (3) a forced wait (room tune `railBoilerHelpSpeed` 2000, fit with the cart out):
  stills of the fitted boiler on the cold train with the cart in frame, then the first frame of steam on the cart's
  rest tick, and a real-time clip from the fit to the wake; if the cart is not in sight from the old train, the
  builder says so and the designer re-rules. Logged in [agent-calls](../agent-calls.md).
- [ ] **R1b. Home proven for the coach train, today's track (S).** Sync: none (tests and level rows only). Tier:
  normal. Builds: Codex gpt-6.1-sol medium. Bump: no (no production value moves). After R1a. **Option A, recommended
  on merit ([Home on merit](#home-on-merit-a-b-and-c-16-november)):** with R1a the cart's leg is dead track whenever a
  train can stand at the Village, so
  R2b's train stands at 21.65 with its long engine's nose at s 28.35, 3.35 m onto today's R 18 arc (0.31 m off the
  straight's line) and 2.35 m past the leg's points (s 26). Nothing at Home moves: no relay, no Q2 change, no tree.
  - **Posed-train stills:** [Home coach train comparison](../world/home-coach-train.html) — today and option A, six fixed camera pairs; visual evidence only.
  - `test/home-station.test.ts`: "both stops on the straight" gains R2b's planned row (the steel train at 21.65 with a
    3.40 m coach pitch: every car but the engine on the straight, the engine at most 3.5 m into the arc); "road 2 in
    order" lets the planned row's nose pass the leg's points, citing R1a's invariant; the crossing's "far end has no
    room" assertion rewritten to the planned row (boards end 1.95 m behind its tail).
  - A new level row, `dev/level/home-cart.ts` in `npm run level-check`, in two phases that R1a makes exclusive.
    **Operating** (trains < 0): the cart's body swept every 0.25 m from line 1 s 54 through the leg, road 2 to s 0 and
    out along line 2 to s 120 against static geometry only (island and its ramps, both levers, the spur's turnout parts,
    Q1's and Q2's frames, Q2's rack and sign at full stock, the forge rack, trees), ≥ 0.25 m. **Standing** (cart at
    rest, hidden): the planned train at 21.65 against the same static set, ≥ 0.25 m (measured: island 0.58, leg lever
    1.13). The probe `dev/level/rider-coach-probe.ts` (read-only, committed) holds today's numbers.
  - **Proof:** level-check exit 0 with the new row; `look -- --rail-seed wagon-on` stills with the planned train's
    footprint drawn (debug overlay, as the fit check's), opened: from the island toward s 28, from the square through
    the hall's bays, from the table toward road 2. These are the evidence for owner question 2 (the engine standing on
    the curve over the idle leg). **Done means** that.
- [ ] **R1c. Option B, only if the owner picks it (question 2, b): the relay (L).** Sync: Server data (catalog). Tier:
  **independent review** + visual. Builds: Codex gpt-6-astra high; review fresh astra high. Bump: yes (rides R1a's if
  built together). The builder's stop report (`git show aba7158b2:docs/reports/rider-coach-r1.md`, branch
  `t3/home-road2-rework`) and the probe give the numbers; the size grew from M because of findings 2–3 and the
  audit below.
  - Head: straight 28.4, right arc 18.49 m, straight, left arc 25 m, `join: 90` (the least-moving exact closure with
    both arcs ≥ 18 m and the up track no tighter than today's 14.07 m): the track moves up to **4.37 m** at s 69 (the
    builder's J 89 / 18 m candidate: 5.11 m), up track 18.24 m (14.70), tree 217's centre 3.64 m (3.08), Q2's frame
    3.52 m (3.67), `forgeCm` 20916 (+284). No closure with both arcs ≥ 18 m moves less than 4.37 m.
  - Leg: R 15 / straight / R 15 to road 2 s 29.4, re-solved on that head (37.76 m).
  - **Q2's frame (finding 2):** the binding rule is today's placement, `frameBesideLine` (7.5 m off the down track at
    s 40.5, side −1, same yaw rule), plus a measured clearance to the **actual eased up track**: frame centre ≥ 6.29 m
    from its centreline (today 6.35, relay 6.34) and every frame collider ≥ 0.25 m from a trailer swept along both
    tracks. The 3.49 m figure was the hypothetical fully offset track; it binds nothing.
  - **Q2's rack (finding 3):** at **+31° on its 10 m haul circle, turned so its logs' ends face the frame**: about
    (960.17, −14.57), 1.0 m behind the frame and 9.95 m out. Measured with the full stack (32 logs, 2.62 m high, inside
    the rack's 2.4 × 1.74 m plan) and its sign: cart 2.40 m, trains on either track 13.9, frame 6.27, nearest tree
    centre 26 m, ground 0.18 m across the footprint, the straight walk to the frame crosses no track. The inherited
    6 m / 8 m spot fails (cart −1.52, ground 0.48, the walk crosses the leg); the builder's −9.8° (cart +0.25) has 0.44 m
    of ground under it and its walk crosses the leg. `line2-view.ts` `depotPlace` takes the new offset and yaw.
  - **Audit (required, not done):** everything within 1 m of the moved down and up tracks s 25–90, the up track's
    turnout rails, the leg, the island's end ramp, the town plots, the rotunda and the machine sweep: tree 217's trunk
    and canopy against a train's swept body (no tree is removed; if it fouls, this option fails), the bot's route to
    Q1 and Q2, before/after stills at the five cameras of the stop report, a real-time clip of the cart through the leg.
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
  free number (likely v57): "every line 2 train pulls the riders' coach behind the players' car; eight rider places a
  train (was four); the tail reaches 16.1 m; line 2's Village stop 21.65 m, Ring Island's 3.4 m on". After R1, L1 and
  V2 (Order).
  - `cars.ts`: `RIDER_CAR`, the rider role at index 2 on a line with a rider route. `src/sim/railway-lines.ts`,
    `railway-ring-layout.ts`, `src/place/layout.ts` `LINKS` stops, `car-spacing.ts`: as the rules table.
  - **The rule, 4 → 8** (moved here from first-town S1, which ships four): `TRADE.riderPlaces` 8, its comment "eight
    in the riders' coach"; `dev/economy/trade-model.ts` `riders.perCar` 8 and both economy pages regenerated; the
    `house-built` replay golden and the host trace re-pinned naming the rider cap (this step's bump). No other `4`
    literal for riders anywhere (`rg`).
  - `train-view.ts`: the blockout in the 2.90 × 1.60 × 2.05 m envelope (over rail), so riders show, in **two flat
    colours** (the brief's honey timber body, dark iron underframe; no grey, which reads as a missing texture in a
    painted train): deck at 0.70, waist-high sides and ends to 1.30, **five posts a side** (four openings, one rider
    in each, so the openings read as windows, not a walk-in slot), flat roof slab at 1.95–2.05, two bench blocks
    0.22 m over the deck along the sides. One kinematic box collider of the whole envelope (players stand on its roof as on
    the boiler top; they cannot sit with riders: the [separate seats](../decisions-rail.md#d-2026-11-16-rider-seats-are-not-player-seats)).
    Rendering, hiding, grow-in, carry, bounds include it; `riderCar` points at it.
  - `folk.ts`: V1's four `RIDER_PLACES` on car 1 go; `COACH_SEATS`, eight anchors 4 + 4 on the benches facing in,
    0.60 m pitch (previz A), each centred in an opening, `rideUp` the bench height; riders sit (the pose riders had
    before V1). **Fill order alternates sides** (rider k on side k mod 2), so either side shows how full the coach is.
    Boarding: today's walk from the platform to the nearest door end, across the 0.85 m gap (R3 draws the step).
  - `garage-data.ts`: `BOILERS` `pulls` 4 / 4 / 5 with a comment (the coach comes with every passenger train and does
    not use the allowance, owner 16 November; Strong's extra car stays cargo). The Cars tile keeps reading its counts
    from data (S1's `playerSeats`, `TRADE.riderPlaces`, so it reads 4 seats, 8 riders); only its desc changes, per
    Strings.
    `docs/plans/garage-choices.md` and `train-progression.md` readouts follow. `garage-view.ts`: no coach.
  - `works-view.ts` (V2's arm), `train-view.ts` footing flights: their target is the kit role's pose, now 3.4 m aft at
    the Quarry; if V2 shipped a literal, it moves here.
  - Tests: `test/railway-trade.test.ts` (S1's parameterised boarding at 8: nine waiting, eight board, one stays; a
    full train boards nobody), `test/economy-trade.test.ts` (S1's q6 vector `[36, 54, 72, 72]` re-pinned at 8: the
    third house now raises fares), `test/railway-lines.test.ts` (behindCm 1610 = `TRAIN_TAIL_M`), `test/home-station.test.ts` (stop 21.65,
    4.65 m ahead of abeam; R1's planned rows become the real ones), `test/railway-works-layout.test.ts` (`WAGON_S`
    derivation; Pier nose unchanged 733.20, 1.20 m off the parked layer), `test/railway-ring-layout.test.ts`,
    `test/railway-ring.test.ts`, `test/train-car-clearance.test.ts` (the coach in the sweep), `test/railway-placement`,
    `-retained-blocks`, `-end-path`, `-trains`, `-route-rules`, `-r4b-views`, `review-v26`, `greybox-works`,
    `garage-geo`, `rotunda` (copy unchanged), `server/test/railway-steel-host.test.ts`; `dev/level/{ring,rail-network,
    rail-map}.ts` read `TRAIN_EXTENT` and the stop (no 1270 literal). New: **every served halt** (the fit check's
    table, production `trainPlaces`/`deckAt` poses): player and rider car bodies beside their platform's deck, except
    the Quarry offset player car's existing −1.62 m (asserted no worse); **the staged queue**: two line 2 steel trains
    at `sepCm` on line 2's offset approach (worst s 85), body gap ≥ 0.5 m; the Home spans (tail 5.55 m past the spur's
    points at 5.5, boards 1.95 m behind, nose 28.35: with R1b 3.35 m onto today's arc and 2.35 m past the dead leg's
    points, 0.58 m off the island and 1.13 m off the leg's lever; with R1c on the 28.4 straight, 1.05 m short of the leg).
  - **Proof:** `npm run level-check` (Ring rows: Level finding 5); `look --rail-seed fares-running`: the coach at Home
    from the island and from both sides with eight seated (**count read**: at game zoom each side shows four
    distinct riders, one per opening, not fused with the far four into a band: the failure V1 hit), with three seated
    (two one side, one the other), at the Pier, at Ring Island (the steel gantry on the steel
    car), at the Quarry (the Works arm onto the kit car); `npm run perf` cost reported (seven more car meshes, one
    collider each). **Roof reach** (route contract): the roof at 2.05 m is 0.30 m above today's tallest standable
    car top (the boiler, 1.75); a stated measurement at every served halt that no ledge, canopy or work edge comes
    into a held jump plus air jump from the roof that the boiler top did not already reach. **Done means** tests, level-check, stills opened, `npm run loop -- run` with order and bills unmoved.
- [ ] **R3. The coach's art (M; sheets S).** Sync: Local. Tier: normal + visual. Sheets: Codex gpt-6.1-sol medium (only
  Codex paints); build: Codex gpt-6-astra high with the asset-author skill. Bump: no. After R2b.
  - **Brief.** Candidate A of the [previz](../world/rider-coach.html), the panelled four-wheel bug box, inside the R2
    envelope: **2.90 × 1.60 m, roof ≤ 2.05 m over rail**, deck 0.70, 2.20 m axle spacing (the fit check's sweep; the
    previz drew 2.80 × 1.80, and a wider body needs a new sweep). Panelled lower shell, low arc roof, window posts,
    **four unglazed droplight openings a side**, low sills so hats and faces show, two benches 4 + 4 facing in, a door
    at each bench end on both sides, dark iron four-wheel underframe, couplers at the kit's height. Palette: honey
    timber #b98a52, brown posts #5c4530, dark iron #2f3131, restrained red #a33a2c, small brass; no lettering, lining,
    rivets, lamps or glass. Empty: light through the openings and bench slats; full: four hats a side, the far four
    partly behind. Boarding across the 0.85 m gap (1.65 m edge − 0.80 half width): a short fold-down step at each
    door, drawn down only while the train stands at a halt, no collider (design review: an agent's default).
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

**Order against L1.** S1 + V1 ship first with **no bump** (v54; four rider places, plot 3 at 1,600). **R1a can start
now** (it fixes main's cart-through-train overlap and waits on no choice) **and runs in parallel with L1** (no shared file except `namespace.ts`, the goldens and the host trace: the second to ship rebases,
re-pins and takes the next number; if both are ready together they share one); R1b follows R1a (no bump; R1c, if
chosen, replaces R1b and rides R1a's bump when built with it). **R2a lands after
V1 and before V2 is built**, so V2 targets the kit role and its arm stands beside the kit role's pose at the Quarry
stop, not a literal; L1's sim rules are index-free. **R2b after R1a + R1b (or R1c) and after L1+V2 ship** (V2 and R2b both edit
`train-view.ts` and the arm's target; R2b moves the kit 3.4 m aft at the Quarry and the arm follows by data). Then
R3, then R4. Bumps: **R1a and R2b, one each** (L1 and R1a take v55 and v56 in ship order, R2b likely v57; R2b also
carries the 4 → 8 rule and its `house-built` golden move, which it re-pins anyway); R1b, R2a, R3, R4 none (R1c none of
its own if built with R1a). They cannot share one: R1 must ship and be proven alone (owner's point 2), and moving the stops without the coach
(R1 as first sketched) would shift every freight car 3.4 m and then shift it back (Level finding 1).

## Level findings

Measured at `916f570fb` with production `march`/`roadAt`/`lineAt` (scratch scripts, not committed) and
`npm run level-check` (exit 0, 17 reports, 15 known planned-track failures, none new). Findings 2–4 and 7–10 revised on `0b9933ec2` with the
committed read-only probe `dev/level/rider-coach-probe.ts`; finding 11 added on merit re-evaluation.
1. **The stops move in R2b, not R1.** Moving both marks +3.4 m with today's trains moves the kit, wagon and steel
   3.4 m forward: the waiting wagon (`WAGON_S`) and the shunt misalign at Home, and at Ring the steel car's centre
   (S 444.0) falls 3.4 m off the jib's arm (u 440.4–440.8). With the coach, the same move keeps every freight car
   where it stands today (Home kit 14.55, kit rear 12.95, wagon wait 10.85 with its 0.50 m gap; Ring steel 440.6 S
   / 436.9 WS) and moves only the engine and the two passenger cars. Depots, boards, till and gantry stay.
2. **Home's head cannot keep its s 84 join** (relay only, R1c). A 28.4 m straight closing on today's line at s 84 needs
   arcs of about 10–12 m: fails. Exact closures with both arcs ≥ 18 m (probe `solves`, revised 16 November): the
   least-moving is J 90 with arcs 18.49 / 25 m, **4.37 m** at s 69; the builder's J 89 / 18 m candidate moves 5.11 m;
   J ≥ 91 moves 5.4–10.9 m. Every move is north (away from the table), largest at s 60–70. The first revision's
   "about 4.5 m" was a coarse solve, superseded.
3. **Q2's frame** (relay only). Placed by its rule, it moves 3.5 m with the track and stays 6.34 m from the actual
   eased up track (today 6.35): the up track is only 0.99 m into its 20 m easing at s 40.5. The 3.49 m of the first
   revision was the hypothetical fully offset track; the 0.51 m that followed from it was wrong.
4. **The rotunda side gains room** (relay only). Nearest drawn-track distances grow: garage crew 8.98 → ~13 m, jib
   9.29 → ~13.6, stall −3 door 17.4 → ~22; table centre (15.83), yard (5.34) and stalls 0–3 unchanged. North of the
   track tree 217 stands 3.64 m from the relaid centreline (3.08 on the builder's candidate): trunk and canopy unproven.
5. **Ring Island after R2b** (tail 16.1, nose 8.2, stop u 451.4): tail 435.3 (as today), 18.3 m clear of the
   crossover, 4.8 m north of the planks (≥ 3), 0.7 m past the ramp top, nose 459.6 ≤ 468, 23.4 m short of the buffers
   (≥ 14.7); held at the signal the tail is at u 370.7, 93.7 m past the hinge, 120.7 m past the Railhead's stop.
6. **Home after R2b:** player car 20.05–23.25 on the deck (5.70–23.70; 0.45 m inside), coach 16.65–19.55; the
   road 2 lever (s 22.3) now stands beside the player car, 0.55 m off its body; boards end 1.95 m behind the tail.
7. **The leg** (relay only) closes with R 15 arcs from line 1 s 54 to road 2 s 29.4 (37.76 m on the J 90 head),
   4.6 m before the up track's merge at s 34 (8 m today). Q2's rack at its inherited 6 m / 8 m offset then stands
   across the cart's path (−1.52 m) on 0.48 m of uneven ground; +31° on its haul circle, logs facing the frame, clears
   everything (R1c).
8. **Not measured, owed by the steps:** the cart's operating sweep against Home's static set (R1b's row; today's Q2
   rack 3.21 m clear of it); a queued train's chord poses at the new Home signal (s 70.1) (R2b); seated knees, hats
   and door access (R3); each player seat exit at the Quarry; boarding in motion, multiplayer, device cost (R4); future
   Strong consists and later lines' stops (not certified here); with R1c, its whole audit.
9. **The cart and the trains coexist on main today** (planner's revision, 16 November, probe `cart`). Nothing keeps
   them apart: line 1's trains hold while the cart is out, line 2's do not, and `boilerFit` does not wait for it. The
   route's own seeds show it: at `q5-done` (tick 3099) the cart is on its way back at line 2 s 4; at `trains-on`
   (3119) it is on road 2 at s 0.14 heading for the leg, so it drives through the train that has just woken standing
   at the Village in the next few seconds, and is home at 3376. On the route's timing the gap is 277 ticks (27.7 s), the most it can be when the cart brought Q5's kit.
   The view draws the cart whenever it is not at rest. So the static sweep the first revision asked for was not only
   contradictory: the overlap is real for half a minute after every first wake. R1a closes it for every option.
10. **R2b's train on today's track** (probe `noRelay`): nose s 28.35, 3.35 m into the R 18 arc, 0.31 m off the
   straight's line; 2.35 m past the leg's points; 0.58 m off the island (today's train 0.65); 1.13 m off the leg's lever
   at s 27.5; 5.65 m short of the up track's merge (s 34). The leg's points stand under the engine, harmless once R1a
   holds: no train and cart share a tick.

11. **One more car at Home** (probe `growth`, 16 November): stop s 25.35, deck to s 26.95 (+3.25 m), end ramp to
   30.95 over the leg's line (the leg 1.05–1.8 m north of road 2 at s 30–31; the island starts 1.65 m north), nose
   7.05 m into the arc and 1.37 m off line, reach ahead 0.45 m short of the up track's merge; two more cars −3.25 m
   into it. No relay with both arcs ≥ 18 m puts that nose on a straight (joins s 90–100).

## Risks

- **Hotspots:** `train-view.ts` (V1, V2, R2a, R2b), `railway-lines.ts`, `namespace.ts`, the goldens: rebase first.
- **Room safety:** no op, apply or receipt changes; the extent change moves signals and end blocks on a live host,
  so R2b is a fresh-world bump with replay and `trainPlaces` tests, not a hot change.
- **Mixed builds:** dev phase; each bump has its dated history line, no compatibility code.
- **R1a changes the wake, not the boiler beat** ([designer ruling](#r1a-designer-ruling), 16 November): waiting at
  the pedestal would have hidden Far Head's forge cut and the plume for up to 27.7 s (longer for a hand-filled Q5,
  bounded by one cart cycle, 127 s less Q5's lay). The trains instead wake when the fit and the cart's rest have both
  happened; on the route the fit cannot come first. The fit's wake beat must follow the wake edge, not the fit.
- **Option A rests on R1a's invariant.** The leg's points stand under the coach train's engine; that is safe only
  while nothing runs on the leg after the trains wake. A later plan that revives the cart, or puts any vehicle on the
  leg once trains run, must relay road 2 with the leg's points at least s 31.3 (the nose 28.35 + the cart's 2.7 m +
  0.25), which B's 29.4 does not meet either (the cart's body at B's leg end overlaps B's nose by 0.31 m).
- **With R1c only:** the 4.37 m move between s 28 and 90 is new geometry the fit check never saw, beside tree 217
  and through Q1 and Q2, the first two stretches every player lays; its audit and stills are the gate.
- **Performance:** seven coach meshes and colliders, eight seated figures a train (V1 draws four standing);
  reported with `npm run perf` in R2b, not a reason to cut.

## Strings (placeholders; none of The Boogler's copy touched, no suspect line found)

- Garage Cars tile: its name stays S1's data-driven `${playerSeats} seats, ${TRADE.riderPlaces} riders` (reads
  "4 seats, 8 riders" after R2b); desc becomes **"The knifeboard car seats ${playerSeats} players; the riders' coach
  behind it seats ${TRADE.riderPlaces}."** (placeholder; S1's desc puts the riders on the knifeboard car, untrue once
  they ride the coach). Stats: Seats 4, Riders 8 (read from data).
- Boiler readout "Cars it pulls": numbers only, 4 / 4 / 5.

## Planner's owner questions (both resolved by the design review as agent defaults; see below)

1. **How do riders cross the 0.85 m gap to the coach?** (a) **Recommended:** a short fold-down step at each door,
   drawn only while the train stands at a halt, no collider; (b) they hop the gap, no step; (c) a fixed footboard
   along the body (outside the swept 1.60 m: a new sweep).
2. **Line 1's timber train carries no riders today. Does it pull a coach?** (a) **Recommended:** not yet; the coach
   comes with every train on a line that carries riders, line 1 gets one with its rider route; (b) yes, an empty
   coach on line 1 now (it fits: the fit check's line 1 row).

## Design review (designer, 16 November)

**Verdict: build with changes** (folded above). The plan builds three owner calls faithfully and its two departures
are right. Read: DESIGN.md, owner-calls (Level and world building, greybox, live dev, no bump waits), the four
decisions, [rider-car-fit](../research/rider-car-fit.md), [first-town four places](../reports/first-town-four-place-rework.md)
(on `t3/first-town-rider-places`), place.md's Home sections. Looked: `look --rail-seed wagon-on` stills of today's
Home from the square through the hall, top-down over s 0–95 and from beside Q2's frame. Not seen: the moved track
(it does not exist yet), the coach, any motion.

**The fact that changed (eight standing riders failed; four until the coach).** Folded: R2b now carries
`TRADE.riderPlaces` 4 → 8, the economy model and pages, the boarding test at 8, the q6 vector and the `house-built`
golden/host trace (its bump covers them); the garage tile reads both counts from data; numbers shift (L1/R1 v55–v56,
R2b likely v57). What else leaned on eight standing: the Goal line, the Design sync table (a Server catalog number now
moves), V1's places in `folk.ts` (four, not eight), the perf risk and the Strings: all corrected. Nothing in R1, R2a,
L1 or V2 depended on it. **Payoff consequence:** at four places the third house is capacity-limited (72/min with or
without it, S1's q6 vector `[36, 54, 72, 72]`), so the third added house pays no extra fares until R2b. Acceptable
as a short interim in live development, but R1 → R2a → R2b is that house's payoff, so it should not slip behind
art work; R2b's ship note shows the vector rising.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Coach A, directly behind the players' car; players' car unchanged | Decided | [coach A](../decisions-rail.md#d-2026-11-16-rider-coach-a-and-rework) (1), [dedicated car](../decisions-rail.md#d-2026-11-16-riders-get-a-dedicated-car) |
| 2 | Home and Ring reworked and proven before the coach is built (R1 first) | Decided | coach A (2) |
| 3 | Coach outside the allowance; readouts 4 / 4 / 5; Strong's extra car cargo | Decided | coach A (3) |
| 4 | Eight rider places a train, separate from four player seats | Decided | [first-town answers](../decisions-rewards.md#d-2026-11-16-first-town-lesson-answers) (2), [separate seats](../decisions-rail.md#d-2026-11-16-rider-seats-are-not-player-seats) |
| 5 | Four places on today's car until the coach; 4 → 8 ships with it | Decided | orchestrator's ruling, 16 November ("what's on screen is true") |
| 6 | Stops move in R2b with the coach, not R1 | Default | Agree: freight never moves twice; the stop move lands with the car that needs it |
| 7 | Home's head rejoins at s 89 with 18 m arcs; track up to 4.5 m off the table side, s 28–89 [revised: R1c only, s 90, up to 4.37 m; R1b moves nothing] | Default | Agree, with R1's proofs (below) |
| 8 | Q2's frame and log rack move with the track, side, s and offsets kept [revised: R1c only; the rack turns +31° on its haul circle] | Default | Folded into R1 |
| 9 | Coach 1.60 m wide (fit check), not the previz's 1.80 | Default | Keep: 2.90 × 1.60 is the FR carriage's own 1.8:1, more period than the previz; R3's sheets drawn at 1.60 |
| 10 | Players may stand on the roof (2.05 m) but cannot get in; one envelope collider | Default | Keep, with the roof-reach check and window posts (below) |
| 11 | Riders cross the 0.85 m gap on a fold-down step, drawn only while standing, no collider (R3); walk across in R2b | Default | Planner's question 1, (a) |
| 12 | The coach comes with a line that has a rider route; line 1 none yet | Default | Planner's question 2, (a); keyed on `lineRoute` |
| 13 | R2b's blockout in two flat colours with five posts a side, eight seated, fill alternating sides | Default | Folded into R2b |
| 14 | Riders sit 4 + 4 facing in at 0.60 m, one per opening | Default | Previz A; the count read is the owner question |
| 15 | Cars tile desc (placeholder) and data-driven name | Default | Folded into Strings |
| 16 | Cart road 2.7 m longer (+0.3 s a round trip) | Default | Negligible |

**1. The departures.** (a) Right: moving the marks in R1 would shift the kit, wagon and steel 3.4 m and back; in R2b
only the engine and passenger cars move. (b) What a player at Home sees change: from the square through the hall's
bays (still taken) the s 28–89 stretch is 35–75 m away behind the island, gantry and hall posts; a 4.4–5.1 m lateral move
there turns its bearing about 4–6°, below what anyone notices. From the table it gains room (garage crew 9 → 13 m),
which answers the owner's "cramped" Roundhouse note. Routes: every walk from the hall to the table and stalls crosses
road 2 at s ≤ 25, unchanged; the bridge join is beyond s 89, unchanged. No board or depot other than Q2's stands in the
stretch. The real exposure is **teaching**: s 7–122 is Q1 and Q2, the first two stretches every new player lays, Q2
the glider's stretch with the heavy-haul rack. That is fine if Q2's frame keeps its relation to the track and its
10 m haul (folded), the bot still reaches both frames, and no Q1/Q2 tree is lost under the new corridor (frozen v35
exclusions; folded). Stills: before/after pairs at fixed cameras, plus a real-time clip of the cart through the leg,
which now lands 4.6 m before the up track's turnout. **Not an owner gate:** "a well-designed town, not a view from
spawn"; the top-down pair goes in his ship report.
**2. R1 alone is shippable.** Rooms start fresh at its bump, so no player sees a "before"; a longer straight and a
frame beside the track read as track and a frame. Nothing looks half done.
**3. Boarding.** The step serves show, don't tell (the train is standing, come aboard) and "machines show their work
physically"; a 0.85 m hop for a 1 m little guy is slapstick but reads as a missed gap, and a footboard costs a sweep.
It is an agent's default: a drawn part, cheap to change, seen at R3's stage stills. Under the greybox call R2b adds no
step or hop motion.
**4. Line 1.** Riders ride only lines in `TRADE.routes`; an empty coach on the timber train would claim riders who
cannot come ("what's on screen is true"). "Comes with every passenger train" reads as every train that carries
riders. Default, not a question; keyed on the route so it arrives with line 1's riders without a new call.
**5. Defaults.** Width: keep 1.60. Inside: players are kept out because the coach is the riders' place (separate
seats); that is consistent, but an open 1.30–1.95 m band over an envelope collider is an invisible wall, against
"barriers read as not this way"; five posts a side and a rider in each opening make it read as windows of a full car.
The roof is the new tallest standable train top (+0.30 m over the boiler), so R2b states the reach at every halt.
Copy: S1 made the tile data-driven; keep that; only the desc changes.
**6. Greybox live.** Acceptable under "mechanisms, then systems, greybox, details" and "development is live": the
coach is the mechanism that makes eight places true. Minimum: eight seated riders countable from both sides at game
zoom, coupled visibly between players' car and kit, openings as windows, a gap at each door end. Flat body colours,
not grey.
**7. Order and bumps.** The order pays off: R1 is invisible infrastructure, R2b shows the coach, the eight and the
third house's fares at once, R3 dresses it. Two bumps plus L1's is the fewest unless R1 and L1 ship together (then
one); none waits for company.

**For the code and level reviewers to confirm.** R1: level-check exit 0 with the new cart-through-leg row; Q2's frame
7.5 m off the down track at s 40.5 (6.34 m from the eased up track) and its rack's 10 m haul clear of the leg; no tree removed; the up track ≥ 14.1 m;
the production bot reaches Q1 and Q2; the before/after stills and clip opened. R2a: `consistOf` reproduces today's
offsets byte for byte. R2b: one source for 8 (no rider `4` literal, the tile reads data); goldens and trace re-pinned
naming the cap; nine wait, eight board; the rider role keyed on the route; the count-read stills; the roof-reach
statement; Home's tail clear of the spur points and nose 1.05 m short of the leg [revised: with R1b, 2.35 m past the
dead leg's points under R1a's invariant].

**Owner question** (the build proceeds on the recommendation):
1. **From one side, the coach shows four riders; the other four sit across the aisle and show from the other side.
   Is that the read you want?** (a) **Recommended:** yes; each side's four openings full means a full coach, and riders
   fill alternate sides so half-full shows on both; (b) all eight from one side (a raised far bench or open roof
   lights), at the cost of R3's shape and the 2.05 m roof.

**Logged** in [agent-calls](../agent-calls.md) (rail, open): calls 6–16, grouped.

## Revision, 16 November: R1 after the builder's stop

**What changed and why.** The R1 builder (`t3/home-road2-rework`, `aba7158b2`, report `docs/reports/rider-coach-r1.md`
there) stopped correctly on three findings; the planner re-measured them from the rules, the views and the level's
data with the builder's probe, extended and committed read-only as `dev/level/rider-coach-probe.ts`
(`node --import ./dev/sim/hooks.ts dev/level/rider-coach-probe.ts`).
1. **The cart and a standing train:** they can coexist on main (Level finding 9), so the requested static sweep was
   both contradictory and pointing at a real overlap. Ruling: prove temporal exclusion by a rule, not by space.
   R1a makes the pedestal wait for the cart at rest; since the cart never leaves rest once Q5 has started, no train
   can ever share a tick with it, and an invariant checks it. The acceptance becomes R1b's two phases (cart against
   static geometry while it runs; the standing train while it rests).
2. **Q2's frame distance:** the binding rule is today's placement (7.5 m off the down track by `frameBesideLine`),
   with clearance measured to the eased up track (≥ 6.29 m, colliders ≥ 0.25 m from a swept trailer). The 3.49 m
   figure is corrected here and in the design review.
3. **Q2's rack:** at +31° on its 10 m haul circle, logs facing the frame (R1c); the inherited offset and the builder's
   −9.8° both fail on ground and on the walk crossing the leg.

**The bigger consequence.** With exclusion proven, the cart's leg is dead track whenever a train can stand at the
Village, and the two invariants that forced the relay ("the nose stands on the straight", "the nose stands short of
the leg's points") have no physical reason left: R2b's engine stands 3.35 m onto today's 18 m curve, 0.31 m off line,
over the leg's points. So the recommended Home rework moves **no track**: R1a (S) + R1b (S) replace the M step, and
the relay becomes R1c, an **L** (a 4.37 m move at best through Q1 and Q2 beside tree 217, Q2's frame and rack moved, an
unfinished audit). The owner approved the fit check's relay as the means; the goal, the longest train with the coach
fitting and proven before the coach is built, is unchanged, so the means is his to confirm. Kept: no stop moves in
R1, no tree is removed, Ring Island's +3.4 m stays in R2b.

**Owner question** (superseded the same day: the owner answered "If it's the right solution, let's not shy away from
the work", and the choice was re-made on merit in [Home on merit](#home-on-merit-a-b-and-c-16-november)):
1. **Fit the coach train at Home by keeping today's track (the engine stands 3.35 m onto the curve, over the depot
   cart's leg, which no longer runs once the trains do), or by relaying road 2 as the fit check proposed?** (a)
   **Recommended:** keep the track: nothing at Home moves, two small steps, the boiler may appear up to 27.7 s after Q5
   completes while the cart gets home; (b) relay: road 2's curve moves up to 4.4 m north between s 28 and 90, past a
   tree 3.6 m from the track, Q2's frame and log rack move, one large step.

## Home on merit: A, B and C (16 November)

The owner, offered A as "a fraction of the work": "If it's the right solution, let's not shy away from the work"
([right over less work](../agents/owner-calls.md#right-over-less-work)). Re-judged with effort set aside; sizes are
stated as facts on their own lines. Numbers from `dev/level/rider-coach-probe.ts` (read-only; sections `noRelay`,
`solves`, `rack`, `growth`, `cart`) are **measured**; line-wide numbers for a longer train are the fit check's or
**estimated**; anything marked **build** needs one to know.

**The longest train the plans call for at Home's road 2 is the coach train**, 22.80 m over bodies (23.20 with the
terminal buffers): the longer or big boiler's engine, the players' car, the coach, the kit car, the footing wagon and
the steel car; tail 16.10 m behind the players' car, nose 6.70 m ahead. Sources: the steel car on the long boiler and
the wagon ([fourth-car](fourth-car.md), [train-progression](train-progression.md) rung 6); the big boiler on line 2 at
High Gorge, "cars unchanged" ([garage-choices](garage-choices.md) G-d and its review call 12); the coach outside the
allowance ([coach A](../decisions-rail.md#d-2026-11-16-rider-coach-a-and-rework) (3)). Strong's extra car is offered
only on lines opened from stage 4 ([garage trade answers](../decisions-core-loop.md#d-2026-11-15-garage-trade-answers):
"Line 2 keeps the big boiler upgrade at High Gorge; no trade there"), and those lines leave from the West landing (bay, cave) and High Gorge (ns), not road 2
(`src/sim/railway-world-lines.ts`). Not decided, and the only things that could lengthen a road 2 train: cargo trains
of their own ("a later plan, after the greybox route", [12 November](../decisions-rewards.md#d-2026-11-12-cargo-trains-and-hub-towns-answered)),
rider places beyond eight a train ([dedicated car](../decisions-rail.md#d-2026-11-16-riders-get-a-dedicated-car):
"how many riders it holds beyond the 8" not decided), or Strong on line 2.

**So C, as asked, is A or B:** both already fit the longest planned train. What C would mean for **one more car**
(3.70 m, measured on today's track): the stop moves to s 25.35 (tail held at the spur's points); the island's deck
must reach s 26.95 (+3.25 m) and its end ramp s 30.95, where the cart's leg runs 1.05–1.8 m north of road 2, inside
the island's footprint from 1.65 m: the leg must be lifted when the trains come (dead by R1a) or rerouted; the
engine's nose 7.05 m into the curve, 1.37 m off line; the reach ahead 0.45 m short of the up track's merge (s 34).
Two more cars reach 3.25 m into the turnout's block: the up track's turnout must move, a new Home head. B cannot take
one more car at all: no exact closure with both arcs ≥ 18 m puts that nose on a straight (joins s 90–100 tried), so B
would be relaid a second time. Off Home, one more car also fails line 2's queue spacing by about 2.1 m at today's
`TRAIN.sepCm` (fit check), moves Ring Island's stop again and needs every halt re-swept (estimated). A longer train is
a line-wide decision, not a Home one.

| Criterion | A: today's track (R1a + R1b) | B: the relay (R1a + R1c) | C: Home for one more car |
| --- | --- | --- | --- |
| What a player sees at the platform | Every car anyone boards stands straight beside the deck; the engine's front 3.35 m stands onto the curve past the platform's end, 0.31 m off line, over the idle leg's points (measured) | The whole train straight, the nose 1.05 m short of the leg's points: the tidiest engine (measured) | Players' car partly beyond today's deck end; engine 7 m round the curve, 1.37 m off line (measured) |
| Boarding both passenger cars | Players' car 20.05–23.25, coach 16.65–19.55 on the 5.70–23.70 deck (measured) | Identical | Needs the deck +3.25 m over the leg's line |
| The read from the square and the hall | Unchanged | The s 28–90 curve 4.37 m north, 35–75 m away: about 4–6° of bearing (design review); **build** for stills | Island longer, leg gone at its far end; **build** |
| Clearances | Engine to island 0.58 (today's engine 0.65; every car to a platform edge is 0.55 by design), lever 1.13, merge block 4.15 (measured) | Same platform margins; straight spare 0.05; the 1.05 m to the points is no clearance for the cart (its body overlaps the nose by 0.31) (measured) | Merge block 0.45; tail at the spur's points as today (measured) |
| What it rests on | R1a's invariant: no vehicle on the leg after trains wake | The same invariant (see Clearances) | The same, plus the leg lifted |
| When trains grow again | Takes one more car with the island lengthened over the dead leg; two need a new head | Cannot take one more car without a second relay | Is that growth; two more need the turnout moved |
| Q1 and Q2, the first two track quests | Untouched: frames, rack, trees, bot route, laying sweep as proven | Q2's frame 3.5 m and its rack +31°; track 3.64 m from tree 217's centre, trunk and canopy unproven (**build**); the laying sweep and bot route re-proven | Untouched by Home's change; the island's far end changes |
| Risk to what is built and proven | Two tests relaxed with the invariant cited; nothing re-pinned | Line 2's path samples, `forgeCm`, Q2's catalog row, seeds and goldens re-pinned | Island, leg and halts reworked with a line-wide spacing change |

**Sizes, as facts.** A: R1a (S, one bump) + R1b (S, no bump). B: R1a (S) + R1c (L, a bump shared with R1a if built
together, full audit). C: R1a + an island extension, a lifted or rerouted leg, a moved stop and line-wide spacing, Ring
and halt re-sweeps: L or more (estimated), plus the decision that creates the longer train.

**Recommendation: A.** On merit: it puts every car a player boards straight beside the platform exactly as B does;
B's one real gain is the engine's last 3.35 m, which stands past the platform's end where nobody boards, and B's own
margins (0.05 m of straight, a points gap the cart's body does not clear) are no more robust than A's; B moves Q1 and
Q2, the first stretches every new player lays, beside a tree whose canopy is not proven clear, to buy that; and A is
the only option that can take one more car later without being relaid again. Both rest on R1a's invariant.
**What would change it:** (1) the owner, shown R1b's stills, finds the engine standing on the curve over the idle
junction wrong at Home (question 2: then B); (2) a plan puts a vehicle back on the leg after trains run (then a relay
with the points at s 31.3 or more, which B as drawn does not meet); (3) the owner decides line 2's trains grow
(question 1: then C on A's track, designed with that decision and its line-wide spacing).

**Owner questions** (the build proceeds on the recommended answers; R1a starts now regardless):
1. **Will line 2's trains ever grow past the coach train: more rider coaches as towns grow, cargo cars, or Strong on
   line 2?** (a) **Recommended:** not decided now; Home is sized for the coach train, and the plan that lengthens line
   2's trains brings Home's one-more-car change (the island lengthened over the retired leg) and the line-wide spacing
   with it; (b) yes, plan one more car now: Home's change joins R1, the spacing joins R2b.
2. **At Home, may the coach train's engine stand just past the platform's end, 3.35 m round the curve (0.31 m off
   line), over the depot cart's idle junction?** (a) **Recommended:** yes, judged on R1b's stills; (b) no, the engine
   must stand straight and short of the points: build the relay (R1c).

Answer (owner, 16 November): "I'm ok with your recs for 1-3": question 1 not decided now; question 2 yes (option A; the
confirmed on seeing the stills: "Keep today's"); and the designer's question, four riders a side, yes
([decision](../decisions-rail.md#d-2026-11-16-home-keeps-its-track)).

