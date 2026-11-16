# Heavy load

Status: review follow-up on `heavy-load-fix`, 15 November 2026. The follow-up below supersedes the original tuning and limitations. Commits only; no ship or push.

## Goal

Make each haul a choice between more cargo and free movement, in the main game. Serves DESIGN 7 (Telegraph everything) and 11 (Show, don't tell), answering Grant G5/G6/G21 and queue D2. Authority: [15 November answer 2](../../decisions-core-loop.md#d-2026-11-15-grant-queue-answered).

## Design

Build **B, grounded, with gradual slowdown** from [first-line-decisions](../../brainstorms/first-line-decisions.md). Logs, stone and rails share a comfortable count of **8**, or **16** with the room's pack. Allow **50% extra**, up to **12/24** combined. A pickup stops at comfort first; a further press explicitly takes the extra. Speed stays normal through the comfortable count, then falls linearly to **45%** at maximum (walking 5.6 → 2.52 m/s; sprinting 9.5 → 4.275 m/s; review-follow-up tuning). Above comfort, no ground/air jump, hook or glide; swimming ascent remains available so water cannot trap a carrier. Existing Drop (right click / R3 / touch; hold for all) sheds cargo into recoverable piles. Deposits and the pack immediately restore movement when back below the threshold. Big objects keep their existing exclusive carry rules.

One steady bundle, growing with the actual count; rails/stone must render the new maximum. The carry HUD marks comfortable versus extra slots and keeps a short heavy-load reason and Drop instruction visible while overloaded. No sway or spill: this variant needs neither, so it does not exercise the owner's permission to reopen that part of 1 November. No new input binding or Boogler copy.

**Ownership:** Server account counts and existing `rail.*` actions remain authoritative through `railApply`; all sources use `free`/`roomFor`. Pure queries derive comfortable count, maximum and slowdown with integer counts and arithmetic only. Owner movement reads the current mirrored/predicted account; no physical state enters shared rules. Local bundle/HUD presentation follows those counts. Existing action prediction/correction, replication and verified checkpoints remain in place; no new state, op, event, component or presence field.

**Wire/save/mixed builds:** no shape additions; account validation now permits 12/24, so make a clean development namespace bump (v48 with a dated history line). Current clients only; no compatibility gates or migrations. Parent must reconcile the namespace if another change takes v48 first.

**Room:** production entry, no `?proto`, no special room. The owner explicitly chose the main game. Harness rooms are disposable test rooms only.

**Research:** [carrying and logistics](../../research/carrying-and-logistics-play.md) favors a reliable bundle and readable load. This experiment departs from its old zero-penalty recommendation under the newer owner call. Speed alone is a control with an optimum, not proof of a decision. The designer found no measured early-haul shortcut requiring a jump; this implementation tests freedom of movement versus volume across the normal route, and does **not** claim a proven Station 1–3 route trade-off or invent new obstacles. That remains a playtest question, not a build gate.

## Steps

- [x] Change `railway-queries.ts` comfort/maximum/speed queries and the existing validation through `carryMax`; update adapter/host transfer-count validation and namespace. Test boundaries, mixed materials, competing takes, drop/deposit recovery, pack, replay and save/load in pure sim tests; adjust assertions tied to the former cap without repinning unexplained goldens.
- [x] Apply the derived limit in the existing railway movement seams (sources, view, tools, hook-shot, glide); gate air jump, hook and glide including an already-active move. Preserve swim ascent and existing big-cargo behavior.
- [x] Update carry readout/HUD and carried-model capacity. Document the as-built rules in `docs/game-design/place.md`.
- [x] At the completed checkpoint, run scoped format/lint, `node dev/ship-check.ts`, routed checks from `checks-for`, and `npm run loop -- run`. Capture an overloaded walk/jump/drop proof with the existing look harness, inspect the still and motion sheet, and report limits. Commit only; parent owns independent review and merge.

## Initial implementation: level findings

No placements, colliders, terrain or routes change. No new reach gate is placed. Dropping is essential wherever a carrier needs mobility; water ascent is exempt. Early-route shortcut payoff remains unmeasured.

## Initial implementation: risks / open questions

Grounding could feel punitive or make jump-heavy bots stall if they collect past comfort; don't silently retune the game to make a bot pass. Repeated pickups must stop only at the new maximum; no source may use the old comfort cap. Shared pack changes must clear the restriction without a stale latch. Predicted restrictions may reverse on correction, like the displayed counts. The existing maximum pile/account pools can refuse a drop in an exhausted world; retain the authoritative refusal. No open owner choice blocks this authorized variant. No ship or push is authorized.


## Initial implementation notes

The normal route bots explicitly choose `carryComfort` for their travel loads; their former 8/16 assertions
now name comfort. This preserves their mobility-dependent route; the targeted heavy-load capture exercises
intentional overfill separately. No game rule was relaxed to make the bot pass.

The unchanged seed inputs only alter `gorge-mid` and `gorge-reached`: `laySection` takes depot logs and then
rails before stocking, so its second take now uses the heavy allowance. It feeds each section in fewer ticks.
The other 45 seed-stage hashes remain unchanged. The v48 golden refresh is for this intentional rule change,
not a refactor. The host trace refresh changes only 205 namespace/checksum envelopes and 2,518 snapBytes
samples; all 8,596 ordered records, inputs, state hashes, command results and replication packets remain identical.


The halt fixture changes only `stack-3` Pier `calling` (true to false), from that seed timing; catalogs, mesh
transforms, colliders, ordered prompts and accepted lever requests are unchanged. The axe op trace accepts
4 from the second hardwood where the old cap refused it; its next four state hashes follow. M12 retains all
82 client traces and their frame counts; 78 hashes change under the expanded acceptance rule. The transport
pacing tests explicitly choose comfortable loads (including their redirected-train setup), preserving every
existing timing/dwell limit instead of relaxing them for a different feeding policy. Their old-code baseline
passes the original assertions. Deliberate overfill changes kit delivery and train phase; those existing pacing
guarantees describe the comfortable-load policy, not every possible heavy-load feeding sequence.

## Initial handoff evidence

Main-game capture: `.look/heavy-load-final-still.png`, `.look/heavy-load-final-motion.png`, and
`.look/heavy-load-final-realtime.webm`; script/log `.look/heavy-{setup,action}.ts` and
`.look/heavy-look-final.log`. The still and eight-frame motion sheet were inspected: a steady larger bundle,
amber extra cells and readable heavy warning; four drops lighten the load and the subsequent jump succeeds.
Accepted live actions, not fabricated inventory, produced the 12-log load. Measured walk speed **3.35473 m/s**;
heavy ground jump blocked, drop restored **8**, light jump restored. WebGPU, advancing frames, no graphics,
console or page errors. This is local desktop evidence, not device validation or a claim of satisfying feel.

Production two-player opening → T2: `.look/playthrough/heavy-load-coop/report.txt`, PASS; both finish,
**228 matching mirrored-state checkpoints**, no graphics errors. At 3x warp the pages reported temporary
3.902/8.074 game-second deficits, ending on the same tick; do not use this run as smoothness evidence.
`world-inputs`: `.look/heavy-world-inputs.log`, PASS (browser/Node catalog parity, empty shared-state registry).
`npm run loop -- run`: `.look/heavy-loop-final.log`, PASS for modeled progression; its straight-line timing does not model the new Owner slowdown and is not a human playtest.

Review risks: no measured early-line jump shortcut yet proves a compelling choice; grounding may feel punitive.
No sway or jump spill was added because the grounded variant works without them. The main game is used;
there is no dedicated prototype room or entry. Parent must reconcile **WORLD_NS v48** if another pending
branch consumes it. Existing worlds are separated by namespace, with no save migration or mixed-build fence.
Independent review, human feel and touch/gamepad checks remain with the parent/owner; none is claimed here.

Movement coverage limit: the browser proof directly exercises walking, ground-jump refusal and drop recovery.
Air-jump, active hook/glide cancellation and swimming exemption were checked in the code paths, not separately
exercised in this browser proof.

## Files changed

- Shared rules and wire: `src/adapters/railway-intents.ts`, `src/sim/railway-layout.ts`, `src/sim/railway-queries.ts`, `src/world/namespace.ts`, `src/world/railway-server.ts`.
- Owner movement and local presentation: `src/entities/railway/glide.ts`, `src/entities/railway/hook-shot.ts`, `src/entities/railway/sources.ts`, `src/entities/railway/tools.ts`, `src/entities/railway/view.ts`, `src/features/haul-stack.css`, `src/features/haul-stack.ts`, `src/player/haul-back.ts`, `src/render/carry-models.ts`.
- Route bots and network harness: `dev/look/bots/railway-works.ts`, `dev/look/bots/railway.ts`, `dev/peer-test/ws-railway.ts`.
- Tests and exact fixtures: `server/test/fixtures/world-host-trace.jsonl.gz`, `server/test/world-host-trace.test.ts`, `test/fixtures/prefab-halts.json`, `test/fixtures/railway-bad-worlds.ts`, `test/fixtures/railway-golden.json`, `test/fixtures/railway-m12-trace.json`, `test/fixtures/railway-ops-golden.json`, `test/prefab-halts.test.ts`, `test/railway-cart.test.ts`, `test/railway-heavy-load.test.ts`, `test/railway-line-authority.test.ts`, `test/railway-line2.test.ts`, `test/railway-m12.test.ts`, `test/railway-ops.test.ts`, `test/railway-read-session.test.ts`, `test/railway-replicate.test.ts`, `test/railway-route-rules.test.ts`, `test/railway.test.ts`.
- Design and plan: `docs/game-design/place.md`, `docs/plans/heavy-load.md`.

Scoped build gate: `UNIT_ONLY=test/railway-heavy-load.test.ts node dev/ship-check.ts --unit-only HEAD`
PASS (registry, 29 changed lint files, typecheck, 6/6 sim tests). Full-suite results are recorded below.


## Initial checks

| Check | Result |
| --- | --- |
| Scoped Prettier and `git diff --check` | PASS |
| Scoped ship-check (command above) | PASS |
| `npm run check:full`: lint, typecheck, registry, level, assets, prefabs, production build | PASS |
| Full unit suite | 2,171 pass, 1 existing TODO, 0 failures |
| Full server suite | 377 pass, 0 failures |
| `test:net` within check:full | Final standalone rerun PASS, 190/190 checks; full command initially stopped on obsolete cap assertion |
| `npm run loop -- run` | PASS |
| Production 2-player opening through T2 | PASS, with warp-drift limitation above |
| `world-inputs` | PASS |
| Final heavy-load browser proof | PASS, artifacts and coverage limits above |

Full check log: `.look/heavy-full-final.log`; successful network rerun: `.look/heavy-net-final.log`. Scoped gate: `.look/heavy-ship-check-final.log`.
No pushes, ship command, merge or independent review were performed. The parent owns review before merge.

The network harness now fills 12 predicted slots, refuses further pickup, deposits exactly 12, refuses a
thirteenth spend, and checks matching conserved balances after retirement/reload/restart. Its initial failure
was an obsolete hard-cap assertion. The expanded proof also needs more than one ten-log tree; it now tests
full-back refusal against an unspent source. Production code did not change after the full unit/server/build run.

## Review follow-up, 15 November

Branch `heavy-load-fix`, starting at `a91bd8663`, with review `44b7ec63f` cherry-picked as `a767f2eb6`.
No push or ship. The original evidence above describes the first implementation, not this follow-up.

### Cause and fix

The unchanged deliberate mixed-overfill test reproduced **5,438 ticks**, waits **1,129 / 560 / 717 / 1,832**.
It has no player movement: slowdown cannot cause that result. Taking 16 logs then 8 rails lets the two builders
fund each frame in one tick instead of two. At the second completion (relative tick 2,289 instead of 2,290),
train slot 3 is arriving at the old stub. `lay()` directs a train already standing there onward, but the arrival
path still honored the old `turn` flag and sent this arriving kit home. One tick earlier meant a much later kit.
`trainStepLine` now continues an arriving train at a **leg-owned stub** that has become a through stop, matching
`lay()`; the original Pier and Ring Island turnaround rules remain unchanged. The same review inputs now take
**3,615 ticks**, waits **1,129 / 560 / 363 / 363**. Neither the 3,700 total nor any idle bound changed.

Browser bots already target `carryComfort`. The loop runner, leg seed builder and server hold-test setup now do
so too. The loop also applies `carrySpeed` to walking and models a rack offset rather than collecting at the
frame. Deliberate mixed overfill remains in the independent regression; it is not filtered out.
The server hold tests retain every assertion, including exact cap departure; their setup chooses comfortable
cargo instead of inadvertently changing the fleet phase. All 17 tests in that file pass.

Only `gorge-mid` and `gorge-reached` golden rows change: ticks 14,095 → 14,096 and 17,224 → 17,227. To isolate why,
the current comfortable seed was also run with the **original train rules from `a91bd8663` loaded read-only**.
It produced exactly the same new stage and +1,200-tick hashes as the fixed train rules: respectively
`1067617151 / 1614511056` and `2192202057 / 1400721993`. These two fixture changes are seed-input changes under
the documented seed-data exception, not a blind replay refresh. All other seed rows stay unchanged. The existing,
unshipped v48 clean break includes this follow-up; its history records the adjustments. The parent must reconcile
that namespace with other pending branches before shipping.

### Haul arithmetic and tuning

Run `node dev/loop/heavy-load.ts` to reproduce the table. Normal walk is 5.6 m/s; maximum cargo now walks at
2.52 m/s (45%). Comfortable/max counts remain 8/12 before the pack and 16/24 after it. The curve stays linear.
At the original 60% floor, unlimited identical flat round trips favor full overloading everywhere:
`1.5 × 2 / (1 + 1/0.6) = 1.125`, or 12.5% more units per second. Distance cancels. At 45% that ratio is
`1.5 × 2 / (1 + 1/0.45) = 0.931`: long repeated maximum-load hauling loses. No artificial per-trip delay was added.

A finite bill matters too: Q2/Q5's 24-unit bill takes two comfortable packed loads (16 + 8), with an empty return,
or one extra load of 24. At 45%, that one extra trip takes `d / (5.6 × 0.45)` against `3d / 5.6`, 25.9% less walking.
The old rack centres were 3.4 m from frames, inside the 3.6 m auto-unload radius, and both pickup zones overlapped
that radius. Those were not real walks. Q2 and Q5 log racks are now 10 m back along the frame tangent, and Q5's
rail shelf sits beside its log rack, 10.11 m from the frame. The server permits the complete pickup zone at both.
Other racks, frames, bills, walkable heights and colliders are unchanged. Q2's sampled ground rises 0.70 m over
that 10 m approach; Q5 is effectively flat. Full cargo remains walkable on these approaches.

The table is **geometric walking time**, not a human timing claim. Tree/rock distances are the mean of the nearest
catalogued sources sufficient for that bill (the loop graph's documented method); forge rails use their actual
rack coordinates. Moved rack distances sample the rendered ground every 10 cm; other paths are straight-line
lower bounds. One-trip columns carry `min(bill, comfort)` and `min(bill, maximum)`. Equal-bill columns start at the
source, end at the frame, add empty returns only between loads, and account for lighter final loads. Harvesting,
rail production, unloading and laying are excluded; they service the same bill. The forge row holds the pre-pack
8/12 capacity constant; claiming the pack after its first batch changes the remaining trips. This compares full-overload and
comfortable policies per material, not an exhaustive optimum over partial loads, mixed-source routes or co-op.

| Haul (bill) | Source–frame m | One trip, comfort / extra s | Equal bill, comfort / extra s | Better |
| --- | ---: | ---: | ---: | --- |
| T1 logs (24) | 12.59 | 2.25 / 5.00 | 11.24 / 12.24 | comfort |
| T2 logs (32) | 20.37 | 3.64 / 8.08 | 25.46 / 27.08 | comfort |
| T2 stone (8) | 28.70 | 5.12 / 5.12 | 5.12 / 5.12 | same; no extra needed |
| T3 logs (40) | 44.92 | 8.02 / 17.83 | 72.19 / 85.56 | comfort |
| forge logs (56) | 37.97 | 6.78 / 15.07 | 88.13 / 94.16 | comfort |
| Q1 logs (16) | 40.93 | 7.31 / 7.31 | 7.31 / 7.31 | same; no extra needed |
| Q1 rails (6) | 12.16 | 2.17 / 2.17 | 2.17 / 2.17 | same; no extra needed |
| Q2 logs (24) | 10.06 | 1.80 / 3.99 | 5.39 / 3.99 | extra |
| Q2 rails (12) | 45.50 | 8.13 / 8.13 | 8.13 / 8.13 | same; no extra needed |
| Q3 logs (16) | 3.40 | 0.61 / 0.61 | 0.61 / 0.61 | same; no extra needed |
| Q3 rails (12) | 113.79 | 20.32 / 20.32 | 20.32 / 20.32 | same; no extra needed |
| Q4 logs (16) | 3.40 | 0.61 / 0.61 | 0.61 / 0.61 | same; no extra needed |
| Q4 rails (16) | 3.35 | 0.60 / 0.60 | 0.60 / 0.60 | same; no extra needed |
| Q5 logs (24) | 10.00 | 1.79 / 3.97 | 5.36 / 3.97 | extra |
| Q5 rails (24) | 10.11 | 1.81 / 4.01 | 5.42 / 4.01 | extra |

Pickup and unload reach shorten actual walking. Using the 3.2 m pickup and 3.6 m unload edges, the moved racks
still leave at least 3.2 m between the zones: about **1.27 s extra versus 1.71 s comfortable** to deliver 24,
before common unloading time. The table's sign is unchanged by shortening a given haul this way. For trees,
source depletion, terrain and the path between distinct trees can change the exact totals. This is an explicit
computed trade-off, not proof that it is fun. The long T3 log bill loses 13.37 modeled seconds under maximum
loads; Q2/Q5 save an entire short return trip. Loads within comfort retain jump, hook and glide, so on mandatory
climbs an overloaded player must first drop to comfort regardless of these walking estimates. The other branch's
early glider and jamb switch were not merged here; their combined geometry remains an integration check.

### Recovery and draft copy

A heavy jump, hook or glide press shows a 2.5-second refusal in the existing notification lane (one shared key,
not a new HUD or control). The jump queue is consumed once per press; swimming ascent is still exempt. Copy
is explicitly **draft for the owner**, not The Boogler's dialogue:

- “Too heavy to jump. Drop cargo to travel light.”
- “Too heavy to hook. Drop cargo to travel light.”
- “Too heavy to glide. Drop cargo to travel light.”

The existing persistent heavy HUD and tap/hold Drop bindings remain. The 128-pile ceiling is removed from both
apply and save validation: another player's piles cannot prevent a drop. Each pile still has a validated kind,
position and count, and every unit stays conserved. The regression builds 128 actual drops, drops another four
to reach comfort, verifies 129 recoverable piles and reloads the exact state. Normal integer/id validation remains.
The live probe used accepted cargo operations and confirmed 24-log walk speed **2.51958 m/s**, all three refusal
messages, blocked ground/air jumps, blocked glide/hook, swimming ascent, whole-load Drop on the raised `p2` hook
landing, piles at landing height, and jump/glide recovery. Teleports isolate those contracts; they do not prove
a full route. The first capture showed the loading screen and was rejected as visual evidence. The recapture
waited for the splash to finish: the inspected still and motion sheet show Buddy with the loaded bundle, amber
extra cells, the persistent Drop reminder, and the readable hook refusal at the landing. Real-time feel and
mobile/gamepad input remain unverified.

### Follow-up checks and artifacts

- Review, heavy-load, route-rules and set-down tests: **63/63**, including the unchanged **3,615 < 3,700** bound.
- Train and deliberate-route regression tests: **47/47**; existing Pier/Ring Island turnaround behavior preserved.
- Railway golden shards: **103/103** in the full unit run. Only the two comfort-seed rows described above changed.
- Server suite: **377/377**; network checks: **190/190**; `npm run loop -- run`: **pass**.
- Full unit run: **2,177 passed, one existing TODO, one halt snapshot mismatch**. Regeneration changed exactly
  Village's calling light from false to true, consistent with the corrected train phase; no geometry changed.
  The regenerated halt test passed on rerun. The final check pipeline uses `UNIT_ONLY=test/prefab-halts.test.ts
  npm run check -- --unit-only`, and **passed**, including full lint, typecheck, registry, level, asset, prefab and build checks.
- `npm run checkpoints`: **25/25** build through the real host save path.
- Two-player production playthrough through T2: both complete, **229 matching server steps**, no graphics errors;
  both end stills inspected. `world-inputs`: **pass**, empty registry diagnostics and matching numeric catalogs.
- Live recovery probe: **pass**; kept as `dev/look/evals/review-heavy-load.ts`. Runtime Q5 walks accept all 24 logs
  and then all 24 rails at the frame without jumping; the rack does not auto-unload cargo while picking up.
  Q2 also accepts a 24-log loaded walk uphill from its moved rack, without jumping. Both Q2/Q5 stills were inspected. The initial probe tried its second pickup before the ordinary cadence expired;
  the successful run waits for that cadence. This did not require a gameplay change.

Local evidence (not published): `.look/heavy-review-tests.log`, `.look/heavy-trains-test.log`,
`.look/heavy-check.log`, `.look/heavy-check-final.log`, `.look/heavy-server-final.log`, `.look/heavy-net.log`,
`.look/heavy-loop.log`, `.look/heavy-checkpoints.log`, `.look/heavy-world-inputs.log`,
`.look/playthrough/heavy-load-fix-coop/`, `.look/heavy-look-final.log`, `.look/heavy-rack-look.log`,
`.look/heavy-load-recovery-final-{still,motion}.png`, `.look/heavy-load-short-haul-{still,motion}.png`,
`.look/heavy-q2-look.log`, `.look/heavy-load-q2-haul-{still,motion}.png`.
The code and reproducible arithmetic are committed on `heavy-load-fix` only; no ship or push.
