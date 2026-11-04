# Rapier 0.21.0 upgrade assessment

Updated 4 November 2026. The owner played the shipped Rapier 0.21 and accepted its feel for now. Accepted differences include ball rebounds, the sea crest, lighthouse stairs, steep-corner support, running-glide entry and one jump height on all ground. Old baseline: `75526a2a`; the parity investigation below records the remaining measured differences, not a claim of numerical equivalence.

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

The earlier isolated coyote probe accepted ages 1–5 fixed steps (through 0.083333 s), rejecting at 0.1 s. The current end-to-end ledge course and its floating-step boundary are reported below. Actual support ends one step sooner than stale support at a ledge. Deck boarding no longer grants coyote across its geometric catch gap: only actual walkable contact does. Four moving-deck probes (flat/up/down/turn) retain 120/120 support frames, no new airborne grounding, and at most 0.329 mm foot slip. Straight/diagonal finite edges, same-collider edge+wall and wall-only fixtures produce no false floor support.

**Remaining limitation:** a synthetic heightfield with a 5 m rise over 1 m misses valid floor support beside a steep wall at a grid boundary. A ray at z≈−1.93e−16 returns null despite 0.182 mm penetration; nearby z=0 and ±1e−6 hit. Support/coyote persists for 35/60 frames, not 60/60. Reverse rays and sphere support-point substitution did not fix it and were removed. The test is conservative (missing support), not airborne grounding. The owner now accepts this conservative corner miss. It is not a blocker in the current movement follow-up.

All four `forEachContact` consumers were checked: player ground; mushroom bounce; Boogler riding; mini-hop bounce/count/finish. Their broker scenarios pass. There are no other `touching()` or manifold-distance consumers. Deck geometric carry and terrain fall-through recovery remain separate. Soapbox uses rays and its card is retired/cut, so “if live” does not apply. Final actual-source evidence: `.look/parity-release-contact-summary.{md,json}`, `.look/parity-release-movement-summary.{md,json}`; option probes `.look/ground-parity-*.json`, activation probes `.look/ground-activation-{old,final}.json`. The stock failure was visually inspected in [glide](../../.look/evidence/1793782146691-89566/evidence.json) and [bot](../../.look/evidence/1793782216116-89526/evidence.json).

## Final follow-up: jump, swim and ball

### Exact-zero launch

The jump-height regression comes from the **new resting state, not the 0.002 prediction setting**. At (14,26), after 120 settling steps, old resting vy is −1.718e−9 m/s; new vy is exactly zero. `shapeJump` used falling gravity for the tiny negative old value, but apex gravity (held) or short-hop gravity (released) at zero, before the controller assigned launch velocity. Forcing old vy to zero reproduces the new heights. Forcing eligibility with the new upstream 0.02 prediction gives the same altered heights as 0.002.

The original cause-level fix was `vy < 0 || (vy === 0 && jumpActive)` in `shapeJump`; the current follow-up adds `!carry.on` to preserve the old carried-deck launch branch. `jumpActive` has just been cleared at nonpositive vy and set only for an eligible dry ground launch; zero idle/freefall, underwater and apex states keep their previous branches. This explicitly preserves the launch step's historical force, without inventing a velocity epsilon or changing a tuning constant. Changing the facade to fake a tiny downward velocity would affect unrelated consumers.

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

## Final follow-up: glide and running inertia

This section supersedes the earlier movement table. The owner accepts ball rebound exactness, the crest into the sea, lighthouse stairs and the conservative steep-corner miss. They are not blockers in this round. The branch now includes main's Node 26.13.0, Vite 8, TypeScript 7 and Oxlint changes. **Player parity is still partial; no reference files were regenerated.**

### Method and changes

Old is the actual `75526a2a` player/platform/facade code with local 0.19.3 packages; new is the final working source atop `fff841dc`, both in the same current scene with real player hooks at 60 Hz. The old player/facade matches the pre-upgrade `f1550182` snapshot. Seventy-four walking/running/ledge courses use identical scheduled inputs, including release/reversal at takeoff and near landing. Observation loaders expose private diagnostic state only. No production behavior is injected in final comparisons. Raw frames, metrics and source hashes: [running report](../../.look/inertia-release-report.md), [metrics](../../.look/inertia-release-final-summary.json), [failures](../../.look/inertia-release-final-failures.json), [landing/deck report](../../.look/landing-final-report.md), [standing timing](../../.look/landing-standing-summary.md), [glide report](../../.look/glide-parity-report.md). Limits are ±2% distances/speeds and ±1 fixed step timings; very short distances have no hidden centimetre allowance.

