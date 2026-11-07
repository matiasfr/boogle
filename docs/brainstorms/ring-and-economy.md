> **Status: proposed, partly answered (owner, 2026-11-06).**

# The ring and the economy

Design only; no game code. This builds on the owner's 6 November direction and the answers to this brief's first five
questions, recorded in [boogle-2.md](../proposals/boogle-2.md#trains-and-the-world). The earlier recorded answers still
stand: Split-rock Works next, then Ring Island; the smallest Roundhouse first; about eight hours for the main game.

- **Model:** [economy-model.xlsx](../economy/economy-model.xlsx), with the same data as CSVs in
  [docs/economy/](../economy/). Built by `node dev/economy/build-model.ts` from
  [ring-data.ts](../../dev/economy/ring-data.ts).
- **Page:** [ring-economy.html](../world/ring-economy.html).
- **Principles audit:** [economy-principles-audit.md](../research/economy-principles-audit.md).
- **Research:** addenda to [upgrade-economy.md](../research/upgrade-economy.md#addendum-6-november-ring-and-hub-worlds-and-shared-stock)
  and [incremental-game-maths.md](../research/incremental-game-maths.md#addendum-6-november-hands-first-machines-later-then-a-new-tier-by-hand).

## Pitch

**A co-op incremental you explore like a Metroidvania.**

- Every new material starts in your hands: you find it, carry it home and build with it.
- Connecting its place starts a producer that is slower than you at first. Its upgrades, built from the newest
  material you've found, pass one player and then a whole crew.
- At the end everything is automated, even the last carry into the frame, and a new tier of goals opens.
- What the works make beyond their yards sells to the town, into **one shared wallet** that anyone may spend.
- The world is **paused while nobody is in it**. When you come back, the producers have filled their yards a little,
  with a soft limit.
- Progress is mostly linear, but you double back to earlier places with new abilities. Twice, you choose an order:
  which branch first after Ring Island, and which Roundhouse upgrade first.

**Where it's new ground.** The co-op incrementals found (Clicker Heroes clans, Idle Together) share a number. Boogle
shares a place: the incremental climb is physical hauling that machines gradually take over, and each new tier is
reached by exploration with abilities and route shortcuts, not bought.

## Gut question

**"When the machine passed your hands, did it make you want to go and find the next material?"**

## The owner's answers (6 November)

1. **The hub:** agreed. Home, with the Roundhouse and Home Yard, sits at the centre, and Ring Island is on the ring.
2. **Both branches:** both are integral; there are no optional areas. The order is a choice, made "maybe just a
   couple of times" in the game. Upgrade-tree choices count too. Progression is mostly linear, and "linear" means the
   progression model, not the geography: players double back to earlier places with new abilities.
3. **The wallet:** "I actually am not against the shared wallet." Connected output can be shared currency that anyone
   spends, on shared or personal things.
4. **Away production:** nothing simulates while the room is empty. On the next join, producers are credited a capped
   away-fill with a soft limit (confirmed as the reconciliation).
5. **Crystal and the end:** crystal shouldn't stay hand-only. "Eventually everything does get easy"; at the end
   there's "some kind of new tier of goals", and numeric requirements are fine.
6. **Map:** wanted "a little more asymmetry or variety or irregularity". Another agent is prototyping layouts in 2D,
   so this model keeps its node list and distances in one swappable table.

## What changed in the model

- **The paused world and the away credit.** Nothing runs while the room is empty. On the next join, each producer's
  yard is credited `H × (1 − e^(−away/H))` hours of output, never past the yard, with H = 2 hours.
  - An hour away gives 0.8 h of output, four hours give 1.7 h, and a day gives 2 h.
  - The soft limit comes from the curve, and the hard limit is the yard, so bigger yards make the credit worth more.
  - This is Cookie Clicker's soft slowdown in a simpler form.
  - In the model, the credit changes no milestone time. Its value is coming back to full stacks.
- **The shared wallet.** A full yard's surplus sells to the town (footings 2 Bucks a unit, steel, fibre and copper 3,
  crystal 20; logs and rails are never sold, because the depot cart and the forge stop at their racks, as built). The
  Bucks go into one wallet anyone may spend. It should look like coin crates in a strongroom beside the Home Yard
  (audit item 6).
- **Crystal is automatable late.** Seeds are carried by hand from the small stops (Bell Terraces, on the first return
  spoke) until High Port's seed cradle. The seed nursery comes when the ring closes, and the crystal garden is an
  end-game goal.
- **The end-game tier.** After the ending, eight goals, bought in order from production and the wallet. Three are
  automations, three are big shared builds and two are personal.
  - Auto-placing cranes retire the last manual carry.
  - The crystal garden makes crystal plentiful.
  - Level 5 at every works doubles every producer.
  - Then the deep-sea spokes, a Grand Station, a ring lighthouse, an engine collection and hats.
- **No optional areas.**
  - The two far spokes moved into the end-game tier.
  - Sail Tower and Lantern Observatory became part of the second-branch and final steps.
  - Only cosmetic sinks (town districts, awnings, a seat canopy) stay optional; they cost little.
- **Two order choices:**
  - which branch after Ring Island (Canopy Town or High Gorge);
  - which Roundhouse upgrade at the first return spoke (steel boiler or freight chassis; the other comes at High
    Port).
- **Doubling back.** Five steps return to an earlier place to open a section with the new ability (Ring Island's upper
  gallery, Split-rock's upper seam, Home's old headland, the first branch's hidden section, and Ring Island again to
  close the loop). Their rides use whatever spokes exist by then, so shortcuts make returns quicker.
- **Distances are an edge list** (the Links tab): nine link lengths that are deliberately uneven placeholders. A new
  layout from the map prototype only changes that table.

## Pacing (rerun)

| | Solo | Four friends |
| --- | --- | --- |
| Hours to the ending | **8.2** (8.1–8.3 across the choices) | **5.5** |
| Authored play, including about 27 minutes of returns | 5.3 h | 3.9 h |
| Commuting, including returns | 2.0 h | 1.1 h |
| Hand labour | 0.8 h | 0.3 h |
| Waiting for shared stock | under 1 min | 14–15 min |
| Shared wallet at the ending | about 26,700 Bucks | about 15,800 Bucks |
| End-game goals after the ending | **6.6 h** | about the same (production sets the pace) |

**Machines pass one player:**

- logs at 0.5 h;
- footings at 3.3 h;
- steel at 5.2 h;
- the first branch's material at 5.2 h (Canopy first) or 3.9 h (Gorge first);
- the second branch's material and crystal at 6.9 h.

**Machines pass a crew of four:** before the ending for footings, steel and the first branch; for the second branch and
crystal only in the end-game tier, when level 5 and the crystal garden arrive. That's the "eventually everything gets
easy".

## The world

Home is the hub, at the centre, with Split-rock Works on the same island. Ring Island is on the ring, reached by the
first sea crossing (the entry spoke). Around the ring are Canopy Town, High Port and High Gorge, with the Original
Island beyond the Port. The map on the page is a schematic circle; the real layout will be irregular and comes from the
map prototype.

1. **Home:** Line 1 and Line 2, as built.
2. **Split-rock Works:** walk east, find the ankle rings, strike the seam, carry the first footings home by hand, and
   connect the Works.
3. **Ring Island:** the first crossing, the brace, the steel works. The Roundhouse opens.
4. **Branch choice:** west to Canopy Town (fibre: sling and glider cloth) or east to High Gorge (copper: powered pick
   and hook reel). Then double back to Ring Island's upper gallery.
5. **The first return spoke,** past Bell Terraces (crystal seeds by hand, a crystal collar for the deep channel). The
   Roundhouse junction, a second engine and the first Roundhouse upgrade pick come with it. Then double back to
   Split-rock's upper seam.
6. **High Port:** the harbour crane, the service bay, a faster engine and the seed cradle. Then double back to Home's
   old headland.
7. **The second branch,** past Sail Tower. Then double back to the first branch's hidden section.
8. **Closing the ring:** this gives a loop line with a circulating train, either-way routing, the express fitting and
   a celebration lap.
9. **The Original Island and The Boogler,** past Lantern Observatory.
10. **The end-game tier** (above).

## The economy

### Resources by tier

| Tier | Material | By hand until | Automated by |
| --- | --- | --- | --- |
| 0 | Logs, stone, rails | Line 2's depot cart; stone stays by hand | Depot cart, forge (as built) |
| 1 | Footings | The Works connects | Split-rock levels 1–4, then level 5 (end-game) |
| 2 | Steel | The steel works connects | Ring Island levels 1–4, then level 5 |
| 3 | Fibre and copper | Each branch connects | Levels 1–4 (the second visit buys several at once), then level 5 |
| 4 | Crystal | High Port's seed cradle | Seed cradle, nursery, then the crystal garden (end-game) |

Recipes get harder by needing more kinds of material. Train upgrades go from 0 kinds to 4 (the express fitting needs
steel, footings, copper and fibre).

### Stock, yards and the wallet

- **What you carry is yours** until you deliver it to a build, as in the production-core contract.
- **Connected output is shared stock.** It sits in each producer's own yard, plus the Home Yard bays (16 → 32 → 64 →
  96 per material), and anyone may use it.
- **A full yard sells its surplus to the town,** and the Bucks go into the shared wallet. That gives surplus a use and
  gives the end-game tier its currency.
- **The wallet buys anything:** shared upgrades and goals, and personal looks and train fittings. It needs two rules
  (audit items 1 and 5):
  - spending happens at a place in the world, so others see it;
  - the next main-route build keeps its share.

### Producers that start slow

Split-rock Works:

| Level | Rate | Compared with hands |
| --- | --- | --- |
| 1 | 40 an hour | One player carries about 180 an hour, or 330 with the carry frame |
| 2 | 120 an hour | |
| 3 | 480 an hour | Passes one player |
| 4 | 1,440 an hour | Passes a crew of four |
| 5 (end-game) | 2,880 an hour | |

Every level is a physical addition beside the works, and its bill reaches for the newest material.

### Keeping hauling central

- Every tier starts with hand carrying, and the frontier is always beyond the producers.
- Hands place every unit until the end-game cranes.
- Upgrades are builds you carry stock to.
- Doubling back with a new ability is hands-on exploration.
- Four friends wait about a quarter of an hour in total for stock, which is a reason to split off and upgrade
  producers.

## Best suggestions, ranked

1. **Hands first, machines later, for every tier;** everything is automated by the end game.
2. **A paused world with a soft away credit** into each yard, `H × (1 − e^(−away/H))`, never past the yard.
3. **One shared wallet fed by surplus,** shown as a strongroom you can see, with the next main-route build protected.
4. **Two order choices** (the branch, and the first Roundhouse upgrade) on a mostly linear route, with **returns** to
   earlier places that shortcuts speed up.
5. **An end-game tier** that first retires the last manual jobs, then offers big shared builds and personal treats.
6. **Distances in one editable table,** so the map prototype's irregular layout drops straight in.

## Tensions

- **Principles.** Three DESIGN.md principles need new wording and two need a clarifying sentence. Four decision-log
  entries and the production-core offline contract are superseded. One owner call needs a rule for the wallet's look,
  and four code paths run or catch up time while nobody plays. The exact source lines and proposed wording are in the
  [audit](../research/economy-principles-audit.md).
- **The end-game is production-bound.** Four friends don't finish it faster, so they may stand around. A crew could
  instead be given hands-on end-game jobs, such as building the Grand Station piece by piece, which should be tested.
- **The away credit doesn't change pacing.** Solo play almost never waits for stock, so the credit is a homecoming
  feeling, not a speed-up. If playtests want it to matter, make yards smaller early, not the credit bigger.
- **The second order choice is an upgrade order, not a place.** The owner said "a couple of times". A second
  area-order choice is better placed by the map prototype (open question 3).
- **Authored content is still the real cost:** 5.3 solo hours of authored play, of which the returns reuse places for
  about half an hour.

## Smallest first build

Unchanged: **Split-rock Works levels 1 and 2 with a visible yard,** after the line 2 playtest and the Split-rock
greybox:

1. Carry the first footings home by hand.
2. Watch level 1 fill its yard more slowly than you could carry.
3. Build level 2 beside it.
4. Leave and rejoin to see the away credit fill the yard.

Compress the levels so the crossover happens within one sitting; all rates are tunables. Then stop for the owner's
verdict. The wallet and the end-game tier come after the gut question is answered.

## Open questions

1. **Principle wording:** approve the amendments in the
   [audit](../research/economy-principles-audit.md), starting with DESIGN.md 6, 9 and Server hosts every room?
   Recommended: **yes, as worded**. Answer: ___
2. **The funded job while away:** should the one funded laying job also complete in the away credit, keeping the
   Design Table's "whatever you kicked off finishes"? Recommended: **yes, it finishes on the next join, and nothing
   new starts**. Answer: ___
3. **The second choice point:** keep the upgrade-order pick as the second choice, or ask the map prototype for a
   second area-order choice (for example two small places between Split-rock and Ring Island)? Recommended: **both;
   the map prototype proposes where**. Answer: ___
4. **Away horizon:** is H = 2 hours of output right to start (0.8 h after an hour away, 2 h after a day)?
   Recommended: **yes, as a tunable judged in play**. Answer: ___
5. **Wallet guard:** does the wallet show as coin crates in a strongroom beside the Home Yard, with the next main-route
   build's share kept back? Recommended: **yes**. Answer: ___

## Parked

- Exact link lengths and the map's shape (map prototype).
- Per-player schedules for this route in the event model (`campaign.ts`).
- Box cosmetics versus wallet purchases (audit item 12).

## Disposition

**Proposed, partly answered; owner decision needed** on the five questions and the audit's amendments. No game code
changes. Everything builds after the line 2 playtest and the production-core slices it depends on.
