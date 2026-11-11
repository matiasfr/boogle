> **Status: planned (2026-11-10).** Six steps after a no-code step 0, each ships alone. Tooling only: nothing in the
> game changes, no `WORLD_NS` bump, no wire change. One additive `server/` config key (step 2). Base: `origin/main` at
> `f9ecb4749` or later. The desktop runs Windows 11, so the plan is Windows first; Linux is a note.

# Remote runner: a second machine for browser checks

## Goal

A desktop on the owner's local network (Windows 11, i9-10900K with 10 cores and 20 threads, 64 GB, RTX 3080; git,
Node and Python installed, no Docker, no `gh`) becomes a second place to run the browser harness. Agents on the Mac
send it a commit over ssh, it installs, serves and renders that commit on its own GPU, and the stills, video, JSON and
logs come back under the same `.look/` paths, so reports and reviewers read them unchanged.

Owner, 10 November 2026: "If you had access to another capable machine to ssh into on the local network for running
tests, would that speed up development?" then "its a desktop with a rtx 3080 and a 12 core intel chip".

In the order the owner's problem ranks them:

1. **Quiet-machine timing evidence.** `npm run bench`, `cold-launch`, `counts`, `perf` and `hitches` on a machine no
   agent is rendering on. On the Mac (loads of 7 to 20) these keep coming back "not measured".
2. **A second lane** for looks, bot segments and scenarios, so one branch's proof does not queue behind another's.
3. **The weekly and on-command jobs** (`npm run daily`) off the owner's working Mac; issue #916 fails from load.

**Principles served.** DESIGN.md "How we work" (evidence before shipping, from more than one kind of machine) and
**Small and readable** (one folder, `dev/remote/`; the harness itself gains one flag helper). **Bends:** the owner
call "The Mac and mobile are the targets" (judge looks and budgets on the Mac). Open questions 2 and 3 ask how far
runner evidence may stand in.

**Sources.** Owner calls "The Mac and mobile are the targets", "Measure performance daily", "Weekly or on command;
focused tests, not full runs", "One nightly load; perf on demand". The device plan of the same day
([remote-device-tests](remote-device-tests.md)), whose ideas this reuses: a run is identified by an id, results come
back on their own into `.look/`, a baseline belongs to one machine, the heartbeat gets one line, and an unreachable or
unmeasured result is said in words, never a silent zero.

**Research.** [performance.md](../research/performance.md): this plan keeps its method (fixed poses, a settled scene,
5 s of real frames, 1280x800 at DPR 2 with `?dpr=fixed`, counts exact and times noisy) and departs in one place: the
numbers come from a second machine with its own history. [webgpu-on-ipad.md](../research/webgpu-on-ipad.md)
recommendation 1 (read the adapter where the game runs) is the start-of-job GPU proof below.
[deterministic-sim-at-scale.md](../research/deterministic-sim-at-scale.md) (make desyncs diagnosable; a cheap per-tick
check) is what step 6's cross-machine hash comparison reuses. Nothing else relevant.

**What was read.** `docs/agents/tools.md`, `tests.md`, `verification.md`, `test-details/bot-segments.md`,
`test-details/gpu.md` and `performance.md` (top); `dev/look/lib.ts` (`startStack`, `launch`), `dev/look/bot-queue.ts`
and `verdict.ts` (platform calls only), `dev/look/bench.ts` and `dev/cold-launch.ts` (headers, servers, launch),
`dev/daily/README.md` and `dev/daily/perf.ts` (`PERF_POLICY`), `dev/heartbeat.sh`, `dev/device/README.md`,
`server/src/server.ts` (`listen`), `package.json`'s scripts. `npm run inflight` on 10 November: nothing unmerged
touches these files. `dev/codex/` was not needed: there is no broker here, only ssh. Nothing was run on the desktop
for this plan.

## What exists today (the facts the design rests on)

- **Stack.** `startStack` (`dev/look/lib.ts`) spawns the Vite **dev server** on a free port with `--host 127.0.0.1`
  and runs the game server in-process (or as a child when warped), its saves in a temp directory. `bench` without
  `--no-load` and `cold-launch` also make a **production build** (`vite preview`, or a local HTTP/2 TLS server whose
  certificate comes from the `openssl` command).
