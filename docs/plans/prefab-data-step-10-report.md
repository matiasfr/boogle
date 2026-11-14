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
and map-display stands. Platform world-frame expansion remains with those legacy decks. This uses the brief's
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
and order remain exact. Equivalent quaternion signs are normalized to the old positive-w convention, as in the
curio proof. No baseline regeneration or relaxed tolerance. Disposal leaves no active recorded bodies.

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

Final check results and compared browser manifests are recorded below when complete.
Baseline Home road 1/road 2, stack-head pair and High Gorge stills were all opened. The Home canopy/posts/masts,
stack plaque order and Gorge platform layout are visible. No source changed during a capture.

`npm run inflight` attempted its implicit fetch and failed at the sandbox's FETCH_HEAD write; it was not retried.
Subsequent work uses local Git and local servers only. `look --at list` found no default checkpoint directory;
explicit seed stages supply the looks. Not tested on a device. Real-time smoothness, Linux and independent review
remain unverified.
