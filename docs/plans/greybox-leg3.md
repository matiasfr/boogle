> **Status, 19 November 2026: plan, not built.** Planner, against main `76a326cea` (world v62), rebased onto
> `2b46fe79f` (docs only since). The owner's go
> (19 November): "yes planner can start". It builds after [greybox leg 2](greybox-leg2.md)'s step 5; steps 1 and 5 to 6
> need leg 2's views on main ([order](#order-and-what-waits-for-leg-2)). **Garage step 4 can be briefed once
> [Checkpoint G](#checkpoint-g-garage-step-4-may-start) passes** ([what it gets](#what-garage-step-4-gets-from-leg-3)).
> Design review [near the end](#design-review-2026-11-19); [open questions](#open-questions) last.

# Greybox leg 3: Bell Rock to Canopy Town, playable, with the Strong hold

**Where this sits.** Leg 3 of [greybox-route](greybox-route.md) (section 3, row 3; area 6): the `bay` row grows on
from Bell Rock to Canopy Town, 1.2 km. A file of its own, as leg 2 set the convention, and in leg 2's shape (catalog,
rules and the bump, seeds, views, bot and loop, a checkpoint). Two things leg 2 did not carry: **the massing** (leg 2's
had its own plan, archived at [greybox-leg2-massing](../archive/plans/greybox-leg2-massing.md); no Canopy massing
exists, so it is a step here), and **the Strong hold** the garage's per-line trade now waits for
([decision, 19 November](../decisions-rewards.md#d-2026-11-19-garage-step4-waits-for-leg3)).

**Goal.** From Bell Rock's upper platform a room opens the Canopy barrier with the crystal seeds, builds the bay line
over the strait and onto the forest isle to Canopy Town in the White Wall's cleft, takes the glider cloth and rides home
on one line, all on real server lines in greybox; and the bay line's trains can carry the Strong boiler's two-section
hold that garage step 4 offers. Serves DESIGN.md's core loop ("the rail builds the world"), **7. Telegraph everything**
(the Canopy barrier leg 2 stood in view opens; the Notch barrier stands shut in view at Canopy) and **8. Enjoyable alone
and together** (the hold is a train that waits for the room; a pair can split between the post at Home and the frame at
Bell Rock). It bends nothing.

**Read for this.** AGENTS.md; `npm run map -- --kind prototype` and `--kind docs` (no `plan` kind exists); DESIGN.md
and context's design-work rules; greybox-route sections 1 to 6; greybox-leg2 in full; the archived leg 2 massing plan;
campaign-outline sections 3 and "Towns at the hubs" (the market hub's stall table); garage-step4 in full and
[garage-choices.html](../world/garage-choices.html)'s leg 3 calculator; the rail and rewards Current rules with the
entries cited below; the decision of [12 November](../decisions-rail.md#d-2026-11-12-ring-island-build-2-and-the-greybox-route-answered)
(the greybox route live for everyone, each leg shipped whole). Code: `src/sim/railway-route.ts` (`SPECS`, `simHalt`,
`FIRST_SITE`, `RAIL_GATES`, `RAIL_GRANTS`), `railway-lines.ts` (`builtLine`, `fleet`, `RAIL_TRAINS`, the load checks),
`railway-queries-route.ts` (the kit's roles, `legKitCap`, `legMintChain`), `railway-sys-route-kit.ts` (`legKitLoad`),
`railway-sys-trains.ts` (`standing`), `railway-train.ts` (`BOILER`, `fleetOf`), `railway-sys-steel.ts`
(`boilerAdopt`), `railway-seed-legs.ts`, `src/world/railway-jump.ts`, `src/content/levels/leg2.ts` (Bell Rock),
`dev/level/world-blockout.ts`, the generated `src/sim/railway-world-lines.ts`, `docs/world/map-prototypes.html`
(`canopy-isle`, `wall-cn`, `wall-cs`, `bell-canopy`), and the leg 2 views branch (`claude/greybox-leg2-views`,
`995732e93`: `leg-view.ts`, `halts-view.ts`, `train-view.ts`, `row-path.ts`). Pattern followed: leg 2, steps 1 to 5.

**Research.** [route-contract](../research/route-contract.md) (travel edges never supply work): used; Canopy isle is
reachable early by swimming or gliding and every post there refuses ([Level findings](#level-findings), 7).
[level-design](../research/level-design.md) rec 3 (big shapes to steer by): used for the massing, the five mother trunks
and the two chalk walls are what you steer by from the strait. [upgrade-economy](../research/upgrade-economy.md) rec 2
(an upgrade repays an inconvenience already felt): used and departed from in part; the Strong hold repays the wait for
the next kit train, which the room meets on the bay cut, but the kit ahead may pay most of it first ([finding
3](#findings)). [progression-flow-layout](../research/progression-flow-layout.md): its three firm rules are the review's
flow check. [roundhouse-management](../research/roundhouse-management.md) ("one small configuration choice per line"):
read for garage step 4's needs only.

**Port from Place.** Nothing is ported. No fit check is needed.

**The rail route as it stands** (`npm run loop -- node`, 19 November): `canopy` is a stand-in: "48 logs + 36 rails + 24
footings + 24 steel + 24 fibre = 156 units; allowance 42 min; legs bell-canopy 1.20 km (Bay line); grants carry sling,
glider cloth; requires bell". `bell` and `gorge` are still stand-ins too: **leg 2's step 5 (its loop nodes) is not on
main** (`npm run loop -- node bay-2`: no node). Leg 3's step 7 builds on it.

**In flight** (`npm run inflight`, 19 November): `claude/forge-rack-move` (`dev/look/bots/railway.ts`,
`src/sim/railway-line2-layout.ts`, `line2-view.ts`, `home-station.ts`, `docs/agent-calls.md`, `place.md`): no code file
here is shared; the two docs are appended to. Claimed on main's heartbeat: `claude/halt-yard-plan` (a planner, docs
only: a timber bay "at each halt site"), which may later place one at Bell Rock or Canopy; nothing here waits for it.
**Not on origin, so not in that list:** `claude/greybox-leg2-views`
(leg 2's step 4, heartbeat 19 November) edits `src/content/levels/leg2.ts`, `src/entities/route-greybox/leg-view.ts`,
`massing-bell.ts`, `massing.ts`, `state.ts`, `leg2-draw.ts`, `src/entities/railway/halts-view.ts`, `train-view.ts`,
`kit-board.ts`, `leg-yard.ts`, new `row-path.ts`, `src/content/levels/gorge.ts` and the prefab fixtures: steps 1, 5
and 6 here build on it. Planned, not built: garage step 4 ([garage-step4](garage-step4.md)) edits `railway-train.ts`,
`railway-sys-steel.ts`, `railway-sys-trains.ts`, `railway-check-steel.ts` and `train-view.ts` after this plan
([open question 3](#open-questions)).

## What garage step 4 gets from leg 3

The 19 November call: garage step 4's steps 2 and 3 wait; "Strong is redesigned as a hold (a Strong train carries two
sections' kit and waits at the railhead for the next rack), built with greybox leg 3's rules … where it pays about 30
s over Quick across the leg (arithmetic) and the free swap becomes a real choice: Strong while building, Quick after."
This plan builds the hold's whole sim side, so step 4 adds only how a room gets a row. **On main after
[Checkpoint G](#checkpoint-g-garage-step-4-may-start):**

| Garage step 4 needs | Leg 3 provides | Where |
| --- | --- | --- |
| **The rows** | `BOILER[4]` Quick `{ speed: 250, accel: 3.5, brake: 3.5 }` and `BOILER[5]` Strong `{ speed: 200, accel: 3.5, brake: 3.5 }` (garage-step4's own numbers), `boilerCars(row)` (1 for Strong, else 0) and `kitBills(row)` (`1 + boilerCars`), appended after row 3 | Step 3 |
| **The rules** | A Strong train loads up to two sections' bills of one leg; standing at its leg's railhead with the next section's kit aboard it **holds** until the section lays, at most `TRAIN.railheadHoldTicks` (1,200) past its dwell and while it lays if service permits; then rides on and unloads at the new head. Standard and Quick trains never hold | Step 3 |
| **The checks** | A trade line's row in {0, 4, 5}; line 2's in {0 to 3}; line 1's in {0, 1}; a train's leg-kit cargo at most `kitBills(row)` × a section's bill | Step 3 |
| **The lengths** | Leg 3 in three sections (about 533, 400 and 255 m, re-measured after the Bell Rock arc); the West landing to Bell Rock 1,197 m; the West landing to Canopy Town about 2,385 m, where Quick saves about 22 s a ride (arithmetic), so the ten-second rule passes the whole bay line | Step 1 |
| **Where Strong is felt** | Only on the bay line, only while leg 3 is built: one hold per two-section load, between Bell Rock and head 1 or head 1 and head 2. Nowhere else on the built route: the `ns` line's next leg (the causeway) and the bay line's after this (the Notch) are one section each, and the cave line is its own plan | Checkpoint G measures it |
| **The number** | A table per fit (standard, Quick, Strong fitted at `bay-mid`, Strong fitted at `bay-reached`), per section: lay to next kit racked, and the leg's ticks, one and two players | Step 3's `dev/sim/leg3-trade.ts` |
| **The states** | Seeds `canopy-open`, `canopy-mid`, `canopy-reached` beside leg 2's `bay-mid` and `bay-reached` | Step 4 |

**What step 4 then keeps:** install parts 5 and 6, `Line.rev`, `rail.bring` and the table's hold, the admissions, the
adoption's `!==` (so a swap back adopts), the price, the chips, bays, copies, the flatbed and the platform beat. **What
its plan must change when it is briefed** (the 19 November call replaces them): call 20 ("Strong's extra car runs
empty") and "Loading: unchanged"; the third readout "Nothing to haul yet" (Strong now carries a second section's kit,
so the row says what it does: copy for that plan); its open question 1. **Its bump:** leg 3 takes the next free number
(v63, unless another ships first); garage step 4's step 2 takes the one after.

**The arithmetic, on this plan's cuts** (garage-choices.html's own method, best case: a loaded kit train leaves the
depot when needed; 5 s dwell): train time across leg 3 standard 291 s, Quick 248 s, Strong with the hold 221 s, so the
hold beats Quick by about 27 s (the page's 30 s was on equal thirds). **The kit ahead is not in that model and probably
eats most of it** ([finding 3](#findings)): leg 3's first kits load onto standard trains while the bay cut's last
section is fed, before the bay trade is offered. Checkpoint G's table says how much is left, and [open question
1](#open-questions) is the garage's to settle with it.

## Design

### The beats, in play order (solo; arithmetic, not measured)

| # | Beat | Where | What gates it | About |
| --- | --- | --- | --- | --- |
| 0 | (Leg 2's end) The bay cut laid; the room on Bell Rock's upper platform, seeds held since the incline | Bell Rock, upper | | |
| 1 | Open the Canopy barrier at frame 1, now on the outward platform beside the train you came in on | Bell Rock, upper, s 1229 | seeds held; leg 3 open (the bay cut laid) | 5 s |
| 2 | Feed section 1 from the rack beside the kit car (its kit came ahead, on the train you rode or the next one) | Bell Rock's rack, s 1219 | the barrier open | 0 to a lap's wait, 30 s feed, 30 s lay |
| 3 | Ride a bay train down off the rock and over the strait to head 1; feed section 2 | Head 1, s ~1740, over the sea | section 1 laid; section 2's kit there (a Strong train held at Bell Rock: none to wait for) | 35 s ride, 30 s feed, 30 s lay |
| 4 | Ride up onto Canopy isle to head 2 at the forest's edge; feed section 3 | Head 2, s ~2140, on the isle | section 2 laid; section 3's kit | 30 s ride, 30 s feed, 30 s lay |
| 5 | Ride through the trees into the cleft: Canopy Town. Take the glider cloth at the line's end | Canopy, s ~2405 | the leg laid | 20 s ride, 10 s walk |
| 6 | See the Notch barrier shut past the buffers (leg 6's telegraph) and the board "LINE TO LANTERN NOTCH / LATER" | Canopy | | |
| 7 | Ride home on the same line: Canopy to the West landing; Bell Rock's Canopy stall has risen on the way | Bay line | | about 2 min |

About 8 to 10 minutes solo with waits, then the ride home, against area 6's 42-minute allowance (standins.ts). The
checkpoint measures it. **Co-op:** at beat 1 a pair can split: one feeds at Bell Rock, the other rides home to the
Roundhouse to fit the bay line (once garage step 4 exists) so the next train to stand at the West landing comes back
Strong. Three players feed a section in one trip each. A friend joining mid-leg starts at Home's Village and is one bay
line ride (1 to 2 minutes) from the railhead.

### Sync kinds and authority

As leg 2's, with nothing new in kind:

| Piece | Kind | Authority | Where |
| --- | --- | --- | --- |
| The bay line's two new heads, Canopy's halt and end, the fleet, one more train | Server (catalog + `Train` rows) | server | `railway-lines.ts`, `RAIL_TRAINS` |
| Leg 3's row, the Canopy barrier, the cloth grant, the Notch barrier | Server (`Leg`, `Route`, on main since v32) | server | `railway-sys-route.ts` |
| Leg 3's kit (loaded at the West landing, unloaded at each rack) and the hold | Server, atomic inside the tick's apply; the hold is derived each tick, no state | server | `railway-sys-route-kit.ts`, `railway-sys-trains.ts` |
| The two boiler rows | Server catalog (`BOILER`); `Line.boiler` / `Train.boiler` as today | server | `railway-train.ts` |
| Canopy isle, the chalk walls, Bell Rock's upper level, decks, heads, frames, racks, barriers, the cloth post, the stall, levers, boards | Local, from accepted state | each tab | `src/content/levels/`, `src/entities/route-greybox/`, `src/entities/railway/halts-view.ts` |

No client lead, no classic edit generator, no client state registration, no `src/world/rules/` file, no presence field.
Rule ticks: the room's (`rail.legTick`, the trains' step); saves the room checkpoint's (every key exists: `Leg`,
`Route`, `Train`, `Line`). **Ops: none new**; `rail.legStock`, `rail.grant`, `rail.gate`, `rail.depotTake`,
`rail.depotRailTake` and `rail.call` already take any leg, grant, gate, rack and halt by index. **Wire:** no new message
or field; the bay line's halt ids after Bell Rock change meaning (two heads inserted), and so do every later line's
halt ids (the cave line's), covered by the bump. **Prediction:** `rail.legStock` predicted (decided 16 November);
`rail.grant` and `rail.gate` wait for the server. **Receipts:** as today; every refusal shows its reason.

### The catalog (step 1)

- **Bell Rock's kink is eased.** The bay row turns 52.2° at Bell Rock's origin (−50, −850), s 1227 ("planned, would
  fail" in the track report). Leg 2 stopped short of it; leg 3's trains run through it. `dev/level/world-blockout.ts`
  gains a horizontal fillet on a named vertex (`curves: [{ near: [-50, -850], radiusCm: 6000 }]` on the bay service;
  the generator has vertical easing only): **one circular arc of 60 m radius**, sampled at chords of at most 2 m (each
  turn under 2°), tangent points 29.4 m either side, the line 6.8 m inside (south of) the old vertex, 4.1 m shorter.
  Bell Rock's stop stays at s 1217, now 19 m into the 55 m arc, so a standing train (8.2 m ahead, 16.1 m behind) sits
  on the curve. Leg 2's massing review assumed 100 m (11.4 m inward, 6.9 m shorter): [open question 4](#open-questions).
- **Canopy Town's stop moves 25 m back** from the row's 101.8° kink at the halt (−1100, −300), onto the straight
  (`stopCm` on the halt spec: the kink's cm less 2,500, about s 2405). The kink stays "planned, would fail": no leg 3
  train crosses it (leg 6 eases it). **Ends:** a crossover before the platforms (s 2350 to 2370, centre 2360: the tail
  of a train standing at 2405 is at 2388.9, clear of it) and buffers at the kink less 2 m. **No loop end**, though
  greybox-route's table says "a loop end": the stop stands in the White Wall's 71 m cleft and a 40 m loop needs about 90
  m of ground, as Bell Rock's crossover end did ([finding 5](#findings)).
- **Three sections, cut at places** (decided: sections end at a place, up to about 900 m), not the catalog's equal
  thirds. Measured on the row today: equal thirds put head 1 (stop s 1611) across the grade break at s 1608 and head 2
  (s 2016) on the 3.9% climb 30 m off Canopy isle's shore. The cuts become named constants like `WALL_ISLETS`, each
  recomputed by a test from the row:
  - `CANOPY_STRAIT`: the middle of the strait's level stretch (s 1608 to 1886 at 4 m), s ~1750: head 1's stop at
    s ~1740, its 25 m platform 120 m clear of either grade break, over the sea at (−529, −667), 270 m off the isle.
  - `CANOPY_EDGE`: 33 m past the top of the climb onto the isle (s 2117 at 13 m), s ~2150: head 2's stop at s ~2140
    on the isle's flat deck at (−883, −493), inside its outline (0.65 of its ellipse), at the forest's edge.
  - The last ends at Canopy's stop, s ~2405. Lengths about **533, 400 and 255 m**; bills 20 logs + 20 rails each (call
    21), lay 30 s.
- **Sim halt order.** `simHalt` already counts a built leg's heads: with `bell-canopy` built, the bay line is
  **[West landing, Bay head 1, Bell Rock, Canopy head 1, Canopy head 2, Canopy Town, Lantern Notch]**, leg 3's
  `railheadHalt` 3, `notch-tunnel`'s 6 (untagged: not built).
- **Points** (world metres, from the un-eased row; the builder recomputes them on the arc, the test holds them within
  1 m of `rowSide` on the eased row):

  | Point | Where | x, z, y (m) |
  | --- | --- | --- |
  | Frame 1 and the `canopy` barrier | Bell Rock's outward upper platform, s 1229 (2 m past the bay cut's buffers), 4.8 m right going out (north), 0.9 m up | −53.1, −853.9, 15.9 |
  | Rack 1 | the same platform, s 1219, abreast of the kit car of a bay train standing at s 1217 (7.5 m from it; 13.5 m from frame 1; the builder measures the car from the consist, `kitCarAt`) | −40.3, −849.7, 15.9 |
  | Frame 2, rack 2 | head 1's platform, leg 1's formula (8 m and 18 m short of the cut, 4.8 m right) | −532.3, −670.6, 4.9 and −523.0, −674.2, 4.9 |
  | Frame 3, rack 3 | head 2's platform, the same formula | −888.1, −495.1, 13.9 and −880.6, −501.8, 13.9 |
  | `cloth` (reach 4 m) | Canopy's deck on the homeward side, round the buffers: `rowSide('bay', stop + 1000, −1300, 90)` | about −1080, −300, 13.9 |
  | `notch` barrier | across the row at the kink, 2 m past the buffers: the row's halt point (unchanged) | −1100.0, −300.0, 13.9 |

  The `canopy` barrier **moves** from the upper deck's reserved spot (−77.0, −851.1), 24 m from frame 1, to frame 1,
  as leg 2 moved the incline's barrier to its frame (leg 2's call 11). The deck's reserve is freed.
- **The Canopy stall** at Bell Rock: the market's fixed table has "Canopy Town (fibre) with its leg"; it rises on
  `pad-canopy` (upper deck, already reserved) at leg 3's last lay, as leg 2's stalls rise. A view; no catalog row.

### The rules (step 2)

- **When it opens.** Leg 3 opens when the bay cut is laid (`after: 2`, on main); its first frame takes nothing until the
  `canopy` barrier is open (`seeds` held and the leg open). One leg is open at a time on the whole route, so the rack is
  still `Rail.depot` / `Rail.depotRails`. Leg 4 (`after: 3`) stays shut: its rules are not built.
- **`builtLine` takes every built leg of a row**, not only its first: home halt, the first leg's heads, its
  destination, the next leg's heads, its destination, then the row's later halts shut. Each destination keeps its `end`
  (Bell Rock's crossover at s 1192.5; Canopy's at s 2360), which applies only while it is the open end. The load-time
  checks walk every built leg (heads in order, ends at their stops).
- **Halts.** Canopy head 1 opens with section 1 and **closes behind once Canopy opens** (`closesAt`, the stack's rule:
  nothing there once passed, over the sea); Canopy head 2 opens with section 2 and **stays a request stop both ways** (a
  place on the isle's edge to get off into the forest); Canopy Town opens with section 3. Block signals at each
  section's end but the last. Right-hand running (owner, 18 November: "Yes, every line"): `legPlatforms` for every new
  halt; Bell Rock's bay halt gains its homeward platform once it is a through halt.
- **The fleet grows across legs.** `RailLineDef.fleet` becomes a list in leg order (`{ leg, trains, opens? }[]`; line 2,
  `ns` and `cave` become one-element lists): the bay line runs `[0, 1, 2]` over the bay cut, then **`[2, 2, 3, 3]`**
  over leg 3. The third train joins after section 2. The normal boarding dwell is 50 ticks. One new
  `RAIL_TRAINS` shed row (two if a fourth is needed), appended after every existing slot. `fleetOf` reads the last
  reached leg's stage; `trainPlaces` checks every stage at load, as today.
- **The kit.** The bay line's rules stand (kit loads at its home, the West landing: logs minted, rails off the forge
  rack; one kit a train). `bell-canopy` joins `MINT_LEGS[bay]` after the bay cut, so **the kit ahead runs into it**: once
  the bay cut is owed nothing, leg 3's kit loads while the bay cut's last section is still fed, rides aboard until Bell
  Rock opens, then unloads on the first train in (leg 2's rule for every same-line successor). No stand-in stock: the
  West landing's first halt belongs to the bay cut, so `STOCKED_LEGS` is unchanged. A unit lifted and lost is owed
  again, as on legs 1 and 2.
- **Grants and gates.** `rail.gate canopy` opens once `seeds` is held and leg 3 is open (it refused "No line beyond yet"
  while `legBuilt(3)` was false). `rail.grant cloth` once leg 3 is laid. **The `notch` barrier stays shut** and refuses
  "No line beyond yet" until leg 6 is built, the room holding the cloth or not ([finding 4](#findings)).
- **Invariants** (`railway-check-route.ts`): every built leg's heads open as a prefix of its sections; the fleet at
  each stage; conservation counts leg 3's kit aboard, racked, held and fed, as it does every leg's.

### The hold (step 3, for garage step 4)

- **Rows and facts** (`railway-train.ts`): `BOILER[4]` Quick and `BOILER[5]` Strong as in the table above;
  `BOILER_CARS = [0, 0, 0, 0, 0, 1]`, `boilerCars(row)`, `kitBills(row) = 1 + boilerCars(row)`. **No room can fit them
  yet**: `rail.install` still admits line 2's parts 1 to 4 only, and `Line.boiler` changes only by an install. Widening
  `BOILER_MAX` from 3 to 5 widens the two `railInt(…, BOILER_MAX + 1)` revision bounds harmlessly (the revision must
  still equal `installRevision`) and the load check's row bound, which the new allowed-rows check tightens.
- **Two bills.** `legKitCap(w, k, bills = 1)`: the bills of the next `bills` sections of leg k from the current one,
  never past the leg's last (never across legs). `legKitLoad` and `yardLoad` pass `kitBills(r.boiler)`. "One kit a
  train" becomes "one kit a train, two on a Strong train".
- **The hold** (`legRailheadHold(w, slot, tick): 'hold' | 'yield' | 'on'`, in `railway-sys-route-kit.ts`, called from
  `standing` for any line's train after `legKitLoad`): a train holds when **all** hold: `kitBills(r.boiler) >= 2`;
  it carries leg kit; it stands at the drop halt (`legKitDrop`) of an open leg k its line serves; that halt is its
  line's last open stop (the railhead); after unloading, what it still carries is for a later section of k (the rack
  takes nothing more of it); and k's current section is not laid. It holds while
  `tick < r.depart + TRAIN.dwellTicks + TRAIN.railheadHoldTicks` (new tunable, **1,200 ticks**, two minutes: a solo
  feed and lay is about 60 s) **or** the section is laying (`Leg.start >= 0`). On the lay the next head opens, the line's
  stops extend and the train runs on to the new head and unloads there, as every train does. A held train is not on an
  errand (`holdOff`), makes no stone stop and keeps its riders. Standard and Quick trains never hold: a standard train
  carrying the next section's kit runs its circuit as today (otherwise Strong would be dead again).
- **Checks** (`railway-check-steel.ts`): line 1's row in {0, 1}, line 2's in {0 to 3}, a trade line's (`ns`, `bay`) in
  {0, 4, 5}, the cave line's 0, every train's row one its line allows. The train load check: leg-kit cargo at most
  `kitBills(row)` × its leg's section bill.
- **When it yields.** Even during a lay, Strong releases the platform when assigned a waiting call elsewhere or when a follower stands at its approach signal. Its remaining bill can travel round the circuit. The end block still controls departure.

### Controls and copy

No new action, pad slot, key or touch button. Every press is Interact through existing prompts ("Open the barrier",
"Take logs", "Take rails", "Feed the frame", the lever) plus one: **"Take the glider cloth"** (placeholder), blocked
with "The line to Canopy isn't laid yet" (placeholder). Objective texts (placeholders): "Open the barrier to Canopy",
"Build the line to Canopy Town", "Take the glider cloth", "Ride home: the next line isn't built yet". Boards
(placeholders): "LINE TO CANOPY TOWN / UNDER CONSTRUCTION" at each head while it is the end; "LINE TO LANTERN NOTCH /
LATER" at Canopy's buffers. The hold has no copy: the train standing at the railhead with its kit car loaded is the
cue. No Boogler line is written or changed.

### The massing (steps 5 and 6)

Local, all of it, as leg 2's: static boxes and signs each tab builds, one instanced mesh an area with real bounds (P3),
resident within 400 m and freed past 550 m (P1), a level artifact the flood reads. **The stand-ins greybox-route names,
and nothing more:** Canopy's town in the trees is "a flat deck at 12 m"; the carry sling is not in the catalog; glider
cloth is a flag. No buildings, no folk, no tree interiors.

- **Bell Rock's upper level on the eased line (step 5).** The four upper platforms, their end ramps and lever ends, and
  the deck's south edge (all `provisional` in `leg2.ts`) re-placed along the 60 m arc: each platform two straight boxes
  as chords (0.8 m sagitta on a 20 m chord), 3.8 to 7.8 m off the arc; the bay beds as the arc; frame 1 and rack 1 on
  the outward (north) platform; the `provisional` marks dropped. The lower level, the ramp, the pads and the pinnacle do
  not move.
- **Canopy isle (step 6).** `canopy-isle` (map centre world (−1060, −300), radii 360 × 300 m, top 12 m) as one walkable
  slab inside its blob outline, with a sand beach slope all round to the sea (its 90 m shelf), so a swimmer climbs out
  anywhere. Five mother trunks (map `mothers`, to 150 m) as tall grey columns with colliders: the shapes to steer by from
  the strait. **The White Wall's two chalk islets** either side of the halt (`wall-cn`, `wall-cs`: 120 m, rotated, their
  map outlines) as tall boxes with colliders, the **cleft between their tips (about 71 m) left open**: the halt's
  outward platform is 12.6 m from `wall-cn`'s south tip, the homeward 23.7 m. The bay row's bed on the isle from s 2117
  (13 m over 12 m ground: a low bank), head 2's platform with a step down to the ground each side, Canopy's two 40 m
  platforms and a deck at the halt's level on the homeward side wrapping round the buffers to the cloth post and the
  Notch barrier. Head 1 over the sea gets a sea ramp, as leg 2's heads do. A reserve of 30 × 30 m on the homeward
  side, within 60 m of the platforms, is kept clear for the hub stand-in town ([open question 5](#open-questions)).

## Steps

Each step leaves `node dev/ship-check.ts` green. **Steps 1 to 5 ship together as the leg's bump** (as leg 2's 1 to 3
did): the arc moves track that leg 2's views draw through Bell Rock's provisional platforms, so the Bell Rock rework
rides with it. Steps 6 and 7 ship on their own after it.

- [x] **1. The catalog (M; HOTBOX).** `dev/level/world-blockout.ts`: the fillet (`curves` on a service; arc points at
      chords of at most 2 m, tangent to both spans; the deck profile unchanged on the rock at 15 m); the bay service's
      Canopy halt `stopCm` (the kink's cm less 2,500), its end crossover. Regenerate (`node --import ./dev/sim/hooks.ts
      dev/level/world-blockout.ts`): `src/sim/railway-world-lines.ts`, `docs/world/world-blockout.html`,
      `rail-map.html`. `src/sim/railway-route.ts`: `bell-canopy`'s cuts from `CANOPY_STRAIT`, `CANOPY_EDGE` and the
      stop, `built: true` (only once step 2's line exists: the two land in one commit if the load checks need it),
      `FIRST_SITE['bell-canopy']` (frame 1 and rack 1 above), the `canopy` gate moved to frame 1, the `cloth` grant's
      point. New `dev/level/route-leg3.ts`: the planned points as named marks with the distances above stated
      (rack to kit car under 9 m, rack to frame under 15 m, head 2 inside the isle's outline, each head's platform on
      a level stretch, Canopy's platforms clear of both chalk tips by 3.8 m plus the loading gauge). Verify:
      `test/railway-route.test.ts` (three sections, each under 900 m; the cuts recomputed from the row; heads' platforms
      on grade 0; points within 1 m); `test/world-lines.test.ts` (the arc's tangents and its 60 m radius; no future
      span over 4%); `npm run level-check`: the bay row's s 1227 kink gone from "planned, would fail", no kink over 2°
      and no radius under 40 m on the bay row through Bell Rock, no new report.
      **Catalog measurements (22 November).** The eased Canopy stop is s 2400.93. Sections measure 526.23,
      402.90 and 254.80 m. The two head platforms are level at 4 and 13 m. Bell Rock's rack is 6.64 m from the
      kit car's catalog position and 10.81 m from its frame. The minimum platform-to-tip clearances are 9.45 m
      north and 43.10 m south. The owner confirmed call 20's 10 m separation. The original cloth coordinates
      measured 19.78 m from the barrier. The post now stands 2 m before the kink, 9.8 m to the homeward side,
      at (−1091.99, −294.01), 13.90 m high, with 4 m reach and **10.02 m** to the barrier.
      The post is beyond the approach platform's end. Its deck collider is step 6's proof.
      The collider regression found 35 samples with insufficient overhead room beneath a newly laid bay deck.
      The nine upper-bed chords moved forward from step 5 and the same check now finds zero.
- [ ] **2. The rules and the bump (L; HOTBOX).** `src/sim/railway-lines.ts`: `builtLine` over every built leg of a row;
      the fleet list; the new shed row(s); the load checks over every built leg. `src/sim/railway-train.ts`: `fleetOf`
      on the list. `railway-queries-route.ts`: nothing new beyond the list's reads (the roles derive from `legBuilt`).
      `railway-check-route.ts`: the heads' prefix and fleet checks. `src/world/namespace.ts`: the bump and a dated line.
      Fixtures and golden shards regenerated. A new sim file goes in `server/Dockerfile`, `dev/server-build.ts` and
      `deploy-server.yml` (`test/server-image.test.ts`). Verify: `test/railway-route-rules.test.ts` gains: the barrier
      refuses `rail.legStock` while shut and opens only with `seeds` held and leg 3 open; section 1 fed off Bell Rock's
      rack; the relay conserves every unit (West landing to Bell Rock, head 1 and head 2); leg 3's kit rides ahead
      during the bay cut's last section; `cloth` refused before the leg is laid and taken once after; the `notch`
      barrier refuses with `cloth` held; head 1 closes on Canopy's opening and head 2 does not; the bay line's stops a
      prefix at every stage and its fleet by the list. Fuzz accepted lever calls at 75% across four seeds in both modes with standard and mixed fleets. Check every live call is served within its stage budget, plus spacing and end-block safety. Re-measure leg 2 with kit ahead. Run the long mode (`ROUTE_GATES=1`) run and its output pasted before the bump ships. `npm run loop -- run`.

      **23 November service check, blocked on the stack.** Four seeds (`c0ffee`, `777`, `5eed`, `badd`), 75% headway, 20,000 ticks per leg/fleet/mode. Each pair below is the worst served wait in ticks, settled / growing. The old column records fixed-gate measurements, not design targets.

      | Line and fleet | Old trial [2,3,3,4] | End spacing [2,2,3,3] |
      | --- | ---: | ---: |
      | Leg 2 bay, standard | 1075 / 1467 | 901 / 1467 |
      | Leg 2 bay, mixed | — | 1197 / 1468 |
      | Canopy bay, standard | 1545 / 1400 | 1725 / 1675 |
      | Canopy bay, mixed | 1550 / 1799 | 1772 / 1579 |
      | Leg 2 ns, standard and mixed | — | 819 / 1201 |
      | Canopy ns, standard | — | 793 / 813 |
      | Canopy ns, mixed | — | 796 / 772 |

      The earlier four-train ladder [2,2,3,4] measured 1367 / 1463 on standard bay. With spacing, actual trains in service determine the budget. Pairs below give even headway / wait budget in ticks.

      | Line or stage | Observed headway / budget |
      | --- | --- |
      | ns | Short, one train 766/1532. Full, one 1336/2722 and two 668/1386 |
      | Bay cut | Short, one 804/1608. Bell Rock, one 1412/2874 and two 706/1462 |
      | Canopy extension | Head 1, two 964/2028. Head 2, three 778/1706. Canopy, two 1298/2746 and three 866/1882 |
      | Stack | Ring Island, three 463/1126. First head, three through six 628/1506, 471/1192, 377/1004, 314/878. Next heads and Gorge, six 399/1098, 484/1268, 571/1442 |

      The long stack stage sweep's settled maxima by seed were 1269, 1333, 1293 and 1287. Four stack tests failed, including the separate unfed Ring Island test. On growing seed 777, Pier homeward asked at 13607, exceeded its 1192 budget at 14800 and boarded at 15025 (1418 ticks). At 14800, slots 1–6 occupied 171672, 2165, 99200, 115334, 60686 and 18975 cm. Only slot 3 was on the homeward track and it was standing at stop 4. Five were outward. Settled Ring Island also failed: c0ffee Pier homeward asked at 25673 and boarded at 26867 (1194 vs 1126). End spacing alone still leaves long directional service gaps. Steps 2 and 3 remain open. Seeds and Bell Rock views await the dispatch review.

      **23 November, middle service stops.** A train may balance its gaps after serving a platform call,
      its riders or cargo. A block-only stop does not qualify. The arrival records the service reason
      before unloading. A signal stand never qualifies. The old Ring Island spacing-only stop is
      removed. Both end and middle spacing yield to service pressure. The wait budget is unchanged.

      Four seeds at 75%, 20,000 ticks per mode. Worst bay waits, settled / growing, were 901 / 1467
      and 1058 / 1468 for leg 2 standard and mixed, and 1675 / 1486 and 1632 / 1579 for Canopy.
      All four suites passed. The long stack stage sweep and the unfed Ring Island test passed.
      Three growing stack seeds failed. On 777, the same Pier homeward request at 13607 boarded at
      15025 (1418 ticks, bound 1192). In that interval the actual dispatch branch held slot 2 at
      middle stop 1 for 115 ticks and at the home end for 229 ticks. Slot 3 yielded at stops 4, 5
      and 6 and took zero spacing-hold ticks. At 14800, slot 3 was assigned the call and serving
      its boarding dwell at stop 4. Slots 1, 4, 5 and 6 were running outward, and slot 2 was held at
      home. Positions by slot in cm were 171672, 2165, 99200, 115334, 60686 and 18975.
      The fourth through sixth trains entered at 13528, 13881 and 14163. Joining at home added
      outward service immediately, while the homeward rider depended on a train returning from
      the far end. Middle holds improved settled Ring Island service but did not close that gap.
      On badd, Ring Island homeward waited 1224 against 1192. On c0ffee, Far Head homeward waited
      1160 against 1098. This is the stop condition for further implementation.

      The eight solo offsets gave mean Quick / Strong leg times of 3016 / 2881 from bay-mid
      and 2326 / 2505 from bay-reached. None of the 16 scripted solo Strong runs recorded a
      pressure departure with its second bill. Random-demand second-bill delivery remains unmeasured.

      **Historical fixed-gate experiments (22–23 November, superseded).** With three final bay trains, seed
      `c0ffee` reached 1,413 ticks settled and 1,752 growing against limits of 1,350 and 1,600.
      With the approved fourth train at the final stage, the long run measured the following maxima
      over 20,000 ticks per seed per mode at 75% headway. Spacing and world invariants held.

      | Seed | Settled ns | Settled bay | Growing ns | Growing bay |
      | --- | ---: | ---: | ---: | ---: |
      | c0ffee | 990 | 1,413 | 967 | 1,279 |
      | 777 | 1,017 | 1,575 | 861 | 1,647 |
      | 5eed | 997 | 1,650 | 924 | 1,085 |
      | badd | 992 | 1,609 | 885 | 1,200 |

      Both worst requests were at Bell Rock. The outward request at +14,438 waited 1,650 ticks and
      the homeward request at +1,308 waited 1,647. All four bay trains were in service when each
      request was served. Leg 2 with the kit ahead stayed within the bounds
      in the initial trial (bay maxima 1,075 settled and 1,467 growing). The Canopy relay check
      and `npm run loop -- run` passed. Step 2 remains open pending a gameplay decision.

      **23 November diagnosis.** Times below are ticks from the start of each wait trial. Positions
      are metres along the bay line, rounded to the nearest metre. Bell Rock is at 1,217 m.

      - Settled `5eed`, outward, +14,438 to +16,088. Slot 9 was outward at 1,197 m, inside the
        braking distance at 2 m/tick. Slots 10 and 11 were homeward at 1,419 and 2,176 m;
        slot 12 was outward at 1,876 m. All four occupied the outer half of the line. Slot 10
        was next for the outward platform. It arrived homeward at Bell Rock at +14,568,
        Bay head 1 at +14,980, and West landing at +15,382. It dwelt 50 ticks at each,
        departed West at +15,432 and reached Bell Rock outward at +16,088. Of the 1,650 ticks,
        150 were boarding dwells; the balance was running, including braking and acceleration.
      - Growing `777`, homeward, +1,308 to +2,955. Slot 10 was already past Bell Rock,
        homeward at 1,096 m. Slot 9 was outward at Bay head 1 (609 m), slot 11 was at West
        landing (20 m) waiting for its departure gap, and slot 12 was still in the shed.
        Slot 9 served the request after calls outward at Bell Rock (+1,672) and head 1
        (+2,038), then turned at head 2 (+2,347). It left there at +2,397. Slot 12
        joined at West landing at +2,647, too far behind to serve this request.
      - The through halt accepts both directions. Neither serving train waited on Bell Rock's
        crossover or a Strong hold. Train motion has no curve-speed cap. The missed braking
        window and the gap behind it dominate the settled wait; extension of the line ahead
        of slot 9 lengthens the growing return journey.
      - The repeated 1,413 on `c0ffee` was a Bay head 1 homeward call. At +10,195 slot 10
        was outward at head 2, 46 ticks into its dwell, in both fleet sizes. Slot 9 was
        already homeward past Bay head 1. The fourth slot was just departing Bay head 1
        outward; it could not answer the opposite platform before slot 10. Slot 10 served
        the same call at +11,608 in both runs.

      **Retry method.** Each configuration used the same four seeds and random call generator,
      20,000 ticks per mode per seed, the existing 75% departure headway calculation, and both
      spacing and save/restore invariant checks. Dwell changes started when the bay line first
      extended beyond Bell Rock. Signal trials added intermediate places to wait without changing
      the clearance rule. End balancing used the existing gap comparison with a 300-tick cap.
      Each pair below is the maximum settled / growing bay wait over all four seeds, in ticks.

      | Trial | Three final trains | Four final trains |
      | --- | ---: | ---: |
      | 50-tick dwell, extra signals every 150 m | — | 1,650 / 1,647 |
      | 35-tick dwell, extra signals every 250 m | 1,853 / 1,706 | 1,544 / 1,580 |
      | 25-tick dwell, extra signals every 150 m | 1,769 / 1,715 | 1,518 / 1,531 |
      | 25-tick dwell, catalog signals | — | 1,518 / 1,531 |
      | 20-tick dwell, catalog signals | 1,737 / 1,752 | 1,492 / 1,500 |
      | 50-tick dwell, end balancing | — | 1,675 / 1,647 |
      | 35-tick dwell, end balancing | — | 1,600 / 1,592 |
      | 25-tick dwell, end balancing | 1,550 / 1,586 | — |
      | 15-tick dwell, catalog signals | 1,752 / 1,639 | 1,367 / 1,463 |
      | 15-tick dwell, extra signals every 150 m | — | 1,367 / 1,463 |
      | 15-tick through dwell, 35 ticks at termini | 1,752 / 1,726 | 1,417 / 1,491 |

      **Blocked after retry.** The closest result used four final trains and a 15-tick boarding dwell.
      In seed order `c0ffee`, `777`, `5eed`, `badd`, its settled bay waits were
      1,367, 1,293, 1,327 and 1,330. Growing waits were 1,303, 1,441, 1,095 and 1,463.
      The settled limit missed by 17 ticks even with boarding reduced from five seconds to 1.5.
      None of the 16 trial configurations qualified. They were measured in isolation and none was
      adopted before the owner reviewed the result.

      **Earlier owner decision, superseded later on 23 November.** “Accept 1,367 for this line”. Adopt four final bay trains,
      with a 15-tick boarding dwell once the first Canopy section opens. The bay's growing limit
      stays at 1,600. The exception covers only the bay's settled wait. [Decision](../decisions-rail.md#d-2026-11-23-greybox-service-health)

      **Accepted run.** `ROUTE_GATES=1`, four seeds, 75% headway, 20,000 ticks per mode.
      Each cell gives settled / growing ticks. Both long suites passed (13 and 12 tests),
      as did the loop and the branch ship-check (199 affected files, 1,844 passing tests).

      | Seed | Leg 2 ns | Leg 2 bay | Leg 3 ns | Leg 3 bay |
      | --- | ---: | ---: | ---: | ---: |
      | c0ffee | 1023 / 979 | 1075 / 1108 | 999 / 967 | 1367 / 1303 |
      | 777 | 857 / 1199 | 1061 / 1250 | 976 / 861 | 1293 / 1441 |
      | 5eed | 943 / 1201 | 1002 / 1039 | 885 / 924 | 1327 / 1095 |
      | badd | 1005 / 990 | 1068 / 1467 | 1047 / 885 | 1330 / 1463 |

      **Reopened on the earlier-third-train retry.** The accepted run above used
      `[2, 2, 3, 4]`. With `[2, 3, 3, 4]`, the standard fleet's settled wait reached
      1,545 ticks on `badd` at Canopy head 2 homeward (asked +10,869, four serving).
      All standard growing waits passed. Leg 2 reproduced every value in the table above.
      The step 3 retry table records both fleets on the new ladder.
- [ ] **3. The hold (M; HOTBOX). For garage step 4.** `src/sim/railway-train.ts`: rows 4 and 5, `BOILER_CARS`,
      `boilerCars`, `kitBills`, `TRAIN.railheadHoldTicks`. `railway-queries-route.ts`: `legKitCap`'s `bills`.
      `railway-sys-route-kit.ts`: `legKitLoad` and `yardLoad` by bills; `legRailheadHold`. `railway-sys-trains.ts`:
      the hold in `standing`. `railway-check-steel.ts` and the train load check: the allowed rows and the cargo bound.
      New `test/railway-leg3-hold.test.ts` (pure; a test writes the bay line's `Line.boiler` directly, the only way to
      fit a row before garage step 4): a Strong train loads two sections at the West landing, unloads section 1 at Bell
      Rock and holds; leaves on the lay and unloads section 2 at head 1; with nobody feeding it leaves after 1,200
      ticks and holds again on its next arrival; never holds at a middle halt; a standard or Quick train never holds;
      a train adopting Strong at the West landing with one section aboard tops up to two; units conserved; mixed
      fleets (one Strong among standard) under random lever asks keep the block rule, every invariant and the stage-specific service bound while
      growing. New `dev/sim/leg3-trade.ts` (kept: it is Checkpoint G's proof): from `bay-mid` and from `bay-reached`,
      for rows 0, 4 and 5, with players `a` and `b` feeding the moment a rack is full (as `laySection` does), prints per
      section the ticks from the lay before to the kit racked, and the leg's ticks, for one and two feeders, over eight
      start offsets. Verify: the test; the script's table pasted into this plan's as-built notes.

      **Step 3 trade measurement.** Each row covers eight fit offsets, 0 to 525 ticks in steps of 75.
      Rack columns give the minimum and maximum ticks from opening the gate or the previous lay until
      that section's full bill was racked. The total runs from opening the gate to the third lay.
      The script prints each of the 96 individual runs.

      | Fitted at | Fit | Feeders | Rack 1 | Rack 2 | Rack 3 | Total ticks | Mean total |
      | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
      | bay-mid | Standard | 1 | 792–915 | 451 | 856 | 3002–3125 | 3103.6 |
      | bay-mid | Standard | 2 | 793–916 | 452 | 857 | 3002–3125 | 3103.6 |
      | bay-mid | Quick | 1 | 700–823 | 1159 | 465 | 3227–3350 | 3323.0 |
      | bay-mid | Quick | 2 | 701–824 | 1160 | 466 | 3227–3350 | 3323.0 |
      | bay-mid | Strong | 1 | 822–945 | 331 | 274 | 2330–2453 | 2427.9 |
      | bay-mid | Strong | 2 | 823–946 | 331 | 274 | 2328–2451 | 2425.9 |
      | bay-reached | Standard | 1 | 0–16 | 392–1273 | 623–856 | 2151–2799 | 2511.9 |
      | bay-reached | Standard | 2 | 0–16 | 393–1274 | 624–857 | 2150–2798 | 2510.8 |
      | bay-reached | Quick | 1 | 0–16 | 392–1130 | 465–673 | 1968–2498 | 2240.4 |
      | bay-reached | Quick | 2 | 0–16 | 393–1131 | 466–674 | 1967–2497 | 2239.2 |
      | bay-reached | Strong | 1 | 0–16 | 392–1273 | 623–856 | 2151–2799 | 2511.9 |
      | bay-reached | Strong | 2 | 0–16 | 393–1274 | 624–857 | 2150–2798 | 2510.8 |

      Strong fitted at bay-mid saved 89.5 s solo against Quick on average. Fitted at bay-reached,
      its solo total matched standard at all eight offsets and averaged 27.2 s longer than Quick.
      Garage step 4's offer timing goes to the owner under open question 1.

      **Step 3 blocked, 23 November.** The two-bill train held at Bell Rock, released at its
      deadline with no feeder, held again on its return, and racked the next bill at head 1
      331 ticks after the lay in the fed trial. For the mixed-fleet wait check the first bay
      train adopted Strong at West landing and loaded two Canopy bills before the bay cut's
      final lay. The fixture selected standard for the following trains. Requests ran from
      opening the Canopy gate, with the same four seeds, 75% headway and 20,000 ticks each.
      Each run exercised the hold and passed the spacing and save checks.

      | Seed | Growing ns | Growing bay | Bay limit |
      | --- | ---: | ---: | ---: |
      | c0ffee | 824 | 1786 | 1600 |
      | 777 | 808 | 1799 | 1600 |
      | 5eed | 944 | 1299 | 1600 |
      | badd | 964 | 1711 | 1600 |

      The 1,367 exception applies only to settled bay waits. The mixed-fleet growing gate
      remains open; the owner requested a stop on another failed gate.
      All three failures were Bay head 1 homeward calls served at +2,255, with three trains
      in service. They arrived at +469, +456 and +544 respectively. Each long run had 300
      held ticks; a tick-by-tick check of the opening 3,000 ticks counted 299 of those while
      the section was laying. The idle timeout never accounted for a two-minute wait here.
      The branch ship-check passed 1,846 tests and failed the mixed-fleet growing check.

      **Earlier third train, 23 November.** Call 18 now permits the third bay train when the
      first Canopy section lays. The fourth still joins at Canopy Town. Four seeds at 75%
      headway ran for 20,000 ticks per mode per fleet with the original Strong hold.
      Each cell gives settled / growing ticks.

      | Seed | Standard bay | Mixed bay | Standard ns | Mixed ns |
      | --- | ---: | ---: | ---: | ---: |
      | c0ffee | 1094 / 1132 | 1411 / 1786 | 999 / 967 | 1031 / 824 |
      | 777 | 920 / 1034 | 1519 / 1799 | 976 / 861 | 983 / 808 |
      | 5eed | 1176 / 1095 | 1550 / 1453 | 885 / 924 | 975 / 944 |
      | badd | 1545 / 1400 | 1474 / 1711 | 1047 / 885 | 955 / 964 |

      All four mixed settled runs exceeded 1,367. The three mixed growing failures
      were the same Bay head 1 homeward requests as before, all served at +2,255.
      Across all four mixed growing seeds the third train became eligible and entered
      service at +1,216, after those calls arrived at +469, +456 and +544.
      All runs passed the spacing and save checks. The ladder retry stops here.

      **23 November, pressure-yield trade.** Across eight offsets at each start (0 to 525 by 75), Strong yielded with a second bill aboard on 0/16 solo runs. No extra circuit or delivery penalty was observed in that sample. Mean total leg ticks, rounded to the nearest tick:

      | Start | Quick solo | Strong solo | Quick pair | Strong pair |
      | --- | ---: | ---: | ---: | ---: |
      | bay-mid | 3016 | 2498 | 3016 | 2496 |
      | bay-reached | 2326 | 2505 | 2325 | 2504 |

      These scripted feeds do not generate the random platform demand of the service fuzz. The stack health failure above stops step 3 before the visual and stage work.
- [ ] **4. Seeds and stages (S; HOTBOX).** `src/sim/railway-seed-legs.ts` from `bay-reached`, accepted ops only:
      `canopy-open` (barrier open, section 1's kit on Bell Rock's rack), `canopy-mid` (section 1 laid, section 2's kit
      aboard a bay train), `canopy-reached` (leg 3 laid, cloth not taken). `SEED_STAGES` and its golden shard;
      `src/world/railway-jump.ts` rows without a `land` (leg 2's step 3 reason: lands wait for step 6's stills).
      Verify: `test/railway-jump.test.ts`; each stage's invariant check.
- [ ] **5. Bell Rock on the eased line (S to M; Mac).** `src/content/levels/leg2.ts`: the upper level re-placed as
      [above](#the-massing-steps-5-and-6), the reserves moved with it (the Canopy frame's reserve now frame 1's), the
      level artifact rebuilt. `src/entities/route-greybox/leg-view.ts` (as leg 2's views left it): the `canopy`
      barrier drawn at its new point. `dev/level/route-leg2.ts`: its points from the catalog. Verify: `npm run
      level-check`, Bell Rock's lines all "ok" as before (on foot from either level, every swimmer's climb-out, rims,
      reserves clear); `.look/` stills: the arc from the ramp's head, a bay train standing at Bell Rock's upper platform
      on the curve, frame 1 with the barrier and rack 1 from the platform.

### Checkpoint G (garage step 4 may start)

After steps 1 to 5 are on main. Proofs, run once: step 3's table (the hold's saving per fit and start, solo and a pair)
and the hold test; step 2's fuzz figures; `npm run loop -- run`; `npm run test:net`. **Garage step 4 is briefed from
here**, with [what it gets](#what-garage-step-4-gets-from-leg-3), the table and [open question 1](#open-questions)'s
answer. If the table shows Strong fitted at `bay-reached` saving under 15 s solo, that goes to the owner with the
table before garage step 4's screen is built (finding 3), not before its rules.

- [ ] **6. Canopy and leg 3's views (M to L; Mac).** New `src/content/levels/leg3.ts` and
      `src/entities/route-greybox/massing-canopy.ts` ([above](#the-massing-steps-5-and-6)), registered in `massing.ts`;
      the level artifact `content/built/levels/canopy.json`; `dev/level/route-leg3.ts` gains the flood. `leg-view.ts`:
      leg 3 among the built legs: deck, rails and sea bents from `laid` (the strait's bents; the bank on the isle),
      frames with bill and plate, racks, head 1's platform with a sea ramp, head 2's with its steps, block signal posts,
      the end boards; the cloth post; the `notch` barrier and its board; Bell Rock's Canopy stall at the last lay.
      `halts-view.ts`: a lever at each new halt's lever end and each head; departure boards listing the bay line's
      stops. `train-view.ts`: three trains on the bay line (posing is any line's already). `src/adapters/railway-read.ts`,
      `railway-intents.ts`: the cloth prompt and the objective texts. `docs/game-design/place.md` updated. Verify
      (`.look/`): from a bay train, the descent off Bell Rock and the strait with the mother trunks and the chalk walls
      ahead; head 1 from the train; head 2's platform and its step to the ground; Canopy's platforms in the cleft from
      the train; the cloth post and the Notch barrier from the platform; Bell Rock's upper deck with the Canopy stall;
      the look harness's mesh and collider counts with Canopy resident and not.
- [ ] **7. The bot and the loop (M; HOTBOX).** After leg 2's step 5. `dev/loop/graph.ts`: `canopy-gate`, `canopy-1` to
      `canopy-3`, `cloth`, bills and positions imported from `RAIL_LEGS`; `dev/loop/standins.ts` drops the `canopy`
      slot. `dev/look/bots/railway-legs.ts`: the barrier at Bell Rock, the three sections, the cloth, the ride home;
      `dev/look/segments.ts` `RAIL_STOPS.canopy`. Verify: `npm run loop -- node canopy-1` and `-- node cloth` print the
      bill, the train supply and the cue; `npm run loop -- run`; `npm run playthrough -- --from bay-reached --to canopy`
      (a pass verdict; its timings are not evidence under load).

**Checkpoint C (leg 3 playable).** Named proofs, run once: `npm run loop -- run` for one to three players with idle
seconds per wait; the bot segment `--from bay-reached --to canopy`; `npm run test:net`; `npm run scenario --
reconnect-edit` at `--rail-seed canopy-mid` (a second tab joins; the first leaves carrying a rail and rejoins after a
server restart; `Leg` and the kit aboard unchanged); steps 5 and 6's stills on one sheet; one frame-time reading at
Canopy on the Mac (reported, not a gate); `npm run perf` (Canopy isle, five trunks, two chalk walls, 1.2 km of deck,
three bay trains). The independent review covers steps 1 to 5 as one batch.

### Order, and what waits for leg 2

| Step | Needs on main first | Why |
| --- | --- | --- |
| 1 | Leg 2's step 4 (the views) | The arc moves the bay row that `row-path.ts` and `leg-view.ts` draw; regenerating before they merge rebases their fixtures |
| 2 to 4 | Step 1 | Sim only; no file of leg 2's step 5 |
| 5 | Leg 2's step 4 | It rewrites `leg2.ts`'s upper level and the `canopy` barrier view, which that branch adds |
| 6 | Leg 2's step 4 | `leg-view.ts` generalized to any built leg, `halts-view.ts`, `train-view.ts` |
| 7 | Leg 2's step 5 | `graph.ts`'s leg 1 and 2 nodes, `railway-legs.ts`'s leg 2 route, `RAIL_STOPS.bay` |

The brief's order is after leg 2's step 5; the hard dependency for steps 1 to 5 is leg 2's step 4 ([open question
3](#open-questions)). **Between the bump and step 6** a room past `bay-reached` runs bay trains past Bell Rock over
track nobody draws to heads and a halt on an island that is backdrop only, as leg 2's room did between its bump and its
views; production prebuilds the jump rows (`OFFERED_STAGES`), so `POST /jump` reaches the three new stages at the usual
spawn. Worth knowing before a playtest.

### Left out

Canopy's town (buildings, folk, the trunk's platforms, the market's real stalls), the carry sling, the glide from
Canopy's ledge, any fibre mechanic, freight or riders on the bay line, the hub stand-in town ([open question
5](#open-questions)), the Notch barrier opening (leg 6), easing Canopy's kink (leg 6), the halt map drawing the bay
line (4b's map work), and the garage's screen, install parts, chips and flatbed (garage step 4). Each is a later plan's.

## The world bump

Needed: the bay row's geometry (the arc), Canopy's stop, the bay line's halts reindexed (two heads) and every later
halt id shifted, the moved gate and grant points, one or two train rows, two boiler rows. **One bump, in step 2's
commit, covering steps 1 to 5.** The next free number is v63; garage step 4 now follows this plan and takes the one
after; [stack-west-platforms](stack-west-platforms.md) also wants a reset, and whichever ships first takes the next
number. Two can share one only if both are review-clean in the same batch; none waits for another ("No bump waits").
Ship outside the owner's sessions (`npm run heartbeat` first).

## Level findings

`npm run level-check` ran on 19 November (main `76a326cea`): **21 reports, none new; "route leg 2 (planned): ok"**.
Leg 3 has no level artifact yet (no Canopy massing exists), so its planned points were measured with a scratch script
over the catalog (`rowPoint`, `rowSide`) and are read against the report:

1. **Two planned kinks on leg 3's track** (track continuity, "planned, would fail"): the bay row's 52.2° at s 1227
   (Bell Rock) and 101.8° at s 2430 (Canopy). Leg 3's trains cross the first, so step 1 eases it; they never reach the
   second (Canopy's stop 25 m short, buffers 2 m short), so it stays for leg 6.
2. **Equal thirds put both heads on grades:** head 1's stop at s 1611 straddles the s 1608 break (3.9% to level), head 2
   at s 2016 is on the 3.9% climb, 30 m off the isle (1.32 of its ellipse). The cuts move to level places.
3. **Head 1 (s ~1740) is over the sea** at 4 m, 270 m off Canopy isle and 520 m on from Bell Rock's stop: a sea ramp, so a
   swimmer or a body off the platform climbs out there.
4. **Head 2 (s ~2140) is on the isle** (0.65 of its ellipse), on the level 13 m deck over 12 m ground, at the forest's
   edge: steps down each side. It is reached early on foot by anyone who swims to the isle's beaches; its rack and frame
   take nothing before their section's turn.
5. **Canopy stands in the cleft.** The outward platform is 12.6 m from `wall-cn`'s south tip and the homeward 23.7 m;
   the tips are about 71 m apart. The cloth spot and the Notch barrier stand 31 to 35 m from `wall-cn`'s tip and 38 to
   52 m from `wall-cs`'s. Room is there on the map; **unproven** until step 6's artifact (the chalk's colliders must
   clear the platform by the loading gauge).
6. **Bell Rock's frame 1 and rack 1** (un-eased numbers): rack 7.5 m from the kit car of a bay train standing at s 1217,
   frame 13.5 m from the rack (Q7's last carry under 15 m). Today's flood reaches the out half's north platform from the
   upper deck ("ok on foot from the upper deck: … the out half north platform"). The arc moves both by up to a few
   metres: step 5 re-runs the flood.
7. **Early reach** (route contract). Canopy isle is a 650 m swim from Bell Rock and a glide from Bell Rock's 15.9 m upper
   deck may reach the strait; whatever reaches the isle finds the cloth post refusing until the leg is laid and every
   frame refusing out of turn. The Notch barrier refuses until leg 6. Movement skips distance, never the work.
8. **The Canopy stall's pad** (`pad-canopy`, upper deck) is reserved and reached on foot from the ramp's head today;
   the stall rises there at the last lay. Not moved by the arc (the deck's pads are at e −34, clear of its south edge).

## Risks

- **Room safety.** Every transfer is in a system inside the tick's apply; the hold is derived each tick from replicated
  rows and the tick, with no state and no wall clock; no `Math.random`; effects (the kit's hop, the stall's rise) play
  from mirrored changes in the adapter. A leaver's lifted units release by the existing check. A new shared sim file
  is listed for the server image.
- **Mixed builds.** Dev phase: no compatibility code; the reindex, the arc and the train rows are a break, so the bump
  with its dated line. Golden shards and fixtures regenerated in the same commit.
- **The arc moves built track.** The bay cut's last 10 m now end on the curve: leg 2's seeds, its jump rows and its
  views' drawn track all move a few metres. Regenerate, then check `bay-reached`'s stills from step 5.
- **The second bill may ride round the circuit** when Strong yields. Measure early departures and the time to the next rack.
- **The kit ahead changes leg 2's bay timing** (as it changed leg 1's for the incline). Re-measured, never loosened past
  what is measured; a broken gate goes to the owner with choices.
- **Hot files.** `railway-lines.ts`, `railway-train.ts`, `railway-sys-trains.ts`, `railway-check-steel.ts` (garage step 4
  next), `leg2.ts`, `leg-view.ts`, `halts-view.ts`, `train-view.ts` (leg 2's views), `world-blockout.ts` and its
  generated files.
- **Lockstep.** Integer cm and ticks; the arc's points are generated integers in the catalog (the generator may use any
  math: it runs at authoring time, not in the sim); `kitBills` and the hold are integer reads.
- **Performance.** Canopy isle (one slab with a beach skirt), five trunks to 150 m, two 120 m chalk walls, 1.2 km of
  deck and bents, three bay trains. Reported by `npm run perf` and the look harness's counts; not a reason to cut
  anything without the owner's word.

## Design review (2026-11-19)

The planner's own review, in the same sitting (owner call "Fold roles into the builder", 16 November); the plan was
reread from the top before the calls were sorted. **Read:** DESIGN.md; owner-calls' index; the rail and rewards
Current rules with the entries cited below; docs/direction.md (phase 1, focus "choice and payoff"); the 14 November
owner session as leg 2's review quotes it (his last press was "Open the barrier", five times, against "No line beyond
yet"); the research above; the level report and the scratch measurements; `npm run loop -- node canopy` and
`-- node bell`; the code each call depends on; garage-choices.html's leg 3 calculator. **Seen:** numbers only. **Not
seen:** any still. No Canopy massing exists, so the isle, the cleft, the heads and the eased Bell Rock are judged from
the map data and the catalog, which is why steps 5 and 6 list their stills.

**Flow, beat to beat** (the beats table; progression-flow-layout's three firm rules):

- *The next goal can be found.* Beat 1's barrier is now beside the train you arrive on (it moves to frame 1); each
  head's rack is beside the train that stops there; head 2 is the isle's edge, facing the trees; the cloth post and the
  Notch barrier stand at the line's end, 10 m apart. Home is the same line back.
- *A gate keeps its meaning.* The Canopy barrier takes the seeds at the only gated frame; a swimmer reaches the isle
  early and every post refuses; a glider skips water, never a bill.
- *Nobody is stranded.* Head 1 has a sea ramp; the isle has beaches all round; head 2 stays a request stop; trains run
  both ways from every open halt; the keys are the room's, so a leaver loses nothing. A held Strong train is at most
  a delay at the railhead while service permits.
- *Lenses.* "A world that shortens behind you": Canopy is one ride from Home on the line the bay cut started, so the
  shortcut pays twice. "The key in sight of the lock": the cloth and the Notch barrier are 10 m apart, and the lock
  refuses (finding 4). "Ending a beat facing the next": the ride home ends at the West landing, where leg 4 will start.
  "A place to meet": Bell Rock's upper deck; Canopy's deck.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | 20 logs + 20 rails a section, about 30 s to lay; sections end at a place, up to about 900 m | Decided | [16 November](../decisions-rail.md#d-2026-11-16-batch2-greybox-section-length-and-lay-time) (head 1 is mid-strait, as legs 1 and 2's sea heads are; call 14) |
| 2 | Strong is a hold: two sections' kit, waiting at the railhead while service permits; built with leg 3; Strong while building, Quick after | Decided | [19 November](../decisions-rewards.md#d-2026-11-19-garage-step4-waits-for-leg3) (the orchestrator's call, his to overrule) |
| 3 | Quick 25 m/s with the same cars; Strong 20 m/s with one more car | Decided | [15 November garage trade answers](../decisions-core-loop.md#d-2026-11-15-garage-trade-answers) |
| 4 | One fixed order through Bell Rock; Canopy after the bay cut | Decided | [16 November](../decisions-rail.md#d-2026-11-16-batch2-fixed-order-branch-wayfinding); [campaign outline answered](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered) |
| 5 | Canopy's stall at Bell Rock rises with its leg, on the bay line's level | Decided | [12 November](../decisions-rewards.md#d-2026-11-12-cargo-trains-and-hub-towns-answered) (5), the market's fixed table |
| 6 | Trains stop on request; a lever at each platform side | Decided | [10 November](../decisions-rail.md#d-2026-11-10-trains-stop-on-request-at-the) |
| 7 | Right-hand running on the bay line's new halts | Decided | Owner, [18 November](../decisions-rail.md#d-2026-11-18-decisions-page-rail) |
| 8 | Greybox asks must be served within two even-spacing headways plus intermediate dwells, with safe spacing at every tick. | Decided | [23 November](../decisions-rail.md#d-2026-11-23-greybox-service-health) |
| 9 | `rail.legStock` predicted; grant and gate server-confirmed | Decided | [16 November](../decisions-rail.md#d-2026-11-16-batch2-greybox-stock-is-predicted) |
| 10 | Live for everyone, grey and labelled, the leg shipped whole | Decided | [12 November](../decisions-rail.md#d-2026-11-12-ring-island-build-2-and-the-greybox-route-answered) (4) |
| 11 | Mechanisms on blockout: Canopy's town stays a flat deck, no folk or bespoke props; the sling stays out | Decided | Owner call [greybox before detail](../agents/owner-calls.md#mechanisms-systems-greybox-details), 11 November; greybox-route's stand-ins |
| 12 | Only Strong holds a later bill at the head. It yields to an assigned rider elsewhere or a follower waiting at its signal. | Decided | [23 November](../decisions-rail.md#d-2026-11-23-greybox-service-health) |
| 13 | **The kit ahead runs into leg 3**, so its first kits ride standard trains before the bay trade is offered | **New** | Leg 2's rule for every same-line successor (its call 10, open). Keep it for now; Checkpoint G measures what is left for Strong. Open question 1 |
| 14 | Three sections cut at the strait's level middle (s ~1750) and 33 m onto the isle (s ~2150), the last to Canopy's stop: about 533, 400 and 255 m | Default | Level finding 2: equal thirds put both heads on grades. Open question 2 |
| 15 | Bell Rock's kink eased with a 60 m arc; the stop stays at s 1217, on the curve; the upper platforms as chords | Default | The track report; the smallest move that passes it. Open question 4 |
| 16 | Canopy's stop 25 m short of its kink, a crossover before, buffers 2 m short; no loop end | Default | No train crosses a 102° kink; a loop does not fit the 71 m cleft (finding 5) |
| 17 | The Canopy barrier moves from the upper deck's reserve to frame 1 on the outward platform; rack 1 abreast of the kit car | Default | Leg 2's call 11 (the frame is where it reads as a gate); Q7's last carry under 15 m |
| 18 | Bay fleets `[2, 2, 3, 3]`, 50-tick normal dwell. Both fleets passed at Canopy with three trains. | Measured | Step 2 |
| 19 | Head 1 closes once Canopy opens; head 2 stays a request stop both ways | Default | The stack's `closesAt` rule; head 2 is a place to get off into the forest |
| 20 | The cloth post on Canopy's homeward deck round the buffers (reach 4 m), taken once the leg is laid; the Notch barrier across the row at the kink, 10 m from it | Default | The key beside the lock it will open; the halt's map point is already the kink |
| 21 | The Notch barrier refuses "No line beyond yet" with the cloth held; a board "LINE TO LANTERN NOTCH / LATER" beside it | Default | DESIGN 7; finding 4 |
| 22 | The hold's bound: until the section lays, at most 1,200 ticks past the dwell, during a lay while service permits, only at open ends | Default | A solo feed and lay is about 60 s; the fuzz may shorten it |
| 23 | A Strong train carries two sections of one leg, never across legs | Default | The next leg on the bay line is not built, and kit for a closed leg cannot unload |
| 24 | Canopy's stand-in: the isle as a slab with beaches, five mother trunks, the two chalk walls with the cleft open, a deck at the halt; head 1 a sea ramp, head 2 steps | Default | level-design rec 3; leg 2's massing pattern |
| 25 | Prompt "Take the glider cloth" and its block, four objective texts, the end boards | Default | Placeholder copy, none The Boogler's |
| 26 | Jump rows `canopy-open`, `canopy-mid`, `canopy-reached` without a `land` until step 6's stills | Default | Leg 2's step 3 reason (return-spot matches lands by x and z) |

**Counts:** 11 Decided, 13 Default, 2 New. Every Default and New call is logged in
[agent-calls](../agent-calls.md#rail-construction-levels-and-travel) (rail) and, for calls 12 and 13,
[core loop](../agent-calls.md#core-loop-pacing-and-progression). **Suspect lines of The Boogler's:** none written,
changed or read as suspect.

### Findings

1. **(changed step 1) Equal thirds put both heads on grades.** Measured on the row: head 1 across the s 1608 grade
   break, head 2 on the 3.9% climb offshore. The cuts move to level places (call 14), the test recomputes them.
2. **(changed steps 1 and 5, and the batch) The arc moves track leg 2's views draw.** Easing Bell Rock's kink runs the
   bay line 6.8 m inside the old vertex, through leg 2's provisional inner platforms. So Bell Rock's rework (step 5)
   ships in the bump's batch, and step 1 waits for leg 2's views.
3. **(added step 3's trade script and Checkpoint G's report; no change to leg 3's rules) Strong's window is small.**
   Garage step 4 offers each line's trade at its leg's last lay (its call 11); the bay cut's last lay is also the one
   that opens leg 3. By then the kit ahead has put leg 3's first sections on standard trains, and the room stands at
   Bell Rock, 2 km from the post. A solo room that fits Strong then pays a round trip home of about 3 minutes to make
   the next West landing train Strong, which holds only for the sections still to load; a pair that splits at beat 1
   gets it. The 27 to 30 s is a best case that leaves the kit ahead out. upgrade-economy rec 2 asks that an upgrade
   repay an inconvenience already felt: the room first feels the kit wait on the bay cut, at `bay-mid`, standing at the
   West landing 28 s from the post, before the trade is offered. Calls 12 and 13; open question 1.
4. **(changed step 6: the board) The Notch barrier refuses with the key in hand.** The room takes the cloth 10 m from a
   barrier that needs it and says "No line beyond yet" for two more legs: the refusal the owner pressed five times at
   the Gorge, now with the key held. Leg 2 accepted the same at Bell Rock (its call 21), and that barrier opens here.
   The barrier stays (it telegraphs the ending's approach, DESIGN 7); a board beside it says "LATER" before the prompt
   does (call 21).
5. **(changed step 1) Canopy is a crossover end, not "a loop end".** greybox-route's table asks for a loop; the halt
   stands in a 71 m cleft between two 120 m chalk islets, and a 40 m loop needs about 90 m. A crossover and buffers, as
   at Bell Rock, cost nothing; leg 6, which runs on to the Notch's loop, may revisit it.
6. **(no change) The route's live end is Canopy until leg 4 ships.** The next leg (the cave line) starts at the West
   landing and takes the pick the room holds. The ride home ends there, facing it; the objective line says the next
   line is not built yet. Nothing in the world at the West landing says so until leg 4's views.
7. **(no change) Solo and co-op.** Solo works end to end on the room's keys (the seeds since leg 2). A pair splits at
   beat 1 (one fits at Home once garage step 4 exists, one feeds); three players feed a section in one trip each; a
   friend joining is one bay line ride from the railhead. A held train is also the room's ride to the next head.
8. **(changed step 6: a reserve) The hub stand-in town is owed and not built** (decided 12 November, "stand-in towns go
   into the greybox now, at the minimum"; High Gorge has none either, `TRADE_TOWNS = 1`). The brief keeps Canopy's town
   the route plan's stand-in. Step 6 keeps room for one on the homeward deck. Open question 5.

## Open questions

None blocks leg 3's build: each proceeds on its recommendation. Question 1 holds garage step 4's screen (its offer
moment and readout), not its rules and not this plan; question 3 changes when steps 1 to 5 start, not what they do.

1. **Strong's window (for garage step 4, after Checkpoint G).** The bay trade opens at the bay cut's last lay, after the
   kit ahead has loaded leg 3's first sections onto standard trains, with the room 2 km from the post. **Recommended:**
   if Checkpoint G's table shows Strong fitted at `bay-reached` saving under 15 s solo, garage step 4 offers the bay
   line's trade from the bay cut's first lay (`bay-mid`), when the room stands at the West landing 28 s from the post
   and has just met the kit wait; the ten-second rule is met by the whole line (10.5 s at the bay cut, about 22 s with
   leg 3). Or keep the offer where it is and accept that Strong pays mostly to a pair who split; or stop the kit ahead
   at a gated leg (leg 3's kit loads only once the Canopy barrier is open), which gives Strong its window but adds a
   lap's wait at Bell Rock for every room. **Blocks garage step 4's step 3, not leg 3.**
2. **Cut leg 3 at level places (the strait's middle and 33 m onto the isle), or keep the catalog's equal thirds?**
   **Recommended: places.** Thirds stand both heads on grades (one across a grade break, one on a 3.9% climb offshore);
   places put head 2 on the isle's edge, the first footfall on the forest isle. Proceeds on it.
3. **May steps 1 to 5 start once leg 2's views are on main, before leg 2's step 5 (its bot and loop)?** Your brief's
   order is after step 5. **Recommended: yes.** Steps 1 to 5 share no file with leg 2's step 5, and garage step 4, the
   top backlog row, waits on Checkpoint G. Until you answer, the brief's order stands.
4. **Bell Rock's arc: 60 m (6.8 m inside the old vertex) or 100 m (11.4 m, as leg 2's massing review assumed)?**
   **Recommended: 60 m.** It passes the track report, moves the upper level least and leaves the deck's pads where they
   are; step 5's still judges whether a train on it reads well. Proceeds on it.
5. **The hub stand-in town.** Decided 12 November (a `Town` row, a pad within 60 m, two box buildings, three stakes, one
   board, plot 1 staked by the first train), not built at High Gorge either. **Recommended:** one stand-in towns plan
   for High Gorge, Canopy and Port Quay once slice 5's rules take more than one town; leg 3 keeps the room. Proceeds;
   it adds nothing to leg 3.
