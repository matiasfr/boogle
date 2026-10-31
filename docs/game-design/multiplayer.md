# 8. Multiplayer and persistence

## 8.1 Topology

A room is one of three transports behind one room interface ([src/net/room.ts](../../src/net/room.ts), the room
picker; [src/net/README.md](../../src/net/README.md)). Without `VITE_BOOGLE_SERVER` it is always a peer room. With it,
a join first opens the server's WebSocket room and falls back from there:

- **Server room** (`transport: 'server'`, [src/net/ws-room.ts](../../src/net/ws-room.ts)): our server hosts the room
  (below). Taken when the server hosts that room.
- **Peer room** (`'peer'`): a browser hosts it over PeerJS on our signaling, as described in the rest of this
  section. Taken when the server answers that it does not host the room.
- **Fallback** (`'fallback'`): our server is unreachable, so a browser hosts the room over PeerJS on PeerJS's public
  signaling, under `<room>-fb`.

The room keeps watching for a better transport and moves without dropping avatars (peers listed again stay; the rest
leave after 9 s): a peer room asks the server about every 30 s whether it hosts the room now, a fallback room about every
10 s whether the server is back, and a server room that has been down 30 s with the server unreachable moves to the
fallback. Before a move, the browser host of the transport being left hands its world to the server
(`POST /rooms/<id>/handoff`). Players see none of this beyond the net chip ("Connecting" while it moves);
`?netdebug=1` shows the transport. `?p2p` skips the server for any room but the default one.

Which rooms the server hosts is its `SERVER_ROOMS` setting ([server/README.md](../../server/README.md)); unset means
none. [server/fly.toml](../../server/fly.toml) does not set it, so whether the live site's rooms are server hosted is
unclear from code ([plans/server-host.md](../plans/server-host.md) step 8 says production is still peer hosted; step 9,
every room on the server, is not built).

**Server-hosted rooms.** The server runs the lockstep world itself, as the host, from start to shutdown whether or not
anyone is there, and relays presence and messages over one WebSocket per tab (`/room/<id>`, subprotocol `boogle.1`;
heartbeat every 1 s, a socket silent for 5 s is closed and reconnects with a 250 ms to 3 s backoff). It holds the
room's PeerJS host id, so no browser can host it too. A room holds 8 players (`MAX_PLAYERS`; the server is not one); a
reconnecting player is always let back in, and a tab that drops is reported as left after 1.5 s. The Boogler still
needs a browser: the server names one tab the **lead** (the oldest visible tab; a lead hidden for 5 s gives way to a
visible one, and one that leaves is replaced at once), and the lead runs him (6.8). On a peer room the lead is the
host. A server deploy or restart says `bye`, saves and closes every socket; tabs reconnect.

**Peer rooms.** A star around a host peer over PeerJS ([src/net/peer-room.ts](../../src/net/peer-room.ts),
[src/net/README.md](../../src/net/README.md)). The host registers the PeerJS id `boogle-<world room>-host`, where the world room is `v01-<room>` (the world
namespace, [src/world/namespace.ts](../../src/world/namespace.ts); the `?room=` URL and the pause title show the plain
name); others register a
random id and connect to it with two data channels: `u` (unordered presence) and `r` (reliable, ordered messages,
heartbeats). The host relays presence and messages. Ids in messages are each tab's stable `selfId`, not PeerJS ids.
Heartbeats every 500 ms; a peer silent for 3 s is gone. Messages are capped at 16,000 characters. Without
`VITE_BOOGLE_SERVER`, PeerJS's public signaling server and default STUN are used ([src/netplay/net.ts](../../src/netplay/net.ts)). A
failed join drops to "Solo" and retries.

A room holds at most 8 players, host included (`MAX_PEERS`). A ninth is turned away (`room_full`): they play solo,
the HUD says "island full · waiting for a spot", and the retry gets them in once someone leaves. Players the host
already knows (back after a blip, or from before a host migration) always get back in. Measured with
`npm run load` (8 pages on one machine, 20 Hz presence): the host uploads about 1.7 Mbit/s, each client about
60 kbit/s.

## 8.2 Host migration

On a server-hosted room there is none: the server stays the host, and only the lead moves (8.1). On a peer room,
when the host goes, every client waits a random delay that depends on how good a host it would be (visible desktop
100–500 ms, visible touch device 450–900 ms, hidden tab 950–1750 ms) and tries to claim the host id; the winner hosts
and the rest reconnect.

