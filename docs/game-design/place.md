# 6.28 Prototype: a real place (`?proto=place`)

*A throwaway greybox for [find-the-fun](../plans/find-the-fun.md), step 9: "Did carrying materials out to the track feel like
building something, or like a chore?" The first round (step 8, plant a stake, haul to a ring, trestle scaling up) got a yes
on wanting to connect the place but no clear sense of what connecting would do, a missed path and a missed stake
([playtests](../playtests.md), 2 November). This round replaces it, and the decision log's rules bind it: nothing consumed
and vanishing, construction that drops into place, what looks solid is solid, more directed than Death Stranding.
Serves DESIGN.md 1 (Toys before chores), 7 (Telegraph everything) and 9 (Leave something for the next visitor). Layout:
Threefold Reach (`.look/previz/home-redesign/`, section 3). Research: [construction you can watch](../research/construction-you-can-watch.md),
[harvest feel](../research/harvest-feel.md), [big walk level design](../research/big-walk-level-design.md). The stations are
Death Stranding's auto-pavers; the look of the frame, feeder and cradle follows `.look/previz/visible-materials/`. Without the
flag nothing loads: `src/features/proto-place.ts` imports `src/proto/place/` only with it, in the room `proto-place`.*

## The place

An island about 440 m across, 1 km east of today's, in the crossing's sea. A Y-shaped gorge, with walls about 16-30 m high
and a river at the bottom, splits it into three lobes: the village (west, 18 m), the timber camp (north ridge, 30 m) and the
quarry (east table, 24 m). Needle Bell, a leaning 105 m spire, stands where the gorge forks. Two low footbridges cross the
river. Across the sea to the north-east, about a kilometre out and out of reach, stands a dark island with a broken ring on it
and a bright shard in the ring's middle.

## The run

1. **Goal up front.** At spawn a big sign says the track layer is stranded at the timber camp, follow the path and wake it,
   then build the line home. In view: a wide, strong path, a half-built forge (foundations and bare scaffolding), a crane, a
   rail stub ending toward the gorge. One line of objective on the HUD changes at each beat, and an orange beacon stands over
   the next thing. Signposts at the fork and the turns, small arrows along the way.
2. **Walk and wake.** The path winds north, down the wall, over a footbridge under where the trestle will go, up and round
   the ridge: about 78 s, with three gold finds and a rock arch. The machine sits at the camp end of line 1, its rack of 12 rails
   showing, a loaded train waiting behind it. Interact: **Wake the track layer**.
3. **Chop.** Trees with an orange band, in a grove by station 1 and one by the rim. Interact: **Chop**. The swing starts on the
   press, the axe meets the bark 60 ms later, the tree shakes, chips fly and 4 logs arc straight to your back. Three strokes
   fell a tree, leaving a stump and the trunk where it fell. Your back holds 12.
4. **Stations.** Three on line 1, each an open frame with amber posts, a log on its board and a short roller feeder. Walk up
   to the frame and your logs land in it one by one with a thunk: 24 logs, so about two trips. Station 1 is at the camp and
   lays to the near rim; station 2 is at the near rim and lays across the gorge; station 3 is on the far rim, reached by walking
   out over the trestle you just built with timber on your back, and lays into the village's stub.
5. **Laying.** A full frame's logs roll along the feeder into the machine's open cradle; then it drives at 5 m/s, dropping
   sleepers one at a time off its front, rails in pairs behind them, with thud, clank and dust. The cradle and the rack visibly
   empty. Over the gorge, bents drop in ahead of it, legs first, then caps, stringers and a plank deck 3.6 m wide. You can ride it or
   stand on the fresh track: the track's collider grows in 2 m slabs as the machine passes, and legs are solid.
6. **First line through.** Whistle, fanfare, fireworks; the village's people jump and their number goes up. You keep control. The
   machine runs on to the turntable at line 1's end, and the train leaves the camp with its 8 crates. One train, one track.
