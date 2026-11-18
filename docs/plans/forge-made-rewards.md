> **Status: building (2026-11-17); the owner answered its three questions the same day (below).** Brief: [forge-made-rewards](../brainstorms/forge-made-rewards.md).
> Decision: [rewards, 17 November](../decisions-rewards.md#d-2026-11-17-forge-made-rewards). Base: `45e2fe2f`
> (main `5cfe070d` plus the brief). Steps 1 to 3 only change what players see and can ship first. Step 4 moves the
> axe's pickup (sim catalog, server reach). Step 5 is the cut, which needs step 4. **No `WORLD_NS` bump** (see Risks).

# The forge's rewards are its own products

Serves DESIGN.md **7, Telegraph everything** and **11, Show, don't tell**. Principle **6** is unchanged: whoever
opens a reward opens it for everyone.

## Goal

Players should see each reward being made, and know where it waits. When the 24th log goes in, a little guy knocks
the pack frame together from the forge frame's last timber, at the pack's spot. When the 56th goes in, the forge lights
and the proper axe arrives on the forge's pedestal, still glowing hot, in a short cut. Both bills show their reward
before they are done.

**Research:** [progression-flow-layout](../research/progression-flow-layout.md): rule 1 (the next goal can be found),
and the "key in sight of the lock" and "end a beat facing the next" lenses, used for the hardwoods' sightline.
[third-person-camera](../research/third-person-camera.md): manual look has priority, so the cut is short, skippable
and only for players at the forge. [level-design](../research/level-design.md): walk-seconds for the legs below.
Comedy notes: the deadpan straightening stays parked, as the brief has it.

## What stands today (read from code, 17 November)

| Thing | Where (world m) | Code |
| --- | --- | --- |
| Forge unload / bill point `LINE2_FORGE` | (922.0, -12.0) | `src/sim/railway-line2-layout.ts:10` |
| Pack offer `LINE2_PACK`: a bobbing `T1_CRATE_PARTS` crate on the ground, offered when `line2PackReady` | (914.0, -9.0) | `src/entities/railway/tools.ts:88`, `:319` |
| Axe offer `LINE1_AXE_STAND`: a crate on a 2.2 m pale stand with a static box, offered when `forge.lit >= 0` | (907.5, -15.0) | `src/sim/railway-line-layout.ts:54`, `tools.ts:77-85` |
| Server reach for `rail.axe`: 340 cm from `LINE1_AXE_STAND` | | `src/world/railway-server.ts:222` |
| The pedestal `LINE2_BOILER`, a plinth with its top 0.6 m up, radius 1.15 to 1.3 m. **It is drawn and solid only once the boiler is cast** | (922.0, -1.17), ground y 18.0 | `src/entities/railway/boiler-view.ts:105,139,433-441` |
| Hardwoods 209 / 232 | (898.8, -46.8) / (921.2, -45.2) | `src/sim/railway-line-layout.ts` `LINE1_HARDWOODS` |
| The forge's bill board: "The forge" and "logs n/24", then n/32; off once lit | beside the frame's receiver | `stations.ts:244-262,375-387`; `line2-view.ts:1132-1138` |
| The lit edge: fanfare, whistle (default range), dust; then `forge-finish.ts` starts the roof show at once (beams, a two-guy crew from `folk.crewStart`) | | `line2-view.ts:1069-1074`; `forge-finish.ts:283-304` |

Both offers are optional on the loop (`npm run loop -- node axe` and `node pack`: "requires: forge"). The seed
route asks for the axe before the forge is lit, so **every seed stage past the forge keeps the axe unclaimed**
(`test/railway-ops.test.ts:9`). Seeds from `q5-done` on show the boiler on the pedestal and the axe waiting, both at
once.

## Design

### Sync kinds and authority

Nothing here adds an op, a component field, a save key, a presence key, a message or a tunable.

- **Server state, unchanged:** `forge.used`, `forge.lit`, `rail.pack`, `rail.axe`, the boiler row and
  `works.breaker`. The rules (`rail.pack`, `rail.axe` in `railway-sys-line1.ts:249`) are unchanged. `rail.axe` stays
  unpredicted (`railway-predict.ts:55` does not list it). `rail.pack` stays predicted.
- **Server validation, changed (step 4):** `rail.axe` is judged from the pedestal's centre instead of the old stand.
  `Actor.reach` stays at 340 cm, the same as every chest.
- **Local presentation over accepted state (steps 1 to 5):** board marks, the pack and axe models and poses, the
  little guy's errand, the axe's hot arrival, and the cut. Each view sets a quiet baseline on its first ready frame and
  on a hard or soft rebuild (`line2-view.ts` `restore()`, called from `view.ts`'s `line2.snapshot()`). Each beat plays
  once, on a live crossing of accepted state, and never on prediction, a reload or a late join. Animation never gates
  a prompt: the offer is live, and its model is visible, from the accepted edge.
- **Claims, unchanged:** the opener gets `reward-reveal.ts`'s card (its `from` becomes the new model's spot),
  friends get `ability-arrival.ts`'s flourish, and everyone gets the upgrade.

### New and changed files

| File | Change |
| --- | --- |
| `src/entities/railway/reward-glyph.ts` (new) | Canvas-2D silhouettes for the boards: `drawRewardGlyph(g, kind: 'pack' \| 'axe', x, y, size, ready: boolean)`. The pack is two uprights, three bars and two straps; the axe is a haft and a head. `ready: false` is an ink outline on the paper, the promise. `ready: true` fills it in wood and steel inside a ring of gold dashes, the yard's existing "waiting for you" mark (the rack board's gold dashes). No three.js. |
| `src/entities/railway/stations.ts` | `setTag(on, status?, marks?: readonly RewardMark[])`, with `type RewardMark = { kind: 'pack' \| 'axe'; ready: boolean }`. After `paintTwoLines`, the marks are painted in a right-hand slot of the 2.2 × 1.1 m board, both faces. They join `painted`'s cache key. No new words. |
| `src/entities/railway/forge-rewards.ts` (new) | Local view, created by `line2-view.ts` beside `finish`. It owns the pack's display and its errand, and the axe's display, poses and hot arrival. API: `update(dt)`, `restore()`, `axeArrives()`, `packTarget()`, `axeTarget()`, `packAt()`, `axeAt()`, `inspect()`. Tunables at its top: `FORGE_REWARDS = { cutNear: 40, roofHoldMax: 5, cool: 3, packCap: 12, packSelf: 1.5, packShow: 1.5, axeShow: 1.4 }`. |
| `src/entities/railway/tools.ts` | Loses the two crates, the axe stand mesh and its static box. Keeps the prompts, the accept handlers and the worn pack. Takes `forge-rewards`'s anchors for the targets, the reveal `from` and `inspect()`. |
| `src/place/folk.ts` | `crewStart(x, z, n = 2, scaffold = true)`. `scaffold: false` leaves the two guys on the forge's scaffold hammering. |
| `src/sim/railway-line2-layout.ts` | `LINE2_AXE = { x: LINE2_BOILER.x, z: LINE2_BOILER.z, reach: 340 } as const` (step 4). |
| `src/sim/railway-line-layout.ts`, `src/place/layout.ts`, `src/place/meadow-field.ts` | Delete `LINE1_AXE_STAND` and `AXE_STAND`, and the meadow's `[AXE_STAND, 3]` clearing (step 4). |
| `src/world/railway-server.ts` | `case 'rail.axe': return near(LINE2_AXE.x, LINE2_AXE.z, LINE2_AXE.reach);` (step 4). No new import file, so the server image lists are unchanged. |
| `src/entities/railway/boiler-view.ts` | The pedestal is drawn and solid once the forge is lit, not only once a part is cast (step 4). |
| `src/entities/railway/forge-cut.ts` | `forgeCut(part: 'boiler' \| 'breaker' \| 'axe')` and an `AXE_VIEW` (step 5). |
| `src/entities/railway/forge-finish.ts` | Option `hold?: () => boolean`: the `idle` stage waits while it holds, for at most `roofHoldMax` s (step 5). |
| `src/entities/railway/line2-view.ts` | Board marks (step 1), creating `forge-rewards` (step 2), the cut and the lit whistle's range (step 5). |

