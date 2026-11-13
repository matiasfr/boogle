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
  exemptions. One explicit mixed-helper data API is allowed: static named `span` from route-greybox/boxes.ts
  (with erased type companions). Its descriptor math creates no bodies. Namespace/default imports and the
  collider-building helper exports remain restricted; this does not free a physics/seat module.
  The native Oxc resolver (already locked, now a direct dev dependency) resolves actual files,
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
  removed names must be removed from the record. A new barrel cannot import a construction capability, and a trusted barrel
  cannot invent a new surface: this closes laundering without guessing alias/function-body provenance. The
  declared instantiate API stays open for record-authored content. Existing construction APIs are additionally
  constrained by the importer ratchet below; public names alone are not permission for new consumers.
- `dev/lint/prefab-constructors.ts` computes construction capabilities in debt files and discovered
  OwnedView-producing factories. The call fixed point includes their private helpers; ordinary service/loader
  bodies elsewhere do not expand the closure. The record-only instantiate door remains open.
  `prefab-values.ts` tracks resolved module/callable identities through await, Promise.all/allSettled, array/object
  patterns (including aliases/rest), then callbacks, local assignments and aggregate fields. Function results
  are not automatically aliases of their factories. Dynamic locals re-exported directly or in aggregates retain
  the same provider identities as static namespace barrels. Proved constant data is distinguished from module APIs.
  Resolved dynamic acquisitions record the members actually selected, including destructuring, casts, await,
  Promise.all and then callbacks. Reading `me` does not acquire unused `enterIsland`. Nested namespace reads
  retain leaf selection. Only an opaque/escaped namespace falls back to its whole construction surface;
  passing an already selected value to another API does not acquire its module's other members.
  Unknown consumers, opaque arguments, unresolved imports and value-analysis bounds fail closed: importing or
  module-carrying debt exports are counted as both capabilities. Lint/registry print the affected files;
  [the complete current list and before/after audit](../plans/prefab-data-step-5-dynamic-audit.md) shows what to simplify.
  The bounded value domain allows eight aggregate levels and 24 fixed-point passes; exceeding either is not a waiver.
  `NOT_CONSTRUCTORS` and `NOT_CONSTRUCTION_EXPORTS` are exemption **candidates**, never unconditional stops.
  Their unpruned debt-local closure must reach neither allocation/seat-registration endpoints nor unresolved
  dynamic use. An unsafe candidate is counted automatically. This keeps OwnedView's ownership/attachment/disposal
  factory free while restoring actual constructors that merely use an owner. Engine/backend createBody,
  setShapes (collision-shape replacement) and registerSeat are construction terminals. Typed Shape → Body
  callback parameters also represent injected body factories. Callable/module arguments taint their supplying
  caller, never every invocation of the generic receiving helper. Query-only physics/terrain calls and pure
  geometry/positioning helpers do not consume construction budgets. The terminal implementations and instantiate are closed doors, not ordinary
  placed-content factories. Query/attachment APIs create no bodies by those contracts.
  `legacy["file#export"]` stores only the number of distinct importing files, including forwarding barrels.
  Named, namespace, dynamic and require acquisitions resolve through aliases/barrels. Higher counts fail naming
  `src/prefab/instantiate.ts`; lower counts fail with **lower the count**. Computed export keys must match the
  record; registry ratchets each count and forbids new keys. The full OwnedView + instantiate + entity/onStart
  feature fixture remains passing, as does a DOM-only HUD fixture importing lifecycle, entity and named player
  state APIs plus a truly erased physics type. Runtime raw physics/seat module imports remain forbidden;
  HUD state reads use named player exports or `src/player/state.ts`, not whole construction namespaces.
  The [precise-guard audit](../plans/prefab-data-step-5-precise-audit.md) records current counts and the eight
  ordinary fixture groups; earlier importer totals are historical.
  `forwards["file#export"]` freezes construction re-export binding/provider
  identities, including nested namespaces; added surfaces fail even in already-importing barrels, and removals
  require pruning. No importer paths are committed. The derivative cache fingerprints source, analyzer/value
  model/visitor code, providers, lockfile and tsconfig. The reference-taint/storage-edge design was rejected:
  immutable data, query functions and mesh-only helpers do not inherit capabilities from neighbouring arguments.
- `dev/lint/prefab-specifiers.ts` adds only a binding-set guard to the restored construction model. A capability
  import specifier (including an additional import alias) counts once, and each literal member name selected
  directly on a namespace/default import counts once per binding. Scope identity excludes shadowing locals.
  Repeated reads or another call to an already imported query do not grow this set; no objects, constants,
  parameters, private helper results or stored references are tainted. Normal debt counts combine these units
  with existing module-edge/direct-call checks. Named doors have separate `doorCounts` for this binding set.
  The round-six `createBody as allocate` addition fails at the import-only step, before hiddenMaker exists.
- `boogle/records-are-data`: content imports/re-exports only prefab `types.ts`/`names.ts`, `src/constants.ts`,
  `src/math-pure.ts`, and explicitly listed pure layout helpers (`place/layout.ts`, `entities/railway/line2-path.ts`,
  `entities/route-greybox/massing.ts`'s shared coordinates and `entities/route-greybox/leg2-layout.ts`'s layout).
  No three.js (even inline `import('three').Mesh` types), browser/DOM globals or unknown/computed dynamic imports.
  Scope analysis checks every reference to browser globals, including `globalThis` itself, so member access,
  computed access and destructuring all fail at their source. Only runtime local definitions count as shadows:
  ambient `declare`, type bindings and erased imports do not. Local `origin` and local `globalThis` objects are
  allowed. The compiler separately
  rejects non-JSON exported values; compiled JSON remains committed.
- `dev/lint/prefab-debt.json` version 7 lists collider/seat files with `{ count, reason, exports }`, fixed door
  public surfaces and compact computed construction/importer counts. Dropping the schema or counts fails. Lint and registry
  reject excess violations and require fewer violations to **lower the count** (remove a zero entry). Registry
  also rejects any new file identity or per-file count growth, even when another file/count shrinks. Against a
  base read directly with `git show origin/main:dev/lint/prefab-debt.json`, a matching schema ratchets those
  exact records. A missing/older schema bootstraps with internal consistency only. No merge base, deep history,
  fetch or namespace exemption is needed; this supports CI's depth-one trees.
  Every entry needs `YYYY-MM-DD: reason`; reasons do not authorize growth. All four prefab rules cannot be
  disabled by comments. Signs/interactions are deferred to prefab step 9; Godot proof to step 14.
  Zero binding counts are valid for named doors; all counts and public names still only shrink against a
  current-schema base. Versions 5/6 used different counting contracts and bootstrap as older schemas.

The owner accepts these prefab-enforcement residuals:

- Importer swaps that preserve the importing-file count.
- Reflection.
- Deliberate indirection inside an already-exempt file without a new capability specifier.
- Count-preserving rewrites, including additional calls from an already-counted legacy importer.

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
