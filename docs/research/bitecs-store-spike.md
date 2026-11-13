# bitECS storage spike

13 November 2026. Branch `codex/bitecs-store-spike`; **experiment only, no push or ship**.
Serves DESIGN's **Small and readable**, **Clear authority**, and **Determinism from day one**.
The owner's brief reopens the library choice and makes save resets free. This report does not turn the earlier
in-house decision into a permanent constraint, nor propose an engine switch.

## Recommendation

**Stay in-house for now.** The same API on bitECS works, but retaining live rows and the existing query contract
buys essentially no tick speed and makes prediction clones substantially more expensive in this implementation.
If choosing a library for contributor familiarity rather than speed, adopt bitECS fully in a separate, explicit
rewrite; do not carry this dual-backend spike as production architecture. Neither choice makes TypeScript systems
portable source code for Unity or Unreal. Cheap save resets remove migration work, not ordering semantics or the
need to publish independent prediction worlds.

## Version and evidence boundary

The brief both asks for a current npm/docs check and prohibits all network except the local broker. The latter
restriction was followed. **The current stable release is unverified.** The local npm registry cache, timestamped
`2026-11-06T21:17:05.512Z`, says `latest: 0.4.0`, `alpha: 0.3.16-3-alpha1`, with registry modification time
`2025-12-06T23:15:32.228Z`. That is evidence from 6 November, not a new registry response.

`npm view ... --offline` and installing by version returned `ENOTCACHED` despite the raw entries existing.
The cached 0.4.0 tarball was extracted from npm's content-addressed cache after verifying its SHA-512, and installed
offline with scripts disabled. Both committed locks use the registry tarball URL and original integrity, not `/tmp`.
No package source was vendored. The installed package includes its README, Intro, API, migration guide and release
notes. The code uses that package's current API, not `bitecs/legacy`.

**What changed since the old report?** No package-version change is established. A useful correction to that report:
0.4.0 explicitly supports ordinary arrays of objects (AoS), arrays of primitives, or typed-array columns (SoA).
Strings do **not** inherently require a separate side table. Its supplied 0.4 release notes describe the rewrite
from 0.3: plain component objects, direct `query`, relationships, prefabs, observers and a separate serialization
module; `Types`, `defineComponent`, `defineQuery` and `Changed` were removed from the new core. Those are changes
from 0.3, **not new changes since 6 November**. `onSet` observes explicit `setComponent`, not arbitrary writes through
Boogle's `mut` row, so Boogle's change tracking is still necessary.

