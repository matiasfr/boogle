> **Status: answered three times by the owner on 10 November and reworked each time; the last five questions were answered on 11 November
> ("I like your recommendations for 1-5").** Light brainstorm (one agent, three lenses: play designer, systems architect, creative director), then a
> [design review](#design-review-designer-2026-11-10). Design only: nothing here changes code, saves or a `WORLD_NS`,
> and the build is held behind the ECS migration. The owner's seed, his pick of the name (**Boogles**), his first six
> answers ([Open questions](#open-questions-answered-by-the-owner-10-november)) and his seven later answers with his
> notes ([Still open, now answered](#still-open-for-the-owner-after-the-change-of-10-november)) are in this file word
> for word.
>
> **Step 0 done (11 November): the economy model and its 2D page are built** (no game code):
> [`dev/economy/trade-model.ts`](../../dev/economy/trade-model.ts) and
> [`trade-data.ts`](../../dev/economy/trade-data.ts) (one table of tunables), the page
> [trade-economy.html](../world/trade-economy.html), and `npm run economy -- trade`. Results are in
> [Model results](#model-results-11-november). Houses now cost twice the last in a town (owner, 11 November: [decision](../decisions-rewards.md#d-2026-11-11-boogles-prices-are-stand-ins-to)); fares kept; the late-game shortfall is an open content question. Not tested on a device.
>
> **What his later answers changed (10 November):** Boogles **build houses** on town plots ("Boogles build the house
> itself; unbought plots stay empty ground") and **upgrade sources**, the faster loader arm included. **Anything on
> rails costs materials**, "including the passenger train and seats", so passenger cars and seats left the Boogle
> list; his note calls the train-parts answer "a light suggestion", so it is recorded as a leaning the 2D model may
> revisit ([decision](../decisions-rewards.md#d-2026-11-10-boogles-build-houses-and-upgrade-sources)). The strongbox
> and sack sizes, the ticket window on the hall's north end wall, and little guys stopping a train only at four or
> more and never an express are decided as recommended
> ([money](../decisions-rewards.md#d-2026-11-10-the-strongbox-the-coin-sack-and),
> [riders](../decisions-rail.md#d-2026-11-10-waiting-little-guys-stop-a-train)). The first prices are "Fine as
> stand-ins; tune them on the 2D model page".
>
> **The body below was reworked for these on 10 November.** Every number is a stand-in for the model step and is hand
> arithmetic, not a model run. Two of his notes are leanings, not decisions, and are designed here as proposals: town
> buildings as intentional buys, and money that no individual can spend. The five questions still his are under
> [Open after his answers](#open-after-his-answers-of-10-november). **The shop stays free**, fares are the only
> source, and nothing converts: those answers stand.
>
> **His four follow-ups (10 November), and what they changed.** The orchestrator put four places to him where this
> brief's reading of his words could be wrong; his replies are word for word under
> [Follow-ups](#follow-ups-answered-by-the-owner-10-november). (1) The Village: "maybe only a couple buildings exist, so
> you get the satisfaction of building up", a leaning, so the brief now proposes that two cottages stand on arrival
> and the other two are bought plots
> ([leaning](../decisions-rail.md#d-2026-11-10-the-village-may-start-with-a)). (2) "On rails" read as what rolls:
> "sounds ok". (3) Loose coins in a tray at each halt: "yeah we can run with this for now". (4) The 10% limit on how
> much source upgrades may shorten the route: "this doesn't Seem a restriction we need explicitly", so it is no longer
> a rule; the model only reports the number
> ([decision](../decisions-rewards.md#d-2026-11-10-boogles-follow-ups-on-rails-is)). With the first reply he also
> said "Forge should finish when the player finishes building it btw, and it should have an interior.", which is not
> about this brief and is recorded in the
> [rail log](../decisions-rail.md#d-2026-11-10-the-forge-finishes-when-the-player).

# Passenger trade (passenger-trade)

The owner's seed, 10 November 2026: "I want to design a new potential mechanic. Passenger trains if purchased should
have a benefit outside of just for players, as players max out once there are a few and don't need more space. It
would be cool if the little guys take trains between cities and generate like trade revenue that provides a income
source that can later be used for upgrades, so there's a fly wheel in addition to resources that is currency that can
also be used. currency should also be "Boogles""

His change, an hour after his first answers (10 November): "Maybe googles doesn’t buy train parts but does buy town
upgrades? Or supply upgrades for resource sources?" [he means Boogles]. Asked whether to record "Boogles buy town
upgrades, source upgrades and passenger cars, never engine or cargo parts, never materials", he answered "Yes".

His notes with his later answers (10 November), word for word: "faster loader arm would theoretically increase
resource gain in the system so it's a good candidate fro upgrades. train parts take as light suggestion as it relates
to boogles. I like the idea that buying plots of land both helps a town economically but also introduced new
characters and a building to discover. Maybe these are intentional upgrades instead of naturally happening from
connecting a place. it's also a good opportunity for construction animation. for strongbox, im wondering what the
separation should be between personal money and not? should depositing your own money to help with communal upgrades
be the way it's incentivized to be merged? Maybe money doesn't buy anything for individuals, it can just be pooled
into the shared deposit, and otherwise it's used comedically ."

His four follow-up replies (10 November), word for word, in the order asked: "maybe only a couple buildings exist, so
you get the satisfaction of building up. Forge should finish when the player finishes building it btw, and it should
have an interior."; "sounds ok"; "yeah we can run with this for now"; "yeah I want clarification but this doesn't Seem
a restriction we need explicitly".

**Read:** DESIGN.md (6, 7, 8, 9, 11, the core loop); the decision log's routing table and the rewards, rail and
core-loop rules, and these entries: 10 November Boogles build houses and upgrade sources; the strongbox, the coin sack
and the ticket window; waiting little guys stop a train only at four or more; Boogles buy town upgrades, source
upgrades and passenger cars; riders and Boogles; 6 November economy principles amended (shared wallet, paused world,
away credit `H × (1 − e^(−away/H))`, H = 2 h, no offline production), 6 November roughly six hours, 2 November the
rail builds the world ("no routing or quotas", "towns grow from what arrives"), trains growing the town from cargo,
and towns grow and you can see them, 1 November construction you can watch, 9 November upgrades chosen in the world
with no menu, 9 November gold finds cut ("gave no reward and only echoed the crystals"), 10 November the train upgrade
screen (Install; Upgrades versus Looks and sounds; "really satisfying to upgrade"), cars bought per line ("lines
should be plenty long where it's worth the upgrade"), long trains and loaders, stop on request, the express ("It runs
past; the next train serves them"), every building can be walked into and its opening order, junction stations;
owner-calls ("Shared progression and one shared wallet"); [money](money.md), [cart-first](cart-first.md),
[first-evening](first-evening.md), [engine-garage](engine-garage.md), [station-deposit](station-deposit.md) and its
five answers, [junction-stations](junction-stations.md), [express-train](express-train.md),
[ring-and-economy](ring-and-economy.md); [rail-map](../plans/rail-map.md); `src/proto/place/folk.ts`, `residents.ts`,
`seat.ts`, `seat-claims.ts`, `car-kit.ts`, `shop.ts`, `town-lines.ts`; `src/sim/railway-away.ts`, `railway-lines.ts`;
`dev/economy/ring-data.ts`, `ring-sim.ts`, `play-sim.ts`. Game-direction fit: the wallet is decided and unbuilt; this
gives it its first source and its first sinks. It orders nothing ahead of Ring Island v27 or the ECS migration.

## Verdict: build smaller

Build it, but not as a v26 feature with saves and a wallet yet. **First a model and 2D step** (fares, seats, towns
with plots and the two kinds of Boogle buy in the economy model and in the playable
[economy prototype](../economy/economy-prototype.html) the owner asked for on 6 November), **then a flagged
`?proto=trade` on today's game**: little guys riding Village to Far Head, a till at Home that fills, a house to build
and a car to haul for. The reasons: the wallet doesn't exist in `src/` or `server/`, so a real build is a new piece of
saved shared state plus the first spend op. Today's lines are short (line 2 is about 0.75 km), so fares are pocket
change; the flywheel only starts to bite from Ring Island (1.2 km on). And the model has three things to show: that
the shorter Boogle list still keeps the wallet tight (by hand it no longer does: [section 3](#3-the-money)), what
seats cost in hauling now that they are materials, and how far source upgrades shorten the six hours (a number he
judges, not a limit). The production
build (lockstep, saved) ships on its own `WORLD_NS` bump when it is ready ("Nothing waits on a world bump"), after the
prototype says yes and the ECS migration lets it in.

## Pitch

Towns are full of little guys, and now they travel. They walk out of their doors to the platform, climb into the free
seats, ride, get off and walk into a building at the other end, and every finished trip drops a coin, a **Boogle**,
into the room's shared wallet: a strongbox behind the ticket window on the north end wall of Home's hall, with a
split-flap counter over it. Boogles buy two kinds of thing (owner, 10 November). **A house on a town plot:** the room
pays at a staked patch of empty ground, little guys build the house while you watch, a new character moves in, there
is a new building to walk into, and the town sends more riders. **A source upgrade:** trees that grow back sooner, a
bigger rack, a faster loader arm. Everything on rails is hauled for: boilers, cargo cars, cradles, and now passenger
cars and seats too ("Anything on rails costs materials, including the passenger train and seats"). So a town that
outgrows its train leaves a crowd on the platform, and the crowd is a reason to haul, not a reason to spend. Nothing
is sold for Boogles and no Boogle becomes a material. It serves **6, Communal world** (one wallet, everyone's riders)
and **11, Show, don't tell** (the wallet is a pile you can see, the reason to haul for seats is a platform of little
guys left behind, the reason to build a house is an empty platform and a staked plot). It bends **the rail builds the
world** a little: a second loop beside goods, which the caps in section 3 bound, and, if his leaning becomes a rule,
towns that grow by choice (question 2).

## Gut question

When the platform stood empty and a plot stood staked beside the lane, did you want to build the house and meet
whoever moves in; and when the train pulled out and left little guys waiting, did you want to go and haul for the
seats?

## Best suggestions, ranked

1. **Boogles are for people and places; anything on rails is hauled** (design, systems). Fares are the wallet's
   source, and nothing converts either way (owner, 10 November: "Fares only; materials and Boogles never convert").
   After his later answers the split is easy to say: if it rolls, haul for it; if it is a house or a source, the
   riders pay for it. No upgrade has two prices.
2. **Two crowds are the two prompts, and they point at the two loops** (creative, design). A platform with nobody on
   it and a train leaving with empty benches says the town is too small: build a house (Boogles). A platform with
   little guys left behind says the train is too small: haul for seats (materials). No number tells you which; the
   platform does. Why: principle 11, and the owner's "players max out" is answered by riders who never do.
3. **A house is a person and a place, not a number** (creative; his note). Each plot bought raises a building little
   guys put up in front of you, brings one new character, and opens one new room to find. Why: "buying plots of land
   both helps a town economically but also introduced new characters and a building to discover", and "a good
   opportunity for construction animation".
4. **The route sets the ceiling, Boogles fill it** (systems). A town has only as many plots as the route has staked
   there, a train only as many places as its boiler pulls, and a source only two Boogle steps. So income at each stage
   has a fixed top that waiting can't raise, and the only way to raise it is to build the railway on. Why: it fixes
   the review's two findings (section 3, "Where it is capped").
5. **A player never costs a fare** (systems, design). The sim counts every seat for riders; seats are view-only for
   them. When you sit, the little guy in that seat hops up and rides standing on the step, holding the rail. Why: the
   lockstep never reads host seat claims, so it can't desync, and riding with friends is never a penalty.
6. **The wallet is a strongbox at Home's ticket window, and it has a size** (creative; decided 10 November). A glass
   coin column that rises to a mark, a split-flap counter over it, a coin's clink and the counter's flutter as each
   train's fares land, a paper tape of what was bought and by whom. Why: one physical place for the shared money, on
   the concourse every player crosses; and a column standing at its mark is a prompt to spend, not a score.
7. **Nobody has money of their own** (design; his note, a proposal). There is no personal balance and nothing a player
   can buy for themselves. A coin in a hand is a thing: you can carry it to the box, or play with it (section 5). Why:
   "Maybe money doesn't buy anything for individuals, it can just be pooled into the shared deposit, and otherwise
   it's used comedically"; and it is what "Shared progression and one shared wallet" and "The shop stays free" already
   say.
8. **Source upgrades change a rate; the room still hauls** (design). Trees and rocks come back sooner, a source's own
   rack holds more, its loader arm swings faster. The room still chops, carries and hauls every piece. Why: it is the
   Boogles' one way into the materials loop, and he wants it there: "faster loader arm would theoretically increase
   resource gain in the system so it's a good candidate fro upgrades".

**Tensions.** (a) An idle flywheel against a hands-on builder: income accrues while you build, so the risk is a game
that plays itself; held by the caps (section 3), by suggestion 1 and by buys that are things you go and see. (b) The 8
November agent call "trains earn no away credit" ([agent-calls](../agent-calls.md)) is about freight moving while the
room is empty; this brief gives the **till**, as a producer with a yard, the same capped away credit as every
producer, and moves no train. (c) Fine Prices' joke is that you pay $0; settled: the shop stays free (owner, 10
November), so the joke and its lines stand. (d) Riders asking trains to stop slows freight a little; decided: only at
four or more waiting, and never an express. (e) "Towns grow from what arrives" (2 November) and houses bought with
Boogles both claim the town. His answer puts each house on the Boogle side; his note leans further ("Maybe these are
intentional upgrades instead of naturally happening from connecting a place"). Section 1 designs both ends and
question 2 asks him. (f) Seats on materials take the seat buys out of the Boogle list, and by hand the list is then
smaller than what a room can earn (section 3): the model has to close that, and question 4 asks whether seats on
materials stands once he has seen it. (g) His sentence says "Anything on rails"; a station's benches and canopy are
not on rails, and train paint is. This rework keeps station fit-outs on Boogles and gives looks and whistles no price
yet; he confirmed that reading ("sounds ok", [follow-up 2](#follow-ups-answered-by-the-owner-10-november)).

## Shape

- **Sync:** the wallet (one integer), each halt's waiting count, each train's riders aboard (two integers per
  destination halt), each town's plots (empty, building, built) and station fit-out step and each source's Boogle
  steps (small integers) are **lockstep** railway state, saved and hashed; fares are paid in the sim when a standing
  train lets riders off. Riders' bodies, where they sit, their walk to and from a door, a house going up and every
  coin's clink are **Local**, drawn from those counts. Seats and passenger cars are train parts like any other: the
  garage's install, paid from the material stack. The prototype runs the same rules **Host**-kind on the lead tab,
  unsaved.
- **Reuses:** `folk.ts`'s instanced little guys (4 draws for all of them; `riders`, `ride()`, the door targets), the
  passenger car's four bench seats (`car-kit.ts` `BENCH`), the request levers and train stops in `src/sim`, the away
  credit (`railAwayCredit`, `expNeg`), split-flap signs, the garage's Install and hold, the piece-by-piece
  construction the game already has (1 November: "construction you can watch is how things get built"), the
  shared-moment system for the away sack.
- **Smallest first build:** `?proto=trade` on v26: Village to Far Head riders, a till at Home, a house to build and a
  car to haul for (section 10).
- **Risks:** an idle game; a second progress bar; a Boogle list too short for its income; the six hours through source
  upgrades and through hauling for seats; crowds on a phone (section 9).

## Done means

Each moment captured with `look`; the hooks named here are proposals for the builder to add.

- **Platform queue:** `?proto=trade`, spawn on the Village platform, `--eval` filling the Village's waiting count
  to 12. A still shows twelve little guys on the platform; after the next departure (real-time clip) eight board, four
  stay. Measured: waiting before and after, seats filled.
- **An empty platform and a staked plot:** before any house is bought, a clip of a train leaving the Village with
  empty benches and nobody left waiting; the Village shows two cottages standing and two staked plots, the first
  plot's stakes and its sign are in the same shot or one turn of the camera away, and a player can walk across the
  plot.
- **A rider seat given up:** two players, one sits on line 2's car. The rider in that seat stands on the step; the
  wallet's fares for that trip match a run with nobody seated.
- **Fares land:** a clip at Home's ticket window as line 2's train stands: the coin column rises and the counter flips
  by exactly the trip's fares (asserted against the sim's wallet).
- **A full box:** `--eval` the wallet to its size; the next train's fares add nothing, the column stands at its mark
  and the counter does not move (asserted against the sim).
- **Alighting:** at Far Head, riders walk off the platform to a door and are gone inside within 20 s; none is left
  standing at the edge.
- **Four wait, three don't:** with three little guys waiting the request lamp stays dark and the train runs through;
  with four it lights and the train stops (asserted against the sim).
- **The house:** with 300 Boogles, hold Install on the first plot's sign at the Village. A real-time clip shows the
  little guys put the house up piece by piece; when it stands its door opens onto a room, the Village sends 6 riders a
  minute each way instead of 4 (sim-side, logged), and the next train leaves some behind.
- **The car:** with the logs for it stacked in the Roundhouse bay, hold Install on the second passenger car;
  afterwards line 2 runs two cars, nobody is left behind, and the Boogles a minute (sim-side, logged) rises from about
  67 to about 84. The wallet does not move when the car is installed.
- **Phone:** the busiest frame (two platforms full and a train arriving) adds no draw calls for riders, who are
  instances in the folk's existing four draws; the till adds its own few at Home only; a house going up stays inside
  the Village's budget.

## Open questions (answered by the owner, 10 November)

Each answer is the owner's, word for word as the coordinator relayed it to the reviewer on 10 November. Answer 4 goes
against the recommendation; answer 2 went against it and was then changed by him the same day. His later answers
that day changed answer 2 again in part (passenger cars) and bear on answer 1's "one car to buy"; both are marked.

1. **First step: the 2D page before the 3D prototype?** Recommended: yes, both, in that order: fares and seats added to
   the economy model and the playable economy prototype (about a day), then `?proto=trade` on v26 without waiting
   for an answer on the page. **Answer:** "First step: Add fares and seats to the economy model and the 2D page (about
   a day), then a flagged prototype on today's game: riders Village to Far Head, a till at Home, one car to buy"
   **Later on 10 November:** a car now costs materials ("Anything on rails costs materials, including the passenger
   train and seats"), so what the prototype's first buy is has gone back to him
   ([question 3](#open-after-his-answers-of-10-november)).
2. **What may Boogles buy?** Recommended: passenger capacity (passenger cars past the first, the Six fit-out, more trains
   on a line once the double track allows), station comforts, looks and whistles, and the end-game goals;
   never materials, a part, or anything the main route needs. **First answer (against the recommendation):** "What
   Boogles may buy: Anything, including engine and cargo upgrades". **Changed by him an hour later:** "Maybe googles
   doesn’t buy train parts but does buy town upgrades? Or supply upgrades for resource sources?" [Boogles], and "Yes"
   to recording: Boogles buy town upgrades, source upgrades and passenger cars; never engine or cargo parts, never
   materials. The later answer is the rule
   ([decision](../decisions-rewards.md#d-2026-11-10-boogles-buy-town-upgrades-source-upgrades)). It is close to the
   first recommendation with two differences: source upgrades are in, and looks, whistles, more trains and the end-game
   goals are not named either way (question 5 below). **Changed again in part, later on 10 November:** "Anything on
   rails costs materials, including the passenger train and seats", so passenger cars and seats left the Boogle list;
   town and source upgrades stand
   ([decision](../decisions-rewards.md#d-2026-11-10-boogles-build-houses-and-upgrade-sources)).
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

**Answered by the owner later on 10 November.** These were the five questions left after his change, each with its
recommendation; the decisions page asked them as seven ("[group] question: answer"), with the loader arm and the first
prices put separately. His answers are filled in word for word. Two went against the recommendation (4 and 5). His
notes, which came with them, are quoted in full at the top of this file. How the orchestrator read each answer is in
the decision entries
([what Boogles buy](../decisions-rewards.md#d-2026-11-10-boogles-build-houses-and-upgrade-sources),
[the money](../decisions-rewards.md#d-2026-11-10-the-strongbox-the-coin-sack-and),
[riders](../decisions-rail.md#d-2026-11-10-waiting-little-guys-stop-a-train)).

1. **How big are the strongbox and the coin sack?** Recommended: the strongbox holds the larger of 20 minutes of the
   room's income and one and a half times the dearest thing on offer; when the column stands at its mark, fares stop
   landing (the little guys still ride) until something is bought. The coin sack holds 15 minutes of the income the
   room was earning when it emptied, and may heap the column over its mark once, so no coin is seen to be thrown away.
   A bigger strongbox is never on sale. The review recommended 30 minutes and 20; both come down because prices are
   now 8 to 15 minutes of income each, and a box that holds two buys lets the room skip every choice. With a size, a
   tab left open overnight earns one box and stops. **Answer** ([The money you hold] How much the strongbox and the
   coin sack hold): "Strongbox: the larger of 20 minutes of income or 1.5 times the dearest thing on offer. Sack: 15
   minutes of income"
2. **Do waiting little guys stop a train by themselves?** Recommended: a waiting crowd lights the request lamp only
   when four or more wait (a car's worth); a train stops to let riders off only where riders were going, which is a
   place with a station house or a line's end, plus Far Head; and an express never stops for them. You decided an
   express passes a friend who pulled a lever ("It runs past; the next train serves them"), so it passes little guys
   too; that part is this brief's reading of your rule, not your words. Under the new rule the room's own town
   upgrades are what add riders, and Boogles can't buy speed back, so the model holds riders to one extra stop on an
   average trip at most. **Answer** ([Riders] Do waiting little guys stop a train by themselves?): "Only when four or
   more are waiting, and never an express"
3. **Where does the wallet live?** Your 6 November call put it in "the town's strongroom beside the Home Yard, coin
   crates that stack and empty, with a HUD figure only as a supplement". Recommended: the ticket window in Home's
   station hall instead, on the north end wall, because fares arrive by train. Boogles are now spent at cottages,
   stations and sources all over the map, minutes from Home, so the balance also shows on every price card (have and
   need) and on each halt's fare box. This also rewords DESIGN.md 6 from sales to fares. **Answer** ([The money you
   hold] Where the wallet lives): "A ticket window on the station hall's north end wall"
4. **What is a town upgrade, exactly?** Two older rules meet it: "towns grow from what arrives" (2 November) and
   "every building can be walked into" (10 November). Recommended: the route and its deliveries open **plots and
   buildings** in a town, as now, and every door opens from the day the building stands (an unbought house is the
   empty room your rule allows); Boogles move a **household** in, which turns the empty room into a lived-in one and
   adds its little guys as riders. So hauling sets how big a town can be and Boogles fill it. A "better station" is
   the fit-out of a station house the route built (benches, a canopy, lamps), never the frame, which stays hauled.
   Alternative: houses rise for Boogles alone, which lets fares outgrow the railway. **Answer, changed from the
   recommendation** ([What Boogles buy] What a town upgrade is): "Boogles build the house itself; unbought plots stay
   empty ground"
5. **Where do "train parts" end?** You named three kinds; these are named by neither side. Recommended, by one test,
   "does it change what a train hauls or how fast?": if yes, materials only (boilers, cargo cars, cradles, the plough,
   more service trains on a line, interchanges); if no, Boogles (passenger cars and seats, the express's passenger set
   you decided the room buys later, a loader's faster jib at its source, and train looks and whistles, which your 6
   November call already pays from the wallet). The first loader at a source stays free with the resource's unlock.
   The end-game goals each take one price, by the same test. **Answer, changed from the recommendation** ([What
   Boogles buy] Where "train parts" end): "Anything on rails costs materials, including the passenger train and seats"
6. **A faster loader arm at a source** (asked separately on the page; part of question 5 here). Recommended: Boogles,
   as a source upgrade. **Answer** ([What Boogles buy] A faster loader arm at a source): "Boogles (a source upgrade)"
7. **First prices** (asked separately on the page; the tables of section 3 as they stood). Recommended: fine as
   stand-ins, tuned on the 2D model page. **Answer** ([What Boogles buy] First prices): "Fine as stand-ins; tune them
   on the 2D model page"

## Open after his answers of 10 November

**All five answered by the owner on 11 November: "I like your recommendations for 1-5"** ([decision](../decisions-rewards.md#d-2026-11-11-boogles-the-five-open-questions-answered)). Five questions, each with a recommendation. The model step and the prototype go ahead on the recommendations; none of
the five holds the model step.

1. **Is there any personal money?** You asked: "what the separation should be between personal money and not? should
   depositing your own money to help with communal upgrades be the way it's incentivized to be merged? Maybe money
   doesn't buy anything for individuals, it can just be pooled into the shared deposit, and otherwise it's used
   comedically". Recommended, and it is the option you sketch: **no personal money at all.** No player has a balance
   and nothing is sold to one player. Fares land in the shared strongbox by themselves. A coin a player picks up or is
   handed is a thing in the hand: carried to the slot at the ticket window it drops into the box, and until then it is
   a prop to flip, toss or flatten under a train ([section 5](#5-away-and-co-op)). Carrying a coin in is never worth
   more than leaving it, so there is nothing to incentivise and nothing to merge. It fits "Shared progression and one
   shared wallet" (6 November) and "The shop stays free" as they stand. Alternatives: a personal purse you may deposit
   (a second balance to save for every player, a friend who joins late arrives poor, and with nothing personal to buy
   the purse is only a slower way into the same box); a personal purse that buys cosmetics (it undoes "The shop stays
   free" and brings back the personal coin you retired on 6 November). Answer (owner, 11 November, to all five at once: "I like your recommendations for 1-5"): **the recommendation.**
2. **What does a town have when the railway arrives, and what is bought?** Your note leans to buildings as
   "intentional upgrades instead of naturally happening from connecting a place"; the 2 November rule is "towns grow
   from what arrives", and that day you kept "the trains are substantively growing the town with the cargo".
   Recommended: both, with a line between them. **On arrival, from hauling, as today:** the station, and the town's
   starting few buildings, which rise from what the railway delivers and are the payoff for connecting it; they send
   the town's first riders. **Bought, on purpose:** every building after those. The route stakes a few plots in each
   town, a plot stays empty ground with stakes and a sign until the room pays, and then the little guys build on it.
   Hauling still sets how big a town can get, so fares cannot outgrow the railway. The other end, taken whole (nothing
   grows without a buy, and the 2 November rule and DESIGN.md's "Towns grow from what arrives" are reworded), is
   designed in [section 1](#1-the-loop). Answer (owner, 11 November, to all five at once: "I like your recommendations for 1-5"): **the recommendation.** **In part, later on 10 November (a leaning):** "maybe only a
   couple buildings exist, so you get the satisfaction of building up". So "the town's starting few buildings" is now
   a couple: two at the Village, two at each later town. Whether arrival growth stays at all, or nothing grows
   without a buy, is still open.
3. **What is the prototype's first buy?** Your first answer asked for "one car to buy", and a car now costs materials.
   Recommended: the first buy is **a house** (300 Boogles at the Village's first plot, which after his follow-up is
   the third cottage's site, staked and empty), because building a house is
   what Boogles now do and it is the part nobody has seen: the plot, the little guys building, the new door. The car
   stays in the prototype as the second thing, bought with hauled logs, because the house's riders leave a crowd and
   without the car that crowd has no answer. Alternative: keep only the car, as a materials buy, and no house; that
   tests the crowd and never spends a Boogle. Answer (owner, 11 November, to all five at once: "I like your recommendations for 1-5"): **the recommendation.**
4. **Do seats on materials stand after the model, and how far does "anything on rails" go?** You called the
   train-parts answer "a light suggestion". By hand it has a cost: with the seat buys gone the Boogle list is about
   90,000 against up to about 99,000 earned, so a room can clear the list by waiting ([section 3](#3-the-money)).
   Recommended: the model runs it both ways (seats in materials with houses priced half as much again; seats in
   Boogles as before) and the 2D page shows you both; until you have seen them, seats are materials. Also recommended,
   as this brief's reading of "on rails": it means anything that rolls (engines, cars, seats, the express's passenger
   set, more trains), so a station's fit-out (benches, a canopy, lamps) stays a town upgrade for Boogles, and train
   looks and whistles, which your 6 November call pays from the wallet, take no price of either kind until you say
   which. Answer (owner, 11 November, to all five at once: "I like your recommendations for 1-5"): **the recommendation.** **The reading of "on rails", later on 10 November:** "sounds ok". Confirmed: what rolls is
   hauled for, station fit-outs stay on Boogles, and train looks and whistles have no price until he says. The first
   half (seats on materials after the model) is still open.
5. **Who moves in?** Each house brings "new characters and a building to discover". Recommended: the roles in
   [section 6](#6-show-dont-tell) as a starting list (for the Village a retired engine driver, a baker and a
   lost-property keeper), one character and one room a house, each offering a thing to see or play with and never a
   shop or a price. They are roles only; the characters and every line are yours and your collaborators' to write.
   Answer (owner, 11 November, to all five at once: "I like your recommendations for 1-5"): **the recommendation.**

## Follow-ups (answered by the owner, 10 November)

Four places where this brief's reading of his words could have been wrong, put to him by the orchestrator. Each item
is the question as he saw it, then his reply word for word, then what it does here. Recorded in
[rewards](../decisions-rewards.md#d-2026-11-10-boogles-follow-ups-on-rails-is) and
[rail](../decisions-rail.md#d-2026-11-10-the-village-may-start-with-a).

1. **The Village's cottages.** "The Village's four cottages: they're kept as arrival buildings, with two new staked
   plots added. You may have meant two of the existing cottages to be the plots." **Reply:** "maybe only a couple
   buildings exist, so you get the satisfaction of building up. Forge should finish when the player finishes building
   it btw, and it should have an interior." **A leaning ("maybe"), not a decision.** The brief now proposes it: two
   cottages stand when the railway arrives, and the other two are staked plots the room buys
   ([section 1](#the-village-two-cottages-stand-two-are-built-proposed-after-his-follow-up)). It also answers
   [question 2](#open-after-his-answers-of-10-november) in part: a town arrives small. The forge sentence is not this
   brief's; it is recorded in the
   [rail log](../decisions-rail.md#d-2026-11-10-the-forge-finishes-when-the-player).
2. **"Anything on rails".** "'Anything on rails': read as what rolls. Station fit-outs stay on Boogles; train looks
   and whistles have no price until you say." **Reply:** "sounds ok". **Confirmed.** It settles the second half of
   [question 4](#open-after-his-answers-of-10-november); whether seats on materials stands after the model is still
   his.
3. **Loose coins.** "Loose coins: a small tray of coins at each halt is an invention to give you a coin to carry while
   keeping 'fares only' true. You may have pictured players earning their own." **Reply:** "yeah we can run with this
   for now". **Confirmed for now** ([section 5](#coins-in-the-hand-a-proposal-question-1)). Whether there is any
   personal money ([question 1](#open-after-his-answers-of-10-november)) is still his.
4. **Source upgrades and the 10%.** "Source upgrades: the brief still limits how much they can shorten the route to
   10%, which you haven't seen; your note welcomed more resource gain." **Reply:** "yeah I want clarification but this
   doesn't Seem a restriction we need explicitly". **The limit is removed as a rule.** The model still reports the
   number and he judges it; the clarification he asked for is
   [The 10% limit: what it was](#the-10-limit-what-it-was).

## Parked

- Source upgrades held to shortening the route by no more than 10%: removed as a rule (owner, 10 November: "this
  doesn't Seem a restriction we need explicitly"); the model reports the number.
- Two new staked plots beside the Village's four standing cottages: replaced by two cottages standing and two bought
  (owner's leaning, 10 November: "maybe only a couple buildings exist, so you get the satisfaction of building up").
- Personal wearables priced in Boogles: the shop stays free (owner, 10 November).
- Boogles on engine and cargo upgrades: not adopted (owner, 10 November).
- Boogles on passenger cars and seats: replaced by "Anything on rails costs materials" (owner, 10 November), as a
  leaning the model may revisit (question 4).
- A household moved into a house the route built: replaced by "Boogles build the house itself" (owner, 10 November).
- A personal purse, deposited or spent on cosmetics: not recommended (question 1).
- A third train on a line for Boogles (the first draft's 4,000): a train is on rails, so it is materials.
- A conductor little guy on the car's step who collects the coins and waves them at the window: after a yes.
- Named regulars who ride the same trip each day and remark on new seats
  ([starting-area-folk](starting-area-folk.md)).
- Tourists from the mainland by boat ([ideas](../ideas.md), "Visitors from the mainland") as a late demand boost.
- Fares by time of day once there is room-owned time ([first-evening](first-evening.md)).
- A season ticket gag: The Boogler sells one to a little guy for a ride that is free anyway.

---

## 1. The loop

Little guys live in the towns (Home's cottages, Ring Island's town, Canopy Town, Port Quay, High Gorge) and work at
the sources (the timber camp, the Quarry and the Works, later the steel works, the cloth loft). Each town sends riders
at a rate set by its **buildings**: the ones it had when the railway arrived and each house built since. They walk out
of their doors, wait at their halt, ride, and pay a fare when they step off. The fares go into the room's one wallet.

**The flywheel has two halves now, and they cross at the platform.**

- **The Boogle half:** riders pay fares; fares build a house on a plot; the house brings a character, a room to find
  and more riders; more riders pay more fares.
- **The iron half:** more riders than seats leave a crowd; the room hauls for seats (logs for benches, steel for a
  car); fuller trains pay more fares.
- **The bridge:** fares also buy source upgrades, which bring materials in sooner, and materials are what seats, cars
  and track are made of.

Before his later answers the crowd left behind prompted a Boogle buy. It no longer does: the crowd is a hauling job,
and the Boogles' own prompts are the staked plot and the empty platform. Each half is useless without the other, as
before (houses past the seats stand on the platform and earn nothing; seats past the town's riders run empty), but now
the room cannot pay its way out of a crowd, and a room that will not haul for seats has a wallet that stops growing at
the seats it has.

**The inputs:** buildings per town and its station's fit-out (riders), seats per line (cars × seats per car),
connected towns (each new place adds riders and new pairs) and distance (fares rise with it). Speed, frequency and now
seats are iron: all bought with materials. **What players do:** see which platform is crowded and which is empty,
choose whether the next Boogles go to a house or to a source, choose whether the next logs and steel go to seats or to
the route, decide when to connect the far town, and (the main thing, unchanged) haul and build, which stakes the
plots, gives the places on the train and opens the sources. **What just accrues:** the fares themselves. Nobody routes
riders, sets fares or timetables a train ("no routing or quotas").

### What a town has on arrival, and what is bought

His answer: "Boogles build the house itself; unbought plots stay empty ground". His note, a leaning and not a
decision: "Maybe these are intentional upgrades instead of naturally happening from connecting a place." The older
entries it meets are 2 November "the rail builds the world" ("towns grow from what arrives"), "trains growing the town
from cargo is the part that lands" and "towns grow, and you can see them", and 10 November "every building can be
walked into". Both ends, designed:

| | On arrival (from hauling, as today) | Bought (Boogles, on purpose) |
| --- | --- | --- |
| **What it is** | The station (its frame is hauled) and the town's first couple of buildings (his leaning, 10 November: "maybe only a couple buildings exist, so you get the satisfaction of building up"). At Home these are two of the Village's cottages, the two on the way in from the dock; a later town's first two buildings rise from what the first trains deliver | Every building after those: a house on a staked plot, or a town building (a workplace or a sight) on one |
| **How it happens** | By connecting the place and delivering to it. Nobody chooses it; it is the payoff for laying the line, seen from the hub and the train | Somebody walks to the plot, reads the sign and holds Install. Little guys build it in front of whoever is there |
| **What it gives** | The town's first riders (4 a minute each way: 2 from each of its two buildings), and doors that open in the owner's order: "The two cottages on the way in from the dock, then the other two, then a room behind the Ring Island works wall" (at the Village the "other two" are now houses the room builds, open from the day they stand) | 2 more riders a minute each way, one new character, one new room |
| **Walk-in rule** | Every one can be walked into once opened, in his order | A built house is walk-in from the day it stands. A plot is not a building: it is empty ground you can walk across, marked by four stakes, a string and a sign with the price. Nothing is ever a sealed box |
| **What caps it** | The route | The plots the route has staked in that town (two or three a stage; at the Village the first two are the other two cottages' sites) |

- **Recommended (question 2):** the table as it stands. Arrival growth stays, for the station and the starting
  buildings; everything after is a bought plot. It keeps the 2 November payoff he liked and gives his leaning the rest
  of the town.
- **His leaning taken whole:** nothing in a town grows without a buy. A town arrives as its station and whatever stood
  there before the railway, deliveries build track, stations and works only, and every other building is a Boogle buy.
  It is simpler to say and makes every building a choice. It costs the sight of a town growing because a train came,
  and it rewords the 2 November entries and DESIGN.md's "Towns grow from what arrives, and grown towns give upgrades
  that extend your reach". The cap still holds as long as plots are staked by the route and not sold.
- **Either way:** plots are placed by level design, each with a position, a facing and a still before it is built.
  Positions are per the town layout plan (`docs/plans/town-layout.md`, being written and not on main yet); this brief
  gives none.

### The Village: two cottages stand, two are built (proposed after his follow-up)

His words, 10 November: "maybe only a couple buildings exist, so you get the satisfaction of building up". A leaning.
Before it this brief kept all four cottages and added two plots on new ground; that is replaced.

- **What stands on arrival:** the two cottages on the way in from the dock. They are the first two a new player
  walks past, and they are the first pair in his own order for opening sealed buildings ("The two cottages on the way
  in from the dock, then the other two"), so the first doors a player meets are real ones. Two lit windows on the way
  in say that people live here before anything is explained. The first rework of 10 November started the prototype
  the same way, with these two lived in.
- **What is bought:** the other two cottages become the Village's first and second plots: staked, empty ground until
  the room pays, then built by the little guys. They are "the other two" of his opening order, so the order reads the
  same from the player's side: the first pair is found, the second pair is made.
- **The third plot** comes at the first branch, on new ground, as before.
- **Where:** the two cottages and the three plots are placed per the town layout plan. If that plan moves or renames
  the cottages, the rule to keep is the one above: the two a new player passes first are the two that stand.
- **Riders:** every building sends 2 riders a minute each way, whether it stood on arrival or was bought. Two
  cottages send 4, which is the arrival rate the tables already used, so no figure in [section 3](#3-the-money)
  moves: the Village still starts at 56 Boogles a minute and each house still adds 28. A place with a halt and no
  building sends nobody; riders only arrive there.
- **The buying order at the Village:** the first plot's house (300, about five minutes in); then the room hauls for
  line 2's Six fit-out, because that house's riders leave a crowd; then the second plot's house (800); then the four
  source upgrades; then the third plot at the first branch (3,000). It is the order the brief had; only the ground
  under the first two houses changed.
- **What it costs:** the live game has four cottages standing today, so production takes two of them down to stakes
  when the trade build ships (on its own `WORLD_NS` bump), and the prototype hides them behind its flag. The Village
  is five buildings when full, where the last draft made it seven. If the model finds the Boogle list short
  ([section 3](#3-the-money)), "one more plot a town" now fits his words better than it did.
- **If the leaning does not hold:** the four cottages stand and the two plots go back to new ground. The money does
  not change, because the arrival rate is 4 a minute either way.

### Building a house

- **The plot:** four corner stakes, a string, and a sign board with a drawing of the house and the price card (have
  and need). It is in sight of the platform or the lane to it, so the empty platform and the plot are read together.
- **The buy:** hold Install at the sign, as at the garage (no dialog; letting go cancels). The sign flips to "Sold".
- **The build, watched:** a gang of little guys comes down the lane with a handcart and puts the house up piece by
  piece: sill, frame, walls, roof, chimney, door. It is the game's existing construction language (1 November:
  "construction you can watch is how things get built"; the crews at the forge, the works and the Roundhouse's jib),
  about 30 seconds, and it takes nobody's camera. A friend elsewhere sees a new roof when they next look at the town.
- **Moving in:** the new character arrives on the next train with a trunk, walks to the door and goes in; a lamp comes
  on in the window. From then on little guys leave by that door for the platform.
- **In the sim:** a plot is one small integer (empty, building, built); the riders start a fixed number of ticks after
  the buy, whatever any tab has drawn.

## 2. Riders in the world

- **Where they come from and go:** homes to jobs and sights. At v26: Village cottages to the timber camp (line 1), the
  Quarry and the Works, and Far Head, where the village goes to look at the shard across the water (a free tie to Ring
  Island's religion: someone must always be looking at it). Later, every town to every town and to the sources on its
  line. They are seen leaving a door (review finding 6).
- **On the platform:** up to 12 drawn per platform, standing in a loose queue at the passenger car's stop mark, facing
  the way the train comes.
- **Stopping a train (decided, 10 November):** "Only when four or more are waiting, and never an express". A waiting
  crowd lights the request lamp at four, which is a car's worth; three wait for a train that was stopping anyway or
  for a fourth. An express runs past them as it runs past a friend's lever. The rest of the recommendation he answered
  stands as this brief's proposal: a train stops to let riders off only where riders were going (a place with a
  station house or a line's end, plus Far Head), and the model holds riders to one extra stop on an average trip.
- **Boarding:** they climb into free seats in order. **A player is never refused:** riders take seats in the sim's
  count but never in the seat claims; if a player claims a seat a rider's in, that rider hops to the car's step and
  rides standing. A full car with riders left over shows as the queue left behind.
- **Getting off:** they step down, walk to a building's door (the walk-in rule gives every place one; the folk already
  steer to door targets) and go in; a halt with no building (the Quarry, Far Head) has its own: the Works' door, the
  lookout bench at Far Head where they sit and stare a moment and then wander off along the path.
- **Budget:** riders are more instances in folk's existing four instanced draws (heads, coats, limbs, held), so draw
  calls don't change. Drawn at once, at most about 24 more: one platform's 12, two cars' 8 riders, 4 walking off. Folk
  already stop updating and drawing past 150 m (`SLEEP`), so a far train's riders cost nothing. **Simulated:** only
  integer counts. **Drawn:** whatever the counts say near the camera, placed by a local, seeded rule.

## 3. The money

Everything in this section is a proposal for the owner and a stand-in for the model (owner, 10 November, on the first
prices: "Fine as stand-ins; tune them on the 2D model page"). The stage times and the first draft's income are the
review's figures (its "Run" and finding 2); the rest is hand arithmetic on them, done again for his later answers and
not a model run.

**A fare** is paid when the rider steps off: 2 Boogles to board plus 1 for every 100 m ridden. Village to Far Head is
7; Home to Ring Island (about 1.2 km) 14; Home to Canopy Town (2.9 km) 31. The first draft doubled fares at a junction
station; the review's call 15 replaces that with a flat 5 on arriving at one, and the model picks.

**Riders.** Every building in a town sends 2 riders a minute each way. A town arrives with a couple of buildings
(the Village: two cottages), so it arrives sending 4 a minute each way. Each house built on a plot adds 2 a minute
each way, and each rider pays on stepping off, out and back. At the Village's 7 a trip the town starts
at 56 Boogles a minute and a house adds 28. A fitted-out station raises its town's riders by a quarter, twice at most.
Income is the lesser of what the riders would pay and what the seats can carry: line 2's two trains with one Four car
each carry about 4.8 riders a minute each way, 67 Boogles a minute at the Village.

### What Boogles buy

Each thing is bought where it changes, with the garage's Install and hold, from something waiting in the world (9
November): a sign on a staked plot, crates on the platform, a part by the loader. Prices are fixed. A price in the
tables is the first step's; "min" is the minutes of income it costs at the moment it is first offered, counted from an
empty box. The Boogle prices are the ones he saw and called fine as stand-ins; only the names of the town rows changed
with his answer.

**Town upgrades (they make riders).**

| What you buy | What it does in play | How many | First price (Boogles) |
| --- | --- | --- | --- |
| A house built on a staked plot | Little guys build it while you watch; a new character moves in and there is a new room to walk into; 2 more riders a minute each way from that town. Before the buy the plot is empty ground with stakes and a sign | Up to the town's plots. Home: two plots at the Village at v26 (the sites of its third and fourth cottages; the two cottages on the way in from the dock stand on arrival), a third at the first branch. Each later town has two or three plots | The Village's first plot 300 (5 min), its second 800 (9 min), its third 3,000; Ring Island 1,300 then 2,100; Canopy Town 2,500, 4,000, 6,400; Port Quay 3,500, 5,600; High Gorge 5,000, 8,000. Each next house in a town costs 1.6 times the last |
| A town building built on a plot (a workplace or a sight) | Riders get a place to go: 1 more rider a minute each way to that halt, and up to four little guys are seen inside (review call 21). It is built and walked into like a house | One or two a place, the first at Ring Island. The room behind Ring Island's works wall is not one of these: it is third in the owner's opening order and is opened, not bought | 1,600 at Ring Island; later ones 8 to 12 min |
| A station fitted out (benches, a canopy, lamps, a clock) | That town's riders rise by a quarter; the platform reads as a station. The second fit-out adds another quarter. Kept on Boogles by the reading of "on rails" as what rolls (owner, 10 November: "sounds ok") | Two steps, only at a place with a station house ([junction-stations](junction-stations.md): the tier is earned by what the place is, not bought) | Home's hall 1,800; Ring Island's Lookers' waiting room 2,400; Canopy Town 3,500; Port Quay 5,000; High Gorge 7,000 |

**Source upgrades (they change a rate; the room still hauls).**

| What you buy | What it does in play | How many | First price (Boogles) |
| --- | --- | --- | --- |
| Faster regrowth at a hand-worked source (the timber camp's grove, the Quarry's rocks; later the cloth loft's crop) | Trees and rocks come back in 24 minutes instead of 31, then 18. More to chop, and every piece is still chopped and carried | Two steps a source | Camp 1,100 (10 min); Quarry 1,100; cloth loft 2,800 |
| A bigger rack at a source (the forge's and the depot's racks, 24 today; later the steel works', the cloth loft's and the copper source's) | The source's own stack holds half as much again, then twice. It stops less often with a full rack, and the next join finds more waiting (the away credit is "never past the yard") | Two steps a source | Forge rack 900; steel works 1,500; cloth loft 2,400; copper source 4,000 |
| A faster loader arm at a source (decided: "Boogles (a source upgrade)") | The loader fills the matching car in less of the stop. It never loads more than the car holds | Two steps a loader. The loader itself comes free with its resource | The Works' footing loader 1,300; steel works 2,200; cloth loft 3,200; a ring source 5,500 |

### What is hauled for now: seats

"Anything on rails costs materials, including the passenger train and seats" (owner, 10 November; a leaning by his
note, question 4). These three left the Boogle list and are train parts like a boiler: the materials wait as a stack
in the Roundhouse bay and an install spends them (10 November, yards). The material prices are new stand-ins from this
rework, sized beside [engine-garage](engine-garage.md)'s (a boiler 6 to 10 steel, a cradle 4) and today's bills (24 to
40 logs); the model sets them.

| What you haul for | What it does in play | How many | Stand-in price (materials) | Was (Boogles) |
| --- | --- | --- | --- | --- |
| The Six fit-out on a line's passenger cars | Four seats a car become six. Needs no place on the train, so it is the first seats step on today's three-car trains (review finding 8) | Once a line | Line 2: 24 logs; line 1: 16 logs; a branch line: 24 logs and 6 fibre | 600; 500; 3,000 |
| A second passenger car on a line | Twice the seats. It takes one of the places the boiler gives; a cargo car can take the same place instead, so the choice is what the room's steel becomes | One a line while the cap is four cars | Line 2: 6 steel and 24 logs, once the longer boiler gives the place; the ring: 10 steel and 8 fibre | 2,000; 6,000 |
| The express's passenger set | Decided for later ("later a passenger set the room buys"). Riders use it between junction stations when no player has called it (review ruling 8) | One | 12 steel, 8 fibre and 4 copper, at High Port | 6,000 |

**Checks on the source list.**

- **"materials and Boogles never convert".** No Boogle becomes a log. Regrowth is the source's own trees and rocks,
  sooner. A bigger rack only stops a source wasting what it already makes. A loader arm moves pieces the source made
  onto a car the room paid for in materials. Nothing is delivered, credited to a bill or sold. The away credit's
  horizon (H = 2 h) does not change; a bigger rack raises only the "never past the yard" limit, by at most twice.
- **Source upgrades do bring materials in sooner, and that is their point** (his note: "would theoretically increase
  resource gain in the system so it's a good candidate fro upgrades"). What they cannot raise is what a train carries
  a trip, which is cars, cradles and the boiler, all materials. The model reports how much shorter the route gets
  (section 8). There is no limit on that number: this brief's 10% is removed as a rule (owner, 10 November: "yeah I
  want clarification but this doesn't Seem a restriction we need explicitly"). What it was is
  [below](#the-10-limit-what-it-was).
- **The works' own stages** (the model's producer levels, each a hauled build) stay hauled. A Boogle step is never the
  same thing as a level, so no upgrade has two prices.
- **Yards at halts** ([station-deposit](station-deposit.md), answered 10 November) are not sources and get no Boogle
  upgrade. A halt's yard holds only what a player left there ("A yard at each halt: take it where it lies; trains
  later carry it to where their line needs it"), and it cannot be made bigger because it never fills ("No: past 24 of
  a kind it grows in strapped bundles of 8"). The "bigger rack" here is a source's own output rack. Steel for upgrades
  still waits "As a visible stack in the Roundhouse bay, spent by an install"; Boogles never touch that stack.
- **Loader upgrades changed currency.** [engine-garage](engine-garage.md) listed "Loader upgrades (faster jib,
  gantry)" as a placeholder priced in steel. His answer puts the faster arm on Boogles, and that row is marked there.

### The 10% limit: what it was

A note in plain words for the owner, who asked for clarification.

- **What it was.** Source upgrades are the one thing Boogles buy that touches materials: trees and rocks come back
  sooner, a rack holds more, a loader swings faster. Fares arrive whether or not anyone is hauling. So a room could
  let fares pile up, buy every source upgrade first and get its materials faster than the game was sized for.
- **What it was protecting.** Two things: the roughly six hours (6 November), which this brief did not want a side
  loop to shorten by accident; and hauling as the way the railway gets built, so that waiting for coins could not
  stand in for carrying.
- **How it worked.** It was a tripwire in the 2D model, not something a player would ever meet. If the room that
  buys source upgrades first finished the route more than a tenth sooner (about half an hour of the six), the source
  steps were to be made weaker. This brief set it; he had not seen it, and his note welcomed more resource gain.
- **What replaces it.** Nothing limits it now. The model still plays that room, and the 2D page shows the result as
  one plain figure: a room that buys source upgrades first finishes the route in so many hours, against so many for
  a room that never spends a Boogle. He looks at it and decides whether that is the good kind of faster.
- **What still holds without it.** These describe what the upgrades are, and are not a limit on their effect: two
  steps a source; never more than the cars carry; the room still chops, carries and hauls every piece; and no Boogle
  ever becomes a material.

### How the wheel closes, stage by stage

| Stage (solo hours) | Minutes | Boogles a minute: on arrival → with every house built and seats to carry them | Earned at most, by a room whose seats keep up | Boogle prices on offer | Was, with seats | The strongbox holds |
| --- | --- | --- | --- | --- | --- | --- |
| v26 today (0.6–1.8) | 76 | 56 → about 110 | about 7,200 | 5,500 (6 things) | 6,600 (8) | about 2,100 |
| Ring Island (1.8–2.5) | 40 | 150 → about 220 | about 7,400 | 12,900 (7 things) | 14,900 (8) | about 3,700 |
| First branch (2.5–3.9) | 84 | 230 → about 330 | about 23,500 | 27,800 (8 things) | 30,800 (9) | about 9,600 |
| High Port (3.9–4.7) | 48 | 330 → about 420 | about 18,000 | 18,100 (4 things) | 24,100 (5) | about 8,400 |
| Ring closed (4.7–6) | 78 | 450 → about 650 | about 43,000 | 25,500 (4 things), then the Boogle-priced goals | 31,500 (5) | about 12,000 |
| **Whole route** | 326 | | about 99,000 | about 89,800 (29 things) | about 108,000 (35) | |

The v26 walk-through, solo: the Village's two cottages pay 56 a minute. The first plot's house (300) comes in five minutes
and its riders overfill the trains, so income stops at the seats' 67 and a crowd is left. The crowd is now a hauling
job: 24 logs to the Roundhouse bay and an install for line 2's Six fit-out, which lifts the seats to 100 and clears
it, so income is the riders' 84. The second plot's house (800, nine and a half minutes) fills the seats again at 100.
From there the room earns about 105 a minute with line 1 and has four source upgrades to choose between, at 9 to 12
minutes each (4,400 in all, about 42 minutes): the grove, the Quarry's rocks, the forge rack and the Works' loader
arm. A room that never hauls for the benches stays at about 72 a minute; its second house only lengthens the queue,
and the four source upgrades take it about an hour.

**Income against prices, checked again by hand (not a model run).** Taking seats off the Boogle list removes 18,100 of
prices (the Six fit-outs 600, 500 and 3,000; the second cars 2,000 and 6,000; the express's set 6,000), six of the 35
things.

- **Before:** about 108,000 of Boogle prices against about 99,000 earned, so a room never cleared the list by waiting.
- **Now:** about 89,800 against at most about 99,000. That 99,000 is a ceiling: it assumes the room hauls for every
  seat as soon as a crowd appears. A room whose seats lag earns less, because income stops at the seats it has; a room
  that never adds a seat earns under about 81,000 (each stage's arrival rate for its minutes, and those rates
  themselves assume the earlier stages' seats, so the true figure is lower).
- **So the check that held no longer holds for a room that hauls well.** It clears v26's list about a quarter of an
  hour before Ring Island and carries a full box; at High Port there are four things for 48 minutes; after the ring
  closes, 25,500 of prices meet 43,000 of income before the goals.
- **Three ways to close it, for the model to pick between.** (1) A house costs half as much again as the household it
  replaces (the Village's 450 and 1,200, and so on): it is a whole building with a character now, and the list comes
  to about 111,000. (2) Each town gets one more plot. (3) Fares come down. Recommended as the model's starting point:
  (1), which keeps a house at 8 to 22 minutes of income. The tables above keep the prices he saw; the model applies
  the change. After his follow-up ("maybe only a couple buildings exist, so you get the satisfaction of building up")
  the model also tries (2), since a town that arrives small has room for one more plot.
- **What got better:** steel, fibre and copper have another use (the review's finding 1 feared the later materials
  would have only track), and seats or cargo is now one choice in one currency.
- **What got worse:** the seat buy that answered a crowd in minutes is now a hauling job that competes with the route,
  so crowds stand longer; and the wallet has no part in the train at all, which is what he asked for and may read as
  two games side by side. Question 4 asks him once the model has run it both ways.

**Where it is capped.** The review found income running far ahead of prices (about 8,100 earned before Ring Island
against 550 of things to buy, about 100,000 by six hours) and income that never stops. Both stay fixed by rule, not by
tuning:

1. **Riders are capped by buildings, buildings by plots, and plots by the route.** A town can hold only the houses the
   route has staked plots for, and a station only two fit-outs. So each stage's income has a fixed top (the table's
   second figure) that neither time nor Boogles can pass. To earn more the room has to connect the next place.
2. **Seats are capped by iron, all of it now.** A passenger car takes a place on the train, places are bought with
   steel, and the seats themselves are hauled for.
3. **No compounding on the balance.** No interest, no price that scales with the wallet, a fixed fare.
4. **The strongbox has a size** (decided, 10 November: "Strongbox: the larger of 20 minutes of income or 1.5 times the
   dearest thing on offer"). Fares past a full box do not land. So the most a room can carry into the next stage is
   one box, where the first draft carried 7,500 into Ring Island against 1,100 of new prices; and a tab left open all
   night earns one box.
5. **The coin sack holds 15 minutes** of the income at leaving (decided: "Sack: 15 minutes of income"), and nothing
   runs while the room is empty.
6. **Prices are 8 to 15 minutes of income** at the moment a thing is offered (a town's last house runs to about 20),
   each next step of the same thing 1.6 times the last. Across the route more should be on offer than is earned; after
   his later answers that is no longer true by hand (above), and the model restores it. Things left unbought stay on
   offer and get cheap, which is the catch-up.
7. **Source upgrades are two steps a source and never raise what the cars carry.** How much they shorten the route is
   not capped (owner, 10 November); the model reports it.

Two more things the model must check: a Boogle buy about every ten minutes may be too many beside the building
([incremental-game-maths](../research/incremental-game-maths.md) gives 12 to 20 minutes between smaller gains), which
the dearer houses of fix (1) also help; and the end-game goals need sizing against 650 a minute.

**Boogles beside resources** (reworked for the owner's later answers of 10 November):

| What it is | How it is paid for |
| --- | --- |
| Building the world: track, bents, footings, station frames, the forge's and works' stages, interchanges | Hauled materials, as now. No route step has a Boogle price |
| What the route hands you: every gate and ability, each resource's free first car and first loader, the first passenger car, the first steel fit (the part itself) | Free or the part itself, as decided. Never a price of either kind |
| Engine upgrades: boilers (speed and the car cap), the plough | **Materials only**, from the stack in the Roundhouse bay |
| Cargo upgrades: cargo cars past the free first, cradles | **Materials only** |
| Passenger cars past the first, the Six fit-out, the express's passenger set, more trains on a line | **Materials only** ("Anything on rails costs materials, including the passenger train and seats"; a leaning by his note, question 4) |
| A town's station and its first couple of buildings | Hauled: they rise on arrival from what is delivered (question 2) |
| Houses and town buildings on plots; station fit-outs | **Boogles only** (fit-outs by the reading he confirmed, 10 November: "sounds ok") |
| Source upgrades: faster regrowth, a bigger source rack, a faster loader arm | **Boogles only** |
| Train looks and whistles | No price of either kind until he says (confirmed, 10 November: "sounds ok"): they are on rails by his sentence and paid from the wallet by his 6 November call |
| The end-game goals | One price each, below |
| Wearables at Fine Prices | Free: the shop stays free (owner, 10 November) |
| Logs, stone, rails, footings, steel and every other material | Never bought and never sold: "Fares only; materials and Boogles never convert" |

No upgrade has two prices. The one rule kept from the first draft holds without a caveat: nothing the main route needs
is priced in something that can run out. No step of the route has a Boogle price at all, so a room that never spends a
Boogle finishes the game on materials alone.

**The end-game goals** in the model (`GOALS`, G1 to G8) each carry a Bucks price, and six of them a material bill as
well. One price each: the Grand Station at Home and the Ring lighthouse are town buildings (Boogles); the auto-placing
cranes, the works' level 5, the crystal garden and the deep-sea spokes are cargo, works and track (materials); the
express engine collection is on rails, so it is materials or a look (question 4); "A hat for each friend" goes,
because the shop is free. The Boogle-priced ones are about 60,000 today, an hour and a half at 650 a minute, so the
model raises them or adds town goals until they take a few hours.

## 4. Sinks

What Boogles buy is in section 3: houses and town buildings, station fit-outs, source upgrades. **What stops
inflation:** the seven caps there. Prices are fixed and never scale with the wallet (Fine Prices' climbing tag stays a
joke on its own sign); each next step costs 1.6 times the last; income is capped by buildings and seats, never
compounding on the balance; the strongbox has a size. With seats gone from the list the late game is short of sinks
(section 3), and town goals are the natural late one: a bigger thing to build with the little guys' construction, in a
town the room already knows. **Nothing personal is a sink** (question 1): no player has a balance, the pause wardrobe
and Fine Prices stay free (every item is free, with absurd tags from $8 million to $3 billion and "TODAY: $0",
`src/render/cosmetic-parts.ts` `STOCK`; owner, 10 November: "The shop stays free"), and secret-crate finds stay
personal and free.

## 5. Away and co-op

- **Paused world:** nothing runs while the room is empty (the 6 November rule). The till at Home is a producer with a
  yard: the next join credits it the rate it was earning × H × (1 − e^(−away/H)), H = 2 h, never past the sack's size
  (15 minutes of that rate, decided 10 November), computed in the sim like every other producer's credit
  (`railAwayCredit`). The credit waits as a coin sack on the ticket counter; one press from anyone pours it into the
  strongbox, and everyone in the room sees it (the shared-moment system).
- **One wallet:** anyone spends, everyone sees. Buying is the garage's Install with its hold (no dialog), at the place
  the thing changes, never from a menu (9 November). **Griefing:** everything bought stays bought and nothing bought
  takes anything away; the strongbox's paper tape lists each purchase with the buyer's name ("Mo: the Village's first
  plot, 300"), with no undo or blame UI. A wrong buy costs only time.
- **Co-op:** buys are spread over the map (a plot, a grove, a station two islands away), so friends can split up to
  make them, and the price card's have-and-need is what stops two of them spending the same Boogles: the second press
  is refused with the balance shown. A house going up is a thing to stand and watch together.

### Coins in the hand (a proposal; question 1)

**The tray of loose coins is confirmed for now** (owner, 10 November, told that it is this brief's invention to give a
player a coin to carry while keeping "fares only" true, and that he may have pictured players earning their own:
"yeah we can run with this for now"). Whether there is any personal money is still question 1.

His question, not a decision: "what the separation should be between personal money and not? should depositing your
own money to help with communal upgrades be the way it's incentivized to be merged? Maybe money doesn't buy anything
for individuals, it can just be pooled into the shared deposit, and otherwise it's used comedically". The option he
sketches, designed as the recommendation:

- **There is no personal balance.** No number belongs to a player, in the sim, in a save or on a screen. Nothing in
  the game is sold to one player.
- **Fares land in the strongbox by themselves** (decided: fares only, and no collecting). The ticket window is where
  the room's money is.
- **A coin in a hand is a thing, not a balance.** It uses the one thing a player holds. It comes from one of two
  places, and both are fares, so "Fares only" stands: each halt's fare box keeps up to five of its latest coins loose
  in a tray, and now and then a little guy stepping off beside a player holds his coin out instead of dropping it in.
- **Carried to the ticket window and dropped in the slot, it counts.** That is the hands-on way in, like hauling: a
  clink, the column rises by one, the counter flips.
- **Carrying it is never worth more.** The next train sweeps whatever is left in a halt's tray to Home, so a coin left
  alone arrives anyway. There is no reason to hoover up coins, nothing to deposit "for the room" that the room would
  not get, and so nothing to incentivise. The review's "Not recommended: collecting fares by hand" still holds.
- **Otherwise it is for comedy,** with no economy behind it:
  - flip it: The Boogler's face or the little engine, to settle who carries the boiler;
  - lay it on the rail and let the train flatten it into a long thin keepsake;
  - toss it at the station bell, into the harbour or onto a friend's head;
  - hand it to a little guy, who inspects it, bites it and gives it back or walks it to the fare box himself;
  - set it rolling on its edge down the lane, with little guys after it;
  - the coin sack: it sags and jingles when bumped, and tipped into the box it goes in as a long noisy pour that
    everyone sees (the decided one press, staged).
- **What a lost coin costs:** one Boogle. A coin in the harbour or flattened on the rail is that fare, gone. With five
  to a tray a train, the most a room can throw away is a few Boogles a minute, and it is funny every time.
- **Against the standing calls:** "Shared progression and one shared wallet" (6 November: "let's make progression
  completely shared"; one wallet anyone may spend, at a place where others see it) is kept exactly, and this is its
  plainest form. "The shop stays free" is kept: there is still nothing personal to buy. The 6 November "certain
  cosmetics and secret crates can be personal" is untouched: those are finds, not purchases.
- **Alternatives, and why not:**
  - **A personal purse that can be deposited.** Each player earns coins of their own and may pour them into the box.
    It needs a second balance, saved for every player; a friend who joins late arrives with nothing; and since nothing
    personal is sold, the purse is only a slower road to the same box, so depositing is the one thing to do with it
    and no choice at all.
  - **A personal purse that buys cosmetics.** It gives the purse a use, and undoes "The shop stays free" and Fine
    Prices' $0 joke; it is also the personal coin ("som") the 6 November amendment retired.
- **Cost to build:** a tray count for each halt in the sim, a pick-up and a drop as ops, and the coin as a held thing.
  None of it is in the first prototype.

## 6. Show, don't tell

- **The wallet:** Home's concourse hall (layout B) gets a ticket window on its north end wall (decided, 10 November:
  "A ticket window on the station hall's north end wall"; review finding 5): behind glass, a brass strongbox with a
  tall coin column that fills to a mark, and a split-flap counter above it reading the Boogles (the halt signs'
  split-flap face). The pause screen may show the same number read-only, as it may show upgrades.
- **A fare paid:** at the halt, each alighting rider drops a coin in the fare box on the lever post (a clink, local);
  at Home, when fares land, coins tumble into the column and the counter flutters. Far from Home you only hear your
  own halt's clinks; the counter is there when you get back.
- **A plot:** stakes, string and a sign, empty ground you can walk over. **A house bought:** the sign flips, the
  little guys build it piece by piece, the new character arrives by the next train, a lamp comes on in the window.
  From then on that door opens onto a lived-in room ([section 1](#building-a-house)).
- **A source upgrade** shows as the thing itself: saplings staked in the grove, a second bay on the rack, a longer arm
  on the loader.
- **Seats** show as the thing itself too, and are fitted like any train part: the benches or the car go on at the
  Roundhouse and reach the trains at their next Home stop.
- **The coin:** a Boogle is a fat brass coin with a hole through the middle, like a railway token: on one side The
  Boogler's profile, smug, on the other a little engine. "A Boogle", "Boogles", "300 Boogles"; no symbol. It replaces
  the money brief's "Bucks" banknote.
- **The Boogler** needs no new copy to own it: his face is on the coin (owner, 10 November: "Yes, his face; I'll
  decide his line later"). No line is drafted for him here; his line is the owner's to write. Drafts for the owner for
  other characters, not for agents to ship: the teller at the window, "Every one's got his face on. He insisted."; a
  rider, "Seven Boogles to look at a rock. Worth it." **Existing lines to check once fares are real** (not edited; the
  review's list is longer): The Boogler's "Rides cost money. You do not have money." (`src/boogler/lines.ts:938`).
  With the shop staying free, Nell's saving lines and the shop's "TODAY: $0" and "Take it: $0" stay true as written.

### Who moves in (roles proposed; question 5)

One house, one character, one room. These are roles and what each offers, proposed for the owner and his
collaborators, who write the characters; there are no names and no lines here, and nothing for The Boogler. Each offer
is a thing to see or play with. None is a shop, a price or a way to earn.

| Plot | Who moves in | The building | What it offers |
| --- | --- | --- | --- |
| The Village, first plot | A retired engine driver | A cottage whose front room is filled by a model railway | The model shows the room's own lines as built so far and gains a piece when the route does: a map you walk round, and a reason to come back |
| The Village, second plot | A baker | A bakery with a hatch onto the lane | A loaf to carry off: a prop to share, throw or feed to a friend, with no effect. Little guys queue at the hatch on their way to the platform |
| The Village, third plot (first branch) | A lost-property keeper | A shed of shelves beside the lane to the station | Where lost things turn up: the coin thrown in the harbour, barnacled; the one flattened on the rail; whatever a player dropped somewhere silly |
| Ring Island, first plot | A family of Lookers | A house with a seat on its roof, facing the shard | A seat and a spyglass on the shard, which keeps "someone must always be looking at it" true while the room is elsewhere |
| Ring Island, second plot | A hand from the works | A narrow house by the works wall | Riders for the works' shift, and a room of odd things brought home from the job to look at |
| Canopy Town | A kite maker; a rope walker; a carpenter | Houses in the trees | Kites to fly from the walkways; a rope to balance on; a half-built thing that is further along each visit |
| Port Quay | A diver; a fishmonger | A house on the quay; a stall with a room behind | Things brought up from the sea bed to look at; the day's oddest catch on a slab |
| High Gorge | An echo keeper; a bridge painter | A house on the lip of the gorge; a hut hung under the bridge | A place to shout and be answered; a cradle to ride along the bridge's side |

The first three are the ones the prototype and the first production build would need; the rest show the kind. After
his follow-up the Village's first and second plots are the sites of its third and fourth cottages, so the engine
driver's and the baker's buildings stand where those cottages do today. A town
building (a workplace or a sight) follows the same rule with a place in the role's stead: a lookout, a workshop, a
bandstand.

## 7. Why buy more passenger capacity

Passenger capacity is hauled for now, not bought with Boogles; the heading is kept for the links to it.

- **Because a crowd is left.** Seats are worth hauling for only where a train leaves riders behind, and the seat part
  is offered for a line only once that has happened there, so a room can't build seats nobody needs.
- **Seats or cargo:** the engine pulls only so many cars (the boiler sets the cap: 3 today, 4 with the longer boiler).
  The first cargo car of each resource is free and stays, so the choice is about the extra place: a passenger car
  earns fares, a cargo car moves material faster. Both are now bought with materials, so it is one choice about what
  the room's steel becomes on that line, and it is real only once the route leaves a place free (review finding 8).
- **Town or seats:** each is useless without the other. Seats past the town's riders run empty, and houses past the
  seats stand on the platform. Reading which one is short is the play, and the two answers now come from different
  places: the strongbox for a house, the yard for seats.
- **Far towns pay:** fares rise with distance, so a seat on line 2 (Home to the ring) earns about three times one on
  line 1 (Village to Camp). Cars are bought per line, so the long line gets them first: "lines should be plenty long
  where it's worth the upgrade".
- **Junctions:** riders change lines at a junction station on foot, walking between platforms as players do, which
  opens pairs across lines that one line can't reach.
- **The express and interchanges** are the [express-train](express-train.md) brief's: the express is the next service
  train called for players, free, and an interchange is track, bought at a junction for steel and rails. Its later
  passenger set is decided as something the room buys; it is on rails, so by his later answer it is bought with
  materials, and riders use it when players don't (review ruling 8). Riders never call the express, and an express
  never stops for them (decided).

## 8. Systems

- **New in the sim** (`src/sim`, the railway state): the wallet (an integer) and its size; per halt, its waiting count
  and a demand accumulator (integers, filled each tick by the town's rate in thousandths of a rider, from its
  buildings and fit-out step); per train, riders aboard as two integers per destination halt (a count, and the sum of
  their boarding `s` in cm), so the fare is `count × s_dest − sum` without storing each rider; per town, each plot's
  state (empty, building, built) and its fit-out step; per source, its Boogle steps. A standing train lets riders off
  and on in the sim's existing stop step. The request lamp reads the waiting count (four or more) and ignores it for
  an express. Destinations are split at boarding by fixed weights in a fixed order. All integers, no randomness beyond
  `mulberry32`, no trigonometry (`docs/agents/lockstep.md`).
- **New op:** `trade.buy(item)`, validated by the server (enough Boogles, the item is offered, the room isn't
  mid-install); an additive registration through `registerOp`. Seats and passenger cars are not bought with it: they
  are installs paid from the material stack, the garage's own path.
- **Why lockstep, not a counter:** riders can't be a pure function of tick, because when trains stop depends on levers
  and players. The cheapest state that can't desync is these few integers, inside the train sim that already decides
  every stop. It never reads seat claims (host state).
- **Mixed builds and `WORLD_NS`:** dev phase, no old builds supported. The new state changes the railway snapshot's
  shape, so the production build needs a bump: its own, when it is ready (owner, 10 November: "Nothing should wait on
  a world bump"), held only while the owner is mid-session, and built after the ECS migration. The `?proto=trade` step
  needs no save and no bump: the lead tab runs the same rules as Host-kind state (`addHostField`), and a buy is a
  message to it.
- **The economy model first:** `ring-data.ts` gets a `TRADE` block (seats per car, the fare rule, riders per town on
  arrival and per house, plots by town and stage, fit-out steps, the strongbox and sack sizes, the two Boogle buy
  lists of section 3 with their prices, and the seat parts with their material bills) and `ring-sim.ts` computes fares
  per step beside `freightRate`, with fares replacing surplus sales as the wallet's source (`PRICES` and `sold` go)
  and `bucks` renamed `boogles`. Engine, cargo and passenger parts keep or get material bills and no Boogle price.
  Each goal in `GOALS` keeps one price. The report shows three rooms and one comparison:
  - **One that never spends a Boogle and never adds a seat.** It must finish in about six hours on materials alone.
    This is today's model with the wallet ignored, so it is a check that nothing on the route gained a Boogle price.
  - **One that builds houses and hauls for seats as crowds appear.** It shows the income curve, the minutes waited for
    each buy, how long the box stands full, and the hauling its seats added. Seats are optional, so the route's own
    hours must not move. The extra hauling for seats is reported as a number with no pass mark: the 5% bound is
    removed (owner, 10 November, "yes to all" to dropping it as the 10% one was); he judges the figure. Before, the
    bound was 5% of the route's hours.
  - **One that spends on source upgrades first.** How much shorter the route gets, reported as a number with no pass
    mark: the 10% bound is removed (owner, 10 November: "this doesn't Seem a restriction we need explicitly";
    [what it was](#the-10-limit-what-it-was)). He judges the figure on the 2D page.
  - **Seats both ways** (question 4): the second room again with seats priced in Boogles as before his later answer,
    so he can compare the two curves and the two feelings on the 2D page.

  It also shows, for every room: Boogles earned against prices on offer at each stage (the check that failed by hand
  in section 3), at least two moments where two things are on offer that the room cannot both afford, Boogle buys an
  hour, what a night with the tab open earns (one box), the end-game goals still taking a few hours, solo and three
  players within the existing 15%, and what steel, fibre and copper the seats take. The playable
  [economy prototype](../economy/economy-prototype.html) (`play-sim.ts`) gets riders, towns with plots, a till with
  its mark, a house to build, a source upgrade and seats to haul for, so the owner can feel the wheel in 2D first.

- **Review:** an independent pre-merge review of the sim and op change (owner-calls' review route).

## 9. Risks

- **An idle game in a hands-on builder:** held. Fares arrive without anyone doing anything, but they buy no iron and
  no step of the route, the box fills and stops, and each stage's income has a top only building can raise. What is
  left is a second loop a player may ignore, and one who ignores it loses nothing the route needs.
- **A Boogle list too short for its income:** new with his later answers. By hand about 89,800 of prices meet up to
  about 99,000 of income. The model closes it (dearer houses first) or question 4 puts seats back.
- **Two games side by side:** the wallet now touches nothing on the train. The crowd on the platform is the one thing
  that ties them, and it is on the way to every train; the house's new character arriving by train is the other tie.
- **The six hours:** houses move no freight. Seats are hauled for, which adds optional hauling beside the route (reported, not
  bounded: the 5% bound is removed, owner, 10 November). Source upgrades shorten waits at a source; by how much is reported, not bounded (owner, 10
  November).
- **Hauling made pointless, or trade made pointless:** neither currency buys the other's things.
- **Too many small buys:** about one every ten minutes on the stand-in prices, each at a place you walk or ride to.
  With friends that is things to split up for; solo it may be a chore. The model reports buys an hour.
- **A second progress bar nobody reads:** no HUD number; the readout is the queue, the column and the counter, and a
  buy's effect shows as a new roof, a new face and a busier platform.
- **Crowds and building sites on a phone:** a hard cap on drawn riders (about 24 more), instances only, culled at 150
  m; a house going up is a few more draws for half a minute at one town; measured in the first build's phone still, at
  Far Head and the Village on purpose (review ruling 4).
- **Trains stopping more:** decided: riders ask only at four or more, and never an express. The model still holds
  riders to one extra stop on an average trip.
- **Coins as a chore or a grief:** only if carrying one pays, or losing one costs much. The proposal makes carrying
  worth nothing extra and a lost coin worth one Boogle (section 5).

## 10. The smallest first build

**Step 0, model and 2D (about a day; first, as the owner answered) [done 11 November for the model and its page; the playable prototype's riders, till and house are still to do]:** fares, seats, towns with plots, the strongbox's
size, the two Boogle buy lists and the seat parts in the economy model, with the rooms and checks of section 8; then
the playable economy prototype gets riders, a till, a house to build, a source upgrade and seats to haul for. The
owner can play the wheel in 2D, see whether the wallet is ever tight, and tune the first prices there, as he asked.

**Step 1, `?proto=trade` on v26** (two lines from Home; the Village; the Quarry, Far Head, the Pier):

- **The Village starts with two cottages** (his leaning, 10 November): the two on the way in from the dock stand; the
  prototype hides the other two behind its flag and stakes their ground as the first and second plots. Positions per
  the town layout plan.
- Riders only between the **Village and Far Head** on line 2. The Village's two cottages send 4 riders a minute each way,
  so line 2's two trains (one Four car each) just keep up, at 56 Boogles a minute.
- Fares (7 Boogles a trip) land in a **till at Home's hall**, on the north end wall: a placeholder strongbox with a
  coin column, its mark and a split-flap counter; the away sack is not in this step.
- **The first buy is a house** (recommended; question 3): the Village's first plot, the third cottage's site, 300
  Boogles, about five minutes in. Stakes and a sign on the empty ground; hold Install at the sign; the little guys
  build it; its door opens onto a plain room. The town layout plan places the plot, so whether it is in sight of the
  platform is that plan's to show; it needs a still before it is built, and so does the second.
- **The car, hauled for** (the owner's "one car to buy", now a materials buy): line 2's second passenger car, a second
  Four, for 24 logs stacked in the Roundhouse bay and the garage's hold. It is offered once a train has left riders
  behind, which the first house causes. The prototype's line 2 trains run four cars for it, which today's cap does not
  allow (review finding 8); production's first seats step is the Six fit-out.
- **A second house** (800, on the fourth cottage's site), which goes one step past his words and is this brief's proposal: it shows the wheel
  turning a second time. Expected: 56 → 67 with a crowd left (the first house) → 84 with none (the car) → 112 (the
  second house).
- **The character in the house** is a placeholder little guy with no lines; who moves in is question 5 and the writing
  is not an agent's.
- No source upgrade and no loose coins in this step: neither has anything to show in a ten-minute look. The model and
  the 2D page carry the source upgrades.
- Host-kind on the lead tab, unsaved, no `WORLD_NS`, no op; the rest of the game unchanged. Held with every other
  build behind the ECS migration.

## Model results (11 November)

The model is [`dev/economy/trade-model.ts`](../../dev/economy/trade-model.ts) with every number a named tunable in
[`trade-data.ts`](../../dev/economy/trade-data.ts); its page is [trade-economy.html](../world/trade-economy.html), where
each tunable can be changed and the four rooms play again. It plays the route one minute at a time on the ring model's
own 17 steps and minutes (`ring-sim.ts`, so a room that never spends finishes in exactly 6.00 h solo, 5.35 h with
three), with the brief's stand-ins as written. **Where it differs from section 8's plan:** a separate trade model that
reads the ring model's route, not a `TRADE` block in `ring-data.ts` and a change to `ring-sim.ts` (`PRICES`, `sold` and
`bucks` are untouched); the playable prototype (`play-sim.ts`) is not changed yet. **Stand-ins that are mine, not the
brief's:** each town's ride length (Village 0.5 km, Ring 1.2, Canopy 2.9 as the brief, Port 3.8 and Gorge 5.4 from the
ring model's step distances), the trains' round trip (1 + 1.3 min a km, which gives line 2 the brief's 4.8 riders a
minute), the seat bills of the later towns, a minute to haul each material (0.14 a log, 0.30 steel, 0.35 fibre, 0.50
copper), what one source step takes off (4%, 2% and 3% of the labour and waiting still to come), the express set's
effect (+8 seats at Port Quay) and 24 riders as the most a platform holds before the rest give up. The flat 5 on
arriving at a junction is not modelled. All figures are one seed, solo, desktop arithmetic; the 5% and 10% bounds are
reported and not enforced.

| Room, solo | Route | Against 6.00 h | Boogles earned, spent, capped (to the route's end) | Houses and town buildings | Extra hauling for seats | Cut by source upgrades | Crowd of four or more | Box full |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A. Never spends, no seat | 6.00 h | 0 | 11,250, 0, 72,372 | 0 | 0 | 0 | 76% | 76% |
| B. Houses, hauls for seats | 6.98 h | +0.98 h | 220,504, 189,620, 89,550 | 13 | 58.7 min = 16.3% | 0 | 76% | 16% |
| C. Source upgrades first | 6.85 h | +0.85 h | 256,680, 218,820, 0 | 13 | 58.7 min = 16.3% | 8.0 min = 2.2% | 53% | 0% |
| D. B with seats in Boogles | 6.00 h | 0 | 217,004, 186,120, 36,108 | 13 | 0 | 0 | 82% | 7% |

**Updated 11 November for the owner's steeper houses** (see [Houses cost more each time](#houses-cost-more-each-time-11-november)): the table and the bullets below are the run with each next house in a town costing twice the last on the brief's base prices (`house.order` = 2), fares unchanged; the first run (every house at the brief's price, x1.5) is in the git history. Figures not restated below are unchanged.

Ranked, P1 first (a P1 changes what the owner decides; none is a bug):

- **P1. Income runs about 2.4 times the brief's hand arithmetic.** Arrival incomes match it (56, 144, 247, 355 and 467 a
  minute against the stage table's 56, 150, 230, 330 and 450), but with every house built the model reaches 168, 431,
  778, 1,209 and 1,544 a minute against its 110, 220, 330, 420 and 650, because every town's riders pay a fare that
  grows with the distance. At 0.4 times the fares the model gives 618 at the end, which is the brief's figure. So the
  fare formula and the stage table disagree; the owner picks which to keep, and two numbers (`fare.per100m` and
  `fare.board`) move it on the page.
- **P1. The Boogle list is short and the end-game goals are nothing.** Room B has bought every town-side thing (house,
  town building, fit-out, 189,620 in all with houses at 1.5 times and doubling) by hour 5.85 of 6.98 (5.72 before the
  steeper houses) and its box stands full 16% of the route (37%), with 89,550 of fares not landing (165,456). Room D
  clears its list by hour 5.27 of 6.00 (4.92). The three
  Boogle goals (60,000) still take **18 minutes** after the route in B and D (39 in C), where the brief wanted a few hours;
  they take 6.1 h at ten times the price, or 3.6 to 6.5 h at 0.4 times the fares. Steeper houses alone leave the goals
  at 0.3 h: the late-game shortfall is a content question (more plots, dearer goals), not a pricing one.
- **P1. Seats on materials cost the route 58.7 minutes, 16.3% of it, and the crowd does not go away.** B and C add 0.98
  and 0.85 h to the route; D (seats in Boogles) adds none and buys the Village's two seat steps by hour 1.27. The extra
  is the number the owner judges; it is three times the old 5% bound, and doubling or halving the hauling minutes
  moves the route to 7.96 or 6.49 h. Under either pricing a crowd of four or more stands at some platform for 76% (B)
  and 82% (D) of the route, because every town's riders outgrow its seats a stage at a time, and 5,451 (B) and 3,929
  (D) riders give up waiting; a room that adds no seat (A) sees the same 76%.
- **P2. Source upgrades cannot shorten the route much.** The room that spends on sources first saves 7.9 minutes, 2.2%
  of the route. Only labour and waiting at sources can shorten: 33.6 of the route's 360 minutes (9.3%; the rest is
  authored play and riding). With every step three times as strong it saves 0.26 h (6.72 against 6.98). Spending first
  on sources also costs fares early: its Ring Island stage earned 7,616 against B's 18,190 before the steeper houses; it now waits 53 minutes a buy
  against B's 17 (9 before) and meets 41 choices it cannot afford both of (B: 18).
- **P2. The seat hauling widens the solo-to-three-players gap.** Rooms A and D finish 10.8% sooner with three players
  (6.00 against 5.35 h); B and C 17.4% sooner (6.98 against 5.76 h), past the existing 15%, because hauling shares out
  less well than the route does (0.7 of a hauler a friend). Boogles earned barely change with party size.
- **P3. A buy every eight to fifteen minutes, four to eight an hour:** B 4.1, D 6.8 and C 7.6 buys an hour, with at
  least 18 moments where two things were on offer that the room could not buy both of. The brief's worry (one every ten
  minutes) is inside that range; the 12 to 20 minutes from the research is met only by B.
- **P3. A night away credits one capped sack:** 23,163 at the end of the route (the box's room, which at 20 minutes of
  1,544 is also the sack's 15 minutes), 7,004 for room A. The empty room earns nothing (tested).
- **P3. The first house comes about seven minutes after the trade opens** (hour 0.69, 450 Boogles, solo) against the
  brief's five; room D buys it at 300 in about five minutes.
- **Seats, both ways:** B and D differ most in the route's hours (6.98 against 6.00), not in what is bought. D earns
  about the same as B (217,004 against 220,504), spends part of it on the second cars (2,000 to 6,000 each) and has
  its box full 7% of the route against B's 16%. Whether the hauling reads as the game or as a second chore is a
  question for the page and for him, not a number.

### Houses cost more each time (11 November)

The owner, after the first model numbers: "Would it help to consider that houses don't all have to cost the same? In
general subsequent purchases can be more expensive". The model's default is now `house.order` = 2: house n in a town
costs the brief's base price (kept in the table) times 1.5 (seats on materials) times 2^(n-1). Fares are unchanged.
Effect on room B, solo: mean wait per buy 9 to 17 minutes, fares lost to a full box 165,456 to 89,550, the last
town-side buy at hour 5.85 (5.72), goals still 18 minutes after the route. The base prices and the order are stand-ins
to refine from playtests ([decision](../decisions-rewards.md#d-2026-11-11-boogles-prices-are-stand-ins-to)). The seat
hauling (58.7 minutes) is not touched by this and stays an open finding.

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
>
> **Marked again later on 10 November, after his second set of answers.** Owner questions 3 to 5 below are answered,
> each as recommended, and his words are added to them. Two of his answers went against the reworked brief and change
> what this review took as given: passenger cars and seats cost materials ("Anything on rails costs materials,
> including the passenger train and seats"), so wherever a ruling, call or finding has a seat or a car bought with
> Boogles (ruling 8, calls 29, 32, 34 and 41, finding 8), read the body; and a town upgrade is a house Boogles build
> on a plot ("Boogles build the house itself; unbought plots stay empty ground"), not a household moved in. The
> review's text is otherwise unchanged.

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
`src/boogler/lines.ts`, `src/entities/railway/cars.ts`, `dev/economy/ring-sim.ts` and `ring-data.ts`.
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
   to play. Answer: ___ (Asked again, with smaller sizes, as question 1 under
   [Still open](#still-open-for-the-owner-after-the-change-of-10-november).) **Answered later on 10 November
   (owner):** "Strongbox: the larger of 20 minutes of income or 1.5 times the dearest thing on offer. Sack: 15
   minutes of income"
4. **Do waiting little guys stop a train by themselves?** Recommended: only when four or more wait, and never an
   express, so request stops keep trains fast. Answer: ___ (Question 2 there. He has since decided that an express
   passes a friend's pulled lever: "It runs past; the next train serves them".) **Answered later on 10 November
   (owner):** "Only when four or more are waiting, and never an express"
5. **The wallet's place:** your 6 November call put it in a strongroom beside the Home Yard. Recommended: the ticket
   window in the station hall instead, on the north end wall, with the balance also on each price card and each
   halt's fare box. This also rewords DESIGN.md 6 from sales to fares. Answer: ___ (Question 3 there.) **Answered
   later on 10 November (owner):** "A ticket window on the station hall's north end wall"
