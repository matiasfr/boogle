> **Status: built on a branch, not shipped (2026-11-15): steps 1, 3 and 5 whole, step 2 without the reach, step 4 found
> already built; the reach and step 6 are sim work, listed under [As built](#as-built-15-november-2026).** Queue item D1 of
> [grant-1114-queue](grant-1114-queue.md). Base: `bff2e6203`. Steps 1 to 5 are Local view work with no bump, except step 2's
> reach, which the server also checks (see the design review). Step 6 is a room tunable. Nothing here changes a rule, a
> bill or an order. Facts corrected in place by the design review of 15 November, each marked "(corrected)".

# The forge's call: what to do after Far Head and after the pier

Serves DESIGN.md **7, Telegraph everything** and **11, Show, don't tell**.

## Goal

After Far Head and after the pier, a first-time player knows within a minute that something new waits at the forge,
and finds it on the first visit.

## What happened (Grant, session `mwh4pmui-mpbh7trk`, re-read from the raw log)

Both stalls are the same object: the pedestal on the forge apron at (922, -1), which holds the boiler after Q5
and the breaker after Q6. Its cue is the forge's call: a 62 m steam plume and one whistle. (Corrected: the two plumes do not stand in the same
place. The boiler's rises from the forge's chimney, by the owner's 9 November "the waiting boiler doesn't steam"; the
forge stands at (912, -12), about 15 m from the pedestal. Only the breaker's rises from the pedestal.)

| Clock | What he did | Distance to the pedestal |
| --- | --- | --- |
| 23:31 | Q5 laid at Far Head. On the same frame: Far Head's shared shot, the Act 2 card (1.5 s later), the glider waking on the summit, and the boiler cast on the pedestal while the plume starts at the forge's chimney (corrected). Far Head's show also sounds two whistles of its own | 488 m |
| 24:52 to 25:00 | Ran back to the forge and pressed at the rail rack (nothing in reach, 1 m from it). No boiler prompt was shown | 7 m |
| 25:05 to 27:40 | Climbed for the glider, flew, fell in at the diving helmet, walked back to Far Head | up to 500 m |
| 28:40 to 29:20 | Back to the village, then to the old train | 172 m at the train |
| 29:33 | Boiler prompt shown for the first time; taken a second later | 2 m |
| 30:36 | Fitted, after a 62 s haul of 172 m | |
| 32:31 | Q6 laid, the pier show, the breaker cast | 595 m |
| 34:14 to 34:29 | Rode a train back and came off it beside the forge | 8 m |
| 34:33 to 35:59 | The shop, the museum and a house; talked to Nell, Button and Pip | 40 to 60 m |
| 36:07 | Walked past again | 10 m |
| 36:51 | Last position, idle in the village. The breaker's prompt was never shown | 20 m |

So the long-range cue worked both times: he went back to the village without being told. The failure is the last
10 metres, three passes at 7, 8 and 10 m against a prompt offered within 3.6 m of the pedestal's centre (corrected: 4.2 m is
the server's allowance for the take, not the prompt's reach), and the moment itself, which stacks four
events and gives the one that gates progress the least screen time.

Not known: what he was looking at on each pass (no video), and whether he heard the whistle. Far Head to trains was
7 min 5 s, but about 2 min of it was the glider climb and flight, which he liked; the hunting was about 4 min.

## Why it misfires

