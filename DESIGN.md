# Boogle design principles

Boogle is a drop-in island for a handful of friends: toys to throw, bounce and knock over, and a shared garden that keeps growing while nobody is online.

These principles decide arguments. If a feature idea conflicts with one of them, either the idea changes or we change the principle here on purpose, with a reason. [PLAN.md](PLAN.md) says *what* we're building next; this file says *how we decide*. The evidence behind these principles (precedents from Townscaper, Animal Crossing, Timberborn, From Dust, Noita, Factorio and others, plus a ranked idea list) is in [docs/research/water-farming-multiplayer.md](docs/research/water-farming-multiplayer.md).

## The core loop

**Water is the glue between the ball and the farm.** Crops grow where the soil is wet. The tide is the shared threat. The ball floats, splashes and waters. Sand shaping is removed for now (2026-10-30), to clear room around the ball, and so is the shared water sim; the sea stays. The garden persists, so the next visitor finds what the last one left.

## Play principles

### 1. Toys before chores
Every system must be fun to mess with before it has goals. Splash and throw should feel good with nothing to achieve. If a mechanic is only fun because of its reward, it isn't ready.
- *Test:* would someone fiddle with this for a minute with no score, no crops and no tide?
- *Avoid:* scores, timers or quotas as the reason to do something.

### 2. Physics toys first
Things you can throw, bounce and knock over are at the heart of the island: the beach ball, the frisbee, whatever you pick up, the mushrooms you bounce on. New systems should usually add to them or play with them rather than replace them.
- *Test:* does this give the toys something new to do, or at least leave them alone?

### 3. Farming is never required
Someone who only wants to throw things around should have a great time. Farming, building and tide defense are invitations, never gates.
- *Avoid:* locking movement, areas or toys behind farming progress.

### 4. Cooperation is automatic, not negotiated
Helping should happen just by playing near each other: watering anyone's plant helps it, and more different visitors make the garden grow faster. Nobody should need to coordinate in chat to contribute.
- *Prefer:* bonuses for *different* people helping over bonuses for one person grinding.

### 5. Only the world is the antagonist
Players can't destroy what other players made. Threats come from the environment: tide, drought, salt water. Crops and other people's progress are protected.
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
Loose physics, splashes and tumbling toys are features. Prefer mechanics that produce funny moments between players over ones that reward precise execution.

## Technical principles

### Pick how each feature shares state
Every feature, including ones we haven't thought of yet, puts each piece of its state in one of four kinds. Use the cheapest kind that works:

| Kind | Use when | Who computes it | Math | Today |
|---|---|---|---|---|
| **Local** | Nobody else needs to see it, or it only decorates | Each tab | Anything, including `Math.random()` and the GPU | Particles, ripples, sounds, camera shake |
| **Owner** | One player drives it, or physics moves it | The owner's tab; others smooth its broadcast pose. Ownership changes hands by epoch | Anything (Rapier physics, three.js math) | Your avatar, the beach ball |
| **Host** | Shared, small (a few dozen numbers), changes over time | The lead tab (the server picks it); it broadcasts the values (presence or messages) and clients interpolate | Anything | The Boogler |
| **Lockstep** | Shared and big (a grid or many cells), changes in many places at once, often persists | Every tab, from server-stamped edits | Deterministic (below) | Mushrooms, gifts |

In code: Local needs nothing; Owner is `addPresenceField` + `onRemotePresence` and Host is `addHostField` (both in [`src/netplay/net.ts`](src/netplay/net.ts)); Lockstep is `submitEdit` + `onApplied`/`onSnapshot` for features, with the rules registered through `registerOp`, `registerState` and `onTick` ([`src/world/sync.ts`](src/world/sync.ts)). One-off events (a honk, a ping) are not state: send them as messages with `net.room.send` and receive them through `onRoomReady(room => room.onMessage(...))`, reliable and ordered, reaching every other peer (see [`src/net/README.md`](src/net/README.md)); presence fields are for state that has a current value. Owner and Host values ride one presence packet per player at 20 Hz (`SEND_MS`), latest value wins, so keep each field to a few numbers; smooth them with [`createSnaps`](src/netplay/snaps.ts). Lockstep ticks at 10 Hz, compares hashes every 2 s, and the server saves it.

- **Physics is never lockstep.** Our physics (and three.js math) isn't kept bit-identical across browsers. A physical thing is Owner or Host; it can read lockstep state (the ball reads the ground) and change it only by submitting edits (a splash).
- **Crossing kinds goes through edits.** A ball splashing, an NPC planting, a thrown thing landing (each tab replays the flight as Local, the thrower submits where it landed): the actor submits an edit and the lockstep sim applies it.
- **Shared state that should survive everyone leaving** is Lockstep: snapshots save it through `registerState`, which also hashes it, so it must match on every tab. Host values restart with whoever leads next. Your own things (hotbar, friendship with The Boogler) are yours, kept in localStorage.
- **Tide and weather are Lockstep without state:** a pure function of tick + seed that every tab computes, so they cost no bandwidth and need no snapshot. Their visuals read the same function.
- **The scene graph is a view.** three.js objects are updated from state (lockstep ticks run at 10/s and rendering interpolates between them); never read game state back out of a mesh.

