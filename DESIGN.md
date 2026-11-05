# Boogle design principles

Boogle is a drop-in world for a handful of friends: you connect an archipelago by rail, and it grows because of what you connect. Toys to throw and bounce are there to mess with along the way.

These principles decide arguments. If a feature idea conflicts with one of them, either the idea changes or we change the principle here on purpose, with a reason. [docs/proposals/boogle-2.md](docs/proposals/boogle-2.md) records where the game is heading, and its decisions win over anything older; this file says *how we decide*. The research behind the rail loop is in [docs/research/compounding-infrastructure.md](docs/research/compounding-infrastructure.md), [rail-as-play.md](docs/research/rail-as-play.md) and [vast-world-scale.md](docs/research/vast-world-scale.md).

## The core loop

**The rail builds the world.** Connecting a resource camp by rail puts its goods on the line automatically, with no routing or quotas. Junctions unlock parts of the network, and you still haul for each track segment, with the network bringing materials closer. Towns grow from what arrives, and grown towns give upgrades that extend your reach, so each connection makes the next one easier. Friends can ride what others built; alone, you build to progress. This is the working direction, being proven in prototypes ([docs/plans/find-the-fun.md](docs/plans/find-the-fun.md), steps 6 and 7); its details stay open until they're fun.

The ball, the frisbee and the other physics toys are optional fun, not the heart of the game. Farming and water aren't part of the core loop: the shared water sim and sand shaping are gone, crops were never built, mushrooms are a one-press toy (no planting or watering), and the sea is scenery you can swim in.

## Play principles

### 1. Toys before chores
Every system must be fun to mess with before it has goals. Laying track, riding and throwing should feel good with nothing to achieve. If a mechanic is only fun because of its reward, it isn't ready.
- *Test:* would someone fiddle with this for a minute with no score and no quota?
- *Avoid:* scores, timers or quotas as the reason to do something.

### 2. Physics toys are optional fun
Things you can throw, bounce and knock over make the world fun to be in: the beach ball, the frisbee, whatever you pick up, the mushrooms you bounce on. They're optional, and nothing depends on them. New systems can leave them alone.
- *Test:* does this break a toy that's already there? (The ball never produces income.)

### 3. Side activities are never required
Toys, mini-games and any farming are invitations, never gates.
- *Avoid:* locking progress, movement or areas behind a side activity.

### 4. Cooperation is automatic, not negotiated
Helping should happen just by playing near each other: anyone's work on the line helps everyone. Nobody should need to coordinate in chat to contribute.
- *Prefer:* bonuses for *different* people helping over bonuses for one person grinding.

### 6. Communal world, personal rewards
The world and its network belong to everyone. Anything you *earn* (cosmetics, hats) is yours alone. No shared wallets, so nobody spends what someone else earned.

### 7. Telegraph everything
Make the next connection and its payoff visible in the world. Announce consequential changes before they happen, and choose the warning length for the event rather than imposing a universal countdown. A player who just dropped in should immediately understand the shared goal.

### 8. Designed for drop-in, drop-out
Assume 1–6 people who arrive and leave at random. Nothing should need a full lobby, a start button or a minimum player count. Being alone should still be pleasant; being joined should make it better.

### 9. Leave something for the next visitor
Progress persists between sessions, and the world can keep changing while everyone is away. Returning players should notice what happened since they left.

### 10. Slapstick over precision
Loose physics, splashes and tumbling toys are features. Prefer mechanics that produce funny moments between players over ones that reward precise execution.

### 11. Show, don't tell
The world and how its things relate should explain what's happening. The train moving says the logs went in; no note needs to. Use helper text sparingly: reaching for it usually means the world is unclear, so fix the world first. What's on screen is true, including what you're holding.

## Technical principles

### Pick how each feature shares state
Every feature, including ones we haven't thought of yet, puts each piece of its state in one of four kinds. Use the cheapest kind that works:

| Kind | Use when | Who computes it | Math | Today |
|---|---|---|---|---|
| **Local** | Nobody else needs to see it, or it only decorates | Each tab | Anything, including `Math.random()` and the GPU | Particles, ripples, sounds, camera shake |
| **Owner** | One player drives it, or physics moves it | The owner's tab; others smooth its broadcast pose. Ownership changes hands by epoch | Anything (Rapier physics, three.js math) | Your avatar, the beach ball |
| **Host** | Shared, small (a few dozen numbers), changes over time | The lead tab (the server picks it); it broadcasts the values (presence or messages) and clients interpolate | Anything | The Boogler |
| **Lockstep** | Shared and big (a grid or many cells), changes in many places at once, often persists | Every tab, from server-stamped edits | Deterministic (below) | Mushrooms, gifts |

In code: Local needs nothing; Owner is `addPresenceField` + `onRemotePresence` (plus [`createOwnerSync`](src/netplay/owner-sync.ts) for one object that changes hands) and Host is `addHostField` (both in [`src/netplay/net.ts`](src/netplay/net.ts)); Lockstep is `submitEdit` + `onApplied`/`onSnapshot` for features, with the rules registered through `registerOp`, `registerState` and `onTick` ([`src/world/sync.ts`](src/world/sync.ts)). One-off events (a honk, a ping) are not state: send them as messages with `net.room.send` and receive them through `onRoomReady(room => room.onMessage(...))`, reliable and ordered, reaching every other peer (see [`src/net/README.md`](src/net/README.md)); presence fields are for state that has a current value. Owner and Host values ride one presence packet per player at 20 Hz (`SEND_MS`), latest value wins, so keep each field to a few numbers; smooth them with [`createSnaps`](src/netplay/snaps.ts). Lockstep ticks at 10 Hz, compares hashes every 2 s, and the server saves it.

