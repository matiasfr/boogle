# Plan: chunk, cull and stream the world

> **Status: planned (17 November 2026); step 0 complete (`codex/world-census`).** Backlog row "Chunk, cull and stream the world" (P2, building). Owner, 10
> November: "Treat as urgent and re-order the queue" ([decision](../decisions-process.md#d-2026-11-10-priority-call-migrate-the-game-out)).
> The planner worked from `d2abaf31` without a browser run (another job held the GPU). Section 2 distinguishes earlier
> [performance research](../research/performance.md) from the builder's new captures. Not tested on a device.

**Goal.** Stop paying, every frame and everywhere, for parts of the world the camera cannot see or a player is far
from, so frame time holds a stable 60 fps on the Mac, phones and the iPad
([frame-time-60](../agents/owner-calls.md#frame-time-60), [mac-mobile](../agents/owner-calls.md#mac-mobile)). A technical
goal: it serves those owner calls and bends no DESIGN.md principle. Performance guides and does not gate
([owner call](../agents/owner-calls.md#performance-guides-not-gates)): nothing here drops or defers gameplay.

**Research.** [performance](../research/performance.md): recommendations 3 (chunk the track) and 6 (ground tiles) are
done, 1 (railway read cache) is done (section 6), 11 (a phone tier) is done as the Detail ladder; this plan takes 4 (sleep
what is far), 7 (static matrices), 8 (real bounds), 9 (shadow casters by distance, which bounds give for free) and the
geometry half of 5 (the sea's grid behind the camera). [open-world](open-world.md) section 3: "visual-only first, no
server needed" is followed; its 2D chunk grid of shared state is **not** planned, because the server now owns every
rule and each client mirrors it (see open question 1). [rendering](../agents/rendering.md#terrain-and-large-static-meshes-the-pattern):
any new big ground uses the far-ground pattern; never `frustumCulled = false` because a mesh is large.

## 1. Already done (checked against the code)

| What | Where | How it works |
| --- | --- | --- |
| Main island ground as Chunked LOD tiles, **on by default since 11 November** | `src/place/far-ground.ts:2-4`, `:41-57` (`farGround` setting, default `true`); land.ts hands its full mesh over at `src/place/land.ts:294-296` | 96-cell (192 m) tiles with real bounds (`:156-167`), three levels at 0 / 180 / 420 m (`:27-31`), picked against the player camera in `scene.onBeforeRender` (`:69-88`); stitched borders, pure index half in `far-ground-index.ts` with `test/far-ground-index.test.ts` |
| Offshore rings and the cove split 3 x 3 so the far sides cull | `src/place/far-ground.ts:168-198` | Same 32,848 triangles, 8 draws at Far Head (research section 10) |
| Ring Island's ground on the same tiles | `src/entities/ring-island/view.ts:807-808` | `addFarGround(groundMesh, ...)` |
| One shared LOD pick with hysteresis | `src/render/lod-level.ts:9-13` | Used by the ground tiles and the track |
| Committed track in chunks with bounds, three LODs and distance-gated shadows | `src/entities/railway/track-chunks.ts:10-30` (200 m heavy / 400 m light chunks, LOD at 0 / 50 / 120 m, shadows within 120 m), wired in `lookTrack` (`src/place/look-kit.ts:276`, bounds `:326-329`, shadow and level `:386-392`) | Far Head 1.15 M → 0.98 M triangles (research section 10, 12 November) |
| Greybox route areas resident by distance (meshes and colliders) | `src/entities/route-greybox/index.ts:22` (mount 400 m, free 550 m), `:33-37` (gorge, bell, west), `:47-56` (nearer of camera and body) | Built, precompiled and mounted off the frame; freed past 550 m |
| Ring Island near view mounted by distance, far leaf otherwise | `src/entities/ring-island/index.ts:21` (500 / 650 m), `:73-86`; far leaf `src/entities/ring-island-far/` | Near meshes and colliders only within range; the two never draw at once |
| Classic island fish and gulls spawn near it only | `src/island/classic-zone.ts:10-11`, `:18-38` (160 / 190 m) | #1114 |
| Town interiors draw only with the camera near their door | `src/entities/town/rooms.ts:12-15`, `near` group `:284` | Walls and contents of a village you are not in cost nothing |
| Railway read rebuilt once per change, not per `inspect()` | research section 6 (7 November) | −0.2 ms room-clock CPU and −300 KB/frame garbage at every pose |
| One palette clone per material, not per mesh | `src/render/material-palette.ts` (research section 3) | −20 materials |
| Phone/low tier: the Detail ladder with an auto governor | `src/graphics-settings.ts:145-175` (`rungValues`, `setAutoDetail`); 12 graphics settings incl. `seaDetail`, `shadows`, `msaa`, `resolution` | Research section 7 measured each rung |

So three home-grown residency loops exist (greybox, Ring Island, critters), each with its own distance and
hysteresis code; step 2 gives them one pure decision.

## 2. What is left: drawn, simulated or loaded for the whole world

**Measured here, without a browser** (static code reads and a headless count; exact):

- **Trees.** 350 land trees (2 hardwood), x 800 to 1455, z −245 to 181, in 11 occupied 200 m cells, up to 120 in one
  (`LAND_TREES`, `src/place/tree-catalog.ts:71`, counted with `dev/sim/hooks.ts`). Drawn as **10 instanced part batches**
  (`src/render/place-tree-view.ts:156-167`), every one `castShadow` and `frustumCulled = false` (`:180-183`): 10 main
  and 10 shadow draws from anywhere, Ring Island and the bay included. Chunking them would add draws; bounds are enough.
- **63 `frustumCulled = false` sites** in `src/`. Most are right (things that move across the world: flights, carried
  loads, particles, sprites, precompile). The static or slowly changing ones that span an area:
  `kitBatch` (`src/place/look-kit.ts:210-214`) is uncullable by default, and of its users the yard track
  (`src/entities/railway/yard-track.ts:208-217`, four whole-yard batches: sleepers, plates, rails, posts, no chunks)
  and the station kit rails and stones (`src/entities/railway/stations.ts:156`, `:217`, `:227`) never move; the
  pile batches (`src/entities/railway/sources.ts:261`, `:270`) change only when a pile does; the workshop's box proxy
  (`src/entities/town/workshop.ts:94` via `src/render/boxes.ts:59-66`, casts); the contact blobs (`src/place/look.ts:316-333`,
  4,096 instances, one cheap draw: leave); the townsfolk's four batches (`src/place/folk.ts:80`).
- **The sea**: one camera-centred 360° polar grid, `frustumCulled = false` (`src/render/water/surface.ts:340-343`,
  `buildGrid` `:116`): more than half its vertices are behind the camera (research G1).
- **Per-frame view work wherever the player is.** The railway view updates about twenty sub-views every frame
  (`src/entities/railway/view.ts:565-627`: cart, trains, freight, halts, home station, hoist, works, line 2, hook,
  glide, shelf, path, wake, arrival, sources, reward, opening). The townsfolk run in the opening view every frame
  (`src/entities/railway/opening-view.ts:191`; ~5 ms a second in Chromium, research section 6); `sources.update` walks
  all trees twice a frame (~2 ms a second).
- **Matrices.** Only four files set `matrixAutoUpdate = false` (`roundhouse-view.ts:407`, `ring-island-far/view.ts:106`,
  `features/impact.ts:92`, `render/instances.ts:143`); `updateMatrixWorld` over the scene was 25 ms a second on 6 November
  (research C2).
- **Prefab placements**, from `content/built/levels/*.json`: static levels room-museum 178, room-shop 132, room-house
  117, room-gate 92 (all behind the interiors' near gate), town-blockout 58, rotunda-home 41, museum 29, house 27, shop 17,
  others under 15. Layout levels from their fixtures: gorge 86 authored / 84 visible / 55 bodies, bell 75 / 23 bodies,
  west 5 / 0 (all three already resident by distance); halt-kit resolves at load (not counted).
- **Physics.** The main island's static colliders are always resident; the Rapier step was 0.3 ms a frame (research
  C6). Not worth streaming; not planned.

**From earlier measurements** (counts exact, times from the research doc): Far Head is the heaviest pose, 670 to 678
main draws and 88 shadow draws at 960x600 (research section 10), `renderer.render` 7.4 to 8.4 ms a frame inclusive in
Chromium on the M1 Max (section 9); the far view's GPU is fill-bound and the sea was nearly half of it (section 2). The
11 November reading (HOTBOX) held the display rate at the green, Far Head and the Ring Island halt, Far Head with the
least headroom (12 ms CPU, 14.6 ms GPU).

**Windows bench: taken under load, not a baseline.** The exact 20 s `--no-load` bench in section 4 ran at 1280×800, DPR 2,
on Ampere. `tasklist` showed other Chromium (Edge) processes before and after; Node's Windows load reading of zero is not
evidence of a quiet machine. Bench poses and render-count methods differ from the census; do not compare them directly.

| Bench pose | CPU avg / p95 (ms) | GPU avg / p95 (ms) | Draws / triangles | JS heap / three.js-tracked GPU (MiB) |
| --- | ---: | ---: | ---: | ---: |
| Spawn | 15.032 / 19.615 | 15.568 / 19.611 | 733 / 1,058,316 | 385.6 / 288.7 |
| Far | 12.177 / 15.235 | 12.735 / 17.184 | 398 / 1,144,005 | 495.1 / 289.8 |
| Head | 58.726 / 66.855 | 54.639 / 65.057 | 805 / 1,392,865 | 400.7 / 292.2 |

**Step 0 census** (Chromium WebGPU, 960×600, `ring-joined`, one completed frame per pose). Each pair is
draws / triangles; main means non-shadow submissions. The scene walk includes hidden meshes; “outside” means no
instance's geometry sphere intersects the main camera frustum, not a claim about occlusion or shadow visibility.

| Pose | Main total and notable rows | Shadow total and notable rows | Uncullable meshes and outside-frustum submissions |
| --- | --- | --- | --- |
| Green | **252 / 730,559**; `Scene/Group/Mesh` 97 / 80,602, rail kit 6 / 123,804, main ground tiles 4 / 72,116 | **122 / 183,026**; `Scene/Group/Mesh` 24 / 39,684, `Scene/Group/Group/Mesh` 18 / 40,076 | 151 listed (102 outside): outside meshes still submit 36 / 91,924 main and 22 / 35,824 shadow. Wheel batches (96 and 12 instances) submit 2 / 48,384 main; an unnamed 937-instance caster submits 1 / 11,244 in each pass. |
| Far Head | **731 / 1,237,093**; `Scene/Group/Mesh` 294 / 405,330, `Scene/Group/Group/Mesh` 97 / 49,022, `Scene/Group/Group/Group/Mesh` 52 / 2,596; rail kit 11 / 161,100 | **106 / 163,572**; `Scene/Group/Group/Mesh` 15 / 39,496, `Scene/Group/Mesh` 12 / 26,612 | 151 listed (65 outside): outside meshes still submit 12 / 25,268 main and 8 / 23,132 shadow. Unnamed 937-, 452- and 253-instance casters submit 3 / 19,704 in each pass. |
| Ring | **111 / 336,763**; `Scene/Group/Mesh` 28 / 37,570, Ring ground tiles 14 / 101,532, `box plan` in `Scene/Group` 11 / 5,376 | **88 / 150,860**; `Scene/Group/Group/Mesh` 13 / 39,144, `Scene/Group/Mesh` 13 / 25,980 | 151 listed (147 outside): outside meshes still submit 67 / 201,002 main and 48 / 93,044 shadow. Yard rail, steel sleeper, sleeper and post submit 4 / 52,872 main and 1 / 4,488 shadow; the town `box plan` (720 instances) submits 1 / 8,640 in each pass. |

`Sickle Isles horizon` submits 1 / 3,164 main at all three poses and no shadows. The raw per-object and owner-path rows,
including every uncullable mesh and the ten ranked update kinds, are in `.look/census-{green,head,ring}-before.log`;
the bench JSON is in `.look/world-census-bench.log`.

- **Step 1:** Prioritize Ring's off-camera static yard batches and town proxy, then use the recurring off-camera caster
  rows to verify tree, station and pile ownership and the savings. The wheel rows are large but not static candidates.
- **Step 4:** The inspector exposes each kind's `update` phase, not individual railway sub-views. The eval observes for
  5 s and reads the built-in rolling 240-frame stats; green had only 83 new renders, versus 258 at Head and 277 at Ring,
  so this is not a strict five-second timing window or timing evidence. Railway and town ranked first and second at all
  three poses. Use the existing `--cpu-prof` proof to identify place-bound sub-views before choosing them; no game hook added.
- **Step 6:** Trace the three leading Far Head draw groups to their actual owners before picking batches. Unnamed
  ancestry can combine unrelated objects; the already-batched rails are triangle-heavy, not a many-mesh target, and the
  named `cargo fittings` group rides with wagons, not static scenery.

**Still unmeasured:** individual railway sub-view update costs, physics body counts at these poses, a quiet current frame
time baseline, and Safari or on-device performance. Not tested on a device.

## 3. Design

- **Sync kind: Local, cosmetic, everywhere.** Every step changes what this tab draws or animates. None reads into a
  rule, a command, a replica, presence or a save. **No step touches `src/sim`, `src/world`, `src/net` or `server/`**;
  no wire, state or catalog change, so no `WORLD_NS` bump. Physics stays Owner and unchanged: no collider is newly
  streamed (the greybox's and Ring Island's existing residency keep their exact rules).
- **Two verbs.** *Cull*: give a static batch real bounds so the frustum (main and shadow) drops it. *Sleep*: skip a
  place-bound view's update while it is far; hide its meshes only where they are out of the frustum or under a pixel,
  so nothing a player can see disappears. A view woken from sleep snaps to the current replica; it never replays a
  one-shot effect it missed (effects still follow receipts, and a slept view simply did not show one).
- **Distance is what the eye sees.** Residency and LOD use the horizontal camera distance scaled by the camera's field
  of view against the default 62° (`src/render/scene.ts:241`), so the lookout telescope at 2x zoom
  (`src/entities/lookout/view.ts:26-32`, `:101`) halves it and sees what it zooms to at the right detail.
- **One decision, many owners.** A pure `resident(distance, was, near, far)` next to `lodLevel`; each owner keeps its
  own mount, spawn and dispose. No new lifecycle layer, registry or chunk grid.

## 4. Steps

Each step leaves `node dev/ship-check.ts` green and is its own commit. Tier is **view** for all of them (step 0 is
**dev**). "Pose reading" means, on a quiet machine with the load stated:
`npm run bench -- --no-load --rail-seed ring-joined --poses spawn,far,head --seconds 20` (frame time: CPU and GPU ms
per frame, average and p95 as bench prints, plus calls and triangles), and for draw counts by object
`npm run look -- --real --fov 62 --rail-seed ring-joined --query 'tpose=<green|head|ring>' --cam <x,y,z> --look <x,y,z> --eval dev/look/evals/world-census.ts --name census-<pose>-<before|after>`
with the cameras of `dev/look/evals/terrain-draws.ts:17-20` (green: cam 909,24.45,35 look 903,19.15,20; head: cam
1392,28,-170 look 1350,15,-128; ring: as that file builds it). Report frame time first; draws and triangles explain it.

- [x] **0. The census (dev).** New `dev/look/evals/world-census.ts`, extending `terrain-draws.ts`'s `renderer.backend.draw`
  wrapper: per completed frame, main and shadow draws and triangles grouped by object name and owner path; a scene walk
  listing every mesh with `frustumCulled = false` (name, instances, triangles, casts, in view or not); and, if
  `src/entity/inspect.ts` exposes per-kind update time, the ten costliest kinds over 5 s. Prints `WORLD CENSUS {...}`.
  *Done:* it runs at green, head and ring and the builder pastes the three summaries into section 2 of this plan,
  replacing "could not measure". *Check:* the eval runs at all three poses. *Proof:* the baseline pose reading itself.
- [x] **1. Real bounds on static batches.** Before → after (draws/triangles, main then shadow): green 252/728007 → 251/729199, 122/182370 → 141/188926; head 731/1237093 → 731/1237093, 106/163572 → 93/133532; ring 140/351107 → 92/240147, 119/163400 → 75/120820.
  The four yard batches and the 720-instance town site batch no longer draw at Ring. The town site batch and workshop shadow proxy are separate; both now fit their bounds. No fitted batch drew outside its pass camera in the three sampled frames. Moving trains vary between frames at green.
  [Before/after stills](../world/world-bounds/): no visible loss of static scenery at the edges. Mean frame interval, taken under load (20 s): head 18.384 → 19.476 ms; ring 25.053 → 16.681 ms. Use draw counts, not timing, as evidence.
  New `fitInstanceBounds(mesh, pad = 0.5)` in `src/render/instance-bounds.ts`
  (bounding sphere over the instances actually set, `frustumCulled = true`; recall it after each instance write).
  Apply it to the tree part batches (`place-tree-view.ts:180-183`; after a felled tree's matrices change too), the yard
  track batches (`yard-track.ts:208-217`), the station rails and stones (`stations.ts:156`, `:217`, `:227`), the
  pile batches (`sources.ts:261`, `:270`, on their existing change-only upload) and the workshop proxy
  (`workshop.ts:94`). Leave flights, carried loads, particles and the blobs alone. *Done:* none of these rows appears
  in the census when out of view, nor in the shadow pass beyond the ±36 m shadow camera. *Check:* stills at green, head
  and ring, before and after, show no difference to the eye, the screen edges included (`npm run look` with the
  census cameras). *Proof:* pose reading at head and ring: shadow and main draws, then frame time.
- [x] **2. One residency decision, telescope-aware.** Census before → after (draws/triangles, main then shadow, outside
  the telescope): green 251/731751 → 251/729199, 141/189582 → 143/188950; head 731/1237093 → 725/1234517, 95/132980 →
  62/120992; ring 93/239235 → 92/240147, 76/119908 → 75/120820. Every ground-tile and rail-kit row is identical at green
  and head; at head the differences are the moving train (engine, coach, flat rack, cargo fittings), at green unnamed
  `Scene/Group` mesh rows that also moved between step 1's frames. At ring the one rail-kit row reads 2/4560 or 1/5472
  from run to run on unchanged code (step 1's after on main was 1/5472, as here). Through the lookout telescope at 2x
  (fov 24°) the drawn ground tiles go 177,766 → 298,150 triangles and the track 182,352 → 217,712: finer, and the
  [stills](../world/world-residency/) show no coarsening. Spawn pose reading (20 s; load 5.3 → 7.2 before, 4.7 → 8.1
  after): CPU 15.923 → 15.711 ms (p95 20.765 → 19.865), GPU 16.095 → 15.999 ms (p95 19.969 → 19.786), 732 calls and
  1,059,580 triangles both times; two runs that reached 20 of 20 were discarded. On `resident()`: the classic zone, Ring
  Island's near-view mount and the greybox areas; Ring Island and the greybox still measure plain camera and body
  distance (no fov scale), as written. Add `resident(distance, was, near, far)` to `src/render/lod-level.ts`
  and `viewDistance(x, z)` (new `src/render/view-distance.ts`: horizontal camera distance × tan(fov/2) / tan(31°)).
  Move `classic-zone.ts:18-38`, `ring-island/index.ts:73` and `route-greybox/index.ts:47-56` onto `resident()` with
  their numbers unchanged (the greybox keeps the nearer of camera and body); make the ground tiles' pick
  (`far-ground.ts:79-83`) and the track's level (`look-kit.ts:386-392`) use `viewDistance`. *Done:* outside the
  telescope, counts at the three poses are identical before and after. *Check:* a still through the telescope at 2x
  (lookout) before and after: the zoomed ground and track are no coarser. *Proof:* census at green and head unchanged;
  pose reading at spawn unchanged within noise.
- **3. The townsfolk sleep away from the village: dropped (18 November).** The step as planned gated
  `folk.updateFolk(dt)` (`opening-view.ts:191`) on the village's distance, entering at 250 m and leaving at 300 m. The
  builder stopped before editing. `updateFolk` (`src/place/folk.ts:1370`) is one loop over every little guy, and it also
  poses the train riders and drivers on their seats wherever the trains run (`train-view.ts:1134`), the pushers on the
  cart and Ring Island's crew and Hooter (`src/entities/ring-folk/view.ts` moves them; `updateFolk` draws them), so a
  village-distance gate would freeze or misplace visible figures, and "no `updateFolk` at Ring Island" cannot hold. In
  the profile `pose()`, which runs only for figures within 150 m of the camera and in front of it, still runs at Far
  Head, 525 m from the village centre. The village's own figures already sleep one by one past 150 m from the camera
  (`folk.ts` `SLEEP = DRAW_WITHIN`, and the commuters' bands in `path-refuge.ts`): `brain()` costs 0.0 ms a second at
  far and 0.10 at head. All of `updateFolk` is about 0.026 ms a frame at 60 fps. Quiet baseline (Windows, 20 s,
  `--cpu-prof`; load 3.05 before and 4.58 after, of 20):

  | Pose | CPU ms | GPU ms (p95) | View updates ms/frame | `updateFolk` ms/s (of it `pose`) |
  | --- | ---: | ---: | ---: | ---: |
  | head | 16.316 | 17.748 (21.415) | 0.914 | 1.55 (0.75) |
  | far | 11.418 | 12.146 (17.018) | not read | 1.21 (0.80) |

- [x] **4. Place-bound railway views sleep.** Built 18 November as a redraw sleep, not an update sleep. `--cpu-prof`
  at spawn, far and head put the railway update at about 1.8 ms a frame. Its costliest place-bound sub-views all sit
  in `works-live.ts`: the railhead (`drawLive`, about 0.27 ms a frame), the roundhouse (0.16), the crossing's `draw`
  (0.11) and the Works (0.05-0.09). `line2-view.ts` (0.25-0.33) is another job's, as are the Works (`works-view.ts`,
  edited by the forge's rack move) and the halts' levers, which are spread along the line. Every candidate's `update`
  drives something else as well. The railhead's sets the hook ring (`deps.hookRing`), Ring Island's near-view
  residency (`ringIslandNear.keep`), its colliders and the traveller's cues on the shared clock. The crossing's plays
  the finale every page must see (banner, rockets, camera pull-out). So only the box-batch rebuild sleeps, through
  `createRedrawSleep` (new `src/render/view-sleep.ts`: `resident(viewDistance(centre), ...)` at 250 / 300 m past the
  place's own reach). Everything else runs every frame. Asleep, the batch is still redrawn while a bent rises, a
  footing goes down or the traveller runs, once more on the frame that movement stops (so a key that misses something
  a motion leaves behind, such as the haul's line and lamps, never strands its last moving frame; independent review,
  18 November), and when what the draw reads changes. A wake therefore has nothing to catch
  up on, and its first redraw is a plain draw of the current state: the `snap()` this step asked for is needed by no
  view slept here. Held still while asleep: the railhead windsock's flutter and the glow of the next bent's sockets,
  under a pixel at that distance. Railhead and crossing are slept. The roundhouse is left: its shunt runs on the rule
  clock and its garage view reads the deck's rest, so it needs its own idle test. *Proof*, quiet (Windows, 20 s; load
  2.55 → 2.41 before and 5.67 → 1.72 after, of 20; two runs that reached 20 of 20 were discarded):

  | Pose | CPU avg / p95 ms | GPU avg ms | railway update ms/frame | `works-live` update ms/s |
  | --- | ---: | ---: | ---: | ---: |
  | spawn | 15.389 / 19.385 → 14.205 / 16.320 | 15.693 → 15.084 | 2.058 → 1.656 | 34.95 → 14.65 |
  | far | 12.189 / 15.375 → 11.473 / 14.525 | 12.633 → 12.430 | 1.873 → 1.617 | 33.36 → 16.13 |
  | head | 16.612 / 21.255 → 16.184 / 20.390 | 17.919 → 17.644 | 1.905 → 1.557 | 43.61 → 25.79 |

  The `far` row is a camera pose (`cam`): `__debugCam` places the camera in lateUpdate, after the views, so the gate
  there read the player's camera at spawn, not the pose. Read `far` as a second spawn reading of the gate, not as the
  gate measured at Far Head. `head` puts the player there, so the gate reads Far Head. The railhead's `drawLive` reads
  0 ms at all three poses. The crossing's `draw` reads 0 at spawn and far; at head it stays awake (253 m from its
  centre, inside 250 m plus its 69 m reach) and in view. Calls and triangles are unchanged.
  [Wake stills](../world/world-view-sleep/): after a minute asleep at spawn (`asleep: true` for both), a teleport
  beside each. The railhead stands whole at rest (7 bents stood and decked, `lowering` 0, traveller still, windsock
  moving again), and so does the crossing (6 bents, 0 rising, no finale replayed). Not tested on a device.
  Plan as written: from step 0's per-kind costs, take at most the three costliest sub-views
  in `view.ts:565-627` whose work belongs to one place (likely candidates: the works, Far Head's posts and glows, the
  hook course, the sea gate; not the cart, trains, freight, arrival, reward or path, which follow the player or the
  shared state). Each gets a centre and a `resident()` gate, and a `snap()` that sets its visuals from the replica on
  wake, with no animation. *Done:* each slept view costs nothing at the far poses and looks identical after waking.
  *Check:* for each, one still on approach after a long absence (no stale animation, nothing replayed). *Proof:* pose
  reading with `--cpu-prof` at spawn and head.
- [ ] **5. Static matrices on static scenery.** Set `matrixAutoUpdate = false` (one `updateMatrix()` after placing),
  as `src/render/instances.ts:143` does, on the far-ground tile group (`far-ground.ts:128`), the track chunk batches
  (`lookTrack`), the sickle backdrop root, Ring Island's ground and static prefab placements under
  `src/prefab/instantiate.ts`. First grep each root for later `position`, `rotation` or `scale` writes and leave any that
  move. *Done:* `updateMatrixWorld`'s share of a CPU profile at spawn and head falls. *Check:* stills at the three poses
  unchanged; one moving thing near each root (a train past track, a door in the town) still moves. *Proof:* pose reading
  with `--cpu-prof` at spawn and head.
- [ ] **Checkpoint A (after step 5).** `npm run check`; the full pose reading at spawn, far and head on the Mac and on
  Windows, each with its load; "not tested on a device" unless `npm run device -- pull` has a report of a build with
  these steps. Update the owning game-design section only if a still showed a change (none is intended).
- [ ] **6. Far Head's draws.** Take the top three rows of the census at head that are many separate static meshes in
  one area and make each one instanced or merged batch per area with real bounds (research recommendation 8). One
  small job per row; name the row and its before and after count in the commit. *Done:* head's main draws fall by what
  the three rows held. *Check:* head stills unchanged. *Proof:* pose reading at head.
- [ ] **7. Cull the sea behind the camera (geometry only).** In `src/render/water/surface.ts`, order the grid's indices
  by azimuth (`buildGrid`, `:116`) and set a draw range each frame to the azimuths the camera can see plus a margin for
  displacement and wide fields of view; give the mesh no other change (its fragment graph is untouched). *Done:* the sea's
  triangles roughly halve at every pose. *Check:* stills at far, bay and pier, looking straight down, and turning
  quickly (a short `npm run clip`), show no missing water at any edge. *Proof:* pose reading
  `--poses far,bay,pier --rail-seed q6-done`: GPU ms and triangles.
- [ ] **Checkpoint B (after step 7).** As checkpoint A, plus the phone profile:
  `npm run bench -- --no-load --rail-seed ring-joined --poses spawn,far,head --seconds 20 --size 375x812 --query 'q=mobile&dev=1&graphics=msaa:false'`.
  Then the backlog row's next step is the owner's call on question 5.

**Not planned** (reasons above): server-side chunk streaming of shared state; streaming the main island's colliders;
chunking the trees; loading area views on demand (first load is 4.8 MB and inside its budget; frame cost is the
problem, research section 2).

**Level findings.** None: the plan places, moves or gates nothing in the world; `npm run level-check` does not apply.

## 5. Risks

- **Timing under load is not evidence.** Bench numbers count only on a quiet machine (`PERF_POLICY.quiet`: 1-minute
  load at most 6, no other harness Chromium). On Windows (HOTBOX, now the orchestrator machine) Node's `os.loadavg()`
  reads 0, so the quiet check cannot see load there: the builder confirms by hand that no other browser, bot or build
  runs and says so. GPU times vary about 10 % run to run; triangles and calls are exact.
- **Bounds too tight pop at the screen edge** where a shader moves vertices (sway, folk animation). Pad the sphere
  (`pad`) and check the edges in step 1's stills.
- **A slept view that tracks "what changed" to animate it** would play a stale animation on wake. Step 4's `snap()`
  is the guard; a view without one is not slept. Nothing here changes apply, receipts or what the server sends, so
  [room-safety](../agents/room-safety.md) is untouched.
- **Hotspots:** `src/entities/railway/view.ts`, `src/place/look-kit.ts` and `src/render/water/surface.ts` are edited
  often. `npm run inflight` showed nothing unmerged this week (17 November); re-run it before each step.
- **Safari**: JavaScriptCore paid twenty times V8 for one pattern before (research section 6); render CPU was the
  largest section in the owner's Safari session. No WebKit harness here, so Safari gains stay unmeasured until a device run.
- **The telescope** sees far places zoomed; step 2 covers LOD and residency, but anything slept in step 3 or 4 must be
  checked through it too.

## 6. Open questions for the owner

1. **Should the server send each client only the state near it (chunk streaming of shared state)?** Recommendation:
   not now. With one to three players on one railway the replicas are small and every client needs most of them;
   revisit when a measured join payload or tick cost says so.
2. **Is the sea's grid in this row?** Recommendation: yes, as step 7, geometry only (no change to how the water looks);
   the shading half of research recommendation 5 changes the look and stays your call.
3. **May far-away things stop moving while nobody is near (the townsfolk past 300 m, a place's machinery), resuming
   as they were rather than catching up?** Recommendation: yes; nothing a player can see freezes, and the telescope
   counts as near.
4. **Load areas on demand (download and build an area's views only near it)?** Recommendation: defer until a device
   run shows memory or load-time trouble; today frame cost, not loading, is the problem.
5. **When is the row done?** Recommendation: steps 0 to 7 shipped and checkpoint B's reading reported in frame time on
   the Mac, Windows and one device run once remote device tests land; no frame-time number gates it.

## Design review (2026-11-17)

Run by the planner on this plan (owner call "Fold roles into the builder", 16 November). Read: DESIGN.md headings,
owner calls (performance, frame-time-60, mac-mobile), the Look topic's current rules, the newest playtests, the
research above. The plan sets no costs, rules, rewards, pacing or copy; its gameplay calls are about what a player sees.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Culling and LOD changes ship only with matched stills at three poses showing no difference | Default | Precedent: far ground, research section 10; terrain practice owner call in [rendering](../agents/rendering.md#terrain-and-large-static-meshes-the-pattern) (11 November) |
| 2 | ~~Townsfolk stop updating past 300 m from the village (wake at 250 m)~~ | Default, no longer applies | Step 3 dropped on 18 November: the village figures already sleep one by one past 150 m, and the same loop draws riders, drivers and Ring Island's crew (step 3) |
| 3 | A slept view resumes from the current shared state and never replays what it missed | Default | Effects follow receipts (room-safety); open question 3 |
| 4 | Residency and LOD distances scale with the camera's field of view, so the telescope sees finer | Default | Playtest 3 November: "The telescope as a peek at what you can't reach yet" (best moments) |
| 5 | No gameplay is dropped or deferred for performance | Decided | [Performance guides, it doesn't gate](../agents/owner-calls.md#performance-guides-not-gates) (10 November) |

Counts: 1 Decided, 4 Default (3 since call 2 was dropped on 18 November), 0 New.

Findings, each folded into the steps:

- **The telescope.** The first draft measured distance from the camera only; at 2x zoom the lookout would show far
  places at the wrong detail or asleep. Changed step 2 (fov-scaled `viewDistance`) and added the telescope risk.
- **Sleeping must not mean vanishing.** Place-bound pieces such as Far Head's posts can be in view from far off (the
  head pose looks back along the trestle to the mainland); hiding them by distance would be a visible pop. Changed steps 3 and 4: sleep skips updates; meshes hide only out of the frustum or
  under a pixel.
- **Co-op.** A friend working at Far Head while you stand at the green: their work is in their view and the shared
  state; your client may sleep Far Head's views and wakes them from the replica as you approach. Remote players
  (`src/entities/remote-player/`) are never slept. Solo and co-op behave the same.
- Nothing ported from Place; no level layout changes; The Boogler's copy untouched.
