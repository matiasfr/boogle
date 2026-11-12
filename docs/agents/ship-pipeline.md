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
ci-autofix's main job has Claude bisect main's first-parent merges since the last green run with the failing file alone
(`git bisect run`) and open a `claude/fix-main-*` PR naming the first bad merge; `npm run heartbeat` leads with
`RED MAIN` and lists both. While the issue is open, `ship-queue` holds review-path ships (exit 7, `--main-known`).
Fixing main beats starting something new.

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
typecheck and affected unit tests found through static relative imports, with the local [unit test
settings](#unit-test-settings). CI owns the full lint/unit/registry/
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

- Normal pre-push/ship gate: `dev/ship-check.ts` lints changed JS/TS files relative to `origin/main`, typechecks the project, and runs changed unit tests plus tests whose transitive static relative imports changed. Lint-policy/package changes run full lint. It also runs `npm run registry` on every diff (about 2s). Dynamic/nonrelative imports, levels, assets and build remain CI's responsibility. Deleted imports are caught by typecheck/CI. The hook covers every non-deletion ref, including direct branch pushes, and forbids main. `npm run ship -- --full` adds the old full local check; `bash scripts/ship.sh --dry-run [--full]` exercises the gate without network, rebase or push (including tracked working edits).
- CI classes each diff with `dev/ci/change-class.ts`. Docs: `*.md` and `docs/` images, except `docs/atlas/`, `docs/world/`, `test/`, `public/` and `.github/` (bundled, imported or tested); anything unknown is code. Docs runs only the `docs` job (registry, agent frontmatter and classifier tests); every other job skips with a successful result. Code runs `lint` (lint, typecheck), `build`, `unit` (four shards, or for a ship off the lockstep and review paths one job with the affected tests and the core; [settings](#unit-test-settings)), `registry` (registry, level-check, assets check), `server` (tests, image build and boot) and `net` in parallel. `server`'s tests and `net` run only when a file in their import closure changed (roots `server/test/` and `dev/peer-test/`; `--jobs` prints the outputs), the image build and boot only when `dev/server-build.ts`'s image paths did; each has a fallback list for what no import shows (package and lock files, `.nvmrc`, `ci.yml`, `dev/ci/`), and `change-class.test.ts` fails when the regex walk misses a parsed import or a file in a closure loads something no walk can follow. Main and empty diffs run all three. `test/change-class.test.ts` fails if a bundled, built or tested file reads a docs path, so the list can't silently go stale; the development page's Markdown (`orchestrator-state.md`) is the one known build input classed as docs, and the deploy build after the merge still renders it. Ship pushes/dispatches compare the entire unmerged delta against main (including first pushes), never just the last fix commit. Empty/unknown diffs and main dispatches run everything. Changes detection is a job, never an `on:paths` filter, so required contexts are reported. After a merge, automerge.yml dispatches CI on main (the combination check), `deploy.yml` and, for server paths, `deploy-server.yml`. A newer main run cancels an older one still queued or running (`ci.yml`'s concurrency), so main's CI judges only the newest commit and no longer queues one run per merge or holds runners from ship branches; `red-main` skips a cancelled run and the newest one opens or closes the issue; the heartbeat's Main CI line skips cancelled runs and `ci-autofix.yml` acts only on a failed one (a cancelled run's conclusion is `cancelled`). A `ship/**` push run is never cancelled (automerge merges on that exact run), and nothing waits for main's CI before merging. Deploys and the smoke are separate workflows with their own groups (`pages`, `deploy-server`, `smoke-<ref>`, all `cancel-in-progress: false`): GitHub replaces a pending one with a newer one but never cancels one that has started. Rendered scenarios, including `world-inputs`, run daily on the owner's Mac (`dev/daily/jobs.ts`), outside CI.
- Live deployment smoke: `node dev/live-smoke.ts --url https://boogle.club/ [--build <Pages SHA>]`. The browserless Node probe verifies entry assets, Pages/server identity and an isolated room action round-trip (server identity wait up to 5 minutes, one round-trip retry). Then `node dev/live-boot.ts --url <site>` opens the game once (headless Chromium, a `smoke-boot-N` room, no Jump in) and reads its boot marks: `interactive` passes; a startup failure after `boot:gpu` or a file that did not load fails; no WebGPU warns "unproven" (a GitHub annotation) and passes unless the page threw. `deploy.yml` runs the same probe `--offline` (only the page's origin loads; no room server) on the built `dist` (`vite preview`) before `deploy-pages`, so a build that cannot boot never replaces the live site; it does not lint again (CI linted the tree). `smoke.yml` retains issue reporting. Two-player rendered smoke runs daily on the Mac via `dev/daily/jobs.ts`, with the full ball/hash checks; it is absent from CI Smoke. See [live smoke](#live-smoke) for independent server source identity.

### Unit test settings

`dev/test-env.ts` sets each run's mode; the fuzz knobs are read in `test/helpers/fuzz.ts`.

| Mode | Where | Rail audit | Every-offset sweeps | Save checks, fuzz seeds |
| --- | --- | --- | --- | --- |
| local | `npm run test:unit`, `npm run check`, pre-push | off | every 16th offset | 500 ticks; each file's own seeds |
| ci | CI's `unit` job on main and on any ship that touches lockstep or a review path (`test:unit -- --ci`, four `--test-shard`s) | on | every offset | 500 ticks; each file's own seeds |
| ship | CI's `unit` job on every other ship (`test:unit -- --ship`, one job, only `UNIT_ONLY`'s files) | on | every 16th offset | 500 ticks; the first of each fuzz's own seeds (`FUZZ_FIRST_SEED`) |
| long | `npm run test:long`, nightly in `unit-long.yml` (three shards, 10 minutes a test; a red shard opens or updates the `unit-long` issue) | on | every offset | 2,500 ticks; the R3a review's five seeds (`FUZZ_SEEDS`) in place of each fuzz's own; the greybox route's gate fuzzes at 20,000 ticks (`ROUTE_GATES`) |

- Which run a ship gets (`dev/ci/unit-select.ts`, in CI's `changes` job): the full suite (`ci`, four shards) when the diff is empty, deletes a file, touches `src/sim`, `src/net`, `src/world`, `src/ecs`, `server/src` (the review list in `dev/review-stamp.ts`), a test that reaches them, `test/helpers/`, `test/fixtures/`, `dev/ci/`, `dev/test-env.ts`, `dev/test-unit.ts`, package or lock files, `tsconfig`, `vite.config` or `ci.yml`; otherwise one `ship` job with the tests that import a changed file plus `CORE_TESTS` (the light tests that read source rather than import it). Main always runs `ci`. A test reached only dynamically, or by a file read outside the core, is proven by main's run minutes after the merge.
- The audit (`src/ecs/world.ts`) re-serializes every row around every system run and throws on a write that skipped `mut()` or a value off schema; it never writes, so an unaudited world steps and hashes the same. Local runs preload `test/helpers/rail-no-audit.ts`, which rewrites the rail drivers' `createRailwayWorld({ audit: true })` calls in memory (`src/sim/railway-drive.ts`; nothing in `src/` reads a flag). `server/`'s `npm test` preloads it too, so it is unaudited locally; CI's `server` job and `deploy-server.yml` set `RAIL_AUDIT=1` and audit it. A test that builds its own audited world keeps it. After changing a rule's writes, run `node --test <file>` (audited) or `npm run test:unit -- --ci` before pushing; CI's `unit` fails it otherwise.
- The sampled sweeps (`test/railway-r3a-adversarial.test.ts`: Q7, the rivet and the railhead's stop moved at each offset) step the base run every tick and seed each branch by its offset, so a local run checks a subset of CI's offsets, never different ones.
- The greybox route's gates (`test/railway-route-rules.test.ts`) run 3,000 ticks a fuzz in every mode but long, every asserted gate still asserted; the long mode's `ROUTE_GATES=1` runs them at 20,000 ticks on the same four ruled seeds. Run that long version (`ROUTE_GATES=1` with the long mode's settings, or `npm run test:long`) and paste its output into the ship's report before the route's step 3 ships and before any later change to the train rules ships.
- A new long fuzz reads its length, seeds and stride from `test/helpers/fuzz.ts` and keeps its local default under a few seconds; `--test-timeout` does not stop a synchronous test.
- The entry points `npm run test:unit`, `check`, `check:full`, `level-check`, `daily` and the pre-push gate import `dev/node-version.ts` first: on a Node older than `.nvmrc`'s they re-run under nvm's newest Node of that major (its bin first on PATH, so every step below uses it), and with none installed exit 1 saying which Node to use. `dev/ship-queue.sh` takes the same Node from `node dev/node-version.ts --bin`. No `engine-strict`: npm applies it only to installs, never to `npm run`, so it would not stop a script on the wrong Node, and it would fail `npm ci` on any machine whose Node is not 26 rather than say what to do.
