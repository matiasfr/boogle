# Step 10, third pass: shared catalogue and complete ramps

Partial, at a whole-piece boundary. Branch `codex/prefab-data-step-10-3` rebases the retained work onto
`origin/main` at `764b3aa945aabcd7fc23315a9e4c5fb068b30f52`. No fetch, push or ship. Production tip for the
checks and new branch captures below is `42b70dbb93c2e5b2b7865ee34e951571a7e69923`, clean tree
`53ecf8fc8b842afe9d1dcc709d38a4819a2330c3`; the final report commit changes documentation only.

## Converted and remaining

The retained deck/base/pile, shelter, bench, canopy/post and signal-mast conversions now share six definitions,
instead of 26 per-halt definitions. A seventh specification converts **all 17 kit ramps**, including Home's
island, Camp, Quarry, Far Head, Pier and both up platforms. Generated placements carry row-specific operands;
the loader resolves terrain, endpoints, pitch and lengths at runtime. The up ramps keep their drop-set boxes;
down ramps keep separate meshes and the same reveal timing. Colliders retain order, overlap and grass support.

Request levers with plaques/interactions, signal-arm/road-plaque attachments, map stands and the up-platform
plank crossings remain in their original builders. No subset of a converted piece is left behind. Step 10 stays
unchecked. Railhead, Ring Island/control hold, stack heads 1–3, High Gorge and leg-2 halt behavior remain covered
by the unchanged all-halt golden; this pass does not claim their unconverted attachments have become records.

No changes to sim catalogs or their order, `WORLD_NS`, world rules, town room files, seat rules, The Boogler,
server or room replacement. No ROM data. No copy changes.

## Shared startup and freshness proof

`src/entities/railway/halt-kit.ts` reads the existing `src/prefab/catalogue.ts`. It does not import raw catalogue
JSON or perform catalogue validation. The real isolated startup import test now covers **10 consumers**, with
**1 catalogue load/validation and 0 direct revalidations**. Existing per-record and per-placement runtime checks
remain intact; there is no new validation cache.

The unchanged deterministic ceilings are **200 records / 350,000 total canonical artifact bytes**. Actual content
is **188 records / 334,626 bytes / 12 levels**, versus main's 181 / 312,535 / 11. The seven additional shared
specifications and generated halt level account for the increase; no budget increase was needed. There are
101 expanded halt placements, including 17 ramp visuals and 17 ramp bodies. Tests do not shell out to Git or
assert elapsed time; the startup child process executes Node with mocked runtime boundaries and real modules.

The retained P2 fix (`02b1e9670` after rebase) fingerprints authored `RAIL_HALTS`, non-island `HALTS`, `UP_HALTS`
and Home frame operands. The reviewer's mutation, `HALTS[1].lat += 1`, makes the committed halt artifact stale;
restoring the row makes it fresh. Native-derived Home locations are never fingerprinted or serialized. The
additive pre-import native-math perturbation also leaves compiler output fresh.

Old-code capture **`539a7c3ed` precedes every conversion**. The fixture remains byte-identical:
`01df633cfac88285cb74171eb2d10c34b14bc6571cfb8e0c35be4c7ba9ecaef2`. Eight progression states, all 24 catalog rows,
19 levers, every recorded mesh/collider/drop-set placement, plaque text and ordered prompt still match. Runtime
numbers use the shared absolute `1e-9` / relative `1e-12` tolerance; strings, IDs, counts, flags and order are exact.
No golden regeneration or relaxed tolerance. Disposal leaves no active recorded bodies.

## Debt and checks

Collider debt against current main: **103 files / 490 units → 103 / 475**. `halts-view.ts` goes 16 → 8 and
`up-platforms.ts` 8 → 1. This sitting's ramp conversion removes two more units after the retained conversions;
the original pre-room base was 494. No debt entry, allowance or other debt category grows.

| Check | Result | Evidence |
| --- | --- | --- |
| Prefab tests, normal | 224/224 | [log](../../.look/step10-3-prefabs.log) |
| Prefab tests, pre-import native ULP perturbation | 224/224 | [log](../../.look/step10-3-perturbed.log) |
| Additive native perturbation, compiler `--check` | Fresh: 188 / 12 / 334,626 | [log](../../.look/step10-3-freshness.log) |
| `npm run check` | 1,919 passes, one existing TODO, zero failures; build included | [log](../../.look/step10-3-check.log) |
| Server tests | 371/371 | [log](../../.look/step10-3-server.log) |
| Direct `npm run test:net` | 190/190, including off-platform refusal and accepted request agreement | [log](../../.look/step10-3-net.log) |
| `node dev/ship-check.ts origin/main HEAD` | 458 assertions; registry, 23 lint files, typecheck, 47 affected test files | [log](../../.look/step10-3-ship-check.log) |
| Explicit registry | Pass, no debt growth | [log](../../.look/step10-3-registry.log) |
| Explicit level-check | Pass, 13 reports; existing planned continuity diagnostics remain | [log](../../.look/step10-3-level.log) |
| Review stamp, `--no-fetch --base origin/main` | `0d2b05e25c05`, eight test/fixture files | [log](../../.look/step10-3-stamp.log) |

