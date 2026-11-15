# Step 11: trees and scattered props

## Before conversion

Read the entire status list: steps 1–10 are checked; Checkpoints A/B are not. Neither checkpoint is stated as a prerequisite for step 11. No WORLD_NS change is authorized or planned.

This worktree initially ran Node 24 and had no dependencies. Installed its own dependencies with `npm ci` under the existing Node 26.13.0 installation. `npm run inflight` found no overlapping tree/scatter work.

Checkpoint feasibility: the headless `npm run check` and `npm run level-check` commands can run here. Started the former before production edits, with output in `.look/prefab-step-11/check-before.log`. The prescribed worker browser broker `.look/see-client.ts` is absent, so the two stills, Gorge/Bell performance and leg-1 bot proof cannot run through that path. These remain open; no alternate Chromium launch was used. The checkpoint's 12 level reports are historical. `hut-blueprint` is not a test file in this checkout; the owner-requested exact golden supplies current tree/scatter coverage instead.

The pre-conversion golden executes the original tree catalogs and collider function, plus the original scatter on today's island and all four checked-in alternate layouts. It includes every ordered tree id, pose/root, clearance flag, generated cosmetic draw, standing placement, footprint, tile and sphere; standing, growth, fallen and collapsed tree collider outputs are captured too. It uses exact serialized bytes, without the other prefab goldens' numeric tolerance.

## As built

Baseline production commit: `bff2e620325e7860926687684cb05d4bcbdcb8cd`. The original-code fixture was committed separately in `6bd516091` before any production edit. Its 2,034,160 bytes remain unchanged; SHA-256: `2660a5b0cec6a9ff8c8e06cb0f5a11646a0b6247dbd24c320e9e037cdc77255f`.

- Four shared `scenery.*` records replace the three blueprint definitions and name the harvest-tree visual. `PrefabDef` now carries footprint/wet metadata and the leaning palm's sphere-chain recipe. It is named `trunk-chain` because prefab `trunk` already means a cylinder; no existing cylindrical recipe changes.
- Two compiled levels name the existing seeded generators. Home/mainland scatter seeds remain **20261028 / 20261029**. The frozen land planting seed remains **31**, and grove seed **77**. No RNG draw, exclusion or ordering changes. Native-derived coordinates remain runtime results, never rounded or serialized into content artifacts.
- `scatterProps` emits prefab `Placement` records. `LAND_TREES` remains the unchanged catalog authority; its survivors and the grove/oak/great-tree sources become ordered placements with the original numeric id represented as the placement id string. The existing renderer/sim-facing source adapter retains the exact numeric index and all pose values.
- `PropSample` is a projection for the existing procedural geometry and level analysis, not a second collider schema. The old `Blueprint`, `Collider` and generic blueprint `Placement` types are deleted with `src/blueprints/blueprint.ts`.
- Existing tile merges, per-home-palm bodies, state-driven harvest-tree bodies, clearance, ownership and disposal stay with their current owners. The harvest-tree record deliberately has no additional static body: adding one would duplicate the standing/fallen bodies. Standalone builders expose the existing prop/tree geometry through the prefab door; they do not replace the production animated tree batch.
- The catalogue is still loaded/validated once. Existing ten-consumer startup assertions and authored-number/native-math portability assertions remain enforced. No content ceilings, exemptions or architectural-debt increases were added.

The strict golden passes with **362 land trees**, **391 tree sources** and **1,800 ordered tree collider records**. Scatter totals are 234/237/234/234/236 for today/east-bay/lighthouse-line/net-line/west-cove. Standing totals are 234/237/234/200/236; sphere totals before layout clearance are 846/852/846/846/850. A separate assertion executes the actual runtime body grouping against the baseline home bodies and tile order. Generator seed/id assertions and a changed-seed probe cover the new placement layer.

Catalogue totals (reported, never ceilings): **203 → 207 records**, **14 → 16 levels**, **260,826 → 263,207 artifact bytes**. Per-area standalone canonical definition totals: greybox 7 / 7,200 bytes; halts 12 / 2,414; railway 5 / 3,468; roundhouse 6 / 3,160; scenery 4 / 1,193; town 173 / 47,553. Repeated placements do not create repeated definitions.

