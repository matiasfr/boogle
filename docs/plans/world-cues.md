# World cues after removing the objective — 4 November 2026

**Partial; committed for review, not shipped.** DESIGN.md 11, **Show, don't tell**. The retained changes improve the Station 3 bill, axe and pack approaches, hook approach, depot receiving view, and camp locomotive/platform. Two gaps remain: the great tree is behind the straight Station 3 approach, and the forge output rack is hidden from the delivery apron. The full comparison removes the rejected cart-cycle regression but does not establish that every residual second is noise.

## Scope and preserved fit

These are Local authored placements derived in each tab. No ownership, message, save shape, lockstep math, input, copy, bill, unlock order, speed or timer changes. Existing meshes and colliders move together. No new text, arrow, marker, sound, material or light was added. Existing depot motion and sound were retained; sound was not listened to.

The [beautiful-corner](beautiful-corner.md) receiver, feeder, machine, standing envelope, crossing and landings are untouched. The 53 m great-tree source and heavy carry remain per [beam-weight](beam-weight.md). [Corner manifest](../../.look/evidence/1793814595976-80247/evidence.json): the opened still shows the two timber runners under the exposed rollers, the pile and machine still fitted together, with the existing bill beside the pile. This does not revalidate the plan's already documented material-flight issues.

![Station 3 with corner=1](../../.look/evidence/1793814595976-80247/kept-corner-still.png)

## Walking views, not checkpoint cameras

Every before/after pair below was opened with view_image. All use 1180 × 820, the same baseline saved world and starting approach, held daylight at 0.26, real input walking and the ordinary follow camera at pitch -0.14. The eval clears the debug camera; the broker's printed default camera is not the camera used for these stills. There is one disclosed starting teleport, then no teleport during the approach. Chest endpoints follow their authored position, so their walking direction changes with placement.

The existing look harness runs [place-cues.ts](../../dev/look/evals/place-cues.ts); no new harness or scenario was added. The save directory is [the baseline run](../../.look/evidence/1793812624492-44894/run/saves). Walking starts and requested endpoints (world X,Z):

| View           | Start         | End / action                   |
| -------------- | ------------- | ------------------------------ |
| Station 3      | 979,-109      | 978,-97                        |
| Source turn    | 976,-93       | 982,-108                       |
| Axe            | 937,-16       | Walk into actual axe chest     |
| Pack           | 910,-16       | Walk into actual pack chest    |
| Forge          | 910,-21       | 911,-15                        |
| Depot          | 946,29        | 938,23                         |
| Hook           | 999,24 at Y26 | Walk into actual hook pedestal |
| Boiler / train | 1004,-134     | 1012,-142                      |

A restored save does **not** retain the original chest drop flight, prior camera/player heading, continuous approach, attention, cart arrival or reward discovery. Axe/pack are explicitly respawned because their saved beats have consumed them, then acquired through real walking; their popup is dismissed for the still. The hook checkpoint already owns its ability. Boiler fitting and train unlock are already past. These images cannot establish blind discovery, sound, real-time smoothness or co-op behavior.

### Station 3 bill

The full log pile used to hide the beam row. Moving only the existing bill 4 m sideways exposes `logs 40/40 great beam 0/1`, the receiver and feeder. The great tree is still behind this south-facing approach: unresolved.

| Before                                                                           | Retained result                                                                |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| ![Before great](../../.look/evidence/1793813134968-54470/before-great-still.png) | ![After great](../../.look/evidence/1793814154693-72740/final-great-still.png) |

[Before manifest](../../.look/evidence/1793813134968-54470/evidence.json) · [After manifest](../../.look/evidence/1793814154693-72740/evidence.json)

### Great tree after turning uphill

The standing great tree is visible on the right of the uphill walk, before and after. Its 53 m carry, safe-fall space and source position stay unchanged under the beam-weight owner decision. This is a disclosed turn, not evidence that a blind player knows to turn.

| Before                                                                             | Retained result                                                                  |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| ![Before source](../../.look/evidence/1793813136129-54542/before-source-still.png) | ![After source](../../.look/evidence/1793814155841-72742/final-source-still.png) |

[Before manifest](../../.look/evidence/1793813136129-54542/evidence.json) · [After manifest](../../.look/evidence/1793814155841-72742/evidence.json)

### Proper axe

The pickup now finishes on the forge side of the oak with the receiver, feeder and existing logs row in view. Previously the scaffold and onward track dominated. The checkpoint had already consumed the axe; the fixture respawns that chest and walks into it.

| Before                                                                       | Retained result                                                           |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| ![Before axe](../../.look/evidence/1793813137389-54624/before-axe-still.png) | ![After axe](../../.look/evidence/1793814419712-77970/kept-axe-still.png) |

[Before manifest](../../.look/evidence/1793813137389-54624/evidence.json) · [After manifest](../../.look/evidence/1793814419712-77970/evidence.json)

### Pack

The pickup is beside the feeder. The existing bill moves to the frontage so the `logs 0/32` row, unfinished structure and receiver share the view. The title remains partly cut by scaffold and the edge of the view; this is an improvement, not a fully clean composition.

