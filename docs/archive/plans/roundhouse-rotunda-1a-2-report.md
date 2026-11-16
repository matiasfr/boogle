# Rotunda step 1a follow-up — local handoff, 14 November 2026

The reviewed steel-pallet defect is fixed on `codex/rotunda-1a-2`. Implementation tip:
`95f2105e22ef55207889238a1a010070fa8a5bd6`. Rebased cleanly onto local `origin/main`
`35e1c3431` (PR 1807), including PRs 1804–1806 and the simplify pass. No fetch, push or ship.
The original branch is preserved. [Original step 1a report](roundhouse-rotunda-1a-report.md) records
the original recommendations and departures; its commit IDs and browser results are historical.

## Fix and failing-first evidence

Wrote and ran the regression against the actual production `PALLET` before changing it:
[before log](../../../.look/rotunda-2-pallet-before.log), 1 failure, 3 passes. It reproduced the
nearest edge at 5.899 m inside the 8 m disc. The old top at y18.28 was below the disc top y18.32.

`rotundaSteelPallet(site)` now places the pallet from the site's approach and table radius, the
kit's rim, the pallet's bounding circle and 1 m walking space. Home's bearing is 30° (approach +80°).
Changing the table radius by 2 m moves the pallet 2 m. The view samples its footprint's ground and
spans the slope with the existing base; no terrain, interaction, shared state or save shape changed.

- World centre: (950.000, 18.161, 9.747), where y is the highest supporting ground.
- Nearest pallet edge: 9.607 m from table centre, 1.007 m beyond the complete 8.6 m kerb.
- Ground range: 18.021045445–18.160524634; base top 18.340524634; first steel bottom 18.360524634.
- 13 track paths: 2 LINKS, the leg, spur, 2 stubs and all 7 stall roads; minimum edge-to-centreline
  clearance 5.403 m (required 3.5 m).
- Additional up-line/crossover audit at 0.1 m spacing: timber up 21.224 m (1,461 probes),
  quarry up 5.553 m (5,220), quarry crossover 412.658 m (220); timber has no crossover.
- Garage post, jib and stand point clearances: 4.164, 9.437 and 8.517 m.
- Nine authored landscape/portrait camera rows: minimum horizontal clearance 2.261 m. The computed
  portrait-whistle fallback is also outside the pallet, 0.543 m horizontally, and well above the steel.
  This numeric audit does not establish animated camera easing or portrait readability.

[After log](../../../.look/rotunda-2-pallet-after.log): all 5 rotunda tests pass. The new tests exercise the
source-owned pallet and camera data, terrain support, radius scaling and track/furniture clearances.
Independent Astra review found no actionable defect; its dense 201×201 ground probe confirmed the same extrema.

## Sweep of other anchors

Checked the following against the enlarged disc and the complete seven-bay reserved footprint.
No other misplaced physical prop or authored interaction point was found in this sweep.

| Checked | Result |
| --- | --- |
| `home-station` TABLE/STALLS/stallFrame, yard-track, home-yard, shunt-path, works-shape | Table/doors derive from the kit; current shunt and turnout retained. Bridge/trains intentionally occupy the disc; central slab, tarp, sockets and cradle intentionally occupy the central bay. |
| `roundhouse-view` handle, turn/install/garage/stall/cradle targets | Handle/turn prompt follow table radius; reach follows SHED_TABLE; post and stall points follow garage/stall geometry. No steel-pallet prompt exists. |
| `works-view` footings board, bill/cue, ghost rails | Board already moved in 1a to radius 11.3 m and the 10° bay bisector; cue is intentional on the apron, ghost rails on the wagon. |
| `garage-geo` deck/legs/post/stand/jib/crew and camera | Enlarged geometry retained; 15° camera and corrected 12.2 m arm preserved. Pallet clears these anchors. |
| Six PROPS: rack, greeter, pedestal, crane, dock, yard | Outside the seven-bay footprint; nearest centre 9.858 m. PROPS.yard is a terrain-pad consumer, not the actual secret stone pile; that derives from TOWN_PROPS behind the cottage. |
| Curio shelf/finders and nine bay-box positions; trophy plinth | Eleven points outside footprint, nearest centre 31.320 m; trophy uses bayPoint(0, PLINTH_OUT), far outside. |
| Ten authored SECRETS (nine live, block retired); seven CRYSTAL_SPOTS | All outside; nearest centres 60.583 m and 87.424 m respectively. |
| 21 JUMPS with landing points; 28 haltLandings | All outside; nearest centres 9.351 m and 21.313 m. Table landing is already +9.2/+1.7 m from 1a. |
| return-spot, return-halts, arrival | Return spots derive actual pose/JUMPS/RAIL_LINES; accepted halt presence and landing policy retained. No old table literal. Arbitrary player-saved poses are not an exhaustive authored-point audit. |
| halts-view, halt-kit, halt-deck, halt-ramps, halts prefab seats/bench/canopy/map/lever | Island/track/platform-local frames. Shelter -4.8 and platform -6.3 are platform offsets, not old table anchors. |
| Legacy three-stall view and tarp/geometry literals | Stalls use stallFrame. The remaining 9.6 m values are lengths, not table anchors. Continuous rotunda shell remains step 1b. |

