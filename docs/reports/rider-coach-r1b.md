# R1b: Home proven on today's track

Branch `t3/rider-coach-home-proof`, based on origin/main `874c0b8c`. World stays v56.
No production values moved; no new stills, subagents, push or ship. R1b is ticked in the
[plan](../plans/rider-coach.md). The initial numerical stop was resolved by the orchestrator's
16 November ruling: design minima and pinned measurements are separate contracts.

The CI-registered [home-cart acceptance row](../../dev/level/home-cart.ts), called by
[level-check](../../dev/level/check.ts), defines planned stock locally: long engine, players' car,
2.90 × 1.60 coach directly behind it, kit car, footing wagon, steel car. Players' stop is s 21.65;
no production `consistOf` dependency. Every asserted minimum reports its source, value and margin;
every pin reports recorded value, measured value, ±0.01 m tolerance and remaining tolerance.
R1a's `railway-check-line2.ts` invariant makes the two phases exclusive: trains on implies cart at
REST and hidden, with nothing running on the leg once trains wake.

| Design condition | Threshold | Source | Measured / margin |
| --- | --- | --- | --- |
| Every planned body to island footprint including apron/ramps | ≥0.55 m | Plan, Home on merit: every car to platform edge 0.55 by design | engine 0.5794398184781144; +0.029439818478114388 |
| Engine to leg lever | ≥1.00 m | Orchestrator ruling by analogy with rider-car-fit, Parked layer at Pier (not an established furniture rule) | 1.1341593429538008; +0.13415934295380083 |
| Tail past spur points | >0 m | Orchestrator ruling | 0.04999999999999716; a scrape |
| Engine into arc | ≤3.5 m | Plan R1b | 3.35; 0.15 spare |
| Merge block ahead of forward safety reach | >0 m | `TRAIN_EXTENT.aheadCm` in railway-lines.ts; plan R1b | 4.15 spare after 8.2 m forward reach |
| Passenger deck start and far-end margins | >0 m | Orchestrator ruling, plan Home on merit | exact values pinned below |
| Other cars short of arc | ≥0 m | Plan R1b, every car but engine straight | all pass |
| Boards behind tail | ≥1 m | Existing Home crossing test | 1.95; 0.95 spare |
| Operating cart/static set and standing train/other static set | ≥0.25 m | Plan R1b | operating nearest 0.8539024798146642, island; +0.6039024798146642 |

The existing crossing's 1 m boards/tail rule is stricter than the general 0.25 m static-set
rule and is retained. The audited level checks have no stricter applicable body/platform or
engine/lever minimum. Rotunda's 3.5 m limits measure building/prop footprints to rail centrelines,
not vehicle bodies to furniture, and do not apply to these comparisons.
All bodies are checked against the island: the unchanged flatbeds have their nominal 0.55 m side
gap (sampled 0.5500488410144548 m), so that designed baseline has almost zero surplus.

The three requested thin margins are plainly: **tail/spur 0.05 m** (the thinnest spatial
separation at Home), **engine/island 0.029439818478114388 m over its minimum**, and
**players' deck far end 0.45328580885095704 m**. Arc allowance also has 0.15 m spare.
These are different kinds of margin; a nominal platform side gap is not free room to consume.

Every pin below is asserted independently of the minima, within **±0.01 m**:

| Pin | Recorded m |
| --- | ---: |
| Nose s | 28.35 |
| Nose into arc | 3.35 |
| Nose off straight extension | 0.3114362900980901 |
| Nose past idle leg points | 2.35 |
| Forward reach before merge | 4.15 |
| Tail past spur points | 0.05 |
| Boards behind tail | 1.95 |
| Engine/island | 0.5794398184781144 |
| Engine/leg lever | 1.1341593429538008 |
| Players' deck start margin | 14.34671419114904 |
| Players' deck far-end margin | 0.45328580885095704 |
| Coach deck start margin | 10.946714191149042 |
| Coach deck far-end margin | 4.15328580885096 |

