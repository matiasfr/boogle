> **Status: building (2026-11-09).** The owner answered question 2: boiler first, the cart stays at 24. Question 1 (where choices are made) is still open. Revised the same day after the [design review](#design-review-designer-2026-11-09).

# Upgrade choices

Seed (owner, 9 November, after a 39-minute session): "with the carts, cart table capacity, and extra engines, etc. we
should make it a player choice to upgrade, even if there's one action, that way the player feels powerful in choosing
the increased power. It should either be UI accessable from anywhere, or maybe in the town somewhere. maybe an upgrade
tree that is diagetic would be cool since the upgrades are synced across all players." The same day the cart's rails
went from 16 to 24 as a silent fix (#1280): the power arrived without anyone choosing it.

"Cart table capacity" is read here as **what the cart's bed holds** (`CART.rails`, `CART.load`), the number he was
reacting to. Its neighbours are the forge rack (24) and the turntable (`SHED_TABLE`), which has no capacity. Either way,
its first step stays at 24 or above (review finding 1).

**2D page:** [upgrade-tree.html](../world/upgrade-tree.html), a design aid built from one catalog: each node's
inconvenience and number, where its part would wait, what friends see, and an order fork.

## Pitch

Upgrades stop arriving silently: each one waits in the world as a part you can see, beside the machine it changes,
and one press from anyone fits it for the whole room. The first is **the boiler fit, the "extra engines"**. You have
just hand-carried stations, station 6's frame says its kit comes by train, and fitting the boiler gets the full upgrade
treatment: an instant press response, the little guys bolting it on, one flourish for everyone, and a mark that stays
on the engine. The cart keeps its 24-rail bed. A works board becomes the diegetic tree later, on the unified Home
station. It serves DESIGN.md **6, Communal world** (every upgrade applies to everyone) and **11, Show, don't tell**,
under the owner call "Machines show their work physically".

## Gut question

When you fitted the boiler, did the first train unload feel like *your* doing, or like a step the game made you take?

## Best suggestions

1. **The part waits at the machine it changes** (creative). The boiler's saddles are on the old train, and the little
   guys bolt it in. The press and the payoff (steam, wheels, the first train) sit in one view.
2. **Offer it after the limit is felt, and make it keep paying** (design). The [upgrade-economy](../research/upgrade-economy.md)
   research (recommendation 2) says an upgrade should repay an inconvenience the player has felt, and keep paying. By
   the boiler you have carried every station's kit by hand, and station 6 (32 logs and 32 rails over 546–742 m) arrives
   in one train unload. Every later haul pays it again. The cart's bed fails this test: its limit is hit at most once.
3. **One accepted fact per ladder, with values as tunables** (systems). The rung pattern already exists (`rail.pack`:
   first accepted press wins, a repeat is a no-op, a late joiner loads it). New parts later go through one op,
   `rail.fit {id}`, moving a small per-ladder step on `Rail`; the step values go in `TUNABLES`. The boiler needs neither:
   it is already one accepted fact.
4. **Forks are order choices, not exclusive branches** (design, systems). When two parts are offered, taking one makes
   the other the next part offered (ring-data's `pick`, `trainFirst: boiler | chassis`). This is built after the first
   single choice.
5. **A works board for the tree, once there is a tree** (creative). Fitted parts leave a painted outline and show on
   the machine; the rest stay under dust sheets, as on the curio shelf. Its spot waits for the unified Home station.
   References: Valheim's Sacrificial Stones, a lasting record you walk back to; Spiritfarer, where the boat physically
   grows with each building.
6. **One catalog drives the 2D page and the game** (systems). Each entry gives its id, ladder, step values, when it
   appears, where its part waits, what it repays, and what friends see. `dev/economy/ring-data.ts` `LADDERS` already has
   `carry`, `wagon`, `trains` and `speed`.

**Tensions.**

- **A menu reachable from anywhere, or a place in the world?** A menu is the cheapest to build and is always within
  reach. But one player could then change everyone's machine where nobody sees it, which goes against Show, don't tell,
  and "a menu purchase followed by a sparkle is insufficient" (upgrade-economy, from the machines call).
  Recommendation: choose in the world, with no menu. Pause can show a read-only list later.
- **One hub or the machine's side?** The hub gives the tree a place, and the machine's side gives the press an instant
  result. Recommendation: parts go at their machine; the board's spot waits for the Home station pick.
- **A part you can skip.** If nothing lets you skip it unknowingly, one option can still feel like power. If you can
  skip it without seeing the cost, it can't (review finding 3: he skipped the boiler and laid station 6 by hand).

## Shape

- **Sync:** lockstep, server-owned, one room-wide accepted fact per part on `Rail` (like `pack`, `axe`, `hook`, and the
  boiler today). The press shows its response locally at once ("Input gets instant feedback"); the fitted state
  follows from acceptance. Two presses on the same part are one fit. Fits are not undone.
- **Reuses:** the boiler's existing fit and wake; the co-op abilities flourish for friends who weren't there
  (option E); `TUNABLES` in `src/sim/tune.ts` for later ladders; `LADDERS` and `pick` in `ring-data.ts`.
- **Smallest first build:** (a) the 2D tree page ([upgrade-tree.html](../world/upgrade-tree.html)); (b) in the game,
  the boiler fit staged as the first upgrade choice, inside the boiler work already queued (the rope haul and the
  station-6 order fix). Station 6's frame says plainly that its kit comes by train. The fit gets an instant local
  response, the little guys bolting it on, a one-time flourish for both players, and a mark that stays on the engine.
  No new op, no `CART` change, no `WORLD_NS` bump. (c) If the owner still wants the bed as a choice, 24 stays the floor
  and the part is a step above it; otherwise cut it.
- **Risks:** the board must not become a checklist; the boiler work is already queued, so this rides on it rather than
  forking it; a part's visual must read on a phone from the normal approach.

## Done means

- `npm run look -- --rail-seed q5-done`, with the boiler waiting: station 6's frame reads as "kit comes by train" from the normal approach,
  in a game-camera still.
- The same seed with `--eval` hauling the boiler to the old train and pressing the fit: the local response starts on the press frame (before acceptance), the little guys bolt the
  boiler on, and the mark stays on the engine after a reload.
- The first train unload at station 6 brings its kit in one stop; a timer shows it against the hand haul.
- `--players 2`: A fits; B gets the flourish once where they stand. B reloads and gets no second flourish. Both press
  within the same tick: one fit is accepted, and both screens agree.

Whether choosing it feels powerful is the playtest's question.

## Open questions

1. Where are choices made? **Recommended: at the machine the part changes; a works board later on the unified Home
   station; no menu from anywhere, and Pause can show a read-only list.** Answer: ___
2. Re-cast the 24-rail cart as the first choice, starting at 16? **Recommended: no. Keep 24 and make the boiler fit the
   first upgrade choice.** Answer: **yes** (owner, 9 November: "Yes, boiler first"). Plan: `docs/plans/boiler-first-choice.md`.
3. Forks? **Recommended: order choices, built after the first single choice.** Answer: ___
4. "Cart table capacity": the cart's bed, or the forge rack beside the turntable? **Recommended: the bed. Either way its
   first step stays at 24 or above.** Answer: ___

## Parked

- Engine parts in the Roundhouse's two empty sockets: a second engine per line, then train speed (ring-data `trains`,
  `speed`).
- A bigger footing wagon (`WORKS.wagonCap` 6) and a faster kiln (`castTicks` 80).
- Pack carry beyond 16 (ring-data `carry`: 24, 32) as a back part on the board.
- A cart bed above 24, only if the owner wants it.
- A museum table glow on fitted machines; a read-only list in Pause.
- Material costs (rails into a part, like the cradle) if free fits feel unearned.

## Design review (designer, 2026-11-09)

The brief above is corrected where these findings contradict it (Pitch, suggestion 2, Shape's smallest first build,
Done means and the open questions).

1. **Must change before building: starting the cart back at 16 brings the grind back for nearly every solo player.**
   The bed only counts for one shipment in the whole game: Q4 needs 16, Q5 needs 24, and Q6 comes by train. When Q4 is
   laid, the cart leaves at once and reaches the forge stop in about 25 s, where the rack is already full, and leaves
   3 s later. The player is at the rim, about 286 m (about 50 s) away, and their next goal, the sea switch at the
   summit, is the other way. So a typical solo player fits it too late: Q5's first load has gone with 16, and the
   other 8 need a second trip anyway. A player who never notices the part gets back the 216 s at the rim from
   [home-flow](../reviews/home-flow.md#1-three-and-a-half-minutes-standing-at-the-rim-for-q5) finding 1, the evidence
   behind #1280. "On the path you walk to the cart" doesn't hold: the cart comes to you. 16 is Place's value, and it
   fails "Port from Place only what still fits".
2. **It repeats the "Call cart to forge" mistake.** The sideboards would stand where that handle stood (the owner cut
   it because its purpose wasn't visible), and the payoff, a heaped cart, is seen 270 m away at the rim. So "the press
   and the bigger load in one view" doesn't hold.
3. **The 9 November session already ran this experiment with the boiler**, an in-world, one-option upgrade to "extra
   engines" (his words). Nothing made him fit it, so he funded and laid station 6 by hand. A part you can skip, with no
   cost of skipping in view, doesn't feel like power. Upgrade-economy recommendation 2, read the right way round: an
   upgrade should repay an inconvenience the player has felt, and keep paying. The bed's limit is hit once at most.
4. **The works board's spot overlaps the owner's "Home gets one coherent station" decision**
   ([decisions](../decisions.md#decided), 9 November). Don't fix it to the forge workshop: it belongs on the unified
   station, sited after he picks a layout.
5. **One option can feel powerful, and no fork is needed to test it** ("even if there's one action"). The feeling
   needs four things: you have felt the limit before the part appears, the press gets a big local response, you see
   the payoff within seconds, and it keeps showing up afterwards. The bed misses two of those. The boiler meets all of
   them, once nothing lets you skip it unknowingly.

**Smallest first build the designer approves:** (a) the 2D tree page now; (b) in the game, stage the boiler fit as the
first upgrade choice inside the boiler work already queued (the rope haul and the station-6 order fix). Station 6's
frame says plainly that its kit comes by train, and the fit gets the upgrade treatment: an instant local press
response, the little guys bolting it on, a one-time flourish for both players, and a mark that stays on the engine. No
new op, no `CART` change, no `WORLD_NS` bump. (c) If the owner still wants the bed as a choice, keep 24 as the floor
and make the part a step above it, or cut it.

**Cut:** the cart starting at 16 (the old open question 2, and Done-means checks 2 and 3).

**Calls, as sorted:** logged in [agent-calls](../agent-calls.md) (9 November). New, with the owner: choices in the
world with no menu; the cart is not re-cast and 24 stays. New: forks are order choices, later; the board's spot waits
for the Home station pick. Defaults: the part glows like the pack chest, the little guys bolt it on, no undo, free
until the wallet ships, the first accepted press wins a fork, painted outlines and dust sheets, a late joiner's
one-time flourish, and a read-only Pause list later.
