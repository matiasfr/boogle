> **Status: answered by the owner, 10 November, and reworked the same day for his later change; five questions are
> still open.** Light brainstorm (one agent, three lenses: play designer, systems architect, creative director), then a
> [design review](#design-review-designer-2026-11-10). Design only: nothing here changes code, saves or a `WORLD_NS`,
> and the build is held behind the ECS migration. The owner's seed, his pick of the name (**Boogles**) and his six
> answers are under [Open questions](#open-questions-answered-by-the-owner-10-november), word for word.
>
> **Changed later on 10 November (owner):** Boogles buy town upgrades, source upgrades and passenger cars; never engine
> or cargo parts, never materials
> ([decision](../decisions-rewards.md#d-2026-11-10-boogles-buy-town-upgrades-source-upgrades)). This replaces "Anything,
> including engine and cargo upgrades". **The body below was reworked for it on 10 November**: the buy list, its first
> prices and the caps are in [section 3](#3-the-money) and are proposals, not decisions; every number is a stand-in for
> the model step and is hand arithmetic, not a model run. The design review keeps its own text as history, with each
> item this decision settles marked in his words. What is still his to answer is under
> [Still open](#still-open-for-the-owner-after-the-change-of-10-november). **The shop stays free**, fares are the only
> source, and nothing converts: those answers stand.

# Passenger trade (passenger-trade)

The owner's seed, 10 November 2026: "I want to design a new potential mechanic. Passenger trains if purchased should
have a benefit outside of just for players, as players max out once there are a few and don't need more space. It would
be cool if the little guys take trains between cities and generate like trade revenue that provides a income source
that can later be used for upgrades, so there's a fly wheel in addition to resources that is currency that can also be
used. currency should also be "Boogles""

His change, an hour after his answers (10 November): "Maybe googles doesn’t buy train parts but does buy town upgrades?
Or supply upgrades for resource sources?" [he means Boogles]. Asked whether to record "Boogles buy town upgrades,
source upgrades and passenger cars, never engine or cargo parts, never materials", he answered "Yes".

**Read:** DESIGN.md (6, 7, 8, 9, 11, the core loop); the decision log's routing table and the rewards, rail and
core-loop rules, and these entries: 10 November Boogles buy town upgrades, source upgrades and passenger cars; 10
November riders and Boogles; 6 November economy principles amended (shared wallet, paused world, away credit
`H × (1 − e^(−away/H))`, H = 2 h, no offline production), 6 November roughly six hours, 2 November the rail builds the
world ("no routing or quotas", "towns grow from what arrives") and towns grow and you can see them, 9 November
upgrades chosen in the world with no menu, 9 November gold finds cut ("gave no reward and only echoed the crystals"),
10 November the train upgrade screen (Install; Upgrades versus Looks and sounds; "really satisfying to upgrade"), cars
bought per line ("lines should be plenty long where it's worth the upgrade"), long trains and loaders, stop on
request, the express ("It runs past; the next train serves them"), every building can be walked into and its opening
order, junction stations; [money](money.md), [cart-first](cart-first.md), [first-evening](first-evening.md),
[engine-garage](engine-garage.md), [station-deposit](station-deposit.md) and its five answers,
[junction-stations](junction-stations.md), [express-train](express-train.md), [ring-and-economy](ring-and-economy.md);
[rail-map](../plans/rail-map.md); `src/proto/place/folk.ts`, `residents.ts`, `seat.ts`, `seat-claims.ts`,
`car-kit.ts`, `shop.ts`, `town-lines.ts`; `src/sim/railway-away.ts`, `railway-lines.ts`; `dev/economy/ring-data.ts`,
`ring-sim.ts`, `play-sim.ts`. Game-direction fit: the wallet is decided and unbuilt; this gives it its first source
and its first sinks. It orders nothing ahead of Ring Island v27 or the ECS migration.

## Verdict: build smaller

Build it, but not as a v26 feature with saves and a wallet yet. **First a model and 2D step** (fares, seats, towns and
the three kinds of buy in the economy model and in the playable [economy prototype](../economy/economy-prototype.html)
the owner asked for on 6 November), **then a flagged `?proto=trade` on today's game**: little guys riding Village to
Far Head, a till at Home that fills, a car to buy and a household to move in. The reasons: the wallet doesn't exist in
`src/` or `server/`, so a real build is a new piece of saved shared state plus the first spend op. Today's lines are
short (line 2 is about 0.75 km), so fares are pocket change; the flywheel only starts to bite from Ring Island (1.2 km
on). And the model has to show that the new list keeps the wallet tight (the first draft's prices were a small
fraction of its income) and that source upgrades, the one kind of buy that touches materials, do not shorten the six
hours. The production build (lockstep, saved) ships on its own `WORLD_NS` bump when it is ready ("Nothing waits on a
world bump"), after the prototype says yes and the ECS migration lets it in.

## Pitch

Towns are full of little guys, and now they travel. They walk out of their doors to the platform, climb into the free
seats, ride, get off and walk into a building at the other end, and every finished trip drops a coin, a **Boogle**,
into the room's shared wallet: a strongbox behind the ticket window in Home's hall, with a split-flap counter over it.
Boogles buy three kinds of thing (owner, 10 November): **town upgrades** (a household moved into an empty house, a
station fitted out), which make more riders; **passenger cars and seats**, which carry them; and **source upgrades**
(trees that grow back sooner, a bigger yard, a quicker loader), which help the building. More riders pay more fares,
fares move more households in, and a town that outgrows its train leaves a crowd on the platform until someone buys
seats. Boogles never buy an engine or cargo part and never a material: boilers, cargo cars and cradles stay priced in
hauled steel, fibre and copper, track and stations are still hauled for, and nothing is sold for Boogles. It serves
**6, Communal world** (one wallet, everyone's riders) and **11, Show, don't tell** (the wallet is a pile you can see,
the reason to buy a car is a platform of little guys left behind, the reason to move a household in is an empty
platform). It bends **the rail builds the world** a little: a second loop beside goods, which the caps in section 3
bound.

## Gut question

When the train pulled out and left little guys waiting on the platform, did you want to buy the second car, and when
the platform stood empty, did you want to move another household in?

## Best suggestions, ranked

1. **Boogles come from people, materials from places** (design, systems). Fares are the wallet's source; the model's
   "surplus sold to the town" goes, and nothing converts either way (owner, 10 November: "Fares only; materials and
   Boogles never convert"). With his later change the first draft's reason holds again: two currencies that can't buy
   each other, and can't buy each other's upgrades, can't make each other pointless. Iron (engine and cargo) is
   materials only; people and places (towns, sources, seats) are Boogles only; no upgrade has two prices.
2. **Two crowds are the two prompts** (creative, design). A platform with little guys left behind says buy seats. A
   platform with nobody on it and a train leaving with empty benches says the town is too small: move a household in.
   No number tells you which; the platform does. Why: principle 11, and the owner's "players max out" is answered by
   riders who never do.
3. **The route sets the ceiling, Boogles fill it** (systems). A town has only as many house plots as the route has
   opened there, a train only as many places as its boiler pulls (materials), and a source only two Boogle steps. So
   income at each stage has a fixed top that waiting can't raise, and the only way to raise it is to build the railway
   on. Why: it fixes the review's two findings (section 3, "Where it is capped").
4. **A player never costs a fare** (systems, design). The sim counts every seat for riders; seats are view-only for
   them. When you sit, the little guy in that seat hops up and rides standing on the step, holding the rail. Why: the
   lockstep never reads host seat claims, so it can't desync, and riding with friends is never a penalty.
5. **The wallet is a strongbox at Home's ticket window, and it has a size** (creative). A glass coin column that rises
   to a mark, a split-flap counter over it, a coin's clink and the counter's flutter as each train's fares land, a
   paper tape of what was bought and by whom. Why: one physical place for the shared money, on the concourse every
   player crosses; and a column standing at its mark is a prompt to spend, not a score.
6. **Source upgrades change a rate and nothing else** (design). Trees and rocks come back sooner, a source's own yard
   holds more, its loader swings faster. The room still chops, carries and hauls every piece, and a loader can never
   load more than the cars hold, which iron sets. Why: it is the Boogles' one way to help the building without buying
   any of it.

**Tensions.** (a) An idle flywheel against a hands-on builder: income accrues while you build, so the risk is a game
that plays itself; held by the caps (section 3), by suggestion 1 and by buys that are things you go and see. (b) The 8
November agent call "trains earn no away credit" ([agent-calls](../agent-calls.md)) is about freight moving while the
room is empty; this brief gives the **till**, as a producer with a yard, the same capped away credit as every
producer, and moves no train. (c) Fine Prices' joke is that you pay $0; settled: the shop stays free (owner, 10
November, question 4), so the joke and its lines stand. (d) Riders asking trains to stop slows freight a little, and
now the room's own town upgrades are what add riders: the model step measures it
([Still open](#still-open-for-the-owner-after-the-change-of-10-november), question 2). (e) "Towns grow from what
arrives" (2 November) and houses bought with Boogles both claim the town; this rework reads them as plots opened by
the route and households moved in for Boogles, and asks him (question 4). (f) A house nobody has paid for must still
have a door that opens ("every building can be walked into"), so the buy is a household, not a door (question 4).

## Shape

- **Sync:** the wallet (one integer), each halt's waiting count, each train's riders aboard (two integers per
  destination halt), each town's households and fit-out step and each source's Boogle steps (small integers) are
  **lockstep** railway state, saved and hashed; fares are paid in the sim when a standing train lets riders off.
  Riders' bodies, where they sit, their walk to and from a door and every coin's clink are **Local**, drawn from those
  counts. The prototype runs the same rules **Host**-kind on the lead tab, unsaved.
- **Reuses:** `folk.ts`'s instanced little guys (4 draws for all of them; `riders`, `ride()`, the door targets), the
  passenger car's four bench seats (`car-kit.ts` `BENCH`), the request levers and train stops in `src/sim`, the away
  credit (`railAwayCredit`, `expNeg`), split-flap signs, the garage's Install and hold, the shared-moment system for
  the away sack.
- **Smallest first build:** `?proto=trade` on v26: Village to Far Head riders, a till at Home, a car and two
  households to buy (section 10).
- **Risks:** an idle game; a second progress bar; the six hours through source upgrades; crowds on a phone (section
  9).

## Done means

Each moment captured with `look`; the hooks named here are proposals for the builder to add.

- **Platform queue:** `?proto=trade`, spawn on the Village platform, `--eval` filling the Village's waiting count to
  12. A still shows twelve little guys on the platform; after the next departure (real-time clip) eight board, four
  stay. Measured: waiting before and after, seats filled.
- **An empty platform:** with two households at the Village and two cars on line 2, a clip of a train leaving with
  empty benches and nobody left waiting; the handcart at the third cottage's door is in the same shot or one turn of
  the camera away.
- **A rider seat given up:** two players, one sits on line 2's car. The rider in that seat stands on the step; the
  wallet's fares for that trip match a run with nobody seated.
- **Fares land:** a clip at Home's ticket window as line 2's train stands: the coin column rises and the counter flips
  by exactly the trip's fares (asserted against the sim's wallet).
- **A full box:** `--eval` the wallet to its size; the next train's fares add nothing, the column stands at its mark
  and the counter does not move (asserted against the sim).
- **Alighting:** at Far Head, riders walk off the platform to a door and are gone inside within 20 s; none is left
  standing at the edge.
- **The household:** with 300 Boogles, hold Install on the handcart at the third cottage; afterwards little guys walk
  out of that door to the platform, the Village sends 6 riders a minute each way instead of 4 (sim-side, logged), and
  the next train leaves some behind.
- **The car:** with 600 Boogles, hold Install on the second passenger car; afterwards line 2 runs two cars, nobody is
  left behind, and the Boogles a minute (sim-side, logged) rises from about 67 to about 84.
- **Phone:** the busiest frame (two platforms full and a train arriving) adds no draw calls for riders, who are
  instances in the folk's existing four draws; the till adds its own few at Home only.

## Open questions (answered by the owner, 10 November)

Each answer is the owner's, word for word as the coordinator relayed it to the reviewer on 10 November. Answer 4 goes
against the recommendation; answer 2 went against it and was then changed by him the same day.

1. **First step: the 2D page before the 3D prototype?** Recommended: yes, both, in that order: fares and seats added to
   the economy model and the playable economy prototype (about a day), then `?proto=trade` on v26 without waiting
   for an answer on the page. **Answer:** "First step: Add fares and seats to the economy model and the 2D page (about
   a day), then a flagged prototype on today's game: riders Village to Far Head, a till at Home, one car to buy"
2. **What may Boogles buy?** Recommended: passenger capacity (passenger cars past the first, the Six fit-out, more trains
   on a line once the double track allows), station comforts, looks and whistles, and the end-game goals;
   never materials, a part, or anything the main route needs. **First answer (against the recommendation):** "What
   Boogles may buy: Anything, including engine and cargo upgrades". **Changed by him an hour later:** "Maybe googles
   doesn’t buy train parts but does buy town upgrades? Or supply upgrades for resource sources?" [Boogles], and "Yes"
   to recording: Boogles buy town upgrades, source upgrades and passenger cars; never engine or cargo parts, never
   materials. The later answer is the rule
   ([decision](../decisions-rewards.md#d-2026-11-10-boogles-buy-town-upgrades-source-upgrades)). It is close to the
   first recommendation with two differences: source upgrades are in, and looks, whistles, more trains and the end-game
   goals are not named either way (question 5 below).
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

## Still open for the owner (after the change of 10 November)

Five questions, each with a recommendation. The first three are the design review's questions 3, 4 and 5, answered
again under the new rule; its questions 1 and 2 are settled by his change. The model step and the prototype go ahead
on the recommendations.

1. **How big are the strongbox and the coin sack?** Recommended: the strongbox holds the larger of 20 minutes of the
   room's income and one and a half times the dearest thing on offer; when the column stands at its mark, fares stop
   landing (the little guys still ride) until something is bought. The coin sack holds 15 minutes of the income the
   room was earning when it emptied, and may heap the column over its mark once, so no coin is seen to be thrown
   away. A bigger strongbox is never on sale. The review recommended 30 minutes and 20; both come down because prices
   are now 8 to 15 minutes of income each, and a box that holds two buys lets the room skip every choice. With a
   size, a tab left open overnight earns one box and stops. Answer: ___
2. **Do waiting little guys stop a train by themselves?** Recommended: a waiting crowd lights the request lamp only
   when four or more wait (a car's worth); a train stops to let riders off only where riders were going, which is a
   place with a station house or a line's end, plus Far Head; and an express never stops for them. You decided an
   express passes a friend who pulled a lever ("It runs past; the next train serves them"), so it passes little guys
   too; that part is this brief's reading of your rule, not your words. Under the new rule the room's own town
   upgrades are what add riders, and Boogles can't buy speed back, so the model holds riders to one extra stop on an
   average trip at most. Answer: ___
3. **Where does the wallet live?** Your 6 November call put it in "the town's strongroom beside the Home Yard, coin
   crates that stack and empty, with a HUD figure only as a supplement". Recommended: the ticket window in Home's
   station hall instead, on the north end wall, because fares arrive by train. Boogles are now spent at cottages,
   stations and sources all over the map, minutes from Home, so the balance also shows on every price card (have and
   need) and on each halt's fare box. This also rewords DESIGN.md 6 from sales to fares. Answer: ___
4. **What is a town upgrade, exactly?** Two older rules meet it: "towns grow from what arrives" (2 November) and
   "every building can be walked into" (10 November). Recommended: the route and its deliveries open **plots and
   buildings** in a town, as now, and every door opens from the day the building stands (an unbought house is the
   empty room your rule allows); Boogles move a **household** in, which turns the empty room into a lived-in one and
   adds its little guys as riders. So hauling sets how big a town can be and Boogles fill it. A "better station" is
   the fit-out of a station house the route built (benches, a canopy, lamps), never the frame, which stays hauled.
   Alternative: houses rise for Boogles alone, which lets fares outgrow the railway. Answer: ___
5. **Where do "train parts" end?** You named three kinds; these are named by neither side. Recommended, by one test,
   "does it change what a train hauls or how fast?": if yes, materials only (boilers, cargo cars, cradles, the
   plough, more service trains on a line, interchanges); if no, Boogles (passenger cars and seats, the express's
   passenger set you decided the room buys later, a loader's faster jib at its source, and train looks and whistles,
   which your 6 November call already pays from the wallet). The first loader at a source stays free with the
   resource's unlock. The end-game goals each take one price, by the same test. Answer: ___

## Parked

- Personal wearables priced in Boogles: the shop stays free (owner, 10 November).
- Boogles on engine and cargo upgrades: not adopted (owner, 10 November).
- A third train on a line for Boogles (the first draft's 4,000): a service train hauls, so it waits on question 5.
- A conductor little guy on the car's step who collects the coins and waves them at the window: after a yes.
- Named regulars who ride the same trip each day and remark on new seats ([starting-area-folk](starting-area-folk.md)).
- Tourists from the mainland by boat ([ideas](../ideas.md), "Visitors from the mainland") as a late demand boost.
- Fares by time of day once there is room-owned time ([first-evening](first-evening.md)).
- A season ticket gag: The Boogler sells one to a little guy for a ride that is free anyway.

---

## 1. The loop

Little guys live in the towns (Home's cottages, Ring Island's town, Canopy Town, Port Quay, High Gorge) and work at
the sources (the timber camp, the Quarry and the Works, later the steel works, the cloth loft). Each town sends riders
at a rate set by its **households**; they walk out of their doors, wait at their halt, ride, and pay a fare when they
step off. The fares go into the room's one wallet.

**The flywheel:** riders pay fares; fares move households in and fit out stations; a bigger town sends more riders;
more riders than seats leave a crowd; fares buy seats; fuller trains pay more fares. Source upgrades stand outside the
wheel: they earn nothing and help the building, so every Boogle is a choice between the wheel and the works.

**The inputs:** households per town and its station's fit-out (riders), seats per line (cars × seats per car), connected
towns (each new place adds riders and new pairs) and distance (fares rise with it). Speed and frequency matter too, and
those are iron: the boiler and the trains in service are bought with materials. **What players do:** see which platform
is crowded and which is empty, choose whether the next Boogles go to a household, to seats or to a source, decide when
to connect the far town, and (the main thing, unchanged) haul and build, which opens the plots, the places on the train
and the sources that Boogles then fill. **What just accrues:** the fares themselves. Nobody routes riders, sets fares
or timetables a train ("no routing or quotas").

## 2. Riders in the world

- **Where they come from and go:** homes to jobs and sights. At v26: Village cottages to the timber camp (line 1), the
  Quarry and the Works, and Far Head, where the village goes to look at the shard across the water (a free tie to Ring
  Island's religion: someone must always be looking at it). Later, every town to every town and to the sources on its
  line. Only a lived-in house sends riders, and they are seen leaving its door (review finding 6).
- **On the platform:** up to 12 drawn per platform, standing in a loose queue at the passenger car's stop mark, facing
  the way the train comes. Whether and when they ask a train to stop is question 2 under
  [Still open](#still-open-for-the-owner-after-the-change-of-10-november).
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

Everything in this section is a proposal for the owner and a stand-in for the model. The stage times and the first
draft's income are the review's figures (its "Run" and finding 2); the rest is hand arithmetic on them.

**A fare** is paid when the rider steps off: 2 Boogles to board plus 1 for every 100 m ridden. Village to Far Head is
7; Home to Ring Island (about 1.2 km) 14; Home to Canopy Town (2.9 km) 31. The first draft doubled fares at a junction
station; the review's call 15 replaces that with a flat 5 on arriving at one, and the model picks.

**Riders.** A household sends 2 riders a minute each way, and each pays on stepping off, out and back. At the Village's
7 a trip that is 28 Boogles a minute a household. A fitted-out station raises its town's riders by a quarter, twice at
most. Income is the lesser of what the riders would pay and what the seats can carry: line 2's two trains with one Four
car each carry about 4.8 riders a minute each way, 67 Boogles a minute at the Village.

### What Boogles buy

Each thing is bought where it changes, with the garage's Install and hold, from something waiting in the world (9
November): a handcart of furniture at the door, crates on the platform, a part by the loader, a car by the road.
Prices are fixed. A price in the tables is the first step's; "min" is the minutes of income it costs at the moment it
is first offered, counted from an empty box.

**Town upgrades (they make riders).**

| What you buy | What it does in play | How many | First price (Boogles) |
| --- | --- | --- | --- |
| A household moved into an empty house | Little guys come out of that door from then on: 2 more riders a minute each way from that town. The house was walk-in and empty before; now someone is in | Up to the town's plots. Home: cottages 3 and 4 at v26 (the two "on the way in from the dock" are lived in from the start), a fifth plot at the first branch. Each later town arrives with two households and two or three plots | Home's third cottage 300 (5 min), its fourth 800 (9 min), its fifth 3,000; Ring Island 1,300 then 2,100; Canopy Town 2,500, 4,000, 6,400; Port Quay 3,500, 5,600; High Gorge 5,000, 8,000. Each next household in a town costs 1.6 times the last |
| A workplace or sight opened for the town | Riders get a place to go: 1 more rider a minute each way to that halt, and up to four little guys are seen inside (review call 21) | One or two a place. The first is the room behind Ring Island's works wall, third in the owner's opening order | 1,600 at Ring Island; later ones 8 to 12 min |
| A station fitted out (benches, a canopy, lamps, a clock) | That town's riders rise by a quarter; the platform reads as a station. The second fit-out adds another quarter | Two steps, only at a place with a station house ([junction-stations](junction-stations.md): the tier is earned by what the place is, not bought) | Home's hall 1,800; Ring Island's Lookers' waiting room 2,400; Canopy Town 3,500; Port Quay 5,000; High Gorge 7,000 |

**Passenger cars and seats (they carry riders).**

| What you buy | What it does in play | How many | First price (Boogles) |
| --- | --- | --- | --- |
| The Six fit-out on a line's passenger cars | Four seats a car become six. Needs no place on the train, so it is the first seats step on today's three-car trains (review finding 8) | Once a line | Line 2 600 (9 min); line 1 500; a branch line 3,000 |
| A second passenger car on a line | Twice the seats. It takes one of the places the boiler gives, and the boiler is bought with steel, so iron opens the place and Boogles fill it; a cargo car (materials) can take the same place instead | One a line while the cap is four cars | Line 2 2,000, once the longer boiler gives the place; the ring 6,000 |
| The express's passenger set | Decided for later ("later a passenger set the room buys"). Riders use it between junction stations when no player has called it (review ruling 8) | One | 6,000 at High Port, if question 5 puts it on the Boogle side |

**Source upgrades (they change a rate; the room still hauls).**

| What you buy | What it does in play | How many | First price (Boogles) |
| --- | --- | --- | --- |
| Faster regrowth at a hand-worked source (the timber camp's grove, the Quarry's rocks; later the cloth loft's crop) | Trees and rocks come back in 24 minutes instead of 31, then 18. More to chop, and every piece is still chopped and carried | Two steps a source | Camp 1,100 (10 min); Quarry 1,100; cloth loft 2,800 |
| A bigger yard at a source (the forge's and the depot's racks, 24 today; later the steel works', the cloth loft's and the copper source's) | The source's own stack holds half as much again, then twice. It stops less often with a full rack, and the next join finds more waiting (the away credit is "never past the yard") | Two steps a source | Forge rack 900; steel works 1,500; cloth loft 2,400; copper source 4,000 |
| A faster jib on a source's loader | The loader fills the matching car in less of the stop. It never loads more than the car holds | Two steps a loader. The loader itself comes free with its resource | The Works' footing loader 1,300; steel works 2,200; cloth loft 3,200; a ring source 5,500 |

**Checks on the source list.**

- **"materials and Boogles never convert".** No Boogle becomes a log. Regrowth is the source's own trees and rocks,
  sooner. A bigger yard only stops a source wasting what it already makes. A jib moves pieces the source made onto a
  car the room paid for in materials. Nothing is delivered, credited to a bill or sold. The away credit's horizon
  (H = 2 h) does not change; a bigger yard raises only the "never past the yard" limit, by at most twice.
- **Nobody buys speed.** What reaches a bill a minute is bounded by cars, cradles, trains and the boiler, all
  materials. A source upgrade can fill that capacity sooner and can't raise it. The model bounds the effect (section
  8).
- **The works' own stages** (the model's producer levels, each a hauled build) stay hauled. A Boogle step is never the
  same thing as a level, so no upgrade has two prices.
- **Yards at halts** ([station-deposit](station-deposit.md), answered 10 November) are not sources and get no Boogle
  upgrade. A halt's yard holds only what a player left there ("A yard at each halt: take it where it lies; trains later
  carry it to where their line needs it"), and it cannot be made bigger because it never fills ("No: past 24 of a kind
  it grows in strapped bundles of 8"). The "bigger yard" here is a source's own output rack. Steel for upgrades still
  waits "As a visible stack in the Roundhouse bay, spent by an install"; Boogles never touch that stack.
- **Loader upgrades change currency.** [engine-garage](engine-garage.md) lists "Loader upgrades (faster jib, gantry)"
  as a placeholder priced in steel. The decision names a loader as a source upgrade, so that row moves to Boogles and
  loses its steel price (question 5).

### How the wheel closes, stage by stage

| Stage (solo hours) | Minutes | Boogles a minute: on arrival → with everything bought | Earned by a room that buys steadily | New prices on offer | The strongbox holds |
| --- | --- | --- | --- | --- | --- |
| v26 today (0.6–1.8) | 76 | 56 → about 110 | about 7,200 | 6,600 (8 things) | about 2,100 |
| Ring Island (1.8–2.5) | 40 | 150 → about 220 | about 7,400 | 14,900 (8 things) | about 3,700 |
| First branch (2.5–3.9) | 84 | 230 → about 330 | about 23,500 | 30,800 (9 things) | about 9,600 |
| High Port (3.9–4.7) | 48 | 330 → about 420 | about 18,000 | 24,100 (5 things) | about 9,000 |
| Ring closed (4.7–6) | 78 | 450 → about 650 | about 43,000 | 31,500 (5 things), then the Boogle-priced goals | about 12,000 |

The v26 walk-through, solo: two households pay 56 a minute; the third cottage (300) comes in five minutes and its
riders overfill the trains, so income stops at the seats' 67 and a crowd is left; the Six fit-out (600, nine minutes)
lifts the seats to 100 and clears it, so income is the riders' 84; the fourth cottage (800, nine minutes) fills the
seats again at 100. From there the room earns about 105 a minute with line 1 and has five things to choose between, at
about ten minutes each: line 1's seats, the grove, the Quarry's rocks, the forge rack and the Works' jib.

**Where it is capped.** The review found income running far ahead of prices (about 8,100 earned before Ring Island
against 550 of things to buy, about 100,000 by six hours) and income that never stops. Both stay fixed by rule, not by
tuning:

1. **Riders are capped by households, households by plots, and plots by the route.** A town can hold only the houses
   the railway's arrival and deliveries have opened, and a station only two fit-outs. So each stage's income has a
   fixed top (the table's "with everything bought" figure) that neither time nor Boogles can pass. To earn more the
   room has to connect the next place.
2. **Seats are capped by the boiler.** A passenger car takes a place on the train, and places are bought with steel.
3. **No compounding on the balance.** No interest, no price that scales with the wallet, a fixed fare.
4. **The strongbox has a size** (question 1): the larger of 20 minutes of income and one and a half times the dearest
   thing on offer. Fares past a full box do not land. So the most a room can carry into the next stage is one box,
   where the first draft carried 7,500 into Ring Island against 1,100 of new prices; and a tab left open all night
   earns one box.
5. **The coin sack holds 15 minutes** of the income at leaving, and nothing runs while the room is empty (decided).
6. **Prices are 8 to 15 minutes of income** at the moment a thing is offered (a town's last household runs to about
   20), each next step of the same thing 1.6 times the last, and across the route more is on offer than is earned:
   about 108,000 of prices against about 99,000, where the first draft had income at about seven times its prices. A
   room never clears the list by waiting. Things left unbought stay on offer and get cheap, which is the catch-up.
7. **Source upgrades are two steps a source and never raise what the cars carry.**

Two things the model must check: a Boogle buy about every ten minutes may be too many beside the building
([incremental-game-maths](../research/incremental-game-maths.md) gives 12 to 20 minutes between smaller gains), in
which case prices rise and the lists shorten; and the end-game goals need sizing against 650 a minute.

**Boogles beside resources** (reworked for the owner's change of 10 November):

| What it is | How it is paid for |
| --- | --- |
| Building the world: track, bents, footings, station frames, the forge's and works' stages, interchanges | Hauled materials, as now. No route step has a Boogle price (the decision's rule) |
| What the route hands you: every gate and ability, each resource's free first car and first loader, the first steel fit (the part itself) | Free or the part itself, as decided. Never a price of either kind |
| Engine upgrades: boilers (speed and the car cap), the plough | **Materials only**, from the steel stack in the Roundhouse bay |
| Cargo upgrades: cargo cars past the free first, cradles | **Materials only** |
| Town upgrades: households, opened workplaces and sights, station fit-outs | **Boogles only** |
| Source upgrades: faster regrowth, a bigger source yard, a faster jib | **Boogles only** |
| Passenger cars past the first, the Six fit-out | **Boogles only** |
| Train looks and whistles; more service trains on a line; the express's passenger set; the end-game goals | Not named by the decision: question 5 gives the recommended side for each |
| Wearables at Fine Prices | Free: the shop stays free (owner, 10 November) |
| Logs, stone, rails, footings, steel and every other material | Never bought and never sold: "Fares only; materials and Boogles never convert" |

No upgrade has two prices, so the first rework's "one or the other" reading is gone, and with it the review's
question of what happens to an upgrade's material price.

The one rule kept from the first draft holds without a caveat now: nothing the main route needs is priced in
something that can run out. No step of the route has a Boogle price at all, so a room that never spends a Boogle, or
spends every one on whistles, finishes the game on materials alone.

**The end-game goals** in the model (`GOALS`, G1 to G8) each carry a Bucks price, and six of them a material bill as
well. One price each, by question 5's test: the Grand Station at Home and the Ring lighthouse are town upgrades
(Boogles); the auto-placing cranes, the works' level 5, the crystal garden and the deep-sea spokes are cargo, works
and track (materials); the express engine collection is a look; "A hat for each friend" goes, because the shop is
free. The Boogle-priced ones are about 60,000 today, an hour and a half at 650 a minute, so the model raises them or
adds town goals until they take a few hours.

## 4. Sinks

What Boogles buy is in section 3. **What stops inflation:** the seven caps there. Prices are fixed and never scale
with the wallet (Fine Prices' climbing tag stays a joke on its own sign); each next step costs 1.6 times the last;
income is capped by households and seats, never compounding on the balance; the strongbox has a size. Looks, if
question 5 keeps them on the Boogle side, are a collection with no end and the late sink. **Personal cosmetics** (the
pause wardrobe, Fine Prices: every item is free, with absurd tags from $8 million to $3 billion and "TODAY: $0",
`src/render/cosmetic-parts.ts` `STOCK`) stay free and outside the wallet (owner, 10 November: "The shop stays free");
secret-crate finds stay personal and free.

## 5. Away and co-op

- **Paused world:** nothing runs while the room is empty (the 6 November rule). The till at Home is a producer with a
  yard: the next join credits it the rate it was earning × H × (1 − e^(−away/H)), H = 2 h, never past the sack's size
  (15 minutes of that rate; question 1), computed in the sim like every other producer's credit (`railAwayCredit`).
  The credit waits as a coin sack on the ticket counter; one press from anyone pours it into the strongbox, and
  everyone in the room sees it (the shared-moment system).
- **One wallet:** anyone spends, everyone sees. Buying is the garage's Install with its hold (no dialog), at the place
  the thing changes, never from a menu (9 November). **Griefing:** everything bought stays bought and nothing bought
  takes anything away; the strongbox's paper tape lists each purchase with the buyer's name ("Mo: third cottage,
  300"), with no undo or blame UI. A wrong buy costs only time.
- **Co-op:** buys are spread over the map now (a cottage, a grove, a station two islands away), so friends can split
  up to make them, and the price card's have-and-need (question 3) is what stops two of them spending the same
  Boogles: the second press is refused with the balance shown.

## 6. Show, don't tell

- **The wallet:** Home's concourse hall (layout B) gets a ticket window on its north end wall (review finding 5):
  behind glass, a brass strongbox with a tall coin column that fills to a mark, and a split-flap counter above it
  reading the Boogles (the halt signs' split-flap face). The pause screen may show the same number read-only, as it
  may show upgrades.
- **A fare paid:** at the halt, each alighting rider drops a coin in the fare box on the lever post (a clink, local);
  at Home, when fares land, coins tumble into the column and the counter flutters. Far from Home you only hear your own
  halt's clinks; the counter is there when you get back.
- **A household moves in:** the handcart at the door is unloaded by the little guys, a lamp comes on in the window and
  the first of them walks to the platform. From then on that door opens onto a lived-in room.
- **A source upgrade** shows as the thing itself: saplings staked in the grove, a second bay on the rack, a longer jib.
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

- **Because a crowd is left.** Seats are worth buying only where a train leaves riders behind, and the car is offered
  at a line only once that has happened there, so a room can't buy seats nobody needs.
- **Seats or cargo:** the engine pulls only so many cars (the boiler sets the cap: 3 today, 4 with the longer boiler).
  The first cargo car of each resource is free and stays, so the choice is about the extra place: a passenger car
  (Boogles) earns fares, a cargo car (materials) moves material faster. The two are bought with different things, so
  the choice is which the room wants on that line, and it is real only once the route leaves a place free (review
  finding 8).
- **Town or seats:** each is useless without the other. Seats past the town's riders run empty, and households past
  the seats stand on the platform. Reading which one is short is the play.
- **Far towns pay:** fares rise with distance, so a seat on line 2 (Home to the ring) earns about three times one on
  line 1 (Village to Camp). Cars are bought per line, so the long line gets them first: "lines should be plenty long
  where it's worth the upgrade".
- **Junctions:** riders change lines at a junction station on foot, walking between platforms as players do, which
  opens pairs across lines that one line can't reach.
- **The express and interchanges** are the [express-train](express-train.md) brief's: the express is the next service
  train called for players, free, and an interchange is track, bought at a junction for steel and rails, with no
  Boogle price. Its later passenger set is decided as something the room buys; question 5 puts it on the Boogle side
  as passenger cars, and riders use it when players don't (review ruling 8). Riders never call the express.

## 8. Systems

- **New in the sim** (`src/sim`, the railway state): the wallet (an integer) and its size; per halt, its waiting count
  and a demand accumulator (integers, filled each tick by the town's rate in thousandths of a rider, from its
  households and fit-out step); per train, riders aboard as two integers per destination halt (a count, and the sum of
  their boarding `s` in cm), so the fare is `count × s_dest − sum` without storing each rider; per town, its
  households and fit-out step; per source, its Boogle steps. A standing train lets riders off and on in the sim's
  existing stop step. Destinations are split at boarding by fixed weights in a fixed order. All integers, no
  randomness beyond `mulberry32`, no trigonometry (`docs/agents/lockstep.md`).
- **New op:** `trade.buy(item)`, validated by the server (enough Boogles, the item is offered, the room isn't
  mid-install); an additive registration through `registerOp`.
- **Why lockstep, not a counter:** riders can't be a pure function of tick, because when trains stop depends on levers
  and players. The cheapest state that can't desync is these few integers, inside the train sim that already decides
  every stop. It never reads seat claims (host state).
- **Mixed builds and `WORLD_NS`:** dev phase, no old builds supported. The new state changes the railway snapshot's
  shape, so the production build needs a bump: its own, when it is ready (owner, 10 November: "Nothing should wait on
  a world bump"), held only while the owner is mid-session, and built after the ECS migration. The `?proto=trade` step
  needs no save and no bump: the lead tab runs the same rules as Host-kind state (`addHostField`), and a buy is a
  message to it.
- **The economy model first:** `ring-data.ts` gets a `TRADE` block (seats per car, the fare rule, riders per
  household, households and plots by town and step, fit-out steps, the strongbox and sack sizes, and the three buy
  lists of section 3 with their prices) and `ring-sim.ts` computes fares per step beside `freightRate`, with fares
  replacing surplus sales as the wallet's source (`PRICES` and `sold` go: question 5 of the answered set) and `bucks`
  renamed `boogles`. Engine and cargo upgrades keep their material bills and get no Boogle price. Each goal in `GOALS`
  keeps one price. The report shows three rooms:
  - **One that never spends a Boogle.** It must finish in about six hours on materials alone. This is today's model
    with the wallet ignored, so it is a check that nothing on the route gained a Boogle price.
  - **One that spends on households and seats first.** Its route hours must match the first room's within 5% (the
    first draft's test, which holds again: nothing it buys moves freight, and riders' stops are the only cost). It
    shows the income curve, the minutes waited for each buy, and how long the box stands full.
  - **One that spends on source upgrades first.** How much shorter the route gets. Proposed bound: 10%; past that the
    source steps shrink.

  It also shows, for every room: Boogles earned against prices on offer at each stage (the sevenfold check), at least
  two moments where two things are on offer that the room cannot both afford, Boogle buys an hour, what a night with
  the tab open earns (one box), the end-game goals still taking a few hours, solo and three players within the
  existing 15%, and that steel, fibre and copper are used exactly as in today's model. The playable
  [economy prototype](../economy/economy-prototype.html) (`play-sim.ts`) gets riders, towns with households, a till
  with its mark and the first buys of each kind, so the owner can feel the wheel in 2D first.

- **Review:** an independent pre-merge review of the sim and op change (owner-calls' review route).

## 9. Risks

- **An idle game in a hands-on builder:** held. Fares arrive without anyone doing anything, but they buy no iron and
  no step of the route, the box fills and stops, and each stage's income has a top only building can raise. What is
  left is a second loop a player may ignore, and one who ignores it loses nothing the route needs.
- **The six hours:** town upgrades and seats move no freight. Source upgrades can shorten waits at a source; the model
  bounds it at 10% (section 8), and the steps shrink if it is more.
- **Hauling made pointless, or trade made pointless:** neither currency buys the other's things. The risk left is
  trade feeling like a side game; the two crowds on the platform, on the way to every train, are what tie it to play.
- **Too many small buys:** about one every ten minutes on the stand-in prices, each at a place you walk or ride to.
  With friends that is things to split up for; solo it may be a chore. The model reports buys an hour.
- **A second progress bar nobody reads:** no HUD number; the readout is the queue, the column and the counter, and a
  buy's effect shows as a shorter queue or a busier platform.
- **Crowds on a phone:** a hard cap on drawn riders (about 24 more), instances only, culled at 150 m; measured in the
  first build's phone still, at Far Head on purpose (review ruling 4).
- **Trains stopping more:** riders' requests add stops, and town upgrades add riders; question 2 and the model's bound
  of one extra stop on an average trip.

## 10. The smallest first build

**Step 0, model and 2D (about a day; first, as the owner answered):** fares, seats, households, the strongbox's size
and the three buy lists in the economy model, with the three rooms and checks of section 8; then the playable economy
prototype gets riders, a till and the first buys of each kind. The owner can play the wheel in 2D and see whether the
wallet is ever tight.

**Step 1, `?proto=trade` on v26** (two lines from Home; the Village's four cottages; the Quarry, Far Head, the Pier):

- Riders only between the **Village and Far Head** on line 2. The two cottages on the way in from the dock are lived
  in; each sends 2 riders a minute each way, so line 2's two trains (one Four car each) just keep up, at 56 Boogles a
  minute.
- Fares (7 Boogles a trip) land in a **till at Home's hall**: a placeholder strongbox with a coin column, its mark and
  a split-flap counter; the away sack is not in this step.
- **The car to buy** (the owner's "one car to buy"): line 2's second passenger car, a second Four, 600 Boogles,
  installed with the garage's hold at a part waiting by the line 2 road ("upgrades chosen in the world"). It is
  offered once a train has left riders behind. The prototype's line 2 trains run four cars for it, which today's cap
  does not allow (review finding 8); production's first seats step is the Six fit-out.
- **Two households to move in**, which go one step past his words and are this brief's proposal: the third cottage
  (300) and the fourth (800), each a handcart at its door. Without one there is no crowd and so no reason for the car,
  and with them the prototype tests the wheel he changed the rule for (riders, fares, town, more riders) and not only
  the seats. Expected: 56 → 67 with a crowd left (third cottage) → 84 with none (the car) → 112 (fourth cottage).
- No source upgrade in this step: it has nothing to show in a ten-minute look. The model and the 2D page carry it.
- Host-kind on the lead tab, unsaved, no `WORLD_NS`, no op; the rest of the game unchanged. Held with every other
  build behind the ECS migration.

## Design review (designer, 2026-11-10)

> **Kept as history; marked on 10 November after the owner's change.** This review was written against "Anything,
> including engine and cargo upgrades". An hour later he said "Maybe googles doesn’t buy train parts but does buy town
> upgrades? Or supply upgrades for resource sources?" [Boogles] and answered "Yes" to recording "Boogles buy town
> upgrades, source upgrades and passenger cars, never engine or cargo parts, never materials". That settles verdict
> item 1, ruling 1, calls 5 to 7, finding 1 and owner questions 1 and 2; each is marked **Settled** below and its text
> is unchanged. Findings 2 and 3 (prices far below income; income that never stops) still stand and are answered by
> the caps in [section 3](#3-the-money). Owner questions 3 to 5 are answered again under
> [Still open](#still-open-for-the-owner-after-the-change-of-10-november). Where a ruling counted on engine and cargo
> upgrades as Boogle sinks (finding 2's retune, ruling 8's "Boogle prices appear in both groups", call 34's third
> train, call 41's Service category), read the body, not the review.

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
   something that can run dry. **Settled later on 10 November (owner):** "Maybe googles doesn’t buy train parts but
   does buy town upgrades? Or supply upgrades for resource sources?" [Boogles], and "Yes" to never engine or cargo
   parts. Engine and cargo upgrades are priced in materials only, so there is no second price to settle.
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
| 5 | Boogles may buy anything, engine and cargo upgrades included | Decided | Owner, 10 November answer 2, against the brief. **Settled later on 10 November (owner): replaced.** "Yes" to "Boogles buy town upgrades, source upgrades and passenger cars, never engine or cargo parts, never materials" |
| 6 | A material-priced upgrade may be paid in Boogles or in its materials, one or the other, whole | New | The rework's reading. **Recommended, with the Boogle price set at about twice the time its material bill takes to haul at that stage.** Finding 1, question 1. **Settled later on 10 November (owner): withdrawn.** "Maybe googles doesn’t buy train parts"; no upgrade has two prices |
| 7 | Track, bents, footings, station frames and works stages have no Boogle price; the route's own parts stay free | New | **Recommended:** a reading of "anything" as "anything on sale". Question 2. **Settled later on 10 November (owner): holds.** His "Yes" was recorded with "no route step has a Boogle price" |
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
   before the model is built.** His answer is decided; these are its consequences. **Settled later on 10 November
   (owner):** "Maybe googles doesn’t buy train parts but does buy town upgrades? Or supply upgrades for resource
   sources?" [Boogles], and "Yes" to "never engine or cargo parts, never materials". Steel, fibre and copper keep
   their use and nobody buys speed, so the risk below no longer applies; the text is kept as the reason for the
   change.
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
   materials and a Boogle fee together. Answer: ___ **Settled later on 10 November (owner):** "Maybe googles doesn’t
   buy train parts but does buy town upgrades? Or supply upgrades for resource sources?" [Boogles]; "Yes" to never
   engine or cargo parts. Boogles buy neither, so the material price is the only price.
2. **Does "anything" include what the route is built from** (track, bents, station frames, works stages) and the
   parts the route hands over? Recommended: no. Those stay hauled or free, so no step of the route ever has a Boogle
   price. Answer: ___ **Settled later on 10 November (owner):** "Anything" is replaced; his "Yes" was recorded with
   "no route step has a Boogle price".
3. **Does the strongbox have a size?** Recommended: yes. It holds about 30 minutes of the current income, fares past
   a full box are turned away, and the coin sack holds 20 minutes. Otherwise a tab left open overnight is the best way
   to play. Answer: ___ (Still open; asked again, with smaller sizes, as question 1 under
   [Still open](#still-open-for-the-owner-after-the-change-of-10-november).)
4. **Do waiting little guys stop a train by themselves?** Recommended: only when four or more wait, and never an
   express, so request stops keep trains fast. Answer: ___ (Still open; question 2 there. He has since decided that
   an express passes a friend's pulled lever: "It runs past; the next train serves them".)
5. **The wallet's place:** your 6 November call put it in a strongroom beside the Home Yard. Recommended: the ticket
   window in the station hall instead, on the north end wall, with the balance also on each price card and each
   halt's fare box. This also rewords DESIGN.md 6 from sales to fares. Answer: ___ (Still open; question 3 there.)
