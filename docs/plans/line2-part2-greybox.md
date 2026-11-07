# Plan: line 2 part 2 inside the Sickle Isles greybox

Prepared 7 November 2026 against `origin/main` `f2bf0c5f`. Planning only; no code changed. **Approved by the owner, 7 November: all five open questions as recommended.**

## Goal

Finish line 2 in the production railway: Q4 to the rim, Q5 over the sea to Far Head, Q6 to the pier, with the pack
chest, the depot cart's real trip and trains. Build it greybox-first inside `?greybox=sickle`, so the player stands at
the pier and looks north at Ring Island 751 m away. This is the next stretch of the approved line-2 route.

Binding calls: owner, 7 November, "line 2, part 2, this should fit into our gray box... consolidate and just start
working with the gray box" ([keep going while the owner is away](../proposals/boogle-2.md#process), item 2). Also
**next proof: work, machinery, exploration**: playable detail on line 2, ECS one domain at a time. And the
[orchestrator's 6 November order](../agents/orchestrator-state.md#queued), item 5: slice 4 part 2 on replication, after
ECS E. Serves DESIGN **Enjoyable alone and together**, **Telegraph everything**, **Show, don't tell** and **Clear
authority**. It bends nothing.

## Where it sits on the map

Map JSON (`docs/world/map-prototypes.html` `#map-data`) is Place-local metres, world = local + (1000, 0)
(`src/proto/place/layout.ts` `ORIGIN`). Line 2 is in `common`: `l2a` Home (-82,12) → (-50,30) → (28,27) →
Split-rock (98,52), and `l2b` Split-rock → (167,-28) → (373,-184) → Pier (402,-372). Both are `kind: built`, so the
greybox draws nothing over them ("the real railway is there"). Arc lengths below are along Place's `LINES.east`, which
has the same vertices.

| Piece | Along line 2 | Map-local position | Source |
| --- | --- | --- | --- |
| Forge, rails rack | — | (-88,-12), rack (-85.5,5.4) | `LINE2_FORGE` |
| Q1 / Q2 / Q3 frames | 7 / 42 / 122 m | (-72.8,10.6) / (-50.5,30.6) / (28.0,26.8) | `LINE2_STATIONS` |
| Quarry lever (Q4's gate) | — | (97.4,42.2), at Split-rock (98,52) | `LINE2_LEVER` |
| **Q4**, 16 logs / 16 rails | 178 → 286 m | frame ≈ (83.7,36.7), ends at the rim ≈ (172.8,-23.7) = `l2b` vertex (167,-28) | Place `layout.ts` |
| **Q5**, 24 / 24, sea gate | 286 → 546 m (260 m trestle) | ends at Far Head ≈ (379.3,-180.9) = `l2b` vertex (373,-184) | Place |
| **Q6**, 32 / 32, train-fed rack | 546 → 742 m | ends at the Pier (402,-372), where `ringx` starts | Place |
| Sea switch (Q5's gate) | — | Needle Bell summit, `SEA_SWITCH` | Place `tech-layout.ts` |
| **Pack chest** | — | beside the forge; pin from Place `gifts.ts` `dropChest('pack')` | Place |
| **Cart trip** | camp (line 1, s≈190) → turntable (-82,12) → forge stop → active rack | Q4 rack ≈ 370 m from the camp | Place `depot.ts` |
| **Boiler** | — | apron (-81,5.4) | place.md, The run 7 |
| **Old train** | — | timber camp (-13,-142) | `common.places.camp` |
| **Halts** | line 1: Village, Camp; line 2: 17, 174, 524 m | quarry stop ≈ (80,37), Head stop ≈ (362.6,-167.1) | Place `HALTS`, `stops` |

**Part 1 stays where it is.** The Home island is `existing` (as built) in the JSON. The pinned Q1–Q3 frames lie on
`l2a` within the frame's side offset (≤ 7 m), and the lever is at Split-rock. Nothing moves. Q4–Q6 are pinned from
Place's layout the way Q1–Q3 were, on today's Home terrain, and the greybox only marks them.

## Design: sync kind and ownership

Everything shared is **Server** kind, in the railway domain (`docs/agents/sync.md`). The server applies the action and
replicates what changed. Your own presses are predicted with the same rule; thresholds stay with the server. No
lockstep ops. Views are **Local**, rebuilt from accepted state. Bodies are **Owner**.

| State | Kind | On E (after it merges) | New kind? | Op / derivation |
| --- | --- | --- | --- | --- |
| Q4–Q6 bills, laying | Server | `qjob`/`qjobRun` slots 3–5 | no (rows) | existing `rail.deposit`, `rail.depotTake` |
| Q4 quarry gate | Server | existing `rail.lever` + Q3 (`line2GateOpen`) | no | unchanged |
| Q5 sea gate | Server | `sea` field on `rail` | no (field) | `rail.seaSwitch` |
| Pack (carry 8 → 16) | Server, shared rung like the axe | `pack` field on `rail`; `free()` reads `railCarry(s)` | no (field) | `rail.pack`; the chest appears when `forge.used ≥ 24` |
| Depot rails shelf | Server | `depotRails` field on `rail` | no (field) | forge rack → shelf in one atomic transfer |
| Cart trip | Server | **`cart`**: leg, departTick, logs, rails, phase, recall | **yes** | pose is a pure function of (leg, departTick); `rail.cartCall` (idempotent) |
| Boiler | Server, like the beam | **`boiler`**: state, holder, epoch, revision, x, y, z | **yes** | `rail.boilerTake` / `rail.boilerDrop` / `rail.boilerFit` |
| Trains | Server | **`train`**, slot per line: start, call stop, kit load | **yes** | schedule from the replicated start tick (no packets while running); `rail.call` |
| Riding cart/train | Owner | your body on a moving platform (`src/physics/platforms.ts`) | — | presence; no ridden speed bonus in the first build |
| Frames, shelf, cart, boiler, train, halts, Far Head rockets | Local | `src/entities/railway/line2-view.ts` plus new views | — | from accepted state; effects on the press or on `onAccepted`, never in apply |

Controls: everything goes through Interact (`src/player/hands.ts` interactables): Open, Pull, Shoulder, Fit, and
Call cart to forge. A train comes when you stand on a halt; there's no input for it. No new action ids, pad slots or
guide rows.

## The smallest first playable build

**Pack chest + Q4**, on E: the lever drops the quarry gate, the forge's first bill gives the pack (16 on your back),
the depot brings Q4's logs and its rails to the rack and shelf, and you carry them into the frame. Q4 lays to the rim.
For now the depot mints the loads, as it does today, with no visible cart. Walkable at
`?greybox=sickle`, where the next stretch's rim, the sea and Far Head read from the Q4 frame.

## Steps

**Phase A: greybox only.** No sim, kinds or ops, so this starts now. It touches only `src/proto/greybox/` and the
JSON, which the ECS branch doesn't touch.

- [ ] **A1. Line-2 marks in the JSON.** Add an optional `common.works` array that the page ignores:
  `{ id, name, at, line?, s?, kind: 'frame'|'gate'|'chest'|'halt'|'boiler'|'train' }` for every row of the table
  above. In `map-data.ts`, add the `Work` type and parse it; in `build.ts`, draw thin, non-solid posts with labels,
  coloured like the stages; in `index.ts`, add `go('Q4')`… go-to targets. The production `l2b` stretch is not laid
  yet, so draw it as a non-solid survey line (stakes every 20 m) and never as solids. Then the real laid track never
  collides with the greybox. Proof: `test/greybox-works.test.ts` (`parseMapPage`). Every `frame` mark with an id in
  `LINE2_STATIONS` lies within 8 m of the catalog's `x/z` (cm → m, minus `ORIGIN`). Every `s` lies on `l2a`/`l2b`
  within 3 m. Plus `npm run check`.
- [ ] **A2. Rides for the timings.** Add panel rides, with the model's ride time: "Cart trip" (camp → turntable →
  forge stop → Q4 rack, at 9 m/s), "Line 2 train" (Village → quarry stop → Head stop → pier, at 20 m/s) and "Boiler
  walk" (Far Head → apron → camp, at walking pace). They give the 2D economy prototype the same legs. Proof: a unit
  test of the leg lengths against `LINES.east`/`north` (±2 m); `window.__greybox.ride('cart')` from a look eval.
- [ ] **A3. Stills of the payoff.** Add `dev/look/beats/sickle-greybox.ts` shots from the Q4 frame (rim and sea),
  Far Head (trestle back to the quarry) and the pier (Ring Island north). Proof: `npm run look -- --query
  'greybox=sickle&labels=0' --cam … --action refresh.ts` stills, opened and checked. Note in
  `src/proto/greybox/README.md` that `works` is read.

**Phase B: on ECS E.** This waits for branch `worktree-agent-aa45039029312e4eb` (plan `docs/plans/ecs-e.md`, step 3:
the railway on E, `WORLD_NS` v16) to merge. B1, B2 and B5 add no kinds. They still wait, because that branch
rewrites `src/sim/railway-line2.ts`, `railway.ts`, `railway-world.ts`/`railway-systems.ts`,
`src/world/railway-{replicate,predict,server}.ts` and `server/src/host/world-host.ts`. **B3, B6 and B7 add new
kinds (`cart`, `boiler`, `train`) and must be E components and systems.** Each step bumps `WORLD_NS` (a development
reset, no migration) and keeps the paused world and away credit whole.

- [ ] **B1. Pack chest.** Add the `pack` field on `rail` and a `rail.pack` system, which requires
  `forge.used ≥ LINE2_FORGE.bills[0]` and is idempotent. `railCarry(s)` returns 16 with the pack, and every
  `T1.carry` use goes through it. Pin `LINE2_PACK {x,z}` in `railway-line2-layout.ts`. The chest view reuses the axe
  chest (`src/entities/railway/tools.ts`, `reward.ts`, the `HOOK_REWARD` pattern in `reward-data.ts`). Proof:
  `test/railway-line2.test.ts` (no chest before 24 logs, one pack for two openers, carry 16 after, survives
  snapshot/load and late join); a prediction case in `test/railway-replicate.test.ts`; a look still of the chest.
- [ ] **B2. Q4 (first playable).** Add `Q4` to `LINE2_STATIONS` (16/16, `fromCm` 17800 → `toCm` 28600, speed 160,
  depot true, `gate: 'quarry'`) and widen `Line2StationId`. Deposits need `line2GateOpen`. `railLine2Tick`'s depot
  also fills `depotRails` from `forge.rack` for Q4 (one transfer, never past the bill). Add `rail.depotRailTake`. The
  away credit counts it (`railLine2Yards`). Views: the Q4 frame, a rails shelf beside the rack, a frame survey stake.
  Proof: conservation and refusal tests, including "rails never minted, only moved from the forge"; extend
  `server/test/railway-line-host.test.ts`; `npm run load`. Extend `dev/look/bots/railway.ts` past "quarry gate open"
  to checkpoints `pack`, `Q4 funded` and `Q4 laid`, through `dev/look/evals/railway-job.ts`. Look still at the rim
  under `?greybox=sickle`.
- [ ] **B3. The cart's real trip (new kind `cart`).** Add the component and a `rail.cartTick` system: load at the
  camp from the depot's minted logs, stop at the forge for rails (from Q4 on), run to the active rack, unload, return.
  Each step is one atomic transfer, and `depot`/`depotRails` only change at unload. The pose comes from
  `cartPose(leg, tick)` in a new `src/sim/railway-cart.ts`, pure integer cm along the pinned route. `rail.cartCall`
  carries Place's "Call cart to forge". Rack status reads Loading, On the way, Unloading or Waiting for forge. You can
  ride it as a platform (Owner). Proof: `test/railway-cart.test.ts` (load conservation across a mid-trip
  snapshot/load, an empty forge waits, a double call is one call, away credit); a rider stays aboard in a two-tab
  `npm run load` row; a look still of the cart at the rack; the bot waits on a real unload.
- [ ] **B4. Q5 and the sea gate.** Add `Q5` (24/24, 28600 → 54600, speed 180) and `sea` with `rail.seaSwitch` at
  `SEA_SWITCH`, which requires Q4. Views: the sea slab and switch, the 260 m trestle, Far Head rockets and lamps
  (Local, on `onAccepted`). Proof: tests as in B2; bot checkpoints `sea gate`, `Q5 laid` and `Far Head`; a still from
  Far Head back down the trestle; `npm run perf` (trestle and lamps).
- [ ] **B5. Halts as views.** Add the platforms at the pinned halts, shown only once `trains` is set (Local, from
  state; the boxes stay straight, checked as in `dev/level/timber-track.ts`). No new kind. Proof: a still of the
  village halt before and after.
- [ ] **B6. Boiler (new kind `boiler`).** The forge casts it when Q5 completes, at the apron. It's carried like the
  beam (held by one pid, with epoch and revision; dropped where it's released; put back if its holder leaves).
  Fitting it at the old train sets `rail.trains`. Proof: tests mirroring the beam's (take race, holder leaves, fit
  once); bot checkpoints `boiler` and `TRAINS`; a still of the wake.
- [ ] **B7. Trains, and Q6 (new kind `train`).** Line 1 runs camp ↔ village and line 2 village ↔ quarry ↔ Far Head,
  at 20 m/s. `trainPose(slot, tick)` is pure, from `start` (the server only sends it when the schedule changes).
  `rail.call` from a halt reroutes the train: the server checks you're on that halt from your action's own position.
  Add `Q6` (32/32, 54600 → 74200, rack fed by the line-2 train's kit load from the forge rack and depot) and its
  pier-end flag. Proof: `test/railway-train.test.ts` (pose continuity across a call, a kit unit has one home through
  load and unload, snapshot mid-trip); a two-player ride in a `npm run load` row; the bot to checkpoint `pier`; a
  still from the pier toward Ring Island; `npm run perf`.
- [ ] **B8. Record it.** Update `docs/game-design/place.md` (production line 2), `docs/plans/production-core.md`
  slice 4 notes, the greybox README, then stop for the owner's playtest (owner-calls).

## Risks

- **ECS conflict.** Starting B before E merges means rewriting it twice. Don't. Phase A stays in `src/proto/greybox/`
  and the JSON.
- **Room safety.** No effects in apply (views play on the press or on `onAccepted`). No `Math.random`, wall clock or
  native trig in `src/sim` (pose maths in integer cm, as `railway-away.ts` does `e^(−x)`). Clear the riding presence
  (`null`) when you get off. No lockstep op on this Server-kind state.
- **Conservation.** The cart, shelf and train kit add three places a log or rail can sit. Every move is one atomic
  apply with a test that totals stay equal. This is the stop condition in production-core's authority boundary.
- **Moving platforms.** A cart or train pose from the server's tick against the client's tick estimate can jump
  under a rider. Read the pose from the same estimate the mirror uses. Check that riders stay aboard in two tabs.
- **Hotspots.** `src/adapters/railway.ts` (918 lines) and `line2-view.ts` already carry Q1–Q3. Put the cart, boiler
  and train views in their own files under `src/entities/railway/`.
- **Mixed builds.** Each `WORLD_NS` bump resets development worlds (accepted: no old builds). Within a version, wire
  changes are additive fields and kinds only.
- **Greybox leaking.** It must stay dev-only (`import.meta.env.DEV` and `?greybox=`). Check that `npm run build` has
  no `proto/greybox` chunk. Its survey line must never be solid.
- **Performance.** The trestle, lamps, halts and two trains add meshes and tick work: `npm run perf` at B4 and B7,
  and the server ms per step in `npm run load`.

## Open questions for the owner (answered 7 November)

1. **The glider at Far Head:** leave it out of part 2? *Recommended: yes.* Q5 opens with the Needle Bell switch
   alone, and the device's spot is kept for the movement slice.
   Answer: as recommended (owner, 2026-11-07: "approved all 5").
2. **Q4 before the real cart:** ship the first playable with the depot minting the loads (B2), then add the cart's
   trip (B3)? *Recommended: yes.* That gets play on main sooner. The alternative waits for the cart.
   Answer: as recommended (owner, 2026-11-07: "approved all 5").
3. **The ridden cart bonus (13 m/s with a rider):** leave it out of the first cart build and test it in the 2D
   economy model first? *Recommended: yes.* Add it if the model or the playtest asks for it.
   Answer: as recommended (owner, 2026-11-07: "approved all 5").
4. **Train cargo and town growth:** keep them for slice 5, so part 2's trains carry only Q6's kit and passengers?
   *Recommended: yes.*
   Answer: as recommended (owner, 2026-11-07: "approved all 5").
5. **Playtest stop:** play once at the end of part 2 (the pier), with no stop after the first playable?
   *Recommended: yes*, as "keep going while the owner is away" asks. A Q4 still and bot report go in the brief
   meanwhile.
   Answer: as recommended (owner, 2026-11-07: "approved all 5").
