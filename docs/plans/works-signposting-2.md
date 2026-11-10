> **Status: proposed (2026-11-10).** Designer pass, no code. Next: build the "now" parts; the owner answers the three
> questions at the end when he can (nothing waits on them).

# Works signposting, part 2: from the first strike to a lit kiln

Seed (owner, 9 November, P1 in [round-4-notes](round-4-notes.md#owner-session-9-november-desktop-live-build-ranked)):
"im confused on what's supposed to occur with the breaker once I hit it next to rotunda". From the same session's data:
he struck both seams (15:00, then 0:48 into the next session) and stopped, because "Fill the kiln" never showed. He is
rechecking the stall slab's fall separately; that animation is not part of this plan.

Part 1 ([works-signposting](../brainstorms/works-signposting.md), shipped as #1312) built: gold motes on every unstruck
seam while the breaker is out, the breaker's glint on your back, dashed gold ghosts of the kiln's missing logs and
stone, gold motes on the bowl's two rocks, the throat shot ending on the kiln's bays, and (the designer's halt answer)
a trodden path up the roller road with a one-word **Kiln** fingerpost, both shown from the throat strike. Part 2 covers
what is still silent: **the walk to the second seam**, **what the stall's empty sockets say**, and **the kiln's ask to a
player who arrives with nothing on their back**.

Serves DESIGN.md **11. Show, don't tell** and **7. Telegraph everything**; **8. Enjoyable alone and together** for the
kiln's split. It bends nothing. The owner calls it applies: "Signs in the world before hovering text" and "words and
beacons sparingly" (both 9 November), the island map on a low display at each halt (9 and 10 November), and the live
line map at the Home station (9 November, Home plan step 12).

**Research.** [wordless-onboarding](../research/wordless-onboarding.md) recs 3 and 5 (a shut thing says why; attention
needs a nudge); [progression-flow-layout](../research/progression-flow-layout.md#the-rules-as-lenses) rule 1 (the next
goal can be found) is what breaks after the first strike, and lens 4 (key in sight of the lock) is broken on purpose at
the stall, so the sockets have to carry it; [level-design](../research/level-design.md) rec 3 (small shapes reward a
look; nothing here is a landmark); [route-contract](../research/route-contract.md): nothing adds a travel or work edge.

## What I measured and looked at

Positions are world metres from `src/sim/railway-works-layout.ts`, `railway-train.ts` (`LINE_HALTS`) and the Home plan
(layout B). Walk 5.6 m/s; line 2's leg time from `trainLegTicks`.

**The distance in the seed.** The two seams are 216 m apart in a straight line today (stall seam (912.4, 17.6), throat
(1119, 82)), 187 m after Home step 6 (seam (940.6, 25.5)). The trip as played is stall seam → line 2's Village halt
17.6 m → ride 157 m (about 13.5 s plus the wait) → quarry halt → throat 56 m: about 250 m of travel, which is likely the
"500 m" felt. On foot it is 39 s straight.

**Stills** (`works-open` and `works-arrive` seeds, scratch only, not committed):

- **Stall seam toward the throat, today** (cam 912.4, 20.2, 19.5 → 1119, 28, 82): line 2's Village halt fills the middle
  ground 17 m away, its shelter and **map display** square in view; the quarry camp's blue blocks are a few pixels on the
  horizon; the split rock does not read; Needle Bell dominates the left. So a stall-strike camera shot toward the rock
  would show nothing (confirms the logged "no stall shot" call), and the map display is the thing in view.
- **Home B, the pedestal toward the moved stall seam** (`home=b`, cam 921.5, 20.2, −3 → 940.6, 19, 25.5): across road 1
  and the island, the stall and its slab read at 32 m, with the island's map display standing in the walking line
  between them.
- **From the throat's halt-side mouth toward the south-west** (cam 1110, 27, 74 → 1098, 26, 108): open grass and a grove
  of standing trees about 30 m away; the trodden path and roller road at your feet.
- **From above the halt rack** (cam 1100, 40, 60 → 1110, 22, 95): path, roller road, the open cut with the kiln's gold
  ghosts inside, and the same grove just outside the split rock's west wall.
- **From the kiln toward the grove**: the bowl's wall; the grove is out of sight from inside the cut, in sight the moment
  you step out of the throat.

**Not seen:** a phone camera; a train arriving at the quarry halt; motes in motion (stills only); the stall's sockets
with ghosts (not built); Home B with the breaker out (its seed has the breaker on the pedestal).

**Logs at the Works (correction).** Part 1 and its logged call "No logs of the Works' own: the 16 logs still come from
Home" assumed the nearest choppable tree was about 180 m away. It isn't. Five ordinary trees stand outside the split
rock's clearance, 30 to 46 m from the throat: ids 71 (1103.2, 108.0), 94 (1101.9, 112.1), 303 (1096.2, 112.5), 281
(1085.1, 103.9), 265 (1083.4, 108.1); `insideSplitRock` is false for all five, and at 10 logs a tree they hold 50.
The kiln's 16 logs can come from 30 m away today, with no rule change. (Two cleared trees inside the bowl, 122 and 99,
are what `npm run loop` counts as the kiln's "1x10" log source; see finding 2.)

## The route, beat by beat

Order as the owner played it: stall seam first. The throat-first order (owner, 9 November: "either seam first") is
covered after the table.

| # | Beat | Where (today / Home B) | Walk or ride | What the player sees (built / new) | Exact copy | Goes away when |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Breaker cast (after Q6) | Pedestal (919.0, 5.4) / (922.0, −1.05) | Pier head → pedestal about 536 m by train | Forge plume and whistle; gold motes at the pedestal (built) | none | Breaker taken |
| 2 | **Take the breaker** | Pedestal | — | Breaker glints on your back; motes trickle from every unstruck seam (built). **New:** a short gold zigzag at each unstruck seam on every island map (halt displays now, the Home hall board at step 12). **New, moved:** the quarry halt's trodden path and **Kiln** fingerpost appear now, not at the throat strike. **New:** the townsfolk's street notice, once | Prompt "Take the breaker" (existing). Street notice (new, a resident, not The Boogler): "That big hammer's for cracks. One by the turntable, and a jealous one past the quarry." | Map zigzag: when that seam is struck. Path and post: never. Notice: plays once |
| 3 | Walk to the stall seam | Seam (912.4, 17.6) / (940.6, 25.5) | 14 m, 2.5 s / 32 m, 5.7 s | Cracked slab, its motes on the face toward you (built) | "Strike the seam" (existing) | — |
| 4 | **Strike the stall slab** | Stall seam | — | Slab pops in three; tarp and two grey sockets (built). **New:** a dashed gold ghost footing in each socket, the shape of the broken sample on the quarry rack. The stall's zigzag leaves the maps; the throat's stays | none at the sockets | Each ghost: when its footing is set. All: at the second footing |
| 5 | Find the next goal | Line 2's Village halt display (927.8, 26.2), 17.6 m / the island display, in the walk from the pedestal | 3 s / about 4 s | **New:** the map's only gold is the zigzag at the quarry's split rock, beside the Quarry stop; the train marker shows when line 2 comes. The breaker still glints | none (the map names stops already) | — |
| 6 | Ride to the quarry | Village halt → Quarry halt (1081.3, 41.1) | 157 m, about 13.5 s riding (or 216 m, 39 s on foot) | Train; from the platform the throat is hidden by the camp's blocks (part 1's stills) | — | — |
| 7 | Quarry halt to the throat | Platform end → throat (1119, 82) | 56 m, 10 s; the cut frames the throat from the road's first bend, 21 m | **Built, now earlier:** pale trodden path beside the roller road, fingerpost **Kiln** pointing up it; seam motes on the throat's halt face; the broken sample footing on the rack beside the path's start | Fingerpost "Kiln" (existing, the owner's to reword) | — |
| 8 | **Strike the throat** | Throat | — | Slabs topple; shot ends on the bays with their gold ghosts (built). The throat's zigzag leaves the maps. **New:** a dashed gold square at the kiln on every map. **New:** the kiln's bill board stands at the throat's halt-side mouth | Board: **"Kiln"** / **"logs 0/16  stone 0/16"** (station bill format) | Map square and board: when the kiln lights |
| 9 | Arrive at the kiln, empty back | Kiln (1128, 87), 10 m in | 2 s | Ghosts in the cradle and hopper, motes on both bowl rocks 25 m on (built). **New:** "Fill the kiln" shows to an empty back too, blocked with a reason | Prompt "Fill the kiln" (existing verb); blocked reason (new): **"Bring logs or stone"** | When the kiln lights |
| 10 | Get the load | Bowl rocks 25 m from the kiln; the grove 30–46 m outside the throat | 5–8 s each way | Stone: the rocks' motes. Logs: the grove is in plain view as you step out of the throat (still), and the board faces you on the way back in | none new | — |
| 11 | Fill | Kiln | — | Each ghost goes as its piece lands (built); the board's counts rise | "logs 9/16  stone 16/16" etc. | — |
| 12 | **Kiln lights** | Kiln | — | Fire, chuffs, footings roll to the rack (built). Ghosts, rock motes, the map square and the board all go | — | — |
| 13 | First footing home | Rack (1088, 50) → stall | Ride + 11 m today / 19–36 m in B | The sockets' gold ghosts from beat 4 are where it goes; the footing is the ghost's shape | "Shoulder a footing", "Set the footing" (existing) | Beat 4's ghosts, one per footing |

**Throat first.** Beats 7 and 8 come first, from the quarry halt's display (its gold zigzag is then at Home's stall).
The kiln can light before the stall is struck. Beat 4's socket ghosts appear only when the slab falls, so the stall
never shows a ghost behind a closed slab. Every map reads the same rule, so whichever seam is left is the only zigzag.

**Solo.** One player does it all: stone and logs are each one or two carries of under 50 m. **Co-op.** The kiln splits
naturally, one at the rocks and one at the grove, each watching the other's ghosts and counts go. Everything new is
Local over accepted state, so a friend, a late joiner and a reload all see the same marks, ghosts, board and path; only
the striker gets the throat shot (as built). A friend arriving late reads the map at any halt to see what's open.

## The three questions, answered

**1. The walk to the quarry seam.** The answer is the island map, which stands 17 m from the stall seam today and in
the walk from the pedestal in Home B. While the breaker is out, each unstruck seam gets a small gold zigzag at its real
place on every map face: the crack's own shape in the breaker's gold, so the grammar "gold means this is for that"
carries onto the map. It is not an objective marker (removed 3 November): it lives on a board in the world, you read it
when you choose, and it marks a place, not a route. It is capped to the Works (seams and kiln), so the map doesn't
become a tracker. At the far end, the trodden path and fingerpost now appear when the breaker is taken, not when the
throat falls, so a player stepping off at the quarry halt is sent 21 m up the road to where the throat and its motes
are framed. The townsfolk's one-off line is a supplement for anyone who walks the street. No beacon, no camera shot.

**2. What the empty sockets say.** A dashed gold ghost footing in each, from the moment the slab falls: "a block this
shape goes here". The same shape is the broken sample on the quarry rack (seen at beat 7) and every footing the kiln
casts, so the sockets, the rack and the first footing read as one thing. No words at the stall. This is part 1's
suggestion 3, sockets only; the wagon's and the pier's ghosts stay with that suggestion's later build.

**3. The kiln's ask after the second strike.** Three things, all at the kiln, all gone when it lights: the ghosts
(built) say what and how many by shape; a bill board in the stations' own format says it in numbers, readable from the
path's top and from the grove; and "Fill the kiln" now shows to an empty back, blocked with "Bring logs or stone", so
pressing by the kiln never meets silence (the same hole as the boiler's P1, "no prompt and no reason"). Logs come from
the grove 30 m outside the throat, in view as you step out; stone from the bowl.

## Where things stand

- **Map marks:** drawn on the existing island map faces (`src/render/island-map.ts`, `island-boards.ts`) as instanced
  quads like the train markers and rings, so a strike never redraws a canvas. Zigzag about the size of a stop's dot, at
  `WORKS_SEAMS[i]` mapped through the face's `fitMap`; the kiln square at `WORKS_KILN`. Gold `GOLD_ROPE`, no blink, no
  pulse (the rings blink for trains; gold stays still). Same under reduced motion. The Home hall board (step 12) uses
  the same helper.
- **Socket ghosts:** `createGhostOutlines` (`src/render/ghost-outline.ts`) at `STALL_SOCKETS`, a little smaller than a
  footing, squared to the socket, as the kiln's are.
- **Kiln board:** `src/render/sign-board.ts`, one draw, no collider, no shadow, about 1.6 × 0.8 m on two posts, its bottom
  1.5 m up, standing about 4 m out from the throat on the halt side, beside the trodden path's last leg and never on it,
  facing down the path. Sited from `WORKS_SEAMS[1]` and the path's end, not by hand.
- **Path and post:** unchanged shapes; trigger moves from `works.seams & SEAM_THROAT` to `works.breaker === 2`.
- **Street notice:** one new `Fact` in `src/proto/place/town-lines.ts` (`STREET_NOTICE`), raised by the breaker being
  taken. Check in the build that the live town's residents read it.
- **Kiln prompt:** `works-view.ts` `targets()`: in reach with the throat open and the kiln unlit, and the back not
  carrying logs or stone the kiln still wants, push "Fill the kiln" with `blocked: 'Bring logs or stone'`.

No op, rule, wire, save or `WORLD_NS` change. No colliders, so reach, the bot's route and the route contract are
unchanged. `npm run loop -- run` today: every order finishes, "throat before slab" included, in 24:50 to 24:53.

## Now, and after Home step 6

**Build now** (nothing is sited by hand; every position reads the moved constants automatically): the map marks on the
halt displays, the socket ghosts, the kiln board, the blocked kiln prompt, the path-and-post trigger, the street notice,
and the loop graph fix (finding 2).

**After step 6:** the Home hall board's marks come with step 12, on the same helper. Re-take the B stills with the breaker
out: from the pedestal (32 m) the stall seam's motes are sized to read at 10 m, so they may be specks at 32 m; if the
still says so, raise the stall seam's mote size (a tunable) rather than add anything. Check the island display still
stands in the walk from the pedestal to the seam, and that the socket ghosts read from the island (19 m) where footings
are carried in.

**Depends on, not part of this plan:** [boiler-first-choice](boiler-first-choice.md) keeping the pedestal empty before
the breaker is cast (the owner took both within 1.3 s); the stall slab's fall (the owner's recheck).

## Done means

`npm run look -- --rail-seed <seed> --eval dev/look/evals/railway-works-at.ts --query 'worksat=<pose>'` and
`railway-works-act.ts` as in part 1:

- `works-arrive`, `worksdo=take`: every halt display shows two gold zigzags (stall and throat), no square; the quarry
  halt shows the path and post.
- `worksdo=strike0`: the Village line-2 display shows one zigzag at the split rock; the stall shows two ghost footings.
- `works-open`: no zigzags; a gold square at the kiln on every display; the kiln board reads "logs 0/16  stone 0/16"
  from the path's top (cam about 1104, 26.5, 72); with an empty back at the kiln, "Fill the kiln" shows blocked.
- `works-lit`: no square, no board, no blocked prompt. `stall-done`: no socket ghosts.
- Throat first (`strike1` before `strike0`): the zigzag is at Home's stall on the quarry display; no socket ghosts.
- A reload at each seed shows the same. One phone-profile still of a halt display with a zigzag. Not tested on a device.
- Not provable by a still: whether a first-timer reads the map. The owner's next session answers it (time from the
  first strike to the second, and from the throat to the first "Fill the kiln" press).

