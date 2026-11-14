# Prefab step 9 follow-up: curio shelf and finders' bay

Implementation: `9a1b93ec4`, based on local `origin/main` `c6c669dbe`; no fetch, push or ship. Runtime evidence is clean `2e5a167b0` (tree `54f1529317ae62b16ddfd9a3e23c4b90a210b821`). The final rebase inherited only `docs/agents/orchestrator-state.md`; `src`, `content`, `dev` and `test` are byte-identical to that tested commit. The later report commit is documentation only. The original implementation was `43464dd3b`; both rebases kept this conversion's source, records, builder and golden byte-identical.

This is a partial completion of the owner-requested three remaining modules. The entire `curio-shelf.ts` furnishing is converted: two frame records with their colliders and footprints, twenty-two individual gift records with authored slot operands, and the shared dust-skirt record. All builders return parts into the same frame, uncovered and covered merged meshes. There are no raw signs, labels or interaction registrations in this module: it remains display-only. **Remaining, untouched:** `rooms.ts` and `museum.ts`. Step 9 stays unchecked. Workshop's service exemption still has its existing guard/shell owner.

## Old-code proof

`2c414789b` (replayed first as `f4acca580`, finally as `784b47058` on the new base) captured the old implementation before production edits. The immutable `test/fixtures/prefab-curio.json` SHA-256 is `941837baa194e0f24ce73079502a690bbda08a936ded7b7ab0f8a8e68db84b17`. The test subsequently moved into the established `prefab-furnishing.test.ts` source adapter so no test-selection allowance grew. It records frame and gift parts, both world bodies, NPC footprints, all 22 synthetic ownership/reveal stages, visibility/shadow flags, geometry bounds, 13 crystal pegs and nine finders' bay pegs. Repeated wear events do not redraw; the no-player snapshot emits no reveal particles. Runtime values use the existing absolute `1e-9` / relative `1e-12` tolerance; identifiers, array order/counts, flags and strings stay exact. Quaternion snapshots use the old yaw convention (positive w): q and -q are the same orientation. The fixture is never regenerated after conversion.

Compiled records contain authored widths, collider dimensions, gift IDs, column/row operands and board heights only. Terrain, bay-to-shelf matrices, gift bounds/lift, quaternions and native math remain runtime values. The additive native-math artifact freshness probe still applies to the new record list.

## Copy: all unchanged, in the same authoring files

`curio-shelf.ts` authors **no user-facing strings**. Item names/descriptions stay character-for-character in `src/render/cosmetic-parts.ts` and its existing T1 reward reference. No text is moved into prefab records. The following is the complete referenced gift-copy inventory; `""` means the existing empty description. The Boogler's and Sleeves's source and lines are untouched, as are unconverted room/museum copy.

| Gift | Name, unchanged | Description, unchanged |
| --- | --- | --- |
| hat | A conductor's hat | "Yours. It suits you." |
| beanie | A beanie | "" |
| teacup | A teacup | "" |
| scarf | A very long scarf | "Knitted by someone in the village, probably." |
| glasses | Round glasses | "" |
| headphones | Oversized headphones | "" |
| overalls | Work overalls | "" |
| raincoat | A raincoat | "" |
| festival | Festival overalls | "" |
| critter | A small stowaway | "It was in the crate. It seems to like you." |
| strawhat | A straw hat | "" |
| lampcap | A lamplighter's cap | "" |
| mossscarf | A mossy scarf | "" |
| whistle | A brass whistle on a cord | "" |
| goggles | Cable goggles | "" |
| bucket | A bucket | "" |
| pennant | A tower pennant | "" |
| hardhat | A hard hat | "" |
| aviator | An aviator's cap | "" |
| diving | A brass diving helmet | "" |
| egg | Something round | "" |
| scope | Something on legs | "" |

**Suspect placeholder copy for the owner, preserved:** `Something round` and `Something on legs`; the nineteen empty gift descriptions (beanie, teacup, glasses, headphones, overalls, raincoat, festival, strawhat, lampcap, mossscarf, whistle, goggles, bucket, pennant, hardhat, aviator, diving, egg, scope). No wording was filled in or edited. No ROM data.

## Debt

Collider debt: **104 files / 498 units → 104 / 496**, with `curio-shelf.ts` **3 → 1**. Its remaining terrain module import is the one raw capability unit; there is no direct collider construction. Seat debt stays **11 files / 15 units**. Sign debt stays **8 / 17** and interaction debt **8 / 16**. No allowance, suppression, public-surface, constructor-importer, or test-selection debt increased.

