# Default-game draw capacity audit

> **Verdict:** Default-game draw capacity audit after the forge and place bounds.
> **Top recommendations:** none; audit table of draw capacities in the default game.
> **Status:** reference. See [freeze-instance-overflow](freeze-instance-overflow.md).

4 November 2026. This inventory records the production paths present at the start of the follow-up audit, after the forge and place bounds in `93b86aa6` and `e4a61305`. It complements [the original reconciliation investigation](freeze-instance-overflow.md); it does not replace that dated report. Browser evidence and any additional shared-render fixes belong below this inventory.

## Scope and method

Searched every constructor, `.count` assignment/increment, `instanceCount`, `setDrawRange`, `drawRange`, and custom count setter in `src/proto/place`; followed its shared box/heap imports into `src/proto/net`. `src/proto` has no nested AGENTS.md in this checkout. No direct geometry draw-range or `instanceCount` writes exist inside place. Counts of ordinary arrays, buffer vertices and gameplay stock are not GPU draw counts. Fixed instance counts remain the constructor capacity; hiding with zero matrices does not increase a count.

The table distinguishes the safety of current producers from arbitrary writes to a mesh's public `.count`. A producer bound cannot protect a later direct write that bypasses it. Capacities derived from a list are exact allocation expressions, not estimated maxima. Instance colors either allocate with the same maximum or are created by three.js from the matrix capacity.

## Place inventory

