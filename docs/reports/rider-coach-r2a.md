# Rider coach R2a: role-based consist

Implementation: `t3/role-based-train-consist`, based on origin/main `f0c3ce77` (includes loader yard #1975).

`consistOf({line, wagon, steel})` returns ordered `{role, spec, offset}` descriptors. Roles are engine, player, kit,
optional wagon, optional steel. The rider name is reserved in the type but no rider is built. Base offsets are
4.2, 0, -3.7 m; wagon -7.4 m; steel -7.4 m without wagon, -11.100000000000001 m with it. Maximum tail is
12.700000000000001 m. Grouping each half-length + 0.5 m gap + next half-length before subtraction preserves existing floating point arithmetic exactly.
`roleIndex` and `offsetOf` read descriptors; legacy tables and steel/tail helpers derive from them.

Readers migrated:

- train-view: construction/specs, player platform and bench, kit fittings/crates/board, engine boiler/doors/cab,
  wake presentation, posing offsets and buffer choice, loader's existing kitCar/footingCar/deckSlot helpers,
  growth and active collections, coupling's engine pair, sound/effects/visibility/inspection, full-consist bounds.
  Existing numeric platform/seat IDs remain byte-identical.
- garage-view: its separate display consist; centering, engine placement, cargo focus/ghosts, colliders and camera slide.
- look-kit and wagon-look: train model length and player/engine motion references. Model arrays keep `[loco, ...beds]`.
- town view: engine visibility-distance sample reads the inspection role. forge-finish: kit-role comment.

No src/sim or boiler-view edits. No stop, rule, wire, save, schema, host-trace or golden changes; no world bump.
The seat construction capture test's source boundary/bindings follow the refactor; its golden assertions are unchanged.

Remaining direct indices from the requested scan:

- cars.ts `cars.at(-1)`: previous descriptor while packing the consist.
- train-view `model.cars[n]`: parallel descriptor/model construction; `cars[roleIndex(...)]` and
  `model.cars[roleIndex(...)]`: the role lookup boundary.
- wagon-look `cars[roleIndex(consist, 'engine')]`: role lookup boundary for animation.
- machine-model.ts `cars[i]`, `cars[1]`: separate track machine pitch and flatbed parent.
- track-machine.ts `look.cars[1]`, `look.cars[0]`: separate machine flatbed and engine.
- proto/crossing/train.ts `look.cars[k]`, `cars[0]` twice: separate crossing prototype construction and engine velocity.

R2a is complete. No coach is built; the separate machine and prototype arrays keep their original ordering.

## Checks

- `npm run check`: exit 0; full lint, types, 2358 unit tests (2292 pass, 65 skipped, one todo), level/assets/registry and Vite build.
- `npm --prefix server test`: exit 0, 407/407.
- `npm run loop -- run`: exit 0, all built orders and future stand-in summaries completed.
- `node dev/ship-check.ts`: exit 0, registry, nine lint files, types, 74 affected test files (608 assertions).
- Explicit final scoped lint and typecheck: exit 0; `git diff --check`: clean.
- New consist regression: 9/9, both actual line indices and all wagon/steel combinations.
- Seat source capture: 48/48 (includes workshop capture); numeric/byte goldens unchanged.
- Railway golden shards, M12 host trace, and schema tests pass in the unit run; fixture paths unchanged in Git.

## Visual evidence

Baseline archive: `f0c3ce775f50226eb971cd3ca91307199edc59ed`, origin/main at setup. All seven changed
production files in the archive were hash-checked against that commit. Both installations used independent `npm ci`.

**Careful comparison, all nine pairs opened:** no consist geometry, spacing, fittings, coupling or garage-copy difference
observed. The four halted primary consists occupy the same positions. The curve frames have different capture phases
(the train is farther along the same curve in some after frames); wheel phase, smoke, NPCs and other moving trains
also differ. These are not pixel-identical captures. No real-time motion, device or performance claim.

Halt images are 960 x 600 screenshots. Curve comparisons use a selected 480 x 300 frame from the harness's capture
sheet; garage comparisons use its one-frame 480 x 300 filmstrip. Selection copies frame pixels without rescaling or
retouching. `selected/manifest.json` records each source and crop. The cameras match within each before/after pair.
The original files, capture logs and verdicts remain in `.look/r2a/`. Early bad framings and an unfitted-seed attempt
were rejected; examples remain in `rejected/`. Only the selected images below support the comparison.

Some runs used the harness's supported load override and permitted shared light-run mode. Capture health passed
(WebGPU, advancing completed frames, no page/console/graphics errors); shared/load stamps are not timing evidence.
Additional frozen-curve attempts produced unusable framings and are excluded from the selected comparison.

| View | Before | After | Comparison |
| --- | --- | --- | --- |
| Base + no wagon, halt | [PNG](../../.look/r2a/selected/r2a-before-s0-w0-c0.png) | [PNG](../../.look/r2a/selected/r2a-after-s0-w0-c0.png) | [Pair](../../.look/r2a/selected/compare-s0-w0-c0.png) |
| Base + no wagon, curve | [PNG](../../.look/r2a/selected/r2a-before-s0-w0-c1.png) | [PNG](../../.look/r2a/selected/r2a-after-s0-w0-c1.png) | [Pair](../../.look/r2a/selected/compare-s0-w0-c1.png) |
| Base + wagon, halt | [PNG](../../.look/r2a/selected/r2a-before-s0-w1-c0.png) | [PNG](../../.look/r2a/selected/r2a-after-s0-w1-c0.png) | [Pair](../../.look/r2a/selected/compare-s0-w1-c0.png) |
| Base + wagon, curve | [PNG](../../.look/r2a/selected/r2a-before-s0-w1-c1.png) | [PNG](../../.look/r2a/selected/r2a-after-s0-w1-c1.png) | [Pair](../../.look/r2a/selected/compare-s0-w1-c1.png) |
| Steel + no wagon, halt | [PNG](../../.look/r2a/selected/r2a-before-s1-w0-c0.png) | [PNG](../../.look/r2a/selected/r2a-after-s1-w0-c0.png) | [Pair](../../.look/r2a/selected/compare-s1-w0-c0.png) |
| Steel + no wagon, curve | [PNG](../../.look/r2a/selected/r2a-before-s1-w0-c1.png) | [PNG](../../.look/r2a/selected/r2a-after-s1-w0-c1.png) | [Pair](../../.look/r2a/selected/compare-s1-w0-c1.png) |
| Steel + wagon, halt | [PNG](../../.look/r2a/selected/r2a-before-s1-w1-c0.png) | [PNG](../../.look/r2a/selected/r2a-after-s1-w1-c0.png) | [Pair](../../.look/r2a/selected/compare-s1-w1-c0.png) |
| Steel + wagon, curve | [PNG](../../.look/r2a/selected/r2a-before-s1-w1-c1.png) | [PNG](../../.look/r2a/selected/r2a-after-s1-w1-c1.png) | [Pair](../../.look/r2a/selected/compare-s1-w1-c1.png) |
| Garage copy | [PNG](../../.look/r2a/selected/r2a-before-garage.png) | [PNG](../../.look/r2a/selected/r2a-after-garage.png) | [Pair](../../.look/r2a/selected/compare-garage.png) |

`look --rail-seed awake --hud`: pass (startup health only; opened). `playthrough --to wake`: pass; report, verdict and end still opened, zero browser errors. See `.look/playthrough/r2a-wake/`.

## Exact remaining-index scan

```text
src/render/wagon-look.ts:163:    step: animate(cars, bodies, [locoWheels, ...trailerWheels], gear, cars[roleIndex(consist, 'engine')]!),
src/proto/crossing/train.ts:81:    rock = look.cars[k]!;
src/proto/crossing/train.ts:159:    const ux = Math.sin(cars[0]!.yaw) * train.v,
src/proto/crossing/train.ts:160:      uz = Math.cos(cars[0]!.yaw) * train.v;
src/entities/railway/machine-model.ts:213:        pitchedGear[i]!.rotation.x = cars[i]!.rotation.x; // Track pitch, without the shell's cosmetic wake shudder.
src/entities/railway/machine-model.ts:227:      const parent = cars[1]!.parent;
src/entities/railway/track-machine.ts:64:  const flatRock = look.cars[1]!,
src/entities/railway/track-machine.ts:65:    locoRock = look.cars[0]!;
src/entities/railway/cars.ts:32:    const previous = cars.at(-1)!;
src/entities/railway/train-view.ts:134:        model.cars[n]!,
src/entities/railway/train-view.ts:146:    const carByRole = (role: Parameters<typeof roleIndex>[1]) => cars[roleIndex(consist, role)]!;
src/entities/railway/train-view.ts:147:    const meshByRole = (role: Parameters<typeof roleIndex>[1]) => model.cars[roleIndex(consist, role)]!;
```
