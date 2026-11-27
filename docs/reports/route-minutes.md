# Route minutes after pre-feed

Measured on `a89d3abef` with `npm run loop -- run --players N --json` for 1, 2 and 3 players, with a 120-second timeout and a 300-second timeout on the two-player retry. The table uses canonical straight-line runs from wake through the accepted post press. The loop is a model of the host rules. Players walk without terrain or passenger rides, so these times are a lower bound for live play. One tick is 100 ms.

Each cell gives minutes and the change from the [whole-route table in Wall waits](wall-waits.md#route-budget-and-reproduction). Area 9 previously used a stand-in and now plays the full ending. The area allowances sum to 366 minutes against a 360-minute [campaign target](../plans/campaign-outline.md).

| Area | Allowance | 1 player | 2 players | 3 players |
| --- | ---: | ---: | ---: | ---: |
| 1 Home | 36 | 18.0 (0.0) | 14.6 (0.0) | 13.9 (0.0) |
| 2 Split-rock Works | 36 | 8.8 (0.0) | 8.6 (0.0) | 8.8 (0.0) |
| 3 Ring Island, builds 1 and 2 | 36 | 12.0 (0.0) | 12.3 (0.0) | 12.5 (0.0) |
| 4 High Gorge | 72 | 12.6 (0.0) | 12.0 (0.0) | 12.0 (0.0) |
| 5 Bell Rock and the bay shortcut | 30 | 12.1 (0.0) | 13.8 (-0.3) | 13.8 (-0.3) |
| 6 Canopy Town | 42 | 8.1 (0.0) | 7.3 (-1.9) | 7.2 (-2.0) |
| 7 Sea cave, Saltpan, Port Quay | 48 | 10.2 (0.0) | 9.7 (-5.3) | 9.7 (-5.3) |
| 8 The White Wall line | 48 | 22.2 (0.0) | 15.7 (-4.9) | 15.7 (-4.9) |
| 9 Lantern Notch, the causeway, the Original Island | 18 | 16.4 (+8.7) | 15.9 (+8.5) | 16.0 (+8.6) |
| **Total** | **366** | **120.5 (+8.7)** | **109.9 (-4.1)** | **109.5 (-4.0)** |
| Minutes below the 360-minute target | | 239.5 | 250.1 | 250.5 |

The post was reached at **72,300 / 65,960 / 65,704 ticks**. Against the [pre-feed plan's played baseline](../plans/prefeed-gated-frames.md), solo matches and each co-op run saves 18.1 minutes. The older Wall waits totals include an estimated ending and precede the retained Wall 6 hold.

All nine graph orders per party size reached the post, including cave-first. The canonical routes skipped no beats and used no recovery. In jump-first, the forge policy takes the pack early, so its later node needs no press. The three-player canonical route had seven refusals at `bents` before completing it. Other three-player orders had five to seven there, and the two-player table-before-Q6 order had four there. The other routes had zero refusals outside the intentional early-action probes, which were all rejected on copied state. The initial two-player all-orders command timed out and passed on retry.

The same three areas are slowest for all party sizes:

- **White Wall (15.7–22.2 minutes).** Six sections mean repeated rack-to-frame hauls and 30 seconds of scheduled laying per section. Solo Wall 6 takes 5.4 minutes, with 5.1 counted idle as the kit arrives and the frame lays. Co-op spends more time on the long hauls at Wall 5 and Wall 2 than on any other Wall node.
- **Lantern Notch to the Original Island (15.9–16.4 minutes).** The two barrier approaches take 9.1 minutes together. The post node takes a further 3.1–3.5 minutes, including the walk and the wait for the first train to stop.
- **Home (13.9–18.0 minutes).** The opening bills, forge and Q stations account for most of the time. Q4–Q6 take about six minutes together with three players. Depot and train supply, hauling and laying all contribute.

**Hands, lays, rides and waits.** Mean minutes per player for 1 / 2 / 3 players are 87.1 / 68.1 / 62.9 outside the idle counter (walking, carrying and presses together) and 33.4 / 41.9 / 46.6 idle. The loop models zero passenger ride minutes. It runs the lay timers, but counts stationary time during lays, supply waits and time with no remaining assignment together. The output supports no separate hand-work, lay-idle or other-wait totals.

**Checkpoint 2.** The loop proof is complete. Continuous wake-to-post bot runs remain unverified for 1, 2 and 3 players. The [earlier solo bot proof](../plans/greybox-route.md#browser-route) used seeded handoffs between segments.

**Checkpoint 3.** Met. The table covers all nine areas and the six-hour target for all three player counts.
