# Where the White Wall waits come from

## Bounded experiment on 25 November

The retained rule lets a single-kit train wait with Kit 6 after builders deposit the first logs or rails
at the fifth Wall frame. Both co-op sizes save 184.2 simulated seconds per player, with zero solo change.
The seeds still open the deep span. An earlier hold delayed a Saltpan rider beyond the service budget.

| Retained hold, before → after | 1 player | 2 players | 3 players |
| --- | ---: | ---: | ---: |
| Wall 6 idle seconds per player | 307.70 → 307.70 | 268.30 → 84.10 | 251.57 → 67.37 |
| Wall 6 elapsed seconds | 324.8 → 324.8 | 335.6 → 151.4 | 335.6 → 151.4 |
| Area 8 minutes | 22.2 → 22.2 | 20.6 → 17.6 | 20.6 → 17.6 |

The rerun on `bc82d7164` matched baseline idle and elapsed ticks at every other canonical node,
with both straight-line and calibrated walking. A second comparison ran all eight graph orders for
each seat count. All 24 routes completed on both rules and each gave the same Wall 6 delta shown above.
Every other node matched in every order. In the 75% headway service test the settled fourth
head served 27 calls. The longest Saltpan wait was 139.4 s outbound against the 220.0 s limit
(80.6 s of margin). The load and release checks still use the existing train and leg rows.
The retained rule runs on world v72.

The focused `UNIT_ONLY` kit and route run passed 84 tests across ten files.
`npm run test:net` passed all 338 browser and server checks, including a Wall carrier
rejoining and every tab mirroring the stock on the carrier and the trains.
`npm run level-check` completed all 26 reports. On the merged code at `fe69aa2be`,
`node dev/ship-check.ts origin/main HEAD` exited 0 with 1,833 passes, one skip and zero failures.

The baseline was `bf315bacf`. For each of the baseline, the hold alone and the hold plus the experimental press,
run `npm run loop -- run --players N --order canonical --no-probes --json` for N = 1, 2, 3.
Compare node duration (end tick less start tick) and mean idle (idle player-ticks divided by ten and by player count).
The canonical straight-line and calibrated runs agreed on every delta below.

| Rejected hold before the first deposit, before → after | 1 player | 2 players | 3 players |
| --- | ---: | ---: | ---: |
| Wall 6 idle seconds per player | 307.70 → 33.70 | 268.30 → 84.10 | 251.57 → 67.37 |
| Wall 6 elapsed seconds | 324.8 → 50.8 | 335.6 → 151.4 | 335.6 → 151.4 |
| Area 8 minutes | 22.2 → 17.6 | 20.6 → 17.6 | 20.6 → 17.6 |

The whole leg is already eligible for dispatch (`src/sim/railway-route.ts:527`,
`src/sim/railway-queries-route.ts:190`). Trains load at home (`src/sim/railway-sys-route-kit.ts:182`)
and unload the current rack's lack on arrival (line 72). The trial in `legRailheadHold` (line 257) let a single-kit train
with surplus for Wall 6 wait at the current head while Wall 5 is being funded or laid. The existing
timeout and rider/follower release apply. The train step honors the hold (`src/sim/railway-sys-trains.ts:242`)
and the fifth lay sends a held train onward (`src/sim/railway-sys-route.ts:83`). The deep-span press still
requires the crystal seeds and Wall 5 laid (lines 167–168). An entry trace before the first Wall 6
policy action found all 20 logs and 20 rails on the rack at each player count. Every other measured node matched baseline.

The Wall service-health test found a Saltpan request that waited 224.1 s on the settled fourth head, exceeding its
220.0 s budget. Releasing the train whenever a platform was calling still produced that failure. Restricting the
hold to a fifth frame that had received some stock passed the service test. Its Wall 6 idle was 307.70 / 84.10 /
67.37 s per player and area 8 took 22.2 / 17.6 / 17.6 minutes. The follow-up retained this variant for the
co-op saving. Counting stock already on a builder's back also saved zero solo.

