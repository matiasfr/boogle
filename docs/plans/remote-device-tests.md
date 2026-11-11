> **Status: planned (2026-11-10).** Five steps, each ships alone. Step 1 is client and tooling only (no `server/`
> change) and is the one the owner can use on his phone the day it lands. Base: `origin/main` at `bd34b181` or later.
> No `WORLD_NS` bump, no new service or account.

# Remote device tests

## Goal

The owner opens one link on any phone, tablet or laptop, taps Run, and that browser measures itself: what the device
is, how the game loads on it and how fixed scenes run on it. The results upload on their own, and
`npm run device -- pull` turns them into a report under `.look/device/<id>/` that an agent cites instead of "not
tested on a device". The owner's Mac does nothing but read a few kilobytes of JSON.

Owner, 10 November 2026: "device tests should be something I can run remotely not just on the busy host system. maybe
with a unique URL. I can load on a machine hit run, and the test can run, share device diagnostics, and profile for
that particular device without bogging down the main device. and pull data automatically."

**Principles served.** DESIGN.md "How we work" (playtest constantly: evidence from the devices the game is played
on), **Small and readable** (one lazy chunk behind a flag; the game is unchanged without it) and **Clear authority**
(the server stores what it is sent and decides nothing). Nothing bends.

**Sources.** Owner calls "The Mac and mobile are the targets", "Weekly or on command; focused tests, not full runs",
"One nightly load; perf on demand", "Measure performance daily" (its method), "Pick and log, don't ask", "No old
builds in development". Decisions: 2026-11-01 "the lowest target device is an M4 iPad Pro"; 2026-10-30 "`main` keeps
deploying straight to boogle.club"; the owner's 4 November notes in
[main-clean-dev-channel](../research/main-clean-dev-channel.md) ("no second paid server", "keep things as they are for
now").

**Research.** [performance.md](../research/performance.md): this plan reuses its method (fixed poses, a settled scene,
5 s of real frames, counts exact and times noisy) and departs in one place: the device runs with its own adaptive
resolution and quality, as a player gets it, where the Mac bench pins `?dpr=fixed`.
[main-clean-dev-channel.md](../research/main-clean-dev-channel.md): step 5 follows its rule that a non-main client may
use the production server only when its `server/`, `src/world/`, `src/sim/`, `src/net/ids.ts` and `src/net/ws-wire.ts`
match main, and departs from its Cloudflare Pages project (a new account) by nesting the build inside the existing
GitHub Pages site. [webgpu-on-ipad.md](../research/webgpu-on-ipad.md) recommendation 1 (read the adapter on the device
without Web Inspector) is what `src/debug/gpu-info.ts` already does; the diagnostics reuse it.

**What was read.** `dev/look/bench.ts` (poses, counts, `hardwareTiming`), `dev/look/perf.ts`, `dev/daily/perf.ts`
(`PERF_POLICY`, history), `src/debug/prof-overlay.ts`, `src/debug/gpu-info.ts`, `src/debug/dev/performance.ts`,
`src/boot/index.ts`, `src/boot/jump-in.ts`, `src/boot/timeline.ts`, `src/features/playdata.ts`,
`src/proto/playdata/record.ts`, `server/src/playdata.ts`, `server/src/server.ts`, `server/src/jump.ts`,
`server/src/reviews.ts` (headers and limits), `dev/playtest/fetch.ts` and `cli.ts`, `scripts/report-token.ts`,
`.github/workflows/deploy.yml`, `vite.config.ts` (entries, `coi=1`), `src/sim/railway-seeds.ts`,
`src/world/railway-jump.ts`. `npm run inflight` on 10 November shows one branch, a brainstorm doc; nothing touches
these files.

## What the owner does

1. **A board link, always the same:** `https://boogle.club/?device=new`. The page makes its own run id, so the link
   can sit on the Line Map board and in a phone's bookmarks. Or **a command, when an agent wants one particular run:**
   `npm run device -- new --label "iphone 15"` prints
   `https://boogle.club/?device=dv-<26 characters>&suite=quick&label=iphone-15`; `--wait` then blocks until that run
   arrives and prints its report. `--query 'terrain=1&home=b'` appends feature flags, which is how most unshipped work
   is tested today, since it already sits on main behind a flag.
2. He opens the link. The game's own loading screen runs. Over it sits one panel: the suite's name, the build, the
   label, and a **Run** button that enables when the game is ready (`bootInteractive`). Nothing to install.
3. He taps Run, once. The panel shrinks to a strip at the top: `3 / 8 town: measuring`, a progress bar, and "keep this
   tab in front". About two minutes for `quick`.
4. The strip becomes a summary card: the device line (GPU, screen, browser), one row per scene (p50 and p95 frame ms,
   long frames, draw calls), pass or fail per scene against the frame budget, "uploaded" or "upload failed: retry",
   and the run's short code (the id's last six characters) to say to an agent.

