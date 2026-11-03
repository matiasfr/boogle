# Playtest notes

One short entry per session: date, who (first names), what was new, what was fun, what broke, and the answer to the current phase's question from PLAN.md.

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
- After: carry becomes a compact back bundle with no sway; the jump spill goes too, since nothing warns you of it without the sway (boogle-2.md, Decided).

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
- After: a brighter moonlit night and faceless sun and moon (boogle-2.md, Decided, Look).

## 2026-11-01 (full run-through, `/?play`)
- Who: Matias, solo, the `?play` playlist. Verdicts reached the server on their own (first use).
- Yes: haul default ("quite good"; loved the magnet, but for pickups elsewhere and with no button); lay quick ("wonderful"); build ("absolutely love this kind of animation"); UI that answers ("a massive improvement"); board hop (loves the idea; presentation could improve); moves (but as later unlocks); look "high" (liked a toybox look from another session more than this toybox preset); era ("electric age?", but each age should look beautiful and there isn't enough depth yet to judge).
- Assets: could tell the Blender scaffold by the plank texture and bevel; both great, the animation fantastic.
- Can't tell: ride ("passably decent"; one-up it; research train riding in games); minis (hop liked most, golf wanted but not in this form, topple not engaging); layout (the island doesn't match the vision; lighthouse-line doesn't make sense for the train; redesign island and map once activities and locales are clearer).
- No: soapbox, twice ("needs to feel more like a suspensiony RC car"; bumper or trigger for throttle and brake); hero ("not yet", the other session's track).
- No verdict: the wagon's variants.
- Broke: a jump at the end of the laying animation.
- After: decisions in boogle-2.md (Decided, 1 November): quick laying, construction and UI that answers into the game, RC-car soapbox try, topple retired, layout parked, moves as unlocks, train-riding research; fast travel is open question 8.

## 2026-11-01 (second run-through)
- Who: Matias, solo, `/?play`; told to the director rather than through the bar, except hero.
- Wagon: the speed is fine and it's fine as plain transportation. Doesn't care for snatch, stoke or grind. Show and bench not mentioned.
- Soapbox (RC car): "pretty fun". Couldn't drive any more once down the hill, maybe a miss. Idea: races with these carts. The new camera looked nice; he didn't notice the near-camera dither.
- Ride: still fine. Board: poles fine to start with. Look: what we have is okay, may iterate.
- Hero: could see this rig working with a different model; the aerial animations didn't feel great (his other session's track).
- After: snatch, stoke and grind cut; the soapbox stays and keeps driving after the run (boogle-2.md, Decided).

## 2026-11-02 (the long crossing)
- Who: Matias, solo, `?proto=crossing`; told to the director.
- Vast (4 km at 50 m/s): "definitely something cool", but "more like a novelty that would wear off and get annoying later in the game".
- Express (1.2 km at 50 m/s): "a little too fast"; maybe it makes more sense for the end-game trains.
- Default (1.2 km at 20 m/s): "pretty well balanced", a good compromise. The time felt more like Vast.
- Wanted: press X or square to sit on the train. He wasn't falling off, but sitting would feel safe and more relaxing.
- Felt off: it's greybox, but the world needs to be a lot more beautiful, through rendering settings in the future.
- After: a crossing starts at about a minute, top speed goes to the end-game trains, and sitting is decided (boogle-2.md, Decided).

## 2026-11-02 (the line feeds the town)
- Who: Matias, solo, `?proto=net`; told to the director.
- Verdict: "not really sure still". Likes that "there's a lot of work happening from the rail network".
- Idea: junctions unlock parts of the network, but you still haul for each track segment; Death Stranding "had some interesting work there".
- Town: noticed the change for sure, though it's simple greybox and needs fleshing out in the real game.
- After: the lean is logged (boogle-2.md, Decided, open question 11); the next test keeps hauling, with the network making it easier.

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
- After: boogle-2.md (Decided, 2 November); follow-up questions with the owner.

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
- After: boogle-2.md (Decided, 2 November).

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