### The pedestal is shared: the axe never blocks a cast

The boiler (cast when Q5 is laid, `railway-sys-line2.ts:448`) and the breaker (cast when the boiler is fitted) use
the same pedestal later. The owner played both waiting there together (playtests, 14 November). An unclaimed axe must
not delay them: the axe is optional, and holding the boiler back for it would put Q5's route behind an optional
pickup. So:

- With nothing else on the pedestal, the axe stands upright on the plinth's top in a small timber block. Its head is
  up and its blade's edge turned toward hardwood 232.
- While the boiler (`boiler.state === 'pedestal'`) or the breaker (`works.breaker === 1`) waits, the axe leans
  against the plinth's north face on the ground. It is clear of the hung part, the crane's hook and `part-hoist.ts`'s
  three lookers, who stand on the forge side at 3.1 m.
- Both poses are derived from accepted state every frame (a snap, no edge), so a reload shows the right one.
- Both sides measure reach from the **pedestal's centre**: the server's `LINE2_AXE` point and the client's
  `inReach(axeAt)`. Only the prompt's `at` and the card's `from` follow the model. In the lean pose, no prompt is
  ever offered that the server would refuse.
- With a part and the axe both waiting, the boiler's 6.6 m take and the axe's 3.4 m open can both be offered; the
  existing facing pick (`interact-pick.ts`) chooses between them. Both are real actions; nothing is stolen.

