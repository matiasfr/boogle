# Linter replacement feasibility

> **Verdict:** Oxlint with a small dev/lint runner replaces ESLint.
> **Top recommendations:** none; the replacement is done.
> **Status:** adopted.

## Implementation status — 4 November 2026

The owner's replacement decision is implemented: Oxlint **1.91.0** and oxlint-tsgolint **7.0.2005**, with no ESLint,
`@eslint/js`, or TypeScript-ESLint packages. Native rules cover the baseline and native safety rules; a small
`dev/lint/` runner uses oxc-parser, esquery and gitignore matching for the exact selectors, imports and entity ratchet.
This retains the established matching semantics without the alpha jsPlugins API or an ESLint provider. Acorn's
`boogle/js-language` guard restores the ES2022/ES2024 split (and CommonJS parser checks). `policy.ts` owns the only
`LOCKSTEP_FILES`, read by atlas and tests. All 27 in-scope directives in 21 files are converted; unused directives
fail. The 20 entity allowances are unchanged, with prune, stale/deleted-entry and archived-base no-growth checks.

Parity was measured against this worktree's **current ESLint before removal**, including main's fixed sync patterns.
The kept `test/lint-determinism.test.ts` and JSON fixtures produce this final table:

| Assertion group                  | ESLint caught / allowed | Replacement caught / allowed |
| -------------------------------- | ----------------------: | ---------------------------: |
| Restricted imports               |                 19 / 16 |                      19 / 16 |
| Physics type-import rule         |                   1 / 2 |                        1 / 2 |
| Lockstep properties              |                  30 / 1 |                       30 / 1 |
| Restricted globals               |                  14 / 0 |                       14 / 0 |
| GL, DOORS and lockstep selectors |                 43 / 10 |                      43 / 10 |
| Entity rule and exemptions       |                  3 / 20 |                       3 / 20 |
| Debugger / global ignores        |                   1 / 5 |                        1 / 5 |
| Explicit any / suppression       |                   1 / 1 |                        1 / 1 |
| Unused directive                 |                   1 / 0 |                        1 / 0 |
| Underscore unused variables      |                   2 / 0 |                        2 / 0 |
| **170 fixtures**                 |            **115 / 55** |                 **115 / 55** |
| **Two language probes**          |               **1 / 1** |                    **1 / 1** |

**Zero misses and zero suppression false positives.** Additional regressions cover same-line block directives,
invalid multiline disable-line comments, TypeScript import-equals, re-exports, all sync paths, unmatched targets,
root-only versus nested dependency exclusions, JavaScript/CJS parsing, and entity budget modes.

Type-aware `await-thenable` and `return-await` (`in-try-catch`) are enabled: zero findings, with deliberate mistakes
caught in isolated sim and WebGPU probes. Existing lockstep files were clean. The exploratory scan found
`no-floating-promises` **343**, `no-misused-promises` **21**, `no-unnecessary-type-assertion` **272**, and
`only-throw-error` **2**; these were initially left off. Floating/misused findings included WebGPU `renderer.compute` dispatch
(`src/render/water/fft.ts:308,399`), async event callbacks (`src/features/pause.ts:229,316`), and the browser fallback
for pointer lock (`src/player/input.ts:64`). Those need behavior decisions, not automatic awaits or blanket voids.
Assertion churn and rethrowing saved unknown failures in `dev/look/coop-warp.ts:96,183` add no useful gate here.
No game behavior changed. tsgolint has no TypeScript 5/6 dependency or peer; the five compiler-API tools listed in
`typescript-7.md` are the remaining reason for canonical TypeScript 6.

Three-run CLI wall-time medians (whole / `src/features/ping.ts`): ESLint **9.701 / 0.536 s**;
the complete replacement, including type-aware checks, **1.540 / 0.348 s**. Whole runs were
15.992, 7.946, 9.701 s before and 1.609, 1.540, 1.520 s after; single-file runs were
0.536, 0.498, 0.632 s before and 0.367, 0.324, 0.348 s after. These are non-interleaved, shared-machine measurements,
not an idle-machine or CI speedup claim; earlier noisier replacement samples are retained locally.

