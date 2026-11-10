> **Status: decided (2026-11-10); layout greyboxed, build 1 waits for v26.** Brought in line with the 10 November
> rulings ([world-blockout](../plans/world-blockout.md#rulings-10-november), conflicts 1–4 and 11) and the generic-lines
> sequencing ([generic-lines](../plans/generic-lines.md#sequencing-v26-alone-ring-island-as-v27)): build 1 is
> `WORLD_NS` v27, build 2 v28. The near view is walkable behind `?ring=greybox` (no sim); see
> [The layout, greyboxed](#the-layout-greyboxed-10-november). The design review below keeps its 6 m-bow numbers as
> history; the rulings section supersedes them.

Seed (owner, 10 November): "it should fit into the overall progression of the game though, do we know what happens at
ring island?", then "Yes, brainstorm it". During the panel: "The townspeople there should have some weird religion
about the..." (cut off), "well its not ordinary because it's perfect and floatin right?" and "It should be funny and
goofy though". Full panel (design, systems, creative; two rounds, round 2 superseding round 1). The owner has handed
design calls to the orchestrator ([owner calls](../agents/owner-calls.md), "The orchestrator makes design calls too",
#1396), so this brief records decisions, each logged in [agent-calls](../agent-calls.md) and dated in
[decisions](../decisions.md). He may overrule any of them.

# Ring Island: the Meet

## Pitch

Line 2 runs out from the Split-rock pier over your bents and bows down at 4%, from 24.3 m at the pier head to about
14.7 m at the railhead and 7.5 m at the island halt, so the ring climbs the sky as you ride. Ahead, the island folk's
own orange steel half-crossing, **the Pilgrims' Way**, reaches out with its own double track to an island halt on the
shore and ends in a counterweighted drawbridge leaf, raised like a hand held up toward Home. You
foot the last bents out to meet it. One player glides the gap, braces the leaf from the island side, the jib hangs
footings on its counterweight, and the leaf drops onto your bents. Anyone strikes the gold rivet with the breaker, and
the whole room gets the shot, which runs into the first train over their steel. The island is a works town with a
goofy, daylight religion about the perfect floating shard in the ring: somebody must always be looking up at it, or it
might fall. Its first export home is the longer boiler (line 2, 20 → 25 m/s), which finally makes your train as big as
the prophecy's mural. Serves **7. Telegraph everything** (the raised leaf is visible from Home long before you reach
it) and **8. Enjoyable alone and together** (glider and railhead face each other across the gap; the shot is the
room's). It bends nothing.

It fits the progression as the destination the crossing has pointed at since minute one: the glider earned at Home
gets its one main-line use here ([glider placement](glider-placement.md)), the breaker from Split-rock strikes the
rivet, the footing wagon and jib do the counterweight, and the works' steel feeds the upgrade path the owner already
set (the longer boiler is an upgrade, 10 November).

## Gut question

**"When the leaf came down onto your bents and you struck the rivet, did it feel like you'd arrived somewhere?"**

## Best suggestions

1. **The Meet is the arrival** (creative, with systems' bascule and design's brace). Their half-crossing with laid
   track halves the open sea, so your side needs about 7 more bents (14 footings, the Split-rock pier's count) and no
   second laying job. Raise and brace (gate-puzzles' verb) happens once, at the place the whole crossing points to.
   - The order: foot out to the gap; one player glides across on the glider already earned, landing on their stub;
     on the island side they brace the raised leaf; the wagon brings **2–4 counterweight footings** to the railhead
     and the jib hangs them on the leaf's bracket (no hand carry); the leaf drops onto your bents; anyone strikes the
     gold rivet with the breaker, which latches it and opens the island halt.
   - **Nobody is stranded:** a hook ring on the last bent pulls you back, and the island's shore is swimmable.
   - **The shot:** everyone in the room gets it, merged with the first ride's start (one shot, not two). A friend who
     missed it gets it once on their own first crossing.
   - **Telegraph:** until it's lowered, the raised leaf shows from Home, in the Split-rock finale's last frame and in
     the telescope.
   - Tension: design wanted the train-first Meet with the glide only as an optional peek. Decided for the glide: it
     keeps the glider's one main-line use, makes the gap a two-ended co-op stage, and the hook and shore remove the
     strand risk design raised.
2. **The bow** (systems finding 1, creative's read; re-profiled by ruling 2, 10 November). The line comes down at the
   4% ruling grade from the first bent all the way to the island halt: 24.3 m at the pier head and the first bent,
   about 19.6 m at bent 6, about 14.7 m at the railhead (bent 13, 260 m out) and about 7.5 m at the island halt (about
   440 m, on the shore at about (1414, −820)). Low track over the sea rides better, the ring grows as you descend, and
   the folk call it a bow: "Good manners." The six built bents widen to the 7.6 m double deck and come down to the
   bow in generic lines' step 3, before v26, so they change once; build 1 adds the seven new bents, the folk's stub
   and the leaf, all on the double deck with both tracks laid together (ruling 11 as amended by generic lines). It
   changes a finished view, so take stills before and after, and re-shoot the Split-rock finale pull-out on the new
   heights.
3. **The Church of the Very Perfect Shard** (creative's core, design's pieces; working name, the owner's to rename).
   See [The religion](#the-religion) below. It is the area's payoff, and the shard stays unexplained.
4. **Steel comes home as the longer boiler first** (all three panels). Line 2 grows from 743 m to about 1.2 km, so
   20 → 25 m/s repays the ride the island just made longer, and its meshes are built
   ([engine previz](../plans/engine-previz.md)). The bigger orange cradle is the second steel pick. Tension: design
   offered boiler and cradle as a choice for the first fit; decided boiler outright, since v25 already fixes the
   wagon's pain and the cradle reads as a stronger second.
5. **Buoys lifted at each stretch** (design 1, systems' mapping). The orange buoys in view since the start were the
   folk's Way markers. Each one comes out, with a splash and a bow from the crane's little guy, when the stretch it
   marks is laid (a buoy marks a stretch's end, not a bent: their 62 m pitch doesn't match the bents' 20 m).
6. **A railhead halt that moves** (design 1, systems). Line 2's end stop keeps one index while its position comes from
   the catalog (`RAILHEAD_CM[laid]`), with v25's request lever riding along. The wagon delivers to wherever the line
   ends. On v26's data-driven lines this is line 2's row in `RAIL_LINES` (`src/sim/railway-lines.ts`) with the ring
   halts appended in v27.
   - **The island halt is the first turning loop** (generic lines, "Turnbacks"; the double-track decision). Past the
     halt, line 2 swings round a 40 m-radius loop and comes back facing Home, so the first train's "reverse pull-out"
     is the loop. The halt is also **the junction** (ruling 3): the stack line and the bay trestle start there, and each
     branch's platform faces its destination's landmark.
7. **Threading the ring, then the shard's one reaction** (design, creative; build 2). The ring's hole sits above the
   island's main cone, so the train can thread it only through a lowered saddle authored into the near and far LODs.
   That changes the horizon the owner has seen since minute one, so it needs a still first. When the first train
   threads it, the shard brightens once with one glassy chime: the only thing it ever does.

## The religion

**The shard** is a perfect octahedron floating in the ring's middle with a slow bob and turn. No chip, no noise in the
mesh. Nobody knows why it floats, and the game never says. It is the same blue as Home's crystals (a rhyme, not an
answer), and it is not the Original Island, not The Boogler's doing, and not a key.

**The core rule: someone must always be looking up at it, or it might fall.**
- **The staring rota.** Three to five little guys stand in the square, heads back, in shifts. Hooter's shift whistle
  swaps the lookers. Stand still near them and look up, and the nearest one nods solemnly at you.
- **Hard hats "in case anyone blinks".** Religious and practical at once, and both reasons are the same reason.
- **The Great Blink.** The ring's missing piece fell off when the whole rota blinked at once. A joke, not lore: no
  ruin, no quest.
- **"Only the Shard may be perfect."** Every rivet on the island is set one notch crooked on purpose, and every
  building leans a little.
- **No pointing at the Shard.** A painted sign at the halt; the folk point at everything with their elbows.
- **The drop hammer never stops.** It's part of keeping the shard up, which is why the works kept hammering out steel
  it couldn't ship.
- **Missed rivets are offerings.** The riveting gang tosses each glowing rivet up toward the shard before the catch.
  When one plinks into the sea, the gang nods: "Accepted."
- **The prophecy mural** on the works wall: a crude whistling box on wheels, with smoke, coming from the south. Your
  train arrives and they're thrilled and slightly let down: "It was bigger in the picture." The longer boiler pays it
  off.

**Tone:** a village fête, all in daylight: bunting, a bell, hard hats, solemn little guys taking silly rules
completely seriously. Nothing dark: no hoods, chanting, fear or sacrifice, nothing asked of the player, no real
religion parodied. **The rule for every writer:** the town guesses at the shard as much as it likes, every guess is
visibly silly and none agrees with another, and nothing confirms its origin.

**Draft lines** (for the owner to reword; no Boogler lines, and his copy is untouched):

| Who | Role | Drafts |
| --- | --- | --- |
| **Rivet** | Foreman and High Looker; tape measure, re-measures the shard's height | "Don't look at me. Look up. Thank you. Now you can look at me." / "We set every bolt a little wrong. Out of respect." / "Your railway bowed on the way in. Good manners." / After the boiler: "Now it's the size it was in the picture. We'll paint a new one." |
| **Squint** | Keeper of the homeward telescope; has watched you all game | "I've watched the south for the whistling thing my whole life. Also I watched you. You fell out of the sky." / "It was bigger in the picture. It's fine. Pictures are always bigger." / Co-op: "Two of you? The picture only had one box." |
| **Hooter** (barker) | Blows the shift whistle | "Shift change! Eyes up!" / "Nobody blink!" / "Shift change! Same eyes." |

Each Talk line is said once per player (the existing per-player memory), and the rota and the rivet toss vary, so the
jokes don't wear out.

## Shape

**Sync kinds** (from the systems reports):
- **Server:** Q7 as one more `QJob` (Q8 is gone: their stub replaces it); the moving railhead stop via
  `trainStopsOf(line, laid)` and `RAILHEAD_CM[]`, with the server checking lever reach against the railhead; one
  `Aperture` entity (`cw` counterweight footings set, `brace` u8 for 0 down / 1 raised on the pawl / 2 braced, and
  `joined` and `threaded` ticks), stays solved if anyone leaves; the counterweight as a new `rail.footSet` site; the
  `rail.brace {revision}` op on the island side (gate-puzzles' revision rule); the rivet as `WORKS_SEAMS` row 2 under
  the existing `rail.strike`, needing `brace === 2`; the island halt opening on `joined`. Build 2 adds the steel works
  component, steel's carry kind and the first `rail.fit` step.
- **Owner:** the body, the glide (`Rail.glide` with local flight) and the hook back to the last bent.
- **Local:** the island near-LOD and their stub (static geometry with walkable static colliders), the shard's bob, the
  folk and their lines, the buoys hiding by accepted state, the leaf's motion and the shared shot on accepted live
  edges, snapped on restore. The late friend's first-crossing shot is local memory.
- **No lockstep ops.** All ops are additive, with no compatibility code ([mixed builds](../agents/mixed-builds.md)).

**Reuses:** Q6's train-fed kit and the track layer; `rail.footTake`/`rail.footSet`, the wagon, the jib and
`footingTotal` conservation; `trainStopsOf` and v25's request levers; the gate-puzzles raise-and-brace and `gate-rig`;
`rail.strike` and the room-wide breaker (`Works.breaker === 2`); the glider and a catalog hook target like
`LINE2_HOOK`; `lookout/view.ts`'s buoys; the starting-area folk pattern and "newest fact" line selection;
`createBoxBatch` and `addStatic`; the shared-moment system (10 November, "shared moments play for everyone"); the bot's
`railway-glide.ts`.

**Build 1, "the line reaches the island": one `WORLD_NS` v27, after v26** (generic lines and the second tracks;
[sequencing](../plans/generic-lines.md#sequencing-v26-alone-ring-island-as-v27)). R1 and R2 touch no sim and can be
built in parallel with v26; R3 and R5 wait for it. **Ring Island stays at the live cones' size and position**
(ruling 1): centred on (1330, −1120), its waterline about 640–680 m across; the map's outline is redrawn to match.
Systems' R1–R5 as reduced in round 2:
- **R1 layout** (new `src/sim/railway-ring-layout.ts`): their stub's points and deck height, the gap and leaf, the
  counterweight bracket, `RAILHEAD_CM[]` and its halt poses, the buoy-to-stretch map, the hook ring and island
  recovery points, the rivet seam, the island halt's two platforms and its 40 m loop, and the bow as the 4% profile
  (24.3 m level to the first bent, then 4% down to the island halt, level after). Every deck is the 7.6 m double
  formation. The greybox's `RING_LAYOUT` (`src/proto/greybox/ring.ts`) is a starting point. The saddle waits for
  build 2.
- **R2 island near-LOD, default on** (new `src/entities/ring-island/`): a heightfield collider, a shore provider, their
  walkable stub with laid track and the island halt, the leaf (raised) with its empty bracket and painted outline;
  `buildFar` unchanged; mounted within about 500 m or once Q7 is laid; `npm run perf` before and after.
- **R3 rules, v27:** one laying job (Q7), the moving railhead (with the leg row's destination in cm if v25 hasn't
  added it), `Aperture`, the counterweight site, `rail.brace`, the rivet row, the island halt; no steel. Seeds
  `deck-laid`, `gap-footed`, `leaf-raised` and `ring-joined`, with `JUMPS` rows for the first and last.
- **R4 views:** buoys lifted, the railhead platform and lever moving, the leaf's brace, drop and rivet glint, the Meet
  shot merged into the first ride, the shard's bob, the staring rota.
- **R5 bot and loop:** the segment glides the gap (reusing `railway-glide.ts`) and hooks back, with checkpoints `deck
  laid`, `gap footed`, `leaf raised` and `ring joined`; perf on the stub and at the island halt.

Footings for the area: about 14 for the bents plus 2–4 for the counterweight (`WORKS.total` about 31). The train covers
the distance; the hand moves are rack to jib.

**Build 2 (v28):** the steel works on the live kiln's model (a bill brought by train, `lit`, a rack, cast ticks), the
longer-boiler fit at the Roundhouse, and the train threading the ring through a lowered saddle (a still of the new
horizon first; ruling 3 lowers it to what a 4% spur from the island halt reaches, about 30 m in 750 m), with the
shard's one reaction. The branch lines come after build 2, from the island halt: **there is no summit halt**; the
summit is the aperture lookout, a path walked up from the town.

**Risks:**
- **The sea's shore texture.** `coast.ts` bakes one texture over every shore, capped at 2048 a side; adding the island
  stretches the union to about 2 km. Check with the sea owner before R2 (a second small texture, a coarser far cell,
  or no foam lip in the greybox).
- **Hotspot files.** `railway-systems.ts` (about 1,590 lines) and `adapters/railway.ts` (about 1,200). New rules go in
  a new `railway-ring.ts` with one wiring hunk each; only R3 edits the sim and only R5 the bot.
- **Early access.** Once the island is solid, players can swim or glide there early. Nothing on the island works
  before the line arrives (the brace needs the leaf counterweighted from the railhead), and swimming never supplies a
  footing or steel.
- **The grind budget.** No item carried by hand more than twice, no hand carry over 60 m, and no train wait longer
  than one leg.
- **The bow changes a finished view;** the saddle changes the horizon. Stills before and after each, logged.
- **v27 never ships mid-session** (owner call), nor v26 before it; the `crossing-done` jump-in keeps each reset to one
  click.

## Done means

Each capture uses `node dev/look/look.ts` (or `npm run look --`):

- **The raised leaf from Home:** `--rail-seed crossing-done`, the camera on Home's hilltop and through the telescope
  facing north, plus the Split-rock finale's last frame. The orange leaf reads raised against the ring at phone size
  in all three.
- **The glide landing:** `--rail-seed gap-footed --eval dev/look/evals/ring-glide.ts` (from `railway-glide-first.ts`),
  starting on the last bent. The landing is on their stub, dry; the hook back to the last bent's ring works; a
  missed glide lands swimmable and reaches shore. The bot segment logs it.
- **The leaf dropping:** `--players 2 --rail-seed leaf-raised`, one player braced on the island side, the other at the
  railhead as the jib hangs the last counterweight footing. The leaf swings down onto the bents; both pages see it.
- **The rivet:** same setup, then strike. The gold rivet glints in the joint; the shot plays on both pages (the
  striker's and the other's), uninterruptible with the one highlighted skip, about 6 s, and `Aperture.joined` is set.
  A third page joining afterwards gets the snapped state, then the shot once on its own first crossing.
- **The first train:** `--rail-seed ring-joined`, riding from the railhead to the island halt. The descent shows the
  ring climbing; the reverse pull-out lands on the halt and the RINGWORKS sign; no train wait over one leg.
- **The staring rota:** `--rail-seed ring-joined`, the camera in the island square. Three to five lookers stare
  straight up; the whistle swaps them; standing still and looking up gets a nod.

## Open questions

All decided; the owner may overrule.

1. **Is the glide how the gap is crossed, rather than the train-first Meet with the glide as an optional peek?**
   Decided: **the glide**, with the hook ring on the last bent and a swimmable shore, so the glider gets its one
   main-line use. Owner: ___
2. **Do the six finished bents get redrawn so the line bows from 24 m to about 6 m?** Decided: **yes**, amended to
   the 4% bow (24.3 m to about 14.7 m at the railhead and 7.5 m at the island halt; ruling 2, 10 November), with stills
   before and after and the finale re-shot. Owner: ___
3. **Is the first steel the longer boiler outright, rather than a pick between boiler and cradle?** Decided: **the
   boiler**; the bigger orange cradle is the second steel pick. Owner: ___

## The layout, greyboxed (10 November)

`?ring=greybox` (any build; `src/proto/greybox/ring.ts`) lays the Meet out at the rulings' numbers, with local static
colliders only, so it can be walked and glided before R1 is written: the bow at 4% to bent 13, the 17 m gap, the
raised leaf, the brace platform, the hook ring, the island halt with its loop, the shore and the path to the summit
lookout. The live cones are made solid for it. No sim, server or world change.

**The glide numbers at the new heights** (the design review's finding 1, re-measured; gravity 18 m/s², jump 7.6 m/s,
glide 10 m/s forward and 3.2 m/s down, hook 24 m):

| Number | At the 6 m bow | At the 4% bow | Holds? |
| --- | --- | --- | --- |
| Railhead deck | about 6 m | 14.7 m (its platform 15.6 m) | — |
| Brace platform, 4 m under the hinge's deck | about 2 m | 10.0 m (the deck drops 0.7 m across the gap) | Yes: 4.7 m under the railhead deck, 5.6 m under its platform |
| Gap 16–18 m (greybox 17 m) | — | 17 m | Yes. A glide from the deck reaches about 26–29 m, so a platform from 17 to 29 m out leaves 9–12 m to spare; a sprint with the double jump falls about 3–4 m short |
| Hook ring within 20 m | — | 18 m from the platform's near edge, 30 m from its far edge | Only from the platform's near half: the hook's 24 m reaches the first 7 m of it |
| Ladders about 10 m | — | 10.0 m up the hinge pier; **15.6 m** up the last bent to its platform | The hinge pier's holds; the last bent's is half as long again |

**What the greybox found** (stills: from the pier head at the leaf, from the last bent across the gap, from the brace
platform back to the hook ring, from the island halt west, and from the summit lookout):
1. **The raised leaf stands across the formation at the hinge,** so a glide straight off the deck's end flies into it.
   The greybox puts the brace platform on the hinge pier's east wing, beside the leaf and in line with the railhead
   platform, so the glide lane runs past the leaf onto the platform. From the last bent this reads: the platform, the
   gold brace and the waving folk are straight ahead, 4 m down, with the leaf to the left. R1 should keep that lane.
2. **The game has no climb verb.** The greybox's ladders are 50° sea stairs (`WALKABLE_NY` allows 56°), drawn with a
   ladder at the foot; whether a swimmer walks out onto one is untested. Build 1 needs either those stairs or a ladder
   verb.
3. **From the island halt the Gorge is behind the island.** Its bearing (north-west) runs through the main cone; only
   Bell Rock and Canopy's trees read over the west sea. The branch-junction build's "each platform faces its
   destination's landmark" needs the Gorge's platform to look round the cone, or a sign of it at the halt.
4. **From the summit lookout (66 m) the branch choice is mostly hidden.** The west-south-west cone (120 m) stands across
   Canopy's bearing, and the ring's own tube comes down just north-west of the summit, across the Gorge's. Under the
   shard the lookout reads well; as the place "where the branch choice can be seen" it doesn't, with the live cones as
   they stand. Either the near-LOD reshapes the island, or the lookout moves to a shoulder with a clear west view.
5. **A 40 m loop doesn't fit on land at 7.5 m north of the halt:** the main cone rises about 21% there. The greybox
   swings it over the shallows east of the halt, centred about (1462, −822). The halt itself stands on a fill: the cone
   is about 2 m under its 7.5 m deck.
6. **Bent 6's height depends on where "out" is measured.** On a 4% profile that is 24.3 m at bent 1 (20 m past the
   pier head), bent 6 is 20.3 m; the rulings' 19.6 m measures 137 m from the pier halt instead. The railhead's 14.7 m
   and the halt's 7.5 m use the pier head. R1 should fix the datum.
7. **The raised leaf reads from the pier head** as a small orange upright against the grey island, its top about 31 m
   up; the brace platform and hook ring can't be made out from there, which is fine, since they are the next leg's.
   Not yet checked from Home or the telescope.

## Parked

- The branch choice as a goofy schism: Gorge-facers and Canopy-facers at a junction pointing through the ring's gaps.
- The Prophecy of the Feet: "Feet will come across the water" meant footings, not pilgrims.
- Trains become holy after the Meet: hand bells at every arrival, folk bowing to the engine.
- A personal orange hard hat for everyone present at the first train.
- The sealed upper gallery, the "Closest Pew", reached with the branch ability.
- At the end, the folk bolt their crooked new piece into the ring's gap, with bunting.
- A little blue charm tied to the first shipment "for speed", cosmetic only.
- The orange pilot and lamp on engine A, and an orange truss at Home, as later steel.
- Island progress visible from Home: plumes per producer level, a lit row of windows, one more looker on the rota.
- Machine sound only at the works for now; the owner's own music there later.

## Design review (designer, 2026-11-10)

Scope: build 1 ("the line reaches the island", v26). Build 2's calls (the steel works, the longer boiler, the saddle,
the shard's reaction) come in only where build 1 has to set them up.

Read: [DESIGN](../../DESIGN.md) (7, 8, 10, 11); [owner calls](../agents/owner-calls.md), including "The orchestrator
makes design calls too" (#1396), "Signs in the world", "Nothing waits on a world bump" and "Port from Place only what
still fits"; the [decision index](../decisions.md#current-decision-index) and the entries it routes here. Those are,
from 10 November: Ring Island, trains stop on request, Turn the table only when ready, and shared moments play for
everyone. From 9 November: a cinematic can't be interrupted by accident, words and beacons sparingly, and station 6 by
train. From 8 November, the Split-rock answers. From 6 November: ring-and-economy, roughly six hours, Split-rock then
Ring Island, and the gate-puzzles answers. Also [direction](../direction.md), the [round 4 notes](../plans/round-4-notes.md)
(the 9 and 10 November sessions), [find-the-fun](../plans/find-the-fun.md) 7–10, [glider placement](glider-placement.md)
and [gate puzzles](gate-puzzles.md). Research tops: [route-contract](../research/route-contract.md),
[progression-flow-layout](../research/progression-flow-layout.md), [level-design](../research/level-design.md),
[shared-moments-and-events](../research/shared-moments-and-events.md), [botw-glide-target](../research/botw-glide-target.md),
[friction-without-failure](../research/friction-without-failure.md) and [comedy-in-games](../research/comedy-in-games.md).
Code read: `src/sim/railway-works-layout.ts` (`WORKS`, `CROSSING_BENTS`, `PIER_*`), `src/proto/place/land.ts`
(`buildFar`), `src/proto/place/layout.ts` (`FAR`, `railY`), `src/proto/place/tech-layout.ts` (`MOVE`),
`src/constants.ts` (`GRAVITY`, `JUMP_SPEED`, `SWIM_JUMP_SPEED`), `src/entities/lookout/view.ts` (the buoys and the
telescope) and the kiln and wagon systems in `src/sim/railway-systems.ts`. Tools: `npm run loop` and
`npm run loop -- node crossing` ran. `node dev/playtest/cli.ts` lists the 10 November sessions; the round 4 notes
already carry their numbers.

**Not seen:** `npm run look` fails in this checkout (`express` isn't installed), so there are no stills, and the
island's near view doesn't exist yet anyway. Every distance below comes from the map data, not from a picture.

### The space, measured

- The last built bent, bent 6, stands at (1405, −492) with its deck at 24 m today. Ring Island's main cone is centred
  on (1330, −1120) and its waterline is about 320 m across from the centre. On the line's heading (x +0.027 per metre of
  −z) the line meets the shore near (1414, −810), so **about 318 m of open sea lies past bent 6.**
- Seven more bents at the 20 m pitch put the railhead near z −632, 140 m on. The folk's stub runs about 160 m from the
  shore out to the leaf's hinge, less the gap.
- The raised leaf is about 610 m from the telescope at (985, −207) and 9° right of where the scope aims, so it is in
  view at both zooms. From the pier head it is about 280 m.
- How players move today: walking is 5.6 m/s. A jump peaks at 1.6 m and the air jump adds 1.3 m, 2.9 m in all. The
  glide goes 10 m/s forward and sinks 3.2 m/s. The hook reaches 24 m inside a 25° cone. A swimmer's jump is 4.5 m/s,
  which lifts 0.56 m: not enough to climb out of the water.

**Legs, beat to beat** (rides at 20 m/s):

| Leg | From → to | Length | Time |
| --- | --- | --- | --- |
| 1 | Home or the Works → the pier halt | about 700–900 m | 35–45 s ride |
| 2 | Pier halt → bent 6 | 137 m | 7 s ride, 25 s walk |
| 3 | Bent 6 → the railhead at the gap | 140 m | 7 s ride, 25 s walk |
| 4 | Across the gap | the gap's width (unset) | 2–3 s glide |
| 5 | Leaf heel → island shore along their stub | about 160 m | 29 s walk |
| 6 | Railhead → island halt, after the Meet | about 180 m | 9 s ride |

Leg 3 is a bare walk along the trestle, but you walk it once at most: after Q7 the train covers it, and the buoys lift
along it, so there is something to notice. No leg breaks the walk-seconds guide.

### Calls in build 1

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The arrival is the Meet: their half-crossing, with laid track and an island halt, ends in a raised counterweighted leaf | Decided | decisions.md 2026-11-10, Ring Island (orchestrator, #1396) |
| 2 | About 7 more bents (14 footings) and no second laying job: Q7 only, with Q8 gone | Decided | same entry |
| 3 | One player crosses the gap on the glider already earned | Decided | same entry. Matches [glider placement](glider-placement.md) Q3: "one main-line use at Ring Island" |
| 4 | A hook ring on the last bent pulls you back; the island shore is swimmable | Decided | same entry. Holds only if the gap is under 24 m (finding 1) |
| 5 | The island-side job is "brace the raised leaf" | Decided | same entry, and gate-puzzles' approved verb ("Ring braces", 6 November). What the brace physically does needs one line (finding 2) |
| 6 | The wagon brings the counterweight footings to the railhead and the jib hangs them; the only hand move is rack to jib | Decided | same entry |
| 7 | The counterweight takes 2–4 footings | Default | Recommend **4**, with the leaf dipping a quarter per footing once it is free to move ("Machines show their work physically") |
| 8 | Anyone strikes the gold rivet with the breaker; it latches the leaf and opens the island halt | Decided | same entry. It is the seam verb players already know from the Works (round 4 notes, 10 November: the seams were found in 13 s and 49 s) |
| 9 | The rivet needs the leaf down (all the counterweight hung, and the brace in), not only `brace === 2` | Default | Recommendation. As written, the rivet could glint while the leaf is still raised |
| 10 | The room gets one shot when the rivet is struck, merged with the first ride: about 6 s, uninterruptible, with one highlighted skip | Decided | decisions.md 2026-11-10, shared moments play for everyone; 2026-11-09, a cinematic can't be interrupted by accident. Merging it with a train is a risk (finding 3) |
| 11 | A friend who missed the shot gets it once, on their own first crossing (local memory) | Decided | same entries. [shared-moments](../research/shared-moments-and-events.md): in Roblox, late joiners get the beats they missed when they arrive |
| 12 | The raised leaf shows from Home, in the Split-rock finale's last frame and in the telescope | Decided | same entry; DESIGN 7 |
| 13 | The six built bents are redrawn so the line bows from 24 m down to about 6 m | Decided | same entry. This sets the height the glide starts from (finding 1) |
| 14 | The railhead halt moves, with its request lever, and the wagon delivers to wherever the line ends | Decided | brief. Fits decisions.md 2026-11-10, trains stop on request (the wagon's stops need no request) |
| 15 | The `Aperture` stays solved if anyone leaves | Decided | brief; route-contract rule 3 (keys can't be lost) |
| 16 | The island is solid early, but nothing on it works before the line arrives, and swimming never supplies a footing | Decided | brief; [route-contract](../research/route-contract.md) (travel edges never supply work edges) |
| 17 | Grind budget: nothing is carried by hand more than twice, no hand carry is over 60 m, and no train wait is longer than one leg | Decided | brief; the owner is "wary of material grinds" |
| 18 | The kiln: `WORKS.total` rises to about 31 from the one fill of 16 logs and 16 stone, with no second bill | Default | The brief implies it; recommend saying so. The sum is off: 16 + 14 + 2 = 32, and 16 + 14 + 4 = 34, not 31 |
| 19 | Where the 14 new bent footings are set, and where their rack stands | New | Not stated. Recommend the pier's pattern: one site to set them at, with the wagon's rack within 15 m of it at the railhead. The pier's carries are 11 m (`npm run loop -- node crossing`), which keeps well inside the budget's 60 m |
| 20 | The gap's width, and the heights you glide from and land on | New | Not stated; recommend finding 1's numbers |
| 21 | The brace and the counterweight can be done in either order | New | Recommended (finding 2) |
| 22 | The leaf's painted outline and empty bracket, and a gold cue on the island side | Default | The brief has the outline. Recommend the island-side brace in gold, facing the railhead (finding 4) |
| 23 | Buoys: each marks the end of a stretch and is lifted, with a splash and a bow, when that stretch is laid | Decided | brief. Which buoy marks what is Default: buoys 1–2 (37 m and 99 m out) already stand under laid bents, so they should start lifted; the buoys past the gap are the folk's own and lift on `joined` |
| 24 | The island's near view loads within about 500 m, or once Q7 is laid | Default | brief. 500 m covers the pier head (280 m) but not the telescope (610 m), which still sees the far view, so the leaf has to be added to `buildFar` too |
| 25 | Where players are put back on the island after a fall | Default | brief. Recommend dry spots, off the track and never in the water (round 4 notes, 9 November: nine recoveries in a row put him back in the sea) |
| 26 | The shard is a perfect octahedron with a slow bob and turn, never explained | Decided | same entry. It is already in `buildFar` (a 38 m octahedron at 140 m up) |
| 27 | The staring rota: 3–5 lookers, Hooter's whistle swaps them, and a player who stands still and looks up gets a nod | Decided | same entry. The count and the whistle's interval are Default: recommend 4 lookers and a swap every 45 s |
| 28 | Hard hats, crooked rivets, the no-pointing sign, the hammer that never stops, missed rivets as offerings, the mural | Decided | same entry. It fits the live rumour "My cousin says he's never once blinked." (`town-lines.ts`), which round 4 liked |
| 29 | Rivet, Squint and Hooter's lines, each said once per player; no Boogler lines | Decided | same entry; owner calls "Keep The Boogler's copy" and "Collaborators may write the narrative" (they are drafts) |
| 30 | The island halt opens on `joined` | Decided | brief |
| 31 | Build 1 shows build 2's payoff waiting at the island: steel stacked, the hammer going | New | Recommended (finding 5) |

Count: **20 decided, 7 default, 4 new.**

### Findings, ranked

1. **The bow and the glide work against each other, and the gap has no size. Change this before building.** The bow
   puts the last bent at about 6 m, and their stub has to meet your deck at the same height for the leaf to join the
   two. Across a level gap, a jump, the air jump and a glide carry you about 15 m, while a sprint with the double jump
   and no glide carries about 11 m. So a gap that needs the glider but can still be glided is a 12–15 m window. That
   asks for precision (DESIGN 10) and makes the glider's one main-line use barely different from a jump. A missed glide
   drops you in the sea about 160 m from the shore with no way to climb out (a swimmer's jump lifts 0.56 m), and the
   hook back only works within 24 m. The leaf is as long as the gap, so a 12 m leaf is also only about 11 px tall in
   the telescope at 610 m, which is marginal for call 12.
   **Fix:** stand the leaf's heel on a hinge pier with a low **brace platform about 4 m below the deck** on the island
   side, where the brace is. Make the gap, and so the leaf, **16–18 m**. You glide down onto the platform in about
   2.5 s, which reaches about 25 m, so there are about 7 m to spare, while a sprint with the double jump falls about 3 m
   short. The hook ring on the last bent stands within 20 m of the platform and in view from it. Put **a ladder up from
   the sea** on the hinge pier and on the last bent, so a missed glide costs a few seconds' swim, not 160 m. Steps lead
   up from the platform to their deck. Prove it with the `ring-glide` eval: a sprint with the double jump misses, a
   glide clears, the hook connects from the platform, and both ladders climb out.
2. **The steps' order contradicts itself. Change this before building.** The pitch and suggestion 1 put the brace before
   the counterweight. The early-access risk says "the brace needs the leaf counterweighted". The rivet needs only
   `brace === 2`. Gate-puzzles' approved verb was "raise it, the pawl holds it, install the brace", which is for
   something held up, and the Meet's leaf comes down.
   **Fix:** give the brace one physical job. On the island side you **knock out the pawl and drive the brace under the
   heel**, which is what lets the leaf carry a train. Accept it only once the gap is footed, so a player who swam over
   early can't do it. Then let **the brace and the counterweight go in either order**: weights hung on a leaf still held
   by its pawl make it creak and strain, and once both are done the last weight swings it down. In co-op the two halves
   happen at once, one player gliding over while the other hangs weights, and a solo player can do them in either order,
   since everything latches. The rivet needs the leaf down. Under the 10 November "only when ready" rule (Turn the
   table), the rivet's gold shows only once the leaf is down, and the jib shows no prompt until a counterweight footing
   is on the rack.
3. **The shared shot depends on where a train happens to be. Change this before building.** "Merged with the first
   ride's start" needs a train at the railhead when the rivet is struck. Line 2 grows to about 1.2 km, so the train can
   be a minute away, and the players are on either side of the gap, not aboard. Either the shot waits, which is a long
   wait inside a cinematic, or it shows an empty line.
   **Fix:** keep one shot of about 6 s for the whole room: the leaf settling, the rivet's glint, then the camera running
   along the joined line to the island halt and the RINGWORKS sign. The first train over their steel becomes each
   player's own first-crossing pull-out, which is the beat the late friend already gets (call 11), so one rule covers
   everyone. The joint is also where the room meets: once the leaf is down, the island player can walk straight back
   across to whoever struck it ([shared moments](../research/shared-moments-and-events.md), rec 3: waiting at the spot
   should itself be rewarded).
4. **Two of build 1's five steps are new verbs, at the point in the game where players got lost yesterday.** The round 4
   notes (10 November, P1: "places like the fittings later in the game where I really didn't know what to do") and
   `npm run loop` (the kiln, stall, cradle and table all show "NO CUE (prompt-only)") both point at the late game's weak
   spot. The gap and the brace are new; footings, the jib and the seam are known.
   **Fix:** before it ships, give every new node in the loop graph a cue. The brace is gold, on the platform, facing the
   railhead and visible from it at 16–18 m. One of the folk stands on the platform waving with an elbow, which says "come
   over here" without words (DESIGN 11). The counterweight bracket's painted outline lights once a footing is on the
   rack. Add `gap`, `brace`, `counterweight` and `rivet` nodes with their cues to the loop graph, and check order and
   softlocks with `npm run loop -- run`.
5. **In build 1 the island has nothing to connect for.** Find-the-fun 8 (2 November) found "it wasn't clear what
   connecting would do", and DESIGN 7 asks for the next connection's payoff to be visible in the world. Build 1 has no
   steel.
   **Fix:** at the island halt, a stack of orange steel waits under a tarp, the drop hammer is going, and the prophecy
   mural is on the works wall. It is only static geometry, and build 2 pays it off.
6. **Riders standing over the bow, and players at the railhead.** On 10 November both players came off moving trains
   while standing (a P1 that is still open), and the bow adds a 7–10% grade at 20 m/s on a 6 m trestle over the sea.
   Add a segment to R5 with a rider standing over the bow. Keep the railhead's rack, jib and lever on a platform at
   least 4 m wide beside the track, with room for three players and a parked wagon, and never on the track, so a train
   arriving at the end stop can't push a player off.
7. **The Split-rock finale this builds on is broken today.** Call 12 uses the finale's last frame, and the 10 November
   P1 about the pier's whistle and rockets ("never got the twelve rockets") is still being fixed. Re-shoot the finale
   after that fix lands, not before.

The lenses: the key is in sight of the lock (the leaf faces you from 280 m). There is one main line. The world
shortens behind you (after Q7 the train covers legs 2–3). The beat ends facing the next one only if finding 5 lands.
The joint is the place to meet in co-op (finding 3). The three rules: the next goal can be found, given finding 4's
cues. The gate keeps its meaning, since the brace is accepted only after the gap is footed and the weights come from
the railhead. Nobody is stranded only with finding 1's ladders and hook distance.

**Ported from Place**, piece by piece. The buoys: keep, since they gain a job (lifted per stretch). `buildFar`: keep as
the far view, but the leaf has to be added to it (call 24). The telescope: keep, since call 12 uses it. The glide is
already ported, and this is its main-line use. Nothing comes over only because Place had it.

**Pacing.** Build 1 adds about 10–15 minutes against the six-hour target: 14 footings at the pier's pace of about 8 s
each, three wagon trips of about 90 s, the gap, the brace and the first ride. That's fine for build 1; build 2's steel
has to carry the hour.

**Suspect lines** (the folk's drafts, not The Boogler's; for the owner). Squint's "You fell out of the sky" and Rivet's
"Your railway bowed on the way in. Good manners." assume you glided in and that the line has arrived. A player who swam
over early would hear them before either is true. Tie each to its fact (glided, `joined`) and give the early swimmer a
line of their own. The religion's best jokes are in Talk, and round 4 found Talk never pressed in the town; the rota,
the hats and the rivet toss carry the religion without it, so keep those visual.

### Owner questions

1. **Does the glide land on a low brace platform 4 m below the deck, across a 16–18 m gap, with ladders up from the
   sea?** Recommended: yes. The alternative is ending the bow at about 10 m instead of 6 m: the gap stays level, but the
   glide window stays narrow.
2. **Can the brace and the counterweight be done in either order?** Recommended: yes. The leaf drops when both are done,
   so two players can work at once and a solo player can go either way.
3. **Does the shared shot end at the island halt, with the first train as each player's own first crossing?**
   Recommended: yes, so the shot never waits on a train and the late-friend rule covers everyone.
4. **Does build 1 show steel waiting at the island halt?** Recommended: yes: static steel under a tarp, the hammer
   going, and the mural.
5. **Four counterweight footings, with the leaf dipping a quarter per footing?** Recommended: yes.

**Orchestrator's calls on the review (10 November, under the owner call "The orchestrator makes design calls too"):** all five recommendations accepted, and findings 1–7 bind build 1:
1. The gap is 16–18 m. You glide down onto a brace platform about 4 m below the deck, with the hook ring within 20 m and ladders out of the sea on the hinge pier and the last bent.
2. The brace (knock out the pawl, brace the heel) and the counterweight go in either order, each accepted once the gap is footed. The rivet needs the leaf down, and its gold and the jib's prompt show only when usable.
3. The shared shot ends at the island halt. The first train is each player's own first-crossing beat.
4. Steel waits at the island halt in build 1: stacked under a tarp, with the hammer going and the mural on the wall.
5. Four counterweight footings, and the leaf dips a quarter per footing.

The smaller points also apply: `WORKS.total` is set exactly, the 14 bent footings are set at one site with the rack within 15 m, the leaf goes into `buildFar`, the folk's lines are tied to their facts, standing riders are tested over the bow, and the rack, jib and lever sit on a platform at least 4 m wide beside the track.