### The hardwoods from the pedestal (looked at, 17 November, `q1-done`)

Three stills, from `npm run look -- --rail-seed q1-done`, in `.look/`:

- `ped-hw232-still.png`: camera (923, 21.5, 4) looking at hardwood 232. The broadleaf is at frame centre, 44 m north,
  past the forge's east wall, with a near pine to its right.
- `ped-hw209-still.png`: looking at hardwood 209. The forge building covers it.
- `forgecut-north-still.png`: the boiler's existing cut camera (`forge-cut.ts` `VIEW`). Hardwood 232 is in the
  background at centre, the lit forge with its glowing mouth on the left.

So one of the two hardwoods the axe opens is in sight from the pedestal, and the cut can frame the axe with it.
`AXE_VIEW` is a nearer, lower version of that camera, 5 m south of the plinth and looking north:
`from [1.4, 1.7, 5.2]`, `to [1.2, 1.6, 4.6]`, `at [-0.2, 1.0, -1.6]`, metres from the pedestal's foot. The axe is in
the foreground, the forge's mouth to the left and hardwood 232 about 10° right of the look direction. These are
starting numbers; step 5's still settles them.

Legs at 5.6 m/s: unload point → pedestal 10.8 m (2 s); pedestal → hardwood 232 44 m (8 s). Before: unload → old stand
14.8 m (2.6 s); stand → hardwoods 33 m (6 s). Unload → pack 8.5 m (1.5 s), unchanged.

### Who sees the cut (folded into the lit forge's roof show)

On the live lit edge (`litShown < 0 && fg.lit >= 0`, `line2-view.ts:1069`), in this order:

1. The existing fanfare and dust play as now. The whistle gains `FORGE_CALL_HEAR` (900 m), so a friend chopping far
   off hears the forge light.
2. **The cut**, for every player in the room (owner, 17 November; was: on foot within 40 m): `switchCamera.play(pos, pos, at,
   FORGE_CUT.seconds, 0.01, { cutIn: true, back: FORGE_CUT.back, end: { pos, to, at }, onCut: rewards.axeArrives,
   onHome: faceForge })`, with `switchKind = 'forgeAxe'` (add it to the union at `line2-view.ts:127`). It reuses the
   pull-out's existing rules: it queues behind a reward card, waits while gliding, plays for a bench rider but not in
   a vehicle seat, plays nothing under reduced motion, and can be skipped with Interact after 0.8 s. `faceForge` hands
   the camera back looking toward the pedestal. No forge-call plume, no repeat calls and no crane: steam and the
   crane stay the heavy parts' language.