`npm run check` passes, `npm ls` is clean, and `npm audit --offline` reports zero vulnerabilities. Matching cached
advisories to both lockfiles independently confirms **11 affected moderate package paths → 0**. Live advisories,
CI/deploy timing and gameplay were not tested; no browser or images are needed for tooling-only changes.
Local logs, baseline diagnostics, type findings and timings: `.look/oxlint-migration/`.

### Promise safety follow-up — 4 November 2026

Owner-approved follow-up: both `typescript/no-floating-promises` and `typescript/no-misused-promises` now run at
error. The recount against this branch's repository lint scope was **347 floating / 21 misused**, before cleanup.
The raw Oxlint scan also included the already-excluded server tree (382 / 23); this change preserves that scope.
Baseline diagnostics and sorted classification are in `.look/promise-rules/`.

| Floating promise kind | Count |
| --- | ---: |
| Node test registrations | 298 |
| Lazy module imports | 10 |
| Asset or interaction tasks | 8 |
| Completion observers | 7 |
| Initialized GPU dispatches | 6 |
| Renderer lifecycle | 4 |
| Room connection or presence | 4 |
| Handled UI or update tasks | 4 |
| Already-handled local saves | 3 |
| Shader precompiles | 3 |
| **Total** | **347** |

| Misused promise kind | Count |
| --- | ---: |
| DOM callbacks | 5 |
| Timer callbacks | 5 |
| Startup callbacks | 4 |
| Server callbacks | 3 |
| Interaction callback properties | 2 |
| Shot callback type | 1 |
| Browser compatibility conditional | 1 |
| **Total** | **21** |

`dev/lint/config.ts` exempts only calls to the `test` declaration from `@types/node`, only in `test/**/*.ts`, using
`allowForKnownSafeCalls`: the Node runner already owns these failures. No test-wide rule disabling or 298 mechanical
annotations. A local probe confirmed an imported alias is allowed while a same-named local async function and other
floating promises still fail. All `checksVoidReturn` checks remain on: only five findings are DOM callbacks, and
turning off argument checking would also hide lifecycle, timer and server mistakes. The probe also caught an async
DOM listener and a promise conditional. There are **no new inline suppressions**.

`src/async.ts` provides the shared `background(task, label)` idiom: work starts immediately at its existing call site,
and rejection is logged as a console error (retaining broker failure visibility). Explicit `void` marks handled saves,
downloads, clipboard/fullscreen refusal and non-rejecting observers. Installed three.js dispatches `compute`
synchronously after initialization; the six dispatch sites keep that ordering with `void`, with no frame/tick await.
Pointer lock retains the older void-returning browser path through a callable-`catch` check. No sim or world-rule
logic, player copy, recovery UI, room protocol or action ordering changes.

**Bug fixed separately:** readiness timing observers created orphan rejected promises when startup already handled
the renderer/physics readiness failure. Their rejection branches now defer to startup's existing handling.

**Deferred observation:** the pre-existing `Promise.all(...).then(play, splashDone)` in `src/main.ts` handles readiness
failure, but not rejection from `play()` itself. Choosing loading-screen recovery would change player-visible behavior;
it remains unchanged. The rule does not flag a two-handler `then`, so an inline suppression there would be unused.
Caught background failures are console errors rather than unhandled-rejection events; the existing unhandled-rejection
telemetry hook does not upload them. No new telemetry delivery path is introduced here.

Verification is recorded in the task's broker manifests and `.look/promise-rules/` logs. `check:full` is left to the
owner. No remote fetch, push or ship; `inflight` was omitted because it performs network access.

## Original feasibility study (historical)

**Recommendation: stay with ESLint for now.** Oxlint is the strongest candidate, but its fast native configuration loses protections. The compatibility port catches the tested restrictions, yet still depends on ESLint/TypeScript-ESLint, needs an alpha plugin API, differs on suppression comments, and loses the configured JavaScript language-version guard. Do not replace the gate merely because the clean tree passes. Biome requires more custom work and cannot reuse the JavaScript rules.