Measured values match the records above to floating-point precision. Tail is s 5.55;
physical nose is 5.65 m short of the merge, whereas the safety reach is 4.15 m short.
Both passenger cars are straight: players 20.05–23.25, coach 16.65–19.55.
The [probe](../../dev/level/rider-coach-probe.ts) now uses the real lever pose: station-axis yaw from
`home-station-view.ts`, giving 1.1341593429538008 m. Its former tangent-based 1.1293370765247293 m
is recorded in the probe comment as superseded. Plan measurements 0.58 and 1.13 are corrected with
a dated note; they were rounded measurements, never design minima under the revised ruling.

The two existing tests in [home-station.test.ts](../../test/home-station.test.ts) now admit only
the planned-coach cases justified by R1a; all original assertions in these two tests remain:

- **“both stops are on the straight…”** Before: today's marks 14/18.25, abeam relation, and both
  engine lengths' noses must stay on the straights. After: all those checks remain, plus the planned
  row requires each non-engine car's nose on the straight and allows only the engine up to 3.5 m
  into the curve. Comment cites R1a: trains on implies cart at REST, leg unused.
- **“road 2: buffer, cart, points, waiting wagon, train and leg in order…”** Before: today's three-car,
  scaled wagon and fitted steel configurations must obey the original ordering, including noses
  before the leg points, plus line 1's buffer and straight checks. After: all remain; the planned
  row preserves buffer/cart/spur/tail ordering but omits the idle leg from that ordering and
  explicitly places its nose beyond the leg points. Comment cites the same R1a invariant.
- **Crossing test:** Before: boards ≥1 m behind today's tail, all spur/cart/ramp/walk checks, and
  `LEG.to - head < 1.6` justified no crossing at the far end. After: retain all checks except that
  obsolete far-end justification; replace it with the planned tail's 1.95 m boards clearance
  within 0.01 m, citing R1a. Today's ≥1 m tail clearance still runs.

This is a sampled planar-envelope check: 0.25 m cart samples plus joins and endpoints, with no height discrimination and no continuous swept volume. No height band was added: production heights span terrain, rail chords and renderer-local assemblies; a partial band would imply a stronger certificate than this audit supplies.
The operating cart is sampled every 0.25 m from line 1 s 54 through the leg, road 2 s 0 and
out to line 2 s 120, plus exact joins and endpoints. Obstacles are island including apron/ramps,
both leg levers and spur lever, Q1/Q2 frame/feeder/rail-bearer colliders, Q2 full rack/sign,
forge rack and standing tree trunk boxes. The standing planned train uses the same set.

Precisely excluded: 3D undercarriage/wheel contact with spur and idle-leg turnout blades,
wing/check/closure rails, frog, timbers and tie plates; these running surfaces would overlap
planar body projections. No certification of tree crowns, branches or foliage at engine/coach
roof height, wind sway, hardwood-specific crown geometry or root seats. Dynamic players,
dropped cargo, loading motion and future train movement are outside this row. No new visual
claim: [the accepted stills](../world/home-coach-train.html) remain the visual evidence.

Checks:

- `npm run level-check`: exit 0, 18 reports; home-cart zero failures; existing planned-track findings remain reported.
- `node --import ./dev/sim/hooks.ts --test test/home-station.test.ts`: exit 0, all 15 tests in the complete file pass.
- `node --import ./dev/sim/hooks.ts dev/level/rider-coach-probe.ts`: exit 0; corrected `noRelay` agrees with row.
- Scoped `npm run lint` on all four code files: exit 0, zero problems.
- `npm run typecheck`: exit 0.
- `node dev/ship-check.ts`: exit 0; registry, four scoped lint files, types and 180 passing tests across 20 affected test files.

No check failed in this completion pass. Initial stopped-run failures are superseded by the explicit orchestrator ruling, not hidden threshold re-pins.


## Independent review fixes, 16 November

The review of `274a1dfe1` requested pins for all measured clearances, renderer-literal drift guards,
and more precise limits. The branch was fetched and rebased onto origin/main first (already up to date).

