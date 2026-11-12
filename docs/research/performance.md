# Performance: first report (6 November 2026)

> **Verdict:** Cache railway adapter reads per tick; first measured performance report.
> **Top recommendations:** 1. Cache the railway adapter's read once per tick (src/adapters/railway.ts; owner of the railway networking work). 2. Give the smoke a page CI can run, and keep it testing the current game. 3. Chunk and cull the committed track (src/proto/place/pieces.ts and the kit batches): split the rail and sleeper.
> **Status:** partly adopted. See [Process](../decisions.md#process).

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
   the biggest single win and also what makes two SwiftShader tabs in the smoke too slow. *Done* after R1a replaced the
   hashed lockstep read with the mirror: [section 6](#6-the-railway-update-in-safari-7-november-after-r1b).
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
  speed still holds about 40 fps. Raise or lower it in `PERF_POLICY.budget.frameMs`. _(10 November: the budgets here and in `PERF_POLICY` are reporting references, not gates on a feature; see the owner's [performance guides, it doesn't gate](../agents/owner-calls.md#performance-guides-not-gates) call.)_
- Not tested on a device.

## 6. The railway update in Safari (7 November, after R1b)

The owner's session of 6 November (desktop Safari on the M-series Mac, e439b72a, before R1b; `npm run playtest --
mw5y0cl1-wuu1cel4`) ranked `railway update` first at 5.3 ms a frame, before render CPU (4.5 ms) and `gifts update`
(1.8 ms); frames ran at 17 ms p50 and 25 ms p95, and adaptive resolution fell from 2x to 1.2x at 6 min and stayed.
Measured on main at 3889115d (R1b) and on this branch, on the M1 Max while other agents' browsers and builds shared it
(load average 11–51): read differences under ~0.05 ms per section or ~0.3 ms per frame as noise. Not tested on a device.

**Call trees** (Chrome DevTools sampling profiles, 200 µs, 5 s of real frames at the spawn, the forge, line two and the
timber camp, and mid-play with the production bot warped to carrying logs, a laying job and piles; Chromium only: the
harness has no WebKit, so Safari's engine was measured on its own, below). `railway update` is the railway entity's
update: every railway view, the back bundle and the prompts. On main, with the railway ready and asleep at the spawn,
it was 43 ms a second (71 carrying logs), of which **the adapter's `inspect()` was 16 ms** (32 carrying; `readState`
14, 10 of them its own copies), the two reward boxes 12 (each reads `inspect()` three or four times a frame, through
`completion()`), `setNumbers` 5, the townsfolk 5 and the line-one view 3. `inspect()` rebuilt the whole frozen read on every call: about twenty readers a frame (each
view, `backSeam.count`/`carry`/`remote`, the tools, the reward boxes, the interaction providers) each copied the six
per-tree lists (388 entries each) and spread about fifty fields twice. `rail.at(tick)` (every job's clock), the pile
and station views and the prediction were small beside it: the predicted state is already rebuilt only per packet or
action, and job clocks cost microseconds.

**Why Safari paid twenty times more.** JavaScriptCore freezes an array by moving it to slow storage: `Object.freeze` of
a 388-entry array costs 33–38 µs there (0.2 µs in V8), and reading a frozen array is about eight times slower. One
`inspect()` on a mid-play state (carrying, four piles) cost **200–375 µs in JavaScriptCore against 16 µs in V8**
(`jsc` from the system's JavaScriptCore on a bundle of the adapter tests' room; V8 is Node 26). Twenty reads a frame
are 4–7 ms: the owner's 5.3 ms. `gifts update` is the first hook to ask for the interaction prompt (`interactTarget()`,
shared for the frame), so it pays for every provider, the railway's tools and reward boxes among them, two to three
`inspect()` calls: the 1.8 ms.

**The nightly benchmark could not see the railway.** `isolated` harness pages (bench, perf) got their COOP/COEP headers
from a Playwright route that fulfilled the document. A document fulfilled that way cannot open WebSockets (a ten-line
page, a server sending the same headers, and the route: only the route fails), so since R1a the bench page's railway
room never connected ("the server did not answer"), and every nightly number measured the railway connecting. The page
now asks for isolation with `coi=1` and the dev server sends the headers. The not-connected read costs about the same
(0.36 ms on main either way), so the history stays comparable; the railway is now really there in the play pose.

**Fixed** (src/adapters/railway.ts, src/entities/railway/sources.ts and view.ts, src/proto/place/signs.ts; behaviour
unchanged: a temporary check that every cached read deep-equals a fresh one held through all 24 adapter tests):

- **One read per change.** The read is rebuilt only when the mirror applies a packet, the predicted state is rebuilt,
  the estimated tick moves (10 Hz) or a movement tunable changes; `inspect()` is the same object until a session field
  changes. Piles keep the same array while every pile is equal, so views can tell by identity.
- **No frozen per-tree lists.** They are copied, readonly to TypeScript, not frozen.
- **Pile batches upload only on change** (the piles, a flight into one landing or re-keyed, the racks), not every frame.
- **Chop prompts** walk the choppable trees with a box test instead of filtering all trees with an array per tree; line
  one's schedule and feed are recomputed only when a station's timing changes.
- **The money figure** is formatted and written to the DOM only when the whole-dollar value changes (it was
  `toLocaleString` and a `textContent` write every frame: the largest single cost left in the ready update).

| JavaScriptCore / V8, one `inspect()` (mid-play state) | main | this branch |
| --- | --- | --- |
| unchanged since the last read (19 of 20 reads a frame) | 200–375 µs / 16 µs | 0.5–0.9 µs / 0.4–0.6 µs |
| first read after a new tick (10 a second) | 210–420 µs / 14 µs | 20–34 µs / 12–22 µs |

`npm run bench` (the nightly's benchmark), main then this branch, both with the railway connected, ms per frame:

| pose | CPU | railway update | gifts update | room clock + replication | allocation KB/frame |
| --- | --- | --- | --- | --- | --- |
| spawn | 3.48 → 3.11 | 0.36 → 0.16 | 0.10 → 0.02 | 0.42 → 0.19 | 658 → 357 |
| town | 3.88 → 3.44 | 0.36 → 0.15 | 0.10 → 0.02 | 0.42 → 0.18 | 660 → 359 |
| forge | 3.72 → 3.35 | 0.34 → 0.16 | 0.10 → 0.02 | 0.40 → 0.20 | 662 → 350 |
| far | 4.25 → 3.99 | 0.29 → 0.17 | 0.08 → 0.02 | 0.34 → 0.20 | 688 → 385 |
| island | 3.87 → 3.60 | 0.31 → 0.17 | 0.08 → 0.02 | 0.36 → 0.20 | 660 → 357 |
| play | 3.48 → 3.20 | 0.28 → 0.16 | 0.08 → 0.02 | 0.36 → 0.22 | 663 → 352 |

`railway update` from the CPU profiles, main then this branch, in ms of main thread per second of real frames (about
120 frames a second; the bot warped to each state, the railway connected; one 5 s sample each):

| where | main | this branch | what was there |
| --- | --- | --- | --- |
| spawn, machine asleep | 42.8 | 16.3 | |
| the forge | 46.3 | 17.9 | |
| line two | 43.6 | 15.1 | |
| the timber camp | 44.8 | 15.0 | |
| carrying eight logs | 71.2 | 24.6 | main: `inspect()` 32, the reward boxes 24, `railCounts` 8 |
| T1 laying | 62.1, 49.5 | 21.9, 19.8 | this branch: the machine and panel rig (rail.ts, panel-view.ts) ~10 |
| piles (two or three, four logs) | 52.9 | 20.9 | |

In the nightly history this shows as `*.cpu.room-clock-replicationMs` falling by about 0.2 ms at every pose, `cpuMs` by
0.3–0.4 ms and `allocKBPerFrame` by about 300 KB (the job flags rises only). On Safari the same change removes the
4–7 ms the frozen copies cost; how much of the owner's 5.3 ms and 1.8 ms goes needs a Safari session on a device.

**Left** (none of them large in Chromium; their Safari cost is unmeasured):

- The townsfolk (`updateFolk`, src/proto/place/folk.ts, under the opening view): ~5 ms a second wherever the player is,
  4 of them `getWorldDirection`; a distance gate like #1114's would sleep them away from the village.
- The panel rack (src/entities/railway/panel-view.ts `frame`: `track.panels.slice(index).map(...)` every frame) and line
  two's per-frame `lineFeed` (line2-view.ts): left to the work on the track layer and the gantry under way.
- `sources.update` walks all 400 trees twice a frame (~2 ms a second): fine in V8; worth a dirty list if Safari shows it.
- Render CPU (C2 above), 4.5 ms in the owner's Safari session, is now the largest section.
- The nightly benchmark is Chromium only: a Safari number needs the owner's playtest page or a WebKit harness.

## 7. The phone tier's steps, measured (7 November, on main 9ad155b7)

`npm run bench -- --no-load --poses spawn,far,bay --seconds 4`, M1 Max, a busy machine (load average about 15), so differences under about 0.3 ms are noise. Each row is cumulative down the ladder. Desktop is 1280×800 at DPR 2 with the given `resolution`; phone is `--size 375x812 --query 'q=mobile&dev=1&graphics=msaa:false,…'`. Values are draw calls / triangles (thousands) / CPU ms / GPU ms at the **far** pose (spawn and bay move the same way).

| Step | Desktop | Phone |
| --- | --- | --- |
| Full detail, resolution 1 | 265 / 1,551 / 5.2 / 14.4 (noisy; default run: 3.9 / 11.8) | 235 / 1,532 / 3.8 / 8.0 |
| Resolution 0.6 | 265 / 1,551 / 4.0 / 10.0 | 235 / 1,532 / 3.7 / 7.8 |
| + Simpler sea | 265 / 1,266 / 3.9 / 9.4 | 235 / 1,247 / 3.7 / 7.9 |
| + No shadows | 217 / 1,178 / 3.5 / 9.1 | 187 / 1,159 / 3.1 / 7.5 |
| + MSAA off (desktop only) | 217 / 1,178 / 3.5 / 8.6 | — |

- **Resolution** is the big GPU step on desktop (about −1.5 to −4 ms). On the phone profile, which already renders small, it barely moves.
- **Simpler sea** removes about 285k triangles (a quarter of the frame) for −0.4 to −0.8 ms GPU.
- **No shadows** removes 48 draw calls and about 90k triangles: about −0.4 to −0.5 ms CPU and −0.3 to −0.5 ms GPU. It is the biggest CPU step on the phone profile.
- **The far settings** (`farSea`, `farGround`, off by default) show no measurable gain. `farGround` drops about 150k triangles at far and bay, but GPU time is within noise, sometimes higher. The desktop and phone stills (`dev/look/beats/far-detail.ts`) show no visible difference either. Recommendation: leave both off; revisit only if a device profile shows the far sea or ground as the bottleneck.
- Not measured: a real phone. These are desktop-browser emulations.

## 8. The pier and the resolution scaler (9 November, on main df7c8527)

The owner's Safari session of 9 November (mw9qd5qq, build 1b845f3b) dropped to 1.2x at the pier head and sat there four
minutes; loads hitched 442 ms. Measured in Chromium on the M1 Max at the owner's 2712×2110 (1356×1055 at DPR 2, MSAA 4),
`npm run bench -- --no-load --rail-seed q6-done --poses head,pier --size 1356x1055`, load average 3.5–6 unless noted.

| | 1b845f3b (playtest build) | main df7c8527 |
| --- | --- | --- |
| pier head, facing open sea: calls / triangles / CPU / GPU avg (p95) | 156 / 1.06 M / 5.1 / 30–34 ms (38–40) | 164 / 0.63 M / 3.8–4.8 / 8.0 ms (9.5–10.3) |
| Far Head: same | 187 / 1.14 M / 4.5 / 10.3–10.8 ms (14–15.5) | 198 / 0.72 M / 4.2–5.3 / 8.6–9.2 ms (9.6–10) |
| worst startup frame, fresh world / q6-done world | 240 / 207 ms (`ambience update` 26–31 ms CPU) | 51 ms / none over 50 ms |
| boarding line 2 at Home, worst frame from 3 s before to 6 s after | not run (old inspection API) | 16.8 ms (60 Hz page), no long frame |

- **The pier was the sea.** The water rebuild (one sea draw, 63a09db5 and before) took the pier from 30–34 ms of GPU to 8.
  At the pier on main, passes overlap (canvas ~4.5, shadow map ~4.3, scene ~3 ms per pass, 8 ms span); ablated, shadows
  off saves 0.3–0.7 ms, MSAA off 0.6, resolution 0.6 only 1–1.5: nothing left is fill-bound or one dominant pass. The
  village spawn (381 calls, 10.3 ms GPU) now costs more than the pier. The pier's draws are already instanced kits; no
  merging was worth doing.
- **The load hitch** was the ambience bake (618c412d moved it behind the loading screen) and pipelines on first use
  (b847532e). **Boarding** shows no hitch in Chromium. Both are unmeasured in Safari, which compiles pipelines more slowly.
- **The scaler.** 3235b933 (the same day) fixed Safari's four minutes. Watched live at 120 Hz (`bench --scaler`), it still
  failed: after the load, Chromium's rAF stamps jitter by about a millisecond, the median sat 1.11–1.19 x the 10th
  percentile against a 1.15 calm line, and it took 37 s to climb one step and never reached full in a minute. Calm now
  allows 2 ms of jitter: full resolution 26 s after the load ends, 5 s a step.
- `bench`'s first pose on a seeded world used to time the pipelines its own shadow toggle builds (4 frames in 5 s);
  it now waits 3 s after counting.
- Not tested on a device; Safari not measured.

## 9. The device runs of 10 November: a rise that did not reproduce (main 9d901f84e)

Two quick-suite runs on the owner's M5 Max in Safari, 3nmjkct8 (build 353d7a6bc, 19:39) and clqroru (9d901f84e, 23:03),
read 2.5–5 ms more CPU and 1.6–5.7 ms more GPU a frame in every scene. Bisected in Chromium on the M1 Max:
`npm run bench -- --root <git archive> --no-load --rail-seed q6-done --poses spawn,head --cpu-prof <prefix>` (1280x800,
DPR 2, MSAA 4), 2–5 runs a build, interleaved, at load averages of 14–49 (the machine was shared all evening). Medians:

| build | runs | spawn CPU / GPU ms | head CPU / GPU ms | calls spawn / head |
| --- | --- | --- | --- | --- |
| 353d7a6bc (the earlier device run) | 3 | 7.26 / 11.08 | 9.38 / 14.91 | 488 / 718 |
| 8ffdaf18c (before #1518, track chunks) | 2 | 7.25 / 10.80 | 9.52 / 14.89 | 488 / 718 |
| 744d0f4e0 (before #1520, cold start) | 2 | 6.98 / 10.73 | 9.63 / 15.02 | 505 / 746 |
| c7dc1271d (before #1529, lobby first) | 2 | 7.63 / 11.38 | 9.80 / 15.26 | 525 / 756 |
| 54b67ccc9 (after #1529) | 2 | 7.40 / 11.08 | 9.89 / 15.39 | 525 / 756 |
| 9d901f84e (the later device run) | 5 | 7.28 / 10.85 | 9.93 / 15.25 | 526 / 757 |

- **No step anywhere.** Spawn is flat; Far Head is +0.55 ms CPU and +0.3 ms GPU over the evening, with 5% more draw
  calls (the track's chunks, Ring Island's end, the forge). Run-to-run spread at these loads is about ±0.6 ms.
- **CPU profiles agree.** `renderer.render` inclusive per frame: 7.4–8.4 ms at Far Head on every build, 5.0–6.1 at
  spawn. The lobby-first patch of `_renderObjectDirect` (src/render/precompile.ts) costs 0.10–0.13 ms a frame of its own
  time once everything has been drawn (three WeakSet lookups a draw); total busy time a frame does not change.
- **The two device runs differ in more than the build.** Safari 27.0 in the first, 27.2 in the second (the session's user
  agent; the report printed "Safari 27" for both); a 1489x974 window (2978x1948 canvas) then a 1128x730 one (2030x1314);
  a measured refresh interval of 17 ms then 21 ms. The second drew 54% of the pixels and fewer triangles yet read more
  GPU time, which a heavier frame cannot explain; a browser update or a power or clock state can (at a 60 Hz cap Apple
  GPUs and CPUs run as slowly as the deadline allows, so ms a frame there is not work).
- The Windows run on f9ecb4749 (head 11.68 / 15.87 ms) has no earlier run on that machine to compare with.
- Not tested on a device. Safari's own frame cost was not measured here (no WebKit automation on this Mac).

## 10. The ground's draw, measured in triangles (11 November, on main 5b2896a5)

The Windows D3D12 run (960x600) had the Place ground as one 241,836-triangle draw (34% of the frame) from Ring Island, a
kilometre away. `farGround` (Chunked LOD tiles, `src/place/far-ground.ts`) already existed, off, and the Mac found no GPU
gain (section 7: the M1 Max is not triangle-bound). It is now on by default. `dev/look/evals/terrain-draws.ts` wraps
`renderer.backend.draw` and counts triangles and draws per completed frame at fixed poses (`--real`, 960x600, fov 62):

| pose | main tris before / after | main draws | shadow tris / draws (unchanged) |
| --- | --- | --- | --- |
| village green | 541,324 / 404,452 | 175 / 179 | 91,748 / 68 |
| Far Head (`--rail-seed ring-joined`) | 1,254,490 / 1,147,540 | 658 / 670 | 142,846 / 88 |
| Ring Island halt (same seed) | 590,502 / 381,514 | 102 / 102 | 150,110 / 102 |

At the green the ground's draw went from 241,836 to about 105k (the always-drawn offshore rings and cove are 32,848 of
that); at the Ring Island halt the main island's tiles are culled or coarse. Stills off and on at the same camera
(`.look/terrain-{green,head,ring,south}-{off,on}-still.png`): no cracks, coastline, ridgelines or shadows differ to the eye
(the `south` pair looks from the Ring Island pier at the main island). Mac frame time was not compared (load 3 to 15 from
other agents; section 7 says it would not show). Not tested on a device.

Left (expected win): the 32,848-triangle offshore ring/cove mesh is always drawn (about 30k, split by side); Ring
Island's own ground (199,960 triangles, one draw, `ring-island-ground`) wants the same tiles; `place kit rail` chunks are
about 31k triangles each and dozens draw at Far Head; trees are already instanced but one batch with
`frustumCulled = false`.
