> **Status: proposed (2026-11-15); design only, nothing built.** Queue item D1 of
> [grant-1114-queue](grant-1114-queue.md). Base: `bff2e6203`. Steps 1 to 5 are view-only (Local, no bump). Step 6 is a
> room tunable. Nothing here changes a rule, a bill or an order.

# The forge's call: what to do after Far Head and after the pier

Serves DESIGN.md **7, Telegraph everything** and **11, Show, don't tell**.

## Goal

After Far Head and after the pier, a first-time player knows within a minute that something new waits at the forge,
and finds it on the first visit.

## What happened (Grant, session `mwh4pmui-mpbh7trk`, re-read from the raw log)

Both stalls are the same object: the pedestal on the forge apron at (922, -1), which holds the boiler after Station 8
(Q5) and the breaker after Station 9 (Q6). Its cue is the forge's call: a 62 m steam plume and one whistle.

| Clock | What he did | Distance to the pedestal |
| --- | --- | --- |
| 23:31 | Q5 laid at Far Head. On the same frame: Far Head's shared shot, the Act 2 card (1.5 s later), the glider waking on the summit, and the boiler cast under the plume | 488 m |
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
10 metres, three passes at 7, 8 and 10 m against a prompt reach of 4.2 m, and the moment itself, which stacks four
events and gives the one that gates progress the least screen time.

Not known: what he was looking at on each pass (no video), and whether he heard the whistle. Far Head to trains was
7 min 5 s, but about 2 min of it was the glider climb and flight, which he liked; the hunting was about 4 min.

## Why it misfires

1. **The show does not hand off.** Far Head's shot and the pier show end on the place just reached. The new part is
   cast 500 to 600 m behind the player, during the show, and its whistle sounds once, while the show plays (whether it is masked was not listened to).
2. **The pedestal does not read as "the thing" from 10 m.** A plume 62 m tall is overhead and out of frame when you
   stand under it. The part sits low among the apron's racks, crane and heap.
3. **Nothing near it answers the question he asked.** At 24:52 he went to the rail rack, 13 m from the boiler, because
   Station 9's sign told him its kit comes by train and he read that as "fetch rails". The rack gave no prompt and no
   reason. After the pier he asked three residents; their lines are jokes about the pier, not directions.
4. **The haul is slow with nothing to do.** 300 cm/s with sprint off: 57 s for 172 m alone.

## Proposal

Ranked. 1 and 2 are the fix; 3 and 4 close the two side doors he tried; 5 and 6 are smaller.

1. **Every completion show ends on the next thing to touch.** Far Head's shared shot gets a last cut of 2.5 s: the
   forge mouth pours, the boiler lands on the pedestal, the plume starts. The pier show gets the same cut for the
   breaker. The whistle moves to the start of that cut so it is heard in the clear. The cut is part of the existing
   shared moment (it plays for everyone and cannot be interrupted by accident, as decided on 9 and 10 November), and
   the hand-back camera faces the forge's plume from wherever the player stands. This also answers Grant's G23 (more
   emphasis when the forge makes something). Total added length: 2.5 s per show.
2. **The pedestal reads at 30 m.** Three changes, all on the pedestal:
   - Lift the part: the forge's crane holds the boiler, then the breaker, 1.6 m over the pedestal, turning slowly, so
     it clears the racks and heap from every approach.
   - Three of the forge's little guys stand round it and wave when a player is within 30 m (Grant liked the waving).
     They leave when the part is taken.
   - Prompt reach 4.2 m to 6 m, measured to the pedestal's edge as now.
   Grant's idea G11, a bubble over anyone with something to say, belongs here too: Sleeves stands by the pedestal
   with a bubble while a part waits. That needs a line, and lines are the owner's to write (owner question 4 in the
   queue); the build uses no new words until he answers.
3. **The rail rack answers.** While a part waits on the pedestal and the active station is train-fed, the forge rack's
   board shows the same dashed gold outline of the part that the old train's saddle and Station 9's sign use, and
   "Take rails" is shown blocked with a reason instead of not shown. The reason is new copy: a draft for the owner,
   not shipped without him.
4. **Station 9's sign says what is missing.** Grant read it as "logs = missing train". The sign's train mark becomes
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

- [ ] 1. The hand-off cut on Far Head's shot and the pier show; the whistle at the cut's start.
- [ ] 2. The crane holding the part 1.6 m up; three waving little guys within 30 m; prompt reach 6 m.
- [ ] 3. The rail rack's dashed mark (the blocked prompt's reason waits for the owner's wording).
- [ ] 4. Station 9's sign mark.
- [ ] 5. The repeat call at 90 s.
- [ ] 6. `railway.boilerSoloSpeed` 380.

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
| Prompt reach 4.2 m to 6 m | Default; position-only, no saved field |
| The rack's blocked reason and any line for Sleeves | New words: the owner's, not built without him |
| Station 9's sign mark changes | Default (owner call "Signs in the world before hovering text") |
| A repeat call every 90 s | New default |
| Boiler solo speed 300 to 380 cm/s | Default, inside "maybe a little faster" (9 November) |
| No objective marker yet | Decided (10 November: sparingly, where nothing else works) |
