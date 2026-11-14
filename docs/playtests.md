# Playtest notes

One short entry per session: date, who (first names), what was new, what was fun, what broke, and the answer to the current phase's question from PLAN.md.

Sessions whose summary says "Started: jump-in" began in a seeded private room (docs/game-design/dev-menu.md, "Jump in"), so read their beats as a segment, not a first run.

## 2026-10-28
- Who: Matias + friends
- New: PeerJS multiplayer on the live site.
- Notes: Connected and played; "looks like it's working".

## 2026-10-29
- Who: Matias
- New: the 12x island (493ef26): windmill farm on the eastern plain, lighthouse out on the east cape.
- Fun: "the procedural island is cool".
- Felt off: "still sort of empty"; the fun will be playing together in a smaller space. The lighthouse felt out of the way.
- After: land cut to about a third (23,300 m2) and the lighthouse moved to a hill in the middle, with paths out to the farm, the upland and home (dbcdaae).

## 2026-10-29 (phone)
- Who: Matias
- Felt off: the hotbar on mobile (portrait: over the logo and roster; the item name over the shovel chip; duplicate Shovel, Dig and Toss buttons). The Boogler's edge pointer is useful nearby but noise from across the island. The caves' look and the walk in and out need an audit.
- After: compact touch hotbar (filled slots only; a column on the right in portrait), duplicate buttons gone, Toss only when the main button would not throw; the pointer fades out from 35 m to 60 m; the cave rock now casts shadows, so the sun no longer lights the tunnels.

## 2026-11-01 (haul kit, solo)
- Who: Matias, solo, `?room=proto-haul&proto=haul`.
- New: the haul playtest kit (live tuning, checklist).
- Felt off: the tall, swaying Death Stranding-style stack. Wood should just sit on the character's back, not built so deliberately high, maybe stacked differently; it doesn't need to sway.
- After: carry becomes a compact back bundle with no sway; the jump spill goes too, since nothing warns you of it without the sway (decisions.md, Decided).

## 2026-11-01 (sound audit, listening pack)
- Who: Matias, solo, the listening pack (39 recorded game sounds).
- Kept: prompt pop, deny, haul count, honk, all mini-game sounds, the hut build, board whoosh, track machine.
- Cut: the groove loop (all takes), wagon/freight/stoke/grind/soapbox sounds, the opening-day soundscape.
- Tweak: hotbar tick (single tone or none, Fortnite), thunk, plaque flap, ping and ball boing (subtler), double-jump (subtler, Fortnite), pickup thock and magnet burst (Ratchet & Clank bolts), wood-age ambience (less white noise, more chill).
- Wave: undecided; keep it as it is until played.
- Idea: honks should form a chord on their own, and a honk doesn't have to be the same note every time.

## 2026-11-01 (iPad, first look)
- Who: Matias, solo, iPad Pro, Safari 27.
- Broke: boogle.club showed only the sky (no terrain, players) on Safari 27, with and without `?proto`. Cause: discarding the MSAA samples (memoryless attachments, new in Safari 27). Reverted; the island shows.
- Broke: Fullscreen on iPad: once in it, controls stopped working.
- Broke: mushrooms don't bounce; standing on one you're stuck, like an animation resetting.

## 2026-11-01 (iPad + controller)
- Who: Matias, solo.
- Broke: the watering can icon is upside down.
- Felt off: Interact is on B; he expects X / Square, and B prompts everywhere confused him. Dialogue with The Boogler needs a controller pass that scales to other NPCs.

## 2026-11-01 (iPad + Backbone controller)
- Who: Matias, solo, Backbone controller.
- Broke: the D-pad doesn't move between answers in a Boogler talk.
- Broke: launched from the Home Screen web app, touch works but the Backbone controller doesn't; an unrendered bar sits along the bottom of the screen.
- Felt off: the △ pat isn't in The Boogler's nature (roll back); the "✕ Say" hint was unclear.

## 2026-11-01 (iPad, HUD and arrival)
- Who: Matias, solo.
- Felt off: a "Porter" tag shows next to his character at the bottom (contribution tier on the haul chip).
- Felt off: every visit asks for name and colour again; with persistent progress coming, returning players should go straight in.

## 2026-11-01 (hero prototypes)
- Who: Matias, solo.
- `?proto=hero`, does running and jumping as this character feel good enough to keep it? Not yet: the walk/run animation isn't up to par, and the lean doesn't suit the character. Needs another pass on how it moves.
- `?proto=assets`, can you tell the Blender-made scaffold from the code-built one? Barely: really close; the plank's texture was the one giveaway. The hero's wave still looked off (likely the old wave: the new one deployed minutes earlier).

## 2026-11-01 (night)
- Who: Matias, solo.
- Felt off: night is too dark; it should still feel light, moonlit. The sun and moon don't need faces; a bit more real.
- After: a brighter moonlit night and faceless sun and moon (decisions.md, Decided, Look).