## Calls

| Call | Kind | Source or recommendation |
| --- | --- | --- |
| Words and beacons allowed, sparingly | Decided | decisions.md, 9 November, "Signposting: words and beacons are allowed sparingly" |
| Signs in the world before hovering text | Decided | owner-calls, 9 November |
| Each halt has the island map on a low display; Home gets a live line map | Decided | decisions.md, 9 and 10 November, "Halt boards show the island map"; "A live line map stands at the Home station" |
| Either seam may be struck first | Decided | decisions.md, 9 November, "Loop orders" |
| No objective marker on screen | Decided | decisions.md, 3 November |
| Gold dashed outlines mean "a part goes here", only once the site is open | Default (open) | agent-calls, 9 November; extended here to the stall's sockets |
| Gold marks on the island maps for each unstruck seam (while the breaker is out) and the unlit kiln (once its cut is open), capped to the Works | New | Recommended: the one thing in view at the stall that shows 216 m away; a mark on a board, not a marker on screen. Owner question 1 |
| Zigzag for a seam, dashed square for the kiln; stop-dot size; no blink; static under reduced motion | Default | Recommended here; tunables |
| No map mark for the stall's sockets | Default | Recommended: the footing's destination is learnt at Home in beat 4; more gold on the map tips toward a tracker |
| Path and Kiln fingerpost appear when the breaker is taken, not at the throat strike | Default | Recommended: sends a stall-first player up the road to the throat; the post names a place, true once the cut opens |
| Socket ghost footings from the slab strike, each gone as its footing is set | Default | Part 1 suggestion 3, sockets only |
| Kiln bill board "Kiln" / "logs 0/16  stone 0/16", at the throat's halt-side mouth, from the throat strike until lit, no collider | Default | Recommended: the stations' own bill grammar at the one observed stall. Owner question 2 |
| "Fill the kiln" shown to an empty or wrong back, blocked: "Bring logs or stone" | Default | Recommended: replaces silence with the existing blocked-prompt grammar; copy the owner's. Supersedes part 1's "no words at the kiln" default. Owner question 2 |
| Street notice on taking the breaker: "That big hammer's for cracks. One by the turntable, and a jealous one past the quarry." | Default | A resident's line, not The Boogler's; a supplement, plays once |
| No camera shot at the stall strike | Default (open) | agent-calls, 9 November; confirmed by today's still (the rock doesn't read from the stall) |
| No beacon at the Works | Default | The map and the path do it; keep the big signal for a place that can't be framed |
| Kiln logs from the grove 30–46 m outside the throat; don't add or remove trees there | New | Correction of part 1's premise; it is how the game plays today. Owner question 3 |
| Stall seam mote size retuned only if the B still shows specks at 32 m | Default | After step 6 |

