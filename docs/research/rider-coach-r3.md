# Riders' coach A — R3, polished and curated

> **Status:** reference (reconciled 17 November 2026). **Verdict:** Candidate A model subsequently shipped in #1995.
> **Recommendation:** Use the curated model evidence; it does not certify target-device performance or real-time smoothness.

16 November 2026. Local branch `t3/rider-coach-art`, rebased on main `943c29e9b`; no push or ship.
The [brief](../world/rider-coach-a/brief.md) and [layout](../world/rider-coach-a/measured-layout.svg) govern
dimensions; [look.png](../world/rider-coach-a/look.png) and [closed.png](../world/rider-coach/closed.png) supply
character. Principles: **Show, don't tell**; **Understandable at a glance**.

## Model and constraints

[Canonical Blender recipe](../../assets/src/rider-coach.py), [built GLB](../../assets/built/rider-coach.glb).
Six mesh nodes: static shell (deck, two benches/backs, panelled sides, framed windows, door handles,
solid inspection-window ends and twelve-segment arc roof), underframe and four separate hinge-local steps.
The existing train batches supply wheels, buffers and couplings; these are intentionally absent on the Buddy stage.
One shared kit paint, linear `Col` vertex colours, roughness .85, metalness 0; **no textures or glass**.

| Asset | Unique indexed triangles | Assembled triangles | Compressed bytes | Embedded materials |
| --- | ---: | ---: | ---: | ---: |
| Polished coach | 3,064 | **3,196** | **25,012** | 0 |
| Reviewed first R3 | 3,776 | 3,908 | 31,732 | 0 |
| Existing players' car, fit + unused upgrade | 3,728 | 3,688 | 25,832 | 0 |
| Existing engine (manifest only) | 8,656 | Not reimported | 64,268 | Not remeasured |

Shell 2,976 triangles; underframe 44; four repeated treads 44 each. Shared tread geometry explains the 132-triangle
indexed/assembled difference. Within the original roughly 2–4k guide and owner's 5k allowance. Inspector material
labels are Blender defaults, not shipped materials. The existing players' car inspection had 120 degenerates;
that asset is untouched. All final coach parts have zero degenerates and valid normals.

Polish: .025 m honey window surrounds with .006 chamfers, .045 m dark lower-panel frames with .008 chamfers,
red outer-door panel outlines, existing brass handles, .025 m cream waist stripe, brown seats and new brown backs.
The end is one continuous red ring around the measured .50×.40 inspection opening, with a honey surround.
Deliberate detail departures: inset fields .47×.325 instead of .48×.38 accommodate chunky frames; relief .030
instead of .018 m, recessed inside the same ±.76 body face. Posts/header sit at x±.734 behind trim. Lining is on
the outer waist face, y1.18–1.205, instead of its upper face. No fine grooves, lettering, lamps, ribs or glass.

Roof remains 2.90×1.60 m, crown 2.05/eave 1.93, radius 2.7266667, thickness .06; body 2.82×1.52; four clear .54×.63
windows per side at sill 1.24/header 1.87. Steps .56×.24×.04, hinges (±.76,.57,±.90). Decoded bounds x±.799984753,
z±1.450000048, y.400080264–2.050068617; tiny deviations are mesh quantization. Exported seat landmarks retain
alternating order, x±.535, z−.90/−.30/.30/.90, root .885 and inward yaw. **Seat nudge: 0 m; collider change: none.**
Same flat rail+2.05 roof collider; up to .12 m visual separation at the eaves remains. Players cannot enter.
World v57, rules, stops, levels, goldens, traces, schemas and test assertions unchanged. Shared pools remain
sized from data. No new player-facing strings. Game axes→Blender `(x,y,z)→(x,-z,y)`, Y-up export.

## Read against both paintings

At native 1200×800 game size, the roof, cream waist, four outlined panels and four separate near-side heads read.
Both-side close views confirm eight, three (two/one) and zero riders. Honey surrounds and red door outlines add
period-coach character. The end is solid around its small window. Panel bevels hold in rendered motion samples
without visible flicker; display smoothness is not certified.

It is still plainer than both paintings. Each measured .54 opening fills 90% of its .60 bay, leaving .06 posts;
.63 window height leaves a .06 header below the 1.93 eave. Honey surrounds cover part of that narrow red framing,
and open windows show landscape through the cabin. Thus palette red #a33a2c (unchanged) reads as framing, not
the paintings' broad red wall. Brown backs improve contrast but do not create an opaque upper interior. More red
would reduce binding clear openings. The measured roof is shallower than closed.png; handles are small, stowed
steps obscure part of the lower door panels, and inward-facing riders mostly show hats/backs, unlike the paint.
No gross hat/post collision appears in inspected views; this is not exhaustive animated clearance testing.

## Curated stills