Prettier ran on changed files, followed by check. The initial check correctly required lowering the two reduced
collider-debt counts; this was fixed before the passing checks. A separate read-only agent reviewed the shared
catalogue, ramp geometry/reveal/cleanup, grass support and portability changes and found no P1/P2 issue. That
review did not independently rerun the browser or tests and is not an owner approval.

The warmed headless median is **2.564 ms** for the one catalogue load and **3.879 ms** including halt-level
expansion/validation. Node 26.13.0/macOS arm64; four warm-ups, 20 retained samples, sorted index 10. Load was
about 25, so these are shared-machine loader measurements, not cold page startup or device performance. JSON
parsing, other levels, construction, networking and rendering are excluded. [Script](../../.look/step10-3-validation.ts),
[samples and provenance](../../.look/step10-3-validation.json). Timing is not a unit-test assertion.

## Fresh opened comparison evidence

Question: do the kit's visible deck/canopy/ramp joins and existing lever plaques retain their alignment and order?
Home uses the same fixed elevated frame and waits for an actual train at each edge. Stack head 1 uses the
platform-side eye-height pair frame; High Gorge uses the fixed elevated deck frame. Every PNG named below was
opened. All eight captures pass WebGPU/frame-progress health with zero page/console/graphics errors. Health
is separate from the visual observations.

The four main references are fresh, not reused old evidence. Only this job's committed production paths were
temporarily restored in this same worktree, with `src/` and `content/` verified identical to `764b3aa945` before
capture. The branch never changed; evaluation tooling stayed on the branch. Their manifests therefore correctly
say the branch HEAD is dirty. [Exact baseline provenance](../../.look/step10-3-baseline-provenance.json). After
all baseline runs completed, every path was restored from HEAD and verified clean. No source edits occurred
while any browser run was active or queued.

| Opened PNG pair | Main manifest | Branch manifest | Visual observation |
| --- | --- | --- | --- |
| `step10-3-main-home0-still.png` / `step10-3-home0-still.png` | [main](../../.look/evidence/1794640682994-77805/evidence.json) | [branch](../../.look/evidence/1794640323196-73552/evidence.json) | Train at road 1; deck edges, canopy posts and visible ramp placement align. |
| `step10-3-main-home1-still.png` / `step10-3-home1-still.png` | [main](../../.look/evidence/1794640682992-77807/evidence.json) | [branch](../../.look/evidence/1794640323193-73553/evidence.json) | Opposite-edge train; same single deck, canopy and mast, without duplicated geometry. Foreground roof partly occludes the approach. |
| `step10-3-main-stack-still.png` / `step10-3-stack-still.png` | [main](../../.look/evidence/1794640682980-77806/evidence.json) | [branch](../../.look/evidence/1794640323201-73554/evidence.json) | Same doubled plaques, Village/homeward on the left at the stop, Stack railhead/outward on the right; diagnostic separation 3.99 m. |
| `step10-3-main-gorge-still.png` / `step10-3-gorge-still.png` | [main](../../.look/evidence/1794640682998-77808/evidence.json) | [branch](../../.look/evidence/1794640323179-73555/evidence.json) | Same deck edges, ramp junctions, train and lever placements. |

Water, particles and moving background traffic differ; no pixel-equality or motion-smoothness claim. The four
older baseline PNGs were also reopened, but the conclusions above use the fresh main pairs.

The [stack lever press](../../.look/evidence/1794640410543-76637/evidence.json) offered
`Request stop: to Stack railhead` with no blocked reason. Real E input set `asked: true`; the train stood at halt
6 on up track 0 after **340 server ticks**, about 34 seconds. `step10-3-stack-press-still.png` was opened: Buddy
stands beside the lever and the requested train is present; the map's back partially occludes the foreground.
This exercises the existing server position/reach path without altering `haltPlatform` or `HALT_REACH`.

The [T1 bot](../../.look/evidence/1794640410546-76636/evidence.json) passed every expected beat, zero errors;
its report was read and `run/end-still.png` opened. Buddy has the earned conductor hat beside the production
rack. Two still periods total 3 min 4 s of game time, including the build wait; these are not render-stall evidence.
The full railway-legs route was not rerun.

One checkpoint-list command was rejected by the broker's single-player `--clock-url`/warp guard before gameplay:
[failed manifest](../../.look/evidence/1794640475877-76880/evidence.json). Retrying the same list with `--real`
[passed](../../.look/evidence/1794640682974-77809/evidence.json). No game/bot failure remains.

## Suspect placeholder copy for the owner: unchanged

`Request stop`, `Request stop: to <end>`, `Stop requested`, `Stack railhead`; halt names:
`Village`, `Camp`, `Village, line 2`, `Quarry`, `Far Head`, `Pier`, `Railhead`, `Ring Island`,
`Stack head 1`, `Stack head 2`, `Stack head 3`, `High Gorge`, `Bell Rock`, `Original Island`,
`West landing`, `Canopy Town`, `Lantern Notch`, `Saltpan Halt`, `Port Quay`.
Repeated names and the existing `, line 2` plaque suffix removal stay exact. The Boogler's copy is untouched.

Not tested on a device. Real-time feel/smoothness, cold startup, Linux and the remaining kit conversions are
unverified. Step 10 is partial; no push or ship.
