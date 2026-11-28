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
- Doors and debt files may freely export ordinary helpers and pure queries (owner, 28 November,
  `docs/decisions-process.md#d-2026-11-28-process-audit-six-fixes`): the frozen public-surface export list
  (`boogle/prefab-public-surface`), specifier binding-count ratchet (`prefab-specifiers.ts`, `doorCounts`), and
  cross-file legacy importer-count graph (`prefab-constructors.ts`, `prefab-values.ts`) are retired. Direct
  re-exports of raw capability modules from doors remain forbidden.
- `boogle/records-are-data`: content imports/re-exports only prefab
  `types.ts`/`names.ts`/`authoring.ts`/`greybox-constants.ts`, `src/constants.ts`,
  `src/math-pure.ts`, and explicitly listed pure layout helpers (`place/layout.ts`, `entities/railway/line2-path.ts`,
  `entities/route-greybox/massing.ts`'s shared coordinates, `entities/route-greybox/leg2-layout.ts`'s coordinates/copy,
  and `content/levels/leg2.ts`'s pure authoring shared with the Gorge level).
  No three.js (even inline `import('three').Mesh` types), browser/DOM globals or unknown/computed dynamic imports.
  Scope analysis checks every reference to browser globals, including `globalThis` itself, so member access,
  computed access and destructuring all fail at their source. Only runtime local definitions count as shadows:
  ambient `declare`, type bindings and erased imports do not. Local `origin` and local `globalThis` objects are
  allowed. The compiler separately
  rejects non-JSON exported values; compiled JSON remains committed.
- Catalogue record/byte totals and per-area numbers are reported by the prefab tests and `npm run prefabs -- --check`,
  without hard content ceilings ([owner call, 14 November](owner-calls.md#no-limits-ahead-of-a-measured-problem)).
  Add a content limit only for a measured performance problem, sized from and citing that measurement.
  Duplicate validation, accidental per-placement definition duplication and stale artifacts remain defects.
- `dev/lint/prefab-debt.json` version 8 lists legacy collider/seat files with `{ count, reason }` (counts are direct
  module-edge and raw-call violations). Lint and registry reject excess violations and require fewer violations to
  **lower the count** (remove a zero entry). Against a matching version-8 base (`git show origin/main:dev/lint/prefab-debt.json`),
  registry rejects new file entries or per-file count growth. Every entry needs `YYYY-MM-DD: reason`. Core prefab
  rules cannot be disabled by comments. Signs/interactions use the step-9 registration ratchet below (without frozen
  export lists); Godot proof remains step 14.

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

### Sign and interaction records (prefab step 9)

`boogle/signs-from-records` and `boogle/interactions-from-records` reject raw `signBoard` and
`registerInteractable` acquisition/calls outside their runtime implementations and counted legacy files.
Named aliases, namespace/dynamic acquisitions, re-exports and direct member calls are included; comment
suppressors cannot open these doors. Named query helpers and ordinary helper exports in the same modules stay free.

`dev/lint/prefab-registrations.json` seeds only existing APIs from the task's local base, in separate sign and
interaction lists so it cannot inflate collider/seat debt. Registry ratchets file identities, site counts and their existing runtime consumer files.
New consumers of legacy registration factories are rejected, as are direct imports of the sign builder
outside `instantiate`. These new consumer lists use exact file identities, a stricter guard than the
earlier collider/seat importer counts.
Zero entries are removed. New handler names live on records; their functions and unchanged authored copy
stay in the owning view. `instantiate` returns enabled targets for the view's existing interaction provider.
