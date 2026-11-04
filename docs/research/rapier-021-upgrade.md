# Rapier 0.21.0 upgrade assessment

Updated 4 November 2026. **Owner decision: 0.21 is final; seek 0.19 feel parity, with recorded retuning allowed. No fallback, push or ship.** Upgrade: `ccf6ac27`; old baseline: `75526a2a`. This round is **partial**: held/hop heights, acceleration, stopping, controlled swimming and rolling meet their gates; ball rebounds, crest motion and the stair proxy do not. Current-pose grounding removes an old airborne double-jump exploit. The 2 mm prediction override remains necessary for the tested plank/glide behavior. One conservative heightfield corner support miss remains. References are unchanged because full parity has not been achieved.

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
- **Solver, friction and ground:** persistent contact graph, clustering/recycling and cached angular Jacobians; upstream prediction distance 0.002→0.02, allowed linear error 0.001→0.005, corrective velocity 10→3. Restitution moves to an end-of-step pass, restoring speculative-contact bounce. Boogle retains explicit `Multiply` friction/restitution. Prediction stays at 0.002; allowed error and corrective velocity stay upstream. The stale 0.005 touching filter is now removed.
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

### Ground options, in the owner's preference order

| Option | Measured result | Decision |
| --- | --- | --- |
| 1. Stock 20 mm prediction, solver-contact count or positive impulse; no distance cutoff | Spawn/slope resting contacts can have zero solver contacts and zero reported impulse. Standing jump height stays zero. Flat box works. | Reject these signals as grounding tests. |
| 1b. Stock prediction, fresh actual overlap/contact normal | Standing jumps work, but the summit seam interrupts glide. Full bot misses (1168,−27) by 151 m. Sprint braking displacement 0.669440 versus old 0.547571 m (+22.3%). | Reject stock prediction for feel parity. |
| 2. Stock prediction, wider 20 mm cached-distance cutoff | Standing launches work; the first rising step refreshes ground at **+0.12135 m** above the floor. | Reject false airborne support. |
| 3. Previous 2 mm prediction + 5 mm cutoff | Standing/glide beats work, but stale contacts also refresh coyote after takeoff. | Retain prediction only; replace stale contact test. |

The retained implementation queries `contactCollider(..., 0)` at current poses and emits its normal first. Convex pairs need nothing else. A mesh/heightfield can contain a deeper wall contact and a simultaneous floor: a single normal loses that floor (25/60 missing frames in one fixture). Secondary manifolds therefore reproject local anchors and validate each candidate feature with a ray ending **on** the body's current anchor. Its 1 mm origin offset grants no positive separation allowance. Pair overlap alone is insufficient: a floor edge and wall in the same collider previously produced false support. Reprojection alone extends a finite face past its edge. Both guards are needed in the tested cases. Buffers/callbacks are reused; game normal/coyote rules remain unchanged.

The 2 mm assignment preserves the new solver, restitution and CCD implementations, but relinquishes the wider prediction margin's contribution to upstream thin-wall robustness. Tests found zero player tunnels through 2/20 mm walls at 5.6, 9.5, 40 and 100 m/s (eight cases), and zero ball tunnels through a 50 mm wall at 60 m/s in either version. This is finite coverage, not a universal CCD guarantee.

Across 36 flat falling probes (starting gaps 1 mm…5 m, initial vy 0, −0.1, −1 and −20 m/s), the largest first-ground gap is −0.000133 m old and −0.00000877 m new: neither is above ground. Old launch contacts renew coyote at +0.121 m; new contacts do not renew it while ascending. Second presses at 1,2,3,4,5,6,8,12,20,30 steps are rejected by the base controller. Old presses at steps 1–6 could reach vy 13.298 m/s and height 5.607 m; final stays at vy 7.088818 and height 1.551594 m. The Place's explicitly earned second-jump ability is separate and still passes the bot.

Coyote still accepts at ages 1–5 fixed steps (through 0.083333 s), rejecting at 0.1 s. Actual support ends one step sooner than stale support at a ledge. Deck boarding no longer grants coyote across its geometric catch gap: only actual walkable contact does. Four moving-deck probes (flat/up/down/turn) retain 120/120 support frames, no new airborne grounding, and at most 0.329 mm foot slip. Straight/diagonal finite edges, same-collider edge+wall and wall-only fixtures produce no false floor support.

