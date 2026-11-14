> **Status: proposed (2026-11-14). Design only; nothing built.** Readability of the railhead stretch, the gap and the
> arrival on Ring Island, after the owner's 14 November session. Base: `origin/main` at `4fc3dc35d`. Every recommended
> step is view-only (local views, local colliders, local hook rules) and needs no `WORLD_NS` bump. Two things named here
> but not recommended now would touch more: moving the hook pile (layout data read by level-check, the bot and a test;
> no sim rule, no bump) and loading the island's first kit from the leaf going down (sim, the next free bump, v45,
> shared with [footings-signalling](footings-signalling.md) option B and [level-pacing-1114](level-pacing-1114.md) A2).

# Gap readability: the railhead, the hook pile, the leaf and arriving on Ring Island

## Goal

From Station 7 funded to feeding the first kit on Ring Island, a player who has never been here knows what moves and
why, which way is forward, what the hook ring is for, and what the island wants. Serves DESIGN.md 7 (Telegraph
everything: "Announce consequential changes before they happen") and 11 (Show, don't tell: "What's on screen is true").
No mechanic is added and no gate changes.

## The owner's words (14 November 2026, verbatim)

"Drawbridge" is Ring Island's leaf (the Way). "Ringworks" is Ring Island.

1. On the railhead moving: "Okay, well, that was weird. I just had a part where I set footings down and then
   everything slid over. That was very confusing."
2. On the hook ring at the end: "another weird thing is I didn't really get that the hook shot was to get back on the
   platform if I fell. It seemed like the hook shot at the end next to the drawbridge was supposed to get me to the
   drawbridge, so that was just confusing."
3. On lowering the leaf: "There should be like a similar smashing animation to the thing that lowers the drawbridge,
   similar to when we unlock the quarry, by the way, I think."
4. On arriving: "what's supposed to happen? Are the trains bringing the rails and logs? How does this work now that I'm
   at Ringworks?" and "I like the character dialogue."
5. On the island's map table (P3): "I wasn't sure whether it was a train map that was flat at the ringworks."

Earlier, same session, same stretch, handled in other jobs: after the crossing's finale he did not know Station 7's
frame was next ("the supports are there, but I don't know what to do next"; a cue is being built), and the request
lever sat next to the footing deposit (being moved).

## What the code does today

- **The slide** (`src/entities/railway/railhead-view.ts`, `railhead-shape.ts`). A bent's second footing stands the
  bent, the span sweeps down, and the platform, rack, jib, lever and buffers move 20 m at `SLIDE` 7 m/s (about 3 s),
  starting the frame the bent counts as stood. Nothing announces it. The platform's collider is a local static slab
  that exists only while `settled()`; while it moves it is a picture, so whoever stands on it falls 0.9 m to the
  walkway. Rack, jib and lever prompts are withheld until it settles. The next bent's sockets and gold-topped stake
  glow the whole time; nothing marks the moment the work has moved.
- **The hook pile** (`RING_HOOK`, `hook-view.ts`, `hook-shot.ts`). The ring hangs 17.5 m up on a mast on a sea pile at
  u 276, lat +12: 16 m past the platform's end and 12 m east, level with the leaf's hinge (u 277). Its landing is the
  gold pad **behind it, on our platform** (u 258.2, lat +5), 19 m from the ring. It joins the hook's rings when the
  fourteenth footing is set. Its purpose in [build 1](ring-island-build1.md) (leg 7, call 30, finding 1): the way
  **back from the folk's brace platform** (u 284 to 294, 8.0 m) after a glide, which is one-way, 7.6 m down. It is not
  a recovery from the water: `canPress` refuses a swimmer. It is offered to anyone within 24 m who is more than 1.8 m
  from the pad, so **from the take-off (18 m from the ring) it lights teal, shows the Hook key chip, and a press pulls
  you a few metres backwards onto the gold pad.**
- **Every other ring in the game stands on a post over its own landing** (`hookRings`: `land` is the pad the post
  stands on): the eight of the Needle Bell climb and the four side rings, including `stack-return`. The island ring is
  the only one whose landing is somewhere else, and the only one you can be offered while standing on its own landing
  deck. Same white torus, same gold-to-teal tint.
- **The crossing, by stage.** Before fourteen footings: no way over (a glide lands on the brace platform but the pawl
  is refused; no ring). Gap footed: glide from the platform's end to the brace platform (24 m out, about 3 s; a jump
  first gives 4 to 10 m spare; the double jump falls 2.2 m short), **Knock out the pawl** at the gold strut; **Hang the
  weight** four times at our jib. Either order; the last of the five lowers the leaf in 2.5 s. Then walk the leaf,
  **Strike the rivet** at the toe (u 259.5), the Meet plays, trains run through.