1. **The show does not hand off.** Far Head's shot and the pier show end on the place just reached. The new part is
   cast 500 to 600 m behind the player, during the show, and its whistle sounds once, while the show plays (whether it is masked was not listened to).
   (Corrected: Far Head's show and the pier show each sound two whistles of their own in the same seconds, so the
   forge's is one of three, all the same sound.)
2. **The pedestal does not read as "the thing" from 10 m.** A plume 62 m tall is overhead and out of frame when you
   stand under it. The part sits low among the apron's racks, crane and heap. (Corrected: that holds for the breaker.
   The boiler's plume stands over the forge's chimney, so its call points at the forge building, 15 m from the
   pedestal, which fits his going to the forge's rack.)
3. **Nothing near it answers the question he asked.** At 24:52 he went to the rail rack, 13 m from the boiler, because
   Q6's sign told him its kit comes by train and he read that as "fetch rails". The rack gave no prompt and no
   reason. After the pier he asked three residents; their lines are jokes about the pier, not directions.
4. **The haul is slow with nothing to do.** 300 cm/s with sprint off: 57 s for 172 m alone.

## Proposal

Ranked. 1 and 2 are the fix; 3 and 4 close the two side doors he tried; 5 and 6 are smaller.

1. **Every completion show ends on the next thing to touch.** Far Head's shared shot gets a last cut of 2.5 s: the
   forge mouth pours, the boiler lands on the pedestal, the plume starts. The pier show gets the same cut for the
   breaker. The whistle moves to the start of that cut so it is heard in the clear. The cut is part of the existing
   shared moment (it plays for everyone and cannot be interrupted by accident, as decided on 9 and 10 November)
   (corrected: true at Far Head only. The pier show is rockets and two whistles with no camera shot, so its cut is a
   new 2.5 s shared shot. At Far Head the shot is 5 s and the Act 2 card covers 1.5 s to 6.0 s of it; the 11 November
   acts entry fixes that shot at 5 s with no second move. See the design review, findings 1 and 2), and
   the hand-back camera faces the forge's plume from wherever the player stands. This also answers Grant's G23 (more
   emphasis when the forge makes something). Total added length: 2.5 s per show.
2. **The pedestal reads at 30 m.** Three changes, all on the pedestal:
   - Lift the part: the forge's crane holds the boiler, then the breaker, 1.6 m over the pedestal, turning slowly, so
     it clears the racks and heap from every approach.
   - Three of the forge's little guys stand round it and wave when a player is within 30 m (Grant liked the waving).
     They leave when the part is taken.
   - Prompt reach 4.2 m to 6 m, measured to the pedestal's edge as now. (Corrected: today the prompt is offered within
     3.6 m of the centre in `boiler-view.ts` and `breaker-view.ts`, and the server accepts the take within 4.2 m,
     `LINE2_BOILER.reach` and `WORKS_BREAKER.reach` in `src/world/railway-server.ts`. Both numbers move.)
   Grant's idea G11, a bubble over anyone with something to say, belongs here too: Sleeves stands by the pedestal
   with a bubble while a part waits. That needs a line, and lines are the owner's to write (owner question 4 in the
   queue); the build uses no new words until he answers.
3. **The rail rack answers.** While a part waits on the pedestal and the active station is train-fed, the forge rack's
   board shows the same dashed gold outline of the part that the old train's saddle and Q6's sign use, and
   "Take rails" is shown blocked with a reason instead of not shown. The reason is new copy: a draft for the owner,
   not shipped without him.
4. **Q6's sign says what is missing.** Grant read it as "logs = missing train". The sign's train mark becomes
   the old train's silhouette with the boiler dashed in gold, the same mark as on the pedestal and the saddle: one
   symbol for "this part is missing" in three places.
5. **A second call.** If a part still waits 90 s after its show, the whistle sounds again and the plume thickens
   (22 puffs to 33) each 90 s until it is taken. Local; a reload does not replay it.
6. **The haul.** `railway.boilerSoloSpeed` 300 to 380 cm/s: 172 m in 45 s instead of 57 s. The owner's words on
   9 November were "like the great log, but maybe a little faster", so this stays inside his call. A room tunable,
   not a rule change.

Not proposed: an objective marker. The decision of 10 November allows one "sparingly, where nothing else works";
steps 1 and 2 have not been tried yet. If the next first-time player still walks past, the marker is the fallback.

## How the two beats play after this

- **Far Head.** Q5 lays, the shot plays, the last 2.5 s show the boiler landing at the forge. The camera hands back
  facing the plume. The glider's wake still flares on the summit, so there are two things to go to, and either order
  works (the glider is optional). At the forge the boiler turns over the pedestal with three little guys waving.
- **The pier.** Q6 lays, the pier show plays, the last 2.5 s show the breaker landing. The train home passes the
  forge; the breaker hangs over the pedestal in view from the halt.

