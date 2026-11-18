# Remote device tests

The plan is [docs/plans/remote-device-tests.md](../../docs/plans/remote-device-tests.md). A device opens a link, taps
**Run**, and measures itself; the results upload as a playdata session and `npm run device` turns them into a report.

```
npm run device -- new --label "iphone 15" [--query 'terrain=1'] [--site <origin>]   # prints the link
npm run device -- list                                                              # runs on the server
npm run device -- pull <run id or last six characters>                              # -> .look/device/<id>/
npm run device -- pull --new                                                        # every run not yet pulled
npm run device -- new --label "iphone 15" --wait                                    # link, then block until it finishes
npm run device -- new --cold                                                        # clears the service worker and caches first (or use a private tab)
npm run device -- baseline <code>                                                   # a pulled run becomes the baseline
npm run device -- waiting                                                           # one line for npm run heartbeat
```

`https://boogle.club/?device=new` is the fixed board link: the page makes its own run id and marks the run
self-minted. Reads need `REPORT_TOKEN` (`scripts/report-token.ts`); `BOOGLE_SERVER` picks another server.

Files: `src/debug/device/` is the lazy chunk on the device (`index.ts` runs, `scene.ts` measures, `upload.ts` sends,
`stats.ts`, `id.ts`, `wire.ts` are pure), `src/boot/device-entry.ts` prepares the address, `src/features/device-test.ts`
loads the chunk only under `?device=`. Here: `read.ts` (session lines to `DeviceResult`), `report.ts` (to markdown),
`cli.ts`.

## Cold launch

A launch is cold only when no service worker controlled the first page and its HTML was fetched (`dev.first`:
`sw0` false, `html_cached` false). `navigator.serviceWorker.controller` read after the load says nothing: the
worker installs during the first visit and claims the page. The report leads with `Cold launch: N s (first visit, no
service worker)` and `Warm launch: N s`, says `unknown` when the first navigation was already cache- or
worker-served, and breaks the launch down by boot mark with the step from the one before, bytes, the largest files
and the shader warm-up. For a true first visit: open the link in a private tab, or use `new --cold` /
`?device=new&cold=1`, which unregisters the service worker and clears Cache Storage for the origin, reloads once and
measures that load; the card says what it cleared. A page cannot clear the browser's HTTP cache, so a private tab is
the cleaner cold. (A run from before this record has only the load at Run time and says it cannot tell.)

## Baseline, waiting and pulling

