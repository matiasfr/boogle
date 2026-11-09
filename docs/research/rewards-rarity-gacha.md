# Rewards, rarity and gacha

_Research report, 2 November 2026. What mini-games and side play could reward in Boogle: free rolls, finite collections, camp helpers, incremental growth, personal ownership and shared displays, within a roughly eight-hour co-op rail journey followed by a toy box. Live web research, developer interviews, GDC slides, papers, official descriptions and repository inspection. Recommendations for the owner to react to, not decisions or implemented systems._

**Read with.** The owner found these reward levels too gentle ("Rewards should be maximal", [decisions.md](../decisions.md)); [maximal-rewards.md](maximal-rewards.md) is the follow-up with that brief. Neither report authorizes implementation.

**Markers.** As in [sea-crossings.md](sea-crossings.md), **[V]** means the page was fetched and its words support the claim; **[S]** means search-summary evidence, a wiki, guide, forum or a reporter's paraphrase, even when that secondary page was fetched. **[I]** marks this report's inference, calculations or proposed starting numbers. A fetched interview verifies what the developer said, not that their explanation generalises to Boogle. No referenced game was played for this report, and no talk's video or audio was watched; the GDC evidence below is its published slide deck. Unmarked Boogle observations come from the linked files.

## Summary

1. Reward a detour with something the player wants to keep, place or introduce to friends. Start with a small, finishable collection; do not turn mini-games into the construction economy's best job.
2. The useful parts of gacha are surprise, a tactile opening and a memorable object. A fake near-miss, a duplicate tax and a countdown are separable design choices, not prerequisites for excitement.
3. An eight-hour game needs its best surprises inside the first evening. Hundreds-of-rolls pity, production multipliers and multi-stage duplicate fusion belong to a different timescale.
4. Camp residents are the most promising uncertain reward: a little character can make a communal place feel inhabited without making materials. Prove that appeal before building an economy around it.
5. Keep ownership personal and presentation social. One station celebration can contain separate personal parcels; nobody rolls against a friend's claim or spends a shared balance.
6. Leave som and knacks parked. A completed deed can grant an already-owned, sealed souvenir directly, with no intermediate money and no wager.

## What this adds to the existing research

The owner's brief is: “Many games maybe can reward other stuff that gives rewards for the economy or for players. We haven't really fleshed that out yet, but I remember we did some exploration on having different rarities, and like, I'm definitely interested in incremental game and gacha mechanics.”

[DESIGN.md](../../DESIGN.md), especially principle 6, binds the answer: communal world, personal earnings, no shared wallets. Principles 1–3 keep toys enjoyable without quotas, the beach ball out of income, and mini-games optional; principles 5 and 8 rule out decay, hazards and requiring friends. The [audit picks and subsequent decisions](../decisions.md) put the journey near eight hours, retain hauling for each track segment, park som and knacks, and leave helpers open. The decision log still leaves the exact way play produces materials open; this report follows the brief's narrower **hands-on work makes materials** constraint rather than treating that open question as permission for a material lottery.

| Earlier work                                                    | Carry forward                                                               | What this report changes or leaves elsewhere                                                                                                                                                                                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [0.1/9-brainrot-hooks.md](0.1/9-brainrot-hooks.md)              | Tangible finds, visible provenance, count-based protection against bad luck | Its Fine/Rare/Gleaming odds of 1/12, 1/80 and 1/600, pity at 150/900, contribution-linked luck, combining and room-wide spectacle assumed hundreds of pickups. They are not an eight-hour reward schedule. Do not adopt weather windows or production bonuses. |
| [personal-rewards.md](personal-rewards.md)                      | Earned identity and visible evidence of a deed                              | Som, knacks and long repeat-count feats are parked or unapproved. This report specifies what a finite roll could contain and when randomness should end.                                                                                                       |
| [friend-group-return.md](friend-group-return.md)                | Gifts and a world that tells absent friends what happened                   | No attendance pressure, second-player requirement or long era schedule. Its return-loop discussion does not establish the current campaign length.                                                                                                             |
| [roblox-patterns.md](roblox-patterns.md)                        | Immediately readable finds and a thing carried home                         | Do not repeat platform growth metrics or copy stock timers, mutations as income multipliers, or retention goals.                                                                                                                                               |
| [discovery-progression.md](discovery-progression.md)            | Rewards tied to places and understandable discoveries                       | Essential traversal, construction recipes and route knowledge stay outside random pools. Discovery's core progression remains that report's subject.                                                                                                           |
| [compounding-infrastructure.md](compounding-infrastructure.md)  | Infrastructure changes what work is possible                                | Core logistics already supply the incremental arc. Side rewards need not create a second exponential economy. Its possible optional boosts are not a mandate.                                                                                                  |
| [hub-and-minigames proposal](../proposals/hub-and-minigames.md) | A shared place to return with something to show                             | Its currency economy is historical; this report does not reinstate it.                                                                                                                                                                                         |

The current [mini-games](../game-design/minis.md) have local scores and bests, not reward ownership. [Hop](../../src/proto/minis/hop.ts) is a useful existing toy for a test. Golf uses the beach ball, whose income prohibition still applies. A locally stored best is not authoritative evidence for a shared reward grant. This is research only: no gameplay documentation or completed prototype checkbox should change with it.

## Findings from games and their makers

### 1. Animal Crossing and Odyssey: distinguish the surprise from the souvenir

