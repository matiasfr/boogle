> **25 November 2026.** Steps 1–3 implemented together on the v70 build branch. The views and playable route are steps 4–6.
> Planner, against main `56138efa6` (world v67: leg 3 playable,
> Checkpoint C passed, #2362; garage step 4's rules, v67), rebased onto `cbaaf2825` (the clearance helper and garage
> step 4's bot on main). Leg 4 is next in [greybox-route](greybox-route.md)'s order (section 3, row 4; section 6).
> Steps 1 to 3 ship together as the leg's bump; 4, 5 and 6 after it, in order ([order](#order-and-what-waits)). Design review [near the end](#design-review-2026-11-24); [open
> questions](#open-questions) last. Nothing here waits for the owner.

# Greybox leg 4: the cave line, West landing to Port Quay, playable

**Where this sits.** Leg 4 of [greybox-route](greybox-route.md) (section 3, row 4; area 7, "Sea cave, Saltpan, Port
Quay"): a new sim line on the catalog's `cave` row from Home's West landing through the Saltpan to Port Quay, 1.20 km,
behind the sea-cave plug at the West landing, which takes the powered pick. A file of its own in legs 2 and 3's shape
(catalog, rules and the bump, seeds, views, bot and loop, one checkpoint). The route plan's binding owner direction
holds: every step is a mechanism or a system on blockout geometry; every label is a placeholder and is marked as one.
**Breaking the plug, salt sliding and the crane lift to High Port each need their own brainstorm; this plan uses the
route plan's stand-ins for them and decides nothing about them.**

**Goal.** From the West landing a room opens the plug barrier with the pick it has held since High Gorge, builds the
cave line past the sandstone face, over the strait to the Saltpan and along the breakwater to Port Quay, and rides home
on one line, all on a real server line in greybox; the leg ends at Port Quay facing the White Wall's line, which grows
on from there (leg 5). Serves DESIGN.md's core loop ("the rail builds the world"), **7. Telegraph everything** (the
plug and the covered stretch stand at the West landing from day one; Port Quay's stall rises at Bell Rock) and **8.
Enjoyable alone and together** (the closest railhead to Home yet: a friend who joins at the Village walks to the frame).
It bends nothing.

**Read for this.** AGENTS.md; `npm run map -- --kind docs` (no `plan` kind exists; its read-if-relevant design rows
apply); DESIGN.md and context's design-work rules; owner-calls' index; greybox-route sections 1 to 6, the design review
of 11 November (ruling 2, "Order", "Flow") and of 12 November (ruling 1: the cave's cuts); greybox-leg2 and greybox-leg3
in full, with their as-built notes; garage-choices section 5 (Port Quay) and step 5's row; garage-step4 (the trade
lines, Strong's window); shared-pool step 2; campaign-outline "Towns at the hubs"; the rail and rewards Current rules
with the entries cited below; docs/agents/orchestrator-state.md, "Rules learned" 1, 14, 15, 23, 36, 41, 42, 49, 52, 53,
55, 60, 61, 63, 67 and 70. Code on main: `src/sim/railway-route.ts` (`SPECS`, `simHalt`, `FIRST_SITE`, `RAIL_GATES`,
`legFrame`, `legRack`, `TRADE_LINES`), `railway-lines.ts` (`rowLine`, `appendLeg`, `legPlatforms`, the load checks,
`RAIL_TRAINS`), `railway-queries-route.ts` (`MINT_LEGS`, `STOCKED_LEGS`, `legKitStop`), `railway-sys-route.ts`
(`gate`), `railway-sys-route-kit.ts` (`legKitStock`, `legKitLoad`), `railway-seed-legs.ts`, the generated
`railway-world-lines.ts`, `src/content/levels/leg2.ts` (`west()`) and `leg3.ts`, `src/entities/route-greybox/`
(`index.ts`, `leg-view.ts`), `src/world/railway-jump.ts`, `src/world/namespace.ts`,
`dev/level/world-blockout.ts` (`SERVICES`, `curves`, `ROUTES.seacave`), `dev/level/route-leg2.ts` and `route-leg3.ts`,
`dev/loop/graph.ts`, `dev/loop/standins.ts`, `dev/loop/run.ts`, `dev/look/bots/railway-legs.ts`,
`dev/look/segments.ts`, `dev/look/perf.ts` (`PLACES`), `dev/peer-test/ws-railway.ts` (`railwayLegRejoin`);
`docs/world/map-prototypes.html` (`seacave`, `salt-quay`, `salt-land`, `port-isle`, `port-top`, the `cave` gate);
`src/place/clearance.ts` and `src/prefab/instantiate.ts` (`liftOrWait`). Pattern followed: leg 3, steps 1 to 7.

**Research.** [route-contract](../research/route-contract.md) (travel edges never supply work): used; the Saltpan and
Port Quay are reachable early by swimming, and every post there refuses ([Level findings](#level-findings), 8).
[level-design](../research/level-design.md) rec 3 (big shapes to steer by): used; High Port's 55 m top over the quay
and the sandstone face with its hood are what you steer by. [progression-flow-layout](../research/progression-flow-layout.md):
its three firm rules are the review's flow check. [upgrade-economy](../research/upgrade-economy.md) rec 2 (an upgrade
repays an inconvenience already felt): read for the cave line's trade, which this plan leaves to the garage (call 26).
[next-destinations](../research/next-destinations.md) ("High Port asks how a line fits among existing places"): read;
nothing here decides High Port, which is massing.

**Port from Place.** Nothing is ported. No fit check is needed.

**The rail route as it stands** (`npm run loop -- node`, 24 November): `port` is a stand-in: "40 logs + 36 rails + 66
footings + 112 steel + 16 copper = 270 units; allowance 48 min; legs seacave 0.74 km, salt-quay 0.51 km = 1.25 km;
grants harbour crane, faster engine; requires cloth, pick". `wall` requires `port` and `seeds`. `cloth` is built
(leg 3's step 7) and requires `canopy-3`.

**In flight** (`npm run inflight` and the state file's job table, 24 November; rebased onto `cbaaf2825`):
- **Landed while this was planned:** the shared lift-or-wait helper (#2367 and before: `createLiftOrWait` in
  `src/place/clearance.ts`, bound with the engine's overlap query as `liftOrWait` in `src/prefab/instantiate.ts`;
  `route-greybox/clear.ts` is gone and `leg-view.ts`'s lay slabs use it), and garage step 4's bot
  (`dev/look/bots/railway-legs.ts`, `dev/loop/graph.ts`'s `rail.bring` lines). Steps 5 and 6 build on both.
- `claude/garage-step4-checkpoint` (heartbeat): a report, a plan note and dev tooling, no `src/`, `server/` or `test/`;
  nothing here shares a file with it.
- `claude/cliff-kit-step0` (live session): terrain clean-up's cliff kit generator; if it touches Home's cliff by the
  West landing, step 4 measures against it.
- `claude/forge-rack-move` (161 h old): `dev/level/rail-map.ts`, `dev/look/bots/railway.ts`, `docs/agent-calls.md`,
  `place.md`. Step 1 regenerates `rail-map.html` through `rail-map.ts` and step 5 edits `place.md`; both append, and
  whichever ships second rebases.

## What exists for leg 4 on main, and what does not

Read from the code at `56138efa6`, not from older plans:

| Piece | On main | Owed by this plan |
| --- | --- | --- |
| The catalog row | `cave` in `railway-world-lines.ts`: West landing s 20, Saltpan Halt s 740, Port Quay s 1250, Canopy Town s 3359, High Gorge s 5310; start crossover at s 55; deck 4 m, 3 m at the two halts | The Saltpan kink eased, Port Quay's stop moved (step 1) |
| The leg's catalog entry | `RAIL_LEGS[4]` `cave`: area 7, three sections of 20 + 20 cut at s 380, 740 and 1250 (360, 360, 510 m), section 1 shut by gate 2, `after: 3` (Canopy's leg), kit `home`, **not `built`** | Cuts re-made on the eased row, `built: true` (steps 1, 2) |
| The plug | `RAIL_GATES[2]` `plug`, "The sea-cave plug", needs `pick`, **at the West landing halt's centre point** (a placeholder: the cave track's own centre at s 20). `rail.gate` refuses it today: the leg is not built | Moved to frame 1 (step 1); its view and prompt (step 5) |
| The sim line | Line 4 (`ROW_LINE.cave`), `rowLine('cave')`: five catalog halts, every one `shut`, `trains: 0`, no fleet, no heads, no signals | Heads, fleet, ends (step 2) |
| Train rows | None for line 4. `RAIL_TRAINS` is 12 slots: line 1, line 2's first, then the shed rows (line 2 five, `ns` two, bay three) | Two shed rows, appended as slots 12 and 13 (step 2) |
| The `Leg` row | Spawned for every catalog leg since bump G1 (v32), `laid` 0 | Nothing |
| The West landing | `src/content/levels/leg2.ts` `west()`: the **bay** row's bed (s 0 to 60), platforms A (landward) and B (from s 2, cut back for the cave corridor), the end ramp, the apron with the bay cut's frame and rack, the board; a reserve for the `cave` row's first 80 m as wide as a bed ("cave row (0.0 to 80.0 m)", clear in the level check). Leg 2's "kit halt at Home" is the bay line's home halt; kit there draws on the same depot stock (logs minted, rails off the forge rack) | The cave line's platforms, its apron, frame 1 and rack 1, the hood (step 4) |
| Saltpan, Port Quay, High Port | No massing, no level, no area in `route-greybox/index.ts`; the horizon silhouette draws the islands | Two levels and areas (step 5) |
| Port Quay's stall at Bell Rock | Pad `bell.pad-quay` on the upper deck, labelled "Stall: Port Quay (placeholder)", reads "Not connected yet"; no row in `leg-view.ts`'s `STALLS` | One line (step 5) |
| The loop | `port` is a stand-in in `dev/loop/standins.ts` | Built nodes (step 6) |
| Bot, seeds, jump rows, perf view | None for leg 4 | Steps 3 and 6, the checkpoint |
| Trade | `TRADE_LINES = [ns, bay]`; the checker allows the cave line row 0 only | Nothing: left to the garage (call 26) |

## Design

### The beats, in play order (solo; arithmetic, not measured)

| # | Beat | Where | What gates it | About |
| --- | --- | --- | --- | --- |
| 0 | (Leg 3's end) The bay train home from Canopy stops at the West landing; the plug and the hood are in view across the root, as they have been since day one | West landing, bay platforms | | |
| 1 | Walk round the root to the cave apron and open the plug barrier at frame 1 | Cave apron, s 12 | `pick` held (since leg 1); leg 4 open (Canopy's leg laid) | 10 s walk, 5 s |
| 2 | Feed section 1 off rack 1, 6 m away: its kit is stocked there (no train runs on the cave line yet) | Cave apron | the barrier open | 30 s feed, 30 s lay |
| 3 | The first cave train joins at the West landing, loads section 2's kit, and carries you under the hood, past the face and out over the strait to head 1; feed section 2 | Head 1, s ~369, over the sea | section 1 laid | 0 to 40 s for the train, 35 s ride, 30 s feed, 30 s lay |
| 4 | Ride on to the Saltpan; feed section 3 at its platform | Saltpan Halt, s ~739, on the salt flats | section 2 laid; section 3's kit (a second train joins with this lay) | 35 s ride, 30 s feed, 30 s lay |
| 5 | Ride along the breakwater to Port Quay: the harbour apron, High Port's top over it, the board "LINE TO HIGH GORGE / LATER" at the buffers | Port Quay, s ~1222 | the leg laid | 40 s ride |
| 6 | Ride home on the same line to the West landing; Bell Rock's Port Quay stall has risen | Cave line | | about 80 s |

About 7 to 9 minutes solo with waits, then the ride home, against area 7's 48-minute stand-in allowance. The checkpoint
measures it. **Co-op:** at beat 2 three players feed section 1 in one trip each; at beat 3 one rides out with the kit
while another stays to meet a friend at the West landing, a short walk from the Village spawn. **Solo** works end to end
on the room's keys (the pick since leg 1).

### Sync kinds and authority

As legs 2 and 3, with nothing new in kind:

| Piece | Kind | Authority | Where |
| --- | --- | --- | --- |
| The cave line's heads, halts, ends, fleet and two train rows | Server (catalog + `Train` rows) | server | `railway-lines.ts`, `RAIL_TRAINS` |
| Leg 4's row, the plug barrier | Server (`Leg`, `Route`, on main since v32) | server | `railway-sys-route.ts` |
| Leg 4's kit (stocked at the West landing, then minted there and unloaded at each rack) | Server, atomic inside the tick's apply | server | `railway-sys-route-kit.ts`, `railway-queries-route.ts` |
| The cave platforms, apron and hood at the West landing; the Saltpan and Port Quay isles, High Port's top, decks, heads, frames, racks, the barrier, the stall, levers, boards | Local, from accepted state | each tab | `src/content/levels/`, `src/entities/route-greybox/`, `src/entities/railway/halts-view.ts` |

No client lead, no classic edit generator, no client state registration, no `src/world/rules/` file, no presence field.
Rule ticks: the room's (`rail.legTick`, the trains' step); saves: the room checkpoint's (every key exists: `Leg`,
`Route`, `Train`, `Line`). **Ops: none new**; `rail.legStock`, `rail.gate`, `rail.depotTake`, `rail.depotRailTake` and
`rail.call` already take any leg, gate, rack and halt by index. **No new play-record mark.** **Wire:** no new message
or field; the cave line's halt ids after the West landing change meaning (head 1 inserted; the Saltpan becomes a
head), covered by the bump. **Prediction:** `rail.legStock` predicted (decided 16 November); `rail.gate` waits for the
server. **Receipts:** as today; every refusal shows its reason.

### The catalog (step 1)

- **The Saltpan's kink is eased.** The cave row turns 48.9° at the Saltpan's vertex, world (550, 700), s 740.3, with
  the halt's stop on it ("planned, would fail" in the level check's track report, and "straight into a 6 m curve within
  10 m, no easing"). Leg 4's trains run through it once Port Quay opens. `dev/level/world-blockout.ts`: the cave service
  gains `curves: [{ near: [550, 700], radiusCm: 6000 }]`, Bell Rock's form and radius: one arc of 60 m, tangent points
  27.3 m either side, the line 5.9 m inside the old vertex, the row 3.4 m shorter from there on. Both neighbouring
  vertices lie inside the tangent points on straights, so the generator drops them. **No `stopCm` for the Saltpan:** its
  place's nearest point is the arc's middle (about s 738.6), where the generator already keeps the leg boundary.
- **Port Quay's stop moves 25 m back** from the row's 19.8° turn at world (120, 960), where the White Wall's hermite
  begins with 6 to 8 m chords (about 18 m radius): a train standing at today's s 1250 would have its nose 8.2 m into it.
  Canopy's rule: `stopCm` on the Port Quay halt spec is the turn's cm less 2,500 (about s 1221.8 on the eased row), with
  a comment naming the turn. The station deck (3 m) levels round the new stop as the generator does for any stop. The
  Wall's leg (`wall`, from this halt) starts from it; nothing of the Wall is built here.
- **Regenerate** (`node --import ./dev/sim/hooks.ts dev/level/world-blockout.ts`): `src/sim/railway-world-lines.ts`,
  `docs/world/world-blockout.html`, `docs/world/rail-map.html`. Every cm on the `cave` row past s 713 shifts about
  −3.4 m, so `WALL_ISLETS` in `railway-route.ts` (four literal cms) is recomputed from the row; its test (each within
  1 m of the islet's closest pass) holds them. `RAIL_PLACES`' Canopy and Gorge pairs stay within 40 m.
- **Three sections, the Saltpan as a head.** The catalog's cuts were halves of the West landing to the Saltpan, then on
  to the quay, with section 2 ending at the Saltpan's stop. A railhead's stop stands 10 m short of its section's end
  (`HEAD_BACK_CM`), so those cuts would put head 2 ten metres short of the catalog's Saltpan halt: two halts 10 m
  apart, and `appendLeg` (which assumes a leg runs from one catalog halt to the next) would duplicate Port Quay and drop
  the Saltpan from the sim line. So: **section 2 ends `HEAD_BACK_CM` past the Saltpan's stop**, and that head *is*
  Saltpan Halt. `HEAD_BACK_CM` moves from `railway-lines.ts` to `railway-route.ts` (exported; `railway-lines.ts` imports
  it, as it already imports the route catalog). Cuts: section 1 at the middle of the West landing to the Saltpan;
  section 2 at the Saltpan's stop + 10 m; section 3 at Port Quay's stop. Lengths about **359, 369 and 473 m** (1.20 km);
  bills 20 logs + 20 rails each (call 21 of the route review), lay 30 s.
- **Sim halt order.** With `cave` built the cave line is **[West landing, Cave head 1, Saltpan Halt, Port Quay, Canopy
  Town, High Gorge]**: leg 4's `railheadHalt` 1; the Wall's `railheadHalt` 4 (Canopy, untagged: not built). `simHalt`
  counts a built leg's inserted halts as its sections less one **less the catalog halts strictly inside the leg** (the
  Saltpan here; the Wall's Canopy later), so a section that ends at a catalog halt adds none.
- **Frame 1, rack 1 and the plug** (`FIRST_SITE.cave`): a new apron on the cave line's homeward side (the cliff foot,
  left going out), mirroring the bay cut's: rack 1 at `rowSide('cave', 600, -980, 90, LEG_SITE_REACH)`, about (810.2,
  16.9, 4.9) m; frame 1 at `rowSide('cave', 1200, -980, 90, LEG_SITE_REACH)`, about (809.7, 22.9, 4.9) m: 6 m apart, as
  the bay cut's are. The `plug` gate's `at` moves from the halt's centre to frame 1 (as legs 2 and 3 moved theirs to
  the frame). Frames and racks 2 and 3 take `legFrame`/`legRack`'s formula (8 m and 18 m short of each head, 4.8 m
  right going out): at head 1 about (651.2, 345.9) and (654.1, 336.3), 10.1 m apart; at the Saltpan on the arc,
  re-measured by the test.
- **Points** (world metres, before the arc; the test holds them within 1 m of `rowSide` on the eased row):

  | Point | Where | x, z, y (m) |
  | --- | --- | --- |
  | Rack 1 | cave s 6, 9.8 m left (the cliff side), 0.9 m up | 810.2, 16.9, 4.9 |
  | Frame 1 and the `plug` barrier | cave s 12, the same side | 809.7, 22.9, 4.9 |
  | The West landing's cave stop | s 20; platforms 5.8 m either side | 799.2, 29.9, 4.0 |
  | Head 1's stop | s ~369, over the sea | 656.6, 344.8, 4.0 |
  | Saltpan Halt | the arc's middle, about 5.9 m inside the old vertex | about 554, 696, 3.0 |
  | Port Quay | s ~1222, 14 m inside port-isle's outline | about 139, 940, 3.0 |
  | The map's cave mark | in the sandstone face, 24.5 m east of the row at s ~62 | 820, 72 (ground 7.5) |

- **Port Quay's stall** at Bell Rock: the market's fixed table has "Port Quay (salt): the cave line reaches the quay".
  It rises on `bell.pad-quay` at leg 4's last lay. A view; no catalog row.

### The rules (step 2)

- **When it opens.** Leg 4 opens when Canopy's leg is laid (`after: 3`, on main); its first frame takes nothing until
  the plug is open (`pick` held and the leg open). One leg is open at a time on the whole route, so the rack is still
  `Rail.depot` / `Rail.depotRails`, judged at leg 4's current rack.
- **`appendLeg` takes the cave row** (its row id widened from `'ns' | 'bay'`, and `legPlatforms` with it) and **a leg
  whose sections end at a catalog halt**: such a head takes the catalog halt's name and its platforms (`legPlatforms` at
  its stop), keeps the head's `leg` tag, end and signal, and the base halts after the leg's destination follow
  unduplicated. `RAIL_LINES[4]` becomes `appendLeg(rowLine('cave'), 'cave', 'Cave head', <Port Quay's crossover cm>,
  [0, 1, 2, 2])`. The load checks (heads in order at their section's end less `HEAD_BACK_CM`, the halt before the
  railhead at the leg's start, the destination) walk it unchanged in form.
- **Halts.** The West landing's cave halt opens with section 1 (the first leg's rule: the line has no track before);
  Cave head 1 opens with section 1 and **closes behind once Port Quay opens** (`closesAt`, the stack's rule: nothing
  there once passed, over the sea); Saltpan Halt opens with section 2 and **stays a request stop both ways** (the last
  head's rule; a place to get off on the flats); Port Quay opens with section 3. **Ends:** at the West landing the row's
  start crossover (s 55) and buffers at the root; a stub at each head while it is the line's end; at Port Quay a
  crossover 24.5 m before the stop (the bay cut's spacing at Bell Rock) and buffers 2 m short of the turn. Block
  signals at each section's end but the last. Right-hand running: `legPlatforms` for every halt.
- **The fleet:** `[0, 1, 2, 2]`, the bay cut's ladder (`[0, 1, 2]` over its 1.20 km) with one more stage: no train
  before the first lay, one after it, two from the Saltpan on. Two shed rows, appended after every existing slot (12,
  13), so no slot moves. `trainPlaces` checks every stage at load, as today. Normal 50-tick dwell.
- **Service health** ([23 November](../decisions-rail.md#d-2026-11-23-greybox-service-health)): the cave line is a
  multi-train greybox line from its second stage, so the general rule applies with no new code: trains balance the
  forward and rear gaps at both open ends up to one even-spacing headway, and at a middle halt only after a rider, a
  lever call or a cargo stop; a passing train keeps running; an assigned ask or a follower at the approach signal
  releases a hold; a terminal departure keeps its spacing under rider demand. The fuzz checks service for every live
  call, safe separation at every tick and a wait budget of two headways plus intermediate dwells; seed trains count
  at once, a train joining mid-run after half a cycle. There are no tick limits to tune.
- **The kit.** The cave leg is minted at its own line's home halt (the West landing; logs minted, rails off the forge
  rack, holding up to `TRAIN.kitWaitTicks` for rails as every leg does), so it joins `MINT_LEGS[4]`. Its first halt
  opens with section 1, so it joins `STOCKED_LEGS`: **section 1's kit is stocked on rack 1** from Home's stock (the bay
  cut's stand-in, leg 2's open question 2), as soon as the leg opens. Sections 2 and 3's kits ride cave trains, one kit
  a train, owed ahead by `kitLead` (all remaining). A unit lifted and lost is owed again, as on every leg.
- **The barrier.** `rail.gate plug` opens once `pick` is held and leg 4 is open. Before Canopy's leg is laid it
  refuses with the pick held (the rule on main); the view gives that refusal its own reason (call 20).
- **Trade.** The cave line is not a trade line: the checker keeps its row at 0, and no Strong train can run on it, so
  `legRailheadHold` never fires there. Nothing in this plan changes `TRADE_LINES` (call 26).
- **Invariants** (`railway-check-route.ts`): every built leg's heads open as a prefix of its sections; the fleet at
  each stage; conservation counts leg 4's kit stocked, aboard, racked, held and fed.

### Controls and copy

No new action, pad slot, key or touch button. Every press is Interact through existing prompts ("Open the barrier",
"Take logs", "Take rails", "Feed the frame", the lever). New placeholder copy (none The Boogler's):
- The plug's blocked reasons: "Needs the powered pick" (as built, before leg 1's pick), and, with the pick held before
  Canopy's line is laid, **"After the line to Canopy (placeholder)"** instead of "No line beyond yet".
- Objective texts: "Open the sea-cave plug at the West landing" (replaces leg 3's "Ride home: the next line isn't
  built yet" once the cloth is taken), "Build the cave line to Port Quay", and at Port Quay "Ride home: the next line
  isn't built yet".
- Boards: "LINE TO PORT QUAY / UNDER CONSTRUCTION" at each head while it is the end; "LINE TO HIGH GORGE / LATER" at
  Port Quay's buffers; "Sea cave (placeholder)" on the hood; the West landing's departure boards list the cave line's
  stops once it runs.

### The massing (steps 4 and 5)

Local, all of it, as legs 2 and 3's: static boxes and signs each tab builds, one instanced mesh an area with real bounds
(P3), resident by distance (P1), a level artifact the flood reads. **The stand-ins the route plan names, and nothing
more:** the cave is a covered stretch; the plug is a barrier on the first frame; the Saltpan is a halt; High Port's top
is massing with a plain ramp. No buildings, no folk, no crane, no salt to slide on.

- **The West landing's cave side (step 4, in `leg2.ts`'s `west()`).** The cave row leaves the bay row's root (801, 10)
  at 137° to it, south along the cliff foot. Its bed from s 0 to 60 (as the bay's). Its homeward platform, the cliff
  side, s 0 to 40 at 3.8 to 7.8 m left; its outward platform, the water side inside the V between the two rows, from s
  ~4 (clear of the bay's platform B, which was cut back to s 2 for this corridor) to 40; both on posts where the shelf
  falls under the sea. The apron s 4 to 16 at 7.8 to 11.8 m left on the cliff foot, holding rack 1 and frame 1. The
  walk from the bay platforms round the root to the apron, and from the apron to both cave platforms, proved by the
  flood. **The hood:** an open-ended grey box over the bed from s 45 to s 80 where the row passes the sandstone face
  nearest the map's cave mark: two walls 6.5 m off the row's centre and a roof slab 7 m over the rail, a sandstone tint,
  its sign "Sea cave (placeholder)". The row's start crossover (s 55, a 20 m turnout) runs under it. It stands from step
  4's ship for every room, with the plug barrier beside the apron from step 5: the lock seen on day one.
- **The Saltpan (step 5).** `salt-land`'s map outline (centre (550, 700), radii 170 × 110 m, top 3 m) as one walkable
  prism at 3 m, with a sand beach slope all round to the sea, so a swimmer climbs out anywhere. The row's bed on the
  flats; Saltpan Halt's two 40 m platforms as two 20 m chords each side of the 60 m arc (Bell Rock's upper platforms'
  form), 0.9 m over the ground with a step down each side.
- **Port Quay and High Port (step 5).** `port-isle`'s outline (centre (−190, 1080), 360 × 240 m, top 3 m) as a prism
  with beaches; a quay slab ("made ground") under both platforms out to the shore, since the platforms' first 4 m are
  past the outline; `port-top` (centre (−255, 1115), 285 × 190 m, top 55 m) as a prism standing on it, its east face
  about 110 m west of the platforms; one plain ramp from the apron to the top's edge at the Ring ramps' pitch (5.4 in
  10, about 100 m) with a parapet; nothing on the top. **Reserves**, kept clear and checked by the level report: Port
  Quay's Roundhouse (a 30 m radius on the apron, garage-choices section 5 and junction-stations' "r 30 m kept clear")
  and a hub stand-in town (30 × 30 m), both on the landward side within 60 m of the platforms.
- **Head 1** over the sea: its platforms from the leg view with a sea ramp, as every sea head's.
- **Bell Rock:** the Port Quay stall on `pad-quay` at the last lay (`STALLS['bell.pad-quay'] = 'cave'`).

### Solids near players

Anything that switches solids on where a player can be (each lay's deck slabs, a head's platforms, a frame, a rack)
**uses the shared lift-or-wait clearance: `liftOrWait` in `src/prefab/instantiate.ts`, the engine-bound form of
`createLiftOrWait` in `src/place/clearance.ts`** (on main; leg 3's lay slabs already use it): lift the body onto the solid when its feet
are within the helper's step of the top and the whole body fits there; otherwise every solid of the set that holds it
waits, neither solid nor drawn, until the body is clear of all of them. Never push sideways, never put a player where
there is no ground, never switch a solid off on contact. **Do not write another.** An area's mount stays an ordinary
static mount far from anyone (the Saltpan and Port Quay at their `coverNear` distance, Canopy's rule); a player put
into a solid by a jump or a return is the shared return check's (`src/place/pose.ts`). The West landing area is
resident for anyone at Home, so its new static pieces (step 4) arrive with a page load, not at run time: also the
return check's.

## Beside the garage and the shared pool

| Where they touch | What leg 4 does | What it leaves to them |
| --- | --- | --- |
| **The per-line Quick or Strong trade** (garage step 4, on main for `ns` and `bay` at v67) | The cave line runs standard trains only; the checker's cave row stays {0}; `TRADE_LINES` unchanged. The hold is generic (`kitBills(row)`), so nothing in leg 4 would need to change if the cave line became a trade line | Whether the cave line is a trade line, and when its trade opens (garage-choices' G-f, "the cave line (stage 6)": Quick or Strong), its chip, its bay and works copy (Home's stage 3a, bay 130°, "the cave line's works engine, the fourth fitted line"). garage-step4 notes that after leg 3, Strong holds nowhere on the built route: the cave line is where it could next. [Question 3](#open-questions) |
| **Port Quay's Roundhouse** (garage-choices section 5, step 5: five bays, standing and complete at arrival, built by Port Quay's station plan) | A clear reserve on the apron (r 30 m) within 60 m of the platforms; the halt is a greybox halt with levers and boards | The station plan: `ROTUNDA_PORT_QUAY`, its bays, the second install reach point, `rail.bring` at Port Quay, the faster engine |
| **The shared pool** (shared-pool step 2: Port Quay's post pays from Home's bay) | Nothing | The whole step, inside garage step 5 with the station. No post stands at Port Quay in leg 4 |
| **Hub towns** (12 November: Port Quay is a town) | A 30 × 30 m reserve | One stand-in towns plan for High Gorge, Canopy and Port Quay (leg 3's open question 5) |
| **The market** | Port Quay's stall rises at Bell Rock | Nothing is freighted to it (ruling 2, decided) |

## Steps

Each step leaves `node dev/ship-check.ts` green. **Steps 1 to 3 ship together as the leg's bump** (as leg 3's 1 to 5
did): the arc and Port Quay's stop are geometry the rules' cuts and the seeds' goldens read. Steps 4 and 5 ship after
it; step 6 after them (garage step 4’s bot, which it builds on, is on main, #2363). Model rows are `npm run models`' (24 November). Every review of steps 1 to 3
is an independent one before merge (src/sim, src/world): **gpt-6.2-astra medium** first, per the table.

- [x] **1. The catalog (M; HOTBOX; "High-risk implementation": Claude opus medium).** Files:
      `dev/level/world-blockout.ts` (the cave service's `curves`; Port Quay's `stopCm` with its comment), regenerated
      `src/sim/railway-world-lines.ts`, `docs/world/world-blockout.html`, `docs/world/rail-map.html` (through
      `dev/level/rail-map.ts`, only if its prose names a moved cm); `src/sim/railway-route.ts` (the cave spec's cuts as
      [above](#the-catalog-step-1), `HEAD_BACK_CM` exported here, `WALL_ISLETS` recomputed, `FIRST_SITE.cave`, the
      `plug` gate's point; `built: true` lands with step 2's line in one commit if the load checks need it); new
      `dev/level/route-leg4.ts` (the planned points as named marks with their distances stated: rack 1 to frame 1
      under 7 m; head 1's and the Saltpan's platforms on a level stretch; the Saltpan's stop inside `salt-land`'s
      outline; Port Quay's at least 10 m inside `port-isle`'s; the hood's span clear of the start crossover's loading
      gauge), registered in the level check as `route-leg3.ts` is. Verify: `test/railway-route.test.ts` (three
      sections, each under 900 m; the cuts recomputed from the row; section 2 ends `HEAD_BACK_CM` past the Saltpan's
      stop; heads' platforms on grade 0; points within 1 m; `WALL_ISLETS` within 1 m of each islet's closest pass);
      `test/world-lines.test.ts` (the arc's tangents and 60 m radius; no future span over 4%); `npm run level-check`
      (rule 49): the cave row's s 740 kink and its "no easing" line gone from "planned, would fail". From the West landing
      to Port Quay's buffers, no kink over 2° except the three corners in level finding 1 (23.8° at s 65.3, 12.4° at
      s 322.7 and 20.8° at s 1080.6, each within 0.5°). No radius under 40 m on that span, no new report.
- [x] **2. The rules and the bump (L; HOTBOX; "High-risk implementation": Claude opus medium, high for the fuzz).**
      Files: `src/sim/railway-route.ts` (`simHalt` as [above](#the-catalog-step-1)); `src/sim/railway-lines.ts`
      (`appendLeg` and `legPlatforms` for `cave` and for a section ending at a catalog halt; `RAIL_LINES[4]`; the two
      shed rows follow from the fleet); `src/sim/railway-check-route.ts` (the heads' prefix and fleet checks over the
      cave line); `src/world/namespace.ts` (the bump and a dated line, [below](#the-world-bump)); fixtures and golden
      shards regenerated in the same commit (rule 15). A new sim file, if any, goes in `server/Dockerfile`,
      `dev/server-build.ts` and `deploy-server.yml` (`test/server-image.test.ts`). Verify: new
      `test/railway-leg4-rules.test.ts`: the plug refuses `rail.gate` without the pick, refuses with the pick before
      Canopy's leg is laid, opens with both; `rail.legStock` refused at frame 1 while it is shut; rack 1 stocked once the
      leg opens and never over the bill; section 1 lays, the West landing and head 1 open, one train joins and carries
      section 2's kit to head 1's rack; the Saltpan opens with section 2 and stays a request stop both ways; head 1
      closes once Port Quay opens; the relay conserves every unit (stocked, aboard, racked, held, fed); the cave line's
      stops a prefix at every stage and its fleet by `[0, 1, 2, 2]`; the cave line's train rows only at row 0. **A host
      test (rule 23)** in `server/test/` (beside the route host cases) sends `rail.gate` for the plug as a real `r:edit`
      at frame 1 and sees it accepted, and refused from the West landing halt's old point (rule 1's moved reach point).
      **The service fuzz** (`test/helpers/railway-route-rules.ts`, a cave group in one of its shards): accepted lever
      calls at 75% headway on the cave line's three stages, settled and growing, standard fleet only (no row but 0
      exists on it), checking service for every live call, safe spacing at every tick and the two-headway budget, with
      save and restore; **its default run is timed on HOTBOX and kept under a quarter of the test's own budget (rule
      60)**; the long run (`ROUTE_GATES=1`: four seeds `c0ffee`, `777`, `5eed`, `badd`, 20,000 ticks a mode) behind the
      switch, its output pasted into this plan before the bump ships, with legs 2 and 3's long suites re-run beside it
      (they share only the forge rack; any change is reported, never loosened). `npm run loop -- run`. **Because the
      golden shards and sim lists change:** the whole server suite (`npm test` in `server/`, rule 52) and `npm run
      test:net` (rule 55), and **the boot probe on the built site (rule 61)**: `npx vite build`, `npx vite preview
      --port 4173 --strictPort`, then `node dev/live-boot.ts --offline --url http://localhost:4173/`, which must print
      PASS with no "page errors" line (on HOTBOX the scratch copy under `.look/` that launches with
      `channel: 'chromium'`).
- [x] **3. Seeds and stages (S; HOTBOX; "High-risk implementation": Claude opus medium).** Files:
      `src/sim/railway-seed-legs.ts` from `canopy-reached`, accepted ops only, each wrapped in `need` (rule 53):
      `cave-open` (the cloth taken, the plug open, rack 1 stocked, nothing fed), `cave-mid` (section 1 laid, section
      2's kit aboard a cave train), `port-reached` (the leg laid, a little running time). `SEED_STAGES` and its golden
      shard; `src/world/railway-jump.ts` rows (`cave-mid` lands on head 1's platform between rack 2 and frame 2, the leg
      view's, always up; `cave-open` and `port-reached` keep the spawn until step 5's stills, leg 3's reason).
      Verify: `test/railway-jump.test.ts`; each stage's invariant check; **the whole server suite and `npm run
      test:net`** (rule 55: both build rooms from the seeds).
- [x] **4. The West landing's cave side (S to M; HOTBOX; "Player-visible implementation": Claude opus medium).** Files:
      `src/content/levels/leg2.ts` (`west()`: the cave bed, both platforms, the apron, the hood and its sign, the
      reserves moved to the pieces), the level artifact rebuilt, `dev/level/route-leg2.ts` (the West landing's
      floods: bay platforms to the apron, the apron to both cave platforms, the commons to both; a swimmer in the V and
      off the hood climbs out). No new unit test file (rule 36): cases go in `test/prefab-leg2-level.test.ts`. The
      level's hand-kept lists (rule 41): the stub builder maps in `test/prefab-workshop.test.ts` (two),
      `test/prefab-gorge.test.ts`, `test/prefab-leg2.test.ts` and the record lists in `test/prefab-portability.test.ts`,
      where a new prefab joins; the hood stands on Home's terrain, so it is checked against every far-ground level
      (`LEVELS` in `src/place/far-ground.ts`). Verify: the full `node dev/ship-check.ts origin/main HEAD` (rule 41);
      `npm run level-check` (rule 49), the West landing's lines all "ok" (both rows' platforms, the apron, the reserves,
      the hood clear of the crossover's gauge); `.look/` stills: the West landing from the commons (the hood and the
      apron in view), the apron with frame 1 and rack 1 from the bay platforms, the hood from the cave platform's end.
      **As built.** The swimmer slipway meets the outward platform at s 40. The apron supports frame 1 and rack 1 at
      their catalog heights. Step 5 draws both. The Bell Rock board stands on the bay platform beyond its apron reserve.
      The cave sign stands on the approach platform, and the outer wall and roof overlap at the bend.
      All eight new foot and swim floods passed the full level check. The resident West landing has 47 boxes in one
      instanced batch, 16 bodies and two signs. It unloads at Bell Rock. The 2, 4 and 8 m terrain grids all stayed below
      the rail through the hood. The prefab check passed and the offline built site became interactive in 8.5 seconds.
      Stills from [the commons](greybox-leg4/west-commons.png), [the bay platform](greybox-leg4/west-apron.png) and
      [the cave platform](greybox-leg4/west-hood.png). Not tested on a device.
- [x] **5. The Saltpan, Port Quay and leg 4's views (M to L; HOTBOX; "Player-visible implementation": Claude opus
      medium).** Files: new `src/content/levels/leg4.ts` (levels `saltpan`
      and `quay`) and `src/content/prefabs/leg4-lands.ts` (the three map outlines, collision only, baked as leg 3's are);
      `content/built/levels/saltpan.json`, `quay.json`; new `src/entities/route-greybox/massing-saltpan.ts` and
      `massing-quay.ts`, registered in `index.ts`'s `AREAS` with their `coverNear` distances; `dev/level/route-leg4.ts`
      gains the floods and the bake; `leg-view.ts`: the cave leg as a row leg (deck, rails and sea bents from `laid`;
      none on the two isles or under the West landing's bed; frames with bill and plate, racks, head 1's platform with
      a sea ramp, block signal posts, the end boards, buffers 2 m short of Port Quay's turn), the plug barrier at frame
      1 with its blocked reasons, `STALLS['bell.pad-quay'] = 'cave'`, `LEG_OBJECTIVES`' new lines; every solid that
      switches on near a player through `liftOrWait` (do not write another); `src/entities/railway/halts-view.ts`: levers and boards at the new
      halts (the row lines' rule on main); `train-view.ts` unchanged (it poses every slot). `docs/game-design/place.md`
      updated. No new unit test file (rule 36); the hand-kept lists and far-ground check as step 4 (rule 41). **Rule 53,
      what a player presses:** the plug's prompt and the objective after the cloth change here, so the same branch runs
      the bots and seeds that walk through them: `dev/look/bots/railway-legs.ts` (its Canopy ending reads the objective),
      `dev/look/evals/railway-legs-bot.ts`, `dev/loop/run.ts`, and the seeds of step 3. Verify: the full ship check;
      `npm run level-check`: every route leg 4 line "ok" (on foot between the Saltpan's platforms and onto the flats;
      Port Quay's platforms, the quay slab, the apron, the ramp's foot and head; a swimmer from each side reaches each
      isle inland; both reserves clear); `.look/` stills: from a cave train, under the hood and out past the face;
      head 1 from the train (`cave-mid`); a train standing at the Saltpan on the curve; Port Quay's platforms with High
      Port's top behind; the board at the buffers; Bell Rock's Port Quay stall; the look harness's mesh and collider
      counts with each new area resident and not. **The boot probe on the built site (rule 61)**: the views index the
      new train rows and halts.
      **As built.** The flood crosses both Saltpan platforms onto the flats, reaches High Port from the quay platforms,
      and brings swimmers ashore from two approaches to each island. Both apron reserves are clear. The playable quay
      hides the horizon's cranes, warehouses and breakwater while resident. The horizon keeps its single draw.
      At the Saltpan the area owns 1 mesh with 86 box instances and 87 colliders. At the quay it owns 2 meshes,
      63 box instances and 65 colliders. Both unload at Bell Rock. From the Canopy-reached seed the real-input bot took the cloth and rode
      home to the West landing without recovery. The cloth press pointed to the West landing;
      opening the plug changed the objective to building the cave line. The prefab check, level check and local ship
      check passed. The offline production build reached interactive in 7.1 seconds. Not tested on a device.
      Stills from [under the hood](greybox-leg4/under-hood.png), [past the face](greybox-leg4/past-face.png)
      and [approaching head 1](greybox-leg4/head-one.png). The [Saltpan stop](greybox-leg4/saltpan-stop.png),
      [quay platforms](greybox-leg4/quay-platforms.png), [buffer board](greybox-leg4/quay-buffers.png)
      and [connected Bell Rock stall](greybox-leg4/bell-quay-stall.png) show the completed line.
- [x] **6. The bot and the loop (M; HOTBOX; "Implementation from a brief or an approved plan": Claude opus medium).**
      On garage step 4's bot as merged. Files: `dev/loop/graph.ts` (`plug-gate`: `rail.gate`, the third "route
      barrier opened", requires `canopy-3` and `pick`; `cave-1` to `cave-3`: `legSection` on `cave`, bills, frames and
      racks from `RAIL_LEGS`, `KIT_BY.cave` "stocked on the West landing's cave rack (the stand-in: no train)" for the
      first and "a cave train from the West landing" after, `NODE_PREFIX.cave` unchanged, `cave-3` with `stops:
      ['port']`; no op or mark is new, so `GENERIC_OPS` and `ACTIVITY_MARKS` are unchanged, but the file is listed (rule
      63)); `dev/loop/standins.ts` drops `port` (the Wall's stand-in requires `cave-3`); `dev/loop/run.ts`
      (`ROUTE_PRESS['plug-gate']` and its `done` check); `dev/look/bots/railway-legs.ts` (after `canopy home`: round the
      root to the apron, the barrier `railway-leg-plug`, the three sections riding cave trains to each head, on to Port
      Quay, a cave train home to the West landing; `--from canopy-reached` a leg seed); `dev/look/segments.ts`
      (`RAIL_STOPS.port` "port home", `LEG_STOPS`). Verify: `npm run loop -- node plug-gate` and `-- node cave-3` print
      the bill, the supply and the cue; `npm run loop -- run`; `npm run playthrough -- --from canopy-reached --to port`
      (a pass verdict; its timings are not evidence under load); `test/loop-graph.test.ts`.
      **As built.** The loop reports the plug and all three bills with their catalog sites and supplies. The canonical
      orders finish for one to four players. The cave order probes refuse as expected. Area 7 takes 10, 15, 15 and
      15 modelled minutes against 48. The headless model walks straight lines and reports idle above 60 s at the plug
      and on the first section in co-op. The known “T3 before beam” order still stalls at jump.
      The real-input `canopy-reached` to `port` segment passed through all three lays, stepped off at Port Quay and
      rode back to the West landing. Local verdict `.look/playthrough/leg4-port/verdict.json`, load 0.23 to 1.60,
      exclusive slot, no recovery or graphics errors. Ship check and level check exited 0.

### Checkpoint D (leg 4 playable)

After steps 1 to 6 are on main. **Named proofs, run once on HOTBOX with the tools as Checkpoint C left them**
([leg 3's Checkpoint C as built](greybox-leg3.md#steps)):

- [ ] **`npm run loop -- run`** for one to three players: its `idle s` column per node (`plug-gate`, `cave-1` to
      `cave-3`), area 7's minutes beside its 48-minute allowance, the whole route's; no softlock, defect or graph bug;
      every order probe refused as the graph says. Any wait over 60 s with nothing to do is a finding for the designer
      (the route plan's Checkpoint A rule).
- [ ] **The bot segment** `npm run playthrough -- --from canopy-reached --to port`: a pass verdict, the load noted.
- [ ] **`npm run test:net`**, with the reconnect case below in it.
- [ ] **The reconnect proof at `cave-mid`**, as the net suite's `leg rejoin` case: `railwayLegRejoin` in
      `dev/peer-test/ws-railway.ts` takes the leg and its seed (`bell-canopy` at `canopy-mid`, `cave` at `cave-mid`)
      and runs both; for the cave: the seed doc written to the server store before any page opens (POST /jump's 60 s
      worker limit is too short on HOTBOX, as for `canopy-mid`); a second tab joins; a round trip later (`cycleTicks`
      over the cave line's stops to head 1) head 1's rack holds section 2's bill; the first tab takes rails, leaves,
      the server restarts, it rejoins; the leg row, the rack, the kit aboard and the carrier's back are exact at every
      checkpoint, and each tab's mirror matches. The case's 8-minute deadline is timed with the later seed; if the
      seed build takes over half of it, the cave case gets its own deadline. The review replay in
      `test/loop-graph.test.ts` covers both legs.
- [ ] **Steps 4 and 5's stills on one sheet.**
- [ ] **`npm run perf -- --view port`** (counts: a new `PLACES` row in `dev/look/perf.ts`, seed `port-reached`, the body
      on Port Quay's homeward platform, the camera over the breakwater toward the quay and High Port's top), and the
      HOTBOX frame time with `-- --view port --hardware --seconds 10`, its load noted.
- [ ] **The boot probe** on the built site of main after step 6 (rule 61).
- [ ] **The service fuzz's long run** (step 2) pasted, if any rule changed after it.
- [ ] **A device line:** one frame-time reading at Port Quay on the Mac, **reported, not a gate**. There is no Mac in
      the loop while its schedules are paused: the checkpoint closes on HOTBOX's reading and the Mac reading is taken
      when the owner next opens the Mac (as Checkpoint C).

The independent review covers steps 1 to 3 as one batch, steps 4 and 5 as another.

### Steps 1–3 as built, 25 November 2026

World v70 follows v69. The cave cuts measure 359.5, 369.5 and 472.8 m. Saltpan's nearest metre sample is s 739.0,
at (545.29, 696.40). Port Quay stands at s 1221.80, 13.65 m inside its shore, with its crossover at s 1197.30.
The plug is 6.02 m from rack 1. Keeping Saltpan's full 60 m-radius arc level at 3 m avoids a 4.22% approach span.
32 chords keep the centimetre-rounded turns below 2°. The existing 23.8°, 12.4° and 20.8° corners at s 65.3,
322.7 and 1080.6 remain as documented in level finding 1. The tightest measured three-point radius between West
and the quay buffers is 46.0 m.
On 25 November after review, the orchestrator restated step 1's 2° criterion to allow exactly those three measured corners.

Leg 4 opens after Canopy's last lay, independently of collecting cloth. Standard trains occupy slots 12 and 13.
The existing mint, standing kit, fleet and save checks take the new line from the catalog. A real host rejects
the plug edit at the former halt centre, accepts it at the frame and accepts kit from the new rack.
The High Gorge rim host test restores the file's audited High Gorge fixture. Its pick and pile reach
assertions run through the host without replaying the four stack sections a second time.
All three seeds use accepted operations. Every older seed still reaches its original tick. The cave-mid jump
targets the midpoint of the next rack and frame. Its surface check keeps the spawn until step 5 supplies the platform.

The built-site probe exposed a startup dependency on the cave row's client path even with both trains in the shed.
Registering the path also supplies the seven catalog-driven request levers. The halt prefab, seats, economy page
and host trace were regenerated with the catalog. The trace has 8,620 records in order. All 58 inputs, 2,220 messages
and 458 replica packets match v69. The 205 checkpoints and 5,679 status records change with the saved train rows.

**Service at 75% headway.** Four long seeds, 20,000 ticks per mode, one restore per run. Each cell gives accepted calls
and worst served wait in ticks. The settled bounds are 1,128, 984 and 1,468 ticks. Calls spanning a lay use the
larger applicable stage budget, including the joining train's half-cycle. All calls drained within budget.

| Seed | Growing | Settled at head 1 | Settled at Saltpan | Settled at Port Quay |
| --- | ---: | ---: | ---: | ---: |
| c0ffee | 122 / 1139 | 91 / 529 | 174 / 668 | 118 / 824 |
| 777 | 125 / 1072 | 106 / 546 | 189 / 639 | 130 / 815 |
| 5eed | 118 / 1131 | 102 / 545 | 180 / 613 | 123 / 805 |
| badd | 111 / 1165 | 99 / 556 | 187 / 612 | 123 / 847 |

The timed default cave test took 7.93 s of its 480 s budget (20.0 s with shard startup). The leg 2 and Canopy long
suites also passed all four groups, 28 seed/mode combinations. The loop's canonical runs completed for one through
four players. The alternate “T3 before beam” order stalled at jump for all four player counts at the same times on
the v69 control. The cave bot and live loop nodes remain step 6.

### Order, and what waits

| Step | Needs on main first | Why |
| --- | --- | --- |
| 1 to 3 | Nothing | Sim and catalog; no file of the in-flight jobs |
| 4 | Step 3 | `west()` draws the cave line's platforms where its halts now stand |
| 5 | Step 4 (the clearance helper is on main) | Bell Rock's and the West landing's levels are drawn by the same views |
| 6 | Step 5 (garage step 4's bot is on main) | The bot rides to the barrier step 5 draws |

**Between the bump and step 5** no room can open the plug in play (its barrier is step 5's view), so no cave train runs
for anyone who plays to it; production prebuilds the jump rows (`OFFERED_STAGES`), so `?from=cave-mid` would run a cave
train over track nobody draws until step 5, as leg 3's room did between its bump and its views. Worth knowing before a
playtest.

### Left out

Breaking the plug as a mechanism, a tunnel through the sandstone face, salt sliding, the crane lift and High Port's
town, the faster engine, Port Quay's Roundhouse and station, any post or install at Port Quay, the shared pool's second
post, salt as freight, riders or freight on the cave line, the cave line as a trade line, the hub stand-in town, the
White Wall's first frame and leg (leg 5), easing the Wall's hermite at Port Quay (leg 5), the halt map drawing the cave
line. Each is a later plan's.

## The world bump

**Needed: one bump, in step 2's commit, covering steps 1 to 3.** The next free number is v68 unless another ships first
(garage step 4's later steps carry none as planned); two share one only if both are review-clean in the same batch, and
none waits for another ([Nothing waits on a world bump](../agents/owner-calls.md#no-bump-hold)). Ship outside the
owner's sessions (`npm run heartbeat` first). **Why it cannot be avoided:**
- **Saved shape:** two new `Train` rows (the cave fleet's shed rows). Bump G1 (v32) installed every catalog row but, by
  the 12 November Default, not the later lines' train rows ("leg 2's train rows ... come later, with their own bump"),
  so each leg that runs trains on a new line brings its rows and its bump; legs 2 and 3 did (v62, v66).
- **Meaning of saved ids:** the cave line's halt ids after the West landing change (head 1 inserted, the Saltpan a head).
- **Catalog geometry:** the arc and Port Quay's stop move the cave row's cms and every point the rules judge on it, and
  the plug's point moves (a server reach check: rule 1, said in the ship).
- **Pinned fixtures:** the golden shards and seeds move (rule 15 asks a bump for that alone).

**Against the route plan's "two planned, six at most":** the ceiling is one bump per leg. Leg 4's is the route's fourth
(G1 for leg 1; v62 for leg 2; v66 for leg 3), inside the ceiling. G2's reserve ("the first leg whose build has to reorder
or add a catalog row") is not taken: no catalog row is added or reordered, only re-measured.

## Level findings

`npm run level-check` ran on 24 November (main `56138efa6`): **23 reports, no failure**; "route leg 2 (planned): ok";
the West landing's "room left for the rules plan" includes the cave row's first 80 m, clear of leg 2's boxes. Leg 4 has
no level artifact for the Saltpan or Port Quay yet, so its planned points were measured with scratch scripts over the
catalog (`rowPoint`, `rowSide`, `legFrame`, `legRack`), Home's terrain (`H`) and the map's smoothed outlines
(`layout(...).land`), and are read against the report:

1. **One planned kink on leg 4's track fails** (track continuity, "planned, would fail"): the cave row's 48.9° at s 740
   (550, 700), with "straight into a 6 m curve within 10 m, no easing", at the Saltpan's stop. Leg 4's trains cross it,
   so step 1 eases it. The leg's other vertices are reported and pass as the built bay row's do: 23.8° at s 65.3 (45 m
   past the West landing's stop), 12.4° at s 322.7 (47 m before head 1's stop; a standing train's tail clears it), 20.8°
   at s 1084.
2. **Port Quay's stop is 0.2 m short of a 19.8° turn** into the Wall's hermite (chords 6 to 8 m, about 18 m radius): a
   standing train's nose is on it. The stop moves 25 m back; the buffers stand 2 m short of the turn.
3. **Head 1 (s ~369) is over the sea** at (656.6, 344.8), 232 m off Home's outline and 255 m off the Saltpan's, on the
   level 4 m deck: a sea ramp, so a body off the platform climbs out there.
4. **The Saltpan's stop is 104 m inside `salt-land`'s outline** (the row enters the flats at about s 630 and leaves at
   about s 875): its platforms stand 0.9 m over 3 m ground, one step down. The flats are reached early by a swimmer from
   head 1 (255 m) or Home (about 550 m).
5. **Port Quay:** the row reaches `port-isle`'s outline at s ~1209; the moved stop is 14 m inside it, so the platforms'
   first 4 m are over the beach: the quay slab. High Port's top (`port-top`, 55 m) stands 110 to 135 m west of the
   platforms: room for a plain ramp of about 100 m at the Ring ramps' pitch. **Unproven** until step 5's artifact: the
   two reserves' fit beside the ramp.
6. **The West landing:** the cave row shares the bay row's root (801, 10) at 137°. The cave line's homeward side is the
   cliff foot (ground 3.0 m at s 0, 4.0 to 4.6 at s 6 to 8, −0.6 at s 18, 2.9 at s 40, 5.8 to 9.8 m off the row); its
   outward side is water (−1.5 to −2.0 m) inside the V. The bay's platform B was cut back to s 2 for this corridor, so
   the cave's outward platform starts at about s 4 (step 4 measures it). Rack 1 (810.2, 16.9, 4.9) and frame 1 (809.7,
   22.9, 4.9) are 6 m apart on the cliff foot (Q7's last carry under 15 m); the walk from the bay platforms round the
   root is about 30 m, **unproven** until step 4's flood.
7. **The cave mark and the hood:** the map's cave mark (820, 72) stands in the sandstone face at 7.5 m ground, 24.5 m
   east of the row's closest pass (s ~62); the cliff rises to 11 to 18 m 10 to 40 m further east. The catalog's line runs
   at the cliff's foot over water, not through the face ("25 m off the cave mouth it is to meet", world-blockout's
   comment), and the cave's far mouth is not in the map data. So the covered stretch is a hood over the line (s 45 to
   80), and the row's start crossover (s 55) runs under it ([question 1](#open-questions)).
8. **Early reach** (route contract). The plug is reached on foot from day one and refuses "Needs the powered pick";
   from the pick to Canopy's last lay it refuses with the pick held ([finding 2](#findings)). The Saltpan and Port Quay
   are reached by swimming; their frames refuse out of turn and nothing there can be taken. A glider from Home's 17 m
   cliff top reaches neither (550 m and more of water). Movement skips distance, never the work.
9. **Frames and racks 2 and 3** by the generic formula: at head 1 (651.2, 345.9) and (654.1, 336.3), 10.1 m apart; at the
   Saltpan on the arc, re-measured by step 1's test.

## Risks

- **Room safety.** Every transfer is in a system inside the tick's apply; no state is new; no `Math.random`, no wall
  clock; effects (the barrier's opening, the stall's rise) play from mirrored changes in the adapter. A leaver's lifted
  units release by the existing check (`railBeamGraceS`, then `legKitRelease`).
- **Mixed builds.** Dev phase: no compatibility code; the reindex, the arc, the train rows and the moved plug point are
  a break, so the bump with its dated line. The plug's reach point is one the server checks (rule 1): the ship says so,
  and the bump ships server and client together. Golden shards and fixtures regenerated in the same commit.
- **The arc moves catalog cms** past s 713 on the cave row: `WALL_ISLETS`, the Wall's cuts, the cave row's Canopy and
  Gorge stops (all unbuilt). Recomputed and tested; `RAIL_PLACES` holds within 40 m.
- **`appendLeg`'s new case** (a section ending at a catalog halt) is the first; the Wall's Canopy uses it next. The load
  checks and `simHalt` are proved on the cave line and on a fixture with two such halts.
- **Line 2 is not touched** (rule 14): no line 2 halt, train or kit changes; the forge rack is shared, and no other leg
  loads kit while leg 4 is open.
- **Hot files.** `railway-lines.ts`, `railway-route.ts`, `world-blockout.ts` and its generated files, `leg2.ts`,
  `leg-view.ts`, `route-greybox/index.ts`, `halts-view.ts`, `railway-legs.ts` and `graph.ts` (each touched by a job
  that merged on 24 November), `rail-map.ts` (the stale forge-rack branch's).
- **Lockstep.** Integer cm and ticks; the arc's points are generated integers in the catalog (the generator runs at
  authoring time); `simHalt`'s count is an integer read.
- **Performance.** Two isle prisms with beaches, High Port's 55 m block and its ramp, the hood, 1.2 km of deck and bents,
  two cave trains. Reported by `npm run perf` and the look harness's counts; not a reason to cut anything without the
  owner's word.

## Design review (2026-11-24)

The planner's own review, in the same sitting (owner call "Fold roles into the builder", 16 November); the plan was
reread from the top before the calls were sorted. **Read:** DESIGN.md; owner-calls' index; the rail and rewards Current
rules with the entries cited below; docs/direction.md (phase 1; "Next": the route, rough, to the ending); docs/playtests.md
(its newest dated entries predate the greybox route; the 14 November sessions as legs 2 and 3's reviews quote them:
the owner pressed "Open the barrier" five times against "No line beyond yet"); context's design-work rules; the research
above; the level report and the scratch measurements; `npm run loop -- node port`, `-- node wall`, `-- node cloth`; the
code each call depends on. **Seen:** numbers only. **Not seen:** any still. No massing exists for the cave side, the
Saltpan or Port Quay, so they are judged from the map data and the catalog, which is why steps 4 and 5 list their
stills.

**Flow, beat to beat** (the beats table; progression-flow-layout's three firm rules):

- *The next goal can be found.* Leg 3's ride home ends at the West landing, and the objective names the plug there; the
  plug's barrier stands at frame 1 on the apron, 30 m round the root, with the hood beyond it; each head's rack is
  beside the train that stops there; Port Quay's board names the next line. Home is the same line back.
- *A gate keeps its meaning.* The plug takes the pick at the only gated frame; a swimmer reaches the Saltpan and the
  quay early and every post refuses.
- *Nobody is stranded.* Head 1 has a sea ramp; both isles have beaches all round; the Saltpan stays a request stop;
  trains run both ways from every open halt; High Port's ramp comes back down; the keys are the room's.
- *Lenses.* "The key in sight of the lock": the plug is seen from day one and the pick comes from High Gorge, the route's
  main double-back, as the outline wants; but the lock then refuses with the key held for two legs (finding 2). "A world
  that shortens behind you": Port Quay is one ride from the West landing, a short walk from the Village. "Ending a beat
  facing the next": the leg ends at Port Quay, where the Wall's line grows on. "A place to meet": the West landing,
  now a two-line station by Home.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | 20 logs + 20 rails a section, about 30 s to lay; sections end at a place, up to about 900 m | Decided | [16 November](../decisions-rail.md#d-2026-11-16-batch2-greybox-section-length-and-lay-time) |
| 2 | One fixed order: the cave leg opens once Canopy's leg is laid (`after: 3`); one leg open at a time | Decided | [16 November](../decisions-rail.md#d-2026-11-16-batch2-fixed-order-branch-wayfinding); [campaign outline answered](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered); the route plan's catalog |
| 3 | Trains stop on request; a lever each platform side | Decided | [10 November](../decisions-rail.md#d-2026-11-10-trains-stop-on-request-at-the) |
| 4 | Right-hand running on every cave halt | Decided | Owner, [18 November](../decisions-rail.md#d-2026-11-18-decisions-page-rail) |
| 5 | Spacing at open ends and after middle service stops; holds yield to riders and blocked followers; budgets of two headways plus dwells | Decided | [23 November](../decisions-rail.md#d-2026-11-23-greybox-service-health) |
| 6 | `rail.legStock` predicted; the gate server-confirmed | Decided | [16 November](../decisions-rail.md#d-2026-11-16-batch2-greybox-stock-is-predicted) |
| 7 | Live for everyone, grey and labelled, the leg shipped whole | Decided | [12 November](../decisions-rail.md#d-2026-11-12-ring-island-build-2-and-the-greybox-route-answered) (4) |
| 8 | The route plan's stand-ins: the plug a barrier on the first frame that takes the pick; the Saltpan a halt; the leg ends at Port Quay; High Port's top massing with a plain ramp; no salt sliding, crane or faster engine | Decided | Owner call [greybox before detail](../agents/owner-calls.md#mechanisms-systems-greybox-details), 11 November; greybox-route section 3, owner-approved |
| 9 | Port Quay's stall at Bell Rock rises when the cave line reaches the quay; nothing is freighted to it | Decided | [12 November](../decisions-rewards.md#d-2026-11-12-cargo-trains-and-hub-towns-answered); the market's fixed table (route review, ruling 2) |
| 10 | Port Quay is a hub town with the second Roundhouse (five bays, complete at arrival), built by its own station plan | Decided | [12 November hub towns](../decisions-rewards.md#d-2026-11-12-hub-towns-grow-and-receive-freight); [16 November](../decisions-rail.md#d-2026-11-16-batch2-port-quay-five-bays) |
| 11 | Three sections of about 359, 369 and 473 m: halves of the West landing to the Saltpan, then on to the quay | Default | The route review's ruling 1 (the cave's 360, 360, 510), re-measured on the eased row |
| 12 | The Saltpan's 48.9° kink eased by a 60 m arc; the stop at the arc's middle; platforms as chords | Default | Level finding 1; Bell Rock's precedent (leg 3, call 15), the smallest move that passes |
| 13 | Section 2 ends 10 m past the Saltpan's stop, so Saltpan Halt is that section's head: one halt with the catalog's name | Default | Two halts 10 m apart would read as one place with two levers; finding 1 |
| 14 | Head 1 closes behind once Port Quay opens; the Saltpan stays a request stop both ways | Default | The stack's `closesAt` rule; the Saltpan is a place to get off |
| 15 | Port Quay's stop 25 m short of the Wall's turn, a crossover 24.5 m before it, buffers 2 m short of the turn; a quay slab under the platforms | Default | Level finding 2; Canopy's rule (leg 3, call 16) |
| 16 | Cave fleet `[0, 1, 2, 2]`, 50-tick dwell | Default | The bay cut's ladder over the same length; the service fuzz measures it (step 2) |
| 17 | Section 1's kit stocked on rack 1 (no train runs on the line yet); later kits minted at the West landing, one a train, all remaining owed ahead | Default | Leg 2's stand-in for the bay cut (its open question 2); `kitLead` (route review, ruling 1.4) |
| 18 | Rack 1 and frame 1 on a new apron on the cave's cliff side, s 6 and s 12, 6 m apart; the plug barrier moves there from the halt's centre point | Default | The bay cut's apron mirrored; legs 2 and 3 moved their barriers to the frame |
| 19 | The cave as a covered stretch: an open-ended grey hood over the bed from s 45 to s 80 past the sandstone face, "Sea cave (placeholder)"; no tunnel through the face | Default | Level finding 7; the catalog's line runs at the cliff's foot. Open question 1 |
| 20 | The plug's refusal with the pick held before Canopy's leg is laid reads "After the line to Canopy (placeholder)", not "No line beyond yet" | Default | Finding 2; the owner's five presses against "No line beyond yet" (14 November). Open question 2 |
| 21 | Copy: three objective texts and the end boards ([Controls and copy](#controls-and-copy)) | Default | Placeholder copy, none The Boogler's |
| 22 | The Saltpan's stand-in: the flats as a slab at 3 m with a beach all round; platforms with a step; nothing to slide on | Default | level-design rec 3; leg 3's isle pattern |
| 23 | Port Quay's stand-in: the isle slab with beaches, the quay slab, High Port's 55 m top as one block with one plain ramp; reserves for the Roundhouse (r 30 m) and a stand-in town (30 × 30 m) within 60 m | Default | The route plan's stand-in; garage-choices section 5; leg 3's reserve (its open question 5) |
| 24 | Head 1 mid-strait over the sea with a sea ramp | Default | The halves cut; every sea head's ramp |
| 25 | Seeds `cave-open` (the cloth taken), `cave-mid`, `port-reached`; `cave-mid` lands on head 1, the others keep the spawn until step 5's stills | Default | Leg 3's step 4 pattern and reason |
| 26 | **The cave line runs standard trains only (row 0): no Quick or Strong on it in leg 4**, so after leg 3 Strong's hold has no building leg to hold on until the garage adds the cave line | **New** | It touches the current focus (choice and payoff). Leave it to the garage (G-f); leg 4 needs no change if the cave line is added later. Open question 3 |

**Counts:** 10 Decided, 15 Default, 1 New. Every Default and New call is logged in
[agent-calls](../agent-calls.md#rail-construction-levels-and-travel) (rail) and, for call 26,
[core loop](../agent-calls.md#core-loop-pacing-and-progression). **Suspect lines of The Boogler's:** none written,
changed or read as suspect.

### Findings

1. **(changed steps 1 and 2) The Saltpan as a head.** The catalog's section 2 ends at the Saltpan's stop, and a head
   stands 10 m short of its section's end: two halts 10 m apart, and `appendLeg` (built for legs that run from one
   catalog halt to the next) would have duplicated Port Quay and dropped the Saltpan from the line. Section 2 now ends
   10 m past the stop, the head is the halt, and `simHalt` counts catalog halts inside a leg (calls 11 and 13). The
   Wall's Canopy is the same case later.
2. **(changed step 5: the refusal) The lock refuses with the key in hand for two legs.** The plug is seen from day one
   (the outline's main double-back) and the pick is taken at High Gorge, but the fixed order keeps the plug shut until
   Canopy's leg is laid: every bay-line trip of legs 2 and 3 passes it with the key held, and the prompt on main would
   say "No line beyond yet", the refusal the owner pressed five times at the Gorge. The order is decided (call 2), so
   the refusal names it (call 20). Opening the cave leg after the bay cut instead is a direction change, so it is open
   question 2, not a call.
3. **(changed step 1) Two stops on turns.** The Saltpan's stop is on a 48.9° kink and Port Quay's 0.2 m short of the
   Wall's turn; both fixed in the catalog (calls 12 and 15) rather than in the views.
4. **(changed step 1) The plug's point was the cave track's centre.** `RAIL_GATES.plug` stood at the West landing halt's
   centre point, on the cave line's own track at s 20: a barrier no platform reaches. It moves to frame 1 (call 18), a
   server reach point (rule 1).
5. **(no change) The cave is a hood, not a cave.** The catalog's line runs at the cliff's foot, 24.5 m off the map's
   cave mark, and the far mouth is not in the map data; a tunnel through the face would re-route the row's first 100 m
   and decide the plug's mechanism. The hood is the stand-in (call 19); open question 1.
6. **(no change) Solo and co-op.** Solo works end to end on the room's keys. Three players feed a section in one trip
   each. The railhead's start is the closest to Home of any leg, so a friend arriving at the Village is a short walk
   from frame 1, and the cave line's trains bring them to the head after that.
7. **(no change; open question 3) Strong has no window here.** garage-step4 found that after leg 3 Strong holds nowhere
   on the built route; leg 4 keeps the cave line standard, so that stays true until the garage decides (call 26).
8. **(no change) The route's live end moves to Port Quay.** The next leg (the Wall) grows from Port Quay and its first
   frame is not built; the board at the buffers says LATER and the objective sends the room home. The Wall's
   deep-span barrier takes the seeds the room already holds: legs 5 and 6 inherit finding 2's pattern.

## Open questions

None blocks the build; each proceeds on its recommendation. None is irreversible or outward-facing.

1. **The cave in greybox: a hood over the line beside the cliff, or a tunnel through the sandstone face?** The catalog's
   line runs 24.5 m off the map's cave mark, at the cliff's foot over water; a tunnel would re-route its first 100 m
   through the face (a catalog change, deeper massing) and start deciding how the plug is broken. **Recommended: the
   hood** (an open-ended covered stretch at s 45 to 80, the plug a barrier at frame 1), leaving the real cave to the
   plug's brainstorm. Proceeds on it.
2. **The plug refuses with the pick in hand from High Gorge until Canopy's line is laid.** **Recommended: keep the
   fixed order and name it in the refusal** ("After the line to Canopy (placeholder)"). The alternative, opening the
   cave leg once the bay cut is laid (`after: 2`, a choice of Canopy or the cave first), is a branch against the decided
   fixed order, and the shared depot rack is built for one open leg at a time. Proceeds on the recommendation.
3. **Is the cave line a trade line (Quick or Strong), and from when?** It is the next building leg where Strong's hold
   could pay, and garage-choices' G-f names it. **Recommended: not in leg 4;** the garage's next plan decides with its
   chip, bay and works copy, after leg 4 ships. Nothing in leg 4 changes if it is added later. Proceeds.

## What could not be verified while planning

- No still of any of it: there is no massing for the cave side, the Saltpan or Port Quay; every placement is from the
  map data, the catalog and Home's terrain.
- The generator's arc at the Saltpan and its deck levelling round Port Quay's moved stop were reasoned from
  `dev/level/world-blockout.ts`'s code, not run.
- The walk from the bay platforms to the cave apron, and the cave's outward platform clearing the bay's platform B near
  the root, wait for step 4's flood.
- The fleet `[0, 1, 2, 2]` against the service budget, and the first kit's wait at head 1 (the train joins after the
  first lay, then loads), wait for step 2's fuzz and the checkpoint's idle seconds.
- The reconnect case's seed build time for `cave-mid` on HOTBOX (one stage later than `canopy-mid`).
