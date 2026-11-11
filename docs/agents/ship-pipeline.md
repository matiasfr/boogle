# Ship pipeline (owner-approved 8 November; merge policy from owner call "Fast ships", 10 November)

### Merge on the first green run

Ships check concurrently; merge order is whichever green branch GitHub accepts first, not FIFO. Automerge merges a
PR when the latest eligible CI run for its exact head is green and GitHub reports it mergeable, even if main moved
after that run. Ship eligibility counts push/dispatch CI, never the PR's own pull_request runs; other branches count
PR/dispatch CI. A red, superseded or cancelled run never authorizes a merge. Before every attempt it repeats the PR
guards (open, same-repository, main base, same branch/head, non-draft, no `no-automerge` label). A conflicting PR goes
to ci-autofix, which merges main into the branch; its push starts fresh CI. A merge GitHub rejects ("Base branch was
modified") is retried up to five times with every guard rechecked. No force pushes or shared Actions concurrency group
that could discard pending ships.

The serial path survives only where it is cheap and likely to matter: when main gained commits since the PR's merge
base that change a **code** file the PR also changes (`dev/ci/change-class.ts --code` on both compare file lists,
renames counting both paths; a compare that fails or reaches 300 files counts as shared), or when strict up-to-date
protection is on. Then automerge merges main into the branch (update-branch), waits up to 3 minutes for the new ref,
dispatches CI on it, polls for that run (30-minute deadline, 55-minute job ceiling) and re-enters every guard. Docs
files both sides touched merge textually and need no rerun.

Bad combinations are caught after the merge, not before: automerge dispatches CI on main after every merge. A red
main run opens (or comments on) one `red-main` issue, closed by the next green main run (ci.yml, `red-main` job);
ci-autofix's main job has Claude open a `claude/fix-main-*` PR; `npm run heartbeat` leads with `RED MAIN` and lists
both. Fixing main beats starting something new.

Main has no branch protection (owner verified GET protection: 404); its ruleset blocks force pushes. Automerge uses
`GITHUB_TOKEN` and `--match-head-commit`, without `--admin`. Do not enable strict up-to-date required checks: they would
put every behind PR back on the serial path. Required check names, if ever added, are the CI jobs `docs`, `lint`,
`build`, `unit`, `registry`, `server` and `net` (skipped jobs report success). Existing Actions PR-creation permission
is still needed. Both ship entry points enqueue by default and support explicit `--wait`.

A ship PR's pull_request CI runs do nothing: GitHub has no head-branch filter, so ci.yml's `changes` job skips them.
The one opened by the bot's own PR event shows `action_required` (GitHub holds runs from `github-actions[bot]` events
for approval; they never start a job) and is deleted after the merge. claude/* and human PRs keep pull_request CI.

### Local gate

The pre-push hook runs the shared `dev/ship-check.ts` gate once per pushed head: changed-file lint, project
typecheck and affected unit tests found through static relative imports. CI owns the full lint/unit/registry/
level/assets/build/server/net checks. A docs-only diff runs only CI's docs checks (registry, `models.test.ts`,
`change-class.test.ts`). `--full` adds the previous full local `check` (not on a docs-only diff); `--gpu` remains
explicit. `bash scripts/ship.sh --dry-run [--full]` times the local gate on this tree without fetching, rebasing
or pushing. This is not proof of a merge or deployment.

### Live smoke

After Pages deploys, it dispatches Smoke with its exact SHA. Node fetches HTML, `version.json` and entry JS/CSS,
checks status/content types and matching Pages identities, then checks the server's read-only `/version` and
relays a cosmetic honk and acknowledgment between two sockets in `smoke-node-0..6`. It never joins `boogle` or
edits a world. The script waits up to 5 minutes for the server's `/version` to reach `serverBuild` (deploy-server runs minutes
after Pages; a Pages-only push passes at once), retries the room round-trip once on fresh sockets for a server restart,
and has a 7-minute hard deadline; a server that never converges or a second round-trip failure fails loudly, and
failure still opens/updates the smoke issue. No browser, Chromium install or software WebGPU in this workflow.

Pages and the server deploy independently: `version.json.serverBuild` is the last commit touching the server
image's sources (shared `dev/server-build.ts` path list), and Docker embeds that same source commit as
`BOOGLE_BUILD`. Checking this exact expected source commit avoids requiring a server redeploy for docs/UI-only
changes. First rollout requires a server deployment with `/version`; an old server fails, never silently passes.
This is deployment identity metadata, not a mixed-build gameplay fence. No Fly settings are changed.
The full two-player live browser scenario stays exclusively in the owner's daily Mac scenario list (`dev/daily/jobs.ts`).

### CI scope

- Normal pre-push/ship gate: `dev/ship-check.ts` lints changed JS/TS files relative to `origin/main`, typechecks the project, and runs changed unit tests plus tests whose transitive static relative imports changed. Lint-policy/package changes run full lint. Dynamic/nonrelative imports, registry, levels, assets and build remain CI's responsibility. Deleted imports are caught by typecheck/CI. The hook covers every non-deletion ref, including direct branch pushes, and forbids main. `npm run ship -- --full` adds the old full local check; `bash scripts/ship.sh --dry-run [--full]` exercises the gate without network, rebase or push (including tracked working edits).
- CI classes each diff with `dev/ci/change-class.ts`. Docs: `*.md` and `docs/` images, except `docs/atlas/`, `docs/world/`, `test/`, `public/` and `.github/` (bundled, imported or tested); anything unknown is code. Docs runs only the `docs` job (registry, agent frontmatter and classifier tests); every other job skips with a successful result. Code runs `lint` (lint, typecheck), `build`, `unit`, `registry` (registry, level-check, assets check), `server` (tests, image build and boot) and `net` in parallel. `test/change-class.test.ts` fails if a bundled, built or tested file reads a docs path, so the list can't silently go stale; the development page's Markdown (`orchestrator-state.md`) is the one known build input classed as docs, and the deploy build after the merge still renders it. Ship pushes/dispatches compare the entire unmerged delta against main (including first pushes), never just the last fix commit. Empty/unknown diffs and main dispatches run everything. Changes detection is a job, never an `on:paths` filter, so required contexts are reported. Rendered scenarios, including `world-inputs`, run daily on the owner's Mac (`dev/daily/jobs.ts`), outside CI.
- Live deployment smoke: `node dev/live-smoke.ts --url https://boogle.club/ [--build <Pages SHA>]`. The browserless Node probe verifies entry assets, Pages/server identity and an isolated room action round-trip (server identity wait up to 5 minutes, one round-trip retry). Then `node dev/live-boot.ts --url <site>` opens the game once (headless Chromium, a `smoke-boot-N` room, no Jump in) and reads its boot marks: `interactive` passes; a startup failure after `boot:gpu` or a file that did not load fails; no WebGPU warns "unproven" and passes. `smoke.yml` retains issue reporting. Two-player rendered smoke runs daily on the Mac via `dev/daily/jobs.ts`, with the full ball/hash checks; it is absent from CI Smoke. See [live smoke](#live-smoke) for independent server source identity.
