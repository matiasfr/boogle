# Boogle design principles

Boogle is a shared world for a handful of friends: you connect an archipelago by rail, and it grows because of what you connect. Toys to throw and bounce are there to mess with along the way.

These principles decide arguments. If a feature idea conflicts with one of them, either the idea changes or we change the principle here on purpose, with a reason. [docs/decisions.md](docs/decisions.md) records where the game is heading, and its decisions win over anything older; this file says *how we decide*. The research behind the rail loop is in [docs/research/compounding-infrastructure.md](docs/research/compounding-infrastructure.md), [rail-as-play.md](docs/research/rail-as-play.md) and [vast-world-scale.md](docs/research/vast-world-scale.md).

## The core loop

**The rail builds the world.** Connecting a resource camp by rail puts its goods on the line automatically, with no routing or quotas. Junctions unlock parts of the network, and you still haul for each track segment, with the network bringing materials closer. Towns grow from what arrives, and grown towns give upgrades that extend your reach, so each connection makes the next one easier. Friends can ride what others built; alone, you build to progress. The rail is one guided line that closes into a ring: the room always knows where the work is, and anything a player gives at any station counts toward it. Choice and hanging out live in the towns, where every building adds something to do (owner, 27 November: [course change](docs/decisions-core-loop.md#d-2026-11-27-course-change)). This is the working direction, being proven in prototypes ([docs/plans/find-the-fun.md](docs/archive/plans/find-the-fun.md), steps 6 and 7); its details stay open until they're fun.

The ball, the frisbee and the other physics toys are optional fun, not the heart of the game. Farming and water aren't part of the core loop: the shared water sim and sand shaping are gone, crops were never built, mushrooms are a one-press toy (no planting or watering), and the sea is scenery you can swim in.

## Play principles

Principles 1 (Toys before chores) and 4 (Cooperation is automatic, not negotiated) were retired by the owner on 7 November as the vision changed. Their numbers stay unused; references in older plans and research are historical, not design constraints. Goals, rewards or deliberate coordination are not grounds to reject a mechanic under those retired principles.

### 2. Physics toys are optional fun
Things you can throw, bounce and knock over make the world fun to be in: the beach ball, the frisbee, whatever you pick up, the mushrooms you bounce on. They're optional, and nothing depends on them. New systems can leave them alone.
- *Test:* does this break a toy that's already there? (The ball never produces income.)

### 3. Side activities are never required
Toys, mini-games and any farming are invitations, never gates.
- *Avoid:* locking progress, movement or areas behind a side activity.

### 6. Communal world, personal things
The world, its network, its progression and its wallet belong to everyone: what connected places sell goes into one wallet anyone may spend, and every upgrade and ability applies to everyone. Personal finds (secret crates, some cosmetics) stay yours.

### 7. Telegraph everything
Make the next connection and its payoff visible in the world. Announce consequential changes before they happen, and choose the warning length for the event rather than imposing a universal countdown. Players should understand the shared goal through playing and reading the world.

### 8. Enjoyable alone and together
Build for satisfying solo play and shared progression with friends. Tune for 1–3 people and tolerate 4. A friend who drops in, at any point in the room's story, can do something that advances the room within two minutes and can tell what the room is building, without being led. They need not understand everything at once. Joining, leaving, reconnecting and saving must remain reliable.
- *Test:* could a guest who has read nothing help from where they landed?

Changed on 27 November 2026 ([course change](docs/decisions-core-loop.md#d-2026-11-27-course-change)). From 7 November drop-in play was "a secondary consideration" and late-arrival onboarding was not a milestone. The playtests since show guests enjoy dropping in more than anything else in the game and cannot find the progression, so the guest comes first again.

### 9. Leave something for the next visitor
Progress persists between sessions. An empty world is paused; returning players find producers' yards topped up for the time away, with a soft cap.

### 10. Slapstick over precision
Loose physics, splashes and tumbling toys are features. Prefer mechanics that produce funny moments between players over ones that reward precise execution.

### 11. Show, don't tell
The world and how its things relate should explain what's happening. The train moving says the logs went in; no note needs to. Use helper text sparingly: reaching for it usually means the world is unclear, so fix the world first. What's on screen is true, including what you're holding.

One thing is always shown, in the world and not as text over play: where the room's work is, what it needs and what it gives (a signal at the works and a board at every station). Changed on 27 November 2026 ([course change](docs/decisions-core-loop.md#d-2026-11-27-course-change)): a wordless world carried single steps, but not a forty-step route that a guest joins in the middle.

## Technical principles

### Pick how each feature shares state

Every feature puts each piece of its state in one of three kinds. Use the cheapest kind that works:

| Kind | Use when | Who computes it | Math | Today |
| --- | --- | --- | --- | --- |
| **Local** | Nobody else needs the result, or it only decorates | Each tab | Anything, including `Math.random()` and the GPU | Particles, ripples, sounds, camera shake, personal conversation memory |
| **Owner** | One player drives it, or local physics moves it | The owner's tab; others smooth its broadcast pose. Shared physical ownership changes hands by epoch | Anything, including Rapier and three.js math | Player movement, seat pose, the beach ball |
| **Server** | A shared outcome needs one authority, whether transient or saved | The room server accepts authenticated commands, applies rules and publishes replicas. Clients render replicas and may predict declared actions | Deterministic rules for replay and shared prediction; presentation stays separate | Railway, roster, rail tuning, seats, The Boogler's legs and accepted reactions |

In code: Local needs no shared API. Owner uses `addPresenceField` and `onRemotePresence` in `src/netplay/net.ts`, plus `createOwnerSync` for a physical object that changes hands. Presence goes out at 20 Hz, latest value wins; keep fields small and smooth poses with `createSnaps`. Server commands use `ops.define` on the server and the command adapter on the client. Complete replicated mirrors drive views. Saved Server state uses `registerState(..., { server: true })`; transient seats are not saved. No tab leads the room, and clients never execute authoritative shared ticks or save room state.

One-off cosmetic events such as honks and pings use `room.send` and `room.onMessage`, reliable and ordered to every other peer, with validation and rate limits. An accepted shared outcome such as a Boogler present or puff uses a server command and replicated event; declared local prediction plays on the press and never repeats on confirmation. Queuing a command is not acceptance.

- **Physics stays Owner.** A physical thing can read Server state and request a shared change through a command. The server owns the accepted result; the client owns its immediate declared prediction.
- **Shared persistent state is Server.** Verified checkpoints preserve it across departures and restarts. Roster and tune commits acknowledge only after storage; ordinary checkpoints normally run every two seconds and on close, so non-durable actions may roll back within that window. A failed-load fallback never overwrites the last good checkpoint. Personal conversation memory stays localStorage.
- **Shared schedules derive from replicated facts and the room clock.** Clients compute continuous poses from accepted start ticks and legs; they do not elect a tab to advance them.
- **The scene graph is a view.** Render from state and never read shared authority back out of a mesh.
- **Prototype pages are temporary.** Effective prototypes keep Local unarbitrated seats and a per-tab Boogler. The retired `?proto=place` alias remains the production game.

### Determinism from day one
Server replay and declared shared prediction use deterministic rules and fixed ordering. Conserved quantities remain integers. The current conservative math guard remains on pure rules and prediction dependencies; local cosmetics and the server-only Boogler brain do not feed client authority. The rules:
- conserved quantities are integers (item counts and ids), so totals stay exact and snapshots stay small;
- other values may be floats if they only use `+ - * /` and `Math.sqrt`, which give the same bits in every browser. Never `Math.sin`, `cos`, `pow` (or `**`), `exp`, `log`, `atan2` or `hypot` (browsers round them differently): use a lookup table or our own polynomial. three.js math (`Vector3`, `Quaternion`, `Euler`, `Matrix4`, `MathUtils`) and the physics engine call those internally, so lockstep logic lives in three.js-free modules (`src/sim/`) and the rendering side adapts it. Keep `NaN` and `-0` out of state (JSON turns them into `null` and `0`) and hash floats by their bits;
- fixed update order and a fixed tick rate;
- seeded randomness ([`mulberry32`](src/sim/rng.ts)), never `Math.random()` in shared logic;
- events (shared schedules) are a pure function of tick + seed.

### Commands and replicas
Clients request shared changes through small authenticated commands. The server validates and applies them in arrival order, then publishes changed components, receipts and accepted events. Clients read complete mirrors; optional declared prediction reconciles with the server. They do not replay a classic edit stream or compare shared-state hashes. Owner presence publishes current values.

### Clear authority

| Thing | Authority |
| --- | --- |
| Your player's movement and seat pose | Your client, published as Owner presence |
| The beach ball | Its current owner, with the epoch rule in `src/netplay/owner-sync.ts` |
| Railway outcomes, roster and rail tuning | The server, through authenticated commands and complete replicas |
| Seat occupancy | The server; one transient seat per player, predicted locally on the press and reconciled with receipts/rows |
| The Boogler's movement, mode and accepted present/puff reactions | The server; clients draw continuous legs and predict their own reaction effects |
| The Boogler's conversation memory, talk UI, ride timer/launch and personal held items | Your client; no dialogue text is sent by the server |
| Room persistence | The server, through verified checkpoints; seats and reaction events remain transient, while The Boogler's position/facing are saved |
| Prototype seats and Boogler | Each tab independently; no shared arbitration or server command session for these features |

### Server hosts every room
Every room is hosted by our server over WebSocket: it runs shared rules and the room clock headless, accepts authenticated commands and publishes replicas, relays presence and messages, and saves to its own disk, so the island never waits for a host; an empty room pauses until the next join. There is no peer-hosted fallback: when the server is unreachable, tabs reconnect and play alone meanwhile. Local dev runs the same server. The game talks only to the room interface in [`src/net/README.md`](src/net/README.md), never to the WebSocket directly. Plan: [docs/plans/server-host.md](docs/plans/server-host.md). (Changed 2026-10-31 from "PeerJS only" and 2026-11-06 to pause empty rooms: [why](docs/research/shared-state-at-scale.md), [next](docs/plans/net-roadmap.md).)

### Understandable at a glance
Boogle is built by a handful of friends and their agents shipping at once, so how it fits together has to be something you can see, not only read. The atlas ([boogle.club/atlas](https://boogle.club/atlas)) is our internal map: one picture of the pieces, stories that follow a single action through them, and code views underneath. It's a tool for the people and agents building Boogle, never part of the game. Facts in it come from the code on every build; the explanations live in `docs/atlas/` and a daily agent keeps them current, so a stale explanation is that agent's chore, never a red build. A new way of sharing state, or a big feature, comes with a story. Internal tools like this may use a library the game doesn't (the atlas draws with d3), as long as it never reaches the game bundle.

### Small and readable
This is a friends' project. Prefer plain modules, few dependencies and code someone can read in one sitting. Everything is TypeScript (`strict`): types are how many people and agents change shared code at once without breaking each other's wire messages and state shapes, and Vite and Node run it as written, with no build step of ours. Measure before optimizing; when you do optimize the sim, sleep settled regions (active-cell lists) before reaching for workers or the GPU.

### Code first, images by approval
Build shapes, materials and effects in code first: an agent can make and change them in minutes, which is what prototyping needs. Once a thing has proved itself in play, a generated image may replace or dress it (an icon, a billboard, a decal, a tileable texture, a matcap) if it looks better. A person picks every shipped image from a contact sheet (`/concept-art`); agents draft them, but they never ship one nobody approved. Images from one set share a style prompt, so they read as one world next to the code-built ones. The prompts file for every shipped image is committed, so it can be regenerated. Each image is downscaled to the size it is drawn at, kept small (aim under 100 KB), and imported by the feature that uses it, so Vite hashes it. Reference sheets and concept art stay references.

## How we work

- **Playtest constantly, solo and co-op alongside each other.** Evaluate satisfying solo play and meaningful cooperation together, rather than requiring a solo verdict before considering co-op quality. Judge the project from its goal through the work, coordination, payoff and changed capabilities; each action need not sustain interest without that context. Solo support remains required, but its approach need not be identical to the group's. Specific mechanic changes still need their own design scope. This replaces "solo first" by owner agreement on 7 November. Iterate in small steps and play each change on the live site; changes reach `main` through checked PRs (`npm run ship`). Record playtest questions in the owning plan and findings in `docs/playtests.md`.
- **Light tests, real playtests.** Automated tests guard determinism, sync and conservation, and stay fast enough to run before every push; fun and feel are judged by playing.
- **Every feature says which principle it serves**, and calls out any principle it bends.
- **Changing a principle is a commit to this file**, with the reason.