3. If `play` returns false, `rewards.axeArrives()` runs at once. It runs at most
   once per edge. If the queued cut has not landed `roofHoldMax` s after the edge, it runs anyway, so a cut dropped
   from the queue never leaves the axe glowing.
4. **The roof show waits for the cut:** `createForgeFinish(…, { hold: () => switchKind === 'forgeAxe' &&
   (switchCamera.inspect().active || switchCamera.inspect().pending) })`. The beams drop in as the camera comes home.
   For anyone whose cut does not play (reduced motion, a vehicle seat), `hold` is false and the show starts as now.

Never on a reload, late join or resync: `restore()` sets `litShown`, the axe is shown cool, and `forge-finish`
snaps done, as now.

`axeArrives()`: the pedestal's axe model (its own material clone; the cards share `tools.ts`'s) starts forge-hot with
an orange emissive (`#ff7a2a`) and cools to steel over `cool` s. On arrival there is one `clank` at the pedestal and
one burst of about 12 sparks from the shared pool (`emit`). Before arrival, in the moment a queued cut waits, the axe
shows hot and still: it is never hidden while it is offered.

### The pack: a little guy knocks it together

On the live crossing of `line2PackReady` (false to true, never on restore), with `rail.pack` false:

1. The pack shows **bare**: `gear.packParts()` without its `packstrap` and `s` parts. It stands upright on a small
   timber block at `LINE2_PACK`, scaled by `packShow`, facing the unload point. It is offered from this frame.
2. `folk.crewStart(pack.x, pack.z, 1, false)` takes the nearest strolling villager. The two scaffold guys keep
   hammering the walls the 32 logs pay for. The guy walks to the frame's foot on the pack's side, picks up an offcut
   (one 1.2 m timber on his shoulder, posed like `forge-finish.ts`'s `carried`), carries it to the pack
   (`crewSend(…, true, pack)`) and hammers there (`crewSend(…, false, pack)`) for 1.4 s.
3. **Done:** the straps appear, with a wooden knock (`thump`) and a small dust ring; `crewEnd()`.
4. Fallbacks: if no villager is free, the pack completes by itself after `packSelf` s with the same knock. Each leg
   counts as arrived after 6 s, and the whole errand stops at `packCap` s. A claim accepted mid-errand ends it
   (`crewEnd`, the model hides). `restore()` and reduced motion snap to done with no crew.

The crew is one global in `folk.ts`, shared with the roof show. The two beats cannot overlap (24 logs to 56 needs at
least two more deposits at 16 a carry), and the pack errand calls `crewEnd` on any restore.

### The boards foreshadow (decided rule: a station that grants an upgrade shows it)

In `line2-view.ts` around `:1132`, from accepted state:

| Forge state | Board | Marks |
| --- | --- | --- |
| `used < 24` | "The forge", "logs n/24" | pack, promise |
| `24 ≤ used`, not lit | "The forge", "logs n/32" | pack, ready (while `!rail.pack`); axe, promise |
| lit | "The forge", no small line | the ready marks still unclaimed: pack if `!rail.pack`, axe if `!rail.axe` |

The board's visibility becomes `(pathOpen && unlit && railPhase done) || (lit && marks.length > 0)`. After the forge
lights, the board stays up until both rewards are claimed, then goes, as it does today. This matches the
finished-deposits brief's reading of the same call (a granting station keeps its clue until the upgrade is
claimed). Other granting stations are out of scope (see Open questions).

## Steps

