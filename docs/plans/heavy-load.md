# Heavy load

Status: implemented and checked, 15 November 2026; plan written before code. Local commit only; parent owns independent review before merge.

## Goal

Make each haul a choice between more cargo and free movement, in the main game. Serves DESIGN 7 (Telegraph everything) and 11 (Show, don't tell), answering Grant G5/G6/G21 and queue D2. Authority: [15 November answer 2](../decisions-core-loop.md#d-2026-11-15-grant-queue-answered).

## Design

Build **B, grounded, with gradual slowdown** from [first-line-decisions](../brainstorms/first-line-decisions.md). Logs, stone and rails share a comfortable count of **8**, or **16** with the room's pack. Allow **50% extra**, up to **12/24** combined. A pickup stops at comfort first; a further press explicitly takes the extra. Speed stays normal through the comfortable count, then falls linearly to **60%** at maximum (walking 5.6 → 3.36 m/s; sprinting 9.5 → 5.7 m/s). Above comfort, no ground/air jump, hook or glide; swimming ascent remains available so water cannot trap a carrier. Existing Drop (right click / R3 / touch; hold for all) sheds cargo into recoverable piles. Deposits and the pack immediately restore movement when back below the threshold. Big objects keep their existing exclusive carry rules.

One steady bundle, growing with the actual count; rails/stone must render the new maximum. The carry HUD marks comfortable versus extra slots and keeps a short heavy-load reason and Drop instruction visible while overloaded. No sway or spill: this variant needs neither, so it does not exercise the owner's permission to reopen that part of 1 November. No new input binding or Boogler copy.

**Ownership:** Server account counts and existing `rail.*` actions remain authoritative through `railApply`; all sources use `free`/`roomFor`. Pure queries derive comfortable count, maximum and slowdown with integer counts and arithmetic only. Owner movement reads the current mirrored/predicted account; no physical state enters shared rules. Local bundle/HUD presentation follows those counts. Existing action prediction/correction, replication and verified checkpoints remain in place; no new state, op, event, component or presence field.

**Wire/save/mixed builds:** no shape additions; account validation now permits 12/24, so make a clean development namespace bump (v48 with a dated history line). Current clients only; no compatibility gates or migrations. Parent must reconcile the namespace if another change takes v48 first.

**Room:** production entry, no `?proto`, no special room. The owner explicitly chose the main game. Harness rooms are disposable test rooms only.

**Research:** [carrying and logistics](../research/carrying-and-logistics-play.md) favors a reliable bundle and readable load. This experiment departs from its old zero-penalty recommendation under the newer owner call. Speed alone is a control with an optimum, not proof of a decision. The designer found no measured early-haul shortcut requiring a jump; this implementation tests freedom of movement versus volume across the normal route, and does **not** claim a proven Station 1–3 route trade-off or invent new obstacles. That remains a playtest question, not a build gate.

## Steps

- [x] Change `railway-queries.ts` comfort/maximum/speed queries and the existing validation through `carryMax`; update adapter/host transfer-count validation and namespace. Test boundaries, mixed materials, competing takes, drop/deposit recovery, pack, replay and save/load in pure sim tests; adjust assertions tied to the former cap without repinning unexplained goldens.
- [x] Apply the derived limit in the existing railway movement seams (sources, view, tools, hook-shot, glide); gate air jump, hook and glide including an already-active move. Preserve swim ascent and existing big-cargo behavior.
- [x] Update carry readout/HUD and carried-model capacity. Document the as-built rules in `docs/game-design/place.md`.
- [x] At the completed checkpoint, run scoped format/lint, `node dev/ship-check.ts`, routed checks from `checks-for`, and `npm run loop -- run`. Capture an overloaded walk/jump/drop proof with the existing look harness, inspect the still and motion sheet, and report limits. Commit only; parent owns independent review and merge.

## Level findings

No placements, colliders, terrain or routes change. No new reach gate is placed. Dropping is essential wherever a carrier needs mobility; water ascent is exempt. Early-route shortcut payoff remains unmeasured.

## Risks / open questions

Grounding could feel punitive or make jump-heavy bots stall if they collect past comfort; don't silently retune the game to make a bot pass. Repeated pickups must stop only at the new maximum; no source may use the old comfort cap. Shared pack changes must clear the restriction without a stale latch. Predicted restrictions may reverse on correction, like the displayed counts. The existing maximum pile/account pools can refuse a drop in an exhausted world; retain the authoritative refusal. No open owner choice blocks this authorized variant. No ship or push is authorized.


## Implementation notes

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

## Handoff evidence

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


## Final checks

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
