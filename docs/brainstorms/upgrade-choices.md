> **Status: proposed (2026-11-09).**

# Upgrade choices

Seed (owner, 9 November, after a 39-minute session): "with the carts, cart table capacity, and extra engines, etc. we
should make it a player choice to upgrade, even if there's one action, that way the player feels powerful in choosing
the increased power. It should either be UI accessable from anywhere, or maybe in the town somewhere. maybe an upgrade
tree that is diagetic would be cool since the upgrades are synced across all players." The same day the cart's rails
went from 16 to 24 as a silent fix (#1280): the power arrived without anyone choosing it.

"Cart table capacity" is read here as **what the cart's bed holds** (`CART.rails`, `CART.load`), the number he was
reacting to. Its neighbours are the forge rack (24) and the turntable (`SHED_TABLE`), which has no capacity.

## Pitch

Upgrades stop arriving silently: each one waits in the world as a part you can see, beside the machine it changes,
and one press from anyone fits it for the whole room. The cart's 24-rail bed becomes the first one. The cart starts at
16, and when Q4 is laid a pair of sideboards leans by the cart's forge stop. Fit them, and the next load leaves heaped
higher. Once there are two or more parts, a works board in the forge workshop becomes the diegetic tree: a pegboard of
silhouettes, with fitted parts shown as painted outlines. It serves DESIGN.md **6, Communal world** (every upgrade
applies to everyone) and **11, Show, don't tell**, under the owner call "Machines show their work physically".

## Gut question

When you fitted the sideboards, did the next load feel like *your* doing, or like a chore the game made you press?

## Best suggestions

1. **The part waits at the machine it changes** (creative). The sideboards stand at the cart's forge stop, glowing
   like the pack chest, and the little guys bolt them on as the cart rolls in. The press and the bigger load sit in
   one view, so the power reads as chosen.
2. **Offer it just before the limit bites** (design). At 16 rails Q4 fits one shipment exactly, and Q5 needs 24. Show
   the sideboards when Q4 is laid, so the choice answers a need you can already see coming
   ([upgrade-economy](../research/upgrade-economy.md): an upgrade should repay an inconvenience the player has felt).
3. **One accepted fact per ladder, with values as tunables** (systems). The rung pattern already exists (`rail.pack`:
   first accepted press wins, a repeat is a no-op, a late joiner loads it). Add one op, `rail.fit {id}`, that moves a
   small per-ladder step on `Rail`; the step values (`[16, 24]` for the bed) go in `TUNABLES`.
4. **Forks are order choices, not exclusive branches** (design, systems). When two parts are offered (a bigger bed or
   faster wheels), taking one makes the other the next part offered. This is ring-data's `pick` (`trainFirst: boiler |
   chassis`). Choosing feels like it matters, and no friend's pick takes anything away from you.
5. **A works board for the tree, once there is a tree** (creative). Fitted parts leave a painted outline and show on
   the machine; the rest stay under dust sheets, as on the curio shelf. A late joiner reads the room's choices at a
   glance. References: Valheim's Sacrificial Stones, a lasting record you walk back to; Spiritfarer, where the boat
   physically grows with each building.
6. **One catalog drives the 2D page and the game** (systems). Each entry gives its id, ladder, step, when it appears and
   where its part waits. `dev/economy/ring-data.ts` `LADDERS` already has `carry`, `wagon`, `trains` and `speed`, so
   adding a tree branch means adding data, not code.

**Tensions.**

- **A menu reachable from anywhere, or a place in the world?** A menu is the cheapest to build and is always within
  reach. But one player could then change everyone's machine where nobody sees it, which goes against Show, don't tell,
  and "a menu purchase followed by a sparkle is insufficient" (upgrade-economy, from the machines call).
  Recommendation: choose in the world, and offer no menu. Pause can show a read-only list later.
- **One hub or the machine's side?** The hub gives the tree a place, and the machine's side gives the press an instant
  result. The Roundhouse would be the natural hub, but it opens only after the pier, which is too late for the cart.
  Recommendation: the first part goes at the cart's stop; the board goes in the forge workshop once there are two or
  more parts; engine parts go in the Roundhouse when it opens.
- **A choice, or the grind coming back?** If nobody fits the sideboards, Q5 is the 16-rail grind again.
  Recommendation: offer them early (at Q4 laid), put them on the path you walk to the cart, and accept a press once.
  The fix stays live until the choice ships.

## Shape

- **Sync:** lockstep, server-owned, one room-wide accepted fact per ladder on `Rail` (like `pack`, `axe`, `hook`).
  The press shows its response locally at once ("Input gets instant feedback"); the fitted state follows from
  acceptance. Two presses on the same part are one fit. On a fork, the first accepted press wins and the losing press
  settles to the winner's part. Fits are not undone.
- **Reuses:** `rail.pack` in `src/sim/railway-systems.ts` and its chest view; `CART` in `src/sim/railway-cart.ts`, read
  through one function (`cartCycleTicks` and the away credit read it too); `TUNABLES` in `src/sim/tune.ts`; the
  co-op abilities flourish for friends who weren't there (option E); `LADDERS` and `pick` in `ring-data.ts`.
- **Smallest first build:** (a) a 2D HTML page of the tree from the catalog: what each part changes, when it appears,
  and what two friends see when one fits it (required by "Visualize in 2D HTML first"); (b) in game, one part: the
  sideboards, the bed going from 16 to 24, at the forge stop from Q4 laid. No board, no fork and no cost yet.
- **Risks:** the cart's defaults change, so a `WORLD_NS` bump is likely (never mid-session). The board must not become
  a checklist. `railway-systems.ts` is a hotspot file. A part's visual has to be readable on a phone from the normal
  approach.

## Done means

- `npm run look -- --rail-seed q4-done`, game camera at the cart's forge stop: the sideboards stand there, readable
  without text, with the fit prompt in reach.
- The same seed with `--eval` firing `rail.fit` then waiting one cart cycle: the cart leaves the forge carrying 24
  rails, with a visibly taller load than a 16-rail still at `--rail-seed q4-stocked`; `CART` reads give 24.
- `--rail-seed q5-stocked` without the fit: the bed holds 16 and the rack shows **More coming**. Q5 still finishes.
- `--players 2`: A fits; B gets the flourish once where they stand and sees the sideboards on the passing cart. B
  reloads and gets no second flourish. Both press within the same tick: one fit is accepted and both screens agree.

Whether choosing it feels powerful is the playtest's question.

## Open questions

1. Where are choices made? **Recommended: in the world beside the machine; a works board in the forge workshop once
   there are two or more parts; no menu reachable from anywhere.** Answer: ___
2. Re-cast the 24-rail cart as the first choice (the cart starts at 16, sideboards appear when Q4 is laid)?
   **Recommended: yes.** Answer: ___
3. Forks: order choices (the other part comes next) or exclusive branches? **Recommended: order choices.**
   Answer: ___
4. Who may fit, and can it be undone? **Recommended: anyone; the first accepted press counts for the room; no undo.**
   Answer: ___
5. What does a part cost? **Recommended: free for the first build, one press. A price from the shared wallet waits
   until the wallet ships ([money](money.md) is still proposed).** Answer: ___

## Parked

- Engine parts in the Roundhouse's two empty sockets: a second engine per line, then train speed (ring-data `trains`,
  `speed`).
- A bigger footing wagon (`WORKS.wagonCap` 6) and a faster kiln (`castTicks` 80).
- Pack carry beyond 16 (ring-data `carry`: 24, 32) as a back part on the board.
- The little guys straining at the heavier cart for one beat before setting off (after a yes).
- A museum table glow on fitted machines; a read-only list in Pause.
- Material costs (rails into a part, like the cradle) if free fits feel unearned.
