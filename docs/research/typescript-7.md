# TypeScript 7 feasibility

Study: 3 November 2026, source `75526a2ad41bd567bdfa776e7e77ff5998423348`.
The study itself was feasibility only; it proposed no dependency or application changes in its own commit.
Implementation status, 4 November 2026: TS 7.0.2 runs the primary typecheck. Oxlint 1.91.0 plus
oxlint-tsgolint 7.0.2005 and the repo safety runner replace ESLint; all ESLint packages are removed. The type-aware
linter uses its own Go compiler and has no TypeScript 5/6 dependency or peer. Only five compiler-API tools still need
canonical TypeScript 6.0.3: `dev/scan/{read,unused}.ts`, `dev/registry/{debt,prototypes}.ts`, and `dev/atlas/extract.ts`.
After that separately owned port, switch canonical `typescript` to 7, remove the `typescript-native` alias and
`typecheck:legacy` CI step, and recheck the tools. The original feasibility findings below are historical.

**Recommendation: use TS 7 for typecheck only, aliased as `typescript-native`;
keep `typescript` at the legacy version for ESLint and developer tools.**
The reverse alias arrangement fails ESLint. A full replacement is blocked.
One type-only WebGPU compatibility fix is needed, also for TS 6.

## Measurements

Node 24.11.1, macOS arm64, Apple M1 Max,
32 GiB RAM. Other jobs were active: these are contended local measurements,
not an idle-machine benchmark or a prediction of GitHub Actions timing.

Experiments used `.look/ts7/sandbox`: `git archive HEAD`, independently copied
dependencies, original local Git refs, no incremental compiler cache.
Sequential timings use Darwin `wait4` RSS (MiB; process/descendant high-water
mark, not aggregate concurrent memory). Failed `/usr/bin/time -l` attempts
(sandbox `sysctl` restriction) and interrupted trials were discarded.

Final comparison alternated 5/7 three times, on the **same** source with the
type-only compatibility fix below. `npm run typecheck` selected the exact
compiler through `node node_modules/<package>/bin/tsc -p .`, avoiding the
two packages' competing `.bin/tsc` links. All six runs passed.

| Run    | TS 5.9.3 wall (s) | Peak RSS (MiB) | TS 7.0.2 wall (s) | Peak RSS (MiB) |
| ------ | ----------------: | -------------: | ----------------: | -------------: |
| 1      |             11.56 |          906.1 |              2.31 |          771.5 |
| 2      |             13.69 |          872.2 |              1.59 |          763.0 |
| 3      |             12.06 |          909.8 |              2.29 |          755.2 |
| Median |         **12.06** |      **906.1** |          **2.29** |      **763.0** |

Median checker speedup: **5.26x**; median peak RSS reduction: **15.8%**.
Earlier unmodified-tree TS 5 runs were 97.75/48.07/33.54 s and
748.0/781.1/864.7 MiB; initial working TS 7 runs were 3.61/3.41/2.23 s and
784.4/769.7/769.9 MiB. Those valid but noisy pilot results remain in the
raw evidence; the final alternating comparison reduces time-order bias.

Final pipeline totals (one sequential pass per version, all passed):

| Command                               |     TS 5.9.3 (s) | Native 7 + legacy API (s) |
| ------------------------------------- | ---------------: | ------------------------: |
| `npm run lint`                        |            32.93 |                     20.49 |
| `npm run build`                       |            41.72 |                      9.12 |
| `npm run check`                       |            85.93 |                     24.14 |
| Typecheck stage **inside that check** | 8.86 (**10.3%**) |           1.48 (**6.1%**) |

**Do not call this a 3.6x pipeline speedup.** Only 7.37 s of the 61.79 s
observed reduction is in the compiler stage; the remaining 54.42 s is in
other stages/overhead. Earlier checks reversed direction: 81.74 → 138.69 s,
with compiler shares 19.3% → 5.3%. Shared-machine timing is unstable.
The maximum possible gain from eliminating typecheck in the final baseline
is **10.3%**, not the checker's 5.26x multiplier.

**No build or lint speedup is established.** Vite transpiles without tsc,
and lint/atlas still use the same legacy API. Build inside the earlier
checks barely moved (19.76 → 20.34 s), while standalone samples varied
10.17 → 69.41 s in the opposite direction from the final table.

CI is not `check:full`: `.github/workflows/ci.yml` has parallel client,
server, net and scenario jobs. Only the client's `typecheck` step uses the
swapped checker; installation, lint, build, tests, Docker and browser setup
remain. Its true CI wall-time share cannot be measured without CI timing
data (network forbidden). It is neither the local percentage nor 1/4 of CI.
The critical-path saving is `max(client, otherJobs) - max(client - saving,
otherJobs)`; it can be zero if another job dominates.

## Compatibility and blockers

`typescript@7.0.2` exports only version data from `typescript`. JavaScript
compiler interfaces exist under `typescript/unstable/sync`, `unstable/async`
and `unstable/ast/*`, but are incompatible: snapshots/projects replace the
`createProgram` flow. Its published CLI is **`tsc`**, not `tsgo`.

Repository-wide import search found exactly these five direct consumers:

| Consumer                     | Required legacy API                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `dev/scan/read.ts`           | `createSourceFile`, AST kinds/guards/walking, modifiers, comments, source positions, parse diagnostics         |
| `dev/scan/unused.ts`         | Config parsing and `sys`, `createProgram`, type checker, symbol identity/aliases/module exports, AST traversal |
| `dev/registry/prototypes.ts` | Source parsing, syntax kinds, guards, walking import/export/call nodes                                         |
| `dev/registry/debt.ts`       | Source parsing and literal/variable guards                                                                     |
| `dev/atlas/extract.ts`       | Source parsing and literal/variable guards; also invokes the shared reader                                     |

