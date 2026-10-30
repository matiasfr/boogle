# Ambitious social / cooperative / playful multiplayer mechanics for Boogle

Scope: small-group (2-8 friends) mechanics for a three.js + cannon-es browser sandbox, host-authoritative over PeerJS, playable on keyboard, touch and gamepad. Fit was checked against Boogle's DESIGN.md (toys before chores, the ball stays the star, cooperation is automatic, only the world is the antagonist, drop-in/drop-out, slapstick over precision, deterministic shared sim, sync edits not state, a clear authority table, PeerJS only).

Source quality note: about 17 searches and fetches. Primary sources were thin. No GDC transcript for Human: Fall Flat, Gang Beasts, Sea of Thieves or Journey's chime was readable without GDC Vault access. Most "why it works" evidence comes from press interviews and reviews. Glenn Fiedler's networked-physics article is the strongest technical primary source and is summarized in detail.

## Physics-comedy co-op mechanics (grab, carry, throw, ragdoll, tethers)

### Takeaway
Hit games in this space are built on purpose around shared vulnerability and clumsy bodies. Examples are a fragile item carried together (R.E.P.O.), a chain that drags everyone down (Chained Together), and wobbly "soft body" grabbing (Gang Beasts). Developers say openly that the friends supply the comedy. The pattern is: loose physics, plus a shared stake, plus blame that nobody can prove.

