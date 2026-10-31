# 7. The core resource loop for Boogle v2

*Research and design brief, 30 October 2026. Builds on the settled v2 direction: a preset railway built in short sections, about 7 ages (wood, iron, steel, diesel/concrete, electric, monorail, maglev), a work site per section that one player starts once it is stocked, and ages advanced by discovery. It does not re-open any of that. It also builds on briefs 3 (progression models), 4 (rail as play) and 6 (rail tech) in this folder.*

**Markers.** **[V]**: I fetched the page and the wording or number matched. **[S]**: from a search summary, wiki or guide only. Treat [S] as likely, not certain.

**What exists today.** Two of the toys named in the brief are gone. Sand digging and the shovel, and the shared water sim, were **removed on 2026-10-30** (`docs/game-design.md` 6.2 and 6.3; `docs/plans/cleanup-dig-water-junk.md`). The sea and the cave pond remain. The caves' "abandoned mine" is a **cosmetic place** with no items or ops: a minecart of ore and glowing veins (6.12). The toys you can actually use are: shaking palms (fruit drops, regrowing after 4 min), throwing with scripted flight, the beach ball (it knocks fruit loose at 3 m/s or faster), mushrooms (plant, water, bounce), the windmill sails (solid, they bat the ball) and the Boogler. The loops below use these and flag anything that needs a new toy.

**Short answer.** Use **one material per age, carried on your body as a visible, growing stack**. Pour it into the work site by walking into its ring. You never open an inventory or sort slots, and nothing decays. The one trade-off is at the work site: **lay track now, or build the station's helper first**. The helper is a generator that sends "freight" down the line from then on. Older ages' materials are never handled by hand again, because the line delivers them. That is what makes the game feel incremental: the train does the old job while your hands learn the new one.

---

## 1. What makes collecting feel good

**1. Pick it up without stopping.**
- Mario Odyssey's director, Kenta Motokura: "Collecting a Power Moon won't take you out of the map the way it would in Mario 64 or Sunshine", and "The game is designed so you can explore and play without interruption" [V, [Kotaku](https://kotaku.com/i-played-30-minutes-of-super-mario-odyssey-and-it-sure-1796037732)].
- He also said moons are "far more common" than earlier Stars, and "Almost everything that draws the player's attention could potentially reward them with a Power Moon" [V, same].
- **Lesson:** pickups must never cost a menu, a cutscene or a stop. Density beats rarity.