## 2026-11-01 (full run-through, `/?play`)
- Who: Matias, solo, the `?play` playlist. Verdicts reached the server on their own (first use).
- Yes: haul default ("quite good"; loved the magnet, but for pickups elsewhere and with no button); lay quick ("wonderful"); build ("absolutely love this kind of animation"); UI that answers ("a massive improvement"); board hop (loves the idea; presentation could improve); moves (but as later unlocks); look "high" (liked a toybox look from another session more than this toybox preset); era ("electric age?", but each age should look beautiful and there isn't enough depth yet to judge).
- Assets: could tell the Blender scaffold by the plank texture and bevel; both great, the animation fantastic.
- Can't tell: ride ("passably decent"; one-up it; research train riding in games); minis (hop liked most, golf wanted but not in this form, topple not engaging); layout (the island doesn't match the vision; lighthouse-line doesn't make sense for the train; redesign island and map once activities and locales are clearer).
- No: soapbox, twice ("needs to feel more like a suspensiony RC car"; bumper or trigger for throttle and brake); hero ("not yet", the other session's track).
- No verdict: the wagon's variants.
- Broke: a jump at the end of the laying animation.
- After: decisions in decisions.md (Decided, 1 November): quick laying, construction and UI that answers into the game, RC-car soapbox try, topple retired, layout parked, moves as unlocks, train-riding research; fast travel is open question 8.

## 2026-11-01 (second run-through)
- Who: Matias, solo, `/?play`; told to the director rather than through the bar, except hero.
- Wagon: the speed is fine and it's fine as plain transportation. Doesn't care for snatch, stoke or grind. Show and bench not mentioned.
- Soapbox (RC car): "pretty fun". Couldn't drive any more once down the hill, maybe a miss. Idea: races with these carts. The new camera looked nice; he didn't notice the near-camera dither.
- Ride: still fine. Board: poles fine to start with. Look: what we have is okay, may iterate.
- Hero: could see this rig working with a different model; the aerial animations didn't feel great (his other session's track).
- After: snatch, stoke and grind cut; the soapbox stays and keeps driving after the run (decisions.md, Decided).

## 2026-11-02 (the long crossing)
- Who: Matias, solo, `?proto=crossing`; told to the director.
- Vast (4 km at 50 m/s): "definitely something cool", but "more like a novelty that would wear off and get annoying later in the game".
- Express (1.2 km at 50 m/s): "a little too fast"; maybe it makes more sense for the end-game trains.
- Default (1.2 km at 20 m/s): "pretty well balanced", a good compromise. The time felt more like Vast.
- Wanted: press X or square to sit on the train. He wasn't falling off, but sitting would feel safe and more relaxing.
- Felt off: it's greybox, but the world needs to be a lot more beautiful, through rendering settings in the future.
- After: a crossing starts at about a minute, top speed goes to the end-game trains, and sitting is decided (decisions.md, Decided).

## 2026-11-02 (the line feeds the town)
- Who: Matias, solo, `?proto=net`; told to the director.
- Verdict: "not really sure still". Likes that "there's a lot of work happening from the rail network".
- Idea: junctions unlock parts of the network, but you still haul for each track segment; Death Stranding "had some interesting work there".
- Town: noticed the change for sure, though it's simple greybox and needs fleshing out in the real game.
- After: the lean is logged (decisions.md, Decided, open question 11); the next test keeps hauling, with the network making it easier.

## 2026-11-02 (the depot, `?proto=net&v=depot`)
- Who: Matias, solo; told to the director.
- Liked: the animation, and "the idea that the trains are substantively growing the town with the cargo that they get from the rail expansion". "I know that looked cool."
- Otherwise: "that's really it. I'm not totally sure beyond that." No clear answer on whether the haul feels good with the network helping.
- After: trains growing the town from cargo is the part that lands. The next test is a real place with a choice, not more hauling variants.

## 2026-11-02 (the crossing's sea pass)
- Who: Matias, solo, `?proto=crossing`, default; told to the director.
- "There's more to fix, but it's a good step for the water." Agreed with the director's list: steam puffs, a paler sky with no clouds, glitter that fades early, no shallows or foam at the piers, and greybox solid objects.
- After: the water direction holds; the rest waits for a later look pass.

## 2026-11-02 (the real place, `?proto=place`)
- Who: Matias, solo, iPad + controller; told to the director.
- Gut question: yes, wanted to connect it, "but it wasn't clear what connecting it would do from the beginning".
- Liked: the sense of scale, peaking on the far cliff after the bridge, seeing the island in the distance. The roundabout walk, then the train as a shortcut. Lots of trains running: "there was life happening". Seeing the cargo. Wanted to keep going, "just to explore more".
- Felt off: at the start, didn't know what to do, didn't see the path, didn't notice the survey stake. Hauling from right beside the ring: only 3 trips, so not grindy, but not satisfying and not intentional.
- Felt off: missed the earlier track layer, which physically dropped the pieces of track. Wants construction with physicality, like the scaffolding, not things scaling up.
- Ride home: "felt cool" but no reason to go back, and less of a moment than the Vast crossing. Maybe home's resources could be taken somewhere else, or going back could unlock something.
- Camps: not a real decision; got lost and picked the left one by accident. Doesn't have to stay.
- Town: couldn't tell which cargo changed what, beyond concrete buildings appearing. Wants more intentional, physical buildings, and a town that expands into places you can walk out to.
- Wanted: numbers on resources eventually, a bit of RPG progression "so you really feel it". Death Stranding's auto-pavers came up again: places you walk out to, where the rail comes up.
- Compared to `?proto=net`: bigger and probably an improvement, but not yet "really in a place".
- Broke: falling through the tracks; the train and track layer aren't solid in places. No stuck spots.
- After: decisions.md (Decided, 2 November); follow-up questions with the owner.

## 2026-11-02 (the fall, `?proto=fall`)
- Who: Matias, solo; told to the director.
- Gut: "the idea is very sound. I really enjoyed it."
- Felt off: the handle "oscillating way too fast" once the cart started (a bug: its rate changed against the clock).
- Felt off: hoped for more rail before falling off, though "I guess it should be fast".
- Wanted: the cart already moving while you're on the card, "in place, but perceptually ... traveling along the track", and Jump in is when you fall.
- Wondered whether the cart needs a handle at all, maybe "almost like a mine cart"; then "it doesn't have to be a full minecart. I like that the platform is flat enough that you can see the character jump and switch colors".
- Clutter: "we could probably remove the sleepers on the back"; "the planks on the cart with wheels makes perfect sense".
- Time in the air: first leaned to "the short version" in case it plays at every login, then: first time creating a character, "like 6 seconds or so, pretty long"; rejoining, "really fast" or "spawn in where they were".
- The title: "slightly lower in elevation so I get to see it a little bit longer before I hit it. Or have me fall from a higher height": 120 m became 150 m.
- Steering during the fall: "works totally fine".
- After: built that way: the world slides past during the card, Jump in runs the last stretch to the rail's end, and the handcar became a flat trolley with no handle.
## 2026-11-02 (the look test, `?proto=place&v=look&look=all`)
- Who: Matias, solo; told to the director.
- "It looks pretty great. Definitely better."
- After: it becomes the default in the next round of `?proto=place`; to-dos in [look-pass.md](plans/look-pass.md). Station feedback still to come.

## 2026-11-02 (the stations, `?proto=place`, second round)
- Who: Matias, solo, iPad + controller; answered on a feedback page.
- Gut question: yes, "it felt like my work became the track". "We're definitely closer" than last round.
- Liked: chop ("satisfying, keep it"); the logs stacking in the frame; the track layer's physicality, riding it and standing on it on purpose; the forge ("pretty awesome"). Line 2 felt like the network paying off. Would have kept playing to reach the far island. Best moments: chopping and completing the first rail segment.
- Felt off: the sign was heavy-handed, and a small prompt is enough. Waking the machine needs more drama. The first-line celebration barely registered. It dragged a little at station 3 and on the last line's carrying; "I need more motivation", no clear fix yet. Trestle walk: nice, not a highlight.
- Rails from home: felt like an errand. Carrying them physically was cool, but "why I was going back" is an open question; maybe carry capacity, maybe easier with friends.
- Town: had to go and look for what cargo built. The town's buildings feel loose beside the forge and need scaffolding. Numbers didn't mean much yet. The world still feels kind of dead, even compared to the starting island.
- Kept: the turntable, hopping villagers, axe and beacon. The beacon read as a giant floating crystal, hinting at a fantasy element, "which is cool".
- Broke: nothing literal, but walking through the town "like it's all billboard" feels weird.
- Unclear: the answer on continuing reads "I didn't want to keep going", then "I was interested in continuing"; taken as wanting to continue, to confirm.
- After: decisions.md (Decided, 2 November).

## 2026-11-02 (round 3, two players, `?proto=place&coop=1&fresh=1`)
- Who: Matias and Grant; one survey for both. More notes to come.
- First two minutes: knew what to do right away. Carrying: a bit of both, building and chore. Crates and little guys: "nice, but I would have carried on anyway". Together: about the same as alone; one of them did most of it. Riding: nice. Look and sound: rough but promising. Would come back "once there is more to it".
- Best: "the sounds and watching things get built. seeing a path between two areas open up which was previously tedious was satisfying."
- Felt off: after the first couple of deliveries "i was kinda ready for the complexity to increase, or for there to be some additional friction"; cutting one tree and collecting boxes each time "didnt feel meaningfully different".
- Felt off: trains came too soon. "everything kind of ramped up too quickly, and suddenly the small amount of frction i was feeling was resolved"; "i would have liked just having a path to an area"; "being able to walk across the shortcut was already a big help. Too soon." Wished for "some control over the train schedule".
- Broke: the guiding UI at the bottom is always on and obscures the game. The hat floats above the head. You can walk through some stacks. Little guys float in front of the deposit site. The pet frantically keeps up beside the train, clipping through it.

Raw brainstorm from the same session, typed while Matias and Grant talked. Not decisions; the owner says not to over-index on them, and to organise and ask more first:

- Minigames: progression; helpful; wonder. Each area should have cosmetics to get (Grant). The hat is motivating. Prizes appear in the hub if you missed them.
- Movement: more abilities, with double jump, glide and rail grind already prototyped; hook shots and bobble walls; item- and ability-gated locations, hidden secrets, "good game itch". Curios are movement abilities, claimed for fully connecting an island, which open new paths on earlier islands. Hook shot targets up the middle tower unlock the glide; glide should feel like Breath of the Wild. The first island teaches the base mechanics in a Great Plateau way.
- Trains: the key function is carrying cargo; then you can ride wherever. Speed gives a reason to go between visited areas. Riding could boost like Burnout, faster with upgrades. "Felt at the whims of if a train happened to show up"; waiting for one was unintuitive.
- Incremental: "it has to be a bit of a slog at the start. Should be doing something enjoyable but it just takes a bit too long"; chopping does feel good. Earning money, a score, the new ride earning money, having to get back to the city.
- Co-op: co-carrying; resource management mixed with Human Fall Flat elements; chained-together goofy physics.
- The Boogler: everyone's talking about him; a reveal; rescue him and bring him back to the hub; the prophet, the entrepreneur, really into trains; we're doing his project for him; he starts charging; at the end you can decide to kill him; an epilogue rebirth arc.
- Buildings: should serve a purpose and have interiors, like a Pokemon town, with the surprise of talking to people inside ("I just moved in here for the Jobs"). Shops, museums, offices; a reward for a building existing, like seeing something you couldn't before.
- Crystals: dispensed, so they're diegetic and everyone can see where they are; a crystal card slides into a machine and it pops one out; not lit if you already have it.
- Notes on this round: the moment of discovery was nice; the train should show it's waking up without saying so; the sun doesn't go away; what is the platform?; point to the next island; take off the character's ear bumps and rosy cheeks.
- Tools: dev tools for making levels by hand.


## 2026-11-03 (round 4, two players, the default URL)
- Who: Matias (Mac, Safari, gamepad) and Grant (touch; the browser reports iPhone at 951x669). Whole run together, about 35 minutes: 03:40 to 04:14 UTC. From the Granola transcript and the session data (`npm run playtest -- mw1l43s5-eyp2cnmq`, `mw1l0y9o-1aphq1mf`, `mw1kjao8-f20clw4j`, `mw1klpci-xva7fxio`, crash `mw1kz9dd-y00icjb2`). Matias's survey is still to come; Grant declined it. Neither is a blind player: both know the route and the design.
- Gut question (hungry for a better way, and did finding one feel great?): yes, twice, and one miss. 8 minutes of walking for logs after the first path, then the little guys arrive: "Whoa!", "Wow, thanks guys." Rails delivered by train at the end: "it was all provided. That's great." The miss: Line 2 stations 4 and 5, running 150 to 250 m back to the rack with nothing to relieve it, which Grant called tedious and a bummer.
- Against round 3: "together about the same as alone" became "this makes you happy you're not playing on your own". "Trains too soon, no friction" became trains after 31 minutes and real friction. Trains now come so late they get only 3 min 19 s before the end.
- Best: co-op chopping. The hook shot ("fuck yeah"). The glider, stop and reopen. Double jump while gliding, unplanned and liked, and it could scale with later jump upgrades. "I never thought this would get that deep into platforming. This is sick." Drop, and picking up a whole stack. Walls that animate away indoors. The telescope as a peek at what you can't reach yet. The fireworks. Seamless reload. Jump is the toy: Matias pressed it 2,374 times and double jumped 404 times.

### Broke
- **Freeze, one time:** the 3D view stopped completely while the page kept working. Grant's 13 s video, from about 50 s after the error, shows the world pixel-identical apart from the joystick and on-screen markers, and the session kept running at about 60 fps. A failed draw takes the whole frame with it, so the screen holds its last good frame. (The first write-up said the camera kept moving; the video shows it didn't.) The session logged `GPUValidationError ... strideCount(25) ... bufferSize(1536)`: a 24-slot instance buffer asked to draw 25, about 10 s before Grant reported it and 6 s after taking rails. Reloading cleared it and the same build then ran 21 minutes clean. Cause not found yet.
- **Launched while riding the cart:** at (1235, -72) Matias left the cart at up to 98 m/s and travelled 376 m in 6 s into the sea. Cause not looked at yet.
- **Trains with two players:** riders thrown off repeatedly, 12 rides for Matias and 7 for Grant in under 4 minutes, many lasting under a second. Both came off together at 37:41 on the session clock, at the same spot, so some of this is not just desync. Grant's "train is pushing me back". Matias stopped seeing Grant's cart while Grant rode it, with Grant walking in place.
- **Not shown to the other player:** a carried beam, boiler or rails; a partner's pet.
- **Get unstuck** put Matias on the old island at (14, 26). He pressed `Back up the path` there, which sent him to the start of the map, about 170 m from where he'd been. It calls the shared `backToSpawn` (`src/features/pause.ts:227`).
- **Gates sit 90 degrees off:** Grant's report holds in code. `src/proto/place/tech.ts:436` adds a quarter turn, which lays the slab along the track.
- **Cinematics and item cards close on any movement.** Dismissed by accident at least four times, so neither player really saw the town reveal. The town-unlock camera cancels the same way.
- **Whistle for the cart** does nothing unless the far end needs something.
- **"Stand on a platform" flickers:** on and off 14 times in 41 s for Grant, with `train called` firing 9 times. Doorways may do the same (5 shop entries in 7 s), though Matias may have been testing the walls.
- **Pinned by the Camp halt:** Matias stood stuck at (1010, 30, -144) for about 16 s, starting just as Grant fitted the boiler and the trains unlocked. This is why he pressed Get unstuck. Fixing that button doesn't fix this.
- **Hitch on first use:** Matias felt one on first taking rails, and the data agrees: 677 ms within 4 s of `took rails`, his worst frame of the session. Other spikes: 513 ms and 406 ms just after gaining the glider, 411 ms in Grant's freeze session.
- **Start fresh split them into separate rooms** (known). They needed an invite link, which cost about 2 minutes.
- **Small:** a square shadow under the character (both saw it). Double-jump rings off the feet. Rails floating where the line leaves the mountain. Z-fighting on the platform between the canyon rails and the tower. The junction snaps the cart. Pack floats off the body and its load sits outside it. Happy Clam has no way back but the water. Boxes on the train can be clipped through and should be solid enough to stand on. Some wall parts disappear oddly in the indoor cutaway. A wobble on some jump surfaces. Can't board the track layer. The reload prompt claims you must reload to stay with friends, and that's not true.