Study: 3 November 2026, base `66e22e10ae90faf423ec83a33d2d45dd4c12617e`, Node 24.11.1, macOS arm64. Versions: ESLint 10.14.0, TypeScript-ESLint 8.72.1, Oxlint 1.91.0, oxlint-tsgolint 7.0.2005, Biome 2.6.4. No production lint configuration or dependency changes. Only this report is committed.

## Experiment and parity

The throwaway tracked-tree copy and independent dependencies are in `.look/linter-study/tree`; scripts, configurations, JSON diagnostics and timings remain in `.look/linter-study/`. Installed cached packages with `npm install --prefer-offline --offline --no-audit --no-fund`; copied the npm cache into writable scratch storage first. No network requests. A local Git root in the copy prevents its parent's `.look/` ignore from hiding every file.

`port.ts` translates every flat-config block, retaining order, `files`, local `ignores` as `excludeFiles`, globals and rule options. Explicitly disables Oxlint's default categories. Native TS equivalents use `typescript/`; TS array-constructor/unused-expressions/unused-vars use the TS-aware core equivalents. Explicit `no-unused-vars: ["error", {}]` removes Oxlint’s default underscore exemptions: without this correction, the clean tree gains an unused-disable warning and underscore-unused variables lose coverage. Two additional underscore fixtures verify the correction. `ox-full.json` loads `linter-compat.ts` and `linter-entity.ts` through aliased `jsPlugins`:

- `compat/no-restricted-syntax` uses ESLint's actual selector rule. Native Oxlint has no equivalent generic selector rule. All 11 `glOnly` members, the three DOORS selectors, and the five lockstep selector shapes need this bridge or dedicated AST visitors. Changing them to simple property restrictions would lose node-shape, operator and allow-list semantics.
- `compat/no-restricted-imports` uses ESLint's actual rule. Native Oxlint unexpectedly rejects dynamic debug imports and a side-effect sync import. The first whole-tree attempt produced **35 extra diagnostics: 15 import differences and 20 entity suppressions**.
- `compat/ts-no-restricted-imports` uses TypeScript-ESLint's rule, preserving physics `allowTypeImports: true` separately from the core rule. Core restrictions still count static type imports.
- JS `no-dupe-args` and `no-octal` also use ESLint implementations; native parsing may subsume these, but equivalence is unproven. `no-new-symbol` has only an **off** entry. The entity rule reuses its original visitor plus a prototype count-budget adapter.

After bridging imports and budgets, both tools report **zero diagnostics on the original 735-file lint scope**. This is clean-tree parity, not a general equivalence proof. Fixture diagnostics are compared by file, line and normalized rule; message wording and spans differ. `probes.ts` restores every overwritten fixture in `finally`.

| Restriction / override coverage                                                                                                              | ESLint caught                             | Oxlint compatibility caught                                | Native Oxlint / gap                                |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------- |
| Core restricted imports: base Rapier/SIMD, proto/debug, headless world/net, game-world, rules, features, sim, netplay, entity state, backend | 17 positive cases                         | 17/17                                                      | Semantic differences; see below                    |
| Physics typed import rule                                                                                                                    | Value import; allows both type-only forms | Same                                                       | Rule absent from native port; blocker              |
| Rules/sim/state restricted globals                                                                                                           | 14/14                                     | 14/14                                                      | 14/14                                              |
| Lockstep properties, including all unsafe Math entries, crypto, clocks; grid and JS scope                                                    | 30/30                                     | 30/30                                                      | 30/30                                              |
| AST syntax: GL APIs, DOORS, exponentiation, Date, qualified globals                                                                          | 43/43                                     | 43/43                                                      | 0/43; selector replacement required                |
| Entity `onFrame`, `addBody`, `scene.add`                                                                                                     | 3/3                                       | 3/3                                                        | 0/3; custom rule required                          |
| Allowed imports, all nine door files, all 16 entity services, excluded folders, safe math                                                    | Allowed, except existing gaps below       | Same                                                       | Dynamic/side-effect import false positives         |
| Recommended debugger / explicit-any samples                                                                                                  | Both                                      | Both                                                       | Both                                               |
| Existing-style any/entity disables; unused directive warning                                                                                 | Honored/reported                          | Honored/reported with `--report-unused-disable-directives` | Enable unused-directive reporting explicitly       |
| Core import/selector disable comments on bridged aliases                                                                                     | Suppressed                                | **Two false positives**                                    | Translate directive names or preserve original IDs |
| ES2022 JS parser gate (`/a/v`); ES2024 dev `.mjs` exception                                                                                  | Rejects / allows                          | **Allows both: lost protection**                           | Needs a syntax-target guard                        |
| Entity budget excess / stale count                                                                                                           | Fails / fails                             | Fails / fails                                              | No native bulk-suppression mechanism               |

