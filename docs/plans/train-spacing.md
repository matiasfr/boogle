> **Status: plan for the designer's and the owner's review (12 November 2026).** Nothing is built or measured by the
> planner: figures are the orchestrator's brief of 12 November (main's method) unless marked *arithmetic*. Section 1's
> limit is a proposal. **Owner, 12 November UTC: "A looser rate for the greybox"** ([decisions](../decisions-rail.md#d-2026-11-12-greybox-waits-and-build-2-answered)): build 2 and
> greybox leg 1 ship now on a worst wait of 1,350 settled and 1,600 growing (orchestrator's reading), and the gates
> tighten to [section C](#c-the-limit-as-a-rate)'s table when this plan's spacing lands. Questions 2 and 3 are open.

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

_Owner, 12 November UTC: the looser rate for the greybox until spacing lands; this limit, as restated in
[section C](#c-the-limit-as-a-rate) (mean at most 525, at most 1.0% over 1,050, none over 1,158 settled), is the target
the gates tighten to when it does ([decisions](../decisions-rail.md#d-2026-11-12-greybox-waits-and-build-2-answered))._

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
   finished line. Or keep the single worst wait at 105 s. Answer: replaced by the review's question 1, answered below.
2. **"May a train run past your pulled lever when another is about 20 s behind it and will stop for you?"** **Yes
   (recommended):** the passing train is dark, the lit one in sight, and nobody is held. Or no: the nearest train
   always stops, and evenness comes only from holding trains. Answer: ___
3. **"If that is not enough on the long line, may a train with you aboard wait at Ring Island to even the gaps?"**
   **Yes, capped at 30 s, doors open (recommended).** Or up to 60 s, as at the ends. Or never mid-line: the long
   line's waits stay as built and short-turning is planned. Answer: ___

## Design review (designer, 2026-11-12)

Reviews the plan above before anything is built or measured. Where this differs from the plan's sections 1 to 4 or
its Open questions, this is what the experiments and the build take; the plan's steps and code are not edited.

**Read:** the plan; `src/sim/railway-trains.ts` (the two end holds, `blockFree`, `trainServes`, `trainReasons`,
`replan`, the dwell restart); `trainRequestable` in `railway-train.ts`; `railway-queries-trains.ts` (`railServing`,
`railTrainAsked`, `railTrainHeld`); DESIGN.md; generic-lines sections 4, 5 and 7; my three rulings of 12 November in
[greybox-route](greybox-route.md#design-review-designer-2026-11-12-leg-1-step-3); the rail Current rules and the 10
November entries on request stops, the express and three trains; owner-calls; game-design/place.md on the lever, the
signal and the map display; [train-riding](../research/train-riding.md) and
[rail-network-depth](../research/rail-network-depth.md) (top blocks); playtests.md. **Not run by me:** any fuzz,
`npm run loop`, `level-check`, the playtest CLI (it takes a session, and no session has a several-train line long
enough to bunch). Every figure is the orchestrator's brief of 12 November or marked *arithmetic*. **No stills:** nothing
is placed, moved or gated. I could not see whether the follower is in view from each platform when the leader runs
through (300 m back up the line at the Quarry, Far Head, the Pier and the stack halts); finding 3 does not rely on it.

**Verdict.** Cleared to run steps 0 to 2 with the columns of section E added. Cleared to build A after them on the
conditions in "Cleared to build". B only at a 20 s cap and off while any train is on an errand. The limit becomes a
rate, with a tighter share on the stages main has today and a second row at a playtest's ask rate. Build 2 and
greybox leg 1 do not wait for this plan. 8 Decided, 11 Default, 6 New.

### A. Pass the ask back: what the player meets

**The sight.** You pull the lever; a train comes and does not stop; another stops up to 20 s later. That is
acceptable: the owner chose it for the express ("It runs past; the next train serves them", changing the
recommendation that it stop). It is also the exact sight request stops were chosen to end ("the train missed me",
in the [10 November entry](../decisions-rail.md#d-2026-11-10-trains-stop-on-request-at-the); round 3's "felt at the
whims of if a train happened to show up"). An express looks like one; an ordinary train does not. So A ships only
with the sight made legible, in the same step, and the plan's "need no view rule" is not accepted.

**What must be true and shown** (each a test or a look in step 4):

1. **The lever does not let go.** The handle stays over, its lamp lit and the signal arm dropped from the pull until
   a train stands there that way. A train running through changes none of them. The code already does this (the
   digit clears on a departure from that halt); a test pins it through a pass.
2. **The lit train is the one that stops, from the first tick.** The leader's stop lamp never lights for an ask it
   passes back; the follower's lights the tick the ask lands. Finding 2 is the case where this fails.
3. **The map display shows which train is yours.** The serving train's marker is amber on the halt's map while your
   lever is over. The map is where you already look while you wait, and it works where the follower is out of sight.
4. **The train running through says so:** one whistle as it nears a platform whose lever is over and is not its
   stop. Today a train that is too close to brake runs through a pulled lever silently; this covers that case too.
5. **Never two.** At most one train that could have stopped runs past a pulled lever. The plan's band arithmetic
   gives "passed once"; a too-close train followed by a pass is two trains going by, and is counted (E).

**A rider's stop is always honoured** (New). The rule, in full:

- A cord ask is never passed back (the plan has this: `L.req`).
- A train whose stop lamp shows a halt stops there. A rider reads that lamp instead of pulling: `trainRequestable`
  already reports "requested" when the train is bound for the halt, so no prompt is offered. A lamp that goes out
  while the train can still brake is a broken promise to someone the sim cannot see.
- While a train is neither bound for the next halt nor lit for it, the cord prompt is offered, as today.
- Co-op: a friend aboard the leader stops it for you with the cord. A pass never splits a room that wants to meet.

**The cost falls on the asker and the gain on everyone else.** With one to three players the asker is usually the
only person waiting on the line. So a pass may cost at most 250 ticks, may never turn a wait into one over 1,050,
and its share of asks is reported at a playtest's rate (E). If A helps only at eight asks a minute it is not built.

### B. A capped hold at Ring Island with a player aboard

**Acceptable, at 20 s, shown, and never while the line is working for a player** (New).

| Hold | Where | Longest | Who is aboard |
| --- | --- | --- | --- |
| Dwell | every stop | 5 s | anyone |
| Headway hold, balanced hold (built) | the two ends | 60 s past the dwell, 70 s at most | nobody mid-ride: the train turns back there. Players boarding at Ring Island today already sit through it |
| The express's wait for friends (decided, 10 November) | a big station | 20 s with a bell; anyone aboard can go now | players, by choice |
| B | Ring Island, mid-line once leg 1 opens | **20 s past the dwell (cap 200)** | a rider bound for the Gorge or home |

- **Why 20 s and not 30.** It is the one figure the owner has given for a train waiting with players in it. A ride
  from the Village to the Gorge is about 171 s non-stop (*arithmetic*, half of 3,428), so 20 s is 12% of it and 30 s
  is 18%, against a round-trip gate of 1.2 that also has to carry the stone stop.
- **No "go now".** The express offers it because the wait is for people. Here a rider's release would be a player
  action that changes spacing, which generic-lines section 4 rules out and the R3b griefing test guards. Owner
  question 3 offers it.
- **Shown:** doors open; the hold lamp (`railTrainHeld`, as at the ends); the platform's signal arm at stop for that
  train; the bell two seconds before it leaves. Ring Island has both bills and the works within the platform's
  reach, so stepping off is a real option.
- **Off while any train of the line is on an errand** (footings owed, a kit owed, or a kit aboard that can unload
  now), not only for the errand train itself. The plan says why: a stop by any train ahead of an errand train costs
  it a dwell for good. A player at a frame is waiting for that kit (call 70's 600 ticks).
- **Off while a train is joining.** Greybox call 66 stands: no running train is held for a join.
- E3's caps become 150 and 200. 300 and 600 are run for the curve only and are not built without the owner.

### C. The limit as a rate

**The shape is right, with two changes** (New; replaces the plan's section 1 table). A maximum grows with the
sample, so the sample is pinned and the tail is counted. But the plan's 1% is eight times what main gives today, and
eight asks a minute is no room's rate. Pooled waits are about 12,800 a stage at the heavy rate and about 1,300 at
the light one (*arithmetic*: 33 minutes, 48 seeds), so 0.12% is about 15 waits and the limits below are far enough
from it to be more than noise.

| Measure (hold 75%, 48 seeds by 20,000 ticks, pooled by stage) | Stages main has today (to `ring-joined`) | The grown line, settled | The line growing |
| --- | --- | --- | --- |
| Mean lever wait, heavy asks | no more than 5% over main's (234 to 439) | at most 525 | printed |
| Share of waits over 1,050, heavy asks | at most 0.25% | at most 1.0% | printed |
| Worst wait in the pinned sample, heavy asks | 1,158 | 1,158 | 1,600 |
| **Light asks** (`FUZZ_LIGHT`, one every 60 to 90 s): share over 1,050 | none | at most 0.5% | printed |
| Light asks: mean | no higher than main's | at most 525 | printed |
| Quiet round trip over non-stop | at most 1.2 | at most 1.2 | at most 1.2 |

- **Why two rates.** The light row is what a room of one to three meets and is the row the owner is told about. The
  heavy row is margin for stops nobody pulls a lever for (more sources on later legs, a fourth player).
- **Why 0.25% and 1.0%.** A player pulls a lever perhaps a hundred times in a game (my estimate, not measured). At
  1.0% that is one wait over 105 s in a game, under the heaviest load; at leg 1's 5.5% it is five or six. Main's
  stages keep a limit near what they give, so this plan cannot spend the short line's quality on the long one.
- **The light figures are provisional.** If main's own E0 run misses them they become main's measured figures, and
  the sheet says so. They are never looser than the heavy row.
- **"Worst in the pinned sample" is not "never".** The plan's question 1 says "never over 116 s"; a longer run would
  find a longer wait. The owner is told "none in our test".
- **The committed short fuzz keeps its flat bound** (3,000 ticks; it holds on 48 of 48): 1,050 on main's stages,
  1,158 for build 2's mixed fleet as ruled on 12 November. It is the fast guard. Step 3 adds the table for the long
  runs and does not replace `WAIT_BOUND` in the short one.
- **What is the owner's:** whether his "about 105 s worst" may be read as a rate at all (question 1). The figures,
  the two rates and the sample are mine and are logged.

### D. Against decided rules and the 12 November rulings

- **Request stops.** "A request lever at each halt calls the next train to stop." A makes it the train after next
  for some asks. It bends those words; the express answer is the precedent. New, owner question 2.
- **Trains haul; errands on main's ticks.** No conflict in A or B as written: freight and footing stops are service
  stops, never passed and never held. The proof gate checks ticks with nothing asked only, so E adds the kit and
  the railhead clauses under asks.
- **The block rule.** A and B overtake nothing. The short turn would, which is why it is its own plan
  ([double track](../decisions-rail.md#d-2026-11-10-the-railway-is-double-track): a direction is a track).
- **"The assignment only moves back, so the lamp doesn't flicker"** (generic-lines section 7; my finding 2 of 10
  November). A's second failure mode moves it forward. Finding 2.
- **"Anything playtests could tune is tunable"** (owner call, 5 November). `pass.cm`, `pass.band` and B's cap are
  catalog constants in the plan. Finding 5.
- **Economy stops ruling.** Untouched: stone stops and the footing clause stand; riders board at the ends only.
- **Research.** [train-riding](../research/train-riding.md) recommendation 6 (dead time is the main complaint; a
  ride must be leavable) is the ground for B's cap and open doors. [rail-network-depth](../research/rail-network-depth.md)
  (the railway runs itself, no dispatch work) agrees with "no player action affects spacing".
  [route-contract](../research/route-contract.md) holds: nothing here supplies a route or skips work.

**The 12 November rulings, if this plan is built** (marked in greybox-route by whoever lands step 6, not here):

| Ruling | Standing |
| --- | --- |
| Step 3 review A.1 and A.2, call 61 (worst wait at "both seeds", 1,158, mean 525, ride 1.2) | Figures stand. **Superseded in part:** the sample (48 seeds pooled) and the added share and light rows, by table C |
| A.3, call 62 (1,600 while growing) | Stands |
| A.4 and A.5, calls 63 and 66 (fleet 3 then 5; the joiner waits) | Stand; call 66 binds B |
| A.6 and finding 1 (the end turn is the lever) | Already withdrawn by round 3 |
| A.7, calls 67 and 77 (G1 ships with the settled gate recorded as failing) | **Returns now, amended:** the 48-seed sheet is the breach round 3 named. G1 ships on the growth cap with gate 9 recorded as failing, and "the end turn" reads "train spacing". **Superseded** when step 6 lands |
| Round 3 ruling 1, call 78 (gates owed at 75% on four seeds) | The 75% and 0% rule stands. **"Four seeds" superseded** by the pinned 48 |
| Round 3 gates 8, 9 and 11's wait clauses | **Superseded** by table C. Gates 5, 10 and 12 to 16 stand |
| Round 3 rulings 3 to 5, calls 80 and 81 (not the end turn; 1,158 kept; block signals at section ends) | Stand. A is measured against block signals on the leg 1 base before it is built there |

### E. The experiments and the kill criteria

Sufficient to compare A, B and C. Not sufficient to choose, because nearly every column is the platform's view at a
rate no room plays at. Added to section 3:

**Columns added** (each at heavy and light asks; the light run is gated, not "ungated" as Risks has it):

1. **Trains run past a pulled lever:** the share of asks that see one train run through, split into "too close to
   brake" and "passed back", and the count that see two.
2. **Passed asks:** share of all asks; extra wait, mean and worst; total wait, worst.
3. **The lamp:** times a train's stop lamp was lit for a halt for 10 ticks or more and then went out while it could
   still brake; times the serving train changed after the pull, each way.
4. **The pull unanswered:** the longest time a lever is over with no serving train named.
5. **The rider's trip under asks:** end to end, each way, mean and worst, by train. A moves stops from the leader
   to the follower; B stands a train. The quiet round trip sees neither.
6. **The longest stand with doors open mid-line,** and how many times a lap (B).
7. **Under asks, on leg 1:** idle at each frame (gate 14's figures) and a train at the new railhead within 1,158
   ticks of each lay.

**Printed, not gated** (the player does not feel them): headway variation by halt, hold ticks a lap, seeds over
1,050 (the per-seed count this plan argues against), and everything at the 0% hold except safety.

**Kill a variant when** (added to the plan's list): any lamp lit 10 ticks goes out while the train can brake; any ask
sees two trains run past that could have stopped; a passed ask's total wait is over 1,050; more than one ask in ten
is passed at light asks; the rider's mean trip under asks rises over 5% on any stage; frame idle or the railhead
clause fails under light asks; a light-row figure of table C is missed on a stage main meets it on.

**"Keep" is not "build".** Halving leg 1's share to 2.75% keeps a variant in the comparison. It is built only if it
meets table C on leg 1 at both rates, or the sheet comes back here.

**One more E0 row decides whether anything is built for players at all:** leg 1 as built, light asks. If it meets
the light row, the long line's problem is a stress margin, and A is built only if it also leaves the light figures
and the rider's trip no worse.

### Findings

1. **The plan tunes to a rate nobody plays at and gates nothing at the rate they do.** Change before step 2: the
   light run is a gated row (table C, section E).
2. **A's second failure mode breaks "what's on screen is true"** (DESIGN.md 11; generic-lines section 7). The plan
   counts the lamp moving forward and offers a latch "if it shows". Either direction is counted, and the harmful one
   (a lit lamp going out) kills the variant unless the latch is built. Owner calls allow the shape change: saves are
   wiped at will in development, and the step already bumps.
3. **"No view rule" is wrong for A.** The lamps follow from `railServing`, but the map marker and the whistle are
   new, small, and are what stop the sight reading as a bug. They ship in step 4 with one look at a middle halt
   (the Quarry, a pass under way), not later.
4. **B can slow the kit a player is waiting for** unless it is off for the whole line during an errand (section B).
   Change before E3: add that variant and judge B by it.
5. **The new numbers are not tunables.** `pass.cm`, `pass.band` and B's `cap` should be room tunables beside
   `railTrainHeadPct`, with zero or absent as off, so a session can turn A off without a build. If a tunable cannot
   keep the off case bit for bit, say why in step 4.
6. **Step 3 would delete the fast guard.** Keep the flat bound in the committed short fuzz (section C).
7. **Flow.** Rule 1 (the next goal can be found) and rule 3 (nobody is stranded) hold: no ask is dropped, nothing
   is one-way, a passed asker is served by the next train. The lens "a place to meet in co-op" bends under A and is
   answered by the cord. No level finding: nothing is placed.
8. **Order.** Steps 0 to 2 are a bounded experiment and run now. Nothing else waits on them: build 2 ships on call
   61 as already ruled (worst 1,100 against 1,158), and G1 on A.7 as returned. Spacing lands before leg 2's fleet
   is set.

**Cleared to build A when:** E0 reproduces the brief; A meets table C on main's stages and does not worsen them;
no kill criterion above is met (or the latch is built and the lamp counts are zero); the map marker and whistle
are in the step; `pass` is switchable for a room. **B:** only if A leaves leg 1 over table C; cap at most 200; off
during errands and joins; gate 11 as the plan has it. **Neither waits for the owner:** both are switched by one
value and are logged. A cap over 200 or a "go now" does wait for him.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Three trains to Ring Island; about 105 s worst wait accepted | Decided | [10 November](../decisions-rail.md#d-2026-11-10-line-2-runs-three-trains-for-now) |
| 2 | A lever "calls the next train to stop"; cargo and wagon stops happen unasked | Decided | [10 November](../decisions-rail.md#d-2026-11-10-trains-stop-on-request-at-the). A bends "next": call 20 |
| 3 | An express runs past a pulled lever and the next train serves it | Decided | [10 November](../decisions-rail.md#d-2026-11-10-open-calls-answered-the-express-and). The precedent for A's sight |
| 4 | A train may wait 20 s for friends with a bell; anyone aboard can go now | Decided | The same entry. The source of B's cap |
| 5 | Trains stop at every resource source; none while footings are owed | Decided | [12 November](../decisions-rewards.md#d-2026-11-12-town-economy-answered) |
| 6 | Double track, one direction a track; nobody overtakes | Decided | [10 November](../decisions-rail.md#d-2026-11-10-the-railway-is-double-track). Why the short turn is its own plan |
| 7 | Anything a playtest could tune is tunable | Decided | Owner call, 5 November. Finding 5 |
| 8 | The greybox route is live for everyone, each leg whole; nothing waits for a playtest | Decided | [12 November](../decisions-rail.md#d-2026-11-12-ring-island-build-2-and-the-greybox-route-answered); owner call, 9 November. Finding 8 |
| 9 | Worst 1,158 settled and 1,600 growing, mean 525, ride within 1.2, fleet 3 then 5 (the plan's calls 4 and 5) | Default | Greybox calls 61 to 63, 74: already logged as mine, open. Kept; read as "in the pinned sample" |
| 10 | The share over 1,050 is at most 0.25% on the stages main has today and 1.0% on the grown line | Default | Section C |
| 11 | A light-asks row is gated: none over 1,050 on main's stages, at most 0.5% on the grown line; provisional until E0 | Default | Section C, finding 1 |
| 12 | The committed short fuzz keeps its flat bound (1,050; 1,158 for build 2's mixed fleet) | Default | Section C, finding 6 |
| 13 | On a pass the lever, its lamp and the signal arm hold; the leader stays dark; the serving train's map marker is amber; a train running through a pulled lever whistles once | Default | Section A, 1 to 4 |
| 14 | A pass costs at most 250 ticks, never makes a wait over 1,050, at most one train runs past a lever, at most one ask in ten is passed at light asks | Default | Section A, section E |
| 15 | B is shown by open doors, the hold lamp, the signal arm at stop and a bell two seconds before leaving | Default | Section B |
| 16 | B is off while any train of its line is on an errand or joining | Default | Section B, finding 4; greybox call 66 |
| 17 | The pass distance, band and B's cap are room tunables | Default | Finding 5 |
| 18 | A variant is built only if it meets table C on leg 1 at both rates; the added columns and kill criteria | Default | Section E |
| 19 | Greybox leg 1 ships on A.7 as returned, with "train spacing" for "the end turn"; build 2 ships on call 61 | Default | Section D, finding 8 |
| 20 | A late train passes a lever ask to the train close behind it (the plan's call 7) | **New** | Yes, on "Cleared to build". Owner question 2 |
| 21 | A rider's stop is always honoured: a cord ask is never passed, and a train showing its stop lamp for a halt stops there | **New** | Section A. The latch is built if the count is not zero |
| 22 | The wait limit is a rate at two ask rates over a pinned sample (the plan's call 6) | **New** | Section C. Owner question 1 |
| 23 | A train may stand at Ring Island to even the gaps with riders aboard, 20 s past its dwell, no "go now" (the plan's call 8) | **New** | Section B. Owner question 3 |
| 24 | Short-turning is not built; its plan is written only if A with B misses table C at both rates (the plan's call 9) | **New** | Agreed. It needs a rule for whoever is aboard, whom the sim cannot see |
| 25 | A mechanism is built for players only if leg 1 misses the light row, or A leaves the light figures and the rider's trip no worse | **New** | Section E, the last paragraph |

**Counts:** 8 Decided, 11 Default, 6 New. **Suspect lines of The Boogler's:** none written or changed. **Port from
Place:** nothing.

### Owner questions

These replace the plan's three. None holds steps 0 to 2 or the build.

1. **"Should a platform wait be judged by the single worst one ever seen, or by how often a wait is long?"**
   - **By how often (recommended; built until he answers):** usually under 52 s; with one to three of you playing,
     no wait over 105 s on today's line and at most one in two hundred on the long one; none over 116 s in our
     test. Build 2 and the greybox line ship meanwhile, and evening the trains out is the next rail job.
   - Keep the single worst wait at 105 s: build 2 and the greybox line wait for the spacing work.
   Answer: ___
   **Answered (owner, 12 November UTC): "A looser rate for the greybox"**: "Ship build 2 and leg 1 now with waits up
   to about 2 minutes 15, and tighten when train spacing lands. The grey route arrives sooner and feels slow at the
   platforms." Recorded in the [decisions](../decisions-rail.md#d-2026-11-12-greybox-waits-and-build-2-answered).
2. **"May an ordinary train run past your pulled lever when another is about 20 s behind it and will stop for you?"**
   - **Yes (recommended; built until he answers):** your lever stays pulled, the train that will stop is lit and
     marked on the halt's map, the one running through whistles, and a friend aboard it can still stop it with the
     cord.
   - No: the nearest train always stops, and trains are evened out only by holding them at stations.
   Answer: ___
3. **"If that is not enough on the long line, may a train with you aboard stand at Ring Island to even the gaps?"**
   - **Yes, for at most 20 s, doors open, with a bell before it leaves (recommended; built until he answers, and
     only if question 2's rule is not enough).** The same 20 s the express waits for friends.
   - Yes, and anyone aboard can send it on, as on the express.
   - Up to 30 or 60 s.
   - Never mid-line: the long line's waits stay as built.
   Answer: ___
