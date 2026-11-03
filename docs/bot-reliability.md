# Place bot reliability, 2–3 November 2026

Serves DESIGN.md's **Light tests, real playtests** and **Small and readable**. Only the browser bot changes;
the game, terrain, physics, and progression do not. All runs use `npm run playthrough -- --name <name>`.
Times below are the bot's game seconds, not wall time.

## Recorded causes

The instrumented baseline (`baseline-trace`, 1992.4 s, no NEVER) records the following incidents in
`.look/playthrough/baseline-trace/bot.txt`. `BOT TRACE` includes recent positions, velocities, floor heights,
movement phase, goal and waypoint; `BOT HEMMED` includes temporary blocked cells. Coordinates here are x/z.

| Time | Position | Evidence and cause |
| --- | --- | --- |
| 412.7 | 958.84 / -49.12 | Recovery on a steep ravine wall. Earlier, the stalled bot blocked all nine cells around 953.56 / -39.68, then tried an unchecked straight escape toward the distant goal. |
| 481.2 | 913.10 / -115.94 | Water entry after a partial path ended at 908 / -112, height 14.32. The final approach continued toward 952.46 / -148.70 without a route and walked off the bank. |
| 691.1 | 961.22 / -151.88 | "Hole" recovery on a flat floor at height 30. The previous walk's blocked 3×3 neighborhood fenced in the next walk's start. |
| 846.9 | 957.00 / -38.33 | Another self-blocked start, on intact ground at height 18.24, reported as a hole. |
| 1031.0 | 987.80 / 26.48 | Recovery on a steep bank following another unchecked escape from a self-blocked start at 1017.70 / 30.73. |
| 1843.4 | 1179.38 / -124.52 | Partial path ended at 1177 / -124, height 1.20; final approach continued toward 1364.32 / -173.53 and entered water. |
| 1844.3 | 1182.71 / -125.40 | A second swimming entry during that same excursion (bobbing above/below the swimming threshold), then recovery. |

Removing unchecked escapes and narrowing blocked cells was insufficient:

- `safe-route-1`: 1982.7 s, one water entry and two stuck recoveries. At 1825.85 s the walking bot's
  velocity was (25.89, -0.30, 54.50) m/s; it entered water at 1215.43 / -11.31 at 1827.55 s.
  Neither attempted ride actually boarded (`aboard?` followed a timed-out straight walk). The bot later walked
  along the active railway and acquired the moving train's velocity. Boarding now jumps onto the car and checks
  `carry.on === car.platform`; the real `ride` marks appeared after this fix.
- `safe-route-2`: 1817.3 s, no water entries, two stuck recoveries. Rejecting edge cells alone still failed.
  At 636.43 s the feet were at (955.42, 18.74, -47.12), pursuing a waypoint at (957, 21.07, -46).
  The shortcut checker had found a clear route **under** the bridge, without checking that it ended at the
  waypoint's height. Horizontal waypoint advancement then sent the bot into the ravine wall at
  958.85 / -48.83. Both recoveries had this same endpoint.

The final walker checks shortcut arrival height, does not shortcut across required jumps, and checks height
before advancing intermediate waypoints. It checks edges for adjacent underwater ground, rejects unsafe edge
cells, refreshes steering every 100 ms, and only makes a checked final approach after an arriving plan.
Temporary obstacles block the attempted waypoint instead of a square around the player; exhausted temporary
blocks can be cleared before recovery. Stale search entries are skipped.

## Terrain and visual inspection

Downward collider rays at the two steep-bank recoveries found ground with normal.y 0.429 and 0.432, below the
player's walkable threshold of 0.55. The flat-ground recoveries had normals 1.0 and 0.987. No missing terrain
collider was found. `.look/fall-sites-still.png` shows the continuous ravine edge.

The targeted `.look/bridge-route-motion.png` and curves show the bot approaching via the ramp and moving onto
the bridge: height rises from 19.4 to 27.5 m, speed peaks at 5.7 m/s, only 1% of sampled frames airborne.
Capture checks passed: WebGPU, advancing completed frames, no page/console/graphics errors. This is a motion
sheet and numerical inspection; real-time smoothness was not verified.

## Consecutive validation

The first three fall-free runs were `safe-route-3` (1845.0 s), `reliable-2` (1840.1 s), and `reliable-3`
(1807.0 s), all with zero stuck recoveries and no NEVER. A failed Vite startup before `reliable-3` opened no game;
the same command was retried. These runs did **not** meet the timing requirement.

The Q4 traces isolated the main timing difference. In `safe-route-3`, rack presses occurred at session times
1157.4, 1181.5 and 1186.6 s, including a 20 s rack wait. In `reliable-3`, the single rack press at 1148.1 s
supplied the remaining logs. The bot waited only for `rack.logs > 0`, so it could take the first log of a
streaming cart delivery and leave, forcing extra carries and a further cart cycle. It now waits for the intended
load (remaining bill limited by pack room), and for incoming logs to actually reach the pack before leaving.

The final code completed these three consecutive runs:

| Run | End (game seconds) | Water entries | Stuck recoveries | NEVER |
| --- | ---: | ---: | ---: | ---: |
| `final-1` | 1807.4 | 0 | 0 | 0 |
| `final-2` | 1805.7 | 0 | 0 | 0 |
| `final-3` | 1806.3 | 0 | 0 | 0 |

The end-time spread is **1.7 s**. All three session logs contain the same **56 distinct beat names**, with a
maximum first-beat spread of **3.0 s**. Both the bot's detailed log and the game's telemetry report zero water
entries. All runs finished with every expected bot check satisfied and zero recorded errors. Reports, bot logs,
session telemetry, save states and end stills are in `.look/playthrough/<run>/`.

`npx prettier --write` ran on the changed files (the repository ignores Markdown). `npm run check` passed:
lint, typecheck, 292/292 unit tests, registry, five level checks, assets and the production build. The first check's
build was blocked by sandbox access to Vite's temporary config beside the shared dependency symlink; the check
passed with that cache access. No dependency installation was performed. No game files changed.

The original historical NEVER near (947, -172) was not reproduced in the instrumented baseline; the clean
repeats check its absence without claiming a trace of that earlier failure.
