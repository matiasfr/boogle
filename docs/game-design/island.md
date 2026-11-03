# 3. The island

## Shape and size

- The world is a **510 m square** heightfield of **409 × 409 cells, 1.25 m each**, centred on the origin
  ([src/world/grid.ts](../../src/world/grid.ts)). +x is east, **+z is south** (towards home), −z is north. Sea level is
  0 m, the seabed −7.5 m.
- The ground is a pure function in layers ([src/island/README.md](../../src/island/README.md)): natural shape
  ([src/island/shape.ts](../../src/island/shape.ts)), then each POI's stamps ([src/island/stamps.ts](../../src/island/stamps.ts)),
  then the court levelled and everything quantised to whole centimetres once ([src/island/ground.ts](../../src/island/ground.ts)).
  Every client builds identical integers.
- After the 2026-10-29 playtest the land was cut to about a third, roughly **23,300 m²**
  ([playtests.md](../playtests.md)). Everything is meant to be a 10 to 15 s sprint from spawn (comment in `shape.ts`).

## Regions

| Region | Where | Notes |
|---|---|---|
| **Home** | The original island around the origin, radius about 52 m (`HOME_R`). | Within 22 m of the origin (`HOME_KEEP`) the ground never changes. Spawn, court and the seed stand are here. |
| **Mainland** | Noisy ellipse centred (6, −66), radii 96 × 56 m, plus an east lobe at (86, −36) and a west point at (−78, −20). | Meadows, the eastern plain (windmill farm), the west cove. Only ever raises the ground (smooth max) outside `HOME_KEEP`. |
| **North-west massif** | Ellipse at (−54, −92), 42 × 30 m, up to 15 m high with ridges. | Rocky upland; the caves run under it. |

Scenery ([src/blueprints/props.ts](../../src/blueprints/props.ts)): up to 36 palms, each with a log bundle at its foot (6.19), and 22 rocks on home (seed 20261028), plus up to 55
coastal palms, 70 round meadow trees and 55 boulders on the mainland (seed 20261029).
Trees, rocks and POI keep-out discs go into `obstacles`, which the Boogler walks around.

## Points of interest

Coordinates are world metres (x, z). POI folders are in [src/pois/](../../src/pois/); the seed stand and court are
built outside the POI system.

| POI | Where | What is there | What you can do |
|---|---|---|---|
| **Spawn** | (14, 26), random within 3 m | [src/constants.ts](../../src/constants.ts) `SPAWN` | Land here; fall below −25 m and you are put back. |
| **Volleyball court** | Centre (12, 21), radius 8 m | Ground levelled to its centre height and painted sand ([ground.ts](../../src/island/ground.ts), [terrain.ts](../../src/island/terrain.ts)). No net or lines. | The ball spawns at (12, 20). |
| **Seed stand** | (15.2, 13.4), yaw 3.0 | Wooden counter, striped awning, "Mushroom seeds" sign, seed bags ([src/adapters/mushrooms.ts](../../src/adapters/mushrooms.ts)). | Take one bag of seeds (6.4). |
| **Meadow** | About (30, 2.5) | Open grass, kept clear of trees, where the dirt patch used to be. | The Boogler's home. |
| **Lighthouse** | (6, −58), on a 7.4 m hill with a flat top at 11 m | Striped 18 m tower, spiral stair of 2.5 turns round the outside, gallery deck at about 29.3 m with railings, lamp and two sweeping beams at night ([src/pois/lighthouse/](../../src/pois/lighthouse/)). Paths to home, the windmill farm and the upland. | Climb; the **frisbee** waits on the deck at (7.9, 29.3, −56) and refills 60 s after it is taken. |
| **Windmill farm** | Site centre (82, −46), facing west | Three wooden windmills (7.2 m towers, 7.2 m sails at 0.55 rad/s on the shared clock) on knolls, striped fields (wheat, greens, ploughed earth), cart tracks, hay bales, a fence ([src/pois/windmills/](../../src/pois/windmills/)). | The sails are solid: they bonk players and bat the ball. Nothing else to do. |
| **Caves** | Under the massif; mouths below | Tunnels of radius 2.3 m joining a hub (−50, −88), an abandoned mine (−35, −93: rails, minecart of ore, glowing veins), an underground pond (−64, −90: water at 3.0 m, crystals, glowing mushrooms, stalactites, a rowboat) and a wine cellar (−49, −99: barrel racks, bottle shelves, a cask, a candlelit table). Lanterns, timber mouth frames with name boards, a signpost ([src/pois/caves/](../../src/pois/caves/)). | Walk in and explore; throw and float the ball on the pond. Purely a place: no items or ops. |

Cave mouths ([network.ts](../../src/pois/caves/network.ts)):

| Mouth | Position | Board |
|---|---|---|
| south | (−37, −80) | Caves |
| east | (−26, −95) | Old mine |
| west | (−71, −83) | Pond cave |
| north | (−44.5, −104.5) | Cellar |

---

Water graduation is staged ([plan](../plans/water-graduation.md), steps 1–3). The old sea remains active by default.
Its facade now registers the finalized stamped home heightfield with the Local shore registry. The provider uses
the actual 409×409 grid, with negative-z source rows and explicit invalid exterior; bridges and roofs are not beds.
The replacement's lazy shore atlas has a 512² core at 1 m/texel plus an 80-texel halo. Only verified underwater
edges receive a separate deep-water apron. Connected regions share one travel/shelter solve, and all sampled
fields select one coherent region. No shore bake or new texture allocation runs for the default old sea.

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
