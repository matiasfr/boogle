# Boogle codebase brief (state as of commit 26942e2, 2026-10-28)

Sources are repo-relative paths in /Users/matiasfranco/Developer/boogle. Total game + server code is ~9.1k lines (wc over src/, server/src).

## What can a player do right now, and what is the vibe/genre?

### Takeaway
Boogle is a cozy, drop-in, co-op physics sandbox on a small beach island for 1-6 friends: a single shared beach ball, shapeable sand, a live water sim fed by a hill spring, a bouncy-mushroom patch, a wandering NPC and a shared day/night sky. There are no goals, scores, timers or competition; everything is a toy.

### Cited Findings
- Pitch: "a drop-in island for a handful of friends: one beach ball, sand you can shape, water that flows where you let it, and a shared garden that keeps growing while nobody is online." — [DESIGN.md](DESIGN.md)
- Intended core loop: water glues ball and farm; dig channels/pile sand to steer water; crops grow where wet; tide is the shared threat; ball floats/splashes/waters/knocks down walls; garden persists. Only parts of this exist today (see gaps). — [DESIGN.md](DESIGN.md), [PLAN.md](PLAN.md)
- Movement: walk (5.6 m/s), sprint (9.5 m/s, Shift / L3), jump with coyote time (Space / A), swim at 0.55x speed in sea/sim water. — [src/physics.js](src/physics.js) lines ~71-99, [src/player.js](src/player.js)
- Ball verbs: grab/throw with hold-to-charge (E or click / X; charge saturates at 900 ms), steal a held ball, walk into a slow ball to push it (auto-claims ownership), respawn ball (R / B), bump/volleyball dig (V / touch "Bump"; ~2.4 m rise, ~1 s hang, 300 ms cooldown, reach 3.4 m vs grab 2.4 m). — [src/input.js](src/input.js), [src/ball.js](src/ball.js), [src/features/bump.js](src/features/bump.js)
- Ball physics: floats in the sea and in sim water, drifts in surf, sim-water currents push it (flowMax 2.6 m/s); a fast landing in a pool "sloshes" water outward (shared edit). — [src/world/water-world.js](src/world/water-world.js) WATER_CONFIG, [src/sim/water-region.js](src/sim/water-region.js)
- Impact pack: squash-and-stretch, ~50 ms hit-stop on catches, sand puffs, pitched "boing"; a fast ball to your head face-plants you (published as presence field `kd`). — [src/features/impact.js](src/features/impact.js)
- Sand verbs (shovel mode, F / LB): dig (Q / RT), pile (Z / LT), flatten (Shift+click / RB); 5x5 brush (40 cm centre, 20 cm ring, 5 cm rim), bucket of 1600 cm-units (~13 digs), sand conserved, max ±150 cm from base, hold-and-drag carves a path, target ring turns red with a reason. Only beach/shallows band (base -120..160 cm) and the court are editable; rock, grass and the garden patch are not. — [src/world/terrain-logic.js](src/world/terrain-logic.js), [src/world/terrain-edits.js](src/world/terrain-edits.js), [PLAN.md](PLAN.md) Phase 3
- Water: a hill spring at (-12, -9) pours 8 cm/tick into one cell, making a stream to the sea; players dig channels to redirect it; holes at the shore fill to sea level. — [src/world/water-world.js](src/world/water-world.js)
- Mushrooms: a stall hands out 5 seeds + a watering can; bury a seed in a 10x10-cell dirt patch, water it with the can, it grows (40 ticks = 4 s) into a big flat-topped mushroom that bounces players and the ball (BOUNCE_SPEED 15). — [src/mushroom-garden.js](src/mushroom-garden.js), [src/sim/mushrooms.js](src/sim/mushrooms.js)
- Social: ping (G / middle-click / D-pad left) drops context markers "Ball!", "Dig!", "Look!"; honk (T / Y) with per-colour pentatonic pitch, and 3+ different players honking within 1 s make a chord with sparkles. — [src/features/ping.js](src/features/ping.js), [src/features/honk.js](src/features/honk.js), [src/sim/social.js](src/sim/social.js)
- The Boogler: a wide, squished NPC that waddles around; host decides his path (presence field `g`), kinematic body so the ball bounces off him and players can hop on his head. — [src/boogler.js](src/boogler.js)
- Day/night: 20-minute day, sun up 60% of it, 8-day lunar cycle, smiling sun and phased moon, lighting follows; pure function of world tick. — [src/sim/sky-clock.js](src/sim/sky-clock.js), [src/sky.js](src/sky.js)
- Rooms per friend group via `?room=<name>`; no lobby, start button or minimum players. — [src/net/README.md](src/net/README.md), [DESIGN.md](DESIGN.md) principle 8
- Only one playtest logged (2026-10-28, "looks like it's working"); no data yet on whether mechanics are fun. — [docs/playtests.md](docs/playtests.md)

