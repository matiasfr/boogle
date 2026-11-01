# Research: shared moments and events

*Research report, 1 November 2026. How multiplayer worlds gather players for a scripted or emergent moment (warnings, bells, countdowns, beacons), what solo and late players get, whether the moment replays, and how it stays goofy. Precedents: Fortnite live events, Sea of Thieves world events, Destiny public events, Animal Crossing ceremonies, Final Fantasy XIV's Ishgardian Restoration, Journey, Minecraft's dragon, Valheim and Rust summons, Deep Rock Galactic's drop pod, Lethal Company, WoW's Ahn'Qiraj gong, Sky's AURORA concerts, Twitch Plays Pokémon and Reddit's The Button, plus two pieces of waiting psychology. It feeds opening day ([docs/proposals/vertical-slice.md](../proposals/vertical-slice.md), S3) and the open question on the 10 s bell ([docs/proposals/boogle-2.md](../proposals/boogle-2.md), "Open questions" 1). It builds on [communal-progression.md](communal-progression.md) (the honk chord, head-count gates) and [big-walk-and-communal-endings.md](big-walk-and-communal-endings.md) (Journey, ritual goodbyes) and doesn't repeat them. Sourcing caveat: few studios have published how they design these moments; most mechanics below come from wikis and press, and a same-day gap-fill pass added Roblox's live-event tooling, Destiny raid world-first races and Helldivers 2's major orders (sections 13–15). Recommendations only: no design decisions.*

