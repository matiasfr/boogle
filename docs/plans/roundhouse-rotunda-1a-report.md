# Rotunda step 1a — local handoff, 14 November 2026

Implemented the kit as data and moved Home's rule points. **Do not ship this branch.** Step 1b is still needed,
and the owner has reserved v45 for one coordinated reset. Implementation commit: `f56437c68665c2a7bcc2d995950278d9d2cf287a`.
This report records recommendations taken under the owner's instruction; they remain available for the owner to overrule.
Review correction commit: `e96933e7b`. The final documentation-only tip is reported in the handoff message.

## What exists

`src/place/rotunda.ts` exports `ROTUNDA_KIT`, `RotundaSite`, `bayFrame`, `rotundaBays` and `rotundaFootprint`.
Home supplies the site; the legacy `STALLS` and `stallFrame` retain their shapes. No renderer, progression rule,
component, action, op, wire shape or save shape was added. The table is 16 m across; the old three-stall visual is
transitional, not the continuous rotunda promised by step 1b. The limits-removal work already on main makes step 0 moot.

The existing turnout and spur endpoint, yard track/shunt path/pose, `SHUNT`, `mastFrom`, no-try-on garage,
and footings-board behavior remain. The board's position follows the wider apron. The Boogler's copy is unchanged;
no ROM-derived content was introduced.

## Recommendations taken

1. A 16 m table, centre moved 3.2 m along the existing spur, without moving the line tracks or town buildings.
2. Seven bays at Home, a 140° arc centred on 190°, ordered `0,-1,1,-2,2,-3,3`, with site-owned counts `0/3/5/7`.
   This stores the ladder only: no purchase, progression trigger or new bay occupant was implemented.
3. The reusable kit uses 20° wedges, doors at radius 14 m, depth 11 m, clear openings 3.6 × 4.6 m, a 0.6 m rim
   and a 0.9 m pit depth. The latter two are dimensions for later construction, not a built pit or kerb.
4. The three compatibility bays stand at 170°, 190°, 210°. Their door and back chords are 4.86 m and 8.68 m.
5. The plan's centimetre pins: table `(94455,1918)` with reach 1000; stall `(94160,3592)`; seam `(94212,3297)`.
   Table landing offsets are +9.2 m x and +1.7 m z, outside the future 8.6 m kerb.
6. Roll-out 140 ticks; turn interval `[0.34,0.70]` gives 5.04 s; return 130 ticks. The ready-only rule remains.
7. Garage post 60°/9.4 m, stand 85°/10.3 m, legs 9.9/11.4 m, jib 85°/12.2 m,
   crew 88°/13.2 m and 81°/12.5 m. The recommended 11 m arm was corrected to 12.2 m after independent review.
8. Designer review's 3 s install show-off turn: `MOMENT.rest` 4800 ms, whistle 1800 ms; existing skip and lock rules remain.
9. Level ground at y18 over the full bay arc to radius 27 m with a 4 m soft edge, after the harvest snapshot.

## Departures and reconciliation

- **Camera:** retained current main's 15° garage camera. The plan's instruction to “keep 85°” describes an older tree.
- **Arm:** 12.2 m instead of 11 m. Actual production nose selection at the retained camera puts the closed
  bystander's install hook 11.792 m from the jib. Including the world-aligned trolley and the beam's 0.2 m inset
  requires 12.161420 m. The new regression uses the production `garageFlip` helper and checks installer and bystander poses;
  it failed at 11 m before the fix. No camera or nose-selection behavior changed.
- **Pad moved forward from 1b:** the moved stall rails intersected the old slope. The terrain pad fixes that now;
  no pit or tree relocation was added. The yard slope assertion remains a nonzero-pitch guard, adjusted from >0.05
  to >0.03 rad for the longer apron; measured pitch is 0.0400 rad. Wheel/rail and ground-clearance guards remain.
- **Footings cue:** moved the existing board from radius 7.5 (now inside the disc) to the apron midpoint, 11.3 m,
  using the 10° bisector of the new bays. No copy or cue state changed.
- **Footprint:** the `XZ[]` is one conservative closed keep-clear outline enclosing pit/kerb, bays and connecting
  apron, including gaps between selected bays. Pit samples are circumscribed, not inscribed. It is not a pair of polygons.
- **Fixtures and maps:** updated namespace expectations, terrain digests, dependent rule fixtures and generated map
  artifacts. The economy prototype's source hash follows the changed map artifact. No limits were reinstated.

## Exactly what v45 covers so far