- **A fall.** A swim. Our side: the railhead's sea ramp, foot at u 232, lat +14, three flights up to the platform.
  Their side: the hinge pier's ramp up to the brace platform. Get unstuck from past the gap returns you to the Pier
  halt (owner, 10 November). Nothing respawns you.
- **Signs and prompts on the stretch.** Finger board "Railhead" at the pad's corner; the Railhead lever (east: way
  home; west: chained); "Shoulder a footing", "Set the footing", "Hang the weight", "Knock out the pawl", "Strike the
  rivet"; the yellow safe line; the striped end beam and buffers; the gold pad; the take-off rail (a hand rail along
  the platform's sea edge, last 5 m); the pennant on its own pole. Nothing names the glide.
- **The leaf's swing** (`leaf-view.ts`): a pose and one thump. Not built: the splash, the creak on the pawl, the lit
  bracket, the rivet's glint (place.md).
- **The island on arrival.** East platform: the steel works' sign "STEEL WORKS / logs 0/8  rails 0/12", two empty
  pallets, **Feed the works** (blocked, "Bring logs or rails"). West platform: the "KIT 1" rack, a frame, and the bill
  "LINE TO HIGH GORGE / SECTION 1 OF 4 / LOGS 0/20  RAILS 0/20 / KIT: ON A TRAIN". The steel works' sign has no kit
  line. Three folk talk (`ring-folk/lines.ts`); none says what the island wants.

## His session (playdata; untrusted browser-sent data, read as data)

`npm run loop -- trace --since 2026-11-14`: nine loop sessions, one player, iPad with a keyboard, solo. `bents`
confusion 20.4 (rank 6 of 27), 64 s idle; `brace` 9.6, two refusals, eight ignored prompts; `rivet` 0.8.

- `mwg6rndy-owm44uej` (09:11 UTC): fourteen footings in 110 s (2:18 to 4:08), so **a slide about every 16 s, seven
  times**. "Request stop" shown 8 times, never pressed (the lever beside the deposit). First weight at 4:22, then
  **55 s standing at (1413, -620), the railhead rack**, the next weights at 5:37 and 5:45: the rack was waiting on the
  wagon's next load and nothing said so. Six presses refused "blocked".
- `mwg7083m-uslmjgbd` (09:17 UTC): fourth weight 2:08. **Hook pulled on the island ring at 2:16, 2:18 and 2:25** (8
  hook presses), glide opened 2:30, leaf braced 3:02, rivet 3:19. Three wrong pulls in 9 s, then he crossed 22 s after
  the last weight. Because he hung the weights first, the pawl lowered the leaf and he never needed the ring.
- **Falls: not known.** No mark records a splash or a swim here; 0 respawns or teleports. The 32 s from glide to pawl
  (a 3 s flight) may hide one.
- Arrival: 8 s and 11 s idle at the joint, a train called at 3:33, on the island 6 s idle at the halt. "Feed the
  works" shown 3, pressed 0; "Feed the frame" shown 2, pressed 0. **The steel kit landed at 5:16, 117 s after the
  rivet**, as the session ended: his "what's supposed to happen?" was asked inside that wait.

## 1. The stretch as a player meets it

