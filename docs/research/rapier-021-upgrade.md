# Rapier 0.21.0 upgrade assessment

Updated 4 November 2026. Owner-approved dependency upgrade; commit only, no shipping. Upgrade: `ccf6ac27`, baseline: `75526a2a`. **Standing takeoffs and both bot glide beats are fixed by restoring the old prediction distance; exact-zero launch classification now also restores the old held-jump/hop heights.** No jump, glide, movement or ball constants changed. Controlled swimming is identical; golden swim differences follow entry and buffered-jump phase. Ball rebound height/timing changes systematically, amplifying into an offshore path difference. Warm island physics is slower. Reference traces remain untouched; this is not release approval.

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

## Final follow-up: jump, swim and ball

### Exact-zero launch

The jump-height regression comes from the **new resting state, not the 0.002 prediction setting**. At (14,26), after 120 settling steps, old resting vy is −1.718e−9 m/s; new vy is exactly zero. `shapeJump` used falling gravity for the tiny negative old value, but apex gravity (held) or short-hop gravity (released) at zero, before the controller assigned launch velocity. Forcing old vy to zero reproduces the new heights. Forcing eligibility with the new upstream 0.02 prediction gives the same altered heights as 0.002.

The cause-level fix is `vy < 0 || (vy === 0 && jumpActive)` in `shapeJump`. `jumpActive` has just been cleared at nonpositive vy and set only for an eligible dry ground launch; zero idle/freefall, underwater and apex states keep their previous branches. This explicitly preserves the launch step's historical force, without inventing a velocity epsilon or changing a tuning constant. Changing the facade to fake a tiny downward velocity would affect unrelated consumers.

| Controlled launch | Old natural rest | New before fix | New final |
| --- | ---: | ---: | ---: |
| Held height, m | 1.55159450 | 1.70371890 | 1.55159426 |
| Hop height, m | about 0.663906 | 0.62543559 | 0.66390562 |
| First post-step vy, held / hop, m/s | 7.08882 / 7.08882 | 7.44876 / 6.84886 | 7.08882 / 7.08882 |
| First shaping force, held / hop, N | −882 / −882 | +630 / −1890 | −882 / −882 |

These are full-step headless maxima; the course's five-step samples report 1.550 and 0.664 m. Old browser runs that already rested at exactly zero could show the taller arc too: this removes the solver-sign dependency and restores the recorded course intent, rather than claiming every old browser arc was 1.55 m. Diagnostic evidence: `.look/jump-followup-{old,current,default,final}.log`.

### Swimming is the same law, with different entry and input phase

Using the existing real-island/player simulation, both versions start at (−176,0.2,0) with zero velocity over deep water. All sampled position, velocity, surface and swimming states are **exactly equal** for 60 s idle, 30 s forward swimming, and a 60 s run with a 13-step held water jump at 10 s. This includes the final launch-condition fix. No swimming code or constants changed.

| Controlled measurement | Both versions |
| --- | ---: |
| Steady bob period (20–60 s) | 34 fixed steps = 0.566667 s |
| Centre-y trough / crest | −0.478076 / −0.340614 m |
| Peak-to-peak / half amplitude | 0.137463 / 0.068731 m |
| Water surface height / vertical velocity | 0 m / 0 m/s |
| Forward speed, steady minimum / maximum / mean | 3.079487 / 4.010379 / 3.178596 m/s |
| Water-jump first post-step vy / apex y above surface | 4.353240 m/s / +0.146931 m |

Forward speed briefly rises when the bob crosses the swimming threshold, identically in both versions. The jump returns to the same equilibrium cycle. This tests the default classic water field, not the separate `water=new` FFT opt-in.

