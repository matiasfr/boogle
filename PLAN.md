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

## Key decision: we host a server

The report assumed peer-to-peer presence only (the claude.ai artifact "room"). Since we're hosting, a small server makes almost everything simpler:

| Problem | Peer-only (report) | With our server |
|---|---|---|
| Who owns the garden / water state | Elect a host, checksum, resync on mismatch | The server owns it |
| Persistence | Last-write-wins artifact storage, ~one writer at a time | Server writes snapshots to disk / a database |
| Offline crop growth | Compute from `plantedAt` on load | Same, and the server is the clock |
| Playing off claude.ai | Same-browser tabs only | Works anywhere |
| Griefing / validation | Trust every client | Server validates edits (rate limits, reach checks) |

**Plan:** the server runs the water + garden sim at a fixed tick and is authoritative for it. Clients send **edits** (dig, pile, plant, harvest, splash) and run the same deterministic sim locally to predict, correcting from periodic server snapshots. Player movement stays client-authoritative and the ball stays owner-authoritative as today. Both already work well.

We keep the claude.ai artifact version working by putting all networking behind one **transport interface**, so the game code doesn't care which transport it's on.

---

## Phase 0: Repo hygiene (small)

- [ ] Split `index.html` into ES modules so friends can work in parallel without merge conflicts: `src/terrain.js`, `src/water-render.js`, `src/physics.js`, `src/ball.js`, `src/player.js`, `src/net/`, `src/hud.js`, `src/input.js`, `src/main.js`.
- [ ] Add Vite (or keep a no-build setup with an import map). Pin three.js 0.160.0 and cannon-es 0.20.0 as npm deps.
- [ ] Add Prettier + a minimal ESLint config.
- [ ] Keep a build step that inlines everything back into one HTML file so we can still publish to claude.ai.

**Done when:** the game behaves exactly as before, and `npm run dev` / `npm run build:artifact` both work.

## Phase 1: Real networking (hosted)

- [ ] Define the transport interface the game already uses: `presence(patch)`, `onPeers(handler)`, `onConnection(handler)`, `peers()`. Today it's implemented by the claude.ai `room` and `createLocalRoom()` (BroadcastChannel).
- [ ] Add a third implementation, `createWsRoom(url)`, that speaks to our server.
- [ ] Write the server (Node + `ws`, ~150 lines to start): rooms by ID, relays presence, sends join/leave, assigns peer IDs. Rooms by URL (`/?room=beach`) so different friend groups can have their own island.
- [ ] Add a **message channel** next to presence for discrete events (edits). Presence is "latest state wins"; edits must not be dropped.
- [ ] Deploy somewhere cheap with WebSocket support (Fly.io, Railway, Render), or use Cloudflare Durable Objects / PartyKit, which are built around exactly this one-object-per-room model and include storage.
- [ ] Host the static client on GitHub Pages / Netlify / the same server.

**Done when:** friends on different networks can play together from a URL. **Playtest question:** does it feel as smooth as the claude.ai version?

## Phase 2: Water you can play in (easy wins)

The sea already makes the ball float and players swim (see the `preStep` buoyancy code). Build on that first, because it needs no new sim.

- [ ] **Splashes.** When the ball hits water fast, spawn splash particles and a ripple ring in the water shader. Players jumping in splash too. (Report idea #4)
- [ ] **Keepy-uppy streak.** Count consecutive touches before the ball hits the ground or water, across all players. Show it big on screen, and keep a best-ever streak on the server. (Report idea #5, co-op version)
- [ ] Ball drifts gently in the surf instead of only being pushed toward shore.

**Done when:** people spontaneously play a game with the ball in the water. **Playtest question:** are people trying to beat the streak together?

## Phase 3: Shape the ground (dig and pile)

The terrain is already a 129×129 heightfield (`heights[i][j]`, cell size 1.25 world units) shared by the mesh, the physics body and the water shader's height texture. Editing it is the foundation for everything after.

- [ ] Two new verbs on a tool key/button: **dig** (take sand from a cell) and **pile** (drop it on a cell), with a carry limit so sand is conserved. Only sand cells near the beach and garden are editable; rock and grass aren't.
- [ ] Edits go to the server as events `{tick, i, j, op, player}`. The server validates them (reach, rate limit) and broadcasts them. Every client applies them in tick order.
- [ ] Update locally: the cannon-es `Heightfield` (call `updateMaxValue()` / rebuild affected data), the terrain mesh vertices and normals, and the height texture.
- [ ] Persist the terrain diff (only changed cells) on the server.

**Done when:** players can build a sand wall and the ball bounces off it. **Playtest question:** do people build things for fun with nothing to protect?

## Phase 4: Living water (the core sim)

- [ ] A **2.5D column water sim**, not 3D voxels. The island has no overhangs, so 3D buys almost nothing for a big cost. Each cell has terrain height plus integer water depth (0–255). Water flows to lower neighbors by a fixed integer rule in a fixed scan order, so every machine gets bit-identical results.
- [ ] Run it only on a **garden region** (start around 48×48 cells, ~60×60 m) at 10–20 ticks/s. Track an **active-cell list** so settled water sleeps (Noita's trick, the biggest performance win).
- [ ] Shared code for the sim: the same JS module runs on the server (authoritative) and in a client Web Worker (prediction). The server sends a compact snapshot every few seconds plus a hash. Clients that disagree adopt the snapshot.
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

- [ ] Every few minutes, a **telegraphed tide** rises over the beach for a minute: a visible wave on the horizon and a warning 30–60 s ahead. The schedule is a pure function of server time and a seed. (Report idea #1)
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

- Hosting: plain Node on Fly/Railway, or Cloudflare Durable Objects / PartyKit?
- One shared island, or rooms per friend group (`?room=`)?
- Do we keep shipping the claude.ai artifact version alongside the hosted one?
- How hard is the tide? Pure toy, or can you actually lose the garden?