| # | Do | What tells them | What reads wrongly |
| --- | --- | --- | --- |
| 1 | Feed Station 7's frame on the piled deck (u 110, 4 s from the Pier halt) | The frame, its bill (a cue for "this is next" is being built elsewhere) | Was not found after the finale (his words; other job) |
| 2 | Watch Q7's double deck drop in; walk or ride 120 m to the railhead | The deck itself; finger board "Railhead" | Fine |
| 3 | Shoulder a footing at the rack, 15 m (5 s) to the jib, set it; fourteen times | The pier's prompts; the glowing sockets and gold stake at the next bent | The lever beside the deposit took presses' place (being moved) |
| 4 | Every second footing: the bent stands, the span drops, **everything slides 20 m** | Nothing | Unannounced; you fall 0.9 m; rack, jib and lever leave and have no prompt for 3 s (section 2) |
| 5 | Bent 13: the pile, gold pad, take-off rail and west platform appear; the fourteenth footing wakes the ring | The ring turning teal with a key chip | The chip is the only new prompt on the platform, on a ring beside the leaf: "hook to the drawbridge" (section 3) |
| 6 | Hang four weights at the jib | "Hang the weight" | The rack runs dry twice (about 70 s each, build 1 finding 5) with no word that a load is coming: 55 s idle |
| 7 | Glide to the brace platform, knock out the pawl | The gold strut 24 m ahead and 7.6 m down; the folk | Nothing says "glide"; the end beam's stripes say "stop" (section 4) |
| 8 | The leaf comes down | A 2.5 s swing and a thump | Underplayed for the stretch's payoff (his third note; section 5) |
| 9 | Walk the leaf (64 m, 11 to 12 s), strike the rivet, the Meet | The leaf itself; "Strike the rivet" (the glint is not built) | Fine in the data (0.8) |
| 10 | Ride or walk to the island halt (168 to 208 m: 14 s ride, 30 to 37 s walk) | Trains running through; the lever | Fine |
| 11 | Wait for the kit; take logs and rails; feed the works and the frame | Two bills; one says "KIT: ON A TRAIN" as its fourth line | Nothing to do for up to 2 minutes and nothing that says why (section 6) |

## 2. The slide

**Why it confuses.** It follows his own press by a few seconds with no link drawn between them; the floor he stands on
stops being solid and he drops 0.9 m; the three things he was using move away together and go silent; and nothing at
the new end marks that the job has moved. It also breaks "what looks solid is solid" (owner, 2 November) for 3 s: the
platform is drawn and is not there.

**Fix ladder** (each rung stands without the next):

