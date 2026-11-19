> **Status, 19 November 2026: steps 1 to 3 on main (world v62, #2270); step 4 built on `claude/greybox-leg2-views`
> ([as built](#step-4-as-built-19-november)), awaiting review; step 5 not started** (steps 1 to 3 [as built](#steps-1-to-3-as-built-18-november)). Planner, against main `e8ae03b0f` (world v61), rebased onto `cfb8123d6` with the owner's 18 November rail answers folded in. Owner's go
> (18 November, decisions page): "Start the greybox route's leg 2 rules now, so garage step 4 can follow? -> Yes,
> start a planner after separate capacities". **Garage choices step 4 can start once steps 2 and 3 are on main**
> ([below](#what-garage-step-4-waits-for)). Design review [at the end](#design-review-2026-11-18).

# Greybox leg 2, the rules: the incline, Bell Rock's seeds and the bay cut, playable

**Where this sits.** Leg 2 of [greybox-route](greybox-route.md) (section 3, row 2; area 5). Its massing is on main
(#1720, plan archived at [greybox-leg2-massing](../archive/plans/greybox-leg2-massing.md)); this is "the later rules
plan" that massing plan names. **It is a file of its own, not a section of greybox-route**, because that is the
convention leg 2 already set: the leg 1 detail lives inside greybox-route (183 KB, mostly leg 1 measurement sheets) and
leg 2's massing had its own file. greybox-route's "Legs 2 to 6 repeat steps 3 to 5 on the systems leg 1 built" is the
shape followed here: rules, seeds, views, bot and loop, then a checkpoint.

**Goal.** From High Gorge a room opens the incline with the powered pick, builds it to Bell Rock, takes the crystal
seeds, rides home and builds the bay cut from Home's West landing back to Bell Rock, closing the first loop, all on
real server lines in greybox. It serves DESIGN.md's core loop ("the rail builds the world"), **7. Telegraph
everything** (the shut barrier the owner pressed five times on 14 November opens; the Canopy barrier stands shut in
view at Bell Rock) and **8. Enjoyable alone and together** (a pair can split at Bell Rock). It bends **11. Show,
don't tell** in one stand-in (the bay cut's first kit is stocked at the West landing without a train; [open
question 2](#open-questions)).

**Read for this.** AGENTS.md; `npm run map -- --kind prototype` and `--kind poi` (no `plan` kind exists); DESIGN.md;
greybox-route sections 1 to 6 and leg 1's steps; the archived massing plan with its review; garage-choices sections 0,
1 and 7 and its review's finding 1; campaign-outline (the market hub, section 1's area 5 row); the rail and rewards
Current rules; `src/sim/railway-route.ts`, `railway-lines.ts` (rows, `legBuilt`, `RAIL_TRAINS`),
`railway-sys-route.ts`, `railway-sys-route-kit.ts`, `railway-queries-route.ts`, `railway-train.ts`
(`trainStopsOf`), `railway-seed-legs.ts`, `src/world/railway-server.ts` (reach), `railway-predict.ts`,
`src/content/levels/leg2.ts`, `src/entities/route-greybox/leg-view.ts`, `dev/level/route-leg2.ts`,
`dev/loop/standins.ts`. Pattern followed: leg 1 (the stack leg), steps 3 to 5.

**Research.** [route-contract](../research/route-contract.md) (travel edges never supply work): used; a swimmer at
Bell Rock finds the seeds post refusing ([Level findings](#level-findings), 1). [level-design](../research/level-design.md)
recs 3 and 6 (the bore's reveal; the pinnacle as the lure): used as the massing review ruled.
[upgrade-economy](../research/upgrade-economy.md) rec 2 (an upgrade repays an inconvenience already felt): used for the
order, the long ride home before the shortcut. [rail-network-depth](../research/rail-network-depth.md) ("the railway
runs itself"): used; no player routes a kit. [roundhouse-management](../research/roundhouse-management.md): read for
garage step 4's needs only.

**Port from Place.** Nothing is ported. No fit check is needed.

**The rail route as it stands** (`npm run loop -- node`): `gorge` and `bell` are still stand-ins. `bell`: "12 logs +
28 rails + 44 footings + 52 steel + 4 copper + 2 crystal = 142 units; allowance 30 min; legs incline 1.16 km, bay-cut
1.23 km; grants bay shortcut, crystal seeds; requires gorge". **Leg 1's loop nodes are not built** (greybox-route
step 5 left "the loop graph" part; `npm run loop -- node pick` finds no node). Step 5 below adds them first.

**In flight** (`npm run inflight`, 18 November): `claude/forge-rack-move` touches `dev/look/bots/railway.ts` and
`src/sim/railway-line2-layout.ts`, neither edited here. Planned, not built: [stack-west-platforms](stack-west-platforms.md)
edits `railway-lines.ts`'s `STACK_HALTS` and wants v62 ([world bump](#the-world-bump)).

## What garage step 4 waits for

Garage step 4 ("Lines in the bays; the per-line trade") "starts when stage 4's lines are playable". Stage 4 is the
`ns` row's incline and the `bay` row's cut (`railway-world-lines.ts`, `stage: [4, …]`). What that step builds (two
boiler rows per line, `boilerAdopt` at each line's next depot departure, works copies, `rail.bring`, line chips) needs
**train rows on the `ns` and `bay` lines that run once their legs are laid, and a room state where both run.** Today
both lines have `trains: 0` and every halt shut.

- **Step 2 makes them playable in the sim** (both lines' trains, their legs' rules, the bump). It is ordered second,
  after a small catalog step it depends on, and before every view.
- **Step 3 gives garage step 4 its starting states** (`bell-reached`, `bay-reached`: both lines fitted and running).
- So **garage step 4 starts when steps 2 and 3 are on main**. Steps 4 and 5 (views, bot, loop) can run beside it:
  their files do not overlap garage step 4's list except `railway-server.ts`, which step 2 finishes first.

Two facts for garage step 4 from this plan: **the two lines arrive one after the other, not together** (the bay cut
opens when the incline is complete; about 15 to 20 minutes apart solo, arithmetic below; [open question
1](#open-questions)), so line chips appear one at a time; and **each new line's depot is its home halt**, High Gorge for
`ns` and the West landing for `bay` (where its trains join and load), never Home's Roundhouse.

## Design

### The beats, in play order (solo; arithmetic, not measured)

| # | Beat | Where | What gates it | About |
| --- | --- | --- | --- | --- |
| 1 | Take the powered pick (exists) | Gorge rim, 82 m up the stair | the stack leg laid | 40 s up, 40 s down |
| 2 | Open the barrier on the incline's first frame | incline-s platform, t 24 | `pick` held, the incline open | 5 s |
| 3 | Feed section 1 from the Gorge rack (line 2's kit, already aboard: [kit ahead](#the-kit)) | incline-s, the rack on leg 1's south platform | the barrier open | 30 s for 40 units, then 30 s to lay |
| 4 | Ride the first `ns` train through the bore to head 1; feed section 2 from the head's rack | head 1, s 586, over the sea | section 1 laid; the `ns` train brings section 2's kit from the yard | 35 s ride, 30 s feed, 30 s lay |
| 5 | Ride on to Bell Rock's lower platform; take the crystal seeds on the lower deck | Bell Rock, lower | the incline laid | 30 s ride, 10 s walk |
| 6 | See the Canopy barrier shut on the upper deck (telegraph, leg 3's) and the two lower stalls risen | Bell Rock | | 12 s up the ramp |
| 7 | Ride home the long way: `ns` to the Gorge, line 2 to the Village, walk to the West landing | | the bay cut opens with the incline's last lay | about 6 to 7 min |
| 8 | Feed the bay cut's section 1 from the West landing's apron rack | West landing | the bay cut open; its first kit stocked ([stand-in](#the-kit)) | 30 s feed, 30 s lay |
| 9 | Ride the first `bay` train to head 1; feed section 2 | head 1, s 608, over the sea | section 1 laid | 35 s ride, 30 s feed, 30 s lay |
| 10 | Ride on to Bell Rock's upper platform: Home's stall rises; Home is about a minute away | Bell Rock, upper | the bay cut laid | 35 s |

About 18 minutes solo with waits, against area 5's 30-minute allowance (standins.ts). The checkpoint measures it.
**Co-op:** beat 7 can split. The seeds are the room's and the bay cut does not need them, so one player takes the
seeds while another rides home to start the cut; a friend joining at Home starts at beat 8.

### Sync kinds and authority

| Piece | Kind | Authority | Where |
| --- | --- | --- | --- |
| The `ns` and `bay` lines' halts, ends, fleets and trains | Server (catalog + `Train` rows) | server | `railway-lines.ts`, `RAIL_TRAINS` |
| Leg rows, the Gorge yard, grants and gates | Server (`Leg`, `LegYard`, `Route`, all on main since v32) | server | `railway-sys-route.ts`, `railway-sys-route-kit.ts` |
| Kit on trains, the rack, the yard | Server, atomic inside the tick's apply | server | `railway-sys-route-kit.ts` |
| Track, decks, trestles, heads, frames, racks, barriers, the seeds post, stall boxes, levers, boards | Local, from accepted state | each tab | `src/entities/route-greybox/`, `src/entities/railway/halts-view.ts` |
| The bore through the south stack | Local static colliders and mesh | each tab | `src/content/levels/gorge.ts`, `massing.ts` |

No client lead, no classic edit generator, no client state registration, no `src/world/rules/` file. Rule ticks: the
room's rule tick (`rail.legTick`, the trains' step) on the server; saves are the room checkpoint's (every state key
already exists: `Leg`, `LegYard`, `Route`, `Train`). **Ops: none new.** `rail.legStock`, `rail.grant`, `rail.gate`,
`rail.depotTake`, `rail.depotRailTake` and `rail.call` already validate any leg, grant, gate, rack and halt by index
(`railway-server.ts`: `legFrame`, `legRackNear`, `RAIL_GATES[e.id].at`); step 2 only gives them real points. **Wire:**
no new message or field; the halt ids of the `ns` and `bay` lines change meaning (reindexed, step 2), covered by the
bump. **Prediction:** `rail.legStock` is predicted (decided 16 November); `rail.grant` and `rail.gate` wait for the
server, as on leg 1. **Accepted/refused receipts:** as today; every refusal shows its reason in the prompt.

### The catalog (step 1)

- **The Gorge's `ns` stop moves from s 20 to s 36** (call 118, confirmed 16 November), its start crossover with it
  **into the bore, s 70 to 90** (the 11 m between the platforms' end at t 56 and the mouth at s 67 cannot hold a 20 m
  turnout). The incline is then s 36 to 1156: **two sections of 560 m** (`sectionsOf`), head 1's stop at s 586.
- **Bell Rock's `bay` stop moves 10 m back, s 1227 to s 1217**, onto the in half's straight (t 10). At s 1227 it
  stands on the 52° kink and the engine's 8.2 m reach ahead (`TRAIN_EXTENT`) is on the out half. Buffers at t 0, the
  kink; leg 3 eases the bend. The bay cut is then s 20 to 1217: **two sections of 598.5 m**, head 1's stop at s 608.5.
- **Sim halt order, the bug this fixes.** `trainStopsOf` takes open stops as a prefix in halt-index order
  (`out.length !== k`), so a railhead appended after a row's catalog halts (today's `railheadOf`: `ns` 3, `bay` 4) can
  never open before Bell Rock. The `ns` line becomes **[High Gorge, Incline head 1, Bell Rock, Original Island]** and
  `bay` **[West landing, Bay head 1, Bell Rock, Canopy Town, Lantern Notch]**. `railway-route.ts` gains
  `simHalt(row, catalogHalt)` (the catalog halt's index on its sim line, counting the heads of built legs before it)
  and every non-`ring` leg's `railheadHalt` becomes `simHalt(row, from) + 1`. Later legs then point at an untagged
  halt, so `legBuilt` stays false for them until their own plan inserts their heads (and its own bump).
- **Points.** Section 1's frame and rack per leg are explicit, as `STACK_FRAME_0` is; sections 2 on use leg 1's
  formula (frame 8 m short of the section's start, rack 18 m short, 4.8 m right going out, 0.9 m up, reach 4 m) on any
  row. World metres:

  | Point | Where | x, z, y (m) |
  | --- | --- | --- |
  | Incline frame 1 and the `incline` barrier | `rowSide('ns', 2400, -480, 90)`: incline-s, t 24, 1 m in from its edge | -91.5, -1966.4, 3.9 |
  | Incline rack 1 (line 2 unloads here) | leg 1's south platform, abreast of line 2's kit car standing at High Gorge; the builder measures it from the consist (`kitCarAt`) | within 9 m of the car's centre and 15 m on foot of frame 1 |
  | Incline frame 2 and rack 2 | head 1's platform: `rowSide('ns', 58800 / 57800, 480, 90)` | about -14, -1417, 4.9 |
  | Bay frame 1 and rack 1 | the West landing's apron: `sl.at(12, 9.8)` and `sl.at(6, 9.8)` | 801.3, -5.5 and 805.0, -0.8, at 4.9 |
  | Bay frame 2 and rack 2 | head 1's platform: `rowSide('bay', 61050 / 60050, 480, 90)` | about 430, -470, 4.9 |
  | `seeds` (reach 4 m) | Bell Rock's reserved seeds spot, lower deck, `ne.at(-4, -15)` | -64.7, -854.9, 4.9 |
  | `canopy` barrier | the reserved Canopy frame spot, upper deck, `ne.at(0.5, -27)` | -77.0, -851.2, 15.9 |

- **Ends.** `ns` at Bell Rock while it is the line's last stop: a crossover before the platforms (s 1096 to 1116, on
  the bed's north end) and buffers 15 m past the stop. `bay` at Bell Rock: a crossover on the in half's bed (t 25 to
  45) and buffers at t 0. Each head is a stub end while it is the line's last, as leg 1's.

### The rules (step 2)

- **When each leg opens.** The incline opens when the stack leg is laid (`after: 0`, on main); its first frame takes
  nothing until the `incline` barrier is open (`pick`). **The bay cut opens when the incline is laid** (`after: 1`, on
  main), whoever holds the seeds. One leg is open at a time on the whole route (the `after` chain is a line), so
  `Rail.depot` / `Rail.depotRails` stay the one open leg's rack.
- **Halts.** `ns`: High Gorge opens with the incline's first lay (before that the line has no track); head 1 with
  section 1; Bell Rock with section 2. `bay`: the same with the West landing, head 1 and Bell Rock. Original Island,
  Canopy Town and Lantern Notch stay shut. **Head 1 stays a request stop both ways once passed** (as the stack's third
  head, `Stack halt`): a two-section leg has no "section after next" to close it behind. Block signals at each
  section's end but the last (`RailLineDef.signals`), as line 2's. **Right-hand running on both lines** (owner, [18
  November](../decisions-rail.md#d-2026-11-18-decisions-page-rail): "Yes, every line"): each halt's two platform
  points follow [running-side](running-side.md)'s rule (`platforms: [outward, homeward]`, not `both()`), and each lever
  calls its own platform's direction.
- **Fleets.** `ns` and `bay` each `fleet: { leg, trains: [0, 1, 2] }`: no train before the first lay, one from it, two
  from the last (the ladder's "a train per extension", decided 15 November). Trains join at the line's home halt with
  the scale-in (`fleetJoin`). Four new `RAIL_TRAINS` shed rows, appended after every existing slot (no slot moves).
  Consist: engine, players' car, kit car; no riders' coach, no steel car (no towns on these lines yet). Boiler: the
  20 m/s row (`speed: 200` from the catalog). **On lines other than line 2 every running train may carry kit**
  (`legKitTrains`: call 65's "running less one" keeps a car for build 2's steel, which only line 2 carries).
- <a id="the-kit"></a>**The kit.** Line 2's rules stand (steel first, ruling D's stone stop, `kitLead` "all
  remaining", one kit a train, surplus home at the Village). What is new:
  - **The yard (the incline's kit, `kit: 0`, the `gorge` yard fed by the stack leg).** Line 2's trains load the
    incline's kit at the Village as they load the stack's (logs minted, rails off the forge rack). At line 2's High
    Gorge halt they unload first onto the rack, what section 1 still lacks while the incline's rack stands at the
    Gorge (nothing laid), then the rest into `LegYard[gorge]`, up to what the leg's remaining sections lack. `ns` trains
    standing at High Gorge (their kit halt) load from the yard, one section's bill, no minting and no forge hold, and
    unload at head 1's rack as leg 1's trains do. A line 2 train carrying yard kit can always unload it (the Gorge
    halt is open once the stack is laid), so it is never "waiting" (ruling D) and makes no stone stop. Kit is not
    freight: "freight never changes line" (outline, section 3) is about town goods; the yard was in the catalog
    from G1.
  - **The next leg's kit rides ahead** (new). A leg's kit is owed from the moment the leg before it has loaded all of
    its own (`kitOwed` of its `after` leg is zero), not only once that leg is laid. So line 2 brings the incline's
    two kits while the stack's last section is still being fed; they ride aboard until High Gorge opens, then unload
    on the first train in. Without it, solo, the room stands at the Gorge for a line 2 lap (about 3 to 4 minutes)
    after the pick. Applies to every yard or same-line successor; it does not apply across lines with their own home
    (the bay cut's kit is stocked, below).
  - **The bay cut's first kit is stocked at the West landing** (new, a stand-in). The bay line's kit halt is its home,
    the West landing, which is also section 1's rack. With nothing laid it has no track and no train, so while the bay
    cut is open with nothing laid, `legKitStock` (new, run from `rail.legTick`) puts onto the rack what section 1
    lacks from Home's stock: logs minted, rails off the forge rack (waiting for rails as kit loading does). How goods
    cross Home to the West landing is still the open brainstorm (greybox-route section 3, "Home's seam"). From the
    first lay the bay line's trains load at the West landing (minted logs, forge rails, as line 2 at the Village) and
    carry to head 1.
  - **Completion.** On the lay that completes a yard leg, any units left in its yard go home as `legKitHome`'s do
    (logs unmade, rails back to the forge rack). A unit lifted off a rack and lost is owed again, as on leg 1.
  - `openLeg`, `rackLeg`, `legKitSurplus`, `legKitWaiting` and `legKitNeed` become per role: the leg a line's trains
    serve is the open leg on that line (its kit loads at the line's home) or the open leg whose yard a leg on that line
    feeds. `legKitNeed` counts the yard and every line's aboard units.
- **Grants and gates.** `rail.gate incline` opens once `pick` is held and the incline is open (on main; it refused
  "No line beyond yet" because `legBuilt(1)` was false). `rail.grant seeds` once the incline is laid. The `canopy`
  barrier stays shut and refuses with "No line beyond yet" (placeholder) until leg 3 is built: it stands in view.
- **The West landing unstakes** in this build: `WEST_STAKED = false` in `src/content/levels/leg2.ts` (owner, 15
  November: "the build starting bay-cut restores the massing"; a build switch, never room progress). That also meets
  start-area S5's trigger ("any new catalog row touches Home's land"); S5 moves no height and is start-area's step,
  not this plan's.
- **Invariants** (`railway-check-route.ts`): yard units only while its leg is open, never more than the leg's remaining
  bills less fed; conservation counts the yard; each line's kit carriers within its `legKitTrains`; a train's
  `legKit` cargo only on a line that serves an open leg or is carrying surplus home.

### Controls and copy

No new action, pad slot, key or touch button. Every press is Interact through the existing prompts ("Open the barrier",
"Take logs", "Take rails", "Feed the frame", the lever) plus one: **"Take the crystal seeds"** (placeholder), blocked
with "The incline isn't laid yet" (placeholder). Objective texts for the play record (placeholders): "Open the
incline's barrier", "Build the incline to Bell Rock", "Take the crystal seeds", "Build the bay line from the West
landing", "Ride the bay line to Bell Rock". No Boogler line is written or changed.

## Steps

Each step leaves `node dev/ship-check.ts` green. **Steps 1 to 3 ship together as the leg's bump** (as leg 1's 3 to 5
did); 4 and 5 ship on their own after it.

- [x] **1. The catalog (S; HOTBOX).** `dev/level/world-blockout.ts`: the `ns` row's Gorge stop to s 36 and its start
      crossover to s 70 to 90; Bell Rock's `bay` stop to s 1217. Regenerate (`node --import ./dev/sim/hooks.ts
      dev/level/world-blockout.ts`): `src/sim/railway-world-lines.ts`, `docs/world/world-blockout.html`,
      `rail-map.html`. `src/sim/railway-route.ts`: `simHalt`, `railheadHalt` by it, the explicit section 1 frames and
      racks above, `legFrame` / `legRack` on leg 1's formula for any row from section 2, the `seeds`, `incline` and
      `canopy` points. `dev/level/route-leg2.ts`: the planned points as named marks (reach on foot from the platforms;
      the Gorge's rack-to-frame walk under 15 m, stated). Verify: `test/railway-route.test.ts` (sections 560 and 598.5 m;
      every built leg's `railheadHalt` is its from halt's sim index + 1; the points within 1 m of the table above);
      `test/world-lines.test.ts`; `npm run level-check` (no new report).
- [x] **2. The rules and the bump (L; HOTBOX). Unblocks garage step 4 with step 3.** `src/sim/railway-lines.ts`:
      `ns` and `bay` as built lines (halts in sim order, ends, `fleet`, `signals`), not `rowLine`'s all-shut rows; the
      load-time checks extended (a built leg's heads and destination in order). `railway-queries-route.ts`: the serve
      roles, the yard in `legKitNeed`, `legKitTrains` per line, the kit ahead. `railway-sys-route-kit.ts`: the
      feeder's unload to rack and yard, the yard load, `legKitStock`, yard surplus home. `railway-sys-route.ts`: the
      completion's yard release. `railway-check-route.ts`. `src/content/levels/leg2.ts`: `WEST_STAKED = false` and the
      rebuilt level artifact. `src/world/namespace.ts`: the bump and a dated line. Fixtures regenerated. A new sim file
      is listed in `server/Dockerfile`, `dev/server-build.ts` and `deploy-server.yml` (`test/server-image.test.ts`).
      Verify: `test/railway-route-rules.test.ts` gains: the barrier refuses `rail.legStock` while shut (the "gate
      shut" refusal leg 1 could not test); the barrier opens only with `pick` held and the incline open; section 1 fed
      off the Gorge rack; the relay conserves every unit (line 2 to the rack and the yard, `ns` to head 1); `seeds`
      refused before the incline is laid and taken once after; the bay cut opens on the incline's last lay; the West
      landing's rack stocked from Home's stock; both lines' fleets 0, 1, 2 and their stops a prefix at every stage;
      the yard empties on completion; the leaver release on a yard leg. Fuzz, the WAIT_BOUND method (`askPool`), four
      seeds at 75%: on each new line the settled worst at most 1,350 and the growing at most 1,600 ticks (decided 16
      November); line 2's waits and leg 1's gates 5, 8, 9, 11 and 14 re-measured with the kit ahead (it changes what
      line 2 carries); the long mode (`ROUTE_GATES=1`) run and its output pasted before the bump ships. `npm run loop
      -- run`.
- [x] **3. Seeds and stages (S; HOTBOX).** `src/sim/railway-seed-legs.ts` from `gorge-reached`, accepted ops only:
      `incline-open` (pick taken, barrier open, section 1's kit on the Gorge rack), `incline-mid` (section 1 laid,
      section 2's kit aboard an `ns` train, the rest in the yard), `bell-reached` (the incline laid, seeds not taken),
      `bay-open` (seeds taken, the West landing's rack stocked), `bay-mid` (section 1 laid, kit aboard a `bay` train),
      `bay-reached` (the bay cut laid: both stage 4 lines run trains). `laySection` takes a leg. `SEED_STAGES` and its
      golden shard; `src/world/railway-jump.ts` rows (they are the room fast-forward's list: placeholder UI text).
      Verify: `test/railway-jump.test.ts`; each stage's invariant check.
- [x] **4. The views (M to L; Mac).** Built 19 November on `claude/greybox-leg2-views`
      ([as built](#step-4-as-built-19-november)). `src/entities/route-greybox/leg-view.ts` generalized from the stack leg to any
      built leg (it hard-codes `LEG = 0`): deck, rails and sea bents from `laid`, the frame with its bill and plate, the
      rack, a 25 m head platform with a sea ramp, block signal posts, the end board ("LINE TO BELL ROCK / UNDER
      CONSTRUCTION", placeholder) at each line's end, and one more at the end of Bell Rock's upper in-half platform
      from the incline's last lay, "LINE TO HOME (WEST LANDING) / BUILT FROM HOME" (placeholder; the review's finding
      1). The barrier at incline frame 1; the `canopy` barrier on Bell
      Rock's upper deck; the seeds post. **The bore:** `src/content/levels/gorge.ts` splits the south stack's hidden
      collider round a 165 m bore (s 67 to 232, 8 m wide, 7 m high) and lines it dark, with a mouth mark at each end
      (riders on the deck would hit the collider otherwise). Bell Rock: a box on each pad by ruling 2's table (High
      Gorge and Ring Island with the incline, Home with the bay cut), the pad reading "Connected (placeholder)".
      `halts-view.ts`: a lever at each new halt's reserved lever end and each head; a plain departure board per halt
      listing its line's stops (the halt map's drawing is line 2's; extending it is [left](#left-out)). Trains on the
      new lines (`train-view.ts` poses any line through `poseCarOnLine`; check riding and the kit board's number), the
      kit's hop at each rack (line 2's car to the Gorge rack: 9 m, `crates.hopOff`'s `over`), crates appearing on the
      West landing's rack. `src/adapters/railway-read.ts`, `railway-intents.ts`: the seeds prompt and the objective
      texts. `docs/game-design/place.md` updated. Verify (`.look/`): from the stair's foot, the barrier at frame 1; from
      an `ns` train, the bore's exit into the split, both ways; head 1's platform from the train; Bell Rock's lower
      deck with the seeds post and the two stall boxes; the Canopy barrier from the ramp's head; the West landing from
      the commons' edge, unstaked; a `bay` train at Bell Rock's upper platform; the look harness's mesh and collider
      counts with Bell Rock resident and not.
- [ ] **5. The bot and the loop (M; HOTBOX).** `dev/loop/graph.ts`: leg 1's nodes first if still missing (`stack-1` to
      `stack-4`, `gorge`, `pick`), then `incline-gate`, `incline-1`, `incline-2`, `seeds`, `bay-1`, `bay-2`, bills
      and positions imported from `RAIL_LEGS`; `standins.ts` drops the `gorge` and `bell` slots. `dev/look/bots/railway-legs.ts`
      (already driven by `RAIL_LEGS`): the barrier, the change of trains at the Gorge, the seeds, the ride home and the
      walk to the West landing; `dev/look/segments.ts` `RAIL_STOPS.bell` and `.bay`. Verify: `npm run loop -- node
      incline-1` and `-- node bay-2` print the bill, the train supply and the cue; `npm run loop -- run`; `npm run
      playthrough -- --from gorge-reached --to bay` (a pass verdict; its timings are not evidence under load).

### Steps 1 to 3 as built (18 November)

Builder, on the plan's three open questions' recommendations (bay cut after the incline; the West landing stand-in;
the kit rides ahead). No wire, op or save field changed. **Where the build moved from the plan:**

- **Step 1.** The two stops are a `stopCm` on the generator's halt spec and the `ns` start crossover a map turnback
  (s 80); regenerating moved the `ns` deck (its first vertex 3.62 m, the climb to 3.9 m now s 56 to 80, so the
  crossover stands on a 3.9% grade). The bay crossover's centre is s 1192.5 (t 35 from the kink): the tail of a train
  standing at s 1217 (16.1 m back) reaches 1.6 m into its far end; the sim's block rule is unaffected, step 4's view
  should look. Incline rack 1 is 6.8 m from frame 1 in a straight line; on foot is unproven (no Gorge artifact).
- **Step 2.** The kit roles are `MINT_LEGS` (the line whose trains mint a leg's kit at its home), `YARD_LEGS` (the line
  whose trains load it from a yard) and `legMintChain` (a mint line's legs in order, so the incline's kit loads once
  the stack is owed nothing: the kit ahead). The stand-in stocks a built leg whose line's first halt opens with its
  first section (`STOCKED_LEGS`). Also needed and not listed: the train load check's cargo bound (a section's bill on a
  leg line), conservation (`legsSpent` counts the yard and other lines' kit), the cart's hold kept to line 1, and the
  rack being any open leg's. The seeds landed in step 2's commit, since its tests build on them.
- **Step 3.** Four jump rows (`incline-open`, `bell-reached`, `bay-open`, `bay-reached`), tooling only and **with no
  `land`**: return-spot reads every jump land as a still-checked landing, matched by x and z alone, so a Bell Rock land
  would put someone returning to the upper bay halt on the lower deck. Lands wait for step 4's stills (and a height
  test in `src/place/return-spot.ts`).

**Measured** (Windows, 20 logical cores; the long fuzz ran five test processes at once, so no timing here is evidence):
the new lines' worst waits, four seeds at 75%, 20,000 ticks: settled (`bay-reached`) `ns` 1,023 and `bay` 1,075
(bound 1,350); growing, fed from `incline-open` through `bay-reached`, `ns` 1,201 and `bay` 1,467 (bound 1,600; the
one over 1,350 is Bay head 1 homeward). Leg 1's gates with the kit ahead, `ROUTE_GATES=1`: all pass at their v61
pins (gate 8/9 settled worst 1,340, gate 14 rivet to Gorge 3,919 of 3,996, gate 15 +1,820, every head-to-head under
1,158). `gorge-reached` comes 904 ticks sooner in the seed. Stage ticks: incline-open 16,871, incline-mid 17,172,
bell-reached 18,756, bay-mid 19,057, bay-reached 20,660.

**Between this ship and step 4** a room past `gorge-reached` runs `ns` and `bay` trains over track nobody draws, with
no frame, rack, barrier, head platform or seeds post in view. A return to a leg 2 halt does not land over the sea: its
landing has no jump `land` (unchecked), so the return search (`src/place/return-spot.ts`) probes for a surface within
8 m, finds none at a head, gives that halt up to 2.5 s of its 8 s budget and goes on to the next open halt, or Home.
**Production prebuilds every `JUMPS` row** (`OFFERED_STAGES`, `server/src/seeds/prebuild.ts`), so `POST /jump`
reaches `incline-open`, `bell-reached`, `bay-open` and `bay-reached` straight after deploy, landing at the usual spawn
(they have no `land`). That is the plan's order (steps 1 to 3 as one bump, views after); worth knowing before a
playtest.

**Review fixes (18 November).** The independent review found the rack's need blind to units lifted off it and still
held (`legRackNeed`): every lift off the West landing's first rack restocked it at once (P2, minting), and at High
Gorge a line 2 train racked section 2's kit while section 1's was carried, skipping the `ns` relay (P3).
`legRackNeed` now counts held units (as `legKitNeed` does), for every leg. **And the stand-in mints its section's kit
once** (its loaded counts never pass the bill; the load check refuses one that does): a unit put down at the West
landing is taken up again from its pile, not minted again. No hash golden moved (the seeds hold nothing across a tick
boundary where it matters) and the leg 2 fuzz figures are unchanged.

**Re-check fix (18 November, P1).** Rails cannot be made up by hand at this stage: `rail.forgeTake` gives none once
the cradle is fitted, and a room that played in order has the steel works lit with its yard empty. So a rail the
stand-in loaded that leaves the leg's books is owed again, and only then: a leaver's rails released after the grace
(`legKitRelease`), and put-down rails the supply pulse returns to the forge rack (`legKitRecovered`, at most what the
stand-in has lost: loaded less racked, held and fed) come off `Leg.loadedRails`, and the stand-in stocks them again
from the forge rack, exactly as many. Loaded still never passes the bill, so the load check's bound stands as it was;
no state was added (the same accounting `kitHome` uses when rails go back to the forge rack). Logs need none of it: a
leaver's are made up by chopping, and recovered logs go to the recovery rack, which anyone takes from. So "a unit
lifted off a rack and lost is owed again" holds for the stand-in too, bounded by what was lost rather than by a train's
rate; leg 1's and the incline's racks are unchanged. Again no hash golden moved, and the leg 2 fuzz is unchanged.

**Second re-check fix (18 November): closing the class.** A third way in: units put down and taken up again from
their pile were no longer counted held, so a leaver carrying them off was never released and section 1 stayed short.
And a release could take more off the stand-in's loaded rails than it had (the shelf may hold the incline's leftovers),
driving them negative. Now, still with no new state:

- **Taken up again, counted again.** While the stand-in stands (open, nothing laid), `rail.take` from a pile counts
  logs and rails as held again (`legKitRetaken`), capped at what the stand-in has lost (`legStandInLost`: loaded less
  racked, counted held and fed) and the held room. The release then sees them.
- **No release past what was lost.** A release takes `Math.min(rails, lost)` off the loaded rails, never more.
- **The liveness backstop.** At a supply pulse that opens a new minute (the host sends one a minute while the room
  plays), a stand-in whose section is short (fed, racked and counted held), with units it has lost and no pile of
  that kind within 30 m of its rack, is made whole: lost rails come off its loaded count and the stand-in stocks them
  again from the forge rack on the next tick (rails stay conserved, loaded rails never pass the bill); lost logs are
  minted onto its rack. It is the floor under every other path, at most once a minute, which bounds how fast logs can
  be minted by losing them. A unit put down near the rack holds it off: take it up again. The delay is the pulse's
  minute rather than a measured wait since the shortfall began: that needs a timer the state does not have, and the
  pulse already bounds the rate.
- **The load check** keeps its over-bill bound for rails only (`stand-in over its bill`); logs are rate-bounded
  instead.
- **A property test** (`test/railway-leg2-standin.test.ts`), from `bay-open` with the steel works lit: seeded random
  histories of take, put down (near or 120 m off), take up again, feed, leave (for good, or back within a 1,200-tick
  grace) and host restart, with the host's real supply cadence (one pulse a minute, the marker one on, a pile offered
  for recovery only once due: recheck3's P3, so put-down rails rarely come back the old way and the backstop makes them
  up). Then whoever is in the room feeds section 1 with the rack and the piles near it. **300 seeds ran locally:
  section 1 laid in every one, the slowest 1,215 ticks after the room settled (bound 3,600)**, the load check holding
  and loaded rails never negative at every step. With the backstop switched off it fails within the first 8 seeds, as
  does recheck3's guard test. The suite runs 8 (`STANDIN_SEEDS` for more): about 30 s locally (23 s of it the base
  build), weighed at 100 s for CI in `dev/ci/unit-weights.json`; at 24 seeds and the old pulse model it passed 480 s
  on a CI runner and failed the whole-file budget (PR #2264, unit shard 8).

No hash golden moved; the leg 2 long fuzz is unchanged in every figure.

**Checkpoint B (leg 2 playable).** Named proofs, run once: `npm run loop -- run` for one to three players with idle
seconds per wait; the bot segment `--from gorge-reached --to bay`; `npm run test:net`; `npm run scenario --
reconnect-edit` at `--rail-seed incline-mid` (a second tab joins; the first leaves carrying a rail and rejoins after a
server restart; `Leg`, `LegYard` and the kit aboard unchanged: `LegYard`'s first rejoin proof, greybox-route section 6);
step 4's stills on one sheet; one frame-time reading at Bell Rock on the Mac (reported, not a gate); `npm run perf`
(two decks of 1.1 and 1.2 km, two heads, four trains). The independent review covers steps 1 to 3 as one batch.

### Step 4 as built (19 November)

Builder, all six parts of the step, in its order: track and trains, the bore, frames, racks, platforms and boards,
halts, adapters, docs. No rule, wire, op or save field changed; nothing under `src/sim`, `src/world`, `src/net` or
`server/` was edited. Stills: [`greybox-leg2/`](greybox-leg2/).

- **The views of one leg are one spec** (`route-greybox/leg-view.ts` `LegSpec`): the stack leg keeps its numbers
  (line 2's path); the incline and the bay cut are lines of their own, drawn on their catalog rows smoothed
  (`railway/row-path.ts`, as `line2-path.ts` reads the `ring` row) with the outward track 2 m right of the row and the
  homeward 2 m left. Deck colliders merge 10 m lengths that run straight and level (17 slabs for the incline's 1.17 km).
  Trains on the two lines are posed and ridden on the same paths; they stand at a line's start on its outward track,
  so a homeward train takes the start's crossover on its way in (the server judges a departure's lever from the
  start's outward platform). Kit marks and the kit's hop are per line: line 2 sets the incline's kit on its first rack
  (9 m over line 2's up track) and the rest on an unlabelled pile beside it, High Gorge's yard.
- **The bore** is 8 m clear between 1 m black walls, its roof 11 m (at least 7 m over the rail, which climbs from
  about 3.2 m at the split's mouth to 4.0 m), lined in strips that meet the stack's faces, with a pale frame at each
  mouth. Its floor across the deck's width is an unlaid bed 0.15 m under the rail (review fix, below). The south stack's hidden collider keeps its slab over
  the bore at its index and is split round the bore in `leg2.ts`, authored to 0.1 m and checked against the stack's
  outline at build. **Moved from the plan:** the horizon mesh (`sickle-backdrop/view.ts`) is double-sided, so it is
  opened at both mouths; otherwise a rider sees the cliff's back across each mouth. The old dark portal panel is the
  near mouth's lintel.
- **Moved from the plan:** each head of the two lines has a platform each side (the homeward lever's, right-hand
  running). Levers stand within `rail.call`'s 12.6 m reach of their platform points: **three of the level's reserved
  lever ends** (High Gorge t 16 to 19, the West landing s 0 to 5, Bell Rock's lower level n -28 to -25) are 17 to 27 m
  from their stops, which moved since; Bell Rock's upper one (the bay line's) is used. The departure boards are the
  leg view's (it owns the route's signs), on each built halt's outward platform.
- **Bell Rock's stalls** are 0.9 m counters on the track side of their pads (a taller box hid the pad's sign); each pad
  then reads "Connected (placeholder)" through a label registry the mounted area fills (`route-greybox/state.ts`).
  Stalls, barriers and the seeds post are drawn only. A standing piece (buffers, a head's platform) holds its collider
  until your body is out of it, by the shared site clearance; a view may not move a player (no `teleport`).
- **The adapters needed no change:** `rail.grant` and `rail.gate` already take the seeds and the Canopy barrier by
  index. The prompts are the leg view's, as the pick's; the objective texts go to the play record.
- **Main could not boot from #2270 to #2274/#2276:** `island-boards.ts` and `train-view.ts` indexed two-entry tables
  by the new lines' trains. The boards' guard stays (the halt map is line 2's); the trains' is replaced by the pose.

**Verify, each still opened** (`.look/`, curated in [`greybox-leg2/`](greybox-leg2/)): from partway up the stair
(the foot is screened by line 2's train standing at High Gorge), the red barrier on incline frame 1 with its plate,
section 1's bill, rack 1's "KIT 1" and the yard's pile, and the bore's framed mouth; from an `ns` train, homeward,
the dark bore with the crossover and the split opening ahead, and outward, the far mouth opening on the sea; head 1's
platform, lever, board and sea ramp from the train; Bell Rock's lower deck: the teal seeds post, the two stall
counters, the departure board "High Gorge / Incline head 1 / Bell Rock", the lever and a pad reading "Connected";
the Canopy barrier, shut, from the ramp's head; the West landing unstaked from the cliff's brow over the commons, the
bay cut's frame and bill on the apron and its stocked rack; a `bay` train at Bell Rock's upper in-half platform, by
the buffers at the kink. Riding: Buddy stayed aboard an `ns` train from Bell Rock home through the bore and out again.

**Counts** (`dev/look/evals/leg2-counts.ts`, `bay-reached`, one frame each; trains move, so draws vary with what is
in view; main is `c2187130d`): High Gorge 266 draws and 674,904 triangles on main, 172 and 399,236 here; Bell Rock 257
and 421,448, here 372 and 474,846; the West landing 491 and 1,000,019, here 496 and 1,026,737; head 1 facing Bell Rock
177 and 370,875, here 670 and 1,178,947 (the two lines' four trains, drawn now, parked under the land on main). Static
colliders 2,890 to 2,945 on main, 2,983 to 3,069 here; High Gorge's massing 55 to 91 solids (the bore). With Bell
Rock resident: 1,110 meshes and 3,001 colliders (its 75 boxes, 21 solids); from head 1, Bell Rock not resident: 1,133
meshes and 2,983 colliders. No frame time: the machine was shared, so none would be evidence. Measured before the
review's beds, which add 22 solids at High Gorge (113) and 2 at Bell Rock (77 boxes, 23 solids), in the same batches.

**Fixtures moved:** `prefab-gorge-colliders.json` and `prefab-gorge-placements.json` (the bore's pieces and bed; the
incline's post supports renumbered after them), `prefab-bell-colliders.json` and `prefab-bell-placements.json` (the
bay's two bed pieces on the rock), `prefab-halts.json` (the eight new levers' meshes and plaques, additive); the halt
test counts 28 levers and the portability test 72 Bell Rock placements. Each regenerated with `GOLDEN=1`.

**Review fixes (19 November).** The independent review's P2: a lay made the incline's deck solid over the bore's open
floor, 0.4 to 1.1 m under the slab, closing it over a body standing there. The bore's floor across the deck's width is
now an unlaid bed (as Bell Rock's and the West landing's are), 0.15 m under the rail and solid down to the floor's
level, so a lay only lifts a body; the same was true where the bay row climbs onto Bell Rock's rock east of its
in-half bed, which now carries on there to t 94. `test/prefab-leg2-level.test.ts` (the review's test, rewritten to the
property) checks both new lines' whole rows: the highest level surface under every metre of deck sits within a body
sphere's radius under the rail or leaves a whole body under the slab. P3s: line 2's unload at High Gorge goes all to
the yard once the incline's rack has moved to its head (it took whatever that rack gained in the frame); the `ns` and
`bay` kit cars carry a kit board; a standing piece's hold measures the body against the pitched box (a sea ramp's
slip). The barrier still is retaken: the unlaid bed now shows inside the bore's mouth. **Unverified:** the bot and the loop (step 5); a lever
pull answered on the new lines in a live room; a second player; the kit's hop and the yard pile in motion; the
level report's walk over the new head platforms. Not tested on a device.

### Left out

The halt map and Home's displays drawing the new lines (4b's map work, per line); Bell Rock's market board and network
buys; seeds terraces and any crystal mechanic; the Canopy barrier opening (leg 3); towns, riders and fares on the new
lines; the real West landing station (start-area S6). Each is a later plan's.

## The world bump

Needed: four new train rows, the `ns` and `bay` halts reindexed and three stops moved. One bump, in step 2's commit,
covering steps 1 to 3. **The next free number is v62, and stack-west-platforms wants it too. They can share it only if
both are review-clean in the same batch**; neither waits for the other ("Nothing waits on a world bump"; greybox-route,
"combine where timing allows"). The owner gave stack-west its own reset on 18 November ("All three heads, with the v62
reset", [entry](../decisions-rail.md#d-2026-11-18-decisions-page-rail)), and it is S and planned in full, so it will
almost surely take v62 alone; this leg then takes the next free number (v63) at its ship. If they do share, they touch the same block of
`railway-lines.ts` (`STACK_HALTS`'s homeward platform points against this plan's new rows below it): rebase stack-west
first, regenerate fixtures once. Each ships outside the owner's sessions (`npm run heartbeat` first).

## Level findings

`npm run level-check` ran on 18 November (main `e8ae03b0f`): **21 reports, none new; "route leg 2 (planned): ok"**.
Its leg 2 lines, with the planned points above read against them:

1. **The seeds post is reached early, and refuses** (route contract). From the lower west platform on foot and by a
   swimmer from three sides of the cut via the slipway, the seeds spot is reached today ("ok a swimmer in the sea …:
   the slipway's foot, the lower west platform, the lower deck (the seeds spot)"). Before the incline is laid
   `rail.grant` refuses and the prompt says why. Nothing else at Bell Rock takes anything early.
2. **The Canopy barrier's spot is reached on foot from the lower level** (the Canopy pad and the ramp's head are), so
   the shut barrier is seen from the ramp's head on the way up. Reserve clear of every leg 2 box.
3. **The West landing.** The flood walks the landing to the commons and back; the platforms come back with
   `WEST_STAKED = false`, and the shore path's walk (`dev/look/evals/leg2-west-walk.ts`) is re-run then. The apron
   reserve (s 4 to 16, lat 7.8 to 11.8) holds frame 1 and rack 1, 6 m apart (Q7's "last carry under 15 m").
4. **The Gorge is not proven by the flood.** `content/built/levels/gorge.json` has no placements (the Gorge's massing
   is built in code), so the report checks only its reserves: the `ns` row and both lever ends clear. Frame 1 at t 24
   is outside the lever end (t 16 to 19) and 43 m short of the mouth. **Unproven:** rack 1's walk to frame 1 (target
   under 15 m) and line 2's car-to-rack hop (target under 9 m): step 1 states the measurement, step 4's still shows
   it.
5. **Frames stay out of the bore** (Ruling 1): incline frame 1 at s 24, frame 2 at s 588; the bore is s 67 to 232.
6. **Heads stand over the sea** (incline head 1 near (-10, -1418), bay head 1 near (426, -470)). Each gets a sea ramp,
   so a swimmer is never stranded and a body that falls off a head climbs out there, as on leg 1's heads.
7. **The track report's `bay-centre s 1227 … 52.2° kink`** stays "planned, would fail": no leg 2 train crosses it
   (the stop moves to s 1217 and the buffers stand at the kink). Leg 3's plan eases it. The `cave` kinks are leg 4's.
8. **Gliding** from the Gorge's rim (85 m) toward head 1 (560 m out) or Bell Rock (1.1 km) is not measured. Whatever
   it reaches, it reaches a rack, a post or a frame that takes nothing early: movement skips distance, not work.

## Risks

- **Room safety.** Every new transfer is in a system inside the tick's apply; no effect in apply (the hop and the
  stocking's crates play from the mirrored change in the adapter); no `Math.random` or wall clock. A leaver's lifted
  units release by the existing check (`rackLeg` generalized, not duplicated). A new shared sim file is listed for the
  server image.
- **Mixed builds.** Dev phase: no compatibility code; the reindex and the train rows are a break, so the bump with its
  dated line. Golden shards and fixtures regenerated in the same commit.
- **Hot files.** `railway-lines.ts` (stack-west-platforms), `railway-server.ts` (garage step 4, after this),
  `railway-queries-route.ts` and `railway-sys-route-kit.ts` (both this plan's; one owner at a time).
- **The kit ahead changes leg 1's timing**, which the owner accepted and the gates pin at v61. It is re-measured, never
  loosened past what is measured; a gate that breaks goes to the owner with choices, as the re-route's did on 18
  November.
- **Lockstep.** Integer cm and ticks only; `simHalt` and the points are computed at load from catalog integers.
- **Performance.** Two lines' decks and rails (about 2.4 km), two head platforms, four trains, the bore's lining.
  Reported by `npm run perf` and the look harness's counts; not a reason to cut anything without the owner's word.

## Open questions

None of these waits: each proceeds on its recommendation and adds no scope.

1. **Should the bay cut open together with the incline** (garage-choices reads stage 4 as "two new lines open
   together"), or after it, as the catalog has it? **Recommended: after (as planned).** One rack serves one open leg,
   the long ride home is the inconvenience the shortcut repays, and a pair can still split at Bell Rock. Together needs
   a second rack (new state) and splits a solo player between two ends of the map.
2. **Is the bay cut's first kit appearing on the West landing's rack, with no train bringing it, acceptable as a
   stand-in** until the brainstorm on how goods cross Home? **Recommended: yes**, marked as a stand-in; the
   alternative is carrying 40 units by hand from the Village (about 140 m, three trips solo with the pack), the grind the greybox
   removed footings to avoid.
3. **Should a leg's kit start riding before the leg opens** (the incline's kits aboard line 2 while the stack's last
   section is fed), so nobody stands at the Gorge for a lap after the pick? **Recommended: yes.** It changes line 2's
   loads near the end of leg 1; the gates are re-measured at the bump.

**Suspect lines of The Boogler's:** none written, changed or read as suspect.

## Design review (2026-11-18)

The planner's own review, in the same sitting (owner call "Fold roles into the builder", 16 November). **Read:**
DESIGN.md; owner-calls' index; the rail, core-loop and rewards Current rules with the entries cited below; the
14 November owner session in docs/playtests.md (the last thing he did was press "Open the barrier" five times against
"No line beyond yet"); the research above; the leg 2 level report; `npm run loop -- node bell`. **Seen:** the
catalog's numbers, the level report, the code each call depends on. **Not seen:** any still. Nothing new is built; the
massing's stills are the archived plan's. The Gorge's planned rack and frame, the bore and the heads are judged from
numbers only, which is why step 4's stills carry them.

**Flow, beat to beat** (the beats table above; progression-flow-layout's three firm rules):

- *The next goal can be found.* Beats 1 to 6 are in view of each other: the barrier is on the platform the pick's
  stair comes down to; the bore's mouth faces it; each head's rack is beside the train that stops there; the seeds post
  is on the deck the train stops at. **Beat 7 is not:** the bay cut opens 2 km away at Home and nothing at Bell Rock
  says so (finding 1).
- *A gate keeps its meaning.* The barrier takes the pick at the only frame the incline has; a swimmer reaches the seeds
  post early and it refuses; a glider skips water, never a bill.
- *Nobody is stranded.* Every head has a sea ramp; Bell Rock has the slipway and, once laid, the `ns` train; a body at
  head 1 when section 2 lays rides on (call 88's ask); keys are the room's, so a leaver loses nothing.
- *Lenses.* "A world that shortens behind you": the 6 to 7 minute ride home at beat 7 breaks it on purpose, the
  exception that works (the shortcut is what repays it; upgrade-economy rec 2). "The key in sight of the lock": the
  seeds post and the Canopy barrier are 12 s apart by the ramp. "A place to meet": Bell Rock, both levels.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The Gorge's `ns` stop at s 36 | Decided | Call 118, confirmed ([16 November](../decisions-rail.md#d-2026-11-16-batch2-bulk-confirmed)) |
| 2 | The incline bored through the south stack, s 67 to 232; frames outside it | Decided | Call 116, confirmed (same entry) |
| 3 | 20 logs + 20 rails a section; about 30 s to lay | Decided | [16 November](../decisions-rail.md#d-2026-11-16-batch2-greybox-section-length-and-lay-time) |
| 4 | Stall boxes rise by ruling 2's fixed table, on the level of their line | Decided | Owner, [12 November](../decisions-rewards.md#d-2026-11-12-cargo-trains-and-hub-towns-answered) |
| 5 | The West landing unstakes in the build that starts the bay cut | Decided | [15 November](../decisions-rail.md#d-2026-11-15-west-landing-staked-until-bell-rock) |
| 6 | Trains stop on request; a lever at each platform side | Decided | [10 November](../decisions-rail.md#d-2026-11-10-trains-stop-on-request-at-the) |
| 7 | Waits: at most 1,350 settled and 1,600 growing ticks on the greybox lines | Decided | [16 November](../decisions-rail.md#d-2026-11-16-batch2-waits-use-owner-limits) |
| 7a | Right-hand running on both new lines; each lever on its own direction's platform | Decided | Owner, [18 November](../decisions-rail.md#d-2026-11-18-decisions-page-rail) |
| 8 | **The bay cut opens after the incline is laid, not with it** | **New** | Keep the catalog's order: one rack, the shortcut repays the ride. Open question 1 |
| 9 | **The bay cut's first kit is stocked at the West landing with no train** | **New** | A stand-in until Home's seam is brainstormed; bends 11. Open question 2 |
| 10 | **A leg's kit rides ahead of the leg, once the leg before has loaded all its own** | **New** | Removes a lap's stand at the Gorge; moves leg 1's late loads. Open question 3 |
| 11 | The incline's barrier takes the pick and stands at its first frame (moved from behind the south platform) | Default | greybox-route's pickups table; the frame is where it reads as a gate |
| 12 | The seeds at Bell Rock's lower deck, taken once the incline is laid; the bay cut does not need them | Default | The massing's reserved spot; frees the co-op split at beat 7 |
| 13 | The `ns` start crossover inside the bore, s 70 to 90 | Default | Keeps both tracks at both platforms; a stub would leave a 2.3 m gap to each edge |
| 14 | Bell Rock's `bay` stop 10 m back onto the in half; buffers at the kink; the `ns` end a crossover before the platforms, buffers 15 m past | Default | No train stands across a 52° kink; leg 3 eases it |
| 15 | The incline's kit relays line 2 → the Gorge rack and yard → `ns` trains → head 1 | Default | The catalog's yard (G1); kit, not town freight |
| 16 | Fleets 0, 1, 2 on each new line by sections laid | Default | The ladder's "a train per extension" ([15 November](../decisions-rail.md#d-2026-11-15-train-progression)); the owner's "too many trains" (14 November) |
| 17 | Every running train on a new line may carry kit | Default | Call 65's spare car is for line 2's steel only |
| 18 | New lines at 20 m/s; engine, players' car and kit car; no coach | Default | The catalog's speed; no riders without towns |
| 19 | Section 1's frame and rack at the Gorge (t 24 on incline-s; the rack abreast of line 2's kit car) and on the West landing's apron; later sections on leg 1's formula | Default | Q7's last carry under 15 m; the massing's reserves |
| 20 | Head 1 stays a request stop both ways once passed | Default | As the stack's third head; nothing to close it behind on a two-section leg |
| 21 | The Canopy barrier stands shut on Bell Rock's upper deck from leg 2, refusing "No line beyond yet" | Default | DESIGN 7; the barrier the owner pressed at the Gorge did the same |
| 22 | A board at Bell Rock's upper platform: "LINE TO HOME (WEST LANDING) / BUILT FROM HOME" | Default | Finding 1; placeholder copy |
| 23 | Prompts and objective texts ("Take the crystal seeds", "The incline isn't laid yet", five objectives); pads read "Connected (placeholder)" | Default | Placeholder copy, none The Boogler's |
| 24 | Plain departure boards on the new lines; the halt map stays line 2's | Default | 4b's map work per line is left out |
| 25 | The ride home at beat 7 (about 6 to 7 min) is accepted as the first loop's "before" | Default | Upgrade-economy rec 2; the checkpoint measures it |

**Counts:** 8 Decided, 15 Default, 3 New. **Suspect lines of The Boogler's:** none.

### Findings

1. **(changed step 4) The bay cut's start is not findable from Bell Rock.** At the incline's last lay the room stands
   at Bell Rock's lower deck and the next frame is at Home's West landing, 2 km away. The objective line says it, but
   the place does not; the 14 November session's "not knowing what came after the crossing's finale, or how Ring
   Island is supplied" is the same gap one leg earlier. Step 4 now stands a board at the end of the upper in-half
   platform, where the bay line will arrive, from the incline's last lay (call 22). The West landing's existing board
   already faces the commons.
2. **The first beat is the barrier he already met.** The owner's last press on 14 November was "Open the barrier",
   five times, refused. Step 2 is what makes that press work; step 4's still from the stair's foot must show the
   barrier at its new spot (frame 1) so a player returning to the old pad finds it. No change: the still is listed.
3. **Garage step 4's premise moves a little** (call 8). Its finding 1 assumed the incline and the cut "open together"
   at stage 4. Here they come one after the other, about 15 to 20 minutes apart solo, so G-d's two new parts arrive one
   at a time and the line chips appear in two steps. Said in [What garage step 4 waits for](#what-garage-step-4-waits-for);
   no change to this plan.
4. **The stand-in stock bends 11** (call 9): crates appear on a rack nobody brought. It is the one place in the leg.
   It is marked as a stand-in in the code; whether the rack also needs a plate saying so is left to step 4's still.
   Owner question 2.
5. **Unproven reach at the Gorge** (Level finding 4). The Gorge's massing is not a level artifact, so no flood covers
   the rack-to-frame walk or the hop. A reach claim with no proof is a finding: step 1 states the measurement, step 4's
   still shows it. No other change.
6. **Co-op and solo.** Solo works end to end on the room's keys. A pair splits at beat 7 (call 12); three players can
   feed a frame in one trip each. A friend joining mid-leg starts at Home's Village and finds the West landing's board
   on the way; at `incline-mid` they ride line 2 to the Gorge (about 3 minutes) to help. Nothing changes.

### Owner questions

The plan's three [open questions](#open-questions), each recommended; none holds a step.