**170 fixture assertions:** compatibility has **zero missed ESLint catches and two extra catches** (the alias directives). This tests every restricted-rule/override group, not every possible recommended-rule AST. Two additional language-scope probes show a real miss: `/a/v` is rejected in ES2022 `.js` by ESLint but accepted by Oxlint; both accept it in ES2024 `dev/*.mjs`. A syntax-target guard is required (`language-type.json`). Full fixture details are in `parity.json`; budget evidence is in `extras.json`. The budget adapter was adjusted to report all violations on overflow, matching ESLint's all-or-nothing suppression. Production migration still needs prune support, deleted-entry checks and the hook's stale-budget relaxation; these were not implemented.

**Existing protection hole:** ESLint misses `import {registerOp} from './world/sync.ts'` outside rules and `registerState` from `../world/sync.ts` in a backend. `syncBan.group` contains `{js,ts}` braces, but the installed ESLint rule uses the `ignore` package's gitignore matching, which does not expand those braces. Native Oxlint catches these; the exact ESLint bridge reproduces the gap. Fix the pattern to separate `.js`/`.ts` entries (and test all three names) in a separate lint-config change. This report does not alter it.

**Biome stop point:** ran `biome init` and `biome migrate eslint --write` in the copy, then narrowed file scope and ran lint. Its migration says 80/97 rules migrated, but drops the import restriction options into bare `noRestrictedImports: error`. Seven deliberate safety violations yielded only the restricted-global catch; imports, Math.random, Math.sin, new Date, RAF and entity registration were missed. Unrelated empty-callback diagnostics are not protection parity. Whole-tree migration reports 158 errors. Unsupported migration rules include no-invalid-regexp, no-restricted-syntax, no-unexpected-multiline, TS no-unused-expressions/triple-slash-reference and boogle/use-an-entity; restricted-properties needs nursery opt-in. GritQL rewrites and a separate count ratchet would be required. No reason to pursue this over Oxlint here.

## Measurements

| Configuration | Whole tree: three runs (s) | Single file: three runs (s) |
| ------------- | -------------------------- | --------------------------- |
| eslint        | 5.797, 5.953, 5.739        | 0.378, 0.383, 0.374         |
| ox-native     | 0.072, 0.073, 0.071        | 0.043, 0.043, 0.044         |
| ox-load-only  | 0.420, 0.477, 0.415        | 0.448, 0.398, 0.387         |
| ox-full       | 0.780, 0.816, 0.795        | 0.449, 0.415, 0.418         |
| ox-type-aware | 1.086, 1.056, 1.020        | 0.651, 0.590, 0.614         |
| biome         | 0.343, 0.221, 0.218        | 0.063, 0.055, 0.054         |

Wall seconds, three fresh CLI processes per configuration/scope, no lint cache, warm filesystem. Whole-tree run is `eslint .` or `oxlint -c <config> --report-unused-disable-directives .`; single-file target is `src/features/ping.ts`, using the actual ESLint hook flags. Experiment helper files are excluded. Biome runs `lint`, not formatting. Native/load-only and Biome exit nonzero: their speed is **not parity-preserving performance**. Type-aware mode uses the same rules; today's ESLint config has no type-aware rules, so this measures mode overhead, not an expanded safety policy. A separate `no-floating-promises` smoke probe successfully invokes tsgolint and catches `Promise.resolve(1)` without awaiting it.

