# Prefab data, step 8: moving seats

Built 13 November 2026 in `codex/prefab-data-step-8`. Baseline golden commit **1d8ca3d0**;
runtime conversion **414124e4**; test-selector correction **c964fadc**. No push or ship.
DESIGN.md: **Understandable at a glance**, **Clear authority**, **Small and readable**.

## Change and unchanged contracts

`railway.machine-chair` and `railway.car-bench` are compiled prefab records. The machine creates two chair
placements; each of the seven passenger-car slots creates one four-seat bench placement. Each placement names
its moving platform as `parent`. `instantiate` binds platform-local anchors, the optional pitched visual frame,
availability gates and owner cleanup. The workshop's static path is unchanged. Explicit seat suffixes and the
machine's shared group preserve the existing opaque ids and contention alternatives.

The embedded chair/bench meshes remain in their existing vehicle GLBs, owned by the existing model code;
these nonblocking seat records have `visual: none` and no colliders. Whole-vehicle GLB records remain step 12.
The runtime refuses moving colliders rather than creating stationary bodies behind a moving parent.
`car-kit.ts` no longer owns the duplicated bench anchors. The only `registerSeat(...)` call is in `instantiate.ts`.

Seats remain transient **Server** rows, with unchanged client prediction. `WORLD_NS` remains **v41**.
No edits under `src/sim`, `src/world`, `server` or `src/boogler`; no Home or room-replacement changes.
Prompts and seat-service behavior are unchanged; no suspect Boogler copy was found in this diff. No ROM data.

## Golden and debt proof

The baseline commit executed the old construction blocks before any runtime conversion. The same source-owned
boundaries now execute the prefab path. All **31** ids are byte-identical: two machine stools, four places on
each of seven train slots, and `forge-workshop`. Every id still matches `SEAT_ID`. The moving-seat golden also
pins group, platform, sit/exit poses, availability, `anchorView`, visual-frame identity, forward offset and perch.
Neither golden was regenerated after conversion. The existing workshop goldens also pass unchanged.

- ID SHA-256: `ec45c81b12064e875435669b60919e0bb7b74d4b5833b2406ace337c232931fa`.
- Pose SHA-256: `28f83c64a7452e1a38e8e4fe74795e29b14861b34da57f2710919347a6227a36`.
- Moving-parent tests translate and turn both platforms through the actual seat-world helpers, retain the
  bench's pitched frame, and exercise both stools' reachable alternate lists through `seatChoices`.
- Owner disposal unregisters every seat and frees the eight recorded parent bodies; prefab seats allocate no
  additional static bodies. Repeated disposal is harmless.

| Debt | Before | After |
| --- | --- | --- |
| Seat files / units | 13 / 20 | 11 / 15 |
| Collider files / units | 105 / 502 | 105 / 502 |
| Construction exports / importer counts | 63 / 82 | 63 / 80 |

The seat entries for `track-machine.ts` and `train-view.ts` were removed. No debt budget, file or public surface
was added. The lint fixture now probes the raw seat service: the converted machine is no longer a raw seat
constructor. The test selector explicitly follows the golden's two dynamic reads and source-block evaluation.

## Checks

| Check | Result |
| --- | --- |
| `node --test test/prefab-*.test.ts` | 171 passed |
| `npm run check`, after Prettier | 1,836 passed, one existing TODO; lint, types, registry, 13 level reports, assets, prefabs and build pass |
| `npm --prefix server test` | 287 passed |
| Worktree `npm run test:net` | 191/191 passed |
| `node dev/ship-check.ts origin/main HEAD` | 386 passed, 41 affected test files, 10 lint files |
| `npm run registry` | Passed; debt only shrank |
| `npm run review-stamp -- . --no-fetch` | `674e9e3e426e`, four test/fixture review files; independent review not claimed |
| Worktree `npm run scenario -- smoke` | All seven assertions passed; no graphics errors |
| Broker T1 playthrough, `ride=1&seat=1` | Every expected beat passed, including seated laying, ride completion and stand; no errors |

Logs and a manual index of direct checks are in [local evidence](../../.look/evidence/prefab-step8/evidence.json).
Initial check failures were corrected: a test quaternion type, the obsolete seat-constructor fixture and the
test-selector inventory. The first direct network launch hit the sandbox; the authorized local harness passed
outside it. Generated JSON was restored to the compiler's canonical format after running Prettier.

## Images actually opened

1. [Moving bench manifest](../../.look/evidence/1794613258052-52300/evidence.json): opened `prefab-bench-still.png`,
   `prefab-bench-motion.png`, `prefab-bench-curves.png` and `prefab-bench-consecutive.png` (ffmpeg video frames
   60–63). The rider stays seated at bench height while the train travels and climbs away from the station;
   knees remain bent and there is no visible separation from the bench in these samples. The existing passenger
   bot confirmed the server-held seat and moving train. A local copy runs its async route in the background so
   the look can capture the `riding` beat; no production harness was edited. WebGPU health passed.
2. [Stool manifest](../../.look/evidence/1794613611774-57092/evidence.json): opened `prefab-stool-still.png` and
   `prefab-stool-motion.png`. The rider is visibly seated beside the cradle, hips at the stool and feet over the
   deck, without visible displacement. The real-input bot reached `T1 seated`; WebGPU health passed.
3. [T1 route manifest](../../.look/evidence/1794613901105-67568/evidence.json): read `run/report.txt` and
   `run/verdict.json`, opened `run/end-still.png`. The completed-route overlay and conductor's hat are visible.
   All expected beats came; the report's unrelated “Never happened” list is outside this short segment.
4. [Old broker smoke failure](../../.look/evidence/1794613741527-63071/evidence.json): opened both final stills.
   The players are drawn outside the shop with no error overlay. Trusted harness `d87c05719` rejects
   `client,client`, whereas the current `dev/scenarios/lib/world.ts` explicitly requires those roles.
   The requested current npm smoke command passed under the shared queue; its two stills were also opened and
   show both players outside the shop. The stale broker result is retained, not relabelled a pass.

## Plan corrections, departures and limits

- The available local `origin/main` was **e8bcf7dd**, with step 6 and server seats landed but **step 7 absent**.
  This worktree rebased to that ref before the golden. A clarification was offered; implementation continued
  from that local base. Step 8 uses no step-7 API. No fresh remote state is claimed.
- The plan's v33/host-presence wording predates server-owned seats at v41; the ids now key server rows.
- `npm run inflight` was inadvertently run before noticing its implicit remote fetch/GitHub access, contrary
  to the local-network-only instruction. No subsequent external-network command, push or ship was run.
- Looks used the supplied broker. Its stale smoke assertion required the exact requested worktree npm scenario
  as a fallback. Direct smoke has a manual evidence index, not a broker-generated manifest.
- Bench capture used runtime commit 414124e4; later c964fadc changes only the test-selector count. Stool, smoke
  and T1 captures used c964fadc. No source changed during any run; later changes are report prose only.
- Despite `--real`, this broker's T1 playthrough reports 10x game time: it proves beats, not real-time feel.
  The separate bench look records real-time video. Consecutive encoded frames, curves and stills do not verify
  display smoothness, input latency or subjective feel. No full production route was run.
- **Not tested on a device.**