**2. Magnetism turns walking into collecting.**
- In Vampire Survivors, gems inside your Magnet radius fly to you, and the radius is an upgradable stat [S, [wiki](https://vampire.survivors.wiki/w/Magnet)]. The Vacuum item pulls in every gem on the map [S, [wiki](https://vampire.survivors.wiki/w/Vacuum)].
- Players describe the payoff as a chain of level-ups with a sound and a filling bar [S, [Twinfinite](https://twinfinite.net/features/hoovering-up-gems-in-vampire-survivors-is-my-new-happy-place/) (the page returned 403), [Hardcore Gamer](https://hardcoregamer.com/reviews/review-vampire-survivors/428995/)].
- There is a technical trick too: with more than 400 gems on the ground, new XP goes into one red gem instead [S, [wiki](https://vampire-survivors.fandom.com/wiki/Experience_Gem)]. Boogle's piles should merge the same way.
- **Lesson:** a modest magnet radius makes collecting feel generous. A late-game "vacuum the island" moment is the best power fantasy in the genre.

**3. Let the thing you collect show on screen and change scale.**
- Katamari's postmortem aimed to "effectively express a great change in scale" and "the feeling of enormity", and credits "the sound effects generated when you roll something into the katamari" plus vibration for the feel [V, [Game Developer postmortem](https://gamedeveloper.com/design/postmortem-the-singular-design-of-namco-s-katamari-damacy-2004-)].
- Takahashi suggested music that thickens as the ball grows [S, [GamesRadar](https://gamesradar.com/wattam-director-keita-takahashi-gives-us-life-advice-and-an-ending-explanation)].
- **Lesson:** a pile you can see on your character beats a number in a corner. A stack on your back that wobbles and grows is the Katamari ball for a game about carrying things.

**4. Carrying with your body creates co-op moments a wallet can't.**
- In Pikmin, more carriers move an object faster, and each object has a weight that sets how many it needs [S, [Pikmin wiki](https://pikminwiki.com/Carry), [Nintendo tips](https://www.nintendo.com/en-gb/Support/Legacy-system/General-game-tips-613203.html)].
- R.E.P.O.: "Rough handling can decrease an item's worth", and extraction means rolling your cart onto a platform "while praying that no one in your team does something stupid" [S, review snippets].
- Deep Rock Galactic: deposited minerals are "permanently added to the inventory of every player on the mission", and a resupply costs "80 Nitra per pod" [V, [DRG wiki](https://deeprockgalactic.wiki.gg/wiki/Resources)].
- **Lesson:** physical carrying is funny and social, which suits principle 10, "Slapstick over precision". Value loss and fragility are pressure, and the brief rules pressure out. Keep the slapstick, drop the loss: a stack that topples just spills where everyone can scoop it back up.

**5. Show progress at once, and take everything else out of the way.**
- PowerWash Simulator's Dan Chequer: "The one word we hear more than any other in our feedback is 'Satisfying'". Of the design: "enemy threats and time limits are deliberately absent". Kirsty Rigden "has always loved games where you see immediate visual progress such as *de Blob*" [V, [Kotaku](https://kotaku.com/powerwash-sim-devs-on-making-cleaning-fun-advanced-cro-1847319502)].
- Jonasson and Purho's "Juice it or lose it" keeps the rules fixed and layers particles, sound, tweening and screen shake on top [S, [summary](https://gamejuice.pages.dev/articles/juice-it-or-lose-it-lessons)].
- **Lesson:** the work site has to change visibly with every unit poured in. Sleepers appear, a pile rises, the machine's gauge needle moves. The counter only confirms what you can already see.

**6. Counters: few, physical, and growing in scale.**
- Grow Home: "There are 100 crystals total", and BUD "will earn upgrades upon collecting certain numbers of them"; the jetpack comes at 20. The reviewer got "a good three to four hours" from it [V, [Destructoid](https://www.destructoid.com/review-grow-home/)].
- A Short Hike: Golden Feathers set stamina, and "To achieve the summit by the established route, the player has to obtain at least seven feathers". Their findability was tuned after early playtests [V, [Wikipedia](https://en.wikipedia.org/wiki/A_Short_Hike)].
- **Lesson:** each count should be one small number you can hold in your head, and it should unlock something you can feel, such as an ability or a section.

---

## 2. Spending trade-offs without management

**Single currency against a few kinds.**
- Animal Crossing: New Horizons runs two currencies that "remain independent of one another": Bells from selling, Nook Miles from activities [S, [Nintendo Life](https://www.nintendolife.com/guides/animal-crossing-new-horizons-bells-how-to-make-bells-fast-nook-miles-and-money-explained)].
- Shapez sends one stream of shapes to the hub. Some shapes are "consumed to upgrade the speed of tools" [S, store and wiki text].
- The low-management games all keep the number of kinds you hold at once tiny. Boogle's rule should be **one kind in your hands at a time**. A new age replaces it; it never adds a second.

**Spend now or invest. The incremental core.**
- Cookie Clicker: each asset costs "15% more than the last-purchased asset of the same type" [V, [Wikipedia](https://en.wikipedia.org/wiki/Cookie_Clicker)].
- Anthony Pecorella (AdVenture Capitalist): "costs grow exponentially while production grows at a linear or polynomial rate". Milestone multipliers (×2 at 25 and 50 Lemonade Stands) "bump you back up whenever it gets close" [V, [Game Developer, Math of Idle Games I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i)].
- The only decision is "buy a producer, or push for the goal". Because it is about payback, it is never wrong, only faster or slower. That suits a player who hates management: no choice locks you out.

**Branch choice.**
- Islanders: when you reach a points threshold you pick one of two building packs. Costs rise "to keep pace with the higher building values" [S, [review](https://awkwardmixture.blogspot.com/2024/05/islanders-challenging-casual-city.html)].
- Dorfromantik: "Completing quests awards points and gives the player additional tiles", and "The game ends when the player runs out of tiles" [V, [Wikipedia](https://en.wikipedia.org/wiki/Dorfromantik)]. The reward is more play.
- Stardew bundles sometimes show more items than slots, so you pick which ones to give. Guides warn against selling forage the bundles need [S, [wiki](https://stardewvalleywiki.com/Bundles)]. The keep-or-sell tension is real, but it **is** management, the kind the owner hates.

**Personal or communal.**
- Death Stranding 2's Auto-Pavers take materials from other online players. Your share of the materials sets how many Likes you get from people who use the road [S, [MapMaster guide](https://mapmaster.io/games/death-stranding-2-on-the-beach/guides/Auto-Paver)].
- Animal Crossing: New Leaf public works collect Bells toward a goal, build the next day, allow one project at a time and 30 at most [S, [Nookipedia](https://nookipedia.com/wiki/Public_works_project)].
- DRG shares every deposit with the whole team [V].
- **Clash with DESIGN.md principle 6:** "No shared wallets, so nobody spends what someone else earned." A work site is a project, not a wallet. You choose where your own stack goes, and nobody can spend it for you. Credit should be visible, the Death Stranding way: names on the milepost plaque, ordered by how much each person brought.

**Rejected patterns.**
- Slime Rancher's market drops a plort's price as you sell more of it [S, [wiki](https://slimerancher.fandom.com/wiki/Plort_Market?oldid=6571)]. That is management by design.
- Lethal Company and R.E.P.O. quotas are timers. Peak's weight-against-stamina backpack is pressure [S].
- Valheim's shared chests turn into sorting work; even fans' guides recommend labelled chests [S].
- All of these are excluded by the brief.

---

## 3. Pacing budget: about 4 hours, 7 ages, 36 sections

**Assumptions.**
- A typical group of 3. Total about 240 min, made of 36 sections at about 6 min each (216 min) plus 7 age beats (discovery, new machine reveal) at about 3 min each (21 min).
- A section is about **3.5 min collecting, 1 min for the machine run, 1.5 min walking and station characters**.
- Cost per section rises about ×3 per age, and the collection rate rises to match, so sections stay short while the **numbers** climb by orders of magnitude. That is the incremental feel.
- Within an age, freight from the helpers you build cuts section time from about 4.5 min to about 2.5 min. Then the next age resets the cost.

| Age | Sections | Material (in hands) | Cost / section | Hand rate, 3 players (/min) | Freight at age start → end (/min) | Collect min / section (first → last) | Age total (min, incl. runs, walking, age beat) |
|---|---|---|---|---|---|---|---|
| 1 Wood | 4 | logs | 60 | 15 | 0 → 6 | 4.0 → 2.9 | 26 |
| 2 Iron | 5 | ore | 180 | 40 | 6 → 24 | 3.9 → 2.8 | 31 |
| 3 Steel | 5 | ingots | 550 | 120 | 24 → 75 | 3.8 → 2.8 | 31 |
| 4 Diesel/concrete | 6 | sacks | 1,600 | 330 | 75 → 230 | 3.9 → 2.8 | 37 |
| 5 Electric | 6 | charge | 5,000 | 1,000 | 230 → 700 | 4.1 → 2.9 | 37 |
| 6 Monorail | 5 | parts | 15,000 | 3,000 | 700 → 2,100 | 4.1 → 3.0 | 31 |
| 7 Maglev | 5 | magnets | 45,000 | 9,000 | 2,100 → 6,500 | 4.1 → 2.9 | 31 |
| **Total** | **36** | | | | | **avg ≈ 3.4** | **≈ 224 + finale ≈ 4 h** |

How to read the rates:
- **Hand rate** grows about ×3 per age. Most of that comes from the age's new verb (the ball smashes a vein into many chunks; a cart moves 10 at once), not from stat upgrades.
- **Freight** is what the line delivers from helpers built so far. Every helper keeps producing in the current age's material, so nothing goes obsolete, and it compounds.
- Helpers should cost about **0.6× a section** at the current age and add about **0.15× the hand rate** each. Payback is then about 4 min of collecting, roughly one and a half sections:
  - A helper bought in the **first half of an age** clearly pays.
  - One bought in the **last section** mostly pays in the next age.
  - The decision is real but never punishing.

**Solo and crowd scaling.**
- Keep section costs **fixed**, not scaled to head count, so drop-in stays simple (principle 8).
- Shared sources should give diminishing returns: three players on one palm grove get about 2.4× the solo rate, not 3×.
- Solo collection then takes about 2.4 × 122 min ≈ 290 min, plus about 100 min of runs and walking ≈ **6.5 h**, under the 8 h ceiling.
- Six players finish in about 3 h. No catch-up timer or assist: the brief rules out timers, and fixed costs are enough.

---

## 4. Five candidate core loops

### Loop A: "Haul Stack". Shake, stack and pour, one material per age

- **Second to second (wood age).**
  - Shake a palm or bonk it with the ball, and 3–5 logs tumble out.
  - Walk over them: they hop onto a stack on your back that sways as it grows (a cap such as 20 makes it wobble, never blocks).
  - Sprint and the stack leans. Jump and the top log flips off, a slapstick spill. Throw a log and it flies like any thrown item.
  - Walk into the work site ring and the stack pours in one log at a time, each with a thunk and a sleeper appearing.
- **Resource.** One kind per age, held as a single integer stack per player, with no slots and no hotbar. The hotbar stays for toys.
- **Where it goes.** Your back (personal, in localStorage, so leaving costs nothing), then the site (communal).
- **Trade-off.** Each site has two sockets: **Track**, which finishes the section, and **Helper**, a station gadget run by the station's character (sawmill, ore crusher) that adds freight. You pour into whichever ring you stand in.
- **Trains multiply it.** Helpers' output arrives as freight cars on the finished line. You watch it roll in and tip into the next site, which is incremental and visible.
- **How the age changes the loop.** Each age changes the verb and the stack physics, not just the numbers:
  - Wood: shake.
  - Iron: smash cave veins with the ball, then scoop the spray.
  - Steel: stacks get heavy, so two players carry a girder together (Pikmin).
  - Diesel: a shared handcart.
  - Electric: no carrying, you spin windmill sails with the ball and charge runs along a cable to the site.
  - Monorail: parts float down from height, and you catch them from the lighthouse or the Boogler launch.
  - Maglev: your magnet radius becomes the island ("vacuum").
- **Sync.**
  - Loose material on the ground: **Lockstep**, as integer piles. A palm drops one pile entity with `n = 4`, and the pieces are drawn Local. This avoids the 48-item cap in `gifts`.
  - Picking up: one `pile.take` op per pile, not per log.
  - Your stack: **Local**, persisted in localStorage like the hotbar, with an **Owner** presence field `st: n` so others see it.
  - Pouring: Lockstep `site.stock {site, socket, n}`. The adapter takes logs off your stack in `onApplied`, never on submit (AGENTS.md).
  - The machine run: a Lockstep start op plus a pure function of the start tick, the same as the tide.
- **Risk.** Low to medium. Contention on piles: the host stamps the first taker, and the loser's magnet animation reverses. The spill on jumping must never feel like loss, so spilled logs land as a pile anyone can retake.

### Loop B: "Boogs". One currency, magnet pellets, pocket counter

- **Second to second.** Everything playful sprays small gold Boogs: shaking a palm, a ball hit on a sail, a mushroom bounce, a long throw. They magnet to you (Vampire Survivors), the counter ticks up, and you deposit by standing in the site ring while it drains.
- **Resource.** One currency for the whole campaign, with prices rising per age.
- **Where it goes.** A personal wallet.
- **Trade-off.** Spend on the section, on the station helper, or on yourself (hats, ball skins: principle 6's "personal rewards"). That is a real three-way tension, but a pull toward selfishness splits groups.
- **Trains.** Connected stations multiply your Boog drops nearby, ×1.5 per age.
- **Ages.** Mostly numbers. New Boog sources appear, but the loop barely changes. This is its weakness.
- **Sync.** Pellets are **Local** per player: each tab spawns its own from its own actions, at zero bandwidth and with no stealing. The wallet is Local. Deposits are Lockstep.
- **Risk.** Low technically, high on feel. It is abstract, a number with no physical presence, and it rewards play the game already has instead of building a loop. Cheating is trivial, which doesn't matter among friends.

### Loop C: "The Ball Is the Pickaxe". Resources only come from ball impacts

- **Second to second.**
  - Resource nodes (crates and palms, then ore veins, then scrap heaps) burst open only when the beach ball hits them hard enough.
  - The shard count scales with impact speed, so a full-charge throw beats a bump.
  - Shards scatter and magnet to the nearest player.
  - Because there is one ball, the group naturally forms a relay: one throws, others scoop.
- **Resource.** One per age.
- **Where it goes.** Your stack, as in Loop A.
- **Trade-off.** The same two sockets as Loop A, plus "ball upgrades" (heavier ball, sticky ball) as the helper branch.
- **Trains.** Later ages add the train as a giant ball. A passing freight train clips nodes by the track and showers the line.
- **Ages.** The ball changes per age:
  - Iron: a heavy ball.
  - Electric: a charged ball that chains between nodes.
  - Maglev: a ball that orbits you.
- **Sync.** Ball is Owner (exists). The owner submits `node.hit {id, speed}`, and the host validates the speed against a cap and a cooldown. Shards: Lockstep pile. Validating against Owner physics is the risk: the host can't verify the ball's speed.
- **Risk.** Medium. It serves principle 2 ("The ball stays the star") perfectly. But with one ball, five players wait, and solo play is a lot of fetching your own ball. It needs a second resource source or several balls, and several balls dilute "one ball".

### Loop D: "The Wagon". A shared handcart you fill and push

- **Second to second.** Throw or drop material into a wheeled cart. It visibly fills and gets heavier, and pushing it takes 1 player slowly or 2 quickly. Tipping it on a slope spills everything, which is funny, not costly. Park it at the site, pull the lever, and it pours.
- **Resource.** One per age.
- **Where it goes.** A communal object, not a wallet. Anyone can fill it.
- **Trade-off.** Fill now and push a half cart, or wait for a full one. Plus the sockets.
- **Trains.** The cart **becomes** rolling stock. Wood: wheelbarrow. Iron: a minecart on the first rails. Steel and later: the freight train is the cart, and you fill it at stations while it runs on its own. This is the cleanest "the railway is the automation" story.
- **Ages.** Carrying gives way to loading.
- **Sync.** The cart is **Owner**, like the ball, using the epoch rule. Its contents are an integer in its presence plus Lockstep on pour. Throwing into it: a thrown item landing "in cart" is ambiguous, because the flight is Local and the cart is Owner. Make the thrower submit `cart.add` on landing within radius.
- **Risk.** Medium to high. A second Owner physics object with contested pushing, carts lost in the sea or the caves, and a host-migration edge case on contents. It is also slower moment to moment than a back stack.

### Loop E: "Groves". Plant producers, then harvest

- **Second to second.** Plant age-specific "seed" producers (log saplings, ore mushrooms) like today's mushrooms, water them, and they ripen and pop material on a timer. You make harvesting rounds.
- **Resource.** One per age, from your own groves.
- **Trade-off.** The purest Cookie Clicker trade: spend material on more groves (production) or on track (progress).
- **Trains.** Stations unlock auto-harvesters that ship grove output.
- **Ages.** Mostly new seed types.
- **Sync.** Lockstep, same as mushrooms (exists).
- **Risk.** High on the brief's taste. Waiting on ripening is a timer, groves become a chore list, and growth only ticks while someone is online (8.6). It is also farming, which principle 3 says is never required, so it can't be the only loop.

| | Feel | Ball stays star | Ages change verb | Low management | Sync cost | Overall |
|---|---|---|---|---|---|---|
| A Haul Stack | ★★★ | ★★ | ★★★ | ★★★ | ★★ | **Best** |
| B Boogs | ★★ | ★★ | ★ | ★★★ | ★★★ | Safe, flat |
| C Ball Pickaxe | ★★★ | ★★★ | ★★ | ★★★ | ★★ | Great *ingredient* |
| D Wagon | ★★ | ★ | ★★★ | ★★ | ★ | Great *late-age* form |
| E Groves | ★ | ★ | ★ | ★ | ★★ | Side system only |

---

## 5. Recommendation

**Build Loop A, with C's ball hits as a source and D's cart as the diesel-age verb.** Concretely:

1. **One material per age, carried as a visible back stack.** No inventory, no slots, no second kind in hand. A new age swaps what you carry.
2. **Sources are existing toys first.** Wood age: palms (shake or ball-bonk, already built with `fruit.drop`) plus new driftwood logs along the shore. Iron age: the cave mine becomes real, with ore veins you smash with the ball. Then each age adds a new verb, following the list in Loop A.
3. **Pour by standing in a ring.** The site visibly builds as you pour. Machine run when full, triggered by one player and seen by everyone.
4. **The one trade-off is Track or Helper,** with Cookie Clicker payback math (helper ≈ 0.6× section cost, pays back in about 1.5 sections), and helpers never go obsolete. Optional third socket per station: a **personal** cosmetic from that station's character, paid from your own stack. That is principle 6's "personal rewards", and it is cheap enough to be a treat, not a drain.
5. **The line automates the past.** Helpers ship freight in the current material, and the train visibly arrives and tips it in. By maglev the freight is about 40% of progress, and your own hands are about the new verb.
6. **Credit, never debt.** The milepost plaque lists contributors. Stacks persist per player. Nothing decays, nothing is lost in the sea for good (spills return to a pile), and nothing has a timer.

**Why not B.** Boogs is the easiest to build, but it fails the brief's "satisfying to collect". A number doesn't wobble on your back, and the ages wouldn't change anything. Keep its one good idea: a **magnet radius that grows per age**, ending in a maglev "vacuum".

### One-week prototype slice

**Goal:** answer "is pouring logs into a site and watching the machine lay track fun, with 1, 2 and 3 players?"

| Day | Build |
|---|---|
| 1 | `src/sim/piles.js` + test: integer piles, take, merge-when-near, cap 64. Rules `piles` (ops `pile.drop`, `pile.take`). Palms drop a log pile alongside fruit. Driftwood spawns along the shore on a seeded schedule. |
| 2 | Back stack: Local count + presence `st`, drawn as stacked log meshes with sway and a top-log spill on landing. Magnet pickup within 1.5 m (visual Local; `pile.take` on contact). Juice: thunk, squash, count pop. |
| 3 | Rules `site`: three work sites along a pre-laid line from the court toward the lighthouse. `site.stock {site, socket, n}`, state `[track, helper]` per site. Pour ring with drain animation; sleepers appear per 10 logs. |
| 4 | Machine run: `site.run` op (anyone, when stocked). A wood-age track layer crawls the section as a pure function of `(tick − t0)` and lays rails behind it. Cosmetic camera nudge for everyone in range. |
| 5 | Helper socket: a sawmill at site 1 that adds freight to site 2 (a log every N ticks, a Lockstep tick in rules). A plaque with contributor names. Scenario `dev/scenarios/stack-and-pour` covering a two-player pour plus a run. |
| 6–7 | Tune with real people. Measure minutes per section solo, 2p and 3p (telemetry), and how often people build the helper. |

**Costs for the slice:** sections need 60 logs; palms drop 3–5 every 4 min per tree, which is too slow on its own, so driftwood fills the gap. **Questions for the playtest:** Did anyone pour without being told? Did anyone pick Helper over Track, and say why? Did the spill make people laugh or groan?

---

## 6. Decision points for the designer

1. **How many kinds a player holds.**
   - (a) one per age, recommended;
   - (b) one currency all game (Boogs);
   - (c) two per age, track material plus helper material: more choices, more management.
2. **How stacks carry.**
   - (a) a soft cap: past 20 it wobbles and spills on jumps (recommended);
   - (b) no cap, an infinite Katamari tower;
   - (c) a hard cap of 10, which forces more trips.
3. **Where the trade-off lives.**
   - (a) Track or Helper at each site (recommended);
   - (b) choosing which of two branch lines to build next, Islanders-style;
   - (c) personal cosmetics against the communal site;
   - (d) none: pure collect-and-pour.
4. **Do old materials ever matter again?**
   - (a) never by hand, only as freight (recommended);
   - (b) each section also needs a small amount of every earlier material, delivered automatically: flavor only;
   - (c) yes, by hand. That would be management, and it is not advised.
5. **Solo and crowd scaling.**
   - (a) fixed costs plus diminishing returns on shared sources (recommended, about 6.5 h solo, 3 h for six);
   - (b) costs scale with the number of players present;
   - (c) a solo-only freight bonus.
6. **What is personal.**
   - (a) your stack and your plaque credit (recommended);
   - (b) plus a per-player cosmetic socket at stations;
   - (c) also a personal magnet or carry upgrade bought with your stack.
   - Note that (c) creates "I spent on me" tension. That suits principle 6, but some groups will feel it as selfish.
7. **How much the ball matters to income.**
   - (a) one source among several (recommended);
   - (b) the main source (Loop C), which suits principle 2 but bottlenecks on one ball;
   - (c) none.
8. **Does anything produce while nobody is online?** Helpers could bank freight from elapsed wall time, as a host-computed delta on load.
   - (a) no, ticks only (simple, the same as mushrooms today);
   - (b) yes, capped at one section's worth, which suits principle 9 ("Leave something for the next visitor").
   - Wall time in lockstep needs a host-stamped elapsed value via `setEnv`.
9. **What the material is called and how it looks.** Generic logs and ore read clearly; goofy names (the Boogler calls everything "som") add charm but blur the age identity. Pick per age, or keep real names and put the goofiness in the characters, as the v2 direction suggests.

---

## Sources

**Verified [V]**
- Anthony Pecorella, *The Math of Idle Games, Part I*, Game Developer: https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i
- Cookie Clicker, Wikipedia: https://en.wikipedia.org/wiki/Cookie_Clicker
- A Short Hike, Wikipedia: https://en.wikipedia.org/wiki/A_Short_Hike
- Dorfromantik, Wikipedia: https://en.wikipedia.org/wiki/Dorfromantik
- Katamari Damacy postmortem, Game Developer: https://gamedeveloper.com/design/postmortem-the-singular-design-of-namco-s-katamari-damacy-2004-
- Grow Home review, Destructoid: https://www.destructoid.com/review-grow-home/
- PowerWash Simulator devs, Kotaku: https://kotaku.com/powerwash-sim-devs-on-making-cleaning-fun-advanced-cro-1847319502
- Super Mario Odyssey hands-on (Motokura), Kotaku: https://kotaku.com/i-played-30-minutes-of-super-mario-odyssey-and-it-sure-1796037732
- Deep Rock Galactic Resources, wiki.gg: https://deeprockgalactic.wiki.gg/wiki/Resources

**Search summary only [S]**
- Vampire Survivors Magnet, Vacuum and gems: https://vampire.survivors.wiki/w/Magnet, https://vampire.survivors.wiki/w/Vacuum, https://vampire-survivors.fandom.com/wiki/Experience_Gem
- Hardcore Gamer Vampire Survivors review: https://hardcoregamer.com/reviews/review-vampire-survivors/428995/
- Twinfinite, hoovering gems (the page returned 403): https://twinfinite.net/features/hoovering-up-gems-in-vampire-survivors-is-my-new-happy-place/
- Pikmin carrying: https://pikminwiki.com/Carry, https://www.nintendo.com/en-gb/Support/Legacy-system/General-game-tips-613203.html
- Death Stranding 2 Auto-Paver: https://mapmaster.io/games/death-stranding-2-on-the-beach/guides/Auto-Paver
- Animal Crossing: NH currencies: https://www.nintendolife.com/guides/animal-crossing-new-horizons-bells-how-to-make-bells-fast-nook-miles-and-money-explained; New Leaf public works: https://nookipedia.com/wiki/Public_works_project
- Stardew bundles: https://stardewvalleywiki.com/Bundles
- Islanders review: https://awkwardmixture.blogspot.com/2024/05/islanders-challenging-casual-city.html
- Slime Rancher Plort Market: https://slimerancher.fandom.com/wiki/Plort_Market?oldid=6571
- Shapez: https://store.steampowered.com/app/1318690, https://archipelago.gg/games/shapez/info/en
- Juice it or lose it summary: https://gamejuice.pages.dev/articles/juice-it-or-lose-it-lessons
- Takahashi on scale, GamesRadar: https://gamesradar.com/wattam-director-keita-takahashi-gives-us-life-advice-and-an-ending-explanation
- Nodebuster, about 4 h to 100%: https://www.incrementaldb.com/community/review/5808
- Grow Up upgrades and crystals: https://gamegrin.com/reviews/grow-up-review
- R.E.P.O. reviews: https://www.gamingonlinux.com/2025/03/r-e-p-o-is-a-new-co-op-horror-game-with-silly-physics-currently-exploding-on-steam/page=1/
- Lethal Company quota: https://exputer.com/guides/lethal-company-how-does-quota-work/
- Peak backpack and stamina: https://www.epicdope.com/scouts-assemble-peak-the-ultimate-survival-guide
- Valheim co-op storage: https://pixeltwelve.com/articles/valheim-1-0-review-pixel-twelve
- Astroneer tethers: https://astroneer.wiki.gg/wiki/Tether
- A Dark Room: https://en.wikipedia.org/wiki/A_Dark_Room (not fetched)

**Not found.** Primary designer sources for Melvor Idle, Universal Paperclips stage design, Overcooked hand-offs, Islands of Insight and Townscaper's lack of resources. I searched for them and only got marketing pages or headlines, so they are not cited as evidence above.
