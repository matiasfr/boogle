# Feature organization and performance audit

2026-11-03. Audited commit `9d785b5c66fc06cbbddb31e9f5e6e0a680adeb15`, tree
`bb4e5655b2a7b8c04f53bda8e623560b3ad12878`. Audit only: no changes to game, server, harness or design.
Principles served: **Small and readable**, **Understandable at a glance**, and **Measure before optimizing** in
DESIGN.md. The Boogler's dialogue, gifts, small talk and HUD copy remain untouched, including in recommendations.

## Answer

**Keep the flat `src/features/` folder as the game's composition-entry layer.** It is not a folder of 60 independent
per-frame systems. Reusable implementation belongs in domain modules; entities supply lifetime and scheduling wherever
their owner lives. Selectively extract large implementations, retaining their eager entry stubs. A recursive eager glob
would make helper modules into accidental entry points and put startup ordering at risk, with no demonstrated speed gain.

**The largest measured CPU costs are outside that folder:** rendering submission, physics, and the place prototype.
Plain feature-service hooks totaled 0.033–0.035 ms/frame in these samples. This excludes feature-owned entity methods:
those are counted separately below. Small local gains exist, especially unnecessary idle work and deferred menu code;
none justify an ECS rewrite or a folder migration. Render CPU is not GPU time and no measured saving is claimed without
an implementation and before/after run.

**MEASURED** means collected in this audit, including source/build counts. **STATIC** means a code-derived candidate or
architectural inference. Effort S = localized edit, M = coordinated module change and verification, L = broad migration.
Ranked recommendations are limited to five organization and eight performance findings. Supporting inventories are not
additional recommendations.

## Scope, evidence and limits

- Read AGENTS.md, DESIGN.md, `src/README.md`, `src/loop.ts`, `src/entity/entity.ts`, the current prototype plan and
  `docs/proposals/boogle-2.md`, both architecture research documents, and the architecture-review ledger. The ledger has
  only AR-1–AR-3, all **open**; no rejected or deferred finding is being reopened, and those unrelated issues are not repeated.
- External network use was prohibited. Engine comparisons below use the checked-in primary-source research notes dated
  November 1; URLs are supplied for traceability, **not represented as freshly fetched**. No new GDC/postmortem search
  was possible. `npm run inflight` was not run because `dev/inflight.ts` fetches Git refs and calls GitHub; local status
  showed a clean dedicated `codex/features-audit` branch before this report.
- Node v24.11.1; dependencies already installed. `npm run inspect -- --json` succeeded, 240 Node frames, 0.168 ms average,
  0.254 p95, 12.352 max. This only loads headless kinds and is **not** browser/game performance.
- The broker supports look/playthrough/scenario, not perf/counts. `npm run perf`, `npm run counts` and
  `npm run inspect -- --browser` were **not invoked**: their implementations launch Chromium directly
  (`dev/look/perf.ts`, `dev/look/counts.ts:49`, `dev/sim/inspect.ts:38`), contrary to the broker-only instruction.
  Instead, broker page evals called `window.boogle.inspect()`, `prof.table(Infinity)`, the existing GPU observer, and the
  same shadow-on/off counter method used by perf. A local Vite build reproduced counts' first-load gzip procedure.
  This is a policy/interface limitation, not a falsely claimed failed sandbox attempt.
- Actual adapter: **Apple, metal-3, non-fallback**, HeadlessChrome 156.0.8078.4, WebGPU. These are **not SwiftShader**
  numbers. The original audit could not verify the chip via sandboxed `ps`/`sysctl`; the subsequent hardware run below
  identifies an **M1 Max**, with other jobs running. **Exclusive GPU use was not established**. Treat timings as
  descriptive samples, not controlled budgets. No M4 iPad measurement was made.
- All three runtime captures used 960×600, DPR 1, `dpr=fixed`, 4× MSAA, a 2048² shadow map and the existing harness HUD.
  Each waited for at least 300 completed real-time frames before reading the profiler's last 240. Pages were not
  cross-origin isolated; individual timer samples are quantized around 0.1 ms. Means printed to 0.001 ms do not imply
  microsecond measurement precision. The original captures had no GPU timestamp benchmark; the subsequent hardware
  run below adds GPU timings. No browser allocation/layout/DSP trace was collected.
- Broker manifests record unchanged tested source trees before/after. The broker's trusted harness had pre-existing
  dirty files, identical before/after each run; this audit did not edit them. Report-only changes do not change game code.

### Subsequent hardware measurements

Taken afterwards with `npm run perf -- --hardware`, at **1728×1000, DPR 1, on an M1 Max**, using the **spawn camera,
with other jobs running**. These supplied measurements are separate from the original broker captures, not a controlled
before/after comparison or a rerun by this documentation correction.

| Scene  | CPU avg / p95 ms | GPU avg / p95 ms | Calls | Shadow calls | Triangles | Programs |
| ------ | ---------------- | ---------------- | ----- | ------------ | --------- | -------- |
| Island | 1.49 / 1.85      | 2.90 / 3.38      | 136   | 46           | 222k      | 94       |
| Place  | 2.83 / 3.35      | 3.15 / 5.18      | 244   | 71           | 645k      | 153      |

The unmeasured risks are **DPR 2, iPad, 8 players, burst moments and water**. These spawn samples do not settle them.

### Evidence index

Paths are relative to this checkout; `.look/` artifacts are local, ignored, and delivered by the launcher's evidence handoff.

