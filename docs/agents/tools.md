Before using tools or writing a shot, script or workaround, read this tool table.

## Tools and skills

Start ownership discovery with `npm run map -- --kind <kind>` (bare `--kind` lists routes); `--docs <text>` searches docs with authority labels and current replacement pointers.
**Check here before writing a shot, a script or a workaround.** Details: `.claude/skills/look/SKILL.md`.

| You want to                                    | Use                                                                                                                                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| See a beat of the run                          | `npm run look -- --at "<beat>"` (`--at list` names them); warm-ups are warped, so `--warm` costs little                                                                          |
| Start at a stage of the route                  | `look --rail-seed <stage>` (stages and "Adding a stage": `src/sim/railway-seeds.ts`); a person: `?from=<stage>` ([Jump in](../game-design/dev-menu.md#jump-in)) |
| Pacing, what never happened, on-screen text    | `npm run playthrough` (the production route; `--long` for the whole of it, `--to <beat>` for a segment); new beats go in `dev/look/bots/railway.ts` |
| Ask several questions of the running game      | `npm run session -- start`, then `keys`, `press`, `state`, `still` (under a second each)                                                                                         |
| Compare lighting in one frozen town scene      | `node .look/see-client.ts shots dev/look/beats/lighting-wedge.ts --reuse --name town` (outside a broker: `node dev/look/shots.ts` with the same arguments) |
| Judge motion or feel from evidence             | `look --curves`, `--target glide`; `look --filmstrip N` for exact frames                                                                                                         |
| Compare with an earlier build                  | `npm run before-after -- <ref>`                                                                                                                                                  |
| Two players                                    | `look --players 2` (warped at 5x)                                                                                                                                                |
| Continuous two-player route                    | `npm run playthrough -- --players 2 --long` (broker: `node .look/see-client.ts playthrough ...`; `--real` for 1x)                                                              |
| Know a folder without reading it               | `npm run map -- <folder>`, then `grep` and line ranges                                                                                                                           |
| Know the rail loop: beats, bills, cues, grind  | `npm run loop -- node <id>` for one beat (about 650 characters; read this first); `npm run loop` (every node of `dev/loop/graph.ts` with bill, straight-line distance and cue; grind per beat for 1–3 players, 4 secondary, and by hand when a vehicle is away; nodes with no cue; order facts; `--json`). `-- run [--players N] [--order <name>] [--break <station>]` plays every order the graph allows through the real host rules in Node (time per node, softlocks, graph bugs, order probes; a lower bound: straight-line walking; orders share the canonical prefix, `--no-share` replays each). `--by-hand <node|all>` plays a vehicle-fed node fed on foot and reports the time difference. `-- calibrate [ids]` writes per-node detour factors (walked over straight-line, median, range, n) from human sessions to `dev/loop/detour.json`; the grind and the run print raw and calibrated side by side. `-- trace <session id prefix or path> [--bot <name or path>]` puts the prediction, a bot run and a human playtest side by side per node (time, delta, carries, metres walked, walked/pred, prompts and presses, refusals, nothing-in-reach presses, idle, confusion rank); a session that isn't local is downloaded as `npm run playtest` does (`--offline` doesn't), and several ids or `--since YYYY-MM-DD` give one ranked table per node with n. No browser |
| Simulate campaign stock, purchases and pacing  | `npm run economy` (both routes, 1–4 players); `-- three-area --players=2 --policy=cart-first`; `-- five-area --core-only --json`; `-- --report` regenerates the paper comparison |
| Check level coverage or a placement            | `npm run level-check`; `-- --place=place --region=T3 --state=empty --physics --json`; `-- --replay`                                                                              |
| Regenerate Home's 2D layout page from the code | `node --import ./dev/sim/hooks.ts dev/level/home-station-page.ts` (writes docs/world/home-layout.html's data) |
| Make many edits at once                        | `npm run patch -- <file>`                                                                                                                                                        |
| See where a session's time and tokens went     | `npm run transcript -- <id>`                                                                                                                                                     |
| Benchmark frame cost, load and memory          | `npm run bench` (`--root <checkout>` for another commit); the nightly history is the Performance issue ([details](test-details/performance.md))                                   |
| Measure on a real device (a phone, an iPad, another laptop) | `npm run device -- new --label "iphone 15"` prints a link to open there (the board link `https://boogle.club/?device=new` needs no command); tap Run, about two minutes; then `npm run device -- list` and `-- pull <code>` or `-- pull --new` write `.look/device/<id>/report.md`, whose first line is the one to paste ("Tested on a device: ..."; a report may cite it instead of "not tested on a device", [owner calls](owner-calls.md)). `new --wait` blocks until that run arrives and prints its report; `new --cold` (or a private tab) gets a true first-visit load, which the report heads "Cold launch"; `-- baseline <code>` marks a pulled run (the owner's own Chrome on the quiet Mac) as the baseline the reports compare against. Needs `REPORT_TOKEN` to read; the device never has it. No browser on the Mac ([details](../../dev/device/README.md)) |
| Walk a map layout before it's built           | `npm run dev`, then `?greybox=sickle&room=<yours>` (dev only, reads docs/world/map-prototypes.html; [README](../../src/proto/greybox/README.md)); the whole map walkable in the live game: `?blockout=world` |
| Regenerate the future-line catalog and world map | `node --import ./dev/sim/hooks.ts dev/level/world-blockout.ts` (writes src/sickle/world-lines.ts and docs/world/world-blockout.html; `--numbers` prints the legs) |

- Headless tools (`look`, `session`, `scenario`, `clip`, `perf`) open the current game, as the bare address does; `?proto=` selects a prototype. The classic island has no entry of its own: `look --island`, a scenario's `island: true` or a clip shot's `island: true` start the player by its court at the world's origin. Its classic lockstep edits (throws, the frisbee, logs to work sites) are refused by the current game's server, so the few tools that need one use the explicit `proto=place` room (`dev/audio` build take, `dev/look/evals/gpu-reload.ts`).
- `npm run ship-branch -- <worktree> [--wait]` rebases onto main, keeps both sides of docs-only conflicts and enqueues a ship without waiting for CI, so the next branch can start. `--wait` explicitly waits and reports commits still off main. It stops with `CODE CONFLICT` (exit 2) or `EMPTY COMMIT` (exit 3). Queued is not merged; read its output.
- `npm run ship-queue -- <worktree> [--wait] [--dry-run] [--reviewed "<stamp> <who, what they found>"] [--orchestrator-read "<what changed>"] [--nightly-known "<why>"] [--main-known "<why>"]` is how an orchestrator merges: one ship at a time across every session on this machine (a lock in `/tmp`), run from `../boogle-trusted` at origin/main (missing or broken: exit 1). A branch with a file `review-stamp` marks `review` needs `--reviewed` starting with its review stamp, recomputed before the rebase; one with only `read` files needs `--orchestrator-read`; either missing, or a changed stamp, is exit 4. Such a branch is held while the last nightly `Daily scenarios:` verdict is not a pass (exit 6, unless `--nightly-known` says why) and while a `red-main` issue is open (exit 7, unless `--main-known` says why). `--dry-run` stops after these checks. `--wait` polls 30 minutes for the commits on main and starts CI once if the push got no run; exit 5 means not on main.
- `npm run review-stamp -- <worktree>` owns the review trigger (`REVIEW_PATHS`: `src/sim`, `src/net`, `src/world`, `src/ecs`, `server/src`, plus sim, net and server tests whose assertions changed) and prints each file with the rule that fired (`review` or `read`) and the stamp a review names (patch id of the `review` files' diff, first 12 hex). It survives a rebase onto main and changes with any later edit to those files' diff; `--id` prints the stamp alone.
- `npm run heartbeat [-- --all]` is the orchestrator's check-in in one read-only report: model mode, main, open pull requests, the last CI, deploy and smoke runs, recent play sessions, device runs not yet pulled, the bot queue, each nightly job's last verdict and failing streak with the open `scenarios` and `performance` issues, the ship lock, load and the worktrees with unmerged or uncommitted work active in the last 48 hours (`--all` lists every one, daily-run worktrees included).
- `npm run friends-report -- [--since YYYY-MM-DD]` lists friends’ merged PRs and flags sensitive paths; it remembers the last report date in `.look/`.
- `npm run transcript -- <path|id>` summarizes a finished Claude or Codex session; `--latest claude|codex`, `--compare a b`, and `--json` select other views.
- `npm run economy -- --help` lists campaign controls. `--scenario=late-3h|late-7h|1-2-1|absence` defines attendance; `--content=N`, `--cost=N`, `--supply=N`, `--distance=N` run counterfactuals; `--omit=C5` removes an optional purchase and its optional descendants. Each route owns one typed input file under `dev/economy/`. This is offline tooling, with no game imports or browser requirement. [Results and limits](../research/progression-sim.md); the old `node dev/economy/model.ts prototype` calibration remains separate.
- `.agents/skills` links to `.claude/skills`, so Codex and other agents that read it get the same skills: the workflows plus `threejs-*` (use the WebGPU/TSL parts), `game-feel`, `camera-systems` and `audio-design`. They're written for Claude Code; "Codex" below maps the names.
- `npm run concepts`: painted concept images. `npm run clip`, `npm run reel`: clips and trailers. `npm run playtest`: what `?proto=` sessions did, uploaded on their own (`-- latest` prints the summary and a heat map; prototypes add beats with `playMark` from `src/proto/mark.ts`). `npm run server`: list, reset, back up and restore room saves on the running server, no deploy ([operator tools](../../server/README.md#operator-tools)).
- `npm run decisions`: the decision log's no-loss and shape check (also in `npm run registry`): every line and quotation of the old single-file log is still there, no entry in `docs/decisions.md`, no ruled call in the live `docs/agent-calls.md`, every entry with its Current rules line, every link into the log resolving. `npm run decisions:split -- --from <ref>` re-runs the split from a ref that still has the old single files (topics, supersessions and rules wording: `dev/decisions/topics.ts`).
- `npm run patch -- <file>`: many edits across files in one go. Nothing is written if any edit's text is missing or appears twice, then it runs Prettier, the full lint runner and a typecheck. Use it instead of a throwaway script, whose `replace` misses in silence and which skips the format hook. The format is at the top of `dev/patch.ts`.
- `startStack` (`look`, `playthrough`, `session`, `scenario` and the rest) stops if `node_modules` doesn't match `package-lock.json`, and says to run `npm ci`. It never reinstalls by itself. A symlinked `node_modules` is skipped, since `before-after` plays an old commit on current packages on purpose. In an agent worktree with no `node_modules`, run `npm ci` there (and in `server/` if needed); never symlink `node_modules` from another checkout: an `npm ci` on either side empties the shared one (owner rule; three agents did it on 10 November).
- One Mac GPU is shared: browser harnesses use the machine-wide bot queue (default one run; short looks go ahead of waiting `--long` playthroughs until one has waited 20 minutes). `perf` and `hitches`
  numbers still need a quiet machine; the queue cannot exclude unrelated apps or older launchers. See [checks and segments](test-details/bot-segments.md).
- `look` has a hard wall: `--wall <seconds>` (default 1200, 20 minutes) limits the whole run once it holds the bot slot, warm-up, `--until` wait and capture, for one player or two. When it fires the verdict is `timeout` (never a pass) naming the phase and the pages that never met `--until`, the browsers close, it exits 4 and the queue slot is released. A long `--until` run needs a longer `--wall`. In a two-player look every page must meet `--until`, so every page's eval sets the flag (see `railway-boiler-haul.ts`). `dev/look/wall.ts`, `test/look-wall.test.ts`.

### First look-development loop

The [look-dev research](../research/lookdev-loop.md)'s first build keeps Current/Neutral, gain `0.12`,
bloom off and fixed resolution. One authored Place fixture and the existing town camera compare key
`0.96/1.12/1.28` against fill `2.4/3.2/4`; cell 5 is the accepted baseline. This is not played progression.

```sh
node .look/see-client.ts shots dev/look/beats/lighting-wedge.ts --reuse --name town-prepare
node .look/see-client.ts shots dev/look/beats/lighting-wedge.ts --reuse --spread 3 --name town-wide
node .look/see-client.ts shots dev/look/beats/lighting-wedge.ts --reuse --spread 0.5 --name town-fine
node .look/see-client.ts shots dev/look/beats/lighting-wedge.ts --reuse --repeat 5 --name town-warm
node .look/see-client.ts shots dev/look/beats/lighting-wedge.ts --reuse --preview 5 --name town-preview
node dev/look/session.ts stop
node dev/look/shots.ts --pick .look/shots/town-warm/group-0-r1/manifest.json 5 .look/town-favourite.json
```

`--reuse` retains one page and frozen clock between lists. Source tree, fixture/checkpoint, route, camera,
viewport and resource settings form the reuse identity; an incompatible request stops and recreates it.
Numeric patches in a JSON list under `.look/` can change without invalidating the source tree. Editing a tracked
TS list changes the source fingerprint, intentionally. Stop the session **before editing source**.
Local sessions use the existing browser owner. Broker sessions keep one existing trusted `look --action`
open, using an authenticated loopback mailbox for the same capture actions; they launch no browser themselves.
They expire after 120 idle seconds or 330 seconds total to stay within the broker's seven-minute limit.
Only `capture` and `stop` are supported in a broker session. Do not run another broker operation until stopping it.
Capture results remain provisional until `stop` completes the broker's health checks; it prints the evidence
manifest and copies each queue's artifacts beside it. Do not edit source while that run is open.

The lighting board is a native-pixel 3×3 grid: key down the rows, fill across the columns, numeric cell
captions and a gold outline on accepted baseline cell 5. Axis values sit on the edges; the optional shared
legend states fixed settings. Full settings stay in the manifest. `--spread N` (greater than 0, at most 4)
multiplies both axes' distances from their unchanged centres: 3 is a wide first pass, 0.5 a fine pass, 1
the original spacing. This numeric change reuses the same frozen session. For example, spread 3 gives key
`0.64/1.12/1.6` and fill `0.8/3.2/5.6`. Manifests include resolved
baseline, effective tunables/bindings, actual scene lights, camera, frozen clocks and exact repeat/switch-back
probes. Tunable patches are validated before mutation, then the light owner flushes presentation without
advancing the game. A changed gain with unchanged actual light fails. `--pick` writes a new JSON with the
selected patch, full effective state, baseline and build; it never changes source defaults.
Add `--reference image.png --reference-note 'provenance / approval status'` to show one ungraded reference beside
the grid, aligned with its middle row in the same cell-sized viewport. Matching-size captures stay at native
scale; other aspect ratios fit without stretching or cropping. Path, SHA-256 and assumed sRGB are recorded.

Compare warm queue wall time (including dispatch/extraction) against **30 s**, and `--preview` against **1 s**.
Page manifests also separate resource warm-up, apply/flush, draw submission, GPU completion, copy/encode,
console transfer, repeat probes and composition. Probe time overlaps its component stages; do not sum it again.
After broker finalization, preparation reports client dispatch, local stack plus queue wait, page/load,
setup/restore and fixture warm-up separately. Stack startup and broker queue wait remain combined in this
older transport. Queue manifests log load average and top CPU processes (or sandbox unavailability) before/after each
capture. Loaded runs are **not timing evidence**, and low CPU load cannot prove exclusive GPU use. On a quiet
machine, report median, maximum and failures for five warm batches; cold preparation is separate. Frozen stills
do not establish motion, feel or device performance. See the local evidence for observed timings; not tested on a device.
- `/development/` publishes `docs/agents/orchestrator-state.md` as static HTML at build time (missing file shows an unpublished notice); its last-update time comes from Git, with a labelled file-time fallback for local edits, and it loads no game code or API.

The two-player playthrough runs the production railway bot on both peers in one fresh room: player 1 leads, player 2 shares line one's bills and the beam, then watches line two from the village. It uses real inputs, no staged game state or recovery teleports, and passes when both bots finish every expected beat and their mirrored railway hashes agree at every server step both sampled. It has no reload or leave/rejoin interruption yet (the legacy Place pair had them; `railway-reload.ts` covers a reload separately). Ordinary broker runs retain the seven-minute cutoff. `playthrough --long` explicitly allows 30 minutes of work, with a 35-minute broker cutoff and 36-minute client wait. Reports, bot logs, clock samples and end stills survive failures. A worker's edits do not upgrade the already-running trusted broker: the caller must review these commits and relaunch with the updated harness before this command is supported.

### Vite build contract

Vite is pinned to **8.3.5**, with `vite-plugin-wasm` pinned to **3.6.0** (latest at the upgrade). `vite.config.ts`
uses `build.rolldownOptions` and `output.codeSplitting.groups`: three.js core gets a reusable `three` chunk,
while its add-ons follow their consumers. Prototype/debug entry points stay dynamic; only `proto/flags.ts`
and `proto/mark.ts` are eager. Keep `target: 'es2022'`, rather than adopting Vite's moving browser baseline;
the CSS target inherits it (including Safari/iOS 16.4), below our WebGPU Safari requirement. Safari/iPad
still need device verification when browser compatibility changes.

The atlas virtual module and five HTML entries remain in the build. Keep esbuild: the `boogle-sw` plugin
bundles `src/boot/sw-worker.ts` directly, and `dev/peer-test/harness.ts` also uses it. The service worker
collects the main page, game and SIMD Rapier chunks by emitted module membership, then follows static imports,
CSS and assets. The build requires the game and SIMD WASM in `first` and excludes plain WASM.
Check that list when changing chunking (`npm run counts` gzips each file at level 9;
`npm run counts -- --build-only` skips browser/render counts). Plain Rapier
remains a lazy fallback. Preserve `BOOGLE_SW=off`, `VITE_BUILD`, `VITE_BOOGLE_SERVER` and `BASE=/`.
During development, deploy only current assets and retain only the active build's service-worker cache.
After dependency updates, run `npm ci --dry-run` and retain the
`@emnapi` pins/overrides and optional WASM lock entries, including packages for platforms other than this Mac.
