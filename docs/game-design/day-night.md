# 6.11 Day and night

- **What.** A 20-minute day on the shared world clock: the sun is up for 60 % of it (12 min), the night lasts 8 min.
  World time 0 is early morning. A smiling sun and a sleepy moon cross the sky; the moon's phase cycles every 8 days
  (2 h 40 min of play) and the first night has a waxing half moon. Key light, ambient, fog, sky, clouds and water follow.
  At night the lighthouse lamp comes on (up to 26 m of light) and two beams sweep; the shadow pass turns off and blob
  shadows mark where players and the ball are.
- **Sync kind.** Lockstep without state: a pure function of `world.tick` ([src/sim/sky-clock.ts](../../src/sim/sky-clock.ts)),
  so everyone sees the same sky. Lighting is Local. Windmill sails and the lighthouse beam use
  [src/netplay/shared-time.ts](../../src/netplay/shared-time.ts) (ticks filled in with local time).
- **Files.** [src/render/sky.ts](../../src/render/sky.ts), [src/features/day-night.js](../../src/features/day-night.js),
  [src/render/lights.ts](../../src/render/lights.ts) (a small pool of point lights handed to the glowing sources nearest the camera),
  [src/features/blob-shadows.js](../../src/features/blob-shadows.js).
- **Limits.** The clock only advances while someone hosts, so on a peer-hosted room the time of day stops while the
  island is empty (a room the server hosts keeps ticking, 8.1).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
