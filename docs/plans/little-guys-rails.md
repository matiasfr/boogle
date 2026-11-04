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


### Final committed-build verification

Clean implementation commit `150d782e` (tree `db77eacf2cb9d996c23fb1984feaa72721132648`) passed the full bot again: manifest `1793776017482-40382`, all expected beats, zero errors/falls. Read the report and opened its end still. Trains unlocked at 1510.52 s, 67.90 s earlier than baseline; startup waiting shifted all pre-Q3 beats, while the Q3-to-trains interval improved 108.67 s. Both raw timing tables and this variance are retained in the game-design section. This evidence update changes documentation only.

Final loaded-cart manifest `1793776192919-45482`: opened `hill-still.png`; pale log ends and dark rails clearly share the cart, with both peers reporting 16/16. Final dry-forge/frontier manifest `1793776247726-47786`: opened `hill-still.png` and `p2-hill-still.png`; matching 16/16 stacks rest on distinct timber supports with clear ground around the pickup. Both peers waited ten seconds with zero rails, then loaded only actual forge production. Both captures passed at 1x with no page/gfx errors, no source/harness changes during capture, and the same clean implementation commit. No further gameplay tuning or code changes followed these runs.

### Rebase follow-up

Rebased onto local `origin/main` at `b8870664`, preserving the incoming objective removal, relocated boiler and round-4 fixes alongside mixed cart delivery. The sole conflict was the run description in `docs/game-design/place.md`: keep the station-4 rail service and main's boiler apron location. The guidance audit now distinguishes player-fetched rails at stations 2–3 from visible mixed cart shipments and the separate frame shelf at stations 4–5. Main's remaining guidance stages and unresolved discovery questions are preserved. No gameplay retune is part of this reconciliation. Earlier timings, sync checks and images above are historical; use the follow-up manifests for the combined build. No fetch, push or ship was performed in this follow-up.

## Ridden-cart follow-up (4 November)

The owner's subsequent brief explicitly authorizes the previously proposed 12–13 m/s experiment and local commits, superseding this plan's earlier no-speed-retune boundary for this narrow case. Serve DESIGN.md **4. Cooperation is automatic, not negotiated** and **1. Toys before chores**: restore a payoff for a porter loading and riding while their partner works at the frontier. No push or ship; stop for the owner's feel judgment.

- [x] Implement actual manual-load eligibility in `depot.ts`/`pair.ts`; automatic loading passes false, unloading/reset clears eligibility. A rider alone never boosts automatic cargo. Unridden or automatic carts remain at 9 m/s.
- [x] Keep the existing prototype authority. Add bounded `placeCartRide` Owner presence (1 capable, 2 riding), authority-only reliable `cartRide` decisions, and optional validated `manual`/`boost` snapshot fields. Missing/invalid capability on any active peer disables the bonus; old event meanings, cargo, world rules and namespace stay unchanged. Existing motion reconciliation carries speed/position. No lockstep math changed.
- [x] Preserve `rail.ts`'s `moveCar`/`snapCar` relocation handling and bounded junction turn. The cart's correction-speed threshold is 1.5 times the greater of base, current speed and selected cruise, so 13 m/s travel is ordinary motion while legacy travel retains its old threshold.
- [x] Compare 12 and 13 in the existing Q5 eval at real 1x, and repeat close comparisons. Select **13 m/s**, with the modest but repeated advantage below. No higher speed was tried.
- [x] Extend the existing co-op fixture with whole-trip contact, angular velocity, speed and peer-position measurements, plus an absent-capability mode. Use its rider-1 option for curves/video; its initial platform teleport is fixture setup, not the Q5 timing protocol. Q5 boarding/dismounting remain real input.
- [x] Inspect the trip images, curves and consecutive video frames; run the full place bot and trusted `world-inputs` scenario. Keep copy and `chop.ts`, `land.ts`, `verbs.ts` unchanged.

### Q5 observations

Same commands above with **`--real`**, no changes to bills, starts, strategy or forge rate. The sole runtime difference between candidates is `CART_RIDE_SPEED`. Times below are player 1's authority clock; player 2's roughly 0.3-second earlier completion observation is retained in each output log. Historical 9 m/s mixed-cart solo/walk/split remains 73.78/69.16/75.80 s, not a fresh control.