**Which build.** boogle.club, main, in steps 1 to 4. That is the only site the repo deploys (GitHub Pages from main),
and flags cover most branch work. A branch that changes client code with no flag gets a URL in step 5: GitHub's
runners build it and the existing Pages site carries it at `https://boogle.club/preview/a/`, so the host builds
nothing. Step 5 waits for open question 1, because the owner said "no dev site" on 4 November. Serving a branch from
the Mac (`vite preview` on the LAN) is rejected: it is the busy host again, and WebGPU needs HTTPS, which a LAN
address does not have.

## What runs on the device

All of it is one lazy chunk, `src/debug/device/`, loaded by `src/features/device-test.ts` only when the address has
`device`. Sync kind: **Local** for every piece; nothing is sent to other players and no rule, op or state key is
added. There are no controls to register: the Run button is a DOM button in the panel, not a game action.

**The room.** `?device=` rewrites the address before boot so the page enters a fresh private jump room
(`?from=q6-done`, [playtest-jump-in](playtest-jump-in.md)) with `prof=1` (GPU timestamps where the browser has them).
The shared `boogle` world is never entered. `q6-done` is the bench's own seed for its heaviest poses.

**Suite `quick` (step 1), in order:**

| Part | What it records |
| --- | --- |
| Diagnostics | `navigator.gpu` adapter info, features and the limits list of `src/debug/gpu-info.ts`; preferred canvas format; the backend the game got (`gfx()`); DPR, screen and viewport; `deviceMemory`, `hardwareConcurrency`; full user agent, `maxTouchPoints`, coarse pointer; refresh rate (median of 60 animation frames before Run); `connection.effectiveType`; battery level and charging where `navigator.getBattery` exists; the graphics snapshot (`graphicsSnapshot()`, the auto detail rung, water quality) |
| Load | The boot timeline (`bootTimeline()`: files, shaders, first frame, interactive); bytes from `performance.getEntriesByType('resource')` (transfer and encoded sizes, the largest file); whether a service worker already controlled the page (a warm load, labelled so) |
| Scenes | `spawn`, `town`, `forge`, `bay`, `pier`, `head`: the bench's poses by the same names and coordinates. Per scene: a settle window, then 5 s of real frames |
| Heat check | `spawn` again at the end; the report gives the drift of p50 between the two |

**Per scene.** After the camera cut, the settle window (`warmGraphics` from `src/debug/dev/performance.ts`: frames
advancing for 2 s, 30 s at most) is itself measured: frames over 100 ms and the longest frame during it are the
scene's **compile stall** figures, with whether `renderer.info.memory.programs` rose. Then the sample: frame
intervals from the animation callback (p50, p95, p99, max, count), frames over 33 ms and over 50 ms, `longtask`
entries where `PerformanceObserver` supports them, main-thread CPU ms per frame from `prof`, GPU ms from
`hardwareTiming` where timestamp queries exist, draw calls, triangles, programs and geometries from `renderer.info`,
the resolution scaler's ratio and detail rung at the end, and JS heap where `performance.memory` exists.

**A scene passes** when it drew at least 30 frames a second of sample, the page stayed visible, and p95 is under two
refresh intervals of that device. Anything else is `fail` with the reason, or `not measured` (hidden tab, no frames):
never a silent zero.

