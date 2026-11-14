# Rotunda Checkpoint A — 14 November 2026

**Follow-up: Works now passes; perf now completes; quiet frame timing remains open.** Rebased onto `origin/main` at `902217fc7` before rerunning. The earlier missing Quarry prompt was a bot selection defect already repaired upstream, not a rotunda game regression. The restarted perf harness no longer crashes, but samples zero client rule ticks and therefore does not measure server simulation cost. The new frame sample ran under load and is **not performance evidence**. `test:net` remains deliberately unrun. No game source changed; no push or ship. **Not tested on a device.**

## Follow-up on rebased main

### Base, preserved evidence and boundaries

The branch remains `codex/rotunda-checkpoint-a`. The initial rebase met the rotunda implementation already merged by #1827: Git skipped matching commits; `c6a5dd2bd` conflicted while being reapplied, but comparison showed the final `roundhouse-view.ts` already identical upstream, so that redundant commit was skipped. Git dropped `a2eea13ab` as already upstream. The old documentation commit became **b5fdd9dc552495cc3822be9f48bcefa6e6efd6aa**, tree **88dee854305c7ad5d1a96cd533302e47fb35f271**. Its only differences from the rebase base are this report and the plan. No source conflict resolution introduced a game change.

All three new browser manifests below bind that clean worker tree. The restarted trusted harness was **902217fc71c415e58887d250c6ab427c7414b6e4**, tree **702c647f4a6c5ba5c13550de6958c7423e16a084**. This is the requested base including meadow #1830/#1833. The shared local `origin/main` ref advanced to `2380db38f` during testing; that later code was not the tested base. No fetch was performed by this runner.

`garage-open.ts`, `garage-two.ts`, `garage-view.ts`, `roundhouse-view.ts` and `table-bridge.ts` are unchanged from the initial run: the earlier install/bystander/P2 evidence is retained at its exact recorded build, without rerunning the garage evals. Terrain and town-plan data did change upstream, so the initial green/hall/approach stills and town sheet below remain **historical**, not a fresh verdict on the rebased meadow or foreground layout. The new Works still and frame view were opened. No The Boogler copy was changed; these checks identified no suspect Boogler line. No ROM data was used.

### Works: one requested rerun, passed

`timeout 1800 node .look/see-client.ts look --real --rail-seed works-arrive --query 'shot=play&railFrom=works&railStop=wagon coupled' --eval dev/look/evals/railway-works-bot.ts --until window.__placeDone --name checkpoint-a-rebased-works` (exact question and command in manifest).

**Exit 0, no missed beats or recovery; WebGPU and no graphics errors.** Acquisition/end load **19.18 → 46.25**, queue **12.309 s**; explicitly passed under load. Recorded bot beat times are diagnostic route timestamps, **not pacing, performance or smoothness evidence**:

| Beat | Seconds from bot start |
| --- | ---: |
| Breaker | 4.5 |
| Stall strike/open | 19.3 |
| Throat open | 92.8 |
| Kiln lit | 107.3 |
| First footing cast | 117.0 |
| Hand trip 1 home | 188.8 |
| Hand trip 2 home / stall built | 292.3 |
| Cradle fitted | 304.1 |
| Table turned | 308.0 |
| Wagon coupled | 321.8 |
| Finished | 321.9 |

Final accepted rows: **shed.stall=2, cradleRails=8, fitted=6887, table=1, tableRev=1, ready=7066; train slot 1 wagon=true**. These establish both footing sets, cradle fit, turn and coupling. [Manifest](../../.look/evidence/1794697314656-58601/evidence.json), [complete console/checkpoint report](../../.look/evidence/1794697314656-58601/output.txt).

**Named cause of the old failure: stale bot input selection.** The old ride helper passively waited for `railway-request-aboard` while a nearby chair's `place-sit` won Interact. Main already contains `e888900be` (turn past Sit, hop to the platform and finish the closer lever approach), plus later platform/stop updates. Its [upstream diagnosis](works-bot-fix.md#cause-and-repair) reproduces the old failure on unchanged main and observes Quarry requestable while Sit remains selected. This runner inspected that fix and the real target constructor in `train-view.ts`; the aboard wording remains `Request stop: Quarry`.

