# Loader yard: L1 + V2 implementation

16 November 2026. Branch `t3/loader-yard`, based on `0b9933ec2869e3204d87d00ec11d602640cf04b0`
after fetching and rebasing onto `origin/main`. Four rider places (#1968) are retained.
This is an implementation handoff for independent review, not a ship or owner playtest approval.
No subagents, push, ship, L2, A, R, K or rider-coach implementation.

## L1

Plot 2 is a works building: zero rider demand and no residents’ `town` fact. Plots 1 and 3 add one house each.
All purchases still double subsequent prices. The S1 fare test now buys plots 1 and 3: 36/54/72 fares per minute,
and 72 with the yard as well.

After the yard has finished and the footing wagon has coupled, an empty outbound line 2 train loads at Works,
up to six footings, only while owed. Every carrier counts against the common owed quantity. A non-wagon deck
holding footings refuses stone, Q kit, steel and leg kit. The wagon’s separate footing deck leaves its kit car free.
The existing wagon headway exemption is unchanged. Existing aboard cargo is never moved by the buy.

Four accepted-op seeds and the hidden `Loader yard` jump row are added. The Works and Ring builders accept a base
seed without changing any old seed. `yard-deck` ends at accepted Q7 completion: the old `deck-laid` alignment
(full Works rack plus wagon at Home) can never recur when other trains have already taken the finite ring stock.
Only the new base-seed path skips that alignment.

## V2

The board shows the existing footing icon and “Every train”. Its affordable ghost includes a roadside jib and
footing. The completed yard keeps the existing closed shell, heights and hulls; the jib and two footings fit on
its step. The Works arm is grey and folded initially, coloured immediately when the yard finishes, folded before
coupling and between loads. Accepted `Train.foot` edges drive flights and the arm; saved state does not replay old
loads. All carriers show aboard footings. `kitCar` and `footingCar` isolate the car lookup for R2a; no consist
refactor is included. Two view-only prefab records add no collider.

The generated economy pages were refreshed because their build fingerprints include the changed sim sources.
Their embedded `TRADE` constant now includes the new riders/gives metadata. Their model, plot offers and loop graph
are unchanged: L2 remains separate. The original model’s figures remain 5.73/5.31/5.11 hours for 1/2/3 players.

## Five requested findings

1. **Prediction agrees.** The `rail.footSet` clone runs the shared rule, whose `aboard` query already sums every
   Train row. The regression tests both an extra Works footing refused because all twelve are allocated and a
   Pier-rack footing accepted while another non-wagon train carries footings. Acceptance, back count, pier set
   count and aboard count agree with the server. No prediction code change was necessary.
2. **Continuity passes.** Tests buy the yard while a wagon already carries owed footings, retain its cargo, and
   compare restored and uninterrupted hashes for 1,800 ticks. A separate non-wagon mid-load snapshot does the
   same. Both finish with twelve on the Pier rack and none aboard. Late join and reconnect receive all carrier
   rows. A real-host test additionally closes mid-load, reopens a fresh disk-store instance, checks identical hash
   and cargo, then finishes all twelve deliveries with none aboard. Natural route tests check conservation each tick and no over-allocation. Save/checkpoint envelopes and
   verified-write guards remain unchanged.
3. **No starvation in the tested routes.** From `yard-wagon`, instant hand setting completes the Pier’s twelve in
   **112.4 s** (limit 135); afterward the natural route reaches sixteen town stone and Q7’s full 20-log/20-rail kit,
   with zero footings aboard between Pier and Q7. From `yard-deck`, the eighteen ring footings set in **189 s**
   (limit 200), leaving zero aboard. Directed tests prove the wagon still takes Q, steel and leg kit while another
   train holds footings; homeward stone is not replaced. These are L1 acceptance checks, not R’s solo/trio pacing run.
4. **Fixtures are narrow.** All **49 existing golden stages retain their exact tick, initial hash and hash after
   1,200 ticks**. Four new stages are added (table below). The schema is byte-equivalent as parsed after removing
   its namespace. Across 8,600 host-trace records, only 205 namespace strings, their 205 envelope checksums and
   2,528 serialized-byte counters change. No operations, stage movement, world contents or other trace leaves move.
5. **v55 is required here.** Plot 2’s persisted catalog meaning changes from a rider house to a works building;
   legal saved Train cargo and ongoing shared-rule behavior also change. Under mixed-builds’ development clean
   break, the namespace prevents an existing house room silently changing meaning. `WORLD_NS` is **v55**, with a
   dated history line; transport, durable saves and jump rooms derive from it. The cart assertion, railway golden,
   schema pin and host trace all move. No migration, compatibility gate, mixed-build test or new save schema.
   Current-build load validation, checkpoint integrity, replay and idempotency stay in place.

| New seed | Tick | Stage hash | After 1,200 ticks |
| --- | ---: | ---: | ---: |
| yard-ready | 20859 | 560161376 | 298816224 |
| yard-built | 20959 | 2897507685 | 1947920485 |
| yard-wagon | 22166 | 1668486087 | 3429225927 |
| yard-deck | 24391 | 3169888183 | 1957548407 |

Re-pin commands: `GOLDEN=1 node --import ./test/helpers/rail-no-audit.ts --test --test-concurrency=1
 'test/railway-golden-*.test.ts' test/railway-schema.test.ts`; `HOST_TRACE_RECORD=1` with
`server/test/world-host-trace.test.ts`. The final seed-order repair used the same writer, shard 8 only.
Audit: `.look/loader-yard/audit-fixtures.py`, `.look/loader-yard/fixture-audit-final.json`.
Old golden stages are unchanged even though none previously bought plot 2: the rule still changes the meaning of
an existing bought plot and the legal contents of a Train row in real rooms.

## Visual evidence

All paths below are relative to this checkout; retained under ignored `.look/`. Each listed final still was opened.
The eval uses accepted seeds plus camera/player placement; it never edits rule rows.

| File | Inspection |
| --- | --- |
| `.look/loader-yard-hall-r2-still.png` | Yard board says “Every train”; gold shell/jib/footing ghost and plot 3’s timber/stone board visible from the hall front. Plot 1 is already built in `yard-ready`, so its buy board is correctly absent. |
| `.look/loader-yard-island-still.png` | Ghost roof visible above the town roofs; lower ghost/jib hidden from the island approach. |
| `.look/loader-yard-built-r2-still.png` | Closed yard shell, roadside jib and two footings on the step; clear road outside. |
| `.look/loader-yard-grey-still.png` | `works-open`: grey folded arm beside the rack, no built yard. |
| `.look/loader-yard-coloured-still.png` | Exact `yard-built`: coloured folded arm before the wagon; this early seed has not yet lit Works. |
| `.look/loader-yard-coloured-stall-r2-still.png` | Supplemental accepted-op `yard-built` → `works-lit`: coloured folded arm with “stall 0/2 by hand” rack bill, no wagon coupled. |
| `.look/loader-yard-jump-still.png` | Jump lands on Quarry platform, facing the rack and coloured folded arm. |
| `.look/loader-yard-loading-final-action.png` | Frame at 2.6 s of the real-time clip: arm extended across the platform; footings leave the rack toward the visible non-wagon train. The platform shelter partly overlaps the receiving deck; its full load is clear at Pier. |
| `.look/loader-yard-loading-final-still.png` | Load complete, arm folded, footings aboard the kit deck; the kiln continues restocking the rack. |
| `.look/loader-yard-pier-r3-still.png` | Entire non-wagon train approaching Pier: all six footings visible in two three-high stacks on its kit deck, four rider places retained on the separate car. |

The supplemental pre-wagon state is produced by `.look/loader-yard/coloured-stall.ts` through `seedDoc` and the real
host save path; it is neither a fifth production seed nor a row-edited view. The exact `yard-built` seed alone
cannot show the later lit-kiln bill.

Earlier framings are retained,
including the missed first load and the second load where the deck was outside the frame. Harness success is not
used as evidence that those views met the brief. No device, owner playtest or quiet-machine performance claim.

## Strings

New placeholders: **“Every train”**, **“Loader yard”**, **“The loader yard stands; footings ride every line 2 train”**.
The Boogler’s words are unchanged. The residents’ existing “new neighbours” lines now trigger only for rider houses.
The existing rack and Pier board wording “by wagon” is now suspect when loader trains help; left unchanged for the
owner. The four-place passenger copy is unchanged.

## Verification ledger

Node **26.13.0**, local dependencies installed with `npm ci` (no symlink). Local tests use the repository’s normal
unaudited test mode; focused seed commands also used `--import ./test/helpers/rail-no-audit.ts` for the same mode.
The initial audited checkpoint run already passed yard-ready/built/wagon; its yard-deck alignment failure is fixed.
No R timing sweep or additional design work is represented by these checks.

All logs are in `.look/loader-yard/`. **Complete failed-run output, including exception stacks, is quoted verbatim
in `.look/loader-yard/failures.md`** (retained local artifact, approximately 0.8 MB). The table names superseding runs.

| Command / check | Result and log |
| --- | --- |
| `git fetch origin && git rebase origin/main`; riderPlaces check | Success; baseline above includes four places. |
| `npm ci`; `npm run inflight`; `npm run map -- --kind feature-fix`; routed reads | Success; no other inflight work. Initial map invocation before installing dependencies could not import `oxc-parser`; `--kind sim` was not a valid map kind. Corrected setup used Node 26 and feature-fix. |
| `npm run checks-for` | Pass, `checks-for.log`; prescribed static, seeds, loop, two peers T2 and world-inputs. |
| `npm run prefabs` | Pass, `prefabs.log`; two view-only records, existing placements/solids untouched. |
| `npm run typecheck` (three iterations) | First failed on the seed helper’s string-only cache signature (`typecheck-initial.log`); wrappers fixed it. `typecheck-current.log` and `typecheck-views.log` pass. |
| `npm run lint` | Pass, `lint-initial.log`; existing conservative dependency warnings remain. |
| `npm run registry` | Initially failed because the new eval lacked its documented command header (`registry-initial.log`); fixed and passes in full check. |
| Focused trade, Works and town-fact tests | 87 pass, `rules-initial.log`. |
| Focused loader tests | Initial 6 pass / 2 fail: wrong Q7 test bill (actual 20/20), and purchase attempted before 24 timber. Fixed test setup. Then 8 pass (`loader-tests.log`). |
| Expanded loader/check/jump tests | A deliberately stronger prediction assertion exposed that an extra Works footing must refuse when all twelve are allocated. Replaced with explicit acceptance and refusal cases; 120 pass (`loader-regression-r2.log`). Earlier failure fully retained in `loader-regression-final.log`. |
| Final loader tests | **9 pass**, `loader-tests-final.log`; heavy accepted fixture construction moved to module setup. Individual tests 3–330 ms in this run. |
| `npm run checkpoints -- yard-ready yard-built yard-wagon yard-deck` | Initially yard-deck failed waiting for the old rack/wagon alignment (`checkpoints.log`). Final all four pass through the host save path (`checkpoints-final.log`; intermediate `checkpoints-fast.log` also passes). |
| `npm run loop -- run` (twice) | Both pass (`loop.log`, `loop-final.log`); outputs differ only in measured command runtime, 14,862 vs 15,498 ms. Every order, bill and route result is identical. |
| Golden comparison before recording | Expected failure: four new stages missing and shard list checks (`goldens-before.log`); all old stage hashes match. |
| Golden/schema recording, serial | Fixture writers used. Initial recording reports expected shard-list failures until shard 8 adds the new stages (`goldens-record.log`); final comparison **117 pass** (`goldens-final.log`). |
| Host trace recording | **1 pass**, `host-trace-record.log`; parsed audit proves only namespace/checksum/byte counts differ. |
| Seed-order writer rerun | **67 pass**, `golden-order-record.log`; moves the new yard stages into chronological catalog order, no old hashes or ticks change. |
| `python3 .look/loader-yard/audit-fixtures.py` | Pass; `fixture-audit-final.json` contains all changed leaves and new stage hashes. |
| `npm run check:full`, first attempt | Failed: stale generated economy pages, prefab test harness/catalog registration, obsolete wagon-only bad-world expectation, jump ordering/menu count (`check-full.log`). All fixed; prefab and economy behavior otherwise unchanged. |
| Focused prefab/check/jump integration rerun | Prefab tests pass; two remaining bad-world/jump-order test failures (`integration-fixes.log`), then fixed. |
| `npm run check:full`, second attempt | Failed only on golden stage-list order after reordering the catalog (`check-full-r2.log`). Re-recorded via shard 8; keyed audit unchanged. |
| `npm run level-check -- --place=place` | Pass: 12 reports, town 0 failures / 9 solids / unchanged roof tops and envelope (`level-check.log`). Full check also runs all 17 reports. Existing reported track kinks are unchanged. |
| `npm run scenario -- town-buy` | Pass: simultaneous buy spends once; both tabs see the same build, reload retains purchase tick, one completed building. `town-buy.log`, screenshots in `.look/scenarios/town-buy/`. |




The final loading recording is `.look/loader-yard-loading-final-realtime.webm` (real-time six-second capture).
I inspected the motion sheet and the recording decoded at 8 fps in
`.look/loader-yard-loading-final-video-frames.png`: folded before arrival, extended during the accepted load,
footings moving to the deck, then folded again. The late still and Pier still confirm aboard cargo. This establishes
the sequence; it does not establish display-presentation smoothness or device performance. The final loading run
was healthy WebGPU, no console/page errors, load 9.38 → 5.44. Earlier under-load captures remain labelled as such.

Capture commands are retained in each `look-*.log` and the eval’s command header. Attempt ledger:

- `look-coloured.log`: initial harness entry-point error; full output in failure archive. Correct entry is `dev/look/look.ts`.
- `look-coloured-r1.log`: exact yard-built, coloured/folded; inspected and retained.
- `look-grey.log`: works-open grey/folded; inspected and retained.
- `look-hall.log` / `look-built.log`: healthy captures, framing hid the target behind roofs/house; replaced by inspected `*-r2` shots.
- `look-island.log`: healthy; ghost roof visible, lower ghost hidden, explicitly reported.
- `look-hall-r2.log`, `look-built-r2.log`, `look-jump.log`: healthy, opened, final views listed above.
- `look-loading.log`: missed the loading action; not accepted as proof. `look-loading-r2.log` caught the swing but cropped the train.
- `look-loading-r3.log`: caught the swing and train but still cropped the kit deck; retained as a close supporting view, not the final framing.
- `look-loading-final.log`: final complete frame and real-time clip, inspected as described above.
- `look-pier.log`: platform roof hid the receiving car. `look-pier-r2.log`: footings visible but deck clipped at the edge.
- `look-pier-r3.log`: final six-footing arrival still, opened and retained.
- `look-coloured-stall.log`: accepted-op supplemental state, board too oblique. `look-coloured-stall-r2.log`: opened final bill-facing view, stall 0/2 by hand and coloured folded arm both clear.

All captures except the named entry-point error passed harness health checks. That result is separate from the
framing judgments above. The first missed-action capture was healthy but did not verify loading.

Final verification:

| Command | Verified result |
| --- | --- |
| `npm run check:full` | **PASS, exit 0** (`check-full-r3.log`): lint, typecheck, 2,283 unit passes / 65 skips / 1 todo / 0 failures, registry, all 17 level reports, assets, prefabs, production build, 406 server tests, and **208/208 network checks**. |
| `node --import ./test/helpers/rail-no-audit.ts --test server/test/loader-save.test.ts` | **PASS, 1/1** (`host-loader-save-final.log`), added after full check: close the real host mid-load, reopen a new disk-backed store, require identical hash and all Train rows, then advance to twelve at Pier / zero aboard with conservation every tick. Initial attempt passed those checks but incorrectly expected the throwing validator to return null; corrected to `doesNotThrow`. Full original failure is in `failures.md`. |
| `node dev/scenarios/run.ts world-inputs` | **PASS**, healthy WebGPU and no page/console errors (`world-inputs.log`, retained `world-inputs-verdict.json`). |
| `node dev/look/playthrough.ts --players 2 --to T2 --warp-speed 3` | **PASS**, both finish T2, mirrored hashes agree at 237 server steps, both end at tick 2190 with one peer each (`two-peer-t2.log`; `.look/playthrough/0b9933ec2/report.txt`, verdict and both ending stills opened). |
| `git diff --check` | Pass. |

The T2 run flagged page-clock drift: peak deficits **3.998 s / 3.463 s**; achieved world clocks were 3.00×, each
at most **0.067 game s** behind the achieved server clock (server deficit 0.004 s). Maximum page tick gap 3,
read skew 22.7 wall ms. Both gameplay endpoints and mirrored-state checks passed; timing-quality approval is
not claimed. Ending stills show both players at the completed T2 work frame. Town-buy’s two final stills were
opened: both players see the built house; the next plot remains a stake.

Final local gate: `node dev/ship-check.ts`, output `.look/loader-yard/ship-check.log`; the handoff records its result
and committed tip. No ship/push or independent-review completion is claimed. L1 and V2 are ticked with their
as-built note; L2/A/R/K remain unticked. Owner playtesting, device/performance approval and R’s solo/trio timing
study remain outside this task.

Final gate result: **PASS, exit 0** — `node dev/ship-check.ts`: registry, 42 lint files, typecheck, prefab build check, 200 affected test files; 1,839 test passes, 65 skips, 1 todo, zero failures, 96.57 s. No gameplay code changed after this gate.