### Inferences
- The genre is "friends' hangout toy" (Townscaper/Animal Crossing tone plus slapstick physics), explicitly co-op; the only light competition contemplated is water polo (stretch).
- The water+sand toy is the most developed system; the "farm" half is a placeholder (mushrooms) and the "threat" half (tide, weather) does not exist yet.

### Gaps
- No telemetry or playtest evidence on which verbs people actually use.

## Which extension points make a new mechanic cheap vs expensive?

### Takeaway
Cosmetic/local or presence-only mechanics are cheap (one file in src/features/, frame hooks, presence fields, reliable room messages). Anything that changes shared world state is more expensive: it needs a pure integer sim module in src/sim/ with unit tests, a registered op (validate/apply) and state (serialize/load/hash), deterministic ordering in onTick, and possibly snapshot-size care.

### Cited Findings
- Plug-in model: a new feature is `src/features/<name>.js`, auto-loaded via `import.meta.glob('./features/*.js', { eager: true })`; its CSS is imported by the feature; its DOM is created in JS (not index.html). — [src/main.js](src/main.js), [AGENTS.md](AGENTS.md)
- Frame hooks: `onFrame(fn, { phase, order })` with phases `world` (after physics step), `update` (after camera/visual sync, default), `late` (before render); `onStart(fn)` runs once after input/lobby/network start. — [src/loop.js](src/loop.js)
- ESLint enforces boundaries: features may not import other features (share via src/); `src/sim/**` may not import three, cannon-es, parent dirs, or use window/document/navigator/localStorage; only `src/net/**` may import peerjs. — [eslint.config.js](eslint.config.js)
- Hotspots to touch by at most a line or two: src/main.js, src/style.css, index.html, PLAN.md. — [AGENTS.md](AGENTS.md)
- Presence extension (cheap, unreliable channel, latest wins): `addPresenceField(key, getter)` merges a small JSON value into your presence; `onRemotePresence(fn)`; `onRoomReady(fn)`. Example: face-plant `kd`. Presence sent every 50 ms (SEND_MS), interpolated over 120 ms. — [src/net.js](src/net.js), [src/constants.js](src/constants.js), [src/features/impact.js](src/features/impact.js)
- Reliable cosmetic messages (cheap, no shared state): `room.send(msg)` / `room.onMessage`, validated and rate-limited on receipt; used by ping and honk. — [src/net/README.md](src/net/README.md), [src/sim/social.js](src/sim/social.js)
- Shared-state contract: `registerOp(op, { validate(edit, ctx) /*host only*/, apply(edit, tick) /*everyone, integers only*/ })`, `registerState(key, { serialize, load, hash })`, `onTick(fn)` in registration order after that tick's edits, `onApplied(fn)` for render hooks, `onSnapshot(fn)` to rebuild meshes, `submitEdit({ op, i, j, ...args })` from any client (sync adds `p` = player id). TICK_MS = 100 (10 ticks/s). `world.tick`, `world.seed` (20261028), `world.epochMs` (host-fixed wall clock for offline growth). — [src/world/README.md](src/world/README.md), [src/world/sync.js](src/world/sync.js)
- Ordering inside a tick: apply edits in host sequence order, then onTick handlers in registration order (water-world imports terrain-edits first so the terrain mesh flush precedes water step). — [src/world/README.md](src/world/README.md), [src/world/water-world.js](src/world/water-world.js)
- Units: heights and water depths are integer centimetres (Int16/Int32); grid is 129x129 cells over 160 m (CELL = 1.25 m), `heights[i][j]` at x = i*CELL - HALF, z = HALF - j*CELL. — [src/world/README.md](src/world/README.md), [src/constants.js](src/constants.js)
- Existing shared ops: `dig`, `pile`, `flatten` (terrain), `slosh` (water), `mush.plant`, `mush.water`. Existing states: `terrain`, `water`, `mushrooms`. — grep of registerOp/registerState in src/
- Water sim API supports more than is used: `addWater`, `removeWater`, `setSource/clearSource`, `setSeaLevel`, `wake(i,j,r)`, evaporation (thin isolated films die every 20 ticks), active-cell sleeping, sea-edge reservoir, `stats().seaNet`. — [src/sim/water.js](src/sim/water.js) header
- Seeded RNG: `mulberry32` in src/sim/rng.js; integer hashing for noise. — [AGENTS.md](AGENTS.md), [src/math.js](src/math.js)
- Host-authoritative but non-deterministic entities are allowed if published via host presence (Boogler pattern: host brain with floats + seeded RNG, others interpolate, solo tabs simulate locally). — [src/boogler.js](src/boogler.js), [DESIGN.md](DESIGN.md) "Clear authority"
- Ball authority is owner-based with an epoch rule; the ball's effects on the grid must be emitted by the owner as ordinary edits (slosh is the precedent). — [DESIGN.md](DESIGN.md), [docs/research/water-farming-multiplayer.md](docs/research/water-farming-multiplayer.md) section 4
- Snapshot transport limits: snapshots are chunked at 7000 chars/message, max 400 chunks; single edit JSON max 1000 chars; server stores snapshots up to 256 KB per room, 30 PUTs/min/IP; host saves every 30 s. — [src/world/sync.js](src/world/sync.js), [server/README.md](server/README.md)
- Edit latency: host stamps edits 3 ticks ahead; clients run ~1.5-2 ticks behind host; hash every 20 ticks (2 s), mismatch triggers snapshot resync. — [src/world/sync.js](src/world/sync.js)
- The world keeps ticking in a hidden tab via a worker clock (important when the host tabs away). — [src/world/background.js](src/world/background.js)

