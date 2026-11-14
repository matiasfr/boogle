# Prefab catalogue budget follow-up — 14 November 2026

Owner call: [No limits ahead of a measured problem](../agents/owner-calls.md#no-limits-ahead-of-a-measured-problem),
recorded verbatim at the top of the standing calls. DESIGN.md principle: **Small and readable** (measure before
optimizing). Tooling only, no game state or sync-kind change; no sim, net, server, WORLD_NS, content or golden changes.

## Removed and retained

- Removed the failing **200 records / 350,000 bytes** assertions and their synthetic overflow probes from
  `test/prefab-portability.test.ts`. The proposed 320-record replacement is superseded too.
- Kept total, per-area standalone definition bytes and per-file physical byte diagnostics in that test.
  The compiler's `--check` retains its totals/freshness verdict and now prints the same per-area diagnostics,
  taken from the compiled definitions so shared-dimension compression is reflected consistently.
- Kept startup's **10 consumers / 1 catalogue validation / 0 direct revalidations**, its static single-owner/import
  checks, duplicate-key/reference validation, authored-number checks, shared-record/placement goldens and stale
  artifact detection. No arbitrary replacement size tripwire: existing structural checks remain defect checks;
  no test interprets ordinary catalogue growth as a defect.
- Updated the lint contract, prefab plan and consolidation report to distinguish the retired ceilings from
  historical measurements. Current totals remain **193 records / 12 levels / 243,652 compiled bytes**.

## Other hard content ceilings found

**None found** beyond the two removed prefab assertions. Searched `test/`, `server/test/`, `dev/lint/`,
`dev/registry/`, repo test/lint files and related budget owners with `rg` for budget/ceiling/limit/MAX,
record/byte/prop/placement/mesh/draw/triangle counts and numeric upper-bound assertions. Unchanged nearby guards:

| Location | What remains | Why it is outside this content-ceiling change |
| --- | --- | --- |
| `dev/lint/runner.ts`, `dev/lint/safety.ts`, `dev/registry/prefab-debt.ts`, `dev/registry/prefab-registrations.ts`, `dev/registry/debt.ts` | Suppression, construction/importer, registration and architecture debt ratchets | Count architectural violations, not allowed props or placements |
| `dev/registry/agent-docs.ts` | Root AGENTS.md 3,000 bytes / CLAUDE.md 1,000 bytes | Agent launch-context budget, not game content |
| `test/helpers/island-labels.ts:51` | Fewer than 300,000 label-search steps | Algorithmic search-work guard, not number of map labels |
| `test/ecs-budget.test.ts`, `test/replicate-budget.test.ts`, `test/helpers/budget.ts` | Measured timing regression guards and warning targets | Timings, not content-count ceilings |
| `dev/assets/manifest.ts`, `test/asset-size-warnings.test.ts` | Asset/download/texture size targets | Already warnings; tests verify warning behavior, not reject larger assets |
| `dev/level/check.ts` | Placed-object, collider-sphere and body budgets | Already report-only |

Correctness bounds (including index/geometry/LOD assertions), network/recovery/rate/storage limits and sim
invariants were excluded. No other guard was changed.

## Validation and evidence

Rebased implementation commit: `b2f9846df2adb6c5c3b0f10a033179b09b8ac900`, onto local `origin/main`
`4fc3dc35d69d3d97ffa01c07f71ed89a7a0ae2f2` (#1782, including #1781's consolidation). No conflicts.

- `npx prettier --write` ran on every changed file (the repo's `.prettierignore` excludes Markdown).
  Changed-file lint passed with zero problems; `git diff --check` passed.
- [Rebased full check](../../.look/prefab-budget-relax/check-rebased.log): **1,926 passing tests**, one existing
  TODO, zero failures; lint, typecheck, registry, level-check, assets, compiler freshness and production build passed.
- [Rebased prefab suite](../../.look/prefab-budget-relax/prefab-tests-rebased.log): **227/227 passed**, zero failures,
  using `UNIT_ONLY` with `npm run test:unit` and the repo's local test settings. The first, pre-rebase dedicated run
  also passed 227/227 with the sim import hook. No goldens were regenerated.
- [Rebased standalone registry](../../.look/prefab-budget-relax/registry-rebased.log): passed.
- [Review stamp](../../.look/prefab-budget-relax/review-stamp-rebased.log): **`0bef3cebfba2`**, unchanged by rebase.
  `test/prefab-portability.test.ts` is classified `review` for the removed assertions because its import closure
  reaches review paths. This is the tool's classification, not an independent review; that review remains for
  the caller before any future merge. No push or ship was run.
- Compiler and test diagnostics agree: greybox **7 / 7,200**, halts **12 / 2,414**, railway **2 / 2,442**, town
  **172 / 46,724** (records / standalone compiled definition bytes). Physical total remains **243,652 bytes**.

No browser run is required by the docs/tooling routes: this changes no player-visible
output or runtime behavior. No images opened, visual question, bot failures or broker evidence manifests;
visuals, real-time feel, device performance and remote CI are unverified.

Work stayed on `codex/prefab-budget-relax` in this worktree. Network was restricted to the local broker by the
brief. `npm run inflight` was replaced with local ref/status inspection because its implementation fetches and
calls GitHub. The requested default `npm run review-stamp -- .` failed locally opening `FETCH_HEAD` with
`Operation not permitted`; its successful invocation used the supported `--no-fetch` flag to respect the network
restriction. No successful fetch or GitHub query was made. Rebase used the locally available `origin/main`;
its remote freshness was not independently verified.