| Draw and source | Allocated instances | Why ordinary counts cannot exceed allocation |
| --- | --- | --- |
| [Forge rail rack](../../src/proto/place/forge.ts#L230) | `TUNE.rackMax = 24` | `drawRack` clamps to `instanceMatrix.count` before both the count assignment and write loop. |
| [Station log stock](../../src/proto/place/stations.ts#L142) | 56 per station | `drawStock` clamps to the matrix allocation; write loops and displayed-stock height use the bounded count. |
| [Station rail stock](../../src/proto/place/stations.ts#L144) | `max(1, spec0.rails)` | Same allocation clamp. Current Q1–Q6 allocations are 6, 12, 12, 16, 24, 32; T/F allocations are 1 even when their bill requests zero rails. |
| [Station stone stock](../../src/proto/place/stations.ts#L155) | `spec0.stone`, or no mesh | Same allocation clamp. T2 allocates 8. |
| [Greybox station rollers](../../src/proto/place/stations.ts#L92) | `round(SPAN / 0.3)` | Fixed constructor count; initialization loops below that count. The default kit rollers use the shared batch below. |
| [Depot rack logs and rails](../../src/proto/place/depot.ts#L29) | 48 logs, 40 rails | `drawRack` limits loops/counts with `min(capacity, stock)`. Positive over-counts are bounded. Negative/nonfinite requests are a separate gap below. |
| [Cart logs and rails](../../src/proto/place/depot.ts#L232) | `CART.load = 24`, `CART.rails = 16` | `drawLoad` clamps both counts to their matrix allocations before writes. |
| [Machine cradle and rail rack](../../src/proto/place/rail.ts#L485) | 40 logs, 12 rails | Cradle limits to 40 before writing/count assignment. Rail count is bounded to 0–12; its matrices are initialized only within 12 slots. |
| [Local carried rails and stone](../../src/proto/place/chop.ts#L75) | `PACK.carry = 16` each | `updateChop` clamps to matrix allocation. Warmup clones explicitly draw 1 instance. |
| [Peer carried rails and stone](../../src/proto/place/chop.ts#L153) | 16 each | Incoming values pass `count(value, MAX_WORN)` before entering `peerLoads`; only those validated values reach the cloned meshes. `count` requires a nonnegative integer no greater than the maximum. |
| [Flying logs, rails and stone](../../src/place/pieces.ts#L90) | 96 logs, 96 rails, 32 stones | Each per-kind write/increment checks its capacity. The final counts are those bounded counters. Excess trips still update and land. |
| [Dropped piles](../../src/proto/place/drop.ts#L24) | 64 of each of logs, rails and stone, across all piles | Each aggregate counter is checked against 64 before increment; the bounded counters go to `commitPieces`. |
| [Gift burst boards](../../src/proto/place/gifts.ts#L1115) | 14 | The packed counter increments only below `boards.instanceMatrix.count`; surplus flying pieces still simulate. Count resets to zero when the burst ends. |
| [Museum table bits](../../src/proto/place/museum.ts#L325) | 720 | `bit()` returns when `n_ >= MAX`; the draw count is this bounded counter. |
| [Folk heads, coats, limbs and held items](../../src/place/folk.ts#L22) | 53, 53, 212, 106 | `pose()` returns at `slot >= COUNT`; counts are `slot`, `slot`, `slot * 4`, `slot * 2`, matching allocations. This protects even a larger `guys` list. |
| [Path lamp posts and glows](../../src/proto/place/lamps.ts#L12) | 120 each | Both counters start at zero and increment together; `place()` returns when posts reach 120. No other count mutation exists. |
| [Survey stakes](../../src/proto/place/lines.ts#L52) | 80 per line | Construction loop includes `n < 80`; final count is `n`. |
| [Contact blobs](../../src/place/look.ts#L361) | 4096 | `addBlob()` returns −1 at capacity and is the only incrementer. `setBlob` ignores that rejected handle. |
| [Station kit parts](../../src/place/look-kit.ts#L248) | 64 per named part, 256 rollers | `stationPiece()` returns at the actual matrix capacity before increment/write. |
| [Station pictograms](../../src/place/look-kit.ts#L226) | 16 | Increment/write checks the actual matrix capacity. |
| [Machine and train kit wheels](../../src/place/look-kit.ts#L300) | 8 machine, 24 train | Every slot reservation checks actual matrix capacity before increment. Motion only updates reserved slots. |
| [Track kit parts and steel sleeper plates](../../src/place/look-kit.ts#L124) | Occurrences of each kind in `kinds` | The histogram determines allocation; route indices are counted from that same immutable list. Count stays at allocation. |
| [General kit batches and kit logs](../../src/place/look-kit.ts#L85) | `max(1, n)` matrices; kit-log colors `max` | Current callers above bound their dynamic counts. Every current `kitLogs(max)` call has `max >= 1`, so its color allocation matches its matrix allocation. |
| [Tree trunks, crowns, secondary crowns, stumps and notches](../../src/proto/place/chop.ts#L486) | `TREES.length` each | Catalogue is assembled before allocation; indices are assigned from the same complete list. Counts remain fixed; hidden pieces use zero matrices. |
| [Hardwood trunks, branches, cut ends, forks and broad foliage](../../src/proto/place/chop.ts#L487) | `H`, `H`, `H`, `2H`, `3H`, where `H = hardwoodIndices.size` | Fixed counts; the filtered catalogue supplies the indices and per-tree part multipliers. |
| [Rock lumps and bands](../../src/proto/place/chop.ts#L666) | 15 lumps, 3 bands | Three catalogue rocks × five lumps; pose loops and indices use those same dimensions. Counts stay fixed. |
| [World, shelf-stub and illuminated crystals](../../src/proto/place/crystals.ts#L24) | 7 each | World/stub counts stay fixed. Illuminated count clamps `found.length` to allocation, including duplicate restored indices. |
| [Buoys and buoy tops](../../src/proto/place/props.ts#L209) | `BUOYS.n = 12` each | Fixed constructor count; pose loop uses the same constant. |
| [Hook rings and posts](../../src/proto/place/tech.ts#L197) | `RINGS.length` each | Fixed count; initialization and updates enumerate the same ring list. |
| [Gate chain links](../../src/proto/place/tech.ts#L623) | `round(endpointDistance / 0.2)` | Same computed `n` allocates and bounds initialization; count stays fixed. |
| [Gate posts and lamps](../../src/proto/place/tech.ts#L679) | `POSTS.length = 14` each | Fixed count; initialization/update enumerate the same authored list. |

## Shared prototype draws reachable from place

| Draw and source | Allocated instances | Why ordinary counts cannot exceed allocation |
| --- | --- | --- |
| [Ground crate heaps](../../src/render/crates.ts#L28) | 150 across all heaps | `drawHeaps` returns from each iteration when the aggregate counter reaches 150; only accepted writes increment it. Matrix and color buffers share the allocation. Train-deck and flying crates in this file are individual ordinary meshes, not variable instance draws. |
| [Box-set parent](../../src/render/box-plan.ts#L28), reached through [makeSet](../../src/render/boxes.ts#L63) | `max(1, boxes.length)` | Place constructors leave this count fixed and hide pieces with zero matrices. Forge scaffold, `dropSet` track/build pieces, town static parts and the combined sites set all use this helper. The allocation is the completed box list, including all sites registered before `buildSites`. |
| [Tapered box children](../../src/render/box-plan.ts#L40) | `slots.length` for each taper | A custom parent count setter maps a prefix to a child count using `findIndex`, or the full slots length. That derived child count cannot exceed its allocation. The parent setter itself accepts arbitrary `next` without a bound: current place callers leave it fixed, but a direct caller can exceed the parent's allocation. |

No ordinary finite over-count remained in these place producers at the start of this audit. The unbounded generic `commitPieces` and other shared-render entry points require their own inventory and guard review; caller safety alone is not a guarantee for future callers.

## Invalid-number gaps versus ordinary count bounds

`Math.max(0, Math.min(capacity, value))` passes NaN through, and does not turn a fractional request into an integer. Depot rack and machine cradle use only `Math.min`, so they also do not reject negative requests. Those are distinct from a positive integer exceeding allocation. Current save and peer-count validators reject nonfinite, negative and fractional values before the documented paths, and no natural invalid-number path was established by this source audit. A final shared draw guard should normalize invalid requests as well as enforce allocation limits; forcing a raw mesh property should be reported separately from exercising a producer's existing bound.

This inventory contains no private recording or call transcript. No device or visual conclusion follows from source inspection alone.

## Shared render and eager entity inventory

The search also covered all of `src`, including eager feature/entity entries in `main.ts`. These are included even where place hides a classic-island feature. There are no `InstancedBufferGeometry.instanceCount` assignments or batched indirect draws in game source. Alternative prototype-only constructors (crossing, shore, era, water, soapbox, fall and haul) are outside the default route; their shared helpers are included here.

| Draw / setter | Allocation | Bound or finding |
| --- | --- | --- |
| `render/instances.ts` pools | caller's `max` | Both `push` and `pushMatrix` stop at `max`; `end` uses their counter. Fish: 36; gull bodies/wings: 7/14; shared blob shadows: 16. |
| `render/haul-pieces.ts` `pieceMesh` / `commitPieces` | caller's `max`, equal matrix/color capacities | `commitPieces` previously accepted arbitrary `n`. This is a shared unsafe boundary even though most callers bound their loops. |
| `adapters/piles.ts` | 160 × 12 = 1920 | Per-piece loop checks actual matrix capacity before every increment. |
| `features/log-sources.ts` | 64 × FULL(2) × PER_CHARGE(2) = 256 | Same capacity test, independent of source list/charge count. |
| `features/haul-stack.ts` pieces / bands | 9 × SHOWN(22) + 48 = 246 / 18 | Flying pieces stop at matrix capacity; bands check room for both writes. Avatar piece loop previously relied on the player budget rather than allocation: an oversized remote list can overflow the aggregate. Bound writes as well as the shared commit. |
| `features/work-sites.ts` sleepers | `ROUTE.length * 12` | Drawn stock fraction normally <=1; shared commit is the last allocation bound. No draw should depend on that state invariant. |
| `features/hut-build.ts` built / ghost | `ROUTE.length * HUT_BUILD.length` each | Views come from `ROUTE.map`; each blueprint piece contributes at most once to each mesh. Matrix/color capacities agree. |
| `features/track-machine.ts` sleepers / rails / wheels / load | `sum(LINES.n)` / `ROUTE.length * 2` / 6 / 4 | Sleeper loops bound by each line's `n`; two rails per line; six wheels fixed. Load count derives from remaining run fraction and uses `commitPieces`. |
| `proto/net/rails.ts` | `sum(LINES.n * 2)` | Two offsets per segment, each segment loop bounded by the same `l.n` used to allocate. Loaded only by its prototype, included as a shared-source cross-check. |
| `render/sprites.ts` / throw preview | 48 positions | Preview loop stops at 48, including its final ground-hit increment. Helper previously accepted arbitrary initial `count`. |
| Shared fireflies | 60 positions, 60 colors | Fixed count 60; same constant allocates both attributes and bounds the update loop. |
| `render/particles.ts` | 720 slots in every state/draw buffer; 256 spawn queue entries | Sprite draw fixed at 720. Compute dispatches exactly 720 and 256; emitter rejects queue entry 257 and wraps slot modulo 720. No particle count derives from unbounded emission volume. |
| `render/water/snow.ts` | 6000 seeds | Fixed draw count and seed array use `UNDER.snowCount`; no subsequent count setter. Opt-in water path, included conservatively. |
| `guest/model.ts` draw range | 6144 vertices in every attribute | Starts at `(0,0)`; updates use `(0,min(count,MAX_VERTS))`. No index buffer; three also intersects draw ranges with position allocation. Optional guest engine not exercised and no ROM assets read or added. |

Three's pinned `RenderObject.getDrawParameters()` clamps geometry ranges to the index/position allocation, but **does not clamp instance counts to instance attributes**. Its `max(0,object.count)` is not an allocation check. That distinction explains why an ordinary draw-range upper bound is not the rack's safety net.

## Changes and coverage

`render/draw-count.ts` guards assignments at shared factory boundaries: `pieceMesh`, `createPool`, `kitBatch`, `partMesh`, instanced sprites and the particle sprite. Forge and station batches get explicit identities, including their greybox fallbacks. Instanced meshes use the smaller of matrix/color capacities, read at assignment time; the two instanced-sprite callers have matching auxiliary allocations, and particles have 720 slots in every draw buffer. Invalid numbers become zero; fractional counts round down. `commitPieces` also bounds nonfactory callers and derives visibility from the accepted count. The haul-stack avatar loop now stops writing at allocation instead of relying on the room's player budget.

The helper preserves the box-plan prefix setter, so tapered children still receive their matching prefixes. It adds no render traversal, draw, simulation update or frame loop. Logical stock, allocations, accepted effects, timing and copy stay unchanged. These guards and diagnostic counters are **Local** state, never read by the simulation or sent to peers.

This is not a universal interception of every arbitrary `.count` overwrite: direct fixed/producer-bounded meshes in the inventory retain those proofs. Three clones do not copy property descriptors; a future clone of a guarded mesh needs its own guard. Existing carried-load clones come from separate direct meshes and retain validated counts. Buffers must not shrink without reassigning count. Matrix buffers receive names before upload; colors allocated later by kit logs may remain unnamed unless explicitly re-guarded (stations are). These limits do not leave a discovered ordinary default-game over-count unfixed.

## GPU error visibility and smallest safety net

Before this change, three's `device.onuncapturederror` forwarded to `renderer.onError`, which only logged to the console. Playdata retained a deduplicated 200-character console message. Neither callback names the JavaScript mesh, changes the page UI, throws out of the game loop, nor repairs a bad draw. The completed-frame counter is CPU submission, not successful presentation. A repeated invalid draw can invalidate whole command buffers while that counter remains near 60.

The added `draw count bounded` mark names the batch and object ID, requested count, capacity and accepted count, once per object and at most 32 objects per page. The added `gpu error` mark preserves API/type and more of the driver's message, at most eight distinct errors per page, while keeping three's original console errors and harness failures. The client bounds message capture to 2000 characters; the existing server sanitizer stores at most 300 characters per string. Running the captured marks through `cleanBatch` preserved the draw identity/count fields and the GPU count/buffer context (`.look/freeze-telemetry-cleaned.json`). No server/schema change was needed.

Even with named buffers, Chromium's observed validation message only named vertex slots, draw arguments and render contexts; it did **not** include the mesh label. A caught count now has reliable identity in its own mark. An unrelated GPU error still cannot always name the mesh. Recording the last submitted mesh would falsely attribute asynchronous errors, so this change does not do that.

The forced invalid rack held identical scene pixels for three seconds while callbacks continued, then rendering resumed when the fixture restored 24 at four seconds. Thus this Chromium count fault is persistent while the count stays wrong, not inherently irreversible after one bad submission. Grant's reported Safari freeze and other classes of invalid buffers/pipelines may persist differently; this test does not promise general recovery.

**Recommendation:** keep the bounds and invisible marks as the smallest safety net for tonight. Owner options, not implemented: a manual reload prompt after a graphics error; an automatic reload with a loop guard; or targeted renderer/pipeline recreation after identifying a recoverable error. A generic frame-counter watchdog would miss this freeze. Existing device-loss reload behavior in `scene.ts` is unchanged; validation errors do not invoke it. No new player-facing copy or automatic reload was added.

## Browser evidence

All browser work used the supplied broker against this worktree, based on local main `954af2e9`. No Chromium process was launched directly. The new fixture is `dev/look/evals/draw-overflow.ts`: `--action`, `drawTarget=rack|station|pieces|particles`, plus `expectBound=1` for passing captures. It requests capacity + 1 on real meshes (shared pieces use `commitPieces`), keeps normal frame updates running, and orbits the view. These raw count injections deliberately go beyond the existing producer clamps; station setup also exercises `drawStock` with 57 logs. `bypassDraw=1` deliberately removes the accessor only in the fixture; `releaseDraw=1` restores capacity at four seconds.

| Evidence manifest | Result and inspected artifacts |
| --- | --- |
| [Main before the new guard](../../.look/evidence/1793830028941-8031/evidence.json) | Expected failure: rack accepted 25/24, four distinct validation errors, completed frames 59.8/s after repair. Opened `rack-before-motion.png` and `frozen-01/02.png` extracted with ffmpeg. The motion-sheet scene pixels (excluding timestamp strips) at 0/1/2/3 s are exactly equal: zero changed channels. Video compression means extracted PNG hashes need not match. After repair the sheet changes. This used current main before this patch, not a checkout of the historical pre-93b86aa6 build. |
| [Guarded rack](../../.look/evidence/1793830190752-12740/evidence.json) | 25 requested, 24 accepted; named mark; no graphics errors. Opened `rack-after-motion.png` and consecutive `advancing-01/02.png`: the rail stack remains present as perspective changes. |
| [Guarded station](../../.look/evidence/1793830261714-14502/evidence.json) | 57 requested, 56 accepted; named F1-log mark; no graphics errors. Opened `station-after-motion.png` and consecutive `advancing-01/02.png`: the full stock pile and surrounding scene keep changing viewpoint. |
| [Guarded shared pieces](../../.look/evidence/1793830294169-15271/evidence.json) | 1921 requested, 1920 accepted; haul-pieces mark; no graphics errors. Opened `pieces-after-motion.png` and consecutive `advancing-01/02.png`: the staged log and scene render through the orbit. |
| [Guarded particles](../../.look/evidence/1793830310327-15598/evidence.json) | 721 requested, 720 accepted; particle mark; no graphics errors. Opened `particles-after-motion.png` and consecutive `advancing-01/02.png`: white particles appear/move and the scene changes viewpoint. |
| [Bypassed guard / GPU diagnostics](../../.look/evidence/1793830363335-16421/evidence.json) | Expected failure with four distinct GPU error marks, original console errors retained. Opened `gpu-error-motion.png` and consecutive `recovered-01/02.png`: the previous blue view is held until four-second repair, then the forge orbit resumes. Initial camera height was below the place plateau, so the held view is blue, not a usable rack composition; the recovered frames do show the forge. |
| [Existing forge reconciliation fixture](../../.look/evidence/1793830420599-18347/evidence.json) | All four accounting cases passed, no scene overflow or graphics errors. Opened `forge-reconcile-still.png`: the full rail rack is visible in front of the forge. |
| [world-inputs](../../.look/evidence/1793830392116-17830/evidence.json) | All seven assertions passed, no graphics errors; no PNG artifact produced. |
| [Baseline full bot](../../.look/evidence/1793829551834-97741/evidence.json) | Every expected beat passed; zero errors; 78 saves. Read `run/report.txt`, opened `run/end-still.png`: avatar and completed route render at the end. |
| [Final full bot](../../.look/evidence/1793830439721-18798/evidence.json) | Every expected beat passed; zero errors; 77 saves (no incidental tumble checkpoint). Read `run/report.txt`, opened `run/end-still.png`: same completed-route composition, avatar and HUD values; cosmetic colors differ. |

Passing draw captures, scenarios and final bot share tested tree `19de939cb736f7eaefbe40c0d1865c23962aa876`; no files changed during those runs. This report was completed afterward; runtime and fixture source stayed unchanged. Each manifest records its own source/harness provenance and command arguments. Real-time recordings were inspected as consecutive extracted frames and curves, not watched live: smoothness/feel remain unverified.

## Comparison, checks and departures

Ran the existing offline `node dev/look/playthrough.ts --compare <baseline/run> <final/run>`; `.look/freeze-compare.txt` retains the output. Required progression marks move by at most roughly 3 seconds, with identical counts, and objective durations by at most 2 seconds. Largest common ambient first-mark shift is 13 seconds (`rumour overheard`); resident count varies 5 to 6 and the incidental tumble is absent. These are within the harness's documented under-a-minute noise range. Final bot end is 1630.1 game seconds versus 1634.3 baseline; both end with 120 people, 280 logs and 0.90 km. No pacing or copy constant changed; randomized cosmetics and partial typewriter samples explain the on-screen text differences. Neither run marked the optional crystal/co-op beats; neither was an expected-beat failure.

`npx prettier --write` ran on changed files. Final `npm run check` passed: lint, TypeScript, **295 tests**, registry, level checks, assets and production build. `.look/freeze-check.txt` retains its output. Read-only peer review found no blocking issue in the count-accessor integration or error hook.

An initial `playthrough --name` was rejected by the broker before running; subsequent runs used broker-owned names. A redundant unchanged-code baseline [completed successfully in-game](../../.look/evidence/1793829771654-2152/evidence.json), but a concurrent audit-document edit invalidated its tree fingerprint, so it is not the acceptance baseline. The required `npm run inflight` unexpectedly fetched refs before its implementation was inspected: that departed from the user's local-only network restriction. No later external network access, push or ship occurred. All edits are in this worktree; commits name DESIGN.md principle **8. Designed for drop-in, drop-out**.

Unverified: Safari/phone behavior, the historical pre-fix build and exact co-op race under two real network peers, arbitrary GPU fault recovery, and real-time feel. No private recording or call text is included.