| Bell Rock press experiment, before → after | 1 player | 2 players | 3 players |
| --- | ---: | ---: | ---: |
| Plug idle seconds per player | 0 → 0 | 172.30 → 104.80 | 229.73 → 139.73 |
| Plug elapsed seconds | 344.6 → 209.6 | 344.6 → 209.6 | 344.6 → 209.6 |
| Cave 1 idle seconds per player | 33.70 → 33.70 | 184.60 → 76.55 | 133.90 → 61.87 |
| Cave 1 elapsed seconds | 45.2 → 261.3 | 348.2 → 348.2 | 348.2 → 348.2 |

The opener travels from Canopy to the press on West Landing's cave apron. The graph reads the press from
the catalog (`dev/loop/graph.ts:614`). Only the first seat walks and presses (`dev/loop/run.ts:387`),
using straight-line distance (`dev/loop/run.ts:889`). The trial moved the press from
`rowSide('cave', 1200, -980, 90, 400)` to `rowSide('bay', 122900, -480, 90, 400)` at Bell Rock,
and pinned Cave 1's frame to its original position (`src/sim/railway-route.ts:361` and line 490).
The opener still had to reach the rack. Solo Cave 1 exceeded the 10-second regression limit by adding
216.1 seconds. The shorter press walk recovered 135.0 seconds, giving a net solo cost of 81.1 seconds.
The press stays at West Landing. A different co-op experiment for the designer is to give a second player
a job during the approach. All other measured node durations and idle counts matched the hold-only run.
Human walking routes, train rides and co-op assignments remain unmeasured. These experiments were not tested on a device.

