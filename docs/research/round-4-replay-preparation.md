# Round 4 replay preparation, 5 November 2026

Serves DESIGN.md 11, Show, don't tell, and 8, Designed for drop-in, drop-out.

Work stayed on `codex/replay-ready`, starting exactly at the available local `origin/main` `fd54894e`. External network use was prohibited, so this ref was not fetched and `npm run inflight` (which fetches) was not run. Nothing was pushed or shipped. The Boogler's copy is unchanged.

## Changes

- `eac11383`: remove the unnecessary long-way-round comparison banner. Preserve the crossing record, save and fanfare.
- `60838d35`: explicitly open the raised first-slab chest; route the co-op forge worker across the completed bridge before choosing timber; update the old great-tree probe to the earned proper-axe rules.
- `0d71b4c5`: reconcile the solo notes and both 5 November proposal entries with implementation commits; leave missing items unchecked.
- `9e3dd137`: exercise real earned-axe felling in the staged cargo probe, preserve legacy-save coverage, and add focused bridge/phone measurement evals.
- `320c0eb3`, `8c642ecf`: collect the second climber's personal first-slab reward, and wait for the complete crate/reward lifecycle before the next hook. Correct the NPC documentation's claim that left/right selection worked on the initial main snapshot. The missing implementation has since been restored below.
- `1599ed02`: allow 180 seconds for a co-op train pickup when the partner diverts it; keep the solo deadline and all boarding predicates.
- `f2d3710e`: open ordinary reward crates from the offered interaction range instead of trying to walk through the partner/feeder to their centre.
- `91e0ecaa`: let the existing landing probes finish before a failed expected beat stops the coordinator; add a staged idle-position reproduction. The strict landing assertion is unchanged.

The initial replay pass changed production behavior only for the requested banner removal. The follow-up also restores the two missing input/HUD commits below. The first-slab and forge-route failures identified outdated bot assumptions. A later intermittent grounding outage remains unresolved, as detailed below; it is not counted as fixed. No design backlog was built.

## Follow-up: restore the two omitted commits

The owner identified two commits omitted from main by a ship-script rebase mistake. Both local objects were cherry-picked, preserving the later dock/town, conversation-camera and banner-removal changes:

- `af0e4239` → `5296357b`: capture left/right throughout a conversation and repeat horizontal picks. Restore the NPC documentation to match the now-present implementation.
- `6f46f171` → `3bae8f40`: move the existing live name/status nodes into Pause on every platform; retain the corner menu for touch input only; show money and useful current carry instead of Track/Town and empty carry rows.
- `ce5b3144`: advertise all arrow keys in the generated keyboard guide and retain focused broker evals. No Boogler copy or production dialogue changed.

Fresh acceptance uses the real input poll loop with fake standard, axes and hat D-pads. Each run passes **58 assertions**: left/right picks and held repeats, no Ping/Flag while typing or choosing, positive Ping/Flag control after closing, keyboard left/right, hidden identity during play, original populated name/Live nodes in Pause after Room/Controls/back/reopen, touch-only menu, money-only permanent stats, and conditional carry visibility. Carry states are diagnostic Local readouts, not another Drop gameplay proof. The existing earlier cargo probes retain that proof. No new scenario was added.

| Fresh manifest | PNG actually opened | Observation |
| --- | --- | --- |
| [Desktop talk](../../.look/evidence/1793885390240-52068/evidence.json) | `custom-still.png` | Second answer has a clear yellow selection/outline; horizontal Pick hints. Diagnostic card, not first-stage worker framing. |
| [Desktop Pause](../../.look/evidence/1793885453495-52488/evidence.json) | `custom-still.png` | Name and Live readable above $0; no corner options button; full menu fits. |
| [Phone portrait Pause](../../.look/evidence/1793885378886-51445/evidence.json) | `custom-still.png` | Name, Live and money readable; empty carry absent; all menu actions fit. |
| [Phone landscape Pause](../../.look/evidence/1793885435293-52279/evidence.json) | `custom-still.png` | Name/Live readable; lower menu continues beyond the visible scroll area. |
| [Phone play](../../.look/evidence/1793885490846-52789/evidence.json) | `custom-still.png` | Options button remains at top right; name/Live absent from play HUD. |
| [Landscape scrolled](../../.look/evidence/1793885566144-53425/evidence.json) | `custom-still.png` | After a 77 px scroll, More and Leave are fully inside the card; bounds assertions also pass. |