### Inferences
- Cheapest class of new mechanic: local juice, presence-driven player states (emotes, poses, carried items visible to others), reliable-message social toys, host-presence NPCs/props.
- Middle: new ops on existing state (e.g. new water ops via addWater/removeWater, new terrain ops reusing the sand layer) — validate/apply plus a test.
- Expensive: new grid-sized state layers (moisture, salinity, mud, crops), anything needing offline growth from epochMs, anything that needs the ball's physical behavior to change shared state (must route through owner-emitted edits).
- A tide is technically close: `setSeaLevel` exists and events are meant to be a pure function of tick + seed.

### Gaps
- Exact water-region dimensions are computed at runtime from the island bounding box (`regionFromBase`, threshold -150 cm, pad 3); I did not run the game to read W x H.

## Which DESIGN.md principles constrain or inspire new mechanics?

### Takeaway
Ten play principles and five technical principles act as hard filters: toy-first, ball stays the star, farming optional, automatic cooperation, environment-only antagonist, personal rewards, telegraph 30-60 s ahead, drop-in/out, persistence for the next visitor, slapstick over precision; plus determinism, sync edits not state, clear authority, PeerJS only, small and readable.

### Cited Findings
- 1 Toys before chores: fun with no score/crops/tide; avoid scores, timers or quotas as motivation. — [DESIGN.md](DESIGN.md)
- 2 The ball stays the star: new systems give the ball more to do (float, splash, water plants, break walls, launch harvests), never compete with it. — [DESIGN.md](DESIGN.md)
- 3 Farming is never required: no locking movement, areas or ball features behind progress. — [DESIGN.md](DESIGN.md)
- 4 Cooperation is automatic, not negotiated: prefer bonuses for different people helping over one person grinding. — [DESIGN.md](DESIGN.md)
- 5 Only the world is the antagonist: no PvP destruction or stealing; sand walls may be knocked down (meant to be rebuilt), crops and others' progress protected. — [DESIGN.md](DESIGN.md)
- 6 Communal world, personal rewards: earned cosmetics/skins/hats/seed types are yours; no shared wallets. — [DESIGN.md](DESIGN.md)
- 7 Telegraph everything: events announced 30-60 s ahead with something visible (horizon wave, clouds), not only HUD text. — [DESIGN.md](DESIGN.md)
- 8 Drop-in, drop-out: 1-6 players, no lobby/start/minimum; solo pleasant, joined better. — [DESIGN.md](DESIGN.md)
- 9 Leave something for the next visitor: persistence; growth computed from elapsed time. — [DESIGN.md](DESIGN.md)
- 10 Slapstick over precision: loose physics, collapsing walls, funny moments. — [DESIGN.md](DESIGN.md)
- Technical: determinism (integers, fixed order and tick, seeded RNG, events = f(tick, seed)); cosmetic layer separate; sync edits not state; authority table (client: own movement; owner: ball; host: water/terrain/garden/weather/Boogler/persistence); PeerJS only, no alternate transports; small and readable, measure before optimizing, sleep settled regions before workers/GPU. — [DESIGN.md](DESIGN.md)
- Process: every feature names the principle it serves (commit or PR body); changing a principle is a commit to DESIGN.md with reason. — [DESIGN.md](DESIGN.md), [AGENTS.md](AGENTS.md)
- A keepy-uppy streak was built then cut in a design pass (consistent with "no scores"). — [PLAN.md](PLAN.md) Phase 2, git log `6d5c880 Remove keepy-uppy streak`
- The earlier garden sim was removed; farming is "on hold" while the design is reworked by hand. — [PLAN.md](PLAN.md) Phase 5, git log `cee5df0`, `b03828e`

