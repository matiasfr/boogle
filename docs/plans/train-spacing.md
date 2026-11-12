> **Status: plan for the designer's and the owner's review (12 November 2026).** Nothing here is built or measured by
> the planner; every figure is the orchestrator's brief of 12 November (main's committed method) unless marked
> *arithmetic*. The limit in section 1 is a proposal: the owner has that question open
> ([greybox-route](greybox-route.md#design-review-designer-2026-11-12-leg-1-step-3), owner question 1).

# Train spacing: even gaps along a line, so waits stay short as lines grow

## Goal

Trains on a line keep roughly even gaps under lever asks, so the wait at any platform stays near half a headway as
line 2 grows from Ring Island to High Gorge and beyond. Serves DESIGN.md's core loop ("the rail builds the world":
the ride you built has to be worth waiting for), **7. Telegraph everything** (the lit serving lamp stays true) and
**8. Enjoyable alone and together**. It bends nothing; "no player action affects spacing"
([generic-lines](generic-lines.md#4-spacing-block-signals-in-integer-cm-and-ticks)) stands.

**Read.** AGENTS.md's rows for a sim plan (lockstep, room-safety, mixed-builds, tests, sync); DESIGN.md;
`src/sim/railway-trains.ts`, `railway-train.ts`, `railway-sys-trains.ts`, `railway-lines.ts` (line 2's rows),
`railway-queries-trade.ts` (`freightStop`), `railway-queries-trains.ts` (`railServing`); `test/railway-trains.test.ts`
and `test/helpers/fuzz.ts`; generic-lines sections 4, 5 and 7; greybox-route's leg 1 steps and its three rulings of
12 November; slice5-town-economy's economy stops ruling; the rail Current rules. **Research:** the index has nothing
on headway or dispatch; [route-contract](../research/route-contract.md) holds (no candidate lets movement supply
work); [train-ride-feel](../research/train-ride-feel.md)'s 20 m/s is untouched. The facet's own research is the
Reference section and step 0. **Not run:** `npm run map`, `npm run loop -- node` and `npm run level-check` (the fresh
worktree has no `node_modules`; nothing here changes a beat's bill, supply or cue, and nothing is placed).
**Inflight:** `ring2/v3-garage` (build 2) edits all four train files (`cycleTicks`, `headTicks` and `trainPose` gain a
boiler); greybox step 3 is on another machine and adds block signals to `planLeg`. See Risks.

## 1. The player outcome, and the limit as a rate (proposal)

You pull a lever and a train your way is usually there in under a minute, on the short line and on the long one. A
train that runs past your lever is dark and the lit one is close behind it. Nobody sits on a train queued outside a
terminal, and a quiet ride end to end is as fast as it is today.

**Why a rate.** A per-seed pass or fail on the worst wait depends on how long the run is: main holds 1,050 on 48 of
48 seeds at 3,000 ticks and on 40 of 48 at `gap-footed` at 20,000, with the same rules. A maximum only grows with the
sample. The proposal keeps the ruled figures (calls 61, 62 and 78 in greybox-route) and adds the share:

| Measure (75% hold, main's fuzz, 48 seeds by 20,000 ticks a stage, all waits pooled) | Proposed limit | Main today, to protect | Greybox leg 1 as built |
| --- | --- | --- | --- |
| Mean lever wait, each stage | at most 525, and no stage over main's by more than 5% | 234 to 439 | 603 to 632 settled |
| Share of waits over 1,050 | at most 1.0% a stage | at most 0.12% | 5.5% |
| Hard cap, settled line | none over 1,158 | none over 1,158 (worst 1,120) | 1.4% over, worst 1,343 |
| Hard cap, line growing | none over 1,600 | not applicable | worst 1,408 |
| Quiet round trip over non-stop | at most 1.2 at every stage | not on the brief | 1.033 at worst |

Build 2 on this table: about 1 seed in 24 over 1,050 with a worst of 1,100 meets the cap; its share is not on the
brief and is measured in E0.

## 2. Candidates

**The mechanism to beat** (the brief's traces): the two end holds (`headTicks` after the dwell, `balancedHold` with
line 2's `balance: 600`) act only at the ends. Under asks trains reach an end later than the headway hold, so only
the balanced hold ever binds (75% and 0% give identical figures). Mid-line a leader making lever stops is caught by
the train behind, which takes no asks because `trainServes` gives every ask to the nearest train; the pair then
leaves most of a lap empty behind it.

### A. Pass the ask back (recommended first)

- **Rule.** A lever ask goes to the nearest train that can brake, as today, unless that train is running late and
  another is close behind: then the leader runs through and the train behind takes the ask. "Late" is more room
  ahead of it than behind it by a band; "close behind" is within a pass distance. At most one pass an ask.
- **In the code.** `trainServes` gains an optional `errand: (slot) => boolean`. With `L` the nearest qualifying train
  and `F` the next nearest, it returns `F` when the line has `pass`, `L` is not standing at or already bound for the
  stop, `L.req` has no rider ask there, neither is on an errand, `ahead(L) > behind(L) + pass.band` and
  `behind(L) <= pass.cm` (gaps by `circuitAhead` over `trainPose`, as `balancedHold` reads them). A train already
  bound for the platform keeps it, as now. Catalog: `RailLineDef.pass?: { cm: number; band: number }`; `trainPlaces`
  throws unless `band >= cm - TRAIN.sepCm`, which is what stops `F` passing it on again (*arithmetic*: `F`'s gap
  ahead is under `cm`, its gap behind at least `sepCm`). A line without `pass` runs today's rule bit for bit.
- **State.** None. Rows are only read. No save shape change; a rule change, so one bump.
- **Quiet ride.** Unchanged by construction: with no lever ask `trainServes` is never consulted for a reason.
- **Build errands.** Every gate measured with nothing asked is unchanged by construction. Under asks an errand
  train (the wagon while footings are owed, a train owed a kit or carrying one) neither passes nor receives, so it
  serves asks exactly as on main.
- **Stone and riders.** A stone stop is a service stop and a cord ask is the rider's own train's: neither is ever
  passed. Riders board only at the ends, where no ask is passed.
- **How it goes wrong.** (1) The asker waits longer by the follower's gap: bounded by `pass.cm` at cruise plus one
  dwell if the follower is standing (*arithmetic*: 30,000 cm is 150 ticks, so about 21 s at worst). (2) The follower
  is stuck behind a block: it cannot be, the leader ran through and only moves on. (3) The assignment moves forward
  again if the leader's gaps cross the band while it can still brake; it then stops, as today, and the lamp changes
  train once. Counted in E2; if it shows, the fix is a latch digit on `Line` (a shape change), not shipped blind.
  (4) No deadlock: nothing is held. (5) A player aboard the leader who wanted that halt pulls the cord, as today.

### B. Balance at a control point (second, only if A leaves the grown line over the limit)

- **Rule.** At a designated middle halt, a train with much less room ahead than behind stops and stands, doors
  open, until the gaps are even or a cap runs out. It is `balancedHold` at one more place, plus the stop to get there.
- **In the code.** `RailLineDef.control?: { halts: readonly number[]; cap: number; on: number; off: number }`. A
  control halt acts while it is open, not an end and not refused that way. `controlStop(rows, line, stops, slot, k,
  dir, tick)` is true when `ahead + on < behind` (`off` instead of `on` once the row is bound for or standing at
  `k`: hysteresis read from the row, no state); `trainReasons` ORs it in. In `trainStepLine`, beside the end holds:
  a train standing at a control halt past its dwell waits while `ahead + off < behind` and
  `tick < arrived + dwellTicks + cap`. Never for `headExempt` or an errand train, never while
  `footingsOwed(w, line)` (new `TrainIO.controlOff(line)`), never for the train a lever ask ahead is assigned to.
- **Where.** Ring Island only: about 37% along the line to the Gorge (*arithmetic*: s 1,190 m of about 3,240 m), a
  town with both platforms. It is the open end until leg 1 opens, so B is inert on every stage main has today.
- **State.** None; the cap runs from `arrived` (v27). No shape change; one bump.
- **Quiet ride.** Costs nothing while gaps are within `on`. Each control stop costs 108 ticks plus the hold; gate 10
  (1.2) leaves about 570 ticks a lap on the finished line (*arithmetic*: 4,114 less 3,541).
- **Build errands.** Off while footings are owed, by the freight stop's own condition, because a stop by any train
  ahead of the wagon costs it a dwell for good (economy stops ruling). Leg kits run with no footings owed: gates 14
  and 15 are the risk, measured in E3.
- **Stone and riders.** A held train at Ring Island loads nothing new and passes no source it would have stopped at.
  Stone can land later by the hold: gate 5(a) decides.
- **How it goes wrong.** (1) Everyone held: impossible, the holds would need every gap shorter than the one behind
  it, round a circle; a test asserts it and the cap ends any hold at dwell + cap + one asker's dwell. (2) A player
  aboard a held train: doors open at a town, the lamp shows the hold; the cap is the cost (owner question 3).
  (3) The scratch run of 12 November (a one-sided hold at every halt and block signal, cap 600) raised means and
  moved ticks before the rivet. B differs on each count: two-sided, one halt, off under footings, a dead band.

### C. End recovery sized from the lap under asks (the control experiment; expected to be refused)

- **Rule.** The headway hold's lap is the lap trains are really running, not the non-stop lap, so it binds again.
- **State.** An integer on `Line` (the last completed lap) and a tick on each train row: a shape change and a bump.
  The scratch stand-in needs none: `railTrainHeadPct` at 100, 115 and 130 (scratch only; the knob's range is 0 to 100).
- **What it costs.** Nothing quiet if sized from the measured lap. But it holds at the terminals only, which is
  where seven trains already queued (round trip 5,680 against 3,428), and on main the hold changes no digit.
- **How it goes wrong.** Riders wait aboard outside the ends; the ride gate fails before the wait gate passes.

**Considered and set aside: short-turning, the nearest train either way.** Checked: line 2 has two middle
crossovers once it grows, Far Head's (s 490 m) and Ring Island's, and the row's `turn` flag already describes a
train turning at a halt that is no longer an end. It is the only candidate aimed straight at the measured breaches
(down asks at old-line halts while the next down train is beyond the island). It is not one step: a short turn jumps
the train forward round the circuit past every train beyond the crossover, which `blockFree` assumes never happens
("nobody overtakes"); it needs a both-track reservation at the crossover, a view, and a rule for whoever is aboard,
whom the sim cannot see. It becomes its own plan only if E4 fails.

## 3. Measurement before any build

Main's method only: the `WAIT_BOUND` fuzz in `test/railway-trains.test.ts` (an ask on 5% of ticks, uniform over open
halts and ways), `FUZZ_TICKS=20000`, the 48 seeds of the 12 November baseline, hold at 75% (0% printed, safety only:
call 78). Stages: `q6-stocked`, `crossing-done`, `deck-laid`, `gap-footed`, `ring-joined`; then on the grown line,
fixed stages 0 to 4 sections laid, the settled fuzz and the whole-leg fuzz. Candidates live on scratch branches
(`scratch/spacing-*`, never merged), switched by the catalog field so the off case is main bit for bit.

**Columns, every row:** stage; seeds; waits served; mean; p95; share over 1,050; share over 1,158; worst with its
halt, way and tick; seeds over 1,050; headway mean and coefficient of variation at each halt and way (departures
that way); quiet round trip over non-stop; hold ticks a lap by halt; longest stand; asks passed, and the worst and
mean extra wait of a passed ask; lamp moves forward; and, nothing asked for 12,000 ticks: stage-tick delta against
main at all 40 seed stages, the wagon's arrivals trip by trip, footing delivery ticks, stone and fares in 20 minutes.

| Run | On | What | Kill |
| --- | --- | --- | --- |
| E0 | main; then build 2; then leg 1 | The harness alone. Must reproduce the brief's figures to the digit | Any digit differs: stop, the harness is wrong |
| E1 | main, leg 1 | C's stand-in: hold at 100, 115, 130; `balance` at 300, 600, 900 | Ride over 1.2, or share over 1,050 not halved on leg 1 |
| E2 | main, leg 1 | A: `pass.cm` 20,000, 30,000, 40,000 with `band = cm - sepCm`, and one wider band | Below |
| E3 | main with Far Head as the control halt (active at `crossing-done` and `ring-joined` only); leg 1 with Ring Island | B: cap 150, 300, 600; `on` at 15% and 25% of an even gap, `off` at half of `on` | Below |
| E4 | leg 1 | A with the best B | Below |

**Kill a variant when** (any one): a nothing-asked stage tick before the rivet, a wagon arrival or a footing
delivery differs from main; the quiet round trip passes 1.2 at any stage; any main stage's mean rises over 5% or
its share over 1,050 rises; a train stands 1,200 ticks; `lineSpacing` or the load check breaks at either hold
setting; a passed ask waits over 250 ticks more than the leader would have given it. **Keep it only if** on leg 1
the share over 1,050 at least halves (5.5% to 2.75%) with the mean no higher. **If nothing reaches section 1's
table on leg 1:** stop, report the best row, and the short-turn plan is written before leg 2's fleet is set.

## 4. The proof gate for whichever is built

Nothing asked, 12,000 ticks, against main, unless said. Items 1 to 7 are the town economy's seven.

1. **Stage ticks:** all 40 seed stages land on main's tick.
2. **The footing wagon, trip by trip:** on main's tick at the far end and the Village wherever footings are owed.
3. **Footing delivery ticks** match main, pier and ring.
4. **Waits, the six stages:** main's committed fuzz at both hold settings, no higher than main's.
5. **Stone:** at least 32 in 20 minutes from `crossing-done` and `ring-joined`; no freight stop while footings are
   owed; timber unchanged.
6. **Fares:** at least 40 a minute from `trains-on` on; neither crowd at `crowdCap` for 1,200 ticks running.
7. **`npm run loop -- run`:** order and bills unmoved.
8. **The rate:** section 1's table at every stage, 48 seeds, 75%, as the designer rules it.
9. **The ride:** quiet round trip at most 1.2 times non-stop at every stage; no train stands 1,200 ticks.
10. **A's guarantee:** every passed ask is served by the train it was passed to or an earlier stand; none is passed
    twice; no errand train passes or receives; a cord ask is never passed. Every tick of the fuzz.
11. **B's bounds (if built):** no hold past dwell + cap + one asker's dwell; never every train of a line held at
    once; none while footings are owed; none of an errand train.
12. **Safety at 75% and 0%:** `sepCm`, the end blocks and `railwayCheck` hold through restores every 500 ticks on
    average, as the fuzz does now; the replay test passes.
13. **On the grown line (with leg 1):** greybox step 3's gates 8 to 15 as its third ruling lists them.

## Design

- **Sync kind:** Lockstep, the server's. No new op, component, state key or `types.ts` entry; the `train` and `line`
  rows are read as they are. `edits` generators unchanged; invariants: `lineSpacing` unchanged, plus gates 10 and 11
  as test invariants. `env` facts: none. Catalog only: `pass` and `control` on `RailLineDef`.
- **Cosmetic:** the serving lamp and departure board already call the sim's `trainServes` through `railServing`
  over mirrored rows, so the dark leader and lit follower need no view rule; the adapter passes the same `errand`
  predicate (`footingsOwed`, `kitOwed`, the row's cargo, all in shared queries). B adds one adapter read for the
  held lamp.
- **Controls:** none. No action, pad slot, key, touch control or guide row.

## Steps

Each leaves `node dev/ship-check.ts` green. Review column: independent review is a fresh agent before main
(`REVIEW_PATHS`); "read" is the orchestrator's.

- [ ] **0. Research doc (S; read; no bump).** `docs/research/headway-control.md` with fetched sources and numbered
      recommendations, and its line in `docs/research/README.md`. The Reference section below is from memory.
- [ ] **1. The harness (S; read: no assertion changes; no bump).** New `test/helpers/wait-stats.ts`
      (`waitStats(waits)`: mean, p95, shares, worst; `headwayStats(departures)`); the two fuzzes in
      `test/railway-trains.test.ts` print section 3's columns through `t.diagnostic` and write one JSON line a run
      when `FUZZ_SHEET=<path>` is set. Verify: default run unchanged in time and result; E0 reproduces the brief.
- [ ] **2. The experiments (M; no review, nothing merges; no bump).** E0 to E4 on scratch branches; the sheet goes
      into this plan as "Measured", with the kill table filled. The designer rules on the limit and the mechanism.
- [ ] **3. The limit in the tests (S; independent review: assertions change; no bump).** After the ruling:
      `WAIT_BOUND` becomes the ruled table in `test/railway-trains.test.ts`, in build 2's mixed-fleet test and in
      `test/railway-trade.test.ts`'s item 4. **Unblocks build 2's all-longer case** if its share passes in E0.
- [ ] **4. Mechanism A (M; independent review; bump).** `src/sim/railway-lines.ts` (`pass`, the `trainPlaces`
      check, line 2's values from E2); `src/sim/railway-trains.ts` (`trainServes`, `trainReasons` passing `errand`);
      `src/sim/railway-sys-trains.ts` (`TrainIO.errand`); `src/sim/railway-queries-trains.ts` (`railServing`,
      `railTrainAsked`); the fixture line in the tests; `src/world/namespace.ts` (the next version, one dated line,
      outside the owner's session); pinned fixtures regenerated. Tests in `test/railway-trains.test.ts`: a late
      leader with a follower inside `pass.cm` runs through and the follower stands; outside it, or inside the band,
      today's answer; an errand train on either side, today's answer; a line without `pass` equals main over the
      fixture fuzz; gate 10 inside the fuzz. Verify: gates 1 to 10 and 12.
- [ ] **5. Mechanism B, only if step 2 says so (M; independent review; the same bump if batched).** As section 2:
      `railway-lines.ts`, `railway-trains.ts` (`controlStop`, the hold beside `balancedHold`),
      `railway-sys-trains.ts` (`controlOff`), `railway-queries-trains.ts` (`railTrainHeld`), then the lamp and board
      in `src/entities/railway/` (S; a fresh visual review, one `/look` at Ring Island with a train held). Verify:
      gate 11 and gates 1 to 9 again.
- [ ] **6. Checkpoint "spacing" (one sitting).** `npm run check`; the long fuzz once (`FUZZ_TICKS=20000`, 48 seeds);
      `npm run loop -- run`; `npm run test:net`; game-design's train section updated. **Unblocks greybox leg 1
      step 3** (its gates 8 and 9) when run on that branch; it ships in G1's bump if G1 has not shipped.

## Level findings

None: nothing is placed, moved or gated, so `npm run level-check` has nothing to judge.

## Reference

From memory, not fetched in this session (no web tool); step 0 verifies each before a builder cites it.

1. **Bunching is an instability, not noise** (Newell and Potts, 1964): a late vehicle meets more demand and gets
   later while the one behind catches up. Here a lever ask is the demand. So control has to act where the stops are.
2. **Terminal-only control fails on long lines; control points along the route with a little slack hold headways**
   (Daganzo, 2009; Xuan, Argote and Daganzo, 2011). Why C is the control experiment and B has a point mid-line.
3. **Look both ways, and need no timetable** (Daganzo and Pilachowski, 2011; Bartholdi and Eisenstein, 2012, run on
   real bus routes): holding on the gap behind as well as ahead self-equalizes and survives vehicles joining. Why B
   is two-sided, as `balancedHold` already is, and why the scratch run's one-sided hold raised means.
4. **Holding costs speed; expressing the late leader costs none** (deadheading and skip-stop control: Eberlein,
   Wilson and Bernstein, 1998; Fu, Liu and Calamai, 2003, where the following vehicle serves every skipped stop).
   Why A comes first and carries its guarantee.
5. **Mean wait is half the headway times one plus its squared coefficient of variation** (Welding, 1957; Osuna and
   Newell, 1972). Why section 3 reports headway variation: it says how much of the wait is unevenness, not fleet.
6. **Recovery time at terminals** is sized from observed running time (transit capacity manuals: of the order of a
   tenth to a fifth of it). C's premise; it protects a timetable, which this line does not have.
7. **Short-turning** recovers a gap fastest and is the control riders resent most (Furth, 1987). Why it is set aside.
8. **Request stops** on real railways bound waits with a timetable; lifts are the nearer case: hall calls go to the
   car that fits, not always the nearest, and group control exists to stop cars bunching. Transit games that fix
   bunching do it by holding at stops (Cities: Skylines' unbunching, timetable separation in OpenTTD's patch packs); those without
   it queue at terminals (Factorio's stackers), which is the seven-train result.

## Risks

- **Hotspot files and inflight.** `railway-trains.ts` and its test are edited by build 2 (boilers) and greybox
  step 3 (block signals). Step 4 lands after build 2 rebases, or carries `boiler` through; A reads gaps in cm, so a
  25 m/s follower closes faster and `pass.cm` is checked on the mixed fleet in E2.
- **Room safety.** No effects in apply, nothing random or wall-clock; the new predicates are integer comparisons of
  `circuitAhead` results (lockstep rules hold). No new shared file for the server image.
- **Mixed builds.** Rule changes only, one bump with a dated line, no migration; not shipped mid-session.
- **Performance.** `trainServes` reads every train of a line once more per ask per decision: a few integer
  operations on at most five rows. No meshes or lights; `npm run perf` not needed.
- **The measure itself.** Asks uniform over halts at 5% of ticks is about eight a minute, far above a playtest's
  rate; a mechanism tuned to it may do little at `FUZZ_LIGHT`. E2 to E4 print the light run beside it, ungated.

**Could not determine from the code:** the 48 seeds (not in the repo); greybox step 3's block signals and its
fuzz (another machine), so A's follower rule against a block signal is unchecked; whether the sim can know a player
is aboard a train (the server checks `nearTrain` for the cord, but no row holds it); build 2's share over 1,050;
whether a follower two halts back ever sits inside 40,000 cm, since the block rule spaces trains by whole legs.

## Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Three trains to Ring Island; about 105 s worst wait accepted | Decided | [10 November](../decisions-rail.md#d-2026-11-10-line-2-runs-three-trains-for-now) |
| 2 | Trains stop on request; an express may run past a pulled lever and the next train serves it | Decided | [10 November](../decisions-rail.md#d-2026-11-10-trains-stop-on-request-at-the). The precedent for A's sight; an ordinary train doing it is call 8 |
| 3 | Trains stop at every resource source; no stop while the wagon is owed footings | Decided | [12 November](../decisions-rewards.md#d-2026-11-12-town-economy-answered) and the economy stops ruling |
| 4 | Worst 1,158 settled, 1,600 growing, mean 525, ride within 1.2; gates owed at the 75% hold | Default | greybox-route calls 61, 62, 74, 78. Kept |
| 5 | Fleet 3, then 5; more trains are not the lever | Default | greybox-route call 63. Kept |
| 6 | Measure before building; scratch branches; kill criteria as section 3 | Default | This plan |
| 7 | The limit is a rate: at most 1% of waits over 1,050, pooled over 48 seeds by 20,000 ticks a stage | **New** | Section 1. Owner question 1 |
| 8 | A late train passes a lever ask to the train close behind it; errand trains and cord asks never | **New** | Candidate A. Owner question 2 |
| 9 | A train may stand at Ring Island to even the gaps, capped, never while footings are owed | **New** | Candidate B, only if A is not enough. Owner question 3 |
| 10 | Short-turning is not built now; its plan is written only if A with B fails | **New** | Section 2 |

## Open questions

Planner's own: none beyond "could not determine". No Place port. For the owner, none holds steps 0 to 2:

1. **"How should we judge platform waits: by the single worst wait ever seen, or by how often a wait is long?"**
   **By how often (recommended):** typically under 52 s, at most one wait in a hundred over 105 s, never over 116 s
   on a finished line. Or keep the single worst wait at 105 s. Answer: ___
2. **"May a train run past your pulled lever when another is about 20 s behind it and will stop for you?"**
   **Yes (recommended):** the passing train is dark and the lit one is in sight; it spreads trains without holding
   anyone. Or no: the nearest train always stops, and evenness comes from holding trains. Answer: ___
3. **"If that is not enough on the long line, may a train with you aboard wait at Ring Island to even the gaps?"**
   **Yes, capped at 30 s (recommended)**, doors open, the lamp showing the hold. Or up to 60 s, as at the ends
   today. Or never mid-line: waits on the long line stay as built, and short-turning is planned. Answer: ___
