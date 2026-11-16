# Start area: the landing, the grey West landing and the walk up

_Plan, 15 November 2026 (design sub-agent); the designer's review (below) is folded in. Checked on main `230347ec5`. No game code changed. Stills are frozen
1280 × 800 frames on a shared Mac under load (1-minute load 4 to 29): evidence of layout and composition only, not
of timing or motion. Not tested on a device._

> **Owner, 15 November:** "Was there anything in Grant's playtest feedback about the beginning area and the confusion
> with the grey box bridge, the ramp and then the path as well? It feels very cluttered for how one would expect the
> game to start. What needs to happen for us to refine that? Does the grey box need to progress so that we can alter
> the terrain for the full track integration? How should that work?"

Committed effort: backlog P1 "Grant's 14 November playtest" (G29 sits in its queue as C8) and P1 "Terrain clean-up".
This plan adds no new effort; it re-files G29 and names the start's own clean-up.

## The answer in short

- **Yes, Grant flagged it.** G29 (P3): "The ramp and stairs up the first hill and down to the river are grey box; the
  road clips into the hill. Should be real stairs." The "grey box bridge" is the **West landing's grey stair**, a
  26 m grey ramp with parapets that spans the shore path 5 m from where a newcomer lands. "The ramp" is the grey end
  ramp beside it, and "the path" is the shore path that runs under both. G32 (the narrow bridge where he couldn't
  catch the track-laying train) is not the start: it is the sea line after Q3.
- **The data agrees on how the stair reads.** Two of the three first-time landings on 14 and 15 November took the
  grey stair as the way up. Grant climbed it, dropped off its side and then paced the shore ramp's bend for about
  25 s. Derek climbed it and was out quickly. A third newcomer, Marias, walked off the beach beside the dock into
  the sea at 0:56 and swam west towards a far island; she was back on Home at 8:53. After the shore, Grant's next
  three minutes flowed.
- **What the stair is for.** The West landing is greybox leg 2's placeholder for a real future station: the root
  of two catalog rows, `bay` (to Bell Rock) and `cave` (to the Saltpan and the quay), at world (801, 10). That is
  exactly the newcomer's landing point. **The site is permanent** (it's in the sim catalog). **Its grey form is
  temporary**, until the `bay-cut` leg after High Gorge is built. **The stair is a stopgap that isn't needed**: the
  shore path already reaches the shelf 10 m south of it.
- **The architecture question: no, the clean-up doesn't wait.** The clutter isn't a terrain-integration problem. A
  far-future station's grey massing, and a stair it doesn't need, were placed on the first-visit landing. Removing
  the stair and trimming the massing are Local view and collider changes, and can ship now. Only
  the West landing's *final* form (a real station with its bed graded into the shelf) waits, and it waits on that
  leg being next, not on the greybox route moving on. Terrain can be graded for a catalog row once its geometry is
  settled and its leg is next or built; whether the track is laid never changes the ground.

## Outcome and fit

A newcomer stands up on the dock and sees one way to go: the packed-earth path climbing to the village. Nothing grey
competes with it, and nothing invites them out to sea. That serves DESIGN 11 (Show, don't tell: the landing reads as
a path up) and 7 (Telegraph everything: telegraph the *next* connection, which is the camp, not a line that opens
after High Gorge). It also serves the owner calls "Gameplay shapes the environment" (an arrival is a route, so it
should read as one) and "A well-designed town, not a view from spawn". The case here rests on what players did at the
landing, not on what the spawn frame shows. No principle is bent.

