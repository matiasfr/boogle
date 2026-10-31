# Boogle: game design document (as built)

*It describes what exists on `main` today, not what is planned, and is kept current by the rule in
[AGENTS.md](../AGENTS.md) (player-facing changes update their file in [game-design/](game-design/) in the same commit). Every number is read from the code or the docs it links. Where the code does not say,
the doc says "unclear from code". Plans live in [PLAN.md](../PLAN.md) and [tech-plan.md](tech-plan.md); undecided
ideas live in [proposals/](proposals/README.md) and are only linked as "related ideas".*

This page is the index: sections 1 and 2 are here, everything else has one file per section or system, so changes to
different systems don't touch the same file. A new system adds its file and one line below.

---

## 1. Overview

Boogle is a drop-in browser island for 1 to 6 friends. You pick a name and a colour, press "Jump in", and land next to a
sand volleyball court with one shared beach ball. Today the loop as actually played is: throw, bump and chase the ball;
pick up fruit and throw it at each other; plant mushroom seeds from the stall and bounce on what grows; befriend The Boogler, a purple
blob NPC from Samarqand who wanders the island, talks in chapters, takes presents and launches you if you ride him;
honk and ping to friends; climb the lighthouse for the frisbee; walk through the caves. There are no scores, timers or
goals. The tide, weather and crops from the plan are not built.

It runs on desktop (keyboard and mouse, pointer lock), touch screens (virtual stick and buttons) and a Backbone-style
gamepad (W3C standard mapping, aimed at iPhone and iPad). One player's browser hosts the room over PeerJS. Live at
**https://boogle.club/** (`?room=<name>` picks an island, default `beach`).

## 2. Pillars

The principles are in [DESIGN.md](../DESIGN.md); read it there. In one line each:

| # | Principle | What it means in practice today |
|---|---|---|
| 1 | Toys before chores | Ball, throwing and the Boogler have no score. |
| 2 | The ball stays the star | Ball floats, knocks fruit off palms, bounces on mushrooms. |
| 3 | Farming is never required | Mushrooms are optional; nothing is gated on them. |
| 4 | Cooperation is automatic | Shared mushrooms and items; the honk chord needs 3 people but no coordination. |
| 5 | Only the world is the antagonist | No PvP state damage. |
| 6 | Communal world, personal rewards | Hotbar and Boogler friendship are per player, in localStorage. |
| 7 | Telegraph everything | Interact prompt, ping markers. (No world events exist yet to telegraph.) |
| 8 | Drop-in, drop-out | No lobby; host migration; mixed-build reloads. |
| 9 | Leave something for the next visitor | Water, mushrooms and items persist in snapshots. |
| 10 | Slapstick over precision | Face-plants, flops, sail bonks, Boogler launches. |

Technical principles (sync kinds, determinism, sync edits not state, PeerJS only, small and readable) are in the same
file, and section 8 maps every feature to its kind.

## 3. [The island](game-design/island.md)

## 4. [Player](game-design/player.md)

## 5. [Controls](game-design/controls.md)

## 6. Systems

Sync kinds are defined in [DESIGN.md](../DESIGN.md), "Pick how each feature shares state". "Tick" means a lockstep
tick of 100 ms (10 per second).

- [6.1 Beach ball](game-design/ball.md)
- [6.2 Sand digging and the shovel](game-design/digging.md)
- [6.3 Water sim](game-design/water-sim.md)
- [6.4 Mushrooms and the stall](game-design/mushrooms.md)
- [6.5 Gifts](game-design/gifts.md)
- [6.6 Hotbar and items](game-design/hotbar.md)
- [6.7 Throwing and flight](game-design/throwing.md)
- [6.8 The Boogler](game-design/boogler.md)
- [6.9 Social: honk and ping](game-design/social.md)
- [6.10 Critters](game-design/critters.md)
- [6.11 Day and night](game-design/day-night.md)
- [6.12 Caves](game-design/caves.md)
- [6.13 Pause view and controls guide](game-design/pause.md)
- [6.14 First-run card](game-design/first-run.md)
- [6.15 Telemetry and updates](game-design/telemetry-and-updates.md)
- [6.16 Prototype flags](game-design/prototype-flags.md)
- [6.17 The dino and the guest](game-design/dino-and-guest.md)
- [6.18 Graphics and devices](game-design/graphics.md)
## 7. Content inventory

- [7.1 Items (gift catalog)](game-design/items.md)
- [7.2 The Boogler's lore and chapters](game-design/boogler-lore.md)
- [7.3 POIs](game-design/pois.md)
## 8. [Multiplayer and persistence](game-design/multiplayer.md)

## 9. [Tech and tooling](game-design/tech.md)

## 10. [Status](game-design/status.md)

## 11. [Glossary](game-design/glossary.md)

## 12. [Doc and code mismatches found while writing this](game-design/mismatches.md)
