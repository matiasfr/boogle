# Rapier 0.21.0 upgrade assessment

Updated 4 November 2026. Owner-approved dependency upgrade; commit only, no shipping. Upgrade: `ccf6ac27`, baseline: `75526a2a`. **Standing jumps and both bot glide beats are fixed by restoring only the old prediction distance.** No jump, glide, movement or ball tuning changed. The game is still not behavior-equivalent: crest/swim and long ball-roll traces differ substantially, and warm island physics is slower. Reference traces remain untouched; this is not release approval.

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
- **Solver, friction and ground:** persistent contact graph, clustering/recycling and cached angular Jacobians; upstream prediction distance 0.002→0.02, allowed linear error 0.001→0.005, corrective velocity 10→3. Restitution moves to an end-of-step pass, restoring speculative-contact bounce. Boogle retains explicit `Multiply` friction/restitution. The follow-up below restores prediction only; allowed error, corrective velocity and the 0.005 touching filter remain unchanged.
- **CCD:** rewritten sweeps; fixed scenery now gets CCD even when the body flag is false. The flag adds dynamic/kinematic targets, so the crossing's downhill deck workaround remains meaningful but no longer disables all CCD. 0.36 fixes cached fixed targets and multiple-substep bookkeeping.
- **Sleeping/controller:** persistent islands; sleep threshold 0.4→0.05, delay 2→0.5 seconds. Boogle disables sleep on nonstatic bodies. Upstream fixes lateral KCC ground snapping, compound-character impulses and vehicle braking; Boogle's custom dynamic player and soapbox do not use those controllers.
- **Parry:** changes include touching/penetration classification, grazing casts, near-tangent normals, cylinder/cone caps and heightfield projection cost. New two-sided/internal-edge flags are not automatically enabled here.
- **Performance claims:** upstream describes near-zero broad-phase cost for huge mostly-static worlds and a particular 2,210-collider case improving about 90× stationary/18× moving. These are not Boogle results. The older 25% solver claim belongs to Rust 0.29, already in the baseline. Soft-body FEM ships in 0.21's npm builds; it plausibly contributes to size growth, but attribution was not measured.

## Contact cause and minimal fix

The lead hypothesis was partly right: `groundPlayer` received no touching contact and never refreshed coyote time. It was **not** an epsilon just above 0.005. Rapier recycles manifolds, so `contactDist` can retain the separation at generation while the body has already reached the surface. Headless probes use the existing real-island `dev/sim/world.ts`, 120 settling steps, the real two-sphere player, a terrain slope at (24,26), and a temporary flat box above spawn. Distances below are metres; `contactCollider` supplies an independent current-pose geometric comparison.

| Surface | 0.19.3 cached distance | 0.21 defaults cached / fresh | 0.21 with prediction 0.002 cached |
| --- | ---: | ---: | ---: |
| Classic spawn (14,26) | −0.001349 | +0.010354 / −0.000125 | −0.042433 |
| Slope (24,26) | about −0.00143 | +0.013257 / −0.000276 | about −0.039495 |
| Flat box | −0.001519 | +0.017752 / −0.000114 | −0.009553 |

Default 0.21 gave zero jump height on all three. Changing allowed error to 0.001 alone, or adding a 0.000001 filter epsilon, did not help. Restoring prediction to 0.002 restored grounding and jumping. Restoring allowed error as well produced **exactly the same 1,103-frame golden trace** as prediction alone, so it is left at its upstream value. The cached negative distances are not actual penetration depths.

A facade-only experiment reprojected cached local anchors, fixing standing jumps but still failing both glide beats. The [summit probe](../../.look/evidence/1793778374227-57513/evidence.json) showed a roughly 45 mm lift at a plank seam, a premature coyote expiry around x=1017.78, and grounded=true again when the bot tried opening the glider. It had not yet reached the real edge near x=1020.7. With the old prediction envelope, those seam lifts disappear, the edge departure is real, and the canopy stays open. [Diagnostic comparison](../../.look/evidence/1793778438217-59830/evidence.json), [final capture](../../.look/evidence/1793779187362-11870/evidence.json). The experimental reprojection and diagnostics were removed from source.