## Preserved failed probes

- The first baseline capture rendered healthy WebGPU but failed provenance because the old-golden commit changed the tree while the request was queued. Its still was not used as the accepted baseline; the clean repeat succeeded.
- Initial full/prefab checks failed on fixed runtime test builder maps, the portability test's enumerated record list, and the new test file's source-adapter debt. The fixes update existing adapters and move the golden test into its established file; no allowances added.
- An intentionally naive relative native probe changed `cos(0)` above 1 and generated NaN geometry in three.js, failing the curio snapshot. The relative native probe (`1 + Number.EPSILON`, preserving exact trig endpoints) preserves exact zero and trig range endpoints; this is a probe correction, not a production math or golden-tolerance change.

## Browser evidence opened

Visual question: do shelf boards, sheets, gift silhouettes and the crystal row stay in the same places as origin/main, with no new shelf E action? Action: stand at the shelf in the q6-done seed; compare the identical covered state, then grant personal cosmetics and exercise existing finds. Fixed game-distance camera for the shelf; explicit world camera for the bay retry. No source edit occurred during a running capture. The first rejected baseline request did overlap a test-only commit while queued; its failed provenance is retained.

| Manifest | PNG actually opened; observation |
| --- | --- |
| [Clean old-code baseline](../../.look/evidence/1794625177326-59885/evidence.json) | `step9b-curio-baseline-still.png`: the old origin/main game source at `2c414789b`, sheets and unlit crystal row; E offers no target. |
| [First after](../../.look/evidence/1794625385175-66878/evidence.json) | `step9b-curio-after-still.png`: covered shelf parts appear aligned with baseline; resident/train positions vary. |
| [Final covered shelf](../../.look/evidence/1794625876788-86647/evidence.json) | `step9b-curio-final-still.png`: same board heights, sheet silhouettes and crystal row as baseline. Captured clean `4ec8584b0`; the final amended `43464dd3b` differs only in the action-eval header/assertions, not game code. No pixel-equality claim. |
| [Final action assertions](../../.look/evidence/1794626278894-99554/evidence.json) | `step9b-curio-actions-still.png`: opened; obtainable shelf gifts remain on their boards, two shapes still sheeted. Browser assertions pass for E leaving wardrobe unchanged, 20 obtainable grants, exact shelf/bay order, two unobtainable shapes, and finite crystal/find pegs. Clean `43464dd3b`. |
| [Bay first framing](../../.look/evidence/1794626319482-99871/evidence.json) | `step9b-bay-find-still.png`: opened; **generic hill**, so no bay visual verdict. Logs record E opening `alcove` then `yard`, both world/bay boxes no longer waiting, and the reveal dismissed. The repeated-E eval can take a nearby box first; this is not an isolated one-press target-priority proof. |
| [Bay fixed-camera retry](../../.look/evidence/1794626410407-1394/evidence.json) | `step9b-bay-framed-still.png`: opened; straw hat and goggles visibly stand on the bay's upper board; the other gifts stay sheeted, remaining crates stand in front. Same existing repeated-E sequence and accepted personal finds. The bay has no separate old-build image; its old parts, body and peg values are golden-tested. |
| [Crystal pickup](../../.look/evidence/1794626369612-1048/evidence.json) | `step9b-crystal-still.png`: opened; the leftmost crystal is lit on the original bottom row. Existing walk pickup records/stores crystal `[0]`, `lit: 1`, with the other six unlit. |
| [T1 production bot](../../.look/evidence/1794626452773-1727/evidence.json) | `run/end-still.png`: opened; Buddy has the conductor hat at the producer. Read `run/report.txt` and `run/verdict.json`: all expected T1 beats arrive, zero errors, twenty saved checkpoints. No town/building/shop/museum visit occurred. |

All accepted captures report WebGPU, advancing completed frames and no graphics/page/console errors. The bot reports two still periods totaling 2 min 36 s of game time; they include its construction wait, not a measured frame hitch. Motion sheets/videos were not opened or used to claim feel. Real-time smoothness, quiet-machine performance, multiplayer, Linux, full campaign, and independent review remain unverified. **Not tested on a device.**

The protected source paths, wardrobe/finds rules, seat rules, Home station layout constants and namespace have no diff from origin/main. No push or ship. `npm run inflight` attempted its built-in fetch and failed at the sandbox's FETCH_HEAD write; no escalation or retry was made. Later inspection used local Git state only.

