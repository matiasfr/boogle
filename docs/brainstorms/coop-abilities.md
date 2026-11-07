> **Status: approved (owner, 2026-11-06): option E.** First build (the double jump) queued after replication R1b.

# Co-op abilities: the moment everyone gets it

**Owner amendment, 7 November:** drop-in onboarding is secondary, and shared milestone gatherings may be considered in
future design. Option E remains approved; this review does not authorize a presentation redesign. Earlier references
to automatic cooperation and drop-in-first design are historical. Reliable shared unlocks and reconnects remain required.

Design only; no game code. This answers the owner's question of 6 November:

> "the points to figure out how to work in co-op are like if you're getting an ability, does everyone get it at once?
> How does that look? I think everyone should get it at once, but maybe there's something that can be done where it
> feels satisfying no matter where you are in the game. Or maybe everybody gets moved to the same place to get the
> ability. Or maybe if you've completed the puzzle, that would give you an ability. You redeem it in one place that's
> easier for everyone to be together."

- **Page:** [coop-abilities.html](../world/coop-abilities.html), a 2D storyboard of each option with two or three
  players in different places at the unlock and after.
- **Builds on:** the approved [jump upgrades](jump-upgrades.md) brief (ankle rings from an expedition find, a balcony
  and a lowered ramp), [ring and economy](ring-and-economy.md) (Home is the hub), and
  [ability upgrades](../research/ability-upgrades.md#co-op-fairness-and-arriving-late) (functional parity, late
  joiners inherit the kit, unlocks in the air apply on landing).