Each step leaves `node dev/ship-check.ts` green, updates `docs/game-design/place.md`'s proper-axe and pack lines
(`:180`, `:403`, and the pack's) for what it changes, and attaches its inspected still (`scripts/pr-shot.sh`). Looks
use a disposable production room.

- [ ] **1. Look seeds (dev data only).** In `src/sim/railway-seeds.ts`, add stages `forge-frame-last` (the forge at
  23/24, the player with a log on their back next to the unload point) and `forge-lit-last` (55/56, the pack
  claimed, carrying a log), built from accepted ops through the existing route helpers (`railway-seed-route.ts`).
  Do not add them to `JUMPS`. Run `npm run checkpoints -- forge-frame-last forge-lit-last`, then regenerate goldens
  (`GOLDEN=1 node --test --test-concurrency=1 'test/railway-golden-*.test.ts'`) under the owner's seed-goldens call.
  **Check:** the keyed golden comparison changes only the two new stages. **Look:** `npm run look -- --rail-seed
  forge-frame-last --cam <unload approach>`: the board reads 23/24.
  *Risk: low. Independent review: the keyed golden comparison only (owner call, seed goldens).*

- [ ] **2. The boards foreshadow.** Add `reward-glyph.ts`, `stations.ts`'s `marks`, and `line2-view.ts`'s table
  above. **Check:** ship-check. **Look:** three stills of the board from the unload approach at follow height:
  `forge-frame-last` (pack outline beside "logs 23/24"); `forge-frame-last` plus one `--action` deposit (32-log
  board, gold-ringed pack and outlined axe); `q1-done` (lit board, axe ready only; the seed route has claimed the
  pack). Each glyph must read at 8 m. *Risk: low. Self-review.*

- [ ] **3. The pack, as the pack, built by a little guy.** Add `forge-rewards.ts` with the pack half only: display,
  errand, restore. Add `folk.ts`'s `scaffold` flag. Point `tools.ts`'s pack target and reveal at it and delete
  `packChest`. **Check:** ship-check; the railway bot segment that claims the pack (`npm run checks-for` names it)
  still finds `reward.tools.packChest` (`dev/look/bots/railway.ts:1759`). **Look:** `forge-frame-last`, `--action` makes the 24th deposit, `--video
  --seconds 14`, framed from the unload approach. Watch at 1×: the board clue, the frame's last timber dropping, the
  guy fetching, carrying and hammering, then the pack complete; the scaffold pair still hammering. Then a reload
  still: the pack complete, no guy. Then reduced motion: complete at once. *Risk: low to medium (the shared crew).
  Self-review against the restore rules.*

  Steps 1 to 3 can ship before step 4.

- [ ] **4. The axe waits on the pedestal (pickup move).**
  - Authority: `LINE2_AXE` in `railway-line2-layout.ts`; `railway-server.ts`'s `rail.axe` case; delete
    `LINE1_AXE_STAND` and `AXE_STAND`; repoint `dev/loop/graph.ts:432`, `dev/loop/run.ts:606`,
    `dev/scenarios/world-inputs.ts:107,127`, `dev/level/home-station-page.ts:95` and `dev/level/rail-map.ts:900`
    (as "the axe on the pedestal"). In `dev/level/machine-clearance.ts:281-288`, drop the stand's anchor check and
    obstacle, and add the plinth (cylinder r 1.3, h 0.6 at `LINE2_BOILER`) as an obstacle from the forge's lighting
    on. Remove `meadow-field.ts`'s clearing.
  - View: `boiler-view.ts` draws the pedestal and its body when `cast || forge(w).lit >= 0`. `forge-rewards.ts`
    gains the axe: model, upright and lean poses, `axeAt()` (the pedestal's centre at plinth height) and
    `axeTarget()` (the model's head). Arrival is not wired yet: on a live edge the axe simply appears cool.
    `tools.ts` deletes `chest`, `stand` and its static box, and uses those anchors.
  - Tests, all lockstep or validation: in `test/railway-line-authority.test.ts` (or beside it), `railValid` accepts
    `rail.axe` from 3.3 m off the pedestal's centre after lighting and refuses it from the old stand at (907.5, -15)
    and from 3.5 m off. In `test/halt-lever-place.test.ts:74`, add the axe (reach 3.4 m from `LINE2_AXE`) to the
    disjointness test against the forge deposit circle and every halt lever's knob.
  - **Check:** ship-check; `npm run loop -- run` (no change in order or softlocks); `npm run level-check`
    (machine-clearance must pass with the plinth standing from lighting; if the machine's crossing envelope hits
    it, stop and report: don't move the pedestal); the railway bot's axe leg (`dev/look/bots/railway.ts:1790` walks
    to `reward.axeChest`) and `coop-unlock.ts`'s axe shot.
  - **Look:** `q1-done` from the unload approach: the plinth stands with the axe upright on it, and Open is offered
    from 3 m. `q5-done`: the boiler hung by the crane and the axe leaning against the plinth's north face, clear of
    the hook and the lookers; Open offered on the axe's side; the take boiler prompt still offered.
  - *Risk: **high** (server validation, the sim catalog, a static collider appearing earlier in the yard).
    **Independent review required** before ship, against room-safety "Don't", mixed-builds and the lever
    disjointness test.*

- [ ] **5. The forge makes the axe: hot arrival and the cut.** Add `forge-cut.ts`'s `'axe'` view; `forge-rewards`'s
  `axeArrives()` and its fallback timer; `line2-view.ts`'s edge sequence (whistle range, the near test, the
  `forgeAxe` shot, `faceForge` on home); `forge-finish.ts`'s `hold`. **Check:** ship-check. **Look:**
  `forge-lit-last` with `--action` making the 56th deposit at the unload point. One `--video --seconds 8` at 1×: the
  cut lands within a beat of the fanfare; the axe arrives orange and cools on the plinth with the forge's mouth and
  hardwood 232 in frame; the camera comes home facing the pedestal; then the beams drop in. Plus the cut's first-
  frame still, inspected for the halt post and road furniture (up to three rounds of `AXE_VIEW` tuning, per
  verification.md). Then a reload: the axe cool, no cut, the roof finished. Then `--players 2`, one at the unload
  point and one 60 m off at the hardwoods: only the near one gets the cut; the far one hears the whistle; each sees
  one arrival. *Risk: medium (a camera takeover on a co-op live edge, and the roof show's timing). **Independent
  review required**, against the pull-out's rules and the forge call's live-edge rule.*

**Checkpoint (after step 5):** `npm run check`; `npm run loop -- run`; the railway bot's forge-to-hardwoods segment
from `npm run checks-for`; and the brief's shared-claim look. With `--players 2`, vary who opens the pack and who
opens the axe. Expect: one card for the opener, the flourish for the friend, both backs upgraded. Rejoin once with
the axe waiting (cool axe on the plinth, no cut, the board's ready mark) and once after the claim (no axe, the board
gone). No `test:net` (no wire or room-interface change). No `perf` (two small models, a few board repaints, no light).

## Level findings

- `npm run level-check` on today's tree (17 November): 21 reports, 0 failures. None is in the forge yard; they are
  track kinks elsewhere and planned lines. No check covers the pedestal today. `machine-clearance.ts` checks only the
  old stand (`:281-288`).
- The plan places one new solid thing earlier: the plinth, from the forge's lighting instead of Q5. The machine's
  line-two crossing starts right after lighting (`line2-view.ts:1139`), and the plinth is 3.4 m from line 1's track
  (`home-passenger-bay.ts:581`). Step 4 adds the plinth to machine-clearance's obstacles and must pass.
- Nothing becomes reachable early. The axe still needs a lit forge (sim rule) and the pack its first bill. The
  pedestal is on the forge yard's open ground, where the bot already takes the boiler.
- The old stand's 2.2 m box and its meadow clearing go. A flat meadow patch at (907.5, -15) is not a reach target.

## Risks

- **Room safety.** No effect in `apply`; every beat follows replicated state on a live edge. No prompt the server
  refuses: reach is measured from the same point on both sides, and the lean pose moves only the model. A queued
  `rail.axe` is not taken as done (unchanged: `rail.axe` is not predicted; the card waits for `onAccepted`). No new
  server import, so `server/Dockerfile`, `dev/server-build.ts` and the deploy paths are unchanged
  (`test/server-image.test.ts`).
- **Mixed builds and `WORLD_NS`: no bump.** No op, component field, save key, catalog entry or wire shape is removed
  or reshaped. `rail.axe` keeps its shape and its boolean. Only the point validation measures from moves; precedent
  is `LINE2_HOOK`'s move ("a position only, no saved field holds it", `railway-line2-layout.ts:170-172`). Under
  "No old builds in development", an old tab that asks from the old stand is refused, as accepted. A save with the
  axe unclaimed loads and shows it on the pedestal. Replay fixtures are unchanged: the sim's axe rule and every
  seed's op stream are untouched (step 1 adds stages; it changes none).
- **Shared crew global** (`folk.ts` `crew`): handled above. `forge-finish.ts` and the pack errand both `crewEnd` on
  restore.
- **Hotspots:** `line2-view.ts` (1,446 lines) gains one table and one edge branch; the rest goes in `forge-rewards.ts`.
  `tools.ts` shrinks.
- **In flight:** `npm run inflight` (17 November) lists three ship branches. None touches a file in this plan
  (checked against the full file lists of `ship/matias-franco-b072424` and `ship/matias-franco-d87847d`). The P3
  rail-rack move in the backlog is a coordination point (`stockSign` and the rack's board), not a dependency.
- **Copy:** no new words; the boards gain only silhouettes. No line of The Boogler's is touched; no suspect lines.

## Open questions

1. **Other upgrade-granting stations.** The owner's rule reads wider than the forge. This plan does only the forge's
   two bills. *Recommended:* the finished-deposits brief, which already carries the same call for shut stations,
   takes the rest.

## Design review (2026-11-17)

Run by the planner on this plan, after rereading it from the top. Sources: DESIGN.md, the owner-calls index (world
signs, no old builds, no bump hold, simple motion, iterate fast, seed goldens), the rewards Current rules, the brief
and its review, home-flow row 8, the 14 November playtest note on the shared pedestal, and the looks above.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | A little guy builds the pack frame from the frame's last timber, on the 24th log's live edge | Decided | [Owner, 17 Nov](../decisions-rewards.md#d-2026-11-17-forge-made-rewards) |
| 2 | Granting stations foreshadow on their board; the first bill shows the pack | Decided | Same entry |
| 3 | The 32-log bill shows the axe (it grants it) | Decided | Same entry: the rule applied to the second bill |
| 4 | The axe waits on the forge's pedestal, with a short cut as the forge lights | Decided | Same entry |
| 5 | Co-op claim unchanged | Decided | Same entry |
| 6 | Glyph form: an ink outline is a promise; filled inside gold dashes is ready and unclaimed | Default | Matches the rack board's gold "waiting" dashes |
| 7 | After lighting, the bill board stays up until both rewards are claimed | Default | Aligns with the finished-deposits brief, item 3 |
| 8 | The pack is shown as the real frame (bare, then strapped), scaled 1.5, on a timber block | Default | Brief suggestion 2 |
| 9 | The builder is a strolling villager; the scaffold pair keep hammering | Default | Keeps the 32-log build's look |
| 10 | The errand's timings: 1.4 s hammering, 6 s a leg, 12 s cap, self-assembly after 1.5 s with no villager | Default | Tunables in `FORGE_REWARDS` |
| 11 | Wooden knock (`thump`) for the pack; hammer ring (`clank`) and ~12 sparks for the axe | Default | Brief suggestion 2 |
| 12 | The pedestal stands from the forge's lighting | Default | Follows from call 4: it was hidden until Q5 |
| 13 | The axe holds the plinth; a cast part never waits on it; with a part waiting, the axe leans against the plinth, reach unchanged | Decided (owner, 17 Nov, as recommended) | Finding 2; principle 3 (an optional pickup never gates the route) |
| 14 | The axe stands upright, edge toward hardwood 232; scaled 1.4 | Default | Finding 1 |
| 15 | The axe arrives forge-hot and cools over 3 s | Decided (owner, 17 Nov, as recommended) | "The forge creates it" (owner's words), shown with no little guy competing with the roof crew |
| 16 | Who sees the cut: every player in the room, on the live edge only; existing pull-out rules otherwise | Decided | Owner, 17 Nov ([cutscenes for everyone](../decisions-rewards.md#d-2026-11-17-cutscenes-for-everyone)); was 40 m on foot |
| 17 | The cut: 2.5 s, cut in and out, skippable after 0.8 s, home facing the pedestal; `AXE_VIEW` framing | Default | `FORGE_CUT`; the existing pull-out |
| 18 | The roof show's beams wait for the cut (at most 5 s) | New, recommended | One show on one edge (brief review) |
| 19 | The lit whistle carries 900 m | Default | The forge call's range; reaches friends away from the forge |
| 20 | No plume, repeat calls or crane for the axe | Default | Brief suggestion 3 (steam and crane stay the heavy handoff's) |
| 21 | The old stand and its meadow clearing are removed | Default | Follows from call 4 |

Counts: 8 Decided, 12 Default, 1 New (after the owner's answers).

**Findings.**

1. **Sightline (looked at).** From the pedestal, hardwood 232 is in view 44 m north past the forge's east wall; the
   forge hides 209. From the old stand both were in view at about 33 m. The "key in sight of the lock" lens holds
   for one of the two. *Changed:* step 5's framing puts 232 in the cut's frame behind the axe, and step 4 turns the
   axe's edge toward it. The walk to 232 is 8 s, against 6 s before.
2. **The pedestal is shared, and seeds show it constantly.** Every seed past the forge keeps the axe unclaimed, so
   the boiler and the axe waiting together is the common case in seeds, looks and bot jump-ins. The owner has also
   played the boiler and breaker waiting there together. *Changed:* call 13 picks the lean pose; step 4 looks at
   `q5-done`.
3. **The pedestal was invisible before Q5** (`boiler-view.ts:433`). *Changed:* step 4 shows and solidifies it from
   the forge's lighting and adds it to machine-clearance, since the machine crosses right after.
4. **No refused prompts.** In the lean pose, measuring from the model would offer Open where the server refuses it.
   *Changed:* the design measures from the pedestal's centre on both sides.
5. **A cut dropped from the queue would leave the axe glowing.** *Changed:* step 5 adds the fallback timer.
6. **Flow.** The legs stay short (2 s to the pedestal, 1.5 s to the pack). Each payoff is in sight of the unload
   point where the bill is paid, so the next goal can be found. Nobody is stranded: both items are optional, and
   neither the roof show nor a cast waits on them. Co-op: two players at the bill both get the cut; a friend at the
   trees hears the forge light and finds a cool axe and a ready mark; a late joiner sees both items and the board's
   marks, with no replay.

**Owner questions** (the build proceeds on the recommendations):

1. When the boiler or breaker waits on the pedestal and the axe is still unclaimed, where does the axe go?
   *Recommended:* it leans against the plinth, within the same reach, and a part never waits for the axe. The
   alternative, making the part wait until the axe is taken, holds Q5's route back for an optional pickup.
2. Who gets the cut? *Recommended:* players on foot within 40 m of the forge when it lights. Everyone else hears the
   whistle island-wide and finds the axe waiting.
3. How does the forge show it made the axe? *Recommended:* it arrives glowing hot and cools on the plinth, with a
   hammer ring, in the cut. The alternative, a little guy carrying it out, would compete with the roof crew that
   starts at the same moment.

**Owner answers (17 November 2026):** 1, as recommended ("I think that's a fine recommendation"). 2, changed: "I think it should be everybody. And maybe we should make this a standard that cutscenes should be visible by everyone, including for getting items. That way, the shared progression is really earned if you're online." The cut plays for every player in the room on the live edge, wherever they are, under the pull-out's existing rules (it queues behind a reward card, waits while gliding, plays nothing under reduced motion, never on a reload, late join or resync); the 40 m `cutNear` is dropped. The wider standard is the [cutscenes decision](../decisions-rewards.md#d-2026-11-17-cutscenes-for-everyone); applying it to the other item reveals is outside this plan. 3, as recommended ("I like your recommendation for number three").

**Rows for [docs/agent-calls.md](../agent-calls.md)** (rewards topic, status `open`): calls 6 to 21 above that are still Default or New, one row each, citing this section (added with the owner's answers).