**Remaining limitation:** a synthetic heightfield with a 5 m rise over 1 m misses valid floor support beside a steep wall at a grid boundary. A ray at z≈−1.93e−16 returns null despite 0.182 mm penetration; nearby z=0 and ±1e−6 hit. Support/coyote persists for 35/60 frames, not 60/60. Reverse rays and sphere support-point substitution did not fix it and were removed. The test is conservative (missing support), not airborne grounding. Thus no option has passed every requested ground edge case; this is the best verified candidate, not complete parity.

All four `forEachContact` consumers were checked: player ground; mushroom bounce; Boogler riding; mini-hop bounce/count/finish. Their broker scenarios pass. There are no other `touching()` or manifold-distance consumers. Deck geometric carry and terrain fall-through recovery remain separate. Soapbox uses rays and its card is retired/cut, so “if live” does not apply. Final actual-source evidence: `.look/parity-release-contact-summary.{md,json}`, `.look/parity-release-movement-summary.{md,json}`; option probes `.look/ground-parity-*.json`, activation probes `.look/ground-activation-{old,final}.json`. The stock failure was visually inspected in [glide](../../.look/evidence/1793782146691-89566/evidence.json) and [bot](../../.look/evidence/1793782216116-89526/evidence.json).

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

The owner now permits restitution tuning, but **no tested scalar meets the 3% requirement across drop heights and subsequent bounces**. Hard 5 m needs more bounce while hard 1 m already rebounds 5.5% too high. Restitution 0.57 makes the 5 m first rebound 1.376111 m (+0.17%), but its second is +5.92%, fourth −21.48%, and the 1 m first becomes +13.64%. At 0.575, later/terrain bounces still fail. Multiply and Min are equal against neutral ground; Average/Max also break zero-restitution player/Boogler contact. No harmful one-case fit was landed: ball restitution remains 0.55, Multiply, friction 0.6, angular damping 0.3, existing rolling drag, sleep disabled as before.

| Drop / rebound | Old, m | Final, m | Owner limit | Result |
| --- | ---: | ---: | --- | --- |
| Hard 5 m, first | 1.373730 | 1.273595 | ±3% | −7.29%, fail |
| Hard 5 m, second | 0.382336 | 0.310536 | ±3% | −18.78%, fail |
| Hard 5 m, third | 0.112859 | 0.071652 | ±3% | −36.51%, fail |
| Hard 5 m, fourth | 0.034985 | 0.011700 | ±3% | −66.56%, fail |
| Hard 1 m, first | 0.263585 | 0.278081 | ±3% | +5.50%, fail |
| Hard 1 m, second / third | 0.079465 / 0.023419 | 0.054044 / 0.009000 | ±3% each | fail |
| Terrain 5 m, first | 1.382499 | 1.274453 | ±3% | −7.82%, fail |
| Terrain 5 m, second | 0.408897 | 0.675205 | ±3% | +65.13%, fail |
| Terrain 5 m, third / fourth | 0.117678 / 0.039577 | 0.215675 / 0.060714 | ±3% each | fail |
| Flat roll distance | 3.980209 | 3.981939 | ±2% | +0.043%, pass |
| 0.025 rad slope roll, 60 s | 6.211429 | 6.215167 | proposed ±2% | +0.060%, pass |
| 0.08 rad slope roll, 60 s | 48.436275 | 48.494785 | proposed ±2% | +0.121%, pass |

Terrain first impacts have identical incoming states but a triangle-edge normal approximately (0.653,0.757,0). Outgoing vx changes 3.44683→4.73769 m/s; next landing x changes 16.715→17.504 m. No repeated upward restitution while ascending was observed. This is an altered side impulse followed by different contact geometry. `FIX_INTERNAL_EDGES` removes the kick, confirming the cause, but changes the old terrain behavior and still fails hard-surface rebound parity.

Other diagnostic-only failures: stock 20 mm prediction, allowed error 0.001, CCD substeps 2/4, solver iterations 1/8, internal PGS 4, contact natural frequency 15/60, contact skin 0.02/0.05, soft CCD 0.05/0.2, and true 2×/4× world substeps. Substepping adds work and still fails later/low bounces. No stock setting has been demonstrated to restore all targets. Exact settings, sequences and raw files: `.look/ball-parity-report.md`, `ball-parity-{grid,surfaces,knobs,substeps,softccd,interactions}.log`, `ball-parity-deep-{old,new}.json`. Achieving this remaining target needs more than the requested single material-coefficient retune; it remains unfinished, not owner-accepted.

