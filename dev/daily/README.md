# Daily jobs on the owner's Mac

`npm run daily -- atlas|patch-video|scenarios|perf|long [--dry-run] [--force] [--notes "..."]` replaces the two Opus CI agents with
**Weekly since 10 November (owner: "we can change those to be weekly or on command"): launchd runs the scheduled jobs on Sundays only (`weekday` in `jobs.ts`), and any job runs on command with `npm run daily -- <job>`.** **Scheduled: only `scenarios` (03:30); `long` is on command only (owner, 10 November)**, the `scheduled` list in `jobs.ts`; `npm run daily:install` installs just those. Perf runs by hand (`npm run daily -- perf`) when a change could cost frames (rendering, world size, draw calls, a `WORLD_NS` bump) or the owner asks; atlas and patch video are off because they spend Codex usage nobody needs now, and still run by hand. The sections below describe each job when it runs.
subscription-authenticated Codex. Atlas uses GPT-6.1-Terra at low effort; patch video and its independent visual review
use GPT-6-Astra at high effort. DESIGN.md: **Understandable at a glance**, **Show, don't tell**, **Small and readable**.
A Codex run that stops on the subscription's usage limit is `skipped: Codex usage limit, try again at <time>`, not "failed"; its worktree is kept, since the agent may have worked before the limit (9 and 10 November).
The scenarios job uses no model: at 03:30 local it runs the list in `dev/daily/jobs.ts` sequentially on the Mac GPU, including `world-inputs` (moved out of software WebGPU CI on 8 November). The last, `smoke`, plays the live site at full depth: ball handover and same-tick hashes. It uses a fresh worktree, reports failures to the scenarios issue, and closes it after a passing run. CI Smoke uses the browserless Node deployment probe; CI has no rendered scenarios. Logs and images remain under the run folder.
For a local check, `npm run daily -- scenarios --only caves` uses the current worktree and installed dependencies, skips GitHub and leaves its logs and images in the run folder. Each scenario first takes the machine bot slot (`dev/look/bot-queue.ts`; the child inherits it through `BOOGLE_BOT_LEASE`), and its 15-minute timeout starts only then: on 9 November `reconnect-edit` and `shared-kinds` spent their whole 15 minutes queued behind an agent's long playthrough. Each scenario log starts with how long it queued and the load when it ended; results with a 1-minute load over about 30 are not evidence.

Every daily worktree is created **locked** (`git worktree add --lock`), and every GitHub call runs from the durable checkout with `--repo`, never from the run's worktree. On 9 November another session's cleanup of "merged, clean" worktrees (its skip list named `boogle-daily*` checkouts but not `~/.boogle/daily/runs/`) removed the scenarios run's worktree and branch at 03:46: a daily branch sits at origin/main and `npm ci`'s output is ignored, so it looked merged and clean. The remaining scenarios then failed with `Cannot find module .../dev/scenarios/run.ts` and the report failed with "not a git repository", so nothing was posted. A cleanup that honours locks (plain `git worktree remove`, `prune`) now leaves the run alone; if the worktree still disappears, the runner stops, names it as a `runner:` failure in the issue and keeps the evidence.

The perf job (`npm run daily -- perf`) serves the owner's [Measure performance daily](../../docs/agents/owner-calls.md) call and uses no model either: at 02:50 local, before the scenarios, it benchmarks origin/main in a fresh worktree with `dev/look/bench.ts` (a visible Chromium on the Mac GPU under `caffeinate -dimu`, about five minutes with `npm ci`; [what it measures](../../docs/agents/test-details/performance.md)). It compares each metric with the median of the last three valid runs in `~/.boogle/daily/perf/history.jsonl`, flags rises past both thresholds of `PERF_POLICY` (dev/daily/perf.ts), budgets (25 MB first load, 100 MB in all, 4 MB per asset, 8.33 ms CPU or GPU per frame) and the commit range since the baseline, and comments on the one open issue labelled `performance` (titled Performance, created on the first run). The run folder keeps `bench.json`, `bench.log`, `comparison.json` and `notification.md`. A run whose page was hidden, drew too few frames or had no GPU timestamps is reported as not comparable and never becomes a baseline; check the first live run for this, since the Mac's display may be asleep at night. `npm run daily -- perf --local` benchmarks the current worktree and prints the comparison without GitHub or history.

