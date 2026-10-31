# 8. Multiplayer and persistence

## 8.1 Topology

A star around a host peer over PeerJS ([src/net/peer-room.js](../../src/net/peer-room.js),
[src/net/README.md](../../src/net/README.md)). The host registers the PeerJS id `boogle-<room>-host`; others register a
random id and connect to it with two data channels: `u` (unordered presence) and `r` (reliable, ordered messages,
heartbeats). The host relays presence and messages. Ids in messages are each tab's stable `selfId`, not PeerJS ids.
Heartbeats every 500 ms; a peer silent for 3 s is gone. Messages are capped at 16,000 characters. Without
`VITE_BOOGLE_SERVER`, PeerJS's public signaling server and default STUN are used ([src/netplay/net.js](../../src/netplay/net.js)). A
failed join drops to "Solo" and retries.

## 8.2 Host migration

When the host goes, every client waits a random 200 to 1200 ms and tries to claim the host id; the winner hosts and the
rest reconnect. Peers that do not come back within 9 s are reported as left. The new host continues from its own world
state, bumps the edit sequence and hashes soon. Edits the old host never stamped are lost; edits made while
reconnecting are held (up to 64, 5 s) and released one per 210 ms.

## 8.3 Sync kind per feature

| Feature | Kind | Channel / API |
|---|---|---|
| Your avatar (name, colour, position, yaw, state) | Owner | presence `n`, `c`, `p`, `r`, `s` |
| Beach ball | Owner (epoch rule) | presence `b` |
| What you hold | Owner | presence `hd` |
| Flops, face-plant | Owner | presence `fl`, `kd` |
| Your build id | Owner | presence `bv` |
| How you treat the Boogler | Owner | presence `bg` |
| The Boogler's position and mode | Host | `addHostField('g')` |
| Sand | none | retired 2026-10-30; `terrain` is a stub state |
| Water | none | retired 2026-10-30; `water` is a stub state |
| Mushrooms | Lockstep | ops `mush.plant`, `mush.water`; state `mushrooms` |
| Fruit, thrown things, frisbee | Lockstep | ops `fruit.drop`, `gift.take`, `gift.toss`; state `gifts` |
| Prototype flags | Lockstep | state `proto` |
| Sky, sails, lighthouse beam | Lockstep without state | function of `world.tick` |
| Flights of thrown things | Local replay, Lockstep landing | `gift.toss` |
| Honk, ping | Messages (not state) | `room.send` `{ t: 'honk' }`, `{ t: 'ping' }` |
| The guest's pose | Owner | presence `mr` |
| Hotbar, Boogler friendship, first-run flags | Local | localStorage |
| Critters, splashes, impact juice, blob shadows, pause view, guide | Local | none |

Presence goes out every 50 ms (20 Hz, `SEND_MS`); remote poses are drawn 120 ms behind (`INTERP_MS`).

## 8.4 Lockstep world, snapshots and saves

[src/world/sync.js](../../src/world/sync.js), [src/world/README.md](../../src/world/README.md),
[src/world/rules/README.md](../../src/world/rules/README.md).

- 10 ticks per second. Clients send `w:edit`; the host validates, stamps each edit 3 ticks ahead and broadcasts
  `w:edits`. Everyone applies edits in tick and sequence order, then runs ticks in `RULES` order: terrain, mushrooms,
  gifts, proto, water (append only: it is the wire order). Clients run about 2 to 3 ticks behind the host.
- Every 20 ticks (2 s) the host sends per-state hashes; a client that disagrees (or gets an edit for a past tick) asks
  for a snapshot (`w:need`) and replaces its state. Snapshots travel in 7,000-character chunks.
- States have versions and migrations (`registerState(key, { version, migrate })`); all are at version 0 today. A
  state that fails to load starts fresh; a state from a newer build is skipped and that tab stops persisting.
- The world seed is the constant 20261028 for every room.

## 8.5 What persists and where

| What | Where | Key or route | Scope |
|---|---|---|---|
| World snapshot (terrain, water, mushrooms, gifts, proto, tick) | localStorage on every ready peer, every 30 s and on pagehide if changed (clients only save hash-verified ticks) | `boogle.world.<room>` | per room, per browser |
| World snapshot | Server, host only, bodies under 250 KB | `PUT /rooms/:id/snapshot` | per room, only with `VITE_BOOGLE_SERVER` |
| Name, colour | localStorage | `boogle.name`, `boogle.color` | global |
| Hotbar | localStorage | `boogle.hotbar` (old `boogle.pocket` migrated once) | global, not per room |
| Boogler friendship | localStorage | `boogle.boogler.<room>` | per room |
| First-run card seen | localStorage | `boogle.firstRun.<kind>` | global |
| Guest engine, the pieces cut from the ROM | IndexedDB | `boogle-decomp` / `files`: `guest-engine`, `guest-rom` | per browser, never uploaded |
| Update reload guard | sessionStorage | `boogle-update-reloaded-for` | per tab session |

A tab that becomes host without state loads the newest, by tick, of its local copy and the server's (it waits up to 3 s
for the server). Not persisted: the ball, the Boogler's position.

The server ([server/README.md](../../server/README.md)) is one Node service: PeerJS signaling at `/peerjs`, snapshots
(256 KB max, 30 PUTs per minute per IP, 1,000 rooms), `/report` and `/reports`, `/ice` (Google STUN plus
Cloudflare TURN credentials) and `/healthz`. It runs on Fly (`boogle-server`); the game is served from boogle.club.

## 8.6 Known gaps

- **`world.epochMs` is never read.** It is set when a host starts fresh, saved and loaded with snapshots, and checked
  as an integer, but no game logic reads it. Nothing grows from elapsed wall-clock time: growth, regrowth and the day
  all count ticks, which only run while someone hosts. DESIGN principle 9 ("growth is computed from elapsed
  time") is not met yet.
- How many joins need the TURN relay, and the ball's lag for non-owners, are reported (`relayed`, `links`, `rttMs`;
  6.15); PLAN Phase 1's "Measure" item stays open until someone reads the numbers.
- The sim is not in a Web Worker (tech plan C4 decided: no worker). Hidden tabs keep
  ticking through a worker heartbeat ([src/world/background.js](../../src/world/background.js)), catching up at most 5 s.
- Mixed builds: presence guards for `fl` and `kd` stay until every tab runs b0a3a7b or later (comments in `feel.js`,
  `impact.js`).
- Trust: host validation checks ranges, rates and state, but not the player's reach (PLAN's "Key decision" mentions
  reach). Fine among friends, per PLAN.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
