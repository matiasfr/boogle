# First-line crossing probe

> **Verdict:** no suitable crossing fits at either station on today's terrain.
> **Top recommendations:** do not build stage 2; put any new crossing terrain to the owner as a scope choice.
> **Status:** reference; stage 1 shipped in #1923 and its no-build result was recorded in #1925 (16 November 2026).

16 November 2026. Stage 1 measurement only; no rule, terrain, bill, source, copy or runtime changes.
Surveyed `origin/main` **68e2984efdbd58f0a923b2e614b06ac7659d221b**, world **v52**.
The brief and its calculator were already on that main. The owner's two-stage approval is the task's scope;
this report does not authorize building the choice.
Rebased onto fetched `origin/main` **9eb6ee3bb2cb4a776536b921439b80de119012af** before handoff. The probe's
haul paths, bundle itineraries, ravine, jump bounds and early reach results were rerun and compared: **identical**.
The intervening bell crate/clue move does not change those measurements. Stills retain their initial source
provenance above; they were not recaptured after rebase. No new terrain or crossing geometry arrived in that rebase.

## Verdict

**No useful crossing fits either station's surveyed normal haul with the allowed small local change.** Both
stations have continuous, nearly flat, direct ground routes to the practical north-bank logs: a new ledge over
that ground cannot shorten them. The tempting T3 west-bank tree lies across about **29 m of low ravine**, with
an **11.08 m** difference between the source and receiving ground, beyond the real double jump; one ledge
cannot make it a forgiving two-way crossing. The catalogue's 10 m course gap is not installed in production
and its start is unreachable at T1/T2. On the concrete full-stock itineraries below, early jump therefore
uses the same ground walks: **41.02 s at T2 and 84.29 s at T3**, against early carry's **35.25 s and 69.13 s**
(walking only). Keeping the page's unmeasured 0.24 s/chop stand-in gives **44.86 / 89.09 s** versus
**39.09 / 73.93 s**. Carry wins both here: the brief's “neither pick wins both” does **not** survive the survey.
These are distance divided by code speed, not observed completion times or a proof about every possible layout.

## Method and evidence limits

- `npm run loop -- node T2`, `-- node T3`: bills and source ownership. `dev/loop/graph.ts` selects the nearest
  `ceil(bill / 10)` trees by Euclidean distance, averages them, and models each trip to that average. It does not
  route over land, consume trees across stations or account for visiting a second tree to fill a bundle.
- `timeout 180 npm run level-check`: passed, 16 reports. `dev/economy/place-level.ts` uses a 2 m walking flood,
  authored bridge/rail links and approximate ability envelopes. It explicitly excludes props, swept clearance,
  controller timing and directed recovery. A passing check is not a physics witness.
- New read-only tool: [dev/level/first-line-crossing-probe.ts](../../dev/level/first-line-crossing-probe.ts).
  Run `timeout 120 node --import ./dev/sim/hooks.ts dev/level/first-line-crossing-probe.ts` under Node 26.
  Output: `.look/first-line-crossing-probe.json`, including source coordinates, raw grid distances, smoothed
  waypoints, finite-stock itineraries, reach states and the ravine section. No game source is modified.
- The probe runs Dijkstra over the actual `surfaceHeight` at **2 / 1 / 0.5 m** spacing, dry ground only,
  symmetric slope limit **1.51848** from `WALKABLE_NY = 0.55`, eight neighbours and the existing footbridge links.
  It smooths paths with terrain samples every **0.125 m**, preserving legal slopes and excluding water.
  Bounds: world x **840–1050**, z **−210–20**. Distances are horizontal metres, matching movement's horizontal
  speed; bridge links retain the checker's simplified endpoint model. No prop/body/headroom clearance is included.
  On the practical north-bank routes, every resolution simplifies to the same direct segment, to the shown precision.
  The west-bank route varies **315.08–321.29 m**: report that range, not a centimetre-accurate shortest path.
- All travel seconds use **5.6 m/s**, verified in `src/entities/player/state.ts:198` and `dev/loop/graph.ts:191`.
  No browser wall time, completed-frame rate or busy-Mac timing is used. No sprint advantage is credited to one pick.
