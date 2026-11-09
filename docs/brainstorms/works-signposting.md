> **Status: building (2026-11-09): the smallest first build, suggestions 1 and 2.**

# Works signposting: each strike points at the next thing

Seed (owner, 9 November, P1 in [round-4-notes](../plans/round-4-notes.md#owner-session-9-november-desktop-live-build-ranked)):
"im confused on what's supposed to occur with the breaker once I hit it next to rotunda". His data: breaker taken at
14:55, stall slab struck at 15:00 (session `mw9prlct`); next session (`mw9qd5qq`) throat struck at 0:48, then **43 s
standing at the quarry halt (1065, 42)**, a train away, and 2 min idle at the pier. He never walked the 56 m from the
halt into the cut, and never carried logs or stone there, so "Fill the kiln" (shown only to a loaded back within
4.1 m of the kiln, `works-view.ts` `targets`) never appeared: "I've done all the progress I can I think".

Designer pass, no panel. Positions are world metres (local x + 1000) from `railway-works-layout.ts` and
`works-shape.ts`; walking 5.6 m/s. **Not seen:** the four stills planned here (halt, stall, kiln after the strike;
stall before) sat behind about ten queued look jobs and were stopped after 5 minutes. Every sightline below is
reasoned from the map, not from a picture.

## Pitch

The Works chain is real but silent: each strike opens something, and nothing at the opened thing says what it wants
or where the next lock is. Fix it with one grammar the game already uses, not with words: **gold means "this is for
that"**. The breaker's gold motes reappear on the seams it hasn't struck yet; each empty place a thing goes (the
kiln's log cradle and stone hopper, the stall's two sockets, the wagon's cradle) shows a dashed gold ghost of what
fills it, the same `GOLD_ROPE` outline the boiler plan puts on the old train's saddle; and the throat's camera shot,
now that cinematics can't be cut short, ends on the cold kiln's two empty bays. Serves **DESIGN.md 11, Show, don't
tell** and **7, Telegraph everything**, and the owner call **Machines show their work physically** (the ghosts empty
as the real logs, stone and footings land). It bends nothing.

**Correction to the seed:** the two seams are **216 m** apart in a straight line, not 500 (stall seam (912.4, 17.6),
throat (1119, 82)); by line 2 it's an 8 s ride from the village halt plus a 10 s walk from the quarry halt. The
second lock is close; it's the *kiln* that loses people.

**Research.** [wordless-onboarding](../research/wordless-onboarding.md) recs 3 and 5: a grey thing must say why it's
shut, and attention needs a nudge (Portal's sound and particles), which is the cold kiln's problem and the motes'
job. [progression-flow-layout](../research/progression-flow-layout.md#the-rules-as-lenses) rule 1 (the next goal can
be found) is what links 3 and 5 break today; lens 7 (end a beat facing the next) is the throat shot; lens 4 (key in
sight of the lock) is broken on purpose at link 3, since the footing is made 216 m away, and the ghosts are what keep
that exception readable. [level-design](../research/level-design.md) rec 3: these are small shapes that reward a look,
not landmarks. [route-contract](../research/route-contract.md): nothing here adds a travel or work edge, so no reach
changes and the bot's route is untouched.

## Gut question

**After each strike, did you know what the opened thing wanted, without anyone telling you?**

## The chain, link by link

| # | Just did | Standing at | Can see from there | Today's pointer | The wordless pointer to add |
| --- | --- | --- | --- | --- | --- |
| 1 | Laid Q6 at the pier | Pier head (1400, −360) | Far Head, the trestle; the forge is a speck | Forge plume (62 m) and whistle to 900 m, gold motes at the pedestal | Nothing new (home-flow finding 3, already built) |
| 2 | Took the breaker | Pedestal (919, 5.4) | Cracked stall slab 14 m away | Slab's painted cracks | Gold motes trickle from the slab's cracks while the breaker is out (Suggestion 2) |
| 3 | **Struck the slab** (stall opens) | Stall door (912, 18) | Tarp over two shapes, two grey sockets in front, the turntable | **None.** Breaker stays on your back | Gold ghost footing in each socket; gold motes on the throat seam, seen from every line-2 train at the quarry halt; the breaker keeps glinting on your back while a seam is left (Suggestions 2, 3) |
| 4 | Rode or walked to the quarry | Quarry halt (1081, 41) | The split rock; the throat 56 m south-east, its dark zigzag | The zigzag; the cold roller road and its broken sample footing by the rack | Gold motes at the throat (same as 3) |
| 5 | **Struck the throat** (cut opens) | Throat (1119, 82) | The kiln 10 m in; two limestone rocks 25 m beyond in the bowl | A 3.6 s shot aimed roughly at the kiln; "Fill the kiln" only with a loaded back | Shot ends on the two empty bays, dashed gold logs in the cradle and gold stones in the hopper; the two bowl rocks glint (Suggestion 1) |
| 6 | Filled 16 + 16 | Kiln | Fire, chimney smoke, a footing rolling to the rack | Strong already (whoosh, glow, rollers) | Nothing |
| 7 | **Shouldered a footing** | Rack (1088, 50) by the halt | The halt; home is not in view | "Shoulder a footing" | Nothing new: the gold ghosts in the stall sockets (from 3), seen at Home on the way out, are where it goes |
| 8 | Set two at the stall | Stall | Frame rises, tarp slides off, wagon with an empty cradle | Prompts once near | Gold ghosts on the wagon: two footings and eight rails; the forge rack 15 m away has the rails (Suggestion 3) |
| 9 | Fitted the cradle | Stall | Turntable 6 m | "Turn the table" when in reach | Nothing: in reach and one press |
| 10 | Wagon on line 2 | Anywhere | Pier's 12 empty sockets, seen since Q6 | The sockets | Gold ghosts in the 12 pier sockets, same as the stall's |

**Where a first-timer stalls, most to least likely:**

- **Link 5, the kiln (observed).** You arrive with an empty back, because the breaker rides on an empty back and you
  came to strike. The cold kiln is a grey box with two dark, low bays that don't read as "logs here, stone here". The
  nearest choppable tree I found in `RAILWAY_SOURCES` is source 29, about 180 m away; the plan's logs come from Home.
  The stone is 25 m away but the rocks don't say they're for anything.
- **Link 3, after the first strike (observed: his quote).** The stall opens onto things that wait for a footing
  nobody has seen yet. The only footing in the world is a broken sample at the quarry rack, 216 m away.
- **Link 7, the first footing (predicted).** Weaker risk: the shoulder prompt and the train make it likely, and the
  stall's sockets have been in view at Home since the first hour. The gold ghosts from link 3 cover it for free.

## Best suggestions

1. **The kiln shows its empty load in gold, and the shot ends on it** (play, creative). While the throat is open and
   the kiln is unlit, draw a dashed `GOLD_ROPE` ghost of the missing logs in the cradle and of the missing stone in the
   hopper. Each ghost goes as the matching real piece lands (`drawKiln` already stacks the real ones, so the ghost is
   just the unfilled slots). Both bowl rocks give off the breaker's gold motes until the hopper is full. Retarget the
   throat shot (`throatShow`) to end on the loading frame from the halt side, holding a beat on the two bays. This is
   the link the owner stopped at, and the one that teaches both kinds at once: stone is 25 m away (fill it, learn the
   press), logs mean a trip, which is the "before" the footing wagon later repays.
2. **The breaker's gold goes to what it opens** (systems, creative). The pedestal already sheds gold motes. While the
   breaker is out (`works.breaker === 2`), each unstruck seam trickles the same motes from its crack, and the breaker
   on your back glints while a seam is left. The throat is 56 m from the halt, so every line-2 train that stops there
   shows it; a strike stops that seam's motes for good. Same colour, same particle, no new art: "the gold thing on my
   back wants the gold crack over there".
3. **Every empty place a part goes shows a gold ghost of that part** (creative, play). The stall's two sockets each
   show a ghost footing once the slab is down; the wagon's cradle shows two ghost footings and eight ghost rails once
   the tarp is off; the pier's twelve sockets show ghost footings from Q6 on. The ghost is a footing's silhouette, so
   the broken sample at the quarry rack, the first rolled footing and the sockets all read as one shape. It's the
   boiler plan's saddle outline, so one helper serves both.
4. **The stall strike gets a short shot only if a still says the split rock reads from the stall** (creative).
   Zelda's door shot, reversed: slab falls, camera lifts and turns along line 2 to the split rock (direction computed
   from `WORKS_SEAMS[0]` to `WORKS_SEAMS[1]`, so the Home move needs no new numbers). If the town or terrain hides the
   rock at 216 m, skip it: Suggestion 2 and the train do the job.
5. **A little guy fills the first log, once** (play). Only if 1 to 3 leave people stuck: after the throat opens, a
   quarry little guy carries one log of the 16 from the cut's mouth into the cradle while you watch. It must be a real
   counted log, or nothing (DESIGN.md 11: "What's on screen is true"), so it is a rule change and waits.

**What I would NOT add:** words of any kind (no tag, banner, "Bring logs and stone" blocked line) in the first build;
an objective marker, arrow or beacon (removed 3 November); a second plume or whistle (the forge's call means "the
forge made something, go home", and moving it to the Works would muddle the rhythm three returns have taught); a new
log source at the Works (an economy call, Open question 3); and gold on anything that isn't waiting for a part, or the
language stops meaning anything.

**Tension.** Ghosts in gold on six sites risk the "Disneyland" warning ([progression-flow-layout](../research/progression-flow-layout.md#4-signposting-the-next-goal-without-ui))
and the blue shafts the owner found heavy. Recommendation: thin dashed lines, no glow, no pulse; a ghost appears only
when its site is *open* (stall down, throat down, tarp off), never before.

## Shape

- **Sync:** all Local view, derived from accepted state already in `inspect()` (`works.breaker`, `works.seams`,
  `works.kiln.logs`/`stone`/`lit`, `shed.stall`, `shed.cradle`, `shed.cradleRails`, `works.pierSet`). No op, rule,
  wire, save or `WORLD_NS` change; no new control or string. Restore snaps (ghosts and motes are pure state), so a
  reload or late join reads the same.
- **Reuses:** `breaker-view.ts`'s mote emitter (seams, rocks, the back), `works-box-view.ts`'s batch for ghost boxes,
  `GOLD_ROPE`, the throat's `createCameraPullOut`. The dashed outline is the boiler plan's step 6 helper: build it once,
  whichever lands first.
- **Smallest first build** (Suggestions 1 and 2; about 120 lines in `works-view.ts` and `breaker-view.ts`): kiln
  ghosts, rock motes, seam motes, the retargeted throat shot. That alone would have taken the owner from the halt to
  the bays, shown him "logs and stone" and put stone in his hands 25 m away. Suggestion 3 is the next 60 lines in
  `roundhouse-view.ts` and `pier-view.ts`.
- **Co-op:** every ghost and mote is drawn for everyone, so a friend who didn't strike reads the same bays. The shot
  plays only for the striker (`e.pid === state.pid`, as today); others see the slabs topple live. Two players split
  naturally: one mines stone while the other rides home for logs, and each watches the other's ghosts empty. A late
  joiner gets no shot (right: restores never replay shows) but sees whatever is still gold, which is exactly what's
  left to do.
- **Home rebuild:** the home-station plan (`docs/plans/home-station.md`, not yet on main) moves
  the stall to (940.6, 25.5), the seam with it (`WORKS_SEAMS[0]` 94063, 2549), the pedestal to (922.0, −1.05) and the
  table to (942.1, 17.1), in v24. Nothing here is sited by hand: seam motes read `WORKS_SEAMS`, socket ghosts read
  `STALL_SOCKETS`, the stall shot's direction is computed seam to seam. After the move the seams are 187 m apart and
  the pedestal is 32 m from the stall seam (today 14 m), so Suggestion 2's slab motes matter more there.
- **Risks:** the motes' particle cost at the pier (440 a second already; the forge call left the pool for its own
  instanced mesh for that reason, so keep seam motes to a few a second); gold ghosts z-fighting with the sockets'
  floor plates; mobile readability of thin dashes at 56 m.

## Done means

All `npm run look -- --rail-seed <seed> --eval dev/look/evals/railway-works-at.ts --query 'worksat=<pose>'` unless noted.

- `works-arrive`, `worksat=forge`: the breaker's motes at the pedestal; `worksat=stall`: no ghosts (slab still up) and,
  once the breaker is taken (`railway-works-act.ts` `worksdo=take`), gold motes off the slab's cracks.
- After `worksdo=strike0`: `worksat=stall` shows two ghost footings in the sockets; `worksat=halt` shows gold motes at
  the throat from the halt platform, at walking height and on the phone camera. A still from the stall door toward the
  throat (`--cam 912,20,19 --look 1119,30,82`) decides Suggestion 4.
- `worksdo=strike1` with `workscam=play`: the shot's last frame holds both bays and their gold ghosts; `worksat=kiln`
  on `works-open` shows 16 ghost logs and 16 ghost stones; `works-stocked` shows only the missing stones; `works-lit`
  shows no ghosts and no rock motes.
- `stall-done` and `cradle-fitted`: wagon ghosts present, then gone; `worksat=pier` before any footing: 12 ghosts.
- A reload at each seed shows the same ghosts with no shot. Measured: particle pool turnover with `worksprobe=1` at the
  pier, before and after.
- Not provable by a still: whether a first-timer walks into the cut. The production bot knows the way; only the owner's
  next session (time from the throat strike to the first "Fill the kiln" press) answers it.

## Open questions

1. Is gold the one colour for "a part goes here", across the boiler's saddle, the kiln, the sockets and the pier?
   **Recommended: yes, thin dashed gold, only once the site is open.** Answer: ___
2. Should the stall strike get its own short camera shot toward the split rock? **Recommended: only if a still shows
   the rock from the stall door; otherwise the seam motes and the train carry it.** Answer: ___
3. Should the Works have logs of its own (a few trees in the cut, or a little guys' woodpile), so a player who arrives
   empty-handed can light the kiln there? **Recommended: not yet; the 16-log trip from Home by train is the "before"
   the footing wagon repays. Revisit if your next session shows a stall at the kiln with the ghosts in place.**
   Answer: ___
4. Words, if the ghosts aren't enough: a blocked kiln line for an empty back, like "Empty your back first"?
   **Recommended: no words in the first build; if needed, copy is yours** (a suggestion, not The Boogler's: "Needs
   logs and stone"). Answer: ___
5. Build order against the Home rebuild's v24? **Recommended: now, before v24; it changes no constant and reads the
   moved ones automatically.** Answer: ___

## Parked

- A little guy who fills the first log, once, counted (Suggestion 5; a rule change).
- The first footing to roll down the road wears a gold ribbon until it's set, so you can tell it's "the" one (creative).
- A ghost of the whole stall frame, drawn faintly over the ruin, before the slab is struck (creative; may spend the
  reveal too early).
- The works board on the station's south end wall ([upgrade-choices](upgrade-choices.md) suggestion 5) as a map of
  what's still gold, when there's a tree to show.
- Suspect copy already on the owner's list, unchanged here: "Take the breaker", "Strike the seam", "Fill the kiln",
  "Shoulder a footing", "Set the footing", "Fit the cradle", "Turn the table", "Help carry", "Let go", "Empty your back
  first".
