# Step 7: present and puff reactions

Built on 2026-11-13 in `codex/server-players-step-7`, from `c69b9afb6`. Runtime tip: `0fce11d1f7ad21d9c3374e860d74f88db415a7e6`, tree `53bb68b6e0752d714aad59ad2bef28b8358a0a5a`. This report is a documentation-only follow-up. Implementation and targeted proof are complete; the latest check and ship-check are blocked by an unrelated moving-main prefab ratchet, detailed below. No push or ship.

## Change and scope

`boogler.gift` and `boogler.puff` now use server commands. The server derives the gift reaction from the catalogue, checks the actor against its current Boogler pose (5.6 m / 2.6 m), and applies per-player accepted-command cadence (1,500 / 2,000 ms). Malformed facts and refused commands increment `status().booglerRefused.{gift,puff}`. Accepted reactions are replicated output after apply, excluding the predicting actor. Duplicate requests produce no second event. No dialogue or inventory is sent by the server.

Prediction initializes the first heart visibly on the press and starts puff in the ride's current frame. Friends consume `onReact`. Presence `bg` is now `[act, wary]`; WORLD_NS is v43, with a dated entry and a clean v42 refusal test. Gift documentation now says the frisbee has no source. The seed is the only giftable kind currently in play; frisbee remains accepted by the server. Host-only catalogue fixtures prove grumpy and squish without adding playable items. The existing beach-ball refusal test still returns no gifted item and leaves the hand unchanged; that local path submits no gift reaction.

Small necessary wire addition to the plan's illustrative `boogler.puff {}`: puff carries an `end` deadline in room ticks, and the accepted event forwards it, capped at the normal 750 ms from server receipt. Friends animate only the remaining time and ignore expired puffs. This uses the existing compensated room clock and does not introduce a clock protocol or movement validation.

Deleted code: `ev`, `evN`, `seen`, `playRemoteEvents`, retired pet/celebration playback branches, and the unused celebration fountain. Event numbers 0, 1 and 3 remain reserved. No files were deleted. Seat code, prefabs, room replacement, movement and `presentation.ts` continuity are unchanged from the starting commit. Shared `origin/main` advanced externally to `fda0fc668` during this task; the worktree was not rebased and contains none of that later prefab work. Compare this branch with its merge base, `c69b9afb6`, rather than interpreting a two-dot diff against newer main as our deletions.

Implementation commits:

- `a334d3065` Publish accepted server command events.
- `8f8e5e4bc` Move Boogler reactions to server commands at v43.
- `0fce11d1f` Show predicted hearts and puff in their first frame.

Each commit names its DESIGN.md principle: Clear authority, Server hosts every room, or Telegraph everything. Cosmetics remain Local; talk/ride/wary remain Owner presence; accepted shared reactions use the server command/event boundary.

## Copy and remaining lead users

`src/sim/gift-catalog.ts` is byte-identical to the starting commit and current local origin/main. SHA-256: `58a3c20bf24e6c40a814136aa607658e78b546ac65994e22361f5d41143b2247`. `lines.ts`, `talk.ts`, `barks.ts` and `presentation.ts` also have no diff. No ROM data. Suspect existing copy for the owner: `gift-catalog.ts:24` is the unreachable frisbee line; it remains verbatim.

No production `addHostField` registrations remain. The lead still has infrastructure users beyond election: server election/welcome/visibility/departure/status, `ws-room`'s lead API, `netplay/net.ts`'s Host registration wrapper, lead-change presence resend and pre-entry lead heartbeat, telemetry role and debug displays. Scanners, scenario helpers, peer tests and registry/presence tests still refer to it. These are left for step 8. Exact census: [lead users](../../.look/step7-lead-users.txt).

## Budgets

Tests were added and observed failing before implementation ([initial red](../../.look/step7-red.log), [budget red](../../.look/step7-budget-red.log)). The host tests exercise real command adapters, the host and replicated mirror across ten 10 ms phases. Simulated latency is RTT, split equally across uplink and downlink; these are event-delivery measurements, not rendered-frame timings.

| RTT | Worst friend's hearts | Minimum friend's puff lead before launch | Puff deadline |
| --- | --- | --- | --- |
| 0 ms | 10 ms | 740 ms | 750 ms after press |
| 80 ms | 90 ms | 660 ms | 750 ms after press |
| 200 ms | 210 ms | 540 ms | 750 ms after press |

All meet 250 ms hearts and at least 350 ms puff lead. Local prediction is synchronous and does not traverse these delays. Existing authority tests also retain the talk/ride/flee measurements of 100/180/300 ms at those RTTs.

Browser observations: final seed at 0 ms had first local draw 5.6 ms after click, friend receipt 15.0 ms and first friend draw 18.2 ms. The 80 ms capture had 4.3 / 96.0 / 99.1 ms respectively; that capture predates only the final heart size initialization and eval documentation. Final 200 ms ride: local puff and command share frame timestamp 15375.1; friend's first puff draw is 235.3 ms after press, 515.9 ms before launch. Local puff ends in the launch frame; friend puff ends 16.3 ms later, within one display frame/room-clock estimation. It does not run another 750 ms after receipt. Exact cross-client frame identity is not established.

## Checks

All runtime checks below cover `0fce11d1f` or its identical pre-commit source, after Prettier. These successful runs preceded the final moving-main failure described immediately below the table:

| Check | Result / log |
| --- | --- |
| `npm run check` | Pass: 1,892 tests, one existing TODO; lint, types, registry, assets and build pass. [Log](../../.look/step7-check-complete.log) |
| `npm --prefix server test` | 362/362. [Log](../../.look/step7-server-rerun.log) |
| `npm run test:net` directly in this worktree | 191/191. [Log](../../.look/step7-net-final.log) |
| `npm run scenario -- boogler-tag boogler-talk-pad interact one-hand smoke second-tab` | All six pass, none skipped. [Preserved verdict](../../.look/step7-scenarios-verdict.json) |
| `node dev/ship-check.ts origin/main HEAD` | Registry, lint, types and 857 affected tests pass. [Log](../../.look/step7-ship-check-final.log) |
| `npm run registry` | Pass. [Log](../../.look/step7-registry-final.log) |
| `npm run review-stamp -- . --no-fetch` | `a09184482eb2`, 11 review files; a stamp, not an independent review. [Log](../../.look/step7-stamp-final.txt) |
| `npm run loop -- run` | Pass. [Log](../../.look/step7-loop.log) |
| Replication packet budget test | 2/2. Empty hypothetical subscriber: 30 packets / 1,012 bytes per minute; wander 41 / 2,106; busy 53 / 5,844. Empty rooms without subscribers emit none. [Log](../../.look/step7-replicate-budget.log) |

One full server run encountered an unrelated `client-address` Fly IPv4 admission ECONNRESET; that file passed 48/48 on rerun, then the entire suite passed 362/362 without a code change. Initial browser execution was sandbox-blocked; the explicitly requested npm scripts passed with the required execution permission. No direct Chromium invocation was used.

After formatting this report, `npm run check` was repeated: all 1,892 tests passed again (one TODO), but registry failed because the shared local `origin/main` had advanced to `fda0fc668`. That later prefab conversion lowers `dev/lint/prefab-debt.json`'s `colliders/src/entities/town/workshop.ts` allowance from 8 to 6. This branch changes neither file, so comparing its unchanged baseline against newer main reports false growth. [Final check log](../../.look/step7-check-report.log). A repeat of the exact requested `node dev/ship-check.ts origin/main HEAD` also fails on that registry comparison: [latest ship-check](../../.look/step7-ship-check-moved-main.log). The documented `npm run registry -- --base c69b9afb6` passes: [starting-base registry](../../.look/step7-registry-base.log). This is supplementary evidence, not a claim that the latest default checks passed. No ratchet exception, prefab edit or shared-ref reset was made. Integrating this branch with current main and rerunning checks remains necessary.

An initial `npm run inflight` attempted its default fetch and failed writing FETCH_HEAD under the sandbox; no successful fetch occurred. Subsequent comparisons and the review stamp use local refs with no fetch.

## Visual and bot evidence

Questions: do seed presents show hearts on both screens; does a mid-walk ride retain the rider, show the puff before launch, and finish it at launch?

- [Final seed, 0 ms](../../.look/evidence/1794624773215-48089/evidence.json): opened both stills and the motion sheet. Hearts are visible over The Boogler on both screens; the giver sees the unchanged seed dialogue. [80 ms seed](../../.look/evidence/1794624034246-20370/evidence.json): also opened both stills and motion sheet; same observation, with the version limit noted above.
- [Final runtime ride, 200 ms](../../.look/evidence/1794624490867-37982/evidence.json): opened both stills, motion sheet and extracted consecutive-frame sheet. The rider stays aboard through the ride and launches; a palm partly obscures the inflation. Timing above is from this run.
- [Short puff capture](../../.look/evidence/1794624848062-49448/evidence.json): opened both stills and motion sheet; palm occlusion persists, so it is not a clean puff visual verdict.
- [Opposite-angle ride](../../.look/evidence/1794625377394-66688/evidence.json): third ride framing round; opened both stills, motion sheet and [12 consecutive video frames](../../.look/evidence/1794625377394-66688/puff-consecutive.png). Inflation is visible before the launch and the rider is airborne afterward; the speech bubble covers part of the puff. This used an ignored copy of the same eval with only the camera offset reversed. Its run was marked UNDER LOAD, so it supplies visual context, not timing/feel evidence.
- [T2 playthrough](../../.look/evidence/1794624552302-40556/evidence.json): read the report and opened the end still. Two peers complete the track, 236 matching server steps, final tick 2,149 and matching hash 3,942,417,531. No missed beat or bot failure.
- [Frozen broker world-inputs failure](../../.look/evidence/1794624553602-40689/evidence.json): the frozen `d87c05719` scenario waits for the retired gifts layout and times out. The unchanged current scenario passes via `npm run scenario -- world-inputs`; [preserved current verdict](../../.look/step7-world-inputs-current-verdict.json). The failure is retained, not counted as a pass.

The first seed capture exposed the invisible zero-delay heart and caused the final prediction fix; its earlier visual result is superseded. All final broker manifests record the tested runtime commit/tree and no edits during their run. The launcher separately assembles `handoff.md` and `evidence.json`.

## Limits

Not tested on a device. Subjective real-time smoothness and fun remain unverified; video frame sheets and telemetry do not establish them. The friend puff end is observed within frame/clock precision, not exactly simultaneous wall time. Grumpy and gift squish are host-only proofs as requested; beach-ball refusal was covered by the existing local test, not a new live ball interaction. Checkpoint B remains open: no fresh solo ride, step-meter sample, first-tab-close or hidden-tab/restart visual coverage was added, and the aggregate `check:full` command was not run (its requested check/server/net components were). No step 8 work or independent review was performed.
