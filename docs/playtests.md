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
