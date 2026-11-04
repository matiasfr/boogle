# Remove the round's visible objective

## Goal

Remove the objective sentence, orange world beacon and edge chevron from the default round, preserving internal progression and playdata. Serve DESIGN.md 11, **Show, don't tell**, with the smallest world cue needed; do not change unrelated copy, bands, tree rules, cart/train naming or blue crate shafts.

The owner's task explicitly authorizes implementation, verification and local commits. The checkout's decision log does not contain the named 3 November “after round 4” entry; the task supplies the decision. `docs/playtests.md`, round 4 “Calls they raised”, supplies the warning about following the objective and not understanding a second train.

## Design

- Presentation is **Local**. Remove the objective DOM and beacon meshes rather than making a temporary hidden state. Retain `objective()`'s strings and decision ordering for `objective` playdata events. The existing `playObjective` API remains the event path, including transitions to an empty string. No saved, Owner, Host, Lockstep or wire shape changes.
- `src/proto/place/signs.ts` continues owning existing boards and counters. `objective.ts` no longer depends on a rendered beacon or arrow target. `index.ts` keeps calling the objective calculation for telemetry. `verbs.ts` no longer requests an objective pop-up when Interact finds nothing.
- Boiler discovery is the only immediately justified placement change. `props.ts` previously placed it west of the forge at local `(-95, -4)`. Put the same mesh and pickup point together on the open forge apron at local `(-81, 5.4)`, between the returned player's track and familiar rail rack; verify it clears the crane, track and turntable. This moves it farther off the rail than the initial (-78, 5.4) candidate. Its existing `job.boiler === 1` visibility and pickup behavior stay intact. If the normal return view still cannot see it, adjust that position within the apron before adding decoration. Do not add a replacement beacon or floating symbol.
- Far Head already has a continuous laid track and a lamp sequence running from its end toward home; `headShow` fires rockets at both ends, without moving the camera. Preserve these and judge their actual visibility. The reason to return and take a boiler to the old train remains an owner question if the physical arrangement does not communicate it.
- The second train already physically loads the pier kit at the village and unloads it at Far Head (`cargo.ts:arrive`). Preserve that demonstration. Do not invent another train unlock, alter its schedule or rename it to explain the payoff.

## Stage audit to carry into place.md

| Former objective target or instruction | Existing world cue / smallest change | Remaining question |
| --- | --- | --- |
| Follow the opening path; find the sleeping machine | Wide path, existing Timber Camp sign, footbridge and rusty machine at its end | Blind route discovery unverified |
| Wake machine; first chopping | Machine in the route, wake interaction, physical tool reward and banded trees | No changes to bands or tool rules |
| T1 logs and depositing | Nearby grove, receiver/feeder, material board and carried logs | Inspect active receiver without beacon |
| T2 logs and stone | Receiver board, banded rocks, multi-axe and broken rock pieces | No new text |
| T3 logs and great beam | Oversized tree, beam slot/bill, felled trunk and shoulder interaction | Recognizing great-tree requirement without sentence needs owner |
| Machine feeding, laying and moving | Logs roll in, machine moves, track appears | Already explained physically |
| First path; walk home | Pull-out, village rockets, new continuous bridge, lamps, commuters | Already points across the bridge |
| Axe chest and pack chest | Existing visible chests and blue shafts | Preserve shafts |
| Double-jump device | Pillar beside new path, device and demonstration | Acquisition order still bot-driven |
| Forge F1 and F2 | Scaffold, receiver/feeder, building animation, familiar carry loop | Already explained physically |
| Turn onto line 2; collect rails | Turning machine, forge pouring rails onto rack, existing Take rails interaction | Inspect forge and turntable view |
| Q1, then Q2–Q3 logs and rails | Receivers, survey stakes, tracks, log cart delivering to frontier rack and forge rail pile | Long rail carry stays as designed |
| Hook device and quarry gate | Device by route, visible slabs/rings, lever and connecting mechanism | Blind ability/gate discovery unverified |
| Q4 and Q5; tower, glider and sea gate | Tower rings, summit device, sea gate and already visible destination | No changes to movement/gates |
| Far Head reached; head home | Home-end rockets, laid trestle and lamps sequencing toward home | Route is shown; motivation to return is not conclusively explained |
| Find and shoulder boiler | Move actual boiler to visible forge apron beside return route | Physical purpose can still be missed |
| Carry boiler to camp's old train | Existing rusty locomotive, matching boiler shape and nearby Fit the boiler interaction | No distant explanation of destination; owner must judge |
| Trains unlock; stand on platform | Existing reveal, platforms appearing, signal and arriving train | Second train's value before seeing cargo remains weak |
| Take second train to Far Head | Actual pier-kit loading onto its flatbeds and unloading into frontier rack | Bot knowing destination cannot prove first-time understanding |
| Supply and build pier | Delivered logs/rails beside final receiver, familiar feeder/build loop | Already explained physically |
| Finished run; look toward shard | Pier, buoys, distant shard and existing ending pull-out | Preserve all existing ending copy |