Measured on `94df3faa44a5c7214146c15b08cae5474c07a7a1e`, the fetched `origin/main`
(tree at the start of this job), with Node 26.13.0. This is a proposal for the
designer and owner, for [the route-to-the-ending checkpoint](../backlog.md#the-checkpoint-we-work-toward).
The earlier comparison is [leg 5, Checkpoint E](../plans/greybox-leg5.md).

## Idle split

Each cell is **total = A motion or lay + B unassigned + C other**, in simulated seconds per player.
The denominator is all seats. A means the delivering train was moving (including a return leg needed for
delivery) or the section was laying. B means the loop gave a seat no more work on that node, before any
lay started. C includes stationary train time, cart supply and polling/retries. B measures unused seats in
the loop policy. Human players may take actions the policy omits. Rows cover the four requested beats and
every canonical node above 60 s at any seat count with straight-line or calibrated walks. Entries below
60 s are shown for comparison. Rounding can change the sum by 0.01 s.

| Node | 1 player | 2 players | 3 players |
| --- | ---: | ---: | ---: |
| Q4 | 52.20 = 0.00 + 0.00 + 52.20 | 78.70 = 0.00 + 0.00 + 78.70 | 110.27 = 0.00 + 79.73 + 30.53 |
| Q5 | 106.30 = 0.00 + 0.00 + 106.30 | 98.45 = 0.00 + 0.00 + 98.45 | 101.57 = 0.00 + 27.80 + 73.77 |
| breaker | 0.00 = 0.00 + 0.00 + 0.00 | 53.30 = 0.00 + 53.30 + 0.00 | 71.07 = 0.00 + 71.07 + 0.00 |
| Q7 | 72.60 = 60.70 + 0.00 + 11.90 | 88.60 = 78.70 + 0.00 + 9.90 | 97.83 = 75.30 + 15.30 + 7.23 |
| bents | 244.40 = 210.80 + 0.00 + 33.60 | 286.40 = 251.40 + 0.00 + 35.00 | 279.27 = 213.40 + 35.13 + 30.73 |
| steelkit | 32.90 = 32.90 + 0.00 + 0.00 | 73.00 = 28.10 + 44.90 + 0.00 | 81.60 = 19.73 + 61.87 + 0.00 |
| stack-1 | 33.70 = 29.70 + 0.00 + 4.00 | 110.50 = 29.85 + 78.65 + 2.00 | 140.63 = 29.90 + 109.40 + 1.33 |
| stack-2 | 64.70 = 60.50 + 0.00 + 4.20 | 74.70 = 72.20 + 0.00 + 2.50 | 77.50 = 72.40 + 3.93 + 1.17 |
| gorge | 0.00 = 0.00 + 0.00 + 0.00 | 46.10 = 0.00 + 46.10 + 0.00 | 61.47 = 0.00 + 61.47 + 0.00 |
| incline-1 | 33.70 = 29.70 + 0.00 + 4.00 | 71.05 = 29.85 + 39.20 + 2.00 | 58.33 = 29.80 + 27.20 + 1.33 |
| seeds | 0.00 = 0.00 + 0.00 + 0.00 | 50.40 = 0.00 + 50.40 + 0.00 | 67.20 = 0.00 + 67.20 + 0.00 |
| bay-1 | 33.70 = 29.70 + 0.00 + 4.00 | 64.00 = 29.85 + 32.15 + 2.00 | 53.50 = 29.80 + 22.37 + 1.33 |
| canopy-gate | 0.00 = 0.00 + 0.00 + 0.00 | 54.60 = 0.00 + 54.60 + 0.00 | 72.80 = 0.00 + 72.80 + 0.00 |
| canopy-1 | 33.70 = 29.70 + 0.00 + 4.00 | 77.70 = 29.85 + 45.85 + 2.00 | 63.23 = 29.80 + 32.10 + 1.33 |
| plug-gate | 0.00 = 0.00 + 0.00 + 0.00 | 172.30 = 0.00 + 172.30 + 0.00 | 229.73 = 0.00 + 229.73 + 0.00 |
| cave-1 | 33.70 = 29.70 + 0.00 + 4.00 | 184.60 = 29.85 + 152.75 + 2.00 | 133.90 = 29.80 + 102.77 + 1.33 |
| wall-3 | 94.70 = 85.10 + 0.00 + 9.60 | 32.70 = 29.80 + 0.00 + 2.90 | 35.50 = 30.00 + 3.93 + 1.57 |
| wall-4 | 75.70 = 65.80 + 0.00 + 9.90 | 83.70 = 75.90 + 0.00 + 7.80 | 86.50 = 76.10 + 3.93 + 6.47 |
| deep-gate | 0.00 = 0.00 + 0.00 + 0.00 | 60.50 = 0.00 + 60.50 + 0.00 | 80.67 = 0.00 + 80.67 + 0.00 |
| wall-6 | 307.70 = 287.50 + 0.00 + 20.20 | 268.30 = 257.90 + 0.00 + 10.40 | 251.57 = 241.10 + 4.00 + 6.47 |

The calibrated split changes only the rows below. All other entries match.

| Node | 1 player | 2 players | 3 players |
| --- | ---: | ---: | ---: |
| Q4 | 13.20 = 0 + 0 + 13.20 | 94.45 = 0 + 77.85 + 16.60 | 38.77 = 0 + 34.37 + 4.40 |
| Q5 | 26.00 = 0 + 0 + 26.00 | 62.80 = 0 + 49.80 + 13.00 | 64.00 = 0 + 54.00 + 10.00 |
| Q7 | 72.60 = 60.70 + 0 + 11.90 | 88.60 = 78.70 + 0 + 9.90 | 97.10 = 74.57 + 15.57 + 6.97 |

### What the rules and policy were doing

- **Wall 3 and 4.** Cave train slots (zero-based) **13 / 12 / 12** dropped Kit 3 at halt 5 and
  **12 / 13 / 13** dropped Kit 4 at halt 6. Each dropped 20 logs and 20 rails. The kits load at West
  Landing. The delivery clocks include time rolling through the previous head, a five-second
  `TRAIN.dwellTicks = 50` stand when still stopping there, and final stock polling. Both sections require
  the preceding lay, with no separate barrier. The successful bill starts `LEG_TUNE.layTicks = 300`
  (30 s); unload presses overlap its first ticks.
- **Deep gate and Wall 6.** `rail.gate` for `deep-span` requires Wall 5 laid and crystal seeds. The
  gate blocks stock acceptance at frame 6. Seat 1 walks for 121.0 simulated seconds to the press in
  all three runs. Co-op seats have no assignment for that whole walk. After the press, slots
  **13 / 12 / 12** delivered Kit 6 at halt 8, **275.8 / 296.7 / 296.7 s** into Wall 6.
  The delivering row was already on its homeward leg from halt 7 when rack polling began.
  It stood at West Landing and ran out again. Mean idle during its motion was **257.8 / 228.1 /
  211.2 s**. Mean idle during the lay was **29.7 / 29.8 / 29.9 s**.
  Of the remaining idle, **5.3 / 3.0 / 2.2 s** overlapped base dwell and **10.9 / 5.4 / 3.6 s**
  were West Landing headway holds beyond base dwell. A branch trace identified `trainStepLine`'s
  same-end spacing check, with `railTrainHeadPct = 75` percent of an even split of the round trip.
  The optional `TRAIN.kitWaitTicks = 60` rail-loading extension did not cause that extra stand.
  The rest was the policy's 20-tick carry retries. `legRackNeed` has no barrier check, so the gate
  is no reason to defer unloading a kit that reaches the open rack.
- **Q4 and Q5.** C is the depot cart and carry retries. The cart runs out from Camp via the forge
  turntable at `CART.speed = 90` cm/tick, with `loadTicks = 30`, `leaveTicks = 30`, and
  `dropTicks = 22` after unloading. The forge can hold its departure for rails. The quarry lever
  and sea switch gate funding/laying respectively. B is a seat released once others reserve or
  deliver the remainder of its bill. Calibrated walking changes how the cart trip overlaps the walks.
- **Q7 and bents.** Line 2 slot **1** brought Q7's kit from Village to the Pier (halt 3), after the
  crossing.
  The 50-tick dwell and up-to-60-tick rail-loading extension in `railway-sys-trains.ts`, and
  carry retry govern the stationary/polling category. The audit did not isolate rail-loading holds. The same slot, now carrying the footing wagon,
  brought three batches of six from the quarry to the Railhead (halt 4 opened by Q7). The
  kiln casts one every `WORKS.castTicks = 80`; the 20-tick footing polls mostly observed the
  wagon on the move, with C observed during stands. The third delivery was **325.8 / 333.1 / 333.1 s**
  into bents. B at both nodes came from seats released while other seats still had stock to feed.
- **Steel kit and Stack 2.** Line 2 slot **1** brought the steel works' 8 logs and 12 rails to
  Ring Island (halt 5), opened by the rivet. Only seat 1 walks to watch for it. Stack 2's kit
  landed at halt 6 from slots **2 / 4 / 4** after Stack 1 laid. Its motion, 50-tick halt
  dwell, carry retries, and 300-tick lay explain the waits. Stack 2's three-player B is the
  short time between seats finishing their shares and the lay starting.
- **First frames.** Stack 1, Incline 1, Bay 1, Canopy 1 and Cave 1 have early-finished seats
  and a 300-tick lay. C is the 20-tick carry retry. The frame gates for Incline, Canopy and
  Cave are already open at entry. Long B can include the whole approach for a seat that starts
  carrying immediately while its partner is still en route, especially Cave 1 after the plug.
- **Single actor.** Breaker waits for the cast after boiler fit and cart rest, then only seat 1
  takes it. Gorge is seat 1's approach after Stack 4 lays. Seeds are seat 1's grant pickup.
  Canopy gate and the sea-cave plug use seat 1's walk and press, gated by the seeds and powered
  pick respectively. The plug also requires Canopy 3 laid. Their measured idle is entirely B.

## Proposals ranked by measured opportunity and implementation risk

The B times in the table bound the opportunity to fill unused seat time in this policy. They
are averages across seats, and overlap active work by somebody else. No option below has a
measured route-time saving. A view can fill time without shortening the route.

| Where | First option | Second option |
| --- | --- | --- |
| **Plug gate, Cave 1** (largest B) | **Level change.** Shorten the Canopy-to-plug approach with a direct usable link or move the press to the cave approach. Look for a cut to the 344.6 s modelled solo-actor leg, then check that travel still reads geographically. | **View.** Point friends to the first kit rack while the opener goes to the plug. Low risk, fills the approach while keeping the seed/pick path and gate order. |
| **Stack 1, Incline 1, Bay 1, Canopy 1** | **View.** Point unassigned seats to the next rack or frame and show which material still needs a carrier on the current one. Fill overlap while a partner approaches or feeds. | **Level change.** Bring approach paths to the rack and frame closer together at the first joins. Potential route cut for the working seat, with geometry and reach risk. |
| **Deep gate, Canopy gate** | **View.** Show the next working position and an arriving-kit cue while a friend makes the press. A low-cost way to give both groups a destination. | **Rule change and world bump.** Allow the seeds holder to prepare the barrier from the prior head, with release still tied to the preceding lay. Can overlap the long approach but changes when players can act and requires a sequencing review. |
| **Breaker, Gorge, seeds** | **View.** Give friends a destination for the next task, such as the Works seam, Gorge halt or Canopy frame, during the one-person pickup or approach. | **Level change.** Bring each pickup or arrival closer to its existing approach. Shortens the active seat's trip if it still reads in-world. Check reach and traversal, especially the seeds deck. |
| **Steel kit** | **View.** Point waiting friends to the feed side of the works while the lead watches the yard. | **Rule change and world bump.** Let earlier-arriving friends stage part of the bill using valid existing stock. Can fill the delivery window and change throughput, with kit conservation and yard-capacity risk. |
| **Q4, Q5, Q7, bents** | **View.** Show outstanding stock and the next useful rack or frame so finished seats can reposition. | **Rule change and world bump.** Permit smaller handoffs or earlier staging of a later bill. Potentially increases parallel work, with greater stock/gate risk. |
| **Stack 2 and Wall 3/4/6** (only about 4 s B in 3p) | **View.** Fold any next-rack direction into the first-frame work above. | **Level change.** Move idle seats' next approach into view from the frame, if a layout pass is already touching it. Low priority at this measured size. |

**Recommendation.** Investigate a dedicated Kit 6 delivery overlap first for White Wall. Compare
an earlier loaded dispatch or a railhead hold against the measured return-and-redelivery cycle while
preserving the seeds gate. A targeted delivery rule and world bump would need a freight/traffic review.
A shorter global `LEG_TUNE.layTicks` constant would target about 30 s here and touch every section.
Treat deep-gate independently as a co-op assignment problem. Across the whole route, prototype the
plug approach first among the B options. It has the largest observed unused-seat window.

## Route budget and reproduction

Straight-line minutes by area from the loop's whole-route table. The model uses the measured built
rates for area 9, which is still a stand-in. The post and a six-hour human route remain unverified.

| Area | 1p | 2p | 3p | Allowance |
| --- | ---: | ---: | ---: | ---: |
| 1 | 18.0 | 14.6 | 13.9 | 36 |
| 2 | 8.8 | 8.6 | 8.8 | 36 |
| 3 | 12.0 | 12.3 | 12.5 | 36 |
| 4 | 12.6 | 12.0 | 12.0 | 72 |
| 5 | 12.1 | 14.1 | 14.1 | 30 |
| 6 | 8.1 | 9.2 | 9.2 | 42 |
| 7 | 10.2 | 15.0 | 15.0 | 48 |
| 8 | 22.2 | 20.6 | 20.6 | 48 |
| 9 (model) | 7.7 | 7.4 | 7.4 | 18 |
| Total | 111.8 | 114.0 | 113.5 | 366 |

The checkpoint target is 360 minutes. The listed area allowances sum to 366.

- Git Bash, Node 26.13.0. `timeout 15s npm run loop -- node <id>` for the nodes above.
  `timeout 120s npm run loop -- run --players N` and `timeout 60s npm run loop -- run --players N --order canonical --no-probes --json`
  for N=1, 2 and 3. The split covers canonical order, straight-line and calibrated.
- `timeout 90s node --import ./.look/wall-final-audit.mjs dev/loop/cli.ts run --players N --order canonical --no-probes --json`
  used an ignored loader to count each original idle tick by policy, lay state and delivering train phase.
  Rack increases and cargo decreases identify the slot. Every split reconciled with the original idle counter.
  The Wall 6 hold follow-up used `--import ./.look/wall-holds.mjs --import ./.look/wall-hold-audit.mjs` and `--no-calibrated`.
  Canonical and calibrated node results matched the uninstrumented run. All eight orders finished at each seat count.
- CPU snapshots ranged from 48% to 97%. The numbers use 100 ms host ticks. Runtime speed on this machine
  is unverified. Human navigation, travel overlap and proposed savings are unverified. not tested on a device.
