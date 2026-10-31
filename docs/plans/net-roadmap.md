# Plan: the net model for a co-op open world

> **Status: direction, approved by the user (2026-10-31).** Boogle is heading toward a co-op hybrid of a creature and
> survival world (Palworld), building (Fortnite) and walking together through a big place (Big Walk). This file says what
> that asks of the net model and in what order. It is a roadmap: each phase gets its own plan in `docs/plans/` when it
> starts. Phase 0 is [server-host.md](server-host.md); the world-size work is in [open-world.md](open-world.md).
> Re-check code references before starting a phase; they were read on 2026-10-31.

## Decisions

- **Co-op, not PvP.** Players never compete over the same thing in real time, so each tab keeps authority over its own
  avatar's movement (no client prediction or reconciliation). The server owns everything shared and checks what tabs
  claim. A PvP mode would need server-owned movement, prediction and lag compensation; that is a separate decision and
  is not planned.
- **Full switchover, no fallbacks.** The server hosts every room. When it is down, tabs show "reconnecting" and keep
  playing alone; there is no peer-hosted fallback, no second transport and no compatibility path for old tabs (they
  reload onto the new build). Code the switch replaces is deleted, not kept beside it.
- **One Fly machine** for now (`shared-cpu`, one volume). Everything below keeps "one room = one world host object, no
  globals", so rooms can move to their own machines later (phase 9) without a redesign.

## Sync kinds after this roadmap

| Kind | Who simulates | Who decides | Used for |
|---|---|---|---|
| Local | this tab | this tab | decoration, camera, UI |
| Owner | the owning tab | the owner, sanity-checked by the server (phase 4) | your avatar, what you hold, the ball you kicked |
| **Server** (new, phase 3) | the server | the server | creatures, NPCs (The Boogler first), loot, anything with AI or shared physics |
| Lockstep | server and tabs (same rules) | the server stamps and validates | edit-shaped persistent data: building pieces, gardens, gifts |
| Messages | n/a | the receiver validates | one-off events: honks, pings, hits reported to the server |

