# Boogle iteration plan

Goal: turn Boogle from "a beach ball on an island" into a drop-in co-op toy where friends shape water together to grow a shared garden, while the beach ball stays the main toy.

The design direction comes from the research report "boogle Multiplayer Design: Deterministic Water Simulation for Cooperative Beach Farming". Its short version: **water is the glue between the ball and the farm.** Players dig channels and pile sand to steer water. Crops grow where the soil is wet. The tide is the shared threat. The garden persists, so the next visitor finds what the last one left.

## Guiding rules

1. **Toys before chores.** Every new system should be fun to mess with before it has goals. If dig/pile/water isn't fun with no crops at all, crops won't save it.
2. **Cooperation is automatic, not negotiated.** Watering someone's plant helps them. Nobody can wreck someone else's crops; only the environment (tide, drought) threatens them.
3. **Farming is never required.** Someone who just wants to throw the ball around should still have a great time.
4. **Telegraph every water event** 30–60 s ahead (a wave on the horizon, clouds), so drop-in players instantly have a shared goal.
5. **Determinism from day one** for anything simulated: integer water amounts, fixed update order, seeded weather. Retrofitting this later is far harder.
6. **Playtest each phase with 2–4 real people** before starting the next. Each phase below ends with the question the playtest should answer.

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

**Keep the claude.ai version working.** All networking sits behind one **transport interface**, so the game doesn't care whether it's on PeerJS, the claude.ai `room`, or same-browser `BroadcastChannel`. (PeerJS may also work inside the artifact, but test before relying on it, since the artifact sandbox may block connections to our signaling server.)

---

## Phase 0: Repo hygiene (small)

- [ ] Split `index.html` into ES modules so friends can work in parallel without merge conflicts: `src/terrain.js`, `src/water-render.js`, `src/physics.js`, `src/ball.js`, `src/player.js`, `src/net/`, `src/hud.js`, `src/input.js`, `src/main.js`.
- [ ] Add Vite (or keep a no-build setup with an import map). Pin three.js 0.160.0 and cannon-es 0.20.0 as npm deps.
- [ ] Add Prettier + a minimal ESLint config.
- [ ] Keep a build step that inlines everything back into one HTML file so we can still publish to claude.ai.

**Done when:** the game behaves exactly as before, and `npm run dev` / `npm run build:artifact` both work.

## Phase 1: PeerJS networking

- [ ] Define the transport interface the game already uses: `presence(patch)`, `onPeers(handler)`, `onConnection(handler)`, `peers()`. Today it's implemented by the claude.ai `room` and `createLocalRoom()` (BroadcastChannel).
- [ ] Add `createPeerRoom(roomId)` implementing it on PeerJS: host-ID claim, star topology with host relay, unreliable presence channel, host migration (see "Key decision" above). Rooms come from the URL (`/?room=beach`) so friend groups can have their own island.
- [ ] Add a **reliable message channel** (`send(msg)` / `onMessage(handler)`) to the interface for edits. Implement it for all three transports.
- [ ] Prototype against the public PeerJS cloud server first; then self-host `peerjs-server` and add TURN credentials.
- [ ] Measure: ball latency for non-owners, and how many test connections fail without TURN.
- [ ] Host the static client on GitHub Pages / Netlify.

**Done when:** friends on different networks can play together from a URL, and the island survives the host closing their tab. **Playtest question:** does it feel as smooth as the claude.ai version?

## Phase 2: Water you can play in (easy wins)

The sea already makes the ball float and players swim (see the `preStep` buoyancy code). Build on that first, because it needs no new sim.

- [ ] **Splashes.** When the ball hits water fast, spawn splash particles and a ripple ring in the water shader. Players jumping in splash too. (Report idea #4)
- [ ] **Keepy-uppy streak.** Count consecutive touches before the ball hits the ground or water, across all players. Show it big on screen, and keep a best-ever streak in the host's snapshot. (Report idea #5, co-op version)
- [ ] Ball drifts gently in the surf instead of only being pushed toward shore.

**Done when:** people spontaneously play a game with the ball in the water. **Playtest question:** are people trying to beat the streak together?

## Phase 3: Shape the ground (dig and pile)

The terrain is already a 129×129 heightfield (`heights[i][j]`, cell size 1.25 world units) shared by the mesh, the physics body and the water shader's height texture. Editing it is the foundation for everything after.

- [ ] Two new verbs on a tool key/button: **dig** (take sand from a cell) and **pile** (drop it on a cell), with a carry limit so sand is conserved. Only sand cells near the beach and garden are editable; rock and grass aren't.
- [ ] Edits go to the host over the reliable channel as events `{i, j, op, player}`. The host validates them (reach, rate limit), stamps a tick, and broadcasts them. Every client applies them in tick order.
- [ ] Update locally: the cannon-es `Heightfield` (call `updateMaxValue()` / rebuild affected data), the terrain mesh vertices and normals, and the height texture.
- [ ] Persist the terrain diff (only changed cells) in the host's snapshot.

**Done when:** players can build a sand wall and the ball bounces off it. **Playtest question:** do people build things for fun with nothing to protect?

## Phase 4: Living water (the core sim)

- [ ] A **2.5D column water sim**, not 3D voxels. The island has no overhangs, so 3D buys almost nothing for a big cost. Each cell has terrain height plus integer water depth (0–255). Water flows to lower neighbors by a fixed integer rule in a fixed scan order, so every machine gets bit-identical results.
- [ ] Run it only on a **garden region** (start around 48×48 cells, ~60×60 m) at 10–20 ticks/s. Track an **active-cell list** so settled water sleeps (Noita's trick, the biggest performance win).
- [ ] The sim is one JS module run in a Web Worker on every client. The host's copy is authoritative; it sends a compact snapshot every few seconds plus a hash, and clients that disagree adopt the snapshot. The host also saves it to snapshot storage.
- [ ] A **freshwater spring** on the hill that feeds a stream down toward the garden.
- [ ] Rendering: draw a second water surface mesh over the garden region from the depth grid. Keep a separate cosmetic layer (ripples, splashes) that is local and doesn't need to match across clients.
- [ ] Ball + sim water: the ball floats in sim water as it does in the sea; splashes add a little water to nearby cells (sent as an edit by the ball owner).

**Done when:** people can dig a channel from the spring and watch water run down it. **Playtest question:** do people cheer when the water reaches where they wanted?

## Phase 5: The garden

- [ ] **Soil and hydration.** Garden-region cells within N cells of standing water are "wet" (soil darkens, like Minecraft's 4-block rule). Make it visible.
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
- [ ] Salt water kills crops it touches, so walls matter. (Report idea #7)

**Done when:** a group of players spontaneously defends the garden together. **Playtest question:** is it fun or stressful? Tune tide size and frequency.

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
- Do we keep shipping the claude.ai artifact version alongside the hosted one?
- How hard is the tide? Pure toy, or can you actually lose the garden?
