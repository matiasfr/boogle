# Little guys bring rails

## Goal

At Line 2 station 4 (Q4), let the little guys' existing cart collect needed rails from the forge and carry them with its logs to the existing frontier rack. Keep the final carry, earlier stations, forge production, bills and all player-facing copy unchanged. Serve DESIGN.md **11. Show, don't tell**, **4. Cooperation is automatic, not negotiated**, and the earned relief in **1. Toys before chores**.

Authority: the owner's 3 November task and `docs/playtests.md`, 2026-11-03 round 4. The 150–250 m rail fetch at stations 4 and 5 was the strongest pacing miss. Research already supports this narrow change: `docs/research/next-load-motivation.md`, recommendation 1, and `docs/research/rail-economy-model.md`, recommendations 2 and 8. This is not a new logistics architecture.

The owner authorized implementation, verification and commits in this worktree; no deployment or push. The root agent approves this implementation plan within that authorization. Stop for the owner's next playtest after reporting the verified result.

## Design

### One cart and one rack

- Extend `src/proto/place/depot.ts` and the loading path in `pair.ts`. Preserve `cart.rails`, `rack.rails`, `rackedRails`, `loadCart`, `callCart`, existing `depot` save slice and existing take-from-rack interaction.
- Automatic rail service applies only while the active frame is Q4 or Q5, has `spec.rack === 'cart'`, the depot is earned and trains are not running. Q1–Q3 retain today's behavior. Q6 keeps its train kit.
- Keep `CART.rails = 16` initially. Q4 fits one mixed shipment; Q5's 24 rails require a second shipment unless a partner brings the balance. This preserves the existing split's useful contribution without secretly changing capacity or speed. Record this departure from the ideal single shipment plainly.
- Outstanding rail demand is `max(0, st.wants('rails') - rack.rails - cart.rails)`; cap loads by cart free slots and **actual** `forge.rails`. Rails are never created at the depot. Reevaluate demand after each transfer and frame change; stop supplying a completed frame. A rails-only trip must start when no logs remain due.
- On the outbound leg, stop at the existing forge stop (`FORGE_D`) before the frontier. Keep the existing manual whistle able to recall an outbound cart. At the forge, load available rails through the same helper used by the manual `Load the cart` verb. Stay there while the batch still needs rails and the forge is empty. Once the current batch is complete or demand disappears, use the existing departure dwell. A manual load can fill the same capacity; never load the same rail twice.
- Install narrow depot callbacks from `pair.ts` for automatic policy and loading, rather than importing `coop.ts` back into `depot.ts` and growing the existing cycle. Configure them outside `if (COOP)` so solo also receives the new relief. `pair.ts` already imports forge, depot, active frame and co-op.

### Shared state and compatibility

| State | Kind and authority | Existing API / extension |
| --- | --- | --- |
| Cart cargo, rack stock, forge stock and route | Existing prototype shared state, authority selected by `coop.ts`; solo local | `sharedSlice('depot')`, `sharedSlice('forge')`, `captureShared` snapshots, reliable `placeCoop` events |
| Automatic stock transfer | Only the current prototype authority; all peers observe it | Existing `coop.took('rails', n)` and `coop.send({ k: 'cartLoad', n })`; common validated local loading helper |
| Capability to run automatic forge stops | Owner presence, bounded version value, absent means legacy | New additive `placeRailCart` field registered beside `placeCoop`; track it only on existing co-op peers |
| Cargo meshes, rack furniture and flights | Local presentation of shared counts | Existing instanced rails/logs and `send` |

The prototype is not lockstep. Do not move it into sim/world or change the world's namespace, rule catalog or saves. No lockstep math changes are needed.

New automatic forge waiting cannot safely be predicted by an old tab's cart state machine. Therefore enable automatic service only when all current participating co-op peers advertise the new capability, using the same visibility/freshness criteria as `authorityPeer()`. A room containing an old participating build retains the existing manual rail-loading path. Old builds ignore the new presence key and keep understanding the existing cart events and snapshot shape. This limited degradation is intentional and must be reported.

Only the authority debits forge stock for automatic loading; followers never debit it independently. Keep the meaning of `took` and `cartLoad` unchanged. Do not reinterpret old messages or add a new required leg string. If the implementation needs an additive automatic-flight marker, missing/invalid means off and snapshots validate it. A legacy peer joining during a trip must safely finish already loaded cargo and disable subsequent automatic dispatch; never clear cargo or refund stock merely because capability changes.

