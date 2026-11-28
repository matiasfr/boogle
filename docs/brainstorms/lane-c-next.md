> **Status: proposed (2026-11-28).** Light one-pass brainstorm (one agent, three lenses: Play Designer, Systems Architect, Creative Director) for Lane C's next part after Parts 1–4 ([lane-c](../plans/lane-c.md)), written under [an empty queue is refilled](../decisions-process.md#d-2026-11-28-empty-queue-is-refilled) for [course-change](../plans/course-change.md#lane-c-towns-are-the-hangout). Baseline: `origin/main` `d0075e83b`. `npm run inflight`: only `ship/matias-franco-500dddd` (greybox lap leg 5), no overlap with town/trade files. All building names, board words and prompts below are `[placeholder]` for the owner ([d-2026-11-11-the-story-and-characters-are-the-owner-s](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s)); none of The Boogler's copy is touched.

# Lane C next: Ring Island's first room-picked building (Part 5)

## Pitch

Home's Round now has all four ring-adjacent plots filled (the ball court on the green, Seed Shed / Horn Pavilion on `plot3`, the fixed Loader Yard on `plot2`, the spare toy / Frisbee Boathouse on `plot1`, and Caddy Shed / Dunk Bakery on `plot4`), while every other hub town on the ring still has zero plots (`TRADE_TOWNS = 1`) and nothing to hang out with. The next part moves Lane C onto the **second hub town, Ring Island**, staking its **first room-picked hangout plot** (`town = 1, slot = 16`) on the flat station-house terrace (`STACK_KEEP`, ~3 s walk from the west platform ramp) the moment the first train reaches Ring Island—zero new freight yards required, priced fresh at base 300 (**150 Boogles** at the room's 50% tune) from the one shared strongbox. Twin blueprint boards offer a self-contained, Ring-fitted Hangout-vs.-Hangout choice: **`[Placeholder: Lookout Tower]`** (walk-in ground room + exterior stair to a glide-launch deck and a fixed brass telescope aimed at the room's current works) or **`[Placeholder: Signal Bellhouse]`** (walk-in cottage + timber belfry with a pullable harbour bell rope that *BONGS* across the island and sends a bright golden sky-ring beckon visible to friends arriving by train or gliding). At the same time, we settle the catalogue rule for full towns: **cap Home at its 4 priced plots** (leaving `plot5`–`plot8` unstaked so every room's Round stays visibly shaped by its choices) and give each hub town its own 2–3 town-fitted plots at fresh per-town prices.

**Principles served:** Core loop ("choice and hanging out live in the towns, where every building adds something to do"), **2. Physics toys are optional fun**, **3. Side activities are never required**, **6. Communal world, personal things**, **7. Telegraph everything**, **8. Enjoyable alone and together**, **10. Slapstick over precision**, and **11. Show, don't tell**. **Principles bent:** None.

## Gut question

When a returning friend rides out to Ring Island (or steps off the train there for the first time), do they spot the room's chosen harbour building within seconds of the platform and immediately climb the tower or yank the bell with whoever is around?

---

## Candidates weighed

| Candidate | Verdict | Why |
| --- | --- | --- |
| **1. Next town's first building: Ring Island Offer 1 (`[Placeholder: Lookout Tower]` vs. `[Placeholder: Signal Bellhouse]`)** | **Recommended (Part 5)** | Home's 4 ring plots are full; Ring Island is the first hub past Home, already has sculpted terrain (`islandH`), folk, halt, and a flat station terrace (`STACK_KEEP`), and `src/sim/railway-*-trade.ts` already keys `Plot.slot = town * 16 + k` per town. Delivers a new hangout in a new town at the exact size of Parts 2–4. |
| **2. Next toy moving into town: `[Placeholder: Soapbox Garage]` on Home** | **Deferred** | `src/proto/soapbox/` is a ~1,000-line retired vehicle prototype (`d-2026-11-02-the-soapbox-is-removed`) needing live Owner cart ownership, handoff, recovery, and ring-road clearance (2–3× a Part 1–4 pass). Putting it on `plot5` (off-ring quarry road) would cost 6,400 Boogles and crowd Home's 6 m ring road. Better saved for a dedicated vehicle pass at Port Quay's long quay street. |
| **3. Town catalogue rule once Home's plots are bought** | **Folded into Part 5 as a rule** | Home has 4 unpriced off-ring road plots (`plot5`–`plot8`) whose `houseOrder = 2` prices would jump to 6,400–51,200 Boogles. Rather than a separate pass, adopt one rule now: cap Home at its 4 priced plots (4 of 6 Home toys built, keeping rooms distinct) and let each hub town offer 2–3 town-fitted plots at fresh per-town prices, with an optional same-town `spare: true` slot later. |
| **4. Room-pick mechanism's next use** | **Folded into Candidate 1** | Generalizing the twin-board + live-swapping gold ghost + 1 s atomic `rail.buy` hold to town 1 (`slot = 16`) proves the mechanism across towns. Non-plot picks (e.g., Home's central monument) conflict with The Boogler's reserved statue footing (`d-2026-11-15-grant-queue-answered`) and add no walk-in building. |

