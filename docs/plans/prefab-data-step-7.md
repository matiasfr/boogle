# Prefab data step 7: leg 2 proof

Implemented on `codex/prefab-data-step-7`, from `origin/main` at `859abbe7c` (step 6 landed).
Implementation tip: `30ccf5025192fefeba235e4aabae4942d958014d`. This report follows in a documentation-only commit.
No push or ship. Not tested on a device.

During work the shared `origin/main` ref advanced to `f00736aec` with another session's seat/server changes.
This branch remains based on `859abbe7c`; no rebase or unrelated changes were included. The final
`ship-check origin/main HEAD` passed again after the proof commit. Integration with newer main is untested;
the forbidden-path diff against this task's launch base is empty.

## What changed

Bell Rock and the West landing now load committed level JSON, instantiate through the prefab runtime and retain
their existing resident owner. `src/content/levels/leg2.ts` owns the numeric authoring; the Gorge level includes its
incline placements while retaining all 86 existing placement values and ids. The public `Piece`, `Pad` and `Post`
layout APIs and their browser conversion code are gone. Private frame inputs are evaluated only by the compiler.
New static legs are authored as level files.

`greybox.pad` contributes four cube instances to the existing massing batch. Standing boards are label attachments
on `greybox.sign-post`; the distinct overhead board uses `greybox.sign-post-high`. Label references resolve to
unchanged authored text in `src/entities/route-greybox/leg2-layout.ts`. Levels and label keys validate at module
load, before residency. Missing references or versions fail closed.

The format needed these extensions, omitted by the original sketch:

- `ColliderDef.shape: 'trimesh'` with explicit local vertices and triangle indices. The runtime scales the vertices
  and retains the original indices/winding. Bell Rock's two prisms have 28/22 vertices and 40/31 triangles. These
  are the old map-outline prisms, not replacement boxes; the fix for the formerly 68.5 m unsolid rim is preserved.
- `visual.instances`: local transforms sharing the named builder/batch. A pad reserves, enables, disables and
  releases four contiguous slots. This avoids adding a draw per pad. Existing primitive transforms stay unchanged.
- Placement `labels` maps attachment names to authored text keys; label attachments specify their post arrangement.
  The existing sign board and exact paint routine are reused. Normal boards are 4.6 m wide on two posts with a
  1.2 m foot; the overhead board is 3.4 m wide on one post with a 2.4 m foot, hence its separate prefab variant.
- Optional level `analysis` contains examiner marks, reserves, placement references and under/over tags. It holds
  no parallel surface geometry. `dev/level/route-leg2.ts` reconstructs surfaces and pads from compiled placements
  and reads the rock triangles from the compiled prefab. An explicit foot-order array preserves report ordering
  through canonical JSON key sorting. The existing West-walk eval reads compiled marks too.

The explicit pure-content helper whitelist includes the shared leg-2 authoring source; no constructor exemption,
suppression, door budget or debt allowance was added. No sim/world/net/server, seat, Home station or namespace
file changed. No Boogler copy or ROM data was added or changed. Sync kind remains Local.

## Old-code goldens first

Commit `a935137ed27fddcf150a776269100936e84d670c` captures the old boundary before production edits: actual box
instance matrices/colours, signs' poses/options/text, collider recipes including both prisms, counts, and the level
report. The test executes the source-owned draw/instantiate boundary with recording physics; it does not render.

All twelve fixtures remain byte-identical to that commit, without golden regeneration after conversion:

- Bell and West: `prefab-{bell,west}-{colliders,placements,counts}.json` (six files).
- `prefab-leg2-report.json` (the complete report, including entry order).
- Gorge: `prefab-gorge-{colliders,placements,counts}.json` (three files).
- Workshop: `prefab-colliders.json`, `prefab-placements.json` (two files).

`git diff a935137e -- test/fixtures` is empty. The full Gorge placement array also deep-equals the old compiled
array. The live headless leg-2 report serializes to exactly the old report bytes, with zero failures and a 0.0 m
unsolid rim. [Local hash proof](../../.look/step7-golden-proof.json) records every fixture's SHA-256.

The runtime proof also checks compound-slot overlap rejection before allocation, all four disabled/enabled slots,
slot reuse after disposal, and removal of every box/rim body with its owner. Invalid level versions and missing
authored copy keys reject before massing is returned.

## Counts and debt

| Area | Compiled placements after | Visible boxes before/after | Area bodies before/after | Signs before/after | Massing batches before/after |
| --- | ---: | ---: | ---: | ---: | ---: |
| Bell | 68 | 75 / 75 | 23 / 23 | 6 / 6 | 1 / 1 |
| West | 29 | 28 / 28 | 8 / 8 | 1 / 1 | 1 / 1 |
| Gorge | 86 | 84 / 84 | 55 / 55 | outside this conversion | 1 / 1 |

Bell's body count is 21 boxes plus two trimeshes; the resident `solids` diagnostic historically reports only its
21 box bodies. The golden counts include all 23. Five pad records supply 20 visible cube instances. The compiled
set has eight prefab records and four levels (including the unchanged workshop), totalling 90,982 bytes.

