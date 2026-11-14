# Prefab step 9c: museum complete; room shells remain

Runtime conversion: `bb96f45d9`; final code/test tip: `37e8c38101e7f3b9709cf50cd31f72e57abb0981`,
tree `85173f52eecbaad8457d273a2ac360760af710a7`. Based on local `origin/main` `7a9498ff6`.
The following report/plan commit changes documentation only. No push or ship.

## Converted and remaining

The whole `src/entities/town/museum.ts` conversion is complete. Its **29 records** cover the plinth, table,
bench, three alcove screens, floor, cabinet trim, apron, cornice, miniature spire, both label stands,
two cushions, three drawers, two reflectors, split specimen, light pool, terrain relief, live table instance
mesh, four exterior columns and the museum sign. Furniture builders return their original parts for the
same four merged draws. Procedural exhibit builders retain the original geometry algorithms and material
values; shared templates supply geometry that `OwnedView` clones for each mounted room.

The record owns each of the **ten solids** and all **three label attachments**. Text remains in
`town-lines.ts`; the view resolves the record's label keys through the existing `plate` helper. The museum
has no furnishing E targets, before or after. Moss and Wren retain the town's existing resident interactions.
The view still drives the table from `MuseumEnv` and animates the shard at the original rate. All scenery is Local;
no state ownership, message delivery, wire, save or namespace changes.

**Remaining:** the complete `rooms.ts` conversion: room shell/hull recipes, shadow proxies, stake boards and
legacy solid construction/helpers. `rooms.ts` has no diff here. Step 9 stays unchecked. Workshop's remaining
guard/shell/service work still holds its `ENTITY_SERVICES` exemption; that file is untouched. Shop, workshop-kit
and curio records already on the base are retained. No game-design chapter changes because this refactor
changes no player-visible behavior; the owning description remains `docs/game-design/place.md`, “The museum
in the live game.”

## Old-code golden proof

`e6e66812d` committed the old museum golden **before production edits**. Conversion is a separate commit,
`bb96f45d9`. The fixture has never been regenerated after conversion:

`test/fixtures/prefab-museum.json` SHA-256:
`80031fe33bb1926e90c4bf9edbb094cd25943ad6e1af53a2fe17b3a98e8b223f`.

The source adapter executes the actual museum/builder/runtime functions without a renderer or physics engine.
It compares all primitive parts, complete exhibit geometry attributes/indices, submitted mesh transforms,
shadow/culling flags, all ten old solid descriptors in order, and all painted label arguments/text. Runtime
numbers use the existing shared absolute `1e-9` / relative `1e-12` tolerance; keys, lengths, order, strings,
flags and counts remain exact. Instance matrices and colors are captured before Float32 quantization.
No tolerance or existing fixture changed.

Live-table states cover growing/completed buildings (including growth clamps), lit/unlit forge, great/ordinary
and out-of-span trees, rail interval clipping and raised-track legs, the people cap, machine/train markers,
player pin present/absent, the 0.1-second update cadence and hidden-interior early return. Geometry uses a small
recorded terrain input; browser stills separately exercise the real world terrain.

Additional runtime checks compare all world bodies against the old solid descriptors through the unchanged
`roomToWorld`, with a translated/rotated owner. Readiness off removes all ten bodies; readiness on restores each
once, repeated enabling adds nothing, and disposal leaves none. Every record's furnishing target list stays empty.

Committed artifacts contain authored operands/recipe keys only, never generated exhibit vertices or native-math
outputs. Final artifact check: **90 records, seven levels, 186,527 canonical bytes**. The authored-number tripwire,
normal freshness and pre-import additive native-math freshness probe pass. The relative native perturbation
multiplies by `1 + Number.EPSILON`, preserving zero and exact trig endpoints; it does not change production math.
[Relative preload](../../.look/step9c-native-ulp.ts), [additive preload](../../.look/step9c-native-additive.ts),
[artifact proof](../../.look/step9c-artifact-perturbed.log).

## Every museum player-facing string: unchanged

All five strings remain authored in `src/entities/town/town-lines.ts`, character for character. No display name,
description or board copy moved into content or a builder. The old-code golden checks the same arrays, including
font sizes and colors.

| Reference | Exact unchanged text |
| --- | --- |
| `BOARDS.museum[0].t` | `MUSEUM` |
| `BOARDS.specimen[0].t` | `A stone,` |
| `BOARDS.specimen[1].t` | `with its inside on the outside` |
| `BOARDS.table[0].t` | `THE PLACE, SO FAR` |
| `BOARDS.table[1].t` | `please do not lean on the sea` |

**Suspect copy for the owner, not edited:** there is no literal placeholder marker in the converted museum
copy. `A stone,` and `THE PLACE, SO FAR` are generic display names to revisit only if the owner wants specific
names. Their descriptions and the sea gag remain intact. The plot board belongs to unconverted `rooms.ts`.
All resident dialogue, Sleeves's lines and The Boogler's copy stay in their original sources with no diff.
The action log's Moss line was sampled while typing; that fragment is not a replacement copy inventory.

## Debt: shrink only

