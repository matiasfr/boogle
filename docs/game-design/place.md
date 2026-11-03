# 6.28 Prototype: a real place (`?proto=place`)

*A throwaway greybox for [find-the-fun](../plans/find-the-fun.md), step 10: "Did the crates and the little guys give you a reason to keep carrying?" Round 2's job landed ("it felt like my work became the track", [playtests](../playtests.md), 2 November), so its chop, carry, stacking and laying are unchanged; this round adds motivation and life around them. The decision log's rules bind it: nothing consumed and vanishing, construction that drops into place, what looks solid is solid, a small prompt is direction enough, first gifts are cosmetic.
Serves DESIGN.md 1 (Toys before chores), 7 (Telegraph everything) and 9 (Leave something for the next visitor). Layout:
Threefold Reach (`.look/previz/home-redesign/`, section 3). Research: [construction you can watch](../research/construction-you-can-watch.md),
[harvest feel](../research/harvest-feel.md), [big walk level design](../research/big-walk-level-design.md), [maximal rewards](../research/maximal-rewards.md) (Gift Freight), [growing towns](../research/growing-towns.md). The stations are
Death Stranding's auto-pavers; the look of the frame, feeder and cradle follows `.look/previz/visible-materials/`; the little guys take the stubby proportions of Castle Story's Bricktrons, as our own character. Without the
flag nothing loads: `src/features/proto-place.ts` imports `src/proto/place/` only with it, in the room `proto-place`.*

## The place

An island about 440 m across, 1 km east of today's, in the crossing's sea. A Y-shaped gorge, with walls about 16-30 m high
and a river at the bottom, splits it into three lobes: the village (west, 18 m), the timber camp (north ridge, 30 m) and the
quarry (east table, 24 m). Needle Bell, a leaning 105 m spire, stands where the gorge forks. Two low footbridges cross the
river. Across the sea to the north-east, about a kilometre out and out of reach, stands a dark island with a broken ring on it
and a bright shard in the ring's middle.

## The run

