# Greybox leg 4 Checkpoint D

25 November 2026, HOTBOX, Node 26.13.0. The run started from main at `ce6701ba1`, which contains leg 4 step 6 (#2430).
Checkpoint D remains open. The canonical loop reached Port Quay with one, two, and three players. The alternate
`T3 before beam` order hit the previously recorded softlock at `jump`.

## Loop

Command `npm run loop -- run`. The default also printed four-player results. The table records the requested one to
three players. See `.look/checkpoint-d/loop.log` for the original and `.look/checkpoint-d/loop-retry.log` for the repeat.

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

Command `npm run test:net`, under `timeout 2400s`. The first suite finished 315/316. The sole failure was
`HOST_ONLY counts leg rejoin's checks (ran 46, listed 23): update it`. Both seed proofs passed in that run.
See `.look/checkpoint-d/net.log` and `.look/checkpoint-d/net-retry.log`.

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

## Stills

Composed all ten checked-in step 4 and 5 captures with `python .look/checkpoint-d/stills.py`. The input list and native
sizes are in `.look/checkpoint-d/stills.log`; the sheet is `.look/checkpoint-d/steps-4-and-5.png`. Inspected the assembled
sheet. The three West landing views show the approach, apron and cave hood. The step 5 views show the rail emerging from
the hood, the sea head, the Saltpan stop, Port Quay's platforms and ramp, the buffer board and the Bell Rock stall.
The step 4 apron image predates the step 5 frame and rack views. The sheet uses the original captures from those steps.

## Service fuzz and device coverage

The plan requires repeating the long service fuzz after a rule change. Comparing the step 2 merge to the proof base with
`git diff --name-status db84a5fa0..ce6701ba1 -- src/sim server/src test/helpers/railway-route-rules.ts` showed only two
seed-helper changes. The service rules and fuzz were unchanged, so the existing 20,000-tick results in the plan apply.
See `.look/checkpoint-d/service-rule-diff.log`.

The Mac frame-time reading remains pending. Not tested on a device.