`coop.ts`'s `volatile()` currently compares rack logs and cart rails but omits **rack rails**. Add rack rails so a rail-only disagreement is corrected. Ensure a snapshot replacing the depot invalidates pending local unload callbacks (use a generation guard analogous to `forge.ts`'s `pourGeneration`) and redraws both stacks; stale flights must not credit the corrected rack twice. Motion-only `reconcileCart()` must not blindly replay old cargo and unload transitions.

### A readable landing place

In `depot.ts`, replace rails floating over a changing log pile with a distinct low rail shelf next to the log cradle. Reuse the existing `rackedRails` instance buffer and steel appearance. Add simple timber bearers/stops, no sign or new copy. The empty shelf should explain where rails will land. `railAt()` becomes independent of `rack.logs`; remove its dead `off * 0` term. Match any enlarged solid footprint and `moveRack()` ground-clearance checks to the furniture; keep a clear approach for the existing pickup prompt.

Use the same rail geometry/material language on the cart and on the rack. The cart's mixed load must visibly read as timber plus steel. Rails should land at their actual `railAt` slots, not all at `rack.at`. Keep cargo counts bounded by instance capacity. Solo's platform should support the visible cargo too if its new mixed load raises the deck; do not introduce a separate physics system.

## Steps

- [x] **1. Preserve baseline evidence (root).** Before source edits, run the full broker playthrough and read its report, plus the existing `dev/look/evals/place-split.ts` in `mode=solo`, `walk`, and `split` with one/two players as appropriate. Historical Q5 values are 162.40 s solo, 115.14 s walkers, 80.90 s split. Record freshly measured values separately. Run `node dev/economy/model.ts round4` and preserve Q3–Q5 station `endS`, work/wait times and train unlock arithmetic. Baseline screenshots are not substitutes for the new visual checks.
- [x] **2. Extend the shared cart path (`depot.ts`, `pair.ts`, `coop.ts`).** Implement threshold, rails-only dispatch, automatic forge stop, authority-only common loading helper, dry-forge wait, additive capability guard, rack-rail reconciliation and stale-flight protection above. Keep all existing manual verb strings unchanged. Do not alter `layout.ts` tuning. Verify with the existing co-op fixture and an extension of it for automatic Q4/Q5, an empty forge, rail-only demand, a peer without capability, and a snapshot during unload. Run targeted lint/typecheck before handing over to captures; this step should leave `npm run check` green.
- [x] **3. Make cargo and its landing place readable (`depot.ts`).** Build the dedicated rail shelf and actual per-slot unload targets; frame the loaded cart and the frame-side stack. Inspect the PNGs for distinct materials, grounded shelves, visible rails when logs are gone, and a usable pickup approach. Adjust at most three look rounds. Re-run affected captures after edits; `npm run check` remains green.
- [x] **4. Teach existing bots to use the relief (`dev/look/bots/place.ts`, `dev/look/evals/place-split.ts`, existing `dev/look/evals/place-coop.ts` as needed).** After Q4, the full bot waits for a pending automatic rail delivery at the frontier instead of seeing an empty rack and immediately walking home. Bound the wait, name the failure and retain the manual fallback in mixed rooms. Account for rails-first pickup when filling remaining pack slots, so a mixed pickup cannot deadlock a log-only wait. Preserve `solo`/`walk`/`split` starting fixtures and bills. The split porter still manually loads and carries the remaining rails; if automatic loading finishes first, the bot recognizes the existing loaded cart instead of requiring an obsolete prompt. Report strategy changes explicitly. Use these existing harnesses, not a new harness or UI unit tests.
- [x] **5. Model and document the final behavior (root: `dev/economy/model.ts`, `docs/game-design/place.md`, this plan).** Preserve the existing historical `round4` table and add a named `round4-cart` clone for reproducible comparison through the same `model()`. In the new table, Q4/Q5 carry source distance becomes the short frontier rack leg. Include explicit cart supply waiting, travel, two-batch Q5 behavior, forge production and unchanged 9 m/s cart speed in the estimate; do not count logs as manufactured rails or reuse a pooled supply rate incorrectly. Existing `before` wait beats can represent this narrow estimate without adding a second model engine. A conservative empty-forge/camp-start wait is rail count / 2 plus `(2 * batches - 1) * roadMetres / 9` plus loading/departure/drop dwell per batch, where batches is `max(ceil(logs / 24), ceil(rails / 16))`; label that it charges waiting before the final carries and does not credit overlap. Label estimates and assumptions separately from bot observations. Keep Q3 unchanged. Train unlock is after walking home and taking the boiler to camp, before the first train rides and Q6 work; do not report the trains link's `openS`, which includes Q6, as unlock. Add a before/after table for Q3–Q5 and trains, plus historical/fresh-baseline/new Q5 split/solo/walkers. Update the run and co-op paragraphs that currently say rails always remain a forge errand. Document mixed-room fallback and the retained 16-rail capacity.
- [x] **6. Verify and commit (root).** Run final full broker playthrough, read the report even if failed, then `npm run playthrough -- --compare <baseline-run-dir> <new-run-dir>` (comparison is offline and must not launch another browser). Run `node .look/see-client.ts scenario world-inputs` against this build. Use the existing co-op `pair=load`/`drop` and `deposits=1` fixtures for old manual behavior and conservation; automatic fixture must print/assert matching stacks on both peers, no negative stock, dry-forge waiting, and safe capability fallback. Re-measure Q5 modes. Run `npx prettier --write` on changed files, targeted ESLint, then `npm run check`; fix failures. No `check:full` unless core net/world/server paths actually change. Re-read/simplify the diff, ensure scope/copy unchanged, and make small imperative commits with DESIGN.md 11/4 in the body and local inspected evidence paths. Never push or ship.

