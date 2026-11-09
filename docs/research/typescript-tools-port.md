# Compiler-independent developer tools

> **Verdict:** Compiler-independent developer tools.
> **Top recommendations:** none; port record for the developer tools.
> **Status:** adopted. See [typescript-7](typescript-7.md).

3 November 2026; baseline `32a42ee5e7c2b10dc07d4536445316cae6ddb245`.
This implements the tooling part of the owner's full TypeScript upgrade request.
The compiler version, ESLint configuration and `src/` are unchanged.

| Consumer                     | Replacement and reason                                                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev/scan/read.ts`           | Oxc 0.157.0 public ESTree parser; shared traversal and UTF-16 line lookup. No compiler internals.                                              |
| `dev/registry/prototypes.ts` | Oxc import/export/call nodes, preserving type/value/dynamic distinctions and locations.                                                        |
| `dev/registry/debt.ts`       | Oxc literal-array reader; same KNOTS failure messages and debt policy.                                                                         |
| `dev/atlas/extract.ts`       | Oxc literal-array reader for lockstep globs; shared reader for facts. Vite still uses the same plugin.                                         |
| `dev/scan/unused.ts`         | Knip 6.44.1 public `knip/session` module graph, Oxc syntax, and `@typescript-eslint/scope-manager` 8.72.1 public `analyze` binding identities. |

Knip alone reports 210 value exports and 59 types under the all-code entry
configuration, and lacks Boogle's local-symbol reference counts. Its CLI report
is not a substitute for this advisory report. Keep Boogle's loaders, conservative
name evidence, retention decisions, categories and ordering; use Knip's module
identities and the scope manager's local identities underneath. Scope-manager
depends on types and visitor keys, not the TypeScript compiler. Narrow adapters
preserve hoisted-function export order, shorthand-property symbol counting,
class self bindings and export-alias positions.

The cached TS 7 API offers symbol lookup, aliases and exports under
`typescript/unstable/sync`, but is explicitly unstable and unnecessary here.
A hand-written name counter would mishandle shadowing, aliases, class bindings
and declaration merging; a bespoke binder would be larger and less dependable
than these published APIs. No second compiler or unstable API was added.
The separate `typecheck` command remains responsible for semantic diagnostics.

## Results

- Today's untouched baseline is **464 files, 2 unused files and 77 unused
  exports**, rather than the brief's historical 462/2/78.
- Atlas JSON is byte-for-byte identical at the same HEAD: zero parse errors,
  zero citation problems. All 464 full reader records match, including comments,
  ordering and source lines. Twelve extra reader fixtures match, including
  CRLF, BOM, shebang, Unicode separators and non-BMP characters.
- Registry text/JSON matches except measured milliseconds. Fourteen seeded
  registry failures, an import cycle, all three debt-growth budgets, malformed
  KNOTS arrays, missing prototype cards and archived code still fail. Thirteen
  seeded prototype references retain exact kinds, order and lines.
- Full unused JSON matches except seconds, including local reference counts,
  root reasons, retained entries, CSS, assets and dependencies. Alias, namespace,
  shadowing, shorthand, recursion, class, type-only, destructuring, enum and
  declaration-merging fixtures also match. Seeded fixtures produce findings in
  all five groups: files, exports, CSS, assets and dependencies.
- Invalid-source diagnostic wording belongs to the new parser: `onFrame(` now
  says ``Expected `)` but found `EOF` `` instead of `')' expected.`. It still
  fails the registry; no current-tree finding or enforcement rule changed.
- Loader-hook runs rejecting every `typescript` or `typescript/*` resolution
  pass for atlas, registry and unused. Repository source import search is empty;
  ESLint's existing transitive compiler dependency remains the other job's scope.

## Timings and limits

Local Node 24.11.1/macOS arm64, other jobs active. Seconds, old → new;
single runs unless stated. These do not establish a pipeline speedup.

| Measurement                                           |   Old |   New |
| ----------------------------------------------------- | ----: | ----: |
| Atlas CLI JSON                                        | 1.400 | 1.194 |
| Registry CLI                                          | 2.456 | 2.797 |
| Unused, same tree                                     | 9.592 | 4.208 |
| Reader, median of three alternating in-process passes | 0.412 | 0.505 |
| Vite atlas load, instrumented inside build            | 0.612 | 0.686 |
| Vite instrumented build total                         | 4.569 | 5.759 |
| Uninstrumented `npm run build`                        | 6.369 | 5.360 |

Evidence is in `.look/ts-tools/` and the handoff's tooling manifest. Formatting,
ESLint, typecheck, all 292 unit tests, registry, level/assets checks and production
build pass through `npm run check`. No browser, images, bots or scenarios were
used: this changes no player-visible behavior. Unverified: other platforms,
CI timings and the separate full TS 7/ESLint upgrade. Cache-only installation;
local refs substituted for networked `inflight`. No push or ship.
