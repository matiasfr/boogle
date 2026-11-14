# Round B1+B2 rebase onto main

14 November 2026. New branch codex/round-blockout-b1-3, rebased onto fetched origin/main at 8ce8ce7be (#1794, including #1789–1793). The reviewed codex/round-blockout-b1-2 tip 75dd42606 is preserved. No force, push or ship.

## Conflict resolution and every hand-edited line

Git reported one conflict, in test/coast-regions.test.ts, while replaying the first B1 commit. I selected that commit's existing interim pins to allow its later reviewed updates to replay, then replaced the two final pins using the test's documented PRINT_COAST_BASELINE command. No terrain source was hand-merged. Range-diff shows commits 2–8 replayed unchanged; the first differs only in the old-side coast-pin context.

The complete zero-context patches list every changed line (including deletions and formatting): [test resolution](../../.look/b1-3-validation/manual-resolution.patch), [semantic street integration](../../.look/b1-3-validation/street-integration.patch). Source/test inventory:

| File | Final lines | Exact purpose |
| --- | --- | --- |
| test/coast-regions.test.ts | 95, 96 | Replace texture/sample digests with 327e46c71c9247bb3b57c9757ead81b307be5073de15acf8c1e685da933f5a3d and 2b3c292e11f5bbda3deca4c8e38b318bea96c947f19e81f80a1f96909e372364. |
| test/path-field.test.ts | 11–15, 17–20 | Correct the comment; compute the moved camp segment's perpendicular; probe across it; require both direction components to match. The 1e-9 edge tolerance stays. |
| src/place/path-field.ts | 2, 3, 4, 6, 28–37 | Correct the header, import existing Round data and VILLAGE.y, add the closed ring and full-width dock runs to the replacement renderer's field. No old path is removed or retuned. |
| docs/game-design/place.md | 22 | Document the necessary renderer integration and its 2.1 cm maximum ring approximation. |

The new report itself records the work; it changes no behavior. Main's test/terrain-pass-island.test.ts, src/place/home-station.ts and all GRADED entries are untouched. Home-station's file SHA256 matches main exactly: 501dcf8203b9c08adf291e23987cb49a00756086773832257efebf6e9e4d818d. Main's YARD/eased bed/lever/garage values remain; the layout diff against main contains only the reviewed Round path, cottage and room changes. Nothing under src/sim, src/world, src/net or server differs from fetched main. WORLD_NS and every character line are unchanged. No ROM data.

## Semantic merge conflict found by looking

The first fresh dock and overhead captures executed successfully, but showed the ring absent and the dock street narrowed: main's tread material replaced the old pathMask colour layer, while its field listed only PATHS and SHORE_PATH. This was a visual failure despite all required checks passing. The before manifests are [dock](../../.look/evidence/1794657502680-68731/evidence.json) and [overhead](../../.look/evidence/1794657502682-68732/evidence.json). Both still PNGs were opened.

Preserving both reviewed intents required adding B1's already-authored streets to main's replacement field. The ring uses its existing r14–20 data as a closed 64-segment run; maximum chord deviation is 2.1 cm, below the 1 m field texel and the former 2 m terrain paint cells. Dock width remains 8 m. The existing main material, treads, terrain, colliders and yard values are unchanged. This is the only manually authored game-source integration beyond the two test fixes; it is necessary to retain the Round streets after this merge, and is explicitly disclosed rather than treated as a pin-only rebase. The independent review of B1-2 predates this small integration; no new independent review is claimed.

## Generated data and checks

Coast pins came from the test's own PRINT_COAST_BASELINE=1 command, as its header directs; only the digest rows changed, not dimensions/transforms/lattice/assertion logic. The town-plan sheet was regenerated with npm run town-plan-sheet and opened. No tracked generated file was hand-merged; inherited prefab fixture/freshness checks pass.

After the last source edit: node dev/ship-check.ts passes (registry, 16 lint files, typecheck, 94 selected test files / 800 tests); npm run registry passes with no debt growth (20 suppressions, 0 knots, 15 allowances/24 max); npm run level-check passes all 13 reports, with 0 reported problems; all 42 focused tests pass (coast-regions, terrain-pass-island, path-field, town-plan, round-grounding, curio-layout). npm run check also passes: 1,983 unit tests, 1,982 pass, 0 fail, 1 existing longer-fleet TODO, plus lint/typecheck/level/assets/prefab freshness/production build. All 362 complete tree rows still match the reviewed/main baseline. Initial failures were the two stale coast pins and the old world-x path probe; they are fixed.

## Review-stamp output

Main was explicitly fetched before rebasing; --no-fetch keeps this report against that same baseline.

~~~text
> boogle@0.1.0 review-stamp
> node dev/review-stamp.ts . --no-fetch

  review test/coast-regions.test.ts: assertion change (first: - texture: '3664f87252e673d66d37df00e5efe0284444a930861668de1ad19a0d5d4c9d3b',)
  review test/fixtures/prefab-leg2-report.json: assertion change (first: - "message": "  ground under the root 3.0 m, under the stop 2.4 m, under the platf)
  review test/fixtures/prefab-rooms.json: assertion change (first: - "x": 686,)
  review test/path-field.test.ts: assertion change (first: - const side = pathAt(mx + TREAD_HALF.bold + 1, mz);)
  review test/prefab-furnishing.test.ts: assertion change (first: an import's module changed: + import { ROOM_FLOOR, ROOM_PLOTS } from '../src/place/layout.ts';)
  review test/round-grounding.test.ts: a new test file (new assertions)
  review test/town-plan.test.ts: assertion change (first: an import's module changed: + import { H, CELL, NX, NZ, at, cellX, cellZ, heights, pathMask } from '../src/pla)
review stamp 974b32d77fde (7 files since origin/main).
Ship with: npm run ship-queue -- . --reviewed "974b32d77fde <who, what they found>"
~~~

## Final inspected evidence

Both replacement still PNGs were opened: [dock-street manifest](../../.look/evidence/1794657768249-79798/evidence.json), `b1-3-dock-final-still.png`; [overhead manifest](../../.look/evidence/1794657768247-79799/evidence.json), `b1-3-green-final-still.png`. They tested clean source commit `39ea2f78d43a296f932a0d770be539f1eab8cda4`; this completion report adds no game behavior. The dock street is wide again and joins the ring; the hall reads across the open green. From above the ring is continuous around the bowl, with all rooms on the rim and the laundry/fences behind the gate. The balcony remains behind Fine Prices. Main's smooth tread edges replace the previous coarse paint edge; the bowl depth remains subtle in the top view. Both captures passed WebGPU, completed-frame and page/console/graphics-error checks. The new sheet PNG was also opened: actual room/street/yard/curio data still agree with the plan, and later B3 blocks remain unbuilt. It records baked terrain paint, not a second rendering authority.

No capture execution failed in this follow-up; the first round's missing street was a visual failure despite execution success, repaired in the second round. No new gameplay bot was run. No remaining check failures; the existing longer-fleet TODO stays. The new source adapter has not had another independent review; the owner/orchestrator has its exact patch above. Timing under load is not evidence. Real-time feel, full gameplay/room traversal and device behavior remain unverified; **not tested on a device**.