## Movement and interaction parity gates

Same inputs, fixed 60 Hz, real player/ball hooks and island, old/current facade and packages. Owner limits are ±2% jump heights/flat roll and ±3% each rebound. Other limits below are **proposed engineering gates**, not owner acceptance. Full per-step summaries: `.look/parity-release-movement-summary.{md,json}` and `.look/parity-release-contact-summary.{md,json}`. The lighthouse proxy copies 90 actual ramp boxes, rails and tower above the island; the final browser capture separately checks the real staircase.

| Measurement | Old | Final | Limit / verdict |
| --- | ---: | ---: | --- |
| Held / hop height, m | 1.551594 / 0.663906 | 1.551594 / 0.663906 | 1.55 / 0.66 ±2%, pass |
| Held / hop apex time, s | 0.483333 / 0.166667 | same | ±1 fixed step, pass |
| Held / hop airtime, s | 0.833333 / 0.400000 | 0.816667 / 0.383333 | ±1 fixed step, pass |
| Coyote accepted age, s | through 0.083333, not 0.1 | same | unchanged, pass |
| Flat walk / sprint speed, m/s | 5.599067 / 9.498417 | same | ±2%, pass |
| Spawn walk / sprint mean, m/s | 5.634061 / 9.503897 | 5.634506 / 9.507138 | ±2%, pass |
| Spawn walk / sprint time to 90%, s | 0.083333 / 0.133333 | same | ±1 fixed step, pass |
| Spawn walk / sprint distance to 90%, m | 0.287755 / 0.699160 | 0.287742 / 0.699165 | ±2%, pass |
| Flat walk / sprint braking distance, m | 0.178764 / 0.565979 | same | ±2%, pass |
| Spawn sprint after 90 steps: stop path, m | 0.570979 | 0.569198 | ±2%, pass |
| Same stop: displacement at 1 s / stop time | 0.586182 m / 0.15 s | 0.582615 m / 0.15 s | ±2% / ±1 step, pass |
| Spawn sprint after 120 steps: displacement / stop time | 0.547571 m / 0.133333 s | 0.553604 m / 0.15 s | ±2% / ±1 step, pass |
| ±0.08 / ±0.25 rad ramp steady speed | walk 5.5224…5.7292; sprint 9.4217…9.6285 m/s | within 0.000001 m/s | ±2%, pass |
| Lighthouse proxy mean speed / travel | 2.660860 m/s / 26.917074 m | 2.606047 / 26.291234 | ±2%; −2.06% / −2.325%, fail |
| Lighthouse proxy max upward vy | 1.587716 m/s | 1.800407 | ±0.2 m/s; +0.21269, fail |
| Golden crest worst y / vy differences | baseline | 0.209 m / 3.275 m/s | ±0.05 m / ±0.2 m/s, fail |
| Four deck profiles: supported frames | 120/120 | 120/120 | all; pass |
| Flat/up/down foot slip; turning max | 0; sub-mm | 0; 0.329 mm | proposed ≤1 mm, pass |
| Flat-deck jump rise | 1.432610 m | 1.432610 m | ±2%, pass |
| Carried horizontal speed after launch | 3→2.1 m/s from false grounding/skid | retains 3 m/s | intended inertia preserved; bug fix |
| Player body vx 1 s after ball impact | 0.151169 m/s | 0.149703 m/s | proposed ±2%, −0.97%, pass |
| Ball x 1 s after player impact | 1.135257 m | 1.155962 m | proposed ≤3 cm, +2.07 cm, pass |
| Boogler-shape ball resting boundary | 0.750377 m | 0.750002 m | proposed ≤1 cm, pass |
| 80 thrown-item landing comparisons | baseline | max 18.680 µm; 0 changed shared outcomes | unchanged cell/height/lost outcome, pass |

The reported sprint 9.551→9.599 was five-step sampling aliasing: every-step maxima are **9.608736 old / 9.598931 new**, and last-second means differ only +0.034%. The controller's target remains 9.5. No speed retune is warranted. Fresh-pair-first ordering fixes the real stopping discrepancy; lowering ground snap was rejected because it cuts steep uphill speed by 6.1%.