The landing cause was callback timing: old manifolds describe the beginning of integration, whereas the new facade queries the final pose. The new optional `forEachContact(..., { sinceStepStart: true })` requires actual overlap at **both** poses, with the final walkable normal still required. It saves actual f32 body poses after pre-step riding/teleport edits and tests the small player shape in the other body's transformed frame; it neither copies terrain nor moves live colliders. `groundPlayer` requests this only after coyote expires. Applying it to every grounded frame rejected scheduled jumps over uneven terrain, so current support continuity within existing grace is retained. The other three contact consumers use unchanged current-pose behavior. Five gentle drops now acquire support on exactly the old steps. No positive separation or airborne support is introduced; the second jump request remains rejected. A 300-step offset/rotation oracle found zero transform mismatches.

Changes, recorded individually:

- **Landing timing cause fix:** the optional start-and-end overlap rule restores standing held/hop airtimes from 0.8167/0.3833 to the old **0.8333/0.4000 s**. Actual geometric floor crossing is 0.8167/0.3833 in both engines; accepted support was the difference.
- **Steering compatibility constant:** `GROUND_STEER_TIME = 0.1 + FIXED` supplies the old extra ledge steering step separately from coyote. All twelve walk/sprint run-off stop/reversal curves now match old exactly. Coyote still ends one step earlier in absolute route time; it is not extended.
- **Launch steering cause fix:** existing `LAUNCH_STEER_TIME = 0.1` now applies to supported jumps and jumps within the existing 0.06 m floor-snap deadband, not true coyote jumps over empty air. This restores old mid-air reversal rather than giving every coyote jump six new ground-acceleration steps. The deadband moved into `MOVE.snapMinGap`; its value did not change.
- **Deck launch cause fix:** exact-zero first-step gravity normalization excludes a carried deck, where 0.19 already rested at zero. The old deck arc and initial vertical speed return, without pretending the deck still touches after departure.
- **Explicit carry compatibility constant:** `CARRY.departureSkidS = 0.1` applies the existing 9 m/s² drag for six departure steps. Old **3→2.1 m/s** carry is deliberately restored; after that, remaining carry persists in air. No stale contact grants a second jump. Flat/up/down/turn deck velocity curves match old for the first 30 post-jump steps.

No glide, speed, acceleration, braking, jump-speed, coyote-duration, snap-distance, friction or ball values were retuned. Each added compatibility constant is commented at its definition. Diagnostic-only old allowed error 0.001, contact frequency 60 and both together did not fix terrain trajectories: frequency changed no samples in all 74 courses; allowed error changed flat positions by at most 4.013 mm and no spawn samples. No such setting was retained. Recovering launch speed from position differences was also rejected: the old running approach genuinely contacts an uphill triangle while the new one is still on flat ground, not a hidden upward velocity lost by the facade.

### Old / new / limit

Times in steps are fixed 1/60 s. Jump lengths/airtimes end when `groundPlayer` accepts support after descent. Velocities at each build's own landing can compare different collision steps; matched-input boundaries are identified explicitly.

