# Server-owned players, step 5: server shadow

Built on `edf1e1f46`; implementation commit `1da0f68c`. No push or ship.
DESIGN.md: **Clear authority**, **Server hosts every room**, **Leave something for the next visitor**.
Review stamp: **847371ddac44**, ten review files. This is a fingerprint, not an independent review approval.

## Scope and files

The server runs an independent Boogler at the room's 10 Hz rule tick. The lead still decides everything players see.
No shadow state, leg, command or event is replicated or checkpointed; `g`, `bg`, WORLD_NS v41 and all copy are unchanged.
No seat, prefab or room-replacement code changed. `rooms.ts` changes only its status projection.

| Files | Responsibility |
| --- | --- |
| `src/world/boogler-shadow.ts` | Continuous travel on decision legs; fixed 100 ms decisions and tick-quantized waits/flee checks |
| `src/world/boogler-brain.ts` | Inject a walk strategy; its default remains the original client Euler step |
| `src/world/rules/boogler.ts` | Tick-only installation, lazy seed after recovery, no save/ops/projection |
| `server/src/host/boogler-presence.ts`, `railway-supply.ts` | Validated continuous facts and bounded visitor positions |
| `server/src/host/world-host.ts`, `hosted-room.ts` | Baked land cached once per process; connected-player gate; presence inputs and diagnostic output |
| `server/src/host/boogler-meter.ts`, `rooms.ts` | Bounded lead comparison and elapsed brain cost, exposed through the existing status endpoint |
| `server/test/boogler-host.test.ts` | Nine behavior, validation, determinism, cadence, terrain, pause and real-socket tests |
| `dev/boogler-shadow-perf.ts`, `dev/look/evals/boogler-shadow.ts` | Repeatable CPU benchmark and existing-broker two-client diagnostic script |
| `src/world/README.md`, `src/world/rules/README.md`, `docs/agents/lockstep.md` | Shadow ownership and native-math boundary |

The decision RNG is private `mulberry32(world.seed ^ imul(firstAwakeTick, 0x9e3779b9))`, initialized only after recovery.
No animation calls it. The lead deliberately retains its wall-clock seed and animation/decision RNG sharing until step 6.
The shadow's 0.8 s flee check is exactly eight ticks; float subtraction cannot stretch it to nine.
The host does no brain work with zero connected sockets, including the reconnect/room-pause grace. Resume shifts the
leg's origin tick over skipped empty-room ticks, with no catch-up movement or RNG draws.

The continuous shadow path is intentionally different from the original frame-sized Euler step. Twelve numerical
cases (0/60/120/180 degrees, 1.5/2.3/3.4 m/s) agree with a 1 ms integration within **1.701 mm**, below 1 cm/5 mrad.
The unchanged lead path still matches the pinned main-source trace for **20,000 frames, 154 decisions, 424 RNG draws**:
zero position/yaw error, zero unsafe samples, trace SHA-256 `5efb837a7b7eb15dff69a5175d28bcd5f47feb629baac97d6680a1aa8230ecbc`.

## Input boundary

Only `bg[0]` (integer 0/1/2) and `bg[1]` (exactly 1 for wary) enter the server brain; invalid or missing values mean off.
Event fields are ignored. Coordinates and server receipt timestamps must be finite, not future, and younger than 2 s.
Finite extreme coordinates clamp to the island's HALF bounds before distance arithmetic. The server never copies a
player or lead pose into the shadow. Existing talk/rider/threat reach checks remain 5/1.6/9 m.
Forged proximity can elicit these ordinary reactions, but target selection and every movement still check baked land.
This is bounded consumption, not an anti-cheat claim that the reported player position is truthful.

Tests cover invalid arrays/objects/enums, missing fields, nonfinite/extreme positions, stale/future timestamps,
real relayed presence, empty and paused rooms, no save/wire output, independent frame-sized host advances and wall times,
exact flee cadence, and **20,000 hostile-input ticks** without a wet/blocked position or movement over 0.34 m/tick.

## Step meter

The existing endpoint is **`GET /rooms/:id/host`**, not the plan's `/status` spelling. It now includes `boogler`
(pose, brain state and current leg) and `booglerMeter`. The meter retains at most 600 matched rule ticks.
Agreement means **equal mode AND walking**, the decisions visible in unchanged `g`; targets/trips are not on that wire.
Samples compare the current shadow with the latest fresh lead packet, without latency compensation. Neither these
packets nor the diagnostic meter feed the brain or its RNG.

[Two-client meter manifest](../../.look/evidence/1794613034445-44336/evidence.json).
Script: `node .look/see-client.ts look --players 2 --real --eval dev/look/evals/boogler-shadow.ts --until window.__placeDone`.
Two real connected game clients run eight seconds each of wander, approach, talk, ride, wary and release.
Teleports and forced continuous facts are diagnostic inputs, not a human interaction/latency test. Both players follow
the visible lead; once the independent shadow wanders elsewhere, their claims correctly fall outside its reach.
The lead keeps its normal seed and RNG; no seed, pose, target or decision is copied to force agreement.

| End of phase | Room tick | Matched ticks | Median gap, m | Worst gap, m | Decision agreement |
| --- | ---: | ---: | ---: | ---: | ---: |
| Wander | 179 | 148 | 14.125 | 19.066 | 79.05% |
| Approach | 260 | 229 | 18.869 | 33.711 | 78.17% |
| Talk | 341 | 310 | 19.960 | 41.530 | 66.13% |
| Ride | 422 | 391 | 26.691 | 56.796 | 52.43% |
| Wary | 503 | 472 | 34.841 | 82.083 | 43.43% |
| Release | 584 | 553 | **40.493** | **82.284** | **48.10%** |