- Source/frame centre endpoints match the graph's convention. A real player stops within interaction reach,
  routes around trunks/frames and accelerates; those effects and pickup/deposit/mining time are **unmeasured**.
  There is no single compulsory haul route. The finite-stock itinerary is a reproducible legal-ground planning
  choice, not a bot replay or a globally optimal resource-packing solution.

## Sources, delivery points and ground routes

Coordinates below are **world metres (x, z)**; add 1000 to Place-local x. Catalogues use integer centimetres.
The sources are the actual `RAILWAY_SOURCES` used by the graph, not decorative trees. Each starts with **10 logs**;
the starter axe yields **2/chop**. Frame coordinates and bills come from `src/sim/railway-line-layout.ts`.

| Source | Position | Ground y | To T2 `(979.97, −125.53)`, y 30.012 | To T3 `(977.44, −88.73)`, y 30.218 |
| --- | --- | --- | --- | --- |
| Tree 2 | 996.09, −126.88 | 30.00 | 16.18 m / 2.889 s | 42.46 m / 7.583 s |
| Tree 3 | 997.04, −132.34 | 30.00 | 18.38 m / 3.282 s | 47.81 m / 8.538 s |
| Tree 1 | 1002.21, −125.03 | 30.00 | 22.25 m / 3.972 s | 43.95 m / 7.847 s |
| Tree 0 | 1004.58, −127.44 | 30.00 | 24.68 m / 4.408 s | 47.28 m / 8.442 s |
| Tree 220, west bank | 948.30, −53.14 | 19.136 | Not selected for T2 | 315.08–321.29 m / 56.26–57.37 s, **not** 46.00 m / 8.21 s |
| Rock 0, 8 stone | 1001, −106 | terrain | **28.70 m / 5.125 s** | No stone bill |

T2 needs **32 logs + 8 stone**. Its graph's four trees are **2, 3, 1, 0**, average **20.371 m / 3.638 s**
one way. All walk directly across the north plateau to the frame; the stone walk also stays on that bank.
Rocks 1 and 2 are at `(1008, −101)` and `(1007, −110)`, with T2 walks **37.25 m** and **31.17 m**;
rock 0 alone has the required eight units. There is no bridge or jump on these routes.

T3 needs **40 logs**, plus the separate beam. Its Euclidean graph selection is **2, 1, 220, 0**,
average **44.921 m / 8.022 s**. Tree **220 is on the other bank**: the short chord crosses steep walls and water.
Its dry model route goes around via the timber footbridge and long graded approach; exact waypoints are in the JSON.
Use **2, 1, 0, 3** on the same bank instead: average **45.375 m / 8.103 s**, each a direct land walk.
The beam source is the great tree `(1000, −62)`; it is not an ordinary log source and its hauling speed is separate.
No beam time is included in the T3 log comparison.

### Concrete bundles, rather than an average tree

Independent full-stock start at each station, as in the page; **no prior T1/T2 depletion or regrowth assumed**.
Sources are visited in walk-nearest order. Each trip starts/ends at the frame; take the remaining stock and
continue to the next tree until the normal bundle is full. Inter-tree legs are on the same flat plateau.
Notation `2:2 → 3:6` means two logs from tree 2 and six from tree 3 in that one trip.

| Haul / comfort | Log trips, in order | Log walk | Stone walk | Walking seconds | + page's swing stand-in |
| --- | --- | --- | --- | --- | --- |
| T2 / 8, early jump | `2:8`; `2:2 → 3:6`; `3:4 → 1:4`; `1:6 → 0:2` | 172.34 m | 57.40 m | **41.02 s** | **44.86 s** |
| T2 / 12, early carry | `2:10 → 3:2`; `3:8 → 1:4`; `1:6 → 0:2` | 139.98 m | 57.40 m | **35.25 s** | **39.09 s** |
| T3 / 8, early jump | `2:8`; `2:2 → 1:6`; `1:4 → 0:4`; `0:6 → 3:2`; `3:8` | 472.04 m | — | **84.29 s** | **89.09 s** |
| T3 / 12, early carry | `2:10 → 1:2`; `1:8 → 0:4`; `0:6 → 3:6`; `3:4` | 387.11 m | — | **69.13 s** | **73.93 s** |

