> **Status, 19 November 2026: plan, not built.** Planner, against main `6c46e3854` (world v62). Step 4 of
> [garage-choices](garage-choices.md) (section 7's row 4), corrected for [greybox leg 2](greybox-leg2.md#what-garage-step-4-waits-for)
> as built (#2270, v62). Design review [at the end](#design-review-2026-11-19). Three [open questions](#open-questions),
> each with a recommendation; none adds scope, so each proceeds on it.

# Garage step 4: the per-line Quick or Strong trade, line chips and works copies

**Why a file of its own.** garage-choices is 78 KB and keeps each built step's as-built notes; step 4 now carries two
corrections from the leg 2 plan and three from measuring main, which touch its sections 0, 2, 3, 4 and 7. Leg 2 set
the convention of a plan per leg. garage-choices' step 4 row points here; its other steps are unchanged.

**Goal.** From the moment a new line is laid to its first destination, the room can fit it at Home's Roundhouse with
one of two boilers, **Quick boiler** (25 m/s, the same cars) or **Strong boiler** (20 m/s, one more car), pay once and
swap freely; the line's trains take the fit at their own depot. The garage screen gains a chip per fitted line, and
each line's works copy waits in its own bay. Serves DESIGN.md **6. Communal world** (one room's railway, configured by
anyone), **7. Telegraph everything** (the copy in its bay, the chip, the car at the platform) and **11. Show, don't
tell** (the train you chose is the train that arrives). It bends nothing; [finding 2](#findings) is where 11 is at
risk, and the plan keeps the screen true there.

**Read for this.** AGENTS.md; `npm run map -- --kind feature-fix` (no `plan` kind exists); DESIGN.md; owner-calls'
index; the core-loop, rail and rewards Current rules with the entries cited below; docs/direction.md (phase 1, focus
"choice and payoff", 16 November); the newest docs/playtests.md entries (14 November: the garage "looks cool"; Grant:
"running errands with no real decisions"); garage-choices in full; [garage-line-trade](../brainstorms/garage-line-trade.md);
[garage-trade-rebalance](../brainstorms/garage-trade-rebalance.md); greybox-leg2 in full; greybox-route section 1 ("The
bill: no hand-carried footings"); [shared-pool](shared-pool.md) section 2; the 2D page
[garage-choices.html](../world/garage-choices.html) (its steel model). Code: `src/sim/railway-sys-steel.ts`
(`install`, `boilerAdopt`), `railway-train.ts` (`BOILER`), `railway-components.ts` (`Line`, `Shed`),
`railway-works-layout.ts` (`INSTALL_STEEL`, `installRevision`, `SHED_TABLE`, `STEEL` in `railway-ring-layout.ts`),
`railway-sys-trains.ts` (the stand, line 230), `railway-lines.ts` (`builtLine`, `TRAIN_EXTENT`), `railway-route.ts`
(`SPECS`), `railway-seed-legs.ts`, `src/world/railway-server.ts` (admission), `src/adapters/railway-intents.ts`,
`src/entities/railway/garage-{data,state,view}.ts`, `cars.ts`, `train-view.ts` (`carsOf`, the scale-in),
`roundhouse-view.ts`, `rotunda-stage.ts`, `src/place/rotunda.ts` (`bayOccupants`), `src/features/garage.ts`.
Pattern followed: garage step 3 (`rail.install` parts 3 and 4, a shared revision, a price from one table) and the
wagon's table roll-out (`Shed.ready`, `rail.turn`).

**Research.** [roundhouse-management](../research/roundhouse-management.md) ("one small configuration choice per line",
reversible): used, this is that choice. [upgrade-economy](../research/upgrade-economy.md) rec 2 (an upgrade repays an
inconvenience already felt): used for the timing, each offer comes as its line is first ridden end to end.
[roundhouse-trains](../research/roundhouse-trains.md) ("not an intended wait-to-afford-upgrades loop"): used, and it is
why the price falls ([finding 1](#findings)). Not a port from Place.

**The rail route as it stands.** `npm run loop`'s built graph ends at `install`; `gorge` and `bell` are still
stand-ins in the loop (leg 2's step 5 adds their nodes). Built bills past High Gorge are greybox kit: **20 logs + 20
rails a section, no footings and no steel on any leg** (`railway-route.ts` `SPECS`, every `bill: BILL`).

**In flight** (`npm run inflight`, 19 November): `claude/forge-rack-move` (`dev/look/bots/railway.ts`, not edited
here). Claimed on main's heartbeat: greybox leg 2's views (#2273: `leg-view.ts`, `halts-view.ts`, `train-view.ts`,
`railway-read.ts`, `railway-intents.ts`), which overlaps this plan's step 3 in `train-view.ts` and
`railway-intents.ts`; see [Risks](#risks).

## What changed since garage-choices was written

Measured on main `6c46e3854` with two scratch scripts over the sim's own `buildSeedWorld` and `trainLegTicks` (not
kept; numbers below).

1. **The lines arrive one at a time, not together** (leg 2, call 8). The bay cut opens when the incline is laid. So
   there is no single "stage 4" moment: each line's trade is offered on its own beat (below), and the chips appear one
   at a time.
2. **Each line's depot is its home halt, not Home's Roundhouse.** `ns` runs High Gorge (halt 0) to Bell Rock; `bay`
   runs the West landing (halt 0) to Bell Rock. Trains join, turn and stand there. `boilerAdopt` already runs for any
   train standing at its line's halt 0 (`railway-sys-trains.ts:230`), so "its next depot departure" is High Gorge for
   `ns` and the West landing for `bay`, with no new place to install. You still choose at Home's Roundhouse (decided,
   10 November); the train takes it at its own end.
3. **The works casts 12 steel in all, and stage 3 can spend 10.** `STEEL.total = 12`; the Bigger cradle is 4 and the
   Big boiler 6. A room that bought both has a pool of 2 forever; nothing casts more (the 2D page's 1 steel a minute
   is its own stand-in: "No future steel-production rule exists"). At 6 steel a line, the trade would read
   "STEEL 2/6" and never open. A room can also reach stage 4 with no steel at all: the stack leg opens on the rivet
   (`after: -1`, `Aperture.joined`), not on the works. The leg seeds show it: `gorge-reached` through `bay-reached`
   hold landed 0, spent 0.
4. **The greybox carries nothing a second car could take.** One train brings a whole section's kit in one trip
   (greybox-route, "The bill"), a section's rack exists only once the section before is laid, and the new lines have
   no towns, riders or freight. A Strong train's extra car runs empty on `ns` and `bay`. The owner already put full
   loads in the future-line freight brief ([18 November, G7](../decisions-rewards.md#d-2026-11-18-decisions-page-rewards)),
   so this plan builds the car and does not fill it.
5. **The ten-second rule is met only on the whole line, and only just on `ns`.** Nonstop, rest to rest, from the
   built halts: `ns` High Gorge to Bell Rock 1,120 m, 618 ticks at 20 m/s and 520 at 25 (**9.8 s**); `bay` West
   landing to Bell Rock 1,197 m, 656 and 551 (**10.5 s**). A first section alone saves 4.1 s (`ns`) and 4.5 s (`bay`).
   "About ten seconds" passes both whole lines and neither half.

## Design

### Where, when, and what the player sees

| | North–south line (`ns`) | Bay line (`bay`) |
| --- | --- | --- |
| **Offered** | The incline's last lay (seed `bell-reached`): the whole line runs, the rule passes | The bay cut's last lay (seed `bay-reached`) |
| **Where the room is then** (solo) | Bell Rock's lower deck, about to take the seeds and ride home the long way: `ns` to High Gorge, line 2 to the Village (about 6 to 7 min) | Bell Rock's upper platform; Home is about a minute away by the bay line |
| **First sight of it** | At the Village platform, 21 m from the post: the post's knob turns orange; bay 210°'s door opens on the `ns` copy | Off the bay train at the West landing, 158 m (about 28 s on foot) from the post: the same knob and bay 230°'s copy |
| **Where it is chosen** | Home's Roundhouse, at the garage post (`SHED_TABLE`), the `ns` chip brought to the table | the same, the `bay` chip |
| **Where it takes effect** | The next `ns` train standing at High Gorge | The next `bay` train standing at the West landing |
| **Gap between the two offers** | | About 10 min solo by leg 2's beat table (beats 7 to 10); 1,904 ticks in the seeds, which skip travel. The leg 2 plan's "15 to 20 minutes" is between the lines arriving; neither figure is measured, and leg 2's checkpoint measures the beats |

So the screen grows in two steps: from `bell-reached` the chips read **Line 2 · North–south line**, from
`bay-reached` **Line 2 · North–south line · Bay line** (catalog names, placeholders). Before `bell-reached` the screen
is line 2's, as today, with no chip row.

**The loop, per line.** The bay line is the trade's home ground: its depot is 28 s from the post, so a room can fit,
walk to the West landing and ride the train it chose. The `ns` line is chosen once and rarely felt: once the bay cut is
laid, `ns` is the long way to Bell Rock. That is the line's character, not a bug ([finding 4](#findings)).

**What the player sees at the depot.** On adoption the standing train plays line 2's existing **platform beat**
(`train-view.ts`: steam covers the swap, a clank, a short squash, a toot; place.md, "Production boiler, trains and the
pier"), now at its own depot and on any change of row, not only a faster one. A Quick train comes out of the steam
wearing the longer boiler's chimney (the existing model; art direction later). A Strong train's flatbed couples behind
its kit car exactly as line 2's steel car does in the same beat (steam at the tail, its own clank after the engine's).
A swap back from Strong plays the beat with the flatbed gone when the steam clears; a local player standing on it is
first set on the halt's platform (the bay doors' before-enable pattern, garage step 2's follow-up). A restore, a late
join and reduced motion get no beat, as today. No new sound.

### The rules

- **Two boiler rows**, appended: `BOILER[4]` Quick `{ speed: 250, accel: 3.5, brake: 3.5 }` and `BOILER[5]` Strong
  `{ speed: 200, accel: 3.5, brake: 3.5 }` (the new lines' own kin, so Strong changes nothing but the car). A row's
  cars are a pure fact: `boilerCars(row)` is 1 for Strong, else 0. `TRADE_LINES` = the `ns` and `bay` line indices;
  `tradeLeg(line)` = that line's first leg (`incline`, `bay-cut`).
- **Install parts 5 (Quick) and 6 (Strong)** on `rail.install { line, part, revision }`, for a trade line only:
  - refused unless `legDone(w, tradeLeg(line))`, `Shed.tableLine === line`, `revision === Line.rev`, the part's row is
    not the line's current row, the table is not busy (the roll-out rule, as today), and the [hold](#the-hold) is over;
  - **the first fit on a line costs `TRADE_STEEL = 1`** from the pool (`upgradePool >= 1`, `spendUpgrade(w, 1)`);
    a line already wearing row 4 or 5 swaps for nothing, any number of times (decided: "once paid, swaps are free").
    `INSTALL_STEEL` gains `5: 1, 6: 1`; the "already paid" branch is the one place the rule reads state, and the screen
    shows "Swap" there, so the part has one price ([open question 2](#open-questions));
  - accepted: `Line.boiler = row`, `Line.fitted = tick`, `Line.rev += 1`.
  - Line 2's parts 1 to 4 keep every rule they have, plus `Shed.tableLine === LINE2` (part 1 comes before any chip, and
    `tableLine` starts at line 2).
- **One revision per line, `Line.rev`** (new `int`, +1 on every accepted install of that line). Today's
  `installRevision = boiler + cradle` cannot fence a swap (Quick, Strong, Quick repeats a sum). On line 2, `rev` equals
  `boiler + cradle` at every accepted step (part 1 makes both 1, each later part adds 1 to each side); the invariant
  checker holds it to that, so line 2's behaviour is provably unchanged. The admission bound becomes
  `railInt(e.revision, RAILWAY_MAX_INT)` and an install refuses at `rev >= RAILWAY_MAX_INT`, as `rail.turn` does.
- **Adoption**: `boilerAdopt` becomes "a train standing at its line's halt 0 takes its line's row when it differs"
  (`!==`, not `<`), so a swap back adopts. Never in flight: a running leg keeps its row and kin. On line 2 the fit only
  rises, so the change is a no-op there (the existing install tests hold it).
- <a id="the-bring"></a>**`rail.bring { line, revision }`** (new op, the `rail.turn` family, in
  `railway-sys-works.ts`): judged at `SHED_TABLE`'s reach; refused unless `line` is line 2 or a trade line whose leg is
  done, `line !== Shed.tableLine`, `revision === Shed.bringRev`, the table is not busy, and the hold is over. Accepted:
  `Shed.tableLine = line`, `Shed.bringRev += 1`, `Shed.brought = tick`. Two brings on one tick: the second is stale.
- <a id="the-hold"></a>**The hold.** No install or bring is accepted before `max(Shed.brought + BRING_TICKS,
  max over lines of Line.fitted + MOMENT_TICKS)`: `BRING_TICKS = 60` (the copies' swap, 6 s) and `MOMENT_TICKS = 50`
  (the install moment's 4.8 s `MOMENT.rest`, rounded up; the same 50 the 20 m/s upgrade already reserves). This keeps
  the shared table from turning under someone's moment. Stand-ins.
- **The consist**: no sim rule reads cars. `TRAIN_EXTENT.behindCm` (16.1 m, line 2's coach train with its steel car)
  already covers a Strong train: players' car at 0, kit car at −3.7 m, the flatbed at −7.4 m, its tail at −9.0 m
  (`cars.ts` spacing). The block rule, `sepCm` and the end blocks are unchanged.
- **Loading**: unchanged. "One kit a train" stands; nothing loads the flatbed (G7).

### Sync kinds and authority

| Piece | Kind | Authority | Where |
| --- | --- | --- | --- |
| Each line's row (`Line.boiler`), its revision (`Line.rev`, new) and install tick (`Line.fitted`) | Server | server | `railway-components.ts` `Line`; `railway-sys-steel.ts` `install` |
| The copy on the table (`Shed.tableLine: u8`, new, default line 2), `Shed.bringRev: int` and `Shed.brought: int` (new, −1) | Server | server | `Shed`; `railway-sys-works.ts` `bring` |
| A train's row (`Train.boiler`), adopted at its line's halt 0 | Server | server | `boilerAdopt` |
| The steel spent (`Shed.spent`) | Server | server | as step 3 |
| Chips, the selected tile, the bring and install animations, bay occupants and doors, the flatbed, the copy's look | Local, from accepted rows | each tab | `garage-*.ts`, `src/features/garage.ts`, `rotunda-stage.ts`, `train-view.ts`, `cars.ts` |

No client lead, no classic edit generator, no client state registration, no `src/world/rules/` file, no presence
field, no message. **Rule ticks** stay the room's (`railTick`; adoption is inside the stand). **Saves:** the four new
fields are columns of existing checkpointed rows (`Line`, `Shed`); nothing transient. **Ops:** `rail.bring` new;
`rail.install` widened (parts 5 and 6, any trade line, the new revision bound). **Admission**
(`railway-server.ts`): `rail.install` accepts `line` of line 2 with parts 1 to 4 or a trade line with parts 5 and 6;
`rail.bring` takes `railInt(e.line, RAIL_LINES.length - 1)`, `railInt(e.revision, RAILWAY_MAX_INT)` and `at(SHED_TABLE)`.
**Prediction:** none; both ops wait for the receipt, as `rail.install` and `rail.turn` do. **Receipts:** an accepted
install plays its moment from the replicated `Line` change (as today); an accepted bring plays the copies' swap from
the replicated `Shed.tableLine`. A refusal shows its reason on the screen: the existing "The table's busy" for the hold
and the roll-out; "Not enough steel" style bills as today ("STEEL 0/1").

**Invariants** (`railway-check-steel.ts` or a new `railway-check-garage.ts`): line 1 rows in {0, 1}; line 2 rows in
{0 to 3} and `rev === boiler + cradle`; trade lines rows in {0, 4, 5}; `cradle` 0 on trade lines; every train's row
is one its line allows; `tableLine` is line 2 or a trade line whose leg is done; spent steel equals line 2's fits plus
`TRADE_STEEL` for each trade line not on row 0 (extending step 3's `fittedSteel` sum).

### The garage screen

- **Chips**: a row above the category rail, one per fitted line (line 2 always; a trade line once its leg is laid),
  the line on the table lit. Clicking, tapping or Interact on a chip sends `rail.bring`; while the hold or the roll-out
  runs the chips are dimmed and say "The table's busy" (existing string). Keys and pad: the screen's own navigation
  (up from the categories reaches the chips, left/right steps them). **No new action, pad slot, key or touch button**;
  the builder confirms against `freeSlots()`.
- **A trade line's Engine tab** shows two tiles side by side, Quick boiler and Strong boiler (decided names). Unpaid:
  both read the bill "STEEL n/1", or Ready. Paid: the fitted row reads Installed, the other "Swap" (placeholder pill,
  a new `Standing` `'swap'`), and a swap is the same Medium hold.
- **Readouts** (decided: speed, cars, resources a minute; no trip time). Quick: top speed 20 → 25 m/s; cars it pulls
  2 → 2. Strong: 20 → 20 m/s; cars 2 → 3. The third row counts what the line's trains actually load: on `ns` and `bay`
  that is nothing once their leg is laid, so it is a text row, **"Nothing to haul yet"** (placeholder), for both tiles,
  until a freight rule gives the line a load ([open question 1](#open-questions)). Cars tab: seats (4). Cargo tab: kit
  car Installed; "Cargo car" (placeholder) Installed on Strong, Later otherwise. Looks and Whistle as line 2's.
- `MOMENT_FROM` for parts 5 and 6: the line's current row (standard → Quick or Strong; Quick ↔ Strong).

### The bays

`bayOccupants(site, { serving, copies })` gains the copies: every fitted line whose copy is not on the table stands in
its bay, door open: **line 2 at 170°, `ns` at 210°, `bay` at 230°** (garage-choices section 4). The waiting engines
have all left those roads by the stack leg's first section (`gorge-mid`, serving 6), well before `bell-reached`, so a
copy never meets a tarp; the pure function asserts it. Each copy door gets its line's colour on a plate over it
(greybox). A copy wears its line's row (Quick's chimney, Strong's flatbed behind it on the stall road). The copies
reuse the waiting engine's prefab record without its tarp and keep step 2's before-enable overlap guard.

**Moved out of step 4: stages 3a and 3b.** Bay 130° rises with the cave line and bay 250° with High Port's faster
engine; neither fact exists in the game, so the stage rule would be code no room can reach. Each moves to the plan that
makes its fact (the cave leg's rules plan; Port Quay's station plan, which is step 5).

## Steps

Each step leaves `node dev/ship-check.ts` green. Model rows from `npm run models` (19 November). Steps 2 and 3 ship
separately; 3 after 2.

- [ ] **1. The 2D page, refreshed to the built route (S; docs).** `docs/world/garage-choices.html`: the trade tab's
      default bills become the greybox's (kit sections, no footings, no steel on any leg), the trade price 1, the
      steel supply after 12 set to 0 by default (the built Works), and a line per new line saying what Strong's car
      carries today (nothing) and what the freight brief would change. Keep the old 10/20-footing figures as an
      alternative input, labelled. Verify: open the page, read the totals back from the DOM; one still. Row:
      "Fixes, tooling and captures-driven tasks": Codex gpt-6.2-sol medium.
- [ ] **2. The rules and the bump (L; review).** `src/sim/railway-train.ts`: rows 4 and 5, `BOILER_MAX`,
      `boilerCars`, `TRADE_ROWS`. `src/sim/railway-components.ts`: `Line.rev`, `Shed.tableLine`, `Shed.bringRev`,
      `Shed.brought`. `src/sim/railway-works-layout.ts`: `INSTALL_STEEL` 5 and 6, `TRADE_STEEL`, `BRING_TICKS`,
      `MOMENT_TICKS`, `installRevision` → `Line.rev`. `src/sim/railway-lines.ts` or `railway-route.ts`: `TRADE_LINES`,
      `tradeLeg`. `src/sim/railway-sys-steel.ts`: `install` widened, `boilerAdopt`'s `!==`, the hold.
      `src/sim/railway-sys-works.ts`: `bring` (registered beside `rail.turn`). The checker rows above.
      `src/world/railway-server.ts`: the op list and both admissions. `src/adapters/railway-intents.ts`: the event shape,
      its sanitizer, `bringLine(line, revision)` and `installPart(line, part, revision)`. `src/world/namespace.ts`:
      v63 and a dated line. Fixtures regenerated after the audit garage step 3 used (compare old seeds before
      regenerating; every old column identical, the new columns zero or line 2). A new sim file goes in
      `server/Dockerfile`, `dev/server-build.ts` and deploy-server.yml (`test/server-image.test.ts`).
      Verify, `test/railway-install.test.ts` (pure, lockstep):
      refusals for a trade part on line 2, a line 2 part on a trade line, before the leg is laid, with another copy on
      the table, a stale revision, the current row again, an empty pool, during the hold and during the roll-out; the
      first fit spends 1 and a swap 0, ten swaps in a row accepted; a fit adopts only standing at the line's halt 0 and
      never in flight, and a swap back adopts; Strong's kin equals the line's standard kin; two holds on one tick fit
      once; line 2's `rev === boiler + cradle` across its whole install order. `rail.bring`: refusals (unfitted line,
      already on the table, stale revision, busy table, the hold), two on one tick bring once. The mixed-fleet fuzz
      (the file's existing method) on `ns` and `bay` from `bay-reached`: standard with Quick, Quick with Strong, under
      random lever asks and restores, block rule and every invariant held, and leg 2's wait bounds (1,350 settled,
      1,600 growing). `server/test/railway-steel-host.test.ts`: a trade install and a bring across `r:edit` and a host
      restart (the state comes back, the moment does not replay). `npm run loop -- run`. Row: "High-risk
      implementation": Codex gpt-6.2-astra medium (high for tricky work), then the independent review row.
- [ ] **3. Seeds, screen, bays and trains (M to L; player-visible).** `src/sim/railway-seed-legs.ts` (or a sibling):
      `trade-ready` from `bay-reached` by accepted ops only (light the works and bring 12 steel home with the steel
      seed's own helpers; the pool is 12) and `trade-fitted` (`ns` Quick, `bay` Strong, both adopted at their depots);
      `SEED_STAGES`, its golden shard, `railway-jump.ts` rows without a `land` (leg 2's step 3 reason).
      `garage-state.ts`: per-line facts (`lines`, `tableLine`, `bringRev`, the hold). `garage-data.ts`: `partsOf(room,
      line)`, `rowsFor` for trade lines, the `'swap'` standing, `MOMENT_FROM`. `src/features/garage.ts`: the chip row
      and its navigation. `garage-view.ts`: the table copy is `tableLine`'s, wearing its row; the copies' swap
      (outgoing copy into its bay, the bridge to the incoming bay's road, the incoming copy out, the bridge back) in at
      most 6 s, Interact skipping it locally; riders on the deck ride it as today (agent call of 18 November).
      `src/place/rotunda.ts` `bayOccupants` with copies; `rotunda-stage.ts`, `rotunda-view.ts`, `roundhouse-view.ts`
      (doors, plates, the post's knob orange for any line's Ready part), the roundhouse prefab record and
      `dev/prefab/rotunda.ts` regenerated. `cars.ts`: `consistOf({ line, wagon, steel, strong })` with the flatbed
      (role `'cargo'`, `TRAILER`) after the kit car. `train-view.ts`: Quick's chimney, Strong's flatbed, the platform
      beat on `fit !== tr.wears` (any line, at its halt 0) with the flatbed coupling as the steel car does, and the
      platform move for a local rider. `docs/game-design/place.md` ("Production boiler, trains and the pier" and the
      garage's paragraphs): the chips, the trade, the bays, adoption at each line's own depot. Verify (`.look/`, stills opened): at `trade-ready`, the post with the
      chip row and the `ns` Engine tab showing both tiles at "Ready"; at `trade-fitted`, Installed and Swap; bay 210°
      and 230° from the post at player height and from the garage camera; a Strong `bay` train at the West landing from
      the platform (four cars); a Quick `ns` train at High Gorge; the bring as motion (a contact sheet or clip, plus
      one real-time watch); the post's knob from the Village platform and from the West landing; the seed replay of
      `bayOccupants` across every accepted seed (as step 2's table). Row: "Player-visible implementation": Codex
      gpt-6.2-astra medium, high for tricky work; visual review by the main session.

**Checkpoint (this step's few proofs, once, after step 3).** Two peers at the post (`dev/look` two-tab, `--real`):
one brings the bay line, both screens and both tables show it; the other's hold during the swap refuses with "The
table's busy"; one fits Strong and both see a four-car `bay` train leave the West landing on its next departure, not
mid-run. `npm run test:net`; `npm run perf` (two more copies and a flatbed a Strong train: reported, not a gate); one
frame-time reading at the Roundhouse on the Mac. `npm run loop -- run` for one to three players.

**Order.** Step 1 any time. Step 2 now: its files do not meet leg 2's views (#2273) except `railway-intents.ts`,
where it adds lines and edits none of theirs. Step 3 after leg 2's step 4 is on main (it edits `train-view.ts` and
the halts' views that step 3 poses trains on), or rebased onto it.

## The world bump

Needed: four new columns on checkpointed rows, two boiler rows, a new op and a widened one, and `rail.install`'s
revision meaning change. **One bump, v63, in step 2's commit**, with a dated line. Step 3 adds seeds and views only:
no bump. [stack-west-platforms](stack-west-platforms.md) also wants a reset; whichever ships first takes v63 and the
other the next number. They can share one only if both are review-clean in the same batch; neither waits ("No bump
waits"). Ship outside the owner's sessions (`npm run heartbeat` first).

## Level findings

`npm run level-check` ran on 19 November (main `6c46e3854`): **21 reports, none new**. "rotunda/home: ok; 7 bays
(140°), nearest running rail 7.12 m"; "route leg 2 (planned): ok"; the West landing's apron frame and rack "6.0 m
apart". The tool does not read bay occupants, a consist's length against a platform, or a sightline, so each claim
below has its own proof:

1. **Nothing is gated by an ability, and nothing is reached early.** The post stands at Home from arrival; a chip
   appears only from its leg's last lay, and the server refuses a bring or install before it. A glider or swimmer
   reaches no part of the trade. The work gate is the leg itself.
2. **The copies stand where the waiting engines stood** (bays 170°, 210°, 230°, on stall roads laid since 1b), with
   step 2's prefab record and before-enable guard. Proof: the seed replay in step 3 and stills from the post and the
   garage camera. Bay 170° is partly hidden by the table copy from the steel-home angle (step 2's note); the stills
   say whether 210° and 230° read from the post.
3. **A Strong train fits its platforms**: 17.2 m from the engine's nose (8.2 m ahead) to the flatbed's tail (9.0 m
   behind) on the 25 m head platforms and the halts' platforms; arithmetic from `cars.ts` and `TRAIN_EXTENT`, checked
   by step 3's still at the West landing. No sim length changes.
4. **The cue is unproven at distance.** The post's orange knob from the Village platform (21 m) and from the West
   landing (158 m): step 3's two stills say whether it reads. If it does not from the West landing, the bay line's
   copy door (230°) is the second cue; nothing else is added unless both fail ([finding 4](#findings)).
5. **Nobody is stranded.** A swap's flatbed leaves only at the depot with the train standing, and a local rider is set
   on the platform first; a copy rolling in or out keeps the bay guard; the table turn carries a deck rider as today.

## Risks

- **Room safety.** All rules inside the tick's apply; no effect in apply (moments and the copies' swap play from
  replicated changes); integer ticks only, no `Math.random` or wall clock. A new sim file is listed for the server
  image. The checkpoint's verified-save guards are untouched.
- **Mixed builds.** Dev phase: no compatibility code; v63 with its dated line; fixtures regenerated in the same commit
  after the old-seed audit.
- **Lockstep.** New rows are integers; adoption changes a standing train's row only; the mixed-fleet fuzz is the
  proof. Re-read [lockstep](../agents/lockstep.md) before step 2.
- **Hot files.** `railway-sys-steel.ts` (step 3's install; keep the trade branch small), `garage-view.ts` (1,297
  lines), `roundhouse-view.ts`, `train-view.ts` (leg 2's views, #2273), `railway-server.ts`.
- **The shared table.** One player's bring turns everyone's table; the hold refuses installs and brings during a swap
  or a moment, and the copy never rolls into a standing player (the bay guard).
- **Performance.** Up to two more instanced copies behind doors and one flatbed a Strong train; `npm run perf` at the
  checkpoint, reported. Not a reason to cut anything without the owner's word.

## Open questions

Each proceeds on its recommendation; none adds scope.

1. **Strong pays nothing on the new lines until freight exists. Offer both rows now, with a readout that says so, or
   show Strong as "Later" until the freight brief gives these lines a load?** **Recommended: offer both now** (your 15
   November answer builds the trade in step 4, and your 18 November answer puts full loads in the freight brief), with
   "Nothing to haul yet" as the third readout so the screen never claims a load the line does not carry. On `ns` and
   `bay` today Quick is the right pick, and the screen shows why; the choice gains its other side when freight
   arrives, and the research's test (drop the trade if rooms never want Strong after seeing a full delivery) waits for
   that delivery. Or Strong reads "Later" until then, which makes stage 4's fit an upgrade for now.
2. **The trade's price: 1 steel a line, once?** **Recommended: yes, 1** (a stand-in, down from 6): the works casts 12
   and a room that bought the cradle and the Big boiler keeps 2, exactly one fit for each of the two lines, and the
   install still takes a block off the stack. At 6 the trade never opens in that room. Or keep 6 and make the works
   cast past 12 (a steel-supply change, new scope), or make the first fit free (it drops "both at the same steel
   price, once paid").
3. **Steel for later lines.** With the trade at 1, a room that bought everything has none left for the cave line
   (stage 6). **Recommended: leave it to the cave leg's plan**, which decides whether the works casts more or the
   price changes; nothing in step 4 waits for it.

**Suspect lines of The Boogler's:** none written, changed or read as suspect. New placeholder strings for the owner:
"Swap", "Cargo car", "Nothing to haul yet", the chips' catalog names ("Line 2", "North-south line", "Bay line"). The
existing Boiler tile's "The first install. It woke the trains." is line 2's and is not shown on a trade line.

## Design review (2026-11-19)

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

The plan's three [open questions](#open-questions), each recommended; none holds a step.
