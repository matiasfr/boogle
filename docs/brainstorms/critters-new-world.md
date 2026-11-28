> **Status: proposed (2026-11-28).** Light one-pass brainstorm (one agent, three lenses: Play Designer, Systems Architect, Creative Director) and author design review for the P3 backlog row **"Critters and life for the new environments"** ([backlog](../backlog.md); [decision](../decisions-process.md#d-2026-11-28-backlog-beyond-rail-rules)). Baseline: `origin/main` `860e2de21`. Active jobs in flight ([orchestrator-state](../agents/orchestrator-state.md)): `codex/lane-b-conversions`, `codex/lane-b-preleg`, `codex/lane-c-part7` (Canopy Town Offer 1), and `codex/rule-rebase-tool` — none touch `src/features/critter-*.ts`, and this brief stays away from every town plot at Home, Ring Island, High Gorge, and Canopy. All critter names and any player-facing words below are `[placeholder]` for the owner ([d-2026-11-11-the-story-and-characters-are-the-owner-s](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s)); none of The Boogler's copy, story, characters, or names are touched.

# Critters and life for the new environments

**Seed** (owner, 6, 11, and 28 November 2026):
> "fish and gulls now live on the classic island only; give the new world its own critters and life" (6 November); "seem like things that'll be great to flesh out the game world and make it feel alive" (11 November); "2. yes please!" (28 November).

**Standing research:** [creature-ai-and-ecosystems.md](../research/creature-ai-and-ecosystems.md) — Tier 1 purely cosmetic, local, float-based, one `InstancedMesh` per species with vertex-shader animation; many, cheap, and reactive, with no ecosystem, no population sim, and no loss states.

---

## Pitch

Right now Boogle's three critter features (`src/features/critter-fish.ts`, `critter-gulls.ts`, `critter-fireflies.ts`) only spawn around the classic Original Island (`whileNearClassicIsland`), leaving the entire playable Sickle Isles archipelago — from the Camp ridge where a fresh guest lands to the sea cave and White Wall — without small reactive life. This brief maps a lightweight, **strictly view-only and local** roster of 2–3 cheap instanced critters per area across the route, reacting to **players, the beach ball, passing trains, the waking track layer, and tree chops**, with **zero sim, server, wire, or save changes, zero ecosystem simulation, and zero new gameplay rules or rewards**.

**Build 1 starts on Home's wilds — the Camp ridge, river gorge, and west cove (`src/features/critter-home.ts`)** — completely clear of the Round's town plots (`VILLAGE`, `TOWN_PLOTS`) and the outer towns' plot reserves. Because fresh guests now land on the Camp ridge (`CAMP_PAD`, [d-2026-11-28-first-fall-lands-at-the-works](../decisions-controls.md#d-2026-11-28-first-fall-lands-at-the-works)) and cross the river gorge on line 1 in their first two minutes, Home's wilds put living, reactive motion right in front of every new player on second 0, in one small plug-in feature provable in a single look pass.

**Principles served:** **2. Physics toys are optional fun** (ball splashes still scatter fish and gulls), **3. Side activities are never required** (pure decoration, zero gates), **8. Enjoyable alone and together** (the world feels alive in the first two minutes for solo players and drop-in guests), **10. Slapstick over precision** (flocks bursting off the ridge when you sprint, chop, or wake the track layer), **11. Show, don't tell** (critters telegraph water depth, river channels, and approaching trains by scattering), and **Pick how each feature shares state** (Local — cheapest kind that works). **Principles bent:** None.

## Gut question

When a fresh guest lands on the Camp ridge, chops their first tree, and watches the track layer cross the gorge bridge in their first two minutes, do the scattering birds, fluttering meadow motes, and darting river fish make the island immediately feel alive without distracting from the works?

---

## Route critter map: what lives where

Every entry below is **Tier 1 Local** (no sim, server, wire, or save state; no colliders; no ecosystem; no rewards). Every name is a `[placeholder]` for the owner. All placements stay clear of town plots (Home's Round, Ring Island's plot pad, High Gorge's `TOWN_PAD`, Canopy's `stand-in town`, Port Quay's town reserve).

| Place | Critter (`[placeholder]`) | Reaction to player or train nearby | Reuses / copies |
| --- | --- | --- | --- |
| **Home (Camp ridge, river gorge & west cove)** *(Build 1)* | `[Placeholder: Gorge Minnows]` (river channel + west cove shallows)<br>`[Placeholder: Ridge Gulls]` (Camp boulders, gorge rim, cove sand)<br>`[Placeholder: Meadow Flutters]` (Camp clearing & gorge banks, daytime) | Minnows scatter when a player swims, the ball splashes, or a train rumbles over the low gorge bridge.<br>Gulls burst into a circling flock when a player sprints, chops a nearby tree, throws the ball, or when the track layer/train passes.<br>Flutters lift and swirl upward when a player walks through or a train whooshes past. | `critter-fish.ts` (boids + TSL tail wiggle)<br>`critter-gulls.ts` (loaf → burst → circle → resettle)<br>`critter-fireflies.ts` drift math + 1-draw instanced V-wing flutter |
| **The Camp & Quarry (Split-rock Works)** | `[Placeholder: Quarry Swifts]` (gorge stem rim & quarry cliff lip)<br>`[Placeholder: Seam Lizards]` (warm sandstone ledges clear of treads & seams) | Swifts wheel off the cliff lip when the quarry train passes or a player breaks a seam.<br>Lizards dart sideways into rock cracks when a player runs within 4 m or a train rumbles past. | `critter-gulls.ts` (circling/roosting variant)<br>New tiny ground-scuttle (1 `InstancedMesh`, 4-state idle/dart/hide) |
| **Ring Island** *(outer shore & sea cutting, away from town plots)* | `[Placeholder: Crossing Gulls]` (shore rocks & outer bents)<br>`[Placeholder: Reef Dartfish]` (clear turquoise shallows around the ring)<br>`[Placeholder: Clover Flutters]` (meadow slopes outside the town pad) | Gulls lift off the shore and bank alongside incoming trains over the crossing.<br>Dartfish burst outward from swimmers or splashes.<br>Flutters rise in a puff when a player glides or sprints past. | `critter-gulls.ts`<br>`critter-fish.ts`<br>`critter-home.ts` flutters |
| **High Gorge** *(split channel & sheer stack ledges, away from `TOWN_PAD`)* | `[Placeholder: Canyon Swallows]` (high circling in the 90 m split)<br>`[Placeholder: Split-Water Fish]` (deep blue channel at the stack feet) | Swallows swoop through the split and flare upward when a train exits the incline bore or a player hooks/glides past.<br>Fish dart away from splashes and the train rumble along the low 3 m halt deck. | `critter-gulls.ts` (high-banked flight loop)<br>`critter-fish.ts` |
| **Bell Rock** *(two-level skerry, lower water deck & upper bay lip)* | `[Placeholder: Skerry Terns]` (roosting on lower shore rocks & upper parapet ends)<br>`[Placeholder: Tide-Pool Minnows]` (water between the lower bents) | Terns burst off the rocks when either the lower incline train or upper bay train rolls through.<br>Minnows scatter when a player jumps off the lower deck or a train passes overhead. | `critter-gulls.ts`<br>`critter-fish.ts` |
| **Canopy** *(forest floor, cleft mouth & mother-tree trunks, away from `stand-in town`)* | `[Placeholder: Canopy Flutters]` (bright sunlit drifts around the 120 m mother trunks)<br>`[Placeholder: Bark Gliders]` (small perched silhouettes hopping between trunk ribs)<br>`[Placeholder: Cleft Swifts]` (wheeling at the chalk cleft mouth) | Flutters eddy upward in a player's glide wake or as the bay train enters the cleft.<br>Bark gliders hop higher up a trunk when a player approaches.<br>Swifts flare out of the cleft ahead of an arriving train. | `critter-home.ts` flutters<br>1-draw instanced trunk-hopper (reuses gull hop/flap)<br>`critter-gulls.ts` |
| **The sea cave & Saltpan** *(hood mouth, wet shore & salt flat)* | `[Placeholder: Cave Glow-Motes]` (drifting inside the dark West hood & interior return)<br>`[Placeholder: Saltpan Skitter-Crabs]` (pale flat & wet shore edge, clear of rail bed) | Glow-motes brighten and swirl in the slipstream when a train bursts through the cave mouth or a player runs under the hood.<br>Crabs scuttle sideways into shallow salt rims when a player walks near or the cave train rolls past. | `critter-fireflies.ts` (always-on inside cave bounds, no night gate)<br>Ground-scuttle variant (1 `InstancedMesh`, TSL leg wiggle) |
| **Port Quay** *(harbour basin & breakwater, away from town reserve)* | `[Placeholder: Harbour Pelicans]` (chunky white-and-ochre birds on breakwater rocks & moorings)<br>`[Placeholder: Basin Sardines]` (dense shimmering school in the calm harbour basin) | Pelicans lift into slow low glides over the basin when a train brakes into the quay or a player runs along the breakwater.<br>Sardines flash and split when a player dives in or the ball splashes. | `critter-gulls.ts` (heavier wingbeat, wider glide radius)<br>`critter-fish.ts` (tighter schooling) |
| **The White Wall** *(six chalk islets & deep span)* | `[Placeholder: Chalk Gulls]` (wheeling along the pale stepped cliff faces)<br>`[Placeholder: Deep-Span Fish]` (wide deep-water schools visible beneath the high bents) | Gulls peel off the chalk ledges and pace beside the express/service train as it crosses each islet.<br>Fish dart aside under the moving train shadow. | `critter-gulls.ts`<br>`critter-fish.ts` |
| **Lantern Notch** *(limestone arch & reef)* | `[Placeholder: Lantern Moths]` (warm additive motes orbiting the yellow lantern post & arch opening)<br>`[Placeholder: Arch Swifts]` (nesting on the outer limestone shoulders) | Moths swirl outward when a player approaches the lantern post and settle back around the light.<br>Swifts wheel through the sky hole when the Notch train arrives. | `critter-fireflies.ts` (always-on around the lantern, no night gate)<br>`critter-gulls.ts` |
| **The causeway & Original Island** | `[Placeholder: Causeway Mullet]` (schools threading between the causeway bents)<br>**Original Island keeps existing** `critter-fish.ts`, `critter-gulls.ts`, `critter-fireflies.ts` untouched | Causeway fish scatter under the arriving train and bridge the visual handoff to the classic island's own beach gulls and shallows fish. | `critter-fish.ts` (causeway bents); existing classic features untouched |

---

## Best suggestions (ranked)

1. **`[Play]` + `[Creative]` Build Home's Camp ridge, river gorge, and west cove first (`src/features/critter-home.ts`) — the exact stretch a fresh guest plays in minutes 0–2.** Since [d-2026-11-28-first-fall-lands-at-the-works](../decisions-controls.md#d-2026-11-28-first-fall-lands-at-the-works) moved the first landing onto `CAMP_PAD` (`local (-13, -163)`, `y = 30 m`), a newcomer spends their first two minutes chopping trees on the Camp ridge, feeding Station 1, and watching the track layer cross the river gorge bridge. Placing `[Placeholder: Ridge Gulls]`, `[Placeholder: Meadow Flutters]`, and `[Placeholder: Gorge Minnows]` on that stretch makes the opening feel immediately alive while staying >100 m clear of Home's town plots (`VILLAGE`, `TOWN_PLOTS`).
2. **`[Creative]` + `[Systems]` Replace night-only fireflies with daytime `[Placeholder: Meadow Flutters]` on sunlit areas, and save glow-motes for the sea cave and Lantern Notch.** `critter-fireflies.ts` hides completely whenever `skyNow.day >= 0.35`, and Boogle's default sky is fixed in late-morning daylight ([d-2026-11-05-early-evening-look-exception](../decisions-look.md#d-2026-11-05-early-evening-look-exception)). Tiny 2-triangle V-wing flutters (1 `InstancedMesh`, TSL vertex wing-flap, warm cream/gold/sky tints) read crisply in bright Sunshine daylight on Home, Ring Island, and Canopy, while `critter-fireflies.ts`'s additive glow sprites get a real daytime home inside the shaded sea-cave hood and around Lantern Notch's lamp.
3. **`[Play]` + `[Systems]` Add view-only train, track-layer, and tree-chop scare sources alongside running players and ball splashes.** Classic critters only react to swimming/running players and the beach ball. In the new world, the railway is the star: reading live locomotive poses and the track-layer position (view-only, allocation-free) lets ridge gulls burst into the air the moment the track layer wakes or a train rumbles across the gorge bridge, and lets gorge minnows scatter under passing cars — tying ambient life directly to the core loop with zero server or sim changes.
4. **`[Systems]` Generalize `classic-zone.ts` into a tiny shared residency + creature-pool pattern so later areas plug in cleanly.** Classic critters import `src/island/terrain.ts` (`groundHeight`, classic island only) and `whileNearClassicIsland` (origin `(0, 0)`). Home critters must read `src/place/terrain.ts` (`H(wx, wz)`) and `waterField.surfaceAt(x, z)` and sleep outside Home (`ENTER = 260 m`, `LEAVE = 300 m` around `ORIGIN`). Outer islands can key residency directly off `routeAreas.get(id)?.mounted` (`src/entities/route-greybox/state.ts`), guaranteeing **at most one area's critters tick or draw at a time**.
5. **`[Creative]` Fold gull body + wings into one vertex-animated `InstancedMesh` (or keep the 2-pool pattern with `castShadow = false` on low detail).** `critter-fish.ts` already demonstrates TSL `positionNode` animation on a single `InstancedMesh` (1 draw for all 36 fish). Using a tiny merged low-poly bird geometry with a TSL vertex wing-flap (masked by `abs(positionGeometry.x)`) cuts gulls from 2 draws to 1 draw and keeps shadows crisp without per-frame wing matrix math on the CPU.

### Real tensions resolved

- **First-minute visibility vs. staying clear of active town-plot work:** `[Play]` wanted critters in the Round where players hang out, while `[Systems]` noted Home's town plots (and Ring Island, High Gorge, Canopy town pads) are active Lane C territory. **Resolved:** Home's wilds — Camp ridge (`local (-20..10, -165..-135)`), the river gorge (`GORGE` arms around `(-56..-41, -77..-88)`), and the west cove (`(-199, 10)`) — are >100 m from `TOWN_PLOTS`, right where every fresh guest lands and works in minutes 0–2, and completely conflict-free.
- **Per-area richness vs. mobile/iPad budget:** `[Creative]` wanted flocks, fish, and insects everywhere along the 12 km route; `[Systems]` flagged draw calls and CPU tick cost on M4 iPad Pro / phone best-effort. **Resolved:** Strict residency (only the player's current area is spawned and ticked), 1 `InstancedMesh` per species, vertex-shader animation, zero per-frame allocations, and Detail-ladder instance scaling (~50% instances, no critter shadows on low detail).
- **Shared co-op "look at that bird!" vs. zero server/wire cost:** `[Play]` asked whether friends need to see the same gull burst (Tier 2 shared schedule from `creature-ai-and-ecosystems.md`); `[Systems]` held the P3 row's strict limit ("view only and local to each player, no sim, server, wire or save change"). **Resolved:** Stay strictly Tier 1 Local. Because both tabs read the same replicated train positions, remote player positions (`remotes`), and beach ball position, two friends standing together see flocks burst at the same moment from the same train or splash even though individual flight arcs are local.

---

## Rough per-area budget (builder intent, not measured)

Per [d-2026-11-28-perf-checks-periodic](../decisions-process.md#d-2026-11-28-perf-checks-periodic) and [performance-guides-not-gates](../agents/owner-calls.md#performance-guides-not-gates), these numbers are **planning intent for the builder, not hard gates and not measured figures**; frame time is checked on the periodic schedule.

| Tier / Scope | Draw calls (intent) | Instances (intent) | Triangles (intent) | CPU update (intent) | Shadows |
| --- | --- | --- | --- | --- | --- |
| **Per resident area (desktop)** | **2–4** (1 per species, 2 if 2-pool gulls) | **50–100** total across 2–3 species | **1,000–3,000** | `< 0.15 ms/frame` (0 heap allocs) | Birds only (optional); fish/flutters/motes off |
| **Per resident area (phone / low Detail)** | **2–4** | **25–50** (~50% via Detail ladder) | **500–1,500** | `< 0.10 ms/frame` | All critter shadows off |
| **Away from area (non-resident)** | **0** | **0** | **0** | `0 ms` (despawned) | None |
| **Build 1 concrete target (`critter-home.ts`)** | **3** (or **4** if 2-pool gulls) | **~90** (40 minnows + 12 gulls + 38 flutters) | **~1,300–1,500** | `< 0.12 ms/frame` | Gulls only on desktop; off on phone |

---

## Shape (Build 1: `src/features/critter-home.ts`)

- **Rough build shape:** **View-only, local plug-in feature.** Zero changes to `src/sim/`, `src/world/`, `src/net/`, `server/`, saves, or `WORLD_NS`. Ships on one proof look without an independent review ([d-2026-11-28-faster-reviews](../decisions-process.md#d-2026-11-28-faster-reviews)).
- **Sync kind:** **Local** for every critter's position, heading, flap phase, and scare timer. Reads existing local/mirrored views read-only (`me.body`, `remotes`, `ballMesh`, `waterField`, `H(wx, wz)`, and live train/track-layer positions).
- **Existing code reused:**
  - Plug-in & entity lifecycle: `onStart` (`src/loop.ts`), `defineKind` / `spawn` / `despawn` (`src/entity/entity.ts`), auto-loaded by `src/main.ts`'s `src/features/*.ts` glob (`docs/agents/plugins.md`).
  - Instancing & TSL shader hooks: `createPool` (`src/render/instances.ts`), `patchNode` (`src/render/material-patch.ts`), `instancedDynamicBufferAttribute` / `positionNode` tail-wiggle pattern (`src/features/critter-fish.ts`).
  - Terrain & water queries on Home: `H(wx, wz)` (`src/place/terrain.ts`), `ORIGIN` / `GORGE` / `PATHS` (`src/place/layout.ts`), `SHORE_LANDING` (`src/place/shore-layout.ts`), `CAMP_PAD` (`src/place/works-landing.ts`), `waterField.surfaceAt(x, z)` (`src/physics/water-field.ts`).
  - Residency & Detail ladder: `resident(d, active, enter, leave)` (`src/render/lod-level.ts`), matching `src/island/classic-zone.ts`.
  - Scare sources: `me` (`src/player/player.ts`), `remotes` (`src/netplay/net.ts`), `ballMesh` (`src/entities/ball/view.ts`), and train/machine positions via a tiny read-only view helper (either reading `inspectRailway()?.machine` + `railwayWorldRead()` / `carPath`, or a 5-line allocation-free read-only `liveTrainPos` array populated by `train-view.ts` — whichever keeps `lint-boundaries.md` cleanest).
- **Files Build 1 touches:**
  - New `src/features/critter-home.ts` (self-contained plug-in: Home residency guard `ENTER 260 m / LEAVE 300 m` around `ORIGIN`, plus `[Placeholder: Gorge Minnows]`, `[Placeholder: Ridge Gulls]`, and `[Placeholder: Meadow Flutters]`, all keeping >40 m clear of `VILLAGE` / `TOWN_PLOTS` and clear of `CAMP_PAD` and track beds).
  - Optional tiny read-only export (5 lines) in `src/entities/railway/state.ts` or `train-view.ts` if needed to read active locomotive positions without allocations.
  - Owning `docs/game-design/` section updated in the same commit.
- **Risks & containment:**
  - *Cluttering the first-frame Camp landing sightline:* Keep gull roosts and flutter zones off `CAMP_PAD` (`(-13, -163)`) and off the direct sightline corridor to the sleeping track layer and Station 1 (place roosts on the outer boulders/ridge rim and gorge banks, ≥8 m off the pad and ≥4 m off track beds).
  - *Fish stranding in the gorge river:* The gorge river (`GORGE.river = 4.5 m`, `GORGE.bed = -2.2 m`) is narrower than the classic island's open beach; clamp minnow school home anchors to verified deep channel points (`depthAt(x, z) > 0.7 m`) under the line 1 bridge and in the west cove, with the same 4-probe deep-water steer and stranded-respawn safety net from `critter-fish.ts`.
  - *Per-frame allocations or background cost when away from Home:* Copy `critter-fish.ts`'s zero-allocation scratch arrays and despawn all three pools via `resident(d, active, 260, 300)` when the player travels past Home.
  - *Classic island regression:* Leave `src/features/critter-fish.ts`, `critter-gulls.ts`, `critter-fireflies.ts`, and `src/island/classic-zone.ts` untouched.

---

## Done means (Build 1: one proof look)

1. **Camp ridge first-minute look (fresh room, `CAMP_PAD`):** `npm run look` from `CAMP_PAD` (`toWorld(-13), -163`) and one step toward Station 1 (desktop 1200 × 750 and 390 × 844 phone portrait). Visible: `[Placeholder: Ridge Gulls]` perched on the outer ridge rocks and `[Placeholder: Meadow Flutters]` drifting over the clearing edges, with the sleeping track layer, camp resident, and Station 1 bill completely unobstructed in the middle third.
2. **Gorge river & reactive burst (motion sheet):** `npm run look` down at the line 1 gorge bridge (`local (-48, -82)`): `[Placeholder: Gorge Minnows]` visibly schooling in the river channel beneath the bridge, scattering when the player splashes in or a train passes overhead; `[Placeholder: Ridge Gulls]` bursting into a circling flock when the player sprints within 4.5 m (or the track layer wakes).
3. **Town-plot clearance & residency off-Home:** Verify zero critters spawn inside `VILLAGE` / `TOWN_PLOTS` (`(-100, 14)`, radius 42 m), and verify on `--rail-seed ring-joined` (at Ring Island, >500 m from `ORIGIN`) that `critter-home` has despawned (`0` active instances / `0` draws). `node dev/ship-check.ts` green.

---

## Open questions

At most five; each proceeds on its recommendation unless the owner says otherwise, and nothing waits for a playtest.

1. **Build Home's Camp ridge, river gorge, and west cove (`src/features/critter-home.ts`) as Build 1 — staying >40 m clear of Home's town plots — before moving down the route one area at a time?**
   - **Recommended:** **Yes.** Fresh guests land on the Camp ridge and cross the gorge bridge in their first two minutes (serving the 120 s checkpoint), and Home's wilds do not collide with any active Lane C town-plot work.
   - Answer: ___
2. **Use daytime `[Placeholder: Meadow Flutters]` (bright sunlit V-wing insects) instead of night-only fireflies on sunlit areas (Home, Ring Island, Canopy), reserving glow-motes for the shaded sea cave and Lantern Notch?**
   - **Recommended:** **Yes.** Boogle's default sky is fixed in late-morning daylight (`skyNow.day >= 0.35`), so night-only fireflies would be invisible; daytime flutters read immediately in normal play.
   - Answer: ___
3. **Let new-world critters react to passing trains, the waking track layer, and nearby tree chops in addition to running players and ball splashes (all local and view-only)?**
   - **Recommended:** **Yes.** Chopping and trains are what players spend their first minutes doing on Home; reactive bursts tie ambient life to the railway with zero sim, server, or wire changes.
   - Answer: ___
4. **Keep the route critter table (2–3 cheap species per area, all names `[placeholder]`) as the working roster for later area plug-ins?**
   - **Recommended:** **Yes.** Each area gets a distinct silhouette using existing instanced patterns, and any species or name can be swapped when its area is built.
   - Answer: ___
5. **Keep Build 1 visual-only (silent, matching `critter-fish.ts` and `critter-gulls.ts`) rather than adding procedural wing-flutter / splash audio in the same pass?**
   - **Recommended:** **Yes.** Keeps Build 1 small and provable in one visual look; soft local burst audio can follow in a dedicated audio pass once heard on a device.
   - Answer: ___

---

## Parked

- **Soft local burst audio:** quiet procedural wing-flutter and water-plip cues when a flock or school scatters within ~12 m (after Build 1 is seen and heard on a device).
- **Tier 2 shared-schedule rare visitors:** e.g. a seeded dusk/rain visitor or shared-burrow Saltpan crab emergence (`mulberry32(world.seed, tick)`) if co-op "look at that!" callouts later warrant a pure `src/sim/` schedule ([creature-ai-and-ecosystems.md](../research/creature-ai-and-ecosystems.md)).
- **Ambient train-riding wildlife beats:** gulls pacing beside the player coach across the long White Wall and Stack crossings (building on [train-ride-feel.md](../research/train-ride-feel.md)).
- **Critter reactions to built town hangouts:** e.g. gulls landing on Ring Island's Lookout Tower roof or flutters clustering near Canopy's Wind Chime once those town builds settle.

---

## Design review (2026-11-28)

Reviewed in-context against [DESIGN.md](../../DESIGN.md), [owner-calls.md](../agents/owner-calls.md), [decisions.md](../decisions.md), [decisions-look.md](../decisions-look.md#current-rules), [decisions-characters.md](../decisions-characters.md#current-rules), [decisions-process.md](../decisions-process.md#current-rules), [direction.md](../direction.md), [playtests.md](../playtests.md), [context.md](../agents/context.md#design-work-rules), and the research index ([creature-ai-and-ecosystems.md](../research/creature-ai-and-ecosystems.md), [level-design.md](../research/level-design.md), [route-contract.md](../research/route-contract.md), [progression-flow-layout.md](../research/progression-flow-layout.md)).

### Tally

- **Decided:** 6
- **Default:** 6
- **New:** 2

*(Note: this is a docs-only brainstorm branch; when Build 1 starts, the 6 Default and 2 New calls below are logged at the top of their topic tables in `docs/agent-calls.md` with status `open`.)*

### Calls table

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | New world gets its own critters and life: many, cheap, and reactive, with no ecosystem | **Decided** | [backlog.md](../backlog.md) (P3 row); [d-2026-11-28-backlog-beyond-rail-rules](../decisions-process.md#d-2026-11-28-backlog-beyond-rail-rules); [creature-ai-and-ecosystems.md](../research/creature-ai-and-ecosystems.md) |
| 2 | View-only and local to each player: zero sim, server, wire, or save changes; zero new gameplay rules or rewards | **Decided** | [DESIGN.md](../../DESIGN.md) ("Pick how each feature shares state" — Local); [d-2026-11-28-backlog-beyond-rail-rules](../decisions-process.md#d-2026-11-28-backlog-beyond-rail-rules) |
| 3 | Every critter name and player-facing word is a `[placeholder]` for the owner; The Boogler's copy, story, characters, and names stay untouched | **Decided** | [d-2026-11-11-the-story-and-characters-are-the-owner-s](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s); [owner-calls.md#boogler-copy](../agents/owner-calls.md#boogler-copy) |
| 4 | First-minute framing follows the Camp-ridge landing while line 1 is unbuilt (120 s first-contribution checkpoint) | **Decided** | [d-2026-11-28-first-fall-lands-at-the-works](../decisions-controls.md#d-2026-11-28-first-fall-lands-at-the-works); [d-2026-11-27-course-change](../decisions-core-loop.md#d-2026-11-27-course-change) |
| 5 | Per-area draw/instance budgets are builder intent, not hard gates; periodic perf checks govern | **Decided** | [d-2026-11-28-perf-checks-periodic](../decisions-process.md#d-2026-11-28-perf-checks-periodic); [owner-calls.md#performance-guides-not-gates](../agents/owner-calls.md#performance-guides-not-gates) |
| 6 | Original Island keeps its existing `critter-fish.ts`, `critter-gulls.ts`, and `critter-fireflies.ts` untouched | **Decided** | `src/island/classic-zone.ts`; owner 6 Nov ("fish and gulls now live on the classic island only; give the new world its own critters and life") |
| 7 | Build 1 targets Home's Camp ridge, river gorge, and west cove (`src/features/critter-home.ts`), staying >40 m clear of Home's town plots (`VILLAGE` / `TOWN_PLOTS`) | **Default** | Reaches guests in minutes 0–2 without colliding with active Lane C town-plot work; cheap to add or move areas |
| 8 | Build 1 species counts & scare radii: ~40 minnows (3.5 m swim/ball, 10 m train overhead), ~12 gulls (4.5 m run, 5 m ball, 6 m chop, 14 m train/layer), ~38 flutters (3 m player, 8 m train) | **Default** | Tunables copied from `critter-fish.ts` / `critter-gulls.ts` and sized for Home's gorge width; trivial to tune after a look |
| 9 | Per-area intent: 2–4 draws, 50–100 instances (~1,000–3,000 tris) desktop; ~50% instances and shadows off on phone/low Detail; `< 0.15 ms/frame` CPU; `ENTER 260 m / LEAVE 300 m` Home residency (`routeAreas` on outer islands) | **Default** | Keeps total cost well under `greybox-look.md`'s per-area allowances and ensures zero cost off-island |
| 10 | Build 1 ships visual-only (silent, matching existing classic critters); soft local burst audio parked | **Default** | Keeps Build 1 small and provable in one visual look (open question 5) |
| 11 | Route critter table assigns 2–3 cheap local species across all 11 route places using existing fish/gull/sprite patterns plus a tiny shoreline scuttle variant | **Default** | Gives each biome a readable silhouette while keeping every area a small plug-in (open question 4) |
| 12 | Critters carry no colliders, prompts, or reward hooks and keep ≥8 m off `CAMP_PAD` and ≥4 m off track beds/frames | **Default** | Protects first-frame readability of the sleeping track layer and Station 1 bill and prevents physical interference |
| 13 | Daytime `[Placeholder: Meadow Flutters]` replace night-only fireflies on sunlit areas (Home, Ring Island, Canopy); glow-motes move to shaded/dark spaces (sea cave, Lantern Notch) | **New** | Recommend **yes** (open question 2): default sky is late-morning daylight (`skyNow.day >= 0.35`), so night-only fireflies would never be seen in normal play |
| 14 | Reactive triggers expand beyond player + ball to include passing trains, the waking track layer, and nearby tree chops (all view-only) | **New** | Recommend **yes** (open question 3): connects ambient life directly to the core rail/chopping loop in minutes 0–2 with zero sim or server changes |

### Findings

1. **Daylight visibility gap in `critter-fireflies.ts` (caught and fixed in the brief):** Copying `critter-fireflies.ts` verbatim onto Home would produce invisible critters because `skyNow.day < 0.35` is never met in Boogle's default late-morning sky ([d-2026-11-05-early-evening-look-exception](../decisions-look.md#d-2026-11-05-early-evening-look-exception)). **Action taken:** Replaced Home/Ring/Canopy fireflies with daytime `[Placeholder: Meadow Flutters]` and moved always-on additive glow-motes to the shaded sea-cave hood and Lantern Notch's lamp (New call 13, Open question 2).
2. **Classic-island coordinate & terrain trap (flagged for builder):** `critter-fish.ts` and `critter-gulls.ts` query `src/island/terrain.ts` (`groundHeight`) and origin `(0, 0)`. Home lives at `ORIGIN = (1000, 0)` and uses `H(wx, wz)` from `src/place/terrain.ts` plus `waterField.surfaceAt(x, z)`. **Action taken:** Specified `src/place/terrain.ts` (`H`), `waterField`, and `ORIGIN`-centered residency in the Shape section, plus verified-depth anchors for the narrow 4.5 m gorge river.
3. **Level design, flow & route contract check (Home's wilds):**
   - *Flow & three near-universal rules (`progression-flow-layout.md`, `route-contract.md`):* (1) Next goal findable — critters stay ≥8 m off `CAMP_PAD` and out of the direct middle-third sightline to the sleeping track layer, camp resident, and Station 1 bill (which #2694 just tuned for 390 × 844 portrait); (2) Gates keep their meaning — zero colliders, zero bounce/ride physics, zero travel or work edges touched; (3) Nobody stranded — purely visual.
   - *Co-op & solo:* Works identically solo and with 2–4 players. Because local critters react to `remotes`, `ballMesh`, and replicated trains, friends together see flocks burst from the same train or splash even without shared critter state.
   - *Sightlines & proof debt (unseen in browser):* No `npm run look` stills were taken during this docs-only brainstorm. Exact boulder roost coordinates on the Camp ridge, gorge-bridge fish visibility from deck height, and 390 × 844 portrait framing at `CAMP_PAD` must be verified in Build 1's Done means before shipping.
4. **No scope or ordering conflict (`game-direction`):** The P3 row is committed work designed specifically to run in parallel with P1 rail-rule branches without touching `src/sim/` or `WORLD_NS` ([d-2026-11-28-backlog-beyond-rail-rules](../decisions-process.md#d-2026-11-28-backlog-beyond-rail-rules)). Disposition: **proceed within existing scope** when a free slot opens.