| Matched test / metric | Old 0.19.3 | Final 0.21.0 | Limit / result |
| --- | ---: | ---: | --- |
| Standing (14,26), held / hop height, m | 1.55159450 / 0.66390562 | 1.55159426 / 0.66390562 | ±2%, pass |
| Same held / hop airtime, s | 0.833333 / 0.400000 | identical | ±1 step, pass |
| Same held / hop apex time, s | 0.483333 / 0.166667 | identical | ±1 step, pass |
| Five drops, 2/10/20/50/100 cm: first accepted support step | 3/6/8/12/16 | identical | ±1 step, pass |
| Same drops, stopping distance, m | 0.252584 | identical | ±2%, pass |
| Flat walk / sprint speed through takeoff and 15 air steps, m/s | 5.599067 / 9.498417 | identical | ±2%, pass |
| Flat walk / sprint stop, distance and steps | 0.178766 m, 5 / 0.565989 m, 9 | identical | ±2% / ±1 step, pass |
| Flat walk / sprint reversal, distance and steps | 0.088261 m, 3 / 0.312211 m, 5 | identical | ±2% / ±1 step, pass |
| Late ledge run-off reversal, walk / sprint | 0.513509 m, 17 / 2.106742 m, 34 | identical | ±2% / ±1 step, pass |
| True coyote-jump reversal, walk / sprint | 1.070162 m, 24 / 3.128094 m, 41 | identical | ±2% / ±1 step, pass |
| Last accepted coyote press, common route frame | 14 | 13 | ±1 step, pass; six-step grace after each support signal |
| Spawn running held walk: height / length, m | 1.551594 / 4.845931 | 1.551594 / 4.847343 | ±2%, pass |
| Same walk airtime / apex, steps | 52 / 29 | 52 / 29 | ±1 step, pass |
| Spawn running held sprint: height / length, m | 1.533537 / 7.128455 | 1.551753 / 7.289957 | height +1.19% pass; length **+2.27% fail** |
| Same sprint airtime / apex, steps | 49 / 29 | 50 / 29 | ±1 step, pass |
| Sprint jump, forward released at step 15: airtime | 49 steps | 51 steps | **2 steps, fail** |
| Same release: stopping distance / time | 1.719464 m / 34 steps | 1.729072 m / 34 steps | +0.56% / 0 steps, pass |
| Walk jump, release at step 50: stopping travel | 0.290139 m / 7 steps | 0.297939 m / 7 steps | **+2.69% fail**; time passes |
| Walk jump, reverse at step 50: reversal travel | 0.213381 m / 5 steps | 0.219851 m / 5 steps | **+3.03% fail**; time passes |
| Sprint jump, release at step 50: stopping travel | 0.692854 m / 12 steps | 0.695852 m / 11 steps | +0.43% / −1 step, pass |
| Sprint jump, reverse at step 50: reversal travel | 0.329290 m / 6 steps | 0.346947 m / 6 steps | **+5.36% fail**; time passes |
| Spawn ground sprint stop / reverse distance, m | 0.570899 / 0.314975 | 0.569105 / 0.314010 | ±2%, pass; 9/5 steps both |
| Perfect flat-box held height / apex / airtime | 1.703712 m / 30 / 52 steps | 1.551613 m / 29 / 50 steps | **height and airtime fail**; apex passes |
| Same flat held walk / sprint jump length, m | 4.853378 / 8.233335 | 4.666710 / 7.880043 | **−3.85% / −4.29%, fail** |
| Four decks, support / false airborne support | 120/120 / old stale support | 120/120 / zero | stable support and no false ground, pass |
| Flat-deck jump height / first vy | 1.556158 m / 7.448759 m/s | 1.556156 m / 7.448759 m/s | ±2%, pass |
| Deck departure carry after six steps | 3→2.1 m/s | identical | ±2%, pass; all four profiles' 30-step curves match |
| Same-airborne glide: steady horizontal speed / sink | 9.998333 / −3.199467 m/s | identical for all 360 flight steps | ±2%, pass |
| Same glide: 90° turn to 99% / release to <0.05 m/s | 18 / 49 steps | identical | ±1 step, pass |
| Same glide close / landing step; landing speed | 360 / 405; 5.599067 m/s | identical | ±1 step / ±2%, pass |
| Same glide, total displacement through landing | 40.297254 m | 40.240676 m | −0.1404%, pass |
| Raised-box standing / running glide distance | 55.044571 / 55.223536 m | 54.451221 / 54.630183 m | about −1.08%, pass |
| Same standing/running glide hold / landing step | 31 / 347 | 30 / 343 | hold passes; **landing −4 steps fails** |
| Classic standing-entry diagnostic glide distance / landing | 9.005167 m / 70 | 8.954851 m / 70 | −0.559% / 0 steps, pass |
| Classic 45-step run-entry glide distance / landing | 10.481045 m / 79 | 9.463737 m / 72 | **−9.706% / −7 steps, fail** |
| Same run-entry hold step / landing horizontal speed | 32 / 9.886240 m/s | 30 / 10.047375 m/s | **−2 steps fails**; +1.630% speed passes |
| Summit→(1168,−27), identical old inputs: distance / landing step | 156.113537 m / 1636 | 156.114746 m / 1636 | +0.000774% / 0 steps, pass |
| Same station route: landing speed / common-release stop distance | 9.969648 m/s / 0.602751 m | 9.969666 m/s / 0.601522 m | +0.000186% / −0.204%, pass; stop 9 steps both |
| Summit→balcony, identical old inputs: distance / landing step | 148.032718 m / 1666 | 148.057382 m / 1667 | +0.01666% / +1 step, pass |
| Same balcony route, speed at each landing | 9.998333 m/s | 9.796701 m/s | **−2.01666%, fail** |
| Same balcony, common-release travel / stopping time | 0.632593 m / 9 steps | 0.768993 m / 10 steps | **+21.56%, fail**; time passes |

