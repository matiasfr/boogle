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