## Findings

1. **The logged call "No logs of the Works' own" rests on a wrong distance** (agent-calls, 9 November). Five standing
   trees, 50 logs, are 30–46 m from the throat and in view from its mouth. Its reason ("the trip is the 'before' the
   footing wagon repays") also mixes two things: the wagon repays carrying footings, not kiln logs. Should change the
   record before building: mark that row superseded by this plan's grove call. Risk: a player who cleared that grove
   earlier (Q4's frame is 73 m from it) has no regrowth yet; then logs come by the next nearest trees west of the halt
   (48–56 m from it).
2. **`npm run loop` gives the kiln's logs a source 10 m away that isn't there.** `dev/loop/graph.ts`'s `TREES` includes
   trees 122 and 99, which the Works clears locally (`insideSplitRock`). Filter them; the kiln row should read about
   30 m. A tool fix, buildable now.
3. **Part 1's halt answer only helps throat-second players after the throat is struck.** Stall-first players (the
   owner) arrive at the quarry with the path and post not yet drawn. Moving the trigger to the breaker fixes it.
4. **The kiln still says nothing to an empty back**, the same hole as the boiler's P1 prompt. Fixed by beat 9.

## Copy

New lines are proposals for the owner to reword, none of them The Boogler's: the kiln board ("Kiln", "logs 0/16  stone
0/16"), the blocked reason "Bring logs or stone", and the resident's street notice. Existing lines kept as they are and
already on the owner's list: "Take the breaker", "Strike the seam", "Fill the kiln", "Shoulder a footing", "Set the
footing", "Empty your back first", the fingerpost's "Kiln". None of The Boogler's copy is touched, and none of it looks
wrong against this plan.

## Owner questions

1. **Should the island maps mark the Works in gold (a zigzag at each seam not yet struck, a square at the cold kiln)?**
   Recommended: **yes**, Works only; it's the one thing in view at the stall that points 200 m away, and it stays on a
   board you choose to read.
2. **Words at the kiln: a bill board with the counts, and "Bring logs or stone" when you press with nothing?**
   Recommended: **both**; it's the one place you stopped, and both use grammar the game already has (station bills,
   blocked prompts). Rewording is yours.
3. **The kiln's logs: let the grove beside the cut supply them, as it already can?** Recommended: **yes**, leave those
   trees as they are; the long haul the Works is built around is the footings, which the wagon repays.