---

## Best suggestions (ranked)

1. **`[Systems]` Unlock `TRADE_TOWNS = 2` with zero new freight yards by staking Ring Island Offer 1 on arrival (`ringArrived` / `ringJoined`).** `campaign-outline.md` already proposed staking a hub town's first plot when its station opens with no goods (`wood: 0, stone: 0`), and `railway-sys-trade.ts`, `railway-check-trade.ts`, and `plotPrice` already loop over `TRADE.plots` per town. Fresh per-town `houseOrder = 2` starts Offer 1 at **150 Boogles** (base 300 at 50%), immediately affordable from the one shared strongbox.
2. **`[Play]` + `[Creative]` Pair `[Placeholder: Lookout Tower]` vs. `[Placeholder: Signal Bellhouse]` as Ring Island's first Hangout-vs.-Hangout pick.** Neither depends on Home's beach ball or frisbee (1.2 km away). **Lookout Tower** (parked in `lane-c-towns-hangout.md` Wave 2 for Ring Island) gives quiet wonder and traversal play: climb a walkable timber stair to a high deck, spy the room's current works through a fixed brass telescope (`lookout.telescope`), and leap off to glide over the Ringworks and sea crossing. **Signal Bellhouse** (building on the parked "station bell beckon" in `friends-drop-in.md` #11) gives loud social slapstick: yank the big rope so Buddy hops on the pull, the brass bell swings and *BONGS* across the island, and a bright golden sky-ring rises above the belfry for friends riding in on the train to spot and answer with a honk.
3. **`[Systems]` Reuse `ringAt` (`src/sim/railway-ring-layout.ts`) for the server's reach anchor and `town.choice-board` for the twin boards.** Generalize `railway-server.ts`'s `townPlotBoard(k)` to `townPlotBoard(town, k)` so town 0 reads Home's `town-plan.ts` and town 1 reads a pure integer `RING_PLOT_BOARD` from `ringAt`—zero Three.js in `src/world/`, same 3.2 m reach check, same `±1.2 m` twin-board spacing.
4. **`[Play]` Cap Home at its 4 priced plots and keep bought plots permanent for now.** With 1 fixed Works plot + 3 Hangout-choice plots, every room builds 4 of Home's 6 toys—leaving real visible variety between rooms without forcing 6,400+ Boogle sinks on the quarry road. Each later hub town repeats the pattern with its own 2–3 plots.
5. **`[Creative]` Mount the Ring Island plot on `STACK_KEEP` (the flat station-house terrace, `u 467–478.5, lat −21..−8.3`), facing the halt.** Passengers stepping off the west platform ramp see the staked boards and gold ghost immediately (~18 m, ~3 s walk), with the sea crossing and Ringworks behind it for the Lookout deck and clear sky above it for the Bellhouse's sky-ring.

### Real tensions resolved