This branch's v45 history line covers **only rotunda 1a's moved table, stall and seam reach points, table landing,
and 140-tick shunt rule**. The branch also changes the local table/garage geometry, pad and cosmetic timing described
above. There is no schema migration. Old rooms contain footings and player positions at the old anchors; mixed
builds would disagree on reach. This is **one shared reset**, not a new reset for each track.

**Absent:** right-hand running, the train ladder, the great tree move, kit loading from the leaf, and the railhead
rack move. None of those tracks is claimed implemented or tested here. Do not push or ship this branch independently.

## Checks and numeric evidence

Commands used `timeout`; local suites had 300–900 s bounds, browser runs 900 s. Final successful local logs:

| Check | Result |
| --- | --- |
| Plan's geometry/layout tests plus yard | 35 passed |
| Post-format geometry/layout plus tick-order | 58 passed, 0 failed |
| Final jib regression and test-selector guard | 14 passed, 0 failed |
| `npm run check` | exit 0; 2,043 tests: 2,042 passed, 0 failed, 1 existing TODO; lint/typecheck/build and required checks passed |
| `node dev/ship-check.ts` | exit 0; registry, 20 lint files, typecheck, 162 affected test files; 1,618 tests: 1,617 passed, 0 failed, 1 existing TODO |
| Server suite | 371 passed, 0 failed |
| `npm run registry` | passed; 19 presence keys, 9 messages, 3 ops, 2 states, 0 knots |
| `npm run loop -- run` | 24 completed runs: 1–4 players, canonical plus 5 alternative orders each; 28 ordering probes |
| `npm run level-check` | passed; 13 reports, 18 tracks, 7 joins; existing planned/sim-only track warnings remain |
| Seven-bay footprint | 5 track paths at least 7.119 m away (required 3.5); 12 town footprints at least 8.306 m (required 4) |
| Yard proof | 20,775 laid-rail probes and 18,057 deck/line probes; wheel middle error −0.0002..0 m, ends −0.0112..0.0110 m; slab ground clearance ≥0.325 m |

The existing TODO is the all-longer fleet seed `b011e7`, waiting 1,146 ticks against 1,050. It is not a new passing
assertion. Initial failures from old terrain, anchor expectations, namespace and generated fixtures were fixed.
The first jib regression's dynamic nested-function extraction failed the test-selector load audit. The unchanged
nose-choice calculation now lives in a pure geometry helper used by game and test; no guard or allowlist was relaxed.
The final checks above passed. Optional `npm run checkpoints` reached four stages before its 120 s bound;
it is not claimed as a completed check.

Fixture audit: at wagon seed tick 4484, the sole changed snapshot value is `shed.ready` 4389 → 4419 (+30 ticks).
Golden changes are confined to 14 wagon-on-and-later stages; M12 to 6 affected scenarios × 3 player counts;
tick-order to 4 stages; head traces to 9 stage/delay pairs. System ordering and per-tick call counts did not change.
The server's 8,596-record host trace changes only 205 checkpoint namespace/checksum pairs and 2,457 resulting
serialized-byte counters. Checkpoint states/hashes, inputs, packets and all other statistics remain identical.

Logs are local ignored evidence: `.look/rotunda-check-complete.log`, `rotunda-ship-complete.log`, `rotunda-server-final.log`,
`rotunda-registry-final.log`, `rotunda-loop.log`, `rotunda-level.log`, `rotunda-post-format-tests.log`,
`rotunda-arm-regression-before.log` and `rotunda-arm-regression-final.log`.

## Browser evidence and limits

- [Final two-player garage manifest](../../.look/evidence/1794665218819-41562/evidence.json): passed on the final source
  tree `7826d1f912550a8984cee307bc511715008004c1`. Opened `rotunda-bystander-final-still.png`,
  `rotunda-bystander-final-motion.png`, `rotunda-bystander-final-curves.png`, `p2-rotunda-bystander-final-still.png`
  and three consecutive video frames extracted at 5.7 s. The hook hangs below the beam at the closed-pose seat,
  the boiler installs, and the train turns and returns. The bystander's camera and player position remain fixed;
  both tabs end idle with boiler 1. The numerical test establishes the small trolley margin more precisely than
  the wide view. No graphics errors; no real-time feel or performance claim.
  The preceding [bystander capture](../../.look/evidence/1794664943648-36156/evidence.json) also passed; opened its
  two stills and motion sheet. It preceded the behavior-preserving helper extraction and was repeated for final-tree evidence.