The fresh live input trace corroborates the selection fix: **71.1 s Sit → 71.5 s Request stop: Quarry → 71.6 s press, ran=true**. At 82.6 s the train offers Far Head; the route then reaches Quarry and strikes the throat. [Observed trace excerpt](../../.look/evidence/1794697314656-58601/observed-prompt-trace.json). The trace was read live from the temporary playdata JSONL; the client deletes that directory on cleanup, so the saved excerpt is explicitly transcribed observation, not a retained full trace. No game prompt or new bot code was changed here.

Opened the [new end still](../../.look/evidence/1794697314656-58601/checkpoint-a-rebased-works-still.png) and [motion sheet](../../.look/evidence/1794697314656-58601/checkpoint-a-rebased-works-motion.png): Buddy stands beside the bridge with an empty carrying rack and a teacup hat. The train is distant behind the large translucent bot overlay; the coupling is not readable from these pixels alone. Accepted rows, rather than this framing, prove coupling. No real-time motion judgement.

### Perf: crash resolved, server simulation cost still unmeasured

`timeout 360 node .look/see-client.ts perf --view summit` **passed, exit 0** through the restarted broker. It queued **199.750 s**. Submission load **42.64 / 40.84 / 30.00**, later observation **35.21 / 38.58 / 32.95** (1/5/15 minute averages); this perf harness does not stamp exact acquisition/end load. No quiet-machine claim.

Fresh production arrival, `summit`, camera **(1015,110,-6)** toward **(850,0,60)**, **960×600, DPR 1, MSAA 4**, Apple Metal-3 WebGPU: **415 calls, 93 shadow-call difference, 996,237 triangles, 1,251 geometries, 226 programs**. Moving objects can affect the separate-frame shadow-call difference. Main-thread frame CPU avg/p95/max **10.553 / 8.585 / 363.025 ms** and render CPU **7.935 / 5.795 / 360.450 ms** are loaded diagnostics, not performance evidence or a comparison with the earlier tree. [Manifest](../../.look/evidence/1794697700082-78097/evidence.json), [output](../../.look/evidence/1794697700082-78097/output.txt), [render JSON](../../.look/evidence/1794697700082-78097/render.json). No PNG is produced by this command.

**Why the old sim profiler crashed:** trusted harness `d87c0571` imported the removed `stateHashes` export and called it every 20 iterations. Worker code had already retired that API. The restarted `902217fc7` harness uses the current `profileTicks` facade without that call, so the exception is gone. Its new output says **0 ticks (client)**. `src/world/sync.ts:updateWorld` only follows the clock in client mode and never executes shared `onTick` rules; empty profile rows yield the printed zeros. **Those zeros do not measure the server's cost.** No server profiler or net harness was added or run.

### Frame timing: sampled and reported, rejected as performance evidence

`timeout 420 /Users/matiasfranco/.nvm/versions/node/v26.13.0/bin/node .look/see-client.ts look --real --curves --rail-seed steel-home --cam 952,27,4 --look 943,19.5,26 --action dev/look/evals/railway-works-at.ts --query 'worksat=table&worksperf=1&prof=1' --warm 20 --seconds 1 --frames 2 --name checkpoint-a-rebased-frame`.

The existing action sets the table pose, settles another **3 s** after the **20 s warm-up**, then samples **5.0094 s / 301 completed game frames** through `hardwareTiming(5)`, before the still/motion screenshots. The curves also include initial action setup; the five-second timing JSON is the measurement window. `--curves` gives this run an exclusive broker slot. Health passed, no graphics errors, but load **28.57 → 38.90**, **underLoad=true**, queue **5.041 s**. The queue's load limit of 30 is not the quiet performance policy's limit of 6. **The quiet-frame sub-item remains unchecked.**