| ID  | Run and result                                                                           | Manifest / report                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Bot, 60-game-second stall limit: failed before first progression beat                    | [.look/evidence/1793694015184-89452/evidence.json](../../.look/evidence/1793694015184-89452/evidence.json), [report](../../.look/evidence/1793694015184-89452/run/report.txt) |
| B2  | Bot, 180-game-second stall limit: 24 game minutes in 77 wall seconds; incomplete         | [manifest](../../.look/evidence/1793694052726-91373/evidence.json), [report](../../.look/evidence/1793694052726-91373/run/report.txt)                                         |
| L   | Saved checkpoints listed after B2                                                        | [manifest](../../.look/evidence/1793694172078-95310/evidence.json)                                                                                                            |
| I   | Ordinary island overview, stationary, capture checks passed                              | [manifest](../../.look/evidence/1793694065644-92159/evidence.json), [raw counters](../../.look/evidence/1793694065644-92159/output.txt)                                       |
| P   | Place, `objective: Follow the path.` checkpoint, stationary, capture checks passed       | [manifest](../../.look/evidence/1793694076720-92402/evidence.json), [raw counters](../../.look/evidence/1793694076720-92402/output.txt)                                       |
| M   | Place, `path opened` checkpoint, W+Shift for 300 completed frames, capture checks passed | [manifest](../../.look/evidence/1793694220934-95801/evidence.json), [raw counters](../../.look/evidence/1793694220934-95801/output.txt)                                       |

Reproduction helpers and full data: `.look/audit-sample.ts`, `.look/audit-moving.ts`, `.look/audit-build.ts`,
`.look/audit-build.json`, `.look/audit-report.ts`, `.look/audit-runtime.json`. These are disposable audit artifacts, not
new committed harnesses. `audit-build.ts` adds a read-only Rollup observation plugin and builds into `.look/audit-dist`.

## A. Organization

### Inventory of every feature entry

**MEASURED:** 60 TypeScript files, 5,949 lines, matching the supplied baseline. **STATIC:** primary categories below are
judgments; several entries span categories. Infrastructure/telemetry is 28 files / 691 lines; world/critter content
10 / 1,816; gameplay systems 8 / 1,529; adapters 8 / 571; UI/HUD 5 / 1,056; input 1 / 286.
Every file has a reason to retain an entry here; **zero complete entry moves are necessary**. Implementation extraction
is a different question. File names below are under `src/features/`; counts include comments and blank lines.

| File                 | LOC | Category                 | Actual role and disposition                                                     |
| -------------------- | --: | ------------------------ | ------------------------------------------------------------------------------- |
| adaptive-res.ts      | 121 | Infrastructure/telemetry | Resolution policy; keep service entry                                           |
| ball-rest.ts         |  38 | Adapter                  | Owner ball to persistent resting pose; keep                                     |
| blob-shadows.ts      |  44 | World/critter content    | Night shadow pool entity; keep                                                  |
| boogler.ts           |  44 | World/critter content    | Spawn/schedule NPC implemented in boogler/; keep                                |
| buddy.ts             |  29 | Gameplay system          | Avatar asset/camera startup; keep eager registration                            |
| controls-check.ts    |  14 | Infrastructure/telemetry | Development control registry diagnostic; keep                                   |
| critter-fireflies.ts |  91 | World/critter content    | Local flock entity; keep                                                        |
| critter-fish.ts      | 200 | World/critter content    | Local school entity; keep                                                       |
| critter-gulls.ts     | 244 | World/critter content    | Local flock entity; keep                                                        |
| day-night.ts         |  22 | World/critter content    | Sky entity wiring; keep                                                         |
| debug-cam.ts         |   3 | Infrastructure/telemetry | Flagged loader; keep                                                            |
| debug-handle.ts      |  42 | Infrastructure/telemetry | Harness/debug API registration; keep                                            |
| dino.ts              | 207 | World/critter content    | NPC/guest activation, presence, controls; keep entry                            |
| fall.ts              |  13 | Gameplay system          | Conditional arrival sequence loader; keep                                       |
| feel.ts              | 266 | Gameplay system          | Avatar spring/flop service; possible player/ implementation                     |
| first-run.ts         | 114 | UI/HUD                   | Temporary controls card entity; keep                                            |
| gamepad.ts           | 286 | Input                    | Polling, mapping, focus, hints; possible player/ implementation                 |
| gifts.ts             |  18 | Adapter                  | Entity/interactions over adapters/gifts.ts; keep                                |
| haul-stack.ts        | 230 | Gameplay system          | Bundle view and pickup flight; retain entry, conditional shared seam extraction |
| held.ts              | 209 | UI/HUD                   | Held model, controls/HUD/presence; keep entry                                   |
| helper-bank.ts       |  16 | Adapter                  | Snapshot/offline-gap banking; keep                                              |
| home-app.ts          |  53 | Infrastructure/telemetry | Installed-app launch memory; keep                                               |
| honk.ts              | 329 | Gameplay system          | Social action, messages, sound, transient effect; keep                          |
| hut-build.ts         | 450 | World/critter content    | Construction view/physics pieces; possible implementation extraction            |
| identity.ts          |  43 | Adapter                  | Personal identity to roster/presence; keep                                      |
| impact.ts            | 369 | Gameplay system          | Collision feedback and knockdown/presence; keep                                 |
| log-sources.ts       | 100 | Adapter                  | Tree source layout, interaction, view; keep                                     |
| mushrooms.ts         |  11 | Adapter                  | Bounce/interactable wiring over shared adapter; keep                            |
| pause.ts             | 525 | UI/HUD                   | Menu/pages/settings/roster; strongest selective extraction candidate            |
| piles.ts             |  18 | Adapter                  | Entity over shared adapter; keep                                                |
| ping.ts              | 246 | Gameplay system          | Social message/action and short-lived entity; keep                              |
| playdata.ts          |   6 | Infrastructure/telemetry | Conditional playtest recorder loader; keep                                      |
| pois.ts              |  10 | Infrastructure/telemetry | POI composition/loading boundary; keep                                          |
| prof.ts              |  16 | Infrastructure/telemetry | Profiler/boot handles, optional overlays; keep                                  |
| prompt.ts            |  82 | UI/HUD                   | Shared interact prompt entity; keep                                             |
| proto-assets.ts      |   6 | Infrastructure/telemetry | Flagged prototype loader; keep                                                  |
| proto-bar.ts         |   6 | Infrastructure/telemetry | Conditional prototype UI loader; keep                                           |
| proto-crossing.ts    |   6 | Infrastructure/telemetry | Flagged prototype loader; keep                                                  |
| proto-era.ts         |   9 | Infrastructure/telemetry | Flagged prototype loader; keep                                                  |
| proto-haul.ts        |  15 | Infrastructure/telemetry | Tuning environment and flagged loaders; keep                                    |
| proto-lay.ts         |   4 | Infrastructure/telemetry | Flagged prototype loader; keep                                                  |
| proto-look.ts        |   9 | Infrastructure/telemetry | Flagged graphics lab loader; keep                                               |
| proto-minis.ts       |   4 | Infrastructure/telemetry | Flagged prototype loader; keep                                                  |
| proto-net.ts         |  15 | Infrastructure/telemetry | Route normalization/loader; keep                                                |
| proto-place.ts       |  13 | Infrastructure/telemetry | Room normalization/loader; keep                                                 |
| proto-soapbox.ts     |  28 | Infrastructure/telemetry | Loader and driving-peer visibility on normal pages; keep                        |
| proto-wagon.ts       |   9 | Infrastructure/telemetry | Conditional wagon/panel loader; keep                                            |
| proto-water.ts       |   5 | Infrastructure/telemetry | Flagged prototype loader; keep                                                  |
| record.ts            |   4 | Infrastructure/telemetry | Flagged input recorder loader; keep                                             |
| return-spot.ts       |  47 | Gameplay system          | Personal arrival position restore/save; keep                                    |
| splash.ts            |  13 | World/critter content    | Splash entity over shared renderer; keep                                        |
| syncsafety.ts        |   3 | Infrastructure/telemetry | Flagged netdebug loader; keep                                                   |
| telemetry.ts         | 123 | Infrastructure/telemetry | Event reports/batching; keep                                                    |
| track-machine.ts     | 501 | World/critter content    | Machine/rails/sleepers/body/platform; possible implementation extraction        |
| updates.ts           |  97 | Infrastructure/telemetry | Mixed-build notice/reload; keep                                                 |
| wake-lock.ts         |  36 | Infrastructure/telemetry | Browser lifecycle integration; keep                                             |
| walk-layout.ts       |  27 | Infrastructure/telemetry | Debug-flag-only layout pinning; inactive without `?layout=`                     |
| welcome-back.ts      | 126 | UI/HUD                   | Return card and room memory; keep                                               |
| work-sites.ts        | 327 | Adapter                  | State to rings/plaques/pours; keep                                              |
| world.ts             |   7 | Infrastructure/telemetry | Tick/background-clock service wiring; keep                                      |

