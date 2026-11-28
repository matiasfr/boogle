> **Status: proposed (2026-11-28).** Light brainstorm, one pass through three lenses (play designer, systems
> architect, creative director), against main `f2ef26d2c` (world v77). Docs only: nothing here is built. Measured
> from the level data, the code and the recorded play sessions; no browser look was taken. Not tested on a device.

# Start flow: land at the works, and the old train asks for its boiler

**Seed** (owner, 28 November 2026, in the orchestrator thread):

> "Spin out a fable agent to brainstorm reconfiguring the starting flow of the game and potentially spawn location in
> accordance with streamlining. Right now in playtest it was almost never obvious to follow the path to the train/
> track layer. At the same time carrying the engine up there was super obfuscated."

## In short

- **The walk cannot meet the checkpoint.** From the dock to the camp resident's axe is 566 m on foot: 101 s at a
  walk with no stop, against a target of 120 s from landing to the first accepted contribution
  ([course change](../plans/course-change.md#the-checkpoint-a-guest-helps-in-two-minutes)). The two fresh sessions
  that carry the measure took **235 s and 241 s**.
- **Nothing the dock shows is the works.** The dock sits under an 18 m bluff. The town, the track, the trains and
  the track layer are all behind it, and the track layer stays behind ground for about 420 m of the walk.
- **"The engine" is the boiler.** The forge casts it at Home after Station 8, and it is dragged on the great beam's
  gold rope 209 m up the first bridge to the old train at the Camp, which stands beside where the track layer woke.
  The owner did that haul himself on 27 November. Nothing at the pickup shows where it goes: the old train is behind
  a ridge from the pedestal.
- **Recommended: land at the works.** A first fall lands on the Camp's ridge, 16 m from the sleeping track layer,
  while line 1 is being built, and in front of Home's hall board once the line reaches Home. The first log goes in
  about 30 to 45 s after touchdown. The town becomes what your first bridge reveals. The boiler keeps its haul, and
  the old train is made to ask for it. View and placement work only; no world reset is expected.
- **One thing waits for him:** moving the first landing replaces his 4 November call that
  [the shore is the first landing](../decisions-look.md#d-2026-11-04-the-shore-is-the-first-landing).

## What he saw, named

1. **The path to the track layer.** The first step of the game: fall onto Home's west dock, climb to the Round,
   take the camp road out of it, walk the camp path over the gorge to the timber camp, take the axe from the camp
   resident beside the sleeping track layer, and put logs in Station 1's frame
   ([place](../game-design/place.md#the-run), steps 1 to 3; the hand-off is his
   [15 November answer](../decisions-core-loop.md#d-2026-11-15-grant-queue-answered)).
2. **"Carrying the engine up there."** The boiler haul, the loop's `boiler` and `trains` steps, which close the
   first act. In the code the carried thing is literally "the engine's own boiler"
   (`engine.makeEngineBoiler()` in [`boiler-view.ts`](../../src/entities/railway/boiler-view.ts)). It waits on the
   forge's pedestal at Home (world (922, −1), 18 m up) and goes to the old train on the Camp's stub (world
   (1010, −149), 30 m up): "up there" is the same ridge the track layer started on. His own session shows it
   (27 November 04:21 UTC, `mwyh50dt`): boiler approached 6:47, taken 6:51, fitted 7:38. It is not part of the first
   two minutes, but it is the same complaint: a long walk to a place the pickup never shows. No other engine or part
   is carried uphill in the opening; the great beam is a tree trunk and goes 35 m to Station 3.

## Measured

A scratch script over `src/place/layout.ts`, `shore-layout.ts`, `town-plan.ts`, `terrain.ts` (`H`) and the sim's
layout files; `npm run loop`; `npm run playtest`. Sightlines are ground only: trees and buildings can hide more, never
less. Walk 5.6 m/s, sprint 9.5 m/s (`src/entities/player/state.ts`).

| Fact | Number |
| --- | --- |
| Dock touchdown to the axe (the wake spot beside the track layer), walked | **566 m**: shore path 78 m, round the ring road 48 m, camp path 430 m, 11 m to the resident. Straight line: 252 m |
| Walk time, no stop | **101 s** walking, 60 s sprinting the whole way |
| Then to the first contribution | Take the axe, 8 strokes at 1 log each, 10 to 18 m to Station 1's frame: about 15 to 20 s more. A perfect first run is about 120 s; the target is a median under 120 s |
| Turns on the way | 13 of 25° or more (2 on the shore path, 11 on the camp path, four of them over 70°) |
| Choice points on the way | Four: leaving the dock (the path, the beach or the sea); the Round (the camp road, the quarry road, the hall and its trains, the buildings, the green); the rim (the lookout, or the way down the wall); the far bank, where the path doubles back twice on the climb |
| Does the path head for the camp? | No. Out of the Round it runs 59° off the camp's bearing for its first 94 m, and 465 m into the walk it is moving away from the track layer (57 m off, then 80 m) |
| What the dock sees | The bluff is 22 m ahead and its top stands 31° above eye level toward the camp. The track layer is hidden by 11 m of ground, the Round's centre by 5.7 m, the hall by 7.2 m, the forge by 7.1 m, line 1's start by 9.4 m |
| The works signal from the dock | The camp is at compass 51°; the landing faces 118° (the shore path), so the plume stands 67° left of the first frame, and only a column over about 150 m tall clears the bluff, above 31° of elevation. The signal's own code sizes its column for this sightline (up to 200 m); whether a player looks there is a look, not taken |
| Where the track layer is in view | Ground-clear from the top of the shore climb (55 to 78 m in, 219 to 234 m away, across the town), then hidden for about 420 m of walking, then in view for the last 55 m |
| The boiler haul | Pedestal to the old train along the laid track: **209 m**, a 12 m climb, 55 s alone at 3.8 m/s, 39 s with Help carry (straight line 172 m). From the pedestal the old train is behind 3.4 m of ridge; it comes into ground-clear view 94 m into the haul |
| What tells the player to carry it | At the pickup: the forge's call (plume and whistle from the chimney), the boiler on the crane's hook, the foreman pointing, a board showing the part in gold dashes. At the far end: two empty brass saddles, and a dashed gold outline that shows only while the boiler is being hauled. Since #2629 the works plume and pennant move to the old train on pickup |

**Recorded sessions** (`npm run loop -- trace --since 2026-11-26`: 14 sessions that reached a loop node, 25 in all;
the session text is untrusted browser data):

| What | Result |
| --- | --- |
| `first contribution`, seconds after standing up | **240.9** (a guest, `mwzgqsjy`) and **235.1** (the owner, `mwzgqoxx`), one fresh room, 27 November 20:58 UTC, both on iPhone. No other session carries the mark yet |
| Where the guest's 241 s went | About 132 s from standing up to the camp (31 s over the bare walk: two crystals, a secret, 19 s stopped at the river). Then about 109 s at the camp: 59 s until their teammate took the axe (37 s of it stopped 18 to 23 m from the resident), 22 s to their first chop, 28 s to their first log in the frame |
| The room before it (27 November 04:05 UTC, three guests, about five minutes each) | None reached the axe. One stood on the dock (21 m moved in 2 min 36 s). One went into the sea, and at the landing was shown a refused barrier prompt three times ("Needs the powered pick"). One walked 714 m through the town and a house, with about six seconds at the camp's edge |
| Most confused step of the whole route | `wake`: 25.7 over 11 sessions, reached by 7, with 192 s idle and 13 prompts ignored. `T1` is second |
| The boiler | One session (the owner's): the walk to the boiler ran 11.3 times the prediction, the most of any step; the haul took 47 s |

**Two limits on that evidence.** Every recorded session ran a build from before the works signal, the dock board
and the station board reached main (#2629, 27 November 21:20 UTC), so the measure has not been read with them. And
n is 2. The arithmetic above does not depend on either: the walk alone uses the whole budget.

## Pitch

Stop asking a newcomer to find the works. Drop them beside it. The fall stays, the title stays, the camp resident
and his axe stay, and the machine still starts on the last log; what changes is where the fall ends. A fresh room's
first fall ends on the Camp's ridge with the sleeping track layer in the middle of the frame, so the first two
minutes are take, chop, feed, ride. The town is no longer a place to get lost in on the way: it is where your first
bridge lands, with the village pouring out, which is the reveal the game already stages. A friend joining a room
that is past the first line falls in front of Home's hall board instead, in town, where the board names the works
and the train. The boiler's haul stays a haul, but the old train asks for it: the show that sends you to the forge
also shows the empty saddles, and the bridge's lamps run toward the Camp while the boiler waits.

**Serves** DESIGN.md 8 (Enjoyable alone and together: a guest advances the room within two minutes), 7 (Telegraph
everything) and 11 (Show, don't tell: where the work is, is always shown). It bends no principle. It replaces one
owner decision, the 4 November shore landing, which is question 1. Principle 1 (Toys before chores) was retired on
7 November and is not leaned on.

## Gut question

Does a first-time player have a log in the frame before they have had time to wonder where to go?

## Three reconfigurations

Each is the opening and the boiler together. Times are from touchdown and are estimates from beat lengths in the
code and the sessions, not a played run.

### A. Land at the works (recommended)

**What changes.** Two landing pads on Home, chosen when the fall starts from the room's accepted railway state:

- **The Camp pad** while line 1 is unbuilt (the works is `wake`, Station 1, 2 or 3): local (−20, −150), on the
  ridge. The ground within 8 m is level to 0.3 m, the nearest catalog tree is 18 m off, the wake spot is 16 m ahead
  and Station 1's frame 18 m. It faces east-south-east so the track layer, the old train behind it, the resident
  and the frame's sign share the middle of the frame, at phone width too.
- **The hall pad** from the moment line 1 reaches Home: today's village fallback (`SPAWN`, local (−97, 14)), 7 m
  from the hall, facing its bay, Sleeves and the station board. This is what the course-change plan first asked of
  A3: "a fresh player, a late joiner and a reload stand facing the board".
- **The hand-off is one press.** The resident walks up to the lander with the axe held out (his existing give
  pose); the prompt reads Take axe; his draft line shows as his bubble, word for word. The Talk card with its "Bye"
  goes. The evidence: a guest reached the camp and no axe was taken for 59 s.
- **The dock** stops being a first landing. The cove, the shore path and the West landing's stakes stay as they
  are: it is where the Bell Rock and cave lines will start.

**Solo, a fresh room.**

| Time | What the player sees and does |
| --- | --- |
| 0:00 | Smashes through the title and lands on the ridge; the letters crash round them. Ahead: a rusty track layer, a old train behind it with two empty brass saddles, a frame with a sign, a grove. Past them the ground falls away toward the town across the gorge |
| 0:02 to 0:07 | Stands up; the Act 1 crane (the existing 4.8 s move) pulls back over the camp |
| 0:08 | The resident is already walking up, axe held out. Take axe |
| 0:12 | The multi-axe card; put it away |
| 0:15 to 0:25 | Station 1's sign reads logs 0/24. Eight strokes at the nearest tree |
| 0:30 to 0:45 | **First log in the frame: the first contribution** |
| 1:30 to 2:00 | Three loads in. The engine starts on the last log, shakes its rust off and lays track toward the town. Ride it |
| 6 to 9 min | The trestle lands at Home: "A way across!", lamps, the village pouring out. The hall board, Sleeves, the Round and the ball court are what the bridge gives |

**With a friend already in the room.**

- _The room is still on line 1._ The friend lands on the same pad with the host chopping in frame, and has the axe
  already (the existing flourish). Copying gets a log in at about 20 to 30 s. If the layer has moved on, the fresh
  track runs from the Camp to the active frame (41 m of it to Station 2's, 75 m to Station 3's) under the works pennant.
- _The room is past line 1._ The friend lands in town facing the board. Works at Home (the forge's bills): the oak
  is 31 m from the hall, so about 45 to 60 s. Works along the route: Lane B's log bin stands by the Village rack,
  11 m from the hall, so chop and give in about 60 to 90 s, and the board names the train.
- _A gap this does not close._ Between Station 4 and the boiler no train runs and, by a reading of
  `railway-queries-gift.ts`, the bin takes gifts only for the route's legs. A friend landing at the hall then has up
  to 546 m to walk to the works. That is Lane B's to answer (Parked).

**The boiler.** The haul stays, because it is the great beam's verb again (a big thing on the gold rope, carried
to gold saddles, a friend lifting the end), and under A the old train is in the very first frame of the game, so
the act ends where the player fell. What changes is that the far end speaks first:

1. The show that ends on the forge's pedestal (Far Head's 2.5 s cut) is followed by 2 s on the old train's empty
   saddles wearing the boiler's dashed gold outline: this, then there.
2. That outline and its motes stand on the saddles from the cast, not only during the haul.
3. While the boiler waits or is hauled, the first bridge's edge lamps, which came on one by one at its reveal, run
   in a pulse from Home toward the Camp: a path that leads there.
4. The board by the pedestal shows Station 6's own drawing, the old loco side-on with its boiler in gold dashes.
5. On pickup the room's one signal moves to the old train (built, #2629; not in the build he played).

**Cost.** View and placement, one branch, medium.

- Landing: `src/place/layout.ts` and `shore-layout.ts` (`LANDING` becomes two pads and a pure
  `landingFor(roomWorks)`), `src/features/fall.ts` (it feeds the landing's place and yaw to the sky rail, the title,
  the letter scatter and the crane), `src/fall/stage.ts` (where the cart and letters land), `src/fall/arrival.ts`,
  the landing's clearance disc in `src/place/terrain.ts` and the meadow's keep map.
- Hand-off: `src/entities/railway/greeter.ts`. The server's take is unchanged (`rail.wake`, 6 m from the wake
  spot), so the resident meets the player inside that reach.
- Boiler: `boiler-view.ts`, `boiler-shot.ts`, the first bridge's lamp view, the forge rack's board.
- Dev and docs: the production bot's first beat (`dev/look/bots/railway.ts`), `dev/loop/graph.ts`, the `arrival`
  scenario, `first-run.md` and `place.md`.
- **No `src/sim`, wire or save change, and no world reset expected**: no tree stands within the pad's 9 m circle
  and no height moves. The builder confirms with `npm run level-check` and stops if either turns out false.
- Build after `codex/first-spawn-fall` lands (the same fall files) and beside `codex/station1-pick-removal`
  (it rewrites `place.md`'s Station 1 sections).

### B. Keep the dock, and the path itself leads

**What changes.** The landing stays. Everything is added to the walk:

- A 3 s establishing shot after the stand-up, from over the Round: the camp's plume, the path under it, and back.
- A trail of low stakes with gold pennants along the camp path, one about every 25 m (17 of them), read from the
  room's works so it stands only while the works is at the Camp.
- Three fingerposts where the route is chosen: the camp road's mouth on the Round, the rim, the footbridge
  (placeholder word: "Camp").
- Little guys carrying logs up the camp path before the bridge exists.
- The barrier prompt that reaches the landing is hidden until its line is next.
- The same one-press hand-off, and the same boiler changes as A.

**Solo.** 0:00 touchdown on the dock. 0:07 the shot. 0:26 the top of the climb and the first pennant. 0:35 out of
the Round. 1:52 the camp. 2:00 the axe. **2:15 to 2:25 the first log**, at a straight walk with no stop; about 1:30
if they sprint all of it. The measured players took 31 s over the bare walk.

**With a friend.** The same walk for every first visit, wherever the works is. The friend lands 113 m and a bluff
from the hall board, as now.

**Cost.** View only, small to medium, no world reset: `src/features/fall.ts` and `src/render/camera-pull-out.ts`
(the shot), a new trail view beside `works-signal.ts`, `src/place/signs.ts` (fingerposts), `src/place/folk.ts`
(haulers), `src/entities/route-greybox/leg-view.ts` (the prompt), and the boiler files as in A.

**Why not.** It is the cheapest, and it cannot reach the number: the walk is 101 s before anything is done.

### C. The line starts at Home

**What changes.** Line 1 is built the other way. The track layer sleeps on Home's road at the hall, the old train
stands cold on the next road, and the axe is handed over there. Station 1's frame stands at the platform's end and
the line lays outward to the Camp, so the first connection puts a timber camp on the line, which is the first
sentence of DESIGN.md's core loop. Every first fall lands on the square in front of the hall.

**Solo.** 0:00 touchdown in town, facing the hall: the board, and through the open bays the track layer and the
old train with its empty saddles. 0:08 the axe. The oak is 31 m off. **0:40 to 0:55 the first log.** The whole first
act happens inside about 60 m of the Round, and the bridge's show arrives at the Camp.

**With a friend.** Always lands in town; on line 1 the works is never more than one 221 m track away.

**The boiler.** Line 1's first 20 m pass 5 to 13 m from the pedestal, so the haul is a few seconds with both ends
in one frame.

**Cost.** Large, with a world reset. It rewrites line 1's rules and anchors (`src/sim/railway-layout.ts`,
`railway-line-layout.ts`, `railway-sys-line1.ts`, `railway-check-line1.ts`, `railway-queries-line1.ts`, and
`LINE2_OLD_TRAIN` with its carry area in `railway-line2-layout.ts`), the great tree's place (it must stand on the
town's side of the gorge), the jump pillar's course, how the layer gets home to the turntable for line 2, the
opening and folk views, every direct-link stage, the bots and the loop graph. Planner first, an independent review,
one world reset.

**Why not now.** A reaches the same first minute by moving the player, not the railway. C is the answer if A's
number fails or if he wants the first act to happen in town.

## Recommendation

**Build A.** It is the only option that clears the measure without touching the rules: about 30 to 45 s to the
first log in a fresh room, against 235 and 241 s measured, and a late friend lands at the board in town. Fold in B's
two fixes that help wherever a walk remains (the barrier prompt at the dock, lamps that lead the boiler's haul). Keep
C parked with its trigger. The first build is the landing and the one-press hand-off; the boiler's calling is a
second small view pass; the proof is the trace on the next fresh sessions.

## Best suggestions

1. **Land at the works** (play designer). The works cannot be missed if you fall beside it. Tension: the creative
   lens loses the dock's arrival walk into town; it gains a better town reveal, by the bridge.
2. **The pad follows the room: Camp, then the hall board** (systems architect). One pure read of `roomWorks`, two
   named pads, and the hall pad is the fallback when the room's state is late. Tension: this is the fall's first
   read of shared state; a single fixed pad would be simpler but strands either the newcomer or the late friend.
3. **The resident comes to you, and Take axe is one press** (play designer). Nearly half of the measured 241 s was
   spent at the camp, not on the path.
4. **The far end speaks first** (creative director). Every carry shows its destination before the pickup: the cut
   to the empty saddles, the outline standing from the cast, lamps running the way to go.
5. **The old train in the first frame** (creative director). Two empty brass saddles seen at second one are the
   promise the boiler keeps an hour later; the act ends where the player fell.
6. **Nothing with a prompt at a landing that the lander cannot use** (systems architect). A guest was shown a
   refused barrier prompt at the dock three times.
7. **The first bridge is the town's reveal** (creative director). Now, not later: it is built; A only lets it be the
   first time the town is seen.

## Shape

- **Sync kind.** Local. The landing is a pure function of the railway replica the page already holds
  (`roomWorks(adapter.read.world())`, as the works signal reads it); the pads are constants. No command, no wire, no
  saved field. Movement stays Owner. The boiler's additions are Local views over accepted rows.
- **Reuses.** `roomWorks` (Lane A0), the fall's director, `SPAWN`, the resident's give pose and the shared starter-tool
  action, the first bridge's edge lamps, Station 6's sign art, the forge-call cut.
- **Smallest first build.** The two pads, `landingFor`, the fall checked at both, the one-press hand-off.
- **Risks.**
  - The fall on a ridge: the cart and the kickable letters may land on the machine or roll into the gorge. Aim the
    scatter along the ridge; letters in the gorge are fine, a cart on the layer is not.
  - The room's state may be late. Five of the iPhone sessions reconnected about a minute in. With no state when the
    fall starts, land at the hall pad.
  - A solo newcomer who stalls on line 1 is on the ridge with no toys. `T1` and `T2` rank second and fourth for
    confusion. The camp path still leads to town, and Lane A's board grammar is the fix for those steps.
  - The first frame from the Camp pad is not looked at. Ground clears the view to the town by under half a metre
    at eye height, so the grove or the machine may hide it.
  - The camp path's finds (crystals, the lookout's crate, the rock arch) leave the first route. They stay where they
    are, on the walk between the Camp and the town until the bridge is laid.

## Done means

Each is a `look` the builder opens and reads.

1. **The fresh fall.** `intro=1`, a fresh room, desktop and 390 × 844: the first frame after standing up has the
   track layer, the resident and Station 1's sign in the middle third; the whole fall plays with the title, the
   letters, the cart and the crane.
2. **The late fall.** `intro=1` at `--rail-seed q5-stocked`: the player stands in front of the hall facing the
   station board, Sleeves in frame.
3. **The number.** A fresh bot at real speed (`--real`) goes from touchdown to its first accepted deposit using
   only what is in frame: under 60 s.
4. **Two players.** `look --players 2`, the second falling while the first chops at Station 1: both, the frame and
   the layer in one frame.
5. **The boiler.** At a stage with the boiler cast: the show's two cuts (the pedestal, then the saddles); from the
   pedestal with the boiler held, the lamps running toward the Camp and the signal over the old train; 94 m into
   the haul, the outline on the saddles readable.
6. **The measure.** `npm run loop -- trace` on the next fresh sessions: `first contribution` under 120 s at the
   median.

## Design review (2026-11-28)

| # | Call | Kind |
| --- | --- | --- |
| 1 | The first visit is a fall through the title, with the Act 1 crane at the landing | Decided ([fall](../decisions-controls.md#d-2026-11-02-the-first-visit-is-a-fall), [acts](../decisions-controls.md#d-2026-11-11-the-game-has-acts)); kept |
| 2 | The camp resident hands over the axe; the engine starts on the last log | Decided ([15 November](../decisions-core-loop.md#d-2026-11-15-grant-queue-answered)); kept |
| 3 | One signal at the room's works, a board at every station, no arrow or quest text over play | Decided ([course change](../decisions-core-loop.md#d-2026-11-27-course-change)); kept, and the boiler adds no second plume |
| 4 | The forge's call rises from the chimney, never from the boiler | Decided (owner, 9 November, in [place](../game-design/place.md#guidance-after-removing-the-objective)); kept |
| 5 | Signs in the world before hovering text | Decided ([owner call](../agents/owner-calls.md#world-signs)); the lamps, the outline and the board are objects |
| 6 | The first landing moves from the shore to the works | **New, and it replaces a decision** ([4 November](../decisions-look.md#d-2026-11-04-the-shore-is-the-first-landing)): waits for him (question 1) |
| 7 | A late joiner lands facing Home's hall board | Default (the course-change plan's A3 wording; [lane-a-works](../plans/lane-a-works.md#level-findings) kept the dock and added a dock board) |
| 8 | Take axe is one press; the Talk card and "Bye" go; his draft line becomes his bubble | Default |
| 9 | The boiler keeps its haul; the old train shows its outline from the cast, the show cuts to it, the lamps lead | Default |
| 10 | Moving the old train to Home, or reversing line 1 | New; not built by this brief (questions 3 and 5) |

**Level design.** The three firm rules of
[progression-flow-layout](../research/progression-flow-layout.md#the-rules-as-lenses) hold under A: the next goal can
be found (it is in the first frame); no gate loses its meaning (the landing skips distance, never the axe or the
bill); nobody is stranded (the camp path still joins the Camp and the town, and the hall pad is in town). Not done:
no still was taken from either pad, so the first frames are described from coordinates, not seen.

A town judged by what shows from spawn is ruled out by his 9 November call
([a well-designed town, not a view from spawn](../agents/owner-calls.md#spatial-town)). A does not rework the town
to show more from a spot; it moves the spot to the works. Rows 7 to 9 are for the orchestrator to log in
[agent-calls](../agent-calls.md); this job could write only this file.

## Open questions

Each proceeds on its recommendation unless it says it waits.

1. **Does the first landing move from the dock to the works: the Camp's ridge while line 1 is being built, the
   hall board after?** Recommended: **yes.** It is the only option that meets the two-minute measure without a
   rules change. **Waits for him:** it replaces his 4 November shore landing. Until he answers, the one-press
   hand-off, the barrier prompt and the boiler's calling are built, and the landing is not moved.
   Answer: ___
2. **What does the dock keep?** Recommended: **the cove, the shore path and the West landing's stakes as they are;
   the dock board goes** once nobody lands there. The dock is where the Bell Rock and cave lines start, and it reads
   better as a place found later than as a first room.
   Answer: ___
3. **Does the old train stay at the Camp?** Recommended: **yes for this pass, made to ask for its boiler** (view
   only). If the haul still reads badly when he plays it, the next step is the village pushing the old train down
   the new line into Home's road when the first path opens, which puts the haul's two ends 5 to 13 m apart. **The
   move waits for him:** it is a rules change with a world reset.
   Answer: ___
4. **Is Take axe one press, with no Talk card first?** Recommended: **yes.** The resident's draft line is kept word
   for word as his bubble; his name, look and words stay the owner's.
   Answer: ___
5. **When is "the line starts at Home" (C) worth its cost?** Recommended: **park it with a trigger:** fresh
   sessions after A still show a median over 120 s, or guests at five minutes cannot say what the room is building.
   Answer: ___

## Suspect or placeholder lines

None of The Boogler's copy is touched, and neither is his place in the story: the sheeted statue on the Round's
green and the meeting at the ending stand as they are.

- **Camp resident** ([`greeter.ts`](../../src/entities/railway/greeter.ts)): "Take this axe. Fill the first frame
  with logs and we can get the engine going." A draft from 15 November, kept word for word; it moves from the Talk
  card to his bubble. The card's "Bye" answer goes.
- **Sleeves, first `asleep` line**: "Follow the path up to the camp. Someone there has an axe for you." Under A a
  fresh newcomer starts at the camp, so only a player who walks to town before taking the axe hears it. Still true;
  his lines are placeholders and the owner's copy
  ([16 November](../decisions-characters.md#d-2026-11-16-sleeves-lines-stay-placeholders)). Not changed.
- **The forge foreman** points at the old train's saddle during the haul. His lines read `owner's line: …` in
  [`forge-guide.ts`](../../src/entities/railway/forge-guide.ts); the flow decision's rule 6 covers them. Not this
  brief's.
- **New placeholder word, option B only:** the fingerpost "Camp".

## Parked

- **A gift bin for line two's bills before trains run** (Lane B): closes the gap for a friend who lands at the hall
  while the works is up to 546 m off on foot.
- **The camp path re-cut to leave the Round on the camp's bearing**: a terrain change that moves heights and the
  tree catalog; not needed if nobody is sent down it first.
- **Hand the axe at the dock and carry the first logs up by little guys**: the first frame fed from the landing; a
  new rule in `src/sim`.
- **The trail of pennant stakes** (B) for any later works that is a long walk from its halt.
- **The crane fits the boiler with one press, no haul**: the old train under the forge's jib; cuts the last carry
  if hauls are cut everywhere.