Five-bay `steel-home` table view, camera **(952,27,4)** toward **(943,19.5,26)**, **960×600, DPR 1, MSAA 4**, Apple Metal-3, profiler UI enabled; **479 calls, 833,967 triangles**. Loaded diagnostics, in ms:

| Metric | Average | p95 | Maximum |
| --- | ---: | ---: | ---: |
| Completed-frame main-thread CPU | 8.931 | 9.400 | 10.500 |
| GPU render interval | 2.785 | 2.876 | 4.162 |
| GPU compute interval | 0.333 | 1.632 | 1.692 |
| GPU earliest-start to latest-end span, including gaps | 8.620 | 9.187 | 9.704 |
| Completed-frame callback interval proxy | 16.666 | 16.700 | 16.800 |

GPU render/compute have **301 eligible, 0 missing/stale/partial frames**. GPU span includes intervening gaps and is not a sum of passes; callback intervals are not display presentation timestamps. Actual display/scan-out timestamps are unavailable. **No 60 fps, smoothness, GPU headroom or frame-budget pass is established. Not tested on a device.**

[Manifest](../../.look/evidence/1794698036110-91461/evidence.json), [full frame sample](../../.look/evidence/1794698036110-91461/frame-sample.json), [output](../../.look/evidence/1794698036110-91461/output.txt). Opened the [still](../../.look/evidence/1794698036110-91461/checkpoint-a-rebased-frame-still.png), [two-frame motion sheet](../../.look/evidence/1794698036110-91461/checkpoint-a-rebased-frame-motion.png) and [curves](../../.look/evidence/1794698036110-91461/checkpoint-a-rebased-frame-curves.png): the table and bays are partly visible, but the large profiler overlay darkens and covers most of the scene. This is a diagnostic view, not a fresh visual-quality approval. The curves show the setup teleport/settle and otherwise stationary player; they do not establish smoothness under this load.

### Follow-up validation and remaining work

Only this review and the plan's ticks are edited. Prettier, scoped lint and the required full `npm run check` are run after this follow-up edit; the [follow-up check log](../../.look/evidence/1794698036110-91461/follow-up-check.log) records their validation run. The login shell had selected Node **24.11.1** for the first Works/perf client invocations; they completed with that worker server runtime. The frame command and final checks explicitly use the repo's required Node **26.13.0**. This runtime departure is recorded rather than silently claiming every command used Node 26; the requested one Works rerun was not repeated again.

Remaining: a quiet-machine frame sample, actual server simulation profiling if required, and the orchestrator's explicitly excluded `test:net`. No new game failure was found. The earlier observation-only stage/P2 evidence retains its original provenance; foreground layout changes and real-time/device behaviour remain unverified. This runner does not block further development on an owner walk.

## Initial-run record (historical; superseded above where rerun)

## Build and scope

Tested worker commit **89569327e18c99561c41055c5915fe9ed4f68972**, tree **124a8993b46791a7ee1e6a61d926897db2531977**, on branch **codex/rotunda-checkpoint-a**, the supplied combined v45/rotunda tip. All broker manifests record the worker before/after separately from the trusted harness (**d87c05719d3231bafb41eabb9fd23100457f6cde**). The per-harness verdict's commit is the launcher's commit, not a claim that the worker was that build. No game source changed. Only this report and Checkpoint A's sub-items are committed. The Boogler copy and WORLD_NS were untouched. No push or ship. **Not tested on a device.**

Browser commands used the existing broker and disposable local server only. Dependencies remained this worktree's own. Initial required `npm run inflight` failed trying to open FETCH_HEAD (sandbox permission); it was not retried. No remote fetch, push or other external network command was used afterward.

## Ordered checkpoint results

