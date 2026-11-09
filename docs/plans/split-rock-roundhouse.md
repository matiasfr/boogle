# Plan: Split-rock Works and the smallest Roundhouse

Prepared 8 November 2026 against `origin/main` `6f8b52aa`, for Codex gpt-6.1-sol in five jobs. Planning only; no code
changed. Owner, 8 November: "yes, and likely start building" this while line 2 part 2's B5–B8 is being built. Job
format from [line2-b5-b8](line2-b5-b8.md); what exists and what B5–B8 adds is in that plan and in
[line2-part2-greybox](line2-part2-greybox.md).

**Binding calls** ([decision log](../decisions.md)):
- **2026-11-06, Split-rock Works next, then Ring Island; the smallest Roundhouse first.** The Roundhouse's first build
  is one engine, one wagon, a turntable beside the line and one visible fitting.
- **The jump-upgrades and gate-puzzles briefs**, approved with their recommended answers: Split-rock opens solid
  ground with a broad strike on a visible seam, and every partial state is safe to inherit.
- **Ring-and-economy answers**: a shared wallet and progression, every area visited, an irregular map, doubling back
  with new abilities.
- **Roughly six hours** for 1–3 players. **Greybox first** in the Sickle Isles greybox (7 November).
- **The 8 November entries**: today's fixes, filling a gated stretch before its switch (supplying and starting stay
  separate), the summit switch opening early, the switch cinematics, the cart keeping its rack.
- **Puzzle order**: every hand-off readable, and every stage changes what you can do.

Sources: [next-destination](../research/next-destination.md) (A, Split-rock Works),
[roundhouse-trains](../research/roundhouse-trains.md) ("Recommended smallest first build", B1 bulk cradle),
[route-contract](../research/route-contract.md), `docs/world/map-prototypes.html` `#map-data`.

## Goal

After the pier, the forge casts a **breaker**. You take it and strike a cracked slab at Home, which opens an old
Roundhouse stall beside the junction turntable. Inside are two empty footing sockets and a shunter and wagon under a
tarp. You ride line 2 to the quarry halt and strike the big seam in the **split rock** you have passed since Q3. The
haul cut opens and you light the Works' kiln with logs and stone. **Precast footings** come down a roller road to a
rack by the halt. You shoulder the first four home by train: two raise the stall and two (with eight rails) fit a
**footing cradle** to the wagon. You turn the table, and the shunter pushes the wagon onto line 2. From then on the
line-2 train collects footings at the quarry and drops them at a new pier stop. You set twelve of them into the sea
north of the pier, and the first bents of the crossing stand there, pointing at Ring Island.

**What's new:** "The quarry sends home parts that change what we can build."

**Gut question for the playtest:** "Did bringing the footings back, and the wagon that carries them, make you want to
set off for Ring Island?"

