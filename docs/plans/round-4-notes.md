# Round 4 playtest notes: tracker

Every note from Matias and Grant's call of 3 November ([log and evidence](../playtests.md)). Owner: "pretty much all the notes we had are valid, so I just want to make sure that we're tracking them all." So nothing here is dropped without the owner saying so. Tick a note only when it has shipped or the owner has closed it. Unticked notes with no job are the next work to pick from.

Serves DESIGN.md 11, Show, don't tell, and 1, Toys before chores.

## Fixed and shipped (still to be played)

- [x] Grant's freeze: forge rack overflow fixed and instance counts capped. Not proven to be Grant's exact case; Grant's video still to come.
- [x] Launched into the sea from the cart.
- [x] Thrown off trains with two players.
- [x] Partner's cart invisible, partner walking in place.
- [x] Partner's beam, boiler, rails, logs, stone and pet not shown.
- [x] Gates 90 degrees off.
- [x] Get unstuck going to the old island.
- [x] Cinematics, item cards and the town camera closing on movement, including jumping.
- [x] Whistle for the cart only working when the far end needs something.
- [x] "Stand on a platform" flickering, trains called repeatedly.

## Shipped overnight, 4 November (to be played)

- [x] `little-guys-rails`: little guys bring rails from Line 2 station 4, with a 13 m/s bonus on a cart you load and ride. Shipped. Splitting pays by only 2 to 4 s at station 5: judge on the replay.
- [x] `no-objective`: remove the objective marker. Shipped.
- [x] `tree-tiers` and `trees-any`, shipped: any ordinary tree, plus two hardwoods; replay decides if the hunger survives. Was: (research): any tree can be attempted; tougher trees read as a different kind. Bands go with it. Why it's awkward now: "you have to go all the way there to get logs".
- [x] `place-bugs-look`, shipped (jump wobble and the recovery loop not reproduced; check the Z-fighting spot): square shadow; double-jump rings; floating rails; Z-fighting at the canyon platform; pack floating and load outside it; no way back from Happy Clam, and the water-recovery loop there; boxes on the train not solid; wall parts disappearing in the cutaway; jump wobble.
- [x] `place-bugs-run`, shipped (track layer boarding not reproduced): pinned at the Camp halt; first-use hitches; cart junction snap; boarding the track layer; false reload prompt; Start fresh splitting a co-op room.

- [x] Call feedback routine and silent flag (M, D-pad right; none on touch), shipped; first real use is the replay.
- [x] World cues, shipped; the forge's rail pickup and the great tree from a straight-in walk stay weak.
- [x] Two-player route, first chop to pier with a reload and a leave-and-rejoin, passed by bots seated on trains ([record](coop-route-verification.md)); standing rides are being tested.

## Solo play, 4 November (owner on iPhone, not yet triaged)