1. **Works real-input segment: FAIL, twice.** `timeout 1800 node .look/see-client.ts look --real --rail-seed works-arrive --query 'shot=play&railFrom=works&railStop=wagon coupled' --eval dev/look/evals/railway-works-bot.ts --until window.__placeDone --name checkpoint-a-works` (retry name adds `-retry`). Breaker: **4.5 / 4.4 s**; stall struck/open: **20.2 / 20.1 s**; missing **“Request stop: Quarry” offered aboard** at **85.1 / 85.2 s**. Loads **19.32 → 10.19**, then **7.37 → 3.68**. Both have WebGPU, advancing completed frames and no graphics errors; the bot error fails them. Opened both end stills: Buddy stands aboard a flat wagon next to the red engine at the platform, holding logs, with the failure overlay. **Zero footing sets, cradle fits, table turns or wagon couplings proved by this segment.** This is a repeated bot-route failure; it does not localise a rotunda game defect. Read full console checkpoint reports in both manifests, including the failure stack: [manifest](../../.look/evidence/1794672031384-44470/evidence.json), [manifest](../../.look/evidence/1794672160728-44982/evidence.json).
2. **garage-open on steel-home: health PASS; installed visible.** `timeout 240 node .look/see-client.ts look --real --rail-seed steel-home --hud --eval dev/look/evals/garage-open.ts --action dev/look/evals/garage-act.ts --query garage=moment --seconds 12 --frames 24 --curves --video --name checkpoint-a-install` (question omitted here; exact command in manifest). Load **4.09 → 4.30**. Opened the end still and 24-frame motion sheet: the longer red boiler is installed; one full turn is visible, roughly **3 s**, bracketed by the 3.13–6.26 s sheet samples. This is coarse action-duration evidence, not a frame-pacing benchmark. The table has spare room. **The initial engine nose is clipped at the left edge and covered by the menu; the final still is a prominent head-on engine.** [manifest](../../.look/evidence/1794672280816-45610/evidence.json).
3. **garage-two on steel-home: health PASS; Line.boiler = 1.** `timeout 240 node .look/see-client.ts look --players 2 --real --rail-seed steel-home --hud --eval dev/look/evals/garage-two.ts --until window.__twoDone --action dev/look/evals/garage-act.ts --query garage=enter --seconds 12 --frames 24 --video --name checkpoint-a-bystander`. Load **4.06 → 4.64**. Opened observer still, observer motion sheet and installer still. Bystander body **(956.47,18.45,20.64)** and camera **(961.64,20.53,20.72)** stayed unchanged, held=false before/after. The lift and full turn are legible at ordinary play distance; the jib mast and crew cover part of the part's journey. The engine is smaller than the dedicated garage view, but recognisable. [manifest](../../.look/evidence/1794672363028-45841/evidence.json).
4. **Perf: PARTIAL / exit 1.** `timeout 300 node .look/see-client.ts perf --view summit`. Fresh production entry, **summit** view: camera **(1015,110,-6)** toward **(850,0,60)**, **960×600, DPR 1, MSAA 4**, Apple Metal-3 WebGPU, arrival state (not the steel-home seed). **409 calls, 221 shadow calls, 902,067 triangles, 1,232 geometries, 214 programs; 3 render passes, 1 compute dispatch/pass.** Submission load **4.08 / 7.89 / 14.37**; next sample **3.23 / 7.33 / 13.94** (1/5/15-minute averages). This older trusted perf harness does not stamp exact acquisition/end load. It printed main-thread frame CPU avg/p95/max **7.236 / 6.720 / 240.110 ms**, render CPU **5.038 / 4.295 / 237.910 ms**, then **TypeError: stateHashes is not a function** in its sim profiler. Those timings include capture/startup work on a shared machine and are **not performance evidence**. No GPU timing, sim cost, quiet before/after comparison or rotunda-specific budget verdict. Render JSON is preserved; no PNG was produced. The API error is not a load-dependent gameplay failure, so the requested single perf invocation was retained. [manifest](../../.look/evidence/1794672446302-46095/evidence.json); [render JSON](../../.look/evidence/1794672446302-46095/render.json).
5. **Loop: PASS / exit 0.** `timeout 300 npm run loop -- run`; submission load **3.23 / 7.33 / 13.94**. Reported runner wall time **7,991 ms** (loaded-machine diagnostic only). Solo canonical real-rule model finished **37:51 straight-line / 44:13 calibrated**; the alternate orders finished too, no softlock failure. The model's whole-route totals **3:12 / 2:56 / 2:57 / 3:00** for 1–4 players include **stand-ins for areas 4–9**, not played browser routes. No real controller, collider walk, train ride or first-time pacing proved by this model.
6. **Level-check: PASS / exit 0.** `timeout 300 npm run level-check`; submission load **3.11 / 7.10 / 13.74**. **14 reports, 9,745 ms**; machine clearance **61,660 poses / 5,285,886 swept mesh samples / 0 problems**; grounding **5,266 placements / 0 problems**; service walkways **322 samples / 0 ledges >0.3 m**; track continuity **18 tracks, 7 joins**. Its documented exclusions remain: room/station and render-created colliders, controller timing, directed returns and swept player movement. It does not prove roof or future pit escape reach.
7. **Town sheet: PASS / exit 0; PNG opened.** `timeout 120 npm run town-plan-sheet`; submission load **3.23 / 6.93 / 13.57**. Stamp **b8052d6b959c**, **14 today / 14 Round / 8 plots**. [Manifest](../../.look/town-plan-sheet/manifest.json), [opened PNG](../../.look/town-plan-sheet/town-plan-sheet.png). The rotunda footprint and 16 m table read clearly; several labels overlap at native sheet scale near the hall/curio cluster. Plot 3/5 and 5/6 wall gaps are **2.8 / 2.9 m**; this is horizontal plan spacing, not a walk-through verdict.

