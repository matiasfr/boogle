# 8. Multiplayer and persistence

## 8.1 Topology

Our server hosts every room ([src/net/ws-room.ts](../../src/net/ws-room.ts), [src/net/README.md](../../src/net/README.md),
[server/README.md](../../server/README.md)). Each tab opens one WebSocket to it at `/room/<world room>`, where the
world room is `v02-<room>` (the world namespace, [src/world/namespace.ts](../../src/world/namespace.ts); the `?room=`
URL and the pause title show the plain name). The server runs the room's lockstep world itself, relays presence (latest
wins per player, 20 ms apart) and messages, and saves the world to its own disk. Ids in messages are each tab's stable
`selfId`. Heartbeats every second; a tab silent for 5 s is closed, and announced as left 1.5 s later unless it is back.
Messages are capped at 16,000 characters. The game reads the server from `VITE_BOOGLE_SERVER` (set by the Pages
deploy); `npm run dev` runs its own in-process server. When the server can't be reached the tab says "connecting",
plays alone, and keeps reconnecting (250 ms to 3 s apart); there is no peer-to-peer fallback.

A room holds at most 8 players (`MAX_PLAYERS`; the server isn't one). A ninth is turned away (`room_full`): they play
solo, the HUD says "island full · waiting for a spot", and the retry gets them in once someone leaves. A player back
within the 1.5 s grace always gets in. A room loads (from its save) on its first join and keeps ticking while it is
empty; 10 minutes after the last player left it is saved and unloaded. Measured with 8 pages at 20 Hz presence: the
server uses about 8% of one core and delivers every update.

## 8.2 The lead

The server is the lockstep host, so there is no host migration: a tab that leaves takes nothing with it. One tab, the
**lead**, publishes Host-kind fields (the Boogler, `addHostField`): the oldest visible tab, picked by the server and
announced to everyone (`lead`). It changes when the lead leaves, or when it has been hidden for 5 s while a visible tab
is in the room. A restarting server says goodbye, saves and closes every socket; tabs reconnect (the world resumes
where it stopped), and after a crash they roll back to its last save (at most 2 s old). Edits made while reconnecting
are held (up to 64, 5 s) and released one per 210 ms.

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
| Log sources (the bundles at the home palms) | Lockstep | op `src.take`; state `sources`; refills on a section laid and a seeded tick |
| Ball resting spot | Lockstep (the ball's physics stays Owner) | op `ball.rest` (integer cm; one per 2 s); state `ball`; restored once when a tab loads the world |
| Offline helper bank | Lockstep, from a host-only measurement | op `bank.wake` (`hostOnly`: only the host's own submit is stamped); state `bank` |
| Mushrooms | Lockstep | ops `mush.plant`, `mush.water`; state `mushrooms` |
| Thrown things, frisbee | Lockstep | ops `gift.take`, `gift.toss`; state `gifts` |
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

- 10 ticks per second. Tabs send `w:edit`; the server (the host) validates, stamps each edit 3 ticks ahead and
  broadcasts `w:edits`. Everyone applies edits in tick and sequence order, then runs ticks in `RULES` order: mushrooms,
  gifts, roster, stacks, piles, sites, sources, bank (append only: it is the wire order; the list restarted with the
  0.1 namespace, when the terrain, water and proto stubs were retired). Tabs run about 2 to 3 ticks behind the server.
- Every 20 ticks (2 s) the server sends per-state hashes; a tab that disagrees (or gets an edit for a past tick) asks
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
| World snapshot (every state in `RULES`, tick) | The server's disk, every 2 s if changed, every 30 s and on shutdown regardless | `DATA_DIR/v02-<room>.json` (`GET /rooms/v02-<room>/snapshot`) | per room |
| World snapshot (unused copy) | localStorage on every tab, hash-verified ticks only; goes away with the peer model's removal | `boogle.world.v02-<room>` | per room, per browser |
| Name, colour | localStorage | `boogle.name`, `boogle.color` | global |
| Player id (pid) | localStorage | `boogle.pid` (10 random `[a-z0-9]`) | global, per browser |
| Guest pid (a second tab) | sessionStorage | `boogle.guestPid` | per tab |
| Hotbar | localStorage | `boogle.hotbar` | global, not per room |
| Boogler friendship | localStorage | `boogle.boogler` | global, not per room |
| First-run card seen | localStorage | `boogle.firstRun.<kind>` | global |
| Guest engine, the pieces cut from the ROM | IndexedDB | `boogle-decomp` / `files`: `guest-engine`, `guest-rom` | per browser, never uploaded |
| Update reload guard | sessionStorage | `boogle-update-reloaded-for` | per tab session |

Saves from before 0.1 (`boogle.world.<room>`, the server's `<room>`) are never loaded: the namespace bump of
2026-10-31 started every room's world fresh, and each tab deletes its old local key on connect. Not persisted: the ball, the Boogler's position.

The server ([server/README.md](../../server/README.md)) is one Node service: the rooms (`/room/:id`), their saves,
`/report` and `/reports`, and `/healthz`; the PeerJS signaling, `/ice` and snapshot uploads of the old peer model are
still there until they are removed (docs/plans/server-host.md, step 11). It runs on Fly (`boogle-server`); the game is served from boogle.club.

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

- **Only helper huts work while a room is unloaded.** A loaded room ticks with nobody in it; one unloaded (10 minutes
  after its last player left) doesn't. `world.epochMs` (the wall time of tick 0) is read by the helper bank alone: the
  server submits `bank.wake` when it loads a save, for the time it was unloaded (6.19). Mushroom growth and the day
  count ticks.
- How many joins need the TURN relay, and the ball's lag for non-owners, are reported (`relayed`, `links`, `rttMs`;
  6.15); PLAN Phase 1's "Measure" item stays open until someone reads the numbers.
- The sim is not in a Web Worker (tech plan C4 decided: no worker). Hidden tabs keep
  ticking through a worker heartbeat ([src/world/background.ts](../../src/world/background.ts)), catching up at most 5 s.
- Mixed builds: presence guards for `fl` and `kd` stay until every tab runs b0a3a7b or later (comments in `feel.js`,
  `impact.js`).
- Trust: the server's validation checks ranges, rates and state, but not the player's reach (PLAN's "Key decision" mentions
  reach). Fine among friends, per PLAN.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
