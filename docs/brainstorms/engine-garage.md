> **Status: answered (2026-11-10).** The owner answered the five questions, each as recommended, with four notes ([answers](#owner-questions-answered-10-november), [what the notes change](#acting-on-the-owners-notes-10-november)); [design review](#design-review-designer-2026-11-10) below; [the install moment](#the-install-moment) is specified, and its three questions are answered (10 November, below). Light brainstorm (one agent, three lenses). Mock: [engine-garage-mock.html](../world/engine-garage-mock.html). Owner rulings folded in the same day: cargo cars are an explicit category; trains may be longer than platforms (the passenger cars align); sources load by cargo loaders ([decision log](../decisions.md#decided), 10 November).
>
> **First build (view only, built 10 November, `feat/engine-garage-view`).** Behind `?home=b`: a lever post at the Roundhouse table opens the garage (Interact, "Look at the engine"; Back leaves), with the works copy of the engine and its first car turning on the table, a camera per category, the rail in its two groups, the parts strip with the real states, and the selected part's readouts (top speed, cars as pips, footings and rails and logs a minute, the preview in a second colour, comparing by choosing). "Try it" on the longer boiler is the hold-to-lift install moment (ring, lift, drop, clank, bolts, counting rows, answer, whistle, turn, skip), rests 2.5 s under "Trying it on", then comes off. Local only: no op, wire, save or `WORLD_NS`. Not in: the consist strip, friends' holds, the platform beat, the card, phone-width stills, the crew's gags and sound polish; the ride-time numbers use a planned 1.2 km run until the island halt is in the catalogue. Code: `src/features/garage.ts`, `src/entities/railway/garage-{view,data,state}.ts`; railway state is read only through `roomFacts` in `garage-state.ts`.

# The train garage (engine-garage)

The owner's seed, 10 November 2026: "for engine upgrades, we should mock what the UI looks like, even if accessible at
select locations. For the engines it would be really nice to see something similar to like a need for speed or racing
game car select screen or upgrade screen, so one can visualize the upgrade changes and see the effects." Added the same
day: "Right now we unlock a new resource like the footings at the kiln, and it's sort of implicitly adding a train car
so the trains carry that resource. I would like the train upgrade screen to include cargo cars so that it's something
that can be explicitly upgraded for the network. At some point we may need UI that shows the world map, or one to show
the train logistics etc. Or perhaps that will also be at roundhouse or a new building to manage the rail system." And:
"cars should be able to be longer than platform, just the passenger part has to align with the station platform at
least. resource sources can have cargo loaders that can load where appropriate on the train." On the Roundhouse: "We
should make sure to make a pass on the rotunda so they are appropriately scaled for the new engines as well, and maybe
others in the world if those are the upgrade points."

So the screen is about **the train and the network**, not only the engine. The file keeps its name.

## Pitch

You walk into the Roundhouse at Home, step up to the turntable, and the camera swings down onto an engine standing on
it, lit, slowly turning with the table. Along one edge: Engine, Cars, Cargo, Looks, Whistle. Pick the longer boiler and
a see-through boiler slides onto the engine while one line underneath says "Village to the island: 65 s → 54 s". If the
steel is in, you press Fit; a friend standing at the table sees the same engine and the same press; little guys bolt the
part on, and the real trains wear it from their next stop at Home. This is Need for Speed's garage (vehicle large and
lit on a turntable, categories on one edge, parts swapping live, the change previewed before you commit) cut down to a
goofy co-op railway: no stat bars, three readouts in seconds, seats and loads, and the part on the model doing most of
the talking. It serves **6, Communal world** (the room's train, the room's store), **11, Show, don't tell** (the model
shows the part; the readouts are things you feel) and **7, Telegraph everything** (you see what a fit will do before it
does it). It bends **11** a little: it is a framed screen with cards, which is why it lives in one place only.

## Gut question

Standing at the table, does choosing the next part for the room's train feel like a powerful, shared moment ("we
picked that"), or like opening a shop menu?

## How the seed fits the 9 November decision

The decision ([decisions.md:80](../decisions.md), item 2; [upgrade-choices](upgrade-choices.md), Q1; agent-calls
2026-11-09): upgrades are chosen **in the world at the machine the part changes**, with a works board later on the Home
station, **no menu reachable from anywhere**, and Pause may later show a read-only list. The seed says "even if
accessible at select locations". They fit if the garage is **a framing of a real place, not a menu**:

- It opens only at the Roundhouse turntable, by Interact at a post beside it, with the engine physically there. It is
  never in Pause or on a key, so "no menu reachable from anywhere" still holds.
- The parts it fits still wait in the world first (the steel boiler lies in the Roundhouse bay once Ring Island's steel
  comes home, as the boiler waited on its pedestal; [boiler-first-choice](../plans/boiler-first-choice.md)). The garage
  is how you look at them on the engine before fitting, not a place parts come from.
- The works board on the hall's south end wall ([home-station](../plans/home-station.md), call 29) stays the tree: what
  exists, what is fitted, what is next and where it waits. It points at the Roundhouse; it fits nothing.
- Cargo loaders are upgraded at their source (below), a second kind of upgrade point, still "at the machine".

## Best suggestions, ranked