The final fix is one commented assignment in `backend-rapier.ts`: `normalizedPredictionDistance = 0.002`. It preserves the new solver, contact recycling, friction/restitution and CCD implementations. **It does relinquish the wider prediction margin's contribution to upstream thin-wall robustness**; upstream explicitly credits the changed contact defaults for that benefit. Cave hard-throw assertions pass, but that is not exhaustive CCD coverage.

All four `forEachContact` callers were audited: player grounding; mushroom bounce; Boogler riding; mini-hop bounce/count/finish. Raising the filter to 0.02 could trigger the last three early, so the numerical 0.005 filter stays unchanged. This restores the observed cases, not contact-distance freshness generally; retained negative distances could still delay separation recognition. There is no other Rapier contact-distance consumer. Deck carry independently tests feet gap −0.30…+0.15 m and relative vertical speed; fall-through recovery tests terrain height, not manifold distance. On the real turning crossing flatbed, [240 sampled fixed steps](../../.look/evidence/1793778648971-71045/evidence.json) were all grounded at 20 m/s: cached distances −0.000836…−0.000550, fresh distance about −0.000836. Raw diagnostic data: `.look/contact-variants.log`, `contact-fresh.log`, `final-contact.log`.

## Measurements and loading

Same Mac, Node 24.11.1, existing `npm run sim -- drop`: five alternating old/new processes, 300 fixed steps each. The old run uses copied baseline facade/dependencies under `.look/baseline`; no new benchmark was added. These cold timings include facade work and JIT, not just the solver, and do not predict full-game FPS.

| Measurement | 0.19.3 | 0.21.0 |
| --- | ---: | ---: |
| SIMD WASM bytes | 1,622,757 | 3,292,228 |
| SIMD WASM gzip bytes, level 9 | 604,937 | 1,151,160 |
| Plain WASM bytes | 1,570,176 | 3,082,103 |
| Plain WASM gzip bytes, level 9 | 586,311 | 1,175,669 |
| Rapier JS chunk gzip, Vite kB | 30.71 | 51.53 |
| Static startup graph + SIMD gzip bytes | 1,273,201 | 1,840,244 |
| Drop median ms/step | 0.0623 | 0.1493 |
| 300-step times, ms | 13.9 / 19.9 / 15.9 / 19.7 / 18.7 | 44.1 / 56.8 / 42.4 / 50.9 / 44.8 |
| Drop resting height, m | 0.498 | 0.500 |
| Ball course sea height, m | 0.401 | 0.401 |
| Warm real-island step median / p99, ms | 0.10 / 0.20 | 0.20 / 0.40 |
| Warm real-island step mean, ms | 0.1055 | 0.1740 |

**It is slower in the real game on this Mac.** The warm measurement uses the fully loaded classic browser island: 67 static bodies containing 1,113 colliders, the live player walking the same repeated 120-step path, all fixed physics hooks, and the facade's push/step/pull/interpolate work. Each run discards 600 warm-up steps, then measures 1,800 fixed steps. The existing broker `look --real --action` runs a temporary `.look/island-step.ts` eval; `perf --sim` measures lockstep, and frame-level hitches do not provide this isolated fixed-step distribution. No benchmark was added to the repository. Same eval, scene, Mac and browser; [old manifest](../../.look/evidence/1793778528806-63906/evidence.json), [final new manifest](../../.look/evidence/1793778712082-73383/evidence.json). Browser clock resolution is 0.1 ms, so median/p99 are coarse; the aggregate mean increases about 65%. These are physics CPU costs, not FPS. The old run loads copied 0.19.3 packages and the baseline facade through local paths; final runs use installed 0.21.0 SIMD with the compatibility setting.

`npm run build` succeeded. Vite emits separate SIMD/plain chunks and WASM; SHA-256 matches each emitted WASM to its installed package. SIMD loads first, with the unchanged `ecacab11` catch-and-import fallback. A forced SIMD import failure in Node successfully loaded plain and passed the drop. Production browser startup passed; forced browser fallback was not exercised.

