# R4: modelled riders' coach evidence and checkpoint

16 November 2026 (captures continued past midnight UTC). Runner on `t3/rider-coach-evidence-r4`, based on main `4c1423f995ffe31392b29715d5ab01dcdaa1d779`, #1995, world v57. Node 26.13.0; own npm installation. No game, design, test assertion, golden or asset edits. No push or ship.

[Evidence index](rider-coach-r4/index.html). Sixteen JPEGs, each at most 1200 px wide, total below 3 MB. The occupancy views use the existing R3 cosmetic visibility harness with frozen server rules; the movement captures observe actual server boarding and departures. Capture success is separate from the observations below.

## Checks on this source

| Check | Result | Local-only receipt |
| --- | --- | --- |
| `npm run loop -- run` | PASS; canonical and alternative orders and dependency probes complete | `.look/rider-coach-r4/loop.log` |
| `npm run checkpoints` | PASS, 28 default/routed saves through host | `.look/rider-coach-r4/checkpoints.log` |
| Remaining `SEED_STAGES` checkpoints | PASS, 25 additional; total 53 | `.look/rider-coach-r4/checkpoints-additional.log` |
| Two-player T2: `npm run playthrough -- --players 2 --to T2` | PASS, both finished; hashes agree at 227 sampled server steps; clock drift observed, not a timing proof | `.look/rider-coach-r4/t2-corrected.log`, `.look/playthrough/b0b25f0f8/report.txt` |
| `npm run scenario -- world-inputs town-buy` | PASS both, no graphics errors | `.look/rider-coach-r4/scenarios.log` |
| `npm run check:full` | PASS: 2,382 unit cases (2,316 pass, 65 skip, one todo), build, level/assets, 408 server tests and 208 network checks | `.look/rider-coach-r4/check-full.log` |
| `npm --prefix server test` | PASS 408/408 | `.look/rider-coach-r4/server.log` |
| `npm run test:net` | PASS 208/208 | `.look/rider-coach-r4/net.log` |
| `npm run level-check` | PASS, 21 reports; existing planned-track warnings retained | `.look/rider-coach-r4/level.log` |
| Home/Pier/curve/Gorge/Ring production capture scripts | PASS WebGPU, no health errors, advancing frames | `.look/rider-coach-r4/motion-*.log`; `.look/rider-coach-r3-polish/motion/*/proof.json` |
| Pier walking rerun | PASS both directions, west ramp/planks/east ramp, back to lever; no recovery or swimming | `.look/rider-coach-r4/crossing-rerun.log` |

The checks ran against the unchanged #1995 game source, before and after the docs-only trim commit. Output receipts remain local; historical R2b successes were not substituted for these runs.

## Opened evidence and observations

