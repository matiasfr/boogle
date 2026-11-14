> **Status: proposed (2026-11-14). Design only; nothing built.** Signalling for the footings sequence, from the kiln to
> the pier's twelfth footing, after the owner's 14 November session. Base: `origin/main` at `d5a3ada6d`. Option A
> (recommended) is view-only and needs no bump; options B and C change sim rules and take the next free `WORLD_NS`
> (v45, which [level-pacing-1114](level-pacing-1114.md) step A2 has also asked for: whichever ships first takes it).

# Footings signalling: from the kiln to the pier

## Goal

A player who has never seen the Works knows, at every step from the breaker to the pier's twelfth footing, what the
next thing is and where it goes, from the world and its boards. In particular: the moment the stall's second footing is
set, the game shows that the rest go by train and what makes that happen. Serves DESIGN.md 7 (Telegraph everything) and
11 (Show, don't tell); no mechanic is added.

## The owner's words (14 November 2026, verbatim)

"Rotunda" is the Roundhouse stall.

1. "I ended up setting the footings on the rotunda, but it was really confusing. I didn't know, unless I had played
   before, that I had to do that. And then I didn't realize that after I set the two footings, I was supposed to set the
   rest of the footings back at the pier. There was no signaling for that, and it was very unclear."
2. A few minutes later: "Also, I'm confused. Do I have to bring all the footings to the pier by hand? I haven't been
   able to unlock the train engine I set the footings on this time around. What should I do next?"
3. Then: "Okay, I see where I got stuck. There is never any prompt to bring 8 rails to the cradle stall."

Same session, fixed in other jobs: the kiln's prompt said place stone or wood when it needs set amounts of each; the
cart's rack tag always says "More coming".

Earlier, the same stretch: 10 November, after the session with a friend ([playtests](../playtests.md)): "didn't know
what to do at the stall and cradle, or why to turn the table". [works-late-game](works-late-game.md) step 3 answered
with a sim rule (built: Turn the table only when ready) and four view cues (a wagon ghost on line 2, eight rail ghosts
on the cradle, "Bring rails", a glinting handle). **The four view cues were never built**: `roundhouse-view.ts` has the
socket ghosts and nothing for the cradle or the table, and the call is still `open` in
[agent-calls](../agent-calls.md) (10 November, "a dashed gold wagon ghost..."). The cradle has now cost him two
sessions.

## What the code does today

- **`Fit the cradle`** (`src/entities/railway/roundhouse-view.ts`, `targets()`): offered only when all of these hold:
  the stall has both footings, the cradle has fewer than 8 rails, **you have at least one rail on your back**, and you
  stand within 4.6 m of the stall's anchor (940, 28). With an empty back, or with logs, stone or a footing, there is no
  prompt at all, not even a blocked one. Nothing in the world counts the rails, draws the missing ones, or names the
  forge. A player learns the step only by walking into the stall already carrying rails.
- **`Turn the table`**: offered only once the cradle is fitted, within 5.4 m of the table (942, 17). No glint, no board.
- **The tarp**: slides off when the second footing is set and shows the shunter and the wagon. Neither has a prompt.
  The wagon's cradle is drawn empty (wood and steel), brass once fitted.
- **The pier by hand**: `rail.footSet` site 2 (`src/sim/railway-sys-works.ts`) accepts a footing off anyone's back from
  the moment Q6 is laid, wagon or no wagon. The pier rack stands empty at the halt from the kiln's first cast. So the
  one path the world offers an uncued player after the stall is the by-hand one: 527 m a footing, which
  `npm run loop -- node crossing` prices at 6,329 s (105 min) solo for the twelve, against 108 s by wagon.
- **No objective text is shown** in the live game (place.md, "The world gives direction"; the session data's
  "no objective line on this page").

**No bug found.** `rail.footSet` site 0 increments `shed.stall` with no other condition than the slab struck; the loop
trace marks `stall` reached for his session (two `footing set` marks at site 0, 4:54 and 6:53); the `stall-done` seed
drives the same ops. His room is in the designed state "stall raised, cradle 0/8, table not offered", and nothing is
blocking except that nothing asks. Not checked: the live room's `shed` row itself (read from marks, not from the save).

## His session (playdata, untrusted browser-sent data, read as data)

`npm run loop -- trace --since 2026-11-14`; sessions `mwg5rbci-qmahkos6` (08:42 UTC, 6 min 24 s, solo, iPad) and
`mwg62675-pa1sp3rr` (08:51 UTC, 3 min 27 s, after a reload onto a new build).

| At | What happened | Reading |
| --- | --- | --- |
| A 0:45 | breaker taken | |
| A 2:06 | throat struck | He went to the quarry first |
| A 2:27, 3:05 | kiln filled, 16 then 16 | Two "Bring logs or stone" refusals; walked 4.1 times the predicted distance (kiln is the trace's second most confused node, 26.0) |
| A 3:46 | footing shouldered | 19 s idle on the quarry platform waiting for line 2 |
| A 4:50 | stall slab struck, **with the footing already on his back** | He carried it home before the sockets existed: he knew from having played, as he says |
| A 4:54, 6:53 | the stall's two footings set | Round trips of about 2 min each |
| A 7:03 to 8:20 | called a train, rode back to the quarry, shouldered a **third** footing | No pause at the stall: he never looked for a next step there because nothing showed one |
| B 1:50, 1:54 | reached the pier, set the third footing **at the pier by hand** | The by-hand route, accepted by the sim |
| B 3:48 to 4:24 | back at the quarry, a fourth footing on his back, on the train again | Then his second message |

From the second stall footing to his question: about six minutes of play, one pier footing set by hand and a second on
his back. `Fit the cradle` and `Turn the table` were shown **zero times** in both sessions. He did not stall by standing
still (idle 3%); he went down the wrong road at full speed. That is the thing to design out.

## The sequence as a player meets it

Positions from `src/sim/railway-works-layout.ts` and `railway-line2-layout.ts` (world metres; the Home flip moved the
stall since the 10 November plan). Walk 5.6 m/s, footing 3 m/s.

| # | Must do | Where | Carrying | What tells them today | Cue? |
| --- | --- | --- | --- | --- | --- |
| 1 | Take the breaker | Forge pedestal (922, −1) | nothing | Forge plume and whistle; prompt | yes |
| 2 | Strike the stall seam | Cracked slab (941, 25), 32 m from the pedestal | breaker | Gold motes up the crack, breaker glints, zigzag on the halt maps, a resident's line | yes |
| 3 | Strike the throat | Quarry cut (1119, 82), a train ride | breaker | Motes, map zigzag, the throat shot | yes |
| 4 | Fill the kiln, 16 logs and 16 stone | Kiln (1128, 87) | logs, stone | Trodden path, **Kiln** fingerpost, gold ghosts, bill "logs 0/16 stone 0/16", blocked "Bring logs or stone" | yes (prompt wording being fixed elsewhere; the loop graph still lists it as no cue) |
| 5 | Shoulder a footing | Works rack (1088, 50) | empty back | Footings roll down the rollers onto the rack; prompt | yes for taking it. **NO CUE for how many are owed or where they go** |
| 6 | Carry two to the stall | Stall sockets (940, 28): 11 m to the halt, a ride, a short walk | one footing each trip | Two dashed gold ghost footings in the sockets, seen only at the stall and only after step 2 | **NO CUE at the rack.** The answer is 150 m and a train away |
| 7 | Fit the cradle with 8 forge rails | Wagon in the stall; rails from the forge rack (915, 10), 31 m, 5.5 s each way | 8 rails | Nothing, unless rails are already on your back within 4.6 m | **NO CUE** (confirmed by the owner) |
| 8 | Turn the table | Table handle (942, 17), 12 m from the stall | nothing | The prompt, once fitted | **NO CUE** beyond a prompt you must be standing at |
| 9 | (Nothing: the wagon rolls out, couples to line 2 at the Village, loads six at the Works rack, unloads at the pier rack) | | | You can watch it, if you are there | **NO CUE** that this is how footings travel now |
| 10 | Shoulder and set twelve | Pier rack and jib at the pier head | one footing | Stakes and glowing sockets at the bents; prompts | yes at the pier. **NO CUE that by hand is the wrong way**: the jib takes a hand-carried footing from Q6 on |
| 11 | (The twelfth: whistle, pull-out, rockets, "Next stop: Ring Island") | | | | yes |

Five uncued places: where footings go (5, 6), the cradle (7), the table (8), the wagon as the carrier (9), and the pier
by hand (10). Steps 7 to 9 are the whole reason the two stall footings matter, and they are the silent ones.

## Design

The channels, in the order DESIGN.md 11 and the decisions give them: the world's own shapes and gold first
("gold means this is for that", place.md); then a painted board at the place (owner, 9 November: signs in the world
before hovering text; station bills); then a few plain words where they are the clearest answer
([Signposting: words and beacons are allowed sparingly](../decisions-core-loop.md#d-2026-11-09-signposting-words-and-beacons-are-allowed));
then a character's town-side fact; the objective marker last and sparingly
([10 November](../decisions-core-loop.md#d-2026-11-10-the-objective-marker-may-come-back)). No objective text exists
to use. Everything below is Local over accepted state, so a friend and a late joiner read the same boards; motes are
off under reduced motion, ghosts and boards stay.

### Option A: boards, ghosts and blocked prompts on the props that exist (view-only, no bump). Recommended

**A1. The cradle asks for its rails in the open (dispatch today).** When the stall's second footing is set, in the same
beat as the tarp sliding off:

- **A bill at the stall door**, the station frames' board (`signBoard`, `paintTwoLines`, the bills' cream and ink),
  on two posts beside the door on the forge side, facing the approach from the forge rack and the halt, bottom 1.5 m up:
  **Footing wagon** / **rails 0/8**. The count rises as rails go in. It uses the bills' own "rails 0/12" form, so it
  reads as the same kind of ask as every station. It stands from stall-done until the cradle is fitted. Positioned from
  `stallPoint`, so it moves with the stall when the rotunda plan moves it.
- **Eight dashed gold rail ghosts** on the cradle's arms (the kiln's and sockets' ghost grammar,
  `src/render/ghost-outline.ts`), each going as its rail bolts on.
- **`Fit the cradle` is offered to everyone in reach** once the stall stands: with no rails on your back it shows
  blocked, **"Bring rails from the forge"** (the kiln's "Bring logs or stone" grammar). With a footing on your back at
  the wagon, **`Set the footing`** shows blocked, **"The wagon carries the rest"**: that is the player who came home
  with a third footing, at the exact moment of the misread.
- **The forge's rails rack gives off the gold motes** while the cradle wants rails (as the limestone rocks do while
  the hopper wants stone): the source wears the same gold as the ask, 31 m away (whether it is in sight from the door is for step 1's stills).

**A2. The table.** When the eighth rail is in, the bill's small line changes to **Turn the table** (the station bill's
own "Pull the lever" turn when a gated frame is full), and the table's handle glints gold while the turn is offered.
The bill goes when the wagon rolls out. A dashed gold ghost of the wagon stands on line 2 at its wait from stall-done
until the wagon is there (the 10 November call): it shows what the turn is for.

**A3. The Works rack says where footings go.** A board beside the Works rack (the depot rack's board, which already
shows the train drawing on a train-fed stretch), from the first cast: title **Footings**, small line by state:

| State | Small line |
| --- | --- |
| Stall wants footings | **stall 0/2 by hand** |
| Stall raised, wagon not out | **pier 0/12 by wagon** |
| Wagon out | **pier 3/12 by wagon** (rising) |
| Crossing footed, Q7 laid | **railhead 0/14 by wagon**, then **weights 0/4** |

"By wagon" before there is a wagon is the point: it answers "do I carry them all by hand?" at the rack, where he
shouldered the third one, and the stall's bill answers "what wagon?".

**A4. The pier and the map.** A bill at the pier jib, **Pier** / **footings 0/12**, from the first cast to the twelfth
(the stakes and sockets say where; nothing says how many). On the halt displays' map, a small dashed gold footing mark
at the place the next footing is wanted (the stall, then the wagon's stall until it is out, then the pier), in the same
two instanced quads' pass as the seam zigzags and the kiln's square. That is the "footing in hand shows where it can
go" cue at its cheapest; a line or marker in the world from the carried footing is not proposed (a beacon, and the
boards cover it).

**A5. The loop graph.** `dev/loop/graph.ts` cues for `kiln`, `stall`, `cradle` and `table` are updated as each lands,
so `npm run loop` stops listing them under "No cue".

**The shunter.** No prompt is added to it. The bill stands at the wagon and names the wagon, and the ghosts are on the
wagon's cradle, so the thing to act on is the wagon, not "the engine I should have unlocked".

Cost: view-only, `roundhouse-view.ts`, `works-view.ts`, `crossing-view.ts`, `halt-map.ts`, one loop graph edit; no op,
wire shape, save or bump. About five draws (three boards, one ghost batch, one mote emitter). A1 is half a day; the
rest a day.

### Option B: A, and the pier refuses a hand-carried footing until the wagon is out (sim rule, v45)

`rail.footSet` site 2 needs the wagon commissioned (`shed.ready ≥ 0` or coupled); before that, at the jib with a
footing, `Set the footing` shows blocked, "These come by wagon". Rooms that already hand-set some stay valid (the
count is kept). It closes the 105-minute road instead of signing it. Costs a rule change every tab must share (v45), a
bot route check and `npm run loop -- run`. Rule 3 holds (the wagon is always reachable: rails come from the forge).

### Option C: reorder so no footing goes by hand (sim, seeds, bot, loop graph, v45)

The slab strike and eight rails raise the stall and fit the wagon; every footing, the stall's two included, rides the
wagon; or the first two casts go to the stall by themselves. It removes the loop's largest grind (`stall`, 299 s solo)
and the only moment a footing's destination is far from where it is made. It **reopens the owner's 10 November answer
1** ("just the stall's two footings go home by hand", the deliberate "before" to the wagon's "after"). Two to three
days, and the `stall-done` to `wagon-on` seeds move.

### Recommendation: Option A, A1 today

The order is not the problem. This session he did the two stall carries in about two minutes each without complaint;
what failed is that the "after" was invisible, so the "before" read as the whole job. A makes the stall's second
footing the hand-off: tarp off, bill up, eight gold ghosts, a ghost wagon on line 2. Keep the 10 November decisions as
they are; do not reopen answer 1. Hold B unless a session after A still shows a footing carried to the pier by hand.

## Build steps

Each is one dispatch, view-only, with its proof. Stills with `npm run look -- --rail-seed <stage> --cam … --look …`.

| # | Step | Proof |
| --- | --- | --- |
| 1 | **A1** in `roundhouse-view.ts`: the stall bill "Footing wagon / rails n/8", eight rail ghosts, `Fit the cradle` offered blocked with "Bring rails from the forge", `Set the footing` blocked with "The wagon carries the rest", motes on the forge rails rack (wherever that rack's view lives) | Seed `stall-done`: stills from the forge rack (31 m), from the Village line 2 platform, and at the door with an empty back showing the blocked prompt; the bill must be readable in the first two. `inspect` reports the bill's text and the ghost count; a test that the prompt is offered with 0 rails and is blocked. Reduced-motion still |
| 2 | **A2**: bill turns to "Turn the table", handle glint, wagon ghost on line 2 | Seed `cradle-fitted`: stills at the door and from the table; seed `wagon-on`: bill and ghost gone |
| 3 | **A3**: the Works rack board and its four states | Seeds `works-lit`, `stall-done`, `wagon-on`, and a railhead seed: one still each from the quarry platform end |
| 4 | **A4**: pier bill; the map's footing mark | Seed `works-lit` at the pier head and at a halt display; `crossing-done`: both gone |
| 5 | **A5** and docs: loop graph cues; place.md's Works section | `npm run loop` lists no `stall`, `cradle`, `table` or `kiln` under No cue; `npm run loop -- run` unchanged |

## Draft strings (UI copy, none The Boogler's; no existing line changes)

- Stall bill: **Footing wagon** / **rails 0/8**; then **Footing wagon** / **Turn the table**
- `Fit the cradle` blocked: **Bring rails from the forge**
- `Set the footing` at the wagon, blocked: **The wagon carries the rest**
- Works rack board: **Footings** / **stall 0/2 by hand**, **pier 0/12 by wagon**, **railhead 0/14 by wagon**,
  **weights 0/4**
- Pier bill: **Pier** / **footings 0/12**
- Option B only: `Set the footing` at the jib, blocked: **These come by wagon**
- DRAFT resident line, not in the recommendation (question 2), a town-side fact like the existing `breaker` one:
  "That wagon in the old stall won't carry a thing till somebody gives it rails."

## Design review (designer, 2026-11-14)

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The stall's two footings go home by hand; the cradle takes 8 rails; the kiln casts the rest for the wagon | Decided | [10 November, late game answer 1](../decisions-rail.md#d-2026-11-10-the-late-game-s-five-open). Not reopened |
| 2 | Turn the table is offered only when ready | Decided | [10 November](../decisions-rail.md#d-2026-11-10-turn-the-table-only-when-ready). A2 adds a cue, not an earlier prompt |
| 3 | Boards in the world before hovering text; a few words allowed | Decided | Owner, 9 November (signs; signposting) |
| 4 | No objective text; the marker only where nothing else works | Decided | 3 and 10 November. Not used: boards work here |
| 5 | Stall bill at the door, "Footing wagon / rails n/8", from stall-done to fitted; eight rail ghosts; forge rack motes | Default | Builds the open 10 November ghost call and adds the bill the owner's third message asks for |
| 6 | `Fit the cradle` offered blocked to anyone in reach; `Set the footing` blocked at the wagon | Default | "What's on screen is true": a prompt that only exists when you already know the answer teaches nobody |
| 7 | Bill turns to "Turn the table"; handle glint; wagon ghost on line 2 | Default | The station bill's lever line; the 10 November call |
| 8 | Works rack board with "by hand" and "by wagon" | Default | Answers the misread where the footing is picked up |
| 9 | Pier bill and the map's footing mark; no in-world line from a carried footing | Default | Cheapest form of "where can this go" |
| 10 | `cradle` and `table` each get a cue of their own | New | Reverses today's rotunda review row ("`cradle` and `table` stay NO CUE"). That row was about what doors can say; it left the beats uncued, and the owner hit exactly that hours later |
| 11 | The pier's by-hand route stays open (no option B yet) | New | A signed road nobody takes costs nothing; closing it costs a bump. Revisit on evidence |
| 12 | No prompt on the shunter | Default | The wagon is the thing; a second prompt in the stall splits the ask |

### Findings

1. **(change before building anything else here) The cradle beat fails rule 1, "the next goal can be found"**
   ([progression-flow-layout](../research/progression-flow-layout.md#the-rules-as-lenses)). Evidence: the prompt's
   condition in code, zero showings in two sessions, the owner's three messages, and the same note on 10 November. It is
   a bug in the layout sense, not a lens. Step 1 fixes it.
2. **The key is out of sight of the lock twice** (lens 4): footings at the Works rack with their sockets 150 m and a
   ride away, and the wagon in a stall with the pier a kilometre off. Neither is an exception that works: the player
   loses the thread (he did). A3 puts the lock's name at the key. The stall carry itself stays; a quiet ride with a
   footing is fine once you know where it is going.
3. **The route contract is untouched by A** ([route-contract](../research/route-contract.md)): no collider, no travel
   edge, no op. B changes a work edge's condition and needs `npm run loop -- run` and the railway bot.
4. **The by-hand pier route is a trap priced at 105 minutes solo** (`npm run loop -- node crossing`). It is legal
   work, so rule 2 holds, but it is the path the world currently points to. A signs it; B would close it.
5. **The rotunda plan must carry these cues.** It moves the stall and the table; steps 1 and 2 hang off `stallPoint`
   and the table's anchor, and the rotunda's step 1a should re-take step 1's stills.
6. **Co-op.** Rails for the cradle are the natural second player's job while the first carries the second footing;
   the bill standing from stall-done (not from the first footing) means that job is only visible late. Left as is: the
   stall cannot take rails before it stands (sim), and the bill should not ask for what is refused.
7. **Not looked at.** No stills: `npm run look -- --rail-seed stall-done` was killed after 4.5 minutes on a loaded
   machine (load 66). Whether the bill reads from the forge rack and the platform, and whether the door's forge side is
   clear, is unverified; step 1's proof stills are where that is judged, and the bill moves if they fail.
8. Research: [level-design](../research/level-design.md) and [wordless-onboarding](../research/wordless-onboarding.md)
   both put the ask at the place and in the object's own shape first; A follows them. Nothing here contradicts a
   recommendation.

### Owner questions

1. **Should the pier refuse a hand-carried footing until the wagon is out (option B, a rule change and v45)?**
   Recommended: not yet. Ship the boards, and close the road only if a later session still shows a footing walked to
   the pier.
2. **Add the resident's line about the wagon?** Recommended: no for now. The bill at the door says it at the place;
   keep the line in reserve.