| Before                                                                         | Retained result                                                             |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| ![Before pack](../../.look/evidence/1793813138691-54626/before-pack-still.png) | ![After pack](../../.look/evidence/1793814420861-77974/kept-pack-still.png) |

[Before manifest](../../.look/evidence/1793813138691-54626/evidence.json) · [After manifest](../../.look/evidence/1793814420861-77974/evidence.json)

### Forge output — retained gap

Both attempted north-frontage rack positions made output visible, but changed the bot's cart cycle by roughly 80 s downstream. Both rack moves and the rotated forge/mouth were reverted after the bounded visual rounds. The final walking-in rail pickup is still hidden. Its original route, mouth and output flight remain intact.

| Before                                                                           | Retained result                                                               |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| ![Before forge](../../.look/evidence/1793813139688-54635/before-forge-still.png) | ![After forge](../../.look/evidence/1793814422048-77976/kept-forge-still.png) |

[Before manifest](../../.look/evidence/1793813139688-54635/evidence.json) · [After manifest](../../.look/evidence/1793814422048-77976/evidence.json)

### Depot receiving pile

Q2's existing rack is 8 m farther back along the track. The same approach now sees its empty receiving bay ahead instead of clipped behind the player. The cart still arrives on its existing route, stops at the same distance, and unloads at the same rate. The motion proof below shows the arrival and the pile filling.

| Before                                                                           | Retained result                                                               |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| ![Before depot](../../.look/evidence/1793813140738-54660/before-depot-still.png) | ![After depot](../../.look/evidence/1793814423215-77978/kept-depot-still.png) |

[Before manifest](../../.look/evidence/1793813140738-54660/evidence.json) · [After manifest](../../.look/evidence/1793814423215-77978/evidence.json)

### Hook reward

Moving the existing pedestal toward the first floating slab makes the useful ring and reward slab visible from the pickup walk. Pads, rings, hook range and unlock order stay fixed. This restored checkpoint has already granted the hook: it proves approach composition, not the original reward presentation.

| Before                                                                         | Retained result                                                              |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| ![Before hook](../../.look/evidence/1793813141950-54668/before-hook-still.png) | ![After hook](../../.look/evidence/1793814160486-72750/final-hook-still.png) |

[Before manifest](../../.look/evidence/1793813141950-54668/evidence.json) · [After manifest](../../.look/evidence/1793814160486-72750/evidence.json)

### Boiler / locomotive

Moving the large camp shed from local (20, -137) to (13, -126) clears the walking view of the locomotive. Its dimensions and collision follow the same existing plot builder. The checkpoint is after fitting the boiler, so it cannot prove discovery of the unfitted interaction.

| Before                                                                             | Retained result                                                                  |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| ![Before boiler](../../.look/evidence/1793813143176-54676/before-boiler-still.png) | ![After boiler](../../.look/evidence/1793814161604-72752/final-boiler-still.png) |

[Before manifest](../../.look/evidence/1793813143176-54676/evidence.json) · [After manifest](../../.look/evidence/1793814161604-72752/evidence.json)

### Train boarding area

The same shed move exposes the platform, yellow boarding edge and signal where the wall filled the old view. The train has already left by this restored capture; this is a sightline proof, not proof of an arrival being understood.

| Before                                                                           | Retained result                                                                |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| ![Before train](../../.look/evidence/1793813144262-54723/before-train-still.png) | ![After train](../../.look/evidence/1793814162765-72754/final-train-still.png) |

[Before manifest](../../.look/evidence/1793813144262-54723/evidence.json) · [After manifest](../../.look/evidence/1793814162765-72754/evidence.json)

## Depot motion

[Final motion manifest](../../.look/evidence/1793814424432-77981/evidence.json). The fixture waits for a real loaded outbound cart within 38 m; it does not set cart position, load or timing. Opened the still, six-frame motion sheet, curves and six consecutive video frames extracted with ffmpeg at 8 s. The cart comes from the right, passes the turntable, unloads visible flying logs into the receiving bay ahead, and returns empty. Its stop is unchanged; the longer log flight reaches the moved rack with the original flight duration.

![Arrival, delivery and return](../../.look/evidence/1793814424432-77981/kept-depot-arrival-motion.png)

![Consecutive delivery frames at 8 s](../../.look/evidence/1793814424432-77981/depot-delivery-consecutive.png)

The opened curves show a stationary observer and a stable 5.58 m follow-camera distance. They do not measure cart speed or prove smoothness; video was inspected through extracted frames, not watched in real time. The earlier [original-rack sequence](../../.look/evidence/1793813527111-64634/evidence.json) showed the loaded cart but left the receiving pile off-screen behind the player.

## Checks and pacing