**Only added gameplay constant:** `LAUNCH_STEER_TIME = 0.1`, commented at its definition. Old stale contacts accidentally supplied six steps of ground acceleration after takeoff. The separate timer preserves that takeoff steering without granting another jump. Golden running-jump positions/velocities at frames 561–568 return to the old values. Jump force, glide, swim, speed, snap, friction and ball constants are unchanged. The previous exact-zero `shapeJump` cause fix stays. A temporary water-input workaround was removed after fresh contact ordering restored the original buffered jump.

Boogler walking is covered by Host/shared-kinds and the side-view ride/jump capture. The Boogler has no ball catch/steal mechanic in source: he collides with it; players steal a held ball. One-hand checks giving him a frisbee. Old isolated Boogler-ball penetration reached x=0.94607 before correcting to 0.75; new CCD limits it to 0.75393. No old-feature parity promise is made for a nonexistent catch. The 80 flight probes cover ordinary/frisbee paths over terrain/props; cave routing and hard throws are covered by the browser scenario, not those headless landing comparisons.

## Measurements and loading

Size and drop figures below were measured on prediction-fix predecessor `ce1532ad`; byte counts were not remeasured for the contact/steering edits. Warm island timing was rerun on the final runtime tree. Same Mac, Node 24.11.1, existing `npm run sim -- drop`: five alternating old/new processes, 300 fixed steps each. The old run uses copied baseline facade/dependencies under `.look/baseline`; no new benchmark was committed. Cold timings include facade work and JIT, not just the solver, and do not predict full-game FPS.

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
| Warm real-island step median / p99, ms | 0.10 / 0.20 | 0.20 / 0.30 |
| Warm real-island step mean, ms | 0.1055 | 0.1546 |

**It is slower in the real game on this Mac.** The warm measurement uses the fully loaded classic browser island: 67 static bodies containing 1,113 colliders, the live player walking the same repeated 120-step path, all fixed physics hooks, and the facade's push/step/pull/interpolate work. Each run discards 600 warm-up steps, then measures 1,800 fixed steps. The existing broker `look --real --action` runs ignored `.look/island-step.ts`; `perf --sim` measures lockstep, and frame-level hitches do not provide this isolated distribution. Same eval, scene, Mac and browser; [old manifest](../../.look/evidence/1793778528806-63906/evidence.json), [final new manifest](../../.look/evidence/1793784949740-69216/evidence.json). Browser clock resolution is 0.1 ms, so median/p99 are coarse; final mean is about 46.5% higher than old. The predecessor measured 0.1740 ms mean, but individual-run variance prevents attributing the reduction to the new facade. These are physics CPU costs, not FPS. No other broker/GPU task ran during the final timing.

`npm run build` succeeded. Vite emits separate SIMD/plain chunks and WASM; SHA-256 matches each emitted WASM to its installed package. SIMD loads first, with the unchanged `ecacab11` catch-and-import fallback. A forced SIMD import failure in Node successfully loaded plain and passed the drop. Production browser startup passed; forced browser fallback was not exercised.

**Pre-existing precache gap:** both builds' service-worker `first` list omits the dynamic game chunk and both physics WASMs. The facade-based dynamic-chunk selector misses the generated main chunk. Runtime fetch caching still exists. The final `counts` gzip algorithm reports JS 5,777→5,776 bytes, WASM 0→0, CSS 1,040→1,040, other 94,032→94,032; its rounded values show no change. This is not the complete first load. The table's separate estimate follows static imports/assets of the page, game and SIMD chunks, excluding optional media. `npm run counts` itself was not run because it launches Chromium outside the mandated broker; its byte algorithm was reproduced from the built files. Logs/data: `.look/{old,new,final}-size-detail.json`, `final-build.log`, `alternating-drop.log`, `bundle-loading.json`, `plain-fallback.log`.

The original +567,029 gzip bytes become **+567,043** after the compatibility setting: +546,223 (96.3%) SIMD WASM and +20,820 JS. **Zero bytes have been demonstrated avoidable with the stock packages.** Removing the lazy plain fallback saves zero successful-SIMD first-load bytes; switching to plain adds 24,509 gzip bytes. A custom WASM build excluding FEM is separate work with unknown savings. The precache gap is worth fixing separately now: follow the actual game chunk's import/asset closure and cache the selected physics variant, without eagerly fetching both large WASMs. That improves subsequent-start/offline reliability, not cold transfer size. No service-worker changes were made here.

