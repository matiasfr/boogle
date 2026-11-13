# Boogle: game design document (as built)

_It describes what exists on `main` today, not what is planned, and is kept current by the rule in
[AGENTS.md](../AGENTS.md) (player-facing changes update their file in [game-design/](game-design/) in the same commit). Every number is read from the code or the docs it links. Where the code does not say,
the doc says "unclear from code". Current design lives in [DESIGN.md](../DESIGN.md) and the
[decision log](decisions.md); prototype work is in [find-the-fun.md](plans/find-the-fun.md), engineering work
in [tech-plan.md](tech-plan.md). Undecided ideas live in [proposals/](proposals/README.md) and are only linked as "related ideas"._

This page is the index: sections 1 and 2 are here, everything else has one file per section or system, so changes to
different systems don't touch the same file. A new system adds its file and one line below.

---

## 1. Overview

Boogle is a drop-in browser game for up to 8 friends. The default URL now opens [round 4 in Threefold Reach](game-design/place.md), with the clean tester view and co-op enabled in `boogle`: chop and carry, open a walking path, earn better tools and abilities, and unlock trains. Explicit prototype and room links still work. Place's prototype code was deleted on 11 November (ecs-m12-m13 M13e); `?proto=place` opens the live game.

**The classic island** (owner, 6 November) has no entry of its own any more: `?classic=1`, its `beach` room and the
`island=low` comparison are gone. The original island stands in the same world as the current game, at the world's
origin, about 800 m west of the cove landing: you see it on the horizon from spawn and can swim there. It shares the
world's summer sky, fixed time of day and real sea; its own day/night cycle, cheaper sea and shore experiments were
removed. Its content comes with it where it already works: the sand volleyball court and the shared beach ball, The
Boogler (a purple blob NPC from Samarqand who wanders the island, talks in chapters and launches you if you ride him; his
speech bubble shows only while you stand on his island), the lighthouse stair, the caves, the mushrooms' stand and the
windmills. Where the island goes is level design's call. The current game's server accepts only the railway's shared
edits, so the island's classic lockstep edits are refused there: throwing things (which is also how seeds are planted
for mushrooms to sprout, and how The Boogler gets presents), picking up the frisbee on the lighthouse deck, and taking
logs from the palms to the work sites. Wagon rides (`?proto=wagon`), rail-fed town growth (`?proto=net`) and long
crossings (`?proto=crossing`) remain flagged prototypes.

It runs on desktop (keyboard and mouse, pointer lock), touch screens (virtual stick and buttons) and a Backbone-style
gamepad (W3C standard mapping, aimed at iPhone and iPad). Our server hosts every room over WebSocket, runs its
lockstep world and saves its snapshots (section 8). Live at
**https://boogle.club/** (`?room=<name>` picks a room; default `boogle`).

## 2. Pillars

The principles are in [DESIGN.md](../DESIGN.md); read it there. In one line each:

| #   | Principle                                | What it means in practice today                                                                       |
| --- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 2   | Physics toys are optional fun            | The beach ball, frisbee and mushroom bounces are optional.                                            |
| 3   | Side activities are never required       | Mushrooms are optional; nothing is gated on them.                                                     |
| 6   | Communal world, personal rewards         | Work sites are shared; what you hold and The Boogler's conversation memories are per player.          |
| 7   | Telegraph everything                     | Interact prompts, ping markers and work-site rings show what can be done and what is being built.     |
| 8   | Enjoyable alone and together            | Solo play and shared progression with friends; drop-in onboarding is a secondary consideration. |
| 9   | Leave something for the next visitor     | Railway accounts, builds and delivered materials persist in server snapshots.                                 |
| 10  | Slapstick over precision                 | Face-plants, flops, sail bonks, Boogler launches.                                                     |

Technical principles (sync kinds, determinism, sync edits not state, clear authority, server hosts every room,
understandable at a glance, small and readable, code first, images by approval) are in the same file, and section 8 maps every feature to its kind.

## 3. [The island](game-design/island.md)

## 4. [Player](game-design/player.md)

## 5. [Controls](game-design/controls.md)

## 6. Systems

Sync kinds are defined in [DESIGN.md](../DESIGN.md), "Pick how each feature shares state". "Tick" means a lockstep
tick of 100 ms (10 per second).

- [6.1 Beach ball](game-design/ball.md)
- [Dev-only Sickle Isles review rides](game-design/sickle-greybox.md)
- [6.4 Mushrooms and the seed stand](game-design/mushrooms.md)
- [6.5 Gifts](game-design/gifts.md)
- [6.6 What you hold](game-design/held.md)
- [6.7 Throwing and flight](game-design/throwing.md)
- [6.8 The Boogler](game-design/boogler.md)
- [6.9 Social: honk and ping](game-design/social.md)
- [6.10 Critters](game-design/critters.md)
- [6.11 Sky and time of day](game-design/day-night.md)
- [6.12 Caves](game-design/caves.md)
- [6.13 Pause view and controls guide](game-design/pause.md)
- [6.14 Arrival](game-design/first-run.md)
- [6.15 Telemetry and updates](game-design/telemetry-and-updates.md)
- [6.16 Talking to NPCs](game-design/npcs.md)
- [6.17 The dino and the guest](game-design/dino-and-guest.md)
- [6.18 Graphics and devices](game-design/graphics.md)
- [6.19 Haul: piles, the stack, sources and work sites](game-design/haul.md)
- [6.20 Prototype: soapbox (`?proto=soapbox`)](game-design/soapbox.md)
- [6.21 Prototype: mini-game toys (`?proto=minis`)](game-design/minis.md)
- 6.22 Prototype: departures board (archived, tag `archive/board`)
- 6.23 Prototype: the groove (archived, tag `archive/groove`)
- [6.24 Identity: name and colour](game-design/identity.md)
- [6.25 HUD feedback: sounds, motion, notices](game-design/hud.md)
- [6.26 Prototype: the long crossing (`?proto=crossing`)](game-design/crossing.md)
- [6.26b Water](game-design/water.md)
- [6.27 Prototype: the line feeds the town (`?proto=net`)](game-design/net.md)
- [6.28 Prototype: a real place (`?proto=place`, deleted; the live game's record)](game-design/place.md)
- [6.29 Prototype: procedural sky (`?proto=sky`)](game-design/sky-proto.md)
- [6.30 Dev menu (`?dev=1`)](game-design/dev-menu.md)

## 7. Content inventory

- [7.1 Items (gift catalog)](game-design/items.md)
- [7.2 The Boogler's lore and chapters](game-design/boogler-lore.md)
- [7.3 POIs](game-design/pois.md)

## 8. [Multiplayer and persistence](game-design/multiplayer.md)

## 9. [Tech and tooling](game-design/tech.md)

- [Asset and animation stage](game-design/asset-stage.md)

## 10. [Status](game-design/status.md)

## 11. [Glossary](game-design/glossary.md)

## 12. [Doc and code mismatches found while writing this](game-design/mismatches.md)
