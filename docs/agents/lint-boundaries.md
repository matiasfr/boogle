Before changing module dependencies, services or lockstep boundaries, read this lint contract.

## Lint boundaries (`dev/lint/policy.ts`)

- `LOCKSTEP_FILES` retains the conservative deterministic-math guard on pure rules and prediction dependencies. No lockstep state remains; see `lockstep.md` for server replay and shared `railApply` prediction requirements. This step does not relax the existing lint list.
- Server checkpoint registration and rule ticks stay in their headless owners (`src/world/rules/`, with the existing railway-server exception). Clients mirror state. The old classic operation-registration API is retired; retained lint selectors do not authorize recreating it.
- Rules import only `src/sim/`, `../grid.ts` and sibling rules at runtime; Server-kind registration may import types from `../server-ops.ts` and `../replicate-server.ts`; `src/sim/` imports nothing from `src/`.
- E (`src/ecs/`) is reached only through `src/ecs/index.ts`, which only `src/sim/` and `src/world/` import, and `src/adapters/` only its types (the ban covers `import()`): a view reads rows through `ReadWorld` (AR-6).
- Features don't import other features: shared code moves to `src/` (an adapter, `src/player/`, ...).
- `src/world/*.ts` and `src/net/` stay headless: no `three`, `src/render/`, `src/player/` or `src/features/`.
- Outside `src/proto/` and `src/debug/`, reach them with `import()`; the only static ways in are `proto/flags.ts` and `proto/mark.ts`.
- One door: `new WebSocket`, `AudioContext` and `requestAnimationFrame` only on `DOORS`' allow-lists; a second frame loop is an `onFrame`.
- Input: outside `INPUT_LAYER` and `INPUT_ALLOW` (`policy.ts`, each entry with its reason) nothing names a key/mouse/wheel/touch/pointer/pad event, `getGamepads` or a `KeyboardEvent`-style type (`boogle/input-through-actions`, owner call in `owner-calls.md`). Use `registerAction` (`key`, `mouse`, `touch`), `onKey`, `onMenuKey` (menus) or `touchHold` in `src/player/controls.ts`. A text field's own key handler takes `boogle-disable-next-line boogle/input-through-actions -- reason`.
- No WebGL-only three.js APIs in `src/` (list in `src/render/README.md`, "Materials").
- Prefab capability modules (`dev/lint/prefab-boundaries.ts`, `CAPABILITIES`): the body engine/backend, physics
  service, land, solid-box helpers, native Rapier package modules and seat service are whole-module capabilities. `boogle/colliders-from-records`
  and `boogle/seats-from-records` reject **every runtime import** of their resolved file outside the explicit
  `PREFAB_DOORS` and counted debt files, regardless of imported names or later calls. There are no directory
  exemptions. The native Oxc resolver (already locked, now a direct dev dependency) resolves actual files,
  extensionless paths, index files, tsconfig paths, query suffixes and symlinks; protected files are canonicalized
  by device/inode too, so case-insensitive paths and hard links retain the same identity. The older general boundary
  rules remain lexical matchers and had no filesystem resolver to reuse. Named, namespace, re-export, dynamic
  and require edges use that same resolver in lint and registry. Unresolved runtime loaders fail closed;
  aliasing require, CommonJS module globals and opaque `import.meta` loaders (including Vite globs and hot APIs)
  also fail. Only `import.meta.env`/`url` data reads are exempt from the opaque-loader guard.
  Only truly erased declarations/expressions are
  exempt: `import type` and `export type` erase, but `import { type T }` and `export { type T } from` still load.
  Start new content with `prefab:new`, records/placements and the owning view's `instantiate` call.
- `boogle/prefab-public-surface` chooses the review's explicit-public-surface rule: every door and debt file's
  current runtime export names are recorded, and **any new export name fails**, including defaults, renamed
  locals and exported wrapper functions, even before a consumer exists. Runtime capability re-exports and
  unbounded star exports are forbidden. Registry ratchets these public names as well as file identities/counts;
  removed names must be removed from the record. A new barrel cannot import a capability, and a trusted barrel
  cannot invent a new surface: this closes laundering without guessing alias/function-body provenance. The
  declared instantiate API stays open for record-authored content. Existing construction APIs are additionally
  constrained by the importer ratchet below; public names alone are not permission for new consumers.
