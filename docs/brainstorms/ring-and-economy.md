> **Status: proposed (2026-11-06).**

# The ring and the economy

Design only; no game code. Built on the owner's 6 November direction (a ring with something in the middle, shortcuts
through it, a choice of where to go next, shared persistent resources, producers that start slow and upgrade, harder
train upgrades) and the same day's follow-up (hands first, machines later, then a new tier by hand). Recorded owner
answers it keeps: Split-rock Works next, then Ring Island; the smallest Roundhouse first; about eight hours for the main
game.

- **Model:** [economy-model.xlsx](../economy/economy-model.xlsx), with the same data as CSVs in
  [docs/economy/](../economy/). Built by `node dev/economy/build-model.ts` from
  [ring-data.ts](../../dev/economy/ring-data.ts).
- **Page:** [ring-economy.html](../world/ring-economy.html), with the map, the flow, the pacing curve and the
  hands-versus-machines charts.
- **Research:** addenda to [upgrade-economy.md](../research/upgrade-economy.md#addendum-6-november-ring-and-hub-worlds-and-shared-stock)
  (ring-and-hub worlds, shared stock) and
  [incremental-game-maths.md](../research/incremental-game-maths.md#addendum-6-november-hands-first-machines-later-then-a-new-tier-by-hand)
  (the manual-to-automatic crossover).

## Pitch

**A co-op incremental you explore like a Metroidvania.** Every new material starts in your hands: you find it, carry it
home and build with it. Connecting its place starts a producer that is slower than you at first. Its upgrades, built
from the newest material you've found, pass one player and then a whole crew, so the railway takes over the bulk while
you set off for the next material, which starts in your hands again. The world is a ring of places around Home. You reach
each place the long way round, then build a spoke home as a shortcut, and after Ring Island you choose which way to go
around the ring. Closing it turns the railway into a loop line.

Serves DESIGN.md's **Toys before chores** (hauling stays the verb), **Cooperation is automatic** (anyone's hauling and
any connected producer fill the same yard), **Telegraph everything** (the shard and the ring are visible from Home),
**Leave something for the next visitor** (yards fill, stacks wait) and **Show, don't tell** (stock is stacks, upgrades
are additions you can see). It bends **Communal world, personal rewards**; see Tensions.

**Where it's new ground.** The co-op incrementals found (Clicker Heroes clans, Idle Together) share a number. Boogle
shares a place: the incremental climb is physical hauling that machines gradually take over, and each new tier is
reached by exploration with abilities and route shortcuts, not bought.

## Gut question

**"When the machine passed your hands, did it make you want to go and find the next material?"**

## Research, in short