**Pre-existing precache gap:** both builds' service-worker `first` list omits the dynamic game chunk and both physics WASMs. The facade-based dynamic-chunk selector misses the generated main chunk. Runtime fetch caching still exists. The final `counts` gzip algorithm reports JS 5,777→5,776 bytes, WASM 0→0, CSS 1,040→1,040, other 94,032→94,032; its rounded values show no change. This is not the complete first load. The table's separate estimate follows static imports/assets of the page, game and SIMD chunks, excluding optional media. `npm run counts` itself was not run because it launches Chromium outside the mandated broker; its byte algorithm was reproduced from the built files. Logs/data: `.look/{old,new,final}-size-detail.json`, `final-build.log`, `alternating-drop.log`, `bundle-loading.json`, `plain-fallback.log`.

The original +567,029 gzip bytes become **+567,043** after the compatibility setting: +546,223 (96.3%) SIMD WASM and +20,820 JS. **Zero bytes have been demonstrated avoidable with the stock packages.** Removing the lazy plain fallback saves zero successful-SIMD first-load bytes; switching to plain adds 24,509 gzip bytes. A custom WASM build excluding FEM is separate work with unknown savings. The precache gap is worth fixing separately now: follow the actual game chunk's import/asset closure and cache the selected physics variant, without eagerly fetching both large WASMs. That improves subsequent-start/offline reliability, not cold transfer size. No service-worker changes were made here.

## Sync risk

Physics stays outside lockstep execution, but results reach saved state: `features/ball-rest.ts` submits integer-centimetre resting coordinates; `adapters/gifts.ts` submits raycast-derived landing coordinates. Rules apply the accepted facts without rerunning physics. The ball has one owner, remote kinematic ghosts and unchanged `b` snapshots; a mixed-build handoff can change subsequent trajectory. Thrown visual flights are recomputed locally and can differ before converging on the accepted landing item. Boogler poses are Host state; player contacts/riding remain local. Soapbox is Owner physics; wagon schedules drive kinematic platforms; crossing is Local. No wire/rule change or namespace bump is indicated. An in-memory server import graph contained 42 source files, zero physics files and zero Rapier imports. Actual old/new mixed rooms remain untested.

## Checks and inspected evidence

Final `npm run check` passes: lint, typecheck, 292 tests, registry, levels, assets and build (`.look/final-check.log`). The earlier 34 server tests passed; `check:full` previously stopped at a sandbox-forbidden Chromium launch in `test:net`. Per the follow-up, the owner runs `check:full`; it is not retried here. All five final broker scenarios pass, including interact (the suspected unrelated frisbee failure was not reproduced). Same-build smoke hashes agree.

| Evidence manifests | Inspection and result |
| --- | --- |
| [Final scenarios](../../.look/evidence/1793778875015-81051/evidence.json) | Opened `one-hand/frisbee-motion.png`, `interact/riding-still.png`, `caves/hub-still.png`: riding prompt and passages render correctly. The wide frisbee sheet is too small for a detailed trajectory verdict; its 59.4 m travel assertion passes. Smoke, one-hand, interact, caves and shared-kinds all pass. |
| [Old standing jump/hop](../../.look/evidence/1793778590793-68506/evidence.json), [final standing jump/hop](../../.look/evidence/1793779050847-96712/evidence.json) | Opened both motion sheets, overlaid curves and new consecutive ascent frames. Both actions launch and land at (14,26); held arc is higher. Browser curves closely overlap (height about 2.17–3.87 m), with small timing differences. |
| [Old ride](../../.look/evidence/1793775706920-29928/evidence.json), [final ride](../../.look/evidence/1793779093683-81050/evidence.json) | Opened both motion sheets: feet stay on the turning flatbed, 20 m/s in both. Camera/route phase differs. Final curves never leave ground. |
| [Old ball](../../.look/evidence/1793775749301-30514/evidence.json), [final ball](../../.look/evidence/1793779074869-881/evidence.json) | Opened final motion sheet and both runs' consecutive video frames. Ball descends then rebounds without visible tunnelling; nearby Boogler motion limits exact bounce comparison. Ball capture curves track the player, not the ball; numeric ball comparisons come from `sim ball`. |
| [Baseline bot](../../.look/evidence/1793775761540-30632/evidence.json), [final bot](../../.look/evidence/1793778737151-75156/evidence.json) | Read reports and opened both end stills. Every expected beat passes, including glide to (1168,−27) and balcony: 77 m descent, about 24 s, 2 m from target. The solo co-op marker is absent in both. The preceding facade experiment [still failed both glides](../../.look/evidence/1793778075581-45451/evidence.json); that code was discarded. |
| [Final glide](../../.look/evidence/1793779187362-11870/evidence.json) | Opened motion sheet and curves: walk across summit, canopy deploys after the real edge and remains open; steady 10 m/s forward and about −3.2 m/s vertical. |