Glide lives in `src/proto/place/moves.ts`, not the live classic island. Classic terrain diagnostics deliberately attach those real hooks to isolate terrain entry. The same-airborne test includes deployment, forward acceleration, a 90° turn, input release, reacceleration and closing the canopy: position and velocity coincide throughout all 360 gliding steps. Sink transients settle to −3.199467 by deployment step 5; different launch velocities before deployment are not equal curves. No glider retune is justified by those differences.

Summit comparisons use actual authored terrain, `buildSpire`, `buildBridges` and `buildPads` through the existing `dev/level/source.ts` adapter (61 bodies, 262 colliders), with Place's player CCD setting and soft-wall removal. Other Place creators are omitted, so this is bounded geometry, not complete browser parity. Exact old yaw/forward/toggle/release inputs are replayed on new. At the balcony's **same old landing frame** both have speed 9.998333: new's one-step later support allows one airborne braking step before landing. Counting only distance after each build's own landing would hide that first 13.6 cm. On the full browser scene, separate new-only fixed-step policy runs reached station/balcony within 2.872/2.534 m without swimming; those use each route's own edge timing and are not another matched old/new result. The full bot also passes both destinations.

Summit seam motion shows no upward walking spike after setup. Existing launch velocity is retained: the new browser glide curve holds walking speed about 5.6 before departure and reaches 10 after opening. The same-input authored route distance/velocity figures above include the seam approach. The older 9.551→9.599 sprint discrepancy was five-step sampling aliasing: every-step maxima 9.608736→9.598931, last-second mean +0.034%; the target remains 9.5. These older course maxima are not substituted for this round's exact-input samples.

### Every remaining measured player-movement difference

This is the complete category list from the current probes plus unresolved earlier findings; raw per-frame/component differences and all near-zero denominator failures remain in the linked metrics rather than being rounded to equality.

