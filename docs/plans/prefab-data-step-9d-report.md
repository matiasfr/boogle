# Prefab step 9d: town rooms complete

Code/test tip: `5687260bd5896d0f6703b6a6844a6ae01e389846`, tree
`da5e5439a0821610f2bcee9a00f7774452b73dbd`, based on local `origin/main` `3dcf42653685b02fe644cb09e8817404cc8df822`.
The report/plan commit adds documentation only. No fetch, push or ship.

## Converted and remaining

The complete `rooms.ts` conversion is done: **428 records** cover all 309 shell pieces, 58 scaffold pieces,
24 shell hulls, 15 scaffold colliders, 21 shadow-proxy parts and the plot-board recipe. Each construction
builder returns the original `Box` parts (including matrices, colours, palette, taper and order), consumed by
exactly the existing shared construction set. The proxy builder returns primitive parts for the same merged
shadow mesh. Hull and scaffold records own collider recipes; the site's existing solidAt/completion/snap
transitions enable and disable their instances. Keep-out/ejection, scaffold removal and owner teardown retain
old behavior. Plot boards use record colliders and label attachments; the view paints their original one-draw
frame/post/paper with the caller's unchanged text. No room record introduces an E action.

Inspection found `house.ts` still using the old `rooms.ts` solid helper, despite the prior report's last-file
summary. It is also fully converted: **27 records**, eight solids, both labels, exterior dressing and four
fact displays. All 16 fact masks retain the original count-based display behavior. This necessary scope
addition lets the obsolete `addSolid`, `plankFloor`, parallel solid list and raw furnishing-body construction
leave `rooms.ts` entirely. House builders preserve its original two merged draws and appended dressing order.

Artifacts now have **545 records, 11 levels, 499,127 canonical bytes**. The 455 additions are the 428 room
records and 27 house records. Compiled JSON contains authored dimensions, colours, recipe keys and indices;
world frames, terrain heights, native rotations, construction matrices and roof slopes are runtime values only.
The room hull loader validates finite operands, phases and indices before resolving the authored recipe.
Construction results reject nonidentity local placements, batches and moving parents instead of silently
ignoring those transforms. No tolerance, lint allowance or test-selection debt was relaxed.

**Step 9 is complete. No listed room/furnishing module remains.** Workshop's existing shell/guard/service work
still holds its `ENTITY_SERVICES` exemption, so that conditional removal does not apply; workshop is untouched.
The existing `sites.ts` legacy path remains for other construction clients, alongside its optional record
lifetime input. Broader site conversion is outside this step. All scenery stays Local; no state kind,
authority, message, wire, save or namespace changes.

## Old-code golden proof

`20859568b` committed the old rooms and house fixtures before either runtime conversion. `939c26662` then
committed an additional old-site lifecycle fixture before `954d56424` changed the site lifetime path; capture
executed the exact old `20859568b` site source. The final tests do not depend on historical Git objects.
Production house conversion is `0c7c3d11b`; shell conversion is `fe68c776d`; adapter/check completion is `5687260bd`.
No fixture was regenerated after its conversion. Their SHA-256 values remain:

| Fixture | SHA-256 |
| --- | --- |
| `prefab-rooms.json` | `ad2343a722ae257d26420f0bbdfdd9cb894de71660ee37ae141bdb4067d37e1f` |
| `prefab-house.json` | `786a3c30a659f9a8b6226e16999a482d97571ecfb6e80052f57908e36e4b54e1` |
| `prefab-site-lifecycle.json` | `b584566e58d874dad883145d37d159cbd7e5b5e3c2936d8e876af820551187a0` |

The actual source adapters compare complete construction plans, every matrix/colour/palette/taper, shadow
proxy and stake geometry/flags, painted text arguments, stake world bodies, piece writes and all three
rooms' threshold/inside/cutaway/culling transitions. Readiness propagation is checked in every snapshot.
Unbuilt shop/museum plots, each room's building/unready and standing states, removal, and snapshot restoration
retain the old board, furnishing-enable, floor-query and cutaway flags. Each room's actual instantiated shell
and scaffold bodies are also compared in order against the old plan's
hulls through the original world-frame calculation, including ROOM_GROUP and repeated enable/disable behavior.
The old house parts, eight solids and both labels match for every fact mask; unchanged stages do not redraw.

