# 6.11 Day and night

- **What.** A 20-minute day on the shared world clock: the sun is up for 60 % of it (12 min), the night lasts 8 min.
  World time 0 is early morning. A sun and a moon cross the sky, drawn in TSL with no faces: the sun a bright disc in a
  soft halo, gold-orange at dawn and dusk; the moon a pale disc with blue-grey maria and a few soft craters, its phase
  lit by the real sun and a faint halo around it. The moon's phase cycles every 8 days (2 h 40 min of play) and the
  first night has a waxing half moon. Key light, ambient, fog, sky, clouds and water follow.
  Nights are moonlit and easy to play in: a deep-blue sky with stars, a silver-blue key light from the moon (from high
  in the sky while the moon is down, and never below 55 % of a full moon's, so a new-moon night stays readable), a raised
  blue ambient and blue haze. The key light keeps casting (softer) shadows at night, at the day's cost. The lighthouse
  lamp comes on (up to 26 m of light) and two beams sweep. Blob shadows mark players and the ball when no key light is up.
- **Preview.** `?tod=0.8` holds a tab's sky at a time of day (0 sunrise, 0.3 noon, 0.6 sunset, 0.8 midnight) and
  `&moon=0.5` at a phase (0 new, 0.5 full); display only, the world clock runs on. `boogle.sky.preview(0.8, 0.5)` in
  the console does the same.
- **Sync kind.** Lockstep without state: a pure function of `world.tick` ([src/sim/sky-clock.ts](../../src/sim/sky-clock.ts)),
  so everyone sees the same sky. Lighting is Local. Windmill sails and the lighthouse beam use
  [src/netplay/shared-time.ts](../../src/netplay/shared-time.ts) (ticks filled in with local time).
- **Files.** [src/render/sky.ts](../../src/render/sky.ts), [src/features/day-night.ts](../../src/features/day-night.ts),
  [src/render/lights.ts](../../src/render/lights.ts) (a small pool of point lights handed to the glowing sources nearest the camera),
  [src/features/blob-shadows.ts](../../src/features/blob-shadows.ts).
- **Limits.** The clock only advances while someone hosts, so on a peer-hosted room the time of day stops while the
  island is empty (a room the server hosts keeps ticking, 8.1).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
