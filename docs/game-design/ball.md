# 6.1 Beach ball

- **What and how it plays.** One of the island's physics toys: one shared beach ball (radius 0.45 m, 0.6 kg). Grab it (E or click with empty hands),
  carry it (it rides on your back while something else is in your hand), throw it with a charged throw, bump it like a
  volleyball dig, or steal it from whoever holds it. It floats in the sea and the cave pond, drifts along the shore and
  washes back in, bounces on
  mushrooms (restitution 0.95) and off the Boogler and windmill sails. Walking into a slow ball takes it over so the
  push resolves locally. It respawns at (12, 20) on R, or by itself when it leaves the map (3 m from the edge) or
  falls below −15 m.
- **Controls.** E / pad X grab or steal; click / pad X (nothing in reach) or D-pad → charge and throw, pad B puts the wind-up away; V / pad RT bump; R / View respawn.
- **Sync kind.** Owner for the ball in play, plus its resting spot: Lockstep `ball.rest` (state `ball`). The tab that simulates it publishes presence `b: { e, p, v, q, h }` (epoch, position,
  velocity, quaternion, held); others smooth the owner's snapshots with `createSnaps` ([src/netplay/snaps.ts](../../src/netplay/snaps.ts))
  120 ms behind with up to 150 ms of extrapolation. Ownership: highest epoch wins, ties to the larger peer id. An
  orphaned ball is claimed after 600 ms by the visible peer with the lowest id.
- **Tuning.** Linear damping 0.12, angular 0.3; ground friction 0.6, restitution 0.55 (ground), 0 (players), 0.95
  (mushrooms); Rapier multiplies the two materials' values, and the player material has none. Reach 2.4 m. Throw: see 6.7 (the same module throws everything), plus spin 8 rad/s. Bump: reach 3.4 m, 9.2 m/s up, 3.4 m/s forward, keeps
  25 % of old velocity, capped at 10.4 m/s, 300 ms cooldown. Rolling friction on the ground: velocity × (1 − 1.2 × dt),
  × (1 − 10 × dt) under 0.5 m/s. Buoyancy 3.2× weight at full submersion.
- **Files.** [src/physics/ball.ts](../../src/physics/ball.ts), [src/physics/physics.ts](../../src/physics/physics.ts), (respawn when off the island, auto-claim when you walk into it: `onFrame` hooks at
  orders −300 and −280 in the `world` phase, listed in [src/loop.ts](../../src/loop.ts)), [src/features/bump.ts](../../src/features/bump.ts), [src/features/impact.ts](../../src/features/impact.ts)
  (squash, hit-stop, sand puff, boing, face-plant), [src/render/splash.ts](../../src/render/splash.ts).
- **Known issues and limits.** A non-owner sees the ball about one round trip (owner, host or server, them) plus 120 ms late;
  join reports carry the slowest link's round trip as `rttMs` (6.15). The ball's resting spot is saved per room: once it has lain under 0.3 m/s for 1.5 s, its
  owner reports it (op `ball.rest`), and the first time a tab loads the world it puts the ball back there, unless
  someone is already playing with it. Otherwise it starts at its spawn. Keepy-uppy streak was built and cut (PLAN Phase 2). The tab that owns the ball keeps
  sending presence even before it enters the island (`keepPresenceWhile` in [src/netplay/net.ts](../../src/netplay/net.ts)).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