**Honest limits, printed in every report.**

- **The railway bot cannot run on the device.** `dev/look/bots/railway.ts` is Node code that drives the page through
  Playwright's keyboard and `page.evaluate`; without the host's Playwright there is no bot. Step 4 adds a short
  in-page run instead (walk, jump, an interact press through `triggerAction`), which exercises physics, particles and
  the player camera but plays no route.
- **No thermal reading exists on the web.** The heat check is a proxy. Battery is Chromium only.
- **GPU ms is missing on Safari and iOS** (no timestamp queries there today); frame intervals stand in. The report
  writes `gpu: unavailable`, not a number.
- **Timers are coarse.** Pages cannot send the cross-origin-isolation headers `coi=1` gets from the dev server, so
  CPU times are in 0.1 ms steps (1 ms on Safari). Frame percentiles are unaffected at that grain.
- **Long tasks** are Chromium only; frames over 50 ms are the figure that exists everywhere.
- **Screenshots** (step 3) need the canvas copied in the same frame it was drawn; where that yields a blank image the
  scene says `still: unavailable`.

## How data comes back

**Steps 1 and 2 reuse `POST /playdata` unchanged.** A device run is a play session whose id is the run id and whose
card is `device`:

- The run id is `dv-` plus 26 characters of `[a-z0-9]` from `crypto.getRandomValues` (about 134 bits). It satisfies
  the server's `SESSION_RE`. It is the token: holding it lets you append to that one session file and nothing else.
- Events are flat, as the endpoint requires (24 fields, 300 characters a string): one `session` event
  (`card: 'device'`, `suite`, `build`, `label`, `device`, `browser`, `bot: true`, so `npm run playtest` and
  `npm run heartbeat` keep treating it as not a person, and a device run is never read as "the owner is mid-session");
  `dev.diag.*` events (adapter, limits in two events, screen, memory); `dev.load`; one `dev.scene` per scene, sent as
  it finishes, so a run that dies at scene 5 still delivered four; `dev.done` with the verdict counts.
- Limits are the endpoint's own: 64 kB a request, 4 MB a session, 240 requests a minute and 40 new sessions an hour
  per IP. A `quick` run is under 20 kB in about ten requests.
- Retention is playdata's: 200 MB and 2000 sessions in all, oldest first, sessions that look played last. A device
  run is pulled within minutes and the pulled copy is the record.
- Reading needs `REPORT_TOKEN` (`scripts/report-token.ts`), as `npm run playtest` does. The device never has it.

**The pull side, `npm run device` (`dev/device/cli.ts`):**

- `new [--suite quick] [--label x] [--query 'a=b'] [--wait]`: makes the id locally (no network), writes
  `.look/device/<id>/run.json` (`{ id, suite, label, query, made }`) and prints the full URL.
- `list`: the server's sessions with card `device`, newest first: short code, label, device, build, verdict, pulled or
  not.
- `pull <id or short code>` / `pull --new`: downloads the session and writes `.look/device/<id>/session.jsonl`,
  `result.json` (typed, one object) and `report.md`. `--new` pulls every run not yet in `.look/device/`.
- `baseline <id>`: marks a pulled run as the host's baseline for its suite
  (`~/.boogle/device/baseline/<suite>.json`, beside the daily perf history, so every worktree on the Mac reads it).
  The owner makes one by opening the same link in his own Chrome on the Mac when it is quiet.

**Automatic.** `new --wait` polls `GET /playdata` every 10 s for up to 30 minutes, then pulls and prints.
`npm run heartbeat` gains one line, "device runs not pulled: N", and the orchestrate skill's check-in runs
`npm run device -- pull --new`. No daemon and no launchd job: a poll is one small request.

