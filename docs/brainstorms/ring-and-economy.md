> **Status: proposed, partly answered (owner, 2026-11-06).**

# The ring and the economy

**Owner amendment, 7 November:** evaluate the whole project and solo/co-op alongside each other. Effective coordination should pay off; broadly similar six-hour runs are targets, not reasons to erase that benefit. Judge producer bottlenecks by the worthwhile choices they create. The 5.8-hour endgame below remains future direction until the first complete automation cycle earns more. Model figures below have not been rerun under this review; [Process](../proposals/boogle-2.md#process) owns the accepted direction.

Design only; no game code. This builds on the owner's 6 November direction and the answers to this brief's first five
questions, recorded in [boogle-2.md](../proposals/boogle-2.md#trains-and-the-world). The earlier recorded answers still
stand: Split-rock Works next, then Ring Island; the smallest Roundhouse first. The length is now roughly six hours to
the ending, a rough target rather than a rule, with solo and groups close together (owner, 6 November).

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
- **Progression is shared:** every upgrade and ability anyone buys or earns applies to everyone. It's tuned for one to
  three friends.
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

Later the same day, the owner approved the [principles audit](../research/economy-principles-audit.md)'s wording,
including the funded job finishing as part of the away credit and the wallet's visible strongroom. The owner added four
calls, recorded as "economy principles amended" in [boogle-2.md](../proposals/boogle-2.md#progress-and-rewards):

7. **Shared progression:** "let's make progression completely shared." Every upgrade and ability bought or earned
   (carry sling, powered pick, double jump) applies to everyone in the world.
8. **Group size:** "really tuned to 1 to 2 to 3, maybe 4 people." Design and tune for 1–3, tolerate 4, and don't
   design for more.
9. **Money in dialogue:** The Boogler and NPCs keep treating money as a joke, while resources and the wallet do real
   work. Their copy is unchanged; conflicting lines are listed below.
10. **Cosmetics:** "the cosmetics can still be shared. Or maybe certain cosmetics and secret crates can be personal."
11. **Length:** "bring the completion time for the game closer to 6 hours, and there doesn't need to be that much of a
    delta between multiple players or not"; "it's roughly 6 hours. It doesn't have to be a really strict rule."
12. **Currency and the shop:** firm: "the currency should be shared so that the main progression is shared."
    Provisional: the shop stays free until the shared wallet ships, then wearables may cost Bucks; "we can figure out
    what makes sense ultimately about the cosmetics." How abilities are granted in co-op is being designed
    separately, so this brief leaves it alone.

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
- **Shared progression.** Every ladder step (carry, harvest tools, train speed, freight, trains) applies to every
  player. Each party's hand rate is one player's rate × (1 + 0.7 per extra player), so friends haul more, but nobody
  has better tools than anyone else.
- **One, two and three players.** The Pacing tab has one block per party, set to 1, 2 and 3; four is a footnote in the
  Summary.

## Six hours for one, two or three

The owner asked for roughly six hours, with less of a gap between solo and groups. The model was at 8.2 / 6.9 / 6.1
hours.

| Option | What it does | Verdict |
| --- | --- | --- |
| Bills that scale with party size | Groups need more stock | **No.** It punishes whoever joins, works against drop-in and the fixed-bill research ([group-size](../research/group-size.md)), and makes friends feel like a cost |
| Solo assists: little-guy helpers | Little guys haul alongside a short-handed party: 0.6 of a hauler solo, 0.3 for two, none for three | **Yes.** It builds on the 3 November call "little guys bring rails too", makes solo hauling less grindy, and steps aside as friends arrive |
| Work that doesn't parallelize | Exploration, puzzles and big machines are done together: one lever, one gantry, one train ride | **Yes, as the model's assumption.** Each extra friend saves 5% of authored play (was 12%) and 10% of commuting (was 30%), because friends ride and solve together |
| Producers set the pace | Groups wait for shared stock while solo rarely does | **Already true:** three players wait about 10 min, which gives groups a reason to split off and upgrade producers |
| Shorter authored content | Less play per step, one round trip home per step instead of two | **Yes.** Authored play goes from 5.3 to 4.3 solo hours, and commuting from 2.0 to 1.3 |

**The mix:** shorter content and one round trip per step bring everyone near six hours. Helpers and shared moments
narrow the gap. Producers stay the group's pace-setter. Groups still do more: hauling with three is 2.4 haulers against
solo's 1.6, the crossover comes sooner for them, and they're 10–12% faster. Solo isn't grindy, because the little guys
carry part of every load.

## Pacing (rerun)

| | Solo | Two | Three |
| --- | --- | --- | --- |
| Hours to the ending | **6.1** (6.1–6.2 across the choices) | **5.8** | **5.5** |
| Authored play, with about 27 min of returns | 4.3 h | 4.0 h | 3.9 h |
| Commuting, with returns | 1.3 h | 1.2 h | 1.1 h |
| Hand labour (helpers included) | 0.5 h | 0.4 h | 0.3 h |
| Waiting for shared stock | 2–4 min | 5–7 min | 9–10 min |
| Shared wallet at the ending | about 18,300 Bucks | about 16,800 | about 15,800 |
| End-game goals after the ending | **5.8 h** | about the same | about the same |

The gap between solo and three is 12%. Four players still works (5.2 h, 13–15 min waiting) but isn't designed for.

| Milestone | Hours (solo / two / three) |
| --- | --- |
| The Works connected | 1.2 / 1.1 / 1.1 |
| Ring Island connected | 1.8 / 1.7 / 1.7 |
| First branch connected | 3.0 / 2.8 / 2.7 |
| First return spoke | 3.5 / 3.3 / 3.1 |
| High Port | 4.4 / 4.1 / 3.9 |
| The ring closed | 5.8 / 5.4 / 5.1 |
| The ending | 6.1 / 5.8 / 5.5 |

Machines pass the party's hands, little guys included, on each party's own timeline:

| Material | Solo | Two | Three |
| --- | --- | --- | --- |
| Logs | 0.4 h | 0.4 h | 0.4 h |
| Footings | 3.9 h | 3.7 h | 3.5 h |
| Steel | 5.3 h | 5.0 h | 4.7 h |
| First branch's material | 5.3 h | 5.0 h | 4.7 h |
| Second branch's material | 5.3 h | 5.0 h | End game |
| Crystal | End game | End game | End game |

The second branch (for three players) and crystal (for everyone) are only overtaken in the end-game tier, when level 5
and the crystal garden arrive. That's the "eventually everything gets easy".

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

- **What you carry is yours** until you deliver it to a build, as in the production-core contract. Everything it
  unlocks is everyone's: progression is shared.
- **Connected output is shared stock.** It sits in each producer's own yard, plus the Home Yard bays (16 → 32 → 64 →
  96 per material), and anyone may use it.
- **A full yard sells its surplus to the town,** and the Bucks go into the shared wallet. That gives surplus a use and
  gives the end-game tier its currency.
- **The wallet buys anything:** shared upgrades and goals, and personal looks and train fittings. It follows two rules
  from the approved audit:
  - spending happens at a place in the world, so others see it;
  - the next main-route build keeps its share.

### Cosmetics: shared or personal

| Kind | Who has it | How it's paid for |
| --- | --- | --- |
| Train looks (flag, side, chimney), Roundhouse fittings | Shared: the world's trains | The wallet, at the Roundhouse |
| Town and station decorations, awnings, districts | Shared: the world's places | The wallet, at the town |
| Wearables from the shop (hat, accessory, outfit) | Personal once taken | Free until the wallet ships, then Bucks (provisional) |
| Secret-crate finds and box cosmetics | Personal | Found, never bought |

The split follows the owner's "certain cosmetics and secret crates can be personal", and stays provisional: "we can
figure out what makes sense ultimately about the cosmetics." The firm part is that the currency is shared, so the main
progression is shared. Shared looks are things the whole
world sees on shared objects. Personal ones are on your own character, or found by you.

### Producers that start slow

Split-rock Works:

| Level | Rate | Compared with hands |
| --- | --- | --- |
| 1 | 40 an hour | One player carries about 180 an hour, or 330 with the carry frame |
| 2 | 120 an hour | |
| 3 | 480 an hour | Passes one player |
| 4 | 1,440 an hour | Passes a group of three |
| 5 (end-game) | 2,880 an hour | |

Every level is a physical addition beside the works, and its bill reaches for the newest material.

### Keeping hauling central

- Every tier starts with hand carrying, and the frontier is always beyond the producers.
- Hands place every unit until the end-game cranes.
- Upgrades are builds you carry stock to.
- Doubling back with a new ability is hands-on exploration.
- Three friends wait about ten minutes in total for stock, which is a reason to split off and upgrade producers.

## Best suggestions, ranked

1. **Hands first, machines later, for every tier;** everything is automated by the end game.
2. **A paused world with a soft away credit** into each yard, `H × (1 − e^(−away/H))`, never past the yard.
3. **One shared wallet fed by surplus,** shown as a strongroom you can see, with the next main-route build protected.
4. **Two order choices** (the branch, and the first Roundhouse upgrade) on a mostly linear route, with **returns** to
   earlier places that shortcuts speed up.
5. **An end-game tier** that first retires the last manual jobs, then offers big shared builds and personal treats.
6. **Distances in one editable table,** so the map prototype's irregular layout drops straight in.

## Tensions

- **Principles: approved and applied.** DESIGN.md 1, 6, 8, 9 and Server hosts every room carry compact versions of the
  audit's wording, sized to the prototype route's reading budget. The full wallet and away-credit rules live in
  [owner-calls](../agents/owner-calls.md). The code changes are queued after R1b in
  [orchestrator-state](../agents/orchestrator-state.md).
- **The end-game is production-bound.** Two or three friends don't finish it faster, so they may stand around. A crew
  could instead be given hands-on end-game jobs, such as building the Grand Station piece by piece, which should be
  tested.
- **More hands delay the crossover.** With shared tools, a trio's hands outpace level 3 producers, so the
  hand-to-machine moment comes later for groups. That's fine if a group feels the relief at level 4; if not, give
  level 3 a little more for groups.
- **The away credit doesn't change pacing.** Solo play almost never waits for stock, so the credit is a homecoming
  feeling, not a speed-up. If playtests want it to matter, make yards smaller early, not the credit bigger.
- **Shared moments are an assumption.** The six-hour mix assumes friends explore, solve and ride together. If
  playtests show groups splitting up to explore faster, groups get quicker and the gap widens. Then lean on producers
  (smaller early yards) rather than on bigger bills.
- **Helpers must not make friends feel redundant.** The little guys step aside as friends join; their 0.6 and 0.3 are
  tunables, judged by whether a solo player feels helped and a pair still feels needed.
- **The second order choice is an upgrade order, not a place.** The owner said "a couple of times". A second
  area-order choice is better placed by the map prototype (open question 3).
- **Authored content is still the real cost:** 4.3 solo hours of authored play, of which the returns reuse places for
  about half an hour. Six hours is a rough target, so content can run a little long if it's good.

## Smallest first build

**Split-rock Works levels 1 and 2 with a visible yard and explicit proof tuning,** after the line 2 playtest and the Split-rock
greybox:

1. Carry the first footings home by hand.
2. Watch level 1 fill its yard more slowly than you could carry.
3. Build level 2 beside it.
4. Leave and rejoin to see the away credit fill the yard.

Explicitly tune the second test level to pass the measured hand throughput for the tested party within one sitting;
the unmodified 40/120-per-hour levels do not pass the model's 180-per-hour solo hands. Record the test rates separately
from campaign defaults. Compare solo and cooperative choices, division of work and what the upgrade lets players stop
doing. Then stop for the owner's verdict. The wallet and end-game tier come after the gut question is answered.

## NPC lines for the owner

Money stays a joke in dialogue, and no copy was edited. These lines assume that taking things is free or that nobody
has money, which the shop and the wallet will contradict once wearables cost Bucks:

- **The shop clerk** (`src/proto/place/town-lines.ts:68–94`):
  - "The things are free. Don't tell the prices."
  - "Everything on the floor is free. The prices are for looking at."
  - "Try anything on. It's the prices you can't touch."
  - "It isn't free. It's forty million with a forty million discount."
- **The shop's tag and pickup lines** (`town-lines.ts:211–224`):
  - "TODAY: $0"
  - "Take it: $0"
  - "That's a fortune you've saved. Spend it wisely."
  - "It's free! You didn't have to run!"
- **The saver** (`town-lines.ts:105, 114`): "I've been saving for this hat for eleven years. Nearly there. Four hundred
  to go." and the reply "That's what they want you to think." to "It says you pay nothing." This still works as a joke
  if hats cost Bucks; flagged only because the premise changes.
- **The Boogler** (`src/boogler/lines.ts:938`): "Rides cost money. You do not have money." With a shared wallet the
  players do have money. Probably still funny as a mistaken jab; flagged for the owner.

Recommended: keep all of them while the shop stays free, and revisit them only when shop wearables start costing
Bucks.

## Open questions

1. **The second choice point:** keep the upgrade-order pick as the second choice, or ask the map prototype for a
   second area-order choice (for example two small places between Split-rock and Ring Island)? Recommended: **both;
   the map prototype proposes where**. Answer: ___
2. **Away horizon:** is H = 2 hours of output right to start (0.8 h after an hour away, 2 h after a day)?
   Recommended: **yes, as a tunable judged in play**. Answer: ___
3. **Group crossover:** should level 3 producers be a little stronger so that two or three players also feel machines
   overtake them mid-game? Recommended: **judge in play; it's one tunable per level**. Answer: ___

## Parked

- Exact link lengths and the map's shape (map prototype).
- Per-player schedules for this route in the event model (`campaign.ts`).
- A playable 2D economy prototype on the chosen map, queued in the orchestrator state.

## Disposition

**Proposed, partly answered; owner decision needed** on the three questions. The principles are amended; no game code
changes. Everything builds after the line 2 playtest and the production-core slices it depends on.