Answers are being collected on the [review page](https://claude.ai/artifact/4MQmeWfAe2nw57T85B7juu). Sessions `mw38b15m`, `mw38s7vf`, `mw390tiz`.

**Replay audit, 5 November:** checked against local `origin/main` `fd54894e`. A tick means implemented in the cited commit, not owner/device approval. Mixed items are split below so unfinished work remains visible. No design expansion is part of this replay preparation. [Combined replay evidence](../research/round-4-replay-preparation.md): solo and continuous co-op pass after bot repairs (`60838d35`, `320c0eb3`, `8c642ecf`, `f2d3710e`) and a co-op boarding-budget correction (`1599ed02`). Axe/Drop/respawn probes and world-inputs pass. Phone-profile render GPU is +5.4%; load is roughly unchanged. An intermittent grounding outage and transient train-position gaps remain unresolved; not tested on a device.

**Owner decisions, 5 November**

- The great trunk can't be shouldered until Station 3 needs it. A dropped log that can't be reached respawns.

**Bugs**

- [x] Great log soft-lock: early pickup gate, Drop and unreachable recovery (`1a5c17b7`, `8434c5c4`, `22e1a318`); proper axe before the beam (`2236d075`).
- [x] Ping's far fallback (`3470c329`).
- [x] D-pad conversations: restore missing `af0e4239` as local `5296357b`; all four directions belong to the talk, including horizontal repeat, without Ping/Flag. `ce5b3144` corrects the keyboard guide and adds focused acceptance captures. The earlier main audit correctly found this missing; it is now restored on the replay branch, not pushed. Standard/axes/hat D-pads and arrow keys pass; physical pad verification remains.
- [x] Whistle try-on aisle access (`6403073e`); top hat behavior retained.
- [x] Wall-jump wobble (`96445aae`).
- [x] Split NPC answer, "Out there" / "the ground does that" (`03fee5c2`).
- [x] Reward star rarity (`74362637`).
- [x] Landscape pause layout (`f9ebd059`); physical phone verification remains.
- [x] Update banner clipping and touch glyph (`cdc84269`).
- [x] Automatic demonstration double-jump removed (`45f4181d`).
- [x] Glider/cinematic sequencing (`ea180fda`), construction before glider (`9f986ad6`), gate reveal before return hook (`2147f451`).
- [ ] Background GPU error at 48:17 (`createCommandEncoder`): local recovery fallback and forced-loss/error regressions implemented on `codex/gpu-recovery`, not pushed or shipped ([evidence](../research/gpu-recovery.md)). Isolated errors now continue rendering; only loss, thrown callbacks or 60 consecutive checked failing draws stop it. Same-room Reload preserves an accepted edit. The full bot passes with the matching long budget; its earlier cutoff was a harness-budget mismatch. Original Safari cause and relationship to Grant's freeze remain unproven; actual device background/restore still needs verification.

**Looks and clipping**

- [x] Readable unlit particles/names (`84cceb92`); fixed HDR with Dev controls (`33a941ab`), shared compensation (`fa7fd698`), calibration/dry-path guards (`adae2172`, `09539c45`, `85aa245a`). Brighter sand and darker shop/sun-facing sky remain reported tradeoffs, not owner approval.
- [x] Square shallows (`b0763291`).
- [x] Floating axe restored as default, new chop retained as an option (`5cd242d6`).
- [x] Head/hat/axe/beam clearance (`1544624c`), little guys clear train bodies (`807da81b`), side-carried boiler (`d1dcb2de`).
- [x] Optional platform terrain/tree/cliff clearance (`48896b72`).
- [x] Chest cap and summit floor z-fighting (`633d6ad6`).
- [x] Pale tree cuts (`8b3d43c6`) and supported stone piles (`590d200a`).
- [x] Worker text/prompt and conversation framing changes (`ff27ba5b`).
- [ ] First-stage worker framing: targeted desktop and touch-profile portrait/landscape checks passed on `1b19093f` ([evidence](../research/final-tree-replay-verification.md#first-stage-worker-framing)); actual worker and full card visible. Owner/device approval remains open; not tested on a device.
- [x] Station bench orientation/aisle (`02582583`) and turntable rim/rails (`02f58ef6`).
- [x] Firebox grate and calmer glow (`c423fb11`).
- [ ] Bridge bell's apparent reaction to falling in remains unaddressed.
- [ ] Water and sky may be too good next to the world. Performance dipped: 2x down to 1.2x from 18:11, up to 568 draw calls.

**Design**

- [x] Fork signs removed; dock and town approach (`32a21e81`; [brief](../brainstorms/signposts.md)).
- [x] Brass trinkets versus blue specimens (`55668f81`).
- [ ] Money purpose/currency/icon/display: design pass after replay.
- [ ] Dropped-resource despawn and tree regrowth: wait for the production plan's supply accounting and safe-rack policy before slice 2. Not implemented here.
- [x] Boiler saddle and matching pedestal (`06df8aba`).
- [x] Prepared earth/stakes beyond the gate (`88f34a3a`).
- [x] Cart recall/delivery cues (`bfea44df`, checked in `c1c16342`); cart-first progression remains after replay.
- [x] Track-layer ease-out and broader rear step (`74dcab6c`).
- [x] Distinct track-layer machine art: crawler shell `85af518a`, flanged rail wheels `6657c5f6`, `4fa38246`, panel magazine and hoist `528560d4` (all in #1018, 6 November); seats as plain stools #1197 (8 November).
- [x] Log-cell pickup pulse (`76f01598`) and fading seated Stand hint (`b7dd93f7`).
- [x] Raised tower chests and hanger preview (`76f01598`); Station 3's earned axe stand (`2236d075`).
- [x] Unnecessary long-way-round comparison banner removed (`eac11383`); crossing record and fanfare retained.
- [x] HUD name/Live into pause on every platform, touch-only options and fewer pause stats: restore missing `6f46f171` as local `3bae8f40`, retaining later changes. Fresh desktop and phone-profile captures show identity/Live in Pause, money only when empty-handed, and the options button in touch play. Portrait and landscape inspected; not tested on a device. `c6447faa` alone had moved tester controls/counters only.
- [x] Fixed train seats (`fd5eeed2`, `7e64deed`) and enterable completed forge (`8340a1e2`).
- [ ] Museum zoom and hat-buyer reaction remain; preserve The Boogler's copy.

**Liked**

- Forge coming together from train supplies, zoom-out on connecting town, "thanks for playing" cutaway, jump puzzle, museum, NPCs (especially the free hat), the water and shallows, crystal pickup animation and sound.

## Owner playtest, 7 November (tot, not yet triaged)

Source: Matias's written [playtest notes](../playtests.md#2026-11-07-owner-playtest-tot), captured for the Claude orchestrator while usage was exhausted. Exact build, device and session are unknown; no independent reproduction or visual check yet. Keep these open even where earlier entries record a shipped fix.

- [ ] Small square shadows still appear on the ground in some places; locate and visually check the remaining cases.
- [ ] Track-layer seats look weird at different "attitudes"; visually check their alignment. Exact angles/elevations were not specified.
- [ ] Double-jump effect reads as a circle; the requested direction is a motion particle effect like the axe's magic trail.
- [ ] Hookshot platforms clip / z-fight; investigate alignment or a general solution for this recurring problem.
- [ ] Rails picked up do not appear on the backpack.
- [ ] Station 4: resources invisible on the stand, and deposits blocked until the gate opens. The sequence felt weird; investigate both visibility and deposit timing.
- [ ] Station 4 (written "station 4l"): track-layer arm sometimes extends unrealistically. The owner is open to slower animation if needed for believable motion; cause and remedy remain unverified.
- [ ] Station 4: arch top missing after opening.

## Owner session, 9 November (desktop, live build; ranked)

Matias played the live game from 20:15 UTC and sent notes as he went (sessions `mw9papxp`, `mw9pg5a5`, `mw9prlct`). Ranks per the owner call "Rank every note P1, P2 or P3, and keep them all"; he re-ranks freely. Status is as of 21:40 UTC; the [orchestrator state](../agents/orchestrator-state.md) has the live one.

| P | Note (his words where quoted) | What it is | Status |
| --- | --- | --- | --- |
| P1 | "I saw the cut scene start but either my input interrupted it or it finished super fast. it's a bug" (the pinnacle lever) | The gate shot ends on any input, mouse movement included. His rule: "the cinematic should be uninterruptible unless by maybe a specific highlighted button press" | Being fixed |
| P1 | "I see the engine emitting smoke but I can't pick it up yet" | "Shoulder the boiler" shows no prompt and no reason unless you carry nothing; it blocks the way to trains | Being fixed |
| P1 | "the longest grind has been getting rails to the pier station, because the cart does not bring them" | Corrected from the full session data: the grind was station 6. Its kit (32 rails, 32 logs) is meant to come by train, but trains need the boiler fitted, and he funded and laid station 6 by hand (12:28–12:55) before taking the boiler (14:54). Nothing stops or warns against that order. The orchestrator first read it as station 5 (24 rails, cart of 16), which is also real: he took rails by hand six times | Station 5: the cart carries 24, on main (#1280). Station 6 before trains: queued for the designer with the Works signposting |
| P1 | (from the data) The boiler and the breaker stood on the same pedestal at once | The breaker is cast when station 6 is laid; with the boiler still there he took both within 1.3 s, struck the first seam carrying the boiler, then fitted it. The design assumes the pedestal is empty by then | Queued with the order fix above |
| P1 | "upon world resets ... it should start me at the beginning of the game with the character creation menu" | A returning player loads into town after a reset | Being fixed, ahead of the v23 reset |
| P1 | "I just finished the rail to where fireworks were supposed to happen but got no cutscene I could see" | Far Head's rockets fire with no camera; also unseen on iPad earlier the same day | Being fixed with the cinematics |
| P1 | "im confused on what's supposed to occur with the breaker once I hit it next to rotunda" | The first strike only opens the stall; the next step is a second seam about 500 m away and nothing points there | Queued: designer pass |
| P2 | "it feels weird to already be emitting smoke" (the boiler) | The forge's call plume rises from the boiler itself | Being fixed: the plume moves to the forge |
| P2 | "im confused on call cart to forge. what's the point" | The call only hails a ride; deliveries are automatic. He chose to cut the handle | Being cut (the rule goes with the next reset) |
| P2 | "what is this slab and why does the train clip the tracklayer here. bug?" (Pier halt) | The empty pier rack pad overhangs the deck; the train's last stop overlaps the parked track layer | Being fixed |
| P2 | "the top here disappears which looks weird, bug" (quarry gate) | The slab sinks when the gate opens, leaving bare posts and a chain ending in mid-air | Being fixed |
| P2 | "positioning is weird and sitting feels broken" (stools on the empty train cars); "my pet trails behind me when riding, it should be next to me when im sitting on a stool" | Stools at the car's edge; the pet's riding spot | Queued: one pass |
| P2 | "we should also make carrying the boiler also with a rope like the great log, but maybe a little faster because it's lighter" | Owner direction ([decision](../decisions.md#decided)) | Queued behind the boiler fix |
| P2 | Station 5's wait at the rim with the 24-rail cart (expected 80–125 s) and whether the rack's status reads | Follow-up to the grind note | Queued: measure, then the designer |
| P2 | "visual pass needed on the train engine, it looks a bit lackluster" | Art pass, previz first | Queued |
| P3 | "I like the new particle effect on double jump, I don't think we need the blue ring below the player" | Keep the glints, drop the ring | Being fixed |
| P3 | "conductor hat also sits a bit above the head, but that's low priority ... a cosmetics fitting pass in the future" | With the paper hat's 10 cm float from the Home flow review | Queued: cosmetics fitting pass |
| P2 | "look for performance dips there were a couple past the pier at the end" | At the pier head (x 1400, z −360) on both visits: p95 frame time 30–55 ms for about a minute (18 elsewhere), worst 112 ms, and the resolution scale fell from 2x to 1.6x, then to 1.2x. CPU was 5–6 ms and draw calls about 200, so it is GPU cost there (the open sea, about 440 particles a second). Then the scale stayed at 1.2x for four minutes after he left, back in the village at a steady 17 ms: the scaler recovers far too slowly | Queued: needs a quiet machine to measure |
| P2 | (from the data) Nine falls into water and recoveries in 3.5 s at about (1000, 28), 7:30 into the third session | The recovery put him back in the water each time | Queued |
| P2 | "visual pass on home ... one unified [station] ... rails also make sense with the rotunda and is to scale" | Owner direction ([decision](../decisions.md#decided)) | Research and a 2D options page in progress |
| P2 | (from the data) He struck both seams (15:00 and 0:48 of the next session) and stopped: "Fill the kiln" never showed | After the second strike nothing says the kiln wants 16 logs and 16 stone | With the Works signposting pass |
| P1 | "my friend on mobile had a freeze just now" (second session, with a friend) | The friend's iPhone sent nothing for about 27 s from 22:07:30 UTC at Far Head, then the page reloaded; the desktop was steady at 17 ms at the same moment. The phone had already dropped to its lowest resolution scale, and draw calls there rise from about 200 to about 600 on both devices | Queued with the pier performance job: needs a quiet machine and a real phone |
| P1 | "the flow bottleneck for the game is coming back for the 40 rails at far ahead, as I don't see the cart turning and the only option is to walk all the way back"; "I wasn't able to take the boiler off pedestal" | The same two holes as the first session, now with a friend: station 6 is hand-fed because nothing says its kit comes by train, and the boiler showed no prompt because he had just taken rails (pressed twice with "nothing in reach") | The boiler prompt fix is built, waiting on its looks; station 6's sign and rule are in the boiler-first-choice plan |
| P1 | "my friend experienced this black sky, is this a bug? he was on an iPhone Air" | After the freeze and reload: black sky, dark shading, lowest resolution, a band at the bottom of the screen where the canvas stops. The same phone started in portrait with a normal sky, so it is not the orientation; no error or failed draw was recorded | Queued with the freeze |
| P2 | (from the data) Two players went from the wake to Far Head in 13 minutes | The route to station 5 lasts a quarter of an hour with two people chopping (372 chops between them); the six-hour target needs the back half and the islands | For the designer when pacing is next reviewed |
| P2 | "taking another pass at our water system ... a lot more inexpensive instead of ultra water, that also fits the style of the game better"; "we will also revisit toon shading on characters and env" | Owner direction for two look passes | Queued: research and candidates first |
| P3 | "z fighting here on the train, can batch with train visual pass" | Where the engine's red body meets its dark base frame | Queued with the engine pass |
| P3 | (from the data) A 464–483 ms hitch at each load, and 286 ms boarding the train at Home | Startup and first-draw stalls | Queued with the pier performance job |
| P3 | "yes the slab fell over, I need to check the animation again" (the stall slab) | The design calls for three pieces, a hit-stop, chips and a thump | Waiting on his recheck |

Liked: the double jump's new glints.

## Owner co-op session, 10 November (iPad and desktop, v24; ranked)

Matias on an iPad and Daniel ("twipleset", Firefox on a Mac) played the live v24 world from the wake to the twelfth pier footing, 05:12 to about 06:08 UTC (sessions `mwa8hbv9`, `mwa8zhlg`, `mwa9y7pw`; Daniel's `mwa8ha6c`, `mwa8lo3p`, `mwa8zdun`, `mwa9yvzk`; [log](../playtests.md#2026-11-10-owner-and-daniel-co-op-v24-the-boiler-on-the-rope-and-the-works-part-2)). His notes came in writing afterwards; there was no call. Rows marked "from the data" are not his words. Times are UTC.

| P | Note (his words where quoted) | What it is | Status |
| --- | --- | --- | --- |
| P1 | "At the end, the train stopped delivering footings and i never go tthe twelve rockets from the ring island" | From the data: all sixteen footings the kiln casts were set (two at the stall, two in the cradle, twelve at the pier, nine of those by Matias and three by Daniel), the last at 06:02:32. The #1389 restart (05:45:46) and its reload (05:53:37) both came before that, so the deliveries stopped because the kiln was spent. The twelfth set should then play one whistle and two rockets at the last bent, with no camera; he waited about 2.5 min at the pier head and saw nothing. No mark records the finale, so the data can't show whether it fired | Being fixed (separate job) |
| P1 | "There were places like the fittings later in the game where I really didn't know what to do... Like fitting the moorings on the turntable"; "I don't know why I have to turn the table when there's nothing that will happen if I do, and I wasn't sure how that exactly worked." | The two stall footings, Fit the cradle and Turn the table. From the data: the table was turned five times (05:52:22–05:52:39) after the stall stood and before the cradle's footings, when a turn does nothing; the cradle's eight rails went in (05:54:34) before its footings; two more turns at 06:06:58, after the crossing | Queued: designer pass |
| P1 | "at one point the train missed me even though I was at the station. It didn't stop for me, and I wasn't sure why" | From the data: at the quarry halt with a cradle footing he called twice and waited 45 s, then boarded (05:56:42) a train heading out to Far Head; with someone aboard a train runs straight through to the end of the line ([place](../game-design/place.md), "Trains come last"). 11 s later he was off it 45 m past the halt and walked back for 1 min 20 s. With the first stall footing (05:48:16) he called, sat, stood 4 s later and walked home | Queued with the footings note below |
| P1 | "the most pain I felt was carrying the footings, because they were really heavy. I couldn't jump sprint with them, even if it was slower... it should be relatively easy to bring back to the station if I have multiple people and the train takes me. But because the train has to travel the whole route, and it didn't stop for me always, that made that part take a really, really long time." | From the data: a footing walks at about 2.2 m/s (175 m in 77–90 s). Trips from shoulder to set: the stall 1:42 and 1:43 (Matias alone, on foot), the cradle 2:55 (Matias) and 2:08 (Daniel); pier footings about 8 s each. Help carry on a footing was pressed three times, all at the pier. Kiln lit to the wagon out: 11 min | Queued: designer pass, with the train-stop rule |
| P1 | (from the data) Both players came off moving trains just east of the quarry halt | Matias at 05:56:53 carrying a footing (three tumbles); Daniel at about 05:59:42, into the sea at 05:59:49 at about (1231, −58), where he swam 54 s to Far Head. Both were standing, not seated. "Thrown off trains with two players" was ticked as fixed on 4 November | Queued |
| P2 | "I wasn't sure if everyone got the cutscene for opening the gate. So all that stuff should be under a unified system so that even in multiplayer, everyone gets the..." (his message was cut off there) | No mark records a cutscene, but the code plays these shots only for whoever triggers them: the quarry gate (Daniel pulled the lever at 05:31:47, so Matias had none), the sea gate (Matias pulled the summit switch at 05:35:45, so Daniel had none), the Works throat (Matias struck the quarry seam), and the glider's reveal card (whoever takes it). Shared on the accepted edge: Far Head's show (camera, fanfare, rockets) and the pier's whistle and rockets. Item cards go to the opener, with a flourish for the others | Built, branch only ([decisions](../decisions.md#decided)): the gate and throat shots play for the whole room on the accepted edge, the glider's card stays with the finder, and a `moment played` mark records each page; two-player look shows player 2's page playing the gate shot. Not tested on a device |
| P2 | "the turntable... it was kind of janky" | The turn's look and motion; nothing in the data | Queued: look pass |
| P2 | "the roof when it was built was wrong" | The stall frame and roof the second stall footing raises (05:52:00) | Queued: look pass |
| P2 | "Do we plan to build up the forge? The forge never completed... It still looks half finished by the end." | The forge lights roofless by design ([place](../game-design/place.md), the run, step 5) and nothing later adds to it | Question for the owner |
| P2 | (from the data) The boiler's Help carry keeps letting go | Daniel shouldered the boiler and fitted it 58 s later, about 180 m, first press, no drop seen (this build has no boiler drop mark). Matias pressed Help carry nine times in those 58 s; Let go showed 8 times and was never pressed | Queued |
| P2 | (from the data) Daniel's Firefox 159 | Two shaders (a standard material and the sea) failed to compile on every load; the audio duck threw once a session (`cancelAndHoldAtTime` is missing in Firefox), taking one railway update with it; 4.1 s and 7.3 s frames and repeated 0.5 s render hitches after the #1389 reload, and the resolution scale swinging between 1.2x and 2x. He may have seen a broken sea | Shaders and audio fixed on a branch (not tested on a device): both shaders had a `mix` of literals only, which Firefox's naga refuses (src/render/reference/tsl.md); the duck holds its value without `cancelAndHoldAtTime`. The long frames are not looked at |
| P2 | (from the data) Load stalls | The iPad's first load sat 28 s with no frame, then a 2.9 s frame; Daniel's loads stalled 9.7 s and 12.9 s. Later iPad loads were clean, and in play it held p50 17 ms, p95 18 ms, worst 203 ms past the first session | With the load-hitch research (#1391) |
| P3 | Daniel, relayed: "some dialogue got stuck in the middle while talking to Pip"; "he had to reload the game because he couldn't exit the pointer". The owner: "I wouldn't over-index on that." | From the data: Pip talked at 05:14:29, gave a rumour at 05:14:46, then Daniel stood still 86 s with only mouse clicks and reloaded at 05:15:53 | Queued, low |
| P3 | (from the data) The #1389 server restart during the session | Both tabs lost the server at 05:45:46 and were back in 13 s, mid-Works, with nothing refused; the reload onto the new build came 8 min later with all progress kept. The #1388 deploy reloaded both pages at 05:26:35, also keeping progress | Nothing to do |
| P3 | (from the data) Recorder gaps | Three falls into water (all Daniel's), each with one recovery: one per dip, as #1385 intended. There is no mark for a cutscene playing, the crossing's finale or a boiler drop, so this session's questions about those can't be answered from the data | Cutscene mark built with the P2 shared moments (`moment played`: moment, mine, shot, edge), branch only; the crossing finale has its own; boiler drop still queued |

Liked: "other than that, the feedback was pretty positive." From the data, the Works signposting part 2 worked: the stall seam 13 s after the breaker, the quarry seam 49 s later, the kiln lit 1 min 39 s after that.

## Owner session, 11 November (phone screenshot; ranked)

| P | Note (his words where quoted) | What it is | Status |
| --- | --- | --- | --- |
| P2 | "Connecting to the railway…" covers Jump at phone width (owner, 11 November: "P2, fix soon") | The connecting toast overlaps the Jump button on a phone-width screen, seen in his phone screenshot on 11 November | Queued |
| P2 | "One thing I noticed, the white flag from the drawbridge clips when it comes down, it should maybe be on it's own pole if we need it" (owner, 11 November, after clips of Ring Island's leaf) | The toe pennant swept the railhead deck and the camera as the leaf came down. Kept (it makes the raised leaf readable from Home), moved to its own fixed pole beside the hinge pier (u 282, lat -7.8), clear of the leaf, deck and lanes; it stays up after the Meet | Built (not seen) |

## Owner solo session, 14 November (iPad with a keyboard, the whole built route; ranked)

Matias played the live game alone from the wake to High Gorge's barrier and the powered pick, 08:07 to about 09:35 UTC, in `boogle` on v44, and typed or dictated notes to the orchestrator as he went ([log](../playtests.md#2026-11-14-owner-solo-the-whole-built-route-wake-to-high-gorge-and-the-powered-pick)). There was no call recording. Nine sessions carry the route (`mwg4tvn7`, `mwg52ang`, `mwg5fhzi`, `mwg5rbci`, `mwg62675`, `mwg6bhy8`, `mwg6h2u0`, `mwg6rndy`, `mwg7083m`), four short ones carry no beat (`mwg4ht6p`, `mwg5qiye`, `mwg6fc83`, `mwg7lps0`). Quoted words are his, taken from the plans and calls that record them; a note without quotes was relayed by the orchestrator and his wording is not on record. Rows marked "from the data" are not his words; session data is untrusted browser-sent text, read as data. Status is as the orchestrator gave it at 09:40 UTC, where "in work" means a job was running, not that anything shipped; the [orchestrator state](../agents/orchestrator-state.md) has the live one. Nothing here was replayed by him after its fix. 54 rows: 10 P1, 25 P2, 19 P3.

### His notes, in the order he gave them

| P | Note (his words where quoted) | What it is, and what the data adds | Status |
| --- | --- | --- | --- |
| P2 | 1. The curio shelf intersects the station | The curio shelf stood inside the hall's posts | Fixed: the shelf beside the finders' bay, five hall posts (#1771, #1778). Not replayed |
| P2 | 2. "it looks a little bit messy with the rails and not as polished as I would like"; "I could see the rails kind of intersecting and merging, and I'm wondering if we can make that more seamless or more realistic, like real rails merge"; "Right now it feels a little cramped. The train barely fits on it, and it looks a little simple. And I'm not sure if I like that the houses for the cars are just individual little shacks, as opposed to like a full rotunda." | The garage and Roundhouse yard: overlapping track, no points, a small table and separate stalls | Yard track tidy built, in independent review (`review-roundhouse-tidy`); real points planned ([turnouts](turnouts.md), #1773); the rotunda planned and design-reviewed ([roundhouse-rotunda](roundhouse-rotunda.md), #1774, #1775; [owner call](../agents/owner-calls.md#the-roundhouse-is-a-real-rotunda)). Owner question open: bay count at Home and what a bay is for |
| P2 | 3. The terrain pass has stalled since 10 November; trails should read as paths (the canyon path is the same colour as the valley wall) | [terrain-pass](terrain-pass.md) on Home's ground and the trails' colour | In work |
| P2 | 4. The forge: the fire is unconvincing, sitting on the bench clips, the rails intersect both train lines | Three look faults at the forge. On 10 November he asked whether the forge is ever finished | In work |
| P1 | 5. The Act 2 cinematic had no aerial pan | Far Head's shot. From the data: `mwg52ang` reached Far Head at 9:45 with "act shown" and the page was left about half a minute later; seat marks four times from 7:19 | Fixed (#1782; cause: a rider seated in a railway chair dropped the pull-out). Shipped on the orchestrator's own read; an independent review is still owed |
| P2 | 6. "I'm wondering what the game design is for the station before Far Ahead, where I have to get 24 rails. The cart only brings 16. So they're expecting I have to go back and get them, or not. Why not? I think we also should think about what the wagon is like. Is that supposed to be like a preview of what the train can offer, as far as the design goes?" | Q5's bill and what the depot cart is for. From the data (`mwg52ang`, which the plan did not have past Q4): at Q5's rack he took 24 logs and 16 rails in one visit (9:05 to 9:10) and Q5 was funded a second later, 1 min 38 s after Q4 was laid, so he did not go back; the other eight rails were not taken there. The plan says one shipment unloads 24 and 24 | Designed ([level-pacing-1114](level-pacing-1114.md), problem 3; its text on the cart's load does not match what he took); the rack's tag numbers in work |
| P3 | 7. Little guys walk backwards down the rail | Facing of the little guys on the line | In work |
| P3 | 8. The roof comes off when he is near the cab, not in it | The cab cutaway's trigger | Fixed (#1783). Independent review owed |
| P2 | 9. Little guys stand on the track while trains pass | Little guys and trains share the rail | In work |
| P3 | 10. "I wonder if the station at deposit boxes should either go away once that area is built, or they should act as shared resource drop boxes for when I have extra resources I want to put back into the system." | Finished stations' frames | Designed ([level-pacing-1114](level-pacing-1114.md), problem 4: frames pack up; yards stay the decided drop box, #1776); the pack-up in work; the yards (station-deposit build 1) not dispatched |
| P2 | 11. "It also feels like maybe at the beginning we get a lot of trains all at once, and maybe it's a little too much. And also the trains move really fast from the beginning. Maybe they should start off slower to give a more satisfying sense of progression later." | Train count and speed at unlock. From the data (`mwg5fhzi`): trains unlocked at 4:59, five calls and three rides in the next 3.5 min | Planned ([train-progression](train-progression.md), #1777); nothing built. Owner questions open (its three) |
| P1 | 12. The kiln's prompt says stone or wood when it needs set amounts of each | From the data (`mwg5rbci`): "Fill the kiln" shown 7 times, pressed 2, refused "Bring logs or stone" twice; a press 24 m from the kiln; filled 16 at 2:27 and 16 at 3:05; 4.1 times the predicted walk (the trace's third most confused node, 26.0). Two "Empty your back first" refusals on Shoulder a footing straight after. The same refusal was logged on 10 November | In work |
| P2 | 13. "it feels weird that the train then goes left-hand side instead of right-hand side towards the pier. And also, I feel like the lever that I pull on the right should... the station directions should be swapped at the quarry"; "The peer station is also confusing because it's one lane and I don't understand what the lever would do... it feels like it's on the wrong side." | Running side and request levers at the Quarry and the Pier. From the data: "Request stop: Quarry" shown 9 times and never pressed in `mwg5fhzi` and `mwg5rbci` | Planned ([running-side](running-side.md), #1779); the lever steps in work. Owner questions open: right-hand running, the lever rule, the Pier's platform |
| P1 | 14. "I don't seem to be able to request a stop when I'm sitting down" | Seated riders had no Request stop | Fixed (#1783: seated, Interact requests the stop and Jump stands you up). Independent review owed |
| P2 | 15. The car clips the engine on curved stops | Vehicle spacing on bends | Fixed (#1783); the Quarry bend's easing and the drawbar in work. Independent review owed |
| P1 | 16. "I ended up setting the footings on the rotunda, but it was really confusing. I didn't know, unless I had played before, that I had to do that. And then I didn't realize that after I set the two footings, I was supposed to set the rest of the footings back at the pier. There was no signaling for that"; "Do I have to bring all the footings to the pier by hand? I haven't been able to unlock the train engine I set the footings on this time around."; "Okay, I see where I got stuck. There is never any prompt to bring 8 rails to the cradle stall." | The stall, the cradle's eight rails and the wagon. From the data: the stall's two footings took about two minutes each by train (`mwg5rbci`); he then carried two more to the pier by hand (set at 1:54 and 5:08 in `mwg62675`) before finding the cradle; the cradle's rails went in 49 s into `mwg6bhy8`, the table turned 5 s later, and the remaining ten pier footings were set in 44 s (`mwg6h2u0`). First stall footing to the cradle fitted: about 12 min of wall time. The same stretch was a P1 on 10 November | Designed ([footings-signalling](footings-signalling.md), #1780); the cradle's bill and cues in work. Owner question open: should the pier refuse a hand-carried footing |
| P2 | 17. The garage looks cool; remove the try-on and install when the resources are there; a visual change when browsing wagons | The garage screen. From the data: "Look at the engine" shown 11 times and pressed 4; nothing was tried on | In work. "No try-on" is his answer; not asked again |
| P3 | 18. Floating dark rectangles by the table | Stray dark quads at the Roundhouse | Fixed in the yard track tidy, which is built and in review, not on main |
| P1 | 19. After "the crossing has begun" he did not know what to do and missed Station 7's resources: "the supports are there, but I don't know what to do next" | From the data (`mwg6h2u0`): the finale at 1:57, the next accepted action 3 min 22 s later (the tab was hidden for part of it), Q7 funded at 5:30 after walking 10.8 times the prediction | The cue is in work |
| P2 | 20. The request-stop signal stands next to the footing deposit, so the two interactions collide | From the data: while setting footings "Request stop" was shown 16 times and pressed 3 (`mwg6h2u0`) and shown 8 times, never pressed (`mwg6rndy`) | In work with the levers (note 13) |
| P2 | 21. A train curved onto another track with no crossover drawn, at the second pier | A join the track does not draw | To be drawn with the turnouts ([turnouts](turnouts.md)); not dispatched |
| P3 | 22. Why does only one train carry the footing wagon; do upgrades come over time? | A question about the wagon and the train ladder | Answered in chat; folded into the garage "choose what to add" brief, which is not started |
| P2 | 23. "Okay, well, that was weird. I just had a part where I set footings down and then everything slid over. That was very confusing." | The railhead moving on as bents are footed. From the data (`mwg6rndy`): fourteen footings in 110 s, a slide about every 16 s | Decided: a bespoke construction-apparatus animation ([gap-readability](gap-readability.md), #1785); in work |
| P2 | 24. "I didn't really get that the hook shot was to get back on the platform if I fell. It seemed like the hook shot at the end next to the drawbridge was supposed to get me to the drawbridge" | The hook ring at the take-off. From the data (`mwg7083m`): the island ring pulled at 2:16, 2:18 and 2:25, then the glide at 2:30 | Decided: the ring is not a forward route ([gap-readability](gap-readability.md)); in work |
| P3 | 25. "There should be like a similar smashing animation to the thing that lowers the drawbridge, similar to when we unlock the quarry" | A strike beat on lowering the leaf | Designed ([gap-readability](gap-readability.md), row 5); not dispatched |
| P1 | 26. "what's supposed to happen? Are the trains bringing the rails and logs? How does this work now that I'm at Ringworks?" and "I like the character dialogue." | Arriving on Ring Island. From the data (`mwg7083m`): the steel kit landed 1 min 57 s after the ring was joined; the first frame was fed 1 min 15 s after that; "Talk" shown 12 times, pressed 3 | Designed ([gap-readability](gap-readability.md)); not dispatched; a resident's line is drafted for his wording |
| P2 | 27. A track runs through a mountain wall on Ring Island and he clipped through it | Track and collider through rock | In work |
| P3 | 28. "I wasn't sure whether it was a train map that was flat at the ringworks." | The island's map table | Designed ([gap-readability](gap-readability.md)); not dispatched |
| P2 | 29. The seated car looks like a cargo car with spokes; he wants a proper little passenger car | The passenger car's model | In work |
| P2 | 30. "I think the great log tree position should change. It's weird that it's the first tree that you get to, but you can't do anything with it. So it gives weird feedback to the player." | From the data (`mwg4tvn7`): four presses with nothing in reach at 0:34 to 0:35, six seconds after Station 1's first logs | Designed ([level-pacing-1114](level-pacing-1114.md), problem 1); the blocked prompt in work; the move waits for his answer on the shorter haul and for v45 |
| P2 | 31. "As soon as I unlock the grapple hook, the player wants to go up to the top of the pinnacle, but there isn't the glider to get there, which feels like weird pacing." | From the data: the hook gained at 3:01 and the summit reached 34 s later (`mwg52ang`); the glider taken in the next session, two seconds after a second climb (`mwg5fhzi`) | Designed (the seal, [level-pacing-1114](level-pacing-1114.md), problem 2); in work. Owner question open: the seal, or wake the glider at the first summit pull |
| P3 | 32. The track layer is too fast when it switches to the second track | The track machine's speed on line 2 | In work |
| P1 | 33. A reload should return you to where you were, if recent | From the data: see "Twelve reloads" below; each reload cost him one to two minutes of travel back to the work | A plan is being written |
| P3 | 34. "yeah, we can raise the record ceiling. I don't know why we have these weird limitations for these things. We should only lock them down when we encounter performance issues" | Prefab catalogue ceilings | Done (#1784); [owner call](../agents/owner-calls.md#no-limits-ahead-of-a-measured-problem). Shipped on the orchestrator's own read |
| P2 | 35. "At what stage are we implementing the new town layout? It should be helpful to be able to plan from the top down, right?" "I wouldn't draw the radius by cost. It should just be well placed, and we should be able to modify terrain even if needed to achieve our vision." "I think it'll be easier to block out the spacing first and then fill in the details of the constructions later." | The Round and how it is planned | Owner calls recorded (#1767, #1769, #1770); the plan sheet tool is on main (#1768); the Round's blockout B1 is built and in proof ([home-flip](home-flip.md)), its Codex run stalled for 38 minutes at 09:38 UTC |

### From the data, not mentioned by him

| P | Finding | What the data shows | Status |
| --- | --- | --- | --- |
| P2 | 36. The trace's "wake is the most confused step" is not a finding about the wake | The wake row counts all nine sessions with one reach. Only `mwg4tvn7` woke the machine: 12 s after loading, Station 1 funded 31 s later, no stall. The row's score rose from 67.1 to 116.0 (refusals 4 to 26, ignored prompts 64 to 70) when the last session's final minutes were pulled, and those refusals were at High Gorge's barrier. So the row collects whatever falls outside a node's window: the start of every reloaded session and the end of the content. The orchestrator's note (67.1, 62 ignored prompts) read it as the camp's first minute | No job. Fix the trace so activity outside a node is its own row |
| P3 | 37. T1, T2, the double jump, the pack and the forge score high on Chop presses, not on being lost | `mwg4tvn7`: Chop shown 53 times and pressed 223; 47 presses with nothing in reach, nearly all 2 to 4 m from the next tree; wake to forge lit in 5 min 37 s, 98% of it walking, longest stop 10 s. The jump's 22.8 times the predicted walk has no detour behind it in the report: the second jump came 14 s after Station 3 was funded. Chop does not answer until he is in reach, and he presses ahead of it | No job. Reach or buffering of Chop is a feel question, not a signposting one |
| P1 | 38. Twelve reloads in 88 minutes | Thirteen page loads on thirteen builds between 08:07 and 09:34 UTC (#1768 to #1785; eighteen ships landed in that time). Eight of the nine route sessions ended "left the page" and the next began on the next build. Progress was kept each time (a footing shouldered in one session was set in the next), but he came back in the village: 1 min 50 s to the pier (`mwg62675`), 1 min 2 s (`mwg6h2u0`), 2 min 18 s to the first footing (`mwg6rndy`), 2 min 4 s (`mwg7083m`). Inferred from build and time; nothing marks why a page reloaded | With note 33's plan. Also a process question: how many ships land while he plays |
| P2 | 39. He pressed Request stop again and again after it was accepted | "Stop requested" refusals: 1 in `mwg5fhzi`, 18 in `mwg7083m` (16 on "to Stack railhead", pressed 18 times for 2 accepted). Nothing he can see says the stop is held | No job |
| P2 | 40. The steel works was never fed or lit | `mwg7083m`: "Feed the works" shown 8 times, never pressed; "lit the steel works" and "brought steel home" never marked, while all four sections to High Gorge were fed (rack to frame, 2.5 min apart) and High Gorge opened. Either the route does not need the works or it was passed unseen | To find out, with note 26 |
| P1 | 41. The built content ends on a refusal | `mwg7083m`: "Open the barrier" refused "Needs the powered pick" twice; the pick taken at 16:19; then "No line beyond yet" five times, and the page was left about 25 s later. Wake to the pick: about 77 min of wall time, about 63 min played | No job. "No line beyond yet" and "Needs the powered pick" are suspect copy for him |
| P2 | 42. Tumbles around trains and footings | 9 in `mwg5rbci` (the first at 2:00, at the quarry), 7 in `mwg62675` (the first a second before a footing was shouldered), 3 in `mwg7083m`, 1 each in `mwg52ang` and `mwg6rndy`. The report does not say what knocked him over. On 10 November both players came off moving trains east of the quarry halt | To find out |
| P3 | 43. One fall into the sea on the first glider climb | `mwg5fhzi`: the climb broke off after six pulls, water at 1:58, recovered in 4 s, the second climb went through | Nothing to do |
| P3 | 44. Long stands the recorder cannot explain | 62 s by the Roundhouse after the table turned (`mwg6bhy8`); 55 s at the railhead rack after the gap was footed (`mwg6rndy`, the trace's 64 s at the bents), which the gap plan reads as waiting on the wagon's next load. He was also typing notes, and with no recording the two cannot be told apart | No job |
| P3 | 45. "Hang the weight" pressed three times with no showing recorded | `mwg6rndy`: shown 0, pressed 3; in `mwg7083m` shown 2, pressed 1 | To find out (recorder or prompt) |
| P3 | 46. The garage's prompt is pressed just out of reach | Five presses with nothing in reach 2 m from "Look at the engine" (`mwg6bhy8`, `mwg6rndy`) | With note 17 |
| P3 | 47. "Take rails" at the camp shown three times, never pressed | `mwg4tvn7`, before the forge | Nothing to do |
| P3 | 48. Recorder gaps | No objective line before Ring Island; no mark for High Gorge opening, for the cart (never marked called or ridden, though note 6 is about it), or for a talk (Talk pressed 3 times, "talked to a resident" never marked); no mark for why a page reloaded; `mwg7lps0` (09:34) holds 7 s | No job |
| P3 | 49. Performance held | Every session p50 17 ms; p95 18 ms at the camp rising to 20 to 21 ms on Ring Island and High Gorge; no errors. The 24 s to 173 s frames are the hidden tab (13 to 14 min hidden in all); otherwise the worst frames were 491 ms at the camp and 251 ms at Far Head | Nothing to do |
| P3 | 50. Device and input | Reported as "iPad, Safari 27 Mac", 1210×748 at 1.2x: about 6,750 key presses, 160 mouse events and 62 touches, no gamepad. An iPad with a keyboard | Nothing to do |

### Liked

"I like the character dialogue." The garage "looks cool". From the data: no errors and a steady frame time across thirteen builds; the Works went quickly once the kiln was understood (breaker to the first footing shouldered in 3 min 1 s).

Rows 51 to 54, kept so nothing is dropped:

| P | Note | What it is | Status |
| --- | --- | --- | --- |
| P1 | 51. (from the trace) The kiln, 26.0, 4.1 times the predicted walk | Same as note 12 | In work with note 12 |
| P2 | 52. (from the trace) The stall, 15.8, 23 s idle, two refusals, seven ignored prompts | Same stretch as note 16 | With note 16 |
| P2 | 53. (from the trace) Q7, 10.8 times the predicted walk; the bents, 64 s idle | Same as notes 19 and 23, and row 44 | With notes 19 and 23 |
| P3 | 54. (from the trace) Q5 5.8 times, Q6 3.1 times and the steel kit 2.3 times the predicted walk; Q6 13 ignored prompts, the steel kit 15 | Wayfinding ratios with one session each. Q6's ignored prompts are passing Request stop levers; the steel kit's are "Feed the works" and Talk | No job; read again after the levers and the island's cues ship |

## No job yet

### Co-op and carrying

- [x] Great beam: carrying should be slower, and it should sit further from the station. Implemented and verified in [beam weight](beam-weight.md), branch-only; not shipped.
- [x] Find out whether two people can actually co-carry the beam, and make that the point. The great beam had no assist; the optional village seesaw is separate. [Beam weight](beam-weight.md) owns the implementation and proof.
- [x] Mark `did something together`: it never fired in 33 minutes of co-op.
- [x] Say when a shared unlock arrives: Grant earned the multi-axe and Matias got it with no idea how.
- [ ] Crates give each player different things, and Grant got something else where Matias got the pet. Confirm it's wanted. Two trinket shelves also puzzled Matias at first.

### Trains and cart

- [ ] Cart first, trains as its upgrade (leans yes). Starts after `little-guys-rails`.
- [ ] A clear pull to fit the boiler and start a second train: "I don't know why I want to set up another train".
- [ ] Subtler train timer sign.
- [ ] Pier kit surviving reloads is fixed. Still open: trains get only 3 min 19 s before the end of the run.
- [ ] Gate puzzles between stations: one switch moving two gates, "fun friction".

### Abilities and movement

- [ ] Spread abilities out: hook to glider was 49 s. Double jump later in the game.
- [x] A real double-jump challenge where you first get it, not one higher ledge. Implemented on `codex/double-jump-challenge`: eight broad warm stone blocks, dry recovery below, existing reward and unlock timing. [Plan and verification](double-jump-challenge.md); remains unticked until shipped or closed by the owner.
- [x] Hook as a swing: rejected (owner, 5 November). The hook stays a zip-line pull to its target, and the prototype was stopped with nothing built.
- [ ] Jump upgrades later that also benefit the glider, since double jump while gliding felt good.
- [ ] Glide on L1 or jump: open, because jump clashes with double jump.
- [ ] Device cinematic goes only to whoever takes it, and suggests you can glide to the island when you can't. Decide whether that's right. The first half is answered, as a reading, by "shared moments play for everyone" (decisions.md, 10 November): the card stays with the finder and the others get the flourish, as built.

### New water

- [x] Swimming: wave bobs crossed the physics swim threshold 24 times in a 16 s Place capture (33–216 ms gaps, never grounded), restarting `Jump_Start` up to 99% weight. Buddy presentation now bridges those gaps for 0.3 s, clearing immediately on ground or a rising swim jump; physics, water and presence are unchanged. Focused regression covers bobbing, real falls and swim jumps. Committed locally for review; not shipped, not tested on a device.
- [ ] Offshore straight turquoise edge: repaired locally on `codex/sea-colour-edge`, pending shipping/owner replay. The shallow opaque terrain mesh ended at its rectangular grid while bathymetry continued; the visible seabed now follows that smooth apron and sinks below optical visibility. Near-shore turquoise, Neutral and frozen sky retained.
- [ ] Swimming: when waves roll over the character, bits of the falling animation seem to play as it bobs (owner, 4 November, small nit). Not investigated yet; check whether surface bobbing briefly counts as airborne.

### Controls and feedback

- [x] Ping back on its own button beside drop.
- [x] Item reward: more anticipation and camera movement.
- [x] Chop also on square, not just R2.
- [ ] Dropped items: maybe expire on a long timer. Keep picking up the whole stack.
- [ ] Fade on respawn rather than a teleport (a far-off nit).
- [x] "N s! The long way round took you X s": cut the comparison banner (`eac11383`); crossing record and fanfare retained. [Verified crossing](../research/round-4-replay-preparation.md#focused-verification). Local replay branch, not pushed.

### Look

- [x] Train rust looks out of place: nothing else is textured that way, so make it a real material.
- [x] Blue shafts at spawn feel heavy-handed: cut or soften.
- [x] Festival Overalls read as a barrel; the blue thing on the front is unclear; "a lot of accessories".
- [x] Red flag on the hook course means nothing.
- [x] Blue concrete platforms don't fit the world's style yet. The platforms themselves stay visible from the start: seeing what you can't reach yet is good.
- [ ] Night: Matias likes the lamps but asked whether night cycles are staying.
- [ ] Build out what you see through the telescope: the peek at unreachable places is liked.

### Still to find out

- [ ] Town barely played: shop 7 s, house 5 s, museum never, `Talk` never pressed. Look at it properly next time.
- [ ] Blind first-time player: everything about what's obvious, especially with the objective marker gone.
- [x] Re-check `water=new` after the #775 cold-start fix: it stalled 37 s before it. On 4 November the owner saw no stall from their link; the phone session's worst frame was 230 ms.
- [ ] Physical gamepad and real touch dragging for the dismissal changes.
- [x] Grant's freeze video: received 4 November; it fits the logged instance overflow (see playtests.md). Not committed, as it's a private recording.
- [x] Matias's survey: too cumbersome, replaced on 4 November by the call routine in `.claude/skills/playtest-notes/SKILL.md`.
- [ ] Unclear from the audio: Grant first loaded "an old version" and needed Start fresh; "annoying separate pop-ups" just before starting.

## Liked: keep these

Co-op chopping. Little guys arriving. Rails delivered by train. Hook shot. Glider, including stop and reopen. Double jump while gliding, and outrunning the cart that way. Drop, with a whole stack picked back up. Walls animating away indoors. Rail wood texture. Pylons beside the rails. Little guys talking and rumours ("never once blinked"). Telescope. Fireworks at the end. Seamless reload. Gates for the train as an idea.
