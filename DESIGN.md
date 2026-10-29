# Boogle design principles

Boogle is a drop-in island for a handful of friends: one beach ball, sand you can shape, water that flows where you let it, and a shared garden that keeps growing while nobody is online.

These principles decide arguments. If a feature idea conflicts with one of them, either the idea changes or we change the principle here on purpose, with a reason. [PLAN.md](PLAN.md) says *what* we're building next; this file says *how we decide*. The evidence behind these principles (precedents from Townscaper, Animal Crossing, Timberborn, From Dust, Noita, Factorio and others, plus a ranked idea list) is in [docs/research/water-farming-multiplayer.md](docs/research/water-farming-multiplayer.md).

## The core loop

**Water is the glue between the ball and the farm.** Players dig channels and pile sand to steer water. Crops grow where the soil is wet. The tide is the shared threat. The ball floats, splashes, waters and knocks down walls. The garden persists, so the next visitor finds what the last one left.

## Play principles

### 1. Toys before chores
Every system must be fun to mess with before it has goals. Dig, pile, splash and throw should feel good with nothing to achieve. If a mechanic is only fun because of its reward, it isn't ready.
- *Test:* would someone fiddle with this for a minute with no score, no crops and no tide?
- *Avoid:* scores, timers or quotas as the reason to do something.

### 2. The ball stays the star
The beach ball is the first toy everyone understands. New systems should give it more to do (float, splash, water plants, break walls, launch harvests), never compete with it or put it away.
- *Test:* does this feature make the ball more interesting, or at least leave it alone?

### 3. Farming is never required
Someone who only wants to throw the ball around should have a great time. Farming, building and tide defense are invitations, never gates.
- *Avoid:* locking movement, areas or ball features behind farming progress.

### 4. Cooperation is automatic, not negotiated
Helping should happen just by playing near each other: watering anyone's plant helps it, and more different visitors make the garden grow faster. Nobody should need to coordinate in chat to contribute.
- *Prefer:* bonuses for *different* people helping over bonuses for one person grinding.

### 5. Only the world is the antagonist
Players can't destroy what other players made. Threats come from the environment: tide, drought, salt water. Sand walls can be knocked down because they're meant to be rebuilt, but crops and other people's progress are protected.
- *Avoid:* PvP crop destruction, stealing, griefable shared resources.

### 6. Communal world, personal rewards
The island and garden belong to everyone. Anything you *earn* (cosmetics, ball skins, hats, seed types) is yours alone. No shared wallets, so nobody spends what someone else earned.

### 7. Telegraph everything
Every environmental event is announced 30–60 seconds ahead with something you can *see* (a wave on the horizon, clouds rolling in), not only a HUD message. A player who just dropped in should immediately understand the shared goal.

### 8. Designed for drop-in, drop-out
Assume 1–6 people who arrive and leave at random. Nothing should need a full lobby, a start button or a minimum player count. Being alone on the island should still be pleasant; being joined should make it better.

### 9. Leave something for the next visitor
Progress persists between sessions. Growth is computed from elapsed time, so the garden changes while everyone is away. Returning players should notice what happened since they left.

### 10. Slapstick over precision
Loose physics, splashes and collapsing sand walls are features. Prefer mechanics that produce funny moments between players over ones that reward precise execution.

## Technical principles

### Determinism from day one
Anything simulated and shared (water, terrain edits, crops, weather, tide) must produce bit-identical results on every machine:
- integer quantities (water as 0–255 units per cell, not floats);
- fixed update order and a fixed tick rate;
- seeded randomness ([`mulberry32`](src/sim/rng.js)) and integer hashing for noise, never `Math.random()` in shared logic;
- events (tide, weather) are a pure function of tick + seed.

Cosmetic-only effects (ripples, particles, splashes) can use floats and the GPU and don't need to match across machines. Keep the two layers separate.

### Sync edits, not state
Clients send small **edit events** (dig, pile, plant, harvest, splash) over the reliable channel. The host stamps them with a tick and broadcasts them; everyone applies them to the same deterministic sim. Bulk state only travels as periodic host snapshots (with a hash) for late joiners and desync recovery.

### Clear authority
| Thing | Authority |
|---|---|
| Your player's movement | You (client) |
| The beach ball | Its current owner (epoch rule in [`src/ball.js`](src/ball.js)) |
| Water, terrain edits, garden, weather | The host peer |
| The Boogler (wandering NPC) | The host peer, published in its presence ([`src/boogler.js`](src/boogler.js)) |
| Your friendship with The Boogler, your pocket | You (client), kept in localStorage ([`src/boogler-play.js`](src/boogler-play.js)) |
| Persistence (snapshots) | The host, saved to our server |

### PeerJS only
Networking is PeerJS with one browser acting as host (see PLAN.md, "Key decision"). There are no alternate transports and no claude.ai artifact build. Keep the game talking to the small room interface in [`src/net/README.md`](src/net/README.md), never to PeerJS directly.

### Small and readable
This is a friends' project. Prefer plain modules, few dependencies and code someone can read in one sitting. Measure before optimizing; when you do optimize the sim, sleep settled regions (active-cell lists) before reaching for workers or the GPU.

## How we work

- **Playtest constantly with 2–4 real people.** We iterate in small steps straight on `main` and play each change on the live site. Each phase in PLAN.md ends with the question the playtests should answer; note what happened in `docs/playtests.md`.
- **Light tests, real playtests.** Automated tests guard determinism, sync and conservation, and stay fast enough to run before every push; fun and feel are judged by playing.
- **Every feature says which principle it serves**, and calls out any principle it bends.
- **Changing a principle is a commit to this file**, with the reason.
