# Server-owned players, step 4: behavior-preserving headless extraction

Built from `f00736aec` in `codex/server-players-step-3`, after the step 3 land commit. No push or ship.
DESIGN.md: **Small and readable**, **Clear authority**, **Server hosts every room**.
Series review stamp: **abf9a64a59c4** (`npm run review-stamp -- . --no-fetch`, nine files).

## Scope and departure

`src/world/boogler-brain.ts` owns terrain checks, start selection, targeting and reactions to injected visitor facts.
`src/world/boogler-walk.ts` owns turning and walking. Both are headless: no renderer, DOM, physics or wall clock.
The client injects the existing live land and RNG, gathers visitors in the same order, and remains the deciding
lead. `g` and `bg`, takeover behavior, model, animation, talk, ride, launch and copy stay unchanged. No server brain
installation, replication, persistence or namespace bump is included; v41 remains current.

**The plan's 10 Hz and continuous-leg conversion is not implemented. Step 4 is incomplete as written.**
The brief also requires unchanged visible behavior and equivalence with main. Main uses frame-sized left-endpoint
Euler integration: `turnToward` changes yaw but returns the pre-turn error used by movement. A continuous formula
is not exact for it. At 3.4 m/s with an initial 120-degree error over two seconds, main at 60 Hz travels
5.6088467030696885 m; the continuous integral travels 5.6372052037072296 m; 10 Hz Euler travels 5.470673201346596 m.
Arrival, wait and flee-check timing also changes random draw order and eventually targets. The plan's 1 ms/1 cm
test can pass while a long main trace diverges. This extraction retains main's `dt` and operation ordering instead.
There is consequently no `BooglerLeg`, `booglerPose` or `booglerLegEnd` API yet. A later conversion must resolve
that behavioral tradeoff before steps 5 and 6 assume legs exist.

The cosmetic hop consumes the same RNG as wandering on main. The adapter deliberately preserves that sharing.
Changing it here would change later walks despite unchanged brain arithmetic. The future server brain will need
an explicit decision about that coupling; it is not silently removed by this extraction.

## Proof

`node dev/boogler-equivalence.ts .look/boogler-main-trace.jsonl` reads the brain and RNG-consuming animation
sections directly from the pinned main commit with `git show`. It runs scripted wander, approach, wary, talk,
ride and post-launch visitor inputs against both implementations, with a varying 30/60/120 Hz frame sequence.
The JSONL records every input, main state and RNG draw count; comparison includes targets, trip, waits, mode,
facing and position, not just rounded wire poses. The launch phase is the visitor leaving the ride; player flight
physics is outside this headless trace. It also checks every sampled position against the baked wet/blocked land.

The recorded real-island trace passes **20,000 frames (375 seconds), 154 decision changes, 424 RNG draws**:
maximum position error **0 m**, maximum yaw error **0 rad**, all state fields exactly equal, zero wet/blocked
samples. All three modes occur. Phase counts: wander 6,800; approach 2,200; wary 2,200; talk 2,750; ride 2,750;
post-launch 3,300. Trace SHA-256: `5efb837a7b7eb15dff69a5175d28bcd5f47feb629baac97d6680a1aa8230ecbc`.
Files: `.look/boogler-main-trace.jsonl`, `.look/step4-equivalence.json`. This is a headless replay of actual main
source against the captured island, not a recording of player flight physics or a browser's variable frame cadence.

The new tests first failed with the absent brain/walk modules; after extraction all **14 focused brain/walk/land/image
tests pass**. An independent Astra reviewer reran those tests and the actual-land trace and found no actionable
defects. Its first draft review caught an invalid top-level return in the trace generator; it is fixed by stripping
a complete function declaration. Lint and typecheck pass, with zero new suppressions.

The server image now also includes `src/math.ts`, the walk's existing angle helper, in Docker/build/deploy lists.
The image test explicitly walks the prepared brain as well as the loader without installing either on the server.

Changed files: `src/world/boogler-{brain,walk}.ts`, `src/boogler/boogler.ts`,
`dev/boogler-equivalence.ts`, `test/boogler-{brain,walk}.test.ts`, `test/server-image.test.ts`,
the three server packaging lists, `docs/agents/lockstep.md`, `docs/game-design/boogler.md`, the plan
and both step reports.

## Browser comparison