Final interleaved rounds, after the unused-vars correction, were much steadier than earlier heavily contended batches (earlier load averages about 60–108). Median whole-tree native → plugin-loaded → full bridge: **0.072 → 0.420 → 0.795 s**. Loading JS providers added about **0.347 s**, and executing the compatibility rules another **0.376 s**: **11× native overall**, but **7.3× faster than ESLint's 5.797 s**. Single-file median was **0.378 s ESLint / 0.418 s bridge**: the bridge was **11% slower per edit**, excluding Prettier and hook startup. Type-aware medians were **1.056 s whole / 0.614 s single**. Earlier noisy batches are retained, including failed preliminary type-aware runs before placing tsgolint in the copy's node_modules; those failures are excluded from this table. This was a shared machine, not an idle-machine benchmark.

One complete `npm run check` passed in **29.537 s**: lint **8.156 s (27.6%)**, typecheck 10.443 s, unit tests 1.621 s, registry 2.091 s, level-check 0.774 s, assets 0.168 s, build 6.093 s (phase times include command-launch overhead). Even free lint would save at most 27.6% in this run. Applying the final measured 86.3% lint reduction to that check's lint phase suggests **7.04 s / 23.8%** saved, but that cross-run estimate is confounded by load; it is not a measured replacement `check` speedup.

CI's client job and deploy build each invoke lint once. CI also runs independent server, network and browser-scenario jobs. Saving client lint time does not imply saving the same wall time on CI's critical path. No GitHub timing/history access was permitted; **actual CI percentage and deployment speedup are unverified**. No GPU/browser work is relevant to this tooling-only study.

## Complete configuration inventory

All rule severities are error except explicit recommended-rule disables. Later restrictions replace the earlier rule, not append automatically.

| Scope / kind                                        | Current contract retained by port                                                                                                                                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global ignores                                      | `dist/`, `node_modules/`, `server/`, `.claude/`, `.look/`; not `.codex/`                                                                                                                                                                    |
| JS baseline                                         | All 64 `js.configs.recommended` rules (expanded below)                                                                                                                                                                                      |
| Language                                            | `**/*.js`, `**/*.mjs`, `**/*.ts`: ES2022 modules, browser globals. Node globals additionally on `eslint.config.js`, `vite.config.ts`, `native/**/*.ts`; `dev/**/*.mjs` gets ES2024 and Node/browser globals                                 |
| TS baseline                                         | `**/*.ts`: all three TypeScript-ESLint recommended blocks, including core disables and replacements (expanded below)                                                                                                                        |
| `src/**/*.{js,ts}` imports                          | Rapier and SIMD paths; named sync registrations; static proto/debug bans                                                                                                                                                                    |
| `src/proto/**/*.{js,ts}` / `src/debug/**/*.{js,ts}` | Drop own-folder static ban; retain the other, Rapier and sync                                                                                                                                                                               |
| `src/world/*.{js,ts}`, `src/net/**/*.{js,ts}`       | Add headless three/render/player/features ban; exclude game-world from this block                                                                                                                                                           |
| `src/world/game-world.{js,ts}`                      | Headless, Rapier, proto/debug; sync registration allowed                                                                                                                                                                                    |
| `src/world/rules/**/*.{js,ts}`                      | Only sibling rules, `../grid.[jt]s`, `../../sim/<file>.[jt]s` among parent paths; no three/Rapier. Globals: window, document, navigator, localStorage, location, performance, setTimeout, setInterval                                       |
| `src/features/**/*.{js,ts}`                         | No `./*` except `./*.css`; repeat Rapier/sync/proto/debug                                                                                                                                                                                   |
| `src/sim/**/*.{js,ts}`                              | No three/Rapier, `../*`, `three/*`; sync ban; window/document/navigator/localStorage globals banned                                                                                                                                         |
| `src/netplay/**/*.{js,ts}`                          | No three/render/physics/player/entities/boogler/features, except player/identity.ts; repeat Rapier/sync/proto/debug. Static type imports count                                                                                              |
| `src/physics/**/*.ts`                               | Additional TS rule bans player/netplay/entities/features value imports; allows type-only imports; core bans still apply                                                                                                                     |
| `src/entities/*/state.ts`                           | No render/ui/player HUD/island terrain/own view or sync; repeat Rapier/sync/proto/debug; window/document banned                                                                                                                             |
| Non-lockstep `src/**/*.{js,ts}` syntax              | `glOnly` and all DOORS                                                                                                                                                                                                                      |
| DOORS allow overrides                               | Socket: net/ws-room.ts. Audio: render/audio.ts. RAF: main.ts, boot/splash.ts, features/welcome-back.ts, player/pad-diagram.ts, proto/bar/pad.ts, debug/look-lab.ts, debug/startup-record.ts. Other doors and GL ban remain                  |
| Entity `src/**/*.ts`                                | Excludes proto/debug/entity directories and all 16 services listed below; count budget 2/4/8/6 in caves/decor, caves/index, lighthouse/index, windmills/index                                                                               |
| `src/physics/backend-*.ts`                          | Removes Rapier import ban; retains sync/proto/debug; typed infrastructure rule still applies                                                                                                                                                |
| `LOCKSTEP_FILES`                                    | `src/sim/**/*.{js,ts}`, `src/world/rules/**/*.{js,ts}`, `src/world/grid.{js,ts}`: restricted properties plus `**`, `**=`, new Date, Date(), qualified global-object members, all DOORS; intentionally no `glOnly` in this replacement block |

