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
| Engine to leg lever | ≥1.00 m | Orchestrator ruling; rider-car-fit, Parked layer at Pier's 1 m rule | 1.1341593429538008; +0.13415934295380083 |
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

Coverage is a planar body-envelope acceptance, not a complete mesh/collision certificate.
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
