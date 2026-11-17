# R2b independent-review fixes

16 November 2026. Branch `t3/rider-coach-blockout`, rebased from reviewed `2565b85c9` onto
`origin/main` **d0ca285b1** (#1990, the owner's acceptance of the blockout). Rebase was clean.
The previous implementation tip rebased to `554794ccb`. World remains **v57**; no new world bump,
rule change, stop move, or golden re-pin. No ship, push, or subagents.

## Changes by finding

1. **Wheel overflow fixed.** `train-capacity.ts` sums each fleet slot's largest production `consistOf`
   and four wheels per vehicle, grouped by the livery actually used in `train-view.ts`. The shared batches
   are now **20 timber / 144 answering** wheels. Today's allocated base looks use **12 / 96**, including
   shed slots. Allocation checks capacity before adding a car and throws `Train wheel batch overflow: need
   …, capacity …`; there is no silent skip. The regression enumerates every line and all wagon/steel
   combinations. It failed against 72 with `answer: wagon=false, steel=false, need 96, capacity 72`, then
   passed. [Full before-fix failure](rider-coach-r2b/review/wheels-before.log).
2. **Station sweep restored.** `home-station.test.ts` covers the whole timber train, and the entire span
   from the coach's rear to the players' car's front on road 2. Both pass.
3. **Evenness restored alongside the pin.** The 75% gaps remain **551 / 653 ticks**, averaging **602**;
   maximum deviation **51 ticks (5.1 s)**. At 100% they remain **602 / 602**. The assertion now explicitly
   allows `TRAIN.dwellTicks + 1`, with the reason below. No fleet scheduling change.
4. **Showroom and nits fixed.** The works consist is `consistOf({line:-1, wagon:true, steel:false})`;
   engine/player/kit/wagon positions use roles. No coach appears there. The end-path test says six poses;
   the route comment distinguishes physical `legStartS` 119000 from the service mark; Home flip says
   21.65 m. No new player-facing strings; The Boogler's copy is unchanged.
5. **Held Home signals checked.** New production-pose `home-signals.ts` rows are integrated into level-check.
   The longest line 2 consist and the complete line 1 consist clear the existing rules. Pins are new
   measurements, not relaxed minima. Moving a signal back 0.10 m makes the turnout minimum fail.
6. **Controller evidence extended.** Quarry, Ring Island and an actual Home departure are covered below.

## Shared pool audit

Counts include dormant fleet slots where their views are allocated. “Bound” deliberately permits combinations
larger than the currently reachable fleet where that makes the capacity proof simpler. Live counts are in
[fleet results](rider-coach-r2b/review/fleet/results.json); geometry inventory is in
[pools.json](rider-coach-r2b/review/pools.json), reproducible with
`node --import ./dev/sim/hooks.ts dev/level/rider-coach-pools.ts`.

| Pool | Capacity | Worst need / bound | Finding |
| --- | ---: | ---: | --- |
| Shared timber wheels | 20 | 12 today; 20 all consist options | Derived from fleet/consist; overflow throws |
| Shared answering wheels | 144 | 96 base looks; 144 all options | Old 72 overflow fixed; six active trains observed |
| Track-layer wheels | 8 per machine | 8 | Separate local batch; coach adds none |
| Coupling bars | 35 | 27 reachable full fleet; 34 if every slot has wagon + steel | Existing capacity holds; regression now derives need from every consist |
| Coupling buffers | 140 | 94 reachable; 122 for the independent-slot bound | Four per link less engine-owned pairs |
| Folk heads / coats | 144 each | 140 drawable upper bound | Includes all 48 route riders; see accounting below |
| Folk limbs / held items | 576 / 288 | 560 / 280 | Four / two per drawable figure |
| Rider records / seat template | 56 / 8 | 48 active / 8 per coach | The eight timber-line records never draw: no rider route or coach binding |
| Player seats / cab stools | Dynamic keyed registrations | 28 / 7 | Four player seats and one cab stool per train; coach adds no player chair |
| Coach body / underframe / bench solids | Separate meshes per prefab instance | 12 meshes for six coaches; two merged benches per body | No fixed shared pool; all built once on mount |
| Wagon / footing box batch | 600 | Conservative 521: 17 wagon parts + 72 footings × 7 parts | 36 aboard plus 36 in-flight allowance; coach changes placement, not counts |
| Steel cars / load box batch | 147 | 102: six × (11 drawn parts + six ingots) | Allocation reserves 15 car parts per slot, including unused timber slot |
| Kit-deck crate slots | 8 per deck | 8 per deck | Cargo remains clamped to its deck; mesh recycle pools grow on demand |
| Contact shadows | 4096 per view owner | 1787 conservative full-layout bound; 1721 live | 249 timber + 639 quarry sleepers, 121 yard, 758 tree allowance, 18 station, two machine blobs; coach adds zero |
| Per-car kit pieces / fallback wheels | Individual cloned meshes | Constructed from each car/consist | No shared fixed-size batch to exhaust |
| Track/prefab instance batches | Counted from collected operands | Exactly the collected piece count | Added coach prefabs own ordinary meshes; no global car-slot ceiling |

The folk bound includes 28 town, six camp, two station, 48 riders, 24 waiting, seven drivers, five commuters,
two pushers, six residents, two greeters, three part-hoist lookers and seven Ring figures = **140**.
The renderer allocates 144. Even allowing all six reserved resident slots, the allocated upper bound is 148 only if the eight
permanently unused timber rider records are counted. Distance/phase culling is not needed for the 140 bound. Riders create no extra blob shadows;
their ordinary mesh shadows use the same counted figures. The legacy 150-instance ground-crate heap has no
production railway caller and receives no coach/rider objects.

## Why headway differs

The controls restore one input at a time in memory, including its derived values, using the same two-train seed
and placement as the test (`dev/level/rider-coach-headway.ts current|home|tail`):

| Control | Cycle | 75% minimum headway | Settled gaps | Deviation from half-cycle |
| --- | ---: | ---: | --- | ---: |
| Production | 1204 | 451 | 551, 653 | 51 |
| Only Home restored to 18.25 m | 1208 | 453 | 554, 654 | 50 |
| Tail restored to 12.70 m, derived Home signals −3.40 m | 1204 | 451 | 551, 653 | 51 |

[Production trace](rider-coach-r2b/review/headway-current-detail.json),
[Home control](rider-coach-r2b/review/headway-home-detail.json),
[tail control](rider-coach-r2b/review/headway-tail.json).

`balancedHold` compares **spatial** circuit gaps once per tick. In production, at tick **7412**, the leading
train's `trainAlong` has rounded/clamped to the Pier endpoint **72650 cm**, while `trainArrives` is **7413**.
The equal spatial gaps release the Home train that tick. With old Home, the corresponding endpoint equality
and arrival both occur at **7426**. The ordinary end dwell accounts for the ±50-tick split; this endpoint
quantisation contributes the extra tick. The longer reserved tail changes the initial approach slightly but
**does not change these settled gaps**. Keeping current spatial balancing is appropriate: the mean remains
half-cycle, the minimum-headway safety property still holds, and the extra tick is inherent in this geometry
with the existing integer pose/arrival rules. Re-evening departure times would change scheduling policy and
reviewed goldens. The test now states the 51-tick bound and keeps the exact pin; nothing is silently dropped.
A trial restoring only the old signal while retaining the longer tail was abandoned: it overlaps the end block
and is not a valid causal control. It is not used to justify this result.

## Home signals: whole train, not just nose

The **player marks** are **72.10 m (line 1)** and **70.10 m (line 2)**. The user's **80.30 / 78.30 m**
figures are their reserved noses. The shared 16.10 m tail starts at **56 / 54 m**, exactly past the respective
turnouts. Line 1 also exactly clears the reserved cart-leg crossing interval. The drawn three-car timber train
stands on the ridge bridge approach/trestle; its body corners remain inside the widened deck. Line 2's complete
six-car long-boiler train stands on the bank/rising approach; neither held train straddles Home's spur or foot
crossing. The Q2 frame is still present after completion and is included with its feeder/rack. Cart movement
is also phase-exclusive with running trains, but the stronger geometric separation passes independently.

Every value below is metres, with a **±0.01 m pin**. Sources/minima are recorded per row in
[home-signals.json](rider-coach-r2b/review/home-signals.json): `rail-network.ts`/`railway-install.test.ts`
no-overlap, the Home crossing's 1 m tail clearance, R1b's 0.25 m static-furniture clearance, and the production
3.6 m widened trestle's containment rule. Existing Home thin margins are unchanged.

| Whole-train measurement | Measured | Minimum | Pin |
| --- | ---: | ---: | ---: |
| reserved tail / the buffer stops (s -5.53) (line 1) | 61.530000 | 0.00 | 61.530000 |
| reserved tail / the cart's leg (s 54) (line 1) | 0.000000 | 0.00 | 0.000000 |
| reserved tail / the stub turnout at s 36 (line 1) | 0.000000 | 0.00 | 0.000000 |
| whole train / T1 frame and racks (line 1) | 93.622721 | 0.25 | 93.622721 |
| whole train / T2 frame and racks (line 1) | 73.204917 | 0.25 | 73.204917 |
| whole train / T3 frame and racks (line 1) | 37.624265 | 0.25 | 37.624265 |
| whole train / swept cart leg (line 1) | 11.617058 | 0.25 | 11.617058 |
| whole train / ridge lamps (line 1) | 0.455655 | 0.25 | 0.455655 |
| whole train / ridge trestle outer edge (line 1) | 0.703967 | 0.00 | 0.703967 |
| reserved tail / the buffer stops (s -2.6) (line 2) | 56.600000 | 0.00 | 56.600000 |
| reserved tail / the engine spur's points (s 5.5) (line 2) | 45.500000 | 0.00 | 45.500000 |
| reserved tail / the cart's leg (s 26) (line 2) | 26.000000 | 0.00 | 26.000000 |
| reserved tail / the stub turnout at s 34 (line 2) | 0.000000 | 0.00 | 0.000000 |
| reserved tail / Home crossing (line 2) | 50.400000 | 1.00 | 50.400000 |
| whole train / Q1 frame and racks (line 2) | 40.378443 | 0.25 | 40.378443 |
| whole train / Q2 frame and racks (line 2) | 13.257593 | 0.25 | 13.257593 |
| whole train / Q3 frame and racks (line 2) | 39.636117 | 0.25 | 39.636117 |
| whole train / Q4 frame and racks (line 2) | 93.501693 | 0.25 | 93.501693 |
| whole train / Q5 frame and racks (line 2) | 177.430852 | 0.25 | 177.430852 |
| whole train / Q6 frame and racks (line 2) | 415.635251 | 0.25 | 415.635251 |
| whole train / swept cart leg (line 2) | 21.394727 | 0.25 | 21.394727 |

## Controller and visible evidence

These use the accepted `boiler-long` seed extended through High Gorge by accepted `laySection` operations,
all six fleet slots joined, and the accepted air-jump unlock. The train is held at a real arrival for static
trials; only initial takeoff placement teleports. Held jump, second jump and steering run through the production
controller and Rapier. Quarry is a real accepted outward request. All captures are WebGPU, no page errors,
and around 60 completed frames/s in the final health sample. I opened every listed image myself.

- **Quarry:** closest meaningful raised object is the platform canopy beside the coach. The controller lands
  on the coach at feet **26.3495 m** (roof 26.35), then on the canopy at **28.2198 m**. The existing cab-roof
  control lands on that same canopy at **28.2199 m**. Reachable, but **not a new route**.
  [Platform→roof](rider-coach-r2b/review/quarry/platform-to-roof-filmstrip.png),
  [roof→canopy](rider-coach-r2b/review/quarry/roof-exit-filmstrip.png),
  [cab control](rider-coach-r2b/review/quarry/cab-control-filmstrip.png),
  [contacts and inputs](rider-coach-r2b/review/quarry/results.json).
  The canopy obscures much of the coach roof in the first sheet; the grounded coach-platform ID confirms the landing.
- **Ring Island:** the bank/loader-side platform is the other sensitive adjoining geometry. The controller
  lands on the roof at **10.0491 m** (roof 10.05), then returns to the existing **8.8999 m** platform; the cab
  control reaches the same platform. No raised walkable target was found within the nearby scan (±8 m along,
  ±10 m across, between rail+3.5 and rail+8 m). No new route found in these controller trials.
  [On roof](rider-coach-r2b/review/ring/on-roof-still.png),
  [platform→roof](rider-coach-r2b/review/ring/platform-to-roof-filmstrip.png),
  [roof exit](rider-coach-r2b/review/ring/roof-exit-filmstrip.png),
  [cab control](rider-coach-r2b/review/ring/cab-control-filmstrip.png),
  [contacts and inputs](rider-coach-r2b/review/ring/results.json).
- **Moving case:** after the server resumes at normal speed, the player jumps from the players' deck onto
  the departing coach and stays grounded on `railway:train5-2` around Home's curve, feet **20.3495 m**.
  [Real-time motion sheet](rider-coach-r2b/review/moving/moving-coach-motion.png),
  [contact trace](rider-coach-r2b/review/moving/results.json). The generic point-target `reached` flag is false:
  its stale moving centre is 0.686 m away, outside the 0.6 m static target test; the grounded platform ID and
  roof height establish the actual roof landing. The fixed camera loses the train after 2.6 s; contacts continue
  through 4 s. This tests boarding/riding the moving roof, not every possible moving exit.
- **Sixth train:** [new still](rider-coach-r2b/review/fleet/sixth-train-wheels-still.png) shows slot 6 running on
  the stack line, with its engine wheels and wheels beneath the passenger/kit underframes. Those smaller wheels
  are partly obscured by the deck and rails; this view is not a count of every far-side wheel. The complete
  fleet is active, and the live shared batch has **96 used / 144 capacity**.
  [Seed/fleet/pool readback](rider-coach-r2b/review/fleet/results.json).

The first fleet still missed a moving train after warm-up; the second was blocked by a Home canopy post. Neither
is used as evidence. The final capture re-reads the live pose after warm-up and frames the sixth train on open
track. The repo evidence is about 11 MB, with stills/sheets and small logs, no raw video. The earlier R2b clips
and all accepted count-read/Home evidence remain linked in the [original report](rider-coach-r2b.md).

## Checks

| Check | Result |
| --- | --- |
| Old-capacity regression | Expected failure: 96 needed, 72 available; full output linked above |
| Affected tests, final | **76/76 pass** ([log](rider-coach-r2b/review/affected-final.log)); includes wheel/coupling capacity, station sweep, signal perturbation, headway and end poses |
| Affected tests with CI audit and per-file deadline | **76/76 pass** ([log](rider-coach-r2b/review/affected-ci.log)); longest file `railway-trains` 65.77 s vs 77 s weight, no drift warning |
| All 53 stage/continuation goldens | **118/118 pass**, no fixture changed ([log](rider-coach-r2b/review/goldens.log)) |
| Server, first run | 407 pass, one client-address failure, quoted below |
| Client-address rerun | **48/48 pass** ([log](rider-coach-r2b/review/server-address-rerun.log)) |
| Full server rerun | **408/408 pass**, including the 8,600-record host trace ([log](rider-coach-r2b/review/server-rerun.log)) |
| `npm run level-check` | **21 reports, zero failures** ([log](rider-coach-r2b/review/level-check.log)); includes Home held-signal rows and all previous coach/Pier/Gorge rows |
| `npm run lint` | **0 problems** ([log](rider-coach-r2b/review/lint.log)); existing conservative dynamic-import analysis notice |
| `npm run typecheck` | **Pass** ([log](rider-coach-r2b/review/types-final.log)) |
| Four capture modes | **Pass health**, observations/limits above; static target flag caveat explicitly recorded |
| `git diff --check` | **Pass** after normalizing trailing whitespace in imported evidence logs |
| `node dev/ship-check.ts` | **Pass**, registry, 83 lint files, types, 214 affected files: 1,876 passed, zero failures, 65 expected skips and one todo; 97.36 s ([log](rider-coach-r2b/review/ship-check.log)) |

The CI-mode timing reporter initially warned that the two new test files were unmeasured (0.566 s and
0.153 s). Both now have a measured, rounded 1 s entry in `unit-weights.json`. No affected file drew a drift
warning or approached the 480 s deadline. [Rerun after weights](rider-coach-r2b/review/new-test-weights.log):
four tests pass, no warnings.

No application/server change was made for the transient HTTP failure; its focused and full reruns pass.
The original failure text (trailing whitespace normalized) is preserved in [server-failure.txt](rider-coach-r2b/review/server-failure.txt),
and the complete initial run in [server.log](rider-coach-r2b/review/server.log):

```
✖ failing tests:

test at test/client-address.test.ts:68:5
✖ new sessions: Fly IPv6, independent clients and untrusted XFF (13.85625ms)
  AssertionError [ERR_ASSERTION]: request 0

  404 !== 204

      at TestContext.<anonymous> (file:///Users/matiasfranco/.t3/worktrees/boogle/t3-6a1cc403-f0af1001cb859586/server/test/client-address.test.ts:112:49)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:974:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: 404,
    expected: 204,
    operator: 'strictEqual',
    diff: 'simple'
  }
```

No new clearance minimum failed. No stage, save/wire meaning, rider cap, fare, train extent, or stop position
changed in this follow-up. The existing independent-review findings on prediction, riders/save/restart/late join,
room sharing, lifecycle, garage, lockstep, freight and all causal re-pins remain applicable to the unchanged rules.
The new capacity is computed once at module load; it adds no per-frame allocation. Static controller coverage is
Home plus Quarry and Ring Island; other halts retain the documented geometry scan, not an unclaimed controller run.
No R1c, R3 or R4 work. No new player copy. Nothing pushed or shipped.
