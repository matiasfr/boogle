# Plan: line 2 part 2, B5–B8 (halts, the boiler, trains, Q6 to the pier)

Prepared 8 November 2026 against `origin/main` `55c75844`, for Codex gpt-6.1-sol in parallel jobs. Planning only; no
code changed. Parent plan: [line2-part2-greybox](line2-part2-greybox.md), steps B5–B8 and its Risks; job format from
[line2-b4](line2-b4.md). Binding calls (decision log, 2026-11-08): **the next playtest is today's fixes plus B5–B8**
(world resets as these need them); **the cart keeps its rack**; **fill a gated stretch before its switch** (being built
on `codex/gated-fill`); **the cart may shove you; the train lines run low and bend** (the sea links in the greybox
JSON, not line 2's Place track; the speed ladder stays later); **world scale settled**. Parent plan answers that still
bind: train cargo and town growth wait for slice 5 (part 2's trains carry passengers and Q6's kit only); no ridden
speed bonus.

## Goal

After Far Head, the forge has cast a boiler. You carry it from the apron to the old train at the camp and fit it. The
train wakes, halts drop into place on both lines and two trains run at 20 m/s. You stand on a halt and a train comes.
The first line-2 train out of the village carries Q6's kit (32 logs, 32 rails) to the rack at Far Head. You carry it
into the last frame, and the machine lays the pier north toward Ring Island. Serves DESIGN **Telegraph everything**
(the boiler waits in plain view, the halt's signal and board), **Show, don't tell** (no banners; the wake, the halts and
the kit crates are the payoff), **Enjoyable alone and together** and **Clear authority** (every transfer is the
server's). It bends nothing.

## Facts checked in the tree (8 Nov)

- **State today** (`src/sim/railway-world.ts`): components `rail` (… `lever`, `sea`, `hook`, `out0`–`out4`, `pack`,
  `depotRails`, `shelfOut`), `beam`, `cart`, `forge`, `qjob` ×5 and others. `DEPOT_OUT` must match
  `LINE2_STATIONS.length` (it throws otherwise). `WORLD_NS = 'v20'`. No boiler, train, halt or old-train code exists in
  `src/sim`, `src/entities`, `src/adapters` or `server/`. Production draws no old train at the camp.
- **The beam is the pattern for the boiler**: `Beam` (state, holder, epoch, revision, x, y, z, age); systems
  `rail.beamTake/beamDrop/beamDeposit`, `railBeamRelease/railBeamStood/railBeamPutDown`
  (`src/sim/railway-systems.ts` 319–405, 990–1027); host grace `maintainBeam` and `depart()`
  (`server/src/host/world-host.ts` 354–378, 535–541); the supply pulse's `beam` recovery (world-host 254–292, systems
  `supply`). Beam ops are not predicted (`RAIL_PREDICTED` in `src/world/railway-predict.ts`).
- **The cart is the pattern for a moving server object**: `src/sim/railway-cart.ts` (an eased trapezoid in integer cm per
  100 ms tick, pose a pure function of (phase, depart, from, to, tick)); `cartStep` in railway-systems.ts (each phase
  change one row write, each transfer atomic); view `src/entities/railway/cart-view.ts` (`rail.makeCar`, a local clock
  that leans on `adapter.tickNow()`, `platform.shared = true`); load row `WS_LOAD_CHURN=cart` in
  `dev/peer-test/ws-railway.ts` 583+.
- **Place numbers** (the design reference): `TUNE.cruise 20` m/s, `accel 3.5` m/s², `dwell 5` s (layout.ts 30–32);
  stops `LINKS[0].stops = [14, 207]` (village, camp) and `LINKS[1].stops = [17, 174, 524]` (village, quarry, Far Head);
  three cars, LOCO `{hx 0.8, hz 1.5, top 1.75}` at +3.7 m and two TRAILERs `{hx 1.1, hz 1.6, top 0.7}` at 0 and −3.7 m
  (rail.ts 1209, wagon/look.ts 19–20). The kit is 8 crates of 4 logs + 4 rails (cargo.ts `KIT`), loaded at line 2's
  village stop and unloaded onto the rack by the last frame at the Far Head stop. Q6: s 546 → 742, 32/32, speed 9,
  `rack: 'train'`. The boiler is cast when line 2 opens to Far Head (run.ts `openPath`, `job.boiler = 1`), at the apron
  local (−81, 5.4) (props.ts 151–160); "Shoulder the boiler" within 3.6 m; "Fit the boiler" within 7 m of the camp
  train's loco (verbs.ts 317–345). Trains retire the depot cart to its shed (depot.ts 537).
- **Computed from Place's layout** (node, this session; world cm):
  - Q6 frame `frameBesideLine` = **(137293, −18355)** (the same method gives the catalog's Q4 (108147, 3073) and Q5
    (116668, −2831)). Q6 `line2Panels` with 32 panels = **64 rail pairs**, 3.06–3.07 m each (inside the test's
    2.30–3.38 m).
  - Apron (boiler pedestal) world **(91900, 540)**, ground `H` = 18.15 m → **y 1815**. The camp stop (s = 207 on line 1)
    is **(100964, −14900)**, ground 30.2 m.
  - Halts (centre, deck top `low`, half length; Place `HALTS` through `lineAt`, `lateral`, `railY`):

    | # | Name (Place copy) | Line | Stop | Centre (cm) | y (cm) | Half (m) |
    | --- | --- | --- | --- | --- | --- | --- |
    | 0 | Village | 0 | 0 | (92819, −434) | 1902 | 11 |
    | 1 | Camp | 0 | 1 | (100964, −14610) | 3102 | 12 |
    | 2 | Village, line 2 | 1 | 0 | (92779, 2617) | 1902 | 11 |
    | 3 | Quarry | 1 | 1 | (108132, 4114) | 2502 | 10 |
    | 4 | Far Head | 1 | 2 | (136361, −16353) | 2502 | 11 |

  - The pier end (s = 739 on line 2) is world (1402.2, −367.5) m, rail height 24.3 m; Ring Island is 751 m north (the
    greybox, parent plan).
- **Leg times at 20 m/s and 3.5 m/s²** (5.7 s and 57 m to reach cruise): line 1 14 → 207 m about 15 s; line 2
  village → quarry (157 m) about 14 s, quarry → Far Head (350 m) about 23 s.
- **Clearances.** The cart rests at line 1 s = 196 (its camp stop, `CART_ROAD`). The line-1 train stands at s = 207
  (cars 201.7–212.2 m), so it would run through a resting cart on its first trip: the cart must retire (hidden, no
  collider) before line 1's train first leaves. The machine waits at Far Head's end of laid track (s ≥ 546). The Far
  Head stop is 524 (loco nose 529.2 m), clear of it.

## In flight, and what these jobs avoid

Checked with `npm run inflight` and by diffing `../boogle-codex/<name>` against main. No branch has commits yet; these
are the working trees.

| Branch | Touches | Effect on these jobs |
| --- | --- | --- |
| `codex/gated-fill` | `src/sim/railway-systems.ts` (`fundQ`, `deposit2`, `lever`, `seaSwitch` now fund), `src/sim/railway-line2.ts` (unfunded/funded invariants with `line2GateDown`), `src/world/railway-predict.ts` (holds back `Cart.rails`), `src/adapters/railway.ts`, `src/entities/railway/line2-view.ts`, `test/helpers/railway-q2.ts`, `test/railway-line2.test.ts`, `test/railway-replicate.test.ts`, `dev/look/rail-seed.ts` (`q3-done`), new `dev/look/evals/railway-gated-fill.ts` | **A waits for it** (the same functions). Its `fundQ` is where A adds the train's rails to the shelf leftovers. |
| `codex/depot-rack-carry` | `dev/look/rail-seed.ts` (stages `q2-stocked`…`q5-carry`) so far; per its brief also the depot rack and shelf views and carried rails on Buddy and the pack (`line2-view.ts`, `shelf-view.ts`, `cart-view.ts`, `line-cargo.ts`) | B edits `cart-view.ts` (one hunk) and C `line2-view.ts`: **both start after it merges**. Nobody here edits `line-cargo.ts`. |
| `codex/sea-switch-early` | `sea-gate-view.ts`, `rail-seed.ts` (`q3-done`) | No overlap except `rail-seed.ts` (additive stage lists: rebase). |
| `codex/wake-press` | `src/world/railway-server.ts` (one line in `rail.wake`), `src/sim/railway-layout.ts`, `src/entities/railway/view.ts`, `dev/look/bots/railway.ts`, `test/railway-placement.test.ts` | A rebases over the one server line; B over the `view.ts` hunk; D over the bot hunk. |
| `codex/town-greeter` | new `greeter.ts`, `opening-view.ts`, `view.ts`, `rail-seed.ts` (`awake`, `q1-done`) | B rebases over `view.ts`; A over `rail-seed.ts`. |
| `codex/seat-stool` | `src/proto/place/seat.ts` | B registers train seats through `seat.ts`'s API and does not edit it: start B after it merges, so the train seats are stools. |
| `codex/safari-render-gap` | `src/render/scene.ts`, `precompile.ts`, new `portable-device.ts` | None. Take B's `npm run perf` before and after on the same base. |
| `codex/dock-patches`, `codex/beam-rope-hand` | nothing yet (per briefs: dock ground; `beam-drag.ts`/`line-cargo.ts`) | None: the boiler gets its own worn model in `boiler-view.ts`, not in `line-cargo.ts`. |

Hotspots: `src/sim/railway-systems.ts` (1027 lines), `src/adapters/railway.ts` (987), `src/entities/railway/line2-view.ts`
(1027) and `dev/look/bots/railway.ts` (1633). Only job A edits the first two. C adds wiring hunks to `line2-view.ts` and
D a new segment to the bot. Every new piece of logic goes in a new file.

## Design: sync kind and ownership

Everything shared is **Server** kind in the railway E world (`docs/agents/sync.md`): the server applies, replicates
changed rows, and validates range from the action's own position. No lockstep op, no `src/world/rules/types.ts` entry, no
`env` fact. Views are **Local**, rebuilt from accepted state. Riding is **Owner** (your body on a moving platform).

| State / piece | Kind | Authority | API |
| --- | --- | --- | --- |
| **Boiler** (new kind `boiler`, one entity): `state` (`none`, `pedestal`, `held`, `ground`, `fitted`), `holder`, `epoch`, `revision`, `x`, `y`, `z`, `age` | Server, like the beam | Cast by the rule tick when Q5 completes; held by one pid; the server judges take, drop and fit from the actor's position | new `rail.boilerTake {revision}`, `rail.boilerDrop {revision,x,y,z}`, `rail.boilerFit {revision}`; host `railBoilerRelease`; supply recovery |
| **Trains on** (`trains` int on `rail`, tick of the fit, −1 default) | Server | set once by `rail.boilerFit` | derived `line2.trains` (bool) |
| **Train** (new kind `train`, two entities keyed by `slot` = line 0/1): `phase` (STAND/RUN), `at`, `to`, `sweep`, `depart`, `call`, `logs`, `rails` | Server, like the cart | rule tick (`rail.trainTick`); one row write per arrival and per departure; the pose is a pure function of the row and the tick, so a running train sends no packets | new `rail.call {id: halt}` |
| **Q6** (sixth `qjob` slot; `out5` on `rail`) | Server | as Q2–Q5, fed by the line-2 train instead of the cart | existing `rail.deposit`, `rail.depotTake`, `rail.depotRailTake` |
| Halts: platform, roof, bench, signal, board | Local, from `line2.trains`; drop on the live edge, snap on restore; colliders `owner`-owned | — | `src/entities/railway/halts-view.ts` |
| Trains, old train, wake, kit crates aboard, kit unload flights | Local, from rows + `adapter.tickNow()` | — | `src/entities/railway/train-view.ts` |
| Boiler on pedestal, on a back, on the ground; the saddle fit | Local, from `boiler` | — | `src/entities/railway/boiler-view.ts` |
| Pier show (rockets) | Local, live 0→1 edge of Q6 completion only | — | `src/entities/railway/pier-view.ts` |
| Riding a train | Owner | your body (`src/physics/platforms.ts`), platform ids `railway:train0/1`, `shared = true` | nothing new |

**Controls.** Everything is Interact through `targets()`: `railway-boiler` (verb **Shoulder the boiler**, Place copy)
and `railway-boiler-fit` (verb **Fit the boiler**). Putting the boiler down uses the existing `place-drop` action (R3,
right click, the touch Drop button) through a new `bindBigDrop` slot in `src/player/cargo-drop.ts`. There are no new
action ids, pad slots, keys, touch buttons or guide rows, and `freeSlots()` is untouched. A train comes when you stand
on a halt; there's no input for it.

### The rules (job A pins them)

**Catalog** (`src/sim/railway-line2-layout.ts`):
- `Line2StationId` adds `'Q6'`. `Line2Station` gains `feed?: 'train'` (the cart never serves a `feed: 'train'` stretch).
  Append the Q6 row: `bill [32, 32]`, `beam 0`, `fromCm 54600`, `toCm 74200`, `x 137293`, `z −18355`, `panels 32`,
  `crate true`, `speed 180`, `depot true`, `shelf true`, `feed 'train'`. Change the header's "Q6 onward is not promoted
  yet" to "Q6 is the last".
- `LINE2_BOILER = { x: 91900, z: 540, y: 1815, reach: 420 }` (Place props.ts apron). `LINE2_OLD_TRAIN = { x: 100964,
  z: −14900, reach: 800 }` (the camp stop, Place `LINKS[0].stops[1]`; verbs.ts fits within 7 m of the loco).
  `LINE2_BOILER_AREA = { x0: 88000, x1: 104000, z0: −17200, z1: 3500, y0: 1000, y1: 4500 }` and
  `line2BoilerGround(x, y, z)` (inside the box, which is Home from the forge to the camp). The bot's walk in D checks the
  box: widen it only if the walk leaves it, and say so.
- `LINE2_KIT = { logs: 32, rails: 32 }` (Place's 8 crates × 4/4, equal to Q6's bill).

**New module** `src/sim/railway-train.ts` (pure; no trig, wall clock or randomness; joins `LOCKSTEP_FILES` if that
list names railway sim files individually, otherwise it is covered by `src/sim/`):
- `TRAIN = { speed: 200, accel: 3.5, dwellTicks: 50, callDwellTicks: 15, wakeTicks: 60, kitWaitTicks: 60 }` (cm per
  100 ms tick and cm/tick²: Place's 20 m/s and 3.5 m/s²; dwell 5 s; a called train leaves after 1.5 s; the wake holds
  departures 6 s; at the village the kit waits up to 6 s more for the forge).
- `TRAIN_PHASE = { STAND: 0, RUN: 1 }`. `TRAIN_STOPS = [[1400, 20700], [1700, 17400, 52400]]` (cm along Place's
  `LINES.north` and `LINES.east`). `TRAIN_HOME = [1, 0]` (where each train stands when trains start: line 1 at the
  camp, where the old train is; line 2 at the village).
- `LINE_HALTS`: the five rows of the table above as `{ name, line, stop, x, z, y, reach }`, `reach = (half + 1.6 m)`
  in cm (1260, 1360, 1260, 1160, 1260).
- `trainLegTicks(dist)`, `trainLegAlong(dist, t)`: the cart's `legTicks`/`legAlong` with `TRAIN.speed`/`TRAIN.accel`
  (same profile, own constants; do not edit `railway-cart.ts`). `trainAlong(row, line, tick)`: cm along the line
  (STAND: the `at` stop; RUN: `at`'s cm ± `trainLegAlong(|to − at|, tick − depart)`). `trainArrives(row, line)`: the
  tick a RUN reaches `to`. `trainEtaTicks(row, line, stop, tick)`: 0 when standing there; otherwise the remaining leg,
  plus the dwell and the next leg when the train is heading away (what the halt board shows).
- `type RailTrain = { phase, at, to, sweep, depart, call, logs, rails }`; `trainIdle(line)`.

**Systems** (`src/sim/railway-systems.ts`):
- `heldBig(w, pid)`: the beam or the boiler is held by pid. `free()` uses it, so a boiler on your shoulder blocks your
  back as the beam does. `beamTake` also requires `!boilerHeld`, and `boilerTake` requires `carried(a) === 0` and
  `!beamHeld`.
- **Cast.** In `layLine2`, when slot 4 (Q5) completes and `boiler.state === 'none'`, set `state 'pedestal'` at
  `LINE2_BOILER` and `revision++`. Add `Boiler` to `line2Tick`'s and `resume`'s writes, so an away credit that finishes
  Q5 casts it too.
- `rail.boilerTake` (order 29): needs `state ∈ {pedestal, ground}`, a matching `revision`, an empty back and no beam held.
  It sets `held`, `holder`, `epoch`, `age 0` and `revision++`.
- `rail.boilerDrop` (order 30): needs the holder's own session and a matching revision. It puts the boiler on the ground
  at `(x, y, z)` when `line2BoilerGround` holds, otherwise back on the pedestal, then `revision++`.
- `rail.boilerFit` (order 31): needs the holder, the epoch and the revision. It sets `state 'fitted'`, `holder ''`,
  `revision++` and `rail.trains = tick`, then sets both train rows to `{ phase STAND, at TRAIN_HOME[k],
  to TRAIN_HOME[k], sweep k ? 1 : −1, depart tick + TRAIN.wakeTicks, call −1 }`. It returns 0 if trains are already on.
- `railBoilerRelease(w, pid, epoch, revision)` (phase `boiler`): a holder who stays away past the grace has the boiler
  put back on the pedestal (the parent plan: "put back if its holder leaves"; it does not go down where they stood).
  `railSession` moves a held boiler to the holder's new epoch, as it does the beam. In the supply pulse, a `ground`
  boiler ages like the beam and goes back to the pedestal when `e.boiler === revision` and `age === 21` (owner,
  5 November: an unreachable beam or boiler returns to its pickup spot).
- `rail.call {id}` (order 32): `id` is a `LINE_HALTS` index. It returns 0 while `rail.trains < 0`. For row `r` on the
  halt's line: if `r` stands at `halt.stop` and `tick > r.depart`, then `depart = tick` (the dwell restarts: "Stand on one
  and it waits") and it returns 1. If `r.call === halt.stop`, it returns 0. Otherwise `call = halt.stop` and it returns 1.
  The call takes effect at the train's next decision: a standing train leaves after `callDwellTicks` straight for the
  called stop, passing the stops between, and a running train finishes its leg first. **Departure from Place:** Place
  brakes mid-leg and reverses, which needs a leg with a starting speed. Here the wait is at most one leg longer
  (≤ 23 s), and the pose stays a pure eased leg.
- **The train tick** `rail.trainTick` (phase `tick`, order 3; `jobClock` moves to order 4; `railTick` runs it after
  `cartTick`). It does nothing while `rail.trains < 0`. For each row, in slot order, in a guarded loop like `cartStep`:
  - **RUN**, at `tick ≥ trainArrives`: STAND at `to`, `depart = arrival tick`, `call = −1` if `call === to`, then the
    arrival transfer: on line 2 at the last stop, **unload** (`depot += logs`, `depotRails += rails`, the row's
    `logs = rails = 0`, all in this one apply).
  - **STAND**: dwell = `callDwellTicks` if a call is pending for another stop, else `dwellTicks`. Line 2 standing at
    stop 0 while `kitServing(w)` (Q6 is the active stretch and unfunded) **loads the kit**: logs are minted up to the
    need (`out5 += n`, `depotProduced += n`, `row.logs += n`) once, on arrival or when trains start. Rails move off the
    forge rack each tick up to the need (`forge.rack −= n`, `shelfOut += n`, `row.rails += n`). It stays while rails are
    still owed, the forge is lit, and `tick < depart + dwell + kitWaitTicks`. Line 1's first departure also waits for
    `cart.phase === REST` (the cart retires before a train can reach it). Then it leaves: `to = call` if one is pending
    for another stop, else the next stop along `sweep` (turning at the ends). The row becomes RUN with `depart = tick`.
  - `depotNeed(w, k, j)` counts the line-2 train's `logs`/`rails` aboard as well as the cart's. `cartServing` returns
    −1 for a `feed: 'train'` stretch, so after Q5 funds the cart goes home and rests. `fundQ`'s shelf leftovers also
    send the train's rails aboard back to the forge rack (in the same apply, as for the cart). Logs aboard at funding
    stay aboard and land on the rack; this happens only if someone hand-filled Q6, and conservation holds.
- **No away credit for trains** in this build: the world is paused when nobody is online, and the train's schedule
  resumes from the saved tick. The forge's credited rack feeds the kit's next pass.

**Server** (`src/world/railway-server.ts`): add `rail.boilerTake`, `rail.boilerDrop`, `rail.boilerFit` and `rail.call`
to `RAIL_ACTIONS`. `railValid`:
- `boilerTake`: `railInt(e.revision) && near(boiler.x, boiler.z, LINE2_BOILER.reach)`.
- `boilerDrop`: the `beamDrop` checks.
- `boilerFit`: `railInt(e.revision) && near(LINE2_OLD_TRAIN.x, LINE2_OLD_TRAIN.z, LINE2_OLD_TRAIN.reach)`.
- `call`: `railInt(e.id, LINE_HALTS.length − 1)`, `height(halt.y)` and `near(halt.x, halt.z, halt.reach)`. The circle is
  looser than the platform's box, which is range validation; the client sends the call only from the box.

The install API gains `boiler()` (a narrow read), `boilerRelease(pid, epoch, revision)` and `train(k)` (tests).
**Host** (`server/src/host/world-host.ts`): `maintainBoiler` beside `maintainBeam`, using the same `railBeamGraceS` (no new
tunable): if the holder is inactive past the grace, call `api.boilerRelease`. `depart()` starts `boilerAway` the way it
starts `beamAway`. The supply pulse adds `boiler: revision` for a `ground` boiler with `age === 21` and nobody near
(`railNobodyNear`). The same pulse runs on restart.

**Prediction** (`src/world/railway-predict.ts`): no new op is predicted. Boiler ops wait for the server, as beam ops do.
`rail.call` waits too, so a wrong guess never reroutes a drawn train. `rail.deposit`/`depotTake` stay predicted for Q6.

**Adapter** (`src/adapters/railway.ts`): add the four ops to the `RailwayIntent` union and `intentOf` (`rail.call` with
`railInt(e.id, LINE_HALTS.length − 1)`), `'Q6'` in `rail.deposit`, and add all four to `NOT_MATERIAL`. `holds`:
`rail.call` → the halt's train already has that call or stands there; `rail.boilerFit` → `line2.trains`. `submit`
refuses material ops while you hold the boiler, as it does for the beam. `inspect().line2` gains `boiler`
(frozen copy), `trains: boolean`, `trainsAt: number`, `train: readonly RailTrain[]` and `kitOwed: { logs, rails }`. The
API gains `shoulderBoiler(revision)`, `dropBoiler(x, y, z, revision)`, `fitBoiler(revision)` and `callTrain(halt)`.

**Invariants** (`validateRailLine2` in `src/sim/railway-line2.ts`, plus `railwayCheck`'s archetypes `[Boiler]`,
`[Train]` and counts Boiler 1, Train 2):
- The boiler is `none` exactly while `line2Completed < 5`. It is `fitted` exactly while `trains ≥ 0`. `holder` is
  non-empty exactly while it is `held`, and the holder has an account. x, y, z, revision and age are bounded like the beam.
- While `trains < 0` both train rows are idle. Otherwise each row has `phase ∈ {0,1}`, `at`/`to` within its line's
  stops, `sweep ∈ {−1, 1}` and `call ∈ [−1, last]`. Row 0 has `logs = rails = 0`. Row 1 has `logs ≤ LINE2_KIT.logs`
  and `rails ≤ LINE2_KIT.rails`.
- `depot + cart.logs + train[1].logs ≤ depotProduced`; `depotRails + cart.rails + train[1].rails ≤ shelfOut`.
  `line2Logs` and `line2Rails` count the train's load. `depotOut` has length 6 and `out5 ≤ 32`. The last check stays
  `line2Rails(s) === forge.poured`.

**WORLD_NS**: one bump, in job A's commit, to the next free version (**v21** unless `gated-fill` or another branch took
it first; then the next number), with the history line:
`// v21 (2026-11-08): line 2 part 2, B5-B8: the boiler (a new `boiler` component; rail.boilerTake/boilerDrop/boilerFit)
and trains (a new `train` component, one row per line; rail.call from a halt); Q6 joins line two (a sixth qjob slot, fed
by the line-2 train's kit); new rail fields `trains` and `out5`.`
It resets development worlds and, through the save reset, players' local progress (owner-approved, "a world wipe is a
new save").

### The halt call rule (summary)

Halts exist only once `line2.trains` is true. Your tab checks whether your body is on a halt with Place's `onIt`
(the deck box ±1.6 m across, ±(half + 0.4) m along, ±1.6 m in height, and 0.4 m more to leave). On **entering** one,
when you are not on a train platform (`carry.on` is not a train car), it sends `rail.call {id: halt}` once. Leaving and
coming back calls again. The server accepts a call only from the action's own position within the halt's reach and
height. The rule is idempotent (see `rail.call` above). The halt's signal drops and its board shows
`${eta} s` (Place's copy), from `trainEtaTicks`, on every tab whose train has a pending call or stands there.

### The Q6 kit load path (summary)

The first line-2 train standing at the village while Q6 is active and unfunded takes the kit:
1. **Logs** are minted onto the train once, up to `min(32 − Q6 stock − depot − aboard, 32 − out5)`. They are counted
   production (`depotProduced`, `out5`), like the cart's camp mint.
2. **Rails** move off the forge rack each tick up to `min(32 − Q6 railStock − depotRails − aboard, 32 − shelfOut)`.
   The train waits up to 6 s past its dwell for the rack (the rack holds 24; the forge pours 2 a second, so one trip
   usually carries all 32). It never mints rails. Rails still owed ride the next pass.
3. At the **Far Head** stop, everything aboard lands on Q6's rack and shelf in one apply.
4. You carry the last stretch into the Q6 frame (`rail.depotTake`, `rail.depotRailTake`, `rail.deposit`), as the cart's
   racks work today. Q6 funds and the machine lays the pier.

Every unit has one home at every tick: the forge rack, the train, the rack or shelf, a back, a pile, or the frame.

## Jobs and their order

```
gated-fill merges ──► A (rules, server, adapter, seeds, WORLD_NS) ──┬──► B (halts + trains views)  ──┐
depot-rack-carry, seat-stool merge ─────────────────────────────────┤                                 ├─► D (bot + record) ─► final pass ─► playtest guide, stop
                                                                     └──► C (boiler + Q6 + pier views) ┘
```

- **A is sequential**: it starts once `codex/gated-fill` is merged (the same functions in `railway-systems.ts`,
  `railway-line2.ts`, `railway-predict.ts`, the adapter and the test helpers). If gated-fill is still more than a couple
  of hours from merging, branch A from `codex/gated-fill`'s tip and rebase onto main after it lands. Rebase over
  `wake-press`, `town-greeter`, `sea-switch-early` and `depot-rack-carry` where they share `railway-server.ts` (one line)
  or `rail-seed.ts` (stage lists).
- **B and C run in parallel** once A is merged. They share no file. B owns `view.ts`, `cart-view.ts` and new
  `halts-view.ts`/`train-view.ts`. C owns `line2-view.ts` (new hunks), `cargo-drop.ts` and new
  `boiler-view.ts`/`pier-view.ts`. B also waits for `depot-rack-carry` (cart-view) and `seat-stool` (train seats), and
  C for `depot-rack-carry` (line2-view's racks). Both may start coding from A's branch against the pinned names below
  and rebase after A merges.
- **D** waits for B and C to merge: its proofs need every view. Its code can be written in parallel with B and C
  against the pinned names.
- **Final pass** (the orchestrator, once, after D): `npm run playthrough -- --long --eval dev/look/evals/railway-job.ts
  --query 'shot=play'`. It must pass `Far Head`, `boiler`, `TRAINS`, `Q6 funded`, `Q6 laid` and `pier` with no errors.
  Then write the playtest guide (today's fixes plus B5–B8) and stop all development.

**Pinned names** (do not rename). From A: the ops above; adapter `shoulderBoiler`, `dropBoiler`, `fitBoiler`,
`callTrain`, `tickNow`; `inspect().line2.{boiler, trains, trainsAt, train, kitOwed}`; sim exports `TRAIN`,
`TRAIN_PHASE`, `TRAIN_STOPS`, `LINE_HALTS`, `trainAlong`, `trainEtaTicks`, `LINE2_BOILER`, `LINE2_OLD_TRAIN`,
`LINE2_KIT`. From B: interactables none. The view inspect gains `trains: [{ x, y, z, along, phase, riding }]`,
`oldTrain: { x, y, z }`, `halts: [{ name, x, y, z, up, calling, eta }]` and `trainFlying()` (logs/rails in flight to the
rack). From C: interactables `railway-boiler` (**Shoulder the boiler**) and `railway-boiler-fit` (**Fit the boiler**).
`line2.inspect()` gains `boiler: { x, y, z, state, mine }`, `q6Rack: { x, y, z }` and `pier: { x, y, z }` (the line's
end at s = 739, metres). All of these reach the bot as `read().line2View.*` / `read().railwayView.*` through the
existing spreads in `view.ts`.

---

### Job A: rules, server, adapter, WORLD_NS and look seeds

**Files.** `src/sim/railway-line2-layout.ts`, new `src/sim/railway-train.ts`, `src/sim/railway-world.ts`,
`src/sim/railway-systems.ts`, `src/sim/railway-line2.ts`, `src/sim/railway.ts` (`railCounts` comment if it changes),
`src/sim/railway-supply.ts` (`SupplyPulse.boiler?`), `src/world/railway-server.ts`, `src/world/railway-predict.ts`
(comment only), `src/world/namespace.ts`, `src/adapters/railway.ts`, `server/src/host/world-host.ts`,
`dev/peer-test/ws-page.ts`, `dev/peer-test/ws-railway.ts`, `dev/peer-test/ws-run.ts`, `dev/spikes/ecs/railway-diff.ts`,
new `test/helpers/railway-trains.ts`, new `test/railway-boiler.test.ts`, new `test/railway-train.test.ts`,
`test/railway-line2.test.ts`, `test/railway-line.test.ts`, `test/railway-replicate.test.ts`,
`server/test/railway-line-host.test.ts`, `dev/look/rail-seed.ts`, new `dev/look/evals/railway-b5b8-at.ts`.

**Steps.**

- [ ] **A1. Catalog and the train module.** Everything in "The rules" under Catalog and New module. Unit test in
  `test/railway-train.test.ts`, `'train legs: eased, whole cm, eta = arrival'`: `trainLegAlong` is monotone,
  0 at t ≤ 0 and `dist` from `trainLegTicks(dist)`; line 2 village → quarry (15700 cm) takes 136 ticks. A test pins each
  `LINE_HALTS` row against Place's `HALTS` through `lineAt`/`railY` (a node import of `src/proto/place/layout.ts`, as
  `test/greybox-works.test.ts` does), within 5 cm, and each `TRAIN_STOPS` value against `LINKS[k].stops`.
- [ ] **A2. State.** `Rail` gains `trains: 'int'` (default −1) and `out5: 'int'`, and `DEPOT_OUT` gains `'out5'`.
  `Boiler = defineComponent('boiler', { state: 'str', holder: 'str', epoch: 'int', revision: 'int', x: 'int', y: 'int',
  z: 'int', age: 'int' }, { defaults: { state: 'none', x: 91900, y: 1815, z: 540 } })`. `Train =
  defineComponent('train', { slot: 'int', phase: 'u8', at: 'int', to: 'int', sweep: 'int', depart: 'int', call: 'int',
  logs: 'int', rails: 'int' }, { key: 'slot', defaults: { call: -1, sweep: 1 } })`. Append both to `RAIL_COMPONENTS`
  after `Cart`. `createRailwayWorld` spawns `[Boiler, {}]` and then two trains with `{ slot: k, at: TRAIN_HOME[k],
  to: TRAIN_HOME[k] }`, appended after the cart. Add both to `ARCHETYPES` and the counts. `railwayView`,
  `refreshRailway` and `copyRailway` carry `line2.boiler`, `line2.trains` (the tick) and `line2.train[]`. The
  `RailLine2` type in `railway-line2.ts` gains the same fields, plus `line2Trains(s)` (bool) and `line2KitOwed(s)`. Add
  the invariants above.
- [ ] **A3. Systems.** Everything in "The rules" under Systems, in `railway-systems.ts` (the boiler block after
  `beamDeposit`, the train block after `cartStep`), and `'rail.boilerTake' … 'rail.call'` in `OPS`. Export
  `railBoilerRelease`. Update the file header's index.
- [ ] **A4. Server, host, adapter.** Everything in "The rules" under Server, Host, Prediction and Adapter.
  `dev/peer-test/ws-page.ts` gets the four op cases and `T.railTrain(k)`: `{ along: trainAlong(row, k, adapter.tickNow()),
  phase, depart }`. `dev/spikes/ecs/railway-diff.ts` gets the four ops in both op lists.
- [ ] **A5. WORLD_NS** as above.
- [ ] **A6. Helpers and seeds.** `test/helpers/railway-trains.ts` exports `railwayAtTrains(stage: 'boiler' |
  'boiler-camp' | 'trains-on' | 'q6-stocked' | 'q6-finishing' | 'q6-done'): World`, built on
  `railwayAtQ5('q5-done')` (as it stands after gated-fill):
  - `boiler`: asserts the pedestal.
  - `boiler-camp`: `a` shoulders it and drops it at `(100700, 3030, −14400)`, ground beside the old train.
  - `trains-on`: shoulder, then fit from the camp. Advance 20 ticks: both trains stand at home, still in the wake.
  - `q6-stocked`: advance until `train[1]` has unloaded at Far Head (`depot === 32 && depotRails === 32`); assert
    `forge.poured` conservation.
  - `q6-finishing`: deposit 32/32 into Q6 by `a`/`b` (16 each, pack), then advance to `totalTicks − 450`.
  - `q6-done`: finish it.

  Each stage asserts `railwayInvariant === null`. `dev/look/rail-seed.ts` adds these six stage names (dispatching to
  `railwayAtTrains`) to its list, alongside whatever stages the merged branches added. New
  `dev/look/evals/railway-b5b8-at.ts`, modelled on `railway-b4-at.ts`, waits for the seed (`line2.completed ≥ 5`), then
  teleports and frames the camera at `b58at` = `apron` (beside the pedestal, facing it), `camp` (beside the old train),
  `village` (on the line-2 village halt, facing the line), `quarry`, `head` (the Far Head halt), `q6` (beside the Q6
  frame and rack) and `pier` (s = 739 on the deck, facing north). It throws if the seed did not load.
- [ ] **A7. Tests.**
  - `test/railway-boiler.test.ts`:
    - `'cast once when Q5 completes, at the apron'`: `none` before `finishQ(4)`, `pedestal` after, survives snapshot
      and load, and an away credit that finishes Q5 casts it.
    - `'one boiler for two takers'`: the same revision taken by `a` and `b`; one is accepted and the other gets 0.
    - `'a held boiler blocks the back'`: depot/forge takes return 0; a full back cannot shoulder.
    - `'dropped where released, on Home only'`: a drop over the sea goes to the pedestal.
    - `'the holder leaves: back on the pedestal'`: `railBoilerRelease` with a stale revision or epoch is 0.
    - `'a ground boiler recovers after its minutes'`.
    - `'fit once, at the old train'`: `trains = tick`, rows at home, a second fit returns 0.
    - Malformed documents: `fitted` with `trains −1`, `pedestal` before Q5, and `held` with no holder each fail
      atomically.
  - `test/railway-train.test.ts`:
    - `'pose is continuous across arrivals, departures and calls'`: from `trains-on`, sample `trainAlong` every tick for
      three full shuttles on both lines, with a call mid-leg and a call while standing. Each step moves
      ≤ `TRAIN.speed + 1` cm, with no jump at a phase change.
    - `'a call: next decision, idempotent, holds a standing train'`.
    - `'line 1 waits for the cart to rest'`.
    - `'the kit: every unit has one home'`: from `trains-on` to `q6-stocked`, `line2Rails === forge.poured` and the log
      totals hold after every tick. Rails only leave the forge rack. `out5 ≤ 32`.
    - `'snapshot mid-trip'`: snapshot and load during a RUN with the kit aboard give the same pose at the same tick and
      the same load.
    - `'eta equals the arrival tick'`.
    - `'Q6 funds from the rack and lays to the pier'`: `line2Completed` 6, `line2Active` −1.
  - `test/railway-line2.test.ts`: the Q5 tests' last assertions (Q6 is now active after Q5, the station rail total
    includes Q6 once funded, and the cart rests after Q5 funds because `feed: 'train'`). `test/railway-line.test.ts`:
    panel counts `[12, 24, 24, 32, 96, 64]`; the machine-view parity test covers six stages.
  - `test/railway-replicate.test.ts`: the mirror patches `train` and `boiler` rows from packets. A predicted deposit
    refused while you hold the boiler shows no flight. `rail.call` is not predicted.
  - `server/test/railway-line-host.test.ts`, new `'line host: the boiler and trains; a call judged on the halt; trains
    survive a restart'`, seeded from `railwayAtTrains('boiler')`:
    - Take from the camp is `rejected`, from the apron `accepted`.
    - Fit from the apron is `rejected`, from `LINE2_OLD_TRAIN` `accepted`.
    - The holder departs past the grace: the boiler is back on the pedestal.
    - `rail.call` from 20 m off a halt is `rejected`, on it `accepted`, again `noop`.
    - A restart mid-RUN keeps both rows, and `trainAlong` at the restored tick equals the pre-restart value.
    - The rail total equals `poured`.
  - `dev/peer-test/ws-railway.ts`: a `WS_LOAD_CHURN=train` row, modelled on the cart row. A room at `trains-on`, three
    tabs at 0/100/200 ms, the line-2 train placed by each tab's `T.railTrain(1)` over 60 s. Report the maximum spread
    between tabs (must stay under half a flatbed, 1.6 m) and the largest frame-to-frame jump past cruise.
- **Proofs.** `npm run check`. `(cd server && node --test test/railway-line-host.test.ts test/railway-away.test.ts)`.
  `npm run test:net` and `WS_LOAD_CHURN=train npm run load` through the broker. One seeded look:
  `npm run look -- --rail-seed q6-stocked --room b58a --eval dev/look/evals/railway-b5b8-at.ts --query 'b58at=q6'`
  shows the Q6 frame at Far Head and the rack full (the shelf-view and depot logs already draw from state; up to 24 logs
  shown until C). Open the PNG and say what it shows.
- **Done means.** All the above green. A seeded room loads at each new stage. `WORLD_NS` is bumped with its history
  line. No view file is changed.

**Codex brief (paste):**

> Build job A of docs/plans/line2-b5-b8.md on a branch from origin/main after codex/gated-fill has merged (if it
> hasn't, branch from its tip and say so): the boiler and train Server-kind state (new ECS components `boiler` and
> `train`, ops `rail.boilerTake/boilerDrop/boilerFit/call`), Q6 fed by the line-2 train's kit, the host's boiler grace and
> recovery, the adapter API, one WORLD_NS bump (the next free version), the test helpers, the six `--rail-seed` stages,
> the `railway-b5b8-at.ts` eval and the `WS_LOAD_CHURN=train` row. Read AGENTS.md, src/sim/AGENTS.md,
> src/world/AGENTS.md, server/AGENTS.md, docs/agents/room-safety.md ("Don't"), docs/agents/mixed-builds.md and
> docs/agents/lockstep.md first. Follow "The rules" and steps A1–A7 exactly; the numbers in "Facts checked in the tree"
> are computed from Place's layout, don't re-derive them. No effects in apply; no Math.random, wall clock or native
> trig in src/sim; every transfer is one atomic apply with a conservation test. Do not touch src/entities or
> dev/look/bots. Proofs: npm run check; the two server test files; npm run test:net and the train load row through the
> look broker; one seeded still of the Q6 rack (open the PNG and describe it). Commit with a short imperative message;
> don't push. Report what passed, what didn't, and anything in the plan that was wrong.

---

### Job B: halts, the trains and the old train (Local views)

**Files.** New `src/entities/railway/halts-view.ts`, new `src/entities/railway/train-view.ts`; edits to
`src/entities/railway/view.ts` (wiring hunks) and `src/entities/railway/cart-view.ts` (the retire hunk).

**Steps.**

- [ ] **B1. `halts-view.ts`**, `createRailwayHalts(adapter, owner)`. Port Place's `makeHalt` (halts.ts) to take an
  `OwnedView`: `dropSet(boxes, …, owner)`, colliders through `addStatic(…, owner)`, ramps, arm and board added to
  `owner`. Keep the geometry, the colours, the trapped-player displacement and `onIt`. Build all five from Place's
  `HALTS` and `LINKS` lines; `LINE_HALTS` is the server's copy, and A's test keeps them equal.
  - **Show.** Hidden while `!line2.trains`. On the live false→true edge, drop the pieces as Place's `build(0.3 + n·0.3)`
    does, and add colliders. On restore or late join, snap them.
  - **Call.** Each fixed step, run the call rule from "The halt call rule": the edge detector with the 0.4 m exit
    margin, skipped while `carry.on` is a train car (from `train-view`'s `isTrain(platform)`). On entry it calls
    `adapter.callTrain(k)` once. The signal arm and board follow `trainEtaTicks` for that halt's line on every tab
    (`signal(eta)`: the arm drops and `clank` sounds on the edge, the board shows `${eta} s`).
  - `inspect()`: `halts`.
- [ ] **B2. `train-view.ts`**, `createRailwayTrains(adapter, owner, seats)`. Two trains of three cars each
  (`rail.makeCar` with LOCO and two TRAILERs at +3.7/0/−3.7 m, the kit look `trainLook(2)` when `LOOK.kit`, else
  `wagonLook(2, false, owner)`), posed with `rail.poseCarOnLine(car, line, s + off, 1)` from `trainAlong(row, k,
  clock)`. The clock is cart-view's local fixed-step clock leaning on `adapter.tickNow()`. Platforms are
  `railway:train0-{car}` and `railway:train1-{car}`, `shared = true`, with `speedLimit` = 1.5 × cruise (30 m/s).
  Register two seats on each passenger car through `seats.registerSeat` (Place rail.ts 1330–1340, as stools after
  `seat-stool`).
  - **The old train** is line 1's train before trains are on: parked at the camp stop, rust `rustTrainU = 1`, with an
    empty brass saddle on the loco matching the boiler's two bands (owner, 5 November). Line 2's train is hidden under
    the land (`y = −60`) until trains are on.
  - **The wake.** A `Waker` over line 1's cars (Place's `waker` object, rail.ts 1424–1440) passed to
    `createWakePresentation(waker, owner, { fanfare, dustRing })`. On the live `rail.boilerFit` accepted event:
    `wake.start()`, rust to 0, whistle, then line 2's train appears at the village. The sim holds departures for
    `TRAIN.wakeTicks`, and the wake must fit in 6 s. On restore with trains on: `wake.reset(elapsedSeconds)`, no sound.
  - **Kit crates aboard** line 2's last trailer: `proto/net/crates.ts` `deck(frame)` and `putCrate(deck, k, 'fill')`,
    `ceil((logs + rails) / 8)` crates, redrawn when the row's load changes. The solid load comes from Place's
    `solidTrainLoad(car, deck)` (train-load.ts).
  - **The unload.** On the row's live STAND-at-Far-Head edge with a load that had something aboard, the crates hop off
    (`hopOff`) to C's rack position (`line2.depotPlace(5)`, already exported). Count the pieces in flight in
    `trainFlying()`.
  - **Smoke and sounds**: chimney puffs by speed (Place rail.ts 1355–1385), `whistle` on departure. All Local.
  - `isTrain(platform)`, `inspect()`: `trains`, `oldTrain`.
- [ ] **B3. Retire the cart.** In `cart-view.ts`'s `step()`: when `line2.trains && cart.phase === CART_PHASE.REST`, set
  `car.y = −60` (no deck to stand on, no collider), hide the call handle and the tag, and mark it shown false. This is
  Place's "Trains retire it to its shed".
- [ ] **B4. Wire into `view.ts`.** Create the halts and trains after the cart, and call `update`, `restore`, `accepted`,
  `targets` and `inspect` alongside the cart's. Change `line2.holdDepot(cart.flying)` and `shelf.holdRails(cart.flying)`
  to sum `cart.flying()` and `trains.trainFlying()`. Free geometries and materials with the owner.
- **Proofs** (seeded, a few minutes each; open every PNG and name what it shows):
  - The village halt before and after (the parent plan's B5 proof): `--rail-seed q5-done --eval
    dev/look/evals/railway-b5b8-at.ts --query 'b58at=village'` (no platform), then `--rail-seed trains-on` with
    `b58at=village` (platform, roof, bench, signal).
  - The wake: `--rail-seed boiler-camp --query 'b58at=camp' --video --seconds 10`, with an `--action` that calls
    `adapter.shoulderBoiler(rev)` then `adapter.fitBoiler(rev)` (C's prompts aren't needed for this proof). It shows rust
    lifting, steam, the whistle, and the halts dropping in view.
  - A call: `--rail-seed trains-on --query 'b58at=head' --video --seconds 40`. Standing on the Far Head halt, the
    signal drops, the board counts down and line 2's train arrives (kit crates aboard) and unloads onto the rack.
  - A real-time ride from the village halt to Far Head as a rider (`--video`): the rider stays aboard and the camera is
    steady.
  - `npm run level-check` (the halts stay straight; `dev/level/timber-track.ts` already checks `HALTS`).
  - `npm run perf` before (on the same base) and after, on a quiet machine. Report draw calls, triangles and frame ms
    at the village and on a moving train. The two trains and five halts should add at most about 12 draw calls.
  - `npm run check`.
- **Done means.** Every proof passed and was looked at. No change outside the four files. A reload of the `trains-on`
  seed plays no wake (a 5 s video).

**Codex brief (paste):**

> Build job B of docs/plans/line2-b5-b8.md on a branch from origin/main (job A, codex/depot-rack-carry and
> codex/seat-stool are merged): the Local views for the five halts, the two trains and the old train at the camp, the
> wake, the kit crates and their unload, and the cart's retirement when trains start. Read AGENTS.md,
> src/entities/AGENTS.md, .claude/rules/state-consumers.md, docs/agents/room-safety.md ("Don't"),
> docs/agents/verification.md and the look skill. Follow B1–B4 and keep the pinned names. The trains' pose comes only
> from `trainAlong` and `adapter.tickNow()`, like cart-view. Effects play only on accepted events or live edges, never
> on restore. The call is `adapter.callTrain`, sent on entering a halt and never while you ride a train. Touch only
> halts-view.ts, train-view.ts, view.ts and cart-view.ts. Use the `--rail-seed` looks for every proof; don't run the
> full playthrough. Run npm run perf before and after. Commit; don't push. Report each still or video and what you saw.

---

### Job C: the boiler, Q6's rack and the pier (Local views)

**Files.** New `src/entities/railway/boiler-view.ts`, new `src/entities/railway/pier-view.ts`; edits to
`src/entities/railway/line2-view.ts` (wiring hunks and the Q6 rack) and `src/player/cargo-drop.ts` (`bindBigDrop`).

**Steps.**

- [ ] **C1. `boiler-view.ts`**, `createRailwayBoiler(adapter, owner, deps)`, where `deps` = `{ land, props, carry,
  sounds, pieces }` passed from line2-view (no new Place imports at module scope).
  - **The pedestal** at `LINE2_BOILER` (Place `props.makeProp('pedestal')`, collider cylinder rTop 1.15, rBottom 1.3,
    h 0.6). It shows from Q5 completion.
  - **The boiler**: Place's `boilerShape()` (chop.ts). On the pedestal with gold motes while `pedestal` (props.ts
    170–195). At `(x, y, z)` while `ground`. Hidden while `fitted` or `none`.
  - **Worn**: for the `holder`'s avatar (you or a remote, by pid as line-cargo's `avatarOf` does), its own
    `makeCarryModels()` with `setCargo('boiler', 1, …)` on the avatar's load frame. No presence field: the holder is
    replicated state.
  - **Targets.** `railway-boiler` (**Shoulder the boiler**) within 3.6 m when `pedestal`/`ground`, your back empty and
    no beam held; it runs `adapter.shoulderBoiler(revision)`. `railway-boiler-fit` (**Fit the boiler**) when you hold it
    and are within 7 m of `LINE2_OLD_TRAIN`; it runs `adapter.fitBoiler(revision)`. The prompt sits over the loco's
    saddle.
  - **Drop**: `bindBigDrop(() => boiler.drop())`. While you hold the boiler, drop 2.7 m in front of you at `land.H`
    (line-cargo `drop()`'s maths) through `adapter.dropBoiler`. The touch Drop button stays visible while you hold it,
    following whatever rule shows it for the beam.
  - `accepted(e)`: `rail.boilerTake` plays `thump` and dust at the pedestal; `rail.boilerFit` plays a `clank` at the
    saddle. `corrected(e)`: nothing to return (not predicted). `restore()`, `update(dt)`, `inspect()` → `boiler`.
- [ ] **C2. `cargo-drop.ts`**: add `bindBigDrop(drop)`, a second slot the `place-drop` action tries first
  (`down: () => { if (bigDrop?.()) return; activeDrop?.(); }`), returning its unbinder. No new action.
- [ ] **C3. Q6's rack in `line2-view.ts`.** `depotLogs = logStackMesh(32, …)` and `drawDepot` caps at 32. In
  `depotPlace(k)`, a `feed: 'train'` stretch stands its rack on Far Head's ground: use `fromCm / 100 − 8` along the line
  instead of `+ 5`, and check in the still that `land.H` at the rack is above the sea and within the take prompt's
  reach of the frame. The auto-unload gate line (as gated-fill leaves it) needs no change for Q6, which has no gate.
  `inspect()` gains `q6Rack`. Q6's frame is built by the existing `quarry.stations.slice(0, LINE2_STATIONS.length)`, and
  its 64 pairs lay through the existing panel view.
- [ ] **C4. `pier-view.ts`**, `createRailwayPier(owner, deps)`, modelled on `far-head-view.ts`. Rockets (pooled
  `emit`) at the pier end (s = 739, `rail.besideLine` + `ORIGIN`) and over the village, `fanfare(true)` and two
  `whistle`s, only on the live 0→1 edge of `stations[5].completion`. Snapped on restore, with no show on a reload. There
  is no banner, pull-out or shake (as at Far Head; see "For the owner"). `inspect()` → `pier`.
- [ ] **C5. Wire into `line2-view.ts`** in new hunks, after the Far Head block: create both, then call `update`,
  `accepted`/`corrected` (before the `rail.deposit` early return), `restore`, `targets` (appended to `out`) and
  `inspect` (spread into line2's). Free them with line2's. Update the file's header comment (Q1–Q6, the boiler, the
  pier).
- **Proofs** (seeded; open every PNG):
  - `--rail-seed boiler --query 'b58at=apron'`: the boiler on its pedestal with motes; Interact shows **Shoulder the
    boiler**. An `--action` presses Interact: a still with the boiler on Buddy's back.
  - `--rail-seed boiler-camp --query 'b58at=camp'` with an `--action` that presses Interact twice (shoulder, fit): the
    **Fit the boiler** prompt over the saddle, then `line2.trains` true in the eval's output.
  - A drop: shoulder at the apron, press `place-drop` (an `--action`): the boiler lies 2.7 m ahead and its revision
    moved.
  - `--rail-seed q6-stocked --query 'b58at=q6'`: the Q6 frame with 32 logs on the rack and 32 rails on the shelf, on dry
    ground.
  - `--rail-seed q6-finishing --query 'b58at=pier' --video --seconds 12`: the last pairs lay and rockets fly over the
    pier.
  - `--rail-seed q6-done --query 'b58at=pier&greybox=sickle'`: the still **from the pier toward Ring Island**, which
    the parent plan asks for.
  - `npm run check`.
- **Done means.** Every proof passed and was looked at. No change outside the four files. A reload of `q6-done` plays
  no rockets (a 5 s video).

**Codex brief (paste):**

> Build job C of docs/plans/line2-b5-b8.md on a branch from origin/main (job A and codex/depot-rack-carry are merged):
> the Local views for the boiler (pedestal, carried, dropped, the fit at the old train), the `bindBigDrop` slot on the
> existing Drop action, Q6's rack at Far Head and the pier's rockets. Read AGENTS.md, src/entities/AGENTS.md,
> .claude/rules/state-consumers.md, docs/agents/room-safety.md ("Don't"), docs/agents/verification.md and the look skill.
> Follow C1–C5 and keep the pinned names (`railway-boiler`, `railway-boiler-fit`; inspect `boiler`, `q6Rack`, `pier`).
> Effects play only on accepted events or the live Q6 completion edge, never on restore. Touch only boiler-view.ts,
> pier-view.ts, new hunks of line2-view.ts and cargo-drop.ts; don't touch line-cargo.ts, view.ts or cart-view.ts (job B
> owns them). Use the `--rail-seed` looks for every proof, including the pier still toward Ring Island under
> `greybox=sickle`; don't run the full playthrough. Commit; don't push. Report each still and what you saw.

---

### Job D: the bot from Far Head to the pier, and the record (B8)

**Files.** `dev/look/bots/railway.ts`, `dev/look/evals/railway-photo.ts`, new `dev/look/evals/railway-b5b8-bot.ts`,
`docs/game-design/place.md`, `docs/plans/line2-part2-greybox.md`, `docs/plans/production-core.md` (slice 4 notes),
`src/proto/greybox/README.md`.

**Steps.**

- [ ] **D1. The segment** `boilerToPier({ bot, checkpoint, walkQuarry })`, exported and called after `seaToFarHead` in
  the solo flow:
  - Walk home along the laid track (`walkQuarry(546, 10)`, then the existing home helpers) to `read().line2View.boiler`.
    `bot.use(x, z, 'shoulder the boiler', /^Shoulder the boiler$/)` → `checkpoint('boiler')`.
  - Walk to the camp by line 1's track (the existing path-home route, reversed), then `bot.use(…, /^Fit the boiler$/)`.
    Wait for `line2.trains` → `checkpoint('TRAINS')`.
  - Step onto the Camp halt (`read().railwayView.halts[1]`), wait for `calling` → `checkpoint('train called')`. Hop
    onto the passenger car (a TRAILER top is 0.7 m) and ride to the village, requiring `riding` all the way →
    `checkpoint('train ride')`.
  - Walk to the line-2 village halt and ride to Far Head while the kit is aboard. Wait for `line2.depot === 32 &&
    depotRails === 32` → `checkpoint('Q6 stocked')`.
  - Carry it into Q6 with the existing `cartBrings`/`takeRails`/`deliver` loop (32/32, a back of 16) →
    `checkpoint('Q6 funded')`. Wait for completion → `checkpoint('Q6 laid')`.
  - `walkQuarry(546, 739)` (it requires support every 3 m, which proves the pier deck) → `checkpoint('pier')`.

  The friend's (`second`) branch waits for `stations[5].completion` and checkpoints `Q6 laid` after `Q5 laid`. Its
  finish text becomes "line two observed to the pier". The checkpoints before `Far Head` are unchanged.
- [ ] **D2. Start from a seed.** `dev/look/evals/railway-b5b8-bot.ts`, modelled on `railway-b4-bot.ts` (no teleport, no
  direct op, no recovery). With `railFrom=boiler`, start from `--rail-seed q5-done` at the village, where players spawn
  by the apron. With `railFrom=q6`, start from `--rail-seed trains-on` at the village and skip to the line-2 ride.
  `railStop` ends a half at a named checkpoint.
- [ ] **D3. Frames** in `railway-photo.ts`: `'boiler'` (the apron, the boiler on a back), `'TRAINS'` (from the camp
  halt as the halts drop), `'Q6 laid'` (Far Head looking out along the pier), `'pier'` (from the pier end north toward
  Ring Island, with `greybox=sickle` in the query).
- [ ] **D4. Record.** In the parent plan, tick B5–B8 with *Built 8 November (B5–B8)* notes: departures (the call at the
  next decision, no express, the boiler back to the pedestal when its holder leaves, no train away credit, no pier
  banner), checkpoint times, stills and the `WORLD_NS` version, plus "not tested on a device". In `place.md`, add a short
  "Production boiler, trains and the pier (8 November 2026)" section after the Q5 one: the boiler, the wake, the halts
  and the call rule, the two lines at 20 m/s, the kit's path and conservation, Q6 and the pier show. In
  `production-core.md`'s slice 4 notes, record that line 2 part 2 is complete through the pier. In the greybox README,
  note that the pier still uses `greybox=sickle`. Then stop for the owner's playtest (owner-calls).
- **Proofs.**
  - `npm run check`.
  - `npm run look -- --rail-seed q5-done --room b58d --eval dev/look/evals/railway-b5b8-bot.ts --query
    'shot=play&railFrom=boiler&railStop=TRAINS'` (passes `boiler`, `TRAINS`).
  - The same with `--rail-seed trains-on` and `railFrom=q6&railStop=pier` (passes `train called`, `train ride`,
    `Q6 stocked`, `Q6 funded`, `Q6 laid`, `pier`; no recovery).
  - Stills at the four new frames, opened. Not the full playthrough: that is the final pass.
- **Done means.** Both seeded halves pass with no recovery. The diff shows the checkpoints before `Far Head` unchanged.
  The docs are updated.

**Codex brief (paste):**

> Build job D of docs/plans/line2-b5-b8.md on a branch from origin/main (jobs A, B and C are merged): extend the
> production railway bot past Far Head through the boiler, the fit, a halt call and two train rides, the Q6 kit and
> the pier, with checkpoints `boiler`, `TRAINS`, `train called`, `train ride`, `Q6 stocked`, `Q6 funded`, `Q6 laid`,
> `pier`. Also add the seeded eval, four photo frames and the docs record (B8). Read AGENTS.md,
> docs/agents/verification.md and the look skill. Follow D1–D4 and read the pinned inspect names from A, B and C. Don't
> change any route before `Far Head`. The proofs are the two seeded half-runs and four stills; do not run
> `playthrough --long` (the orchestrator does that once). Commit; don't push. Report checkpoint times, any recovery, and
> what each still shows.

---

### Final pass (orchestrator, once)

`npm run playthrough -- --long --eval dev/look/evals/railway-job.ts --query 'shot=play'` on main with A–D and the
8 November fixes merged. It must pass every checkpoint through `pier` with no errors. Then write the playtest guide
(today's fixes plus B5–B8: what to try, what to look for, including the two train rides and the call) and stop all
development until the owner has played.

## Bot checkpoints added

`boiler`, `TRAINS`, `train called`, `train ride`, `Q6 stocked`, `Q6 funded`, `Q6 laid`, `pier`. The friend adds
`Q6 laid`.

## Risks

- **Room safety ("Don't").** No effects in apply. The wake, halt drop, crate hops, signal clank and rockets play from
  accepted events or live edges, never from a rebuild, reload or late join. There is no `Math.random`, wall clock or
  native trig in `src/sim/railway-train.ts`; the pose maths is + − × ÷ and `Math.sqrt`, in whole cm. Every move is
  judged from the actor's own position, never from where the client says the boiler or halt is. A malformed `boiler` or
  `train` row in a save fails the load check atomically (A7). Riding presence is the existing platform carry, cleared
  when you get off; there is no new presence field.
- **Conservation** (production-core's stop condition). The train adds a fourth place a log or rail can sit. Rails only
  leave the forge rack (`shelfOut` capped at Q6's bill), logs are minted once up to the bill (`out5`), and the unload is
  one apply. A7 checks the totals every tick from `trains-on` to `q6-stocked` and across a snapshot mid-trip.
- **Moving platforms.** The pose comes from the server's row and each tab's tick estimate, as the cart's does. At
  20 m/s a 100 ms tick error is 2 m, so the view's clock must lean on `tickNow()` the way cart-view's does, never snap
  per frame. A's load row measures the spread between tabs. B's ride video and D's `train ride` checkpoint prove a rider
  stays aboard.
- **The cart on line 1.** A resting cart sits on line 1's track at s = 196. The sim holds line 1's first departure
  until the cart rests, and B hides it then. If a seed or old world has the cart elsewhere, the train waits; it never
  drives through.
- **The machine at Far Head.** It parks at the end of laid track (s ≥ 546) and then lays Q6 outward. The Far Head stop
  (524) is clear. B's call video checks that the train and machine don't touch.
- **Mixed builds.** One `WORLD_NS` bump in A's commit (new kinds, new fields, a sixth slot). The new ops are additive,
  with no compatibility code. Between A and B/C merging, a room past Q5 has an invisible boiler (nobody can get that far
  in the hours between, after the reset).
- **Hotspots.** `railway-systems.ts` and the adapter are A's alone, and A waits for gated-fill. New logic lives in new
  files. `rail-seed.ts` is edited by five branches; every edit is an additive stage, so rebase rather than redesign.
- **Performance.** Two three-car trains, five halts (about 25 instanced boxes each) and up to 8 crates. B measures
  `npm run perf` before and after. The train tick is two rows and a few comparisons a tick; check the server ms per
  step in A's load row.
- **The speed ladder** (20 → 25 → 30 → 40 m/s) is not built: `TRAIN` is a constant now, as `CART` is. Making it a
  tunable needs the train row to pin speed per leg; leave that to the Roundhouse.

## For the owner

Nothing blocks the build. These are small calls the orchestrator ships as picks; edit any of them:

1. **No banner, pull-out or shake at the pier** ("Thanks for playing!" in Place), matching Far Head's show without its
   banner. The rockets and the view toward Ring Island are the payoff.
2. **A call while the train runs takes effect at its next stop** (Place brakes and turns back mid-leg). It waits at most
   one leg longer (about 23 s on line 2).
3. **No express run with a rider aboard** (Place runs straight to the end of the line). The line-2 train stops at the
   quarry for 5 s on the way to Far Head.
4. **The boiler goes back to its pedestal if its carrier leaves**, as the parent plan says, rather than down where they
   stood as the beam does.

The owner's next action is the playtest, once the final pass is green and the guide is published.