Suspect developer comment, not Boogler copy: `roundhouse-view.ts` still describes the server reach as 6 m;
the rule is now 10 m. Left it listed rather than expanding this fix. The Boogler's copy is unchanged.
No ROM data or derivative was introduced.

## Reconciliation and choices

The final diff against the rebased main is empty for `return-spot.ts`, `pose.ts`, `return-halts.ts`,
`arrival.ts`, `halt-ramps.ts`, `halt-kit.ts` and the halts prefab. The simplify pass's jump-list hoist,
shared in-room/point formatting and halt frame reuse remain intact. Prior yard tidy, no-try-on garage,
engine turnout and footings-board changes remain intact.

New placement choices for the owner to overrule: approach +80° at Home, a 1 m walking margin outside the
kerb, and a base that spans the existing shallow ground slope. These repair the reviewed defect;
there is no new gameplay or reset. The original plan recommendations (7 bays on the 3/5/7 ladder,
16 m table, 20° bays and the remaining dimensions/timings) and departures are unchanged and fully
listed in the original report. Step 0 remains moot; no catalogue ceilings were reinstated.

**Exactly what shared v45 covers so far:** rotunda 1a's moved table/stall/seam reach points, table landing
and 140-tick shunt rule. The branch also contains the documented local table/garage geometry, bay pad,
cosmetic timing and this pallet placement. It does **not** implement right-hand running, train ladder,
great-tree move, kit loading from the leaf or railhead rack move. Coordinate their history together;
this branch must not ship independently.

## Final checks

All commands were bounded with `timeout` and rerun after the final source edit and PR 1807 rebase.

| Command | Result | Bound |
| --- | --- | --- |
| `npm run check` | Passed lint/typecheck/build and checks; 2,045 tests, 2,044 pass, 0 fail, 1 existing TODO | 900 s |
| `node dev/ship-check.ts` | Registry, 21 lint files, typecheck, 162 affected test files; 1,620 tests, 1,619 pass, 0 fail, 1 existing TODO | 900 s |
| `npm --prefix server test` | 371 pass, 0 fail; 8,596-record host trace reproduced | 600 s |
| `npm run registry` | 19 presence keys, 9 message types, 3 ops, 2 states, 0 knots | 60 s |
| `npm run loop -- run` | 24 completed runs, 28 ordering probes | 300 s |
| `npm run level-check` | 13 reports, 18 tracks, 7 joins; existing planned/sim-only warnings remain | 300 s |

Logs: `.look/rotunda-2-final-{check,ship,server,registry,loop,level}.log`.
The existing TODO is all-longer fleet seed `b011e7`: 1,146 ticks against 1,050.
It is not a new passing assertion. Files changed by the fix were formatted with Prettier before those checks.

## Fresh browser evidence

[Final pallet manifest](../../../.look/evidence/1794667048146-70558/evidence.json): capture passed,
WebGPU, no graphics errors. Opened `rotunda-pallet-final-still.png`. Visual question:
“Is the delivered steel pallet visibly grounded and separate from the enlarged disc, rails and garage post?”
Observed from camera (957,28,-7), looking at (947,18.5,18): orange steel is fully above its grey base on grass,
with visible grass between it and the disc; the nearby running rails and garage post remain separate.
No embedding is visible. The wide shot does not measure the exact margin; the geometry regression does.
The generated motion sheet was not opened or used for a motion claim. The nested look verdict identifies
the trusted harness commit; the outer evidence manifest records the tested worker commit/tree.

[Final two-player T2 manifest](../../../.look/evidence/1794667048083-70559/evidence.json):
passed; both peers finished, mirrored hashes match at 219 shared server steps, no graphics error.
Read the report and opened `run/end-still.png` and `run/p2-end-still.png`; both show T2 laid.
Transient clock drift was reported. Execution/state agreement passed; timing under load is not evidence.