### Determinism from day one
Lockstep state must produce bit-identical results on every machine:
- conserved quantities are integers (item counts and ids), so totals stay exact and snapshots stay small;
- other values may be floats if they only use `+ - * /` and `Math.sqrt`, which give the same bits in every browser. Never `Math.sin`, `cos`, `pow` (or `**`), `exp`, `log`, `atan2` or `hypot` (browsers round them differently): use a lookup table or our own polynomial. three.js math (`Vector3`, `Quaternion`, `Euler`, `Matrix4`, `MathUtils`) and the physics engine call those internally, so lockstep logic lives in three.js-free modules (`src/sim/`) and the rendering side adapts it. Keep `NaN` and `-0` out of state (JSON turns them into `null` and `0`) and hash floats by their bits;
- fixed update order and a fixed tick rate;
- seeded randomness ([`mulberry32`](src/sim/rng.ts)), never `Math.random()` in shared logic;
- events (tide, weather) are a pure function of tick + seed.

### Sync edits, not state
For lockstep systems, clients send small **edit events** (plant, water, toss, harvest, splash) over the reliable channel. The server stamps them with a tick and broadcasts them; everyone applies them to the same deterministic sim. Bulk state only travels as server snapshots (with a hash) for late joiners and desync recovery. Owner and Host state send the values themselves.

### Clear authority
| Thing | Authority |
|---|---|
| Your player's movement | You (client) |
| The beach ball | Its current owner (epoch rule in [`src/physics/ball.ts`](src/physics/ball.ts)) |
| Garden, gifts, weather | The server |
| The Boogler (wandering NPC) | The lead tab (the server picks it), published in its presence ([`src/boogler/boogler.js`](src/boogler/boogler.js)) |
| Your friendship with The Boogler, your hotbar | You (client), kept in localStorage ([`src/boogler/play.js`](src/boogler/play.js), [`src/player/inventory.ts`](src/player/inventory.ts)) |
| Persistence (snapshots) | The server writes each room to its disk (every 2 s when it changed, every 30 s and on shutdown regardless) and starts a room from that save; tabs keep no copy |

### Server hosts every room
Every room is hosted by our server over WebSocket: it runs the lockstep world headless, relays presence and messages, and saves to its own disk, so the island never waits for a host and ticks while nobody is online. There is no peer-hosted fallback: when the server is unreachable, tabs reconnect and play alone meanwhile. Local dev runs the same server. The game talks only to the room interface in [`src/net/README.md`](src/net/README.md), never to the WebSocket directly. Plan: [docs/plans/server-host.md](docs/plans/server-host.md). (Changed on purpose 2026-10-31, from "PeerJS only": a host that never leaves, and the start of sending each player only the world near them; [docs/research/shared-state-at-scale.md](docs/research/shared-state-at-scale.md). Made a full switchover the same day: one networking model, not two. Where it goes next: [docs/plans/net-roadmap.md](docs/plans/net-roadmap.md).)

### Understandable at a glance
Boogle is built by a handful of friends and their agents shipping at once, so how it fits together has to be something you can see, not only read. The atlas ([boogle.club/atlas](https://boogle.club/atlas)) is our internal map: one picture of the pieces, stories that follow a single action through them, and code views underneath. It's a tool for the people and agents building Boogle, never part of the game. Facts in it come from the code on every build; the explanations live in `docs/atlas/` and a daily agent keeps them current, so a stale explanation is that agent's chore, never a red build. A new way of sharing state, or a big feature, comes with a story. Internal tools like this may use a library the game doesn't (the atlas draws with d3), as long as it never reaches the game bundle.

### Small and readable
This is a friends' project. Prefer plain modules, few dependencies and code someone can read in one sitting. Everything is TypeScript (`strict`): types are how many people and agents change shared code at once without breaking each other's wire messages and state shapes, and Vite and Node run it as written, with no build step of ours. Measure before optimizing; when you do optimize the sim, sleep settled regions (active-cell lists) before reaching for workers or the GPU.

## How we work

- **Playtest constantly with 2–4 real people.** We iterate in small steps and play each change on the live site. Every change reaches `main` through a PR that merges itself when CI is green (`npm run ship`), so iteration stays fast and nothing red goes live. Each phase in PLAN.md ends with the question the playtests should answer; note what happened in `docs/playtests.md`.
- **Light tests, real playtests.** Automated tests guard determinism, sync and conservation, and stay fast enough to run before every push; fun and feel are judged by playing.
- **Every feature says which principle it serves**, and calls out any principle it bends.
- **Changing a principle is a commit to this file**, with the reason.
