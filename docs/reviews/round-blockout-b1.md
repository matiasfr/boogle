# The Round B1: built ground and streets

14 November 2026. Branch `codex/round-blockout-b1-2`, in the original worktree. Rebased onto local `origin/main` at `753f0b4d8`, including #1778. The original B1 branch is preserved. Nothing pushed or shipped. Browser evidence below tested the clean source commit `eeda9397922c3d097b609a969d7176f8eca7195a`; the completion commit adds this report and ticks B1, without changing game source.

## What is built

The r38 pad with its 8 m edge, road-plot pads, 0.8 m green drop (`TOWN_GROUND.green.drop = 0` restores level), ring/dock paint, both path mouths, x −97.85 quarry thread, bridge index 8 pinned at both river endpoints, one moved gate cottage, three cottages removed, moved `yard` find and locals' ring/green wander points. Later shore grading preserves the west edge of the pad. The furnishing golden imports evaluated `ROOM_PLOTS` rather than extracting a literal. Coast-byte pins and only the changed commons-height fact in the leg-2 report are updated.

Main's `FINDERS_B`, `SHELF_B` and asymmetric drawn-crown footprints are retained. B2 now moves only the rooms and balcony. The bay, boxes, shelf and plinth are already moved; B2 must not move them again. No character lines, catalogue records, prefab debt, namespace or files under `src/sim`, `src/world`, `src/net` or `server` are changed by this branch.

## Measured clearances

Horizontal distances from the drawn crown edges; ring means its outer r20 edge, dock means the finite 8 m street edge, and bowl means the r14 bank edge. These numbers are emitted by the source-linked plan sheet, rather than copied into game data.

| Crown | Ring | Dock | Plot 3 | Bowl | Ground under centre/corners |
| --- | --- | --- | --- | --- | --- |
| Bay | 5.622 m | 41.128 m | 5.011 m | 11.622 m | 18.000–18.210 m |
| Shelf | 8.070 m | 42.561 m | 1.149 m | 14.070 m | 18.000 m |

The shelf keeps the existing **1.1 m minimum** to plot 3. The bay's hall end remains in the existing rise, as main intends; B1 does not regrade its frame or change `CURIO_Y`.

Quarry corner-to-centre-line distances: plot 2 **3.624795 m**, plot 3 **3.874597 m**, plot 6 **3.650000 m**. Subtract the 2.4 m road half-width for verges of 1.224795, 1.474597 and 1.250000 m. Thus the earlier uniform 3.65 m estimate is not the measured result. Dock centre-line distances: plot 1 7.795706 m; gate cottage 8.661731 m.

**No B1 ground conflict with the proposed rotunda.** Its r25 arc at (−55.445, 19.178), bearings 120°–260°, comes no closer than 35.111 m to G: 21.111 m clear of the bowl and 15.111 m clear of the ring. The plan's approximately 7.5 m back-wall gap to plot 3 is unaffected. Where grading areas overlap, both want 18 m. The future arc still spans ground about 17.848–18.652 m and needs its own pad/pit; no rotunda work is implemented here.

## Checks and exact comparison with main

`npm run check`, all 224 standalone prefab tests, `npm run registry`, and `npm run level-check -- --place=place` pass. Full unit run: 1,927 tests, 1,926 pass, 0 failures, 1 existing longer-fleet TODO. No debt growth. Level-check: 0 problems, **all 177 assertion lines identical to main**, including every progression line.

| Level fact | Main | B1 |
| --- | --- | --- |
| Grounded placements | 5,278 | 5,275 |
| Timber decks/platforms against track | 563 | 399 |
| Village-to-machine long walk | 431 m | 430 m |
| Commons mark height | 17.4 m | 17.5 m |

The balcony remains 143 m from the summit (budget 187 m); its B2 move is not included. Main's baseline was measured with the six B1 place-data files temporarily restored from `origin/main`, then all six restored to the committed branch before testing/capture.

**Tree table identical: yes, all 362 complete rows**, not only the count. Deep equality against the new main snapshot passed; the railway tree pin passes too. Nearest trunk is 49.123505 m from G. Serialized table SHA256: `2d08b2bf68b0c38808e91472706f33f123eab0d56ff058d5365b2baac50d8ca1`.

Review stamp: **`2778a90f1afa`**, from `npm run review-stamp -- . --no-fetch` (network restriction). Four changed test/fixture files trigger review. No independent review is claimed. [Command logs and measurement manifest](../../.look/b1-2-validation/manifest.json).

## Images actually opened and what they show

- [Dock-street evidence](../../.look/evidence/1794647477409-89410/evidence.json): opened `b1-2-dock-still.png`, q6-done, world camera (849.3, 19.7, 33.1) toward 70°. The cottage reads on the left, the broad street leads in and the hall is visible through the middle. The old shop/balcony obscures part of the green until B2; the moved bay no longer fills that central gap.
- [Overhead evidence](../../.look/evidence/1794647478502-89424/evidence.json): opened `b1-2-green-still.png`, camera (885, 88, 32) toward G. The painted ring is continuous; the paired curio frames stand outside it beside the hall. The grass bank is shallow and the depth is subtle from this height: 17.2 m at the centre is established by terrain/data assertions, not a depth estimate from pixels. Pip's old house and the shop still occupy the green/inner edge as the intermediate B1 plan expects. The 2 m paint edge visibly steps; D2's detailed kerb/green mesh is not built.
- [T1 bot evidence](../../.look/evidence/1794647479508-89459/evidence.json): read the entire report and opened `run/end-still.png`. All expected beats arrived; errors none; walked-into stalls 0; water falls 0. Two stationary waits total 2m44s at the wake/laying beats. Passed under load: execution proof, not timing or feel. This is through T1, not the full B4 route.
- [Plan-sheet manifest](../../.look/town-plan-sheet/manifest.json): opened `town-plan-sheet.png`. TODAY uses actual ground/paint and shows the gate, yard, path heads and both crowns. THE ROUND retains the later room/plot plan. Both curio crowns are already at plan; only the three still-unmoved rooms have movement arrows. Blue/tan cells show ground below/above 18 m; the shallow green, pad edge, paths and trees are source data. Terrain/paint bytes now participate in the stamp. This is B1's sheet, not a completed B4 block/room-slot audit.

Both fresh game stills passed WebGPU/completed-frame health checks with no page, console or graphics errors. Both manifests record unchanged clean source before/after. Old captures are not the reconciliation proof; motion sheets were not used as evidence of real-time smoothness.

## Defects and limits

P1/P2: none found in B1. P3: the hall/rail apron reaches inward to about r17 rather than starting beyond r18 as estimated; its existing rise is at most 0.22 m and the measured exception is explicit in tests/docs. P3: old rooms obscure/occupy the green until B2. Coarse paint is blockout presentation, with D2 still separate.

B4's full route, reach probes, phone views, ring walk and performance remain unverified. Real-time feel is unverified. **not tested on a device**.