## Steps

Each is player-visible view work: implementer agent (fable, medium), then a visual review by a fresh subagent.

- [x] 1. The hand-off cut on Far Head's shot and the pier show; the whistle at the cut's start.
- [ ] 2. The crane holding the part 1.6 m up; three waving little guys within 30 m (both built); prompt reach 6 m (not built: sim work).
- [x] 3. The rail rack's dashed mark (the blocked prompt is built off; its reason waits for the owner's wording).
- [x] 4. Q6's sign mark (already as built: no change).
- [x] 5. The repeat call at 90 s (three at most, as the review changed it).
- [ ] 6. `railway.boilerSoloSpeed` 380 (not built: sim work).

## Done means

- From Far Head's frame, a fresh room: the shot's last cut shows the boiler landing; the hand-back faces the plume.
- Standing at (922, 6), 7 m from the pedestal, where Grant stood at 24:57: the part and the little guys are in frame
  and read as the thing to go to. Same from (920, 7) and (912, -3), his passes after the pier (positions are whole
  metres from his log).
- A bot or a person new to the beat reaches "boiler taken" within 2 min 30 s of Q5 laid (Grant: 6 min 3 s) and
  "took the breaker" within 3 min of Q6 laid (Grant: never).
- A still and a motion sheet of each, looked at by the builder and by the visual reviewer.

## What a playtest could adjust

The cut's length, the lift height, the reach, the repeat interval and the haul speed. None gates this work.

## Gameplay calls in this plan

| Call | Kind |
| --- | --- |
| A show's last cut frames the next thing to touch, for Far Head and the pier | New default (principle 7). Logged in agent-calls when built |
| The part is held up by the crane; little guys wave within 30 m | New default (owner call "Machines show their work physically") |
| Prompt reach 4.2 m to 6 m | Default; position-only, no saved field (corrected: the server checks it too, so it is not view-only) |
| The rack's blocked reason and any line for Sleeves | New words: the owner's, not built without him |
| Q6's sign mark changes | Default (owner call "Signs in the world before hovering text") |
| A repeat call every 90 s | New default |
| Boiler solo speed 300 to 380 cm/s | Default, inside "maybe a little faster" (9 November) |
| No objective marker yet | Decided (10 November: sparingly, where nothing else works) |

## Design review (designer, 2026-11-15)

**Verdict: ready with changes.** Steps 2 to 6 and the pier's cut can be built on the recommendations below. Far Head's
cut waits for the owner (question 1), because it changes the 11 November acts entry.