## Rebase

While the final full check ran, another session advanced local origin/main from `fda0fc668` to `00050e64c`. Registry then rejected this branch's obsolete `trees` and `FRISBEE_SPOT` public-export allowances. A clean local rebase inherited main's removals and runtime/lint cleanup; it did not add debt, edit protected paths relative to the new base, or change any curio source/record/builder/golden bytes. The stamp stayed `88e93a810120`. Earlier pre-rebase checks and looks above retain their actual fingerprints; fresh verification follows below.

## Verified checks after the rebase

- `npx prettier --write` ran on every changed file, followed by the canonical `npm run prefabs` output. Golden unchanged. No final working edits.
- `npm run check`: **1,910 pass, zero failures, one existing TODO** (1,911 cases); lint, types, registry, level reports, assets, artifact freshness and production build pass. [Full log](../../.look/step9b-check-final-head.log).
- Explicit prefab suite: **213/213 normal and 213/213 relative-native-perturbed**, zero failures. The preload multiplies native results by `1 + Number.EPSILON`, preserving exact zero and ±1 trig endpoints. This is a probe definition, not a production math change. [Normal](../../.look/step9b-prefabs-rebased.log), [perturbed](../../.look/step9b-perturbed-rebased.log), [reproducible preload](../../.look/step9b-native-ulp.ts).
- Pre-import additive native perturbation through the actual artifact checker: fresh, **61 records, six levels, 171,700 canonical bytes**; authored-number tripwire passes. [Log](../../.look/step9b-artifact-rebased.log), [preload](../../.look/step9b-native-additive.ts).
- `node dev/ship-check.ts origin/main HEAD`: **447 assertions**, 46 affected test files, 11 lint files, passing at the implementation tip. [Log](../../.look/step9b-ship-final-head.log).
- Explicit `npm run registry`: pass; no debt growth. [Log](../../.look/step9b-registry-rebased.log).
- Explicit `npm run level-check`: **13 reports**; retained planned/never-drawn track findings, continuity OK for 18 tracks/seven joins. [Log](../../.look/step9b-level-rebased.log).
- `npm run review-stamp -- . --no-fetch --base origin/main`: **`88e93a810120`**, six test/fixture files flagged. This names the caller's review; it is not independent approval. [Log](../../.look/step9b-stamp-final-head.log).

## Fresh browser evidence on rebased `2e5a167b0`

- [Covered shelf manifest](../../.look/evidence/1794626751035-15063/evidence.json): opened `step9b-rebased-shelf-still.png` against the clean old-code baseline. Boards, covered silhouettes and bottom crystal row remain aligned; resident/train phases differ. E still offers no shelf target. WebGPU/frames/errors pass on the clean rebased source.
- [Rebased action assertions](../../.look/evidence/1794627139148-25149/evidence.json): opened `step9b-rebased-actions-still.png`; the visible obtainable gifts remain on their boards and the two unobtainable shapes stay sheeted. E/no wardrobe change, all 20 grantable IDs, order, counts and pegs pass again.
- [Rebased bay E flow](../../.look/evidence/1794627177930-25527/evidence.json): opened `step9b-rebased-bay-still.png`; straw hat and goggles stand on the bay boards after dismissing the existing crate cards. Logs again record both `alcove` and `yard` as found and their world/bay boxes gone. Same repeated-E targeting limitation as the earlier run.
- [Rebased crystal pickup](../../.look/evidence/1794627272367-28318/evidence.json): opened `step9b-rebased-crystal-still.png`; leftmost crystal lit at its bottom-row peg, the other six dark. Logs persist crystal `[0]`, `lit: 1`.
- [Rebased T1 bot](../../.look/evidence/1794627312106-28691/evidence.json): read `run/report.txt` and `run/verdict.json`, opened `run/end-still.png`; every expected beat arrives, zero errors, twenty saved checkpoints. Two still periods total 2 min 52 s of game time, including the construction wait. No town visit, full-campaign or real-time performance claim.

A later local origin/main advance, `c6c669dbe`, contained only the orchestrator-state document. A second clean rebase inherited it after the browser runs, without changing any runtime, content, tooling or test bytes. No browser was running during either rebase. Final static checks were repeated on the report tip; stamp unchanged. [Machine-readable static/evidence index](../../.look/step9b-static-evidence.json).