**test:net deliberately NOT RUN**, as requested; orchestrator owns that proof. No new scenario or test harness was added; the diagnostic evals are ignored local look setup/actions, not game code.

## Finding 2: eye-height views, all three stages

Question: can a player recognise the ruin → three → five bay progression, back windows and roof sweep from the green, hall and footing approach? The three accepted host seeds were **works-open (stage 0)**, **stall-done (stage 1)** and **steel-home (stage 2)**, read back from the mounted rotunda inspection. Every listed final stage still was opened with view_image. Camera height is **terrain +1.6 m**, FOV **62°**, 960×600. Buddy was moved 3 m behind the fixed eye camera to avoid seeing the inside of his own head. These are eye-height cameras, not ordinary following-camera screenshots and not traversals.

The local command form was `timeout 180 node .look/see-client.ts look --real --rail-seed <seed> --eval .look/checkpoint-a/eye.ts --query <pose> --warm 1 --frames 2 --name <name> --question <question>`. The exact query, camera and stage are printed as EYE in each manifest's output.

| Position, world metres | Arrival | Three bays | Five bays |
| --- | --- | --- | --- |
| Green centre **(884.993,18.800,20.076)** | Hall, curio displays and grey plot blocks hide ruin | Almost identical; stage not legible | Roof sliver only; full arc hidden |
| Hall front **(906.080,19.818,12.401)** | Hall posts and half wall hide ruin | Same obstruction | Tiny roof fragment above half wall, still cannot compare whole roofline with hall |
| Footing carry approach **(979.555,19.843,27.178)** | Ruin piers, radial rails and open grass approach visible | Large blank end wall dominates; doorway is a narrow glimpse | End wall larger again; arc shape weak from here; no prop visibly blocks the approach |
| 40 m north of green **(884.993,19.600,-19.924)** | Forge/building block view | Same | Same |
| 65 m south of green **(884.993,19.553,85.076)** | Foreground tree and plots obscure ruin | Roof/window sliver behind plots | Larger roof/window sliver; not a satisfactory comparison |
| Clear position beyond plots **(944.555,19.765,60.178)** | Standing piers and radial tracks clearly visible | Continuous three-facet rear wall, three broad dark window bands | Wider five-facet wall, five bands, roof rises at middle and falls toward ends; growth plainly visible |

