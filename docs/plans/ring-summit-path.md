# Ring Island: the summit path over the stack line's cutting

**Goal.** The drawn path from Ring Island's west platform to the summit lookout walks straight off the rim of the
stack line's cutting; put a footbridge there so the path the world draws can be walked again. Serves DESIGN 7
(Telegraph everything: a drawn path is a promise) and 11 (Show, don't tell: the way up is seen, not explained). No
principle is bent.

**Status.** Plan only, not reviewed, nothing built. Written 14 November 2026 from origin/main `35e1c3431`, world v44.

**Research:** [level-design-tools](../research/level-design-tools.md) (one inspectable description per place, checked
by queries: step 1 moves the path out of the view into data the level check reads);
[progression-flow-layout](../research/progression-flow-layout.md) ("nobody stranded", "gates keep their meaning": see
Level findings 4 and 5). **Port from Place:** nothing ported. **Rail route:** no bill, supply or cue changes; the
bridge stands over section 1 of the stack leg (s 1191 to 1701 m) and touches no beat, so no `npm run loop` node was
read and no step needs `npm run loop -- run`. **In flight** (`npm run inflight`, 14 November): no branch touches
`src/entities/ring-island/`, `dev/level/ring.ts` or `dev/look/evals/ring-island-walk.ts`.

## Measured: where and why the walk is severed

All from `src/entities/ring-island/ground.ts` (`createIslandGround`, the grid the drawn mesh and the heightfield
collider share), `dev/level/flood.ts` with `MOVER` (walk slope 1.52, jump 1.60 m), and one real-input run of
`dev/look/evals/ring-island-walk.ts` (seed `crossing-done`).

- **Where.** The path's third leg, (1380, -870) to (1395, -930) (`view.ts`, the `way` list), crosses the stack line's
  cutting (`STACK_CUT`, line 2 at s 1265 to 1275 m; u 508 to 535, lat -33 to -27). Measured along the path from its
  foot at the west platform's ramp: on uncut ground to 55 m, in the cutting from 55 m to 84 m, on uncut ground again
  from 84 m.
- **Heights.** North (halt side) rim 15.3 m; floor 4.7 to 5.0 m (rails at 5.7 m); south (summit side) rim 20.8 m.
  So a 10.6 m drop in, a 16.1 m wall out, and 29 m rim to rim along the path's line. The ground under the path is
  up to 14.5 m below the hill the path was laid on.
- **Slopes.** The walls are cut at 3 in 1 (`STACK_CUT_WALL`, 71.6 degrees); the steepest metre under the path is
  264 %. The controller climbs 152 % (`WALKABLE_NY` 0.55, 56.6 degrees). The rest of the path is at most 21 %.
- **Why.** The path was laid in R2b (#1452) on the bare cones. The cutting came with the greybox route's leg 1 step 4
  (`e4ea16145`), which capped the ground along line 2 from s 1210 to 1580 m: 370 m long, up to 22.9 m deep (s 1350),
  up to 32 m wide at the rims, between the halt and the whole hill. The path's waypoints are literals in `view.ts`
  and follow `islandH`, so its beams were silently draped down the walls. PR 1788 (14 November) hid Place's far cones
  over the cutting, which made the hole visible; it changed no height.
- **Why no check caught it.** `npm run level-check` passes today (13 reports, none about this): its Ring Island
  section checks the gap, the halt, the crossing and the run-off, and nothing reads the path. The walk eval that
  would catch it is a look, not in any check, and holds its own copy of the waypoints.
- **The witness** (`npm run look -- --rail-seed crossing-done --eval dev/look/evals/ring-island-walk.ts --until ...`):
  `halt.ok true` in 8.5 s; path legs 0 to 3 reached; leg 4 failed: the walker left the rim, was airborne 0.7 s, and
  stopped at (1387.7, 5.3, -899.7), on the cutting floor against the south wall. `walk.ok false`, `onLookout false`,
  the saved pose and the reload both failed after it. This is the 12 November note "fails about 60 m north of the
  platforms" (55 m along the path).
- **Reach today.** The summit is not cut off, only the path is: the flood from the path's foot reaches the south rim,
  waypoint (1395, -930) and the lookout's foot, by walking across the tracks where the cutting is under 1 m deep
  (s 1210 to 1220, at the platforms' north end) or round the hill. From the cutting floor the reverse flood gets
  back to the halt (the floor is the track bed; it walks out at both ends). So nobody is stranded, but the marked
  way ends in an 11 m fall onto the line.

## Options

| | A. Footbridge at s 1260 (recommended) | B. Path moved east of the cutting | C. Steps down both walls, planks over the tracks |
| --- | --- | --- | --- |
| What a player sees | The path climbs from the west platform as now, reaches the rim and crosses a 28 m orange-steel and timber footbridge 9.5 m over the rails, trains passing under; then on up the hill | The west path is gone. A new ramp off the east platform's north end; a plain path climbs the hillside east of the cutting and joins the old one at (1395, -930) | The path zigzags 10.6 m down a stair cut in the north wall, crosses both tracks on planks in the bottom of the cutting, and climbs a 16.1 m stair up the south wall |
| Measured | Abutments (1381.2, -876.7) at 14.81 m and (1404.7, -892.0) at 16.60 m: span 28.0 m, rise 1.79 m (6.4 %), both 3 m behind the rim on uncut ground. Whole path 326 m (was 314), steepest 21 % | Waypoints `at(470, 3.5)`, `at(478, 9)`, `at(500, 12)`, `at(530, 4)`, then (1395, -930): 308 m, steepest 28 % (the first metres off the platform, which need a ramp), never within 1.3 m of cut ground | 26.7 m of stairs; a second place where walkers cross live track, at the bottom of a curve with 12 m walls and no sight line |
| Touches | `src/entities/ring-island/` view and a new pure path file; the walk eval; `dev/level/ring.ts`; one test. No heights, no sim, no world rules, no wire, no save: **no `WORLD_NS` bump** | The same files, plus the east platform's end and the works yard's corner (u 468, lat 5.3 to 16). No heights, no `WORLD_NS` bump | `ground.ts` heights (the stairs are ground or a stack of solids), so the collider, `islandH` (recovery, saved pose) and `test/ring-island-ground.test.ts` change; the crossing needs the train-versus-player handling of [ring-island-crossing](ring-island-crossing.md) step 2 again. Still local: no `WORLD_NS` bump |
| Reach and order | Nothing new: both abutments are already in the walked flood from the halt (Level finding 4) | Nothing new, same reason | Nothing new |
| Cost | About 14 boxes in the island's one merged mesh (0 added draw calls), 9 static box colliders, no tick work | 1 ramp, about 20 path beams less than today's count; 0 draw calls | The largest: terrain, tests, and train handling |
| Against | A structure to detail later | The lookout's start leaves the side the station house and its terrace are on; the walk loses the one view down into the cutting; the first 55 m of today's path must go or it still leads to the edge | Most work, and it adds a hazard to fix a hazard |

**Recommendation: A.** It keeps the path where it starts today, turns the defect into the walk's best moment (a
bridge over the trains on the way to the lookout), changes no height and no shared state, and is the smallest change
that makes the drawn path true. It follows "Place for the look, not the cost" (the bridge is where the path wants to
cross, not where crossing is cheapest) and "Block out spacing first, details later" (step 2 is plain boxes at true
size; the truss is a later look job). B is the fallback if the owner does not want a structure.

Why s 1260 and not the path's present line: on today's line the rims are 29 m apart and 5.5 m different in height
(a 19 % deck); square to the track at s 1260 they are 25 m apart and 1.6 m different, the deck is 9.5 m over the
rails, and the bridge shows side-on from the west platform's north end about 50 m away.

## Design (option A)

**Sync kind: Local** for every piece ([sync](../agents/sync.md), "Pick a sync kind"): static scenery and static
colliders built by the island's near view on each tab, as the rest of `src/entities/ring-island/` ("Local: no sync,
no saves"). No authority question; nothing cosmetic-only that looks solid (see the solid column). No lockstep state,
no op, no state key, no `src/world/rules/types.ts` entry, no `env` fact, no controls, no prompt, no copy.

**The path as data: new `src/entities/ring-island/path.ts`** (pure: no three.js, no physics; imports
`railway-ring-layout.ts`, `railway-route.ts` and `./ground.ts`, as `ground.ts` does).

- `SUMMIT_BRIDGE = { sCm: 126000, off: 14, width: 3, thick: 0.3, parapet: 1.05, bents: [7.1, 20.9] } as const`.
- `summitPathFoot()`: `ringAt(RING_HALT.u1 - 400, RING_HALT.upLat[0] - 950)` in metres (today's `pathFoot` in
  `view.ts`, (1395.8, -836.3)).
- `summitBridge(g)`: the formation's middle at `sCm` computed as `STACK_CUT` computes it (`rowPoint('ring', sCm +
  ROW_SHIFT.ring)` and the point 1 m on, 2 m to the west of the down track), then `off` metres either side along the
  normal: `a` (halt side) and `b` (summit side), each `{ x, y, z }` with `y = g.islandH(x, z) + 0.12` (the path
  beams' top), plus `rail` (the row's y there, 6.05 m). Expected: a (1381.2, 14.93, -876.7), b (1404.7, 16.72,
  -892.0), middle (1392.9, -884.3).
- `summitPath(g, centre)`: `{ way, bridgeLeg: 2 }` with `way` = foot, foot + (-18, -8), a, b, (1395, -930),
  (1360, -975), (1372, -1035), (1345, -1075), (centre.x + 4, centre.z + 6). Only the old (1380, -870) is replaced.
- `summitPathFacts(g, centre)`: samples every 0.5 m and returns `{ length, steepest: { grade, at }, cut: { depth, at },
  bridge: { span, grade, clearance, abutmentCut } }`, where `cut` is the largest `g.cone - g.islandH` within 1.3 m of
  the line off the bridge leg, `abutmentCut` the same within 2 m of `a` and `b`, and `clearance` the deck's underside
  at mid-span less `rail`. The test and the level check both read this one function.

**The bridge, blocked out** (in `view.ts`, with its existing helpers; everything that looks solid is solid, which is
the owner's note about this hillside):

| Piece | Size and place | Colour | Solid |
| --- | --- | --- | --- |
| Deck | `beam(a, b, 3.0, 0.3)`: 28 m, top flush with the path at both ends | `TIMBER` | yes |
| Two parapets | `beam`, 0.12 wide, 1.05 high, 1.44 m either side of the deck's middle, a to b | `STEEL` (the folk's orange) | yes |
| Two abutments | `beam`, 3.4 wide, 1.2 deep, from 1.5 m behind `a` (and `b`) to 0.5 m onto the span, top at the deck's underside | `CONCRETE` | yes |
| Two bents | at 7.1 m and 20.9 m along the deck (6.9 m either side of the formation's middle, 0.3 m outside the cutting's flat floor and 2.3 m outside the slab): two `post`s 0.5 square, 1.2 m either side of the deck's middle, from 0.5 m under the ground to the deck's underside, and a cap `beam` 3.4 by 0.4 | `STEEL_DARK` | yes |

The path loop skips `bridgeLeg` (no ground beams draped into the cutting). No truss, lamps or signs in this plan.

**The walk eval** imports `summitPath` instead of holding its own list, so the witness can never drift from the view
again, and gains two stills: `ringview=bridge` (camera (1374, 17.5, -872) looking at (1404.7, 17, -892): the deck from
the halt-side rim) and `ringview=cut` (camera (1411, 10.6, -852), PR 1788's track-level spot, looking at
(1392.9, 14, -884.3): the bridge from the line).

## Steps

Model rows are from `npm run models` (mode withCodex, 14 November).

- [ ] **0. Design review of this plan** before any build: the designer rules on the option, the Level findings and
  the open questions. *Row: design review of a plan (designer agent: fable medium).*
- [ ] **1. The path as data, and the check that fails today.** Create `src/entities/ring-island/path.ts` as under
  Design, but with `summitPath` still returning **today's** waypoints (`bridgeLeg: -1`), and have `view.ts` build its
  path from it (delete the `way` literal and the local `pathFoot` expression; no visible change). Create
  `test/ring-island-path.test.ts` with: `summitPathFoot` is (1395.8, -836.3) within 0.1 m; `summitBridge` gives the
  expected a, b and middle within 0.1 m, `abutmentCut` under 0.1 m, span 28 m, grade under 8 %, clearance over 8 m;
  and, marked `todo` until step 2, "off the bridge the path is never within 1.3 m of cut ground (under 0.2 m) and
  never steeper than `MOVER.walkSlope`" (today: 14.51 m at 75 m, 264 % at 81 m). Add a section "The summit path" to
  `dev/level/ring.ts` that prints the facts and holds the same two assertions as reports for this step. Verify:
  `node --test test/ring-island-path.test.ts test/ring-island-ground.test.ts`; `npm run level-check` prints the
  section with the two failures as reports; `node dev/ship-check.ts` green. *Row: implementation of an approved plan
  (Codex: gpt-6.1-sol medium).*
- [ ] **2. The bridge and the re-pointed path.** In `path.ts` switch `summitPath` to the new waypoints and
  `bridgeLeg: 2`. In `view.ts` skip the bridge leg in the path loop and add the deck, parapets, abutments and bents
  from the table. Un-`todo` the test; turn the level check's two reports into `check`s that fail. Update
  `src/entities/ring-island/view.ts`'s header comment and `docs/game-design/place.md` (the paragraph on the stack
  line's cutting, by "they now hide while the island's own ground is up": add the footbridge and its numbers).
  Verify: the test passes with length 326 m, steepest 21 %, cut 0.03 m; `npm run level-check` shows "The summit path"
  ok and stays at its present report count otherwise; `node dev/ship-check.ts` green. *Row: player-visible
  implementation (implementer agent, model fable: fable medium).*
- [ ] **3. The witness and the stills.** In `dev/look/evals/ring-island-walk.ts` import `summitPath` from
  `/src/entities/ring-island/path.ts` for `way` (its last two points, the lookout ramp's foot and the deck, stay the
  eval's own), add `bridge` and `cut` to `VIEWS` and to the `ringview` branch, and add `bridge: { onDeck, y }` to the
  walk's log when the walker is between a and b. Verify: the eval file type-checks (`node dev/ship-check.ts`). *Row:
  implementation of an approved plan (Codex: gpt-6.1-sol medium); may ride with step 2's implementer.*
- [ ] **4. Checkpoint: "summit path walks"** (the full check and the proofs are here, not in the steps). *Row:
  runner (Codex: gpt-6.1-sol medium) for the proofs; visual review by a fresh general-purpose subagent that did not
  build it (fable medium).* Its few proofs:
  1. `npm run level-check`: "The summit path" ok.
  2. The walk, by real input: `npm run look -- --rail-seed crossing-done --eval dev/look/evals/ring-island-walk.ts
     --until "window.__ringIslandDone ?? (import('/dev/look/evals/ring-island-walk.ts'), false)"`: `walk.ok` and
     `onLookout` true, `swamFrames` 0, `longestAirS` under 0.3 (today 0.7), the walker on the deck between a and b,
     `reload.restored` true. Build 1's run was 378 m in 70 s; expect about 390 m.
  3. Two proof looks, opened and judged: `--query ringview=bridge` and `--rail-seed stack-laid-1 --query
     ringview=cut` (beside PR 1788's `.look/cut-eye-after-still.png`): the deck meets the path at both rims with no
     step or gap, no path beam hangs down a wall, the bents stand on rock and clear of the rails, the bridge reads
     against the pale cut rock.
  4. Cost, reported not gated: `--query ringview=perf` before and after (draw calls with the near view, its CPU rows).
  Then tick round-4 note 27's follow-up and the "walk to the lookout fails" line in
  `docs/agents/orchestrator-state.md`, and ship with `npm run ship`. Not tested on a device unless the owner asks.

## Level findings

Run on the planned positions before review (`npm run level-check` on main, plus `summitPathFacts`' arithmetic and
`dev/level/flood.ts` over the island's own grid, since the level check does not yet read this path).

1. **Today the path fails; the level check does not see it.** Cut ground 14.51 m deep under the path at 75 m, 264 %
   at 81 m; `npm run level-check` is green. Step 1 closes the hole in the check.
2. **The bridge's ends stand on the hill.** Cut depth within 2 m of a: 0.02 m; of b: 0.00 m. At 12.5 m from the
   middle instead of 14 m the ends would overhang cut ground by 0.74 and 1.10 m, so `off` is 14.
3. **Grades.** Deck 6.4 %; the path off the bridge at most 21 % (at 323 m, the last climb to the lookout, unchanged);
   limit 152 %. Under the deck the ground is 5.2 to 5.6 m from 8 m to 20 m along it; the deck's underside is 15.5 m at
   mid-span, 9.5 m over the rails (6.05 m).
4. **Nothing is reachable earlier than today.** The flood from the path's foot already reaches both abutments, the
   waypoint at (1395, -930) and the lookout's foot without the bridge (north rim to south rim on foot today: 62 to
   67 m, through the cutting's shallow end). The bridge shortens a walk; it opens no ground. Nothing on the island is
   gated by height or ability south of the cutting: no find, ring or gate is placed on the hill, and the stack leg's
   frames, racks and heads are at the west platform and from s 1683 on, none within 400 m of the bridge (by grep of `src/entities/finds` and `railway-route.ts`).
5. **Nobody is stranded.** A player who jumps the 1.05 m parapet or steps off the rim lands on the cutting floor, as
   today; the reverse flood from the halt reaches the floor, which walks out along the track at both ends.
6. **Not checked by any tool:** the follow camera under the bridge while riding a train (the deck is 9.5 m over the
   rails), and a saved pose on the deck or under it (Place's pose policy does not keep a pose on a deck or under a
   roof; the player returns by the recovery rule). Proof 2 and one ride under the bridge at the checkpoint cover them.
7. **For the designer's ruling:** the cutting's rims are an unfenced drop of up to 23 m for 330 m (s 1220 to 1550),
   and the path now runs 7 m from the north rim on its way to the bridge. See open question 2.

## Risks

- **Room safety** ([room-safety](../agents/room-safety.md), "Don't"): none applies. No apply, accepted effect,
  presence, transport or save changes; the colliders are static scenery added to the island's one body.
- **Mixed builds:** none. No wire, state, catalog or op changes, so no `WORLD_NS` bump and no history line. A tab on
  the old build has no bridge collider: it sees another player cross the bridge in the air over the cutting, until it
  reloads. Development phase, no compatibility code.
- **Hotspot files:** `src/entities/ring-island/view.ts` (907 lines; the build-2 and greybox jobs edit it) and
  `dev/level/ring.ts`. Keep the hunks to the path block; no branch is on them today.
- **Terrain pass.** [terrain-pass](terrain-pass.md) proposes shelves, gullies and a softened summit on this island and
  warns that "the path's fixed waypoints may then cross a gully or a terrace riser". After step 1 that is a failing
  check, not a playtest note; the bridge's ends are computed from the line and the ground, so they move with both.
- **Lockstep:** not touched. `path.ts` imports `src/sim` data read-only, as `ground.ts` does.
- **Performance:** about 14 boxes in the near view's merged mesh (no new draw call, material or light) and 9 box
  colliders; no tick work. Report `ringview=perf` at the checkpoint; it gates nothing.
- **Look:** a 28 m plank on two trestles may read as scaffolding until the truss job. That is the blockout call's
  intent; the visual reviewer says if it reads as unfinished rather than plain.

## Open questions

1. **Bridge, or move the path east?** Recommended: the footbridge (A). B is ready as the fallback and costs about the
   same to build.
2. **Fence the cutting's rim?** Recommended: no, not now. A fall lands on the track bed, which walks out; nothing
   measured says players fall in once the path no longer leads there ("No limits ahead of a measured problem"). Look
   again after the next playtest.
3. **The bridge's look for now.** Recommended: the folk's orange steel parapets on a timber deck as plain blocks,
   with the truss, lamps and any sign left to a later look job ("Block out spacing first, details later").

## Design review (designer, 2026-11-14)

**Ruling: build option A, the footbridge at s 1260, with one change to the path's data (finding 1).** No rim fence
now. The blockout look stands. Nothing here is direction, new scope or irreversible, so nothing waits for the owner.

Read for this: DESIGN.md; owner-calls ("Place for the look, not the cost; terrain may change", "Block out spacing
first, details later", "Rank every note", "Playtest before bespoke functionality", "A recent reload puts you back where
you were", "No limits ahead of a measured problem"); decisions-rail's Current rules; `ground.ts`, `view.ts`,
`railway-ring-layout.ts` and the greybox's `ring-house.ts`; [level-design](../research/level-design.md),
[route-contract](../research/route-contract.md) and
[progression-flow-layout](../research/progression-flow-layout.md). The plan's abutment heights were re-computed from
`createIslandGround` and match (a 14.81 m, b 16.60 m, 5.23 m under mid-span; the summit is 66 m).

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The drawn walk from the west platform to the summit lookout stays and is made true, not removed | Decided | As built in Ring Island build 1 (R2b: the path and the lookout); DESIGN 7 |
| 2 | A footbridge over the cutting (A), not the path moved east (B) or steps and planks (C) | New | A. See "Why A, and why not B" |
| 3 | The site: square to the line at s 1260, abutments 3 m behind each rim, span 28 m, rise 6.4 %, deck 9.5 m over the rails | Default | Ships. The rims are closest and most level there, and it is where the drawn path already vanishes under the shard (the halt still) |
| 4 | The site is chosen for how it looks and walks, not for the cheapest crossing (the shallow end at s 1210 to 1220) | Decided | Owner call, 14 November, "Place for the look, not the cost; terrain may change" |
| 5 | The bridge is the folk's and stands from the island's first load, before the stack line is laid; trains pass under it only once stack section 1 is laid | Default | Ships. Before that it spans an empty cutting 29 m past the buffers, which says a line goes on here (DESIGN 7) |
| 6 | Deck 3.0 m wide in timber (the path is 2.6 m) | Default | Ships. Two players pass or walk abreast |
| 7 | Parapets 1.05 m high, solid, and low enough to jump (the jump is 1.60 m) | Default | Ships. Hopping the parapet onto the line is a toy, not a failure (DESIGN 10) |
| 8 | Two bents stand in the cutting, 0.3 m outside its flat floor | Default | Ships. They are clear of the formation; the checkpoint's `ringview=cut` still confirms |
| 9 | Everything on the bridge that looks solid is solid | Decided | Rail, 2 November, "what looks solid is solid" |
| 10 | Plain blocks at true size now; truss, lamps and signs in a later look job | Decided | Owner call, 14 November, "Block out spacing first, details later" |
| 11 | Colours: the folk's orange parapets, timber deck, concrete abutments, dark steel bents | Default | Ships. Same orange as the Way's trusses, so it reads as theirs |
| 12 | No sign, prompt, control or copy on or about the bridge | Default | Ships. Matches the halt's foot crossing ("nothing marks it but the timber"); DESIGN 11 |
| 13 | The cutting's rims stay unfenced (up to 23 m, 330 m long) | Default | No fence. See finding 3 |
| 14 | A fall lands on the track bed and the player walks out along the line; no damage, no rescue, and a passing train shoves as it does today | Default | Ships as today's behaviour. From under the bridge the shallow end is 45 m, 8 s |
| 15 | Nothing gated, found or rewarded stands on the bridge or the hill; the bridge shortens a walk and opens no ground | Decided | [route-contract](../research/route-contract.md), adopted 6 November: movement may skip distance, never work. Checked: the deck (16.6 m) is lower than ground already walked (the summit, 66 m), so it is no perch |
| 16 | The path meets the bridge at a 51° turn on abutment a, with the rim 5.75 m straight on | Default | Change it: finding 1 |
| 17 | The rest of the path is unchanged: about 326 m, 58 s at the walk, steepest 21 % | Default | Ships |
| 18 | A reload on the deck returns the player to a recovery point (the path's foot is one, about 55 m away), not to the deck | Default | Ships for now. [resume-where-you-were](resume-where-you-were.md) owns the fix under the owner's 14 November call; a deck pose there should restore at the nearer abutment |

Decided 5, Default 12, New 1.

### Why A, and why not B

- **It is the moment the island's first view already sets up.** The halt still (`--query ringview=halt`, read for
  this review) shows the cream path leaving the platform's north end, turning uphill and vanishing into the pale
  notch directly under the ring and the shard. A bridge at that spot is the middle of a reveal chain, hill, then
  structure, then landmark ([level-design](../research/level-design.md), rule 3), with the shard as the area's one
  tall landmark (rule 5). An arriving train faces it too: it crosses the line dead ahead, beyond the buffers.
- **A footbridge over a working line belongs in a railway game.** Once section 1 is laid it is the island's place to
  watch trains from above, and in co-op the place where one player on foot and one on a train meet eyes. It is also a
  spot a group can name ("meet at the bridge"; progression-flow's meeting-place lens).
- **B is safer and duller.** B never comes within 1.3 m of cut ground, which is its one real advantage. It gives up
  the start beside the station house terrace, the only view down into the cutting, and needs 55 m of today's path
  removed or it still leads to the edge. The hazard B avoids is mild (finding 3). B stays the fallback.
- **C** adds a second live-track crossing on a blind curve. Agreed: no.
- **Not in the plan, considered here:** roofing the cutting for 10 m as a land bridge ("terrain may change" allows
  it). Rejected: it changes heights and the collider, and brings back the track running into a hill face, which is the
  owner's note this cutting answered.

### Findings

1. **Change before step 1 fixes the path's data: straighten the uphill approach.** As planned the path climbs to
   abutment a heading almost due south and the deck leaves 51° to the left. A player who runs straight on reaches the
   rim in 5.75 m and an 8 m drop 3 m after it. The drawn path would still point over the edge, at a smaller scale than
   today. Add one waypoint 8 m behind a on the deck's own axis, computed like a and b and not a literal: about
   (1374.5, -872.3), ground 14.19 m, uncut. The way becomes foot, foot + (-18, -8), that point, a, b, and on;
   `bridgeLeg` becomes 3. The turn (64°) then happens 12 m from the rim and the last 8 m point down the deck. Grades
   stay at most 21 %; the path grows by about 3.6 m, so the tests' expected length becomes about 330 m. The downhill
   side needs nothing: straight on from b runs along the east rim and meets only the shallow end after 15 m. Lens:
   end a beat facing the next. Evidence: measured on `createIslandGround`, not walked.
2. **"Trains passing under" is true only from stack section 1.** At the `crossing-done` seed the buffers stand at
   u 483 and the bridge is at u 512, so proof look `ringview=bridge` shows no train and that is correct. Add the
   existing `ringview=halt` still to the checkpoint's looks: it is the player's first sight of the bridge and the one
   that says whether it reads from the platform under the shard.
3. **No fence: agreed, on different grounds.** The plan cites "No limits ahead of a measured problem", which is about
   content budgets. The grounds that hold: there is no fall damage, the floor walks out at both ends (flow rule 3,
   nobody stranded, by the plan's reverse flood), a tumble into the cutting is slapstick (DESIGN 10), and a fence is
   detail on a blockout. With finding 1 the path no longer aims at the rim; it runs 8 to 23 m from it and only the
   last metres to each abutment come within 4 m. One thing to look at, not to build: from the uphill (south) side the
   rim is a convex edge that may not show until a player is on it. Take one still at the checkpoint from 15 m uphill
   of the south rim looking down; if the edge cannot be seen, a line of rocks along it is the cheap answer, logged as
   a P3.
4. **The leaning station house looks through the bridge's airspace.** The greybox house (`ring-house.ts`, u 474,
   lat -16) aims its window at the shard on a bearing of -12°; the bridge's middle is 38 m away at -9°, with its ends
   at -30° and +7°. The deck sits about 10° above the bench's eye and the shard about 25°, so the bridge does not
   cover the shard; it is an orange bar under it, against the hill. Probably a gain (folk and players crossing under
   the shard), but it was not seen: the house is a `?ring=greybox` proposal and the bridge is not built. The house's
   production job should take that still. It does not crowd the terrace (the path passes 8.5 m west of it) or the
   foot crossing (80 m south).
5. **Rank.** The tracker and the state file log this as P2 ("walk to the lookout fails", and note 27's follow-up).
   By the rank meanings it is P2: the drawn way looks broken and drops you on the line, but nothing on the route needs
   the lookout. The plan should state its rank in Status. It is small and view-only, so building it now is right at
   either rank.
6. **Order and fit.** Static scenery on a greybox island: it is layout, not a bespoke mechanic, so "Playtest before
   bespoke functionality" does not hold it. Port from Place: nothing is ported; agreed.
7. **Co-op and solo.** No rule differs. Not checked by anything: whether a player who jumps from the deck can land on
   a train's roof and ride it, and the follow camera of a rider passing under the deck (the plan's Level finding 6
   puts one ride-under at the checkpoint; keep it, and try the jump once).
8. **After the bridge the walk is quiet:** about 246 m, 44 s, of plain path to the lookout with only the view. Not
   this plan's job; it is the terrain pass's. Logged as a P3.
9. **What this review could not see.** Stills with `--cam` on this seed draw only the far cones (the island's near
   view loads round the player), so the cutting and the rims were not seen at close range. Read instead: the halt
   still, three far-view stills (platform end to the site, the rim, the house's spot to the shard), PR 1788's
   description and the ground's numbers. The walk was not re-run. No playtest data covers Ring Island's hill.

**Suspect copy:** none; the plan adds no words.

### Owner questions

1. **A footbridge over the cutting, or the path moved east of it?** Recommended: the footbridge. Building proceeds
   on it.
2. **Leave the cutting's rims unfenced for now?** Recommended: yes. Falls cost a short walk out along the line; look
   again if play shows people falling in by accident.
3. **Is this a P2, as logged, or a P1?** Recommended: P2. It is being built now either way.