- [Garage install manifest](../../.look/evidence/1794664192296-26161/evidence.json): passed, WebGPU and no graphics errors.
  Opened `rotunda-install-still.png`, `rotunda-install-motion.png`, `rotunda-install-curves.png` and three consecutive
  video frames extracted at 4.5 s. The train has spare room on the broad disc; the sheet shows lifting, installation,
  a full turn and return to the opening orientation. The panel obscures part of the car. Curves track player/camera,
  not bridge yaw. This is not proof of real-time feel, bystander clearance or performance.
- [Overhead manifest](../../.look/evidence/1794664615034-35355/evidence.json): passed. Opened `rotunda-overhead-still.png`.
  The shifted three roads fan into the disc; furniture stands outside it and away from the running lines; the flat
  bay pad supports the old three-stall geometry. The continuous seven-bay building is visibly still absent.
- [Two-player T2 manifest](../../.look/evidence/1794664307068-31671/evidence.json): both peers finished; hashes match
  at 225 sampled shared server steps; no missing beat or graphics error. Opened both end stills and read the report.
  Both show T2 laid. The log reports transient clock drift (3.359/6.887 game seconds); no timing/smoothness claim.
- [world-inputs manifest](../../.look/evidence/1794664305908-31514/evidence.json): **failed** its initial “gifts layout”
  readiness check. Opened `inputs-final-still.png`: production game is rendered. The trusted scenario is older than
  this checkout's scenario, which explicitly retires the gifts-layout prerequisite. No parity proof was obtained.
- [Net manifest](../../.look/evidence/1794664304750-31416/evidence.json): **blocked** before tests, trusted launcher
  `world-host.ts` imports worker `src/world/rules/index.ts`, absent in this checkout. Requires a compatible reviewed
  launcher restart; the broker and worker were not patched to bypass it.
- Initial warped single-player install capture failed with `--clock-url requires two-player warp`
  ([manifest](../../.look/evidence/1794663975440-18641/evidence.json)); the documented `--real` retry passed.

All manifests record unchanged trees during their runs. The initial install, overhead and co-op evidence precedes
the jib correction; the final two-player garage run includes it and the helper extraction. The final source tree
was frozen through that capture and both passing check runs; only documentation changed afterward.
Timing under load is not evidence. **Not tested on a device.** Real-time motion, subjective feel, roof access,
full works bot and final continuous-building appearance remain unverified.

## Independent review

Fresh Astra review of `f56437c68` found one P2: the 11 m arm did not support the closed bystander's hook.
The geometry test's old 130° assumption missed the actual pose. Reproduced, corrected to 12.2 m, and the regression
now exercises the source-owned nose selection. No additional concrete findings. The reviewer independently verified
the host-trace and tick-order fixture scope, passed the 35 focused tests, then passed all 3 garage tests after the fix.
The final helper extraction was independently checked as equivalent, including its tie preference and 1e-6 threshold.
Final review-stamp output follows below (the tool's shipping suggestion was **not executed**).

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
review stamp 5b05d2fa5968 (17 files since origin/main).
Ship with: npm run ship-queue -- . --reviewed "5b05d2fa5968 <who, what they found>"
```

## What step 1b needs

Use the kit and Home site directly for prefab records, the generator and `rotunda-home` placements; keep colliders
bay-local. Add the local stage reader from existing server rows, not a new shared stage. The pad is already present.
Keep the central slab, sockets, tarp, cradle and yard shunt on `stallShape(bayFrame(...))`; extend roads to all bays.

Follow the designer's corrections: five standing ruin bays at arrival, central missing piers as the footing cue;
three roofs at stall completion and five on steel arrival, free with those story beats. Empty bays have closed doors,
occupied/worked bays open; passenger trains do not stand here. Stage 3 and occupants remain held; a later bay comes
with its occupant, not a standalone bay purchase. No purchase behavior was added in 1a.

Build the 16 m table block and comparison 14 m ring, bay blocks and continuous arc. Draw the footprint on the town
sheet and add its level-check row. Relocate `PROPS.yard` outside the designer's 95°–125° carry corridor, maintaining
rail clearances. Check the roof by ability and view the back wall from the Round. Leave the great tree to its shared-v45 track.

Checkpoint A still owes the complete works segment, net under a compatible launcher, and reported performance on a
quiet machine. Repeat the post and bystander garage proof against the combined blockout, and recheck moved footings
and jump-in. Coordinate the complete v45 history with the other tracks and the owner;
**this branch has neither been pushed nor shipped**.
