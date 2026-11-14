# Prefab step 10: complete shelter, bench, canopy and mast pieces

Partial step on `codex/prefab-data-step-10`, starting at `20004bc6e`. No push or ship.
DESIGN.md: **Understandable at a glance**, **Clear authority**.

## Converted and remaining

Nineteen generated records convert every existing shelter, bench, island canopy (including all four posts)
and signal mast in `halts-view.ts` and `up-platforms.ts`. The compiler joins `RAIL_HALTS` with `HALTS` and
`UP_HALTS`; the Pier keeps its existing platform operands. Existing platform frames remain runtime owners.
The same part order feeds the same drop sets; colliders retain the original order, including the up platforms'
bench-before-posts order. Local ownership disposes each record's bodies without double removal.

**Remaining:** decks/bases/piles, terrain-dependent ramps and crossings, request levers with plaques/interactions,
map-display stands, and the separate animated signal arms/road-plaque attachments. The mast record owns the
static post and its collider. Platform world-frame expansion remains with those legacy decks. This uses the brief's
whole-kit-piece stopping boundary, not a subset-of-halts conversion. Railhead, Ring Island, stack heads, High
Gorge and leg 2 do not gain shelters or masts they did not previously have. Their existing platform builders and
levers remain unchanged. Step 10 stays unchecked.

Artifacts store authored operands only. Collider offsets use the existing closed expression evaluator at load;
the compiler never serializes Home's native-derived s/lat, angles, terrain samples or quaternions. The existing
prefab loader validates the catalogue once in instantiate; this consumer validates only its level references.
No new whole-catalogue load validation was added. No source under sim/world/server, seat rules, room replacement,
The Boogler, town rooms or `place/layout.ts` changed. No WORLD_NS bump or ROM data.

## Old-code proof

`98eb84ef0` committed the old-code fixture before production edits. `test/prefab-halts.test.ts` executes the old
view boundary and now the record path, recording all drop-set matrices/colours/flags, ramp/lever mesh transforms,
collider shapes/order, plaque strings and ordered nearby prompts. It covers eight progression snapshots:
trains-on, Q6, deck-laid, gap-footed, ring-joined, two stack sections, three sections and High Gorge.
All 24 catalog rows (including Ring Island's control flag and leg 2's halts) remain exact; all 19 existing lever
instances are recorded, including hidden/chained states and the stack-head doubled plaques. These snapshots
do not exercise a live server control-hold or a new leg-2 interaction.

The fixture is unchanged, SHA-256 `01df633cfac88285cb74171eb2d10c34b14bc6571cfb8e0c35be4c7ba9ecaef2`.
Runtime numbers use the existing absolute `1e-9` / relative `1e-12` tolerance; ids, strings, flags, array lengths
and order remain exact. Equivalent quaternion signs are normalized to the old positive-w convention, with positive y at an
exact half-turn (whose near-zero w can cross zero under perturbation), as in the curio proof. No baseline regeneration or relaxed tolerance. Disposal leaves no active recorded bodies.

## Suspect placeholder copy for the owner: unchanged

`Request stop`, `Request stop: to <end>`, `Stop requested`, `Stack railhead`; halt names:
`Village`, `Camp`, `Village, line 2`, `Quarry`, `Far Head`, `Pier`, `Railhead`, `Ring Island`,
`Stack head 1`, `Stack head 2`, `Stack head 3`, `High Gorge`, `Bell Rock`, `Original Island`,
`West landing`, `Canopy Town`, `Lantern Notch`, `Saltpan Halt`, `Port Quay`.
Repeated catalog names and the existing `, line 2` plaque suffix removal stay exact. None is rewritten.

## Debt

Collider debt: **103 files / 494 units → 103 / 488**. `halts-view.ts` **16 → 12**;
`up-platforms.ts` **8 → 6**. Seat debt remains **11 / 15**. Sign/interaction lists, public surfaces,
construction importer allowances and all other debt budgets do not grow.

## Verification

Implementation commit **`d75c6e267`**, tested clean tree **`b96f27582967180aa2cb780c1eb2aafdd9073d81`**.
The final report commit changes documentation only. Baseline `98eb84ef0` has the exact production source of
`origin/main` **`20004bc6e`**, plus the old-code golden and capture eval. No source changed during any capture.