The perf job takes the machine bot slot after `npm ci` and holds it for the whole measurement, so no agent's browser shares the GPU. Holding it, it waits up to `PERF_POLICY.quiet.waitMinutes` (30) for a 1-minute load of at most `quiet.maxLoad` (6, on 10 cores) and no other Playwright Chromium (with the slot held, one is an orphan or a launcher that skips the queue). If the machine never gets quiet, the night is `skipped: machine busy (load N)` on the issue and in `evidence.json`, not "invalid", and nothing is measured. A measured run records the load before and after in its first line, and `evidence.json` keeps the busiest processes (`busiest.before`, `busiest.after`) to name what shared the machine. From 7 to 9 November the runs drew 16 to 62 frames in 5 s with agents' work on the machine, so there was no valid baseline.

The long job (`npm run daily -- long`, 07:40 local) plays the full production route on origin/main in a fresh worktree: `npm run playthrough -- --long --stall 6000`, about half an hour. It replaces a long run per feature branch (owner call "Iterate fast": the long run is the final pass). It takes the bot slot as a long ticket (shorter runs pass it while it waits; its 60-minute timeout starts once it has the slot), then reports to the one open issue labelled `long-run`: created or commented on a failure, commented and closed on a pass, with the verdict, the total game-minutes and each `RAIL_STOPS` checkpoint (`dev/look/segments.ts`) with the game time it was first reached (`dev/daily/long.ts`). The run folder keeps `playthrough/long/` (report.txt, verdict.json, bot.txt, the end still), `long.log` and `notification.md`. It runs after patch video because every daily job shares one lock and a job that finds it held skips the night; 04:00 to 05:00 would race the scenarios (up to about 75 minutes) and atlas (05:07). `--local` plays the current worktree and prints the report without GitHub. To try any local run without touching `~/.boogle/daily/` (its lock, runs or perf history), set `BOOGLE_DAILY_STATE=<folder>`; never set it when installing.

## What moved, and what CI still does

