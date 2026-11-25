# Greybox leg 4 Checkpoint D

25 November 2026, HOTBOX, Node 26.13.0. The run started from main at `ce6701ba1`, which contains leg 4 step 6 (#2430).
Checkpoint D remains open. The canonical loop reached Port Quay with one, two, and three players. The alternate
`T3 before beam` order hit the previously recorded softlock at `jump`.
The proofs use that game tree. The final branch rebase includes later main changes that were outside these runs.

## Loop

Commands `npm.cmd run loop -- run` and `timeout 1800s npm run loop -- run` for the retry. The default also printed
four-player results. The table records the requested one to three players. See `.look/checkpoint-d/loop.log` and
`.look/checkpoint-d/loop-retry.log`.

| Players | Plug gate idle (s) | Cave 1 idle (s) | Cave 2 idle (s) | Cave 3 idle (s) | Area 7 / allowance (min) | Built route | Whole route including stand-ins |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | 34 | 34 | 34 | 10 / 48 | 1:21:54 | 2:08 |
| 2 | 172 | 185 | 32 | 38 | 15 / 48 | 1:25:57 | 2:11 |
| 3 | 230 | 134 | 35 | 40 | 15 / 48 | 1:25:32 | 2:10 |

The idle column is mean seconds per player spent waiting or with no work left while the node was open. The
`plug-gate` and `cave-1` waits exceeded Checkpoint A's 60-second threshold in both co-op runs. The cave nodes recorded
zero refusals in canonical order. All 50 order probes were refused as expected, including all four for leg 4.

The alternate order printed `SOFTLOCK at jump (24:04: every player is done and the node is not); GRAPH BUG: the graph
allows "T3 before beam" but the rules never finished jump`. Two and three players hit it at 22:51 and 22:13.
The repeat reproduced all three times. The leg 4 plan's steps 1–3 notes already record the same result on the v69
control. The other tested orders finished.

## Network and reconnect

Command `timeout 2400s npm run test:net` for both runs. The first suite finished 315/316. The sole failure was
`HOST_ONLY counts leg rejoin's checks (ran 46, listed 23): update it`. Both seed proofs passed in that run.
The corrected inventory gave a clean retry, `PASS: 315/315 checks passed`. See `.look/checkpoint-d/net.log` and
`.look/checkpoint-d/net-retry.log`.

The `cave-mid` host proof wrote the save before opening the first tab. Both tabs joined and matched. After a 564-tick
round trip, the rack held 20 logs and 20 rails. The first tab picked up 16 rails, left, and rejoined after the server
restart. The cave row, rack, train kits and carried rails matched the expected values throughout. After restart and a
further round trip the carrier still held 16 rails, the rack held 20 logs and four rails, and train 12 held 20 logs and
20 rails. All 23 cave assertions passed. The mirror probes check train kits and the carrier's back. The tabs share a
replica hash and the host checks the leg row and rack directly.

The requested `timeout 420s npm run scenario -- reconnect-edit --rail-seed cave-mid` failed before opening a browser
on both attempts with `unknown scenario --rail-seed, cave-mid`. The existing scenario exercises a roster edit over a
socket drop. The plan names the seeded host test for the restart proof. See `.look/checkpoint-d/scenario.log` and
`.look/checkpoint-d/scenario-retry.log`. Neither attempt reached verdict creation.

The replay `node --test test/loop-graph.test.ts` passed 37/37, with a full post-restart cycle exercised for both
`canopy-mid` and `cave-mid`. See `.look/checkpoint-d/loop-graph.log`.

## Bot segment

Command `timeout 1800s npm run playthrough -- --from canopy-reached --to port --name checkpoint-d-port`. The verdict
was `timeout` at the harness's five-minute wall limit (300.6 seconds, with 833 seconds of game time). It printed
`THE BOT DID NOT FINISH.` and was still aboard the train returning from Canopy after collecting the cloth, with
Bell Rock requested in the end still. The final wait was on line 3 at tick 26320. No graphics errors were reported.
Start and end load was 0.35 and 1.03 busy logical CPUs out of 20. The queue granted an exclusive slot.
See `.look/checkpoint-d/bot.log` and `.look/playthrough/checkpoint-d-port/` for the verdict, report, bot trace and still.

Retry command `timeout 2400s npm run playthrough -- --from canopy-reached --to port --wall 1200 --name checkpoint-d-port-retry`.
Passed after 676.3 seconds of bot wall time and 1,582.8 seconds of game time. The bot laid all three cave sections,
stepped off at Port Quay and returned to the West landing. It ended at `port home` with no recovery or graphics errors.
The inspected end still shows Buddy back on the apron. Load was 0.62 to 2.72 busy logical CPUs, exclusive slot.
See `.look/checkpoint-d/bot-retry.log` and `.look/playthrough/checkpoint-d-port-retry/`.
Copy for the owner to check in the end still is “Request stop: to Port Quay”.

## Stills

Composed all ten checked-in step 4 and 5 captures with `python .look/checkpoint-d/stills.py`. The input list and native
sizes are in `.look/checkpoint-d/stills.log`; the sheet is `.look/checkpoint-d/steps-4-and-5.png`. Inspected the assembled
sheet. The three West landing views show the approach, apron and cave hood. The step 5 views show the rail emerging from
the hood, the sea head, the Saltpan stop, Port Quay's platforms and ramp, the buffer board and the Bell Rock stall.
The step 4 apron image predates the step 5 frame and rack views. The sheet uses the original captures from those steps.

## Port Quay performance

Counts passed with `timeout 1800s npm run perf -- --view port --verdict .look/checkpoint-d/perf-counts-verdict.json`.
WebGPU reported 191 draw calls, a 112-call shadow-pass difference, 461,737 triangles, 1,625 geometries and 221 shader
programs. The `port-reached` seed settled the player at `[140.5, 4.3, 931.1]` with the quay resident. The inspected
still shows the quay and High Port's top from offshore. Load was 2.03 to 1.15 busy logical CPUs, exclusive slot.
See `.look/checkpoint-d/perf-counts.log`, `.look/checkpoint-d/perf-counts-verdict.json` and
`.look/checkpoint-d/perf-counts-still.png`.

Hardware command `timeout 1800s npm run perf -- --view port --hardware --seconds 10 --verdict .look/checkpoint-d/perf-hardware-verdict.json`.
Passed on NVIDIA Ampere WebGPU at 960 × 600, DPR 1, 4× MSAA. The 10.01-second window captured 554 completed frames.
The completed-frame callback interval averaged 18.07 ms (p95 18.77 ms); main-thread CPU averaged 11.47 ms
(p95 13.63 ms); the full GPU span averaged 7.96 ms (p95 8.94 ms), including gaps between passes. The callback interval
is a presentation proxy. Actual display timestamps were unavailable.
Load was 0.52 to 1.23 busy logical CPUs in an exclusive slot. The machine was quiet by the harness's CPU readings.
The hardware capture shows the approach rails and the ramp behind the profiling panel, and returned the same counts.
See `.look/checkpoint-d/perf-hardware.log`, `.look/checkpoint-d/perf-hardware-verdict.json` and
`.look/checkpoint-d/perf-hardware-still.png`.

## Built-site boot

`timeout 1800s node dev/look/boot-time.ts --runs 1 --warm 0 --verbose --json .look/checkpoint-d/boot-timeline.json`
built the site and reached the `interactive` mark from a cold Chromium page. The look harness owned the preview and
used a local room. See `.look/checkpoint-d/boot.log` and `.look/checkpoint-d/boot-timeline.json`.
The load snapshot was 1.47 busy logical CPUs before queue acquisition (`.look/checkpoint-d/boot-load.log`). The boot
timeline serves as startup evidence only, since the load snapshot does not cover its measurement window.
The exact offline Rule 61 command, `node dev/live-boot.ts --offline --url http://localhost:4173/`, requires a separately
started preview under the documented procedure and was skipped under the runner's no-manual-preview instruction.
The timeline run establishes startup to interactive and leaves the offline and page-error assertions unverified.

## Service fuzz and device coverage

The plan requires repeating the long service fuzz after a rule change. Comparing the step 2 merge to the proof base with
`git diff --name-status db84a5fa0..ce6701ba1 -- src/sim server/src test/helpers/railway-route-rules.ts` showed only two
seed-helper changes. The service rules and fuzz were unchanged, so the existing 20,000-tick results in the plan apply.
See `.look/checkpoint-d/service-rule-diff.log`.

The Mac frame-time reading remains pending. Not tested on a device.
