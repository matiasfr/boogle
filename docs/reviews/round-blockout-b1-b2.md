# The Round B1+B2: review repairs and proof

14 November 2026. Branch `codex/round-blockout-b1-2`, same worktree and new commits above `3d6ffcd00`; no rebase, push or ship in this follow-up. This supersedes the earlier B1-only proof: its level tool explicitly excluded room/prop collision, and the two omissions identified by independent review were real.

## Repairs

Pip's house moves to (−110.544, −5.233), Fine Prices to (−119.522, 45.681), and the museum to (−125.268, −8.114), only 0.291 m from its previous centre, with the plan's yaws. The balcony pad and aviator secret move together to (−119.202, 53.485), still at 24.4 m. Shells, prefab fixtures, solids, boards, residents, signs, mats and interactions already use each room's frame, so follow without new catalogue records. The house/shop's old spots are clean bowl/ring terrain. Existing secret IDs, gifts, unlocks, saved discovery and all character lines remain intact.

Each room has its own level pad. The existing slab is 0.14 m above its centre's terrain datum: that value is shared as `ROOM_FLOOR`. Shallow terrain thresholds below the slab meet the doors and fade within the 2 m setback. Thresholds are a documented exception to the otherwise level town pad; no ring-road grade is changed. No relocation needed sim, server, shared catalog or namespace changes. Bay/shelf/boxes/plinth retain #1778's poses.

`YARD_DRESSING.anchor` supplies the yard find, laundry and both solid fences. The entire clue moves about 20.93 m behind the gate cottage, retaining its east opening, exact fence sizes and laundry yaw. The old yard has no dressing or fence bodies. Both fences now sit on 18 m ground, with no burial; their nearest ring clearances are 13.472 and 7.337 m, and gate-footprint gaps 6.993 and 1.470 m.

## Regression tests and measured grounding

The owner-requested `test/round-grounding.test.ts` was run against the previous B1 game source before repair: it reproduced both room intrusions, the three door/slab mismatches, and the stale yard anchor. Its full-footprint maximum is stronger than the review's interior-only sample. It enumerates terrain-triangle/footprint vertices, rather than trusting sparse samples or merely inspecting `ROOM_PLOTS`. It reads the real room floor datum and executes the actual yard rendering block with numeric stubs, capturing its ground query, laundry pose and two solid fence placements. No browser logic is mocked into passing.

| Room | Floor | Maximum terrain in full footprint | Door ground | Door gap |
| --- | --- | --- | --- | --- |
| Pip's house | 18.149075 | 18.125000 | 18.100835 | 0.048240 m |
| Fine Prices | 18.146564 | 18.125000 | 18.109110 | 0.037454 m |
| Museum | 18.140000 | 18.122770 | 18.115079 | 0.024921 m |

The selective-test dependency map names the real yard renderer, following the existing source-block test convention; it adds no prefab allowance or catalogue record. The room furnishing golden is regenerated at the new frames; its geometry, copy and state assertions are retained. The evaluated `ROOM_PLOTS` import stays honest. Coast byte pins change for the room pads/door grading, with no tree-table pin change.

## Anchor sweep within 45 m of G

Source scan plus the existing `checkPropGrounding()` inventory (15 nearby supports, all pass) and production level grounding found no additional stale cottage anchors. Scope and each retained group:

- Pip and the shop/museum residents: `CAST` is room-local; `roomToWorld` and indoor tests read the moved rooms. House mat/postbox/window box, shop awning/sign/front and museum apron/sign are attached to room groups. Every room solid and board uses the same transform. Old saved room poses are checked against current `ROOM_PLOTS`.
- Balcony platform/solid/column/vane/secret target derive `padById('balcony')` or `SECRETS`; they follow the moved pad. Yard laundry and both fence bodies were the only stale literal anchors found and are repaired above.
- The gate is the sole `TOWN.start` cottage. `openingBuildings()` draws that and camp cottages; removed opening cottages leave no hidden bodies. `TOWN.wood/stone` are growth/clearance data, not rendered extra cottages.
- Locals wander the ring and green and sample actual ground; forge crew stays at the forge. Greeter, axe stand, tools chest, rack, recovery rack, forge/frame, hall/island stop bodies and crane keep their forge/station anchors and ground queries. No removed cottage anchor is used.
- Bay, shelf, boxes and plinth retain their current main frames. The bay's hall end remains in main's shallow apron rise. Crystal spots and other secret sites are outside this 45 m area.

The nearby support rows comprise rack feet (4), recovery-rack posts (4), and Q1 frame posts/floor/feeder legs (7). This inventory alone does not cover rooms or yard dressing; the new explicit regression tests cover those omissions. This was a source/data and support sweep, not a live interaction traversal.

## Clearances and main comparison

All 362 complete `LAND_TREES` rows deep-equal main: **yes**. SHA256 `2d08b2bf68b0c38808e91472706f33f123eab0d56ff058d5365b2baac50d8ca1`; nearest trunk 49.123505 m from G. No WORLD_NS change. The baseline was captured with main's Place/view data restored temporarily and restored byte-for-byte before branch tests; baseline main `ff7f42e6b` (later main changes do not alter these level data).