| Candidate | Mode | Seconds | Manifest ID |
| --- | --- | ---: | --- |
| 12 | solo | 73.75 | `1793778025511-43197` |
| 12 | walk | 68.40 | `1793777919231-37887` |
| 12 | split | 68.94 | `1793777831529-33684` |
| 12 | split repeat | 69.08 | `1793778136517-48846` |
| 13 | solo | 73.73 | `1793778448884-60182` |
| 13 | walk | 71.52 | `1793778345663-57058` |
| 13 | walk repeat | 69.02 | `1793778691416-72332` |
| 13 | split | 67.02 | `1793778237816-53272` |
| 13 | split repeat | 67.28 | `1793778565153-67956` |

Every ID names `.look/evidence/<id>/evidence.json`, with exact source/harness fingerprints and output/artifact paths. All nine measurement manifests passed without changes during their runs. Twelve fails the requested comparison. Thirteen's slowest split is 1.12 s faster than the fastest walker across all trials, and 1.74 s faster than the fastest walker in its own candidate. That is a small, consistently observed win, not a claim of a large human-play advantage. The 13 split spread was 0.26 s; walking's total spread was 3.12 s. Solo is effectively unchanged. Every split reached its target cruise and retained contact throughout the ride (12: 1239/1235 samples; 13: 1156/1156 samples), then jumped off through input. The owner still judges whether this feels rewarding.

### Ride and compatibility evidence

Visual question: does the loaded rider remain supported through departure, the junction and arrival, without an upward launch? Follow the cart from a three-quarter camera, record the full forge-to-Q2 delivery, and inspect both visual frames and continuous measurements. The longer Q5 real-input rides above supplement this focused junction trip.

```sh
node .look/see-client.ts look --query 'proto=place&coop=1&pair=ride&tripVideo=1&rider=1' --players 2 --real --eval dev/look/evals/place-coop.ts --until window.__coopDone --warm 120 --video --curves --seconds 12 --frames 8 --question 'Does the loaded rider stay on through departure, the bounded junction turn and arrival without launching?'
node .look/see-client.ts look --query 'proto=place&coop=1&pair=drop&legacyRide=1' --players 2 --real --eval dev/look/evals/place-coop.ts --until window.__coopDone --warm 120
```

| Check | Manifest ID | Observed result |
| --- | --- | --- |
| Boosted whole trip, video and curves | `1793778797711-79173` | Both peers reached 13 m/s; zero contact-loss samples; max peer gap 0.205 m / 0.05 m/s; max angular velocity 0.502 rad/s; both racks received 12 rails |
| Missing ride capability | `1793779033258-93151` | Both peers stayed at 9 m/s, zero rider loss; max gap 0.625 m / 0.10 m/s; both racks received 12 rails |
| Full place bot | `1793779124661-7634` | All expected actions finished, 78 checkpoints; no errors/water falls; 30 game minutes in 2:12 wall time |
| Trusted world inputs | `1793779294998-22112` | All assertions passed |

Actually opened: first 12 m/s split `hill-still.png`; boosted trip `hill-motion.png` and `hill-curves.png`; four consecutive `junction-01.png` through `junction-04.png` extracted at 3.0 seconds from that trip's `hill-realtime.webm`; successful legacy `p2-hill-still.png`; full bot `run/end-still.png`. The rider stays on top of the visible rail/log load, turns with the cart, and lowers onto the deck when cargo unloads. Consecutive junction frames show gradual pose changes without a visible snap or separation. Curves reach 13 smoothly, stop without upward velocity, and show the expected support-height drop at unload. The full-run end still confirms its completed overlay, not cart handling. Real-time smoothness and subjective feel remain unverified.

Failures retained: `1793778881277-81100` stayed at 9 but failed the position probe during a recorded 1.48 s world-clock deficit (8.82 m gap). The unchanged repeat `1793778960597-83506` passed gameplay assertions, but the external broker harness moved from `c7e714e0` to `279cbc71` during the run, invalidating its manifest; this worktree's source fingerprint did not change. The third run above passed with stable provenance. The full solo bot's optional “did something together” mark is absent, not an expected-beat failure; it reported 7:09 stationary time and one 2-second pushing stall.

Final Prettier and `npm run check` passed: lint, typecheck, 292 unit tests, registry, five level checks, assets and production build. The reviewed diff contains only the three cart/co-op files, the two existing evals and these two owning docs; all copy and excluded tree files are unchanged.

Limitations: absent capability was simulated on the wire; no actual older binary, eight-player load benchmark, physical device, audio or human feel test. The mandated broker workflow does not expose the independent `npm run load` browser benchmark. No new unit test or scenario was added. Process departure: root ran the prescribed `npm run inflight` before inspecting its implementation, which accessed remote metadata despite the local-only network restriction; disclosed immediately, not repeated, no upload/push/ship. All implementation stayed in this worktree. Commits are recorded in the handoff.