- **Ring and hub:** Dark Souls reaches places the long way and rewards you with a shortcut back to Firelink; Hollow
  Knight's stag stations are found, then opened once; A Link Between Worlds makes order free by building each dungeon
  around its own tool; A Short Hike keeps one goal visible while a resource widens where you can go; Outer Wilds pays in
  knowledge. Sources in the [upgrade-economy addendum](../research/upgrade-economy.md#addendum-6-november-ring-and-hub-worlds-and-shared-stock).
- **Shared stock:** Satisfactory's Dimensional Depot is one pool every builder draws from, with upgradable rate and
  capacity; Factorio's chests double capacity in visible steps; Valheim levels a workbench by building additions beside
  it from newer materials; Stardew's shared wallet needs house rules, which is why Boogle's stock only builds shared
  things.
- **Incrementals:** A Dark Room and Kittens Game repeat "by hand, then automated" for each new resource; Increlution only
  lets you automate what you've done by hand; Idle Miner Tycoon's bottleneck moves between stages; Shapez delivers to a
  hub that speeds up every machine; prestige is not needed when a new tier restarts the race. Sources in the
  [incremental addendum](../research/incremental-game-maths.md#addendum-6-november-hands-first-machines-later-then-a-new-tier-by-hand).

## The world

**Home is the hub** at the centre: town, forge, the Home Yard and the Roundhouse, with Split-rock Works on the same
island. **Ring Island sits on the ring**, about 1.2 km north (the owner's one-minute crossing at 20 m/s), reached by the
first sea crossing from the pier: that crossing is the **entry spoke**. Around the ring, a quarter-turn (about 1.9 km)
apart: **Canopy Town** to the west, **High Port** to the south, **High Gorge** to the east. The **Original Island** lies
outside the ring beyond High Port.

1. **Home:** Line 1 and Line 2, as built.
2. **Split-rock Works** (the owner's pick for next): walk east, find the ankle rings on the way (approved jump brief),
   strike the seam (approved gate brief), carry the first footings home by hand, then connect the Works.
3. **Ring Island** (the owner's pick after it): the first crossing, the aperture brace, the steel works. The Roundhouse
   opens when it's connected (the 2 November idea), in its smallest form.
4. **The branch choice.** From Ring Island, go west to **Canopy Town** (fibre: a carrying sling and glider cloth) or east
   to **High Gorge** (copper: a powered pick and a longer hook reel). Both are reachable with what you have, both give a
   different ability pair, and High Port accepts either material for its harbour crane, so neither order is wrong.
5. **The first return spoke.** Once the first branch is connected, build its spoke straight home through the middle,
   past a small stop (Bell Terraces: crystal seeds, hook practice). The Roundhouse junction (S4) and a second engine come
   with it. In the model the spoke cuts the ride from that place from about 3.2 to 1.6 minutes, and from High Port
   from about 4.8 to 3.2 minutes (at 20 m/s, with boarding).
6. **High Port:** an inhabited town, the harbour crane, the service bay and a faster engine.
7. **The second branch,** reached from the Port side. It's shorter, because you already have the toolkit and its
   producer buys two levels at once.
8. **Closing the ring:** the last segment, back to Ring Island, needs crystal collars for a deep gap (the owner's
   crystal-as-crossing answer).
9. **The Original Island and The Boogler.** The final crossing's bill is five-area's "return" kit unchanged.

**What closing the ring gives:**

- A train that circulates the loop instead of shuttling, so every station sees a train more often (the model counts it
  as a third train).
- Either-way routing, which shortens the trip to the second branch from about 5 km to 3.
- The express fitting (40 m/s).
- A first full lap as a celebration: the "ride's moment" the owner asked for on 2 November.
- The ring's interior is never empty sea: Home, the spokes and their small stops fill it.

Optional after the ending: the Port's deep-sea spoke (crystal) and the second branch's spoke, each passing a small stop
(Lantern Observatory, Sail Tower).

## The economy

### Resources by tier

| Tier | Material | From | By hand until | Shared after |
| --- | --- | --- | --- | --- |
| 0 | Logs (W), stone (St), rails (R) | Home | Line 2 (logs); stone always | Depot cart and forge rack, as built |
| 1 | Precast footings (C) | Split-rock Works | The Works connects | Its producer |
| 2 | Steel fittings (S) | Ring Island | The steel works connects | Its producer |
| 3 | Fibre (Fi) or copper (U) | Canopy Town / High Gorge | Each branch connects | Its producer |
| 4 | Crystal seeds (X) | The small stops | All of the main game | Only after the optional seed cradle |

High Port makes nothing new: it recombines. Recipes get harder by needing more kinds of material, not more of one. Train
upgrades go from 0 kinds (the open shed) to 2 (steel boiler, freight chassis), 3 (Port refit, with the first branch's
material) and 4 (express fitting: steel, footings, copper and fibre).

### Hand-carried versus shared stock

- **What you carry is yours** until you deliver it to a named build (the production-core contract). A new material is
  only ever carried by hand until its place is connected.
- **Once a place is connected,** its producer's output is **world stock**: everyone in that world (the owner's
  "server-wide") can use it, and it only ever pays for shared builds (rail, spokes, producer and yard levels, trains,
  town). Nothing personal is bought with it, and the next essential build's share is reserved before an optional one
  (upgrade-economy's rule).
- **Hands still place every piece.** Trains bring stock to the Home Yard and the frontier racks; players carry it the
  last 15–30 m into the frame.

### Physical storage

- **Each producer has its own yard** next to the works: stacks that grow as it makes things. A full yard pauses the
  producer, visibly.
- **The Home Yard** (built with the Roundhouse) is the shared stock you can see: one bay per material, with stacks that
  show their count.
  - Y1: 4 bays of 16.
  - Y2: 6 bays of 32, concrete racks.
  - Y3: 8 bays of 64, with a gantry crane that loads trains.
  - Y4, after the ending: covered.

  A bay adds to each producer's own yard.

### Producers that start slow

The quarry example, Split-rock Works:

| Level | What you see | Rate to the Home Yard | Yard | Bill |
| --- | --- | --- | --- | --- |
| 1 | One crusher, one mould, a crew of two | 40/h | 12 | 16 logs (five-area C0) |
| 2 | A second mould, a drying rack | 120/h | 24 | 8 footings, 4 logs (C2's bill) |
| 3 | A steel kiln and a conveyor | 480/h | 48 | 8 steel, 8 footings |
| 4 | A gantry loader | 1,440/h | 96 | 12 steel, 8 footings |

One player hauling footings home by hand manages about 180 an hour, or about 330 with the carry frame. Level 1 is a
fraction of that, level 3 passes one player, and level 4 passes a crew of four. Steel, fibre and copper follow the same
shape. Each level is a rigid addition beside the works, built by hand from stock (owner call: machines show their work).

### The crossover

Each tier's machines pass one player about two hours after the tier arrives:

| Material | Machines pass one player (solo) | Machines pass a crew of four |
| --- | --- | --- |
| Logs | 0.5 h | 0.3 h |
| Footings | 3.5 h | 3.8 h |
| Steel | 5.3–5.4 h | 4.9–5.0 h |
| First branch's material | 5.3–5.4 h | 4.9–5.0 h |
| Second branch's material | 6.9 h | Not in the main game |
| Crystal | Never: hands only in the main game | Never |

Manual assists keep the hand line rising:

- the proper axe;
- the carry frame (8 → 16);
- the fibre sling (16 → 24);
- the powered pick;
- spokes, which shorten every trip.

### What consumes stock, and the sinks

Stock is spent on rail and ring segments, spokes, producer levels, yard levels, train upgrades, sites (ramp, brace,
crane, service bay), abilities (glider cloth, hook reel) and optional town builds. Every sink is a finite, permanent
build: no fuel, repairs, decay or tax. After the ending, the optional sinks are compositional (town districts, awnings,
the deep-sea spoke), in Townscaper's spirit.

On the main route, footings total 288 units, of which 4 are carried by hand before the Works connects; steel totals 330,
of which 4 are carried by hand; logs total 540, of which 168 are chopped and carried before the depot cart.

### Offline and idle

- **While someone plays,** producers run until their yards are full.
- **While everyone is away,** this proposes that each producer fills its own yard, up to two hours of output and never
  past the yard. Trains don't move it, nothing gets built, and no choices are made.
- **On return,** you see full stacks waiting.

In the model, this changes no milestone time; its value is the returning player's view, not speed.

### Keeping hauling central

- Every tier starts with hand carrying, and the frontier is always beyond the producers.
- Hands place every unit into a frame.
- Producers start below one player, so early on your hands are the fast way.
- Upgrades are physical builds that you carry stock to.
- Four friends finish sooner (5.7 h against 8.2 h solo) but wait 24–31 minutes in total for stock, depending on the
  branch order, because producers don't speed up with players. That gives a crew a reason to split off and upgrade
  producers, which is the owner's "complementary tasks".

## Best suggestions, ranked

1. **Hands first, machines later, for every tier,** with level 1 slower than one player, level 3 passing one player and
   level 4 passing a crew, and crystal left manual-only in the main game. This is the owner's core model, made visible
   per tier.
2. **Reach each place the long way, then build its spoke home,** starting with the first branch's spoke and the
   Roundhouse junction. This is Dark Souls' shortcut payoff on a railway.
3. **One branch point after Ring Island, both directions valid:** fibre (sling and glider cloth) or copper (powered pick
   and hook reel). The Port takes either, and the second branch catches up faster.
4. **A visible Home Yard as world stock** that only builds shared things, with each producer's own yard pausing when
   full.
5. **Producer levels as physical additions whose bills reach for the newest material,** so old places keep needing new
   ones and recipes gain kinds of material rather than quantity.
6. **Closing the ring as the late-game event:** a loop line with a circulating train, the express fitting and a
   celebration lap, then the final crossing.
7. **Producers fill their own yards while everyone is away,** bounded by the yard.

## Tensions

- **DESIGN principle 6, "No shared wallets."** World stock is spendable by anyone.
  - **Recommendation:** read it as the roundhouse research does. Stock is the world's output, not anyone's earnings. It
    only builds shared things, the next essential bill is protected, and personal packs and cosmetics stay personal.
  - The money brief's comic score is unaffected.
  - Needs the owner's confirmation (question 3).
- **The 4 November production-core contract:** offline completion only for already-funded work, and the forge and depot
  never produce offline. The incremental research also prefers a single project cap over banked time.
  - **Recommendation:** allow filling each producer's own yard. It is a physical cap, it starts nothing, and it moves
    nothing.
  - Owner decision (question 4).
- **The world map's version 2** treats High Gorge and Canopy Town as alternatives ("do not silently require both").
  - This proposal requires both, with the order as the choice, which adds roughly 45–75 minutes of authored content.
  - **Recommendation:** keep both, and make the second one shorter.
  - Owner decision (question 2).
- **The existing paper models** (`model.ts`, `three-area.ts`, `five-area.ts`) connect sources at full rate. Here
  producers start slow and level up, and the top levels exceed their rates (C 240, S 360, U 480 an hour there; 1,440
  here).
  - Units, the 1.2 km line, 20 m/s, 2 m/s², the dwell, transfer and pick-up times, carry 8 and the wagon (24, then 32
    with S1) are reused.
  - These bills are reused unchanged: C0, C1, C2, S0, S1, S4, U0, F0, F2, F3, F5, B1, R1, X0, F-seat, "pack" and
    "return".
  - New IDs are marked "New" in the sheet.
  - The route follows the owner's Split-rock → Ring order, not three-area's or five-area's, and crystal becomes the
    manual-only tier instead of a source.
  - This is a step model, not their event scheduler: keep `model.ts` and `campaign.ts` for per-player schedules and use
    the sheet for tuning by hand.
- **Trains are timetabled from the tick.** A loop line and spokes make the timetable a graph, not one line. That's a
  technical prerequisite before ring closure, not a design conflict.
- **Authored content is the real cost.** The model needs 5.6 hours of authored play solo; travel adds 1.7 h, hand labour
  0.8 h and waiting a few minutes. Short content forecasts a shorter game, not bigger bills (upgrade-economy).
- **Hauling share.** Solo players almost never wait for stock, so producers mostly show up as relief, not as a gate. If
  playtests find the machines don't matter solo, raise the first-tier bills, not the waits.

## Smallest first build

The 2D page is the first step (owner call). The first in-game build is **Split-rock Works levels 1 and 2, with a
visible yard**, after the line 2 playtest and the Split-rock greybox from the approved gate brief:

1. Carry the first footings home by hand for the loading ramp.
2. Connect the Works and watch level 1 stack footings in its yard, slower than you could carry them.
3. Build level 2 beside it from footings and logs, and watch the stacks grow faster.

Compress the levels for the proof, so the hand-versus-machine crossover happens within one sitting. All rates and caps
are tunables (owner call). Capture the yard filling in real time. Ask the gut question, then stop for the owner's
verdict before Ring Island's producer or the Home Yard.

## Open questions

1. **The hub:** Home, with the Roundhouse and Home Yard, at the centre, and Ring Island on the ring, reached by the entry
   spoke? Recommended: **yes**. The alternatives are Ring Island as the hub, or the Original Island in the middle as the
   ending you circle. Answer: ___
2. **Both branches:** are Canopy Town and High Gorge both part of the main game, with the order as the choice and the
   second visit shorter? Recommended: **yes, both; the second is shorter**. The alternative is to make the second branch
   and the ring's closure optional, for about seven hours. Answer: ___
3. **World stock:** once a place is connected, does its output become world stock that anyone can use, only for shared
   builds, with the next essential bill protected and packs staying personal? Recommended: **yes, recorded as how
   principle 6 applies**. Answer: ___
4. **Away production:** do producers fill their own yards while everyone is away, up to two hours of output and never
   past the yard, with nothing moved or built? Recommended: **yes, for producers only; funded construction keeps its
   current rule**. Answer: ___
5. **How long a tier stays hand-led:** do machines pass one player about two hours after each tier arrives (footings at
   3.5 h), and a crew of four only at level 4? Recommended: **yes, with the first proof compressed into one sitting**.
   Answer: ___

## Parked

- The Port's deep-sea spoke, the second branch's spoke and the crystal seed cradle, after the ending.
- Exact ring distances, the travel-time feel, and whether 1.9 km ring segments are too long a ride: test in the
  crossing prototype.
- Per-player hauling schedules in the event model (`campaign.ts`) for this route.
- Town districts as a visible use for surplus stock.

## Disposition

**Proposed design; owner decision needed** on the five questions. No game code changes. Everything builds after the
line 2 playtest and the production-core slices it depends on.