- **Lookout Tower height vs. Route Contract Rule 2 (`route-contract.md`):** `[Systems]` flagged that a tall glide deck on Ring Island must not skip any height-gated work edge. **Resolved:** By the time Ring Island's station opens (`ringJoined`), the room already holds both the hook and the glider (from Home) and Ring Island's summit path is an open walk with no height-gated lock. Cap the Lookout deck at **~6 m** above the terrace (matching a two-storey house ridge) so it gives a fun glide over the halt and Ringworks without letting players glide off-island to High Gorge before the stack line is laid (High Gorge is >1 km away, far past the glider's 187 m budget).
- **Signal Bellhouse sync: one-off message vs. Local only:** `[Systems]` preferred zero server relay edits; `[Creative]` + `[Play]` argued a harbour bell beckon that only the puller hears defeats the co-op joke. **Resolved:** Add one tiny validated, rate-limited cosmetic relay `{ t: 'bell', id }` in `server/src/host/hosted-room.ts` beside `honk` and `mush` (about 8 lines, rate-limited to 1 per 1.5 s per peer, no saved state). Part 5 already triggers an independent review for `src/sim` and `WORLD_NS`, so this rides the same review cleanly.
- **Ring Island's `+1 rider / minute` before Ring has its own `TRADE.routes` row:** `[Systems]` noted `TRADE.routes` currently has only `{ town: 0, line: 1, a: 0, b: 'end' }`, so a `riders: 1` plot on `town = 1` wouldn't add riders to `tradeTick` unless counted. **Resolved:** Keep `riders: 1` on Ring Island's Offer 1 and have `townBuildings` / `tradeTick` count Ring Island's completed houses toward line 2's existing Home↔far-end route (or add `{ town: 1, line: 1, a: 0, b: 'end' }` only when Ring gets its own route). Counting completed Ring Island houses on the existing line 2 route's far-end (`wait1`) avoids duplicating waiting crowds while making the board's `+1 rider / minute` true immediately (DESIGN 11).

---

## Shape

- **Rough build shape:** **Sim + server + view, with 1 `WORLD_NS` bump** (same scope and review tier as Lane C Parts 2, 3, and 4). Independent review covers `src/sim`, `src/world`, `server/src`, and the bump.
- **Sync kinds:**

| State | Kind | Authority | Saved |
| --- | --- | --- | --- |
| Ring Island's `Town` row (`slot: 1`) and Offer 1 `Plot` row (`slot: 16`, `kind: 6 \| 7`) | **Server** (`TRADE_TOWNS = 2`, `rail.buy { id: 16, kind }`, replicated in `RAIL_REPLICATED`, checkpointed) | Server | Yes |
| Twin boards, live-swapping gold ghosts, 10 s `startSite` build, walk-in room shell | **Local** over the accepted `Plot` row | Each tab | No |
| `[Placeholder: Lookout Tower]` deck, stair, fixed brass telescope (aimed at current works via Lane A's pure works query, or High Gorge fallback) | **Local** (reuses `lookout.telescope` prefab & fixed-view zoom modal) | Each tab | No |
| `[Placeholder: Signal Bellhouse]` bell swing, *BONG* sound, and rising golden sky-ring | **One-off cosmetic event** `{ t: 'bell', id }` (validated & rate-limited in `hosted-room.ts`), then **Local** animation & sound | Sender; receivers validate & rate-limit | No |

- **Existing code reused:**
  - Trade rules & validation: `src/sim/railway-trade-layout.ts`, `src/sim/railway-queries-trade.ts`, `src/sim/railway-sys-trade.ts`, `src/sim/railway-check-trade.ts`.
  - Ring Island coordinates & ground: `ringAt` (`src/sim/railway-ring-layout.ts`), `STACK_KEEP` and `islandH` (`src/entities/ring-island/ground.ts`).
  - Twin boards, ghosts & construction: `town.choice-board` (`src/prefab/builders/town-court.ts`), `createGhostOutlines`, `startSite` / `snapSite` (`src/place/sites.ts`), `liftOrWait` (`src/prefab/instantiate.ts`).
  - Toys: `lookout.telescope` & fixed zoom modal (`src/entities/lookout/view.ts`), `clank` / metal bell (`src/render/machine-sfx.ts`), `honkSound` (`src/features/honk.ts`), `splash` (`src/render/splash.ts`), `ping` ring visual (`src/features/ping.ts`).
- **Files it would touch:**
  - **Sim & server (1 `WORLD_NS` bump, independent review):**
    - `src/sim/railway-trade-layout.ts` (`TRADE_TOWNS = 2`, `PLOT_KIND` gains `lookout: 6, bell: 7`, `TRADE.plots[1]` with 1 arrival-gated offer `{ wood: 0, stone: 0, after: 'ring', base: 300, riders: 1, choices: [6, 7] }`).
    - `src/sim/railway-queries-trade.ts` (`plotsStaked` checks `after: 'ring'` via `ringOpen` / `aperture(w).joined >= 0`; `townBuildings` / `tillRate` includes town 1's completed houses on line 2's route).
    - `src/sim/railway-check-trade.ts` (validate `after: 'ring'` on bought town-1 plots; keep existing conservation checks).
    - `src/sim/railway-ring-layout.ts` (pure integer `RING_PLOT_0` anchor on `STACK_KEEP` via `ringAt`).
    - `src/world/railway-server.ts` (generalize `rail.buy` reach from `townPlotBoard(k)` to `townPlotBoard(town, k)` using `RING_PLOT_0` for town 1).
    - `server/src/host/hosted-room.ts` (relay validated, rate-limited `{ t: 'bell', id }` one-off cosmetic message).
    - `src/world/namespace.ts` (bump `WORLD_NS` with dated history line) + trade tests & re-pinned golden fixtures (`test/railway-trade.test.ts`, `test/railway-check.test.ts`).
  - **Views & prefabs:**
    - `src/prefab/builders/town-court.ts` (add 3D board toppers for `kind: 6` spyglass and `kind: 7` brass bell; remove any Home-only fallback assumptions).
    - `src/content/prefabs/ring-island.ts` (or new `ring-town.ts`) + compiled JSON (`npm run prefabs`): walk-in ground shell + Lookout Tower deck/stair + Signal Bellhouse belfry/rope.
    - New `src/entities/ring-island/town-plots.ts` (thin twin-board + ghost + `startSite` + hangout mount for Ring Island, sharing helpers with `src/entities/town/plots.ts` where cheap) wired into `src/entities/ring-island/view.ts`.
    - `src/entities/lookout/view.ts` (extract small shared `openFixedTelescope` helper so both Home's ridge telescope and Ring Island's Lookout Tower use the exact same fixed-view modal, with no duplicate DOM/input code).
    - `docs/game-design/trade.md`, `docs/game-design/place.md` (and Ring Island's section).
- **Risks & containment:**
  - *Multi-town assumptions in trade tests and seeds:* `TRADE_TOWNS = 2` adds one `Town` row and one `Plot` row (`slot: 16`) to every world, changing seed hashes just like Part 4 did. Contain by auditing `TRADE.plots[0]` consumers in `src/sim/` and `test/` and re-pinning goldens cleanly in the bump commit.
  - *Telescope aiming when no works remain (post-ending):* Aim at the room's current works position from Lane A's works query; when the ring is finished, fall back to a fixed scenic heading toward High Gorge and the central ring.
  - *`STACK_KEEP` clearance against the stack-line cutting and platform ramp:* Verify footprint (`5.4 × 4.4 m` cottage kit), twin boards (`±1.2 m`), and lift-or-wait solids in a Ring Island layout test and `npm run level-check`.
  - *Bell spam in co-op:* Rate-limit `{ t: 'bell' }` at 1.5 s per peer on the server and 1.2 s locally on the rope target so repeated pulls stay rhythmic, not ear-splitting.

---

## Done means

1. **Arrival on Ring Island (`--rail-seed ring-joined`):** `npm run look` from the west platform ramp looking across `STACK_KEEP` (and one shot at 390 px phone width). Visible: twin blueprint boards with spyglass and brass-bell toppers, `[placeholder]` titles, `Price 150`, and the breathing gold ghost swapping cleanly when standing at Board A vs. Board B.
2. **Lookout Tower built + telescope + glide:** `--eval` buying `slot 16, kind 6`, waiting through the 10 s construction (plus reload check), walking into the ground room (cutaway works), climbing the exterior stair to the deck, opening the fixed telescope (frames the current works / High Gorge), and gliding off the deck over the halt.
3. **Signal Bellhouse built + two-tab beckon:** `--eval` buying `slot 16, kind 7` in a two-tab room, walking inside the cottage, pulling the bell rope on Tab A, and capturing Tab B (standing on the Ring Island platform or crossing) seeing the rising golden sky-ring and swinging bell.
4. **Sim & race proofs:** Trade unit tests pass for `slot 16` (refused before `ringJoined`, accepted for `kind 6` or `7`, refused for Home kinds `1..5` or plain `0`, simultaneous two-tab buy spends 150 once, `rail.buy` out-of-reach refused, reload restores chosen building). `node dev/ship-check.ts`, server suite, and `npm run test:net` green.

---

## Open questions

Each proceeds on its recommendation unless the owner says otherwise; nothing waits for a playtest.

1. **Is Lane C Part 5 Ring Island's first room-picked building (`TRADE_TOWNS = 2`, Offer 1 on `STACK_KEEP`) rather than a fifth plot on Home?**
   - **Recommended:** **Yes.** Home's 4 ring plots are full and a 5th would cost 6,400 Boogles on the quarry road; Ring Island is the first hub past Home with real terrain and folk, and proving multi-town plots unlocks every later hub.
   - Answer: ___
2. **Pair `[Placeholder: Lookout Tower]` (walk-in room + glide deck + works-aimed fixed telescope) against `[Placeholder: Signal Bellhouse]` (walk-in room + pullable harbour bell with visible sky-ring beckon) on Ring Island Offer 1?**
   - **Recommended:** **Yes.** Both are self-contained on Ring Island (no need to haul Home's ball 1.2 km), pit quiet traversal/wonder against loud social slapstick, reuse existing telescope/bell/ring primitives, and need zero new server toy rules beyond one cosmetic `{ t: 'bell' }` relay.
   - Answer: ___
3. **Cap Home at its 4 current priced plots (leaving `plot5`–`plot8` unstaked for now) so rooms keep distinct Round layouts instead of buying every toy at Home?**
   - **Recommended:** **Yes.** Each room builds 4 of Home's 6 toys (1 fixed Works + 3 Hangouts); later hub towns each offer 2–3 town-fitted plots at fresh per-town prices (starting at 150 Boogles).
   - Answer: ___
4. **Stake Ring Island Offer 1 as soon as the first train reaches Ring Island (`wood: 0, stone: 0`, `after: 'ring'`), without waiting for a new outward stone freight yard?**
   - **Recommended:** **Yes.** Matches `campaign-outline.md` ("a hub town's first plot is staked when its station opens, by the first train in, with no goods") and keeps Part 5 sized like Parts 2–4; later Ring Island plots (Offer 2+) can require Ring freight when outward yards are built.
   - Answer: ___
5. **Keep bought hangout plots permanent for now (no pay-to-rebuild / re-pick button)?**
   - **Recommended:** **Yes.** Permanence makes the room's pick feel real and avoids extra UI/ops; revisit only if playtests show rooms regretting a choice.
   - Answer: ___

---

## Parked

- **`[Placeholder: Soapbox Garage]`** (dedicated vehicle-promotion pass: Owner cart handoff, recovery, and lap timing at Port Quay's long quay street or a wide later hub).
- **Ring Island Offer 2 & Offer 3** (freight-staked plots once outward Quarry stone / Gorge copper yards land, with an optional same-town `spare: true` slot to recover the unpicked Offer 1 building).
- **High Gorge, Canopy Town, and Port Quay first hangout picks** (each hub town gets its own 1-plot arrival choice once its terrain leaves greybox: e.g., Gorge echo horn / zip-perch, Canopy bounce/treehouse, Port Quay soapbox / dunk pier).
- **Home `plot5`–`plot8` (quarry & camp road plots)** (kept unstaked until post-game or late-game Boogle sinks need them).
- **Group photo / town guestbook board** (parked in `friends-drop-in.md` #15/#20; waits for persistent player accounts).

---

## Design review (2026-11-28)

Run on this brief by its author after rereading from the top. Checked against [DESIGN.md](../../DESIGN.md), [owner-calls.md](../agents/owner-calls.md), [decisions-core-loop.md](../decisions-core-loop.md), [decisions-rewards.md](../decisions-rewards.md), [decisions-characters.md](../decisions-characters.md), [decisions-controls.md](../decisions-controls.md), [decisions-process.md](../decisions-process.md), [direction.md](../direction.md), [playtests.md](../playtests.md), [context.md#design-work-rules](../agents/context.md#design-work-rules), `src/sim/railway-trade-layout.ts`, `src/sim/railway-queries-trade.ts`, `src/sim/railway-ring-layout.ts`, `src/entities/ring-island/ground.ts`, `src/entities/lookout/view.ts`, and research ([growing-towns](../research/growing-towns.md), [level-design](../research/level-design.md), [route-contract](../research/route-contract.md), [goofy-physics-coop](../research/goofy-physics-coop.md), [minigames-and-physics-minigames](../research/minigames-and-physics-minigames.md)).

### Calls table

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Towns are where choice and hanging out live; every building adds something to do and the room picks what goes on a plot | Decided | [d-2026-11-27-course-change](../decisions-core-loop.md#d-2026-11-27-course-change) |
| 2 | Larger hubs (including Ring Island) each have their own town that grows like the Village, paid from the one shared strongbox | Decided | [d-2026-11-12-hub-towns-grow-and-receive-freight](../decisions-rewards.md#d-2026-11-12-hub-towns-grow-and-receive-freight), [d-2026-11-11-boogles-the-five-open-questions-answered](../decisions-rewards.md#d-2026-11-11-boogles-the-five-open-questions-answered) |
| 3 | Every town building is walk-in | Decided | [d-2026-11-10-every-building-can-be-walked-into](../decisions-core-loop.md#d-2026-11-10-every-building-can-be-walked-into) |
| 4 | Physics toys and side activities are optional fun, never gates or income sources | Decided | [DESIGN.md](../../DESIGN.md) principles 2 & 3 |
| 5 | Telescope stays fixed-view with zoom only (no panning variant) | Decided | [d-2026-11-06-first-prototype-answers](../decisions-process.md#d-2026-11-06-first-prototype-answers) |
| 6 | Building names, board words and prompts are marked placeholders; none of The Boogler's copy is touched | Decided | [d-2026-11-11-the-story-and-characters-are-the-owner-s](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s) |
| 7 | Move Lane C Part 5 to Ring Island (`TRADE_TOWNS = 2`, Offer 1 on `STACK_KEEP`) rather than adding a 5th plot to Home | New | Recommend yes (open question 1); Home's 4 ring plots are full and Ring Island is the first hub past Home with sculpted ground and folk |
| 8 | Ring Island Offer 1 pairs `[Placeholder: Lookout Tower]` vs. `[Placeholder: Signal Bellhouse]` (both walk-in, `+1 rider / minute`, self-contained on Ring Island) | New | Recommend yes (open question 2); pits traversal/wonder against social slapstick without depending on Home's ball or frisbee |
| 9 | Cap Home at its 4 priced plots (leaving `plot5`–`plot8` unstaked) and give each hub town 2–3 town-fitted plots at fresh per-town prices, with bought plots permanent for now | New | Recommend yes (open questions 3 & 5); keeps rooms visibly distinct and avoids 6,400+ Boogle road sinks |
| 10 | Stake Ring Island Offer 1 on arrival (`wood: 0, stone: 0`, `after: 'ring'`), base 300 (150 Boogles at 50%), counting completed Ring Island houses toward line 2's route riders | New | Recommend yes (open question 4); matches `campaign-outline.md` arrival staking and avoids building outward freight yards in Part 5 |
| 11 | Place Ring Island Offer 1 on the existing `STACK_KEEP` terrace (`u 467–478.5, lat −21..−8.3`) using a 5.4 × 4.4 m cottage footprint, `±1.2 m` twin boards, and 3.2 m server reach from `ringAt` | Default | Reuses pre-graded flat terrace ~18 m (~3 s) from the west platform ramp; exact coordinates verified by planner/level-check |
| 12 | Cap Lookout Tower's glide-launch deck at ~6 m above the terrace and aim its fixed telescope at the room's current works (fallback: High Gorge / ring) | Default | Gives a fun glide over Ringworks without reaching off-island areas; reuses `lookout.telescope` and Lane A's works query |
| 13 | Signal Bellhouse relays a validated `{ t: 'bell', id }` one-off cosmetic message (1.5 s per-peer rate limit) that rings a brass bell and raises a golden sky-ring visible across the island and sea crossing | Default | Makes the harbour beckon shared across tabs (DESIGN 8) with zero saved state and anti-spam pacing |
| 14 | Defer `[Placeholder: Soapbox Garage]` to a dedicated vehicle-promotion pass (likely Port Quay) rather than Part 5 | Default | Retired `?proto=soapbox` needs live Owner ownership, handoff, recovery, and wide street clearance beyond a Part 1–4 pass |

### Findings

1. **Port-from-Place / reuse fit check (owner call "Port from Place only what still fits"):**
   - **Fixed telescope (`src/entities/lookout/view.ts`):** Earns its place—already ported to production as a clean Local fixed-view zoom modal (`d-2026-11-06-first-prototype-answers`), and aiming it at the room's current works directly reinforces Lane A ("know where the work is").
   - **Soapbox (`?proto=soapbox`):** Does *not* earn its place in Part 5—it is a retired prototype (`d-2026-11-02-the-soapbox-is-removed`) whose live multiplayer promotion is a standalone vehicle project, not a small town plot pass.
   - **Harbour bell beckon (`friends-drop-in.md` #11):** Earns its place as a lightweight one-off cosmetic event reusing existing bell SFX (`machine-sfx.ts`) and ring visuals (`ping.ts`), with no scores or modes.
2. **Level design & Route Contract check (`level-design.md`, `route-contract.md`, `progression-flow-layout.md`):**
   - *Flow & walk-seconds:* Ring Island's west platform ramp exits near `u ≈ 450–468 m, lat ≈ −6 m`; `STACK_KEEP` (`u 467–478.5, lat −21..−8.3`, 11.5 × 12.7 m flat terrace) sits roughly **15–20 m (~3 s at 5.6 m/s)** from the platform ramp—well inside the 10–20 s guide for something to notice and do on arrival.
   - *Sightlines:* Unseen in stills until the plan/build pass (flagged as a build proof); `STACK_KEEP` sits beside the station halt on the island's north-west terrace, keeping the Pilgrims' Way / Ringworks sightline clear while putting the twin boards in view as players step off the train.
   - *Route contract (Rule 2: movement may skip distance, never the work; Rule 3: nobody stranded):* Offer 1 opens only after `ringJoined`, when players already hold both hook and glider and Ring Island's summit path is already walkable. A ~6 m Lookout deck gives a short scenic glide over the halt and Ringworks; High Gorge is >1 km away (far past the 187 m glide budget), so no work edge is skipped and no one can be stranded.
   - *Unproved reach / clearance:* `STACK_KEEP`'s exact clearance against the stack-line cutting (`STACK_CUT` at `lat −6.6 m`) and the west platform ramp is not yet verified in `npm run level-check` or stills—the implementation plan must verify exact `ringAt` coordinates and lift-or-wait solids before building.
3. **First meeting, solo vs. co-op, late arrival:**
   - *First meeting:* Stepping off the first train at Ring Island, players see the twin boards and toppers right on the station terrace; no sign text is required to read spyglass vs. bell.
   - *Solo:* Both buildings work alone (climb, telescope, glide; or yank the bell and watch/hear the harbour ring).
   - *Co-op & late joiner:* One shared strongbox pays 150 Boogles; server-atomic `rail.buy` settles races; late joiners read `Plot.slot = 16` and see the completed building immediately; friends riding in across the crossing see the Bellhouse's sky-ring or a friend gliding off the Lookout deck.
4. **Research alignment:** Follows [minigames-and-physics-minigames](../research/minigames-and-physics-minigames.md) recs 1, 2, 4, 8 (toy first, one-glance read, place with a prop, no score/timer), [goofy-physics-coop](../research/goofy-physics-coop.md) (no winners), and [growing-towns](../research/growing-towns.md) (plots anchored to the station terrace). No research recommendation contradicted.

### Suspect or placeholder lines

- None of The Boogler's copy is touched; no characters are named.
- Placeholder names and board strings for the owner: `Lookout Tower`, `Signal Bellhouse`, `Soapbox Garage`, any twin-board title/subtitle, and any rope-pull interact verb (`[Placeholder: Ring bell]`).

Calls 7 to 14 are logged in [agent-calls.md](../agent-calls.md) (status `open`).
