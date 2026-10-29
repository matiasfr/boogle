# Boogle iteration plan

Goal: turn Boogle from "a beach ball on an island" into a drop-in co-op toy where friends shape water together to grow a shared garden, while the beach ball stays the main toy.

The design direction comes from the [research report](docs/research/water-farming-multiplayer.md). Its short version: **water is the glue between the ball and the farm.** Players dig channels and pile sand to steer water. Crops grow where the soil is wet. The tide is the shared threat. The garden persists, so the next visitor finds what the last one left.

## Guiding rules

The design and technical principles live in [DESIGN.md](DESIGN.md). Read it before picking up a phase. Every phase below ends with the question our ongoing playtests (2–4 real people, notes in [docs/playtests.md](docs/playtests.md)) should answer.

## Key decision: PeerJS (WebRTC), with one browser as host

Networking runs on [PeerJS](https://peerjs.com): browsers talk to each other directly over WebRTC data channels. Our hosting is only for the pieces WebRTC can't do on its own.

**Topology: star around a host peer.** One player's browser is the **host**. Everyone else connects only to the host, and the host relays presence between them. This avoids a full mesh (every player connected to every other, which grows with the square of the player count) and gives the water and garden sim a single authority, the way a server would.

**Finding the island (no lobby needed).** Every room has a well-known host ID, e.g. `boogle-<room>-host`.
1. On join, try to register as `boogle-<room>-host`.
2. If PeerJS says the ID is taken (`unavailable-id`), someone is already hosting. Register with a random ID and connect to the host.
3. If the host leaves, every client sees the connection close, waits a small random delay, and tries to claim the host ID. The first one to succeed becomes the new host; the rest reconnect to it.

**Two channels per connection.** One **unreliable/unordered** data channel for presence and the ball (latest state wins, like UDP), and one **reliable/ordered** channel for edits (dig, plant, harvest) that must never be dropped.

**Persistence without a game server.** Every client keeps the latest garden snapshot the host sent (in memory and in `localStorage`). A new host loads the newest snapshot it has. To make the garden survive when *nobody* is online, the host also saves snapshots to a tiny storage endpoint we host (`PUT/GET /rooms/:id/snapshot`), which can live in the same process as our PeerServer.

**What we host:**
| Piece | Why | Options |
|---|---|---|
| PeerJS signaling server | Introduces peers to each other. The free public `0.peerjs.com` is fine for prototyping but not reliable enough to depend on. | Self-host `peerjs-server` (Node) on Fly.io / Railway / Render |
| TURN relay | Without one, some players behind strict NATs or corporate/school networks can't connect at all. | Hosted TURN (Metered, Twilio, Cloudflare) or our own coturn |
| Snapshot storage | Garden survives when the island is empty. | A couple of HTTP routes next to the PeerServer, writing JSON to disk or a small DB |
| Static site | Serve the client | GitHub Pages / Netlify |

**Authority split:**
- Player movement: client-authoritative (as today).
- Ball: owner-authoritative with the epoch rule (as today), now carried over the unreliable channel.
- Water + garden: **host-authoritative.** Clients send edits to the host; the host stamps them with a tick and broadcasts them; everyone runs the same deterministic sim, so clients predict locally. The host sends a snapshot + hash every few seconds, and clients that disagree adopt it.
- Trust: the host validates edits (reach, rate limits). We're playing with friends, so a cheating host isn't a concern.

**PeerJS is the only transport.** We're dropping the claude.ai artifact `room` and the same-browser `BroadcastChannel` fallback, and the repo no longer targets claude.ai. Local testing works with PeerJS too: two tabs on one machine connect to each other like any two peers.

---

## Phase 0: Repo hygiene (small)

- [x] Split `index.html` into ES modules so friends can work in parallel without merge conflicts: `src/terrain.js`, `src/water-render.js`, `src/physics.js`, `src/ball.js`, `src/player.js`, `src/net/`, `src/hud.js`, `src/input.js`, `src/main.js`.
- [x] Add Vite (or keep a no-build setup with an import map). Pin three.js 0.160.0 and cannon-es 0.20.0 as npm deps.
- [x] Add Prettier + a minimal ESLint config.

**Done when:** the game behaves exactly as before and `npm run dev` / `npm run build` work.

## Phase 1: PeerJS networking

- [x] Remove the claude.ai-only code: `window.claude.use('room')`, `createLocalRoom()` (BroadcastChannel), the `permissions` and `user` capability calls, `window.claude.hot` snapshot/ready, and the "only runs inside the claude.ai artifact viewer" messages.
- [x] Write `src/net/peer-room.js` on PeerJS: host-ID claim, star topology with host relay, unreliable presence channel, host migration (see "Key decision" above). Keep the same small surface the game already calls (`presence(patch)`, `onPeers(handler)`, `onConnection(handler)`) so the game code barely changes. Rooms come from the URL (`/?room=beach`) so friend groups can have their own island.
- [x] Add a **reliable message channel** (`send(msg)` / `onMessage(handler)`) for edits.
- [x] Name comes from the lobby input and `localStorage` only (no claude.ai profile prefill).
- [x] Self-hostable server in `server/` (PeerJS signaling, `/ice` with TURN support, snapshot storage). Game reads `VITE_BOOGLE_SERVER`.
- [ ] Deploy `server/` (Fly.io) and add TURN credentials.
- [ ] Measure: ball latency for non-owners, and how many test connections fail without TURN.
- [ ] Host the static client on GitHub Pages / Netlify.

**Done when:** friends on different networks can play together from a URL, and the island survives the host closing their tab. **Playtest question:** does the ball feel responsive for players who don't own it?

## Phase 2: Water you can play in (easy wins)

The sea already makes the ball float and players swim (see the `preStep` buoyancy code). Build on that first, because it needs no new sim.

- [x] **Splashes.** When the ball hits water fast, spawn splash particles and a ripple ring in the water shader. Players jumping in splash too. (Report idea #4)
- ~~Keepy-uppy streak~~ (built, then cut in a design pass).
- [x] Ball drifts gently in the surf instead of only being pushed toward shore.

**Done when:** people spontaneously play a game with the ball in the water. **Playtest question:** do people play with the ball in the water?

## Phase 3: Shape the ground (dig and pile)

The terrain is already a 129×129 heightfield (`heights[i][j]`, cell size 1.25 world units) shared by the mesh, the physics body and the water shader's height texture. Editing it is the foundation for everything after.

- [x] Two new verbs on a tool key/button: **dig** (take sand from a cell) and **pile** (drop it on a cell), with a carry limit so sand is conserved. Only sand cells near the beach and garden are editable; rock and grass aren't.
- [x] Edits go to the host over the reliable channel as events `{i, j, op, player}`. The host validates them (reach, rate limit), stamps a tick, and broadcasts them. Every client applies them in tick order.
- [x] Update locally: the cannon-es `Heightfield` (call `updateMaxValue()` / rebuild affected data), the terrain mesh vertices and normals, and the height texture.
- [x] Persist the terrain diff (only changed cells) in the host's snapshot.

**Sand fun pass:**
- Readable sand: edit-driven vertex colours (dark cool dug, pale warm piled, wet near sea level), slope shade, crest highlight.
- 5x5 brush: dig 40/20 cm plus a 5 cm rim on the outer ring, pile mirrors it, bucket 1600; new `flatten` op (Shift+click / touch button); Q dig, Z pile keys.
- Juice: sand spray and dust, crater dip-and-spring (render-only), camera nudge, procedural WebAudio sounds (dry/wet/pat), also for remote edits.
- Target ring shows the footprint and bucket fill, turns red with a reason; hold-and-drag carves a continuous path.

**Done when:** players can build a sand wall and the ball bounces off it. **Playtest question:** do people build things for fun with nothing to protect?

## Phase 4: Living water (the core sim)

- [x] A **2.5D column water sim**, not 3D voxels. The island has no overhangs, so 3D buys almost nothing for a big cost. Each cell has terrain height plus integer water depth (0–255). Water flows to lower neighbors by a fixed integer rule in a fixed scan order, so every machine gets bit-identical results.
- [ ] Run it only on a **sim region** near the beach (start around 48×48 cells, ~60×60 m) at 10–20 ticks/s. Track an **active-cell list** so settled water sleeps (Noita's trick, the biggest performance win).
- [ ] The sim is one JS module run in a Web Worker on every client. The host's copy is authoritative; it sends a compact snapshot every few seconds plus a hash, and clients that disagree adopt the snapshot. The host also saves it to snapshot storage.
- [ ] A **freshwater spring** on the hill that feeds a stream down toward the beach.
- [ ] Rendering: draw a second water surface mesh over the sim region from the depth grid. Keep a separate cosmetic layer (ripples, splashes) that is local and doesn't need to match across clients.
- [ ] Ball + sim water: the ball floats in sim water as it does in the sea; splashes add a little water to nearby cells (sent as an edit by the ball owner).

**Done when:** people can dig a channel from the spring and watch water run down it. **Playtest question:** do people cheer when the water reaches where they wanted?

## Phase 5: The garden (on hold)

> On hold: crops and farming are cut for now while the design is reworked by hand. The items below are the old plan, kept for reference.

- [ ] **Soil and hydration.** Garden-region cells within N cells of standing water are "wet" (soil darkens, like Minecraft's 4-block rule). Make it visible.
- [x] **Mushroom stall.** A stall by a dirt patch hands out mushroom seeds and a watering can. Bury a seed, water it, and it grows into a big flat-topped mushroom that bounces players and the ball. Shared state in `src/sim/mushrooms.js`, edits through `src/world/sync.js`.
- [ ] **Plant / water / harvest.** Seeds planted on dry or wet soil, a watering action (carry water from a pond, or a splash from the ball). Crops grow only while hydrated.
- [ ] **Growth from timestamps, not ticks.** Store `plantedAt` and hydrated time per crop, and compute the stage from elapsed time. The garden grows while everyone is offline.
- [ ] **Visitor bonus** (from Animal Crossing): each *different* player who waters a plant today adds a growth bonus. Show "watered by 3 friends" sparkles.
- [ ] **Harvest-and-launch.** Ripe melons and coconuts become throwable physics props. Toss them into a cart for an island-wide total. (Report idea #9)
- [ ] Rewards stay personal and cosmetic (ball skins, hats, seed types); the garden stays communal.

**Done when:** a player who returns the next day sees that the garden changed. **Playtest question:** do people come back to check on it?

## Phase 6: The tide (co-op challenge)

- [ ] Every few minutes, a **telegraphed tide** rises over the beach for a minute: a visible wave on the horizon and a warning 30–60 s ahead. The schedule is a pure function of a shared clock (the host's tick, synced to clients) and a seed, so everyone sees the same tide. (Report idea #1)
- [ ] Rising sea floods low cells into the sim; sand walls hold it back, and the sim erodes weak walls.
- [ ] Throw the ball at a weak wall to knock it down and release water on purpose.

**Done when:** a group of players spontaneously defends the garden together. **Playtest question:** is it fun or stressful? Tune tide size and frequency.

## The Boogler: a friend to make

- [x] **Friendship.** Pet him, talk to him and give him presents to move up six levels, from Stranger to Best friend; hearts burst from his head at each new level. Personal, kept in localStorage per room (`src/boogler-friendship.js`).
- [x] **Talking.** A dialogue box with answer choices. Chapters about his home in Uzbekistan, his mother and his business dream unlock with friendship; asking too much too soon makes him go quiet (`src/boogler-lines.js`, `src/boogler-talk.js`).
- [x] **Riding.** Stand on him and he carries you, complains, then puffs up an orb that launches you and tells you off. Too many launches and he runs from you until time, an apology or a present forgives you (`src/boogler-play.js`).
- [x] **Island gifts.** Palms grow fruit you can shake loose (or knock down with the ball), and odds and ends wash up on the beach. Shared state in `src/sim/gifts.js`; your pocket holds six.

**Playtest question:** do people check on The Boogler when they drop in, and do friends compare how far they've got with him?

## Later / stretch

- Weather cycle: rain refills ponds, droughts dry them out, so building reservoirs matters (Timberborn).
- Water polo in a dug pond with sand-gate goals (light competition).
- A ball-powered water wheel lifting water to a terrace.
- One-seed-per-few-minutes "r/place garden" mode for a slow collective flower mosaic.
- Mud and erosion: wet sand slows players; plants anchor soil (From Dust).
- **Skip:** full 3D voxel fluid. It's a lot of cost for little gameplay on a beach island.

## Open questions for the group

- Where to host the PeerServer + snapshot storage (Fly, Railway, Render), and which TURN provider?
- Is it OK that whoever is host carries more CPU and upload load? (Fine for a handful of friends; revisit if lobbies grow past ~8.)
- One shared island, or rooms per friend group (`?room=`)?
- How hard is the tide? Pure toy, or can you actually lose the garden?