Normal carry saves **5.78 s at T2**, **15.17 s at T3**. Filling the heavy allowance on these same itineraries
(the current linear slowdown, including partly loaded inter-tree legs) gives walking times:
8 comfort / 12 maximum **44.49 / 99.90 s**; proposed 12 comfort / 18 maximum **32.30 / 72.27 s**.
Thus the best of these measured-route loading policies still favours carry at both: **32.30 / 69.13 s**.
Heavy pickup/drop-slot availability and action overhead are not exercised; these are arithmetic comparisons.

For a direct comparison with the page's average-source method, changing only T3's source selection gives
early jump **43.19 / 85.83 s**, early carry **35.92 / 69.62 s**, including its swing stand-in.
The concrete itinerary differs because trees contain ten units and some bundles need more than one tree.
Neither method supplies evidence for the proposed **2 s / 7 s** jump routes. T2's closest tree alone is
**2.889 walk-seconds** away even on a straight line; the target 2 s is already below that bound.

## Crossing candidates

The first two rows are the strongest **existing geometric leads**, both rejected. The third is the required
T2 route survey: there is no gap to promote there. Savings mean a usable one-way shortcut on the actual haul,
not the difference between a straight chord and a long walk that the jump cannot complete.

| Site / position | Width and height versus real reach | T2 / T3 seconds saved each way | Miss and load | Local change / result |
| --- | --- | --- | --- | --- |
| **T3 ravine toward tree 220**: frame `(977.44, −88.73)` → source `(948.30, −53.14)` | 46.00 m chord; approximately **29.0 m** continuously below y 15, between `(970.98, −80.84)` and `(952.61, −58.40)`; ground endpoints **30.218 → 19.136**, return +11.08 m. Beyond even the delayed-jump **17.12 m** conservative sprint envelope, and **3.03 m** rise. Even the 29 m low span understates the upper-bank crossing. | **0 / 0 usable**. Do not credit a hypothetical 48 s one-way saving from a jump that cannot reach. | Bottom **−2.2 m**, roughly 32.4 m below the north bank, with water and steep walls. A dry walk-out in seconds is unproved; the long source route is already 56–57 s. Heavy cargo cannot jump here, but ordinary cargo cannot bridge it either. | A single added ledge or removed plank is insufficient. Needs multiple supports/catch infrastructure and a new high connection; exceeds a local tweak. **Reject.** |
| **Catalogue first course gap**: p1 `(953.896, −68.845)`, top **26.379**, to j1 `(937.496, −68.845)` | Centre spacing 16.4 m; cap widths 6.8 and 6.0 m → **10.0 m edge gap**, equal height. Above conservative single sprint envelope **9.85 m**, below double sprint **13.52 m**, but exceeds apex-timed walking double **7.97 m**, and delayed centre travel **9.00 m** (body/coyote overlap is not a forgiving margin). Broad landing on paper; single exclusion margin only 0.15 m. | **0 / 0**. Early reach model cannot reach p1 at T1/T2; j1 and the recovery ribbon are **absent in production**. | Catalogue catch is 3.4 m down, with a return ramp, but that floor is not built here. Current miss cost and loaded recovery are **unverified**, not “seconds.” Heavy cannot jump; no live normal-load crossing proved. | Needs landing/catch geometry plus an early access connection, not one ledge. Course would lead toward its later optional reward on paper. **Reject; model-only lead.** |
| **T2 grove apron**, frame → trees 2/3/1/0, roughly x **980–1005**, z **−133–−125** | **0 m gap**, terrain approximately y 30 throughout; already walkable with either load. Single jump not required. | **0 / 0** for the common source end. | Walking stays dry; an added low platform would drop onto existing ground, but adds no route benefit. Heavy is already grounded globally, not impeded by a local crossing. | One ledge over flat ground cannot shorten a direct route. Removing one plank changes nothing because these hauls use no plank. Creating an enforced detour would change today's ground route. **Reject.** |

An extra 2.0–2.4 m ledge can distinguish single/double *height*, but is only an obstacle or a view here, not a
shorter connection. A forgiving flat gap must also defeat **sprinting** single jump; a 5–7 m gap would not.
The timber footbridge itself is about **18.2 m** long, beyond even the delayed double sprint envelope end to end; removing
a small plank makes a single-jump gap and damages the retained ground route rather than creating a new option.

### Jump numbers from code

