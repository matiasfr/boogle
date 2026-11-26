> **Status: proposed (2026-11-26).**

# Cargo trains (cargo-trains)

Seed (backlog P3, owner's words *"A now, C later"*, 12 November 2026): separate cargo trains of their own after the greybox route, carrying each resource source's full-load stops (*"I feel cargo trains should be stopping at all resource sources to pick up cargo. player shouldnt have to be carrying that"*) and taking on halt-yard build 2 (cargo cars carrying a halt yard's player-left spares).

## Pitch

Today ("A"), the trains you ride also haul town crates, which forces the Quarry's stone stop to freeze whenever the footing wagon is working so freight never slows the main route. **Cargo trains ("C")** separate the two jobs. At the Roundhouse, the room spends **materials** (steel from the shared pool, never Boogles) to commission a dedicated cargo train on a line. Once commissioned, passenger trains drop freight duty and never pause at sources, while a squat, unmistakable cargo consist rolls out on its own: it pulls into a short off-main **freight siding** at middle-halt sources whenever a full trainload waits (even while footings are owed), and scoops up player spares left in **halt yards** (build 2) to carry them ahead to open bills on the same line. Nothing on rails costs Boogles, materials and Boogles never convert, hub towns still gate nothing on the route, and nobody routes a train or sets a quota. Serves DESIGN.md's **core loop** (*"The rail builds the world"*), **6. Communal world** (spares left by one friend ride to another's build), **7. Telegraph everything** (visible siding, stack, and silhouette), and **11. Show, don't tell** (blasting past a loading cargo train on a siding explains both services with zero text). Bends no principle.

## Gut question

When your passenger train blasts past your own cargo train tucked into the Quarry siding—loading stone crates and the spares your friend left in the halt yard—does the railway feel like a living machine you built, rather than errands you're still carrying?

## Best suggestions

1. **Short freight sidings at middle-halt sources, ignored by main-track blocks** (`systems`, `creative`, `design`). A cargo train steps off the double track onto a short siding beside the source yard and halt-yard bay; main-track passenger and footing trains pass at full speed with zero wait, permanently retiring the `footingsOwed` stone-stop lockout.
2. **Commissioned per line at the Roundhouse for steel, waking an existing `TRAIN_PHASE.SHED` slot** (`systems`, `design`). Reuses `rail.install`, the shared steel pool (`Shed.steel - Shed.spent`), and `fleetJoin`: every pre-steel seed and early-game fixture stays tick-for-tick identical until the room builds its first cargo train.
3. **Halt-yard build 2 rides on the cargo train under four zero-routing rules** (`design`, `systems`). A cargo train loads `HaltYard` logs, stone, or rails before source crates, only for an open, unblocked bill at a *different* halt on its line, rides visibly on open decks, and unloads on arrival—turning spares into automatic team relays without a bank menu.
4. **Unmistakable freight silhouette + crate-surfing slapstick** (`creative`, `design`). No passenger coach, squat work-cab look with an amber work lamp and open slatted cars carrying solid crates and strapped bundles (`solidTrainLoad`); waiting riders and platform levers ignore it (`!isCargo`), yet a player can still hop onto the cargo stack for a goofy ride (Principle 10).
5. **Clean "A" → "C" handoff per line** (`systems`). While a line has no cargo train, "A" (mixed trains) runs unchanged; the tick a line's cargo train commissions, passenger trains on that line skip `freightStop` and `freightLoads`, keeping the two modes cleanly separated per line.
6. **Distinct freight soundscape and passing-whistle beat** (`creative`). Heavier chuff tempo and a deeper two-tone freight horn (procedural Web Audio) when pulling out of a siding, answering the passenger train's whistle when they pass.

**Tensions:**
- **Levers and riding vs. clean freight (`creative` vs. `systems`/`design`).** Letting platform levers stop a cargo train would trap waiting players on a slower siding-hopping consist. *Recommendation:* levers and rider crowds ignore cargo trains, and cargo cars have no benches, while solid crate decks keep optional crate-surfing alive.
- **Siding geometry cost vs. zero-wait guarantee (`systems` vs. `creative`).** Authoring sidings at every future source at once is heavy; skipping sidings brings back the +108-tick block queue that broke R2b. *Recommendation:* build **one** real siding first at the Quarry on Line 2 (where stone, `HaltYard` slot 2, and the footing wagon all meet), using a generic `RailHalt.siding` field that later areas adopt one by one as they leave greybox.
- **Where halt-yard spares unload (`design` vs. `systems`).** Moving spares to a hub with no open bill would empty a yard players intentionally staged. *Recommendation:* follow `docs/brainstorms/station-deposit.md` build 2—only draw spares when an open, unblocked bill on the same line needs that material at another halt, and never empty a yard standing at the bill's own halt.

## Shape

- **Sync kind:** **Server** state in the railway ECS (`src/sim/railway-components.ts`), saved and replicated like existing trains and yards. Commissioning uses the existing `rail.install` server-confirmed op (not predicted, matching other steel installs). Siding meshes, cargo-car visuals, loader-arm flights, crate stacks, and horns are **Local** over accepted rows; standing on loaded crates stays **Owner** physics via `solidTrainLoad`. One `WORLD_NS` bump when rules ship.
- **Reuses (checked paths):**
  - `src/sim/railway-lines.ts` (`RAIL_LINES`, `RAIL_TRAINS`, `RailHalt` — add optional `role: 'cargo'` on train defs and `siding?: { fromCm: number; toCm: number; offsetCm: number }` on halts).
  - `src/sim/railway-trains.ts` (`TRAIN_PHASE.SHED`, `fleetJoin`, `servingSlots`, `blockFree`, `planLeg`, `trainServes`, `lineSpacing` — add `siding` bypass in `blockFree`/`lineSpacing` and `!isCargo` in `trainServes`).
  - `src/sim/railway-components.ts` (`Train` — add `siding: 'bool'` and conserved integer `yardLogs`, `yardStone`, `yardRails`, mirroring `legKit`; `Line` — add `cargo: 'bool'`).
  - `src/sim/railway-queries-trade.ts` & `src/sim/railway-sys-trade.ts` (`freightStop`, `freightLoads`, `freightArrives`, `TRADE.loadStop` — gate passenger trains off once `Line.cargo` is true; lift `footingsOwed` lockout for cargo-role trains).
  - `src/sim/railway-yard-layout.ts` & `src/sim/railway-queries-yard.ts` (`HALT_YARDS`, `haltYardStock`, `haltYardOpen`, `haltYardTotals` — read/drain spares for open bills; include train `yardLogs`/`yardStone`/`yardRails` in `railCounts`, `line2Logs`, `line2Rails`, and stone conservation in `src/sim/railway-check-line1.ts`).
  - `src/sim/railway-sys-trains.ts` (`serviceOf`, `trainIO.arrive`, `trainIO.standing` — hook cargo-train siding stops and halt-yard load/unload).
  - `src/entities/railway/garage-data.ts` & `garage-view.ts` (commission tile under `cargo` category, steel price from `Shed.steel - Shed.spent`).
  - `src/entities/railway/freight-view.ts`, `halt-yard-view.ts`, `halt-yard-flights.ts`, `train-load.ts` (`solidTrainLoad` for solid crates on open cargo decks).
- **Smallest first build:** Line 2 only, once steel is home (after the greybox route): one `role: 'cargo'` slot on Line 2 starting in `TRAIN_PHASE.SHED`, one Roundhouse commission tile (steel cost), one Quarry freight siding on the down side beside the Quarry yard and `HaltYard` slot 2, full-load stone stops with no `footingsOwed` pause, and halt-yard build 2 moving Quarry/Far Head/Village spares toward open Line 2 bills. Placeholder labels (`[placeholder: Cargo train]`).
- **Risks:**
  - *Siding re-entry deadlock:* a cargo train waiting to rejoin a busy main line must yield to passing trains without starving. Contain by checking `blockFree` each tick and giving a waiting siding train priority only when the gap ahead is at least `TRAIN.sepCm` (matching `fleetJoin`).
  - *Conservation & witnesses:* `yardLogs`, `yardStone`, `yardRails` aboard a train must enter every witness (`railCounts`, `line2Logs`, `line2Rails`, stone check) and save invariant (`src/sim/railway-check.ts`), or the conservation suite fails.
  - *Quarry siding footprint:* `HaltYard` slot 2 sits at `(1076.7, 51.4)` (12.4 m from track centre, 6.0 m from Q3's crate, per `docs/plans/halt-yard.md` Level findings). The Quarry siding's offset and turnout length must pass `npm run level-check` without clipping the bay, the ramp, or Q3's crate.
  - *Draw/triangle budget:* one extra consist on Line 2 reuses existing engine/flatbed/crate/bundle instanced batches; check `npm run perf` at the Quarry on desktop and phone.

## Done means

Each moment captured with `look` (proposed `--eval` setups for the builder):

1. **Commissioning at the Roundhouse:** `--rail-seed ring-joined` with steel in `Shed.steel`. Hold Interact on the Line 2 cargo-train tile; still shows the steel stack drop and the cargo consist rolling out onto Line 2 (`Line.cargo === true`, cargo slot leaves `TRAIN_PHASE.SHED`).
2. **The passing beat at the Quarry siding:** `--rail-seed ring-joined` with `Line.cargo` true, Quarry `Yard.stock = 8`, and a passenger train approaching behind. Real-time `--video` clip from the Quarry back ramp shows the cargo train pull onto the siding, load 8 stone crates, and the passenger train pass on the main track at cruise speed with **0 ticks of delay** (asserted on sim logs).
3. **Zero lockout during footings:** sim test + `--eval` with `footingsOwed(w, LINE2)` true and `Line.cargo` true: the footing wagon's arrival ticks match main tick-for-tick while the cargo train still makes full-load stone stops in the siding.
4. **Halt-yard build 2 relay:** `--eval` putting 8 logs in `HaltYard` slot 2 (Quarry) with an open Line 2 bill needing logs ahead. Clip shows the cargo train pull into the siding, load the strapped bundle/logs from the bay onto its deck, and deliver them at the destination halt; `railCounts` conservation holds before, during, and after.
5. **Levers & riders ignore cargo:** `--eval` pulling the Quarry lever with 4 waiting riders as a cargo train approaches: the lever lamp stays lit for the next passenger train, riders stay on the platform, and the cargo train passes (or enters the siding only if full-load/spares wait).

## Open questions

1. **How is a line's cargo train unlocked?** **Recommended: commissioned per line at the Roundhouse for steel (materials only, never Boogles), starting with Line 2 once steel is home.** Alternative: automatic on a route milestone with no install bill (simpler, but removes a meaningful steel sink from the Roundhouse). Answer: ___
2. **Should the first build include halt-yard build 2 (carrying player spares) or ship source-crate cargo trains first?** **Recommended: include halt-yard build 2 in the first build**, since the Quarry bay is already live on main and seeing your own spares ride off is half the payoff. Alternative: source crates only first, halt-yard build 2 as step 2. Answer: ___
3. **Can players ride on a cargo train?** **Recommended: no player seats and levers ignore it, but crate decks stay solid so you can hop on for slapstick rides.** Alternative: add a single rear caboose/brake-van bench for players (risks players confusing it with passenger service). Answer: ___
4. **What does the cargo train do when no source has a full load and no halt yard has needed spares?** **Recommended: it keeps a steady, slow patrol loop on the line (passing through without stopping)** so the railway always looks busy and ready, never parked dead in a shed. Alternative: wait in the home siding/shed until a full load is ready (less visual clutter, less life on the tracks). Answer: ___
5. **Where do unloaded halt-yard spares land at the destination halt?** **Recommended: into that halt's open bill rack/frame depot (or destination halt yard when no rack exists), never auto-completing a hand-fed frame behind the player's back**, matching how train-fed kits land on the depot/rack for players to pour. Alternative: pour directly into the open bill (faster, but bends "hands-on work" and hides the arrival). Answer: ___

## Parked

- **Cargo-train upgrades in the Roundhouse:** extra flatbed cars (raising `freightCap` from 8 to 16) or a heavier shunter boiler, priced in materials (steel/copper) per line.
- **Line 1 and greybox-leg cargo trains:** extending the same `role: 'cargo'` + `RailHalt.siding` pattern to Line 1 (Camp timber), High Gorge (copper), Canopy Town (fibre), and Saltpan (salt) as each area leaves greybox.
- **Passing-whistle call-and-response:** passenger and cargo engines trading a high/low whistle chord whenever they pass within 30 m on parallel tracks.
- **Hub-town delivery crane:** a little-guy jib at each hub town that visibly swings crates off the cargo train's deck onto the town's plot piles.
- **Retired engine driver commentary:** a placeholder reaction from the Village's first-house resident once the room commissions its first cargo train (owner's words only).

---

## Three-lens pass (summary)

- **Play designer:** (1) Per-line Roundhouse steel commission turns "C" into a tangible progression reward that cleans up passenger service. (2) Bundling halt-yard build 2 gives spares a real team-relay payoff solo and in co-op without adding routing or menus. (3) Sidings eliminate the awkward Quarry lockout where a full yard sat ignored beside passing trains. *Risk:* if the cargo train is too rare or silent, players won't notice the upgrade; mitigated by the patrol loop and visible passing beat.
- **Systems architect:** (1) `TRAIN_PHASE.SHED` + `fleetJoin` + `rail.install` already exist, so a cargo train is a catalog slot (`role: 'cargo'`), not a new sim. (2) A `siding: bool` flag on `Train` bypassed by main-track `blockFree`/`lineSpacing` gives zero-wait passing without path-signal graphs. (3) Integer `yardLogs`/`yardStone`/`yardRails` fields on `Train` preserve exact lockstep conservation across all witnesses. *Risk:* siding re-entry timing and Quarry spatial clearance; contained by `blockFree` re-entry checks and `level-check`.
- **Creative director:** (1) Passenger train blasting past a loading cargo train on the Quarry siding is the signature clip (*Transport Fever 2* / *Sid Meier's Railroads!* energy, zero UI). (2) Squat work-engine silhouette, amber lamp, no coach, and solid crate/bundle stacks make it readable at 60 m and fun to crate-surf. (3) Deeper chuff/horn and indifferent waiting riders reinforce the split by ear and eye. *Risk:* visual confusion with passenger trains; contained by removing the coach and benches and keeping levers off it.

---

## Design review (2026-11-26)

Self-review by the brief's author per `.claude/skills/design-review/SKILL.md`. Read: `DESIGN.md`, `docs/agents/owner-calls.md`, `docs/agents/context.md`, `docs/decisions-rewards.md`, `docs/decisions-core-loop.md`, `docs/decisions-rail.md`, `docs/decisions-look.md`, `docs/decisions-characters.md`, `docs/direction.md`, `docs/playtests.md`, `docs/research/README.md` (`rail-network-depth.md`, `roundhouse-management.md`, `comedy-in-games.md`), `docs/plans/halt-yard.md`, `docs/plans/slice5-town-economy.md`, `docs/plans/campaign-outline.md`, `docs/brainstorms/station-deposit.md`, `docs/brainstorms/passenger-trade.md`, and the `src/sim/` + `src/entities/railway/` files cited in Shape. No browser stills were taken (docs-only pass; Quarry siding geometry is unproven until a build plan runs `level-check` and stills). No rows were added to `docs/agent-calls.md` or `docs/backlog.md` (left to the orchestrator). Nothing is ported from Place.

### Gameplay calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Separate cargo trains ("C") come after the greybox route | Decided | Owner, 12 Nov 2026 (`d-2026-11-12-cargo-trains-and-hub-towns-answered`, "A now, C later") |
| 2 | Full-load stop at middle-halt sources (whole trainload waits, player never hauls or calls for it) | Decided | Owner, 12 Nov 2026 (`d-2026-11-12-cargo-trains-and-hub-towns-answered`, `d-2026-11-12-town-economy-answered`) |
| 3 | Anything on rails costs materials, never Boogles; materials and Boogles never convert | Decided | Owner, 10 Nov 2026 (`d-2026-11-10-boogles-build-houses-and-upgrade-sources`, `d-2026-11-10-open-calls-answered-riders-and-boogles`) |
| 4 | Freight adds no waiting on the main route; nothing the route needs comes from a hub town | Decided | Owner, 12 Nov 2026 (`d-2026-11-12-cargo-trains-and-hub-towns-answered`; `slice5-town-economy.md` R2b/R3) |
| 5 | Halt-yard build 2: cargo cars move a yard's spares toward open bills on its line, visible in transit, no routing/quotas | Decided | Owner, 10 Nov 2026 (`d-2026-11-10-open-calls-answered-yards-at-halts`; `station-deposit.md` build 2) |
| 6 | Commissioned per line at the Roundhouse for steel from the shared pool (Line 2 first) | New | Open question 1; recommended as written (matches `d-2026-11-15-garage-choices` and `d-2026-11-25-recommendations-taken-pool`) |
| 7 | Off-main freight siding at middle-halt sources (Quarry first), bypassed by main-track blocks; lifts `footingsOwed` lockout for cargo trains | New | Recommended; satisfies Decided calls 2 and 4 together without delaying passenger/wagon trains |
| 8 | Platform levers and waiting riders ignore cargo trains; no player benches, solid crate decks remain rideable | New | Open question 3; recommended as written (prevents stranding players on freight while keeping Principle 10 slapstick) |
| 9 | Idle cargo train runs a slow patrol loop rather than parking in the shed | Default | Open question 4; recommended as written, cheap to flip |
| 10 | Unloaded halt-yard spares land on the destination halt's depot/rack or halt yard, never auto-filling a hand-fed frame | New | Open question 5; recommended as written (preserves "hands-on work" and `d-2026-11-02-hauling`) |
| 11 | Distinct cargo silhouette (no coach, amber work lamp, open slatted cars) and deeper procedural horn/chuff | Default | Follows Principle 7 & 11; cheap to tune; placeholder label `[placeholder: Cargo train]` for owner |
| 12 | "A" → "C" per-line handoff: passenger trains drop freight duty once `Line.cargo` is true | Default | Cleanly separates mixed vs. dedicated service without altering pre-steel seeds |

**Counts:** 5 Decided, 3 Default, 4 New.

### Findings

1. **Research alignment (no contradiction).** Follows `docs/research/rail-network-depth.md` (friends choose a physical improvement, the railway runs itself, no manual signals/filters/quotas, protect en-route trains), `docs/research/roundhouse-management.md` (distinct engine jobs in the Roundhouse, automatic spacing), and `docs/research/comedy-in-games.md` (clean controls, messy outcomes — solid crate surfing without risking stranding).
2. **First meeting & learning without being told.** The player first meets the feature as a new tile under the Roundhouse's `Cargo` category once steel arrives from Ring Island. Commissioning plays the existing Roundhouse rollout, and the first time they ride Line 2 past the Quarry they see the cargo train tucked into the siding under the loader arm—teaching the split without a tutorial card.
3. **Solo vs. co-op.** Solo, the player leaves spares in a halt yard and catches the faster passenger train knowing freight will bring spares and stone behind them. In co-op, one player can harvest/deposit at the Quarry or Camp while another builds at the Pier/Ring Island, with the cargo train acting as a visible relay. Late-joining friends see the commissioned cargo train immediately from replicated `Line.cargo` and `Train` rows.
4. **Level & flow check (Quarry siding unproven).** All three near-universal flow rules hold: the Roundhouse tile is findable, cargo trains respect every route gate (they never open or bypass a locked stretch, and halt-yard build 2 only serves open unblocked bills), and nobody can be stranded (cargo trains never trap players in a siding; you can hop off onto the Quarry ground). However, the Quarry siding's exact coordinates and turnout length are **not yet proven** against `HaltYard` slot 2 at `(1076.7, 51.4)` and Q3's reward crate 6.0 m away (`docs/plans/halt-yard.md` Level findings). The build plan must run `npm run level-check` and take player-eye stills at the Quarry before placing the siding.
5. **Copy check.** No Boogler lines are added or touched. One placeholder UI string (`[placeholder: Cargo train]`) is marked for the owner.
6. **Owner questions.** All five open questions in the brief above cover the New/Default calls; none blocks drafting a build plan once the greybox route checkpoint closes.