1. **Goal up front, lightly.** No big sign: one line of objective on the HUD changes at each beat, and an orange beacon, a floating crystal on a beam, stands over the next thing. In view at spawn: a wide, strong path, a half-built forge with little guys hammering on its poles, a crane, a rail stub, and the **curio shelf**: shapes under dust sheets and a row of dull crystals, so you can see there are things to come. A small signpost at the only fork.
2. **Walk and wake.** The path winds north, down the wall, over a footbridge under where the trestle will go, up and round the ridge: about 78 s, with gold finds, crystals and a rock arch. The machine sits at the camp end of line 1, rusty and dusty, its rack of 12 rails showing, a loaded train waiting behind it, and empty mounts on both engines: a bare flagpole, a chimney collar, a bell bracket, posts for a string. Interact: **Wake the track layer**. About 3 s, and you keep control: it shudders, rust and dust shake off and the paint comes back, the boiler coughs faster and catches, a big burst of steam, the headlamps, a whistle. The camp's little guys cheer.
3. **Chop.** Trees with an orange band, in a grove by station 1 and one by the rim. Interact: **Chop**. The swing starts on the press, the axe meets the bark 60 ms later, the tree shakes, chips fly and 4 logs arc straight to your back. Three strokes fell a tree, leaving a stump and the trunk where it fell. Your back holds 12.
4. **Stations.** Three on line 1, each an open frame with amber posts, a log on its board and a short roller feeder, and two helpers waving by it. Walk up to the frame and your logs land in it one by one with a thunk: 24 logs, so about two trips. Station 1 is at the camp and lays to the near rim; station 2 is at the near rim and lays across the gorge; station 3 is on the far rim, reached by walking out over the trestle you just built with timber on your back, and lays into the village's stub.
5. **Laying.** A full frame's logs roll along the feeder into the machine's open cradle; then it drives at 5 m/s, dropping sleepers one at a time off its front, rails in pairs behind them, with thud, clank and dust, the helpers riding along. The cradle and the rack visibly empty. Over the gorge, bents drop in ahead of it, legs first, then caps, stringers and a plank deck 3.6 m wide. You can ride it or stand on the fresh track: the track's collider grows in 2 m slabs as the machine passes, and legs are solid.
6. **A crate per stretch.** When a stretch is done, the machine hands down a gold-banded crate beside where it stopped, on the way to the next frame. Interact (**Open the crate**) or walk into it: it rattles and bursts, with boards, confetti, a flash and a shaft of light, and the gift rises out of it, turning, under its name, for about 2.5 s. Then it flies to where you'll see it, and on the shelf at the station its sheet comes off. Hat, flag and stowaway come first, in that order; the other three are a surprise from chimney crown, bunting, bell, lantern and scarf. Six crates, eight possible gifts and two shapes that never come out this run, so some stay covered. No duplicates, no currency, no effect on play. Engine ornaments go on the machine and both trains; the hat and scarf on you; the stowaway hops along behind you.
7. **First line through.** You can't miss it. A long whistle, wherever you stand. Rockets over the village and the gorge. The village pours out of its doors and runs to the track, hopping. A banner. And the one camera move in the run: about 3 s, out and up over the commons, showing the whole line across the gorge, with the first train pulling out of the camp; any input ends it at once, and you keep control throughout. The camp starts building its sawmill; the machine runs on to the turntable at line 1's end. One train, one track. Line 2 gets a smaller version: no camera, but rockets at both ends, whistles, a banner, everyone cheering.
8. **The forge.** You ride in on the mid flatbed (the crates ride up front), and the forge stands just past where the train stops, on the same side as the platform, filling the view as you pull in. Crates thump onto a dock beside the platform. The crane lifts each one straight into the scaffold and that crate's pieces drop in: frame, walls, roof, chimney. A board over it reads like "Forge: timber 7/12". The HUD also shows the shared numbers: the train's capacity (8 crates) and the village's people.
9. **Home.** When the forge is done its chimney lights, its mouth glows, its poles come down, and rails pour out one by one onto a rack. If you're away, the objective says rails are ready at home and riding home is how you get them. Trains after the forge fill the village's timber heap, and the town answers (at 6 and 16 crates): a crate sails from the heap to the plot, and each new building rises on poles, its pieces dropping in, 8-10 s for a house and longer for the landmark, little guys hammering. Then the poles come down.
10. **Line 2.** The turntable swings the machine round to face the quarry. **Take rails** at the rack, **Take timber** at the heap (a crate opens into 6 logs), then carry them to line 2's stations: 4 rails and 8 logs, 8 and 8, 8 and 4. Rails go to the machine's rack and logs into its cradle the same way. The carry gets longer as the line goes out, across the stem of the gorge.
11. **The quarry.** When the line arrives, a train runs from the village, loads stone, and brings it to the yard; the stone street answers (6 and 16 crates), its keep last, along the way in. The last objective points at the island across the sea.

Along the way, seven **crystals** are tucked at spots worth stopping at, the same blue as the far island's shard: a lookout, an arch, a river bank, the top of the ridge, behind the old kiln, by the old cart, the far table. Walk near one and it comes to you, slowly then all at once, with a chime, and a stub on the shelf's bottom row lights up. They do nothing yet.

**The little guys** are life, not labour: nothing they do moves the run on. Round and stubby, in six colours, carrying logs, hammering at scaffolds, riding the machine and the trains' cab roofs, strolling, waving and following you for a few seconds (at most two at a time), and hopping at milestones. The village's number is how many you can see, up to 28, with someone new coming out of a cottage door each time it rises; three more at each camp, two helpers, four riders. They walk round buildings and have no colliders.

**The town and camps are solid**: every building has a collider, its walls from when its frame is up. Standing in a plot when they go up moves you to the nearest edge.

**The decks hold you.** Stop at the edge of a train's or the machine's deck and you're eased a few centimetres back inside, so standing never takes you off, moving or not. Push the stick off the side or jump and you leave as ever; there are no railings.

