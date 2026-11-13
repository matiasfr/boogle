# Classic state retirement — 13 November 2026

Step 5 removes the seven classic gameplay states from base `1af69645b`, including their registrations,
ops, ticks, saved/hash shapes, dependent views and tests. `WORLD_NS` is v39 with a dated history entry.
The eight haul tuning keys, classic transport and its roster registration remain until step 9, as the
implementation brief requires. Rail tuning and the live roster remain Server kind. Seats and The Boogler
remain Host kind. No flag, migration, ROM data, prefab lint changes, push or ship.

## State and reader audit

Before retirement, railway `deliver` admitted no `w:edit` (step 4); the server-op registry defined only
rail tuning and identity alongside railway actions. None of the seven fed railway simulation or replication.
The old classic views did read them: "inert" means no playable railway state transition, not literally no
reader or tick. Shared welcome-back bookkeeping read zero site contributions and a false opening flag;
the carry view read empty classic stacks before applying the railway's `backSeam` override. Those reads
are removed, while the live carry HUD and bundle remain. The before-reader census is
[readers-before.txt](../../.look/evidence/step5-audit/readers-before.txt); the final source search finds no
`rules.<retired-state>` or imports of the deleted sim modules.

The counts below are lines in wholly deleted, directly owned files at the base. Shared removals are
listed separately, so no file is counted twice. Paths abbreviated with braces name every deleted file.

| State | What it was; railway inactivity evidence | Deleted files | Lines removed |
| --- | --- | --- | ---: |
| gifts | Ground/perched/thrown items. Only its adapter and feature consumed the table; the classic gift ops had no railway admission. Inventory, local seeds and Boogler gifts use the separate catalog. | `src/sim/gifts.ts`, `src/world/rules/gifts.ts`, `test/gifts.test.ts`, `src/adapters/gifts.ts`, `src/features/gifts.ts` | 709 |
| stacks | Carried classic material indexed by roster ordinal. Readers were its haul cluster and classic carry fallback; live railway counts come from `backSeam`. | `src/sim/stacks.ts`, `src/world/rules/stacks.ts`, `test/stacks.test.ts` | 212 |
| piles | Loose classic material piles. Only stacks/source/site interactions and the classic pile adapter/view read them; railway piles have independent ECS rows and actions. | `src/sim/piles.ts`, `src/world/rules/piles.ts`, `test/piles.test.ts`, `src/adapters/piles.ts`, `src/features/piles.ts` | 419 |
| sites | Classic route rings, contributions, helpers and machine runs. Readers were the haul cluster, net/wagon prototypes, classic construction views and dormant welcome bookkeeping. No admitted stock/run could start them in railway rooms. | `src/sim/sites.ts`, `src/world/rules/sites.ts`, `test/sites.test.ts`, `src/features/{work-sites,hut-build,track-machine}.ts`, `src/render/hut-blueprint.ts`, `test/hut-blueprint.test.ts` | 1,882 |
| sources | Classic bundle charges/refill. Readers were `src.take`, haul tuning/reset, log-sources and the net depot; railway sources use their own rows. | `src/sim/sources.ts`, `src/world/rules/sources.ts`, `test/sources.test.ts`, `src/features/log-sources.ts` | 351 |
| bank | Offline classic helper-freight credit. Only classic host wake and helper-bank consumed it; railway rooms already use `railAwayCredit`. | `src/sim/bank.ts`, `src/world/rules/bank.ts`, `test/bank.test.ts`, `src/features/helper-bank.ts` | 168 |
| opening | Classic opening-day start/gather ticks and derived era. Readers were the wagon prototype and dormant welcome notice; no railway `open.*` admission. | `src/sim/era.ts`, `src/world/rules/opening.ts`, `test/era.test.ts` | 315 |

Direct state-owned deletions total **4,056 lines**. Shared retirement also removes the entire net/wagon
prototype folders (2,421 lines), their loaders, classic haul hooks/feel, classic HUD/fly-in portions,
`tune.fill`/`tune.reset` and site-capacity validation, classic-only wagon/haul/toys capture tools,
the wagon-riders scenario, and mixed trace coverage. One-hand's independent ball, seed, Boogler and
touch checks remain. Static route data remains because scenery/layout tools still consume it; wagon
pace constants and type remain because the eight retained tunables and layout tools still use them.
The unconsumed wagon timetable and machine-script helper and their two tests are removed too.

The complete deletion ledger is [deleted-files.tsv](../../.look/evidence/step5-audit/deleted-files.tsv);
the all-file addition/removal ledger is [changes.tsv](../../.look/evidence/step5-audit/changes.tsv).

## Copy preserved verbatim

`src/sim/gift-catalog.ts` is byte-identical to the base, as required by the plan. The catalog is still
used by inventory and The Boogler. Old and new locations are identical:

| Old location at `1af69645b` | New location | Exact line |
| --- | --- | --- |
| `src/sim/gift-catalog.ts:16` | `src/sim/gift-catalog.ts:16` | A mushroom seed! I will plant it and grow an empire. A small empire. A bouncy one. |
| `src/sim/gift-catalog.ts:24` | `src/sim/gift-catalog.ts:24` | A frisbee! A plate that flies! At home we would put plov on it. Then nobody would throw it. |
| `src/sim/gift-catalog.ts:33` | `src/sim/gift-catalog.ts:33` | The beach ball? That belongs to everybody. If I take it, everybody is sad, and then everybody is sad at me. |
| `src/features/welcome-back.ts:75` | `docs/game-design/retired-classic-copy.md:13` | Opening day happened while you were away |

