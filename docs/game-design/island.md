# 3. The island

## Shape and size

- The world is a **510 m square** heightfield of **409 × 409 cells, 1.25 m each**, centred on the origin
  ([src/world/grid.js](../../src/world/grid.js)). +x is east, **+z is south** (towards home), −z is north. Sea level is
  0 m, the seabed −7.5 m.
- The ground is a pure function in layers ([src/island/README.md](../../src/island/README.md)): natural shape
  ([src/island/shape.js](../../src/island/shape.js)), then each POI's stamps ([src/island/stamps.js](../../src/island/stamps.js)),
  then the court levelled and everything quantised to whole centimetres once ([src/island/ground.js](../../src/island/ground.js)).
  Every client builds identical integers.
- After the 2026-10-29 playtest the land was cut to about a third, roughly **23,300 m²**
  ([playtests.md](../playtests.md)). Everything is meant to be a 10 to 15 s sprint from spawn (comment in `shape.js`).

## Regions

| Region | Where | Notes |
|---|---|---|
| **Home** | The original island around the origin, radius about 52 m (`HOME_R`). | Within 22 m of the origin (`HOME_KEEP`) the ground never changes. Spawn, court, stall and garden are here. |
| **HOME square** | x and z in −80..80 m (`HOME` in grid.js). | Used to be the only place with beach wash-ups (removed). |
| **Mainland** | Noisy ellipse centred (6, −66), radii 96 × 56 m, plus an east lobe at (86, −36) and a west point at (−78, −20). | Meadows, the eastern plain (windmill farm), the west cove. Only ever raises the ground (smooth max) outside `HOME_KEEP`. |
| **North-west massif** | Ellipse at (−54, −92), 42 × 30 m, up to 15 m high with ridges. | Rocky upland; the caves run under it. |

Scenery ([src/render/props.js](../../src/render/props.js)): up to 36 fruit palms and 22 rocks on home (seed 20261028), plus up to 55
coastal palms, 70 round meadow trees and 55 boulders on the mainland (seed 20261029). Only the home palms bear fruit.
Trees, rocks and POI keep-out discs go into `obstacles`, which the Boogler walks around.

## Points of interest

Coordinates are world metres (x, z). POI folders are in [src/pois/](../../src/pois/); the stall, court and garden are
built outside the POI system.

| POI | Where | What is there | What you can do |
|---|---|---|---|
| **Spawn** | (14, 26), random within 3 m | [src/constants.js](../../src/constants.js) `SPAWN` | Land here; fall below −25 m and you are put back. |
| **Volleyball court** | Centre (12, 21), radius 8 m | Ground levelled to its centre height and painted sand ([ground.js](../../src/island/ground.js), [terrain.js](../../src/adapters/terrain.js)). No net or lines. | The ball spawns at (12, 20). |
| **Mushroom stall** | (15.2, 13.4), yaw 3.0 | Wooden counter, striped awning, "Mushroom seeds" sign, seed bags and a watering can ([src/adapters/mushroom-garden.js](../../src/adapters/mushroom-garden.js)). | Take 5 seeds per press (stack up to 20) and the watering can. |
| **Garden patch** | Cells i 218..237, j 192..211: about x 17.5..42.5, z −9..15, centre (30, 2.5) | A dirt patch (`PATCH` in [src/sim/mushrooms.ts](../../src/sim/mushrooms.ts)). Kept clear of trees. | Plant and water seeds (they also grow anywhere else dry). It is the Boogler's home. |
| **Lighthouse** | (6, −58), on a 7.4 m hill with a flat top at 11 m | Striped 18 m tower, spiral stair of 2.5 turns round the outside, gallery deck at about 29.3 m with railings, lamp and two sweeping beams at night ([src/pois/lighthouse/](../../src/pois/lighthouse/)). Paths to home, the windmill farm and the upland. | Climb; the **frisbee** waits on the deck at (7.9, 29.3, −56) and refills 60 s after it is taken. |
| **Windmill farm** | Site centre (82, −46), facing west | Three wooden windmills (7.2 m towers, 7.2 m sails at 0.55 rad/s on the shared clock) on knolls, striped fields (wheat, greens, ploughed earth), cart tracks, hay bales, a fence ([src/pois/windmills/](../../src/pois/windmills/)). | The sails are solid: they bonk players and bat the ball. Nothing else to do. |
| **Caves** | Under the massif; mouths below | Tunnels of radius 2.3 m joining a hub (−50, −88), an abandoned mine (−35, −93: rails, minecart of ore, glowing veins), an underground pond (−64, −90: water at 3.0 m, crystals, glowing mushrooms, stalactites, a rowboat) and a wine cellar (−49, −99: barrel racks, bottle shelves, a cask, a candlelit table). Lanterns, timber mouth frames with name boards, a signpost ([src/pois/caves/](../../src/pois/caves/)). | Walk in and explore; throw and float the ball on the pond. Purely a place: no items or ops. |

Cave mouths ([network.js](../../src/pois/caves/network.js)):

| Mouth | Position | Board |
|---|---|---|
| south | (−37, −80) | Caves |
| east | (−26, −95) | Old mine |
| west | (−71, −83) | Pond cave |
| north | (−44.5, −104.5) | Cellar |

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