### Inferences
- Ambitious mechanics most likely to be accepted: ball-centric interactions with water/sand (dams, wheels, gates, floods), environmental events with visible telegraphs (tide, rain, storms), multi-player emergent co-op (distinct-helper bonuses), persistent shared artifacts.
- Likely rejected: anything with scoreboards as the reason to play, PvP destruction, gated progression, precision-skill challenges, or a new transport/server authority.

### Gaps
- No explicit statement on how hard the tide should be; listed as an open question in PLAN.md.

## Which gamepad slots are free; any layout limits?

### Takeaway
Of 16 standard-mapping slots, 13 are taken; only `view`, `r3` and D-pad `right` are free. Sticks are fixed (left moves, right looks). The rule is: a new key/touch control must also claim a pad slot, and if none is left, rethink the layout rather than add a key-only control. Bump (V) currently has no pad slot.

### Cited Findings
- Slot list (W3C standard order): a, b, x, y, lb, rb, lt, rt, view, menu, l3, r3, up, down, left, right; one action per slot, clashes logged and the later action stays unbound; `freeSlots()` lists free ones. — [src/controls.js](src/controls.js)
- Taken: a Jump; x Grab/throw (hold to charge); b Bring ball back; lb Shovel on/off; rt Dig (hold); lt Pile (hold); rb Flatten (hold); l3 Sprint (hold); up Camera closer; down Camera farther. — [src/input.js](src/input.js) lines ~218-232
- y Honk — [src/features/honk.js](src/features/honk.js); left Ping — [src/features/ping.js](src/features/ping.js); menu Show/hide pad help — [src/features/gamepad.js](src/features/gamepad.js)
- Bump registers a V key and a touch button but no `registerAction` call (grep shows none in bump.js). — [src/features/bump.js](src/features/bump.js)
- Rule: "Every control is playable on a Backbone-style gamepad... If none is left, rethink the layout instead of adding a key-only control." — [AGENTS.md](AGENTS.md)
- Keyboard keys in use: WASD/arrows, Space, Shift, E, R, F, Q, Z, H (help), V, G, T, plus click/middle-click. — [src/input.js](src/input.js), feature files
- The touch overlay hides while a pad is in use; touch has buttons for grab, shovel, dig, pile, flatten, bump, ping, honk. — [src/features/gamepad.js](src/features/gamepad.js), [src/input.js](src/input.js), feature files

