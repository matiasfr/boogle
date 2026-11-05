# Track-layer machine art and deck places

## Current: coordinator authorizes whole-panel commits (5 November)

This supersedes the blocked proposals below. The head retains continuous travel and the two-second departure, but only the authority accepts a complete panel at its end boundary. One accepted panel index commits its rail/sleeper instances and supporting colliders together, removes one stock unit, and triggers local contact clunk/dust. The upcoming panel is a rigid in-transit compound of those same eventual track instances; it has no collider while carried. No hidden committed track is used.

L1 uses 12 panels partitioned 3/3/6 at the three stops. Ordinary panels are 86/6 = 14.333333 m, or 2.866667 s at 5 m/s cruise. T1 and T2 finish with 12.333333 m and 5.333333 m closure panels. L2 divides each stretch into its existing rail-stock count, so one stock decrement represents one cycle and the final panel ends exactly at the station. This redistributes L1 decrement timing; total stock, station bills and head throughput remain unchanged. Shorter/faster cycles compress the same distance-normalized choreography.

To keep both bogies behind the last committed frontier, the body waits at its original 2.4 m station setback while the continuous head builds up one maximum panel of clearance, then follows at 16.733333 m. After a closure the cars roll forward on the newly committed track to the original station position, without advancing the head or spending stock. This repairs the first full bot's Q2 blockage beside the displaced power pack. Q1 retains its original short turntable approach. These are physical motion changes: the head's two-second departure integral stays, but the bodies initially wait for panel clearance. Body shapes, stand surfaces, seat/exits and rear-step local anchors stay unchanged. The gantry extends over the pending panel; rigid trolley, three nested hoist slides and two jaws use their own transforms. Two side stacks hold panels clear of the rear aisle. The existing sleeper fork stays.

The additive motion slice also saves bounded setback and a parking flag. Accepted contact outrunning a follower's feed retires that feed's local epoch; late callbacks cannot restore consumed stock. A lagging saved presentation head never invalidates an accepted cursor: restore moves it up to the committed boundary. Live reconciliation reads full-precision motion. These cases require focused contract evidence and independent review, not a visual-only approval.

**Shared/saved contract, independent coordinator review required:** additive `trackPanelsV1` slice records integer per-line commit cursors and full-precision motion; additive `trackPanelV1` accepted authority messages carry generation, line, stage and index. Duplicate/old commits do nothing. Quiet snapshots repair missed commits and restore without contact effects. Old saves without the slice retain the station-based fallback. The prototype capability becomes `placeCoopPanels1` so old continuous-collider peers cannot join this room. This is prototype Host state, not a new lockstep operation. Restore, late join and full routes must be evidenced before declaring completion.

Current validation is pending. Art budgets are provisional: shell 9k decoded triangles/29 main draws, loaded machine 30k triangles/44 main draws, excluding avatars and the world's in-transit panel batch. These are draw/count budgets, not performance claims. Reference shots are targets rather than measurements; no new external generation/research is used.

## 5 November follow-up: prefabricated panels

The owner now directs one prefabricated panel (both rails and their sleepers) per existing stock decrement. The approved trolley, three-stage hoist and two clamps pick from stacked panels, carry forward, lower, release with a small clunk/contact dust, then return empty. Every moving part remains rigid. Collision, authority, throughput, seats and exits stay unchanged; normal-camera evidence must not stage the camera. This supersedes the prior single-rail mapping question.

Measured stock-grid lengths and cruise periods, derived from the current route spans, rack counts and speeds:

| Stretch | Panel length (m) | Cruise cycle (s) |
| --- | ---: | ---: |
| L1 | 13.4167 | 2.6833 |
| Q1 | 5.8333 | 1.1667 |
| Q2 | 6.6667 | 1.1111 |
| Q3 | 4.6667 | 0.7778 |
| Q4 | 6.7500 | 0.84375 |
| Q5 | 10.8333 | 1.2037 |
| Q6 | 6.1250 | 0.68056 |