All six final captures pass WebGPU/advancing-frame/no-page-or-graphics-error checks. The phone proxy sets touch, DPR 2 and .60 scene scale before production boot at 440×796 or 796×440. The broker enters with a mouse; the eval then explicitly returns to finger input. That is Mac Chromium emulation: **not tested on a device**, Safari or a physical controller. Horizontal left-stick behavior and changing peer count/name while Pause is open were reviewed in source, not dynamically tested. These stills do not verify motion, feel or discoverability.

Failed fixture attempts are retained: [initial](../../.look/evidence/1793885076372-48862/evidence.json), [confirm retry](../../.look/evidence/1793885120375-49617/evidence.json), [malformed pad event](../../.look/evidence/1793885155131-49948/evidence.json), [remote Boogler](../../.look/evidence/1793885192359-50223/evidence.json), and [mouse-entered phone](../../.look/evidence/1793885331102-50880/evidence.json). The classic Boogler's distance guard closed the remote diagnostic talk, so these were not valid evidence of a live-talk input leak. The final fixture uses Place's normal talk card at the player's position. Its intermediate voice tuple type error was fixed. The successful preliminary desktop still `1793885286789-50542/custom-still.png` was also opened, but the final desktop capture above supersedes it.

`npm run check` passes 330/330 unit tests, lint, types, registry, level/asset validation and production build (`.look/replay-followup-check.log`). [Fresh world-inputs](../../.look/evidence/1793885468369-52549/evidence.json) passes all seven assertions with no graphics errors. Captures used stable source trees; no source changed during a run. Subsequent documentation changes do not alter those observations. The full solo/co-op bots and exposure measurements below predate the restored HUD/input commits; they were not repeated for this UI-only follow-up and are not represented as final-tree full-route evidence.

## Route diagnosis and final checks

Final route code: `1599ed02`; solo was verified on `f2d3710e`, before the co-op-only deadline change. These full-route runs predate the restored HUD/input commits above. Route, cargo and render code are unchanged by that follow-up.

- **Solo PASS:** [manifest](../../.look/evidence/1793881990832-41330/evidence.json), 29 game minutes / 4m35s wall; bot ends at 1704.0 seconds; all expected beats, zero water falls, no graphics/page errors, 84 checkpoints. Three short walking-into-something samples total five seconds; no stalled route. Optional crystal/together telemetry is unmarked, not a failed expectation. The route's final optional-secret tour uses the existing staging teleports; this is the full standard solo bot, not a claim that every optional visit was continuous walking.
- **Continuous co-op PASS:** [manifest](../../.look/evidence/1793883339750-44394/evidence.json), 18m04s wall at 1.5x, all 23 checkpoints, reload and leave/rejoin, no skips/fixture poses/recovery teleports, zero water falls and no page/graphics errors. Both peers contributed (153 / 162 recorded materials) and reached the completed pier. Stations, rack and shared rewards agree; final train positions agree within the harness's 2 m tolerance (actual gaps 0.013 / 0.006 m). The diverted pickup took 94.6 seconds, confirming why 90 seconds was insufficient.
- **Transient train discrepancy remains unreviewed in motion:** final-segment position gaps have p95 0.010 / 0.011 m and maxima 2.705 / 6.200 m, including network lag/read skew, also recorded while both page clocks were running. Final agreement does not establish smooth peer presentation. Peak page clock deficits across the whole run were 0.595 / 0.300 game seconds; both achieved 1.50x. No persistent divergence or failed ride was observed, but do not describe transient sync as perfect.
- `npx prettier --write` on changed files; `npm run check`: 330/330 tests plus lint, type, registry/level/asset checks and production build pass. Final check log: `.look/replay-check.log`.

