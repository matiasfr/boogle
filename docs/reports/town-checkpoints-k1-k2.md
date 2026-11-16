# Town checkpoints K1 / K2 runner report

16 November 2026. Source tested: `a71077c4b99c04222ce52d19fa75b42dccb1a6aa` (origin/main, world v54,
#1927–#1930). Branch `codex/town-checkpoints-k1-k2`. Only dev scenario and docs changed. No push or ship.
Not tested on a device.

## Results by requested item

1. **Partial pass.** `town-buy` passed twice with two real WebGPU tabs, no graphics errors. Both hold the same
   board with the real Interact action. One purchased Plot, purchase tick identical on both tabs; `spent` 0 → 150,
   balance 168 → 18, next quote 400 → 800. Reload preserves the accepted tick while state remains `building`.
   This proves a single effective purchase/spend, not an instrumented count of accepted/rejected receipts or
   success presentations. The opened reload sheet includes the loading overlay and the partial house; it does not
   establish absence of a brief landing burst. No claim of full visual reload acceptance.
2. **Partial pass / missing coverage.** A real-time 14-second house recording passed capture health (load
   14.99 → 10.31). Opened its 15-frame motion sheet: floor, scaffold, walls and roof assemble once; three little
   guys approach and gather outside. The front blue figure overlaps the player in projection; wall penetration
   cannot be established from this angle. The first prompt reads “Hold 3%”; subsequent board is out of frame.
   The setup starts at the board, so a walked approach and visible next-board price change remain unverified.
   The initial 45-second outer bound killed artifact finalization; a longer-bound rerun passed.

   Opened both island motion sheets (30 s and 90 s) recorded at real speed from `freight-running`. In the 90 s
   sheet a purple waiting figure appears by 42.6 s, a train is beside the platform at 47.4–52.1 s, and riders are
   visibly aboard at 71.1 s. A roof post dominates the foreground and the board's blank back faces the camera;
   its text cannot be read. No trade crates unloading are visible. The 30 s capture missed the arrival and ended
   under load (8.88 → 32.1); the 90 s rerun passed at 6.42 → 7.12. A1's freight-view file and replicated freight
   drawing are absent on this source. No hitch, smoothness or brief pop-in verdict from sparse sheets; videos
   were recorded but cannot be watched in this agent. K1's six implementation stills are not available in this
   fresh checkout and were not inspected.
3. **Pass.** Occupant positioned at `(909.50,18.90,33.00)` before hull installation moved to
   `(905.05,18.95,33.00)` by completion, 4.45 m horizontally. After a one-second real W press:
   `(905.25,18.95,34.37)`, another 1.38 m. Two independent tabs remained in the same room.
   Positions and Plot/hull state are printed in the scenario log. Positioning is a local teleport fixture;
   escape is actual controller input.
4. **Mixed.** Final `check:full` exits 0: 2330 unit cases, 2264 passed, 66 skipped; 406/406 server tests;
   208/208 network assertions. The first run failed `server/test/server.test.ts:113`:
   `report: stored as one JSON line per report, cleaned and truncated`, `404 !== 204`.
   It did not reproduce on the final rerun; do not call it a confirmed regression. An intermediate rerun stopped
   on missing guards in the new scenario; those were fixed before the passing final full run.
   `loop -- run` exits 0 (13.256 s reported; model timing, not human pacing); order and bills were not edited.
   `level-check` exits 0: 17 reports, 18 tracks and seven joins; planned later-track warnings remain.

   Perf accepts stages using `--query from=<stage>`. Both samples use `home-green`, five real seconds, Apple
   Metal, 960×600 internal pixels, MSAA 4. Both exit 1 on two console errors:
   `Failed to load resource: the server responded with a status of 404 (Not Found)` at `dev/look/perf.ts:201`.
   Graphics errors are none. Matching health failure reproduced at lower load on trains-on; affected resource
   URLs were not exposed in the log, so cause remains unverified.

   | Stage | Draw calls | Shadow calls | Average frame interval | p95 interval | CPU frame mean |
   | --- | ---: | ---: | ---: | ---: | ---: |
   | house-built | 365 | 195 | 16.669 ms | 18.275 ms | 7.420 ms |
   | trains-on | 407 | 153 | 16.667 ms | 18.190 ms | 7.212 ms |

   Descriptive samples only: different live train phases, load 28.83 → 25.23 versus 8.92 → 7.01, and failed
   health verdicts prevent a clean performance comparison. No timing regression claim under load.
5. **Pass.** Added the as-built town economy section to `game-design/place.md` and index line to
   `game-design.md`, with source links and explicit A1 gap. Placeholder words are identified; existing copy preserved.
6. **K2 ticked; K1 left open.** K2's listed full-check, competing-buy scenario and loop gates passed.
   This does not approve the wider visual/reload requirements above. K1 lacks A1, the six-still inspection and
   visible unloading. No game code or design changed.

## Commands and retained evidence

All commands use Node 26.13.0. One browser job at a time through the shared queue; no long playthrough.
Evidence is ignored local output, retained in this checkout under `.look/`.

```sh
export PATH=$HOME/.nvm/versions/node/v26.13.0/bin:$PATH
timeout 360 npm run scenario -- town-buy
timeout 360 npm run look -- --rail-seed house-ready --eval dev/look/evals/town-b2.ts --action dev/look/evals/town-b2-buy.ts --query plotshot=build --hud --real --warm 5 --seconds 14 --frames 15 --video --name town-k2-build-r3 --wall 240
timeout 360 npm run look -- --rail-seed freight-running --eval dev/look/evals/town-a3.ts --query a3=island --cam 934.69,26,0.28 --look 929.85,19.4,4.81 --hud --real --warm 1 --seconds 90 --frames 20 --video --name town-k1-island-r2 --wall 240
timeout 900 npm run check:full
timeout 600 npm run loop -- run
timeout 240 npm run level-check
timeout 360 npm run perf -- --hardware --seconds 5 --view home-green --query from=house-built --verdict .look/town-checkpoints/perf-house.json
timeout 360 npm run perf -- --hardware --seconds 5 --view home-green --query from=trains-on --verdict .look/town-checkpoints/perf-trains.json
```

Logs: `.look/town-checkpoints/{scenario-final,build-r3,island-r2,check-full-final,loop,level,perf-house,perf-trains}.log`.
Opened: `.look/town-k2-build-motion.png`, `.look/town-k2-build-r3-motion.png`,
`.look/town-k1-island-motion.png`, `.look/town-k1-island-r2-motion.png`,
`.look/scenarios/town-buy/reload-build-motion.png`.
Recordings: `.look/town-k2-build-r3-realtime.webm`, `.look/town-k1-island-r2-realtime.webm`.
Verdicts retain source SHA, dirty count, load and exact commands. Browser startup succeeded; no broker workaround needed.
