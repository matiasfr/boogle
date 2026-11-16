> **Status: proposed (2026-11-15), design review folded in.** A design brief; nothing is built. Measured on main
> `eadecf32b` (v51). The train ladder (14, 20 and 25 m/s; one train, then a train per extension) is being built on
> `t3/train-ladder` and is not on main; "the ladder" below means that branch.

# Garage choices: what the room adds at the Roundhouse, and what its bays hold

Designer, 15 November 2026. Step 6 of [roundhouse-rotunda](roundhouse-rotunda.md) ("stage 3 bought, and the second
hub") written together with "choose what to add at the garage", approved by the owner as the next design brief on 15
November ([train-progression](train-progression.md) on `t3/train-ladder`, owner question 3). That answer puts the
brief "after the owner has ridden this ladder"; the owner then said on 15 November to start it now, and "Nothing waits
for a playtest". It answers the rotunda's open question 2, "what is a bay for", and gives Port Quay's `RotundaSite`
row.

**Why a file of its own.** The answer spans three plans (the rotunda's stage 3, the ladder's step 4, the garage
moment's next install), two Roundhouses, and sim work the view-only rotunda plan does not own. Rotunda step 6 becomes
one line pointing here.

**Owner answers folded in** (train-progression, 15 November): the 20 m/s step happens by itself at the table turn for
now and, once the garage-moment steps are built, becomes the free first garage install, "the first upgrade"; seven
trains stays the busy end. The ladder's step 4 (engines waiting in the bays, rolling out over the table) is the bays'
first occupant.

**Binding.** "Shared progression and one shared wallet"; "anything on rails costs materials" and "no upgrade has two
prices" ([rewards, 10 November](../decisions-rewards.md#d-2026-11-10-boogles-build-houses-and-upgrade-sources)); "where
steel for upgrades waits: as a visible stack in the Roundhouse bay, spent by an install" ([yards, 10
November](../decisions-rail.md#d-2026-11-10-open-calls-answered-yards-at-halts)); "the bigger orange cradle is the
second steel pick" ([Ring Island, 10 November](../decisions-rail.md#d-2026-11-10-ring-island-the-meet-the-shard));
"counted material starts with the second steel pick" ([train upgrade screen, 10
November](../decisions-core-loop.md#d-2026-11-10-open-calls-answered-the-train-upgrade)); readouts are "speed, cars
and resources a minute", no trip-time metric ([10
November](../decisions-core-loop.md#d-2026-11-10-the-train-upgrade-screen-install-plain)); "a speed part only where
it saves about ten seconds a trip"; "cars are bought per line"; "no try-on"; "the Roundhouse holds the garage only";
two rotundas with the upgrade screen, and "those lines' trains take an install at their own engine shed; you still buy
at a Roundhouse" ([10 November](../decisions-rail.md#d-2026-11-10-big-junctions-are-designed-stations-not)); "a
crossing starts at about a minute: 1.2 km at 20 m/s" (2 November); High Gorge first, fixed order (12 November);
"the roundhouse is where you unlock, upgrade, customize and send out trains, with a light management feel" (5
November); "Wary of material grinds"; "Visualize in 2D HTML first"; "Brainstorm new gameplay first" (this brief and
its review are that pass for steps 1 to 3; step 4's choice gets a light `/brainstorm`).

**Serves** DESIGN.md **6. Communal world** (one pool, anyone installs for the room), **7. Telegraph everything** (the
store shows what the room can spend; the next engine waits behind a door), **11. Show, don't tell** (the building fills
as the network does). It bends **11** only as the garage screen already does.

**Research.** [roundhouse-management](../research/roundhouse-management.md) ("one small configuration choice per
line": used for step 4's brainstorm, not yet met by this brief); [roundhouse-trains](../research/roundhouse-trains.md)
("not an intended wait-to-afford-upgrades loop": used, so no scarcity is forced); [upgrade-economy](../research/upgrade-economy.md)
rec 2 (an upgrade repays an inconvenience already felt). Not a port from Place.

## 0. The answer on one screen

- **What a bay is for:** a bay holds something the room owns and is not running: an engine waiting for its line, the
  steel not yet spent, each fitted line's works engine (the copy the garage fits), and later the faster engine's works
  copy. A bay is never bought; it rises when the Roundhouse has something to keep and nowhere to keep it.
- **What you choose, and when:** the first upgrade at the table turn and the longer boiler at steel are free and
  choiceless; they teach the garage. The bigger cradle (decided, the second steel pick) is the first install that spends
  steel. The big boiler is offered when line 2 reaches High Gorge. From stage 4, when two new lines open together, the
  room picks **which line gets its next boiler first**: an honest choice of order, never a lock-out.
- **What you pay with:** steel, spent from the one pool the route's own bills draw on. Never Boogles. Looks and
  whistles keep no price until the owner gives one.
- **Stage 3:** not bought, and in two halves: bay 130° rises with the cave line's works engine (the fourth fitted line,
  around the fourth hour); bay 250° with the faster engine's, once High Port's engine comes home. Home then holds seven
  things in seven bays.
- **Port Quay:** the same kit, standing and complete at arrival, sized by what it holds: five bays on the decided
  order.

## 1. What exists today, measured

**The garage screen** (`src/features/garage.ts`, `src/entities/railway/garage-data.ts` `partsOf`). One works copy,
line 2's (`GARAGE_LINE = LINE2`), on the table. Five tabs in two groups, Upgrades (Engine, Cars, Cargo) and Looks and
sounds (Looks, Whistle), and eleven tiles:

| Tab | Tile | Standing today | Price shown |
| --- | --- | --- | --- |
| Engine | Boiler | Installed; Replaced after the longer boiler | none |
| Engine | Longer boiler | Needs steel → Ready → Installed | bill "STEEL 0/1"; note "Free: the reward for reaching steel" |
| Engine | Plough and headlamp | Later | none ("Not built yet.") |
| Cars | Four seats | Installed | none |
| Cargo | Rail and kit car | Installed | none |
| Cargo | Footing wagon | Waits in the stall → Free with the kiln | none |
| Cargo | Steel car | Later → Owned (with the longer boiler) | none |
| Cargo | Bigger cradle | Later | none ("Not built yet.") |
| Looks | Roof and lamps | Later | none |
| Whistle | Toot | Installed | none |
| Whistle | Two-tone | Later | none |

No tile has a price in any currency; the longer boiler's bill gates without spending. Engine readouts are top speed,
cars it pulls, footings and rails and logs a minute (`rowsFor`).

**Steel** (`src/sim/railway-sys-steel.ts`, `railway-ring-layout.ts` `STEEL`). The works casts 12 in all
(`STEEL.total`), 6 a trip, onto `Shed.steel` at Home; `install` checks `Shed.steel >= 1` and spends nothing; nothing
decrements `Shed.steel`. The pallet (`boiler-install-view.ts`) draws one block per steel on the apron at
`rotundaSteelPallet` (approach + 80°). **The route's stand-in bills past the built graph** (`npm run loop`) spend 334
steel and 224 footings from High Gorge on (High Gorge 42 steel and 32 footings, the spoke 52 and 44, Canopy 24 and 24,
the port 112 and 66, the White Wall 100 and 50, the ending 4 and 8), so the works must cast far past 12 whatever this
brief does. The wallet: `Till.boogles` exists and fares land in it; there is no buy op (R4).

**The engine.** `BOILER_SPEED = [200, 250]` on main; the ladder adds rows 140, 200 and 250 (speed, pull-away, braking)
with the longer boiler as part 2. `rail.install` accepts only `line: LINE2, part: 1` at `SHED_TABLE`; `boilerAdopt`
runs at the Village only; `Line.boiler` is per line already.

**The rotunda** (`src/place/rotunda.ts`, `src/entities/railway/rotunda-stage.ts`, `home-station.ts`).
`ROTUNDA_HOME.stages = [0, 3, 5, 7]`, `order = [0, -1, 1, -2, 2, -3, 3]` (190°, 170°, 210°, 150°, 230°, 130°,
250°). `rotundaStage` is 0 while `shed.stall < 2`, then 1, and 2 once `shed.steel >= 1`; it never returns 3.
`rotundaShows`: built bays other than 190° show shut doors; unbuilt bays inside the next promised arc stand as ruins
(at arrival, stage 2's five); end walls where built meets unbuilt. All seven stall roads are laid from arrival. Steps 1a
to 5 are on main; Checkpoint B is on `t3/rotunda-checkpoint-b`.

**Lines a garage could fit**, under the decided High Gorge first order (`railway-world-lines.ts`, each leg's `stage`
is `[High Gorge first, Canopy first]`): line 1 (193 m) and line 2 (to High Gorge at stage 3) are played; the
north-south line's incline (1.16 km) and the bay line's cut (1.23 km) open together at stage 4 and grow at stage 5 (to
1.90 and 3.31 km); the cave line (5.33 km) at stages 6 and 7. The bay trestle (1.58 km) is `[null, 3]`: never built in
this order. The ten-second rule, from the sim's `trainLegTicks`, nonstop end to end:

| Line, run | 20 m/s | 25 m/s | 30 m/s | Offered by the rule |
| --- | --- | --- | --- | --- |
| Line 1, 193 m | 15.4 s | 14.9 | 14.9 | nothing, ever |
| Line 2, Village to Ring Island, 1.17 km | 64.4 | 54.1 | 47.7 | 25 (built); 30 saves 6.4 s: not offered |
| Line 2, Village to High Gorge, 3.21 km | 166.4 | 135.7 | 115.7 | 30 saves 20.0 s |
| Incline (stage 4), 1.16 km | about 64 | about 54 | | 25 saves about 10.1 s: just |
| Bay cut (stage 4), 1.23 km | about 67 | about 56 | | 25 saves about 10.9 s: just |
| Cave and the White Wall, 5.33 km | 272.3 | 220.4 | 186.3 | 25 saves 51.9 s |

These times are the designer's filter only; the screen never shows them. A pull-away part (3.5 to 5 m/s²) saves about
2.1 s a stop: under the rule everywhere, so it is not offered. A bigger kit car saves no trip (greybox sections bill 20
logs and 20 rails against its 32). **The bigger cradle does have a felt rule:** the 224 footings in the later bills all
go by wagon at 6 a trip.

**"The chosen engine foundation"** in step 6 is the owner call [Engine foundations first](../agents/owner-calls.md)
(13 November): adopt an established ECS library (he leans to checked Becsy). It is **not chosen**: the owner parked it
("let's consider the Bexy step later, but for now continue with the prefab stuff, etc."), the backlog row is "parked by
owner", and the recorded reading is that new sim and server work keeps to the in-house ECS facade and the lint rules
on main. This brief reads step 6's words that way; it does not wait on the library.

## 2. What the player chooses, and when

| # | When (a beat that exists) | What the garage offers | Choice | Price |
| --- | --- | --- | --- | --- |
| G-a | The table turn (`table`) | **The first upgrade**: every Home engine from row 0 (14 m/s) to row 1 (20). It waits on the stand by the jib, knob orange. **The footing wagon rolls out after it is installed** | none: one hold, for every engine at Home | free |
| G-b | Steel home (`steelhome`) | The longer boiler and its steel car (built) | none | free: needs 1 steel, spends none (decided) |
| G-c | Steel home, beside the longer boiler | **The bigger cradle** (line 2's footing wagon, 6 → 10 footings a trip, stand-in): the second steel pick, the first install that spends | none | 4 steel, spent (stand-in) |
| G-d | Line 2 reaches High Gorge | **The big boiler** for line 2: 30 m/s, cars unchanged | none | 6 steel (stand-in) |
| G-e | Stage 4: the incline and the bay cut open together | each new line's longer boiler, beside line 2's big boiler if not yet bought | **which line first** | 6 each (stand-in) |
| G-f | The cave line (stage 6) | its longer boiler; later each line's big boiler where the rule passes | which line next | 6 a step |

**G-a, a gate with meaning.** The ladder put 20 m/s at the table beat so the decided one-minute crossing is never
ridden at 14 m/s (it would be 88.6 s), and every footing trip of the crossing, the bents and the weights runs behind
it. So the wagon's roll-out waits for the room's first install: turn the table, install the blast pipe (draft name: a
short pipe lowered through the chimney into the smokebox; the chuff sharpens and quickens, the audible payoff the
ladder's review asked row 1 for), and the wagon rolls. The post is 9.4 m from the handle the player has just used, the
part is on the stand and the knob is orange. Size Medium. Owner question 3.

**G-e is a choice of order, and says so.** Nothing is lost or locked, and no price is tuned to force scarcity: the
steel the route's bills need flows through the same pool, so a boiler step delays a little building and is never a wait
of its own. What makes it worth a moment is that the lines differ: the one you are about to ride, or the long one
behind you. The richer choice the research names (per line, a quicker trip or a bigger load, reversible at the table)
waits for cargo trains to give a bigger load a use; it is step 4's brainstorm. Owner question 5.

**Readouts.** Top speed, cars it pulls, and the line's resources a minute (footings, rails and logs, later steel), as
today. No trip times on the screen.

**Who chooses.** Anyone, for the room. Two players at the post see the same tiles and the same pool; the first
accepted hold wins, as `rail.install`'s revision rule already does.

## 3. The garage screen, row by row

| Where | Row | New or built | Standing and price | Readouts |
| --- | --- | --- | --- | --- |
| Top of the screen | **Line chips**, one per fitted line, the line on the table lit | New, step 4 | appear at stage 4; until then the screen is line 2's | none |
| Engine | Boiler | built | Installed / Replaced | as today |
| Engine | **Blast pipe** (draft) | New, step 1 | Later → Ready at the table turn → Installed; "Free: the first upgrade" (draft) | top speed 14 → 20 m/s; footings and kit a minute |
| Engine | Longer boiler | built | unchanged | 20 → 25 m/s; cars 3 → 4 |
| Engine | **Big boiler** (draft) | New, step 3 | Later; bill "STEEL n/6" with no button; Ready; Installed. Only on a line the rule passes | 25 → 30 m/s; resources a minute; cars unchanged |
| Engine | Plough and headlamp | built | Later, unchanged (no rule; a look until it has one) | |
| Cargo | **Bigger cradle** | built as Later; real in step 3 | bill "STEEL n/4"; Ready; Installed | footings a trip 6 → 10; footings a minute |
| Cars, the other Cargo tiles, Looks, Whistle | as today | built | unchanged | |

On another line the Engine tab shows that line's own boiler ladder; Cars and Cargo show what that line runs. No tile
gains a Boogle price; no part has two prices. A bill's "in" counts the pool (landed less spent), and the store bay draws
the pool, so an install visibly takes blocks away.

## 4. What each bay holds

**The rule.** A bay holds one thing the room owns and is not running. Its door is open when something stands in it and
shut when it is empty (rotunda call 16, as built). **Each fitted line keeps its own bay**, its colour over the door,
shut while its copy is out on the table. A bay is never bought; it rises when there is something to keep and no free
bay, from a fact that never goes back, and stays.

**Home, by bay:**

| Bay | Rises | Holds |
| --- | --- | --- |
| 190° | stage 1 (the stall) | The working bay: the shunter, and the tarped footing wagon until it rolls out (built) |
| 170°, 210° | stage 1 | Waiting engines (tarped in the ruins before stage 1); after the greybox's first section, line 2's works engine and the north-south line's |
| 150° | stage 2 (steel lands) | **The steel store**, as decided ("a visible stack in the Roundhouse bay, spent by an install"); the stack leaves the apron. A token pallet stays by the stand if the store does not read from the post (level finding 3) |
| 230° | stage 2 | A waiting engine; then the bay line's works engine |
| 130° | **stage 3a**: the cave line opens (the fourth fitted line) | The cave line's works engine |
| 250° | **stage 3b**: the faster engine first comes home from Port Quay | The faster engine's works copy. Its open road holds a waiting engine under a tarp from arrival until the Pier |

`ROTUNDA_HOME.stages` becomes `[0, 3, 5, 6, 7]`; `rotundaStage` returns 3 from "the cave line opened" and 4 from "the
faster engine owned", both monotone.

**Waiting engines, counted** (the ladder's fleet: 1 at the fit, 2 at the Pier, 3 at the Railhead, 6 on the first
greybox section). Five wait at most. **Departure order:** bay 250°'s road first (the Pier), then 150° (the Railhead,
so the store's bay is empty before steel lands), then 170°, 210° and 230° together on the greybox. When Q6 comes before
the Works (canonical, and allowed both ways), the first sight of the Roundhouse shows four tarps, and bay 250°'s road is
already empty. Every join happens while players are far from Home (the Pier 708 m, the Railhead past 834 m, the greybox
past 1.17 km).

**Works engines.** The Roundhouse keeps one works copy per fitted line, wearing that line's fits (extending the 10
November "a works copy the Roundhouse keeps"). A line is fitted when it opens with a part the ten-second rule offers;
line 1 never is. Choosing a line at the post brings its copy out over the table and puts the other away (step 4); its
real trains take the install at their own depot end, as decided.

## 5. Port Quay

The same kit (bay, door, pit, bridge, 16 m table). It differs in its arc, its state at arrival (standing and working,
complete: growth is Home's story), its way in (met head-on, not on a spur), its stone and trim, and one thing only it
holds: **the engine built there** (junction-stations: "High Port's faster engine is built there") in its working bay.
Both Roundhouses fit every line, as decided ("you still buy at a Roundhouse"), so Port Quay keeps a copy of each fitted
line too. On the decided order that is five bays: the working bay and the four lines. This replaces the open 14
November agent call "the half ring is Port Quay's" (owner question 4).

**Its row, for its station's plan** (the plan does not exist yet; the halt is `Port Quay` on the `cave` row, stop 2,
world (120.1, 959.9) m, y 3.0):

```ts
// src/place/port-quay.ts (the station plan's file)
export const ROTUNDA_PORT_QUAY: RotundaSite = {
  id: 'port-quay',
  centre: QUAY_TABLE, // placed by the station plan, inside the r 30 m kept clear on the apron (junction-stations)
  y: 3.0, // the harbour apron
  tableR: 8, // as Home's: one bay model fits both
  approach: QUAY_APPROACH, // the bearing the table's road leaves by, from the line
  mid: QUAY_APPROACH + 180, // the arc faces away from the road
  order: [0, -1, 1, -2, 2], // five bays, 100°
  stages: [5], // one stage: standing and complete at arrival
};
```

Three things in the kit are Home's and the station plan changes them: `rotundaStage` reads Home's `Shed` (Port Quay
needs its own, here a constant); `rotundaShows` promises stage 2's arc as ruins (a site field: no ruins); `dev/prefab/
rotunda.ts` lists `SITES = [ROTUNDA_HOME]`. The server's install reach is one point, `SHED_TABLE`: an install or a
`rail.bring` at Port Quay needs a second reach point (sim).

## 6. State and sync

| Piece | Kind | Where |
| --- | --- | --- |
| Which bays stand; what stands in them; doors | Local, derived from rows | `rotunda-stage.ts`; a pure `bayOccupants(site, facts)` in `src/place/rotunda.ts` |
| Steel landed (`Shed.steel`) and **spent** (`Shed.spent`, new); the pool is their difference, shared world-wide | Server | `railway-components.ts`, `railway-sys-steel.ts`; route bills draw on the same pool (owner question 2) |
| Each line's boiler row (`Line.boiler`), a fourth row (300, with its own braking) | Server | `railway-train.ts` `BOILER` rows |
| The cradle's size on the footing wagon | Server | `WORKS.wagonCap` becomes the line's fit |
| The wagon's roll-out waits for the first install | Server | `commission` in `railway-sys-works.ts` |
| Which line's copy is on the table (`Shed.tableLine`) and `rail.bring { line, revision }` | Server | step 4; judged at the post; refused while the table turns, a moment plays or a roll-out is due |
| `rail.install { line, part, revision }` for any fitted line, price from one table | Server | generalised from line 2, part 1 |
| Selection, line chips, the camera to a bay | Local | `garage-view.ts`, `src/features/garage.ts` |
| A waiting engine leaving its bay | Local, from the line's serving count | step 2; no sim change |

No presence field, no message, no Boogle. `rotundaStage` and the longer boiler's gate keep reading landed steel, so
spending never takes a stage back. Each sim step bumps `WORLD_NS`.

## 7. Steps

Model rows from `npm run models` (15 November). Tier is `npm run review-stamp`'s. Each step ships by itself; none waits
for a playtest.

| # | Step | Files | Tier | Model row | Proof |
| --- | --- | --- | --- | --- | --- |
| 0 | **The 2D page.** The route as a timeline: the pool against the stand-in bills, each part's Ready time and price, the boiler ladder with a row left for the faster engine (35 to 40 m/s), the bays by stage at Home and Port Quay. Prices set small against the route's bills | `docs/world/garage-choices.html` (artifact) | none | Implementation of an approved plan: Codex gpt-6.1-sol medium | the page, for the owner |
| 1 | **The first upgrade (G-a).** `rail.install { part: 1 }` for every Home line at the table post, replacing the ladder's automatic rise; `commission` waits for it; the blast pipe tile, stand and seat; a loop node between `table` and `crossing`; the bot's hold | `src/sim/railway-sys-steel.ts`, `railway-sys-works.ts` (`commission`), `src/world/railway-server.ts`, `garage-data.ts`, `garage-state.ts`, `garage-view.ts`, `dev/loop/graph.ts`, `dev/look/bots/`, `test/railway-install.test.ts`, `src/world/namespace.ts` | review | High-risk implementation: Codex gpt-6-astra high; then the independent review row | `garage-open`; `npm run loop -- run` |
| 2 | **Engines wait in the bays** (the ladder's step 4), view only: tarped engines in the ruins and bays in the departure order above; on the line's serving count rising, the tarp falls and the doors shut; the joining train keeps the ladder's whistle and scale-in. A roll-out in motion, if wanted later, copies the footing wagon's due tick | `src/place/rotunda.ts`, `rotunda-view.ts`, `test/rotunda-occupants.test.ts` | none | Player-visible implementation: Codex gpt-6-astra high; visual review by the main session | stills of arrival and stage 1 |
| 3 | **Steel is spent: the bigger cradle and the big boiler (G-c, G-d).** `Shed.spent`; the price table; the cradle as line 2's fit; the fourth boiler row; bills and Ready; the store in bay 150° | `railway-components.ts`, `railway-sys-steel.ts`, `railway-train.ts`, `railway-works-layout.ts`, `garage-data.ts`, `boiler-install-view.ts`, `rotunda-view.ts`, `namespace.ts`, tests | review | High-risk implementation: Codex gpt-6-astra high; then the independent review row | the cradle install at `steel-home`; stills of bay 150° from the post at player height and from the garage camera |
| 4 | **Lines in the bays; the choice (G-e).** First a light `/brainstorm` on the per-line choice and `rail.bring`; then works copies per fitted line, `rail.bring`, line chips, `boilerAdopt` at each line's depot end, stages 3a and 3b. Starts when stage 4's lines are playable | `railway-components.ts`, `railway-sys-steel.ts`, `railway-server.ts`, `rotunda-stage.ts`, `home-station.ts`, `garage-*.ts`, `src/features/garage.ts`, `roundhouse-view.ts`, tests | review | Brainstorm: Codex gpt-6.1-sol high; then high-risk implementation: Codex gpt-6-astra high, and the independent review row | two players at the post, one brings a line out, both see it; stage 3a rising |
| 5 | **Port Quay's row**, inside its station plan: the row above, the per-site stage and ruin rule, `SITES`, a second reach point | the station plan's files; `src/place/rotunda.ts`; `dev/prefab/rotunda.ts`; `src/sim/railway-works-layout.ts` | review (the reach point) | Planning complex work: planner agent, opus high | that plan's |

Order: step 1 after the ladder and the garage moment's checkpoint ship; 2 any time after the ladder; 3 after 1; 4
when stage 4 is playable; 5 with Port Quay's station.

## 8. Level findings

`npm run level-check` was not run: nothing here moves a placement except the steel stack, and the tool has no rule that
reads bays. One still was taken by the review (from beside the post at `steel-home`).

1. **Nothing is gated by an ability or hidden.** Every free install comes from a beat the route already has.
2. **The first upgrade is a gate on the wagon,** placed where the player stands: the post is 9.4 m from the table's
   handle, the part on its stand, the knob orange. The loop graph gains a node between `table` and `crossing`; `npm
   run loop -- run` must pass with it. Rule 3 holds: one player can do it and the part cannot be lost.
3. **The store bay is partly hidden from the post.** From beside the post the stand, with the longer boiler on it,
   stands in front of bay 150°'s door. Step 3 takes the still at player height; if the stack does not read, a token
   pallet stays on the apron, drawn from the same pool. Moving the stack keeps rotunda finding 3's 95° to 125° lane
   clear.
4. **A tarped engine on bay 250°'s road** stands on rails laid since 1b, 3.3 m from road 2's stub at the arc's west
   end; it is gone at the Pier.
5. **Doors at full Home:** five open at the busiest (store, four lines less the one on the table, the faster engine),
   the working bay always. Copies are solid; nothing walks into a bay that can trap a player.
6. **Port Quay is unmeasured.** Five bays need about 100° of arc, 25 m out from the table's centre, level at y 3, plus
   the pit and the approach; the station plan places it inside the r 30 m keep-clear and runs `level-check`.
7. **The walk to the post** is unchanged; `rail.bring` is judged from the same point.

## 9. Risks

- **A shared table driven by one player.** `rail.bring` turns the table for everyone; refused while a moment plays, the
  table turns or a roll-out is due, and the copy never turns under a standing player.
- **Spending changes a fact views read.** Anything reading `Shed.steel` as stock reads the pool instead
  (`garage-state.ts`, `boiler-install-view.ts`).
- **30 m/s braking:** 129 m to stop at 3.5 m/s² changes late request stops; the row carries its own braking, checked
  in step 3.
- **The faster engine needs headroom:** with every long line able to reach 30 m/s by stage 6, High Port's engine must be
  a felt step above (35 to 40 m/s; 50 was "a little too fast", 2 November). Step 0 shows it.
- **Mixed builds:** every sim step is a bump; no compatibility code.
- **Performance:** up to four works copies a Roundhouse, behind doors, instanced, drawn near only; `npm run perf` at
  step 4.
- **Hotspots:** `garage-view.ts`, `roundhouse-view.ts`, `railway-sys-steel.ts`.

## 10. Suspect or placeholder lines (none rewritten; none The Boogler's)

"Free: the first upgrade" (draft) sits against the 9 November entry "the boiler fit is the first upgrade a player
chooses" and the built Boiler tile's "The first install. It woke the trains."; one of the three should give, and the
wording is the owner's. Also built: "Free: the reward for reaching steel"; "Not built yet." on the plough and the
cradle; the fitter's card "Steam" / "Trains run both lines." (the ladder's review). New drafts: "Blast pipe", "Big
boiler" (it invites a "bigger" for the faster engine), "STEEL n/4", "STEEL n/6", the line chips' names (the
catalogue's until the owner names them).

## Owner questions

1. **A bay is where the room keeps what it owns and is not running, and is never bought; each fitted line keeps its own
   bay; stage 3 rises in two halves, bay 130° with the cave line and bay 250° when High Port's faster engine comes
   home. Yes?** Recommended: yes; Home then holds seven things in seven bays. Or keep "stage 3 bought as a row on the
   garage screen", which gives Home two shut doors to pay for.
2. **Is the steel an install spends the same steel the route's later bills spend?** Recommended: one pool (your 12
   November "shared pool"), shown as the stack in bay 150°, with boiler steps and the cradle priced small against the
   route's 334 steel, so an install delays a little building and is never a wait of its own. Or the Roundhouse's stack
   is a separate share the works sets aside.
3. **Does the footing wagon wait for the first upgrade?** Recommended: yes: turn the table, install the blast pipe,
   the wagon rolls, so the one-minute crossing and every footing trip run at 20 m/s. Or keep the install optional, and
   it installs itself when the wagon first couples.
4. **Do both Roundhouses fit every line, with Port Quay standing complete at arrival, sized by what it holds (five bays
   on the decided order)?** Recommended: yes; it follows "you still buy at a Roundhouse" and gives the faster engine
   its first stall without repeating Home's ruin story. Or Port Quay fits only the lines that never reach Home, as a
   nine-bay half ring with empty bays shut.
5. **Is "which line gets its next boiler first" enough of a choice for now?** Recommended: yes, shown as an honest
   order with no forced scarcity; the per-line trade (a quicker trip or a bigger load, reversible at the table) goes to
   a light `/brainstorm` at step 4, once cargo trains give a bigger load a use. Or brainstorm it now and hold step 4's
   build for it.

## How the review was folded in

All thirteen findings were taken. Findings 1 and 3 rewrote section 4 (each line keeps its own bay; stage 3 in two
halves; the departure order). Findings 2, 4 and 8 rewrote section 2 (one pool with the route's bills, no forced
scarcity, spending already decided). Finding 5 removed trip times from the screen. Finding 6 made step 2 view only.
Finding 7 made the first upgrade gate the wagon. Finding 9 went to the risks and step 0. Finding 10 gave Port Quay one
stage, and the occupancy rule then gives it five bays rather than seven. Finding 11 moved the engine foundation from the
questions to section 1. Finding 12 is cited in the header. Finding 13 is level finding 3. The owner questions are the
review's five, with question 4 made concrete. One change the review did not ask for: the bigger cradle has a felt rule
(224 footings by wagon in the later bills) and is the decided second steel pick, so it is G-c, the first install that
spends steel, ahead of the big boiler. The review's calls table below is kept as written, so its numbers refer to the
brief as first drafted.

## Design review (designer, 2026-11-15)

**Read for this:** DESIGN.md (core loop; principles 6, 7, 8, 11); owner-calls (Engine foundations first, The Roundhouse
is a real rotunda, Shared progression and one shared wallet, Brainstorm new gameplay first, Visualize in 2D HTML first,
Wary of material grinds, Nothing waits for a playtest); the Current rules of core loop, rail and rewards, and in full
the 10 November entries "the train garage: a works copy", "open calls answered: the train upgrade screen", "the train
upgrade screen: Install, plain readouts", "open calls answered: yards at halts", "big junctions are designed
stations", "Boogles build houses and upgrade sources", the 12 November "upgrades pay from a shared pool" and "campaign
outline", the 14 November "no try-on"; agent-calls rows of 11 to 14 November on the rotunda, the ladder and steel;
[roundhouse-rotunda](roundhouse-rotunda.md) sections (c), (g) and its review; [train-progression](train-progression.md)
on `t3/train-ladder` with the owner's 15 November answers (`81c88cf0c`) and the branch's `BOILER` rows and fleet;
[junction-stations](../brainstorms/junction-stations.md) question 3 and its tensions; research top blocks of
[roundhouse-management](../research/roundhouse-management.md), [upgrade-economy](../research/upgrade-economy.md) and
[roundhouse-trains](../research/roundhouse-trains.md). Code: `rotunda.ts` (`rotundaShows`, `stages`), `home-station.ts`
(`ROTUNDA_HOME`, the spur at road 2 s 5.5), `rotunda-stage.ts`, `garage-data.ts`, `railway-sys-steel.ts`, `STEEL`,
`railway-world-lines.ts` (each leg's `stage`), `fleetJoin`, and the wagon's roll-out precedent (`Shed.ready`,
`WORKS.rollTicks`, `railway-sys-trains.ts`). Ran `npm run loop` (order, cues, and the stand-in bills past the built
graph). One still: `npm run look -- --rail-seed steel-home --cam 954.5,21.5,12.0 --look 949.5,19.5,30.5`, from beside
the post toward bay 150. Not seen: stage 3, Port Quay, any tarped engine or a second copy (none exist).

### Calls: 12 decided, 13 new, 13 default

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | A bay holds what the room owns and is not running; a bay is never bought | New | Keep. Extends the rotunda review's "no bay without its occupant" (agent call, 14 November, open) |
| 2 | Stage 3 rises when the fourth fitted line opens, derived from lines opened, no price | New | The rule is right; the arithmetic is not (finding 1) |
| 3 | Stage 3's row on the garage screen is that line's chip | Default | Follows from 2 |
| 4 | Five waiting engines from arrival: tarps at 150°, 170°, 210°, 230°, one on bay 250°'s road; out at the Pier, the Railhead and three on the first greybox section | New | Agent call, 14 November (engines wait in the bays), open. Counts hold against the ladder's fleet; the departure order is missing (finding 3) |
| 5 | Bay 150° is the steel store from stage 2; the stack leaves the apron | Decided | "Where steel for upgrades waits: as a visible stack in the Roundhouse bay, spent by an install" ([10 November](../decisions-rail.md#d-2026-11-10-open-calls-answered-yards-at-halts)). Which bay: Default |
| 6 | One works copy per fitted line, each kept in a bay | New | Extends "a works copy the Roundhouse keeps" ([10 November](../decisions-core-loop.md#d-2026-11-10-the-train-garage-a-works-copy)). Recommend: yes, and each copy keeps its own bay (finding 1) |
| 7 | A line gets a copy only when the ten-second rule offers it a part; line 1 never | Default | From the decided ten-second rule |
| 8 | `rail.bring` and `Shed.tableLine`: choosing a line brings its copy over the table for everyone | New | Recommend: yes; it is the 5 November "send out trains" feel. Refuse it during a roll-out too (finding 6) |
| 9 | Line chips appear when a second line has a part | Default | |
| 10 | An install spends steel | Decided | "Spent by an install" (10 November, yards) and "counted material starts with the second steel pick" ([10 November](../decisions-core-loop.md#d-2026-11-10-open-calls-answered-the-train-upgrade)). The brief's question 2 treats this as open (finding 8) |
| 11 | The pool is landed less spent; `rotundaStage` and the longer boiler's gate read landed | Default | Right: spending never takes a stage back |
| 12 | The big boiler: a fourth row, 30 m/s, cars unchanged, offered on line 2 at High Gorge | New | Passes the decided ten-second rule (20.0 s). Keep, and leave room above it for High Port's faster engine (finding 9) |
| 13 | Six steel for every boiler step after the longer one | Default | One price table; tuned on the 2D page |
| 14 | The works keeps casting after its first 12, about one a minute while lit | New | Needed anyway: the stand-in route bills spend steel (finding 2) |
| 15 | The rate is tuned so each choice point holds exactly one part | New | Recommend: drop this target (finding 2) |
| 16 | The first real choice is which line gets the next boiler; the choice is order | New | Honest, but thin, and it contradicts the research the brief cites (finding 4). Owner question 5 |
| 17 | The choice is read from trip times on the screen ("Bay trestle 85 s → 70 s"; big boiler's "saving to the line's far end") | Decided, contradicted | "The readouts are speed, cars and resources a minute, with no race strip or trip-time metric" ([10 November](../decisions-core-loop.md#d-2026-11-10-the-train-upgrade-screen-install-plain)). Finding 5 |
| 18 | Never Boogles; looks and whistles keep no price | Decided | [10 November](../decisions-rewards.md#d-2026-11-10-boogles-build-houses-and-upgrade-sources) and its follow-ups |
| 19 | No part has two prices | Decided | Same entry |
| 20 | The first upgrade: free, at the table turn, both Home lines 14 → 20 m/s | Decided | Owner, 15 November, train-progression Q1 |
| 21 | It is the blast pipe, size Medium, the chuff sharpens | Default | A draft name; owner's copy list |
| 22 | Until someone installs it, every engine stays at 14 m/s (a soft gate) | New | Recommend: a gate with meaning, not a soft one (finding 7). Owner question 3 |
| 23 | The longer boiler: free, needs 1 steel, spends none | Decided | "Free, as the reward for reaching steel" (10 November) |
| 24 | Pull-away part, bigger cradle, bigger kit car and plough are not offered | Default | The decided ten-second rule, applied |
| 25 | Anyone installs for the room; the first accepted hold wins | Decided | Shared progression; the 10 November hold |
| 26 | Lines that never stand at Home take an install at their own depot end | Decided | [10 November](../decisions-rail.md#d-2026-11-10-big-junctions-are-designed-stations-not), answer 2 |
| 27 | Both Roundhouses fit every line and keep a copy of each | New | No owner decision against it (answer 2 says "a Roundhouse", not which); it overrides the open agent call "Port Quay's bays hold the lines that never reach Home" (14 November). Owner question 4 |
| 28 | Port Quay: a half ring of nine, seven standing at arrival, nine when its engine comes out | New | The half ring and "standing at arrival" are the open 14 November agent call; `stages: [7, 9]` breaks the brief's own rule (finding 10) |
| 29 | Port Quay's working bay holds the engine built there | Default | junction-stations' reasoning ("High Port's faster engine is built there") |
| 30 | An install at Port Quay needs a second reach point | Default | |
| 31 | A door is open when something stands in its bay | Default | Rotunda call 16, as built |
| 32 | A joining train "arrives" at `tick + ROLL_IN`, its end block held, no boarding before it | New | Recommend: view only, or the wagon's precedent; not a standing train that is not there (finding 6) |
| 33 | Restores and late joiners snap the roll-out | Default | |
| 34 | Five open doors at full Home; copies are solid | Default | |
| 35 | Step order; step 4 when the greybox runs a second long line | Default | |
| 36 | Sim steps build on the in-house ECS facade and the lint rules on main | Decided | Owner-calls, "Engine foundations first", 13 November evening: "for now continue with the prefab stuff", read as "new sim and server work keeps to the in-house ECS facade". Not an owner question (finding 11) |
| 37 | Rotunda step 6's "built after the owner has played" is dropped | Decided | "Nothing waits for a playtest" |
| 38 | The second long line is the bay trestle "at stage 3 on today's map" | Decided, contradicted | Campaign outline, 12 November, answer 1: High Gorge first, in a fixed order. The trestle's leg is `stage: [null, 3]`: never built in that order (finding 1) |

### Findings

Ranked. **(change)** marks what the brief should change before building the step named.

1. **(change, sections 0, 2 and 4; before step 4) The stage 3 trigger is off by one, and it is counted on a map
   order that is not the decided one.** Two errors compound. (a) **The order.** `railway-world-lines.ts` gives the
   trestle's only leg `stage: [null, 3]`: under the decided High Gorge first order it is never built. In that order
   the long lines are line 2 (to High Gorge at stage 3), the north-south line's incline and the bay line's cut
   **together at stage 4**, then the cave line at stage 6. So the second long line arrives as a pair, G-d offers two
   new parts at once, and "Bay trestle 85 s → 70 s" is a line nobody rides. At stage 4 the two new lines are short:
   the incline 1.16 km and the cut 1.23 km, saving about 10.1 s and 10.9 s at 25 m/s, so they only just pass the
   rule. (b) **The count.** Line 2's copy is always on the table unless another line's copy is there, so n fitted
   lines need n − 1 bays: five bays (working, store, three copies) hold **four** lines, not three. Under the decided
   order Home fits exactly four (line 2, north-south, bay, cave), so by the brief's own rule **stage 3 never rises,
   and bays 130° and 250° hold nothing**. Recommendation: (i) each fitted line keeps its own bay, its colour over the
   door, shut while its copy is on the table. Then the fourth fitted line (the cave line, stage 6, about 4.2 to 5 h)
   finds no bay and stage 3 rises with it. (ii) Bay 250° is where **High Port's faster engine** stands once it comes
   home. That is junction-stations' "Port Quay's is where the big engine first stands, and growing Home's is what
   brings it home", given a bay. Home then holds seven things and seven bays: working, store, four lines, the faster
   engine. Rewrite section 4's stage 3 paragraph and the G-d row on the stage 4 pair. Note that the Canopy first order
   (a Beta option) adds the trestle as a fifth line and overfills Home; leave that to Beta.

2. **(change, section 2 and step 0) The steel pool is designed without the route's steel.** `npm run loop`'s
   stand-in bills spend steel on construction from High Gorge on: 42 at High Gorge, 52 at Bell Rock, 24 at Canopy
   Town, 112 at the port, 100 on the White Wall, 4 at the ending (334 in all), while `STEEL.total` is 12. So the
   works must keep casting whatever this brief says, and the brief's trickle (one a minute) meets a demand 30 times
   its own. The "exactly one part at each choice point" target can't hold either way. High Gorge's allowance alone
   is 72 minutes, so one a minute puts about 70 steel in the pool by stage 4 unless the route eats it. Away credit
   and lit time vary by room. This is also the wait-to-afford loop roundhouse-trains warns against ("Renewal ... is
   not an intended wait-to-afford-upgrades loop"). Recommendation: the brief states whether upgrade steel is the
   route's steel. The owner's 12 November "shared pool" words read as one pool, and the 10 November yards answer
   reads as a separate stack in the bay. That meeting is still marked "to confirm" in the rewards log. Step 0's
   page then models the pool against the stand-in bills, and the trickle-to-one-part target is dropped. Owner
   question 2.

3. **(change, section 4; before step 2) The waiting engines need a departure order, or the store lands on a tarp.**
   Checked against the ladder's fleet (`trains: [1, 6, 6, 6, 6]`, 2 at stop 3, 3 at stop 4): six on line 2, so five
   wait at the most. They leave at the Pier (Q6) and the Railhead (Q7), and three at the first stack-leg section,
   after `install`. At `steelhome`, which raises bay 150° as the store, **three still wait**. If either of the first
   two leaves from 170° or 210°, bay 150° holds a tarped engine and the steel at once. Name the order: 250°'s road
   first (the Pier), then 150° (the Railhead), then 170°, 210° and 230° together on the greybox. Two more facts for
   the paragraph. Q6 may come before the Works (owner, 15 November: "the Works or Q6 first"), and canonically it
   does, so the first sight of the Roundhouse usually shows four tarps, not five, and 250°'s road is empty. And
   every join happens while the player is far from Home (the Pier 708 m, the Railhead past 834 m, the greybox past
   1.17 km), which matters for finding 6.

4. **(change, section 2) G-d is a queue, and the research the brief cites recommends a different choice.** In any
   room that bought line 2's big boiler at High Gorge (12 steel in, 6 needed, and nothing else to buy), stage 4 offers
   the two new lines' longer boilers. With the route's steel and a trickle, both arrive soon after, and the obvious
   pick is always the line you are about to ride. That is order, not choice. The brief says so ("the choice is
   order"), which is honest, but section 0's "the first real choice" oversells it. [roundhouse-management](../research/roundhouse-management.md)'s
   verdict, which the brief lists as used, is "one small configuration choice per line": "a single choice between a
   quicker trip and a bigger delivery". [roundhouse-trains](../research/roundhouse-trains.md) says "one reversible
   choice per functioning line". The decided "a boiler sets top speed and how many cars" can carry that (a fast row
   against a strong row per line, reversible at the table) without two prices. Recommendation: ship G-d as an
   honest order with no tuning to force scarcity, call it that on screen and in section 0, and put the reversible
   per-line trade-off to a light `/brainstorm` once cargo trains make "a bigger load" worth something. "Brainstorm
   new gameplay first" applies to G-d and `rail.bring` (step 4), and train-progression's call 24 already held option
   (c) for one. Steps 1 to 3 are decided or engineering and need none. Owner question 5.

5. **(change, sections 2 and 3) Trip-time readouts are decided against.** The owner, 10 November: "village to
   island feels to abstract a metric"; the readouts are "speed, cars and resources a minute, with no race strip or
   trip-time metric". The G-d paragraph puts trip times on the screen ("Bay trestle 85 s → 70 s", "Line 2 to High
   Gorge 166 s → 136 s"), and the big boiler's readout is "the saving to the line's far end". Use top speed and the
   line's resources a minute, as the blast pipe's row already does. The ten-second rule stays the designer's filter,
   off screen.

6. **(change, step 2) The roll-out as proposed puts a train on the platform that is not there.** `arrived = tick +
   ROLL_IN` with the end block held makes the sim say "standing at the Village" while the view shows the engine
   still in its bay. Trains behind it hold at the block for a platform that looks empty (DESIGN 11, "what's on screen
   is true"). The proposal also misses two things: the line's works copy rests on the bridge across the roll-out's
   path (the still from the post shows it there at `steel-home`), and `rail.bring` and the install moment both use
   the table. There is a precedent to copy: the footing wagon's roll-out keeps a due tick (`Shed.ready = tick +
   WORKS.rollTicks`), the view draws the turn from `ready − rollTicks`, and the train couples only when due, holding
   at most `rollTicks`. Recommendation, cheapest first: **(a) view only**. The sim's join is unchanged; the tarped
   engine leaves its bay in the view when the line's serving count rises, and the joining train keeps the ladder's
   whistle and scale-in at the Village. Finding 3 shows nobody is at Home when it happens, so the motion nobody sees
   is not worth a sim step and a bump. (b) If the motion is wanted: a pending join with its own due tick, like the
   wagon's. The train counts as nowhere until due, and the block is checked at the due tick, not held from the
   order. The table refuses `rail.bring` and the install moment while a roll-out is due, and the copy steps off the
   bridge for it.

7. **(change, section 2 and level finding 2; before step 1) The first upgrade as a soft gate breaks a decided number
   when it is missed.** The ladder put 20 m/s at the table beat so "the decided one-minute crossing is never ridden
   at 14 m/s" ("a crossing starts at about a minute: 1.2 km at 20 m/s", 2 November). If nobody holds Install, the
   crossing is 88.6 s. Worse, every footing trip of the route's heaviest stretch (`crossing` 12, `bents` 14,
   `weights` 4, all by wagon) runs at 14 m/s: about +14 s each way to the Pier alone. The table beat's own cue ends
   on the wagon ("a ghost wagon waits on line 2"), which leads the player away from the post. Recommendation: make
   it a gate with meaning. The wagon's roll-out (`commission`) waits for the room's first install, so the order is
   turn the table, install the blast pipe, the wagon rolls. The post is 9.4 m from the handle the player has just
   used, with the part on the stand and the orange knob. Rule 2 holds (the work is the install, nothing skips it),
   and rule 3 holds (solo can do it; the part cannot be lost). The fallback, if the owner wants the garage optional:
   the pipe installs itself when the wagon first couples. Owner question 3.

8. **(change, owner question 2) Spending steel is already decided.** "Spent by an install" (10 November, yards) and
   "counted material starts with the second steel pick" (10 November, garage). "Steel shown, never spent" is the
   11 November agent default for the free longer boiler only. Step 3's `Shed.spent` and the big boiler's price need
   no owner answer; what is open is the pool's relation to route steel (finding 2).

9. **Leave room above 30 m/s.** The stand-ins grant "faster engine" at the port, and junction-stations builds High
   Port's faster engine at Port Quay. If every long line can reach 30 m/s by stage 6 (line 2 at High Gorge; the
   north-south line, the bay line at stage 5 and the cave line all pass the rule for 30), the faster engine has to
   be faster again, and 50 m/s was "a little too fast" (2 November). Give step 0's page a row for the faster engine
   and check the ladder 14, 20, 25, 30 leaves it a felt step (35 to 40 m/s). The 30 m/s row also needs its own
   braking: 129 m to stop at 3.5 m/s², which changes late request stops.

10. **(change, section 5) Port Quay's `stages: [7, 9]` breaks the brief's rule.** Under "a bay rises when there is
    something to keep and no free bay", Port Quay at arrival holds its working bay with the engine built there and
    at most four line copies (three in bays, one on the table). That is five of seven, so nothing ever needs bays 8
    and 9, and "when the engine built there comes out" frees a bay rather than filling one. Under finding 1's fix
    the faster engine *leaves* for Home. Recommendation: one stage. Either seven, standing and complete (growth is
    Home's story; the owner's "a kit for the hubs" does not ask both to grow), or nine at arrival if the station
    plan wants the half ring's look. `rotundaShows`' ruin rule then needs the site field the brief names. The station
    plan measures the ground, as level finding 6 says.

11. **Owner question 5 is answered already.** The owner's 13 November evening words ("let's consider the Bexy step
    later, but for now continue with the prefab stuff, etc.") are recorded in owner-calls with the reading "new sim
    and server work keeps to the in-house ECS facade and the lint rules already on main". Read step 6's "on the
    chosen engine foundation" as that, and use the question slot for the soft gate.

12. **Sequencing against the ladder.** The 15 November entry makes this "the next design brief after the owner has
    ridden this ladder", and the ladder is not on main. Writing the brief now is fine ("Nothing waits for a
    playtest"). Cite where the owner said to start it, since the decision's words put the brief after the ride. Step
    1 already waits on the ladder shipping.

13. **Level, from the still.** From beside the post at `steel-home`, the stand and the longer boiler on it stand in
    front of bay 150°'s door. The store bay's stack, the brief's visible "what the room can afford", is partly behind
    the stand from where players install, and the works copy on the bridge fills the right of the frame. Step 3's
    still should be taken from the post at player height as well as the garage camera. If the stack does not read,
    keep a token pallet on the apron, drawn from the same pool. No reach changes: nothing here gates movement, and
    stage 3 is not a route step. If finding 7 is taken, the loop graph gains a node between `table` and `crossing`,
    and `npm run loop -- run` must pass with it.

**Co-op and solo.** One pool and a shared table read right for 1 to 3 players. Two at the post see one copy, and the
first accepted hold wins. Players split between Home and Port Quay share one pool through two screens, and the
revision rule keeps two installs from colliding. Solo can reach every part, and the first upgrade and the order
choice need no second player. A friend arriving late sees bays, doors and chips as rows. Nothing strands anyone; with
finding 7 taken, the gate is the post one player already stands at.

**Suspect lines** (none rewritten; none The Boogler's): "Free: the first upgrade" sits against the 9 November entry
"the boiler fit is the first upgrade a player chooses" and the built Boiler tile's "The first install. It woke the
trains.". One of the three should give, and it is the owner's wording. "Blast pipe" and "Big boiler" are drafts, and
"big" invites a "bigger" for the faster engine. "STEEL n/6" is in the bill's built style.

**Not added to agent-calls.md:** this review was asked to edit this file only. The author should add calls 1 to 4, 6
to 9, 11 to 16, 21, 22, 24 and 27 to 35 (the New and Default rows above) to the core-loop table, status `open`.

### The owner questions, as I would put them

The brief's five are mostly the right subjects; two should change. Its question 2 asks something already decided
(finding 8), and its question 5 is answered by the owner's standing words (finding 11). My five:

1. **A bay is where the room keeps what it owns and is not running, never bought on its own; each fitted line keeps
   its own bay; stage 3 rises with the fourth fitted line (the cave line, about the fourth hour), and bay 250° holds
   High Port's faster engine once it comes home.** Recommended: yes. Or keep the plan's "stage 3 bought as a row",
   which gives Home two shut doors to pay for. (The brief's question 1, corrected by finding 1.)
2. **Is the steel an install spends the same steel the route's later bills spend (one pool, his 12 November words),
   or does the Roundhouse stack hold its own share?** Recommended: one pool, shown as the stack in bay 150°, with
   boiler steps priced small against the route's bills. A boiler then delays a little building and is never a wait
   of its own. No trickle tuned to force scarcity.
3. **Is the first upgrade a step the route waits for?** Recommended: yes. The footing wagon rolls out after the blast
   pipe is installed, so the one-minute crossing and every footing trip run at 20 m/s. Or keep it optional and let
   it install itself when the wagon first couples.
4. **Do both Roundhouses fit every line, and does Port Quay stand complete at arrival, with no growth stage?**
   Recommended: yes to both. It follows "you still buy at a Roundhouse", and it gives the second hub the faster
   engine's first stall without repeating Home's ruin story. Or Port Quay fits only the lines that never reach Home
   (the open 14 November agent call), and Home's bays past the fifth hold only the faster engine.
5. **Is "which line gets the next boiler first" enough of a choice for now?** Recommended: yes, shown as an honest
   order with no forced scarcity. The research's per-line trade-off, a quicker trip or a bigger load and reversible
   at the table, goes to a light `/brainstorm` once cargo trains give a bigger load a use. Or brainstorm it now and
   hold step 4 for it.