Serves DESIGN **Telegraph everything** (the split rock and the stall ruin are in view from the first hour, and the
pier's empty sockets show the want), **Show, don't tell** (no banners: the cut, the stall, the cradle and the bents
are the payoff), **Enjoyable alone and together** (one person strikes and stocks the kiln while another ferries
footings; every partial state survives a leaver), **Leave something for the next visitor** (the cut, the stall and
the wagon stay) and **Clear authority** (every transfer belongs to the server). It bends nothing.

## Where it sits: reconciling "the east quarry" with today's map

Next-destination was written after Line 1, when the east quarry was a walk-only camp. Since then line 2 has been
built through it: Q3 ends at the quarry, Q4 starts there behind the quarry lever, and B5–B8 adds a quarry halt at
s = 174. The greybox map already names that camp **Split-rock** (`common.places.splitrock` at (98, 52)), the end of
`l2a` and the start of `l2b`. So the Works can't be "reach the quarry, then connect it". The rail is already there.
Read today, the recommendation becomes three things:

1. **The Works is a new place inside the split rock beside the quarry halt**, not a new island. It is a limestone
   outcrop on the east table's empty south-east quarter, with a hollow bowl inside. The quarry halt sits at its
   north-west foot. The table there is flat at 24 m (sampled from Place's `H`, x 105–175, z 60–135), and the sea cliff
   is at x ≈ 178.
2. **"Connect the works" becomes "open the throat"**. The railway already passes the door, but a cracked limestone
   wall (the throat) seals the bowl from the halt. Before the strike you can walk in through a narrow cleft on the far,
   sea-facing side. That is the early scout's route, open since Q3, and nothing big fits through it. Once the throat is
   struck, the roller road carries footings out to the halt rack.
3. **"Bring home footings that make the first sea crossing possible"** stays as written, and the trains B5–B8 adds
   carry them. The first kit raises the Roundhouse stall at Home, which is research's "first return". The second fits
   the wagon. After that the trains bring the rest to the pier, where the crossing starts (`ringx`).

| Piece | Local (m) | World (cm) | Notes |
| --- | --- | --- | --- |
| Quarry halt (B5–B8) | (81.3, 41.1) | (108132, 4114) | line 2 stop 1, s = 174 |
| **Split rock** outcrop | centre (140, 100), ≈ 50 × 40 m, walls 16 m (top ≈ 40 m) | — | New blockout, south-east of the halt; clear of the southern path's (70, 100)→(92, 70) leg by ≥ 20 m |
| **Throat seam** (strike 1) | (119, 82), NW face | (111900, 8200), y 2400 | Faces the quarry yard and halt; an 8 m-wide haul cut once open |
| **Cleft** (walk-in, always open) | (160, 120), SE face | (116000, 12000) | 1.2 m wide; reached round the east ledge (x 165–178), about 120 m from the halt |
| **Kiln frame** | (128, 87), at the cut's inner mouth | (112800, 8700), y ≈ 2420 | You can reach its loading frame only through the open cut; its back and chimney show from the bowl |
| **Limestone rocks** | (145, 105), (150, 98) | (114500, 10500), (115000, 9800) | Two new rock slots, 8 stone each, in the bowl |
| **Works rack** (outbound) | ≈ (88, 50), beside the halt's east end | (108800, 5000), y 2400 | The roller road runs throat → rack; the wagon at s ≈ 166.6 is ≈ 21 m away |
| **Breaker pedestal** | (−81, 5.4) | `LINE2_BOILER` (91900, 540), y 1815 | The boiler's pedestal, empty once it is fitted |
| **Junction turntable** | (−82, 12), r 4.8 | (91800, 1200), y 1830 | Place's `TURNTABLE`, already drawn by `src/proto/place/lines.ts`. Both lines start here, but trains stand at s ≥ 14, so none crosses it. This is the Roundhouse table |
| **Stall** and **stall slab** (strike 0) | stall centre (−90.5, 20.5), a stall road heading south-west; slab at its door (−87.6, 17.6) | (90950, 2050) / (91240, 1760), y 1800 | Between the shelf (−90.5, 8.5) and the hall (−88, 31); J1's clearance test pins it |
| **Wagon waits at** | line 2 s = 9.6 (−75.2, 18.8) | `WAGON_S = 960` cm | Behind the line-2 train's tail at its village stop (17 − 3.7 − 1.6 = 11.7 m) and off the table (r 4.8) |
| **Pier stop** (new line-2 stop 3) | s = 730 (402.6, −358.5) | (140260, −35850), y 2430 | Line 2 is 743 m long; a standing train's nose reaches 733.7 m |
| **Pier rack** and **pier frame** | (402.4, −362) / pier end (402.1, −371) | (140240, −36200) / (140210, −37100) | On the new Pier halt deck and at the pier head |
| **Crossing bents** | `ringx` at 20, 40, … 120 m: (402.5, −392) … (405.3, −492), sea floor −6 m | J1 pins in cm | Two footings per bent, ±2.5 m across: 12 footings |

The map page (`#map-data`) changes in J1: new `common.works` marks for every row above, and the Split-rock, Ring
Island and stage-1.5 notes say the breaker comes from the forge and the Roundhouse opens here, not after Ring Island.

### The jump-upgrade balcony: not in this build

**It doesn't fit naturally as an early win now**, so this plan leaves it out and asks the owner (question 4). In
production the double jump is already granted on line 1 (`rail.jump` at `LINE1_JUMP_DEVICE`). Line 2's run uses it
along the way (`dev/look/bots/railway.ts` boards the loaded cart with it), and the B5–B8 playtest covers that whole arc.
Moving the grant to the ankle rings changes the first hour while the owner is judging it. Inside the Works, a balcony
ramp would also repeat the throat's short way in. The natural later version is job E, after the B5–B8 verdict:
- the ankle rings at the route contract's (45, 130) bend on the southern walk;
- the line-1 device removed;
- a balcony on the split rock's north-west face above the quarry halt (a ledge players have walked under since Q3);
- its lever lowers a broad ramp onto the rim, a lookout over the Works and the sea.

## Design: sync kind and ownership

Everything shared is **Server** kind in the railway E world (`docs/agents/sync.md`). The server applies each action,
replicates the rows that changed and checks range from the action's own position. There is no lockstep op, no
`src/world/rules/types.ts` entry and no `env` fact. Views are **Local**, rebuilt from accepted state. Riding and your
body are **Owner**. There is no new presence field: what you carry is your account row.

| State / piece | Kind | Authority | API |
| --- | --- | --- | --- |
| **Works** (new kind `works`, one entity): `breaker` u8 (0 none, 1 on the pedestal, 2 taken), `seams` u8 (bit 1 stall slab, bit 2 throat), `logs`, `stone` (kiln stock), `lit` (tick, −1), `rack`, `poured`, `pierRack`, `pierSet`, `crossing` (tick, −1). `WorksClock` (not replicated): `lastCast` | Server | The rule tick casts the breaker when Q6 completes and the kiln pours. Ops are judged from the actor's position | `rail.breaker`, `rail.strike {id}`, `rail.kiln`, `rail.footTake {rack}`, `rail.footSet {site}` |
| **Shed** (new kind `shed`, one entity): `stall` (0–2 footings), `cradle` (0–2), `cradleRails` (0–8), `fitted` (tick, −1), `table` u8 (0 stall road, 1 line-2 road), `tableRev`, `ready` (tick, −1: when the wagon has rolled out) | Server | Ops; `rail.turn` carries the expected revision | `rail.footSet {site}`, `rail.cradle`, `rail.turn {to, revision}` |
| **Account** gains `foot` (0 or 1) | Server | A footing fills your back | through the ops above; `rail.drop` kind 3 |
| **Train** (B5–B8's `train`) gains `wagon` bool and `foot` int; line 2 gains stop 3 (the pier) once Q6 is complete | Server | Arrival and standing transfers in `rail.trainTick` | B5–B8's `rail.call` (one more halt) |
| **Rock** slots 3 and 4 (the Works' limestone) | Server | the existing `rail.mine` | — |
| **Pile** kind 3 (a dropped footing) | Server | the existing `rail.drop`; the supply pulse returns aged footing piles to the Works rack | — |
| Split rock, throat slab, cleft, bowl, kiln, roller road, Works rack, stall, slab, shunter, wagon, cradle, stall road, pier sockets, bents | Local, from rows; static colliders `owner`-owned | — | `works-view.ts`, `roundhouse-view.ts`, `crossing-view.ts` |
| Strike swing, slab topple, dust, kiln fire, footings on the roller road, worn footing, stall rising, cradle bolting on, table turning, shunt, footings lowered to the sea, bents rising | Local: the press (predicted ops) or accepted events and live edges; snapped on restore | — | same files |
| The wagon on the line-2 train; footings aboard | Local, from the train row and `adapter.tickNow()` | — | B's `train-view.ts` (J5 hunk) |

**Controls.** Everything is Interact through `targets()`: **Take the breaker**, **Strike the seam**, **Fill the
kiln**, **Shoulder a footing**, **Set the footing**, **Fit the cradle** and **Turn the table**. These are new verbs,
not The Boogler's copy. Putting a footing down uses the existing `place-drop` action through `rail.drop`, so footings
need no `bindBigDrop` slot. There are no new action ids, pad slots, keys, touch buttons or guide rows, and
`freeSlots()` is untouched. The pier halt calls a train the way B5–B8's halts do.

### The rules (job J3 pins them)

**Catalog** (new `src/sim/railway-works-layout.ts`, written in J1; every position in world cm):
- `WORKS = { kilnLogs: 16, kilnStone: 16, castTicks: 80, rackCap: 6, stall: 2, cradle: 2, cradleRails: 8, pier: 12,
  total: 16, wagonCap: 6, rollTicks: 60 }`. `total` equals `stall + cradle + pier`, so the kiln pours exactly the 16
  footings the area needs and stops.
- `WORKS_SEAMS`: `[{ id: 0, name: 'stall', x: 91240, z: 1760, y: 1830, reach: 400 }, { id: 1, name: 'throat',
  x: 111900, z: 8200, y: 2400, reach: 500 }]`.
- `WORKS_BREAKER = { x: 91900, z: 540, y: 1815, reach: 420 }`, the same as `LINE2_BOILER` and asserted equal to it.
- `WORKS_KILN = { x: 112800, z: 8700, y: 2420, reach: 450 }`, `WORKS_RACK = { x: 108800, z: 5000, y: 2400,
  reach: 400 }`, `WORKS_ROCKS = [{ id: 3, x: 114500, z: 10500, initial: 8 }, { id: 4, x: 115000, z: 9800,
  initial: 8 }]`.
- `SHED_STALL = { x: 90950, z: 2050, y: 1800, reach: 500 }` (stall sockets and cradle bay),
  `SHED_TABLE = { x: 91800, z: 1200, y: 1830, reach: 600 }`, `SHED_ROAD = { stall: 0, line2: 1 }`, `WAGON_S = 960`.
- `PIER_STOP_CM = 73000`, `PIER_RACK = { x: 140240, z: -36200, y: 2430, reach: 400 }`,
  `PIER_FRAME = { x: 140210, z: -37100, y: 2430, reach: 500 }`.
- `CROSSING_BENTS`: six `{ x, z }` in cm along `ringx` at 20 m spacing from 20 m, with `CROSSING_FOOT_OFF = 250`.
- `RAIL_ROCKS = [...LINE1_ROCKS, ...WORKS_ROCKS]`.

J1 computes the exact values with Place's `lineAt`/`railY`/`H` and the parsed map page, and its test pins them. Where
the test moves a candidate to clear something, J1 says so; the cm above are the candidates.

**New module** `src/sim/railway-works.ts` (pure; integers only; no trig, wall clock or randomness):
- `footingTotal(view)`: rack + pierRack + pierSet + stall + cradle + Σ account.foot + Σ kind-3 pile n + Σ train.foot.
- `pierNeed(view)` = `WORKS.pier − pierSet − pierRack − train[1].foot`.
- `worksStage(view)`, a label for views and the bot: `dormant | breaker | open | lit | stall | fitted | wagon |
  crossing`.
- `validateRailWorks(view)`, the invariants below.

**Systems** (`src/sim/railway-systems.ts`; the Works block after B5–B8's train block):
- **Cast the breaker.** Where B5–B8 casts the boiler (`layLine2`, `line2Tick` and `resume`'s writes): when slot 5 (Q6)
  completes and `breaker === 0`, set `breaker = 1`. An away credit that finishes Q6 casts it too.
- `rail.breaker` (op order 33): needs `breaker === 1`, then sets 2. It is a room-wide rung like `rail.axe` and
  `rail.hook`.
- `rail.strike {id}` (34): needs `breaker === 2` and the seam bit unset. It sets the bit; a repeat strike returns 0. It
  is one generous strike (gate-puzzles question 2) with no strokes.
- `rail.kiln` (35): needs `seams & 2` and `lit < 0`. It moves logs (`carry`) and stone off your back, each up to the
  bill. When both bills are full it sets `lit = tick` and `WorksClock.lastCast = tick`.
- `rail.worksTick` (phase `tick`, after `rail.trainTick` and before `rail.jobClock`; take the next free order): when
  `lit ≥ 0 && seams & 2 && poured < total && rack < rackCap && tick − lastCast ≥ castTicks`, it does `rack++`,
  `poured++` and `lastCast = tick`. A full rack pours nothing, and the next cast comes as soon as the rack has room. It
  writes nothing while nothing changes.
- `rail.footTake {rack: 0 | 1}` (36): 0 is the Works rack, 1 the pier rack. It needs `carried(a) === 0`, `foot === 0`,
  no beam or boiler held, and the rack > 0. It sets rack−1 and `foot = 1`. `heldBig(w, pid)` from B5–B8 also counts
  `foot`, so a footing blocks every other take, as the boiler does.
- `rail.footSet {site: 0 | 1 | 2}` (37) needs `foot === 1`:
  - 0, the stall: needs `seams & 1` and `stall < 2`;
  - 1, the cradle: needs `stall === 2` and `cradle < 2`;
  - 2, the pier: needs `line2Completed ≥ 6` and `pierSet < pier`.

  It moves the footing (`foot = 0`, site +1). Site 2 sets `crossing = tick` when `pierSet` reaches 12.
- `rail.cradle` (38): needs `stall === 2` and rails on your back. It moves up to `cradleRails` 8 rails off your back.
- **Fitting**: whichever op makes `cradle === 2 && cradleRails === 8` sets `fitted = tick`.
- `rail.turn {to, revision}` (39): needs `stall === 2`, `revision === tableRev`, `to ∈ {0, 1}` and `to !== table`. It
  sets `table` and does `tableRev++`.
  - `ready` (the wagon rolls out): any op that makes `fitted ≥ 0 && table === 1` true while `!train[1].wagon` sets
    `ready = tick + rollTicks`.
  - Turning back to 0 before the wagon couples sets `ready = −1`, and the wagon rolls home.
  - After coupling, the table is a toy: turning it changes nothing else. The first build commissions once, as research
    recommends; the reversible choice of profile is a later experiment.
- **Train changes** (B5–B8's `src/sim/railway-train.ts` and train block):
  - `TRAIN_STOPS[1]` becomes `[1700, 17400, 52400, PIER_STOP_CM]`, and `trainStops(w, k)` returns the first three
    until `line2Completed ≥ 6`. Every decision (next stop along `sweep`, turning at the ends) and `trainEtaTicks` uses
    `trainStops`.
  - `LINE_HALTS` appends the Pier row (index 5), computed with Place's halt maths as B5–B8's A1 table was. A call to it
    before Q6 is complete returns 0.
  - Line 2 **standing at stop 0** with `ready ≥ 0 && tick ≥ ready && !wagon` sets `wagon = true`, one write. A train
    standing there when `ready` lands holds its departure until it couples (at most `rollTicks`).
  - **Arriving at stop 1** (the quarry) with the wagon, it loads `n = min(wagonCap − foot, works.rack, pierNeed)`:
    `works.rack −= n` and `foot += n`, in one apply.
  - **Arriving at stop 3** (the pier), it does `pierRack += foot` and `foot = 0`.
  - B5–B8's Q6 kit unload at stop 2 is unchanged.
- **Rocks**: `createRailwayWorld` appends Rock slots 3 and 4. `rail.mine` validates `railInt(e.id, RAIL_ROCKS.length −
  1)` against `RAIL_ROCKS`, and their regrowth works as line 1's rocks do.
- **Drop**: `rail.drop` accepts kind 3 with `n === 1` from a back holding a footing. The supply pulse ages a kind-3
  pile and returns it to `works.rack` when nobody is near, under the same conditions it uses for rail piles. A footing
  on an absent player's back stays theirs, as carried stock does (the supply contract).
- **No away credit for the kiln** in this build. A rack of 6 refills in 48 s of play.

**Server** (`src/world/railway-server.ts`): add the seven ops to `RAIL_ACTIONS`. `railValid` checks each against its
`*_` constant with `near(x, z, reach)` and `actor.height(y, 300)`:
- `strike`: `railInt(e.id, 1)`.
- `footTake`: `railInt(e.rack, 1)`, near the chosen rack.
- `footSet`: `railInt(e.site, 2)`, near `SHED_STALL` for sites 0 and 1, near `PIER_FRAME` for site 2.
- `kiln`: near `WORKS_KILN`. `cradle`: near `SHED_STALL`.
- `turn`: `railInt(e.to, 1) && railInt(e.revision)`, near `SHED_TABLE`.

**Host** (`server/src/host/world-host.ts`): the supply pulse's footing-pile recovery, and nothing else. There is no
holder grace, because a footing is account stock.

**Prediction** (`src/world/railway-predict.ts`): predict `rail.kiln`, `rail.footTake`, `rail.footSet` and
`rail.cradle` (instant actions). Hold back the thresholds `Works.lit`, `Shed.fitted`, `Shed.ready` and
`Works.crossing` the way the file holds back funding today. `rail.breaker`, `rail.strike` and `rail.turn` wait for the
server; they are mechanism facts.

**Adapter** (`src/adapters/railway.ts`):
- The seven ops join `RailwayIntent` and `intentOf`. `breaker`, `strike` and `turn` join `NOT_MATERIAL`.
- `holds`: `strike` → the bit is set; `turn` → `table === to`.
- `submit` refuses material ops while `foot === 1`, as it does for a held beam.
- `inspect()` gains `works: { breaker, seams, kiln: { logs, stone, lit }, rack, poured, pierRack, pierSet, crossing,
  stage }` and `shed: { stall, cradle, cradleRails, fitted, table, tableRev, ready }`. `line2.train[k]` gains `wagon`
  and `foot`; `me.foot` comes from your account.
- The API gains `takeBreaker()`, `strike(id)`, `fillKiln()`, `shoulderFooting(rack)`, `setFooting(site)`,
  `fitCradle()` and `turnTable(to, revision)`.

**Invariants** (`validateRailWorks`, called from `railwayCheck` with archetypes `[Works]` and `[Shed]`, one entity
each):
- **Footings**: `footingTotal === poured ≤ total`, `rack ≤ total` (recovery may push it past `rackCap`) and
  `pierRack + pierSet ≤ pier`. `stall ≤ 2`; `cradle > 0 ⇒ stall === 2`; `cradleRails ≤ 8`. `fitted ≥ 0 ⇔ (cradle === 2
  && cradleRails === 8)`. `table === 1 ⇒ stall === 2`, and `ready ≥ 0 ⇒ fitted ≥ 0`.
- **Works**: `breaker > 0 ⇔ line2Completed ≥ 6`; `seams ⊆ {1, 2}`; `seams > 0 ⇒ breaker === 2`. `lit ≥ 0 ⇔ (logs ===
  16 && stone === 16)`; `lit ≥ 0 ⇒ seams & 2`; `poured > 0 ⇒ lit ≥ 0`. `pierRack + pierSet > 0 ⇒ line2Completed ≥ 6`;
  `crossing ≥ 0 ⇔ pierSet === 12`.
- **Trains and accounts**: `train[0].foot === 0` and `!train[0].wagon`; `train[1].foot ≤ wagonCap`;
  `train[1].foot > 0 ⇒ wagon`; `wagon ⇒ fitted ≥ 0`. `account.foot ∈ {0, 1}`, and `foot === 1 ⇒ carried(a) === 0`.
- **Existing totals that change**: stone conservation (`validateRailLine` in `src/sim/railway-line.ts`) goes from
  `24 + stoneProduced` to `8 * RAIL_ROCKS.length + stoneProduced` and adds `works.stone`; `railwayCheck`'s stone total
  adds `works.stone`. The log total adds `works.logs` to the `line2` term (and to `line2Logs` if B5–B8's version counts
  logs there). `line2Rails(s)` adds `shed.cradleRails`, so `line2Rails(s) === forge.poured` still holds.

**WORLD_NS**: one bump, in J3's commit, to the next free version: **v22** after B5–B8's v21 (taken on
`codex/b5b8-rules`); if another branch took v22, use the next number. History line:

```ts
// v22 (<commit date>): Split-rock Works and the smallest Roundhouse: new `works` and `shed` components
// (rail.breaker, rail.strike, rail.kiln, rail.footTake, rail.footSet, rail.cradle, rail.turn), `foot` on accounts
// and trains, the train's `wagon`, rock slots 3-4, pile kind 3, line 2's pier stop.
```

It resets development worlds and players' local
progress (owner, "a world wipe is a new save").

### What the player sees, in order (telegraphs)

1. **From the first hour:**
   - **The split rock** beside the quarry, from Q3 on: its seam marked, a cold chimney over its rim, and a cold roller
     road ending at an empty rack by the halt. One broken sample footing lies on the rack, so the shape reads.
   - **The stall ruin** by the turntable at Home, its door blocked by a cracked slab, with a tarp shape visible
     through the gap.
   - Curious players can walk round the east ledge and squeeze through the cleft to see the cold kiln's back and the
     limestone rocks. Nothing there works yet.
2. **At the pier (Q6 complete):** two rows of six empty footing sockets at the pier head, stakes running north along
   `ringx`, the Pier halt, and on the apron the breaker on the boiler's old pedestal with the same gold motes. The
   forge has made its third thing.
3. **The breaker, at Home:** striking the slab 15 m away is the harmless first strike (next-destination's "side
   opening"). The stall opens: two sockets in the floor, the shunter and wagon under the tarp, and an empty cradle bay.
4. **The quarry:** the train stops by the seam. Strike: the slabs topple, dust rolls out, daylight comes through the cut
   and the roller road's far end meets the kiln frame. Fill the kiln (16 logs carried from Home, 16 stone mined in the
   bowl). It lights, and a footing comes down the rollers every 8 s.
5. **First return:** shoulder a footing (it fills your back), ride home, set it. The stall frame rises on two
   footings, the tarp comes off, and the shunter and wagon are revealed. Two more footings and eight rails from the
   forge rack 15 m away fit the cradle. Turn the table: the shunter pushes the wagon onto line 2's track to wait at
   s = 9.6, and the next village stop couples it.
6. **The service:** the line-2 train carries footings from the quarry halt to the pier stop. At the pier you set them;
   each one lowers on a rope into its socket, and every pair raises a bent. When twelve are set, six bents march 120 m
   out toward Ring Island. The owner plays it when they can.

**Rough length** (a hypothesis to time solo and with two players): pier → home 2 min; breaker and slab 1; logs 3; to
the quarry 1; strike and stone 3; four footings home by hand about 8 (the "before"); cradle and turn 2; two train
loads to the pier and 12 sets about 8. That is **about 28 minutes solo**, less with friends, inside next-destination's
35–50 minute envelope. If the good actions take 20, keep 20.

---

## Jobs and their order

```
start now (parallel with B5–B8):  J1 layout + map + tests ──┐
                                  J2 blockout views (default on) ┤
B5–B8 job A merges (v21) ─────────► J3 rules, server, adapter, seeds, WORLD_NS v22 ──┬─► J4 Works + Roundhouse live views ──┐
B5–B8 B, C merge ───────────────────────────────────────────────────────────────────┤                                     ├─► J5 wagon, pier, bot, record ─► final pass ─► stop
B5–B8 D merges; owner has played B5–B8 ─────────────────────────────────────────────┴─────────────────────────────────────┘
later: E (ankle rings + balcony), after the B5–B8 verdict and owner question 4
```

- **Start now: J1 and J2.** They share no file with B5–B8's A–D except one wiring hunk in `src/entities/railway/view.ts`
  (J2), which B also edits: whichever lands second rebases. Neither adds state, ops or saves. J2's views are default-on
  unless `?works=0`. Both may merge to main any time.
- **Wait for B5–B8 job A: J3.** It edits the train kinds, the train tick, `LINE_HALTS`, `heldBig`, the adapter and
  `WORLD_NS` that A introduces. `codex/b5b8-rules` already has A's three commits: J3 may branch from that tip now and
  rebase after A merges ("Iterate fast"). **J3 proceeds now** (owner, 9 November: nothing waits for a playtest). It bumps `WORLD_NS`,
  so don't ship it while the owner is mid-session.
- **Wait for J3 and B5–B8's C: J4.** C owns the boiler pedestal view J4 reuses for the breaker.
- **Wait for J3, J4 and B5–B8's B and D: J5.** It edits B's `train-view.ts` and `halts-view.ts` and extends D's bot. J4
  and J5 can be written in parallel against the pinned names; J5 merges after J4.
- **Later:** E (the jump find and balcony) once the owner answers question 4; then Ring Island's plan (the crossing's
  deck and laying on the footed bents, the aperture, steel).

**Pinned names** (don't rename):
- **From J1**: everything in "Catalog", plus `works-shape.ts` exports `SPLIT_ROCK_BOXES`, `THROAT_SLAB`, `STALL_SLAB`,
  `CLEFT`, `ROLLER_ROAD` and `STALL_ROAD`. These are owned by J2 but listed here because J4 uses them.
- **From J3**: the ops; the adapter methods; `inspect().works` and `inspect().shed`; `train[k].wagon` and `.foot`;
  `trainStops`, `pierNeed`, `footingTotal`, `worksStage`; the seed stages.
- **From J4**: interactables `railway-breaker`, `railway-strike-0`, `railway-strike-1`, `railway-kiln`,
  `railway-foot-take-0`, `railway-foot-set-0`, `railway-foot-set-1`, `railway-cradle` and `railway-turn`. The view
  inspect `worksView: { seams, kiln, rack, rollers, stall, cradle, table, wagon: { x, y, z, at } }`.
- **From J5**: interactables `railway-foot-take-1` and `railway-foot-set-2`; the view inspect `crossingView: { sockets,
  bents, pierRack }`.

---

### Job J1: layout, map marks and clearance tests (start now)

**Files.** New `src/sim/railway-works-layout.ts`, new `test/railway-works-layout.test.ts`,
`docs/world/map-prototypes.html` (`#map-data` only), `src/proto/greybox/map-data.ts` (the `Work` kind),
`src/proto/greybox/build.ts` (a colour for the new kind), `test/greybox-works.test.ts`, `src/proto/greybox/README.md`
(one line).

**Steps.**

- [ ] **J1a. The catalog.** Write `src/sim/railway-works-layout.ts` with every constant in "Catalog", computed in a
  throwaway script with Place's `lineAt`, `railY` and `H` (`src/proto/place/layout.ts`, `terrain.ts`) and
  `parseMapPage`. Commit the numbers, not the script. Header: the Works and Roundhouse positions; no import from
  `src/proto` (it is pure sim). Nothing imports it yet.
- [ ] **J1b. Clearance tests** in `test/railway-works-layout.test.ts`, with node imports of Place's layout and terrain
  as `test/greybox-works.test.ts` does:
  - `'every Works point stands on its ground'`: `|y − H| ≤ 50 cm` for land points; the turntable and pier points
    within 5 cm of `railY`; each bent's ground ≤ 0 m (sea).
  - `'clear of what is already there'`:
    - ≥ 2 m from every `TOWN` plot footprint (start, wood, stone, both camps' asleep and awake);
    - ≥ 2 m from `FORGE`, `RACK`, `SHELF`, `CRANE` and `DOCK`;
    - ≥ 6 m from `SPAWN`; ≥ 4 m from `LINE2_LEVER`; ≥ 6 m from each `LINE2_STATIONS` frame;
    - ≥ 2 m from `PATH_SAMPLES`;
    - ≥ 3.5 m from line 1 and line 2 rail centres, except `WAGON_S` and `PIER_STOP_CM`, which are on the line.
  - `'the rack serves the halt'`: `WORKS_RACK` within 25 m of `lineAt(east, 166.6)` (the wagon at the quarry stop).
  - `'the wagon waits between the table and the train'`: the car span at `WAGON_S` (±1.6 m) lies in (4.8, 11.7) m.
  - `'the pier stop fits'`: `lineAt(east, 730)` within 5 cm of the stop; the line is ≥ 735.3 m long.
  - `'bents follow the first sea crossing'`: each `CROSSING_BENTS` row within 0.5 m of `ringx` at 20 k m.
  - `'one footing for every use'`: `WORKS.total === stall + cradle + pier` and `pier === 2 * CROSSING_BENTS.length`;
    `WORKS_BREAKER` equals `LINE2_BOILER`'s position.

  Where a candidate fails, move it the least distance that passes, and list the move in the commit message.
- [ ] **J1c. The map page.** In `#map-data`:
  - Add `common.works` rows `{ id, name, at, kind: 'works', note }` for breaker, stall-slab, stall, turntable, seam,
    cleft, kiln, works-rocks, works-rack, pier-stop, pier-rack, pier-frame and bents (at the first bent), at J1a's
    local metres.
  - Edit `splitrock.gives` to "Precast footings. The breaker (from the forge after Q6) opens its throat."
  - Edit `ring.gives` to "Steel. Brace the freight aperture.". The Roundhouse now opens with Split-rock.
  - Edit the 1.5 stage note to "Take the forge's breaker, strike the seam by the quarry halt, light the kiln, carry
    footings home to the Roundhouse, fit the footing wagon, foot the crossing."

  In `map-data.ts`, widen the `Work` kind with `'works'`; in `build.ts`, give it a limestone colour. Extend
  `test/greybox-works.test.ts`: every `works`-kind mark lies within 1 m of its sim constant (cm → m, minus `ORIGIN`).
  The README gets one line: `works` marks show Split-rock and the Roundhouse.
- **Proofs.** `npm run check`. One greybox still from the quarry halt toward the seam mark:
  `npm run look -- --query 'greybox=sickle' --cam <halt> --look <seam> --action refresh.ts --name works-marks`. Open
  the PNG and say what it shows.
- **Done means.** The tests pass and document every clearance. The map page and greybox agree. No runtime module imports
  the new file.

**Codex brief (paste):**

> Build job J1 of docs/plans/split-rock-roundhouse.md on a branch from origin/main: the pure catalog
> `src/sim/railway-works-layout.ts` (Split-rock Works, the Roundhouse stall and turntable, the pier stop, the crossing
> bents), its clearance tests, and the `works` marks on the Sickle Isles map page and greybox. Read AGENTS.md,
> src/sim/AGENTS.md, docs/agents/tests.md and the plan's "Where it sits" and "Catalog". Compute the numbers from Place's
> `lineAt`/`railY`/`H` and `parseMapPage`; move a candidate only to pass a clearance test and list every move. No
> runtime module may import the new file; no state, ops or views. Proofs: npm run check and one greybox still from the
> quarry halt (open it and describe it). Commit with a short imperative message; don't push. Report the final
> numbers, every moved candidate, and anything in the plan that was wrong.

---

### Job J2: the blockout, already default-on (`?works=0` disables it)

**Files.** New `src/entities/railway/works-shape.ts` (pure data: boxes in world metres, no three.js), new
`src/entities/railway/works-flag.ts`, new `src/entities/railway/works-view.ts`, new
`src/entities/railway/roundhouse-view.ts`, `src/entities/railway/view.ts` (one wiring hunk), new
`test/works-shape.test.ts`, new `dev/look/evals/railway-works-at.ts`.

**Steps.**

- [x] **J2a. Shapes** (`works-shape.ts`), built from J1's catalog:
  - `SPLIT_ROCK_BOXES`: the outcrop as 10–16 yawed boxes (walls 16 m, a 3–5 m rim, the bowl floor at table height)
    with the cut's sides.
  - `THROAT_SLAB`: three toppling slabs filling the 8 m cut.
  - `CLEFT`: a 1.2 m gap on the south-east face. `WORKS_WALK`: a polyline from the halt round the east ledge, through
    the cleft, to the kiln's back.
  - `ROLLER_ROAD`: a polyline from the throat to `WORKS_RACK`.
  - `STALL_BOXES`: the stall walls and roof frame, 7 × 14 m along the stall road. `STALL_SLAB`. `STALL_ROAD`: rails
    from the table rim to the stall's back.
  - `PIER_SOCKETS`: 12 socket positions at the pier head.

  `test/works-shape.test.ts`:
  - `'the walk-in route is open'`: `WORKS_WALK` sampled every 0.5 m keeps 0.4 m from every box, and the cleft is
    ≥ 1.2 m wide.
  - `'the throat is shut'`: no gap ≥ 0.6 m through the cut with `THROAT_SLAB` in place.
  - `'no box on a rail, path, plot or frame'`: the J1 clearances, applied to the boxes.
  - `'the roller road clears the camp'`: ≥ 1.5 m from both quarry camp plot sets and the derrick.
- [x] **J2b. Flag.** `works-flag.ts` exports `worksPreview(): boolean`, true unless the address has `works=0`.
  Default-on from J2 per the owner's 8 November answer; there is one check site in `view.ts`.
- [x] **J2c. `works-view.ts`**, `createRailwayWorks(adapter, owner)`, dormant pose only:
  - the outcrop in a limestone blockout colour, with `addStatic(…, owner)` colliders;
  - the throat slab solid, with a painted seam line;
  - the kiln's back and a cold chimney, the cold roller road, and the Works rack with one broken sample footing
    (a 1.6 × 1.2 × 1.6 m block with a notch);
  - the two limestone rocks drawn as static boulders (J4 swaps them for real sources).

  `update()` does nothing yet; `inspect()` returns `{ boxes: n, slab: true }`.
- [x] **J2d. `roundhouse-view.ts`**, `createRailwayRoundhouse(adapter, owner)`, dormant pose only:
  - the stall shell on its road;
  - the cracked door slab, solid;
  - a tarp over the shunter (a small engine: one cab box, one boiler cylinder, 4 m long) and the wagon (a flatbed,
    `TRAILER`'s size, with an empty cradle frame drawn as outlines);
  - two empty sockets in the floor;
  - the stall road's rails from the turntable rim.

  `inspect()` returns `{ slab: true, tarp: true }`.
- [x] **J2e. Wire** both in `view.ts` after the cart, only when `worksPreview()`, and free them with the owner. Add
  `update`, `restore`, `targets` and `inspect` calls alongside the cart's.
- [x] **J2f. The eval** `dev/look/evals/railway-works-at.ts`, modelled on `railway-b4-at.ts`. It teleports and frames
  the camera at `worksat` = `halt` (on the quarry halt facing the seam), `ledge` (east ledge at the cleft), `bowl`
  (inside, facing the kiln's back), `stall` (from spawn toward the stall), `table` (beside the turntable facing the
  stall road) or `pier` (at the pier head facing north). It must work on a fresh world (no seed). J3 extends it to wait
  for seeds.
- **Proofs.**
  - `npm run check`.
  - Stills, each opened and described: broker `look --real --eval dev/look/evals/railway-works-at.ts
    --query 'worksat=<v>'` for `halt`, `ledge`, `bowl` and `stall`. The seam should read from the halt, the cleft from
    the ledge, and the stall ruin from spawn.
  - One walk: a look `--action` that walks `WORKS_WALK` from the halt into the bowl without a jump. Report whether it
    arrived.
  - `npm run perf` with `works=0` versus default, at the quarry halt. Report draw calls, triangles and
    frame ms; the target is ≤ 10 extra draw calls (instance or merge the boxes).
  - With `works=0`, a still at `worksat=halt` is unchanged from main.
- **Done means.** All proofs pass and were looked at. No state, ops or sim edits. `works=0` bypasses both views and
  their colliders; the normal visit includes the dormant blockout.

**J2 implementation departures (8 November).** J1 pins interaction anchors, not full footprints. The proposed
7 × 14 m stall overlaps the existing path and the rotated hall. Its ruin is 4 × 9 m, two metres north of
`SHED_STALL`, heading west with a bent road from the table; the original seam anchor remains inside its slab.
Low side walls expose the tarp silhouettes and sockets. The outcrop has ten walls, with a buried 16 m base and
40 m rim because the sea-face ground falls below 18 m. No terrain is flattened. The cleft is 1.4 m wide.
The roller road bends around both quarry camp states; the bowl walk also bends around the dormant boulders.
`works-box-view.ts` is shared by both views: two box batches plus the boiler cylinder, at most three added scene
draws with no new shadow draws. No changes to `src/proto/greybox`, state, ops or sim.

**J2 proof record (8 November, `codex/works-blockout`, base `471223a2`, J1/#1218).** `npm run check` passed
all gates and 543 unit tests after the final socket placement. Inspected stills and broker manifests:

- [Halt](../../.look/evidence/1794206486301-83568/evidence.json): the three-part closed throat and dark seam
  read beyond the existing quarry rocks; the roller road leads to the notched sample at the rack.
- [Ledge](../../.look/evidence/1794206487457-83653/evidence.json): the narrow vertical cleft reads between
  the sea-face walls. Their buried bases meet the sloping terrain.
- [Bowl](../../.look/evidence/1794206488639-83691/evidence.json): cold kiln back and chimney are clear;
  one existing tree stands beside them and a limestone boulder occupies the foreground.
- [Stall from spawn](../../.look/evidence/1794206881903-95337/evidence.json): the low shell exposes the
  covered cab and wagon. [Close view](../../.look/evidence/1794206882931-95399/evidence.json) confirms
  two empty apron sockets in front of the closed slab, clear of the vehicles.
- [No-jump walk](../../.look/evidence/1794206490945-83734/evidence.json): arrived at world
  `(1133.073, 25.575, 94.203)`, no jumps or recovery, 0% airborne in 3324 recorded frames. Opened the end
  still and curves. The first attempt stopped at a new boulder; the polyline now goes around it, and the
  clearance test includes both boulders. The full route is 210.94 m (about 169 m to the cleft, longer than
  the plan's 120 m estimate); the body descends to 9.3 m on the outer ledge before climbing into the bowl.
- Opened [original main view](../../.look/evidence/1794206347462-80587/evidence.json) and
  [`works=0`](../../.look/evidence/1794206514698-84323/evidence.json) halt stills: visually the same geometry,
  path, camp and trees. Not pixel-identical: 1.07% of pixels differ, mean RGB channel difference 0.016/255
  across live captures. The baseline used the original `origin/main` view file, then restored the wiring.

Matched quarry measurements use `railway-works-at.ts` with `worksperf=1`, the existing `observeGpu` and
`hardwareTiming` profiler, on the Mac's Apple Metal adapter. Both use `gpuProfile=portable`, MSAA 1,
390 × 844 pixels, identical camera and a five-second sample (300 frames). The profiler UI obscures much
of these diagnostic stills; the four clean stills above establish the visual verdict.

| Quarry halt | [`works=0`](../../.look/evidence/1794206515843-84444/evidence.json) | [Default](../../.look/evidence/1794206884185-95480/evidence.json) |
| --- | ---: | ---: |
| Draw calls | 102 | 103 |
| Triangles | 917157 | 917961 |
| Main-thread CPU avg / p95 ms | 3.723 / 4.10 | 3.667 / 4.10 |
| Completed-frame interval avg / p95 ms | 16.6659 / 16.70 | 16.6662 / 16.80 |

One extra draw and 804 triangles meet the ten-draw budget. Average frame interval is unchanged to 0.01 ms;
p95 rose 0.1 ms. This single pair cannot distinguish that change from scheduling variation or guarantee device cost.
Portable mode disables timestamp queries, so GPU execution time is unavailable. Real devices, exclusive GPU
use and real-time smoothness remain unverified.

The broker's `perf` has no quarry pose or eval option: its fixed overview is a separate smoke, not the quarry
comparison. Final render-only [off](../../.look/evidence/1794207034966-99402/evidence.json) and
[on](../../.look/evidence/1794207036112-99535/evidence.json) runs passed: 156/162 draws,
1268045/1271765 triangles, CPU table averages 4.742/5.747 ms (including 180/210 ms startup outliers, not
steady-state frame timings). Earlier headed perf runs returned data but failed on two local 404 console errors;
they are not passing evidence. The first off quarry run was also invalidated by an external trusted-harness
update and was repeated. No new scenario or harness was added.

**Codex brief (paste):**

> Build job J2 of docs/plans/split-rock-roundhouse.md on a branch from origin/main (J1 merged, or J1's branch tip if
> it hasn't merged; say which): the greybox-style blockout of the split rock (outcrop, throat slab, cleft, kiln back,
> roller road, rack) and the Roundhouse stall (slab, tarped shunter and wagon, sockets, stall road), as Local views
> with static colliders, on by default (`?works=0` disables it). Also `works-shape.ts` with its tests and the
> `railway-works-at.ts` eval. Read AGENTS.md, src/entities/AGENTS.md, .claude/rules/state-consumers.md,
> docs/agents/rendering.md, docs/agents/verification.md and the look skill. Follow J2a–J2f. No state, ops or sim
> edits; one wiring hunk in view.ts. Proofs: npm run check, four stills (open and describe each), the no-jump walk
> into the bowl, and npm run perf before and after. Commit; don't push. Report the stills, the perf numbers and
> anything the plan got wrong.

---

### Job J3: rules, server, adapter, WORLD_NS and seeds (after B5–B8 job A)

**Files.** New `src/sim/railway-works.ts`, `src/sim/railway-world.ts`, `src/sim/railway-systems.ts`,
`src/sim/railway-train.ts`, `src/sim/railway-line2.ts`, `src/sim/railway-line.ts`, `src/sim/railway.ts`,
`src/sim/railway-supply.ts`, `src/world/railway-server.ts`, `src/world/railway-predict.ts`, `src/world/namespace.ts`,
`src/adapters/railway.ts`, `server/src/host/world-host.ts`, `dev/peer-test/ws-page.ts`,
`dev/spikes/ecs/railway-diff.ts`, new `test/helpers/railway-works.ts`, new `test/railway-works.test.ts`,
`test/railway-train.test.ts`, `test/railway-replicate.test.ts`, `test/railway-line.test.ts`, new
`server/test/railway-works-host.test.ts`, `dev/look/rail-seed.ts`, `dev/look/evals/railway-works-at.ts`.

**Steps.**

- [ ] **J3a. State.**
  - `Works = defineComponent('works', { breaker: 'u8', seams: 'u8', logs: 'int', stone: 'int', lit: 'int',
    rack: 'int', poured: 'int', pierRack: 'int', pierSet: 'int', crossing: 'int' }, { requires: [WorksClock],
    defaults: { lit: -1, crossing: -1 } })`, with `WorksClock` `{ lastCast: 'int' }` (`replicate: false`).
  - `Shed = defineComponent('shed', { stall: 'int', cradle: 'int', cradleRails: 'int', fitted: 'int', table: 'u8',
    tableRev: 'int', ready: 'int' }, { defaults: { fitted: -1, ready: -1 } })`.
  - `Account` gains `foot: 'int'`; `Train` gains `wagon: 'bool'` and `foot: 'int'`.
  - Append `Works` and `Shed` to `RAIL_COMPONENTS` after `Train`. `createRailwayWorld` spawns one of each, and Rock
    slots 3 and 4 from `WORKS_ROCKS`. Add them to `ARCHETYPES` and the counts.
  - `railwayView`, `refreshRailway` and `copyRailway` carry `works`, `shed` and the new fields.
  - Write `src/sim/railway-works.ts` ("New module") and wire `validateRailWorks` into `railwayCheck`, together with
    the changed stone, log and rail totals.
- [ ] **J3b. Systems.** Everything in "Systems", in a Works block after the train block, and the seven ops in `OPS`.
  Update the file header's index.
- [ ] **J3c. Trains.** `trainStops`, `LINE_HALTS`' Pier row, the stop-0 couple, the stop-1 load and the stop-3 unload,
  as in "Train changes". `trainEtaTicks` uses `trainStops`.
- [ ] **J3d. Server, host, prediction, adapter** as in their paragraphs. `ws-page.ts` gets the op cases;
  `railway-diff.ts` gets the ops in both lists.
- [ ] **J3e. WORLD_NS** v22 (or the next free version) with its history line.
- [ ] **J3f. Helpers and seeds.** `test/helpers/railway-works.ts` exports `railwayAtWorks(stage)`, built on B5–B8's
  `railwayAtTrains('q6-done')`. Each stage asserts `railwayInvariant === null`:
  - `works-arrive`: the breaker on the pedestal;
  - `works-open`: `a` takes it and strikes both seams;
  - `works-lit`: 16 logs and 16 stone deposited; advance until the rack holds 6;
  - `stall-done`: `a` carries 2 footings to the stall;
  - `cradle-fitted`: 2 more footings and 8 rails;
  - `wagon-on`: the table turned; advance until `train[1].wagon`;
  - `crossing-finishing`: `pierSet` 10, `pierRack` 2;
  - `crossing-done`.

  `rail-seed.ts` adds the eight stages. `railway-works-at.ts` waits for a seed when `--rail-seed` is given, and prints
  `inspect().works` and `inspect().shed`.
- [ ] **J3g. Tests.**
  - `test/railway-works.test.ts`:
    - `'breaker cast once when Q6 completes; one taker'`;
    - `'a strike needs the breaker and is idempotent'`;
    - `'the kiln waits for the throat; lights once when both bills are full'`;
    - `'pours one footing every 80 ticks to a rack of 6, 16 in all'`;
    - `'a footing fills your back'`: no other take while carrying one; a full back can't shoulder one;
    - `'sites in order'`: no stall before the slab, no cradle before the stall, no pier before Q6;
    - `'fitted once; the table needs the stall; a stale revision is 0'`;
    - `'ready only after fitted and turned; turning back before coupling cancels it'`;
    - `'a dropped footing is a pile; it recovers to the Works rack'`;
    - `'snapshot mid-cast keeps rack and poured'`;
    - `'malformed documents fail atomically'`: lit with logs 15, `wagon` without `fitted`, `foot` 2, `pierSet` before
      Q6.
  - `test/railway-train.test.ts`:
    - `'the pier stop opens with Q6'`;
    - `'the wagon couples at the village, only when ready'`: a standing train holds ≤ `rollTicks`;
    - `'loads at the quarry, unloads at the pier'`;
    - `'every footing has one home every tick'`: `footingTotal === poured` from `works-lit` to `crossing-done`;
    - `'pose is continuous with four stops'` (B5–B8's continuity test, extended);
    - `'eta with four stops'`.
  - `test/railway-replicate.test.ts`: `footTake` predicted, then refused, comes back as a correction; `lit` and
    `fitted` aren't predicted; `strike` and `turn` aren't predicted.
  - `test/railway-line.test.ts`: the rock count and stone totals.
  - `server/test/railway-works-host.test.ts`:
    - a strike from 20 m is `rejected`, at the seam `accepted`, and again `noop`;
    - `kiln` before the throat is `rejected`;
    - `turn` with a stale revision is `rejected`;
    - a restart mid-cast keeps rack and poured, and a restart with the wagon aboard keeps `foot`;
    - an aged footing pile with nobody near goes back to the rack.
- **Proofs.**
  - `npm run check`.
  - `(cd server && node --test test/railway-works-host.test.ts test/railway-line-host.test.ts)`.
  - `npm run test:net`, and `WS_LOAD_CHURN=train npm run load` (B5–B8's row) on the `wagon-on` seed: the spread
    between tabs stays under 1.6 m with four cars and four stops. Also report the server ms per step.
  - `npm run look -- --rail-seed works-lit --eval dev/look/evals/railway-works-at.ts --query 'worksat=halt&works=1'`
    prints `works.rack 6`.
- **Done means.** All of the above green, every seeded stage loads, `WORLD_NS` bumped with its history line, and no
  view file changed. Don't ship while the owner is mid-session (the `WORLD_NS` bump resets saves).

**Codex brief (paste):**

> Build job J3 of docs/plans/split-rock-roundhouse.md on a branch from origin/main after B5–B8 job A
> (`codex/b5b8-rules`) has merged; if it hasn't, branch from its tip and say so. Scope: the Split-rock Works and
> Roundhouse Server-kind state (new ECS components `works` and `shed`, `foot` on accounts and trains, the train's
> `wagon`, rock slots 3–4, pile kind 3), ops `rail.breaker/strike/kiln/footTake/footSet/cradle/turn`, the train's
> fourth stop at the pier and the wagon's load and unload, the invariants and changed conservation totals, server
> validation, prediction, the adapter API, one WORLD_NS bump (the next free version), the eight `--rail-seed` stages
> and the tests. Read AGENTS.md, src/sim/AGENTS.md, src/world/AGENTS.md, server/AGENTS.md,
> docs/agents/room-safety.md ("Don't"), docs/agents/mixed-builds.md and docs/agents/lockstep.md first. Follow "The
> rules" and J3a–J3g exactly; take the positions from J1's catalog. No effects in apply; no Math.random, wall clock
> or native trig in src/sim; every transfer is one atomic apply with a conservation test. Don't touch src/entities or
> dev/look/bots. Proofs: npm run check, the two server test files, npm run test:net and the train load row through
> the look broker, and the seeded eval's printout. Commit; don't push; don't merge before the owner has played B5–B8.
> Report what passed, what didn't, and anything in the plan that was wrong.

---

### Job J4: the Works and the Roundhouse, live (after J3 and B5–B8's C)

**Files.** `src/entities/railway/works-view.ts`, `src/entities/railway/roundhouse-view.ts`,
`src/entities/railway/works-flag.ts` (default on), `src/entities/railway/sources.ts` (one hunk: draw and target
`RAIL_ROCKS`), `src/entities/railway/boiler-view.ts` (one hunk: export the pedestal for reuse, if C didn't).

**Steps.**

- [ ] **J4a. The breaker.** On C's pedestal while `breaker === 1`, with gold motes: a broad-faced hammer, 1.4 m long.
  The target `railway-breaker` (**Take the breaker**, within 3.6 m) runs `adapter.takeBreaker()`; on accepted, a
  `thump` and the breaker shown on Buddy's back. A taken breaker isn't drawn on the pedestal.
- [ ] **J4b. Strikes.** The targets `railway-strike-0`/`-1` (**Strike the seam**) appear when `breaker === 2` and the
  bit is unset, within reach of the seam. On the press, a Local 0.8 s swing with the breaker in hand (no state). On
  accepted, the slab pieces topple along authored arcs (or pop apart for the stall slab), a dust ring and a deep
  `clank`, and the colliders are removed. On restore they snap open, with no show. Offer the 8 November switch-zoom
  cinematic for the throat, for whoever struck, skippable and Local, reusing the sea switch's camera move.
- [ ] **J4c. The kiln.** The frame faces the open cut. `railway-kiln` (**Fill the kiln**) when the throat is open, the
  kiln is unlit and your back has logs or stone; it runs `adapter.fillKiln()`. Draw the stock rising on the frame
  (logs stacked, stone in a hopper) from the prediction. When lit (accepted, or a live edge): fire glow, chimney smoke
  and a whoosh. Each cast (a `rack` rise) sends a footing down the roller road in 4 s to the rack (Local flight, as
  the forge's pour flights do). Rack stacks come from state.
- [ ] **J4d. Footings.**
  - `railway-foot-take-0` (**Shoulder a footing**) at the Works rack runs `adapter.shoulderFooting(0)`.
  - The worn model is the sample block on the avatar's load frame, for you and remote holders by pid, with a stoop.
    Copy boiler-view's worn-model approach in this file; don't edit `line-cargo.ts`.
  - The drop uses the existing `place-drop`: no new binding, since `rail.drop` kind 3 already covers it. A footing pile
    draws as the block lying on the ground.
- [ ] **J4e. The stall.**
  - `railway-foot-set-0` (**Set the footing**) at the sockets runs `adapter.setFooting(0)`. Each footing lowers into
    its socket.
  - At `stall === 2`, the stall frame rises in 3 s of scaffold pieces (Place's physical build, not scaling), the tarp
    slides off, and the shunter and wagon show. Restore snaps it.
  - `railway-foot-set-1` and `railway-cradle` (**Fit the cradle**) at the wagon's bay. The cradle bolts on piece by
    piece (2 footing seats, 8 rail arms) from the prediction, and at `fitted` the wagon gets its brass cradle.
- [ ] **J4f. The table.**
  - `railway-turn` (**Turn the table**) by the turntable when `stall === 2` runs `adapter.turnTable(1 − table,
    tableRev)`. On accepted, rotate Place's `disc` (`src/proto/place/lines.ts`) 90° over 2 s through the same Place
    handle the views already use; don't import Place at module scope.
  - **The shunt** is driven by state: with `ready ≥ 0 && !train[1].wagon`, the shunter pushes the wagon over the table
    onto line 2 to `WAGON_S` within `rollTicks` (6 s), timed from `ready − rollTicks` on `adapter.tickNow()`, then
    backs into the stall. If `ready` returns to −1, the wagon rolls home.
  - When `train[1].wagon` is true, this view hides its wagon and B's train-view draws it (J5). Restore snaps to the
    right pose.
  - The wagon is a solid platform `railway:shed-wagon` while it is parked.
- [ ] **J4g. Rocks.** `sources.ts` iterates `RAIL_ROCKS`, so the two limestone rocks mine like line 1's. Remove J2's
  static boulders.
- [x] **J4h. Already default on in J2.** `worksPreview()` returns true unless `works=0`; keep that off switch for
  before/after performance and the unchanged-still proof.
- **Proofs** (seeded; open every PNG):
  - The breaker on its pedestal with **Take the breaker** at `works-arrive`, `worksat=table`, plus an `--action` take.
  - The stall slab strike as a 6 s `--video` from `works-arrive` with an `--action` that takes, walks and strikes.
  - The throat strike at `works-open` minus the throat (an `--action` strike), `worksat=halt`, `--video --seconds 8`.
  - The kiln lighting and the first footing on the rollers: a 15 s video from `works-open` with the two deposits.
  - The stall rising and the tarp off: from `works-lit`, set two footings (`worksat=stall`).
  - The cradle fitted: a `cradle-fitted` still.
  - The turn and shunt: from `cradle-fitted`, an `--action` turn, a 10 s video at `worksat=table`.
  - Reload `wagon-on`, `stall-done` and `works-open`: no shows replay (5 s videos).
  - `npm run perf` at the quarry halt and the stall, against J2's numbers. `npm run check`.
- **Done means.** Every proof passed and was looked at, no change outside the listed files, and the flag is default on.

**Codex brief (paste):**

> Build job J4 of docs/plans/split-rock-roundhouse.md on a branch from origin/main (J2, J3 and B5–B8's job C merged):
> make the Split-rock and Roundhouse views live from state: the breaker on the boiler's pedestal, both strikes, the
> kiln and its roller-road flights, footings on the rack, on backs and on the ground, the stall rising, the cradle,
> and the turntable turn with the shunter pushing the wagon to line 2. Then turn the `works` flag default on. Read
> AGENTS.md, src/entities/AGENTS.md, .claude/rules/state-consumers.md, docs/agents/room-safety.md ("Don't"),
> docs/agents/verification.md and the look skill. Follow J4a–J4h and keep the pinned names. Effects play on the press
> (predicted ops) or on accepted events and live edges, never on restore. The shunt's timing comes only from `ready`
> and `adapter.tickNow()`. Touch only the files listed for J4. Use the `--rail-seed` looks for every proof; don't run
> the full playthrough. Commit; don't push. Report each still or video and what you saw.

---

### Job J5: the footing wagon, the pier and the crossing; the bot and the record (after J3, J4 and B5–B8's B and D)

**Files.** `src/entities/railway/train-view.ts` (a wagon hunk), `src/entities/railway/halts-view.ts` (the Pier row),
new `src/entities/railway/crossing-view.ts`, `src/entities/railway/view.ts` (wiring hunk),
`dev/look/bots/railway.ts` (a new segment), new `dev/look/evals/railway-works-bot.ts`,
`dev/look/evals/railway-photo.ts`, `docs/game-design/place.md`, `docs/plans/production-core.md` (slice notes),
`src/proto/greybox/README.md`, this plan (record).

**Steps.**

- [ ] **J5a. The wagon on the train.**
  - With `train[1].wagon`, `train-view` adds a fourth car at −7.4 m: the wagon with its cradle, posed like the others,
    on platform `railway:train1-3`, `shared = true`. It has no seats.
  - Footings aboard are drawn on the cradle (`foot` blocks).
  - Arrival flights are Local, on the row's live edges: footings hop from the Works rack to the wagon at the quarry
    stop and from the wagon to the pier rack at the pier stop. They count in `trainFlying()`, so the racks hold their
    count until each flight lands, as the kit does.
- [ ] **J5b. The Pier halt.** `halts-view` builds one more halt from `LINE_HALTS[5]`, shown once `line2Completed ≥ 6`
  and dropped in on that live edge. Calls and the board work as for the others.
- [ ] **J5c. `crossing-view.ts`**, `createRailwayCrossing(adapter, owner)`:
  - From Q6 completion, draw the 12 sockets and the north stakes along `ringx`, and the pier rack with its stack.
    `railway-foot-take-1` (**Shoulder a footing**) and `railway-foot-set-2` (**Set the footing**) sit at the pier
    head's frame.
  - Each set lowers a footing on a rope from a small pier-head jib into its socket in the sea.
  - Each pair raises a trestle bent to deck height (4 m over the sea, per the 8 November low-lines call) in 2 s of
    pieces.
  - At `crossing ≥ 0`, a live edge only: one `whistle` and two rockets at the last bent. Snap on restore.
  - `inspect()` → `crossingView`.
- [ ] **J5d. The bot.** `splitRockToCrossing({ bot, checkpoint, walkQuarry })`, after D's `boilerToPier`:
  1. Ride from the pier to the village; take the breaker → `checkpoint('breaker')`.
  2. Strike the stall slab → `checkpoint('stall open')`.
  3. Take 16 logs from the nearest grove (the existing chop helpers); ride line 2 to the quarry halt; strike the
     throat → `checkpoint('throat open')`.
  4. Deposit the logs; mine the two rocks; deposit the stone → `checkpoint('kiln lit')`.
  5. Wait for `rack ≥ 1` → `checkpoint('first footing')`.
  6. Four hand trips home: `checkpoint('stall built')`, then **Fit the cradle** with 8 rails from the forge rack →
     `checkpoint('cradle fitted')`.
  7. Turn the table → `checkpoint('table turned')`; wait for `train[1].wagon` → `checkpoint('wagon coupled')`.
  8. Ride to the pier; wait for `pierRack ≥ 1` → `checkpoint('footings at the pier')`; set 12 →
     `checkpoint('crossing footed')`.

  The friend (`second`) waits on `crossing` and checkpoints `crossing footed`. Checkpoints before `pier` are unchanged.
- [ ] **J5e. Seeded halves.** `railway-works-bot.ts`, modelled on `railway-b5b8-bot.ts`: `railFrom=works` starts at
  `--rail-seed works-arrive` and `railFrom=wagon` at `wagon-on`; `railStop` ends at a named checkpoint. No teleport, no
  direct op, no recovery.
- [ ] **J5f. Frames** in `railway-photo.ts`: `'throat open'` (from the halt through the cut), `'stall built'` (the
  stall with shunter and wagon), `'wagon coupled'` (the train at the village with the cradle wagon), `'crossing footed'`
  (from the pier head north along the bents toward Ring Island, with `greybox=sickle`).
- [ ] **J5g. Record.**
  - In `place.md`, add a "Production Split-rock Works and the Roundhouse" section after B5–B8's: the breaker, the
    strikes, the kiln, footings and their conservation, the stall, the cradle, the turn, the wagon and the crossing.
  - Write J1–J5's *Built* notes in this plan, with departures, checkpoint times, stills, the `WORLD_NS` version and
    "not tested on a device".
  - Add slice notes in `production-core.md`, and note in the greybox README that the crossing bents stand in the
    production world.
  - Then the orchestrator's final pass and playtest guide; work carries on.
- **Proofs.**
  - `npm run check`.
  - Seeded halves `railFrom=works&railStop=wagon coupled` and `railFrom=wagon&railStop=crossing footed`: both pass
    with no recovery. Report checkpoint times, including the four hand trips, for the pacing estimate.
  - Stills at the four frames, opened.
  - `npm run perf` on a moving train with the wagon and at the pier with 6 bents.
  - `npm run test:net` (J5 changes the train consist).
- **Done means.** Both halves pass with no recovery. Checkpoints before `pier` are unchanged. The docs are updated.

**Codex brief (paste):**

> Build job J5 of docs/plans/split-rock-roundhouse.md on a branch from origin/main (J3, J4 and B5–B8's jobs B and D
> merged): the footing wagon as line 2's fourth car with its load flights, the Pier halt, `crossing-view.ts` (sockets,
> the pier rack, footings lowered into the sea, bents rising), the bot segment `splitRockToCrossing` with its
> checkpoints, the seeded eval, four photo frames, and the record. Read AGENTS.md, src/entities/AGENTS.md,
> .claude/rules/state-consumers.md, docs/agents/room-safety.md ("Don't"), docs/agents/verification.md and the look
> skill. Follow J5a–J5g and the pinned names. The wagon's pose comes only from the train row and `adapter.tickNow()`;
> effects play on live edges, never on restore. Don't change any route before `pier`. Proofs: npm run check, the two
> seeded half-runs with no recovery, four stills (open and describe each), npm run perf and npm run test:net. Don't
> run `playthrough --long` (the orchestrator does that once). Commit; don't push. Report checkpoint times, any
> recovery, and what each still shows.

---

### Final pass (orchestrator, once)

On main with J1–J5 merged, run `npm run playthrough -- --long --eval dev/look/evals/railway-job.ts --query
'shot=play'`. It must pass every checkpoint through `crossing footed` with no errors. Then write the playtest guide:
what's new, the gut question, what to try (both strikes, a footing home by hand, the turn, a ride with the wagon), and
the solo/two-player time. Development carries on; the owner plays when they can (owner, 9 November).

## Bot checkpoints added

`breaker`, `stall open`, `throat open`, `kiln lit`, `first footing`, `stall built`, `cradle fitted`, `table turned`,
`wagon coupled`, `footings at the pier`, `crossing footed`. The friend adds `crossing footed`.

## Risks

- **Room safety ("Don't").**
  - No effects in apply. Strikes, topples, fire, roller flights, the stall rising, the shunt, the lowering and the
    bents all play on the press (predicted ops) or on accepted events and live edges, never on a rebuild, reload or
    late join. J4 and J5 prove that with reload videos.
  - `src/sim/railway-works.ts` uses only integer arithmetic.
  - Every op is judged from the actor's own position against the catalog, never from where the client says something
    is. A malformed `works` or `shed` row fails the load check atomically (J3g).
  - There is no new presence field: a footing on your back is account state.
- **Conservation** (production-core's stop condition).
  - Footings get eight homes: Works rack, back, ground pile, wagon, pier rack, stall, cradle, sea. `footingTotal ===
    poured` is checked every tick across the whole stage chain and across snapshots (J3g).
  - The kiln adds a stone sink and a log sink, and the cradle a rail sink. J3 updates the three existing totals
    together (`validateRailLine` stone, `railwayCheck` logs and stone, `line2Rails`). Missing one throws on load, which
    the seeds catch.
- **Hotspots.**
  - `src/sim/railway-systems.ts` (over 1,300 lines after A), `src/adapters/railway.ts` and `dev/look/bots/railway.ts`.
    Only J3 edits the first two and only J5 the bot; new logic lives in new files.
  - `view.ts` gets J2's and J5's wiring hunks, while B edits it too.
  - `train-view.ts` and `halts-view.ts` belong to B; J5 starts after B merges.
  - `rail-seed.ts` is shared by many branches; its stage lists are additive, so rebase rather than redesign.
- **B5–B8 collisions.** Nothing of J3–J5 starts before A, and J3 merges only after the owner's B5–B8 playtest. If B5–B8
  renames a pinned name (`TRAIN_STOPS`, `LINE_HALTS`, `heldBig`, `trainFlying`, the boiler pedestal), J3–J5 follow the
  merged name and note it.
- **Mixed builds.** One `WORLD_NS` bump in J3's commit (new kinds, new fields, rock slots, a stop). The ops are
  additive, with no compatibility code. Between J3 and J4 merging, a room past Q6 has the dormant default-on blockout
  without live interactions. Merge J3 and J4 in one ship batch to avoid that.
- **The turntable.** It is Place's junction disc, which the depot cart uses as its forge stop. The cart retires when
  trains run (B5–B8, B3), long before the breaker exists, so the two never meet. Line 1's and line 2's standing
  trains stop at s = 14 and 17, outside the disc. The wagon waiting at s = 9.6 is behind line 2's tail (11.7 m): J1
  pins it, and J4's shunt video checks it.
- **Moving platforms.** A fourth car adds 3.7 m to line 2's train. The halts (±11 m) still hold it. J3's load row and
  J5's ride check that riders and the spread stay inside a flatbed.
- **Early access.** The split rock's cleft is open from the start, but nothing inside works before Q6: the breaker
  doesn't exist, and the kiln frame sits in the sealed cut. Scouting early is welcome (route contract). Movement never
  supplies a strike, a kiln bill or a footing.
- **Performance.** The outcrop (about 16 boxes), the stall, 12 sockets, 6 bents, a fourth car and roller flights. J2,
  J4 and J5 run `npm run perf` before and after; the target is ≤ 10 draw calls for the blockout (instanced). The Works
  tick is one comparison per tick, and the train changes add one branch per arrival.
- **Pacing.** The four hand trips home are the deliberate "before" that the cradle relieves. If J5's timings show them
  over 10 minutes solo, the first lever is the wagon's ride (it already exists); the second is `WORKS.stall` 2 → 1.
  Don't raise the pier bill to make the relief look bigger.

## Owner questions

**Answered (owner, 2026-11-08):** all five as recommended, plus footings take a friend's Help carry like the great beam, and the J2 blockout shows by default (no `?works=1` flag). See the decision log.

Each has a recommended answer. Without an answer, the orchestrator builds the recommendation, under the small-calls
rule.

1. **Where does the breaker come from?** *Recommended: the forge casts it after Q6, on the boiler's old pedestal.* The
   Works can be walked into since Q3, and a breaker found inside would let players open the Works an hour early. The
   forge already makes each next thing (the axe, the boiler), and doubling back to a seam seen since Q3 is the
   ring-and-economy answer. Alternative: find it inside the bowl, as next-destination wrote.
2. **The Roundhouse:** *recommended: Place's junction turntable at Home, with a new stall to its south-west; the one
   engine is a yard shunter that pushes the cradle wagon onto line 2's train, whose own engine keeps running.* No line
   loses its service and no train runs onto a spur. Alternative: a new main-line engine that replaces line 2's (needs a
   spur and an engine swap, about a job more).
3. **How heavy is a footing?** *Recommended: one fills your back.* "Absurdly large bridge feet", and the hand trips
   make the wagon's relief obvious. Alternative: two per back (half the trips, a weaker before/after).
4. **The jump-upgrade balcony and ankle rings:** *recommended: not in this build; job E after the B5–B8 verdict.* E
   moves the double jump from line 1 to the ankle rings on the southern walk, with the balcony above the quarry halt
   and a ramp onto the split rock's rim. Production grants the jump on line 1 today, and the run you're about to
   playtest uses it. Alternative: build E together with J4.
5. **Where this area ends:** *recommended: when twelve footings stand in the sea and six bents point 120 m toward Ring
   Island.* The crossing's deck, laying and the island belong to Ring Island's plan. Alternative: carry on to a first
   laid stretch of the crossing here.

## Verification limits

Planning only. The positions are computed from Place's layout and the map page (`H`, `lineAt`, `railY`,
`parseMapPage`), and J1 pins them with tests. B5–B8's facts come from its plan and `codex/b5b8-rules` (A's three
commits, `WORLD_NS` v21), not from merged code. Pacing is an estimate. Not tested on a device.