| Images | Observation |
| --- | --- |
| [Full outer](rider-coach-r4/count-8-outer.jpg), [full island](rider-coach-r4/count-8-island.jpg) | Four distinct near-side riders in four openings on each side; opposite caps remain visible behind them. Eight total. Red door framing, panel borders and four-wheel underframe visible. |
| [Three outer](rider-coach-r4/count-3-outer.jpg), [three island](rider-coach-r4/count-3-island.jpg) | Two on one bench, one on the other; vacant openings and bench space are visible. |
| [Empty outer](rider-coach-r4/count-0-outer.jpg), [empty island](rider-coach-r4/count-0-island.jpg) | Both benches empty. The island-side steps project below the deck while standing. No visible panel overlap in these stills. |
| [Players' car](rider-coach-r4/players-car.jpg) | Coach behind the open knifeboard; scale and coupling gap clear. The staged player is airborne; this is not a boarding proof. |
| [Home whole](rider-coach-r4/home-whole.jpg) | Wider fixed station view of the consist; compare the local approved-camera originals, whose canopy blocks portions of the train. |
| [Pier standing](rider-coach-r4/pier-standing.jpg) | Wider fixed view of the consist beside the Pier. The original low platform view loses the engine edge and hides steps behind the bench/post; it is retained locally. |
| [Ring standing](rider-coach-r4/ring-standing.jpg) | Engine, players' car, coach, kit, wagon and steel car visible along the platform. |
| [Gorge standing](rider-coach-r4/gorge-standing.jpg) | Wider fixed view of the long consist at the terminal. The original north-platform view foreshortens the coach behind the engine. |
| [Home motion](rider-coach-r4/home-motion.jpg) | Arrival, standing count change and departure. Waiting figures disappear into seated visibility; no walking through doors. Canopy post masks a portion of the coach. |
| [Pier motion](rider-coach-r4/pier-motion.jpg) | Arrival, count change and departure; bench/post hide lower step detail. Not a proof that no step ever crosses a platform. |
| [Home curve](rider-coach-r4/curve-motion.jpg) | Long train leaves Home round the curve. Cars follow separate chords; no gross body collision visible in sampled poses. Small coach details cannot be judged at this sheet scale. |
| [Gorge turn](rider-coach-r4/gorge-motion.jpg) | Long train arrives, stands and reverses; no gross displacement at the stop in sampled poses. Sparse samples cannot exclude a one-frame twitch. |
| [Pier crossing](rider-coach-r4/crossing-motion.jpg) | Purple player walks down the west ramp, across the shifted planks to the east side, and back to the west lever; input trace confirms completion. |

Raw real-time recordings (local-only): `.look/rider-coach-r3-polish/motion/{home,pier,curve,gorge,ring}/{mode}-realtime.webm`; crossing `.look/rider-coach-r4/crossing-rerun/crossing-realtime.webm`. Each motion sheet is from its recording run, not a virtual-time promo. Wider fixed-camera captures and additional clips are under `.look/rider-coach-r4/wide/{home,pier,gorge}/`. Original count and approved Home cameras: `.look/rider-coach-r3-polish/captures/home/`.

**Visible limitation:** riders still pop into seated visibility at a count change; no door walk is implemented. Stills show no obvious panel z-fighting, but shimmer at play size, real-time playback smoothness, brief penetrations and transient turn twitch remain unverified. Codex inspected the stills and sheets; it cannot certify video playback cadence. Crossing walking does not establish boarding a homeward train by player input. No device was tested.

## Performance

MacBook Pro, Apple M1 Max (32 GPU cores), 32 GB, macOS/Metal, visible Chromium, WebGPU, fixed DPR, 1200×800 fleet view. Source before coach: v56 `945c69554`, extracted locally with its own npm dependencies, never symlinked. The local fleet harness uses accepted seed operations to activate six line 2 trains, a fixed shared camera, renderer draw counts and the repo's `hardwareTiming(5)` capture. Raw results and reproduction harness are local-only under `.look/rider-coach-r4/`.

The machine quieted: recorded loads were 4.55, 3.02 and 5.12 (all below 8); no other process was killed to obtain quiet. The baseline and current runs used the same camera coordinates, six active fleet rows and 4× MSAA, DPR 1. Because the fleet spans much of the line, this is a very high overview; the trains are tiny, and the profiler overlay obscures much of the scene. It is not a play-distance fleet stress view.

| Provisional sample | v56 `945c69554` | v57 #1995 | Difference |
| --- | ---: | ---: | ---: |
| Draw calls | 1,126 | 1,162 | +36 |
| Triangles | 1,556,336 | 1,589,932 | +33,596 |
| GPU render average / p95 ms | 6.987 / 10.008 | 7.011 / 9.903 | +0.024 average |
| GPU frame span average / p95 ms | 18.556 / 22.376 | 19.148 / 22.444 | +0.592 average |
| Animation callback interval average ms | 12.553 | 13.062 | +0.509 |

**Performance acceptance failed / reliable coach cost remains unverified.** Both fleet results contain two identical console 404 errors (quoted below); CPU timings were all zero under the frozen-clock harness and are unusable. The GPU values are raw hardware observations, not a certified regression or a clean cost attribution: one sample per build, tiny trains in a huge overview, different accepted seed poses after changed stops, and no proof of exclusive GPU use. No valid CPU frame-time comparison was obtained. Do not treat the +0.592 ms observation as the coach's established cost.

Receipts: current `.look/rider-coach-r4/fleet-perf/result.json`; baseline `.look/rider-coach-r4/v56/.look/rider-coach-r4/fleet-perf/result.json`; harness `.look/rider-coach-r4/fleet-perf.ts`; logs `fleet-perf-rerun.log` and `perf-v56.log`. The baseline lives entirely under `.look/rider-coach-r4/v56/`, not a Git worktree. Local screenshots were opened; they expose the overview/overlay limitation.

## Failed attempts (full failure text)

No game behaviour was repaired. The first T2 command used unsupported segment names; corrected command above passed:

```
Error: --from: q5-done, trains-on, deck-laid, gap-footed, leaf-raised, ring-joined, steel-kit, steel-lit, steel-home, gorge-open, gorge-mid (rail seeds)
    at railSegmentOptions (file:///Users/matiasfranco/.t3/worktrees/boogle/t3-bd52f508-91a0bc6259c75812/dev/look/segments.ts:91:50)
    at main (file:///Users/matiasfranco/.t3/worktrees/boogle/t3-bd52f508-91a0bc6259c75812/dev/look/playthrough.ts:240:16)
    at file:///Users/matiasfranco/.t3/worktrees/boogle/t3-bd52f508-91a0bc6259c75812/dev/look/playthrough.ts:434:7
```

```
page.evaluate: Execution context was destroyed, most likely because of a navigation.
    at Game.eval (/Users/matiasfranco/.t3/worktrees/boogle/t3-bd52f508-91a0bc6259c75812/dev/look/lib.ts:394:22)
    at pageScript (/Users/matiasfranco/.t3/worktrees/boogle/t3-bd52f508-91a0bc6259c75812/dev/look/look.ts:279:23)
    at /Users/matiasfranco/.t3/worktrees/boogle/t3-bd52f508-91a0bc6259c75812/dev/look/look.ts:349:24 {
  log: [],
  name: 'Error'
}
```

```
Error: console error: Failed to load resource: the server responded with a status of 404 (Not Found)
console error: Failed to load resource: the server responded with a status of 404 (Not Found)
    at file:///Users/matiasfranco/.t3/worktrees/boogle/t3-bd52f508-91a0bc6259c75812/dev/look/perf.ts:201:28
```

The first crossing capture lost its execution context; a clean rerun passed. The initial overview perf attempt failed health on two 404s and did not frame the six-train fleet; its numbers are rejected as coach cost.

Both fleet result files list the complete health failures:

```
console error: Failed to load resource: the server responded with a status of 404 (Not Found)
console error: Failed to load resource: the server responded with a status of 404 (Not Found)
```

The first local fleet timing attempt was stopped and replaced after its frozen-clock setup failed to progress; only this runner's own harness/server/browser processes were stopped. Its incomplete output is not a measurement. No other agent or owner process was stopped.

## Runner checkpoint and remaining gaps

R4's runner pass is recorded in the plan with explicit gaps, not owner art approval. The complete game checks and count evidence pass. Five requested classes of real-time recording exist locally; the Pier input walk passes. Player boarding of a homeward coach after that walk remains unverified. Step lowering/folding is recorded in live pose samples, but bench/platform occlusion and sparse sheets prevent a penetration-free or smoothness claim. Riders pop into seated visibility. Reliable fleet performance cost, devices, display playback smoothness and shimmer remain unverified. No game failure was fixed.

Final docs/link gate: `node dev/ship-check.ts`; evidence-link existence scan and `git diff --check`. Raw clips/JSON/logs stay local. Principle: 11. Show, don't tell; Small and readable.