## Verification questions and commands

All browser commands use the launcher's `.look/see-client.ts`; it owns URL, output, root and data directory. No browser may run while source is changing. Root owns the runs and final measurements to keep this serial.

1. **Loaded-cart question:** can a player see both the logs and the rails as the little guys bring the next shipment? Capture the automatic Q4 outbound cart from a low three-quarter angle, with the pushers and mixed cargo visible.
2. **Frontier question:** does the rail shelf clearly receive the shipment and remain a believable pickup place after the logs are taken? Capture the settled stack beside Q4/Q5's frame, then rails without logs. Open actual PNGs with `view_image`; capture success alone is not an answer.
3. **Shared-stock question:** do both tabs agree on forge, cart and rack rail counts after load/drop/pickup and a corrective snapshot? Use the existing `place-coop.ts` eval, its reliable barriers/fixtures and bounded assertions. `world-inputs` verifies unchanged world contracts, not this prototype's cart semantics.
4. **Pacing question:** does Q4 visibly remove the long rail errand while the split still beats walking together? Compare the existing Q5 fixtures and full bot beats. If split is no longer faster than walkers, report that plainly and propose the smallest change without applying it. Do not retain the old 0.6-of-solo threshold as an unstated new requirement; the owner explicitly expects solo to improve.

Existing split invocation through the broker:

```sh
node .look/see-client.ts look --query 'proto=place&coop=1&mode=solo' --players 1 --eval dev/look/evals/place-split.ts --until window.__splitDone --warm 420
node .look/see-client.ts look --query 'proto=place&coop=1&mode=walk' --players 2 --eval dev/look/evals/place-split.ts --until window.__splitDone --warm 420
node .look/see-client.ts look --query 'proto=place&coop=1&mode=split' --players 2 --eval dev/look/evals/place-split.ts --until window.__splitDone --warm 420
```

Use `--real` if needed to match the historical real-input eval's timing protocol, and record warped/real mode. For full-run checkpoints use `look --at list` followed by the exact reported beat. For movement evidence use `--curves` and consecutive video frames; real-time feel remains unverified.

## Risks and limits

- Forge production is two rails/second before the roof, but only landed stock can load. Stock depletion may reveal waiting; never invent rails to keep the cart moving.
- Q5 needs a second automatic trip at capacity 16. The partner's manually carried balance should still matter; measurements decide, not an assumed benefit.
- `pair.ts` imports `coop.ts`, and `coop.ts` imports `depot.ts`: a reverse depot import would grow an import cycle. Use configured hooks. No new registry debt or suppression entries.
- A joined legacy peer disables future automatic dispatch while keeping current cargo intact. Document the fallback, rather than claim automatic service works in all mixed builds.
- A correcting snapshot during unload can otherwise duplicate stock. The generation guard and matching-count observations are required.
- No new lights, render passes or per-piece draw calls: reuse instancing and the rack's small mesh group. These modest mesh changes do not justify a broad GPU benchmark; inspect health diagnostics and use `npm run check`'s level checks. The place-specific shelf still needs visual clearance validation because the global level checker does not describe this prototype's terrain.
- The optional capability is a presence change. `docs/agents/test-details/load.md` asks for before/after `npm run load`; the user's broker-only/local-server restriction takes precedence if that command would start independent browser/server machinery. Record any unavailable measurement rather than inventing a broker command.
- The launcher's `inflight` was already run by root; reported work was unrelated to these gameplay files. No second network call. No nested AGENTS.md exists under `src/proto`, `dev` or `docs` in this checkout. Do not touch deeper core folders without reading their instructions.

## Open questions

None block implementation. Do not retune capacity, bills, travel speed or forge rate if the measured split advantage shrinks. The owner decides whether the visible relief feels earned in the next playtest. No new copy is currently needed; list any later candidate for the owner instead of adding it.


