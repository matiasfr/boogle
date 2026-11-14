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
