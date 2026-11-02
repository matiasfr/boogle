# 6.21 Prototype: mini-game toys (`?proto=minis`)

*Three toys from the shortlist in [minigames-and-physics-minigames.md](../research/minigames-and-physics-minigames.md)
(3, 5 and 6), built to inform the pending mini-games design pass. Each is a place with a prop near the court, not a
mode: walk up, play, walk away. No rewards; nothing gates anything. Serves DESIGN.md 1 (Toys before chores), 2 (Physics
toys first) and 10 (Slapstick over precision). Gut question: "Which of these would you play again unprompted?"
`&v=topple`, `&v=golf` or `&v=hop` shows one; no `v` shows all three. Without the flag nothing loads
(`src/features/proto-minis.ts` imports `src/proto/minis/` only with it).*

## Topple stack (east of the court, by the palms)

- Six painted crates (0.8 m, red, yellow, blue) in a 3-2-1 pyramid on a stump at (21, 33), facing the court. Knock them
  off with the ball (a throw or a bump) or your body. A big count (`3/6`) floats over the stump, with your shots under it.
- A crate counts as fallen once it drops below the stump top or leaves its edge. 4 s after the last one falls (and
  everything is still), the round scores: most crates, then fewest shots. Your best (`best 6 in 2 shots`) is kept in
  localStorage; a new one gets confetti and a fanfare. Then the crates vanish in a puff and drop back one by one.
  Shots that topple nothing reset quietly once all is still.
- **Shots:** each throw or bump of the ball within 35 m, and each body shove (one per second).
- **Feel:** the ball's designed hit: a crate it touches also takes 55% of the ball's velocity and 1.6 m/s of lift (crates
  are 0.7 kg), so a good throw clears half the stack. Each crate impact knocks (a synthesized wood thunk) and puffs
  dust; a big one holds the drawn crates for 45–80 ms (hit-stop; physics never pauses). Each fall pops one step up a
  pentatonic scale and punches the count.

## Ball golf, one hole (tee at the court's west edge)

- A green tee mat at (4, 19); a red-and-white bucket with a tall yellow flag at (-30, 16.5), 34 m west past the palm
  grove. **Tee off** (Interact at the tee) puts the beach ball on the tee and zeroes the count; **Start over** there does
  it again. Every throw and bump is a stroke; carrying the ball costs a stroke for every 3 m walked with it. The
  count floats over the ball.
- The ball in the bucket (inside its rim, not held) ends the hole: Hole in one / Eagle / Birdie / Par / Bogey over the
  flag, against par 3 and your best (fewest strokes, localStorage). Par or better, or a best, gets confetti and a
  fanfare; worse gets a sad trombone. **Play again** (Interact within 5 m of the bucket) puts you and the ball back on
  the tee. The bucket is a dead material (restitution 0.05), so a ball that drops in stays in.
- The ball is still the shared ball: if someone else takes it, your hole is off.

## Mushroom hop line (south-west of the court, on the beach)

- A start crate at (3.5, 31), five bouncy mushrooms going west (caps 1.3–2.2 m high, 5.5–5.8 m apart, red to blue) and a
  landing deck with a red flag at (-29.5, 31). The clock starts on your first bounce; landing on the deck stops it.
  Touching the sand (or water) on the way is a fail: a geyser of sand spits you 9 m/s back up, a sad trombone plays and
  the flag reads SPLAT!.
- Caps bounce you at 12.5 m/s (about 4.3 m up, 1.4 s in the air: at full walking speed you overshoot the next one, so
  ease off). Each bounce squashes the cap and boings.
- **Back to start** (Interact on the start crate) or **Hop again** (Interact anywhere along the line after a run) puts
  you on the crate facing the line. Time and your best (localStorage) float over the flag.

## Sync

Local, all of it: the crates, the bucket, the mushrooms, the counts and the bests are this tab's own; another player's
ball or body is not simulated against your crates. The only shared thing is the beach ball (Owner, as always).

## Look at it

`npm run scenario -- minis`: a throw into the stack, a tee-off and a lob into the bucket, a hop run that overshoots into
the sand, each as a motion sheet in `.look/scenarios/minis/`.

## Files

[src/proto/minis/](../../src/proto/minis/) (`topple.ts`, `golf.ts`, `hop.ts`, `common.ts`: labels, bests, sounds,
confetti and your ball shots), [src/features/proto-minis.ts](../../src/features/proto-minis.ts),
[dev/scenarios/minis.ts](../../dev/scenarios/minis.ts).

## Not built

Ghosts, friends' flags, group scoring, the other shortlist games (soapbox ghost, court pips, Boogler launch, cart
pile-up, frisbee ring), and any reward.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
