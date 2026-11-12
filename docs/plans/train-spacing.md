> **Status: plan for the designer's and the owner's review (12 November 2026).** Nothing is built or measured by the
> planner: figures are the orchestrator's brief of 12 November (main's method) unless marked *arithmetic*. Section 1's
> limit is a proposal; the owner has it open ([greybox-route](greybox-route.md#design-review-designer-2026-11-12-leg-1-step-3), question 1).

# Train spacing: even gaps along a line, so waits stay short as lines grow

## Goal

Trains on a line keep roughly even gaps under lever asks, so the wait at any platform stays near half a headway as
line 2 grows from Ring Island to High Gorge and beyond. Serves DESIGN.md's core loop (the ride you built has to be
worth waiting for), **7. Telegraph everything** (the lit serving lamp stays true) and **8. Enjoyable alone and
together**. It bends nothing; "no player action affects spacing" (generic-lines, section 4) stands.

**Read.** AGENTS.md's sim rows (lockstep, room-safety, mixed-builds, tests, sync); DESIGN.md; `src/sim/railway-trains.ts`,
`railway-train.ts`, `railway-sys-trains.ts`, `railway-lines.ts`, `railway-queries-trade.ts`, `railway-queries-trains.ts`;
`test/railway-trains.test.ts`; generic-lines sections 4, 5 and 7; greybox-route's leg 1 steps and three rulings of 12
November; the economy stops ruling; the rail Current rules. **Research:** the index has nothing on headway or
dispatch; [route-contract](../research/route-contract.md) holds. The facet's own research is the Reference section
and step 0. **Not run:** `npm run map`, `loop -- node`, `level-check` (the fresh worktree has no `node_modules`; no
beat's bill, supply or cue changes; nothing is placed). **Inflight:** `ring2/v3-garage` (build 2) edits all four
train files; greybox step 3, on another machine, adds block signals to `planLeg`. See Risks.

## 1. The player outcome, and the limit as a rate (proposal)

You pull a lever and a train your way is usually there in under a minute, on the short line and on the long one. A
train that runs past your lever is dark and the lit one is close behind it. Nobody sits on a train queued outside a
terminal, and a quiet ride end to end is as fast as it is today.

**Why a rate.** A per-seed pass or fail on the worst wait depends on how long the run is: main holds 1,050 on 48 of
48 seeds at 3,000 ticks and on 40 of 48 at `gap-footed` at 20,000, with the same rules. A maximum only grows with the
sample. The proposal keeps the ruled figures (greybox-route calls 61, 62, 78) and adds the share; build 2 (worst
1,100) meets the cap, and its share is measured in E0:

| Measure (75% hold, main's fuzz, 48 seeds by 20,000 ticks a stage, waits pooled) | Proposed limit | Main today, to protect | Leg 1 as built |
| --- | --- | --- | --- |
| Mean lever wait, each stage | at most 525, and no stage over main's by more than 5% | 234 to 439 | 603 to 632 settled |
| Share of waits over 1,050 | at most 1.0% a stage | at most 0.12% | 5.5% |
| Hard cap, settled line | none over 1,158 | none over 1,158 (worst 1,120) | 1.4% over, worst 1,343 |
| Hard cap, line growing | none over 1,600 | not applicable | worst 1,408 |
| Quiet round trip over non-stop | at most 1.2 at every stage | not on the brief | 1.033 at worst |

## 2. Candidates

**The mechanism to beat** (the brief's traces): the end holds (`headTicks`, and `balancedHold` with line 2's
`balance: 600`) act only at the ends, and under asks only the balanced hold binds (75% and 0% give identical
figures). Mid-line a leader making lever stops is caught by the train behind, which takes no asks because
`trainServes` gives every ask to the nearest train; the pair then leaves most of a lap empty behind it.

### A. Pass the ask back (recommended first)

- **Rule.** A lever ask goes to the nearest train that can brake, as today, unless that train is running late and
  another is close behind: then the leader runs through and the train behind takes the ask. "Late" is more room
  ahead of it than behind it by a band; "close behind" is within a pass distance. At most one pass an ask.
- **In the code.** `trainServes` gains an optional `errand: (slot) => boolean`. With `L` the nearest qualifying train
  and `F` the next nearest, it returns `F` when the line has `pass`, `L` is not standing at or already bound for the
  stop, `L.req` has no rider ask there, neither is on an errand, `ahead(L) > behind(L) + pass.band` and
  `behind(L) <= pass.cm` (gaps by `circuitAhead` over `trainPose`, as `balancedHold` reads them). A train already
  bound for the platform keeps it, as now. Catalog: `RailLineDef.pass?: { cm: number; band: number }`; `trainPlaces`
  throws unless `band >= cm - TRAIN.sepCm`, which stops `F` passing it on again (*arithmetic*: `F`'s gap ahead is
  under `cm`, its gap behind at least `sepCm`). A line without `pass` runs today's rule bit for bit.
- **State.** None; rows are only read. No save shape change; a rule change, so one bump.
- **Quiet ride and build errands.** Unchanged by construction wherever nothing is asked: the rule is never reached.
  Under asks an errand train (the wagon while footings are owed, a train owed a kit or carrying one) neither
  passes nor receives.
- **Stone and riders.** A stone stop and a cord ask are never passed; riders board only at the ends.
- **How it goes wrong.** (1) The asker waits longer by the follower's gap: bounded by `pass.cm` at cruise plus one
  dwell if the follower is standing (*arithmetic*: 30,000 cm is 150 ticks, about 21 s at worst). (2) The assignment
  moves forward again if the leader's gaps cross the band while it can still brake; it then stops, as today, and
  the lamp changes train once. Counted in E2; if it shows, the fix is a latch digit on `Line` (a shape change).
  (3) No deadlock: nothing is held. (4) A player aboard the leader who wants that halt pulls the cord, as today.

### B. Balance at a control point (second, only if A leaves the grown line over the limit)

- **Rule.** At a designated middle halt, a train with much less room ahead than behind stops and stands, doors
  open, until the gaps are even or a cap runs out: `balancedHold` at one more place, plus the stop to get there.
- **In the code.** `RailLineDef.control?: { halts: readonly number[]; cap: number; on: number; off: number }`. A
  control halt acts while it is open, not an end and not refused that way. `controlStop(...)` is true when
  `ahead + on < behind` (`off` once the row is bound for or standing at the halt: hysteresis read from the row);
  `trainReasons` ORs it in. In `trainStepLine`, beside the end holds, a train standing there past its dwell waits
  while `ahead + off < behind` and `tick < arrived + dwellTicks + cap`. Never for `headExempt` or an errand train,
  never while `footingsOwed(w, line)` (new `TrainIO.controlOff(line)`), never for a train a lever ask is assigned to.
- **Where.** Ring Island only: about 37% along the line to the Gorge (*arithmetic*: s 1,190 m of about 3,240 m), a
  town with both platforms. It is the open end until leg 1 opens, so B is inert on every stage main has today.
- **State and quiet ride.** No state (the cap runs from `arrived`); one bump. Nothing happens while gaps are within
  `on`. Each control stop costs 108 ticks plus the hold; the 1.2 gate leaves about 570 a lap (*arithmetic*).
- **Errands, stone, riders.** Off while footings are owed (the freight stop's own condition): a stop by any train
  ahead of the wagon costs it a dwell for good. Leg kits run with no footings owed, so step 3's gates 14 and 15
  are the risk (E3). A held train passes no source; stone can land later by the hold.
- **How it goes wrong.** (1) Every train held: impossible, each gap would have to be shorter than the one behind it
  round a circle; a test asserts it, and the cap ends any hold at dwell + cap + one asker's dwell. (2) A player
  aboard: doors open at a town, the lamp shows the hold; the cap is the cost (owner question 3). (3) The scratch
  run of 12 November (one-sided, every halt and block signal, cap 600) raised means and moved ticks before the
  rivet. B differs on each count: two-sided, one halt, a dead band, off under footings.

### C. End recovery sized from the lap under asks (the control experiment; expected to be refused)

The headway hold would use the lap trains are really running, so it binds again. Built properly it needs an integer
on `Line` and a tick on each train row (a shape change); the scratch stand-in needs none: `railTrainHeadPct` at 100,
115 and 130 (scratch only; the knob's range is 0 to 100). It holds at the terminals only, where seven trains already
queued with riders aboard (round trip 5,680 against 3,428), and on main the hold changes no digit.

**Considered and set aside: short-turning, the nearest train either way.** Checked: line 2 has two middle
crossovers once it grows (Far Head's at s 490 m, Ring Island's), and the row's `turn` flag already describes a train
turning at a halt that is no longer an end. It is the only candidate aimed straight at the measured breaches (down
asks at old-line halts). It is not one step: a short turn jumps the train round the circuit past every train beyond
the crossover, which `blockFree` assumes never happens; it needs a both-track reservation, a view, and a rule for
whoever is aboard, whom the sim cannot see. Its own plan, only if E4 fails.

## 3. Measurement before any build

Main's method only: the `WAIT_BOUND` fuzz, `FUZZ_TICKS=20000`, the 48 seeds of the 12 November baseline, hold at 75%
(0% printed, safety only: call 78). Stages `q6-stocked`, `crossing-done`, `deck-laid`, `gap-footed`, `ring-joined`;
then the grown line: 0 to 4 sections laid, the settled fuzz, the whole-leg fuzz. Candidates live on
`scratch/spacing-*` branches, never merged, switched by the catalog field so the off case is main bit for bit.

**Columns:** stage; seeds; waits served; mean; p95; share over 1,050 and 1,158; worst with halt, way and tick;
seeds over 1,050; headway mean and coefficient of variation by halt and way; quiet round trip over non-stop; hold
ticks a lap by halt; longest stand; asks passed with worst and mean extra wait; lamp moves forward. Nothing asked,
12,000 ticks: stage-tick delta at all 40 stages, the wagon's arrivals, footing ticks, stone and fares in 20 minutes.

| Run | On | What |
| --- | --- | --- |
| E0 | main; build 2; leg 1 | The harness alone. Must reproduce the brief to the digit, or stop: the harness is wrong |
| E1 | main, leg 1 | C's stand-in: hold at 100, 115, 130; `balance` at 300, 600, 900 |
| E2 | main, leg 1, build 2's mixed fleet | A: `pass.cm` 20,000, 30,000, 40,000 with `band = cm - sepCm`, and one wider band |
| E3 | main with Far Head as the control halt (acts at `crossing-done`, `ring-joined`); leg 1 with Ring Island | B: cap 150, 300, 600; `on` 15% and 25% of an even gap, `off` half of `on` |
| E4 | leg 1 | A with the best B |

**Kill a variant when** (any one): a nothing-asked stage tick before the rivet, a wagon arrival or a footing tick
differs from main; the quiet round trip passes 1.2; a main stage's mean rises over 5% or its share over 1,050 rises;
a train stands 1,200 ticks; `lineSpacing` or the load check breaks; a passed ask waits over 250 ticks more than the
leader would have given it. **Keep it only if** on leg 1 the share over 1,050 at least halves (to 2.75%) with the
mean no higher. **If nothing reaches section 1's table on leg 1:** report the best row and plan the short turn.

## 4. The proof gate for whichever is built

Nothing asked, 12,000 ticks, against main, unless said. Items 1 to 7 are the town economy's seven.

1. **Stage ticks:** all 40 seed stages land on main's tick.
2. **The footing wagon, trip by trip:** on main's tick at the far end and the Village wherever footings are owed.
3. **Footing delivery ticks** match main, pier and ring.
4. **Waits, the six stages:** main's committed fuzz at both hold settings, no higher than main's.
5. **Stone:** at least 32 in 20 minutes from `crossing-done` and `ring-joined`; none while footings are owed.
6. **Fares:** at least 40 a minute from `trains-on` on; neither crowd at `crowdCap` for 1,200 ticks running.
7. **`npm run loop -- run`:** order and bills unmoved.
8. **The rate:** section 1's table at every stage, 48 seeds, 75%, as the designer rules it.
9. **The ride:** quiet round trip at most 1.2 times non-stop at every stage; no train stands 1,200 ticks.
10. **A's guarantee, every tick of the fuzz:** a passed ask is served by the train it went to or an earlier stand;
    none is passed twice; no errand train passes or receives; a cord ask is never passed.
11. **B's bounds (if built):** no hold past dwell + cap + one asker's dwell; never every train of a line held at
    once; none while footings are owed; none of an errand train.
12. **Safety at 75% and 0%:** `sepCm`, the end blocks, `railwayCheck` and the replay test, through the restores.
13. **On the grown line:** greybox step 3's gates 8 to 15 as its third ruling lists them.

## Design

Lockstep, the server's authority. No new op, component, state key or `types.ts` entry; `edits` generators and
`lineSpacing` unchanged; gates 10 and 11 are test invariants; no `env` fact. Catalog only (`pass`, `control`).
Cosmetic: the lamp and board already call `trainServes` through `railServing`, so the dark leader and lit follower
need no view rule; the adapter passes the same `errand` predicate. B adds one adapter read. Controls: none.
**Level findings:** none, nothing is placed, moved or gated.

## Steps

Each leaves `node dev/ship-check.ts` green. "Review" is the independent review before main; "read" the orchestrator's.

- [ ] **0. Research doc (S; read; no bump).** `docs/research/headway-control.md`, sources fetched, and its index line.
- [ ] **1. The harness (S; read: no assertion changes; no bump).** New `test/helpers/wait-stats.ts` (`waitStats`,
      `headwayStats`); both fuzzes in `test/railway-trains.test.ts` print section 3's columns by `t.diagnostic` and
      append a JSON line a run when `FUZZ_SHEET=<path>` is set. Verify: the default run unchanged; E0.
- [ ] **2. The experiments (M; nothing merges; no bump).** E0 to E4; the sheet goes into this plan as "Measured"
      with each kill criterion answered. The designer rules on the limit and the mechanism.
- [ ] **3. The limit in the tests (S; review: assertions change; no bump).** After the ruling: `WAIT_BOUND` becomes
      the ruled table in `test/railway-trains.test.ts`, build 2's mixed-fleet test and `test/railway-trade.test.ts`'s
      item 4. **Unblocks build 2's all-longer case** if its share passes in E0.
- [ ] **4. Mechanism A (M; review; bump).** `src/sim/railway-lines.ts` (`pass`, the `trainPlaces` check, line 2's
      values from E2); `src/sim/railway-trains.ts` (`trainServes`; `trainReasons` passes `errand`);
      `src/sim/railway-sys-trains.ts` (`TrainIO.errand`); `src/sim/railway-queries-trains.ts` (`railServing`,
      `railTrainAsked`); the tests' `FixtureLine`; `src/world/namespace.ts` (next version, one dated line, outside
      the owner's session); pinned fixtures regenerated. Tests: a late leader with a follower inside `pass.cm` runs
      through and the follower stands; outside it, or inside the band, today's answer; an errand train on either
      side, today's answer; a line without `pass` equals main over the fixture fuzz. Verify: gates 1 to 10 and 12.
- [ ] **5. Mechanism B, only if step 2 says so (M; review; the same bump if batched).** `railway-lines.ts`
      (`control`), `railway-trains.ts` (`controlStop`, the hold beside `balancedHold`), `railway-sys-trains.ts`
      (`controlOff`), `railway-queries-trains.ts` (`railTrainHeld`); then the lamp and board in
      `src/entities/railway/` (S; a fresh visual review, one `/look` at Ring Island with a train held). Verify:
      gate 11, and gates 1 to 9 again.
- [ ] **6. Checkpoint "spacing".** `npm run check`; the long fuzz once; `npm run loop -- run`; `npm run test:net`;
      game-design's trains section. **Unblocks greybox leg 1 step 3** (gates 8, 9) on that branch, in G1's bump.

## Reference

From memory, not fetched in this session (no web tool); step 0 verifies each before a builder cites it.

1. **Bunching is an instability, not noise** (Newell and Potts, 1964): a late vehicle meets more demand and gets
   later while the one behind catches up. Here a lever ask is the demand, so control must act where the stops are.
2. **Terminal-only control fails on long lines; control points along the route hold headways** (Daganzo, 2009).
   Why C is the control experiment and B sits mid-line.
3. **Look both ways, with no timetable** (Daganzo and Pilachowski, 2011; Bartholdi and Eisenstein, 2012): holding on
   the gap behind as well as ahead self-equalizes. Why B is two-sided, and why the one-sided scratch run raised means.
4. **Holding costs speed; expressing the late leader costs none**, if the following vehicle serves every skipped
   stop (Eberlein, Wilson and Bernstein, 1998; Fu, Liu and Calamai, 2003). Why A is first and carries a guarantee.
5. **Mean wait is half the headway times one plus its squared coefficient of variation** (Osuna and Newell, 1972).
   Why section 3 reports headway variation: it separates unevenness from fleet size.
6. **Terminal recovery time** protects a timetable, which this line lacks; **short-turning** closes a gap fastest
   and is what riders resent most (Furth, 1987).
7. **Request stops** on real railways bound waits by timetable; lifts, the nearer case, send a hall call to the car
   that fits, not always the nearest. Games that fix bunching hold at stops; the rest queue at terminals (seven trains).

## Risks

- **Hotspot files and inflight.** `railway-trains.ts` and its test are edited by build 2 (boilers) and greybox
  step 3 (block signals). Step 4 lands after build 2 rebases; a 25 m/s follower closes faster, hence E2's mixed fleet.
- **Room safety, lockstep, mixed builds.** No effects in apply, nothing random or wall-clock; integer comparisons
  only. Rule changes: one bump with a dated line, not mid-session. Performance: a few integer operations an ask.
- **The measure itself.** About eight asks a minute is far above a playtest's rate; a mechanism tuned to it may do
  little at `FUZZ_LIGHT`. E2 to E4 print the light run beside it, ungated.

**Could not determine from the code:** the 48 seeds (not in the repo); greybox step 3's block signals (another
machine), so A against one is unchecked; whether the sim can know a player is aboard (no row holds it); build 2's
share over 1,050; how often a follower is within 40,000 cm, since the block rule spaces trains by whole legs.

## Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Three trains to Ring Island; about 105 s worst wait accepted | Decided | [10 November](../decisions-rail.md#d-2026-11-10-line-2-runs-three-trains-for-now) |
| 2 | Trains stop on request; an express may run past a pulled lever and the next train serves it | Decided | [10 November](../decisions-rail.md#d-2026-11-10-trains-stop-on-request-at-the). The precedent for A's sight; an ordinary train doing it is call 7 |
| 3 | Trains stop at every resource source; no economy stop while the wagon is owed footings | Decided, then ruled | [12 November](../decisions-rewards.md#d-2026-11-12-town-economy-answered); the economy stops ruling |
| 4 | Worst 1,158 settled, 1,600 growing, mean 525, ride within 1.2; gates owed at the 75% hold | Default | greybox-route calls 61, 62, 74, 78. Kept |
| 5 | Fleet 3, then 5; more trains are not the lever | Default | greybox-route call 63. Kept |
| 6 | The limit is a rate: at most 1% of waits over 1,050, pooled over 48 seeds by 20,000 ticks a stage | **New** | Section 1. Owner question 1 |
| 7 | A late train passes a lever ask to the train close behind it; errand trains and cord asks never | **New** | Candidate A. Owner question 2 |
| 8 | A train may stand at Ring Island to even the gaps, capped, never while footings are owed | **New** | Candidate B, only if A is not enough. Owner question 3 |
| 9 | Short-turning is not built now; its plan is written only if A with B fails | **New** | Section 2 |

## Open questions

For the owner; none holds steps 0 to 2. Planner's own: none beyond "could not determine". No Place port.

1. **"Should platform waits be judged by the single worst wait ever seen, or by how often a wait is long?"** **By
   how often (recommended):** typically under 52 s, at most one in a hundred over 105 s, never over 116 s on a
   finished line. Or keep the single worst wait at 105 s. Answer: ___
2. **"May a train run past your pulled lever when another is about 20 s behind it and will stop for you?"** **Yes
   (recommended):** the passing train is dark, the lit one in sight, and nobody is held. Or no: the nearest train
   always stops, and evenness comes only from holding trains. Answer: ___
3. **"If that is not enough on the long line, may a train with you aboard wait at Ring Island to even the gaps?"**
   **Yes, capped at 30 s, doors open (recommended).** Or up to 60 s, as at the ends. Or never mid-line: the long
   line's waits stay as built and short-turning is planned. Answer: ___