1. **The Roundhouse turntable is the showroom, with a works copy of the engine on it** (systems + creative). Layout B
   ruled that "line trains never turn on the table" ([decisions.md:83](../decisions.md), "Home gets one coherent
   station"), the world never pauses, and line 2 runs two trains: there is no single real train to drive on, and a
   train held for someone's browsing strands its riders. So the table carries the Roundhouse's own pattern engine,
   wearing every fit the room has, and the real trains take a fit at their next Home stop. Tension: "at the machine the
   part changes" reads most literally as the real train; this is question 1.
2. **Show it on the model, preview it as a ghost, then bolt it on for real** (creative). Selecting an item draws the part
   on the engine as a see-through yellow ghost (the swap is the preview); Before / After flips between the room's engine
   and the preview. Fit replays the boiler fit's staging: the part lifts in, two little guys bolt it, a puff, the card.
   Reuses `roundhouse-view.ts`'s bolt-on pieces (`bolts`, :207, :624) and the engine kit's swap nodes
   (`engine_body_long`, `engine_boiler_long`, `engine_lashing_long`, `src/entities/railway/engine-kit.ts:21`).
3. **Three felt readouts, never bars** (design). Each in the player's units, with the previewed change in a second colour:
   ride time to a named place, what one trip carries (seats, footings, rails), and cars the engine pulls. Computed by
   the sim's own `trainLegTicks` (`src/sim/railway-train.ts:107`), so the number is true.
4. **The longer boiler also pulls one more car** (design, new call). Measured, its speed alone is small: 20 → 25 m/s saves
   10 s of 65 s from the Village to the island (16%), 6 s to the Pier, and **0.2 s** to the Quarry, where the train never
   reaches 20 m/s. The incremental-maths band is a 20–40% cut or a saved trip
   ([incremental-game-maths](../research/incremental-game-maths.md), line 171). "Cars it pulls: 3 → 4" is the categorical
   change that makes it read as power, and it is what the cargo category needs anyway.
5. **Cargo cars are explicit: the consist strip** (design + systems). Under the engine, the line's train as a strip of
   cars in order, the platform drawn under it with the passenger mark, and each source's loader over the car it fills.
   A new resource's first car still arrives free at its unlock (the kiln lights, the wagon rolls out); the screen then
   shows it owned and offers a better one or another (question 2).
6. **Loaders on short gantries at the sources** (creative + systems). A loader rides a short rail along the track and
   runs to whichever car takes its load, so car order can change without moving stops, and it is a machine that shows
   its work ([owner-calls](../agents/owner-calls.md), "Machines show their work physically").
7. **One shared press, seen by everyone** (design). Anyone can Fit; it spends the room's store; the first accepted press
   wins and everyone sees the bolt-on, with the "Steam"-style card for each player once. Two-step confirm in the screen.

## 1. Where it lives, entering and leaving

**The Roundhouse at Home**: the 9.6 m table at the end of the engine spur off road 2 (`src/proto/place/home-station.ts:145`–`154`),
the open stall at 190° (`:157`–`165`), about 33 m from the hall's works board (measured from `TABLE` and `HALL`).

- **Enter:** Interact at a lever post at the table's rim (draft prompt "Look at the engine"). The camera eases from your
  third-person view to a low three-quarter on the table in about 0.6 s; your Buddy stays standing at the post, so others
  see who is looking. The table turns the pattern engine slowly (the real `tableYaw`, `roundhouse-view.ts:199`, is only
  moved by `rail.turn`; the showroom turn is a Local deck spin while no shunt choreography runs).
- **Leave:** Back, or walking off (any move input), or the train you are riding pulling away if you opened it from a car
  (not allowed: the post is on the ground). The camera returns over 0.4 s.
- **The real train meanwhile** keeps its timetable, riders aboard. Nothing in the garage holds a train. A fit lands on
  each real train the next time it stands at its Village stop: the same bolt-on, at the buffer stops, during the dwell
  (`TRAIN.dwellTicks` 50, `railway-train.ts:12`), which also satisfies engine-previz's "the fit happens with the train
  standing; check a rider keeps their place across the rebuild".
- **The shunter and footing wagon** keep their use of the table. While the shunt choreography runs (the wagon's roll-out,
  `railway-systems.ts:805`–`816`, once per world), the garage is closed ("The table's busy", draft) and the pattern
  engine waits in the stall.

## 2. What you see

- **The model:** the pattern engine on the table, the engine-kit nodes the trains use, drawn in the room's fitted state.
  Optionally its first car coupled behind it (engine A 4.68 m over buffers + 0.6 m + the 3.2 m car = 8.5 m, inside the
  9.6 m deck with 0.56 m each end).
- **Camera:** an orbit that only ever turns with the table, at 7–8 m from the centre and 1.6 m up, inside the open arc
  away from the stall frames (the doors stand 8.5 m out at 160–220°); drag or stick nudges ±30° and zoom 0.8–1.2×.
- **A swap:** the selected item as a ghost on the model, Before / After, then the bolt-on when fitted. For cargo the
  model view is the consist strip (below); cars do not all fit on the table.
- **Lighting:** the stall's interior is the backdrop; one warm key from the open door side. After a yes only.

## 3. Felt readouts (three, with the preview in a second colour)

| Readout | Engine A today | With the longer boiler | Source |
| --- | --- | --- | --- |
| Village → the island (line 2's end, about 1.2 km) | 65 s | 54 s | `trainLegTicks`, nonstop, 20 vs 25 m/s at 3.5 m/s² |
| Cars it pulls | 3 (line 2 today: passenger, cargo, footing wagon) | 4 (new call, suggestion 4) | `TRAIN_CARS`, `src/entities/railway/cars.ts:17` |
| What a trip carries | 4 seats · 6 footings · 32 logs and 32 rails (kit) | unchanged | Four seats (passenger previz), `WORKS.wagonCap`, `LINE2_KIT` (`railway-line2-layout.ts:161`) |

The ride time shows to the place the line actually reaches (the island once v26/v27 land; the Pier before: 41 s → 36 s).
The Whistle has no number: its readout is a "Hear it" button. Looks have none.

## 4. Categories and the first entries

Price is **material from the room's store**, with coins shown as "—" until the shared wallet exists. The wallet is
decided (owner, 6 November, [owner-calls](../agents/owner-calls.md), "Shared progression and one shared wallet") but not
built: no wallet code in `src/` or `server/`, and the [money](money.md) brief is still "proposed (2026-11-05)". Materials
are the gates: steel from Ring Island ([ring-island](ring-island.md), suggestion 4), copper later.

| Category | Entry | State today | Gate (stand-in) |
| --- | --- | --- | --- |
| Engine | Boiler fit (the first choice, "Steam" card, `boiler-view.ts:36`) | **built**, live | fitted at the pedestal |
| Engine | Longer boiler (line 2, 20 → 25 m/s; +1 car) | meshes **built, unwired** (`assets/src/engine.py:17`, engine-previz step 4) | steel (Ring Island build 2) |
| Engine | Plough and headlamp, tender (largest current era, [mock-ups](engine-endgame-mockups.md)) | placeholder | steel |
| Engine | End-game engine (Hauler, Dart, Warden: undecided) | placeholder, locked | later materials |
| Cars | Passenger car, Four (knifeboard) | **built**, default; Six is the owner's open pick | free |
| Looks | Passenger roof and lamps | **built, switched off**, no rule ([passenger-car-previz](../plans/passenger-car-previz.md)); a look until it has one (owner's note, 10 November) | coins, once the wallet exists |
| Cargo | Cargo car (stakes and boards; logs and rails) | **built** (`train-view.ts:140`) | free |
| Cargo | Footing wagon (6 footings) | **built**; arrives free at the Works (below) | free at unlock |
| Cargo | Bigger orange cradle (more footings a trip) | planned, the second steel pick (ring-island 4) | steel |
| Cargo | Loader upgrades (faster jib, gantry) | placeholder; fitted at the source | steel |
| Looks | Paint (red today; shared cosmetic, owner 6 November) | placeholder | coins, once the wallet exists |
| Whistle | Today's whistle; a two-tone | placeholder | coins, once the wallet exists |
| (not here) | The 24-rail depot cart (`railway-cart.ts:21`) | **built**, stays 24 (decisions, 9 November) | not a train car |
| (not here, later) | Another train on a line (`RAIL_TRAINS`, `railway-lines.ts:98`) | catalog-driven (generic-lines; v27 sets line 2's count by the wait bound) | parked |

## 5. Co-op

- **The view is Local; the train is shared.** Each player at the post gets their own camera, selection and ghost. The
  pattern engine and every fitted part are room facts everyone sees. A second player's Buddy at the post and a small
  "Pip is looking" tag on your screen are enough; their ghost is not drawn for you.
- **Who can press Fit:** anyone, for the room (owner, 6 November: every upgrade applies to everyone). It spends the
  room's store. Two-step: Fit → "Fit it for everyone?" → Yes. The op carries the revision the presser saw (as
  `rail.turn`'s `e.revision`, `railway-systems.ts:885`–`890`), so two presses at once fit once and the second is
  refused silently.
- **The shared moment:** everyone at the table gets the bolt-on from the garage camera; everyone else gets the card the
  first time they see a train wearing it (the crossing's "a friend who missed it gets it once" rule, decisions.md:56).
- **Late joiners:** the fitted state is in the snapshot; their trains already wear it; the card once on first sight.

## 6. Cargo cars, consists and loaders

### What happens today, implicitly

- **The footing wagon** waits in the Roundhouse stall. When the cradle is fitted (its eight rails,
  `railway-systems.ts:860`–`877`) and the table is turned to line 2, which is the only turn allowed (owner, 10 November:
  the table turns only when the wagon is ready, `:882`–`899`), `commission` (`:805`–`816`) sets `ready` and asks line 2's
  train home. It couples at the Village stop (`:1177`–`1185`; on main it is train slot 1, on the v26 branch whichever
  line-2 train reaches the Village first). Until then train-view draws it under the land (`train-view.ts:96`). Once
  coupled the table is a toy (`railway-works.ts:128`–`129`).
- **Footings ride** at up to `WORKS.wagonCap` 6: loaded at the Quarry from the Works rack, unloaded at the Pier to the
  pier rack (`wagonArrives`, `railway-systems.ts:1097`–`1110`).
- **Q6's kit is train-fed**: at the Village the forge rack's rails and logs go onto line 2's cargo car, up to
  `LINE2_KIT` 32 and 32 (`railway-systems.ts:1186`–`1195`); station 6 refuses hand kit until trains run (decisions.md:80).
- **The cargo car** (car 2) has stakes and boards and no seats (`train-view.ts:140`–`143`); the cradle takes only rails
  (works-late-game Q1); the 24-rail cart is a separate vehicle.
- **The trains themselves** appear at the boiler fit ("Steam" / "Trains run both lines."); line 2 runs two from it
  (agent-calls, 10 November, generic-lines calls 10–11).

So every resource unlock so far changed a consist or a train's job without saying so: the boiler adds trains, the kiln
adds the wagon, Q6 adds kit to the cargo car.

### The explicit version

- **A consist is per line**: the engine plus an ordered list of cars, the same on every train of that line, bought once
  for the line (question 5). Per train would double every purchase and players cannot tell two line-2 trains apart.
  One wrinkle: there is one footing wagon, and on v26 it couples to one of line 2's two trains. Under per-line
  consists the other train gets its own wagon free, as part of the same unlock (rolled out of the stall when it next
  stands at the Village), so the line's consist is true of both trains. The mock's "Second footing wagon" is a further
  buy: a second wagon on every train of the line, 12 footings a trip.
- **The first car of a new resource is free, at its unlock** (question 2). The kiln lights, the wagon rolls out, it
  couples: that beat stays as it is. Buying it instead would be a dead beat at best and a soft lock at worst: the pier's
  footings only travel by the wagon, so a room that can't or won't buy it can't reach Ring Island. The garage shows it
  owned from then on, and offers the better cradle and, later, a second car.
- **Car upgrades in felt terms:** seats (passenger: Four, Six, roof and lamps), footings a trip (cradle 6 → bigger),
  rails and logs a trip (kit car 32 → more), and no speed per car.
- **Length:** trains may be longer than platforms (owner, 10 November). The passenger car is fixed directly behind the
  engine, and each halt's stopping mark is chosen so it stands on the deck. Trains run push-pull on stubs and
  crossovers (generic-lines section 5), so the engine is always at the same end in `s` and one mark serves both
  directions. A balloon loop turns the train round, so the first loop (Ring Island's halt, v27) needs a mark per
  direction: flag for v27.

**Measured against today's numbers** (train reference = car 1's centre; engine front 6.54 m ahead, each car 3.7 m
behind; `cars.ts:18`):

| Where | Deck | Today | What bounds a longer train |
| --- | --- | --- | --- |
| Home, line 2 (road 2 s 5.70–23.70, 18 m) | 18 m | stop s 17.0; train s 8.0–23.5, 15.5 m, all on the deck | behind: the engine spur's points at s 5.5 (2.5 m spare); ahead: the double track's merge at s 34 (generic-lines.md:252), 10.5 m spare. With car 1 on the deck (centre at most s 22.1) the stop can move 5.1 m forward: **one more car fits** (stop to s 20.7). Two more need the spur's points or the deck moved |
| Home, line 1 | 18 m | engine + 2 cars, 11.8 m | same stub shape: room for 2–3 more |
| Older halts | 20–24 m | fits | open line beyond; the Quarry halt's front is 6.8 m short of the gate (6.4 m jambs, open overhead: cars may stand through it) |
| Pier (s 719–741) | 22 m | stop s 726.5, tail at s 717.5, already 1.5 m off the deck's end | the parked track layer ahead (2.7 m clear, `railway-works-layout.ts:36`); behind is the open trestle |
| Camp (line 1's end) | | | 8.8 m of line beyond the front |

Two passenger cars (Four + Four, 7.4 m of seats) fit every deck at 18 m and over, behind the engine.

**Flags for the v26/v27 rules, not designed here:** the block rule spaces trains by `sepCm` 2740 = the train's length
(`RIDER_SPAN` 740) + 20 m (generic-lines.md:147); a longer consist must add its extra length there and to the end-block
reservation (a stub's train must not foul its own merge turnout while standing). A 40 m-diameter balloon loop is about
126 m round: never the binding limit for a 15–25 m train. Plank crossings and turnouts within a train length of a stop
go into level-check once consists can grow.

### Loaders

What already behaves like one: the Quarry's footings hopping from the Works rack onto the cradle and off at the pier
rack (`wagonArrives`; drawn `train-view.ts:369`); the forge rack feeding Q6's kit at the Village; the shunter handing the
wagon over on the table; the crossing's jib hanging counterweight footings ([ring-island](ring-island.md), the Meet).

- **A loader comes with its resource's unlock** (the Works gets its footing loader when the kiln lights). Its upgrades
  (faster, a second arm) are fitted **at the source**, not in the Roundhouse: the garage lists them read-only with
  "Fitted at the Works".
- **Gantry, not a fixed spot**: a loader runs on a short rail beside the track (two car lengths, about 8 m) to the car
  that takes its load, so consist order can change and the stop is still chosen by the passenger mark. The purchase
  check refuses an order that leaves a loaded car outside every gantry.
- **Hand carries kept**: the rope hauls (boiler, great beam) and "help carry" (`help-carry.ts`), the footings rack to
  jib at the crossing, the stall's two footings. Loaders replace only repeat carries of the same item past the second
  (the grind budget: each item by hand at most twice).

### Never purchasable into a broken state

The purchase check refuses, with the reason on the card: a consist whose passenger car can't stand on every halt's deck;
a works whose resource has no car or no loader that reaches it; a consist longer than the engine pulls, than the line's
end blocks allow, or than the block spacing assumes. Cars are only added or upgraded, never removed, until a design
needs removal.

## Scale audit of the upgrade points

Trains that must fit: engine A at 1.25× (4.68 m over buffers, 2.31 m over the steps, cab roof 3.30 m, chimney 3.08 m;
engine-previz, "The candidates"); with the longer boiler (5.18 m, chimney 3.25 m, same roof); cars 3.2 × 2.2 m
(passenger roof 2.77 m); line 2's train 15.5 m; the largest current era 8.4 m with tender, 2.4 m wide, 3.4 m tall; the
end game 10.7–14.0 m, 2.3–2.55 m wide, 3.1–3.6 m (Warden's stacks 4.1 m), undecided
([engine-endgame-mockups](engine-endgame-mockups.md)). The gates and Home's canopy were measured for 1.5× today's height
(3.1 m; engine-previz, "Height").

| Place | Measured | Engine A / longer boiler | Current era 8.4 m | End game 10.7–14.0 m |
| --- | --- | --- | --- | --- |
| Turntable (`home-station.ts:150`, `roundhouse-view.ts:111`) | 9.6 m disc, 0.24 m thick, top 2 cm proud; no pit; spur 15 m radius through 60° + 1.5 m, level yard | **fits**: 49% / 54% of the deck; reads as a toy on a plate, fine with its first car beside | **fits**, 0.6 m each end: reads right, a full table | **too small** by 1.1–4.4 m; overhangs 0.55–2.2 m each end |
| Open stall (`home-station.ts:157`) | door 3.6 m clear, 4.0 m high, 9 m deep; frame 4.4 m; door 8.5 m from the centre | **fits**: 0.65 m each side, 0.70 m over the roof | **fits**, 0.6 m long and 0.6 m head | **too short** by 1.7–5.0 m; Warden's stacks 0.1 m over the door |
| The shunt round the table | wagon and shunter 3.6 m apart, bogies ±1 m (`roundhouse-view.ts:40`, `:169`) | unchanged | unchanged | unchanged |
| Works board (hall south wall; `HALL` `home-station.ts:136`, 13 × 6 m, roof 4.6 m) | a board, no train | fits | fits | fits |
| Home canopy | underside at least 4.6 m over the rail | fits (riding the cab roof: 0.4 m into it, engine-previz) | fits | fits (Warden's stacks 0.5 m under) |
| Quarry and sea gates | jambs 6.4 m, headstock 5.9 m | fits | fits | fits |
| Double track (4 m centres, 7.6 m decks) | widest 2.55 m | 1.7 m between passing trains | 1.6 m | 1.45 m; 0.53 m to the deck's edge |
| Forge goods dock (road 1 buffers s −5.53) and the Works throat (8 m cut, open above; `railway-works-layout.ts:22`) | loader upgrade points only; no train stands in them | fits | fits | fits |
| Engine shed | none: the open stall is the shed; the other two stalls are ruin outlines | | | |
| 4% grade | only the crossing's bow (`railway-works-layout.ts:56`–`58`); no upgrade point stands on a grade | | | |

**Ruling:** nothing needs rescaling for the first build or for anything through the current era. The end-game engines
need the Roundhouse grown: about a 16 m table (radius 8) and 16 m stalls with doors 4.0 m clear by 4.6 m high, the doors
moving from 8.5 to about 12 m out and the spur re-laid. That touches `home-station.ts` `TABLE` and `STALLS` (Place
layout constants), `roundhouse-view.ts`'s own `R = 4.8` (fold it into `home.TABLE.r` while there), `SHED_TABLE` and
`SHED_STALL` in `src/sim/railway-works-layout.ts:32`–`33` (sim reach points: a mixed-builds note), the shunt path,
`test/home-station.test.ts` and level-check. No save shape changes, so no `WORLD_NS` bump on its own. It belongs with
the end-game engine's plan, not before the showroom; growing it could itself be an upgrade (question 3).
`roundhouse-view.ts` is being edited on the v26 branch now, so any Roundhouse build waits for v26 to land.

## Acting on the owner's notes (10 November)

### (a) The ground the grown Roundhouse needs: keep it clear

Measured on layout B (`home-station.ts`, run through `TABLE`, `stallFrame`, `roadAt` and `PROPS`). Today the Roundhouse
reaches 17.5 m from the table's centre on the stall side. Grown for a 14 m engine it is a 16 m table (radius 8 m), doors
12 m from the centre and stalls 16 m deep, so it reaches **28 m**.

**Keep-clear constraint for the rail map and the station plan** (nothing built, planted or routed inside it):

- **The table:** a circle of 10 m radius (the 8 m deck and a 2 m walk round it), centred 3.2 m beyond today's centre
  along the spur's own line, so the spur's end stays where it is. Road 2 passes 13.0 m from today's centre; the grown
  deck's rim must not come nearer than about 5 m to road 2's centreline, which is why the centre moves out and not the
  rim in.
- **The stalls:** a fan from that centre out to **30 m**, across the stall bearings 160°, 190° and 220° with 15° each
  side (145° to 235°): about 700 m² of level ground at the table's height (y 18). At 12 m the 30° spacing leaves 6.2 m
  between door centres, enough for a 4.8 m frame.
- **The approach:** the ground between road 2 (s 0 to 35) and the table, kept free so the spur can be relaid on a wider
  curve. Today's 15 m radius through 60° is tight for a 14 m engine; allow 25 m.
- **Height:** 4.6 m clear over the spur, the deck and the stall doors (Warden's stacks are 4.1 m).

What stands in it today: only the stone yard prop (`PROPS.yard`, 12.9 m from the centre), which moves when the table
grows. The nearest track to the grown stalls' backs is 27 to 37 m away and the hall is 31 m or more, so neither is
touched. Not measured: whether the terrain is level out to 30 m on the stall side, and what the whole-map blockout puts
there. Today's production Roundhouse (`SHED_TABLE`, in the village between the platform, the forge wall and its stall)
has no such room; the growth assumes Home has moved to layout B.

### (b) Lines long enough to be worth an upgrade

A speed fit's saving depends on the run. From `trainLegTicks`, nonstop from a stand, 20 → 25 m/s at 3.5 m/s²:

| Run | Example | Now | With the longer boiler | Saved |
| --- | --- | --- | --- | --- |
| 157 m | Village to the Quarry | 13.6 s | 13.4 s | 0.2 s (1%) |
| 193 m | line 1, Village to the Camp | 15.4 s | 14.9 s | 0.5 s (3%) |
| 300 m | | 20.8 s | 19.2 s | 1.6 s (8%) |
| 500 m | | 30.8 s | 27.2 s | 3.6 s (12%) |
| 710 m | line 2 today, Village to the Pier | 41.2 s | 35.5 s | 5.7 s (14%) |
| 1.0 km | | 55.8 s | 47.2 s | 8.6 s (15%) |
| 1.2 km | line 2 to the island (v26) | 65.8 s | 55.2 s | 10.6 s (16%) |
| 2.0 km | | 105.8 s | 87.2 s | 18.6 s (18%) |
| 3.0 km | | 155.8 s | 127.2 s | 28.6 s (18%) |

Three things follow.

- **Under about 115 m a train never reaches 20 m/s**, so more top speed does nothing at all, and a stop on request
  cuts a long line into short runs of exactly that kind.
- **A 25% faster engine can never save more than 20% of a trip**, however long the line. To reach the 20 to 40% band
  of [incremental-game-maths](../research/incremental-game-maths.md) by speed alone a fit must be a bigger step:
  20 → 30 m/s saves 29% over 2 km. Or it must bring something besides speed, which is why the longer boiler also
  pulls a car.
- **Capacity is felt on any line**, short or long: a car, a bigger cradle or a faster loader changes what a trip
  carries, and is worth offering wherever the job still needs three or more trips at the old size.

**Rule of thumb** (a default, logged):

1. A speed fit is offered on a line only when it saves **at least 10 s end to end**. At today's step that is a line
   of about **1.1 km or more**. Line 2 qualifies once it reaches the island; line 1 (193 m) never does.
2. A new main line in the rail map should be **at least 1 km end to end, and 1.5 to 3 km where the ground allows**,
   so each engine fit on it is felt. A short branch gets capacity, loader or acceleration fits, never top speed.
3. The screen shows the saving for the line being upgraded, so a fit that does nothing there is never offered there.

Throughput on line 2 to the island, one train, a round trip of two runs and three 5 s stands (147 s now, 125 s with
the longer boiler): footings 2.5 → 2.9 a minute at 6 a trip; a bigger cradle or a second wagon changes that in
proportion; rails and logs 13.1 → 15.3 a minute at 32 a trip. Planned lines are not laid out yet (the rail map is being
written), so their rows are the length rows above.

### (c) Functional and cosmetic, kept apart

The rail has two groups, visibly separated, each with a small heading:

- **Upgrades** (they change what the train does, and may change its look too): **Engine, Cars, Cargo.** Priced in
  material. Each shows readouts and the line preview.
- **Looks and sounds** (they change nothing the train does): **Looks, Whistle.** Priced in coins once the wallet
  exists. No readouts; the card says "The look only", and a whistle's is "Hear it".

Rules: an entry is in one group only. Anything with no rule is a look until it gets one, so the passenger car's roof
and lamps move from Cars to Looks. A look can never change a number. The Design Table's train slots (a flag, a side
accessory, a chimney accessory) are the Looks entries, with paint beside them.

### (d) The preview of what a functional fit does

Beyond the readout numbers, three things show the effect:

1. **On the engine:** in After, the works engine's wheels turn and it chuffs at the previewed speed where it stands.
2. **The line strip:** under the picture, the line drawn as a strip with its halts named, and two small trains running
   the same trip, "Now" above and "After" below, started together, so After pulls ahead and arrives first, labelled
   "55 s, 11 s sooner". Both run from `trainLegAlong`, so the race is the real timetable sped up.
3. **What reaches the far end a minute:** one line per load the fit changes ("Footings reaching the island a minute:
   2.5 → 2.9"), from the trip's load and the round trip. For a car or a cradle the strip's After train carries the
   larger load drawn on it.

**The first build includes** the line strip and the per-minute lines for the longer boiler, and the wheels and chuff on
the table. The loads drawn on the strip's trains come with the consist strip.

## Shape

- **Sync:** the garage view is Local. Fits are lockstep facts: a per-line consist and engine fit on the existing `Shed`
  or `Train` rows, set by one new op (draft `rail.fit { line, part, revision }`), refused unless the part is in the
  store and the consist check passes. Physics never reads it; train-view and the car colliders read it as they read
  `trains` today.
- **Reuses:** engine-kit nodes and `engine_*_long`, roundhouse-view's bolt-on, `trainLegTicks`, the pause card styles
  (`src/features/pause.css`), the shared-moment card, the action interface (Interact, Back).
- **Smallest first build (view only):** the garage at the table, with the pattern engine, the five categories in their two groups (Upgrades: Engine, Cars,
  Cargo; Looks and sounds: Looks, Whistle), the real
  states (boiler fitted; longer boiler shown "Needs steel"; Four seats; cargo car; footing wagon once coupled), the
  ghost and Before / After for the longer boiler, its readouts (only those the part changes), and the functional
  preview: wheels and chuff at the previewed speed, the line strip and what reaches the island a minute. No op, no wire, no save, no `WORLD_NS`. Files:
  new `src/features/garage.ts` and `garage.css` (plugin DOM), new `src/entities/railway/garage-view.ts` (pattern engine,
  ghost, camera), a post and hook in `roundhouse-view.ts` (after v26), the engine kit, and a pure readout helper over
  `trainLegTicks`. Then **fit 1** rides Ring Island build 2: the steel in the bay, the op, the per-line fact (a saved
  field: a `WORLD_NS` bump with build 2), the bolt-on at Home's buffers. Then the consist strip with the gantry loaders.
- **Risks:** it reads as a shop (keep it to one place, three readouts, the model first); the pattern engine reads as a
  fake (question 1); orbit camera on phones (no free orbit; nudge only); the long boiler's small speed gain (suggestion 4).

## Done means

- `look` at the Roundhouse, `?home=b`, spawned at the post with the boiler fitted: the garage open, the engine centred
  and lit, the stall behind; one still at desktop and one at phone width.
- The longer boiler selected: the ghost on the engine, "65 s → 54 s" in the preview colour, Before / After toggled
  (two stills).
- Two players (`test:net` pair or a seeded two-tab look): both at the post, one presses Fit (after build 2): both see the
  bolt-on; the next line-2 train standing at the Village wears it; a rider keeps their seat across the swap (real-time).
- A late joiner after the fit sees the trains already wearing it and gets the card once.

## Strings (drafts for the owner; none are The Boogler's)

"Look at the engine" (prompt) · "The table's busy" · "Engine" · "Cars" · "Cargo" · "Looks" · "Whistle" · "Fitted" ·
"Ready to fit" · "Needs steel" · "Needs copper" · "Fitted at the Works" · "Free with the kiln" · "Fit" · "Fit it for
everyone?" · "Yes, fit it" · "Not yet" · "Before" · "After" · "Hear it" · "Village to the island" · "Cars it pulls" ·
"What a trip carries" · "seats" · "footings" · "rails" · "logs" · "Pip is looking" · "Fitted for everyone" · "Platform"
· "Passenger cars stop here" · "Too long for the line's end" · "Nothing can load this". The fit card reuses the boiler's
pattern; its words for the longer boiler are not drafted (the owner's, as "Steam" was).

## Owner questions answered (10 November)

The owner's message, verbatim:

> Engine garage: answers
>
> 1. Where does the engine on the table come from? A works copy the Roundhouse keeps, wearing every fit the room has;
>    real trains take a fit at their next Home stop (recommended)
> 2. A new resource's first car: free at its unlock, or bought here? Free at the unlock (the kiln lights, the wagon
>    rolls out); the screen shows it owned and sells better ones (recommended)
> 3. How does the Roundhouse grow for later engines? Keep 9.6 m now; growing the table and stall is itself an upgrade,
>    planned with the end-game engine (recommended)
> 4. Where do the map and the logistics view live? The Roundhouse holds the garage only; the Home hall's live line map
>    and the halt boards grow into the map and a small logistics readout (recommended)
> 5. Are cars bought per line or per train? Per line: every train on a line runs the same cars, bought once
>    (recommended)
>
> Notes: For answer 3. we should make sure the map can accommodate the growing scale. If we're upgrading per train
> line, then lines should be plenty long where it's worth the upgrade. Also maybe we should split purely cosmetic
> upgrades from functional ones in the UI (can also have a visual change). And maybe we should have some preview of
> what the functional change will do to speed/ resource gathering/moving etc.

All five are decided ([decision log](../decisions.md#decided), 10 November). The other options considered were: a real
train called onto the table, or the real train framed at its platform (1); bought here (2); built to the end-game size
now, or kept small for good (3); the Roundhouse as the one rail-management building, or a new signal box (4); per train
(5).

## Owner notes, round 2 (10 November, on the garage-frame mock)

His words: "Instead of fit, maybe Install sounds more cool. Im not sure we need the comparison race visual. resources/min and speed or cars makes sense. village to island feels to abstract a metric. for the longer boiler, maybe certain boilers are faster but also raise the cap of the amount of cars. In general this should be really satisfying to upgrade"; and "Instead of a before/after button, toggling between the current option and the upgrade is sufficient".

These supersede the text above and the design review where they differ:

- **The verb is Install** ("Installed", "Ready to install"), not Fit. Earlier sections keep "fit" as written; read it as install.
- **Readouts are speed, cars and resources a minute.** No race strip, and no trip-time metric such as "Village to the island" (section 3 and note (d) above proposed both).
- **A boiler sets two things: top speed and how many cars the engine pulls.** Orchestrator's reading of "maybe certain boilers are faster but also raise the cap": this answers the review's question 1 (the longer boiler: 25 m/s and four cars), and it is the rule for every later boiler; whether a boiler may raise only one of the two is open.
- **No Before / After button.** You compare by choosing the part you have or the upgrade in the parts strip; the picture and readouts follow the choice.
- **Installing must be really satisfying.** Not designed yet. The first build's install moment is the next design step: what the little guys do, the sound, the camera, how the readouts land and what everyone else in the room sees. It gets its own design review before it is built.

The mock (docs/world/engine-garage-mock.html) carries the first four. Two questions stay open: hold to install or press then confirm; roof and lamps as a look or an upgrade. The install moment is now designed, with its own review: [The install moment](#the-install-moment).

## The install moment

Designer, 2026-11-10, on the owner's round-two note ("In general this should be really satisfying to upgrade"). A spec
for one install from press to rest, to be built with the first build's view and judged there by a "Try it" (section 9
below). It is also this step's design review: the calls, findings and owner questions are at its end.

Read for this: the brief above, the round-two mock, DESIGN.md, the game-feel skill, `src/render/reward-reveal.ts`, the
boiler fit (`boiler-view.ts:38`, `FIT`: a 0.45 s flight, a clank and a dust ring), `shared-moment.ts`,
`camera-pull-out.ts` (one highlighted skip after 0.8 s), the forge's roofing crew (`forge-finish.ts`, on
`folk.crewStart` / `crewSend`), `machine-sfx.ts` (chuff, thump, clank, whistle), `ui-sound.ts` (tick, pop, thunk, count,
flap), `impact.ts` (a 55 ms hit-stop is the game's existing size), the Sound decisions of 1 November, and the top blocks
of [construction-sound](../research/construction-sound.md), [audio-mix](../research/audio-mix.md),
[ui-patterns](../research/ui-patterns.md) and [upgrade-economy](../research/upgrade-economy.md). **Not seen:** any of
this in motion, the garage in the game (it is not built), layout B's table with a jib beside it, a phone. Everything
timed below is a starting value to tune from a real-time capture (owner, 4 and 5 November: motion is judged in motion).

**The idea in one line:** your hold cranks the part up over the engine; finishing the hold drops it; the engine
answers. Three beats carry it and everything else is dressing:

1. **The hold that is the lift, ending in the drop and the clank** (input you can feel, a breath of quiet, one hard hit).
2. **The engine answers**: a puff, the wheels spinning up with the chuff quickening to its new rate, the whistle.
3. **The numbers land**: speed, cars and a minute's load count from old to new just after the hit.

If the rest were cut (the table's show-off turn, the crew's gags, sparks, the card, the camera push), these three would
still be an install worth pressing for. Build them first and in this order.

### Three sizes of install

An install's size is set by what the part is, so a bigger upgrade is longer, louder and has more happen. Sizes are a
tunable table, not three code paths.

| | Small | Medium | Large |
| --- | --- | --- | --- |
| What | a look, a whistle | a car, a cradle, a plough or lamp | a boiler, a new engine |
| Hold | 600 ms | 900 ms | 1200 ms |
| Hang before the drop | none | 120 ms | 180 ms |
| Hit-stop | none | 50 ms | 70 ms |
| Camera shake (trauma, of 1) | none | 0.2 | 0.35 |
| Sparks, dust, steam at the hit | 8 sparkles | 8, 6, 8 | 14, 10, 16 |
| Bolts | none | 2 | 4 |
| Crew | one little guy | two | two, and one falls over |
| The engine's answer | a pop | one heavy chuff, a short toot | the run-up and the full whistle |
| Show-off | a half turn | a tug or a half turn | a full turn of the table |
| Press to rest | about 1.8 s | about 3.5 s | about 5.2 s |
| Card | none | none | the boiler's card pattern, once (the owner's words) |

### The reference install: the longer boiler (Large), beat by beat

`h` is milliseconds since the press; `c` is milliseconds since the commit (`c+0` is `h+1200`).

| When | On the table | Camera | Sound | Readouts and button |
| --- | --- | --- | --- | --- |
| `h+0` | The press frame. The two little guys at the jib grab on: one at the crank, one with a hand on the part where it lies on its stand by the table. They crouch (squash to 0.9 for 120 ms). The table's idle turn eases to a stop over 300 ms | Starts a slow push-in | A grip thunk; the first ratchet click | The ring round Install starts to fill |
| `h+120` to `h+1200` | **The hold is the lift.** The crank turns and the part rises off its stand and swings in over the engine, its place along that path set directly by the ring (released, it goes back the same way). It ends hanging 0.6 m over its seat. The ghost on the engine brightens as the part nears (0.45 to 0.7). In the last third the guys strain: the part wobbles ±2° | Pushed in 8% by the end, scrubbed with the ring | Ratchet clicks quickening from 6 to 14 a second and rising seven semitones; chain creak under them | Ring fills. Releasing drains it in 250 ms: the part lowers home, one soft thunk, nothing spent, no "cancelled" message |
| `c+0` | **Committed.** The ring completes; input is locked; the op is sent and the moment plays at once from the prediction. The crank guy lets go. The part lifts 6 cm and hangs | Quick push to the part's close framing, arriving at the hit | The ratchet stops. Ambience ducks. 180 ms of near quiet | Ring flashes and becomes a filled disc; a soft pop |
| `c+180` | The drop: 0.6 m in 140 ms, speeding up | | A short falling whoosh | |
| `c+320` | **The hit.** The part meets the ghost, which flashes white for 60 ms and is gone: the part is solid. Hit-stop 70 ms on the garage's own clock. Sparks from the seam, a dust ring from under the wheels (as the boiler fit's) | Shake 0.35, decaying in 400 ms | Clank and a low thump together, the loudest sound of the moment | |
| `c+390` to `c+650` | Squash and settle: the engine sinks on its springs (0.94 tall, 1.03 wide) and comes back past true and settles; the table deck dips 3 cm; both guys leave the ground and the crank guy lands sitting | Eases back to the wide garage view by `c+1100` | Spring creak; ambience returns over 400 ms | |
| `c+650` to `c+1450` | Bolting. The guide guy runs four bolts down, one every 200 ms: each bolt head pops in (to 1.2 and back to 1) with one small spark | Wide, still | Four ratchet zips, each a step higher than the last | **The numbers land** (below): from `c+650`, each changed row counts old to new |
| `c+1450` | **The engine answers.** The safety valve puffs; the engine shudders (±1.5°, dying in 300 ms); the wheels spin up from the old rate to the new over 600 ms | Still | A steam burst; chuffs quickening with the wheels and then holding the **new** rate | |
| `c+1800` | The whistle blows, with a plume | Still | The full whistle (1.5 s), carried across the island | Rows settle from the preview colour to ink over 400 ms; Install becomes "Installed" with a stamp-down pop |
| `c+1800` to `c+4000` | **The show-off.** The table makes one full turn in 2.2 s, eased at both ends; the key light swells by a fifth and comes back; the guys stand back, one waves | Holds. The table turns, the camera does not | Table rumble; the chuff at its new rate under it | The Large card, once per player, after the turn |
| `c+4000` | Rest: the idle turn and the breathing steam resume, at the new chuff rate. The stand by the table is empty | Yours again | | The strip shows the boiler as the installed part |

**Skipping.** From `c+800` Interact shows the game's one skip chip and jumps to rest (the shot rule of 9 November). The
hit at `c+320` can never be skipped; a skip snaps the numbers and still gives the whistle. Back does nothing between
`c+0` and rest or skip.

### 1. The commit: hold to install

**Ruling: hold, no dialog.** The hold costs about the same second as a confirm, protects the room's store from a stray
press just as well, and is the anticipation instead of a question before it. It is also the reason the rest works: the
ring is the crank, so the lift is yours and the drop is the game's.

- **Feel:** the response starts on the press frame (owner, 6 November, "Input gets instant feedback"): the grab, the
  first click and the ring's first sliver. Ring, lift height, click rate and pitch are one value. The last third pushes
  back a little (wobble, a slower-looking crank) so completing it is a small effort.
- **Cancel:** release at any point before 100%. Never punished, never a message. A tap (under 150 ms) plays the grab
  and lets go, and the button's label pulses "Hold to install" once.
- **Inputs:** hold Interact on a pad or keys, or hold the Install button by mouse or touch, through the action
  interface. Sliding a finger off the button is a release.
- **After 100% there is no undo**, so the commit line is unmistakable: the ring's flash, the stop of the ratchet and
  the quiet are the "it's done" before the hit.
- **A refusal** (a friend's install of the same part was accepted first) changes nothing you see: theirs and yours are
  the same moment. Any other refusal lifts the part back to its stand with `deny`, as the boiler fit's `refuseFit` does.

### 2. On the table

- **Who:** two little guys and a short jib at the table's rim, the jib a rigid machine (post, arm, crank, chain, hook)
  that shows its work (owner, 5 November). They are the forge's roofing crew pattern (`folk.crewStart`,
  `forge-finish.ts`), kept as lo-fi as they are ("Some lo-fi is character"). Before a part can be installed they stand
  about; with a part ready they stand at the jib; when you select a part they both look at it.
- **From ghost to solid:** the solid part and the ghost are never both on the engine. The ghost is the place; the part
  travels to it; the white flash at the hit is the join.
- **The squash is the engine's, not the part's:** the part is rigid steel and lands dead; the engine, the deck and the
  crew take the weight. That contrast reads as heavy.
- **Slapstick** (principle 10) lives in the crew, from a small pool so the same gag never runs twice in a row: the crank
  guy sits down hard; the spanner is dropped and caught; the puff takes a hat off. Local, cosmetic, cut first if it
  costs time.

### 3. Camera, and who sees what

- **Yours:** push in with the hold (8%), a quick push to the part for the hit, back to the wide view during the
  bolting, then still while the table turns. It ends where the garage camera always sits, so there is no return blend
  and no moment of lost control beyond the lock. The table shows the engine off; the camera never orbits by itself.
- **A second player in the garage view:** sees the lift from the first frame of the hold (the holder's part and ring
  value ride their presence, a few numbers), with the tag "Pip is installing the longer boiler". On the commit they get
  the whole moment on their own camera with the same push, their own ghost hidden until rest, their readouts counting
  too. Holding the same part at the same time: the first accepted commit wins and both rings complete into it.
- **A player standing at the table, not in the view:** the same thing in the world on their ordinary camera: the jib,
  the drop, the sounds placed at the table, the table's turn. No camera is taken.
- **A player elsewhere:** no camera is taken, at any size (question 2). They hear the Large whistle across the island
  and get one small corner note ("Pip installed the longer boiler", the ability-arrival flourish, never a card that
  stops them). Their payoff comes to them on the platform.
- **The platform beat, the second and smaller one.** Each real train takes the part the next time it stands at Home,
  inside its 5 s dwell, in about 1.5 s: two little guys at the platform's end, a steam puff that covers the swap at
  400 ms, a clank and a short squash of the engine, a short toot at 1200 ms, and the new chuff rate as it pulls out. A
  new car couples at the tail with a buffer clank and a jolt down the train. No camera, no hit-stop, no lock; riders
  keep their seats. Home's departure board says which train takes it next. A player who saw neither beat gets the card
  once, the first time they see a train wearing it (call 36).

### 4. Sound

Layered one-shots from the existing procedural recipes, each fired by the visible thing (construction-sound,
recommendation 2), with weight and no sparkle: an install is matter moved into place, not a pickup.

| Layer | When | Source |
| --- | --- | --- |
| Grip | `h+0` | `uiSound('thunk')` |
| Ratchet clicks, 6 to 14 a second, +7 semitones | the hold | new short click recipe in `machine-sfx.ts`, placed at the jib |
| Chain creak | the hold | new, quiet, under the clicks |
| The quiet | `c+0` to `c+320` | ambience ducked 4 dB and sustained machinery 3 dB, 80 ms in, 400 ms out from `c+390` |
| Whoosh | `c+180` | new, 140 ms |
| Clank and thump | `c+320` | `clank` and `thump`, same frame |
| Ratchet zips, rising | each bolt | the click recipe, run fast |
| Steam burst | `c+1450` | `chuff(…, 1)`, three as the Works' mouth does |
| Chuff, old rate to new | `c+1450` on | `chuff`, timed by the wheels |
| Whistle | `c+1800` | `whistle` with the wide range |
| Count ticks | the readouts | `uiSound('count', +1)`, the kept haul count run |
| Stamp | `c+1800` | `uiSound('pop')` |

- **Music:** none plays today (1 November: the groove is cut and no placeholder plays), so the duck is ambience and
  machinery. When the owner's music exists it takes the voice duck's depth over the same window, back by `c+800`.
- **The new chuff rate is heard at once, as a change.** 20 to 25 m/s is a quarter faster, which is hard to hear as two
  steady rates and easy to hear as an accelerando, so the wheels run up over 600 ms and the chuff follows them. From
  rest on, the works engine's idle chuff is the new rate.
- At most six voices sound together; the clank wins.

### 5. The readouts landing

Only the rows the part changes (call 37): for the longer boiler, top speed, cars it pulls, and each load a minute.

- **Before the install,** with the upgrade selected, a row reads old → new, the new value in the preview colour (the
  ghost's yellow).
- **Nothing moves until the hit has happened.** From `c+650`, one row at a time, 150 ms apart, top to bottom: the
  "old →" folds away and the number counts from old to new in 500 ms, fast then slowing, a count tick per step rising
  in pitch. It lands with a pop (to 1.25 and back in 180 ms), still in the preview colour.
- **Cars is not a count:** it is a row of car pips, and the fourth pip drops in with its own small clank.
- **A minute's load** counts in tenths (2.5 to 2.9).
- At `c+1800` every landed row settles from the preview colour to ink over 400 ms. That change of colour is the screen
  saying it is now true.
- No race strip and no trip time (owner, 10 November).

### 6. Comparing by choosing

The strip holds the part you have (marked "Installed") and the upgrades. There is no other compare control.

- **Choose an upgrade:** within 100 ms its ghost arrives, sliding 0.4 m along the way the part will go on, in 220 ms
  with a small overshoot; the rows change to old → new with a 150 ms roll; the wheels turn and the engine chuffs
  quietly at the previewed rate; the crew look at it. One soft tick, pitched by the tile's place in the strip, so
  running along the strip plays a little scale.
- **Choose the part you have:** the ghost lifts off and fades in 160 ms, the rows show today's values in ink, the
  wheels fall back to today's rate. The same tick, at that tile's pitch.
- Every choice interrupts the last one's motion at once; flicking between two tiles is the comparison and must never
  wait on a tween. The camera moves only when the category changes.
- **A part you can't install yet** arrives as a paler, greyer ghost with its reason on the tile ("Needs steel"); the
  crew sit.
- **Idle:** the table turns at 6° a second (a turn a minute) and stops while you nudge the view; the cylinder cocks
  breathe a wisp every 3.2 s with a soft hiss; the ghost's brightness breathes between 0.45 and 0.6 every two seconds;
  with a part ready, Install carries a slow sheen.

### 7. By category

They differ in the direction of the hit and in who answers.

| | How it arrives | The hit | The answer | Show-off |
| --- | --- | --- | --- | --- |
| **Engine part** (boiler, plough, lamp) | lifted by the jib, dropped from above | downward: clank, hit-stop, squash, bolts, steam | chuff run-up and whistle (Large); a heavy chuff and a toot (Medium) | the table turns |
| **Car** (passenger, cargo, a second wagon) | the table lines up with its approach road and stops turning; two little guys push the car down the road, their distance set by the hold, and at the commit give it a shove so it rolls the last 2 m free | sideways: buffers meet, a 50 ms hit-stop, the car and the engine jolt 12 cm and spring back one after the other 80 ms apart, the hook drops with one click. No bolts, no steam | the engine takes the weight: one heavy chuff and a short toot; a new car pip drops in | a tug: the engine draws the train 1.5 m forward and back |
| **A better car body** (the bigger cradle) | by the jib, onto the car | downward, Medium | the load pips refill to the new size | a half turn |
| **Look** (paint, flag, accessory) | one little guy with a long brush, or the flag run up its staff | none: a colour wipe from nose to tail in 500 ms, or the flag snapping out. No hit-stop, no shake | 8 sparkles, a pop; no readouts | a half turn |
| **Whistle** | screwed on with two zips | none | **the new whistle, blown in full, across the island**: the sound is the install | none |

In Cars and Cargo the train is longer than the table (engine and first car are 8.5 m of 9.6 m), so the works train
stands across the table and its approach road, the table stays lined up, and the camera sways ±15° in place of the turn.

### 8. Length, repetition, comfort and budget

- **Length:** 1.8, 3.5 and 5.2 s from press to rest by size, of which the hold is 0.6, 0.9 and 1.2 s. Control is
  locked only from the commit to rest or skip.
- **How often:** the catalogue is about a dozen installs over the six hours, so this is rarely repeated and should not
  be cut down for speed. Two rules keep a second and third install in one visit from dragging: the show-off turn plays
  for a Large install always and otherwise only for the first install of a visit; and the crew's gag changes.
- **The tenth install** is the hold, the drop, the hit, the bolts, the answer and the numbers, with a different gag:
  about 2.5 s for a Medium, and skippable from `c+800`.
- **Reduced motion** (`reducedMotion`): no camera push, shake, hit-stop, wobble, table turn or count animation. The hold
  and its ring stay; the part cross-fades from ghost to solid in 200 ms at the commit; one clank, one still puff that
  fades, the whistle; the rows change colour and value in one step. About 1.5 s after the hold.
- **Flashing:** the white flash is on the part only, 60 ms, never the screen.
- **Phone budget:** all particles through the existing pool, at most 40 alive at the Large hit (24 on a phone, by
  halving the counts), so no new draws for effects. New draws at the table while the garage is open: the jib (4), the
  crew (the folk crew's own), the bolts as one instanced mesh, one per ghost node; ten or fewer in all, no new light
  (the key's swell is its own intensity), no post effect. The hit-stop freezes the garage's animation clock only: the
  frame loop, the sim and the world behind carry on. The count writes each row's text at most 20 times and animates
  only transform and opacity.

### 9. In the first build (view only)

So the feel can be judged before any purchase rule exists:

- **"Try it"** on the longer boiler, where Install will be: the same hold, ring and lift, then the whole Large moment on
  the works copy, Local to you. It rests for 2.5 s with the rows in the preview colour under a "Trying it on" tag, never
  "Installed", then comes off again in about 1.2 s: the bolts zip out, the jib lifts the part back to its stand, the
  ghost returns, the rows count back down in 300 ms. Nothing is sent, saved or shown to anyone else, so what is on
  screen stays true for the room.
- Also in: the selection feel of section 6, the idle of the table, the readouts' count, the reduced-motion version and
  the skip.
- Not in: the presence of a friend's hold, the platform beat and the card. They come with the op in fit 1.
- **Proof before the owner's look** (verification; owner, 4 November): a real-time capture of one Try it at desktop and
  at phone width, with the frame of the press and the frame the part first moves (the boiler fit already records
  `pressFrame` and `movedFrame`), and the frame of the hit against the clank.

### Install calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| I1 | The verb is Install; readouts are speed, cars and a minute's load; no race strip, no trip time; compare by choosing | Decided | Owner, 10 November |
| I2 | Installing must be really satisfying, and is designed before it is built | Decided | Owner, 10 November |
| I3 | Anyone installs, for the room; the works copy takes it first and the real trains at their next Home stop | Decided | 6 and 10 November |
| I4 | The response starts on the press frame | Decided | 6 November, "Input gets instant feedback" |
| I5 | Once committed nothing ends the moment but one highlighted skip | Decided | 9 November (the shot rule) |
| I6 | The jib is a rigid machine that shows its work, with a storyboard and parts sheet first; the little guys stay lo-fi; motion starts simple | Decided | 5 November, three calls |
| I7 | Sounds are procedural; no music plays, so the duck is ambience and machinery | Decided | 1 November (Sound). Finding 1 |
| I8 | **Hold to install, no dialog; the hold drives the lift; release cancels freely** | New | Take it. Question 1 |
| I9 | Three sizes of install, set by the part, on one tunable table | New | Take it: it is how a bigger upgrade feels bigger |
| I10 | Nobody's camera is taken away from the table, at any size; far players get the whistle, a corner note and the platform beat | New | Take it. Finding 2, question 2 |
| I11 | The holder's lift is seen by others from the first frame (presence), before the commit | New | Take it: it makes the press a shared thing to watch |
| I12 | The real trains' platform beat is about 1.5 s inside the dwell, with no camera | New | Take it; refines call 30 |
| I13 | A jib and its two little guys stand at the table's rim | New | Take it. The crew is Place's folk code, already live at the forge: it still fits, keep. Finding 3 |
| I14 | Installing a car lines the table up with its road and stops the idle turn in Cars and Cargo | New | Take it. Finding 4 |
| I15 | A whistle's install is the whistle blown across the island | New | Take it |
| I16 | "Try it" in the first build; kept in the game afterwards for parts you can't install yet, in a lighter form | New | Take the first; question 3 for the second |
| I17 | Holds of 600, 900 and 1200 ms; hang 120 and 180 ms; hit-stop 50 and 70 ms; shake 0.2 and 0.35; the drop 0.6 m in 140 ms; the squash 0.94 | Default | Tunables. 55 ms is the game's existing hit-stop |
| I18 | Bolts 2 and 4 at 200 ms; particle counts; the three crew gags | Default | Tunables |
| I19 | The numbers land from `c+650`, 500 ms a row, 150 ms apart, a pop, the preview colour until `c+1800` | Default | Tunables |
| I20 | Cars shows as pips, not a number | Default | An integer going 3 to 4 has nothing to count |
| I21 | The show-off turn: always for Large, otherwise once a visit; skip from `c+800` | Default | Follows the shot rule's 0.8 s |
| I22 | Selection: the ghost in 220 ms, a tick pitched by tile, idle turn 6° a second, a wisp every 3.2 s | Default | Tunables; inside finding 12(d)'s 100 to 300 ms |
| I23 | The chuff changes rate as a 600 ms run-up | Default | A quarter faster is hard to hear as two steady rates |
| I24 | The duck: ambience 4 dB, machinery 3 dB, for about 400 ms; six voices at most | Default | [audio-mix](../research/audio-mix.md)'s voice-claim depths |
| I25 | Reduced motion and the phone budget as section 8 | Default | |
| I26 | Strings: "Hold to install", "Try it", "Trying it on", "Pip is installing the longer boiler", "Pip installed the longer boiler" | Default | Drafts for the owner; none are The Boogler's. The Large card's words are the owner's |

### Install findings

1. **The install leans on two sounds the 1 November audit cut.** "Wagon whistle and clacks" and "stoke roar and chuffs"
   were cut with "better sounds come later, from references". `machine-sfx.ts` has a chuff and a whistle live at the
   Roundhouse and the Works today, and beats 2 and 4 use them as the engine's whole answer. They need the owner's ear in
   the Try it; if they are not good enough the answer is weak, and the fix is those two recipes, not this spec. There
   is also no music to duck, so the quiet before the hit comes from ambience alone and from stopping the ratchet.
2. **This departs from one reading of "shared moments play for everyone" (10 November).** The gates take every camera
   in the room. An install is chosen by someone who opened a screen, there may be a dozen of them, and it has a second
   beat that travels to everyone anyway. Taking a rider's or a carrier's camera for it would cost more than it gives.
   The decision's text is the orchestrator's reading of an unfinished sentence, so this is put to the owner.
3. **The jib is a new thing in the world and is unplaced.** It must stand at the rim outside the stall arc (160° to
   220°), off the spur and its approach, clear of the lever post and of the garage camera's arc, and move out with the
   table when the Roundhouse grows (it sits inside the keep-clear, as the stone yard does). No still was taken; the
   builder proves the spot with one from the garage camera and one from the platform. It adds no route and no reach.
   Not checked: whether the folk crew can run here while another crew is out (the forge's is done long before).
4. **A new car does not fit on the table with the engine and first car** (8.5 m of 9.6 m), and the brief's section 2
   already sends cargo to the consist strip. So the car install happens on the table's approach road, which fixes the
   table's angle in those two categories. That is a visible difference between categories, which helps; it also means
   the car install needs the spur clear, so it is closed while anything is shunting there.
5. **The works copy must not lie during a Try it** (principle 11, and finding 2 of the first review). It is Local, it
   is tagged, it comes off again by itself, and nobody else sees it.
6. **Do not spend the moment before it is earned.** If Try it stays in the game it should be the lighter version (no
   whistle, no turn, no card), so the real install is still bigger than its rehearsal.
7. **Solo and together.** Solo it is complete as written. Together the hold is something to watch and the far player's
   beat is on the platform; a friend arriving late finds the trains wearing the part and gets the card once.

### Install owner questions

1. **Committing an install.** (a) **Recommended: hold for about a second; your hold cranks the part up, finishing it
   drops the part; release to cancel; no dialog.** (b) Press Install, then confirm. Answer (owner, 10 November): "Hold for about a second (the hold lifts the part; letting go lowers it back); no dialog" (a).
2. **Players away from the table.** (a) **Recommended: nobody's camera is taken. They hear a new boiler's whistle
   across the island, get a small corner note, and see the part go onto their train at its next Home stop.** (b) A new
   boiler or engine plays for everyone in the room like a gate; smaller installs as (a). Answer (owner, 10 November): "They keep their camera, hear the whistle, and see the part go onto their train at Home" (a).
3. **"Try it" after the first build.** (a) **Recommended: keep it for parts you can't install yet, in a lighter form
   (no whistle, no turn, no card).** (b) First build only; remove it once Install exists. Answer (owner, 10 November): "Keep it for parts you can't install yet, in a lighter form" (a).

## Parked

- **A world / rail map view.** Home: the hall's live line map (decisions.md:74, home-station step 12) and the halt
  boards' island map (decisions.md:63) grown to show every line, its trains and what each carries; the whole-network
  rail map another agent is building today (`docs/world/rail-map.html`, not on main yet) is its 2D design page. Not a
  screen: a wall you stand at. A Roundhouse room or a signal box adds a place but no information the wall can't show.
- **A train logistics view** (what each train carries, where it is, its waits, what each works is owed). Smallest
  useful readout: on each halt's departure board, the next train's cargo as icons and counts ("footings 4/6") and, on
  the hall's line map, a dot per train with a load pip. Keeps "light train management, no signals or timetables" (the
  coordinator's reading of the Line Map board's leaning; not in the repo) and "show, don't tell". A signal box only
  earns its place if players ever route trains, which generic-lines rules out.
- Buying another train for a line here (today the catalog's `trains`, v27 sets it by the wait bound).
- Articulated short cars, to fit more on a short deck.
- A test run from the table (a ghost train round the line at the previewed speed).
- Paint and whistles, once the wallet exists.
- Loader upgrades as their own small garage at each source.

## Design review (designer, 2026-11-10)

Written across the owner's answers of the same day, so his five answers appear here as decided calls.

Read for this: DESIGN.md, owner-calls, the decision index and its 2, 6, 9 and 10 November entries, the newest playtest
(10 November), [incremental-game-maths](../research/incremental-game-maths.md),
[upgrade-economy](../research/upgrade-economy.md), [ui-patterns](../research/ui-patterns.md),
[route-contract](../research/route-contract.md) and
[progression-flow-layout](../research/progression-flow-layout.md); the code at `home-station.ts:145`–`165`,
`cars.ts:10`–`24`, `railway-train.ts`, `railway-systems.ts:800`–`900` and `railway-works-layout.ts:32`–`33`;
`npm run loop`; the mock at 1280 and 400 px; and two stills of today's production Roundhouse (`--rail-seed wagon-on`,
from the planned garage camera and from 30 m along line 2's platform). Not seen: layout B's Roundhouse in the game
(`?home=b`), any motion, and a phone in the game.

**Fit and order** (game-direction check). Outcome: the room picks its train's next part as a shared, visible moment (6,
7, 11), at the place the 2 November Design Table gave the job. The view-only build is parallel work with one
integration dependency (v26's edits to `roundhouse-view.ts`); fit 1 needs Ring Island build 2's steel; consists need
the v26/v27 block rules. Nothing here reorders the Ring Island work or waits for the owner.

### The calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The train's upgrade screen lives at the Roundhouse | Decided | Design Table, 2 November ("the roundhouse is where you unlock, upgrade, customize and send out trains, with a light management feel"); owner seed, 10 November |
| 2 | It opens only by Interact at the table; no menu from anywhere; the works board stays the tree and fits nothing | Decided | 9 November, upgrade choices are made in the world |
| 3 | Anyone fits, for the whole room | Decided | 6 November; 9 November |
| 4 | A part waits in the world beside its machine before it can be fitted | Decided | 9 November, boiler first |
| 5 | The longer boiler is engine A's upgrade and the first steel pick, 20 → 25 m/s on line 2; the bigger cradle is second | Decided | 10 November |
| 6 | Cargo cars are an explicit category | Decided | Owner seed, 10 November |
| 7 | Trains may run past platforms; the passenger car aligns; each source has a loader | Decided | 10 November |
| 8 | A works copy stands on the table wearing the room's fits; real trains take a fit at their next Home stop | Decided | Owner, 10 November, answer 1. Finding 2 |
| 9 | A new resource's first car is free at its unlock; the screen shows it owned and sells better ones | Decided | Owner, 10 November, answer 2. Finding 1 |
| 10 | The Roundhouse stays 9.6 m; growing table and stall is an upgrade planned with the end-game engine; the map keeps the ground | Decided | Owner, 10 November, answer 3 and note. Finding 6 |
| 11 | The Roundhouse holds the garage only; the hall's line map and the halt boards grow into the map and a logistics readout | Decided | Owner, 10 November, answer 4 |
| 12 | Cars are bought per line | Decided | Owner, 10 November, answer 5. Finding 8 |
| 13 | Functional upgrades and cosmetic ones are split on the screen | Decided in kind ("maybe we should split"); the layout is a Default | Owner note, 10 November. Two headed groups on one rail: Upgrades (Engine, Cars, Cargo), Looks and sounds (Looks, Whistle); section (c) |
| 14 | A functional fit previews what it does to speed and to what gets moved | Decided in kind; the form is a Default | Owner note, 10 November. Wheels and chuff, the line strip, per-minute lines; section (d) |
| 15 | Passenger car Four by default; the depot cart stays 24 rails and is not a train car | Decided | 10 November; 9 November |
| 16 | Train looks are shared, bought from the wallet, in three slots (flag, side accessory, chimney accessory) | Decided, and the entries here depart from it | 6 November; Design Table. Finding 7 |
| 17 | The longer boiler also pulls one more car (3 → 4) | New | **Take it, with the fourth place filled in the same build by steel's own car.** Finding 3, question 1 |
| 18 | An engine has a car limit at all ("Cars it pulls") | New | Take it: 4 is what Home's road 2 holds, so the rule and the yard agree |
| 19 | Fits are priced in counted material from the room's store while the wallet is unbuilt | New | **Take it from the second steel pick on; the first steel fit is the part itself, uncounted.** Finding 4 |
| 20 | The garage is a framed screen that takes your camera in a world that never pauses | New | Take it (it bends 11, in one place only). Finding 5 |
| 21 | When the garage first opens | New (the brief is silent) | **When the footing wagon has gone out and the table has no other job.** Finding 9 |
| 22 | Line 2's second train gets its own footing wagon free | New | It follows from per line (call 12), and it doubles footings to the ring. Finding 8 |
| 23 | A second footing wagon as a purchase | New | Not in the first list until footings have a job after the Meet. Finding 8 |
| 24 | Players can change a consist's order; the purchase check refuses a broken one with a reason | New | **Change it: no reordering; an entry that can't be fitted is shown locked with its reason, never offered and then refused.** Finding 10 |
| 25 | A speed fit is offered on a line only when it saves 10 s end to end; new main lines are at least 1 km | Default | From the owner's note; section (b). Tunable |
| 26 | Loaders ride a short gantry (about 8 m); their upgrades are fitted at the source and listed read-only here | Default | Follows 10 November and 9 November. Finding 11 |
| 27 | Loaders replace only repeat carries past the second; rope hauls and help-carry stay | Default | Ring Island's grind budget |
| 28 | Cars are added or upgraded, never removed | Default | Nothing can be un-bought into a soft lock |
| 29 | The passenger car stands directly behind the engine; one stopping mark per halt | Default | Follows 10 November; the loop's second mark is flagged for v27 |
| 30 | A real train takes the fit while standing at the Village during its 5 s dwell | Default | Keep the dwell: a quick swap with a puff on the real train; the full bolt-on is the table's |
| 31 | Enter in 0.6 s, leave in 0.4 s; camera 7–8 m out, 1.6 m up, nudge ±30°, zoom 0.8–1.2× | Default | Tunables |
| 32 | Leaving: Back, or any move input | Default, changed | **Back only.** Move input has to walk the list on a pad |
| 33 | Your Buddy stays at the post; "Pip is looking" tag; a friend's ghost is not drawn | Default, amended | The tag names the part ("Pip is looking at the longer boiler") |
| 34 | Fit is two steps: Fit, then "Fit it for everyone?" | Default, changed | **Hold to fit (about 0.8 s, the little guys lifting the part as the ring fills), no dialog.** Question 2 |
| 35 | Two presses at once fit once; the second is refused silently | Default | The second presser sees the same bolt-on |
| 36 | Everyone at the table gets the bolt-on; others get the card on first sight of a train wearing it | Default | Follows the Meet's rule |
| 37 | Felt readouts, no bars; the change in a second colour | Default, amended | Show only readouts the selected part changes |
| 38 | Coins shown as "—" until the wallet exists | Default, changed | Looks show no price until there is a wallet |
| 39 | The passenger car's roof and lamps sit under Cars at a copper price | Default, changed | A look until it has a rule (section (c)). Question 3 |
| 40 | Stand-in prices (6, 10, 4, 4 steel); the plough needs the longer boiler | Default | Stand-ins, tuned when the steel works has a rate |
| 41 | The garage is closed while the shunt runs ("The table's busy") | Default | Moot under call 21; keep the line for any later shunt |
| 42 | Strings | Default | Drafts for the owner; none are The Boogler's. Suspect: "Fit it for everyone?" and "Not yet" (call 34), "Nothing can load this" and "Too long for the line's end" (call 24) |
| 43 | First build: the view only, no op, wire, save or `WORLD_NS` | Default | **Take it.** Finding 12 |

### Findings

1. **The free first car needs a pointer, not a price.** Decided: free at the unlock. One fact for whoever builds the
   next resource: today's wagon does not roll out when the kiln lights. It goes out after someone puts eight rails on
   the cradle and turns the table (`railway-systems.ts:860`–`899`), and `npm run loop` lists stall, cradle and table
   as three of the route's five beats with no cue; the owner on 10 November "didn't know what to do at the stall and
   cradle, or why to turn the table". So "the screen shows it owned" should also carry the moment the car joins: the
   Cargo strip, and the works board, say that the wagon is on line 2 and what it carries. A later resource's first
   car should arrive with its unlock and no errand of its own.
2. **The works copy: two conditions.** The stills add a reason for it: from 30 m along the platform today's table is a
   flat grey disc that nothing marks, and an engine standing on it is the landmark that says engines are worked on
   here. Conditions: the copy wears exactly the room's state and a preview is only ever the ghost (11, "what's on
   screen is true"); and since the far train lags by up to a round trip (about two and a half minutes), the fit card
   and Home's departure board say which train comes in for it next.
3. **Pulling a fourth car is right, but a number is not a payoff (question 1).** Section (b) shows a 25% faster engine
   can never save more than 20% of a trip, and saves 16% to the island: under
   [incremental-game-maths](../research/incremental-game-maths.md)'s band, which also asks for "at least two
   opportunities to enjoy it". "Cars it pulls: 3 → 4" reads as power only if a fourth car is there to couple. Steel is
   the new resource of that build, line 2 already runs three cars and Home's road 2 holds exactly one more, so steel's
   own free first car is the fourth. Build them together.
4. **The first steel fit is the part, not six steel.** The mock prices the longer boiler at "6 steel", but the Ring
   Island decision is that steel comes home as the boiler, and the 9 November rule is a part waiting beside its
   machine. Counting starts with the second pick. Two rules for the counted store: it is a physical stack in the bay
   that shrinks when a fit is made, and nothing the main route needs is priced in a material that can run out (rule 3
   of [progression-flow-layout](../research/progression-flow-layout.md#the-rules-as-lenses): keys can't be lost). Say
   in the brief whether the steel works casts without end. **Owner, 10 November: "The longer boiler, the first steel install: Free, as the reward for reaching steel"**, as recommended; the mock's "6 steel" is dropped.
5. **The mock still reads as a shop page, not a racing game's garage.** After today's edit it has the two groups, the
   line strip and no dead readout. It is still paper cards on a page: a flat side-on drawing in about a quarter of the
   frame that does not turn, a priced list beside it, and the selected item's card below.
   [ui-patterns](../research/ui-patterns.md) (not cited by the brief) says to pick a side per piece of information,
   the world or a bold overlay; this screen is the overlay and should commit to it. The next version should be one
   16:9 garage frame: a real render of engine A on the table filling it (the long-boiler nodes are built, so two
   `look` stills give Before and After), a thin rail on one edge, the parts as a strip, the readouts and the line
   strip on the picture.
   **Restaged (10 November):** the mock is now that frame, built on renders of the game's own train parts staged as a
   showroom on the table (`dev/look/garage-showroom.ts`, embedded by `dev/look/garage-mock-images.ts`): a camera per
   category with a crossfade, the previewed part as a yellow ghost (the real `engine_*_long` and `car_upgrade` nodes),
   Before / After, the rail, the parts strip and a stats column with the line strip. Stills only: the turning table,
   the wheels and chuff of section (d), the ghost's sound and the stall interior are not in it.
6. **Scale: the footprint is now stated, with two things unproved.** Section (a) gives the keep-clear numbers. Engine A
   on the 9.6 m deck is half the deck; with its first car coupled (8.5 m) the table is full, so always show the car.
   Unproved: level ground out to 30 m on the stall side, and which Roundhouse the garage targets (the brief measures
   layout B; production draws its own at `SHED_TABLE`, with no room to grow).
7. **Looks should be the decided slots:** a flag, a side accessory and a chimney accessory, with paint beside them.
   The mock's teal paint and brass bands are stand-ins.
8. **Per line gives line 2 a second wagon, which changes Ring Island's pacing.** Two wagons double how often six
   footings reach the railhead, against a build paced at "cap 6, three loads, about 12 minutes" (ring-island build 1,
   call 5). Decide it with the consist build and re-run that pacing; until then one wagon stays. The purchasable
   second wagon needs a use for footings after the Meet before it is listed.
9. **The first meeting is missing, and the stall is taken until the wagon leaves.** The brief parks the works copy in
   the stall while the shunt runs, but before the roll-out the stall holds the wagon and the shunter. After the wagon
   couples the table has no job (10 November: it is not offered again). So the garage opens then: the works engine
   comes out onto the empty table, and a familiar place becomes newly playable. The showroom turn is a Local display
   spin and does not reopen "Turn the table". The arrival needs a storyboard and a real sign at the table (owner, 9
   November: signs in the world).
10. **Don't sell and then refuse.** A check that answers "Nothing can load this" after the press is a failure the
    player couldn't foresee (7). Players do not reorder cars (the core loop: "no routing or quotas"); the game orders
    them, passenger car first, and the gantry is the design's own tolerance.
11. **Loaders.** A loader upgrade's readout is the same felt unit as the cars' (what reaches the far end a minute),
    and the garage's read-only "Fitted at the Works" row is what joins the two kinds of upgrade point, so it belongs
    in the first Cargo build.
12. **What the first build must have to be the screen the owner asked for.** (a) The real engine on the real table,
    turning, at least half the frame. (b) A staged frame: the stills show the backdrop from the planned camera is the
    bright village, the forge wall and the sky, with the stall a small shed behind, so "the stall's interior is the
    backdrop" is not what the camera sees. Face the open stall, darken and soften what is outside the table (a Local
    vignette and focus), and let the world carry on behind. Prove it with a still before building the UI. (c) The
    camera moves with the category. (d) The ghost arrives within 100–300 ms of the selection, with a sound ("input
    gets instant feedback"). (e) Before / After. (f) The two groups, and readouts on the picture. (g) The functional
    preview of section (d). (h) Phone: the picture on top, the parts as one strip under it; at 400 px the line strip's
    labels need their own size, since scaled down they are about 8 px. Without (a), (b) and (g) it will be judged as
    a menu.
13. **Co-op, solo and the route contract.** Solo works unchanged. Together, the table at Home is a natural place to
    meet (lens 8), and the named tag and the visible lift carry the shared moment. Nothing strands anyone: no train is
    held, Back always leaves, the first car is free. The garage adds no travel edge and no ability; a faster train and
    a fourth car skip distance and trips, never work, so no reach check is needed for the view-only build.

### Owner questions

1. **The longer boiler.** (a) **Recommended: faster (66 s → 55 s to the island) and pulls a fourth car, filled by
   steel's own car.** (b) Faster only. (c) A bigger speed step and no extra car. Answer: ___ (not on the owner's 10 November page; the "Free" answer below prices this part, not its speed or car).
2. **Committing a fit.** (a) **Recommended: hold for about a second while the little guys lift the part; no dialog.**
   (b) Press Fit, then confirm. Answer (owner, 10 November): "Hold for about a second (the hold lifts the part; letting go lowers it back); no dialog" (a).
3. **Roof and lamps on the passenger car.** (a) **Recommended: a look, until it has a rule.** (b) An upgrade, with a
   rule to be written. Answer (owner, 10 November): "A look, until it has a rule of its own" (a).