`glOnly` members: ShaderMaterial, RawShaderMaterial, ShaderChunk, ShaderLib, UniformsLib, UniformsUtils, WebGLRenderer, Points, onBeforeCompile, customProgramCacheKey, readRenderTargetPixels. DOORS match bare/member WebSocket construction, AudioContext/webkitAudioContext construction or member access, and any requestAnimationFrame identifier.

Restricted properties: Math.random; crypto.getRandomValues/randomUUID; Date.now/performance.now; Math.sin, cos, tan, asin, acos, atan, atan2, sinh, cosh, tanh, asinh, acosh, atanh, pow, exp, expm1, log, log2, log10, log1p, hypot, cbrt. Qualified-global selector covers Math/crypto/Date/performance under globalThis/window/self.

Entity services under `src/`: features/{identity,proto-soapbox,world,gamepad,adaptive-res,ball-rest,feel,impact}.ts; loop.ts; physics/physics.ts; render/{scene,particles,sprites,lights,assets}.ts; netplay/net.ts.

<details>
<summary>Every recommended rule and TS override</summary>

JS recommended (64): `constructor-super`, `for-direction`, `getter-return`, `no-async-promise-executor`, `no-case-declarations`, `no-class-assign`, `no-compare-neg-zero`, `no-cond-assign`, `no-const-assign`, `no-constant-binary-expression`, `no-constant-condition`, `no-control-regex`, `no-debugger`, `no-delete-var`, `no-dupe-args`, `no-dupe-class-members`, `no-dupe-else-if`, `no-dupe-keys`, `no-duplicate-case`, `no-empty`, `no-empty-character-class`, `no-empty-pattern`, `no-empty-static-block`, `no-ex-assign`, `no-extra-boolean-cast`, `no-fallthrough`, `no-func-assign`, `no-global-assign`, `no-import-assign`, `no-invalid-regexp`, `no-irregular-whitespace`, `no-loss-of-precision`, `no-misleading-character-class`, `no-new-native-nonconstructor`, `no-nonoctal-decimal-escape`, `no-obj-calls`, `no-octal`, `no-prototype-builtins`, `no-redeclare`, `no-regex-spaces`, `no-self-assign`, `no-setter-return`, `no-shadow-restricted-names`, `no-sparse-arrays`, `no-this-before-super`, `no-unassigned-vars`, `no-undef`, `no-unexpected-multiline`, `no-unreachable`, `no-unsafe-finally`, `no-unsafe-negation`, `no-unsafe-optional-chaining`, `no-unused-labels`, `no-unused-private-class-members`, `no-unused-vars`, `no-useless-assignment`, `no-useless-backreference`, `no-useless-catch`, `no-useless-escape`, `no-with`, `preserve-caught-error`, `require-yield`, `use-isnan`, `valid-typeof`.