The original [solo main run](../../.look/evidence/1793877398791-18539/evidence.json) reached the end but failed the first-slab box deadline. The raised pedestal put it outside the old bump-pickup assumption. The bot now lands, presses the offered Open action, and waits for the whole reveal; the original three-second collection assertion remains. The original [co-op main run](../../.look/evidence/1793877699168-20440/evidence.json) failed at the forge frame when the worker selected camp timber and returned by the low shore. Its end image shows the worker swimming beside the cliff. The repaired bot first crosses the actual completed bridge. That failure was not a time limit. At requested 5x, player 1 also accumulated 136.59 game seconds of clock deficit, so subsequent co-op runs first used 2x, then 1.5x after further peak drift.

The apparent Station 2 stall was an insufficient earlier limit: the legitimate supply/axe trip takes roughly 172–175 game seconds before the next milestone. Full solo runs proceed through Station 3 and the ending. `--long --stall 1800` gives 30 wall minutes and a 30-game-minute inactivity allowance; missed expected beats still fail.

Intermediate failures are retained: [co-op after Q4 rejoin](../../.look/evidence/1793878972708-30599/evidence.json) reached checkpoint 16, then the second climber's personal chest interrupted the next hook; [co-op reveal race](../../.look/evidence/1793879952234-34717/evidence.json) and [solo reveal race](../../.look/evidence/1793879953402-34723/evidence.json) showed why `gettingItem()` alone was insufficient. A secret is marked collected before its crate shake queues the reward. The final helper waits for both `showing()` and `gettingItem()` to clear. These were failed runs, not timeouts or passes with caveats. The earlier [passing solo](../../.look/evidence/1793878971523-30547/evidence.json) is superseded by the final rerun.

The [later 2x co-op run](../../.look/evidence/1793880712032-37361/evidence.json) failed the dry-landing assertion at checkpoint 6: the idle player was on walkable terrain, 1.535 mm above raycast support, nearly motionless, with no reported contacts and coyote at −34.4 seconds. Both opened end stills show dry players. Nonstatic bodies have sleeping disabled, so this is not established as a sleeping-body issue. Peak page deficits were 5.139 / 1.331 game seconds. The coordinator stopped before stationary-jump/walking probes finished. Do not dismiss this as a timeout or claim it fixed.

A [real-time staged repetition](../../.look/evidence/1793881490136-38972/evidence.json) restored the path-opened save and exact failed position, idled 45 seconds, then completed existing probes: coyote 0.1, stationary jump rose 1.704 m, and walking moved 1.33 m. It did **not** reproduce the outage; resetting the pose loses approach/contact history. No speculative physics epsilon was added because the contact contract forbids treating near-ground air as landed. The last co-op rerun retains that strict check and preserves full diagnostics on failure.

The [first 1.5x repeat](../../.look/evidence/1793881669287-40008/evidence.json) then failed a different local walking deadline at Station 2's reward: it stopped 2.2 m from the crate while the Open prompt was visibly offered and the partner stood nearby. Both end stills were opened. This was a bot walking-target mistake, not the overall run limit; `f2d3710e` uses the offered interaction range and preserves the crate-open deadline. Clocks held 1.50x, with peak deficits 0.417 / 0.220 seconds.

