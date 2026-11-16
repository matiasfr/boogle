# R1b stopped at the stated minimum

Branch: `t3/rider-coach-home-proof`. Rebased onto origin/main `874c0b8c`; world remains v56.
No production changes, no bump, no new stills, no subagents, no push or ship.

R1b is **incomplete**. The instruction says to stop if a measured clearance is worse than its stated
minimum, without adjusting a threshold. The island clearance is 0.5794398184781144 m, below 0.58 m.
This is consistent with rounding to the plan's two decimal places, but does not meet the task's explicit minimum.
The owner/orchestrator must resolve that numerical requirement before implementation resumes.

The diagnostic [home-cart row](../../dev/level/home-cart.ts) is registered in the default CI
[level-check entry](../../dev/level/check.ts). It describes its own planned six-vehicle consist,
with the 2.90 × 1.60 coach directly behind the players' car, at stop 21.65. It checks standing
bodies and the operating cart sampled every 0.25 m from road 1 s 54 through the leg and Home,
then out to line 2 s 120, against island/ramps, leg and spur levers, frame colliders, Q2 rack/sign,
forge rack and standing tree trunks. It reports each metric's threshold and remaining margin.
It is diagnostic: turnout parts and canopy are not fully certified. Do not treat it as acceptance.

| Measurement | Actual m | Plan m | Difference or remaining margin m |
| --- | ---: | ---: | ---: |
| Tail past spur points | 0.05 (tail s 5.55) | 0.05 | 0 |
| Nose s | 28.35 | 28.35 | 0 |
| Nose into arc | 3.35 | 3.35; max 3.5 | 0.15 to maximum |
| Nose off straight extension | 0.3114362900980901 | about 0.31 | +0.0014362900980901 |
| Nose past idle leg points | 2.35 | 2.35 | 0 |
| Engine/island | 0.5794398184781144 | minimum 0.58 | **−0.0005601815218856** |
| Engine/leg lever, committed probe | 1.1293370765247293 | minimum 1.13 | **−0.0006629234752707** |
| Engine/leg lever, rendered axis heading | 1.1341593429538008 | minimum 1.13 | +0.0041593429538008 |
| Nose to second-track merge | 5.65 | 5.65 in level finding 10 | 0 |
| Forward reach to merge block | 4.15 | 4.15 in Home on merit | 0 |
| Boards behind tail | 1.95 | 1.95 | 0 |
| Players' car span | 20.05–23.25 | 20.05–23.25 | deck far-end margin 0.45328580885095704 |
| Coach span | 16.65–19.55 | 16.65–19.55 | deck far-end margin 4.15328580885096 |

The probe turns the lever with the local road tangent. The actual leg levers in
`src/entities/railway/home-station-view.ts` use the station-axis yaw; the row follows that source.
Both values are recorded rather than silently choosing the larger clearance.
4.15 is the margin to the train's forward safety reach (8.2 m ahead of its stop), not its physical nose.

No existing assertion changed because implementation stopped first:

- “both stops are on the straight…” before and after: today's two stops and both engine lengths must
  keep their noses on the straight; marks remain 14 and 18.25, with the abeam check preserved.
  The planned-coach exception (all other cars straight, engine at most 3.5 m into arc) has **not** been added.
- “road 2: buffer, cart, points, waiting wagon, train and leg in order…” before and after: all original
  ordering and buffer assertions still hold, including today's noses short of the leg points.
  The R1a-based planned-row exception has **not** been added.
- The crossing test is unchanged too: boards at least 1 m behind today's tail and its original
  far-end assertion `LEG.to - head < 1.6`. Planned-row boards/tail clearance is in the diagnostic row only.

Checks on the diagnostic code:

- `npm run level-check`: **exit 1**, 18 reports. New row's failures quoted in full below; no allowances added.
- `node --import ./dev/sim/hooks.ts --test test/home-station.test.ts`: **exit 0**, 15/15 passed.
- `node --import ./dev/sim/hooks.ts dev/level/rider-coach-probe.ts`: **exit 0**; `noRelay` independently confirms island gap.
- Scoped `npm run lint -- dev/level/home-cart.ts dev/level/check.ts`: **exit 0**, zero problems.
- `npm run typecheck`: **exit 0**.
- `node dev/ship-check.ts`: **exit 0**, registry, scoped lint, types, 19 affected test files / 165 passing tests.

```text
players deck start: 14.34671419114904 m < 14.35 m (margin -0.0032858088509595262 m)
coach deck start: 10.946714191149042 m < 10.95 m (margin -0.00328580885095775 m)
engine/island: 0.5794398184781144 m < 0.58 m (margin -0.0005601815218855277 m)
```

The first two failures compare rounded deck-start margins introduced in the diagnostic row, rather than
plan-stated minima; they also require resolution, not threshold changes made to get green. The physically
binding stop is the explicit island minimum. R1b remains unticked in the plan.
