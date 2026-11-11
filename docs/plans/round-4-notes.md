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