The host also hands over on purpose. Each client reports its host score (3 visible desktop, 2 visible touch, 0
hidden). A host hidden for 5 s while a better tab is in the room, or a touch-device host with a desktop in the room for
20 s (after its first minute as host), names the best client and lets go of the id; that client claims it at once and
the others give it 0.7 s, then race by score. A host never hands over in its first 15 s (hidden) or minute (touch), and a tab that has not loaded the verified world scores 0, so it is never handed the room. A hidden host's timers are throttled, so coalesced relays wait up to a second and, after minutes in the background, heartbeats stop;
so this keeps the room smooth when the host player switches tabs. Peers that do not come back within 9 s are reported as left. The new host continues from its own world
state, bumps the edit sequence and hashes soon. Edits the old host never stamped are lost; edits made while
reconnecting are held (up to 64, 5 s) and released one per 210 ms.

## 8.3 Sync kind per feature

| Feature | Kind | Channel / API |
|---|---|---|
| Your avatar (name, colour, position, yaw, state) | Owner | presence `n`, `c`, `p`, `r`, `s` |
| Your player id (pid) | Owner + bound by the host | presence `pid`; message `w:id`; stamped on every edit as `e.u` |
| Who each pid is (name, colour) | Lockstep | op `who.set`; state `roster` |
| Beach ball | Owner (epoch rule) | presence `b` |
| What you hold | Owner | presence `hd` |
| Flops, face-plant | Owner | presence `fl`, `kd` |
| Your build id | Owner | presence `bv` |
| How you treat the Boogler | Owner | presence `bg` |
| The Boogler's position and mode | Host, published by the lead | `addHostField('g')` |
| Ground piles | Lockstep | ops `pile.drop`, `pile.take`; state `piles` |
| Haul stacks (what each player carries) | Lockstep, by roster index | state `stacks`; the spill is your call (Owner), applied as `pile.drop` |
| Work sites, plaques (tier derived), machine runs | Lockstep (a run is a pure function of its start tick) | ops `site.stock`, `site.run`; state `sites` |
| Log sources (palm charges) | Lockstep | op `src.take`; state `sources`; refills on a section laid and a seeded tick |
| Offline helper bank | Lockstep, from a host-only measurement | op `bank.wake` (`hostOnly`: only the host's own submit is stamped); state `bank` |
| Mushrooms | Lockstep | ops `mush.plant`, `mush.water`; state `mushrooms` |
| Fruit, thrown things, frisbee | Lockstep | ops `fruit.drop`, `gift.take`, `gift.toss`; state `gifts` |
| Sky, sails, lighthouse beam | Lockstep without state | function of `world.tick` |
| Flights of thrown things | Local replay, Lockstep landing | `gift.toss` |
| Honk, ping | Messages (not state) | `room.send` `{ t: 'honk' }`, `{ t: 'ping' }` |
| The guest's pose | Owner | presence `mr` |
| Hotbar, Boogler friendship, first-run flags | Local | localStorage |
| Critters, splashes, impact juice, blob shadows, pause view, guide | Local | none |

Presence goes out every 50 ms (20 Hz, `SEND_MS`); remote poses are drawn 120 ms behind (`INTERP_MS`).

## 8.4 Lockstep world, snapshots and saves

[src/world/sync.ts](../../src/world/sync.ts), [src/world/README.md](../../src/world/README.md),
[src/world/rules/README.md](../../src/world/rules/README.md).

- 10 ticks per second. Clients send `w:edit`; the host validates, stamps each edit 3 ticks ahead and broadcasts
  `w:edits`. Everyone applies edits in tick and sequence order, then runs ticks in `RULES` order ([src/world/rules/index.ts](../../src/world/rules/index.ts)): mushrooms, gifts,
  roster, stacks, piles, sites, sources, bank (append only: it is the wire order; the list restarted with the 0.1
  namespace, when the terrain, water and proto stubs were retired). Clients run about 2 to 3 ticks behind the host.
- Every 20 ticks (2 s) the host sends per-state hashes; a client that disagrees (or gets an edit for a past tick) asks
  for a snapshot (`w:need`) and replaces its state. Snapshots travel in 7,000-character chunks.
- States have versions and migrations (`registerState(key, { version, migrate })`); all are at version 0 today. A
  state that fails to load starts fresh; a state from a newer build is skipped and that tab stops persisting.
- The world seed is the constant 20261028 for every room.
- Budget: a world with every state at its caps (256 players, 128 piles, full plaques) saves under 60 KB (about 27 KB
  today, `test/world-size.test.ts`), so the pagehide upload keeps `keepalive`. `worldStatus().snapBytes` reports the
  last size; telemetry doesn't send it yet.

## 8.5 What persists and where

| What | Where | Key or route | Scope |
|---|---|---|---|
| World snapshot (every state in `RULES`, tick) | localStorage on every ready peer, every 30 s and on pagehide if changed (clients only save hash-verified ticks) | `boogle.world.v01-<room>` | per room, per browser |
| World snapshot (peer room) | Server, from the browser host only, bodies under 250 KB; a demoted host also POSTs its last save as a handoff (under 1 MB) | `PUT /rooms/v01-<room>/snapshot`, `POST /rooms/v01-<room>/handoff` | per room, only with `VITE_BOOGLE_SERVER` |
| World snapshot (server-hosted room) | The server's disk, written by the server every 2 s when the world changed, the tick at least every 30 s, and on shutdown; browser PUTs are refused (409) | `DATA_DIR/<room>.json` | per room |
| Name, colour | localStorage | `boogle.name`, `boogle.color` | global |
| Player id (pid) | localStorage | `boogle.pid` (10 random `[a-z0-9]`) | global, per browser |
| Guest pid (a second tab) | sessionStorage | `boogle.guestPid` | per tab |
| Hotbar | localStorage | `boogle.hotbar` (old `boogle.pocket` migrated once) | global, not per room |
| Boogler friendship | localStorage | `boogle.boogler.<room>` | per room |
| First-run card seen | localStorage | `boogle.firstRun.<kind>` | global |
| Guest engine, the pieces cut from the ROM | IndexedDB | `boogle-decomp` / `files`: `guest-engine`, `guest-rom` | per browser, never uploaded |
| Update reload guard | sessionStorage | `boogle-update-reloaded-for` | per tab session |
| GPU-loss reload guard | sessionStorage | `boogle.gfxReload` | per tab session |

Saves from before 0.1 (`boogle.world.<room>`, the server's `<room>`) are never loaded: the namespace bump of
2026-10-31 started every room's world fresh, and each tab deletes its old local key on connect. A tab that becomes a peer room's host without state loads the newest, by tick, of its local copy and the server's
(it waits up to 3 s for the server). A server-hosted room adopts a handed-off world only if it loads cleanly, is newer
than its own and arrives within 10 minutes of the server starting (`ADOPT_WINDOW_MS`). Not persisted: the ball, the Boogler's position.

The server ([server/README.md](../../server/README.md)) is one Node service: PeerJS signaling at `/peerjs`, snapshots
(256 KB max, 30 PUTs per minute per IP, 1,000 rooms) and handoffs, `GET /rooms/<id>/host` (whether it hosts a room, and
its tick and players), the hosted rooms' WebSocket at `/room/<id>` (20 upgrades per minute per IP), `/report` and
`/reports`, `/ice` (Google STUN plus Cloudflare TURN credentials) and `/healthz`. For hosted rooms it runs the same
`src/world/sync.ts` and rules as a tab, on the land pinned in [src/world/home-land.json](../../src/world/home-land.json). It runs on Fly (`boogle-server`); the game is served from boogle.club.

## 8.6 Who you are (player id)

[src/player/identity.ts](../../src/player/identity.ts), [src/features/identity.ts](../../src/features/identity.ts).
No sign-up. Each browser gets a random player id (pid) on its first visit, kept in `boogle.pid`, plus the name and
colour you pick at Jump in. A reload, a new room or a new day is the same player; clearing site data, another browser
or another device is a new one (old plaque lines stay under the old name). The tab says its pid to the room (`w:id`)
before anything else, and the host stamps that pid on each of the tab's edits, ignoring any pid an edit claims, and
refusing a pid that someone in the room already plays as (a reload's old session times out first); a client repeats
`w:id` every 5 s. The session id `p` is unchanged. The roster (`who.set`, sent on Jump in and after a rename) remembers each pid's name and
colour, so credit can name players who have gone home; it holds 256 players per room. A second tab of the same
browser can't take the `boogle.pid` Web Lock: it plays as a guest with its own pid and shows "second tab: playing as a
guest". Not yet: transfer codes, accounts and "forget me" (docs/plans/0.1-groundwork.md, "Identity: now and later").

## 8.7 Known gaps

- **Only helper huts work offline** (on peer rooms; a server-hosted room ticks with nobody online). `world.epochMs` (the wall time of tick 0) is read by the helper bank alone: a
  tab that starts hosting a save submits `bank.wake` for the time nobody hosted (6.19); the server does the same after
  a restart. Mushroom growth, fruit regrowth
  and the day still count ticks, which on a peer room only run while someone hosts. A hidden host's capped catch-up counts as
  offline time too.
- How many joins need the TURN relay, and the ball's lag for non-owners, are reported (`relayed`, `links`, `rttMs`,
  `transport`;
  6.15); PLAN Phase 1's "Measure" item stays open until someone reads the numbers.
- The sim is not in a Web Worker (tech plan C4 decided: no worker). Hidden tabs keep
  ticking through a worker heartbeat ([src/world/background.ts](../../src/world/background.ts)), catching up at most 5 s.
- Mixed builds: presence guards for `fl` and `kd` stay until every tab runs b0a3a7b or later (comments in `feel.js`,
  `impact.js`).
- Trust: host validation checks ranges, rates and state, but not the player's reach (PLAN's "Key decision" mentions
  reach). Fine among friends, per PLAN.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