- **Resting height and tiny drift:** flat, spawn and ledge centres sit 1.381, 1.216 and 1.389 mm higher. Spawn resting vy changes −1.718e−9→0 m/s and horizontal jitter about 3.33e−6→0. The standing held arc differs by −0.238 µm; hop height is identical. Relative flight position/velocity differences stay below 0.477 µm or µm/s, but post-impact height corrections differ −0.462/−0.325 mm for held/hop.
- **Old exact-zero flat launches:** old perfectly flat rest selected apex gravity, giving 1.703712 m, unlike the old hill's 1.551594 m. Current normalization keeps the previously requested 1.55 m target. Flat apex is one step earlier, flight two steps shorter, and walk/sprint ranges shorter as tabulated. Release/reverse at step 50 therefore lands in a different phase: e.g. sprint stop 0.813482→0.565989 m (10→9 steps), reverse 0.578003→0.312211 m (7→5). Restoring the old surface-dependent height versus retaining consistent 1.55 m is unresolved; no approval is inferred from the unanswered preference question.
- **Spawn running trajectories:** walk length grows 1.412 mm; sprint held height grows 18.216 mm and length 161.502 mm, landing one step later. Sprint early-release flight is two steps longer. Launch horizontal speeds match, but terrain kicks change later velocity components; at accepted landing, held-walk velocity is (−4.42960,0.82945,2.74218)→(−4.42888,0.92070,2.90590), sprint (−7.60718,−1.15509,7.99969)→(−7.60502,−1.00376,7.00381) m/s. These are not identical landing impacts.
- **Landing stop/reversal:** remaining walk release/reverse travel grows 7.80/6.47 mm; sprint reversal grows 17.66 mm. Sprint release travel grows 3.00 mm and stops one step sooner. Walk enters the same impact at forward speed 5.131506 and vy −10.814960, but solver output is 4.739101/+0.770567 versus 4.840031/+0.861842. Sprint hits different triangles/frames: incoming 9.5 produces 10.858202 versus 10.270379 m/s. Global braking tuning would alter already exact flat and run-off tests.
- **Smaller ground and air differences:** spawn sprint stop/reverse distances shrink 1.794/0.965 mm; walk reversal grows 0.418 mm. Spawn walk never falls below 0.05 m/s in either build because it creeps downhill at 0.0525; below-0.2 travel changes 0.191165→0.191680 m (5 steps both). Spawn takeoff-release lengths change 0.195988→0.196319 m walk and 0.627425→0.624148 m sprint. Mid-air reversal lengths change 2.177838→2.178079 m walk and 3.767130→3.758858 m sprint; sprint reversal travel 1.461964→1.476328 m. These pass 2% but are not zero.
- **Ledge support and coyote:** current support ends one step earlier, so the last accepted coyote press is one route step earlier. Run-off braking/reversal has been restored exactly with a separate steering clock; eligibility has not. A rounded-edge return used an old cached walkable normal 0.648 although the current normal was 0.480, below the walkable threshold. Rejecting that stale ground changes its catch/slide trajectory by 32 frames. Some near-zero net return distances differ only millimetres/one frame but exceed 2%; the failure JSON preserves them. Restoring this old contact would conflict with the no-air-ground/double-jump requirement.
- **Decks:** flat/turn jump maxima differ about 2 µm; up/down maxima and all four profiles' first 30 departure carry/velocity samples match. The earlier 3→3 m/s change has been removed deliberately: both now lose 0.9 m/s in six steps. Earlier measured turning foot-slip difference was at most 0.329 mm; no new airborne support appears.
- **Ground-to-glide entry:** raised-box hold starts one step earlier and lands four earlier; classic standing glide lands at the same step but travels 50.316 mm less and lands at 10.234876 versus 10.257759 m/s. Classic running glide holds two steps earlier, travels 1.017308 m less and lands seven steps earlier. Before its launch, old x=15.069218, vy=+0.295178 versus new x=15.020673, vy=0: the 48.5 mm approach phase reaches different terrain normals. Old measured dy/dt=0.297647, new=0.000143 m/s confirms this is real contact motion, not missing facade velocity. Combining that old upward kick and different first-step gravity changes launch vy by 0.655069 m/s.
- **Ledge-triggered glide policy:** opening nine steps after each build's own edge signal is not identical input timing. In that diagnostic hold starts one step earlier, landing is two later, distance 50.637806→51.044487 m (+0.803%); landing speeds match. It illustrates the one-step support loss's consequences, not proof of same-input glide-law divergence.
- **Glide after identical airborne entry:** all flight samples coincide; after closing and touching terrain total displacement differs −56.578 mm despite equal first-ground step/speed. The collision phase causes this small post-flight difference.
- **Long summit routes:** matched station travel grows 1.209 mm, landing speed 0.000018 m/s, target offset 1.699412→1.700633 m; common-release stop travel shrinks 1.229 mm. Balcony travel grows 24.664 mm, target offset 2.147335→2.250680 m, support is one step late, own-landing speed is 0.201632 m/s lower and common-release stop travel 136.400 mm longer. With adaptive edge/aim/release inputs instead, station/balcony landing shifts 2/4 steps; that policy amplification is separate from the matched-input table.
- **Swimming:** the controlled law remains identical, but the golden water entry is one step earlier, buffered water jump three steps later and 3.3 cm lower, settling to a five-step bob phase lag. The earlier detailed swim section explains this; no swim constants changed.
- **Previously accepted movement differences:** crest golden y/vy gaps up to 0.209 m/3.275 m/s; lighthouse proxy speed/travel −2.06%/−2.325% and upward-spike increase 0.21269 m/s; conservative steep-grid-corner support only 35/60 frames. Accepted by the owner, not repaired or reclassified as numerical parity. Ball rebound differences are also accepted but are not player movement.
- **Interactions carried forward:** player vx one second after a ball hit 0.151169→0.149703 m/s (−0.97%); no deliberate contact/material retune. Earlier 80 thrown-item probes changed landing coordinates by at most 18.680 µm and no accepted cell/height/lost outcome. These earlier isolated measurements were not repeated this turn; the current interact/shared-kinds scenarios pass.