The final captures record source commit `95f2105e2`, tree `50e09177a292e4cf205adaa0e964ff46ecc499a1`,
clean and unchanged throughout. Only this report was added afterward.

Two trusted harness failures remain from this follow-up's earlier run (before the documentation/simplify rebase):
- [Net manifest](../../../.look/evidence/1794666638628-56509/evidence.json): blocked before tests.
  Launcher `world-host.ts` imports worker `src/world/rules/index.ts`, which does not exist in this tree.
- [world-inputs manifest](../../../.look/evidence/1794666638618-56507/evidence.json): fails obsolete “gifts layout”
  readiness, even though the current worker scenario retires that prerequisite. Opened `inputs-final-still.png`;
  production game renders. No input-parity proof.

The restarted broker still reports trusted harness `d87c05719d3231bafb41eabb9fd23100457f6cde`.
Neither broker nor worker was patched to bypass these contracts; they need a compatible reviewed launcher.
An earlier fixed-pallet still and two-player T2 run also passed and were inspected, but final evidence above
supersedes them. Their manifests are
[still](../../../.look/evidence/1794666623938-56152/evidence.json) and
[T2](../../../.look/evidence/1794666638640-56508/evidence.json).

**Not tested on a device.** Real-time motion/feel, portrait transitions, full works segment and quiet-machine
performance remain unverified. The complete step 1b building, roof access and final appearance do not yet exist.

## Review stamp

Independent review found no actionable defect in this follow-up. Final review-stamp output follows;
the tool's shipping suggestion was not executed.

```text
> boogle@0.1.0 review-stamp
> node dev/review-stamp.ts . --no-fetch

  review server/test/boogler-authority.test.ts: assertion change (first: an import's module changed: + import { WORLD_NS } from '../../src/world/namespace.ts';)
  read   server/test/fixtures/world-host-trace.jsonl.gz: tests only: mode change
  read   server/test/world-host-trace.test.ts: tests only: comment
  review src/sim/railway-works-layout.ts: source or wire under a review path
  review src/world/namespace.ts: source or wire under a review path
  review src/world/railway-jump.ts: source or wire under a review path
  review test/coast-regions.test.ts: assertion change (first: - texture: '327e46c71c9247bb3b57c9757ead81b307be5073de15acf8c1e685da933f5a3d',)
  review test/fixtures/railway-golden.json: assertion change (first: - "worldNs": "v37",)
  review test/fixtures/railway-m12-trace.json: assertion change (first: - "h": 2804051688,)
  review test/fixtures/railway-tick-order-heads.json: assertion change (first: - 602658571, 1085048331, 651076875, 2621348875, 1025102603, 2055904779, 2755942667)
  review test/fixtures/railway-tick-order.json: assertion change (first: - 602658571, 1085048331, 651076875, 2621348875, 1025102603, 2055904779, 2755942667)
  review test/garage-geo.test.ts: assertion change (first: an import's module changed: + import { sourceFunction } from '../dev/level/source.ts';)
  review test/home-station.test.ts: assertion change (first: - test('the table and stalls are radial: the spur and each stall road point at its)
  review test/railway-cart.test.ts: assertion change (first: - assert.match(railwayRoomId('boogle'), /^rail-v44-/);)
  review test/railway-works-layout.test.ts: assertion change (first: an import's module changed: + import { STALLS, TABLE, stallFrame } from '../src/place/home-station.ts';)
  review test/rotunda.test.ts: a new test file (new assertions)
  review test/roundhouse-yard.test.ts: assertion change (first: - assert.ok(steepest > 0.05, `the vehicles pitch ${steepest.toFixed(3)} rad on the)
review stamp 1fe94ee53921 (17 files since origin/main).
Ship with: npm run ship-queue -- . --reviewed "1fe94ee53921 <who, what they found>"
```

## What step 1b needs

Continue from the original report's prefab/generator/stage and designer-review instructions. Keep the pallet
on `rotundaSteelPallet(site)` while constructing the pit/kerb and all seven roads; recheck its camera view,
prompts and carry corridor against the complete shell. The pad is already graded. Maintain the preserved
garage arm and the current main's return/halt furnishing helpers. Checkpoint A still needs the full works
segment, compatible-launcher net/world-inputs proof and quiet-machine performance; combine the v45 tracks
before any owner-authorized shipment.

