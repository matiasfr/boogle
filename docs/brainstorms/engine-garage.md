> **Status: proposed (2026-11-10).** Light brainstorm (one agent, three lenses). Mock: [engine-garage-mock.html](../world/engine-garage-mock.html). Owner rulings folded in the same day: cargo cars are an explicit category; trains may be longer than platforms (the passenger cars align); sources load by cargo loaders ([decision log](../decisions.md#decided), 10 November).

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
   (`engine_body_long`, `engine_boiler_long`, `engine_lashing_long`, `src/proto/place/engine-kit.ts:21`).
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
| Cars it pulls | 3 (line 2 today: passenger, cargo, footing wagon) | 4 (new call, suggestion 4) | `TRAIN_CARS`, `src/proto/wagon/cars.ts:17` |
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
| Cars | Passenger roof and lamps | **built, switched off**, no rule ([passenger-car-previz](../plans/passenger-car-previz.md)) | stand-in: copper |
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

## Shape

- **Sync:** the garage view is Local. Fits are lockstep facts: a per-line consist and engine fit on the existing `Shed`
  or `Train` rows, set by one new op (draft `rail.fit { line, part, revision }`), refused unless the part is in the
  store and the consist check passes. Physics never reads it; train-view and the car colliders read it as they read
  `trains` today.
- **Reuses:** engine-kit nodes and `engine_*_long`, roundhouse-view's bolt-on, `trainLegTicks`, the pause card styles
  (`src/features/pause.css`), the shared-moment card, the action interface (Interact, Back).
- **Smallest first build (view only):** the garage at the table, with the pattern engine, the five categories, the real
  states (boiler fitted; longer boiler shown "Needs steel"; Four seats; cargo car; footing wagon once coupled), the
  ghost and Before / After for the longer boiler, and its three readouts. No op, no wire, no save, no `WORLD_NS`. Files:
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

## Open questions

1. **Where does the engine on the table come from?** Recommended: **a works copy the Roundhouse keeps, wearing every fit
   the room has; real trains take a fit at their next Home stop.** Others: call a real line-2 train onto the table
   (it leaves service while someone looks, and breaks "line trains never turn on the table"); no table, frame the real
   train at its Home stop (it leaves after a 5 s dwell). Answer: ___
2. **A new resource's first car: free at its unlock, or bought here?** Recommended: **free at the unlock** (the kiln
   lights, the wagon rolls out); the screen shows it owned and sells better ones. Bought here risks a soft lock (no
   wagon, no pier). Answer: ___
3. **How does the Roundhouse grow for later engines?** Recommended: **keep 9.6 m now; growing the table and stall is
   itself an upgrade, planned with the end-game engine.** Others: build it to the end-game size now (about a 16 m table
   and 16 m stalls); keep 9.6 m for good and never bring big engines to the table. Answer: ___
4. **Where do the map and the logistics view live?** Recommended: **the Roundhouse holds the garage only; the Home
   hall's live line map and the halt boards grow into the map and a small logistics readout.** Others: the Roundhouse
   as the one rail-management building for all three; a new signal box beside Home. Answer: ___
5. **Are cars bought per line or per train?** Recommended: **per line: every train on a line runs the same cars, bought
   once.** Other: per train. Answer: ___

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