### Calls they raised (not decided)
Owner's answers on the objective marker, trees, rails and the cart: [decisions.md](decisions.md), "2026-11-03, after round 4". The tree answer differs from this list: tougher trees may stay, as long as any tree can be attempted.
- **Remove the objective marker:** both want it gone, and the world should guide you. But Grant was still following it at the end ("that's my objective") and asked why he'd want a second train, so it's what carried that stretch.
- **Remove orange bands; every tree can be chopped:** both agree. No axe tiers. Tension: Grant also said the long walk to the bands makes you feel the pain the little guys then relieve, and that's the gut question. Needs tuning, not just removal.
- **Cut or soften the blue shafts at spawn:** both find them heavy-handed.
- **Little guys bring rails too** (or one mixed shipment) by station 4, which needs somewhere to drop them. Strongest pacing note of the session.
- **Cart, then trains:** "We unlocked trains but we already had a train." Grant's fix: the first vehicle is clearly a little cart and trains upgrade it. Trains also need a clear pull: "it goes the other way" only landed after the boiler was fitted. The timer sign needs to be subtler.
- **Spread abilities out:** hook to glider was 49 s; double jump to hook was 10 minutes. Matias wants double jump later; Grant accepts it for the slice. Grant wants a real double-jump challenge where you first get it, not one higher ledge.
- **Hook as a swing** (Just Cause, Spider-Man), releasing into the glider. An experiment worth a prototype.
- **Gate puzzles between stations:** one switch moving two gates, "fun friction". Grant's idea, both like it.
- **Great beam:** carrying it should be slower and it should sit further from the station, since right now you don't feel the slowness. Whether two people can actually co-carry it is still unknown: they asked, the partner couldn't see it, and `did something together` never fired.
- **Item reward moment:** Matias liked the Zelda-style animation but wants more anticipation and camera movement.
- **Shared unlocks arrive unexplained:** Grant earned the multi-axe and Matias got it with no idea how.
- **Device cinematic goes only to whoever takes it:** Matias got the island shot, Grant didn't. This is by design (`gainTech` in `tech.ts`), but neither knew. The shot also suggests you can glide to the island, and you can't, which Grant liked as a tease.
- **Crates give each player different things:** Grant got something else where Matias got the pet. Worth confirming that's wanted.
- **Night:** Matias likes the lamps but asked whether night cycles are staying.
- **Ping comes back** on its own button beside drop.
- **Item cards need a button press,** so a new item has weight.
- **"N s! The long way round took you X s."** Nobody understood it. It fires the first time you cross in one go, here 21 minutes after the bridge opened and from a cart, comparing against a walk from 25 minutes earlier (`src/proto/place/index.ts:246`). It reminded Grant of Burnout Paradise's street times: cut it, or make it real route times.
- **Kept, despite the Granola summary:** the hook platforms stay visible from the start. Matias asked; Grant argued that seeing what you can't reach yet is good, and Matias came round. Matias's other point stands: the blue concrete doesn't fit the world's style yet.
- **Looks:** train rust looks out of place, so make it a real material. Festival Overalls read as a barrel. Red flag on the hook course meant nothing to either. Dropped items might expire on a long timer. Chop could also be on square. Glide on L1 or jump is open (jump clashes with double jump). Fade on respawn, a far-off nit.

