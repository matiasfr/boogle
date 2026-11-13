> **Status: plan for the designer's and the owner's review (12 November 2026).** Nothing is built or measured by the
> planner. Figures are read from [train-spacing's Results](train-spacing.md#results-12-november-2026) or the catalog
> unless marked *arithmetic*. Section 6 runs before any build; nothing here waits for a playtest.

# Short turn: a train ends its trip at Ring Island and runs home into the gap

## Goal

On the long line, the leading train of two running close together turns back at Ring Island and fills the empty
stretch of the homeward track, so platform waits come back under the owner's "about 2 minutes 15" at a playtest's ask
rate, and to [table C](train-spacing.md#c-the-limit-as-a-rate) if it is reachable. Serves DESIGN.md's core loop (the
ride you built is worth waiting for), **7. Telegraph everything** and **8. Enjoyable alone and together**. It bends
"no player action affects spacing" in one corner (call 14) and "a lever calls the next train" for riders going past
Ring Island (call 12); both are under Calls.

**Read.** AGENTS.md's sim rows (lockstep, room-safety, mixed-builds, sync, tests); DESIGN.md; train-spacing (section 2,
Reference, the design review, Results); greybox-route (leg 1 in detail; the step 3 review's section A and its rulings;
the step 4 review's b, e and g); the rail Current rules; generic-lines sections 4, 5 and 7; [call 109](../agent-calls.md);
`src/sim/railway-trains.ts`, `railway-train.ts`, `railway-sys-trains.ts`, `railway-lines.ts`,
`railway-queries-trains.ts`, `railway-sys-trade.ts`; `src/entities/railway/train-view.ts`, `halts-view.ts`,
`island-boards.ts`, `line2-path.ts`, `seat-claims.ts`; the four scratch branches' harness. **Research:** the index has
nothing on headway or dispatch, and `docs/research/headway-control.md` (train-spacing's step 0) was never written, so
train-spacing's Reference (from memory, unverified) is the ground: item 6, "short-turning closes a gap fastest and is
what riders resent most", is why section 2 is built round the rider. [train-riding](../research/train-riding.md)
(dead time is the main complaint; a ride must be leavable) and [rail-network-depth](../research/rail-network-depth.md)
(the railway runs itself) hold. **Not run:** `npm run loop -- node` (no beat's bill, supply or cue changes; step 3
runs `npm run loop -- run`), `npm run level-check` (nothing is placed; one reach question is under Level findings).
**Inflight** (`npm run inflight`): `ship/matias-franco-8b44fb2` (73 h old) edits `src/entities/railway/halts-view.ts`,
which step 4 touches. **Port from Place:** nothing.

## 1. The player outcome

You pull a lever on the long line and a train your way stands there within about 2 minutes 15 at the very worst, and
usually within a minute, with one to three of you playing. Now and then a train's board changes to "Ring Island" and
its bell rings: it ends there, and the train right behind it takes you on to the Gorge from the platform across the
tracks. Nobody is put off a train with no train to step onto.

**What it must beat** (leg 1 as shipped, 48 seeds by 20,000 ticks, hold 75%; Results):

| Place | Light asks: mean / over 1,050 / worst | Heavy asks: mean / over 1,050 / worst |
| --- | --- | --- |
| Settled (the finished line) | 439.0 / 2.99% / 1,535 | 601.4 / 7.24% / 1,553 |
| The whole leg | 429.4 / 3.06% / 1,548 | 559.8 / 3.38% / 1,484 |

| Tier | Bar | Standing |
| --- | --- | --- |
| 1, the owner's looser rate | none over 1,350 settled, none over 1,600 growing, in the pinned sample, at light asks; heavy printed and no worse than E0 | the build bar (owner question 2) |
| 2, table C | settled: mean at most 525, at most 1.0% over 1,050 and none over 1,158 heavy; at most 0.5% over 1,050 light | recorded if reached; the gates tighten to it only then |

*Arithmetic*, why tier 2 may be out of reach: heavy settled headways average 909 to 951, so an even line waits about
465 and table C's 525 leaves 13% for unevenness, at five trains. The short turn shortens the inner line's headway
and lengthens the outer's; it adds no train.

## 2. The rule

**In plain words.** When two trains run out toward Ring Island close together, the one in front ends its trip there:
it takes the crossover, stands at the homeward platform and runs home. The one behind stops at Ring Island's outward
platform and runs on to the Gorge. A train on a build errand never turns and is never the one behind.

**Why the one in front.** The pair leaves most of a lap empty behind it (train-spacing, "the mechanism to beat").
Round the circuit, "behind the pair" is the homeward track from Ring Island to the Village: the turn lands the leader
exactly there, with five of the line's thirteen platform faces ahead of it. Turning the follower would land the same
way but strand its riders with the leader already gone; turning the leader leaves its riders a train in sight.

**Where.** Ring Island only: a town with both platforms, a crossover before them (s 1,137 to 1,159 m, stop at
1,190 m), 37% along the line. Far Head (crossover at s 490 m, stop 524 m) is measured as a variant, not planned.
The stub ends (the Pier, the Railhead, the stack heads) merge both tracks and cannot turn a train with others
running through.

**When** (all true, judged where a leg is planned: leaving a stand, or `replan`):

1. The line has grown past Ring Island (it is a middle halt), the room's `railShortTurn` is on, and no row of the
   line has `turn` set.
2. The train L runs up, is at or past the Railhead's stop (the last outward platform before Ring Island), can still
   brake for Ring Island, and its nose is short of the crossover's edge (`end.edgeCm`, 113,700).
3. A follower F is at most `turn.near` cm behind L round the circuit and can still brake for Ring Island.
4. The landing has room: `turn.room` cm clear ahead of and behind Ring Island's homeward stop, and `turnFree`
   (section 3).
5. Neither L nor F is on an errand (section 5); L carries no fare riders; L has no cord ask for a halt beyond Ring
   Island (only Stack head 3 can have one).

Then, in one apply: L's leg becomes `to` Ring Island with `turn` set, and F gets Ring Island's outward stop as a
rider's ask would give it (`reqAdd`, as `endMoved` does). Both are latched in the rows: nothing un-turns.

**In the code.**

- `src/sim/railway-lines.ts`: `RailLineDef.turn?: { halts: readonly number[]; near: number; room: number; meet: number }`;
  `turnOk(l)` (each halt has an `end` of kind `crossover` and is neither first nor last in the catalog; whole cm);
  `trainPlaces` throws on a bad one. Line 2 gets `halts: [Ring Island]` and E6's values. Absent: today's rules.
- `src/sim/railway-trains.ts`: `haltBlock(line, stops, k): EndBlock` (the block `endBlocks` would give halt `k` as an
  end); `circuitHolds(row, line, stops, tick): readonly number[]` (the pose, plus the landing for a `turn` row);
  `turnFree(rows, line, stops, slot, k, tick)`; `shortTurn(io, line, stops, slot, pose, tick): { k: number; f: number } | null`;
  `trainStepLine` and `replan` call `shortTurn` before `planLeg` and write the two rows. `blockFree`, `balancedHold`,
  `fleetJoin` and `lineSpacing` read `circuitHolds`. `trainServes` measures a `turn` row's distance to a platform as
  the rest of its leg plus the way on from its landing, so it is never the serving train for Ring Island's outward
  platform or any beyond. `TrainIO` gains `errand(slot): boolean` and `shortTurn: boolean`.
- `src/sim/railway-sys-trains.ts`: `trainErrand(w, slot)` (section 5; `scratch/spacing-a` has its first form) feeds
  `io.errand`; the tick's `railShortTurn` feeds `io.shortTurn`.
- `src/sim/railway-queries-trains.ts`: `railTrainEnds(w, slot): number` (the halt a `turn` row ends at, else -1);
  `railTrainMeets(w, slot): number` (the follower of a turning or just-turned train, the halt, else -1).
- **The meet.** F, standing at Ring Island's outward platform for the connection, leaves no earlier than
  `L.arrived + turn.meet` (L found as the row standing at that halt on the other track that arrived within
  `turn.meet`): a wait read from rows, capped by construction, so a rider has time to cross.

**Whoever is aboard.** The sim sees a train's cord asks (`Train.req`) and its fare riders (`Train.riders`, seated
little guys; line 2 has no fare route today). It does not see players: seats are a host-kind claim
(`src/entities/railway/seat.ts`) outside lockstep, and a player standing on a deck is seen by nothing. So the rule
never asks who is aboard; it guarantees the connection instead: no turn without a follower that will stand at Ring
Island, and the follower waits `turn.meet` for the crossing. A rider bound for Ring Island or home loses nothing.

**What is shown** (DESIGN.md 7; today no train shows a destination: the cab has a stop lamp and a hold lamp, and the
halts' maps show each train's marker, its next stop's ring and a hold badge):

| Where | From the latch on |
| --- | --- |
| The turning train | A headboard plate on the engine and the passenger car's side reading `RING ISLAND ONLY` (placeholder, not The Boogler's); its bell, as a cord ask rings it; its stop lamp lit |
| Aboard it | The request row reads "Ends at Ring Island" (blocked), replacing "Request stop"; at the stand, "Change here for High Gorge" |
| The follower | Its stop lamp lit for Ring Island (`railTrainAsked` already reads `req`); its plate `HIGH GORGE` |
| Every halt map | The turning train's marker carries a turn-back badge; Ring Island's ring blinks for it, as for any next stop |
| Ring Island's platforms | The turning train arrives at the homeward platform on the crossover, as it did when the island was the end (`line2-path.ts` draws a `turn` row); the outward lever, lamp and signal arm are untouched |

**Before you board.** Variant R above latches at the Railhead at the earliest, so a rider who boarded at the Village,
the Quarry or Far Head learns aboard, about 16 s before the stand (*arithmetic*: 198 m from a stand at the Railhead,
156 ticks). Variant V (section 6) decides at the Village before anyone boards, so every platform shows it; it needs a
row field and is built instead of R only if it measures as well (call 13).

## 3. The reservation, and why `blockFree` breaks

`blockFree` lets a train plan a leg whose end is `sepCm` behind the train ahead of it now, on the ground that "the
train ahead only moves on, so the gap holds all leg" and nobody overtakes (generic-lines 4). A short turn breaks both:
the turning train leaves the circuit at Ring Island's outward stop and reappears 4,081 m further round it
(*arithmetic*: twice the 2,040 m from Ring Island to the Gorge), ahead of every train on the outer line. A homeward
train that planned its leg into Ring Island a moment earlier has a train appear inside the leg it reserved. And
between the crossover and the stop the turning train runs up the homeward track, against its direction.

**The reservation is both tracks from the crossover to the stop, and the landing, from the latch until it lands:**

- `turnFree` is true when, for every other train O in service: O is at least `sepCm` clear ahead of the landing; O's
  own leg ends at least `sepCm` short of the landing (`blockFree`'s inequality, read from O's side, so no leg already
  planned runs through it); O is neither in nor bound for `haltBlock(k)`; and L's ordinary `blockFree` to the stop on
  the outward track holds.
- From the latch, every rule that reads a train's place reads a `turn` row at both (`circuitHolds`): a homeward train
  holds at the block signal at s 1,700 m or beyond; `lineSpacing` checks both places every tick of the fuzz.
- `replan` already leaves a `turn` row alone, and `trainRowBroken` already accepts one at a halt with an `end` that is
  no longer an open end: the row's shape for a short turn is the one `endMoved` writes today.
- **The cost:** a homeward train may stand at the signal 510 m short of Ring Island while a turn lands. Section 6
  bounds it.
- **`endMoved`'s `turn` rows** (a train on the crossover when the line grows) are read at both places too. That only
  adds a constraint for other trains; if it moves a nothing-asked tick, section 6's first kill rule catches it and the
  two-place reading is limited to rows latched by `shortTurn`.

## 4. State and save shape

| Piece | Sync kind | Shape |
| --- | --- | --- |
| The latch | Lockstep, the server's authority | `Train.turn`, as today |
| The follower's stop | Lockstep | a digit of `Train.req`, as today |
| The meet | Lockstep, derived | read from `arrived`; no field |
| `railShortTurn` | Room tunable (0 or 1, default 1), beside `railTrainHeadPct` | `src/tunables/catalog.ts`, `src/sim/tune.ts`; passed on `Tick`; no `env` fact |
| Plate, badge, bell, row | Cosmetic, local | views only |

No new op, component, state key, `types.ts` entry or `edits` generator. `invariants`: `lineSpacing` at both places;
`trainRowBroken` unchanged. **WORLD_NS: one bump, the next free version (v33 unless the fourth car takes it first),
for the rule change alone; no migration; one dated line; not mid-session.** Only if variant V is the one built, the
same bump adds `train.short` (int, -1 for none): additive, with its default in the spawn.

## 5. Errands, the stone stop, fares and riders

- **`trainErrand(w, slot)`** is true for: the wagon's train while `footingsOwed`; a train with a Q job's kit aboard or
  `kitOwed`; a train with `legKit` cargo, or owed a leg's kit; a train with steel or the steel works' kit aboard, or
  owed it. An errand train never turns, is never the follower (the connection stop would cost it a dwell for good),
  and E6 also runs `whole`: no turn while any train of the line is on an errand (the designer's rule for B).
- **The footing wagon.** Its stops are all on the inner line and footings are set before leg 1 opens, so it is an
  ordinary train by then; the clause guards a later leg.
- **Kit trains and steel** (gates 14 and 15): untouched by construction; checked by the kit and steel ticks in the
  nothing-asked rows and under light asks.
- **The stone stop.** A turned train is homeward, empty and on no errand, so it takes the Quarry's full-load stop as
  any train does, and sooner. Gate 5 (at least 32 in 20 minutes, none while footings are owed) is re-run.
- **Fares.** Line 2 has no route today (`TRADE.routes` is line 1's). A train with `riders > 0` never turns, so a
  later line 2 route needs no new rule.
- **Riders' asks.** A turn drops the old way's cord asks at the stand, as an end does; clause 5 keeps one from being
  dropped unserved.
- **Joins and growth.** A shed train is in no rule. One `turn` row a line at a time means no short turn while an
  `endMoved` turn is in flight.

## 6. Measurement before any build

On the existing harness, rebased onto main (leg 1 has shipped): `test/spacing/leg1.ts`, `leg1-sweep.ts`, `catalog.ts`,
`compare.ts`, and `run.ts` with `sweep.ts` for main's five stages. Branch `scratch/spacing-turn`, never merged. 48
seeds (1000 to 102f), 20,000 ticks, hold 75% (0% printed, safety only), heavy and light asks, places stage 0 to 4,
settled and whole.

**Switches to add** (`test/spacing/catalog.ts`, read before any rule runs):

| Variable | Meaning |
| --- | --- |
| `SPACING_TURN=<halt>,<near cm>,<room %>[,meet=<ticks>][,whole][,village=<gap %>][,any]` | Sets line 2's `turn`. `halt`: `ring`, `far` or `both`; `room` a share of an even gap (128,536 cm at five trains, *arithmetic*); `village`: variant V; `any`: the diagnostic (no follower, errand or cord clause) |
| `SPACING_TURN_LATE` | Default 1: base worlds built as E0 built them, the rule on for the run alone. 0 builds them with the rule on; printed, never gated |
| `SPACING_CONTROL` | As on `scratch/spacing-leg1-b`, for E9 only |

**Columns to add** to `leg1-sweep.ts`: turns a train-lap; the **through wait** (an outward ask at the Village, the
Quarry, Far Head and the Railhead, until a train that runs past Ring Island stands there: what a Gorge-bound asker
waits if a short train comes first); outer waits (Ring Island outward, Stack head 3 both ways, High Gorge) apart from
inner ones; the connection (ticks from L standing to F standing at Ring Island, mean and worst; turns with no F
standing within `meet`); a homeward train's stand for a landing, mean and worst; lamp lit 10 ticks then out, and the
serving train changing after a pull, as E2 counted them. The first-1,000-ticks split stays.

| Run | On | What |
| --- | --- | --- |
| E0′ | main, harness rebased | Must reproduce `leg1-e0` and `e0-20k` to the digit, or say what main changed since and re-baseline. Stop if it cannot be explained |
| E5 | leg 1 | The ceiling: `ring,any` at `room` 50, 75, 100. If its best misses tier 1 at light asks, stop: report, and the short turn is not built |
| E6 | leg 1 | Variant R: `near` 20,000, 40,000, 64,000 by `room` 50, 75, 100; `meet` 0 and 100; the best again with `whole` |
| E7 | leg 1 | `far` and `both` at E6's best |
| E8 | leg 1 | Variant V: `village` at 125, 150, 200 |
| E9 | leg 1 | E6's best with B at 200, 15 (B's light survivor) |
| E10 | main's five stages; leg 1 with `SPACING_TURN` unset | Off and inert cases bit for bit against E0′ (`compare.ts`): Ring Island is the end on every stage main had before leg 1 |

**Kill a variant when** (any one; "E0" is E0′ at the same rate and place):

1. Nothing asked: a stage tick, a wagon arrival, a footing, kit or steel tick differs from E0 at stage 0 or on main's
   stages; or the quiet lap passes 1.2 anywhere.
2. `lineSpacing` (both places) or the load check breaks; a train stands 1,200 ticks.
3. A turn with no follower standing at Ring Island within `meet` of the leader (the count is not zero; `any` is exempt).
4. The connection is over 250 ticks at worst, or a homeward train stands over 250 ticks for a landing.
5. The through wait's mean, share over 1,050 or worst is higher than E0's wait at the same platforms.
6. Outer waits: the mean rises over 5% or the share over 1,050 rises.
7. The rider's mean through trip under asks rises over 5%, either way.
8. A lamp lit 10 ticks goes out while its train can brake.
9. More than one outward train in five turns at light asks.
10. Any place over 1,600; frame idle or the railhead clause (the review's column 7) fails under light asks.

**Keep it only if**, from E0's starting state, the settled share over 1,050 at least halves at both rates (heavy to
3.62%, light to 1.49%) with the means no higher. **Build it only if** it also meets tier 1 with no kill; tier 2 is
recorded either way. **If nothing reaches tier 1:** report the best row with the Alternatives below; nothing is
built.

## 7. The proof gate

Train-spacing's gate items 1 to 9, 12 and 13 as written (the town economy's seven, the rate, the ride, safety at both
holds, step 3's gates on the grown line), with "the rate" read as section 1's tiers, and:

14. **Both places, every tick of both fuzzes, through the restores:** `lineSpacing` with `circuitHolds`; no train in
    or bound for `haltBlock` while a `turn` row is.
15. **The connection:** every turn has its follower standing at Ring Island's outward platform before
    `L.arrived + meet`, and leaving no earlier.
16. **Errands:** no errand train turns or follows; with `whole`, none turns while any is on one.
17. **Off is main:** `railShortTurn` 0, or `turn` absent, equals main over the committed fuzz and the 40 seed stages,
    tick and hash.
18. **No un-turn, no veto beyond clause 5:** a latched row lands; the R3b "griefing" test extended (lever pulls and
    cord asks at every tick cannot hold a train or force a turn).
19. **A real server:** step 6.

## Design

Lockstep throughout, the server's authority; who has authority and what is cosmetic are in section 4's table.
Controls: none (no action id, pad slot, key, touch or guide row; one blocked prompt row). Sim files: `railway-lines.ts`,
`railway-trains.ts`, `railway-sys-trains.ts`, `railway-queries-trains.ts`, `tune.ts`. Adapter: the tunable's pass on
`Tick` only. Views: `train-view.ts`, `island-boards.ts`, `halts-view.ts`.

## Steps

For an opus implementer. Each step leaves `node dev/ship-check.ts` green; full check, bots and `test:net` are the
checkpoint's.

- [ ] **1. Harness on main (S; nothing merges).** Branch `scratch/spacing-turn` from main; bring `test/spacing/*`
      from `origin/scratch/spacing-leg1-b` (no `src` file). Run E0′. Verify: `compare.ts` against the 12 November
      `runs.jsonl` files, or a written list of what moved.
- [ ] **2. The scratch rule and the sheets (M; nothing merges).** Section 2's code on the scratch branch, section 6's
      switches and columns, then E5 to E10. Unit tests there: a pair inside `near` turns the leader and stops the
      follower; outside it, no turn; no room at the landing, no turn; a homeward train bound into the block, no turn;
      an errand train on either side, no turn. The sheets' key rows go into this plan as "Results", each kill rule
      answered. **The designer rules on R or V, the values and the build.**
- [ ] **3. The rule (M; bump).** `src/sim/railway-lines.ts` (`turn`, `turnOk`, line 2's values);
      `src/sim/railway-trains.ts` (`haltBlock`, `circuitHolds`, `turnFree`, `shortTurn`, the meet, the four readers,
      `trainServes`); `src/sim/railway-sys-trains.ts` (`trainErrand`, `io.errand`, `io.shortTurn`);
      `src/sim/railway-queries-trains.ts` (`railTrainEnds`, `railTrainMeets`); `src/tunables/catalog.ts` and
      `src/sim/tune.ts` (`railShortTurn`); `src/world/namespace.ts`; pinned fixtures regenerated. Tests in
      `test/railway-trains.test.ts` (step 2's five, the meet, gate 17 on the fixture line),
      `test/railway-route-rules.test.ts` (gates 14 to 16 in the leg fuzz) and `test/railway-r3b1-review.test.ts`
      (gate 18). Verify: those files, `npm run loop -- run`, and section 7's items 1 to 9 on the long fuzz once.
- [ ] **4. The telling (M; no bump).** `src/entities/railway/train-view.ts` (the plate, the bell at the latch, the
      aboard row), `island-boards.ts` and `halts-view.ts` (the turn-back badge), `line2-path.ts` (a `turn` row at Ring
      Island as a middle halt crosses at `RING_END.cross`). Verify: a unit test on the row text; one `/look` at Ring
      Island with a turn landing and the follower at the outward platform, one aboard the turning train at the latch;
      game-design's trains section updated.
- [ ] **5. Independent review (a fresh agent, not the implementer).** Steps 3 and 4 against lockstep, room-safety and
      mixed-builds, the reservation in section 3 line by line, and gate 17's diff. Findings fixed before step 6.
- [ ] **6. A real server (S).** A host scenario on a served room: two clients on the grown line, a turn latched, a
      third client joining between the latch and the landing; all three agree on the rows and hash through the
      landing and the follower's meet, and the joiner's board shows the plate and badge. Then a mixed pair (one client
      on the build before the bump) is refused by the namespace, as any bump. Nothing new is on the wire (no op, no
      message); the snapshot of a `turn` row at a middle halt is what this proves.
- [ ] **7. Checkpoint "short turn".** `npm run check`; the long fuzz once at both rates; `npm run loop -- run`;
      `npm run test:net`; `npm run perf` only if step 4 adds a mesh a train (report the cost). Then the gates tighten
      as section 1's tier allows: `test/railway-route-rules.test.ts`'s wait bounds, [call 109](../agent-calls.md)
      closed or restated, the decision logged, and train-spacing's status note.

## Level findings

Nothing is placed, moved or gated, so no level check was run. **One reach question the rule depends on, owed before
the designer rules (step 2 answers it with a walk on the built island):** how long a player takes from Ring Island's
homeward platform to its outward one. The platforms face each other across both tracks (about 15 m, *arithmetic* from
`RING_HALT`'s lateral offsets); whether the tracks can be crossed at deck level there, and in how many seconds, sets
`turn.meet`. If they cannot be crossed in 10 s, R's connection is not real and only V stands.

## Risks

- **Safety.** This is the first rule that moves a train round the circuit out of order. A missed reader of
  `circuitHolds` is a collision the fuzz may not find at light asks; gate 14 runs at both rates and step 5 reads the
  reservation.
- **It may fire too seldom.** The block rule spaces trains by whole legs; candidate A's sheets show a follower within
  400 m is rare (at most 3.5% of asks were passed at that distance). `near` up to 64,000 cm and E5's ceiling answer this before any build.
- **Room safety, lockstep, mixed builds.** No effects in apply; integers and the sim's helpers only; nothing random
  or wall-clock. One bump with a dated line, not mid-session. `railShortTurn` 0 is today's rules without a build.
- **Hotspot files.** `railway-trains.ts` and its test (build 2, greybox step 4b, the fourth car); `halts-view.ts`
  (the inflight branch above). Step 3 lands after whichever is in flight rebases.
- **Starting state.** Candidate B passed the heavy keep rule only from a world built with B on. Section 6 gates the
  late runs alone.
- **Performance.** A few integer operations a planned leg; one plate a train and one badge quad a display.
- **Copy.** Four placeholder strings (`RING ISLAND ONLY`, `HIGH GORGE`, "Ends at Ring Island", "Change here for High
  Gorge"); none is The Boogler's, none of his is changed.

**Could not determine from the code:** whether Ring Island's tracks can be walked across at the platforms; how often
two outward trains are within `near` on the grown line; whether main's leg 1 equals the branch the 12 November sheets
ran on.

## Alternatives, a line each

- **More trains.** Refused by the ride gate: five are at 1.17 quiet, seven at 1.66 (greybox-route, step 3 review A.1);
  call 63 holds that more trains are not the lever.
- **A sixth train.** Unmeasured between those two; a longer queue at the ends for a sixth of the headway at best. E0′
  can print it in one sweep if the owner wants it (question 3).
- **A shorter dwell.** The dwell is the asker's time to reach the door (50 ticks); it cuts the lap, not the bunching.
- **A timetable hold at the Gorge.** Candidate C: control at a terminal only, where the balanced hold already stands
  up to 600 ticks and changes no digit on main; train-spacing's Reference item 2 says why it fails on a long line.
- **Accept the cap.** Leg 1 stays live at 1,600 (call 109) and "tighten when spacing lands" stays open; costs
  nothing and leaves about one wait in thirty over 105 s at a playtest's rate (*arithmetic*: 2.99%).

## Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Double track, a direction a track; nobody overtakes | Decided | [10 November](../decisions-rail.md#d-2026-11-10-the-railway-is-double-track). The turn is a reserved exception at a crossover |
| 2 | One lever per platform side; trains stop on request | Decided | [10 November](../decisions-rail.md#d-2026-11-10-trains-stop-on-request-at-the) |
| 3 | Ring Island has buffers with a crossover before it | Decided | [10 November](../decisions-rail.md#d-2026-11-10-open-calls-answered-ring-island). The turn uses it as built |
| 4 | Greybox waits: 1,350 settled, 1,600 growing until spacing lands, then tighten | Decided | [12 November](../decisions-rail.md#d-2026-11-12-greybox-waits-and-build-2-answered). Tier 1 |
| 5 | A train may wait 20 s for friends, with a bell | Decided | [10 November](../decisions-rail.md#d-2026-11-10-open-calls-answered-the-express-and). The ceiling for `meet` |
| 6 | Anything a playtest could tune is tunable | Decided | Owner call, 5 November. `railShortTurn` |
| 7 | Table C; the light row is gated; a mechanism is built only if it meets the table at both rates | Default | Train-spacing review, calls 10, 11, 18. Kept as tier 2; tier 1 is new (call 15) |
| 8 | Fleet 3 then 5; the joiner waits; block signals at section ends; Stack head 3 a kept request stop | Default | Greybox calls 63, 66, 81, 88. Kept |
| 9 | Leg 1 is live under the 1,600 cap alone | Default | Call 109, open with the owner |
| 10 | Errand trains never turn or follow; the `whole` variant is measured | Default | The designer's errand list for B |
| 11 | A rider's stop is always honoured | Default | Train-spacing review, call 21. Clause 5 |
| 12 | The leader of a close pair ends at Ring Island and the follower connects; a Gorge-bound rider changes trains there | **New** | Section 2. Owner question 1 |
| 13 | The turn is told aboard about 16 s ahead (R), not before boarding (V); V is built instead only if it measures as well | **New** | Section 2. Recommend R with the connection; the designer rules on the sheets |
| 14 | A cord ask for Stack head 3 stops a turn: a player action that can prevent a turn, never cause one or hold a train | **New** | Clause 5. Recommend yes: it restores today's behaviour only |
| 15 | The build bar is tier 1 at a playtest's rate; table C is recorded, not required | **New** | Section 1. Owner question 2 |
| 16 | The follower waits `meet` (at most 100 ticks) at Ring Island for the connection, riders aboard, no "go now" | **New** | Section 2. Half the express's 20 s; set from the walk in Level findings |
| 17 | The plate, the badge, the bell and the two rows; four placeholder strings | **New** | Section 2's table |

**Counts:** 6 Decided, 5 Default, 6 New. **Suspect lines of The Boogler's:** none written or changed.

## Open questions

For the owner; none holds steps 1 and 2. Planner's own: the three under "could not determine".

1. **"May a train end its trip at Ring Island and turn back, when the train right behind it takes you on to the
   Gorge?"**
   - **Yes (recommended):** its board and bell say so before it gets there, you step across the platform, and the
     next train is in sight and waits for you.
   - Only if the train says so before anyone boards it (decided at the Village).
   - Never: a train always runs to the end of the line.
   Answer: ___
2. **"Is 'about 2 minutes 15 at worst, usually under a minute' good enough to build this for, if the tighter target
   (at most one wait in a hundred over 105 s) stays out of reach?"**
   - **Yes (recommended):** it is the limit you set for the greybox, met at the rate you play at.
   - No: build it only if it reaches the tighter target.
   Answer: ___
3. **"If the short turn also misses, what then?"**
   - **Keep the long line as it is for the greybox and size the trains again when the next leg opens (recommended).**
   - Measure a sixth train.
   - Hold leg 1 until waits are fixed (reverses call 109).
   Answer: ___

## Design review (designer, 2026-11-12)

Reviews the plan above before anything is measured or built. Where this differs from sections 1, 2 and 6 or the Open
questions, this is what the measurement and any build take; the plan's steps and code are not edited.

**Read:** the plan; train-spacing's review and its Results; DESIGN.md 7, 8 and 11; the rail Current rules and the
dated entries on request stops, the express and interchanges, double track, Ring Island's end and the 12 November
greybox waits; owner-calls; [call 109](../agent-calls.md); `RING_HALT`, `RING_END` and `RING_FORMATION` in
`src/sim/railway-ring-layout.ts`, the island halt in `src/entities/ring-island/view.ts`, `TRAIN` and `TRAIN_EXTENT`;
[train-riding](../research/train-riding.md), [rail-network-depth](../research/rail-network-depth.md),
[route-contract](../research/route-contract.md) and
[progression-flow-layout](../research/progression-flow-layout.md) (top blocks). The research index has nothing on
headway or short-turning; train-spacing's Reference is from memory and unverified, as the plan says. **Not run:** any
fuzz, `npm run loop`, the playtest CLI (no session has a line long enough to bunch). `npm run level-check` does not
cover Ring Island. **No stills:** `npm run look` refused to start (the main checkout's install is out of step with
its lock file, and I did not reinstall the owner's checkout), so I have not seen the platforms, the bed between them
or a train standing there. The level findings below are from the layout data alone.

**Verdict.** **Cleared to measure** (steps 1 and 2, with the changes in E and F). **Not cleared to build:** call 12
is direction and waits for the owner's answer to question 1; steps 3 to 7 start only after it, after the walk in D,
and only if the sheet beats the cheaper candidates in F. 7 Decided, 10 Default, 7 New.

### A. Being put off a train (call 12)

**Acceptable only as a connection, never as a turn-out, and it is the owner's to say yes to.**

- **For it.** The owner has already put changing trains in the game: "every open stop is reachable from the first
  junction, by a connecting train held across the platform"
  ([10 November](../decisions-rail.md#d-2026-11-10-open-calls-answered-the-express-and)). The crossover turn is a
  sight every player has watched since Ring Island was the end. Co-op gains a meeting: a friend on each train of the
  pair end up on one train.
- **Against it.** Request stops were chosen so trains "go about their business" and to end "the train missed me"
  ([10 November](../decisions-rail.md#d-2026-11-10-trains-stop-on-request-at-the)). This is a new form of it: the
  train I boarded did not take me there. The sim cannot see the rider it does this to. Clause 5 protects only a cord
  ask for Stack head 3; the commonest long ride (the Village to High Gorge) pulls no cord, so the rule's main victim
  is invisible to it. With one to three players that rider is usually the only person on the line, so the whole
  cost lands on the one player and the gain (a homeward gap filled) often on nobody.
- **Solo.** Told aboard, you get off at the far platform, cross both tracks and board the follower 10 to 35 s later.
  If you miss it you ride home: the turning train's own stand is the plain 5 s dwell, which the plan does not
  mention. Recoverable (the cord stops it at the Railhead), never stranded, but it costs two legs and a wait.
- **With a friend on the other train.** The friend's train stops and waits for you: good. A friend waiting at the
  Gorge for you sees your marker turn back on the map; the badge must make that read as "changing", not "left".
- **So, if built:** every turn has a follower standing (the plan has this); **the turning train stands, doors open,
  for at least `meet` as well** (New, call 19); a rider can read the turn from a seat (C); and no more than one
  outward train in ten turns at light asks (E).

### B. Told aboard or before boarding (call 13)

"Announce consequential changes before they happen, and choose the warning length for the event." The event for a
rider is the change, and the last moment they can act differently is before boarding. **V is what the principle asks
for; R meets it only as a fallback.** The plan's rule is reversed: **V is built if it clears the bar in F, even if R
measures better. R is built only if V misses, R clears, and the owner has picked the first answer to question 1.**
Under V a plated train is a kind of train, like the express with its headboard, and nobody is put off unknowingly.
V keeps clause 3, the meet and call 19: a rider who boards a short train anyway still finds a train to step onto.
The plan does not say so.

### C. The telling (call 17, now a Default) and the cord (call 14)

- **The plate cannot be read by the rider it is for.** It is on the engine and the car's outside; the row shows only
  to someone at the cord. Add a telling visible from every seat (the same plate inside the car) in step 4.
- **The bell "as a cord ask rings it" says "someone asked for a stop".** Ring it twice for a turn. No new recipe.
- **The follower's meet is a hold:** doors open, the hold lamp (`railTrainHeld`), the bell two seconds before it
  leaves, as ruled for B (train-spacing review, call 15). The plan's table leaves these out.
- **The four strings** are acceptable placeholders. "Change here for High Gorge" is helper text (DESIGN.md 11) and
  stays only because the follower's plate across the tracks says the same thing in the world.
- **Call 14: yes.** A cord ask beyond Ring Island prevents the turn. It can only restore today's behaviour, it costs
  the rider a stop they did not want, and gate 18 guards it. The sheet counts turns it prevents at heavy asks.
- **Call 16: yes,** at `meet` no higher than 200 (the owner's 20 s, call 5) and no lower than D's figure.

### D. Level: the crossing at Ring Island (the plan's flag)

**From the data.** The homeward platform is east (lat +1.8 to +5.3), the outward one west (-9.3 to -5.8), both 0.9 m
over a 7.6 m bed with the tracks at lat 0 and -4. I found no plank crossing, ramp or step between them in the
island's view (the generic halts have plank crossings; a search of the file is not a look). A standing train is 17.2 m long and
solid, with the passenger car at the platforms' middle, so both trains of the pair stand across the straight line.

| Leg | Distance | Time |
| --- | --- | --- |
| Seat on L to L's end, along the east platform | about 9 m | 1.6 s, plus unseating |
| Down 0.9 m, across the bed, up 0.9 m | 7.6 m | 1.4 s, plus the climb (unproved with the plain jump) |
| Back along the west platform to F's car | about 9 m | 1.6 s |

About 5 s of walking plus two kerbs and the unseat (*arithmetic*): at or over the plan's 10 s with no margin. The
follower arrives on the track the rider is crossing.

**What the walk must measure for the rule to stand** (step 2, on the built island, both trains standing, plain walk
and the plain jump only, three tries, by a bot or a session; the worst is T):

1. From seated in L's passenger car to standing in F's, in ticks.
2. That the 0.9 m kerb is climbed by the plain jump every try, from the bed, with a train standing beside it.
3. What a train arriving on the outward track does to a player in the bed (pushed clear, carried, or stuck).
4. The same walk the other way (the outward platform to the homeward one), which leg 1 already asks of anyone going
   home from the west platform: flow rule 3, nobody stranded, has no proof here today.

`meet` is T plus 50 ticks to notice and stand up, and at most 200. **If T is over 150, or the kerb or the bed fails,
neither R nor V stands as planned** (V's rider crosses too): a foot crossing at the platforms is planned and
level-checked first, and no meet is stretched to cover the walk.

### E. The kill and keep rules as the player's experience

The plan's rules mostly measure platforms and trains. Changes (Default, call 21):

- **Rule 5, "the through wait", is V's measure only.** Under R a player boards the first train that stands. Add,
  for both variants, **the Gorge-bound journey:** from an outward lever pull at the Village, the Quarry, Far Head or
  the Railhead to standing at High Gorge, taking the first train that stands and changing if it turns; mean, p95 and
  worst against E0's same journey; the share of journeys with a change. Kill if the mean is higher than E0's at
  either rate, or a journey with a change is over 250 ticks longer than that train would have taken running through.
- **Rule 7** counts journeys, not trains: a turned train makes no through trip and would drop out of the mean.
- **Rule 4.** "The connection" is from L standing to F **leaving**, at most 250 and never under `meet`. The homeward
  stand for a landing is at most **200**, not 250: it is away from a platform with nothing to step onto
  (train-riding, recommendation 6), and 20 s is the owner's one figure for a train standing with players aboard. Print
  how many a lap.
- **Rule 9:** one outward train in **ten** at light asks, the figure candidate A was held to.
- **Add: the turning train leaves no earlier than `meet` after it stands** (call 19), and its cost to the gap it was
  sent to fill is on the sheet.
- **Add: waits by platform and way.** Of the eleven worst waits E0 names on leg 1, eight are outward asks (Ring
  Island up four times, the Railhead up, each stack head up) and three homeward (the Quarry, the Pier, the Railhead).
  A turned train serves an outward ask only after an inner lap, and section 2 argues from homeward gaps. Kill if
  Ring Island's or the Railhead's outward worst rises.
- **Add: no outer platform's worst rises** (rule 6 has the mean and the share). The player building the next leg
  waits at the outer end.
- **Strike nothing.** Rules 1 to 3, 8 and 10 stand.

### F. The bar (call 15) and the cheaper experiments first

- **Tier 1 alone is not a reason to build this.** "None over 1,350 settled" removes 8 of 2,275 light waits and 39 of
  11,898 heavy (Results, *arithmetic*): one wait in three hundred, shortened by up to 20 s. The plan's keep rule (the
  share over 1,050 at least halves at both rates, means no higher) is the part a player feels. The build bar is
  both, as the plan has it, **and the short turn must beat the best cheaper candidate on the same sheet** (New, call
  22).
- **Candidate B's light survivor already meets tier 1 as this plan writes it,** from E0's starting state: light
  settled 395.7 / 0.61% / 1,275, light whole 1,353, heavy no worse than E0 (Results, cap 200 on 15%, late). It fails
  the heavy halving (6.80%) and sits on the 5% trip line (+5.1%). It was refused against table C, before the looser
  rate. It puts nobody off a train. The plan's Alternatives do not list it; E9 only adds it to the turn.
- **Candidate C was never run** (train-spacing's status: "E1 (candidate C) and E4 were not run"). Its stand-in is a
  tunable, `railTrainHeadPct` at 100, 115 and 130, with no `src` change. The sheets also say stage 4 and "settled"
  differ only by 1,000 quiet ticks and pool at 2.92% and 7.24%: something about how the trains sit when nothing is
  asked makes the worst waits, and the end holds are where that is set.
- **A sixth train is one catalog value** (`fleet.trains`), with the quiet lap printed against the 1.2 gate.
- **So step 1 also runs, before the scratch rule is written:** E1 on leg 1; six trains on leg 1; B 200, 15 late
  reprinted against tier 1 and the keep rule. All three need no new sim code. Step 2 may start beside them, but its
  Results print them in the same table, and a cheaper candidate that clears the bar is built instead. None of this
  waits for the owner; question 3's "measure a sixth train" is simply done.
- A shorter dwell stays refused (the dwell is the asker's walk to the door). Accepting the cap stays the fallback.

### Findings

1. **Change before step 1:** add E1, the six-train sweep and B's reprint (F).
2. **Change before step 2:** the journey column, the platform-and-way table, call 19's stand and E's amended rules;
   V keeps the follower clause and the meet.
3. **Change before the designer rules on the sheets:** the walk in D, all four measures. A reach claim with no proof.
4. **Change before step 4:** the in-car telling, the double bell, the follower's hold lamp and bell (C).
5. **Flow.** Rule 1 holds. Rule 3 (nobody stranded) holds only with the follower clause in both variants and a
   proved crossing; a rider who stays aboard is carried home and can stop the train, so is not stranded. The lens "a
   place to meet in co-op" is served. Route contract: nothing supplies a route or skips work.
6. **Order (game-direction).** Nothing waits on this plan: leg 1 is live under call 109 and the owner called waits
   of about 2 minutes 15 fine until spacing lands. That is also why question 1 can wait for him.
7. **Port from Place:** nothing, agreed.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 to 6 | As the plan's table | Decided | Agreed |
| 7 | Every open stop is reachable "by a connecting train held across the platform" | Decided | [10 November](../decisions-rail.md#d-2026-11-10-open-calls-answered-the-express-and). The precedent for changing trains; it does not cover an ordinary train ending early |
| 8 to 12 | The plan's calls 7 to 11 | Default | Already logged; kept |
| 13 | The plate, the turn-back badge and the four placeholder strings (the plan's call 17) | Default | View only. With C's additions |
| 14 | A turn is told inside the car, by two bell strokes; the follower's meet shows doors open, the hold lamp and a bell before leaving | Default | Section C |
| 15 | `meet` is the measured walk plus 50 ticks, at most 200; over 150 a foot crossing is planned first | Default | Section D |
| 16 | The amended kill rules: the Gorge-bound journey, the connection to F leaving, a homeward stand of at most 200, one train in ten, waits by platform and way | Default | Section E |
| 17 | E1, a six-train sweep and B's reprint run in step 1 | Default | Section F |
| 18 | The leader of a close pair ends at Ring Island and a Gorge-bound rider changes (the plan's call 12) | **New** | Direction. **Waits for the owner** (question 1) before any build; measured meanwhile |
| 19 | The turning train stands, doors open, at least `meet` | **New** | Section A. Or a rider has 5 s to leave it |
| 20 | Shown before boarding (V) is built if it clears the bar; told aboard (R) only if V misses and the owner picks it (the plan's call 13, reversed) | **New** | Section B |
| 21 | A cord ask beyond Ring Island prevents a turn (the plan's call 14) | **New** | Yes. Section C |
| 22 | The build bar is tier 1 with the keep rule, and the short turn must beat the best of B, C and six trains on the same sheet (the plan's call 15, amended) | **New** | Section F. Table C stays tier 2 |
| 23 | The follower waits `meet` with riders aboard, no "go now" (the plan's call 16) | **New** | Yes, shown as call 14 |
| 24 | A cheaper candidate that clears the bar is built instead of the short turn | **New** | Section F. B's 20 s stand is the train-spacing review's call 23, still open with the owner |

**Counts:** 7 Decided, 10 Default, 7 New. **Suspect lines of The Boogler's:** none written or changed.

### Owner questions

These replace the plan's three. Only question 1 holds anything, and only the build.

1. **"May a train end its trip at Ring Island and turn back, when the train right behind it takes you on to the
   Gorge?"** Direction: it changes what boarding a train means. Nothing is built until this is answered.
   - **Only if the train says so before anyone boards it (recommended):** it wears "Ring Island only" from the
     Village, so you choose it or the next one, and the next one waits for you at Ring Island either way.
   - Yes, even when you learn aboard: a bell and a board about 16 s before, both trains wait, you cross the platform.
   - Never: a train always runs to the end of the line, and trains are evened out some other way.
   Answer: ___
2. **"If the long line can be brought to 'about 2 minutes 15 at worst, usually under a minute' by a train standing
   up to 20 s at Ring Island with its doors open, or by a sixth train, should that be built instead of the turn?"**
   - **Yes (recommended; built on the sheet until he answers):** nobody is put off a train.
   - No: build the turn if it measures best.
   Answer: ___

**The plan's questions.** Its question 1 is the owner's (above). Its question 2 is not: the bar is a gate figure
inside his 12 November words, ruled in F and logged. Its question 3 is not yet a question: the sixth train is
measured in step 1 without asking, and holding leg 1 is his to raise ([call 109](../agent-calls.md)).
