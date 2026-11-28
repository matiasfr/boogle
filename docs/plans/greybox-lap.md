> **26 November 2026.** Planner, against main `7c12b2bd0` (world v74). The owner asked "does the map have the sort of
> circular interconnection from the original plan?" and said yes to a plan for it. This is that plan: the lap, the
> ring's two halves joined so a train runs all the way round. Steps 1 and 2 ship together as one bump; 3 to 5 after.
> Design review [near the end](#design-review-2026-11-26); [open questions](#open-questions) last. Nothing here waits
> for the owner.

# The lap: line 2 runs on round the White Wall to the West landing

**Where the halves meet (a correction to the brief).** The brief, and the route plan's mechanisms table, put the meeting
at Port Quay, "buffers side by side". On main they meet at **High Gorge**, end-on: leg 5 (route review ruling 2,
confirmed 16 November) grew the `cave` row on from Port Quay along the White Wall, through Canopy Town and round the
south stack into the split, where its buffers stand 8.0 m from line 2's, on one axis
([leg 5's still](greybox-leg5/step5-gorge-arrival.png): the Wall's two tracks run into its buffers, line 2's concourse
beyond). Today:

- **Line 2**: Village, Quarry, Far Head, the Pier, the Railhead, Ring Island, the three Stack heads, High Gorge
  (3,209 m, 6 trains).
- **The cave line** (sim line 4, catalog row `cave`): West landing, Saltpan, Port Quay, the Wall's heads, Canopy Town
  (the Wall's halt on the isle's east side), head 5, High Gorge (5,305 m, 5 trains at the last stage).

A rider from the Village to the Wall changes trains at the Gorge: a 51 m walk from line 2's stop to the Wall's and a
wait for a Wall train. Port Quay is a middle halt of the cave line and this plan does not touch its track, its yard or
the Roundhouse building there ([port-quay-roundhouse](port-quay-roundhouse.md) steps 3 to 6 are unaffected; see
[Risks](#risks) for the one shared file).

**Goal.** When the room lays the White Wall's last section, the track runs on into line 2's at High Gorge and the two
halves become one line: a train leaves the Village, runs out over Ring Island, through the Gorge, along the Wall past
Canopy and Port Quay and the Saltpan, and ends at the West landing, Home's other front, 100 to 130 m on foot from where
it started. Every train the room already runs keeps running, now round the whole ring. Serves DESIGN.md's core loop
("the rail builds the world": the network closes because of what you connected), **7. Telegraph everything** (the
Wall's line has been on Home's horizon since minute one; line 2's buffers at the Gorge say the Wall joins there) and
**8. Enjoyable alone and together** (the longest ride in the game, taken solo or with friends). It bends nothing.

**What "the lap" is not.** The 12 November answer reads "the train goes through the ring later, at the White Wall lap,
as the late double-back" ([entry](../decisions-rail.md#d-2026-11-12-ring-island-build-2-and-the-greybox-route-answered)).
"The ring" there is Ring Island's ring: world-blockout's double-back table dates "Ring Island again: the train threads
the ring" at about 5.8 hours and lists what it needs as "the closed ring and the express fitting"
([world-blockout](world-blockout.md#doubling-back)). This plan builds the closed ring. Threading Ring Island's ring is a
new mechanism (a spur through the aperture, a ride with no stop at its end) and needs `/brainstorm` first
([question 1](#open-questions)).

**Read for this.** AGENTS.md; `npm run map -- --kind docs` and `--kind lockstep-system` (no `plan` kind); the planner
agent; DESIGN.md; owner-calls' index; the rail topic's Current rules with the 10 November rail-map, buffers and junction
entries, the 12 November Ring Island build 2 entry, the 23 November service-health entry and the 25 November order
choice entries; [greybox-route](greybox-route.md) (section 3's mechanisms table, open question 2, the design review's
ruling 2 and section 6's exit table); [rail-map](rail-map.md) ("The shape it gives the network", finding 5, call 31);
[greybox-leg4](greybox-leg4.md) and [greybox-leg5](greybox-leg5.md) with their as-built notes; [port-quay-roundhouse](port-quay-roundhouse.md);
[order-choice](order-choice.md); [prefeed-gated-frames](prefeed-gated-frames.md); `src/sim/AGENTS.md`,
`src/world/AGENTS.md`; lockstep, mixed-builds and room-safety. Code: `src/sim/railway-lines.ts` (`RAIL_LINES`,
`RAIL_TRAINS`, `appendLeg`, `trainPlaces`), `railway-train.ts` (`trainStopsOf`, `fleetOf`, `lineStagesOf`, `BOILER`,
`REQ_MAX_STOPS`), `railway-trains.ts` (`LINE_SLOTS`, `servingSlots`, `endBlocks`, `cycleTicks`, `headTicks`,
`balancedHold`, `fleetJoin`, `endMoved`), `railway-route.ts`, `railway-world-lines.ts`, `railway-sys-trains.ts`
(`serviceOf`), `railway-queries-route.ts` (the kit's roles), `railway-queries-trade.ts` (`routeFar`, `fareOf`),
`railway-components.ts` (`Train`, `Line`), `src/content/levels/gorge.ts`, `src/entities/route-greybox/massing.ts`,
`src/entities/railway/line2-path.ts` and `row-path.ts` (each line's lateral), `dev/level/route-leg5.ts`,
`dev/level/track-continuity.ts`, `dev/loop/graph.ts`.

**Research.** [train-riding](../research/train-riding.md) ("a ride is a stage"): used; the lap is the game's longest
ride and its stage is already built (the Wall's islets, Canopy's trees, High Port's face, the split); this plan adds no
lineside beat. [route-contract](../research/route-contract.md): the lap is a travel edge and supplies no work; no gate
or bill changes. [progression-flow-layout](../research/progression-flow-layout.md) (lens 6, a world that shortens behind
you): partly; it shortens Gorge-to-Wall trips, not Home-to-Port Quay ([measured](#what-it-is-measured)).
[rail-network-depth](../research/rail-network-depth.md): none relevant (no routing choice is added).

**The rail route as it stands** (`npm run loop -- node wall-6`): the Wall's last section, Port Quay to High Gorge
section 6 of 6, 20 logs + 20 rails, supplied by a cave train from the West landing, after the deep-span barrier; its
`stops: ['gorge']`. Leg 5's Checkpoint E measured about 4 to 5 minutes standing at that section in every room size.

**In flight** (`npm run inflight`, 26 November): one ship branch touching `docs/agents/orchestrator-state.md` and
`docs/backlog.md` only. The brief names `codex/port-quay-roundhouse-view` (step 3, views only) and `codex/order-choice-bot`
(order choice step 5: `dev/loop/`, `dev/look/bots/railway-legs.ts`); [prefeed-gated-frames](prefeed-gated-frames.md) is
planned on main and changes how a gated frame lays (the deep span's is the Wall's section 6). Order: [below](#order-and-what-waits).

## What it is, measured

All numbers from scratch scripts on the catalog and `dev/level/` helpers in this worktree, deleted afterwards; the
trial edit to `gorge.ts` was reverted. Split coordinates are `gorgeAt`'s (`a` along the split's axis from line 2's
buffer point, positive north-east; `c` across it).

**The two halves at the Gorge.**

| | Line 2 | The Wall (cave line) |
| --- | --- | --- |
| Arrives | From the north-east on a curve (about 240 m radius), its last chord 1.6° off the axis | From the south-west on a 128 m straight on the axis (a −136 to −8), after a 100 m turn round the south stack's tip |
| Buffers | a 0, c 0.00 | a −8.0, c 0.05 |
| Stop | s 3,231.40 m before and after the slew; world (−86.41, −1976.84) m, a ≈ +20 | cave s 5,325.00 m, a −31 |
| Tracks | c 0 (outward, its sim path) and c +4 (homeward, lat −4 m) | c −2 and c +2 (a centred formation, ±2 m) |
| Platforms | c −1.8 to −6.3 and c +5.8 to +10.3, a 0 to +40 | c −3.8 to −7.8 and c +3.8 to +7.8, a −51 to −4 |
| Between | the concourse, a −4 to 0, c −9.3 to +13.3, at 3.9 m, joining all four platforms and the stair's gangway | |

**The joint as the halves stand fails; a 2 m slew fixes it.** Line 2's formation is offset (its path is the outward
track and the homeward track lies 4 m to the side); the Wall's is centred on its row. So joined straight on, both
tracks jog 2 m sideways in the 8 m between the buffers. Measured on 5 m chords, as the continuity report samples:

| Joint | South-west-bound track | North-east-bound track |
| --- | --- | --- |
| As built, joined straight | a 12.4° turn at the old Wall buffers, radius 33 m | 10.6°, radius 44 m (38 to 52 m at a +1 to +3) |
| The Wall's last straight slewed 2 m to c +2 over a −136 to −56 (smoothstep, before its Gorge platforms) | smallest radius 98 m, which is the existing Gorge turn round the stack (100.42 m on the catalog's chords); nothing new under 100 m within 140 m of the joint | smallest radius 94 m, the same existing turn |
| Same slew over a −56 to −8 (on the platforms) | 89.5 m | 93.7 m |

The slew's own radius is about 530 m (2 m over 80 m). Line 2's last chord stays 1.6° off the axis, under the 2° kink
gate unaided; step 1 eases it anyway. The decided "track has no visible kinks" (10 November) makes the slew a
requirement, not a polish.

**The Wall's Gorge platforms move 2 m with it.** As built the Wall's south platform (c +3.8 to +7.8) would stand 0.2 m
over the slewed north-east-bound track's centreline (c +4). Re-laid at c +5.8 to +9.8 and c −5.8 to −1.8 their edges line
up with line 2's (c −1.8 and +5.8): one station 91 m long each side (a −51 to +40), cut only by the crossing.

**The concourse becomes a plank crossing.** It lies across the joined tracks. Trial (reverted): the concourse kept at
deck height outside the tracks (c −9.3 to −6.3 and +10.3 to +13.3), 4.5 m ramps down to planks at 3.35 m between the
platform edges (c −1.8 to +5.8, a −4 to 0), Port Quay's foot-crossing pattern (`leg4.ts`, `platform-crossing-step` and
`foot-plank-*`, 3.9 m to 3.35 m). With the Wall's platforms moved, on the built `gorge.json`:

- Every walk reaches every other on foot: line 2's two platforms, the Wall's two, the stair's foot, the incline barrier's
  pad, the town pad and the crossing; the water reaches all of them.
- The town pad's six clear metres to the north platform hold (leg 5's check).
- Nothing solid stands above plank level inside the tracks' envelope (c −1.5 to +5.5) from a −60 to 0.
- `npm run level-check`, the whole suite on the trial positions: 29 reports, exit 0, every route leg 5 line "ok"
  (186.5 s under load; time is not evidence).

**One line, measured.** Line 2's path runs on past its buffers (a 0) 8 m to the Wall's row end and then back along the
`cave` row, so the joined line's s is `LAP_S0 − cave s` past the joint, with `LAP_S0` = line 2's `s` at its row end
(about 3,250.4 m) + the 8.0 m joint + the `cave` row's length (about 5,348.0 m), about 8,606.5 m; step 2 computes it
from the regenerated catalog.

| | One way | Non-stop round trip, two dwells (ticks): 20 / 25 / 30 m/s | Trains | Even headway (s): 20 / 25 / 30 m/s |
| --- | --- | --- | --- | --- |
| Line 2 today (Village to the Gorge) | 3,209 m | 3,424 / 2,810 / 2,412 | 6 | 57 / 47 / 40 |
| The cave line today (West landing to the Gorge), its row's 20 m/s | 5,305 m | 5,520 | 5 | 110 |
| **Joined** (Village to the West landing) | **8,565 m** | 8,780 / 7,096 / 5,982 | **11** | **80 / 65 / 54** |
| Joined, with a twelfth train | | | 12 | 73 / 59 / 50 |

The 75% headway hold (`TRAIN_HEAD_PCT`) is 60, 48 and 41 s for the joined line's 11 trains at the three speeds. The
joined line's halts: line 2's ten, then head 5, Canopy (the Wall's), Port Quay, the Saltpan and the West landing: 15,
well under `REQ_MAX_STOPS` (26).

**The ride.** Village to the West landing non-stop: 434 s at 20 m/s, 350 s at 25, 294 s at 30. Village to Port Quay
through: 374, 302 and 254 s; today it is Village to the Gorge (166, 136, 116 s) plus the walk and a wait for a Wall train
(even headway 110 s) plus 211 s down the Wall. Home to Port Quay stays fastest the short way, from the West landing on
the cave half (1.2 km, about a minute): the lap is a ride and a through service, not a shortcut home.

## Design

### What a player sees and does differently

1. **Before the Wall reaches the Gorge.** Line 2 still ends at High Gorge's buffers. Their end board names what comes
   (placeholder: "WHITE WALL LINE JOINS HERE"). The Wall's Gorge platforms already stand in the split's west half, 2 m
   south of where they stand today, empty. Nothing else changes for legs 1 to 5's play.
2. **The last section lays the ring shut.** At head 5, with the deep span's barrier open and section 6's bill fed, the
   lay runs 731 m round the south stack into the split and on through the concourse into line 2's rails: the buffers
   on both sides never stand in the way (line 2's are lifted with the lay; the Wall's are never built). The concourse
   becomes a plank crossing as the lay reaches it. Players at the Gorge see the rail arrive from the sea mouth; players
   at head 5 see it go.
3. **Then the first train through.** The next train from head 5 runs on through the split without stopping (unless
   asked), up the stack line, over Ring Island and home to the Village. A Village train runs on through the Gorge,
   along the Wall, past Canopy and Port Quay, to the West landing. **A rider stays aboard round the ring**; nobody
   changes trains at the Gorge again.
4. **Which trains.** All of them: line 2's six and the cave line's five run as one line of eleven, in both directions,
   end to end between the Village and the West landing (the decided double track, right-hand running). Each keeps its
   own cars and errands: riders, steel, the footing wagon and line 2's kit stay with line 2's own six, as today.
5. **Stops.** Every halt of both halves is a request stop of the one line, as each is today; the two ends are the Village
   and the West landing, both at Home, 100 to 130 m apart on foot (decided, rail-map). High Gorge is one stop, at line 2's
   mark, with platforms both sides from the Wall's end to line 2's. The Wall's own Gorge stop never opens.
6. **Levers and boards.** One lever a platform side as now. The plaques name the next big place that way (rail-map call
   28): at the Gorge "Ring Island" one way and "Canopy Town" the other, at Port Quay "Canopy Town" and "Saltpan"
   (placeholders).
7. **The line map.** The halt boards' island map and Home's live line map draw one line, line 2, from the Village round
   to the West landing; the cave line's separate stroke goes. The joined line keeps the name "Line 2" (a placeholder;
   naming is the owner's).
8. **The riders' far end stays High Gorge** (fare 34, as now): the Village's riders ride to the Gorge, not round to the
   West landing ([call 6](#calls)).
9. **The lap opens nothing.** No barrier, pickup, bill or ability; the Notch and the causeway follow the Wall as now.

**Co-op.** Friends split between Port Quay's Roundhouse and the Village are on one line; a friend arriving late at the
Village rides straight to any Wall head. **Solo** is unchanged in work and gains the ride.

### The line model: one line, the cave line's trains join it in place

**One line** (decided as the working map, rail-map, 10 November; finding 5: "the two rows merge, with the cave half's
`s` running the other way"). Line 2's catalog grows on past High Gorge over the cave row reversed; the cave line stops
running once joined; its five train rows keep their slots and run line 2's rules from the join tick.

The alternative was weighed and is not planned:

| | Join in place (planned) | Drain and replace |
| --- | --- | --- |
| At the join | Each cave train's row is rewritten into line 2's coordinates on the lay's tick; its pose does not move | Cave trains run home to the West landing and enter the shed; line 2 gains five new rows that join at the Village; line 2 runs only to the Gorge until the cave line is empty |
| Seen | Nothing jumps; riders and standing players stay aboard | A gap of up to one cave trip (about 4 to 6 minutes) before the first through train; five trains vanish and five appear |
| Cost | A slot's running line becomes stage-dependent (about 94 reads of `RAIL_TRAINS[slot].line`, `LINE_SLOTS`, `lineSlots`, `servingSlots` across 25 files sort into running and cargo) | Five more train rows, a shrinking fleet (today's catalog refuses one), a drain phase |

**Two meanings of "a train's line".** A slot keeps its **origin line** (`RAIL_TRAINS[slot].line`, static): its cars, its
cargo roles (riders and `lineRoute`, steel, the wagon, the kit it mints or relays: `MINT_LEGS`, `YARD_LEGS`,
`SERVED_LEGS`), what the view draws behind its engine. Its **running line** (`runLine(slot, joined)`) is the origin, or
line 2 once the cave line has joined: the track, stops, asks, end blocks, spacing, holds, fleet, fit and pose. Step 2
sorts every read into one of the two; nothing else is new state.

**When.** `lapJoined(legs)`: the `wall` leg (RAIL_LEGS 5) has all six sections laid. A derived fact of the `Leg` rows;
no saved bit.

**The catalog (step 2, `src/sim/railway-lines.ts`).**

- The cave line's def gains `joins: { line: LINE2, leg: WALL_LEG }`: once that leg is complete, `trainStopsOf` returns
  no stops for it (it has no stage), `servingSlots` none, `fleetOf` 0.
- Line 2's `halts` gain `LAP_HALTS` after High Gorge, built from the cave line's own halts at their final stage, in
  reverse, each `ring: true` and `leg: { slot: WALL_LEG, section: 5 }` (so they open exactly when the sixth section
  lays, as a prefix after the Gorge): head 5, Canopy Town (the Wall's), Port Quay, the Saltpan, the West landing.
  The cave line's closed-behind heads (Cave head 1, Wall heads 1, 2 and 4) are not copied: nothing ever lays behind
  them again. Each halt's `s` is `LAP_S0 − cave s`; its platforms are the cave halt's swapped (`[cave homeward, cave
  outward]`: line 2's outward way is the cave line's homeward way).
- **The West landing is the joined line's far end** with the cave line's start crossover as its `end`:
  `railEnd('crossover', LAP_S0 − 5500, 1)`, platforms `both(cave outward platform)`, so a train arriving there crosses
  over before the platform and stands where cave trains stand today, and leaves straight out (`row-path.ts`'s
  start-crossover rule, mirrored).
- **High Gorge** keeps its `end` (line 2's crossover), used only before the join; after it, it is a middle halt. Its
  stop and platforms do not move.
- **`LAP_S0`** is computed from the catalog at load (line 2's row end in line 2's `s`, plus the joint's measured length,
  plus the `cave` row's `lengthCm`), a whole number of cm, checked against the regenerated rows by a test.
- **Line 2's `path`** runs on with the `cave` row's path resampled at line 2's 10 m marks past the joint (index `s /
  1000` stays true; `Math.round` of a linear interpolation, the existing `pathOf` rule), so `railway-line-path.ts` and
  every reach point read the joined line as one.
- **`fleetOf(LINE2, legs)`** once joined: line 2's own last stage (6) plus the cave line's last (5) = **11**.
  `lineStagesOf(LINE2)` gains the joined stage; the load-time `trainPlaces` check places 11 trains over its 15 stops.
  The fleet validator's "never fewer" rule exempts a line with `joins` once joined.
- **`LINE_SLOTS`** becomes two tables, before and after the join (`lapSlots(line, joined)`): line 2's after is its six
  slots then the cave line's five, in slot order; the cave line's after is empty. `servingSlots` and `fleetJoin` read
  them through the train IO (`io.slots(line)`), never the static table.

**The join (step 2, new `src/sim/railway-lap.ts`, pure; called from `railway-sys-route.ts` where the wall's last lay
completes, in the same rule tick, after the lay's existing `endMoved` for the cave line).**

1. `endMoved` for line 2's last stop (High Gorge stops being its end), as when Q6 extended line 2 past Far Head.
2. Every cave slot's row is rewritten by `lapRow(row)`: `from' = LAP_S0 − from`, `dest' = LAP_S0 − dest`,
   `track' = 1 − track`, `origin'` mapped the same way (0 stays 0), `at`/`to` mapped to the joined line's halt index or
   `-1` (a signal stand) when the cave halt has no joined halt (the Wall's Gorge stop, a closed head); `v0`, `depart`,
   `arrived`, `turn`, cargo and `req` digits remapped by `reqIndex` for the flipped direction. `boiler` 0 becomes row 1,
   whose profile (200 cm a tick, 3.5 accel and brake) is the cave row's own, so the pose and speed are the same on the
   tick after as they would have been; a fitted row stays as it is. `trainAlong(lapRow(r), LINE2, t) === LAP_S0 −
   trainAlong(r, cave, t)` for every t to the leg's end (the step's key test).
3. The cave line's `Line.req` lever asks move to line 2's row by the same halt and direction map; the cave `Line` row is
   cleared (`left0`/`left1` to −1).
4. A shed cave row (the fifth train joins the Wall only at its sixth lay, so at the join it is usually still in the
   shed) stays in the shed and joins line 2 at the Village by `fleetJoin`, as every fleet train does.

**Why the join is safe at that tick.** Section 6 is 731 m of track that did not exist before the lay, so no train
stands on it or is bound across it; every cave train is at or short of head 5 and every line 2 train at or short of the
Gorge. After the rewrite the block rule, `endBlocks` and the spacing holds see one line; the first follower across the
joint is planned by the ordinary replan. The fuzz and a seeded test lay the section at varied ticks (step 2).

**After the join, per rule.**

| Rule | Reads | After the join |
| --- | --- | --- |
| Stops, asks, end blocks, signals, holds, `balancedHold`, spacing, service health | running line | One line of 15 halts and 11 trains; `greyboxSpacing` holds (its last halt is a `ring` halt) |
| Fit (`Line.boiler`, a Village stand) | running line | Cave trains take line 2's fit at their next Village stand: the mixed-fleet rule (23 November) |
| Riders (`ridersBoard`, `ridersAboard`, `riders` check) | origin line | Cave trains carry none, as today; riders board line 2's own six |
| Riders' far end (`routeFar` for `b: 'end'`) | line 2's stops | Pinned at High Gorge's index once joined |
| Steel, the wagon, footings, line 2's kit (`serviceOf`'s line 2 branch, `MINT_LEGS`) | origin line | Line 2's own six only, as today |
| Freight and leg kit at a rack (`freightStop`, `legKitService`) | origin line's yards and legs, on the running line's stops | Unchanged in what it carries; stops are the joined line's |
| The causeway's kit to the Gorge yard (`legYardDrop`) | line 2's halt index (unchanged) | A middle service stop at the Gorge, as every middle service stop |

**Sync and authority.** Everything is Server, in the existing rows: no new component, field, op, message, presence field
or client lead.

| Piece | Kind | Authority | Where |
| --- | --- | --- | --- |
| The joined catalog, `LAP_S0`, `runLine` | Server (catalog, pure) | server | `railway-lines.ts`, `railway-lap.ts` |
| The join (rows rewritten) | Server, in the lay's rule tick | server | `railway-sys-route.ts`, `railway-lap.ts` |
| Train rows, `Line` rows after it | Server (replicated) | server | `railway-components.ts` (unchanged shape) |
| The slewed track, the moved platforms, the crossing, lifted buffers, boards, the line maps, train lateral | Local, from accepted state | each tab | `gorge.ts`, `leg-view.ts`, `train-view.ts`, `halts-view.ts`, the island map |

**Lockstep.** Integers only: `LAP_S0 − s` on whole cm, the path resample by `Math.round`. No float, trig, random or
wall time. The join runs in fixed rule order inside the lay's tick, so replay reproduces it. **Prediction:** the join is
never predicted (the lay completes in a rule tick, not in an op's apply); `rail.legStock` stays predicted and
`rail.call` predicts against the joined stops through `railApply` on a clone, as now. **Receipts:** unchanged.
**Saves:** the room checkpoint as now; no new key; the remapped rows are ordinary rows. Rule ticks: the room's.

**Wire, saves and the world bump.** No new op or message. Line 2 gains five halts, so every halt id past line 2's
(lines `ns`, `bay`, `cave`) shifts by five and `rail.call`'s `id` changes meaning; line 2's `Line.req` digits cover more
halts. That is a catalog break: **`WORLD_NS` bumps in step 2** with a dated history line
(`docs/agents/mixed-builds.md`: no compatibility code; the durable world starts fresh). The `cave` row's re-route in step
1 moves catalog points and ships in the same bump.

### Controls and copy

No new control, action or pad slot. Copy, all placeholders and marked as such, none The Boogler's:

| Where | Text (placeholder) |
| --- | --- |
| Line 2's end board at the Gorge, until the join | "WHITE WALL LINE JOINS HERE" |
| Gorge plaques after it | "Ring Island" / "Canopy Town" |
| Port Quay's plaques after it | "Canopy Town" / "Saltpan" (the next big place each way) |
| The objective after `wall-6` | unchanged: leg 6's Notch line |

## Steps

Each step leaves `node dev/ship-check.ts` green. **Steps 1 and 2 ship together as one bump.** Every review of steps 1
to 3 (src/sim, src/world) is an independent one before merge, by the row `npm run models` gives at the time. Rows as of
26 November are named on each step.

- [x] **1. The Gorge approach slewed, and the Wall's Gorge platforms moved (M; "High-risk implementation": Codex
      gpt-6.2-astra medium, because it regenerates `src/sim/railway-world-lines.ts`).** Files: `dev/level/world-blockout.ts`
      (`ROUTES['wall-n']`'s last straight: its end points 2.00 m to the split's south, c +2, from the end of the Gorge
      turn, a −136, eased in by a −56; line 2's last chord eased onto the axis; the Wall's Gorge end and crossover stay in the
      catalog for the load checks. The end buffers and board are hidden; the crossover stays drawn for homebound
      Wall trains until the join in step 2), regenerated `src/sim/railway-world-lines.ts`, `docs/world/world-blockout.html`,
      `docs/world/rail-map.html`; `src/content/levels/gorge.ts` (the Wall's platforms at c −5.8 to −1.8 and +5.8 to +9.8
      on explicit bounds (the authored-number check refuses `c + 2` sums), their posts and connectors; the sea ramp to c
      +7.8) and `content/built/levels/gorge.json`; `dev/level/route-leg5.ts` (replace "Gorge buffers to concourse 4.00 m"
      with: the Wall's row end within 0.05 m of c +2 at a −8; the joined tracks' lateral match within 0.05 m; from a −140 to
      +40 no chord turn over 2° and no radius under 94 m; the platforms' edges at c −1.8 and +5.8 within 0.05 m; the
      existing floods at the moved platforms, c −3.8 and +7.8). Verify: `test/railway-route.test.ts`,
      `test/world-lines.test.ts` (no future span over 4%; the map rails); `npm run level-check`: route leg 5 all "ok",
      the continuity report adds nothing. The Wall's sections keep their cuts; the slew lengthens the catalog row by 1 cm.
      [Platform view toward the Wall](greybox-lap/step1-gorge-approach.png). The two track pairs line up across
      the concourse. Line 2 still has its buffers at this stage. At [Bay head 1](greybox-lap/step1-bay-turnout.png),
      both rails of the turnout ease into the running tracks.
- [x] **2. One line in the rules, and the bump (L; "High-risk implementation": Codex gpt-6.2-astra **high** (tricky);
      then the independent review row).** Files: new `src/sim/railway-lap.ts` (using the catalog's `WALL_LEG`, `lapJoined(legs)` and `LAP_S0`,
      `runLine(slot, joined)`, `lapSlots(line, joined)`, `lapRow(row)`, `lapRequests(req)`);
      `src/sim/railway-lines.ts` (`RailLineDef.joins`; `LAP_HALTS`; line 2's path run on; the fleet validator's
      exemption; the load checks); `src/sim/railway-train.ts` (`trainStopsOf` and `fleetOf` read `joins`;
      `lineStagesOf` adds the joined stage); `src/sim/railway-trains.ts` (`TrainIO.slots`; `servingSlots`, `fleetJoin`,
      `trainGaps`, `protectedBlocks`, `lineSpacing`, `trainSpacing` through it); `src/sim/railway-sys-route.ts` (the join
      at the wall's last lay, as [above](#the-line-model-one-line-the-cave-lines-trains-join-it-in-place));
      in `leg-view.ts`, retire superseded turnouts when the joined route stops using them. Keep whichever turnout
      each in-flight departure occupies until its last car clears the low toe, including departures from earlier heads;
      `railway-sys-trains.ts`, `railway-queries-trains.ts`, `railway-queries-trade.ts` (`routeFar` pinned at the Gorge
      once joined), `railway-queries-route.ts`, `railway-sys-trade.ts`, `railway-check-*.ts`, `src/world/railway-predict.ts`
      and `src/world/railway-server.ts`: every read of a slot's line sorted into running or origin by the table above,
      each with a one-line comment; `src/world/namespace.ts` (the bump, dated); fixtures and golden shards in the same
      commit. Verify: new `test/railway-lap.test.ts`: (a) for every cave row a seeded walk can reach at the join (standing
      at each halt, running each way, held at a signal, on a stub's crossover, with asks), the pose and speed agree
      before and after the rewrite at every tick to its leg's end; (b) the joined stops open as a prefix only at the
      sixth lay and the cave line has none after; (c) 11 serving trains once the fifth cave row joins at the Village; (d)
      lever asks at the cave halts carry to the same platforms and ways; (e) a cave train at boiler 0 runs at 200 cm a
      tick after and takes line 2's fit at its next Village stand; (f) a Village rider's far halt is the Gorge and the fare
      34 after the join; (g) the kit and steel conservation checks hold through the join; (h) `runLine` never names the
      cave line once joined. **The service fuzz** (`test/helpers/railway-route-rules.ts`): a lap group in its own shard,
      lever calls at 75% headway over the joined stage, settled, with the sixth lay at varied ticks and save and restore
      across it; the long run (`ROUTE_GATES=1`, seeds `c0ffee`, `777`, `5eed`, `badd`, 20,000 ticks a mode) pasted into
      this plan before the bump ships. `npm run loop -- run` (rule changes). Because the catalog and sim change: the whole
      server suite, `npm run test:net`, and the built-site boot probe.
**Step 2 service proof, 27 November.** Each seed ran 20,000 ticks at 75% headway in each mode, followed by a drain of outstanding calls. Both save boundaries loaded. No service or spacing failure occurred.

| Seed | Joining calls served | Longest wait, ticks | Settled calls served | Longest wait, ticks |
| --- | ---: | ---: | ---: | ---: |
| c0ffee | 387 | 2012 | 398 | 1466 |
| 777 | 400 | 2104 | 402 | 1515 |
| 5eed | 382 | 2253 | 398 | 1919 |
| badd | 399 | 1858 | 403 | 1294 |

The default fuzz took 12.578 s against a 480 s budget. The reflected coordinate is exactly 860,641 cm. A cave car's facing swaps its 820 cm and 1,610 cm block extents on the joined coordinate. The retained and swept block tests check the exact centimetre of entry and release, and both facings can stop clear at the West signal.
At West landing the largest deck, seat and platform steps during the sixth lay were 2.14e-14, 1.07e-14 and 1.78e-14 m.
At Port Quay all three were below 2.55e-13 m. These are standing car poses from the same axle calculation as the client.
The canonical one-, two- and three-player loops recorded 308, 34 and 33 idle seconds at wall-6, with whole routes of 121, 110 and 110 minutes.

The High Gorge coach-fit, tail-clearance and arrival audits use the pre-join stop list. The five lap halts open together on the sixth lay. The kit-halt queries in `railway-sys-route-kit.ts` map each shipment to its delivery platform using the running line while its stock and rack follow its origin.

- [ ] **3. Seeds and jumps (S; "High-risk implementation": Codex gpt-6.2-astra medium).** `src/sim/railway-seed-legs.ts`:
      `wall-closed` (the leg laid) now includes the join and is re-pinned; new `lap-ride` (the join plus enough running
      time for a through train to reach the Gorge from the Wall: the still's state); `SEED_STAGES` and its golden shard;
      `src/world/railway-jump.ts` a "The lap" row on line 2's Gorge platform (not "Ring joined", which is Ring Island's
      rivet). Verify: `test/railway-jump.test.ts`; each stage's invariant check; the whole server suite.
- [ ] **4. The remaining views (M to L; "Player-visible implementation": Codex gpt-6.2-astra medium).**
      Files:
      `src/content/levels/gorge.ts` and `leg-view.ts` (the concourse's middle becomes the plank crossing with its two
      ramps once joined, `liftOrWait` as every solid near a player; line 2's Gorge buffers, end board and crossover lifted
      once joined; section 6's lay drawn into line 2's rails; the end board's placeholder before);
      `src/entities/railway/halts-view.ts` (line 2's new halts' levers and plaques at the cave platforms, the cave line's
      hidden once joined); the halt boards' island map and Home's line map (one line round); `docs/game-design/` (the
      rail chapter and `place.md`: the lap). Verify: the full ship check; `npm run level-check` (the crossing's floods
      from step 1's trial as checks in `route-leg5.ts`); `.look/` stills from `lap-ride`: the rail arriving in the split
      from the sea mouth, the first through train crossing the concourse, from the north platform across the planks, a
      Wall train's cab past the Gorge toward Ring Island, the halt board's map; a motion sheet of a train through the
      joint (no lateral jump); mesh and collider counts at the Gorge before and after.
- [ ] **5. The bot and the loop (M; "Implementation from a brief or an approved plan": Codex gpt-6.2-sol medium).**
      Files: `dev/loop/graph.ts` (`wall-6`'s label "Port Quay to High Gorge, section 6 of 6: the ring joins"; its stops
      `['gorge', 'lap']`; no new node), `dev/loop/run.ts` (after `wall-6` a player rides on through rather than
      changing), `dev/look/bots/railway-legs.ts` (after the barrier and the last lay: stay aboard the next train from head
      5 through the Gorge to the Village, then the Notch), `dev/look/segments.ts` (`RAIL_STOPS.lap`). After order choice's
      step 5 is on main (it edits the same files). Verify: `npm run loop -- node wall-6`; `npm run loop -- run`; `npm run
      playthrough -- --from wall-mid --to wall --long`; `test/loop-graph.test.ts`.

### Checkpoint (the lap playable)

After steps 1 to 5 are on main; named proofs, once:

- [x] `npm run loop -- run` for one to three players: `idle s` at `wall-6` beside Checkpoint E's (308, 268, 252), and the
      whole route's minutes; the ride home from the Wall now has no change.
- [ ] The bot segment `--from wall-mid --to wall --long`, and leg 6's segment from `wall-closed` (it waited on the Gorge
      platform for a homeward train, #2518): both pass.
- [ ] `npm run test:net` with `railwayLegRejoin` taking `wall` at `wall-deep`, the carrier leaving and rejoining across
      the sixth lay: the rows exact at every checkpoint.
- [ ] The service fuzz's long run at the joined stage (pasted in step 2) and leg 5's re-run beside it.
- [ ] Stills and the motion sheet from step 4 on one sheet.
- [x] The boot probe. `npm run perf` is not needed (no new train, a few boxes); report the Gorge's counts from step 4.
- [ ] A device line on the Mac, reported, not a gate.

### Order, and what waits

Step 2 includes the running path, lateral and bell cord in the train view. A shared numeric car-pose calculation also drives the tick proof. Stop lookups, return destinations, route indicators and train markers follow the running line. The car order and orientation
stay with the slot's original consist. The joined path samples the cave row in reverse, including the West landing
start crossover. Prove the occupied deck, seat and platform poses at West landing and Port Quay tick by tick across
the sixth lay. Ship these changes with steps 1 and 2. The crossing, station furniture and maps remain in step 4.

| Step | Needs on main first | Why |
| --- | --- | --- |
| 1 and 2 | Port Quay Roundhouse step 4 (its bump) and prefeed-gated frames' sim step, if either is building | Each takes a `WORLD_NS`; prefeed changes the deep-span frame's lay, the tick the join hangs on |
| 3 | Step 2 | Seeds are built from the rules |
| 4 | Step 3 | Stills come from `lap-ride` |
| 5 | Step 4 and order choice step 5 | The bot rides what step 4 draws; order choice edits the same bot and loop files |

**Between the bump and step 4** rooms that lay the Wall's last section run trains through the Gorge over the undrawn
joint and the old concourse (a train drawn through a slab), as legs 3 to 5 ran over undrawn track until their views.
Worth knowing before a playtest.

## Level findings

From [What it is, measured](#what-it-is-measured); the level check ran on the planned positions (trial, reverted).

1. **The joint as built breaks "no visible kinks".** The halves' tracks are 2 m apart sideways (line 2 at c 0 and +4,
   the Wall at c −2 and +2): joined straight, a 12.4° turn and a 33 m radius at the Wall's old buffers. Step 1 slews the
   Wall's last straight 2 m; measured, nothing new under the Gorge turn's 94 to 98 m.
2. **The Wall's Gorge platforms foul the slewed track** (the south one 0.2 m over its centreline): moved 2 m with it,
   their edges now line 2's. One station both sides, a −51 to +40.
3. **The concourse lies across the joined tracks.** A plank crossing at 3.35 m with ramps; every walk at the Gorge
   reaches every other and the water reaches all; nothing solid in the tracks' envelope; the whole level check passes.
4. **Nothing is gated or newly reached.** The lap places no pickup, barrier or secret. What it reaches earlier is
   travel only: Gorge to the Wall's heads without a change. Every Wall head was reachable by train before (a change at
   the Gorge, or the cave half from the West landing), so no gate loses its meaning (route contract).
5. **Not checked here:** the incline's catalog row starts at line 2's buffer point (a 0, c 0) and its first 20 m cross
   line 2's south platform at a 6 to 11, so they are evidently not drawn (its start crossover is in the bore, its halt at
   a 26.7, c 24.2); step 4's still confirms no incline rail is drawn across the joint.

## Risks

- **The slot-line sort (the plan's largest risk).** About 94 reads of a slot's line across 25 files. A read left on the
  origin where it should run (or the reverse) is a quiet bug: a cave train that ignores line 2's asks, or a riders check
  that fails on a cave slot. Step 2 sorts each with a comment; test (h) and the fuzz catch the running reads; the
  conservation checks catch the cargo reads. Hotspots: `railway-trains.ts` (724 lines), `railway-lines.ts`,
  `railway-sys-trains.ts`.
- **Room safety.** No effect in an apply: the join is a rule-tick rewrite of replicated rows. It must never throw in a
  room: the load-time catalog checks place 11 trains on the joined stage and `lapRow` is total over every row shape
  (test a). A fatal rule failure would block checkpoints. Malformed `rail.call` ids are validated as now.
- **Mixed builds.** One `WORLD_NS` bump (step 2), dated; no compatibility code. Rooms past `wall-closed` start fresh.
- **The fit.** Cave trains run at 20 m/s until their first Village stand; if line 2 has no fit (14 m/s) they slow
  there. The mixed fleet bunches behind the slowest for up to one circuit (about 10 to 15 minutes); the 23 November
  rule accepts this for line 2's own handover.
- **Fewer departures at the Village.** 54 s instead of 40 s at the Big boiler; within the health gate, which scales with
  the line and its fleet ([question 4](#open-questions)).
- **The West landing's stand.** The joined line's far end must keep cave trains' stand (cross over, then the outward
  platform); a wrong `platforms` order puts the lever's reach on the other platform. Test (d) and a still.
- **The garage.** `installAdmits` admits no fit for the cave line today. If the Port Quay garage or a later cave trade
  adds one before this lands, a fit naming a joined line must be refused and the copy's bay read: decide then
  ([question 5](#open-questions)).
- **In-flight files.** `src/sim/railway-sys-route.ts` (prefeed-gated frames), `src/world/namespace.ts` (Port Quay
  step 4), `dev/loop/` and the bot (order choice step 5). Sequenced [above](#order-and-what-waits).
- **Performance.** No new train or light; the crossing and ramps are a handful of boxes. Not a gate.
- **New shared file.** `src/sim/railway-lap.ts` is inside `LOCKSTEP_FILES` (`src/sim/**`) and the server image's
  `src/sim` folder; `test/server-image.test.ts` confirms.

## Open questions

None blocks the build; each proceeds on its recommendation. Questions 1 and 2 are for the owner; question 3 is answered.

1. **Threading Ring Island's ring.** The 12 November answer puts "the train goes through the ring" at the White Wall
   lap. This plan reads "the ring" there as Ring Island's, a later double-back that needs the closed ring this plan
   builds. **Recommended: ship the lap as planned, then `/brainstorm` the threading** (a spur through the aperture
   needs its own design; the lap does not wait for it).
2. **The ring closes with the Wall's last section, or with a short bill of its own?** **Recommended: with the Wall's
   last section** (the joint is in its bill, as the decided "an interchange's track is a bill hauled like any segment";
   the section already ends with 4 to 5 minutes' wait; a second short leg adds a kit wait and a frame at the Gorge for
   no new play). The alternative is a one-section leg at the Gorge (6 logs and 6 rails, the ending's bill), after the
   Wall, which keeps today's end-on stage between them.
3. **The riders' far end.** **Answered 27 November: it stays High Gorge** (fare 34;
   [entry](../decisions-rail.md#d-2026-11-27-riders-far-end-stays-high-gorge)). Following line 2's end round to the West landing would make it 87 a ride
   and a ride from Home to Home.
4. **Eleven trains or twelve?** **Recommended: eleven**, the six and five the room already runs; a twelfth would be a
   train nobody built (54 s against 50 s at the Big boiler). Revisit if the fuzz or the loop shows the Village's waits
   over the health gate.
5. **A cave line fit, if one exists by then** (engineering, not the owner's): **recommended: the joined line keeps line
   2's fit; a cave-origin train keeps its row until its first Village stand.** Decide only if a cave fit lands first.

## Design review (2026-11-26)

Run by the planner in the same context, per the design-review skill: DESIGN.md, owner-calls' index, the rail Current
rules (with the full words of the 10, 12, 16, 23 and 25 November entries named below), docs/direction.md, the
design-work rules, the research index's rail and level sections; the plan reread from the top. The newest
`docs/playtests.md` entries (14 November, the owner solo to High Gorge; Grant to the pier) predate the Wall; the owner's
"too many trains, too fast, from the start" bears on call 7, and the loop's Checkpoint E figures are the rest of the
evidence.

### Calls

**4 decided, 3 new, 9 default.**

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Line 2 and the cave line become one line, line 2 running on past High Gorge round the Wall to the West landing | Decided | [Rail map, 10 November](../decisions-rail.md#d-2026-11-10-open-calls-answered-the-rail-map) ("line 2 grows into one ring line ... as the working map"); [buffers, 10 November](../decisions-rail.md#d-2026-11-10-a-track-that-ends-has-buffers) ("a line that doesn't truly end runs on into another line") |
| 2 | Both ends stay at Home, the Village and the West landing, 100 to 130 m apart on foot; no track across Home | Decided | Rail map, 10 November, with [rail-map](rail-map.md#the-shape-it-gives-the-network)'s "Its two ends are both at Home" |
| 3 | High Gorge is one station for both halves | Decided | Leg 5's call 19 and the confirmed 10 November call it cites ("one station ... for every line") |
| 4 | A train meeting players at the Gorge's crossing pushes them aside by the one halt rule | Decided | [Push-aside, 16 November](../decisions-rail.md#d-2026-11-16-push-aside-at-halts) |
| 5 | The ring closes when the Wall's last section lays: no bill, leg or barrier of its own | New | Recommended (question 2): the joint is section 6's bill ([interchange track is hauled](../decisions-rail.md#d-2026-11-16-interchange-track-is-hauled)); no new wait |
| 6 | The riders' far end stays High Gorge after the lap (fare 34) | Decided | Owner, 27 November ([entry](../decisions-rail.md#d-2026-11-27-riders-far-end-stays-high-gorge)): otherwise 87 a ride, Home to Home. It narrows "the rider route's far end is line 2's current end" (12 November, [confirmed 16 November](../decisions-rewards.md#d-2026-11-16-ranked-calls-confirmed)), written for a line growing outward; finding 3 |
| 7 | Every train the room runs keeps running: 11 on the joined line, none added or retired; the eleventh joins at the Village | New | Recommended (question 4): 80 / 65 / 54 s even headway at 20 / 25 / 30 m/s against line 2's 57 / 47 / 40 s today; rail-map call 31 ("about a dozen at 70 s") |
| 8 | A cave train keeps its own cars and errands (riders, steel, the wagon and line 2's kit stay with line 2's six) and runs line 2's stops, asks and spacing | Default | The smallest change: no car swaps at the join |
| 9 | A cave train at boiler 0 runs on at 20 m/s and takes line 2's fit at its next Village stand | Default | The 23 November mixed-fleet rule ("Treat it like the mixed fleet") |
| 10 | The Wall's last straight slews 2 m south and its Gorge platforms move with it | Default | Forced by "no visible kinks" (10 November); measured |
| 11 | The concourse becomes a plank crossing at 3.35 m with 4.5 m ramps | Default | Port Quay's foot crossing |
| 12 | High Gorge's stop stays at line 2's mark; the Wall's own Gorge stop never opens | Default | No rider or lever moves; 51 m from today's Wall stop |
| 13 | The West landing's stand stays where cave trains stand today (cross over, then the outward platform) | Default | Nothing moves at the West landing |
| 14 | The joined line keeps the name "Line 2"; plaques name the next big place each way | Default | Rail-map call 28; the name is the owner's |
| 15 | Before the join, line 2's Gorge end board reads "WHITE WALL LINE JOINS HERE" (placeholder) | Default | Telegraph (principle 7) |
| 16 | The halt boards' map and Home's line map draw one line round | Default | Show, don't tell (principle 11) |

### Findings

1. **(changed the plan's framing) The halves meet at High Gorge, not Port Quay.** The brief and the route plan's
   mechanisms row predate leg 5's ruling 2. The plan is written for the Gorge; Port Quay's Roundhouse is not touched.
2. **(changed step 1) The joint needs a 2 m slew** (level findings 1 and 2), and the Wall's Gorge platforms move with
   it. Without it the decided "no visible kinks" fails at a 12.4° turn.
3. **(changed step 2) The riders' fare would jump from 34 to 87** if the route's far end followed line 2's new end to
   the West landing, and the ride would end at Home. The confirmed rule ("the rider route's far end is line 2's current
   end", 12 November, confirmed 16 November) did not foresee a line whose far end comes back home. The plan pins the far
   end at the Gorge once joined and asks the owner (question 3); it is one line in `routeFar` to change if he picks the
   rule as written.
4. **(no change) The lap is a ride, not a shortcut.** Home to Port Quay stays fastest from the West landing (a minute
   against four or more round the ring). Lens 6 (a world that shortens behind you) holds where it matters for the
   route's last beats: the Wall's heads, Canopy's Wall halt and the Gorge without a change. That is enough; the lap's
   payoff is the ride and the closed shape, which train-riding's "a ride is a stage" supports with the stage already
   built.
5. **(no change) First meeting and learning.** The player meets the lap by watching section 6 lay into the split, then
   by not having to change: no prompt is needed (principle 11). The end board before it and the line map after it are
   the telegraph. Solo is unchanged; in co-op one player can watch the rail arrive at the Gorge while another feeds
   frame 6 at head 5, which reads well.
6. **(no change) Service.** The Village loses frequency (40 to 54 s at the Big boiler) while the Wall gains it (110 to
   54 s). Recommend no twelfth train (call 7): the owner found "too many trains, too fast" on 14 November, and the
   fuzz's long run decides if one is needed.
7. **(no change) `wall-6`'s 4 to 5 minute idle** (Checkpoint E) is unchanged by the lap; the prefeed-gated frames plan
   addresses it.

Flow rules: (1) the next goal is findable: after `wall-6` it is leg 6's Notch line, unchanged; (2) no gate changes
meaning: the lap adds travel edges only; (3) nobody is stranded: a train still runs both ways from every halt, and a
player at the Gorge reaches every platform on foot (measured).

### Owner questions

Questions 1 to 3 under [open questions](#open-questions), each with its recommendation.

## Suspect or placeholder lines (none rewritten; none The Boogler's)

The end board, the plaques and Port Quay's board above are placeholders. No character line is written or changed.