### Barely tried
- Town: Matias at the end: didn't really look at the rumours or the town. Shop 7 s, house 5 s, the museum never, nothing tried on, `Talk` shown 11 times and pressed 0. One rumour did stop Grant mid-sentence ("never once blinked").
- Performance was fine: frame p50 17 ms on both, p95 18 on the Mac and 20 on Grant's. Worst stalls 677 ms and 497 ms.
- Unclear from the audio: Grant first loaded "an old version" and needed Start fresh; Matias mentioned annoying separate pop-ups just before starting.
- Data gaps: `did something together` never marked in 33 minutes of co-op; `chop refused` counts include held presses. Round 4 sessions show no `water=new`, so that run was on the normal sea and sky. The separate `water=new` session (04:32 UTC) stalled 37 s and predates the #775 cold-start fix; that fix is not yet re-checked by a person.

## 2026-11-04 (owner solo on iPhone, the default URL)

Not the replay: Grant couldn't play, so this doesn't answer the two-player questions. First real iPhone play of the new water. Full notes in the [tracker](plans/round-4-notes.md#solo-play-4-november-owner-on-iphone-not-yet-triaged). Finished the run, pier laid at 41:27 on the session clock, including backgrounded time.

- **Works on a device:** loaded fine; the avatar fix held. Performance stepped down from 2x to 1.2x from 18:11.
- **Broke:** soft-lock from shouldering the great trunk at Station 1. One GPU error on returning from the background.
- **Loved:** building the forge, the town zoom-out, the NPCs, the museum.

## 2026-11-06 (evening, all of today's content)
- Who: Matias, solo, desktop Safari (session mw5y0cl1, build e439b72a: R1a, line 2 part 1, Fresh palette, readable glows).
- Played: 17 min, plus 8 min with the tab hidden; reached the quarry gate, the end of what's built. About 4.8 km walked; 406 chop presses on 61 chop prompts; 17 bonks.
- Felt off:
  - The conductor's-hat reward particles, ability pickups and log piles still read dark.
  - The second power-up gave no reveal at all.
  - Dropped piles were invisible depending on camera angle.
  - Rolled back while carrying after the pause menu and a hidden tab.
  - The track layer jumped ahead and back.
  - The forge's counter is hidden by its walls, its pour box clips the wall, it didn't look finished, and its rails weren't visible though takeable.
  - Wood platforms clip the track in places; too much smoke when laying ends; the double jump lost its sparkle; the gantry beam is too long.
  - The great beam chain is unclear: 40 logs, then the axe chest, then the great tree. A second axe so soon feels redundant, and the beam carry animation looks odd.
- Liked: the new track-piece laying animation.
- Data: frame p50 17 ms, p95 25 ms on the Mac. Dynamic resolution dropped from 2x to 1.2x at 6 min and stayed there. Slowest CPU sections: railway update 5.3 ms, render 4.5 ms, gifts 1.8 ms. The production railway marks no beats, so "Did" stays empty. A Windows Chrome 117 visitor couldn't create a WebGPU adapter.
- After: fixes are running or queued (dark glows and piles, reveal, tab-resume rollback and track-layer jump, forge visuals, clipping platforms, laying smoke, double-jump sparkle, a great-beam clarity and carry design, smaller track chunks after R1b).

## 2026-11-07 (owner playtest, "tot")

- **Who / source:** Matias, written notes in chat, captured while the Claude orchestrator was unavailable. "tot" is the owner's build/location label; exact URL, build, device, session IDs and other players were not supplied. No transcript or telemetry was matched; these are owner observations, not independently reproduced findings.
- **What was new / fun / phase question:** not reported in this batch of bug notes; no new verdict on the current carrying/progression question.
- **Broke / requested follow-up:**
  - Small square shadows still appear on the ground in some places.
  - Track-layer seats look weird at different "attitudes"; visually inspect them. Exact angles/elevations were not specified.
  - Double-jump particles read as a circle; the owner wants a motion particle effect like the axe's magic trail.
  - Hookshot platforms clip / z-fight. Investigate alignment or a general solution, since this recurs frequently.
  - Picking up rails showed nothing on the backpack.
  - Station 4 resources were invisible on the stand, and deposits were blocked until the gate opened; that timing felt weird.
  - The track-layer arm sometimes extended unrealistically at station 4 (written "station 4l"). Slowing the animation is acceptable if needed to make the motion make sense; it is a possible remedy, not a diagnosed cause.
  - Station 4's arch had no top part after opening.
- **Handoff:** all eight reports remain open in the [tracker](plans/round-4-notes.md#owner-playtest-7-november-tot-not-yet-triaged). Earlier shipped-fix records do not establish that these replay findings are resolved. This entry captures feedback only; no fixes or visual verification were performed.

## 2026-11-08 (quick solo, before the Needle Bell playtest)
- Who: Matias, solo, iPad with Magic Keyboard, live build (world v20, main at #1190).
- New: the hook shot, B4 (sea gate, Q5, Far Head), name dice, rickety cart intro, world version label.
- Felt off: dark square patches on the grass near the dock where you arrive. Had to hold E to wake the track layer (it is meant to be one press). The track layer seats still have a back that clips: remove the back and keep the stool. A persistent "touch to look around" prompt stays up after switching to the Magic Keyboard.
- Wants: a little guy at the town entrance you can talk to, who tells you to follow the path or that they need help getting the rail running; goofy.
- After: one Codex job each (dock-patches, wake-press, seat-stool, ipad-look-hint, town-greeter).

## 2026-11-08 (solo to Far Head, iPad)
- Who: Matias, solo, iPad with Magic Keyboard, sessions mw8mn9bg and mw8n0kbk (about 16 min active, no errors, 60 fps).
- Main issues (owner): visibility and understanding of the cart mechanic, visibility of the side resources (the depot rack and shelf), and confusion over the switch gating.
- Data: Pull pressed 18 times on 4 showings (the sea switch before Q4, no feedback); the rack's Pick up shown 26 times, pressed 4 (the rack and cart were invisible on the iPad while their prompts worked); 41 drops (dropping and re-picking rails to make them register); Wake it up pressed 3 for 3 showings. Reached Far Head along the line; didn't notice any rockets (they fire only when Q5 finishes laying). The live build marks no railway beats, so the data can't show progress.
- Calls: fill a gated stretch before its switch (decisions.md); carried rails show on the pack frame; the summit handle's rotation looked wrong.
- After: Codex jobs depot-rack-carry, gated-fill, sea-switch-early, wake-press; the puzzle-order brainstorm.

## 2026-11-09 (owner, desktop, Q2 to the Works)
- Who: Matias, solo, Mac desktop in Safari 27 at 2712×2110, live build (world v22, main at #1279), sessions mw9papxp, mw9pg5a5, mw9prlct, mw9qd5qq and mw9qq9te (about 39 min, no errors). He sent notes while playing; all are ranked in [the tracker](plans/round-4-notes.md#owner-session-9-november-desktop-live-build-ranked).
- Got to: stations 2 to 6, the hook, both gates, Far Head, the pier, the boiler and trains, the breaker and both seams. Stopped there: nothing told him to fill the kiln.
- Order he actually played: station 6 funded and laid by hand, then the pier, then the boiler and the breaker off the same pedestal a second apart, the first seam struck carrying the boiler, then the boiler fitted and trains on. The design's order (boiler, trains, the train brings station 6's kit) was never demanded.
- Felt off (his words in the tracker): the pinnacle lever's cutscene cut short by input; no cutscene or rockets seen at the rail's end; "Call cart to forge" has no point (cut); hauling rails to the pier station was "the longest grind"; the boiler smoking before pickup and no prompt to take it; the breaker's purpose unclear; the quarry gate's top gone and its chain in mid-air; a stray slab and the train inside the track layer at the Pier halt; stools and the pet on the train; the engine's look and z-fighting; Home's two stations and out-of-scale rails.
- Liked: the double jump's new glints (without the blue ring).
- Data: Take rails pressed 6 times; Pick up shown 54, pressed 12; 13 presses with nothing in reach; nine falls into water and recoveries in 3.5 s at (1000, 28); frame time p50 17 ms and p95 18 ms except at the pier head (p95 30–55 ms, resolution scale down to 1.2x, slow to recover).
- Calls: cinematics are uninterruptible bar one highlighted skip; cut the cart handle; the boiler goes on a rope like the great log; a reset starts players at the opening; one coherent station at Home; rank every note P1 to P3 (decisions.md, owner-calls).
- After: fixes running for the cinematics, the boiler prompt and smoke, the cart handle, the Pier halt, the quarry gate, the double-jump ring and the reset start; the 24-rail cart shipped; the rest queued by rank in the orchestrator state.

## 2026-11-09 (owner and a friend, co-op, world v23)
- Who: Matias on a Mac desktop (Safari 27, session mw9srqnz) and a friend new to the game on an iPhone Air (Safari 27 iOS, sessions mw9srryp, then mw9tccmz and mw9tfbu8 after a reload), from a fresh v23 world, 21:52 to about 22:13 UTC. Notes ranked in [the tracker](plans/round-4-notes.md#owner-session-9-november-desktop-live-build-ranked).
- Got to: the whole route from the wake to Far Head in 13 min 17 s (T1 at 3:07, the forge at 6:47, the hook at 8:58, station 5 laid at 13:17), in step on both devices. Nobody took the glider (it woke on the summit while they were at Far Head) or the boiler.
- Stopped at: Far Head, hand-feeding station 6. Matias: "the flow bottleneck for the game is coming back for the 40 rails at far ahead, as I don't see the cart turning and the only option is to walk all the way back." Back at the forge he took rails, then pressed twice at the boiler with "nothing in reach": its prompt is hidden while you carry anything.
- Broke on the phone: a 27 s freeze at Far Head at 22:07:30 UTC and a reload; then four reconnects in two minutes, one 7 s frame, and a black sky with dark shading and a band at the bottom of the screen (his photo, 22:12 UTC). The desktop was steady throughout (p95 never above 30 ms, no gaps).
- Data: friend 214 chops and no presses with nothing in reach; Matias 158 chops and 11 presses with nothing in reach. Refusals: `rail.forgeTake` "not yet" four times for the friend at 8:38 (rails before the forge allowed them), one `rail.deposit`, one `rail.cartCall`. Draw calls above 450 in 18 of the phone's 176 samples and 12 of the desktop's 199, around Far Head and when trains or piles are in view.
- Calls made during or after: queue a cheaper, better-fitting water and revisit toon shading; the boiler fit is the first upgrade choice; Home becomes one terminus station (layout B) with an engine big enough to show a little guy driving; tight tests per change and the full loop once a day.
- After: the iPhone freeze and black sky join the pier performance job as P1; station 6's sign and rule and the boiler prompt are P1 in the boiler-first-choice plan.

## 2026-11-10 (owner and Daniel, co-op, v24: the boiler on the rope and the Works, part 2)
- Who: Matias on an iPad (Safari 27, gamepad, as "matias") and Daniel on a Mac desktop (Firefox 159, as "twipleset"), 05:12 to about 06:08 UTC in `boogle`, from a fresh v24 world through to the end of the content. Seven sessions, three builds: `mwa8hbv9` and Daniel's `mwa8ha6c`, `mwa8lo3p` (#1387, `df7c8527`); `mwa8zhlg` and `mwa8zdun` (#1388's deploy, `0e7ad0fd`); `mwa9y7pw` and `mwa9yvzk` (#1389, `f249fbed`). Digests in `.look/playtest/` (not committed). No Granola call for this session; the owner's notes came afterwards in writing. All ranked in [the tracker](plans/round-4-notes.md#owner-co-op-session-10-november-ipad-and-desktop-v24-ranked).
- Timeline (UTC, from the data): the machine woke at 05:19:00 after 6.5 min in town; T3 laid 05:23:31; the #1388 deploy reloaded both pages at 05:26:35 with progress kept; forge lit 05:27:28; Q4 laid 05:32:55, Far Head 05:37:17; boiler taken 05:39:00, fitted 05:39:58; Q6 and the pier 05:43:01; breaker 05:45:12, the stall seam 05:45:25, the quarry seam 05:46:14, kiln lit 05:47:53; stall footings set 05:49:52 and 05:52:00; the #1389 reload at 05:53:37 (iPad) and 05:54:07 (desktop); the cradle's rails 05:54:34, cradle footings 05:58:46 and 05:58:47, the table sent the wagon out 05:58:53; the twelve pier footings 06:00:56 to 06:02:32. Wake to the last footing: 43.5 min.
- The boiler haul: Daniel shouldered it (five "Empty your back first" refusals first, then he dropped his logs), Matias helped; 58 s from shoulder to fit, about 180 m, no drop seen (this build has no drop mark), and the fit landed on the first press. Matias pressed Help carry nine times in those 58 s: the help kept letting go by itself.
- The Works signposting worked: the stall seam 13 s after the breaker, the quarry seam 49 s after that, the kiln lit 1 min 39 s later (one "Bring logs or stone" refusal). Breaker to lit kiln: 2 min 41 s.
- Footings: the two stall trips took 1:42 and 1:43, both Matias alone and on foot after the train didn't take him; the cradle trips 2:55 (Matias, including 1 min 20 s walking back after coming off an outbound train) and 2:08 (Daniel); the twelve pier footings about 8 s each. All sixteen the kiln casts were set. After the twelfth, Matias waited about 2.5 min at the pier head; no finale was seen.
- Owner, afterwards (his words in the tracker): didn't know what to do at the stall and cradle, or why to turn the table; the turntable was janky; the stall roof was wrong; the forge still looks half finished; a train didn't stop for him at a station; carrying the footings was the most pain, made longer by trains that run to the end of the line; the train stopped delivering footings and he never got the rockets toward Ring Island; he wasn't sure everyone got the gate cutscene. "Other than that, the feedback was pretty positive."
- Daniel (relayed by the owner): a talk with Pip got stuck and he had to reload because he couldn't exit the pointer. The data fits: 86 s stood still after Pip's line, then a reload at 05:15:53.
- Broke (from the data): both came off moving trains east of the quarry halt, Matias with a footing and Daniel into the sea, where he swam 54 s; Daniel's Firefox failed to compile two shaders (one of them the sea's) on every load, threw once a session from the audio (`cancelAndHoldAtTime` is missing in Firefox), and had 4.1 s and 7.3 s frames after the #1389 reload.
- The #1389 server restart: both tabs lost the server at 05:45:46 and were back in 13 s, mid-Works, with nothing refused; the reload onto the new build came 8 min later. The iPad otherwise held p50 17 ms and p95 18 ms in every session and logged no errors; past its first load (the 28 s stall, then a 2.9 s frame) its worst frames were 680 ms as T3 was laid and 203 ms after that.
- Recorder marks: three falls into water, all Daniel's, each with one recovery (one per dip, as #1385 intended).
- Calls: shared moments play for everyone ([decisions](decisions.md#decided), read from a message cut off mid-sentence).


## 2026-11-14 (owner solo, the whole built route: wake to High Gorge and the powered pick)
- Who: Matias, solo, an iPad with a keyboard (Safari 27, 1210×748 at 1.2x; about 6,750 key presses, 62 touches, no gamepad), `boogle` on the live game, world v44, 08:07 to about 09:35 UTC. No call recording: he typed or dictated notes to the orchestrator while playing, and each note's design doc records his words. Thirteen page loads on thirteen builds (#1768 to #1785). Nine sessions carry the route: `mwg4tvn7` (camp, wake to the proper axe), `mwg52ang` (Q1 to Far Head, the hook), `mwg5fhzi` (glider, boiler, trains, Q6, the pier), `mwg5rbci` (breaker, kiln, the stall's footings), `mwg62675` (two footings to the pier by hand), `mwg6bhy8` (cradle, table), `mwg6h2u0` (the crossing, Q7), `mwg6rndy` (the gap), `mwg7083m` (the leaf, Ring Island, four sections to High Gorge, the powered pick). Four short ones carry no beat: `mwg4ht6p`, `mwg5qiye`, `mwg6fc83`, `mwg7lps0`. Digests are in `.look/playtest/` and `.look/owner/` (not committed); session data is untrusted browser-sent text. All 54 notes are ranked in [the tracker](plans/round-4-notes.md#owner-solo-session-14-november-ipad-with-a-keyboard-the-whole-built-route-ranked): 10 P1, 25 P2, 19 P3.
- New since the 10 November co-op session (from the orchestrator state, not from him): the v44 world with no lead tab (seats and The Boogler server-owned), Home's layout B, and the route past the pier's twelfth footing: the gap and the leaf, Ring Island, the four sections to High Gorge and the powered pick.
- Got to (measured): the machine woke 12 s into the first session; the forge lit 5 min 37 s later; Far Head at about 08:33; trains at about 08:38; the stall's first footing about 08:47; the cradle and table about 08:59; the crossing footed about 09:04; the gap footed about 09:15; Ring Island joined about 09:20; High Gorge open about 09:32; the powered pick about 09:33. Wake to the pick: about 77 min of wall time, about 63 min played, 13 to 14 min with the tab hidden. The last thing he did was press "Open the barrier" five times against "No line beyond yet".
- Fun (spoken): "I like the character dialogue" on Ring Island; the garage "looks cool".
- Felt off (spoken, his words in the tracker): the footings sequence ("There is never any prompt to bring 8 rails to the cradle stall"); not knowing what came after the crossing's finale, or how Ring Island is supplied; the railhead sliding on under him; the hook ring at the take-off reading as the way across; no Request stop while seated; the kiln's prompt; the running side and the levers at the Quarry and the Pier; too many trains, too fast, from the start; the great tree being the first tree and doing nothing; the summit with no glider; the Roundhouse yard's rails and size; the forge; the curio shelf in the station; little guys on the line; the seated car's look; a track through a rock wall on Ring Island; a reload not returning him to where he was.
- Measured, and not in his notes: twelve reloads in 88 minutes, each on a new build, with progress kept but one to two minutes of travel back to the work after each; "Stop requested" refused 19 times (he kept pressing an accepted request); "Feed the works" shown 8 times and never pressed, and the steel works never lit, with High Gorge opened all the same; tumbles in five sessions (9, 7, 3, 1, 1) around trains and footings; two pier footings carried by hand before the cradle was found, then ten set in 44 s once the wagon ran. p50 17 ms and p95 18 to 21 ms throughout, no errors.
- Inference, not measurement: that the reloads were the deploys' (build and time match; nothing marks the cause); that the 55 s and 62 s stands were him typing notes or waiting on the wagon (no recording to tell).
- Where the data disagrees with the notes: the trace ranks the wake as the most confused step (67.1 when first pulled, 116.0 with the last session complete), but only one session woke the machine and it did so in 12 s; that row collects the start of every reloaded session and the end of the content, so it is a fault in the trace, not a finding about the camp. T1, T2 and the double jump score high on 47 Chop presses just out of reach, not on being lost. At Q5 he took 16 rails from the rack and the station was funded a second later: he did not go back, and the level-pacing plan's "one shipment unloads 24 and 24" does not match what he took.
- Phase question (solo and co-op alongside each other; is the action worth doing for the project it builds): no verdict was spoken. The orchestrator's reading: solo, the whole built route is finishable in about an hour, and the stops were all signposting (the kiln, the cradle's rails, after the finale, arriving on the island), not labour: no note today says a haul was too long. A co-op answer needs a second player.
- Calls made during the session (recorded in [owner calls](agents/owner-calls.md) and the plans): place for the look, not the cost, and terrain may change; block out spacing first; the Roundhouse is a real rotunda; no limits ahead of a measured problem; no try-on in the garage; the railhead's move is a bespoke construction animation; the hook ring is not a forward route.
- After: fixed and on main: the curio shelf (#1771, #1778), Far Head's shot for a seated rider (#1782), Request stop while seated, the cab roof and vehicle spacing on bends (#1783), the catalogue ceilings (#1784). Plans written: turnouts (#1773), the rotunda (#1774, #1775), level pacing (#1776), train progression (#1777), running side (#1779), footings signalling (#1780), gap readability (#1785). #1771, #1782, #1783 and #1784 shipped on the orchestrator's own read, without the independent review the stamp asks for; that review is still owed. Nothing fixed today has been replayed by him.