## Sync risk

Physics stays outside lockstep execution, but results reach saved state: `features/ball-rest.ts` submits integer-centimetre resting coordinates; `adapters/gifts.ts` submits raycast-derived landing coordinates. Rules apply the accepted facts without rerunning physics. The ball has one owner, remote kinematic ghosts and unchanged `b` snapshots; a mixed-build handoff can change subsequent trajectory. Thrown visual flights are recomputed locally and can differ before converging on the accepted landing item. Boogler poses are Host state; player contacts/riding remain local. Soapbox is Owner physics; wagon schedules drive kinematic platforms; crossing is Local. No wire/rule change or namespace bump is indicated. An in-memory server import graph contained 42 source files, zero physics files and zero Rapier imports. Actual old/new mixed rooms remain untested.

## Checks and inspected evidence

Final runtime source is tree `0f836e17ec67fe364f66f5c2c1f8c8c3ee796d43` (dirty atop `d410764f`). All final broker manifests report no edits during their run; subsequent changes are documentation only. The later glide manifest includes those documentation edits but identical runtime source. Source SHA-256: backend `3b0bc5aa5a50ab851d612f5ece32e237de3a1d260b96f990e85ebec8526585c1`, player `6c300496d9f62ae7220bb2f26ee6b42e1e7a8e69603092d78d3c16bbd72808f2`, platforms `7e001d63003700befc6ebce923bcdbc4f3f6c165cb46f2a7bba3a3535a2a2131`.

All eight final scenarios pass: smoke, one-hand, interact, caves, shared-kinds, mushroom-bounce, minis and wagon-riders. Interact's suspected frisbee setup failure was not reproduced. Smoke hashes agree; caves traverse 11/11 routes without >1 cm floor sink; remote wagon rider is drawn riding for 236/236 samples. Mushroom peak is 6.56 m above its cap; mini-hop failure/splat is the scenario's expected outcome, not a failed run.

| Final manifest | Images actually opened; visual question and verdict |
| --- | --- |
| [Scenarios](../../.look/evidence/1793784552164-69217/evidence.json) | Opened mushroom `bounce-motion`, minis `hop-fail-motion`, wagon `wagon-riders-motion`, one-hand `frisbee-motion`, interact `riding-still`, caves `hub-still`, smoke `Alice-still` PNGs. Mushroom launches visibly clear the cap; two mini hops precede the intended sand splat; wagon rider stays on deck through turn/stop. Riding prompt is visible but the ball obscures the feet. Cave passages render; two smoke players stand on the sand. Frisbee sheet is too wide to judge its small trajectory; the 59.4 m travel assertion passes. |
| [Standing held/hop](../../.look/evidence/1793784863321-72595/evidence.json) | Opened motion, curves and six consecutive ascent frames; reopened [old motion](../../.look/evidence/1793778590793-68506/evidence.json). Both launches/landings are clear, held arc higher, matching intended old heights. The broad sheet cannot resolve centimetres; fixed-step numbers supply that comparison. |
| [Lighthouse stairs](../../.look/evidence/1793784875506-73389/evidence.json) | Opened motion and curves. Continuous ascent around the tower, no fall-through or long snag; tower intermittently occludes player. Curves reveal periodic vertical impulses, so visual traversal success does not waive the numeric speed/spike failures. No paired old browser stair capture was made; old/new geometry proxy supplies that comparison. |
| [Downhill flatbed](../../.look/evidence/1793784895834-73753/evidence.json) | Opened motion/curves: feet remain fixed to the same deck location while descending about 10→4.5 m, horizontal speed about 20 m/s. No visible slip. Earlier old turning-ride evidence is [here](../../.look/evidence/1793775706920-29928/evidence.json); exact downhill old/new comparison is headless, not a matched old film. |
| [Jump off flatbed](../../.look/evidence/1793784909832-74023/evidence.json) | Opened motion/curves and six consecutive launch frames. Feet release clearly, horizontal motion continues through flight, then player falls into sea. Later oscillations are swimming, not renewed deck support. |
| [Boogler ride](../../.look/evidence/1793784923537-74436/evidence.json) | Opened motion/curves. Player rides the moving Boogler uphill, then his existing “No free rides” action launches the player away; no persistent hovering after separation is visible. This is his scripted buck, not an extra base jump. |
| [Ball throw](../../.look/evidence/1793784937547-74698/evidence.json) | Opened motion and six consecutive rebound frames; reopened [old ball motion](../../.look/evidence/1793775749301-30514/evidence.json). Ball descends, rebounds and rolls without visible tunnelling. Old Boogler crosses its route, so these sheets cannot establish exact rebound parity; isolated physics measurements do. Ball capture curves track the player and were not used as ball measurements. |
| [Planks and glide](../../.look/evidence/1793785168162-76098/evidence.json) | Opened motion/curves. Player crosses summit, departs real edge, canopy opens and stays open; steady 10 m/s and about −3.2 m/s descent. No upward seam spike while walking after setup. Initial teleport/fall transient is excluded. |
| [Full playthrough](../../.look/evidence/1793784713990-71100/evidence.json) | Read full report/bot lines and opened end still. All expected beats pass, including (1168,−27) and balcony: 77 m descent, 24 s, within 2–3 m. End player is supported on platform; log overlay obscures much of view. No errors. Solo co-op marker absent as before; 4m49s standing and 5s pushing stalls are reported, not failed expected beats. |