**`report.md`** leads with a line an agent can paste: `Tested on a device: iPad (Apple GPU), Safari 26, build
bd34b181, suite quick, 6/7 scenes pass, run dv-…k3x9q2 (.look/device/<id>/report.md)`. Then the diagnostics, the load,
and one row per scene with the baseline beside it: p50 and p95 with the ratio to the Mac's, calls and triangles with
the difference (these differ only when the device's quality rung does, and the report says which rung), compile
stalls, and the heat drift. It ends with the limits above that applied to this run. A run whose id was not made by
`new` on this Mac (a `?device=new` run) is labelled "self-minted", and every report says the numbers are what the
page sent: the endpoint is public.

**Step 3 adds a small endpoint** for the one thing playdata cannot hold, a still per scene, and for runs the server
knows about in advance (see Steps).

## Safety

- **Token.** Unguessable (134 bits from the platform's CSPRNG), one per run, and worth exactly one thing: appending
  to that run. It cannot read, list, delete, enter a room or reach a save. Step 3's endpoint keeps only its SHA-256.
- **Server-side validation.** Steps 1 and 2 add no server code: `cleanBatch` already bounds and cleans every field
  and answers 400, 413, 429 or 507, never a throw. Step 3's handler follows the same shape and is tested with
  malformed input (see its tests).
- **No personal data.** The runner sends the device diagnostics above and measurements. It never reads or sends the
  player's name, saved room, localStorage, position history or anything typed; the server keeps no IP or header
  (playdata's existing rule). The label is the owner's own text, cut to 40 characters of `[a-z0-9-]`.
- **Rooms and saves.** Every scene runs in a jump room: named by the server, private, refused if it already has a
  save, deleted after three idle days, capped at 200 (`server/src/jump.ts`). The shared `boogle` world is never
  joined. The runner submits no edits in steps 1 to 3; step 4's input run acts only in its own jump room.
- **No `WORLD_NS` change**, no new op, message, state key or catalog entry.
- **The game without the flag is unchanged**: the feature file is one `URLSearchParams` check and a dynamic import.

## Design

| Piece | Sync kind | Where |
| --- | --- | --- |
| Run state (suite, scene index, results) | Local | `src/debug/device/runner.ts`, memory only |
| Panel, progress strip, summary card | Local, cosmetic | `src/debug/device/panel.ts`, `panel.css` |
| Upload | Local, one way to our server | `src/debug/device/upload.ts` (`POST /playdata` wire shape, `PlayBatch`) |
| Test room | Server (existing jump-in) | `src/boot/jump-in.ts`, unchanged |

No lockstep state, so no `src/world/rules/types.ts` entry, ops, `edits` generators, invariants or `env` facts. No
action id, pad slot, key or guide row.

## Steps

Each step leaves `npm run check` green. Risk tier follows "Fast ships": `server/` needs an independent review and a
review stamp for the ship queue; the rest ships on one green run.

- [x] **1. The quick suite on boogle.club, and the pull.** Tier: client debug chunk and tooling, no review gate.
  **Built (10 November), not yet run on a phone.** What differs from the text below: `LIMITS` moved to the pure
  `src/debug/device/limits.ts` (with the short event field names; `gpu-info.ts` imports it); a scene is two events,
  `dev.scene` and `dev.scene.cost`, because the endpoint keeps only 24 fields an event and dropped the verdict silently in
  the first run; the run page adds `notrack=1` (without it the ordinary playdata recorder uploaded a second, unmarked
  session named after a random player: the plan's P1 by another road) and `profui=0` (new, in `prof-overlay.ts`: the
  timing hooks without the overlay and its 500 ms refresh); `?device=new` adds `mint=page` so the page can say the run
  is self-minted; `--wait` and `baseline` are step 2. Runs on this Mac (headless Chromium through the look harness, a local
  server, `q6-done` jump room): 7/7 scenes, about 52 s a run, `npm run playtest` lists nothing without `--all`, one session
  per run. That proves the flow and the pull, not a device. Lazy chunk: 14.3 kB (6.4 kB gzip) JS, 1.4 kB CSS, 0.9 kB entry;
  `sw.js` lists none of it.
  - `src/debug/perf-poses.ts` (new): move `POSES` and `OPT_IN` out of `dev/look/bench.ts` unchanged, and move the
    body of bench's `PUT` plus its yaw line into `putPlayer(x, y, z, yaw)` here; `bench.ts` imports both. Verify:
    `npm run bench -- --no-load --poses spawn --seconds 1` prints a row as before.
  - `src/boot/device-entry.ts` (new) and `src/boot/index.ts`: before the `from` read, if the address has `device`,
    `await import('./device-entry.ts')`, whose `prepareDevice()` replaces `device=new` with a fresh id, and, when the
    address has no `room`, sets `from=q6-done` and `prof=1` with `history.replaceState`. A reload then finds `room`
    set (jump-in's own rewrite) and seeds nothing twice. `makeRunId()` and `RUN_ID_RE = /^dv-[a-z0-9]{26}$/` live in
    `src/debug/device/id.ts` (pure, shared with the CLI). An id that fails the pattern shows "This device link is
    damaged" on the panel and runs nothing.
  - `src/features/device-test.ts` (new, registered where `src/features/prof.ts` is): with `device` in the address,
    `background(import('../debug/device/index.ts'), 'device test')`.
  - `src/debug/device/`: `index.ts` (mounts the panel, enables Run on `bootInteractive`, starts the game the way the
    splash's "Jump in" does, then runs the suite); `suites.ts` (`SUITES.quick`: the table above as data);
    `diagnostics.ts` (reuse `src/debug/gpu-info.ts`'s limit list: export `LIMITS` there); `scene.ts`
    (`measureScene(pose)`: cut with `window.__debugCam.set` (import `src/debug/debug-cam.ts` for it, as `?debugcam=1` does) or `putPlayer`, settle with `warmGraphics`
    exported from `src/debug/dev/performance.ts`, sample with a frame-interval collector on `onFrame` plus
    `hardwareTiming(5)` inside a try, so a missing GPU timer costs only the GPU column); `stats.ts` (pure: percentiles,
    counts over a limit, `sceneVerdict`); `upload.ts` (keepalive `fetch` of a `PlayBatch`, text/plain, three retries
    with backoff, then the card's "retry" button; nothing when `VITE_BOOGLE_SERVER` is unset); `panel.ts` and
    `panel.css`.
  - `dev/device/cli.ts`, `dev/device/read.ts` (pure: session lines to `DeviceResult`, tolerant of missing and
    repeated events), `dev/device/report.ts` (pure: `DeviceResult` and an optional baseline to markdown), and
    `"device": "node dev/device/cli.ts"` in package.json. Download through `dev/playtest/fetch.ts`'s `playdata()`.
    This step ships `new`, `list` and `pull`.
  - Tests (pure logic, allowed by the test diet as validation and round-trip):
    `test/device-stats.test.ts` (percentiles on known arrays, an empty sample is `not measured`, the verdict's three
    branches), `test/device-read.test.ts` (a recorded session fixture gives the expected result; a session cut off
    after scene 3 gives three scenes and `incomplete`; a repeated batch number is dropped; junk events are ignored),
    `test/device-id.test.ts` (pattern, length, 1000 ids distinct).
  - Docs: a row in `docs/agents/tools.md`'s table ("Measure on a real device"); `dev/device/README.md` with the
    event kinds.
  - Verify: `npm run look -- --query 'device=new' --question "does the device panel show over the splash and run?"`
    for the panel still and the summary card (the look harness is an automated browser on the Mac: it proves the
    flow, not a device); then the owner's phone: open the link, tap Run, `npm run device -- pull --new`, read
    `report.md`. `npm run playtest` must not list the run without `--all`.
  - **Done when** the owner's phone run produces a `report.md` with diagnostics, load and seven scene rows, and the
    shared world's save is untouched (`npm run server` shows no new write to it).
- [x] **2. Baseline, comparison and the automatic pull.** Tier: tooling only. **Built (10 November), not yet run with a
  second device.** What differs from the text below: `baseline` takes a pulled run from disk (no token needed) and refuses
  an unfinished run or one with no passing scene; the pure wait and pull-planning logic is `dev/device/runs.ts` (fake-clock
  tests), the baseline files are `dev/device/baseline.ts`; `--wait` ends early on a run that went quiet for 10 minutes and
  gives up after six failed polls; `pull --new` leaves a run still sending, re-pulls a cut-off copy only when the server has
  more, and carries on past one bad run; `npm run device -- waiting` is the heartbeat's line (no token or server error
  prints "unknown", never fails the report). The paste line is unchanged: it already named run, device and build.
  - `dev/device/cli.ts`: `baseline <id>`, `new --wait`, `pull --new`; `dev/device/report.ts` adds the baseline
    columns and ratios, and, when `~/.boogle/daily/perf/history.jsonl` has an entry for the same commit, a line
    comparing draw calls and triangles per pose with the bench's exact counts.
  - `dev/heartbeat.sh`: one line, device runs on the server not yet pulled. `.claude/skills/orchestrate/SKILL.md`:
    the check-in runs `npm run device -- pull --new`. `docs/agents/owner-calls.md`, "The Mac and mobile are the
    targets": add that a report cites the newest device run for the area it changed when one exists, and says "not
    tested on a device" only when none does (the owner's call of 10 November, quoted).
  - Tests: `test/device-report.test.ts` (ratios, a scene missing from the baseline prints a dash, a different
    quality rung is named, the paste line's wording).
  - **Done when** `npm run device -- new --wait` on the Mac prints a report with a baseline column after the owner
    runs the link on a second device.
- [ ] **3. Registered runs and stills: a small endpoint.** Tier: **`server/`, independent review and review stamp
  required**; run `npm run check:full`.
  - `server/src/device.ts` (new), wired in `server/src/server.ts` like `addPlaydata`:
    `POST /device/runs` (Bearer `REPORT_TOKEN`; body `{ id, suite, label }`; stores
    `DATA_DIR/device/<id>/run.json` with `sha256(id)`, `made` and `expires` = 7 days);
    `POST /device/runs/:id/still/:scene` (the run id is the credential; `scene` matches `/^[a-z0-9-]{1,24}$/`; body
    `image/jpeg` raw, 400 kB at most, checked for the JPEG magic bytes and stored as opaque bytes, never decoded on
    the server; 12 stills a run; refused after `expires`. An id the server has not seen is registered by its first valid
    still (a self-minted `?device=new` run, owner answer to question 4), under the same hard caps below: expiry counts
    from that still, and a malformed id or scene is 400 and writes nothing);
    `GET /device/runs/:id/stills` and `GET /device/runs/:id/still/:scene` (Bearer `REPORT_TOKEN`, served as
    `application/octet-stream`, `no-store`). Caps: 50 runs, 20 MB in all, 128 MiB free reserve as reviews keep;
    runs past 30 days are deleted on the first write of a day. Rate limit 30 a minute per IP. New config keys in
    `loadConfig` with `||` fallbacks. It imports nothing from `src/`, so the image lists do not change; confirm with
    `test/server-image.test.ts`.
  - `src/debug/device/still.ts`: in the frame the scene's sample ends, `drawImage` the game canvas into a 960 px wide
    2D canvas, `toBlob('image/jpeg', 0.7)`, upload; a blank or failed copy records `still: unavailable`. Stills
    upload for every run, made by `new` (which now registers it) or self-minted (`?device=new`; the owner's answer to
    question 4); steps 1 and 2 send numbers only.
  - `dev/device/cli.ts`: `new` registers the run (and says so plainly if the server refuses; the link still works
    for numbers); `pull` saves `<scene>.jpg` beside the report and links them.
  - Tests: `server/test/device.test.ts`: register needs the token (401, and 404 with no `REPORT_TOKEN`); a still for
    an expired id is 404 and a malformed id or scene is 400, both writing nothing; an unseen id registers on its first still and
    the run, byte and rate caps still hold; an oversized body is 413; a body that is
    not a JPEG is 400; the thirteenth still is 507; the byte and run caps hold; path characters in `id` or `scene`
    never reach `fs`; a truncated body and a non-object JSON body answer 400 without a throw; the reads need the
    token.
  - **Done when** a phone run made with `new` pulls with six stills and `server/test/device.test.ts` passes in CI.
- [ ] **4. More seeds and a short input run.** Tier: client debug chunk; no review gate.
  - `suites.ts`: `SUITES.full` adds the stages `awake` and `crossing-done`, each with the `spawn`, `town` and
    `forge` scenes. Changing seed is a page navigation (`?device=<id>&from=<stage>&step=<n>`), so the runner keeps
    its finished scene names in `sessionStorage` under the run id and resumes; results are already on the server per
    scene. Three jump-ins a run against the 30 an address a day the server allows: the panel says so when a 429
    comes back, with `refusalLine`'s wording.
  - `src/debug/device/drive.ts`: 20 s at the spawn with the player camera: walk a square, two jumps, one interact
    press. Presses go through `triggerAction`; movement needs one new seam in the input layer, a synthetic stick
    source (`setSyntheticStick(x, y)` in `src/player/input.ts`, cleared on stop), because lint keeps key and stick
    reads inside that layer. The scene records the same frame figures plus metres walked, so a stuck run is visible.
  - Verify: `npm run look -- --query 'device=new&suite=full'` to the summary card; one phone run.
  - **Done when** a `full` run on a phone reports three seeds and the input scene, and a reload mid-run resumes at
    the next scene.
- [ ] **5. A branch on a URL, built by GitHub (waits for open question 1).** Tier: CI and deploy; a reviewer reads
  the workflow diff, since a broken deploy takes the site down.
  - `.github/workflows/preview.yml` (new, `workflow_dispatch` with `ref`): refuses a ref whose `server/`,
    `src/world/`, `src/sim/`, `src/net/ids.ts` or `src/net/ws-wire.ts` differ from main; builds with
    `BASE=/preview/a/`, `BOOGLE_SW=off` and `VITE_BUILD=<sha>`; uploads the zipped `dist` as the asset of one
    prerelease tagged `preview-a` (replacing the last); dispatches `deploy.yml`.
  - `.github/workflows/deploy.yml`: after `npm run build`, a step that downloads the `preview-a` asset if the
    release exists and unpacks it to `dist/preview/a/`; it never fails the deploy (`|| true`, as the video share
    pages step does).
  - `dev/device/cli.ts`: `new --ref <branch>` dispatches `preview.yml` with `gh`, waits for the deploy, and prints
    `https://boogle.club/preview/a/?device=…`. One slot: a second `--ref` replaces the first, and `new` says which
    ref the slot holds.
  - Verify on the live site: main's page and service worker behave as before with a preview present
    (`npm run daily -- scenarios --only smoke`); the preview page reports the branch's build id in its panel.
  - **Done when** a client-only branch is measured on a phone without a build on the Mac.

## Level findings

None: the plan places nothing in the world. The scenes are camera poses and player teleports inside a private test
room, at coordinates the bench already uses. `npm run level-check` was not run for this plan.

## Calls

**Decided (owner).**

- Device tests run remotely from a unique URL, upload on their own and are pulled automatically (10 November, quoted
  above).
- No second paid server (4 November); main deploys straight to boogle.club (30 October).
- Perf on demand, focused tests, nothing scheduled (10 November): a device run happens when the owner taps Run.

**Default (existing rules applied).**

- A test room is a jump room; the shared world is never seeded or entered by a tool.
- Uploads reuse playdata's bounds and its token-gated reads; device runs are marked `bot: true` so no reader takes
  one for a play session.
- Debug code is a lazy chunk behind a query flag, as `prof`, `debugcam` and `gpuinfo` are.

**New (this plan's; to log in `docs/agent-calls.md` when step 1 ships).**

- Steps 1 and 2 add no endpoint: a device run is a playdata session with card `device`, and the run id is the token.
- The device runs with its own adaptive resolution and quality, not `?dpr=fixed`, and the report names the rung.
- A scene passes on p95 under two refresh intervals of that device; the Mac's `PERF_POLICY` budgets are not applied
  to other devices.
- The baseline is a device run of the same suite on the Mac in the owner's browser, not `npm run bench`'s numbers,
  whose page and resolution differ.
- `?device=new` (a fixed board link that mints its own id) exists beside `npm run device -- new`.

## Open questions

1. **Branch previews inside boogle.club (step 5)?** Recommended: **not yet.** Ship steps 1 to 4, use `--query` flags
   for branch work for a week, and build step 5 only if a client change with no flag needed a device. It reopens the
   4 November "no dev site" call, shares main's origin (so its localStorage), and touches the deploy.
   **Answer (owner, 10 November):** "If it keeps things cleaner?" Not a yes. The orchestrator's reply: it does not keep
   things cleaner yet (it adds risk to the only deploy), so step 5 stays deferred and this question stays open.
2. **May the report replace "not tested on a device" in agent reports (step 2's owner-calls edit)?** Recommended:
   **yes**, citing the run's short code, device and build, and only for the area the suite covers; a change outside
   the suite's scenes still says "not tested on a device".
   **Answer (owner, 10 November):** "Yes".
3. **Is the full user agent string acceptable in the stored diagnostics?** Recommended: **yes.** Play sessions keep
   only a coarse browser name, but the exact OS and browser version is the point of a device report, and the reads
   are token-gated.
   **Answer (owner, 10 November):** "Yes". (Step 1 stores it in the session's `ua` field.)
4. **Should a `?device=new` run (self-minted, no command first) be allowed to upload stills in step 3?**
   Recommended: **no.** Numbers only, so the public endpoint never accepts an image for a run the owner did not
   mint.
   **Answer (owner, 10 November):** "Yes but not needed for initial version". Against the recommendation: step 3 lets a
   self-minted run upload stills too, under the same hard caps and the independent review; step 1 stays numbers only.
5. **Pass line: two refresh intervals at p95?** Recommended: **yes to start**, as a readable line on the card; it
   is one constant in `stats.ts`, and the first week of runs on the iPad and a phone should set the real one.
   **Answer (owner, 10 November):** "Yes".

## Risks

**P1**

- **A device run read as a live play session** would hold a `WORLD_NS` release ("don't ship mid-session"). The
  `bot: true` mark and step 1's check that `npm run playtest` hides the run cover it; the reviewer of step 1 confirms
  `dev/heartbeat.sh` reads the same field.
- **Step 3 is a public upload path on the server that hosts every room.** Opaque bytes only, hard caps before any
  write, the free-space reserve, no decode, no shared lock with rooms beyond `withLock`'s own key, and the
  malformed-input tests listed. Independent review required; it must not ship in the same batch as other server work.
- **Step 5 can break the only deploy.** The preview step never fails the build and runs after it; verify with the
  live smoke before relying on it.

**P2**

- **Published numbers look more exact than they are.** One 5 s sample on a phone that is warm, charging or
  backgrounded varies widely. The report prints the sample size, the heat drift and the limits, and never ranks
  devices; a claim of a regression needs two runs on the same device.
- **Self-reported data.** Anyone can post a `device` session; reports say what was sent, mark self-minted runs, and
  the paste line carries the run id so a reader can check it.
- **Jump-in limits** (30 an address a day, 200 test rooms): heavy use of `full` on one network hits them; the panel
  says so, and the run keeps what it measured.
- **Safari differences**: the canvas copy, `longtask`, GPU timers and battery are missing or untested there. Each is
  recorded as unavailable; the first iPad run is the test of that path.
- **`bench.ts` is a hotspot** for perf work; step 1's move of `POSES` is a pure move, landed first and alone in the
  commit so a parallel branch rebases cheaply.
- **Preview and main share an origin** (step 5): a branch that changes a localStorage key's shape writes where main
  reads. Dev-phase rules accept this; the preview panel says which build is running.

**P3**

- The panel overlaps the splash on small screens; one look still at 375 px wide in step 1.
- Playdata's eviction removes unplayed sessions first, so a device run left unpulled for weeks can go. The
  heartbeat line keeps that from happening quietly.
- The debug chunk grows the build's lazy files; `npm run counts -- --build-only` confirms the first-load list is
  unchanged.
