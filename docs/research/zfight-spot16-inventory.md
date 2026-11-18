# Spot 16 per-piece runtime inventory audit

> **Verdict:** the census inventory matches current runtime selectors; the recovery contact group alone disappears.
> **Top recommendations:** retain per-piece removal/addition evidence rather than attributing all inventory drift to recovery objects.
> **Status:** reference; audit shipped in #1843 (14 November 2026), with no game-source change.

Audited against `origin/main` **2d86cf80b3ca9fe1274e05158a61959fbf8d86b8** (14 November 2026).
The runtime source files cited below are identical between that main and this branch. No adapter or game source
change was needed for this audit: every removal/addition matches runtime. This corrects the earlier implication
that only recovery objects changed. **Only the recovery contact group** disappears, but the object inventory
also drops other deleted prototype objects and gains previously uncensused live meshes.

## Removed objects: one row per old census piece

**D** is commit `e6f2961e1633857c1598989af0adf56312e5d2a2`, which deleted `src/proto/place/tech.ts`.
The line numbers below refer to that file at **D's parent**, reproducible with
`git show e6f2961e1^:src/proto/place/tech.ts | nl -ba`. Its `buildPads()` drew all PADS plus recovery/glide ramps;
its column loop drew `JUMP_COURSE.slice(1)`. Removing the prototype removed those drawing paths.

**S**, the current runtime selectors, is exhaustive for these tech pad families:
`src/entities/railway/tools.ts:96–113` selects only `p1`; `line2-view.ts:419` selects only apron and p2;
`hook-view.ts:54` selects `hookRings(...).slice(1)`, whose explicit IDs are in `hook-path.ts:15–18`;
`src/entities/finds/secrets-view.ts:89–112` selects lookout, stack, balcony and loft supports.
None selects a jump-course block or Far Head glide pad. `secrets-view.ts:69` explicitly states the glide pad/ramp
are cut. Remaining `tech-layout.ts` records, tree-catalog exclusion footprints and meadow-field exclusion masks
are data consumers, not mesh builders; retaining their coordinates does not draw these pads.

| Old census piece | On current main | Removal and current-path evidence |
| --- | --- | --- |
| pad/p1-block | absent | D: deleted `buildPads()` PADS loop, parent lines 93–120; current selectors S do not select this id |
| pad/j1 | absent | D: deleted `buildPads()` PADS loop, parent lines 93–120; current selectors S do not select this id |
| pad/j2 | absent | D: deleted `buildPads()` PADS loop, parent lines 93–120; current selectors S do not select this id |
| pad/j3 | absent | D: deleted `buildPads()` PADS loop, parent lines 93–120; current selectors S do not select this id |
| pad/j4 | absent | D: deleted `buildPads()` PADS loop, parent lines 93–120; current selectors S do not select this id |
| pad/j5 | absent | D: deleted `buildPads()` PADS loop, parent lines 93–120; current selectors S do not select this id |
| pad/j6 | absent | D: deleted `buildPads()` PADS loop, parent lines 93–120; current selectors S do not select this id |
| pad/j7 | absent | D: deleted `buildPads()` PADS loop, parent lines 93–120; current selectors S do not select this id |
| pad/glide-home | absent | D: deleted `buildPads()` PADS loop, parent lines 93–120; current selectors S do not select this id |
| pad-column/p1-block | absent | D: deleted `JUMP_COURSE.slice(1)` column loop, parent lines 153–160; no current course builder (S) |
| pad-column/j1 | absent | D: deleted `JUMP_COURSE.slice(1)` column loop, parent lines 153–160; no current course builder (S) |
| pad-column/j2 | absent | D: deleted `JUMP_COURSE.slice(1)` column loop, parent lines 153–160; no current course builder (S) |
| pad-column/j3 | absent | D: deleted `JUMP_COURSE.slice(1)` column loop, parent lines 153–160; no current course builder (S) |
| pad-column/j4 | absent | D: deleted `JUMP_COURSE.slice(1)` column loop, parent lines 153–160; no current course builder (S) |
| pad-column/j5 | absent | D: deleted `JUMP_COURSE.slice(1)` column loop, parent lines 153–160; no current course builder (S) |
| pad-column/j6 | absent | D: deleted `JUMP_COURSE.slice(1)` column loop, parent lines 153–160; no current course builder (S) |
| pad-column/j7 | absent | D: deleted `JUMP_COURSE.slice(1)` column loop, parent lines 153–160; no current course builder (S) |
| pad/jump-catch-0 | absent | D: deleted recovery slab expansion, parent line 96; no runtime recovery builder (S) |
| pad/jump-catch-1 | absent | D: deleted recovery slab expansion, parent line 96; no runtime recovery builder (S) |
| pad/jump-catch-2 | absent | D: deleted recovery slab expansion, parent line 96; no runtime recovery builder (S) |
| pad/jump-catch-3 | absent | D: deleted recovery slab expansion, parent line 96; no runtime recovery builder (S) |
| pad/jump-catch-4 | absent | D: deleted recovery slab expansion, parent line 96; no runtime recovery builder (S) |
| pad/jump-catch-5 | absent | D: deleted recovery slab expansion, parent line 96; no runtime recovery builder (S) |
| pad/jump-catch-6 | absent | D: deleted recovery slab expansion, parent line 96; no runtime recovery builder (S) |
| pad/jump-return | absent | D: deleted recovery ramp expansion, parent lines 97–104; no runtime recovery builder (S) |
| pad/glide-ramp | absent | D: deleted glide ramp expansion, parent lines 97–104; secrets-view.ts:69 explicitly excludes Far Head glide pad/ramp (S) |

## Added objects: one row per newly censused runtime mesh

