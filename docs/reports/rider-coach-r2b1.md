# R2b.1: Pier west crossing

Branch `t3/pier-west-crossing`, based on `origin/main` **a32bc4362609d7f526cd1a13fb8e56cf6daa49c5**.
No push or ship. Only R2b.1; no coach, train, stop or High Gorge change. This supersedes the
[preflight stop](rider-coach-r2b1-preflight.md), following the orchestrator's phase-aware ruling.

## Built geometry and authority

The crossing moves **3.40 m toward Home**, centre s 711.8 → **708.4**, width unchanged at 2.4 m
(edges **707.2–709.6**). The west start ramp grows **6 → 9.4 m in line station distance**; its foot moves
s 713 → **709.6**, its top stays at **719**, rise **0.67 m**. The curved offset makes its straight world
horizontal run **9.369222 m** and sloping surface **9.393147 m**, slope **4.090301°** (about 4.1°).
The prefab, its local collision body, the inspection/bot path and the duplicated timber-track measurement
all read the same optional `headRamp`. Other halts retain 6 m.

The west platform (s 719–741, lat −6.95), lever, east ramp, Q7 deck and all Q7 pieces stay put.
**No server-owned or saved value moved; no world bump.** Audited boundaries:

- `PIER_WEST` remains `{x:139565,z:-35815,y:2502,reach:1260}` centimetres; `PIER_EAST` unchanged.
- Stop s **72650 cm**, train reach `TRAIN_EXTENT.behindCm` **1270**, `RING_Q7_FRAME` and all catalogs unchanged.
- Only Place/prefab player-collision geometry moves. `dev/level/timber-track.ts` is analysis data, not a server catalog.
- No edits under `src/sim`, `src/world`, `server`, saves, wire types or migrations. `WORLD_NS` remains **v56**.
- The shared visibility predicates expose existing local rules for the phase check; they change no gate or ownership.

The Boogler's strings are unchanged; no new player-facing strings. The owning
[Place paragraph and steel-car landing description](../game-design/place.md) now describe the new ramp and deck-side planks.

## Phase proof: path 2, exclusion plus surviving-piece clearances

The shelf's authored footprint overlaps the proposed crossing, but **the shelf and walkable crossing cannot
coexist in a rendered/physics step**. The shelf is a drawn mesh only: no collider while visible, and no hidden
solid shelf left behind. The rack and its stock are also drawn meshes with no colliders.

The crossing/ramp recipe objects are allocated when the view is created, initially hidden and disabled.
[instantiate.ts](../../src/prefab/instantiate.ts) creates bodies only on enable;
[up-platforms.ts](../../src/entities/railway/up-platforms.ts) starts `g.up=false`, snaps all pieces off, and enables
ramp/crossing bodies only through `show(true)`. Its gate in
[halts-view.ts](../../src/entities/railway/halts-view.ts) is the main Pier halt standing **and**
`upHaltReady(5, line2Completed(world))`, whose `OFFSET_HALTS` requirement is **7 completed Q jobs**.
The main Pier halt also requires `line2Trains` and `pierLaid` (Q6). A pending/funded/laying Q7 does not enable the west crossing.

| Stage, including fresh snapshot/reload/late join | West planks + ramp | Q7 rack | Q7 shelf | Q7 frame + feeder | This player's Q7 box |
| --- | --- | --- | --- | --- | --- |
| Before Q6 completes | Disabled, not drawn, no bodies | Not at Q7 | Not at Q7 | Not built | Hidden, no collider |
| Pier opens after Q6; Works crossing unfinished | Disabled, not drawn, no bodies | Hidden (`active=-1`) | Hidden (`active=-1`) | Built, drawn, solid | Hidden, no collider |
| Crossing complete; Q7 active, kit in transit/unloaded/being carried | Disabled, not drawn, no bodies | Drawn, no collider; stock count follows depot | Drawn, no collider; stock count follows depotRails | Drawn, solid; stock bodies follow stock | Hidden, no collider |
| Q7 funded and laying, `completion=0` | Disabled, not drawn, no bodies | Drawn, no collider, even when empty | Drawn, no collider, even when empty | Drawn, solid | Hidden, no collider |
| Q7 completion edge, `completion=1` | Bodies enabled; visual drop begins | Hidden, no collider | Hidden, no collider | **Stays drawn and solid** | Appears if this player's box is unopened and wardrobe/read are ready |
| After Q7, including retained terminal train departure | Enabled and drawn | Hidden, no collider | Hidden, no collider | **Stays drawn and solid** | Unopened/opening: drawn, no collider; opened/burst: hidden |
| Room saved/reloaded mid-Q7; late join mid-Q7 | Same incomplete row above; no retained crossing bodies | Same active job rule | Same active job rule | Rebuilt, drawn, solid | Hidden |
| Room saved/reloaded after Q7; late join after Q7 | Enabled, snapped to final geometry | Hidden | Hidden | Rebuilt, drawn, solid | Each player's own unopened box appears at the same spot |

