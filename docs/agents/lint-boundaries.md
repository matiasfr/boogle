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
- Prefab doors (`policy.ts`, `safety.ts`): `boogle/colliders-from-records` allows `addStatic`, `addStatics`,
  `staticBody`, `createBody`, `slab` only in `src/prefab/instantiate.ts`, `src/physics/`, `src/place/land.ts` and the explicit
  collider debt files. `boogle/seats-from-records` allows `registerSeat` only in `src/prefab/instantiate.ts` and
  seat debt files. Imports of these APIs are forbidden too: named/renamed, namespace, re-export, dynamic import
  and require. This closes local aliasing at the import. The collider rule also covers `drawWorksBoxes`,
  `drawGreyBoxes`, `plank`, `buildLand` and `staticSpheresBody`; namespace/dynamic/require access to their modules
  is a capability import. Pure named helpers and type-only imports stay available. New prefab-folder wrappers
  have no exemption. Both rules include prototypes/debug; raw calls also count against existing debt.
  Use `npm run prefab:new -- <area>.<name>`, records/placements in `src/content/`, procedural visuals in
  `src/prefab/builders/` and the owning view's `instantiate` call. This is not a blanket mesh-constructor ban.
- `boogle/records-are-data`: content imports/re-exports only prefab `types.ts`/`names.ts`, `src/constants.ts`,
  `src/math-pure.ts`, and explicitly listed pure layout helpers (`place/layout.ts`, `entities/railway/line2-path.ts`).
  No three.js (even inline `import('three').Mesh` types), browser/DOM globals or unknown/computed dynamic imports.
  Browser globals are unresolved scope references: local names such as `origin`, function parameters and imports
  do not count as browser access. The compiler separately
  rejects non-JSON exported values; compiled JSON remains committed.
- `dev/lint/prefab-debt.json` lists existing collider/seat files with `{ count, reason }` budgets. Lint and registry
  reject excess violations and require fewer violations to **lower the count** (remove a zero entry). Registry
  also rejects any new file identity or per-file count growth, even when another file/count shrinks. Against a
  base predating count budgets, it derives the baseline from matching imports/calls in that local base, including
  the old reason-only list's transition. Thereafter the recorded counts bind. No fetch or namespace exemption.
  Every entry needs `YYYY-MM-DD: reason`; reasons do not authorize growth. These three prefab rules cannot be
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