The actual site adapter compares old/current legacy and record paths at the solidAt boundary, during building,
at completion, during ejection, on repeated snaps, removal/restoration and repeated disposal. Body ownership
rejects duplicate removals and ends empty, with no remaining sites/feet. A deliberate in-memory omission of
record hull disabling fails the teardown assertion with two leaked bodies; production remains unchanged.
[Negative probe](../../.look/step9d-site-negative.log), [old source preload](../../.look/step9d-site-old-preload.ts).

Runtime numbers retain the shared absolute `1e-9` / relative `1e-12` tolerance. Keys, identifiers, lengths,
counts, indices, flags, order and strings remain exact. The authored-number tripwire, normal freshness and
pre-import additive native-math artifact freshness all pass. Relative native perturbation preserves zero and
exact trig endpoints and passes the entire prefab suite; no production math changed.
[Relative preload](../../.look/step9d-native-ulp.ts), [additive preload](../../.look/step9d-native-additive.ts),
[artifact proof](../../.look/step9d-artifact-perturbed.log).

## Every referenced player-facing string: unchanged

`rooms.ts` and `house.ts` author no literal user-facing prose. Every referenced line remains authored in
`src/entities/town/town-lines.ts`, character for character, and is checked through the same painted-line arrays:

| Reference | Exact unchanged text |
| --- | --- |
| `BOARDS.shopPlot[0].t` | `FINE PRICES` |
| `BOARDS.shopPlot[1].t` | `COMING SOON` |
| `BOARDS.museumPlot[0].t` | `A MUSEUM` |
| `BOARDS.museumPlot[1].t` | `ONCE THERE IS SOMETHING TO SHOW` |
| `BOARDS.pip[0].t` | `PIP` |
| `BOARDS.pip[1].t` | `OPEN TO OFFERS` |
| `BOARDS.pipDesk[0].t` | `JOBS` |
| `BOARDS.pipDesk[1].t` | `none yet` |

**Suspect placeholder copy for the owner, preserved:** `COMING SOON`, `ONCE THERE IS SOMETHING TO SHOW`, and
`none yet`. These may be intentional plot/desk jokes; no wording is edited or filled in. `OPEN TO OFFERS` stays
intact too. Sleeves's lines, all residents' dialogue and The Boogler's code/copy have no diff. Diagnostic talk
logs may sample a partially typed line; they are not a replacement copy inventory. No ROM data.

## Debt: shrink only

| List | Before | After |
| --- | --- | --- |
| Collider debt | 103 files / 494 units | **103 / 490** |
| `rooms.ts` collider budget | 8 | **4** |
| Seat debt | 11 files / 15 units | 11 / 15 |
| Raw sign debt | 8 files / 17 units | 8 / 17 |
| Raw interaction debt | 8 files / 16 units | 8 / 16 |
| Legacy construction exports/importer counts | 62 / 79 | 62 / 79 |

The remaining four room units are existing camera/collision-group capability imports/bindings; no raw
furnishing or stake body creation remains. Public exports `addSolid` and `plankFloor` leave the allowed surface.
No new debt entry, wrapper exemption, suppression, constructor importer, registration consumer or check-selection
allowance is added. Registry confirms all existing architectural debt lists remain within the base.

## Checks

- Prettier ran on every changed file. Generated artifact/fixture JSON was restored to its canonical compiler/old
  capture bytes afterward; the three old fixtures remain byte-identical.
- `npm run check`: **1,915 pass, zero failures, one existing fleet-wait TODO** (1,916 cases); lint, types,
  registry, level reports, asset checks, prefab freshness and production build pass.
  [Full log](../../.look/step9d-check-final.log).
- Explicit prefab suite: **218/218 normal, 218/218 perturbed**, zero failures.
  [Normal](../../.look/step9d-prefabs-final.log), [perturbed](../../.look/step9d-perturbed-final.log).
- `node dev/ship-check.ts origin/main HEAD`: **452 assertions**, 46 affected test files, 19 lint files, passing.
  [Log](../../.look/step9d-ship-final.log).
- Explicit `npm run registry`: pass. [Log](../../.look/step9d-registry-final.log).
- Explicit `npm run level-check`: **13 reports**, continuity OK for 18 tracks/seven joins; existing planned,
  never-drawn track findings remain. [Log](../../.look/step9d-level-final.log).
- `npm run review-stamp -- . --no-fetch --base origin/main`: **`447b31189742`**, eight fixture/test files.
  [Log](../../.look/step9d-stamp-final.log). This names the caller's review scope, not independent approval.

