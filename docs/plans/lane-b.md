> **Status: planned (2026-11-27).** Planner's plan for [Lane B](course-change.md#lane-b-any-work-anywhere-counts) of the course change, from the brief [lane-b-any-work-counts](../brainstorms/lane-b-any-work-counts.md) on its recommendations, against main `ffb5c7950` (world v75). One build pass: steps 1 to 3 are one `src/sim` branch with one world bump, then the views. Step 3 has two variants and waits on the owner ([the owner's question](#the-owners-question)); steps 1, 2 and the shared parts of 4 do not.

# Lane B: logs given at Home reach the works

## Goal

A guest who chops the nearest tree at Home and leaves the logs on Home's rack has advanced the room's works without going there, and their name is on the board. This is checkpoint item 2 ("logs given at Home reach the works without the giver going there"). It serves DESIGN.md's core loop ("anything a player gives at any station counts toward it"), 8 (a guest "can do something that advances the room within two minutes") and 7 and 11 (the gift is seen leaving on the train and arriving at the frame). Variant 3a narrows a 25 November rule; the [owner's question](#the-owners-question) covers it.

**Research:** [shared-construction](../research/shared-construction.md): a friend's action should change what you can do next, not only a counter, and the frame filling is that change. [rail-network-depth](../research/rail-network-depth.md): the railway runs itself, with no routing or quotas, so gifts ride the kit trains already running. The brief's other citations ([wordless-onboarding](../research/wordless-onboarding.md)) apply to Lane A's board.

## What the code does today, and what it means for a gift

Read before choosing the design (`src/sim/railway-sys-route-kit.ts`, `railway-queries-route.ts`, `railway-sys-yard.ts`, `railway-sys-trains.ts`):

- **Home's rack already takes gifts.** `rail.haltPut { yard: 0, kind: 0 }` (Leave it here at the Village yard, `VILLAGE_YARD`) puts every log off the back onto the recovery rack, `Rail.rack`. The op exists, is validated for reach on the server, is predicted (`src/world/railway-predict.ts`), and already counts as a first contribution (`'yard left'` in `src/proto/playdata/record.ts`). Lane B adds **no new op and no second rack**: the brief's question 1, unify with `HaltYard`, is met by Home's existing yard.
- **A leg's kit is minted.** After the steel works, every bill on the route is a leg section (`stack-1` to `causeway-1`, 22 beats). A train standing at its line's kit halt mints the logs for it (`legKitLoad`: `Rail.depotProduced += logs`), takes the rails off the forge rack, carries them to the leg's rack (`Leg.rackLogs`), and players at the frontier feed the frame from the rack (`rail.legStock`). `LEG_TUNE.kitLead` is "all remaining", so a leg's whole kit is minted over its first few trips, and from then on no kit is owed.
- So **a gift only advances the room if it does more than replace minted kit.** Logs put on the works' rack stand in for logs a train would have minted anyway; the frame's bill stays where it was until someone at the frontier feeds it. Variant 3a (pour into the bill) advances the room; variant 3b (onto the rack) carries the gift there but does not advance it. Step 3 states this for each variant.
- **Branch lines mint away from Home.** The bay, Canopy, cave, White Wall and Notch legs mint at their own line's first halt (`legKitHalt(line)`), and take their rails off Home's forge rack from there. Lane B uses the same precedent: a branch line's kit train standing at its kit halt may take logs off Home's rack. The bundle is seen leaving only on line 2, at the Village. See call 5 and Risks.

## The owner's question

The brief's open question 3. **Do gifted logs arriving at the works pour into the frame's bill, or unload onto the works' rack?** Pouring narrows [d-2026-11-25-recommendations-taken-pool](../decisions-rewards.md#d-2026-11-25-recommendations-taken-pool) item 1: "station frames, the forge, the kiln, the works and leg frames stay fed by hand at the frame". **Answered 27 November: (a), pour on arrival** ([entry](../decisions-rewards.md#d-2026-11-27-gifted-logs-pour-into-the-bill)). Steps 1, 2 and 4's shared parts are built, and step 3 is built as 3a.

| | (a) Pour on arrival (the brief's recommendation) | (b) Unload to the works' rack, the frame still fed by hand |
| --- | --- | --- |
| What happens | A train carrying gifted logs stops at the leg's rack halt and pours them into the current section's bill, up to what the bill still lacks. Minted kit still goes onto the rack for hand-feeding. | Gifted logs ride only while a leg's kit is still owed, instead of minted logs. They unload onto the rack as kit and are fed by hand like any kit. |
| Checkpoint item 2, "logs given at Home reach the works without the giver going there" | **Met**: the frame's bill goes up at the works while the giver stands at Home. | **Met in its words only**: the logs reach the works' rack. The room is no further on, because the train would have minted them. Once a leg's kit is minted (its first few trips), gifts wait at Home until the next leg opens. |
| Lane B's goal, "has advanced the room" | Met. | Not met. |
| The 25 November rule | Narrowed for logs that arrive by train from Home's rack. Kit and every other frame stay fed by hand. | Kept as it stands. |
| Extra sim work | Step 3a: a top-up load, a stop and the pour. | None: step 1 is variant (b); step 3b is its test. |

**Recommended: (a).** Variant (b) has nothing for a gift to replace once the kit is minted, so it cannot advance the room without a change to minting, which is a larger rule change than (a).

## Design

**Sync kind:** Server. Everything below is railway state in `src/sim/railway-components.ts`, saved, hashed and replicated as `Rail`, `Train` and `Account` are. The server owns every write. Rule ticks are `rail.trainTick` and `rail.legTick`, as today. The pennant, the prompt's wording, the bundle flights and the board's read are Local views over accepted rows.

**State (one `WORLD_NS` bump, v75 to v76, with a dated history line in `src/world/namespace.ts`):**

| Field | Type | Meaning |
| --- | --- | --- |
| `Train.gift` | `int` | Of this train's `logs`, those taken off Home's rack: always `0 <= gift <= logs`, and only with `legKit` set. Rails and stone are never gifts in this pass. |
| `Rail.giftOut` | `int` | Logs taken off Home's rack onto kit trains and not yet back, net. Gives the minted-log witnesses their gift term. |
| `Account.thanks` | `u8` | 0 if this account has given nothing since the last lay; otherwise `thanksStep(w) + 1` from its last accepted gift or feed. A `u8` keeps 256 accounts inside `MAX_RECOVERY_BYTES` (the reason `legLogs` is a `u8`). A module-load check refuses a route whose total section count reaches 255. |

**Commands.** None new. `rail.haltPut` (yard 0, logs) and `rail.legStock` also write `Account.thanks` through step 2's `thank(w, aid)`. Reach checks and validation stay in `src/world/railway-server.ts`, unchanged. Receipts stay as they are: `haltPut`'s declared prediction covers `Account.thanks`, because prediction runs the same rules on a clone. No effect plays from `apply`. The flights in step 4 follow accepted receipts and replicated rows.

**Pure logic, new file `src/sim/railway-queries-gift.ts`** (already under `LOCKSTEP_FILES`; integers only):

- `GIFT_LEGS`: the built legs with `kit: 'home'` (stack, bay cut, Canopy, cave, White Wall, Notch). Yard legs (incline, causeway) are excluded: their kit relays through High Gorge's `LegYard`, which carries no gift mark in this pass. A stocked leg (`STOCKED_LEGS`) is excluded while `laid === 0`, because no train reaches it.
- `giftLegs(w, line)`: the open `GIFT_LEGS` whose own line is `line`.
- `giftRides(w)`: Home's rack logs would ride now. Some line has an open gift leg that is owed logs (step 1), or that has pour room (step 3a widens it).
- `giftQueued(w)`: `giftRides(w) ? Rail.rack : 0`. `giftAboard(w, line?)`: `Σ Train.gift`, for one line or all of them.
- `thanksStep(w)`: `Σ Leg.laid`, which never decreases. `worksThanks(w)`: the pids of accounts with `thanks === thanksStep(w) + 1`, in Account entity order (first sight). No count, no sort by amount (call 2).

**Not in this pass** (parked as [Pass 2](#pass-2-not-in-the-first-build)): rails and stone gifts; the brief's conversions (2 logs → 1 rail at the forge, 4 → 1 footing at the kiln); Q6, Q7, the steel works, the kiln and the footing bills; yard legs; gift racks at halts other than Home; Thanks for feeds at bills other than a leg's frame.

## Steps

Each step leaves `node dev/ship-check.ts` green. The full `npm run check`, `npm run check:full`, `npm run loop -- run` and the bots run at the checkpoint below, not per step. Per the [flow decision](../decisions-process.md#d-2026-11-27-flow-one-pass-then-refine): one proof look at the end of the view pass and one review per pass. Steps 1 to 3 touch `src/sim` and `src/world`, so `npm run review-stamp` asks for one independent review of the sim branch (rule 3 keeps it for `src/sim`).

- [x] **1. Gifts ride the kit trains (sim; both variants).**
  Files: `src/sim/railway-components.ts` (`Train.gift`, `Rail.giftOut`), `src/sim/railway-queries-gift.ts` (new: `GIFT_LEGS`, `giftLegs`), `src/sim/railway-sys-route-kit.ts`, `src/sim/railway-check-line2.ts`, `src/sim/railway-check-route.ts`, `src/world/namespace.ts` (v76 and its history line), `test/railway-gift.test.ts` (new). The new queries file is already under `LOCKSTEP_FILES` (`src/sim/**`, `dev/lint/policy.ts`) and the server image (`COPY src/sim`).
  - In `legKitLoad`, when the first owed leg in `legMintChain` is in `giftLegs(w, line)`: of the `logs` the train loads, take `g = min(logs, owed[first].logs, Rail.rack)` off `Rail.rack` (only for that gift leg's share) and mint only `logs - g`. So `Rail.rack -= g`, `Rail.giftOut += g`, `Train.gift += g`, and `depotProduced += logs - g`. `Leg.loadedLogs` counts all `logs`, as today.
  - Everything that takes logs off a train keeps `gift <= logs`. `move` (unload onto the rack or a yard) takes minted logs first: after it, `gift = min(gift, logs)`.
  - `kitHome` gets the train's gift share. In `legKitHome`, the surplus's first `min(out.logs, gift)` logs go back onto `Rail.rack` (`giftOut -=`, `gift -=`) and only the rest are unmade (`depotProduced -=`). `Leg.loadedLogs` comes down by the whole surplus, as today.
  - A leg's leftovers on completion (`legYardHome`: its rack, and a yard leg's yard) first return `min(leftover logs, giftOut - Σ Train.gift)` to Home's rack (`giftOut -=`): the gift that went onto a rack or yard as kit. Only the rest is unmade. So a gifted log is never unmade, and `giftOut >= Σ Train.gift` holds.
  - Witnesses: the depot output becomes `Σ DEPOT_OUT + Σ Leg.loadedLogs === depotProduced + giftOut`, and both depot stock bounds (`railway-check-line2.ts` and `railway-check-steel.ts`) add `giftOut`. `railCounts` and `line2Logs` need no new term: the rack, the logs aboard and the fed and laid logs already count these logs, and they were chopped. `checkRoute` adds `0 <= gift <= logs`, `gift > 0` only with `legKit`, and `giftOut >= Σ Train.gift`.
  - Tests (`test/railway-gift.test.ts`): from seed `ring-joined` (before `gorge-open` racks the first kit), put 8 logs on Home's rack (`haltPut` yard 0) before the first kit train loads. Expect: the next line 2 train loads `gift === 8` and mints 8 fewer; the rack is 8 lower; `railwayCheck` passes at every tick through the stack's last lay. A gift-only surplus goes back onto the rack, not unmade. A branch-line case from `wall-mid`. With no gift on the rack, a serialize and load round trip matches the v75 behaviour tick for tick (existing route tests unchanged). Re-pin the seed goldens (`test/railway-golden-*.test.ts`) once, naming the schema change as the reason ([lockstep](../agents/lockstep.md): "never re-pin replay fixtures without identifying the changed inputs").
  - The v76 columns also change the schema fixture, host checkpoint trace, scripted op hashes, tick-order hashes and M12 client trace hashes. Compare op labels and results, every tick’s system sequence, and client frame and mark counts before accepting the refreshed fixtures.
  - Proof: the unit tests; `node dev/ship-check.ts`.

- [x] **2. Thanks and the board's reads (sim; both variants).**
  Files: `src/sim/railway-components.ts` (`Account.thanks`), `src/sim/railway-queries-gift.ts` (`giftRides`, `giftQueued`, `giftAboard`, `thanksStep`, `worksThanks`), `src/sim/railway-sys-yard.ts` (`haltPut`), `src/sim/railway-sys-route.ts` (`legStock`), `src/sim/railway-check-route.ts`, `test/railway-gift.test.ts`.
  - `thank(w, aid)` sets `Account.thanks = thanksStep(w) + 1`. Called from `haltPut` when `e.yard === VILLAGE_YARD && kind === 0 && giftRides(w)` (Home's logs while they will ride), and from `legStock` on every accepted feed.
  - No new reset write: a lay raises `thanksStep`, so earlier marks stop matching. `checkRoute` adds `thanks <= thanksStep + 1`.
  - Tests: two accounts. A gives at Home and B feeds the frame, so `worksThanks` lists both in first-sight order whatever the amounts. After the section lays, the list is empty. A gift while nothing rides (seed `leaf-raised`, before the rivet opens the stack) thanks nobody and changes nothing else.
  - Proof: unit tests.

- [ ] **3a. Variant (a): pour on arrival (sim). The owner picked (a) on 27 November.**
  Files: `src/sim/railway-queries-gift.ts` (`giftPourRoom`), `src/sim/railway-sys-route-kit.ts` (`legKitLoad`, `legKitFits`, `legKitArrive`), `src/sim/railway-sys-route.ts` (extract `legFill`), `src/sim/railway-sys-trains.ts` (pass `tick` to `legKitArrive`), `test/railway-gift.test.ts`.
  - `giftPourRoom(w, k)`: the current section's `logs - Leg.logs`, while it is not laying (`start < 0`), less `giftAboard` on its line. Zero for a leg outside `giftLegs`.
  - Top-up load: after `legKitLoad`'s steel-first and carrier guards, and before its "nothing owed" return, a train at its kit halt may load more of Home's rack as gift: up to the pour room of the first leg in `giftLegs(w, line)`, the train's `legKitCap` room and `Rail.rack`. It sets `legKit` and counts in `loadedLogs` like any load, and stays within the `kitTrains` carrier limit. `giftRides` adds "some gift leg has pour room".
  - `legKitFits` is also true when `gift > 0` and the leg has pour room, so the train stops at the rack halt.
  - On arrival at the leg's drop halt, before the rack unload: `n = min(gift, sec.logs - Leg.logs)` goes into `Leg.logs` through `legFill(w, k, n, 0, tick)`. That is `legStock`'s fill, moved into a shared helper: it starts laying when both bills are full and the barrier is open or absent. Then `logs -= n`, `gift -= n` and `trimLegHeld(w)`. A pour keeps `giftOut` and `loadedLogs` unchanged: the logs stay at the works, so the output witness still balances. The rack unload follows, and under 3a takes minted logs only (`move` is given `logs - gift`), so a gift goes to the bill or comes home, never to the rack. Gift that does not fit rides on, and comes home to Home's rack at the kit halt (step 1).
  - Tests: from `gorge-open` with the stack's kit already minted onto the rack, give 8 at Home. The next line 2 train loads them, and on arrival `Leg.logs` goes up by 8 with no account near the works. Two trains carrying gifts never pour past the bill. A pour that fills the bill starts laying only with the barrier open (an incline-style gate case from `wall-deep` or `notch-open`). A train's minted surplus still goes home unmade.
  - Proof: unit tests. At the checkpoint, `npm run loop -- run` still reaches the ending (no bot gives, so its times are unchanged).

- [ ] **3b. Variant (b): unload to the works' rack (sim test only). Not built: the owner picked (a) on 27 November.**
  Files: `test/railway-gift.test.ts`.
  - Step 1 already is variant (b): gifts load instead of minted logs while a leg's kit is owed, unload onto the rack as kit, and its leftovers come home. `giftRides` stays step 1's (kit owed).
  - Tests: give 8 at Home as a leg opens. They load instead of minted logs and reach the rack, and `Leg.logs` does not move until a back feeds it. At completion, the gift left on the rack returns to Home.
  - Proof: unit tests.

- [ ] **4. The views (view).**
  Files: `src/entities/railway/halt-yard-recovery.ts` or `halt-yard-view.ts` (whichever draws the Village bins' prompt), `src/entities/railway/halt-yard-flights.ts`, `src/entities/railway/train-view.ts` / `kit-board.ts` (the kit car's deck), `src/entities/route-greybox/leg-view.ts` (3a's pour), the owning game-design section (the halt yards' and the route's).
  - Shared (both variants): while `giftRides`, Home's log bin offers `[placeholder: Give to works]` in place of Leave it here (same op), and wears a pennant. Use Lane A1's pennant mesh if it is on main, otherwise a plain greybox flag. When a line 2 train standing at the Village gains `gift`, the bin's logs fly to the kit car's deck (the existing bin flight, from rack to deck), and the deck shows a strapped bundle while `gift > 0`.
  - 3a only: on arrival, the bundle's logs fly from the deck into the frame (the existing deposit flight, deck to frame), and the bill sign ticks.
  - Proof: **one look** for the pass, one sequence from `--rail-seed gorge-open`. Still 1: at Home, give 8 logs; the bin shows the prompt and pennant. Still 2 or `--video`: the line 2 train loads the bundle. Still 3 (3a): camera at Ring Island's west platform, the stack's frame bill goes up by 8 while the player stands at Home. With 3b: the rack's plate shows the kit, and the bill is unchanged. Phone-width check of the prompt.

- [ ] **5. Reads for Lane A's board (dev and docs; no Lane A view).**
  Files: this plan's [Reads for Lane A's board](#reads-for-lane-as-board) section, the railway adapter's read surface if A2's builder needs a helper (`src/adapters/railway-*.ts`, read-only).
  - The board's builder (Lane A2) reads `worksThanks`, `giftQueued` and `giftAboard` from the accepted mirror and maps pids to names with the roster mirror. Lane B adds no board view.
  - Proof: none beyond step 2's tests; A2's look shows them.

## Reads for Lane A's board

Pure, over accepted railway state (`src/sim/railway-queries-gift.ts`), for the [A2 station board](course-change.md#lane-a-know-where-the-work-is) and Pause:

| Read | Gives | Board use |
| --- | --- | --- |
| `worksThanks(w)` | pids, first-sight order, of everyone who gave at Home or fed a leg frame since the last lay | `[placeholder: Thanks]` names via the roster (`Roster.names[indexOf(pid)]`), unranked, no counts |
| `giftQueued(w)` | logs on Home's rack that will ride | part of `[placeholder: On the way]` |
| `giftAboard(w, line?)` | gifted logs aboard trains, one line or all | the other part; per line lets A2 show it beside the leg its line serves |
| `giftRides(w)` | whether Home's logs ride now | A2 may show the On-the-way pip only when true |

None of these depends on A0. If A0's works query is on main when A2 is built, A2 picks the line it names.

## Checkpoint

The pass is done when steps 1, 2, the picked 3 and 4 are on main and:

1. `npm run check:full` passes (step 1 changes the schema; `test/railway-replicate.test.ts` and the goldens cover it).
2. `npm run loop -- run` reaches the ending with the same node times as before (no bot gives).
3. Step 4's one look, read and reported.
4. One review of the sim branch (the `review-stamp` files), with its findings fixed or answered.

Course-change item 5's measure needs nothing more: a gift at Home is `rail.haltPut`, already marked `'yard left'`, a first contribution.

## Level findings

Nothing is placed or moved in the world: the gift rack is the Village yard that already stands at `(905, 1)` m (`HALT_YARDS[0]`), and the pennant is a view prop on it. `npm run level-check` has nothing to check. The brief's watch item stands for Lane A2: Home's board should be in sight of the Village rack, 13.2 m from spawn and 24 m from Line 1's platform. Check it from the player's eye once A2 pins the board; this plan does not place the board.

## Risks

- **Room safety.** No effect in `apply`: flights follow accepted receipts and replicated `Train.gift` and `Leg.logs` changes. Transfers are atomic inside one tick's apply. No new randomness, clock or per-peer counter. The one new shared file, `src/sim/railway-queries-gift.ts`, is inside `src/sim`, which the server image copies whole (`server/Dockerfile`, `dev/server-build.ts`, deploy-server.yml's `src/sim/**`), so no listing changes.
- **Mixed builds.** One clean break, v75 to v76, with no compatibility code. The bump ships any time nobody is on the production server ([entry](../decisions-process.md#d-2026-11-27-world-wipes-any-time-nobody-plays)): `npm run ship-queue` holds it with exit 9 while anyone is on, and it is run again in 30 to 60 minutes (`dev/world-bump-gate.ts`).
- **Conservation.** The minted-log witness gains `giftOut`. A gifted log is never unmade: step 1 returns it from a train's surplus and from a completed leg's rack or yard. The audit build (`createRailwayWorld({ audit: true })`) and `railwayCheck` at every tick of step 1's tests are the guard.
- **Hotspots.** `railway-sys-route-kit.ts` and `railway-sys-trains.ts` (a one-argument change). Gift logic lives in the new queries file and in small hooks.
- **The branch-line precedent (call 5).** On branch lines the logs leave Home's rack with no train standing there, as their rails leave the forge rack. A guest sees the rack's stack shrink and the board's On-the-way count, but no train. Line 2 (the stack) shows the loading.
- **Two open legs.** With the Canopy leg and the cave both open, gifts load onto whichever gift line's train stands first. Thanks resets on any lay.
- **Recovery rack drain.** While a gift leg is open, kit trains take any logs left on Home's rack, including logs the supply pulse recovered from abandoned piles. No rule reads Home's rack (only players take from it, with `rail.rackTake`), so nothing is starved.
- **Performance.** Two small per-train reads at the kit halt; no meshes or lights beyond one pennant and a bundle. `npm run perf` is not needed.

## Pass 2 (not in the first build)

Each is a later backlog step for Lane B, in this order, and none is needed for checkpoint item 2:

1. **Conversions** (the brief's question 4): rails gifts, 2 logs → 1 rail at Home's forge, so a starter axe helps when a frame is short only of rails. Needs a gifted-rails mark like `Train.gift`.
2. **Yard legs**: the incline and causeway, through a gift mark on `LegYard`.
3. **Pre-leg works**: Q6, Q7 and the steel works (train-fed from the Village), then the kiln and footings (4 → 1).
4. **Gift racks at other halts**, and Thanks for every bill's feed (with A4's one grammar).

## Open questions

1. **Step 3: pour or rack?** (above). Answered 27 November: (a), pour ([entry](../decisions-rewards.md#d-2026-11-27-gifted-logs-pour-into-the-bill)).
2. **Batch world bumps weekly?** Answered 27 November: no batch. A bump ships any time nobody is playing ([entry](../decisions-process.md#d-2026-11-27-world-wipes-any-time-nobody-plays)), so the sim branch waits only while someone is on the server.

## Placeholder copy

None of The Boogler's copy is touched. Placeholders for the owner: `[placeholder: Give to works]` (Home's log bin while gifts ride), and for A2's board, the brief's `[placeholder: On the way]` and `[placeholder: Thanks]`. Suspect lines: none found in the files this plan touches.

## Design review (2026-11-27)

Run by the planner per [design-review](../../.claude/skills/design-review/SKILL.md), on this plan as written, after rereading it. Read: DESIGN.md (core loop, 6, 7, 8, 11), owner-calls index, the routing table, [course change](../decisions-core-loop.md#d-2026-11-27-course-change), [Thanks](../decisions-core-loop.md#d-2026-11-02-thanks), [the shared pool's answers](../decisions-rewards.md#d-2026-11-25-recommendations-taken-pool), [the flow decision](../decisions-process.md#d-2026-11-27-flow-one-pass-then-refine), the brief and its review, the research above, `npm run loop` (every node) and `-- node stack-1`, and the sim files cited. No stills were taken, because this pass is docs only and nothing is placed. Nothing is ported from Place.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Logs given at Home reach the works without the giver going there; the board thanks the giver by name | Decided | Owner, 27 November ([course change](../decisions-core-loop.md#d-2026-11-27-course-change) rule 3; checkpoint item 2) |
| 2 | Thanks are names only, in first-sight order, with no counts or ranking | Decided | Owner, 2 November ([Thanks](../decisions-core-loop.md#d-2026-11-02-thanks)) |
| 3 | Home's gift rack is the Village yard that already exists, with its op; no second rack | Default | Brief, question 1, as recommended |
| 4 | Existing kit trains carry gifts; no cargo train | Default | Brief, question 2, as recommended |
| 5 | A branch line's kit train takes Home's rack logs at its own kit halt (as its rails come off Home's forge rack), so the bundle is seen leaving only on line 2 | New | Recommended: without it, gifts reach only the stack, 4 of the 22 leg beats; with it, 17 (all but the incline, the causeway and the stocked first sections of the bay cut and the cave). Seen leaving everywhere would need gifts relayed by line 2 to every junction (Pass 2's yard work, and more) |
| 6 | Gifted logs replace minted logs while a leg's kit is owed | Default | The train carries no more than one bill; a gift and a minted log are the same log at the frame |
| 7 | (a) Gifted logs pour into the frame's bill on arrival, up to what it lacks; minted kit stays hand-fed | Decided | Owner, 27 November ([entry](../decisions-rewards.md#d-2026-11-27-gifted-logs-pour-into-the-bill)). Narrows the [25 November rule](../decisions-rewards.md#d-2026-11-25-recommendations-taken-pool) for these logs only |
| 8 | First build: logs only, home-kit legs only; rails, stone, conversions, yard legs, pre-leg works and other halts are Pass 2 | New | Recommended: the smallest build that meets checkpoint item 2. A room before the stack, at the incline, at the causeway or at the bay cut's or the cave's first section sees Leave it here behave as today |
| 9 | Thanks reset on any section's lay; the giver at Home and the feeder at the frame are listed together | Default | Brief, question 5 (per works step); `Σ Leg.laid` is the step |
| 10 | Thanks only when the gift will ride (`giftRides`); a gift that would sit is not thanked | Default | The board says what is true (DESIGN 11) |
| 11 | Any logs on Home's rack ride, including those recovered from abandoned piles | Default | Simplest; no rule reads Home's rack, only players taking from it |
| 12 | Gift that does not fit rides on and comes back to Home's rack, never unmade | Default | A player's logs never vanish |
| 13 | Home's log bin reads `[placeholder: Give to works]` and wears the works' pennant while gifts ride | Default | Brief, call 11; his words to set |

**Counts:** 2 Decided, 8 Default, 3 New (one of them, call 7, waits on the owner).

### Findings

1. **The brief's carrier would carry little.** A leg's whole kit is minted over its first trips (`kitLead` is "all remaining"), so a gift that only replaces minted kit rides only at a leg's start and adds nothing at the frame. This changed the plan: step 3a adds a top-up load and the pour, and the variant table says plainly that (b) does not advance the room.
2. **The brief's "Home and existing stops" would reach 4 of 22 leg beats.** Only the stack's kit loads at the Village. This changed the plan: call 5 (branch kit halts take Home's rack logs) and its risk line.
3. **No new op is needed.** `rail.haltPut` at yard 0 is already the gift, already predicted and already a first contribution. This changed the plan: no command, prompt-only view work.
4. **Three near-universal rules.** (1) The next goal can be found: Lane A's board and signal; the pennant ties Home's bin to it. (2) Gates keep their meaning: a pour fills a frame but starts laying only once the barrier is open (step 3a's `legFill`). (3) Nobody is stranded: a gift never takes a key item, and logs that do not fit come back.
5. **Solo, co-op and late join.** Solo, a player passing Home drops spare logs and rides ahead, and the frame is further on when they arrive (3a). Together, a guest at Home and the host at the frontier fill the same bill and share the Thanks list. A late joiner reads replicated rows only.
6. **Copy.** One placeholder string; no Boogler line touched.

Owner question: [step 3, pour or rack](#the-owners-question), answered 27 November: (a).