The golden first enters swimming at frame 897 old versus 896 new. Its press at frame 993 is buffered until an underwater step: launch is frame 995 old versus 998 new. Therefore frame 997 compares old upward motion (+3.677) with new downward motion (−3.703), not failed buoyancy. Jump peaks are frame 1009, y=+0.215 m versus frame 1012, y=+0.182 m: 3 frames later and 3.3 cm lower because it starts at a different depth/phase. Extending the replay 120 seconds yields the same steady period and amplitude, with new lagging by 5 steps (0.083333 s). First-30-second y RMSE falls from 0.04337 m to 0.00920 m after phase alignment; the initial entry/jump transient is not a perfect rigid phase translation. **The swim law is unchanged; the route's entry and buffered input differ.** Evidence: `.look/swim-{idle,forward,jump}-{old,final}.json`, `swim-golden-{old,final}.json`.

### Ball: stable roll, changed bounce, amplified shore trajectory

Controlled comparisons use the existing headless island and actual ball hooks/material, no player, a raised flat or tilted box with matching ground probe, 6 m/s pure initial roll, 60 Hz for 60 s. Distances are accumulated horizontal x travel; stopping means speed below 0.05 m/s for 60 consecutive steps, reported at the start of that interval. No game tuning or sleep setting was changed.

| Controlled measurement | Old | New final |
| --- | ---: | ---: |
| Flat travel / stopping time | 3.980209 m / 2.0167 s | 3.981939 m / 2.0167 s |
| 0.025-radian downhill, travel / speed at 60 s | 6.211429 m / 0.031608 m/s | 6.215167 m / 0.031637 m/s |
| 0.08-radian downhill, travel / speed at 60 s | 48.436275 m / 0.752077 m/s | 48.494785 m / 0.752863 m/s |
| 5 m drop, first rebound clearance above plane | 1.373730 m | 1.273595 m |
| First rebound outgoing vy | 7.229943 m/s | 7.229943 m/s |
| Drop stopping time | 2.6333 s | 2.3500 s |

The shallow slope crosses the 0.05 m/s stopping threshold at 2.5333 s in both, but keeps creeping at about 0.0316 m/s; the steeper slope never reaches that threshold in either version during the 60 s window. **No meaningful systematic extra flat-roll distance or later stop was found.** There is a systematic 10.0 cm (7.3%) lower first rebound and earlier settling. At the first post-impact step the bottom clearance is −0.02079 m old versus −0.12093 m new despite equal outgoing vy. That is a response-pose/integration difference consistent with upstream's end-of-step restitution change, not evidence of a lower material restitution coefficient.

The game's rolling drag still multiplies horizontal velocity and spin by `1 − k*dt`, with k=1.2 above 0.5 m/s and k=10 below, while within `BALL_R + 0.08` of ground. Angular damping remains 0.3. Disabling rolling drag only gives flat travel 35.022911→35.053871 m and stop 27.950→27.967 s. Disabling angular damping only gives 4.236886→4.238441 m and 2.1333 s in both. These diagnostic ablations do not explain a multi-metre roll discrepancy. **Sleep was already disabled in both versions**, and neither sleeps in these runs; creep is not newly caused by disabled sleep.

The golden's 7.535 m x gap at frame 985 was previously mislabeled a long roll. Its first material divergence is the terrain bounce at frame 193: new y is about 10.4 cm lower, which keeps it inside the rolling-drag band for another step. The next bounce reaches different heightfield features. Separation exceeds 0.5 m at frame 280 and 3 m at 351; by frame 400 both balls are floating above submerged terrain, and at 985 the bed is about 7 m below sea level. **A systematic bounce difference is amplified by terrain, the drag threshold and spatial shore drift.** This is not proof of nondeterministic chaos, or a systematically longer roll. The short throw's 2.2 cm resting gap therefore does not bound this trajectory.

No demonstrated stock setting restores the old bounce while retaining the fixes. Diagnostic-only allowed error 0.001 and `maxCcdSubsteps=0` leave the new bounce unchanged; 8 solver iterations raise the apex only to 1.291257 m and add work. None was applied. Do not compensate with restitution, damping or sleep. Evidence: `.look/ball-followup-{runs,variants,trace}.log` and `ball-followup-{old,new}-*.json`.

