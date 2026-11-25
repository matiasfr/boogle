> **25 November 2026.** Planner, against main `162728a35` (world v70: leg 4 playable, Checkpoint D passed, #2439).
> Leg 5 is next in [greybox-route](greybox-route.md)'s order (section 3, row 5; section 6), and the backlog row's next
> step. Steps 1 to 3 ship together as the leg's bump; 4, 5 and 6 after it, in order ([order](#order-and-what-waits)).
> Design review [near the end](#design-review-2026-11-25); [open questions](#open-questions) last. Nothing here waits
> for the owner.

# Greybox leg 5: the White Wall, Port Quay to High Gorge, playable

**Where this sits.** Leg 5 of [greybox-route](greybox-route.md) (section 3, row 5; area 8, "The White Wall"): the
cave line grows on from Port Quay along the White Wall's six chalk islets, through Canopy Town, over the deep span to
High Gorge, 3.9 to 4.1 km in six sections, the last behind the `seeds` barrier. Built from Port Quay as the `cave` row
growing on, meeting line 2 at the Gorge as two platforms, no lap (route review ruling 2, confirmed 16 November). A file
of its own in legs 3 and 4's shape (catalog, rules and the bump, seeds, views, bot and loop, one checkpoint). The route
plan's binding owner direction holds: every step is a mechanism or a system on blockout geometry; every label is a
placeholder and is marked as one. **Crystal collars (the deep span's mechanism) and the lap (through-running) are not
in this plan; the barrier is the route plan's stand-in for the first and decides nothing about it.**

**Goal.** From Port Quay a room builds the line along the Wall, past Canopy and over the deep span, opens the span's
barrier with the seeds it has held since Bell Rock, and arrives at High Gorge's split end-on beside line 2, so the
whole network closes into a ring with one change at the Gorge (Home, line 2, the Gorge, the Wall, Port Quay, the cave,
the West landing). Serves DESIGN.md's core loop ("the rail builds the world"), **7. Telegraph everything** (the
Wall's chalk has stood on the horizon since day one; the board at Port Quay's buffers has named the Gorge since leg 4)
and **8. Enjoyable alone and together** (the longest line yet, and the first ride round the whole map). It bends
nothing.

**Read for this.** AGENTS.md; `npm run map -- --kind docs` (no `plan` kind exists; its read-if-relevant design rows
apply); `.claude/agents/planner.md`; DESIGN.md, context's design-work rules; owner-calls' index; the core loop, rail
and look Current rules; greybox-route sections 1 to 6, its design reviews of 11 November (ruling 2, "Flow", calls 15
to 40) and 12 November (ruling 1's Wall rows); greybox-leg3 (Canopy, the cleft, steps 6 and 7) and greybox-leg4 in
full with their as-built notes; docs/agents/orchestrator-state.md ("Open owner questions", the job table). Code on
main: `src/sim/railway-route.ts` (`SPECS`, `WALL_ISLETS`, `simHalt`, `insertedHeadsBefore`, `FIRST_SITE`,
`RAIL_GATES`, `RAIL_PLACES`, `legFrame`, `legRack`), `railway-lines.ts` (`appendLeg`, `RAIL_LINES[4]`, `RAIL_TRAINS`,
the fleet checks), `railway-queries-route.ts` (`MINT_LEGS`, `STOCKED_LEGS`, `legKitStop`), the generated
`railway-world-lines.ts` (the `cave` row past s 1222), `dev/level/world-blockout.ts` (`SERVICES.cave`, `ROUTES['wall-s']`,
`hermite`, `curves`), `src/content/levels/leg3.ts` (`CANOPY_TRUNKS`, the cleft), `leg4.ts` (the quay's apron, ramp and
reserves), `gorge.ts` (the split's frame, concourse, `TOWN_PAD`, the stacks' colliders), `src/entities/route-greybox/`
(`leg-view.ts`: `LEG_OBJECTIVES`, `leg2Objective`, the barriers), `dev/loop/standins.ts` (`wall`).

**Research.** [route-contract](../research/route-contract.md) (travel edges never supply work): used; every head is
reachable early by swimming and every frame refuses out of turn ([Level findings](#level-findings), 10).
[level-design](../research/level-design.md) rec 3 (big shapes to steer by): used; the six 120 m chalk islets, Canopy's
mother trunks and the two 85 m stacks are what you steer by, and the line keeps 20 m or more off each.
[progression-flow-layout](../research/progression-flow-layout.md): its three firm rules are the review's flow check.

**Port from Place.** Nothing is ported. No fit check is needed.

**The rail route as it stands** (`npm run loop -- node wall`, 25 November): `wall` is a stand-in: "24 logs + 24 rails
+ 50 footings + 100 steel + 32 fibre + 20 copper + 2 crystal = 252 units; allowance 48 min; legs wall-s 2.11 km, wall-n
1.97 km = 4.08 km; grants crystal collars, the lap; requires cave-3, seeds".

**In flight** (`npm run inflight`: nothing unmerged this week; the state file's job table, 25 November):
`codex/friends-ping-reply` (voice; no shared file) and **`codex/cliff-kit-horizon`** (cliff kit step 9: it reshades the
horizon's White Wall in the cliff kit's sandstone, `src/entities/sickle-backdrop/view.ts` only). No step here edits
that file: the Wall's islets in this leg are hidden colliders under the horizon's mesh, as Canopy's two are, so **no
step chooses the Wall's material** ([question 2](#open-questions)).

## What exists for leg 5 on main, and what does not

| Piece | On main | Owed by this plan |
| --- | --- | --- |
| The catalog row | `cave` past Port Quay (s 1221.8): `wall-s` to Canopy Town (stop s 3356.0), `wall-n` to High Gorge (stop s 5306.2), 4.08 km; **as drawn it cannot be built** ([Level findings](#level-findings), 2 to 7) | Three re-routes and four eased corners (step 1) |
| The leg's catalog entry | `RAIL_LEGS[5]` `wall`: area 8, six sections cut at `WALL_S2`, `WALL_S1`, Canopy's stop, `WALL_N2`, `WALL_N1`, the Gorge's stop; section 6 gated by `deep-span`; `after: 4`, kit `home`; **not `built`** | Cuts re-made, Canopy's 10 m past its stop, `built: true` (steps 1, 2) |
| The barrier | `RAIL_GATES[3]` `deep-span`, needs `seeds`, **on the track's centre at `WALL_N1`** | Moved to frame 6 (step 1); its view (step 5) |
| The sim line | Line 4 (`ROW_LINE.cave`): West landing, Cave head 1, Saltpan, Port Quay (leg 4's), then Canopy and High Gorge untagged; fleet `[0, 1, 2, 2]`; train slots 12 and 13 | Five heads, the fleet, three shed rows (step 2) |
| Port Quay | `leg4.ts` `quay`: platforms, quay slab, the apron (along −31 to 64), the ramp to High Port's top, two reserves, the end board "LINE TO HIGH GORGE / LATER"; `port-top` a 55 m collider on the map outline | Re-laid round the Wall (step 4) |
| Canopy | `leg3.ts`: the isle, the bay line's station in the cleft, trunks and mother trunks, `wall-cn` and `wall-cs` as hidden colliders | The Wall's own platforms on the isle's east side and the walk to the bay's (step 4) |
| The Wall's other islets | Horizon mesh only | `wall-s2`, `wall-s1`, `wall-n2`, `wall-n1` as hidden colliders (step 5) |
| High Gorge | `gorge.ts`: line 2's platforms and concourse, the stair, the incline's bore and pad, the town pad | The Wall's platforms in the split's west half (step 5) |
| The loop | `wall` a stand-in | Built nodes (step 6) |
| Trade | `TRADE_LINES = [ns, bay]`; the cave line is offered Quick or Strong "when its garage step comes" ([25 November](../decisions-core-loop.md#d-2026-11-25-order-picks-answers), 6) | Nothing: the garage step's |

## Design

### The beats, in play order (solo; arithmetic, not measured)

| # | Beat | Where | What gates it | About |
| --- | --- | --- | --- | --- |
| 0 | (Leg 4's end) A cave train stands at Port Quay; frame 1 is on the outward platform where the board said LATER | Port Quay | | |
| 1 | Feed section 1 from rack 1, 10 m away (a cave train brought its kit) | Port Quay | leg 5 open (the cave leg laid) | 0 to 1 headway, 30 s feed, 30 s lay |
| 2 | Ride out along the breakwater past High Port's face to head 1 under `wall-s2`; feed section 2 | Head 1, over the sea | section 1 laid | 50 s ride, 30 s, 30 s |
| 3 | Ride on under `wall-s1` to head 2; feed section 3 | Head 2, over the sea | section 2 laid | 30 s ride, 30 s, 30 s |
| 4 | Climb onto Canopy isle: the Wall's Canopy platforms on the east shore; feed section 4 | Canopy (Wall) | section 3 laid | 30 s ride, 30 s, 30 s |
| 5 | Out at 13 m over the bay line's strait climb, down to the sea under `wall-n2`; feed section 5 at head 4 | Head 4 | section 4 laid | 55 s ride, 30 s, 30 s |
| 6 | On to head 5 at `wall-n1`'s north-east tip, facing the stacks across the deep gap; open the deep span's barrier (seeds held since leg 2); feed section 6 | Head 5 | section 5 laid; `seeds` | 40 s ride, 5 s, 30 s, 30 s |
| 7 | Ride round the south stack's tip into the split, end-on beside line 2 | High Gorge | the leg laid | 50 s |
| 8 | Home either way: line 2 (one change, a 10 m walk), or the cave line back through Port Quay | | | 3 to 5 min |

About 10 to 14 minutes solo with waits, against area 8's 48-minute stand-in allowance; the checkpoint measures it.
**Co-op:** three players split a section's feed in one trip each; one rides ahead to the next head while the lay runs.
The Wall's Canopy platforms are a walk from the bay line's, so a friend arriving at Canopy by the bay line reaches the
railhead on foot. **Solo** works end to end on the room's keys (`seeds` since leg 2).

### Sync kinds and authority

As legs 3 and 4, nothing new in kind:

| Piece | Kind | Authority | Where |
| --- | --- | --- | --- |
| The Wall's heads, halts, ends, fleet and three train rows | Server (catalog + `Train` rows) | server | `railway-lines.ts`, `RAIL_TRAINS` |
| Leg 5's row, the deep-span barrier | Server (`Leg`, `Route`, since v32) | server | `railway-sys-route.ts` |
| Leg 5's kit (minted at the West landing, unloaded at each rack) | Server, atomic in the tick's apply | server | `railway-sys-route-kit.ts`, `railway-queries-route.ts` |
| Islet colliders, Canopy's Wall platforms, the Gorge's Wall platforms, the quay's re-lay, decks, bents, heads, frames, racks, the barrier, levers, boards | Local, from accepted state | each tab | `src/content/levels/`, `src/entities/route-greybox/`, `src/entities/railway/halts-view.ts` |

No client lead, classic edit generator, client state registration, `src/world/rules/` file or presence field. Rule
ticks: the room's; saves: the room checkpoint's (every key exists). **Ops: none new.** **No new play-record mark.**
**Wire:** no new message or field; the cave line's halt ids past Port Quay change meaning (five heads inserted),
covered by the bump. **Prediction:** `rail.legStock` predicted; `rail.gate` waits for the server. **Receipts:** as
today.

### The catalog (step 1)

The row past Port Quay is generator data (`dev/level/world-blockout.ts`); nothing of it is built, so it moves freely
before the bump. Map coordinates are world metres less `ORIGIN` (x − 1000).

1. **Port Quay: ease the turn and clear High Port.** `ROUTES['wall-s']`'s first hermite (keys map (−880, 960) at 150°,
   (−1535, 840) at 235.5°) starts 15° off the quay's straight (a 19.8° kink, then 7.0°, 4.9°, 3.7°, 2.8°, 2.2° over 41 m:
   about an 18 m radius) and swings through `port-top`'s outline. Replace it with keys tangent to the straight:
   **map (−880, 960) at 134.8° (tangent 250), (−1240, 893) at 182° (300), (−1535, 840) at 235.5° (300)**, sampled at
   chords that turn under 2°. Measured on the map data (scratch, 25 November): tightest radius 46 m at s ~1250, the
   centreline 12.4 m from High Port's top at s ~1372 (8.6 m from the formation's edge), rejoining the drawn straight at
   (−535, 840) with the length unchanged within 5 m. Gate: no radius under 40 m, the formation's edge at least 5 m off
   `port-top`'s outline. A standing train at Port Quay stays on the straight (the stop is still 25 m short).
2. **Four corners eased** with `curves` on the cave service (radius 300 m, the generator's fillet): map (−1755, 520)
   (15.1°), (−1875, 180) (16.5°, at the foot of the climb onto Canopy isle), and the two the re-routes below leave
   (about 24° at (−1640, −1000), about 36° at (−1340, −1500)). The decided "no kinks" (10 November) is met on the Wall
   rather than pinned.
3. **Canopy: the Wall's own halt on the isle's east side, and an overbridge.** As drawn the row runs west along z −300
   into the bay line's Canopy station, turns 131.8° at the bay's own kink and runs back out north-east through
   `wall-cn`'s tip ([finding 5](#level-findings)). The bay line (Bell Rock, Canopy, the Notch) separates the Wall's south
   half from its north half, so the Wall must cross it once; the sim has no interlocking between lines, so not at
   grade. New route from the top of the climb (map (−1886, −31), 13 m): **north on the isle's straight to the Wall's
   Canopy stop at about world (−889, −100), level at 13 m; a 300 m curve right; straight north-east over the isle's
   shore and the sea, held at 13 m, crossing over the bay line's strait climb at about (−690, −605), where the bay's rail
   is at 5.0 m (8.0 m under the Wall's); then down at 3.9% and on to (−640, −1000)**, where it rejoins the drawn line. A
   vertex at the crossing carries a ruled 13 m height. Measured: the line keeps 27 m off trunk-1 and 29 m off trunk-0
   (centrelines; the trunks are 12 m wide), 88 m or more off the mother trunks, 150 m off the bay's head 2; about 300 m
   shorter than drawn. The halt keeps the catalog name **Canopy Town**; the walk to the bay line's platforms is about
   290 m (52 s) across the isle ([question 3](#open-questions)).
4. **High Gorge: in by the split's sea mouth, end-on.** As drawn the row runs 236 m inside the south stack, parallel to
   the incline's bore, and ends on line 2's buffers ([finding 6](#level-findings)), against the confirmed 10 November
   call ("High Gorge has one station, low in the split at 3 m, for every line (the White Wall line comes down to the sea
   deck before the stacks)"). New route: past `wall-n1`'s north-east tip (world (−289, −1604)), north along the south
   stack's west face, round its tip (radius 100 m or more) and into the split on its axis from the west, at 3 m. Its stop
   at split-frame a −31 (world (−129.6, −2004.0)), buffers at a −8, 4 m short of line 2's concourse, the end crossover
   24.5 m before the stop (Port Quay's spacing). Measured on a polyline (scratch): 21 m or more off `wall-n1`, 24 m off
   the south stack, 45 m off both split walls; about 805 m from the tip to the stop. The Wall and line 2 then end
   buffer to buffer on one axis, which is also the shape a later lap needs.
5. **Regenerate** (`node --import ./dev/sim/hooks.ts dev/level/world-blockout.ts`): `src/sim/railway-world-lines.ts`,
   `docs/world/world-blockout.html`, `docs/world/rail-map.html`, the map page's rails (`test/world-lines.test.ts`). The
   halts' `stopCm`: Canopy's at its straight's middle (no curve within 25 m), the Gorge's at a −31. The economy model's
   reference runs move with the lengths ("the economy model follows the ruled route", greybox-route), said in the ship.
6. **Six sections, cut at places** (decided: up to about 900 m). In `railway-route.ts`: `WALL_S2`, `WALL_S1`, `WALL_N2`
   recomputed from the new row by the existing test (each within 1 m of its islet's closest pass); **section 3 ends
   `HEAD_BACK_CM` past Canopy's stop**, so Canopy's head is the catalog halt (leg 4's Saltpan rule; today's cut at the
   stop would put a head 10 m short of it); **`WALL_N1` becomes the row's closest approach to `wall-n1`'s outline (its
   north-east tip), not to its centre**, so the deep span is the open gap from the chalk's end to the stacks, and both
   last sections stay under 900 m. Lengths about **875, 437, 430, 850, 730 and 805 m** (about 4.1 km); the test holds
   each under 900 m. Bills 20 logs + 20 rails, lay 30 s.
7. **Frame 1 and rack 1 on Port Quay's outward platform** (`FIRST_SITE.wall`), leg 3's Bell Rock form: rack 1 at
   `rowSide('cave', stop + 200, 480, 90, LEG_SITE_REACH)`, about (132.8, 940.3, 3.9) m; frame 1 at `stop + 1200`,
   about (125.7, 947.4, 3.9) m: 10 m apart, on the platform (lat −3.8 to −7.8), 8 m short of its end. A cave train
   brings section 1's kit: the Wall is not a `STOCKED_LEGS` leg (its first halt is leg 4's). Frames and racks 2 to 6 by
   `legFrame`/`legRack`'s formula.
8. **The barrier** `deep-span` moves from the row's centre at `WALL_N1` to frame 6, `legFrame(wall, 5)` (8 m short of
   head 5, 4.8 m right going out), as legs 2 to 4 moved theirs to the frame. A server reach point (rule 1).
9. **`RAIL_PLACES`' bound becomes per place:** 40 m as today; Canopy about 300 m and the Gorge 65 m (the Wall's stop is
   51 m from line 2's halt point and 62 m from the incline's), each with the walk between proved by the flood.
10. **New `dev/level/route-leg5.ts`**: the planned points as named marks with distances stated (each re-route's
    clearances above; rack 1 to frame 1 under 15 m; every head's platforms on a level stretch; Canopy's stop inside the
    isle and level; the crossing's clearance over the bay's rail at least 7 m; the Gorge's buffers 4 m short of the
    concourse), registered in the level check as `route-leg4.ts` is.

### The rules (step 2)

- **When it opens.** Leg 5 opens when the cave leg is laid (`after: 4`, on main; the fixed order,
  [question 1](#open-questions)). One leg open at a time; the forge rack is shared as for every leg.
- **The line.** `RAIL_LINES[4]` becomes `appendLeg(appendLeg(rowLine('cave'), 'cave', ...), 'wall', 'Wall head',
  <the Gorge's end crossover cm>, [2, 2, 3, 3, 4, 4, 5])`. Halts: [West landing, Cave head 1, Saltpan Halt, Port Quay,
  Wall head 1, Wall head 2, Canopy Town, Wall head 4, Wall head 5, High Gorge]; the Wall's `railheadHalt` 4. `simHalt`
  already counts a catalog halt inside a leg (leg 4).
- **Halts.** Each head opens with its section. **A head that is a catalog halt never closes** (`appendLeg` gives it no
  `closesAt`): Canopy stays a request stop both ways. Heads 1, 2 and 4 close behind two lays on (the stack's rule, as
  `appendLeg` has it); head 5, the leg's last head, stays a request stop both ways (as built for every leg's last
  head), a stop under the chalk's end with a sea ramp. Port Quay's crossover serves until section 1 lays, as Bell Rock's
  did for the bay line. **Ends:** a stub at each head while it is the line's end; at the Gorge the end crossover and
  buffers of step 1. Block signals at each section's end but the last. Right-hand running throughout.
- **The fleet** `[2, 2, 3, 3, 4, 4, 5]`: one more train about every 1.3 km of line, five on 5.3 km (the bay line went
  2, 2, 3, 3 over its 1.2 km leg). Three shed rows appended after every existing slot (14, 15, 16); no slot moves.
  Normal 50-tick dwell. The service health rule ([23 November](../decisions-rail.md#d-2026-11-23-greybox-service-health))
  applies with no new code; its budgets scale with the line's own headway.
- **The kit.** Minted at the West landing (logs minted, rails off the forge rack), one kit a train, all remaining owed
  ahead (`kitLead`); the Wall joins `MINT_LEGS[4]` by its catalog entry. Every Wall rack is fed by a cave train.
- **The barrier.** `rail.gate deep-span` opens once `seeds` is held and section 6 is the leg's current one; the frame
  refuses out of turn.
- **Trade.** Unchanged: the cave line's standard trains carry the Wall. When the garage step makes the cave line a
  trade line, Strong's hold (`legRailheadHold`, generic) applies to the Wall with no change here.
- **Invariants** (`railway-check-route.ts`): heads open as a prefix; the fleet at each of the cave line's seven
  stages; conservation counts the Wall's kit.

### Controls and copy

No new action, pad slot, key or touch button; every press is Interact through existing prompts. New placeholder copy
(none The Boogler's):
- Objectives: once the cave leg is laid, **"Build the line along the White Wall to High Gorge (placeholder)"**
  (replacing leg 4's "Ride home: the next line isn't built yet"); at section 6 with the barrier shut, **"Open the deep
  span's barrier (placeholder)"**; once laid, leg 4's "Ride home: the next line isn't built yet" until leg 6.
- The barrier's blocked reason before `seeds`: "Needs the crystal seeds" (the gate's built form); out of turn, the
  frame's usual refusal.
- Boards: "LINE TO HIGH GORGE / UNDER CONSTRUCTION" at each head while it is the end (Port Quay's "LATER" board goes
  when section 1 lays); "WHITE WALL LINE (placeholder)" at the Gorge's Wall buffers; departure boards list the new stops.

### The massing (steps 4 and 5)

Local, static boxes each tab builds, one instanced mesh an area with real bounds (P3), resident by distance (P1), a
level artifact the flood reads. **Stand-ins only:** no collars, no lap, no town on the Wall's side of the Gorge.

- **Port Quay re-laid (step 4, `leg4.ts`).** The Wall's formation crosses the apron's north corner and the ramp's
  foot (finding 4). The apron splits along the Wall's bed; High Port's ramp foot and its landing move landward of the
  formation (at least 1 m clear), with a plank foot crossing at rail-top height from the outward platform's end over
  the Wall's bed (the island halt's foot-crossing pattern); the town reserve moves clear; the Roundhouse reserve stays
  (3.2 m clear). The lay's slabs on the apron use `liftOrWait`.
- **Canopy's Wall platforms (step 4, `leg3.ts`).** Two 40 m platforms at the Wall's stop on the isle's east side, 0.9 m
  over the 12 m ground with a step down each side (Canopy head 2's form); the walk west through the trunks to the bay
  line's homeward deck proved by the flood; the overbridge's footprint over the bay line kept as a reserve (its deck and
  bents are the leg view's, from section 4's lay, every bent outside the bay's formation and its trains' gauge).
- **The Wall's islets (step 5, new `leg5.ts`, areas `wall-south` and `wall-north`).** `wall-s2` and `wall-s1`; `wall-n2`
  and `wall-n1`: their map outlines as hidden colliders under the horizon's mesh, 120 m, sheer (no beach), as
  `wall-cn` and `wall-cs`. Heads 1, 2, 4 and 5 over the sea with sea ramps.
- **High Gorge's Wall platforms (step 5, `gorge.ts`).** Two 40 m platforms on posts in the split's west half (a −51 to
  −11, 3.8 to 7.8 m either side of the axis), the concourse extended west to them, a sea ramp from the split's water;
  the town pad (c −40 to −14) stays 6 m clear of the north platform.

### Solids near players

Every solid that switches on near a player (each lay's slabs, a head's platforms, a frame, a rack, the overbridge's
deck over a bay train's roof) **uses `liftOrWait`** (`src/prefab/instantiate.ts`); do not write another. Areas mount as
ordinary statics at their `coverNear` distance; Port Quay, Canopy and the Gorge are already resident areas, so their
new static pieces arrive with a page load (the shared return check's, `src/place/pose.ts`).

## Beside the garage and the shared pool

| Where they touch | What leg 5 does | What it leaves to them |
| --- | --- | --- |
| The cave line's Quick or Strong trade (answered yes, 25 November) | Standard trains; `TRADE_LINES` unchanged; the hold is generic | The garage step that adds the cave line. If it lands before the Wall is laid, Strong has its building window here |
| Port Quay's Roundhouse | Its reserve kept (3.2 m off the Wall's formation) | The station plan |
| Hub towns | No town on the Wall's side of the Gorge; Canopy's and Port Quay's reserves kept | The stand-in towns plan |
| The market | No stall (no place on the Wall has goods) | Nothing |

## Steps

Each step leaves `node dev/ship-check.ts` green. **Steps 1 to 3 ship together as the leg's bump.** Every review of
steps 1 to 3 (src/sim, src/world) is an independent one before merge, by the row `npm run models` gives at the time.
The models table's rows are named per step; the orchestrator reads them when it dispatches.

- [x] **1. The catalog (M to L; "High-risk implementation").** Implemented. The as-built section records the final length, clearance and crossover checks. Files: `dev/level/world-blockout.ts` (`ROUTES['wall-s']`'s
      first hermite; the Canopy and Gorge re-routes as new `ROUTES['wall-s']` tail and `ROUTES['wall-n']` points with the
      crossing's ruled height; the cave service's `curves`; Canopy's and the Gorge's `stopCm`), regenerated
      `src/sim/railway-world-lines.ts`, `docs/world/world-blockout.html`, `docs/world/rail-map.html`;
      `src/sim/railway-route.ts` (`WALL_ISLETS` with n1's outline rule, the wall cuts, `FIRST_SITE.wall`, the
      `deep-span` point; `built: true` with step 2's line in one commit if the load checks need it); new
      `dev/level/route-leg5.ts`, registered as `route-leg4.ts` is. Verify: `test/railway-route.test.ts` (six sections,
      each under 900 m; section 3 ends `HEAD_BACK_CM` past Canopy's stop; `WALL_ISLETS` within 1 m, n1 by its outline;
      the barrier equals `legFrame(wall, 5)`; `RAIL_PLACES` per-place bounds); `test/world-lines.test.ts` (no future span
      over 4%; the crossing vertex's 13 m; the map rails); `npm run level-check` (rule 49): the cave row's 87.0° and
      131.8° kinks, its 2.6 m radius and its other "planned, would fail" lines gone; **from Port Quay's buffers to the
      Gorge's, no kink over 2° and no radius under 40 m**; `route-leg5`'s clearances as [above](#the-catalog-step-1);
      no new report elsewhere.
- [x] **2. The rules and the bump (L; "High-risk implementation", high for the fuzz).** Implemented in v71. Files: `src/sim/railway-lines.ts`
      (`appendLeg`: no `closesAt` on a catalog-halt head; `RAIL_LINES[4]` as [above](#the-rules-step-2); the three shed
      rows follow from the fleet); `src/sim/railway-check-route.ts`; `src/world/namespace.ts` (the bump,
      [below](#the-world-bump)); fixtures and golden shards in the same commit (rule 15). Verify: new
      `test/railway-leg5-rules.test.ts`: section 1's kit rides a cave train to rack 1 at Port Quay and is never stocked;
      heads open as a prefix; heads 1, 2 and 4 close behind, Canopy and head 5 never do; `rail.gate deep-span` refused
      without `seeds`, refused out of turn, opened with both; `rail.legStock` refused at frame 6 while shut; the fleet by
      `[2, 2, 3, 3, 4, 4, 5]`; the relay conserves every unit; leg 4's tests unchanged in outcome. **A host test (rule
      23)** sends `rail.gate deep-span` as a real `r:edit` at frame 6 (accepted) and at the old centre point (refused).
      **The service fuzz** (`test/helpers/railway-route-rules.ts`, a Wall group in its own shard): lever calls at 75%
      headway over the cave line's seven stages, settled and growing, with save and restore; its default run timed on
      HOTBOX under a quarter of its budget (rule 60); the long run (`ROUTE_GATES=1`, seeds `c0ffee`, `777`, `5eed`,
      `badd`, 20,000 ticks a mode) pasted into this plan before the bump ships, with leg 4's long suite re-run beside it.
      `npm run loop -- run`. Because shards and sim lists change: the whole server suite (rule 52), `npm run test:net`
      (rule 55) and the built-site boot probe (rule 61).
- [x] **3. Seeds and stages (S; "High-risk implementation").** All three seeds build from accepted operations and pass the invariant. `src/sim/railway-seed-legs.ts` from `port-reached`,
      accepted ops only, each wrapped in `need` (rule 53): `wall-mid` (sections 1 and 2 laid, section 3's kit aboard a
      cave train: the rejoin proof's state), `wall-deep` (five laid, the barrier shut), `wall-closed` (the leg laid, a
      little running time; the route plan's jump link). `SEED_STAGES` and its golden shard; `src/world/railway-jump.ts`
      rows (`wall-mid` on head 2's platform between rack 3 and frame 3; `wall-deep` on head 5's; `wall-closed` keeps the
      spawn until step 5's stills, leg 3's reason). Verify: `test/railway-jump.test.ts`; each stage's invariant check;
      the whole server suite and `npm run test:net` (rule 55).
- [x] **4. Port Quay and Canopy re-laid (M; "Player-visible implementation").** Files: `src/content/levels/leg4.ts`
      (the quay as [above](#the-massing-steps-4-and-5)), `src/content/levels/leg3.ts` (the Wall's Canopy platforms, the
      overbridge reserve), their built levels, `dev/level/route-leg4.ts` and `route-leg3.ts` (new floods: the outward
      platform over the foot crossing to the ramp's foot and on to the top; the Wall's Canopy platforms to the bay's
      homeward deck and back; a swimmer off the isle's east shore to the Wall's platforms). Cases in the existing prefab
      tests (rule 36); the hand-kept lists (rule 41). Verify: the full ship check; `npm run level-check`: every leg 3 and
      leg 4 line still "ok", the new floods "ok", both quay reserves clear of the Wall's formation; `.look/` stills: the
      quay from the outward platform toward High Port with the Wall's bed and the crossing; the Wall's Canopy platforms
      from the isle; the walk's midpoint between the two stations.
- [ ] **5. The Wall's areas, the Gorge's platforms and leg 5's views (M to L; "Player-visible implementation").**
      Files: new `src/content/levels/leg5.ts` (`wall-south`, `wall-north`) and `content/built/levels/` for both; new
      `src/entities/route-greybox/massing-wall.ts`, registered in `index.ts`'s `AREAS` with their `coverNear` distances;
      `src/content/levels/gorge.ts` (the Wall's platforms, the concourse, the sea ramp); `leg-view.ts`: the Wall as a
      row leg (deck, rails and sea bents from `laid`, the overbridge's tall bents clear of the bay line, frames with bill
      and plate, racks, heads with sea ramps, block signals, boards, buffers), the deep span's barrier at frame 6,
      `LEG_OBJECTIVES`' lines and `leg2Objective`'s order; every solid that switches on near a player through
      `liftOrWait`; `src/entities/railway/halts-view.ts` levers and boards at the new halts. `docs/game-design/place.md`
      updated. **The horizon is not edited** ([question 2](#open-questions)); a resident Wall area hides only what it
      replaces, if anything, as the quay hides the horizon's cranes. **Rule 53:** the objective after the cave leg and
      the barrier's prompt change here, so this branch runs `dev/look/bots/railway-legs.ts`, its eval, `dev/loop/run.ts`
      and step 3's seeds. Verify: the full ship check; `npm run level-check`: every route leg 5 line "ok" (each head's
      platforms level; a swimmer reaches every head; the islets' colliders match the map; the Gorge's Wall platforms to
      line 2's concourse on foot; the town pad clear); `.look/` stills: from a Wall train past High Port's face, under
      `wall-s2`, over the bay line at the crossing (and from a bay train under it), head 5 with the stacks across the
      gap, arriving in the split end-on beside line 2; mesh and collider counts with each new area resident and not;
      the boot probe (rule 61).
- [x] **6. The bot and the loop (M; "Implementation from a brief or an approved plan").** Files: `dev/loop/graph.ts`
      (`wall-1` to `wall-6`: `legSection` on `wall`, `KIT_BY.wall` "a cave train from the West landing"; `deep-gate`:
      `rail.gate`, requires `wall-5` and `seeds`; `wall-6` with `stops: ['gorge']`; `GENERIC_OPS` and `ACTIVITY_MARKS`
      unchanged, the file listed (rule 63)); `dev/loop/standins.ts` drops `wall` (the ending's stand-in requires
      `wall-6`); `dev/loop/run.ts` (`ROUTE_PRESS['deep-gate']`); `dev/look/bots/railway-legs.ts` (after `port home`: the
      six sections riding cave trains to each head, the barrier `railway-leg-deep-span`, into the split, line 2 home to
      the Village; `--from port-reached` a leg seed); `dev/look/segments.ts` (`RAIL_STOPS.wall`, `LEG_STOPS`). Verify:
      `npm run loop -- node deep-gate` and `-- node wall-6`; `npm run loop -- run`; `npm run playthrough -- --from
      port-reached --to wall --long`; `test/loop-graph.test.ts`.

### Checkpoint E (leg 5 playable)

After steps 1 to 6 are on main; named proofs, once, with the tools as Checkpoint D left them:

- [ ] `npm run loop -- run` for one to three players: `idle s` per node (`wall-1` to `wall-6`, `deep-gate`), area 8's
      minutes beside its 48, the whole route's; any wait over 60 s with nothing to do is a finding for the designer.
- [ ] The bot segment `--from port-reached --to wall --long`: a pass verdict, the load noted.
- [ ] `npm run test:net`, with `railwayLegRejoin` (`dev/peer-test/ws-railway.ts`) taking `wall` at `wall-mid`: the seed
      doc written before any page opens; a second tab joins; head 2's rack holds section 3's bill; the carrier leaves,
      the server restarts, it rejoins; the leg row, the rack, the kit aboard and the carrier's back exact at every
      checkpoint. Its deadline timed with the later seed.
- [ ] Steps 4 and 5's stills on one sheet.
- [ ] `npm run perf -- --view wall` (a `PLACES` row: seed `wall-closed`, the body on the Gorge's Wall platform, the
      camera down the split) and `-- --view wall --hardware --seconds 10`, its load noted.
- [ ] The boot probe on main after step 6 (rule 61); the fuzz's long run if a rule changed after it.
- [ ] A device line on the Mac, reported, not a gate (taken when the Mac is next open).

### Steps 1 to 3 as built on HOTBOX

The Wall runs 4,103.2 m from Port Quay's stop to High Gorge's. Its largest chord turn is 1.997°.
The smallest radius is 46.43 m on the continuity report's 5 m samples and 44.61 m on the catalog chords.
The Gorge turn's tightest catalog chord radius is 100.42 m.
The formation clears High Port by 8.46 m. The Canopy halt is 25.42 m before the curve's tangent point.
The crossing is 7.97 m over the bay rail. The approach clears the south stack by 24.47 m and the buffers stop
4.00 m from line 2's concourse. Port Quay's first carry is 10.00 m. All six platforms are level.

**Section 4.** The section lengths in metres are **883.73, 436.24, 421.23, 950.69, 680.10 and 731.21**.
Section 4 ends at the closest pass to `wall-n2`. The orchestrator accepts the 5.6% overrun under the
owner's “up to about 900 m” ruling. Both the unit test and level report hold every Wall section under 960 m.

**Canopy clearances.** The centreline passes 23.45 m from trunk-1, 85.01 m from mother-1 and 123.29 m
from the bay line's head 2. Their respective minima are 22 m, 84 m and 122 m. Trunk-0 clears 29.78 m
against 29 m. The nearest edge of trunk-1's 12 m square collider is 16.04 m from the centreline.
The 1 m gauge, 4 m track centres and 12 cm rail width leave 13.48 m to the outer rail edge.
The full 7.60 m formation clears the collider by 12.24 m.

**Gorge crossover.** The catalog and cave service put the crossover at metre 5293.00, 7.50 m seaward
of the sketch and 32.00 m before the stop. Its centre is 12.00 m before the platform edge, at split
coordinates `a = −63.02 m, c = 0.11 m`. The 20 m crossover fits on the straight. Its near end
remains 45.01 m from the buffers along the row and about 49 m from line 2's concourse.

The first kit rides from the West landing to Port Quay. Cave slots 14–16 enter from the shed as the Wall grows.
World v71 includes the changed halt ids and gate reach, the host trace, seed and operation goldens, halt placements,
seat fixtures and the economy page. The built-site probe initially caught a missing halt lever. Regenerating the halt
kit brought the offline Chromium probe to interactive. After the crossover adjustment the built site reached
interactive in 16.1 s on the NVIDIA adapter. The halt catalog records the signal at metre 5284.80.
The `wall-closed` seed still starts at tick 34276 with the same hash. The moved signal changes its hash 1,200 ticks later.

The level check passed all 25 reports in 111.26 s. All 2,024 affected unit tests passed across
206 files in 226.9 s, including the route catalog and world-lines tests. The full audited server run passed 407 of
410 and skipped two. Its only failure was the Windows account crash assertion (`null` for `SIGKILL`).
The real deep-span `r:edit` passed, including refusal from the old centre and acceptance at frame 6.
The network suite passed 315/315. All loop orders finished with one through four players using
the existing Wall stand-in. The device run belongs to the later playable checkpoint.

**Long service trials.** 75% headway, 20,000 ticks per mode, save/restore in each trial.
Each cell is accepted calls / worst wait in ticks. All calls drained within their applicable budgets.

| Leg and seed | Growing | 1 laid | 2 laid | 3 laid | 4 laid | 5 laid | 6 laid |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Wall c0ffee | 162/2055 | 106/1356 | 164/1180 | 139/1269 | 163/1394 | 164/1890 | 185/2027 |
| Wall 777 | 148/2177 | 105/1382 | 163/1329 | 150/1306 | 153/1290 | 156/2090 | 179/1659 |
| Wall 5eed | 148/2123 | 107/1403 | 163/1293 | 149/1283 | 156/1225 | 164/2179 | 170/2045 |
| Wall badd | 160/2014 | 111/1411 | 170/1503 | 146/1443 | 154/1421 | 161/2008 | 166/1545 |
| Cave c0ffee | 122/1139 | 91/529 | 174/668 | 118/824 | | | |
| Cave 777 | 125/1072 | 106/546 | 189/639 | 130/815 | | | |
| Cave 5eed | 118/1131 | 102/545 | 180/613 | 123/805 | | | |
| Cave badd | 111/1165 | 99/556 | 187/612 | 123/847 | | | |

The Wall default service test took 19.75 s (limit 120 s, test budget 480 s).
The Wall long test took 228.66 s and the cave long test took 105.60 s, 239.0 s together.
The three jump rows are tooling-only. The two mid-build jumps target their head platforms, and the completed
route uses the usual spawn until step 5 supplies its landing.

### Order, and what waits

| Step | Needs on main first | Why |
| --- | --- | --- |
| 1 to 3 | Nothing | Sim and catalog |
| 4 | Step 3 | The quay and Canopy are re-laid round track that now exists |
| 5 | Step 4 | Canopy's and the quay's levels are drawn by the same views |
| 6 | Step 5 | The bot rides to the barrier step 5 draws |

**Between the bump and step 5** rooms past `port-reached` have leg 5 open: a cave train unloads section 1's kit onto
rack 1 at Port Quay, which nothing draws yet, and the objective still says "Ride home". Production prebuilds the jump
rows, so `?from=wall-mid` runs Wall trains over undrawn track until step 5, as legs 3 and 4 did. Worth knowing before
a playtest.

### Left out

Crystal collars as a mechanism, the lap and through-running at the Gorge, a town on the Wall's side, Canopy's two
stations as one interchange building, freight or riders on the Wall, the cave line's trade, the Wall's material, the
halt map drawing the Wall. Each is a later plan's.

## The world bump

**Needed: one, in step 2's commit, covering steps 1 to 3.** The next free number is v71 unless another ships first;
two share one only if both are review-clean in the same batch, and none waits for another ([Nothing waits on a world
bump](../agents/owner-calls.md#no-bump-hold)). Ship outside the owner's sessions (`npm run heartbeat` first). Why:
three new `Train` rows (the shed rows; each leg that adds trains brings its rows and its bump, as v62, v66 and v70
did); the cave line's halt ids past Port Quay change meaning; the catalog's geometry past s 1222 moves and the barrier's
reach point with it (rule 1, said in the ship); the golden shards and seeds move (rule 15). Against "two planned, six at
most": the route's fifth (G1, v62, v66, v70, this), inside the ceiling; G2's reserve is not taken (no catalog row is
added or reordered).

## Level findings

`npm run level-check` ran on 25 November (main `162728a35`, world v70): **24 reports, no failure, 126 s.** Every leg 2,
3 and 4 line is "ok" (Canopy, the Saltpan, the quay's floods and reserves, the West landing). The track report's
`cave-centre [later]` (5,326 m) has 23 kinks over 2°, a tightest radius of 2.6 m at s 3355 and 14 unexpected corners; its
"planned, would fail" lines are on the Wall: **87.0° at s 3156 (world (−900, −300))** and, in the network's worst ten,
**131.8° at s 3356 (−1100, −300)** and **"radius 2.6 m (under 40)"** there. The level check does not yet walk the
Wall's islets, so the rest was measured with scratch scripts over the catalog (`WORLD_LINES`), the map's smoothed
outlines (`layout(...).land`), `CANOPY_TRUNKS` and the levels' frames, and is read against the report:

1. **Port Quay's turn**: 19.8° at s 1246.8, then 7.0°, 4.9°, 3.7°, 2.8° and 2.2° within 41 m (chords 6 to 11 m, about an
   18 m radius). Eased in step 1 (1).
2. **High Port's top**: the drawn Wall runs inside `port-top`'s outline (leg 4's 55 m collider) from s 1506 to s 1667, up
   to 28 m deep. Re-routed in step 1 (1): 12.4 m off it on the new keys.
3. **Other corners**: 15.1° at s 2314.5, 16.5° at s 2675.1, 15.2° at s 3731.1, 4.4° at s 4200.7, 5.1° at s 4783.8; hermite
   chords of 2.3° to 7.5° at s 1870 to 1926. Eased (step 1, 2) or replaced by the re-routes.
4. **Leg 4's quay** (quay frame, along the stop's outbound axis, lat negative landward): the drawn Wall's formation
   lies over the apron from along about 35 to 64; overlaps the ramp's landing (along 39 to 51) by up to 2 m; passes
   0.2 to 0.6 m from the High Port ramp's foot; overlaps the town reserve's corner (along 61 to 63) by about 1.7 m; clears
   the Roundhouse reserve by 3.2 m. The new keys cross the ramp's foot itself. Hence step 4's re-lay.
5. **Canopy**: the drawn Wall's centreline is inside trunk-1's 12 m column (−901, −222); its westward run on z −300
   passes through mother-2 (−1050, −300); it ends on the bay line's kink, through leg 3's buffers and deck; it runs 52 m
   inside `wall-cn`'s south tip (s 3426 to 3478). By the angles round that vertex (bay in from 318°, out to 240°; Wall
   in from 0°, out to 312°) the two lines cross there at grade, and must cross somewhere: the bay line runs from Bell
   Rock to the Notch between the Wall's halves. The new route crosses over the bay's strait climb at (−690, −605), bay
   rail 5.0 m, Wall rail 13.0 m; 27 m off trunk-1, 29 m off trunk-0, 88 m or more off every mother trunk.
6. **The Gorge**: the drawn Wall runs 236 m inside the south stack's outline (s 5045 to 5281, up to 50 m deep), its
   mouth 37 m from the incline's bore, and ends on line 2's buffers at (−103, −1988), with its formation within 5.7 m of
   the incline's barrier pad and over line 2's concourse. The new route keeps 21 m off `wall-n1`, 24 m off the south
   stack, 45 m off both split walls; the Wall's north platform stays 6 m off the town pad.
7. **Section lengths as drawn**: 875.1, 436.7, 822.4, 817.8, 539.6, 592.8 m (4.08 km); Canopy's cut at its stop. With the
   re-routes and n1's cut at its tip: about 875, 437, 430, 850, 730, 805 m. **Unproven** until step 1 regenerates.
8. **The islets' passes** (centreline to outline): `wall-s2` 41 m, `wall-s1` about 80 m, `wall-n2` 55 m, `wall-n1` 21 to
   28 m. Every head is over the sea.
9. **Port Quay's first site**: rack 1 (132.8, 940.3, 3.9) and frame 1 (125.7, 947.4, 3.9) on the outward platform, 10 m
   apart, 3 m inside the apron's edge.
10. **Early reach** (route contract). Every head and the Gorge's Wall platforms are reached early (a swimmer; the
    Gorge's on foot from line 2 since leg 1; Canopy's Wall platforms on foot since leg 3). Nothing stands there but
    frames that refuse out of turn and boards; the barrier refuses without `seeds` and out of turn. A glide from the
    Gorge's 85 m rim does not reach head 5 (about 400 m off). Movement skips distance, never the work.

## Risks

- **Room safety.** Every transfer in a system inside the tick's apply; no state is new; no `Math.random`, no wall
  clock; effects play from mirrored changes in the adapter.
- **Mixed builds.** Dev phase: the break is the bump with its dated line; the barrier's point is a server reach check
  (rule 1); server and client ship together; shards regenerated in the same commit.
- **A three-place re-route in one generator change.** Each re-route is independent data; step 1's test and
  `route-leg5.ts` hold every clearance, so a review can read them one at a time.
- **The overbridge** is the first line over another. The deck's lay over a running bay train goes through `liftOrWait`;
  the bents' footprint is checked against the bay's formation in `route-leg5.ts`.
- **Hot files.** `railway-lines.ts`, `railway-route.ts`, `world-blockout.ts` and its generated files, `leg3.ts`,
  `leg4.ts`, `gorge.ts`, `leg-view.ts`, `route-greybox/index.ts`, `halts-view.ts`, `railway-legs.ts`, `graph.ts`. The
  Gorge's walls carry the cliff kit's dressing (`gorge-walls`, `gorge-mouth`): the Wall's platforms in the split's west
  half stand clear of the walls (45 m), so no piece moves; step 5's level check says so.
- **Line 2 is not touched** (rule 14); its concourse is only extended.
- **Lockstep.** Integer cm and ticks; the re-routes are generated integers at authoring time.
- **Performance.** Four islets' colliders, 4 km of deck with tall bents at the crossing, five Wall trains. Reported by
  `npm run perf` and the harness's counts; not a reason to cut anything without the owner's word.

## Design review (2026-11-25)

The planner's own review, in the same sitting (owner call "Fold roles into the builder", 16 November); the plan was
reread from the top before sorting. **Read:** DESIGN.md; owner-calls' index; the core loop, rail and look Current rules,
the entries cited below and the confirmed rows in the archive (11 November call 19; 10 November, High Gorge's one
station); docs/direction.md's phase line (the route, rough, to the ending); docs/playtests.md (no session since the
greybox route; leg 4's review quotes the 14 November presses); the research above; the level report and the scratch
measurements; `npm run loop -- node wall`. **Seen:** numbers only. **Not seen:** any still; no massing exists for the
Wall, so the islets, the crossing and the split's west half are judged from the map data and the levels' frames.

**Flow, beat to beat:**

- *The next goal can be found.* Leg 4 ends at Port Quay with "LINE TO HIGH GORGE" on the board and frame 1 now beside
  it; each head's rack is beside the train that stops there; the barrier at head 5 faces the stacks across the gap; the
  objective names it.
- *A gate keeps its meaning.* The deep span takes `seeds` at its own frame; a swimmer or glider reaches heads early and
  every post refuses.
- *Nobody is stranded.* Every sea head has a sea ramp; trains run both ways from every open halt; Canopy and head 5
  stay request stops; the Gorge has line 2 and the stair; the keys are the room's.
- *Lenses.* "A world that shortens behind you": the ring closes; the Gorge is one change from the Village. "Ending a beat
  facing the next": the leg ends in the split facing line 2 home; the next frame (the Notch) is a ride away and out of
  sight, the route plan's named exception (change 5), and the objective says "Ride home" until leg 6's rules ship.
  "The key in sight of the lock": `seeds` is long held, so the barrier is a beat, not a hunt. "A place to meet": Canopy,
  now on two lines, a 52 s walk apart (call 18).

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | 20 logs + 20 rails a section, about 30 s to lay; sections end at a place, up to about 900 m | Decided | [16 November](../decisions-rail.md#d-2026-11-16-batch2-greybox-section-length-and-lay-time) |
| 2 | One fixed order: the Wall opens once the cave leg is laid (`after: 4`); one leg open at a time | Decided | [12 November](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered); [16 November](../decisions-rail.md#d-2026-11-16-batch2-fixed-order-branch-wayfinding). The live "Order as the choice" question: question 1 |
| 3 | The Wall grows from Port Quay on the `cave` row, meets line 2 at the Gorge as two platforms; no lap in the greybox | Decided | Route review ruling 2 (call 19), confirmed 16 November ([batch-2 bulk](../decisions-rail.md#d-2026-11-16-batch2-bulk-confirmed)) |
| 4 | High Gorge has one station low in the split at 3 m for every line; the Wall comes down to the sea deck before the stacks | Decided | 10 November call, confirmed 16 November ([rail calls](../decisions-rail.md#d-2026-11-16-batch2-rail-calls-confirmed)) |
| 5 | Ends have buffers and read as terminals; double track; no kinks | Decided | 10 November (route review call 9) |
| 6 | Trains stop on request; a lever each platform side; right-hand running | Decided | [10 November](../decisions-rail.md#d-2026-11-10-trains-stop-on-request-at-the); [18 November](../decisions-rail.md#d-2026-11-18-decisions-page-rail) |
| 7 | Spacing and holds by the service health rule; budgets scale with the line | Decided | [23 November](../decisions-rail.md#d-2026-11-23-greybox-service-health) |
| 8 | `rail.legStock` predicted; the gate server-confirmed | Decided | [16 November](../decisions-rail.md#d-2026-11-16-batch2-greybox-stock-is-predicted) |
| 9 | Live for everyone, grey and labelled, the leg shipped whole | Decided | [12 November](../decisions-rail.md#d-2026-11-12-ring-island-build-2-and-the-greybox-route-answered) (4) |
| 10 | The deep span is a barrier on its section's frame that takes `seeds`; no collars | Decided | Owner call [greybox before detail](../agents/owner-calls.md#mechanisms-systems-greybox-details), 11 November; greybox-route section 3 |
| 11 | The cave line is offered Quick or Strong when its garage step comes; the Wall runs standard trains until then | Decided | [25 November](../decisions-core-loop.md#d-2026-11-25-order-picks-answers) (6) |
| 12 | Port Quay's turn eased tangent to the straight and the Wall swung 12 m off High Port's top; radius 40 m or more | Default | Findings 1, 2; Bell Rock's and the Saltpan's easing |
| 13 | Four corners of 15° to 36° eased by 300 m arcs | Default | Call 5 met rather than pinned (leg 4's three corners were pinned) |
| 14 | Six sections at the four islets, Canopy and the Gorge; Canopy's cut 10 m past its stop | Default | Ruling 1's cuts; leg 4's Saltpan rule |
| 15 | `WALL_N1` cut at `wall-n1`'s north-east tip, not its centre's pass, so both last sections stay under 900 m and the deep span is the open gap to the stacks | Default | Finding 7; call 1's 900 m |
| 16 | Frame 1 and rack 1 on Port Quay's outward platform, 10 m apart; section 1's kit rides a cave train | Default | Leg 3's Bell Rock form; trains already run there |
| 17 | The deep span's barrier at frame 6, 8 m short of head 5 | Default | Legs 2 to 4 moved theirs to the frame |
| 18 | **The Wall serves Canopy from its own halt on the isle's east side, a 52 s walk through the forest from the bay line's station, and crosses over the bay line's strait climb at 13 m (8 m clear); no flat crossing** | **New** | Finding 5: the crossing is forced and the sim has no interlocking; the cleft holds one line. Question 3 |
| 19 | The Wall enters the Gorge by the split's sea mouth, round the south stack's tip, and ends buffer to buffer with line 2 on the split's axis, platforms in the split's west half | Default | Call 4; finding 6; the end-on shape suits a later lap. Question 4 |
| 20 | `RAIL_PLACES` bounds per place: 40 m, Canopy about 300 m, the Gorge 65 m | Default | Calls 18 and 19 |
| 21 | A catalog-halt head never closes (Canopy); heads 1, 2, 4 close behind; head 5 stays a request stop both ways | Default | Leg 4's Saltpan; the built last-head rule |
| 22 | The cave line's fleet `[2, 2, 3, 3, 4, 4, 5]`, 50-tick dwell, three shed rows | Default | About a train per 1.3 km; the fuzz measures it |
| 23 | Port Quay re-laid: the apron split by the Wall's bed, the ramp's foot moved landward, a plank foot crossing, the town reserve moved | Default | Finding 4 |
| 24 | The four other islets as sheer hidden colliders under the horizon's mesh; heads over the sea with sea ramps; no town on the Wall's side of the Gorge | Default | Leg 3's islets; every sea head |
| 25 | Copy: three objective lines, the boards ([Controls and copy](#controls-and-copy)) | Default | Placeholder copy, none The Boogler's |
| 26 | Seeds `wall-mid`, `wall-deep`, `wall-closed`; jump rows on heads 2 and 5, `wall-closed` on the spawn until step 5 | Default | Leg 4's step 3 pattern |
| 27 | No new Bell Rock stall | Default | Ruling 2's fixed table has no Wall row |

**Counts:** 11 Decided, 15 Default, 1 New. Every Default and New call is logged in
[agent-calls](../agent-calls.md#rail-construction-levels-and-travel). **Suspect lines of The Boogler's:** none written,
changed or read as suspect.

### Findings

1. **(changed step 1) The Wall as drawn cannot be built.** It runs inside High Port's top, through Canopy's trunks and
   station and a chalk islet, crosses the bay line at grade, and bores the south stack onto line 2's buffers (level
   findings 2 to 6). The catalog step re-routes three places (calls 12, 18, 19); nothing of the Wall is built, so no
   player's world moves but through the bump.
2. **(changed step 1) Canopy's cut and `WALL_N1`.** Section 3 ended at Canopy's stop (leg 4's finding 1 again), and the
   re-route at the Gorge would make section 6 about 990 m from n1's centre pass (calls 14, 15).
3. **(changed step 2) Canopy would have closed behind.** `appendLeg` closes every head but the last two lays on; Canopy
   is a head inside this leg, so it would have closed once head 4 opened (call 21).
4. **(changed steps 4 and 5) Built massing lies on the Wall's line** at Port Quay (the apron, ramp, landing, town
   reserve) and in Canopy's forest; steps 4 and 5 re-lay what they cross (calls 23, 18).
5. **(no change) The Gorge end-on.** The confirmed call puts every line in the split; a bore beside the incline's would
   have kept more of the drawn line but contradicts "comes down to the sea deck before the stacks" (call 19).
6. **(no change) The material.** No step draws the Wall's islets: they are colliders under the horizon's mesh, so the
   live material question is the horizon's alone (question 2).
7. **(no change) Solo and co-op.** Solo works on the room's keys. The kit rides ahead, so the wait at each new rack is at
   most a headway; with the frames 1.2 to 5 km from the West landing that headway is the fleet's (call 22), and the
   checkpoint's idle log judges it.

## Open questions

None blocks the build; each proceeds on its recommendation. None is irreversible or outward-facing. Questions 1 and 2
are live owner questions this plan does not decide.

1. **"Order as the choice" (the live question in the state file): what leg 5 assumes.** Leg 5 builds on the fixed
   order, as leg 4 did: the Wall opens when the cave leg is laid. Physically the Wall can only follow the cave leg (it
   grows from Port Quay); what an order choice would change is that it also crosses the bay line next to Canopy, so if
   he picks "the room picks Canopy or the cave first", the Wall's `after` becomes "both the cave leg and Canopy's leg
   laid" (a one-line catalog field and its bump), and the shared forge rack's one-open-leg rule is the plan's to revisit
   then. **Recommended for this plan: build on the fixed order; the question stays his.**
2. **The Wall's material (the live session's question: pale chalk, or the cliff kit's sandstone as the held
   `codex/cliff-kit-horizon` dresses it).** No greybox step here assumes either: the islets are hidden colliders, and the
   only drawn Wall is the horizon's. **Recommended for this plan: leave the horizon to that branch and his answer.**
3. **Canopy on two lines: two stations about 290 m apart (52 s walk), the Wall over the bay line on a bridge?** The
   crossing is forced; the cleft holds one line; and the drawn route ran through the bay station. One interchange would
   mean re-routing the bay line's Canopy end, which leg 3 built. **Recommended: two stations and the overbridge (call
   18)**; a shared building is depth work for Canopy's town.
4. **The Wall arrives at the Gorge round the south stack into the split's west half, end-on to line 2, rather than
   through the stack.** It follows the confirmed High Gorge call and gives one concourse for both lines. **Recommended:
   yes (call 19).**

## What could not be verified while planning

- No still: no massing exists for the Wall; every placement is from the map data, the catalog and the levels.
- The three re-routes were measured as hermites and polylines in scratch scripts, not run through the generator; its
  arcs, height easing and the crossing's ruled height are reasoned from its code.
- The walk between Canopy's two stations and the quay's crossing wait for step 4's floods.
- The fleet against the service budget and the kit's wait at the far heads wait for step 2's fuzz and the checkpoint's
  idle log.
