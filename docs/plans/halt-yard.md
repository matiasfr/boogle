> **Status: step 1 built (2026-11-19, `claude/halt-yard-store`, world v65); step 2 built (2026-11-19, `claude/halt-yard-bay`, view only); steps 3 to 5 in verification on `codex/halt-yard-stacks`.** Read at `origin/main` `c0c993ff7` (world v62). Station-deposit
> build 1. Step 1 changes rules, wire, save and server validation: one `WORLD_NS` bump (**the next free
> version**), one independent review. Build 2 (cargo cars carry a yard's goods) is out of scope: it waits for the
> cargo trains row.

## Questions for the owner

None of these waits: the build goes ahead on each recommendation and the calls are logged in
[agent calls](../agent-calls.md).

1. **Which halts get a yard now?** The 10 November answer says "a yard at each halt". The halts then were the
   Village, Camp, Quarry, Far Head and the Pier (none at the Pier for now). Since then the Railhead, Ring Island and
   the greybox halts (the stack heads, High Gorge, the `ns` and `bay` halts to Bell Rock) have been added.
   **Recommended: build 1 gives yards to the Village, Camp, Quarry and Far Head. None goes at the Railhead (a moving
   deck over the gap, with no ground), at Ring Island (its kit yard already stands there, and two "take it where it
   lies" stacks side by side would confuse), or at any greybox halt until its area is built for real.** Each later
   yard is one catalog row added with its area's own world bump. Does not wait.
2. **Pick up or Leave it here, now that each kind has its own room.** The confirmed prompt rule (10 November, call
   10) is "carrying anything the yard takes offers Leave it here; an empty back offers Pick up". It was written when
   logs, stone and rails shared one back. Since 17 November each kind has its own capacity, so a back carrying stone
   still has room for logs. Under the old rule a player carrying three stones can't take logs from the cradle until
   they put the stones down. The Village's recovery rack works the other way today: you can take logs from it while
   carrying stone. **Recommended: a bin offers Pick up when it has stock, you carry none of its kind, and you have
   room for it. Otherwise, if you carry anything the yard takes, it offers Leave it here.** Leave it here still puts
   everything down in one press. Does not wait. If the owner keeps the old wording, one condition in step 2 changes.
3. **The prompt's words.** "Leave it here" (draft, for the owner) is the verb at a bay. "Pick up" is the existing
   verb. **Recommended: keep both.** Does not wait.

## Goal

Spares get a place to go. Each halt site gets a low timber bay on the ground, beside the foot of its platform's back
ramp. One press of **Leave it here** puts everything on your back into it. Anyone can **Pick up** from it later. The
stock stays in that bay, where everyone can see it, until a hand takes it (owner, 10 November: "A yard at each halt:
take it where it lies; trains later carry it to where their line needs it"). Abandoned logs and stone recover to the
nearest yard, so lost things turn up somewhere you pass. This answers the owner's "deposit extra resources … somewhere
like stations" (10 November) and "used as a sync for extra resources" (17 November). It serves **6, Communal world**
(the stack belongs to the room and stands where everyone passes) and **11, Show, don't tell** (the stack is the
count). It bends neither.

**Research:** [carried-resource-display](../research/carried-resource-display.md) (the cargo you can see is the
display; exact counts where a bill is exact): the countable stack follows it. [level-design](../research/level-design.md)
and [route-contract](../research/route-contract.md): a yard adds no travel edge and no work edge (Level findings).

## The rule

**What a yard is in the sim: a new store, one row a site.** `HaltYard { slot, logs, stone, rails }` is accepted
Server state, keyed by its `HALT_YARDS` index, saved and replicated like the racks. It is not made of piles. Rejected:

- **Dropped piles in a marked place.** No new component: Leave it here would be `rail.drop` at the bay's spot, and
  the host would skip those piles in recovery. Rejected for three reasons. A pile holds 8 (`LOOSE_PILE_MAX`) and the
  room holds 128 piles (`LOOSE_PILE_CAPACITY`, `src/sim/railway-supply.ts:10`), and yard piles never recover. A room
  where people keep leaving spares would slowly fill the pile table, and then every Drop on the island would be
  refused, which breaks "a yard never fills". Making the bay's pile uncapped instead changes the save check
  (`railway-check.ts:189`, `n ≤ 8`), which is a bump anyway. And the exemption would be a host-only rule that replay
  and prediction never see.
- **One pool you reach from every station** (the brief's shape (b)). The owner rejected it on 10 November.
  [shared-pool](shared-pool.md) keeps the yards out of the upgrade pool until an upgrade is priced in logs, stone or
  rails (its open default, agent calls), and this plan doesn't change that.

**What it takes, from whom, and the limits** (all decided on 10 November and confirmed 16 November unless marked):

- **Kinds:** logs, stone and rails. Never a footing, the beam, the boiler or steel.
- **Who:** anyone, at the bay only (the server judges reach). Anyone takes what anyone left (DESIGN 6; 18 November:
  dropped piles stay the room's).
- **Leave it here:** one press puts everything of those three kinds off your back. The client sends one
  `rail.haltPut` per kind you carry, so up to three ops in a press, as build 0's set-down sends its drops.
- **Pick up:** one prompt a bin (cradle, shelf, stone bin). It fills that kind to your room for it (`roomOf`). Which
  prompt a bin shows: owner question 2.
- **No cap.** A yard always takes what you leave ("No: past 24 of a kind it grows in strapped bundles of 8").
- **Opens when the track reaches its site, before trains** (decided). The Village yard is always open. Camp opens
  with T3 laid (`Job` slot 2 `completion`). Quarry opens with Q3 laid (`QJob` slot 2; Q3 lays s 122 to 178 m and the
  halt stands at s 174). Far Head opens with Q5 laid (`QJob` slot 4, `farHeadLaid`). A closed yard refuses both ops
  and holds nothing. Camp's reading is a default: its stub is laid from the start, and the brief's own words were
  "Camp with station 3" (finding 3).
- **The Village yard is the recovery rack** (decided: "keeping the owner-picked rack model as its cradle,
  uncapped", at (905, 1)). Its logs and stone are the rack's existing `Rail.rack` and `Rail.stoneRack`. Leave it here
  there adds to them, and Pick up at its cradle and stone bin stays the existing `rail.rackTake`. Only its rails need
  a new place: `HaltYard` row 0's `rails`, on a new shelf beside the rack. Row 0's `logs` and `stone` are always 0
  (save check). `rail.haltTake` at yard 0 refuses logs and stone, so two ops never take the same pieces.
- **Recovery** (decided): a pile aged 21 minutes with nobody near moves its logs and stone to the **nearest open
  yard**, by squared integer distance from the pile, ties to the lower slot, with the Village always open. Rails still
  go to the forge rack and a footing to the Works rack. Yard stock is never recovered.
- **Build 0 meets build 1** (decided): a big-load set-down standing inside a yard's reach leaves the back in that
  yard instead of at your feet. No bay stands near any big thing's pickup today (the boiler pedestal is about 15 m
  from the rack), so this rarely fires.
- **Pre-staging is allowed** (decided). A Far Head yard can't pay Station 6 early, because Station 6 takes nothing by
  hand before trains (9 November).
- **Nothing duplicates and nothing vanishes.** Every transfer is account ↔ row inside one accepted op, so
  `railCounts` and the stone and rail witnesses count yard stock.

## Where: four bays

Positions come from `src/place/layout.ts` `HALTS` and `src/prefab/halt-ramps.ts`: the back ramp runs out from the
deck's middle, from 1.25 m to 7 m off the platform's centre line. Each bay is 4 m along the line by 2 m deep, with
its long side parallel to the track. It stands beside the ramp's foot, never on the 2.5 m deck and never between the
ramp and the display (decided). World metres; catalog cm in brackets.

| Yard (slot) | Opens | Centre, world m | Placed | Why this side |
| --- | --- | --- | --- | --- |
| 0 Village | always | (905.0, 1.0) [90500, 100] | the recovery rack where it stands (`RECOVERY_RACK`); the rails shelf within 1.5 m of it, on the side away from the greeter | decided; the Home station plan may move it later |
| 1 Camp | T3 laid | (1013.6, −138.1) [101360, −13810] | 4 m along +s from the ramp's centre line, 8 m out from the platform's centre | the −s spot is 5.5 m from tree 4, whose Chop would compete (finding 5) |
| 2 Quarry | Q3 laid | (1076.7, 51.4) [107670, 5140] | 4 m along −s, 10.5 m out | away from the gate (decided). At 8 m out it sat 3.5 m from Q3's reward crate, so it moves 2.5 m further out (finding 4) |
| 3 Far Head | Q5 laid | (1364.3, −154.6) [136430, −15460] | 4 m along −s, 8 m out | toward Home, away from the up crossing at s 538.5 |

The bins sit along the bay at −1.4, 0 and +1.4 m from its centre: the cradle at the end nearer the ramp, then the
rails shelf, then the stone bin. The view derives the bay's yaw from the line's heading at the halt's middle. The sim
needs only the centre. The server judges both ops within `HALT_YARD_REACH` = 420 cm of the centre: the bay's half
length plus a prompt reach.

## Design

Sync kinds (docs/agents/sync.md): yard stock is **Server state** with **declared reversible prediction**, as for
`rail.take` and `rail.rackTake`. The flights, the stack meshes, the bundles and the pointer are **Local** over
accepted rows. The server owns rule ticks and saves. No client lead, no classic edit generator and no client state
registration.

- **Pure logic** (`src/sim`, review path):
  - `railway-yard-layout.ts` (new): `HALT_YARDS: readonly { id: 'village' | 'camp' | 'quarry' | 'farhead'; x: number;
    z: number; opens?: { line: 1 | 2; slot: number } }[]`, `HALT_YARD_REACH = 420`, and a load-time check (integers,
    four rows, Village first with no `opens`).
  - `railway-queries-yard.ts` (new): `haltYardId(w, k)`, `haltYardOpen(w, k)`, `haltYardStock(w, k, kind)`
    (Village logs and stone read `Rail.rack` and `Rail.stoneRack`), `nearestOpenYard(w, x, z)`, and
    `haltYardTotals(w)` for the witnesses.
  - `railway-sys-yard.ts` (new): the systems `haltPut` (`rail.haltPut`) and `haltTake` (`rail.haltTake`), with
    `phase: 'act'` and the next free `order`s, and `yardRecover(w, pile)` for the supply pulse.
  - `railway-components.ts`: `HaltYard`, appended last to `RAIL_COMPONENTS`, with rows spawned last in
    `createRailwayWorld`, one per `HALT_YARDS` row in catalog order.
  - `railway-systems.ts`: `'rail.haltPut': [haltPut]` and `'rail.haltTake': [haltTake]`.
  - `railway-sys-away.ts` (`supply`): the logs and stone branch calls `yardRecover`. Add `HaltYard` to `writes`.
  - Witnesses: `railCounts` and `line2Logs` (logs), `line2Rails` (rails), and the stone conservation in
    `railway-check-line1.ts:85`. Add the yard totals to each.
  - `railway-check.ts`: a `halt yards` save rule. There is one row per catalog slot, with integer counts ≥ 0. Row 0
    has `logs === 0` and `stone === 0`. A closed yard holds 0.
- **Commands** (`src/world/railway-server.ts`, review path): both ops go in `RAIL_ACTIONS`, validated by
  `railInt(e.yard, HALT_YARDS.length - 1)`, `railInt(e.kind, 2)`, and `near(y.x, y.z, HALT_YARD_REACH)`.
  `src/world/railway-predict.ts`: both go in `RAIL_PREDICTED`. Their effect's `level` is the bin's count after the
  op, read through `haltYardStock`. Validation and actor facts come from the existing coordinator (`at`, `ms`).
- **Host** (`server/src/host/railway-requests.ts`, review path): `railwayRequestEdit` keeps `yard` for both ops and
  `kind` for both. `EVENT_FIELDS` gains `'yard'`.
- **Results:** accepted with `accepted` = the pieces moved; `noop` when there is nothing to move or no room; refused
  when the yard is out of reach, closed, the wrong kind (`haltTake` of logs or stone at yard 0), or the request is
  malformed. A refused or raced prediction is corrected by replication. A queued op is not acceptance.
- **Checkpoint:** no new state key. `HaltYard` rows are part of the railway's checkpointed world, so the schema, save,
  hash and wire all move with the bump.
- **Replay and invariant tests:** step 1.
- **Controls:** no new action, slot or key. Both prompts go through the existing Interact (E, pad X, the touch action
  button). No guide row changes.

**The view** (`src/entities/railway`, not a review path):

- `halt-yard-view.ts` (new), mounted from `view.ts` (its one added line), draws yards 1 to 3. Each is a low timber
  bay, about 4 by 2 m and 1.2 m at the posts. It has a log cradle, a rails shelf and a stone bin, and is solid where
  it looks solid (2 November, "what looks solid is solid"), with a collider on its base and posts. Batches reuse
  `shelf-view.ts`'s rail meshes, the depot rack's log meshes in `line2-view.ts`, and the station stone pile's meshes.
  The view shows nothing until the yard opens. The first time a player sees its yard open, the bay's pieces drop in
  with the halt kit's drop-set (thump, dust; `halts-view.ts` `dropSet`). Loading a world where the yard is already
  open shows it built.
- **The stack is the count** (decided: no number board). Each bin shows one mesh a piece up to 24. Past 24, each
  full 8 becomes one strapped bundle, and the leftover (fewer than 8) lies loose on top, so every piece is seen.
  Bundles stack in courses inside the bin and rise above the bay when they must. The instance buffer doubles as it
  grows: nothing is capped.
- **Flights:** pieces fly off the back into the bin with the deposit flight and land with the stack's wooden knock.
  On Pick up they fly from the bin onto the back. Each plays on the press (prediction) and once on confirmation,
  never twice. The bin's prompt re-arms only once its flight has landed (decided: a mashed press can't put down and
  take back).
- **The Village yard:** `sources.ts` keeps the recovery rack (`supply-view.ts`, the owner's model). It gains the
  rails shelf beside the rack (`shelf-view.ts`'s meshes, row 0's `rails`) and the rack's Leave it here prompt. Its
  three authored logs, which today "represent accepted stock, never its full ledger" (`supply-view.ts:1`), give way
  to the true stack on the rack's bed, drawn with the bays' batches. The stone already shown at the rack follows the
  same rule. The model itself is unchanged. This is a visible change to an owner-picked asset, which the brief's
  review flagged (finding 5 there), so it is logged (call 25).
- **One pointer, only at a confusing turn** (decided 17 November). In step 3 the builder takes a still from each old
  frame nearest a yard, at the feeding spot, looking toward the bay: T1 for the Camp, Q4 for the Quarry, Q5 and Q6's
  rack for Far Head, the forge frame for the Village. A small timber fingerpost, an arm with no words, goes up only
  where that still doesn't show the bay. Quarry's Q4 is the likeliest: it stands around the bend and across the
  track. Every other finished site stays bare. A pointer is never a drop target.

## Steps

Each step leaves `node dev/ship-check.ts` green. The full check, the bots and `test:net` are the checkpoint's
(owner-calls "Build more, test less"). Looks use a disposable production room. Step 1 is the one independent
review. Steps 1 to 5 ship together in one ship, between sessions (check `npm run heartbeat` for a live session
first; owner-calls "Nothing waits on a world bump").

- [x] **1. The store, the two ops, the save and the world bump.** Seeds unchanged.
  - *As built (2026-11-19, world **v65**, over the Rail yoke's v64):* as written, with these moves. The server also
    refuses `rail.haltTake` of logs or stone at yard 0 and any op at a closed yard in `railValid` (the rules give 0
    for both too). A put and a take keep a greybox leg's kit books as `rail.drop` and `rail.take` do (agent calls).
    Yard logs are counted in `line2Logs` (so in `railCounts.total`), rails in `line2Rails`, stone in
    `railCounts.stone.total` and line 1's stone conservation. The sim tests read the back's real counts (a chop
    yields 2, and the yoke's forge take gives 16 rails, so not 10 and 4), and the footing's recovery stays
    `test/railway-works.test.ts`'s. `dev/loop/trace.ts` itself is unchanged: it reads its activity marks from
    `dev/loop/graph.ts`, which gains `'rail.haltPut'` and `'rail.haltTake'` in `GENERIC_OPS` and
    `/^yard (left|taken)$/` in `ACTIVITY_MARKS` (five lines, in their own commit, so `test/loop-graph.test.ts`'s
    drift checks pass; greybox leg 2's step 5 edits the same two lists). The host trace's
    action sweep gains 8 records (a refused `rail.haltPut` and `rail.haltTake`, 4 each), as `rail.yoke`'s did at
    v64.
  - **Files:** the sim, world and host files listed under Design. `src/world/namespace.ts`: the next free version,
    with the line "halt yards (docs/plans/halt-yard.md): `HaltYard` rows and `rail.haltPut`/`rail.haltTake`;
    abandoned logs and stone recover to the nearest open yard; no migration."
  - **Wire for tools:** `src/adapters/railway-intents.ts` gets the union members `{ op: 'rail.haltPut'; yard:
    number; kind: 0 | 1 | 2 }` and `{ op: 'rail.haltTake'; … }`, their validators, and `haltPut(yard, kind)` and
    `haltTake(yard, kind)` on the adapter. `railway-effects.ts`: `sameTarget` matches by `yard` and `kind`.
    `railway-marks.ts`: the marks `'yard left'` and `'yard taken'`, with the material. `dev/peer-test/ws-page.ts`:
    the two cases. `dev/playtest/beats.ts` and `dev/loop/trace.ts`: the marks.
  - **Sim tests** (lockstep, in existing files):
    - `test/railway-set-down.test.ts` (station-deposit's file). Test "halt yard: leave it here, pick it up, nothing
      lost", on `buildSeedWorld('q3-done')` with 10 logs and 4 rails on `a`:
      - `haltPut` at Far Head (closed) gives 0;
      - at the Quarry, logs give 10 and rails 4, and the row reads 10, 0, 4;
      - `haltTake` of logs on an empty `b` gives `min(10, roomOf)`;
      - `railCounts`, `line2Rails` and `invariant` agree before and after;
      - `restore(w)` hashes equal.
    - The same file, test "the Village yard: logs to the rack, rails to its shelf, the rack's take unchanged":
      `haltTake` logs at yard 0 gives 0, and `rackTake` gives the logs.
    - `test/railway-supply.test.ts`, test "an abandoned pile recovers to the nearest open yard". A logs pile at
      (1000, 30) on `q2-stocked` (the Quarry yard is closed) goes to `Rail.rack`. The same pile on `q3-done` goes to
      the Quarry row. A rails pile goes to the forge rack either way, and a footing to the Works rack. The existing
      "exhausted world" test keeps its numbers. If it moves, the commit says why.
    - `test/fixtures/railway-bad-worlds.ts`: `{ site: 'halt yards', message: 'railway: halt yards', break }` for
      Village logs ≠ 0 and for stock in a closed yard. `test/railway-check.test.ts` runs them.
    - `test/railway-replicate.test.ts`: `haltPut` is predicted on a's mirror, confirmed, then seen by b and a late
      joiner (the `:420-440` and `:563` patterns).
    - `test/railway-marks.test.ts`: the two ops in its op list.
  - **Host test:** `server/test/railway-line-host.test.ts`, a new test beside the hook-and-glider one (its `load`
    and `host.deliver({ t: 'r:edit', … })` harness). It loads `buildSeedWorld('q3-done')`, gives the session's
    account logs and rails through real ops (a chop, a depot or forge rack take), and sends each op as a real `r:edit`:
    - `rail.haltPut` standing at Q4's frame: `rejected`;
    - at the Quarry yard: `accepted`, with the row moved;
    - `rail.haltTake` at Far Head's yard: `rejected` (closed);
    - `rail.haltTake` at the Quarry: `accepted`;
    - a malformed `yard` (−1, 4, `'x'`): `rejected`, and the room keeps running;
    - a host restart (`close({ save: true })`, recreate) keeps the row and the back.
  - **Fixtures that move with the bump:** `test/fixtures/rail-schema.json` (`GOLDEN=1 node --test
    test/railway-schema.test.ts`), `test/fixtures/railway-golden.json`, `test/fixtures/railway-ops-golden.json`,
    `test/fixtures/railway-m12-trace.json`, `test/fixtures/railway-tick-order-heads.json` and
    `server/test/fixtures/world-host-trace.jsonl.gz`. Each gets its dated note (the headers of `railway-m12.test.ts`
    and `server/test/world-host-trace.test.ts`, and the first line of `railway-ops.test.ts`). Before regenerating,
    a keyed comparison against the v62 fixtures must show only these changes:
    - four all-zero `haltYard` rows;
    - every later entity id shifted by 4 (piles are spawned after the catalog);
    - the hashes that follow from those two.
    Any stage whose recovery destination changed must be listed in the commit with the reason. No tick, length,
    input or other result may change.
  - **Check:** ship-check. Then `cd server && npm test`, `npm run test:net`, `npm run level-check` and `npm run loop
    -- run` (unchanged order, no softlock).
  - *`npm run review-stamp` asks for an **independent review**: `src/sim`, `src/world` and `server/src`, plus tests
    that reach them. Review against: room-safety "Don't" (no effect in apply, no queued-as-done), mixed-builds (the
    bump and its line), conservation across the three witnesses, the keyed fixture comparison and the host test.*

- [x] **2. The bay and its prompts at Camp, Quarry and Far Head.**
  - *As built (2026-11-19, view only, no bump):* the bay's boxes are one table, `haltYardBay(hand)` in
    `src/content/prefabs/halts.ts` (whole centimetres; `hand` puts the cradle at the ramp end). The view draws the
    three bays from it in one drop-set (one draw, 27 boxes a bay, 81 in all, 972 triangles), and the same table is the collider
    record of two prefabs, `railway.halt-yard-bay-a` and `-b` (visual none), because lint's prefab door refuses
    hand-made bodies in a view. The bay's open long side faces the platform; the back and the ends are boarded. It
    drops in when its yard opens within 80 m of you and stands built otherwise. Before its solids come in, a player
    standing in them is moved clear by `siteExit` (`src/place/site-clearance.ts`, with `outOf` from `sites.ts`) at a
    2 cm contact tolerance. A bin's prompt shows within `inReach` of the bin and 3.9 m of the bay's centre (the
    server's 4.2 m less 0.3 m), so no prompt is offered that the server would refuse for reach. A closed yard has no
    bay and so no prompt: the closed case of `blocked` never shows, and no new copy was needed. A full kind greys
    Pick up with the existing `Logs full`, `Stone full` or `Rails full`. Pick up names the bin's count as a pile's
    prompt does (`5 logs`); Leave it here has no count. A bin still shows nothing of its stock (step 3). `view.ts`
    gets two lines, the mount and the targets, not one.
  - *Proof:* a look on `q3-done` chopped five logs with real presses, then pressed Interact at the Quarry bay. Leave
    it here was accepted by the server (mark `yard left`, `authority: server`; the confirmed row read 5) and Pick up
    gave them back (`yard taken`; the row 0, the back 5). Stills: [approach](halt-yard/step2-quarry-approach-q3-done.png),
    [ramp foot, q3-done](halt-yard/step2-quarry-ramp-foot-q3-done.png),
    [ramp foot, q2-stocked, no bay](halt-yard/step2-quarry-ramp-foot-q2-stocked.png),
    [Leave it here](halt-yard/step2-quarry-leave-it-here.png), [Camp](halt-yard/step2-camp-q2-stocked.png),
    [Far Head](halt-yard/step2-far-head-q5-done.png). The Quarry has no halt deck or back ramp at `q3-done` (they drop
    in with the trains), so the ramp-foot still stands where the foot will be.
  - **Files:** `src/entities/railway/halt-yard-view.ts` (new); `view.ts` (mount); `src/render/` only if a strap
    mesh needs a builder.
  - Per bin, one `Interactable` at the bin's position (`inReach` from `tools.ts`): Leave it here or Pick up by owner
    question 2's rule, and `blocked` when a closed yard or a full back stops it. The bay's colliders come from the
    same boxes the mesh is drawn from.
  - **Done:** at `--rail-seed q3-done`, a still from the Quarry's back ramp shows the empty bay. At `q2-stocked`
    there is no bay.
  - **Check:** ship-check; `npm run look -- --rail-seed q3-done --cam … --look …` (one still from the ramp foot,
    one from the play camera on the approach).
  - *Review stamp: no independent review.*

- [x] **3. Stacks, bundles, flights, the Village shelf and the pointer check.**
  - Two local clients saw 10 logs and 4 rails from the same press at Quarry. Both replicas were at tick 1992.
    Picking up the logs returned 10 to the back and left 4 rails on the shelf. A separate run stacked 40 logs.
    The two kinds go 100 ms apart to respect the host's unload interval. These are client transfers over world v65.
    Local evidence in `.look/`: `yard-pair-still.png`, `p2-yard-pair-still.png`, `yard-flights-realtime.webm`,
    `yard-flights-motion.png`, `yard-bundles-final-still.png`, `yard-transfer-motion.png` and `yard-village-still.png`.
  - From T1, Q4 and the Q6 rack the bay shows. The workshop hides the Village rack from the forge frame, and Far Head
    is indistinct from Q5. Those two turns have a wordless arm. Five approach stills and both resulting arms were opened.
    The final Quarry still has six loose courses of four and two separately bound eights. In the 10-second clip the stock
    settles by 0.69 s and pickup is visible by 2.08 s. Smoothness on a device is unverified.
  - The targeted gate passed. A two-second production render sample reported mean CPU frame 12.13 ms, p95 28.8 ms,
    mean railway update 1.56 ms, and zero graphics errors. This sample covers the entire entry view.
  - **Files:** `halt-yard-view.ts`, `sources.ts` (the Village shelf and the rack's Leave it here),
    `dev/look/evals/halt-yard.ts` (new). The eval gets its materials by real accepted ops (chop, the Q4 depot rack,
    `forgeTake`). Teleports isolate the prompt; they prove no reach.
  - **The proof look:** `npm run look -- --rail-seed q3-done --eval dev/look/evals/halt-yard.ts --video --seconds 10`.
    Ten logs and four rails, one press: the pieces fly into the bay, the cradle shows 10 and the shelf 4, and a
    second tab sees the same stack. Then Pick up with an empty back fills it to its room, and the rest stays.
  - **Never full:** `--query n=40` puts 40 logs in. The still shows 24 pieces and two strapped bundles.
  - **The pointer:** the four frame-to-bay stills in Design. Add the fingerpost only where a still doesn't show the
    bay, and name those stills in the commit.
  - **Check:** ship-check, the eval's stills and video, opened and named. Real-time feel comes from the `--video`
    only.
  - *Review stamp: no independent review.*

- [x] **4. Recovery reads, and the set-down uses a yard.** Client and dev only, no bump.
  - The dev seed starts at Q3, chops and drops two real loads, and uses the supply pulse to age them to 21 minutes.
    The live host credited 4 logs to Village and 6 to Quarry. The town-path still shows four cut ends on the rack and the Quarry still shows six in the cradle.
    Opened `.look/yard-town-path-still.png`, `.look/yard-recovery-quarry-still.png` and `.look/yard-setdown-still.png`.
    Using set-down in reach put 10 logs and 4 rails into the Quarry bins, clearing the back. The set-down tests
    passed 7/7. The targeted gate passed 694 tests in 73 affected test files. World v65 remains in use.
  - `src/entities/railway/sources.ts`: a recovered pile's flight ends at the destination yard's bin (from the
    accepted `rail.supply` change, Local), not always at the rack.
  - `src/entities/railway/back-down.ts` (`setDown`): standing within `HALT_YARD_REACH` of an open yard, send
    `haltPut` per kind instead of drops. Big things keep their prompts.
  - **Done, recovery reads:** `halt-yard.ts --query recover=1` on `q3-done` ages two logs piles past 21 minutes,
    one by the forge and one at (1000, 30). After the pulse, the first is on the Village rack in a still from the
    town path, and the second is on the Quarry bay's cradle in a still from its back ramp.
  - **Check:** ship-check, the two stills, and the existing `test/railway-set-down.test.ts` (its `plan` tests are
    unchanged).
  - *Review stamp: no independent review (`src/entities` only), unless step 1's files are touched again.*

- [ ] **5. Checkpoint: bots, seeds, boot probe and docs.**
  - `npm run check` (the checkpoint's full check). Run the railway bot (`dev/look/bots/railway.ts`: it walks past
    every halt's ramps, and its conservation line 1588 now counts yard stock) and the seed route
    (`src/sim/railway-seed-route.ts`: its drops at (1000, 30) and the Q5 depot must still be accepted, and recovery
    must not change a stage). Then `npm run test:net`.
  - **Boot probe** (the plan adds a sim list, `HALT_YARDS`, that the views read): `npx vite build`, `npx vite preview
    --port 4173 --strictPort`, then `node dev/live-boot.ts --offline --url http://localhost:4173/`. It must print
    PASS with no "page errors" line (on HOTBOX, use the scratch `channel: 'chromium'` copy under `.look/`).
  - `docs/game-design/place.md` "Materials and recovery": the yards, Leave it here, recovery to the nearest yard.
    `docs/brainstorms/station-deposit.md`'s status line: build 1 live.
  - *Review stamp: no new review, unless a fix touches step 1's files.*

## Level findings

The bays aren't built, so `npm run level-check -- --place=place` on main (exit 0, 16 reports) doesn't contain them.
To test the planned positions I ran a scratch probe on that check's own data: the terrain, the flood copied from
`dev/economy/place-level.ts` at the player's slope limit, both lines' tracks and offset tracks every 0.5 m, every
platform's deck, the frames, racks and line 2's reward-crate seats (`rewardSeat`'s first branch), the quarry lever
and gate, and the tree and rock sources. Bay footprint: 4 by 2 m.

| Yard | Ground under the footprint | Nearest track | Nearest deck edge | Reach from spawn on foot | Nearest things |
| --- | --- | --- | --- | --- | --- |
| Camp (+s) | flat, 30.00 m (rail 30.30) | 9.9 m | 5.75 m | at the start | tree 4 10.2 m, grove (2, −128) 15.4 m, T1's frame 19.1 m |
| Quarry (−s, 10.5 m out) | flat, 24.00 m (rail 24.30) | 12.4 m | 8.2 m | at the start | Q3's reward crate 6.0 m, Q4's frame 19.1 m, Q4's rack 20.6 m |
| Far Head (−s) | flat, 24.00 m (rail 24.30) | 9.9 m | 5.75 m | once line 2 reaches Far Head (the headland is off the start flood) | Q6's rack 18.9 m, Q5's crate 23.3 m |
| Village (the rack) | flat, 18.00 m | 12.9 m | (Home island) | at the start | the greeter 8.7 m, spawn 13.2 m, the forge rail rack 20.0 m |

- **Reach and order.** Camp and Quarry can be walked to before their yards open. That is harmless: a yard gates
  nothing and holds only what was carried there, so it adds no travel edge and no work edge (route contract; flow
  rule 2). Far Head can be reached only along the laid track, which is exactly when its yard opens. Nobody is stranded
  (rule 3): a yard never takes a key item.
- **Clearance.** Every bay is at least 9.9 m from a track centre line, so no train sweeps it, and at least 5.75 m
  from any deck edge, so it is off the deck and the aisle. All four sit on flat ground (0.00 m spread).
- **Rejected spots.** Camp −s: 5.5 m from tree 4, so its Chop prompt would compete. Quarry +s: 9.4 m from the lever
  and 14.4 m from the gate slab, on the gate side. Quarry −s at 8 m out: 3.5 m from Q3's crate, under the 2 m edge
  clearance.
- **Walks.** Bay to the deck's middle is 8 to 10.5 m (1.5 to 2 s at 5.6 m/s). An up-platform player crosses the
  plank crossing, about 12 m more (2 s). The nearest old frame is 19 m away (3.4 s) at each out-halt. The Village
  rack is 24 m (4 s) from the line 1 platform.
- **Prompts.** A halt's request lever reaches 11.6 to 13.6 m (`RailPlatform.reach`), so each bay stands inside it.
  `pickInteract` takes the nearest target, so at a bin the bin wins. Step 2's stills confirm this.
- **Not covered.** The probe doesn't model props or colliders (no more than the place check does), so a bay's
  collider against the bot's walk is the checkpoint's bot run. No still was taken (docs-only work, no browser). The
  Camp hut the brief mentions behind the platform isn't in `src/place` under that name. The nearest authored point
  is the timber camp at 26.9 m.

## Risks

- **Room safety.** Every transfer is in a system inside the tick's apply. Flights and drop-ins play from accepted
  receipts or the declared prediction, once each. No `Math.random`, wall clock or native trig in the sim: nearest
  yard is squared integer distance. New `src/sim` files are covered by `LOCKSTEP_FILES` and by the server image's
  `COPY src/sim`, so `server/Dockerfile` doesn't change. Malformed `yard` or `kind` is refused, never thrown.
- **Mixed builds** (dev phase: no compatibility code). The server hosts only rooms under its own `rail-<WORLD_NS>-`
  (`server/src/room-ids.ts` `currentRoomId`; `rooms.ts:48`).
  - **New client, old server.** Pages deploys in minutes and the server about 20 minutes later. A new tab asks for
    `rail-<next>-…`, which the old server doesn't host, so the tab waits on the railway room until the server
    deploys. I did not verify what it shows meanwhile.
  - **Old client, new server.** The old tab's room is no longer current and is refused. The update notice brings it
    onto the new build, and boot cleanup retires the old saves.
  - No tab ever sends `rail.haltPut` to a server that doesn't know it. That gap is accepted under "No old builds in
    development".
- **Collisions.**
  - `claude/departure-ease` (the track layer's slower start) takes a world version and moves `namespace.ts`,
    `railway-server.ts`, `rail-schema.json`, every railway golden and the host trace.
  - The Rail yoke's steps 1 and 2 ([rail-yoke](rail-yoke.md)) take the version after that and touch
    `railway-components.ts`, `railway-server.ts`, `railway-predict.ts`, the intents and effects, the marks and the
    same fixtures.
  - This plan rebases after both and takes **the next free version**. Its fixtures are regenerated last, on top of
    theirs, with the keyed comparison against the main it rebased on, never against v62.
  - `claude/greybox-leg2-views` touches `halts-view.ts` and `train-view.ts`. This plan edits neither: the bay is its
    own file and `view.ts` gets one mount line.
  - Greybox leg 3's plan (`claude/greybox-leg3-plan`) is being written. This plan adds no halt, line or train, so it
    shares only the world-version queue.
  - `claude/forge-rack-move` (`npm run inflight`, 29 h old) touches `dev/look/bots/railway.ts` and
    `docs/agent-calls.md`: rebase over it.
- **Hotspots:** `railway-server.ts`, `railway-sys-away.ts`, `sources.ts`, `railway-queries-line2.ts`. The rules go in
  new files, with one wiring hunk each.
- **Performance:** about 3 bays × 3 batches, instanced, plus one collider set per bay, drawn only near the halt's
  chunk. Run `npm run perf` at step 3 and report the cost. It is a guide, not a gate.
- **Names.** `Yard` is the town's crate yard, `LegYard` the greybox junction yard, `RING_STEEL_YARD` the island's kit,
  and the seed stages `yard-wagon`, `yard-built` and `yard-deck` the loader yard. Hence `HaltYard`, `HALT_YARDS`,
  `rail.haltPut` and `rail.haltTake`, and the marks say "yard" only next to "halt" in code comments.

## Draft strings (for the owner)

- **Leave it here**: Interact at a bay or the recovery rack with something on your back that it takes (draft, new).
- **Pick up**: the existing verb, reused at each bin.
- No Boogler lines are added or changed. No suspect lines of his were found in the files this plan touches.

## Design review (2026-11-19)

Run by the planner in the same context, with the design-review skill. Read: DESIGN.md; owner-calls; the decision
routing table; rail and core-loop Current rules, including the 10, 16, 17 and 18 November entries in full; the
station-deposit brief and its review; finished-deposits; shared-pool; the confirmed 10 November rows in the archive
(confirmed 16 November in the batch-2 bulk); `npm run loop`; the code listed above; and the probe. I could not look at
the halts from the player's eye (no browser in this docs job): that is the first thing step 2 does. Nothing is ported
from Place.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | A yard at each halt, taken where it lies; no pooled bank | Decided | 10 November ("A yard at each halt: take it where it lies") |
| 2 | It never fills; past 24 of a kind it grows in strapped bundles of 8 | Decided | 10 November |
| 3 | It appears when the track reaches its site, before trains; none at the Pier | Decided | 10 November |
| 4 | Build 1's yards: Village, Camp, Quarry, Far Head; none at the Railhead, Ring Island or the greybox halts | New | Owner question 1; recommended as written |
| 5 | The opening edges: Camp at T3 laid, Quarry at Q3 laid, Far Head at Q5 laid | Default | The brief's "Camp with station 3, Quarry and Far Head as line 2 passes"; the Camp stub is laid from the start (finding 3) |
| 6 | Logs, stone and rails only | Decided | 10 November call 7, confirmed 16 November |
| 7 | Leave it here: one press puts everything the yard takes | Decided | 10 November call 9, confirmed 16 November |
| 8 | Which prompt a bin shows: Pick up when you carry none of its kind and have room, else Leave it here | New | Owner question 2; changes confirmed call 10's "an empty back" for separate capacities (17 November) |
| 9 | Pick up fills the kind to your room; one prompt a bin; re-arms once the flight lands | Decided | 10 November call 10, confirmed 16 November |
| 10 | Anyone may take what anyone left | Decided | DESIGN 6; 18 November ("dropped piles stay the room's") |
| 11 | Abandoned logs and stone recover to the nearest open yard (squared distance, ties to the lower slot, Village always open); rails to the forge rack; yard stock never recovers; pre-staging allowed | Decided | 10 November calls 14, 22, 23, confirmed 16 November. The tie rule is engineering |
| 12 | The recovery rack is the Village yard at (905, 1), the owner's model as its cradle, uncapped | Decided | 10 November call 13, confirmed 16 November |
| 13 | The Village's logs and stone stay the rack's own stock and take; its rails get row 0 on a new shelf beside the rack | Default | Smallest reading of call 13's "add the rails shelf and stone bin beside it": the rack already holds stone |
| 14 | The four positions and sides (table above) | Default | The decided rule (back ramp's foot, never the deck, away from the Quarry gate) placed by the probe; findings 4, 5 |
| 15 | The bay: about 4 by 2 m, 1.2 m at the posts, cradle, shelf and stone bin; solid | Default | The brief's shape; "what looks solid is solid" (2 November) |
| 16 | Past 24 the leftover under 8 lies loose on top, so every piece shows | Default | Keeps the decided stack "countable and true" (DESIGN 11) |
| 17 | No number board | Decided | 10 November call 19 (DESIGN 11; machines show their work) |
| 18 | A pointer only at a confusing turn, judged by four frame-to-bay stills; a small wordless fingerpost; likeliest at the Quarry | Default | Decided by 17 November; where and what is this plan's |
| 19 | The bay drops in with the halt kit's drop-set the first time you see it open | Default | "Construction you can watch is how things get built" (1 November) |
| 20 | A set-down inside a yard's reach leaves the back in the yard | Decided | 10 November call 4, confirmed 16 November |
| 21 | The server judges both ops within 4.2 m of the bay's centre | Default | The bay's half length plus a prompt reach, as other racks' 3.2 m |
| 22 | "Leave it here" (draft) and "Pick up" | Default | Draft copy for the owner (owner question 3) |
| 23 | One `WORLD_NS` bump, shipped between sessions | Decided | Owner-calls "Nothing waits on a world bump" (10 November) |
| 24 | Yards join no upgrade pool until an upgrade is priced in their kinds | Default | Shared-pool's open default, already in agent calls (18 November); unchanged here, not logged again |
| 25 | The Village rack shows its true stock on its bed (bundles past 24) instead of its three authored logs; the model is unchanged | Default | Follows the decided "the yard is the stack" and "the recovery rack becomes the Village yard" (confirmed 16 November); the brief's finding 5 named the visible change |

Counts: 13 decided, 10 default, 2 new.

### Findings

1. **The decided prompt rule predates separate capacities** (call 8). "An empty back offers Pick up" meant "you
   have room" when every kind shared one back. Since 17 November it doesn't. Kept as written, it would also change
   the Village rack, which today lets a back with stone take logs. Step 2 follows the recommendation (owner question
   2).
2. **"Each halt" has grown** (call 4). Six kinds of halt have been added since the answer. The plan covers the four
   it was given for and keeps the catalog open to more rows (owner question 1).
3. **Camp's track is there from the start.** The second initial stub covers the Camp halt (`RAILWAY_TRACK_CLEARINGS`),
   so "when the track reaches the halt site" would be minute 0 if read literally. The plan opens it at T3, in the
   brief's own words, which keeps the opening scene uncluttered. Logged as a default (call 5).
4. **The Quarry's gate-free side is where Q3's reward crate sits** (3.5 m at 8 m out). Moved 2.5 m further out, to
   6.0 m from the crate and 12.4 m from the track. The +s side is the gate side (rejected). Changed the table and
   step 2's still.
5. **Camp's −s side is 5.5 m from tree 4.** Moved to +s (10.2 m). Changed the table.
6. **The halt lever's reach covers every bay.** The nearest target wins, so at a bin the bin wins. Step 2's still
   checks it from the ramp foot.
7. **Co-op and solo.** Two players at one bay: each press is its own op, and a raced Pick up is corrected by
   replication (`sameTarget` by yard and kind). A friend arriving late sees the stack (replicated rows). Solo, the
   bay is where your own spares wait for your next pass. Until build 2, a yard away from an open bill is a tidy bin
   and nothing more, as the brief says plainly.
8. **What the player meets first.** The Village rack exists from minute 0. The first new bay is the Camp's, the moment
   line 1 joins. It reads first as a timber thing with nothing in it at the foot of the ramp you walk down. The
   first time the player puts something in it, the stack does the teaching. No line or marker tells them (a small
   prompt is direction enough, 2 November).
