# Playtest telemetry: heat maps, death maps and a few counters

*Research report, 1 November 2026. How studios record and show what playtesters do: Breath of the Wild's route heat maps, Microsoft's Halo 3 user research and Bungie's public heat maps, Valve's playtest methods, BioWare's development telemetry, Mega Crit's Slay the Spire metrics, an indie death heat map (Private Joe), Poki's web playtests, Super Meat Boy's replay of every attempt, Mario Maker's death marks, Drachen's spatial analytics, time-to-fun, privacy-first web analytics (Plausible, the UK's analytics exemption) and session replay for canvas games. For the owner's solo iPad playtests in [find-the-fun.md](../plans/find-the-fun.md), the counters in [src/proto/count.ts](../../src/proto/count.ts) and recommendation 18 in [level-design.md](level-design.md) ("check with heat maps"). Builds on [finding-the-fun.md](finding-the-fun.md) (rec 10, "record behaviour, not only verdicts") without repeating it. Recommendations only; no design decisions.*

**Markers.** **[V]**: the page or slides were fetched and the claim matches. **[S]**: seen only in a search summary, a recap, a forum or a wiki, or the page refused the fetch; check before quoting.

## Summary

1. Every studio that uses telemetry well records **a handful of signals tied to a question**, not everything: Slay the Spire started with three graphs (now ninety), Valve's list is deaths, level times and friendly fire, Private Joe logged level starts and death positions.
2. The **heat map is the workhorse**: positions or events binned into grid cells, coloured by count. Its most common use is deaths; BotW used routes, and that is how it saw players herded onto a few paths.
3. Heat maps answer **where**, not **why** or **when**: Valve lists "averages hide extreme examples" and "illusory patterns"; Drachen says trajectories show unused areas better and time adds the flow a static map hides.
4. **Telemetry sits beside watching, never instead of it.** Valve: "nothing beats direct gameplay observation"; Mega Crit: the numbers don't say how things feel; Halo 3's researchers paired death data with video of players' faces.
5. **Death and failure maps** find the spot where a design punishes (Halo 3's Jungle, Private Joe's second tank); a fix shows up as the cluster moving to where it was meant to be.
6. **Where people quit** is the cheapest strong signal: Poki reads under a minute as an onboarding problem; Private Joe's drop after level 1 was a menu, fixed with a tutorial; OnRush's players left because the cursor escaped the canvas (2 to 10 minutes once locked).
7. **Time-to-fun** (top mobile games aim under 60 s) is the onboarding number; for a prototype it becomes "seconds from load to first use of the verb".
8. **The best tools put the data back in the game**: BioWare's heat-map points teleported a developer to the spot; Super Meat Boy replays every attempt at once; Mario Maker draws an X where others died.
9. **Privacy for a small game is easy if nothing personal leaves the browser**: no ids that last past a day, no raw IP or user agent (Plausible's model), rounded positions, and data used only to improve the game (the UK's new analytics exemption).
10. **Session replay for a WebGPU canvas** isn't a DOM recorder's job (rrweb shows a blank canvas); a game records its own state, and a 1 Hz position track is already a replay good enough for a top-down map.

## Findings by source

### Breath of the Wild: route heat maps (CEDEC 2017)

**Routes, not deaths [S].** Fujibayashi and Yonezu showed heat maps of where testers walked. With towers spread through the map and events placed between them, player flow was "concentrated on a few discrete paths": testers felt guided and, when they left the path, lost in a bad way. The team moved to "gravity" (landmarks of different pull visible at once, terrain that makes you orbit them), and the next heat map was more evenly spread. Testers also disliked the towers as obvious cues, and the heat maps showed where people got stuck or bored, which guided where towers went. ([Radiator Blog](https://www.blog.radiator.debacle.us/2017/10/open-world-level-design-spatial.html), a fetched secondary summary; [Nintendo Life](https://www.nintendolife.com/news/2017/10/zelda_breath_of_the_wilds_ingenious_design_is_all_about_triangles_apparently); the translated talk notes are in [level-design.md](level-design.md))
- **Lesson:** a route heat map is the one tool that showed a layout problem the designers couldn't see by playing their own game. It took testers who didn't know where things were.

### Halo 3: Microsoft's user research lab and Bungie's public heat maps

**The lab [V].** Wired's 2007 feature (fetched as the ABC News reprint): Randy Pagulayan's team analysed more than 3,000 hours of Halo 3 played by about 600 ordinary players, recording favoured weapons and where players died "down to the square foot", alongside video of players' faces and every button press; designers watched through a one-way mirror and went through fights second by second. Examples: grenades lost in a cluttered area, a Brute that killed new players in three shots. ([ABC News reprint of Wired](https://abcnews.com/Technology/story?id=3506473&page=1))
**The Jungle fix [S].** Excerpts of the same article describe a level where players kept wandering backwards; designers reshaped the ground so a ledge drop stopped the backtracking, and the next death map showed markers clustered where they were meant to be. A usability blogger adds that each area was tested with video and heat maps to find choke points and where players got lost or died. ([collision detection](http://www.collisiondetection.net/mt/archives/2007/08/the_making_of_h.php); [Steve Bromley](https://www.stevebromley.com/blog/2010/08/16/selling-ux-in-games-everyone-else-is-doing-it/))
**Public heat maps [V].** In November 2007 Bungie put kill and death heat maps on Bungie.net, per map and per weapon, personal and global, with darker red for more deaths; a sample caption reads a yellow room as a "dead room". It launched as a beta Bungie might pull if it loaded its servers. ([Bungie Weekly Update, 9 Nov 2007](https://halo.bungie.org/bwu/index.html?item=153))
- **Lesson:** death positions plus watching are enough to find and confirm a level fix; the same picture is fun to show players.

### Valve: playtest methods (GDC 2009) and biofeedback

**The slides [V].** Ambinder's "Valve's Approach to Playtesting: The Application of Empiricism" splits methods into traditional (direct observation, think-aloud, Q&A) and technical (stat collection, design experiments, surveys, physiology). Stat collection is "a record of gameplay behaviors", with "deaths, level times, friendly fire" as the examples and a heat map of death concentrations on TF2's Dustbowl as the picture. Its strengths: objective, global trends, comparisons and baselines, change over time. Its weaknesses: "averages hide extreme examples", it misses nuance and context, it needs rigour, and it "can see 'illusory' patterns". Design experiments compare two or more conditions against a hypothesis. The verdict on traditional methods: "nothing beats direct gameplay observation", and what people do matters more than what they say. ([slides, PDF](https://cdn.fastly.steamstatic.com/apps/valve/2009/GDC2009_ValvesApproachToPlaytesting.pdf))
**Biofeedback [S].** At GDC 2011 Ambinder showed skin-conductance maps of Left 4 Dead sessions used to tune the AI Director's pacing; expensive and intrusive by his own slides, and irrelevant for a solo owner. ([Game Developer](https://www.gamedeveloper.com/design/video-how-valve-uses-biofeedback-to-make-better-games); [Valve publications](https://www.valvesoftware.com/en/publications))
- **Lesson:** a few behaviour stats, a death map, and comparisons between conditions; distrust patterns in small samples.

### BioWare: development telemetry (GDC 2010)

**Telemetry for developers [S].** Georg Zoeller's talk on the Dragon Age and Mass Effect tools, from one attendee's notes: the game logged movement, deaths, combat start and end, plot state changes, conversation starts, warnings and asserts, all aggregated onto maps of each area (heat maps, movement, entry and exit points). Clicking a point on the map **teleported the developer to that spot in game, facing the way the player came**. The bug form had three fields (category, description, priority); location, machine and build were filled in automatically, with a one-click screenshot. Internal achievements for developers roughly doubled non-QA playtime in a month. ([attendee notes](https://alexx-kay.livejournal.com/285457.html); [GDC Vault](https://gdcvault.com/play/1012434/Development-Telemetry-in-Video-Games.))
- **Lesson:** telemetry is most used when it lives where the developer already is, and when the context (place, build) is captured for free.

### Mega Crit: Slay the Spire's metrics

**Start small, keep a question [V].** Mega Crit built a metrics server early in prototyping that logged every player decision; pick rates and win rates per card flagged cards nobody took and cards in too many winning decks. "The first time we made our metrics, we had three graphs; now we have at least 90." Giovannetti: the numbers "are not telling us how things feel"; changes stayed trial and error, and Yano stresses going to the data with a specific question. ([Game Developer](https://www.gamedeveloper.com/design/how-i-slay-the-spire-i-s-devs-use-data-to-balance-their-roguelike-deck-builder); [GDC Vault](https://www.gdcvault.com/play/1025731/-Slay-the-Spire-Metrics))
- **Lesson:** three graphs is a real starting point; the rest grows when questions need it.

### Private Joe: an indie death heat map

**Five metrics that changed the game [V].** A solo developer on a 30-level Flash platform shooter used Playtomic (a free analytics service) to log level starts, deaths with x,y position, weapon purchases, menu clicks and continue-screen choices, with heat maps drawn on uploaded PNGs of each level. Drop-off was steep after level 1 (a confusing missions menu; a tutorial went in) and at level 6, where the death map pointed at the second tank: players reached it weakened by the first. The rifle and pistol were most used, though they had the least work in them. ([Game Developer, "Indie Game Analytics 101"](https://www.gamedeveloper.com/business/indie-game-analytics-101))
- **Lesson:** a death heat map over a flat picture of the level is enough tooling for a small game.

### Poki: web playtests and the first minute

**What a recording holds [V].** Poki's playtest gives a developer ten recordings of real players, with their button inputs, the console output, play time, country and device. What to read: time in game ("several minutes" is a good early sign), where players quit (under a minute points at onboarding), repeated losses at one spot (too hard; quitting there may be boredom), and console errors. ([Poki developer guide](https://developers.poki.com/guide/playtesting))
**A fix found by watching [V].** OnRush Studio saw players leave abruptly in the same way across recordings: the cursor slipped off the canvas mid-aim and clicked other games. Locking the mouse while shooting took average engagement from about 2 to about 10 minutes. Their advice: change one thing per iteration so you know what moved the number. ([Poki blog](https://poki.com/blog/higher-success-rates-with-playtests))
- **Lesson:** for a web game, the quit moment and the first minute carry the most signal per byte, and input plus console beside a recording explain it.

### Time-to-fun

**The onboarding number [V].** Jon Lai's essay: time-to-fun is how long a product takes to deliver its value; top mobile games aim for under 60 seconds; Call of Duty Mobile puts you in a fight after typing a name and teaches one button at a time. ([Jon Lai](https://www.jonlai.co/time-to-fun)) Product analytics calls the same thing time-to-first-action [S] ([Contrast](https://www.contrast.studio/design-terms-explained/time-to-first-action)).
- **Lesson:** each prototype has one verb; the time from page load to its first use is that prototype's time-to-fun, and the find-the-fun rule "into the verb in seconds" can be checked with it.

### Putting failure back in the game: Super Meat Boy and Mario Maker

**Every attempt at once [V].** Finishing a Super Meat Boy level plays back all your attempts together, the failed ones dying off until one Meat Boy remains; the postmortem says it turns death into a reminder of getting better. It was inspired by a "Quantum Mario" video of every attempt at a hacked Mario level replayed in one stream [S]. ([postmortem](https://www.gamedeveloper.com/audio/postmortem-team-meat-s-i-super-meat-boy-i-); [Shacknews](https://www.shacknews.com/article/67002/super-meat-boy-devs-discuss))
**Death marks [S].** Super Mario Maker shows red X marks where other players died on a course; Nintendo's server keeps the positions (a fan dataset holds 564 million deaths with x,y). ([TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Headscratchers/SuperMarioMaker); [dataset](https://huggingface.co/datasets/TheGreatRambler/mm2_level_deaths))
- **Lesson:** an overlay of past attempts is both an analysis tool and a funny, readable thing to look at.

### Drachen: spatial game analytics

**How heat maps are made and where they mislead [V].** Drachen's CIG 2013 paper: the usual heat map divides the area into a grid of cells and counts events per cell, with a colour ramp (a Just Cause 2 example scales the ramp so the busiest cell is white); kernel density smooths between cells. In games they are mostly maps of deaths. Heat maps read without training and show bottlenecks, but cells must be small enough for level detail; stacked floors blur together in 2D; trajectories show unused areas more precisely; adding time shows flow. Overlays combine layers: a Transformers map subtracts kills from deaths to show where players are safe or exposed. ([paper, PDF](https://andersdrachen.com/wp-content/uploads/2014/07/spatialgameanalytics_cig2013.pdf); [book chapter](https://link.springer.com/chapter/10.1007/978-1-4471-4769-5_17))
- **Lesson:** count per cell of a fixed grid, keep the path itself too, and keep a time axis.

### Others

- **The Level Design Book [V]:** play time, deaths and win rates need nothing but note-taking; set up what you'll measure before the test (time to reach a boss); telemetry shines on multiplayer maps where patterns appear across many players; beware "evil data" that distracts. ([Playtesting](https://book.leveldesignbook.com/process/blockout/playtesting))
- **Riot R&D [V]:** frequent playtests from the prototype on, inside and outside the team; a failed playtest is diagnosed, then retried with better execution or abandoned. ([Riot](https://www.riotgames.com/en/r-and-d-office/prototype-building-a-games-substance))
- **Supercell [S]:** retention targets are set before a beta and games that miss them die; it's a live-game gate with thousands of players and no use to one tester. ([Sequoia podcast](https://sequoiacap.com/podcast/supercell-ft-ilkka-paananen-how-an-early-pivot-led-to-clash-of-clans-and-brawl-stars))

### Privacy-respecting web analytics

**Plausible's model [V].** No cookies, local storage or cache; a visitor id is a hash of IP, user agent and site with a salt replaced every 24 hours, so a visitor can't be linked across days or sites; raw IP and user agent are never stored; location only to city; browser versions only major and minor. ([data policy](https://plausible.io/data-policy)) Umami and GoatCounter are self-hostable alternatives with weaker or no custom events by most comparisons [S] ([comparison](https://analytics-alternatives.com/compare/plausible-vs-umami/)).
**The UK's analytics exemption [S].** The Data (Use and Access) Act 2025 lets a site store and read data on a device without consent when the sole purpose is to learn how the service is used and improve it ("how", not "who"), with clear information and a free, simple way to object; tracking individuals, advertising or any second use needs consent, and UK GDPR still applies to any personal data. The ICO page refused the fetch; this is from law-firm summaries. ([ICO](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/); [Brodies](https://brodies.com/insights/ip-technology-and-data/storage-and-access-technologies-ico-publishes-updated-guidance-on-the-use-of-cookies-and-other-tracking-technologies/))
- **Lesson:** counts and coarse positions with no lasting id are about as harmless as telemetry gets; tell friends in one line and give them an off switch.

### Session replay for canvas games

**DOM recorders don't see the game [S].** rrweb, the usual web session-replay library, records DOM changes; a canvas shows blank unless an optional canvas mode snapshots frames (with a performance cost, such as `preserveDrawingBuffer` on WebGL), and it never replays the JavaScript that drew it. ([Cloudflare docs](https://developers.cloudflare.com/browser-run/features/session-recording/); [rrweb commit](https://github.com/rrweb-io/rrweb/commit/a3de582e9c32be9e0ccd84bb7df756af6b0594f7); [HN thread](https://news.ycombinator.com/item?id=41030862))
**Game replays [S].** Games either re-simulate recorded inputs (tiny, but only with a deterministic engine and seeded randomness; Retro City Rampage kept an always-on input log to jump to a bug's frame) or record object states (bigger, works with any physics). Overwatch rebuilt its client so a kill cam could interrupt play. ([Game Developer, "Creating a replay system"](https://www.gamedeveloper.com/programming/what-just-happened-creating-a-replay-system); [Overwatch GDC 2017](https://gdcvault.com/play/1024053/Replay-Technology-in-Overwatch-Kill))
- **Lesson:** Boogle's player physics is Rapier on the owner's tab, not lockstep, so a replay of a sitting is a state track (positions over time), not an input log.

## What Boogle has today

- **Counters, local only.** `protoCount(name)` ([src/proto/count.ts](../../src/proto/count.ts)) adds to this browser's protos store ([protos/store.ts](../../protos/store.ts), localStorage key `boogle-protos-v1`), which the game and boogle.club/protos/ share because they're the same origin. Counted now: seconds in the prototype, variant switches, soapbox runs, minis arrivals and their times. They go into the copied playtest entry.
- **Problem reports to the server.** [src/features/telemetry.ts](../../src/features/telemetry.ts) sends errors, desyncs, snapshot failures and join outcomes to `POST /report`; the server appends JSON lines per UTC day, keeps 30 days and drops IP and headers ([server/README.md](../../server/README.md)). Nothing about play.
- **A map to draw on.** `npm run island-map` ([dev/island/map.mjs](../../dev/island/map.mjs)) writes a top-down PNG of the island in a second; [dev/layout/export.ts](../../dev/layout/export.ts) writes a 2 m heightmap as JSON for the layout lab.
- **Events worth placing.** Tumbles, bonks and stomps ([player.md](../game-design/player.md)); soapbox crashes and wipeouts, and its best-run ghost ([soapbox.md](../game-design/soapbox.md)).

## What this means for Boogle

Numbered so a plan can cite them. Each ends with the smallest prototype that would test it. *Derived* throughout: none of the sources is about one expert playtesting alone on an iPad.

1. **Record five signals, no more, until a question needs a sixth.** Mega Crit's three graphs and Valve's three examples say start tiny. For each sitting on a `?proto=` page: (a) a position track, (b) idle stretches, (c) failure events with a place, (d) seconds to the first use of the verb, (e) where and when the sitting ended. Everything else stays a `protoCount` counter. *Smallest prototype:* a `src/proto/trace.ts` beside `count.ts` with `protoMark(kind)` and a sampler; nothing drawn yet, just a line in the console at the end of a sitting ("412 samples, 3 idle, 2 wipeouts, verb at 6 s").

2. **Sample position at 1 Hz, rounded to a metre, with what you were doing.** BotW's problem was visible in routes, and Drachen notes paths show unused ground better than counts. Store `[t, x, z, mode]` with `mode` one letter (walking, riding, in a vehicle, swimming, idle). Ten minutes is 600 samples, a few KB. Keep it in localStorage under the card, like the counters, and keep only the last few sittings per card. *Smallest prototype:* the sampler from 1, writing `traces[cardId]` (last five sittings), and `JSON.stringify` size printed to check it stays small.

3. **Mark idle as its own thing.** Poki and BotW both read stuck or bored places from where players stop. Idle is "no input for 5 s while the tab is visible and nothing is carrying you"; record it as a span with a place, so the map can show where the owner stood around. Don't count riding the wagon as idle: that's the point of the ride. *Smallest prototype:* an idle detector on the existing input events that logs `idle 12 s at (31, -8)` to the console during the wagon prototype.

4. **Map failures and comic failures separately.** Death maps are the most common heat map (Drachen, Halo 3, Private Joe), but Boogle has no deaths; its failures are wipeouts, tumbles, bonks, spills and the soapbox's crashes, and some of those are the fun (comedy-in-games). Mark each with `protoMark('wipeout')` at the player's position; a cluster on the soapbox path is either a bad corner or the best jump, and only the owner's note says which. *Smallest prototype:* marks for soapbox crashes and tumbles, drawn as dots on the map from 6.

5. **Time-to-verb as the prototype's time-to-fun.** find-the-fun.md already demands "into the verb in seconds"; measure it. Each card names its verb event (first ride, first log picked, first roll of the cart) and the trace records seconds from load to it. Over 10 s on a prototype is a bug in the spawn, not a finding about fun. *Smallest prototype:* `protoMark('verb')` in two prototypes (wagon boarding, soapbox start) and the number on the bar's readout line ("verb in 4 s").

6. **Draw the heat map on the protos page, under the card.** A grid of 2 m cells (the layout lab's cell size) counted from the stored samples, coloured from transparent to hot, over the top-down island PNG, the busiest cell at full colour (Drachen's ramp). Layers as toggles: where you were, where you idled, failure dots, the path of the last sitting as a line. iPad-sized, one canvas, no library. *Smallest prototype:* the island PNG from `npm run island-map` copied into `protos/`, and one canvas per card that draws the last sitting's path and idle dots over it.

7. **Put the map back in the world.** BioWare's teleport-on-click and Mario Maker's X marks say the data is most useful where you play. A `?trace=1` flag on a prototype draws the last sitting's path as a faint line on the ground and failure marks as small flags; tapping a mark on the protos page opens the prototype spawned at that spot. *Smallest prototype:* the path as a line on the terrain behind `?trace=1` on one prototype, local only, nothing synced.

8. **Compare variants on the same map.** Valve's design experiments and finding-the-fun rec 5 compare conditions. Tag each sample with the variant playing; the protos page draws two variants side by side, or subtracts one heat map from the other (Drachen's overlay). For the laying-run variants (crawl, quick, push), it shows where the owner waited in each. *Smallest prototype:* the variant id stored with each sample and a variant filter on the card's map.

9. **Mark the quit.** Poki's strongest signal and Private Joe's best finding were where people left. On `pagehide` or a hidden tab, record the last position, the seconds in and the last mark, and draw it as a distinct dot. For the owner this reads as "where I stopped caring"; it belongs beside the verdict. *Smallest prototype:* the end-of-sitting record from 1 shown in the copied playtest entry ("ended at the lighthouse after 4 min, idle 40 s before").

10. **Keep it out of the copied entry except as one line.** The entry is for gut answers; Valve warns averages hide extremes and small samples make patterns that aren't there. One summary line per sitting ("verb in 5 s, 3 idle spots, 2 wipeouts on the bend, ended at the station") and the map on the page; no tables of numbers. *Smallest prototype:* extend `countsLine` with that one line from the latest trace.

11. **A replay is the track, played back.** rrweb can't see the canvas and Boogle's physics isn't an input-replay engine, but a 1 Hz track interpolated is a ghost walking the last sitting on the top-down map, or in the world like the soapbox's ghost. Super Meat Boy's "every attempt at once" is the fun version: the last five soapbox runs as ghosts together. *Smallest prototype:* a play button on the card's map that moves a dot along the last sitting at 10× speed.

12. **Friends later, by the same pipe, with a line and a switch.** When friends playtest, the same trace can go to the server as a report kind, without a lasting id: a random id per sitting, positions rounded to a metre, no names or peer ids, a day's cap (telemetry.ts already does dedupe, caps and `sendBeacon`; the server already drops IP and keeps 30 days). Tell them in one sentence on the protos page, with an off switch (`?notrace` or a toggle) that also sticks in localStorage. This matches Plausible's "no id past a day" and the UK exemption's "how, not who" plus a way to object. Session video, cookies or a third-party analytics script aren't needed. The server change sits behind the owner gate. *Smallest prototype:* none until friends playtest; when they do, a `trace` report kind carrying one sitting's summary (no track), to see whether the counts are worth more.

13. **Watch one sitting on video when a map surprises.** Every source pairs data with watching (Valve, Halo 3, Poki's recordings). When a heat map shows something odd, record a screen capture of the next sitting on the iPad (iPadOS screen recording) and look at that spot; the map says where to look, the video says why. *Smallest prototype:* a line on the protos page: "map odd? record the next sitting".

14. **Use traces to check layouts, as BotW did.** level-design.md rec 18 asks whether gravity spreads walkers or the rail funnels them. Traces from the layout lab's `?layout=<name>` walks, drawn on the lab's own map, compare layouts by where people actually went. *Smallest prototype:* the sampler from 2 also running on `?layout=` pages, under a card for the lab.

## Gaps

- The Wired Halo 3 article itself refused the fetch; the Jungle example is from excerpts. The GDC talks by Zoeller (BioWare), Giovannetti (Mega Crit) and Orwig (Overwatch) are behind the GDC Vault; their content here is from notes, interviews and abstracts.
- The BotW CEDEC slides weren't found; the heat-map story rests on summaries (see [level-design.md](level-design.md)).
- No source covers telemetry for a single expert tester; everything above is about many players. Recommendations 1 to 11 are derived for that case.
- Nothing found on Riot's or Supercell's prototype-stage telemetry specifically, or on idle detection thresholds; 5 s idle is a starting guess.
- The ICO guidance page refused the fetch; check it before relying on the exemption's exact terms.