The table follows code, not the `deck-laid` screenshot:

- [qActive](../../src/sim/railway-queries.ts): `Forge.lit < 0` suppresses the active job; otherwise the first
  `QJob.completion==0`; an `opens==='crossing'` job waits for `Works.crossing>=0`. All complete → −1.
  `line2Completed` counts those same completion fields. Start/progress/depot stock cannot override completion.
- [q7-site.ts](../../src/entities/railway/q7-site.ts)'s `depotPieceVisible(active,piece)` reads
  `LINE2_STATIONS[active]?.depot/shelf`. Both actual views use it. The rack additionally requires `framed(active)`;
  the shelf's draw key includes active job and it returns after hiding when no shelf spec exists.
- [view.ts](../../src/entities/railway/view.ts) calls `halts.update`, `line2.update` (rack), then `shelf.update`
  synchronously, without an await, draw or physics step between them. On completion the colliders enable first
  within that call stack, then both kit meshes hide; falling crossing visuals are delayed. There is no observable
  game step with a visible shelf beside walkable planks, and the shelf never has a solid body.
- **Q7 is excluded from folding:** `MACHINED` is captured before `ensureQ7Frame` appends Q7; `settle` only runs for
  `machined(k)`. Q7's frame is built once `pierLaid` and stays for the page's lifetime, then is rebuilt on reload/join.
  The earlier frames' occupied/folding/loaded rules do not remove Q7. Clearance covers the full standing frame.
- [crates-view.ts](../../src/entities/railway/crates-view.ts) requires the accepted Q7 completion, a ready read and
  this player's wardrobe, then `!isOpened('Q7') || (opening===mesh && !burst)`. It has no collider. One player opening
  theirs does not remove another player's own box. The Q7 machine is already stowed, so the box appears at its
  fixed `q7Spot('crate')`, without a hand-down flight. The check encloses all three tiers, all rotations and opening
  shake at scale 1.14, not just the box seen in one seed.

[New level row](../../dev/level/pier-crossing.ts) enumerates **512** completion-bit/Forge/Works-crossing combinations,
including unreachable combinations, using those actual view predicates. Main-halt and train gates are omitted
from the proof deliberately, making the possible-crossing set larger. No combination allows Q7 kit and planks.
A process-only negative control changes the crossing's `laid` from 7 to 6: it fails for both rack and shelf at
completion bits 63, forge 0, crossing 0. The operand is restored; no test snapshot or seed supplies the exclusion.
[Negative control transcript](../../.look/rider-coach-r2b1/phase-negative-control.log).

## Level row: minima separate from pins

Every metre pin below has tolerance **±0.01 m**. Planned coach measurements are explicitly planned; no coach exists here.

| Measured quantity | Value / pin | Design minimum or rule and source |
| --- | ---: | --- |
| Today's longest 12.70 m train, tail → north plank edge | **4.200000 m** | ≥0.60 m; existing `dev/level/ring.ts` Pier rule cited by `rider-coach-audit.ts` and the plan's audit |
| Planned 16.10 m coach train, tail → north plank edge | **0.800000 m** | Same ≥0.60 m rule |
| Plank south / north edge s | **707.2 / 709.6 m** | R2b.1 specified position, width 2.4 m |
| Ramp station interval | **9.4 m** | R2b.1; north edge exactly `s0-headRamp` |
| Ramp world horizontal run / rise / slope surface length | **9.369222 / 0.67 / 9.393147 m** | Real prefab support endpoints, distinguished from station distance |
| Ramp slope | **4.090301°** | ≤15° and normal.y ≥`WALKABLE_NY=0.55`, existing ring ramp rule |
| Q7 standing frame including feeder → east planks | **1.310301 m** | ≥0.60 m; designer + orchestrator simultaneous-piece rule |
| Every player's box, all tiers/rotation/opening shake → east planks | **1.476609 m** | Same ≥0.60 m; also strictly off the planks |
| East-end → east-ramp corridor, swept player radius 0.45 m | **0.853422 m** | ≥0 m obstacle gap; designer's clear walk requirement |