### Cited Findings
- Peak (Landfall + Aggro Crab) was built in a month-long jam in Seoul. Landfall did the core mechanics and Aggro Crab the theme and feel. It sold 1M copies in 6 days per [GamesRadar](https://www.gamesradar.com/games/co-op/im-gonna-crash-out-even-the-creators-of-co-op-climbing-game-peak-are-stunned-by-1-million-copies-sold-in-6-days-why-did-this-stupid-jam-game-sell-more-than-another-crabs-treasure). [Inverse](https://www.inverse.com/gaming/peak-steam-landcrab-friendslop-update-interview-nick-kaman-pc) reported 2M in 9 days. The figures differ by date and both are plausible. Further background is in [Gamepressure](https://www.gamepressure.com/newsroom/it-was-like-speedrunning-the-process-peak-developers-share-how-de/zc8103) and [80.lv](https://80.lv/articles/climbing-sim-peak-was-meant-to-be-friendslop-game-from-the-start).
- Aggro Crab's Nick Kaman says these games emphasize teamwork and communication rather than testing individual skill in a group. Caelan Pollock says the "friendslop" genre assumes friends make up the difference in comedy and interaction. — [GamesRadar](https://www.gamesradar.com/games/co-op/peak-lead-knows-youre-a-friendslop-hater-but-remember-these-games-arent-trying-to-be-game-of-the-year-these-are-games-that-emphasize-teamwork); [PC Gamer](https://pcgamer.com/games/adventure/peak-boss-doesnt-mind-us-calling-it-friendslop-why-not-make-a-game-where-the-point-is-to-hang-out-with-your-friends) (headline quote: "Why not make a game where the point is to hang out with your friends?")
- Peak's success made Aggro Crab commit to co-op. Their next game, Crashout Crew, is Overcooked-inspired and keeps proximity voice chat. — [PC Gamer](https://pcgamer.com/games/adventure/peaks-success-helped-aggro-crab-commit-to-co-op-says-studio-head-we-thought-we-were-a-character-action-studio)
- R.E.P.O. builds a horror loop around physics. Players carry fragile valuables without breaking them, and press describes its proximity chat as tied to the physics chaos. Coverage reports more than 100,000 Steam reviews at about 96% positive. No developer interview was found; this is press coverage. — [Co-Optimus](https://www.co-optimus.com/blog/article-poster/3380/the-game-where-a-piano-is-scarier-than-the-monsters.html); [Outsider Gaming](https://outsidergaming.com/repo-co-op-horror-game-like-lethal-company/); [Notebookcheck](https://www.notebookcheck.net/Silence-is-key-New-co-op-horror-game-on-Steam-uses-proximity-chat-and-noise-reactive-enemies.970595.0.html)
- Chained Together (Anegar Games, June 2024) chains up to four players together while they climb a tower. One bad jump drops everyone, and blaming each other is part of the appeal. It was approaching 100k concurrent players and had about 10k reviews at 90% positive soon after launch. — [PC Gamer](https://pcgamer.com/games/action/the-latest-friendship-ruining-co-op-game-on-steam-is-a-punishing-platformer-where-youre-chained-to-your-pals-and-its-about-to-crack-100000-concurrent-players); [GamesRadar](https://gamesradar.com/games/co-op/10000-reviews-90-positive-on-steam-and-only-dollar5-viral-hit-chained-together-uses-the-power-of-co-op-to-ruin-up-to-four-friendships-at-once)
- The same game was criticized: some players see the chain physics as a design flaw and say it lacks polish, though it delivers genuine shared panic. — [PlayPile](https://playpile.gg/games/chained-together)
- Gang Beasts is built on a "soft body" system: characters can grab, lift and cling to almost any surface or opponent. It supports up to 8 online. — [GFN listing](https://gfn.am/en/games/gang-beasts); [PC Gamer review](https://www.pcgamer.com/gang-beasts-review/). Shacknews says the laughter "isn't always enough" to cover lingering issues at 1.0 — [Shacknews](https://www.shacknews.com/article/102538/gang-beasts-review-royal-fumble)
- Human: Fall Flat added online play for up to 8 in October 2017. Sumo Digital later built the console multiplayer. — [PC Gamer](https://pcgamer.com/human-fall-flat-adds-8-player-online-multiplayer); [God is a Geek](https://www.godisageek.com/2018/07/free-multiplayer-update-coming-physics-based-puzzler-human-fall-flat)
- Content Warning (Landfall) was mostly built in a month-long jam and launched free for 24 hours on April 1, 2024. 6.6M people claimed it, and concurrent players peaked at 204K. Its loop is to film creepy things, get out, and upload the footage to go viral. — [GamesRadar](https://www.gamesradar.com/the-mega-viral-co-op-horror-hit-that-was-free-for-its-first-24-hours-was-mostly-developed-in-a-single-month); [Game World Observer](https://gameworldobserver.com/2024/04/02/content-warning-140k-ccu-4-5-million-downloads-landfall)

### Inferences
- The common pattern: loose bodies, plus a shared stake (fragile cargo, a chain, a climb), plus outcomes that can't be attributed to anyone. Together these produce laughter and retold stories. This matches DESIGN.md #10 (slapstick over precision) closely.
- Boogle already has the "fragile shared object" in the beach ball. Carrying, passing and juggling it together is the cheapest physics-comedy hook.
- Content Warning suggests that a capture tool (a camera or replay clip) turns accidents into artifacts players share. It works well for a friends' game and is cosmetic-only.

### Gaps
- No primary networking postmortem was found for Human: Fall Flat, Gang Beasts or R.E.P.O. Their netcode approach is unknown from these sources.
- No developer interview explaining R.E.P.O.'s design rationale was found. The shapes.inc fan guide was rejected as unreliable.
- Totally Reliable Delivery Service and Peak's specific rope and stamina mechanics were not covered in what I fetched. The PC Gamer article body did not load.

## Asymmetric roles and emergent communication (proximity voice, pings, emotes, wordless co-op)

### Takeaway
Communication tied to distance (proximity voice, walkie-talkies) creates tension and stories. Constrained, wordless signals (Journey's chime, Sky's candles and hand-holding) create warmth and keep toxicity low. Both suit a small friends' game. Wordless signals are much cheaper and safer in a browser.

### Cited Findings
- In Lethal Company you can only talk to friends nearby, or when both hold walkie-talkies. Reviewers say this makes it hard to know whether friends are alive and adds tension. Walkie-talkies are an early purchase that widens how far you can coordinate. No interview with Zeekerss was found. — [Tampere PlayLab blog](https://blogs.tuni.fi/playlab/game-reviews/how-mods-can-enhance-the-player-experience-of-lethal-company/); [Windows Central](https://windowscentral.com/gaming/lethal-company-was-2023-best-indie-game-surprise-so-brilliant-cant-stop-playing); [CogConnected](https://cogconnected.com/feature/what-makes-lethal-company-so-good/)
- Caveat: some players say proximity voice matters less when friends sit in the same room or are on Discord. — [Steam discussion](https://steamcommunity.com/app/1966720/discussions/0/4032473754059448638)
- In R.E.P.O., shouting can draw enemies, which makes talking itself a risk. — [Notebookcheck](https://www.notebookcheck.net/Silence-is-key-New-co-op-horror-game-on-Steam-uses-proximity-chat-and-noise-reactive-enemies.970595.0.html)
- Journey's only player-to-player communication is a musical chime. It also changes the world: it turns cloth red and lets players progress. Critics praised the companionship it created. — [Wikipedia](https://en.wikipedia.org/wiki/Journey_(2012_video_game)); the GDC talk "Designing Journey" exists, but its body is behind the paywall — [GDC Vault](https://gdcvault.com/play/1017700/Designing)
- Sky: Children of the Light has no open text chat and hides names. Players spend candles to befriend each other, and growing friendships unlock closer interactions such as holding hands and chat. Jenova Chen: "you have to earn the right to apply your social power" and "nobody is born toxic". — [PC Gamer](https://pcgamer.com/games/mmo/nobody-is-born-toxic-says-journeys-creative-director-while-preparing-to-launch-the-kindest-mmo-on-pc); [Apple Developer "Behind the Design"](https://developer.apple.com/news/?id=zm47it7t)
- Sea of Thieves crews (1-4) run wheel, sails, anchor and navigation themselves, with no AI crew. Players fall into helmsman, lookout, repair and cannoneer roles. Design lead Mike Chapman: "give them a world... a set of tools and how they use those tools and interact with others means the game is going to play differently each time." — [Sea of Thieves Wiki](https://seaofthieves.wiki.gg/wiki/Crew); [Gamereactor](https://www.gamereactor.eu/previews/631753/Sea+of+Thieves+A+Rare+Invitation+to+Become+a+Pirate+Legend/)
- Craig Duncan (Rare) says mixed player motivations in a shared world produce emergent stories. Early on, the team used Plutchik's emotion wheel to pick which feelings the game should support. — [Game Developer](https://www.gamedeveloper.com/design/how-emotional-psychology-and-the-goonies-inspired-i-sea-of-thieves-i-)
- Overcooked's Phil Duncan ties its constant communication under a clock to real restaurant kitchens. — [KaTom feature](https://www.katom.com/blog/cooperative-cooking/); [Game Developer, Road to the IGF](https://gamedeveloper.com/design/road-to-the-igf-ghost-town-games-i-overcooked-i-)
- Josef Fares's It Takes Two ties co-op mechanics tightly to the narrative. Each player gets different, complementary abilities. — [The Ringer](https://www.theringer.com/2021/04/22/video-games/josef-fares-it-takes-two-interview-co-op-gaming); [Unreal Engine interview](https://www.unrealengine.com/developer-interviews/it-takes-two-lovingly-marries-story-and-gameplay-together)

### Inferences
- In Boogle, proximity voice over PeerJS is technically possible (WebRTC carries audio) but means mic permissions and moderation burden. Friends already on Discord get little from it. A Journey-style chime or emote that also does something in the world (wakes a plant, calls the ball, lights a path) fits DESIGN.md #4 better and needs one gamepad button.
- Overcooked-style forced roles and clocks conflict with "Toys before chores" and "Cooperation is automatic, not negotiated". Sea of Thieves-style optional stations on a shared vehicle (anyone can grab the tiller or sail) give roles without forcing them.

### Gaps
- No primary source on the design of ping wheels (Apex-style) for small co-op. Not researched.
- The exact Journey chime mechanics (charge, radius, scarf recharge) were not confirmed from a primary source.

## Shared building and persistent shared worlds

### Takeaway
Little was confirmed externally in this pass. The Sea of Thieves and Garry's Mod findings support the idea that "a world plus a set of tools" with persistence produces emergent stories. Boogle already has persistent terrain and garden edits, which is its version of this.

### Cited Findings
- Garry's Mod's open sandbox and physics let the community build game modes (Prop Hunt, Trouble in Terrorist Town) and big map libraries, distributed through the Steam Workshop. — [Wikipedia](https://en.wikipedia.org/wiki/Garry%27s_Mod); [Kill Screen](https://www.killscreen.com/hide-and-seek/)
- Sea of Thieves calls itself a "shared world adventure game" with no overarching narrative. Public events (Skull Forts) pull crews into cooperation or conflict. — [inkl/Guardian](https://www.inkl.com/news/sea-of-thieves-the-pirate-adventure-that-heralds-the-return-of-rare); [Gamereactor](https://www.gamereactor.eu/previews/631753/Sea+of+Thieves+A+Rare+Invitation+to+Become+a+Pirate+Legend/)

### Inferences
- In Boogle, collaborative building should stay "edits, not state": each placed piece (sandcastle block, driftwood plank, flag) is a host-stamped op through `registerOp`. That is cheap and deterministic. Free-standing physics structures that topple are expensive (see networking).
- The Garry's Mod lesson: a sandbox with user-made modes is what produced its best-known modes. A small mode framework layered on the island (next question) is the low-cost analogue.

### Gaps
- Valheim, Minecraft, Dreams, Tiny Glade, Rec Room and Roblox building design was not researched in this pass (budget). No sources, so no claims.

## Lightweight game modes layered on a sandbox (tag, hide-and-seek / prop hunt, races, KOTH, CTF, scavenger hunts, boss events)

### Takeaway
Prop Hunt shows the path from mode to phenomenon: a sandbox with movable props, no learning curve, absurd disguises, then streamer spread. It began as a community mod and was later copied into Call of Duty, Fortnite and Genshin Impact.

### Cited Findings
- Prop Hunt: one team disguises as props and hides, the other seeks. Kill Screen says it started as a Team Fortress 2 mod and took off in Garry's Mod. Other sources disagree on where it started. — [Kill Screen](https://www.killscreen.com/hide-and-seek/); [Wikipedia](https://en.wikipedia.org/wiki/Garry%27s_Mod)
- Kill Screen recalls that "seemingly every prominent gaming YouTuber" played it. It was later adapted into CoD MWR, Black Ops III, Fortnite and Genshin Impact. Other claims about why it spread came from low-quality guide sites and are excluded. — [Kill Screen](https://www.killscreen.com/hide-and-seek/)
- Sea of Thieves Skull Forts are scheduled public events that pull separate crews into a shared fight. — [Gamereactor](https://www.gamereactor.eu/previews/631753/Sea+of+Thieves+A+Rare+Invitation+to+Become+a+Pirate+Legend/)

### Inferences
- For Boogle, modes must be opt-in "invitations" (DESIGN.md #3, #8): a flag or totem anyone can pick up starts a round, there is no lobby, and late joiners slot in. Tag, keep-away with the ball and ball races need no new physics netcode, because they reuse the ball's epoch ownership.
- "Only the world is the antagonist" rules out modes that destroy builds. Tag, hide-and-seek and keep-away are fine because nobody's progress is lost. A "boss event" fits as a telegraphed world event (a big wave or a giant crab), in line with DESIGN.md #7.

### Gaps
- No primary design writing on tag or KOTH in social sandboxes (e.g., Rec Room's paintball, Fall Guys) was gathered.

## Traversal fun with friends (grappling, gliding, boats, mounts, swimming, surfing)

### Takeaway
Shared vehicles with stations (the Sea of Thieves ship) and climbing with tethers (Peak, Chained Together) are the proven "with friends" traversal patterns. Gliding and grappling are mostly fun alone unless someone else can ride along or be the anchor.

### Cited Findings
- Sea of Thieves: ships need several players on separate stations. Smaller ships let solo and duo crews share the world, and two small ships ganging up on a big one is cited as emergent story. — [Sea of Thieves Wiki](https://seaofthieves.wiki.gg/wiki/Crew); [htxt/Eurogamer](https://htxt.co.za/?p=98602)
- Chained Together and Peak make climbing social by linking bodies or fates. — [PC Gamer](https://pcgamer.com/games/action/the-latest-friendship-ruining-co-op-game-on-steam-is-a-punishing-platformer-where-youre-chained-to-your-pals-and-its-about-to-crack-100000-concurrent-players); [GamesRadar](https://www.gamesradar.com/games/co-op/peak-lead-knows-youre-a-friendslop-hater-but-remember-these-games-arent-trying-to-be-game-of-the-year-these-are-games-that-emphasize-teamwork)

### Inferences
- Boogle has water and a tide, so a raft, inner tube or surfboard is the most on-theme traversal. A multi-seat raft where each rider paddles one side (and steering emerges from who paddles) gets Sea of Thieves-style roles with near-zero negotiation.
- Riding the beach ball (hamster-ball style) or being launched by friends keeps "the ball stays the star".

### Gaps
- No sources gathered on gliding or grappling in co-op (e.g., Zelda, Just Cause co-op mods), on surfing mechanics, or on mounts.

## Networking physics interactions at small scale (authority handoff, prediction)

### Takeaway
The best-documented small-scale approach is Glenn Fiedler's host-arbitrated distributed authority. Each object is simulated by whoever last touched it (authority) or holds it (ownership). Sequence numbers resolve conflicts, the host is arbiter, and resting objects compress to one bit. It maps almost one-to-one onto Boogle's existing ball epoch rule and PeerJS host.

### Cited Findings
- Each cube has default authority (host) or belongs to the last player who interacted with it. Authority spreads recursively to cubes the thrown object hits. Ownership (grab) is stronger: others can't take a cube until its owner releases it. — [Gaffer On Games, Networked Physics in VR](https://gafferongames.com/post/networked_physics_in_virtual_reality/)
- There are two sequence numbers per object. The authority sequence goes up when a player takes authority and when the object comes to rest. The guest keeps authority until the host confirms the return to default, so the rest state survives packet loss. The ownership sequence goes up on every grab and outranks authority increases. — [Gaffer On Games](https://gafferongames.com/post/networked_physics_in_virtual_reality/)
- All packets go through the host, which accepts or rejects updates by sequence number and sends corrections. Players can still take authority from a stack someone else is building, so knocking towers over works. — [Gaffer On Games](https://gafferongames.com/post/networked_physics_in_virtual_reality/)
- Held objects go in the avatar packet: object id, relative position and rotation, and sequence numbers. They are skipped by regular physics updates while held. A 100 ms jitter buffer interpolates avatars. — [Gaffer On Games](https://gafferongames.com/post/networked_physics_in_virtual_reality/)
- Bandwidth: an "at rest" bit, quantization applied before each local physics step too (keeps stacks stable on both sides), a priority accumulator with boosts for high-energy collisions and recent throws, and per-object delta baselines. A "perfect prediction" bit covers about 90% of objects. The budget is under 256 kbps per player, so 4 players fit in about 1 Mbps on the host. — [Gaffer On Games](https://gafferongames.com/post/networked_physics_in_virtual_reality/)
- Fiedler's series compares deterministic lockstep, snapshot interpolation and state synchronization for networked physics. — [hugo3m netcode wiki summary](https://hugo3m.github.io/wiki/netcode/networked_physics/snapshot); [GitHub reimplementation](https://github.ddaodan.workers.dev/valverl/NetworkedPhysics)
- Forum caution: when two authorities' bodies stay in contact, path-forcing hacks "will not likely work well". — [GameDev.net thread](https://www.gamedev.net/forums/topic/290970-zen-of-networked-character-physics/)

### Inferences
- cannon-es is not deterministic across machines (floats, solver order), so physics props must not enter the deterministic integer sim. They belong in the "owner simulates, others interpolate" layer, which is what Boogle's ball already does.
- Cheap: one or a few owned props (ball, raft, a carried crab), with grab-ownership taking priority over touch-authority.
- Expensive: player-to-player grabbing, ragdolls and tethers, where two client-owned bodies are joined by a constraint. Each player owns their own body, so the joint spans two authorities, and the result is rubber-banding and jitter. Options: (a) while joined, the grabber (or the host) takes authority over the grabbed player's body (Fiedler's ownership rule applied to avatars); (b) fake it: render a rope or hand between two independently moving players and apply only a soft spring force to your own body toward the other's last known position. Option (b) is far cheaper and good enough for comedy.
- Stacks and towers of loose physics blocks are the hardest case (many contacts, divergence when resting priority is lowered, per Fiedler). Prefer sand-grid edits (already deterministic) for building.

### Gaps
- No primary source on how Human: Fall Flat, Gang Beasts, Peak or R.E.P.O. (Photon-based, likely) network ragdolls. The R.E.P.O./Photon claim is unverified.
- No browser/WebRTC-specific measurements of physics sync over PeerJS DataChannels were found.

## Catalog: 12 concrete mechanics for Boogle (synthesis)

Each entry: what it is / precedent (sourced above) / loop / why friends laugh / host-authoritative implementation notes / ambition. Ambition levels: S = small (days, existing netcode), M = medium (new owned object or op types), L = large (needs new physics-network work, flagged with a warning). All implementation notes are my inference, grounded in the networking findings and DESIGN.md.

1. **Pass-and-catch combo / keep-it-up.** Precedent: the "fragile shared object" in R.E.P.O.; Boogle's ball. Loop: friends juggle the ball without letting it touch sand; a cosmetic counter and splash grow with each different player touching it in a row. Why: an instant group goal, "who dropped it" blame, and it rewards *different* people (DESIGN #4). Net: reuses ball epoch ownership; the counter is derived from owner-change events. Ambition: S.

2. **Carry-together heavy objects (log, treasure chest, giant coconut).** Precedent: R.E.P.O. carrying, Fiedler ownership. Loop: an object too heavy for one player moves only when 2+ players grab it; it wobbles, and dropping it into the tide loses it to the sea (world antagonist). Why: forced cooperation without words, plus physical comedy. Net: the host owns the object; each grabber sends a "pull" input (direction + strength) and the host applies the summed forces and broadcasts the state. That avoids split authority. Ambition: M.

3. **Grab and drag friends (hand-holding / tow).** Precedent: Gang Beasts grabbing, Sky hand-holding, Human: Fall Flat. Loop: grab a friend's hand to drag them, swing them, or pull them out of the surf. Why: the core slapstick verb, and tender too. Net: ⚠ requires cross-authority joints. Cheap version: a visual hand link plus a soft spring each client applies to its *own* body toward the partner's interpolated position. Full version: the grabbed avatar's authority transfers to the grabber (ownership seq). Ambition: M (fake) / L (true).

4. **Rope tether / "chained together" challenge.** Precedent: Chained Together, Peak. Loop: an opt-in rope shrine ties the current visitors together for a climb up a sand tower the group built, or a swim across a channel. Why: shared fate and unprovable blame. Net: ⚠ same as #3 but chained over N players. Use a spring-only fake (each client clamps itself by distance to its neighbors' interpolated positions), with a rope drawn as a catenary. Ambition: L.

5. **Meaningful chime / emote.** Precedent: Journey chime, Sky candles. Loop: one button emits a musical note that does something in the world (wakes nearby sprouts, calls the ball toward you, lights a lantern); chiming in harmony with others amplifies it. Why: wordless co-op with no toxicity, works for strangers and kids. Net: a reliable edit op `chime(x,z,tick)`; world effects run in the host sim; sound is cosmetic. Uses one gamepad slot. Ambition: S.

6. **Proximity voice (optional).** Precedent: Lethal Company, R.E.P.O., Peak, Crashout Crew. Loop: talk volume falls off with distance; a shell "walkie-talkie" item extends range. Why: separation tension, overheard jokes. Net: PeerJS media calls in a mesh (fine at ≤6), with WebAudio panner nodes set from avatar positions. Mic permission UX; off by default. Ambition: M. Low value if friends already use Discord.

7. **Multi-seat raft / inner-tube convoy.** Precedent: Sea of Thieves stations. Loop: up to 4 hop on a raft; each paddles one side; steering and speed come from who paddles; ride the tide, surf the big wave, ram sand walls. Why: emergent roles, crashes, "paddle LEFT!" moments. Net: the host owns the raft (like the ball); riders send paddle inputs; riders' avatars become attached children (Fiedler's held-object pattern applied to seats). Ambition: M.

8. **Human cannon / launch a friend.** Precedent: Gang Beasts throws, Totally Reliable Delivery Service style launching (not sourced). Loop: a buried catapult or bouncy kelp that friends load (by standing on it) and fire. Why: sky-high slapstick that reads easily. Net: the launch is an impulse applied by the *launched* client to its own body when it receives a host-stamped `launch` event, so no authority transfer is needed. Ambition: S-M.

9. **Opt-in tag / hide-and-seek / "prop" disguises.** Precedent: Prop Hunt in Garry's Mod. Loop: touch a totem to start a round with whoever is near; "it" glows; or hiders turn into beach props (shell, bucket, crab) and freeze. Why: zero learning curve, absurd disguises, streams well. Net: the host keeps the round state in its presence (like the Boogler); tags are client-claimed and host-validated by distance; a disguise is an avatar-mesh flag. Ambition: S-M.

10. **Telegraphed boss / world event (giant crab, rogue wave, gull swarm).** Precedent: Sea of Thieves Skull Forts. Loop: a crab crawls out at low tide 60 s after warning; players chase it off by hitting it with the ball or splashing, and it drops seeds or cosmetics personal to each helper. Why: pulls a scattered group into one moment and a shared story ("remember the crab"). Net: the host owns the NPC (existing Boogler pattern); the schedule is a pure function of tick + seed; hits come through ball ownership. Ambition: M.

11. **Shared sandcastle / build prompt with "visitors' flags".** Precedent: a "world plus tools" persistence model (Sea of Thieves, Garry's Mod). Loop: the island shows a faint target silhouette (castle, giant face); terrain edits that fill it make it "come alive" (flags, lights), credited to every distinct contributor. Why: persistent shared creation; the next visitor finds it (DESIGN #9). Net: purely the existing deterministic terrain ops plus a host-checked match score. No new physics netcode. Ambition: S-M.

12. **Replay camera / postcard.** Precedent: Content Warning's film-and-upload loop. Loop: a disposable camera records the last ~10 s of a local cosmetic replay or snaps a still; postcards pin to a beach board for later visitors. Why: turns accidents into shareable artifacts. Net: local ring buffer of interpolated transforms (cosmetic); stills saved via the host snapshot server (size-limited). Ambition: M.

13. **Ride the ball (hamster/surf mode).** Precedent: inference, supported by DESIGN #2. Loop: climb on the beach ball and balance-roll it; friends knock you off. Why: ball-centric chaos. Net: ⚠ rider + ball across two authorities; make the rider take ball ownership while mounted (ownership seq beats touch). Ambition: M-L.

### Physics-network flags (summary)
- No new physics netcode: #1, #5, #9, #11.
- One more host- or owner-simulated object (reuse the ball's epoch rule): #2, #7, #8, #10, #12.
- ⚠ Significant work (cross-authority constraints between players): #3 (true version), #4, #13. Prototype the "fake with springs" version first.