TS off: `constructor-super`, `getter-return`, `no-class-assign`, `no-const-assign`, `no-dupe-args`, `no-dupe-class-members`, `no-dupe-keys`, `no-func-assign`, `no-import-assign`, `no-new-native-nonconstructor`, `no-new-symbol`, `no-obj-calls`, `no-redeclare`, `no-setter-return`, `no-this-before-super`, `no-undef`, `no-unreachable`, `no-unsafe-negation`, `no-with`.

TS error: `no-var`, `prefer-const`, `prefer-rest-params`, `prefer-spread`.

TS off: `no-array-constructor`, `no-unused-expressions`, `no-unused-vars`.

TS error: `@typescript-eslint/ban-ts-comment`, `@typescript-eslint/no-array-constructor`, `@typescript-eslint/no-duplicate-enum-values`, `@typescript-eslint/no-empty-object-type`, `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-extra-non-null-assertion`, `@typescript-eslint/no-misused-new`, `@typescript-eslint/no-namespace`, `@typescript-eslint/no-non-null-asserted-optional-chain`, `@typescript-eslint/no-require-imports`, `@typescript-eslint/no-this-alias`, `@typescript-eslint/no-unnecessary-type-constraint`, `@typescript-eslint/no-unsafe-declaration-merging`, `@typescript-eslint/no-unsafe-function-type`, `@typescript-eslint/no-unused-expressions`, `@typescript-eslint/no-unused-vars`, `@typescript-eslint/no-wrapper-object-types`, `@typescript-eslint/prefer-as-const`, `@typescript-eslint/prefer-namespace-keyword`, `@typescript-eslint/triple-slash-reference`.

</details>

## Integrations, advisories and TypeScript 7

- **Commands/hooks:** `package.json` lint → check/check:full; `.claude/hooks/format-lint.ts` shared by `.claude/settings.json` and `.codex/hooks.json`; `dev/codex/run.ts` injects that hook too. `dev/patch.ts` invokes ESLint with `--quiet --no-warn-ignored --pass-on-unpruned-suppressions`. Retain Prettier separately, and map candidate error exits to the hook's exit 2 behavior.
- **CI/deploy:** `.github/workflows/{ci,deploy}.yml` each call `npm run lint`; package installation/lockfile changes propagate there. Other CI jobs are independent.
- **Rule consumers:** `test/lint-determinism.test.ts` imports ESLint and `LOCKSTEP_FILES`; `eslint.config.d.ts` describes that export. `dev/atlas/extract.ts` parses the literal list from the config. Preserve one authoritative glob list. `dev/registry/check.ts` detects deleted suppression entries; `dev/registry/debt.ts` prevents budget growth against base. Also update ESLint mentions in `dev/friends-report.ts`, `dev/transcript.ts`, `.gitignore` and Claude tool permissions where applicable.
- **Comments:** 33 eslint-disable comments in 24 tracked TS files; six are in excluded server files. Root scope has **27 comments in 21 files**. Existing any/unused-vars comments work in the compatibility clean-tree run; new core-rule comments need alias translation, as demonstrated. Biome uses its own suppression directives; migration is required.
- **Docs:** update current `docs/agents/{claude,codex,lint-boundaries,plugins,shipping,tools,typescript,safety-audit}.md`, `CONTRIBUTING.md`, `.claude/skills/new-feature/SKILL.md`, `src/island/README.md`. At the study baseline, 76 tracked files mentioned ESLint outside lock/config; retain historical plans/research as history.
- **Audit:** offline lockfile-pruning experiment removed `eslint`, `@eslint/js`, `typescript-eslint` and added Oxlint/tsgolint. Result: 211 package records, zero ESLint/minimatch paths; matching the cached npm advisories changed **11 moderate matches to zero**. All trace to minimatch 10.2.6 and [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), globparts amplification DoS before 11.0.1. **The working compatibility port does not clear these**, because it retains the providers. This is cached advisory evidence, not a fresh audit or a guarantee of zero future findings.
- **TS7 interaction:** TypeScript-ESLint's installed range is `>=4.8.4 <6.1.0`. Removing it entirely removes that constraint; this bridge retains it. Compiler API consumers remain in `dev/scan/{read,unused}.ts`, `dev/registry/{debt,prototypes}.ts`, `dev/atlas/extract.ts`. Parsing/traversal and createProgram/config APIs still prevent blindly replacing the `typescript` package. They do not prevent a separate ts7 checker while retaining TS5 for tooling. The sibling ts7-feasibility report was not committed/available in this checkout; its conclusions are unverified here.

