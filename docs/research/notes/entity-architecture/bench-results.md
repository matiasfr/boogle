# Bench results: the cost of an entity update call

[dispatch-bench.ts](dispatch-bench.ts), run 1 November 2026 on an Apple M1 Max.

- **Engines:** Chromium 156.0.8078.4 headless through Playwright 1.64.1; JavaScriptCore, the `jsc` binary in macOS's
  framework; Node 24.11.1 for the byte counts.
- **Method:** a fresh process or page per run, 7 runs per cell, medians. A run warms up for 3,060 frames, then takes the
  median of 15 batches of 1,000 frames. Each hook body copies a body's position plus velocity times `dt` to a mesh-like
  object and stores `now`. Each kind has its own class from its own source text, so its update is a different function
  and its instances a different shape.
- **Noise:** other agents were using the machine; load average 9 to 36. Median spread across runs in a cell 4 %, worst
  43 % (Node, `forOf`). No cache pressure from the rest of a frame, and the bodies are trivial, so read these as the
  cost of dispatch, not of a real hook.
- **Bytes:** V8 only, `heapUsed` before and after 1,000 frames with no scavenge, young generation fixed at 64 MB. Calibration:
  100 five-word objects a frame read 4,004 bytes a frame (expected 4,000). Without the fixed young generation the same
  test read 872, because scavenges reset the count.

## 300 entities, 30 kinds, one hook each

ns per entity per frame.

| Variant | Chromium | JSC | Node | V8 bytes/frame |
|---|---:|---:|---:|---:|
| `inline`: same work in one loop, no call (floor) | 10 | 9 | 19.4 | 19 |
| `kindRow`: `run(e, ctx)`, a function per kind, shared walker | 10.3 | 7.7 | 15 | 3 |
| `kindRowGuarded`: the same with an alive check and try/catch | 13 | 9.4 | 19.8 | 4 |
| `sharedWalkerCtx`: `e.update(ctx)`, shared walker | 14.3 | 9.5 | 20.2 | 4 |
| `sharedWalker`: `e.update(dt, now)`, shared walker | 14.7 | 9.4 | 20.8 | 964 |
| `perKindWalker`: `e.update(dt, now)`, a walker per kind | 14.7 | 9.5 | 21.3 | 964 |
| `optionalCall`: `e.update?.(dt, now)` | 15 | 10.5 | 21.5 | 964 |
| `closures`: object literal with a closure, not a method | 15 | 11.3 | 22.3 | 963 |
| `forOf`: `for (const e of list)` | 15.3 | 10.5 | 20.7 | 964 |
| `forEach` | 15 | 11.3 | 21.4 | 4,085 |
| `setIter`: walking a `Set` | 16.3 | 11.7 | 23.1 | 9,604 |
| `filterCopy`: `list.filter(...)` each walk | 21.7 | 23.7 | 34.8 | 8,167 |
| `kindHookProfiled`: a hook per kind with a clock read, shared walker (the plan) | 28 | 11.3 | 26.8 | 1,924 |
| `entityHookProfiled`: a hook per entity with a clock read | 143 | 40 | 64.4 | 19,204 |
| `clockOnly`: one `performance.now()` | 124.7 | 38 | 36.8 | 4,803 |

## Scale, the plan's shape (`kindHookProfiled`)

µs per frame for one pass over all entities.

| Entities / kinds | Chromium | JSC |
|---:|---:|---:|
| 100 / 30 | 5.9 | 1.8 |
| 300 / 30 | 8.4 | 3.4 |
| 1,000 / 30 | 20 | 10.4 |
| 300 / 4 | 1.7 | 1.2 |
| 300 / 1 | 1.7 | 0.8 |

## Few kinds

ns per entity. The ordering of variants changes with the number of kinds. None of the gaps matters.

| Variant | 300/4 Chromium | 300/4 JSC | 300/1 Chromium | 300/1 JSC |
|---|---:|---:|---:|---:|
| `inline` | 3.7 | 2.9 | 3.7 | 2.7 |
| `sharedWalker` | 3.7 | 3.5 | 4.7 | 2.6 |
| `kindRow` | 9.7 | 3 | 5.7 | 2.6 |
| `closures` | 13.3 | 6.1 | 7.7 | 4.3 |

## Cold start

The first 60 frames in total, 300 entities and 30 kinds: `sharedWalker` 2.4 ms on Chromium, 1.8 ms on JSC; `inline` 1.1 and
0.7 ms. So about 40 µs a frame during warm-up. On a page the rest of the game warms at the same time.

## Boxed doubles on V8

- `update(dt, now)` costs 32 bytes per walk here: two HeapNumbers when the doubles leave the frame context, not per
  entity (964 bytes at 30 walks). Passing `ctx` costs 3 to 4 bytes a frame.
- A separate check with the walker inlined into its caller read 16 to 32 bytes per call instead: 300 calls, 4,865 bytes
  a frame when passing parameters through, 9,640 when reading them from an object at each call. So it depends on what
  TurboFan inlines. JSC doesn't box doubles (`dev/look/hitches.ts:192`).

## Other runs

- **A mesh's matrix:** `scene.updateMatrixWorld()` over N moving meshes, Node, `three/webgpu` 0.187.0: 48 ns per mesh at 100,
  50 at 300, 57 at 1,000.
- **Memory per entity:** class instance with 3 shared methods 81 bytes; object literal with 3 closures 321 bytes (Node, after
  `gc()`, 10,000 entities).
- **Node imports:** `three`, `three/webgpu` and `three/tsl` all load in plain Node 24.