Falling is harmless: in the water, Interact reads **Back up the path**. **The panel** has Start over, Skip the walk, Skip chop and carry (fills the current station), Skip to the forge and Skip to line 2.

## Departures from the brief

The machine doesn't come back by train: line 1 ends at the village, so it's already there, and a turntable hands it to line 2.
Its cradle isn't solid, unlike the rest of it: a second shape on the flatbed's body made you fall through the deck (see below).
Trees still have no colliders (greybox), and buildings are solid blocks you can't go inside.

## Measured

Scripted at 1180 x 820 with real input (walking, no sprint, one scripted press per chop, each crate opened and watched), on a Mac, in seconds. `shot=play` in the evals.

| Beat | Time |
|---|---|
| Walk to the machine | 77.5 |
| Waking it | 3.6 |
| Station 1: chop and carry; its stretch laid | 22; 15 |
| Walk to the crate and open it | 17.5 |
| Station 2: chop and carry, crate included; the trestle laid | 27; 11 |
| Station 3: chop and carry over the trestle; its stretch laid | 43.5; 6.4 |
| Line 1 open at | 212 |
| The last crate, by the platform | 12.5 |
| Ride out and back (19.5 each way) | 48 |
| Line 2, station 1: rails, timber, carry; laid | 13; 6 |
| Line 2, station 2 (two trips, a crate); laid | 48; 16 |
| Line 2, station 3; laid | 38; 12 |
| The last crate; first stone at the village | 13.5; 25.5 |
| Whole run, as measured | 556.5 |

98 s of that whole run are the script walking off the deck and waiting out a full train cycle, twice round, which a person wouldn't: without them, about 458 s (7 min 40 s), against 437 s last round. Most of the difference is watching crates. No beat runs over 90 s; the walk is the longest. Someone reading and looking around will take longer.

Cost (`npm run counts`, its fixed pose): 224 draws, 82 shadow draws and 128 programs last round with this look on; 217, 77 and 145 now. With `&look=off`: 189, 62 and 100 last round; 182, 57 and 106 now. At touch settings (1024 shadow map, 0.8x; `shot=cost`), frames seen from this round: 290 draws and 531k triangles at spawn at the start, 364 and 558k in a finished village with everything given and 38 little guys, 214 and 552k on the stone street. Real iPad frame rate is unmeasured.

## How it's built

Local, all of it, in localStorage per room (`boogle-place-v3`, a new key so an old save can't break it). Your back's log count is kept in the prototype and drawn by the
game's bundle through `backSeam` (`src/features/haul-stack.ts`), with rails strapped upright behind it, so chopping and unloading
never wait on the host. Pieces in the air are one instanced pool (`pieces.ts`, `send`); pieces joining a build fall from above
(`dropSet`), never scaled. Every building but the forge shares one instanced mesh (`sites.ts`): its plan is the forge's, in a function, so a whole town is one draw and one shadow draw.

Each line's track is one instanced set sorted by where the machine drops each piece; 2 m slab colliders join as it passes. The
machine is the kit's look on two kinematic platforms; it advances in the physics step, and trains are the same kind of car
with a timetable. A flatbed with a compound shape lost its deck collider in testing, so the flatbed stays a single box.

The land is one height function on a 2 m grid, drawn as one faceted mesh and collided as one heightfield. From the crossing: the
sea, sky and far plane (`src/proto/crossing/sea.ts`, `sky.ts`), the speed put back past the 237 m soft wall, the player's CCD
off. Numbers: `TUNE` and the plots (`TOWN`) in `src/proto/place/layout.ts`. Moments and the pull-out: `celebrate.ts`, through the existing `camConstraints` seam. Gifts, shelf and mounts: `gifts.ts`. Little guys: `folk.ts`. Crystals: `crystals.ts`. Look evals: `dev/look/evals/place.ts` and `place-act.ts`.

The look (`src/proto/place/look.ts`) is the default. It overrides `tod`. `&look=off` gives the old look; `&look=ground,light,contact,kit,mats,gtao` gives single layers (`all`, the default, leaves `gtao` out). To-dos: [look-pass.md](../plans/look-pass.md).