The useful relocation is **59.56 m east and 40.10 m south of the green centre**, outside the green, directly south of the rotunda. The green does **not** give a useful view in this build. The clear rear wall is not featureless, but the window bands are flat dark rectangles rather than detailed glazing, appropriate to this blockout. **Roofline vs hall from the requested hall-front view remains visually unverified because of occlusion.** No source repair was authorised.

Two initial centre captures were rejected because Buddy's own head occupied the eye camera; both were opened and retained, not used as stage proof. North and southern attempts are retained as evidence of occlusion. Extra relocation captures exceeded the usual three-view iteration allowance to satisfy the explicit instruction to keep moving until the rotunda showed. No scenery was moved or hidden.

## Finding 4: own camera at the post

The original garage-open uses the dedicated garage camera. To add the requested player's own camera, a local copy of garage-two changes **only** the first observer's `stand(97,12)` to `stand(post.bearing+6,post.r-0.2)`. The installer still opens and holds through the existing real-input eval. It is a second, explicitly diagnostic view, not a rerun counted as a second garage-two checkpoint proof. Its copied console label still says “12 m east”; trust the measured coordinates instead.

Load **27.39 → 19.31**. Observer body **(952.98,18.45,15.54)**, camera **(957.46,20.53,12.94)** and held=false stayed unchanged. **Line.boiler=1**, phase returns idle. Opened both player stills and the motion sheet: engine, hanging boiler and full turn are recognisable across the table; the spare bridge length is generous rather than cramped. **The other Buddy and the large “Look at the engine” prompt overlap the lower engine; the hanging part enters from the left edge.** This is an observation by a second player beside the post while someone else operates it, since the installing player's own view enters the garage. [manifest](../../.look/evidence/1794673715637-59032/evidence.json).

## P2: dropped player, turn end, restored deck

**PASS for the sampled case**, not a new sync scenario. Accepted **cradle-fitted** host seed; real Interact at the bridge handle; wait for the mounted table to report turning; drop onto the disc at the final bridge footprint (6 m along, 1.1 m across), without changing any shared row. Observe through turn end, walk clear through the real controller, then drop again onto the resting bridge. `timeout 240 node .look/see-client.ts look --real --rail-seed cradle-fitted --eval .look/checkpoint-a/disc-setup.ts --action .look/checkpoint-a/disc-action.ts --warm 1 --seconds 28 --frames 28 --video --curves --name checkpoint-a-disc`.

Load **15.44 → 28.08**. Body height before/after first turn end **18.509834 / 18.509861 m**; sampled spread **0.000027 m**, with no upward pop. After walking clear, the second drop rests at **18.849861 m**, **0.340027 m higher**, proving support at that resting deck pose. The sequence later includes the automatic shunter return turn, which removes deck support again; the final still is after that later motion and is not the sole support proof. No claim of continuous solid support while a bridge turns.

Opened the end still, full motion sheet, curves, [full frame at 9.3 s](../../.look/evidence/1794673633601-58526/disc-9.3.png), and [16 consecutive encoded frames starting 9.3 s](../../.look/evidence/1794673633601-58526/disc-consecutive.png) (30 fps, row-major, cropped around Buddy/deck, enlarged 2×). Buddy stays down beside the crossing deck edge; no upward snap is visible in that sequence. The curve separates the two deliberate drops and shows the flat height through turn end and the higher supported landing. Pixels and encoded frames are not display-presentation evidence. **Real-time smoothness remains unverified.** [manifest](../../.look/evidence/1794673633601-58526/evidence.json). Eval copies are beside this manifest; numerical samples are in output.txt and curves CSV.

## Evidence ledger and loads

