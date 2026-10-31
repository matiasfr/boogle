# 8. Multiplayer and persistence

## 8.1 Topology

A star around a host peer over PeerJS ([src/net/peer-room.js](../../src/net/peer-room.js),
[src/net/README.md](../../src/net/README.md)). The host registers the PeerJS id `boogle-<world room>-host`, where the world room is `v01-<room>` (the world
namespace, [src/world/namespace.ts](../../src/world/namespace.ts); the `?room=` URL and the pause title show the plain
name); others register a
random id and connect to it with two data channels: `u` (unordered presence) and `r` (reliable, ordered messages,
heartbeats). The host relays presence and messages. Ids in messages are each tab's stable `selfId`, not PeerJS ids.
Heartbeats every 500 ms; a peer silent for 3 s is gone. Messages are capped at 16,000 characters. Without
`VITE_BOOGLE_SERVER`, PeerJS's public signaling server and default STUN are used ([src/netplay/net.js](../../src/netplay/net.js)). A
failed join drops to "Solo" and retries.

A room holds at most 8 players, host included (`MAX_PEERS`). A ninth is turned away (`room_full`): they play solo,
the HUD says "island full · waiting for a spot", and the retry gets them in once someone leaves. Players the host
already knows (back after a blip, or from before a host migration) always get back in. Measured with
`npm run load` (8 pages on one machine, 20 Hz presence): the host uploads about 1.7 Mbit/s, each client about
60 kbit/s.

## 8.2 Host migration

When the host goes, every client waits a random delay that depends on how good a host it would be (visible desktop
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
| The Boogler's position and mode | Host | `addHostField('g')` |
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
  `w:edits`. Everyone applies edits in tick and sequence order, then runs ticks in `RULES` order: mushrooms, gifts
  (append only: it is the wire order; the list restarted with the 0.1 namespace, when the terrain, water and proto
  stubs were retired). Clients run about 2 to 3 ticks behind the host.
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
| World snapshot | Server, host only, bodies under 250 KB | `PUT /rooms/v01-<room>/snapshot` | per room, only with `VITE_BOOGLE_SERVER` |
| Name, colour | localStorage | `boogle.name`, `boogle.color` | global |
| Player id (pid) | localStorage | `boogle.pid` (10 random `[a-z0-9]`) | global, per browser |
| Guest pid (a second tab) | sessionStorage | `boogle.guestPid` | per tab |
| Hotbar | localStorage | `boogle.hotbar` (old `boogle.pocket` migrated once) | global, not per room |
| Boogler friendship | localStorage | `boogle.boogler.<room>` | per room |
| First-run card seen | localStorage | `boogle.firstRun.<kind>` | global |
| Guest engine, the pieces cut from the ROM | IndexedDB | `boogle-decomp` / `files`: `guest-engine`, `guest-rom` | per browser, never uploaded |
| Update reload guard | sessionStorage | `boogle-update-reloaded-for` | per tab session |

Saves from before 0.1 (`boogle.world.<room>`, the server's `<room>`) are never loaded: the namespace bump of
2026-10-31 started every room's world fresh, and each tab deletes its old local key on connect. A tab that becomes host without state loads the newest, by tick, of its local copy and the server's (it waits up to 3 s
for the server). Not persisted: the ball, the Boogler's position.

The server ([server/README.md](../../server/README.md)) is one Node service: PeerJS signaling at `/peerjs`, snapshots
(256 KB max, 30 PUTs per minute per IP, 1,000 rooms), `/report` and `/reports`, `/ice` (Google STUN plus
Cloudflare TURN credentials) and `/healthz`. It runs on Fly (`boogle-server`); the game is served from boogle.club.

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

- **Only helper huts work offline.** `world.epochMs` (the wall time of tick 0) is read by the helper bank alone: a
  tab that starts hosting a save submits `bank.wake` for the time nobody hosted (6.19). Mushroom growth, fruit regrowth
  and the day still count ticks, which only run while someone hosts. A hidden host's capped catch-up counts as
  offline time too.
- How many joins need the TURN relay, and the ball's lag for non-owners, are reported (`relayed`, `links`, `rttMs`;
  6.15); PLAN Phase 1's "Measure" item stays open until someone reads the numbers.
- The sim is not in a Web Worker (tech plan C4 decided: no worker). Hidden tabs keep
  ticking through a worker heartbeat ([src/world/background.ts](../../src/world/background.ts)), catching up at most 5 s.
- Mixed builds: presence guards for `fl` and `kd` stay until every tab runs b0a3a7b or later (comments in `feel.js`,
  `impact.js`).
- Trust: host validation checks ranges, rates and state, but not the player's reach (PLAN's "Key decision" mentions
  reach). Fine among friends, per PLAN.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