- `dev/lint/prefab-constructors.ts` computes a targeted call graph, not the whole-program reference closure.
  A construction export belongs to a debt file and its own body calls a capability-module API or another
  construction export. The fixed point runs over debt implementations only; door implementations and non-debt
  function bodies do not propagate construction. Call aliases and re-export/barrel identities resolve normally.
  Nested callbacks lexically inside a constructor body count; arbitrary callback arguments, type dependency bags,
  state references and loader/registry callbacks do not. The short `NOT_CONSTRUCTORS` list contains exactly
  `src/entity/entity.ts`: it attaches already-built bodies and schedules entity callbacks, so registration and
  spawning finished record-authored entities must remain available to ordinary features. No folder exemption.
  `legacy["file#export"]` stores only the number of distinct importing files, including forwarding barrels.
  Named, namespace, dynamic and require acquisitions resolve to constructor identities through aliases/barrels;
  wrapper function bodies outside debt do not extend this closure. Higher counts fail naming
  `src/prefab/instantiate.ts`; lower counts fail with **lower the count**. Computed export keys must match the
  record; registry ratchets each count and forbids new keys. A new ordinary feature may import entity/loop
  registration and use the prefab door. Counts deliberately permit swapping one importer for another;
  reflection passes. Existing approved consumers can reuse APIs. Unexported-helper indirection, non-debt wrapper
  bodies and generated/global effects are outside this narrow count rule and require review. The unchanged
  capability-module import ban, provider public surfaces and per-file violation budgets still bind them.
  A derivative cache fingerprints code, analyzer, lockfile, tsconfig and providers; no importer paths are committed.
- `boogle/records-are-data`: content imports/re-exports only prefab `types.ts`/`names.ts`, `src/constants.ts`,
  `src/math-pure.ts`, and explicitly listed pure layout helpers (`place/layout.ts`, `entities/railway/line2-path.ts`).
  No three.js (even inline `import('three').Mesh` types), browser/DOM globals or unknown/computed dynamic imports.
  Scope analysis checks every reference to browser globals, including `globalThis` itself, so member access,
  computed access and destructuring all fail at their source. Only runtime local definitions count as shadows:
  ambient `declare`, type bindings and erased imports do not. Local `origin` and local `globalThis` objects are
  allowed. The compiler separately
  rejects non-JSON exported values; compiled JSON remains committed.
- `dev/lint/prefab-debt.json` version 4 lists collider/seat files with `{ count, reason, exports }`, fixed door
  public surfaces and compact computed construction/importer counts. Dropping the schema or counts fails. Lint and registry
  reject excess violations and require fewer violations to **lower the count** (remove a zero entry). Registry
  also rejects any new file identity or per-file count growth, even when another file/count shrinks. Against a
  base predating the structural schema, it derives counts and exported names from the branch/base common
  ancestor's source, so unrelated main changes cannot masquerade as new branch exports during bootstrap.
  Thereafter the recorded counts and export names bind. No fetch or namespace exemption.
  Every entry needs `YYYY-MM-DD: reason`; reasons do not authorize growth. All four prefab rules cannot be
  disabled by comments. Signs/interactions are deferred to prefab step 9; Godot proof to step 14.

`npm run lint -- [files...]` runs native Oxlint, oxlint-tsgolint and the repo's oxc-parser safety checks together.
Use that command in hooks and CI: calling Oxlint alone omits custom protections. `.oxlintrc.json` holds the native
baseline; the runner adds native safety overrides from `policy.ts`, which owns the only `LOCKSTEP_FILES` list.
Selectors use esquery and imports use gitignore matching, preserving dynamic/side-effect and physics type-import rules
without ESLint or Oxlint's alpha plugin API. `boogle/js-language` uses Acorn to enforce ES2022 JavaScript, with ES2024
for `dev/**/*.mjs`; CommonJS retains its latest-language scope and duplicate-parameter/octal checks.

Native suppressions use `oxlint-disable-next-line typescript/no-explicit-any` (or the native core rule name).
Custom ones use `boogle-disable-next-line no-restricted-syntax` (or another exact policy rule ID); line and block
disable/enable forms also work. Name each rule explicitly; unused directives fail lint. Entity counts live in
`lint-suppressions.json`: excess or stale counts fail, `--prune-suppressions` only shrinks, and registry rejects growth
and deleted entries. Hooks alone use `--pass-on-unpruned-suppressions` while editing.

Type-aware `await-thenable`, `return-await`, `no-floating-promises` and `no-misused-promises` are errors.
All misused-promise checks stay enabled, including void callbacks. The only known-safe-call exception is the
`@types/node` `test` declaration in `test/**/*.ts`: Node owns registration failure reporting. Other promises in tests
are still checked. Use `src/async.ts`'s `background(task, label)` for non-blocking work that needs rejection reporting;
use explicit `void` only when failure is already handled or the operation cannot reject. Never add an await to a
frame/tick dispatch just to pass lint. Classification and rationale: `docs/research/linter-replacement.md`.