Checked against DESIGN.md 7 and 11, the Current rules of core loop, controls and rail, owner-calls, place.md as built,
and the code (`forge-call.ts`, `boiler-view.ts`, `breaker-view.ts`, `far-head-view.ts`, `far-head-show.ts`,
`pier-view.ts`, `acts.ts`, `railway-server.ts`). Nothing here is ported from Place. Research: the legs follow
[progression-flow-layout](../research/progression-flow-layout.md#the-rules-as-lenses) rule 1 (the next goal can be
found) and its lens "end a beat facing the next"; [route-contract](../research/route-contract.md) is untouched, since
nothing here moves a gate or adds reach to a route. The call itself comes from
[home-flow](../reviews/home-flow.md), findings 2 and 3.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Far Head's shared shot gains a 2.5 s cut to the forge (7.5 s in all) | New, **waits for the owner** | Clashes with [the game has acts](../decisions-controls.md#d-2026-11-11-the-game-has-acts): Act 2's card is that shot "trimmed to 5 s, never a second move after it" (the orchestrator's reading of his "short 3-5 second aerial camera move"). Recommended: yes, with the card over the Far Head leg only. Question 1 |
| 2 | The pier (Q6) gains a shared 2.5 s shot of the breaker's casting, where today it has rockets and whistles and no camera | New | Build it. [Shared moments play for everyone](../decisions-controls.md#d-2026-11-10-shared-moments-play-for-everyone) and [a cinematic can't be interrupted](../decisions-controls.md#d-2026-11-09-a-cinematic-can-t-be-interrupted) give its rules: every page that sees the edge live, the one highlighted skip, no shot under reduced motion, never on a reload or late join |
| 3 | "Every completion show ends on the next thing to touch" as a standing rule | New | Hold it to these two beats; it becomes a rule for later shows only when the owner says so |
| 4 | The forge's whistle moves to the cut's start | Default | It must not depend on the cut playing: a skip, reduced motion and the interim Far Head build (no cut) sound it at the hand-back instead |
| 5 | The hand-back camera turns to face the plume | New | Only for a player on foot whose camera the shot took; eased inside the existing 0.55 s blend home; not for a rider, a glider in the air or someone hauling; not under reduced motion |
| 6 | The crane holds the part 1.6 m over the pedestal, turning slowly | Default | Owner call "Machines show their work physically". The boiler stays cold ([the waiting boiler doesn't steam](../decisions-rail.md#d-2026-11-09-the-waiting-boiler-doesn-t-steam)). A boiler put down mid-haul lies on the ground as now |
| 7 | Three little guys wave within 30 m and leave when the part is taken | Default | They stand on the forge side, off the rails (a track lies between the pedestal and where Grant stood, 7 m off, as the stills show; trains run by the time the breaker waits), and are not waiting passengers ([four or more stop a train](../decisions-rail.md#d-2026-11-10-waiting-little-guys-stop-a-train)) |
| 8 | Prompt offered at 6 m (from 3.6 m); the server's allowance rises with it (from 4.2 m) | Default | Keep the 0.6 m server margin. Check it does not win over the halt's lever or the forge's deposit, and is not offered to a seated rider passing on the train |
| 9 | Sleeves at the pedestal with a bubble (G11) | Not built | The line is the owner's (queue question 4). The bubble as a convention belongs to D4 |
| 10 | The rack's board shows the dashed gold part while one waits | Default | The gold dashes already mean "this goes here" on the saddle and the sign |
| 11 | "Take rails" shown blocked with a reason | Decided as a pattern, words not | A blocked prompt with its reason is ruling E's pattern (the steel works). The words are the owner's (queue question 4) |
| 12 | Q6's sign shows the old train with the boiler dashed | Default | Inside [Station 6 takes nothing by hand until trains run](../decisions-core-loop.md#d-2026-11-09-station-6-takes-nothing-by-hand): the sign still shows the train. The 14 November "On the rack" and "On the way" lines stay |
| 13 | A second call every 90 s, without end, the plume thickening each time | New | Change it: three calls at most (90, 180 and 270 s), one thickening to 33 puffs, and none while a player is within 30 m of the pedestal. See finding 4 |
| 14 | Boiler solo speed 300 to 380 cm/s | Default | "A little faster" is [decided](../decisions-rail.md#d-2026-11-09-the-boiler-is-hauled-on-a), and that entry leaves the number to the designer. 380 stays under the helped 540 |
| 15 | No objective marker yet | Decided | [10 November](../decisions-core-loop.md#d-2026-11-10-the-objective-marker-may-come-back) |
| 16 | Done means: boiler taken within 2 min 30 s of Q5, breaker within 3 min of Q6 | Default | Add a second measure, see finding 5 |

Decided 2 (one of them the pattern only), Default 8, New 5, not built 1.

### Findings

1. **Far Head's cut would play under the Act 2 card as `acts.ts` stands. Change before building.** The card comes up
   when the shot ahead of it has 3.5 s left (`LEAD_S`) and stays 4.5 s. Today that is 1.5 s to 6.0 s of a 5 s shot
   (Grant's log: `act shown`, act 2, waited 1504 ms). On a 7.5 s shot it would come up at 4.0 s and cover the whole
   cut. If the owner says yes, the card is timed to the end of the Far Head leg (up at 1.5 s as now) and the cut starts
   once it has gone, at 6.0 s; the moment is then 8.5 s, not 7.5 s. Until he answers, Far Head gets everything but the
   cut: the whistle at the hand-back, the camera turned to the plume, and step 2.
2. **The pier has no shot to append to.** `pier-view.ts` plays rockets and two whistles. The cut there is a new camera
   move for everyone in the room, so it needs the pull-out's full set of rules (call 2), and a reward card or the pause
   view on screen makes it wait as the other shots do.
3. **The cut and the pedestal should show the same picture.** Step 1 shows the part landing on the pedestal; step 2
   hangs it from the crane. Show the crane lifting it in the cut, so what the player saw is what they find.
4. **An endless island-wide whistle nags.** It carries 900 m. Grant spent two happy minutes on the glider after Far
   Head and would have heard it twice; in co-op everyone hears it while one friend explores, and the breaker can wait
   a long time. After the pier, trains whistle too, so a repeat stands out less there. Three calls, then the plume and
   the little guys carry it.
5. **The 2 min 30 s target fails a player who takes the glider first, which the plan calls fine.** Add: from first
   coming within 30 m of the pedestal, the part is taken within 20 s. That is the measure of the last 10 metres, which
   is what failed.
6. **Looked at** (`npm run look`, seeds `q5-done` and `q6-done`, stills in `.look/d1-review/`): from (922, 6) facing
   the pedestal, the boiler is centre frame and reads well, black and red on pale stone, with the crane's mast beside
   it. So at 7 m the boiler's problem was where he was facing, not its size: the waving little guys and the hand-back
   matter more than the lift there. From (920, 7) the breaker is a small grey hammer on a grey rock and does not read;
   the lift matters most for it. Not seen: the follow camera's own framing, the approach from the halt and from a
   train, any motion, and no sound was listened to. Whether the crane's jib reaches over the pedestal was not
   measured; the builder states it.
7. **Co-op, solo, late arrival.** Solo is the case measured. A friend who joins or reloads after the show gets no cut
   and no whistle (by the 10 November rule), so step 2 is their whole cue; it holds up on its own. A friend standing
   at the forge when Q5 lays sees the cut of the place they are standing in, which is fine.
8. **Reach is not view-only.** Step 2's reach changes a number the server checks; the builder reads room-safety and
   mixed-builds for it. No saved field and no bump.

### Owner questions

1. **May Far Head's shot grow from 5 s to about 8.5 s, with a cut to the forge after the Act 2 title?** Recommended:
   yes. The title stays over Far Head as now; the cut that follows shows the one thing that gates progress. It changes
   the 11 November reading "trimmed to 5 s, never a second move after it". Alternative: keep 5 s, and the whistle and
   the camera turn at the hand-back do the work. Answer: ___

The words for Sleeves and for the rack's reason are already queue question 4. Nothing else here needs him first.

### Suspect copy

None changed. The rack's blocked reason has no draft in this plan yet; the plan says it is not shipped without the
owner.

## As built (15 November 2026)

Owner, 15 November ([answer 4](../decisions-core-loop.md#d-2026-11-15-grant-queue-answered)): "the Far Head cutscene
could be longer, that's fine". So Far Head's cut is built with the rest. View, camera, prompt and copy work only; no
file under `src/sim`, `src/net`, `src/world` or `server/` changed.

| Step | Built | Where |
| --- | --- | --- |
| 1, Far Head | The shot is 8.5 s: the Far Head leg 6 s (the Act 2 card up at 1.5 s and gone at 6.0 s, timed to the leg), then a 2.5 s cut to the pedestal, where the crane lifts the boiler, then a cut home. The forge's call sounds as the cut lands | `far-head-show.ts`, `far-head-view.ts`, `forge-cut.ts`, `camera-pull-out.ts` (`titleS`, `end.to`, `onCut`, `onHome`) |
| 1, the pier | The show now waits behind a reward card, as Far Head's does. 3.5 s in (after the rockets and both whistles) a 2.5 s shared shot of the pedestal, the crane lifting the breaker; the call sounds as it lands. Only where the Works are mounted | `pier-view.ts` |
| 1, the whistle | A show holds the forge's call from its edge and sounds it at the cut. A skip sounds it at the hand-back; with no shot (reduced motion, a vehicle's seat) it sounds 3 s into the show, after the show's own two whistles; an unclaimed call sounds 0.25 s after its edge. The plume starts as the call sounds | `forge-call.ts` |
| 1, the hand-back | The camera comes home looking toward the forge, for a player on foot only (not seated, gliding, or hauling the boiler or the beam) | `line2-view.ts` `faceForge` |
| 2 | The crane's jib swings over the pedestal on a live cast and lifts the part 1.6 m on the call (1.4 s), turning at 0.45 rad/s; a reload shows it held. Three little guys stand 3.1 m off on the forge's side and wave within 30 m; gone when the part is taken. The boiler stays cold; put down mid-haul it lies on the ground | `part-hoist.ts`, `boiler-view.ts`, `breaker-view.ts` |
| 3 | A board on its own post off the forge rack's end nearer the pedestal shows the waiting part in gold dashes. The blocked "Take rails" is built off (`RACK_WAIT_REASON = null`) | `stock-sign.ts`, `line2-view.ts` |
| 4 | Nothing: station 6's sign already draws the old train with its boiler dashed in gold (boiler-first-choice step 1) | `stock-sign.ts` |
| 5 | The whistle again at 90, 180 and 270 s after a live call while the part waits; the first that sounds thickens the plume to 33 puffs; none while you are within 30 m of the pedestal; a reload replays none | `forge-call.ts` `FORGE_RECALL` |

**The builder's own calls** (in [agent-calls](../agent-calls.md)): the breaker is drawn at twice its carried size while
the crane holds it (at its own size it was a grey stick against the forge's wall from 7 m); the rack's board shows
whenever a part waits, not only while the active station is train-fed; a banner queued behind the act card also waits
for a playing shot (the glider's banner came up over the forge cut); the camera cuts home from the forge (a 0.55 s
blend across 500 m was a smear); the cut's camera stands 9.5 m from the pedestal, west of the halt's post.

**Measured.** The crane's mast stands 5.9 m from the pedestal and its jib reaches 17 m, so it reaches (review finding
6). `dev/look/evals/forge-handoff.ts` holds both cuts: Far Head's call at 6.05 s and the pier's at 3.6 s after the
edge, the part lifted 1.6 m, the camera home within 0.2 rad of the forge.

### Sim work left (not built here)

| What | Needs |
| --- | --- |
| Prompt reach 6 m (step 2) | `reach: 420` to `660` on `LINE2_BOILER` (`src/sim/railway-line2-layout.ts`) and `WORKS_BREAKER` (`src/sim/railway-works-layout.ts`), which `src/world/railway-server.ts` checks; then the views' `<= 3.6` to `<= 6` in `boiler-view.ts` and `breaker-view.ts` (keeping the 0.6 m margin). The review's checks go with it: it must not win over the halt's lever or the forge's deposit, nor be offered to a seated rider. The boiler's reach also applies where it lies after a drop: decide whether 6 m holds there or only on the pedestal. Room-safety and mixed-builds reading; no saved field |
| Boiler solo speed 380 (step 6) | `railBoilerSoloSpeed` `def: 300` to `380` in `src/sim/tune.ts`; `test/tune.test.ts` holds 300 and a room's saved tune keeps its own value. Then place.md's haul paragraph |
| The "taken within 20 s of first coming within 30 m" measure (finding 5) | A playtest mark on first entering 30 m while a part waits, and one on the take; `npm run loop -- trace` reads them. Not built |

### Draft lines for the owner (none shipped)

- The forge rack's blocked reason, while the boiler waits and station 6's kit goes by train: **"These go by train"**
  (set `RACK_WAIT_REASON` in `line2-view.ts`). Second choice: "The train carries these".
- Sleeves at the pedestal (G11; not built, no bubble): for the boiler, **"The forge made something enormous. I've been
  told not to lift it. You look much more liftable-with."**; for the breaker, **"New hammer on the pedestal. Very
  serious hammer. I waved at it and it didn't wave back."**

### Not verified

Sound was not listened to (the whistle's timing is from the eval's clock). The repeat call's 90 s was not waited out
in a capture. Two players, a late joiner and a skip were not captured. The 2 min 30 s and 3 min targets need a person
new to the beat. Not tested on a device.
