# Performance: first report (6 November 2026)

What the current game costs on the owner's M1 Max, why the live smoke test has failed since bbc42281, what this branch
fixes, and what to do next. Measured with `npm run bench` (dev/look/bench.ts), which the daily perf job now runs every
night ([daily jobs](../../dev/daily/README.md), [test details](../agents/test-details/performance.md)), as the owner's
[Measure performance daily](../agents/owner-calls.md) call asks: each regression with its reasoning, a mitigation and,
where it repeats, a systemic optimization. Not tested on a device.

**Method.** One visible Chromium on the Mac GPU (Metal), the bare address (the current game), 1280x800 at DPR 2
(2560x1600 internal, MSAA 4, `?dpr=fixed`), 5 s of real frames per pose after the scene settles. Old commits were
measured as `git archive` checkouts served with their own game and server (`--root`). Triangles, draw calls, programs and
materials are exact. CPU and GPU times vary about 10 % between runs on this shared Mac (other agents' Vite servers and
builds still run while the bot queue holds the GPU), so a change under about 0.3 ms CPU or 1 ms GPU is noise here. CPU
profiles and allocation profiles came from Chrome's sampling profilers over 6 s at the spawn.

## 1. The regression

**The live smoke test did not catch a game regression: at #1095 it started testing a different, much heavier page.**
Until da5ce797 the smoke opened `?classic=1`, the classic home. #1095 removed the classic home and the smoke now opens
the current game (Place's world, the production railway and, since #1095, the classic island inside it). #1094, #1095
and #1096 deployed together, so bbc42281 was the first smoke run on the new page.

| page (on 456bd44e) | calls | triangles | programs | materials | shadow casters | CPU ms/frame | alloc/frame | heap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| classic home (`classic=1`, what the smoke used to open) | 138 | 222 k | 91 | 48 | 62 | 2.0 | 0.2 MB | 117 MB |
| current game (what the smoke opens now) | 173 | 902 k | 198 | 121 | 239 | 5.2 | 2.5 MB | 399 MB |

Four times the triangles, 2.6 times the main-thread CPU, twice the shader programs to compile and twelve times the
garbage, on two SwiftShader tabs on a two-core runner. The failing runs show it: Alice's "Jump in" took 6 s on
456bd44e and 45–50 s on bbc42281 and 20ceacb5, and Bob's page then could not answer a click within Playwright's 30 s
(`page.click: Timeout 30000ms exceeded`, waiting for `#enter`). The sync checks never ran.

**On the Mac the game itself did not get heavier across #1094–#1096.** Bench at the spawn and the far view:

| commit | change | calls | triangles | shadow calls | materials | CPU ms | room clock + railway CPU ms | GPU ms (far) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 456bd44e | last green smoke | 173 | 902 k | 35 | 121 | 5.2 | 1.08 | 15.0 |
| 4e0b1762 | #1094 room clock (60 Hz step) | 173 | 902 k | 35 | 121 | 4.8 | 1.08 | 14.8 |
| da5ce797 | #1095 classic island in the one world | 173 | 902 k | 35 | 121 | 4.7 | 1.09 | 14.6 |
| bbc42281 | #1096 gantry jaws | 172 | 907 k | 34 | 120 | 4.6 | 1.08 | 14.6 |
| 2d02bfdc | #1100 | 172 | 907 k | 34 | 120 | 4.8 | 1.10 | 14.7 |
| **edbfb052** | **#1101 line two in the default game** | **190** | **1 150 k** | **47** | 123 | 5.1 | 1.27 | 14.0 |
| 480a4533 | #1102–#1108 | 190 | 1 150 k | 47 | 123 | 5.1 | 1.27 | 14.2 |
| 20ceacb5 | #1109 Fresh palette | 190 | 1 150 k | 47 | **143** | 5.1 | 1.26 | 14.6 |
| 5890a65d | main today | 190 | 1 150 k | 47 | 143 | 5.6 | 1.45 | 16.3 |

(5890a65d's times are uniformly higher in every subsystem, physics included, while its counts equal 20ceacb5's: that run
was disturbed, not a regression; the A/B below remeasures it.)

- **#1094 (room clock).** No measurable client cost: the room-clock and railway rows stay at 1.08 ms per frame, and the
  60 Hz step does not show in the frame. Nothing to change in src/world/room-clock.ts or replicate*.ts for performance.
- **#1095 (classic island in the world).** The same counts at every pose, the classic island's close-up included: its
  meshes were already in the current game's scene, and #1095 removed the separate classic home entry. What it costs
  are systems that still run when nobody is near it, about 900 m from the Place spawn (the fish school, below).
- **#1101 (line two in the default game)** is the one step: +18 to +31 draw calls, +243 k to +275 k triangles (+27 %),
  +13 shadow calls, +28 shadow casters, +0.2 ms railway CPU. Most of the triangles are the committed track: 786 instanced
  rail pieces at 228 triangles each (179 k) plus their sleepers (75 k), drawn as a few instanced batches whose bounds
  span the whole line, so they are never culled.
- **#1109 (Fresh palette)** gave every palette mesh its own material clone: +20 materials and +3 programs for no visible
  difference. No measurable time on the Mac; fixed on this branch.

**What makes the phone slow** is not one commit but the current game's baseline, which the table shows was already
there on 456bd44e: about a million triangles, 190 draw calls, 2.5 MB of garbage per frame and a quarter of the main
thread spent hashing the railway (section 2). #1101 added a quarter more triangles on top.

## 2. Where the time goes (5890a65d, ranked)

### CPU, main thread (M1 Max: 5–6 ms per frame at 120 Hz)

| # | cost | measured | why |
| --- | --- | --- | --- |
| C1 | **Railway state hashed on every read.** `src/adapters/railway.ts` `readState()` sets `hash: sync.stateHashes().railway`, and `inspect()` calls `readState()`. About a dozen consumers call `inspect()` per frame (reward, tools, line-cargo, haul-stack, sources, line2-view, view). Each call hashes *every* registered state; the railway's hash is `JSON.stringify(serializeRailway())`, which base64-encodes the fall yaws (`encodeYaws`, `btoa(String.fromCharCode(...bytes))`). | 249 ms per second inclusive in `stateHashes` (25 % of the main thread); `encodeYaws` alone 147 ms/s. Allocation: `serializeRailway` 930 MB plus 893 MB of iterator garbage in 6 s, about 300 MB/s, nearly all of the 2.5 MB per frame. | A per-tick value recomputed per read. It already existed on 456bd44e (1.08 ms in the railway row); #1101 added consumers. |
| C2 | Render CPU (three's scene walk, uniforms, bind groups, 190 draws plus 47 shadow draws) | 1.6–2.2 ms/frame; `updateMatrixWorld` over the whole scene 25 ms/s | Every object's matrix is recomputed every frame, static or not; one draw per mesh. |
| C3 | Fish school on the classic island | 0.35–0.42 ms/frame (water-field samples: 35 ms/s) | 36 fish run boids and 2–6 water and ground samples each per frame ~900 m from the player. Fixed on main by #1114. |
| C4 | `gifts update` (src/adapters/gifts.ts) | 0.25–0.5 ms/frame | Classic island gifts update every frame wherever the player is. |
| C5 | Sea `lateUpdate` (queries, caustics, underwater) | 0.3 ms/frame | Needed; caustics re-render two small targets each frame. |
| C6 | Physics step | 0.3 ms/frame | Fine. |

### GPU (M1 Max at 2560x1600, MSAA 4)

7.6–8.2 ms at the spawn, 10–11 ms in town and at the forge, 14–16 ms in the far view: over one 120 Hz frame everywhere
but the spawn, inside 60 Hz except the far view. On a phone at DPR 2–3 the same work is several times slower.

| # | cost | measured | why |
| --- | --- | --- | --- |
| G1 | Sea surface | 387 k triangles every frame, never culled, `renderOrder -1` | A camera-centred polar grid (`GRID.angular` 384, src/render/water/tuning.ts) covering all 360°: more than half its vertices are behind the camera, and each runs the FFT and shore-wave displacement. GPU share: see the ablation below. |
| G2 | Place ground | 242 k triangles, one mesh, never culled | src/proto/place/land.ts builds the whole 1.4 x 1.2 km ground as one `frustumCulled = false` mesh at full density, far or near. |
| G3 | Track rails and sleepers | 254 k triangles (#1101) | 228-triangle rail pieces by the hundred, uncullable batches, no distant LOD. |
| G4 | Shadow pass | 47 calls, 89 k triangles; 266 casters | Every instanced batch casts; the shadow pass redraws them. |
| G5 | Pixels | 2560x1600 x MSAA 4 | `?dpr=fixed` here; adaptive resolution lowers this in play. |

Turning one part off at a time (one 4 s sample each, same page; the GPU span runs from the first pass's start to the
last pass's end, so at the spawn it includes gaps between passes and barely moves):

| part off | spawn GPU ms | far GPU ms | far triangles |
| --- | --- | --- | --- |
| nothing (baseline) | 7.9 | 15.3 | 1.56 M |
| sea surface | 7.3 | **8.4** (−6.9) | 1.18 M |
| Place ground | 7.6 | 11.2 (−4.2) | 1.32 M |
| rails and sleepers | 7.8 | 15.5 (0) | 1.31 M |
| sun shadow pass | 7.6 | 14.8 (−0.6) | 1.47 M |
| DPR 1 instead of 2 | 7.1 | **8.8** (−6.5) | 1.56 M |

The far view is fill-bound: the sea's shading over the visible water is nearly half of it, and the same view at a
quarter of the pixels costs about the same as removing the sea. The rails cost triangles but no measurable GPU time on
the Mac (they are tiny on screen); on phones and in SwiftShader, where vertices are expensive, they still count. The
shadow pass is cheap on the GPU but costs 46 draw calls of CPU.

### Memory and load

- JS heap 300–400 MB at play (the classic home: 117 MB); GPU memory three tracks: 367 MB, 300 MB of it textures (the
  shore atlas array textures, shadow map, render targets).
- First load (production build, `vite preview`, local, cold): 4.8 MB fetched, "Jump in" at 5.9 s on the Mac, 2.1 MB
  gzip in the first-load list; 4.6 MB gzip in all. Authored assets: 0.51 MB first, 0.71 MB in all, against 25 MB and
  100 MB. Loading is far inside its budget; frame cost is the problem.
- Largest file: Rapier's SIMD WASM, 3.1 MB (under the 4 MB per-asset budget).

## 3. Fixed on this branch (no change to the look on the Mac or to gameplay)

- **One palette clone per source material** (src/render/material-palette.ts): `paletteMaterial` now shares one clone per
  (material, family), reference-counted by its owners, instead of one per mesh. Same graph, same colours.
- **The fish (C3)** are handled on main by #1114 (src/island/classic-zone.ts: fish and gulls spawn within 160 m of the
  classic island and despawn past 190 m). This branch first measured an equivalent distance gate; the CPU column below
  is that gate's saving, which #1114 now gives main.

A/B on the same session, main (5890a65d) then this branch with the palette fix and the fish gate, one run each:

| pose | CPU ms before → after | view updates ms | materials | alloc KB/frame | GPU ms before → after |
| --- | --- | --- | --- | --- | --- |
| spawn | 5.07 → **4.59** (−9 %) | 1.76 → 1.29 | 143 → 123 | 2628 → 2280 | 7.9 → 7.8 |
| town | 5.53 → **5.07** | 1.72 → 1.30 | 143 → 123 | 2610 → 2286 | 10.1 → 9.8 |
| forge | 5.43 → **4.94** | 1.75 → 1.33 | 143 → 123 | 2585 → 2264 | 9.5 → 9.5 |
| far | 6.10 → **5.65** | 1.66 → 1.25 | 143 → 123 | 2634 → 2315 | 14.9 → 14.5 |
| play | 5.85 → 5.48 | 1.83 → 1.61 | 143 → 123 | 2691 → 2291 | 12.4 → 12.3 |

About 0.45 ms of main-thread CPU per frame and 0.33 MB of garbage per frame at every Place pose (the fish); 20 fewer
materials (the palette).
Draw calls, triangles and programs are unchanged (the palette clones shared their programs already). Cold first load
and bundle are unchanged (4.8 MB, 2.1 MB gzip first-load list). Both builds log the same two 404 console errors (a
missing resource on the dev server, not from this branch). Nothing visible changes on the Mac: the fish are invisible
from Place and the palette colours are the same constant ratio.

## 4. Recommendations

Numbered; each with its expected gain on the Mac (phones gain proportionally more) and its risk.

1. **Cache the railway adapter's read once per tick** (src/adapters/railway.ts; owner of the railway networking work).
   Make `readState()` return the same frozen object while `sync.world.tick` and the adapter's own status and pending
   counts are unchanged, or keep it per frame with `currentFrame()` from src/loop.ts. If a consumer needs `hash`, compute
   `stateHashes().railway` lazily (a getter) or once per tick, never in every `inspect()`. In `serializeRailway`, encode the
   fall yaws without the spread (`String.fromCharCode(...bytes)`) or cache the string by a falls revision. *Gain:* up to
   2 ms of CPU per frame (25 % of the main thread) and about 300 MB/s of garbage, which on a phone is GC pauses every
   few frames. *Risk:* low; a stale read must not survive a tick, snapshot or recovery (key the cache on those). This is
   the biggest single win and also what makes two SwiftShader tabs in the smoke too slow.
2. **Give the smoke a page CI can run, and keep it testing the current game.** After (1), rerun the smoke; if it still
   starves, open Bob first and Alice second (Bob's click comes before Alice's world is busy), or pass a low tier (11)
   to both. *Gain:* a green smoke that guards deploys again. *Risk:* none to the game.
3. **Chunk and cull the committed track** (src/proto/place/pieces.ts and the kit batches): split the rail and sleeper
   batches into spatial chunks of about 50 m, each with its own bounds, so the frustum drops what is behind or beside the
   camera, and stop distant chunks casting shadows. *Gain:* 100–200 k triangles and several shadow draws at most poses.
   *Risk:* low; more draw calls when the whole line is in view (a chunk count to tune).
4. **Sleep what is far away** (the pattern of #1114's classic-island zone, `whileNearClassicIsland`): systems tied to
   one place stop updating and drawing beyond a distance at which they are a few pixels. Next candidates: classic
   island gifts (C4) and props, Place's features while on the classic island. *Gain:* 0.3–0.8 ms CPU per frame. *Risk:* low; resume must be
   correct after a long sleep (cosmetic state only; lockstep state is never slept).
5. **Cheaper distant sea** (src/render/water/surface.ts). The far view's sea is 6.9 ms of fill: branch the fragment
   graph by distance so water past the shore-wave and foam range skips them (they fade there anyway), and rotate the
   polar grid with the camera's yaw so only the azimuths the frustum can see are drawn (a draw range over
   azimuth-ordered indices, with a margin for displacement). *Gain:* a few ms of GPU at far and town views; about half
   the sea's 387 k vertices everywhere. *Risk:* medium: any visible change at the fade distance is an owner call; wide
   FOV and looking straight down need the margin; verify with stills.
6. **Split the Place ground into tiles with bounds and coarser far tiles** (src/proto/place/land.ts). *Gain:* most of
   its 242 k triangles at views that see part of the world, and far-tile LOD everywhere. *Risk:* medium: seams between
   tiles and LOD levels must match exactly (owner call if any change is visible).
7. **Static matrices**: set `matrixAutoUpdate = false` (and `matrixWorldAutoUpdate`) on static scenery once placed,
   updating explicitly when moved. *Gain:* most of `updateMatrixWorld`'s 25 ms/s (about 0.2 ms per frame). *Risk:* low;
   a moved static object that forgets `updateMatrix()` stays put (one helper for placing scenery avoids it).
8. **Instancing and merging policy**: anything placed more than about ten times is one instanced batch per chunk; static
   meshes that share a material in one area are merged at build time; every batch has real bounds (no
   `frustumCulled = false` on kit batches unless it moves across the world). The scene census in each benchmark (meshes,
   instanced, materials, casters) tracks it. *Gain:* fewer draws and less render CPU (C2). *Risk:* low.
9. **Shadow-caster budget**: cast only from objects that are near enough for their shadow to read (a distance per
   caster class) and from nothing flat or tiny. Today 266 objects cast. *Gain:* shadow pass calls and triangles.
   *Risk:* low to medium; a missing shadow is visible, so set distances per class from stills.
10. **Material and pipeline count**: share materials across meshes (one per look, not per mesh), as the palette fix
    does; watch `materials` and `programs` in the daily comment. *Gain:* less render CPU, fewer shader compiles at load
    (load time on phones is dominated by compiling 200 programs). *Risk:* low.
11. **A mobile quality tier** (owner call): on phones or after adaptive resolution has bottomed out, lower the sea grid
    (`angular` 384 → 192, a quarter of the triangles), the shadow distance and caster set, MSAA 4 → 1 with the existing
    post, and the render cap. The graphics settings registry (`registerGraphics`) already owns the switches. *Gain:*
    large on phones. *Risk:* visible on phones by design; needs the owner's call and a device check.
12. **Per-frame allocation budget in the benchmark**: after (1), the allocation per frame should fall from 2.6 MB to
    tens of KB; make the daily job flag anything over 200 KB per frame (`PERF_POLICY`) and the hitches tool's 3.2 KB hook
    budget stays as is. *Gain:* keeps GC off phones. *Risk:* none.

## 5. For the owner

- Recommendation 11 (a mobile tier) changes what phones show: which of sea detail, shadows, MSAA or resolution to drop
  first is your call.
- Recommendations 5 and 6 should not change the look on the Mac, but seams and the sea's edge need your eye on stills
  before they ship.
- Recommendation 1 lives in the railway networking another agent is changing now; it should land there.
- Frame budget used by the daily job: 8.33 ms CPU and GPU per frame on the Mac (120 Hz), so a phone at a third of the
  speed still holds about 40 fps. Raise or lower it in `PERF_POLICY.budget.frameMs`.
- Not tested on a device.