The [later 1.5x run](../../.look/evidence/1793881989647-41269/evidence.json) reached checkpoint 20 after both reload/rejoin, both personal first-slab collections, the tower, glider and boiler passed. It failed the **90-game-second boarding deadline**, not the overall limit. The partner's Village call retargeted train 2 just before Far Head: sampled position moved 509.15 → 520.59 → 524.16 while its target changed to Village and it reversed without stopping. It returned to Village, the partner boarded, then departed back toward Far Head. At cutoff it was 32 m away, about 4–5 seconds from arrival. The peers agreed on this trajectory. This is a wait-budget failure; the co-op-only boarding deadline is extended to 180 seconds without changing arrival, grounding or reward conditions. Both end images were opened: player 1 waiting dry at Far Head, player 2 seated aboard. Peak page deficit stayed below one game second (0.880); train 2 sampled gap p95 0.006 m, max 3.606 m including lag/read skew, final gap 0.002 m. Do not claim perfect transient agreement from final convergence.

## Focused verification

- [Great-tree gate](../../.look/evidence/1793878187273-23624/evidence.json): early attempts produce rebound feedback but no shared work; no early shoulder; Station 3's 40 logs earn the axe; the proper axe is shared; twelve real strokes fell the tree; the beam is consumed once. The original probe incorrectly expected no early Chop prompt; current authored behavior intentionally permits the rebound.
- [Drop and recovery](../../.look/evidence/1793878843383-29972/evidence.json): preserve the legacy revision-zero duplicate-shoulder check; Drop frees backs; early pickup is rejected without spending logs. Then earn a fresh axe and fell through the real safe-fall path. Dropped pose survives save/restore, reachable cargo stays, unreachable cargo returns once, competing pickup produces one shoulder, unsafe Drop returns to the original position, and boiler departure/rejoin recovery passes. This is a staged two-player probe, not a complete playthrough. An [old hardcoded-fall fixture failure](../../.look/evidence/1793878355314-25046/evidence.json) remains inconclusive about production collision behavior.
- [Bridge crossing](../../.look/evidence/1793878844575-30015/evidence.json): restore the actual path-opened checkpoint and walk across with real input. The crossing records 22.515 seconds and the sampled banner list is empty.
- [world-inputs](../../.look/evidence/1793879951084-34663/evidence.json): seven assertions pass against the running build; no graphics errors. It emits no PNGs.

These targeted manifests retain their exact source fingerprints, including dirty-but-stable trees before their small commits. Later changes affect the route bot, diagnostic evals, documentation and the restored input/HUD behavior verified above; the tested production cargo, bridge and rendering code is unchanged. No source was edited during a broker run.

## Phone-profile load and GPU

Four fresh top-level production-browser visits, serial **fixed / before / before / fixed**. The existing boot proxy sets touch mode before startup: 440×796 CSS pixels, DPR 2, MSAA 1, scene scale 0.60 (528×955 scene target; 880×1592 output). Same shore camera `[884,8,151]` looking at `[868,0,144]`, FOV 62; ten real seconds of settling, then two five-second hardware timestamp samples per visit. Approximately 300 complete frames per sample, no missing frames.

“Before” restores only the seven exposure-integration files from pre-fixed `19c4c94e` in this worktree; other current-main changes remain constant. All seven were restored afterward; no exposure edit remains. The preliminary iframe visit is excluded because it reused the parent's assets and was unsuitable for top-level load comparison.

| Visit / manifest | Interactive ms | Render mean ms, windows 1 / 2 | Render p95 ms, windows 1 / 2 | Total GPU span mean ms, windows 1 / 2 |
| --- | ---: | ---: | ---: | ---: |
| [Fixed B1](../../.look/evidence/1793878545924-27041/evidence.json) | 5137 | 7.284 / 7.472 | 7.811 / 7.889 | 8.054 / 8.240 |
| [Before A1](../../.look/evidence/1793878614576-27640/evidence.json) | 5323 | 6.513 / 7.052 | 7.957 / 9.012 | 7.384 / 7.907 |
| [Before A2](../../.look/evidence/1793878660764-28154/evidence.json) | 5376 | 7.340 / 7.477 | 8.869 / 9.326 | 8.131 / 8.239 |
| [Fixed B2](../../.look/evidence/1793878724973-28549/evidence.json) | 5412 | 7.603 / 7.557 | 8.190 / 8.095 | 8.424 / 8.380 |

