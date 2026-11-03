# Boogle: game design document (as built)

*It describes what exists on `main` today, not what is planned, and is kept current by the rule in
[AGENTS.md](../AGENTS.md) (player-facing changes update their file in [game-design/](game-design/) in the same commit). Every number is read from the code or the docs it links. Where the code does not say,
the doc says "unclear from code". Current design lives in [DESIGN.md](../DESIGN.md) and the
[decision log](proposals/boogle-2.md); prototype work is in [find-the-fun.md](plans/find-the-fun.md), engineering work
in [tech-plan.md](tech-plan.md). Undecided ideas live in [proposals/](proposals/README.md) and are only linked as "related ideas".*

This page is the index: sections 1 and 2 are here, everything else has one file per section or system, so changes to
different systems don't touch the same file. A new system adds its file and one line below.

---

## 1. Overview

Boogle is a drop-in browser island for up to 8 friends. On your first visit you pick a name and a colour, press "Jump in", and land next to a
sand volleyball court, among the island's toys: a shared beach ball, a frisbee, things to throw, mushrooms to bounce on
and The Boogler. Returning players go straight in with their saved identity. In the base game you can throw and chase the ball;
throw things at each other; take a bag of seeds from the stand and bounce on the mushrooms it sprouts; befriend The Boogler, a purple
blob NPC from Samarqand who wanders the island, talks in chapters, takes presents and launches you if you ride him;
honk and ping to friends; climb the lighthouse for the frisbee; walk through the caves; take logs from bundles at the palms and
carry them on your back to work sites that lay a short railway (the 0.1 testbed, placeholder visuals).
Wagon rides (`?proto=wagon`), rail-fed town growth (`?proto=net`) and long crossings
(`?proto=crossing`) are flagged prototypes, not the base game's progression loop.

It runs on desktop (keyboard and mouse, pointer lock), touch screens (virtual stick and buttons) and a Backbone-style
gamepad (W3C standard mapping, aimed at iPhone and iPad). Our server hosts every room over WebSocket, runs its
lockstep world and saves its snapshots (section 8). Live at
**https://boogle.club/** (`?room=<name>` picks an island, default `beach`).

## 2. Pillars

The principles are in [DESIGN.md](../DESIGN.md); read it there. In one line each:

| # | Principle | What it means in practice today |
|---|---|---|
| 1 | Toys before chores | Ball, throwing and The Boogler have no score. |
| 2 | Physics toys are optional fun | The beach ball, frisbee and mushroom bounces are optional. |
| 3 | Side activities are never required | Mushrooms are optional; nothing is gated on them. |
| 4 | Cooperation is automatic, not negotiated | Anyone can stock the same work site; nearby honks harmonize. |
| 6 | Communal world, personal rewards | Work sites are shared; what you hold and Boogler friendship are per player. |
| 7 | Telegraph everything | Interact prompts, ping markers and work-site rings show what can be done and what is being built. |
| 8 | Designed for drop-in, drop-out | Solo play and joining an existing room need no group start; returning players skip the identity card. |
| 9 | Leave something for the next visitor | Items, piles, haul stacks and work sites persist in server snapshots. |
| 10 | Slapstick over precision | Face-plants, flops, sail bonks, Boogler launches. |

Technical principles (sync kinds, determinism, sync edits not state, clear authority, server hosts every room,
understandable at a glance, small and readable, code first, images by approval) are in the same file, and section 8 maps every feature to its kind.

## 3. [The island](game-design/island.md)

## 4. [Player](game-design/player.md)

## 5. [Controls](game-design/controls.md)

## 6. Systems

Sync kinds are defined in [DESIGN.md](../DESIGN.md), "Pick how each feature shares state". "Tick" means a lockstep
tick of 100 ms (10 per second).

- [6.1 Beach ball](game-design/ball.md)
- [6.4 Mushrooms and the seed stand](game-design/mushrooms.md)
- [6.5 Gifts](game-design/gifts.md)
- [6.6 What you hold](game-design/held.md)
- [6.7 Throwing and flight](game-design/throwing.md)
- [6.8 The Boogler](game-design/boogler.md)
- [6.9 Social: honk and ping](game-design/social.md)
- [6.10 Critters](game-design/critters.md)
- [6.11 Day and night](game-design/day-night.md)
- [6.12 Caves](game-design/caves.md)
- [6.13 Pause view and controls guide](game-design/pause.md)
- [6.14 Arrival and the first-run card](game-design/first-run.md)
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
- [6.26b Prototype: Ultra Water in our renderer (`?proto=water`)](game-design/water-proto.md)
- [6.27 Prototype: the line feeds the town (`?proto=net`)](game-design/net.md)
- [6.28 Prototype: a real place (`?proto=place`)](game-design/place.md)
- [6.29 Prototype: procedural sky (`?proto=sky`)](game-design/sky-proto.md)
## 7. Content inventory

- [7.1 Items (gift catalog)](game-design/items.md)
- [7.2 The Boogler's lore and chapters](game-design/boogler-lore.md)
- [7.3 POIs](game-design/pois.md)
## 8. [Multiplayer and persistence](game-design/multiplayer.md)

## 9. [Tech and tooling](game-design/tech.md)

## 10. [Status](game-design/status.md)

## 11. [Glossary](game-design/glossary.md)

## 12. [Doc and code mismatches found while writing this](game-design/mismatches.md)