The frame check uses the actual catalog point and `stationColliders`; visual kit fits those horizontal envelopes.
The box check uses actual part vertices and a conservative bounding envelope. `deckGap` is conservative for the
oriented pieces, not a distance rounded from s/lat labels. The corridor follows s 708.4→713 at lat +1.5, then
lat +2.9 to the east ramp foot. Existing rows retain rail flangeways, no seabed/far-end ramp and roof-bypass limits.

## Fixed-camera evidence

Before source is archived **origin/main a32bc4362**, with separately installed dependencies. After source is this
implementation. The harness verdicts stamp the launching checkout's HEAD/dirty count even with `--root`;
for before captures the command's absolute `--root` points to the archived main tree. This distinction is intentional.
Cameras, FOV and viewport 1280×900 match; the final [camera/staging script](rider-coach-r2b1/views.ts.txt) is archived with the evidence. No screenshot is a measurement substitute. The final players' car pair uses its observed deck centre
`[1398.7506398967087,24.85,-354.7871484643708]` with the lens at y 26.55, replacing an earlier eye at the engine stop.
[Capture verdicts](rider-coach-r2b1/verdicts.json) retain commands and load flags. Both long-train stills and the T1
route passed under load; they make no performance claim. Both walking recordings passed without that flag.

| View | Before / after | Opened observation |
| --- | --- | --- |
| West lever toward Home | [before](rider-coach-r2b1/before-lever.png) / [after](rider-coach-r2b1/after-lever.png) | The ramp descends continuously toward the moved planks; after, the crossing lines up with Q7's deck, further toward Home. The ramp still reads as an incline. |
| Trestle at east end | [before](rider-coach-r2b1/before-east.png) / [after](rider-coach-r2b1/after-east.png) | The extended white ramp and plank junction are legible at eye height. Flangeways remain beside exposed rails. |
| Top-down, s about 700–745 | [before](rider-coach-r2b1/before-top.png) / [after](rider-coach-r2b1/after-top.png) | The west ramp extends south; the east ramp and both shelters stay fixed. Planks meet the side of the work deck between frame and box. |
| First sight from south, s 690 | [before](rider-coach-r2b1/before-south.png) / [after](rider-coach-r2b1/after-south.png) | Crossing and longer ramp enter the approach view sooner; the box and frame remain to the right on their deck, leaving the trestle route visible. |
| Standing homeward players' car, fixed virtual eye camera | [before](rider-coach-r2b1/before-car.png) / [after](rider-coach-r2b1/after-car.png) | Standing players’ car and platform roof frame the old/new ramp toward Home. The crossing is visibly further away after. The virtual camera occupies the car view; the player is staged beside the lever, not aboard. |
| `boiler-long`, Q7 deck toward wagon train tail | [before](rider-coach-r2b1/before-long.png) / [after](rider-coach-r2b1/after-long.png) | Both show the wagon and long boiler standing homeward. Before, the tail is close to the planks (0.80 m); after, open track clearly separates the steel tail from the planks (4.20 m). The Q7 frame remains at right. |

## Walking and production route

[35-second real-time clip](../../.look/rider-coach-r2b1/walk/crossing-realtime.webm),
[motion sheet](../../.look/rider-coach-r2b1/walk/crossing-motion.png),
[opened review-sized sheet](../../.look/rider-coach-r2b1/walk/crossing-motion-review.png),
[curves](../../.look/rider-coach-r2b1/walk/crossing-curves.png),
[log](../../.look/rider-coach-r2b1/walk.log). **Pass:** initial setup on the west platform, then ordinary production
`bot.walk` through `up.path`, along the east trestle margin to s 713/lat +2.9, up the east ramp to s 719, and back
to the west lever. No recovery or swimming. The recording starts before the action; it is not virtual-time video.
All 16 sheet frames (0–35 s) and the curves were opened. The incline and route read clearly; the motion follows
the changing height, not a jump. The bot pauses at both plank ends to plan, so this pass's pacing is **not natural
continuous walking**, although it completes. Height is 24.8–25.5 m and the curve records grounded throughout.
[Second real-time clip, 24 seconds](../../.look/rider-coach-r2b1/walk-direct/crossing-realtime.webm),
[opened 12-frame sheet](../../.look/rider-coach-r2b1/walk-direct/crossing-motion-review.png),
[curves](../../.look/rider-coach-r2b1/walk-direct/crossing-curves.png),
[log](../../.look/rider-coach-r2b1/walk-direct.log): **pass**. This uses production `bot.straight` (forward key/steering)
along exactly the same waypoints, with no navigation-planner waits and no jump presses. The route completes out
and back in about 12.5 seconds, pausing 0.7 seconds at the east platform by design. The ramp height changes smoothly;
the plank/trestle transitions have small step-height changes (grounded 99% of sampled frames). From all 12 sheet
frames and the curves, **the ramp reads as a ramp and the walk reads as a natural route**, without a detour around
Q7's frame or box. This is an observation of the sampled poses/trajectory, not watched playback.

