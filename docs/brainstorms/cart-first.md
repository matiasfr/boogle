> **Status: proposed (2026-11-05).**

# Cart first, trains as its upgrade

**Pitch.** Make the second train something you can picture before you can have it. Timber has finished the forge's roof, while stacked quarry stone waits beside a dormant train and an unfinished street. The upgrade keeps everything you trusted the cart to do. This serves DESIGN.md's **Show, don't tell**.

**Gut question.** What did you want that other train to do?

A concrete answer shows understanding, and trying to activate it shows desire. Neither alone proves another boiler job is fun.

Variants differ in one thing, with costs and unlocks unchanged:

- **A:** The stone and unfinished street are visible before the boiler.
- **B:** They appear only after timber service starts.

## Best suggestions

1. **Give train two a different visible job** (all three). Timber roofs the forge and stone builds the street. The pier kit is a weaker promise, because it arrives too close to the end.
2. **Ride with the first shipment** (creative, design). Board beside real cargo and watch it become construction, with room for a friend. It also lets you leave a load travelling while you explore, and come back to it ready.
3. **Never break deliveries** (systems). Today unlocking trains also stops the cart, and train freight only serves finished routes. An impressive departure followed by an empty rack would undo the whistle repair.
4. **Test earlier trains separately** (systems, design). They get about 3 minutes today. Several useful journeys are the goal, but moving the boiler alone could remove frontier supply, so it needs its own test with supply working.
5. **The cart bed becomes the first wagon** (creative, systems). Reusing its recognisable deck, with its little workers riding, makes the upgrade obvious. Start stationary and unloaded, without live coupling.

## Tensions

- **Unlock two engines separately?** Design proposed it first, then withdrew it after the systems review. Today one boiler starts both lines. Systems wants per-line activation for a real test of wanting a second train; creative would first test anticipation with mechanics fixed. Recommendation: start with variants A and B, and only build per-line activation if answers show understanding but no desire can be measured.
- **Wagon now or later?** Recommendation: later, as shared parts first. Moving a live cart, cargo and riders risks platform and transfer bugs.

## Shape

- **Sync:** freight and unlocks stay lockstep and server-authoritative, riding stays owner, and cues stay local. Any per-line state must keep existing wire meanings.
- **Reuse:** the promoted equivalents of `cargo.ts`, `depot.ts`, `halts.ts` and `pair.ts`, plus existing town construction.
- **Sequence:** the panel agrees with the production plan: port current cart and train behaviour in slices 4 and 5, then experiment on those systems.
- **Risks:** `job.rung.trains` also disables the cart, and loaded deliveries and recall acknowledgements must survive the handover.

## Done means

- Authored checkpoint on production systems before the boiler: stone and the unfinished street are visible from the normal approach, in a game-camera still.
- After activation, deliveries keep arriving at unfinished work, racks show true states, and a recall stays acknowledged across the handover.
- Two-player scenario: one rides timber to the forge and sees it finish, with no required job holding the other player.
- Costs and bills match the baseline in both variants.

## Open questions

1. Is cart first still the direction after you play? **Recommended: yes, but as the visible second-train promise, keeping today's unlocks until it's tested.** Answer: ___
2. When does this start? **Recommended: after slice 5's port, as the plan says.** Answer: ___
3. Second train's promise? **Recommended: stone builds the street.** Answer: ___

## Parked

- Live coupling and a cart-to-train departure moment.
- Little workers as passengers, after a yes.
- Separately purchased engines.
- The whistle's approved meaning stays recall only; call points along the line were not chosen.

**Disposition:** prerequisite first (production slices 4 and 5), then a bounded experiment, with the direction decided by the owner after the replay.
