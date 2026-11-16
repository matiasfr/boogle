# Rider coach R1a implementation, 16 November 2026

The boiler still casts on Q5 and fitting is accepted at once. One shared `line2Wake` places and times the trains and casts the breaker only once both boiler fit and cart rest hold. Cart return calls that same wake. No new state, op, refusal or player string; no track, show, cut, crane or forge-call change. WORLD_NS v55 is a separate commit, subject to final rebase.

The checker now requires trains-on to imply fitted, empty cart at REST with cartAlong zero; fitted while cold requires the cart out. The breaker check keys on trains-on. The train boiler and lashing appear at fit; steam, wake, answer and delayed forge call follow trains-on. Landing clank and local flight remain on fit.

## Route timing

`npm run loop -- run` completes all orders. Rounded printed Q5-to-trains times for 1/2/3/4 players are 78/78/75/78 s. The haul-and-fit node itself takes 31 s. All exceed 27.7 s; no route wait occurs. A control run loading origin/main's three original rule/check modules produced identical Q5 and trains rows for every player count. Thus trains come on at the same time as the old rule on this route.

## Seed and golden audit

`boiler` and `q5-done` stay at 3099. `trains-on` moves 3119 to 3376 (+257), the cart's REST tick. The seed fit is actually at 3099, followed by its existing 20 tick advance; the ruled plan's description of fitting 20 ticks later was imprecise. Downstream builders use that wake clock and therefore move +277; freight-running's independently waited arrival moves +110.

Changed stage rows (tick deltas):

- trains-on: +257
- freight-running: +110
- fares-running: +277
- house-ready: +277
- house-built: +277
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
- Readers: garage availability, rider boarding, fares/till, platform requests and the loop's completion predicate use trains-on. Bots wait for trains-on. Boiler presence, landing, pedestal and rope use boiler state. The ability arrival's `has` uses trains-on; its fit receipt remains the attribution source. Train wake and forge timer were the two incorrect fit-edge readers and now use trains-on.
- Rules: deterministic existing ordering and integer tick clocks remain. Wake runs within existing fit/cart systems with declared read/write access, no new system or shared dependency. Save/load validates the waiting state, and a late mirror joins it fitted but cold.
- Goldens: the changed stage list above is a keyed comparison, including before/after-1200 hashes. No pre-train stage moved. Host namespace-only control passes.

## Validation

Passing: focused wait/restore/immediate wake tests; late join mirror test; 130 focused boiler/check/replication tests; all 107 golden tests; 62 repin tests (ops, tick/headway, M12, halts); 406 server tests; host old-rule control; loop current and old-rule control; q5-done/boiler/trains-on/wagon-on/deck-laid checkpoints; two-player T2; world-inputs.

Old wake-rule mutation fails the regression with `rail.boilerFit: railway: trains before cart rests`; the new rule passes. Full failure outputs from iteration are preserved verbatim under `.look/r1a/logs`, including the old-rule regression and initially outdated timing assertions. No test failure was silently treated as a pass.

The first forge capture omitted proto=place and failed `HANDOFF timed out: railway mounted`. Retried with proto=place and the unchanged eval, passing: boiler hoist 1.6 m, call observed at 6067 ms (100 ms observation polling; intended 6050 ms), cut seen and returned camera yaw 0. Opened the motion sheet and final still: the sheet shows the Far Head celebration, forge cut with boiler rising, and the returned view toward Home. Run under load; real-time playback smoothness is unverified.

Evidence: `.look/r1a-handoff-retry-motion.png`, `.look/r1a-handoff-retry-still.png`, `.look/r1a-handoff-retry-realtime.webm`; `.look/r1a/cart-probe.json`; two-player report `.look/playthrough/9e7b83688/report.txt`; `.look/scenarios/world-inputs`.

Pending: forced-wait visual capture/inspection, exact first steam frame and cart visibility; final full check, all checkpoints, rebase and ship-check results. No ship or push. No later rider-coach step or first-town-lesson work.