| Need in the old workflow                       | Now                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE_CODE_OAUTH_TOKEN`, action OIDC         | Neither needed. Local `codex login` with the owner's ChatGPT account; API-key variables removed from children and `forced_login_method=chatgpt` enforced.                                                                                                                               |
| Checkout with full main history and video tags | Fetch origin/main and tags; create a unique `daily/<job>-<id>` branch and worktree. Never reset, switch or copy working files from the caller.                                                                                                                                          |
| Atlas gate, open PR check, narrative edits     | Same daily gate; skip any open daily or legacy atlas PR, including stuck PRs (director inspects them rather than automatically closing work). Advisory citation report remains in `atlas.yml` on command or a push to its paths; automerge no longer dispatches it. No merge-triggered model work. |
| Chromium / GPU / ffmpeg for video              | Local Metal GPU, per-worktree `npm ci`, Playwright Chromium, installed ffmpeg/ffprobe. No shared node_modules or saves. Reels can be `.ts` paths; existing `.mjs` reels still work.                                                                                                     |
| Video selection and cut review                 | Same three-game-commit gate, then three actual new player-visible features; independent second Codex session inspects/fixes the cut. Only main's features; no prototypes.                                                                                                               |
| PR creation and merging                        | Runner validates the edited paths, formats, checks and commits, then uses `npm run ship -- --wait`. No direct PR/push by the model. `SHIP_NO_AI=1` prevents ship from invoking Claude for conflicts.                                                                                    |
| Artifact upload                                | Local run reports and `.look` artifacts preserved under the state directory below. No Actions artifact retention; director manages local disk space.                                                                                                                                    |
| Release upload and link post                   | Existing `video:publish` creates the release, dispatches `deploy.yml`, waits for the share page; runner comments in “Patch videos” mentioning the repository owner. Local `gh` authentication replaces `GITHUB_TOKEN`.                                                                  |
| Hosting                                        | Existing `deploy.yml` and Pages still publish the site and release share pages. `patch-video.yml` is removed: none of its rendering, uploading or posting requires a CI runner.                                                                                                         |

Neither `ci-autofix.yml` nor `claude.yml` changes. Ship PRs still pass through the existing CI/autofix system; this removes
Claude usage from these two daily jobs, not from unrelated CI. Nothing changes in the game.

## Director setup (do this after the change reaches main)

1. Use a durable, updated checkout on the owner's Mac. Install Node 26+, Codex CLI, GitHub CLI and ffmpeg (including
   ffprobe). Sign into `codex login` with the owner's **ChatGPT subscription**, and `gh auth login` with the account
   allowed to push branches, create releases/issues and dispatch Actions. Git must also authenticate to origin without
   an interactive prompt (`gh auth setup-git` for HTTPS, or the existing SSH setup). Confirm `codex login status` and
   `gh auth status`. No credentials are copied into the repo or plists.
2. Preview `npm run daily -- atlas --dry-run`, `npm run daily -- patch-video --dry-run`, `npm run daily -- scenarios --dry-run`, `npm run daily -- perf --dry-run` and `npm run daily -- long --dry-run`. These only print plans and
   prompts: no fetch, auth request, worktree, Codex session, install, publish, or post. `--force` skips the cheap gate,
   not the video feature judgment, independent review, scope checks or open-PR protection. Install the matching Playwright Chromium with `npx playwright install chromium` before the first scenarios run.
3. Preview `npm run daily:install -- --dry-run`, then reinstall with **`npm run daily:uninstall && npm run daily:install`**. The implementation task
   does not install anything. Install records this checkout's absolute script path, Node executable and PATH; it saves
   no other environment. After updating the durable checkout to Node 26, run `nvm use` there and reinstall with `npm run daily:uninstall` followed by `npm run daily:install`; existing plists keep their recorded Node 24.11.1 until reinstalled. Reinstall also after moving that checkout, changing tool locations, or changing the schedule.
4. Run each job once while online and inspect its reports before relying on the schedule. The current implementation
   was checked offline with dry runs; actual subscription/model access, GPU recording, shipping and publication need
   this first live run. Codex runs unattended with `danger-full-access` and approval policy `never` so Chromium and
   tools can run on the Mac; this is not an isolation boundary. The dedicated worktree and scope checks protect delivery,
   but the agent is trusted with the owner's machine access. Usage-limit or auth failures stop; no Claude fallback.

`npm run daily:uninstall [-- --dry-run]` boots out these five services and removes only their plists, leaving reports,
artifacts and failed worktrees. Uninstall while a job runs terminates it; inspect any retained lock/children afterward.

## Schedule, sleep and offline behavior

The installer converts the old UTC cron hours **13:07 atlas / 14:23 patch-video** into local clock times using the Mac's
current timezone and installation date. On 2026-11-03 in America/Los_Angeles this is **05:07 / 06:23 PST**. It prints both
times and writes `StartCalendarInterval` plists to `~/Library/LaunchAgents/club.boogle.daily.<job>.plist`. Those are fixed
local clock times thereafter (including DST); reinstall if the intended UTC alignment changes. There is no immediate
`RunAtLoad` job and no periodic model polling.

launchd coalesces calendar events missed during sleep and runs once after wake, while the owner's login session is
loaded. It does not wake a powered-off Mac or guarantee a catch-up after shutdown/logout. Sleeping mid-recording can
interrupt tools; don't judge a partial output as a completed video. Offline failures stop, keep evidence and wait for
manual rerun or the next daily event; there is no automatic reconnect retry.
If 03:30 is missed during sleep, scenarios start on wake and hold the shared lock and GPU for the length of the run.

One atomic `active/` lock covers **all five** jobs, even across checkouts. Another run skips cleanly before any auth/network
or model use. If both missed jobs start at wake, one may skip; rerun that job when the other finishes (or wait until
its next day). This deliberately avoids two expensive jobs competing for the GPU. A crash can leave a lock: inspect
`active/owner.json`, its PID and any surviving Codex/Chromium children before removing that directory. Never blindly
remove a live lock. Pending job PRs also skip until resolved; inspect a stuck one rather than creating duplicates.

## Evidence and recovery

State lives outside Git at `~/.boogle/daily/`. Existing runs and logs remain at the old
`~/Library/Application Support/Boogle/daily/` location; inspect them there. Reinstall the launch agents to point their
logs at the new location. `atlas.log`, `patch-video.log` and their
`.error.log` files are launchd output. Each `runs/<id>/` contains `report.md`, prompts, Codex logs, `evidence.json`,
`handoff.md`, and (for a cut) `review.md` plus publishing/notification records. Successful runs move the worker's `.look`
to `artifacts/` and remove only their own worktree and local branch. Failed runs retain `worktree/`, with dependencies
and all intermediate output. Scenario failures are normal results: after reporting, their images and logs remain in the run folder and the worktree is removed. A job error retains the worktree. Agent image paths starting with `.look/` map to `artifacts/` after successful cleanup.

Inspect failed runs before retrying. In particular, a release can already exist when Pages or notification fails;
`publish-output.txt` records its URL/tag even if the page did not become live. Finish its Pages deploy or issue comment
manually instead of publishing the same cut again. A new daily run will see the release tag and exclude those commits.
A ship timeout may already have pushed a branch; inspect its PR first. Fix any rebase conflict in the retained worktree
and use the normal ship workflow. No automatic destructive recovery or duplicate publication is attempted.

Reports, raw frames and cuts accumulate; periodically archive the wanted videos/contact sheets and delete completed
run folders. Failed worktrees stay locked; remove one with `git worktree unlock <path> && git worktree remove <path>` only after resolving its work. Deleting run
folders alone does not unregister failed worktrees. The runtime evidence records delivery status, not proof of visual
quality; read the agent and reviewer assessments and actual contact sheets.
