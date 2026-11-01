# 6.9 Social: honk and ping

- **Honk.** T / pad Y / touch Honk: a short cartoon honk with a note over your head. Every honk takes a tone from
  a shared chord that changes every 10 s of shared world time (Am7, Em7, Dm7, C6/9, looping; eight voices from A3 to
  G5, none a semitone apart), so honks heard together always make a chord. Your colour sets your home voice and a
  flavour (reedier on odd colours); each press picks a different shape (honk, short toot, honk-honk up a chord tone,
  low bwomp an octave down) that also steps your voice, so a honk isn't the same twice running. It plays at once,
  never waiting for a beat. When 3 or more different players honk within about 1 s, every client plays their notes
  as a held chord with 14 sparkles per player involved (cooldown 1.2 s). Your own honks are capped at one per
  300 ms; received honks at 3 per sender per second. Distance fades the volume.
- **Ping.** G / middle click / pad D-pad ← / touch Ping: a marker where you aim, labelled "Ball!" (the aim passes
  within 1.6 m of the ball), or "Look!" (anything else), in your colour with your name, for
  4 s (0.5 s fade), pinned to the screen edge with an arrow when off screen. Range 90 m, own cooldown 1 s, received
  one per 800 ms per sender.
- **Ping sound.** Two soft sine notes in your colour's pitch an octave up (a fifth for "Ball!", a third for "Look!"),
  quiet, with a gentle onset and a short tail.
- **Sync kind.** Neither is state: reliable room messages `{ t: 'honk', v }` (v: the shape, 0 to 3; missing reads as
  0) and `{ t: 'ping', x, y, z, k }`, validated
  and rate limited on receipt ([src/sim/social.ts](../../src/sim/social.ts)).
- **Files.** [src/features/honk.ts](../../src/features/honk.ts), [src/features/ping.ts](../../src/features/ping.ts),
  [src/sim/social.ts](../../src/sim/social.ts).
- **Related ideas.** [research/communal-progression.md](../research/communal-progression.md) uses the honk chord as the
  template for together moments.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
