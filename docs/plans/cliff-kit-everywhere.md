# Cliff kit everywhere: census and plan

_Plan, 24 November 2026, on main `5677ad643`. Census and plan only: no game code changed. Stills were taken on a
shared machine (other worktrees' captures in the same queue), so they are evidence of shape and colour only, not of
timing, shimmer or motion. Not tested on a device._

_Revised 24 November 2026 to the owner's answers on the open questions
([d-2026-11-24-cliff-kit-scope](../decisions-look.md#d-2026-11-24-cliff-kit-scope)): the shore's cove face is replaced
with kit faces; kit faces go only where a wall's toe is within 40 m of a tread or rail, or at the sea, and farther walls
take the kit's colour and rim caps; the Sickle horizon, Needle Bell and props (loose boulders, works rocks, caves) are in
this pass. Step 0 (the generator and its audit) is built on `claude/cliff-kit-step0`; its results are under
[Step 0 as built](#step-0-as-built). The revised parts have their own design review at the end._

> **Owner, 24 November 2026** ([d-2026-11-24-chunky-every-cliff](../decisions-look.md#d-2026-11-24-chunky-every-cliff)):
> "do we have queued up to basically apply the same art treatment to all of the walls in the environment, are all the
> cliffs, not just one specific part? For example, now it feels inconsistent that we have these walls and then
> different ones near the shore. Um, they should feel like they're from the same sort of stylistic palate. Uh, or the
> same world at least."

## Goal

Every cliff and rock wall a player can see reads as the Chunky Sunshine kit's rock
([d-2026-11-24-canyon-kit-chunky-sunshine](../decisions-look.md#d-2026-11-24-canyon-kit-chunky-sunshine)): one
palette, one world. The [14 November rules](../decisions-look.md#d-2026-11-14-terrain-simple-geometry-cleanup-first)
stand: the walkable ground stays simple, the kit is scenery with colliders, and no piece is ever a new way up. Area by
area, the shore first, each with matched before and after stills.

## Census

**Tools** (dev only, no game code):

- `node dev/ground/cliff-census.ts` groups every 2 m vertex of Home's heightfield that the ground material paints as
  rock (`src/place/ground-material.ts`: `steep` past its border, or the broad slope's `soil` under 0.57, without the
  per-pixel wander) into connected walls, with extent, height, how near the paths, the shore climb, the rails and the
  sea come, and the length of toe (rock above lower open ground: where faces stand) and rim (where caps go), all and
  within 80 m of a path, shore climb or rail, or at the sea. `--json` for the walls; `.look/cliff-census.json`.
- `node dev/ground/cliff-census.ts --anchors` trials a 6 m face every 8 m along each wall's seen toe, turned to face
  downhill, against the canyon kit's own rules (`kitPieceProblems`, which `npm run level-check` runs on the built kit)
  and 6 m of clearance from every rail's centre line. `.look/cliff-anchors.json` holds every trial position.
- `npm run look -- --action dev/look/evals/cliff-counts.ts` reads draws and triangles at the census cameras below.

**Home's heightfield** (Place-local metres; world x is Place x + 1000). Eleven walls of 100 m² or more, 15,884 m² in
all. Triangles are the heightfield's own, two a 2 m cell, already drawn in the land's one draw; nothing here adds a
draw today.

| # | Wall | Place-local box (x, z) | y (m) | Nearest path / shore climb / rail / sea (m) | Toe, all / seen (m) | Rim, all / seen (m) | Rock tris | Seen from |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Gorge north and the canyon climb (the kit's wedge is in it) | -102..58, -246..-40 | 1.2..39.1 | 4 / 148 / 1 / 2 | 490 / 422 | 800 / 758 | 2,738 | camp path, the north line's trestle, the canyon climb |
| 1 | Far Head | 314..460, -246..-100 | -4.2..24.2 | 295 / 483 / 1 / 0 | 412 / 412 | 358 / 336 | 2,198 | Far Head's line and halt, the sea |
| 2 | Gorge east wall | -20..82, -202..152 | 1.3..25.5 | 3 / 134 / 0 / 4 | 270 / 270 | 554 / 554 | 1,276 | the lines along the gorge, the river, Needle Bell |
| 3 | Gorge west wall (village side) | -92..-4, -96..138 | 1.3..19.2 | 4 / 106 / 1 / 6 | 230 / 230 | 332 / 332 | 740 | village edge, the lines, the summit |
| 4 | Gorge mouth, east side | -26..6, 138..176 | 1.3..23.8 | 4 / 158 / 109 / 6 | 74 / 74 | 76 / 76 | 202 | the sea, the south paths |
| 5 | North ridge | -78..-6, -188..-174 | 23.7..46.7 | 4 / 209 / 34 / 25 | 84 / 84 | 86 / 86 | 200 | camp path's shoulder |
| 6 | Gorge, rim lookout side | -116..-64, -150..-92 | -2.2..17.9 | 4 / 137 / 33 / 0 | 92 / 92 | 78 / 78 | 192 | camp path past the rim lookout ([still](cliff-kit-everywhere/gorge-rim-lookout.jpg)) |
| 7 | South sea cliff | 40..96, 178..186 | 5.8..13.6 | 27 / 230 / 139 / 7 | 62 / 62 | 58 / 58 | 142 | the sea, the south coast |
| 8 | Gorge mouth, west side | -56..-40, 144..176 | -2.2..19.1 | 6 / 150 / 118 / 2 | 42 / 42 | 40 / 40 | 88 | the sea ([still](cliff-kit-everywhere/gorge-mouth-from-sea.jpg)) |
| 9 | Shore climb | -188..-172, -16..16 | 4..16 | 64 / 8 / 89 / 19 | 36 / 36 | 38 / 38 | 86 | the landing, the shore climb, the sea ([still](cliff-kit-everywhere/shore-climb.jpg)) |
| 10 | East rail cutting | 186..198, -52..-30 | 6.7..24.2 | 126 / 327 / 0 / 7 | 30 / 30 | 30 / 30 | 80 | line 2 |

**Authored rock** (an inventory of the code, read-only):

| Thing | Where | Built as | Rock colour from | Colliders | Status | Seen from |
| --- | --- | --- | --- | --- | --- | --- |
| West cove face and its three boulders (**the shore**) | `src/place/cove.ts` `cliff()`, `COVE_ROCKS`; Place x -216..-154, z 30..80 | sculpted mesh, 1,594 + 348 triangles, one draw (`cove-view.ts`) | the cove's own recipe (`cove-material.ts` `applyCoveLayers`: raw sandstone pigments `rockR/G/B` 0.58/0.19/0.045, broad bands) | trimesh | final | the landing, the shore climb, the sea ([still](cliff-kit-everywhere/shore-cove-face.jpg)) |
| Home ground round the landing | `cove-ground.ts`: world x 735..885, z -20..110 | the heightfield (wall 9 and the shore's slopes) | **also** `applyCoveLayers`, not `rockLayers` | heightfield | final | as above |
| Shore boulder | `land.ts` (`SHORE_HOP`, Place -165, 39) | 7-sided cylinder | `spireRock` (`#c6a274` with the look on) | cylinder | final | the shore climb |
| Needle Bell | `land.ts` `buildSpire`, Place (8, -10), 105 m | five leaning drums | `spireRock` (`#8c8478`, `#a2978a`; pale in the stills) | a cylinder a drum | final landmark | everywhere on Home ([still](cliff-kit-everywhere/needle-bell-spire.jpg)) |
| Ring Island's stack cut and rim rocks | `src/entities/ring-island/ground.ts` (`STACK_CUT`, ring row 1,210 to 1,580 m), `content/levels/ring-island.ts` (19 rim rocks) | its own heightfield, 3:1 cut walls; dodecahedron stones | `ROCK #7d7a78` by slope (`ring-island/view.ts`); stones `#c4beb0` | heightfield; boxes | final | the ring line; not captured (below) |
| Bell Rock and the greybox legs (leg 2 gorge, leg 3) | `content/levels/leg2.ts`, `leg3.ts`, `content/prefabs/bell-rock.ts`, `entities/route-greybox/` | grey trimesh prisms and boxes | greybox grey | trimesh | **greybox** | the legs' lines ([still](cliff-kit-everywhere/bell-rock-greybox.jpg)) |
| Sickle horizon (islands, chalk cliffs) | `src/entities/sickle-backdrop/view.ts` | flat tops, battered walls | `CLIFF #9c988f`, chalk `#c9c5bb` | none | final backdrop | the horizon |
| Far hills (four cones) | `land.ts` `buildFar` | cones | `#4a4d5c`, `#3b3e4c` | none | stand-ins, hidden once Ring Island's ground is up | the north-east horizon ([still](cliff-kit-everywhere/summit-overview.jpg)) |
| Small boulders, works rocks, town rock plots, caves | `blueprints/props.ts`, `sim/railway-*-layout.ts`, `layout.ts`, `pois/caves/` | props | various | various | final | near paths; boulders, not walls (out of scope; see question 4) |

**What the stills show** ([contact sheet](cliff-kit-everywhere/contact-sheet.jpg); stills one a wall, from where
players see it, all under [cliff-kit-everywhere/](cliff-kit-everywhere/)):

1. **Three rock looks, not one.** The kit's blocks are tan sandstone with deep bevels
   ([reference](cliff-kit-everywhere/canyon-kit-reference.jpg)). The heightfield's gorge walls are the same pigment
   (`rockLayers`) but drawn as 2 m vertical facets, a comb of teeth, right beside the kit on the rim path. The shore is
   a different recipe altogether: smooth, rounded, redder orange with broad soft bands, painted by the cove's material
   both on the sculpted cove face and on Home's own ground round the landing. That is the owner's "different ones near
   the shore".
2. **Far Head** is a smooth banded mesa from the sea: the right colour family, none of the kit's blocks.
3. **The gorge mouth from the sea** shows teeth on the wall faces and grassy slopes painted rock in patches.
4. **Needle Bell** reads pale grey-white, a landmark, not sandstone.
5. **Bell Rock and the greybox legs** are grey boxes, by design until their legs leave greybox
   ([blockout first](../agents/owner-calls.md#blockout-first)).

**Not seen:** Ring Island's stack cut. Its ground only stands once the ring is joined, and the seeded capture
(`--rail-seed ring-joined`) waited behind other worktrees' long runs in the shared queue and was stopped; the
pier-head still shows the far-hill cones that stand in for it. The plan treats Ring Island from its code and asks for a
still before its step.

**Draws and triangles today** at each census camera (`dev/look/evals/cliff-counts.ts`, colour and shadow passes
together; counts only):

| Camera (world cam → look) | Draws | Triangles |
| --- | --- | --- |
| Shore, from the landing (796, 10, 0 → 806, 3, 52) | 152 | 538,111 |
| Shore climb, from the sea (770, 8, -4 → 822, 8, 14) | 364 | 759,697 |
| Canyon climb, up from the bridge (962, 7, -80 → 942, 14, -114) | 196 | 568,125 |
| Gorge, from the rim path (868, 22, -120 → 940, 6, -100) | 362 | 685,057 |
| Gorge mouth, from the sea (975, 8, 232 → 965, 8, 150) | 413 | 752,542 |
| Far Head, from the sea (1500, 14, -80 → 1395, 10, -185) | 318 | 779,767 |
| Summit, over the island (870, 72, 65 → 1080, 0, -500) | 345 | 737,730 |

The canyon kit is in every one of these frames' scene at its full 26 instances and 6,688 triangles a pass (one batch a
piece for the whole island: an instanced mesh culls as one). One capture, on 24 November under load 18 to 15 shared
with another worktree's run: the counts are exact for those frames; nothing here is a timing.

## How the canyon generator generalizes

`dev/prefab/canyon-kit.ts` places pieces by hand-picked stations along two straight legs of one path. It becomes one
generator over the census, `dev/prefab/cliff-kit.ts`, writing one level a area (`content/built/levels/cliff-kit-<area>.json`)
so each area mounts, culls and ships on its own:

1. **Walls from the census.** `cliff-census.ts` exports its walls (vertices, toe and rim cells); the generator reads
   them, not a copy, so a terrain change is a stale artifact (`npm run prefabs -- --check`) as today.
2. **Runs, not stations.** Each area's seen toe is traced into polylines (toe cells in order, simplified to 1 m) and
   faces are laid end to end along them (10 m, 6 m, a gap), sunk 0.5 m, turned to face downhill, as the canyon's are.
   Rim runs take caps with gaps; toes at the sea take bank rock; boulders go at face feet where the verge is wide.
3. **Per-area rules**, one record each: which runs are dressed (seen toe within a stated distance of a tread or rail,
   or at the sea), face widths and spacing, boulder density, flush faces where something behind must stay in view (the
   alcove rule, [d-2026-11-24-canyon-faces-flush](../decisions-look.md#d-2026-11-24-canyon-faces-flush)), and the
   area's gated places.
4. **The tread and gate audit for every area.** `kitPieceProblems` moves to the generator and grows: every collider
   stays 0.4 m outside every tread (`pathAt`, which already includes the shore climb); 6 m from every gated place,
   built from `tech-layout.ts` `PADS`, `SECRETS`, `DEVICES` and `PILLARS` and the sites, not a hand list; outside every
   rail's loading gauge (the trial found 8 of 260 anchors within 6 m of a rail: walls 1, 3 and 10); and **no new way
   up**, as a rough geometric rule ([Step 0 as built](#step-0-as-built)), checked in
   `npm run level-check`. Generation fails on the first piece that breaks a piece rule, as the canyon's does.
5. **One mount wait.** Every area's view mounts its pieces through the shared lift-or-wait helper
   (`src/place/clearance.ts` `createLiftOrWait`, on main since #2365, bound in `src/prefab/instantiate.ts`): no area
   keeps its own clearance code. A piece that holds a player when its area mounts
   waits, undrawn and not solid, with its set until they are clear (build skill step 9).
6. **The canyon becomes one area** of the generator, its placements unchanged (a byte-for-byte check of
   `canyon-kit.json` against the generator's canyon output is the first step's proof).

**Batches.** Today the canyon's 26 pieces are seven instance batches, one a piece (+14 draws with the shadow pass). One
batch a piece for the whole island would keep draws flat but submit every instance's triangles from everywhere (an
instanced mesh culls as one). One batch a piece **a area** costs up to 14 draws for each area in view but nothing for
an area behind you. The plan takes batches a area, and merges small neighbouring areas (the gorge mouth's two sides;
the north ridge with the gorge north) into one.

## Kit pieces to add

Recipe additions to `assets/src/terrain-kit.py`, one previz round first (owner call
[previz](../agents/owner-calls.md#previz)) from the shore's stills, each in the asset viewer
([asset-viewer](../agents/owner-calls.md#asset-viewer)):

| Piece | For | Size, triangles (rough) |
| --- | --- | --- |
| Sea-cliff face, 6 and 10 m, with a wave-cut foot (a darker undercut band, no overhang solid) | the shore, the gorge mouth, the south sea cliff, Far Head | as the faces, 600 to 900 |
| Low face, 3 m tall | the shore climb's 4 to 16 m walls and short rims where a 14.4 m face would stand above the ground | 300 to 400 |
| Shore rocks, low and dark at the waterline, three sizes | the cove's foot, the landing's rocks, Far Head's foot (terrain-clean's proposed piece 4) | 100 to 300 |
| Corner piece (outside corner, 90 degrees) | rounded headlands (the cove's nose, Far Head) where straight faces leave gaps | 600 |

The cove face itself is replaced by kit faces (owner, 24 November): sea-cliff faces along its front, the corner round
its nose, low faces where it drops to the beach, and its three boulders become kit shore rocks at the new faces' foot.
The shore boulder
(`SHORE_HOP`, a 0.75 m rock a player can hop onto beside the shore climb) stays where it is with its collider; only its
colour moves to `rockLayers` (design review, finding 2).

## Colour work

One rock recipe for every wall: `rockLayers` (`ground-material.ts`), already shared by the heightfield and the kit.

- **The shore.** The sculpted cove face goes (it is replaced by kit faces, which wear the kit's own colour), so
  `applyCoveLayers` is left painting only Home's ground round the landing (`cove-ground.ts`): it takes `rockLayers`'
  `layered` and bed coordinate for its rock term (keeping its sand, turf, wet and relief terms). Matched stills from the
  landing and the sea before and after; the cove's tunables (`src/tunables/terrain.ts`) keep their names.
- **Needle Bell** (in this pass, owner, 24 November) takes the kit's sandstone: its five drums' `spireRock` colours go
  to `rockLayers`, and each drum is drawn in the kit's chunky courses (stepped bevels, a broken top) over its present
  shape. Its drums, their cylinder solids and its 105 m height stay exactly as they are: the tower's floating pads
  (`tech-layout.ts` `t0` to `t5`, the summit, the nook) and two secrets ring the rock, and their pulls are measured
  from it. The shore boulder (`SHORE_HOP`) moves to `rockLayers` in the same change, since it shares `spireRock`.
- **Ring Island** maps its slope rock (`ROCK #7d7a78`) to `rockLayers` at its step.
- **The Sickle horizon** (in this pass) takes the kit's palette: its `CLIFF #9c988f` walls take the `rockLayers`
  sandstone at the horizon's distance (through the same fog), its chalk `#c9c5bb` the kit's sun-bleached tops, and its
  battered walls a stepped, blocky silhouette in place of smooth batter. No pieces, no solids: it has no colliders and
  no one reaches it.
- **Props**: loose scenery boulders take the kit's boulders; works rocks and caves take its colour (step 8).

## Steps, area by area

Each step: generate, `npm run prefabs -- --check`, `npm run level-check` (the audit above, all areas), matched
before and after stills from the census cameras plus a walk clip on the area's path, the counts eval, a design-review
note in this plan, then ship on the owner's word. No step waits on a playtest.

0. **Generator and audit** (built: [Step 0 as built](#step-0-as-built)). `dev/prefab/cliff-kit.ts` over the census;
   the canyon as its first area, byte-for-byte; the grown audit (gated places from the layout, rails, the no-new-way-up
   flood); per-area batches; the shared lift-or-wait helper. No new pieces, nothing new in the world.
1. **The shore** (owner named it): previz and recipe for the sea-cliff face, low face, corner and shore rocks; the cove
   face **replaced with kit faces** (owner, 24 November); colour work on the landing's ground; dress the shore climb's
   walls (wall 9) and the landing's rocks. Run tracing ("runs, not stations", above) goes into `dev/prefab/cliff-kit.ts`
   as a shared helper here, not as a second area-local copy of the canyon's station helpers.
   - **What the replacement means.** Today the cove face is one sculpted trimesh (`src/place/cove.ts` `cliff()`, drawn
     and made solid by `cove-view.ts`) whose beachward end is walkable: at z 38 its broad top is the landing's walking
     surface at 1.7 m, and its nose runs under the sand; Home's own ground stands behind it (`coveGround`: no hidden
     heightfield in front of the face). The replacement takes the sculpted mesh and its trimesh away. The ground the
     player walks becomes the heightfield alone: `coveGround` is graded to carry the walk the face's end carried, the
     same 1.7 m surface at z 38 and the same run down to the beach, so the walk is ground and never a kit top (the
     [14 November](../decisions-look.md#d-2026-11-14-terrain-simple-geometry-cleanup-first) rule). The kit faces stand
     behind and north of that walk as scenery with box solids, sunk into the backing soil; the corner piece turns the
     nose; shore rocks sit at their foot in the water. Nothing of the kit stands on the walk.
   - **The collider, re-tuned.** The cove's trimesh goes; the faces' boxes are the new solids, checked by the area's
     audit (0.4 m off every tread, the shore climb's included; 6 m from the landing, the shore hop, the dock and its
     sign, which go in the area's own `keepClear`; the no-new-way-up gate, so no face top or low face is a
     step up from the beach or the climb). The landing's spawn and a returning player's saved spot are placed on ground
     by `src/place/pose.ts`, as now; the kit mounts through the lift-or-wait helper.
   - **Nobody stranded.** The area's audit adds a **reverse** flood (`dev/level/flood.ts`, `{ reverse: true }`): every
     cell that can get back *to* the treads, with the kit's solids in and without. A forward search cannot see a
     walled-off swimmer, since water cells are its starts; the reverse one can. Every standable cell and every water
     cell that gets back to a tread bare must still get back with the kit in, beyond the pieces' own footprints; the
     shore reports none lost on its beach, its water and its climb (design review, revised, finding 1).
   - **The face's walkable end, walked.** The face's end at z 34 to 38 (its broad 1.7 m top, off the bot's route) is
     walked with the real controller on the graded ground that replaces it, both ways between the beach and the
     landing, not only probed with downward rays in `auditCove`: a scripted walk in the browser (`npm run look` with
     an action) that must arrive, with no snag or fall.
   - **The idle stop moves with it.** `holdCoveStop` (`src/place/cove-stop.ts`, installed today only by
     `src/place/cove-view.ts` as its `fixedPre`) holds an idle player still on static ground at the cove. When
     `cove-view.ts` goes, the hold moves to what still stands there (the cove's ground or the kit's view), and an
     idle-stance check (stand still for some seconds on the landing, on the graded end and on the shore climb; no
     creep) proves it.
   - **How it is proven.** `npm run level-check -- --cove` (the cove's mesh and heightfield facade in Rapier, within
     0.03 m of `H`) is rewritten for the new facade: the heightfield where the face was, with the kit's boxes in the
     scene, every walk sample on the graded ground. `npm run level-check` runs the shore area's audit. The production
     bot's arrival (`dev/look/bots/railway.ts`) walks from the landing to the village with real input and must arrive;
     its walk time is read from its log on the quiet Mac against main's (the [25 to 35 s](../research/shore-arrival.md)
     band; timing under load is not evidence). Stills from the landing at player height, the climb from the landing
     (design review, finding 1) and the sea, matched before and after, and a walk clip on the landing's path. The shore
     hop keeps its collider and place (design review, finding 2).
2. **The gorge from the rim path** (wall 6 and the rest of wall 0 seen from the camp path): the teeth beside the kit
   in the [gorge still](cliff-kit-everywhere/gorge-rim-lookout.jpg).
3. **The gorge's long walls** (walls 2 and 3) seen from the lines and the village; faces where the toe is within 40 m of
   a tread or rail, caps on the rims seen from the village; the rail gauge rule matters here, and so do the gated
   places the step 0 trial found on both walls ([Step 0 as built](#step-0-as-built)).
4. **The gorge mouth and the south sea cliff** (walls 4, 7, 8): sea-cliff faces and shore rocks, seen from the sea.
5. **The north ridge and the east rail cutting** (walls 5, 10).
6. **Far Head** (wall 1): sea-cliff faces and corners round the head, seen from its line and the sea; its halt's gated
   places.
7. **Needle Bell** (owner, 24 November): the kit's colour and chunky courses on its five drums, shape and solids
   unchanged (Colour work), with the kit's sun-bleached tops paler course by course up the drums so the needle still
   reads against the sandstone gorge (design review, revised, finding 3); the shore boulder's colour with it. Stills from the village, the gorge and the tower's
   first pad; the tower's pulls and secrets re-checked (`npm run level-check`'s place progression) to show nothing
   moved. After the gorge steps, so the bell is judged against finished walls round it.
8. **Props** (owner, 24 November): loose scenery boulders (`blueprints/props.ts`) become the kit's boulders, matched to
   size and keeping their solids' footprint (a boulder that is a step or a hop keeps its height); works rocks
   (`sim/railway-*-layout.ts`, the rocks players break for stone) keep their shape, solid and place and take the kit's
   colour and chunky material only, since they are play objects, keeping what tells them apart from scenery (their
   shape and marks; a still beside a kit boulder, design review, revised, finding 5); the caves (`pois/caves/`) take `rockLayers` at their
   mouths, with kit faces round a mouth only where it is within 40 m of a tread. Props at a dressed wall's foot are
   swapped in that wall's step; this step takes the rest. The production grounding and machine clearance audits in
   `npm run level-check` stay at 0 problems, and the bot's route breaks its rocks as before.
9. **The Sickle horizon** (owner, 24 November): its palette and stepped silhouette (Colour work), last on Home so it is
   matched to the finished island; stills from the summit, the sea and Far Head's halt.
10. **Ring Island**: colour first, then its stack cut's walls (3:1, along the ring line) and rim rocks as kit pieces,
    after a seeded still from the ring line.
11. **The greybox legs** (Bell Rock, leg 2's gorge, leg 3): when each leaves greybox, its rock is authored as kit pieces
    from the start, not as prisms to dress later.

## Budget

Kit density on the canyon: 26 pieces, 6,688 triangles a pass, along about 58 m of seen toe, so about 115 triangles and
0.45 pieces a metre of dressed toe. Dressing every metre of seen toe on Home (about 1,700 m) would add about 200,000 triangles a pass;
the plan dresses less: only toe within 40 m of a tread or rail, or at the sea (owner, 24 November), about 1,510 m on the
census's own count (the table's "dressed" toe, `node dev/ground/cliff-census.ts`), the rest by colour and rim caps. Budget a area, colour
and shadow passes together, at its census camera:

| Area (step) | Dressed toe, about | Pieces, about | Triangles added (both passes) | Draws added |
| --- | --- | --- | --- | --- |
| Shore (1) | 90 m | 40 | 21,000 | 14 to 20 (new pieces) |
| Gorge from the rim path (2) | 120 m | 55 | 28,000 | 0 to 14 (shares the canyon's area if merged) |
| Gorge's long walls (3) | 250 m | 110 | 58,000 | 14 |
| Gorge mouth and south sea cliff (4) | 180 m | 80 | 41,000 | 14 |
| North ridge and east cutting (5) | 110 m | 50 | 25,000 | 14 |
| Far Head (6) | 300 m | 135 | 69,000 | 14 to 20 |
| Needle Bell (7) | none (its five drums) | 0 | up to +6,000 (chunky courses on five drums) | 0 (the same meshes) |
| Props (8) | none | swaps, not adds | at most +20,000 from the summit (kit boulders in place of today's boulder meshes) | at most +6 an area (three boulder batches, both passes), less where per-prop meshes go |
| Sickle horizon (9) | none | 0 | up to +5,000 (a stepped silhouette) | 0 |

**Ceiling** (a guide, not a gate: [performance guides, not gates](../agents/owner-calls.md#performance-guides-not-gates);
the target is [a stable 60 fps](../agents/owner-calls.md#frame-time-60)): at any census camera, at most +30 draws and
+70,000 triangles over today; from the summit, which sees most areas, at most +60 draws and +150,000. **Frame time:**
on the quiet Mac (M1 Max), the median frame at each census camera stays under 16.7 ms and the worst frames do not
regress by more than 1 ms against main. **How it is measured:** the census cameras are added to `dev/look/lib.ts`
`VIEWS`; `npm run perf -- --hardware --view <area> --seconds 10 --verdict <file>` runs on main and on the step's
branch, three times each, alternating, on the Mac with no other look, bot or build running (the verdict stamps the
load at start and end; a run with load over 2 is discarded and rerun). Counts from the counts eval explain a result,
they are not the result. Over the ceiling, the step mitigates before shipping (fewer boulders, caps off the far rims,
the shadow pass off for pieces past 150 m, or merged batches), or the owner is told the cost and decides.

[Steps 0–3 frame-cost measurements on HOTBOX](../reports/cliff-kit-perf.md).

## Level findings

`npm run level-check` on main, 24 November (23 reports, 46.5 s): **canyon kit: 26 pieces, 0 problems**; production
grounding 5,244 placements, 0 problems; machine clearance 0 problems; the failures it prints are planned and later
track (Ring Island's v27 loop, bay and cave centres), unrelated to rock.

`cliff-census.ts --anchors` (trial 6 m faces every 8 m along each seen toe, the kit's rules plus 6 m from rails):

| Wall | Tried | Clean | Problems |
| --- | --- | --- | --- |
| 0 Gorge north and the canyon climb | 58 | 57 | 1 within 0.4 m of a tread |
| 1 Far Head | 52 | 49 | 3 within 6 m of a rail |
| 2 Gorge east wall | 38 | 38 | none |
| 3 Gorge west wall | 30 | 27 | 3 within 6 m of a rail |
| 4 Gorge mouth, east | 8 | 8 | none |
| 5 North ridge | 9 | 9 | none |
| 6 Gorge, rim lookout side | 9 | 9 | none |
| 7 South sea cliff | 8 | 8 | none |
| 8 Gorge mouth, west | 4 | 4 | none |
| 9 Shore climb | 5 | 5 | none |
| 10 East rail cutting | 3 | 1 | 2 within 6 m of a rail |

What this does not prove: the gated places tested are the canyon's own four (the alcove, its stand point, the bell, the
first device pad), so no other area's gates were checked; the rail test is centre-line distance, not the loading
gauge; no trial checks a new way up. Those three are step 0's audit, and every area's step runs it.

## Risks

- **Triangles from the summit.** Areas batched separately still all stand in the summit's view. Mitigation: the
  ceiling above, shadows off past 150 m, rim caps only on far rims.
- **The shore's material swap changes the first thing a new player sees.** Matched stills from the landing and the sea
  before and after; the owner judges the shore before step 2.
- **A piece blocking a sightline** (the alcove case). Flush faces wherever the per-area record names something behind.
- **Rails beside rock** (walls 1, 3, 10). The gauge rule in the audit; trains must not clip a face.
- **The shore's walk after the cove face goes.** The landing's first steps stood on the face's walkable end; they now
  stand on graded ground. Mitigation: the walk's surface is carried by `coveGround` at the same height, the cove's
  Rapier audit is rewritten for it, and the bot's arrival walk and the player-height stills prove it before ship.
- **Needle Bell's pulls.** Its pads and secrets are measured from the rock; the step changes colour and drawn courses
  only, never its solids, and re-runs the tower's checks.
- **Works rocks are play objects.** Their shape, solid and break count stay; only their look changes.

## Open questions (answered by the owner, 24 November 2026)

[d-2026-11-24-cliff-kit-scope](../decisions-look.md#d-2026-11-24-cliff-kit-scope):

1. **The shore's cove face:** "Replace with kit faces" (the recommendation was to keep it sculpted): fully chunky like
   the canyon; the landing's walk and collider are re-tuned and re-tested in the shore step (step 1).
2. **The Sickle horizon:** in this pass (step 9).
3. **Needle Bell:** in this pass (step 7).
4. **Small boulders, works rocks and caves:** in this pass (step 8).
5. **How far from a path a wall is dressed with faces:** "Yes, near walls only": within 40 m of a tread or rail, or at
   the sea; farther walls take the kit's colour and rim caps.

The plan's remaining defaults stay open in [agent-calls](../agent-calls.md) and the steps proceed on their
recommendations.

## Step 0 as built

On `claude/cliff-kit-step0` (24 November 2026): dev tooling and the kit's view only, nothing new in the world.

- **One generator.** `dev/prefab/cliff-kit.ts` holds the area records (`Area`: an id, its level, a point on each census
  wall it dresses, its own gated places, and how it dresses) and writes one level an area through `npm run prefabs`
  (`cliff-kit-<id>.json`; the canyon keeps its first name, `canyon-kit`, which is inside its bytes). The canyon is the
  first area (`dev/prefab/cliff-kit-canyon.ts`, its stations moved unchanged from `dev/prefab/canyon-kit.ts`, which is
  gone): `content/built/levels/canyon-kit.json` is byte-identical (sha256 `577d1349…9080` before and after;
  `npm run prefabs -- --check` fresh).
- **The census as a library.** `dev/ground/cliff-walls.ts` (`censusWalls`) is the census's computation; the table
  (`dev/ground/cliff-census.ts`) and the audit read it. Each wall's toe cells carry their distance to the nearest tread
  or rail, so the 40 m rule is one function (`dressed`); the table gains a "dressed" toe column.
- **The piece rules, grown** (`kitPieceProblems`, run on every placement at generation, which fails on the first
  broken one, and again on the built levels in level-check): every solid 0.4 m off every tread; 6 m from every gated
  place built from the layout (every pad, by its own size; every secret and where it is fetched from; every device;
  every pillar, by its radius; every site and its reach points), plus an area's own; outside every drawn track's
  loading gauge (live, drawn and Ring Island's planned tracks from `dev/level/rail-network.ts`): over the rail's top, a
  car's body from its 0.4 m floor up to 4.5 m (half its 2.2 m width) and its running gear under the floor (half the
  1 m track gauge), each with the 0.25 m static clearance level-check already holds furniture to beside trains.
- **No new way up, as a rough rule** (`dev/level/cliff-kit-standing.ts`, the gate in `npm run level-check`; the
  orchestrator's call under the owner's [review-scope](../agents/owner-calls.md#review-scope): checks are rough
  approximations that work). Every point of a piece's face a player could stand on (outward normal at least the
  controller's walkable limit, `WALKABLE_NY`) is fine if any of:
  - **flush**: within one step (0.3 m, the clearance helper's `STEP`) of a footing within the player's radius
    (walkable bare ground, the sea's surface over drowned ground, or a train's highest top, 3.3 m over the rail,
    anywhere along a drawn track), so a top a step over the ground beside it or a cap a step under its lip;
  - **out of reach**: more than two jumps' rise (`TWO_JUMPS`, 3.03 m, now exported from `dev/level/mover.ts` for the
    abilities check and this gate) above every lower footing and every lower reachable top of another piece within
    8 m across the ground (a top is reachable when it is two jumps or less over a lower footing within 8 m, or a drop
    from a train's roof within 8 m to two jumps under the rail). Ground above a top only drops a player onto it;
  - **a low perch** (judged for the piece): its highest such point at most one jump's rise (`MOVER.jumpHeight`,
    1.604 m) over the highest footing within 1 m of its tops.

  Otherwise the piece offers a new way up and the area fails. Full rotation and scale; a face point under the bare
  ground is buried. It runs in level-check only, not at generation. Known limits, by design: a staircase reached only
  by a glide off a train's roof, and one whose first step is a glide or jump out of a roof beyond 8 m, pass (mid-air
  chains are not followed).
- **Per-area batches.** `src/entities/terrain-kit/view.ts` mounts every area in `src/entities/terrain-kit/areas.ts`
  (`KIT_AREAS`) as its own instance batches, all through the one `liftOrWait` call (`src/prefab/instantiate.ts`); the
  audit fails an area the list does not mount.

**Results.** The canyon as built passes: 26 pieces, 0 problems (its faces out of reach, its boulders, bank rocks
and rim caps low perches). The gate refuses, as sets (`test/level-flood.test.ts`, under the owner's exception for
level-check's flood): a staircase up from the climb rising 2.2 m a step, a ramp rising 8 m off the village green, steps
off a train roof beside line 2, fifteen stepping stones out over the sea from a cab's roof, and a top 2 m over the
climb's path; it lets a sunk boulder, a flush cap and a lone low perch stand. With the gate switched off, the refusing
tests fail. The second review's cab-glide staircase and roof-outside-the-window staircase pass: the known limits above.

A stricter first version (no standable top more than a step off a bare footing) failed 25 of the canyon's 26 pieces:
too strict for scenery a player is meant to hop onto. The movement-model check (`dev/level/cliff-kit-reach.ts`) before
it is removed: two reviews found holes in every version (glide reach, roofs outside its window, air jumps refreshed on
stepping stones, a lower start elsewhere hiding an ascent).

**Close call in the canyon as built** (passing, for the owner and reviewers): rim cap `canyon.16`'s solid comes 1.360 m
from line 1's up (offset homeward) track's centre, 0.17 to 0.9 m over its rail top: 0.26 m from a car's side. It passes
the 0.25 m static clearance by 1 cm, and would fail Ring Island bracket's own gauge
(`src/entities/ring-island/bracket.ts` `GAUGE`, 0.3 m) by 4 cm. No car body is there below 0.4 m, and none clips.

**The trial anchors, re-run** with the grown rules (`node dev/ground/cliff-census.ts --anchors`; 6 m faces every 8 m
along each seen toe; "rail" is still the trial's 6 m from a centre line, "rail gauge" the new rule):

| Wall | Tried | Clean | Problems |
| --- | --- | --- | --- |
| 0 Gorge north and the canyon climb | 58 | 56 | 1 tread, 1 gated place |
| 1 Far Head | 52 | 47 | 4 gated places, 3 within 6 m of a rail, 1 in a rail's gauge |
| 2 Gorge east wall | 38 | 33 | 5 gated places |
| 3 Gorge west wall | 30 | 18 | 10 gated places, 3 within 6 m of a rail, 1 in a rail's gauge |
| 4 to 9 | 43 | 43 | none |
| 10 East rail cutting | 3 | 1 | 2 within 6 m of a rail |

The canyon's old hand list named four gated places; the layout's full list finds more, and every area's audit now
holds to it: on wall 1 the sea stack's pad, its approach and the stack-return pad; on wall 2 the tower's top pads (`t4`,
`t5`, the summit); on wall 3 the jump course (`p1`, `j1`, `p2` and their pillars) and the tower's `t1` and `t2`. The 6 m
is measured across the ground, so a face at a toe counts against a pad floating 50 to 90 m over it (Needle Bell's
tower). Steps 3 and 6 plan round them; step 3 settles whether a floating pad's keep-clear is its column or its
approach (design review, revised, finding 4).

## Step 1 as built

On `claude/cliff-kit-shore` (24 November 2026; revised 25 November to the owner's
[non-standable kit everywhere](../decisions-look.md#d-2026-11-25-non-standable-kit-everywhere), after the first sheet
showed faces as patches on smooth slopes). Matched stills:
[before and after sheet](cliff-kit-everywhere/shore-before-after.jpg) (the census's two cameras, the landing at eye
level and one from the sea), single stills under [cliff-kit-everywhere/shore/](cliff-kit-everywhere/shore/). Shape and
colour only. Not tested on a device.

- **The cove face is ground and kit.** The sculpted face, its three boulders, its trimesh and its view
  (`src/place/cove-view.ts`) are gone. Its bluff is the heightfield's (`src/place/cove.ts` `coveBluff`, through
  `coveGround`): the sculpted face's profile, its front blended from steep to the broad end along its across axis as
  the face's was, its top `coveCrest`. The walkable end from the sand at z 34 to 36 up to 1.7 m at z 38 and 4.5 m by
  z 48 is ground; against the old face's top it is within 0.5 m along the walk, its west lip 0.6 m broader (a
  scripted walk slid off the first version), its back corner over the pocket about a metre narrower where the
  landing's protection holds the ground (z 38 to 42). `H`, the water bed and the ground verifier read the heightfield
  alone; the coast bake's pins are re-pinned (`test/coast-regions.test.ts`).
- **No face is a place to stand** (25 November). Every face's solid (the canyon's 6 and 10 m faces too, their
  placements unchanged) is a closed prism (`src/content/prefabs/terrain.ts` `crowned`): the slab leaning back with
  the courses, its top a crown of two roof planes 62 degrees from level meeting in a ridge at the face's top, steeper
  than the controller's limit (`WALKABLE_NY` 0.55, 56.6 degrees). The steepest triangle's normal is 0.47 up, so the
  gate finds no top on any face. The drawn top stays level. The gate and the audits read every solid as a convex hull
  of triangles (`dev/prefab/cliff-kit-solids.ts` `solidHulls`). Known limit, not modelled: a sphere exactly over a
  ridge's apex touches it with an upward normal for an instant; nothing reaches a ridge from a lower footing by walking.
- **New pieces** (`assets/src/terrain-kit.py`; the canyon's seven drawn pieces byte-identical): sea-cliff faces 6 and
  10 m wide, two courses over a darker 1.2 m wave-cut foot set back 0.45 m (about 6 m, 396 and 616 triangles); a low
  face 5 m wide and about 3 m tall (176); an outside corner of sea-cliff courses (440); shore rocks 1.2, 2 and 3.2 m
  across (about 130 each). In the asset viewer as the Cliff kit. The low face is unused at the shore.
- **The shore area** (`dev/prefab/cliff-kit-shore.ts`, 45 pieces, `content/built/levels/cliff-kit-shore.json`):
  three sea-cliff faces along the bluff's front from z 49, their ridges at its top walk; the corner where it tucks
  under the beach at z 71; five shore rocks in the water; and tiers of sea-cliff faces along the contours of the
  shore's rock slopes, every 3 m of height (`dressSlope`, by rays across each slope; faces set 1.5 m into the slope
  and 0.5 m under the contour): census wall 9 from the landing hill to the climb, its part beside the climb, the
  pocket's east wall behind the board, the hill behind the bluff and the slope beyond it. Kept off: the bluff's
  walkable end and its flank, the landing's pad, every tread by 0.4 m (`treadClearance`), the gated places (the
  landing, the timber stage's end, the board, the shore hop; 6 m each). The shore hop keeps its place, solid and
  colour (step 7 moves its colour with Needle Bell's).
- **Colour.** The landing's ground takes the cliffs' rock (`ground-material.ts` `beddedRock`, shared with Home's
  ground); its sand, turf, wet and relief terms are its own; the cove's tunables keep their names (the band controls
  are unused now).
- **The idle hold** (`holdCoveStop`) is spawned by the land's ground with its view (`src/place/land.ts`).
- **Proofs.** `npm run level-check -- --cove` (the heightfield facade and the kit's solids as trimeshes in Rapier;
  14,625 rays, those off the kit within 0.03 m of `H`; 66 walk samples on the end and the bluff top all on walkable
  heightfield, none on a kit solid): 0 findings. `npm run level-check`: shore 45 pieces and canyon 26, 0 problems
  each (the piece rules, the gate, and the reverse flood: 48,841 nodes, none walled off; at a 0.5 m set-in the flood
  found two small pockets behind the lowest tiers, so faces stand 1.5 m in; a ring of faces round the end, tried by
  hand, loses 500). `dev/look/evals/shore-walk.ts` (held W, real controller): up the end and back, and from the
  landing up the shore climb past the dressed wall and back, all arrive; the climb's way down drops at 8.2 m/s at
  one point, as main's does (8.6). Idle 5 s: creep 0 m on the landing, the graded end and the climb, 0.04 m on the
  bluff's top (a landing settle that stops). Walk clip from the landing up the climb: `.look/shore-clip-realtime.webm`
  (local, first version).
- **Counts** at the census cameras (`dev/look/evals/cliff-counts.ts`, both passes, against main): from the landing
  147 to 153 draws (+6), 537,559 to 579,243 triangles (+41,684); the climb from the sea 360 to 367 draws (+7), 756,177
  to 798,125 (+41,948). The kit's instances 26 to 71, 6,688 to 29,824 triangles a pass. Over the shore's 21,000 line in
  the budget, within the 70,000 ceiling (budgets guide, they don't cut). Not timed (shared machine); the bot's arrival
  walk on the quiet Mac is still owed.

**Design review, step 1** (same context; calls beyond the plan's): every face's solid crowned, the canyon's included
(the owner's 25 November call reads "kit faces"); tiers every 3 m of height on every rock slope of the shore, set 1.5 m
in (the flood's pockets); the bluff's end 0.6 m broader at its lip; the low face unused at the shore; wall 9's rim caps
dropped (the top tier stands at the rim); the shore hop's colour left for step 7. No copy changed.

## Step 2 as built

The [three matched views](cliff-kit-everywhere/gorge-rim-before-after.jpg) show the census lookout, the descent at eye
height and the lookout bank from across the water. [Individual stills](cliff-kit-everywhere/gorge-rim/) are 1200 px wide.

The gorge adds 95 faces in its own area. Short faces fill the intermediate 3 m contours along the descending lookout
bank (wall 6). Across the water, two-course faces follow 6 m contours below and above the camp path (wall 0).
Six tall canyon faces cover the sheer cut north of the bend. The lower bank stops at the tread, and the upper courses
join the six original canyon faces. The generator uses the shore's run spacing.

The first pass drew a large pale slab across the water in the third view. A ray through that part of the image hit
the nearly level top of a two-course face 0.3 m from the camera. The tall slabs span that seam and lean into the bank.

The canyon and shore levels are byte-identical to main. Prefabs checked fresh. Level-check found zero problems in
all three kit areas. The reverse flood lost zero of the gorge square's 72,361 nodes, including when the existing
canyon solids were included. The mount uses the kit's shared clearance helper. No new meshes or copy.

With the shore eval's held-W controller, the walk arrived both ways from the lookout bend, across the bridge,
to the upper bend of the camp climb. Five seconds idle at the lookout gave 0 m horizontal creep. On the way back
both builds crossed the eval's 7 m/s fall marker (7.26 m/s on main and 7.24 m/s here).

At the census camera the first pass added 149,688 triangles. Using the tall slabs on the sheer cut and short infill
on the lookout bank cuts that increase to 83,248 across both passes. Main counted 356 draws and 683,389 triangles,
and the revised gorge counted 364 draws and 766,637 triangles. This is 13,248 triangles above the camera guide.
Frame time on a device is unverified.

## Step 3 as built

The long east and west gorge walls (census 2 and 3) carry 108 crowned faces and three rim caps facing the village.
The generator traces each bank at two heights. Long runs use 10 m pieces, and the lower banks need only one tier.
On the first pass the east wall looked smooth above the river because its crest flattens behind the cut.
Tracing the upper tier 3.5 m below its top exposes the courses up to the rim.

From Line 2, both banks lead the eye down to the quarry footbridge. From the village, the east wall reads behind
the hook pillar. At river height the courses meet the sandy toe and Needle Bell’s floating pads remain visible.
Opened all three after stills and found no detached cliff faces or stray flat slabs.
[Matched views](cliff-kit-everywhere/gorge-walls-before-after.jpg) · [Individual stills](cliff-kit-everywhere/gorge-walls/)

High floating pads and the summit reserve their column once they stand more than 14.4 m above ground. Their
pulls reserve body clearance from the previous landing to the ring at its actual height. Ground gates keep 6 m.
The closest tread sample is 1.65 m outside the edge. The rail gauge is clear. All four kit areas passed
level-check, and the 543,169-node reverse flood lost zero nodes with all four kits together.
The canyon, shore and gorge-rim levels are byte-identical to main.

The controller walked from the quarry path’s west bank down to the bridge, across it, and back. Its fastest
descent was 2.22 m/s. Releasing W took 0.18 m to stop. After settling for three seconds, five seconds idle
gave zero horizontal drift.

| Census camera | Draws, main → long walls | Triangles, main → long walls |
| --- | ---: | ---: |
| Shore | 153 → 158 | 579,243 → 758,059 |
| Shore climb | 369 → 375 | 827,253 → 1,006,465 |
| Canyon climb | 202 → 206 | 640,891 → 818,475 |
| Gorge rim | 364 → 369 | 766,637 → 944,617 |
| Gorge mouth | 419 → 426 | 809,096 → 989,540 |
| Far Head | 289 → 291 | 745,129 → 833,921 |
| Summit | 341 → 346 | 817,862 → 995,842 |

The new area adds 90,420 kit triangles per pass. The gorge-mouth camera adds 180,444 triangles across both
passes, above the step’s 58,000 guide, and seven draws. Device frame time is unverified.

## Step 4 as built

The gorge mouth and south sea cliff (walls 4, 7 and 8) carry 41 crowned sea faces and three shore rocks.
Both banks follow the shore kit's height contours. A second tier on the south coast closed a pocket behind
the lower course, so that coast keeps one course. With all five areas mounted, the reverse flood lost zero
of the 121,801 cells checked around the mouth. The closest tread sample clears the edge by 1.01 m.
The rail gauge is clear. The canyon, shore, gorge rim and long gorge wall levels match main byte for byte.

## Design review (2026-11-24)

Run by the plan's author in the same context (design-review skill). Read for it: DESIGN.md, owner calls (Look and art,
Level and world building, Performance and devices), the look topic's Current rules and the four entries the brief
names, terrain-clean Part 3 and its design review, direction's phase, and the research index's terrain entries
([shore-arrival](../research/shore-arrival.md): cove to village in 25 to 35 s;
[stylized-terrain](../research/stylized-terrain.md): smooth heightfield plus a small authored cliff kit;
[terrain-art](../research/terrain-art.md): coastal structure before surface detail, two-direction previz). The plan
agrees with all three. Looked at: the ten stills above, from the landing, the sea, the rim path, the climb and the
summit; not seen: Ring Island's stack cut (its seeded capture was stopped, above).

### Calls

| Call | Kind | Source or recommendation |
| --- | --- | --- |
| Every cliff and rock wall, the shore's included, takes the kit's treatment | Decided | [d-2026-11-24-chunky-every-cliff](../decisions-look.md#d-2026-11-24-chunky-every-cliff) |
| Census first, then area by area with matched stills | Decided | same entry, orchestrator's reading |
| The shore first | Decided | the owner named the shore in the same entry; the brief orders it first |
| Pieces are scenery with colliders; walkable ground stays simple; never a new way up | Decided | [d-2026-11-14-terrain-simple-geometry-cleanup-first](../decisions-look.md#d-2026-11-14-terrain-simple-geometry-cleanup-first), [d-2026-11-24-chunky-every-cliff](../decisions-look.md#d-2026-11-24-chunky-every-cliff) |
| Chunky Sunshine style for every new piece | Decided | [d-2026-11-24-canyon-kit-chunky-sunshine](../decisions-look.md#d-2026-11-24-canyon-kit-chunky-sunshine) |
| Faces sit flush wherever something behind them must stay in view | Default | generalizes [d-2026-11-24-canyon-faces-flush](../decisions-look.md#d-2026-11-24-canyon-faces-flush), which ruled one place |
| The greybox legs get kit rock only when they leave greybox | Decided | [blockout first](../agents/owner-calls.md#blockout-first) |
| One rock recipe: the shore's cove material takes `rockLayers` for its rock | Default | the decision asks for one palette; the method is ours, cheap to tune, judged by matched stills |
| The cove face stays sculpted, recoloured, its foot dressed (question 1) | Default | keeps its walkable south end and tuned collider |
| Needle Bell left as it is (question 3) | New | recommend leave: a landmark set apart on purpose; asked because "every rock wall" could include it |
| The Sickle horizon left as it is (question 2) | Default | distant backdrop with no colliders |
| Faces only within 40 m of a tread or rail or at the sea; farther walls take colour and rim caps (question 5) | New | narrows "every cliff" for far walls; recommend it, since from 40 m on the teeth read as texture and the summit view stays in budget |
| Tread 0.4 m clear, gated places 6 m, rails' gauge, no-new-way-up flood, in every area | Default | carries terrain-clean's finding 6 rules to every area and adds the rails and the flood |
| New pieces: sea-cliff faces, low face, shore rocks, corner | Default | terrain-clean's proposed piece 4 plus what the shore and Far Head need; previz first |
| Ring Island after Home; colour first, stack cut later | Default | terrain-clean question 5 held it while blockout; it is now final, so it gets its own step |
| Budget ceilings and the quiet-Mac frame-time method | Default | [performance guides, not gates](../agents/owner-calls.md#performance-guides-not-gates), [frame-time-60](../agents/owner-calls.md#frame-time-60), [geometry follows prominence](../agents/owner-calls.md#geometry) |
| Props (boulders, works rocks, caves) out of scope (question 4) | Default | they are props, not walls |

Seventeen calls: 6 Decided, 9 Default, 2 New.

### Findings

1. **First sight is the shore** (flow rule 1, [gameplay shapes the environment](../agents/owner-calls.md#gameplay-shapes)).
   The shore climb is the first path a new player takes. Dressing its walls with faces says "not this way" on both
   sides, which is right, but the low face beside the climb must not read as a step: its top is either above a
   jump's reach from the tread or sloped. Step 1 now says the no-new-way-up flood runs with the low faces in, and its
   stills include the climb from the landing at player height.
2. **The shore hop is a play object.** `SHORE_HOP` is a 0.75 m rock a player can hop onto beside the climb, with a
   graded pad under it (`terrain.ts`). The draft swapped it for a kit boulder; that could change its height and reach.
   Changed: it keeps its collider and place, and only its colour moves to `rockLayers` (Kit pieces to add).
3. **"Every cliff" versus the budget.** Dressing every seen metre would add about 200,000 triangles a pass from the
   summit. The plan's 40 m rule is a real narrowing of the owner's words for far walls, so it is a New call with
   question 5, not a silent default.
4. **Sightlines kept** (flow rule 2). The flush rule generalizes the alcove case; each area's record names what must
   stay in view (the canyon's alcove, Far Head's halt, the dock's sign at the shore).
5. **Co-op and solo.** Nothing changes for either: no piece is used, held or shared. The lift-or-wait helper covers a
   friend who is standing where an area mounts (build skill step 9); a late joiner sees the same static pieces.
6. **Reach proof.** The trial anchors prove only the tread and the canyon's four gates; reach (the flood) and the other
   areas' gates are unproven until step 0. Recorded under Level findings.

### Suspect lines

None: the plan changes no copy.

### Owner questions

The five under [Open questions](#open-questions-recommended-answer-first), each with its recommended answer first.

## Design review, revised (2026-11-24)

Run by the reviser in the same context (design-review skill), on the parts the owner's answers changed and on step 0:
the shore step, steps 7 to 9 and their budget lines, the colour work, and the audit's rules as built. Read for it:
DESIGN.md, the two decision entries ([chunky-every-cliff](../decisions-look.md#d-2026-11-24-chunky-every-cliff),
[cliff-kit-scope](../decisions-look.md#d-2026-11-24-cliff-kit-scope)), the plan from the top, `src/place/cove.ts`
(the face's walkable end), `src/place/tech-layout.ts` (the pads and secrets round Needle Bell) and
[shore-arrival](../research/shore-arrival.md) (cove to village in 25 to 35 s). Looked at: the census stills of the
shore's cove face, Needle Bell from the village side and the summit; no new stills, since step 0 changes nothing a
player sees. Not seen: the works rocks and caves up close.

### Calls

| Call | Kind | Source or recommendation |
| --- | --- | --- |
| The cove face is replaced with kit faces | Decided | [cliff-kit-scope](../decisions-look.md#d-2026-11-24-cliff-kit-scope) (1) |
| Faces only within 40 m of a tread or rail or at the sea; farther walls take colour and rim caps | Decided | same entry (2) |
| The Sickle horizon, Needle Bell and props are in this pass | Decided | same entry (3) |
| The landing's walk becomes graded ground carrying the face end's 1.7 m surface; nothing of the kit stands on it | Default | the [14 November](../decisions-look.md#d-2026-11-14-terrain-simple-geometry-cleanup-first) walkable-ground rule; keeps the landing's footing |
| The shore area's own gated places: the landing, the shore hop, the dock and its sign | Default | what a new player meets first on the beach |
| The shore's proof: the cove's Rapier audit rewritten, the bot's arrival walk timed on the quiet Mac against main, stills at player height | Default | the owner's "re-tuned and re-tested" |
| Needle Bell: the kit's colour and chunky courses on its five drums; shape, solids and height unchanged | Default | the tower's pads and secrets are measured from it |
| Needle Bell after the gorge steps (step 7), the props sweep (8), the Sickle horizon last on Home (9) | Default | each judged against finished surroundings; keeps the plan's order otherwise |
| Loose boulders become kit boulders matched to size; works rocks keep shape, solid and break count, colour and material only; caves take colour, faces at a mouth only within 40 m of a tread | Default | props that are play objects keep how they play |
| The Sickle horizon: the kit's palette and a stepped silhouette, no solids | Default | a backdrop no one reaches |
| Budget lines for steps 7 to 9 (Needle Bell up to +6,000 triangles, props at most +20,000 from the summit and +6 draws an area, the horizon up to +5,000) | Default | within the plan's ceilings |
| The rails' gauge: a car's body (2.2 m wide, from 0.4 m up to 4.5 m) and running gear, with 0.25 m static clearance | Default | level-check's own furniture clearance; the canyon's `canyon.16` passes by 1 cm |
| No new way up as a rough rule: every standable top flush (a step), out of reach (two jumps over reachable lower ground or tops within 8 m), or a low perch (one jump over ground within 1 m) | Default | the orchestrator's call under the owner's review-scope; the canyon passes; mid-air chains off a train's roof are known limits |
| Gated places measured across the ground, pads by their own size | Default | finding 4 asks step 3 to revisit floating pads |

Fourteen calls: 3 Decided, 11 Default, 0 New.

### Findings

1. **Nobody stranded at the shore** (flow rule 3). The gate catches what the kit *adds*; it does not see what the
   kit *takes away*. At the cove, faces and shore rocks at the waterline could wall a swimmer off from the beach.
   Changed: step 1's audit adds a reverse flood from the treads (what can get back to them, with the kit and without;
   a forward search cannot see it, since water cells are its starts), and the shore must lose nothing on its beach,
   its water and its climb. The independent review added the controller walk over the face's walkable end and the
   idle stop's move (step 1).
2. **First sight is still the shore** (flow rule 1). The bluff with the "Line to Bell Rock" sign at its foot is the
   first rock a new player sees from the landing. Replacing it changes that frame, so the before and after stills at
   player height from the landing are the owner's to judge before step 2, as the plan's Risks already say.
3. **Needle Bell is the island's big shape to steer by.** In the stills its pale stone is what sets it apart from the
   sandstone gorge behind it. Plain sandstone would blend with the walls round it. Changed: step 7 keeps the kit's
   sun-bleached tops, paler course by course up the drums, so the needle still reads against the gorge; matched stills
   from the village, the gorge and the summit show it.
4. **Floating pads over walls** (step 0's trial). The 6 m is measured across the ground, so a face at a toe counts
   against Needle Bell's tower pads 50 to 90 m above it (walls 2 and 3). That over-restricts the gorge's long walls
   without protecting anything a player does. Recommended for step 3: a pad more than a face's height (14.4 m) above
   the ground keeps clear its column and its pull lines, not a ground circle; ground-level gates stay as they are.
5. **Works rocks are work edges** (DESIGN.md 7, telegraph everything;
   [route contract](../research/route-contract.md)). Beside kit boulders of the same colour, a works rock could read as
   scenery. Changed: step 8 keeps what tells a works rock apart (its shape and marks) and shows one beside a kit
   boulder in its stills.
6. **Co-op and solo.** Nothing new: no piece is used or held. A friend arriving late lands at the landing, placed on
   ground by `src/place/pose.ts`; the shore's faces mount through the lift-or-wait helper like every area's.

### Suspect lines

None: the revision changes no copy.

### Owner questions

None new: the five are answered, and the defaults above proceed on their recommendations
([agent-calls](../agent-calls.md)).
