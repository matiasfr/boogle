# 8. How collecting works, contribution tiers, and casual play

*Research and design brief, 30 October 2026. It builds on SETTLED.md (treated as constraints) and brief 7 (the haul stack, the pacing budget and sync notes). It checks the design against today's game (`docs/game-design.md`: digging, the water sim and wash-ups are gone) and AGENTS.md (sync kinds, the controls registry, no new keys).*

**Markers.** **[V]**: I fetched the page and the wording matched. **[S]**: from a search summary, wiki or guide only.

**Two corrections to brief 7 come first.**
- Brief 7 has the ball smash iron veins and spin the sails for electric charge. SETTLED says the ball "never produces income", so both verbs are out. Every gathering verb below is either **walk-over** (the magnet) or **E / pad B through `registerInteractable`**. No ball, and no new keys.
- Brief 7 suggested driftwood along the shore as a log source. That is a wash-up, and wash-ups were removed, so it is out too.

---

## 0. What the precedents say (short)

**Optional participation in hangout games**
- **Webfishing** calls itself a "multiplayer chatroom-focused fishing game". You can buy a "fishing buddy" that catches fish for you [V, [Wikipedia](https://en.wikipedia.org/wiki/Webfishing)].
  - **Lesson:** the hangout comes first and the game is the thing your hands do while you talk. The automatic helper is a purchase, not a requirement.
- **Wobbly Life:** "There is no end to Wobbly Life … set your own objectives, do the jobs and missions you like". The first time you finish a job, race or mission you are "quite often … rewarded with a costume" [V, [LadiesGamers](https://ladiesgamers.com/wobbly-life-review/)].
  - **Lesson:** you choose the job, and the reward for trying something is cosmetic.
- **Sea of Thieves:** asked about classes, Mike Chapman said "are there roles in the game, are there classes so no, that doesn't feel like Sea of Thieves" [V, [Gaming Instincts](https://www.gaminginstincts.com/?p=7687)]. Coverage reports that progression is cosmetic, to keep "a level playing field" [S, [GamesRadar](https://gamesradar.com/sea-of-thieves-has-fully-embraced-power-levelling-according-to-the-design-director-its-not-what-you-think)].
  - **Lesson:** Boogle's lanes should be postures a player drifts into, never classes a player picks.
- **Peak:** "Why not make a game where the point is to hang out with your friends?" [V, headline quote, [PC Gamer](https://pcgamer.com/games/adventure/peak-boss-doesnt-mind-us-calling-it-friendslop-why-not-make-a-game-where-the-point-is-to-hang-out-with-your-friends)].
- **Lethal Company:** a crew often leaves one player on the ship on "camera duty". It is the most-loved non-scavenging role [S, [TV Tropes](https://www.tvtropes.org/pmwiki/pmwiki.php/VideoGame/LethalCompany), [GameSkinny](https://www.gameskinny.com/tips/lethal-company-beginners-guide-tips-and-tricks-and-a-whole-lot-more/)].
  - **Lesson:** a player who isn't hauling should still have something to watch and to say.
- **Animal Crossing:** Eguchi: "I didn't really want people to feel like they were being punished for not playing". In the same breath: "weeds do pop up, and cockroaches can appear in town if you haven't been there for a while" [V, [Game Developer](https://www.gamedeveloper.com/design/crossing-into-the-mainstream-katsuya-eguchi-on-i-animal-crossing-i-)].
  - **Lesson:** even the gentlest series punished absence. Boogle's "nothing decays" rule is stricter than Animal Crossing, and that is good.
  - Nook Miles+ tasks rotate, and the ones you skip just get replaced [S, [Game8](https://game8.co/games/Animal-Crossing-New-Horizons/archives/284589)]. Kyogoku: "Nook Miles is just a way to facilitate the discovery of ways to play" [S, mirror of The Verge].
- **Death Stranding:** Kojima: "Giving 'likes' is giving unconditional love". He says "I didn't want to give any negative in this game", and wants players to ask "What would people think if I put it here?" [V, [Game Informer](https://www.gameinformer.com/interview/2019/09/16/hideo-kojima-answers-our-questions-about-death-stranding)].
  - **Lesson:** credit, never debt. This is the plaque.
- **Grounded / Valheim:** Grounded's shared worlds restore progress "regardless of who hosts the world next" [S, brief 2]. Valheim groups commonly split into builders and fighters, and a casual player can "have a blast exploring and building" [S, guides]. Neither game protects a non-fighter from the bosses, which is the gap Boogle fills.

**Placement: wandering is collecting**
- **Mario Odyssey:** "Almost everything that draws the player's attention could potentially reward them with a Power Moon" [V, Kotaku via brief 7].
- **A Short Hike:** Robinson-Yu: "I'd just use collectables to draw players towards new areas of the map". Also: "every path you haven't explored yet provides the promise of something new to discover", and "learning the layout of an area is kind of rewarding on its own" [V, [Game Developer, Road to the IGF](https://www.gamedeveloper.com/disciplines/road-to-the-igf-adam-robinson-yu-s-i-a-short-hike-i-)].
- **Breath of the Wild:** triangle-shaped terrain "naturally obscure[s] the player's view", and a winding path "gradually reveals more and more intriguing sights". The team used tracking data to put points of interest where players weren't going [V, [Kotaku on CEDEC 2017](https://kotaku.com/breath-of-the-wilds-biggest-design-secret-lots-of-tria-1819113140)]. The Korok Mask makes seeds rustle when you're near [S, [Zelda Dungeon](https://www.zeldadungeon.net/?p=126854)].
- **Grow Home:** 100 crystals, with the jetpack at 20 [V, Destructoid via brief 7]. Crystals are "stuck all over the place", including inside the climbing tree [S, [TenTonHammer](https://www.tentonhammer.com/columns/five-tips-for-grow-home-ubisoft-s-new-platformer)].
- **Astro Bot:** missing crewmates are hidden in every level as collectibles [S, [Push Square](https://www.pushsquare.com/features/interview-the-making-of-astro-bot-the-ps5s-next-great-exclusive)].
- **Lesson for Boogle:**
  - Sources sit on what already draws the eye: trees, rocks, the mine, the windmills, the lighthouse.
  - New sources go where players don't go yet.
  - The thing you collect makes a sound when you're near (the Korok rustle).

**Ranks that don't shame**
- **Deep Rock Galactic:** promoting resets your class level to 1, and you get "a star above your icon". The first promotion unlocks Deep Dives, the Forge, Machine Events and a perk slot [V, [TheGamer](https://www.thegamer.com/deep-rock-galactic-how-to-promote-character/)]. Later promotions are mostly prestige [S, guides].
- **FFXIV Grand Company:** you buy ranks with seals, and your seal cap rises with rank. Second Lieutenant "Unlocks Player Housing, The Hunt, Adventurer Squadrons" [V, [Console Games Wiki](https://ffxiv.consolegameswiki.com/wiki/GC)].
  - **Anti-lesson:** a rank that unlocks a verb (housing) is a gate. Boogle's hard rule forbids it.
- **WoW guild reputation:** patch 5.0.4 removed the weekly cap [S, [Engadget](https://www.engadget.com/2012/08/29/limits-on-guild-leveling-and-reputation-removed-in-patch-5-0-4/)]. Joining a new guild now drops you one level instead of back to Neutral [S, [warcraft.wiki.gg](https://warcraft.wiki.gg/wiki/Guild_reputation)].
  - **Lesson:** caps and resets mostly punish late joiners.
- **Splatoon 3 catalog and Rec Room levels:** level-ups give banners, titles, emotes and clothing, "purely cosmetic" [S, [Game8](https://game8.co/games/Splatoon-3/archives/388957), [TrueAchievements](https://www.trueachievements.com/game/Rec-Room/walkthrough)].

---

## 1. Source table, per age

**Rules for every row**
- **One gathering verb, which is E or walk-over.** Pieces fly to you inside the magnet radius (1.5 m at the start), and your stack grows on your back.
- **Sources sit on things that draw the eye** and line the paths people already walk.
- **Refill has three modes, all deterministic Lockstep:**
  - **(R1) Every finished section refills every source in the current age** ("the island breathes out").
  - **(R2) A seeded trickle** refills one random empty source every 20 s. No player ever waits on it, because there are always more full sources than you need.
  - **(R3) Stateless emitters**, a pure function of tick and seed, like the windmill sails' shared clock. They need no refill at all.
- **What I rejected:** "refill when nobody is near". Player positions aren't Lockstep, so it would have to be a host-submitted op. Keep it as a later polish, not the base rule.
- **Helpers work their own station's patch,** never the player sources, so they never take what a player was walking toward.
- **Density comes from brief 7's hand rate.** Per player is the 3-player rate ÷ 3. The target is **one pickup moment every 30–60 s of ordinary wandering**, with about 3× more full sources on the island than the room needs, so you never hunt.
- **Fruit is unchanged.** Palms still drop fruit as a toy on their 4-minute regrow. Logs are a separate drop that refills by R1 and R2.

| Age · material | Where on the island | Verb (E or walk-over) | Refill | Density (rate per player → spacing) | Why it's fun on its own (juice) | New toy or art |
|---|---|---|---|---|---|---|
| **1 Wood · logs** | Every tree: 36 home palms, 55 coastal palms, 70 meadow trees. Deadfall bundles also sit under the meadow trees. | **E: shake** any tree (today's palm shake extended to every tree). 3–5 logs tumble out and land on the side you shook from. Deadfall is walk-over. | R1 + R2 | 5 logs/min each = one shake per ~50 s. ~160 trees, roughly one every 4 s of walking, so you pass ~10 per shake you need. | The trunk squashes and springs back, leaves burst, logs bounce with a wooden "tock" that rises in pitch as the stack grows, and the stack sways. | Deadfall mesh, a log-stack mesh with sway, shaking for non-palm trees. |
| **2 Iron · ore** | The old mine becomes real: its glowing veins and minecart. Boulders on lighthouse hill and the north-west massif (22 home rocks plus 55 mainland boulders). Ore glints inside the cave hub. | **E: crack.** 1–3 presses; the boulder wobbles, shows cracks and splits into 4–6 chunks. Walk into the **mine cart** and it rolls along its rails and tips a pile of 20 at the end. | R1 + R2. Boulders "settle back" with a pebble rattle. The cart reloads by R1 (one tip per section). | 13/min each = one crack per ~25 s. The mine is the dense ore room; boulders line the hill paths. | 40 ms hit-stop per press, sparks, a rising clink, and chunks that ting as they magnet in. | Three crack decal states, ore chunk mesh, the cart push (Owner, short rail). |
| **3 Steel · girders** (5 units each) | **Scrap heaps of the old iron line** along the route: every iron section that gets upgraded leaves a heap. A junk yard on **islet 1**. | **E: tug.** Yank a piece out and the heap topples, scattering 6 pieces. **Heave-ho:** two players pressing on the same heap within 1 s get double. Solo works fine, just slower. | R1 (a new heap per section upgraded) + R2 | 40 units/min each = one heap per ~45 s. Heaps sit at the work sites you're already visiting. | Comic topples, metal clang, and the stack goes heavy: a slower sway and a grunt on jumps. The old line feeds the new one. | Heap mesh, girder stack, the heave-ho check (both presses inside a window, validated in apply). |
| **4 Diesel/concrete · sacks** (10 units) | **Sand hoppers** along the beach and the west cove. A **gravel chute** at the windmill farm's ploughed field. | **E: pull the lever.** A chute spits 8 sacks that bounce onto you if you stand under it, and onto the ground if you don't. **Wagons:** walk your stack into a wagon's ring and it tips in; the work train hauls it (SETTLED: wagons from diesel on). | R1 + R2 | 110/min each = one pull per ~45 s. About 15 hoppers, one every ~40 m of shore. | The chute whooshes, sacks thump and squash, dust puffs, and the stack turns chunky. | Hopper and chute, sack mesh, the wagon ring (SETTLED). |
| **5 Electric · charge** (glass jars, 25 units) | The **windmill sails shed sparks** in time with their shared clock. At night sparks fall round the **lighthouse lamp**. Each finished electric section adds a **pylon** that sheds sparks too. | **Walk or jump through** a falling spark to catch it. An airborne catch counts double (a "zap"). | R3 (stateless, a pure function of tick) + new pylons per section | 330/min each = about 13 sparks/min. Each windmill emits one every ~3 s. Three mills give about 1.5× what the room needs, below the 3× rule, until the pylons from the first electric sections add the rest. | Crackle, your hair stands up (a cosmetic avatar wobble), jars glow brighter as the stack grows, and a static zap when you touch a friend. | Spark emitter, jar stack, pylon. |
| **6 Monorail · parts** (crates, 200 units) | **Balloon crates** launch from a tower on **islet 2** and drift over the island at height, then snag on treetops, the lighthouse gallery, mushroom caps and windmill tops. | **E: unhook** within reach: from the lighthouse deck, off a mushroom bounce, during a Boogler launch, or from a train roof. **Any balloon nobody unhooks sinks to the beach within ~60 s**, so ground players get every one too. | R3 (a launch schedule from tick and seed) + a new launcher per section | 1,000/min each = about 5 crates/min. Balloons are visible from anywhere. | Watching one drift, the pop when you unhook it, the crate's parachute flop, and a reason to climb or bounce. Mushrooms matter again. | Balloon crate, launch tower, drift path (pure function). |
| **7 Maglev · magnets** (shards) | The **risen route stones** hum and shed shard rings. **Meteorites** fall at night onto islets and hilltops, announced 30 s ahead by a streak across the sky (principle 7). | **Walk.** The magnet radius grows to about 8 m (brief 7's "vacuum"). **E on a humming stone** releases a ring of 30 shards. | R3 + R1 | 3,000/min each. The vacuum makes the whole island a pickup. | A whoosh of shards streaming to you, a deep hum, and a stack that levitates in a spiral instead of sitting on your back. | Shard swarm, meteor streak and crater, stone hum. |

**Islets and guarantee (a).**
- Islet 1 (steel) and islet 2 (monorail) need new terrain stamps in `shape.js`.
- Put each one **30–60 m offshore, inside the 18 m soft wall**. Swimming there takes 15–20 s at the swim speed (5.6 × 0.55 ≈ 3.1 m/s), and a Boogler launch also gets you there.
- **Rail adds a station to the islet; it is never the only way in.** If an islet can't be swimmable, drop it as a source place.

---

## 2. Three lanes: Builder, Rider and Bopper

A lane is a posture, not a class, in Sea of Thieves' sense. Players drift between lanes every few minutes. None of them is ever named or labelled on screen.

### Builder (pours)

- **Does:** shakes, cracks, tugs and catches, carries the stack and pours into the Track or Helper ring. Chooses which route to build next.
- **Gets:**
  - Contribution points (section 3) and their name on the plaque.
  - Tier perks: capacity, magnet radius, pour speed.
  - The satisfaction of watching the site build visibly.
- **Sees progress by:** sleepers appearing as they pour, and the machine run.
- **Guarantees:**
  - Nothing they carry is ever lost. A spill becomes a pile anyone can retake.
  - Nobody can spend their stack for them.

### Rider / Explorer (rides trains, finds things)

- **Does:**
  - Rides any finished section; the train loops on its own.
  - **Trackside grab:** E on a source within 3 m of the rail while riding takes it, like a mail hook. This is real gathering, not a spray.
  - Watches from the roof.
  - Finds the **discoveries** that advance ages (SETTLED). They are placed so you see them from the train or from an islet: a steam vent, a meteor crater, a humming stone.
- **Gets:**
  - Discovery credit: their colour pins on the station's island miniature, and "found by" on the plaque.
  - **Contribution points per discovery**, so riders climb the same ladder.
  - Stamps for every station visited (the hub proposal's stamp book).
  - Train cosmetics: a whistle tone, a roof flag.
- **Sees progress by:** every new section is a new ride. Ages advance because of what they found.
- **Guarantees:**
  - Riding never costs anything.
  - Every discovery can also be found on foot.

### Bopper (ball, mini-games, hanging out)

- **Does:** court ball, the soapbox run, the regatta, the Boogler, honking and lounging.
- **Gets:**
  - Personal rewards only: hats, ball skins and knacks (the hub proposal's som and stamps).
  - **Station bunting:** mini-game results decorate the newest station, with flags in the players' colours and a trophy on the platform. That is a communal cosmetic, never material.
  - Up to **tier 2** from mini-game play (section 3), so everyone wears the hard hat.
  - **The lever:** anyone can start a stocked machine run. It's one press and a big event, and boppers are often the ones near enough to do it.
- **Mini-games never give materials, helpers or freight.** That would be the "currency spray" in disguise. They also never speed up a section.
- **Sees progress by:**
  - Runs are announced island-wide: a whistle about 30 s ahead, and the camera nudges toward the site for anyone in range.
  - The train passes the court.
  - New station characters wander to the court and watch games. The island model at the court shows the line growing.
- **Guarantees:**
  - Never blocked: the ball, the court, islets, caves and all toys work at any tier and in any age.
  - Never judged: there is no per-player readout, and there are no prompts like "the site needs you".

**What "never judged" means in practice:**
- The plaque lists names only, never zeros.
- Tier shows only as cosmetics on your own avatar, and you can take them off.
- No leaderboard of contribution exists anywhere.
- The miniature shows pins for discoveries, never pins for absence.

---

## 3. Contribution tier ladder

**What counts, with everything normalized so ages compare.**
- **1 point = 1 % of the current age's section cost**, poured into either ring. Pouring to the Helper counts the same as Track.
  - A wood log is worth 1.67 points (1 % of a section is 0.6 logs). A maglev magnet is worth 0.0022 points (1 % of a section is 450 magnets).
  - A newcomer in maglev climbs as fast as a founder did in wood.
- **Discovery found:** 50 points, to the finder plus anyone within 10 m (automatic co-op, principle 4).
- **Starting a machine run:** 5 points.
- **Mini-games:** 10 points per session played, counting only up to tier 2.

**Thresholds, lifetime per room, only ever rising.**
- A whole game is about 36 sections plus about 21 helpers at 0.6 of a section ≈ 49 sections' worth ≈ 4,900 points, plus about 1,000 from discoveries.
- So three steady builders each reach roughly tier 6, and a solo builder reaches tier 7 in the maglev age.

| Tier | Name | Points | Reward (class) |
|---|---|---|---|
| 1 | Hand | 25 | Hard hat (cosmetic); magnet 1.5 → 1.8 m (convenience) |
| 2 | Porter | 100 | Soft cap 20 → 22 (capacity); pour drain +25 % (speed) |
| 3 | Navvy | 300 | Soft cap → 24; magnet → 2.2 m; a jump spills 1 piece instead of the top 3 (convenience). **The last tier with any stat.** |
| 4 | Ganger | 600 | Neckerchief in your colour; your pours ring a bell at the site (cosmetic) |
| 5 | Foreman | 1,000 | Hi-vis vest and a stack skin (cosmetic); your stack never spills while riding a train (convenience) |
| 6 | Engineer | 1,600 | Your own whistle tone on any train you ride (cosmetic); "Call the handcar" at station boards (convenience, below) |
| 7 | Stationmaster | 2,500 | Your name painted on the next locomotive, and a cap with a gold band (cosmetic) |

**Hard rule, checked row by row.** Every reward is speed, capacity, cosmetics or convenience. Nothing in the ladder is the only way to reach a place or perform a verb.
- The handcar only saves walking. Every station can be reached on foot, by swimming and by train.
- Stats stop at tier 3 and are small: +4 capacity, +0.7 m of magnet, faster pouring. A late joiner reaches tier 3 after 3 sections' worth of pouring alone, or about 9 sections when three people share the sites (each gets about 33 points per section). Because the stats are this small, the gap barely shows while it lasts.

**Mobility flag.**
- **No upgrade adds a key.** "Call the handcar" is an Interact target at station boards (`registerInteractable`). Spill protection and the magnet are passive.
- **Any mobility or input perk touches `src/player/controls.js`,** the registry and its contract. Movement itself lives in `src/player/input.js` and `src/player/player.js`.
- If a walk or sprint speed perk is ever wanted:
  - keep it **≤ 10 %** and make it a passive multiplier in Local physics (Owner, so it needs no sync);
  - change any input through `wrapAction`, never a new slot;
  - mind the slots: D-pad ↓ is borrowed by the update toast, so only ↑ and → are claimable, and one must stay free.
- **Lean: no speed perk at all.** It is the one perk that makes a Rider feel slower than a Builder.

**Per-age reset or lifetime?** **Lifetime.** A per-age reset (DRG-style) would put everyone visibly back at zero every age. Requirement (c) rules that out, and WoW's cap removal shows resets mostly punish late joiners. A lifetime ladder that only rises, shows only on your own avatar, and stops giving stats at tier 4 doesn't judge anyone.

**Where tier lives.**
- **Derived from Lockstep plaque tallies** (section 5): each tab sums its own stable player id.
- So it survives a cleared browser on the same room snapshot, and it can't drift from the plaques.
- The mini-game credit, capped at tier 2, lives in localStorage.

---

## 4. Pacing re-run for casual rooms

**Model** (scratchpad `sim/pace3.py`, `sim/pace4.py`).
- Brief 7's costs, hand rates and section count, plus 2.5 min of runs and walking per section and 3 min per age beat.
- Builders buy 3 helpers per age (each costs 0.6 × the section and adds 0.15 × the 3-player hand rate).
- **A new rule, not just a calibration: "the age turnover re-tools every helper at ×2 output" in the new material.** Brief 7's freight column carries helpers over at ×1 (6 → 6 at the wood/iron boundary). With ×1, my sim gives 4.6 h, mainly because it charges helper purchases inside section time and brief 7's column apparently didn't. ×2 lands brief 7's 4 h (×3 gives 3.5 h). This changes brief 7's freight numbers, so it is open question 9.
- One active player of three works at the solo rate, 1/2.4 of the group rate (brief 7's diminishing returns).

**The finding.**
- "Helpers alone can't finish a section" is only true **at the very start**, before anyone has bought a helper, or in a room where nobody ever pours into a Helper ring.
- Once a few helpers exist, an open room with nobody pouring finishes a section every **6–13 min at the start of an age and 4–6 min at the end**.
- So the fix is a **floor, not a faster rate**:
  - **Starter crew:** the first station's character arrives with one helper.
  - **Station worker:** each finished section's character works at **a quarter of a helper's rate**. The Helper ring still sells full helpers.

| Scenario | Wood | Iron | Steel | Diesel | Electric | Monorail | Maglev | **Total** | First-section collect (wood → maglev) |
|---|---|---|---|---|---|---|---|---|---|
| **Baseline (brief 7, calibrated)** | | | | | | | | | |
| 3 active | 33 | 35 | 33 | 37 | 37 | 32 | 32 | **240 min (4.0 h)** | 6.4 → 4.4 min |
| 1 active of 3 | 53 | 47 | 43 | 46 | 45 | 39 | 39 | **312 min (5.2 h)** | 15.4 → 6.4 |
| 0 active, room open, no helpers yet | ∞ | | | | | | | **never** | ∞ |
| **Lean: starter crew + quarter-rate station worker** | | | | | | | | | |
| 3 active | 30 | 32 | 31 | 34 | 34 | 29 | 29 | **219 min (3.65 h)** | 5.6 → 3.6 |
| 1 active of 3 | 43 | 40 | 37 | 39 | 39 | 33 | 33 | **265 min (4.4 h)** | 11.3 → 4.9 |
| 0 active, room open (helpers only) | 94 | 93 | 83 | 87 | 84 | 69 | 70 | **580 min (9.7 h)** | **26.7 → 12.8** |

**Helpers-only minutes per section** (room open, nobody pours, helpers as a 3-active group would have built them):

| | Wood | Iron | Steel | Diesel | Electric | Monorail | Maglev |
|---|---|---|---|---|---|---|---|
| Baseline, age start → end | ∞ → 9 | 13 → 6 | 9 → 5 | 7 → 4 | 7 → 4 | 6 → 4 | 6 → 4 |
| Lean, age start → end | 27 → 4 | 7 → 3 | 5 → 3 | 4 → 2 | 3 → 2 | 3 → 2 | 3 → 2 |

**How to read it.**
- **The test for 0 active is minutes per section, not total hours.** A room of pure boppers is not "a group". Requirement (b) is met if a section completes within one sitting, and with the lean the worst case is **27 min** (the very first section) and typically 13–20 min. A two-hour evening of only ball and mini-games sees about 6–8 sections built by the little workers.
- **Helpers stock sections but never advance an age.** A Rider or Bopper still has to find the discoveries (SETTLED). That is the lanes working as designed, not a hole: a pure-bopper room builds every section in an age, then waits at the age beat until someone stumbles on the lead.
- **1 active of 3 lands at 4.4 h**, inside the 8 h ceiling. A solo player is the same row.
- **The lean shortens the 3-active game to 3.65 h.** Raise section costs by about 10 % to get back to 4 h.
- **Room empty (offline):** keep SETTLED's cap of one section's worth, banked into the current site's **Track ring only**. The machine waits stocked and glowing, and the first person back pulls the lever, which makes a welcome-back moment.
  - It needs the host to stamp the elapsed time through `setEnv` at load and to read `world.epochMs`, which nothing reads today (game-design 8.6).
  - It also needs the snapshot server to be deployed, which is unbuilt infrastructure, not a design detail.
- **The cost of the lean:** a free worker per section weakens the "Track or Helper" trade-off a little. Frame it as "the station character works slowly; the Helper ring hires real crews", and keep it at a quarter rate so a bought helper is always 4× better.

---

## 5. Sync kinds for what's new

| State | Kind | Shape and notes |
|---|---|---|
| Sources: trees, boulders, heaps, hoppers, humming stones | **Lockstep** | A static layout plus a `Uint8` "charges left" per source in `src/sim/sources.js` + test. Op `src.take {id}`; the result says how many pieces dropped, and the adapter spawns the Local pieces in `onApplied`. R1 refills in `onApplied` of a section finishing (rules), R2 refills on a seeded tick. Keep it out of `gifts`, which has a 48-item cap. |
| Pieces flying into your stack | **Local** | Pure decoration of the take result. A take goes **straight onto the taker's stack** (the count is in the result, added in `onApplied`). |
| Loose piles (spills, overflow, a contested shake's second taker, the minecart dump, balloons that sank to the beach) | **Lockstep** integer piles: `pile.drop {i, j, n}`, `pile.take {id}`, merged when near, capped (brief 7) | Anyone can retake a pile. This backs every "nothing is lost" guarantee. A pile holds whole units; it is drawn as Local pieces. |
| Stateless emitters: sparks, balloons, meteors | **Lockstep without state** for the schedule, plus a small **taken set** per time window (`emit.take {k, n}`, where k is the emission index) | Like the tide, the visuals read the same function. Prune the taken sets older than the emission lifetime so snapshots stay small. |
| Your stack | **Local** in localStorage + **Owner** presence `st: n` | As in brief 7. The getter returns `null` when the stack is empty. |
| Pours, plaque tallies | **Lockstep** | `site.stock {site, socket, n}` normalized to points in rules. The plaque is `[[pid, pts], …]` per site. **This is new to Lockstep: a player id in state.** Use a short stable id from localStorage (`boogle.pid`, 8 chars), never the PeerJS id, and keep it additive. |
| Tier | **Derived** (each tab sums its own pid in the plaques), plus Owner presence `tr` for the cosmetics | No new authority. |
| Helpers and station workers | **Lockstep** (count per site; freight on ticks) | The walking workers are Local animation driven by that state. |
| Discoveries | **Lockstep** bitset, plus the finder pids | As in brief 3. |
| Station bunting from mini-games | **Lockstep** (small, persistent) | Op `bunting.add {station, color}`, rate-limited and capped per station. |
| Mini-game knacks, hats, credit toward tier 2 | **Local** (localStorage) + presence for what you wear | Principle 6. |
| Heave-ho tug | **Lockstep** | Apply can't double the first tug after the fact. So **a second `src.take` on the same heap within 10 ticks of the first, by a different pid, yields triple**; apply checks the heap's last-take tick and pid. |
| Offline bank | **Lockstep**, from host `env.elapsed` | Capped at one section, applied once at load. |

**Risks**
1. **"Never judged" leaks through tier cosmetics.** Not wearing a hard hat can read as "slacker". Mitigation: tier 2 is reachable from mini-games, every cosmetic is optional, and there is no tier readout on other people.
2. **0-active progress could make builders feel unnecessary.** The table keeps builders 2.6× faster than a room of only helpers. Watch for it in playtests.
3. **Islets are new terrain.** If either can't be reached by swimming, it can't hold a source.
4. **Offline accrual depends on infrastructure that isn't deployed** (`epochMs`, the server).
5. **Contention:** two players shaking one tree. The host stamps the first taker. The loser's pieces still fall as a pile, so both laugh and nobody "lost" anything.
6. **Snapshot growth** from plaques, taken sets and source arrays. Budget about 5 KB at the maglev age against the 250 KB cap.
7. **Mixed builds:** every new op and state is additive (AGENTS.md), so old tabs ignore them.

---

## 6. Open questions

1. **How do sources refill?**
   - (a) R1 + R2 + R3, all Lockstep.
   - (b) Add "refill when unwatched" as a host-submitted op.
   - (c) Continuous only.
   - **Lean: (a), with (b) later as polish.**
2. **A floor for helpers-only rooms?**
   - (a) A starter crew plus a station worker at a quarter rate.
   - (b) A starter crew only.
   - (c) No floor: a pure-bopper room just doesn't build.
   - **Lean: (a).** (c) fails requirement (b) at the start.
3. **Do mini-games count toward tiers?**
   - (a) Yes, capped at tier 2.
   - (b) No, never.
   - (c) Uncapped.
   - **Lean: (a).** Everyone gets the hat, and stats still come from contributing.
4. **Lifetime or reset?**
   - (a) Lifetime per room.
   - (b) Lifetime global.
   - (c) Reset per age, with DRG-style stars.
   - **Lean: (a).** The railway belongs to the room. Cosmetics you earned stay global in localStorage.
5. **Is there any mobility perk?**
   - (a) None.
   - (b) +10 % sprint while stacked.
   - (c) A handcar call (convenience).
   - **Lean: (a) + (c).** No speed stat.
6. **Who gets credit for a discovery?**
   - (a) The finder plus everyone within 10 m.
   - (b) The finder only.
   - **Lean: (a)**, from principle 4.
7. **Does the rider's trackside grab exist?**
   - (a) Yes, E within 3 m of the rail.
   - (b) No, riding is pure sightseeing.
   - **Lean: (a).** It gives riders a reason to look out of the window. Tune the reach if it dominates.
8. **Should an offline bank run the machine by itself?**
   - (a) No: it waits stocked, and the first person back pulls the lever.
   - (b) Yes, it runs automatically.
   - **Lean: (a).** It turns the return into an event, the "leave something for the next visitor" moment (principle 9).
9. **How do helpers carry over at an age turnover?**
    - (a) Re-tool at ×2 (this brief's model, which lands about 4 h).
    - (b) ×1 as in brief 7, plus about 15 % cheaper sections.
    - (c) ×3, keeping full relative strength, which comes in under 4 h.
    - **Lean: (a).** It makes the age evolution feel like an upgrade to everything you own.
10. **Tier names.** Railway trades (Hand → Stationmaster) or Boogler-goofy ones? **Lean: railway trades**, with the Boogler mispronouncing them in his lines.

---

## Sources

**Verified [V]**
- Webfishing, Wikipedia: https://en.wikipedia.org/wiki/Webfishing
- Wobbly Life review, LadiesGamers: https://ladiesgamers.com/wobbly-life-review/
- Mike Chapman interview, Gaming Instincts: https://www.gaminginstincts.com/?p=7687
- Peak, PC Gamer (headline quote only): https://pcgamer.com/games/adventure/peak-boss-doesnt-mind-us-calling-it-friendslop-why-not-make-a-game-where-the-point-is-to-hang-out-with-your-friends
- Katsuya Eguchi, Game Developer: https://www.gamedeveloper.com/design/crossing-into-the-mainstream-katsuya-eguchi-on-i-animal-crossing-i-
- Hideo Kojima, Game Informer: https://www.gameinformer.com/interview/2019/09/16/hideo-kojima-answers-our-questions-about-death-stranding
- A Short Hike, Road to the IGF, Game Developer: https://www.gamedeveloper.com/disciplines/road-to-the-igf-adam-robinson-yu-s-i-a-short-hike-i-
- Breath of the Wild triangles (CEDEC 2017), Kotaku: https://kotaku.com/breath-of-the-wilds-biggest-design-secret-lots-of-tria-1819113140
- DRG promotion, TheGamer: https://www.thegamer.com/deep-rock-galactic-how-to-promote-character/
- FFXIV Grand Company, Console Games Wiki: https://ffxiv.consolegameswiki.com/wiki/GC
- Super Mario Odyssey (Motokura), Kotaku, and Grow Home, Destructoid: via brief 7

**Search summary only [S]**
- Sea of Thieves "level playing field", GamesRadar: https://gamesradar.com/sea-of-thieves-has-fully-embraced-power-levelling-according-to-the-design-director-its-not-what-you-think
- Lethal Company camera duty: https://www.tvtropes.org/pmwiki/pmwiki.php/VideoGame/LethalCompany, https://www.gameskinny.com/tips/lethal-company-beginners-guide-tips-and-tricks-and-a-whole-lot-more/
- Nook Miles+: https://game8.co/games/Animal-Crossing-New-Horizons/archives/284589; Kyogoku quote via a mirror of The Verge interview (theverge.com was not fetchable)
- Korok Mask and seed origins: https://www.zeldadungeon.net/?p=126854; the "never meant to find them all" fan theory: https://www.gamesradar.com/zelda-breath-of-the-wild-has-a-ridiculous-amount-of-korok-seeds-because-you-were-never-meant-to-find-them-all
- Grow Home crystals: https://www.tentonhammer.com/columns/five-tips-for-grow-home-ubisoft-s-new-platformer
- Astro Bot: https://www.pushsquare.com/features/interview-the-making-of-astro-bot-the-ps5s-next-great-exclusive
- WoW guild reputation: https://www.engadget.com/2012/08/29/limits-on-guild-leveling-and-reputation-removed-in-patch-5-0-4/, https://warcraft.wiki.gg/wiki/Guild_reputation
- Splatoon 3 catalog: https://game8.co/games/Splatoon-3/archives/388957; Rec Room levels: https://www.trueachievements.com/game/Rec-Room/walkthrough
- Valheim casual play: https://twinfinite.net/pc/4-features-that-set-valheim-apart-from-other-survival-games/3/; Grounded shared worlds: brief 2

**Not found.** I found no primary source on Webfishing's design intent, Peak's carry design, Rec Room's hangout-room rewards, or Nintendo's reason for having 900 Koroks.
