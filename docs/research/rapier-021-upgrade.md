# Rapier 0.21.0 upgrade assessment

3 November 2026. Owner-approved dependency upgrade; commit only, no shipping. Implementation: `ccf6ac27`, baseline: `75526a2a`. **Not behavior-equivalent: standing jumps and two bot glide beats regress.** No gameplay or solver constants were retuned, and reference traces were preserved.

## API and upstream changes

Both exact pins are `0.21.0`. The facade needed three adaptations: pass `world.bodies` to `NarrowPhase.contactPair`, fill a reusable vector with `manifold.normal(target)`, and read raw shape-cast TOI from `getComponents(buffer)[0]`. The buffer matches Rapier's own 16-float scratch buffer. No changes were needed in `main.ts`, boot timing, the crossing, or Node WASM loading.

Read local upstream snapshots in `/tmp/boogle-rapier-research`, including the rapier.js changelog, versioned JS notes, Rust changelogs/manifests and Parry changelogs. New JS bindings moved into the Rust repository: [0.20 JS notes](https://github.com/dimforge/rapier/blob/3e12c2679cb1940a876bde93af9cec0cf2f57944/typescript/CHANGELOG.md), [0.21 JS notes](https://github.com/dimforge/rapier/blob/b716d375efc0201003f0cd9ef7168eee0b62c177/bindings/typescript/CHANGELOG.md), [Rust changelog](https://github.com/dimforge/rapier/blob/b716d375efc0201003f0cd9ef7168eee0b62c177/CHANGELOG.md), [Parry 0.30.2](https://github.com/dimforge/parry/blob/v0.30.2/CHANGELOG.md), [Parry 0.31.1](https://github.com/dimforge/parry/blob/v0.31.1/CHANGELOG.md). These sources were inspected locally, not fetched by this job.

| JS | Rust Rapier | Compiled Parry, plain and SIMD WASM strings |
| --- | --- | --- |
| 0.19.3 | 0.30.1, also in WASM strings | 0.25.3 |
| 0.20.0 | 0.35.1 tag workspace; notes say 0.35.0 | 0.30.2 |
| 0.21.0 | 0.36.0 tag workspace | 0.31.1 |

The old source lockfile says Parry 0.25.2; the actual artifacts say 0.25.3. The newer artifacts use workspace paths without a Rust Rapier version, so those Rust versions are manifest evidence.

- **Breaking APIs:** 0.20 removes `minIslandSize`, makes friction/restitution accessors manifold-wide, and changes solver contact points to per-body anchor midpoints. 0.21 adds soft-body sets to low-level pipeline/removal/serialization calls; ordinary `World` methods supply them. Boogle does not use those low-level calls or save Rapier snapshots. Compat files moved into `dist/`; the two packages upgraded here are non-compat.
- **Solver, friction and ground:** persistent contact graph, clustering/recycling and cached angular Jacobians; prediction distance 0.002→0.02, allowed linear error 0.001→0.005, corrective velocity 10→3. Restitution moves to an end-of-step pass, restoring speculative-contact bounce. Boogle retains explicit `Multiply` friction/restitution. Its unchanged 0.005 touching filter is a plausible ground-detection investigation target, not a proven cause or a proposed retune.
- **CCD:** rewritten sweeps; fixed scenery now gets CCD even when the body flag is false. The flag adds dynamic/kinematic targets, so the crossing's downhill deck workaround remains meaningful but no longer disables all CCD. 0.36 fixes cached fixed targets and multiple-substep bookkeeping.
- **Sleeping/controller:** persistent islands; sleep threshold 0.4→0.05, delay 2→0.5 seconds. Boogle disables sleep on nonstatic bodies. Upstream fixes lateral KCC ground snapping, compound-character impulses and vehicle braking; Boogle's custom dynamic player and soapbox do not use those controllers.
- **Parry:** changes include touching/penetration classification, grazing casts, near-tangent normals, cylinder/cone caps and heightfield projection cost. New two-sided/internal-edge flags are not automatically enabled here.
- **Performance claims:** upstream describes near-zero broad-phase cost for huge mostly-static worlds and a particular 2,210-collider case improving about 90× stationary/18× moving. These are not Boogle results. The older 25% solver claim belongs to Rust 0.29, already in the baseline. Soft-body FEM ships in 0.21's npm builds; it plausibly contributes to size growth, but attribution was not measured.

## Measurements and loading

Same Mac, Node 24.11.1, existing `npm run sim -- drop`: five alternating old/new processes, 300 fixed steps each. The old run uses copied baseline facade/dependencies under `.look/baseline`; no new benchmark was added. These cold timings include facade work and JIT, not just the solver, and do not predict full-game FPS.

| Measurement | 0.19.3 | 0.21.0 |
| --- | ---: | ---: |
| SIMD WASM bytes | 1,622,757 | 3,292,228 |
| SIMD WASM gzip bytes, level 9 | 604,937 | 1,151,160 |
| Plain WASM bytes | 1,570,176 | 3,082,103 |
| Plain WASM gzip bytes, level 9 | 586,311 | 1,175,669 |
| Rapier JS chunk gzip, Vite kB | 30.71 | 51.53 |
| Static startup graph + SIMD gzip bytes | 1,273,201 | 1,840,230 |
| Drop median ms/step | 0.0623 | 0.1493 |
| 300-step times, ms | 13.9 / 19.9 / 15.9 / 19.7 / 18.7 | 44.1 / 56.8 / 42.4 / 50.9 / 44.8 |
| Drop resting height, m | 0.498 | 0.500 |
| Ball course sea height, m | 0.401 | 0.401 |

`npm run build` succeeded. Vite emits separate SIMD/plain chunks and WASM; SHA-256 matches each emitted WASM to its installed package. SIMD loads first, with the unchanged `ecacab11` catch-and-import fallback. A forced SIMD import failure in Node successfully loaded plain and passed the drop. Production browser startup passed; forced browser fallback was not exercised.

**Pre-existing precache gap:** both builds' service-worker `first` list omits the dynamic game chunk and both physics WASMs. The facade-based dynamic-chunk selector misses the generated main chunk. Runtime fetch caching still exists. The `counts` gzip algorithm therefore reports JS 5,777→5,778 bytes, WASM 0→0, CSS 1,040→1,040, other 94,032→94,032; its rounded values show no change. This is not the complete first load. The table's separate estimate follows static imports/assets of the page, game and SIMD chunks, excluding optional media. `npm run counts` itself was not run because it launches Chromium outside the mandated broker; its byte algorithm was reproduced from the built files. Logs/data: `.look/{old,new}-size-detail.json`, `new-build.log`, `alternating-drop.log`, `bundle-loading.json`, `plain-fallback.log`.

## Sync risk

Physics stays outside lockstep execution, but results reach saved state: `features/ball-rest.ts` submits integer-centimetre resting coordinates; `adapters/gifts.ts` submits raycast-derived landing coordinates. Rules apply the accepted facts without rerunning physics. The ball has one owner, remote kinematic ghosts and unchanged `b` snapshots; a mixed-build handoff can change subsequent trajectory. Thrown visual flights are recomputed locally and can differ before converging on the accepted landing item. Boogler poses are Host state; player contacts/riding remain local. Soapbox is Owner physics; wagon schedules drive kinematic platforms; crossing is Local. No wire/rule change or namespace bump is indicated. An in-memory server import graph contained 42 source files, zero physics files and zero Rapier imports. Actual old/new mixed rooms remain untested.

## Checks and inspected evidence

`npm run check` passed: lint, typecheck, 292 unit tests, registry, levels, assets and build. All 34 server tests passed. `check:full` then failed because `test:net` attempted a sandbox-forbidden Chromium launch. No check was disabled. Broker smoke, one-hand, interact, caves and shared-kinds all passed; interact also passed on baseline, so no frisbee failure was reproduced. Same-build smoke hashes agreed.

| Evidence manifests | Inspection and result |
| --- | --- |
| [Baseline interact](../../.look/evidence/1793775571618-23224/evidence.json), [new scenarios](../../.look/evidence/1793776385505-55031/evidence.json) | Opened new `one-hand/frisbee-motion.png`, `interact/riding-still.png`, `caves/hub-still.png`: frisbee travels away, ball grab prompt appears while riding, cave passages render. |
| [Old walk/jump](../../.look/evidence/1793775658045-28592/evidence.json), [new walk/jump](../../.look/evidence/1793776430252-56318/evidence.json) | Opened both motion sheets, new still and overlaid curves, plus consecutive video-frame sheets at 1.8 s. Two jumps clear/land on the walkway; curves nearly overlap: 9.5 m/s peak, 16.1–16.8 m height in both. |
| [Old ride](../../.look/evidence/1793775706920-29928/evidence.json), [new ride](../../.look/evidence/1793776453091-57098/evidence.json) | Opened both motion sheets: feet remain supported on moving flatbed, 20 m/s in both. Ride phase/camera distance differs, so absolute height is not a controlled comparison. |
| [Old ball](../../.look/evidence/1793775749301-30514/evidence.json), [new ball](../../.look/evidence/1793776466711-57832/evidence.json) | Opened both motion sheets and consecutive video frames at 1 s: visible arc/contact/rebound, no visible tunnelling. Boogler positions differ; these are not pixel-exact scenes. Headless flight differs by 0.079 m vertically at step 60; final rest moves about 1.1 cm. |
| [Baseline bot](../../.look/evidence/1793775761540-30632/evidence.json), [new bot](../../.look/evidence/1793776483870-58363/evidence.json), [repeat](../../.look/evidence/1793776766945-71656/evidence.json) | Read all reports; opened baseline and first-new end stills. Baseline passes; both new runs miss glide to (1168,-27), 152 m off, and balcony secret. Both reach the end, but fail expected-beat checks. Solo co-op marker is absent in all runs. |
| [Standing jump](../../.look/evidence/1793776898336-75591/evidence.json) | Opened motion sheet and curves: at (14,26), held jump never launches, vertical speed stays zero and grounded stays false. Headless held jump/hop also stay at 2.170 m; old course gains 1.55/0.66 m. |
| [Production startup](../../.look/evidence/1793776597296-64371/evidence.json) | Opened still: island renders. WebGPU advances with no graphics/page errors. |

`sim player`, `sim ball` and the golden replay pass baseline but differ after upgrade. Final replay first differs at frame 22 (`player.vx`, 0.058 m/s); worst is `player.vy`, 7.501 m/s. Old traces were not overwritten. Browser manifests record the implementation tree; subsequent changes are documentation only. Real-time feel/smoothness, devices, mixed-build handoff, full network harness and complete cold-load traffic remain unverified.

## Owner playtest and departures

Gut question: **Does starting a jump or glide reliably work after standing still?** Try the classic spawn hill at (14,26): stop, hold jump, then tap-hop; repeat while walking and over a crest. In Place, try the glide to (1168,-27) and the balcony secret. Then throw/steal the ball and check bounce/roll; ride the Boogler and the crossing flatbed downhill, then jump off. No tuning changes were made to hide the differences.

One network departure: the required `npm run inflight` internally fetched origin before its implementation was inspected. No further external network commands were used; packages installed offline from cached tarballs. Upstream material came from local snapshots. No push or ship was run. Screenshot uploads were omitted under the network restriction. Stop here for owner review/playtest.