| Check | Result | Local evidence |
| --- | --- | --- |
| All prefab tests, normal | 216/216 | [log](../../.look/step10-prefabs-final.log) |
| All prefab tests, native one-ULP perturbation | 216/216 | [log](../../.look/step10-perturbed-final.log) |
| Additive native perturbation, compiler freshness | 109 records, 8 levels, 210478 canonical bytes, fresh | [log](../../.look/step10-artifact-perturbed.log) |
| `npm run check`, after final Prettier | Pass: 1911 passed, 1 existing TODO, zero failures; assets, levels, registry and build pass | [log](../../.look/step10-check-final.log) |
| `npm --prefix server test` | 370/370 | [log](../../.look/step10-server.log) |
| Direct `npm run test:net` | 190/190 | [log](../../.look/step10-net-final.log) |
| `node dev/ship-check.ts origin/main HEAD` | 450 assertions, 47 affected test files, 17 lint files, typecheck and registry pass | [log](../../.look/step10-ship-check.log) |
| `npm run registry` | Pass; no debt growth | [log](../../.look/step10-registry-final.log) |
| `npm run level-check` | Pass, 13 reports; pre-existing planned/never-drawn continuity diagnostics remain | [log](../../.look/step10-level-check.log) |
| `npm run loop -- run` | Pass | [log](../../.look/step10-loop.log) |
| `node --test test/unit-select.test.ts` | 11/11 | [log](../../.look/step10-unit-select.log) |
| `npm run review-stamp -- . --no-fetch --base origin/main` | `ae6ee7f168d8`, six test/fixture files | [stamp](../../.look/step10-review-stamp.log) |

The stamp identifies the test diff, not an independent review. The diff was reread locally. No independent reviewer
was dispatched. Native perturbation uses the same local audit-skip preloader as the normal prefab suite, and perturbs
sin/cos/atan2/hypot before module imports; the artifact check separately adds `1e-15`. The first perturbed runtime run
found the equivalent-quaternion sign ambiguity; it passed after stabilizing the snapshot convention. The fixture and
shared tolerance were not changed. The first sandboxed network launch failed with browser SIGTRAP/EPERM; an earlier
queued retry was cancelled before running, then the final committed tree passed using the local unsandboxed harness.

### Opened comparisons and broker manifests

Each of these **eight stills was opened**, before and after. All final captures pass WebGPU health, advancing frames
and no page/console errors. The final manifests identify the worker's clean `d75c6e267` tree; capture verdicts also
name the trusted launcher harness `d87c05719`, which is a separate source identity.

| Question / observed result | Old manifest | Final manifest |
| --- | --- | --- |
| Home road 1: same red canopy silhouette, four post layout, mast and deck relationship; actual train at the edge | [before](../../.look/evidence/1794634704990-68905/evidence.json) | [after](../../.look/evidence/1794635777014-5004/evidence.json) |
| Home road 2: same canopy/post/mast placement, train at the opposite edge; other moving vehicles vary | [before](../../.look/evidence/1794634824338-69654/evidence.json) | [after](../../.look/evidence/1794635816070-8904/evidence.json) |
| Stack head 1: same doubled plaques, Village on the left/homeward at the stop, Stack railhead outward; diagnostic separation 3.99 m | [before](../../.look/evidence/1794634837168-71545/evidence.json) | [after](../../.look/evidence/1794635815979-8906/evidence.json) |
| High Gorge: same platform, ramp, train and lever locations; no new shelter or mast | [before](../../.look/evidence/1794634837132-71546/evidence.json) | [after](../../.look/evidence/1794635815690-8905/evidence.json) |

Exact files opened are `step10-home0-before-still.png`, `step10-home0-after-still.png`, `step10-home1-before-still.png`,
`step10-home1-after-still.png`, `step10-stack-before-still.png`, `step10-stack-after-still.png`,
`step10-gorge-before-still.png`, `step10-gorge-after-still.png` inside those manifest directories.
The comparison checks placement and appearance, not pixel identity: water, particles and other moving trains vary.
The old road-2 capture reports machine load; these stills establish no performance or timing claim.

The required [T1 segment](../../.look/evidence/1794636157661-12304/evidence.json) **passed** all expected beats, zero
errors; its full report and verdict were read and `run/end-still.png` was opened. The still shows Buddy in the earned
conductor hat beside the production rack and the completed T1 bot overlay. It is short-route coverage, not a halt
interaction playtest. The [railway-legs attempt](../../.look/evidence/1794636158824-12362/evidence.json) **could not start**:
the trusted launcher's older `railSegmentOptions` rejects `gorge-mid`. It produced only an error log, no report or
end still. The worker has that segment, but the broker was not bypassed. Earlier bot requests with `--name` were also
rejected by the broker before launch; removing that flag allowed T1 to run. No gameplay bot failure was observed;
the optional legs route remains unverified.

`npm run inflight` attempted its implicit fetch and failed at the sandbox's FETCH_HEAD write; it was not retried.
Subsequent work uses local Git and local servers only. `look --at list` found no default checkpoint directory;
explicit seed stages supply the looks. Not tested on a device. Real-time smoothness, Linux and independent review
remain unverified.
