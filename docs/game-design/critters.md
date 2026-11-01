# 6.10 Critters

All are Local cosmetics (Math.random allowed).

| Critter | What | Numbers |
|---|---|---|
| Fish | A boids school in water at least 0.4 m deep (the sea or the cave pond); scatters from swimmers and a splashing ball. | 36 fish, 1.8 m/s cruise, 6 m/s flee, scare within 3.5 m. |
| Gulls | Idle and peck on the sand, burst up when a player runs at them (3 m/s or more within 4.5 m) or the ball lands within 5 m, circle 6 to 12 s, resettle. | 7 gulls, 7 m/s, circle radius 8 to 14 m, 6 to 10 m up. |
| Fireflies | Blinking lights around the garden and over grass at night. | 60, shown when daylight is under 0.35. |

Files: [critter-fish.js](../../src/features/critter-fish.ts), [critter-gulls.js](../../src/features/critter-gulls.ts),
[critter-fireflies.js](../../src/features/critter-fireflies.ts). Related research:
[research/creature-ai-and-ecosystems.md](../research/creature-ai-and-ecosystems.md).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