The two-second departure ease naturally stretches the early cycles. Q5/Q6 stock can reach 24/32, so the old twelve-visible-rail cap cannot describe a conserved panel magazine. Curved/sloped panels must reuse the actual existing piece matrices; a straight long prop will not match the committed bed.

**Unresolved integration constraint, verified by code review:** `stepLay` commits track continuously with `track.layTo` before calculating each stock decrement. At a decrement head H, the proposed whole panel occupies approximately H−L−2.2 through H−2.2; the deck and power bogies already ride within that span. Keeping those committed pieces visible duplicates a carried panel; hiding them until release exposes invisible collidable track; placing ahead shows uncommitted track. Side-loading below the body can avoid physical intersection but cannot solve this visibility conflict. L1 also stops between stock boundaries: T1 at s=150 is 0.75 m past the stock boundary s=150.75, requiring either a partial-panel reveal or a release without a decrement.

A narrow owner clarification is pending: permit batching only the visuals at stock boundaries (with an explicit partial reveal at station stops), or retain continuous visible track and pause whole-panel implementation. No timing, collision, visibility or magazine workaround has been implemented. This is distinct from the now-settled choice of panels over individual rails.

## 5 November follow-up: readable running gear and approved gantry storyboard

The owner approved `boogle-daily/.look/previz/track-layer-motion/board.md` and its six shots. The gantry integration has a surfaced mapping conflict: existing rail pairs commit every 3 m (0.6 s at normal 5 m/s cruise), while stock decreases proportionally over much longer distances. L1's stock interval is 2.683 s at cruise; later stretches range from 0.681–1.204 s. A literal conserved one-stock-item/one-track-rail cycle cannot describe all existing rail meshes without changing gameplay. Owner clarification is pending between representative stock-decrement cycles and pausing that mechanism. No dependent gantry change starts until that choice is resolved.

Independent approved wheel revision: retain 0.13 m tread radius, ±0.5 m rail gauge and every collision/seat/exit anchor. Give the existing wheel meshes pale hubs/spokes with dark steel treads through vertex colours, retaining one draw per wheel. Two separately pivoted cream side rods join the power bogie's two axles (1.6 m spacing); 0.07 m crank radius, X ±0.72 m, within the power body's ±0.8 m collision width. A chamfered lower power-pack skirt exposes the wheels without changing the 1.6 × 3 m standing top. Wheel shape/axle heights and the sleeper fork remain unchanged. Normal-camera and close travel video must show the resulting motion; counts, not shared-machine timing, determine the budget. Shell ≤10k triangles/22 draws/128KB, loaded ≤16k triangles/36 main draws. New geometry is closed, with only the four existing warning-stripe quads intentionally open.

## 5 November follow-up: rail bogies

The owner's later direction supersedes the crawler silhouette below: the machine rides on the rails just laid. This bounded revision keeps every gameplay/collision/seat/exit anchor and the existing fork action. Rail pick-and-place waits for a separately approved storyboard.

Reference roles: `boogle-daily/.look/previz/track-layer-details/shot-2.png`, `shot-3.png` and `shot-4.png` retain chunky gantry, chair, power-pack, bevel and colour language. Their crawler/discs, proportions and extra supports are not measurements or authority. Existing generated sheets and this task's explicit wheel direction supply the revision brief; no new external generation/network use.

Measured: rail centres X ±0.5 m (`rail.ts`), default kit top Y 0.235 m (0.1 m sleeper-top placement + native 0.135 m profile), deck underside Y 0.52 m, deck top 0.7 m. Inferred wheel design: tread radius 0.13 m, flange radius 0.15 m, axle Y 0.365 m, tread centres X ±0.52 m with tread width 0.14 m spanning the rail heads; inward flange outer face at |X| 0.45 m clears the rail head's inner face at 0.462 m. Compact wheels preserve the low deck instead of raising collision or seats.