These are cumulative/window numbers, not independent phase averages. At the first recorded status, tick 108,
the median/worst were 8.558/14.584 m with 68.83% agreement across 77 samples. Both page clocks achieved 1.00x;
they finished at the same room tick. This establishes substantial divergence, not behavioral parity for the flip.
Different seeds, decision cadence, integration and removal of animation RNG coupling all contribute; this run does
not isolate their individual contributions. Step 6 needs its own local-talk, rider-easing and reaction-budget checks.

## Cost

The live two-client run measured **0.05953 ms mean / 0.74471 ms maximum elapsed brain work per tick** across 584 ticks:
**0.5953 ms per awake room-second at 10 Hz**. This includes visitor collection/validation and brain stepping, excludes
diagnostic aggregation and one-time land loading, and is elapsed time rather than process CPU. Load was 14.94 to 27.8;
it is not a quiet-machine performance verdict. Empty rooms add zero brain ticks.

`node dev/boogler-shadow-perf.ts` separately measures process CPU after warm-up against the actual baked land and two
visitors cycling through talk, ride and wary. One land load took **13.77 ms**, shared across rooms.

| Awake rooms | Measured ticks | CPU, microseconds/tick | CPU ms/room-second at 10 Hz | CPU ms/second, all rooms |
| --- | ---: | ---: | ---: | ---: |
| 1 | 20,000 | 3.222 | 0.03222 | 0.03222 |
| 8 | 160,000 | 1.313 | 0.01313 | 0.10504 |
| 32 | 640,000 | 1.388 | 0.01388 | 0.44428 |

The old server ran no Boogler brain; this is added work. The warmed Node benchmark excludes networking, diagnostics,
land startup and rendering; it is not a production-capacity claim or a controlled whole-server before/after load test.
The live room timer's p50/p95 gap went from 17.683/20.366 ms at the first sample to 17.410/19.086 ms at the last;
maximum 44.695 ms and zero dropped room steps. That is a within-run observation, not an improvement claim.

## Checks and visual evidence

- Final `npm run check`: pass, **1,797 passing unit tests, one existing TODO**, lint/typecheck, registry, level/assets and build.
- Final `npm --prefix server test`: **263/263**. Focused shadow tests: **9/9**.
- Direct worktree `npm run test:net`: **175/175**. The sandbox launch first failed at Chromium's Mach-port permission;
  the same requested npm script passed outside the sandbox. No custom Chromium launcher was used.
- `node dev/ship-check.ts origin/main HEAD`: pass, **209 assertions / 23 affected test files**, 12 lint files and typecheck.
- `npm run registry`: pass. Initial failures were the eval's missing command-header comment and a reading route 19
  characters over budget; corrected without changing runtime behavior. `npm run review-stamp -- . --no-fetch`: **847371ddac44**.
- [Scenario manifest](../../.look/evidence/1794613136111-47623/evidence.json): **boogler-tag, interact pass**.
  **one-hand fails** at retired `window.boogle.gifts.items` (trusted `d87c05719`, line 131).
  **world-inputs fails** waiting 90 s for retired classic `land.layout.trees` (same trusted commit, line 43).
  These reproduce the step 4 harness limitations. Current-harness full passes remain unverified.
- [Live land manifest](../../.look/evidence/1794613492524-55917/evidence.json): `node dev/bake-boogler-land.ts --check`
  verifies all values of the **459,799-byte** bake against the initialized current game, with no rewrite.
- [First T2 run](../../.look/evidence/1794613434240-55460/evidence.json): **failed** at 3x. Player 2 requested recovery
  beside the machine after T1, and the harness reported clock-capacity drift; neither is counted as a pass.
- [T2 retry](../../.look/evidence/1794613734577-62854/evidence.json): **passed** at 2x on clean `1da0f68c`.
  Both finished every expected beat; mirrors agree at **202 sampled server steps**. Peak page-clock deficits were
  1.765/1.756 game seconds, recovered by the end. No graphics errors. Read both reports and verdicts.

Visual question: does the visible lead retain his appearance and interaction presentation while the server runs independently?
Actually opened: both meter `*-still.png` files (he had wandered out of that fixed camera, so they do not answer it);
scenario `boogler-tag/near-still.png`, `interact/talk-still.png`, `interact/riding-still.png` (purple body, tall hat,
readable name/dialogue, player above him with Grab taking priority); both `run/end-still.png` and `run/p2-end-still.png`
from each T2 attempt (first pair beside the machine with the recovery failure; final pair beside completed track and
the T2 ending overlay). No visual change was apparent in the targeted interaction stills. No real-time smoothness claim.

[Supplemental checks and raw measurements](../../.look/evidence/1794613734577-62854/supplemental/supplemental.json)
preserve command logs, CPU data, numerical vectors, lead-equivalence trace and all time-series meter samples for handoff.
Runtime source did not change after the meter/scenario runs; subsequent edits were tests, docs and the eval header.

## Remaining scope and limits

Step 4's client 10 Hz conversion remains deliberately incomplete. Shadow legs use internal metres/radians and do not
yet implement the step 6 quantized replicated schema, idle look pid, saved-pose validation or local-talk hold. Nothing
here claims to implement steps 6/7, meet their network reaction budgets, remove the lead, or close checkpoints S/B/C.
No independent reviewer was run in this no-ship task. The existing unreachable frisbee gift line remains an owner
finding; no new suspect copy was found and no copy was edited or moved. No ROM data.

`inflight` was not run because it fetches; only cached refs were inspected, honoring the local-network-only instruction.
No controlled before/after whole-server load or production/device CPU measurement was made. Human feel, real-time
smoothness and full current-harness one-hand/world-inputs remain unverified. **Not tested on a device.**
