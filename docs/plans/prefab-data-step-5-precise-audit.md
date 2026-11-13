# Precise prefab enforcement after the orchestrator reset

Branch `codex/prefab-data-step-5-6` starts from `e09762b0` (not the rejected reference-taint tree), rebased onto `d50f514c5`. No game/server/Home source changes; no push, ship or network fetch. The rejected prefab-references.ts and storage-edge design are absent.

| Metric | Restored e09762b0 | Final precise guard |
| --- | ---: | ---: |
| Raw debt files | 110 | 109 |
| Raw counted violation units | 310 | 542 |
| Named-door binding units | unbudgeted | 12 |
| Construction exports | 64 | 64 |
| Formatted debt lines | 954 | 967 |

542 units combine old module edges/direct calls with distinct static specifiers/namespace members. The 12 door units are separate; total 554. These are not reference-read counts. The raw list shrinks by removing src/entities/route-greybox/leg2-draw.ts: it only acquires pure span/type data from the mixed helper and has no collider creation import/call. No raw file is added. Named-door budgets cover the existing five physical/record door files; zero is valid. Public surfaces and per-file counts retain the shrink-only checks. Schema 7 distinguishes this contract from versions 5/6; absent/older main files bootstrap internal consistency with no merge base.

## What changed

The cheap guard counts imported bindings/aliases and distinct direct namespace member names. A repeated sweepSphere query does not change debt. Adding createBody as allocate raises the count before any reference, call or hiddenMaker storage exists. The original reviewer reproduction is committed verbatim as a fixture and rejected too. Deliberate indirection without a new binding is accepted, not chased with data taint.

The async value model records selected leaf exports by dynamic import site. The look eval selecting me no longer acquires enterIsland; its existing importer count falls from 83 to 3. Destructuring, member access, casts, Promise.all, then callbacks and nested namespace reads have passing fixtures. Opaque namespace escapes retain the existing fallback. No constructor roots are added/removed from the restored set; helper/private-call and actual allocation/injected-factory proofs remain.

A single precise mixed-module exception admits the existing named span descriptor helper. It does not expose the module namespace/default or drawGreyBoxes; native physics/seat and collider helper entry points remain restricted. This allows mesh-only source views to use span directly without a runtime refactor or a new API.

## Permanent ordinary fixtures

All fixtures live as strings in test/fixtures/prefab-ordinary.json, never as installed gameplay, tests, tools or server rules. They are ported from the review evidence, with its corrected Color and collider at fields. The view adds actual span, stepSurfaceAt and W_R uses. A runnable tune reporter supplements the review's non-headless span tool.

| Group | Source-shaped fixture files | Result |
| --- | --- | --- |
| HUD | `src/features/review-hud.ts` | lint/graph pass; typecheck pass |
| feel | `src/features/review-footfeel.ts` | lint/graph pass; typecheck pass |
| look | `dev/look/evals/review-player.ts` | lint/graph pass; typecheck pass |
| test | `test/review-tune.test.ts` | lint/graph pass; typecheck pass |
| mesh view | `src/entities/railway/review-rail-view.ts` | lint/graph pass; typecheck pass |
| record entity | `src/content/prefabs/review-marker.ts`, `src/content/levels/review-marker.ts`, `src/features/review-prefab.ts` | lint/graph pass; typecheck pass |
| dev tool | `dev/review-tune.ts`, `dev/review-span.ts` | lint/graph pass; typecheck pass |
| server rule | `src/world/rules/review-tune-rule.ts` | lint/graph pass; typecheck pass |

The combined graph checks all eight additions together and requires construction counts and forwarding records to equal the unchanged debt bytes. Both earlier OwnedView/prefab-door and HUD fixtures remain passing unchanged. All rejecting fixtures from rounds 1–5 remain; the round-six import-only step and full reproduction reject. Each rule retains passing/failing fixtures and a message naming src/prefab/instantiate.ts.

Fixture typechecking uses the installed TypeScript 7 CLI (its package exposes no old compiler API), with an ignored source mirror under .look/prefab-precise-7. JSON inputs are copied and the real server express declaration path is used; no dependency symlink or separate checkout/install is created. The source mirror never changes src/world, src/sim, src/net or server in the actual tree.

## Limits and final verification

The one authoritative accepted-residual list is in docs/agents/lint-boundaries.md. Ordinary APIs are intentionally free; this is not a deliberate-obfuscation proof. Fresh check logs, the three lint runs, depth-one evidence, review stamp and inspected startup PNGs are linked by .look/prefab-precise-7/evidence.json and handoff.md. Those exact final-tree results supersede earlier artifacts. Compiled prefab JSON remains unchanged; Godot stays in step 14.
