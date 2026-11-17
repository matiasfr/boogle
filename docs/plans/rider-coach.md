> **Status: R1a, R1b and R2a built and on main (v56). R2b re-planned 16 November after its builder's second stop:**
> two level steps join it (R2b.1 the Pier's foot crossing, ships alone with no bump; R2b.2 High Gorge's crossover,
> inside the coach's v57), then R2b.3 the coach resumes `t3/rider-coach-blockout` at `15737dec1` (v57, not shipped).
> Designer, 16 November: R2b revision reviewed, **build with changes** (folded into R2b.1 and R2b.2);
> [review](#design-review-of-the-r2b-revision-designer-16-november).
> Planner, 16 November 2026, against origin/main `945c69554`. Builds the owner's
> [coach A, the rework and the allowance](../decisions-rail.md#d-2026-11-16-rider-coach-a-and-rework),
> [riders get a dedicated car](../decisions-rail.md#d-2026-11-16-riders-get-a-dedicated-car) and
> [Home keeps its track](../decisions-rail.md#d-2026-11-16-home-keeps-its-track) on the
> [fit check](../research/rider-car-fit.md) and the [coach previz](../world/rider-coach.html). Replaces
> [first-town-lesson](first-town-lesson.md)'s step A from its build on. Judged under
> [right over less work](../agents/owner-calls.md#right-over-less-work): sizes are facts, never the reason.
> The full text of earlier revisions: `git show 945c69554:docs/plans/rider-coach.md` (603 lines).

# The riders' coach: Home and Ring reworked, then the coach

## Goal

Every line 2 train pulls a small panelled period coach behind the players' knifeboard, and the eight riders who pay
fares sit in it where everyone can see them (today's car carries four until then). Serves **11. Show, don't tell**
(eight figures are the count) and the core loop's "grown towns". The track and the places the longer train stands are
proven before any art is made (owner's point 2).

## Design

| State | Sync kind | Authority and API |
| --- | --- | --- |
| Line 2's trains wake when the boiler is fitted **and** the depot cart is at rest (R1a, built) | Server (rule) | `railway-sys-line2.ts` `line2Wake`; invariant in `railway-check-line2.ts` |
| Line 2's Village and Ring Island stops, `TRAIN_EXTENT.behindCm` (R2b.3) | data (catalog) | `railway-lines.ts`, `railway-ring-layout.ts`; signals, end blocks, `trainPlaces`, `within`, `retainedEndBlock` follow |
| High Gorge's crossover (R2b.2) | data (generated catalog) | the `ring` row's end in `docs/world/map-prototypes.html` → `dev/level/world-blockout.ts` → `src/sim/railway-world-lines.ts`; read by `railEnd`, end blocks, the homeward path |
| The Pier's west foot crossing and start ramp (R2b.1) | Local (Place) | `src/place/layout.ts` `OFFSET_HALTS`, `src/prefab/halt-ramps.ts`, `halt-crossing.ts`; no rule reads them |
| The consist by roles (R2a, built); the coach in it (R2b.3) | Local, derived | `cars.ts` `consistOf`, from the train's row (`wagon`, `steel`) and its line |
| Rider places a train, `TRADE.riderPlaces` 4 → **8** (R2b.3) | Server data (catalog) | `railway-trade-layout.ts`; boarding caps `Train.riders` at it |
| The coach's mesh, collider, seats; riders seated in it | Local | `train-view.ts`, `folk.ts`; the count is `Train.riders` (unchanged shape) |
| Boiler readouts "Cars it pulls" 4 / 4 / 5 | data | `garage-data.ts` `BOILERS`; display only |

No new op, component, field, projection, prediction or registration; saves gain no key. The sim knows the coach only
through the longer `TRAIN_EXTENT`, the two moved stops and the rider places. With the coach a line 2 train is engine,
player 0, **rider −3.55** (`RIDER_CAR = { hx: 0.8, hz: 1.45, top: 2.05 }`), kit −7.10, wagon −10.80, steel −14.50
(−10.80 without the wagon). Line 1 has no rider route and no coach (keyed on `lineRoute(line) >= 0`); the garage's
works copy builds `consistOf` with no rider.

**Tails by consist** (metres behind the players' car, `dev/level/rider-coach-audit.ts` `consists`):

| Consist | Today | With the coach | Exists from |
| --- | ---: | ---: | --- |
| Plain (engine, players' car, kit) | 5.30 | 8.70 | the wake |
| With the footing wagon, or with the steel car | 9.00 | 12.40 | `wagon-on` (after Q6); `boiler-long` |
| The wagon's train with the longer boiler and its steel car | 12.70 | **16.10** | `boiler-long` (after the rivet) |

`TRAIN_EXTENT` is one reach for every train on both lines, so the longest consist sets every signal: 1270 → **1610**.
Only that one train, from `boiler-long` on, is longer than any train today.

## Steps

Each leaves `node dev/ship-check.ts` green. Tier is `npm run review-stamp`'s rule; builders from `npm run models`.

- [x] **R1a. The trains wait for the cart (S).** Built, v56: `line2Wake` gates the trains and the breaker on fit plus
  cart REST; seeded wake tick 3376 (+257); Q5's show, the pedestal and Far Head's handoff unchanged.
  [Report](../reports/rider-coach-r1a.md). <a id="r1a-designer-ruling"></a>**Designer ruling, 16 November:** wait at the
  trains' wake, not at the pedestal: a hidden pedestal would break D1's forge cut and plume for up to 27.7 s; the
  half of the invariant that matters is "trains on ⇒ cart at rest".
- [x] **R1b. Home proven for the coach train on today's track (S).** Built, no bump: at 21.65 the nose stands 3.35 m
  onto the R 18 arc over the dead leg's points; minima separate from ±0.01 m pins (`home-cart-pins.json`).
  [Report](../reports/rider-coach-r1b.md); [stills](../world/home-coach-train.html). R2b.3 re-pinned it for the real
  engine (island 0.607466, lever 1.160978; no minimum changed). **R1c, the relay (L): not built** ("Keep today's").
- [x] **R2a. The consist by roles, no coach (S).** Built, no bump: `consistOf` / `roleIndex` / `offsetOf` own the
  layout; old offsets pinned exactly. [Report](../reports/rider-coach-r2a.md).
- [x] **R2b.1. The Pier's west foot crossing, clear of the longest train (S).** Sync: Local (Place, prefab).
  Tier: normal + visual. Builds: Codex gpt-6.1-sol medium. **Bump: no**; ships alone on main now, with today's trains,
  ahead of the coach (today's 12.70 m tail then clears it by 4.20 m). [Options](#r2b-options).
  - `src/place/layout.ts` `OFFSET_HALTS` Pier: `crossS` 711.8 → **708.4** (planks s 707.2–709.6) and a new optional
    `headRamp: 9.4` on `UpHalt` (the start ramp's length; default 6); its comment's "clear of the full stopped train"
    stays true for the coach train. `src/prefab/halt-ramps.ts`: `head` reads `h.headRamp ?? 6` (the ramp s 709.6–719,
    rise 0.67 m: 4.1°, from 6.4°). `src/entities/railway/halts-view.ts` :322–326, the bots' and evals' walk off the up
    platform, reads the same length, not a literal 6. Prefab compile and freshness rerun.
  - Level rows (`dev/level/ring.ts`, Pier section): the crossing meets the ramp's foot
    (`crossS + CROSSING_WIDTH / 2 === s0 − headRamp`); the ramp walkable (≤ 15°, `WALKABLE_NY`); planks over no rail;
    no seabed or far-end ramp; "clears the full stopped train" reads the stop less `TRAIN_EXTENT.behindCm` (minimum
    **0.60**, pin 4.20 now; 0.80 at R2b.3); the roof-bypass row unchanged. `test/train-wheel-rail.test.ts`'s crossing
    curve check runs at the new s. **Q7's site deck** (designer): the planks' east end (lat +1.5) now lands beside
    Q7's piled deck (s 703–713, lat +1.8 to +6.0: log rack 705.2, rails' shelf 706.2, Q7's personal box 704, frame
    710; `q7-site.ts`), between the shelf and the frame, where it met the east ramp's foot (s 713) before. Rows: no Q7
    site piece within 0.6 m of the planks' width at their east end; the walk from there to the east ramp's foot stays
    open between the frame and the down track; the personal box stays off the planks. Nothing of the site moves.
    `docs/game-design/place.md`'s Pier paragraph: s 708.4, a 9.4 m ramp, the planks beside Q7's deck; its steel-car
    stepping-off lines restated where the ramp now lies beside that car.
  - **Proof:** before/after stills, fixed cameras, opened: from the west platform toward Home down the ramp; from the
    trestle beside the down track at the crossing's east end; from a homeward train's players' car standing at the
    Pier; top-down over s 700–745; (designer) the first sight on foot, walking north on the trestle's east side at s
    ≈ 690, eye height; and at `boiler-long` the wagon's long train standing homeward, from Q7's deck beside the planks
    toward its tail, so the 4.20 m gap is seen, not only measured. The designer reads them. The production bot's walk (halts-view path) from the west platform's lever down the
    ramp and across to the east end, and back, in the running game at `deck-laid` (`look`, a stated route, both ways).
    **Done means** level-check exit 0 with the new rows, the stills and the walk.
  - **As built, 16 November:** `t3/pier-west-crossing`; crossing centre 708.4, edges 707.2–709.6; west head ramp
    9.4 m in s, 0.67 m rise, 4.090301°. Platform, lever, stop, trains, Q7 site and server catalogs unchanged: no bump.
    Orchestrator's phase ruling: the 0.6 m site minimum applies to pieces that coexist with walkable planks; rack/shelf
    instead have a shared-state exclusion check (512 combinations). Q7's standing frame/feeder clears by 1.310301 m,
    every personal box by at least 1.476609 m. Today's tail gap is 4.20 ±0.01 m; planned coach row 0.80 ±0.01 m,
    both ≥0.60 m. Fixed before/after stills opened; production Q7 work/homeward ride and both-way walking pass.
    [As-built report, phase table, evidence and checks](../reports/rider-coach-r2b1.md). Prefab golden expectations changed:
    independent review before ship; designer/orchestrator reviews the stills and real-time clip. No push or ship.
- [ ] **R2b.2. High Gorge's crossover 3.40 m toward Home (S).** Sync: Server data (generated catalog). Tier:
  **independent review** (it moves an end block and signal). Builds: Codex gpt-6.1-sol medium. **Bump: rides R2b.3's
  v57** (its own commit on `t3/rider-coach-blockout`, before the coach). [Options](#r2b-options).
  - The `ring` row's end in `docs/world/map-prototypes.html`: `sCm` 319640 → **319300** (line 2 s 3192.0–3214.0);
    `dev/level/world-blockout.ts` regenerates `src/sim/railway-world-lines.ts`; the Gorge's end block, signal
    (3187.2 → 3183.8) and homeward path follow by data.
  - Tests and rows: `test/railway-route-rules.test.ts` :175 becomes a minimum (≥ 30 cm; 370 with today's extent, 30 at
    R2b.3), its comment giving the reason (below); the R2b level row's Gorge measurement; a new row: the last car's
    outward and homeward poses at the Gorge stop are the same (the turn moves no car; with the coach and today's
    crossover the steel car swings 0.08 m and 3.9°). The leg view draws no crossover: no scenery moves (the flag-only
    `?blockout=world` draws the row's X and follows the regenerated row).
  - **Implementation progress, 16 November:** generated crossover now s 3192.00–3214.00; reserved tail
    clearance 0.30 m, last-car standing-turn shift **0 m / 0 radians**. Corrected Gorge platform span is
    3210.40–3250.40. The map had no authored end coordinate: it now owns one `turnbacks.ring.end` override
    (319300 catalog cm), consumed by the generator; all other ends retain their 35 m setback. The flag-only
    world blockout's X follows this regenerated coordinate; production leg scenery is unchanged. Shares v57.
    Motion and full acceptance are completed with R2b.3, not claimed by this data commit.
  - **Proof and done means:** level-check; a fixed-camera pair from the north platform toward Home at `gorge-reached`,
    a train arriving and leaving (where it swings across is the only visible change); `npm run loop -- run` to the Gorge.
- [ ] **R2b.3. The coach in the train, a grey blockout (M).** Sync: Server data + Local. Tier: **independent review**
  + visual. Builds: Codex gpt-6-astra high; review a fresh gpt-6-astra high (or opus high). **Bump: v57** (taken on the
  branch): "every line 2 train pulls the riders' coach behind the players' car; eight rider places a train (was four);
  the tail reaches 16.1 m; line 2's Village stop 21.65 m, Ring Island's 3.4 m on; High Gorge's crossover 3.4 m toward
  Home". Resumes `15737dec1` rebased on main after R2b.1, with R2b.2 first.
  - **As built at the stop** (builder's report: `git show 15737dec1:docs/research/rider-coach-r2b.md`): the coach
    (2.90 × 1.60 × 2.05 m, honey timber and iron, five posts and four openings a side, one envelope collider), the
    rider role on routed lines, `TRADE.riderPlaces` 8, readouts 4/4/5, Home 21.65 and Ring +3.40, `TRAIN_EXTENT`
    1610, six-vehicle buffers, `legStartS` separating Ring's service mark from the leg's origin, Home re-pinned for
    the real engine, the fare vector explained (`[36.9, 54, 72.9, 72.9]`: Home's phase shift and the cap), 53 golden
    stages explained by isolated controls, 12 count stills opened (eight countable across the two sides). Keep it.
  - **Fix on resume:** the Gorge row measures against platforms s 3210.4–3250.4 (`gorge.ts`: the line's end less
    40 m), not 3200.4–3240.4 (it still passes); `test/railway-r4b-views.test.ts` :136 reads `TRAIN_EXTENT.behindCm`,
    not the legacy `TRAIN_TAIL_M`; `test/world-lines.test.ts` :119 compares the ring row's Ring stop with the moved
    service mark: restate it against `legStartS`; the queue row sweeps all of line 2 on both tracks, as the audit does
    (worst 0.94 m at s 84.9, homeward; minimum 0.5); the audit's rules become level rows with design minima and pins
    (each "Need" below a minimum, each "Coach" a ±0.01 pin). The other failures at the stop are pinned values and
    stale fixtures (stops, signals, cycle, headway, `119000`, a fixture train placed at the old Village signal 66.7,
    the census and rail-map freshness, a prefab seat fixture): re-pin each naming its cause.
  - **Still owed from the stop:** terminal and timber-only rows; T2 and world-inputs; full server suite; restart and
    late join at eight; the queued-train live staging; perf; the real-time clips (Home and Pier boarding, Home curve
    departure); a live garage proof; the owning game-design sections. **Roof reach:** the baseline is today's tallest
    standable tops (boiler top 2.50 m, cab roof 3.295 m, per the builder), not 1.75; state at every served halt that
    nothing comes into a held jump plus air jump from the coach roof that those tops did not already reach.
  - Riders appear seated while the train stands (orchestrator, 16 November; walk and step are R3); the Stack heads'
    homeward stops are named known gaps (finding 12). **Done means** tests, level-check exit 0 with the audit rows,
    the count, Pier and Ring stills, `npm run perf`, `npm run loop -- run` with order and bills unmoved.
- [ ] **R3. The coach's art (M; sheets S).** Sync: Local. Tier: normal + visual. Sheets: Codex gpt-6.1-sol medium;
  build: Codex gpt-6-astra high with the asset-author skill. Bump: no. After R2b.3.
  **Sheets and build brief (16 November):** [measured candidate A references](../world/rider-coach-a.html),
  [recipe brief](../world/rider-coach-a/brief.md). Art intent only; R3 build and runtime inspection remain unchecked.
  Candidate A of the [previz](../world/rider-coach.html) in the envelope (**2.90 × 1.60 m, roof ≤ 2.05 m**, deck
  0.70, 2.20 m axles): panelled shell, low arc roof, four unglazed droplights a side, benches 4 + 4 facing in, a door
  at each bench end, iron four-wheel underframe; honey timber #b98a52, brown #5c4530, iron #2f3131, red #a33a2c, small
  brass; no lettering, lamps or glass; a fold-down step drawn only while standing, no collider. Asset-author steps to
  `assets/src/rider-coach.py` with eight seat sockets, `coach-kit.ts`, `COACH_SEATS` from the sockets; riders through
  the doors. **Done means** stage stills, in-game stills empty and full from both sides, the skill's owner question.
- [ ] **R4. Evidence and checkpoint (S).** Runner: Codex gpt-6.1-sol medium; the main session opens the media.
  `npm run check:full`; `npm run loop -- run`; `npm run test:net`; stills of each halt with the art; **real-time
  clips**: riders boarding and alighting at Home and at the Pier; a player walking the moved Pier crossing and ramp
  onto the west platform and boarding a homeward coach train; the wagon's long train arriving at High Gorge and
  turning with no car twitching. `place.md`'s train section gains the coach; the backlog row updated.

<a id="r2b-audit"></a>
## The tail and nose audit (16 November)

What the fit check should have been: every rule in the level check, the sim's checks and the tests that keys on a
train's tail or nose against a crossing, crossover, points, signal, end block, parked vehicle, buffer or another
train, at every halt and on the line between, both ways. Reserved extents unless marked. Metres. Today = v56 (marks
as on main, tail 12.70); Coach = R2b (Home 21.65, Ring u 451.4, tail 16.10). Reproduce:
`node --import ./dev/sim/hooks.ts dev/level/rider-coach-audit.ts` (read-only). Nose rules move only where a stop does.

| Place, way | Rule (source) | Today | Coach | Need |
| --- | --- | ---: | ---: | ---: |
| Home line 2, both ways | R1b's row (`home-cart.ts`): tail past the spur's points; boards behind the tail; engine/island; engine/lever | 0.05; —; 0.65; — | 0.05; 1.95; 0.607; 1.161 | > 0; 1; 0.55; 1.00 |
| Home, held at the signal | `railEnd`: tail at the block's edge; signal past the stop (`railway-install` :266) | 0; 48.45 | 0; 48.45 | 0; 27.4 |
| Line 1 Village and Camp (no coach) | shared extent: held tail at the edge (signal 68.7 → 72.1); Camp tail past its merge | 0; 12.3 | 0; 8.9 | 0; — |
| Quarry, both | middle stop clear of Home's block (`railway-install` :271) | 107.3 | 103.9 | 1 |
| Quarry, both | tail past its plank crossing; nose short of the quarry gate (page flags) | 13.3; 3.35 | 9.9; 3.35 | 0 |
| Far Head, end before Q6 | tail past its crossover (fourth-car §7 #3, accepted; no train takes it once the Pier opens) | −0.7 | −4.1 | — |
| Far Head, as above | the physical tail of the longest consist then (plain: no wagon before Q6) | 6.7 | 3.3 | 0 |
| Far Head, both | nose short of its plank crossing | 5.1 | 5.1 | 0 |
| **Pier, homeward after Q7** | **tail past the west foot crossing** (`ring.ts` checkRing) | **0.8** | **−2.6** | **0.6** |
| Pier, as above | the same for the 12.40 m consists | 4.5 | 1.1 | 0.6 |
| Pier, terminal before Q7 | drawn nose short of the parked layer (fit check) | 1.20 | 1.20 | 1.00 |
| Railhead's 8 heads, Stack heads 1–3, as ends | tail past the stub merge (fourth-car #5, accepted) | 7.3 | 3.9 | 0 |
| First railhead | whole train on Q7 or the pier (`r4b-views` :137, reads `TRAIN_TAIL_M`) | 97.3 | 93.9 | 0 |
| Ring Island, both | tail past the crossover; north of the planks; past the ramp top; beside the platforms (`ring.ts`) | 18.3; 4.8; 0.7; 7.3 | 18.3; 4.8; 0.7; 7.3 | 5; 3; 0; 0 |
| Ring Island, both | nose short of the buffers; beside the platforms | 26.8; 11.8 | 23.4; 8.4 | 14.7; 0 |
| Ring Island, held at the signal | tail past the hinge; past the Railhead's stop | 97.1; 124.1 | 93.7; 120.7 | 20; 27.4 |
| Stack signals 1–3 (s 1700.1, 2210.2, 2720.3) | held tail over the passed head's stop (no rule; `sepCm` keeps trains apart) | −2.7 | −6.1 | — |
| **High Gorge, end** | **tail past the crossover** (`route-rules` :175; R2b row) | **0.3** | **−3.1** | **0.3** |
| High Gorge, as above | the same for the 12.40 m consists | 4.0 | 0.6 | 0.3 |
| High Gorge, end | tail beside the platforms (3210.4–3250.4); nose short of the line's end | 7.3; 11.8 | 3.9; 11.8 | 0 |
| High Gorge, drawn | the last car's shift when the standing train turns | 0 | 0.08 m, 3.9° | 0 |
| Every far end, held follower | its nose to the standing train's tail (worst: Far Head) | 21.3 | 17.9 | 0 |
| Open line, both tracks | follower's nose to leader's tail at `sepCm` | 6.5 | 3.1 | 0 |
| Open line, drawn, whole line | worst body gap, two longest trains at `sepCm` (outward; homeward at s 84.9) | 6.87; 4.13 | 3.88; 0.94 | 0.5 |

**Failures: two, both the 16.10 m train only:** the Pier's foot crossing and High Gorge's crossover. Everything else
passes, including every 12.40 m consist at both places. The builder's platform rows (every served halt, both ways,
longitudinal and lateral) pass, and the sim's block rule (`within`, `blockFree`, `retainedEndBlock`, `endMoved`) only
lengthens the time a train holds a block (timing goldens, not clearance). Far Head is not a failure: no wagon or steel
car exists while it is an end, and after Q6 nothing takes its crossover. Not covered: 3D contact of running parts and
canopies (as R1b), roof reach (R2b.3), the Stack heads' homeward side (finding 12).

<a id="r2b-options"></a>
## The two failures on merit (16 November)

**The Pier's west foot crossing (s 710.6–713.0, planks lat +1.5 to −8.2).** *What it is for:* after Q7 the Pier is
homeward-only and its west platform (s 719–741, on piles, no seabed or far-end ramp) is reached on foot only by its
start ramp, whose foot the crossing meets: the one way between the trestle and that deck. Who uses it: a player at
the Pier going home (pull "Request stop: to Village", board); one stepping off a homeward train to walk the trestle.
Riders never stop there after Q7 (their route is Home ↔ the far end; they ride to the Pier only while it is the end,
before the crossing exists). The pier rack's footings end at Q7, so no works errand crosses it. It is where the
running-side rule reads ("the lever you pull is on your train's platform"). *What the rule protects:* a stopped train
never stands on the only walk to its own platform, and the planks stay out from under a car's buffers. The reason
applies in full.
- **Move the crossing 3.40 m toward Home (recommended).** Planks s 707.2–709.6; the start ramp 9.4 m (foot s 709.6,
  4.1°). Clearance 0.80 m for the coach train (as today), 4.20 for today's trains. The player sees the planks 3.4 m
  further from the deck and a longer, gentler ramp; the order (cross, ramp, platform, lever) is unchanged; the walk is
  3.4 m longer. Reconnect: the ramp, the bots' walk path, the level rows. Not "nothing else": Q7's site deck (s
  703–713, east of the down track) now meets the planks' east end; none of it moves (designer review).
  Size: S, Place and prefab only, no bump, ships alone.
- **Move the stop toward the end.** One mark serves the terminal (before Q7) and the homeward stop (after): +3.4 m puts
  the drawn nose 2.20 m into the parked layer before Q7. Only a stop that moves at Q7 would work (`stopMoved`, as the
  Railhead's), a new rule event for one halt.
  Size: M, lockstep rules, bump.
- **Change which consists stop:** the wagon's long train running through the Pier would strand anyone on it who asked
  for it. **Change the rule:** its reason applies. Neither is right.
- *Would change it:* a later Pier plan that needs s 707–713 (a trestle walkway or a second crossing), or a halt
  redesign that gives the west deck a landward ramp of its own.

**High Gorge's crossover (s 3195.4–3217.4, catalog only).** *What it serves:* the terminal turn: a train arriving
outward stands on the down track and leaves homeward over the crossover; one train holds the end block, so nothing
else passes on it while one stands (fourth-car finding 7, why the 0.3 m was accepted). *What is built around it:*
nothing. `gorge.ts` places the platforms (end − 40 m), concourse, buffers, gangway and stair from the line's end; the
leg view draws two straight tracks and no crossover; the north-south and White Wall lines end at High Gorge on rows of
their own. *What the rule protects:* the whole standing train on one track's straight, so the turn moves no car; with
the coach the steel car would swing 0.08 m and 3.9° the moment the train turns: a twitch of the last car at the line's
showpiece terminus. The reason applies.
- **Move the crossover 3.40 m toward Home (recommended).** s 3192.0–3214.0: clearance 0.30 m for the coach train, 3.70
  for today's; the stop stays the leg's end and the train stays centred on its 40 m platforms. The player sees only
  where a train swings across, 3.4 m earlier, out on the deck. Reconnect: none (no scenery).
  Size: S, one number in the map row and a regenerated catalog; a bump, shared with v57.
- **Move the stop 3.40 m toward the buffers.** Clears it too; the players' car 3.4 m off the platforms' middle, the
  stop no longer the leg's end (a special case in `railway-lines.ts`), and fares, cycle and every Gorge golden move.
  Size: S–M, bump.
- **Change the rule** (accept the twitch): its reason applies. **Change which consists serve:** every train must stand
  at the end. Neither is right.
- *Would change it:* leg 2 continuing line 2 past the Gorge (the crossover's role ends, as Far Head's did), or the
  crossover drawn in art where the split's walls bind it.

## What this means for the owner

The coach now touches four places: Home's stop and Ring Island's stop move with it (decided), the Pier's foot crossing
and High Gorge's crossover move 3.4 m toward Home (new, R2b.1 and R2b.2), and the Stack heads' one-sided homeward
stops stay (pre-existing, its own row). The two new changes exist for **one train**, the wagon's train once it has the
longer boiler and the steel car; every other coach train is shorter than today's longest. Each change is right on its
own terms (no stopped train on a walking route; no car twitching at a turn); one is invisible, one is a 3.4 m longer
ramp. **Considered, not recommended on merit:**
- **The wagon leaves its train when its footings are done** (after the ring's last, before the steel car exists): the
  longest coach train is 12.40 m, no signal moves, Home's stop could stay 18.25, the Pier and Gorge stay; Ring still
  moves. The player would see the footing wagon roll back into its stall at the roundhouse. It is a new beat that
  undoes standing rules (the yard's loader runs only with the wagon coupled, first-town call 6, a default; the
  wagon's stone-stop exemption ends with its footing work, owner RC-093), to avoid two fixes that are right anyway.
- **No coach on the wagon's train:** one train in three (six later) leaves riders standing at Home, which reads as
  broken. **The coach elsewhere in the train:** after the kit its rear hangs 1.20 m off the Pier's deck, last it
  stands 7.15 m before it, ahead of the players' car the nose enters the Pier's parked layer (fit check §4).

## Order and bumps

S1 + V1, L1/V2 as shipped. **R1a (v56), R1b, R2a: on main.** **R2b.1 now, alone, no bump** (it waits on nothing and
takes the Pier off the coach's review). Then on `t3/rider-coach-blockout`, rebased on R2b.1: **R2b.2** (its own
commit) and **R2b.3**, sharing **v57** with one history line. R2b.2 could ship alone with today's trains (3.70 m) but
would take a bump of its own, so it shares the coach's. Then R3 (no bump), R4. Bumps in all: R1a and R2b, one each.

## Level findings

Earlier measurements at `916f570fb` and `0b9933ec2` with production `march`/`roadAt`/`lineAt` and the read-only
probe `dev/level/rider-coach-probe.ts`; findings 2–4 and 7 concern R1c only (dated text, `git show 945c69554`).
1. **The stops move with the coach, not before it.** Moving both marks 3.4 m with today's trains shifts the kit,
   wagon and steel; with the coach every freight car stays where it stands today (Home kit 14.55, wagon wait 10.85;
   Ring steel 440.6 / 436.9) and only the engine and the two passenger cars move. Depots, boards, till, gantry stay.
5, 6, 10. **Ring and Home after R2b:** the audit and R1b (Home: players' car 20.05–23.25 and coach 16.65–19.55 on the
   5.70–23.70 deck, the road 2 lever 0.55 m off the players' car). 9. The cart and trains coexisted until R1a.
8. **Still owed:** seated knees, hats and door access (R3); each player seat exit at the Quarry; boarding in motion,
   multiplayer, device cost (R4); future Strong consists and later lines' stops (not certified).
11. **One more car at Home** (probe `growth`): stop 25.35, deck +3.25 m over the leg; a longer train is its own decision.
12. **The Stack heads have no homeward platform** (pre-existing; the orchestrator's ruling: not a coach step, its own
   backlog row). An accepted homeward `rail.call` at Stack halt (halt 8) on v56 stops the players' car at lateral
   −4 m, its near edge −2.90, the only deck from +1.80: **4.70 m across the outward track** (the coach's, 5.00).
   Heads 1 and 2 while served, and Stack halt, homeward; outward and terminal service use the east track. Riders never
   board there. A player can drop 0.90 m to the railbed (formation −6.30..+2.30), cross and climb to the 0.70 m deck:
   source geometry, no controller witness. Proposed: west decks at lateral −8.05, 25 m, with checked ramps and
   furniture and the lever on them. Reproduce: `git show 15737dec1:dev/level/rider-coach-stop.ts`.
13, 14. **High Gorge's crossover and the Pier's foot crossing**: the audit's two failures (R2b.2, R2b.1).

## Risks

- **One train sets the extent for all.** `TRAIN_EXTENT` is shared by both lines: line 1's signal moves 3.4 m for a
  train 5.30 m long, and every plain train reserves 16.10 m. Correct and conservative; a per-consist extent would be a
  rule change of its own, not proposed.
- **Hotspots:** `train-view.ts`, `railway-lines.ts`, `namespace.ts`, the goldens; the builder's branch rebases on
  R2b.1 and re-runs its controls. **Room safety:** no op, apply or receipt changes; the extent and the Gorge's end
  move signals and end blocks, so v57 is a fresh-world bump with replay tests. R2b.1 is static Place geometry.
- **Generated data:** R2b.2 edits the map prototype's row and regenerates; the rail map and blockout pages follow.
  **The Pier walk:** the bots' path hard-codes a 6 m ramp (`halts-view.ts`); R2b.1 must read the halt's own.
- **R1b rests on R1a's invariant:** a vehicle on the leg once trains run needs road 2 relaid (points at s ≥ 31.3).
  **Performance:** seven coach meshes and colliders, eight seated figures a train; `npm run perf` in R2b.3.

## Strings (placeholders; none of The Boogler's copy touched, no suspect line found)

- Garage Cars tile: name stays `${playerSeats} seats, ${TRADE.riderPlaces} riders` ("4 seats, 8 riders" after R2b.3);
  desc **"The knifeboard car seats ${playerSeats} players; the riders' coach behind it seats ${TRADE.riderPlaces}."**
  Boiler readout "Cars it pulls": numbers only, 4 / 4 / 5. R2b.1 and R2b.2 add no copy.

## Design review (designer, 16 November)

**Verdict: build with changes** (folded). Decided calls 1–5 (coach A, R1 first, outside the allowance, eight places,
four until the coach). Defaults, logged in [agent-calls](../agent-calls.md) (rail): 6 stops move with the coach; 9 width
1.60; 10 roof standable, not enterable; 11 step in R3; 12 coach with a rider route; 13–15 blockout, seating, Cars desc;
7, 8, 16 were the relay's. R2b.3 is the third house's payoff: not behind art. Answered: four riders a side, yes. New
defaults (logged): the Pier's crossing and the Gorge's crossover move 3.4 m; the designer reads R2b.1's stills.

## Dated notes

- **16 November, R1 after the builder's stop** (`aba7158b2`): the cart and a standing train could coexist, so
  exclusion became a rule (R1a) and the leg dead track once trains run: R1a + R1b replaced the M step.
- <a id="home-on-merit-a-b-and-c-16-november"></a>**16 November, Home on merit: A, B and C.** Re-judged with effort
  set aside: the longest planned road 2 train is the coach train (22.80 m over bodies); C (Home for one more car) is
  A or B plus a line-wide decision. **A, today's track, recommended on merit:** every boarded car stands straight
  beside the deck as with B; B's gain is the engine's last 3.35 m past the platform's end; B moves Q1 and Q2 beside an
  unproven tree canopy; only A takes one more car later without a second relay. Owner: "I'm ok with your recs for
  1-3" (growth undecided; A, confirmed on the stills: "Keep today's"; four riders a side).
- **16 November, R2b's stops:** first the Stack heads (pre-existing, finding 12), then the Gorge (−3.10) and the Pier
  (−2.60): this revision. The fit check had tested the Pier's parked layer, never its foot crossing or the Gorge.

## Owner question (the build proceeds on the recommended answer)

Sharpened by the designer's [R2b review](#design-review-of-the-r2b-revision-designer-16-november); R2b.1 and R2b.2
do not wait on it, and stand whichever way it is answered.

1. **Once the ring's last footing is set, the footing wagon has nothing left to carry. Does it stay on its train for
   the rest of the game, or roll home to its stall?** (a) **Recommended: it stays** (today's game): your train keeps
   what it earned, the way the steel car rides empty between loads; the coach train is then the longest train and the
   Pier's crossing and the Gorge's crossover move 3.4 m for it. (b) It rolls home: once the ring is footed, the next
   time its train stands at the Village the wagon uncouples and runs back over the table into its stall, so after
   the rivet every line 2 train is engine, players' car, coach, kit car and (with the longer boiler) steel car. You
   would see it only if you were at Home then; anywhere else, one train is simply a car shorter when you next see it.

## Design review of the R2b revision (designer, 16 November)

**Verdict: build with changes** (folded into R2b.1 and R2b.2). Read: the as-built Pier (`place.md`, `layout.ts`
`OFFSET_HALTS`, `halt-ramps.ts`, `halt-crossing.ts`, `halts-view.ts` :310–326, `q7-site.ts`), the riders' route
(`railway-sys-trade.ts`: Home ↔ the open end only), the Gorge's consumers (`railway-lines.ts` :179–187, `train-view.ts`
:64–67 and :402–408, `proto/greybox/build.ts` :485–504), the wagon's rules (`railway-queries.ts` :308–331,
`railway-queries-trade.ts` :145), [first-town-lesson](first-town-lesson.md) L1, the 16 November rail and rewards
entries. The audit reproduces (`rider-coach-audit.ts`: Pier 0.8 / −2.6, Gorge 0.3 / −3.1). Stills at `deck-laid` of
today's Pier, opened: from the west lever toward Home, and top-down over s 700–745. Not seen: the moved layout (not
built), a standing homeward train, colliders round the planks, the Gorge in motion.

1. **The Pier's crossing (default, agree).** Who walks it after Q7: a player going home from the Pier (cross, ramp,
   lever at the ramp's top, board), one stepping off a homeward train, one coming back down the trestle from the
   Railhead. Riders never stop there after Q7 (confirmed); no works errand crosses it. The planner is right that the
   planks are the one way onto the ramp's foot: the west ramp's foot hangs past the trestle deck (deck to lat −5.8,
   ramp −5.7 to −8.2), and only the planks (to −8.2) carry you onto it. **Missed:** "nothing else stands at s
   700–713" is wrong: Q7's site deck (rack, shelf, Q7's personal box, frame) is just east of the planks' new east end.
   That is a better landing than the 1 m strip under the east ramp, so nothing moves, but it needs rows and a still
   (folded). The lesson still reads: lever, platform and ramp top are unchanged; the walk is 3.4 m (0.6 s) longer,
   1.2 s for someone walking back from the Railhead. **9.4 m ramp, on merit:** right. A 6 m ramp plus a 3.4 m flat
   landing on piles reads as a step in the wrong place; a longer deck (s0 715.6) moves the lever 3.4 m off the
   players' car, unpairs the two decks and moves the server's platform point. At 4.1° the ramp still reads as a ramp
   (a raised slab with a clear end), and the planks then lead only to the live platform's foot, not the chained east
   one's: the difference points the right way. **Alone, no bump, before the coach:** fine from the player's side. A
   ramp needs no visible reason; only someone who knew the old Pier could notice, and nothing about it reads as wrong.
2. **High Gorge's crossover (default, agree).** Confirmed: `gorge.ts` places platforms, concourse, buffers and stair
   from the line's end; the leg view draws no crossover; the only things that read it are the end block, the signal
   and the homeward path (data), the view's turn, and the flag-only world blockout's X (follows the row). The Gorge's
   platform signals are drawn at the platforms and do not move. The rule is the right reason: a 3.9° snap of the last
   car the moment a standing train turns is a visible fault at the showpiece terminus; moving the stop instead takes
   the players' car off the platforms' middle to fix a track-plan problem.
3. **The alternatives.** (b) judged as a beat: **not right now; I agree with the conclusion, not all the reasons.**
   The plan says (b) "undoes standing rules": not so. By `ring-joined`, before `boiler-long`, no footing is owed
   anywhere: `loaderOn` and the stone-stop exemption ([RC-093](../decisions-rail.md#d-2026-11-16-batch2-wagon-stone-exemption-ends))
   have nothing left to govern. The real case against it: the beat lands where nobody is (at Home, while the players
   are at the ring), so most players meet only its result, a train one car shorter for no reason they saw. That is
   the same "change with no visible reason" this review clears R2b.1 of, only worse because it subtracts. It also
   runs the table backwards against [only when ready](../decisions-rail.md#d-2026-11-10-turn-the-table-only-when-ready),
   needing a storyboard of its own ([physical work](../agents/owner-calls.md#physical-work)), and it is a story beat
   before the greybox is whole ([details later](../agents/owner-calls.md#mechanisms-systems-greybox-details)). Trains
   are also meant to grow (added rider cars at a later hub's garage,
   [rider seats](../decisions-rewards.md#d-2026-11-16-first-town-lesson-answers)), so a shorter train only puts off
   the same headroom. Its upside is real: a works story that ends visibly. Hence the owner question. Size, as fact:
   (b) is M (a new rule event, the table's motion, a bump); the two place moves are S and S. **No coach on the
   wagon's train** and **the coach elsewhere**: rejected on merit, agreed (riders left at Home; a deck overhang or the
   parked layer).
4. **The owner question.** "Fix the places, or shorten that train?" is not his as posed: the place moves are
   level defaults that follow from decided calls (coach A behind the players' car; Ring's stop moves with it) and
   stand either way. What is his is whether the wagon retires: a new beat in the train's story. Sharpened above.
5. **Order and bumps: agree.** R2b.1 alone on main makes sense to a player on its own; R2b.2 is invisible without
   the coach train, so it belongs in v57 with the train that needs it, and one fresh-world reset beats two.

**Calls** (logged in [agent-calls](../agent-calls.md), rail): default, the 9.4 m ramp, not a landing or a longer
deck; default, the planks' east end beside Q7's deck, nothing of it moving; new, the wagon stays coupled after
its last footing (status quo; the owner question). The planner's two defaults stand. **Changes folded:** R2b.1's
Q7-deck rows and `place.md` lines; two more stills (first sight on foot from the south; `boiler-long` with the long
train standing); R2b.2's blockout note; the options' "nothing else stands" corrected. No copy; no suspect line.