**Flag:** equal-weight mean render span rises **7.095 → 7.479 ms (+5.4%)**, and combined render/compute span rises **7.915 → 8.274 ms (+4.5%)**, despite render contexts falling 7 → 5. Compute mean improves 1.030 → 0.920 ms; fixed render p95 is lower in these windows. Both paired mean comparisons worsen, but four visits do not isolate thermal or scheduling noise. No speedup claim and no unsolicited retuning.

Interactive load averages **5349.5 → 5274.5 ms** (−75 ms), with overlapping ranges and fixed B2 the slowest visit. Treat load as roughly unchanged. Hardware is this Mac's nonfallback Apple Metal-3 adapter, with no CPU/network throttling; browser profiles are fresh but Metal caches, other applications and thermals are uncontrolled. The service worker registers during startup. GPU spans include intervening gaps and are not active shader time or display latency. This is **not tested on a device** and does not reproduce iPhone Safari.

## Images actually opened and verdicts

- Initial-main solo `run/end-still.png`: Buddy dry on the optional final ledge. Initial-main co-op `run/end-still.png` and `run/p2-end-still.png`: one player safe, the forge worker visibly swimming at the cliff.
- Great-gate and final Drop `hill-still.png` and `p2-hill-still.png`: both peers show the completed station; after Drop, shoulders are empty and the pale beam/red boiler sit on dry ground. Assertions establish ownership/recovery; stills alone do not.
- Bridge `hill-still.png`: Buddy on the completed village-side rails, ordinary HUD present, no comparison banner. The timed action also sampled banners through the crossing.
- All four phone visits' `custom-still.png`: matching shore composition, readable caustics, brighter sand/shallows with fixed exposure. These are visual observations, not owner approval of calibration.
- Intermediate co-op Q4 failure's two end stills: player 1 below the next hook, partner waiting at the station. Intermediate reveal-race co-op `p2-end-still.png`: bucket reward visibly owns the screen. Intermediate solo end stills: dry final ledge despite an earlier failed expectation; completion image alone was not counted as a pass.
- Final solo `1793881990832-41330/run/end-still.png`: Buddy dry on the last optional ledge, bridge visible above. Final co-op `1793883339750-44394/run/end-still.png` and `run/p2-end-still.png`: both avatars together above the dry Far Head platform with packs and pets visible; completed-route text present. These frozen frames do not establish foot contact or smooth train motion.

The idle-reproduction `custom-still.png` was also opened: dry terrain by Station 3 after its recovery probes; its logged jump/walk measurements establish those actions, not that still.

No video or consecutive motion frames were inspected; real-time feel, animation smoothness and actual display presentation remain unverified.

## Still open for the owner

The [solo tracker](../plans/round-4-notes.md#solo-play-4-november-owner-on-iphone-not-yet-triaged) and [proposal audit](../decisions.md#the-shape-of-the-game) separate main's implemented items, the local input/HUD restorations, and owner/device approval. Remaining: first-stage worker framing; background `createCommandEncoder` recovery and the intermittent co-op grounding outage and transient train-position gaps; bridge-bell interpretation; museum zoom/hat-buyer reaction; water/sky fit and the measured GPU regression. Existing reports also flag darker shop/sky and brighter sand, without owner approval.

Tree regrowth, dropped-resource despawn, safe-rack integration and supply accounting wait for the production plan before slice 2. Distinct track-layer machine art remains an art pass. Prepared warm evening, smaller-sky comparison and room-owned time remain; cart-first/money wait until after replay, and the classic resource bug until after T1. Physical gamepad/touch, device load/GPU, first-time discoverability and the owner/Grant feel verdict remain open. Stop here for their replay.
