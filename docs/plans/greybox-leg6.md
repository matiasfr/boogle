> **25 November 2026.** Planner, against main `4fb315ce5` (world v71: leg 5 through step 5 on main; step 6, the bot
> and the loop, building on `codex/greybox-leg5-bot-loop`). Leg 6 is the last row of [greybox-route](greybox-route.md)'s
> legs table (section 3, row 6), its ending (section 5) and its order row "Legs 4 and 5 → Leg 6" (section 6). Steps 1
> to 3 ship together as the leg's bump; 4 to 7 after it, in order ([order](#order-and-what-waits)). Design review
> [near the end](#design-review-2026-11-25); [open questions](#open-questions) last. Nothing here waits for the owner.

# Greybox leg 6: the Notch and the causeway, Canopy Town to the Original Island, playable

**Where this sits.** Leg 6 of [greybox-route](greybox-route.md) (area 9, "Lantern Notch, the causeway, the Original
Island"): two one-section legs that are already catalog rows on main, `notch-tunnel` (`RAIL_LEGS[6]`, the bay row grown
from Canopy Town to Lantern Notch behind the `notch` barrier that takes `cloth`) and `causeway` (`RAIL_LEGS[7]`, the `ns`
row grown from Bell Rock to the Original Island behind the `causeway` barrier that takes `lantern`), then the arrival
fact, the meeting marker and one shared moment. A file of its own in legs 3 to 5's shape. The route plan's binding owner
direction holds: every step is a mechanism or a system on blockout geometry; every label is a placeholder and is marked
as one. **The glide to the arch, lighting the lantern and the meeting with The Boogler are not in this plan.** The two
barriers and the lantern post are the route plan's stand-ins and decide nothing about them; the meeting stays a post
labelled "Meeting (placeholder)", and no Boogler line, name or behaviour is written, changed or read as suspect.

**Goal.** Once the White Wall closes the ring, the room opens the Notch barrier at Canopy with the glider cloth it has
held since leg 3, builds the line out through the forest and over the sea to the arch, takes the lantern there, rides
back to Bell Rock (the route's one planned change), opens the causeway's barrier with the lantern, builds the causeway
over the bay and rides it to the island it has seen from the first minute, where one press at the meeting post puts the
same card in front of everyone in the room. The world stays open after. Serves DESIGN.md's core loop ("the rail builds
the world"), **7. Telegraph everything** (the Original Island has been in view across the bay since minute one; the
Notch barrier has stood shut at Canopy since leg 3; the horizon's causeway lamps stand over the shallows) and **8.
Enjoyable alone and together** (the lantern is the room's, so one friend can wait at Bell Rock while another fetches it;
the ending is one moment for everyone in the room). It bends nothing; the one call that departs from a confirmed one is
[call 30](#calls) (the classic island as it stands, not blockout massing), put to the owner as [question
3](#open-questions).

**Read for this.** AGENTS.md; `npm run map -- --kind prototype` (no `plan` kind exists; its design rows apply);
`.claude/agents/planner.md`; DESIGN.md, context's design-work rules; owner-calls' index; the core loop, rail and controls
Current rules, the entries cited below and the archive rows of the greybox route's calls; greybox-route sections 1 to 7,
its design reviews of 11 November ("Flow", calls 8 to 40) and 12 November (ruling 1's ending rows); greybox-leg3
(Canopy, the cleft, the cloth and the Notch barrier), greybox-leg5 in full with its as-built section;
[order-picks](order-picks.md) (definition 1 of a trade stage); [cutscenes-for-everyone](cutscenes-for-everyone.md)
("What a friend sees", "Does it hold their input"); docs/agents/orchestrator-state.md ("Open owner questions", the job
table, "Rules learned"). Code on main: `src/sim/railway-route.ts` (`SPECS`, `CANOPY_KINK`, `RAIL_GRANTS`,
`RAIL_GATES`, `RAIL_ARRIVAL`, `FIRST_SITE`, `legFrame`, `legRack`), `railway-lines.ts` (`rowLine`, `appendLeg`,
`RAIL_LINES[2]` and `[3]`, the fleet checks, `legBuilt`), `railway-sys-route.ts` (`gate`, `arrive`, `LAST_HALT`),
`railway-queries-route.ts` (`legMintChain`, `MINT_LEGS`, `YARD_LEGS`, `SERVED_LEGS`, `tradeBuildDone`,
`tradeSwapRefusal`, `legYardDrop`), `railway-sys-route-kit.ts` (`legRailheadHold`), `railway-check-steel.ts`
(`revOk`), `railway-check-route.ts`, `src/world/railway-server.ts` (`rail.arrive`'s reach), the generated
`railway-world-lines.ts` (the bay row past s 2401, the `ns` row past s 1156), `dev/level/world-blockout.ts`
(`TURNBACKS`, `SERVICES.ns`, `SERVICES.bay`), `src/content/levels/leg2.ts` (Bell Rock's lower level),
`leg3.ts` (`CANOPY_TRUNKS`, `CANOPY_CURVE`, Canopy's deck, the Notch board), `src/island/` (`shape.ts`
`MAINLAND`, `MASSIF`; the POI sites), `src/entities/sickle-backdrop/view.ts` (the arch's legs),
`src/entities/route-greybox/leg-view.ts` (`LEG_OBJECTIVES`, `leg2Objective`, the Notch barrier), `src/render/buddy-frame.ts`
(`momentBusy`), `dev/loop/standins.ts` (`ending`).

**Research.** [route-contract](../research/route-contract.md) (travel edges never supply work): used; the Original
Island is swimmable from Home since minute one and the Notch reef since leg 3, and every post refuses out of turn
([Level findings](#level-findings), 10). [level-design](../research/level-design.md) rec 3 (big shapes to steer by): used;
the 58 m arch frames the lantern from the arriving train, and the line keeps 10 m or more off every trunk.
[progression-flow-layout](../research/progression-flow-layout.md): its three firm rules are the review's flow check.

**Port from Place.** Nothing is ported. No fit check is needed.

**The rail route as it stands** (`npm run loop -- node ending`, 25 November): `ending` is a stand-in: "8 logs + 8
footings + 4 steel + 4 copper + 1 crystal = 25 units; allowance 18 min; legs final 0.75 km (North-south line),
notch-tunnel 0.88 km (Bay line) = 1.63 km; grants the ending; requires wall, cloth". Leg 5 step 6 makes `wall` built
nodes (`wall-1` to `wall-6`); this plan's step 7 replaces `ending`.

**In flight** (`npm run inflight`: nothing unmerged on `wip/`, `ship/` or `claude/` this week; the state file's job
table, 25 November): **`codex/greybox-leg5-bot-loop`** (leg 5 step 6: `dev/loop/graph.ts`, `dev/loop/standins.ts`,
`dev/loop/run.ts`, `dev/look/bots/railway-legs.ts`, `dev/look/segments.ts`, and possibly the seeds and their golden).
Steps 3, 5 and 7 here touch those files and **follow it** ([order](#order-and-what-waits)). `codex/cliff-kit-horizon` (the
horizon's White Wall colour, `src/entities/sickle-backdrop/view.ts`) is held for the owner; no step here edits that
file (the arch's legs and the trunks are hidden colliders under the horizon's mesh, as the Wall's islets are).

## What exists for leg 6 on main, and what does not

| Piece | On main | Owed by this plan |
| --- | --- | --- |
| The catalog rows | Bay past Canopy's stop (s 2400.9): 25 m to a **101.8° kink** at s 2425.9 (world (−1100, −300)), then 885 m to Lantern Notch's stop (s 3290.6) and a planned balloon loop; `ns` past Bell Rock (s 1156.0): 726 m with a **20.8° kink** at s 1659.4 to the Original Island's stop (s 1882.3) and a planned loop. **As drawn the Notch line cannot be built** ([Level findings](#level-findings), 2 to 4) | The Notch line re-routed at Canopy and at the arch; the causeway's corner eased; both ends crossovers (step 1) |
| The legs' catalog entries | `RAIL_LEGS[6]` `notch-tunnel` (area 9, one section, gate `notch`, `after: 5`, kit `home`) and `[7]` `causeway` (one section, gate `causeway`, `after: 6`, kit 0, the Gorge yard); bills 6 logs + 6 rails; **neither `built`** | `built: true`, the causeway's `kitAhead` (steps 1, 2) |
| The barriers | `RAIL_GATES[4]` `notch` (needs `cloth`) **across the row at the kink** (−1100.0, −300.0, 13.9); `[5]` `causeway` (needs `lantern`) **at Bell Rock's `ns` halt point** (−50.0, −849.8, 4.0) | Each moved to its leg's frame 1 (step 1); the causeway's view (step 5) |
| The pickup | `RAIL_GRANTS[3]` `lantern` (leg 6) at Lantern Notch's halt point (−1604.5, −987.3, 7.0), which stands 5 m from the arch's south leg | Moved into the arch's opening (step 1) |
| The arrival | `RAIL_ARRIVAL` at the Original Island's halt point (−6.2, −135.0, 4.0), reach 25 m, over 7 m of water; `rail.arrive` accepted only while a causeway train **stands there now**; `Route.arrived` | The marker 12 m past the platforms on the beach; "a train has stood there since the lay" (`Route.reached`) (steps 1, 2) |
| The sim lines | Line 2 (`ns`): [High Gorge, Incline head 1, Bell Rock, Original Island (shut)], fleet `[0, 1, 2]`; line 3 (`bay`): [West landing, Bay head 1, Bell Rock, Canopy head 1, Canopy head 2, Canopy Town, Lantern Notch (shut)], fleets `[0, 1, 2]`, `[2, 2, 3, 3]` | Both legs appended; no new halt index and no new train row (step 2) |
| Canopy Town | `leg3.ts`: platforms in the cleft, the homeward deck round the buffers to the cloth post, **`deck-end` across the row past the buffers**, the Notch barrier's reserve across the row, the board "LINE TO LANTERN NOTCH / LATER"; `CANOPY_CURVE` and `CANOPY_BEACH` baked from the row | Re-laid for the line running on (steps 1, 4) |
| Bell Rock | `leg2.ts`: the lower level in the cut, `ns-bed` and the `ns row` reserve along −60 to 60, the lower east and west platforms, the seeds post | Frame 1, rack 1, the causeway barrier on the lower east platform (step 4) |
| Lantern Notch | Horizon only: the reef (`notch-isle`, 280 × 200 m, top 6 m) and the arch (two 22 × 26 m legs 34 m apart, 58 m tall, with a lantern box on top) | Area `notch`: hidden colliders, platforms (step 4) |
| The Original Island | The classic island at the world origin, live terrain with its POIs, critters and The Boogler; its north beach at z −116 | Area `original`: the island halt's platforms on posts and a ramp to the beach; nothing on the island itself (step 4) |
| The card | None. `src/entities/railway/shared-moment.ts`, `momentBusy()` and the cutscenes plan's `free` gate exist | `src/features/ending-card.ts` (step 6) |
| The loop | `ending` a stand-in | Built nodes (step 7) |

## Design

### The beats, in play order (solo; arithmetic, not measured)

| # | Beat | Where | What gates it | About |
| --- | --- | --- | --- | --- |
| 0 | (Leg 5's end) The Wall is laid; the objective now names the Notch frame at Canopy | High Gorge | | |
| 1 | Ride the Wall line back to its Canopy halt and walk the 290 m through the forest to the bay station; a bay train has brought the Notch's kit from the West landing to rack 1 | Canopy | the Wall laid | 1:50 ride, 52 s walk |
| 2 | Open the Notch barrier at frame 1 (cloth held since leg 3); feed 6 + 6 from rack 1, 10 m away; the section lays | Canopy | `cloth`; the leg open | 5 s, about 10 s, 30 s |
| 3 | Ride on round the curve through the trunks, out over the sea, onto the reef; the arch fills the view as the train pulls in | Lantern Notch | the leg laid | about 60 s and the lay's up-way ask |
| 4 | Walk off the platforms' end into the arch; take the lantern | Lantern Notch | the leg laid | 6 s |
| 5 | Ride the bay line back through Canopy to Bell Rock's upper deck; down the ramp to the lower level | Bell Rock | | about 2:30 and a headway; 20 s |
| 6 | Open the causeway's barrier at frame 1 with the lantern; feed 6 + 6 from rack 1 (the kit has ridden ahead to the Gorge yard and an `ns` train brought it); it lays | Bell Rock, lower east platform | `lantern`; the leg open | 5 s, 10 s, 30 s |
| 7 | Ride an `ns` train 726 m over the shallows to the Original Island | The Original Island | the causeway laid | 50 s and the lay's ask |
| 8 | Off the platform's end, down the ramp onto the beach, press the meeting post: the card comes up for everyone in the room | The island's north beach | a train has stood at the island since the lay | 8 s |
| 9 | (After) Close the card; trains keep running; the world stays open; a later joiner finds the post reading "Arrived" | | | |

About 10 to 14 minutes solo with waits, against area 9's 18-minute stand-in allowance; the checkpoint measures it.
**Co-op:** the lantern and both keys are the room's, so a friend can ride to Bell Rock while another fetches the lantern
and open the causeway's barrier the moment it is taken; 6 + 6 is one carry for two players. **Solo** works end to end on
the room's keys.

### Sync kinds and authority

As legs 3 to 5, with one new saved field:

| Piece | Kind | Authority | Where |
| --- | --- | --- | --- |
| Both legs' halts, ends and fleets | Server (catalog + `Train` rows, none new) | server | `railway-lines.ts` |
| Both legs' rows, the two barriers, the lantern, the arrival | Server (`Leg`, `Route`, since v32) | server | `railway-sys-route.ts` |
| **`Route.reached`**: the tick a causeway train first stood at the Original Island halt after the lay, -1 never | Server, written in the rule tick | server | `railway-components.ts`, `railway-sys-route.ts` |
| Both legs' kit (the Notch minted at the West landing; the causeway minted on line 2, relayed through the Gorge yard) | Server, atomic in the tick's apply | server | `railway-sys-route-kit.ts`, `railway-queries-route.ts` |
| Canopy's re-lay, Bell Rock's sites, the Notch's colliders and platforms, the island halt's platforms and ramp, decks, bents, frames, racks, barriers, the lantern post, the meeting post, levers, boards | Local, from accepted state | each tab | `src/content/levels/`, `src/entities/route-greybox/`, `src/entities/railway/halts-view.ts` |
| The card | Local, on the live `arrived` edge (an accepted `rail.arrive` receipt or the mirrored row watched going from -1 on this page) | each tab | `src/features/ending-card.ts` |

No client lead, classic edit generator, client state registration, `src/world/rules/` file or presence field. Rule
ticks: the room's; saves: the room checkpoint's (`Route.reached` is a new key, covered by the bump). **Ops: none new**
(`rail.gate`, `rail.grant`, `rail.arrive` exist since v32; `rail.arrive` gets its first client intent). **No new
play-record mark.** **Wire:** no new message or field; three reach points move (the two barriers, the lantern) and
`RAIL_ARRIVAL` moves (rule 1), covered by the bump. **Prediction:** `rail.legStock` predicted; `rail.gate`, `rail.grant`
and `rail.arrive` wait for the server (once a leg, once a game). **Receipts:** as today; the card reads the accepted
`rail.arrive` receipt, never the prediction.

### The catalog (step 1)

The rows past Canopy's stop and past Bell Rock's stop are generator data (`dev/level/world-blockout.ts`); nothing of
either is built, so they move freely before the bump. Map coordinates are world metres less `ORIGIN` (x − 1000).
Measured with scratch scripts over the catalog, the map's outlines (`layout(...).land`), `CANOPY_TRUNKS`, the backdrop's
arch and the classic island's `heightAt` (25 November); each figure is held by step 1's test or level artifact.

1. **Canopy: the Notch line leaves round a 42 m curve and runs north between the trunks.** As drawn the bay row turns
   101.8° at the old buffers (−1100, −300) (radius 3.2 m in the track report) and runs south-west with its centreline
   **0.7 m from trunk-8's 12 m collider** (−1167.5, −435.1) and 12.0 m from `wall-cn`. Every 40 m-or-more fillet that
   keeps the drawn outgoing bearing (240°) or anything near it meets mother-4 (−1190, −350) or trunk-7; Canopy's stop
   cannot move (the cleft is leg 3's station, on main). New route from the old kink: **one arc of 42 m radius, tangent
   to the station's straight at s 2425.9 (25 m past the stop; the homeward platform ends 2 m before it), turning right
   from 138.3° to 261°; a straight north at 261° between mother-4 and trunk-8 and out over the isle's north shore; then
   a 300 m arc left onto the drawn final bearing (219.3°) into the reef.** Measured: centreline 10.7 m from mother-4's
   box, 12.3 m from trunk-8's, 34.7 m from mother-3, 38.3 m from `wall-cn`, 51.6 m from `wall-cs` (formation edge 6.9 m
   and 8.5 m clear of the two nearest trunks); the isle left about 374 m past the old kink, 103 m from the Notch ledge's
   map point. 42 m, not 40, so the catalog's chords stay over the 40 m gate (leg 5's Port Quay arc measured 46.43 m
   on 5 m samples and 44.61 m on its chords). Heights: 13 m on the isle, down at 3.9% from the isle's outline to 4 m,
   level over the sea, up at 3.9% to 7 m reached before the reef's outline, level 7 m on the reef (the drawn row's
   heights).
2. **Lantern Notch: the line stops short of the arch.** As drawn the row ends at the arch's centre and its halt point
   is **5.0 m from the arch's south leg** (the backdrop's legs are 22 × 26 m boxes centred 28 m either side of the
   arch's centre on its 270° bearing), so the platforms would stand in it. The row now **ends 40 m short of the arch's
   centre** on the same bearing (buffers at about (−1589.0, −974.7), 18 m from either leg's box); the stop 20 m before
   (about (−1573.6, −962.0)), level on the reef, 61 m inside its outline. The lantern post stands **in the arch's
   opening, 3 m off the south leg's inner face, about (−1620, −986, 6.0)**, on the reef, 33 m (6 s) from the platforms'
   end: seen framed in the arch from the arriving train. **The Notch section measures about 911 m** from Canopy's stop
   to the Notch's (decided "up to about 900 m"; held under 960 m, the Wall's bound).
3. **The causeway's corner eased** with `curves` on the `ns` service (radius 300 m, the generator's fillet) at map
   (−1075, −347), the 20.8° kink at s 1659.4. Tangent points 55 m either side; open sea. The leg passes 10 m off Bell
   Rock's west lobe from s 1185 to s 1263 (its formation 6.2 m from the outline), as the cut's bed does today.
4. **Both ends are crossovers, not balloon loops.** `TURNBACKS`' end turn for `ns` and `bay` becomes `'crossover'`:
   the sim has no loop end (`RailEndKind` names one; no system runs it), a 40 m loop needs about 90 m of ground, and
   neither end has it (the arch on the reef; the classic island's massif at the `ns` loop's planned centre (−38, −104),
   6 m high). Each end's crossover 32 m before its stop (the Gorge's as built), on level track; buffers at the row's end.
   Leg 3's Canopy precedent ("no loop end").
5. **The Original Island halt as drawn.** Its stop (−6.2, −135.0) stands over 7 m of water (classic `heightAt` −7.0), the
   row's end (0, −116) at the shoreline (ground 0.5 m). The platforms (40 m round the stop, 4.9 m decks) stand on posts;
   the beach past the buffers is 2.3 m for 20 m and rises to 8.6 m 40 m on. Unchanged.
6. **Regenerate** (`node --import ./dev/sim/hooks.ts dev/level/world-blockout.ts`): `src/sim/railway-world-lines.ts`,
   `docs/world/world-blockout.html`, `docs/world/rail-map.html`, the map page's rails (`test/world-lines.test.ts`; the
   horizon's causeway lamps follow the `final` line's points). The economy model's reference runs move with the lengths
   ("the economy model follows the ruled route", greybox-route), said in the ship. **Canopy's bakes follow the row:**
   `leg3.ts`'s `CANOPY_CURVE` and `CANOPY_BEACH` (the level check holds them against a fresh bake, so step 1 rebakes them
   and `content/built/levels/canopy.json`, rule 49) and `CANOPY_KINK`'s readers: the `cloth` grant **does not move**
   (held at (−1092.0, −294.0, 13.9) to the centimetre), whatever the generator's leg boundary becomes.
7. **`SPECS`:** `notch-tunnel` and `causeway` gain `built: true` (in step 2's commit if the load checks need it), and the
   causeway `kitAhead: true` ([the rules](#the-rules-step-2)). Cuts: each the destination's stop (one section). Bills 6
   logs + 6 rails, lay 30 s.
8. **Frame 1 and rack 1 of each leg on its from halt's outward platform** (`FIRST_SITE`, leg 5's Port Quay form: rack
   abreast of the kit car of a train standing at the stop, frame 10 m on toward the buffers, 4.8 m right going out,
   0.9 m over the deck; the builder measures the car from the consist, `src/entities/railway/cars.ts`):
   - `notch-tunnel`: rack 1 `rowSide('bay', stop − 700, 480, 90)` about (−1079.3, −324.8, 13.9) and frame 1
     `stop + 300` about (−1086.8, −318.2, 13.9), on Canopy's outward platform (along −33 to 12; along about −7 and +3).
   - `causeway`: rack 1 `rowSide('ns', stop − 700, 480, 90)` about (−54.3, −857.1, 4.9) and frame 1 `stop + 300` about
     (−55.0, −847.0, 4.9), on Bell Rock's lower east platform (along −20 to 20), 10.6 m from the seeds post.
9. **The barriers move to frame 1**: `notch` = `legFrame(notch-tunnel, 0)`, `causeway` = `legFrame(causeway, 0)`, as legs
   2 to 5 moved theirs. Server reach points (rule 1).
10. **The lantern** `RAIL_GRANTS[3].at` the arch's opening (2 above), reach 4 m. **The meeting marker** `RAIL_ARRIVAL`: on
    the beach **12 m past the island halt's platforms' end** along the row's bearing, about (3.7, −104.6, 2.3) (classic
    ground 2.28 m there; no keep-out disc), reach 4 m (was 25 m round the halt point).
11. **New `dev/level/route-leg6.ts`**, registered in `dev/level/check.ts` as `route-leg5.ts` is: the planned points as
    named marks with distances stated (every clearance in 1 to 3; Canopy's curve radius on the catalog's chords at 40 m
    or more; no kink over 2° and no radius under 40 m from Canopy's buffers to the Notch's and from Bell Rock's stop to
    the island's; both sections under 960 m; each rack to its frame under 15 m; the Notch's and the island's platforms
    level; the platforms' outer edges 10 m or more from either arch leg; the lantern inside the opening; the marker on
    classic ground outside every keep-out disc).

### The rules (step 2)

- **When each opens.** `notch-tunnel` opens when the Wall is laid (`after: 5`, on main); `causeway` when the Notch is laid
  (`after: 6`). The fixed order ([question 1](#open-questions)). One leg open at a time; the forge rack and `Rail.depot`
  are shared as for every leg.
- **The lines.** `RAIL_LINES[3]` (bay) becomes `appendLeg(<today's>, 'notch-tunnel', 'Notch head', <the Notch's end
  crossover cm>, [3, 3])`; `RAIL_LINES[2]` (`ns`) `appendLeg(<today's>, 'causeway', 'Causeway head', <the island's end
  crossover cm>, [2, 2])`. One section each: no head, no signal, **no new halt index** (Lantern Notch and the Original
  Island are today's shut halts, now tagged `leg: { slot, section: 0 }`). Canopy Town and Bell Rock are catalog halts and
  never close; their crossovers serve until the lay. Right-hand running; `legPlatforms` at both new halts.
- **The fleets** `[3, 3]` (bay, 3.35 km: about 1.1 km a train, leg 5's ratio) and `[2, 2]` (`ns`, 1.88 km). **No new
  `RAIL_TRAINS` row.** Normal 50-tick dwell. The service health rule ([23
  November](../decisions-rail.md#d-2026-11-23-greybox-service-health)) applies with no new code.
- **The kit.** The Notch's is minted at the West landing by bay trains (`MINT_LEGS[bay]` gains it; Canopy is not the
  line's first halt, so it is not a `STOCKED_LEGS` leg) and unloads on rack 1 at Canopy. Its `after` (the Wall) is on
  another line, so the kit-ahead chain does not run into it: its first kit is owed from the Wall's last lay, while the
  player rides from the Gorge (beat 1). The causeway's is minted on line 2 at the Village, unloaded at High Gorge into
  the `gorge` yard (`LegYard`, as the incline's was), loaded there by `ns` trains and unloaded on rack 1 at Bell Rock.
  **`kitAhead`** (a `Spec` flag, the causeway only): line 2 mints a `kitAhead` yard leg's kit **while its `after` leg is
  open**, into the yard only; its own line's trains still load from the yard only once it is open (`legOpenYard`,
  unchanged). One condition in `legMintChain` and the yard's room in `legKitRoom`; no other leg changes. Without it the
  relay (the Village to the Gorge, then the incline to Bell Rock) would reach rack 1 about 3 to 4 minutes after the
  player, over call 40's "about three minutes" for a first kit; with it the yard is full before the Notch is laid and the
  wait at Bell Rock is an `ns` headway and a 1.1 km ride.
- **The barriers.** `rail.gate notch` opens once `cloth` is held and the Notch leg is open; `rail.gate causeway` once
  `lantern` is held and the causeway is open; each frame refuses out of turn (unchanged rules; the points move).
- **The lantern.** `rail.grant lantern` once the Notch leg is laid (unchanged rule).
- **The arrival.** The train tick sets **`Route.reached`** the first tick a causeway-line train stands at the island halt
  with the causeway laid. `rail.arrive` is accepted at the marker once `reached >= 0` and `arrived < 0`; it sets
  `arrived` once. Today's rule ("a train stands there now") would refuse most presses: the dwell is 50 ticks and the walk
  from the train to the marker about 8 s. This restores the confirmed call's words, "anyone may press once a train has
  stopped there" (call 29).
- **The trade hold** ([order-picks](order-picks.md) definition 1, decided 25 November: "a pick holds while its line is
  building, with one re-pick when the building ends", holding again "until the line builds again"). `SERVED_LEGS` grows
  (the Notch on bay; the causeway on `ns` and line 2), so as written `tradeBuildDone(bay)` and `(ns)` turn false from this
  bump until the room lays leg 6, hours early, and `revOk`'s `rev === 2 && tradeBuildDone` makes every saved or seeded
  room with a re-pick fail the load check. **Rule:** `tradeBuildDone(w, line)` counts a served leg only once it is reached
  (`legReached`), so the line "builds again" when the Notch (bay) or the causeway (`ns`) opens, and only then;
  `revOk` accepts `rev 2` once the line's legs before the ending are laid. One-section legs give Strong no hold
  (`legRailheadHold` needs a second section), as leg 3 recorded.
- **Invariants** (`railway-check-route.ts`): `reached >= 0` only with the causeway laid; `arrived >= 0` only with
  `reached >= 0` (replacing "arrived before the causeway"); the fleets at both new stages; conservation counts the yard's
  ahead kit.

### Controls and copy

No new action, pad slot, key or touch button; every press is Interact through existing prompts, plus the card's Close.
New placeholder copy (none The Boogler's):

- **Objectives**, in `leg2Objective`'s order after the Wall (replacing "Ride home: the next line isn't built yet" there):
  "Open the Notch barrier at Canopy Town (placeholder)" (the leg open, the barrier shut); "Build the line to Lantern
  Notch (placeholder)"; "Take the lantern at Lantern Notch (placeholder)"; "Open the causeway's barrier at Bell Rock
  (placeholder)"; "Build the causeway to the Original Island (placeholder)"; "Ride to the Original Island (placeholder)"
  (laid, not arrived); "Arrived (placeholder)" (after).
- **Prompts:** "Take the lantern" (blocked "The line to the Notch isn't laid yet"); "Open the barrier" (the Notch's
  blocked "After the White Wall (placeholder)" with the cloth, "Needs the glider cloth" without; the causeway's "After
  the line to Lantern Notch (placeholder)" with the lantern, "Needs the lantern" without); "Arrive (placeholder)" at the
  post (blocked "Not yet" until `reached`); the frames' usual "Feed the frame".
- **Posts and boards:** the meeting post reads **"Meeting (placeholder)"** until `arrived`, then "Arrived"; Canopy's
  board "LINE TO LANTERN NOTCH / LATER" reads "UNDER CONSTRUCTION" once the leg opens and goes at the lay; at Bell Rock's
  `ns` buffers a board "LINE TO THE ORIGINAL ISLAND / LATER", "UNDER CONSTRUCTION" once the causeway opens; departure
  boards list the new stops.
- **The card:** "Thanks for playing (placeholder)" and a **Close** button. One card, no other words.

### The massing (steps 4 and 5)

Local, static boxes each tab builds, one instanced mesh an area with real bounds (P3), resident by distance (P1), a
level artifact the flood reads. **Stand-ins only:** no glide, no lit lantern, no meeting, no town at the Notch.

- **Canopy re-laid (step 4, `leg3.ts`).** `deck-end` (across the row past the buffers) goes; the row's reserve extends
  through the curve; the Notch board moves onto the homeward deck beside the cloth post, clear of the curve's swept
  envelope; the Notch barrier's reserve across the row is freed. The cloth post, both platforms and the stand-in town's
  reserve stay. The buffers, the deck past them and the old barrier are the leg view's, gone at the lay.
- **Bell Rock (step 4, `leg2.ts`).** Reserves for rack 1, frame 1 and the causeway barrier on the lower east platform; the
  `ns-bed` stays; the causeway's deck past along 60 is the leg view's.
- **Lantern Notch (step 4, new `leg6.ts`, area `notch`).** The reef's outline as a hidden collider at 6 m (a rock shelf
  round it, so a swimmer climbs out), the arch's two legs as hidden boxes matching the backdrop's (22 × 26 m, 58 m), two
  40 m platforms at the stop (deck 7.9 m) with steps down to the reef each side and at the buffers' end.
- **The Original Island halt (step 4, `leg6.ts`, area `original`).** Two 40 m platforms on posts over the water, and a
  ramp from their landward end down to the beach (2.6 m at the Ring ramps' pitch). **Nothing on the classic island**: no
  massing, no collider on its ground, no POI or keep-out edit, no change under `src/island/`, `src/boogler/` or
  `src/world/boogler-*` ([question 3](#open-questions)).

### Solids near players

Every solid that switches on near a player (each lay's deck, both new halts' platforms, a frame, a rack, the old
buffers' removal at Canopy) **uses `liftOrWait`** (`src/prefab/instantiate.ts`) and the shared clearance in
`src/place/sites.ts`; do not write another (rules 36, 67). The meeting post and the lantern post have no collider. The
two new areas mount as ordinary statics at their `coverNear` distance; Canopy and Bell Rock are already resident areas, so
their new static pieces arrive with a page load.

## Beside the garage and the shared pool

| Where they touch | What leg 6 does | What it leaves to them |
| --- | --- | --- |
| Quick or Strong on bay and `ns` | The hold counts only reached legs, so the trade holds again only while the Notch or the causeway builds ([the rules](#the-rules-step-2)); one-section legs give Strong no hold | The trade's own tuning |
| The market at Bell Rock | No stall (ruling 2's fixed table has no ending row) | Nothing |
| Hub towns | No town at the Notch or on the island | The stand-in towns plan |
| The Boogler and the classic island | Nothing touched; the post has no collider | The ending's depth plan, the meeting, his copy |

## Steps

Each step leaves `node dev/ship-check.ts` green. **Steps 1 to 3 ship together as the leg's bump.** Every review of steps
1 to 3 (src/sim, src/world) is an independent one before merge, by the row `npm run models` gives at the time. Each
step's **brief lines** are the state file's "Rules learned" that apply; the orchestrator copies them into the brief.
Every brief starts with `git fetch origin` and `git checkout -B <branch> origin/main` (rule 66), uses Node 26 and
`UNIT_ONLY=<files> node dev/test-unit.ts` (rule 6), and says no `git stash` (rule 11) and no `--no-verify` (rule 46).

- [ ] **1. The catalog (M to L; "High-risk implementation").** Files: `dev/level/world-blockout.ts` (`TURNBACKS` ends for
      `ns` and `bay`; the bay service's Canopy re-route as named points and arcs; the Notch's shortened end; the `ns`
      service's `curves`; heights), regenerated `src/sim/railway-world-lines.ts`, `docs/world/world-blockout.html`,
      `docs/world/rail-map.html`, the map page's rails; `src/sim/railway-route.ts` (`FIRST_SITE['notch-tunnel']` and
      `['causeway']`, the two gates at frame 1, the lantern, `RAIL_ARRIVAL`, `kitAhead` on the causeway's `Spec`; the cloth
      pinned); `src/content/levels/leg3.ts` (`CANOPY_CURVE`, `CANOPY_BEACH` rebaked) and `content/built/levels/canopy.json`;
      new `dev/level/route-leg6.ts`, registered in `dev/level/check.ts`. Verify: `test/railway-route.test.ts` (both legs
      one section, the Notch's under 960 m; the gates equal `legFrame(…, 0)`; the lantern inside the arch's opening; the
      cloth unchanged; the marker 12 m past the platforms); `test/world-lines.test.ts` (no future span over 4%; the map
      rails); `npm run level-check`: the bay row's 101.8° kink, its 3.2 m radius and its other "planned, would fail" lines
      gone, the `ns` row's 20.8° gone; `route-leg6`'s clearances as [above](#the-catalog-step-1); every leg 3 Canopy line
      still "ok"; no new report elsewhere.
      **Brief lines:** rule 1 (four reach points move: say so in the ship; server and client ship together); rule 15
      (the bump is step 2's); rule 49 (`npm run level-check` as well as the ship check: the bake check and `route-leg6`
      run only there); rule 40 (the built level JSON is in the file list); rule 42 (stop only at `server/`, `src/net`,
      or a WORLD_NS-pinned fixture outside this step's list); rule 8 (a new test file only where lockstep: none here,
      cases go in the existing route tests).
- [ ] **2. The rules and the bump (L; "High-risk implementation", high for the fuzz).** Files: `src/sim/railway-lines.ts`
      (both `appendLeg`s, fleets); `src/sim/railway-components.ts` (`Route.reached`); `src/sim/railway-sys-route.ts`
      (`reached` in the tick; `arrive`); `src/sim/railway-queries-route.ts` (`legMintChain`'s `kitAhead`,
      `legKitRoom`, `tradeBuildDone` by reached legs); `src/sim/railway-check-route.ts`, `railway-check-steel.ts`
      (`revOk`); `src/world/namespace.ts` (the bump, [below](#the-world-bump)); fixtures and golden shards in the same
      commit (rule 15). Verify: new `test/railway-leg6-rules.test.ts`: the Notch's kit rides a bay train to Canopy's rack
      and is never stocked; the causeway's kit fills the Gorge yard while the Notch is open and reaches Bell Rock's rack
      only once the causeway opens; `rail.gate notch` refused without `cloth`, before the Wall, and at the old kink point,
      opened at frame 1; `rail.gate causeway` likewise with `lantern`; `rail.grant lantern` refused before the lay and at
      the old halt point; `rail.arrive` refused before `reached`, accepted after the train has left, refused a second
      time; `reached` set once; the trade: a bay or `ns` room at rev 1 may re-pick before the Notch or causeway opens and
      is refused while it builds, a rev 2 room passes the load check at every leg 6 stage; leg 3 and 5's tests unchanged
      in outcome. **A host test (rules 23, 37)** in `server/test/railway-steel-host.test.ts` (where deep-span's is) sends
      `rail.gate notch`, `rail.grant lantern` and `rail.arrive` as real `r:edit`s at the new points (accepted) and the
      old ones (refused). **The service fuzz** (`test/helpers/railway-route-rules.ts`, a bay and an `ns` group in their
      own shard): lever calls at 75% headway over each line's new stage, settled and growing, with save and restore; its
      default run timed on HOTBOX under a quarter of its budget (rule 60); the long run (`ROUTE_GATES=1`, seeds `c0ffee`,
      `777`, `5eed`, `badd`, 20,000 ticks a mode) pasted into this plan before the bump ships, with leg 3's and 5's long
      suites re-run beside it. `npm run loop -- run`.
      **Brief lines:** rule 14 (line 2 carries the causeway's kit ahead: the proof includes the footing wagon's arrival
      trip by trip and every footing delivery tick on line 2, before and after); rules 19 and 20 (a probe copies the
      fuzz's printed figures and ask rate; a bound shown on four seeds is tried on 24 to 48 before it is reported to the
      owner); rule 52 (the whole server suite, `RAIL_AUDIT=1` for timings, rule 64); rule 55 (`npm run test:net`: the
      seeds and goldens move); rule 61 (the boot probe on the built site: halts gain leg tags and lines new fleets);
      rule 33 (assertions and fixtures change: `--reviewed` after review).
- [ ] **3. Seeds and stages (S; "High-risk implementation").** Starts on leg 5 step 6's reviewed tip, or on main once it
      lands, whichever is first (rule 74); it rebases onto main before it reports. `src/sim/railway-seed-legs.ts` from
      `wall-closed`, accepted ops only, each wrapped in `need` (rule 53): `notch-open` (the Wall laid, the Notch's kit on
      Canopy's rack, the barrier shut), `notch-reached` (the Notch laid, the lantern not taken), `causeway-open` (the
      lantern taken, the causeway's barrier open, its kit on Bell Rock's rack, nothing fed; the route plan's jump link),
      `island-reached` (the causeway laid, a train has stood at the island, not arrived: the rejoin proof's state),
      `arrived`. `SEED_STAGES` and its golden shard; `src/world/railway-jump.ts` rows (`notch-reached` on the Notch's
      platform facing the arch; `causeway-open` on Bell Rock's lower east platform facing the barrier; `island-reached`
      on the island's platform; the others on the spawn until step 5's stills, leg 3's reason). Verify:
      `test/railway-jump.test.ts`; each stage's invariant check; the whole server suite and `npm run test:net` (rule 55).
      **Brief lines:** rules 53, 55, 74, 15 (the golden moves inside the bump).
- [ ] **4. The massing: Canopy, Bell Rock, the Notch and the island halt (M; "Player-visible implementation").** Files:
      `src/content/levels/leg3.ts` and `leg2.ts` (as [above](#the-massing-steps-4-and-5)), new `src/content/levels/leg6.ts`
      (`notch`, `original`), `content/built/levels/` for each, new `src/entities/route-greybox/massing-notch.ts`, registered
      in `index.ts`'s `AREAS` and `leg2-layout.ts`'s `AREA_CENTRES` with their `coverNear` distances;
      `dev/level/route-leg3.ts`, `route-leg2.ts` and `route-leg6.ts` (floods: Canopy's outward platform to frame 1 and
      the homeward deck to the cloth post with the deck-end gone; Bell Rock's ramp foot to frame 1 over the `ns` bed; the
      Notch's platforms to the lantern spot; a swimmer onto the reef and onto the island halt's ramp; the island's
      platforms down the ramp to the marker spot). Cases in the existing prefab tests (rule 36); the hand-kept lists
      (rule 41). Verify: the full `node dev/ship-check.ts origin/main HEAD` (not `--unit-only`, rule 41);
      `npm run level-check`: every leg 2 and 3 line still "ok", the new floods "ok", every reserve clear; `.look/`
      stills: Canopy's outward platform toward the curve with the deck-end gone; Bell Rock's lower east platform from the
      ramp's foot; the Notch's platforms toward the arch; the island halt from the beach.
      **Brief lines:** rule 36 (no new unit test files; `src/place/sites.ts`'s clearance, use it, do not write
      another); rule 40 (records: `src/content/prefabs`, `src/content/levels`, the compiled JSON from `npm run prefabs`;
      list every scope wall in one report); rule 41 (the stub builder maps in `test/prefab-workshop.test.ts`,
      `test/prefab-gorge.test.ts`, `test/prefab-leg2.test.ts`, the record lists in `test/prefab-portability.test.ts`; a
      mesh on terrain against every far-ground level); rule 42 (stop only at what the server, the sim or saved state
      reads; walk colliders are view work; check an area clears a player standing in it before making it solid); rule
      49; rule 67 (lift a player within a small step of a new solid's top, otherwise leave it off until clear; never push
      sideways, never move a player to a spot with no ground, never switch a solid off on contact); rule 32 (at most
      about 16 stills, 1200 px); rule 58 (`/simplify` before reporting; its subagents are allowed). Rule 43 does not apply
      (no doorway).
- [ ] **5. Leg 6's views (M to L; "Player-visible implementation").** Files: `src/entities/route-greybox/leg-view.ts`:
      both legs as row legs (deck, rails and sea bents from `laid`, Canopy's curve and the trunks' gap, frames with bill
      and plate, racks, buffers and boards, the lantern post (lit once the leg is laid, gone once taken), the meeting post
      and its two readings), the two barriers at frame 1 (the old Notch barrier at the kink goes), `LEG_OBJECTIVES`' lines
      and `leg2Objective`'s order, the prompts and blocked reasons; `src/adapters/railway-intents.ts`: the arrive act
      (`railway-leg-arrive`) beside the grant and gate acts; `src/entities/railway/halts-view.ts`: levers and boards at
      Lantern Notch and the Original Island; every solid that switches on near a player through `liftOrWait`.
      `docs/game-design/place.md` updated. **Rule 53:** the objective after the Wall and the Notch barrier's prompt change
      here, so this branch runs `dev/look/bots/railway-legs.ts`, its eval, `dev/loop/run.ts` and step 3's seeds; it
      follows leg 5 step 6, which owns those files now. Verify: the full ship check; `npm run level-check`; `.look/`
      stills: from a bay train leaving Canopy round the curve, between the trunks, over the sea toward the arch, pulling
      in with the lantern framed in the arch; the causeway from Bell Rock's lower level and from an `ns` train over the
      shallows; arriving at the island; the post before and after; mesh and collider counts with each new area resident
      and not; every prompt pressed once on a real local server (rule 24); the boot probe (rule 61).
      **Brief lines:** rules 36, 40, 41, 42, 53, 61, 67, 32, 58, 24.
- [ ] **6. The card (S to M; "Player-visible implementation").** Files: new `src/features/ending-card.ts` (and its CSS):
      the plug-in contract ([plugins](../agents/plugins.md)); a Local DOM card on the live `arrived` edge (the accepted
      `rail.arrive` receipt through the railway adapter, or `Route.arrived` watched going from -1 on this page), never on
      a reload, a refill or a late join (`src/entities/railway/shared-moment.ts`'s contract); for every page in the room at once. For the
      presser it is the ordinary card (Interact or Close puts it away after 1.5 s); for everyone else it shows with a
      Close button and **holds no input** (call 29: "takes no input from players elsewhere"). It waits for the
      cutscenes plan's `free` gate and while `inputState.held` is set by anything else (rule 51: a talk box, the garage
      panel, the fall). Verify: the full ship check; a two-player look at `island-reached` (one presses, both see it; the
      other keeps walking under it; a third tab opened after sees no card and the post reads "Arrived"); a reload after
      the card shows none. **Brief lines:** rules 51, 53 (the bot closes the card), 36, 24, 58, 10 (two-player warp looks
      need `--warp-speed 2`).
- [ ] **7. The bot and the loop (M; "Implementation from a brief or an approved plan").** Follows leg 5 step 6 (it owns
      these files today; rule 63). Files: `dev/loop/graph.ts` (`notch-gate`: `rail.gate`, requires `wall-6` and `cloth`;
      `notch-1`: `legSection` on `notch-tunnel`, `KIT_BY` "a bay train from the West landing", `stops: ['notch']`;
      `lantern`: `rail.grant`; `causeway-gate`: requires `notch-1` and `lantern`; `causeway-1`: `legSection` on
      `causeway`, `KIT_BY` "an `ns` train from the Gorge yard"; `arrive`: `rail.arrive`, `stops: ['original']`;
      `GENERIC_OPS` and `ACTIVITY_MARKS` unchanged, the file listed); `dev/loop/standins.ts` drops `ending` (no stand-in
      left); `dev/loop/run.ts` (`ROUTE_PRESS` for the two gates, the lantern and the arrival); `dev/look/bots/railway-legs.ts`
      (after the Wall: the cave line to Canopy, the walk to the bay station, the barrier, the feed, a bay train to the
      Notch, the lantern, the bay line to Bell Rock, the ramp, the barrier, the feed, an `ns` train to the island, the
      post, Close; `--from wall-closed` a leg seed); `dev/look/segments.ts` (`RAIL_STOPS.ending`, `LEG_STOPS`). Verify:
      `npm run loop -- node notch-1` and `-- node arrive`; `npm run loop -- run` (no stand-in reported);
      `npm run playthrough -- --from wall-closed --to ending`; `test/loop-graph.test.ts`.
      **Brief lines:** rules 63, 22 (no edits while a bot run is in flight; read `verdict.json` yourself), 53, 74, 10, 5
      (at most three looks at once on HOTBOX).

### Checkpoint F (leg 6 playable)

After steps 1 to 7 are on main; named proofs, once, with the tools as Checkpoint E left them:

- [ ] `npm run loop -- run` for one to three players: `idle s` per node (`notch-gate`, `notch-1`, `lantern`,
      `causeway-gate`, `causeway-1`, `arrive`), area 9's minutes beside its 18, the whole route's with no stand-in; any
      wait over 60 s with nothing to do is a finding for the designer (the Notch's first kit and the causeway's are the
      ones to read).
- [ ] The bot segment `--from wall-closed --to ending`: a pass verdict, the load noted.
- [ ] `npm run test:net`, with `railwayLegRejoin` (`dev/peer-test/ws-railway.ts`) taking the ending at `island-reached`:
      the seed doc written before any page opens; a second tab joins; one presses the post and both see the card; the
      presser leaves, the server restarts, it rejoins; `Route.reached` and `Route.arrived` exact at every checkpoint, no
      card replayed, the post reads "Arrived" (the route plan's rejoin proof for `arrived`).
- [ ] Steps 4 to 6's stills on one sheet.
- [ ] `npm run perf -- --view ending` (a `PLACES` row: seed `island-reached`, the body on the island's platform, the
      camera along the causeway to Bell Rock) and `-- --view notch` (seed `notch-reached`, the camera into the arch), each
      also `--hardware --seconds 10`, the load noted.
- [ ] The boot probe on main after step 7 (rule 61); the fuzz's long run if a rule changed after it.
- [ ] A device line on the Mac, reported, not a gate (taken when the Mac is next open).

**After this plan:** greybox-route's exit evidence (section 7: the bot from wake to `arrived` with no skip, the
measured table, the empty-room proof) and its order row "Leg 6 → the exit table, the device runs" are that plan's, run
once on Checkpoint F's main; then the owner's whole ride from https://boogle.club/?from=ring-joined. No bump between the
day leg 6 ships and his whole ride (route review, "Save resets").

### Order, and what waits

| Step | Needs on main first | Why |
| --- | --- | --- |
| 1, 2 | Nothing; they may start now | Catalog and rules; no shared file with leg 5 step 6 but the seed goldens, which step 2 regenerates after rebasing |
| 3 | Leg 5 step 6 (its reviewed tip is enough, rule 74) | Both edit the seeds and their golden |
| 1 to 3 ship | Leg 5 step 6 on main | The bump's goldens are regenerated on top of step 6's |
| 4 | Step 3 | Canopy is re-laid round track that now exists |
| 5 | Step 4 and leg 5 step 6 | The views draw step 4's areas; rule 53's bot and loop files are step 6's |
| 6 | Step 5 | The card follows the post's press |
| 7 | Step 6 and leg 5 step 6 | The bot presses the post and closes the card; graph.ts and the bot are step 6's |

**Between the bump and step 5** rooms past `wall-closed` have the Notch open: a bay train unloads its kit onto rack 1 at
Canopy, the barrier there is the old one at the kink (step 5 moves it), and the objective still says "Ride home".
Production prebuilds the jump rows, so `?from=causeway-open` runs `ns` trains over undrawn track until step 5, as legs 3
to 5 did. Worth knowing before a playtest.

### Left out

The glide from the Canopy ledge to the arch, lighting the lantern (and the horizon's causeway lamps answering), the
meeting with The Boogler and anything he says or does, a post-game twist (an [idea](../ideas.md)), a town at the Notch
or on the island, the mainland city from the Notch's telescope, freight or riders on either leg, the halt map drawing
the bay or `ns` lines, the exit table. Each is a later plan's or the owner's.

## The world bump

**Needed: one, in step 2's commit, covering steps 1 to 3.** The next free number is v72 unless another ships first; two
share one only if both are review-clean in the same batch, and none waits for another ([Nothing waits on a world
bump](../agents/owner-calls.md#no-bump-hold)). Ship outside the owner's sessions (`npm run heartbeat` first). Why: a new
saved field (`Route.reached`); both lines' rows past Canopy and Bell Rock move and their halts gain leg tags and ends;
four reach points move (rule 1, said in the ship); the trade hold's rule and `revOk` change; the golden shards and seeds
move (rule 15). Against "two planned, six at most": the route's sixth and last inside the ceiling (G1, v62, v66, v70,
v71, this); G2's reserve is not taken (no catalog row is added or reordered: both legs and every halt exist since G1).

## Level findings

`npm run level-check` ran on 25 November (main `3db6cbf36`, world v71; the two commits since are docs): **25 reports, no
failure, 74 s.** Every leg 2 to 5 line is "ok" (Bell Rock's two levels, Canopy's floods and reserves, the Wall). The
check does not yet walk the Notch, the island halt or the Canopy curve (no artifact exists; step 1 adds `route-leg6`), so
the rest was measured with scratch scripts over the catalog (`WORLD_LINES`, `rowSide`), the map's smoothed outlines
(`layout(...).land`), `CANOPY_TRUNKS`, the backdrop's arch boxes and the classic island's `heightAt`, and is read against
the report:

1. **The track report's leg 6 lines.** `bay-centre [later]` (3,311 m): 4 kinks over 2°, the worst **101.8° at s 2426
   (−1100, −300)**, with "radius 3.2 m (under 40)" and "straight into a 3 m curve within 10 m, no easing" there, all
   "planned, would fail"; the other leg 6 kink is 20.7° at s 3119 (−1472, −878). `ns-centre [later]` (1,902 m): 2 kinks,
   **20.8° at s 1659** on the causeway and 20.7° at s 1036 on the built incline (leg 2's, not this plan's). Both rows'
   planned loop ends (`ns-loop-end`, `bay-loop-end`) pass as loops; step 1 makes them crossovers, so both go.
2. **The drawn Notch line through Canopy's forest**: centreline 0.7 m from trunk-8's 12 m collider at (−1174, −429)
   (formation inside it), 12.0 m from `wall-cn` at s 2466, 46.3 m from mother-4; the isle left at s 2765. Re-routed in
   step 1 (1).
3. **Every 40 m-or-more curve from the old buffers** onto bearings 225° to 265° meets mother-4 or trunk-7 or trunk-8
   (scratch search over radii 40 to 60 m): the corridor between mother-4 (−1190, −350) and trunk-8 (−1167.5, −435.1) is
   the one way north, at a bearing of 256° to 262°. Chosen: 42 m, 261° (10.7 m and 12.3 m to their boxes).
4. **The drawn end at the arch**: the current halt point (−1604.5, −987.3) is 5.0 m from the south leg's box; the row's end
   is the arch's centre. Shortened in step 1 (2): buffers 18 m from either leg.
5. **Section lengths**: the Notch as drawn 889.7 m (Canopy's stop to the Notch's); re-routed about 911 m. The causeway
   726.3 m (the fillet takes about 1 m). **Unproven** until step 1 regenerates.
6. **The causeway past Bell Rock**: 10 m off Bell Rock's west lobe (centreline to outline) from s 1185 to s 1263, then open
   sea; it meets the classic island's beach at its end.
7. **The Original Island halt**: over 7 m of water at the stop (−6.2, −135.0); the row's end at the shoreline (0.49 m);
   the beach 2.28 to 2.93 m from 4 to 24 m past the end, 5.31 m at 32 m, 8.59 m at 40 m; no keep-out disc on that line
   (`keptOut` false); the lighthouse POI 46 m on at (6, −58); the halt inside the classic critter zone (160 m). The
   marker spot (3.7, −104.6) is at 2.28 m.
8. **Frames and racks**: Bell Rock's rack 1 (−54.3, −857.1, 4.9) and frame 1 (−55.0, −847.0, 4.9) on the lower east
   platform, which the report reaches "on foot from the lower west platform" (and so from the ramp); Canopy's rack 1
   (−1079.3, −324.8, 13.9) and frame 1 (−1086.8, −318.2, 13.9) on the outward platform (along about −7 and +3); the cloth
   post (−1092.0, −294.0, 13.9) stays on the homeward deck, outside the new curve.
9. **The Notch**: the stop 61 m inside the reef's outline; the climb to 7 m done before the outline (the reef's top is 6
   m); the lantern spot inside the arch's 34 m opening.
10. **Early reach** (route contract). The Original Island is the classic island, about 940 m across the bay from the
    Village and walkable today: a swimmer stands at the marker from minute one, and the post refuses ("Not yet") until a
    train has stood there after the lay. The Notch reef is a 700 m swim from Canopy's west shore; the lantern refuses
    until the Notch leg is laid. Neither Canopy's 13.9 m deck nor Bell Rock's 15.9 m upper deck glides anywhere near
    either. Both barriers refuse without their key and out of turn. Movement skips distance, never the work.
11. **The old Notch barrier's reserve across the row and Canopy's `deck-end`** lie on the new formation (the curve starts
    at the old buffers): step 4 frees both.

## Risks

- **Room safety.** Every transfer in a system inside the tick's apply; `reached` written in the rule tick from replicated
  train rows, no wall clock, no `Math.random`; the card and the posts' effects play from accepted receipts or mirrored
  changes in the adapter, never in a system; the card never fires on a refill or a late join.
- **Mixed builds.** Dev phase: the break is the bump with its dated line; four reach points are server checks (rule 1);
  server and client ship together; shards regenerated in the same commit.
- **The trade hold** is the one rule that reaches outside leg 6: `tradeBuildDone` and `revOk` change for every bay and
  `ns` room. Step 2's tests hold the garage's seeds and every leg 3 and 5 outcome; the garage step 4 Checkpoint's
  figures are re-read, not re-run.
- **Line 2's kit**: `kitAhead` puts the causeway's kit on line 2's kit cars while the Notch builds; rule 14's wagon
  proof covers it.
- **Canopy's 42 m curve** is the tightest on a greybox line past the Gorge, starting 25 m past a stop; trains are slow
  there (from a stand, about 11 m/s at the curve), and the sim has no curve speed. Drawn sway is the views'.
- **The classic island** is live terrain with The Boogler on it. Nothing is placed on its ground but a post with no
  collider; his server-owned walk (`src/world/boogler-brain.ts`) is not touched. He may wander within the post's reach,
  where his talk prompt and "Arrive (placeholder)" both offer Interact: the interaction registry's nearest-first rule
  decides; step 5's look presses both.
- **Hot files.** `railway-lines.ts`, `railway-route.ts`, `railway-queries-route.ts`, `world-blockout.ts` and its generated
  files, `leg2.ts`, `leg3.ts`, `leg-view.ts`, `route-greybox/index.ts`, `halts-view.ts`, `railway-legs.ts`, `graph.ts`,
  the seeds. Leg 5 step 6 holds the last three today.
- **Lockstep.** Integer cm and ticks; the re-routes are generated integers at authoring time.
- **Performance.** About 1.6 km of deck with sea bents, two areas of hidden colliders, two platforms each; no new train.
  Reported by `npm run perf` and the harness's counts; not a reason to cut anything without the owner's word.

## Design review (2026-11-25)

The planner's own review, in the same sitting (owner call "Fold roles into the builder", 16 November); the plan was
reread from the top before sorting. **Read:** DESIGN.md; owner-calls' index; the core loop, rail and controls Current
rules and the entries cited below, with the archive's rows of the greybox route's calls (all confirmed on 16 November in
the batch-2 bulk confirmation, the ending's row by the ranked calls); docs/direction.md's phase line (the route, rough,
to the ending); docs/playtests.md (no session on the greybox past leg 2); the research above; the level report and the
scratch measurements; `npm run loop -- node ending`. **Seen:** numbers only. **Not seen:** any still; no massing exists
for the Notch or the island halt, so the curve, the arch and the beach are judged from the map data, the backdrop's
boxes and the classic island's heights.

**Flow, beat to beat:**

- *The next goal can be found.* After the Wall the Notch frame is a ride away and out of sight: the route plan's named
  exception (change 5); the objective names it and Canopy's board, in view since leg 3, now reads "UNDER CONSTRUCTION".
  At the Notch the lantern stands framed in the arch as the train pulls in. After the lantern the causeway's barrier is
  at Bell Rock, the market hub, the one planned change; the objective names it; the island has been in view since minute
  one.
- *A gate keeps its meaning.* The Notch barrier takes the cloth held since leg 3 and refuses before the Wall with its true
  reason; the causeway's takes the lantern; the post takes a train's arrival. A swimmer reaches the reef and the island
  early and every post refuses ([finding 10](#level-findings)).
- *Nobody is stranded.* Trains run both ways from every open halt; the reef and the island halt have steps or a ramp to
  ground and the sea; the classic island is walkable and swimmable; the keys are the room's.
- *Lenses.* "Ending a beat facing the next": the Notch beat ends at the arch with the lantern, and the ride back to Bell
  Rock is the long way once, the route review's accepted exception. "The key in sight of the lock": the cloth's post
  stands 10 m from the Notch frame (leg 3); the lantern is a ride from its lock, which the objective covers. "A place to
  meet": Bell Rock, where a friend can wait with the lantern's lock while another fetches it. "A world that shortens
  behind you": the island the room started across the bay from is now one change from everywhere.
- *First meeting.* The ending's first sight is the island from minute one and the horizon's lamps over the shallows; the
  stand-in adds the causeway's deck growing from Bell Rock toward it.
- *Solo and co-op.* Solo works on the room's keys. Co-op splits naturally at the lantern. A friend who joins late at Home
  is a long ride from the Notch but one ride from the island once the causeway is laid, and finds the post reading
  "Arrived" after: no card, as decided.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Every step a mechanism or a system on blockout geometry; every label a placeholder | Decided | Owner call [greybox before detail](../agents/owner-calls.md#mechanisms-systems-greybox-details), 11 November |
| 2 | The ending is back on the Original Island with The Boogler; the meeting is the ending; his story, lines and names are his | Decided | [The ending](../decisions-core-loop.md#d-undated-the-ending); [12 November](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered) (3) |
| 3 | After the finale the world stays open | Decided | [After the finale](../decisions-core-loop.md#d-undated-after-the-finale) |
| 4 | The causeway is the `ns` row grown from Bell Rock; the Notch the bay row grown from Canopy; five services | Decided | [Rail map, 10 November](../decisions-rail.md#d-2026-11-10-open-calls-answered-the-rail-map) (route call 3) |
| 5 | One fixed order: the Notch opens once the Wall is laid, the causeway once the Notch is; one leg open at a time | Decided | [12 November](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered) (1); [16 November](../decisions-rail.md#d-2026-11-16-batch2-fixed-order-branch-wayfinding). The live "Order as the choice" question: question 1 |
| 6 | The Notch frame takes `cloth`; the `lantern` at the Notch opens the causeway's barrier at Bell Rock; a barrier opened by anyone once the room holds the key | Decided | Route calls 23 and 24, confirmed 16 November ([batch-2 bulk](../decisions-rail.md#d-2026-11-16-batch2-bulk-confirmed)) |
| 7 | A grant is the whole room's | Decided | Shared progression, 6 November (route call 7) |
| 8 | Each ending leg one section of 6 logs + 6 rails, about 30 s to lay; sections end at a place, up to about 900 m | Decided | [16 November](../decisions-rail.md#d-2026-11-16-batch2-greybox-section-length-and-lay-time); route review ruling 1.5, confirmed (bulk) |
| 9 | The ending: a marker 12 m from the island's platform, anyone may press once a train has stopped there, a card with Close for everyone that takes no input from players elsewhere, a late joiner reads "Arrived" | Decided | Route call 29, [confirmed 16 November](../decisions-core-loop.md#d-2026-11-16-ranked-calls-confirmed); the card itself the owner called undecided on 12 November: question 2 |
| 10 | Shared moments play for everyone in the room | Decided | [10 November](../decisions-controls.md#d-2026-11-10-shared-moments-play-for-everyone) |
| 11 | Ends have buffers and read as terminals; double track; no kinks; trains stop on request, a lever each platform side, right-hand running | Decided | 10 November (route call 9); [10 November](../decisions-rail.md#d-2026-11-10-trains-stop-on-request-at-the); [18 November](../decisions-rail.md#d-2026-11-18-decisions-page-rail) |
| 12 | A first ride to a new stop needs no change; the one planned change is at Bell Rock for the last leg | Decided | [Junction answers](../decisions-rail.md#d-2026-11-10-big-junctions-are-designed-stations-not) (route call 11) |
| 13 | Spacing and holds by the service health rule | Decided | [23 November](../decisions-rail.md#d-2026-11-23-greybox-service-health) |
| 14 | `rail.legStock` predicted; the gates, the grant and the arrival server-confirmed | Decided | [16 November](../decisions-rail.md#d-2026-11-16-batch2-greybox-stock-is-predicted) |
| 15 | Live for everyone, grey and labelled, the leg shipped whole | Decided | [12 November](../decisions-rail.md#d-2026-11-12-ring-island-build-2-and-the-greybox-route-answered) (4); [13 November](../decisions-rail.md#d-2026-11-13-greybox-route-open-in-the-shared-room) |
| 16 | A Quick or Strong pick holds while its line builds, one re-pick when the building ends, held again when it builds again | Decided | [25 November](../decisions-core-loop.md#d-2026-11-25-order-picks-answers) (3), order-picks definition 1 |
| 17 | The Notch line leaves Canopy round a 42 m curve from the old buffers and runs north between mother-4 and trunk-8 (10.7 and 12.3 m to their boxes), then a 300 m curve onto the drawn bearing into the reef | Default | Findings 2 and 3; Canopy's station is leg 3's and the trunks are the horizon's. Question 4 |
| 18 | The Notch line ends 40 m short of the arch's centre, buffers 18 m from its legs; the lantern stands in the arch's opening, 33 m (6 s) from the platforms | Default | Finding 4; "the arch's foot, off the platform" (route review, area 9). Question 4 |
| 19 | The Notch section about 911 m, held under 960 m | Default | Call 8's "about 900 m"; the Wall's 950.69 m precedent ([agent call](../agent-calls.md#rail-construction-levels-and-travel), 25 November) |
| 20 | The causeway's 20.8° corner eased with a 300 m arc; it passes 10 m off Bell Rock's west lobe | Default | Call 11 met rather than pinned; leg 5's corners |
| 21 | Both new ends are crossovers 32 m before the stop; no balloon loops | Default | The sim has no loop end; no room at the arch or on the island; leg 3's Canopy |
| 22 | Frame 1 and rack 1 on each from halt's outward platform, 10 m apart, rack abreast of the kit car; both barriers move to frame 1 | Default | Legs 2 to 5's form; Port Quay's 10 m |
| 23 | Fleets: bay `[3, 3]`, `ns` `[2, 2]`; no new train row | Default | About a train per 1.1 to 1.3 km (leg 5); the fuzz measures it |
| 24 | The Notch's kit by bay train from the West landing; the causeway's relayed line 2, the Gorge yard, an `ns` train; the causeway's kit rides ahead into the yard while the Notch builds (`kitAhead`) | Default | The catalog's kit rows (G1); ruling 1.4's kit ahead; call 40's three minutes for a first kit |
| 25 | `rail.arrive` takes "a train has stood at the island since the lay" (a saved `Route.reached`), not "a train stands there now" | Default | Restores call 9's words; the built rule would refuse most presses (50-tick dwell, about an 8 s walk) |
| 26 | The trade holds again only once a leg on its line is reached (the Notch for bay, the causeway for `ns`), not from the bump; `revOk` accepts a re-pick made before the ending | Default | Call 16's "until the line builds again", read for a leg not yet open; the built rule would hold every bay and `ns` trade from leg 6's bump until it is laid |
| 27 | The meeting post on the beach 12 m past the island halt's platforms, no collider, reach 4 m, "Meeting (placeholder)" then "Arrived"; a ramp from the platforms to the beach | Default | Call 9's 12 m; the beach's heights (finding 7) |
| 28 | Copy: seven objective lines, the prompts and blocked reasons, two boards, the card's "Thanks for playing (placeholder)" and Close ([Controls and copy](#controls-and-copy)) | Default | Placeholder copy, none The Boogler's |
| 29 | Seeds `notch-open`, `notch-reached`, `causeway-open`, `island-reached`, `arrived`; jump rows at the Notch, Bell Rock's lower east platform and the island | Default | Legs 3 to 5's step 3 pattern; the route plan's `causeway-open` link |
| 30 | **The Original Island is the classic island as it stands: the causeway ends at its north beach; no blockout massing, no collider, POI or keep-out edit on it** | **New** | Departs from confirmed route call 30 ("the island is blockout massing, not the classic terrain"), which assumed the classic geometry was not loaded; it is live there, with The Boogler. Question 3 |
| 31 | The rejoin proof for `arrived` at `island-reached` | Default | The route review's "rejoin proofs where a component first appears" |
| 32 | No market stall for the ending | Default | Ruling 2's fixed table has no ending row |

**Counts:** 16 Decided, 15 Default, 1 New. Every Default and New call is logged in
[agent-calls](../agent-calls.md) (rail, core loop, controls). **Suspect lines of The Boogler's:** none written, changed or
read as suspect.

### Findings

1. **(changed step 1) The Notch line as drawn cannot be built** at either end: a 101.8° kink at Canopy's buffers, its
   formation inside trunk-8's column, and platforms standing in the arch's south leg (level findings 1 to 4). The catalog
   step re-routes both (calls 17, 18); nothing of either leg is built, so no world moves but through the bump.
2. **(changed step 2) The arrival as built refuses most presses**: "a train stands there now" against a 50-tick dwell and
   an 8 s walk (call 25).
3. **(changed step 2) Leg 6's legs would hold every bay and `ns` trade from the bump**, and the load check would refuse a
   room that had re-picked: `SERVED_LEGS` grows and `tradeBuildDone` counts unbuilt legs (call 26).
4. **(changed step 2) The causeway's first kit would wait about 3 to 4 minutes at Bell Rock** on the yard relay (call 24).
5. **(changed steps 1 and 4) Canopy's baked curve and beach follow the row**, and `deck-end` and the old barrier's reserve
   lie on the new formation (level finding 11); the cloth is pinned.
6. **(no change) The confirmed "blockout massing" for the island** meets a classic island that is already there; the plan
   builds nothing on it (call 30, question 3).
7. **(no change) The thanks card**: confirmed as the greybox's one shared moment, though the owner called it undecided for
   Alpha; it is one feature file, removed by deleting it (question 2).

## Open questions

None blocks the build; each proceeds on its recommendation. None is irreversible or outward-facing. Question 1 is a live
owner question this plan does not decide.

1. **"Order as the choice" (the live question in the state file): what leg 6 assumes.** Leg 6 builds on the fixed order:
   the Notch opens when the Wall is laid, the causeway when the Notch is. An order choice would change the Notch's `after`
   (it could follow Canopy's leg instead) and the one-open-leg rule; each is a catalog field and a bump.
   **Recommended for this plan: build on the fixed order; the question stays his.**
2. **The thanks card in the greybox ending?** He wrote "don't know about the thanks card" on 12 November; the greybox call
   with the card was confirmed on 16 November. **Recommended: build it as planned** (the one shared moment the greybox has,
   one file, "Thanks for playing (placeholder)" and Close); the meeting and any post-game twist replace it at depth.
3. **Arrive on the classic island as it stands?** The Original Island is the live classic island, with its lighthouse,
   critters and The Boogler; the confirmed greybox call said "blockout massing" before that was checked. **Recommended:
   yes: the causeway ends at its north beach, a post on the sand, nothing else on it**; the island's redesign into the
   endgame hangout is the ending's depth plan.
4. **The Notch line's two re-routes**: north through the forest between mother-4 and trunk-8 round a 42 m curve from
   Canopy's buffers (the drawn line turned 101.8° there and ran through trunk-8), and an end 40 m short of the arch with
   the lantern in its opening (the drawn end stood in the arch's leg). The alternative is moving trunk-8, a drawn horizon
   landmark, about 25 m. **Recommended: the re-routes (calls 17, 18).**

## What could not be verified while planning

- No still: no massing exists for the Notch or the island halt; every placement is from the map data, the catalog, the
  backdrop's boxes and the classic island's heights.
- The re-routes were measured as arcs and polylines in scratch scripts, not run through the generator; its arcs, height
  easing and chord radii are reasoned from its code and leg 5's as-built figures.
- The kit waits (the Notch's first kit, the causeway's relay with and without `kitAhead`) are arithmetic from the lines'
  lengths and fleets; step 2's fuzz and the checkpoint's idle log measure them.
- Whether props on the classic island stand at the marker spot, and how The Boogler's walk meets the post, wait for step
  5's look.