- **Physics is never lockstep.** Our physics (and three.js math) isn't kept bit-identical across browsers. A physical thing is Owner or Host; it can read lockstep state (a player bounces on a mushroom) and change it only by submitting edits (stocking a work site).
- **Crossing kinds goes through edits.** A thrown thing landing (each tab replays the flight as Local, the thrower submits where it landed): the actor submits an edit and the lockstep sim applies it.
- **Shared state that should survive everyone leaving** is Lockstep: snapshots save it through `registerState`, which also hashes it, so it must match on every tab. Host values restart with whoever leads next. Your own things (The Boogler's memory of your conversations) are yours, kept in localStorage; what you hold is yours too, for the visit.
- **Shared schedules are Lockstep without state:** a pure function of tick + seed that every tab computes, so they cost no bandwidth and need no snapshot. Their visuals read the same function. The [wagon prototype's timetable](src/sim/wagon.ts) needs no seed: it derives its pose from tick, laid sections and timetable settings, without storing a pose.
- **The scene graph is a view.** three.js objects are updated from state (lockstep ticks run at 10/s and rendering interpolates between them); never read game state back out of a mesh.

### Determinism from day one
Lockstep state must produce bit-identical results on every machine:
- conserved quantities are integers (item counts and ids), so totals stay exact and snapshots stay small;
- other values may be floats if they only use `+ - * /` and `Math.sqrt`, which give the same bits in every browser. Never `Math.sin`, `cos`, `pow` (or `**`), `exp`, `log`, `atan2` or `hypot` (browsers round them differently): use a lookup table or our own polynomial. three.js math (`Vector3`, `Quaternion`, `Euler`, `Matrix4`, `MathUtils`) and the physics engine call those internally, so lockstep logic lives in three.js-free modules (`src/sim/`) and the rendering side adapts it. Keep `NaN` and `-0` out of state (JSON turns them into `null` and `0`) and hash floats by their bits;
- fixed update order and a fixed tick rate;
- seeded randomness ([`mulberry32`](src/sim/rng.ts)), never `Math.random()` in shared logic;
- events (shared schedules) are a pure function of tick + seed.

### Sync edits, not state
For lockstep systems, clients send small **edit events** (plant or water a mushroom, toss or take a gift, stock a work site) over the reliable channel. The server stamps them with a tick and broadcasts them; everyone applies them to the same deterministic sim. Bulk state only travels as server snapshots (with a hash) for late joiners and desync recovery. Owner and Host state send the values themselves.

### Clear authority
| Thing | Authority |
|---|---|
| Your player's movement | You (client) |
| The beach ball | Its current owner (epoch rule in [`src/netplay/owner-sync.ts`](src/netplay/owner-sync.ts)) |
| Mushrooms, gifts, work sites | The server |
| The Boogler (wandering NPC) | The lead tab (the server picks it), published in its presence ([`src/boogler/boogler.ts`](src/boogler/boogler.ts)) |
| The Boogler's memory of you; what you hold | You (client): conversations and comic grudges kept in localStorage ([`src/boogler/play.ts`](src/boogler/play.ts)); what you hold for the visit ([`src/player/inventory.ts`](src/player/inventory.ts)) |
| Persistence (snapshots) | The server writes each room to its disk (every 2 s when it changed, every 30 s and on shutdown regardless) and starts a room from that save; tabs keep no copy |

### Server hosts every room
Every room is hosted by our server over WebSocket: it runs the lockstep world headless, relays presence and messages, and saves to its own disk, so the island never waits for a host and ticks while nobody is online. There is no peer-hosted fallback: when the server is unreachable, tabs reconnect and play alone meanwhile. Local dev runs the same server. The game talks only to the room interface in [`src/net/README.md`](src/net/README.md), never to the WebSocket directly. Plan: [docs/plans/server-host.md](docs/plans/server-host.md). (Changed on purpose 2026-10-31, from "PeerJS only": a host that never leaves, and the start of sending each player only the world near them; [docs/research/shared-state-at-scale.md](docs/research/shared-state-at-scale.md). Made a full switchover the same day: one networking model, not two. Where it goes next: [docs/plans/net-roadmap.md](docs/plans/net-roadmap.md).)

### Understandable at a glance
Boogle is built by a handful of friends and their agents shipping at once, so how it fits together has to be something you can see, not only read. The atlas ([boogle.club/atlas](https://boogle.club/atlas)) is our internal map: one picture of the pieces, stories that follow a single action through them, and code views underneath. It's a tool for the people and agents building Boogle, never part of the game. Facts in it come from the code on every build; the explanations live in `docs/atlas/` and a daily agent keeps them current, so a stale explanation is that agent's chore, never a red build. A new way of sharing state, or a big feature, comes with a story. Internal tools like this may use a library the game doesn't (the atlas draws with d3), as long as it never reaches the game bundle.

### Small and readable
This is a friends' project. Prefer plain modules, few dependencies and code someone can read in one sitting. Everything is TypeScript (`strict`): types are how many people and agents change shared code at once without breaking each other's wire messages and state shapes, and Vite and Node run it as written, with no build step of ours. Measure before optimizing; when you do optimize the sim, sleep settled regions (active-cell lists) before reaching for workers or the GPU.

### Code first, images by approval
Build shapes, materials and effects in code first: an agent can make and change them in minutes, which is what prototyping needs. Once a thing has proved itself in play, a generated image may replace or dress it (an icon, a billboard, a decal, a tileable texture, a matcap) if it looks better. A person picks every shipped image from a contact sheet (`/concept-art`); agents draft them, but they never ship one nobody approved. Images from one set share a style prompt, so they read as one world next to the code-built ones. The prompts file for every shipped image is committed, so it can be regenerated. Each image is downscaled to the size it is drawn at, kept small (aim under 100 KB), and imported by the feature that uses it, so Vite hashes it. Reference sheets and concept art stay references.

## How we work

- **Playtest constantly, solo first.** Every prototype must work and be fun for one person on their own; multiplayer builds on top of that. We iterate in small steps and play each change on the live site. Every change reaches `main` through a PR that merges itself when CI is green (`npm run ship`), so iteration stays fast and nothing red goes live. Each prototype in [docs/plans/find-the-fun.md](docs/plans/find-the-fun.md) has a question the playtests should answer; note what happened in `docs/playtests.md`.
- **Light tests, real playtests.** Automated tests guard determinism, sync and conservation, and stay fast enough to run before every push; fun and feel are judged by playing.
- **Every feature says which principle it serves**, and calls out any principle it bends.
- **Changing a principle is a commit to this file**, with the reason.