- **Browser.** Playwright 1.64.1's Chromium. `launch()` always passes `--enable-unsafe-webgpu --ignore-gpu-blocklist
  --enable-precise-memory-info`; on a Mac it adds `--use-angle=metal`; **on every other platform it forces
  SwiftShader** (the CI path) unless `hardware: true`, which only `bench` uses and which opens a visible window.
  `cold-launch.ts` has its own `chromium.launch` with `--use-angle=metal` written in. So today the desktop would
  render most runs in software despite its card: step 1 changes that behind an environment variable.
- **Queue.** `acquireBotSlot()` inside `launch()` uses `/tmp/boogle-bots-<uid>` and `os.loadavg()`.
- **Output.** Verdicts under `.look/playthrough/<name>/verdict.json`, `<out>/<label>-verdict.json`,
  `.look/scenarios/verdict.json`, stamped with commit, tree, dirty count, loads and the command
  (`dev/look/verdict.ts`); bench history in `~/.boogle/daily/perf/history.jsonl`.
- **A finding.** The harness's game server listens on **every interface**: `server.listen(port, ...)` in
  `server/src/server.ts` names no host, and the stack runs it with `SERVER_ROOMS: '*'` and the rate limits lifted.
  Only Vite is bound to localhost. This is true on the Mac today; step 2 fixes it for both machines.
- **The tools have only ever run on macOS and on Linux CI.** "Where Windows will break" below lists what to expect.

## Two ways to drive the desktop

A Claude Code session of the owner's already runs on the desktop and can exchange messages with the orchestrator on
the Mac. So there are two roads.

| | (a) ssh from the Mac's tools | (b) hand a job to the Claude session there |
| --- | --- | --- |
| Exists today | No: needs the owner's one-time setup below | Yes |
| Cost per job | A push, a pull, no model usage | Model usage on every job, and an orchestrator turn to ask and to read |
| Scriptable from `npm run`, the bot queue, `checks-for --run`, launchd | Yes | No |
| Results under the Mac's `.look/` | Yes, by the tool | Only if someone copies them; a message carries words, not stills |
| Runs in | A dedicated unprivileged account with no credentials | The owner's own signed-in account |
| Has a desktop and the GPU for certain | Not confirmed (see WebGPU below) | Yes: it is a signed-in session |

**Recommendation: build (a); it is the only one that makes a second lane automatic.** A lane that needs a message
and a model turn per look is slower than the queue it replaces. Use **(b) now, for what only it can do**:

- **Find the Windows breaks.** It is already running the unit, server and net tests on a clean checkout of main and
  trying `npm run counts` and `npm run cold-launch`. Its list of Windows-only failures is the input to step 1; it can
  fix them on a branch there and push for review, which is faster than guessing from the Mac.
- **Run step 1's GPU probe in a real desktop session** (`npm run remote -- doctor --local`), which gives the
  known-good adapter reading the ssh result is compared against.
- **Check the owner's setup** read-only (is `sshd` running, is the key in place, is the firewall rule scoped) and
  say what is missing. It does not make accounts or change system settings.
- **One-off timing by message** until step 3 lands, when a perf question cannot wait: `npm run bench` there, numbers
  pasted back, labelled "by message, not pulled".

After step 2 the session is for diagnosing the runner when a job fails for a Windows reason, not for running jobs.

## Design

No game state, so no sync kind, rule, op, state key, action or control. Everything is tooling in `dev/remote/`, plus
additive fields in verdicts.

### Configuration, and what never enters the repo

- The Mac reads **`~/.boogle/remote.json`** (override: `BOOGLE_REMOTE_CONFIG`). It sits beside `~/.boogle/daily`,
  outside every checkout, so each agent worktree sees it and there is nothing to commit by accident:
  `{ "host": "<ssh alias>", "os": "windows", "label": "runner", "dir": "<base folder on the runner>",
  "default": "mac" | "auto" }`.
- `host` is an alias in the owner's `~/.ssh/config`, which holds the address, the user and the key path. Source
  code, docs, verdicts and commit bodies carry only `label`; this plan does not name the machine either.
  `.gitignore` gains `.boogle-remote.json` as a guard, and `npm run registry` gains one check: no tracked file under
  `dev/remote/` contains an `@host`, an IP address or `IdentityFile`.
- Every ssh call uses `BatchMode=yes` (never prompts), `StrictHostKeyChecking=yes` (the owner accepted the host key
  once, by hand), `ConnectTimeout=4` and connection sharing (`ControlMaster=auto`, `ControlPersist=60`), so a job's
  several calls cost one handshake.
- The runner account holds **no credentials**: no GitHub login (`gh` stays uninstalled for it), no `REPORT_TOKEN`,
  no `.env`, no `TUNE_CONTROLLER_KEY`, no Claude or Codex login. The remote command gets an allow-listed environment
  only (`BOOGLE_BOT_*`, `LOOK_*`, `BOOGLE_QUERY`). Anything that needs GitHub (issue comments, ships) stays on the
  Mac.

### How a job gets there: a git ref, not rsync

`git push ssh://<alias>/<dir>/repo.git <sha>:refs/jobs/<job id>` to a bare repository on the runner. Chosen over
rsync because git sends exactly the tracked tree (an ignored `.env` cannot travel), deduplicates, exists on the
desktop already (rsync does not ship with Windows) and gives the verdict a real commit to name.

- A clean worktree sends `HEAD`.
- A dirty worktree sends a **snapshot commit** made without touching the index, the stash or the branch:
  `GIT_INDEX_FILE=<temp> git add -A`, `git write-tree`, `git commit-tree -p HEAD`. `.gitignore` applies, so ignored
  files never go. Untracked, unignored files are listed before sending, and the push is refused if any matches
  `.env*`, `*.pem`, `*.key`, `id_*` or `*secret*`. The job record keeps `snapshotOf: <HEAD>` and the dirty count, so
  the verdict never claims a commit that does not exist on a branch.
