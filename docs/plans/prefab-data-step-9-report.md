# Prefab step 9: workshop kit and shop (partial step)

Code tip: `cf5c508168a08d95f3ee67d285b3f4791ccb4d54`, tree `41e32d9ecc4f4350f076776514ccb8e9c375d1db`, on `codex/prefab-data-step-9`, based on local `origin/main` `86a2945d8`. No fetch, push or ship. The later report commit changes documentation only.

## Converted and remaining

- `063cea718`: capture the **old** workshop-kit and shop parts/solids/sign-reference goldens before production edits.
- `ba8d161bc`: convert the complete workshop kit into nine records, including all seven furnishing solids and both lanterns' glass. The original merged geometry/materials and body insertion order remain. Body add/remove ownership moves to `OwnedView`.
- `8ceec9361`: enforce sign and interaction registrations. Existing raw registrations, exports and consumer files are shrink-only; initial entries are verified against actual base source. Aliases, namespace/dynamic acquisitions, re-exports, comment bypasses, legacy-factory consumer additions and direct sign-builder imports are checked.
- `cf5c50816`: convert the complete shop furnishing into 17 records, including all nine solids, stand positions/headings, sign reference, hanger highlight, awning and frontage. Builders return parts; the original merged draws remain. The same view-authored interaction functions run through named record handlers, preserving stock-before-rail target order.

This uses the brief's workshop-kit/shop stopping boundary. **Remaining:** the room shells and their remaining furnishing in `rooms.ts`, `curio-shelf.ts`, and `museum.ts`. The four-line `rooms.ts` change only lets record instances follow the existing ready/teardown transition; it does not convert that file. Step 9 remains unchecked in the plan. Furnace guards and shell construction still hold `workshop.ts` in `ENTITY_SERVICES`; no seat rule was changed.

All scenery stays Local. No changes to `src/sim`, `src/world`, `src/net`, `server`, `src/boogler`, seat rules, Home layout constants or `WORLD_NS`. The author-owned town lines, including Sleeves, are unchanged. No ROM data.

## Golden and portability proof

`test/prefab-furnishing.test.ts` first ran the old functions with recording dependencies. Its fixtures were committed at `063cea718` before either conversion. Both are still **byte-identical**, without regeneration:

| Old fixture | SHA-256 |
| --- | --- |
| `prefab-shop.json` | `d928ea45837b9d26c2c55c35895453bf1e37156d04a872e73378446b91e2f263` |
| `prefab-workshop-kit.json` | `7d7d1cfcdd279e6e367bbdc0ab6367da876974642adc56e15ad40068789cc804` |

The older complete workshop collider and chair-placement fixtures also have no diff against `86a2945d8`. The shop world-body check sends the actual loaded records through `instantiate` and compares all nine bodies with the old local-solid fixture transformed by the original room function. Runtime coordinates use the shared absolute `1e-9` / relative `1e-12` tolerance; structure, strings, flags, order and counts stay exact. No tolerance was relaxed.

Committed JSON stores authored recipe names, dimensions, positions and headings in degrees. Builders derive primitive parts and angles at runtime. The compiler's authored-number tripwire and the pre-import additive native-math freshness probe both pass; committed bytes remain exactly fresh. There are now **36 records, six levels, 162,751 canonical bytes**.

An additional, deliberately stronger probe added `1e-15` to every runtime native result, including `sin(0)`. It failed seven of 209 tests: exact zero/rotation structure, old geometry assertions and a large-scale shear witness. That is retained as a failed negative probe, not concealed or treated as a platform result. The whole final prefab suite passes **210/210 normally and 210/210 with a relative one-ULP native perturbation**; additive perturbation still passes the actual artifact build/check. Linux execution is unverified.

## Copy inventory: unchanged

No wording moved into records. `shop.ts` still authors `YOURS`; the record label names `shop`, which the view resolves to the same `BOARDS.shop`. All referenced copy remains in its original authoring files.