The numeric [running overlay](../../.look/inertia-release-overlays.png) and [glide overlay](../../.look/glide-parity-final-overlays.png) were opened. Run-off/coyote reversal curves now overlay old exactly; flat launch arcs and near-landing braking still separate. The glide's speed/sink/turn curves overlay exactly; the balcony release and classic running-entry panels visibly separate. Matching only the sustained glide does **not** establish whole-route feel parity.

## Measurements and loading

**Historical pre-rebase size/drop comparison:** figures below were measured on prediction-fix predecessor `ce1532ad`; byte counts were not remeasured for the contact/steering edits. The table's warm island timing belongs to the previous contact revision, before this round's landing-pose snapshots; current cost is recorded separately below. Same Mac, Node 24.11.1, existing `npm run sim -- drop`: five alternating old/new processes, 300 fixed steps each. The old run uses copied baseline facade/dependencies under `.look/baseline`; no new benchmark was committed. Cold timings include facade work and JIT, not just the solver, and do not predict full-game FPS.

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

**It was slower in the real game on this Mac.** The warm measurement uses the fully loaded classic browser island: 67 static bodies containing 1,113 colliders, the live player walking the same repeated 120-step path, all fixed physics hooks, and the facade's push/step/pull/interpolate work. Each run discards 600 warm-up steps, then measures 1,800 fixed steps. The existing broker `look --real --action` runs ignored `.look/island-step.ts`; `perf --sim` measures lockstep, and frame-level hitches do not provide this isolated distribution. Same eval, scene, Mac and browser; [old manifest](../../.look/evidence/1793778528806-63906/evidence.json), [final new manifest](../../.look/evidence/1793784949740-69216/evidence.json). Browser clock resolution is 0.1 ms, so median/p99 are coarse; that revision's mean was about 46.5% higher than old. The predecessor measured 0.1740 ms mean, but individual-run variance prevents attributing the reduction to the new facade. These are physics CPU costs, not FPS. No other broker/GPU task ran during the final timing.

`npm run build` succeeded. Vite emits separate SIMD/plain chunks and WASM; SHA-256 matches each emitted WASM to its installed package. SIMD loads first, with the unchanged `ecacab11` catch-and-import fallback. A forced SIMD import failure in Node successfully loaded plain and passed the drop. Production browser startup passed; forced browser fallback was not exercised.

**Historical precache gap (fixed by inherited main during rebase):** both measured pre-rebase builds' service-worker `first` list omits the dynamic game chunk and both physics WASMs. The facade-based dynamic-chunk selector misses the generated main chunk. Runtime fetch caching still exists. The final `counts` gzip algorithm reports JS 5,777→5,776 bytes, WASM 0→0, CSS 1,040→1,040, other 94,032→94,032; its rounded values show no change. This is not the complete first load. The table's separate estimate follows static imports/assets of the page, game and SIMD chunks, excluding optional media. `npm run counts` itself was not run because it launches Chromium outside the mandated broker; its byte algorithm was reproduced from the built files. Logs/data: `.look/{old,new,final}-size-detail.json`, `final-build.log`, `alternating-drop.log`, `bundle-loading.json`, `plain-fallback.log`.

The original +567,029 gzip bytes become **+567,043** after the compatibility setting: +546,223 (96.3%) SIMD WASM and +20,820 JS. **Zero bytes have been demonstrated avoidable with the stock packages.** Removing the lazy plain fallback saves zero successful-SIMD first-load bytes; switching to plain adds 24,509 gzip bytes. A custom WASM build excluding FEM is separate work with unknown savings. The original recommendation was to fix that precache closure separately. Main has since done so: current `vite.config.ts` selects `/src/main.ts` and `rapier3d-simd`, follows their import/asset closure and retains the lazy plain fallback. Do not open a duplicate fix for the old omission. The final `check` build confirms `dist/sw.js` now includes the game chunk, SIMD JS and SIMD WASM in `first`, while plain stays lazy. This job made no service-worker changes and did not remeasure the historical first-load totals after the Vite 8 rebase.