One-minute acquisition → end load below comes from the broker's trusted harness verdict. Those verdicts stamp the **launcher** tree; manifests above bind the actual worker tree. Health pass does not mean visual approval. All linked stills in this table were actually opened; stage motion sheets other than the install/P2 groups were not reviewed. Queue delays and other jobs are preserved in output.txt. All meaningful runs were bounded by timeout (Works 1800 s; looks 180/240 s; perf/loop/level 300 s; sheet 120 s).

| Run | Command status | Load | Evidence |
| --- | --- | --- | --- |
| solo warp preflight | failed | not stamped → not stamped | [manifest](../../.look/evidence/1794672003203-44203/evidence.json); — |
| checkpoint-a-works | failed | 19.32 → 10.19 | [manifest](../../.look/evidence/1794672031384-44470/evidence.json); [opened still](../../.look/evidence/1794672031384-44470/checkpoint-a-works-still.png) |
| checkpoint-a-works-retry | failed | 7.37 → 3.68 | [manifest](../../.look/evidence/1794672160728-44982/evidence.json); [opened still](../../.look/evidence/1794672160728-44982/checkpoint-a-works-retry-still.png) |
| checkpoint-a-install | health pass | 4.09 → 4.3 | [manifest](../../.look/evidence/1794672280816-45610/evidence.json); [opened still](../../.look/evidence/1794672280816-45610/checkpoint-a-install-still.png) |
| checkpoint-a-bystander | health pass | 4.06 → 4.64 | [manifest](../../.look/evidence/1794672363028-45841/evidence.json); [opened still](../../.look/evidence/1794672363028-45841/checkpoint-a-bystander-still.png) |
| perf summit | failed | not stamped → not stamped | [manifest](../../.look/evidence/1794672446302-46095/evidence.json); — |
| arrival-green | health pass | 3.31 → 3.79 | [manifest](../../.look/evidence/1794672541115-46480/evidence.json); [opened still](../../.look/evidence/1794672541115-46480/arrival-green-still.png) |
| three-green | health pass | 3.57 → 3.71 | [manifest](../../.look/evidence/1794672581398-46664/evidence.json); [opened still](../../.look/evidence/1794672581398-46664/three-green-still.png) |
| arrival-green-fixed | health pass | 3.47 → 3.53 | [manifest](../../.look/evidence/1794672643245-46940/evidence.json); [opened still](../../.look/evidence/1794672643245-46940/arrival-green-fixed-still.png) |
| three-green-fixed | health pass | 3.36 → 3.35 | [manifest](../../.look/evidence/1794672687462-47154/evidence.json); [opened still](../../.look/evidence/1794672687462-47154/three-green-fixed-still.png) |
| five-green | health pass | 3.52 → 3.67 | [manifest](../../.look/evidence/1794672735326-47437/evidence.json); [opened still](../../.look/evidence/1794672735326-47437/five-green-still.png) |
| works-open-north | health pass | 3.71 → 3.76 | [manifest](../../.look/evidence/1794672782491-47706/evidence.json); [opened still](../../.look/evidence/1794672782491-47706/works-open-north-still.png) |
| works-open-hall | health pass | 4.56 → 5.61 | [manifest](../../.look/evidence/1794672831183-48019/evidence.json); [opened still](../../.look/evidence/1794672831183-48019/works-open-hall-still.png) |
| works-open-approach | health pass | 5.36 → 4.49 | [manifest](../../.look/evidence/1794672868343-48218/evidence.json); [opened still](../../.look/evidence/1794672868343-48218/works-open-approach-still.png) |
| stall-done-north | health pass | 4.56 → 4.75 | [manifest](../../.look/evidence/1794672903625-48485/evidence.json); [opened still](../../.look/evidence/1794672903625-48485/stall-done-north-still.png) |
| stall-done-hall | health pass | 5.74 → 4.88 | [manifest](../../.look/evidence/1794672941077-49654/evidence.json); [opened still](../../.look/evidence/1794672941077-49654/stall-done-hall-still.png) |
| stall-done-approach | health pass | 3.82 → 3.91 | [manifest](../../.look/evidence/1794672977680-50607/evidence.json); [opened still](../../.look/evidence/1794672977680-50607/stall-done-approach-still.png) |
| steel-home-north | health pass | 4.54 → 4.12 | [manifest](../../.look/evidence/1794673070298-50853/evidence.json); [opened still](../../.look/evidence/1794673070298-50853/steel-home-north-still.png) |
| steel-home-hall | health pass | 5.78 → 12.79 | [manifest](../../.look/evidence/1794673128720-52496/evidence.json); [opened still](../../.look/evidence/1794673128720-52496/steel-home-hall-still.png) |
| steel-home-approach | health pass | 18.57 → 20.1 | [manifest](../../.look/evidence/1794673186660-53693/evidence.json); [opened still](../../.look/evidence/1794673186660-53693/steel-home-approach-still.png) |
| works-open-south | health pass | 19.79 → 17.24 | [manifest](../../.look/evidence/1794673252060-54264/evidence.json); [opened still](../../.look/evidence/1794673252060-54264/works-open-south-still.png) |
| stall-done-south | health pass | 14.29 → 12.07 | [manifest](../../.look/evidence/1794673287432-54468/evidence.json); [opened still](../../.look/evidence/1794673287432-54468/stall-done-south-still.png) |
| steel-home-south | health pass | 8.23 → 7.37 | [manifest](../../.look/evidence/1794673323671-54638/evidence.json); [opened still](../../.look/evidence/1794673323671-54638/steel-home-south-still.png) |
| works-open-clear-back | health pass | 5.2 → 5.13 | [manifest](../../.look/evidence/1794673421739-54996/evidence.json); [opened still](../../.look/evidence/1794673421739-54996/works-open-clear-back-still.png) |
| stall-done-clear-back | health pass | 5.4 → 6.03 | [manifest](../../.look/evidence/1794673456845-56506/evidence.json); [opened still](../../.look/evidence/1794673456845-56506/stall-done-clear-back-still.png) |
| steel-home-clear-back | health pass | 8.71 → 8.16 | [manifest](../../.look/evidence/1794673494365-57131/evidence.json); [opened still](../../.look/evidence/1794673494365-57131/steel-home-clear-back-still.png) |
| checkpoint-a-disc | health pass | 15.44 → 28.08 | [manifest](../../.look/evidence/1794673633601-58526/evidence.json); [opened still](../../.look/evidence/1794673633601-58526/checkpoint-a-disc-still.png) |
| checkpoint-a-post-eye | health pass | 27.39 → 19.31 | [manifest](../../.look/evidence/1794673715637-59032/evidence.json); [opened still](../../.look/evidence/1794673715637-59032/checkpoint-a-post-eye-still.png) |

First preflight `--wall 1500` was rejected by the older broker before a browser run; [client response](../../.look/see/1794671987393-44146.done.json). Removing it then hit `--clock-url requires two-player warp` before gameplay; the failed manifest is in the table. Subsequent solo captures used the supported `--real` path with outer timeout. The single Works retry was required to disambiguate the initial loaded run and repeated the same failure at lower load.

## Documentation validation

`npx --offline prettier --write docs/reviews/rotunda-checkpoint-a.md docs/plans/roundhouse-rotunda.md` completed. `timeout 600 npm run check` **passed, exit 0**: lint 0 problems, typecheck, registry, level/assets and production build completed; **2,048 unit cases, 2,047 passed, 0 failed, 1 TODO**. The existing TODO is the longer-fleet `b011e7` wait bound (1,146 ticks versus 1,050); it is reported as TODO, not a new pass or a failed check. Load observed during validation was **47.24 / 26.81 / 17.44**; no validation wall time is performance evidence. [Full check log](../../.look/checkpoint-a/check.log). `git diff --check` passed. No game implementation changes to fix; failed bot and stale profiler remain for the orchestrator. This runner makes no ship/merge/deploy claim and does not hold subsequent development for an owner walk.