| List | Before | After |
| --- | --- | --- |
| Collider debt | 104 files / 496 units | **103 / 494** |
| Museum collider allowance | 2 | **Removed** |
| Seat debt | 11 files / 15 units | 11 / 15 |
| Raw sign debt | 8 files / 17 units | 8 / 17 |
| Raw interaction debt | 8 files / 16 units | 8 / 16 |
| Legacy construction importer records | 62 / 79 importer counts | 62 / 79 |

`land.ts` re-exports `terrain.ts`'s `H` unchanged. The museum now imports that same pure height query directly
from its owner, removing its last raw collider-module acquisition/binding and its entire allowance. No new
allowance, suppression, public construction surface, registration exception or test-selection debt was added.

## Checks on the final code/test tree

- Prettier ran on every changed file; generated JSON was then restored to canonical compiler output.
- `npm run check`: **1,911 pass, zero failures, one existing TODO** (1,912 cases); lint, types, registry,
  level reports, asset checks, prefab freshness and production build pass. [Log](../../.look/step9c-check-final.log).
- Explicit prefab suite: **214/214 normal and 214/214 perturbed**, zero failures.
  [Normal](../../.look/step9c-prefabs-final.log), [perturbed](../../.look/step9c-perturbed-final.log).
- `node dev/ship-check.ts origin/main HEAD`: **448 assertions**, 46 affected test files, 13 lint files, passing.
  [Log](../../.look/step9c-ship-final.log).
- Explicit `npm run registry`: passing; [log](../../.look/step9c-registry.log).
- Explicit `npm run level-check`: **13 reports**, continuity OK for 18 tracks/seven joins. Existing planned,
  never-drawn track findings remain. [Log](../../.look/step9c-level.log).
- `npm run review-stamp -- . --no-fetch --base origin/main`: **`a8e12cbf01b1`**, six fixture/test files flagged.
  [Log](../../.look/step9c-stamp-final.log). This identifies the caller's review scope, not independent approval.

The first full/ship check found a source-load guard failure caused by reusing `file` for the museum fixture.
`37e8c3810` gives it a distinct identifier; the guard and all checks now pass, without adding `UNFOLLOWED` debt.
The fleet-wait assertion remains the pre-existing TODO, not a new passing claim.

## Opened browser evidence

Visual question: do the split crystal, live table, bench, floor and plaques retain their old positions when the
museum is entered, while both E/Talk actions and the open doorway still work? The existing `railway-town.ts`
eval frames the same doorway from the same camera at `q6-done`. The baseline is the exact origin/main game
source; its only extra changes are the old-code golden/test. Final captures use clean `37e8c3810`.

| Manifest | PNG actually opened and observation |
| --- | --- |
| [Old-code baseline](../../.look/evidence/1794629795007-62971/evidence.json) | `step9c-museum-before-real-still.png`: split blue crystal centered behind the table, two plaques, tiled floor, bench at left and foreground doorway courses. Table draws 592 bits. |
| [First converted museum](../../.look/evidence/1794630027583-75442/evidence.json) | `step9c-museum-after-still.png`: those fixtures align with the baseline; the shard and resident/bark phases differ. E/Talk and doorway assertions pass. Runtime `bb96f45d9`, before the test-only guard fix. |
| [Final museum](../../.look/evidence/1794630185307-77747/evidence.json) | `step9c-museum-final-still.png`: opened against the baseline; crystal halves, table/rim/drawers, plaques, floor and bench remain aligned. A resident bark clips at the left edge; the same existing bark behavior is outside this conversion. No pixel-equality claim. |
| [Final T1 bot](../../.look/evidence/1794630196747-77982/evidence.json) | `run/end-still.png`: Buddy wears the conductor hat at the producer. Read `report.txt` and `verdict.json`: all expected T1 beats arrive, zero errors, 20 saved checkpoints. No town visit occurred. |

Both converted-museum action runs assert Moss and Wren retain their `place-talk-*` IDs and `Talk` verb, E starts
each conversation, real walking crosses out and back through the open door, the indoor/cutaway state follows,
and the table draws 592 bits again indoors. No new museum E action was introduced. This supplements the
state-driven table golden; it is not a full-campaign, natural-discovery or multiplayer proof.

Accepted captures report WebGPU, advancing completed frames and no graphics/page/console errors. The bot's two
still periods total 2 min 24 s of game time, including its construction wait, not a measured render hitch.
No bot failure occurred. Two initial solo warped looks were rejected by the older launcher with
`--clock-url requires two-player warp`; [first](../../.look/evidence/1794628612233-59007/evidence.json),
[second](../../.look/evidence/1794628669175-59358/evidence.json). Neither produced visual proof. The first client
was interrupted while queued; its request later failed too. All accepted looks used the same broker with
`--real`; no Chromium bypass. The shared queue caused long waits. No source changed during an accepted run.

Protected source paths, seat/finds/wardrobe rules, Home station layout constants and `WORLD_NS` have no diff
from origin/main. No ROM data. `inflight` attempted its built-in fetch, which failed at the sandbox's FETCH_HEAD
write; it was not retried or escalated. All subsequent work used local Git state and local servers only.

Motion sheets/videos were not opened or used to claim smoothness. Real-time feel, quiet-machine performance,
Linux, multiplayer, full campaign and independent review remain unverified. **Not tested on a device.**