## Measurements and loading

Size and performance figures in this section were measured on the prediction-fix predecessor `ce1532ad`, before the final launch-condition edit; byte counts were not remeasured for that small source change. Same Mac, Node 24.11.1, existing `npm run sim -- drop`: five alternating old/new processes, 300 fixed steps each. The old run uses copied baseline facade/dependencies under `.look/baseline`; no new benchmark was added. These cold timings include facade work and JIT, not just the solver, and do not predict full-game FPS.

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

The owner reports `check:full` passing on predecessor `ce1532ad`, including 23/23 network checks. This is owner-provided evidence, not a rerun after the final launch condition. Final local `npm run check` passes lint, typecheck, all 292 tests, registries, levels, assets and build (`.look/last-check.log`); the sandbox-blocked network harness is not retried here. All five broker scenarios passed on the prediction-fix predecessor, including interact (the suspected unrelated frisbee failure was not reproduced). Same-build smoke hashes agree.

| Evidence manifests | Inspection and result |
| --- | --- |
| [Final scenarios](../../.look/evidence/1793778875015-81051/evidence.json) | Opened `one-hand/frisbee-motion.png`, `interact/riding-still.png`, `caves/hub-still.png`: riding prompt and passages render correctly. The wide frisbee sheet is too small for a detailed trajectory verdict; its 59.4 m travel assertion passes. Smoke, one-hand, interact, caves and shared-kinds all pass. |
| [Old standing jump/hop](../../.look/evidence/1793778590793-68506/evidence.json), [final standing jump/hop](../../.look/evidence/1793779050847-96712/evidence.json) | Opened both motion sheets, overlaid curves and new consecutive ascent frames. Both actions launch and land at (14,26); held arc is higher. Browser curves closely overlap (height about 2.17–3.87 m), with small timing differences. |
| [Old ride](../../.look/evidence/1793775706920-29928/evidence.json), [final ride](../../.look/evidence/1793779093683-81050/evidence.json) | Opened both motion sheets: feet stay on the turning flatbed, 20 m/s in both. Camera/route phase differs. Final curves never leave ground. |
| [Old ball](../../.look/evidence/1793775749301-30514/evidence.json), [final ball](../../.look/evidence/1793779074869-881/evidence.json) | Opened final motion sheet and both runs' consecutive video frames. Ball descends then rebounds without visible tunnelling; nearby Boogler motion limits exact bounce comparison. Ball capture curves track the player, not the ball; numeric ball comparisons come from `sim ball`. |
| [Baseline bot](../../.look/evidence/1793775761540-30632/evidence.json), [final bot](../../.look/evidence/1793778737151-75156/evidence.json) | Read reports and opened both end stills. Every expected beat passes, including glide to (1168,−27) and balcony: 77 m descent, about 24 s, 2 m from target. The solo co-op marker is absent in both. The preceding facade experiment [still failed both glides](../../.look/evidence/1793778075581-45451/evidence.json); that code was discarded. |
| [Final glide](../../.look/evidence/1793779187362-11870/evidence.json) | Opened motion sheet and curves: walk across summit, canopy deploys after the real edge and remains open; steady 10 m/s forward and about −3.2 m/s vertical. |

After the final source edit, `sim player` has **15 differing fields, down from 30**: small walk/sprint speed differences, up to 0.027 m sprint height drift, and about 0.024 m stop-height drift. Held jump/hop and swim differences are gone. Walk is 5.652 m/s, sprint 9.599 versus 9.551 m/s, stop within 10 steps in both, swim 3.079 m/s. `sim ball` still first differs at step 60, y=2.336 versus 2.415 m. Golden replay still first differs at frame 52, player.vx +0.038 m/s, and worst ball.x differs 7.535 m at frame 985. Old references remain unchanged, so these checks still fail; the underlying cause is characterized, not hidden by rebaselining.

