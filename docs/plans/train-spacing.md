> **Status: measured, and neither candidate is built (12 November 2026).** Steps 1 and 2 ran on scratch branches;
> [Results](#results-12-november-2026) holds the sheets' key rows. E0 reproduces the brief. Candidate A dies on main's
> stages (every variant: a passed ask waits more than 250 ticks extra, and a lit lamp goes out). Candidate B (Ring
> Island, cap 200, on 15%) survives at light asks only and misses [table C](#c-the-limit-as-a-rate) on leg 1 at both
> rates, so by the review's rule it is not built. E1 (candidate C) and E4 (A with B) were not run: A died on main, so E4
> has no A to combine. Next is the short turn: [short-turn](short-turn.md). Steps 0 and 3 to 6 have not run.
> **Owner, 12 November UTC: "A looser rate for the greybox"** ([decisions](../decisions-rail.md#d-2026-11-12-greybox-waits-and-build-2-answered)):
> build 2 and greybox leg 1 ship on a worst wait of 1,350 settled and 1,600 growing (orchestrator's reading), and the
> gates tighten to table C when spacing lands. Leg 1 then measured over 1,350 on 48 seeds and shipped under the 1,600
> cap alone ([call 109](../agent-calls.md), his to keep or reverse). Questions 2 and 3 are open; question 2 is moot
> unless A returns. Figures in sections 1 to 4 and the design review are the orchestrator's brief of 12 November unless
> marked *arithmetic*; the Results section's are read from the sheets.
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

## Results (12 November 2026)

> **Step 1 of the short turn's plan, and the ruling on it (12 November):** the end hold, six trains, and six trains
> with the Ring Island hold were measured next. Six trains with the hold (cap 200, on 15%) clears the looser rate and
> the keep rule at both ask rates and is cleared to build; the short turn is parked. See
> [short-turn](short-turn.md#design-ruling-on-step-1s-sheet-designer-2026-11-12).

Steps 1 and 2, run by two scratch agents on 12 November and recorded here on the same day by the planner, who ran
nothing. Every figure below was read from a `sheet.txt`; the sheets are in gitignored `.look/spacing/` folders of two
worktrees and are not in git, so this section is their durable record. Waits are ticks (10 a second). Unless said:
48 seeds (hex 1000 to 102f), 20,000 ticks a run, hold 75%, waits pooled as the brief pooled them (served, plus asks
still waiting at the end at their wait so far). "Heavy" is main's fuzz (about 8 lever asks a minute); "light" is one
ask attempted every 200 to 299 ticks with no rider asks (1.2 to 1.6 accepted a minute on the sheets). All named sheets
were present: `e0-20k`, `e0-3k`, `e2-v0` to `e2-v4`, `leg1-e0`, `e0-24`, `e3`, `e3b`, `e3c`; every one reads "errors 0".

| Branch (pushed, never merged) | Tip | Base | Holds |
| --- | --- | --- | --- |
| `origin/scratch/spacing-e0` | 3cee21326 | main at eb2d30c0b | `test/spacing/run.ts`, `sweep.ts`: main's stages |
| `origin/scratch/spacing-a` | 232c77843 | `spacing-e0` | candidate A in four `src/sim` train files; `SPACING_PASS` |
| `origin/scratch/spacing-leg1-e0` | b04ef6333 | leg 1's step 3 branch (merge base with main 6b6f13f5f) | `test/spacing/leg1.ts`, `leg1-sweep.ts`, `catalog.ts` |
| `origin/scratch/spacing-leg1-b` | 564152fea | `spacing-leg1-e0` | candidate B in three `src/sim` files; `compare.ts`; `SPACING_CONTROL`, `SPACING_CONTROL_LATE` |

### E0 on main: the harness reproduces the brief

Sheet `e0-20k`. The brief's figures in section 1 (means 234 to 439, at most 0.12% over 1,050, worst 1,120, none over
1,158, 40 of 48 seeds under 1,050 at `gap-footed`) are the heavy rows to the digit.

| Rate | Stage | Waits served (+ still waiting) | Mean | p95 | Over 1,050 | Over 1,158 | Worst (halt, way, seed) | Seeds over 1,050 | Lever asks a minute |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| heavy | `q6-stocked` | 9,067 (+102) | 233.9 | 457 | 0.000% | 0.000% | 706 (Quarry down, 1003) | 0 | 7.9 |
| heavy | `crossing-done` | 9,247 (+106) | 242.5 | 460 | 0.000% | 0.000% | 717 (Quarry down, 1020) | 0 | 8.0 |
| heavy | `deck-laid` | 9,645 (+146) | 310.2 | 681 | 0.000% | 0.000% | 1,011 (Railhead down, 100e, unserved) | 0 | 8.3 |
| heavy | `gap-footed` | 9,206 (+150) | 343.9 | 675 | 0.118% | 0.000% | 1,087 (Railhead down, 1004) | 8 | 8.0 |
| heavy | `ring-joined` | 10,350 (+238) | 439.5 | 707 | 0.009% | 0.000% | 1,120 (Railhead up, 102c, unserved) | 1 | 8.8 |
| light | `q6-stocked` | 1,368 (+20) | 191.0 | 377 | 0.000% | 0.000% | 631 (Far Head down, 1028) | 0 | 1.2 |
| light | `crossing-done` | 1,404 (+16) | 192.5 | 379 | 0.000% | 0.000% | 592 (Quarry up, 1005, unserved) | 0 | 1.2 |
| light | `deck-laid` | 1,629 (+21) | 233.0 | 506 | 0.000% | 0.000% | 683 (Quarry down, 100b) | 0 | 1.3 |
| light | `gap-footed` | 1,600 (+26) | 256.8 | 554 | 0.000% | 0.000% | 845 (Pier down, 1001) | 0 | 1.3 |
| light | `ring-joined` | 2,011 (+34) | 300.4 | 631 | 0.000% | 0.000% | 914 (Pier down, 100f) | 0 | 1.6 |

- **Hold 0% against 75%, heavy:** identical in every column at four stages; `deck-laid` differs in the fourth digit
  (mean 309.8, p95 679, 9,650 served). At light asks the two differ slightly (the worst is 988 at `gap-footed` and
  1,008 at `ring-joined` at 0%); none is over 1,050.
- **At 3,000 ticks** (sheet `e0-3k`, heavy rows only): no seed over 1,050 at any stage; worst 763, 687, 728, 846 and
  913 (`ring-joined`, Railhead up, seed 100b); means 204.7, 235.7, 278.9, 318.7, 398.6.
- **Headway at `ring-joined`, heavy:** mean 720 to 727 at every platform, coefficient of variation 0.05 to 0.18.
- **Nothing asked, 12,000 ticks:** lap over non-stop is 1.28 at worst (`q6-stocked`) and 1.0 to 1.198 elsewhere; 32
  stone at `crossing-done` and `ring-joined`; wagon arrivals 36, 35, 24, 19, 17 from `wagon-on` to `ring-joined`.
- **Light row of table C on main's stages** ("none over 1,050", "provisional until E0"): main meets it as written.

### E2, candidate A: four variants, all killed on main's stages

Sheets `e2-v0` to `e2-v4`, hold 75% only. The sheets do not record each variant's setting; these are from the scratch
agent's report: v0 `pass` unset, v1 `pass.cm` 20,000 with band 17,260, v2 30,000 with 27,260, v3 40,000 with 37,260,
v4 30,000 with the wider band 45,000. **v0 equals E0 in every wait column** (the off case). Its nothing-asked "footing
changes" column reads 14 at `wagon-on` and 13 at `deck-laid` where `e0-20k` reads 0, on every `e2` sheet, v0 included:
the harness's counter changed between the two sweeps (commit 3cee21326), not the sim. The nothing-asked table is
otherwise identical on all five sheets.

Stage order in each cell: `q6-stocked`, `crossing-done`, `deck-laid`, `gap-footed`, `ring-joined`.

| Variant | Rate | Asks passed | Extra wait of a passed ask, mean / worst | Worst total wait of a passed ask | Two trains past one ask | Lamp lit 10 ticks, then out |
| --- | --- | --- | --- | --- | --- | --- |
| v1 | heavy | 2, 1, 3, 0, 0 | 342/344, 353/353, 407/474 | 742 | 0 | 24, 16, 251, 58, 1 |
| v1 | light | 0, 0, 1, 0, 0 | 290/290 | 328 | 0 | 0, 1, 4, 5, 13 |
| v2 | heavy | 23, 24, 69, 28, 0 | 352/392, 343/379, 373/521, 383/519 | 862, 964, 1,218, 1,231 | 0, 0, 5, 0, 0 | 265, 241, 297, 224, 3 |
| v2 | light | 28, 38, 16, 14, 13 (2.1%, 2.8%, 1.0%, 0.9%, 0.7%) | 278/592, 264/311, 287/338, 327/336, 369/406 | 728, 778, 796, 1,102, 1,108 | 3, 1, 1, 0, 1 | 54, 63, 10, 26, 34 |
| v3 | heavy | 12, 11, 88, 46, 3 | 359/375, 371/381, 385/505, 402/513, 642/723 | 880, 964, 1,236, 1,332, 1,162 | 0, 0, 3, 0, 0 | 327, 358, 556, 401, 34 |
| v3 | light | 22, 31, 29, 29, 70 (1.7%, 2.3%, 1.8%, 1.9%, 3.5%) | 270/375, 266/368, 307/399, 327/407, 380/516 | 938, 865, 903, 1,142, 1,200 | 1, 2, 3, 1, 2 | 48, 58, 34, 56, 158 |
| v4 | heavy | 2, 0, 63, 27, 0 | 347/354, none, 359/472, 378/468 | 742, none, 1,258, 1,231 | 0, 0, 5, 0, 0 | 42, 39, 310, 225, 3 |
| v4 | light | 1, 0, 13, 14, 13 | 260/260, none, 282/292, 327/336, 369/406 | 459, none, 796, 1,102, 1,108 | 0, 0, 1, 0, 1 | 1, 1, 8, 26, 34 |

What each did to the waits (E0 beside it):

| Variant | Heavy: over 1,050 | Heavy: over 1,158 and worst | Light: over 1,050 (E0: none) | Light means that moved |
| --- | --- | --- | --- | --- |
| E0 | `gap-footed` 0.118%, `ring-joined` 0.009% | none; worst 1,120 | none | 191.0, 192.5, 233.0, 256.8, 300.4 |
| v1 | unchanged | none; worst 1,120 | none | unchanged |
| v2 | `deck-laid` 0.122%, `gap-footed` 0.085%, `ring-joined` 0.009% | `deck-laid` 0.020%, `gap-footed` 0.043%; worst 1,231 | `gap-footed` 0.061%, `ring-joined` 0.049% | `q6-stocked` 197.3, `crossing-done` 204.0 |
| v3 | `deck-laid` 0.152%, `gap-footed` 0.149%, `ring-joined` 0.038% | 0.020%, 0.053%, 0.009%; worst 1,332 | `gap-footed` 0.061%, `ring-joined` 0.195% | `crossing-done` 202.3, `ring-joined` 309.9 |
| v4 | `deck-laid` 0.122%, `gap-footed` 0.085%, `ring-joined` 0.009% | `deck-laid` 0.030%, `gap-footed` 0.043%; worst 1,258 | `gap-footed` 0.061%, `ring-joined` 0.049% | none over 1% |

**Why each dies** (section 3's rules and the review's section E):

| Kill rule | v1 | v2 | v3 | v4 |
| --- | --- | --- | --- | --- |
| A passed ask waits over 250 ticks more than the leader would have given it | worst 474, mean 290 to 407 | worst 592, mean 264 to 383 | worst 723, mean 266 to 642 | worst 472, mean 260 to 378 |
| A lamp lit 10 ticks goes out while the train can brake | up to 251 a stage | up to 297 | up to 556 | up to 310 |
| A light-row figure missed where main meets it | holds | over 1,050 at two stages | over 1,050 at two stages, 0.049% over 1,158 | over 1,050 at two stages |
| A main stage's share over 1,050 rises | holds | `deck-laid` 0 to 0.122% | three stages | `deck-laid` 0 to 0.122% |
| None over 1,158 on main's stages | holds | worst 1,231 | worst 1,332 | worst 1,258 |
| A main stage's mean rises over 5% | holds | light `crossing-done` 192.5 to 204.0 (*arithmetic*: 6.0%) | light `crossing-done` to 202.3 (*arithmetic*: 5.1%) | holds |
| An ask sees two trains run past | holds | up to 5 a stage | up to 3 | up to 5 |
| A passed ask's total wait over 1,050 | holds (742) | 1,231 | 1,332 | 1,258 |
| More than one ask in ten passed at light asks | holds | holds (2.8% at most) | holds (3.5%) | holds (0.9%) |

- v1 is killed by the first two rules alone and changes nothing else: it passes at most three asks a stage.
- The cause of the first rule, on the sheets: the follower is not "about 20 s behind" in wait terms. Its own gap, dwell
  and stops put the passed asker 260 to 640 ticks behind the leader on average.
- Not met by any variant: no train stood 1,200 ticks (longest stand 492, as on main).
- A was not run on leg 1 or on build 2's mixed fleet: it was dead on main first.

### E0 on leg 1: 48 seeds, both rates, by place

Sheet `leg1-e0`. "Stage k" is k sections laid; "settled" is stage 4 plus 1,000 quiet ticks in the starting world;
"whole" is the whole leg with the room stocking. Trips are a rider's end-to-end ride under asks, mean/worst.

| Rate | Place | Waits | Mean | p95 | Over 1,050 | Over 1,158 | Worst (halt, way, tick asked, seed) | Seeds over 1,050 | Trip up | Trip down |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| heavy | stage 0 | 10,619 | 439.6 | 696 | 0.00% | 0.00% | none | 0 | 968/1,072 | 1,061/1,157 |
| heavy | stage 1 | 14,186 | 330.7 | 637 | 0.03% | 0.00% | 1,088 (Ring Island up, 777, 1015) | 2 | 1,293/1,476 | 1,380/1,527 |
| heavy | stage 2 | 14,075 | 434.0 | 823 | 0.39% | 0.06% | 1,291 (Quarry down, 124, 1013) | 28 | 1,652/1,796 | 1,749/1,863 |
| heavy | stage 3 | 13,073 | 509.6 | 925 | 0.94% | 0.14% | 1,386 (Stack head 2 up, 14014, 1026) | 38 | 1,914/2,014 | 2,011/2,147 |
| heavy | stage 4 | 12,048 | 587.0 | 1,007 | 2.92% | 0.44% | 1,379 (Stack head 3 up, 17722, 102d) | 46 | 2,182/2,294 | 2,281/2,400 |
| heavy | settled | 11,898 | 601.4 | 1,100 | 7.24% | 2.91% | 1,553 (Ring Island up, 391, 1022) | 48 | 2,182/2,293 | 2,279/2,406 |
| heavy | whole | 11,819 | 559.8 | 1,001 | 3.38% | 1.51% | 1,484 (Pier down, 8416, 101d) | 48 | 1,989/2,646 | 2,008/2,382 |
| light | stage 0 | 2,022 | 302.2 | 611 | 0.00% | 0.00% | none | 0 | 689/989 | 710/968 |
| light | stage 1 | 2,213 | 260.4 | 549 | 0.00% | 0.00% | none | 0 | 962/1,298 | 962/1,218 |
| light | stage 2 | 2,316 | 335.2 | 768 | 0.52% | 0.13% | 1,213 (Stack head 1 up, 11356, 1001) | 9 | 1,215/1,494 | 1,237/1,581 |
| light | stage 3 | 2,287 | 379.6 | 846 | 1.27% | 0.66% | 1,483 (Ring Island up, 10957, 1025) | 15 | 1,472/1,857 | 1,501/1,836 |
| light | stage 4 | 2,269 | 444.7 | 987 | 3.04% | 1.54% | 1,422 (Railhead down, 8638, 1023) | 30 | 1,739/2,117 | 1,771/2,096 |
| light | settled | 2,275 | 439.0 | 975 | 2.99% | 1.58% | 1,535 (Railhead up, 15251, 1019) | 31 | 1,740/2,096 | 1,772/2,203 |
| light | whole | 2,220 | 429.4 | 965 | 3.06% | 1.22% | 1,548 (Ring Island up, 16344, 100c) | 31 | 1,589/2,211 | 1,579/2,203 |

- **Hold 0%** (heavy only): the same to within a few waits (settled 602.1, 7.26%, 2.93%, worst 1,553).
- **Headway, settled:** heavy mean 909 to 951 by platform, coefficient of variation 0.23 to 0.31; light 732 to 753,
  0.31 to 0.42. At stage 0 heavy it is 725 to 732 and 0.04 to 0.14, as on main at `ring-joined`.
- **Stand past the dwell a lap, settled:** heavy High Gorge 70, Village 32, Ring Island 0; light Village 72, High
  Gorge 35. Longest stand at settled 594 (heavy) and 649 (light); 664 on the whole leg.
- **Nothing asked:** laps over non-stop fall from 1.078 at stage 0 to 1.032 settled.
- **Against the gates.** Light settled (2.99% over 1,050) misses table C's light row for the grown line (0.5%), so
  the long line needs a mechanism at a playtest's rate, not only as margin. Both rates exceed the owner's looser
  1,350 settled; every place is under 1,600 ([call 109](../agent-calls.md)).

### The first 1,000 ticks against the rest

Counts of waits by the tick the ask was made (sheet `leg1-e0`, hold 75%), first 1,000 ticks / the other 19,000:

| Rate, place | Over 1,350 | Over 1,158 | Over 1,050 | Worst asked after tick 1,000 |
| --- | --- | --- | --- | --- |
| heavy, stage 4 | 0 / 1 | 10 / 43 | 30 / 322 | 1,379 |
| heavy, settled | 23 / 16 | 110 / 236 | 165 / 696 | 1,514 |
| heavy, whole | 0 / 30 | 0 / 179 | 0 / 399 | 1,484 |
| light, stage 4 | 0 / 2 | 0 / 35 | 0 / 69 | 1,422 |
| light, settled | 0 / 8 | 1 / 35 | 3 / 65 | 1,535 |
| light, whole | 0 / 3 | 0 / 27 | 0 / 68 | 1,548 |

At heavy settled the first 5% of the run holds 23 of the 39 waits over 1,350 (*arithmetic*: 59%), so the state the
trains arrive in makes the worst waits early; but waits over 1,350 keep coming after it, up to 1,514, at both rates.
Stage 4 and "settled" differ only by 1,000 quiet ticks in the starting world and pool at 2.92% and 7.24%: 20,000
ticks do not forget the starting state. Any later candidate is judged from E0's starting state for this reason.

### E3, candidate B: a hold at Ring Island

`SPACING_CONTROL=<cap>,<on %>`: Ring Island the one control halt, `off` half of `on`. **"Early"** builds the base
worlds with B on throughout (the default); **"late"** builds them as E0 did and turns B on for the run alone. Round 1
(sheets `e3`) excluded the wagon's train for good, which made its `whole` variants equal E0 exactly; round 2 (`e3b`,
`e3c`) uses the designer's errand list. Rows below are round 2 unless marked. Cells are mean / over 1,050 / worst.

**48 seeds, cap 200, on 15%** (sheets `e3c`), against E0:

| Rate, place | E0 | B early | B late (from E0's starting state) |
| --- | --- | --- | --- |
| heavy, stage 4 | 587.0 / 2.92% / 1,379 | 582.1 / 1.39% / 1,250 | 585.1 / 2.62% / 1,379 |
| heavy, settled | 601.4 / 7.24% / 1,553 | 585.1 / 2.63% / 1,533 | 597.6 / 6.80% / 1,499 |
| heavy, whole | 559.8 / 3.38% / 1,484 | 557.5 / 3.19% / 1,484 | 557.5 / 3.19% / 1,484 |
| light, stage 4 | 444.7 / 3.04% / 1,422 | 390.5 / 0.39% / 1,238 | 389.2 / 0.61% / 1,181 |
| light, settled | 439.0 / 2.99% / 1,535 | 398.2 / 0.39% / 1,160 | 395.7 / 0.61% / 1,275 |
| light, whole | 429.4 / 3.06% / 1,548 | 395.7 / 1.48% / 1,353 | 395.7 / 1.48% / 1,353 |

Over 1,158 at 48 seeds: heavy settled 0.55% early and 2.74% late (E0 2.91%); light settled 0.04% early and 0.13% late
(E0 1.58%); light whole 0.31% (E0 1.22%). Early at stages 1 to 3: heavy 0.00%, 0.03%, 0.41% over 1,050 (E0 0.03%,
0.39%, 0.94%); light 0.00%, 0.04%, 0.00% (E0 0.00%, 0.52%, 1.27%). Stage 0 equals E0 in every column: Ring Island is
the end there and B does nothing.

**24-seed screen** (seeds 1000 to 1017; sheets `e0-24`, `e3b`, and `e3` for the diagnostic). Cells are mean / over 1,050:

| Run | Settled, heavy | Settled, light | Whole, heavy | Whole, light |
| --- | --- | --- | --- | --- |
| E0, these 24 seeds | 602.9 / 7.49% | 441.5 / 3.23% | 562.8 / 3.27% | 429.7 / 3.12% |
| 150, 15, early | 587.4 / 2.61% | 400.5 / 0.69% | 560.1 / 3.01% | 395.2 / 1.78% |
| 200, 15, early | 587.3 / 2.61% | 395.5 / 0.43% | 560.2 / 3.01% | 391.3 / 1.60% |
| 300, 15, early | 587.3 / 2.61% | 396.9 / 0.43% | 560.0 / 3.01% | 389.3 / 1.60% |
| 200, 25, early | 588.8 / 3.18% | 405.5 / 0.35% | 560.7 / 3.03% | 396.9 / 1.69% |
| 200, 15, `whole` (off while any train is on an errand), early | 588.8 / 2.79% | 394.8 / 0.52% | 561.4 / 3.08% | 397.5 / 1.51% |
| 150, 15, late | 599.1 / 7.20% | 395.5 / 0.52% | 560.1 / 3.01% | 395.2 / 1.78% |
| 200, 15, late | 599.0 / 7.18% | 386.7 / 0.35% | 560.2 / 3.01% | 391.3 / 1.60% |
| 300, 15, late | 598.7 / 7.20% | 387.7 / 0.35% | 560.0 / 3.01% | 389.3 / 1.60% |
| 200, 25, late | 599.3 / 7.21% | 398.2 / 0.43% | 560.7 / 3.03% | 396.9 / 1.69% |
| Diagnostic, round 1: 300, 15, also holding trains a lever ask is assigned to | 605.5 / 5.07% (worst 1,608) | 426.5 / 1.47% | 569.8 / 5.89% (worst 1,729) | 419.1 / 2.24% |

- **The starting-state effect.** The heavy gain is the starting state, not the rule under asks: with B on while the
  base world is built, heavy settled falls from 7.24% to 2.63%; from E0's starting state it falls to 6.80%. The
  whole-leg rows start from the same world either way and are identical early and late. Light asks gain either way
  (2.99% to 0.39% early, 0.61% late).
- **Why heavy asks barely move.** B never holds a train a lever ask is assigned to. On the sheets Ring Island's stand
  past the dwell is 5 ticks a lap early and 10 late at heavy settled, against 42 and 45 at light settled. (The scratch
  agent's report puts a lever ask on about 69% of train-ticks at heavy asks; that figure is not on a sheet.) Lifting
  the exclusion is the diagnostic row: worse at every place, and its whole-leg worst of 1,729 breaks the 1,600 cap.
- **The cap hardly matters** (150, 200 and 300 agree to a few waits); on 15% beats on 25% at heavy asks.
- **Nothing asked with B on** (sheet `e3c`, early): laps over non-stop 1.132 at worst (stage 1), 1.1 at stage 4 and
  settled, against E0's 1.032 to 1.078; wagon arrivals in 12,000 ticks 17, 11, 12, 8, 9 at stages 1 to 4 and settled
  against E0's 12, 10, 8, 7, 7, so the wagon's trips move on the grown line; kit changes equal E0's.
- **The rider's trip, light settled, 48 seeds:** down 1,859 early and 1,863 late against E0's 1,772 (*arithmetic*:
  +4.9% and +5.1%, at the review's 5% line); up 1,758 and 1,760 against 1,740.

**Kills and survivors:**

| Rule | Result on the sheets |
| --- | --- |
| Quiet lap at most 1.2 | Holds: 1.132 at worst |
| No train stands 1,200 ticks | Holds: 560 at settled at 200, 15; 664 on the whole leg, as in E0 |
| `lineSpacing` and the load check | Hold: errors 0 on every sheet |
| The rider's mean trip up at most 5% | 200, 15 is at the line (+4.9% early, +5.1% late, down trip, light settled) |
| The diagnostic (holding trains with an ask) | Killed: worse at every place; worst 1,729 on the whole leg and 1,714 at stage 4 at light asks, over the 1,600 cap |
| Section 3's keep rule (share over 1,050 at least halves on leg 1, mean no higher) | Light: kept at every place. Heavy: kept early only (2.63%); from E0's starting state it fails (6.80%), and on the whole leg it fails (3.38% to 3.19%) |
| The review's build rule (table C on leg 1 at both rates) | **Missed.** Heavy settled 2.63% early and 6.80% late against 1.0%, means 585 and 598 against 525, worst 1,533 against 1,158; light settled 0.39% meets 0.5% early and 0.61% late does not; light whole 1.48% |

**Survivors, at light asks only:** on 15% at caps 150 and 200, per train or `whole`; 200, 15 is the best at the
designer's cap. **B is not built** (the review: "built only if it meets table C on leg 1 at both rates"). B was not
run on main with Far Head as the control halt (E3's other half); on main's stages as they are it is inert, since Ring
Island is the end.

### How to rerun

`export PATH=$HOME/.nvm/versions/node/v26.13.0/bin:$PATH` first; each sweep runs at most 4 processes and writes
`sheet.txt`, `sheet.json` and `runs.jsonl` under `SPACING_OUT`. Every setting is an environment variable, listed at the
top of `sweep.ts` and `leg1-sweep.ts`; `SPACING_FROM=<runs.jsonl>` re-aggregates without running.

| Sheet | Branch | Command |
| --- | --- | --- |
| `e0-20k` | `scratch/spacing-e0` | `SPACING_OUT=.look/spacing/e0-20k node test/spacing/sweep.ts` |
| `e0-3k` | `scratch/spacing-e0` | the same with `SPACING_TICKS=3000` (the sheet holds heavy rows only) |
| `e2-v1` to `e2-v4` | `scratch/spacing-a` | `SPACING_PASS=<cm>,<band> SPACING_HOLDS=75 SPACING_OUT=.look/spacing/e2-v2 node test/spacing/sweep.ts`; unset for v0 |
| `leg1-e0` | `scratch/spacing-leg1-e0` | `SPACING_OUT=.look/spacing/leg1-e0 node test/spacing/leg1-sweep.ts` (about 45 minutes) |
| `e3c`, early | `scratch/spacing-leg1-b` | `SPACING_CONTROL=200,15 SPACING_HOLDS=75 SPACING_OUT=.look/spacing/e3c/early-200-15 node test/spacing/leg1-sweep.ts` |
| `e3c`, late | `scratch/spacing-leg1-b` | add `SPACING_CONTROL_LATE=1 SPACING_WHERE=stage4,settled,whole SPACING_QUIET=0` |
| `e3`, `e3b` screens | `scratch/spacing-leg1-b` | add `SPACING_SEEDS=1000-1017 SPACING_WHERE=stage2,stage4,settled,whole`; append `,whole` or `,asks` to `SPACING_CONTROL` |
| Off case, bit for bit | either leg 1 branch | `node test/spacing/compare.ts <a>/runs.jsonl <b>/runs.jsonl` |
| One run | leg 1 branches | `node --import ./test/helpers/rail-no-audit.ts test/spacing/leg1.ts fuzz settled 75 20000 heavy c0ffee,777,5eed,badd` |

The leg 1 harness sits on leg 1's step 3 branch, not on main; leg 1 has since shipped (v32), so a rerun on main first
reproduces `leg1-e0` or says what moved.
