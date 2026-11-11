# 6.21 Prototype: mini-game toys (`?proto=minis`)

*Two toys from the shortlist in [minigames-and-physics-minigames.md](../research/minigames-and-physics-minigames.md)
(5 and 6), built to inform the pending mini-games design pass. Each is a place with a prop near the court, not a
mode: walk up, play, walk away. No rewards; nothing gates anything. Serves DESIGN.md 1 (Toys before chores), 2 (Physics
toys first) and 10 (Slapstick over precision). Gut question: "Which of these would you play again unprompted?"
`&v=golf` or `&v=hop` shows one; no `v` shows both. Without the flag nothing loads
(`src/features/proto-minis.ts` imports `src/proto/minis/` only with it).*

## Ball golf, one hole (tee at the court's west edge)

- A green tee mat at (4, 19); a red-and-white bucket with a tall yellow flag at (-30, 16.5), 34 m west past the palm
  grove. **Tee off** (Interact at the tee) puts the beach ball on the tee and zeroes the count; **Start over** there does
  it again. Every throw is a stroke; carrying the ball costs a stroke for every 3 m walked with it. The
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

Local, all of it: the bucket, the mushrooms, the counts and the bests are this tab's own. The only shared thing is the beach ball (Owner, as always).

## Look at it

`npm run scenario -- minis`: a tee-off and a lob into the bucket, a hop run that overshoots into
the sand, each as a motion sheet in `.look/scenarios/minis/`.

## Files

`src/proto/minis/` (`golf.ts`, `hop.ts` removed from `main`; [common.ts](../../src/render/fanfare.ts) stays: labels, bests,
sounds, confetti), `src/features/proto-minis.ts` and `dev/scenarios/minis.ts` (removed).

## Not built

Ghosts, friends' flags, group scoring, the other shortlist games (topple stack, retired 2026-11-01; soapbox ghost, court pips, Boogler launch, cart
pile-up, frisbee ring), and any reward.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
