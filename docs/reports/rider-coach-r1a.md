# Rider coach R1a implementation, 16 November 2026

The boiler still casts on Q5 and fitting is accepted at once. One shared `line2Wake` places and times the trains and casts the breaker only once both boiler fit and cart rest hold. Cart return calls that same wake. No new state, op, refusal or player string; no track, show, cut, crane or forge-call change. WORLD_NS v56 follows the loader yard's v55 and is a separate two-line commit. Rebased on main after the loader landed.

The checker now requires trains-on to imply fitted, empty cart at REST with cartAlong zero; fitted while cold requires the cart out. The breaker check keys on trains-on. The train boiler and lashing appear at fit; steam, wake, answer and delayed forge call follow trains-on. Landing clank and local flight remain on fit.

## Route timing

`npm run loop -- run` completes all orders. Exact Q5-to-fit times for 1/2/3/4 players are 77.9/77.9/75.4/77.9 s (the 3-player Q4-before-lever order is also 77.9 s). The haul-and-fit node itself takes 31 s. All exceed 27.7 s; no route wait occurs. A control run loading origin/main's three original rule/check modules produced identical Q5 and trains rows for every player count. Thus trains come on at the same time as the old rule on this route.

## Seed and golden audit

`boiler` and `q5-done` stay at 3099. `trains-on` moves 3119 to 3376 (+257), the cart's REST tick. The seed fit is actually at 3099, followed by its existing 20 tick advance; the ruled plan's description of fitting 20 ticks later was imprecise. Downstream builders use that wake clock and therefore move +277; freight-running's independently waited arrival moves +110.

Changed stage rows (tick deltas):

- trains-on: +257
- freight-running: +110
- fares-running: +277
- house-ready: +277
- house-built: +277
- yard-ready: +277
- yard-built: +277
- yard-wagon: +277
- yard-deck: +277
- q6-stocked: +277
- q6-finishing: +277
- q6-done: +277
- works-arrive: +277
- works-open: +277
- works-stocked: +277
- works-lit: +277
- stall-done: +277
- cradle-fitted: +277
- wagon-on: +277
- crossing-finishing: +277
- crossing-done: +277
- deck-laid: +277
- gap-footed: +277
- leaf-raised: +277
- ring-joined: +277
- steel-kit: +277
- steel-lit: +277
- steel-home: +277
- boiler-long: +277
- gorge-open: +277
- gorge-mid: +277
- gorge-reached: +277

Unchanged stage rows (both hashes and tick): awake, q1-done, q2-stocked, q2-arriving, hook-taken, q3-stocked, q3-done, q4-stocked, q4-arriving, hook-earned, q4-done, q5-arriving, q5-shelved, sea-open, q5-stocked, q5-carry, q5-finishing, q5-done, glide-earned, boiler, boiler-camp. No other stage changed. Tick-order/headway, op streams (call and foot), M12 traces and four halt calling flags follow the new seeded fleet clocks. Halt geometry, catalog and request arguments remain exact. The 8600-record host trace matches a control with the old rules and current namespace: its changes are only namespace envelopes, checksums and byte accounting.

## Review points

- Prediction: boiler ops remain excluded from RAIL_PREDICTED. Only the rope's reversible local flight starts on press; server fit and trains-on remain separate accepted facts.
- Readers: garage availability, rider boarding, fares/till, platform requests and the loop's completion predicate use trains-on. Bots wait for trains-on. Boiler presence, landing, pedestal and rope use boiler state. The ability arrival's `has` uses trains-on and peers' flourish now waits for that state; the fit receipt remains the attribution source. Train wake and forge timer were the incorrect fit-edge readers and now use trains-on.
- Rules: deterministic existing ordering and integer tick clocks remain. Wake runs within existing fit/cart systems with declared read/write access, no new system or shared dependency. Save/load validates the waiting state, and a late mirror joins it fitted but cold.
- Goldens: the changed stage list above is a keyed comparison, including before/after-1200 hashes. No pre-train stage moved. Host namespace-only control passes.

## Validation

Passing before final visual-only puff: `npm run check` (2287 unit tests, level, assets, build); all 27 offered checkpoints before rebase; five required checkpoints repeated on v56.

Passing: focused wait/restore/immediate wake tests; late join mirror test; 130 focused boiler/check/replication tests; all 115 rebased golden tests; 62 repin tests (ops, tick/headway, M12, halts); 407 rebased server tests; host old-rule control; loop current and old-rule control; q5-done/boiler/trains-on/wagon-on/deck-laid checkpoints; two-player T2; world-inputs.