The hook baseline needs correcting: **8 files, 9 actual `onFrame` registrations**, not 9 files. `impact.ts` registers
world and late hooks. A substring search also finds `welcome-back.ts:80`'s one-shot `requestAnimationFrame`.
The eight service files are confirmed by `eslint.config.js:119–134`.

### Boundaries and real ordering dependencies — STATIC

`src/main.ts:22–24` loads feature and entity entries. `src/entities/` separates state/view/headless modules for long-lived
objects; `src/player/` owns shared controller, input, UI and avatar services; `src/pois/` owns spatial content;
`src/boogler/` owns NPC logic, presentation and copy. A feature may own an entity directly (`ping`) or install one
implemented elsewhere (`boogler`). There is no requirement that every entity live in `src/entities/`.

No feature-to-feature imports were found. Shared boundaries are concrete, not hypothetical: `player/hands.ts:48–49`
imports gift/mushroom adapters; `features/{gifts,piles,mushrooms}.ts` installs lifecycle; `render/haul-pieces.ts:14–37`
shares geometry/pickup events between piles, bundle, sites and machine; `player/arrival.ts` serves return spot, home app
and welcome card. Controls and hands are registries used across features. The rule explains why reusable exports cannot
remain in a feature; static reading alone cannot establish the historical reason for every extraction.

One permitted exception is prototype-to-feature coupling: `proto/place/coop.ts:33`, `run.ts:8`, `verbs.ts:4`, `chop.ts:15`
and `proto/haul/magnet.ts:24` import `features/haul-stack.ts:115–122`'s attachment helpers. These are five prototype
consumers of a presentation seam, not feature-to-feature violations.

| Dependency                                   | Evidence and consequence                                                                                                                                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Props before NPC creation                    | main.ts:30–36 builds terrain/props/stall before start; boogler.ts:24–26 intentionally waits until onStart                                                                                            |
| Layout finalization after source population  | walk-layout.ts:3–4,15–21 relies explicitly on alphabetic startup after gifts.ts:7–8 and log-sources.ts:24–26; gifts adapter adds the perch at adapters/gifts.ts:77; layout then overwrites home data |
| Start order is registration order            | loop.ts:146–159 runs callbacks in insertion order; late onStart registrations run immediately; no async barrier                                                                                      |
| World before same-frame readers              | world.ts:6 update −10, sky update −5; keep lockstep registration eager regardless of render loading                                                                                                  |
| Avatar before cosmetic adjustment            | core avatar update −290/−280, camera −200, feel.ts:249–255 update 20; proto-soapbox.ts:17–26 hides driving remotes at 30                                                                             |
| Collision feedback phases                    | impact.ts:326–368 reads collisions in world, applies late feedback at −10                                                                                                                            |
| Haul presentation orders                     | piles 30, bundle 32, work-sites 34, machine 35, log sources 36, hut 38; preserve order, but adjacency does not prove every pair depends on the previous one                                          |
| Pad polling after player intent              | gamepad.ts:286 is late; main.ts:50 runs prePhysics first, so newly polled movement reaches the next intent frame; static latency candidate, not a measured feel defect                               |
| Interaction selection shared within frame    | player/hands.ts:121–131 caches the first pick; highlights, held state and prompt do not each rescan all providers                                                                                    |
| Pause before conversation watcher            | player/conversation.ts:111–117 deliberately installs its pointer-lock watcher after pause; lazy UI extraction must preserve it                                                                       |
| Control diagnostic is only one-turn deferred | controls-check.ts:7–12 waits a timer turn for eager onStart registrations; does not cover arbitrarily late imports                                                                                   |

