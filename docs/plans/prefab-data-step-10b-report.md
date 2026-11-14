# Step 10 completion: halt levers, attachments and crossings

Completed on `codex/prefab-data-step-10b`. Production commit **`a9bd72b56e06688fa619817afbd712d91215cf87`**,
rebased locally onto `origin/main` **`84cba95c02a5f2bfac22f664cab34ab44f28ed28`**. No push or ship.
DESIGN.md: **Clear authority**, **Small and readable**.

## Converted and remaining

Five additional shared definitions complete the kit. Compiler-generated placements and runtime expansion now own:

| Assembly | Instances | Preserved ownership |
| --- | ---: | --- |
| Request levers, handle plaques and request-stop interaction records | 19 | The view retains animated handles, chained states, dynamic destination copy, reach checks and request feedback. Moving ring/railhead levers retain their original moving transforms. |
| Signal arms | 6 | The view retains signal animation and reveal timing. |
| Home road pictogram plaques | 2 | The unchanged pictogram painter retains its textures and disposal. |
| Wooden map stands | 5 | Original drop sets, piece order and map display behavior. Home's two edges still share one. |
| Stack map stands | 4 | Original single instanced draw and stage-dependent visibility. |
| Plank crossings | 2 | Original flangeways, plank order, slab endpoints and grass step-support metadata. |

Together with the retained deck/base/pile, shelter, bench, canopy/posts, mast and all 17 ramp conversions,
**nothing remains in step 10's halt kit**; step 10 is checked. Other-area platform/terrain builders assigned to
later plan steps remain outside this conversion. Map drawing and train markers remain behavior in their existing
owners. No new mechanic, copy or game-design behavior was introduced.

Static lever, signal and plaque poses now resolve from their compiled row recipes rather than hand placement
in the view. Native frame, terrain and crossing geometry resolve at runtime; artifacts contain authored operands
and selectors only. The freshness fingerprint includes the original catalogs, platform rows, Home operands,
lever offsets and crossing operands. No rounding, catalogue value/order change, `WORLD_NS` change, sim/net/world
rule or server edit. No ROM data or Boogler changes.

The reviewer's inexpensive cleanup is included: the compiler/runtime share the Pier row; deck and attachment
expansion share a frame helper; shelter/canopy/mast post dimensions feed both visual parameters and collider recipes.
Existing view frame math and other-area recipes are preserved rather than broadened into a general frame rewrite.

## Old-code proof and budget

The original halt fixture remains byte-identical, SHA-256
`01df633cfac88285cb74171eb2d10c34b14bc6571cfb8e0c35be4c7ba9ecaef2`.
It covers eight progression states, all 24 catalog rows, 19 levers, meshes, drop-set parts, bodies, plaque strings
and ordered prompts. All existing railway golden files remain unchanged. Absolute `1e-9` / relative `1e-12`
tolerance is unchanged; structure, order, flags and copy remain exact. Disposal leaves no active recorded bodies.

Before production edits, **`08a0cf6b9`** captured actual request arguments from the old provider into
`test/fixtures/prefab-halt-requests.json`. After rebase this capture is **`dfe3be563`**. The new fixture pins all
15 offered calls in that final progression state; hidden/chained levers remain covered by the original snapshots.
The original fixture was not committed with regenerated data: its exact original bytes were restored and verified.

| Global budget | Before | After | Ceiling |
| --- | ---: | ---: | ---: |
| Shared records | 188 | **193** | **200** |
| Total canonical artifact bytes, including every level | 334,626 | **347,058** | **350,000** |
| Levels | 12 | 12 | unchanged |
| Expanded halt placements | 101 | 141 | no separate ceiling |

Headroom: **7 records / 2,942 bytes**. The halt area has 12 shared definitions, 2,414 standalone canonical
definition bytes, and a 31,188-byte level. The budget test prints per-area definition counts/bytes and each level's
bytes while retaining the single global assertion. Per-area attribution grants no extra allowance.
Tests add no Git lookup against origin/main and no wall-clock assertion.

Collider debt: **103 files / 475 units → 102 / 473**. `up-platforms.ts` leaves the list (1 → 0);
`halts-view.ts` falls 8 → 7 after its unused land acquisition disappears. Seats remain **11 / 15**.
Registration debt, public surfaces, suppression/importer budgets and all other ceilings do not grow.

## Checks and review

All production checks ran on the committed production source subsequently retained unchanged by the rebase.
The rebase brought in only an owner-calls documentation line: `git diff e256b7b37 HEAD -- src content dev test`
was empty after rebase. No source was edited while browser jobs were queued or running. The final report commit
changes documentation only.