| Rigid part | Pivot / range | Purpose |
| --- | --- | --- |
| Eight open-spoke flanged wheels | Own X axle; unlimited signed rotation = travelled metres / 0.13 | Four beneath power pack (local Z ±0.8), four beneath rear deck (Z -1.35, -0.45) |
| Two simple bogie frames | Fixed in each body's pitched frame, isolated from wake shudder and shell squash | Support the power pack and rear deck; no front gantry wheels |
| Existing gantry / fork | Existing pivots and formulas unchanged | Cantilever ahead over unlaid ground; no new pick-and-place mechanism |

Motion storyboard: **rest → pull away:** wheel angle holds during wake/slip, then increases with actual signed rendered body displacement through the existing ease-out. **cruise:** each body's wheels cover the same 3D path distance as that body; no independent clock spin. **stop:** angle holds when position holds. Explicit pose snaps rebase the odometer, not roll through a teleport. Turntable lateral/yaw motion is not forward wheel travel. No coupling rod in this pass.

All wheel geometry is canonical in the Blender recipe. Closed annular flanges/treads, solid hubs/spokes and frames; overlapping closed pieces are deliberate. Existing four rear warning faces remain the only open surfaces. Moving wheel roots retain explicit pivots despite GLB decode transforms. Budget: shell ≤10,000 triangles / 20 main draws /128 KB; loaded machine ≤16,000 triangles /34 main draws, excluding avatars. Baseline loaded count: 11,614 triangles /22 main draws /14 shadow meshes. Runtime motion is Local presentation, with no new shared state. Check actual wheel angles/displacements and stills/video, never timing/frame counts as performance evidence under shared load.

## Goal

Give the track layer a recognizable crawler-and-open-gantry construction silhouette, with two proper places to sit on its deck, while preserving its current material-to-track action and physical envelope. Serves DESIGN.md **11. Show, don't tell**, **8. Designed for drop-in, drop-out**, and **Small and readable**.

The owner's 5 November exception authorizes this work before the round-4 replay, on this branch only. Do not push or ship; the replay remains the owner gate. The explicit task is implementation authority for this bounded plan, not approval of new gameplay or final art.

## Design

### Reference and bounds