### Comparison to established engines

These are the engines' documented lifecycle structures as recorded in
[the checked-in primary-source notes](notes/entity-architecture/sources.md), lines 18–54, not freshly verified external claims.

| Engine | What its docs describe                                                                                                                                                                                                                                                                                                                                                                       | Boogle's fit and difference                                                                                                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unity  | Components receive FixedUpdate/Update/LateUpdate; [Script Execution Order](https://docs.unity.com/en-us/engine/6000.0/manual/scripting/managing-update-order/script-execution-order) orders classes, not instances. [UI Toolkit elements](https://docs.unity.com/en-us/engine/current/manual/uitoolkits/uielements/uie-migration-guides/uie-transitioning-from-ugui) are not MonoBehaviours. | Entity kinds and per-phase integers offer a similar scheduling unit. DOM UI can have one owning entity without one entity per widget. No editor/prefab lifecycle or native/managed dispatch boundary here. |
| Unreal | [Actor ticking](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-ticking-in-unreal-engine) has groups and prerequisites; components can have multiple tick functions. [Subsystems](https://dev.epicgames.com/documentation/en-us/unreal-engine/programming-subsystems-in-unreal-engine) manage service lifetimes; UUserWidget is not an Actor.                              | Boogle separates objects and services, with numeric single-thread order instead of tick prerequisites. Feature entry modules are composition, not Unreal Actors or asset folders.                          |
| Godot  | [Nodes](https://docs.godotengine.org/en/stable/classes/class_node.html) have process priority, tree-order ties, deferred freeing; [autoload guidance](https://docs.godotengine.org/en/stable/tutorials/best_practices/autoloads_versus_regular_nodes.html) distinguishes services managing their own data. Servers hold hot data independently of nodes.                                     | Boogle has import-order ties, deferred teardown and plain shared services. ES module setup replaces scene-tree setup; scene graph remains a view, never simulation authority.                              |

None of these sources proves that a flat TypeScript folder is universally optimal. The relevant shared principle is
**separate lifetime, reusable data/services and composition**. Boogle already does that. Unity's historical 10,000-Update
native/managed overhead is not evidence that 60 ES modules or Boogle's kind walkers are slow.

### Ranked organization recommendations

1. **Keep flat composition entries; clarify their role in the source map (STATIC).** Evidence: 60 files but only eight
   service-hook owners; 44-line Boogler and 18-line gifts delegates; main.ts:22–24 and entity.ts:1–42. Expected gain:
   clearer ownership with zero migration churn; **no runtime gain claimed**. **S, low risk.** A full category migration
   touches up to 60 paths, CSS imports, docs, glob/allowlists and startup order: **M/L**, with no measured benefit.
2. **Make layout finalization explicit when that area next changes (STATIC).** Evidence: walk-layout's documented
   alphabetic dependency above, active only with `?layout=`; without that debug flag it does nothing. Expected gain:
   preserve debug-layout ordering after renames, not prevent normal home-layout/save regressions; **0 ms expected**.
   **S/M, low priority, debug-flag-only ordering risk.** A local composition call is enough; no general dependency framework.
3. **Extract pause implementation selectively, leaving its entry (STATIC).** At 525 lines it is 8.8% of feature TS;
   pause.ts:477–524 combines menu/input/lifetime setup with page builders. Expected gain: one coherent implementation
   boundary; load opportunity quantified below. **M, medium input/first-open risk.** `ui/` or `player/` is a natural home.
4. **Keep domain APIs instead of creating a universal shared folder (STATIC).** Evidence: adapters, hands, arrival and
   haul-pieces dependencies above. Expected gain: retain explicit authority and reuse boundaries; **no speedup claimed**.
   **S documentation effort, low risk.** No blanket relocation of UI, input or content entries is justified.
5. **Extract the haul presentation seam only on graduation or new stable reuse (STATIC).** Five prototype consumers
   import registration-side exports. Expected gain: decouple those five imports once the API stabilizes; **0 ms expected**.
   **S/M, medium attachment-alignment risk.** Active prototypes stay intact; do not reshape core to tidy them.

## B. Performance

### Runtime and startup measurements

These are different scenes/actions, not before/after optimization trials. I = island overview; P = place start idle;
M = movement from the opened-path checkpoint. Render statistics are captured just after the sampled CPU window,
so moving scene counts and the CPU window are not frame-identical.

| MEASURED metric                          |                 I |                 P |                 M |
| ---------------------------------------- | ----------------: | ----------------: | ----------------: |
| CPU frame average / p95 / maximum, ms    | 2.078 / 2.5 / 4.9 | 3.084 / 3.4 / 5.1 | 3.387 / 3.8 / 4.2 |
| Render submission CPU average, ms        |             1.321 |             1.982 |             2.143 |
| Physics residual CPU average, ms         |             0.305 |             0.370 |             0.452 |
| Plain features/*.ts hooks, ms            |             0.035 |             0.033 |             0.034 |
| place/index.ts update hooks, ms          |            absent |             0.192 |             0.207 |
| Draw calls, including shadow work        |               138 |               243 |               242 |
| Shadow draws, separate-frame difference  |                49 |                72 |                63 |
| Triangles                                |           232,997 |           646,681 |           757,803 |
| Geometries                               |               106 |               278 |               286 |
| Programs (renderer memory counter)       |                94 |               153 |               158 |
| Registered entity kinds / live entities  |           48 / 51 |           48 / 50 |           48 / 50 |
| Navigation to interactive, ms            |             1,275 |             1,640 |             1,881 |
| Entry to all eager modules evaluated, ms |               401 |               374 |               471 |
| GPU-ready to shaders mark, ms            |               511 |               782 |               847 |

Shadow deltas use the existing sky debug switch, restored immediately afterward. Moving objects can change the delta.
Programs are the renderer's program/stage counter, **not** a count of unique materials or pipelines. The GPU observer
reported three render passes in all three cases and 0/1/1 compute dispatches in I/P/M; actual per-run targets are in the raw manifests' output. No GTAO
was enabled in the place flags. Core scene uses HDR plus output, with shadows (`render/scene.ts:84–92`), so CPU attributed
to render includes submission and three.js work across the whole scene, including feature-created meshes.

Startup marks come from `boot/timeline.ts:17–20` and `main.ts:25–36`. They measure a local **development** module graph,
without a service worker, not cold production load over a real connection. Entry→modules includes fetching, parsing,
evaluation and shared dependencies; **isolated feature evaluation time is not available**. `onStart` lazy imports may
race shader warm-up. Resource entries saturated the default 250-entry buffer, so dev transfer totals are incomplete and
are not substituted for the production gzip measurement. A 60 fps one-second harness health sample is not a benchmark.

### Per-phase CPU — MEASURED, grouped from existing labels

| Phase/section, average ms per rendered frame                     |     I |     P |     M |
| ---------------------------------------------------------------- | ----: | ----: | ----: |
| prePhysics                                                       | 0.017 | 0.014 | 0.021 |
| world / entity postPhysics, excluding mixed impact               | 0.006 | 0.012 | 0.011 |
| update                                                           | 0.286 | 0.503 | 0.564 |
| late / entity lateUpdate, including playdata                     | 0.097 | 0.158 | 0.142 |
| Entity fixedPre, across 0–4 steps/frame                          | 0.018 | 0.017 | 0.019 |
| Entity fixedPost, across 0–4 steps/frame                         | 0.020 | 0.023 | 0.024 |
| Mixed impact + teardown labels, unassigned                       | 0.009 | 0.009 | 0.010 |
| Physics residual, excluding separately marked entity fixed hooks | 0.305 | 0.370 | 0.452 |
| Render CPU                                                       | 1.321 | 1.982 | 2.143 |

Source mapping: loop.ts phase contract, entity.ts fixedHook and walker mapping, and literal onFrame options. `playdata`
is late (`src/proto/playdata/record.ts:400`). `impact.ts`'s two phases share a profiler name, and teardown shares one
name across phases. Their CPU cannot be split exactly with this profiler; these buckets are explicitly partial, not
fabricated phase timers. Summing individually rounded rows differs slightly from total frame time. Fixed costs are
per rendered frame, not per fixed step. `main: physics` also contains unseparated service pre/post-step work.

### Per-entity and feature-service CPU — MEASURED

All registered kinds are included, including empty kinds. Each cell is live count / average ms per rendered frame,
summed across that kind's phases. A dash means no timed method, **not zero rendering or physics cost**. Fish/gulls
are flock entities (one kind instance contains 36 fish/seven birds). Static geometry costs occur in rendering; entity
methods can call code outside the folder where the kind is registered.

| Entity kind     | I count / ms | P count / ms | M count / ms |
| --------------- | -----------: | -----------: | -----------: |
| ball            |    1 / 0.019 |    1 / 0.011 |    1 / 0.013 |
| ball-carry      |    1 / 0.003 |    1 / 0.002 |    1 / 0.002 |
| ball-view       |    1 / 0.005 |    1 / 0.005 |    1 / 0.005 |
| blob-shadows    |    1 / 0.000 |    1 / 0.000 |    1 / 0.000 |
| boogler         |    1 / 0.060 |    1 / 0.045 |    1 / 0.048 |
| boogler-fx      |        1 / — |        1 / — |        1 / — |
| boogler-ride    |    1 / 0.001 |    1 / 0.003 |    1 / 0.002 |
| camera          |    1 / 0.059 |    1 / 0.047 |    1 / 0.069 |
| cloud           |    9 / 0.004 |    9 / 0.003 |    9 / 0.002 |
| conversation    |    1 / 0.004 |    1 / 0.002 |    1 / 0.003 |
| dino            |    1 / 0.001 |    1 / 0.003 |    1 / 0.002 |
| fireflies       |    1 / 0.001 |    1 / 0.001 |    1 / 0.002 |
| first-run       |    1 / 0.004 |    0 / 0.000 |    0 / 0.000 |
| fish            |    1 / 0.038 |    1 / 0.021 |    1 / 0.028 |
| gifts           |    1 / 0.019 |    1 / 0.031 |    1 / 0.028 |
| gulls           |    1 / 0.011 |    1 / 0.012 |    1 / 0.008 |
| haul-stack      |    1 / 0.007 |    1 / 0.005 |    1 / 0.005 |
| held            |    1 / 0.010 |    1 / 0.011 |    1 / 0.013 |
| honk            |    1 / 0.001 |    1 / 0.000 |    1 / 0.000 |
| hud             |    1 / 0.009 |    1 / 0.008 |    1 / 0.003 |
| hut-build       |    1 / 0.006 |    1 / 0.006 |    1 / 0.003 |
| hut-loose-pole  |        0 / — |        0 / — |        0 / — |
| log-sources     |    1 / 0.001 |    1 / 0.001 |    1 / 0.002 |
| mushroom        |    0 / 0.001 |    0 / 0.000 |    0 / 0.000 |
| mushroom-bounce |    1 / 0.002 |    1 / 0.004 |    1 / 0.003 |
| mushroom-cap    |        0 / — |        0 / — |        0 / — |
| mushroom-stall  |        1 / — |        1 / — |        1 / — |
| pause           |    1 / 0.002 |    1 / 0.002 |    1 / 0.001 |
| piles           |    1 / 0.000 |    1 / 0.002 |    1 / 0.001 |
| ping            |    0 / 0.000 |    0 / 0.001 |    0 / 0.000 |
| player          |    1 / 0.019 |    1 / 0.023 |    1 / 0.023 |
| player-intent   |    1 / 0.005 |    1 / 0.005 |    1 / 0.011 |
| player-jump     |    1 / 0.004 |    1 / 0.003 |    1 / 0.006 |
| player-view     |    1 / 0.044 |    1 / 0.042 |    1 / 0.059 |
| prompt          |    1 / 0.003 |    1 / 0.002 |    1 / 0.003 |
| props           |        1 / — |        1 / — |        1 / — |
| props-view      |        1 / — |        1 / — |        1 / — |
| remote-player   |    0 / 0.003 |    0 / 0.003 |    0 / 0.003 |
| room-memory     |    1 / 0.000 |    1 / 0.000 |    1 / 0.001 |
| sea             |    1 / 0.002 |    1 / 0.002 |    1 / 0.002 |
| sky             |    1 / 0.015 |    1 / 0.015 |    1 / 0.012 |
| sky-disc        |        2 / — |        2 / — |        2 / — |
| splash          |    1 / 0.004 |    1 / 0.004 |    1 / 0.004 |
| terrain         |        1 / — |        1 / — |        1 / — |
| throw-preview   |    1 / 0.002 |    1 / 0.002 |    1 / 0.002 |
| track-machine   |    1 / 0.003 |    1 / 0.004 |    1 / 0.009 |
| welcome-back    |    0 / 0.000 |    0 / 0.000 |    0 / 0.000 |
| work-sites      |    1 / 0.008 |    1 / 0.006 |    1 / 0.005 |

Kinds declared in feature files total **0.197 / 0.179 / 0.180 ms** in I/P/M. Combined with plain feature hooks,
that is **0.232 / 0.212 / 0.214 ms**, approximately **11.2% / 6.9% / 6.3%** of total measured CPU. This attributes
called implementation to its owning hook, not strictly to source lines physically under features/. It excludes rendering
and physics costs caused by feature-created objects; the folder's total causal cost cannot be obtained by summing hooks.

| Feature service | Phase/order                      |     I ms |     P ms |     M ms |
| --------------- | -------------------------------- | -------: | -------: | -------: |
| ball-rest       | update 0                         |    0.002 |    0.003 |    0.004 |
| feel            | update 20                        |    0.003 |    0.005 |    0.011 |
| gamepad         | late 0                           |    0.001 |    0.000 |    0.000 |
| identity        | late 40                          |    0.013 |    0.013 |    0.007 |
| impact          | world 0 + late −10, merged label |    0.008 |    0.006 |    0.005 |
| proto-soapbox   | update 30                        |    0.001 |    0.001 |    0.000 |
| world           | update −10                       |    0.007 |    0.005 |    0.007 |
| adaptive-res    | late 2500                        | disabled | disabled | disabled |

### Production first-load size — MEASURED

Local Vite production build; parse the generated `sw.js` first list and gzip each listed file at level 9, exactly the
size method in `dev/look/counts.ts:30–44`. This is a precache/first-load asset inventory, not a network waterfall or all
future dynamically loaded content. The full file/module list is `.look/audit-build.json`.

| Category         | Gzipped bytes |     KiB |
| ---------------- | ------------: | ------: |
| JavaScript       |       513,604 |   501.6 |
| Rapier SIMD WASM |       604,937 |   590.8 |
| CSS              |        11,458 |    11.2 |
| Splash JPEG      |        94,032 |    91.8 |
| Total            |     1,224,031 | 1,195.3 |

Three.js alone is **311,341 gzip bytes**. Together with Rapier WASM that is **74.9%** of the total. This does not imply
that removing either engine is advisable. The 33.5k prototype source lines are not eagerly loaded simply because they
exist; entry stubs select dynamic imports.

**Feature contribution:** Rollup retained 58 feature TS modules with **149,393 rendered bytes before final minification**,
3.0% of the first-list modules' 4,983,146 rendered bytes. `controls-check.ts` and `telemetry.ts` are absent from the
production output. Fourteen CSS module records carry zero rendered JS bytes. All retained feature TS is in first-load
chunks. Feature TS is mixed into the main game chunk (65,196 gzip bytes) and haul-stack chunk (2,385), **67,581 gzip
bytes for their containing chunks**, or 5.52% of all first-load bytes. That is an inclusive container bound for direct
feature TS, **not** an additive feature-only gzip estimate: those chunks contain other code and compression is shared.
It also excludes CSS and reusable dependencies caused by features. Exact marginal feature gzip and transitive ownership
need a deliberate build experiment; no source removal experiment was performed.

Largest feature rendered contributions: track-machine 15,321 bytes; pause 14,951; hut-build 11,927; impact 10,186;
work-sites 9,575; honk 9,136; feel 6,986; gamepad 6,935; ping 6,593; haul-stack 6,582. These are **not gzip sizes**.

### Loading, idle work, allocations, DOM and audio — STATIC unless marked

- **Lazy candidates:** pause page builders (retain button, Escape action, entity/input/conversation setup eagerly);
  dino's file-dialog/parser UI (`dino.ts:23–31`, `guest/rom.ts`, `decomp/files-dialog.ts`, 235 source lines). Keep dino's
  visible NPC and presence registration eager. Critters visible in the opening seconds are not blanket lazy candidates.
  Heavy construction views could be split only after proving they are absent at spawn; no such absence is assumed here.
- **Existing lazy parts:** caves (`pois.ts:10`), conditional first-fall sequence (`fall.ts:10–12`), guest engine/play,
  debug overlays and prototypes. Boogler talk is dynamically imported (`boogler/play.ts:213–228`) but requested on start
  (`features/boogler.ts:41`): it splits the graph without guaranteeing delayed traffic. Keep all his copy. Never defer
  rules, sync ops/state or any first-seconds content (`loop.ts:43–50`). Shared static imports can defeat attempted splits.
- **Idle/offscreen:** 36 fish do 1,260 directed neighbor checks/frame plus 36 matrix writes
  (`critter-fish.ts:103–190`); seven gulls write 21 matrices (`critter-gulls.ts:156–240`) without distance sleep. Those
  kinds still appear in P/M while the player is far from the ordinary island. Hut-build visits 3×43 pieces and dirties
  matrix/color/ghost buffers every frame (`hut-build.ts:414–448`). These are cosmetic sleep/dirty-state candidates.
  Boogler CPU also persists, but Host gameplay must not be stopped merely because he is off screen.
- **Already gated:** fireflies return during daylight (`69–73`); gamepad returns without a connected pad (`183–185`);
  log sources redraw by revision (`85–98`); work-site plaques paint only while flipping (`308–315`). Entity kinds with
  zero instances still have cheap walker hooks; rounded 0.000 does not mean literally free.
- **Hot allocations:** five packing arrays per `emit`, at most 256 queued spawns/frame (`render/particles.ts:35–36,144–148`),
  up to 1,280 temporary arrays in a saturated emission frame; nearby log-source target array/object/Vector3/callback
  (`log-sources.ts:54–77`); one getter closure/avatar/frame in `feel.ts:252–253`. These are source operations, not measured
  heap allocation counts: engine optimization/escape analysis and actual emission rates remain unverified.
- **Particles:** 720 GPU slots; work stops after `liveUntil`, including draw (`particles.ts:155–166`). A spawn upload
  covers 24,576 bytes (256×6×4×4); it is not proof of avoidable bandwidth. **MEASURED** main-thread particle hook:
  0.003 ms I, 0.083 P, 0.071 M. No GPU particle timing or burst allocation profile was collected.
- **DOM:** prompt, Boogler HUD and active pings write projected transforms/opacity while visible
  (`prompt.ts:73`, `boogler/hud.ts:117,141–142`, `ping.ts:148,175–177`). Pause room view calls `people()` and JSON stringifies
  each frame while open (`pause.ts:522`). Text is often already change-guarded (`haul-stack.ts:223–229`,
  `boogler/hud.ts:83–88,144–145`). Prompt's `offsetWidth` is on target change (`prompt.ts:65`); dialogue layout reads are
  event effects (`boogler/dialogue.ts:230,262–263`). **No evidence of a continuous forced-layout loop.** Hook timing does
  not include all deferred browser style/layout/paint work; menu-open layout was not profiled.
- **Audio:** one shared context starts on gesture (`render/audio.ts:48–92`). Place ambience has three persistent noise
  voices and a 1.5 s convolver (`proto/place/ambience.ts:115–173`); acoustic sampling is 4 Hz though scheduling polls per
  frame (`299–314`); hidden tabs stop scheduling/fade the bed (`327–332`). **MEASURED M:** ambience reports on=true,
  voices=3, impulse bake=22 ms; its main-thread hook is 0.003 ms/frame. Bake is a reported initialization span, not a
  per-frame charge. Audio-thread DSP, peak polyphony and audibility were not measured; muting alone proves no DSP gain.
- **Adaptive resolution:** source policy (`features/adaptive-res.ts:20–33,76–113`) ranges 0.6–1.0 of min(device DPR,2),
  starts first touch at 0.8, drops by 0.1 after 2 s slow, rises after 5 s fast, warms for 5 s and uses cooldown/backoff.
  It uses cadence estimation and ignores hidden time. 0.6 means 36% of full pixel area, not 60%; fixed-size shadow work
  and CPU do not scale accordingly. Stable ~30 fps can be mistaken for a browser cap (source acknowledges this).
  **MEASURED captures all had `dpr=fixed`; adaptation was disabled.** No observed down/up response is claimed.

### Ranked performance recommendations

Ranking balances likely benefit and implementation effort; uncertain large opportunities are identified as such.
Conditional ceilings below are bounds from observed section costs, not promised improvements or additive savings.

1. **Target renderer submission and place scene composition before broad feature rewrites — MEASURED location, STATIC
   optimization.** I/M rendering is 1.321/2.143 ms (about 64%/63% of frame CPU), with 138/242 calls and 49/63 shadow draws;
   physics is next at 0.305/0.452 ms. Sources: scene.ts:84–92, place/index.ts:335–432, GPU manifests. Inspect visible
   material/mesh batches and shadow casters on an exclusive device; retain visual quality and active prototypes.
   **Estimated gain: unknown; a 10% render-CPU reduction would be 0.13–0.21 ms here**, an illustrative sensitivity,
   not a forecast. **M, medium visual risk.** No evidence supports replacing physics, disabling shadows or deleting protos.
2. **Throttle identity comparisons as well as submissions — MEASURED cost, STATIC fix.** identity.ts:21–28 advances
   lastWho only on an edit, so settled roster comparison runs every frame. Observed 0.007–0.013 ms. **Estimated gain:
   up to 179 of 180 checks removed per three seconds at 60 Hz, below the measured whole-hook ceiling of 0.013 ms/frame.**
   **S, low risk**, with dirty-on-rename/join handling to retain responsiveness. Tiny absolute win, cheap and concrete.
3. **Lazy-load pause page implementation, retain eager shell/controls — MEASURED size, STATIC split.** pause.ts has
   14,951 rendered pre-minify bytes and 525 source lines; pause.ts:477–524 and conversation ordering constrain the split.
   **Estimated gain: some fraction of 14,951 rendered bytes deferred; gzip and startup-ms savings unverified.**
   **M, medium first-open/input risk.** No extra network saving if another eager importer retains the implementation.
4. **Sleep distant Local fish/gulls presentation — MEASURED residency/cost, STATIC fix.** Fish+gulls average
   0.049 ms I, 0.033 P, 0.036 M despite distance from the home island. Evidence: critter loops above and per-kind table.
   **Estimated gain: up to 1,260 comparisons and 57 matrix writes/frame when both sleep; CPU ceiling 0.033–0.049 ms**
   for those complete hooks. **M, medium wake/pop risk**. Use conservative distance/wake bounds, no new spatial grid
   for 36 fish; never apply cosmetic sleep to authoritative state or nearby interactions.
5. **Cache settled hut instance data — MEASURED hook cost, STATIC fix.** hut-build.ts:414–448 visits 129 pieces and
   dirties three buffers; 0.003–0.006 ms observed CPU. **Estimated gain: up to 129 checks and three buffer updates per
   idle frame; CPU ceiling 0.006 ms**, GPU upload benefit unknown. **M, medium state-transition risk**: snapshots,
   active assembly, ghosts, scaffolding and effects must still update. Do not market this as a major FPS win.
6. **Remove particle packing temporaries if a burst allocation trace confirms pressure — MEASURED hook cost, STATIC
   allocation hypothesis.** particles.ts:144–148; 0.071–0.083 ms hook in place. **Estimated gain: up to 1,280 literal
   arrays per saturated emission frame eliminated; milliseconds and GC improvement unknown**, and not the whole hook
   cost. **S, low packed-layout risk.** Preserve the shared pool; GPU compute needs separate measurement.
7. **Cache only unchanged target/UI work when touching those owners — STATIC.** log-sources.ts:54–77, feel.ts:252,
   pause.ts:522 and HUD transforms above. **Estimated gain: several objects per eligible target/frame, up to one
   closure/avatar/frame, and up to 60 roster serializations/s with the room tab open at 60 Hz. No measured ms saving.**
   **S/M, low–medium stale-target/input risk.** Preserve hands' once/frame cache, full-rate moving projection, and all
   Boogler copy. No blanket DOM framework rewrite or claim of forced layout.
8. **Verify adaptive-resolution decisions on M1 Max and M4 iPad before retuning — STATIC.** adaptive-res.ts:12,20–33,
   76–113. **Estimated opportunity: existing minimum reduces scene pixel area by 64%; frame-time gain unknown.**
   **M, medium image-quality/cadence risk.** Test sustained GPU load and a real 30 Hz browser cap separately; all audit
   captures deliberately disabled adaptation. This is a verification task, not a request to lower quality globally.

## Visual observations and unfinished verification

The visual question for I was whether the island, toys and HUD remained intact during idle sampling. Opened
`audit-island-still.png`: terrain, palms, windmills, shore, toy area and controls card render coherently. P asked whether
the early place route and village were legible. Opened `audit-place-still.png`: avatar, path, timber sign and material
rack are visible; the prototype verdict panel obscures much of the upper center. Neither still proves interaction feel.

B1's opened end still shows the player in the initial canyon; its 60-second allowance expired before the first beat.
B2's opened end still shows carried rails and later construction. Its report records seven stretches, shortcut at
5:59, forge at 11:54, hooks at 16:17 and glide at 20:17. It still **failed**: no train unlock/call/miss/ride, building
entry, shop/museum visit, trying/taking shop items, rail swapping or co-op beat. It reported 2m25s still and 2s pushing,
no page/graphics errors. The bot knows the route and uses warped time; its timing is not novice pacing or real-time feel.

M asked whether the player could traverse the opened path with coherent avatar/construction/camera poses. Opened its
still, motion sheet and curves: the unsteered W+Shift action runs off the elevated route and falls to the riverbank.
The avatar/camera remain visible, but **this capture does not establish successful path traversal**. Curves show peak
speed 9.9 m/s, height 31.0→3.3 m and 22% airborne samples. Consecutive video frames were extracted with ffmpeg for pose
inspection (`.look/audit-consecutive-01.png` through `03.png`, all opened): the three adjacent poses show the avatar
running beside the machine before leaving the route. This does not establish smoothness. No source repair was authorized or attempted.

Remaining unknowns: exclusive GPU usage; DPR 2, iPad, 8 players, burst moments and water; Safari behavior; individual GPU-pass
timings, audio DSP and peak particles; heap/GC and browser layout/paint cost; open-menu and multiplayer costs; production
cold/warm network boot and isolated feature evaluation; exact marginal compressed feature size; adaptive-resolution
response; all unfinished bot beats and real-time motion/feel. The samples locate costs, but an optimization claim needs
an implementation and controlled before/after evidence. No owner playtest or further development loop was started.

## Sources and validation

- Local contracts: [AGENTS.md](../../AGENTS.md), [DESIGN.md](../../DESIGN.md), [source map](../../src/README.md),
  [loop](../../src/loop.ts), [entity core](../../src/entity/entity.ts), [current direction](../proposals/boogle-2.md),
  [prototype plan](../plans/find-the-fun.md), [ledger](../architecture-review/ledger.md).
- Prior research: [engine architecture](engine-architecture.md), [entity architecture](entity-architecture.md),
  [primary-source provenance](notes/entity-architecture/sources.md), [engine source notes](notes/engine-architecture/sources.md).
  External official URLs appear alongside the comparisons above; their current contents were not fetched.
- Measurement definitions: `dev/look/counts.ts`, `dev/look/perf.ts`, `src/entity/inspect.ts`, `src/debug/prof-overlay.ts`,
  `src/boot/timeline.ts`, `vite.config.ts:104–138`; raw audit manifests and build data linked above.
- Validation passed: `npm run check` (lint, typecheck, **292 unit tests**, registry, five level checks, four fresh assets,
  production build). Existing level allowances remained; registry reported 20 entity-migration suppressions, with no
  new ones. `git diff --check` passed. The requested `npx prettier --write` invocation encountered the repository's
  blanket Markdown ignore, so formatting was applied explicitly with
  `npx prettier --write --ignore-path /dev/null docs/research/features-audit.md`.
  No new tests or scenarios were added for this documentation-only audit. No push or ship was run.
