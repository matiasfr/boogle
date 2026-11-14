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

Pending final checks. No browser run is required by the docs/tooling routes: this changes no player-visible
output or runtime behavior. No images opened, visual question, bot failures or broker evidence manifests;
visuals, real-time feel, device performance and remote CI are unverified.

Work stayed on `codex/prefab-budget-relax` in this worktree. Network was restricted to the local broker by the
brief, so no fetch, GitHub query, push or ship was run. `npm run inflight` was replaced with local ref/status
inspection because its implementation fetches and calls GitHub. Rebase uses the locally available `origin/main`.