Use the manufacturer mechanisms already recorded in [solo-design-pass, topic 5](../research/solo-design-pass.md#5-make-the-track-layer-catchable-then-give-it-its-own-machine-shape): Plasser ConstructionLiner/SVM 1000's crawler, sleeper-feeding gantries and rail guides, and Harsco NTC's open laying beam/guide rollers. These are locally recorded primary-source findings; no fresh web verification is permitted by the task's local-network restriction. The real machines require prepared formation. Their construction silhouette is a reference, not a claim that they build Boogle's gorge supports.

Measured from the current code, in metres and game axes (+Y up, +Z laying direction):

| Landmark | Existing contract to preserve |
| --- | --- |
| Working flatbed | `TRAILER`: 2.2 m wide, 3.2 m long, top 0.7 m above rail frame |
| Broad rear step | 2.8 m wide, 0.6 m deep, centre Z -1.9; top 0.7 m |
| Rear power unit, currently locomotive | `LOCO`: 1.6 m wide, 3 m long, solid top 1.75 m; 3.7 m behind flatbed |
| Cradle | Existing incoming target `(0, 1.0, 0.7)` in flatbed frame; log rows and capacity unchanged |
| Rail rack | Existing incoming target `(1.3, 0.8, 0)`; transforms/counts unchanged |
| Rail/sleeper handoff | Keep current held-rail transform, fork pivot and travel-derived motion |
| Departure | Existing two-second ease-out in `run.ts`; no tuning |

The new canonical recipe is `assets/src/track-layer.py`, with named constants or a same-name JSON sidecar. Convert `(x,y,z)` game to `(x,-z,y)` Blender and export Y-up. Use a chunky enclosed power pack over the existing rear solid rather than a locomotive boiler/cab, broad low crawler housings, an open working gantry, a visible magazine and a large laying mouth. Keep real negative space above the cargo and leave the rear step exposed. Do not put an open void through the existing rear collider: its 1.75 m stand surface must still have a visible top. No tiny bolts, new lights, new textures or ROM-derived material.

Use the existing Place `paint` material roles: amber/orange working parts, cream edges, dark iron running gear and timber deck. Author closed primitive solids with bounded bevels and weighted normals. Merge stationary parts by material and body frame; repeated wheel/roller geometry is instanced. Initial allocation: at most 12 main draws and 10,000 triangles for the replacement machine shell, excluding existing cargo, lights, particles and seats. These are project allocations, not measured hardware limits. Report the actual totals and whole-scene delta before accepting the result.

### Geometry ownership and motion

Create `src/proto/place/machine-model.ts` for the machine assembly, asset loading/material assignment and Local cosmetic motion. Its factory returns the existing `MachineLook` shape (`cars`, `chimneyTop`, `heldRail`, `slip`) and any explicit update callback needed by its owner. `rail.ts` consumes that result; it continues to own kinematic bodies, platform registration, cargo, laying events and movement. Avoid importing `rail.ts` back into the new module.

Retain existing smoke, waking, firebox and lamp behavior and named attachment transforms. A short exhaust pipe belongs to the power pack without recreating the locomotive boiler. Do not change the standing platform IDs, `makeCar`, `supportAt`, `topAt`, body shapes, `run.ts`, save shape, train appearance or material-to-track accounting. The fallback machine view must use the same new silhouette or have its retained limitation stated explicitly.

Local shell geometry and cosmetic motion need no shared state. Existing machine movement and cargo state keep their current authority. Player movement remains **Owner**, through the existing seat implementation. Seat occupancy remains **Host**, using the existing `placeSeatRequest`, `placeSeatPose` and `placeSeatGrants` path. Add no presence fields, messages, snapshots, ops or control actions.

### Two deck places

Remove the old rear cutter guard from the machine shell; it currently occupies the required space at Z -0.82. The forward cradle and its stand/access points remain where they are.

Register two rear-facing chairs through `registerSeat`, grouped as `machine-deck`, with stable IDs `machine-deck-0` and `machine-deck-1`. Use the existing `seatMesh` and supported Buddy seated pose. Proposed exact layout:

| Item | Platform-local position/facing |
| --- | --- |
| Chair meshes | X -0.55 / +0.55, Y `flatbed.hy`, Z -0.65, yaw PI |
| Seated anchors | X -0.55 / +0.55, Y `flatbed.hy + seatHeight`, Z -0.90, yaw PI |
| Separate exits | X -0.55 / +0.55, Y `flatbed.hy + PLAYER_R`, Z -1.85, yaw PI |
| Availability | `flatbed.y > -30`, matching existing visible-platform availability |

Chair backs remain behind the forward cradle wall. Seated avatar centres are 1.1 m apart, exceeding two 0.46 m player radii. Both exits are within the broad rear step. The 0.30 m gap between chairs is **not** a standing aisle; approach and leave from the broad rear step. Verify both chairs with full cargo, hats and the existing seated pose before committing to this layout.

The task explicitly preserves collision and stand points. Consequently do not copy the train's new `setShapes` or `topAt` furniture solids into the machine. These chairs are visual sitting targets over the existing deck. Their backs are not new blocking geometry, and this limitation must be reported. If that violates the owner's intended solidity, stop this part for the owner rather than changing collision silently.

Interact/Jump already supply Sit and Stand through `verbs.ts` and `seat.ts`; no new key, touch target, pad assignment or guide copy is required. Do not alter The Boogler's lines.

## Steps

- [ ] **1. Record the exception and baseline.** Add a dated owner-exception entry to the relevant existing decision log, narrowly stating branch-only early art/seats work and replay gate. Read the applicable capture, GPU and count guidance; record baseline machine draw/triangle counts, collider descriptors, stand points and rear-approach image through `.look/see-client.ts`. Open its PNG. Retain the initial visual question: “Does this read as a track-construction machine with an obvious catchable rear step and two safe-looking places to ride?” No source edits while a broker run is active. Verify clean baseline with existing checks, not a new harness.
- [ ] **2. Author and inspect the shell.** Add `assets/src/track-layer.py` and `assets/src/track-layer.json`, build with `npm run assets -- track-layer`, retain the generated GLB/manifest, and register the descriptive entry in `character/descriptors.ts`. Use `dev/assets/inspect.ts` and inspect all clay/parts/wire/material front/side/back/three-quarter views. Read decoded normals, topology, bounds, material and triangle metrics. Retain build hashes, dependencies and tool versions. Add no tooling framework. `npm run check` must remain green.
- [ ] **3. Integrate the owned view.** Create `src/proto/place/machine-model.ts`; switch only the machine view import/call in `rail.ts`. Reuse the existing kit geometry/material helpers where appropriate, with a narrowly exported helper from `look-kit.ts` if needed; keep imports acyclic. Remove or retire only the old machine-specific view path after confirming trains retain their body and wheel path. Keep physical/motion/cargo contracts above byte-for-byte where possible. Update `docs/game-design/place.md` in the same commit. Verify by diff, counts and a rear-approach broker capture; open the PNG and compare against the named question.
- [ ] **4. Add the two seat registrations.** Register the two chairs and separate rear-step exits in `rail.ts`, using `seat.ts` unchanged. Retain all machine body shapes, `topAt`, `supportAt` and platform dimensions. Capture both occupied choices with cargo loaded, Interact stand and Jump exit; compare readback to the authored local anchors. Use the existing trusted `world-inputs` scenario, not a new test harness. Document the nonblocking chair-back limitation and update the obsolete “machine seats wait” as-built paragraph.
- [ ] **5. Close the visual loop.** Stage the actual built shell beside Buddy with fixed camera/light and existing game materials. Inspect Local motion using the asset-author/look workflow, consecutive video frames extracted with ffmpeg and curves. Through the broker, run the full Place bot, read its report even on failure, list saved beats and capture rear approach, machine movement, seated riding and track laying. Open every reported PNG. Allow at most the initial result plus two diagnosed repairs, keeping prior versions/evidence. Timing/frame numbers under shared-machine load are not performance or smoothness evidence.
- [ ] **6. Verify and commit locally.** Run `npx prettier --write` on changed supported files, `npm run lint -- <changed TypeScript files>`, then `npm run check`; fix failures and repeat affected visual/scenario checks after final source changes. Review/simplify the diff. Commit small imperative units with the DESIGN.md principles in each body. No push and no `npm run ship`. Retain evidence manifests, geometry/draw counts, opened-image list, observed defects, bot failures and quiet-rerun/device limitations for the final handoff.

## Risks

- A gantry that crosses the unchanged solid power unit or blocks the cradle would promise unusable space. Match the current solid envelope and preserve exposed stand surfaces.
- Rear chairs leave no central aisle. Test rear access and both separate step exits; do not widen the deck to make the composition easier.
- Visual chairs without new solids are a deliberate consequence of unchanged collision. Do not report physical chair-back collision as implemented.
- Asset quantization retains node decode scales; bake or preserve the transforms through the established loader. Empty exported sockets may be pruned; validate runtime landmarks.
- Separate machine geometry must not copy train accounting or mutate shared material instances. Use owned materials where mutation is necessary.
- Seat authority and cancellation already exist; reuse them without adding state. A mixed older build lacks the new seat IDs and cannot arbitrate them as lead; this branch is not for deployment before replay, and mixed-build machine-seat compatibility is unverified.
- Counts can be compared under shared load; GPU/wall times and smoothness require a quiet rerun. No `perf` timing claim is justified by this shared machine.
- `rail.ts` and `look-kit.ts` are hotspots. Parent already ran `npm run inflight`; this planning subtask makes no network request and owns only this plan.

## Open questions

No new design approval is required to start the authorized shell and existing-system registrations. The final owner art question is: **Does the open gantry, chunky power pack and rear deck read as a friendly track-building machine?** Collision remains unchanged; if the owner requires solid new chair backs, that is a separate explicitly approved exception before modifying physics.

Primary-source findings are locally available but not re-fetched. Real-time feel, quiet performance and device behavior remain unverified; not tested on a device.