- A branch older than step 1 has no `dev/remote/job.ts`: the CLI says "rebase onto main first" and runs nothing.

### What runs there

The runner keeps `<dir>/repo.git` and persistent checkouts `<dir>/slot/1..N` (one in step 1, three from step 4),
each with `core.autocrlf false` and `core.longpaths true`. `dev/remote/job.ts`, run on the runner from the job's own
checkout:

1. Takes a slot (a `mkdir` lock holding a pid file; a dead pid's lock is reclaimed, as the bot queue does).
2. `git checkout --detach <sha>` in the slot, empties its `.look/`.
3. Runs `npm ci` (its `postinstall` does `server/`) only when `package-lock.json`'s hash differs from the slot's last
   install, and `npx playwright install chromium` only when the Playwright version changed. No symlinked
   `node_modules` (owner rule): each slot has its own.
4. **Proves the GPU** (next section) and writes the result into `.look/remote/<job id>/job.json`.
5. Runs the ordinary npm script (`look`, `playthrough`, `scenario`, `bench`, `cold-launch`, `counts`, `perf`) with
   `LOOK_GPU=hardware` and `BOOGLE_MACHINE=<label>`. The script starts its own Vite, game server and browser exactly
   as on the Mac, all on the runner's `127.0.0.1`. The runner's own bot queue gates its browsers.
6. Exits with the script's exit code. Output streams back over the ssh call as it happens.

### How results come back

`ssh <alias> tar -cf - -C <slot> .look | tar -xf - -C <local worktree>` (Windows 10 and later ship `tar`). Because
the slot's `.look/` was emptied first, every file in it belongs to this job, and it lands at the path the same
command would have written locally: `.look/playthrough/<name>/verdict.json`, `<out>/<label>-verdict.json`,
`.look/scenarios/verdict.json`, `.look/cold-launch/<label>/summary.json`, stills and `.webm` beside them. The pull
runs on failure and on timeout too. Verdicts gain additive fields (`dev/look/verdict.ts`): `machine` (the label, or
`mac`), `gpu` (`vendor`, `architecture`, `description`, `backend`, `driver`, `fallback`), `timingGrade` and, when a
job fell back, `fellBack: "<reason>"`. `report.txt`'s one-line stamp gains `on runner (NVIDIA RTX 3080, D3D12)`.

### WebGPU on that hardware

**Windows, the plan.** Chrome's WebGPU there is Dawn on **Direct3D 12**, on by default; no backend flag is needed.
`gpuArgs()` (`dev/look/gpu-args.ts`, new, used by `launch()` and `cold-launch.ts`) adds nothing on Windows beyond
the three common flags and never the SwiftShader ones when `LOOK_GPU=hardware`. Unset, every platform keeps today's
behaviour, so CI and the Mac do not change.

- **Started over ssh.** The process runs in Windows' services session: no desktop, no window. Whether a headless
  Chromium there is handed the RTX 3080 or Microsoft's software adapter is **not confirmed**; step 1 answers it.
- **A visible window** (what `bench` opens, for presented-frame intervals) cannot be opened from ssh at all. It
  needs the runner user signed in at the console, and the job started inside that session by a scheduled task the
  owner registers once ("run only when the user is logged on"), which the ssh side triggers with `schtasks /run`.
  No listening socket is involved.
- **Machine load.** `os.loadavg()` is always zero on Windows: the runner's quiet check and its queue's load gate
  sample CPU use from `os.cpus()` over 5 s instead.

**Linux, a note only.** Dawn on Vulkan with NVIDIA's driver: `--enable-features=Vulkan --use-angle=vulkan`, plus
`--disable-vulkan-surface` with no display; a window needs an X session or Xvfb (under Xvfb frames are copied, not
presented). It would be the simpler port, because the harness already runs on Linux in CI, but the machine is not
being reinstalled for this, and Windows with D3D12 is what Windows players run.

**WSL2: rejected.** It would spare the Windows port, but it does not reach the real GPU the way a player's browser
does: WSL's graphics are Direct3D 12 passed through a virtual device, with Vulkan provided by a translation layer,
not NVIDIA's driver. A browser there gets a translated or software adapter, so timing would be evidence of neither
Windows nor Linux. Git for Windows' bash gives the scripts a shell without it.

**The proof, at the start of every job and in `doctor`** (`dev/remote/gpu-probe.ts`). It opens a page on the slot's
own `127.0.0.1` (WebGPU needs a secure context), asks `navigator.gpu.requestAdapter({ powerPreference:
'high-performance' })` and reads `adapter.info`. `classifyAdapter()` (pure, unit tested) answers `hardware` only when
all of these hold: an adapter came back; neither `adapter.info.isFallbackAdapter` nor the older
`adapter.isFallbackAdapter` is true; `vendor` is `nvidia`; nothing in `architecture`, `device` or `description`
matches `swiftshader|llvmpipe|lavapipe|basic render|software|warp`; the `timestamp-query` feature is present. It
cross-checks outside the browser: `nvidia-smi` lists the card and its driver version, and a second reading during a
2 s render shows the browser's process on the GPU. Because the ssh-started case is unconfirmed, the probe tries a
**ladder** and records which rung worked: Playwright's headless shell, then full Chromium headless
(`channel: 'chromium'`), then a visible window through the scheduled task if one is registered.

Two grades follow, and a job that asks for more than it has is refused in words:

- **Render cost** (CPU ms and GPU timestamp ms per frame, counts, load times): any rung with a hardware adapter, on a
  quiet machine.
- **Pacing** (presented interval, long frames, `hitches`): a visible window on a real display or dummy plug.
- Otherwise `timingGrade: false`. `bench`, `perf`, `hitches` and `cold-launch` then exit with `not measured: software
  adapter (<description>)` or `not measured: runner busy (<what>)` and write **no** history line. Looks, scenarios
  and playthroughs still run and say `gpu: software` in the verdict.

**Quiet** on the runner: the slot lock held exclusively, CPU use under 15 % over 5 s, and `nvidia-smi` showing GPU
use under 10 % with no process beyond the desktop's own. The owner playing a game on it is "runner busy", not a slow
measurement.

### Where Windows will break, and the smallest set a runner needs

The runner needs only: `git` receiving a push, `npm ci`, and the scripts `look`, `playthrough`, `scenario`, `bench`,
`cold-launch`, `counts`, `perf` (all `node dev/...ts`). It does **not** need, and the plan does not port: `ship`,
`ship-branch`, `ship-queue`, `heartbeat` (all bash, with `sed`, `stat -f`, `/tmp` locks and `gh`), `daily` (launchd,
`caffeinate`, `ps -A`, `gh`, Codex), the git hooks, `device`, `playtest`, `inflight`, `patch`, `boot-time` (`open -a
Safari`). Those stay on the Mac.

Two settings remove most of the rest without code: ssh's default shell and npm's `script-shell` both set to Git for
Windows' bash, so remote commands and `package.json` scripts (`... || true`, `bash ...`) behave as on the Mac, and
`openssl` and `tar` are on the path.

Expected breaks in what the runner does need (found by reading, not by running; the session on the desktop's
report replaces this list):

| Where | What | Fix |
| --- | --- | --- |
| `dev/scenarios/run.ts:100` | `await import(path.join(...))`: an absolute `C:\` path is not a valid import specifier | `pathToFileURL(...).href`, as `bench.ts` and `shots.ts` already do; grep the harness for the same shape |
| `dev/look/lib.ts` `launch()` | Forces SwiftShader off the Mac | `gpu-args.ts`, step 1 |
| `dev/cold-launch.ts` | `--use-angle=metal` written in; needs `openssl` | `gpu-args.ts`; Git's `openssl` via bash |
| `dev/look/bot-queue.ts` | `/tmp/boogle-bots-...` (becomes a folder at the drive root, if it can be made at all); `os.loadavg()` zero, so the load gate never holds | `os.tmpdir()` on `win32` only (the Mac's path must not move: older checkouts share it); CPU sample |
| `dev/look/verdict.ts`, `bench.ts` | `loadAtStart`, `loadAtEnd`, `underLoad` read zero: a busy run looks quiet | The CPU sample on `win32`, labelled `cpu` not `load` |
| Every `proc.kill('SIGTERM')` and the verdict's signal handlers | On Windows a kill is immediate and does not reach children; `SIGTERM` handlers never run, so a stopped run stays `running` with a dead pid (already read as "did not finish") and can leave Vite or Chromium behind | The job wall kills the tree with `taskkill /T /F`; `remote -- reap` |
| `dev/look/lib.ts` video, `asset-motion.ts` | `ffmpeg` must be on the path | Owner installs it |
| `dev/look/shots.ts:125` | `ps -A` for the load note | Skipped on `win32` (it already tolerates a sandbox without `ps`); look-development stays on the Mac anyway |
| Git checkout | `core.autocrlf` turns line endings to CRLF: source fingerprints, format checks and shell scripts change | `core.autocrlf false` in the runner's repository; `.gitattributes` is respected |
| Git checkout | The `.agents/skills` symbolic link becomes a text file | Harmless to the runner |
| `npm ci` | The lock's optional native packages for `win32-x64` (Rolldown, esbuild, Rapier's tooling) must be present; long paths under `node_modules`; Defender scanning every file | `tools.md` says other platforms' entries are kept: the first install proves it; `core.longpaths`; an optional Defender exclusion for `<dir>` (owner) |
| Unit, server and net tests | Path separators in assertions and snapshots, `/tmp` literals, case-insensitive file names | Not needed by the runner; fix only what the session reports and a job trips on |

### A different machine: its own baselines

This is a different GPU, driver, operating system and CPU architecture from the M1 Max the bench history is on and
from the iPhones and iPads players use. So:

- Runner history is its own file, `~/.boogle/daily/perf/history-<label>.jsonl` on the Mac (written after the pull),
  each line carrying adapter, backend, driver, browser version and grade. `compare()` (`dev/daily/perf.ts`) refuses
  to mix files, and a **driver or browser version change starts a new baseline** (the next three valid runs), said
  in the report.
- Every number is printed with its machine: "runner (RTX 3080, D3D12): town 3.1 ms CPU, 2.4 ms GPU". No report puts a
  runner number beside a Mac number as a ratio.
- What runner numbers are evidence of: **a change's relative cost** (before and after, same machine, same day), and
  exact counts. What they are not: whether the game fits the frame budget on the target (the Mac and mobile). A 3080
  is several times the M1 Max's GPU, so a regression that matters on an iPad can be invisible here; the bench's
  phone profile (`--size 375x812 --query 'q=mobile&dev=1&graphics=msaa:false'`) does not change that.
- **New coverage:** it is the first Windows NVIDIA player configuration anything in the repo has rendered on, and
  D3D12 is the common desktop-player path. Step 1's still and every `gfx errors` line from it are findings about
  that player.

### Determinism and lockstep across machines

- **Already covered:** CI runs the unit tests on x64 Linux and the Mac is arm64, so the Node lockstep tests already
  cross architectures. The session on the desktop is adding x64 Windows by hand today.
- **Free with step 2:** `npm run remote -- run scenario world-inputs` and a two-player playthrough, both clients on
  the runner, are the existing hash checks on x64 Windows and a second GPU.
- **One client on each machine** (step 6) is **moderately cheap, about a day and a half**, with no change to the
  game or the bot: the harness and the stack stay on the Mac as today; `ssh -R` gives the runner's `127.0.0.1` the
  Mac's Vite, game-server and warp-clock ports; the runner starts a Playwright browser server bound to `127.0.0.1`
  and `ssh -L` brings its endpoint to the Mac; `launch()` returns that browser for player 2
  (`chromium.connect`). Both pages open the same `http://127.0.0.1:<port>/`, a secure context on both sides.
  `playthrough --players 2` then passes or fails on its existing rule: mirrored railway hashes agree at every server
  step both sampled.
- **What it can and cannot find.** Both clients are Chromium, so the JS engine and its math are the same; the lockstep
  rule (only `+ - * /` and `Math.sqrt`) already removes the known sources. It would catch state that depends on frame
  rate, timing, viewport or GPU, and ordering bugs that only show when one peer is much faster than the other. It
  does **not** cover Safari against Chrome, which is the real engine gap. Worth having, not worth doing first.

### Two lanes

`npm run remote -- run <script> [args]` asks for the runner by name (steps 2 and 3). From step 4,
`BOOGLE_LANE=auto|mac|runner` (default from `remote.json`'s `default`, shipped as `mac`) lets `look`, `playthrough`,
`scenario`, `bench`, `cold-launch`, `perf`, `counts` and `checks-for --run` choose through `pickLane()`
(`dev/remote/lanes.ts`, pure, unit tested):

| Job | Lane under `auto` | Why |
| --- | --- | --- |
| `bench`, `perf`, `hitches`, `cold-launch`, any look that measures time (`--curves`, `--real`) | Runner, only when it is `hardware` and quiet; otherwise the Mac's own quiet gate | Goal 1. Timing never runs on a shared lane |
| `counts` | Either: whichever is free | Exact on any machine |
| `playthrough` (every length), `--players 2`, scenarios, the daily jobs | Runner | Long exclusive jobs are what blocks the Mac's queue |
| A plain look still | The Mac when its queue is empty; else the runner | A round trip costs a push and a pull, roughly 5 to 15 s |
| Lighting, colour and look-development captures (`shots`, `--reuse`, the lighting wedge), `npm run session`, broker runs, audio takes | Mac always | The owner judges looks on the Mac; sessions are sub-second and interactive |

**When the runner is off or unreachable** (ssh fails within 4 s, the doctor's cached result is not `hardware` for a
timing job, or the slot wait passes 20 minutes): the job runs on the Mac through the ordinary queue, prints
`runner unreachable (<reason>): ran on the Mac` first, and stamps `fellBack` in the verdict and `report.txt`.
`--no-fallback` exits 7 instead. A timing job that falls back is still subject to the Mac's quiet rule, so it may
honestly end "not measured".

**Heartbeat.** One section after "Bot queue", from `node dev/remote/cli.ts status` (one ssh call, 4 s limit, never
fails the report):

```
## Runner lane
runner: up, windows, RTX 3080 D3D12 hardware (checked 14:02), 1 running, 2 waiting
running 6m playthrough --to T2 --players 2 [plan/x]
```

or `runner: unreachable (timed out); browser jobs fall back to the Mac`, or `runner: not configured`.

### The daily and weekly jobs

The Mac's launchd still starts `npm run daily -- scenarios` on Sundays, because only the Mac may talk to GitHub. With
a runner configured the job pushes `origin/main`'s commit, the runner plays the list, the evidence is pulled into the
usual run folder under `~/.boogle/daily/runs/`, and the Mac writes the issue comment, now naming the machine. `long`
and `perf` on command do the same; `perf` reads and writes the runner's own history. Unreachable: the job runs on the
Mac as it does today and the comment says so. The Mac's cost falls to a push, a pull and a `gh` call.

### Security on a home network

- ssh by key only, to a dedicated standard (non-administrator) user; password login off; the firewall admits port 22
  from the local subnet only; nothing is forwarded at the router.
- Nothing else listens: Vite is already `--host 127.0.0.1`; step 2 adds `LISTEN_HOST` to the game server's
  `loadConfig` (default unchanged, so production is untouched) and every harness stack sets `127.0.0.1`, which closes
  the finding above on the Mac as well. Step 6's browser server and tunnels are localhost on both ends.
- The key the agents use opens that one unprivileged account. The runner executes branch code and `npm ci` install
  scripts, the same trust the Mac already gives them, with no secret within reach. The owner's own account on the
  desktop, where his Claude session runs, is not what ssh reaches.
- Agents, on either machine, never create accounts, type passwords, edit `sshd_config`, the firewall, power settings
  or `~/.ssh/config`, and never change their own permission settings to reach the network.

## The owner's one-time checklist

**Owner, 11 November: asked about this one-time ssh setup, "Later".** Nothing below is done and step 1 waits for it. The five open questions at the end are unanswered. His separate answer, "Mac orchestrates, HOTBOX runs tests" ([owner calls](../agents/owner-calls.md)), is the direction this plan serves; until the setup exists, HOTBOX's own Claude session runs the tests.

About 30 minutes. The Claude session on the desktop can check each Windows item afterwards and say what is missing;
it does not do them.

**On the desktop (Windows 11)**

- [ ] Update the NVIDIA driver.
- [ ] Settings, Accounts, Other users: add a local **standard** user `boogle` (not an administrator).
- [ ] Settings, System, Optional features: add **OpenSSH Server**; then in an administrator PowerShell
      `Set-Service sshd -StartupType Automatic; Start-Service sshd`.
- [ ] Check that Git for Windows and Node 26 are installed for all users (on the system path), and install ffmpeg
      (`winget install Gyan.FFmpeg`).
- [ ] Administrator PowerShell, so ssh commands run in bash as on the Mac:
      `New-ItemProperty -Path HKLM:\SOFTWARE\OpenSSH -Name DefaultShell -Value "C:\Program Files\Git\bin\bash.exe" -PropertyType String -Force`.
- [ ] In `C:\ProgramData\ssh\sshd_config` set `PasswordAuthentication no` and `AllowUsers boogle` (after the key
      below works); `Restart-Service sshd`.
- [ ] Windows Firewall: limit the "OpenSSH SSH Server" rule's remote addresses to the local subnet; the network's
      profile is Private.
- [ ] Power: never sleep while plugged in.
- [ ] Optional, only for the pacing grade: automatic sign-in for `boogle` and one scheduled task, whose exact
      definition step 3 prints.

**On the Mac**

- [ ] `ssh-keygen -t ed25519 -f ~/.ssh/boogle_runner -N ""` (a key for this purpose only), and put
      `~/.ssh/boogle_runner.pub`'s one line in `C:\Users\boogle\.ssh\authorized_keys` on the desktop (owned by
      `boogle`, no other access).
- [ ] Give the desktop a fixed address in the router (a DHCP reservation).
- [ ] Add a `Host boogle-runner` entry to `~/.ssh/config` with its `HostName`, `User boogle`,
      `IdentityFile ~/.ssh/boogle_runner`, `IdentitiesOnly yes`.
- [ ] `ssh boogle-runner true`: check and accept the host key once.
- [ ] Create `~/.boogle/remote.json`:
      `{ "host": "boogle-runner", "os": "windows", "label": "runner", "default": "mac" }`.
- [ ] If Claude Code asks for permission to run `ssh` or `git push` to that host, allow it.

**Agents do the rest, over ssh as `boogle`:** set that user's npm `script-shell` to bash, create `<dir>/repo.git`
and the slots with their git settings, push, `npm ci`, install Playwright's Chromium (a per-user download), run the
doctor, keep the runner pruned (`remote -- reap`: orphaned browsers, job refs older than 7 days, a disk floor of
10 GB).

## Steps

Each step leaves `npm run check` green. Estimates are focused agent time and assume the desktop session's failure
list is in hand. Steps 1 to 5 edit `dev/look/lib.ts`, so `npm run checks-for` routes them to a bot segment through
T1 on the Mac, which is the proof that the Mac's lane is unchanged.

- [ ] **0. A first reading today, no code (owner, 5 minutes; the session there, already under way).** Open
  `https://boogle.club/?device=new` in Chrome on the desktop and press Run; an agent runs
  `npm run device -- pull --new`. The report names the adapter and backend and gives seven scene timings on that card
  in a real desktop session: the first evidence of a Windows NVIDIA player. Alongside it, the session's report of
  Windows-only failures in the tests, `counts` and `cold-launch`. Neither proves the ssh path.
- [ ] **1. `npm run remote -- doctor`.** 1.5 to 2 days.
  - `dev/remote/config.ts` (`readRemoteConfig()`: the file, validation, "not configured" as a value, not a throw);
    `dev/remote/ssh.ts` (`sshRun(cmd, { timeoutMs })` with the options above, `pushRef(sha, jobId)`, `pullLook(slot,
    into)`); `dev/remote/ship-ref.ts` (`refFor(worktree)`: `HEAD` or the snapshot commit and its refusals);
    `dev/remote/gpu-probe.ts` (`probeGpu()` and pure `classifyAdapter(info)`); `dev/remote/job.ts` (the runner side,
    one slot); `dev/remote/cli.ts` (`doctor`, and `doctor --local` for the session on the desktop: the same checks
    with no ssh); `dev/remote/README.md`; `"remote": "node dev/remote/cli.ts"` in `package.json`; `.gitignore`
    guard line.
  - `dev/look/gpu-args.ts`: move `launch()`'s flag choice here unchanged and add `LOOK_GPU=hardware`;
    `dev/look/lib.ts` imports it. The `win32` rows of the breaks table that a plain look trips on:
    `dev/look/bot-queue.ts`'s directory and CPU sample, and any import-by-path the look path has.
  - The doctor prints, one line each, and exits non-zero on the first that fails: reachable (ms); Windows build;
    Node (major must match `.nvmrc`, 26); git and its `autocrlf`; bash as the ssh shell; ffmpeg; free disk; clock
    difference from the Mac; Chromium version; the probe ladder's result (adapter, backend, driver, rung, `hardware`
    or the reason not); whether a desktop session is registered; then pushes `HEAD`, runs `npm run look --
    --rail-seed awake --question "doctor: does the runner render the game?"` there, pulls it and prints the still's
    local path with its verdict's `gfx errors` line.
  - Tests: `test/remote-adapter.test.ts` (an NVIDIA D3D12 info is hardware; SwiftShader, llvmpipe, Microsoft Basic
    Render Driver, a null adapter, a fallback flag and a missing `timestamp-query` are each refused with their
    reason); `test/remote-config.test.ts` (missing file is "not configured"; a `host` containing `@` or a dot is
    refused with "use an ssh alias").
  - Docs: one row in `docs/agents/tools.md` ("Run a browser check on the second machine").
  - **Done when** the command, run on the Mac, prints the report and an agent has opened the returned still.
    **Stop and report** if no ssh rung gives a hardware adapter while `doctor --local` does: the choice is then the
    scheduled-task rung for every job (the runner user signed in), which is the owner's to make.