Collider debt: **105 files / 502 units → 104 / 500**. Seat debt stays **13 / 20**. Combined entries/units:
**118 / 522 → 117 / 520**. Construction exports/importer counts: **63 / 82 → 62 / 81**.
`massing-bell.ts` drops its two raw units and its one legacy construction importer. The other converted files had
no raw collider-debt entry to remove; they stay at zero. No file, count, public surface or door budget grows.

## Browser proof actually inspected

Visual question: do the split rock, decks, ramp, outlined pads and boards at Bell, and the platforms, stair,
parapets and board at West retain their layout? Both views use the existing `gorge-reached` leg seed from
`src/sim/railway-seed-legs.ts`, `stack-at.ts` staging, `stack-draws.ts`, the same camera, and `--real`.
This is a stationary layout comparison, not a played route or walking bot.

| Area | Camera → target | Total draws before/final | Without named route meshes | Route draws added | Added triangles |
| --- | --- | ---: | ---: | ---: | ---: |
| Bell | `-160,75,-760` → `-50,10,-850` | 304 / 304 | 292 / 292 | 12 / 12 | 21,576 / 21,576 |
| West | `760,55,80` → `805,9,0` | 674 / 674 | 668 / 668 | 6 / 6 | 20,796 / 20,796 |

The ablation covers all named route meshes in the scene, not solely converted static massing. Named mesh counts
are 18/18 at Bell and 13/13 at West. Total triangles are 331,961/331,961 and 733,026/733,026 respectively.
Shared-machine load makes these count evidence only; frame timings are not performance evidence.

Opened these six stills, not the generated motion sheets:

- Bell [before](../../.look/evidence/1794606091275-55657/leg2-bell-before-still.png),
  [intermediate after](../../.look/evidence/1794607849056-98902/leg2-bell-after-still.png),
  [final](../../.look/evidence/1794608324248-10403/leg2-bell-final-still.png).
- West [before](../../.look/evidence/1794606257728-56570/leg2-west-before-still.png),
  [intermediate after](../../.look/evidence/1794607850125-98926/leg2-west-after-still.png),
  [final](../../.look/evidence/1794608325363-10412/leg2-west-final-still.png).

Observed: the split-rock silhouette, deck junctions, bridge and ramp at Bell appear unchanged. The West platforms,
stair endpoints, pale parapets and board placement appear unchanged. Water animation differs. These wide stills
do not establish board-text legibility or pixel identity; unchanged text/options and paint code provide the copy
proof. Every capture passed WebGPU, completed-frame and console/graphics-error checks. No bot/capture failures.
No full playthrough, walking-bot run, real-time motion/feel verdict, device test or quiet performance measurement.

Final manifests, both at clean implementation tip `30ccf502`, with no tree changes during either run:
[Bell](../../.look/evidence/1794608324248-10403/evidence.json),
[West](../../.look/evidence/1794608325363-10412/evidence.json).
Baseline manifests:
[Bell](../../.look/evidence/1794606091275-55657/evidence.json),
[West](../../.look/evidence/1794606257728-56570/evidence.json).

## Suspect placeholder copy for the owner

These are unchanged placeholders, not The Boogler's lines:

- `Stall: High Gorge (placeholder)` / `Not connected yet`
- `Stall: Ring Island (placeholder)` / `Not connected yet`
- `Stall: Home (placeholder)` / `Not connected yet`
- `Stall: Canopy Town (placeholder)` / `Not connected yet`
- `Stall: Port Quay (placeholder)` / `Not connected yet`
- `Market board (placeholder)`
- `LINE TO BELL ROCK` / `UNDER CONSTRUCTION`

## Checks and limits

- Prefab suite: 137 passing tests; final `npm run check` repeats these within its 1,801 passing tests, zero failures
  and one existing fleet-wait TODO. Lint, types, registry, levels, asset/artifact freshness and build pass.
  [Full check log](../../.look/step7-check.log).
- `node dev/ship-check.ts origin/main HEAD`: pass, 351 assertions, 40 affected test files, 21 lint files.
  [Log](../../.look/step7-ship-check.log).
- Explicit `npm run registry`: pass. [Log](../../.look/step7-registry.log).
- Explicit `npm run level-check`: pass, 13 reports. [Log](../../.look/step7-level-check.log).
- `npm run review-stamp -- . --no-fetch --base origin/main`: **3545df41e4f6**, ten golden/test files marked
  `review`. [Log](../../.look/step7-review-stamp.log). No independent review or shipping approval is claimed.
- Prettier ran on every changed code/data file; generated artifacts were then recompiled to their canonical
  format. Golden JSON was formatted at width 1 and retained its exact bytes.

The plan's original primitive-only format omitted the rim trimeshes, compound pad batching and distinct overhead
board profile; the extensions above preserve their actual old implementation. Its reference to collider code in
`leg2-draw.ts` was stale after step 6: the remaining raw collider construction was in `massing-bell.ts`. Its original
73/53 Gorge and 12-report counts were already corrected by step 6 (86/55 and 13). Checkpoint B remains separate;
this task does not claim its leg-1 bot walk or quiet performance measurement.

Process departure: `npm run inflight` performed one fetch before the local-network-only restriction was noticed.
This was reported immediately. No subsequent external network operation, push or ship was used.