### Inferences
- Effectively 2-3 slots remain (view, r3, right), and Bump arguably should claim one. A mechanic needing several new buttons must be context-sensitive (reuse X "use" or the shovel mode/tool concept, like the watering can and seed tool in the mushroom garden) or introduce a tool-wheel/mode cycle.
- The shovel occupies four slots (lb, rt, lt, rb); a "tool mode" abstraction where triggers mean different things per tool is the obvious way to scale.

### Gaps
- How the watering can/seed tool are triggered on gamepad (likely via the X "use" action) was not traced line by line.

## What scenario/look tooling exists to validate a prototype?

### Takeaway
A Playwright-based harness (`npm run look`, `npm run scenario -- <name>`) launches Vite plus a local signaling server, drives headless Chromium with one or more real networked players, and produces stills, motion contact sheets, temporal heatmaps, a motion score and PASS/FAIL checks on game state.

### Cited Findings
- `npm run look -- --view <spring|stream|mouth|court|overview>` or `--cam x,y,z --look x,y,z`; outputs `<name>-still.png`, `-motion.png`, `-heat.png` and a motion score (calm scene < 1); `--eval file.js`, `--warm N` (sim warms slowly at ~10 fps headless), `--region`, `--hud`. Views table in `dev/look/lib.mjs`. — [.claude/skills/look/SKILL.md](.claude/skills/look/SKILL.md)
- Scenarios: `dev/scenarios/<name>.mjs` exporting `{ about, run(t) }`; API `t.open({ name, room })` opens real peers in the same room; `g.eval`, `g.waitFor`, `g.view`, `g.key`, `g.still`, `g.motion`, `g.fps`, `t.check`. Not part of `npm run check` (15-80 s each). — [.claude/skills/look/SKILL.md](.claude/skills/look/SKILL.md)
- Existing scenarios: dig-channel, spring-stream, two-player-dig. — [dev/scenarios/](dev/scenarios)
- Other dev tools: `dev/water-lab` (debug viewer + bench for the water sim), `dev/peer-test` (headless network test, `npm run test:net`), `?netdebug=1`, `?debugcam=1`, `window.boogle` and `window.__water` console handles. — [dev/](dev), [src/main.js](src/main.js), [src/features/debug-cam.js](src/features/debug-cam.js)
- Unit tests (node:test, each well under a second) cover sim/world logic: background, controls, mushrooms, sky-clock, social, terrain-edits, water-region, water, world-sync. — [test/](test), [AGENTS.md](AGENTS.md)
- `npm run check` = lint + unit + build (seconds); `npm run check:full` adds server tests and net test (~30 s). — [package.json](package.json), [AGENTS.md](AGENTS.md)
- Claude Code skills in repo: look, new-feature, ship, playtest-notes, game-feel, audio-design, camera-systems, threejs-* references. — [.claude/skills/](.claude/skills)

### Inferences
- A prototype of a shared mechanic can be validated end-to-end without humans: pure sim unit test (determinism/conservation), then a two-player scenario asserting both peers converge, then look stills for visuals.

### Gaps
- None material.

## Rendering, physics, networking stack and performance constraints

### Takeaway
three.js r186.1 + cannon-es 0.20.0 + PeerJS 1.5.5, bundled with Vite 6, deployed to GitHub Pages; host-peer star topology with host migration; recent commits are all about trimming draw calls, so the frame budget is being watched closely (target devices include iPhone/iPad with Backbone).