## Result and evidence

Implemented on `codex/little-guys-rails`; no push or ship. The owner's next playtest is the remaining feel decision. Runtime retains the 16-rail capacity, 9 m/s speed, forge rate, bills and all copy. Q5 may need two shipments. The additive validated `auto` snapshot flag distinguishes a dry-forge wait from an explicit whistle. A called cart now reaches the forge even when a snapshot nudge crosses the stop by centimetres. Reserved unload stock is included in snapshots; immediate pickups consume reservations, and stale flights cannot restore consumed rails.

Pacing tables and assumptions are in `docs/game-design/place.md`. Historical Q5 solo/walk/split were 162.40/115.14/80.90 s; new successful real-input trials were **73.78/69.16/75.80 s**. The split is now **6.64 s slower than walking together**. The smallest proposed follow-up is a manually loaded, ridden cart speed bonus (12–13 rather than 9 m/s), unimplemented pending the owner's decision and a new comparison. The full bot reached trains 109.67 s earlier, but its Q5 wait was 1:49 and stationary time increased. The cold-start model predicts only 13.87 s saved by trains; it deliberately credits no overlap or existing stock.

Evidence below is in `.look/evidence/<id>/evidence.json`; each manifest records the exact source and harness trees. Later final committed-tree captures supplement these measurements without replacing them.

| Check | Manifest ID | Result |
| --- | --- | --- |
| Baseline full bot | `1793772548990-11068` | All expected actions completed |
| Mixed-cart full bot | `1793774348050-66816` | All expected actions completed; no falls/page/gfx errors |
| Q5 split / walkers / solo | `1793774770414-85885` / `1793774914460-89372` / `1793775002116-91592` | 75.80 / 69.16 / 73.78 s |
| Mixed cargo visible | `1793773801172-48224` | Both peers 16 logs + 16 rails on cart |
| Dry forge and matching stacks | `1793773850285-49802` | Waited 10 s with zero stock, then actual production supplied both peers |
| Corrected snapshot during unload | `1793774266575-63282` | Follower picked up 16 rails; both racks stayed zero after old flights finished |
| Missing legacy capability | `1793775254548-4000` | Absence observed on wire; both fell back to logs 16 / rails 0 |
| Rails without logs | `1793775319362-5528` | Both stacks 0 logs / 16 rails, no drift/errors |
| World inputs | `1793775540125-21617` | Existing trusted scenario passed |
| Deposit conservation repeat | `1793775570188-23117` | Eight requests accepted; both peers conserved eight; deliberate 5 s stall caused clock drift |
| Earlier manual split | `1793775632502-26764` | Q2 whistle, load, ride and drop: 12 rails on both racks |

Actually opened PNGs: baseline and mixed-cart full-bot end stills; mixed-cart loaded still; dry-forge frontier stills from both peers; corrected-pickup follower still; successful Q5 split still; rail-only stills from both peers. Against the visual questions, dark steel is distinct from pale log ends on the cart, rails have grounded timber bearers beside the log cradle, the rail-only shelf remains readable, and both peers show the same stack with a clear pickup approach. These are still judgments, not verified real-time feel.

Failures retained: fresh baseline solo runs were invalidated by a plan-file write and then external harness movement; baseline walkers fell after an accidental cart encounter and baseline split missed the forge stop. The first new split run could not dismount; its existing fixture now jumps off with real input. The first corrective-pickup fixture stood out of reach, and the first legacy fixture omitted a presence patch key instead of deleting it with null; both corrected fixtures passed. The first rail-only run asserted correct counts but failed clock drift; its repeat passed. Deposit fixture `1793775480926-15893` lost the eight test logs; its hardcoded player-1 authority assumption is not guaranteed by election. The unchanged trace repeat passed, but that fixture's reliability remains a limitation, not a proven runtime fix.

Final Prettier and `npm run check` passed: lint, typecheck, 292 unit tests, registry, five level checks, assets and production build. Targeted ESLint/typecheck also passed during implementation. No new unit tests or scenarios were added. No eight-player load benchmark (independent browser/server machinery conflicts with the requested broker-only workflow), actual old binary, iPad, audio or real-time smoothness test was performed. Capability absence and continued manual behavior were tested. No new copy is proposed.

Process departure: root ran the prescribed `npm run inflight` before inspecting its implementation; it fetched remote refs/PR metadata, contrary to this task's local-only network restriction. This was disclosed immediately and not repeated. No remote upload, push or ship was made. The implementation plan was accepted by root within the owner's explicit build authorization; no extra owner approval gate was introduced.