| Check | Verified result | Evidence |
| --- | --- | --- |
| Changed-file Prettier, followed by `npm run check` | Pass: lint/types, **1,919 active unit passes**, zero failures, one existing fleet TODO; registry, levels, assets, freshness and build pass | [full check](../../.look/step10b-check-final.log) |
| Prefab tests, normal | **224/224**; also included in the final full check after subsequent source edits | [dedicated run](../../.look/step10b-prefabs-final.log), [final source check](../../.look/step10b-check-final.log) |
| Prefab tests with pre-import one-ULP native perturbation | **224/224**, shared tolerance unchanged | [log](../../.look/step10b-ulp-final.log), [preloader](../../.look/step10b-ulp.ts) |
| Pre-import perturbed compiler `--check` | Fresh: **193 / 12 / 347,058** | [log](../../.look/step10b-ulp-fresh-final.log) |
| Server tests | **371/371** | [log](../../.look/step10b-server.log) |
| Explicit registry | Pass, shrink-only debt | [log](../../.look/step10b-registry-final.log) |
| Explicit level-check | Pass: **13 reports**, existing planned continuity diagnostics retained | [log](../../.look/step10b-level-final.log) |
| `npm run loop -- run` | Pass | [log](../../.look/step10b-loop.log) |
| Review stamp, local/no fetch | **`56354397c689`**, six test/fixture files | [post-rebase stamp](../../.look/step10b-stamp-final.log) |

The one-ULP suite preserves exact native results 0 and ±1: perturbing `cos(0)` above 1 violates its mathematical
range and makes unrelated quaternion/geometry code produce NaNs. The initial unconditional probe nevertheless
passed the halt golden and compiler freshness, but six unrelated existing tests failed. Its [log](../../.look/step10b-ulp-tests.log)
is retained; no fixture or shared tolerance was relaxed. The existing additive portability test also passes.
Initial builder-mock omissions, a Railhead plaque-scale selection mistake, stale debt counts and TypeScript/unused
binding errors were fixed before the accepted final checks. No independent review was dispatched; the diff was
reread locally. The stamp identifies review scope, not independent approval.

## Opened visual evidence and actual actions

All seven PNGs below were opened. Every accepted capture has WebGPU, advancing completed frames, no graphics/page/
console errors, and unchanged clean `e256b7b37` before/after provenance. The trusted harness separately identifies
`d87c05719`; it is not the worker's production commit. These stills establish placement/action observations, not
pixel equality or smoothness.

| Question / opened image | Observation and limitation | Manifest |
| --- | --- | --- |
| Home assembly: `hill-still.png` | Single red canopy and deck, mast plaque and map stand remain aligned beside an actual stopped train. The foreground roof and rear-facing map limit fine attachment/face inspection. | [Home](../../.look/evidence/1794642608962-16927/evidence.json) |
| Quarry approach: `hill-still.png` | Both platforms, shelters and their ramps are intact. This frame does **not** show the crossing clearly; it is not crossing-placement proof. | [Quarry](../../.look/evidence/1794642609018-16933/evidence.json) |
| Stack press: `hill-still.png` | Buddy stands by the lever with the served train present and grey map stand in the foreground. The stand obscures one plaque. Real E input offered `Request stop: to Stack railhead`, set `asked: true`, and a train stood at halt 6/up track 0 after **334 server ticks**. | [press](../../.look/evidence/1794642608957-16928/evidence.json) |
| Stack pair: `hill-still.png` | Village is on the left/homeward and Stack railhead on the right/outward, with enlarged plaques and 3.99 m diagnostic separation. The right plaque is cropped at the image edge; its complete copy is pinned by the golden. | [pair](../../.look/evidence/1794642849664-29797/evidence.json) |
| Two-player request stop: `hill-still.png`, `p2-hill-still.png` | Existing `railway-request-stop.ts` completed the Quarry crossing walk, up-platform lever/plaque checks, accepted request and train stand. The other player boarded and requested Quarry from the train. Opened stills show trains at the platforms and the second player aboard; they do not isolate the crossing's plank detail. | [two-player actions](../../.look/evidence/1794642816243-27706/evidence.json) |
| T1: `run/end-still.png` | Buddy has the earned conductor hat beside the rack and the completed segment overlay. All expected beats came; the full report/verdict were read. Existing still periods include the build wait and are not render-stall evidence. | [T1](../../.look/evidence/1794642609090-16931/evidence.json) |

No bot expected-beat failure occurred. The two-player 5× run passed capture/action checks but reports a **3.189 game
second peak clock deficit on player 2**; final sampled world ticks differ by one. No multiplayer timing/convergence
claim is made. No performance benchmark, live Ring Island control-hold exercise, full campaign bot or Linux run was
performed. Not tested on a device. Real-time feel and smoothness remain unverified.

`npm run inflight` failed at its implicit FETCH_HEAD write before work; it was not retried. Subsequent operations
used local refs and the local browser broker only. No push, fetch retry or ship. Optional captures waited for other
sessions and the broker's machine-load gate; no other worker was stopped or bypassed.

## Defects P1–P3 and unchanged suspect copy

**P1: none found. P2: none found. P3: the co-op harness clock-drift limitation above remains; no product defect is
attributed to it.** The numerical goldens, request calls and actual train-stop actions pass. This is a local
assessment, not an independent reviewer verdict.

Unchanged suspect placeholder copy for the owner: `Request stop`, `Request stop: to <end>`, `Stop requested`,
`Stack railhead`; `Village`, `Camp`, `Village, line 2`, `Quarry`, `Far Head`, `Pier`, `Railhead`, `Ring Island`,
`Stack head 1`, `Stack head 2`, `Stack head 3`, `High Gorge`, `Bell Rock`, `Original Island`, `West landing`,
`Canopy Town`, `Lantern Notch`, `Saltpan Halt`, `Port Quay`. Repeated catalog names and the existing `, line 2`
suffix removal remain exact. No Boogler copy was edited.
