# 6.7 Throwing and flight

- **What and how it plays.** Hold to charge (a meter and a dotted aim preview show), release to throw. Everything but
  the ball flies on a scripted path that bounces off scenery up to 6 times and comes to rest; a thing that lands in
  water is lost; a seed plants itself where it lands. The frisbee is thrown flatter and glides: lift with airspeed,
  heavy drag and a fade to the left as it slows.
- **Controls.** Click or pad X (hold, release); touch Toss.
- **Sync kind.** Local flight, Lockstep landing. The thrower computes the path and submits `gift.toss` with the launch
  and the landing cell; every client replays the flight from the launch; only the landing is shared state.
- **Tuning** ([src/physics/flight.js](../../src/physics/flight.js), [src/player/player.js](../../src/player/player.js)). Throws leave from head height.
  Power 8 + 20 × charge (frisbee 9 + 15 × charge) m/s. Drag 0.002/m; frisbee lift 0.05 per (m/s)², max 0.85 g, drag
  0.009, fade 1.6 m/s² below 18 m/s. Bounce keeps 30 % into the surface and 55 % along it (frisbee 12 % and 80 %);
  rests under 2 m/s on a surface flatter than about 53°. Max 8 s of flight.
- **Files.** [src/physics/flight.js](../../src/physics/flight.js), [src/adapters/gifts.js](../../src/adapters/gifts.js), [src/player/hands.js](../../src/player/hands.js).
- **Known issues and limits.** Paths on different machines only need to look alike (raycasts use cannon-es).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