- [ ] **2. `npm run remote -- run <script> [args]`, and localhost only.** 2 days.
  - `dev/remote/cli.ts`: `run`, `status`, `reap`; `job.ts`: install only on a changed lock hash, the job record, a
    job wall (`--wall`, default the script's own plus 5 minutes) that kills the process tree with `taskkill /T /F`,
    and cleanup when the ssh call drops (pid file).
  - The remaining rows of the breaks table for `playthrough`, `scenario` and video: `dev/scenarios/run.ts`'s import,
    the `win32` CPU reading in `dev/look/verdict.ts`.
  - `dev/look/verdict.ts`: the additive `machine`, `gpu`, `timingGrade`, `fellBack` fields and the `report.txt`
    line. The fallback path and `--no-fallback`.
  - `server/src/server.ts`: `LISTEN_HOST` in `loadConfig` (unset: as today) passed to `server.listen`;
    `dev/look/lib.ts`, `server-child.ts`, `bench.ts` and `cold-launch.ts` set `127.0.0.1`. **`server/` tier:
    independent review and a review stamp**; `npm run check:full`. `server/test/`: unset listens as before; set, a
    connection to a non-loopback address of the machine is refused.
  - Verify: `npm run remote -- run playthrough --to wake` and `-- run scenario world-inputs` return verdicts whose
    `machine` is the label; stop `sshd` on the desktop mid-job once and confirm the fallback line and `reap`.
  - **Done when** a branch's proof look and a T1 segment have run there while the Mac's queue was busy.
- [ ] **3. Timing on the runner.** 1.5 days, plus three quiet runs to seed the baseline.
  - `dev/remote/quiet.ts` (`machineQuiet()`: CPU sample, `nvidia-smi`, slot exclusivity; pure `quietVerdict()`
    tested with fixtures); the two grades in `job.ts`; `bench`, `perf`, `hitches` and `cold-launch` refuse without
    their grade. `dev/cold-launch.ts` takes its flags from `gpu-args.ts`; `--metal-cold` is refused off the Mac with
    a line naming the runner's caches (a fresh profile already empties Dawn's; the NVIDIA driver's on-disk shader
    cache persists and is recorded as "driver cache: warm"). The scheduled task's definition, printed for the owner.
  - `dev/daily/perf.ts`: history file by machine, `compare()` refusing mixed machines, a new baseline on a driver
    or browser change. `bench` on the runner passes `--dpr 2` explicitly (its display's own ratio is likely 1).
  - Docs: `docs/agents/test-details/performance.md` ("Two machines, two histories", what runner numbers are evidence
    of), `docs/agents/owner-calls.md` only after the owner answers question 2.
  - **Done when** `npm run remote -- run bench` has three valid runs in the runner's history and a deliberate
    regression on a scratch branch (double the town's shadow casters) is flagged against it.
- [ ] **4. Two lanes and the heartbeat.** 1 day.
  - `dev/remote/lanes.ts` (`pickLane(job, state)` and the table above) with `test/remote-lanes.test.ts` (each row;
    unreachable; timing with a software adapter; the 20-minute slot wait); the harness entry points consult it when
    `BOOGLE_LANE` or the config says `auto`; three slots; `dev/heartbeat.sh` gains the "Runner lane" section.
  - Docs: `docs/agents/test-details/bot-segments.md` ("Two lanes"), `tools.md`'s shared-GPU paragraph, the look
    skill's note that a still's caption names its machine.
  - **Done when** two branches' segments run at once, one per machine, and the heartbeat shows both.
- [ ] **5. The weekly and on-command jobs.** 0.5 to 1 day.
  - `dev/daily/run.ts` and `jobs.ts`: `scenarios`, `long` and `perf` run through `remote` when configured; the
    issue comment names the machine or the fallback; `dev/daily/README.md`.
  - **Done when** `npm run daily -- scenarios` passes from the runner with the Mac under agent load. Issue #916
    closes on its own rule (a passing run); nothing waits for a Sunday.
- [ ] **6. One client on each machine (optional).** 1.5 days.
  - `dev/remote/peer.ts` (the tunnels and the browser server's lifetime); `launch({ peer: 'runner' })` in
    `dev/look/lib.ts`; `playthrough --players 2 --peer runner`.
  - **Done when** `--to T2 --peer runner` passes with agreeing hashes, and a deliberately planted `Math.sin` in a
    scratch rule is still caught by lint, not by this run (recorded as what the check does not add).

## Level findings

None: the plan places nothing in the world. `npm run level-check` was not run.

## Risks

**P1**

- **No hardware adapter from an ssh-started browser** (Windows' services session). Goal 1 depends on it. The
  doctor's ladder finds out early in step 1; the fallback is the scheduled-task rung, which needs the runner user
  left signed in.
- **Runner numbers read as target numbers.** A 3080 hides regressions that matter on an iPad. Separate history, the
  machine in every line, `compare()` refusing to mix, and the docs sentence in step 3.
- **Exposure.** The game server's all-interface listen (found, fixed in step 2; the firewall covers the runner until
  then); a snapshot commit carrying an untracked secret (refusal patterns, the printed list); a host name leaking
  into a verdict or commit body (only the label is ever written; the registry check).

**P2**

- **The Windows port is wider than the table.** The table was made by reading. The session's failure list bounds
  it; step 1's estimate assumes that list exists. Git push to a Windows OpenSSH server with bash as its shell is a
  common arrangement but untried here.
- **Hotspot files.** `dev/look/lib.ts`, `bot-queue.ts` and `verdict.ts` serve every harness and the trusted broker,
  whose running process a worker's edits do not upgrade (launcher restart after review). Changes are additive and
  behind `LOOK_GPU`, `BOOGLE_LANE` and `win32` branches.
- **Left-over processes and disk** after a dropped connection, worse on Windows where a kill does not reach
  children: the job wall, `reap`, the disk floor.
- **Rendering differences** between Metal and D3D12 (MSAA resolve, filtering, precision) turning up in stills. They
  are findings about that player, but they must not be judged as look changes: hence look-development stays on the
  Mac.
- **Two sets of hands on one machine.** The owner's Claude session and ssh jobs can render at once; the quiet check
  catches it for timing, and the session should take the runner's bot queue for any browser run.

**P3**

- Driver updates and Windows Update restarts move or interrupt baselines (new-baseline rule; a restart is
  "unreachable").
- The desktop is off or asleep: fallback covers it; wake-on-LAN is not planned.
- Harness timeouts and the 5x warp were tuned on the Mac; a faster machine should only help, unverified.
- Room safety and mixed builds: no wire shape, op, catalog or save changes; `LISTEN_HOST` is additive with today's
  default.

## Open questions

1. **Is the desktop only for this, or do you also use it (games, music)?** Recommended: shared is fine. Leave it on
   and never sleeping; when you are using it, timing jobs say "runner busy" and other jobs fall back to the Mac. The
   pacing grade needs it left signed in as the runner user, so plan on the render-cost grade only.
2. **May a before-and-after measured on the runner count as the performance evidence for a ship?** Recommended:
   yes, for "what did this change cost", always labelled with the machine; budgets and "does it run on the target"
   stay judged on the Mac and on device runs, and the Mac bench stays on command. This amends "The Mac and mobile
   are the targets".
3. **May a ship's one proof look come from the runner?** Recommended: yes for behaviour (the thing happens, no
   errors), with the machine in the caption; lighting, colour and anything about how it looks stay on the Mac.
4. **Should the Sunday scenarios job move to the runner as soon as step 5 lands, started by the Mac?** Recommended:
   yes. The Mac must still be awake at 03:30, but does almost no work, and the runner needs no GitHub login.
5. **A separate `boogle` user for ssh, or your own account?** Recommended: the separate standard user. Jobs then run
   with no access to your files or logins, at the cost of ten minutes of setup; your own account stays where the
   Claude session runs.