These 12 pieces have no old pad/column-box counterpart. They are all attached by the actual builders: tools' `mesh`
adds to its owned root, line2's `mesh` calls `owner.add` (line 139), hook's `add` calls `owner.add` (line 51), and
secrets' `parts` are merged into the owned static mesh (`secrets-view.ts:226–232`, the final `mergeGeometries(parts)` path).
Underlays use the opaque glow node material from `hook-view.ts:37–44`; they are real drawn boxes, not colliders.

| Census piece | Runtime object | Builder on current main |
| --- | --- | --- |
| tech/tools/0 | first pillar cylinder | src/entities/railway/tools.ts:97–103 |
| tech/line2/3 | p2 pillar cylinder | src/entities/railway/line2-view.ts:437–441 |
| tech/secrets/5 | balcony column | src/entities/finds/secrets-view.ts:114–132 |
| tech/secrets/6 | stack column | src/entities/finds/secrets-view.ts:114–133 |
| tech/hook/1 | t0 underside light | src/entities/railway/hook-view.ts:86–88; hook-path.ts:15–18 selects this pad; look=float |
| tech/hook/3 | t1 underside light | src/entities/railway/hook-view.ts:86–88; hook-path.ts:15–18 selects this pad; look=float |
| tech/hook/5 | t2 underside light | src/entities/railway/hook-view.ts:86–88; hook-path.ts:15–18 selects this pad; look=float |
| tech/hook/7 | t3 underside light | src/entities/railway/hook-view.ts:86–88; hook-path.ts:15–18 selects this pad; look=float |
| tech/hook/9 | t4 underside light | src/entities/railway/hook-view.ts:86–88; hook-path.ts:15–18 selects this pad; look=float |
| tech/hook/11 | t5 underside light | src/entities/railway/hook-view.ts:86–88; hook-path.ts:15–18 selects this pad; look=float |
| tech/hook/15 | nook underside light | src/entities/railway/hook-view.ts:86–88; hook-path.ts:15–18 selects this pad; look=float |
| tech/hook/18 | stack-return underside light | src/entities/railway/hook-view.ts:86–88; hook-path.ts:15–18 selects this pad; look=float |

## Retained objects: old boxes replaced by actual runtime mesh buffers

No surviving old pad or support was removed. The 20 surviving old boxes map to these 20 runtime pieces.
Paths abbreviated here are in `src/entities/railway/`, except secrets-view.ts in `src/entities/finds/`.

| Census piece | Runtime object | Builder |
| --- | --- | --- |
| tech/tools/1 | p1 | tools.ts:98–113 |
| tech/line2/0 | apron | line2-view.ts:419–422 |
| tech/line2/1 | apron support | line2-view.ts:424–427 |
| tech/line2/2 | p2 | line2-view.ts:419–422 |
| tech/hook/0 | t0 | hook-view.ts:54–70; hook-path.ts:15–18 |
| tech/hook/2 | t1 | hook-view.ts:54–70; hook-path.ts:15–18 |
| tech/hook/4 | t2 | hook-view.ts:54–70; hook-path.ts:15–18 |
| tech/hook/6 | t3 | hook-view.ts:54–70; hook-path.ts:15–18 |
| tech/hook/8 | t4 | hook-view.ts:54–70; hook-path.ts:15–18 |
| tech/hook/10 | t5 | hook-view.ts:54–70; hook-path.ts:15–18 |
| tech/hook/12 | summit | hook-view.ts:54–70; hook-path.ts:15–18 |
| tech/hook/13 | alcove | hook-view.ts:54–70; hook-path.ts:15–18 |
| tech/hook/14 | nook | hook-view.ts:54–70; hook-path.ts:15–18 |
| tech/hook/16 | loft | hook-view.ts:54–70; hook-path.ts:15–18 |
| tech/hook/17 | stack-return | hook-view.ts:54–70; hook-path.ts:15–18 |
| tech/secrets/0 | lookout | secrets-view.ts:93 |
| tech/secrets/1 | stack | secrets-view.ts:93 |
| tech/secrets/2 | balcony | secrets-view.ts:96 |
| tech/secrets/3 | lookout support | secrets-view.ts:109 |
| tech/secrets/4 | loft support | secrets-view.ts:112 |

## Inventory contract and verification

Original inventory: **46** legacy pad/column boxes. **26** deleted prototype objects removed; **20** surviving
objects retained as runtime meshes; **12** live pillar/column/underlay objects newly captured: **32** current meshes.
The added sources are actual builder sections; no hard-coded exclusion was added.

`test/zfight-tech-source.test.ts` compares the final drawn census with `test/fixtures/zfight-tech-inventory.json`.
The fixture pins each ID's face count and world-space minimum/maximum bounds (to 0.1 mm), so swapped, moved,
duplicated or reshaped pieces fail even if the total count stays the same.
The fixture covers all twelve added meshes as well as every surviving pad/support. Updating it requires comparing
the changed runtime builders against this table; it is not a license to silently accept an inventory change.

Census rerun: **a/b/c 166/61/548**, raw **360/172/2443**, **6,270 pieces / 544,464 faces**; unchanged from e569c508f.
The pre-implementation census was 167/61/548: the only removed contact group remains catch-6 ↔ jump-return.
No baseline rewrite, depth bias, game geometry, height, collision, WORLD_NS, Boogler-copy or ROM-data changes.
No fresh visual capture needed for this tooling/test/documentation audit; previously opened spot stills remain
historical evidence. Full-route play and temporal flicker unverified. **Not tested on a device.** No push or ship.

Validation: bounded `npm run zfight -- --json --all` and `node dev/ship-check.ts origin/main HEAD` pass (registry, 3 lint files, typecheck, 20 affected test files, 168 passing tests). Evidence logs: `.look/zfight-spot16/inventory-audit-{census.json,check.log}`.