| Rung | What | Kind | Cost |
| --- | --- | --- | --- |
| S1. Telegraph | The slide waits 1.0 s after the span's last plank lands. In that second: a two-stroke bell at the buffers, the buffers' stripe lamps blink gold, the rack's and jib's chocks kick out with a clank. Then it moves with an ease in and out, a roller rumble, and a clunk and dust at rest. Reduced motion: no blink, sounds stay | View | Hours. `railhead-view.ts` only |
| S2. Arrival | As it settles the next bent's two sockets and gold stake flare once (a 0.6 s pulse and a chime) and the jib's arm swings out over them | View | With S1 |
| S3. Carried, not dropped | The platform's slab is a kinematic platform (`registerPlatform`, `src/physics/platforms.ts`, what carries a rider on a train's cars) while it moves, so a player on it rides the 20 m; speed down from 7 to 5 m/s (4 s) so the ride is slower than a walk. Rack, jib and lever travel on it as now | View: the collider is the view's own local static today, not sim. No op, no wire, no bump | About a day, with real-input proof. Two cases to settle: someone on the new span's walkway in its path must be lifted onto the platform, never shoved off the end (the leaf's "walked clear, never pinned" rule); and a friend's rider is drawn on the moving deck (`shared: true` needs the same pose on every tab, so the slide's clock must come from the accepted footing's tick, not from each tab's frame) |
| S4. Nothing under you moves | The raised platform grows 20 m with each span instead of moving; only the rack, jib, lever and buffers travel along it | View and local colliders; `dev/level/ring.ts` heights change | More than a day; 165 m of raised platform reads as a station the whole way. Not recommended |

**Recommendation: S1 and S2 now in one dispatch, S3 straight after.** S1 turns "everything slid over" into something
he caused and saw coming; S3 removes the fall. If S3's co-op case proves rough, S1 and S2 alone still fix the report.

## 3. The hook pile

**Why it reads as "hook to the drawbridge".** A ring in this game has always meant "this pulls you to me": every other
ring stands over its own landing. This one hangs beside the leaf's hinge, is the only new lit thing when the gap is
footed, is offered with a key chip from the take-off, and lands you behind where you stand. He pressed it three times.
His second reading ("to get back on the platform if I fell") is also not what it does: it refuses a swimmer. Its real
job, the way home from the folk's side, is invisible from our side and was never needed in his order.

| Option | What | Fits 11 and 12 November | Data |
| --- | --- | --- | --- |
| H-A. Legible as the way back | (1) Never offered from the side it lands on: the ring is skipped, dim and chipless, for a player on our deck (line u under 262 and within 3 m of the pad's height); it wakes only for someone past the gap. (2) A taut rope runs from the ring down to a short post and pulley on the gold pad, so from anywhere the ring is one end of a line whose other end is the pad. (3) The ring is turned to face the brace platform | Yes: build 1 call 30 and finding 1 ("no ring hooks onto their side"); `dev/level/ring.ts` asserts it | View and the local hook rule. No bump |
| H-B. His reading made true | The ring (or a second one over the brace platform) pulls you forward across the gap | No: it retires the glide's one required use and reverses finding 1 and the level-check's assertion. Contract-safe after fourteen footings (it skips no work), so it is the owner's to choose | `RING_HOOK` moves or gains a twin (the corners of the take-off are 25.5 m from the brace platform's near edge, past the 24 m range); level-check, the bot's pad and one test follow. No sim rule, no bump |
| H-C. Remove it | Home from the brace platform is the hinge ramp, a 30 m swim and three flights, or the leaf once down | Bends finding 3 of build 1 (an early or brace-first arrival's way home) | Deletes data; no bump |
| H-D. Lower and inboard, for the water | A ring under the deck edge facing a swimmer | Needs the hook to work while swimming, a rule for every ring in the game | Not this plan |

**Recommendation: H-A.** It keeps the decided crossing, costs hours, and removes the false prompt at its source: a
thing that cannot help you from here is not lit from here. The gold pad stays; with the rope on it, it reads as the
line's foot, and the glide's cue (section 4) takes over the job of "forward".

## 4. Which way is forward

Not clear today. The glide is the answer and nothing names it: the take-off rail is a hand rail, the gold pad is the
ring's landing, and the deck's end is striped like a stop. **One cue: the take-off board.** A 2 m plank jutting off
the platform's end toward the brace platform, through a gap in the end rail, with a windsock in the glider's own
cream-and-teal cloth streaming toward the strut, standing from bent 13; and one square of the same cloth pegged on the
brace platform beside the gold strut as the place to land. Cloth means glide (the glider is that cloth; the sealed
glider plan uses it the same way), gold stays "this is for that". Draw-only, no collider on the plank's far metre (it
must not add reach: the double jump's 2.2 m margin stands).

## 5. The leaf comes down: a strike beat

His ask: the lowering should hit like the throat's strike. All of it is local presentation over accepted rows
(`leaf-view.ts` already owns the pose); **view-only, no op, no bump**. Reuse the breaker's swing, `createCameraPullOut`
and `shared-moment.ts` (one new moment name, "the leaf").

- **Knock out the pawl, always:** a mallet hangs on the gold strut (it also makes the strut read as "hit this"). The
  press plays the breaker's swing with it: the raise, a 70 ms hit-stop at contact, chips, a thump; a creak just before.
  The pawl, a gold wedge, flies out and tumbles into the sea with a splash.
- **If the weights are not all hung:** the leaf drops a hand's breadth onto its brace with a groan and a chain rattle,
  and the empty counterweight brackets light gold (the "lit bracket"): loose, and waiting on weights. No shot.
- **Hang the fourth weight, when it is the last:** the footing drops onto its bracket with a clunk and the same hit-stop;
  the leaf goes.
- **The lowering (either trigger):** chains run, the counterweights rise as the leaf falls, 2.5 s ease-in as built;
  at the toe a boom, a dust ring across the joint, spray from the sea beneath, the deck's planks hop, camera trauma
  0.35 (the garage's large install); then the rivet's glint lights. The shot: high on our side east of the take-off,
  looking along the leaf at the hinge, holding 1.1 s on the glint after the landing, about 4.2 s in all (the throat's
  is 4.8 s). It ends facing the next thing to do.
- **Everyone else:** a shared moment on the accepted edge, as the throat's: every page in the room plays it; a late
  joiner sees the leaf flat. Seated riders get no shot (the standing rule) but hear and see it. Whoever stands under
  the toe is walked back as now, with the tumble. If the rivet is struck during the shot, the Meet's shot replaces it.
- **Reduced motion:** no shot, no shake, no hit-stop; the swing, the dust and the sounds stay.

## 6. Arriving on Ring Island

What he met: two bills with zero counts, empty pallets and an empty rack, two blocked prompts, and 117 s before
anything arrived. The words that answer him ("KIT: ON A TRAIN") are the fourth line of the bill on the far platform.

**One statement, at the first thing he faces off the train or the leaf (the east platform, the steel works' sign):**

- The steel works' sign gains the same kit line as the west bill and puts it first while the yard is empty: **KIT: ON
  A TRAIN**, then **KIT: ON THE PALLETS**. Both bills then speak alike.
- While a kit is on a train, the two pallets and the KIT 1 rack each hold a dashed gold ghost of their load (the
  kiln's and sockets' ghost grammar), going as the kit lands: the empty place shows what it is for.
- **Feed the works** and **Feed the frame**, blocked with an empty back while the kit is still aboard, say **The kit
  comes by train** instead of "Bring logs or rails" (which sends him looking for trees).
- The train that carries the kit shows it: crates on the kit car (decided: crates visibly ride the trains). The
  builder confirms this is drawn for the island's kits and reports if not.

**Character dialogue (he likes the channel).** The right mouth is the talker nearest the east platform's south ramp,
where both arrivals come in (Rivet, if `ring-folk/shape.ts` stands them there; the builder confirms). HELD DRAFTS for
the owner, not added to `lines.ts` until he approves; no existing line changes:

- Joined, no kit landed yet: "Nothing to carry yet. Your train is bringing it. We'll watch it arrive. We're good at
  that."
- Kit on the pallets: "Logs and rails, on the pallets. The works eats them. We don't touch. We look."

**The map table (P3).** The low table on the west platform carries the halt map from the rivet, lying flat, north up,
Ring Island ringed, with no train markers (place.md). It does not read as the line map because: it lies flat at about
knee height, so from Buddy's eye it is seen at a glancing angle and foreshortened; every other halt shows the map
upright on a display, so the shape that means "line map" is missing; nothing on it moves (no train markers, no
blinking "you are here"), and moving trains are what make the other maps read as live; it has no title; and its marks
are placeholders. It was a painted table before the rivet, so it also reads as furniture that changed its top.
Options: (a) stand a halt display, the one every other halt uses (`halt-kit.ts`, `halt-map.ts`), on the west platform
by the table, with train markers and the blinking halt; the table keeps its top as the island's own flat copy;
(b) tilt the table 35 degrees toward the approach in a raised frame with a title plate and add the live markers.
**Recommendation: (a).** It is the smallest fix and uses the grammar he already reads; the standing call of 9 November
is that halt boards show the island map, and Ring Island is a halt. Add the live train markers to the table's flat map
too if the shared marker pass makes that free. Both are view-only (the maps are local displays over accepted state);
no bump. The earlier reason for leaving the halt displays off the far halts (names not fitting the 320 x 256 face) was
answered on 11 November ("Yes, smaller is fine").

**The wait itself.** Build 2's logged pacing call says: "if rivet to the first kit in the yard runs over 90 s, the kit
loads from the leaf going down". It ran 117 s. That is a sim change (v45); it is flagged here, not part of this plan's
view-only steps.

## Build steps

Each is one dispatch, view-only, with its proof look. Stills: `npm run look -- --rail-seed <stage> --cam … --look …`.

| # | Step | Proof |
| --- | --- | --- |
| 1 | **H-A(1)**: `hook-shot.ts` skips the island ring for a player on our deck (before `range.add`, beside the existing "already at the pad" skip) | Seed `gap-footed`: `--hud` still at the take-off (1413, 16.4, -631) looking at the ring (1421.5, 17.5, -647.6): ring dim, no chip. Real input: hook pressed there is the deny flick; from the brace platform's four corners it still connects and lands on the pad (`dev/look/evals/ring-greybox.ts` (e)). `npm run level-check` unchanged |
| 2 | **S1 and S2**: the 1.0 s telegraph, eased slide, arrival flare | Seed at a railhead with one footing owed: a 6 s video from the rack through the second footing; frames show the blink before any movement and the flare at rest. Prompts return when settled |
| 3 | **The take-off board** and landing cloth; **H-A(2, 3)**: the rope to the pad, the ring turned | Seed `gap-footed`: stills from the rack (1413.4, 17, -613.8), the take-off, and the brace platform looking back. The board and windsock read from the rack; the rope reads as ring-to-pad. Level-check's double-jump margin unchanged |
| 4 | **S3**: the platform carries its riders, 5 m/s | Real input: stand on the platform through a slide (no fall, `me` stays on the deck); stand on the new walkway ahead (lifted on, not pushed off the end); two tabs, the friend drawn on the deck throughout |
| 5 | **The strike beat** (section 5) and the "Not built yet" list: splash, creak, lit bracket, glint | Seeds `gap-footed` with weights 4 and with weights 0: video of each pawl press; `leaf-raised` plus four weights with the pawl out for the weight trigger. Two tabs: both get the shot; reduced motion: none. Motion reviewed in the asset environment first (owner call, 4 November) |
| 6 | **Island arrival** (section 6): the sign's kit line, the ghosts, the blocked reason | Seed `ring-joined`: stills stepping off at the east platform and from the leaf's end; the kit line readable from the platform edge. After the kit lands: ghosts gone, line changed |
| 6b | **A halt display on Ring Island's west platform** (the other halts' upright map with train markers and the blinking halt), beside the map table; live markers on the table's flat map if the marker pass allows | Seed `ring-joined`: stills from the east platform across the tracks and from the foot crossing; the display reads as the line map at 15 m; a train marker moves between two frames |
| 7 | **The railhead rack says a load is coming**: while footings or weights are owed and the rack is empty, its tag reads the draft below | Seed `gap-footed`, rack empty: still at the rack |
| 8 | Marks and docs: playtest marks `gap splash` (a swim begun between u 255 and 300) and `railhead slide` (with whether the player was aboard); `npm run loop` cues for `bents` and `brace`; place.md | The next session's trace answers "how many falls" |

Not in these steps: H-B (owner question 1); the kit loading from the leaf going down (sim, v45).

## Draft strings (UI copy, none The Boogler's; no existing line changes)

- Steel works' sign, first line while the yard is empty: **KIT: ON A TRAIN**; then **KIT: ON THE PALLETS**
- `Feed the works` and `Feed the frame`, blocked, kit still aboard: **The kit comes by train**
- Railhead rack tag, empty with work owed: **Next load: on the wagon**
- HELD DRAFT resident lines (section 6), for the owner's yes: "Nothing to carry yet. Your train is bringing it. We'll
  watch it arrive. We're good at that." and "Logs and rails, on the pallets. The works eats them. We don't touch. We
  look."
- No words on the take-off board, the rope, the slide or the strike.

Suspect existing lines, listed only: none changed. Squint's "You fell out of the sky." already rewards the glide.

## Design review (designer, 2026-11-14)

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The gap is crossed by a glide; the brace and the weights go in either order; the ring appears with bent 13 and wakes at fourteen footings | Decided | [Build 1](ring-island-build1.md), calls 3, 9, 30, finding 1; prompts, [11 November](../decisions-rail.md#d-2026-11-11-ring-island-views-open-calls-answered) |
| 2 | Get unstuck past the gap returns you to the Pier halt | Decided | [10 November](../decisions-rail.md#d-2026-11-10-open-calls-answered-ring-island) |
| 3 | Shared moments play for everyone; none for a late joiner | Decided | 10 November ("shared moments play for everyone") |
| 4 | Signs in the world before hovering text; no objective text | Decided | Owner calls, 9 November |
| 5 | The lowering gets a strike beat | Decided | Owner, 14 November (his third note above) |
| 6 | The slide waits 1.0 s with a bell, blinking stripe lamps and chocks; eased; a flare at the new sockets | Default | DESIGN.md 7. Tunable |
| 7 | The platform carries its riders at 5 m/s; anyone in its path is lifted on | New | **Recommendation: yes.** "What looks solid is solid" (2 November); replaces build 1 call 28's "no collider while they move" |
| 8 | The island ring is never offered from the deck it lands on; a rope ties it to the pad | New | **Recommendation: yes.** A ring means "to me" everywhere else; three wrong pulls in 9 s |
| 9 | The hook does not cross the gap forward | New | **Recommendation: keep.** Owner question 1 |
| 10 | The take-off board, windsock and landing cloth in the glider's cream and teal; cloth means glide | New | **Recommendation: yes.** The crossing has no cue of its own; draw-only, adds no reach |
| 11 | The strike beat's content: a mallet on the strut, the pawl flying out, trauma 0.35, a 4.2 s shared shot ending on the glint; a part-drop and lit brackets when weights are owed | Default | Reuses the throat's pieces; all tunable |
| 12 | The steel works' sign leads with the kit line; ghosts on the pallets and rack; blocked reason "The kit comes by train" | Default | Footings-signalling's ghost and blocked-prompt grammar |
| 13 | Railhead rack tag "Next load: on the wagon" | Default | 55 s idle at the rack |
| 14 | Two resident lines about the kit | Default, held | Not built until the owner approves (question 3) |
| 15 | The island's first kit loads from the leaf going down | Default, already logged (build 2 ruling F) | Its 90 s condition was met (117 s). Sim, v45; dispatch separately |
| 16 | Ring Island gets the upright halt display; the table stays as a flat copy | Default | Halt boards show the island map (9 November); his P3 note |

Count: **5 decided, 7 default, 4 new.**

### Findings

1. **(change before building anything else here) The island ring fails "what's on screen is true"** and misdirects at
   the one place the route needs a clear forward. Evidence: three pulls in 9 s, his words, and the code (the only ring
   whose landing is not under it). Step 1 is two lines of local rule and goes first.
2. **Rule 1, "the next goal can be found"
   ([progression-flow-layout](../research/progression-flow-layout.md#the-rules-as-lenses)), is thin at the take-off.**
   The strut is in sight (key in sight of the lock holds), but the means is unnamed. He crossed in 22 s, so this is a
   lens, not a bug; the board is cheap and rides with step 3.
3. **Rule 3, nobody is stranded, holds and is unchanged**: a missed glide swims to either ramp, and a forward splash
   lands at the hinge ramp, which goes on. The ring's job (home from their side) is kept by H-A. Reach is unchanged by
   every step: step 1 removes an offer, steps 3 and 5 are draw-only, step 4 moves a rider along a deck that already
   exists under them. Proof asked of the builder: level-check for the ring and the greybox eval's hook case.
4. **Route contract** ([route-contract](../research/route-contract.md)): no travel or work edge changes. H-B would add
   a travel edge after the work is done (legal), and is the owner's because it changes what the glider is for.
5. **The slide breaks a decided rule for 3 s** (what looks solid is solid). S3 is the fix; S1 alone is a patch.
6. **The wait on arrival is past its own logged limit** (117 s against 90 s). Signs make it readable; only the sim
   change shortens it.
7. **Co-op.** Split is natural (one glides and knocks, the others hang weights); the shared shot gives the weight
   hangers the payoff. S3's rider sync is the one co-op risk in the plan. A friend arriving after the leaf is down
   sees it flat and no ring is needed. Solo, brace-first is the only order that uses the ring; it stays for that.
8. **Research:** [level-design](../research/level-design.md) and [wordless-onboarding](../research/wordless-onboarding.md)
   (the ask at the place, in the object's shape) are followed; nothing contradicted. Port check: nothing here is ported
   from Place except the hook's maths, which still earns its place.
9. **Not looked at.** No stills: `npm run look -- --rail-seed gap-footed` from the take-off sat behind eight queued
   look jobs and did not run. Whether the ring, the strut and the hinge are framed together from the take-off, and
   whether the windsock would read from the rack, is unverified; steps 1 and 3 carry those stills. Falls were not
   measurable (finding in the data section; step 8).

### Owner questions

1. **Should the hook also carry you forward across the gap, as you read it?** Recommended: no. Keep the glide as the
   crossing and make the ring plainly the line home; revisit if the next session still shows a hook press at the
   take-off.
2. **Ride the platform when the railhead moves, rather than being dropped?** Recommended: yes (S3), after the
   telegraph ships.
3. **Add the two island lines about the kit?** Recommended: yes to the first ("Nothing to carry yet..."), spoken by
   the talker nearest the east platform, in your wording.
