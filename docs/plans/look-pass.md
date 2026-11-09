# The look pass: to-dos

> **Status, 8 November 2026.** Written for the `?proto=place` look test. The game is now the production railway, which still borrows Place's views; `src/proto/place` goes with production core's last slice. The machine to-do below is done: the track layer got its own crawler machine (#1018) and stool seats (#1197). The iPad measurement folds into the target-quality pass in [direction.md](../direction.md#target-quality-pass-art-and-characters), where it is deferred for now. The rest is history; open art work is listed there, not here.

What's left after the look test on `?proto=place` (`&v=look&look=all`, [#582](https://github.com/matiasfr/boogle/pull/582)), so any agent can pick it up. The owner's verdict on that link, 2 November: "it looks pretty great". Decision: [boogle-2.md](../proposals/boogle-2.md), "Look", 2 November. Nothing here is on the main island yet.

The target is simple, toy-like and sunlit, in the spirit of Mario Sunshine: the previz shots the owner picked ([sunshine-look.md](../research/sunshine-look.md)), and the track-laying painting, `.look/previz/visible-materials/shot-3.png` (gitignored and only on the owner's Mac; the comparison sheet is in #582).

## What the test found

The percentages are the building agent's judgement, not a measurement.

| Layer (`&look=`) | Gap to the painting it closed | Cost at the test frame |
|---|---|---|
| `light` | About 40% | No extra draws |
| `kit` (Blender, `assets/src/place-kit.py`) | About 25% | Triangles 180k to 390k; 65 KB |
| `mats` | About 15% | 24 more draws |
| `ground` | About 15% | No extra draws or triangles |
| `contact` | About 5% | 25 more draws |
| `gtao` | About 1% | GPU about 4 ms to 18 ms at 2x (timers may read high on Apple chips) |

With `all` (no `gtao`) on this Mac at 2x, GPU time went from 3.3 ms to 4.2 ms, and `npm run counts` from 189 to 224 draws. **Real iPad performance is unmeasured**, and nobody has played the full run by hand with it on, apart from the owner's look at the link. Code: `src/proto/place/look.ts`, `look-kit.ts`, `look-gtao.ts`.

## To-dos

### Next round of `?proto=place`
- [x] Make `all` (without `gtao`) the default look of `?proto=place` in the next round (owner's call). `&look=off` turns it off for comparison.
- [ ] Measure it on the owner's iPad: frame rate and the resolution it settles at.
- [x] Extend the look to what `all` leaves alone: the logs on your back, flying rails, the trains. Buildings got a cheap per-piece shade too (`boardMaterial`).
- [x] Fix what it exposed: the dark smoke smudges at spawn (soot from a campfire 4 m away and the chimneys; now pale and further off), and the moon's pale disc (kept under the horizon).
- [x] Pull the grass back from lime and add variation; it's too uniform at the moment.
- [ ] Replace the kit's machine with one built for this: the docked feeder, cutter and gripper from the painting. This is design work too: logs have to stay in the frame while laying, which changes the run's logic.
- [ ] Rounder, solid-looking steam puffs, and three-tier trees. Both are cheap.

### Rolling out to the game
- [ ] Light and ground on the main island first; they're most of the gain for the least cost. **Needs an owner call first:** the look relies on a higher sun (`skyDebug.preview(0.2)` in the test), so decide how it works with the day-night cycle and per-era palettes.
- [ ] Move the ground material to the island's terrain (`src/island/terrain.ts`). Keep cliffs faceted per pixel, which looked better than smoothing them.
- [ ] Decide how materials (wood grain, the two-colour sky reflection on steel) become shared helpers, and add post effects as tiers in `src/render/` only if they earn it. Leave out GTAO.
- [ ] Authored cliff planes or a remesh: the 2 m grid gives vertical stripes where the painting has big planes. This goes with the terrain redesign in [rail-slice.md](rail-slice.md), which also says heightfields can't do gorge faces or overhangs.
- [ ] Baked contact shading in vertex colours as a kit standard. Blobs only where needed, since each needs placing.
- [ ] A real art pipeline for pieces: a Python kit per era, batched. Blender worked headless for this one (`assets/src/place-kit.py`, [asset-pipeline.md](asset-pipeline.md)).

### The crossing's sea (owner's earlier list, still open)
- [ ] Steam puffs, a paler sky with no clouds, glitter that fades too early, no shallows or foam at the piers, and greybox solid objects ([playtests.md](../playtests.md), the crossing's sea pass).

## Limits to keep in mind

- The painting lights the faces toward the camera; we can't do that from every angle. Soft bounce and its painted finish are only partly reachable.
- The painting's camera sits closer and lower than the game camera. Don't change the follow camera for a look reason without asking.
- Stills in the test were staged (machine frozen, logs put back in the frame, player painted purple). Judge in play.