Phase: the greybox route is open live with leg 1 (to High Gorge) still being built; the first five minutes (#1869)
shipped on 15 November. Disposition by step: **proceed within existing scope** for S1 to S3 (queued P3 work and small
rulings; shipping them ahead of the rest of C8 is the orchestrator's ruling, logged); **owner decision needed** for S4 (it narrows his 13 November N4 call); **defer** S6 until its trigger.

## What a new player sees, spawn to the camp path

The stills are in `/Users/matiasfranco/Developer/boogle/.look/start-area/`. 01 to 08 are the player's own camera, in
a live session with `intro=1` (the fall, then the landing). 09 to 15 are fixed cameras at about eye height or above.
16 is Grant's heat map.

| Still | Where |
| --- | --- |
| [01-landing-first-frame](/Users/matiasfranco/Developer/boogle/.look/start-area/01-landing-first-frame.png) | Stood up on the dock, title letters still lying round |
| [02-landing-settled](/Users/matiasfranco/Developer/boogle/.look/start-area/02-landing-settled.png) | The same view about a minute later |
| [03-landing-stair-over-path](/Users/matiasfranco/Developer/boogle/.look/start-area/03-landing-stair-over-path.png) | From the landing towards the path and the board |
| [04-landing-behind-to-sea](/Users/matiasfranco/Developer/boogle/.look/start-area/04-landing-behind-to-sea.png) | Turned round: dock end, platforms, open sea |
| [05-under-the-stair](/Users/matiasfranco/Developer/boogle/.look/start-area/05-under-the-stair.png) | On the shore path under the stair |
| [06-shore-ramp](/Users/matiasfranco/Developer/boogle/.look/start-area/06-shore-ramp.png) | The shore ramp |
| [07-look-back-stair-into-hill](/Users/matiasfranco/Developer/boogle/.look/start-area/07-look-back-stair-into-hill.png) | Looking back from the ramp's bend |
| [08-top-of-climb](/Users/matiasfranco/Developer/boogle/.look/start-area/08-top-of-climb.png) | The dock street reaching the Round |
| [09-round-from-dock-street](/Users/matiasfranco/Developer/boogle/.look/start-area/09-round-from-dock-street.png) | The Round from the dock street |
| [10-hall-to-camp-path](/Users/matiasfranco/Developer/boogle/.look/start-area/10-hall-to-camp-path.png) | The hall, Sleeves, Pip's house, the camp path's start |
| [11-commons-north-arch](/Users/matiasfranco/Developer/boogle/.look/start-area/11-commons-north-arch.png) | The camp path north along the commons |
| [12-rim-down-to-river](/Users/matiasfranco/Developer/boogle/.look/start-area/12-rim-down-to-river.png) | Down the wall to the river footbridge |
| [13-overview-start](/Users/matiasfranco/Developer/boogle/.look/start-area/13-overview-start.png) | The whole start from the south-west |
| [14-top-down-landing](/Users/matiasfranco/Developer/boogle/.look/start-area/14-top-down-landing.png) | The landing from above |
| [15-over-landing-from-sea](/Users/matiasfranco/Developer/boogle/.look/start-area/15-over-landing-from-sea.png) | The landing from over the sea |
| [16-grant-heatmap](/Users/matiasfranco/Developer/boogle/.look/start-area/16-grant-heatmap.png) | Grant's session heat map |

### Clutter and confusion, item by item (ranked)

| # | P | What | Where (world) | Built by | Still |
| --- | --- | --- | --- | --- | --- |
| 1 | P1 | **The grey stair ("the bridge")**: a 26 m light-grey ramp with two pale parapets, climbing from the shelf (y 3) to the commons' edge (y 17.2). It crosses over the shore path diagonally, right in the landing's first frame. It is the tallest, brightest thing there, and it reads as *the* way up | x 805 to 831, z 13.5 to 16.5 | `src/content/levels/leg2.ts` `west()` pieces `stair`, `stair-parapet-n`, `stair-parapet-s` (call 120); compiled to `content/built/levels/west.json`; drawn by `src/entities/route-greybox/massing-west.ts` via `leg2-draw.ts` | 02, 03, 05, 07, 13, 14 |
| 2 | P1 | **The stair's posts in the shore path's tread** (terrain-clean survey finding 13, handed to the greybox owner on 14 November, still standing), and the stair's top end meeting the cliff so that it reads as "the road clips into the hill" | posts about (813 to 818, 13 to 17); top about (831, 15) | same `stair` piece (`posts: true`) | 05, 07 |
| 3 | P1 | **The West landing's grey massing on the arrival dock**: platform A (light) beside you and platform B, both on posts, the dark 60 m bed between them pointing north-west out to sea, the grey end ramp sloping down onto the dock, and the grey apron. You land between them | root (801, 10), along (−0.6155, −0.7881), s 0 to 60 | `leg2.ts` `west()`: `bed`, `platform-a`, `platform-b`, `end-ramp`, `apron` | 01 to 04, 13 to 15 |
| 4 | P2 | **A sea lure behind the landing**: turned round, the dock runs 22 m west into the sea, the grey bed points north-west (52° off it), and a far island with a talk bubble sits on that horizon. Marias walked off the beach beside the dock and swam towards it | planks x 782 to 805, z 10; the beach at z 15 to 20 | `src/place/land.ts` `buildLand` (`SHORE_COAST` block); the far island is route-greybox massing | 04, 14, 15 |
| 5 | P2 | **The board** "LINE TO BELL ROCK / UNDER CONSTRUCTION" stands at the sand's edge, in the landing's frame. It labels a line that opens after High Gorge | (805, 20.5), facing east | `leg2.ts` `west()` `posts` | 02, 03 |
| 6 | P2 | **Landing yaw**: the first frame looks east-south-east, across the stair's diagonal, rather than up the path's first leg | `SHORE_LANDING.yaw` = −π/2 − 0.2 | `src/place/shore-layout.ts` | 01, 02 |
| 7 | P3 | **The fall's title letters and cart** lie round you for 20 s (letters) and 40 s (cart), between the grey boxes. On their own they're the fall's payoff; next to items 1 and 3 they pile up | the dock | `src/fall/` | 01 |
| 8 | P3 | **The north arch**: a plain grey-stone box arch over the camp path. It reads as greybox | local (−146.5 to −137.5, −70) | `src/place/opening-stops.ts` `arch('north-arch', …)` | 11, 13 |
| 9 | none | **The Round's grey house blocks** and **the far islands' grey silhouettes** on the horizon | the Round; the sea | town blockout; route-greybox massing | 08, 09, 04 |
| 10 | none | **The shore ramp and dock street** read clean since 15 November's levelling (`77839afcc`) and plain-path climbs (`50c41188e`) | (813, 10) to the ring | `terrain.ts`, `path-surface.ts` | 06, 08 |

Items 9 and 10 are not clutter to remove. The blocks are "Block out spacing first", the silhouettes are
"Development is live", and the paths are done. Item 7 needs no change once 1 and 3 go.

### What Grant's G29 covers now

Grant played build `4174823c`, before 15 November's terrain work. "Stairs ... down to the river" and the folded
benches were the canyon path: since then its benches have been levelled (`c6a6a35d6`), its painted timber risers
removed (`50c41188e`) and the shore ramp levelled (`77839afcc`). Still 12 shows the descent now. What is left of G29
is items 1 to 3, the grey half. The queue filed G29 under terrain-clean (C8), but terrain-clean never touches
`route-greybox`, so nothing was ever going to remove it. This plan owns that half.

## Level findings

1. **The newcomer's landing is the West landing's root.** `SHORE_LANDING` (local −199, 10 = world 801, 10) is the
   root of the `bay` and `cave` rows (`src/sim/railway-world-lines.ts:290`, `:400`, `[80100, 1000, 400]`). Platforms
   A and B and the end ramp stand over the arrival dock. Greybox-leg2-massing finding 9 saw the jetty overlap; nobody
   recorded that the jetty is the first-visit landing. N4 (13 November) was decided without that fact.
2. **The stair adds no reach.** The shore path comes down to the shelf just south of the stair's foot
   (greybox-leg2-massing finding 4). Platform A is reached from the commons by the shore path, then the end ramp.
   S1 must prove that with the body, not the flood.
3. **The stair makes a new drop.** Its parapets are 1 m, and Grant left it sideways: on the stair at (817, y 10,
   z 15) at 0:42, on the path at (818, y 7, z 20) at 0:46. Not dangerous, but it shows the stair reads as the route.
4. **Behind the landing, the sea pulls.** Marias (iPhone, build `028a01ff`) stood up at 0:20, stepped south off
   the dock onto the beach at (796, 3, 18) at 0:53, walked west into the water at (779, 17) at 0:56 and swam about
   500 m west on purpose. She recovered on the far side at 4:13, fell in twice more and was back on Home's shore at
   8:53, reaching town at 9:06. She left from the beach, not the dock's end, so a rail would not have stopped her.
   Swimming stays allowed ("the sea is scenery you can swim in", DESIGN 10). The question is whether anything at
   the landing is brighter than the town: check from 04's camera after S1 (shore-arrival research: no brighter
   focal point than town).
5. **Arrival walk, measured** (`npm run playtest`, Local marks, untrusted data):

   | Session | Build | Stood up | Left the shore (x > 845) | Route |
   | --- | --- | --- | --- | --- |
   | Grant `mwh4pmui` | `4174823c` | 0:32 | 1:13 | up the grey stair, off its side, then paced the shore path's bend (x 819 to 838) 0:48 to 1:12, with jumps; a second player joined at 0:52 |
   | Derek `mwhe8aus` | `cf1c0c50` | 0:49 | 1:10 | idle 9 s at the stair's foot, then up the grey stair |
   | Marias `mwi5dj3u` | `028a01ff` | 0:20 | 8:53 (via the sea) | off the beach beside the dock, into the sea |
   | Dirk Salad `mwi11n6c` | `028a01ff` | 0:17 | (tab hidden at 0:24 on the ramp) | shore path |
   | Cl8rboi `mwhb8yrk` | `4174823c` | 2:18 | 2:35 | shore path (two players, a train called) |

   Target: 25 to 35 s (first-run.md). Time alone doesn't condemn the stair (Derek was out in about 21 s). What it
   shows is that two of three first-timers read the stair as the way up, and that Grant, its one hesitant climber,
   then lost about 25 s at the ramp's bend.
6. **After the shore, Grant's route flowed.** He reached town at 1:18, walked up the commons past the north arch
   (crystal 1:59), opened the lookout crate (2:10; a press 5 m short at 2:15 is G27), went down to the river (2:42),
   took the bell secret (2:46), climbed the far wall and woke the machine at 3:28. No idle over 8 s. The start's
   confusion sits on the landing.
7. **Track meets terrain twice in the start area, and only Home's station is integrated.** Lines 1 and 2 are
   graded into the heightfield by `terrain.ts` `bake()` (a 4 m cut or bank, `railBedCeilings`). The West landing is
   not: it's grey boxes on posts above the shelf and the sea.
8. **S1 and S2 move no heights.** Static colliders only. The heights hash, the tree catalog and `WORLD_NS` are
   untouched. S4 also moves no heights. S6 moves heights and must run the tree-catalog check (the starter trees are
   a shared catalog pinned by `test/railway.test.ts`).

## The architecture question

**Does refining the start depend on the greybox route progressing, or on the final track and terrain integration?**
Neither, for everything a newcomer trips on now. The table says which parts wait.

| Part | Depends on | When |
| --- | --- | --- |
| Remove the stair and its posts (S1) | nothing | now |
| Check the sea lure behind the landing (S2) | S1 landed | now, after S1 |
| Landing yaw (S3) | S1 landed, so the frame can be judged | now, after S1 |
| What Home shows of the West landing until its leg is being built (S4) | the owner's word on Q1 (it narrows N4) | on his answer |
| One formation rule in the terrain bake (S5) | nothing; it moves no height | when S6 is planned, or any new row touches Home's land |
| The West landing as a real station, graded into the shelf (S6) | `bay-cut` being the next leg; its root confirmed (Q1) | trigger: leg 1 (stack) laid to High Gorge |
| Rock dressing for the shelf cliff and the north arch | terrain-clean Part 3's kit, canyon wedge first (owner, 14 November) | after the wedge |

**How the integration should work.** Recommendation for Q2:

1. **The rail owns its height; the terrain conforms.** A row's plan and profile (x, z and rail-top y along s) is
   catalog data: `src/sim/railway-world-lines.ts` (generated by `dev/level/world-blockout.ts`) for the future rows,
   and `src/place/layout.ts` `LINES` for lines 1 and 2. The terrain never moves a rail. If the ground needs a rail
   moved, the catalog changes under its own mixed-build rules and the terrain re-bakes. Ring Island already works
   this way (a keep band round the track, `src/entities/ring-island/ground.ts`), and so do Home's `railBedCeilings`.
2. **The terrain bake keeps one order** (`src/place/terrain.ts` `bake()`, already nearly this):
   landform → coast and cove → **formations for every catalog row that crosses land, laid or not** → station and
   platform pads → support pads (frames, carts), capped by the formation ceilings → paths (they cut and fill, but stop
   at a formation's ceiling; a crossing is an explicit level crossing with a flat apron) → the town → fine patches.
   Formations win over everything after them. A row is in this list once its leg is next or built, never sooner:
   the `cave` row also leaves (801, 10) and runs south down the landing's beach to about (795, 75), and an empty
   bank there for a stage-6 line would be the same clutter in earth.
3. **How a grade is cut.** Along each row, every metre: formation height = rail top − 0.08 m. Within the formation
   half-width (4 m single track, the track spread plus 4 m for double) the ground is that height. Beyond it, the
   ground fades back to the land over a side slope no wider than 4 m. That is today's `strip(samples, 4, 8)`. Where
   the cut or fill would pass a row's limit, or the row is over the gorge or the sea, the ground is left alone and a
   **structure** stands instead: the trestle (exists), or a retaining face or portal from Part 3's kit. Today's limits
   differ per row (line 1 fills down to `y − 9`; the up track stops at `y − 3` or under 4.5 m). They stay per-row named
   constants, so formalising them moves no height. About 3 m is the default for a new row.
4. **A row next in line is graded before it is laid.** Terrain is static per build, and laying track must never
   change the ground: that keeps the collider, `H`, saved poses and the tree catalog independent of runtime state.
   On land, a row whose leg is next or built therefore shows as a real cutting or bank with an empty bed (stakes or
   ballast, from the view), and the track appears on it when laid. That telegraphs the next connection (DESIGN 7)
   and replaces grey slabs on posts wherever that row crosses ground. At sea and on islands with no real ground
   yet, the grey massing stays until each island gets ground.
5. **Checks per step.** `npm run level-check` gains a formation report: cross fall on the bed, maximum cut and fill,
   clearance to pads and paths, nothing inside a keep band. The heights hash changes only in a step that says so.
   Re-grading near trees moves the shared tree catalog, a mixed-build change that needs a `WORLD_NS` bump. That's
   allowed ("Nothing waits on a world bump"), but every re-grading step says so.

So, plainly: the greybox does not have to progress for the terrain to change. What gates a row's grading is that its
**geometry is settled in the catalog and its leg is next or built**, not that it is laid. For the start, the one row that touches it (the West
landing's) waits on Q1 (is the root staying at the landing?) and on its leg being next.

## Steps

Models come from `npm run models` (15 November). "Player-visible implementation" is Codex `gpt-6-astra` high;
"Implementation of an approved plan" is Codex `gpt-6.1-sol` medium; "Planning complex work" is the planner agent on
opus high; "Visual review" is the main session.

- [ ] **S1. Remove the grey stair and its posts (items 1, 2; G29's grey half). P1.** Tier: player-visible Local view
  and static colliders; no sim, no `WORLD_NS`, no heights. Model row: player-visible implementation, Codex
  `gpt-6-astra` high.
  - Files: `src/content/levels/leg2.ts` (drop `stair`, `stair-parapet-n`, `stair-parapet-s`; drop the `stairFoot`,
    `stairTurn` and `stairTop` marks and the `STAIR` constant, and re-aim the call-120 comment); regenerate
    `content/built/levels/west.json` (`npm run prefabs`); `dev/look/evals/leg2-west-walk.ts` (walk the commons
    to platform A by the shore path and the end ramp, both ways); `dev/level/route-leg2.ts` if it names the stair;
    `docs/game-design/place.md` (the West landing paragraph); a dated note on call 120 in
    `docs/plans/greybox-leg2-massing.md`; one row in `docs/agent-calls.md` (call 120 reversed, a small ruling).
  - Verify: `npm run level-check`; the walk eval reaches platform A from the commons and back; one proof still from
    02's camera, opened. Stop if the body can't reach the shelf by the shore path: report it, don't re-add a stair.
- [ ] **S2. Check the sea lure behind the landing (item 4). P2.** Tier: a capture, then at most a player-visible
  Local view change. Model row: player-visible implementation, Codex `gpt-6-astra` high (S1's job).
  - After S1, capture 04's camera (turned round at the landing) and 14's (above). Judge whether anything there is
    brighter or more inviting than the path up: the open dock end, the grey bed, the far island's talk bubble.
  - At most: a low timber end rail across the dock's west end (no side rails: hopping into the sea stays, DESIGN 10;
    under the 1.6 m jump it is only a hint) in `src/place/land.ts` `buildLand`. Check the fall's cart and letters
    (`src/fall/stage.ts`, `LANDS_PAST`) still land clear of it. A fingerpost up the path (draft copy "Village") only
    if S1 and S3 are not enough (shore-arrival research: no beacon arrows). If the far island's bubble is the lure,
    report it to the route-greybox owner rather than changing it here. Update `docs/game-design/first-run.md` if
    anything changes.
- [ ] **S3. Re-aim the landing (item 6). P2.** Tier: Local presentation. Model row: player-visible implementation,
  Codex `gpt-6-astra` high (S1's job).
  - Files: `src/place/shore-layout.ts` (`SHORE_LANDING.yaw`), only if needed.
  - After S1, capture the landing's first frame (`intro=1`). Change the yaw only if the shore path's first
    leg, (813, 10) to (823, 28), is not in the middle third of the frame. The yaw also turns the fall
    (`src/features/fall.ts` feeds `LANDING.yaw` to the sky rail, the title's reading order, the letter scatter and
    the crane), so a change is verified with an `intro=1` look of the whole fall, and `scenario arrival` re-runs.
- [ ] **S4. What Home shows of the West landing until its leg is being built (items 3, 5). P1; waits on Q1.**
  Tier: player-visible Local static view and colliders; no state read, no new op, no saved shape. Model row:
  player-visible implementation, Codex `gpt-6-astra` high.
  - Under Q1's recommended answer (a staked site), switched by the build, not by room progress: until the build that
    starts the `bay-cut` leg (Bell Rock), Home's West landing draws no platforms, apron, end ramp or bed on posts. On
    the shelf it shows survey stakes along the bed's first 20 m and the board, moved onto the shelf beside the shore
    path's foot and facing the path. That build turns the massing (or S6's station) back on. A room-progress gate
    was rejected: it would be the massing's first read of shared state, and rooms already past leg 1 (the owner's
    included) would never show the fix.
  - Files: `src/content/levels/leg2.ts` (a `WEST_STAKED` switch; stakes as posts; the board's spot), regenerated
    `content/built/levels/west.json`, `src/entities/route-greybox/massing-west.ts`; `docs/game-design/place.md`;
    the N4 entry's rules note in `docs/decisions-rail.md` per the owner's answer.
  - Verify: one still from 02's camera and one from 13's; `level-check`.
- [ ] **S5. One formation rule in the terrain bake (architecture item 3). P3, when triggered.** Tier: Local terrain
  refactor with per-row limits kept as named constants; the heights hash must be byte-equal. Model row: implementation of an approved plan, Codex `gpt-6.1-sol`
  medium.
  - Files: `src/place/terrain.ts` (the two rail `strip` passes and their skip rules become one `formation(row)` with
    named constants and a keep band), `src/place/layout.ts`, a formation report in `dev/level/check.ts` (or a new
    `dev/level/formation.ts`), one test that the hash is unchanged.
  - Trigger: S6 is planned, or any new catalog row touches Home's land.
- [ ] **S6. The West landing as a real station. P3, deferred.** Tier: heights change plus station prefabs. Run the
  level-check findings and the tree-catalog check (`WORLD_NS` if the shared catalog moves). Model rows: planning
  complex work (planner, opus high) first, then player-visible implementation, Codex `gpt-6-astra` high.
  - The `bay` row's formation graded on the shelf through S5's rule (the `cave` row only when its own leg is next);
    platforms as station prefab records on the formation; the shore path stays the way up; any cliff stair is a
    Part 3 retaining piece, not a grey ramp.
  - Trigger: `bay-cut` is the next leg to build, with Q1 confirming the root.

**Checkpoint:** S1 to S3 ship together as one job and one ship, with one proof still of the landing and the walk
eval. Shipping them ahead of the rest of C8 is the orchestrator's ruling ("Small rulings are the orchestrator's"),
logged in agent-calls. S4 follows the owner's answer. Not in scope: the north arch (item 8: Part 3's kit), the Round's blocks, the fall.

## Decided, default, new

| # | Call | Status | Source |
| --- | --- | --- | --- |
| 1 | The grey "under construction" platform appears on the live game at Home's west shore | Decided (N4) | [owner, 13 November](../decisions-rail.md#d-2026-11-13-greybox-west-landing-in-the-live-game); S4 asks to narrow it |
| 2 | The shore is the first landing | Decided | [owner, 4 November](../decisions-look.md#d-2026-11-04-the-shore-is-the-first-landing); unchanged |
| 3 | Work in progress ships live | Decided | owner-calls "Development is live"; S4 keeps the site visible (stakes, board) |
| 4 | Remove the West landing's grey stair (reverses call 120); Grant's "should be real stairs" weighed and declined: a second way up 10 m from the path splits the first choice | Default, agents' small ruling | S1; the end ramp's foot is on the shore path's first leg, so reach stays |
| 5 | Check the sea lure behind the landing; at most an end rail, no side rails | Default | S2 |
| 6 | Landing yaw only if the path's first leg is off-centre, checked with the whole fall | Default | S3 |
| 7 | The staked West landing is a build switch, not a room-progress gate | New, with Q1 | S4 |
| 8 | Rails own their height; terrain conforms; a row is graded once its leg is next or built | New | Q2 |
| 9 | Ship S1 to S3 ahead of the rest of C8 | Default, orchestrator's ruling | Checkpoint |
| 10 | Leave the fall's letters and cart as they are | Default | item 7 |

## Risks

- **S4 is a build switch.** Until the `bay-cut` build, nobody sees the grey West landing massing at Home, even in a
  room far along the route. That is the point, and Q1 says so.
- **S2's rail and the fall, if a rail is added.** The cart lands beside you near the dock's land end. If it lands on
  the new rail, shorten the rail rather than moving the fall.
- **Q1 option C** (move the landing) would change heights at the cove and re-time the arrival. It isn't recommended,
  partly for that reason.

## Owner questions (recommendation first)

1. **The West landing sits on the newcomer's landing. Until its line is being built, what should Home show there?**
   **Recommended: a staked-out site.** The board and a row of survey stakes on the shelf, with no grey platforms or
   bed on posts, in every room, until the build that starts the Bell Rock leg; then the grey massing or the real
   station takes its place. This narrows your 13 November call that the grey platform appears in the live game. The site stays
   visible and live; only the bulk waits. Alternatives: (B) keep the full grey massing as now, without the stair; or
   (C) move the newcomer's landing south along the beach and keep everything.
2. **How should tracks meet terrain? Recommended: the rail owns its height and the terrain conforms.** A catalog row
   that crosses land is graded into the ground as a cutting or bank once its leg is next or built, before its track
   is laid. Unlaid, it shows as an empty bed; past about 3 m of cut or fill it becomes a structure (trestle,
   retaining face, portal). The alternative
   is grey slabs on posts until each leg is built, then grading. That means re-grading every area twice and leaves
   grey on finished ground meanwhile.
Shipping S1 to S3 ahead of the rest of C8 was a third question; the designer moved it to the orchestrator as a
small ruling.

## Suspect lines

None of The Boogler's. New draft copy for the owner, used only if S2 needs it: the fingerpost "Village". The West landing board's
"LINE TO BELL ROCK / UNDER CONSTRUCTION" is existing placeholder text and is kept.

## Design review (designer, 2026-11-15)

Read: DESIGN.md, owner-calls, N4 and rail Current rules, the shore and terrain look entries, greybox-leg2-massing
(calls 108, 120, build notes 4 and 9), first-run, shore-arrival research, `leg2.ts` `west()`, `shore-layout.ts`,
`land.ts` (the dock), `terrain.ts` `bake()`, `fall/stage.ts`, the `bay` and `cave` rows. Opened stills 02, 03, 04, 07,
13 and 14. Read the raw marks for Grant, Derek and Marias (untrusted browser text). Not run: the walk eval,
`level-check`, `loop`. Not read: find-the-fun.

### Calls

| Call | Kind | Source or recommendation |
| --- | --- | --- |
| Massing in the live game | Decided | [N4, 13 November](../decisions-rail.md#d-2026-11-13-greybox-west-landing-in-the-live-game); S4 narrows it |
| The shore is the first landing | Decided | [4 November](../decisions-look.md#d-2026-11-04-the-shore-is-the-first-landing) |
| Remove the stair (reverses call 120) | Default | Agree. The end ramp's foot is at about (808.6, 10.4), on the shore path's first leg at y 3, so the shelf and platform A keep their reach. Grant's "should be real stairs" is weighed and declined: a second way up 10 m from the path splits the first choice |
| Dock rail on the end and both sides, 1.1 m | Default | Change (finding 2) |
| Fingerpost "Village" | Default | Draft copy; add it only if S1 and S3 aren't enough (research: no beacon arrows) |
| Landing yaw, conditional | Default | Agree, plus finding 3 |
| Board on the shelf, facing the path; fall left as is | Default | Agree |
| Staked site until leg 1 is laid | New | Owner (Q1); change the trigger (finding 4) |
| Rail owns height; unlaid rows graded; about 3 m, then a structure | New | Owner (Q2); bound it (finding 5) |
| Ship S1 to S3 ahead of C8 | Default | Orchestrator's ruling (finding 6) |

### Findings

1. **The identification is right; the time evidence isn't.** The stair is the "bridge" (03: spans the path; 07: its
   top meets the cliff, the "road clips into the hill"). But Derek climbed it and was out in about 21 s (0:49 to
   1:10), under target. Grant's 25 s of pacing is on the shore path's bend (x 819 to 838), not the stair. It
   includes jumps, and a second player joined at 0:52. **Fix:** rest S1 on how the stair reads (two of three
   first-timers took it as the way up) and on G29. Drop "only shore-path walkers hit it".
2. **Marias left from the beach, not the dock's end.** At 0:53 she was at (796, 3, 18), south of the planks
   (z 6.5 to 13.5). She entered the water at (779, 17), then swam about 500 m west on purpose. Still 04 shows a far
   island with a talk bubble on that horizon. A rail wouldn't have stopped her. Side rails take away a hop into the
   sea (DESIGN 10), and at 1.1 m, under the 1.6 m jump, a rail is only a hint. **Fix:** S2 keeps an end rail at most.
   Re-file finding 4 as a sea lure ("no brighter focal point than town", shore-arrival) and check it from 04's camera
   after S1. The bed is 52° off the dock, not parallel to it.
3. **S3 turns the fall too.** `features/fall.ts` feeds `LANDING.yaw` to the sky rail, the title order, the letter
   scatter and the crane. **Fix:** verify with an `intro=1` look of the fall.
4. **S4's trigger.** A leg-1 gate adds the first lockstep read to the massing view and makes rooms differ by
   progress. The owner's room may already be past it, so he'd never see the fix. **Fix:** a build-time switch (Risks'
   fallback): stakes until `bay-cut` is the leg being built. That fits "Development is live" and DESIGN 7.
5. **The architecture is right in direction, with three gaps.** (a) S5's byte-equal hash contradicts "one ~3 m
   rule". Line 1 fills down to `y − 9`; the up track stops at `y − 3` or 4.5 m. Keep per-row constants, or say
   heights move. (b) The `cave` row also leaves (801, 10) and runs south down the landing's beach to about (795, 75).
   "Every row, laid or not" would lay an empty bank there for a stage-6 line: the same clutter in earth. Grade a row
   when its leg is next or built, and exempt the landing until Q1. (c) Re-grading near trees moves the shared tree
   catalog, a mixed-build change needing `WORLD_NS`. That's allowed ("Nothing waits on a world bump"), but each area
   should say so, not only S6.
6. **Q3 is a small ruling** (order within P3 work): rule it and log it.
7. **Copy:** none of The Boogler's lines are touched; none are suspect.
8. **Not done here:** this review could edit only this file, so the orchestrator adds the Default and New rows to
   [agent-calls](../agent-calls.md).

### Owner questions

1. **Q1, kept.** Recommended: until the Bell Rock line is being built, the West landing shows stakes and the board,
   with no grey platforms. A build switch, not room progress. It narrows N4.
2. **Q2, kept and bounded.** Recommended: the rail owns its height and the terrain conforms. A row is graded once
   its leg is next or built; past about 3 m of cut or fill, it becomes a structure.
3. Q3 is dropped (finding 6).

### Verdict

**S1 builds as written. S2 changes first (finding 2). S3 builds with finding 3's check. S4 waits on Q1 with finding
4's trigger. S5 and S6 take finding 5 before they're planned.** Nothing is irreversible.