[Image index](rider-coach-r3/index.html): **16 JPEGs, all ≤1200 px wide; 1.7 MB including index,
largest image 155,139 bytes.** Every retained JPEG was opened after conversion. No JSON, logs, curves, video or
uncurated sheets remain here. The old 119 MB directory was copied and compared byte-for-byte locally before removal.
The local branch is rebuilt as one commit so those blobs are outside `origin/main..HEAD`.

History check: the largest new object is `docs/game-design/place.md`, **391,238 bytes**; no object reaches 1 MB.
Reproduce: `git diff --stat origin/main...HEAD | tail -1`; `du -sh docs/research/rider-coach-r3`;
`git rev-list --objects origin/main..HEAD | git cat-file --batch-check='%(objecttype) %(objectsize) %(rest)' | sort -k2 -n | tail -5`.

| File(s) | Shows |
| --- | --- |
| [home-8-outer](rider-coach-r3/home-8-outer.jpg), [home-8-platform](rider-coach-r3/home-8-platform.jpg) | Fixed close c1/c3; four near heads per side |
| [home-3-outer](rider-coach-r3/home-3-outer.jpg), [home-3-platform](rider-coach-r3/home-3-platform.jpg) | Two/one near riders; far riders visible through openings |
| [home-0-outer](rider-coach-r3/home-0-outer.jpg), [home-0-platform](rider-coach-r3/home-0-platform.jpg) | Empty benches, dark backs, actual openings |
| [stage--1](rider-coach-r3/stage--1.jpg), [stage-1](rider-coach-r3/stage-1.jpg) | Closest matched studio views, Buddy scale, opposite sides |
| [steps-down](rider-coach-r3/steps-down.jpg), [steps-stowed](rider-coach-r3/steps-stowed.jpg) | Real Home stand/departure; latter .4s after departure detection |
| [home-turntable](rider-coach-r3/home-turntable.jpg) | Owner's approved table c2; small coach behind players' car/engine |
| [pier](rider-coach-r3/pier.jpg) | Accepted Pier terminal train dressed with eight riders; near steps stowed |
| [before-after](rider-coach-r3/before-after.jpg) | Mainv57 blockout/polished art, matched c3/eight riders |
| [play-size](rider-coach-r3/play-size.jpg) | Native game c0; four heads beside players' car; staged player above that car |
| [shadow](rider-coach-r3/shadow.jpg) | Shipped-light stage, shadowed side; red/honey/cream remain distinct |
| [fleet](rider-coach-r3/fleet.jpg) | Six coaches in frustum; cost framing, too distant for art judgment |

Count stills dress only cosmetic occupancy on accepted trains. Clips observe actual server counts. Fixed
[camera definitions](../../dev/look/rider-coach-cameras.ts) retain R2b numbers; stage cameras are closer.
The passenger train does not enter Roundhouse works stalls: no Roundhouse route shot or invented dusk simulation.

## Measurements and checks

These short receipts replace raw repo JSON/logs. Node 26.13.0, Blender 5.2.1 LTS. Commands run at repo root.

**GLB:** 3,196 assembled triangles; zero degenerates/invalid normals/boundary edges; shell 54 closed components,
8 topology-weld non-manifold edges at touching solids. Reproduce: `npm run assets -- rider-coach`; `node dev/assets/inspect.ts assets/built/rider-coach.glb .look/coach-inspection-new 4 0,1,0`.

**Asset freshness:** 13 fresh assets, none over size targets. Recipe hash 927b1bdc5748483c, GLB 7b3af43b0a34aabd;
no Python imports beyond Blender/math/sys, builder/inspector unchanged from base. Reproduce: `node dev/assets/build.ts --check`.

**Buddy/stills:** all 16 final clay/parts/wire/material views, both studio sides, shipped lighting and Y-turntable
opened; WebGPU, zero console/GPU errors. Reproduce: `node --import ./dev/sim/hooks.ts dev/look/rider-coach-art.ts stage` (also `home`, `pier`).

**Step motion:** 481 stage frames, zero outliers; both sides lower/fold over .25 s, root stable; consecutive rendered,
full-cycle, encoded and folding sheets opened. Reproduce: `node dev/look/asset-motion.ts --local --asset rider-coach --name coach-r3-polished --cam 4,2.7,6 --target 0,1,0`.

**Production motion:** Home 2→3 riders; RF/RR −π/2→0 with intermediate departure angles. Pier 3→4, opposite pair.
Reproduce: `node --import ./dev/sim/hooks.ts dev/look/rider-coach-proof.ts home --coach-art` (also `pier`).

**Pier capture limit:** platform bench/post obscure parts of the steps; opened stand/departure/cycle sheets plus
hinge samples support the check. An interrupted capture had no receipt; its clean rerun passed with zero errors.

**Fleet:** settled ABAB blockout 1,189 draws/1,624,824 triangles; polished 1,213/1,642,632. **+24/+17,808 fleet;
+4/+2,968 per train.** Reproduce: `node --import ./dev/sim/hooks.ts dev/look/rider-coach-fleet.ts` (exact main09c5ac670 builder).

