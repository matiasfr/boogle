# Plan: line 2 part 2, B4 (Q5, the sea gate, Far Head)

Prepared 8 November 2026 against `origin/main` `da6a4613`, for Codex gpt-6.1-sol tonight. Planning only; no code
changed. Parent plan: [line2-part2-greybox](line2-part2-greybox.md), step B4 and its Risks. Binding calls (decision log,
2026-11-08): **the hook shot comes into the game** (the sea switch stays on Needle Bell's summit, reached by hook pulls);
**playtest checkpoint: pause after the hook shot and Q5** (once both are on main and verified, development stops fully
until the owner has played; the orchestrator publishes a playtest guide first); **the cart may shove you** (the depot
cart stays solid); **train lines run low and bend** and world scale unchanged (nothing in B4 changes either).

## Goal

**8 November owner playtest correction (gated-fill):** supersedes the deposit-gate requirements below.
Q4/Q5 accept both logs and rails while gated, from hand carries and the depot shelf/rack. The bill stays stocked
with no allocation or laying until the quarry lever / summit switch is pulled. A full bill funds on the pull;
an incomplete bill funds on its last deposit after the pull. Full waiting frames show counters, physical stock
and “Pull the lever / switch to start”, with no “More coming” tag over a full bill. Auto-unload retries both materials every update while in reach, paced
by the existing unload cadence; no carry-change or drop/pickup requirement. Funding remains Server kind;
prediction retains stock until confirmation, including shelf/cart rails returned by funding. `depotNeed` already
subtracts frame stock, rack and aboard cargo, so requires no change. No wire/save shape or WORLD_NS change.
Proofs cover gated partial/full reloads, conservation, pull-first and deposit-first ordering, prediction/replication,
host restart, and seeded Q4/Q5 looks with real pickup/unload inputs.

The line-2 arc reaches Far Head: with Q4 laid, you hook-climb Needle Bell, pull the sea switch on the summit, the sea
gate drops, the cart brings Q5's logs and rails, you fund Q5 and the machine lays the 260 m trestle to Far Head, which
greets you with lamps along the trestle and rockets. This is the last beat before the owner's playtest. Serves DESIGN
**Telegraph everything** (the gate slab, and the light that runs from the switch to the gate), **Show, don't tell** (no
banner; the trestle and lamps are the payoff), **Enjoyable alone and together** and **Clear authority**. It bends nothing.

## Facts checked in the tree (8 Nov)