`eslint.config.js` imports `typescript-eslint`, whose parser imports the old
compiler API internally. Its recommended config here is syntax linting, not
type-aware linting. `vite.config.ts` also imports the atlas plugin, so build
depends on the compiler **API**, despite never running the type checker.

Cached official npm metadata lists typescript-eslint **8.72.1** as latest
and **8.72.2-alpha.11** as canary; both require `typescript >=4.8.4 <6.1.0`.
8.72.1's `dist/index.js` explicitly throws for TS major >=7 and directs users
to Microsoft's [side-by-side instructions](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0)
and [upstream issue #10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)
tracking support for **TS >=7.1**. This is published-code evidence; live issue
status and an ETA were not fetched because networking was prohibited.

The unmodified full swap produces **192 diagnostics**: 132 TS2339 missing
compiler members, 43 TS2694 missing compiler types, 16 TS7006 implicit-any
cascades, and one TS7053 in `src/debug/gpu-info.ts:58`. The first 191 are in
the five tools above. The remaining error is new DOM WebGPU typing:
`GPUSupportedLimits` has no `maxStorageBuffersInFragmentStage`. The existing
`Navigator & { gpu?: Gpu }` assertion intersects the newly native `gpu`
property with the fallback. TS 6.0.3 already includes these WebGPU types,
so this is also relevant to the separate TS 6 migration.

The direct swap also fails lint (explicit rejection), build (atlas plugin),
registry, unused scan and atlas (missing `SyntaxKind`). No failed command's
short runtime is counted as a speedup.

**No tsconfig option had to be removed or changed.** Every existing option
is accepted. The remaining diagnostic disappears with this type-only
change in the throwaway copy (and an updated stale DOM-library comment):

```ts
const gpu = (navigator as unknown as { gpu?: Gpu }).gpu;
```

This replaces `Navigator & { gpu?: Gpu }`; optional/nonstandard limits still
return `undefined`, as before. Nothing in the running game was changed.

## Options and recommendation

Root TS 7 + `typescript-legacy: npm:typescript@5.9.3`, five rewritten imports
and a scoped typescript-eslint override **failed**: registry/unused/atlas
passed, but lint still resolved TS 7 and `npm ls` reported invalid peers.

The working inverse layout keeps root TS 5.9.3 and adds
`typescript-native: npm:typescript@7.0.2`. Offline npm installation and
`npm ls` succeeded; **no existing locked package changed**. Only the native
wrapper/platform binary is installed additionally (about 30 MiB here).
All five compiler imports and ESLint config remain unchanged. Native
typecheck, lint, build, full `check` (292 tests), registry, unused and atlas
passed. Atlas JSON is identical: 462 files, zero parse errors, zero citation
problems. Unused findings remain 2 files/78 exports, with no new findings.

The legacy dependency does **not** run a semantic check: lint is syntax-based
and unused is advisory. Versions already disagree on WebGPU; neither green
results nor old-parser lint prove future error equivalence. A TS 7-accepted
error could escape the old checker unless it also runs. Keep a temporary
legacy CI gate to preserve that coverage; this forfeits CI typechecking
speedup while still speeding local checks.

| Option                          | Cost estimate, not measured                                                                         | Verdict                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| (a) Wait                        | No setup; revisit upstream support later                                                            | Safe, loses the demonstrated checker speed; no verified ETA |
| (b) Native checker + legacy API | 2–4 hours to package, apply one type fix, validate aliases/editor/CI; maintain two pins             | Recommended; use the tested inverse alias                   |
| (c) Full TS 7                   | Roughly 2–5 engineer-days for five tool ports and regression checks, plus unresolved ESLint support | Blocked today; unstable APIs are not drop-in replacements   |

Exact next steps, for a separate implementation change:

1. Coordinate the `gpu-info.ts` fix with the TS 6.0.3 job. TS 6 reports the
   same error and passes after the fix. Going through 6 helps preparation;
   it is not required for 7 and does not solve its API break or native speed.
2. Keep canonical `typescript` at 5.9.3 (tested), or validate 6.0.3 after that
   job. Run `npm install -D --save-exact typescript-native@npm:typescript@7.0.2`.
3. Set `typecheck` to `node node_modules/typescript-native/bin/tsc -p .`.
   Add `typecheck:legacy` as `node node_modules/typescript/bin/tsc -p .` for
   the temporary CI comparison. Do not change the five API imports, widen
   peer ranges or use `--force`/`--legacy-peer-deps`.
4. Verify both explicit compiler versions, `npm ls`, both typechecks,
   `npm run check`, `npm run unused -- --json` and `npm run atlas -- --check`.
   Measure actual CI step/critical-path times before claiming CI savings;
   remove the legacy semantic gate only as an explicit follow-up decision.

## Sources and limits

Primary evidence: repository files and publisher artifacts in npm's cache.
[TypeScript metadata](https://registry.npmjs.org/typescript) was captured at
06:54 UTC on 4 November (3 November locally),
[typescript-eslint](https://registry.npmjs.org/typescript-eslint) at 06:58.
TS 7/6 tarballs match their cached SHA-512 integrity values. API evidence:
TS 7's manifest, `lib/version.cjs`, `lib/getExePath.js` and
`dist/api/sync/api.d.ts`; ESLint status: its manifests and `dist/index.js`.

No images/bots/scenarios: no player-visible change. Networked `inflight` was
replaced by local-ref inspection. Unverified: actual CI durations/share,
live upstream status/ETA, other platforms, editor integration and the full
native-plus-legacy-6 toolchain. No external network, push or ship was used.