### Cited Findings
- Dependencies: three 0.186.1, cannon-es 0.20.0, peerjs 1.5.5 (only three runtime deps). — [package.json](package.json)
- Physics: fixed step 1/60 s, up to 4 substeps, gravity 18; terrain is a cannon Heightfield updated on edits; ball radius 0.45, mass 0.6; player radius 0.45, mass 70. — [src/constants.js](src/constants.js), [src/main.js](src/main.js)
- Frame order: updateRemotes, resolveBallOwner, updateIntent, prepareBall, world.step, afterStep, `world` hooks, syncVisuals, camera, clouds, `update` hooks, preview, HUD, `late` hooks, presence send, render. — [src/main.js](src/main.js)
- Water rendering: sea shader plane plus a second surface mesh over the sim region from the depth grid; cosmetic ripples/splashes local. — [PLAN.md](PLAN.md) Phase 4, [src/water-surface.js](src/water-surface.js), [src/water-render.js](src/water-render.js)
- Recent perf commits: skip shadow pass while key light is off (saves ~30-160 draw calls on new-moon nights), coarser sea mesh, draw each mushroom's spots as one mesh; props merged into one draw call. — git log `26942e2`, `27c60ba`, `f3645b7`; [src/props.js](src/props.js)
- Network topology: one browser registers `boogle-<room>-host`; others connect to it (star), host relays presence; on host loss clients race to claim the ID (migration); unreliable channel for presence/ball, reliable ordered channel for edits; messages capped at 16 KB. — [PLAN.md](PLAN.md) "Key decision", [src/world/sync.js](src/world/sync.js)
- Server: Express + `peer` (signaling), `/ice` (STUN, optional TURN), `GET/PUT /rooms/:id/snapshot` (JSON file per room, newest tick wins). — [server/README.md](server/README.md)
- Sim performance guidance: active-cell sleeping first; workers/GPU only after measuring; GPU float results differ across devices so GPU only for cosmetic water. — [DESIGN.md](DESIGN.md), [docs/research/water-farming-multiplayer.md](docs/research/water-farming-multiplayer.md)
- Host carries more CPU/upload; open question whether that's OK past ~8 players. — [PLAN.md](PLAN.md)

### Inferences
- Large new physics populations (many cannon bodies) or extra full-screen passes would cut against current perf work on mobile; instanced/merged meshes are the established pattern.

### Gaps
- No measured frame-time or draw-call budget figures are documented.

## PLAN.md roadmap: what is done and what is still wanted?

### Takeaway
Phases 0-4 are essentially done (modules, PeerJS networking, splashes, dig/pile with sand fun pass, living water with spring). Unchecked: server deploy + TURN, latency measurement, water sim in a Web Worker, the whole garden phase (on hold; only the mushroom stall exists), the whole tide phase, and all stretch ideas except gamepad.

### Cited Findings
- Done: Phase 0 (ES modules, Vite, Prettier/ESLint); Phase 1 except deploy/measure (peer-room, reliable channel, server code, GitHub Pages); Phase 2 (splashes, surf drift; keepy-uppy cut); Phase 3 fully (dig/pile/flatten, host validation, mesh/physics/height texture updates, terrain diff persisted, sand fun pass); Phase 4 except worker (2.5D integer column sim, active cells, spring, surface mesh, ball floats and slosh edits); Phase 5 only "Mushroom stall"; stretch "Gamepad play". — [PLAN.md](PLAN.md)
- Unchecked Phase 1: deploy `server/` to Fly.io with TURN credentials; measure ball latency for non-owners and connection failures without TURN. — [PLAN.md](PLAN.md)
- Unchecked Phase 4: run the sim in a Web Worker on every client with host snapshot+hash. — [PLAN.md](PLAN.md)
- Unchecked Phase 5 (on hold, "kept for reference"): soil hydration within N cells of water made visible; plant/water/harvest crops that grow only while hydrated; growth from timestamps (`plantedAt`, hydrated time) so the garden grows offline; visitor bonus for each different player watering today with "watered by 3 friends" sparkles; harvest-and-launch (ripe melons/coconuts as throwable props tossed into a cart for an island-wide total); personal cosmetic rewards. — [PLAN.md](PLAN.md)
- Unchecked Phase 6 (tide): telegraphed tide every few minutes, warning 30-60 s ahead, pure function of tick + seed; rising sea floods low cells into the sim, sand walls hold it back, sim erodes weak walls; throw the ball at a weak wall to release water. Playtest question: fun or stressful? — [PLAN.md](PLAN.md)
- Stretch (unchecked bullets): weather cycle (rain refills ponds, droughts dry them); water polo with sand-gate goals; ball-powered water wheel lifting water to a terrace; "r/place garden" one-seed-per-few-minutes mosaic; mud and erosion (wet sand slows players, plants anchor soil). Explicit skip: full 3D voxel fluid. — [PLAN.md](PLAN.md)
- Open questions: hosting/TURN provider; host load; one island vs rooms; tide difficulty (toy vs can lose the garden). — [PLAN.md](PLAN.md)
- Research ranked idea list (design judgments, not playtest data): #1 Sandcastle vs Tide (5 stars), #2 irrigation/hydration glow, #3 persistent communal garden with distinct-visitor bonus (5 stars), #4 buoyant ball + splash wets soil, #5 water polo/keepy-uppy, #6 drought/rain, #7 salt tide kills crops, #8 ball-powered water wheel, #9 harvest-and-launch, #10 r/place garden, #11 mud and erosion (hard), #12 3D voxel fluid (skip). — [docs/research/water-farming-multiplayer.md](docs/research/water-farming-multiplayer.md) section 3