- `baseline <code>` marks a pulled, finished run of a suite as the baseline for it on the machine that
  pulls (`~/.boogle/device/baseline/<suite>.json` in its home, any OS; `BOOGLE_DEVICE_DIR` moves it). Make one by opening
  the same link in your own browser on the machine to compare against (the Mac's Chrome, say) when it is quiet, then on
  the pulling machine `pull` it and `baseline` it; the report names the baseline by its own device line. Every later report of that suite gets an "Against the
  baseline" section: p50 and p95 beside the baseline's with the ratio, calls and triangles with the difference, the detail rung
  of each side (named when they differ), and dashes for a scene the baseline lacks. When the
  pulling machine's `~/.boogle/daily/perf/history.jsonl` (only a machine running the daily perf job has one) has an entry
  for the run's build, one line compares the bench's exact counts and names that machine; otherwise it is left out.
- A report also gets an "Against this device's previous run" section: the newest earlier pulled run of the same suite on
  the same hardware (device class, GPU, cores) and label, unless that run is the baseline. Both comparisons check the
  conditions first (`dev/device/compare.ts`): full browser version (Safari 27.2, not 27), viewport, DPR, refresh
  interval (more than 10% apart), graphics settings, cold or warm launch. On the same hardware with any of them
  different the section says **Not comparable**, lists each difference and prints counts only, no frame-time ratios:
  on 10 November two runs on one MacBook (Safari 27.0 against 27.2, 1489x974 against 1128x730, 17 against 21 ms) were
  read as a regression. Against other hardware the ratios stay and the differences are listed beside them.
- `new --wait` checks it can read the server first, prints the link, then polls every 10 s for up to 30 minutes until the
  run says `done`, and pulls it. It ends early (pulling what arrived) when the run started and has been silent for 10
  minutes, and gives up after six failed polls in a row.
- `pull --new` takes finished runs not on disk, leaves a run still sending (it says so), pulls one that went quiet as cut
  off, pulls a cut-off copy again only when the server has more of it, and carries on past a run that fails.
- `waiting` prints the heartbeat's line: `device runs not pulled: N (codes)`; a run left unpulled can be evicted
  when playdata passes its 200 MB or 2000 sessions.

## What a run sends

A playdata session (`POST /playdata`, server/src/playdata.ts): the session id is the run id (`dv-` and 26 characters of
`[a-z0-9]`), the card is `device`. The run id is the only credential: it appends to that one session and reads nothing.
Every `session` event says `bot: true`: `npm run playtest` (and so `dev/heartbeat.sh`'s play-session list) hides the
run unless `--all`, and the server never counts it as someone playing. Events are flat, at most 24 fields, names at
most 24 characters.

| kind | fields |
| --- | --- |
| `session` (sent at start and at the end) | `suite`, `build`, `label`, `device` (phone, tablet, desktop), `browser`, `ua` (the full user agent), `self` (the page made the id), `state` (`started`, `done`), `pass`, `total` at the end, `bot: true` |
| `dev.diag.gpu` | `backend`, `webgpu`, `adapter`, `vendor`, `arch`, `gpu`, `desc`, `format`, `timestamps`, `features`, `transient` |
| `dev.diag.alim`, `dev.diag.dlim` | the adapter's and the device's limits, by the short names in `src/debug/device/limits.ts` |
| `dev.diag.env` | `dpr`, `sw`, `sh`, `vw`, `vh`, `cw`, `ch`, `mem`, `cores`, `touch`, `coarse`, `refresh_ms`, `net`, `battery`, `charging`, `rung`, `gfx`, `standalone` |
| `dev.load` | `req`, `net_kb`, `body_kb`, `sw_req`, `warm`, `nav`, `ready` (ms to the interactive mark: the headline "Ready in N s (warm or cold load)"), `cold_req` (the link had `cold=1`), `m_<boot mark>` (ms), `big`, `big_kb` |
| `dev.first` | the load of the run's FIRST navigation, taken when the game became usable and kept in sessionStorage so a later navigation cannot replace it: `sw0` (a service worker controlled that page at its start), `html_cached` (its HTML came from a cache), `nav`, `ttfb`, `conn` (dns + connect), `html`, `ready` (interactive, ms), `usable`, `req`, `net_kb`, `body_kb`, `sw_req`, `sw_now`, `later` (the first navigation never finished), `cold_req`, `cold_did`, `shaders_ms`, `programs`, `pipelines`, `wgsl_ms` |
| `dev.boot` | that navigation's boot marks, every one (`m_<name>`, ms since it began), in events of 20 |
| `dev.first.files` | `f1`..`f6`: its largest files, "path (KB, ms)" |
| `dev.scene` | `name`, `idx`, `n`, `secs`, `p50`, `p95`, `p99`, `max`, `over33`, `over50`, `lt_n`, `lt_ms` (-1: unsupported), `rfps` (frames that drew a second), `fcap` (the frame limit: 30, 60, 0 for the display), `cpu`, `cpu95`, `gpu`, `gpu_status`, `calls`, `tris`, `progs`, `geoms`, `texs`, `ratio`, `rung`, `settle_ms`, `stall_n`, `stall_max`, `progs_new`, `heap_mb`, `heap_d`, `hidden`, `verdict` (`pass`, `fail`, `not-measured`), `why` |
| `dev.done` | `scenes`, `pass`, `fail`, `not_measured`, `drift_pct`, `ms` |

Reading is tolerant: a repeated batch is dropped, a repeated scene keeps the last, a run with no `dev.done` is
incomplete, unknown kinds and wrong types are ignored. A figure the device could not read is `null` or `-1` and the
report prints a dash or "unavailable", never a zero.

## Limits

A look-harness run on the pulling machine is not a device test: the look harness proves the flow, not a device. Timing under load is not
evidence.

## Stills

After each scene's sample the page copies the next drawn frame into a 960 px wide JPEG (quality 0.7,
`src/debug/device/still.ts`) and uploads it to `POST /device/runs/<id>/still/<scene>` (`server/src/device.ts`); the
scene's `dev.scene.cost` event carries `still` (`ok`, `unavailable` for a blank or failed copy, `offline`,
`refused <status>`, `failed`). The copy and upload run between scenes, outside the samples. `new` registers the run
first (Bearer `REPORT_TOKEN`) and says plainly when the server refuses; the link still works for numbers. Only a
registered run takes stills: a self-minted `?device=new` run sends its numbers and its scenes record `still: refused
404` (deferred for this version: a public flood of self-minted runs could fill the caps for 30 days). `pull` saves each still as `<scene>.jpg` beside
`report.md`, whose "Stills" section links them. Caps: 400 kB a still, 12 a run, uploads for 7 days, 50 runs and
20 MB in all, 30 uploads a minute per address; the server keeps only the SHA-256 of the run id.
