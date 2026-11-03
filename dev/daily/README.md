# Daily jobs on the owner's Mac

`npm run daily -- atlas|patch-video [--dry-run] [--force] [--notes "..."]` replaces the two Opus CI agents with
subscription-authenticated Codex. Atlas uses GPT-6.1-Terra at low effort; patch video and its independent visual review
use GPT-6-Astra at high effort. DESIGN.md: **Understandable at a glance**, **Show, don't tell**, **Small and readable**.

## What moved, and what CI still does

| Need in the old workflow | Now |
| --- | --- |
| `CLAUDE_CODE_OAUTH_TOKEN`, action OIDC | Neither needed. Local `codex login` with the owner's ChatGPT account; API-key variables removed from children and `forced_login_method=chatgpt` enforced. |
| Checkout with full main history and video tags | Fetch origin/main and tags; create a unique `daily/<job>-<id>` branch and worktree. Never reset, switch or copy working files from the caller. |
| Atlas gate, open PR check, narrative edits | Same daily gate; skip any open daily or legacy atlas PR, including stuck PRs (director inspects them rather than automatically closing work). Advisory citation report remains in `atlas.yml` on dispatch/push, including automerge's existing dispatch. No merge-triggered model work. |
| Chromium / GPU / ffmpeg for video | Local Metal GPU, per-worktree `npm ci`, Playwright Chromium, installed ffmpeg/ffprobe. No shared node_modules or saves. Reels can be `.ts` paths; existing `.mjs` reels still work. |
| Video selection and cut review | Same three-game-commit gate, then three actual new player-visible features; independent second Codex session inspects/fixes the cut. Only main's features; no prototypes. |
| PR creation and merging | Runner validates the edited paths, formats, checks and commits, then uses `npm run ship -- --wait`. No direct PR/push by the model. `SHIP_NO_AI=1` prevents ship from invoking Claude for conflicts. |
| Artifact upload | Local run reports and `.look` artifacts preserved under the state directory below. No Actions artifact retention; director manages local disk space. |
| Release upload and link post | Existing `video:publish` creates the release, dispatches `deploy.yml`, waits for the share page; runner comments in “Patch videos” mentioning the repository owner. Local `gh` authentication replaces `GITHUB_TOKEN`. |
| Hosting | Existing `deploy.yml` and Pages still publish the site and release share pages. `patch-video.yml` is removed: none of its rendering, uploading or posting requires a CI runner. |

Neither `ci-autofix.yml` nor `claude.yml` changes. Ship PRs still pass through the existing CI/autofix system; this removes
Claude usage from these two daily jobs, not from unrelated CI. Nothing changes in the game.

## Director setup (do this after the change reaches main)

1. Use a durable, updated checkout on the owner's Mac. Install Node 24+, Codex CLI, GitHub CLI and ffmpeg (including
   ffprobe). Sign into `codex login` with the owner's **ChatGPT subscription**, and `gh auth login` with the account
   allowed to push branches, create releases/issues and dispatch Actions. Git must also authenticate to origin without
   an interactive prompt (`gh auth setup-git` for HTTPS, or the existing SSH setup). Confirm `codex login status` and
   `gh auth status`. No credentials are copied into the repo or plists.
2. Preview `npm run daily -- atlas --dry-run` and `npm run daily -- patch-video --dry-run`. These only print plans and
   prompts: no fetch, auth request, worktree, Codex session, install, publish, or post. `--force` skips the cheap gate,
   not the video feature judgment, independent review, scope checks or open-PR protection.
3. Preview `npm run daily:install -- --dry-run`, then run **`npm run daily:install` yourself**. The implementation task
   does not install anything. Install records this checkout's absolute script path, Node executable and PATH; it saves
   no other environment. Reinstall after moving that checkout, changing Node/tool locations, or changing the schedule.
4. Run each job once while online and inspect its reports before relying on the schedule. The current implementation
   was checked offline with dry runs; actual subscription/model access, GPU recording, shipping and publication need
   this first live run. Codex runs unattended with `danger-full-access` and approval policy `never` so Chromium and
   tools can run on the Mac; this is not an isolation boundary. The dedicated worktree and scope checks protect delivery,
   but the agent is trusted with the owner's machine access. Usage-limit or auth failures stop; no Claude fallback.

`npm run daily:uninstall [-- --dry-run]` boots out these two services and removes only their plists, leaving reports,
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

One atomic `active/` lock covers **both** jobs, even across checkouts. Another run skips cleanly before any auth/network
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
and all intermediate output. Agent image paths starting with `.look/` map to `artifacts/` after successful cleanup.

Inspect failed runs before retrying. In particular, a release can already exist when Pages or notification fails;
`publish-output.txt` records its URL/tag even if the page did not become live. Finish its Pages deploy or issue comment
manually instead of publishing the same cut again. A new daily run will see the release tag and exclude those commits.
A ship timeout may already have pushed a branch; inspect its PR first. Fix any rebase conflict in the retained worktree
and use the normal ship workflow. No automatic destructive recovery or duplicate publication is attempted.

Reports, raw frames and cuts accumulate; periodically archive the wanted videos/contact sheets and delete completed
run folders. Remove failed worktrees with `git worktree remove <path>` only after resolving their work. Deleting run
folders alone does not unregister failed worktrees. The runtime evidence records delivery status, not proof of visual
quality; read the agent and reviewer assessments and actual contact sheets.
