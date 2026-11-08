# 6.11 Sky and time of day

- **What.** One sky everywhere in the world: the summer sky at a fixed late-morning time of day (owner calls, 3–6
  November), over the real sea. There is no day/night cycle; the classic island's 20-minute day, its sun and moon
  billboards and its moonlit nights were removed when it joined the one world (6 November). Evening is decided later.
  Night-only content stays in the code for that later evening and does not appear at the fixed time: the lighthouse lamp
  and beams, the meadow's fireflies and the blob shadows that stand in when no key light is up.
- **View distance.** Outdoors the fog runs from 180 to 3600 m and the camera's far plane sits at 1.3 times that
  (4.7 km), the same everywhere (owner, 7 November: "Let's start with bigger"; [world scale](../research/world-scale.md)).
  The sky's early update is the one place that sets it; caves keep their own fog, closing from 110–520 m to 6–80 m.
  The longer range made no measurable difference to draw calls, triangles or frame time on the desktop or phone
  profile (the railway already drew to 4.7 km behind 1.5 km fog), so the phone detail ladder has no view-distance rung.
- **Sync kind.** Local: the time of day is a constant, so every tab sees the same sky without sharing anything.
- **Files.** [src/render/water/frozen-sky.ts](../../src/render/water/frozen-sky.ts) (the sky, sun and fog),
  [src/features/sky.ts](../../src/features/sky.ts) (refreshes it each frame), [src/render/sky.ts](../../src/render/sky.ts)
  (the read-only `skyNow` state and the caves' `atmosphere.underground`),
  [src/render/lights.ts](../../src/render/lights.ts) (a small pool of point lights handed to the glowing sources nearest the camera).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
