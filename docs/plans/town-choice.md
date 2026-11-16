> **Timing correction, 16 November 2026:** historical loader figures below remain historical.
> Rerun on v55 (#1975): solo pier **182.3 → 134.5 s**, ring **418.6 → 197.6 s**;
> assumed trio pier **167.8 → 120.0 s**, ring **398.3 → 191.9 s**.
> These do not reproduce the old figures. See [method, phase spreads and quarry-stop cost](../reports/loader-times.md).

> **Status: plan, not built; designer-reviewed 16 November under the first-island-teaches scope ([review](#designer-review-16-november-the-first-town-as-a-lesson)): plot 2 as the loader yard for its lesson, no choice asked; rider places 8 a train; plot 3's base 800; four owner questions.** Owner answered all four yes; build steps: [first-town-lesson](first-town-lesson.md). Follow-up: [scarce town plots brainstorm](../brainstorms/town-plots-scarce.md) (proposed, not an owner decision). Planner, against origin/main `a71077c4b`, `WORLD_NS` v54. The one file
> each build job reads. Follows [town-economy-visible](town-economy-visible.md) (its design review's ruling 1, "the next
> plan"). **Finding first: the choice as ruled does not work** (section 2a, measured); section 2b changes it until it
> does. "Plot 1, 2" are the first and second priced plots, slots `plot3` and `plot2` (that plan's N9). Nothing here
> is built.

# Town choice: the house now, or footings on every train

## 1. Summary

- **Sees:** about 3 minutes after the pier both plots are staked: plot 1 by the hall with a rider on its board (150), plot 2 by the quarry road with a footing on its board (400). The box fills; the gold ghost rises on the one it can buy.
- **Chooses:** "build the house now" (150, the box has it 4 minutes after the pier) or "save for the loader yard" (400, about 11 minutes after the pier). Buying one doubles the other, as every house does.
- **House first, within five minutes:** a house goes up, riders on the island grow, fares rise from about 36 to 52 a minute; the loader yard then costs 800 and comes about 19 minutes after the pier.
- **Loader yard first, within five minutes:** a yard with a jib goes up by the quarry road; at the Works an arm swings footings onto every line 2 train, not only the wagon, so footings reach the Pier and the railhead in more and earlier loads; the house then costs 300 and also comes about 19 minutes after the pier.
- **Throughout:** both orders end in the same town at about the same minute with about the same box. The order decides which benefit comes 8 to 15 minutes sooner, and that is the whole decision.

## 2. The choice, measured

All headless on main `a71077c4b`, from the seeds named, at the room's 50% prices, 30-minute runs (scripts in the
planner's scratchpad, not committed). Footing times are from the moment the loader would be on; "solo" and "trio"
advance 4.4 s and 1.5 s after each footing set (the owner's "ten set in 44 s once the wagon ran", 14 November; a trio
is assumed three times as fast). Box times use real fare ticks after `q6-done` with no Works work (fares do not depend
on the Works until Q7 lengthens the line).

### 2a. As ruled (plot 2's house also brings the loader): it does not work, for two reasons

**Plot 2 first dominates.** D2's doubling makes the dearer house first the cheaper pair (400 + 300 against 150 + 800),
and a house plus the loader contains a house:

| From `q6-done`, 30 min | House 1 first (150, then 800) | House 2 + loader first (400, then 300) |
| --- | --- | --- |
| Buys | plot 1 at 4.2 min, plot 2 at 19.4 | plot 2 at 11.3, plot 1 at 17.3 |
| Loader on | 19.4 min | **11.3 min** |
| Box at 30 min (landed − spent + 7) | 722 | **882** |
| From `crossing-done` (after the pier) | box 1,037; loader at 15.3 | box **1,197**; loader at 7.4 |

Plot 2 first wins on loader, both houses and money, before and after the pier: one right answer, a sum.

**The loader as named saves nothing.** A source upgrade may only change a rate at the source (a faster arm, a bigger
rack; [passenger-trade](../brainstorms/passenger-trade.md) section "What Boogles buy"). Measured from `wagon-on` (pier's
12) and `deck-laid` (ring's 18), instant carrying:

| Change | Pier | Ring |
| --- | --- | --- |
| Today | 155.2 s, 2 wagon loads | 303.4 s, 3 loads |
| Kiln casts twice as fast (`castTicks` 40) | 155.2 | 303.4 |
| Works rack 12 (`rackCap`) | 155.2 (160.2 if from the start) | 303.4 |
| Wagon holds 12, rack 12 | 155.2 at `wagon-on`; **57.0** if both are in before the kiln fills | **182.4** |

The kiln is never the bottleneck: the wait is the wagon's round trip (quarry to Pier 38 s; Pier, Village, quarry 65 s).
The arm's load at the quarry is instant today, so a faster arm saves at most the 5 s stand. The wagon's size is on
rails, so it costs steel and is already the garage's bigger cradle ([garage-choices](garage-choices.md) G-c, 6 to 10,
the decided second steel pick). Boogles cannot buy it ("anything on rails costs materials", 10 November).

### 2b. What works: plot 2 is the loader yard, a works building, and the loader loads every train

Two changes, both New (C1, C2): **plot 2's building gives no riders** (it is the loader crew's yard, not a home), and
**the loader is an arm at the Works rack that puts footings on every line 2 train** that stands at the quarry going out
with an empty flat deck, up to 6 (`WORKS.loaderCap`, stand-in), not only on the wagon. That is still the brainstorm's
loader ("moves pieces the source made onto a car the room paid for in materials; never more than the car holds"); it
raises no train's capacity, and line 2's flat decks are idle while footings are owed (the stone stop waits for them,
12 November). Prices, the doubling and plot 1 are unchanged; no number was tuned to make the split.

**Footings with the loader** (two line 2 trains run at the pier):

| | Pier: instant / solo / trio | Ring: instant / solo / trio |
| --- | --- | --- |
| Wagon only (today) | 155 / 182 / 164 s | 303 / 339 / 315 s |
| Loader on every train | 129 / 155 / 138 s (**−26 s**) | 185 / 203 / 193 s (**−118 / −136 / −122 s**) |
| Loader and a Works rack of 12 (two upgrades; not proposed) | 112 / 139 / – s | 137 / 164 / – s |

**Money, from `q6-done`, 30 min** (plot 2 adds no riders):

| | House first (150, then 800) | Loader yard first (400, then 300) |
| --- | --- | --- |
| Buys | house at 4.2 min, yard at 19.4 | yard at 11.3, house at 19.3 |
| Fares | ~36 a minute to 4.2, ~52 after | ~36 a minute to 19.3, ~52 after |
| Box at 30 min | 560 | 540 |
| From `crossing-done` (after the pier) | house at 0.2, yard at 15.3; box 794 | yard at 7.4, house at 15.3; box 774 |

The house's extra fares pay exactly for the doubled yard: both orders finish together with about the same box. The
choice is only **which comes first: the house 15 minutes sooner, or the loader 8 minutes sooner.** Neither dominates:

| Room | Wins | Why (human timings from the 14 November sessions) |
| --- | --- | --- |
| Solo first-timer, Q6 first (Grant's pace; the owner's: wagon about 19 min after trains, ring 25 to 35 min) | **House** | the wagon's pier loads come at or after 19 min, the ring later: house-first's yard arrives in time for both |
| Three players who push the Works (assumed: the owner's stretch at a third, so the wagon about 7 min and the ring about 10 to 15 min after the pier) | **Loader yard** | the ring's 18 come inside the 11 to 19 min window: about 2 minutes less waiting at the jib |
| Money first reached after the pier (`crossing-done`: 150 at once, 400 at 7.4 min) | **Loader yard** if the room heads for the ring, **house** if it lingers | the ring follows Q7 by 2.6 min of seed time, about 11 min of the owner's |
| A room that rides and watches the town | **House** | riders, the "new neighbours" lines and the town growing 15 minutes sooner |
| A room that only builds | **Loader yard** | footing waits are its only waits after the pier |

**Plainly:** this is a real choice with small stakes: 26 s at the pier, about 2 minutes at the ring, or a house a
quarter of an hour sooner. Boogles past the second buy have no sink until plot 3 (1,500 × 4 = 6,000 at room prices,
about 90 minutes of fares), so "more money" is not a benefit and is not offered as one. A bigger split needs a second
sink for Boogles; that is owner question 3, not this plan.

**Rejected, measured:** a cottage (plot 1, also bringing the loader) against a bigger house (plot 2, +2 riders): the big
house first is ahead on money at 30 minutes and has both 3 minutes sooner; the loader-first side only buys the pier's
26 s. Rail delivery to the railhead (Grant's G7) is already built for the route's legs (the kit rack moves to the head
of the last section laid, call 88), and his rail runs were at Q4 and Q5, before Boogles exist.

## 3. How the player reads it, with no helper text

DESIGN 7 and 11; D6 (counts everywhere); N12 (the gold ghost).

- **Boards.** Plot 1's board (B2's) keeps the rider icon and "+1 rider / minute", its price and the box. Plot 2's board
  shows the **footing icon** (the Works rack board's) with "Every train" and its price and the box. No sentence compares
  them; two icons and two prices are the comparison.
- **Before.** Both staked: stakes, string and pile (A2). The box at a price raises that plot's gold ghost: a pitched
  house on plot 1; on plot 2 the house shell with a jib on its quarry-road side, its hook over a footing on the step.
- **After.** Plot 1: the closed house (B2). Plot 2: the same closed shell and hulls, the jib and two footings on its
  step (view only, inside the footprint). At the Works the arm, folded and grey beside the rack until the yard stands,
  then swings a footing onto each line 2 train that stands at the quarry; footings ride on the trains' flat decks
  (seen at the Pier and the railhead as they come in).
- **Both at once.** From the hall's front (Place-local (−90.2, 11.0)): plot 1 at 22.0 m, plot 2 at 36.9 m, 27° apart,
  both in one view looking south across the green; from the quarry road's mouth (bearing 130 on the ring road) they
  stand on either hand. From the island neither plot's ground shows (the hall's wall and posts, A2's note); the gold
  ghosts' roofs do (B2's still for plot 1); plot 2 is 44.2 m from the island's middle and its ghost's jib raises its
  silhouette, **not seen in a still** (T2 proves it or reports it hidden).
- **Where the payoff is seen:** the arm at the Works from the quarry halt, where the wagon loads; footings on a second
  train arriving at the Pier while players stand at the frame.

**Level findings** (`npm run level-check -- --place=place` on main: exit 0, 12 reports; town houses 0 failures, 9
solids, roofs 23.2 m; gaps bay→shelf 0.30, shelf→first house 1.02, first→second 9.94, second→shop 2.89, shop→balcony
0.15 m). Nothing is placed outside existing footprints: plot 2 keeps the house slot, shell and hulls, so the rooftop
chain (the earlier plan's finding 7, accepted) is unchanged; the jib and step footings are view only, under the hull's
+5.2 m top or above it without a collider; the Works arm has no collider and stands on the rack's track side, so reach
does not change. The boards are A2's, at A2's positions (plot 1 (−95.4, 35.2), plot 2 (−110.0, 40.4)).

## 4. Rules, state and steps

**Sim (Server kind, the server's authority; nothing predicted).**
- **A plot's benefit is data.** `TradePlot` gains `riders: number` and `gives?: 'loader'`; the Village's rows become
  plot 1 `riders: 1`, plot 2 `riders: 0, gives: 'loader'`, plot 3 `riders: 1` (`src/sim/railway-trade-layout.ts`).
  `townBuildings` = `startBuildings` + the built plots' `riders` (`railway-queries-trade.ts`); `tillRate`, `tradeTick`
  and `boxCap` follow unchanged. `loaderOn(w, tick)`: some built plot (`plotBuilt`) with `gives === 'loader'`.
- **The loader.** `footCarrier(w, slot, tick)` (`railway-queries.ts`): the wagon's train, or with `loaderOn` any line 2
  train whose `freight`, `logs`, `rails` and `steel` are 0 or which already carries footings. In
  `railway-sys-trains.ts`, `wagonArrives` becomes `footingsArrive` for any carrier: at the quarry it loads
  `min(cap − foot, Works.rack, footOwed(w, aboard(w, 'foot')))` (cap `wagonCap` for the wagon, `loaderCap` otherwise);
  the owed count takes **every train's** footings, not the one train's (today's `footOwed(w, row.foot)` is right only
  while one train carries them). Unloads at the Pier and the Railhead as the wagon's. `serviceOf`'s three wagon clauses
  read `footCarrier`. `freightLoads` loads nothing onto a train with `foot > 0`. Trains in slot order, so two at the
  quarry in one tick load deterministically. Headway exemption stays the wagon's only (Default).
- **State and saves.** No new component or field: `Train.foot` exists and is replicated; the loader is derived from
  `Plot.at` and data, so a save and a reload restore it from rows. `WORLD_NS` **v55** (or the next free) with a dated
  line: the plot catalog's meaning and `Train.foot` on non-wagon trains change.
- **Op:** none. `rail.buy { id }` is generic (B1); reach (B2) unchanged.
- **Invariants** (`railway-check-works.ts`, `railway-check-trade.ts`): a non-wagon train carries footings only on line
  2 with `loaderOn`, at most `loaderCap`, and no freight beside them; footing conservation (set + racks + aboard + backs
  = poured) holds; plot 2 adds no riders.
- **Late joiner and reload:** the yard's house snaps built (B2's path); footings on decks are row state; the arm's pose
  derives from `loaderOn` and the standing train (no state).
- **Bots and the loop graph:** route bots need no change (the loader only shortens waits; a room that never buys
  finishes). `dev/loop/graph.ts`: the crossing, bents and weights supplies read "wagon, or every line 2 train once the
  loader yard stands"; `rail.buy` stays a general action outside route order; `npm run loop -- run` keeps order and
  bills. `dev/economy/trade-data.ts` reads `riders`/`gives`; the model's `loader.works` row becomes plot 2 (offered when
  staked, price from `TRADE`), and its `cut.loader` source note cites this section's measured seconds.

**Steps.** Each leaves `node dev/ship-check.ts` green. Tier per `npm run review-stamp`. Models from `npm run models`.

- [ ] **T1. Plot benefits and the loader (M).** Sync: Server. Tier: **independent review** (`src/sim`). Model: Codex
  gpt-6-astra high; review a fresh gpt-6-astra high (or opus high). Files: `railway-trade-layout.ts`,
  `railway-works-layout.ts` (`loaderCap: 6`), `railway-queries-trade.ts`, `railway-queries.ts`,
  `railway-sys-trains.ts`, `railway-sys-trade.ts`, `railway-check-works.ts`, `railway-check-trade.ts`,
  `src/world/namespace.ts`, rail-schema and fixtures, `dev/economy/trade-data.ts`. Seeds (`railway-seed-trade.ts`,
  `railway-seeds.ts`, `src/world/railway-jump.ts`): **`town-choice`** (`q6-done` advanced until both plots are staked
  and the box holds plot 2's price, nothing bought: the decision itself, for the owner) and **`loader-built`**
  (`town-choice` plus an accepted `rail.buy { id: 1 }` and `buildTicks`); `railwayAtWorks` and `railwayAtRing` take a
  base seed so **`loader-wagon`** is the Works chain on `loader-built`. Tests (`test/railway-trade.test.ts`,
  `test/railway-works.test.ts`): plot 2 adds no riders; `loaderOn` at `at + buildTicks`, not before; from
  `loader-wagon` the pier's twelve are racked in at most 135 s (today 155) and conservation holds every tick; the
  ring's eighteen in at most 200 s from the loader's `deck-laid` (today 303); a train with stone takes no footings and
  one with footings takes no stone; two trains at the quarry in one tick; save round-trip mid-load; determinism.
  **Proof:** `npm run checkpoints -- town-choice loader-built loader-wagon`.
- [ ] **T2. The yard, the arm and footings on decks (M).** After T1. Sync: Local (views read the mirror through the
  read facade; no state). Tier: normal + visual. Model: gpt-6-astra high. Parallel with T3. Files:
  `src/entities/town/plots.ts` (plot 2's footing icon and "Every train"; the yard's gold ghost and built look from
  `gives`), `src/entities/railway/train-view.ts` (footings on any line 2 car's deck from `Train.foot`, the wagon's
  footing mesh), `src/entities/railway/works-view.ts` (the arm beside the rack: folded and grey, then a swing on each
  row change that loads a standing train). **Proof:** `npm run look -- --rail-seed town-choice`: one still from the
  hall's front with both boards and the ghost, one from the island (plot 2's ghost seen or reported hidden);
  `--rail-seed loader-wagon`: the arm loading the second train, in real time once.
- [ ] **T3. The loop graph and the model (S).** After T1. Sync: none (tools). Tier: normal. Model: gpt-6.1-sol medium.
  Parallel with T2. Files: `dev/loop/graph.ts`, `dev/economy/trade-data.ts`'s page rows, `docs/world/trade-economy.html`
  regenerated. **Proof:** `npm run loop -- run` with order and bills unmoved; `npm run economy` shows plot 2 as the
  loader yard.
- [ ] **K. Checkpoint.** `npm run check:full`; `npm run loop -- run`; `docs/game-design/` trade chapter (or K3's, if it
  exists by then) gains "the town's first choice" in one edit; the owner is pointed at `town-choice`.

**Risks.** Hotspots: `railway-sys-trains.ts`, `namespace.ts` (rebase first; check `npm run inflight`: nothing in flight
touches these today). Room safety: no effect in a system; the arm and decks draw from row changes. Mixed builds: one
bump, no compatibility code. G-c (the bigger cradle, 6 to 10 for steel) is worth less once every train carries
footings; garage-choices should re-check its value when it is built. Performance: at most 6 footings on one more deck,
one arm; no `npm run perf` needed beyond K3's.

## 5. Calls, for the designer

| # | Call | Kind |
| --- | --- | --- |
| 1 | Boogles from fares only; no conversion; one box | Decided: D1 ([rewards](../decisions-rewards.md#current-rules), 10 and 11 Nov) |
| 2 | Houses on staked plots; the first house is 300 (room 150); each next costs twice | Decided: D2 (11 Nov) |
| 3 | Boogles upgrade sources, the faster loader arm included; never anything on rails | Decided: [10 Nov](../decisions-rewards.md#d-2026-11-10-boogles-build-houses-and-upgrade-sources) |
| 4 | A grown town gives riders, a character's building, source upgrades | Decided: [12 Nov](../decisions-rewards.md#d-2026-11-12-cargo-trains-and-hub-towns-answered) |
| 5 | The garage spends steel, never Boogles; the bigger cradle is steel (G-c) | Decided: [15 Nov](../decisions-core-loop.md#d-2026-11-15-garage-choices) |
| 6 | The stone stop waits while footings are owed | Decided: 12 Nov (town economy answered) |
| 7 | The doubling counts the loader yard as a house | Default (D2 read as "each next building on a town's plots") |
| 8 | Only the wagon's train is exempt from headway holds | Default (unchanged rule) |
| 9 | "New neighbours" lines fire on the yard as on any built plot | Default (F5 unchanged) |
| C1 | Plot 2's building is the loader yard and gives no riders (replaces ruling 1's "also brings") | **New** |
| C2 | The loader loads every line 2 train with an empty flat deck, up to 6 (stand-in) | **New** |
| C3 | Plot 2's board: the footing icon and "Every train"; the yard's jib and step footings; the arm at the Works | **New** |
| C4 | Seeds `town-choice`, `loader-built`, `loader-wagon`; a jump row for `town-choice` | **New** |

## Owner questions

Nothing waits on them; the steps build on the recommendations. Question 1 changes a designer ruling, not one of yours.

1. **Plot 2 becomes the loader yard (no riders) and the loader loads every line 2 train, because as ruled the second
   plot first was always right and the named loader saved nothing?** Recommended: **yes**.
2. **The stakes are small (26 s at the pier, about 2 minutes at the ring, or a house 15 minutes sooner). Build it now as
   the town's first choice?** Recommended: **yes**: it is cheap, it is the first buy a player can explain, and the
   trains carrying footings are seen where the work is.
3. **Boogles have no use past the second buy until plot 3 (6,000 at room prices). Brief a second sink so "fares now"
   buys something?** Recommended: **yes, as the next brief** (a cheaper plot 3, or a second source upgrade at the
   ring), not here.
4. **A jump-in row "Two plots" at the choice itself, for your playtest?** Recommended: **yes**.

## Strings for the owner (placeholders; none of The Boogler's copy touched)

Plot 2's board "Every train" (with the footing icon), "Price <n>", "Box <n>"; the jump row "Two plots": "Both plots
staked; the box holds one"; "Loader built". Existing "+1 rider / minute", "Hold to build", "Need <n> more Boogles" and
the residents' lines are unchanged.

## Not measured

Real players' choice and whether a 26 s or 2-minute saving is felt (no playtest); trio timings are assumed at three
times the solo carry; plot 2's ghost from the island; the yard's and arm's look (no still); the box timeline with Works
work and Q7 interleaved in one run (fares and footings were measured apart); a device.

**Research:** [upgrade-economy](../research/upgrade-economy.md) (an upgrade repays an inconvenience already felt: the
wait at the jib) and [economy-principles-audit](../research/economy-principles-audit.md) (one box, no conversion); no
departure.

## Designer review, 16 November: the first town as a lesson

**Scope.** The owner, 16 November ([first island teaches](../decisions-core-loop.md#d-2026-11-16-first-island-teaches)):
a first-island purchase is judged by whether the player understands its mechanic and sees its payoff; choices come
with the other hubs and towns. Second owner call the same day, being recorded as
`d-2026-11-16-rider-seats-are-not-player-seats` in the rail log: "differentiate between 4 player seats and seats for
npcs. They should get designed passenger cars and trains that are size appropriate." Read: this plan,
[town-plots-scarce](../brainstorms/town-plots-scarce.md), [town-economy-visible](town-economy-visible.md) (status, owner
questions, review), [garage-choices](garage-choices.md), [train-progression](train-progression.md)'s ladder, the
as-built [town section](../game-design/place.md#town-economy-in-the-live-game-16-november-2026-v54), DESIGN core loop,
6, 7, 11, the rewards Current rules (10 to 12 November). Numbers are the docs' unless marked **probe** (one new
headless run on `8878cdcdf`, the brainstorm's script with `TRADE.seats` also varied, gross fares a minute, 10 minutes
after 5 of warm-up) or **estimate**. Not looked at: any still (nothing new is placed); a device.

**Probe, fares a minute by added houses H (0 to 3) and rider places a train:**

| Stage | 4 places | 6 places | 8 places |
| --- | --- | --- | --- |
| `q6-done` | 36, 54, 72, **72** | 36, 54, 72, 90.9 | 36, 54, 72, 90.9 |
| `ring-joined` | 54.6, 81.9, 106.6, 135.2 | 54.6, 81.9, 107.9, 136.5 | 54.6, 81.9, 107.9, (run cut off) |

The cap swallows only a **third** house at the pier stage; at Ring Island 4 places carry three added houses.

### 1. The lesson list (ruling)

| # | Lesson, in the order met | Taught by | On main? |
| --- | --- | --- | --- |
| 1 | Trains bring goods home, and goods make room in the town (a pile, then stakes) | plot 1's pile and stakes, 8 timber | Yes. _Orchestrator's correction, 16 November: A1 (yard stacks and freight on the cars) is on main; the review read a stale line._ |
| 2 | Little guys ride and pay fares into one shared box | riders on line 2, the till's column | Yes |
| 3 | A staked plot plus the price in the box means you can build | the gold ghost, hold 1 s | Yes |
| 4 | **A house brings riders and fares** | plot 1, 150: 36 → 54 a minute at `q6-done` | Yes |
| 5 | **Each next building in a town costs more** | plot 2's board, 400 → 800, at that same buy | Yes |
| 6 | **A works building helps the line and brings no riders** | plot 2 as the loader yard (point 2) | **Missing** |
| 7 | The second cargo grows the town too: stone stakes the bigger plot | plot 3, 16 stone after the pier's footings | Board built; the payoff is about 75 minutes away (point 3) |
| 8 | Away time leaves one capped sack | C1, C2 | Missing, planned |

Lesson 6 is the back half of DESIGN's core loop ("grown towns give upgrades that extend your reach"); nothing on the
first island teaches it today. The box's cap mark is shown, not a lesson to design. Teaching gaps to close, in order:
plot 2 (6), plot 3's price (7), C1 and C2 (8).

### 2. The second plot (ruling: the loader yard, choice framing dropped)

- **If a house:** a second house by the quarry road, riders 54 → 72 at the pier stage (measured). The player learns
  lesson 4 again; the decided Boogle source upgrade, the loader arm (10 November), has no home on the first island,
  and the player reaches a later hub never having seen a town building do anything but bring riders.
- **If the loader yard:** the board shows the footing icon and "Every train" where plot 1's shows the rider icon (two
  icons are the lesson, no sentence); the grey folded arm stands at the Works from the start; once built, the riders do
  not change, the arm swings footings onto every line 2 train at the quarry, and footings come in on more trains at
  the Pier and the railhead. Solo, pier 182 → 155 s, ring 339 → 203 s (a71077c4b, historical, not rerun). Bought in
  the usual order (house 150, then the yard at 800), it lands about 19 minutes after `q6-done`: before a first-timer's
  pier loads and the ring (section 2b's solo row); for a fast trio, after the pier but before the ring (**estimate**).
- **Keep:** 2b's rules (C1 no riders, C2 every line 2 train up to 6), the doubling counting the yard (call 7), C3's
  board and arm. 2a's measurement still stands for C2: an arm-only loader saves nothing, so it would show no payoff.
  **Drop:** the "neither dominates" requirement and section 2b's who-wins table as a design test; both plots stay
  offered in either order, and no number is tuned to balance them. Garage G-c (the bigger cradle) still teaches a
  different thing (a rail part paid in steel); its value check stays this plan's risk note.

### 3. Rider places (ruling: 8 a train, coming with the train; plot 3's base 3,000 → 800)

- **How many.** Rider places are their own number now, not the 4 player seats. **6 is the measured minimum** that lets
  every first-island house pay at every measured stage (the third house: 72 → 90.9 at `q6-done`). **Recommend 8**
  (stand-in, `TRADE.seats` renamed for riders): the same fares where measured, headroom past the third house (not
  measured above H 3), and a count that reads as a car made for little guys. With plot 2 as the yard the first island
  has only two added houses, and 4 places already carry them (72 = 72); the car matters for headroom and if plot 2 stays
  a house.
- **With the train or added.** **With the train**: the passenger car every line 2 train already pulls becomes the
  rider car (the four player benches kept, the little guys' places beside them), so each train the ladder adds (at the
  Pier, at Q7) brings its places and "a boiler sets top speed and how many cars" (10 November) is untouched. Not
  bought on the first island: the garage's first-island picks are decided (G-a to G-c, 15 November) and none is a car;
  "anything on rails costs materials, the passenger train and seats included" is a leaning (10 and 11 November), and a
  bought rider car fits the later per-line trade, G-e's whole extra car and G-f's "people or goods per line". The
  car's look is a separate art job (the existing car kit, `src/entities/railway/car-kit.ts`); not designed here.
- **Plot 3's 6,000.** Places do not move the price. At 6,000 (3,000 × 50% × 4) and about 82 a minute at Ring Island
  with one added house (probe), it is about 73 minutes of fares with nothing else to buy, against the confirmed stand-in
  rule "a town's last household to about 20" minutes (10 November). Plot 3 is never on offer at the pier stage: its 16
  stone moves only after the pier's twelfth footing, and only two plots stake at once. **Default: base 800** (room
  1,600, about 20 minutes at 82 a minute; it adds about 26 a minute, 81.9 → 107.9). Prices are stand-ins (11 November);
  the ×2 per building stays, so lesson 5 still shows.

### 4. Where the choices go

The first island should send the player to the next hub already knowing, from use: **two building kinds** (a house
gives riders; a works building upgrades that town's source and gives none), each read from its board's icon; **that a
town's prices climb** with each building; **two currencies that never convert** (Boogles from fares buy town
buildings; steel buys rail parts at the Roundhouse); **two kinds of garage step** (a free install that comes with a
beat, G-a and G-b, and one that spends steel, G-c); **that a train's cars have a size** (riders in the rider car,
footings on the decks, the longer boiler's fourth car). With those, a hub town can ask "house or this hub's works
building on scarce plots", and a line can ask Quick or Strong, people or goods, without a new rule being taught at
the moment of choosing. The first island adds no third building kind, typed plots, rebuilds or a civic sink.

### 5. What to drop

| Open question | Under this scope |
| --- | --- |
| This plan's 1 (plot 2 the loader yard, loader on every train); town-economy-visible's 3, which it supersedes | **Still his**, reframed as a lesson (owner question 1) |
| This plan's 2 (build it as the town's first choice; stakes small) | Drop: no choice is asked of the first town |
| This plan's 3 (a second Boogle sink past the second buy) | Drop for the first island: plot 3 at 1,600 closes it; the late-game shortfall (11 November, open) is the hubs' |
| This plan's 4 (jump row "Two plots") | Drop to a Default: a tool row; rename it "Loader yard" (placeholder) |
| Brainstorm 1 (test 2H against H+L) | Drop: no choice experiment on the first island |
| Brainstorm 2 (H or L on the hall's plot, 250 premium) | Drop: plot types are fixed; the first buy stays a house (11 November) |
| Brainstorm 3 (rebuild fee) | Drop: no rebuilds on the first island |
| Brainstorm 4 (park W and M; later source crews) | Drop as a question: parked; a later hub's brief takes it up |

**Calls logged** in [agent-calls](../agent-calls.md) (rewards, open): plot 2 as the loader yard for lesson 6; rider
places 8 with the train; plot 3's base 800; the lesson order. **Strings (placeholders, none of The Boogler's
touched):** "Every train", "Loader yard"; a rider count on the car, if the art job wants one ("Riders <n> / 8").
Suspect existing line: the "new neighbours" lines firing on the yard (call 9), which houses no one; his to rewrite.

### Owner questions (each builds on the recommendation; nothing waits)

1. **Plot 2 becomes the loader yard (no riders; its arm loads every line 2 train), as the first island's lesson that a
   town building can help the line, with no choice asked?** Recommended: **yes.** Or a second house, and the loader
   arm waits for a later hub.
2. **Each passenger train's car carries 8 little guys (6 is the measured minimum) beside the four player seats, and
   comes with the train; added rider cars are a later hub's garage pick?** Recommended: **yes.** Or 6.
3. **Plot 3's base 3,000 → 800, so the third building costs 1,600 (about 20 minutes of fares at Ring Island, your 10
   November "last household about 20") instead of 6,000 (about 73)?** Recommended: **yes.**
4. **Drop this plan's questions 2 to 4 and the scarce-plots brainstorm's four, as section 5 lists?** Recommended:
   **yes.**

Answer (owner, 16 November): "I take your recs on the four questions": all four yes
([decision](../decisions-rewards.md#d-2026-11-16-first-town-lesson-answers)).