> **Update, 1 November 2026 (gap-fill pass).** Added: Roblox's official EventSequencer docs, the closest thing found to a developer's own rules for a scheduled shared moment (late joiners get missed beats fired on arrival; attendees can't move the timeline); Destiny's world-first races, with Bungie's reason for Contest mode; Helldivers 2's human Game Master and community-decided outcomes. Recommendations 1, 4, 5 and 7 each gained a supporting line; none changed direction. Gaps updated: there is still no designer talk on gathering beats from Epic, Rare or Nintendo.

## Summary

1. Every precedent splits the moment into **a long, soft call to gather and a short, hard countdown**: Destiny 2 announces public events 5 minutes ahead and then shows a short timer at a rally flag; Fortnite opens its event lobby 30 minutes ahead, then counts down in the world.
2. The call goes into the **sky, not the HUD**: Sea of Thieves' skull and ship clouds, Rust's purple smoke, Destiny's glowing flag. Sound carries it to players who can't see it.
3. Gathering works better when **waiting at the spot is itself rewarded**. Destiny's flag refills your abilities and shows the time left; Maister's waiting research says occupied, known and shared waits feel shorter than empty, uncertain, solo ones.
4. **About 10 s is where attention runs out** (Nielsen). A bare 10 s countdown suits someone already standing there, but it can't gather anyone from across the island.
5. Deep Rock Galactic's drop pod gives a long window (5 minutes on most missions) but **leaves early once everyone living is aboard**. That pattern fits drop-in: the wait only lasts as long as someone is still on the way.
6. **Anyone-can-start with a named starter** has a famous precedent: WoW's Scarab Gong, rung by one player and announced server-wide by name, then a 10-hour war. The credit is what people remember.
7. **Late and absent players** get three things in the precedents: the same moment mid-way (Fortnite, Destiny), a re-run on a schedule (Sky's AURORA concert every 2 to 8 hours; Astronomical's several showings) and a permanent change in the world (FFXIV's rebuilt districts; Animal Crossing's next-morning building).
8. **Replay without re-progress** is common: Minecraft's dragon and Valheim's altars can be summoned again by anyone with the offering, and FFXIV added recurring Fêtes after its restoration ended.
9. **Goofiness comes from players keeping control during the show** (Astronomical's players swam and flew around the giant Travis Scott), hosts who fluff their lines (Tom Nook panics during his speech), and deadlines that leave people behind (Lethal Company, DRG).
10. Recommendation for opening day: **a gathering call of about 45 s (inside DESIGN.md's 30–60 s) that ends early once every online player is at the platform, then the existing 10 s bell**. Alone, that collapses to just the 10 s bell. The smallest prototype is a `?bell=` variant of `BELL_S` in [src/sim/era.ts](../../src/sim/era.ts).

---

## 1. Fortnite live events

- **Scale and lead time.** The End (Chapter 1, October 2019) launched rockets after an in-world countdown; a black hole then replaced the game for about 36 hours, and NPR counted more than 5.5 million watching on YouTube and Twitch on top of the millions in game ([NPR](https://www.npr.org/2019/10/15/770318763/fortnite-unveils-new-chapter-after-two-day-black-hole-shutdown); [CBS](https://www.cbsnews.com/boston/news/fortnite-black-hole-season-11/); [TheClick](https://www.theclick.gg/fortnite-the-end-event-explained/), fan-sourced). Epic's own wording for an earlier event was that the event playlist opens about 30 minutes early so players can get in before it starts; guides report that playlists fill and latecomers get queued or locked out ([Sportskeeda](https://sportskeeda.com/fortnite/upcoming-fortnite-live-event-will-likely-last-40-minutes); [Tech Times](https://www.techtimes.com/articles/317847/20260605/fortnite-live-event-starts-tonight-7-pm-et-log-620-miss-free-cosmetics.htm)).
- **The build-up is part of the show.** For Astronomical (April 2020), a stage was assembled in view on the map through the week before, so visiting the site before the show was already a moment ([Fast Company](https://www.fastcompany.com/90496629/travis-scotts-astronomical-fortnite-tour-exploded-the-idea-of-what-a-concert-can-be); [SYFY](https://www.syfy.com/syfy-wire/fortnite-travis-scott-astronomical-concert)).
- **Players keep control.** During Astronomical players moved, swam and floated around the performer the whole time; it wasn't a cutscene ([SYFY](https://www.syfy.com/syfy-wire/fortnite-travis-scott-astronomical-concert)). It ran as several showings over three days: about 12.3 million on opening night and 27.7 million unique players overall ([Wikipedia](https://en.wikipedia.org/wiki/Astronomical_(Fortnite_event))).
- **Cost.** Donald Mustard, Fortnite's long-time creative lead, called live events "the magic" and said they faded because the team was needed elsewhere ("It was resources") ([Aftermath](https://aftermath.site/fortnite-donald-mustard-interview/); [Forbes](https://www.forbes.com/sites/paultassi/2024/04/23/donald-mustard-devastated-fortnite-moved-away-from-live-events/)). A bespoke one-off show is expensive even for Epic.

**Takeaway.** A long lead time makes sense for millions of strangers across time zones. Boogle borrows the shape (gathering window, then countdown, then a show you can move around in) at a much smaller scale.

## 2. Sea of Thieves world events

- **The sky is the announcement.** A Skeleton Fort shows as a giant skull cloud with green eyes, and its own music plays nearby; a Fleet is a ship-shaped cloud; the higher-tier versions are red; the Ashen Lord is a red tornado on the horizon; the Kraken turns the water black ([Sea of Thieves wiki](https://seaofthieves.wiki.gg/wiki/Encounters)). Crews across the map see the same cloud and head to it ([Rare Thief](https://rarethief.com/what-is-the-red-skull-cloud-in-sea-of-thieves/)).
- **Long, soft timers.** A fort or fleet cloud stays for about 30 minutes if nobody starts it, then fades ([wiki](https://seaofthieves.wiki.gg/wiki/Encounters)). A 2022 patch stopped several world events from running at once, so there's one beacon to read.
- **Tools, not rules.** Rare's motto (designer Mike Chapman, via [GameSpot](https://www.gamespot.com/articles/sea-of-thieves-tools-not-rules-design-keeps-it-unique-four-years-later/1100-6506144/)): the world hands out tools and players make the stories. The cloud doesn't say what to do; it says where.

## 3. Destiny 2 public events

- **Five minutes ahead, then a rally point.** Destiny 2 announces each public event 5 minutes before it begins and puts it on the planet map. Arriving early, you find a glowing flag; rallying to it refills abilities, Super and ammo, and **shows the time until the event starts** ([Destinypedia](https://www.destinypedia.com/Public_Event)).
- **Optional "heroic" escalation** comes from doing extra things during the event, never from head count ([Destinypedia](https://www.destinypedia.com/Public_Event); [DestinyTracker](https://destinytracker.com/article/201/heroic-public-events-how-to-start-them)). Failure still pays something.

**Takeaway.** The rally flag turns an empty wait into a useful one and makes the countdown visible only where it matters.

## 4. Animal Crossing ceremonies

- **Ceremonies come the morning after.** In New Horizons a funded bridge or building is finished "by the next morning" ([Nookipedia: Bridge](https://nookipedia.com/wiki/Bridge)); Resident Services upgrades once the island has five residents, raising a flag and changing the board ([Nookipedia: Resident Services](https://nookipedia.com/wiki/Resident_Services)). The delay means anyone who logs in the next day sees the result, whether or not they saw the work.
- **The ceremony is a gathering of characters, not of players.** Villagers assemble, Tom Nook gives a speech, and the hosts stand beside him: at the Roost's opening, Blathers adds his own words after Nook ([GamesRadar](https://gamesradar.com/opening-brewsters-cafe-in-animal-crossing-new-horizons-made-my-island-feel-complete), as summarised in search; the page body didn't load). Small tasks get a short dance and cheer instead of a full ceremony ([Medium essay](https://stephentrinh.medium.com/why-i-love-holding-ceremonies-animal-crossing-new-horizons-c4a7bf25fbab)).
- **The host fluffs it.** A review notes Nook briefly panicking during his welcome speech ([Nintendo Wire](https://nintendowire.com/news/2020/04/20/dear-tom-nook-im-sorry-youre-not-a-villain/)). The ceremony's warmth comes partly from it going a little wrong.

**Takeaway.** Two scales of celebration (cheer for small things, a full ceremony for big ones), a host character, and a result that's waiting for absent friends.

## 5. Final Fantasy XIV: the Ishgardian Restoration

- **Per-world shared progress, shown as districts.** Each world's progress was tracked on its own (a Builders' Progress Report) and paid out by contribution. Across four phases from patch 5.1 to 5.41, whole districts appeared in the Firmament (a market quarter, a cultural quarter), and on completion in 5.5 it became a housing district ([Console Games Wiki: Ishgardian Restoration](https://ffxiv.consolegameswiki.com/wiki/Ishgardian_Restoration); [The Firmament](https://ffxiv.consolegameswiki.com/wiki/The_Firmament)).
- **After the build, a recurring party.** Fêtes were added in 5.5 to celebrate the finished restoration, and donations stayed open ([Console Games Wiki](https://ffxiv.consolegameswiki.com/wiki/The_Firmament)). Worlds created later have no monument ([Console Games Wiki](https://ffxiv.consolegameswiki.com/wiki/Ishgardian_Restoration)), so their players see only what was built.

## 6. WoW: the Gates of Ahn'Qiraj (a server-wide first)

- **Everyone gathers, one player rings.** Each server pooled huge turn-ins (for example 90,000 copper bars and 400,000 runecloth bandages shared by both factions), then the holder of the Scepter of the Shifting Sands rang the Scarab Gong. A server-wide message named that player as the Scarab Lord, and a scripted 10-hour war followed: bosses awakened, crystals spawned across seven zones, and in the last hour NPC generals rallied the armies at the wall ([Warcraft Wiki](https://warcraft.wiki.gg/wiki/Ahn%27Qiraj_War_Effort)).
- **Anyone else with a scepter could ring again** during the war for a mount, a small reward for being second.

**Takeaway.** Anyone-can-start works as theatre when the starter is named and the event is long enough for everyone else to arrive. The gathering is the scripted part, not the bell.

## 7. Sky: Children of the Light, the AURORA concerts

- **Repeat the show instead of making everyone come once.** The 2023 encore ran every 8 hours, then every 4; the 2025 Homecoming ran every 2 hours for two weeks. A guide in the home hub teleports you to the venue near showtime ([GoNintendo](https://www.gonintendo.com/contents/24589-sky-children-of-the-light-s-aurora-encore-concert-kicks-off-aug-23rd-2023); [Dualshockers](https://www.dualshockers.com/sky-children-light-aurora-encore-concerts-event-guide/); [MMORPG.com](https://www.mmorpg.com/news/sky-children-of-the-light-brings-back-aurora-concert-adds-new-feature-and-looks-ahead-to-the-6th-anniversary-2000135074)).
- **One showing is the special one.** For the 2023 record attempt, thatgamecompany asked everyone to come to a single showing, which drew over 10,000 players at once ([Dualshockers](https://www.dualshockers.com/sky-children-light-aurora-encore-concerts-event-guide/)).

## 8. Journey: meeting without words

Chris Bell's GDC 2012 talk ([Game Developer](https://gamedeveloper.com/audio/gdc-2012-how-i-journey-i-was-designed-to-facilitate-friendship); [GDC Vault](https://gdcvault.com/play/1015706/Designing-for-Friendship-Shaping-Player)) gives three rules relevant to gathering: talk through actions, not text, which brings in verbs designers can't control; a single musical call whose length and rhythm players turn into personality; and contact only when close, so finding each other happens through the call. He also warns that "a single rule can pollute an entire system". For Boogle, the honk is already Journey's call; the bell can be a bigger one.

## 9. Summons you can repeat: Minecraft, Valheim, Rust

- **Minecraft.** Anyone can respawn the Ender Dragon by placing four end crystals on the exit portal; the sequence takes about 30 seconds and can be cancelled by breaking a crystal. The boss bar, music and fog apply to players within 192 blocks, and kill credit goes to anyone who did damage in the last 5 seconds ([Minecraft Wiki](https://minecraft.wiki/w/Ender_Dragon)).
- **Valheim.** Each boss is summoned by placing an offering on its altar; the altar never burns out, so a group can summon again for a friend who missed it ([All Things How](https://allthings.how/valheim-how-to-summon-the-elder-boss/)). [communal-progression.md](communal-progression.md) covers Valheim's problem of friends falling behind.
- **Rust.** A supply signal throws purple smoke and calls a cargo plane to drop a crate there ([Facepunch wiki](https://wiki.facepunch.com/rust/item/supply.signal~diff:566782)). The smoke is seen by everyone, including rivals: a beacon announces to the whole server.

## 10. Deadlines that gather and joke: Deep Rock Galactic, Lethal Company

- **DRG's drop pod.** Once the quota is met, a player calls the pod; it lands 40 to 200+ m away and waits **5 minutes on most missions** (3 for some, 1 for salvage). It launches when the timer ends, aboard or not, but **launches early as soon as every living dwarf is inside** ([Deep Rock Galactic wiki](https://deeprockgalactic.wiki.gg/wiki/Drop_Pod)). The run to the pod is one of the game's best moments, and being left behind is a joke, not a disaster (you lose a bonus, not the mission).
- **Lethal Company.** The autopilot leaves at midnight whether or not everyone is back; if nobody living is aboard, the haul is lost ([Wikiwand](https://www.wikiwand.com/en/articles/Lethal_Company); [TV Tropes](https://www.tvtropes.org/pmwiki/pmwiki.php/VideoGame/LethalCompany), secondary). The comedy of the sprint back is the deadline.

## 11. "Everyone together" crowds: Twitch Plays Pokémon and The Button

- **Twitch Plays Pokémon** (2014): about 1.16 million people played Pokémon Red through chat commands, up to 121,000 at once. The chaos produced in-jokes (the Helix Fossil "religion", "Bird Jesus"). A Democracy mode added to get past one stalled puzzle was resented for removing the randomness that made the story ([Wikipedia](https://en.wikipedia.org/wiki/Twitch_Plays_Pok%C3%A9mon)).
- **The Button** (Reddit, 2015): a 60-second timer anyone could reset once by pressing, with a flair colour recording how low the timer was when they pressed. It ran two months and four days on about a million presses, and factions formed around the colours ([Wikipedia](https://en.wikipedia.org/wiki/The_Button_(Reddit))).

**Takeaway.** Shared stories come from a crowd's messy inputs, not clean coordination. A countdown that players can push around becomes the game itself: good for a toy, bad for a ceremony that has to happen.

## 12. Waiting psychology

- **Nielsen's limits.** 0.1 s feels instant, 1 s keeps the flow, **10 s is about the limit of keeping attention**. Beyond that, show progress so people can do something else meanwhile ([Nielsen Norman Group](https://www.nngroup.com/articles/response-times-3-important-limits/)).
- **Maister's waiting lines** (1985): occupied time feels shorter than unoccupied time, uncertain waits feel longer than known ones, and waiting alone feels longer than waiting in a group ([David Maister](https://davidmaister.com/blog/201/The-Psychology-of-Waiting-Lines.html)).

## 13. Roblox: tooling for scheduled shared moments

Roblox is the one platform found that publishes how it expects creators to build a timed shared moment.
- **EventSequencer** ([Roblox docs](https://create.roblox.com/docs/resources/modules/event-sequencer), fetched) builds "live, cross-server events and cutscenes" as scenes with a fixed `TimeLength`, each split into client and server schemas; audio, animation and tweens are timed from the scene's start and can follow the audio.
- **Late joiners catch up.** A `schedule` entry's `Skippable` flag defaults to false, meaning "all event start times scheduled before the join/seek time will occur at that join/seek time": someone who arrives mid-show still gets every beat that changes the scene, fired at once. Tweens are kept in sync "in seeking and in dynamic join".
- **Nobody in the audience moves the clock.** Seeking is limited by permission, because users "simply enjoying the event should not have the ability to control its time flow". A pre-show venue is a scene of its own, and there's a scene-ending warning, 3 s by default.
- **Announcing it.** Experience events get a page with "Notify Me"; subscribers get an inbox notification (and a push, if opted in) when it starts, and the page's button turns into "Join Event" ([Roblox docs](https://create.roblox.com/docs/production/promotion/experience-events), fetched). Platform featuring wants events submitted at least 7 days ahead.
- **Scale.** Concerts inside popular player-made games now draw millions at once; Roblox confirmed 12.8 million concurrent for a Bruno Mars show in Steal a Brainrot (secondary: [games.gg](https://games.gg/news/roblox-concert-hits-12-million-concurrent-users/)). How these are split across servers isn't public.

**Takeaway.** The shared moment is a timeline every server and late joiner can enter at the right point: state-changing beats replay on join, cosmetic tweens resume mid-way, and the audience can't scrub it. That's Boogle's `runAt` script, plus an explicit rule for what a late joiner gets.

## 14. Destiny: raid world-first races

- **Contest mode.** New raids launch in Contest mode for the first 48 hours: power is capped and enemies are harder; the first fireteam to finish wins World First raid belts, and Bungie broadcasts the race with Twitch Rivals, with emblem drops for viewers ([Bungie press release, Salvation's Edge, 2024](https://press.bungie.com/Tune-in-to-the-World-First-Race-for-the-New-Destiny-2-The-Final-Shape-), fetched).
- **Why.** Bungie said it had assumed a few players would race and most would ignore the raid; for Season of Opulence (2019) it put the raid out on day one "to make the Raid Race more fair and competitive" and wanted a race that was "watchable and fair" (secondary: [DestinyTracker](https://destinytracker.com/article/627/bungie-reveals-new-mode-for-world-first-raid) quoting This Week at Bungie; the page refused the fetch).
- **The cost.** A hard first window shuts most players out of the first days: Crota's End's Contest mode was cleared by about 20,000 accounts, against 288,000 completions of the previous raid (secondary: [Sportskeeda](https://sportskeeda.com/mmo/news-very-good-step-right-direction-destiny-2-community-praises-bungie-crota-s-end-contest-mode)).

**Takeaway.** A race to be first is a spectator sport for strangers, built with power caps, a fixed start and a broadcast. It works because almost nobody is expected to win. Among friends on one island it would turn the opening into a contest the others lose.

## 15. Helldivers 2: major orders and a human Game Master

- **A person runs the war.** Arrowhead's Game Master, Joel, picks which major and daily orders are active and where enemies attack; he can "reinforce planets" and hand temporary equipment to everyone, but "the war fought and liberation of planets — that's all you" ([Windows Central](https://www.windowscentral.com/gaming/helldivers-2-director-explains-the-limits-of-joel-the-game-masters-power), fetched, quoting Joel on X).
- **Why a person.** Community manager Katherine Baskin: the game needs "something more than just a calendar with automated events tied to major holidays"; most live games run "a series of automated events" on a schedule, "instead of ... a person who can analyze the campaign as it's happening and make more sensitive choices" ([PC Gamer](https://www.pcgamer.com/games/third-person-shooter/helldivers-2-uses-its-game-master-to-stop-its-live-service-side-from-being-just-a-calendar-with-automated-events-tied-to-major-holidays/), fetched).
- **Outcomes become canon.** At the first anniversary Joel said Arrowhead had been "positively surprised" by the decisions players made; he named the defence of Mort, held by PlayStation players while Steam was down for maintenance, as one of the closest battles ([TheGamer](https://www.thegamer.com/helldivers-2-first-anniversary-joel-the-game-master-revealed-interview-arrowhead/), fetched; the Mort details are the writer's account).

**Takeaway.** A shared goal everybody works toward at their own time, with the result written into the world, makes moments without a fixed start. The bits players remember are the near-misses, and they're remembered as "we did that".

---

## What this means for Boogle

Opening day today: once the last section is laid, anyone in reach can Interact to start; the run is a lockstep `runAt` script, so late joiners see the same moment; the bell is one knob, `BELL_S = 10`, and the owner hasn't decided whether to keep it ([src/sim/era.ts](../../src/sim/era.ts); [vertical-slice.md](../proposals/vertical-slice.md), S3). DESIGN.md asks for 30–60 s of visible warning (7) and no head counts (4, 8), and the owner works solo first.

1. **Countdown length: a ~45 s gathering call, ended early when everyone is there, then the 10 s bell.** Reasons:
   - 10 s alone is right for people already at the platform (Nielsen's attention limit), but nobody can cross the island in it, so it can't gather anyone and it breaks principle 7's 30–60 s.
   - A fixed 45–60 s is too long for a solo player standing at the bell (Maister: an empty solo wait feels longest). The DRG rule fixes that: **the call ends as soon as every online player is within the gathering ring**, so alone it's 0 s plus the bell, and a friend still walking over gets up to 45 s.
   - 45 s sits inside DESIGN.md's 30–60 s and is far shorter than Destiny's 5 minutes or Fortnite's 30, which serve strangers across a map or the world. The real number should come from measuring the longest walk from anywhere playable to the platform; the gathering window should be about that walk plus a few seconds.
   - Keep the gathering call and the bell as two phases of the same `runAt` script, so a late joiner lands in the right phase. Roblox's EventSequencer (section 13) adds the rule for what that joiner gets: every beat that changes the world fires on arrival (the era flips, the ribbon is cut), while cosmetic animation resumes mid-way instead of replaying.
   - *Smallest prototype:* a `?bell=` flag (values like `0`, `10`, `30+10`, `45+10`) that turns `OPENING_DAY` into a two-phase script, with the "everyone in the ring" early end computed on the server from presence and submitted as one stamped op. Playtest solo first (does the bell feel like a beat or a wait?), then with one friend starting from the far side of the island.

2. **Announce in the sky and in sound, not only in text.** A column of smoke, a rising balloon or bunting over the platform that you can see from anywhere (Sea of Thieves' clouds, Rust's smoke), and a bell whose sound carries with distance. A HUD line can name it, but the sky is the source.
   *Smallest prototype:* a Local tall coloured smoke column plus a distance-faded bell sound while the gathering phase runs; ask a player starting out of sight whether they knew where to go without reading.

3. **Make waiting at the spot worth it (a rally ring).** Like Destiny's flag: standing in the ring shows the time left (a bell rope that shortens, a candle that burns down: Maister's "known wait") and hands you a toy, such as a party popper or a flag to wave, so the wait is play. Players already there make the wait shorter for each other (Maister: group waits).
   *Smallest prototype:* a ring decal around the platform; inside it the party-popper action replaces Interact and fires confetti through `emit()`. Ask whether early arrivals messed around or stood still.

4. **Name the starter, but no rush to be first.** WoW's Scarab Lord shows how memorable "X rang the bell" is. Put the starter's name on the bell or plaque and in The Boogler's speech, plus the names of everyone inside the ring when it rings ("who was there"). Avoid anything rival-like: there's only one opening day per era, and the first valid op wins quietly. Destiny's world-first race (section 14) shows what a race needs (a fixed start, caps, an audience of strangers) and that it shuts most players out; none of that fits friends on one island.
   *Smallest prototype:* the plaque text is the starter's name plus present players, read from presence when the bell phase starts.

5. **Don't let the countdown be pushed around.** The Button and Twitch Plays Pokémon show that a crowd-controllable timer becomes the game. Once started, the call and bell run to the end; nobody can reset or cancel them. Extra rings during the call can add fanfare (a louder chord, more confetti: the honk-chord rule that spectacle scales with heads but nothing else does), never time.
   Roblox builds the same rule into its event tooling: attendees can't move the timeline (section 13).
   *Smallest prototype:* reuse the honk chord detector; honks inside the ring during the call add sparkles only.

6. **Keep players in control during the ceremony, and let it go a bit wrong.** Astronomical never took control away; Tom Nook panics during his speech; DRG and Lethal Company are funny because someone is running late. The ceremony should be a show players stand inside and mess with (knock the top hat, tangle in the ribbon, Local physics props as S3 says), with The Boogler fluffing a line or the ribbon not snapping on the first cut. No cinematic camera that locks input.
   *Smallest prototype:* a greybox ceremony with one deliberate flub (the ribbon takes two snips) and the player free to move; does the solo tester laugh or skip?

7. **Something for late and absent players: aftermath, a postcard, an encore.**
   - **Aftermath:** confetti, bunting and the cut ribbon stay on the ground until the next session ends (Animal Crossing's next-morning result; Fortnite's black-hole aftermath). The era change itself is permanent (FFXIV's districts).
   - **A postcard:** the next time an absent friend logs in, The Boogler or the plaque says who opened it and when. Helldivers 2 (section 15) suggests the near-miss is the part worth retelling: if the gathering had a close call (someone arrived as the bell rang), say so.
   - **An encore:** the comedy part of the ceremony can be replayed, Local only, from the plaque or bell, any time, without touching the era (Minecraft's crystals, Valheim's altars, Sky's repeated concerts, FFXIV's Fêtes). The era flip happens once; the party can happen again.
   *Smallest prototype:* a Local "encore" Interact on the plaque that replays the ceremony's prop script for whoever is near, with no op.

8. **Two sizes of celebration.** Animal Crossing cheers for small things and holds full ceremonies for big ones. Laying an ordinary section could get a cheer (a short jingle, The Boogler waving); the era's last section gets the opening day. That keeps the big moment rare enough to matter.
   *Smallest prototype:* a 2 s cheer on each laid section in the haul prototype; does opening day still feel bigger?

9. **Never gate on how many people came.** The ceremony runs with one player; with more it gets louder and more chaotic, not harder (DESIGN.md 4 and 8; Destiny's heroic upgrades come from actions, not attendance). Already the S3 rule; restated because the gathering call makes it tempting to wait for "enough".

## Gaps

- No developer talk or postmortem was found on how Fortnite, Sea of Thieves or Animal Crossing designed their gathering beats; those findings are mechanics from wikis and press, not stated intent.
- Roblox, Destiny world firsts and Helldivers 2 were added in the gap-fill pass (sections 13–15). Roblox's docs are the only first-party design guidance found, and they're tooling docs, not a talk on intent. Bungie's Contest-mode rationale is quoted second-hand. Helldivers 2's extraction timer is left out: wiki and player reports disagree on when the shuttle leaves (a short countdown once someone boards, or once the mission timer ends), and early departures were reported as a bug ([Helldivers wiki](https://helldivers.wiki.gg/wiki/Extraction_Shuttle), search summary).
- No source measured the best countdown length for a small group; the 45 s recommendation comes from DESIGN.md's 30–60 s, the waiting research and the DRG early-launch pattern, and should be checked against the island's real walk times.
