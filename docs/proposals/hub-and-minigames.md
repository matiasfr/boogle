# The island as a hub: mini-games, vehicles and a character of your own

*Proposal, 30 October 2026. A Club Penguin-shaped direction for Boogle: the island is the place you hang out, mini-games are the reason to go somewhere, vehicles and exploration connect them, and each character grows personally. Game feel comes before everything else. The evidence is in [hub-and-minigames.md](../research/hub-and-minigames.md) (hubs, Club Penguin, Toontown) and [progression-feel-exploration.md](../research/progression-feel-exploration.md) (feel, vehicles, exploration, incremental). Nothing here is built.*

## Why this direction

Friends have gravitated toward mini-games, with the island as the place they meet. The evidence agrees on the order. Club Penguin's precursor had four rooms and chat, and "strangers were showing up every day to hang out together"; mini-games and dressing up came on top (Priebe). So the island stays the place you hang out, and mini-games become what you go do there.

This is a shift away from the [communal-restoration](../research/communal-progression.md) and [tech-tree](boogler-tech-tree.md) direction. That direction isn't thrown away: section 7 maps it onto the new shape.

## 1. Feel first: the rule over everything below

The owner's priority is that game feel comes first. It means:

- **Every mini-game is a toy before it's a game** (DESIGN.md principle 1). Before any score exists, it has to be fun to mess with for a minute. Fall Guys' test applies: you can say what you do "within a sentence", and you can "jump in and have a good time without tutorials".
- **Prototype with blocks, polish the feel, then add the look.** Splatoon's first prototype used plain blocks.
- **One task at a time, with shared verbs.** Every mini-game reuses Boogle's verbs: move, jump, throw, dig, pile, push, ride. Learning one teaches the rest (Jackbox).
- **Leave room for one-in-a-million moments** (Fall Guys) and slapstick (principle 10). Loose physics over precise inputs.
- **A feel pass before progression.** For each mini-game, list its juice: sound, particles, squash, camera nudge, hit-stop. Check it with `/look` and a `dev/scenarios/` scenario. No coins until the toy passes. See [methodology.md](methodology.md) §4 and the [vehicle feel sheet](vehicles.md).

## 2. Elevators or in-island? A hybrid, joined by vehicles

| | **Elevators** (separate rooms) | **In-island** (play where you stand) |
| --- | --- | --- |
| **Precedent** | Club Penguin rooms, Habbo's navigator, Splatoon's plaza, Toontown's trolley | Animal Crossing's fishing and bugs, Fall Guys' "players versus the course" |
| **Feel** | A clean stage built for one game, but a transition breaks the flow | No loading; you can watch, wander in and wander off |
| **With 1–6 friends** | Risk: three friends split across three rooms leaves every room empty. The one claim about this was refuted, so it's unknown, not disproven. | The island stays lively; others see the game from outside and join |
| **Drop-in** | Needs Toontown's rules: board together, and anyone can follow a friend | Natural: walk up and join |
| **Networking** | Same PeerJS room. A "where am I" presence field, and the destination is a separate area of the same world (far away or high up). Not a separate PeerJS room, which would split hosts and persistence. | The same room and the same world, with no special plumbing |
| **Build cost** | A stage per game, free of island constraints | Each game must fit the island's terrain, water and sightlines |

**Recommendation:**

1. **Default to in-island venues.** Each venue does one thing, Club Penguin style: the court is for ball games, the lighthouse path is for downhill runs, the beach is for building against the tide. You can see what's happening from across the island.
2. **Use elevators only for what can't fit on the island,** such as a cloud course above the lighthouse or a deep-sea dive. They work like Toontown's trolley: everyone standing on the platform goes together, anyone can press "follow" on a friend at any time, and finishing drops you back where you left. In code, the destination is just another area of the same scene, so the host, sync and persistence don't change.
3. **Make vehicles and exploration the connective tissue.** Getting to a venue is itself a toy. You drive the buggy to the downhill start or paddle the raft to the islet, and that's the open-world version of Club Penguin's map. Islets in sight of the beach (BotW's landmarks; Sable's "seeing something in the distance and journeying out to it") hold the stranger mini-games.
4. **Add a hub board** (like the Splatoon plaza): a noticeboard at spawn showing where friends are and which games are running, with "go there" for each. It's the Toontown teleport, one press away.

## 3. Mini-game candidates

Each one passes the toy test before it gets a score. The sync kinds follow DESIGN.md.