| Level fact | Main | B1+B2 |
| --- | --- | --- |
| Grounded placements | 5,278 | 5,275 |
| Timber decks/platforms against track | 563 | 399 |
| Village-to-machine long walk | 431 m | 430 m |
| Commons mark height | 17.4 m | 17.5 m |
| Summit → balcony | 143 m / 187 m budget | 147 m / 187 m budget |

Level-check has 0 problems. All 175 indented progression/reach assertions retain their outcomes; the only changed assertion text is the balcony's 143 → 147 m. No ability/gate order changes.

Crown edges, bay/shelf respectively: ring **5.622/8.070 m**, dock **41.128/42.561 m**, plot 3 **5.011/1.149 m**, bowl **11.622/14.070 m**. Shelf minimum remains 1.1 m. Quarry corner-to-centre-line: plot 2 **3.624795 m**, plot 3 **3.874597 m**, plot 6 **3.650000 m** (verges after subtracting 2.4 m half-road: 1.224795/1.474597/1.250000 m). Dock centre-line: plot 1 7.795706 m; gate 8.661731 m.

The source-linked sheet prints all eight planned wall gaps below 4 m: house/museum 2.671, museum/plot4 3.671, shop/plot1 3.003, shop/plot2 3.003, shop/plot8 3.758, plot2/plot8 3.331, plot3/plot5 2.800, plot5/plot6 2.900 m. None is below 2.4 m. TODAY now has the actual rooms, balcony, yard fences and laundry; they agree with THE ROUND. Bought-plot blocks and clock footing remain B3, not built. Paint/height cells are actual baked bytes.

Future rotunda: no B1/B2 ground conflict. The proposed r25 arc at (−55.445, 19.178), bearings 120°–260°, stays at least 35.111 m from G, 21.111 m outside the bowl and 15.111 m outside the ring; the ~7.5 m back-wall/plot3 gap is unaffected. Its future pad/pit remains unbuilt.

## Final checks and inspected images

Fresh game stills tested clean `1594f823b`; the through-T1 bot tested `4fb6d30f4` (the game source is identical). Later changes only register the new test's source dependency in `dev/ci/unit-select.ts` and complete these docs. Both still manifests preserve the exact worker tree, separately from trusted harness `d87c0571`.

- [Dock-street manifest](../../.look/evidence/1794653169782-46438/evidence.json): opened `b1-b2-dock-seeded-still.png`. At the top of the dock street toward 70°, the gate cottage is left, Fine Prices stands on the right rim, and the green opens toward the hall. The former house/shop obstruction is gone; curio frames stay beside the hall.
- [Overhead manifest](../../.look/evidence/1794653169956-46439/evidence.json): opened `b1-b2-green-seeded-still.png`. The occupied rooms stand on the rim; the ring/green are open; laundry and both fences enclose the relocated yard behind the gate; the balcony stands behind Fine Prices. The bank is shallow and subtle from this height: its 0.8 m drop is established numerically, not inferred from pixels. The stepped paint edge is visible blockout quality.
- [Through-T1 manifest](../../.look/evidence/1794652274880-3070/evidence.json): read the entire report and opened `run/end-still.png`. All expected beats arrived; errors, walked-into stalls and water falls are zero. Two stationary wake/laying waits total 2m41s. This does not traverse the relocated rooms or finds, and is not B4's full route.
- [Plan-sheet manifest](../../.look/town-plan-sheet/manifest.json): opened `town-plan-sheet.png`. Rooms, balcony, gate, yard dressing, both path heads, ring and curio crowns now agree as built with the plan. No room movement arrows remain. All eight wall gaps below 4 m are printed; the minimum is 2.671 m. Bought-plot blocks/clock footing still await B3.

Both stills passed WebGPU/completed-frame and page/console health checks. The overhead passed under machine load: this is execution and inspected still evidence, not timing or feel proof. Two earlier `--at q6-done` attempts failed before rendering because the latest through-T1 save list had no such beat ([dock failure](../../.look/evidence/1794652274917-3068/evidence.json), [overhead failure](../../.look/evidence/1794652275001-3069/evidence.json)); the successful captures use the existing trusted `--rail-seed q6-done`. No bot failure occurred.

The first full check caught a missing type annotation in the test's numeric vector stub; the second caught the source-closure registration needed for selective CI. Both are fixed without relaxing regression assertions. `npm run check` passes (1,935 unit tests: 1,934 pass, 0 fail, 1 existing longer-fleet TODO; lint, typecheck, level, assets, prefab freshness and production build pass). All 224 standalone prefab tests pass, as do the 26 focused grounding/layout tests, registry and explicit Place level-check. Registry reports no debt growth: 20 suppressions, 0 knots, 15 allowances/24 max, unchanged from main. Review stamp **`29056451b39b`** (six test/fixture paths), from `npm run review-stamp -- . --no-fetch`; the no-fetch flag respects the job's network restriction. [Validation manifest and logs](../../.look/b1-b2-validation/manifest.json). No independent review of these repairs is claimed.

## Remaining defects and limits

P1/P2 review regressions repaired. P3: existing hall/rail apron reaches r17 (rather than the estimated r18) and rises up to 0.22 m; tests/docs retain this explicit exception. The stepped 2 m paint edge is blockout presentation; D2's detail mesh remains separate. B3/B4 blocks, full route/reach traversal, phone size, real-time feel and performance remain unverified. **not tested on a device**.
