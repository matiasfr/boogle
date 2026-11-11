> **Status: answered by the owner, 10 November.** Light brainstorm (one agent, three lenses: play designer, systems
> architect, creative director), then a [design review](#design-review-designer-2026-11-10). Design only: nothing here
> changes code, saves or a `WORLD_NS`. The owner's seed, his pick of the name (**Boogles**) and his six answers are
> under [Open questions](#open-questions-answered-by-the-owner-10-november), word for word as relayed to the reviewer.
> Two answers go against what this brief first proposed: Boogles may buy **anything, including engine and cargo
> upgrades**, and **the shop stays free**. The body below was reworked for both on 10 November; where the rework had to
> pick a reading of his words it says so, and the review lists what those answers do to the materials economy. Anything
> he did not answer is still this brief's proposal, not his pick.
>
> **Changed later on 10 November (owner):** Boogles buy town upgrades, source upgrades and passenger cars; never engine or
> cargo parts, never materials ([decision log](../decisions.md#decided)). This replaces "Anything, including engine and
> cargo upgrades" wherever the body below still says it ("Boogles beside resources", open question 2, the design
> review's ruling 1 and owner questions 1 and 2, which it settles). The body is reworked before the model step.

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
the economy model has to show what a second income does to the six hours and to hauling, now that Boogles may buy
engine and cargo upgrades as well (owner, 10 November; review finding 1). The production build (lockstep, saved) ships
on its own `WORLD_NS` bump when it is ready ("Nothing waits on a world bump"), after the prototype says yes.

## Pitch

Towns are full of little guys, and now they travel. They wait on the platforms, pull the request lever, climb into
the free seats, ride, get off and walk into a building at the other end, and every finished trip drops a coin, a
**Boogle**, into the room's shared wallet: a strongbox behind the ticket window in Home's hall, with a split-flap
counter over it. Boogles buy anything the railway sells (owner, 10 November): a second passenger car, a fuller car, a
third train, station comforts, looks and whistles, and engine and cargo upgrades too. More seats carry more riders,
more riders pay for more seats, and what is left over buys a faster engine or a bigger cargo car. Materials still
build the world: nobody can buy a log or a bar of steel, nothing is sold for Boogles, track and stations are still
hauled for, and hauling is what grows the towns the riders come from. It serves **6, Communal
world** (one wallet, everyone's riders) and **11, Show, don't tell** (the wallet is a pile you can see, the reason to
buy a car is a platform of little guys left behind). It bends **the rail builds the world** a little: a second loop
beside goods, which question 2 bounds.

## Gut question

When the train pulled out and left little guys waiting on the platform, did you want to buy the second car, and once
you had, did you notice the till filling faster?

## Best suggestions, ranked

1. **Boogles come from people, materials from places** (design, systems). Fares are the wallet's source; the model's
   "surplus sold to the town" goes, and nothing converts either way (owner, 10 November: "Fares only; materials and
   Boogles never convert"). Hauling grows towns (the decided "towns grow from what arrives"), towns send riders, riders
   pay for seats. Why: each needs the other to grow. The first draft added "two currencies that can't buy each other
   can't make each other pointless"; that no longer holds as written, because Boogles may now buy the engine and cargo
   upgrades that materials were going to buy (section 3 and review finding 1).
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
moves no train. (c) Fine Prices' joke is that you pay $0; settled: the shop stays free (owner, 10 November, question
4), so the joke and its lines stand. (d) Riders pulling request levers make trains stop more, which slows freight a
little: the model step measures it. (e) New with the owner's answer to question 2: an income that arrives by itself
can now pay for the upgrades that hauled steel, fibre and copper were going to pay for, so those materials may lose
their use after the route; the review's finding 1 sets out the risk and the options, for him.

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

## Open questions (answered by the owner, 10 November)

Each answer is the owner's, word for word as the coordinator relayed it to the reviewer on 10 November. Answers 2 and 4
go against the recommendation.

1. **First step: the 2D page before the 3D prototype?** Recommended: yes, both, in that order: fares and seats added to
   the economy model and the playable economy prototype (about a day), then `?proto=trade` on v26 without waiting
   for an answer on the page. **Answer:** "First step: Add fares and seats to the economy model and the 2D page (about
   a day), then a flagged prototype on today's game: riders Village to Far Head, a till at Home, one car to buy"
2. **What may Boogles buy?** Recommended: passenger capacity (passenger cars past the first, the Six fit-out, more trains
   on a line once the double track allows), station comforts, looks and whistles, and the end-game goals;
   never materials, a part, or anything the main route needs. **Answer (against the recommendation):** "What Boogles
   may buy: Anything, including engine and cargo upgrades"
3. **Where do fares land, and what about time away?** Recommended: every fare lands live in Home's strongbox, with no
   collecting; while the room is empty nothing runs, and the next join finds one capped away credit (H = 2 h) as a
   coin sack on the ticket counter that anyone empties with one press, played for everyone. **Answer:** "Fares while
   nobody is in the room: Nothing runs; the next join finds one capped coin sack on the ticket counter that anyone
   empties, played for everyone"
4. **Personal wearables: same Boogles from the shared wallet?** Recommended: yes, one currency, small fixed prices on
   wearables beside Fine Prices' absurd dollar tag, which stays as the joke; the "TODAY: $0" lines are the owner's to
   reword (listed in section 6). Alternative: the shop stays free. **Answer (against the recommendation):** "Personal
   wearables: The shop stays free"
5. **Do town sales stop paying?** Recommended: yes: fares are the only source of Boogles and surplus stays in the yards,
   so materials and Boogles never convert; the economy model is retuned to the same end-game hours. Alternative: keep
   both sources. **Answer:** "Where Boogles come from: Fares only; materials and Boogles never convert"
6. **The Boogler's face on the coin?** (Asked alongside the five.) **Answer:** "The Boogler's face on the coin: Yes,
   his face; I'll decide his line later". No line is written for The Boogler here.

## Parked

- Personal wearables priced in Boogles: the shop stays free (owner, 10 November).

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
room's one wallet; Boogles buy seats and service, and engine and cargo upgrades as well (owner, 10 November); more
seats carry more riders. **The inputs:** seats per line (cars ×
seats per car), speed (the boiler), frequency (trains per line), connected towns (each new place adds riders and new
pairs), distance (fares rise with it), and station tier (a junction station's pull). **What players do:** choose which
line gets seats, whether the engine's next car is seats or cargo, whether the next Boogles go back into seats (more
income) or into a boiler or cargo car (more freight), whether to save for a third train or spend on a station's
fit-out, when to connect the far town, and (the main thing, unchanged) haul and build, which grows the towns. **What
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
model's 17,000 from surplus sales. The table's prices are the first draft's and are too low for that income (review
finding 2); engine and cargo upgrades, now buyable with Boogles, are the missing sinks, and the model sets every price
(section 8).

**Boogles beside resources** (reworked for the owner's answer to question 2, "Anything, including engine and cargo
upgrades"):

| What it is | How it is paid for |
| --- | --- |
| Building the world: track, bents, footings, station frames, the forge's and works' stages | Hauled materials, as now. These are builds you carry for, not things on sale, so they have no Boogle price (the reviewer's reading of "anything"; review finding 1) |
| What the route hands you: every gate and ability, each resource's free first car, the first steel fit (the part itself) | Free or the part itself, as decided. Never a price of either kind |
| Engine upgrades after that: boilers (speed and the car cap), the plough | **Boogles, or the material price the garage gives it; the room pays one or the other, whole** |
| Cargo upgrades: cargo cars past the free first, cradles, loaders | **Boogles, or the material price; one or the other** |
| Interchanges (the express-train brief's proposal, steel and rails) | Boogles, or steel and rails; one or the other |
| Passenger cars past the first, the Six fit-out; more trains on a line once the double track allows | Boogles |
| Station comforts and fit-outs; looks and whistles (the garage's "coins"); the end-game goals | Boogles |
| Wearables at Fine Prices | Free: the shop stays free (owner, 10 November) |
| Logs, stone, rails, footings, steel and every other material | Never bought and never sold: "Fares only; materials and Boogles never convert" |

**"One or the other" is this rework's reading, not the owner's words.** His seed said "a fly wheel in addition to
resources that is currency that can also be used", and his answer says Boogles may buy engine and cargo upgrades; it
does not say whether the material price stays beside the Boogle price, is replaced by it, or is charged as well. The
review (finding 1) gives the three readings and what each does to steel, fibre and copper.

The one rule kept from the first draft: nothing the main route needs is priced in something that can run out. Boogles
can be spent to zero, but fares keep arriving for as long as a train runs, and the route's own parts and builds carry
no Boogle price, so a room that spent everything on whistles is never stuck.

## 4. Sinks

What Boogles buy is in the table above. **What stops inflation:** prices are fixed and never scale with the wallet
(Fine Prices' climbing tag stays a joke on its own sign); each capacity step costs more than the last (about ×1.6);
income is capped by seats and by riders, never compounding on the balance (no interest); engine and cargo upgrades
and the end-game goals are large fixed sinks and looks are a collection with no end. **Personal cosmetics** (the pause
wardrobe, Fine Prices: every item is free, with absurd tags from $8 million to $3 billion and "TODAY: $0",
`src/render/cosmetic-parts.ts` `STOCK`) stay free and outside the wallet (owner, 10 November: "The shop stays free");
secret-crate finds stay personal and free. The model's goal G8, "A hat for each friend" at 1,500, assumed priced
wearables and needs a new job or to go.

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
- **The Boogler** needs no new copy to own it: his face is on the coin (owner, 10 November: "Yes, his face; I'll
  decide his line later"). No line is drafted for him here; his line is the owner's to write. Drafts for the owner for
  other characters, not for agents to ship: the teller at the window, "Every one's got his face on. He insisted."; a
  rider, "Seven Boogles to look at a rock. Worth it." **Existing lines to check once fares are real** (not edited; the
  review's list is longer): The Boogler's "Rides cost money. You do not have money." (`src/boogler/lines.ts:938`).
  With the shop staying free, Nell's saving lines and the shop's "TODAY: $0" and "Take it: $0" stay true as written.

## 7. Why buy more passenger capacity

- **Seats or cargo:** the engine pulls only so many cars (the boiler sets the cap: 3 today, 4 with the longer boiler).
  The first cargo car of each resource is free and stays, so the choice is always about the extra slot: a fourth car as
  seats earns Boogles, as cargo moves material faster. Both kinds of car can now be bought with Boogles (owner,
  10 November), so the choice is which car the slot holds, not which currency the room has.
- **Seats first, then iron:** Boogles put back into seats raise income; Boogles put into a boiler or a cargo car raise
  freight, which grows the towns riders come from. That second path is the flywheel reaching the main loop, and it is
  also where trade can replace hauling (review finding 1).
- **Far towns pay:** fares rise with distance, so a seat on line 2 (Home to the ring) earns about three times one on
  line 1 (Village to Camp). Cars are bought per line, so the long line gets them first: "lines should be plenty long
  where it's worth the upgrade".
- **Junctions:** a junction station doubles fares to and from it, and riders change lines there on foot, walking
  between platforms as players do, which opens pairs across lines that one line can't reach.
- **The express and interchanges** are the [express-train](express-train.md) brief's (proposed the same day): there the
  express is the next service train called for players, free, and the purchase is an interchange at a junction, priced
  in steel and rails (and now, as an upgrade, in Boogles too). Its review stages a passenger set the room buys with the
  first interchange, which riders use when players don't (review ruling 8). Riders never call the express. If an
  installed interchange later lets service trains run across
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
  shape, so the production build needs a bump: its own, when it is ready (owner, 10 November: "Nothing should wait on
  a world bump"), held only while the owner is mid-session. The `?proto=trade` step needs no save and no bump: the
  lead tab runs the same
  rules as Host-kind state (`addHostField`), and a buy is a message to it.
- **The economy model first:** `ring-data.ts` gets a `TRADE` block (seats per car, cars by the capacity ladder, the fare
  rule, riders per resident, population by step) and `ring-sim.ts` computes fares per step beside `freightRate`, with
  fares replacing surplus sales as the wallet's source (`PRICES` and `sold` go: question 5 is answered) and `bucks`
  renamed `boogles`. Engine and cargo upgrades get a Boogle price beside their bill. The first draft's test ("the main
  route's hours unchanged within 5% with and without trade") assumed Boogles bought nothing that moves freight; that
  is no longer true, so the report must show three rooms instead: one that never spends a Boogle (it must still finish
  in about six hours, on materials alone), one that spends every Boogle on engine and cargo upgrades as early as it can
  (how much shorter the route gets), and one that spends on seats first. It also shows the end-game goals still taking
  a few hours, solo and three players within the existing 15%, how much steel, fibre and copper each room never uses,
  and the minutes the room waits for each buy (review finding 2). The playable
  [economy prototype](../economy/economy-prototype.html) (`play-sim.ts`) gets riders, a till and the first buys, so the
  owner can feel the upgrade flow in 2D first.
- **Review:** an independent pre-merge review of the sim and op change (owner-calls' review route), and the designer's
  review of this brief before the prototype.

## 9. Risks

- **An idle game in a hands-on builder:** held only in part now. Boogles never lay track or raise a station, buys are
  made at a place you go to, and the queue is something you see on your way through, not a meter. But fares arrive
  without anyone doing anything, and they now buy boilers and cargo cars, so waiting is a way to upgrade the freight
  side (review findings 1 and 3).
- **The six hours:** Boogles lay no track, but a faster boiler and a bigger cargo car bought early move material
  sooner, so the route can get shorter. The model measures by how much (section 8); the prices of engine and cargo
  upgrades are what hold it.
- **Hauling made pointless, or trade made pointless:** materials can't be bought and nothing is sold, and towns grow
  only from what arrives. But the upgrades that steel, fibre and copper were going to pay for can now be paid in
  Boogles, so those materials may be left with no use beyond track and works. For the owner: review finding 1.
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

## Design review (designer, 2026-11-10)

**Verdict: build the model and 2D step now, as the owner answered. Four things in the design need fixing in that
step, before the 3D prototype copies them.** (1) Boogles buying engine and cargo upgrades is decided, and it lets an
income nobody works for replace hauled steel, fibre and copper; how an upgrade takes its price is not settled and
needs him. (2) The income table never makes the room wait after the first five minutes, so nothing is steered. (3)
Fares never stop while a tab is open and the wallet has no size, so leaving the game running is the best way to play.
(4) Riders pulling request levers make every train stop at every halt, which undoes the request stops he approved
the same day.

**The owner answered the brief's questions while this review was being written** (relayed by the coordinator; the
answers are in [Open questions](#open-questions-answered-by-the-owner-10-november)). I reviewed the first draft, then
reworked the body for his answers at the coordinator's direction; rulings below say where his answer replaced mine.
His answers are binding. Findings marked "for the owner" are risks his answer creates, not objections to it. Calls
are not logged in agent-calls.md from this review: the coordinator has another job recording them and the decisions.

**Read:** DESIGN.md (6, 8, 9, 10, 11, the core loop); owner-calls (shared wallet at "the town's strongroom beside the
Home Yard, coin crates ... with a HUD figure only as a supplement"; signs in the world; pick and log; nothing waits on
a world bump; port from Place only what fits; 2D first); decisions of 6 November (economy principles amended, roughly
six hours, ring-and-economy answers), 9 November (upgrades wait in the world as a part) and 10 November (the upgrade
screen, cars per line, long trains, stop on request, walk-in buildings); direction.md; playtests of 9 and 10 November;
[ring-and-economy](ring-and-economy.md), [money](money.md), [engine-garage](engine-garage.md) and its review,
[express-train](express-train.md) and its review, [junction-stations](junction-stations.md),
[home-station](../plans/home-station.md) (the hall's layout); `src/proto/place/folk.ts`, `town-lines.ts`,
`src/boogler/lines.ts`, `src/proto/wagon/cars.ts`, `dev/economy/ring-sim.ts` and `ring-data.ts`.
**Research:** [incremental-game-maths](../research/incremental-game-maths.md) (short cost ramps with fixed
benchmarks after each upgrade; 12 to 20 minutes between smaller gains: **the table does not meet it, finding 2**; its
"money remains a comic score" is superseded); [upgrade-economy](../research/upgrade-economy.md) rec 2 (each upgrade
repays a visible inconvenience: the crowd left on the platform does exactly this);
[rail-network-depth](../research/rail-network-depth.md) (the railway runs itself; the players' decisions are
connection order and bottleneck upgrades: seats are a bottleneck upgrade, so trade fits; riders' lever asks are a
priority by the back door, finding 4); [economy-principles-audit](../research/economy-principles-audit.md) (spending
happens at a place others see; the next main-route build keeps its share);
[compounding-infrastructure](../research/compounding-infrastructure.md) (towns repay the connection: fares are that
repayment); [town-interiors](../research/town-interiors.md) (each door gives something: riders walking into doors,
finding 6); [progression-flow-layout](../research/progression-flow-layout.md) and
[route-contract](../research/route-contract.md) (below).

**Run:** `dev/economy/ring-sim.ts` with default settings (solo: wallet 0 until 2.0 h, 484 at 3.0 h, 3,243 at 4.35 h,
17,151 at the ending; the eight goals carry 99,000 Bucks of fixed price and earn 13,920 to 27,360 an hour in value).
`npm run loop -- run`: today's route finishes in about 21 minutes in all four orders; the brief changes no route, gate
or bill, so there is no reach claim to prove. The brief's income table laid on the model's solo step times is hand
arithmetic, not a model run (a scratch script would not run in this sandbox).

**Seen** (`npm run look -- --query home=b --rail-seed trains-on --cam 898,22,13 --look 918,20,10`, desktop, not tested
on a device): Home's hall from the square. An open hall on posts under a red roof, low end walls, the curio shelf
filling the front right, the way in on the left, trains visible through it. No ticket window, no counter, no line map.
The left (north) end wall's inside face is bare. **Not seen:** a platform with a queue on it, Far Head's halt or any
bench site, the Roundhouse buy point, a car with riders and a player together, anything on a phone.

### Port from Place

| Piece | Verdict |
| --- | --- |
| The little guys as riders and commuters (`folk.ts`: `RIDERS`, `COMMUTERS`, `ride()`, door targets) | **Keep, changed:** in Place they are decoration; here they carry a rule (a count in the sim). The owner's seed asks for exactly this. The town port off `src/proto/place` is under way, so the prototype builds on a file that is moving |
| Fine Prices: the free shop and its absurd tags | **Keep as it is** (owner, 10 November: the shop stays free) |
| Nell, the saver | **Keep.** Her premise survives; one line gets truer (below) |
| The money brief's "Bucks" and its banknote | **Cut:** the coin is the Boogle |

### Rulings on the eight items

1. **The hard split.** Before his answer I ruled that forbidding all engine and cargo upgrades honoured "in addition to
   resources" but only half honoured "can later be used for upgrades" and "currency that can also be used", and
   recommended a middle: Boogles buy crews and service on any train (more trains, loading crews), materials buy iron.
   **He went further: "Anything, including engine and cargo upgrades." Decided.** What is still open is how such an
   upgrade is priced; finding 1 gives the options and holds the rule that nothing the main route needs is priced in
   something that can run dry.
2. **The curve is a number that grows, not a flywheel you steer.** The formula is fine; the prices are about a tenth of
   what the income needs, and the junction rule contradicts the table. Finding 2.
3. **Not enough to be hands-on.** The crowd as the readout is the best idea in the brief. Seats against cargo is not a
   real choice as written, long lines paying more is a fact and not a choice until there are three lines, and nothing a
   player does in a minute moves income. Finding 3.
4. **Riders: sound.** Integers in the sim drawn as little guys, a player never refused a seat, instances in the existing
   four draws. Two gaps: where riders come from and what is behind the door they go into (finding 6), and their lever
   asks (finding 4). Test the phone at Far Head on purpose: it is the worst-measured place in the game (a 27 s freeze
   on 9 November, draw calls over 450 when trains are in view).
5. **The strongbox: yes, but it moves a decided place and needs a size.** Finding 5. The coin sack is decided by his
   answer and does not contradict the 8 November agent call "trains earn no away credit": no train moves while the
   room is empty, the till is credited like any producer's yard. The sack needs a cap (finding 3).
6. **Town sales stopping is decided, and it changes a principle's wording** (finding 7). **Wearables: he kept the shop
   free**, against the brief, which removes almost every line conflict. The lines that remain are listed below.
7. **The first steps: yes, in that order (decided), and the 2D page is where the feeling is really tested.** The 3D
   prototype proves the crowd reads; only the page can show whether the wallet is ever tight. Its done-means need the
   waits (finding 2). The one buy does not fit today's train (finding 8).
8. **The express and the screen.** The express review's passenger set B, the train the room buys with the first
   interchange, is the "passenger train if purchased" of the seed: it should run a riders' service between junction
   stations when no player has called it, and that is its benefit beyond players. On the upgrade screen, do not sort
   by currency. Keep his split (Upgrades; Looks and sounds) and show the price kind on each card: a brass token or a
   material. Add one category under Upgrades, **Service** (trains on the line, the passenger set, crews); station
   comforts are bought at their station, not on the train screen. So Boogle prices appear in both groups.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The currency is Boogles | Decided | Owner's seed, 10 November |
| 2 | Little guys ride between towns and pay; passenger capacity earns beyond players | Decided | Owner's seed |
| 3 | One shared wallet anyone spends, at a place others see | Decided | 6 November |
| 4 | Fares are the only source; town sales stop; nothing converts | Decided | Owner, 10 November answer 5. Changes 6 November's "one shared wallet of town sales" and DESIGN.md 6. Finding 7 |
| 5 | Boogles may buy anything, engine and cargo upgrades included | Decided | Owner, 10 November answer 2, against the brief |
| 6 | A material-priced upgrade may be paid in Boogles or in its materials, one or the other, whole | New | The rework's reading. **Recommended, with the Boogle price set at about twice the time its material bill takes to haul at that stage.** Finding 1, question 1 |
| 7 | Track, bents, footings, station frames and works stages have no Boogle price; the route's own parts stay free | New | **Recommended:** a reading of "anything" as "anything on sale". Question 2 |
| 8 | The shop stays free; wearables are outside the wallet | Decided | Owner, 10 November answer 4, against the brief. Settles 6 November's "provisional" |
| 9 | While the room is empty nothing runs; one capped coin sack on the ticket counter, emptied by anyone, played for everyone | Decided | Owner, 10 November answer 3; 6 November |
| 10 | The sack's cap ("never past the till's size") has no number | New | **20 minutes of the income rate at leaving,** tunable. Uncapped, a day away at 650 a minute is 78,000. Finding 3 |
| 11 | Emptying the sack takes nobody's camera; far players get a corner note | Default | As the install moment (engine-garage call I10) |
| 12 | The Boogler's face is on the coin; no line written for him | Decided | Owner, 10 November answer 6 |
| 13 | The coin: fat brass, a hole through it, an engine on the back; "a Boogle", "300 Boogles", no symbol | Default | A look |
| 14 | A fare is 2 to board plus 1 per 100 m, paid on stepping off | Default | Keep: "Seven Boogles to look at a rock" reads well. Tunable |
| 15 | Fares double to or from a junction station | New | **Change:** Home is a junction station, so every fare in the v26 table doubles and the table's 7 is 14. Use a flat 5 added on arriving at a junction station. Finding 2 |
| 16 | Demand runs ahead of seats from Ring Island; up to 12 drawn a platform; the crowd left behind is the prompt | New | Take it. DESIGN 11; upgrade-economy rec 2 |
| 17 | Riders pull the request lever | New | **Change:** a waiting crowd asks only at four or more, an express ignores it. Finding 4, question 4 |
| 18 | A player is never refused a seat; the rider stands on the step; no fare is lost | New | Take it. DESIGN 8 and 10 |
| 19 | Riders are integers in the shared sim; bodies are drawn locally | Default | Take it |
| 20 | At most about 24 more little guys drawn; asleep past 150 m | Default | Take it; measure at Far Head on a phone |
| 21 | Riders walk off into a door; at Far Head they sit on a bench and wander off | New | **Add:** riders walk out of doors to the platform too, and a door that takes riders shows up to four of them inside. Finding 6 |
| 22 | Riders go from homes to jobs and sights, split by fixed weights; the village rides to Far Head to look at the shard | Default | A story touch tied to Ring Island; the owner's to keep or cut |
| 23 | About 8 riders a minute each way in the prototype | Default | Sized to leave a queue |
| 24 | The wallet is a strongbox at a ticket window in Home's hall, a coin column and a split-flap counter | Default | Departs from 6 November's "strongroom beside the Home Yard, coin crates". **Take the hall, on the north end wall.** Finding 5, question 5 |
| 25 | No HUD number; the pause screen may show it | Default | **Change:** the balance also shows on every price card (have and need) and on each halt's fare box. Finding 5 |
| 26 | A paper tape lists each purchase and who made it; no undo | Default | Take it |
| 27 | Each alighting rider drops a coin in a fare box on the lever post | Default | Take it |
| 28 | Buying is Install with its hold, at the place the thing changes | Decided | 9 and 10 November |
| 29 | A capacity buy costs 5 to 15 minutes of income; each step about 1.6 times the last; the listed prices | New | **Retune in the model.** Finding 2 |
| 30 | Income of about 65 a minute rising to 650; about 100,000 by six hours | New | **Retune in the model.** Finding 2 |
| 31 | The live wallet has no size (missing from the brief) | New | **The strongbox holds about 30 minutes of the current income, and never less than one and a half times the dearest thing on offer.** Finding 3, question 3 |
| 32 | Seats or cargo for the engine's limited cars | New | Take it in principle; it does not work with today's cap. Finding 8 |
| 33 | Long lines pay more; cars are bought per line | Decided | 10 November (cars per line) |
| 34 | More trains on a line for Boogles (a third train, 4,000) | New | Take it, under Service. The model raises train count on the route's own ladder today, so it must say which it is |
| 35 | Station comforts and fit-outs for Boogles | New | **Say what each does:** a look, or more riders from that station. An unnamed effect is a look (engine-garage rule) |
| 36 | The end-game goals are priced in Boogles | Default | The model's; G8 (hats) needs a new job now the shop is free |
| 37 | Model and 2D page first, then `?proto=trade`: Village to Far Head, a till at Home, one car | Decided | Owner, 10 November answer 1 |
| 38 | The prototype is Host-kind on the lead tab, unsaved | Default | Take it |
| 39 | The production build ships on its own bump | Decided | 10 November, "Nothing waits on a world bump". The body said "rides the next planned bump"; corrected |
| 40 | The teller's and the rider's lines | Default | Drafts; the owner's to keep |
| 41 | Boogle prices are shown per card; a Service category joins Upgrades | New | Ruling 8 |
| 42 | The express's passenger set carries riders when no player has called it | New | Ruling 8; it is the express brief's question 1 to answer |

### Findings

1. **For the owner: Boogles on engine and cargo upgrades can empty the materials economy. Settle how the price works
   before the model is built.** His answer is decided; these are its consequences.
   - **What it does.** Steel, fibre and copper were going to be spent on train upgrades (ring-and-economy: "train
     upgrades go from 0 kinds to 4"; the garage's stand-in prices are 6, 10, 4 and 4 steel). Town sales, their other
     use, have just been removed. If Boogles pay for those upgrades instead, the later materials are left with track
     and works stages only, yards fill and stay full, and a works past its last route step produces nothing anyone
     wants. Fares arrive without anyone doing anything, so the cheapest way to get a boiler becomes waiting.
   - **The six hours.** In the model, speed (20, 25, 30, 40 m/s) and train count (1, 2, 3) rise on the route's own
     steps. Bought early with Boogles they move freight sooner and the route gets shorter. By how much is the model's
     to measure; the body now asks for three rooms (never spends, spends on iron, spends on seats).
   - **A gate's meaning** (route-contract, firm rule 2: movement may skip distance, never the work). A Boogle-bought
     upgrade skips the hauling its bill stood for. No gate on the route is involved as long as call 7 holds, so the
     rule is kept, narrowly.
   - **Three ways to price it:**
     - **Either, whole** (the body's reading; closest to "currency that can also be used"). Feels like two ways to a
       boiler: haul for it now or let the riders pay for it. Risk: the passive way wins unless it is clearly slower.
     - **Boogles only.** Feels clean: materials build the world, Boogles upgrade the trains. Risk: the later
       materials lose every use but track; "a part waits beside the machine and the stack shrinks" (9 November) is
       lost after the first fit.
     - **Both** (the bill and a Boogle fee). Keeps hauling central and makes the wallet matter everywhere. Risk: it is
       an extra gate, which is not what "Boogles may buy" says.
   - **Recommended: either, whole, with the Boogle price set so that hauling is about twice as fast.** A room that
     hauls gets its boiler sooner; a room that would rather explore still gets it. The model reports the steel, fibre
     and copper each room never uses, and if that is most of it the later works need another job.
   - **Kept:** nothing the main route needs is priced in something that can run dry. The route's parts stay free or
     the part itself, its builds stay hauled, and fares never stop while a train runs.
2. **The income table never makes the room wait.** Laid on the model's solo times, the room earns about 8,100 Boogles
   between trains running (0.57 h) and Ring Island (1.83 h) against 550 of things to buy; it reaches Ring Island with
   about 7,500 banked against 1,100 of new prices, the first branch with about 13,000 against 2,700, and High Port
   with about 32,000 against 4,000. After the first car, about five minutes in, every price is paid the moment it is
   offered. "5 to 15 minutes of income" is true of no buy but the first. So nothing is saved for, chosen between or
   felt: stage unlocks set the pace and the wallet is decoration.
   - **Retune:** price each buy at 8 to 15 minutes of the income at the moment it is offered, counted from an empty
     box, and offer two at a time that the room cannot both afford. Engine and cargo upgrades, now on sale, are the
     sinks that make this possible: about 65,000 to 70,000 of prices across the route against about 90,000 earned.
   - **The model's end game:** the goals' 99,000 Bucks were sized for 14,000 to 27,000 an hour; trade at 650 a minute
     is 39,000 an hour on top of a full box. Either the goals' prices rise about threefold or late fares come down.
   - **The first coin moves from 2.0 h to about 0.6 h.** Good: the wallet has nothing to do for the first third of
     the model's game today.
   - **The numbers disagree with each other.** Home is a junction station, so "doubled to or from a junction" doubles
     every v26 fare: Village to Far Head is 14, not 7, and the 65 a minute is 130. Ring Island is about 1.2 km from
     Home (the model and the express brief), not 2 km: 14, not 22. Canopy Town at 2.9 km is 31, or 62 doubled, not 80.
     Call 15 replaces the doubling with a flat 5.
   - **The page's done-means:** minutes waited for each buy, and at least two moments where the room has to choose.
3. **Income does not stop, and nothing a player does in a minute moves it.**
   - **A tab left open is the best strategy.** The world pauses only when the room is empty. Every material is bounded
     by a yard; Boogles are not. A night idle at Ring Island is over 80,000. Call 31 gives the strongbox a size, the
     same rule as "never past the yard", and a full column is then a second prompt to spend. Call 10 caps the sack.
   - **What a player does to push income, honestly:** connect a new place (the big step: new pairs, long fares);
     deliver, which grows a town and so its riders (the brief says population sets the rate but gives no rule tying
     it to deliveries: it needs one); put seats where a crowd is left; choose seats or iron for the next Boogles.
     All are steps taken every ten minutes or more. That is acceptable for a second loop beside the building, as long
     as the wallet is tight (finding 2) and each rise in income follows something the room did by hand.
   - **Recommended addition, small:** the first train into a newly connected place carries the whole town, once, and
     pays for it. It ties the biggest jump in income to the act of laying the line, and it is a crowd worth seeing.
   - **Not recommended:** collecting fares by hand, or a till the player must visit. That is a chore, and his answer
     says fares land by themselves.
4. **Riders' lever asks undo request stops.** On 10 November he chose stop on request because trains "go faster
   overall". With eight riders a minute at each end, every train stops at the Village and Far Head every time, and
   once every town pairs with every other, at every halt, at about 11 s a stop. The express review made the express
   stop for a lit lever, so riders would stop every express as well. On 10 November a train not stopping for the owner
   was his complaint; a train stopping for nobody he can see would be the next one.
   - **Change:** a waiting crowd lights the lamp only when four or more wait (a car's worth); a train always stops to
     let riders off; an express ignores riders' asks and the train behind serves them. Riders travel between places
     with a station house, a junction station or a line's end, where trains mostly stand anyway, and reach plain
     halts only as the prototype's exception at Far Head.
   - **Bound, for the model:** riders add no more than one stop to an average trip.
5. **The strongbox moves a decided place, and the hall has no front to put it on.** The 6 November call puts the
   wallet at "the town's strongroom beside the Home Yard, coin crates that stack and empty, with a HUD figure only as
   a supplement". With fares arriving by train, the station hall is the better place; say so to him as a change. The
   brief's "ticket window at its front" is where the curio shelf and the way in are (his 9 November "move shelf off
   north wall"), and the back span is the line map's. The free surface is the north end wall's inside face, 2.4 m
   high, bare in the still, beside the way from the square to the trains. It needs a still with the booth in it, and
   the hall now holds a shelf, a map, a works board and a till in 13 by 6 m: one plan for all four, in home-station.
   - **Flow, the prototype's legs:** till to the passenger car's stop mark, about 10 m, 2 s; till to the Roundhouse
     stall or the part by line 2's road, about 33 m, 6 s; Village to Far Head by train, 31 s. The crowd is on the way
     from the square to the trains, so the next thing to do can be found. Nobody can be stranded by a purchase.
   - **Where the number is.** You buy 33 m from the counter, and on the ring you are minutes from it. The price card
     must show what the room has beside what the thing costs, and each halt's fare box should carry the total on a
     small counter: a sign in the world, not a HUD.
6. **Riders appear from nowhere and vanish into rooms a player can walk into.** The brief says where they go, not
   where they come from, and "every building can be walked into" means a player can follow forty of them through a
   door into an empty room. DESIGN 11: what is on screen is true. Riders should walk from doors to the platform, and
   a door that takes riders should show a few of them inside (call 21). Far Head's bench and the Works' door are not
   placed; they need coordinates and a still before the prototype.
7. **Decided calls that change, for the log** (another job records them): 6 November "One shared wallet of town
   sales" becomes a wallet of fares; DESIGN.md 6 says "what connected places sell goes into one wallet", which is a
   commit to that file with the reason; 6 November's strongroom beside the Home Yard (finding 5); 6 November's
   provisional "wearables may cost Bucks" is settled as free; "Bucks" becomes Boogles in the model and the briefs;
   surplus past a full yard now does nothing, so station yards for spares are its only outlet.
8. **The one car to buy does not fit today's train.** `TRAIN_CARS` is the engine, two trailers and the footing wagon:
   three cars, which is the cap. A second passenger car is a fourth. And the engine-garage review (call 17, open) fills
   the longer boiler's fourth place with steel's free car, where this brief's table takes it as seats.
   - **For the prototype:** offer the car before the footing wagon is coupled, or let the prototype's train run four.
     It is unsaved and flagged, so either is fine; say which.
   - **For production:** the first seats rung is the Six fit-out, which needs no place; a real seats-or-cargo choice
     needs a free place the route does not fill, so the cap ladder is engine-garage's to redraw with this in mind.
     Until it is, "seats or cargo" is not a choice the player has.
9. **Co-op and solo.** One wallet with one to three friends is fine; the tape answers "who bought that". The till is
   a place to meet (flow lens 8). Solo, the queue and the column work unchanged. A friend arriving late finds a wallet
   and a crowd and needs nothing explained. What is missing is the moment of the first fare: the first time a little
   guy boards in front of a player and the first coin lands should be staged once, at the Village, so the link from
   rider to coin is seen and not inferred.

### Lines for the owner (none edited)

With the shop free, the shop's and Nell's "pay nothing" lines stay true. These are the ones whose footing moves:

- The Boogler, `src/boogler/lines.ts:938`: "Rides cost money. You do not have money." The room now has money, and
  rides are free for players while little guys pay.
- The Boogler, `lines.ts:932` "Hey! No free rides!" and `:672` the slogan "No free rides.": the railway now gives
  players exactly that. Probably funnier.
- The Boogler, `lines.ts:630`: "I could charge for that. One coin per bonk." A coin is now a real thing with his face
  on it.
- Nell, `src/proto/place/town-lines.ts:115`: "A train fare. No. That's a brim, that is. That's a whole brim." Fares
  are now real, at about seven Boogles. It gets truer.
- Nell, `town-lines.ts:108`: "Four hundred to go." Four hundred of what, now that the world's coin is the Boogle and
  the hat is free.
- The shop, `town-lines.ts:224`: "That's a fortune you've saved. Spend it wisely." There is now something to spend on,
  though not a personal fortune.
- Fine Prices' tags are in dollars (`src/render/cosmetic-parts.ts` `STOCK`) while the world's money is Boogles. Two
  currencies in the fiction; the joke probably wants to stay in dollars.
- The brief's drafted line for The Boogler was removed from section 6: his line is the owner's to write.

### Owner questions (follow-ups to his answers)

1. **When Boogles buy an engine or cargo upgrade, what happens to its material price?** Recommended: the room pays
   either, whole, and the Boogle price is set so hauling is about twice as fast. Alternatives: Boogles only;
   materials and a Boogle fee together. Answer: ___
2. **Does "anything" include what the route is built from** (track, bents, station frames, works stages) and the
   parts the route hands over? Recommended: no. Those stay hauled or free, so no step of the route ever has a Boogle
   price. Answer: ___
3. **Does the strongbox have a size?** Recommended: yes. It holds about 30 minutes of the current income, fares past
   a full box are turned away, and the coin sack holds 20 minutes. Otherwise a tab left open overnight is the best way
   to play. Answer: ___
4. **Do waiting little guys stop a train by themselves?** Recommended: only when four or more wait, and never an
   express, so request stops keep trains fast. Answer: ___
5. **The wallet's place:** your 6 November call put it in a strongroom beside the Home Yard. Recommended: the ticket
   window in the station hall instead, on the north end wall, with the balance also on each price card and each
   halt's fare box. This also rewords DESIGN.md 6 from sales to fares. Answer: ___
