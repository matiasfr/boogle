# Ship pipeline (owner-approved, 8 November)

### Pipeline ordering and optional hardening

Ships may check concurrently; merge order is whichever green, current branch GitHub accepts first, not FIFO.
Automerge checks the exact successful CI head against current main. A stale branch is updated by merging main
into it (preserving original commit ancestry for `--wait`), then full CI is dispatched on the new head. Conflicts
still go to autofix. A red, superseded or cancelled run never authorizes a merge. After a failed merge, main is
compared again; if it moved, the branch receives another update/CI cycle before retrying.
No force pushes or shared Actions concurrency group that could discard pending ships.

Main currently has no branch protection (owner verified GET protection: 404); its ruleset blocks force pushes.
Automerge requires neither protection nor an extra token. It uses `GITHUB_TOKEN` and `--match-head-commit`,
without `--admin`. If strict protection is readable and enabled, GitHub adds a final atomic up-to-date guard.
Otherwise a notice records the seconds-wide race between the ancestry check and merge. CI dispatched on main
after every merge detects a bad combination; it does not prevent that race. Strict protection with required
client/server/net checks and administrator enforcement is optional later hardening. Existing Actions PR-creation
permission is still needed. Both ship entry points enqueue by default and support explicit `--wait` for callers
whose next step requires main ancestry.

### Local gate

The pre-push hook runs the shared `dev/ship-check.ts` gate once per pushed head: changed-file lint, project
typecheck and affected unit tests found through static relative imports. CI owns the full lint/unit/registry/
level/assets/build/server/net checks. `--full` adds the previous full local `check`; `--gpu` remains
explicit. `bash scripts/ship.sh --dry-run [--full]` times the local gate on this tree without fetching, rebasing
or pushing. This is not proof of a merge or deployment.

### Live smoke

After Pages deploys, it dispatches Smoke with its exact SHA. Node fetches HTML, `version.json` and entry JS/CSS,
checks status/content types and matching Pages identities, then checks the server's read-only `/version` and
relays a cosmetic honk and acknowledgment between two sockets in `smoke-node-0..6`. It never joins `boogle` or
edits a world. The script has a 60-second deadline, with a bounded convergence wait for concurrent server deploys;
failure still opens/updates the smoke issue. No browser, Chromium install or software WebGPU in this workflow.

Pages and the server deploy independently: `version.json.serverBuild` is the last commit touching the server
image's sources (shared `dev/server-build.ts` path list), and Docker embeds that same source commit as
`BOOGLE_BUILD`. Checking this exact expected source commit avoids requiring a server redeploy for docs/UI-only
changes. First rollout requires a server deployment with `/version`; an old server fails, never silently passes.
This is deployment identity metadata, not a mixed-build gameplay fence. No Fly settings are changed.
The full two-player live browser scenario stays exclusively in the owner's daily Mac scenario list (`dev/daily/jobs.ts`).

### CI scope

- Normal pre-push/ship gate: `dev/ship-check.ts` lints changed JS/TS files relative to `origin/main`, typechecks the project, and runs changed unit tests plus tests whose transitive static relative imports changed. Lint-policy/package changes run full lint. Dynamic/nonrelative imports, registry, levels, assets and build remain CI's responsibility. Deleted imports are caught by typecheck/CI. The hook covers every non-deletion ref, including direct branch pushes, and forbids main. `npm run ship -- --full` adds the old full local check; `bash scripts/ship.sh --dry-run [--full]` exercises the gate without network, rebase or push (including tracked working edits).
- CI detects docs-only diffs (`docs/**`, any `*.md`, `.claude/**`) and skips server/net jobs with successful skipped check results. The client gate stays full: docs feed generated atlas/development pages and the build still needs validation. Ship pushes/dispatches compare the entire unmerged delta against main (including first pushes), never just the last fix commit. Empty/unknown diffs and main dispatches run everything. Changes detection is a job, never an `on:paths` filter, so required contexts are reported. Rendered scenarios, including `world-inputs`, run daily on the owner's Mac (`dev/daily/jobs.ts`), outside CI.
- Live deployment smoke: `node dev/live-smoke.ts --url https://boogle.club/ [--build <Pages SHA>]`. The browserless Node probe verifies entry assets, Pages/server identity and an isolated room action round-trip within 60 seconds. `smoke.yml` retains issue reporting. Two-player rendered smoke runs daily on the Mac via `dev/daily/jobs.ts`, with the full ball/hash checks; it is absent from CI Smoke. See [live smoke](#live-smoke) for independent server source identity.
