# First five minutes

Status: implemented and checked, 15 November 2026; visual-review repairs recorded below. D4 / G10, G11, G16;
[owner answer 5](../decisions-core-loop.md#d-2026-11-15-grant-queue-answered). Commit only; independent review belongs to the parent.

**Goal:** meet a helpful camp resident, receive the axe, fill Station 1, and start the engine as the payoff.
Serves DESIGN 7 (Telegraph everything) and 11 (Show, don't tell).

**Beat order and design:**

1. Sleeves at Home points towards the camp. A speech bubble marks unread conversation stages.
2. A resident beside the parked machine offers the starter axe through Interact (E / pad B / touch), with a
   short draft conversation and an explicit Take axe answer. The existing shared starter-tool action grants it
   to the room. The engine remains cold. Only the accepting player gets the existing tool card; friends get
   their existing flourish. No floating axe comes out of the engine.
3. Chop and carry the unchanged 24-log bill. On the accepted last deposit, the engine shudders, catches and
   whistles, then the existing feeding/laying sequence continues. Station hands walk to the machine before
   taking their seats rather than disappearing into them. Occupied chairs remain respected.
4. Station completion, its personal reward and the next bill continue unchanged.

**Sim, saves and mixed builds:** reuse Server `Rail.awake` and `rail.wake` as the existing first-tool activation
and 31-tick handoff window; retain their wire names, fields, validation, receipt and prediction semantics.
Engine ignition is a derived fact from Station 1's existing `Job.start`; add a pure query, not a saved field.
No commands, catalog entries or saved shapes are removed or reshaped; no WORLD_NS bump, migration, capability
gate or mixed-build support. The explicit task requires existing saves past the old wake to keep working:
their axe remains usable, bills and completed stations stay intact, and the engine derives its state from the
first funded job. An old awake-but-unfunded save therefore keeps the axe and starts the engine on its last log.
Old tabs are unsupported per mixed-builds. Server remains sole authority; bubbles, conversation cursors,
engine effects and crew paths are Local and cannot change progression. Effects must not replay on snapshots
or double on prediction confirmation; refused funding must restore the cold engine.

**Steps:**

- [x] Add/test the derived engine-start query in `src/sim/railway-queries-line1.ts`; exercise fresh, handed-off,
  partially funded, final-log, retry, two-player and saved/reloaded states in `test/railway-opening.test.ts`.
- [x] Wire the resident and unread bubbles through `greeter.ts` / `opening-view.ts`; move the engine effects in
  `view.ts` to funding, retaining the accepted starter-tool reward. Preserve existing authored lines and list drafts.
- [x] Replace the Station 1 crew snap in `src/place/folk.ts` with visible boarding. Update the opening bot,
  loop graph and owning `docs/game-design/place.md` section; keep carry capacity and player speed untouched.
- [x] Format/lint, `node dev/ship-check.ts`, `npm run loop -- run`, existing railway golden tests and targeted
  new tests. Use `checks-for` to route a two-player segment through T2 and world-inputs; inspect one focused
  camp/ignition/boarding proof. Record unavailable browser evidence rather than claiming it passed.

**Level findings:** existing camp/wake area, no new collider or travel gate. Resident is on the ground beside
the existing validated wake reach. Baseline level-check started before implementation; results below.
**Research:** no new research needed; implement the accepted Grant queue order using existing systems.
**Risks:** Local ignition must reconcile lost predictions and restore silently; a seated player must not share
a crew chair. Unread bubbles must clear when seen and remain projected above their NPC. No shared carry/speed edits.
**Open questions:** none blocking. All new dialogue and “Wake it up” remain drafts for the owner.

## Verification and draft copy

Drafts for the owner (not approved copy):

- “Follow the path up to the camp. Someone there has an axe for you.”
- “Fill the first frame with logs. That should get the track layer going.”
- “You have the axe. The first frame needs logs before the engine can start.”
- “Take this axe. Fill the first frame with logs and we can get the engine going.”
- “Take axe”, “Camp resident”, and the speech cue's accessibility label “Something to say”.
- Existing suspect “Wake it up” is removed from the opening prompt, not finalised or replaced with approved copy.
  The first two Sleeves directions change because their old wake-first instructions no longer describe the run;
  his other lines, including “The log cart will bring the heavy conversation”, and all Boogler copy stay verbatim.

Files touched:

- `src/sim/railway-queries-line1.ts`: pure ignition timestamp query; no authoritative writes changed.
- `test/railway-opening.test.ts`: handoff, partial/final bills, two actors, duplicate requests and save/reload.
- `src/entities/railway/greeter.ts`: camp handoff and stage-aware unread cues.
- `src/entities/railway/opening-view.ts`: crew visible at the first frame before the axe is taken.
- `src/entities/railway/view.ts`: engine ignition from accepted funding, silent restore and rollback.
- `src/entities/railway/reward.ts`: clarify the existing recipient-only handoff card's ownership.
- `src/place/folk.ts`: visible boarding legs, with player-held chairs respected.
- `src/components/speech-cue/view.ts`: owner-disposed projected speech cue.
- `src/entities/town/residents.ts`: first-meeting/new-progress cues using existing conversation memory.
- `dev/look/bots/railway.ts`, `dev/look/evals/railway-instant.ts`: real dialogue input replaces the machine prompt.
- `dev/loop/graph.ts`: opening beat and its NPC cue.
- `docs/game-design/place.md` and this plan: current opening, save story, draft copy and evidence.

Checks and evidence:

- `npm run level-check` before implementation: passed; 15 reports, machine clearance and grounding clean.
  Existing drawn z-fighting is report-only (150 likely-visible pairs, 14 new against its baseline). Moving NPCs
  are excluded; the new camp placement was inspected in the focused look below.
- `node --test test/railway-opening.test.ts`: 2/2 passed.
- `npm run loop -- run`: passed through all built route orders for 1–4 players, with all enforced-order probes
  refused correctly. No pacing, carry-capacity or speed changes.
- `node dev/ship-check.ts`: passed registry, scoped lint, typecheck and 1,023 tests across 102 affected files.
- `node dev/look/playthrough.ts --players 2 --to T2 --warp-speed 3`: passed, both peers finished, matching mirrors
  at 230 sampled server steps, WebGPU, no graphics errors. Inspected the end still. Under load (28.08 → 41.45),
  with transient warp deficits: not timing or feel evidence. Report: `.look/playthrough/303e30a8a/report.txt`.
- `npm run check`: passed, including lint/typecheck, 2,167 passing unit tests (one pre-existing TODO, no failures),
  all nine unchanged railway golden shards, registry, level check, assets/prefab freshness and production build.
- `node dev/scenarios/run.ts world-inputs`: passed; browser/Node numeric catalog parity, verified production
  room, empty client shared-state registry, no graphics errors (`.look/scenarios/verdict.json`).
- `node dev/look/playthrough.ts --to t1-done --name first-five-solo`: passed; inspected end still, no graphics
  errors (`.look/playthrough/first-five-solo/report.txt`). This warped run is progression evidence, not pacing.
- `npm run look -- --eval .look/first-five-camp-setup.ts --cam 983,37,-135 --look 994,31,-147 --hud --warm 2
  --name first-five-camp-player`: passed; inspected `.look/first-five-camp-player-still.png`. The yellow camp
  resident stands on the ground beneath the unread bubble and Talk prompt; both station hands wait by the frame.
- `npm run look -- --rail-seed awake --eval .look/first-five-ignition-setup-v2.ts
  --action .look/first-five-ignition-action-v2.ts --cam 983,37,-135 --look 995,31,-146 --hud --video --seconds 6
  --warm 1 --name first-five-ignition-v2`: passed. Staged by accepted commands at 23 logs, one still on the back,
  then entered auto-unload reach. Inspected the eight-frame `.look/first-five-ignition-v2-motion.png` and final
  still: engine smoke/fire begins after the last deposit, both hands walk from the frame and climb onto the
  machine, then remain aboard as it rolls away. 250 ms pose samples agree: walking through sample 10, riding
  from sample 11, unchanged ignition tick 117. Real-time recording retained at
  `.look/first-five-ignition-v2-realtime.webm`; real-time smoothness, heard audio and device play are unverified.
- Initial camera-only camp still showed a bubble with culled folk because the player was still at Home;
  recaptured with the player beside the camp. First ignition staging failed its 23-log precondition because
  automatic unloading delivered the last log early; v2 leaves that log outside the frame until the capture.
  Failed artifacts are retained; neither is counted as visual proof. No production fix was needed for these setups.
- Final instant-feedback harness edit: scoped lint and typecheck passed. `git diff --check` passed.

No shipping or push. No fixture regeneration, namespace reset, save migration, carry-capacity or player-speed edit.

## Visual-review follow-up, 15 November

Implementation commit `00e0d5667`, on `fix/first-five-visual` from `8355f8e8a`; not pushed or shipped.
The parent owns review of this follow-up. The original independent code review does not cover these repairs.
All six named review captures were opened before editing.

- The recipient's accepted receipt now starts the axe reveal immediately, during `waking`, instead of waiting
  for the 31-tick rule window to end. The resident reaches out; the axe is visible at that hand during anticipation,
  with gathering glints there, then rises to the player. The existing card, deliberate dismissal, conversation
  camera and speech-bubble size remain. Friends retain their existing flourish. No sim, wire, saved-data or
  authoritative timing change; no fixture regeneration.
- The resident moves to `(993.05, -145.2)`, grounded by the existing terrain query. Sampling the actual track
  centreline every centimetre puts them 3.92 m from it, versus about 1.75 m before; their position is 5.16 m from
  the existing 6 m wake centre. Talk also checks that unchanged reach. The opening bot approaches closer so its
  old two-metre stopping tolerance cannot leave it outside Talk.
- Ignition has a larger, slower body rock and a 12 cm upward kick at full strength. The separate panel gantry/rack
  follows the same cosmetic transform; the first recapture exposed that it had stayed still while the shell shook.
  Reduced motion suppresses the added movement. Vehicle bodies, track heights and progression remain unchanged.
- Crew facing eases into the chair heading during the final climb, removing the seated turn snap. Their existing
  route through the log-volley corridor and straight diagonal climb remain; only the requested minimum facing fix
  is included.

Inspected evidence, relative to this checkout (ignored `.look/` artifacts):

- `.look/first-five-visual/s2-handover-motion.png`, `s2-axe-close.png`, `s2-resident-hand.png`: axe at the resident
  immediately after acceptance, then above the player; no delayed machine-origin show. The capture's log reports
  the reveal already showing while phase is `waking`. Run passed under load; not timing or feel evidence.
- `.look/first-five-visual/s3-ignition-follow-v2-motion.png` and `s3-ignition-follow-v2-dense.png`: gantry and rack
  visibly lean and return during the catch from the ordinary follow view behind the first frame.
- `.look/first-five-visual/s3-boarding-front-v2-motion.png`, `s3-boarding-turn-sheet.png` and `s3-resident-pass.png`:
  crew turn during the climb; the resident stands clear as the step, handrail and running gear pass.
- The matching `*-realtime.webm` recordings are retained. Motion was inspected through sheets and extracted video
  frames; real-time smoothness, heard audio and device play remain unverified. All focused runs passed WebGPU,
  advancing completed frames and no page/console/graphics errors.
- `.look/playthrough/first-five-visual-v3/report.txt` and `end-still.png`: `--to t1-done` passed on the final source,
  no missing expected beats, no bot/graphics errors; inspected the end still. Warped progression proof only.
  The first run stopped outside Talk at the old approach. The second was interrupted by this worker's source edit
  reloading Vite; neither is a pass. Both failed runs are retained beside v3.

Checks, using Node 26.13.0:

- `npm run check`: passed lint, typecheck, unit tests (including all nine railway golden shards), registry,
  level, asset/prefab freshness and production build, before the final gantry-transform follow-up.
- Final source: `node dev/ship-check.ts 8355f8e8a`: passed registry, eight scoped lint files, typecheck and
  515 tests across 59 affected files. Log: `.look/first-five-visual/final-check.log`.
- Final source: `node --import ./dev/sim/hooks.ts --test test/railway-first-five-review.test.ts
  test/railway-opening.test.ts test/railway-golden-?.test.ts`: 113/113 passed, all nine unchanged golden shards.
  Log: `.look/first-five-visual/final-railway-tests.log`.
- `npm run level-check`: passed, 15 reports; zero machine-clearance and grounding problems. Moving NPCs are
  excluded from this offline check; their clearance is established by the departure capture above.
- `npm run loop -- run`: passed every built route order for 1–4 players and the enforced-order probes.
- `node dev/look/playthrough.ts --to t1-done --name first-five-visual-v3`: passed. `git diff --check`: passed.

No new dialogue or Boogler copy changes. No push or shipping action.