**Pools/health:** wheels 96/144, other wheels 12/20, couplings 27/35, buffers 94/140; six coaches in frustum, zero errors.
Same fleet command; ~60 completed frames/s health samples prove live capture, not quiet-machine timing performance.

**Level:** pass, 21 reports, existing planned-track warnings; no level/golden/trace/schema edits.
Reproduce: `npm run level-check`; `git diff origin/main -- src/sim src/world src/net server test` is empty.

**Loop:** pass, canonical/alternative orders complete, dependency probes refuse out-of-order work; same rules.
Reproduce: `npm run loop -- run`.

**Lint/types/tests:** pass, 14 changed lint files, typecheck, 66 affected files/535 tests, zero failures/skips/todos.
Reproduce: `node dev/ship-check.ts` (also registry/prefab). No assertion edits; final gate rerun after docs/history cleanup.

**Resolved failure:** camera conversion initially gave four diagnostics at lines 7/13/19/25: “no-loss-of-precision: This number literal will lose precision at runtime.” (`lint: 4 problems`, exit 1).
934.3455200195312→934.3455200195313 is the identical JavaScript value, no camera move. `npm run lint -- dev/look/rider-coach-cameras.ts` and ship-check then passed.

**Prior R3 checks:** full check passed 2,382 tests (2,316 pass/65 skip/1 todo); wake→T1 playthrough passed, zero errors.
These precede polish, not new runs. Reproduce: `npm run check`; `node dev/look/playthrough.ts --to t1-done`.

**Prior roof trials:** Home platform/deck/load→roof reached, canopy unreachable; Quarry canopy reachable; Ring
routes reached, matching blockout. Reproduce: `node --import ./dev/sim/hooks.ts dev/look/rider-coach-roof.ts`; `node --import ./dev/sim/hooks.ts dev/look/rider-coach-review.ts quarry` (also `ring`).

**Moving roof qualification:** grounded on railway:train5-2 and travelled away; stationary-target `reached:false`
stays false. No collider/roof-profile change in polish, so no repeat. Reproduce: `node --import ./dev/sim/hooks.ts dev/look/rider-coach-review.ts moving`.

## Motion limits and local-only evidence

Step return retains platform side and subtracts dt until stowed, instead of resetting at departure. Home samples
show −1.470,−.836,−.210,0 radians across successive moving ticks. Riders still pop into seated visibility at
count change; no door walk is claimed. Stage clock is synthetic 4 s alternating sides; turntable diagnostic .6 rad/s.
Encoded samples show folding rather than a snap. **Real-time display smoothness is unverified**, per Codex's
video-viewing limitation; the owner retains that check.

All following paths are **local-only**, relative to this checkout:

- `.look/rider-coach-r3-polish/original-evidence/`: exact previous119MB directory, every removed PNG/JSON/log.
  `.look/rider-coach-r3-polish/original-report.md`: complete old receipts, failures, reproduction commands.
- `.look/rider-coach-r3-polish/initial/`: first polish recipe/GLB,3452-triangle inspection and captures. One
  diagnosed repair: separate end-wall bevels caused seams; continuous ring removes seams, final3196 triangles.
  Original recipe/GLB also directly under `.look/rider-coach-r3-polish/`. No paid service; token/service cost unavailable.
- `.look/rider-coach-r3-polish/inspection/`: final reimport metrics/16 views. `captures/{home,pier,stage}/` under
  the same root: all uncurated stills/manifests. `fleet/`: before/after and ABAB receipt. All remain local.
- `.look/rider-coach-r3-polish/motion/home/home-realtime.webm` and
  `.look/rider-coach-r3-polish/motion/pier/pier-realtime.webm`:18s real arrival/lowering/count/departure/folding;
  proof JSON and motion sheets beside each. Home arrival/departure encoded sheets start9.5/14.5s,12×30fps samples.
- `.look/asset-motion/1794895911245-coach-r3-polished/coach-r3-polished-realtime.webm`:8s/two stage cycles;
  curves/outliers/render/encoded sheets beside it. `.look/rider-coach-r3-polish/folding-encoded.png`:3.5s fold sample.
- `.look/rider-coach-r3-polish/stage-turntable.webm`:10.5s Buddy turntable. Prior unchanged Raw Walk_Loop control:
  `.look/asset-motion/1794893917760-coach-r3-buddy-control/` (161frames, zero outliers).
- `.look/rider-coach-r3-polish/`: check logs, archive comparison, plan and `curate.mjs` (Sharp JPEG conversion;
  reproduce with `node .look/rider-coach-r3-polish/curate.mjs`). Old roof/raw proofs: `.look/rider-coach-r2b/`, `.look/rider-coach-r3/`.

Orchestrator follow-up: **docs/research/rider-coach-r2b on main is 62 MB** for the same reason; untouched here.
R4 remains separate; no owner art acceptance is claimed. Question for the orchestrator's showing: does this
retain candidate A's passenger-coach character while its riders read clearly from either platform?