| Authored source/reference | Exact unchanged text |
| --- | --- |
| `shop.ts` | `YOURS` |
| `BOARDS.shop` | `FINE PRICES` |
| `SHOP.today` | `TODAY: $0` |
| `SHOP.keepVerb` | `Take it: $0` |
| `SHOP.tryVerb` | `Try on` |
| `SHOP.wearVerb` | `Wear it` |
| `SHOP.offVerb` | `Take it off` |
| `SHOP.kept[0]` | `Yours. The receipt would cost more paper than the hat.` |
| `SHOP.kept[1]` | `That's a fortune you've saved. Spend it wisely.` |
| `SHOP.kept[2]` | `Very official. Nobody will know.` |
| `SHOP.kept[3]` | `Suits you. That's extra. It isn't.` |
| `SHOP.walkedOut` | `It's free! You didn't have to run!` |
| `SHOP.covered.forge` | `After the forge` |
| `SHOP.covered.trains` | `After the trains` |
| `STOCK[0].name` | `A paper work hat` |
| `STOCK[1].name` | `A very large button` |
| `STOCK[2].name` | `A sandwich board` |
| `STOCK[3].name` | `A very tall hat` |
| `STOCK[4].name` | `A station master's whistle` |
| All five stock `.line` values | Empty strings, unchanged |

Price tags still use the existing `dollars(listPrice(s))` formatter and the same names/ownership labels. Hanger prompts still use `wardrobe.swapLabel(slot, SHOP.offVerb)` (the unchanged `Swap hat: …`, `Swap accessory: …`, `Swap outfit: …` forms and their existing selected-item/off labels). The workshop-kit and workshop author no player-facing copy; their existing chair still offers `Sit` and `Stand up` from the seat service. `rooms.ts`'s lifecycle-only edit changes none of its caller-supplied painted text.

**Placeholder review for the owner:** no literal placeholder marker was found in the converted kit/shop copy. Keep the money gag intact; `TODAY: $0`, `Take it: $0`, the receipt/savings lines and the free walk-out line remain candidates for the owner's eventual economy/copy pass, not edits made here. Unconverted room/curio/museum copy has not been given a writing pass.

## Debt

| List | Before | After |
| --- | --- | --- |
| Collider debt | 104 files / 500 units | 104 / 498 |
| Seat debt | 11 files / 15 units | 11 / 15 |
| Workshop owner collider budget | 8 | 6 |
| New sign baseline, verified against old source | Previously untracked | 8 files / 17 units |
| New interaction baseline, verified against old source | Previously untracked | 8 files / 16 units |

No existing budget, public surface, allowance, suppression or test-selection debt grew. The two new registration lists record the brief's explicitly requested enforcement baseline, not new runtime calls. Their consumer identities also ratchet. Neither `workshop-kit.ts` nor `shop.ts` had its own direct debt entry on this base: both were already zero, so the literal requirement to shrink an entry for each converted file is impossible here. The verified owner-budget reduction is 8 → 6. `rooms.ts`'s existing debt remains for its later conversion.

## Checks

- Prettier ran on every changed file; canonical artifacts were then regenerated with `npm run prefabs`.
- `npm run check`: **1,875 pass, zero failures, one existing TODO**; lint, types, registry, assets, prefab freshness, level checks and production build pass.
- Explicit prefab suite: **210 normal / 210 relative-native-perturbed**, no failures. Additive pre-import artifact freshness passes. The failed stronger negative probe is described above.
- `node dev/ship-check.ts origin/main HEAD`: **425 assertions**, 45 affected test files, 23 lint files, passing at the code tip.
- `npm run registry`: passing, including registration-baseline and consumer ratchets.
- `npm run level-check`: **13 reports**, retained planned/never-drawn track findings; continuity remains OK for 18 tracks / seven joins.
- `npm run review-stamp -- . --no-fetch --base origin/main`: **`610aa0098d4e`**, seven fixture/test files flagged. This is a stamp for the caller's review, not independent approval.
- Production bot through T1: passed; all expected beats arrived, zero errors. Read `report.txt`, `verdict.json` and the opened end still. It did not visit town; the room actions are separate targeted proofs.

[Static logs and source identity](../../.look/prefab-step9/static-evidence.json).

## Browser evidence actually inspected