7. **The forge.** Crates land on a dock by the platform. The crane lifts each one straight into the scaffold and that crate's
   pieces drop in: frame, walls, roof, chimney. A board over it reads like "Forge: timber 9/12". The HUD also shows the shared
   numbers: the train's capacity (8 crates) and the village's people.
8. **Home.** When the forge is done its chimney lights and its mouth glows, and rails pour out one by one onto a rack. If you're
   away, the objective says rails are ready at home and riding home is how you get them. Trains after the forge fill the
   village's timber heap, and the town's existing step-ups answer that (6 and 16 crates).
9. **Line 2.** The turntable swings the machine round to face the quarry. **Take rails** at the rack, **Take timber** at the heap
   (a crate opens into 6 logs), then carry them to line 2's stations: 4 rails and 8 logs, 8 and 8, 8 and 4. Rails go to the machine's
   rack and logs into its cradle the same way. The carry gets longer as the line goes out, across the stem of the gorge.
10. **The quarry.** When the line arrives, a train runs from the village, loads stone, and brings it to the yard; the town's stone
    step-ups (6 and 16 crates) answer. The last objective points at the island across the sea.

Falling is harmless: in the water, Interact reads **Back up the path**. **The panel** has Start over, Skip the walk, Skip chop and
carry (fills the current station), Skip to the forge and Skip to line 2.

## Departures from the brief

The machine doesn't come back by train: line 1 ends at the village, so it's already there, and a turntable hands it to line 2.
Its cradle isn't solid, unlike the rest of it: a second shape on the flatbed's body made you fall through the deck (see below).

## Measured

Scripted at 1180 x 820 with real input (walking, no sprint, one scripted press per chop), on a Mac, in seconds:

| Beat | Time |
|---|---|
| Walk to the machine | 78 |
| Station 1: chop and carry; its stretch laid | 22; 15 |
| Station 2: chop and carry; the trestle laid | 19; 11 |
| Station 3: chop and carry over the trestle; its stretch laid | 42; 6.5 |
| Line 1 open at | 200 |
| To the platform, ride out and back (19.5 each way) | 69 |
| Forge lit, machine turned, at | 280 |
| Line 2, station 1: rails, timber, carry; laid | 10; 7 |
| Line 2, station 2 (two trips); laid | 34; 17 |
| Line 2, station 3; laid | 36; 13 |
| Line 2 open at | 398 |
| First stone at the village | 437 (7 min 18 s) |

No beat runs over 90 s; the walk is the longest. Someone reading signs and looking around will take longer.

Standing tests (real physics): dropped on the track at 9 points from far rim to near rim, walked the deck from end to end, stood
on a train's flatbed, the machine's deck and its loco, all held.

## How it's built

Local, all of it, in localStorage per room (`boogle-place-v2`). Your back's log count is kept in the prototype and drawn by the
game's bundle through `backSeam` (`src/features/haul-stack.ts`), with rails strapped upright behind it, so chopping and unloading
never wait on the host. Pieces in the air are one instanced pool (`pieces.ts`, `send`); pieces joining a build fall from above
(`dropSet`), never scaled. The town's step-ups and the camps waking still rise the old way.

Each line's track is one instanced set sorted by where the machine drops each piece; 2 m slab colliders join as it passes. The
machine is the wagon's look on two kinematic platforms; it advances in the physics step, and trains are the same kind of car
with a timetable. A flatbed with a compound shape lost its deck collider in testing, so the flatbed stays a single box.

The land is one height function on a 2 m grid, drawn as one faceted mesh and collided as one heightfield. From the crossing: the
sea, sky and far plane (`src/proto/crossing/sea.ts`, `sky.ts`), the speed put back past the 237 m soft wall, the player's CCD
off. Numbers: `TUNE` in `src/proto/place/layout.ts`. Look evals: `dev/look/evals/place.ts`.
