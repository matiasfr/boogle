# Progression paths: find it, reach it, build it

*Proposal, 30 October 2026. Progression for the Boogle 2.0 concept that does not depend on mini-games. Builds on [system-cohesion.md](../research/system-cohesion.md), [discovery-progression.md](../research/discovery-progression.md), [progression-models.md](../research/progression-models.md) and [rail-as-play.md](../research/rail-as-play.md). Nothing here is decided or built.*

## The problem

If mini-games are the main source of progress, every one of them has to be fun or the island stalls. Progress should come from what ordinary play already does: noticing, reaching, building, and the world's own state.

## Rules for any path

1. **Gates are "any K of M".** No era waits on one particular thing.
2. **Mini-games are optional.** They pay personal rewards (looks, som, knacks) and at most an occasional bonus toward progress.
3. **Unlocks change how you move.** Big Walk's keys open a map, a chairlift, tunnels and a train. Each era should change how you get around.
4. **Progress lives in the world.** It is shared, permanent and visible to the next visitor.

## Six paths

| Path | Era progress comes from | Riskiest part | Smallest prototype |
| --- | --- | --- | --- |
| Find it | Any 3 of 5–7 discovery leads reveal a blueprint | Leads too obscure, or too obvious | A `lore.find` op plus one discovery (the ball batted by a windmill sail) |
| Reach it | Laying the era's track pieces to reach new places | Laying track turns into work | Three snap pieces on home sand; a toy train appears when a loop closes |
| The island notices | World-state milestones colour in a silhouette | Players don't read conditions they can't see as tasks | A gull flock that appears when connected deep water passes N cells |
| Era noticeboard | Any 6 of 9 slapstick tasks | A checklist pulls friends apart (Sky) | A paper board of 8 tasks for one evening |
| Tinkerers' island | Inventing by combining junk | Joints between objects owned by different players; the surprise is spent once known | A local sandbox with three combinations |
| Restore it | Varied deliveries to named build sites | Bundles become shopping lists | One bin on a cart track wanting three different things |

## Suggested hybrid

**Find it** gives each era its reason, **Reach it** gives it its means, **Restore it** gives it a visible result, and the island-notices silhouette makes it readable without a list. The loop:

1. Discover leads.
2. Any 3 reveal the era's blueprint.
3. Lay track to reach the site and to carry things to it.
4. The build fills with varied things, delivered by train.
5. The world changes: new track pieces and new places, which hold new leads.

Mini-games sit beside the loop.

## First prototypes, in order

1. **Close the core loop.** Standing water waters seeds, and things that land in water drift ashore. Both are unit-testable and need no new art.
2. **Discovery:** `lore.find` plus the windmill bonk, played by two friends at different times.
3. **Rail:** three snap pieces plus a loop train, and the handcar pumping test.