The before captures are the exact clean `86a2945d8` build. The final workshop, covered-item retry and bot capture are clean `cf5c50816`. Earlier after captures retain their worker dirty-state provenance in their manifests; no source changed during any run. The broker's harness commit is recorded separately from the worker build.

| Run / manifest | Opened image and observation |
| --- | --- |
| [Workshop before](../../.look/evidence/1794619921338-16845/evidence.json) | `step9-workshop-before-still.png`: stool, tub, floor, bench and logs; baseline Sit → Stand up succeeds. |
| [Workshop first after](../../.look/evidence/1794620404844-26473/evidence.json) | `step9-workshop-after-still.png`: the same visible furnishing positions; same seat id, prompts and sit/exit poses. |
| [Workshop final](../../.look/evidence/1794622547867-82105/evidence.json) | `step9-workshop-final-still.png`: opened against the baseline; visible floor, tub, stool, bench and log stack remain aligned. Sit/stand passes again on the final code tree. |
| [Shop before](../../.look/evidence/1794619991133-17572/evidence.json) | `step9-shop-before-still.png`: rail, stands, tags and floor after trying/taking the paper hat; unchanged receipt line. |
| [Shop after](../../.look/evidence/1794621578935-47115/evidence.json) | `step9-shop-after-still.png`: opened against the baseline; those visible fixtures and tags appear unchanged. Reward particles differ in phase; no pixel-equality or motion claim. |
| [All shop actions](../../.look/evidence/1794621743822-55628/evidence.json) | `step9-shop-interactions-still.png`: opened doorway view after the checks. Logs confirm all five stock targets' try/keep/off/wear transitions, three hanger slots, and automatic keeping on exit with the exact free walk-out line. |
| [Covered item retry](../../.look/evidence/1794622755891-89362/evidence.json) | `step9-shop-covered-retry-still.png`: opened wide room view, including counter, rug, rail, five stands and the covered whistle's `After the trains` tag. The blocked E press leaves the wardrobe unchanged. |
| [Short production route](../../.look/evidence/1794622882890-95246/evidence.json) | `run/end-still.png`: opened T1 completion at the producer; no rendered-error report. No town visit is inferred from this image. |

**Preserved failures:** the [first covered-item run](../../.look/evidence/1794622379321-73803/evidence.json) failed its expected-target assertion because active Nell Talk correctly took priority over a blocked item. The retry changed only the eval's position, outside Nell's 3.3 m talk radius; no game code changed. An initial playthrough request used unsupported broker `--name` and was rejected before capture; the corrected T1 command passed. The bare review-stamp invocation printed usage; the no-fetch form above succeeded. No Chromium bypass was used.

**Pre-forge proof:** the first additional T3 follow-up reached `T3 laid` and `facts: [path]`, but its immediate stock-target assertion ran while `rooms.shop.ready` was false. Its background error left the completion flag false and the wrapper reached its five-minute wall: [preserved health-failure manifest](../../.look/evidence/1794623109246-97104/evidence.json). The end still and report were opened/read. This was a failed probe, not a passing T3/gate result.

The [corrected T3 follow-up](../../.look/evidence/1794623487831-2875/evidence.json) waits for the existing shop construction to finish. It passes all route expectations and both covered E checks, with zero errors: `A very tall hat / After the forge` and `A station master's whistle / After the trains`, with the wardrobe unchanged on each press. Read `run/report.txt`, `run/bot.log` (lines 91–93), and `run/verdict.json`; opened `run/end-still.png`, which shows the whistle prompt over the completed shop. Its 56 saved checkpoints are retained. This is a T3 segment with targeted view actions afterward, not a full campaign or proof of natural first-time discovery.

## Limits and plan corrections

The partial boundary is explicit: room shells, curio shelf and museum remain. The old plan's sign/interaction inventory counts were stale, and the direct kit/shop debt entries it implied do not exist on this base. Moving bodies under an owner does not remove workshop's remaining guard/shell/service debt. No game-design chapter changed because this is a behavior-preserving refactor, not a new player-visible feature.

Not tested on a device. Linux, full campaign completion, real-time motion/smoothness, quiet-machine performance and independent review remain unverified. Only the named PNG stills were opened; motion sheets/videos were not used to claim feel.