Sources read locally: `node_modules/bitecs/README.md`, `docs/RELEASE_NOTES_0.4.0.md`, declaration files and installed
implementation. Upstream reference links (not fetched in this network-restricted run):
[package](https://www.npmjs.com/package/bitecs), [README](https://github.com/NateTheGreatt/bitECS),
[release notes](https://github.com/NateTheGreatt/bitECS/blob/main/docs/RELEASE_NOTES_0.4.0.md).
Repo starting points: [ECS evaluation](ecs-evaluation.md), [engine portability](engine-portability.md),
[sync contract](../agents/sync.md), [lockstep contract](../agents/lockstep.md).

## What was implemented

`createWorld(components, { store: 'bitecs' })` uses bitECS entity membership and schema-created per-component AoS
arrays. It maps Boogle stamped IDs, including negative prediction IDs, to recycled bitECS IDs. Each world owns its
component arrays and entity index. The old `Map` row store remains the default. All existing World methods and
callers remain; the options are additive. No sim, adapter, view, rule, wire, schema or golden was rewritten.

- Node switches: `BOOGLE_ECS_STORE=bitecs`, optional diagnostic `BOOGLE_ECS_ORDER=native`.
- Vite switches: `VITE_ECS_STORE=bitecs`, optional diagnostic `VITE_ECS_ORDER=native`.
- Explicit `store`/`queryOrder` options win; clones and checked loads preserve the selected backend.
- Default query order remains ascending **Boogle ID**, with the original sorted lists. Native mode deliberately
  violates that part of the API contract to expose what a complete adoption must fix; it is not the compatibility mode.
- Rows remain normal live objects. The data resides in bitECS component arrays, while the canonical list holds the
  same row references. This is a membership/index replacement, **not a packed typed-array SoA conversion**.
- Scheduling, declared access, structural deferral, unique-key indexes, `requires`, dirty marks, auditing, hashes,
  snapshot validation and domain checks remain shared code. A library does not supply these Boogle contracts.
- BitECS clones eagerly copy all rows and rebuild membership. In-house clones still share tables and copy on write.
  This is a deliberate measurable limitation of the spike, not a fundamental impossibility for bitECS.
- Snapshot v1 and float-bit hashes are unchanged because they are already independent of storage. No time was spent
  adding a save migration. A reset was permitted but offered no simplification here.

The storage code changes `world.ts` and adds `bitecs.ts`; `schema.ts` and the public facade need no rewrite.
Packaging also changes: root and server package/lock files pin 0.4.0, and the Docker image exposes the server's
installed packages at `/app/node_modules` so shared `src/ecs` imports resolve. Merely adding a root dependency would
break that image even with the old store selected, since the optional implementation has a static import.
`dev/test-unit.ts` now honors an explicit `UNIT_ONLY` in local mode as well as `--ship`, allowing the requested
`npm run check` to keep its unit phase scoped. Without a selection its behavior is unchanged. The server-image assertion now checks the new root dependency link plus declared server dependencies, rather than
assuming only server/ modules may import packages. No game assertion or golden fixture was relaxed. `dev/bitecs-spike.ts` records repeatable measurements and the raw inventory.

## Results

Initial audited compatibility run: **107/107 assertions passed**, including all nine golden shards, every stage's
hash before and after 1,200 ticks, and the ECS API checks. The final compatibility run passed **813 assertions, zero failures, one existing TODO** across 64 selected files.

The compatibility run separates the requested failure classes:

| Class                            | Compatibility backend                                              | Native-order experiment                                                                             |
| -------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| (a) Real behavior                | Zero failures                                                      | Confirmed: bounded request history evicts the wrong request                                         |
| (b) Ordering only / hash goldens | Zero failures                                                      | Canonical hashing remains enabled; failures require inspecting row content, not assuming byte order |
| (c) Snapshot/save shape          | Same v1 columns, delta IDs, boolean encoding and schema validation | Same canonical snapshot format; native _future behavior_ can differ after clone/load                |

A concrete native-query counterexample uses the actual `railApply` request path. With the 64-outcome limit and 69
rejected requests, canonical order retains requests **6–69**; native order retains **2–64 and 69**. `rail.remember`
uses `w.ids(Outcome)[0]` as the oldest ID, but bitECS swap-removal puts a recent row at the front. This changes retry
results, not just a golden hash. `rail.drop` also selects the first matching pile; directly changing its walk can
change the pile filled and prediction reconciliation. This second case is a code finding, not a measured gameplay bug.

## What order is actually necessary?

The railway is **SERVER state**: `railway-server.ts` registers it with `{ server: true }`, applies actions on arrival,
ticks on the server, and sends changed components. `railway-replicate.ts` mirrors rows and publishes independent
confirmed worlds. Nine older registered states still use lockstep; they are outside this ECS swap.

A server-only system whose operations commute does **not** need canonical iteration for client synchronization.
Clients can mirror its authoritative result. But order still matters when it encodes gameplay policy (oldest history,
first matching pile, priority allocation, tie breaking), when client prediction runs the same operation, and when we
want a restart/replay to continue identically. Use explicit minimum/priority/tie-break selection in those systems,
or a canonical query. Canonical hashes can sort only at hash/save time when the rule semantics are independent of order.
Hash-for-hash tests can be adjusted for an intentional ordering policy change; changing a golden cannot excuse a
retention or allocation bug. Future migration of the nine lockstep states would still require deterministic operations
and deterministic relevant iteration, regardless of which library stores them.

Restoring rows in canonical order is a **startup cost**, not a per-tick sort. It does not preserve order under later
removal: a direct 300-row query went from `[1,2,3,4,5]` to `[1,300,3,4,5]` after deleting ID 2 (at 3,000: ID 3000 fills
that position). Also, restoring canonical order changes a running native world's historical order. Serializing internal
query order or maintaining explicit policy is necessary for exact continuation; merely sorting the restored rows is
insufficient. A canonical cached query invalidated only on structural changes is another option, close to today's store.

## Node measurements

Reproduce: `node dev/bitecs-spike.ts --out .look/bitecs-spike/metrics.json`.
Node **26.13.0**, Apple **M1 Max**, seven warmed batches, median of batch means. Times in microseconds. The machine
was **heavily loaded** (1-minute load 38.74 → 38.20); these are indicative local costs, not quiet-machine throughput
or browser timings. No concurrent benchmark was launched by this task. Raw input order is seeded and shuffled;
sorting copies the query before sorting by stable ID, never mutates bitECS's owned dense query array.

| Direct bitECS, one query per tick                               | 300 entities | 3,000 entities |
| --------------------------------------------------------------- | -----------: | -------------: |
| Unordered query + column walk                                   |         0.99 |          18.87 |
| Copy + canonical sort alone                                     |        26.80 |         468.53 |
| Copy + sort + column walk                                       |        27.35 |         492.30 |
| Canonical restore, sort + create membership + two fields (once) |        91.40 |       1,040.07 |
| Walk after canonical restore (no sort per tick)                 |         1.47 |          19.69 |

One sort costs about **0.027 / 0.469 ms**. Ten equally sized independently sorted queries would cost roughly
**0.27 / 4.69 ms per tick** under these conditions; that is arithmetic, not a measured ten-system railway run.
The sorting case is shuffled every time, unlike a cache or an already sorted list. Restore timings are for the
small synthetic component, not the whole railway's save codec.

| Existing World API, six-field rows | 300 in-house / bitECS | 3,000 in-house / bitECS |
| ---------------------------------- | --------------------: | ----------------------: |
| Canonical read walk                |           1.92 / 3.59 |           35.08 / 34.96 |
| Write all + drain changes          |         12.62 / 13.10 |         132.62 / 130.57 |
| Settled clone                      |         1.06 / 115.44 |           0.51 / 960.23 |
| Clone + eight writes               |        16.46 / 121.01 |       129.66 / 1,005.61 |
| Snapshot                           |         31.57 / 29.61 |         303.35 / 299.72 |
| Load                               |        65.77 / 105.69 |       642.84 / 1,313.10 |

An awake but otherwise idle **real railway** plus changes-drain costs 2.95 / 2.97 µs at its actual fresh **441**
entities, and 2.55 / 2.98 µs when padded with inert piles to 3,000. Its settled clone costs 7.91 / 256.46 µs and
5.40 / 1,206.77 µs respectively. The script labels the requested small size 300 but records `entities: 441`; the
fresh railway cannot be reduced to 300 without removing catalog entities. The synthetic tests above are exactly
300 and 3,000. The near-flat railway tick is expected: inert piles are not an all-entity active workload. It is not
evidence about a fully active 3,000-entity campaign, rendering, networking, or felt input latency.

## Fields and integers

Runtime schema census: **33 components, 226 fields**: **194 `int`, 13 `u8`, 12 `bool`, 6 `str`, 1 `f64`**.
Strings are `beam.state`, `beam.holder`, `account.pid`, `outcome.pid`, `boiler.state`, `boiler.holder`.
There are **zero array-valued fields and zero nested-object-valued fields**; schemas reject those types.
The old nine states and renderer objects are not silently included in this count.

In this AoS store, each field keeps its existing JS primitive directly in the row. A full SoA implementation can
use number columns, boolean or byte columns, and string arrays indexed by eid (or intern strings only if measured
worthwhile). Future arrays/nested data would need a bounded buffer/relationship representation or JS side storage
and an explicit schema/clone/dirty-tracking policy; they cannot be added by silently allowing arbitrary objects.
Do not mechanically map `int` to Int32Array: it currently means a safe JS integer. Nor map today's `f32` schema to
Float32Array without acknowledging rounding: validation currently accepts finite JS doubles. The existing `f64`
is `tree.yaw`, stored from input. A packed SoA conversion must choose precision intentionally.

The library does not require integer state. A server-authoritative position may be a float; integer centimeters,
ticks and conserved counts are modeling choices. Keep inventory and currency exact, ID identity stable, and the
nine lockstep states deterministic. Replacing storage alone is no reason to change all 194 integer fields or add
new quantization. Save resets do not change floating arithmetic, prediction or conservation requirements.

## Adoption choices and portability

Counts are refreshed from this checkout, with the same scope as the portability report: **74 existing TS files
import the facade, 44 under src, 26 tests, 3 tools and 1 server test**. The new benchmark is additional. The source
method census uses the parser (not comment-matching regex) and reviewed World receivers: **714 World method calls
in 32 source files**, plus **104 facade factory calls** (`defineComponent` 34, `defineSystem` 66, `createWorld` 3,
`createSchedule` 1). Thus **818 source call sites**, plus type imports, are the current API-removal inventory, not
818 independent design decisions. Generic component/system factories account for the extra declarations beyond
the 33 runtime railway components. No type-checker semantic query was available; the receiver filter and offsets
are in the measurement script/output for review. Tests and tooling require additional rewrites, not included in 818.

Method counts: `get` 314, `mut` 207, `single` 42, `lookup` 40, `each` 29, `spawn` 27, `run` 15, `count` 10, `ids` 8,
`hash` and `despawn` 4 each, `nextId` 3, `snapshot`, `load`, `reserve`, `has`, `changes` 2 each, `clone` 1.
Only 29 calls are `each`; this is predominantly a keyed-row API. The prior report's 675 was an estimate, not a fixed
migration budget. Core source grows from **720 lines / 708 nonblank** to **843 / 828**: +123 lines (+120 nonblank),
including a 94-line adapter. A full adoption could delete at most those original 708 nonblank lines gross, but
schema codecs, scheduling, tracking and identity need equivalents. Store-only adoption cannot claim that deletion.

| Choice                      | Size and what it deletes                                                                                                                                                                      | What it buys                                                                                                    | What it risks                                                                                                                                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stay in-house (recommended) | No migration; discard this spike rather than add permanent parallel implementations                                                                                                           | Already small bounded store; cheap clones; no new dependency; known row/schema/system contracts                 | Own maintenance; limited library familiarity; custom features should not grow without revisiting a library                                                                                                                                    |
| bitECS store only           | Small core integration plus dependency/image wiring; replaces row Maps, but deletes almost none of the public API or policy code                                                              | Library membership and query engine behind an unchanged facade; gradual backend experimentation                 | Extra mapping and duplicate indexing; library hidden from contributors; no measured tick gain; this eager clone regression; dependency and build cost                                                                                         |
| Full bitECS                 | Large source/API rewrite across 44 source importers plus tests/tools/server consumers; remove World facade, sorted row lists/intersections, custom membership and possibly COW implementation | Native queries/operators, relationships, observers, established vocabulary; can use packed columns where useful | Most access sites are keyed row reads/writes, not query loops; must rebuild key maps, dirty tracking, stamped IDs, prediction publication, schemas, access/schedule policy and validation; order-dependent behavior and precision regressions |

Full adoption should not claim it deletes the whole core without replacement: bitECS deliberately provides no Boogle
scheduler, request history, network identity or prediction snapshots. Its ecosystem and familiar vocabulary are real
potential advantages; we have no fresh adoption/popularity data in this offline run. AoS-on-bitECS is not materially
closer to Unity DOTS/Unreal Mass's chunk-oriented storage than Boogle's present component/system decomposition.
A deliberate SoA/system rewrite is closer conceptually but still not compatible memory layout or source code.

**Unity or Unreal later:** expect to rewrite TypeScript rules in C#/C++, choose DOTS/Mass versus ordinary engine
objects, replace renderer/physics/input/assets, and rebuild networking. Component schemas, explicit authority,
system ordering, invariants and behavioral fixtures are the reusable specification. Neither engine promises stable
ID-sorted query order merely because it is an ECS. These engine comparisons inherit the official-source research in
[ecs-evaluation](ecs-evaluation.md#4-conforming-to-tested-engines) and [engine-portability](engine-portability.md);
current engine documentation was not fetched under the network restriction.

**Keep the TypeScript authoritative server and port only the client:** this preserves railway systems, save codec,
server tests and most rules exactly. Implement the replication mirror/protocol and engine views in C#/C++, translate
only the locally predicted rules (or reduce prediction and accept the responsiveness tradeoff), and deal separately
with the nine classic lockstep states: a client cannot simply stop simulating those until they become server-owned
or get a compatible deterministic implementation. Server physics and client movement reconciliation remain separate
work. This alternative preserves much more code than swapping ECS libraries now, whether the server remains
in-house or adopts bitECS.

## Final validation and limits

**Compatibility backend:** `BOOGLE_ECS_STORE=bitecs UNIT_ONLY="<64 files>" node dev/test-unit.ts`
passed 813, failed 0, TODO 1 (814 total), 110.02 s. Selection is the affected ECS/railway/replication files plus
server-image and unit-mode guards, recorded in `.look/bitecs-spike/unit-files.txt`. No whole unit suite was run.
The existing TODO is `railway-install.test.ts`: all-longer fleet, seed `b011e7`, 75% headway, wait 1,152 ticks versus
its 1,050-tick target. It appears on the old store as well and is explicitly marked TODO in the test; not a backend
regression and not silently fixed here.

**Old default checkpoint:** `npm run check` with the same explicit `UNIT_ONLY`, `BOOGLE_ECS_STORE=inhouse`, passed
in 82.95 s: full lint/typecheck, scoped units (813 pass, 1 TODO), registry, level/clearance/grounding checks, assets
and production build. `node dev/ship-check.ts` passed in 80.57 s: registry, lint, typecheck, **89 affected files,
1,004 passing assertions and 1 TODO**. The old store remains the unset default; these prove tested behavior and
build health, not identical bundle bytes (bitECS is statically imported).

**Native experiment, exact initial failures:** same 64-file selection: 717 pass, 96 fail, 1 TODO, 108.96 s.
One failure was the server-image guard's old package-location assumption; updating it alongside the Docker link
passed all six image assertions, and the full compatibility rerun above includes that fix. The other **95** are:

| Failing file/group                                                        | Count | Diagnosis                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ecs.test.ts`, round-trip                                                 |     1 | **(b)** Hash and snapshot equal after load; the explicit iteration-order assertion fails. Native live order differs from canonical restore order.                                                                                                      |
| `railway-golden-0` through `-8`, every stage except `awake`               |    43 | **(a)** Different retained request rows. Every component other than `outcome` matches, both at the stage and after 1,200 ticks, in a separate per-component SHA-256 comparison. Not merely hash byte order.                                            |
| `railway-tick-order.test.ts`, nine stage traces and twelve headway traces |    21 | **(a)** Hashes include the already different seeded outcome history. Tick-system scheduling itself was not changed.                                                                                                                                    |
| `railway-ops.test.ts`, opening/axe/boiler/call/foot streams               |     5 | **(a)** Golden world hashes diverge when request history differs; no snapshot schema changed.                                                                                                                                                          |
| `railway-line-authority.test.ts`                                          |     2 | **(a)** An accepted request's retry becomes `snapshot-required` (request 106), and replay-after-restore hash equality fails.                                                                                                                           |
| `railway.test.ts`, terminal receipts                                      |     1 | **(a)** An evicted request is incorrectly still retained (`accepted` instead of `snapshot-required`).                                                                                                                                                  |
| `railway-m12.test.ts`, 22 stage traces                                    |    22 | **(b), confirmed diagnostic** The scripted random action chooses an index from unsorted pile IDs, so changing enumeration changes the _input stream_. Sorting only that test driver's choice restores all 32 M12 tests, with native systems unchanged. |

The M12 diagnostic used a temporary Node load hook replacing only
`const ids = pilesWithIds(w).map((p) => p.id);` with the same expression followed by `.sort((a, b) => a - b)`.
It never rewrote the test file, assertions or recorded fixture. Its passing result does not approve changing
production pile-selection policy. The unmodified native run remains a deliberate failing diagnostic; canonical
mode is the compatible backend. **(c) zero save-shape failures**: same v1 schema; changed request _content_ is (a),
not a format incompatibility. Native restore order is (b) until a subsequent order-sensitive operation changes behavior.

Evidence (worktree-local, not claimed as uploaded or deployed):

- `.look/bitecs-spike/metrics.json`: raw warmed Node batches, load, fields and retention counterexample.
- `.look/bitecs-spike/inventory.json`: reviewed-receiver AST counts and every method call's source offset.
- `.look/bitecs-spike/canonical-final.json` / `.log`: final scoped bitECS run.
- `.look/bitecs-spike/native-unit.json` / `.log`: original native run and full failure names.
- `.look/bitecs-spike/stage-diff.json`: all 44 stages, before and after 1,200 ticks; only outcome differs in 43.
- `.look/bitecs-spike/native-m12-sorted-inputs.log` and `m12-order-loader.ts`: isolated input-order diagnosis.
- `.look/bitecs-spike/check.json` and `ship-check.json`: old-default checkpoint commands, selections and exit codes.

Broker work was submitted on the implementation tree with both `BOOGLE_ECS_STORE=bitecs` and
`VITE_ECS_STORE=bitecs`: `net`, two-player `playthrough --to T2 --warp-speed 3`, `scenario world-inputs`, and
`perf --sim`. At report time they are **queued behind other sessions**, not passed. Request IDs, respectively:
`1794557418336-73871`, `1794557493615-75043`, `1794557494857-75059`, `1794557496108-75065` under `.look/see/`.
The broker has not returned completed evidence manifests. No PNG was opened; no visual verdict, bot completion,
network success, GPU timing or real-time feel is claimed. The visual question for the two-player segment is whether
both clients see coherent progress through T2; that remains unverified. No bot failure has been observed because
no bot result is available. The queued broker owns browser execution; it was not bypassed.

The server Docker image was not built here. Latest upstream release/docs remain unverified under the network ban.
`npm run inflight` failed writing the shared worktree's FETCH_HEAD; it was not retried with a fetch. Local commits
required the authorized Git sandbox escalation. No push, ship, stash, save reset or ROM assets were used.