| Golden section / reference | Final recommendation |
| --- | --- |
| Player walk/sprint/stop; `dev/sim/player-browser.json` | Regenerate after the owner's crest/ground-motion playtest. The small course drift is acceptable for the upgrade; held/hop heights are restored. Capture the browser counterpart and compare Node, rather than replacing expectations with Node output. |
| Golden held/running jumps | Positions within 6 mm, matching vertical velocities; retain behavior, no separate retune/reference required. |
| Golden crest | y difference up to 0.209 m, vy up to 3.275 m/s; inspect this ground-to-water transition before accepting the combined replay. |
| Golden swim | Same dynamics; accept the measured entry/buffer phase shift. The 7.380 m/s same-frame discrepancy is explained, not an altered swim law. No independent swim retune or new reference needed. |
| `dev/sim/ball-browser.json` | **Do not regenerate yet.** Owner must accept lower bounce height and earlier settling; then recapture paired browser/Node evidence. |
| `dev/sim/replays/golden.json` and `golden.trace.json` | **Do not regenerate yet.** Hold for crest and ball-bounce acceptance. Then record the browser session and its Node trace together; retain held-state/authority assertions. |

Fresh evidence after the final launch-condition edit:

| Manifest | Images actually opened and verdict |
| --- | --- |
| [Standing jump/hop](../../.look/evidence/1793781127120-51759/evidence.json) | Opened motion sheet, overlaid curves and six consecutive video ascent frames. Both launches and landings are visible; held arc is higher than hop. Curves show the intended shorter held arc versus the previous erroneous 1.704 m run. |
| [Water jump](../../.look/evidence/1793781142772-52397/evidence.json) | Opened motion sheet, curves and six consecutive ascent frames. Consecutive frames show emergence above water; curves show a jump, return and decaying transient to steady bobbing. The wide sheet alone undersamples the jump and cannot establish its height. |
| [Full playthrough](../../.look/evidence/1793781168820-51756/evidence.json) | Read report and opened end still. All expected beats pass, including glide to (1168,−27) and balcony; no errors. Solo co-op marker remains absent; bot reports 4m44s stationary and 3s pushing stalls, not failed expected beats. End still shows the player supported on the platform but the bot log overlay obstructs much of the view. |

Runtime tree for these three captures is `4df75f36439cf74bbc3cd91e451d40391db74f21`; later edits are documentation only. Numeric checks: `.look/last-{sim-player,sim-ball,sim-replay,course-summary}.log`, `last-golden-actual.json`. The five scenarios above passed before this final launch-only change; the full playthrough and targeted launches were rerun afterward. Real-time feel/smoothness, devices, mixed-build handoff, opt-in FFT water, full network harness after this final condition and complete cold-load traffic remain unverified.

## Owner playtest and departures

Gut question: **Do the restored jumps feel right, and are the crest transition and lower ball bounces acceptable?** At classic (14,26), stop, hold jump, then tap-hop; repeat on flat ground and slopes. Sprint over the spawn-side crest into the sea, bob, then jump out. Walk across summit planks and glide to (1168,−27), then repeat toward the balcony secret. Throw/steal the ball, watch long downhill rolls, and throw hard against cave/thin walls. Ride the Boogler and a turning/downhill flatbed, then jump off. The owner already reports `check:full` passing before the launch-condition follow-up. No movement tuning changed to hide differences.

Earlier-turn departure: the required `npm run inflight` internally fetched origin before its implementation was inspected. This follow-up used no external network; it did not rerun inflight. Packages and upstream material came from local copies. Temporary diagnostics/evals stayed in `.look`; no new benchmark/test harness or gameplay tuning was committed. No push or ship was run. Screenshot uploads remain omitted under the network restriction. Stop for owner review/playtest; numeric reference mismatches remain intentionally unblessed, with their measured causes and regeneration gates above.