Baseline `sim player`, `sim ball` and golden replay were rerun and pass. Final 0.21 runs still fail their old numeric references: player has 30 differing fields; ball first differs at step 60, y=2.336 versus 2.415 m. Player semantic measurements: walk 5.652 (unchanged), sprint 9.599 versus 9.551 m/s, stop within 10 steps (unchanged), swim 3.079 m/s (unchanged), held jump 1.704 versus 1.55 m, hop 0.625 versus 0.66 m. The unchanged `shapeJump` selects different first-step gravity when resting vy is exactly zero versus slightly negative; no tuning was changed to conceal this. The browser standing arcs above are much closer than those headless course peaks.

| Remaining golden difference | Assessment |
| --- | --- |
| First difference: frame 52, player.vx +0.038 m/s; grab/throw position within 4 mm | Small solver drift; acceptable for this investigation. |
| Held and running jump sections: positions within 6 mm, vertical velocities matching; hop landing horizontal velocity differs up to 0.038 m/s | Jump eligibility is restored; small drift, unlike the original standing-jump failure. |
| Crest: y differs up to 0.209 m; vy up to 3.275 m/s | Not accepted as equivalent; owner must inspect crest/shore transition. |
| Swim: y differs up to 0.248 m; worst player.vy at frame 997 is −3.703 versus +3.677 m/s (7.380 difference) | Still a significant failure, not waved through as rounding. Water-entry/bobbing phases differ; the press at frame 993 occurs at a different phase. This is not evidence that the repaired standing jump still fails. |
| Ball: x differs by 7.535 m at frame 985; held-state sequence identical | Long-roll behavior is not accepted. Short isolated throw rests only 2.2 cm away: [7.068,2.179,14.671] versus [7.046,2.177,14.673]; sea height remains 0.401 m. |

No reference was regenerated. After acceptance, `dev/sim/player-browser.json`, `ball-browser.json`, and the golden browser recording plus `replays/golden.trace.json` need fresh browser/Node counterparts; do not simply bless these failures. Logs and observed rows are `.look/final-{old-player,old-ball,old-replay,sim-player,sim-ball,sim-replay,golden-detail}.log`, `final-golden-actual.json`, `final-ball-course.json`, and `fixed-player-course.json`. Final browser evidence records runtime tree `34e7a92154e6f6defea991d74d713c02b3e6e993`; subsequent edits are documentation only. Real-time feel/smoothness, devices, mixed-build handoff, full network harness and complete cold-load traffic remain unverified.

## Owner playtest and departures

Gut question: **Do the repaired takeoffs feel reliable, and are crest/swim and ball-roll differences acceptable?** At classic (14,26), stop, hold jump, then tap-hop; repeat on flat ground and slopes. Sprint over the spawn-side crest into the sea, bob, then jump out. Walk across summit planks and glide to (1168,−27), then repeat toward the balcony secret. Throw/steal the ball, watch long downhill rolls, and throw hard against cave/thin walls. Ride the Boogler and a turning/downhill flatbed, then jump off. The owner must also run `check:full`. No movement tuning changed to hide differences.

Earlier-turn departure: the required `npm run inflight` internally fetched origin before its implementation was inspected. This follow-up used no external network; it did not rerun inflight. Packages and upstream material came from local copies. Temporary diagnostics/evals stayed in `.look`; no new benchmark/test harness or gameplay tuning was committed. No push or ship was run. Screenshot uploads remain omitted under the network restriction. Stop for owner review/playtest; the significant trace failures remain unresolved.