`src/constants.ts`: first impulse **7.6 m/s**, gravity **18 m/s²**, body radius **0.45 m**.
`src/entities/player/state.ts` and `src/entities/player/apex-float.ts`: held ascent floats at **0.5g** below
**1.6 m/s**, fall **1.7g**; releasing early cuts the first ascent. `src/sim/tune.ts` and
`src/adapters/railway-read.ts`: default second impulse **6.8 m/s**, turn **0.7**, steering **25 m/s²**.
`src/entities/railway/tools.ts:373` sets vertical velocity to at least that impulse; it does not add impulses.
Holding the first jump and spending the second near its apex maximizes height. These are analytic arcs:

| Move | Rise | Flight to equal height | Walking reach at 5.6 | Sprint reach at 9.5 |
| --- | --- | --- | --- | --- |
| Single | **1.676 m** | **0.842 s** | **4.715 m** | **8.000 m**, or **9.849 m** conservative upper envelope including 0.1 s coyote allowance and 0.9 m body diameter |
| Double, at first apex | **3.031 m** | **1.423 s** | **7.968 m** | **13.517 m** before reserving landing margin |
| Double, delayed for range | Different arc; not the 3.03 m height-maximizing jump | **1.607 s** | **9.001 m** | **15.269 m**, or **17.119 m** including the same conservative coyote/body allowance |

The apex-timed rows reproduce the checker's 1.68/3.03, 4.7/8 and course sprint envelopes. Its 13.52 m is
**not an upper bound on every input timing**. Delaying the second press until the two falling distances balance
(about y +0.16 m on the first descent) gives the longer range row. This still falls well short of the ravine.
These are continuous force-phase
calculations, not discrete Rapier sweeps or guaranteed reach at a particular gap. Normal eight-log load has
full movement speed and can jump; **over comfort, both jumps are blocked**, and speed drops linearly to 45%
at maximum (`railway-queries.ts`, `sources.ts:941`, `view.ts:442`, `tools.ts:359`).

### Early jump and later progression

The probe invokes the existing checker's **same private flood and pad-reach rules** by instrumenting its source
in memory, supplying the original imports explicitly through `dev/level/source.ts`. It adds only these queries:
after T1, laid north line s **150–191**; after T2, s **116–191**; double jump granted, no hook/glider.
It neither changes the file nor grants a new production room rule.

- Both early states: ordinary jump reaches **no tech pads**; double jump reaches **apron, lookout, alcove**.
  It does **not** reach p1/jump device, j1/course, p2/hook, the tower/summit, balcony, stack or glide-home.
- Lookout's optional secret becomes reachable earlier with the early ability. Alcove is already an accepted
  plateau-drop sequence break in the checker, but the new early access still needs a real collider witness.
  The report does not hide these under a general “no bypass” pass.
- Apron means physical access to the quarry lever earlier, **not** permission to open the gate:
  `railway-sys-line2.ts:302` refuses before Q3. The unchanged level check's Q2 accepted-command probes refuse
  early lever/sea switch/boiler/kiln and later Q4–Q6 funding. The Q4 no-hook reach bound also keeps the sea
  landing/switch beyond double jump even granting machine/headstock launch heights.
- No candidate changes were built, so there is no modified-geometry reach proof. The existing checker includes
  legacy course pads/recovery which production does not instantiate (`tools.ts:98`,
  `src/entities/finds/secrets-view.ts:68`). Treat its extra-pad answers as bounds, not installed collision.
- **Unverified:** physical gate overtopping, jumping from props or trains, interaction reach at every secret,
  early ability acceptance in a live room, cargo conservation on a miss, and a real loaded double-jump trajectory.
  No successful, safe early crossing is claimed.

## Opened stills

All paths are relative to this worktree's `.look/`; files remain ignored and are not committed. Every PNG below
was opened with `view_image`. The selected captures passed WebGPU, advancing completed frames and zero page,
console or graphics errors. These are stationary jump-in surveys, **not movement, load or completion proofs**.

