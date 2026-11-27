> **Status: proposed (2026-11-27).** Light brainstorm (one agent, three lenses: play designer, systems architect, creative director; one pass), design-reviewed below.

# Any work anywhere counts (lane-b-any-work-counts)

Seed (Lane B of [`docs/plans/course-change.md`](../plans/course-change.md#lane-b-any-work-anywhere-counts), approved 27 November 2026; [`docs/decisions-core-loop.md#d-2026-11-27-course-change`](../decisions-core-loop.md#d-2026-11-27-course-change)): a guest who chops the nearest tree and gives the logs at the nearest station has advanced the room, and sees their name. Checkpoint item 2: **logs given at Home reach the works without the giver going there.**

## Pitch

A friend who drops into Boogle mid-session should not have to ride three kilometres to the frontier before they can help. Every open halt's existing **halt yard** (`HaltYard`) becomes the station's **gift rack**—no second bin to learn—wearing the works' pennant whenever the current works can use what you carry. Chop the nearest tree at Home, walk ten seconds to the rack, and press Interact (`[placeholder: Give to works]`): the logs fly onto the stack, your name appears immediately on the station board's unranked **Thanks** list, and the next departing **kit/service train** (not a separate cargo train) scoops them up and carries them out to the active works. On arrival, **player-gifted cargo pours directly into the works' bill**—advancing the room without the giver leaving Home—while automatic minted kit stays on the rack for hand-feeding. When the works wants rails or footings that a fresh guest cannot make, raw logs (or stone) still count: Home's Forge puffs and turns 2 gifted logs into 1 rail, and the Works kiln turns 4 gifted stone or logs into 1 footing.

Serves DESIGN.md's **core loop** (*"anything a player gives at any station counts toward it"*), **6. Communal world** (remote help advances the same shared build), **7. Telegraph everything** (visible stack, pennant, train load, and board), **8. Enjoyable alone and together** (a drop-in guest makes an accepted contribution in under 120 seconds from landing), and **11. Show, don't tell** (the board shows the works, what is on the way, and who helped). **Narrows one prior decision:** the 25 November shared-pool rule (*"station frames, the forge, the kiln, the works and leg frames stay fed by hand at the frame"*) is narrowed for **player-gifted cargo** arriving by train, per the 27 November course change; see [Open question 3](#open-questions).

## Gut question

When a drop-in guest chops one tree at Home, gives the logs at the station, sees their name appear on the board, and watches the next train carry their bundle out toward the works' plume, do they immediately feel like they just helped build the railway?

## The four questions, answered

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | **Where does a gift go in?** | **Unify with the existing `HaltYard` bay** (no second rack per halt). Home's Village yard (`HALT_YARDS[0]`, always open from tick 0) and every open halt yard act as the station's gift rack, badged with the works' pennant; later halts get a `HaltYard` catalog row as they open. Keep Home's board and Village rack in sight of each other (or pair a board-side cradle backed by yard 0). |
| 2 | **What carries it to the works? Is a cargo train the carrier?** | **No—a cargo train is NOT Lane B's carrier.** `docs/plans/cargo-trains.md` is post-steel, Roundhouse-commissioned (2 steel), and Line 2 only; Lane B must work from the start of the room without a commission. **Existing kit/service trains carry gifts** (and the depot cart on Home before trains wake). `cargo-trains` stays parked as a later P3 Line 2 stone-siding upgrade. **Smallest first build without one:** Home's Village yard + existing Line 2 (and branch relay) service trains carrying gifted cargo to the active works and pouring it into the works' bill on arrival. |
| 3 | **How does it show on Lane A's station board?** | Lane B's sim exposes two pure reads to A2's board (and Pause): **(a) On-the-way count** beside the works' bill icons (gifts waiting in a rack or riding a train, e.g. `8/20` with a small train pip `+8`), and **(b) an unranked Thanks list** of roster names (`Roster.names[idx]`, stable non-ranked order, zero per-player numbers, per `d-2026-11-02-thanks`) updated the instant an accepted gift or hand-feed lands. |
| 4 | **What can a guest give when the works wants rails or footings?** | **Raw harvests (logs, and stone once the breaker is unlocked) always count.** Logs stoke Home's Forge at **2 logs → 1 rail** (one 8-log starter back = 4 rails); stone or logs stoke the Works kiln at **4 → 1 footing** (one 8-piece back = 2 footings). During a non-material step (beam, boiler, gate, rivet), the rack still accepts logs/stone as pre-staged gift stock for the next material bill and adds the giver's name to Thanks. |

## Best suggestions

1. **Reuse `HaltYard` as the station gift rack—never build two racks per halt** (`systems`, `design`). `HaltYard` (`src/sim/railway-yard-layout.ts`, `src/sim/railway-sys-yard.ts`) is already built, saved, conserved across all witnesses, uncapped with 8-piece bundles past 24, and predicted. Upgrading it into the station's dispatch rack avoids duplicate bins, duplicate prompts, and "which rack is for gifts?" confusion.
2. **Existing kit/service trains carry gifts; leave `cargo-trains` parked as P3** (`systems`, `design`). Service trains already run on every line (`railway-sys-trains.ts`, `railway-sys-route-kit.ts`, `railway-sys-steel.ts`) and already relay through `LegYard` to branch lines. Riding them makes Checkpoint 2 work at every post-train stage immediately—no steel prerequisite, no siding geometry, no new train slot.
3. **Player-gifted cargo pours directly into the active works' bill on train arrival** (`design`, `creative`). Merely replacing minted kit on `Leg.rackLogs` leaves the works' bill at `0/20` until someone at the frontier walks it in, failing *"logs given at Home reach the works without the giver going there."* Automatic minted kit stays on the rack for hand-feeding; player-gifted cargo is hands-on work done at a station and advances the bill itself when the train arrives.
4. **Immediate Thanks + "on the way" pip on Lane A's board** (`creative`, `design`). A train trip can take 30–120 seconds; a guest needs feedback in 1 second. On accepted gift, their name appears immediately in the unranked **Thanks** list (sorted alphabetically or by roster join order, never by count, no numbers) and the board shows a small train-pip `+N` beside the needed icon until the train lands and the main bill ticks up—like *Death Stranding*'s road contributors without a leaderboard.
5. **Logs stoke the Forge (2 → 1 rail) and kiln (4 → 1 footing) so a starter axe always helps** (`design`, `creative`). A fresh guest spawns with only an axe and an 8-log back. Letting Home's Forge puff extra smoke and turn 2 gifted logs into 1 rail (and the Works kiln turn 4 gifted stone/logs into 1 footing) obeys Principle 11 physically while guaranteeing that chopping the nearest tree *always* advances the room.
6. **Distinct pennant and loading beat on the departing train** (`creative`). Give the rack the same pennant as Lane A1's works signal and A3's works train. When a train stands at Home and loads gifted bundles, play the existing bin-to-deck flight (`halt-yard-flights.ts` pattern) and a warm wooden chime so a guest standing at the station watches *their* bundle leave on the train.

**Tensions:**
- **Direct bill credit vs. "frames stay fed by hand at the frame" (`design` vs. `25 Nov shared-pool`).** Pouring gifted cargo into the bill on train arrival narrows the 25 November rule. *Recommendation:* apply direct credit **only** to player-gifted cargo arriving by train; automatic minted kit still unloads onto the rack for hand-feeding at the works. (Open question 3.)
- **Unified `HaltYard` vs. taking gifts back out (`systems` vs. `design`).** If a player puts 8 logs into a `HaltYard`, gets thanked, and immediately presses `Pick up` (`rail.haltTake`), could they farm Thanks or drain a friend's gift? *Recommendation:* Thanks is an unranked set (no counts, no medals, one entry per player per works), so farming does nothing; keep `Pick up` on ordinary spares, or split only the Village/rack prompt into `[placeholder: Give]` (moves straight into the dispatch queue, non-withdrawable) vs. `Pick up` for recovery spares. In the smallest first build, keeping `HaltYard` unified and recording Thanks once per works step is simplest and avoids a second bin. (Open question 1.)
- **Home's recovery rack `(905, 1)` vs. Home's station board (`creative` vs. `systems`).** The Village yard (`HALT_YARDS[0]`) stands at `(905, 1)` (13.2 m from spawn, 24 m from Line 1's platform). Lane A2 puts the station board at Home's hall/station. If the guest reads the board at the hall and has to hunt 24 m for the rack, the two-minute flow breaks. *Recommendation:* either place a board-side gift cradle at Home's station wired to yard 0's `giftLogs`/`giftStone`/`giftRails`, or place Home's board within sightline of `(905, 1)`. The planner confirms exact coordinates against Lane A2's placement.

## Shape

- **Sync kind:** **Server** state in the existing railway ECS (`src/sim/railway-components.ts`), saved and replicated like `HaltYard` and `Train`. Giving uses declared reversible prediction (matching `rail.haltPut` in `src/world/railway-predict.ts`). Board reads, pennant visuals, bin-to-deck flights, Forge smoke puffs, and arrival chimes are **Local** over accepted rows. One `WORLD_NS` bump when the rules ship (no compatibility code, per `docs/agents/mixed-builds.md`).
- **Reuses (checked paths):**
  - `src/sim/railway-yard-layout.ts` (`HALT_YARDS`, `VILLAGE_YARD`, `HALT_YARD_REACH`) and `src/sim/railway-queries-yard.ts` (`haltYardOpen`, `haltYardStock`, `haltYardServes`).
  - `src/sim/railway-sys-yard.ts` (`haltPut`, `haltTake`) and `src/sim/railway-sys-line1.ts` (`credit`, `putDown`).
  - `src/sim/railway-sys-trains.ts` (`trainIO.standing`, `trainIO.arrive`, `serviceOf`) and `src/sim/railway-sys-route-kit.ts` (`legKitLoad`, `legKitArrive`, `legKitService`, `legKitDrop`).
  - `src/sim/railway-sys-steel.ts` (`steelLoads`, `steelArrives`), `src/sim/railway-sys-works.ts` (`kiln`, `footingsArrive`), and `src/sim/railway-cart.ts` (`cartMint`, `cartUnload` for pre-train Q1–Q5).
  - `src/sim/roster.ts` (`Roster`, `indexOf`, `names` — stable replicated player index so Thanks prints names even after a guest leaves, with no raw strings in railway tick state).
  - Lane A0's pure works query (`docs/plans/course-change.md` A0) for the active works site, its remaining bill, and its destination halt/line.
  - Conservation witnesses: `railCounts`, `line2Logs`, `line2Rails`, and line 1 stone conservation (`src/sim/railway-check-line1.ts`, `src/sim/railway-check.ts`).
- **Smallest first build (Checkpoint 2, no cargo train):**
  1. **Sim state (one `WORLD_NS` bump):**
     - Dedicated gift-dispatch counts on `HaltYard` (or drawn from `HaltYard` stock marked as gifts) and small conserved integer fields on `Train` (`giftLogs`, `giftStone`, `giftRails`, or `giftKind`/`giftN`) so gifted cargo is cleanly separated from minted kit and never double-counted in `depotProduced`.
     - One compact **Thanks** component (e.g. `WorksThanks` holding the current works key + a bitmask or bounded integer array of `roster` indices who contributed to it, cleared when the active works advances; updated on both hand-deposits at the works and accepted station gifts).
     - Pure query `worksInTransit(w)` (gifts queued at halts + aboard trains) and `worksThanks(w)` (unranked roster indices) for Lane A2's station board and Pause.
  2. **Carrier hook (no new train):**
     - On `trainIO.standing` at Home (halt 0, and open middle halts where a train already stops—no new unrequested middle stops that break passenger headway in build 1), load queued gifts needed by the active works onto the train (converting 2 logs → 1 rail at Home when the works wants rails, or 4 logs/stone → 1 footing when it wants footings, capped at what the active works still owes).
     - On `trainIO.arrive` at the works' halt (or via `LegYard` relay for branch legs), pour `gift*` directly into the active works' bill (`QJob.stock`/`railStock`, `Steel`, `Leg.logs`/`rails`, `Aperture`/`Works` footings), triggering the existing lay/completion rule if the bill fills; any overflow lands on the works' rack/yard so nothing ever vanishes.
     - Pre-train Home stages (T1–T3, Forge, Q1–Q5): the depot cart carries Home gifts to active Q1–Q5 frames; before the cart wakes, gifts at Village stay in the Village rack (with the active T1–T3 / Forge site within 30 s walk) or ride out the moment the cart/trains wake.
  3. **View:** pennant badge on the gift rack, `[placeholder: Give to works]` prompt when carrying anything the rack takes, bin-to-deck flight on train load, and wiring `worksInTransit` + `worksThanks` into Lane A2's station board.
- **Risks:**
  - *Conservation & witnesses:* every gift unit moved from `Account` → `HaltYard` → `Train` → active works (or converted 2→1 / 4→1 at the Forge/kiln) must balance in `railCounts`, `line2Logs`, `line2Rails`, and `railway-check.ts` save invariants. Conversions must record burned logs/stone explicitly (e.g. a conserved `giftedOut` / `stoked` counter) so conservation stays exact.
  - *Multi-line relay:* works past High Gorge (`ns`, `bay`, `cave`) are not on Line 2. In build 1, gifted cargo on Line 2 unloads into `LegYard` at High Gorge (marked as gift stock) and rides the branch train's existing `yardLoad` to the railhead—reusing the exact relay already proven for greybox leg 2.
  - *Over-delivery race:* two trains carrying gifts + a player hand-feeding at the works could exceed the remaining bill. Contain by clamping bill pour to `remainingNeed` and putting any surplus onto the works' rack or nearest open yard—never dropping or failing a witness.
  - *Passenger headway:* loading only where trains already stand (Home halt 0, plus any existing stop) guarantees zero added middle-halt braking or passenger delay in build 1.
  - *Hotspots:* `railway-sys-trains.ts`, `railway-components.ts`, `railway-check.ts`. Keep gift logic in a new `src/sim/railway-sys-gift.ts` + `src/sim/railway-queries-gift.ts` with minimal hooks in `railway-sys-trains.ts`.

## Done means

Each moment captured with `look` (proposed `--eval` setups for the builder):

1. **Checkpoint 2 end-to-end (Home → works without going there):** `--rail-seed stack-open` (or `q6-ready`, trains running, active works far from Home). Guest spawns at Home, chops 8 logs from the nearest tree, walks to Home's gift rack, presses Interact. Still 1: stack appears in the rack and the station board immediately shows the guest's name in unranked **Thanks** and `+8` on the way. Still 2 / `--video`: departing Line 2 train loads the 8 logs visibly onto its deck. Still 3 (camera at the works): train arrives, bill advances by 8 (`0/20` → `8/20`) with the guest still standing at Home; `railCounts` conservation holds.
2. **Conversion when the works wants rails:** `--rail-seed` with active works needing rails only (`logs` full, `rails` owed). Guest chops 8 logs at Home and gives them at Home's rack. Forge puffs; next departing train loads 4 rails; works' rail bill advances by 4 on arrival; guest's name is on the board.
3. **Unranked Thanks with two players:** two-client check where Player A hand-feeds 16 logs at the works and Player B gives 4 logs at Home. Station board lists both names in stable unranked order with **no counts, no order by amount, and no badges**.
4. **First-contribution measure:** fresh guest landing at Home with Lane A + Lane B reaches accepted `first contribution` well under 120 seconds (logged in playdata trace).

## Open questions

At most five. The brief goes to the planner on its recommended answers; none waits for a playtest.

1. **Unify the gift rack with the existing `HaltYard` bay, or add a separate one-way Gift Rack beside each station board?**
   **Recommended: unify with `HaltYard`** (one bay per open halt, badged with the works pennant, starting with Village slot 0 always open; pair a board-side drop at Home if Lane A2's board is not beside `(905, 1)`). Avoids two competing racks at every halt and reuses existing meshes, bundles, colliders, and conservation.
   Answer: ___
2. **Is a dedicated cargo train the carrier for gifts, or do existing kit/service trains carry them?**
   **Recommended: existing kit/service trains carry gifts (and the depot cart on Home before trains wake); keep `docs/plans/cargo-trains.md` parked as a later P3 Line 2 freight upgrade.** Cargo trains require steel and a Roundhouse commission, so they cannot serve Checkpoint 2 or early/mid-route guests.
   Answer: ___
3. **When player-gifted cargo arrives at the works by train, does it pour directly into the active works' bill or land on the works' rack?**
   **Recommended: pour directly into the active works' bill on train arrival (clamped to remaining need, overflow to the rack), while automatic minted kit stays on the rack for hand-feeding.** This narrows the 25 November rule (*"frames stay fed by hand at the frame"*) for player-gifted cargo only, so a guest at Home genuinely advances the works without anyone needing to stand at the frontier.
   Answer: ___
4. **How should raw logs/stone help when the works wants rails or footings?**
   **Recommended: Home's Forge converts gifted logs at 2 logs → 1 rail, and the Works kiln converts gifted stone or logs at 4 → 1 footing (one starter 8-log back = 4 rails or 2 footings).** During a non-material step (beam, boiler, gate, rivet), the rack still accepts logs/stone as pre-staged stock for the next material bill and credits Thanks.
   Answer: ___
5. **When does the station board's unranked Thanks list reset?**
   **Recommended: per works step** (clears when the active works finishes and the next works opens, keeping the current works' contributors—both hand-feeders and remote givers—visible until it completes). Alternative: keep a rolling list of the last few contributors across steps so a guest's name lingers longer.
   Answer: ___

## Placeholder copy

None of The Boogler's copy is added or changed. All proposed strings below are placeholders for the owner:

- `[placeholder: Give to works]` — Interact prompt at a halt's gift rack when carrying logs, stone, or rails.
- `[placeholder: On the way]` — station board indicator for gifted cargo queued in a rack or riding a train.
- `[placeholder: Thanks]` — station board heading above the unranked contributor names (matches `course-change.md` open question 3).
- `[placeholder: Ready for next works]` — subtle board note when gifts are pre-staged during a non-material step.

## Parked

- **Cargo-train handoff (`docs/plans/cargo-trains.md`):** if cargo trains are later unparked as a P3 Line 2 upgrade, they can take over Quarry/Far Head middle-halt gift pickups using the Quarry siding without changing Lane B's rack or Thanks rules.
- **Arrival chime & distant toast for online givers:** a soft train-whistle chime and small non-blocking badge when *your* gifted bundle lands at the far works while you're still hanging out in town.
- **Middle-halt gift stops on request:** in build 1, trains load gifts at Home (halt 0) and any halt where they already stop; later, a halt with queued gifts could trigger a full-load or clear-behind stop like `cargo-trains.md`.
- **Townsfolk loader at the gift rack:** a little guy who bundles your gift with a ribbon and waves as the train leaves (reuses the halt-yard keeper idea).
- **Post-completion plaque archive:** a small visitors' book at Home's hall listing everyone who helped build the ring (unranked, per `d-2026-11-02-thanks`).

---

## Three-lens pass (summary)

- **Play designer:** (1) Unifying with `HaltYard` and accepting raw logs/stone for every bill (2 logs → 1 rail, 4 → 1 footing) guarantees a fresh guest with only a starter axe can help within 60 seconds of landing, at any stage of the campaign. (2) Pouring player-gifted cargo directly into the works' bill on train arrival makes remote help real instead of cosmetic; automatic minted kit stays hand-fed so working at the frontier still feels physical. (3) Immediate unranked Thanks + "on the way" pip closes the feedback loop before the train even arrives. *Risk:* if Home's rack is out of sight of Lane A2's station board, guests won't connect "board says logs" to "put logs here"; mitigated by co-locating or pairing a board-side cradle.
- **Systems architect:** (1) Riding existing kit/service trains (`railway-sys-trains.ts`, `railway-sys-route-kit.ts`) and `HaltYard` (`railway-sys-yard.ts`) delivers Checkpoint 2 in one `WORLD_NS` bump with zero new train slots, zero siding geometry, and zero passenger headway impact—and cleanly unblocks the backlog by leaving `cargo-trains.md` parked as P3. (2) Storing Thanks as a small set of `Roster` indices (`src/sim/roster.ts`) keeps railway state deterministic, integer-only, and compact while printing names even after a guest leaves. (3) Separating `gift*` counts from minted `depotProduced` keeps all conservation witnesses exact, with explicit accounting for 2→1 and 4→1 Forge/kiln conversions. *Risk:* multi-line relay to branch legs (`ns`/`bay`/`cave`) and over-delivery races; contained by reusing `LegYard` relay and clamping bill pour with rack overflow.
- **Creative director:** (1) The clip moment: a guest chops a tree at Home, tosses 8 logs into the pennanted rack, sees their name pop onto the board beside `[placeholder: On the way +8]`, and watches the works-pennanted train pull out with their strapped bundle on its deck. (2) Matching the rack's pennant to Lane A1's works plume and A3's works train ties the whole loop together visually with zero tutorial text. (3) Home's Forge puffing extra smoke when gifted logs convert to rails sells the conversion physically (*Principle 11*). *Risk:* a guest waiting 90 seconds with no immediate sign that their gift mattered; solved by instant board Thanks + `+N` pip + loading flight.

---

## Design review (2026-11-27)

Self-review by the brief's author per `.claude/skills/design-review/SKILL.md`. Read: `DESIGN.md`, `docs/agents/owner-calls.md`, `docs/agents/context.md`, `docs/decisions.md` (routing table), `docs/decisions-core-loop.md` (Current rules, `d-2026-11-27-course-change`, `d-2026-11-02-thanks`, `d-2026-11-17-separate-capacities`), `docs/decisions-rail.md` (Current rules), `docs/decisions-rewards.md` (Current rules, `d-2026-11-25-recommendations-taken-pool`, `d-2026-11-12-cargo-trains-and-hub-towns-answered`), `docs/direction.md`, `docs/playtests.md` (first-visit kit and entries), `docs/plans/course-change.md`, `docs/plans/cargo-trains.md`, `docs/plans/halt-yard.md`, `docs/brainstorms/station-deposit.md`, `docs/brainstorms/cargo-trains.md`, `docs/research/README.md` (`rail-network-depth.md`, `shared-construction.md`, `wordless-onboarding.md`), and the `src/sim/` files cited in Shape (`railway-yard-layout.ts`, `railway-queries-yard.ts`, `railway-sys-yard.ts`, `railway-sys-trains.ts`, `railway-sys-route-kit.ts`, `railway-queries-route.ts`, `railway-components.ts`, `roster.ts`). No browser stills were taken (docs-only pass; Home's board-to-rack sightline must be checked with `look` once Lane A2's board coordinates are pinned). No rows were added to `docs/agent-calls.md` or `docs/backlog.md` (left to the orchestrator to avoid parallel-lane merge conflicts). Nothing is ported from Place.

### Gameplay calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Any work anywhere counts: gifts given at a station reach the works by train, and the board thanks the giver by name | Decided | Owner, 27 Nov 2026 (`d-2026-11-27-course-change`; `course-change.md` Checkpoint 2) |
| 2 | Thanks stay unranked: names only, no order by contribution, no per-player counts or badges | Decided | Owner, 2 Nov 2026 (`d-2026-11-02-thanks`) |
| 3 | Unify the gift rack with the existing `HaltYard` bay (no second rack per halt; Village slot 0 always open; pair a board-side drop at Home if needed) | New | Open question 1; recommended as written (reuses `halt-yard.md` build 1 without cluttering halts) |
| 4 | Existing kit/service trains carry gifts (and the depot cart on Home before trains wake); `cargo-trains.md` is NOT the carrier and stays parked as P3 | New | Open question 2; recommended as written (unblocks backlog `cargo-trains` row and works from start without steel) |
| 5 | Player-gifted cargo pours directly into the active works' bill on train arrival (clamped to remaining need, overflow to rack), while automatic minted kit stays on the rack for hand-feeding | New | Open question 3; recommended as written (narrows `d-2026-11-25-recommendations-taken-pool` item 1 for gifted cargo so Checkpoint 2 advances the works) |
| 6 | Raw harvests always help: 2 gifted logs → 1 rail via Home's Forge; 4 gifted stone or logs → 1 footing via the Works kiln | New | Open question 4; recommended as written (ensures a fresh guest with starter axe + 8-log back can always contribute) |
| 7 | During non-material steps (beam, boiler, gate, rivet), the rack still accepts logs/stone as pre-staged stock for the next material bill and credits Thanks | Default | Prevents a drop-in guest from ever being refused when the works is on a one-off action |
| 8 | Station board shows an immediate `+N` on-the-way pip for queued/in-transit gifts alongside the works' bill counts | Default | Closes the 30–120 s train travel gap with instant feedback (Principle 7 & 11) |
| 9 | Unranked Thanks list resets per works step (both hand-feeders and station givers appear together) | Default | Open question 5; recommended as written, cheap to change to a rolling list |
| 10 | Trains load gifts only where they already stand in build 1 (Home halt 0 and existing stops), adding zero unrequested middle-halt braking | Default | Preserves passenger headway and `d-2026-11-23-greybox-service-health` |
| 11 | Pennant on the gift rack matching Lane A1's works signal and A3's works train; Forge puffs smoke on 2→1 log-to-rail conversion | Default | Ties Lane A and Lane B into one visual language (Principle 7 & 11) |
| 12 | Placeholder strings (`[placeholder: Give to works]`, `[placeholder: On the way]`, `[placeholder: Thanks]`, `[placeholder: Ready for next works]`) | Default | Owner copy; marked as placeholders, none of The Boogler's copy touched |

**Counts:** 2 Decided, 6 Default, 4 New.

### Findings

1. **Research alignment (no contradiction).** Follows `docs/research/rail-network-depth.md` (automatic service, zero routing/filters/quotas), `docs/research/shared-construction.md` (fluid parallel labour where remote friends visibly advance the same build without permission or ranking, citing *Death Stranding*'s non-ranked road contributors), and `docs/research/wordless-onboarding.md` (safe, immediate first-minute loop with one shared gauge and clear literal feedback).
2. **First meeting & learning without being told.** A fresh guest lands facing Home's station board (Lane A3), sees the works' icon and count, chops the nearest tree, and spots the matching works pennant on the gift rack beside/in sight of the board. One Interact press flies the logs onto the stack, adds their name to **Thanks**, and pops `+8` on the board—teaching the entire remote-help loop in under a minute without a tutorial card.
3. **Solo vs. co-op.** In co-op, a drop-in guest at Home advances the frontier build while the host works at High Gorge or Bell Rock, and both names appear side by side on the board. Solo, a player passing Home or any halt can toss spare logs into the rack and ride ahead knowing the train brings them into the next bill. Late joiners see queued gifts, loaded trains, and Thanks immediately from replicated server rows.
4. **Level & flow check (three near-universal rules hold; Home sightline to verify).**
   - *Rule 1 (findable next goal):* served by pairing the rack's pennant with Lane A's board and works plume. **Watch item for planner:** `HALT_YARDS[0]` sits at `(905, 1)` (13.2 m from spawn, 24 m from Line 1 platform). Once Lane A2 pins Home's station board position, verify with a player-eye `look` still that the rack is in direct sight of the board—or place a board-side gift cradle backed by yard 0.
   - *Rule 2 (gates keep their meaning):* gifts only feed open, unblocked material bills (matching `cargo-trains.md` condition iii) and never open a gate, strike a rivet, or supply a movement ability.
   - *Rule 3 (nobody stranded):* a gift rack never takes a key item (beam, boiler, footing) and never traps a player; logs and stone regrow slowly.
5. **Explicit tension with 25 November shared-pool decision.** Call 5 (direct bill pour on train arrival) deliberately narrows `d-2026-11-25-recommendations-taken-pool` item 1 (*"frames stay fed by hand at the frame"*) for player-gifted cargo only, so Checkpoint 2 works without a player standing at the works. Surfaced as Open question 3.
6. **Copy check.** No Boogler copy is touched. All four UI/prompt strings are marked `[placeholder: ...]` for the owner.