**[S]** The relevant Animal Crossing reference is the **fortune cookie**, particularly New Leaf and Pocket Camp, rather than a general capsule-shop system. New Leaf cookies exchange fortunes for items; Pocket Camp cookies produce furniture or clothing and can repeat. Pocket Camp Complete retains cookies and also has a Complete Ticket catalogue route. Selecting a cookie is not the same as selecting the item inside it ([Nookipedia: fortune cookies](https://nookipedia.com/wiki/Fortune_cookie), [Complete Tickets](https://nookipedia.com/wiki/Complete_Ticket), [Pocket Camp wiki](https://animalcrossingpocketcamp.wiki.gg/wiki/Fortune_Cookies)). These are secondary descriptions, not verified current odds or stamp-exchange costs.

**[V]** Complete's official FAQ says players cannot manually share items with registered campers; Camper Cards can instead provide items. It is therefore not evidence for a live co-op gifting system ([Nintendo FAQ](https://faq.complete.ac-pocketcamp.com/hc/en-us/articles/41083263146137-Frequently-Asked-Questions)).

**[S, indexed official page; fetch timed out]** Odyssey's shops are **Crazy Cap**, not “capture shops.” They sell selected outfits, stickers and souvenirs using coins, rather than random capsule contents. Nintendo describes stickers on the Odyssey's exterior and souvenirs inside; outfits have no special powers but can admit Mario to special places. That last qualification matters: their access restrictions should not transfer to Boogle ([Nintendo's kingdom guide](https://supermario.nintendo.com/explore/)).

**[I] Boogle:** borrow the fortune cookie's little ceremony and the Odyssey's travelling display. A station sticker that says where a friend went may be a better reward than a statistically rarer recolour. Offer direct choice as a serious alternative to random acquisition; the reference does not prove randomness is doing the valuable work.

### 2. Pokémon GO and Genshin: anticipation and a bounded worst case

**[V]** Pokémon GO eggs hatch after walking with an incubator. Niantic's help page lets players inspect an egg's possible species in rarity groups and says tapping can accelerate the hatch animation. It also distinguishes the unlimited incubator from additional shop incubators. The page does not provide exact hatch probabilities ([official egg guide](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/2358-incubators-hatching-pokemon-eggs/)).

**[I] Boogle:** a parcel earned on an expedition can travel home with its owner. Anticipation can come from carrying it to a friend; it needs no extra lap counter, hatch timer, limited incubator or open browser. Let it be opened anywhere and kept sealed indefinitely. Do not make walking in circles the price of a cosmetic.

**[S]** Genshin's character-event wish rules are a useful _mechanism_ reference: the documented 90-wish hard guarantee and carry-over between corresponding event banners bound an unlucky sequence. The official Character Event Wish-2 article was located but yielded no readable body; the details here are secondary verification, not an audit of current banners. Community “soft pity” estimates are not treated as official, and no universal current 50/50 rule is assumed ([HoYoverse article](https://genshin.hoyoverse.com/m/en/news/detail/17072), [character-event wish reference](https://genshin-impact.fandom.com/wiki/Character_Event_Wish)).

**[I] Boogle:** copy an understandable maximum number of misses and save that progress. Reject banner rotation, expiring opportunities, several currency conversions, losing a featured-item coin flip, and building pity as a reason to keep playing. Four claims can be a meaningful first-evening guarantee; ninety cannot.

### 3. Tamagotchi and Dreamlight Valley: a reward that behaves

**[V]** Bandai describes feeding, cleaning, treating illness, discipline and mini-games, with different characters growing from different care. That establishes an expressive relationship, but also maintenance obligations ([Original Tamagotchi product description](https://tamagotchi-official.com/us/series/original/item/01_525/)).

**[V]** Dreamlight Valley's April 2023 update added companion selfie poses and craftable items for displaying multiple companions simultaneously. This is a direct example of making a collected companion present in a decorated world ([Gameloft update](https://disneydreamlightvalley.com/news/Pride-of-the-Valley-Content-Update)). **[S]** Villager friendship roles can provide additional resources; those working villagers should not be conflated with the companion display feature ([friendship reference](https://dreamlightvalleywiki.com/Friendship)).

**[I] Boogle:** take the greeting, idiosyncratic movement, shared photograph and home placement. Drop hunger, sickness, absence penalties and resource bonuses. A helper can remember riding a train or watch a parcel open without requiring daily care. “Sleepy” should describe an animation preference, never a productivity defect the player must repair.

### 4. Palworld: three reward loops that should not be bundled together

**[V]** Pocketpair describes Pals as companions, mounts and workers for production and construction, including automation; this is explicitly a survival and production game ([developer's store description](https://store.steampowered.com/app/1623730/Palworld/)).

**[S]** Pal material drops, collecting individuals, and condensing duplicates are distinct mechanisms. For example, Lamball has a material-drop table and can supply wool through ranch work. Condensation sacrifices same-species Pals to improve the retained Pal's stats and working capability. Costs have changed across versions, so old totals are not a safe current specification ([Lamball](https://palworld.wiki.gg/wiki/Lamball), [Pal Condensation](https://palworld.wiki.gg/wiki/Condensation)).

**[I] Boogle:** a reliable material from a known activity serves planning; a surprising personality serves collection. Mixing them makes the lucky helper an economic requirement. Deterministic duplicate fusion still creates a grind if the desired character needs many copies. Do not make friends grind creatures into a superior worker. If spare objects need a use, gift or place them; converting two spare decorations into a chosen paint pattern is a possible bounded fallback, not another progression tree.

### 5. Deep Rock Galactic: consequential variety, with a live-service schedule to discard

**[V, historical]** Ghost Ship's September 2019 Deep Dive FAQ describes randomly infused Matrix Cores, weekly reward sources and an extra reward from forge mastery after five crafts. It discusses later influence over rewards as future work, not something already shipped in that announcement ([studio FAQ](https://store.steampowered.com/news/posts/?appids=548430&enddate=1569495768)). **[S]** Overclocks alter weapon behaviour and performance; they are not simply cosmetics ([overclock reference](https://deeprockgalactic.wiki.gg/wiki/Overclocks)).

**[I] Boogle:** learn from a reward that suggests a new experiment, but keep that experiment inside optional toys. A whistle voice or wobbling toy attachment is appropriate; a roll granting better hauling or the only useful camp worker is not. Do not copy weekly locks or ask players to divert construction stock into crafting a reward they already earned. This report does not claim the historical FAQ proves current duplicate protection or class-choice details.

### 6. Vampire Survivors and Balatro: spectacle can end in a choice

**[S, interview paraphrase]** Galante attributes influence from his gambling-app work specifically to Vampire Survivors' chest openings, not the whole game's design ([Game Developer's account of the Game Informer interview](https://www.gamedeveloper.com/design/vampire-survivors-development-sounds-like-an-open-source-fueled-fever-dream)). That supports studying the staging separately from the progression model; it does not establish that any particular animation is harmless.

**[V]** Poncle's Adventures FAQ describes short, self-contained progression paths with explicit chapter conditions and unlocks, while retaining the main game's unlocks. Its local co-op FAQ explicitly rejects co-op-only achievements and offers taking turns on treasure chests. These are historical mode descriptions, not claims about the game's current online feature set ([Adventures](https://poncle.games/adventures-faq), [local co-op](https://poncle.games/coop-faq)).

**[S]** Balatro packs reveal several options from which the player selects a limited number; pack type determines the contents and choice count ([pack reference](https://balatrogame.fandom.com/wiki/Booster_Packs)). **[V]** LocalThunk describes balancing so a very strong option does not cannibalise adjacent strategies, and mitigating randomness as part of successful play ([creator interview](https://rogueliker.com/balatro-interview/)).

**[I] Boogle:** a three-object tray can preserve the reveal while letting someone choose what suits their station. Unlike Balatro, Boogle does not need a losing run, a price, or a stronger build. Unlike the referenced Vampire Survivors mode, friends need not take turns receiving a scarce communal chest: each can own a parcel from the same occasion.

### 7. Cookie Clicker, Melvor and Anti-Idle: incremental is not synonymous with idle

**[V]** Anthony Pecorella's GDC Europe 2016 slides distinguish incremental, idle and clicker design, discuss unfolding complexity, and show the tension between rising generator costs and production. They also discuss preserving the relevance of earlier generators ([_Quest for Progress_, especially slides 6–18 and 22–26](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf)). This is a vocabulary and balancing framework, not a retention target for Boogle.

**[V]** Cookie Clicker's official description centres on spending cookies to make more cookies, with a growing cast of producers and permanent upgrades ([developer description](https://store.steampowered.com/app/1454400/Cookie_Clicker/)). **[V]** Melvor creator Brendan Malcolm describes condensing RuneScape-like progression into a format for players with limited time ([developer interview](https://www.mmorpg.com/interviews/interview-digging-deep-into-melvor-idle-with-its-creator-brendan-malcolm-2000123838)). **[V]** Tukkun's original Anti-Idle listing explicitly supports playing actively or idly and advertises endless goals; its developer text also clarifies that it is not multiplayer ([original listing](https://www.kongregate.com/en/games/tukkun/anti-idle-the-game)).

**[I] Boogle:** retain clear feedback, accumulation and the next interesting transformation. Reject the assumption that an economy must run unattended or last indefinitely. “Several mini-games feed a common progression” is useful; hundreds of achievements, several currencies and permanent output multipliers are not the right initial scale. Melvor's respect for limited attention does not mean its total progression length suits an eight-hour campaign.

### 8. Paperclips, SPACEPLAN, A Dark Room and Kittens: change the meaning of progress

**[V]** Frank Lantz describes Universal Paperclips moving from making individual clips to automation and a much larger scope. The live game's interface contains manufacturing, computational resources and space exploration ([creator interview](https://www.ycombinator.com/blog/frank-lantz-director-of-nyus-game-center-and-creator-of-universal-paperclips), [shipped web interface](https://www.decisionproblem.com/paperclips/index2.html)). **[S]** Its ending is described in the secondary game account; it was not reached in a playthrough here ([reference](https://en.wikipedia.org/wiki/Universal_Paperclips)).

**[V]** SPACEPLAN's developer description promises a narrative, fifteen potato-based items and five planets across two realities, driven by clicks and time. **[S]** Its finite ending is confirmed here only through a review, not a completed playthrough ([developer description](https://store.steampowered.com/app/616110/SPACEPLAN/), [review](https://toucharcade.com/2017/05/08/spaceplan-review-delicious-potatoes/)).

**[V, source inspection]** A Dark Room's outside module contains both direct wood gathering and worker/resource conversions: the available actions grow beyond the original verb ([source](https://raw.githubusercontent.com/doublespeakgames/adarkroom/main/script/outside.js)). **[V]** Kittens Game's repository guidelines explicitly favour multiple solutions to bottlenecks, initially difficult tasks improved by upgrades, and considering enormous later scale; they warn against price reductions ([developer repository, design principles](https://github.com/nuclear-unicorn/kittensgame#general-design-principles)).

**[I] Boogle:** unfolding is a change in what a player can do or notice. One shelf becomes a station display; a resident starts greeting the passing train; a completed set becomes a little camp scene. The main rail loop already changes geography and logistics. Rewards should not reproduce Kittens' deliberately renewed bottlenecks or Paperclips' exponential scope just to extend the clock. A finite narrative incremental is a better timescale reference than an endless idle economy, without importing its exact resource model.

### 9. Grow a Garden and Bee Swarm: make the collection visible, not compulsory

**[V]** Jandel identifies returning to plants that have grown or fruited while away as central to Grow a Garden's appeal ([developer interview](https://gamesbeat.com/janzen-madsen-interview/)). **[V]** Onett's description of Bee Swarm connects a growing hive of bees with distinct personalities to gathering pollen, making honey, quests and further exploration ([developer description](https://www.roblox.com/games/1537690962/Bee-Swarm-Simulator)).

**[I] Boogle:** borrow the legible change in a place and a collection of distinct little characters. Leave exact mutation/jelly odds, shop refreshes and market claims to verified game-specific analysis; none is needed here. A rare bee that increases output or opens the next area is a poor template for optional camp life. Returning to a resident's new idle pose is enough to test; an offline resource farm would reopen the core supply design. The existing decision to bank one network project while nobody plays does not authorise a second offline reward economy.

## What makes a roll exciting in one evening?

**[I]** Treat the roll as four things: an earned occasion, an unknown result, a readable reveal, and something useful to do with the result. Rarity alone supplies only the second.

| Part           | Starting Boogle treatment                                                                                      | Short-game failure to avoid                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Anticipation   | A visible sealed parcel with its source on the label; open now or later                                        | A second effort requirement after earning it, or a countdown to losing it   |
| Reveal staging | About 0.3 s of settling, 0.6 s of opening, then a 0.6–1.0 s object-specific action; input can skip immediately | Ten-second repeated cutscenes, blocking movement, holding up the room       |
| Surprise       | Contents are unknown, but the small catalogue, exclusions and guarantee are inspectable                        | Concealing rules or changing odds according to engagement                   |
| Near-miss      | None in the random reveal: show the actual prize, never a passing almost-won rare                              | Making a miss resemble almost-success at a skill the player cannot exercise |
| Duplicates     | Prefer no repeats until the finite set is complete; otherwise offer a chosen new option                        | Rarity upgrades demanding dozens of unwanted copies                         |
| Pity           | A plainly stated first special by claim 4; progress never expires or resets on leaving                         | Copying a live-service counter larger than a Boogle campaign                |
| Payoff         | Wear, place, name or introduce it immediately, using an ordinary interact affordance                           | A collection menu whose contents never become part of play                  |

A common reward deserves a complete animation and a funny silhouette. If it is disappointing even on its first appearance, improving the odds does not fix the catalogue. A guarantee should be announced as the rule, not disguised as miraculous luck. Provide reduced-motion and quiet versions; rarity remains readable without sound. Visual novelty can distinguish rewards without louder-is-better escalation.

### The probability budget is the number of actual claims

**[I, calculated]** With independent rolls at probability `p`, the chance of seeing at least one success in `n` rolls is `1 - (1 - p)^n`:

| Base chance | After 6 rolls | After 24 rolls |
| ----------- | ------------- | -------------- |
| 5%          | 26.5%         | 70.8%          |
| 1%          | 5.9%          | 21.4%          |

Thus “a few percent” can leave most first-evening players without the headline reward. Conversely, a repeated hard guarantee on the sixth roll radically changes effective rarity: at 5% base chance, expected wait becomes about 5.30 rolls and long-run frequency about 18.9%, not 5%. These are illustrative independent-roll calculations, **not** forecasts for the no-repeat candidate below.

Use three separate labels in design notes: **base weight**, **current conditional chance**, and **maximum wait**. Removing owned items changes the conditional chances; a guarantee changes them again. Never advertise the base table as the realised distribution. Drawing without replacement produces a finite collection, not an indefinitely rare status object.

## What should be rollable?

**[I]** Start with one or two asset families. Each new family adds attachment, placement, ownership and presentation work beyond the catalogue's item count.

| Reward family           | Why a friend notices it                           | Fit and starting constraint                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Looks/material variants | Personal expression in a familiar character       | Cheap but weak at distance; use strong pattern changes, not tiny hue differences. Never obscure player identity or promise stat changes.                                                      |
| Hats                    | Silhouette immediately changes                    | Strong first family: 4–6 hats, all desirable. Keep player head/readability and camera clearance; no exclusive traversal.                                                                      |
| Train decoration        | The collection travels past everybody             | Strong social display: initially 2 mounts per carriage for ornaments or route stickers. Ownership persists when an ornament is unmounted. No speed, freight or timetable changes.             |
| Station decoration      | Friends repeatedly visit and can remember a giver | Strong first family: a shelf with 6 visible slots and a readable attribution on interact. Display overflow goes into storage, never gets deleted.                                             |
| Town decoration         | Makes collective progress tangible                | Useful later; use a few designated plots rather than unrestricted props or obstacles. No building recipe or service locked behind a roll.                                                     |
| Toys                    | Gives a new reason to fool around                 | Roll skins, sounds or harmless variants of a toy everyone can already use. Do not randomly withhold the only interesting verb.                                                                |
| Pets                    | Attachment, following and introductions           | Appealing but expensive in animation and crowd management. One active follower per player; camp storage for the rest, no feeding meter.                                                       |
| Camp helpers/residents  | A shared place looks inhabited and reacts to work | Highest-interest experiment. Start with 3 personalities on one rig, at most 4 animated residents per camp, and zero production differences. More owned residents remain selectable, not lost. |

A helper can inspect a bundle, straighten a purely decorative sign, imitate a honk, snooze on an empty crate or greet a train. Do not show it repeatedly “making” a material that never enters stock: that misrepresents the economy. If it handles real stock, animate a real, conserved transfer under the normal logistics rules.

### Three tiers, read through objects

**[I]** Trial catalogue: **12 authored entries: 6 Familiar, 4 Curious, 2 Wonderful**. Names are provisional. These are presentation/discovery tiers, not quality or power scores.

| Tier      | Initial tier weight, before protection | World-readable distinction                                                                             |
| --------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Familiar  | 70 of 100                              | A recognisable funny shape and one solid identifying feature; complete, attractive material treatment  |
| Curious   | 25 of 100                              | A different outline or moving detail: umbrella hat, bobbing sign, hinged little passenger              |
| Wonderful | 5 of 100                               | A small authored behaviour, such as a clockwork ornament unfolding to wave; not a bigger income number |

Within an eligible tier, choose uniformly among remaining items. If a tier is empty, omit its weight and renormalise the others. A protection rule overrides weights openly. Every item has an icon/shape and written tier in its inspection card; colour is supplementary. Do not require bloom, a distant beam or a constant particle halo to recognise it. Test silhouette at approximately 5 m and 15 m in the real camera; the inventory icon is insufficient evidence.

Rarity says how early an object is likely to appear. Provenance says why _this copy_ matters: who earned it, what they were doing, and who gave it. A common train souvenir from a ridiculous group outing can therefore remain the favourite after the catalogue is complete.

## Touching the economy without printing materials

**[I]** The cleanest relationship is: hands-on play supplies construction; side play supplies personal expression that decorates that construction. Randomness never determines whether the group can build, and an optional mini-game has **zero materials per minute**, so it cannot become the fastest material farm.

| Safe form                               | Concrete initial cap                                                                                                                          | Why it respects the material loop                                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Display on useful infrastructure        | 2 train mounts or 6 station shelf slots; unlimited retained ownership within the small catalogue                                              | Uses the rail network as a social surface without altering output                                                    |
| Cosmetic construction kit               | One placement licence per owned design, freely moveable; salvage returns **0 construction units**                                             | A free ornament cannot be dismantled into track stock                                                                |
| Information/provenance                  | One optional source hint or stamped delivery label; all essential source information remains available normally                               | Helps someone notice work without withholding the viable route from unlucky players                                  |
| Resident presentation of a core service | Same capacity and schedule for every skin; **0 bonus yield, 0 speed bonus, 0 extra offline bank**                                             | The earned thing changes who appears to do the work, not access to the work                                          |
| Optional stock sorting experiment       | One transfer of at most `min(6, floor(projectCost / 10))` existing units per project, within an 8 m depot area; room-wide cap, not per player | Conserves stock and leaves the track-segment haul to the player; baseline service must be available without any roll |

The last row is a possible experiment **only if core camp logistics adopts that service**. It is not recommended as an exclusive prize. The cap applies to automated movement, not a discount in the project's bill. Even a zero-yield transport advantage can become compulsory if it replaces an unpleasant task, so the roll may supply its resident's appearance but never its faster version.

Do not reward mini-games with material chests, percentage refunds, “double your next haul,” luck equipment, automated harvesters, temporary output buffs or exchangeable scrap. A low numerical cap does not rescue a reward that everybody feels foolish for skipping. If the owner later wants mini-games to make construction stock, that is a separate change to the brief's boundary, to evaluate against the real haul loop rather than slipping it into a cosmetic system.

## Incremental feel within eight hours

**[I]** The honest distinction is the player's reason to repeat. Incremental pleasure means a visible accumulation produces a meaningful transformation or a new choice. Grind means performing an already-solved action mainly because the desired result is held behind its counter. Determinism, free entry and cheerful art do not change that distinction.

Use a bounded ladder such as **1 → 3 → 6 memories**: the resident greets you, then acquires a personalised camp nook, then performs a little shared scene. Memories come from distinct ordinary events already worth doing, not six repetitions of a feeding button. All choices remain available after the finale. This is an experiential progression suggestion, not a new knack or contribution rank.

| Campaign window, a playtest target rather than a timer | Reward function                                                                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First 10 minutes                                       | Receive a guaranteed appealing starter and understand where it lives                                                                                                      |
| First 60–90 minutes                                    | Experience 3–4 meaningful claims or transformations and the first special item                                                                                            |
| Middle hours                                           | Recognise growing displays and differing tastes; at most 2–3 new reward behaviours to learn                                                                               |
| Before the finale                                      | See a reachable collection endpoint; no last rare blocks the ending                                                                                                       |
| Toy box                                                | Keep all owned things; choose missing designs freely or complete them through short deterministic alternatives; stop random acquisition when it has nothing left to offer |

These are hypotheses, not measured pacing. If satisfying deeds grant all twelve items earlier than expected, do not insert waiting to preserve an eight-hour reward schedule. The rail journey is the game; the collection may finish sooner. Conversely, if a rare remains missing at the finale, unlock a direct choice rather than invent a postgame farming obligation. Avoid prestige that removes shared construction, exponentially increasing duplicate costs, separate multipliers and offline reward production. The physical network already supplies the major growth arc.

## Co-op: one occasion, personal rewards

**[I]** At a shared station milestone, each eligible player owns their own claim. The stage and moment are shared; the inventory and bad-luck protection are per person. Do not put one rare chest in the world and let the quickest player claim it. Do not make friends divide a fixed material payout or vote on spending everybody's tickets.

- **Solo and late arrivals:** any entitlement offered through co-op has a solo route. Completed rail milestones remain claimable on a later visit; attendance at the ceremony is not required. Catch-up gives objects, never a speed or production advantage. Explain it as a souvenir of a completed place, not a contribution the absent player made.
- **Watching:** opening near friends shows the real object and a short animation in place. Start with an audible/visible radius around 10 m, with distance attenuation; no room-wide toast, camera grab or “come now” timer. Several simultaneous openings must not queue everybody's controls. Remote friends can inspect the placed result later.
- **A truly shared random outcome:** a communal confetti colour or festival banner can be rolled for a moment because no personal earning is consumed. Persistent rewards still have personal ownership; the group does not lose an item because somebody changed a display.
- **Gifting:** start with a signed display copy of an owned design. Its receiver can place it, but it does not mint claim credit or increment collection progress. The giver keeps the original. This is explicit copying, not scarcity-preserving trading. A small catalogue plus placement caps bounds the consequence without making generosity expensive.
- **If unique copies matter later:** gifting must move one instance atomically, with acceptance and a cancel path. Two-party trades need both exact offers and both acceptances committed together; disconnect cannot leave one side paid. No blind trades, material exchange rates, auction house, or roll-credit trading. This is more work than the first prototype needs.
- **Duplicates:** no-repeat acquisition is the simplest answer. A deliberately selected known item can become a gift or another placement. If repeats are retained, guarantee an unowned option within the next 3 claims, and offer a direct choice before the finale. Do not require trading or another player to finish a set.

Display ownership needs the same care as wallet ownership: friends can inspect or use a toy, but cannot delete someone else's earned object. Use designated personal shelf slots initially. Replacing your mounted object returns it to your collection. A train slot already occupied by a friend's ornament is not silently overwritten.

## What replaces som?

**[I] Recommendation: nothing fungible in the first test.** Completing a qualifying deed awards a parcel directly. The parcel is already the player's property; opening it does not stake money or sacrifice a resource. It has no sale value and cannot buy construction goods. A “claim 3 of 12” label is progress, not a wallet.

| Option                          | Benefit                                              | Cost / recommendation                                                                                                                                                                                      |
| ------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct parcel or souvenir offer | Few rules; clear link between deed and object        | Preferred. Outcomes can be fixed at grant, with opening deferred.                                                                                                                                          |
| Personal stamps, one per offer  | Lets the player save up or choose an offering family | Only if that choice proves useful. One stamp equals one offer, one denomination, no expiry, exchange rate, interest, shared balance or stamp-to-material conversion. Otherwise it is som under a new name. |
| Materials as roll payment       | Reuses an existing number                            | Reject: puts personal chance in competition with the shared rail project.                                                                                                                                  |
| Duplicate dust                  | Makes repeats look productive                        | Avoid initially: requires another balance, prices and grind targets to repair a problem no-repeat draws eliminate.                                                                                         |

Distinct earned deeds should receive immutable IDs. A first finish on a hop course, a new discovery or a qualifying contribution at a new rail section can each be an alternative source; time logged in, repeated start/reset, and best-score farming cannot. There must be enough core-work alternatives to earn the full collection without mini-games, and no mini-game source involving the beach ball. Do not add a checklist of mandatory activity types. The owner should first answer whether the toy itself is enjoyable, as [find-the-fun.md](../plans/find-the-fun.md) requires.

## Player respect when no real money changes hands

**[V]** Clark and colleagues found that near-misses in a simplified monetary slot task were less pleasant than full misses but increased the desire to continue in the participant-control condition. This is not a measurement of free co-op games or a basis to diagnose players. It is evidence against assuming an engineered almost-win is neutral ([2009 paper](https://motivation.site.wesleyan.edu/files/2016/06/Clark-2009-Neuron1.pdf)).

**[V]** Zagal, Björk and Lewis analyse dark game-design patterns through conflicts with players' interests, including time and social dimensions, not only monetary loss ([2013 paper](https://ri.diva-portal.org/smash/get/diva2:1043332/FULLTEXT01.pdf)). Removing payments removes the purchase pressure; it does not remove pressure on attention, completion or friendships.

**[I] Keep:** voluntary suspense, expressive packaging, genuinely different outcomes, a bounded surprise, visible progress, jokes, generosity and showing friends what happened. **Avoid:** fake near-misses; losses presented as wins; hidden or adaptive odds; daily streaks; expiring claims; exclusive attendance items; stock countdowns; “your helper misses you” guilt; guaranteed rewards that reset when switching activity; contribution-based luck advantages; infinite fusion ladders; and announcements designed to make everyone compare luck.

Players should be able to inspect the entire small pool, the current rule and the maximum wait, skip an opening, mute it, defer it, finish the collection, and stop. A reduced-motion reveal must award the same thing. None of those options spends a currency. A skill near-miss on a hop is different from a fake random near-miss: the former can truthfully teach a controllable action; the latter cannot.

## Determinism and ownership: where a future implementation belongs

[0.1/10-groundwork.md](0.1/10-groundwork.md) correctly places consequential rolls in Lockstep using [mulberry32](../../src/sim/rng.ts). Its earlier implementation sketches are not the whole current identity contract: [identity.ts](../../src/player/identity.ts) now uses a browser-local pid and secret, binds the pid through the room connection, and makes a newer tab take over from the older one. [Roster](../../src/world/rules/roster.ts) stores the host-stamped identity as an index. No account or recoverable cross-device collection is established by those files. Clearing site storage can lose the association; a local cosmetic cache is not an authoritative transferable inventory.

### Standard-engine comparison

| Primary documentation, fetched **[V]**                                                                               | What it establishes                                                                    | Boogle difference **[I]**                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [Unity Random.state](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Random-state.html)                | Random state can be saved and restored to reproduce a sequence                         | Do not use one global cosmetic/gameplay stream; interleaved animations would perturb reward results.                               |
| [Unreal Random Streams](https://dev.epicgames.com/documentation/en-us/unreal-engine/random-streams-in-unreal-engine) | Seeded streams produce repeatable sequences                                            | Boogle needs the same result in server and browser replay, so its existing pure TypeScript generator is the shared implementation. |
| [Godot RandomNumberGenerator](https://docs.godotengine.org/en/stable/classes/class_randomnumbergenerator.html)       | Seed/state support repeatability; the underlying algorithm is an implementation detail | Save an explicit reward-table version and receipt, not an assumption that an engine upgrade or new catalogue preserves old draws.  |

**[I] Proposed contract, not implemented:**

1. Use the existing [rule recipe](../../src/world/rules/README.md): proposed `src/sim/rewards.ts` for pure logic, `src/world/rules/rewards.ts` for state and ops, one appended rule registration, and a small `src/features/rewards.ts` adapter. No second economy service or dependency. Source events can come from accepted stock contributions and [sites.onSectionDone](../../src/world/rules/sites.ts); do not modify source yields in [sources.ts](../../src/world/rules/sources.ts).
2. Keep a per-player ledger of granted deed IDs, claim ordinal, ownership, protected-draw state and immutable receipts. Hash and serialize it with the world. A grant is idempotent; replaying the deed or reconnecting cannot issue it twice. Handle a missing/full roster and unknown catalogue IDs with real validation.
3. Derive each grant's seed with a specified integer hash of the room/world seed, reward-domain salt, table version, roster identity and that player's saved claim ordinal. Instantiate `mulberry32` for this grant. Its current closure exposes no serializable internal state, so a per-grant stream plus persisted ordinal/receipt is simpler than pretending the closure can be saved. Do not seed from reveal time, wall clock, total room rolls or another player's claim order.
4. Choose among a fixed ordered catalogue using integer weights; record the item or all draft options **when the grant is accepted**, before animation. Opening or reconnecting never rerolls. Protection counts granted claims, including unopened ones, so hoarding parcels cannot bypass it. Selected-item drafts also save the pending offer and commit the selection once.
5. Validate entitlement from authoritative rule state. Hop's local best is not proof: a future completion contract needs bounded, validated events or must remain an explicitly untrusted, isolated prototype. Do not pretend server-bound identity verifies locally reported physics or a score. Random seeds here provide reproducibility, not cryptographic secrecy or anti-cheat; a friend can inspect a deterministic sequence. With no cash value, prefer a simple honest contract over a hidden-odds service.
6. `apply` changes the ledger and returns a result. The adapter's `onApplied` creates the reveal, sound and UI; `submitEdit` returning true means queued, not earned. Snapshot restore reconstructs ownership without replaying old celebrations. Persist only hash-verified world state through the existing sync path.
7. Persistent placement/instance ownership and any atomic gift transfer are Lockstep. Cosmetic idle poses and reveal easing are Local; their timing must not affect the reward. A transient invitation to watch can use the room event interface, but must never be the ownership record. Follow the existing namespace/version rules for saved shapes and mixed builds.
8. If built, write only meaningful pure tests: same seeds and accepted deeds produce the same receipts; rejection changes nothing; guarantee and no-repeat bounds hold; save/load preserves pending offers; replay cannot double-grant; gifts conserve instances if transfers exist. Extend the world replay fixtures/invariants. No new UI unit suite; use the existing look harness for presentation. Research alone does not require those tests now.

## Three complete candidates: an evening of play

All three are **[I]**, mutually alternative first systems rather than three layers to ship together. All grant zero construction material, work solo, retain earnings when players leave, and have no real-time expiration. The durations are proposed test scripts, not observed pacing.

### A. Station capsules — the smallest collection system

**Rules.** Twelve objects: six Familiar, four Curious, two Wonderful, initially split between hats and station/train souvenirs. Twelve personal earned claims total, each from a distinct qualifying deed, with core rail, discovery and non-ball mini-game alternatives. No required mix. Aim for four claims within the first 90 minutes, but never add a timer if someone earns them sooner. The starter is the first claim. Draw without replacement using the tier weights above; if the first three grants contain no Wonderful item, the fourth is chosen from that tier. All twelve claims therefore finish the collection. Opening all parcels is optional; ownership starts at grant. Completed rail milestones can supply missed claims on a late visit, up to the same personal cap.

**One evening.** You complete the first satisfying work interaction and get a parcel containing a crooked hat. A friend arrives, sees it, and earns their own starter. At a new section you get a waving station ornament. You choose a hop detour while your friend explores; each gets another claim through a different deed. Near camp you open your fourth parcel together. The guaranteed special is explained in advance; which special appears remains a surprise. You mount the ornament and give your friend a signed display copy. Their ownership did not depend on being present for your roll.

**Completion and duplicates.** No duplicates while collecting. After twelve grants, the dispenser becomes a free chooser of owned designs for display and signed gifts, with no more random reward farming. The finale opens direct selection of any still-missing designs, without inventing deeds the player did not do. Catalogue completion itself grants no economic multiplier.

**Risks.** A twelve-item collection may finish early; that is acceptable unless it reveals the objects were the only reason to play. The guarantee makes “Wonderful” a presentation tier rather than permanent social scarcity. Hats and souvenirs still require two attachment/placement paths. Fixed milestone catch-up may feel too generous to a collector, which is a reason to test the goal of the system, not to punish late friends.

### B. Souvenir trays — surprise followed by taste

**Rules.** Twelve earned offers across the journey, using the same alternative deed sources as A. An offer contains three distinct unowned designs from an eighteen-design catalogue; take one. Use the same three presentation tiers, initially 9 Familiar, 6 Curious and 3 Wonderful, with 70/25/5 tier weights and empty tiers omitted. Before every fourth grant, the player may nominate a missing favourite that is guaranteed to appear in that offer; leaving the nomination empty uses a missing Wonderful item if available. Choosing something else is allowed and is not falsely described as a failed guarantee. Keep one pending tray per player: later earned deeds wait safely in a queue until it is resolved, so unresolved offers cannot invalidate each other's no-repeat guarantee. Offers persist with no selection timer. No prices or rerolls.

**One evening.** After a new rail section, a tray opens with a bobbing sign, a large hat and a carriage ornament. You pick the sign because it fits the station you are decorating. Your friend picks a different object from their own tray. After exploring and playing hop you have three selected objects; the fourth offer includes the moon-shaped ornament you nominated. You select it while your friend takes a new umbrella hat and sends you a signed copy for the station's hat stand. You spend the ride arranging and comparing the results.

**Completion and duplicates.** Already-owned designs are available through the free display/gift selector, never charged against an offer. A gift copy does not advance collection credit. Twelve offers do not promise all eighteen designs; at the finale, the remaining catalogue becomes freely selectable for the toy box. No complete-set bonus makes that an unfinished power grind. All styles are previewable from the start.

**Risks.** Choosing repeatedly can interrupt play and turn a surprise into shopping. Eighteen designs cost more art than A. If players always choose the rarest tier regardless of taste, remove the tier hierarchy before adding stronger rewards. There is less suspense over the final item but more agency over the result.

### C. Camp company — a resident grows into a character

**Rules.** Start with a guaranteed resident chosen from three looks on one rig. Six earnable personality/prop combinations are drawn without replacement through the same kinds of deeds as A; these are expressions, not work stats. Start with 3 Familiar, 2 Curious and 1 Wonderful combination at the same initial tier weights as A. The fourth grant guarantees the Wonderful authored scene if it has not appeared earlier. Separately, the resident records up to six distinct ordinary moments, with changes at 1, 3 and 6: a greeting, a furnished nook, then a short celebratory routine. Neither track requires feeding, absence management, repeated petting or another player. The starting helper has the same practical capability as the finished one: no extra material, speed or capacity.

**One evening.** Your new resident follows you back from the first work site and settles by camp. Riding the train together records its first memory; it now greets that train. A side-play parcel reveals a habit of dramatically inspecting empty crates. Your friend returns with a resident that naps under a tiny umbrella. A later discovery records another memory; a section completion gives a third and adds a little personal nook. Near the end of the session, your fourth expression grant supplies a special routine. Friends watch the residents imitate the station departure, then go back to building.

**Completion and duplicates.** Six expression grants finish the small set; six memories finish the visible growth ladder. The post-finale toy box allows selecting all looks and routines, while keeping the record of actually experienced memories truthful. No duplicate creature fusion. Gift a signed costume or prop design, not a creature that has to be consumed to improve another. One active resident per player, at most four animated at a camp; additional visitors' residents can remain visible in quiet seated poses. Other owned looks remain accessible through the camp display selector.

**Risks.** Expressive characters need substantially more animation than hats. The strongest unknown is whether a nonproductive resident is reward enough. Repeated routines may become noise; cap them, allow quiet idles and give players control over who appears. If players ask for useful helpers, first test presentation of an equally available core logistics service rather than adding random productivity.

## Numbered recommendations

These are starting proposals for owner review; none changes a decision in [decisions.md](../decisions.md).

1. **Start with A's finite collection, and test C's appeal before expanding it:** 12 objects and 12 claims, with 6 Familiar, 4 Curious and 2 Wonderful entries. Serve toys-before-chores and personal earnings in [DESIGN.md](../../DESIGN.md); replace the scale, not the provenance idea, of [the earlier rarity exploration](0.1/9-brainrot-hooks.md).
2. **Make the first evening representative:** target 3–4 claims in 60–90 minutes, no repeats in A, and the first Wonderful item by claim 4; use 70/25/5 as initial tier weights, disclosing that protection changes actual chances. Author the bounds in the proposed reward sim following [the rule recipe](../../src/world/rules/README.md), not in reveal UI.
3. **Give side play zero construction yield:** no material jackpots, refunds, luck gear or output multipliers. Optional sorting may move at most `min(6, floor(projectCost / 10))` existing units within 8 m per project only as a universally available core service; rewards can change its appearance. Preserve [source conservation](../../src/world/rules/sources.ts), [site accounting](../../src/world/rules/sites.ts) and [hands-on hauling decisions](../decisions.md).
4. **Keep som and knacks parked:** grant one direct parcel per eligible distinct deed, with a 12-claim campaign cap and enough core-work alternatives to earn all twelve. No beach-ball income, repeat-score farming or required mix of activities; [minis](../game-design/minis.md) and [find-the-fun](../plans/find-the-fun.md) remain toys first.
5. **Test helpers as characters before workers:** 3 personalities on one rig, 1 active per player and at most 4 animated per camp, with 0 production differences. Compare against the open helper decision in [decisions.md](../decisions.md), not the superseded helper multipliers.
6. **Use a finite growth ladder:** visible changes at 1, 3 and 6 distinct memories; finish collection pressure by the finale and offer direct selection afterwards. Let [compounding infrastructure](compounding-infrastructure.md) carry economic growth; add no prestige reset or offline reward printer.
7. **Make rewards visible where friends already gather:** trial 6 station display slots and 2 carriage mounts, with provenance on inspection; verify silhouettes at 5 m and 15 m. Fit the shared journey in [train-riding.md](train-riding.md) without making a whole room watch an opening.
8. **Share occasions, never wallets:** personal receipts and guarantees, about a 10 m local reveal, retrospective milestone claims for late visitors, and signed display-copy gifts initially. Defer unique-item trading; implement any later transfer atomically under [principle 6](../../DESIGN.md) and [the world contract](../../src/world/README.md).
9. **Offer choice before adding grind:** compare one capsule with one tray of 3 options; ensure an unowned option and a nominated favourite every fourth offer in B. Never require duplicates or trading to finish; preserve optional discoveries in [discovery-progression.md](discovery-progression.md).
10. **Keep the ceremony short and honest:** about 1.5–1.9 seconds, immediately skippable, no fake near-miss, expiry, streak or escalating audio pressure. Inspect it through the existing [look workflow](../../.claude/skills/look/SKILL.md); a common item must feel worth opening too.
11. **Commit the result before showing it:** per-player deed IDs and ordinals, versioned ordered tables, per-grant [mulberry32](../../src/sim/rng.ts), saved immutable receipts and `onApplied` presentation. Follow [groundwork](0.1/10-groundwork.md) and current [identity](../../src/player/identity.ts); do not promise cross-device ownership or authoritative mini-game scores that do not exist.
12. **Prototype the desire, not a currency economy:** one camp, one resident rig, three expressions and six accelerated claim opportunities; compare a random reveal with a 3-option tray. Use [hop](../../src/proto/minis/hop.ts) only after it passes the toy test, and register any future prototype through [protos/protos.ts](../../protos/protos.ts).

## Smallest prototype for the riskiest assumption

**[I] Assumption:** a little resident or decoration that produces no resources is enough reason to enjoy a side-play reward. This is more consequential than finding the optimal rarity percentage.

Build a future `?proto=rewards` scene around one existing camp and hop, with **one resident rig, three equally polished expressions, one shelf and six grant opportunities: three in each variant**. Give an appealing first resident directly. Let both a short core-work deed and a completed hop yield the same next opportunity; retain a way to preview all outcomes. For the test only, compress opportunities into a 15–20 minute session and label that pacing as accelerated. Do not implement som, helpers that produce stock, a trading market or a full twelve-item collection.

Use two variants with the same assets and earning effort: a random no-repeat expression versus a tray of the remaining expressions, initially three. Reset only the isolated prototype collection between variants and alternate their order across players. Keep reveal length and reward usefulness equal. First play solo; then let a friend stand nearby for a reveal and inspect the camp. The observable distinction is whether players place/name/show the result and voluntarily revisit the toy, rather than merely obeying a pending counter. A preference for direct choice would be useful evidence, not a failed gacha test.

Implement the minimal grant/receipt path in Lockstep if rewards persist or are shared; an isolated Local mock may test presentation but cannot claim to validate persistence or fairness. If built, verify replay/idempotence with pure tests, use the existing look harness for stills and motion, and inspect every PNG. No new UI unit tests or scenario unless the new sync contract requires one. Do not extend the prototype when players ignore the residents; first change the reward or leave the toy unrewarded.

**One gut question:** _Would you take another detour for this little camp resident if it never made materials?_