Current final runtime cost, same existing island-step eval: 600 warm-up + 1,800 measured steps, 67 static bodies/1,113 colliders, median **0.20 ms**, p99 **0.30 ms**, mean **0.16978 ms** ([manifest](../../.look/evidence/1793814370926-76641/evidence.json)). No other broker task ran concurrently. Median/p99 equal the prior 0.21 revision; mean was previously 0.1546. Old 0.19's historical median/p99/mean were 0.10/0.20/0.1055. The old browser baseline was not freshly rerun after the tooling rebase, so neither the mean increase nor its source is a controlled attribution to these new pose reads. Browser clock resolution remains 0.1 ms.

## Sync risk

Physics stays outside lockstep execution, but results reach saved state: `features/ball-rest.ts` submits integer-centimetre resting coordinates; `adapters/gifts.ts` submits raycast-derived landing coordinates. Rules apply the accepted facts without rerunning physics. The ball has one owner, remote kinematic ghosts and unchanged `b` snapshots; a mixed-build handoff can change subsequent trajectory. Thrown visual flights are recomputed locally and can differ before converging on the accepted landing item. Boogler poses are Host state; player contacts/riding remain local. Soapbox is Owner physics; wagon schedules drive kinematic platforms; crossing is Local. No wire/rule change or namespace bump is indicated. An in-memory server import graph contained 42 source files, zero physics files and zero Rapier imports. Actual old/new mixed rooms remain untested.

## Current checks and inspected evidence

Final runtime was frozen before the following broker runs (dirty atop `fff841dc`); each manifest records `changedDuringRun: false`. Subsequent edits are documentation only. Final source hashes are in [landing report](../../.look/landing-final-report.md) and [inertia hashes](../../.look/inertia-release-final.sha256). The source review found no new actionable issue with the transformed start-pose query, timer separation or departure skid. Numeric parity failures remain failures.

All five requested scenarios pass: smoke, one-hand, interact, caves and shared-kinds. Interact's prior suspected frisbee setup failure is not reproduced. Caves reach 11/11 route points, no >1 cm floor sink; shared-kinds reports Owner player/ball error 0.00 m and Host Boogler error 0.26 m while he walks 3.3 m. The full bot passes all expected beats, including both long glides and the balcony secret: 77 m down in 24.0 s, within 2 m. It reports 21 standing stalls totalling 7m03s, zero pushing stalls and zero water falls. “Found a crystal” and “did something together” remain unmarked; neither was an expected failing beat. No bot/page/GFX errors.

| Fresh manifest | PNGs actually opened; visual question and verdict |
| --- | --- |
| [Scenarios](../../.look/evidence/1793813656738-67004/evidence.json) | Opened one-hand `frisbee-motion`, interact `riding-still`, caves `hub-still`, smoke `Alice-still`. Smoke players stand on sand and cave passages render. Riding prompt is visible; ball obscures feet. The frisbee is too small in this wide sheet to judge its detailed path; execution success is not that visual verdict. |
| [Held/hop](../../.look/evidence/1793814033422-70493/evidence.json) | Opened `inertia-jumps-motion`, `-curves`, plus six consecutive video frames extracted with ffmpeg. Both arcs visibly launch and land; held is higher. The older browser curve contains an exact-zero taller held arc, so it does **not** overlay the 1.55 m normalization. Fixed-step hill numbers, not a claimed screenshot match, establish restored 0.8333/0.4 s timing. |
| [Sprint jump/release](../../.look/evidence/1793814046020-70894/evidence.json) | Opened `inertia-run-motion`, `-curves` and six consecutive launch frames. Player continues forward through the arc and settles after release. Speed/height overlay the old numeric schedule closely; short impact spikes differ. The wide view cannot resolve the measured millimetres of braking error. |
| [Summit glide](../../.look/evidence/1793814059867-71324/evidence.json) | Opened `inertia-glide-motion`, `-curves` and six consecutive canopy-departure frames. Player crosses planks, leaves the real edge, canopy stays open and descent is continuous. About 10 m/s horizontal, −3.2 m/s vertical after opening. This browser overlay compares the preceding **0.21** capture, not 0.19; the separate matched-input numeric glide sheet supplies old/new curves. Initial teleport/fall transient is excluded. |
| [Deck departure](../../.look/evidence/1793814076137-70491/evidence.json) | Opened `inertia-deck-motion` and `-curves`. Feet release and horizontal motion continues, then player falls into water. Later vertical oscillations are swimming, not a second deck launch. The real crossing's roughly 20 m/s carry is visually distinct from the isolated 3 m/s numeric fixture. |
| [Full playthrough](../../.look/evidence/1793813747438-67003/evidence.json) | Read report and bot lines; opened `run/end-still`. Player stands on the end platform. Log and feedback overlays obscure much of the view; route arrival is established by the bot plus targeted captures, not this still alone. |
| [Full-scene station](../../.look/evidence/1793814516599-78646/evidence.json), [balcony](../../.look/evidence/1793814566960-79329/evidence.json) | Opened both `-still` PNGs: player is supported beside Station 5 and on the balcony beside its chest. Station view is partly tree-occluded; balcony support is clear. New-only fixed-step route diagnostics have landing offsets 2.872/2.534 m, not swimming. These corroborate complete geometry, not matched old/new parity. First station attempt used an unhelpful camera and suppressed its console prefix; it was recaptured with a target view and compact logged results. |
| [Final CPU probe](../../.look/evidence/1793814370926-76641/evidence.json) | Opened `inertia-cost-still`: island geometry renders, but the camera does not show the moving test body. Logged fixed-step poses establish its repeated path; this is CPU evidence, not a motion-quality verdict. |

