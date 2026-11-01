# Roblox patterns: what today's top games do, and what Boogle can take

*1 November 2026. Research for the owner, who sees today's top Roblox games as the state of the art in pure mechanics. Covers the games most played on 1 November 2026 (checked on two live trackers that day, not assumed), the 2025 record-breakers, Roblox's own published guidance on what its recommendations reward, and benchmark data. Builds on [0.1/9-brainrot-hooks.md](0.1/9-brainrot-hooks.md) ("rarity done kindly"), which already covers Steal a Brainrot's rarity ladder, Grow a Garden's mutations, Pet Simulator 99, Adopt Me's Neon ladder and Bee Swarm; this report doesn't repeat those and points to it instead. Read beside [boogle-2.md](../proposals/boogle-2.md) (wary of material grinds, nothing decays, personal rewards only, every system ignorable), [DESIGN.md](../../DESIGN.md), [progression-models.md](progression-models.md) and [minigames-and-physics-minigames.md](minigames-and-physics-minigames.md). **[V]**: I fetched and read the linked page this session. **[S]**: from a search engine's summary, or a fan guide other guides contradict. Fan guides for these games disagree a lot, and live charts change hourly: every number is a snapshot. Recommendations only; nothing here is a decision.*

## Summary

1. **The chart, 1 November 2026:** Steal An Egg (~1.0M playing), Brookhaven RP (650K), Murder Mystery 2 (445K), Blox Fruits (420K), Adopt Me (301K), RIVALS (280K), 99 Nights in the Forest (269K), DONT SPLASH (164K), Steal a Brainrot (151K), then Fisch, Dress to Impress, Throw Food For Animals and Pet Simulator 99 within the top 20. The 2025 giants (Grow a Garden 22.3M peak, Steal a Brainrot 25.4M) have faded, as Naavik predicted spikes would.
2. **The dominant 2025–26 loop is "run out, grab, carry it home, it earns":** Steal a Brainrot, Steal An Egg, Escape Tsunami For Brainrots and Throw Food For Animals all share it. The tension sits in the trip home, and in Escape Tsunami the threat is a wave, not other players. That's the kind version, and it's Boogle's haul with weather.
3. **Roblox ranks games per user, not in total.** Its recommendations reward play-through, *not* bouncing in the first 60 s, the number of separate days a player comes back (up to day 28), playtime (capped at 60 min a day), and days spent playing with friends on purpose. Roblox itself says to fix the core loop before monetisation.
4. **Fun in the first five minutes, starter items, and short, medium and long goals** are Roblox's official onboarding advice. Brookhaven, the #2 game, gives you everything up front with no progression at all, and has you playing in about a minute.
5. **Sessions are short and come back often:** the median Roblox session is 6.6 minutes and the median daily playtime 16.8 minutes. Games whose sessions run 19–24 minutes retain about twice as well on day 1 as 0–3-minute ones (GameAnalytics, 2025).
6. **Co-op runs with a persistent personal unlock** are the other big family: 99 Nights (camp, lost children, Diamonds buy classes), Dead Rails (fuel and defend a train for 80 km, Bonds buy classes), DONT SPLASH (cross the water quietly), Doors. A *shared vehicle you feed by carrying things to it* (Dead Rails' furnace) is the closest thing on Roblox to Boogle's wagon.
7. **Offline growth was Grow a Garden's novelty** ("a novel concept for Roblox", Jandel). It's already DESIGN.md principle 9. Roblox shows it as numbers; Boogle should show it as a changed place.
8. **Live events carry these games:** weekly updates (Grow a Garden, 99 Nights, Brookhaven, Adopt Me), "admin abuse" chaos hosted by the developer, and rituals players start themselves (three players in a triangle start a Steal a Brainrot event). The healthy core is *a ritual anyone can start that changes the world for a minute*. The rest is FOMO.
9. **Why it spreads:** moments worth clipping (a last-second escape, a rare hatch, chaos), creators on YouTube and TikTok, kids playing what their classmates play, and friends. Roblox says sessions with friends run 1.9× as long as solo ones. Much of the clip economy is upset children losing things to theft, which Boogle must never build.
10. **For Boogle, five patterns fit and each has a small variant of an existing prototype:** a telegraphed wave on the haul (`haul&v=wave`), stoking the wagon (`wagon&v=stoke`), building a cart and then launching it (`soapbox&v=kit`), throwing to lure critters with a timed release (`minis&v=lure`), and a world that visibly moved on while you were away (`build&v=away`). Stealing, stat treadmills, restock timers, rebirth resets, trading, voting and paid luck all conflict; most have a kind version, listed in part (b).

---

## 1. What is played now

### 1.1 The live chart

Two trackers agreed within minutes on 1 November 2026, around 16:35 UTC; Roblox had about 17.3M concurrent players across 21K live experiences [V, [RoWatcher](https://rowatcher.com/roblox-player-count), [livecounts.nl](https://livecounts.nl/roblox-charts/)]:

| # | Game | Playing | Peak since 23 Sep 2026 (livecounts) | Family |
|---|---|---|---|---|
| 1 | Steal An Egg | 1.03M | 13.8M (26 Sep) | carry-home tycoon |
| 2 | Brookhaven RP | 650K | — | free roleplay |
| 3 | Murder Mystery 2 | 450K | 2.2M (25 Oct) | social deduction rounds |
| 4 | Blox Fruits | 400–420K | 0.93M (31 Oct) | level grind, combat |
| 5 | Adopt Me! | 301K | 1.37M (3 Oct) | pet raising, trading |
| 6 | RIVALS | 280K | — | shooter |
| 7 | 99 Nights in the Forest | 269K | 2.16M (17 Oct) | co-op survival run |
| 8 | DONT SPLASH | 164K | — | co-op horror obby |
| 10 | Steal a Brainrot | 151K | 1.31M (26 Sep) | carry-home tycoon |
| 11 | Break and Steal an Egg | 146K | 1.31M (18 Oct) | clone of #1 |
| 13 | Fisch | 126K | — | fishing collection |
| 15 | Dress To Impress | 112K | — | dress-up and runway voting |
| 17 | Throw Food For Animals | 107K | — | throw-to-attract tycoon |
| 19 | Pet Simulator 99 | 93K | — | egg hatching |

- Half the top 20 had a Halloween tag in their names that day: a seasonal event is the default state of a top game.
- **All-time records:** Steal a Brainrot is the only game past 25M concurrent (25.4M, October 2025); Grow a Garden peaked at 22.3M (23 August 2025); their mock "admin war" that day put the platform at 47.4M [V, [Wikipedia: Steal a Brainrot](https://en.wikipedia.org/wiki/Steal_a_Brainrot), [Wikipedia: Grow a Garden](https://en.wikipedia.org/wiki/Grow_a_Garden)].
- **Spikes fade.** Naavik calls Grow a Garden and the brainrot wave "a spike rather than a trend"; Roblox's DAU has fallen three quarters in a row, and the recommendation engine moved from a 7-day to a 28-day view, which favours games that keep players over games that monetise hardest [V, [Naavik: Roblox's expensive year](https://naavik.co/digest/robloxs-expensive-year-of-good-intentions/)]. Grow a Garden dropped from 21.3M to 7.6M within an hour of its peak [V, Wikipedia]. A sequel, Grow a Garden 2 (June 2026), started everyone fresh and added guilds and theft defences [S, [TechWiser](https://techwiser.com/grow-a-garden-2-changes/)].
- **Audience:** under 13 is 35%, 13–17 38%, 18+ 27% and growing fastest [V, [Naavik: State of UGC Games 2026](https://naavik.co/deep-dives/the-state-of-ugc-games-2026/)].

### 1.2 What Roblox itself says it rewards

The Creator Hub lists the signals behind "Recommended For You", counted only for players who arrived from it and averaged per user [V, [Creator Hub: Discovery](https://create.roblox.com/docs/discovery)]:

- **Most important:** play-through rate; first-play bounce (a negative signal, measured at under 60 s and at 61–180 s); play days per user (D1, D2–7, D8–28); playtime per user, capped at 60 minutes per game per day.
- **Important:** *intentional co-play days* (days a player returns to play with friends through joins, invites or private servers), qualified sessions, spend days, Robux spent.
- **Advice:** "focus on creating a high-quality, engaging game"; when retention is low, fix core gameplay before monetisation.

Onboarding and engagement guidance [V, [Onboarding](https://create.roblox.com/docs/production/game-design/onboarding), [Engagement](https://create.roblox.com/docs/production/analytics/engagement)]:

- "Ensure users have fun within the first five minutes."
- Players should know "what they are expected to do and why they should do it."
- Replace long tutorials with short hints that appear when a player reaches a feature.
- Give starter items or currency, keep the first levels quick, and set short-, mid- and long-term goals.
- End onboarding with a designed "moment of joy".
- Design for group play, and remove barriers to social interaction.

Friends: Roblox's friend-referral announcement says "co-play sessions are typically 1.9 times longer than solo sessions" (as of Q2 2024), and the feature lets a game reward whoever invited a friend [V, [DevForum](https://devforum.roblox.com/t/announcing-the-new-friend-referral-system-for-your-experiences/3623795)].

### 1.3 Benchmarks

From GameAnalytics' 2025 Roblox report [V, [GameAnalytics](https://www.gameanalytics.com/reports/2025-roblox-report)]:

| | P25 | Median | P75 | P90 |
|---|---|---|---|---|
| Session length (min) | 2.4 | 6.6 | 14.5 | 26.4 |
| Daily playtime (min) | 6.6 | 16.8 | 34.6 | 64.9 |

- Sessions per day: a median of about 2, and 6 at the 90th percentile.
- **Day-1 retention climbs with session length:** a median of 4.3% for games whose sessions run 0–3 minutes, 11.5% for 19–24 minutes. The 95th percentile at 19–24 minutes is 23.6%.
- **Day-30 retention is tiny everywhere:** a median of 0.1–0.5%. Roblox games are dipped into.

**For Boogle:** a game that lands on its toy in seconds and holds a 15–25 minute session is in Roblox's best-retaining band. Boogle's "1–3 evenings per era" assumes much longer sessions than the Roblox median, so every era step also has to give something in a 6-minute visit.

---

## 2. Game by game

Only what's new beyond brief 9.

### Steal An Egg (July 2026; #1 today)
- **Loop.** Train Speed (a treadmill you can stand on AFK), run to a biome, grab an egg from the animal guarding it, and run back to your pen while it chases you. The egg hatches into a pet that earns cash per second, and the cash buys treadmill and pen upgrades. Each biome has a speed threshold [V, [games.gg](https://games.gg/roblox/guides/steal-an-egg-beginner-guide/)].
- **Threats on the way home:** a guardian that catches you ragdolls you and makes you drop the egg; other players can take an egg off you while you carry it or raid your pen [V, [clip.dor.gg](https://clip.dor.gg/en/blog/steal-an-egg-roblox-guide)] [S, [TechWiser](https://techwiser.com/roblox-steal-an-egg-wiki/)].
- **Rarity:** rare eggs on a five-minute spawn cycle, Secret eggs announced in chat; badge counts on 28 October: Secret 91M holders, Eternal 62M, Divine 12.6M. Servers hold 7 [V, clip.dor.gg; games.gg].
- **What's new:** it splits the brainrot loop into *reach* (a speed stat that opens farther biomes) and *the trip home* (a chase with a ragdoll failure). The ragdoll drop is slapstick; the reach stat is a treadmill grind.

### Escape Tsunami For Brainrots (2025–26)
- **Loop.** Run down a track while tsunami waves sweep it, grab brainrots, and get back to base before a wave catches you. Two upgrade lines, speed and carry. Rebirth resets speed but keeps your brainrots and money. Income keeps coming while offline [S, [Beebom](https://beebom.com/escape-tsunami-for-brainrots-walkthrough-beginners-guide), [GamerTweak](https://gamertweak.com/rebirth-escape-tsunami-for-brainrots/)].
- **What's new:** it keeps the carry-home tension and **makes the world the antagonist**. Naavik names it with 99 Nights as one of the newer hits that took over from the 2025 giants [V, Naavik UGC 2026].

### Throw Food For Animals (#17 today)
- **Loop** (the official description): throw food as far as you can, animals come to where it lands, collect them, and place them to earn. Better food draws rarer animals, pull-up stands train Throw Power, and new areas hold stronger animals [V, [Roblox page](https://www.roblox.com/games/120219252362013/Throw-Food-For-Animals)].
- **The throw:** hold to charge and release to throw; a near-perfect release gives a one-throw bonus. Where the food lands decides what comes. "Server Luck" is a boost shared by the whole server [V, [throwfoodforanimals.com](https://throwfoodforanimals.com/guides/how-to-play/), a fan guide that says it wasn't checked in game].
- **What's new:** **the throw is the core verb**, and a lure turns it into collecting. That's the closest top-20 game to Boogle's own verbs.

### Steal a Brainrot, now
- Brief 9 has the loop. New since then: a Bruno Mars concert in January 2026 peaked at 12.8M concurrent [V, Wikipedia].
- Beebom credits the "admin abuse" chaos ("Chaos of the admin events started to become content") and three-player summoning rituals that "reward trust, timing, and communication" [V, [Beebom](https://beebom.com/robloxs-steal-a-brainrot-delivered-a-2025-masterclass-in-player-engagement-and-gave-uefn-a-second-wind/)].
- Wikipedia notes clips of upset children losing brainrots spread widely on TikTok and YouTube [V].

### Grow a Garden (2025), now
- **History.** A 16-year-old made it in three days; Jandel's studio partnered at about 500–1,000 concurrent players and started weekly updates [V, [GamesBeat](https://gamesbeat.com/janzen-madsen-interview/), Wikipedia].
- **Jandel's view:** crops growing while you're away were "a novel concept for Roblox", and the theme is "as generic as you can get", since people have always liked watching things grow [V, GamesBeat].
- **Monetisation:** Robux speeds up waits and can steal crops. Weekly exclusive items must be claimed while online, and rare items are sold for real money off-platform [V, Wikipedia].
- **Pulling back from weekly events.** Weekly events were "becoming difficult" to keep fresh; the team shifted to "adding more depth into farms" [S, [Jandel on X](https://x.com/jandelRblx/status/1954194818537820297)].

### Brookhaven RP (#2; 1.3M record in December 2025)
- **Design.** No levels, quests or required currency. Claim a house, take a vehicle, pick a cosmetic job and start playing in about a minute. Over 115 properties and 190 vehicles, 24+ vehicles free [V, [RoWatcher](https://rowatcher.com/news/what-is-brookhaven-rp-why-400k-players-choose-roblox-s-biggest-game)].
- **Running it.** Weekly updates, usually on Fridays. Money comes from gamepasses for premium cars and houses. Its creator sold it to Voldex in February 2025, unable to keep it going alone [V, RoWatcher].
- **Scale.** It averaged more monthly hours in 2025 than all of Fortnite Creative [V, Naavik UGC 2026].
- **What's new:** proof that **tools up front with no progression** can be the second biggest thing on the platform. It's a dollhouse.

### 99 Nights in the Forest (#7; Fortnite version too)
- **Run.** Up to 25 per server. Days last a few minutes: by day you gather wood, coal and fuel; by night you defend the campfire, whose light keeps the Deer away. Rescuing lost children and building beds raise a day multiplier, so the 99 days go faster [V, [games.gg](https://games.gg/99-nights-in-the-forest/)].
- **Between runs:** Diamonds (from chests, strongholds and late nights) buy classes with perks [S, brief 9's sources].
- **Developers.** A three-person New Zealand team. They kept a strict weekly update schedule [S, [PC Gamer](https://www.pcgamer.com/games/survival-crafting/with-a-peak-player-count-of-14-2-million-99-nights-in-the-forest-has-an-audience-other-multiplayer-games-would-kill-for-to-find-these-behemoth-playerbases-you-need-to-be-on-a-platform-like-roblox/)]. At RDC 2026 they said they'd keep human artists and deliberate "little quirks", and advised "Don't be afraid to fail" and "trust your instincts" [V, [PCGamesN](https://www.pcgamesn.com/roblox/99-nights-in-the-forest-interview)]. A 20th Century Studios film is in the works [S].
- **What's new:** a **shared fire as the run's meter**: what you carry back makes the safe circle bigger. That's Boogle's communal-world, personal-rewards split, in a run.

### Dead Rails (2025)
- **Run.** Fuel and defend a steam train across 80 km of zombie desert, stopping at towns about every 10 km [S, [Roblox wiki](https://roblox.fandom.com/wiki/RCM_Games/Dead_Rails)].
- **Feeding the train:** coal from the store goes on the burning furnace; corpses and newspapers burn too. You carry loot in a sack, and you can weld items onto the train while dragging them [S, [Bluestacks](https://www.bluestacks.com/blog/game-guides/roblox/rl-dead-rails-beginners-guide-en.html), [Deltia's](https://deltiasgaming.com/?p=231460)]. Pocket Gamer: leave each town with at least 3/4 fuel, and ride out the night on or inside the barricaded train [V, [Pocket Gamer](https://www.pocketgamer.com/roblox/how-to-beat-dead-rails)].
- **Between runs:** Bonds (10 for a Normal finish, 20 for Nightmare, plus pickups and challenges) buy classes [S, [Sportskeeda](https://www.sportskeeda.com/roblox-news/how-get-use-bonds-dead-rails)].
- **How it spread:** past 100K and then 600K concurrent on a weekend after Roblox's own TikTok post (499K likes) and creators such as Flamingo (2M+ views). GameAnalytics reads it through "Most Advanced Yet Acceptable": a familiar survival base with a fresh "survival game on rails" [V, [GameAnalytics](https://www.gameanalytics.com/blog/dead-rails-and-the-hit-makers-formula)].
- **What's new:** **a train as the shared base, fed by hand.** It's the nearest Roblox precedent to Boogle's wagon, fuel loop and rails.

### DONT SPLASH (made 17 October 2026; #8 two weeks later)
- **Run.** 1–4 players cross pool rooms over water (10 per server). A blind creature hunts by sound: a splash brings it to that spot, and water slows you while it moves fast. Throwing a pebble makes a decoy splash. Player collision is on, so friends can knock each other in; a rescue rope pulls fallen friends out. Stages: gaps, sinking pads, rotating bridges, and a valve room that starts a countdown [V, [dontsplash.wiki](https://dontsplash.wiki/guide/dont-splash-how-to-play)].
- **Upgrades:** throwing range, pebble skipping and rescue speed, bought with cash earned in runs or with Robux [V].
- **What's new:** **the environment listens to you**, and the comedy is friends bumping friends into the water. A throw is the tool (the decoy pebble), and the rescue is cooperation. All of it is physical, with nothing to grind for the fun to work.

### Fisch (#13)
- **The verb.** Cast with a timed power bar, click the SHAKE prompts, then a reel game: keep the fish inside a moving bar until the progress fills. A perfect catch earns a bonus [S, [Sportskeeda](https://www.sportskeeda.com/roblox-news/roblox-fisch-a-beginner-s-guide), [Robloxden](https://robloxden.com/game-codes/fisch/guides/how-to-fish)].
- **Collection:** a bestiary per area. Rod-locked and weather-locked mutations, e.g. an eclipse event or a 15% "Mutation Surge"; some event mutations are later unavailable [S, [allthings.how](https://allthings.how/fisch-mutations-explained-every-multiplier-and-how-to-trigger-them/)].
- **What's new:** a skill check inside a collection loop. It's a UI minigame, not physics.

### Dress To Impress (#15; over 1M concurrent in late 2024)
- **Round.** A theme, a few minutes to dress, then a runway walk while the lobby votes. You can't vote for yourself [S, [Varsity](https://www.varsity.co.uk/fashion/28397)].
- **The team** (about 30 people) admits voting is unfair: players vote for people they recognise. Themes come from "what's trending or what seems fun or what people are suggesting" [V, [Crossplay](https://www.crossplay.news/p/who-makes-dress-to-impress-on-roblox)].
- **What's new:** **the runway is a spectacle everyone watches**, and showing off is the reward.

### Adopt Me (#5; ~$60M a year)
- **Pets.** Pets grow through six stages as you meet their needs, and 4 full-grown pets make a Neon (brief 9) [V, [Wikipedia](https://en.wikipedia.org/wiki/Adopt_Me!)].
- **Updates.** Player counts "usually triple whenever a major update occurs" [V, Wikipedia]. Pets drop weekly, e.g. Halloween 2026 in 3–4 weekly drops [S, [allthings.how](https://allthings.how/adopt-me-new-update-schedule/)].
- **Trading and its costs.** Trading brought "trust trade" scams and trade licences. Rare pets sell for up to US$300 off-platform. A six-year-old reportedly spent A$8,000 [V, Wikipedia].

### Older pillars, briefly
- **Blox Fruits:** a level grind to 2,550–2,700 across three seas, with a fruit dealer's stock rotating every few hours [S, [Deltia's](https://deltiasgaming.com/?p=151888)].
- **Doors:** a roguelite run through hotel rooms; entities kill you or help you; floors were added a year or more apart; modifiers after you beat it [V, [Wikipedia](https://en.wikipedia.org/wiki/Doors_(game))].
- **Build a Boat for Treasure:** build a boat from blocks whose weight and strength matter, sit to launch it down a river of about 11 stages, and get gold at the chest, scaled by speed. Gold buys random block chests [S, [Pro Game Guides](https://progameguides.com/roblox/how-to-survive-build-a-boat-for-treasure-every-time/)]. GameAnalytics names it, at 4.3B plays, as one of Dead Rails' familiar ancestors [V].
- **Simulators and tycoons generally:** click or train a stat, buy droppers or floors, then rebirth to reset for a permanent multiplier and a new world [S, [allthings.how: Clicker Simulator](https://allthings.how/roblox-clicker-simulator-how-to-play-from-first-click-to-first-rebirth/)].

---

## 3. The patterns

One line per dimension, across the games above.

| Dimension | What the top games do | Examples |
|---|---|---|
| **Core verb** | One physical verb, readable in seconds: run and carry, throw, cast, dress, ride | Steal An Egg, Throw Food, Fisch, DTI, Dead Rails |
| **Loop** | Go out → grab → bring it home under threat → it works for you → reach farther | brainrot and egg games, 99 Nights, Dead Rails |
| **Session** | Platform median 6.6 min; runs and rounds sized to fit (DTI's few minutes, 99 Nights' few-minute days, Dead Rails' 80 km) | GameAnalytics |
| **Progression** | A stat that opens farther places (speed, throw power), plot or pen slots, classes between runs | Steal An Egg, Throw Food, 99 Nights, Dead Rails |
| **Prestige** | Rebirth: reset for a permanent multiplier and a new floor or world. Escape Tsunami keeps your collection and resets only speed | Steal a Brainrot, Escape Tsunami, simulators |
| **Collection and rarity** | Tiered units plus long-odds variants, collection books, mutations tied to weather (brief 9) | all |
| **Social** | Neighbouring bases you walk past; stealing; trading; rituals that need 3 players; rescue and bumping; runway voting | brainrot games, Adopt Me, DONT SPLASH, DTI |
| **Offline and real-time growth** | Crops grow and pets earn per second while you're away; shop restocks every few minutes | Grow a Garden, Escape Tsunami |
| **Update cadence** | Weekly is the norm (Grow a Garden, 99 Nights, Brookhaven on Fridays, Adopt Me); seasonal events in every top game; developer-hosted chaos events | Jandel, Brookhaven, Adopt Me |
| **Onboarding** | Playing in about a minute, starter items, fun in five minutes, hints on first use | Roblox docs, Brookhaven |
| **Monetisation** | Skip timers, luck passes, gamepasses, paid steals, random boxes with published odds (required on paid random items) | Grow a Garden, PS99, Brookhaven; [Roblox policy](https://create.roblox.com/docs/production/monetization/paid-random-items) [S] |
| **Why it spreads** | Clip-worthy unscripted moments; creator videos; Roblox's own TikTok; classmates; sessions with friends 1.9× as long | GameAnalytics, Naavik, Beebom, Roblox |

**The anatomy that matters most for Boogle** (brief 9 drew the rarity loop; this is the movement loop):

```
 home (pen, base, camp, train)
   │  go out: reach is the progression (speed, throw power, a vehicle)
   ▼
 the far place (biome, track, forest, town)
   │  grab: a pickup, a lure, a catch
   ▼
 the trip home under threat ── the guardian, the wave, the night, the noise
   │                              failure = drop it, ragdoll, splash: funny, cheap
   ▼
 home gets bigger / works for you ──► seen by others walking past
```

The pleasure is in the third step. A trip home where something chases you is what makes carrying exciting, and the 0.1 haul has no such step yet.

---

## 4. What this means for Boogle

### (a) Patterns that fit, with the smallest prototype each

Ordered by how directly each one serves the find-the-fun questions in [boogle-2.md](../proposals/boogle-2.md).

**1. The trip home under a world threat (Escape Tsunami, Steal An Egg without the stealing, 99 Nights' night).**
- *Why it fits:* it is principle 5 ("only the world is the antagonist") and 7 (telegraph everything) on top of the haul. It answers "is hauling a chore?" by adding tension rather than rewards. It also matches the storm-tide cycle [ambitious-mechanics.md](ambitious-mechanics.md) recommends.
- *Smallest prototype:* `?proto=haul&v=wave`.
  - The richest log bundles sit on a sandbar out past the shallows.
  - Every 60–90 s a wave rises on the horizon, visible 20–30 s ahead, and sweeps the bar and the beach up to a line.
  - Caught by it: you tumble, and part of your bundle washes up as a pile nearby. Nothing is lost, only moved.
  - Gut question: is getting back before the wave more fun than walking to a palm?
  - Local and Host only (the wave is a function of the tick).

**2. Feeding the shared vehicle by hand (Dead Rails' furnace, 99 Nights' campfire).**
- *Why it fits:* turns the wagon from something you board into something you keep going. Hauling and riding become one loop, and cooperation is automatic (anyone's log counts; principle 4).
- *Smallest prototype:* `?proto=wagon&v=stoke`.
  - The wagon has a firebox; logs thrown or walked into it raise steam, and steam is speed.
  - It never stops dead: with no steam it slows to a walking pace.
  - The chuff, the smoke and the groove layers rise with steam.
  - Gut question: would you stoke it for no reason just to go faster?
  - Owner/Local over the existing `wagonAt` timing. Keep the timetable pure and treat steam as a cosmetic speed-up, or run it in its own room if it changes the timetable.

**3. Build the vehicle, then launch it (Build a Boat for Treasure, Dead Rails' welding).**
- *Why it fits:* it joins two things the owner likes, vehicles and construction you can watch, with a slapstick payoff (principle 10). The failure (a cart that falls apart halfway down) is the joke.
- *Smallest prototype:* `?proto=soapbox&v=kit`.
  - At the top of the lighthouse path, 4–6 parts (a plank, a barrel, a wheel pair, a sail, a crate) snap onto the cart's chassis at fixed sockets.
  - Each part changes mass, grip or drag, and loose sockets rattle off on hard landings.
  - Ride, crash, rebuild.
  - Gut question: is the build-then-ride round more fun than the plain cart?

**4. Throw to lure (Throw Food For Animals), plus a timed release (Fisch's cast, Throw Food's perfect throw).**
- *Why it fits:* the throw is already Boogle's verb (principle 2). Making where it lands matter turns throwing into finding with no new control, and the critters research already has cheap cosmetic critters to call.
- *Smallest prototype:* `?proto=minis&v=lure`.
  - Throw a fruit (or the ball) into the grass; critters within about 15 m of where it lands come to it.
  - Farther areas have different critters, and a first sighting gets a chime and a line in a local "seen" list.
  - Second variant on the haul's `toss`: a ring on the charge that gives a perfect-release arc. Gut question: does it make tossing feel skilled, or fussy?

**5. A world that moved on while you were away (Grow a Garden's offline growth, shown as a place, not a number).**
- *Why it fits:* it is principle 9 already. Roblox's version is income per second; Boogle's should be "the hut is further up, the wagon brought logs, there's a new pile". It fits the asset-light "construction you can watch" work.
- *Smallest prototype:* `?proto=build&v=away`.
  - The helper hut takes one piece per N minutes of world time from a stock the wagon delivers, whether anyone is online or not.
  - On arrival, a 3-second camera pan shows what changed since this browser last saw it (stored locally), then hands back control.
  - Gut question: did coming back feel like news?

**More that fit, lower priority:**
- **Tools up front (Brookhaven).** Every toy available in the first minute, with nothing to earn, is proven at the top of the chart. It backs the [arrival prototype](../game-design/first-run.md) and the post-finale toy box. No new prototype: test whether `arrive` can hand the ball, the frisbee and a cart within 10 s.
- **A ritual anyone can start (Steal a Brainrot's triangle, "admin abuse" made kind).** A short, telegraphed world event players trigger together: e.g. three honks in a ring of stones brings a 60 s log shower. It must have a solo version (a bell) that works smaller. Prototype: a variant of the era prototype's gathering call. Never limited-time, never exclusive items. See [shared-moments-and-events.md](shared-moments-and-events.md).
- **The environment listens (DONT SPLASH).** A threat that reacts to noise and splashes, plus friends knocking friends in, is slapstick and the world as antagonist at once. Prototype: `?proto=minis&v=hop` with a snoozing crab under the line that wakes on a splash and chases you to the flag (comic, never a loss).
- **Rescue as the co-op verb (DONT SPLASH's rope, Adopt Me's care).** Helping someone up is cooperation without negotiation (principle 4). Prototype later, once multiplayer prototypes start.
- **A server-wide boost (Throw Food's Server Luck).** One player's find raising luck for everyone near them is "different people helping" (principle 4) in rarity form. Add it to brief 9's 4.1 rather than a new system.
- **Short goals in a long arc (Roblox's onboarding guidance).** Each era should offer something finishable in a 6–15 minute visit (a section, a find, a ride) inside the 1–3 evening era. That's a pacing check for the vertical slice, not a feature.
- **Clip-worthy moments.** The spread mechanism is unscripted chaos worth recording. Boogle's version is physics comedy (comedy-in-games.md), plus a one-tap postcard or clip. The era prototype already makes a before/after postcard.

### (b) Patterns that conflict

| Pattern | Where | Principle it breaks | Kind version? |
|---|---|---|---|
| **Stealing and raids** (taking a unit from another player's base, alerts, base locks) | Steal a Brainrot, Steal An Egg, Grow a Garden's paid steals | DESIGN.md 5, "Avoid: … stealing" | **Yes:** the wave, the guardian or the night as the thing that takes it, and only ever moving it to a pile nearby (pattern a1). |
| **A stat treadmill** (AFK speed training, pull-up stands, power that opens areas) | Steal An Egg, Throw Food, Escape Tsunami, simulators | boogle-2 knacks unlock "options and never power"; wary of grinds; 1 (toys before chores); 3 (no gated places) | **Partly:** reach that comes from a tool or vehicle the island builds (cart, ferry, wagon), shared by everyone at once ([progression-models.md](progression-models.md) §1). |
| **Income per second, numbers going up** | every tycoon | 1 ("avoid scores … as the reason") | **Yes:** growth shown as the world (a1 and a5), never a counter. |
| **Rebirth / prestige resets** | Steal a Brainrot, simulators | "nothing decays"; wary of grinds | **Yes, barely:** brief 9's Heritage (4.8), a replay with nothing taken away. Escape Tsunami keeping your collection is the gentlest Roblox version. |
| **Restock timers, limited stock, claim-while-online** | Grow a Garden (5 min shop, weekly online-only items), Blox Fruits dealer | SETTLED's no-timers rule; FOMO; 8 (drop-in) | **No:** brief 9 already rules these out. Weather that changes odds, as a function of the tick, is the kind relative. |
| **Event-exclusive and "gone forever" items** | Adopt Me, Fisch event mutations, PS99 | FOMO; 9 (leave something) | **Yes:** events that change the world for a minute and leave a trace, never an item you missed. |
| **Trading economies** | Adopt Me, Grow a Garden (real-money trading, scams) | brief 9 "Never take"; 6 (personal rewards, no wallets) | **Yes:** throwing a find to a friend as a gift (brief 9, question 3). |
| **Runway voting / judged rounds** | Dress to Impress, and its own team admits the voting is unfair | SETTLED's "never feel judged"; 10 (slapstick over precision) | **Partly:** a stage or photo spot where showing off happens with no vote (a postcard, an audience by standing nearby). |
| **Death and losing the run** | 99 Nights, Dead Rails, Doors | 1 and 10 if loss costs progress; boogle-2 personal rewards only | **Yes:** failure costs seconds (a tumble, a washed-up pile), as in minigames research §4. |
| **Paid luck, skip-the-wait, random boxes** | PS99, Grow a Garden, Steal the Brainrot | no money in Boogle; brief 9 "never a roll you trade a resource for" | **No:** nothing to adapt. |
| **Weekly live-ops as a content treadmill** | Grow a Garden (dropped it: hard to keep fresh), 99 Nights | not a design principle, but a cost; Jandel pulled back to depth over events | **Yes:** the friends' ship cadence already updates the island often; a "new this week" sign at the station is enough. |
| **Combat and PvP rounds** | Blox Fruits, RIVALS, MM2 | 5 | **No**, beyond the ball's existing bumps. |

### Recommendations, in order

1. Try **`haul&v=wave`** before any other haul change: of these patterns, it's the one with the best evidence for making carrying exciting rather than a chore.
2. Try **`wagon&v=stoke`** alongside playtest 2: it tests whether hauling and riding are one loop.
3. Add **`soapbox&v=kit`** to playtest 5's variants.
4. Add **`minis&v=lure`** to the minis card, and a perfect-release ring as a `toss` setting.
5. Hold **`build&v=away`** until the era loop is fun. It needs the wagon's delivery and a world clock that ticks without players (the server already ticks).
6. Measure **time to first verb** and **visits shorter than 60 s** on the protos page, since those are what Roblox ranks first. `arrive` already times the first.

### Sources

All links are inline above. Platform: [Creator Hub: Discovery](https://create.roblox.com/docs/discovery) [V], [Onboarding](https://create.roblox.com/docs/production/game-design/onboarding) [V], [Engagement](https://create.roblox.com/docs/production/analytics/engagement) [V], [Friend referral](https://devforum.roblox.com/t/announcing-the-new-friend-referral-system-for-your-experiences/3623795) [V], [Paid random items](https://create.roblox.com/docs/production/monetization/paid-random-items) [S]. Analysis: [Naavik: State of UGC Games 2026](https://naavik.co/deep-dives/the-state-of-ugc-games-2026/) [V], [Naavik: Roblox's expensive year](https://naavik.co/digest/robloxs-expensive-year-of-good-intentions/) [V], [Naavik: Predicting the next big hits](https://naavik.co/digest/predicting-the-next-big-hits-on-roblox/) [V], [GameAnalytics 2025 Roblox report](https://www.gameanalytics.com/reports/2025-roblox-report) [V], [GameAnalytics: Dead Rails](https://www.gameanalytics.com/blog/dead-rails-and-the-hit-makers-formula) [V]. Charts: [RoWatcher](https://rowatcher.com/roblox-player-count) [V], [livecounts.nl](https://livecounts.nl/roblox-charts/) [V]. Interviews: [GamesBeat: Jandel](https://gamesbeat.com/janzen-madsen-interview/) [V], [PCGamesN: 99 Nights](https://www.pcgamesn.com/roblox/99-nights-in-the-forest-interview) [V], [Crossplay: Dress to Impress](https://www.crossplay.news/p/who-makes-dress-to-impress-on-roblox) [V]. I found no Deconstructor of Fun or GameRefinery teardown of these games, and no published RDC 2025 talk on their retention.