- Prettier on changed files; `npm run check` passes: **298/298 tests**, lint, types, registry, level fixtures, asset checks and production build. [Check log](../../.look/evidence/1793814403797-77073/check.txt).
- Existing trusted [world-inputs scenario](../../.look/evidence/1793814425529-77984/evidence.json) passes on the retained build.
- Existing [place-trees checks](../../.look/evidence/1793813547383-65138/evidence.json) pass with the moved shed: 388 ordinary trees, two hardwoods, great ID 28; protected long falls, harvest/save restoration and player safety. Its still was opened as a check artifact, not a cue verdict. This preceded the forge rollback; the shed, tree geometry and unchanged forge collision footprint are the same.
- [Baseline full bot](../../.look/evidence/1793812624492-44894/evidence.json) and [retained full bot](../../.look/evidence/1793814403797-77073/evidence.json): both finish every expected beat, **zero errors / zero missed expected beats**, 25 minutes game time. Both reports and end stills were opened. Final end HUD: 280 logs, 0.90 km, 112 people, $14,480.
- The retained bot records one 2 s obstruction, no water fall, idle 7:01 versus 7:05. `found a crystal` and `did something together` remain unmarked; these are not expected-beat failures in the solo bot. Deposits are 34 versus 33; rides/off are 5 versus 4. Incidental resident-notice timing shifts by 10 s and rumour count differs. Do not claim every telemetry mark is identical.
- [Full --compare output](../../.look/evidence/1793814403797-77073/beat-compare.txt). Progression differences below are seconds from the saved beat timestamps, not a new pacing model.

| Beat         | Baseline s | Retained s | Delta s |
| ------------ | ---------: | ---------: | ------: |
| Station 3    |     360.64 |     361.16 |   +0.52 |
| Axe          |     441.86 |     442.26 |   +0.40 |
| Pack         |     476.78 |     476.68 |   -0.10 |
| Forge        |     514.93 |     515.59 |   +0.67 |
| Depot unlock |     578.51 |     579.38 |   +0.87 |
| Q2           |     619.69 |     624.68 |   +4.99 |
| Hook pulled  |     646.78 |     651.73 |   +4.95 |
| Q3           |     712.39 |     716.49 |   +4.10 |
| Q4           |     787.38 |     791.46 |   +4.09 |
| Q5           |    1008.31 |    1012.53 |   +4.22 |
| Shortcut     |    1122.34 |    1127.34 |   +5.00 |
| Boiler       |    1126.84 |    1130.23 |   +3.39 |
| Trains       |    1129.94 |    1133.33 |   +3.39 |
| Pier         |    1278.21 |    1281.41 |   +3.20 |
| Ending       |    1299.99 |    1303.19 |   +3.20 |

No cycle-scale delay remains. The largest progression delta is 5.00 s; some is plausibly the longer Q2 rack carry rather than noise. A single baseline/final pair does not prove the strict “no beat beyond noise” condition. This remains a limitation of this partial result, not a claimed pass.

The two rejected output-rack positions completed all expected beats but delayed Q4 by **84 s** and **78 s**: [first comparison](../../.look/evidence/1793813528273-64637/beat-compare.txt), [second comparison](../../.look/evidence/1793814058171-71049/beat-compare.txt). At the gate, their saved carts were outbound with four leftover logs and no automatic rail call; baseline was already on its automatic rail trip. The rack moves changed travel/arrival phase enough to add a cycle. Neither rack move nor the matching forge rotation is committed. Visual tuning stopped at the requested three rounds; subsequent captures verify that rollback.

## Reproduce

```sh
node .look/see-client.ts playthrough
node dev/look/playthrough.ts --compare .look/evidence/1793812624492-44894/run .look/evidence/1793814403797-77073/run
node .look/see-client.ts look --at 'rung earned depot' --saves .look/evidence/1793812624492-44894/run/saves --query 'proto=place&fresh=1&cue=depot&arrival=1' --eval dev/look/evals/place-cues.ts --name depot-approach --size 1180x820 --hud --warm 0 --frames 6 --seconds 12 --video --curves
node .look/see-client.ts scenario world-inputs
```

## Provenance, failures and departures

The manifests record the tested dirty tree, base commit and unchanged-during-run status. The baseline commit is `88a7b8e5`. Final full bot, final axe/pack/forge/depot, depot motion, corner and world-inputs use the retained source tree. Great/source/hook/boiler/train stills were captured before the isolated forge/rack rollback; that rollback does not affect those views. Later report edits/commits do not change gameplay source.

Initial `--at list` preceded the first run and failed; initial still requests incorrectly used `--frames 1` and were corrected to two. An initial hook approach used terrain height on an elevated pillar and failed its walk; that rejected image is not used. The eval now uses pillar height and throws on an unsuccessful walk. All retained captures pass broker health checks. No full bot missed an expected beat, including the rejected pacing runs.

**Network departure:** `npm run inflight` was run for the required ownership check before its implementation was inspected; it fetched origin, contrary to this task's local-only network constraint. This was reported during work. No further non-local network action, push, ship or screenshot upload was performed. All edits and commits stay in this worktree and branch.

The remaining owner playtest questions are whether the cleared views actually communicate the next action, whether the tree's uphill turn is discoverable, and how to expose forge output without changing the supply phase. This report does not graduate the prototype or claim blind-player readiness.
