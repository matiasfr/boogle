> **Status: proposed (2026-11-10).** Light brainstorm (one agent, three lenses: play designer, systems architect,
> creative director). Design only: nothing here changes code, saves or a `WORLD_NS`. The owner's seed and his one pick
> (the currency is **Boogles**) are recorded in the [decision log](../decisions.md#decided) (10 November); everything
> else below is this brief's proposal, not his pick.

# Passenger trade (passenger-trade)

The owner's seed, 10 November 2026: "I want to design a new potential mechanic. Passenger trains if purchased should
have a benefit outside of just for players, as players max out once there are a few and don't need more space. It would
be cool if the little guys take trains between cities and generate like trade revenue that provides a income source
that can later be used for upgrades, so there's a fly wheel in addition to resources that is currency that can also be
used. currency should also be "Boogles""

**Read:** DESIGN.md (6, 7, 8, 9, 11, the core loop); the decision index and these entries: 6 November economy
principles amended (shared wallet, paused world, away credit `H × (1 − e^(−away/H))`, H = 2 h, no offline
production), 6 November roughly six hours, 2 November the rail builds the world ("no routing or quotas"), 9 November
upgrades chosen in the world with no menu, 9 November gold finds cut ("gave no reward and only echoed the crystals"),
10 November the train upgrade screen (Install; Upgrades versus Looks and sounds; "really satisfying to upgrade"), cars
bought per line ("lines should be plenty long where it's worth the upgrade"), long trains and loaders, stop on
request, every building can be walked into, junction stations; [money](money.md), [cart-first](cart-first.md),
[first-evening](first-evening.md), [engine-garage](engine-garage.md), [station-deposit](station-deposit.md),
[junction-stations](junction-stations.md), [express-train](express-train.md) (landed while this was written),
[ring-and-economy](ring-and-economy.md); [rail-map](../plans/rail-map.md);
`src/proto/place/folk.ts`, `residents.ts`, `seat.ts`, `seat-claims.ts`, `car-kit.ts`, `shop.ts`, `town-lines.ts`;
`src/sim/railway-away.ts`, `railway-lines.ts`; `dev/economy/ring-data.ts`, `ring-sim.ts`, `play-sim.ts`.
`npm run inflight`: one ship branch touches `docs/decisions.md`, `docs/agent-calls.md` and `junction-stations.md`
(a rebase, not a conflict of design). Game-direction fit: the wallet is decided and unbuilt; this gives it its first
source and its first sinks. It orders nothing ahead of Ring Island v27.

## Verdict: build smaller

Build it, but not as a v26 feature with saves and a wallet yet. **First a model and 2D step** (fares in the economy
model and in the playable [economy prototype](../economy/economy-prototype.html) the owner asked for on 6 November),
**then a flagged `?proto=trade` on today's game**: little guys riding Village to Far Head, a till at Home that fills,
and one thing to buy. The reasons: the wallet doesn't exist in `src/` or `server/`, so a real build is a new piece of
saved shared state plus the first spend op. Today's lines are short (line 2 is about 0.75 km), so fares are pocket
change; the flywheel only starts to bite from Ring Island (1.2 km on), where seats, not riders, are what's short. And
the economy model has to show that a second income doesn't shorten the six hours or make hauling pointless. The
production build (lockstep, saved) rides the next planned `WORLD_NS` bump after the prototype says yes.

## Pitch

Towns are full of little guys, and now they travel. They wait on the platforms, pull the request lever, climb into
the free seats, ride, get off and walk into a building at the other end, and every finished trip drops a coin, a
**Boogle**, into the room's shared wallet: a strongbox behind the ticket window in Home's hall, with a split-flap
counter over it. Boogles buy what makes the railway carry more people: a second passenger car, a fuller car, a third
train, station comforts, and the looks and whistles the garage already lists for "coins". More seats
carry more riders, and more riders pay for more seats. Materials still build the world: Boogles never buy logs, steel
or a step of the main route, and hauling is what grows the towns the riders come from. It serves **6, Communal
world** (one wallet, everyone's riders) and **11, Show, don't tell** (the wallet is a pile you can see, the reason to
buy a car is a platform of little guys left behind). It bends **the rail builds the world** a little: a second loop
beside goods, which question 2 bounds.

## Gut question

When the train pulled out and left little guys waiting on the platform, did you want to buy the second car, and once
you had, did you notice the till filling faster?

## Best suggestions, ranked

1. **Boogles come from people, materials from places** (design, systems). Fares are the wallet's source; the model's
   "surplus sold to the town" goes, and nothing converts either way. Hauling grows towns (the decided "towns grow from
   what arrives"), towns send riders, riders pay for seats. Why: two currencies that can't buy each other can't make
   each other pointless, and each needs the other to grow.
2. **The left-behind queue is the purchase prompt** (creative, design). Demand is tuned to run ahead of seats from Ring
   Island on, so a departing train leaves a visible crowd on the platform (up to 12 drawn). No number tells you to buy
   a car; the crowd does. Why: principle 11, and the owner's "players max out" is answered by riders who never do.
3. **A player never costs a fare** (systems, design). The sim counts every seat for riders; seats are view-only for
   them. When you sit, the little guy in that seat hops up and rides standing on the step, holding the rail. Why: the
   lockstep never reads host seat claims, so it can't desync, and riding with friends is never a penalty.
4. **The wallet is a strongbox at Home's ticket window** (creative). A glass coin column that rises, a split-flap
   counter over it, a coin's clink and the counter's flutter as each train's fares land, a paper tape of what was
   bought and by whom. Why: one physical place for the shared money, on the concourse every player crosses.
5. **The choice is seats or cargo for the engine's limited cars** (design). The boiler sets how many cars an engine
   pulls (owner, 10 November); a passenger car earns Boogles, a cargo car moves material. Cars are bought per line, so
   the long line where riders pay most is where seats go. Why: it makes the purchase a real decision, and it pays off
   "lines should be plenty long where it's worth the upgrade".

**Tensions.** (a) An idle flywheel against a hands-on builder: income accrues while you build, so the risk is a game
that plays itself; held by suggestion 1 and by sinks that are things you go and see (question 2). (b) The 8 November
agent call "trains earn no away credit" ([agent-calls](../agent-calls.md)) is about freight moving while the room is
empty; this brief gives the **till**, as a producer with a yard, the same capped away credit as every producer, and
moves no train. (c) Fine Prices' joke is that you pay $0; a shared wallet that buys wearables ends the joke at that
counter (question 4). (d) Riders pulling request levers make trains stop more, which slows freight a little: the
model step measures it.

## Shape

- **Sync:** the wallet (one integer), each halt's waiting count and each train's riders aboard (two integers per
  destination halt) are **lockstep** railway state, saved and hashed; fares are paid in the sim when a standing train
  lets riders off. Riders' bodies, where they sit, their walk to a door and every coin's clink are **Local**, drawn
  from those counts. The prototype runs the same rules **Host**-kind on the lead tab, unsaved.
- **Reuses:** `folk.ts`'s instanced little guys (4 draws for all of them; `riders`, `ride()`, the door targets), the
  passenger car's four bench seats (`car-kit.ts` `BENCH`), the request levers and train stops in `src/sim`, the away
  credit (`railAwayCredit`, `expNeg`), split-flap signs, the garage's Install and hold, the shared-moment system for
  the away sack.
- **Smallest first build:** `?proto=trade` on v26: Village to Far Head riders, a till at Home, one buy (section 10).
- **Risks:** an idle game; a second progress bar; the six hours; crowds on a phone (section 9).

## Done means

Each moment captured with `look`; the hooks named here are proposals for the builder to add.

- **Platform queue:** `?proto=trade`, spawn on the Village platform, `--eval` filling the Village's waiting count to
  12. A still shows twelve little guys on the platform; after the next departure (real-time clip) eight board, four
  stay. Measured: waiting before and after, seats filled.
- **A rider seat given up:** two players, one sits on line 2's car. The rider in that seat stands on the step; the
  wallet's fares for that trip match a run with nobody seated.
- **Fares land:** a clip at Home's ticket window as line 2's train stands: the coin column rises and the counter flips
  by exactly the trip's fares (asserted against the sim's wallet).
- **Alighting:** at Far Head, riders walk off the platform to a door and are gone inside within 20 s; none is left
  standing at the edge.
- **The buy:** with 300 Boogles, hold Install on the second passenger car; afterwards line 2 runs two cars, and the
  Boogles a minute (sim-side, logged) rises by at least half.
- **Phone:** the busiest frame (two platforms full and a train arriving) adds no draw calls for riders, who are
  instances in the folk's existing four draws; the till adds its own few at Home only.

## Open questions

1. **First step: the 2D page before the 3D prototype?** Recommended: yes, both, in that order: fares and seats added to
   the economy model and the playable economy prototype (about a day), then `?proto=trade` on v26 without waiting
   for an answer on the page. Answer: ___
2. **What may Boogles buy?** Recommended: passenger capacity (passenger cars past the first, the Six fit-out, more trains
   on a line once the double track allows), station comforts, looks and whistles, and the end-game goals;
   never materials, a part, or anything the main route needs. Answer: ___
3. **Where do fares land, and what about time away?** Recommended: every fare lands live in Home's strongbox, with no
   collecting; while the room is empty nothing runs, and the next join finds one capped away credit (H = 2 h) as a
   coin sack on the ticket counter that anyone empties with one press, played for everyone. Answer: ___
4. **Personal wearables: same Boogles from the shared wallet?** Recommended: yes, one currency, small fixed prices on
   wearables beside Fine Prices' absurd dollar tag, which stays as the joke; the "TODAY: $0" lines are the owner's to
   reword (listed in section 6). Alternative: the shop stays free. Answer: ___
5. **Do town sales stop paying?** Recommended: yes: fares are the only source of Boogles and surplus stays in the yards,
   so materials and Boogles never convert; the economy model is retuned to the same end-game hours. Alternative: keep
   both sources. Answer: ___

## Parked

- A conductor little guy on the car's step who collects the coins and waves them at the window: after a yes.
- Named regulars who ride the same trip each day and remark on new seats ([starting-area-folk](starting-area-folk.md)).
- Tourists from the mainland by boat ([ideas](../ideas.md), "Visitors from the mainland") as a late demand boost.
- Fares by time of day once there is room-owned time ([first-evening](first-evening.md)).
- A season ticket gag: The Boogler sells one to a little guy for a ride that is free anyway.

---

## 1. The loop

Little guys live in the towns (Home's cottages, Ring Island's town, Canopy Town, Port Quay, High Gorge) and work at
the sources (the timber camp, the Quarry and the Works, later the steel works, the cloth loft). Each place sends riders
at a rate set by its population; they wait at their halt, ride, and pay a fare when they step off. The fares go into the
room's one wallet; Boogles buy seats and service; more seats carry more riders. **The inputs:** seats per line (cars ×
seats per car), speed (the boiler), frequency (trains per line), connected towns (each new place adds riders and new
pairs), distance (fares rise with it), and station tier (a junction station's pull). **What players do:** choose which
line gets seats, whether the engine's next car is seats or cargo, whether to save for a third train or spend on a
station's fit-out, when to connect the far town, and (the main thing, unchanged) haul and build, which grows the towns. **What
just accrues:** the fares themselves. Nobody routes riders, sets fares or timetables a train ("no routing or quotas").

## 2. Riders in the world

- **Where they come from and go:** homes to jobs and sights. At v26: Village cottages to the timber camp (line 1), the
  Quarry and the Works, and Far Head, where the village goes to look at the shard across the water (a free tie to Ring
  Island's religion: someone must always be looking at it). Later, every town to every town and to the sources on its
  line.
- **On the platform:** up to 12 drawn per platform, standing in a loose queue at the passenger car's stop mark, facing
  the way the train comes; the first in line pulls the request lever when a train is due (the existing lever).
- **Boarding:** they climb into free seats in order. **A player is never refused:** riders take seats in the sim's count
  but never in the seat claims; if a player claims a seat a rider's in, that rider hops to the car's step and rides
  standing. A full car with riders left over shows as the queue left behind.
- **Getting off:** they step down, walk to a building's door (the walk-in rule gives every place one; the folk already
  steer to door targets) and go in; a halt with no building (the Quarry, Far Head) has its own: the Works' door, the
  lookout bench at Far Head where they sit and stare a moment and then wander off along the path.
- **Budget:** riders are more instances in folk's existing four instanced draws (heads, coats, limbs, held), so draw
  calls don't change. Drawn at once, at most about 24 more: one platform's 12, two cars' 8 riders, 4 walking off.
  Folk already stop updating and drawing past 150 m (`SLEEP`), so a far train's riders cost nothing. **Simulated:** only
  integer counts. **Drawn:** whatever the counts say near the camera, placed by a local, seeded rule.

## 3. The money

**A fare** is paid when the rider steps off: 2 Boogles to board plus 1 for every 100 m ridden, doubled to or from a
junction station ([junction-stations](junction-stations.md): Home, Ring Island and the later five). Village to Far Head
is 7; Village to Ring Island (about 2 km) 22, or 44 with the junction; Home to Canopy Town about 80.

**The curve**, from a scratch run on the economy model's ride times (`railRideS`, its dwell and acceleration, the solo
timeline of `ring-sim.ts`). Demand is set to run ahead of seats from Ring Island on. Stand-ins, to be put in the model
(section 8):

| Stage (solo hours) | Places riders travel between | Seats, line 1 + line 2 | Boogles a minute | What it buys |
| --- | --- | --- | --- | --- |
| v26 today (0–1.2) | Village, Camp, Quarry, Far Head | 4 + 8 (one Four car on each train) | about 65, seats short at Village | Line 2's second passenger car, 300; the car's roof and lamps (a look), 150; a two-tone whistle, 100 |
| v26, after the buy | the same | 4 + 16 | about 110 | |
| Ring Island (1.7–2.5) | + Ring Island town | 4 + 16 | about 150 to 200 | Line 1's second car, 300; Ring Island's station house fitted out, 800 |
| First branch (2.5–3.9) | + Canopy Town | 4 + 24 (the longer boiler's fourth car taken as seats) | about 250 | The Six fit-out on line 2, 1,200; Canopy Town's station house fitted out, 1,500 |
| High Port (3.9–4.7) | + Port Quay | 4 + 24, 30 m/s | about 300 | A third train on line 2, 4,000 |
| Ring closed (4.7–6) | + High Gorge, the 8.7 km ring | 4 + 36 (three trains), 40 m/s | about 650 | Waiting rooms, canopies and lamps round the ring, 1,000 to 3,000 each; the end-game goals (the model's G1–G8, 1,500 to 30,000 each) |

A capacity buy is priced at about 5 to 15 minutes of the income it is bought from and raises that income by a third or
more, so it pays back within a sitting. By six hours a solo room has earned about 100,000 Boogles: about six times the
model's 17,000 from surplus sales, so either the fare scale comes down or the end-game goals' prices rise; the model
decides that (question 5).

**Boogles beside resources:**

| Priced in materials and parts (as now) | Priced in Boogles |
| --- | --- |
| Track, bents, footings, station frames, the forge's and works' stages | Passenger cars past the first, the Six fit-out |
| Engine parts: the boilers (which set speed and the car cap), the plough | More trains on a line, once the double track allows |
| Cargo cars past the free first, cradles, loaders | Station comforts and fit-outs |
| Interchanges (steel and rails, the express-train brief's proposal) | |
| Every gate, ability and main-route step | Looks and whistles (the garage's "coins"); wearables (question 4); the end-game goals |

Boogles can never buy a main-route requirement. The engine-garage review's rule (nothing the main route needs is
priced in something that can run out) holds twice: Boogles can be spent to zero, and they never gate the route, so a
room that spent everything on hats is never stuck.

## 4. Sinks

What Boogles buy is in the table above. **What stops inflation:** prices are fixed and never scale with the wallet
(Fine Prices' climbing tag stays a joke on its own sign); each capacity step costs more than the last (about ×1.6);
income is capped by seats and by riders, never compounding on the balance (no interest); the end-game goals are large
fixed sinks and looks are a collection with no end. **Personal cosmetics** (the pause wardrobe, Fine Prices: today
every item is free, with absurd tags from $8 million to $3 billion and "TODAY: $0", `src/render/cosmetic-parts.ts`
`STOCK`): question 4 recommends one currency from the shared wallet (the model's G8 "A hat for each friend" already
assumes it; the 6 November call made the wallet anyone's to spend), with secret-crate finds staying personal and free.

## 5. Away and co-op

- **Paused world:** nothing runs while the room is empty (the 6 November rule). The till at Home is a producer with a
  yard: the next join credits it the rate it was earning × H × (1 − e^(−away/H)), H = 2 h, never past the till's size,
  computed in the sim like every other producer's credit (`railAwayCredit`). The credit waits as a coin sack on the
  ticket counter; one press from anyone pours it into the strongbox, and everyone in the room sees it (the shared-moment
  system).
- **One wallet:** anyone spends, everyone sees. Buying is the garage's Install with its hold (no dialog), at the place
  the thing changes, never from a menu (9 November). **Griefing:** everything bought stays owned, so swapping a look
  back is free; the strongbox's paper tape lists each purchase with the buyer's name ("Mo: two-tone whistle, 100"),
  with no undo or blame UI. A wrong buy costs only time.

## 6. Show, don't tell

- **The wallet:** Home's concourse hall (layout B) gets a ticket window at its front: behind glass, a brass strongbox
  with a tall coin column that fills, and a split-flap counter above it reading the Boogles (the halt signs' split-flap
  face). The pause screen may show the same number read-only, as it may show upgrades.
- **A fare paid:** at the halt, each alighting rider drops a coin in the fare box on the lever post (a clink, local);
  at Home, when fares land, coins tumble into the column and the counter flutters. Far from Home you only hear your own
  halt's clinks; the counter is there when you get back.
- **The coin:** a Boogle is a fat brass coin with a hole through the middle, like a railway token: on one side The
  Boogler's profile, smug, on the other a little engine. "A Boogle", "Boogles", "300 Boogles"; no symbol. It replaces
  the money brief's "Bucks" banknote.
- **The Boogler** needs no new copy to own it: his face is on the coin. Drafts for the owner, not for agents to ship:
  the teller at the window, "Every one's got his face on. He insisted."; a rider, "Seven Boogles to look at a rock.
  Worth it."; for The Boogler if the owner wants one, "Boogles. Named after me. Obviously." **Existing lines to check
  once fares and prices are real** (not edited): The Boogler's "Rides cost money. You do not have money."
  (`src/boogler/lines.ts:938`); Nell's "I've been saving for this hat for eleven years..." and "It says you pay
  nothing." (`town-lines.ts:108`, `:117`); the shop's "TODAY: $0" and "Take it: $0" (`town-lines.ts:216–217`).

## 7. Why buy more passenger capacity

- **Seats or cargo:** the engine pulls only so many cars (the boiler sets the cap: 3 today, 4 with the longer boiler).
  The first cargo car of each resource is free and stays, so the choice is always about the extra slot: a fourth car as
  seats earns Boogles, as cargo moves material faster.
- **Far towns pay:** fares rise with distance, so a seat on line 2 (Home to the ring) earns about three times one on
  line 1 (Village to Camp). Cars are bought per line, so the long line gets them first: "lines should be plenty long
  where it's worth the upgrade".
- **Junctions:** a junction station doubles fares to and from it, and riders change lines there on foot, walking
  between platforms as players do, which opens pairs across lines that one line can't reach.
- **The express and interchanges** are the [express-train](express-train.md) brief's (proposed the same day): there the
  express is the next service train called for players, free, and the purchase is an interchange at a junction, priced
  in steel and rails. Riders never call the express. If an installed interchange later lets service trains run across
  lines, riders take those through trips with no change, and the far pairs it opens pay the long fares; this brief
  prices neither.

## 8. Systems

- **New in the sim** (`src/sim`, the railway state): the wallet (an integer); per halt, its waiting count and a demand
  accumulator (integers, filled each tick by the place's rate in thousandths of a rider); per train, riders aboard as
  two integers per destination halt (a count, and the sum of their boarding `s` in cm), so the fare is
  `count × s_dest − sum` without storing each rider. A standing train lets riders off and on in the sim's existing stop
  step; waiting riders count as a request at their halt. Destinations are split at boarding by fixed weights in a fixed
  order. All integers, no randomness beyond `mulberry32`, no trigonometry (`docs/agents/lockstep.md`).
- **New op:** `trade.buy(item)`, validated by the server (enough Boogles, the item is offered, the room isn't
  mid-install); an additive registration through `registerOp`.
- **Why lockstep, not a counter:** riders can't be a pure function of tick, because when trains stop depends on levers
  and players. The cheapest state that can't desync is these few integers, inside the train sim that already decides
  every stop. It never reads seat claims (host state).
- **Mixed builds and `WORLD_NS`:** dev phase, no old builds supported. The new state changes the railway snapshot's
  shape, so the production build rides the next planned bump (v27 with Ring Island build 1, or the double track's),
  never a bump of its own mid-session. The `?proto=trade` step needs no save and no bump: the lead tab runs the same
  rules as Host-kind state (`addHostField`), and a buy is a message to it.
- **The economy model first:** `ring-data.ts` gets a `TRADE` block (seats per car, cars by the capacity ladder, the fare
  rule, riders per resident, population by step) and `ring-sim.ts` computes fares per step beside `freightRate`, with
  fares replacing surplus sales as the wallet's source (`PRICES` and `sold` go, if question 5 holds) and `bucks` renamed
  `boogles`. Its report must show: the main route's hours unchanged within 5% with and without trade (Boogles buy
  nothing on it), the end-game goals still taking a few hours, solo and three players within the existing 15%. The
  playable [economy prototype](../economy/economy-prototype.html) (`play-sim.ts`) gets riders, a till and the first buys,
  so the owner can feel the upgrade flow in 2D first.
- **Review:** an independent pre-merge review of the sim and op change (owner-calls' review route), and the designer's
  review of this brief before the prototype.

## 9. Risks

- **An idle game in a hands-on builder:** contained by suggestion 1 (Boogles never build the route), by buys made at a
  place you go to, and by a queue that is something you see on your way through, not a meter.
- **The six hours:** Boogles buy nothing on the main route, so the route can't get shorter; the model proves it. If a
  seats-over-cargo choice slows the route, it is by one car's material rate, which the model shows.
- **Hauling made pointless, or trade made pointless:** they can't buy each other; towns grow only from what arrives,
  and riders come only from towns.
- **A second progress bar nobody reads:** no HUD number; the readout is the queue, the column and the counter, and a
  buy's effect shows as a shorter queue.
- **Crowds on a phone:** a hard cap on drawn riders (about 24 more), instances only, culled at 150 m; measured in the
  first build's phone still.
- **Trains stopping more:** riders' requests add stops; the model measures what they cost freight.

## 10. The smallest first build

**Step 0, model and 2D (about a day):** fares, seats and the first buys in the economy model and the playable economy
prototype; the owner can play the upgrade flow in 2D.

**Step 1, `?proto=trade` on v26** (two lines from Home; the Village's four cottages; the Quarry, Far Head, the Pier):
- Riders only between the **Village and Far Head** on line 2, about 8 a minute each way, so one Four car on each of its
  two trains leaves a queue at the Village.
- Fares (7 Boogles a trip) land in a **till at Home's hall**: a placeholder strongbox with a coin column and a
  split-flap counter; the away sack is not in this step.
- **One thing to buy:** line 2's second passenger car (a second Four, 300 Boogles), installed with the garage's hold at
  the Roundhouse or, until that screen exists, at a part waiting by the line 2 road ("upgrades chosen in the world").
  Expected: about 65 → 110 Boogles a minute and a visibly shorter queue.
- Host-kind on the lead tab, unsaved, no `WORLD_NS`, no op; the rest of the game unchanged.
