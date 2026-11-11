# Remote device tests

The plan is [docs/plans/remote-device-tests.md](../../docs/plans/remote-device-tests.md). A device opens a link, taps
**Run**, and measures itself; the results upload as a playdata session and `npm run device` turns them into a report.

```
npm run device -- new --label "iphone 15" [--query 'terrain=1'] [--site <origin>]   # prints the link
npm run device -- list                                                              # runs on the server
npm run device -- pull <run id or last six characters>                              # -> .look/device/<id>/
npm run device -- pull --new                                                        # every run not yet pulled
npm run device -- new --label "iphone 15" --wait                                    # link, then block until it finishes
npm run device -- baseline <code>                                                   # a pulled run becomes the baseline
npm run device -- waiting                                                           # one line for npm run heartbeat
```

`https://boogle.club/?device=new` is the fixed board link: the page makes its own run id and marks the run
self-minted. Reads need `REPORT_TOKEN` (`scripts/report-token.ts`); `BOOGLE_SERVER` picks another server.

Files: `src/debug/device/` is the lazy chunk on the device (`index.ts` runs, `scene.ts` measures, `upload.ts` sends,
`stats.ts`, `id.ts`, `wire.ts` are pure), `src/boot/device-entry.ts` prepares the address, `src/features/device-test.ts`
loads the chunk only under `?device=`. Here: `read.ts` (session lines to `DeviceResult`), `report.ts` (to markdown),
`cli.ts`.

## Baseline, waiting and pulling

- `baseline <code>` marks a pulled, finished run of a suite as the Mac's baseline for it
  (`~/.boogle/device/baseline/<suite>.json`, `BOOGLE_DEVICE_DIR` moves it). Make one by opening the same link in your own
  Chrome on the Mac when it is quiet, `pull` it, then `baseline` it. Every later report of that suite gets an "Against the
  baseline" section: p50 and p95 beside the Mac's with the ratio, calls and triangles with the difference, the detail rung
  of each side (named when they differ), and dashes for a scene the baseline lacks. When
  `~/.boogle/daily/perf/history.jsonl` has an entry for the run's build, one line compares the bench's exact counts.
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
| `dev.load` | `req`, `net_kb`, `body_kb`, `sw_req`, `warm`, `nav`, `m_<boot mark>` (ms), `big`, `big_kb` |
| `dev.scene` | `name`, `idx`, `n`, `secs`, `p50`, `p95`, `p99`, `max`, `over33`, `over50`, `lt_n`, `lt_ms` (-1: unsupported), `cpu`, `cpu95`, `gpu`, `gpu_status`, `calls`, `tris`, `progs`, `geoms`, `texs`, `ratio`, `rung`, `settle_ms`, `stall_n`, `stall_max`, `progs_new`, `heap_mb`, `heap_d`, `hidden`, `verdict` (`pass`, `fail`, `not-measured`), `why` |
| `dev.done` | `scenes`, `pass`, `fail`, `not_measured`, `drift_pct`, `ms` |

Reading is tolerant: a repeated batch is dropped, a repeated scene keeps the last, a run with no `dev.done` is
incomplete, unknown kinds and wrong types are ignored. A figure the device could not read is `null` or `-1` and the
report prints a dash or "unavailable", never a zero.

## Limits

A run on the Mac is not a device test: the look harness proves the flow, not a device. Timing under load is not
evidence. Step 1 sends numbers only (no stills).
