> **Status: proposed (2026-11-28).** Light one-pass brainstorm (one agent, three lenses: Play Designer, Systems Architect, Creative Director) and author design review for Lane C Part 6, following Part 5 ([lane-c-next](lane-c-next.md), [lane-c-part5](../plans/lane-c-part5.md), #2691, world v85) for [course-change](../plans/course-change.md#lane-c-towns-are-the-hangout). Baseline: `origin/main` `589fa51a9`. In-flight check ([orchestrator-state](../agents/orchestrator-state.md)): `codex/greybox-lap-bot` (dev loop/bot) and `codex/lane-b-preleg` (Lane B pre-leg works, shares `WORLD_NS` bump timing; Part 6 rebases onto the latest world version). All building names, board words and prompts below are `[placeholder]` for the owner ([d-2026-11-11-the-story-and-characters-are-the-owner-s](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s)); none of The Boogler's copy is touched.

# Lane C Part 6: High Gorge's first room-picked hangout

## Pitch

Home has its four priced plots (Parts 1–4) and Ring Island now has its first room-picked hangout (Part 5, #2691, world v85), while the next hub town on the ring — **High Gorge** — still sits with a flat 22 × 26 m stand-in pad (`TOWN_PAD`, `GORGE_DECK = 3.9 m`) and a greybox sign reading `"HIGH GORGE TOWN / STAND-IN: 3 PLOTS STAKED"`. Part 6 brings Lane C to **High Gorge (`town = 2, slot = 32`)**, turning its first pre-staked plot (nearest the gangway, ~14 m / ~2.5 s from the platform concourse) into a real room-picked hangout the moment the stack line reaches High Gorge (`after: 'gorge'`, i.e., `legDone(w, 0)`), priced fresh at base 300 (**150 Boogles** at the room's 50% tune) from the one shared strongbox, with `+1 rider / minute` on line 2's far queue (High Gorge is already line 2's permanent far-end rider destination per [d-2026-11-27-riders-far-end-stays-high-gorge](../decisions-rail.md#d-2026-11-27-riders-far-end-stays-high-gorge)). Twin blueprint boards offer a High-Gorge-fitted Hangout-vs.-Hangout pick built around the 90 m basalt split: **`[Placeholder: Echo Horn House]`** (walk-in timber horn-house with a brass canyon megaphone crank that bounces 3–4 delayed echoes and mist rings across the 90 m walls — and replies with a harmonized chord if a friend honks during the echo window) or **`[Placeholder: Canyon Hook-Perch]`** (walk-in shed with a 4 m porch overlooking the split, three low brass hook rings strung in a play arc over the water channel, and a bobbing cowbell splash-raft right beside the existing water slipway).

**Principles served:** Core loop ("choice and hanging out live in the towns, where every building adds something to do"), **2. Physics toys are optional fun**, **3. Side activities are never required**, **6. Communal world, personal things**, **7. Telegraph everything**, **8. Enjoyable alone and together**, **10. Slapstick over precision**, and **11. Show, don't tell**. **Principles bent:** None.

## Gut question

When a friend steps off the train at High Gorge between works (building the incline or waiting on the White Wall), do they immediately spot the room's chosen canyon building on the pad beside the gangway and crank an echo call or hook-swing out over the split?

---

## Candidates weighed

| Candidate | Verdict | Why |
| --- | --- | --- |
| **1. First plot at the next hub town on the route: High Gorge Offer 1 (`town = 2, slot = 32`)** | **Recommended (Part 6)** | High Gorge is the very next hub town after Ring Island ([campaign-outline](../plans/campaign-outline.md#towns-at-the-hubs), [greybox-route](../plans/greybox-route.md)), already has dressed cliff-kit stacks (`greybox-look` step 1, #2567), is line 2's permanent far-end rider destination (`d-2026-11-27-riders-far-end-stays-high-gorge`), and already has an authored flat 22 × 26 m `TOWN_PAD` with three pre-staked footprints 2.5 s off the concourse. Moves toward [direction.md](../direction.md)'s Next goal ("Each hub town has something to do that the room chose") in one small v85-sized pass with one `WORLD_NS` bump. |
| **2. Ring Island's second plot (`town = 1, slot = 17`)** | **Deferred** | Ring Island just got its first room-picked hangout in Part 5 (#2691). Under [campaign-outline](../plans/campaign-outline.md#2-what-each-town-receives-grows-into-and-gives) and [lane-c-next](lane-c-next.md#parked), a hub town's second plot is meant to be staked by freight (outward Quarry stone, which does not exist yet — `checkTrade` still asserts Ring's freight fields are 0). Adding a second zero-freight plot on Ring Island's tight, sloped west strip while High Gorge still shows a dead `"STAND-IN: 3 PLOTS STAKED"` sign deepens one town instead of making the next hub playable. |
| **3. Moving the next toy (frisbee, throwing, the seed stand) to a town** | **Already done / Deferred** | All three named toys are already live on Home's Round: the seed stand & bouncy mushrooms landed in Part 2 (`plot3`, #2637, v77), and live ball throwing + Frisbee Boathouse landed in Part 3 (`plot1`, #2659, v80; [d-2026-11-28-ball-and-disc-throw](../decisions-controls.md#d-2026-11-28-ball-and-disc-throw)). The only remaining retired toy prototype is `?proto=soapbox` ([d-2026-11-02-the-soapbox-is-removed](../decisions-process.md#d-2026-11-02-the-soapbox-is-removed)), already deferred by [lane-c-next](lane-c-next.md) to a dedicated vehicle-promotion pass (best fitted to Port Quay's wide quay street, not a small Part 6). |

---

## Best suggestions (ranked)

1. **`[Systems]` Extend `TRADE.plots` to `town = 2` (High Gorge) with `after: 'gorge'` and generalize `TradeRoute.farTown` to `farTowns: [1, 2]`.** `TRADE_TOWNS = TRADE.plots.length` already spawns `Town` and `TownClock` rows automatically. Generalizing `farTown` to `farTowns` lets both Ring Island and High Gorge contribute `+1 rider / minute` to line 2's far queue (`wait1`) cleanly without duplicating routes or touching `TRADE.yards`, and generalizing `checkTrade`'s unused-field check from `ts[1]` to all `town > 0` makes Canopy Town (`town = 3`) and Port Quay (`town = 4`) pure data additions later.
2. **`[Play]` + `[Creative]` Pair `[Placeholder: Echo Horn House]` vs. `[Placeholder: Canyon Hook-Perch]` as High Gorge Offer 1.** Both use High Gorge's signature 90 m basalt split directly — no imported Home ball or frisbee needed. **Echo Horn House** (seeded from High Gorge's "echo collectors" note in [campaign-outline](../plans/campaign-outline.md#story-and-character-placeholders-the-owners-pick-none-decided) and `lane-c-next.md` Parked) gives loud social comedy: crank the brass canyon megaphone to send 3–4 delayed echoes and mist rings ricocheting between the 85 m walls, and if a friend honks during the 3 s echo window, the canyon answers with a harmonized chord. **Canyon Hook-Perch** (seeded from High Gorge's hook identity and `lane-c-next.md` Parked "zip-perch") gives kinetic solo/co-op traversal play: climb a short 4 m porch and chain three low brass hook rings out over the water channel to a bobbing cowbell splash-raft, gliding back to the gangway or swimming 10 m to the existing water slipway.
3. **`[Systems]` Reuse `createHangoutBuilding` (or extract its shared cottage shell/construction helper) and `town.choice-board` on `TOWN_PAD` Plot 1.** High Gorge's `TOWN_PAD` is dead flat at `GORGE_DECK = 3.9 m` (`a: -26..-4, c: -40..-14`), so Plot 1 (`a: -14..-9, c: -22..-17`, nearest the gangway) needs zero terrain grading or steep approach ramp — just a clean `5.4 × 4.4 m` walk-in timber shell facing east (`+a`) toward the gangway, twin boards `±1.2 m` along `c`, and the exact `standWhenClear` + `liftOrWait` construction path proven in Part 5.
4. **`[Systems]` Add a lightweight dynamic hook-ring registration seam in `src/entities/railway/hook-shot.ts` for Canyon Hook-Perch.** `createRailwayHook` already handles Owner-synced hook pulls (`buildPull`, `stepPull`, `addPresenceField('railwayHook', ...)`), so letting High Gorge's view register 3 optional `HookRing` targets when `kind === 9` is built gives full remote-visible hook-swinging with **zero new server rules and zero new network messages**.
5. **`[Creative]` Replace the greybox `"STAND-IN: 3 PLOTS STAKED"` sign on `TOWN_PAD` with the live twin blueprint boards once Offer 1 is staked, keeping Plots 2 and 3 as quiet timber stakes.** Stepping off the train at High Gorge immediately reads as a real growing hub town rather than a placeholder sign, while leaving Plots 2 and 3 visibly reserved for future freight-staked offers.

### Real tensions resolved

- **Canyon Hook-Perch height vs. Route Contract Rule 2 (`route-contract.md`):** `[Systems]` flagged that hook rings at High Gorge must never bypass the 85 m rim stair or skip any work edge. **Resolved:** High Gorge Offer 1 only stakes *after* `legDone(w, 0)` (when the north rim stair and `PICK_AT` are already an open walk with no lock, and the room already holds hook + glider from Home). Even so, keep the perch at **4 m** above `GORGE_DECK` (`y = 7.9 m`) and all three hook rings low (**y = 11–15 m**, 70 m below the 85 m rim) over the open water channel, looping back toward the concourse/gangway with the existing slipway (`c = -29`) right below for loss-free water recovery (Rule 3).
- **Echo Horn House relay vs. zero new server messages:** `[Systems]` noted that keeping Echo Horn House Local-only would skip `hosted-room.ts` edits; `[Play]` + `[Creative]` argued a canyon echo that friends standing on the platform can't hear or harmonize with misses the whole co-op gag. **Resolved:** Reuse Part 5's exact validated cosmetic relay pattern in `server/src/host/hosted-room.ts` — generalize the `bell` handler to a tiny 2-entry table (`slot 16` Ring bell + `slot 32` Gorge echo, each checking built plot, pose freshness, 3.2 m proximity, and 1.5 s per-peer cooldown). Part 6 already triggers an independent review for `src/sim`, `src/world`, and the `WORLD_NS` bump, so this rides the same review at ~10 lines of code.
- **High Gorge residency (distance streaming) vs. server reach check:** `[Systems]` noted High Gorge's `route-greybox` massing streams in by distance (`450 m`), whereas `rail.buy` runs on the server without Three.js. **Resolved:** Define pure integer `GORGE_HANGOUT` and `GORGE_HANGOUT_BOARD` coordinates in `src/sim/railway-route.ts` (or a small pure `src/sim/railway-gorge-layout.ts` matching `RING_HANGOUT` / `RING_HANGOUT_BOARD`), read by both `src/world/railway-server.ts` (3.2 m reach) and the client's Gorge hangout view when High Gorge is resident.

---

## Shape

- **Rough build shape:** **Sim + server + view, with 1 `WORLD_NS` bump** (same scope and review tier as Lane C Parts 2–5). Independent review covers `src/sim`, `src/world`, `server/src`, and the bump.
- **Sync kinds:**

| State | Kind | Authority | Saved |
| --- | --- | --- | --- |
| High Gorge's `Town` row (`slot: 2`) and Offer 1 `Plot` row (`slot: 32`, `kind: 8 \| 9`) | **Server** (`TRADE_TOWNS = 3`, `rail.buy { id: 32, kind }`, replicated in `RAIL_REPLICATED`, checkpointed) | Server | Yes |
| Twin boards, live-swapping gold ghosts, 10 s construction (`standWhenClear` / `liftOrWait`), walk-in timber shell | **Local** over the accepted `Plot` row | Each tab | No |
| `[Placeholder: Echo Horn House]` horn blast, 3–4 delayed wall echoes, mist rings, and friend-honk chord reply | **One-off cosmetic event** `{ t: 'echo', id: 32 }` (validated & rate-limited 1.5 s per peer in `hosted-room.ts`), then **Local** audio/rings + local listener for remote `{ t: 'honk' }` within 3 s | Sender; server validates & rate-limits | No |
| `[Placeholder: Canyon Hook-Perch]` 4 m launch porch, 3 brass hook rings over the split, bobbing cowbell splash-raft | **Local** props + **Owner** hook-pull (`createRailwayHook` + `addPresenceField('railwayHook', ...)`) | Puller's tab (presence); Local props/SFX | No |

- **Existing code reused:**
  - Trade rules & validation: `src/sim/railway-trade-layout.ts`, `src/sim/railway-queries-trade.ts`, `src/sim/railway-sys-trade.ts`, `src/sim/railway-check-trade.ts`.
  - High Gorge frame & pad: `GORGE_DECK`, `TOWN_PAD`, `gorgeAt` (`src/entities/route-greybox/massing.ts`), `src/content/levels/gorge.ts`.
  - Twin boards, ghosts & walk-in construction: `town.choice-board` (`src/prefab/builders/town-court.ts`), `paintBoard` (`src/entities/town/plot-board.ts`), `createGhostOutlines`, `standWhenClear`, `liftOrWait`, and Ring Island's walk-in cottage builder pattern (`src/entities/ring-island/hangout-building.ts`).
  - Toys: `honkSound` (`src/features/honk.ts`), `bell` (`src/render/machine-sfx.ts`), `createRailwayHook` / `HookRing` (`src/entities/railway/hook-shot.ts`, `hook-path.ts`), `splash` (`src/render/splash.ts`), `ping` ring visual (`src/features/ping.ts`).
- **Files it would touch:**
  - **Sim & server (1 `WORLD_NS` bump, independent review):**
    - `src/sim/railway-trade-layout.ts` (`PLOT_KIND` gains `echo: 8, swing: 9`; `TradePlot.after?: 'ring' | 'gorge'`; `TRADE.plots[2]` with `[{ wood: 0, stone: 0, base: 300, riders: 1, after: 'gorge', choices: [8, 9] }]`; `TradeRoute.farTowns: readonly number[]` `[1, 2]`).
    - `src/sim/railway-queries-trade.ts` (`plotsStakedOf` / `plotsStaked` checks `after: 'gorge'` via `legDone(w, 0)`; `tillRate` sums `housesOf` over `r.farTowns`).
    - `src/sim/railway-sys-trade.ts` (`tradeTick` accrues `r.farTowns` into `wait1`; `buy` reads `Leg` for `after: 'gorge'`).
    - `src/sim/railway-check-trade.ts` (validate `after: 'gorge'` via `legDone(w, 0)` on bought town-2 plots; generalize unused-field check from `ts[1]` to all `town > 0`).
    - Pure integer `GORGE_HANGOUT` / `GORGE_HANGOUT_BOARD` anchor in `src/sim/railway-route.ts` (or `src/sim/railway-gorge-layout.ts`).
    - `src/world/railway-server.ts` (dispatch `rail.buy` reach for `e.id === 32` against `GORGE_HANGOUT_BOARD`).
    - `server/src/host/hosted-room.ts` (generalize `bell` relay table to validate and relay `{ t: 'echo', id: 32 }` with 1.5 s per-peer cooldown, 3.2 m proximity, and `world.hasEchoHouse?.()`).
    - `src/world/namespace.ts` (bump `WORLD_NS` with dated history line, rebasing onto `origin/main`'s latest version) + trade/host tests & re-pinned golden fixtures.
  - **Views & prefabs:**
    - `src/prefab/builders/town-court.ts` (3D board toppers for `kind: 8` brass megaphone and `kind: 9` brass hook ring).
    - `src/entities/railway/hook-shot.ts` (tiny dynamic extra-rings seam so built Canyon Hook-Perch registers its 3 `HookRing` targets cleanly and removes them on unload).
    - New `src/entities/route-greybox/gorge-town-plots.ts` (twin boards, live gold ghosts, 10 s walk-in shell construction, Echo Horn crank + wall echoes + friend-honk chord reply, Canyon Hook-Perch porch + 3 rings + bobbing cowbell raft) mounted from `src/entities/route-greybox/leg-view.ts` (retiring the `"STAND-IN: 3 PLOTS STAKED"` sign once Offer 1 is staked, and keeping Plots 2 & 3's stakes in `src/content/levels/gorge.ts`).
    - `docs/game-design/trade.md` and High Gorge's owning `docs/game-design/` section.
- **Risks & containment:**
  - *Plot 1 stakes vs. cottage footprint on `TOWN_PAD`:* `gorge.ts` currently draws 4 static corner stakes at `a = -14..-9, c = -22..-17` (a 5 × 5 m square), while the walk-in cottage is `5.4 × 4.4 m` plus porch/boards. Contain by moving Plot 1's unbought stakes into `gorge-town-plots.ts` (hidden when bought) or verifying exact clearance against the two greybox box buildings (`a: -24.5..-17.5`), the gangway (`a: -4..3`), and the twin boards (`±1.2 m` along `c`) in a Gorge layout test + `npm run level-check`.
  - *`TRADE_TOWNS = 3` seed hashes & world bump coordination:* Adding town 2 and slot 32 changes every world hash (same as Part 5's v85). Rebase onto `origin/main` (after `codex/lane-b-preleg` if it lands first), take the next `WORLD_NS`, and verify all seed stages and host traces keep their tick and result counts.
  - *Hook-ring pull colliding with `TOWN_PAD` or platform posts:* Place all three hook rings cleanly over the open water channel (`a: 6..26, c: -30..-12, y: 11..15 m`), away from the stack walls (`c = ±45`) and north platform posts (`c = -10.3..6.3`), and verify the arc in a browser motion sheet.
  - *Echo spam in co-op:* Rate-limit `{ t: 'echo', id: 32 }` at 1.5 s per peer on the server and 2.5 s locally on the crank so echoes stay musical and readable, not noisy.

---

## Done means

1. **Arrival at High Gorge (`--rail-seed gorge-reached`):** `npm run look` from the High Gorge platform concourse looking across the gangway onto `TOWN_PAD` (plus one shot at 390 px phone width). Visible: twin blueprint boards with megaphone and hook-ring toppers, `[placeholder]` titles, `Price 150`, and the breathing gold ghost swapping cleanly when standing at Board A vs. Board B (no `"STAND-IN: 3 PLOTS STAKED"` sign overlapping).
2. **Echo Horn House built + two-tab echo & chord:** `--eval` buying `slot 32, kind 8` in a two-tab room, waiting through the 10 s construction (plus reload check), walking into the ground room (cutaway works), cranking the horn on Tab A, and capturing Tab B (on the High Gorge platform) seeing the concentric mist rings crossing the split and hearing/logging the echo + friend-honk chord reply.
3. **Canyon Hook-Perch built + hook-swing + slipway recovery:** `--eval` buying `slot 32, kind 9`, walking into the shed, climbing to the 4 m perch, grappling across the brass hook rings over the split onto the floating cowbell raft (or splashing into the water and walking back up the `c = -29` slipway) — verified in a motion sheet.
4. **Sim & race proofs:** Trade unit tests pass for `slot 32` (refused before `legDone(w, 0)`, accepted for `kind 8` or `9`, refused for Home/Ring kinds `1..7` or `0`, simultaneous two-tab buy spends 150 once, `rail.buy` out-of-reach refused, reload restores chosen building, completed house adds `+1 rider / minute` to line 2's far queue). `node dev/ship-check.ts`, server suite, and `npm run test:net` green.

---

## Open questions

Each proceeds on its recommendation unless the owner says otherwise; nothing waits for a playtest.

1. **Is Lane C Part 6 High Gorge's first room-picked hangout (`town = 2, slot = 32` on `TOWN_PAD`) rather than a second plot on Ring Island?**
   - **Recommended:** **Yes.** Ring Island just received its first hangout in Part 5 and its second plot waits on outward freight; High Gorge is the next hub town on the ring, already has cliff-kit stacks and a flat authored `TOWN_PAD` 2.5 s from the concourse, and is line 2's permanent far-end rider stop.
   - Answer: ___
2. **Pair `[Placeholder: Echo Horn House]` (canyon megaphone with wall echoes + friend-honk chord reply) against `[Placeholder: Canyon Hook-Perch]` (4 m split overlook + 3 low brass hook rings over the water + bobbing cowbell splash-raft) on High Gorge Offer 1?**
   - **Recommended:** **Yes.** Both are tailored to High Gorge's 90 m split and hook identity, pit loud social slapstick against kinetic traversal play, work solo and together, and reuse existing horn/hook/splash primitives with zero new server toy rules beyond one cosmetic echo relay.
   - Answer: ___
3. **Stake High Gorge Offer 1 on arrival (`wood: 0, stone: 0`, `after: 'gorge'`, base 300 → 150 Boogles) and count completed High Gorge houses toward line 2's far queue alongside Ring Island?**
   - **Recommended:** **Yes.** Matches [campaign-outline](../plans/campaign-outline.md#2-what-each-town-receives-grows-into-and-gives) ("a hub town's first plot is staked when its station opens, by the first train in, with no goods") and Part 5's arrival pattern; later High Gorge plots (Plots 2–3) can require steel/fibre freight once outward yards exist.
   - Answer: ___
4. **Retire High Gorge's `"STAND-IN: 3 PLOTS STAKED"` greybox board once Offer 1 is staked, leaving Plots 2 and 3 as plain timber stakes until later freight-staked offers?**
   - **Recommended:** **Yes.** Removes placeholder greybox clutter as soon as real twin boards stand on Plot 1 while keeping the town pad's future growth readable.
   - Answer: ___

---

## Parked

- **Ring Island Offer 2 & Offer 3** (freight-staked plots once outward Quarry stone / Gorge copper yards land, with an optional same-town `spare: true` slot to recover the unpicked Offer 1 building).
- **Canopy Town Offer 1 (`town = 3, slot = 48`)** (arrival-staked treehouse hangout once Canopy's town pad is sited: e.g., `[Placeholder: Canopy Bounce Net]` vs. `[Placeholder: Treetop Wind Chime]`).
- **Port Quay Offer 1 (`town = 4, slot = 64`) & `[Placeholder: Soapbox Garage]`** (dedicated vehicle-promotion pass for `?proto=soapbox` on Port Quay's wide quay street, paired with a harbourside hangout).
- **High Gorge Offer 2 & Offer 3** (freight-staked plots on `TOWN_PAD`'s remaining two staked squares once outward steel / fibre yards exist).
- **High Gorge folk & named resident** (owner's story/character pass per [d-2026-11-11-the-story-and-characters-are-the-owner-s](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s)).

---

## Design review (2026-11-28)

Run on this brief by its author after rereading from the top. Checked against [DESIGN.md](../../DESIGN.md), [owner-calls.md](../agents/owner-calls.md), [decisions-core-loop.md](../decisions-core-loop.md), [decisions-rewards.md](../decisions-rewards.md), [decisions-rail.md](../decisions-rail.md), [decisions-characters.md](../decisions-characters.md), [decisions-controls.md](../decisions-controls.md), [decisions-process.md](../decisions-process.md), [direction.md](../direction.md), [playtests.md](../playtests.md), [context.md#design-work-rules](../agents/context.md#design-work-rules), `src/sim/railway-trade-layout.ts`, `src/sim/railway-queries-trade.ts`, `src/sim/railway-sys-trade.ts`, `src/sim/railway-check-trade.ts`, `src/entities/route-greybox/massing.ts`, `src/content/levels/gorge.ts`, `src/entities/route-greybox/leg-view.ts`, `src/entities/railway/hook-shot.ts`, `server/src/host/hosted-room.ts`, and research ([growing-towns](../research/growing-towns.md), [level-design](../research/level-design.md), [progression-flow-layout](../research/progression-flow-layout.md), [route-contract](../research/route-contract.md), [goofy-physics-coop](../research/goofy-physics-coop.md), [minigames-and-physics-minigames](../research/minigames-and-physics-minigames.md)).

### Calls table

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Towns are where choice and hanging out live; every building adds something to do and the room picks what goes on a plot | Decided | [d-2026-11-27-course-change](../decisions-core-loop.md#d-2026-11-27-course-change) |
| 2 | Larger hubs (including High Gorge) each have their own town that grows like the Village, paid from the one shared strongbox | Decided | [d-2026-11-12-hub-towns-grow-and-receive-freight](../decisions-rewards.md#d-2026-11-12-hub-towns-grow-and-receive-freight), [d-2026-11-11-boogles-the-five-open-questions-answered](../decisions-rewards.md#d-2026-11-11-boogles-the-five-open-questions-answered) |
| 3 | Every town building is walk-in | Decided | [d-2026-11-10-every-building-can-be-walked-into](../decisions-core-loop.md#d-2026-11-10-every-building-can-be-walked-into) |
| 4 | Line 2's riders' far end stays High Gorge (fare 34) once the ring closes | Decided | [d-2026-11-27-riders-far-end-stays-high-gorge](../decisions-rail.md#d-2026-11-27-riders-far-end-stays-high-gorge) |
| 5 | Physics toys and side activities are optional fun, never gates or income sources | Decided | [DESIGN.md](../../DESIGN.md) principles 2 & 3 |
| 6 | Building names, board words and prompts are marked placeholders; none of The Boogler's copy is touched | Decided | [d-2026-11-11-the-story-and-characters-are-the-owner-s](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s) |
| 7 | Make Lane C Part 6 High Gorge's first room-picked hangout (`TRADE_TOWNS = 3`, `town = 2, slot = 32` on `TOWN_PAD`) rather than Ring Island Offer 2 | New | Recommend yes (open question 1); High Gorge is the next hub town on the ring with cliff-kit stacks and a flat authored pad, while Ring Island Offer 2 waits on outward freight |
| 8 | High Gorge Offer 1 pairs `[Placeholder: Echo Horn House]` vs. `[Placeholder: Canyon Hook-Perch]` (both walk-in, `+1 rider / minute`, self-contained on High Gorge) | New | Recommend yes (open question 2); pits social/auditory slapstick against kinetic hook-swing play using the 90 m split |
| 9 | Stake High Gorge Offer 1 on arrival (`wood: 0, stone: 0`, `after: 'gorge'`, base 300 → 150 Boogles) and generalize `TradeRoute.farTown` to `farTowns: [1, 2]` so Ring Island and High Gorge both accrue on line 2's far queue | New | Recommend yes (open question 3); matches `campaign-outline.md` arrival staking and Part 5's zero-freight first-plot pattern |
| 10 | Place Offer 1 on `TOWN_PAD` Plot 1 (`a: -14..-9, c: -22..-17`, floor `GORGE_DECK = 3.9 m`, facing east toward the gangway) with `5.4 × 4.4 m` walk-in shell, `±1.2 m` twin boards, 3.2 m server reach, and retire the `"STAND-IN: 3 PLOTS STAKED"` board once staked | Default | Reuses pre-authored flat deck ~14 m (~2.5 s) from the concourse (open question 4); exact clearance against `gorge.ts`'s greybox boxes verified by planner/level-check |
| 11 | Echo Horn House relays a validated `{ t: 'echo', id: 32 }` one-off cosmetic message (1.5 s per-peer cooldown, 3.2 m proximity) with 3–4 delayed wall echoes, mist rings, and a harmonized chord reply if a friend honks within 3 s | Default | Reuses Part 5's `hosted-room.ts` relay pattern and `honk.ts` chord synth; zero saved state |
| 12 | Canyon Hook-Perch uses a 4 m launch porch (`y = 7.9 m`), 3 low brass hook rings (`y = 11–15 m`) over the water channel (`a: 6..26, c: -30..-12`), and a bobbing cowbell splash-raft beside the `c = -29` slipway | Default | Keeps rings 70 m below the 85 m rim (no stair skip), uses existing Owner hook-pull (`createRailwayHook`), and guarantees loss-free water recovery |

**Counts:** **6 Decided, 3 Default, 3 New.**

### Findings

1. **Port-from-Place / reuse fit check (owner call "Port from Place only what still fits"):**
   - **Existing hook-ring grapple (`src/entities/railway/hook-shot.ts`):** Earns its place — already production Owner-synced with remote presence (`railwayHook`), directly matching High Gorge's hook identity.
   - **Honk chord & bell SFX (`src/features/honk.ts`, `src/render/machine-sfx.ts`):** Earn their place — lightweight procedural Web Audio that turns a canyon echo into a shared co-op joke with zero saved state.
   - **Retired `?proto=soapbox` & `?proto=minis` hop line:** Do *not* earn their place in Part 6 — soapbox belongs to a dedicated vehicle pass at Port Quay; the hop line is already superseded by Home's Seed Shed mushrooms.
2. **Level design & Route Contract check (`level-design.md`, `route-contract.md`, `progression-flow-layout.md`):**
   - *Flow & walk-seconds:* High Gorge's platform concourse (`a = -2, c = -9.3`) to `TOWN_PAD` Plot 1 (`a = -14..-9, c = -22..-17`) is **~14 m (~2.5 s at 5.6 m/s)**, directly beside the gangway (`a: -4..3`) that every player walks to reach the north rim stair (`STAIR.a0 = 3`). Well inside the 10–20 s guide for something to notice and do on arrival.
   - *Sightlines:* Unseen in stills until the plan/build pass (flagged as a build proof); `TOWN_PAD` sits in direct view to the left as players step off the north platform onto the gangway, framed by the north basalt stack (`c = -45`) and the open 90 m water split to the east.
   - *Route contract (Rule 1: next goal findable; Rule 2: movement may skip distance, never the work; Rule 3: nobody stranded):* Offer 1 opens only after `legDone(w, 0)`, when the room already holds hook and glider and the north rim stair (`PICK_AT`) is an open walk with no lock. Capping the Hook-Perch at `y = 7.9 m` and its rings at `y = 11–15 m` keeps them 70 m below the 85 m rim and strictly over the open water channel; anyone splashing into the split swims ~10 m to the existing water slipway (`c = -29`, `a = 14 → 3`). Zero work edges skipped, nobody stranded.
   - *Unproved clearance (build prerequisite):* `gorge.ts` currently draws static corner stakes on Plot 1 (`5 × 5 m`) and two greybox box buildings at `a = -24.5..-17.5`. The implementation plan must move Plot 1's unbought stakes into `gorge-town-plots.ts` and verify the `5.4 × 4.4 m` cottage + `±1.2 m` twin boards + 3 hook-ring trajectories in a layout test, `npm run level-check`, and stills.
3. **First meeting, solo vs. co-op, late arrival:**
   - *First meeting:* Stepping off the first train at High Gorge, players see the twin blueprint boards (megaphone vs. hook ring) on `TOWN_PAD` 2.5 s off the gangway; zero sign text is needed to read sound vs. swing.
   - *Solo:* Both buildings work alone (crank echoes across the canyon; chain the 3 hook rings out to the cowbell raft and glide back).
   - *Co-op & late joiner:* One shared strongbox pays 150 Boogles; server-atomic `rail.buy` settles races; late joiners read `Plot.slot = 32` and see the built hangout immediately; friends on the platform hear/see canyon echoes and can honk back for a chord, or watch a friend hook-swinging over the split via `railwayHook` presence.
4. **Research alignment:** Follows [minigames-and-physics-minigames](../research/minigames-and-physics-minigames.md) recs 1, 2, 4, 8 (toy first, one-glance read, funny splash failure, place with a prop, no score/timer), [goofy-physics-coop](../research/goofy-physics-coop.md) (no winners, spectators enjoy watching from the platform), and [growing-towns](../research/growing-towns.md) (buildings fit authored pad footprints). No research recommendation contradicted.

### Suspect or placeholder lines

- None of The Boogler's copy is touched; no characters are named.
- Placeholder names and board strings for the owner: `Echo Horn House`, `Canyon Hook-Perch`, `Canopy Bounce Net`, `Treetop Wind Chime`, `Soapbox Garage`, any twin-board title/subtitle, and any horn-crank interact verb (`[Placeholder: Blow echo horn]`).

*(Note: Per task scope — docs-only brief in `docs/brainstorms/lane-c-part6.md` — Calls 7 to 12 are ready to be logged in `docs/agent-calls.md` when the planner/orchestrator picks up Part 6.)*