## Steps

1. - [x] Remove objective presentation and unused UI callbacks/styles; retain the internal labels, ordering and empty transitions. Default and explicit place routes use this same presentation module.
2. - [x] Move boiler and pickup to (-81, 5.4). Inspected approach and close views show it clear of rail, rack and crane. No steam or other decoration was needed. Keep the unresolved destination/motivation questions below.
3. - [x] Update `docs/game-design/place.md` with all 22 guidance stages and owner questions. Preserve unrelated copy and protected visuals/rules.
4. - [x] Format, lint and pass `npm run check` (292 tests). Full solo bot passed, 77 checkpoints, no expected misses or graphics errors. Opened 15 PNGs covering the main beats and reframed missed subjects; no hide-HUD workaround. Restored train cargo was empty, so cargo motion remains unverified. No new tests or scenarios.
5. - [x] Review and simplify the diff; prepare local imperative commits naming DESIGN.md 11. Evidence is under `.look/evidence/`; the final assessment links the full bot manifest and inspected-image manifest. No push, upload or ship.

## Evidence and limits

- Full final-source run: `.look/evidence/1793773937052-53364/evidence.json`; all expected beats came, and `text.json` contains no objective DOM entries. The optional co-op mark “did something together” did not occur in this solo run.
- Boiler close view: `.look/evidence/1793774247631-62664/evidence.json`; Far Head return: `.look/evidence/1793774226929-61644/evidence.json`; pier: `.look/evidence/1793774278263-63635/evidence.json`.
- The initial baseline completed but was marked stale because this plan was created during it. A later bot launch omitted the required prototype/shot query and stopped before playing; the corrected full run above passed. One look invocation used an unsupported one-frame count and was retried with two. No source edits occurred during captures or bot runs.
- After the passing run, only these documentation completion notes changed. Final source matches the tested tree `fcfc375beb00da1ca0729527d106d63f67d59868`.

## Risks

- Retaining a no-op UI API would make the removal misleading; delete presentation consumers instead. Removing objective calculation entirely would lose telemetry.
- No apply/presence/save/transport edits are needed; room-safety hazards remain outside scope. A placement is Local and adds no mesh, light, tick work or new state. Use the current boiler shape and ground height calculation.
- Ordinary counters, interactions, item cards, celebration banners, resident dialogue and blue crate shafts stay visible and unchanged. “Nothing on screen” means no objective presentation, not hiding the rest of the game for evidence.
- The bot has route and mechanic knowledge. A full successful run demonstrates progression still works, not that a first-time player understands it. Real-time feel, a blind first run and device play remain unverified.
- Parent attempted `npm run inflight`; its fetch was blocked. The task forbids nonlocal network, so do not retry or infer current remote overlaps from old refs.

## Open questions for the owner after verification

Does the boiler read as a repair for the old camp locomotive, and is the benefit of the second train clear before its first cargo delivery? Does reaching Far Head make returning home desirable, in addition to making the route home visible? These are playtest questions, not permission gates for the authorized removal.

## Rebase follow-up

Rebased onto `origin/main` at `0e4376b1`, keeping the objective removal and all incoming round-4 fixes. The sole conflict in `place.md` retained main's halt clearance, boarding and warm-up paragraphs alongside the new guidance audit. The source merges preserve same-room Start fresh and recovery onto real track colliders. The boiler remains at (-81, 5.4), with mesh and pickup sharing the position; main's carry warm-up remains intact. The audit now distinguishes Happy Clam's return hook from the still-open question of why to travel home from Far Head, and corrects the former new-room restart description. Earlier evidence above is historical; the follow-up job reports new checks, bot results and inspected PNGs for this combined build. No additional gameplay change is part of this reconciliation.