| Site / PNG | What I see and whether both options read |
| --- | --- |
| `first-line-bank-approach-clear-still.png` | Player-height view beside T3, eye `(979,31.6,−81)`. Grass ends in a large angular cliff; the isolated jump pillar and distant west lawn are visible. The valley bottom and long return are hidden by the near rim. **No readable pair of alternatives**. |
| `first-line-bank-above-v2-still.png` | Overhead: a wide water channel, tall walls, a low plank bridge and long winding grey paths on both banks. This explains the large detour, and shows why “remove one plank” is not a short top-level shortcut. |
| `first-line-course-approach-still.png` | Eye `(950.6,27.63,−68.845)`, 1.25 m above catalogue p1 top. Trees, the far lawn and the path on the right appear, but **no j1 landing or catch deck**. A hypothetical crossing cannot be read as an option. Uses `q1-done` only to inspect completed geometry, not as an early progression proof. |
| `first-line-course-above-still.png` | Overhead: laid timber trestle, single pillar, river, lower footbridge and grass on the opposite bank. The catalogue's course/catch ribbon is absent, confirming the production builders. Same later reference seed. |
| `first-line-t2-approach-still.png` | Eye `(979.97,31.26,−125.53)`, 1.25 m over terrain. Three large nearby pines and continuous grass; frame furniture clips the bottom/right edges. The source approach is readable, **no crossing option exists**. |
| `first-line-t2-above-still.png` | Overhead: source grove between receiving frames, rocks to the east, uninterrupted lawn between. Gorge is outside the relevant direct walks. This is the clearest evidence against a useful local gap on T2's haul. |

Initial `first-line-bank-approach-still.png` and `first-line-bank-approach-v2-still.png` were opened but mostly
obscured by frame furniture; superseded by the clear approach. One first command rejected `--frames 1` before
launch; corrected to 2. One queued overhead run was cancelled before browser launch while waiting on load;
its verdict is **killed**, not a gameplay failure. No files were edited during a browser run.

Reproduce selected stills; each command is bounded and creates its own disposable local stack:

```sh
export PATH=$HOME/.nvm/versions/node/v26.13.0/bin:$PATH
timeout 180 npm run look -- --rail-seed awake --cam 979,31.6,-81 --look 948.3,19.14,-53.14 --warm 2 --seconds 0.2 --frames 2 --wall 100 --name first-line-bank-approach-clear --question 'Read both routes beside T3?'
timeout 180 npm run look -- --rail-seed awake --cam 977,100,-85 --look 960,15,-78 --warm 2 --seconds 0.2 --frames 2 --wall 100 --name first-line-bank-above-v2 --question 'Ravine width and ground return?'
timeout 180 npm run look -- --rail-seed q1-done --cam 950.6,27.63,-68.845 --look 937.5,26.38,-68.845 --warm 2 --seconds 0.2 --frames 2 --wall 100 --name first-line-course-approach --question 'Is the catalogue course present?'
timeout 180 npm run look -- --rail-seed q1-done --cam 944,95,-52 --look 937,23,-66 --warm 2 --seconds 0.2 --frames 2 --wall 100 --name first-line-course-above --question 'Course catch and haul access?'
timeout 180 npm run look -- --rail-seed awake --cam 979.97,31.26,-125.53 --look 997,30,-129 --warm 2 --seconds 0.2 --frames 2 --wall 100 --name first-line-t2-approach --question 'Gap on T2 haul?'
timeout 180 npm run look -- --rail-seed awake --cam 989,88,-127 --look 991,30,-128 --warm 2 --seconds 0.2 --frames 2 --wall 100 --name first-line-t2-above --question 'Continuous ground between sources and frame?'
```

## Validation and handoff

Scoped lint and typecheck passed; the read-only probe passed (zero existing progression assertion failures);
the standalone full level check passed; rail-map freshness/numbers passed with zero continuity failures.
`npm run checks-for` selected `npm run check`. The bounded full check passed lint and typecheck, then ended
with **exit 1**, reporting “Interrupted while running” during unit tests; no complete unit/registry/assets/build
verdict was produced. This is **not a green full check**. Its log is `/tmp/first-line-check.txt`.
After rebase, scoped lint, typecheck, the probe and all 16 standalone level-check reports passed again.

Worktree: `/Users/matiasfranco/.t3/worktrees/boogle/t3-5074810e-2ced13d5bb317771`.
Branch: `codex/first-line-crossing-probe`. One local research commit above that main; no push or ship.

No long playthrough. No runtime code shipped. The Boogler's copy is untouched; no suspect copy found. No ROM data.
**Not tested on a device.** Real-time movement/forgiveness and performance remain unverified.
