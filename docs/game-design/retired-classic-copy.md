# Retired classic copy — 13 November 2026

Step 5 of `docs/plans/server-owned-state.md` retires the seven classic states. The Boogler's gift dialogue remains
verbatim in `src/sim/gift-catalog.ts`: the seed line at 16, frisbee line at 24, and ball line at 33. Their old and new
locations are identical. The catalog remains used by inventory and The Boogler; none of its words were rewritten.

No additional character speech was found in the retired adapters, features, net prototype or wagon prototype.
One suspect player-facing notice is kept for the owner rather than rewritten (it is a welcome card, not attributed
character speech):

| Old location at `1af69645b` | Preserved text |
| --- | --- |
| `src/features/welcome-back.ts:75` | Opening day happened while you were away |

The notice no longer has a live reader: classic opening day is retired.