| # | Game, in one sentence | Venue | Verbs | Sync | Draws on |
| --- | --- | --- | --- | --- | --- |
| 1 | **Court ball:** keep the ball off your sand; scores are per team, and fun with two players. | The court | throw, bump, jump | Ball Owner (epoch rule); score Host | Wii Sports, Club Penguin's room-per-activity |
| 2 | **Soapbox run:** coconut-wheeled buggies race down the lighthouse path, with Puff Boost and shortcuts. | Lighthouse path | ride, drift, boost | Owner per buggy; times Local, best times Host | Lonely Mountains' scenic route plus shortcuts, Mario Kart Wii's integer drift charge |
| 3 | **Melon regatta:** paddle a melon raft around buoys to the islet; capsizing is the fun. | Sea and islet | paddle, ride | Owner raft (or Host for multi-seat) | Sea of Thieves-style physics comedy, exploration |
| 4 | **Sandcastle versus the tide:** build before the telegraphed wave and see whose wall holds. Everyone plays against the sea. | The beach | dig, pile | Lockstep (tide is a function of tick and seed, plus terrain edits) | [ambitious-mechanics.md](../research/ambitious-mechanics.md), Fall Guys' "players versus the course" |
| 5 | **Boogler rodeo:** stay on The Boogler as long as you can before he launches you; the best launch distance counts. | Wherever he is | ride | Host (he's host-simulated) | Existing riding feature, slapstick |
| 6 | **Mine-cart run:** a cart through the abandoned mine in the caves; lean to stay on the track and grab coins. | The caves | lean, jump | Owner cart | Club Penguin's Cart Surfer |
| 7 | **Coconut shy:** knock fruit off the palms with the ball against a short timer. | The palms | throw | Ball Owner; fruit Lockstep (gifts) | Fairground stall, existing gifts |
| 8 | **Water polo:** a dug pond with sand-gate goals and the ball. | A dug pond | throw, swim, dig | Ball Owner; goals Lockstep | PLAN.md stretch idea |
| 9 | **Mushroom bounce course:** chain bounces across grown mushrooms, with trick points. | The mushroom garden | jump, bounce | Mushrooms Lockstep; players Owner | Existing mushrooms, Fall Guys |
| 10 | **Haggle:** a quick rhythm duel with The Boogler at his stall: walk away, get called back. | The Emporium | one button | Local (solo) | Card-Jitsu as the "sit-down" game, Boogler lore |

Start with 1, 2 and 4. They are the most toy-like and use systems that already exist (ball, lighthouse path, water sim). 2 brings vehicles in, and 3 brings exploration in.

**Scores that don't split friends.** Prefer players against the world (the tide, the course, the clock) over players against each other. Show personal bests and team results, not standings. Bonuses for playing together go to everyone (Toontown's shared damage bonus): a regatta where every finisher earns more when more friends finish.

## 4. Your character: looks, knacks, friends, coins

All of it is personal (principle 6), lives in localStorage today, and is shown to others through presence fields.

| Layer | What it is | Rule | Draws on |
| --- | --- | --- | --- |
| **Looks** | Hats, scarves, colours, ball skins, buggy paint | Earned, never bought with real money. Shown on your avatar through a small presence field. | Club Penguin clothes, Splatoon gear as social information |
| **Your hut** | A beach hut you furnish. It appears in its spot whenever you're online, and friends can walk in. | Owner state: your layout lives in localStorage and is broadcast while you're there. | Club Penguin igloos "opened" via the map, Habbo rooms |
| **Knacks** | A level per mini-game, such as Driving 3 or Rodeo 5 | Knacks unlock *options* (a new trick, a new paint, a harder route), never more power against friends. | Toontown gags: more options, not bigger numbers |
| **Friends** | The Boogler's friendship ladder stays as it is. Add small moments with each human friend, such as "played 10 games together" → a matching hat. | Positive only | The owner's decision to keep The Boogler; Animal Crossing's "time spent together" |
| **Coins** | **Som**, after the Uzbek currency (The Boogler insists). Earned in mini-games and spent at The Boogler's Emporium. | Earned only. No shared wallet. Small and never grindy. | Club Penguin's mini-game coins, Habbo's earnable currency |

**Incremental, inside the personal layer.** The owner likes incremental design. Its home is your own things, not a shared ledger:

- **Knacks** follow an integer cost curve (1.07–1.15 growth, as in [progression-feel-exploration.md](../research/progression-feel-exploration.md) §1).
- **Your hut** can host one slow personal machine, such as a coconut press that fills while you're away (grow while away, never decay).
- **Personal goals.** Animal Crossing's designers "add features that really allow users to come up with their own goals", with no end state. So there are no daily quests and nothing is lost if you skip a week. Club Penguin's puffle "never dies. It just runs away."

**When do you need accounts?** localStorage is enough while friends play on one device each and losing a hat is a shrug. Accounts become necessary when:

- someone plays on a phone and a laptop;
- som or a hut start to feel worth keeping;
- or someone clears their browser and is upset.

The light fix: a "save code" stored on the existing snapshot server (which still needs deploying, the owner's pending call). Avoid full logins until that hurts.

## 5. Parties instead of seasons

Club Penguin held at least one party a month, and "everyone who attended a party received a free exclusive item that evidenced their attendance" (Priebe). For Boogle:

- **One party at a time, announced a few days ahead** (principle 7). Examples: a lantern night, a sumalak night, a regatta day, Gary's boat show.
- **Being there earns the party's item.** No task is required.
- **Unstaffed props for made-up play.** Merrifield's concession stand "totally unmanned, with no agenda": a stage, a photo booth, a picnic.
- **One shared outcome fed by choice.** Like Coins for Change, friends can drop som into The Boogler's Boat Fund. The jar visibly fills and one day Gary's boat arrives. It's optional, and it's the one communal thread left.

## 6. DESIGN.md: what this serves and bends

- **Serves:**
  - 1 Toys before chores: feel first, toy test before scores.
  - 2 The ball stays the star: court ball, coconut shy and water polo, and the ball rides along on the raft and buggy.
  - 6 Personal rewards.
  - 8 Drop-in, drop-out: walk up and join, follow a friend.
  - 10 Slapstick.
- **Bends:**
  - **4 Cooperation is automatic.** Mini-games add scores, and scores can turn friends into rivals. The mitigations are players against the world, team results and shared bonuses. Watch for it in playtests.
  - **9 Leave something for the next visitor.** Less communal growth. What's left is huts, party traces, the Boat Fund and best times.
  - **3 Farming is never required.** No conflict, as long as no mini-game needs farming.
  - **"Communal world, personal rewards"** gets stronger, not weaker.

  If the group adopts this direction, propose a DESIGN.md commit that adds "the island is a hub; mini-games are its reasons to go places" and notes the scoring rule.

## 7. Mapping the existing proposals onto the hub

| Existing idea | In the hub shape |
| --- | --- |
| [The Emporium](directions.md) (A) | Becomes **the shop**. The Boogler sells hats and hut furniture for som, with a rotating catalog. The Boat Fund jar is the optional communal thread. |
| [Business for Beginners](boogler-tech-tree.md) | Shrinks to **The Boogler's story and a stamp book**: pages open as you play mini-games (Club Penguin stamps), and his lines react. No island-wide gates. |
| [Restoration](../research/communal-progression.md) (H) | Landmarks become **venues**. Lighting the lighthouse could open the night regatta, and restarting the windmills could open the land yacht course. It's a light first-run arc, not the main loop. |
| [Vehicles](vehicles.md) | **The travel between venues** and mini-games of their own (soapbox run, regatta, mine cart). |
| Exploration (B, C) | **Islets and caves hold venues and secrets.** Stamps for finding them (A Short Hike's landmarks, Club Penguin's secret rooms). |
| [Storm tide](../research/ambitious-mechanics.md) (G) | **The sandcastle mini-game** and a party ("king tide night"). |
| Coconut post (E) | Messages left at your hut for friends who were offline. |

## 8. First slice

1. **Feel:** the soapbox buggy on the lighthouse path, using the [vehicle feel sheet](vehicles.md), behind `?proto=buggy`. Iterate with `/look` until it's fun with no timer.
2. **Feel:** court ball as a game, with a score shown only as sand-coloured pips on each side.
3. **Character:** one hat, earned by playing either game. Shown on the avatar through a presence field, and saved in localStorage.
4. **Playtest questions:** do friends race down the hill again without being asked? Does anyone go to the court on their own? Does a hat on a friend make anyone ask "where did you get that"?

Only then add som, the shop, the hub board, and a second and third venue.

## Open questions

- In-island venues or elevators first? The recommendation is in-island, with one elevator later for a sky course.
- What's the currency's name: som, or something sillier?
- Should there be per-friend moments (a matching hat for 10 games together), or does that feel like an obligation?
- When does a save code on the server become worth deploying?