- **Principles:** DESIGN.md 4 (Cooperation is automatic, not negotiated), 6 (Communal world, personal rewards),
  7 (Telegraph everything), 8 (Designed for drop-in, drop-out), 9 (Leave something for the next visitor) and
  11 (Show, don't tell). Owner calls: Input gets instant feedback; Visualize in 2D HTML first.

## Pitch

**It's everyone's the moment it's found, it shows up on you wherever you are, and Home keeps the trophy.**

Whoever finds the ankle rings gets the full "You got" show and the balcony lesson on the spot. In the same second,
everyone else gets a small flourish where they stand: the rings click onto their ankles with the two-note sound, the
charge mark lights, and the find's tall shaft flares on the horizon so they know where it came from. Nobody is
frozen, moved or asked to stop hauling. A friend who was offline gets that flourish once when they land on their next
visit. A copy of the find then sits on a plinth in the village at Home, and the next time anyone walks past it, the
village marks it for whoever hasn't seen it, bigger when friends arrive together.

## What happens today

Read from the code; not checked in play.

- **Earning is already shared.** The second jump is one accepted railway fact (`rail.jump` sets `l.jump` in
  [railway-line.ts](../../src/sim/railway-line.ts)); the Place prototype keeps it in `job.tech`
  ([tech.ts](../../src/proto/place/tech.ts)). Everyone in the room can double jump at once.
- **Everyone gets the full show, wherever they are.** [tools.ts](../../src/entities/railway/tools.ts) calls
  `reveal.youGot` for every accepted `rail.jump`, whoever claimed it, and Place's `showPeerTech` does the same for
  partners ([place.md, Shared unlock arrival](../game-design/place.md)). `youGot` in
  [reward-reveal.ts](../../src/render/reward-reveal.ts) holds input, turns Buddy to the camera, stops you in the air
  (`setAloft(false)`) and waits for a dismiss. A friend mid-jump, mid-haul or on a train is stopped where they are
  for a card about something that happened somewhere else.
- **A late joiner gets nothing.** Join and reload snapshots silently remember existing unlocks, so a friend who
  arrives after the find can double jump without ever being told.
- **Partners don't see the worn rings** (place.md, known limitation: `moves-view.ts` owns one local set).

The recommendation keeps the first fact and fixes the other three.

## Research

How co-op games grant shared unlocks and celebrate them across players who are apart or offline. Short; secondary
sources (wikis, guides, reviews) unless noted, and some details are unconfirmed, as marked.

| Game | How the unlock is shared | Where you have to be | Late or offline friends | For Boogle |
| --- | --- | --- | --- | --- |
| **It Takes Two** | Each chapter gives both players new abilities tied to its theme, then swaps them for the next ([Wikipedia](https://en.wikipedia.org/wiki/It_Takes_Two_(video_game)); [Screen Rant](https://screenrant.com/it-takes-two-co-op-gameplay-changes-levels/)). | Always together: the game needs both players for the whole run. | Not a case: nobody plays alone. | Co-presence makes the shared moment free, but drop-in Boogle can't assume it. |
| **Deep Rock Galactic** | In the Space Rig hub, ordering at the Abyss Bar pours "as many tankards as there are players in the lobby"; everyone takes one, salutes and drinks ([DRG wiki](https://deeprockgalactic.wiki.gg/wiki/Abyss_Bar)). | The hub. | Whoever is in the lobby when it happens. | One person's act makes a moment for everyone present, in the hub, with nothing to coordinate. |
| **Valheim** | A boss trophy is hung once at the Sacrificial Stones and unlocks that boss's Forsaken power; the stones are where you choose and switch the power ([Valheim wiki](https://valheim.fandom.com/wiki/Forsaken_power); [BisectHosting](https://www.bisecthosting.com/blog/valheim-forsaken-powers-buffs-stats-boss-summons-how-to-get)). Using it also buffs allies within about 10 m ([HostedGG](https://hostedgg.com/wiki/valheim/forsaken-powers)). | A shrine near the start, which you walk back to. | The trophy stays on the stones for the world. Whether each player must choose at the stones is unconfirmed. | A shrine near the start keeps the trophy as a visible record, the strongest precedent for the owner's "redeem in one place". |
| **Sea of Thieves** | Emissary flags are raised by a crew vote at an outpost tent ([Rare Thief](https://rarethief.com/sea-of-thieves-safer-seas)); patch 2.4.0 lets crews "leave the server, receiving rewards for any completed maps while offline" ([SoT wiki](https://seaofthieves.wiki.gg/wiki/2.4.0)). | A tent at the outpost, for the decision. | Rewards land on crew who already left. | A gathering place works for a choice the crew makes. Credit people who weren't there. |
| **Minecraft** | Advancements are personal. The earner sees a toast in the top right corner, and the server also posts it to chat for everyone unless a game rule turns that off (`announceAdvancements`, now `show_advancement_messages`) ([Minecraft wiki](https://minecraft.wiki/w/Advancement); [Shockbyte](https://shockbyte.com/help/knowledgebase/articles/how-to-disable-player-advancement-announcements)). | Anywhere. | Nothing: each player earns their own. | Tell everyone at once, but keep the big moment with the person it happened to. |
| **Terraria** | World flags: beating the Wall of Flesh turns the whole world to Hardmode with one message ([Terraria wiki](https://terraria.wiki.gg/Hardmode)). | Anywhere; the message goes to the world. | A later joiner arrives in a world that has already changed, with no moment of their own. | Shared state is easy. The missing piece is a catch-up moment for whoever wasn't there. |
| **Destiny 2** | Going Flawless in Trials takes the fireteam to the Lighthouse on Mercury to open its chest ([PC Invasion](https://planetdestiny.pcinvasion.com/?p=21363); [Maxroll](https://maxroll.gg/destiny-2/resources/the-best-ways-to-get-trials-of-osiris-loot)). | A special place that's only for the celebration. | Only the fireteam that earned it. | "Bring everyone to one place" works when the place is the reward and the group is already together. |
| **Monster Hunter: World** | SOS flares let others join a quest mid-hunt, but joining after about ten minutes cuts their rewards ([Gamer Guides](https://www.gamerguides.com/monster-hunter-world/walkthrough/trophy-guide/i-am-the-reinforcements); [Pojo](https://pojo.com/?p=11703)). | You join a friend's quest. | Late joiners are penalised. | Avoid this: arriving late should never cost a friend the unlock. |
| **Animal Crossing: New Horizons** | Resident Services upgrades overnight; a small cutscene the next morning introduces Isabelle, who takes over the morning announcements ([Nintendo Life](https://www.nintendolife.com/guides/animal-crossing-new-horizons-isabelle-how-to-unlock-isabelle-and-upgrade-resident-services-to-a-town-hall)). Its "player 2 problem" is covered in [friend-group-return](../research/friend-group-return.md). | Nowhere: everyone hears it at a set time. | Every resident gets the announcement on their next morning. | The news reaches each player the next time they play, not the moment it happens. |
| **PEAK** | Each climb ends at a campfire, where a statue can revive fallen scouts ([PC Gamer](https://www.pcgamer.com/games/sim/peak-how-to-revive-heal); [PEAK wiki](https://peak.wiki.gg/wiki/How_to_play)). Whether everyone has to be nearby is unconfirmed. | The campfire, which the route takes everyone to anyway. | Fallen scouts come back at the campfire. | The gathering spot works because the route already leads there; nobody makes a special trip. |
| **Lethal Company** | The ship is the hub; some ship upgrades benefit the whole crew ([Destructoid](https://www.destructoid.com/best-lethal-company-late-game-upgrades/)). Late joining needs mods, which hold joiners until the ship is in orbit ([LateCompany notes](https://thunderstore.io/c/lethal-company/p/baer1/LethalLateCompnanyFixer/)). | The ship. | Not supported mid-mission. | A hub you always return to is where shared upgrades make sense. |
| **Overcooked** | Shared stars open the next kitchen on one overworld map the whole crew drives around (from play; unsourced). | Always together. | Not a case. | Like It Takes Two: moments are easy when everyone is in one place. |
| **Spiritfarer** | The second player is Daffodil, who can gather, cook and fish but can't talk to spirits; progress runs through the lead player ([SpawningPoint](https://spawningpoint.com/spiritfarer-farewell-edition-review-2026/); [Gamereactor](https://www.gamereactor.eu/spiritfarer-review/)). | Wherever the lead player is. | Not a case. | Give everyone their own moment, or the friend feels like a sidekick. |
| **A Short Hike** | Single-player. Each golden feather adds one charge for climbing and gliding, and the feathers are the display ([Switchblade Gaming](https://www.switchbladegaming.com/cozy-games/a-short-hike-guide/); [Indie Game Culture](https://indiegameculture.com/guides/a-short-hike-all-feathers-guide)). | Not a case. | Not a case. | One simple charge mark teaches a jump count without words: the approved charge mark for the double jump. |

**What the research says.**

1. **Summoning to a place** works when the group is already together and the place is the reward (Destiny's
   Lighthouse, It Takes Two). Nothing found summons friends who are busy elsewhere, and Monster Hunter penalises the
   opposite case, arriving late.
2. **A shrine or altar** works as a lasting record and a place for choices (Valheim's stones, Sea of Thieves' tent,
   Deep Rock's bar). It works best on a route people already walk (PEAK's campfire, the hub).
3. **A global announcement with a small personal touch** is the common pattern for far-apart players (Minecraft's chat
   line next to the earner's toast, Terraria's world message, Animal Crossing's morning announcement). In the examples
   found, the big show belongs to the person it happened to, or to a fixed time.
4. **Late and offline friends** are where most games are weakest. Terraria changes the world with no moment for them,
   and Monster Hunter takes rewards away. Sea of Thieves (rewards for crew who left) and Animal Crossing (news on
   your next morning) do better. Nobody found gives a late friend their own unlock moment, which is where Boogle can
   do better.

## The options

Each option has a storyboard on the [page](../world/coop-abilities.html). The cast: **the finder** at the expedition
find, **a hauler** carrying logs on the far side of the island (sometimes mid-jump or on a train), and **an away
friend** who is offline and joins later.

### A. Everyone at once, a flourish wherever you are

- **The finder** gets today's full show at the find: the anticipation glow, "You got", the held-up rings, then the
  balcony lesson right there.
- **Everyone else, in the same second:** no card and no freeze. The rings click onto their ankles with a small teal
  puff and the two-note pickup sound, and the charge mark by Buddy lights. The find's tall shaft flares on the
  horizon for a few seconds, so they can see where it came from (Telegraph everything).
- **Far away or mid-haul:** carry on walking; nothing drops.
- **Mid-air:** the flourish shows now, but the mark stays hollow until they land, then fills (the jump-upgrades
  airborne rule). It never adds a jump in the air.
- **Offline or joining later:** on their first landing after arriving, they get the same flourish once for each
  ability gained while they were away, one after another.
- **Teaching:** the first time each non-finder jumps after the unlock, the charge mark pulses at the top of the jump,
  with the Jump glyph (Input gets instant feedback). Once per player, Local.
- **NPC beat:** none needed. A villager nearby can glance at your feet.
- **Cost:** code small (one Local presentation path instead of the partner `youGot`, a deferral while you're airborne,
  a seen-key set on join; no wire, save or sim change). Art tiny (shaft flare, ankle puff).
- **Weakness:** for whoever wasn't there, it's a sparkle, not a celebration. Nothing brings people together.

### B. Everyone is brought to the find

- **The finder** holds the rings up, and a bell rings across the island.
- **Everyone else** is lifted where they stand (a cartoon pull into the sky) and dropped beside the finder for a group
  "You got". Then they're sent back where they were, or stay.
- **Mid-haul:** their cargo must either come with them or be set down safely. **Mid-air or on a train:** the pull has
  to wait or take over the ride. **Offline:** they can't be summoned, so they need option A's flourish anyway.
  **Joining later:** they drop in at the find, not at Home.
- **Teaching:** the best of any option, since everyone gets the balcony lesson together.
- **NPC beat:** the find's machinery, or a villager pulled along, holds the moment.
- **Cost:** code large (moving every player's body, cargo, seats and trains; a return trip; camera for everyone; the
  new place spoiled for whoever hadn't walked there). Art medium (pull and drop effect).
- **Weakness:** it takes your hands off the controller unasked (against Input gets instant feedback and Cooperation is
  automatic), it doesn't work for anyone who isn't online, and it ends the hauler's job. A softer version that asks
  first (a beckon you can accept) is listed under Parked.

### C. Solve the puzzle, redeem it where everyone gathers

- **The finder** solves the find's puzzle and gets a sealed relic (the rings in a case), not the ability. The case
  sits at the find, glowing.
- **Somebody carries the case home** to a stand in the village. Anyone can redeem it there, and redeeming switches the
  ability on for the room, with a group show for everyone at Home.
- **Far away:** they hear a chime and see the case's glow on the map. **Mid-haul:** unaffected until it's redeemed.
  **Offline or later:** they arrive to the ability if it's been redeemed, or to the case waiting if not.
- **Teaching:** at the stand, in a small yard at Home; the balcony payoff is a trip away.
- **NPC beat:** a villager keeps the stand, waves the carrier in, and gathers the others round.
- **Cost:** code medium-large (a new shared "earned, not redeemed" fact, a carried relic that must survive a carrier
  logging off, a redeem interactable). Art medium (stand, case, the case on your back).
- **Weakness:** it puts a trip between the find and its first use, the opposite of the approved balcony payoff. It's
  an errand, and a carried key is exactly the "absent inventory key" the
  [ability-upgrades fairness table](../research/ability-upgrades.md#co-op-fairness-and-arriving-late) rules out.

### D. The relic rides the train home

- **The finder** gets the show, and the find's relic is loaded into a wagon automatically (Machines show their work
  physically).
- **Everyone** can watch the train bring it home, and the ability switches on when it reaches Home, with a show at the
  platform for whoever is there.
- **Far away or mid-haul:** they see the train pass with the relic. **Offline or later:** it's already home.
- **Teaching:** at the platform, a long way from the balcony.
- **NPC beat:** the stationmaster unloads it and the village gathers.
- **Cost:** code medium (a cargo kind that triggers a grant on arrival, with no train before the line exists). Art
  small-medium (relic crate on a wagon).
- **Weakness:** it only works where the railway already reaches, which an expedition find usually isn't. It delays
  the ability by a ride and makes the train the thing that unlocked it, not the players.

### E. Hybrid: at once everywhere, plus a trophy at Home (recommended)

A, plus the owner's gathering place without making anyone go there:

- **At the find:** the finder's full show and the balcony lesson.
- **Everyone else:** option A's flourish where they stand: rings on, mark lit, shaft flare. No freeze.
- **Late and offline friends:** their own flourish on their first landing.
- **Home keeps a trophy.** A copy of the find appears on a plinth at the finders' bay in the village, where missed
  prizes already turn up. It stays there for good, a record of what the room has found
  (Leave something for the next visitor).
- **The together moment is automatic.** The first time each player passes the plinth after an unlock, it plays for
  them: the plinth lights, the rings glint, folk nearby turn and clap. If two or three players arrive together, they
  see it together, bigger: more folk, the village bell, confetti over the bay. Nobody is sent there and nothing waits
  on it. Home is the hub everyone passes, like PEAK's campfire. The show grows with the head count while nothing about
  it gets harder (the honk-chord rule in [communal-progression](../research/communal-progression.md)).
- **Partners wear the rings.** Since the jump belongs to the room, every avatar can show the rings from room state,
  with no new presence field. This fixes the known limitation.
- **NPC beat:** a villager by the bay notices you arrive with something unseen and waves you over; when friends
  arrive together the folk gather round the plinth. No new lines; a gesture and a crowd.
- **Cost:** A, plus a plinth at the bay (start with the existing jump prize mesh on a stone block; previz before the
  final model) and a Local proximity show using partner positions the client already has. No new shared state: what's
  been found is already shared, and who has seen the plinth is Local.

## Recommendation

**E, with a critical reading.**

- **Why it wins.** It matches the owner's instinct (everyone gets it at once), it's the only option that gives the
  away friend a moment of their own, and it keeps the approved balcony lesson beside the find. The gathering place
  turns up on the route people already walk, which is the pattern that worked in the research, instead of a trip
  someone has to make.
- **Where it could be weak.** For a friend who wasn't there, a sparkle and a lit mark may not feel like getting
  anything, and the shaft flare can be missed behind a hill. The gut question tests exactly that. If it fails, make
  the flourish bigger before reaching for a summon: a short look towards the flare (camera only, with input kept), or
  the ripple sweeping over them.
- **The plinth could go unnoticed.** If nobody passes the bay, the together moment never plays. Measure whether
  players see it in the first session after a find. If not, move the plinth onto the main path through Home (beside
  the station or the Roundhouse) rather than adding a prompt.
- **Doubled moments.** The finder sees the full show twice, at the find and at the plinth. At the plinth the finder
  gets only the crowd, not another card.
- **Not the owner's puzzle-redeem idea as such.** C's "redeem in one place" becomes "the trophy waits in one place".
  The function never waits, because a find whose payoff is a trip away loses the balcony.

## Gut question

**"When the double jump arrived while you were somewhere else, did it feel like yours?"**

Variants that differ in one thing:

1. **Today:** everyone gets the full card wherever they are (the baseline, including the freeze).
2. **Flourish only:** option A, no plinth.
3. **Flourish plus plinth:** option E, arriving at Home together afterwards.

## Best suggestions, ranked

1. **Never freeze a friend for someone else's find.** Replace the partner `youGot` with a Local flourish: rings,
   two-note sound, charge mark, shaft flare. The finder keeps the full show.
2. **Give the late friend their moment.** Play the flourish once on their first landing for each ability gained while
   they were away, instead of remembering it silently.
3. **Show where it came from.** Flare the find's existing tall shaft for a few seconds, so far players look that way
   and the new place is telegraphed.
4. **Teach on the first jump, per player.** The charge mark pulses at the apex with the Jump glyph, once.
5. **Partners wear the rings,** derived from room state, so what's on screen is true for everyone.
6. **A trophy plinth at the village's finders' bay** whose show plays for whoever hasn't seen it, bigger with friends.
7. **Keep the airborne rule:** availability is shown in the air, the charge fills on landing.

## Tensions

- **A personal show for a shared unlock.** DESIGN.md 6 keeps rewards personal, and abilities are shared
  ([ability-upgrades](../research/ability-upgrades.md#co-op-fairness-and-arriving-late) already settles functional
  parity). Each player's show is personal presentation of a shared fact, and nobody earns a reward for someone else.
- **Is the plinth's ceremony a reason to go home, or a chore?** It must never be required, and its value is the
  record and the crowd, not anything functional. If it needs a pull, move it onto the route; don't add a reward.
- **The flare can spoil a place a friend hasn't walked to.** For the jump the shaft is already visible from the start;
  for later finds, flare only the direction, not a marker.
- **Big group moments vs. drop-in.** The together show grows with the head count while the difficulty stays the
  same: one player at the plinth still gets a moment.
- **The approved jump brief puts the find on an expedition.** The far-away case is common, not an edge case, so the
  flourish carries most of the feeling.

## Smallest first build

Using the existing double jump, after the line 2 playtest and with the approved jump-upgrades find, behind the same
flag:

1. **Non-finders get a flourish, not a card.** In [tools.ts](../../src/entities/railway/tools.ts) and Place's
   `showPeerTech`, only the claiming player (`event.pid`) calls `youGot`; everyone else gets a Local flourish:
   ankle puff, `pickupJump` sound, charge mark lit, no input hold, no `setAloft(false)`. While airborne, the mark
   stays hollow until landing.
2. **Shaft flare.** The device's existing shaft (or the find's own marker, once the find moves to the expedition) glows
   bright for about three seconds on the unlock, for everyone.
3. **Late joiner.** On the first grounded moment after a join, play the flourish once for unlocks the player hasn't
   seen (a Local seen-key set, like the reveal's `shown`).
4. **First-jump teach.** One apex pulse of the charge mark with the Jump glyph, Local, once per player.
5. **Greybox plinth.** A stone block at the finders' bay with the jump prize mesh. Passing within a few metres plays a
   small show for each player who hasn't seen it, and a bigger one (bell, confetti, folk turning) when a partner is
   within the same radius.

Then stop for the owner's verdict on the gut question. Partner-worn rings, the plinth's real model (previz first) and
later abilities come after.

## Done means

Capture with `look` (`?proto=place`, two or three tabs, a save just before the find):

- **The find:** the finder's full show, beside a second tab 200 m away mid-haul whose consecutive frames show
  movement continuing through the flourish, with no card, no freeze and no dropped cargo.
- **Mid-air:** a third tab jumping at the unlock moment: frames showing the hollow mark in the air, the fill on landing,
  and no extra jump spent in that flight.
- **The flare:** a still from the hauler's view showing the shaft flare on the horizon.
- **Late joiner:** a tab that joins after the find. Its flourish plays once on first landing and not again on reload.
- **First jump:** each non-finder's first double jump with the apex pulse; the second jump shows none.
- **The plinth:** one player passing alone (small show), then two arriving together (bigger show), from both tabs; the
  finder sees the crowd, not a second card.
- **Real-time video** of the hauler's flourish, since sampled frames can't show whether it feels right.

Whether it feels like yours stays the playtest's question. Not tested on a device.

## Open questions

1. **Does anyone but the finder get a card that stops them?** Recommended: **no; everyone else gets a flourish that
   never stops them, and the full card is the finder's alone.** Answer: as recommended (owner, 2026-11-06).
2. **Where's the gathering spot?** Recommended: **a trophy plinth at the finders' bay in the village, playing
   automatically the first time each player passes; never required.** Answer: as recommended (owner, 2026-11-06).
3. **Do the rings appear on everyone at once, or get fitted at Home?** Recommended: **at once, wherever you are, so
   what's on screen is true; Home keeps the trophy, not your rings.** Answer: as recommended (owner, 2026-11-06).
4. **Any summon at all?** Recommended: **no moving players; at most an optional beckon later (parked).**
   Answer: as recommended (owner, 2026-11-06).

## Parked

- An optional beckon: the finder rings the device, others see a ping ring and may walk or ride over. No teleport.
- A short camera look towards the flare, with input kept, if the flourish alone reads too small.
- Trophies for the hook and glider on the same plinth, as they're found.
- A redeem point for upgrade tiers bought from the shared wallet, which is a choice made in one place (the Sea of
  Thieves tent pattern), not a find.

## Disposition

**Proposed; owner decision needed** on the four questions. Bounded presentation work on top of the approved jump
upgrades. The shared unlock is unchanged; everything new is Local presentation. Builds after the line 2 playtest,
alongside the jump-upgrades find.