Read-only room/runtime review found unsupported construction transforms could be silently ignored; the runtime
now rejects them and the actual room adapter checks translated/rotated/scaled failures before attachment.
The first full check found a TypeScript inference error in the malformed-operand test's patch array; giving
it its declared JSON-object element type fixes it. Neither correction changes an old fixture or tolerance.
The full unit runner prints the fleet-wait TODO's failing assertion, but its summary is zero failures and one
TODO; it is not a new passing fleet result.

## Opened browser evidence

Visual question: do the house and museum keep their shell courses, doorway openings, shadow proxies,
furniture and plaques against origin/main, while the state-driven rooms and existing E actions still work?
The existing `railway-town.ts` eval frames the same q6-done room doorways. Baseline runtime sources are exact
origin/main; their only additional files are the old-code test/fixtures. Final captures use clean `5687260bd`.

| Manifest | PNG actually opened and observation |
| --- | --- |
| [House baseline](../../.look/evidence/1794631641127-18976/evidence.json) | `step9d-house-baseline-still.png`: both side walls, bottom front course, bed/quilt, senior chair, rug, desk/lamp, JOBS plaque and stove/kettle. |
| [Museum baseline](../../.look/evidence/1794631866343-19821/evidence.json) | `step9d-museum-baseline-still.png`: doorway courses, tiled floor, split crystal, live table, bench and both plaques. Both Talk actions and real doorway walks pass on old code. |
| [House/shop actions](../../.look/evidence/1794632303493-28723/evidence.json) | `step9d-house-final-still.png`: furniture/plaque positions align, but the right wall remains cut away after walking between rooms; this has different cutaway history from the baseline. Pip/Nell retain exact Talk IDs/verb, E opens each conversation, real walking crosses out/in through both doors, and returning restores houseStage 3. |
| [Museum final](../../.look/evidence/1794632457195-31887/evidence.json) | `step9d-museum-final-still.png`: courses, floor, crystal halves, table/rim/drawers, bench and plaques align with baseline. Resident/bark phases differ; the existing bark still clips at the left edge. Moss/Wren Talk and out/in doorway walks pass, and the live table resumes with 592 bits. |
| [House matched-history final](../../.look/evidence/1794633031382-33165/evidence.json) | `step9d-house-aligned-still.png`: fresh no-action setup restores the same right-wall state as the baseline. Wall courses, doorway, bed/quilt, chair, rug, desk/lamp, cabinet, plaque and stove/kettle align. No game code changed between action and matched-history captures. |
| [Final T1 bot](../../.look/evidence/1794632458329-31907/evidence.json) | `run/end-still.png`: Buddy wears the conductor hat at the producer. Read `report.txt` and `verdict.json`: all expected T1 beats arrive, zero errors, 20 saved checkpoints. No town visit occurred. |

No pixel-equality claim. The house retry aligns the action/cutaway history rather than changing production
code; the old-code golden independently pins hysteresis and every room's state transitions. All accepted runs
report WebGPU, advancing completed frames and no graphics/page/console errors. The T1 bot's two still periods
total 2 min 55 s of game time, including its construction wait; this is not a measured render hitch. No bot
failure occurred. The short T1 route is a startup/production regression proof, not a full-campaign town test.

The first diagnostic house image was also opened ([manifest](../../.look/evidence/1794631543873-18237/evidence.json),
`step9d-house-before-still.png`). It had the new, unused optional site hook in a dirty tree, so it was replaced
by the clean exact-old-source baseline above before conversion. An initial `look --at list` returned no saved
checkpoint directory; it produced no visual proof. The accepted requests used explicit seeds. The shared browser
queue delayed the house action run 576 seconds; source remained unchanged throughout. Motion sheets/videos were
not opened or used to claim smoothness.

## Boundaries and limits

Protected `src/sim`, `src/world`, `src/net`, `server`, The Boogler, seat/finds/wardrobe rules, Home station
layout constants and `WORLD_NS` have no diff from origin/main. No external network use: `inflight` was omitted
because its implementation fetches. All browser work used the existing broker; no Chromium bypass. No source
changed during a queued or running accepted capture. The report/plan commit is documentation only.

Real-time feel/smoothness, quiet-machine performance, Linux, multiplayer, full-campaign completion and device
behavior remain unverified. **Not tested on a device.**
