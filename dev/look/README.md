# Two-player warp

Serves DESIGN.md's **Light tests, real playtests**: exercise the real room and both renderers quickly, with measured clocks.

```sh
npm run look -- --players 2 --rail-seed trains-on --query shot=play --eval dev/look/evals/railway-passenger-car-two.ts \
  --until window.__placeDone --wall 240
# Same run at real speed:
node dev/look/look.ts --players 2 --rail-seed trains-on --query shot=play --real \
  --eval dev/look/evals/railway-passenger-car-two.ts --until window.__placeDone --wall 240
```

Two local players default to a 5x cap. `--warp-speed N` changes it; `--real` opts out. Loading and captures stay at
1x. Setup runs concurrently on both pages, so one eval can await the other's move. That eval starts from an accepted
server seed and drives both players by real input; for the whole route by two players, `npm run playthrough --
--players 2`.

The normal `startStack()` path used by scenarios and real-time runs still uses the in-process server. Only
`startStack({ warp: true })` starts a disposable server child. Its preload changes Date, performance.now and the
callback timeout/interval APIs, including their node:timers exports. An IPC disconnect shuts it down. Vite, the
parent harness and Playwright retain real time. A loopback-only control endpoint switches the server's rate with
both pages; it isn't part of the game/server application.

The server clock advances in small steps, at most the requested rate, yielding to socket traffic between bounded batches (at most eight steps or two real milliseconds).
Simply multiplying elapsed wall time lets an OS pause exceed the world's existing catch-up cap and discard ticks.
The preload avoids that jump without changing the cap or any game state. Its pump stays referenced while the child
lives: an unreferenced immediate can otherwise wait for socket traffic to wake Node. The pages use the existing
fixed 60 Hz warp and draw one frame in 30. No clock is copied into another clock and no network state is corrected
by this harness. If a process cannot keep up, its deficit is reported.

Every two-player run writes `<name>-warp.json`, including `--real` runs. Samples are taken about once per real
second, concurrently but not atomically. The report includes:

- Actual server/page clock rates and peak deficits against the requested rate.
- Actual world-tick progress against achieved server-clock elapsed time (page elapsed time in unwarped runs),
  using TICK_MS. Requested wall-time acceleration is not simulation elapsed time.
- The maximum sampled tick gap between pages and wall-time skew between the reads.
- Machine state and train positions. Train gaps include network latency and read skew. Both the all-sample gaps
  and gaps while both train clocks are running are printed; a scripted skip can produce a large transient jump.

A peak deficit over one game second prints **DRIFT**, even if the process catches up. Remaining clock or world-tick
deficit over one game second at the end fails the run. Requested-rate failures are labelled harness capacity;
world deficits compare against the achieved source clock. Final co-op convergence runs with clocks still advancing,
before their final rate check, so a rate failure cannot hide an independent state mismatch and a final effect's
temporary lag has the normal convergence interval to catch up. Population joins the convergence check.
These are harness diagnostics, not proof of tight
synchronization throughout the run. Use a lower cap on a busy machine. The measured interval covers setup and
warm-up; shader loading, browser startup and captures add real time. Background work on the shared Mac changes the
achievable rate. Warp is not a feel, smoothness, GPU-performance or real-network-latency test.

## Sandbox bridge

Use `node dev/codex/see.ts` with the same flags. It owns the local child and passes its loopback clock URL through
the existing broker. The broker itself needs no new privilege or protocol: it continues running only its own
checkout's trusted look harness. That checkout must also contain this updated harness. An old checkout rejects
`--clock-url` explicitly; the bridge never silently substitutes real time or restarts the broker.

During development the already-running broker belonged to an older parent checkout. A `--real` baseline through
`see.ts` passed; the warped bridge request was rejected with `unknown option --clock-url`. The edited harness was
verified directly with local GPU access, without editing the parent checkout or starting another broker.

## Measurements on the shared Mac

The final 10x run (`coop-verified10`) measured 237.8 game seconds in 23.8 real seconds: both page clocks,
the server clock and world ticks averaged 10.00x. The pages were at most one tick apart in the samples. Their
clock deficits peaked at 0.059/0.124 game seconds. The server briefly fell 4.415 game seconds behind and recovered;
the run explicitly printed DRIFT. Train-position gaps peaked at 7.254/10.030 m, ending at 0.256/0.016 m. This
supports fast co-op checks, not a claim that all three clocks stay tightly aligned under load.

With `--warp-speed 5` (`coop-verified5`), 234.5 game seconds took 46.9 real seconds and all clocks/world ticks
averaged 5.00x. Peak server deficit was 0.742 game seconds; page deficits were 0.006/0.003 seconds, with at most
two ticks between pages. While both train clocks ran, position gaps peaked at 3.398/6.090 m, ending at
0.379/0.094 m. The all-sample maxima were 193/507 m at the scripted skip before the follower started its trains;
those samples remain in the report. On the build of 3 November, 10x failed on drift and 5x held (174.6 game seconds in 34.9 s, server deficit 0.8 s, running trains within 5.3 m), so 5x is the default.

The real baseline showed the follower's 8 logs on the authority, matching money ($120), machine mode, chest upgrade
and train unlocks. The same outcomes occurred warped. An early 30x trial only achieved about 16x on the pages and
accumulated about 200 game seconds of page-clock deficit: 30x is not a supported rate on that run. A later short
30x trial exited with a clock-drift error. 10x is a target to measure, not a guarantee or a machine maximum.

The final measurements and capture paths are recorded in the local `.look/` artifacts; these are intentionally
not committed. Capture checks establish WebGPU, advancing game frames and no graphics/page/console errors. Opened
motion sheets show a train descending the bridge; they do not establish real-time smoothness. No 30-minute
end-to-end bot playthrough was performed.

Seeded starts: `--rail-seed <stage>` writes a stage from `src/sim/railway-seeds.ts` as the run's save; `--query from=<stage>`
runs a playtest jump-in through `POST /jump` instead, and `dev/look/evals/jump-in.ts` checks where it landed.