- **Q5 catalog row.** Place `layout.ts` `LINKS[1]` Q5: s 286 → 546 (`EAST.rim`/`EAST.head`), 24 logs / 24 rails, speed 9
  (Q4's 8 is production 160, so 9 is **180**), `rack: 'cart'`, `crate: true`, `gate: 'sea'`. The frame from
  `frameBesideLine` is **(116668, −2831) world cm** (Q4's computed the same way is (108147, 3073), which matches the
  catalog). Production Q5: `bill [24, 24]`, `fromCm 28600`, `toCm 54600`, `panels 24`, `crate true`, `speed 180`,
  `depot true`, `shelf true`, `gate 'sea'`, `beam 0`. `line2Panels` gives **96** rail pairs (2.71 m each, inside the
  test's 2.30-3.38 m bound). Schedule at `LINE_TIMING`: depositTicks 4, feedTicks 39, layTicks 527, **totalTicks 570**.
- **The switch.** Place `tech-layout.ts` `SEA_SWITCH = {x: 11.8, z: −6, y: 102.4}` (local), so **world cm
  (101180, −600, 10240)**. It stands on the summit deck (`PADS` `summit`: local (15, −6), hx 5, hz 4, top 102.4, wood),
  3.2 m west of the deck's hook landing. Place offers it when within 3 m horizontally and 2.2 m vertically.
- **The gate.** `tech.GATES.sea = slabAt(297)` (local (181.1, −29.3), y 24, yaw 2.212). Beyond the Q5 frame and depot
  rack (rack stop `CART_ROAD.rackCm(4)` = 46900 cm on the road, 273 m along line 2, on Q4's laid track before the rim).
- **State today.** `rail` has `lever`, `hook`, `out0`-`out3`, `pack`, `depotRails`, `shelfOut`
  (`src/sim/railway-world.ts`). `DEPOT_OUT = ['out0'..'out3']` throws unless its length equals `LINE2_STATIONS.length`.
  The deposit gate is hard-coded in `rail.deposit2` (`spec.gate === 'quarry' && !rail.lever`, railway-systems.ts
  ~452) and the client's auto-unload (`line2-view.ts` ~916). `WORLD_NS = 'v19'`.
- **Cart.** `CART.rails` is 16, so Q5's 24 rails take two cart trips (or a hand carry from the forge). `CART_ROAD`
  and the cart invariant's road bound (`rackCm(LINE2_STATIONS.length - 1)`) extend on their own.
- **Trestle.** Place's `rail.buildTrack(quarry, …, 'panels')` already builds the whole quarry line, trestle bents and
  deck included; line2-view shows it as stretches lay. Adding Q5 to `LINE2_STATIONS` makes the machine lay it. **No new
  trestle mesh**: B4 verifies it (walkable, solid, looks right) rather than building one.
- **Hook branch** (`codex/hook-shot-impl`, `../boogle-codex/hook-shot-impl`, not merged). Adds the summit deck and its
  collider tiles in `hook-view.ts` (from `tech.PADS`), rings, the pull (Owner), `railwayHook` presence, bot checkpoint
  `needle bell summit` (climb `p2, t0…t5, summit` inside `dev/look/bots/railway.ts`) and its return routes. It edits
  `src/entities/railway/{line2-view (2 hunks: the constructor's `hookShown` arg ~l.34, the hook reveal ~l.564),
  view, state}.ts`, `dev/look/bot.ts`, `dev/look/bots/railway.ts` (+313 lines), `dev/codex/see.ts` (the warp lines
  ~43-50), `docs/game-design/place.md` (new section after l.394) and line 157 of the parent plan. It adds no op or
  state. Without it the summit has no deck, so nobody can stand at the switch.
- **In flight elsewhere.** `codex/save-reset` (world-version-and-save-reset) makes a `WORLD_NS` bump reset players'
  local progress; B4's v20 bump will trigger it, as the owner asked ("a world wipe is a new save"). No overlap in files.

## Design: sync kind and ownership

| State / piece | Kind | Authority | API |
| --- | --- | --- | --- |
| Q5 bill, funding, laying | Server | server applies, replicates `qjob` slot 4 | existing `rail.deposit`, `rail.depotTake`, `rail.depotRailTake` |
| Sea gate (`sea` bool on `rail`) | Server | server; your press predicted with the same rule | new `rail.seaSwitch` (idempotent; needs Q4 complete) |
| Q5 depot output (`out4` int on `rail`) | Server | `rail.cartTick` only | existing cart transfers |
| Sea gate slab, switch drum, light posts | Local | from accepted `sea`; animation on `onAccepted`/`onCorrected` | `src/entities/railway/sea-gate-view.ts` |
| Trestle (track pieces) | Local | from accepted Q5 laying (existing machine/panel view) | unchanged `line2-view.ts` |
| Far Head lamps and rockets | Local | lamps from Q5 `completion`; rockets on the live 0→1 edge only, never on rebuild, reload or late join | `src/entities/railway/far-head-view.ts` |
| Climbing, standing on the deck/trestle | Owner | your body (hook branch) | position presence; nothing new |

No lockstep ops, no presence fields, no new component kind. Controls: the switch is an Interact target (`id
'railway-sea-switch'`, verb `Pull`) through the existing `targets()`; no action id, pad slot, key, touch button or guide
row.

**Rules.** `rail.seaSwitch`: returns 0 unless `qCompleted(w) >= 4` and `!rail.sea`; else sets `sea = true`, returns 1.
Server range check `railValid`: `height(LINE2_SEA.y) && near(LINE2_SEA.x, LINE2_SEA.z, 320)`. Deposits into a gated
stretch need its gate down: `quarry` → `rail.lever`, `sea` → `rail.sea`. The cart serves Q5 as soon as Q4 completes,
gate up or not (as it does Q4 behind the quarry gate): logs and rails wait on the rack and shelf.

**Invariants** (`validateRailLine2`): `if (l.sea && line2Completed(s) < 4) throw 'railway: sea before Q4'`;
`depotOut` length 5 (existing check).

**WORLD_NS v20**, in job A's commit, with the history line:
`// v20 (2026-11-08): line 2 part 2, B4: Q5 joins line two (a fifth qjob slot) behind the sea gate; new rail fields
`sea` and `out4`; `rail.seaSwitch`.`

## Jobs and their order

```
now ──► A (rules + seeds) ──► B (views) ─────────────┐
now ──► hook-shot-impl merges ────────────────────────┼─► C (bot + docs) ─► final pass ─► playtest guide, stop
                              (C's code can start once A and the hook branch are merged; its proofs need B)
```

- **A starts now on `origin/main`, in parallel with the hook branch.** Shared file: `line2-view.ts`, one line (~916)
  far from the hook branch's two hunks; `dev/codex/see.ts`, a hunk away from the hook's warp lines. Whichever merges
  second rebases; expect no conflict.
- **B starts when A is merged** (it needs `sea`, `pullSeaSwitch` and the seeds). It does not need the hook branch to
  build, and touches none of its files except `line2-view.ts` (new hunks, not its two). Its "stand at the switch" look
  needs the summit deck, so run that one proof after the hook branch merges (rebase first).
- **C waits for A and the hook branch to merge** (it edits `dev/look/bots/railway.ts`, `place.md` and the parent plan,
  all heavily touched by the hook branch). B and C share no files, so C's code can be written in parallel with B against
  the names pinned below; C's proofs run once B is merged.
- **Final pass** (orchestrator, once, after C): `npm run playthrough -- --long --eval dev/look/evals/railway-job.ts
  --query 'shot=play'`. Then the playtest guide and the full stop.

Pinned names B provides and C reads (do not rename): interactable `railway-sea-switch`; `line2.inspect()` gains
`sea: { x, y, z, pulled }` (the switch, metres), `seaGateSolid: boolean`, `farHead: { x, y, z }` (the line's end at
s = 546, metres), `trestleLamps: number` (lamps placed); all reach the bot as `read().line2View.*` through the existing
spread in `view.ts`.

---

### Job A: rules, server, WORLD_NS v20 and look seeds

**Files.** `src/sim/railway-line2-layout.ts`, `src/sim/railway-line2.ts`, `src/sim/railway-world.ts`,
`src/sim/railway-systems.ts`, `src/sim/railway.ts` (comment), `src/world/railway-server.ts`,
`src/world/railway-predict.ts`, `src/world/namespace.ts`, `src/adapters/railway.ts`, `src/entities/railway/line2-view.ts`
(one line), `dev/peer-test/ws-page.ts`, `dev/spikes/ecs/railway-diff.ts`, `test/helpers/railway-q2.ts`,
`test/railway-line2.test.ts`, `test/railway-line.test.ts`, `test/railway-cart.test.ts` (only if a count changes),
`test/railway-replicate.test.ts`, `server/test/railway-line-host.test.ts`; new `dev/look/rail-seed.ts`, edits to
`dev/look/look.ts` and `dev/codex/see.ts`.

**Steps.**

- [ ] **A1. Catalog.** In `railway-line2-layout.ts`: widen `Line2StationId` to `'Q1'…'Q5'` and `gate?: 'quarry' |
  'sea'`; append the Q5 row from "Facts"; add `export const LINE2_SEA = { x: 101180, z: -600, y: 10240 } as const;`
  with a comment naming Place `tech-layout.ts` `SEA_SWITCH` and the summit deck; change the header's "Q5 onward is not
  promoted yet" to "Q6 onward". Update `line2Completed`'s comment to 0-5.
- [ ] **A2. State.** `railway-world.ts`: add `out4: 'int'` and `sea: 'bool'` to `Rail`; `DEPOT_OUT` gains `'out4'`;
  `railwayView` and `fillRailway` copy `sea` (next to `lever`, ~l.309 and ~l.382). `railway-line2.ts`: `sea: boolean`
  on `RailLine2`; `export const line2SeaOpen = (s: Railway) => line2Completed(s) >= 4 && !!s.line2?.sea;` and
  `export const line2GateDown = (s: Railway, k: number) => { const g = LINE2_STATIONS[k]?.gate; return !g || (g ===
  'quarry' ? line2GateOpen(s) : line2SeaOpen(s)); }`; the invariant above.
- [ ] **A3. Systems.** `railway-systems.ts`: in `rail.deposit2` replace the quarry-only check with a `gateDown(w, spec)`
  helper (quarry → `rail.lever`, sea → `rail.sea`) and update the comment; add `const seaSwitch =
  defineSystem('rail.seaSwitch', { reads: [QJob], writes: [Rail], phase: 'act', order: 28 }, …)` mirroring `lever`
  with `qCompleted(w) < 4`; add `'rail.seaSwitch': [seaSwitch]` to `OPS`.
- [ ] **A4. Server, prediction, adapter.** `railway-server.ts`: `'rail.seaSwitch'` in `RAIL_ACTIONS`, and the
  `railValid` case above (import `LINE2_SEA`). `railway-predict.ts`: add to `RAIL_PREDICTED`. `adapters/railway.ts`:
  add the op to the `RailwayIntent` union, `intentOf`, `holds` (`!!s.line2?.sea`) and `NOT_MATERIAL`; inspect's `line2`
  gains `sea: l2.sea` and `seaOpen: line2SeaOpen(s)`; the API gains `pullSeaSwitch: () => submit({ op:
  'rail.seaSwitch' })`. `line2-view.ts` ~916: `(spec.gate === 'quarry' && !l.lever)` becomes `(spec.gate === 'quarry'
  ? !l.gateOpen : spec.gate === 'sea' ? !l.seaOpen : false)` and the comment names both gates.
  `dev/peer-test/ws-page.ts`: `case 'rail.seaSwitch': return adapter.pullSeaSwitch();`.
  `dev/spikes/ecs/railway-diff.ts`: add `{ op: 'rail.seaSwitch' }` beside `rail.lever` in both op lists.
- [ ] **A5. WORLD_NS.** `namespace.ts`: `'v20'` and the history line above.
- [ ] **A6. Test helpers and seeds.** In `test/helpers/railway-q2.ts` export `railwayAtQ5(stage: 'q4-done' |
  'sea-open' | 'q5-stocked' | 'q5-finishing' | 'q5-done'): World` built on `railwayAtQ4()`: pull `rail.lever` and
  `rail.hook`, fill and finish Q4, clear backs (its existing `clear`), then per stage: `sea-open` acts `rail.seaSwitch`;
  `q5-stocked` also advances until the Q5 rack holds 24 logs and the shelf 16 rails; `q5-finishing` funds Q5 and
  advances to `totalTicks - 60` (6 s before the end, for the live Far Head show); `q5-done` finishes it. Each asserts
  `railwayInvariant(w.s) === null`.
  New `dev/look/rail-seed.ts`: `export async function writeRailSeed(dataDir: string, room: string, stage)` builds the
  world, then, exactly as `server/test/railway-line-host.test.ts` does, opens `createRailwayWorldHost({ roomId:
  railwayRoomId(room), store: createStore({ dataDir }), tick: false, now: () => Date.now(), pidOf: () => 'a' })`,
  steps it past `w.t`, loads the snapshot with `railwayCheck`, `touchAll()`, and closes with `{ save: true }` so the
  room's save file is in `dataDir` before any page opens the room. CLI: `node dev/look/rail-seed.ts <stage> --data-dir
  <dir> --room <name>`. `look.ts`: `--rail-seed <stage>` calls it on `stack.dataDir` before `Game.open` (local stacks
  only; error with `--url`). `see.ts`: accept and strip `--rail-seed <stage>`, call it on `stack.dataDir` before
  writing the request (the broker's allowlist is untouched). If the worker's `.look/see-client.ts` is a copy from the
  trusted checkout and does not pick this up, say so in the report: the director runs A's looks locally with
  `npm run look -- --rail-seed …`, and B and C get it through the broker after A merges.
- [ ] **A7. Tests.**
  - `test/railway-line2.test.ts`, new `'Q5: behind the sea gate; the switch needs Q4; two cart trips bring its rails,
    never minted'`: from `railwayAtQ5('q4-done')` with the gate up, `rail.deposit` to Q5 returns 0; the cart still
    serves Q5 (`depotOut[4]` up to 24, `depotRails` 16 then the second trip's 8); `rail.seaSwitch` returns 1 then 0;
    deposits go in; Q5 funds once; the shelf's leftovers return to the forge rack on funding; `railsHeld(w)` (rail
    conservation) after every transfer; `restore(w)` mid-way; after `finishQ(w, 4)`: `line2Completed` 5, `line2Active`
    −1. Before Q4 completes, `rail.seaSwitch` returns 0 and `sea` stays false. Update the Q4 test's last asserts
    (`line2Active` is now 4 after Q4, not −1; the station rail total adds Q5 only once it is funded).
  - Same file: `"the away credit runs Q5's cart too"` mirroring the Q4 one (`railResume`, once per marker).
  - Same file, malformed documents: `sea: true` with Q4 incomplete fails atomically.
  - `test/railway-line.test.ts`: panel counts `[12, 24, 24, 32, 96]`; the "machine view lays the same rail pairs" parity
    test now covers five stages (fix its comment).
  - `test/railway-replicate.test.ts`: a prediction case for `rail.seaSwitch` modelled on the lever's (predicted, then
    held when a friend pulled it first: no correction effect).
  - `server/test/railway-line-host.test.ts`, new `'line host: the sea switch judged at the summit; Q5 behind it; sea
    survives a restart'`: seeded from `railwayAtQ5('q4-done')`; `rail.seaSwitch` from the summit's foot `[101180, 2400,
    -600]` is `rejected`, from the Q5 frame `rejected`, from `[101180, 10240, -600]` `accepted`, again `noop`; a Q5
    deposit before the pull is `noop`, after it `accepted`; restart keeps `sea` and rail totals equal `poured`.
- **Proofs.** `npm run check`; `(cd server && node --test test/railway-line-host.test.ts test/railway-away.test.ts)`;
  `npm run test:net` (server and replication changed). One look: `npm run look -- --rail-seed q4-done --room b4a
  --eval dev/look/evals/railway-b4-at.ts --query 'b4at=q5'` (the eval is B's; for A, a `--cam` still is enough:
  `--cam 1150,34,-10 --look 1166,25,-28`): the Q5 frame stands at the rim, the cart has stocked its rack, the track
  stops at 286 m. Open the PNG and say what it shows.
- **Done means.** All of the above green; a seeded room loads with Q4 laid and Q5 active; `WORLD_NS` v20 with its
  history line; no view change except the one gate line.

**Codex brief (paste):**

> Build job A of docs/plans/line2-b4.md on a branch from origin/main: Q5 and the sea gate's rules (Server kind), the
> `rail.seaSwitch` op, WORLD_NS v20, the `railwayAtQ5` test helpers and the `--rail-seed` look seed. Read AGENTS.md,
> src/sim/AGENTS.md, src/world/AGENTS.md, server/AGENTS.md, docs/agents/room-safety.md ("Don't") and
> docs/agents/mixed-builds.md first. Follow steps A1-A7 exactly; the numbers in "Facts checked in the tree" are
> verified, don't re-derive them. No effects in apply, no Math.random/wall clock/native trig in src/sim. Do not touch
> src/entities/railway except the one line in A4, and do not touch dev/look/bots. Proofs: npm run check; the two server
> test files; npm run test:net; one seeded look still of the Q5 frame (open the PNG and describe it). Commit with a
> short imperative message; don't push. Report what passed, what didn't, and anything in the plan that was wrong.

---

### Job B: the sea gate, the switch, the trestle check and Far Head (Local views)

**Files.** New `src/entities/railway/sea-gate-view.ts`, new `src/entities/railway/far-head-view.ts`, new
`dev/look/evals/railway-b4-at.ts`; edits to `src/entities/railway/line2-view.ts` (wiring hunks only).

**Steps.**

- [ ] **B1. `sea-gate-view.ts`**, `export async function createRailwaySeaGate(adapter, owner, deps)` where `deps` is
  `{ layout, tech, land, shapes, flat, sounds, partMat, glow }` passed from line2-view (no new Place imports). Builds:
  - The sea gate at `tech.GATES.sea`: two jambs and the slab with its teal stripe, exactly the quarry gate's shapes
    (`SLAB` sizes, line2-view ~325-350), with a static collider while `!l.seaOpen`; drops on accepted
    `rail.seaSwitch` (`slabT = 0`, the same ease), snaps from state otherwise.
  - The switch at `LINE2_SEA` (metres): Place's drum and handle (`tech.ts` ~635-645, ~1037-1046) on the summit deck,
    no collider (it must not snag a hook landing). Handle angle follows `l.sea`.
  - The light posts `tech.POSTS` (14 dark stone posts from the sea gate toward the tower): one `InstancedMesh` of
    posts plus one of glow caps; caps dark until `l.sea`; on the accepted pull, a light runs post by post from the
    tower end to the gate over about 1.5 s; snapped lit when restored with `sea` already true.
  - `targets(p, l)`: when `!l.sea`, `|p.xz − switch| < 3`, `|p.y − 102.4| < 2.2` and Q4 is complete, push `{ id:
    'railway-sea-switch', verb: 'Pull', at: switch + (0, 1.7, 0), run: () => void adapter.pullSeaSwitch() }`; before Q4
    the same target clanks and does nothing (as the lever does before Q3).
  - `accepted(e)`: on `rail.seaSwitch`, `clank` at the switch, `whistle` at the gate, start the slab drop and the post
    light. `corrected(e)`: on `rail.seaSwitch`, `clank` and swing the handle back. `restore(l)`, `update(dt, l)`,
    `inspect()` returning `sea`, `seaGateSolid` (names pinned above).
- [ ] **B2. `far-head-view.ts`**, `createRailwayFarHead(owner, deps)`: lamps every 7 m on both sides of the trestle,
  s = 306 → 490 on `quarry.line` (Place `lamps.ts` `lightAll(1, 306, 490)`: 54 lamps), as two `InstancedMesh`es
  (posts `0.12 × 1.5 × 0.12` `#5c4530`, glow cubes 0.26 with the readable-unlit warm colour from `path.ts`) and one
  static thin box collider per post (`owner`-owned). Hidden until Q5's `completion`. Rockets: a small local queue
  driven by `update(dt)` that `emit`s (src/render/particles.ts) a rising spark then a burst (`Math.random` colours is
  fine here, it's a view): 10 at the line's end (s = 546, `rail.besideLine` + `ORIGIN`), 5 over the village
  (`layout.VILLAGE`), with `sounds.fanfare(true)` and two `whistle`s (0 s, 1.4 s), as Place's `headShow` minus the
  banner and shake. The show and the lamps' one-by-one light-up (0.09 s apart, from the rim outward) play only on the
  live 0→1 edge of `stations[4].completion` seen in `update`; `restore()` records the current value so a rebuild,
  reload or late join snaps the lamps on silently. `inspect()`: `farHead`, `trestleLamps`.
- [ ] **B3. Wire into `line2-view.ts`** in new hunks only (not the hook branch's): create both after the quarry gate
  block, call their `update` from `update(dt)`, `accepted`/`corrected` from the existing handlers (before the
  `rail.deposit` early return), `restore` from `restore()`, `targets()` appended to `out`, and spread their `inspect()`
  into line2's. Free their geometries and materials with line2's. Update the file's header comment.
- [ ] **B4. Trestle check.** No new trestle code unless a look shows a fault. Confirm with the seeds: the machine lays
  Q5's 96 pairs over the sea; the deck is solid end to end; the trestle's start meets Q4's end at the rim without a
  step; the cart (solid, may shove) never runs onto it. If the deck has a gap or a lip, fix it in the Place-derived
  track only if the fix is local to production (otherwise report it).
- [ ] **B5. `dev/look/evals/railway-b4-at.ts`**: waits for `inspectRailway()?.ready` and the seeded state (Q4
  complete), then `teleport`s (`src/physics/engine.ts`) to `b4at` = `q5` (beside the Q5 frame, facing the gate),
  `summit` (the deck's landing, (1015, 102.85, −6), facing the switch), `trestle` (s = 416, on the deck), `head` (s =
  540, facing back along the trestle), and frames the camera with `cam`. Throws if the seed did not load.
- **Proofs** (all seeded, each a few minutes; open every PNG and name what it shows):
  - `--rail-seed q4-done … --query 'b4at=q5'`: the gate slab up across the bed, the Q5 frame, the rack stocked.
  - After the hook branch merges: `--rail-seed q4-done … --query 'b4at=summit'` with an `--action` that presses
    Interact: the `Pull` prompt, then the light running down the posts; a second still from `b4at=q5` with
    `--rail-seed sea-open`: the slab down and no collider (`seaGateSolid` false in the eval's output).
  - `--rail-seed q5-finishing … --query 'b4at=head' --video --seconds 12`: the last pairs lay, rockets over Far Head,
    lamps light along the trestle from the rim.
  - `--rail-seed q5-done … --query 'b4at=trestle'` and `b4at=head`: the still **from Far Head back down the trestle**
    the parent plan asks for; the deck reads walkable at day.
  - `npm run perf` before (on `origin/main`) and after, on a quiet machine: report draw calls, triangles and frame ms
    for the line-2 pose; the lamps must add at most 2 draw calls (instanced).
  - `npm run check`.
- **Done means.** Every proof above passed and was looked at; no change outside the four files; the show never plays
  on a reload (check: reload the `q5-done` seed and confirm no rockets in a 5 s video).

**Codex brief (paste):**

> Build job B of docs/plans/line2-b4.md on a branch from origin/main (job A is merged): the Local views for the sea gate,
> the sea switch on Needle Bell's summit, the Far Head lamps and rockets, and the trestle check. Read AGENTS.md,
> src/entities/AGENTS.md, docs/agents/room-safety.md ("Don't"), docs/agents/verification.md and the look skill. Follow
> B1-B5; keep the pinned names (`railway-sea-switch`, inspect `sea`, `seaGateSolid`, `farHead`, `trestleLamps`). Effects
> only on onAccepted/onCorrected or the live completion edge, never in apply and never on restore. Touch only
> sea-gate-view.ts, far-head-view.ts, railway-b4-at.ts and new hunks of line2-view.ts (the hook-shot branch edits
> line2-view's constructor signature and hook reveal: leave those lines alone). Use `--rail-seed` looks for every
> proof; don't run the full playthrough. If codex/hook-shot-impl is not merged yet, do every proof except the summit
> one and say so. Run npm run perf before and after. Commit; don't push. Report each still and what you saw in it.

---

### Job C: the bot through Q5 to Far Head, and the record

**Files.** `dev/look/bots/railway.ts`, `dev/look/evals/railway-photo.ts`, new `dev/look/evals/railway-b4-bot.ts`,
`docs/game-design/place.md`, `docs/plans/line2-part2-greybox.md`.

**Steps.**

- [ ] **C1. Reuse the climb.** In `dev/look/bots/railway.ts` (as merged from the hook branch), lift its summit climb
  (the `for (const id of ['t1', … 'summit'])` loop and the p2 approach) and its return route into `climbNeedleBell()`
  and `downFromNeedleBell()`, with no behaviour change to the existing `needle bell summit` checkpoint.
- [ ] **C2. The B4 segment**, `seaToFarHead()`, called after `Q4 laid` in the solo flow: `climbNeedleBell()`; walk to
  `read().line2View.sea`; `bot.use(x, z, 'pull sea switch', /^Pull$/)`; wait for `line2.seaOpen` and `!seaGateSolid`;
  `checkpoint('sea gate')`; `downFromNeedleBell()`; back to the quarry (the existing `homeFromQuarry`/`viaTrack`
  helpers); stock Q5 from the depot rack and shelf with the existing `cartBrings`/`takeRails`/`deliver` loop (bills
  24/24; rails may also come by hand from the forge as in Q2-Q4); `checkpoint('Q5 funded')`; wait for completion,
  `checkpoint('Q5 laid')`; `walkQuarry(286, 546)` (it already requires support every 3 m, which proves the deck);
  `checkpoint('Far Head')`. The friend's (`second`) branch waits for `stations[4].completion` and checkpoints `Q5 laid`
  after `Q4 laid`, then finishes as now with its hashes; change its finish text to "line two observed to Q5".
- [ ] **C3. Start from a seed.** `dev/look/evals/railway-b4-bot.ts` runs `seaToFarHead()` (exported) directly on a
  seeded room: with `railFrom=sea` it starts from `q4-done` at the climb; with `railFrom=q5` from `q5-stocked` at the
  rack (skipping the climb), so each half fits a look's time limit.
- [ ] **C4. Frames** in `railway-photo.ts`: `'sea gate'` (from the summit's south-west, switch and gate in view),
  `'Q5 laid'` (from the rim over the trestle), `'Far Head'` (from Far Head back down the trestle).
- [ ] **C5. Record.** Parent plan: tick B4, add a *Built 8 November (B4)* note (departures, timings, stills, `WORLD_NS`
  v20, "not tested on a device"), and drop the hook branch's interim line under B4. `place.md`: a short "Production Q5,
  the sea gate and Far Head (8 November 2026)" section after the hook-climb one: what the switch does, the gate and
  posts, the cart's two rail trips, the lamps and rockets and when they play.
- **Proofs.** `npm run check`; `npm run look -- --rail-seed q4-done --room b4c --eval
  dev/look/evals/railway-b4-bot.ts --query 'shot=play&railFrom=sea&railStop=sea gate'` (passes `sea gate`); the same
  with `--rail-seed q5-stocked` and `railFrom=q5&railStop=Far Head` (passes `Q5 funded`, `Q5 laid`, `Far Head`, no
  recovery); stills at the three new frames, opened. Not the full playthrough: that is the final pass.
- **Done means.** Both seeded halves pass with no recovery; the existing checkpoints before `Q4 laid` are unchanged
  (diff review); docs updated.

**Codex brief (paste):**

> Build job C of docs/plans/line2-b4.md on a branch from origin/main (jobs A and B and codex/hook-shot-impl are
> merged): extend the production railway bot past Q4 through the hook climb, the sea switch, Q5 and the trestle walk to
> Far Head, with checkpoints `sea gate`, `Q5 funded`, `Q5 laid`, `Far Head`, plus the seeded eval and the docs
> record. Read AGENTS.md, docs/agents/verification.md and the look skill. Follow C1-C5; read the pinned inspect names
> from B. Refactor the hook climb without changing the `needle bell summit` route. Proofs are the two seeded
> half-runs and three stills; do not run `playthrough --long` (the orchestrator does that once). Commit; don't push.
> Report checkpoint times, any recovery, and what each still shows.

---

### Final pass (orchestrator, once)

`npm run playthrough -- --long --eval dev/look/evals/railway-job.ts --query 'shot=play'` on main with A, B, C and the
hook branch merged: it must pass `needle bell summit`, `sea gate`, `Q5 laid` and `Far Head` with no errors. Then write
the playtest guide the checkpoint decision asks for and stop all development.

## Risks

- **Room safety ("Don't").** No effects in apply: the switch's clank, the slab drop, posts, lamps and rockets play from
  `onAccepted`, `onCorrected` or the live completion edge, never from a rebuild. No `Math.random`, wall clock or native
  trig in `src/sim` (A adds none: a bool, an int and a comparison). The server checks the switch where the actor stands
  (height and reach), not where the client says the switch is. Malformed `sea` in a save fails the load check
  atomically (test in A7).
- **Conservation.** Q5's rails come only off the forge rack (two trips of up to 16, capped at the bill by `shelfOut`);
  logs are minted once per stretch up to its bill. A7 checks totals after every transfer and across a restore.
- **Mixed builds.** A reshapes `rail` and adds a qjob slot: `WORLD_NS` v20 in the same commit, with the dated line. It
  resets development worlds and, with `codex/save-reset`, players' local progress (owner-approved). The new op is
  additive; no compatibility code.
- **Hotspots.** `line2-view.ts` (1008 lines) gets wiring only; the new pieces live in their own files, as the parent
  plan asks. `dev/look/bots/railway.ts` is the hook branch's biggest edit: C must start after it merges.
- **The switch's reach.** The summit deck exists only on the hook branch. Until it merges, nobody can stand at the
  switch; A and B ship safely without it (Q5 waits behind a closed gate).
- **Q5 visible but shut between A and B.** After A ships alone, a room at Q5 shows a frame that refuses deposits with
  no gate drawn. Accepted for the hours between jobs; no world that far exists yet after the v20 reset.
- **Performance.** The trestle's pieces already exist in Place's track build; the lamps are two instanced meshes and
  54 thin colliders; the rockets are pooled particles. `npm run perf` in B, before and after, on a quiet machine.
- **Seeds.** A seeded room's tick starts past the built world's tick; the host loads it as a restart, so the away
  credit runs for the seconds between writing and opening (harmless). If the store refuses a file written after
  `store.init()`, write the seed before the stack starts (look.ts) and report it.

## For the owner

Nothing blocks the build. The owner's next action is the playtest the checkpoint calls for, once the final pass is
green and the guide is published.