Final `sim player` still has 15 fields differing from the old browser reference. Golden replay executes all 1,103 frames but differs first at frame 52 player.vx by 0.038 m/s; worst ball.x is 7.535 m at frame 985, whose bounce/shore cause the owner accepts. Logs: `.look/inertia-final-sim-player.log`, `.look/inertia-final-replay.log`. The ball course was not rerun in this narrowed round; its old-reference mismatch is already explained and accepted. No reference was overwritten to turn these comparisons green.

Final `npm run check` passes: zero lint/type errors, all 298 tests, registries, levels, assets and production build (`.look/inertia-final-check.log`). The owner reported `check:full` passing before this round, including 23/23 network checks, and will run it for this revision. No blocked network retry or external network use occurred. Port 5199's owner server was left running and untouched; browser evidence used the provided broker's separate server.

## Reference decisions and owner playtest

On 4 November the owner accepted the shipped feel, including ball rebounds, sea crest, lighthouse stairs, steep-corner support, running-glide entry and one jump height on all ground. The table below records the earlier parity gate, superseded by that playtest decision.

| Reference | Decision this round |
| --- | --- |
| `dev/sim/player-browser.json` | **Do not regenerate.** Landing and inertia causes are fixed, but flat-height policy and terrain-entry/short-stopping gates still fail. |
| `dev/sim/ball-browser.json` | Its rebound differences are now **owner accepted**, so regenerate with the new browser counterpart once player parity is cleared. Held unchanged under the requested combined gate. |
| `dev/sim/replays/golden.json`, `golden.trace.json` | Regenerate browser recording and Node trace together in a separate commit only after the player gate passes. Accepted ball/crest/stair/corner differences no longer block it; current glide-entry/landing failures do. |

No reference commit was made because its condition is false. In particular, a literal match to every old edge return would restore stale nonwalkable support, contrary to the owner's no-air-ground instruction. Maintaining 1.55 m everywhere also cannot simultaneously reproduce old exact-zero 1.70 m flat jumps. The known residuals need an explicit choice or a broader contact-response solution; no single tested Rapier setting fixes them. The 0.21 decision remains final.

Only a person can judge real-time responsiveness/smoothness: compare sprint reversal on ground, after run-off and after a coyote jump; release forward just as landing; held/hop at (14,26) and a flat plank; walk off the summit and glide to station/balcony; close the canopy; ride then jump off a turning/downhill deck and feel the deliberate first-0.1-second carry loss. The owner accepted the ball/crest/stair/corner differences, so those are not another requested tuning pass. Human feel, device variation, full mixed-build handoffs, exact old/new complete-browser route curves and final `check:full` remain unverified.

Earlier-turn departure: required `npm run inflight` internally fetched origin before its implementation was inspected. This follow-up did not repeat it or use external network. Diagnostics/evals stayed ignored under `.look`; no new benchmark/test harness was committed. Screenshot uploads are omitted under the network restriction. No push or ship.