Per `docs/agents/codex.md`, I cannot watch video playback: these are sheet/curve observations. **Real-time motion
quality remains unverified**; the clip is supplied for the orchestrator's playback review.

The production Q7 evidence starts at `crossing-done`, stages the player beside the depot once, then uses
`railway-q7-crate.ts`'s real pickup/carry/deposit actions and `line2Rides(bot).ride(HALT.pier,0)` for the approach,
lever, real-jump boarding and ride home. No recovery teleport or world mutation. It passed and ended at Village,
verified by opening [its final still](../../.look/rider-coach-r2b1/route/q7-home-still.png).
The temporary `no way yet` message caused a replan, not a failure; no `NEVER`, water/recovery or Q7 FAIL followed.
[Script](../../.look/rider-coach-r2b1/q7-route.ts), [log](../../.look/rider-coach-r2b1/q7-route.log),
[verdict](../../.look/rider-coach-r2b1/route/q7-home-verdict.json). The successful run used the same script before
its final success log was prefixed `PLAY` so the harness would print it; its done flag is reached after Village arrival.

## Validation and review boundary

- Setup fetch/rebase: up to date on a32bc4362; local and archived-main `npm ci` under Node 26.13.0; no symlinks.
- `npm run level-check`: **pass**, 18 reports; new rows above and all existing rows pass.
- `npm run prefabs`, `npm run prefabs -- --check`: **pass**.
- Complete Pier files: `prefab-halts.test.ts`, `train-wheel-rail.test.ts`, `railway-running-side.test.ts`,
  `railway-r4b-views.test.ts`: **17 tests pass**. This includes the curve check at the new crossing s.
- `npm run loop -- run`: **pass**, model run (not a browser walking proof).
- `npm run checkpoints -- q6-done crossing-done deck-laid boiler-long`: **4 pass through the host save path**.
- Full `npm run lint`: **pass**, zero problems. `npm run typecheck`: **pass**.
- `npm run check`: **pass**, 2,376 tests: 2,310 pass, 65 skipped, one todo, zero failures; remaining static/level checks pass.
- Required terrain route through T1: **pass**, production completed; report, verdict and end still opened. Under load, so not timing/feel evidence.
- `node dev/ship-check.ts`: **pass**, registry, nine scoped lint files, typecheck, 168 affected test files; 1,359 pass, 65 skipped, one todo, zero failures (135.38 s).
- `git diff --check`: **pass**.

**Changed test expectations: YES.** `test/fixtures/prefab-halts.json` has 79 numeric value changes (68 formatted lines),
all in the Pier start-ramp/crossing boxes, their local bodies, or the corresponding inspection walking path. No
assertion code was weakened. `prefab-halt-requests.json` regenerates identically and is unchanged. The old fixture
correctly failed on the first moved ramp x value. The regenerated fixture passes. Independent review of the fixture
change is still required before shipping; no subagent was started, per the brief.
[Exact fixture delta](../../.look/rider-coach-r2b1/prefab-halts-delta.json).

No R2b.2/R2b.3, push or ship. No separate steel-car step-off playtest; the owning prose distinguishes geometry
from tested landings. Real-time playback/feel and the designer's visual approval remain with the orchestrator.

Earlier failures are [quoted in full](rider-coach-r2b1/failures.md): the intentionally stale prefab golden,
a malformed comma-separated `UNIT_ONLY` filter (corrected to spaces), stale generated rail map, relative baseline
root resolution, early long-train staging, and the superseded/interrupted staging retry. The long-train staging
fix waits for any homeward arrival, lets an unwanted train depart, and requests again; the original script waited
for the desired wagon train even when another train had already served the request. No game train rule changed.
The generated rail map changed only the Pier crossing's x/z/label. Capture source hashes are in the
[source manifest](rider-coach-r2b1/source-manifest.json).

Full command logs are retained under [.look/rider-coach-r2b1](../../.look/rider-coach-r2b1/).
