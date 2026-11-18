# Plan: separate capacities, no heavy load, 1 a hit to start, squares on the back

> **Status: steps 1–4 built on `claude/separate-capacities` (18 November 2026, world v60), not shipped; see "As
> built" under each step.** Owner calls:
> [separate wood and stone capacities](../decisions-core-loop.md#d-2026-11-17-separate-capacities) and
> [the three answers](../decisions-core-loop.md#d-2026-11-17-separate-capacities-answers) (2 a hit once Station 3 is
> funded, "maybe reduce logs from 40"; pack and breaker; rails 8, "own upgrade later"). The planner read the code at
> `f654c473` (world v59) and ran `npm run loop`, `npm run loop -- node <id>` for T1, T2, beam, T3, forge, axe, pack,
> Q1–Q5, lever, breaker, slab, throat, kiln, cradle and steelworks, `node dev/loop/heavy-load.ts`, and scratch
> before/after scripts over `dev/loop/graph.ts` (`grindOf`), whose numbers are below. No browser run; not tested on a
> device.

**Goal.** Carrying stops punishing fast tapping: each resource has its own back capacity (logs, stone and rails start
at 8; logs and stone each get their own step on the first line), a full kind just refuses more of that kind, a hit
yields 1 until Station 3 is funded and 2 after, and the carried amount reads as little squares again. Serves DESIGN.md
**11. Show, don't tell** (the squares are what you hold, physically; "what's on screen is true"), **10. Slapstick over
precision** (mashing the button can no longer put you in a state you have to dig out of) and **6. Communal world,
personal things** (every capacity and yield step is the room's, as the pack is today). It bends no principle. It
overrides the 16 November two-stage entry's "chop yield and every bill stay"
([entry](../decisions-core-loop.md#d-2026-11-16-first-line-choice-two-stages)) and the 5 November "Station 3 still costs
40 logs and one beam" ([place.md](../game-design/place.md)), both on the owner's 17 November words.

**Research.** [carrying-and-logistics-play](../research/carrying-and-logistics-play.md) recommendation 7 ("weight as
slowness ... keep speed penalties tiny or zero") is what this plan returns to; recommendation 6 ("read the load at a
glance") is the squares. [incremental-game-maths](../research/incremental-game-maths.md): "make each tool or carry rung
remove a real burden", and its axe problem ("halving harvesting saves 0.72 s, only 2.6%") is why Station 3's relief comes
from its bill (trips), not only the yield (presses). [carried-resource-display](../research/carried-resource-display.md):
worn cargo plus a small tag when quantities change, exact contents in Pause; this plan keeps the tag's triggers and
departs from its "show the number" on the tag (the owner's squares call). [harvest-feel](../research/harvest-feel.md):
progress stays on the object (the notch tracks pieces taken, step 1). [upgrade-economy](../research/upgrade-economy.md):
"make each upgrade repay a visible inconvenience" is the test applied to each capacity step, and the reason the rails
step is left to its own design (rails at 8 is the inconvenience it will repay).

## 1. Design

### The rules (Server state, the railway)

All of it is existing **Server** state: the railway world on the room server (`src/world/railway-server.ts`), checkpointed
under the existing `railway` state key, replicated as today, with declared prediction through the same rules
(`src/world/railway-predict.ts`). **No new component field, op, state key or schema change**: every new fact derives from
saved rows the room already has, so `test/fixtures/rail-schema.json` does not change. The server owns rule ticks and
saves as today; no client lead, classic edit generator or client state registration is introduced.

| Fact | Rule | Derived from | Who has it |
| --- | --- | --- | --- |
| Logs capacity | 8; **16** once the pack chest is open | `Rail.pack` (existing `rail.pack`, unchanged: offered once the forge holds its first 24 logs) | everyone, late joiners too |
| Stone capacity | 8; **16** once the breaker is taken | `Works.breaker === 2` (existing `rail.breaker`) | everyone |
| Rails capacity | **8**, no first-line step; its own upgrade is designed later ([backlog](../backlog.md)) | constant | everyone |
| Yield per hit (chop and break) | **1**; **2** once Station 3 is funded ("the keener edge") | `Job[2].start >= 0 \|\| Job[2].completion` (funding needs the 32 logs and the beam) | everyone |
| Station 3's bill | **32 logs** (was 40) and the great beam | `LINE1_STATIONS[2].bill` | — |
| Proper axe | trees and hardwoods **5** a hit, as today (rocks stay at the edge's 2) | `Rail.axe` (unchanged) | everyone |
| A full kind | refuses that kind only; other kinds still fit | per-kind balance vs capacity | per back |
| Big things (beam, boiler, footing) | still need a back empty of every kind; shouldering still sets a back-load down beside you | `heldBig`, `carried(a) === 0` (unchanged) | per back |
| Movement | no slowdown, no jump/hook/glide lock from cargo | heavy load removed | — |
| Drop and piles | kept: a tap drops one piece (rails, stone, logs order), a hold drops all; piles of 8, at most 128 piles; a new pile at the 128 ceiling is refused without spending | `LOOSE_PILE_CAPACITY`, `LOOSE_PILE_MAX` (unchanged) | piles shared, backs personal |

**Why these grants.** The owner took the pack and breaker as recommended: the pack is already the log bundle's frame,
shared, optional and carded, and now lifts logs only; the breaker is the Works' stone tool, taken right before the
throat and the kiln, whose 16 stone it keeps at one trip. The yield doubles at Station 3's funding (his "3"), so
Stations 1 to 3 are the 1-a-hit stretch and the forge's 56 logs are the first bill chopped at 2. Rails start at 8 (his
"8, own upgrade later"); this plan does not design that upgrade.

**What of the heavy-load and drop-slot machinery stays.** Nobody can be over capacity, so the one-slot-per-excess-piece
reservation (`reservedDropSlots`, `spareDropSlots`, the `released` term in `rail.drop`, the "frees one slot when this take
consumes the pile" term in `free`) has nothing to protect and goes. Drop stays as a plain action: it is the owner's
control (10 November, "Drop one thing off your back (hold: all of it)"), it is how a back empties before shouldering the
boiler, beam or a footing (`src/entities/railway/back-down-plan.ts`), how friends hand cargo over, and it was a best
moment in the 3 November co-op session ("Drop, and picking up a whole stack"). The 128-pile ceiling stays as the bounded
storage it always was; at the ceiling a new pile is refused (exact-position top-ups still land), and nothing is stranded
because a full back no longer locks movement.

### Station 3's bill

Station 3 at 1 a hit, one player, from the loop graph's nearest sources holding the bill (44–45 m a trip). Walk is the
loaded carries plus empty returns between them at 5.6 m/s; presses at the server's 240 ms swing floor and a realistic
0.35 s; 0.09 s a piece to unload. The beam (one 35 m drag, 12 strokes) is the same in every row.

| Station 3 logs | Yield | Trips | Loaded m | Walk s | Presses | Swing s (0.24 / 0.35) | Total s (at 0.35) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 40 (today) | 2 | 5 | 225 | 72.2 | 20 | 4.8 / 7.0 | 82.8 |
| 40 | 1 | 5 | 225 | 72.2 | 40 | 9.6 / 14.0 | 89.8 |
| **32 (recommended)** | 1 | **4** | 180 | 56.2 | 32 | 7.7 / 11.2 | **70.2** |
| 28 | 1 | 4 | 177 | 55.2 | 28 | 6.7 / 9.8 | 67.5 |
| 24 | 1 | 3 | 132 | 39.4 | 24 | 5.8 / 8.4 | 50.0 |

**Recommended: 32 logs.** One trip fewer than today, and about 13 s quicker than today's Station 3 even at 1 a hit, so
Grant's friction there (G6: beam 7:12, funded 8:45, "five trips of 8 logs"; the model's 83 s matches his 93 s) eases
rather than grows. 28 buys nothing over 32 (still four trips). 24 cuts deeper but equals Station 1's bill, makes the
longest stretch (the whole trestle and the run home) the smallest log bill, and undoes the climb 24 → 32 + 8 stone → 32
+ the beam; the beam's drag keeps Station 3 the biggest job. Logged as an agent call (the owner's "maybe reduce logs from
40" leaves the amount to the plan).

**What else the bill touches.** The bill lives in `LINE1_STATIONS[2].bill` (`src/sim/railway-line-layout.ts`); the loop
graph, the station sign, the feed and laying schedule (`lineFeed`: 8 fewer log flights, the feed about 0.6 s shorter;
`run.used` stays `floor(fraction × bill)` over its six panels) and the funding rule read it. Hard-coded 40s to replace
with the spec's value: the beam-allocation invariant (`src/sim/railway-check-line1.ts:107`, `t3.stock === 40`), the
route seed (`src/sim/railway-seed-route.ts:79`), the production bot (`dev/look/bots/railway.ts:1420`, `:1541`) and the
tests (`railway-line-authority` six calls, `railway-line.test.ts`'s T3 row, `railway-line2:117`, `railway-ops:69`,
`railway-replicate:366`, `town-facts:56`). The great beam is unchanged: either order with the logs (7 November), and
Station 3 funds only with both in. The pull-out ("A way across!") and the jump after Station 3 come from completion, not
the bill. Docs: place.md's run ("Station 3, at the rim: 40 logs"), the 5 November note (line 675) and the bot timing
table ("station 3: 136 s"; re-measured at checkpoint A, not hand-edited); round-4-notes' G6 line.

### Measured, the whole route

Before (today) and after (this plan with Station 3 at 32). A carry is one trip of one material; "presses" counts hits for
hand-supplied logs and stone; the canonical order takes the pack and axe right after the forge.

| Beat | Bill after | Carries today / plan | Loaded m today / plan | Presses today / plan |
| --- | --- | ---: | ---: | ---: |
| T1 | 24 logs | 3 / 3 | 38 / 38 | 12 / 24 |
| T2 | 32 logs + 8 stone | 5 / 5 | 110 / 110 | 20 / 40 |
| T3 | 32 logs + beam | 5 / 4 (+1 beam) | 225 / 180 | 20 / 32 |
| forge | 56 logs | 7 / 7 | 245 / 245 | 28 / 28 |
| Q1 | 16 logs + 6 rails | 2 / 2 | 53 / 53 | 4 / 4 |
| Q2 | 24 logs + 12 rails | 3 / 4 | 66 / 112 | 0 |
| Q3 | 16 logs + 12 rails | 2 / 3 | 117 / 231 | 0 |
| Q4, Q5, Q6, Q7 | logs + rails (cart, train) | 2, 4, 4, 4 / 3, 5, 6, 5 | +3, +10, +7, +3 m | 0 |
| steel works | 8 logs + 12 rails (train) | 2 / 3 | +7 m | 0 |
| kiln, cradle | 16 + 16 stone; 8 rails | unchanged (the breaker; 8 is one carry) | unchanged | 12 / 12 |
| **Total, built route** | | **80 / 87** | **1,916 / 2,061** | **96 / 140** |

**What rails at 8 cost** (the owner accepted "line 2 is heavier until it exists"): 8 more rail carries and 190 more loaded
metres, about 380 m walked with the returns, roughly **68 s for one player** over line 2. Q3's 114 m rail haul from the
forge doubles (about 41 s of it); Q2's 46 m haul doubles (about 16 s); the rest are short rack and train carries. The
rails upgrade's design should be measured against wherever the forge's rail rack ends up (the P3 backlog row "The
forge's rail rack off Home's island" moves exactly the Q2–Q3 rail sources). The squares' rails row is 8 long.

**What the extra presses cost.** 44 more presses, all on Stations 1 to 3: about 11 s at the swing floor, about 15 s at a
realistic 0.35 s, over an opening Grant played in about 9 minutes (Station 3 funded at 8:45). Station 3's smaller bill
pays most of it back (−45 loaded metres, about 16 s). Trees still hold 10 logs, so trees felled and walks between them
are unchanged; a tree takes 10 hits instead of 5 until the edge. The model counts one material per trip, so it
understates the plan: a Station 2 trip can now bring 8 logs and 8 stone together (5 trips can become 4), a Q1 trip 16
logs and 6 rails. Today's optional heavy load is no loss on the measured geometry
([heavy-load.ts](../../dev/loop/heavy-load.ts): comfort was already faster on every early log bill; heavy saved about
1.4 s at Q2 and Q5 only).

### Presentation (Local, over the replicated rows)

**The carried squares** (`src/features/haul-stack.ts`, `.css`; Local DOM, no new draw calls). Designed so Grant's G14
("11 out of 12", "I only have 10", counting "four, eight, 12, 16") cannot recur:

- **One row per kind, squares only.** Logs, then stone, then rails, each a single row of squares as long as that
  kind's capacity: logs 8 or 16, stone 8 or 16, **rails 8**. No numbers, no fraction, no total, no icons on the tag.
  Filled squares count from the left in the kind's colour (logs `#c98a4b`, stone `#a49bad`, rails `#579fbc`, the
  4 November slot palette); empty squares are the same colour at about 30% so an empty row still says which kind it is.
  16 px squares, 2 px gaps, 4 px extra after every fourth: a row of 16 is about 300 px and fits the 320 px tag and the
  358 px phone lane.
- **Which rows show.** A row shows while you carry any of that kind, and for the 2 s hold after it is refused (full) or
  its capacity grows (the pack, the breaker), even if empty. Kinds you have never touched never show, so the tag is one
  row through Station 1.
- **Full.** A full row's squares take the cream outline (`#fff3e0`); a refused pickup of that kind shakes that row
  (transform only, 180 ms; reduced motion: an outline flash). No "Full" word, no warning text.
- **Pickup.** Each newly filled square pops (scale overshoot, about 200 ms, transform only) as its piece lands; logs in
  flight do not fill until they land (the existing `flyingLogs` rule). Reduced motion: no pop.
- **Big things.** Beam, boiler and footing show their name only ("Great beam", "Boiler", "Footing"), no squares, no icon.
- **Pause.** The Pause "Carrying" section shows the same rows, static. The tag's `aria-label` keeps the exact text for
  screen readers ("5 of 8 logs, 3 of 8 stone").
- **Unchanged:** the 2 s hold and 200 ms fade, the placement beside the load and the phone dock. Piles, bills, racks and
  boards keep their counts ([counts everywhere](../agents/owner-calls.md#counts-everywhere), partly superseded).

**The upgrades' moments.** The pack and breaker keep their existing cards; the tag shows the grown row's new empty
squares. The keener edge gets the multi-axe flourish when Station 3 funds (`src/entities/railway/ability-arrival.ts`: the
small axe model over Buddy, for every player, the funder included, no card and no new words); the machine starting the
trestle is the moment it rides on. **Refusal prompts** become per kind: "Logs full", "Stone full", "Rails full" (draft
UI copy, not The Boogler's), replacing "Your back is full" where a single kind is meant; "Hands full" stays for big
things.

**Controls:** none new. Drop keeps `place-drop` (R3, right click, touch Drop; hold for all), its guide row and its
order (rails, then stone, then logs). No pad slot is needed (`freeSlots()` not consulted).

## 2. Steps

Steps 1–4 ship as **one batch** (one `WORLD_NS` bump, one sim/net review, no live build with the rules but not the
squares). Each step leaves `node dev/ship-check.ts` green; the heavier proofs are the checkpoint's.

- [x] **1. The rules.** Files: `src/sim/railway-layout.ts`, `railway-line-layout.ts`, `railway-queries.ts`,
  `railway-queries-line1.ts`, `railway-sys-line1.ts`, `railway-sys-line2.ts`, `railway-sys-steel.ts`, `railway-check.ts`,
  `railway-check-line1.ts`, `railway-seed-route.ts`, `railway-seed-legs.ts`, `src/place/layout.ts`,
  `src/world/railway-server.ts`, `src/world/namespace.ts`, `src/adapters/railway-intents.ts`,
  `src/adapters/railway-effects.ts`, and the client callers of the removed exports.
  - `railway-layout.ts`: delete `HEAVY_LOAD`; add `RAILWAY_CAPACITY = { logs: 8, logsPack: 16, stone: 8, stoneBreaker: 16, rails: 8 } as const`
    and `RAILWAY_YIELD = { first: 1, edge: 2, axe: 5 } as const`; drop `RAILWAY_T1.carry` and `strokeYield` (their one
    meaning moves here). `LINE2_PACK.carry` (16) stays as `logsPack`'s source.
  - `railway-line-layout.ts`: T3's `bill: [32, 0]`.
  - `railway-queries.ts`: delete `carryComfort`, `carryMax`, `railCarryMax`, `heavyLoad`, `carrySpeed`,
    `reservedDropSlots`, `spareDropSlots`, `free`. Add `LOGS = 0`, `STONE = 1` (with `RAILS` from line2-layout and
    `FOOT = 3`), `balanceOf(a, kind)` (moved from sys-line1), `capacityOf(w, kind)` (table above; FOOT 1),
    `MAX_KIND_CAPACITY = 16`, `keenEdge(w)` (Station 3's job: `start >= 0 || completion`), `hitYield(w)`
    (`keenEdge ? 2 : 1`), `roomOf(w, a, kind)` (`heldBig` → 0; FOOT → `carried(a) === 0 ? 1 : 0`; else
    `max(0, capacityOf − balanceOf)`), `freePileSlots(w)` (`LOOSE_PILE_CAPACITY − piles`). `roomFor(w, a, kind)` becomes
    `roomOf` (drop the `pilePieces` argument). `carried(a)` stays (footings, beam holder).
  - `railway-queries-line1.ts`: `freeCarryIgnoringBig(w, pid)` becomes `roomIgnoringBig(w, pid, kind)`.
  - `railway-sys-line1.ts`: `chop` uses `roomOf(w, a, LOGS)` and `n = min(rail.axe ? 5 : hitYield(w), t.left, room)`;
    hardwood unchanged at 5. Tree notch: `t.work = rail.axe ? min(15, t.work + 5) : min(15, floor(3 × (10 − t.left) / 2))`
    so a 10-log tree reaches 15 on its felling hit at any yield. `mine` uses `roomOf(w, a, STONE)` and
    `n = min(hitYield(w), rock.left, room)`; `rock.work = min(4, (RAIL_ROCKS[slot].initial − rock.left + 1) >> 1)`
    (keeps `railway-check-line1`'s `taken ∈ [work, 2·work]`). `take` and `rackTake` use `roomOf` for their kind.
    `drop`: remove `released`; a new pile needs `freePileSlots(w) >= 1`.
  - `railway-sys-line2.ts` (`forgeTake` RAILS, `depotTake` LOGS, `depotRailTake` RAILS) and `railway-sys-steel.ts`
    (`steelTake` by `e.kind`) use `roomOf`. `forgeTake`'s cradle clamp (`WORKS.cradleRails − cradleRails − a.rails`)
    still applies; with rails at 8 one carry fits the cradle exactly. Footing takes (`railway-sys-works.ts`, `-ring.ts`)
    already pass `FOOT`.
  - `railway-check.ts`: each balance `railInt(a.carry, capacityOf(w, LOGS))`, stone, rails likewise; drop the shared-sum
    check; piles check `w.ids(Pile).length <= LOOSE_PILE_CAPACITY`. A save holding more than a kind's capacity fails to
    load (fresh world under the bump). `railway-check-line1.ts:107`: `t3.stock === LINE1_STATIONS[2].bill[0]`.
  - Seeds: `railway-seed-route.ts` `chop()` loops on `a.carry < capacityOf(s.w, LOGS)`, `logs(s, 'a', 'T3', …)` takes
    the spec's bill, and `rails()` carries 8 at a time; `railway-seed-legs.ts` loops on `roomOf(...) > 0` for the op's
    kind. `src/place/layout.ts` `TUNE`: `strokes: 10`, `logsPerStroke: 1` so `test/railway.test.ts`'s pins hold
    (`sourceYield = strokes × logsPerStroke`).
  - Bounds: `railway-server.ts` deposit/drop `railInt(e.n, MAX_KIND_CAPACITY, 1)`; `railway-intents.ts` `CARRY_MAX` →
    `MAX_KIND_CAPACITY` for `n`. **`railway-effects.ts` `accepted()`**: bound the accepted count by
    `3 × MAX_KIND_CAPACITY` (48), not the per-kind 16: `rail.kiln` returns logs + stone (now up to 32) and `rail.steel`
    logs + rails, and the old 24 bound would silently drop a kiln effect. `effectOf().carried` stays per kind (16).
  - Client callers of removed exports (deletions only): `src/entities/railway/glide.ts` (heavy in `shouldered`, the
    glide refusal), `hook-shot.ts` (three gates, the refusal), `tools.ts:358`, `view.ts:447` (the jump refusal),
    `sources.ts` (`carrySpeed` in `prePhysics`). The three "Too heavy to …" notices go.
  - `namespace.ts`: `WORLD_NS = 'v60'`, history line "v60 (date): separate capacities: logs 8 (16 with the pack), stone 8
    (16 with the breaker), rails 8; no heavy load or drop reservations; a hit yields 1 until Station 3 is funded, then 2
    (the proper axe 5); Station 3 takes 32 logs; no migration."
  - Tests: delete `test/railway-heavy-load.test.ts`, `review-heavy-load.test.ts`, `review-heavy-load-arrival.test.ts`,
    `review-heavy-load-fix2.test.ts`, `review-heavy-load-fix3.test.ts`, `review-heavy-load-route.test.ts`. Convert into
    one `test/railway-capacity.test.ts` (pure, under a second): logs 8 → 16 with the pack, stone unchanged; stone 8 → 16
    with the breaker, logs unchanged; rails 8 throughout; with logs full a strike still credits stone and a chop returns
    0; chop and mine give 1 before Station 3 is funded (including after Station 2) and 2 after (axe 5 on trees, 2 on
    rocks); a felled tree's work is 15 and a broken rock's 4 at yield 1; a pile take stops at the kind's room; a kiln feed
    of 16 logs + 16 stone is one accepted effect; a prediction clone (`railPredict`) agrees with the server for a
    full-kind refusal; a hand-made save with 9 logs before the pack fails `railwayCheck`. Update `railway-line2.test.ts`
    (`railCarryMax` 12/24 → `capacityOf` logs 8/16 and rails 8; `RAILWAY_T1.carry` uses; the T3 40),
    `railway-replicate.test.ts` (`carryMax` 24 → logs 16; the T3 40), `railway-steel.test.ts`, `railway-works.test.ts`,
    `railway-read-session.test.ts`, `railway-line-authority.test.ts`, `railway-line.test.ts`, `railway-ops.test.ts`,
    `town-facts.test.ts`, `test/helpers/railway-route-rules.ts`, `server/test/railway-steel-host.test.ts`. Regenerate the
    golden fixture with the bump: `GOLDEN=1 node --test --test-concurrency=1 'test/railway-golden-*.test.ts'`.
  - Verify: `node dev/ship-check.ts`; `npm run loop -- run` (rail rules changed); `npm run checkpoints`.
  - **As built (18 November).** As written, with these differences. `MAX_ACCEPTED` (48, every row at once) bounds
    both the client's `accepted()` and the save check's outcome count, which also held a shared-back bound (24) the
    plan did not name; a kiln feed of 32 needed both. `LINE2_PACK.carry` reads `RAILWAY_CAPACITY.logsPack` (the other
    direction would be an import cycle). `RAILS` stays in `railway-line2-layout.ts` (the census forbids re-exports from
    `railway-queries.ts`). The seed's `chop()` fills 8 logs (the starting row), not `capacityOf`, so a seeded bill
    leaves nothing on the back after the pack; a shared `stockQ6` seed helper replaces three copies of a 16-rails
    loop. The loop runner no longer clears other kinds before a carry. `src/render/carry-models.ts` (step 4's file
    list) changed here, because it imported `HEAVY_LOAD`; its seating was not looked at (step 4). The dead
    `LONG_REVIEWS` flag went with the deleted arrival review (its train-offset sweep and 2,048-drop pile test went
    with it; the pile ceiling is now in the new test). Host tests send every changed op as a real `r:edit` in its
    existing server file: chop, mine, drop, take and the deposit bound (`railway-host`), `rackTake`
    (`railway-supply-durability`), `depotTake`, `depotRailTake` and `forgeTake` (`railway-line-host`), `steelTake`
    (`railway-steel-host`) and the kiln's 32 through a save and restart (`railway-works-host`). The one new unit file
    is the plan's `test/railway-capacity.test.ts`. Fixtures re-pinned in the bump commit with their own writers
    (seed and op goldens, tick-order heads, M12 trace, server host trace: namespace/checksum/snapBytes only).
- [x] **2. Tools and bots.** `dev/loop/graph.ts` `carryOf(material, packed)` → `carryOf(material, { pack, breaker })`
  from `RAILWAY_CAPACITY` (the canonical order has the breaker before the kiln); `dev/loop/run.ts` drops `carrySpeed`
  (walk at `WALK_MPS`) and fills per kind; delete `dev/loop/heavy-load.ts`; `dev/level/first-line-crossing-probe.ts` drops
  its heavy-load speed term (the probe's decision is closed). Bots: `dev/look/bots/railway.ts` (`carryComfort === 16`
  checks at 685, 1680, 1767 → `capacityOf(w, LOGS) === 16`; the T3 40s at 1420 and 1541 → the spec's bill; `fill()` and
  the forge-rack wait per kind with rails at 8; chop loops expect 1 a hit through Station 3) and `railway-works.ts`
  (`fillLogs` per kind; stone fill to 16 after the breaker; the cradle's 8 rails in one carry). Delete
  `dev/look/evals/review-heavy-load.ts` and `review-heavy-load-integration.ts`; update `dev/peer-test/ws-page.ts`.
  Verify: `node dev/ship-check.ts`; `npm run loop` shows the table above (T3 4×45; Q2 rails 2×46, Q3 rails 2×114).
  - **As built (18 November).** As written. `npm run loop` shows T3 5×45 → 4×45, Q2 rails 1×44 → 2×44, Q3 rails
    1×110 → 2×110 (the graph read 44 and 110 before the change too; the plan's 46 and 114 differ from it), Q4
    to Q7 and the steel works one more rail carry each. Also updated: `dev/peer-test/ws-railway.ts` (1 a hit, rows of
    8) and the server crash, eviction and supply fixtures. Not run: the bots in a browser (checkpoint A).
- [x] **3. The squares.** `src/player/haul-back.ts` `CarryReadout`: `capacity: { logs; stone; rails }` (from
  `capacityOf`), drop `comfortable`; add `refused?: 'logs' | 'stone' | 'rails'` (from the swing's `full` response or a
  refused take). `src/features/haul-stack.ts`: replace `fillCounts` and the icon set with `fillRows(load)`: per kind a
  row element holding `capacity[kind]` square spans, filled by the landed count, `data-full` on a full row, a pop
  animation on newly filled squares (WAAPI, transform only, skipped under `reducedMotion`), the row-visibility rule
  above, a shake on `refused`; the Pause section renders the same rows statically; `aria-label` keeps the exact text.
  `haul-stack.css`: `.carry-row`, `.carry-sq`, `[data-kind]` colours, the 4-group gap, `[data-full]` outline; delete
  the heavy amber and warning styles. `src/entities/railway/sources.ts` (readout and the three "Your back is full"
  prompts), `line2-view.ts:1338`, `shelf-view.ts:256`, `src/entities/ring-steel/view.ts`,
  `src/entities/route-greybox/leg-view.ts`: refusal by kind ("Logs full", "Stone full", "Rails full"; "Hands full"
  for big things). Rework `dev/look/evals/grant-c5-carry.ts` into `dev/look/evals/carry-squares.ts` (stage
  `logs, stone, rails` and capacities) and update `replay-pause-talk.ts`'s readout. Verify: `node dev/ship-check.ts`;
  stills at 960×600 and 390×844 through the eval: empty, 3/8 logs, full 8/8 logs (outline), 8 logs + 5 stone, 16 logs
  + 16 stone + 8 rails (the longest tag), a boiler name, Pause; read each still.
  - **As built (18 November).** As written; `incoming`/`reserved` left the readout too (no owner set them). The
    refusal shake follows a swing's `full` response (logs on a chop, stone on a strike); a blocked pile or rack prompt
    is not pressed, so a refused take shows its prompt, not a shake. One proof look at 1200×750 through the eval
    (`docs/reviews/separate-capacities/`): 3/8 logs, a full 8/8 logs row (cream outline) over 5/8 stone, the longest
    tag (16 + 16 + 8, 298 px) and Pause's static rows. Read each: the rows read by kind and the full row by its
    outline. Not seen: the empty tag, a boiler name, phone width, the pop and the shake (motion), a live refusal.
- [x] **4. The moments and the back.** `ability-arrival.ts`: an `edge` entry (`has: keenEdge`, `atState: true`,
  `badge: true`, the multi-axe model, flourish for every player, the funder included); add `edge` to the seen-key list
  comment. `src/render/carry-models.ts`: `MAX_CARGO` and `cargoCapacity` from `RAILWAY_CAPACITY` (16 logs or stone, 8
  rails), drop `HEAVY_LOAD`; `line-cargo.ts` comment ("rails share capacity with logs") corrected. Verify:
  `node dev/ship-check.ts`; a `--rail-seed` still of Buddy from behind and the side with 16 logs, 16 stone and 8 rails
  at once (the three loads must not intersect the pack frame or each other; adjust seating offsets if they do).
  - **As built (18 November, on the cutscenes step 1 change).** `edge` has no op: Station 3's funding is a deposit or
    the beam's, nobody's find, so the funder is not marked as its finder and gets the same flourish as everyone when
    next free (the multi-axe model, `tools.ts` `axeModel('edge')`); no card, no words. `test/ability-arrival.test.ts`
    checks one flourish each for the funder and a friend, none mid-air, and no card. `carry-models.ts` changed in step
    1. The seating still found the 16 stones through the 16-log bundle (`seat-three-before.png`); the stone heap is now
    four across and two deep a tier, inside the rail banks, and rides on the bundle's top (`haul-bundle.ts`
    `bundleTop`, `carry-models.ts` `stoneOn`, set in `line-cargo.ts`). A real back of 16 logs, 16 stone and 8 rails
    (accepted chops, strikes and a forge take through `dev/look/evals/carry-seating.ts` on `works-open`) from behind,
    beside and three-quarter (`docs/reviews/separate-capacities/seat-*.png`): no stone through the logs or the frame;
    the heap stands above Buddy's head from behind and starts at the rails' tops from the side. Not seen: a remote
    player's back, the flourish itself, and rails without the pack (by the code they lie crosswise in the logs' space, as
    before this plan; not looked at).
- [ ] **Checkpoint A (the batch).** *(18 November, on this machine: `ship-check origin/main HEAD` green, `npm run
  loop -- run` and `npm run checkpoints` green; the playthroughs, `world-inputs`, the works bot and the video not run.)* `npm run check`; `npm run loop -- run`; `npm run checkpoints`;
  `npm run playthrough -- --players 2 --to t2-funded` and `npm run scenario -- world-inputs` (a `src/sim` change);
  `npm run playthrough -- --to Q3` (Station 3 at 32 and the edge, the pack's log row, the doubled rail hauls); the works
  bot through the kiln
  (`npm run look -- --rail-seed works-arrive --query 'shot=play&railFrom=works' --eval dev/look/evals/railway-works-bot.ts --until window.__railStop`);
  one real-time video of rapid chopping into a full log row at Station 1 (squares pop, the refusal shake, no slowdown).
  Re-read the playthrough's beat times for place.md's timing table. The independent sim/net review reads the diff before
  it reaches main. Ship outside an owner session (no `WORLD_NS` bump mid-session).
- [ ] **5. Docs.** `docs/game-design/place.md`: rewrite "Carried-resource display" (heavy load, loose-cargo overflow and
  counts paragraphs replaced by this plan's rules and squares; keep "Pack steel", "Approach feedback", "Other amount
  surfaces"); the run's step 3 ("Your back holds 8 … 2 logs per full stroke", "Station 3, at the rim: 40 logs"), the pack
  line ("16 on your back" → "16 logs"), the 5 November note at line 675 and the timing table from checkpoint A;
  `docs/game-design/hud.md` line 23; `docs/agent-calls.md` Controls header line ("counts everywhere; squares gone" →
  partly superseded, link the decision); `docs/backlog.md` Dropped line ("The shipped heavy-load choice remains" → gone,
  link the decision); `docs/plans/round-4-notes.md` G6 and G14 status; `docs/direction.md` only where it names the heavy
  load. Verify: `npm run decisions`, `npm run owner-calls`.

## 3. Level findings

The plan places nothing in the world: no prop, secret, gate or device; the three steps derive from facts the route
already reaches (Station 3 funded, the pack chest, the breaker), each strictly before the bill it relieves (`npm run
loop`: the forge requires T3; Q1 requires the forge, which offers the pack; the kiln requires the throat, which requires
the breaker). `npm run level-check` was not run: there are no planned positions. Reach changes in one way: a loaded
player can jump, hook and glide again, as before 15 November. No gate depends on cargo limiting movement: the 16
November [crossing probe](../research/first-line-crossing-probe.md) found no first-line crossing where carry versus jump
matters, and the loop's world-held edges (jump after T3, sea and glider after the hook, pier after Q6) are about where
abilities are, not about cargo. Station 3's smaller bill moves no gate: the jump device still waits for the gantry to
pass (completion).

## 4. Risks

- **Room safety.** No effects move into apply; refusals stay `noop` receipts with the existing correction (predicted
  flights return). The accepted-count bound (step 1) is the one place a too-tight wire bound would silently drop an
  accepted effect; the new test includes a kiln feed of 16 logs + 16 stone. No new server import, so no
  `server/Dockerfile` change.
- **Mixed builds.** Dev phase, no compatibility code. Rule, bill and save-validation changes → `WORLD_NS` v60, one bump
  for the batch, dated history line, golden regenerated; schema fixture unchanged. Rooms restart fresh.
- **Hotspots.** `src/entities/railway/sources.ts`, `src/sim/railway-queries.ts`, `railway-sys-line1.ts` and
  `dev/look/bots/railway.ts` are large and busy; `npm run inflight` at planning showed only two ship branches touching
  `test/fixtures/unit-budget/loop.ts`, none of this plan's files.
- **Bots.** Segments that break until step 2: `t1-done`, `t2-funded`, `T2`, `T3` (chop loops at 1 a hit, twice the
  swings; T3's hard-coded 40), `forge-lit`/`Q1` (`carryComfort === 16` checks), `Q1`–`Q7` and the steel works' rail
  fills (rails at 8: more trips), the works bot's kiln fill, and any seed that fills a back to 8 across kinds. The
  two-peer route to `t2-funded` will take longer; raise its stall budget if needed rather than skip swings.
- **Line 2 is heavier until the rails upgrade exists** (about 68 s solo, mostly Q3's forge haul), accepted by the owner.
  The rails upgrade is a backlog row, not this plan's.
- **Visual load.** A back can now hold 40 pieces (16 logs, 16 stone, 8 rails). The bundle, stone and rails share the
  back; step 4's still decides the seating. **Performance:** DOM only; instanced caps fall from 24 to 16 (8 for rails);
  no `npm run perf` needed.

## 5. Open questions for the owner

Answered 17 November ([answers](../decisions-core-loop.md#d-2026-11-17-separate-capacities-answers)): the yield doubles
once Station 3 is funded, with its 40 logs to come down (this plan proposes 32, logged); the pack raises logs and the
breaker stone; rails start at 8, with their own upgrade later. No new owner question.

## Design review (2026-11-17)

Run by the planner on this plan after rereading it from the top, with DESIGN.md, owner-calls, the decision routing table,
Core loop / Rewards / Controls / Rail current rules, direction.md, the newest playtests and the design-work rules already
read for the plan; code read where calls depend on it (`railway-sys-line1.ts`, `railway-sys-works.ts`,
`railway-line-schedule.ts`, `railway-check-line1.ts`, `ability-arrival.ts`, `haul-stack.ts`). **Re-run the same day on
the calls the owner's answers changed** (9, 12, 14 and what follows from them).

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Logs and stone start at 8, each with its own capacity | Decided | [17 Nov](../decisions-core-loop.md#d-2026-11-17-separate-capacities) (2) |
| 2 | No overfill, slowdown, movement lock or hold-to-overfill; a full kind refuses that kind | Decided | 17 Nov (1) |
| 3 | A hit yields 1 at first; 2 is an upgrade | Decided | 17 Nov (3); overrides 16 Nov two-stage "chop yield stays" |
| 4 | The carried amount shows as squares | Decided | 17 Nov (4); owner-calls counts-everywhere, partly superseded |
| 5 | Piles, bills, racks and boards keep counts | Decided | [counts everywhere](../agents/owner-calls.md#counts-everywhere) supersession note |
| 6 | Big things need an empty back; shouldering sets a back-load down | Decided | [16 Nov batch-2](../decisions-rail.md#d-2026-11-16-batch2-boiler-prompt-sets-back-load-down) |
| 7 | Capacity and yield steps are the room's; late joiners inherit | Decided | DESIGN.md 6; the pack's precedent |
| 8 | Drop's tap-one/hold-all control stays | Decided | [10 Nov yards](../decisions-rail.md#d-2026-11-10-open-calls-answered-yards-at-halts) |
| 9 | The yield doubles when Station 3 is funded | Decided | [17 Nov answers](../decisions-core-loop.md#d-2026-11-17-separate-capacities-answers) (1); was New "Station 2" |
| 10 | The pack chest becomes the log step, 8 → 16 logs only | Decided | 17 Nov answers (2) |
| 11 | Taking the breaker brings stone 8 → 16 | Decided | 17 Nov answers (2) |
| 12 | Rails 8, no first-line step; their own upgrade designed later | Decided | 17 Nov answers (3); was New "16" |
| 13 | The proper axe stays 5 a hit on trees; rocks stay 2 | Default | Unchanged rule; cheap to retune |
| 14 | Station 3 takes 32 logs (was 40); Stations 1–2 and the forge unchanged | Default | Owner delegated the amount ("maybe reduce logs from 40"); measured above |
| 15 | Drop reservations go; the 128-pile ceiling stays and refuses new piles | Default | Nothing left to reserve for |
| 16 | The notch and crack track pieces taken, so the last hit finishes the tree | Default | harvest-feel: progress on the object |
| 17 | One row per kind, length = capacity (rails 8), groups of 4, kind colours, no numbers/fraction/icons; rows show only for kinds carried or just refused/grown | Default | Answers G14 |
| 18 | A full row takes a cream outline and shakes on refusal; no "Full" word | Default | Squares only; reduced motion flashes |
| 19 | Each square pops as its piece lands | Default | 4 November slot design; transform only |
| 20 | Pause shows the same rows; big things show their name only | Default | No mixed counts and squares |
| 21 | Refusal prompts "Logs full", "Stone full", "Rails full"; the edge's flourish at Station 3's funding, with no card or words | Default | Draft UI copy, not The Boogler's |

Counts after the re-run: **12 Decided, 0 New, 9 Default.** Every open Default call is in
[agent-calls](../agent-calls.md) (Core loop and Controls, 17 November); the four ruled calls (9–12) moved, word for word,
to the [archive](../decisions-archive.md) under "Separate-capacities calls ruled on 17 November 2026", and call 14's row
was rewritten for the 32-log bill.

**Findings (first run).**

1. **A wire bound would have hidden accepted kiln feeds.** `railway-effects.ts accepted()` caps the accepted count at
   today's 24; a kiln press now accepts up to 32. Changed step 1 (bound 48) and Risks (a kiln case in the new test).
2. **The upgrades arrive without a press, so their first meeting must be shown.** Changed steps 3 and 4: the grown row
   shows with its new empty squares for the hold after the pack or breaker, and the edge gets the multi-axe flourish for
   every player.
3. **Separate capacities let one trip bring two kinds.** Station 2 can drop from 5 trips to 4 and co-op no longer needs a
   stone carrier; the first meeting with stone is a second row appearing on the first strike, which teaches "separate"
   without words. No step change.
4. **An empty row must still say its kind.** With no icons, the 30% kind tint on empty squares is the only label.
   Step 3's stills check it on grass and sand; if it fails, the fallback is a coloured left cap, not an icon.

**Findings (re-run on the answers).**

5. **With the edge at Station 3, the 1-a-hit stretch is the whole first line**, 96 presses before the edge instead of
   52 today. Station 3's bill is the counterweight: at 32 logs it is one trip and about 13 s shorter than today's, so
   the grind the owner is wary of does not grow where Grant felt it. Changed: section 1 ("Station 3's bill"), step 1
   (the bill), step 2 (bot), step 5 (docs), and agent-call 14.
6. **The edge now lands right before the forge's 56 logs**, its first bill at 2 (28 presses, the same as today), and
   on Station 3's funding moment, when the machine starts the trestle; the flourish rides that moment rather than
   competing with the completion pull-out. Changed step 4's wording only.
7. **A bill change has hard-coded copies.** The beam-allocation invariant (`t3.stock === 40`), the seed, the bot and six
   test files name 40; a missed one fails the check or the bot. Changed step 1 and step 2 to name each.
8. **Rails at 8 doubles Q3's 114 m forge haul and Q2's 46 m one** (about 68 s solo over line 2). Accepted by the owner;
   the rails upgrade should be designed against the forge rail rack's new spot (P3 backlog row), since that move changes
   exactly these hauls. Logged as a backlog row; no rails design here. The squares' rails row is 8 long (step 3).
9. **Level and flow.** No placement; each step lands before the bill it relieves (rule 1, the next goal can be found;
   rule 3, nobody stranded: a full back no longer locks movement, and the pile ceiling refuses without spending). The
   restored jump/hook/glide with cargo breaks no gate (rule 2; crossing probe), and Station 3's smaller bill moves no
   gate. Proof: `npm run loop -- run` at checkpoint A. Stills of the place itself were not needed and not taken.

**Owner questions:** none new. The rails upgrade's design is a later plan of its own.