Both eight-second clips use seed `0x5eed`, the same observer setup and camera. The only temporary runtime fixture
change on either build was replacing the caller's Date.now-derived seed with that constant; it was restored after
each capture. [Main](../../.look/evidence/1794608703409-19996/evidence.json),
[branch](../../.look/evidence/1794609864621-57452/evidence.json). Both report no source change during capture,
WebGPU, advancing frames and no page/console/graphics errors. Different real frame sequences/startup duration
put him about 3.5 cm apart when the setup logs begin, so these are not pixel-identical trajectories.
The standard curve CSVs measure the observer, not The Boogler; they are not NPC velocity evidence.

Opened both `boogler-main-motion.png` and `boogler-branch-motion.png`, plus six consecutive encoded video frames
from each clip (`.look/boogler-{main,branch}-consecutive.png`, ffmpeg frames 60–65, cropped/enlarged for inspection).
Both show the same court-to-sign walk, body silhouette and tall hat motion. No snap or changed walking direction
is visible in those inspected frames. Background gulls differ; this is not pixel equality or real-time smoothness proof.

The [scenario batch](../../.look/evidence/1794610171693-62278/evidence.json) passed **boogler-tag, boogler-talk-pad
and interact**. Opened `interact/talk-still.png` and `interact/riding-still.png`: readable unchanged dialogue and
the player standing on his back with the hat flattened; the ball's Grab prompt wins while riding. Two failures:
`one-hand` passed holding, giving the frisbee and sprouting mushrooms, then the trusted old harness read
`window.boogle.gifts.items` (`d87c05719:dev/scenarios/one-hand.ts:131`), a retired field. `world-inputs` waited
90 seconds for the retired gifts layout (`d87c05719:dev/scenarios/world-inputs.ts:43`). Neither failure tests the
updated worktree scenario; the broker is immutable to this worker. No current scenario bypass or new browser
harness was used. Their full current-harness passes remain unverified. Graphics errors were empty.

The [two-player T2 route](../../.look/evidence/1794610196465-62529/evidence.json) passed: both finished all expected
beats, mirrors equal at **196 sampled server steps**, no bot failure. Read `run/report.txt` and `run/verdict.json`;
opened both `run/end-still.png` and `run/p2-end-still.png`: both players are at the completed station beside laid
track, with the T2 completion overlay. It ended under load (30.29), so this is not timing/feel evidence.

The [live land check](../../.look/evidence/1794610267170-64936/evidence.json) passed `node dev/bake-boogler-land.ts
--check`: every value of the new build's initialized land equals the pinned bake, **459,799 bytes**, without
rewriting it. This executes the same live sampler as the updated world-inputs pin; it does not turn the old
world-inputs failure into a pass. The original bake still was also opened (step 3 report).

## Final checks

Direct worktree `npm run test:net`: **175/175**. Server tests: **254/254**. Logs:
`.look/step4-net.log`, `.look/step4-server.log`. The full check's first run passed **1,797 unit tests / one existing
TODO** but caught an over-budget required-reading route. Shorter prose restored the budget without changing
the math restrictions; registry now passes. Ship-check passed **392 assertions / 45 affected test files**,
17 lint files and typecheck. Final `npm run check` passed: **1,797 unit tests / one existing TODO**,
lint, typecheck, registry, level/assets and Vite build (`.look/step4-check-final.log`).

The [supplemental manifest](../../.look/evidence/1794610267170-64936/supplemental/supplemental.json)
preserves the trace, consecutive frames and direct-command logs beside the broker evidence for handoff.

After browser capture, changes are documentation only (the reading-budget fix and reports). Native-trig and
headless boundaries passed lint without suppressions; all protected files and copy remain unchanged. This branch
does not claim to complete the plan's continuous-leg API or 10 Hz scheduling.

## Copy and native math

Copy moved: **none**. Every dialogue, bark, HUD and gift line remains verbatim and client-side; no line has a new
file/line location. No new suspect line was found. The plan's existing unreachable frisbee gift line remains an
owner finding, unchanged. No ROM data, seat code, prefab lint files or room-replacement code was touched.

**Reviewer attention:** both headless modules use native trigonometry outside `src/sim` and `src/world/rules`,
as planned. They still run only as Host/local fallback code and never feed railway prediction. No lint suppression
or math-policy change is introduced. `docs/agents/lockstep.md` records this boundary.

## Limits

Continuous motion, human feel, reaction latency and device performance cannot be established from saved frames.
No deploy or server-authoritative Boogler is claimed. **Not tested on a device.**