**Host** kind (`addHostField`, the server's "lead" tab) goes away in phase 3: everything it did becomes Server kind.

## Phases

### 0. The server hosts every room ([server-host.md](server-host.md), steps 9-10)

The game joins the server over WebSocket for every room (`beach`, dev rooms, local dev with a local server). Then
PeerJS, TURN, browser hosting, host migration and snapshot PUTs are deleted. Done when no browser ever hosts a room.

### 1. Stable player identity

Today `SELF_ID` is new on every page load, so nothing can belong to a player across visits. Before any feature that
owns things (creatures, inventory, a base):

- A `playerId`: a random key kept in `localStorage`, sent in the `/room` upgrade next to `self` (which stays the
  per-connection id). Accounts come later and map onto `playerId`; nothing above `src/net/` sees which it is.
- The server keys per-player data by `playerId`. Two tabs with the same `playerId` are the same player (the newer one
  wins, like `self` today).
- Not a trust boundary yet (friends only); it becomes one with accounts.

### 2. Storage: SQLite on the volume

`node:sqlite` (built into Node 24, no new dependency) replaces the per-room JSON file:

- Tables for the world (one row per room, later one per chunk), players (inventory, creature roster, where they
  were), and a small event log for debugging.
- Saves become row writes of what changed, not a whole snapshot every 2 s, which matters once the world and the
  player data are large.
- Clean break: the current `beach.json` is imported once or dropped (development saves don't need to survive).

### 3. The world as data, Rapier on the server, the Server kind

The server cannot simulate anything that touches the ground while the ground only exists in the render code (the
reason `canPlantAt` had to be baked into `src/world/home-land.json`).

- **World data:** terrain heightfield, static colliders (rocks, trees, walls, POIs) and spawn areas as data both sides
  load, generated and checked like `home-land.json` (a scenario writes it, CI checks it). The renderer builds from the
  same data instead of being the source of truth.
- **Rapier in Node:** `@dimforge/rapier3d` is WASM and runs in Node. The server builds a static world from the data
  plus kinematic bodies for players (from their presence) so creatures collide with players and the ground. It goes
  through `src/physics/engine.ts`, kept free of three.js.
- **Server kind API:** on the server, a system registers entity kinds with a tick (20 Hz) and a compact state per
  entity; the server sends each client the entities it cares about (everyone, until phase 5) as latest-wins packets.
  On the client, `onServerEntities(kind, (id, snap) => ...)` feeds `createSnaps()`, exactly like remote avatars.
  Entities spawn, despawn and persist (phase 2) on the server only.
- **The Boogler moves first.** He is the one Host-kind thing today. Then `addHostField`, `isLead()` and the lead
  election are deleted.
- Lockstep stays for edit-shaped state; Server kind is for things that move or think. A creature a player keeps
  (a roster entry) is player data (phase 2); the same creature out in the world is a Server entity.

### 4. Co-op authority: what the server checks

Each tab still moves itself; the server makes sure claims are plausible and owns every outcome that is shared.

- **Presence checks:** speed and teleport limits against the last accepted position (respawns and teleports go
  through the server), the position clamped to the world bounds. A failed check drops the packet and asks the tab to
  snap back.
- **Interactions** (pick up, plant, build, capture, hit a creature) are messages or ops the server validates against
  its own state and the player's last accepted position: reach, cooldowns, inventory, that the target exists. The
  result comes back through the server (`onApplied`, a Server entity update), never decided by the tab.
- **Combat against creatures:** the tab reports a hit (`{ target, at }`); the server checks range and cooldown,
  applies damage and runs the creature's reaction. No hit is final until the server says so; the tab plays a
  provisional effect.
- Player vs player damage: none.

### 5. Interest management and chunks

When the world is bigger than one island or rooms pass 8 players (details: [open-world.md](open-world.md),
section 3):

- The world is a 2D grid of chunks. Each client subscribes to the chunks around it; the server sends presence,
  Server entities and Lockstep state only for those (the relay's `audience(from)` seam is where this starts).
- Lockstep state becomes per chunk: per-chunk hashes, snapshots and dirty tracking. A client stops simulating chunks
  it is not in, so Lockstep turns into "server state the client applies edits to" for those chunks. Decide at the start
  of this phase whether clients keep running the rules for nearby chunks (instant feedback) or only apply server
  results.
- Server-side simulation level of detail: chunks with no player nearby tick slowly (creatures idle, growth from
  timestamps) and wake up when someone arrives.

### 6. Wire efficiency

When `npm run load` or telemetry shows bandwidth as the limit (likely with phase 5 and a higher cap):

- `boogle.2`: a binary codec (quantized positions and angles, small integer ids), offered through the WebSocket
  subprotocol. With the full switchover, `boogle.1` is dropped once `boogle.2` ships.
- Rates by distance: nearby players and creatures at 20 Hz, far ones at a few Hz.
- Deltas against the last packet each client acknowledged.

### 7. Unreliable transport

WebSocket is TCP: one lost packet holds back everything behind it. Fine for walking; it will show when fast creature
fights land. Then: WebTransport datagrams (HTTP/3) for presence and entity packets, the WebSocket kept for reliable
messages and ops, both behind the room interface. Server-side WebRTC data channels are the alternative if Node's
WebTransport support is still thin. Trigger: telemetry or `npm run load` showing stalls under packet loss, not before.

### 8. Proximity voice (Big Walk)

Talking to whoever is near you. Audio goes tab to tab over WebRTC; the server only does signaling (as messages over
the existing room) and tells tabs who is in range, so tabs connect and drop as players walk. No PeerJS: plain
`RTCPeerConnection` with STUN, plus TURN credentials from the server for the links that need them. An SFU (one media
server) only if rooms get large enough that a mesh of nearby players is too much.

### 9. More than one machine

When one machine's CPU is the limit (the server prints its share in `npm run load`):

- Each room runs in one process; a small routing table maps room id to machine, and Fly's `fly-replay` header sends
  the `/room` upgrade to the right one.
- This supports both shapes the game could take: one world per friend group (like Palworld servers) and short-lived
  instances (a session, a match).
- One shared world bigger than a machine (several machines per world) is a much larger change and is not planned.

## Not in this roadmap

- PvP, server-owned movement, client prediction, lag compensation.
- Accounts and login (phase 1 leaves room for them).
- Anti-cheat beyond phase 4's checks.
