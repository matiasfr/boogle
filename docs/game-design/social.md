# 6.9 Social: honk and ping

- **Honk.** T / pad Y / touch Honk: a short cartoon honk with a note over your head, pitched from your colour on a
  major pentatonic from C4 (261.63 to 659.27 Hz). When 3 or more different players honk within about 1 s, every
  client plays a chord with 14 sparkles per player involved (cooldown 1.2 s). Your own honks are capped at one per
  300 ms; received honks at 3 per sender per second. Distance fades the volume.
- **Ping.** G / middle click / pad D-pad ← / touch Ping: a marker where you aim, labelled "Ball!" (the aim passes
  within 1.6 m of the ball), or "Look!" (anything else), in your colour with your name, for
  4 s (0.5 s fade), pinned to the screen edge with an arrow when off screen. Range 90 m, own cooldown 1 s, received
  one per 800 ms per sender.
- **Sync kind.** Neither is state: reliable room messages `{ t: 'honk' }` and `{ t: 'ping', x, y, z, k }`, validated
  and rate limited on receipt ([src/sim/social.ts](../../src/sim/social.ts)).
- **Files.** [src/features/honk.js](../../src/features/honk.js), [src/features/ping.js](../../src/features/ping.js),
  [src/sim/social.ts](../../src/sim/social.ts).
- **Related ideas.** [research/communal-progression.md](../research/communal-progression.md) uses the honk chord as the
  template for together moments.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