[home-cart-pins.json](../../dev/level/home-cart-pins.json) records all **751 minimum measurements**,
including **368 standing**, **368 operating**, the five non-engine straight clearances, and the other
layout measurements. Existing specific geometry pins remain. The row emits **755 independent pins**
in total, each ±0.01 m. Missing and stale pin names fail; records are never regenerated at runtime.
The five straight-clearance pins are players **1.75**, coach **5.450000000000003**, kit
**8.850000000000001**, wagon **12.550000000000002**, steel **16.250000000000004** m.
Every static pin's exact value is in that committed record and the row's output.

[home-cart.test.ts](../../test/home-cart.test.ts) proves that moving the forge-rack collider +0.05 m
in x produces both standing and operating pin failures while all design minima still pass. Moving
the planned stop +0.05 m produces nose and straight-clearance pin failures. It also requires a pin
for every measured minimum and checks renderer-local construction values against the envelopes.

Production data imported directly: `HALL.yaw` now supplies lever heading and `ORIGIN.x` replaces the
world-offset reconstruction; island/deck/track/lever reference positions and forge-rack position/yaw
remain sourced from home-station/layout, Q1/Q2 frames from `frameBesideLine` and `stationColliders`,
tree placement/scale/type from `TREE_SOURCES`, and train/cart dimensions and offsets from their existing
headless definitions. No new production export or value change was needed.

Remaining guarded renderer literals are centralized as `HOME_STATIC`:

- Lever base width/depth 0.5/0.8, along offset 1.5 and lateral offset 2.4, checked against
  `home-station-view.ts` including its `HALL.yaw` binding.
- Forge rack post offsets ±1.25/±1.2, post width 0.2 and beam width 2.7, checked against
  `opening-models.ts` and the corresponding collider in `opening-view.ts`.
- Q2 rack post offsets ±1.1/±0.8, post width 0.14, bearer width 0.2 and placement offsets 6/8,
  checked against `line2-view.ts`.
- Sign face width 1.3, border 0.06, depth 0.08, post width 0.12, placement −1.2/−1.55,
  quarter-turn and 0.004 face stand-off, checked against `stock-sign.ts`, `sign-board.ts`
  and `line2-view.ts`.
- Pine trunk base radius 0.46 and hardwood base radius 0.95 with 0.13 bark relief, checked against
  `place-tree-view.ts`. Hardwood envelope includes the maximum 1.13 relief multiplier.

These dimensions are inside render factories with scene/DOM/physics dependencies, not importable
headless layout/prefab records. The whitespace-insensitive tests fail closed when the production
construction or value changes, requiring review rather than silently preserving a stale envelope.
Planned coach dimensions/pitch remain plan-owned data; they are intentionally not production stock.

Source inspection corrected two previous approximations before recording the new static pins: Q2 sign
half-width is **0.71 m** including border (formerly 0.65), and hardwood trunk boxes now include their
**0.95 × 1.13** base radius rather than the pine's 0.46. Those documented changes affect only their
static records, not the three thin Home margins. Both corrected envelopes pass their design minima.

No height band was added. The row and report explicitly exclude turnout running parts, undercarriage
contact, tree canopies/branches/roots, dynamic cargo/players and continuous motion. The 1.00 m lever
minimum is the orchestrator's ruling by analogy with the Pier's parked layer, **not an established
rule for trackside furniture**.

Final review-fix validation (all exit 0):

- `npm run level-check`: 18 reports, home-cart zero failures.
- `node --import ./dev/sim/hooks.ts --test test/home-cart.test.ts test/home-station.test.ts`:
  all 17 tests pass (15 Home plus the perturbation and renderer-source guards).
- `node --import ./dev/sim/hooks.ts dev/level/rider-coach-probe.ts`: passes; lever/island unchanged.
- Scoped `npm run lint -- dev/level/home-cart.ts test/home-cart.test.ts`: zero problems;
  final ship-check also lints all five code files changed on the branch.
- `npm run typecheck`: passes; repeated by final ship-check.
- `node dev/ship-check.ts`: registry, five lint files, types, 182 tests across 21 affected files pass.

No requested validation failed in the final runs. No production files, fixture values, stop, track,
frame or tree placements changed; the new JSON is a dev-only geometry-pin record.