No `src/sim`, `src/world`, `src/net`, server source, `src/place/tree-catalog.ts`, railway golden fixture or namespace changes. No copy changes or suspect Boogler lines. No ROM data, push, ship or main-branch edits.

## Checkpoint findings and limits

Before conversion, `npm run level-check` passed with **15 reports**, not the historical 12. The baseline full-check attempt included the newly added golden and stopped at its missing test-selection load declarations (2,164 passing, one failure, one existing TODO). Those declarations are now precise dependencies on POI site sources; no assertion was relaxed. Subsequent integration fixes added the two builder names to old Gorge/leg-2 test doubles and staged the intended deletion before Git-based source enumeration.

Checkpoints A/B stay unticked. Still comparisons, Gorge/Bell perf, leg-1 bot play, owner/designer checkpoint acceptance, and real-time/device behavior are unverified here. The change router also requests an awake still and opening-to-T1 browser checks; the prescribed worker broker is absent. This is not a performance or visual-acceptance claim. No independent agent review was run by this implementation sub-agent.

## Verified checks

`npm run check` passed on the completed code: **2,169 tests passed, zero failed, one existing TODO** (2,170 total). This includes all nine railway golden test files, the exact tree/scatter golden, body grouping and seed/id proofs, existing prefab goldens, malformed-input validation, the ten-consumer single-catalogue startup proof and native-math artifact portability. Full lint, typecheck, registry, asset freshness, prefab freshness and the Vite production build passed too. Log: `.look/prefab-step-11/check-verified.log`.

The final level check again passed with **15 reports**. Its findings match the pre-conversion report after excluding the source fingerprint and measured durations. Historical report-only drawn-face and planned track findings remain; they were not silently waived. Logs: `.look/prefab-step-11/level-before.log` and the full-check log above. Registry reports no new cycles or debt growth. `WORLD_NS` remains **v47**.

The final committed-head gate is `node dev/ship-check.ts origin/main HEAD`; its execution result and final SHA are supplied in the handoff, with its local log at `.look/prefab-step-11/ship-check.log`. Nothing is pushed or shipped by this task.

## Review follow-up: standalone scenery parity

Cherry-picked the independent review tests from `8b61dbfcc` as `08e13af36`. Both failed before the fixes: 15 palm sphere heights differed in their last floating-point bits, and hardwood loose branches for ids 209/232 sampled the trunk height instead of terrain.

The standalone trunk-chain path now evaluates translation-only frames at the world origin, preserving the direct collider path's addition order (world height, joint height, then lift). Rotated/scaled frames retain the existing local-to-world transformation. The standalone harvest-tree builder passes the real terrain sampler `H` to the tree view. The review test's dependency bindings include `H`; neither review assertion was relaxed.

Added `test/fixtures/prefab-tree-interactions.json`, captured from **origin/main `55681aee115f96a502c679a4564624f43906231c`** before these fixes. The capture evaluates that revision's `tree-sources.ts` and `place-tree-view.ts`; its terrain, layout, tree catalogue, support and RNG dependencies match this checkout. Great tree 28 with its trunk carried emits only its stump and never reads the player. Ordinary tree 0 with a nearby player records one blocked sweep, a clear second sweep, teleport/velocity reset, and the fallen log body. These are exact JSON comparisons against the original code at the physics boundary, with scripted sweep responses; they do not claim live Rapier/browser coverage. Local capture recipe: `.look/prefab-step-11-review/capture-interactions.ts`.

The original tree/scatter fixture retains the SHA-256 above. No WORLD_NS, production tree body path, scatter input, catalogue artifact or ceiling changed. Catalogue totals remain **207 records / 16 levels / 263,207 artifact bytes**.

Validation: all **338 prefab and railway golden tests passed**, including both review tests and the two added golden cases. After making the new source load explicit for the test dependency scanner, the focused review/tree/selection run passed **18/18**. The preliminary integration gate caught only that scanner issue (935 passed, one failed); no dependency exemption was added. Logs are in `.look/prefab-step-11-review/`. The committed-head `node dev/ship-check.ts origin/main HEAD` result and review stamp are reported in the final handoff. Browser/device proof and Checkpoints A/B remain unverified as described above.