The final row is a **suspect notice for the owner**, not attributed character speech. It is archived
instead of rewritten. No additional retired-only character dialogue was found.

## Oracle and other fixtures

The checked-in plan originally did not specify oracle retirement. The step-5 note now records the
necessary projection explicitly. Before deleting production code, both frozen fixtures were verified
against their recorded traces. The focused fixture keeps **17 inputs and all 38 keyed tune histories
byte-identical**. Its **75 remaining trace steps** (including admission, results, edits, roster, tune
revision and hashes) are byte-identical to the original trace projected onto roster/tune.

The old 75 combined SHA pins included deleted state, so they are removed pins, not claimed unchanged.
The 75 replacement projection pins were derived solely from that verified old recording, never by
recording new production behavior. Baseline and actual projected SHA-256 are both
`467f1b46f799206e599326b855762ff02badf9e67577b661e8e9c00b6238bf72`.
[Comparison and pin accounting](../../.look/evidence/step5-trace/comparison.json), original recordings,
original fixtures and the reproducible projection script sit together in that evidence directory.

The mixed all-ops fixture is deleted (228 inputs, 1,059 steps, 3,892 lines) because its interactions
exercise retired systems. Focused frozen tune/roster and server-authority conformance proofs remain.
`world-inputs.json` shrinks to **3 classic ops / 2 states**. The cart namespace assertion changes v38
to v39. Generic restart, save, late-join, replay, reset, restore and eviction tests keep their contracts
using roster writes instead of gift payloads. The browser layout assertion fed only by gift/source
adapters is removed; current registry and catalog checks remain.

## Verification

| Check | Verified result |
| --- | --- |
| Prettier on changed files; lint/typecheck | Pass. The final scenario readiness correction also passes scoped lint and typecheck. |
| `npm run check` | Pass: 1,745 passing tests, one existing train-wait TODO; registry, level, assets, prefabs and Vite build pass. [Log](../../.look/step5-check.log). |
| `npm --prefix server test` | Pass: 226/226, including v38 `peer` refusal, close 4000, no welcome or room creation. [Final log](../../.look/step5-server-final.log). |
| `node dev/ship-check.ts` | Pass: 1,336 assertions plus one existing TODO, 136 affected test files. [Log](../../.look/step5-ship-check.log). |
| `npm run registry` | Pass: 3 classic ops, 2 classic states, 22 presence keys, 16 message types; debt unchanged. [Log](../../.look/step5-registry.log). |
| `npm run level-check` (inside check) | Pass: 13 reports. Existing planned/tentative-track notices remain. |
| `npm run test:net` through broker `net` | Unverified: trusted harness `d87c05719` imports deleted `src/sim/bank.ts` before running its tests. [Manifest](../../.look/evidence/1794588175992-30265/evidence.json). No bypass or harness chase. |
| Two-player T2 playthrough | Pass: both finish, mirrored hashes agree at 98 sampled server steps, no graphics errors. [Manifest](../../.look/evidence/1794588204987-30701/evidence.json), [report](../../.look/evidence/1794588204987-30701/run/report.txt). |
| `world-inputs` through broker | Fails the old harness's gifts-layout readiness wait, which no longer has a writer; no graphics errors. [Manifest](../../.look/evidence/1794588386444-37152/evidence.json). The updated scenario uses production registry/catalog checks and waits for the surviving sync handle; it needs a reviewed launcher refresh. |

Visual question: can both players still finish T2 with the railway presentation intact after the classic view
removal? Opened both [end-still.png](../../.look/evidence/1794588204987-30701/run/end-still.png) and
[p2-end-still.png](../../.look/evidence/1794588204987-30701/run/p2-end-still.png). Both show the two players,
laid rails and T2-complete overlays, with no missing scene surfaces apparent. The end stills do not show
loaded carry-HUD appearance. The bots have no failed beats. The run reports clock drift and load 28.17 to
36.65: real-time smoothness, timing, full-route behavior beyond T2 and loaded HUD appearance remain unverified.
**Not tested on a device.**

Independent read-only Astra review found no additional state, carry/HUD or persistence defects. It independently
verified both original fixture files against `1af69645b`, both baseline traces against their frozen pins, and
the exact retained projection. It confirmed the scenario readiness issue, now corrected. The review did not
claim browser execution or a full-suite run.

The full check initially encountered a Git-index scan of unstaged deleted files; staging the deletions fixed it
without changing or weakening the test. The first review-stamp invocation with a worktree used its default
fetch path and was blocked opening `FETCH_HEAD` before network contact; the final invocation uses `--no-fetch`.
`inflight` was not run because it fetches; local refs/worktrees supplied the ownership check.

Implementation commit: **`32bd6a38a`** on `codex/server-state-step-5`; the follow-up commit records verification
only. Review stamp: **`6c4876599227`**, covering 53 files (`npm run review-stamp -- . --no-fetch`). The independent
reviewer verified that committed stamp and the corrected sync-handle readiness wait; its no-additional-findings
assessment applies. Nothing was pushed or shipped.

Aggregate diff from `1af69645b`: **12,455 removed lines** across 111 changed files. The implementation commit
adds 477 lines (net 11,978 removed); the verification follow-up adds only this accounting. The seven directly
owned file groups above account for 4,056 deleted lines; the ledgers include all shared code, fixture and doc
changes as well. The gift catalog, Boogler directory and prohibited prefab/lint paths have no diff.

The browser captures precede the implementation commit and their manifests correctly say dirty. Game/server
source did not change after the successful two-player run; the later correction affects only the scenario's
readiness wait, followed by lint/typecheck and the recorded stale-broker scenario attempt. Real device and
updated trusted-harness execution remain unverified.
