> **Status: owner-approved 2026-11-15; step 1 implemented, awaiting parent review (not shipped).**
> Q1 yes (cast at the fit, no cut, call after the wake), Q2 yes, Q3 no (keep the crack glowing).
> Step 2 is approved for a separate build. Step 3 is dropped. The design review below is the historical review.

# The Works' flow: from the pier to the crossing, one thread

Seed: Grant's solo session of 14 November (`mwh4pmui-mpbh7trk`). The owner, 15 November: "he ended up getting stuck at
the part where you have to find the crusher and unlock the quarry ... That is very ambiguous at the moment as far as
player progression", and "it would be a bigger design than just a signaling problem to fix the game flow properly".
The earlier seed, the owner's own, 9 November: "im confused on what's supposed to occur with the breaker once I hit it
next to rotunda". Grant's ask, as the owner relayed it: where to go next, and what feeds what.

Serves DESIGN.md **7. Telegraph everything** (the next connection and its payoff visible in the world) and **11. Show,
don't tell**, and answers Grant's G5 ("always told what to do next ... no trade-offs") by cutting a backtrack and adding
a choice of order rather than another cue. It bends nothing. Fix 1 would change a recorded decision (the forge casts
the breaker after Q6, 8 November); it is owner question 1 ([Grant's ideas are weighed on merit](../agents/owner-calls.md#grants-ideas-are-weighed-on-merit)).

**Research.** [progression-flow-layout](../research/progression-flow-layout.md#the-rules-as-lenses): rule 1 (the next
goal can be found) is what failed for Grant; lenses "key in sight of the lock" and "end a beat facing the next" are
what the pier breaks. [route-contract](../research/route-contract.md): no travel edge is added; fix 1 moves one work edge (the breaker after trains, not Q6), checked under Level findings.
[wordless-onboarding](../research/wordless-onboarding.md) recs 3 and 5 (a shut thing says why; attention needs a nudge).
[roundhouse-trains](../research/roundhouse-trains.md) rec 3 (a real trip saved before the service pays: the stall's
two by hand) is kept.

**Already built, not redone here.** Part 1 and part 2 of the Works signposting ([part 2](works-signposting-2.md)), the
kiln's bill on its prompt (14 November), [footings-signalling](footings-signalling.md) A1 to A4 (the cradle's and the
footings' boards, 14 November) and D1, the forge's hand-off ([forge-call-handoff](forge-call-handoff.md), shipped in
#1870 after Grant played): the pier's 2.5 s cut to the crane lifting the breaker, the little guys waving within 30 m,
the 6 m prompt, three repeat calls, and the `breaker approached` / `breaker taken` marks. Grant played build
`4174823c`, before all of D1.

## Where Grant went and where he stopped

Re-read from `.look/playtest/mwh4pmui-mpbh7trk.jsonl` (session clock; positions world metres; untrusted browser data).

| Clock | What he did | Where | To the pedestal (922.0, −1.2) |
| --- | --- | --- | --- |
| 31:46–32:03 | Rode to Far Head, took 32 logs and 32 rails off the train-fed depot, funded Q6 | (1370, −185) | 484 m |
| 32:04–32:31 | Walked south behind the track layer; Q6 laid | (1404, −360) | 597 m |
| 32:33 | Pier reached. Nothing else for 18 s: no prompt but the lever | pier head | 603 m |
| 32:52 | Requested a stop "to Village", waited 19 s, boarded at 33:11 | Pier halt | 597 m |
| 33:35 | Requested the Quarry stop from his seat, then let it pass | on line 2 | 468 m |
| 34:15 | Stepped off at the Village halt's east end, tumbled | (944, 2) | 22 m |
| 34:24–34:27 | Walked west along the platform past the pedestal: 13 m, then 7.9 m at (927, 5); two bonks | | 8 m |
| 34:29 | The street's pier notice; into the shop | (898, 19) | 31 m |
| 34:33–35:59 | Shop (seven try-ons), museum, a house; talked to Nell, Button, Pip | 40–64 m off | |
| 36:07–36:24 | Back past the recovery rack (17 m) to the bay's three secret crates | (908, 21) | 26 m |
| 36:51 | Last position, idle; the session ends. "Take the breaker" never shown | (905, 14) | 23 m |

He came home on his own (the forge's call worked at 600 m) and stopped in the last ten metres. Two things the log
adds to D1's reading: at the pier he had **nothing to read for 18 s** about what the crossing needs, and on the ride
home he **asked for the Quarry stop and let it go**, so the Works' own door was 11 m away at 33:58 and meant nothing
to him.

## What a first-timer sees, in order (main today, with D1)

Positions from `src/sim/railway-works-layout.ts`, `railway-train.ts` (`LINE_HALTS`) and `railway-line2-layout.ts`;
walk 5.6 m/s, a footing 3 m/s. Stills in `.look/works-flow/` (scratch, not committed).

| # | Beat | Where | Leg | What says so today |
| --- | --- | --- | --- | --- |
| 1 | Q6 laid, the pier show | Pier stop (1402.8, −355.0) | — | Rockets, two whistles, the reward card, then D1's 2.5 s cut to the crane lifting the breaker at the forge; the camera hands back facing the forge. At the pier: twelve collars on the sea floor and a painted stake per bent. **Nothing says what the crossing needs** (the pier bill waits for the kiln to light). Still `pier-q6`: Ring Island's broken ring fills the view; no stake, collar or board is in frame from the stop |
| 2 | Home | Pier → Village halt (929.9, 3.8) | 601 m straight; about 53 s riding plus 5 s dwells and the wait | The train. It passes the Quarry halt, 11 m from the Works rack and 56 m from the throat; nothing there is lit until the breaker is taken |
| 3 | Take the breaker | Pedestal, 9 m from the halt | 2 s | D1: the breaker hung on the crane 1.6 m up, plume, three little guys waving, 6 m prompt. Still `village-pedestal`: the hook, the hung breaker and the waving crew read from the platform's east end |
| 4 | Strike the stall slab | Roundhouse seam (942.1, 33.0) | 40 m, 7 s | Seam motes face the pedestal. Strike: the slab breaks, two sockets with gold ghost footings, the tarped shunter and wagon. **A lock with no key yet**: footings do not exist |
| 5 | Find the second seam | Village halt display, 32 m | 6 s | The island map's one gold zigzag at the split rock; the street notice once |
| 6 | Ride to the Quarry | Village → Quarry halt (1081.3, 41.1) | 157 m, about 14 s plus the wait | Request lever |
| 7 | Strike the throat | Throat (1119.0, 82.0) | 56 m, 10 s | Trodden path, **Kiln** fingerpost, seam motes. Still `quarry-throat`: the cracked slab reads between the camp's blocks from the platform; the path leads to it |
| 8 | Fill the kiln | Kiln (1128.0, 87.0) | 10 m | Gold ghosts, the Kiln bill, the prompt's bill. Logs: the grove 30–46 m outside; stone: the bowl's rocks, 25 m |
| 9 | First footings | Kiln → Works rack (1088.0, 50.0) | 54 m; a cast every 8 s | The roller road; the rack board "Footings / stall 0/2 by hand"; the map square moves to the stall |
| 10 | Two footings home by hand | Rack → stall (941.6, 35.9) | 147 m straight; by train 11 m + 157 m + 32 m at 3 m/s, twice | The board, the socket ghosts |
| 11 | Fit the cradle | Forge rail rack → cradle | 37 m | Apron bill "Footing wagon / rails 0/8", rail ghosts, rack motes |
| 12 | Turn the table | Table (944.5, 19.2) | 17 m | The bill's "Turn the table", the handle's outline |
| 13 | The wagon brings twelve | Works rack → Pier rack (1405.9, −362.1) | 520 m, automatic; you ride 601 m back | The rack board "pier 0/12 by wagon", the pier bill (from the kiln's lighting), the map square at the jib |
| 14 | Foot the crossing | Pier rack → jib → bents 1–6 | 9 m each | The finale |

Eleven working beats over three places: Home to the Quarry and back twice, Home to the pier twice, and the first leg
runs 600 m away from the goal the player is standing at. The Works carries about twenty separate cues (motes, maps,
ghosts, five boards, a fingerpost, a path, a notice, a cut). Each was added where a player last stopped, and each
works where it stands; the order they are met in is the problem.

## Where the chain breaks

Weighted by evidence: Grant (one first-timer, 14 November), the owner on 9, 10 and 14 November (a returning player).

1. **The last ten metres to the breaker (Grant; P1; observed).** He came home unprompted and stopped 7.9 m from the
   pedestal, with the prompt then at 3.6 m. This is D1's ground, shipped after he played; D1's own measure
   (`breaker approached` to `breaker taken` within 20 s) is the first read of it.
2. **The first leg runs away from the goal (Grant; the owner on 9 November).** Pier to pedestal is 597 m straight,
   about 1 to 2 minutes with the wait, through the Quarry halt where the Works' door stands. Lens "end a beat facing
   the next" fails at the one moment the route tells the player they've arrived. Grant's own route shows how close the
   Works already was: after the boiler fit (30:36) he rode line 1 to the Village halt and stepped off at (932, 2),
   10 m from the pedestal, at 31:01, then asked for the Quarry stop and stepped off at (1078, 38) at 31:20, 11 m from
   the Works rack, before riding on to Far Head. With nothing cast yet, both doors meant nothing.
3. **The goal does not ask (motivational; Grant's "what feeds what").** At the pier the crossing is the obvious next
   thing (still `pier-q6`), but it says nothing about footings until the kiln is lit, four beats later. D1's cut shows
   *where* (the forge), not *why*. The breaker, the throat, the kiln and the footing each arrive as a new noun with no
   reason. It did not stop Grant (he came home), but it is why the chain reads as errands.
4. **The stall, the cradle and the wagon (the owner, 14 November, note 16).** Covered by footings-signalling A1 to A4,
   built and not yet played. No new break is claimed; measure it in the next session.

Not breaks: the kiln's ask (its prompt bill), the second seam (part 2: on 10 November the stall seam came 13 s after
the breaker and the quarry seam 49 s later), the walk to the kiln (path and post). The stall-first strike was the
owner's 9 November confusion, before part 2; the stall slab is the breaker's designed first, harmless strike
([split-rock-roundhouse](split-rock-roundhouse.md)) and stays one.

## The fixes, ranked

Ranked by what they do for the flow; sizes beside them. 1 is the flow change the owner asked for and is his call
(question 1); 2 is view-only and builds on its recommendation; 3 is a small view change built only if 1 is not.

### 1. The Works on the way out, not behind you (flow; sim; size M; owner question 1)

**The forge casts the breaker when the boiler is fitted (trains run), not when Q6 is laid.** The boiler has left the
pedestal by then ("taken" at the pedestal, "fitted" at the old train), so the pedestal is empty as the 9 November rule
wants. Every later rule stands: the crossing still needs Q6 laid, the table still needs trains, the wagon unloads only
at the Pier stop (open from Q6).

What it does to the route, measured:

- The boiler is fitted at the old train (1009.6, −149.0), at the Camp halt. Every ride from there to Q6's depot at Far
  Head runs through the Village halt (line 1, 170 m) and the Quarry halt (line 2): the pedestal is 9 m from the first,
  the throat 56 m from the second. The Works sits **on the way** to Q6 instead of 600 m behind the pier. Grant's own
  route after the fit (break 2) passed the pedestal at 10 m and stepped off at the Quarry halt within a minute.
- Two goals are open on one line, Q6 and the Works, in either order: the order choice Grant's G5 asked for. Two or
  three players split naturally (one to Q6, one to the throat) and meet at the Quarry halt, which both trips pass.
- Works first: the pier is reached with the wagon running or footings on the Quarry rack, so the pier's ask (fix 2)
  is answered within the same visit. Q6 first with the breaker taken in passing: the nearest Works door after the pier
  is the Quarry (510 m straight from the Pier halt) instead of the forge (601 m), with no pedestal search. Q6 first
  with the breaker skipped: as today.
- **No camera cut at the fit.** The fit has no completion show to host one (only the boiler's fly and the train's
  wake, `boiler-view.ts`, `FIT.wake` 3.1 s), and it is the payoff of the stretch Grant called the low point. The
  forge's call (whistle, plume, the crane's hoist) sounds once the wake has played; D1's waving crew and 6 m prompt meet
  the player at the Village halt they ride through; D1's repeat cap (three, none within 30 m) applies. At the pier,
  D1's cut still plays if the breaker is still on the pedestal (the Works skipped); otherwise the pier show ends on the
  rack (fix 2).
- The wagon may now roll out before Q6. It rides its footings to Far Head and back until Q6 opens the Pier stop
  (`footSet` at the pier needs `pierLaid`; the wagon unloads only at stop 3). Nothing strands.

Costs: the trigger line in `src/sim/railway-sys-line2.ts` (the Q6 cast, line 434, moves to the fit's
`state: 'fitted'` write, line 135); the invariant in `src/sim/railway-check-works.ts` lines 51–52 ("the breaker comes
with Q6"); the bad-world fixture; seeds and goldens; the loop graph and its Works driver; the production bots' order;
`forge-call.ts` and `pier-view.ts`; place.md; a `WORLD_NS` bump with a dated history line (save resets never block
development, owner, 13 November).

Risk: the trains' unlock is already busy (the owner's 14 November note 11). The call waits for the wake, and with no
cut the fit stays the train's moment.

### 2. The pier asks first (signposting; view only; size S; owner question 2)

From the moment Q6 is laid, the crossing says what it needs, where players wait for the train home:

- **The pier rack stands at once** (today: from the kiln's first footing; supersedes the 9 November call that hid it
  until the first cast, whose reason, an empty pad reading as a stray board, the ghosts answer). It stands at
  `PIER_RACK` (1405.9, −362.1) on the halt deck's seaward edge, 7.8 m from the stop. Until the pier's first footing
  arrives (`pierRack + pierSet` zero and none aboard the wagon), its six slots each hold a **dashed gold ghost footing**
  (`createGhostOutlines`, `src/render/ghost-outline.ts`, the stall sockets' shape and size). A footing released back to
  the Works rack may bring them back; accepted.
- **The pier bill shows from Q6 laid** (today: from the kiln's lighting), at its built place by the jib, 16 m from the
  stop, with its existing full line: **Pier** / **footings 0/12 by wagon**. "By wagon" from the start, so it never
  reads as twelve carries by hand (527 m each; the owner's own 14 November question, "Do I have to bring all the
  footings to the pier by hand?"); the stall's tarped wagon answers it later. No new copy.
- No map mark at the pier before the kiln lights: the maps keep marking the Works, so the gold on the map and the gold
  on the pier point the same way.

Where it reads: not from D1's hand-back (it faces home; the rack is beside and behind the camera, the jib 16 m behind:
the review's `pier-handback` still), but from where players wait. Grant walked (1401–1405, −346 to −368) for about
20 s waiting for the train, within 1–4 m of the rack's site and about 5 m of the jib. The footing's shape is then seen
three times before the kiln casts one: the pier's ghosts, the Quarry rack's broken sample (from the platform, 11 m),
the stall's socket ghosts.

### 3. DROPPED: The maps mark the throat first (owner, 15 November: Q1 yes, Q3 no)

Either seam may still be struck first (decided, 9 November), and the stall seam keeps its motes and its "Strike the
seam" prompt: it is the breaker's harmless first strike in sight of where you take it. Only the halt maps wait: the
stall seam's gold zigzag appears when the kiln lights (when the map's footing square also moves to the stall), so
before that the maps name one far goal, the throat, while the eye finds the near crack. If fix 1 is built this is not
needed: the stall is 40 m from the platform the player boards line 2 from, on the way.

### Not proposed

- **Hiding the stall seam's motes until the kiln lights.** The first draft's step; dropped on the review (finding 6):
  it removes the designed first strike on evidence from before part 2.
- **Moving the breaker or the wagon to the Quarry.** It would put producer and tool together, but it reverses D1 days
  after it shipped and unhooks the Roundhouse's bay 190°, which the stall's two footings raise (the rotunda, owner, 14
  November).
- **Cutting the cradle's eight rails or the table turn.** Both are decided (10 November); their cues shipped on 14
  November and haven't been played.
- **The objective marker.** Allowed "where nothing else works" (10 November); fixes 1 and 2 have not been tried.
- **More words.** Nothing new is written.

## Steps

Each leaves `node dev/ship-check.ts` green. The checkpoint is one look per step's seed and, for step 1,
`npm run loop -- run`.

- [x] **1. The breaker comes with trains.** [Implementation and evidence](works-flow-step1.md). Tier: high-risk implementation (`src/sim`
  and seeds), Codex (T3 delegate_task) **gpt-6-astra high**; independent review before merge by a fresh reviewer,
  **gpt-6-astra** first (the models table's review row). Read room-safety, mixed-builds and lockstep first.
  - `src/sim/railway-sys-line2.ts`: move `breaker = 1` from Q6's completion (line 434) to the boiler's fit (the
    `state: 'fitted'` write, line 135), guarded as now (`breaker === 0`).
  - `src/sim/railway-check-works.ts` lines 51–52: the invariant becomes "the breaker exists exactly when the boiler is
    fitted"; `test/fixtures/railway-bad-worlds.ts` ("works breaker", stage A) moves with it.
  - Seeds: `src/sim/railway-seeds.ts` and `railway-seed-works.ts`: `trains-on` and later carry `breaker: 1`; regenerate
    the railway goldens; bump `WORLD_NS` with a dated history line.
  - `dev/loop/graph.ts`: `breaker` requires `trains`, not `Q6`; `dev/loop/run.ts`'s Works driver; the production bots'
    order (`dev/look/bots/railway-works.ts`, `railway.ts`). `npm run loop -- run` finishes every order for 1–4 players,
    including the Works before Q6 (the wagon riding to Far Head and back) and Q6 before the Works.
  - `src/entities/railway/forge-call.ts`: the breaker's call fires on the fit's live edge, after the wake (`FIT.wake`
    3.1 s), with no camera cut. `pier-view.ts`: D1's cut only while `breaker === 1`; otherwise none.
  - place.md (Split-rock paragraph, "After the pier the forge casts..."), the invariant line in
    [split-rock-roundhouse](split-rock-roundhouse.md), the decision entry once the owner answers.
- [x] **2. The pier asks first.** Tier: player-visible implementation, Codex (T3 delegate_task) **gpt-6-astra high**.
  - `src/entities/railway/footing-cues.ts`: `pierBillLine` returns its existing line from
    `pierLaid(line2Completed(w))` (today null while `k.lit < 0`), null at the twelfth. A `pierGhosts(w)`: the pier
    laid, and `pierRack + pierSet` zero with no footing aboard the wagon; read from accepted rows only.
  - `src/entities/railway/crossing-view.ts`: the rack stands when the pier is laid (today `poured > 0`, line 396); six
    ghost footings on its slots via `createGhostOutlines` while `pierGhosts`. The bill (line 247) reads the line.
  - Unit test in the footing-cues test file: at `q6-done` the bill reads `footings 0/12 by wagon` and the ghosts are on;
    at `crossing-done` both are off.
  - Look: `npm run look -- --rail-seed q6-done --cam 1405,26.6,-349 --look 1405,24,-366` (where players wait, facing
    south) and from the stop toward the jib; a reload shows the same.
  - place.md (the footings paragraph); supersede the 9 November rack call in agent-calls.
  - **Implementation evidence (15 November 2026):** view only in `footing-cues.ts` and `crossing-view.ts`; no sim or
    `WORLD_NS` edits. The rack and existing full bill stand from Q6 laid; six stall-sized gold outlines disappear
    when accepted rows have footings aboard, on the pier rack or set. Map timing and all copy are unchanged. The
    parallel step-1 job owns the owner-answer/decision record, including the superseded rack call.
  - **Checks:** `npm run check` passed (2,223 passed, 65 skipped, one todo, no failures), including the owning
    `railway-works`, `railway-works-layout` and `works-shape` tests; `npm run loop -- run` passed, as did the routed
    `playthrough --to t1-done` (`.look/playthrough/pier-asks-t1/`). The proposed footing-cues test file does not exist:
    no new view unit test was added under the test diet. Scratch accepted-seed assertions cover before Q6, Q6 done,
    kiln lit, crossing done and the unchanged pre-kiln map (`.look/works-flow-pier/cue-checks.log`).
  - **Opened stills:** `.look/works-flow-pier/{q6,arrival}-{desktop,phone}-still.png`, generated with the existing
    look `Game` harness (`capture.ts`, `captures.json`, `verdict.json` alongside them). Desktop is 1280 × 800;
    phone is 390 × 844 with touch/coarse-pointer enabled. At the plan's waiting pose, six gold ghost boxes stand
    before the kiln lights. After the first live wagon unload, six solid footings stand instead, with no ghosts;
    the bill correctly remains `footings 0/12 by wagon` because none are set yet. WebGPU, advancing completed frames,
    no graphics/page/console errors on all four. The small bill line is tiny from this waiting pose, particularly
    on the phone; these frames establish its presence, not comfortable reading at that distance. These are restored
    Q6 and wagon-on starts, not the live Q6 completion show; no physical-device, motion or first-timer-read claim.
  - **Nearer wording views:** `.look/works-flow-pier/detail-near/q6-{desktop,phone}-still.png`, opened, with the
    camera about 4 m from the existing sign. `0/12 by wagon` reads on both; the existing **Sit** prompt overlaps part
    of `footings`. No sign relocation, enlargement, prompt change or new words were added. Capture health passed.
- [x] **3. DROPPED (owner, 15 November: Q1 yes, Q3 no). The maps mark the throat first.** Tier: player-visible implementation,
  Codex (T3 delegate_task) **gpt-6-astra high**.
  - `src/entities/railway/halts-view.ts` (the `boards.works` call, lines 755–765): the stall seam's zigzag needs
    `wk.lit >= 0`. `breaker-view.ts` (motes and "Strike the seam") is not touched.
  - Unit test beside the existing map-mark test: `works-arrive` marks the throat only; with the throat struck and the
    kiln lit and the stall unstruck, the stall only.
  - Look: `works-arrive` from the Village halt display; place.md (part 2's paragraph) and a dated note on
    works-signposting-2's beat table.
- [ ] **Checkpoint.** One look per step's seed; `npm run loop -- run` and `dev/look/evals/forge-handoff.ts` adjusted
  for step 1. Then the measure below, from the next first-timer.

## Done means

- Step 1: at `trains-on` the breaker hangs on the crane and the call sounds after the wake, with no camera cut;
  `npm run loop -- run` finishes every order; at `q6-done` with the breaker taken, the pier show has no cut to the
  forge.
- Step 2: at `q6-done`, from (1405, −349) facing south where players wait: six gold ghost footings on the rack and
  "Pier / footings 0/12 by wagon" by the jib read. D1's hand-back frame does not show them; that is expected.
- Step 3 (if built): at `works-arrive` every halt map shows one zigzag, at the throat; the stall slab keeps its motes.
- The measure for a person new to the beat: `breaker approached` to `breaker taken` within 20 s (D1's); `breaker
  taken` to the throat struck within 3 min; with step 1, the boiler fit to `breaker taken` within 2 min. Not provable
  by a still: whether a first-timer reads the pier's ask. The next session answers it; nothing waits on it.

## Level findings

- **Steps 2 and 3 add no collider, travel edge or reach**: ghosts, a bill shown earlier, map marks. The route contract
  and the bot's route are unchanged.
- **Step 1 moves one work edge** (the breaker after trains, not Q6) and so reaches early the throat, kiln, stall,
  cradle, table and wagon. The crossing still needs Q6 (`footSet` at the pier and the check "pier before Q6"); Ring
  Island's rivet still needs Q7; no secret is gated by the breaker; the cleft gives no new reach (the kiln still needs
  the throat struck). The step's `npm run loop -- run` with the Works-before-Q6 order and the production bot are the
  proof; not run here, since no rule has changed yet.
- `npm run level-check -- --place=place` today: exit 0, 11 reports, none on the Works. Its log says the Works and the
  distant islands are **not in the offline adapter** ("use the live scan there"), so that tool proves no reach here.
  `npm run loop -- run` on this checkout: every out-of-order probe refused, the one-player order finishes.
- Stills (scratch, `.look/works-flow/` and the review's `.look/works-flow-review/`): `pier-q6` (from the stop south:
  Ring Island dominates; no stake, collar or board in frame), `pier-handback` (D1's hand-back toward home: shelter,
  train, Far Head; the rack beside and behind), `village-pedestal` (from where Grant stepped off: hook, hung breaker
  and waving crew read), `pedestal-to-stall` (turntable, bay posts, the map display; no mote or crack reads at 40 m),
  `quarry-throat` (the throat's crack reads between the blocks at 56 m; the path leads to it), `stall-from-table`
  (`works-lit`: ruins and the tarped shunter read; the sockets do not from 15 m). Not seen: motion, sound, the ghosts
  (not built), the fit's wake with the call, a phone.

## Risks

- Hotspots: `crossing-view.ts`, `halts-view.ts`, `forge-call.ts`, `railway-sys-line2.ts`. `halts-view.ts` appears on
  stale `ship/` branches in `npm run inflight`; rebase.
- Step 1 is a sim trigger, an invariant and a `WORLD_NS` bump (saves reset): room-safety and mixed-builds apply; no
  compatibility code in the dev phase. Performance: six instanced ghost outlines on an existing draw.
- Cue fatigue (G5): fix 1 removes a backtrack instead of signalling across it; fix 2 shows an existing bill earlier.
  Nothing new is written.

## Calls

The full sorted list (5 Decided, 11 Default, 4 New) is the review's table below; every Default and New is in
[agent-calls](../agent-calls.md). The ones that change what is built:

| Call | Kind | Recommendation |
| --- | --- | --- |
| The breaker cast at the boiler's fit, Q6 and the Works open together | New | Yes (owner question 1); changes the 8 November "after Q6" |
| No camera cut at the fit; the call after the wake | New | From the review (finding 2) |
| The pier rack, ghosts and "footings 0/12 by wagon" from Q6 laid | New / Default | Yes (owner question 2); "by wagon" from the start (finding 4) |
| The stall seam keeps its motes; only the maps wait, and only without fix 1 | Default | From the review (finding 6); owner question 3 |

## Copy

No new words. The pier bill's existing line, "footings 0/12 by wagon", shows from Q6 laid instead of from the kiln's
lighting. No line of The Boogler's is touched or read as wrong.

Suspect lines for the owner (none changed): the street notice "That big hammer's for cracks. One by the turntable, and
a jealous one past the quarry." still fits every fix here (the turntable's crack keeps its motes); under fix 1 it would
play at the fit, not after the pier, and its "One by the turntable" first still reads true. D1's unbuilt drafts ("These
go by train" for the forge rack; Sleeves' two pedestal lines) are unchanged.

## Owner questions

**Owner answers, 15 November 2026:** Q1 **yes**: cast at the boiler fit, no camera cut, call after the train wakes. Q2 **yes**: pier rack, six ghost footings and the full "footings 0/12 by wagon" bill from Q6. Q3 **no**: the turntable crack keeps its glow. Q1 supersedes the 8 November "after Q6" call. **Step 3 is dropped**; the crack and its map cue stay as they are. Step 2 is approved for a separate build; this task builds step 1 only.

1. **Should the forge cast the breaker when the boiler is fitted, instead of after the pier?** Recommended: **yes,
   with no camera cut at the fit**: the call sounds after the train wakes, and the crew and prompt meet you at the
   Village halt you ride through. Grant's own route after the fit passed the pedestal at 10 m and stepped off at the
   Quarry halt, 11 m from the Works rack. It puts the Works on the way to Q6 instead of 600 m behind the pier, and
   you choose which first. Changes the 8 November "after Q6". Alternative: keep "after Q6" and build fixes 2 and 3.
2. **Should the pier show its rack with six gold ghost footings and the bill "footings 0/12 by wagon" from the moment
   Q6 is laid?** Recommended: **yes, with "by wagon" from the start**, so it never reads as twelve carries by hand.
   Alternative: keep the rack and bill from the kiln's lighting.
3. **Should the crack by the turntable stop glowing until the kiln is lit?** Recommended: **no**: it stays the
   breaker's first, harmless strike; only the halt maps wait to mark it, and only if question 1 is no.

_Folded in above on 2026-11-15. The review numbers the first draft: its step 1 (the pier) is now step 2, its step 2 (the stall's cues) is now step 3, maps only, and its step 3 (the breaker at the fit) is now step 1._

## Design review (designer, 2026-11-15)

Read: DESIGN.md (7, 8, 11), owner calls (Grant weighed on merit; nothing waits for a playtest; pick and log; save
resets never block), core-loop and rail Current rules and the entries the plan cites, direction.md, playtests.md to
Grant's 14 November entry and its tracker rows, [progression-flow-layout](../research/progression-flow-layout.md),
[route-contract](../research/route-contract.md), [level-design](../research/level-design.md) and
[wordless-onboarding](../research/wordless-onboarding.md) (top blocks and the sections used below),
[split-rock-roundhouse](split-rock-roundhouse.md) (the designed order), the code the plan names, Grant's raw log, the
author's four stills and two of my own (`.look/works-flow-review/`, scratch). Nothing here is ported from Place.
`npm run loop -- run` on this checkout: every order probe refused as the graph says; 1 player canonical finishes.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Either seam may be struck first | Decided | [loop orders, 9 November](../decisions-core-loop.md#d-2026-11-09-loop-orders); every fix keeps it |
| 2 | The forge casts the breaker after Q6 (today) | Decided | [Split-rock answers, 8 November](../decisions-process.md#d-2026-11-08-split-rock-answers); step 3 would change it (question 1) |
| 3 | The stall's two by hand, the cradle's eight rails, the table only when ready | Decided | [late game's five, 10 November](../decisions-rail.md#d-2026-11-10-the-late-game-s-five-open) |
| 4 | No objective marker for this stretch | Decided | [10 November](../decisions-core-loop.md#d-2026-11-10-the-objective-marker-may-come-back): only "where nothing else works"; fixes 1 to 3 come first |
| 5 | Step 3's `WORLD_NS` bump and save reset | Decided | [Save resets never block development](../agents/owner-calls.md#save-resets-never-block-development-or-architecture) |
| 6 | The pier rack stands from Q6 laid | Default | Reverses the open agent call of 9 November (the rack only from the first cast, because from Q6 the empty pad "read as a stray board"); the ghosts answer that reason. The plan does not cite that row: finding 5 |
| 7 | Six gold ghost footings on the rack's slots until the pier's first footing arrives | Default | Gold dashes = "a part goes here" (open, 9 November); a tunable |
| 8 | The pier bill from Q6 laid, "footings n/12" | New | Recommended yes (question 2): it is where every player stands when the Works begins, and Grant walked within 1 to 4 m of the rack's site and about 5 m of the jib for 20 s there |
| 9 | "by wagon" withheld until the wagon has rolled out | Default | **Recommend the opposite:** show the existing full line, "footings 0/12 by wagon", from Q6 laid (finding 4, question 2) |
| 10 | No pier mark on the halt maps before the kiln lights | Default | Keeps the maps pointing at the Works; cheap to change |
| 11 | The stall seam's motes wait for the kiln | New | Reclassified from Default: it removes the designed first strike. **Recommend not building it** (finding 6, question 3) |
| 12 | The stall seam's map zigzag waits for the kiln | Default | Recommend building this half only: the map names one far goal, the eye finds the near crack |
| 13 | "Strike the seam" still offered at the stall slab | Default | Keeps decision 1 whole |
| 14 | The breaker cast at the boiler's fit | New | Recommended yes (question 1); Grant's own route after the fit passed both Works doors (finding 1) |
| 15 | D1's 2.5 s camera cut moves to the fit | New | Reclassified from Default: it is a new shared camera moment. **Recommend no cut at the fit** (finding 2) |
| 16 | At the pier, the cut only while the breaker still waits; otherwise the show ends on the rack | Default | Follows 14; the hand-back today faces home, away from the rack (finding 3) |
| 17 | Under step 3 the wagon may roll out before Q6 and ride its footings to Far Head and back until the Pier opens | Default | The rules allow it (`footSet` site 2 needs `pierLaid`; the wagon unloads only at stop 3); not a strand; `loop -- run` must include this order |
| 18 | D1's repeat cap (three, none within 30 m) applies to the fit's call | Default | D1's cap, unchanged |
| 19 | The measures: approached to taken 20 s, taken to throat 3 min, pier ghosts to a stop 30 s | Default | Thresholds, cheap to change |
| 20 | No new words but the count | Default | Words sparingly ([9 November](../decisions-core-loop.md#d-2026-11-09-signposting-words-and-beacons-are-allowed)) |

**Counts:** 5 Decided, 11 Default, 4 New. Defaults 6, 7, 9, 10, 12, 13, 16 to 20 and News 8, 11, 14, 15 are in
[agent-calls](../agent-calls.md), status `open`.

### Flow: the legs, beat to beat

Positions from `railway-lines.ts` and `railway-works-layout.ts`; rides from Grant's log where he made them.

| Route | Legs after the boiler's fit at the Camp halt (1009.6, −146.1) | Against today |
| --- | --- | --- |
| Today (Q6, then the Works) | Line 1 to the Village halt (170 m straight, about 11 s ride) → line 2 to Far Head → Q6 (28 s) → pier → line 2 back to the Village (601 m, about 53 s plus his 19 s wait) → pedestal 9 m → line 2 to the Quarry (157 m) → throat 56 m | — |
| Step 3, Works first | Line 1 to the Village → pedestal 9 m (2 s) → line 2 to the Quarry halt (17 s ride in his log) → throat 56 m (10 s) → kiln … → stall by hand twice (1:42 each on 10 November) → cradle 37 m → table 17 m → line 2 to Far Head → Q6 → pier, where the wagon unloads | No pier-to-home backtrack at all |
| Step 3, Q6 first with the breaker taken in passing | Village → pedestal 9 m → line 2 to Far Head → Q6 → pier → one ride down to the Quarry halt (510 m straight) → throat 56 m | Saves the Village leg, a transfer wait and the pedestal search |
| Step 3, Q6 first, breaker skipped | As today | The plan's "worst case is today's" holds |

Rule 1 (the next goal can be found) holds on every row once D1 is in; rule 2 (gates keep their meaning) holds (the
crossing still needs Q6 laid); rule 3 (nobody stranded) holds: the breaker cannot be lost, the wagon cannot strand
footings, every step works solo. Lens 7's exception "a beat that ends with two pulls and a choice" covers the fit's two
goals; the research names the same pattern at Q5 (boiler and glider) as fine.

### Findings

1. **Step 3 is the fix the evidence supports most, and the plan undersells why.** Grant's log after the fit
   (30:36–31:46): he rode line 1 to the Village halt and stepped off at (932, 2), 10 m from the pedestal, at 31:01;
   boarded line 2 at 31:03, **asked for the Quarry stop and stepped off at (1078, 38) at 31:20**, then rode on to Far
   Head. Under step 3 he would have passed the cast breaker at 10 m and stood at the Works' door within a minute of the
   cast, with no backtrack. That is a stronger reason than the plan's "on the way" geometry; cite it. It also answers
   the research's recommendation 3 ([progression-flow-layout](../research/progression-flow-layout.md)), the two beat ends
   500–600 m from the next goal, by removing one of them rather than signalling across it.
2. **Must change before step 3: the cut at the fit has nothing to host it, and would step on the fit's payoff.** The
   2.5 s cut lives in the pier show (`pier-view.ts`, `PIER_CUT`); the fit has no completion show, only the boiler's fly
   and the train's wake (`boiler-view.ts`, `FIT.wake` 3.1 s). Moving the cut means building a new shared camera moment
   on the climax of the stretch Grant called the low point ("Far Head to the trains, about 7 min"). The gap it bridged
   was 600 m and out of sight; here it is 170 m and on the only ride out. Recommended instead: no cut; the forge's call
   (whistle, plume, hoist) sounds once the wake has played, and D1's waving crew and 6 m prompt meet the player at the
   Village halt. Keep D1's pier cut for a player who skipped the breaker, as the plan says.
3. **Must change before step 3: the plan's file list misses the invariant.** `src/sim/railway-check-works.ts` lines 51
   to 52 assert `breaker > 0 ⇔ pierLaid(...)` ("the breaker comes with Q6"); moved alone, the cast makes every room
   between the fit and Q6 fail the check. Add it, the bad-world fixture (`test/fixtures/railway-bad-worlds.ts`, "works
   breaker", stage A), `dev/loop/run.ts`'s Works driver, the production bot's order (`dev/look/bots/railway-works.ts`
   and `railway.ts`), and the invariant line in [split-rock-roundhouse](split-rock-roundhouse.md). The plan's code facts
   are otherwise right: `state: 'fitted'` at line 135 and the Q6 cast at line 434.
4. **Step 1: "by wagon" should not wait.** A pier that says "footings 0/12" with a rack of ghost footings, before the
   wagon exists, reads as "carry twelve here by hand" (527 m each, 6.3 km solo). The owner asked exactly that on 14
   November (note 16: "Do I have to bring all the footings to the pier by hand?"). "By wagon" names a vehicle not yet
   met, but as a tease the stall's tarped wagon later answers, which is the lock-before-key pattern step 1 itself
   relies on. Recommended: the existing line, unchanged, from Q6 laid (no new copy at all).
5. **Step 1: the hand-back faces away from the rack, but the waiting spot doesn't.** My still `pier-handback`
   (`works-lit`, camera behind the Pier stop toward the forge, as D1's hand-back turns it): the halt's shelter, a
   lever, the train and Far Head fill the frame; the rack sits beside and behind the camera and the jib 16 m behind.
   The "Done means" line ("in frame looking toward the jib; the hand-back still faces home") holds only by turning
   round. What rescues it is the trace: while waiting for the train home Grant walked (1401–1405, −346 to −368),
   within 1–4 m of the rack's site and about 5 m of the jib, for about 20 s. Judge step 1's look from where players wait,
   (1405, −349) facing south, and say the hand-back frame does not show it. Also cite and supersede the 9 November
   agent call that keeps the rack hidden until the first cast. The step's predicate contradicts its bullet: "`poured`
   and `pierRack`/`pierSet` both 0" would drop the ghosts at the kiln's first cast, not at the first arrival; state it
   as the pier laid with `pierRack + pierSet` zero and nothing aboard the wagon (a footing released back to the Works
   rack may bring them back; accept that).
6. **Step 2 removes a designed beat on old evidence; it should not be built as written.** The stall slab was designed
   as "the harmless first strike" ([split-rock-roundhouse](split-rock-roundhouse.md), step 3), the key's first use in
   sight of where you get it ([progression-flow-layout](../research/progression-flow-layout.md#placing-the-tease-the-gate-and-the-key);
   [wordless-onboarding](../research/wordless-onboarding.md) recommendation 1, the fail-safe first Goomba). Break 3
   rests on the owner's 9 November confusion, before part 2; on 10 November, with part 2, the stall seam came 13 s after
   the breaker and the quarry seam 49 s later ([playtests](../playtests.md#2026-11-10-owner-and-daniel-co-op-v24-the-boiler-on-the-rope-and-the-works-part-2)).
   And the plan argues both ways: step 1 deliberately shows footings wanted before any exist; step 2 hides the stall
   because it does the same. With step 1 built, a stall-first strike is the second sighting of one ask, which teaches.
   What a player with the breaker sees at the pedestal under step 2 (my still `pedestal-to-stall`, `works-arrive`): the
   turntable, the bay's posts beyond it and the halt's map display; no mote or crack reads at 40 m today, so the motes
   cost nothing from the pedestal and only help a player who wanders to the turntable (motes are particles; a still can
   miss them). Recommended: keep the stall's motes and prompt; build only the map half (call 12). If step 3 is built,
   step 2 is unnecessary: the stall is then 40 m from the platform the player boards line 2 from, on the way.
7. **Where the chain breaks, against the evidence.** Grant's stop is in the last ten metres (7.9 m from the pedestal,
   the prompt then at 3.6 m), which is D1's ground and shipped after he played. Break 1 (the pier says nothing) is a
   sound root for "what feeds what" but did not stop him: he came home unprompted. Say break 1 is the motivational
   gap and D1 the observed one; the plan's measure (approached to taken within 20 s) is the right first read of D1.
   The smaller fix the plan missed is already inside it: step 3 without the moved cut (finding 2) is a one-line
   trigger plus the invariant, and it does more for the flow than steps 1 and 2 together.
8. **Two pulls at trains-on, and "too much at once".** The owner's 14 November note 11 found the trains' unlock already
   busy (many trains at once). Step 3 adds the forge's call to that moment. Finding 2's timing (after the wake) is the
   mitigation; with the cut dropped the fit stays the train's moment.
9. **Co-op.** Step 3 gives two or three players a natural split: one rides to Far Head for Q6 (about 2 minutes) while
   another takes the breaker and strikes the throat; they meet at the Quarry halt, which both trips pass (lens 8). A
   friend arriving late finds the same derived cues; nothing here is per-player. Steps 1 and 2 have no co-op cost.
10. **"Every way to Q6 runs through the Village halt" is stated, not proved.** Line 1 is the only ride from the Camp;
    a walker from the Camp toward the quarry is not measured. Grant's trace confirms the ride. A minor claim; say
    "every ride".

### Level design

- **Route contract.** Steps 1 and 2: no travel or work edge. Step 3 moves one work edge (the breaker after trains, not
  Q6) and reaches early the throat, kiln, stall, cradle, table and wagon; the crossing still needs Q6 (`footSet` site 2
  and the check "pier before Q6"), Ring Island's rivet still needs Q7. No secret is gated by the breaker. Proof is the
  step's own `npm run loop -- run` with the Works-before-Q6 order, plus the production bot.
- **Sightlines.** Pedestal from the Village platform: reads (author's `village-pedestal`: hook, hung breaker, crew).
  Throat from the Quarry platform: reads (author's `quarry-throat`). Pier rack: see finding 5. Not seen: motion, sound,
  the ghosts (not built), the fit's wake with the call, a phone.
- **Walk-seconds.** The Works-first leg after the fit is the densest on Home: something to do at 2 s, 17 s ride, 10 s,
  then the kiln's loads; inside the 10–20 s guide.
- **Suspect lines (none changed).** The street notice ("One by the turntable, and a jealous one past the quarry")
  names the turntable first; under step 2 as written it would contradict the map's one zigzag. Another reason for
  finding 6.

### Owner questions

1. **Should the forge cast the breaker when the boiler is fitted, instead of after the pier?** Recommended: **yes,
   without a camera cut at the fit**: the call sounds after the train wakes, and the crew and prompt meet you at the
   Village halt you ride through. Grant's own route after the fit passed the pedestal at 10 m and stepped off at the
   Quarry halt. Changes the 8 November "after Q6".
2. **Should the pier show its rack with six gold ghost footings and the bill "footings 0/12 by wagon" from the moment
   Q6 is laid?** Recommended: **yes, with "by wagon" from the start**, so it never reads as twelve carries by hand
   (your own 14 November question). Alternative: the plan's version, the suffix after the wagon rolls out.
3. **Should the crack by the turntable stop glowing until the kiln is lit?** Recommended: **no**: keep it glowing as
   the breaker's first, harmless strike; only the halt maps wait to mark it, so they point at the quarry first. If
   question 1 is yes, leave the stall's cues as they are.
