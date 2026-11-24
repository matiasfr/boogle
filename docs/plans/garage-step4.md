> **Status, 24 November 2026: re-planned against greybox leg 3 as built, not built.** Planner, against main
> `d6152420a` (world v66: leg 3's steps 1 to 5, #2327; Checkpoint G, #2332). The 19 November plan (main `6c46e3854`,
> v62) is kept where it still holds; [what leg 3 built](#what-leg-3-built-and-what-is-still-owed) replaces its step 2
> file list, and [Strong's window](#strongs-window-what-checkpoint-g-measured-and-three-options) is for the owner.
> Step 3, the screen, holds on his answer to [question 1](#open-questions), as the leg 3 plan says. Steps 1 and 2 do
> not wait. Design reviews: [19 November](#design-review-2026-11-19), kept as written, and
> [24 November](#design-review-2026-11-24).

# Garage step 4: the per-line Quick or Strong trade, line chips and works copies

**Why a file of its own.** garage-choices is 78 KB and keeps each built step's as-built notes. Step 4 carries
corrections from leg 2's plan, from leg 3's plan and from measuring main, so it has its own file, as each leg does.
garage-choices' step 4 row points here; its other steps are unchanged.

**Goal.** Once a new line can be built on, the room can fit it at Home's Roundhouse with one of two boilers:
**Quick boiler** (25 m/s, the same cars) or **Strong boiler** (20 m/s, one more car, carrying a second section's kit
and holding at the railhead for it). The room pays once and swaps freely, and the line's trains take the fit at their
own depot. The garage screen gains a chip per fitted line, and each line's works copy waits in its own bay. This is the
payoff of the P1 focus, choice and payoff, and the last part of the checkpoint "Canopy and the first real choice"
(docs/backlog.md). It serves DESIGN.md **6. Communal world** (one room's railway, configured by anyone), **7.
Telegraph everything** (the copy in its bay, the chip, the held train at the railhead) and **11. Show, don't tell** (the
train you chose is the train that arrives). It bends nothing; [finding 1 of 24 November](#findings-2026-11-24) is where 11 is
at risk.

**Read for this (24 November).** AGENTS.md; `npm run map -- --kind prototype`; DESIGN.md; context's design-work rules;
owner-calls' index; this plan as written on 19 November; [greybox-leg3](greybox-leg3.md): "What garage step 4 gets
from leg 3", the hold, step 3's as-built notes, Checkpoint G and its open questions;
[the Checkpoint G report](../reports/greybox-leg3-checkpoint-g.md) (24 November); the rail and rewards Current rules,
[d-2026-11-19-garage-step4-waits-for-leg3](../decisions-rewards.md#d-2026-11-19-garage-step4-waits-for-leg3),
[d-2026-11-23-greybox-service-health](../decisions-rail.md#d-2026-11-23-greybox-service-health),
[d-2026-11-15-garage-trade-answers](../decisions-core-loop.md#d-2026-11-15-garage-trade-answers) and
[d-2026-11-10 plain readouts](../decisions-core-loop.md#d-2026-11-10-the-train-upgrade-screen-install-plain);
docs/backlog.md's checkpoint; [garage-choices.html](../world/garage-choices.html). Code on main:
`src/sim/railway-train.ts` (`BOILER`, `BOILER_CARS`, `kitBills`, `TRAIN.railheadHoldTicks`),
`railway-sys-steel.ts` (`install`, `boilerAdopt`), `railway-sys-trains.ts` (the stand, line 229),
`railway-sys-route-kit.ts` (`legKitLoad`, `legRailheadHold`), `railway-queries-route.ts` (`legKitCap`,
`legMintChain`, `legKitTrains`), `railway-components.ts` (`Line`, `Shed`), `railway-works-layout.ts`
(`INSTALL_STEEL`, `installRevision`, `WORKS.upgradeTicks`, `SHED_TABLE`), `railway-check-steel.ts`,
`src/world/namespace.ts`, `src/world/railway-server.ts`, `src/adapters/railway-intents.ts`,
`src/entities/railway/garage-{data,state,view}.ts`, `cars.ts` (`consistOf`), `train-view.ts`; `dev/sim/leg3-trade.ts`
(run on main, and twice with scratch variants that were reverted, [below](#strongs-window-what-checkpoint-g-measured-and-three-options)).

**Research.** As on 19 November: [roundhouse-management](../research/roundhouse-management.md) ("one small
configuration choice per line", reversible): used. [upgrade-economy](../research/upgrade-economy.md) rec 2 (an upgrade
repays an inconvenience already felt): **used for the offer moment**. The room first feels the kit wait on the bay cut
at `bay-mid`, at the West landing, 28 s from the post, and that is where option A offers the trade.
[roundhouse-trains](../research/roundhouse-trains.md) ("not an intended wait-to-afford-upgrades loop"): used for the
price. Not a port from Place.

**The rail route as it stands** (`npm run loop`, 24 November): the built graph runs to `bay-2`; `canopy` is still a
stand-in in the loop until leg 3's step 7. Built bills past High Gorge are greybox kit, 20 logs and 20 rails a section,
with no footings and no steel on any leg. Leg 3 (`bell-canopy`) has three sections, and its kit loads at the West
landing.

**In flight** (`npm run inflight`, 24 November): `claude/forge-rack-move` (146 h old; `dev/look/bots/railway.ts`,
`docs/agent-calls.md`, `place.md`): nothing here edits its code files. **Planned and claimed, not built:** leg 3's
step 6 (`leg-view.ts`, `halts-view.ts`, `train-view.ts`, `railway-read.ts`, `railway-intents.ts`) and step 7 (the bot
and loop). Step 3 here edits `train-view.ts` and adds to `railway-intents.ts` ([order](#order)).

## What leg 3 built, and what is still owed

Diffed on 24 November between the 19 November step 2 file list and main `d6152420a`:

| The 19 November plan wanted | On main (v66) | Still owed by step 4 |
| --- | --- | --- |
| `BOILER[4]` Quick, `BOILER[5]` Strong, `BOILER_MAX` 5 | Yes (`railway-train.ts:37`) | Nothing |
| `boilerCars(row)` | Yes, with `BOILER_CARS` and `kitBills(row) = 1 + boilerCars` | Nothing |
| "Loading: unchanged; nothing fills the flatbed" (calls 20 and 21) | **Replaced** by the hold: a Strong train loads two sections' bills and tops up if it adopts with one aboard. It holds at the railhead for the next lay for up to 1,200 ticks, and yields to an assigned ask or a follower at its approach signal (23 November) | Nothing in the sim. The screen and readouts are rewritten [below](#the-garage-screen) |
| Allowed rows in the checker (line 1 {0, 1}, line 2 {0..3}, trade lines {0, 4, 5}) | Yes (`railway-check-steel.ts:71`), plus the cargo bound `kitBills(row)` × a section's bill | `fittedSteel` adds the trade lines; `Line.rev` and `Shed.tableLine` rows |
| `TRADE_ROWS` | Not needed: the checker names the rows inline | Nothing |
| `Line.rev`, `Shed.tableLine`, `Shed.bringRev`, `Shed.brought` | No | All four (`railway-components.ts`) |
| `INSTALL_STEEL` 5 and 6, `installPart` 5 and 6, `installRevision` → `Line.rev` | No (`{ 1: 0, 2: 0, 3: 6, 4: 4 }`; the revision is `boiler + cradle`) | All |
| `TRADE_STEEL` | No | Dropped: `INSTALL_STEEL[5]` and `[6]` are the price |
| `BRING_TICKS` 60, `MOMENT_TICKS` 50 | No; `WORKS.upgradeTicks` is already 50 ("let the accepted garage upgrade settle", 5 s) | `BRING_TICKS` only; the install side reuses `WORKS.upgradeTicks` |
| `TRADE_LINES`, `tradeLeg` | No; the checker reads `ROW_LINE.ns` and `ROW_LINE.bay` | Both, plus `TRADE_OPENS` (when each line's trade opens: [question 1](#open-questions)) |
| `install` widened to trade lines | No (`e.line !== LINE2` refuses) | All |
| `boilerAdopt` `<` → `!==` | No (`<`; the comment still says "a line 2 train standing at the Village") | `!==`, and a train keeps its row while its kit aboard is more than the new row carries ([call 6](#calls-2026-11-24)) |
| `rail.bring` in `railway-sys-works.ts` | No | All |
| `railway-server.ts` admission, `railway-intents.ts` shape and sanitizer | No (`rail.install` admits `LINE2` only) | All |
| Hold tests and the trade table | Yes: `test/railway-leg3-hold.test.ts` (writes `Line.boiler` directly) and `dev/sim/leg3-trade.ts` | One hold test fitted by accepted `rail.install` |
| The world bump "v63" | v63 to v66 have gone to other work (v66: leg 3) | **v67**, or the next free number when step 2 ships |
| A new sim file in the server image | None needed | Nothing (`rail.bring` goes in the existing `railway-sys-works.ts`) |
| Seeds | `canopy-open`, `canopy-mid`, `canopy-reached` exist beside `bay-mid` and `bay-reached`; no leg seed lands steel | `trade-ready`, `trade-fitted` |
| Views: Quick's chimney, Strong's flatbed, chips, copies in bays | None (`consistOf({ line, wagon, steel })`, no `strong`) | All (step 3) |

**The service rule changed under the plan.** The 19 November step 2 proved its swaps against "leg 2's wait bounds
(1,350 settled, 1,600 growing)". Those bounds are replaced for the greybox by the [23 November service
decision](../decisions-rail.md#d-2026-11-23-greybox-service-health): every live call is served, separation is safe, and
waits stay within two headways plus intermediate boarding dwells. A train that joins counts after half a cycle, and a
fleet whose boiler changes mid-run (line 2's handover, the forced mixed stack) is checked for service, safe spacing and
the three-budget stall limit. A row swap mid-run is that case. Step 2's fuzz uses the mixed-fleet gate for calls in the
first circuit after an accepted swap, and the ordinary gate after that.

## Strong's window: what Checkpoint G measured, and three options

**For the owner.** The leg 3 plan sends this to you before the screen is built, not before the rules.

**The measurement** (Checkpoint G, `dev/sim/leg3-trade.ts` on v66: solo means over eight start offsets, 0 to 525 ticks
by 75, from opening the Canopy gate to leg 3's third lay; 10 ticks = 1 s):

| Fitted at | Standard | Quick | Strong | Strong vs Quick | Strong vs Standard |
| --- | ---: | ---: | ---: | ---: | ---: |
| `bay-mid` (the bay cut's first lay) | 3437.6 | 3016.0 | 2880.9 | **+13.5 s** | +55.7 s |
| `bay-reached` (the bay cut's last lay) | 2581.4 | 2325.6 | 2504.9 | **−17.9 s** | +7.7 s |
| `bay-reached`, offset 0 only | 2560 | 2221 | 1948 | +27.3 s | +61.2 s |

A pair gives the same figures to the tick, so a second feeder does not change the trade.

**Why the window closes at `bay-reached`** (the trade script on main, 24 November, solo `bay-reached` rows). When the
bay cut's last section lays, section 1's kit is already on Bell Rock's rack (rack 1: 0 to 16 ticks). Within 7.5 s of
the `bay-reached` seed, a standard train has left the West landing with section 2's kit. A Strong fit after that
finds one bill left to load, so the second car has nothing to pool. Offsets 75 to 525 match standard to the tick. A
solo room stands at Bell Rock then, about 2 km from the post, so its realistic fit comes minutes after the lay, and
Strong is then a slower Quick. **Limiting the kit ahead to one section of leg 3 changes nothing** (a scratch variant, all
24 solo runs identical to main): what closes the window is the timing of the trains' West landing stands, not the
kit lead.

**Three options.** Each changes one thing. Figures are solo means on the method above.

| | What it changes | Strong vs Quick | Strong vs Standard | Cost | Needs his word? |
| --- | --- | ---: | ---: | --- | --- |
| **A. Offer the bay trade from the bay cut's first lay** (`bay-mid`); `ns` keeps its offer at the incline's last lay | One constant, `TRADE_OPENS.bay = 1`: when the trade opens (19 November call 11, a Default). No rule of leg 3's changes, no extra bump | **+13.5 s** over leg 3; **+12.6 s** counted from the fit, with the bay cut's last section included (a scratch print of the same script: Standard 3899.5, Quick 3472.3, Strong 3346.5 ticks). Range 12.2 to 13.7 s over the eight offsets | +55.7 s | Quick is offered while the open bay line is one section long. A ride saves 4.5 s until the cut's last lay, then 10.5 s (both measured on 19 November), then about 22 s with leg 3 (leg 3's arithmetic) | **Yes, on one reading.** The 10 November rule is "a speed part only where it saves about ten seconds a trip"; A reads it over the line being built, as leg 3's open question 1 did |
| **B. Leg 3's kit loads only once the Canopy barrier is open** (no kit ahead into leg 3); the offer stays at `bay-reached` | Leg 3's built loading rule (its call 13; the "kit runs ahead" rule the greybox route is built on); a bump | **+24.5 s** (Standard 3628.5, Quick 3303.5, Strong 3058.1; scratch variant, reverted) | +57.0 s | **Every room about 100 s slower on leg 3**: Standard +104.7 s, Quick +97.8 s, Strong +55.3 s against today. Fitted Strong under B is 73.3 s slower than Quick today. Section 1 waits a lap at Bell Rock | **Yes**: it reverses a built rule and adds a wait with nothing to do |
| **C. No change** (offer at `bay-reached`) | Nothing | −17.9 s solo; +27.3 s only when someone at the post fits within 7.5 s of the last lay (a pair who split at leg 2's beat 7) | +7.7 s | Strong is a trap for a solo room; the choice is Quick or nothing on both lines | No |

**Recommendation: A.** It is the only option that makes the early fit pay without slowing anyone, and it puts the offer
where upgrade-economy rec 2 wants it: the room has just felt the kit wait at the West landing, 28 s from the post.
The free swap then carries the 19 November idea, "Strong while building, Quick after". Fit Strong at `bay-mid`, and
swap to Quick once leg 3 is laid, for about 22 s a ride. Two honest limits. Strong's margin is 13.5 s, not the 30 s of
that call's arithmetic. And after leg 3 is laid, Strong holds nowhere on the built route: the Notch leg is one section,
and the cave line is its own plan. B buys a larger margin by making Quick and standard worse, which is backwards. C
ships a dead option for solo rooms, the thing the 19 November call waited to avoid.

**What A asks of the build.** One constant (`TRADE_OPENS`, step 2); `trade-ready` seeded from `bay-mid`, not
`bay-reached` (step 3); the bay chip appears at `bay-mid`. If you pick C, the constant becomes the bay cut's length and
the seed moves to `bay-reached`, with no bump. If you pick B, the change goes to leg 3's rules as its own step with a
bump, and this plan's steps are unchanged.

## Design

### Where, when, and what the player sees

On option A (the plan's recommendation; under C the bay column reads as on 19 November):

| | North–south line (`ns`) | Bay line (`bay`) |
| --- | --- | --- |
| **Offered** | The incline's last lay (seed `bell-reached`): the whole line runs; 9.8 s a ride | The bay cut's first lay (seed `bay-mid`): head 1 opens, and section 2's kit is the next wait |
| **Where the room is then** (solo) | Bell Rock's lower deck, about to ride home the long way (about 6 to 7 min) | The West landing's apron, beside frame 1 just laid, with section 2's frame at head 1 over the sea and its kit still to come; the post is 158 m (about 28 s) away |
| **First sight of it** | At the Village platform, 21 m from the post: the post's knob turns orange; bay 210°'s door opens on the `ns` copy | Off the bay train at the West landing: the same knob and bay 230°'s copy |
| **Where it is chosen** | Home's Roundhouse, at the garage post (`SHED_TABLE`), the `ns` chip brought to the table | the same, the `bay` chip |
| **Where it takes effect** | The next `ns` train standing at High Gorge | The next `bay` train standing at the West landing. While the bay cut is owed, a Strong train carries its one remaining bill (`legKitCap` never spans legs); once leg 3's kit loads, it carries two sections' bills and holds at the railhead |
| **Where Strong is felt** | Nowhere on the built route (the causeway leg is one section and not built): Strong is a 20 m/s engine with an empty car here | Leg 3's railheads, while leg 3 is built: about 13.5 s across the leg; nowhere after it is laid |

The screen grows in two steps, in play order (the incline is laid before the bay cut opens): from `bell-reached` the
chips read **Line 2 · North–south line**, and from `bay-mid` **Line 2 · North–south line · Bay line** (catalog names,
placeholders).

**The loop, per line.** The bay line is the trade's home ground. Under A, the room meets the offer standing at the
West landing, waiting for kit. It walks 28 s to the post, fits Strong and walks back, and the next bay train out
carries two bills. Once Canopy is laid, a room that comes home swaps to Quick at the same post. The `ns` line is chosen
once and rarely felt, which is its character ([19 November finding 4](#findings)).

**What the player sees at the depot.** As on 19 November: line 2's platform beat (`train-view.ts`: steam covers the
swap, a clank, a short squash, a toot) at the line's own depot on any change of row. A Quick train wears the longer
boiler's chimney; a Strong train's flatbed couples behind its kit car as line 2's steel car does. **New on 24
November:** the Strong flatbed carries the second bill's logs and rails, drawn as the kit car draws its own (the same
stacks, from `Train.logs` and `Train.rails` past one section's bill). So a train held at Bell Rock shows its next
section's kit on the flatbed: that is the hold's cue, the leg 3 plan's "the train standing at the railhead with its
kit car loaded". A swap back from Strong plays the beat with the flatbed gone. A local player standing on it is first
set on the halt's platform. A restore, a late join and reduced motion get no beat. No new sound.

### The rules

What leg 3 built stands: rows 4 and 5, the two-bill load and top-up, the hold and its yields, the cargo bound. Step 4
adds how a room gets a row:

- **The trade lines and when they open** (`railway-route.ts`, beside `ROW_LINE`): `TRADE_LINES = [ROW_LINE.ns,
  ROW_LINE.bay]`; `tradeLeg(line)` = the line's first leg (`incline`, `bay-cut`); `TRADE_OPENS: { [line]: sections }`,
  the sections of `tradeLeg` laid before the trade opens: `ns` the incline's whole length, `bay` **1** under option A
  (2, the bay cut's length, under C). `tradeOpen(w, line) = legRow(w, tradeLeg(line)).laid >= TRADE_OPENS[line]`.
  Catalog data: a change is a rules change with no state, so no bump.
- **Install parts 5 (Quick, row 4) and 6 (Strong, row 5)** on `rail.install { line, part, revision }`, for a trade line
  only. Refused unless `tradeOpen(w, line)`, `Shed.tableLine === line`, `revision === Line.rev`, the part's row is not
  the line's current row, the table is not busy (the roll-out rule, as today), and [the hold](#the-hold) is over. **The
  first fit on a line costs 1 steel** (`INSTALL_STEEL[5] = INSTALL_STEEL[6] = 1`, `upgradePool >= 1`, `spendUpgrade`);
  a line already on row 4 or 5 swaps for nothing, any number of times (decided). The "already paid" branch is the one
  place the price reads state; the screen shows "Swap" there. Accepted: `Line.boiler = row`, `Line.fitted = tick`,
  `Line.rev += 1`. Line 2's parts 1 to 4 keep every rule they have, plus `Shed.tableLine === LINE2`.
- **One revision per line, `Line.rev`** (new `int`, +1 on every accepted install of that line), replacing
  `installRevision = boiler + cradle`, which cannot fence a swap (Quick, Strong, Quick repeats a sum). On line 2, `rev`
  equals `boiler + cradle` at every accepted step, and the checker holds it to that, so line 2 is provably unchanged.
  The admission bound becomes `railInt(e.revision, RAILWAY_MAX_INT)`, and an install refuses at `rev >=
  RAILWAY_MAX_INT`, as `rail.turn` does.
- **Adoption** (`boilerAdopt`): a train standing at its line's halt 0 takes its line's row when it differs (`!==`), so
  a swap back adopts, **unless its leg kit aboard is more than `kitBills(fit)` × its leg's section bill** (a Strong
  train that yielded with its second bill aboard). That train keeps its row until a later stand at halt 0 where the
  kit fits, so the cargo bound always holds and no unit is sent home. Never in flight. On line 2 the fit only rises, so
  the change is a no-op there. The stand order is unchanged (adopt, then `legKitLoad`, then `legRailheadHold`), so a
  train adopting Strong with one bill aboard tops up, as leg 3's test proves.
- **`rail.bring { line, revision }`** (new op, the `rail.turn` family, in `railway-sys-works.ts`), unchanged from 19
  November. It is judged at `SHED_TABLE`'s reach and refused unless `line` is line 2 or a trade line with
  `tradeOpen`, `line !== Shed.tableLine`, `revision === Shed.bringRev`, the table is not busy, and the hold is over.
  Accepted: `Shed.tableLine = line`, `Shed.bringRev += 1`, `Shed.brought = tick`.
- <a id="the-hold"></a>**The table's hold** (not the railhead hold): no install or bring is accepted before
  `max(Shed.brought + BRING_TICKS, max over lines of Line.fitted + WORKS.upgradeTicks)`. `BRING_TICKS = 60` is the
  copies' swap (6 s). `WORKS.upgradeTicks` is the existing 50 (5 s), which already covers the install moment's 4.8 s
  rest.
- **The consist**: no sim rule reads cars. `TRAIN_EXTENT.behindCm` (16.1 m) covers a Strong train, as on 19 November.

### Sync kinds and authority

As on 19 November, with no new kind:

| Piece | Kind | Authority | Where |
| --- | --- | --- | --- |
| Each line's row (`Line.boiler`), its revision (`Line.rev`, new) and install tick (`Line.fitted`) | Server | server | `railway-components.ts` `Line`; `railway-sys-steel.ts` `install` |
| The copy on the table (`Shed.tableLine: u8`, new, default `LINE2`), `Shed.bringRev: int` (new), `Shed.brought: int` (new, −1) | Server | server | `Shed`; `railway-sys-works.ts` `bring` |
| A train's row (`Train.boiler`), adopted at its line's halt 0 | Server | server | `boilerAdopt` |
| The steel spent (`Shed.spent`) | Server | server | as step 3 |
| Chips, the selected tile, the bring and install animations, bay occupants and doors, the flatbed and its stacks, the copy's look | Local, from accepted rows | each tab | `garage-*.ts`, `src/features/garage.ts`, `rotunda-stage.ts`, `train-view.ts`, `cars.ts` |

There is no client lead, classic edit generator, client state registration, `src/world/rules/` file, presence field or
message. **Rule ticks** stay the room's (`railTick`; adoption is inside the stand). **Saves:** the four new fields are
columns of existing checkpointed rows (`Line`, `Shed`); nothing is transient. **Ops:** `rail.bring` is new;
`rail.install` is widened (parts 5 and 6, any trade line, the new revision bound). **Admission**
(`railway-server.ts`): `rail.install` accepts line 2 with parts 1 to 4, or a trade line with parts 5 and 6.
`rail.bring` takes `railInt(e.line, RAIL_LINES.length - 1)`, `railInt(e.revision, RAILWAY_MAX_INT)` and
`at(SHED_TABLE)`. **Prediction:** none; both ops wait for the receipt. **Receipts:** an accepted install plays its
moment from the replicated `Line` change; an accepted bring plays the copies' swap from `Shed.tableLine`. A refusal
shows its reason: the existing "The table's busy", and bills as today ("STEEL 0/1").

**Invariants** (`railway-check-steel.ts`): the allowed rows (on main); line 2's `rev === boiler + cradle`; a trade
line's `rev >= 1` once its row is not 0; `cradle` 0 on trade lines (on main); `tableLine` is line 2 or a trade line with
`tradeOpen`. **Spent steel** equals line 2's fits plus `INSTALL_STEEL[5]` for each trade line not on row 0 (extending
`fittedSteel`). **No trade fit** before `tradeOpen`.

### The garage screen

- **Chips**: as on 19 November (a row above the category rail, one per fitted line, the table's lit; click, tap or
  Interact sends `rail.bring`; dimmed with "The table's busy" while held). No new action, pad slot, key or touch
  button.
- **A trade line's Engine tab** shows Quick boiler and Strong boiler side by side (decided names). Unpaid: both read
  "STEEL n/1" or Ready. Paid: the fitted row reads Installed and the other "Swap" (placeholder).
- **Readouts**, revised: top speed (Quick 20 → 25 m/s; Strong 20 → 20) and cars (Quick 2 → 2; Strong 2 → 3), as
  decided. The third row says what the line's trains carry: **"Kit a trip"**, Quick 1 → 1 section and Strong 1 → 2
  sections, while a built leg the line carries kit for has at least two sections still to lay (on `bay` at `bay-mid`: leg 3, whose kit runs ahead). Otherwise the row reads **"Nothing to
  build"** (placeholder) for both tiles: on `ns` always, and on `bay` from leg 3's second lay (one section left, which a Strong train cannot pool). This replaces 19 November's
  "Nothing to haul yet". It is a trip count, not the decided "resources a minute", because the leg's pace is set by its
  lays. A per-minute rate would show Strong carrying twice as much while the room saves 13.5 s, which DESIGN 11
  forbids ([question 2](#open-questions)). Cars tab: seats (4). Cargo tab: kit car Installed; "Kit flatbed"
  (placeholder, was "Cargo car") Installed on Strong, Later otherwise. Looks and Whistle as line 2's.
- `MOMENT_FROM` for parts 5 and 6: the line's current row (standard → Quick or Strong; Quick ↔ Strong).

### The bays

Unchanged from 19 November: `bayOccupants(site, { serving, copies })` gains the copies, **line 2 at 170°, `ns` at
210°, `bay` at 230°**, door open, the line's colour on a plate, each copy wearing its row, with step 2's before-enable
guard. Stages 3a and 3b stay moved out (19 November call 17).

## Steps

Each step leaves `node dev/ship-check.ts` green. Model rows are from `npm run models` (24 November). Step 2 ships
before step 3. Step 3 holds on question 1.

- [x] **1. The 2D page, refreshed to leg 3 as built (S; docs).** `docs/world/garage-choices.html`: the leg 3
      calculator's "ARITHMETIC / leg 3 is not built" becomes Checkpoint G's measured table (the three rows above, with
      the per-offset ranges from the report); the three options with their figures; the trade price 1; the greybox
      bills; the steel supply after 12 set to 0 (the built Works); a line per line saying where Strong is felt (bay:
      leg 3 only; `ns`: nowhere yet). Keep the old arithmetic (291, 248 and 221 s) as a labelled "best case, no kit
      ahead" input. Verify: open the page, read the totals back from the DOM, one still. Row: "Fixes, tooling and
      captures-driven tasks": gemini-4-neon medium.
- [ ] **2. The rules and the bump (M to L; review).** `src/sim/railway-route.ts`: `TRADE_LINES`, `tradeLeg`,
      `TRADE_OPENS`, `tradeOpen`. `src/sim/railway-components.ts`: `Line.rev`; `Shed.tableLine` (default `LINE2`),
      `Shed.bringRev`, `Shed.brought` (−1). `src/sim/railway-works-layout.ts`: `INSTALL_STEEL` 5 and 6 at 1,
      `installPart` 5 and 6, `BRING_TICKS`; `installRevision` removed (its readers move to `Line.rev`).
      `src/sim/railway-sys-steel.ts`: `install` widened, the table's hold, `boilerAdopt`'s `!==` with the kit guard,
      and its comment. `src/sim/railway-sys-works.ts`: `bring`, registered in `railway-systems.ts` beside `rail.turn`.
      `src/sim/railway-check-steel.ts`: the invariant rows above. `src/world/railway-server.ts`: the op list and both
      admissions. `src/adapters/railway-intents.ts`: the event shape, its sanitizer (trade lines with parts 5 and 6),
      `bringLine(line, revision)` and `installPart(line, part, revision)`. `src/entities/railway/garage-state.ts`:
      `installRev` reads `Line.rev`, the one view line this step must touch. `src/world/namespace.ts`: **v67** (or the
      next free number) with a dated line. Fixtures are regenerated after the old-seed audit garage step 3 used:
      every old column identical, the new columns zero or line 2.
      Verify in `test/railway-install.test.ts` (pure, lockstep). Refusals: a trade part on line 2, a line 2 part on a
      trade line, before `tradeOpen` (the bay at 0 sections laid, `ns` with the incline unlaid), with another copy on
      the table, a stale revision, the current row again, an empty pool, during the table's hold and during the
      roll-out. The first fit spends 1 and a swap 0; ten swaps in a row are accepted. A fit adopts only standing at the
      line's halt 0, never in flight, and a swap back adopts. **A Strong train carrying two bills that the room swaps
      to Quick keeps Strong until a halt 0 stand where its kit fits one bill, and the cargo bound and unit
      conservation hold throughout.** Two installs on one tick fit once. Line 2's `rev === boiler + cradle` holds
      across its whole install order. `rail.bring`: refusals (a line not open, already on the table, stale revision,
      busy table, the hold); two on one tick bring once. In `test/railway-leg3-hold.test.ts`, one case fits Strong by
      accepted `rail.bring` and `rail.install` from `bay-mid` and sees the hold at Bell Rock. The swap fuzz
      (`railway-leg2-rules.test.ts`' method, its four ruled seeds) runs on `ns` and `bay` from `bay-mid` with random
      accepted swaps among rows 0, 4 and 5 under random lever asks and restores. The block rule and every invariant
      hold; the [23 November gate](#what-leg-3-built-and-what-is-still-owed) applies, the mixed-fleet checks for one
      circuit after each swap. `server/test/railway-steel-host.test.ts`: a trade install and a bring across `r:edit`
      and a host restart (the state comes back, the moment does not replay). `npm run loop -- run`. Rows: "High-risk
      implementation": opus medium (high for tricky work), then the independent review row (gpt-6.2-astra first).
- [ ] **3. Seeds, screen, bays and trains (M to L; player-visible). Holds on question 1.**
      `src/sim/railway-seed-legs.ts` (or a sibling): `trade-ready` from `bay-mid` under A (`bay-reached` under C), by
      accepted ops only: light the works and bring 12 steel home with the steel seed's own helpers, for a pool of 12.
      `trade-fitted`: `ns` Quick and `bay` Strong, both adopted at their depots. `trade-held`: `trade-fitted` run on by
      accepted ops until a Strong train holds at Bell Rock with section 2's kit on its flatbed. `SEED_STAGES`, its golden shard, `railway-jump.ts`
      rows without a `land`. `garage-state.ts`: per-line facts (`lines`, `tableLine`, `bringRev`, the hold,
      `tradeOpen`, the third row's two-sections-to-lay test). `garage-data.ts`: `partsOf(room, line)`, `rowsFor` for trade lines,
      the `'swap'` standing, `MOMENT_FROM`, the "Kit a trip" and "Nothing to build" rows. `src/features/garage.ts`: the
      chip row and its navigation. `garage-view.ts`: the table copy is `tableLine`'s, wearing its row, and the copies'
      swap in at most 6 s. `src/place/rotunda.ts` `bayOccupants` with copies; `rotunda-stage.ts`, `rotunda-view.ts`,
      `roundhouse-view.ts` (doors, plates, the post's knob orange for any line's Ready part); the roundhouse prefab
      record and `dev/prefab/rotunda.ts` regenerated. `cars.ts`: `consistOf({ line, wagon, steel, strong })` with the
      flatbed (role `'cargo'`, `TRAILER`) after the kit car. `train-view.ts`: Quick's chimney, Strong's flatbed with
      the second bill's stacks, the platform beat on `fit !== tr.wears` at the line's halt 0, and the platform move
      for a local rider. `docs/game-design/place.md`: the chips, the trade, the hold's cue, the bays, adoption at each
      line's depot.
      Verify (`.look/`, stills opened): at `trade-ready`, the post with the chip row and the bay Engine tab showing
      both tiles at Ready with "Kit a trip"; at `trade-fitted`, Installed and Swap, and `ns`'s tab reading "Nothing to
      build"; bays 210° and 230° from the post at player height and from the garage camera; a Strong `bay` train
      at `trade-held`, standing at Bell Rock's upper platform with section kit on its flatbed (the hold's cue), from the platform and
      from frame 1; a Quick `ns` train at High Gorge; the bring as motion (a contact sheet or clip, plus one real-time
      watch); the post's knob from the West landing platform and the Village platform. Rows: "Player-visible
      implementation": opus medium, high for tricky work; visual review by the main session.
- [ ] **4. The bot makes the choice (S; HOTBOX). After leg 3's step 7.** `dev/look/bots/railway-legs.ts`: on the
      segment `--from bay-mid` (A) or `--from bay-reached` (C), the bot walks to the post, brings the bay chip and
      installs Strong, then plays leg 3; a second run installs Quick. Verify: `npm run playthrough -- --from bay-mid
      --to canopy`, a pass verdict with the fit in its log (timings under load are not evidence). This is the
      checkpoint's "bot segment passes with a choice made". Row: "Owed proofs on a built branch" or the step 3 builder.

**Checkpoint (this step's few proofs, once, after step 4).** Two peers at the post (`dev/look` two-tab, `--real`): one
brings the bay line, both screens and both tables show it, and the other's install during the swap refuses with "The
table's busy". One fits Strong and both see a four-car `bay` train leave the West landing on its next departure, not
mid-run, and later standing at a leg 3 railhead with kit on its flatbed. Then `dev/sim/leg3-trade.ts` with the fit made
by accepted ops at `bay-mid` (the table's Strong row within a second of Checkpoint G's), `npm run test:net`, `npm run
perf` (two more copies, one flatbed per Strong train: reported, not a gate), one frame-time reading at the Roundhouse
on the Mac, and `npm run loop -- run` for one to three players.

<a id="order"></a>**Order.** Step 1 any time. Step 2 now: of leg 3's step 6 files it touches only
`railway-intents.ts`, where it adds lines and edits none of theirs. Step 3 after leg 3's step 6 is on main (it edits
`train-view.ts`, which step 6 changes for three bay trains), or rebased onto it, and after the owner's answer to
question 1. Step 4 after leg 3's step 7.

## The world bump

Needed: four new columns on checkpointed rows, a new op and a widened one, and `rail.install`'s revision meaning
change. **One bump, v67 or the next free number, in step 2's commit**, with a dated line. The boiler rows are already
in v66. Steps 1, 3 and 4 add seeds, views and bot code only, so they need no bump. [stack-west-platforms](stack-west-platforms.md)
still wants a reset; whichever ships first takes the number. Neither waits ("No bump waits"). Ship outside the owner's
sessions (`npm run heartbeat` first).

## Level findings

`npm run level-check` ran on 24 November (main `d6152420a`, v66): **22 reports.** "rotunda/home: ok; 7 bays (140°),
nearest running rail 7.12 m" as on 19 November. The West landing platforms stand, and the bay cut's frame 1 and rack 1
are "6.0 m apart". "track continuity: ok". The drawn-surface scan's 39 pairs new since its baseline are the ones leg 3's
step 5 already reported (report only). Its `[later]` kinks on unbuilt rows are not this plan's. The tool does not read
bay occupants, a consist's length against a platform, or a sightline, so the 19 November claims keep their own
proofs:

1. **Nothing is gated by an ability, and nothing is reached early.** The post stands at Home from arrival. A chip
   appears only from `tradeOpen`, and the server refuses a bring or install before it.
2. **The copies stand where the waiting engines stood** (bays 170°, 210°, 230°). Proof: step 3's seed replay and
   stills.
3. **A Strong train fits its platforms**: 17.2 m nose to flatbed tail, on Bell Rock's upper platform (on the eased
   curve since leg 3's step 5) and leg 3's heads as well as the West landing. Step 3's still at Bell Rock checks the
   curve.
4. **The cue is unproven at distance.** Under A the bay offer is met at the West landing (158 m from the post). Step
   3's still says whether the knob reads from there; bay 230°'s door is the second cue.
5. **Nobody is stranded.** A swap's flatbed leaves only at the depot with the train standing, and a local rider is set
   on the platform first. A held Strong train keeps its riders and yields to an assigned ask (leg 3's rule).

## Risks

- **Room safety.** All rules run inside the tick's apply. No effect in apply: moments and the copies' swap play from
  replicated changes. Integer ticks only. No new sim file.
- **Mixed builds.** Dev phase, so no compatibility code: v67 with its dated line, and fixtures regenerated in the same
  commit after the old-seed audit.
- **Lockstep.** A swap changes a standing train's row only, and the kit guard keeps the cargo bound. The swap fuzz is
  the proof. Re-read [lockstep](../agents/lockstep.md) before step 2.
- **Service.** A swap mid-run is the mixed-fleet case of the 23 November decision. Each Strong train adds holds at leg
  3's railheads, and they already yield to asks and followers. The fuzz runs the mixed-fleet checks for one circuit
  after each swap.
- **Hot files.** `railway-sys-steel.ts` (keep the trade branch small), `garage-view.ts` (1,297 lines),
  `train-view.ts` (1,455 lines; leg 3's step 6), `roundhouse-view.ts`, `railway-server.ts`.
- **The shared table.** As on 19 November.
- **Performance.** Up to two more instanced copies and one flatbed with stacks per Strong train. `npm run perf` at
  the checkpoint, reported; not a reason to cut without the owner's word.

## Open questions

Question 1 holds step 3 (the leg 3 plan sends it to the owner before the screen is built). Questions 2 and 3 proceed
on their recommendations. The 19 November questions 2 (the price: 1 steel a line, once) and 3 (steel for later lines)
stand unchanged and are not repeated here.

1. **Strong's window: A, B or C** ([the table](#strongs-window-what-checkpoint-g-measured-and-three-options))?
   **Recommended: A**, offering the bay line's trade from the bay cut's first lay. Strong then saves 13.5 s over Quick
   and 55.7 s over standard across leg 3, and nobody gets slower. It needs your word that the ten-second rule is read
   over the line being built: Quick saves 4.5 s a ride for the minutes until the cut's last lay, then 10.5 s, then
   about 22 s with leg 3.
2. **The third readout: "Kit a trip" (1 → 2 sections) instead of "resources a minute"?** Your 10 November readouts are
   speed, cars and resources a minute. **Recommended: yes, a trip count on these lines**, with "Nothing to build"
   when no leg on the line has two sections to load. A per-minute rate would show Strong carrying twice as much while
   it saves 13.5 s.
3. **Strong on `ns`: offer it though it is never felt there?** **Recommended: yes, as decided** (both rows at one
   price), with the readout saying "Nothing to build". On `ns` the screen then shows that Quick is the pick. A
   multi-section `ns` leg gives Strong its other side later.

**Suspect lines of The Boogler's:** none written, changed or read as suspect. Placeholder UI strings for the owner:
"Swap", "Kit a trip", "Nothing to build", "Kit flatbed", the chips' catalog names ("Line 2", "North–south line", "Bay
line"). Retired placeholders: "Nothing to haul yet", "Cargo car". The Boiler tile's "The first install. It woke the
trains." is line 2's and is not shown on a trade line.

## Design review (2026-11-19)

_Kept as written on 19 November. Replaced on 24 November ([review](#design-review-2026-11-24)): call 11's bay half (the offer moment, under option A), call 18's strings "Cargo car" and "Nothing to haul yet", call 20 (by the [19 November call](../decisions-rewards.md#d-2026-11-19-garage-step4-waits-for-leg3): Strong is the hold) and call 21 (the third readout). Finding 2 is replaced by the hold; its open question 1 by question 1 of 24 November._

The planner's own review, in the same sitting (owner call "Fold roles into the builder", 16 November). Reread the plan
from the top before sorting the calls. **Read:** as listed under "Read for this", plus docs/agent-calls.md's core-loop
and rail tables and the 16 November coach answer. **Seen:** the seeds' steel and fits, `trainLegTicks` on the built
halts, the level report, the code each call depends on. **Not seen:** any still; the copies, the flatbed, the chips
and the cue at distance are judged from numbers and the existing stills of garage steps 2 and 3, which is why step 3
lists its stills.

**Flow, beat to beat** (progression-flow-layout's three firm rules):

- *The next goal can be found.* At the incline's last lay the next goal is the bay cut at Home (leg 2's board says
  so); the trade is optional, met on the way home at the Village (the knob, 21 m) or at the Roundhouse. The bay
  line's trade is met coming off the bay train, 28 s from the post. Neither blocks the route.
- *A gate keeps its meaning.* The trade opens on the leg's last lay; nothing skips it.
- *Nobody is stranded.* Swaps are free and unlimited; a wrong pick costs a walk. Steel cannot be lost; at 1 a line the
  pool covers both lines in every room that has lit the works.
- *Lenses.* "An upgrade repays an inconvenience already felt": each offer comes as its line is first ridden end to end.
  "Ending a beat facing the next": at `bay-reached` the room faces Home, and the post is the first thing past it.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Quick boiler 25 m/s with the same cars, Strong boiler 20 m/s with one whole extra car; the names | Decided | [15 November garage trade answers](../decisions-core-loop.md#d-2026-11-15-garage-trade-answers) |
| 2 | Both rows one price, paid once; swaps free and unlimited at the Roundhouse with the line's copy on the table; effect at the line's next depot departure | Decided | same entry |
| 3 | No one-swap-a-stage limit is built | Decided | same entry ("only if rooms flip for every bill") |
| 4 | Line 2 keeps the Big boiler; no trade there | Decided | same entry |
| 5 | Chosen at a Roundhouse, taken at the line's own end | Decided | [10 November big junctions](../decisions-rail.md#d-2026-11-10-big-junctions-are-designed-stations-not) |
| 6 | Readouts are speed, cars and resources a minute; no trip times | Decided | [10 November plain readouts](../decisions-core-loop.md#d-2026-11-10-the-train-upgrade-screen-install-plain) |
| 7 | Strong's car is cargo, not a coach; four player seats unchanged | Decided | [16 November coach answer](../decisions-rail.md#d-2026-11-16-rider-coach-a-and-rework) |
| 8 | Step 4 does not own a full load; nothing fills Strong's car | Decided | [18 November, G7](../decisions-rewards.md#d-2026-11-18-decisions-page-rewards) |
| 9 | Each fitted line keeps its own bay; a bay is never bought; one pool pays | Decided | [15 November garage choices](../decisions-core-loop.md#d-2026-11-15-garage-choices) (1), (2) |
| 10 | A speed part only where it saves about ten seconds a trip | Decided | 10 November ([garage-choices](garage-choices.md) "Binding") |
| 11 | **Each line's trade is offered at its leg's last lay** (`ns` at `bell-reached`, `bay` at `bay-reached`); chips appear one at a time | Default | Call 10 passes only the whole line (9.8 s, 10.5 s; a section alone 4.1 s, 4.5 s) |
| 12 | Copies: line 2 in 170°, `ns` in 210°, `bay` in 230°, door open, the line's colour on a plate | Default | garage-choices section 4's table |
| 13 | Quick wears the longer boiler's chimney; Strong a flatbed behind the kit car; line 2's platform beat plays at each line's depot on any change of row, the flatbed coupling as the steel car does; a local rider on a leaving flatbed set on the platform first; no new sound | Default | Greybox: existing models and the existing beat |
| 14 | The hold: no install or bring within 6 s of a bring or 5 s of an install | Default | Keeps one shared table from turning under a moment |
| 15 | Chips above the categories; the screen's own navigation; dimmed with "The table's busy" | Default | No new control; existing string |
| 16 | The post's orange knob lights for any line's Ready part; no objective line or sign | Default | The existing cue; the trade is optional |
| 17 | Stages 3a and 3b move to the plans that make their facts | Default | Neither fact exists in the game |
| 18 | Placeholders "Swap", "Cargo car", "Nothing to haul yet"; chips by catalog name | Default | Copy for the owner |
| 19 | **The trade costs 1 steel a line, once (was 6)** | **New** | Finding 1; open question 2 |
| 20 | **Strong's flatbed runs empty on `ns` and `bay` until a freight rule fills it** | **New** | Finding 2; open question 1 |
| 21 | **A trade line's third readout counts what the line loads, so it reads "Nothing to haul yet" rather than a capacity a minute** | **New** | Finding 2; DESIGN 11 over line 2's capacity-style row |

**Counts:** 10 Decided, 8 Default, 3 New. Every Default and New call is logged in
[agent-calls](../agent-calls.md#core-loop-pacing-and-progression).

### Findings

1. **(changed the price and step 1) At 6 steel the trade never opens in a room that bought stage 3.** Measured above:
   12 cast in all, 10 spent by the cradle and the Big boiler, nothing casts more, and the 2D page's 1 steel a minute is
   not built. That is the "wait to afford" loop roundhouse-trains warns against, except with no end. Call 19 sets 1
   steel a line; question 2.
2. **(changed the readouts) Strong pays nothing in the greybox.** One train carries a section's whole kit, the next
   section's rack does not exist until this one is laid, and the new lines have no freight. The rebalance's
   Quick/Quick/Strong split was computed against stand-in footing bills (Bell 44 footings) that the greybox replaced
   with kit ("1,024, no footings"), so it does not describe the built route. A capacity readout would show Strong
   carrying more and the room would see nothing change: the screen would lie (DESIGN 11). Calls 20 and 21; step 1
   refreshes the page with the built bills; question 1.
3. **(no change) The ten-second rule is only just met on `ns`** (9.8 s nonstop on the built 1,120 m; the rebalance's
   10.2 s used the row's 1,156 m before the Gorge stop moved to s 36). "About ten seconds" passes; if the owner reads
   the rule strictly, `ns` gets no Quick row, and the trade there is Strong against standard. Noted, not asked.
4. **(added stills) The `ns` fit is rarely felt, and its cue is untested.** The `ns` offer comes as the solo player
   leaves Bell Rock the long way, past High Gorge (the depot) before they reach the post; after the bay cut, `ns` is
   rarely ridden. That is the line's character. The bay line carries the loop (fit, 28 s walk, ride). Whether the
   knob reads from the Village platform and the West landing is unproven: step 3's two stills.
5. **(no change) Co-op.** One room's table: a bring turns it for both, and a hold in flight refuses with a reason.
   A pair split at Bell Rock (leg 2's beat 7) can fit `ns` from Home while the other takes the seeds. A friend arriving
   late sees the chips and the copies in their bays; the bay line's next train shows the room's pick.
6. **(changed step 3's scope) Stages 3a and 3b had no reachable fact**; moved out (call 17).

### Owner questions

The plan's three open questions of 19 November, each recommended; none held a step. Its questions 2 and 3 stand; question 1 is replaced by the [current list](#open-questions).

## Design review (2026-11-24)

The planner's own review of the re-plan, in the same sitting (owner call "Fold roles into the builder"). I reread the
plan from the top before sorting the calls. **Read:** as listed under "Read for this", plus docs/agent-calls.md's
core-loop table and the archived "kit runs ahead" rows. **Seen:** Checkpoint G's table; `dev/sim/leg3-trade.ts` on main
(the solo `bay-reached` rows reproduced to the tick); two scratch variants of the rules, reverted before writing
(the kit ahead limited to one section of leg 3: no change; leg 3's kit gated on the Canopy barrier: option B's
figures); a scratch print of the `bay-mid` rows counted from the fit; the code each call depends on; the level report
of 24 November. **Not seen:** any still. The flatbed's stacks, the chips, the knob from the West landing and a Strong
train on Bell Rock's curve are judged from numbers and earlier stills, which is why step 3 lists its stills.

**Flow, beat to beat** (progression-flow-layout's three firm rules), on option A:

- *The next goal can be found.* At `bay-mid` the next goal is section 2's frame at head 1, and the bay train brings its
  kit. The trade is optional, 28 s off that path at the post, and the knob and bay 230°'s door cue it. Under C the
  offer comes at Bell Rock, 2 km from the post, as the Canopy barrier opens beside the room: the room faces the next
  goal and has its back to the choice.
- *A gate keeps its meaning.* `tradeOpen` is the server's; nothing skips the bay cut's first lay.
- *Nobody is stranded.* Swaps are free and unlimited, and a wrong pick costs a walk. The kit guard on adoption means a
  swap never strands or loses a unit aboard. A room with an empty pool reads "STEEL 0/1" (as on 19 November).
- *Lenses.* "An upgrade repays an inconvenience already felt": A offers the trade the moment the room first waits for
  kit, which upgrade-economy rec 2 asks for. "Ending a beat facing the next": unchanged.

**Solo and co-op.** The trade table gives a pair exactly the solo figures, so a second feeder neither adds to nor takes
from the choice. Under C only a pair who split before the last lay can make Strong pay, and that is a coordination
puzzle the game never teaches. Under A, solo and pair rooms get the same 13.5 s. A friend arriving late sees the
chips, the copies, and the held train with kit on its flatbed.

### Calls

<a id="calls-2026-11-24"></a>

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Quick boiler 25 m/s with the same cars, Strong boiler 20 m/s with one whole extra car; the names | Decided | [15 November trade answers](../decisions-core-loop.md#d-2026-11-15-garage-trade-answers) |
| 2 | One price, paid once; swaps free and unlimited at the Roundhouse with the line's copy on the table; effect at the line's next depot departure | Decided | same entry |
| 3 | Chosen at a Roundhouse, taken at the line's own end | Decided | [10 November big junctions](../decisions-rail.md#d-2026-11-10-big-junctions-are-designed-stations-not) |
| 4 | Strong is leg 3's two-section hold, yielding to an assigned ask or a follower at its approach signal | Decided | [19 November call](../decisions-rewards.md#d-2026-11-19-garage-step4-waits-for-leg3); [23 November service](../decisions-rail.md#d-2026-11-23-greybox-service-health) |
| 5 | The swap fuzz uses the 23 November service gate, with the mixed-fleet checks for one circuit after each swap | Decided | [23 November service](../decisions-rail.md#d-2026-11-23-greybox-service-health) |
| 6 | Readouts show speed and cars; no trip times | Decided | [10 November plain readouts](../decisions-core-loop.md#d-2026-11-10-the-train-upgrade-screen-install-plain) |
| 7 | Line 2 keeps the Big boiler; no trade there | Decided | [15 November trade answers](../decisions-core-loop.md#d-2026-11-15-garage-trade-answers) |
| 8 | **The bay line's trade opens at the bay cut's first lay (`TRADE_OPENS.bay = 1`), not its last** | **New** (needs his word on the ten-second reading) | Finding 1; question 1. Strong +13.5 s over Quick across leg 3, against −17.9 s at the last lay |
| 9 | The `ns` trade opens at the incline's last lay | Default | 19 November call 11, unchanged for `ns` |
| 10 | A train keeps its row at halt 0 while its leg kit aboard is more than the new row carries | Default | Finding 3: the cargo bound holds and no unit goes home |
| 11 | **A trade line's third readout is "Kit a trip" (Quick 1 → 1, Strong 1 → 2 sections), or "Nothing to build" when no built leg the line carries kit for has two sections still to lay** | **New** (needs his word: the decided form is "resources a minute") | Finding 2; question 2 |
| 12 | Strong is offered on `ns`, where it is never felt yet, with the readout saying so | Default | Decided both-rows trade; question 3 |
| 13 | Strong's flatbed shows the second bill's logs and rails; the held train is the hold's cue, with no copy | Default | Finding 4; leg 3's "the train standing at the railhead with its kit car loaded is the cue" |
| 14 | The table's hold: 6 s after a bring (`BRING_TICKS`), 5 s after an install (the existing `WORKS.upgradeTicks`) | Default | 19 November call 14; same values, one constant reused |
| 15 | The trade costs 1 steel a line, once | New | 19 November call 19 and its question 2, still open; unchanged |
| 16 | Placeholders "Kit a trip", "Nothing to build", "Kit flatbed" (retiring "Nothing to haul yet" and "Cargo car") | Default | Copy for the owner |

**Counts:** 7 Decided, 6 Default, 3 New. Calls 8, 10, 11, 12, 13 and 16 are logged in
[agent-calls](../agent-calls.md#core-loop-pacing-and-progression) on 24 November. Calls 9, 14 and 15 are already logged
(19 November calls 11, 14 and 19). The 19 November rows for calls 20 and 21 stay open there for the owner; the call 11 row of 24 November says it replaces them.

### Findings

<a id="findings-2026-11-24"></a>

1. **(changed the offer moment, step 2's `TRADE_OPENS`, step 3's seed, question 1) Offered at `bay-reached`, Strong
   is a trap for a solo room.** It is 17.9 s slower than Quick on average, because its window closes within 7.5 s of
   the last lay, while the room stands 2 km from the post. A screen that offers it there with a "two sections" readout
   would promise what the room never sees (DESIGN 11). Option A moves the offer to the first lay, where the room
   stands 28 s from the post and has just met the wait Strong answers.
2. **(changed the readout) Strong's gain is 13.5 s across a leg, and nothing after it.** That is above the ten-second
   floor but below the 30 s of the 19 November arithmetic. A per-minute rate would show Strong doubling its haul, so
   the third row counts kit a trip and says "Nothing to build" once there is nothing to build. With the free swap, the
   screen shows the choice as it plays: Strong while the bay line builds, Quick after.
3. **(added a rule and a test to step 2) A swap back can meet a Strong train carrying two bills.** A Strong train that
   yields early carries its second bill round the circuit (leg 3's yields, 23 November). Adopting Quick at the West
   landing with that aboard breaks leg 3's cargo bound. The train therefore keeps Strong until its kit fits, and step
   2 tests it.
4. **(added to step 3) The hold needs to be seen.** Leg 3 left the hold without copy, with the loaded train as its cue.
   On a train whose second bill rides on a bare flatbed, nothing would show. The flatbed draws its stacks, and step 3's
   still at Bell Rock checks it.
5. **(changed step 2's proof) The service gate moved under the plan.** The 1,350 and 1,600 tick bounds are replaced
   for the greybox by the 23 November decision. A swap mid-run is its mixed-fleet case.
6. **(added step 4) The checkpoint's third condition had no step.** The backlog's "bot segment passes with a choice
   made" needs the bot to fit a row. Step 4 does it after leg 3's step 7.
7. **(no change) Strong on `ns` is never felt.** The causeway is one section and unbuilt. The 15 November answer offers
   both rows at one price and asks that neither row win on every line. Across the two lines that holds (Strong on the
   bay while building, Quick elsewhere), but on `ns` alone Quick always wins. The readout says so; question 3.

### Owner questions

The plan's [open questions](#open-questions) 1 to 3. Question 1 holds step 3; 2 and 3 proceed on their recommendations.