Final old-reference checks remain red: `sim player` has 15 differing fields (walk/sprint/stop, no held/hop/swim mismatch); `sim ball` first fails step 60 y=2.336 versus 2.415; golden replay first differs frame 52 player.vx by 0.038 m/s and worst ball.x by 7.535 m at frame 985. Logs: `.look/parity-final-sim-{player,ball,replay}.log`. Execution of a capture is not a visual or parity verdict.

The owner reported `check:full` passing before this round, including 23/23 network checks. Final local `npm run check` passes lint, types, all 292 tests, registries, levels, assets and production build (`.look/parity-final-check.log`); the owner will run `check:full` for this revision. No blocked network test retry or external network use was made.

## Reference decisions, remaining work and owner playtest

| Reference / section | Recommendation |
| --- | --- |
| `dev/sim/player-browser.json` | **Do not regenerate this round.** Jump/acceleration/stop gates pass, but the requested complete movement/ground parity does not: crest, stairs and the synthetic corner need resolution. |
| Golden held/running jump | Accept the restored heights and takeoff steering; earlier touchdown is one fixed step. Do not preserve the old stale-contact double-jump exploit. No separate reference edit. |
| Golden swimming | Controlled dynamics are identical. Entry/buffer phase shift is explained and acceptable independently; no swim tuning. |
| `dev/sim/ball-browser.json` | **Do not regenerate.** First/later hard-surface and terrain rebounds fail the owner's 3% limit. Flat/slope roll parity does not excuse those failures. |
| `dev/sim/replays/golden.json`, `golden.trace.json` | **Do not regenerate.** Hold for crest/ball parity, then capture browser and Node counterparts together in the requested separate reference commit. |

No reference commit was made: its parity condition is false. Outstanding implementation work is rebound response compatibility (a constant material coefficient cannot fit the measured opposite-sign errors), crest/stair differences, and the conservative heightfield corner support miss. The 0.21 choice is not in question. No ball value was changed solely to make one test look good.

Mixed builds retain Owner ball snapshots and Host Boogler poses. The ground and takeoff changes alter local trajectories but no wire shapes, rule math, accepted-op formats or namespace. The 80 landing probes changed no accepted item cell/height/lost result. Ball resting positions can still change after a mixed-build ownership handoff because subsequent physics differs. Actual old/new rooms and handoffs remain unverified.

Human question: **Do takeoff, stopping and deck release retain the old responsiveness?** Try held jump/tap-hop at (14,26), then slopes/stairs and the crest into the sea; cross summit planks and glide to both targets; push/throw/steal the ball on hard ground and slopes; ride the Boogler and downhill flatbed, then jump off. Known numeric failures remain failures regardless of visual execution success. Real-time feel/smoothness, devices, mixed-build handoff, opt-in FFT water, matched old/new Host walking traces and final network checks are unverified.

Earlier-turn departure: required `npm run inflight` internally fetched origin before its implementation was inspected. This follow-up used no external network and did not rerun it. Diagnostics/evals stayed ignored under `.look`; no new benchmark/test harness was committed. Screenshot uploads are omitted under the network restriction. No push or ship.
