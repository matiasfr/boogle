> **25 November 2026.** Planner, against main `da17cd456` (world v71: legs 4 and 5 on main on the fixed order; leg 6
> building on `codex/greybox-leg6-rules`, which takes v72 with its own bump and ships first). Docs only. Builds after
> leg 6 is on main, rebased onto it. Design review [near the end](#design-review-2026-11-25); [owner
> questions](#owner-questions) last. Nothing here waits for the owner: each step proceeds on the recommendation.

# Order as the choice: the cave leg opens beside Canopy's at the bay cut

**The decision** ([d-2026-11-25-order-choice-cave-or-canopy](../decisions-rail.md#d-2026-11-25-order-choice-cave-or-canopy),
owner, 25 November): after the bay cut both the Canopy leg and the sea cave leg open; the room picks which to build
first and gets both. "One catalog field and a world bump; leg 4's plan is revised for two open legs and a shared depot
rack before it is built." Legs 4 and 5 are already built on the fixed order, so this plan is that revision, written
against what is on main. The White Wall still follows the cave line, and the Notch the Wall. It answers leg 4's open
question 2 ([greybox-leg4](greybox-leg4.md#open-questions)) and replaces in part the fixed area order of [12
November](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered) and the "no choice to read" of [16
November](../decisions-rail.md#d-2026-11-16-batch2-fixed-order-branch-wayfinding) for these two legs.

## The answer on one screen

**Catalog.** The cave leg's `after` goes from 3 (Canopy's leg) to 2 (the bay cut) (`src/sim/railway-route.ts:227`).
That is the owner's one field, but **one field is not enough**: something past the fork must wait for *both* branches,
or a cave-first room reaches Canopy Town by the back door. Recommended: **the White Wall waits for Canopy's leg as well
as the cave's** (a new optional `alsoAfter: 3` on the `wall` spec, `railway-route.ts:240`). The Notch keeps `after: 5`,
which then implies both. So the room picks Canopy or the cave, gets both, then builds the Wall; two orders, no third.
([Question 1](#owner-questions).)

**The one-open-leg rule becomes one open leg per line.** Canopy's leg is on the bay line and the cave's on the cave line;
every other leg's `after` keeps each line to one open leg, and a test walks every order to prove it. `openLeg(w, line)`
is already per line (`src/sim/railway-queries-route.ts:59`); what assumed one leg for the whole route is the depot rack
and the held counts.

**Kit and racks.** Today every leg's rack is the one shelf `Rail.depot` / `Rail.depotRails`, counted by every open leg
(`legLack` and `legRackNeed`, `railway-queries-route.ts:181-192` and `245-255`) and reached at the first open leg's rack
only (`legRackNear`, `src/world/railway-server.ts:372`). Two open legs would see the same units on two racks 1.2 km
apart. **Each leg gets its own rack**: `Leg.rackLogs` and `Leg.rackRails` (saved), and `Rail.depot` goes back to being
line 2's Q-job depot only. `rail.depotTake` and `rail.depotRailTake` carry the leg whose rack they take from; the server
checks reach at that leg's current rack. A back's lifted units belong to one leg (`Account.liftLeg`). Where the kit goes:
- **Canopy's:** minted at the West landing by bay trains, riding ahead from the bay cut as today, unloaded onto **its**
  rack at Bell Rock (rack 1), then each head's.
- **The cave's:** section 1 stocked on **its** rack 1 at the West landing apron from Home's stock **at the bay cut's last
  lay** (the stand-in, `legKitStock`, `src/sim/railway-sys-route-kit.ts:158`); sections 2 and 3 by cave trains minted at
  the West landing.
- Both draw rails from the one forge rack (24 at most, one poured every 5 ticks, `src/sim/railway-line2-layout.ts:19-20`);
  logs are minted. Kit nobody is building waits on its rack and aboard its line's trains, visible and true.

**Both at once: yes, recommended** ([question 2](#owner-questions)). With per-leg racks nothing refuses a room that opens
both barriers, and a co-op room can split: one at Bell Rock, one at the West landing. The alternative (the first barrier
opened commits the room; the other refuses until that leg is laid) needs the same per-leg racks anyway, because Canopy's
kit is already riding ahead when the bay cut ends, and it adds a refusal that tells instead of shows.

**Barriers and boards.** Before the bay cut is laid: the plug refuses "After the bay line (placeholder)" with the pick
held (today "After the line to Canopy (placeholder)", `src/entities/route-greybox/leg-view.ts:1365`); Canopy's barrier
"No line beyond yet" as today. At the bay cut's last lay both legs open together: both barriers take their keys (the
seeds, held since leg 2; the pick, since leg 1); Canopy's rack has its kit and the cave apron's rack fills at once. After the room opens one,
the other stays open. In a cave-first room at Port Quay the Wall's board keeps "LATER" and its frame refuses "After the
line to Canopy (placeholder)" until Canopy's leg is laid.

**Bot, loop, seeds.** The bot and `npm run playthrough` take `--order canopy|cave` (canopy, the default, is today's
route). The loop runs a named `cave-first` order beside `canonical` for one to three players, both to the classic
island's post, with minutes per area for each; its barrier nodes match by gate id, not by "the nth barrier opened". Two
new seeds, `cave-first-open` and `cave-first-reached`; every existing seed stays.

**The boiler trade's hold** is already per line (`tradeBuildDone(w, line)`, `railway-queries-route.ts:155`), and leg 6
makes it count only reached legs: a line "builds" while a leg it serves is open. So a hold per line while that line
builds falls out: the bay line's pick holds while Canopy's leg is open, the cave line's (when its garage step makes it a
trade line) while the cave or the Wall is. One consequence ([question 3](#owner-questions)): a room that fits Strong on
the bay line during the bay cut and then builds the cave first keeps that hold through the whole cave leg.

**Leg 6** ships first, unchanged. This plan rebases onto it: its Notch `after: 5` is still right (the Wall now implies
Canopy), its `kitAhead` for the causeway and its reached-only hold are untouched, and its objective chain is rewritten
here with the rest.

**At the bay cut, in the world.** The last lay ends at Bell Rock beside Canopy's barrier with Canopy's kit on the rack:
the obvious next goal, as today. Across the upper deck the two empty stall pads, Canopy's and Port Quay's, stand 9 m
apart (`src/content/levels/leg2.ts:216-217`): two places to connect. Ride home and the cave apron, seen from the bay
platforms since leg 4, has its rack stocked where it stood empty, beside the plug that has refused the pick for two
legs. No new object, sign or word is needed to show the choice; every new word is a placeholder for the owner and none
is The Boogler's.

**Steps:** 1 per-leg racks, 2 the order, 3 seeds, 4 the views, then 5 the bot and the loop, and the checkpoint. Steps 1
to 4 ship together with **one world bump** (v73 if leg 6 takes v72). **Three owner questions**, one word each,
[at the end](#owner-questions).

## Sources read

AGENTS.md; `npm run map -- --kind docs`; DESIGN.md; [context](../agents/context.md) and its design-work rules;
owner-calls' index; the game-direction and design-review skills; the Current rules of
[rail](../decisions-rail.md#current-rules) and [core loop](../decisions-core-loop.md#current-rules) with the entries cited;
[lockstep](../agents/lockstep.md), [room-safety](../agents/room-safety.md), [mixed-builds](../agents/mixed-builds.md),
[sync](../agents/sync.md), [registries](../agents/registries.md); [greybox-leg4](greybox-leg4.md) in full,
[greybox-leg5](greybox-leg5.md)'s beats and Canopy rows, [greybox-leg6](greybox-leg6.md)'s design, rules and calls,
[order-picks](order-picks.md) Part B; [progression-flow-layout](../research/progression-flow-layout.md) rules 5 and 7. Code
on main: `src/sim/railway-route.ts`, `railway-queries-route.ts`, `railway-sys-route.ts`, `railway-sys-route-kit.ts`,
`railway-sys-line2.ts` (`depotTake`), `railway-components.ts` (`Leg`, `Account`), `railway-check-route.ts`,
`railway-seed-legs.ts`, `src/world/railway-server.ts` (reach), `src/adapters/railway-intents.ts` and `railway-marks.ts`,
`src/entities/route-greybox/leg-view.ts`, `dev/loop/graph.ts` and `run.ts`, `dev/look/segments.ts`, `src/world/namespace.ts`;
leg 6's uncommitted build in its worktree (`src/world/namespace.ts` at v72). `npm run models` (25 November).

## What is on main, and what assumes one open leg

| Piece | On main | Assumes one open leg? |
| --- | --- | --- |
| `SPECS` (`railway-route.ts:162-268`) | stack `after: -1`, incline 0, bay cut 1, Canopy 2, **cave 3**, Wall 4, Notch 5, causeway 6; legs 0 to 5 `built` | The order itself |
| `legReached`, `legOpen` (`railway-queries-route.ts:50-57`) | Reached when built and `after` complete | No (one `after` only) |
| `openLeg(w, line)` (`:59`) | The open home-kit leg on a line | No: per line |
| `legLack`, `legRackNeed` (`:181`, `:245`) | Count `Rail.depot`/`depotRails` as the leg's rack | **Yes**: two open legs count the same units |
| `legMintChain` kit ahead (`:212`) | A leg's kit rides ahead while `after` is the previous leg on its mint line | Needs a rule for `alsoAfter` |
| `legKitMayLoad` (`:278`) | The load check's bound on kit ahead | As above |
| `legKitArrive`, `legKitStock` (`railway-sys-route-kit.ts:72`, `:158`) | Unload or stock onto `Rail.depot` | **Yes** |
| `rackLeg`, `heldLeg` (`railway-sys-route-kit.ts:281`, `:293`) | The first open leg; the first leg with held units | **Yes** |
| `Account.legLogs`, `legRails` (`railway-components.ts:284-285`) | One back's lifted units, no leg named | **Yes** |
| `depotTake`, `depotRailTake` (`railway-sys-line2.ts:272-303`) | Take from `Rail.depot`, no leg field | **Yes** |
| `legRackNear` (`railway-server.ts:372`) | Reach at the first open leg's rack | **Yes** |
| `railway-check-route.ts:75-85` | "one leg holds any at a time": `holding.length > 1` is bad | **Yes** |
| `leg-view.ts:950-961`, `:1270-1312` | `rows().open` one index; `rack` is `Rail.depot`; feed and take prompts for that leg | **Yes** |
| `leg2Objective` (`leg-view.ts:1215-1229`) | One linear chain: Canopy, cloth, plug, cave, Wall | **Yes** |
| `dev/loop/graph.ts` `plug-gate` (`:611-624`) | Requires `canopy-3`; `reached: route barrier opened, nth 3` | Order-bound marks |
| Seeds (`railway-seed-legs.ts:176-180`) | `cave-open` takes the cloth first | Canonical only |
| Trade hold (`tradeBuildDone`, `:155`) | Per line | No |

## Design

### The catalog

- `cave`: `after: 2`.
- `Spec` and `RouteLeg` gain **`alsoAfter?: number`**: a second RAIL_LEGS index that must be complete too. `wall`:
  `after: 4, alsoAfter: 3`. Nothing else has one. An optional field keeps the stack's `after: -1` (Ring Island joined)
  as it is; a list would change it for one reader.
- If the owner answers question 1 "no" (the Wall follows the cave alone), `alsoAfter: 3` moves to the Notch instead: the
  Notch leaves from Canopy's bay station (`notch-tunnel`, bay row from halt 2) and its kit rides bay trains through
  Canopy, so it cannot open before Canopy's leg is laid whatever the Wall does.
- No section, bill, point, halt, train row or reach point moves. The catalog's geometry is untouched.

### The rules

- **Reached.** `legReached(w, k)`: built, `after` complete, and `alsoAfter` complete if it has one.
- **One open leg per line**, proved, not enforced: a test in `test/railway-route.test.ts` walks every order the catalog
  allows (a topological walk over `after` and `alsoAfter`) and asserts no two open legs share a line. The load check
  (`railway-check-route.ts`) asserts it on every loaded world.
- **Kit ahead** (`legMintChain`): a leg's kit rides ahead while the leg before it on its mint line is open and owed
  nothing more, **and its `alsoAfter` is complete**. So in a Canopy-first room the Wall's kit rides cave trains ahead
  during the cave leg, as on main; in a cave-first room it does not, because Canopy's leg is not laid, and the Wall's
  first kit is owed from Canopy's last lay (the Notch's case in leg 6: its first kit is owed from the Wall's last lay).
  `legKitMayLoad` takes the same condition.
- **Per-leg racks.** `Leg` gains `rackLogs` and `rackRails`: the kit on that leg's current rack. `legLack` and
  `legRackNeed` count the leg's own rack; `legKitArrive` unloads onto it; `legKitStock` stocks it; `legKitHome` and
  `legYardHome` unchanged. A leg's rack moves with its sections as `legRack(leg, laid)` does today; what is on it at a lay
  stays on it (the head's rack is the same shelf moved on, as `Rail.depot` was). At the leg's last lay whatever is left
  on its rack (units fed from elsewhere, so the rack's were not needed) goes home, logs unmade and rails to the forge
  rack, as a completed yard leg's yard does (`legYardHome`); today it would stay on `Rail.depot` and show on the next
  open leg's rack. `Rail.depot`/`depotRails` are line 2's Q
  depot only and stay 0 after the last Q job; line 2's rules are not touched (rule 14).
- **Taking from a rack.** `rail.depotTake` and `rail.depotRailTake` gain an optional `leg` (a RAIL_LEGS index). With it,
  the system takes from that leg's rack, refused unless the leg is open; the server's reach check is `at(legRack(leg,
  laid))`. Without it, the Q-job depot exactly as today; after the last Q job a take without `leg` is refused.
  `legRackNear` goes. Prediction unchanged: both ops are in `TAKES` (`src/adapters/railway-intents.ts:184-195`) and
  predict with the same rule.
- **Held units.** `Account` gains `liftLeg` (int, −1 none): the leg its `legLogs`/`legRails` were lifted from. A lift
  from leg B's rack by a back holding leg A's lifted units first counts A's off that back (owed again; a surplus goes
  home, as every doubt does today). Feeding counts off the back's own leg. `heldKit(w, k)` sums only accounts with
  `liftLeg === k`. `rackLeg` and `heldLeg` go; `trimLegHeld` runs per leg. The check's "one leg holds any" becomes "each
  leg's held counts equal the sum over accounts lifted from it".
- **Barriers.** No rule change: `rail.gate` opens once its key is held and its leg is open (`railway-sys-route.ts:167`).
  The plug is open-able from the bay cut's last lay; Canopy's as today.
- **Trains.** No change: both lines run their fleets on their own legs' stages. A bay train carrying Canopy's kit that no
  rack can take while the room builds the cave keeps running with it aboard (the stone stop, ruling D, as for any kit
  riding ahead); a Strong train's railhead hold is capped and yields as today.
- **Saves.** The new `Leg` and `Account` columns are saved shape: the bump.
- **Invariants** (`railway-check-route.ts`): no two open legs on one line; each leg's rack within its remaining bill
  less what is fed and held; conservation counts every leg's rack (the line 2 and steel checks that sum `r0.depot` for
  minted logs and forge rails, `railway-check-line2.ts:104,127` and `railway-check-steel.ts:59,63`, add the legs'
  racks to the same sums).

### What a player sees and does at the bay cut

The bay cut's last lay is at Bell Rock (leg 2). The beats from there, solo, arithmetic not measured:

| # | Canopy first (today's route) | Cave first |
| --- | --- | --- |
| 0 | The last lay at Bell Rock. Canopy's barrier stands past the buffers, its rack holding the kit bay trains brought ahead; the two stall pads on the upper deck are both empty | Same |
| 1 | Open Canopy's barrier (seeds), build leg 3 to Canopy Town, take the cloth, ride home | Ride the bay line home to the West landing (about 80 s); the cave apron's rack, empty since leg 4, is full beside the plug |
| 2 | At the West landing the plug opens to the pick; build the cave line to Port Quay (leg 4) | Open the plug, build the cave line to Port Quay; Port Quay's stall rises at Bell Rock |
| 3 | At Port Quay the Wall's frame and its kit; build the Wall (leg 5) | At Port Quay the Wall's board says LATER; ride home, ride the bay line to Bell Rock, where Canopy's kit has waited on its rack; build leg 3, take the cloth |
| 4 | The Notch, the causeway, the post (leg 6) | Ride home and out the cave line to Port Quay; build the Wall, then leg 6 |

The cave-first route rides the cave line twice more than the Canopy-first one (out to Port Quay and back, then out again
for the Wall): about 3 minutes of riding, the price of the other order. The checkpoint measures both.

**Show, don't tell** (principle 11). Nothing is added to say "choose". The choice is shown by the world changing in
two places at one moment: Canopy's rack has its kit beside the train you arrive on, and the cave apron's rack, which a
room has walked past empty since leg 4, is full when you ride home. The plug that refused the pick for two legs opens
to it. The two empty stall pads at Bell Rock say there are two places to connect. **Telegraph** (principle 7): both
locks have been in view since the first visits; the plug since day one.

**Words** (placeholders for the owner, none The Boogler's, none changed or read as suspect):
- The plug with the pick held before the bay cut is laid: **"After the bay line (placeholder)"**.
- The Wall's frame 1 at Port Quay while the cave leg is laid and Canopy's is not: **"After the line to Canopy
  (placeholder)"**; its end board keeps "LATER" until the Wall opens.
- The objective (play record only; the route has no on-screen objective line, `leg-view.ts:1250`): after the bay cut,
  **"Build the line to Canopy Town or the cave line to Port Quay (placeholder)"** until either barrier is opened; then the
  open leg's line; after the cave in a cave-first room, **"Ride to Bell Rock and build the line to Canopy Town
  (placeholder)"**; after both, the Wall's line as today.
- Nothing else changes: barrier, rack and frame prompts, boards and stalls keep their words.

**Co-op.** Both barriers take keys the room holds, so two players can each open one and build both lines at once, one
feeding at Bell Rock, one at the West landing, meeting at the West landing where both lines start. A friend who joins
at the Village is a short walk from the cave apron. **Solo** works in either order; a solo player who opens both and
wanders between them loses only time.

### Sync kinds and authority

| Piece | Kind | Authority | Where |
| --- | --- | --- | --- |
| The catalog's `after`/`alsoAfter` | Catalog data | none (pure) | `railway-route.ts` |
| Each leg's rack (`Leg.rackLogs`, `rackRails`), each back's `liftLeg` | Server (saved) | server, in the tick's apply | `railway-components.ts`, `railway-sys-route-kit.ts` |
| The takes with `leg` | Server command, predicted (in `TAKES`) | server | `railway-sys-line2.ts`, `railway-server.ts`, `railway-intents.ts` |
| Rack counts, prompts, objective, refusals | Local, from the mirrored rows | each tab | `leg-view.ts` |

No new op, message type, presence field, pad slot or registration. **Wire:** one optional field on two existing ops
and two saved columns: a clean break under the bump (dev phase, no compatibility code). **Lockstep:** integers only; no
new arithmetic beyond sums and comparisons; the rack moves no float.

## Steps

Each step leaves `node dev/ship-check.ts` green. **Steps 1 to 4 ship together as one world bump** (the take ops' field
and the views that send it must ship with the rules). Step 5 after. Models are `npm run models`' rows (25 November);
every step that touches `src/sim`, `src/world` or the wire gets an independent review before merge (gpt-6.2-astra
medium first). Sizes are estimates.

- [ ] **1. Per-leg racks (L; "High-risk implementation": gpt-6.2-astra medium).** No order change yet. Files:
      `src/sim/railway-components.ts` (`Leg.rackLogs`, `rackRails`; `Account.liftLeg`, default −1),
      `railway-queries-route.ts` (`legLack`, `legRackNeed`, `heldKit` per leg; comments that say "one leg is open at a
      time" corrected), `railway-sys-route-kit.ts` (`legKitArrive`, `legKitStock`, `legKitLifted`, `legKitPut`,
      `trimLegHeld`, `legKitRelease`; `rackLeg` and `heldLeg` gone), `railway-sys-line2.ts` (`depotTake` and
      `depotRailTake` with `e.leg`), `src/world/railway-server.ts` (reach at `legRack(leg, laid)`; `legRackNear` gone),
      `src/adapters/railway-intents.ts` (`depotTake(leg?)`, `depotRailTake(leg?)`), `railway-check-route.ts`,
      `railway-check-line2.ts`, `railway-check-steel.ts` (the sums), the seeds that take from a leg rack
      (`railway-seed-legs.ts:79-80` and `railway-seed-route.ts`'s leg takes) passing `leg`. Checks: the existing route
      rule tests (`test/railway-route-rules.test.ts` and the per-leg rule files) unchanged in meaning; **every seed reaches
      its stage at the same tick as before** (the kit moves through the same steps, only counted on another row): if
      one does not, find the changed input before re-pinning (lockstep rule); a host case in `server/test/` (beside
      `railway-steel-host.test.ts:617`'s cave take) that a take with `leg` is accepted at that leg's rack and refused at
      another open leg's; `npm test` in `server/` (rule 52).
- [ ] **2. The order (M; "High-risk implementation": gpt-6.2-astra medium, high for the fuzz).** Files:
      `railway-route.ts` (`cave` `after: 2`; `alsoAfter` on `Spec` and `RouteLeg`, `wall` `alsoAfter: 3`),
      `railway-queries-route.ts` (`legReached`, `legMintChain`'s kit-ahead condition, `legKitMayLoad`),
      `railway-check-route.ts` (no two open legs on a line), `src/world/namespace.ts` (**the bump**, its dated line).
      Checks, as cases in existing files (rule 36: no new unit test file): `test/railway-route.test.ts` walks every order
      and asserts one open leg per line; `test/railway-leg4-rules.test.ts`: the plug opens from `bay-reached` with the
      pick; the cave rack 1 is stocked at the bay cut's last lay and Canopy's kit unloads on Bell Rock's rack in the same
      run, each rack showing only its own leg's units; a player takes from one rack and feeds the other leg's frame and
      both legs' owed kit stays right; both legs lay in either order; the Wall refuses (`rail.legStock`) after the cave
      until Canopy's last lay, then opens, and its kit does not ride ahead in a cave-first room. **The service fuzz**
      (`test/helpers/railway-route-rules.ts`): a group with the bay and cave lines building at once (both legs open,
      accepted lever calls on both lines, Strong on the bay line), the default run timed and under a quarter of its
      budget (rule 60); the long run (`ROUTE_GATES=1`, four seeds, 20,000 ticks a mode) pasted here before the bump
      ships, with legs 2 to 5's long suites re-run beside it. The whole server suite, `npm run test:net` (rule 55).
- [ ] **3. Seeds (S; "High-risk implementation": gpt-6.2-astra medium).** `src/sim/railway-seed-legs.ts` and
      `SEED_STAGES` (`railway-seeds.ts`) from `bay-reached`, accepted ops only, each wrapped in `need` (rule 53):
      **`cave-first-open`** (the plug open, both racks stocked, Canopy's barrier shut) and **`cave-first-reached`** (the
      cave laid, Canopy unopened, a little running time). The canonical seeds keep their meaning: `canopy-open` onward
      and `cave-open` (which takes the cloth first) are today's route. Their golden shard; `src/world/railway-jump.ts`
      rows (`cave-first-open` lands on the cave apron between rack 1 and frame 1; `cave-first-reached` keeps the
      spawn). Checks: `test/railway-jump.test.ts`; each stage's load check; the whole server suite and `npm run
      test:net`.
- [ ] **4. The views (M; "Player-visible implementation": gpt-6.2-astra medium).** `src/entities/route-greybox/leg-view.ts`:
      `rows()` keeps every open leg (not one index) and each leg's rack from its `Leg` row; feed and take prompts for
      every open leg in reach, the takes passing the leg; `leg2Objective` written as a function of the rows for both
      orders (the words [above](#what-a-player-sees-and-does-at-the-bay-cut)); the plug's refusal before the bay cut;
      the Wall's frame refusal and board while Canopy is unlaid. `src/entities/railway/train-view.ts:1422` (the kit
      unload's rack) read and kept right for two open legs. `src/adapters/railway-marks.ts`: `rail.gate`'s mark carries
      `data.gate` (the play record; no wire). `docs/game-design/place.md` (the route's order) updated. Checks: the full
      ship check; the boot probe on the built site (rule 61). **What a look must show** (`.look/` stills from
      `cave-first-open`): Bell Rock's rack with Canopy's kit while the cave is being built; the cave apron's rack full
      beside the plug from the bay platforms; a take at each rack counting down only that rack; in a
      `cave-first-reached` room, Port Quay's buffers with the Wall's board still "LATER". Rule 53: the prompts and
      objective change here, so the same branch runs the bot from `bay-reached` (canonical) before it ships.
- [ ] **5. The bot and the loop (M; "Implementation from a brief or an approved plan": gpt-6.2-sol medium).** After
      steps 1 to 4 are on main. `dev/loop/graph.ts`: `plug-gate` requires `bay-2` (the bay cut laid) and `pick`, not
      `canopy-3`; `wall-1` requires `canopy-3` as well as `cave-3` (decided: the rules'); every barrier node's
      `reached` matches `{ mark: 'route barrier opened', data: { gate } }`, not an `nth`; a named order `cave-first`
      beside `pack-first` and `jump-first` in `proposeOrders` (`:1426-1433`). `dev/loop/run.ts` as the graph needs.
      `dev/look/bots/railway-legs.ts` and `dev/look/segments.ts`: `--order canopy|cave` (canopy the default); the cave
      order rides home from Bell Rock after the bay cut, builds the cave, rides back to Bell Rock for Canopy and the
      cloth, then the Wall; `RAIL_FROM` rows for the two new seeds. Checks: `npm run loop -- run` (both orders, one to
      three players); `npm run playthrough -- --from bay-reached --to port --order cave` and `-- --from
      cave-first-reached --to canopy` (pass verdicts; timings under load are not evidence); `test/loop-graph.test.ts`.

### Checkpoint (both orders playable)

After step 5, on HOTBOX, once:
- [ ] `npm run loop -- run` for one to three players, `canonical` and `cave-first`, each to the classic island's post
      with no skips: no softlock, every order probe refused as the graph says, idle over 60 s listed, **minutes per
      area for both orders** (the [route to the ending](../backlog.md#the-checkpoint-we-work-toward) checkpoint's table).
- [ ] The two bot segments above with `--order cave`, and the canonical segments re-run (a pass each, the load noted).
- [ ] **The reconnect proof with two open legs**: `railwayLegRejoin` (`dev/peer-test/ws-railway.ts`) at
      `cave-first-open`: a second tab joins; one tab lifts from Bell Rock's rack, the other from the cave apron's; the
      first leaves, the server restarts, it rejoins; both racks, both legs' held counts and both backs are exact, and
      every tab's mirror matches.
- [ ] Step 4's stills on one sheet; the boot probe on main's built site.

## The world bump

**One, in step 2's commit, covering steps 1 to 4:** v73 if leg 6 has taken v72 (the next free number otherwise; two
share one only if both are review-clean in the same batch, and none waits for another: [no bump
hold](../agents/owner-calls.md#no-bump-hold)). Ship outside the owner's sessions. Why it cannot be avoided: two saved
columns on `Leg` and one on `Account`; the meaning of `Rail.depot` after the Q jobs; an optional field on two ops; the
golden shards and seeds move. It is the route's seventh (G1, v62, v66, v70, v71, leg 6's v72, this), one over the route
plan's "six at most" ceiling of one a leg ([greybox-leg4](greybox-leg4.md#the-world-bump)); the owner's decision names
this bump, so it is his call, not an overrun.

## Decided, proposed, default

| Call | Status | Source |
| --- | --- | --- |
| Both the Canopy leg and the cave leg open at the bay cut; the room picks which first and gets both; a later bump, after leg 6's | Decided | [25 November](../decisions-rail.md#d-2026-11-25-order-choice-cave-or-canopy) |
| The Wall follows the cave line; the Notch follows the Wall | Decided | Same entry |
| A pick (Quick or Strong) holds while its line builds, one re-pick after | Decided | [Order picks answered](../decisions-core-loop.md#d-2026-11-25-order-picks-answers) |
| The cave line is offered Quick or Strong (its garage step, not this plan) | Decided | Same entry |
| The Wall also waits for Canopy's leg (`alsoAfter`) | **Proposed** | Question 1 |
| A room may build both at once | **Proposed** | Question 2 |
| The bay line's hold lasts through a cave-first room's cave leg | **Proposed** | Question 3 |
| Per-leg racks; takes carry the leg; a back's lifts belong to one leg | Default | Findings 2 and 3 |
| Kit rides ahead only when the leg's `alsoAfter` is complete | Default | Finding 4 |
| No new object, sign or board for the choice | Default | Principle 11; the review |
| The four placeholder lines | Default | Placeholders for the owner |
| Seeds `cave-first-open`, `cave-first-reached`; the bot's `--order`; the loop's `cave-first` order and gate-id marks | Default | Leg 4 and 5's pattern |

## Risks

- **Room safety.** Every transfer stays inside the tick's apply; no effect in apply; no wall clock or `Math.random`. A
  take with a `leg` out of range or not open is refused, never thrown (the server validates with `railInt`). A leaver's
  lifted units release per leg by the existing grace.
- **Mixed builds.** A clean break: dev phase, no compatibility code. The take's reach point moves from "the first open
  leg's rack" to "the named leg's rack" (rule 1): said in the ship; server and client ship together.
- **Conservation.** Moving the leg racks off `Rail.depot` touches the line 2 and steel checks' sums. The seeds reaching
  every stage at the same tick is the proof that nothing else moved.
- **Line 2** (rule 14): its Q-job depot, halts, trains and kit are unchanged; only the checks' sums gain the legs'
  racks.
- **Kit standing idle.** In a cave-first room bay trains carry Canopy's kit ahead for a whole cave leg; the bay line's
  service with kit aboard and no rack to take it is in step 2's fuzz group.
- **Hot files.** `leg-view.ts`, `railway-queries-route.ts`, `railway-sys-route-kit.ts`, `graph.ts`, `railway-legs.ts`
  are leg 6's too: this plan builds after leg 6 is on main, rebased onto it.
- **The economy model and `npm run loop`'s stand-ins** read `after`: the loop's graph is step 5's; any other reader
  of `RAIL_LEGS[k].after` (none outside `src/sim` today, by grep) takes `alsoAfter` with it.

## Design review (2026-11-25)

The planner's own review, in the same sitting; the plan was reread from the top before the calls were sorted. **Read:**
as [Sources read](#sources-read); docs/direction.md was not read again (the backlog's checkpoint, "the route to the
ending", set 25 November, is newer); docs/playtests.md's newest entries predate the greybox route (leg 4's review quotes
the one that bears: the owner pressed "Open the barrier" five times against "No line beyond yet"). **Seen:** leg 4's
still from the bay platforms ([west-apron](greybox-leg4/west-apron.png)): the hood and the apron are in view from where
a room arrives at the West landing; the rack and barrier are step 5's and not in that still. **Not seen:** no still of
either rack stocked, or of Bell Rock's pads after the bay cut; docs-only work runs no browser.

**Flow, beat to beat** (progression-flow-layout's three firm rules and its lenses):
- *The next goal can be found.* In both orders: Canopy's barrier stands beside the arriving train with its kit; the
  plug, seen since day one, opens to a key held for two legs, with its rack stocked. In a cave-first room the Wall's
  board at Port Quay says LATER and the objective sends the room to Bell Rock, where Canopy's rack still holds its kit.
- *A gate keeps its meaning.* Each barrier takes its own key; the Wall takes both lines laid. Nothing is skipped.
- *Nobody is stranded.* Both lines run from the West landing; every rack's kit is the room's; kit no leg can take goes
  home by the existing surplus rule.
- *Lenses.* Rule 5, one main line with side things: "breaking it works" with "one order choice (ALBW; the Sickle Isles
  branch)", and the owner's 6 November constraint "mostly linear, with one order choice": this is that one choice. Rule
  7, end a beat facing the next: the bay cut ends facing Canopy's barrier with a second pull behind (the "two pulls and a
  choice" exception); the cave's pull is weaker from Bell Rock, which is fine: Canopy-first stays the golden path and the
  cave rewards the room that rides home and looks. Rule 6, a world that shortens behind you: the cave-first route rides
  the cave line one extra round trip (about 3 minutes), the cost of its order.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The cave leg opens at the bay cut (`after: 2`) beside Canopy's; the room picks which first and gets both | Decided | [25 November](../decisions-rail.md#d-2026-11-25-order-choice-cave-or-canopy) |
| 2 | The White Wall follows the cave line; the Notch follows the Wall | Decided | Same entry |
| 3 | The change lands with its own bump after leg 6's | Decided | Same entry |
| 4 | Sections, bills (20 + 20), lay time and every point unchanged | Decided | [16 November](../decisions-rail.md#d-2026-11-16-batch2-greybox-section-length-and-lay-time); legs 3 and 4 as built |
| 5 | A pick holds while its line builds, one re-pick after; a line builds while a leg it serves is open | Decided | [Order picks answered](../decisions-core-loop.md#d-2026-11-25-order-picks-answers); leg 6's call 26 (a default) for "reached" |
| 6 | **The Wall also waits for Canopy's leg** (`alsoAfter: 3`): two orders, not three | **New** | Finding 1. Question 1 |
| 7 | **A room may build both legs at once** | **New** | Finding 2. Question 2 |
| 8 | **A bay-line pick keeps holding through a cave-first room's cave leg** | **New** | Finding 5. Question 3 |
| 9 | Each leg's own rack; takes carry the leg; one back's lifts belong to one leg | Default | Findings 2 and 3 |
| 10 | The cave's first kit is stocked at the bay cut's last lay; Canopy's rides ahead as today | Default | `STOCKED_LEGS` and the kit-ahead rule as built |
| 11 | Kit rides ahead only once the leg's `alsoAfter` is complete | Default | Finding 4 |
| 12 | No new object, sign or board for the choice: the two racks, the plug and the two empty stall pads show it | Default | Principle 11 |
| 13 | Placeholder words: the plug before the bay cut, the Wall's frame, two objective lines | Default | Placeholders for the owner |
| 14 | Canonical (Canopy-first) stays the default for seeds, bot and loop; cave-first runs beside it | Default | Today's route as the golden path |
| 15 | What is left on a leg's rack at its last lay goes home (logs unmade, rails to the forge rack) | Default | `legYardHome`'s rule; per-leg racks |

**Counts:** 5 Decided, 7 Default, 3 New. Every Default and New call is logged in
[agent-calls](../agent-calls.md#rail-construction-levels-and-travel) (rail), and call 8 also under
[core loop](../agent-calls.md#core-loop-pacing-and-progression). **The Boogler:** no line of his written, changed or read
as suspect.

### Findings

1. **(changed the catalog: call 6) One field opens a third order.** With only `after: 2`, a cave-first room could build
   the Wall before Canopy's leg: it would reach Canopy Town on the Wall's line (leg 5's Canopy halt, a 290 m walk from
   the bay station, [greybox-leg6](greybox-leg6.md) beat 1), see the cloth post on the deck and be refused "The line to
   Canopy isn't laid yet" (`leg-view.ts:109`) while standing there, then ride back to Bell Rock to build a line to where
   it had been. And the Notch, `after: 5` alone, would open with no bay track to Canopy, so bay trains would mint its kit
   with no rack they could reach. Something past the fork has to wait for both. The Wall is the natural one: the owner's
   "gets both" then comes before the Wall, and legs 5 and 6 keep the beats they were planned with.
2. **(changed the rules: call 7) The shared depot rack is the whole problem, either way.** `Rail.depot` is one number,
   counted by every open leg and shown on the open leg's rack. Canopy's kit is already riding ahead when the bay cut
   ends, and the cave's rack 1 is stocked the moment its leg opens, so even a "first barrier commits" rule has two legs'
   kit on the shelf at once. Per-leg racks are needed in both designs; once they exist, refusing the second barrier
   only adds a refusal that tells ("you chose the other"), the kind of "No line beyond yet" press the owner made five
   times. Recommended: both at once.
3. **(changed the rules) The take has no leg.** `rail.depotTake` takes from the shelf, and the server reaches it at the
   first open leg's rack (`railway-server.ts:372-375`): with two racks the server could not tell which a player is
   taking from. The take names its leg, and the reach is checked there.
4. **(changed the rules) Kit ahead into a leg that cannot open.** The Wall's kit rides cave trains ahead while the cave
   leg is open (`legMintChain`, `railway-queries-route.ts:212`). In a cave-first room the Wall cannot open until Canopy
   is laid, perhaps a whole leg later; its kit would ride cave trains with nowhere to go. It rides ahead only once
   `alsoAfter` is complete.
5. **(no change; question 3) The bay hold through the cave.** The trade on the bay line opens at the bay cut's first lay
   (`TRADE_OPENS`, `railway-route.ts:322-325`). A room that fits Strong then and builds the cave first keeps the hold
   while Canopy's leg is open, though nobody is building it. The definition ("while its line builds") reads it as
   building, and the room barely rides the bay line during the cave, so the cost is small; the alternative, holding
   only while the line's leg is being fed, needs a new fact for "being fed".
6. **(no change) The weaker pull.** From Bell Rock the cave is 1.2 km behind; most rooms will build Canopy first. That
   is the intended golden path, and the cave rewards the room that rides home and sees the stocked rack. If the owner
   wants the choice felt more, the loop's and bot's cave-first runs give the numbers to judge it.
7. **(no change) Co-op and late joiners.** Two players can split across the two lines and meet at the West landing; a
   friend joining at the Village reaches either rack in one ride or a short walk.

## Owner questions

None blocks the build; each proceeds on its recommendation.

1. **Should the White Wall also wait for Canopy's line?** **Recommended: yes**, so the room picks Canopy or the cave,
   gets both, then builds the Wall. No: three orders, and a cave-first room can reach Canopy Town on the Wall's line
   before its own, with the cloth there refusing.
2. **Can a room build both legs at once?** **Recommended: yes** (nothing refuses the second barrier; friends can split
   up). No: the first barrier opened commits the room, and the other refuses until that leg is laid.
3. **Does a Strong (or Quick) pick on the bay line keep holding while the room builds the cave first?** **Recommended:
   yes**, the line is building while its leg is open. No: the hold lapses while nobody feeds the line, which needs a new
   saved fact.

## What could not be verified while planning

- No still of either rack stocked or of Bell Rock's pads after the bay cut (docs-only work, no browser); step 4's stills
  show them.
- The extra riding in the cave-first order (about 3 minutes) is arithmetic from leg 4's and leg 5's beats; the loop's
  table measures it.
- That every seed reaches its stage at the same tick once the racks move onto the `Leg` rows is reasoned from the code,
  not run; step 1 proves it.
- Leg 6's built rules were read from its plan and its uncommitted worktree, not from main; this plan rebases onto
  whatever ships, and its step 2 re-reads leg 6's `tradeBuildDone` and `legMintChain` as merged.
- Whether a cave-first bay line, carrying Canopy's kit ahead for a whole cave leg, stays inside the service budget: step
  2's fuzz group.