Old wake-rule mutation fails the regression with `rail.boilerFit: railway: trains before cart rests`; the new rule passes. Full failure outputs from iteration are preserved verbatim under `.look/r1a/logs`, including the old-rule regression and initially outdated timing assertions. No test failure was silently treated as a pass.

The first forge capture omitted proto=place and failed `HANDOFF timed out: railway mounted`. Retried with proto=place and the unchanged eval, passing: boiler hoist 1.6 m, call observed at 6067 ms (100 ms observation polling; intended 6050 ms), cut seen and returned camera yaw 0. Opened the motion sheet and final still: the sheet shows the Far Head celebration, forge cut with boiler rising, and the returned view toward Home. Run under load; real-time playback smoothness is unverified.

Evidence: `.look/r1a-handoff-retry-motion.png`, `.look/r1a-handoff-retry-still.png`, `.look/r1a-handoff-retry-realtime.webm`; `.look/r1a/cart-probe.json`; two-player report `.look/playthrough/9e7b83688/report.txt`; `.look/scenarios/world-inputs`.

Forced-wait proof: `dev/look/evals/cart-wake.ts`, room query `t.railway.boilerHelpSpeed=2000`, fast forced fit by teleporting the diagnostic player (this is not a route haul). The clip records from before the take/fit to after wake at 1x. Opened the final sheet, final still, cold-cart still, wake-frame sequence and extracted first-steam frame. The cold-cart still at estimated tick 3356 shows the cart clearly on the curve to the engine's right, boiler lashed on, no steam, trains -1. The cart is **not visible early in the wait**; it becomes visible late as it approaches the old train. It is not continuously in sight.

The wake overlay reads cart REST and trains 3376. The extracted onset frame is stamped tick 3376. The initial puff is very small at this distance; the later cough is much easier to see. Added one initial enlarged regular puff on the wake edge because the existing coughing sequence otherwise starts 0.45 s later; all of that sequence's remaining timings stay intact. Consecutive video frames at 23.4-24.17 s bracket the onset. This establishes the state edge and small first puff; playback smoothness is unverified (Codex cannot watch the clip in real time). The clip file was opened with ffprobe/ffmpeg and its decoded frames inspected, not watched as continuous playback.

Final proof paths:
- `.look/r1a/cold-cart-final.png`: fitted, cold, cart visible on the curve, tick 3356.
- `.look/r1a/readable-first-steam.png`: tiny first puff at wake, cart REST, trains 3376, estimated tick 3376 (video 24.000 s).
- `.look/r1a/readable-steam-detail.png`: enlarged nearest-neighbour detail of the same frame; the first grey puff is visible above the chimney.
- `.look/r1a/readable-candidates.png`: 24 decoded frames at 30 fps around the edge.
- `.look/r1a-readable-wake-motion.png`: full wait, late cart approach, wake and departure; opened.
- `.look/r1a-readable-wake-still.png`: awake train beside its platform, after wake; opened.
- `.look/r1a-readable-wake-realtime.webm`: uninterrupted real-time recording, capture health passed, no graphics/page errors; load 16.12 to 9.36.

Failed visual attempts: default route mount timeout; source-edit reload during the first wait; queued pre-rebase mount timeout. These are not acceptance evidence. Full logs and complete quoted failure blocks are in `.look/r1a/logs/` and `.look/r1a/failures.md`. A heavy-load `ship-check` attempt cancelled modules with `Promise resolution is still pending but the event loop has already resolved`; all 69 tests in a three-file cancellation recheck passed with four workers. A plain gate retry then passed: 155 affected files, 1587 passing assertions, zero failures/cancellations (65 existing skips and one existing todo).

Final v56 loop and all five required checkpoints passed. The rebased two-player T2 repeat passed: both peers finished and mirrored hashes agreed at 233 server steps. Its report is `.look/playthrough/8ff56a02c/report.txt`. The final world-inputs repeat passed (9.9 s, WebGPU, no errors). That repeat and the closing `node dev/ship-check.ts` results are retained in `.look/r1a/logs/r1a-inputs-complete.log` and `.look/r1a/logs/r1a-final-shipcheck.log`; the handback reports their verified outcome. The final gate is intentionally invoked after this report is committed.

Unverified: continuous real-time playback smoothness, device testing and the independent review (the caller owns that review). The cart is visible only late in the forced wait; early visibility is not claimed. No ROM data, new player strings or suspect Boogler copy. No later step implemented. No push or ship. No ship or push. No later rider-coach step or first-town-lesson work.