## Official-source maturity and migration gates

Sources below were read from the exact official packages/cache supplied locally; linked web pages were **not fetched**, respecting the network restriction.

- Oxlint's shipped `configuration_schema.json` says [jsPlugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html) is **alpha and not subject to semver**. Node ≥22.18 supports TypeScript plugins; this Node 24 setup qualifies. Five enabled compatibility rules, one off-only export and the entity rule loaded successfully here, but broader ESLint API compatibility is unproven. JavaScript/TypeScript configuration files are separately marked experimental; this experiment uses JSON configs.
- The [tsgolint README](https://github.com/oxc-project/tsgolint#readme) calls type-aware linting **stable**, linking its [22 July 2026 stable announcement](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable). `--type-check` remains experimental in the Oxlint schema. Named rule gaps: naming-convention and prefer-destructuring; neither is enabled here. README totals disagree (59/61 versus 60/62), so do not equate its headline coverage with parity.
- Cached official release timestamps for tsgolint: 7.0.2002 September 18, .2003 September 24, .2004 October 10, .2005 October 22. Oxlint/Biome cached metadata lacks the release history needed to verify cadence; no weekly-release claim. Biome's shipped [configuration schema](https://biomejs.dev/reference/configuration/#plugins) exposes GritQL plugins, not ESLint JavaScript plugins.

Exact future migration steps, gated on preserving protections:

1. Fix/test the existing syncBan matching hole independently. Retain the current gate meanwhile.
2. Extract authoritative scope/door/service constants; make atlas and determinism tests consume them. Pin candidate versions. Recreate ordered overrides and language/ignore behavior; verify actual file sets, including `.codex` and future JS/TS files.
3. Replace the bridges with dependency-independent import/selector/entity rules or confirmed native equivalents. Resolve dynamic imports, side-effect imports, type-only allowances and every current selector. Restore the per-file ES2022/ES2024 parser gate. Parser substitutions for no-dupe-args/no-octal need explicit tests. Do not remove ESLint based on native names alone.
4. Implement the exact count ratchet: excess, stale/deleted entries, prune, no-growth baseline, and relaxed per-edit mode. Preserve or translate every disable directive; keep unused-directive warnings. Re-run this fixture matrix, current determinism tests and whole-tree diagnostics with zero unexplained differences.
5. Update scripts, shared Claude/Codex hook, injected hook, patch, CI/deploy, declarations, registry/atlas consumers and current docs listed above. Remove all three ESLint dependencies only after no bridge imports them; regenerate lock offline, then refresh audit when network is authorized.
6. Repeat timing on an idle machine, including hook latency and CI critical path. Run `npm run check`; require parity and a worthwhile actual improvement before changing the gate. Keep any new type-aware rules a separate policy decision. No ship is authorized by this study.

Validation: `npx prettier --write --ignore-path /dev/null docs/research/linter-replacement.md` (Markdown is normally ignored); `npx eslint` correctly reports this Markdown file ignored; `npm run check` passed all stages. No game code changed, so no images, bot runs or visual claims. Remote `inflight` was skipped because it fetches; local refs were inspected. No push/ship. Evidence bundle: `.look/evidence/linter-study/manifest.json`; artifacts are local and uncommitted.
