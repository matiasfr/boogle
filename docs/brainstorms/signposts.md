> **Status: approved (owner, 2026-11-05).**

# Signposts: a fork without instructions

Seed (owner, 4 November, playing solo on iPhone): "better alternative to the signs like quarry, later. Those feel heavy handed."

## Pitch

The opening fork has two boards, `↑ TIMBER CAMP` and `QUARRY, LATER ↓` (`src/proto/place/signs.ts:75`). Its comment already records the owner finding an earlier big sign heavy-handed, so this is the second time. The panel's answer is mostly to take away rather than replace: stop telling players what order to do things in, let the places draw them, and put any explanation of a blockage at the blockage. An early walk to the quarry counts as curiosity, not as a guidance failure, because the slab stops the machine and not the player. This serves DESIGN.md 11, Show, don't tell. It has to keep 7, Telegraph everything, and 8, Designed for drop-in, drop-out: someone arriving should still be able to find a friend who says "meet at the old cart".

## Gut question

**Did choosing where to go feel like your own discovery, without getting lost?**

Same fork, same routes, one change at a time:

- **A, today:** both boards as they are.
- **B, names only:** `TIMBER CAMP` and `QUARRY`, with no arrows and no "later".
- **C, no boards:** nothing at the fork.

## Best suggestions

1. **Drop "later" whatever else happens** (all three). It sets an order, and in a progressed room it becomes false.
2. **Take away first, add only if needed** (systems, design). The three-way comparison shows whether a replacement is needed at all before anyone builds one.
3. **If C loses people, open up the view along the existing timber path from walking height** (creative, systems). That is smaller than any new landmark. It must read from the normal phone camera with sound off.
4. **Explain the blockage at the slab, chain and lever** (design, creative). They already show what stops the railway, without declaring the quarry off-limits.
5. **Small names at destinations, not the fork, if vocabulary is needed** (creative, systems). A `Quarry` board at the old cart gives friends a word and a meeting place.

## Tensions

- **Add a landmark at the fork?** Design and systems first proposed a lookout and a moved rock arch, then withdrew them; creative objected that the arch would spend its surprise too early. Recommendation: no new or moved objects in the first comparison.
- **The lookout rock.** Creative still likes it as an optional pleasure, and design cut it from the first test. Recommendation: park it. Essential direction can't depend on hopping up somewhere.
- **"Follow the smoke".** Two panelists leaned on camp smoke, but systems found both camps emit it, so it doesn't single out the timber route. Recommendation: don't count on smoke alone.
- **An earlier owner lean.** On 2 November the owner wanted "at least a sign or something direct". The 3 November call that the world gives direction came later and wins, but it's why boards stay on the table as variant B rather than being ruled out.

## Shape

- **Sync:** Local authored scenery. No ops, presence, saves or protocol changes.
- **Reuses:** `buildSigns()` and `sign()` in `signs.ts`, and the launch flags in `src/proto/flags.ts`.
- **Smallest build:** an address flag choosing A, B or C, with A staying the default. Skip building a removed board instead of hiding it, because `sign()` also adds post colliders. Keep `paintBoard()` and `setNumbers()`, which do other jobs in that file.
- **Risks:** a fork that looks fine in a still can be unreadable behind the phone camera and touch controls. The quarry could also pull players away from the first machine. Experienced players can't judge first-time clarity, and neither can a bot that knows where it's going.

## Done means

Capture with `look` at the fork (about x −104, z −98), at walking height on the normal camera, in each of A, B and C:

- Walking up to the fork: the wide timber path is visible, and the boards match the variant.
- Departing along each branch, and returning to the fork.
- C: no board and no invisible post collider at either old position.
- A progressed room, where no board says anything false.

Whether it feels good stays the playtest's question. Not tested on a device.

## Open questions

1. Does the game still need to say the quarry comes later? **Recommended: no, an early visit is fine, and the slab and lever explain the railway when you get there.**
   Answer (owner): no, an early visit is fine.
2. Are plain place names still welcome? **Recommended: yes as the fallback, but try no boards first.**
   Answer (owner): yes as recommended.
3. When should this go in? **Recommended: build it behind a link now, keep today's boards for the replay so "Finding the way" still answers the same question, and compare after.**
   Answer (owner): remove the signs now.
4. Should the dock start and the entry into town join this? **Recommended: no, this stays one fork, and those go with the terrain and level design pass.**
   Answer (owner): yes, they join this work.

## Parked

- Quiet hammering from little guys you can see, as a place's sound (creative).
- A gull on the sleeping machine, startled when it wakes (creative).
- A jumpable lookout where you can say "that's where our railway will go" (design).
- A previz of the fork's compositions from the phone camera (creative).

## Disposition

**Proceed.** The owner chose to remove the signs now, so the replay plays without them, and its "Finding the way" answer reads against this change. A blind first-time player is still the only real check of discovery.