### Inferences
- The obvious "ambitious next" candidates the team already wants: the tide (closest technically, highest-rated), weather, a reworked hydration-based garden with offline growth, and ball-water machines (wheel, gates).

### Gaps
- Why the original garden sim was cut is not documented beyond "design is being redone by hand".

## Known gaps, TODOs, half-built systems an ambitious mechanic could build on

### Takeaway
No TODO/FIXME markers exist in src/server/dev; the half-built pieces are structural: unused water-sim capabilities (sea level, sources, removeWater), `world.epochMs` reserved for offline growth but unused, a mushroom "garden" whose watering ignores the real water sim, no weather/tide modules despite README mentions, and an off-thread worker not yet built.

### Cited Findings
- grep for TODO/FIXME/XXX/WIP in src, server/src, dev returned nothing. — repo grep
- `setSeaLevel(cm)` exists in the water sim; water-world pins deep sea cells to `water.seaLevel` after each step; nothing calls setSeaLevel over time (no tide). — [src/sim/water.js](src/sim/water.js), [src/world/water-world.js](src/world/water-world.js)
- No source file references tide or weather/rain beyond comments; README lists "weather, tide" as world responsibilities. — repo grep, [src/world/README.md](src/world/README.md)
- `world.epochMs` is set by the host on first start and carried in snapshots "for offline growth", but mushrooms grow by tick count (`tickGarden` increments g each tick up to 40), so nothing grows from elapsed real time. — [src/world/sync.js](src/world/sync.js), [src/sim/mushrooms.js](src/sim/mushrooms.js)
- Mushroom watering is a binary `mush.water` edit from the watering-can tool (g 0 -> 1), not driven by sim water depth; the garden patch is excluded from sand editing. — [src/sim/mushrooms.js](src/sim/mushrooms.js), [src/world/terrain-edits.js](src/world/terrain-edits.js)
- Water evaporation exists only as thin-film cleanup; there is no rain source or drought sink. — [src/sim/water.js](src/sim/water.js)
- Sand never erodes; walls only change via player edits (PLAN wants sim erosion of weak walls). — [src/world/terrain-logic.js](src/world/terrain-logic.js), [PLAN.md](PLAN.md) Phase 6
- The ball's only shared-state effect is slosh; it cannot break walls or water soil yet. — [src/world/water-world.js](src/world/water-world.js)
- No personal progression/cosmetics/inventory system exists (principle 6 anticipates one); player colour from 8 COLORS and name are the only identity. — [src/constants.js](src/constants.js), [DESIGN.md](DESIGN.md)
- Bump lacks a gamepad slot (rule gap). — [src/features/bump.js](src/features/bump.js)
- Ops/infra gaps: server not deployed (free public PeerJS signaling used without VITE_BOOGLE_SERVER), no TURN. — [PLAN.md](PLAN.md), [src/net.js](src/net.js)
- Git history shows rapid agent-driven iteration on main (60 commits; recent focus: perf, gamepad registry, ESLint boundaries, look harness, social features). — `git log --oneline -60`

### Inferences
- High-leverage foundations for ambitious mechanics: (a) a tide/weather scheduler module in src/sim/ as a pure f(tick, seed) driving setSeaLevel and sources, with sky/cloud telegraphs reusing sky.js; (b) a per-cell integer moisture/salinity layer read from water depth (enables hydration-driven garden, salt tide, mud); (c) owner-emitted ball edits beyond slosh (wall knock-down via a terrain op, splash-watering); (d) epochMs-based offline growth; (e) a tool-mode abstraction to free gamepad slots.

### Gaps
- Did not run the game; claims about feel are from code and docs only.
