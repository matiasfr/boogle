# Running-side step 3

14 November 2026. Base: local `v45/rotunda`, `89569327e18c99561c41055c5915fe9ed4f68972`.
Scope: catalog and server check only. No push or ship. Serves DESIGN.md 11, Show, don't tell, and 7, Telegraph everything.

## Contract and integration boundary

`RailHalt.platforms` is now `[original side / +s, offset side / -s]`. Quarry, Far Head, Railhead and Ring Island swap
their tuples without moving any geometry. `haltPlatform(halt, way, head, end)` uses the original side for both ways
when `end` is true, and that side moves with the Ring Railhead. Greybox heads retain one platform for both ways.
The server derives `end` from the halt's stop index and its own line's `trainStops`. The request rule still refuses
an end's inward direction. The ring's directional track array becomes `[0, -400]` cm; physical rails do not move.

**This is a clean intermediate commit, not a playable right-hand-running release.** Step 4 explicitly ships with
step 3. Existing train laterals, lever ways, plaques, chains and signals still follow the old convention. Some lever
prompts can disappear or requests can be refused until step 4. The source builds, but that does not establish a
correct player-facing railway. No compatibility flag or second reset was added to mask the incomplete integration.

## Recommendations taken, for the owner to overrule

1. Question 1: right-hand running on every line, by swapping directional assignment, never mirroring geometry;
   share the existing v45 reset. This step implements the catalog half only.
2. Question 2: follow the proposed lever rule, including an end's east/original platform becoming onward when the
   line grows. This step supplies end-aware authority. Lever restaging and presentation remain step 4.
3. Question 3: recommendation (a), keep the Pier homeward-only and add its west platform after Q7. No Pier platform
   is added here; step 5 owns it. Its current `only: -1` and single-platform tuple remain intact.

## Departures and fixtures

- The plan calls the station request `rail.lever`; the actual op is `rail.call`. `rail.lever` is the Q3 device.
  Neither op's shape, train rules, blocks, timing, saves nor request bits changed.
- `src/sim/railway-train.ts`'s `LINE_HALTS` projection now reads tuple index 0 so its legacy original-platform
  coordinates stay identical. Leaving index 1 would move consumers such as the Works placement to the other side.
- `src/entities/railway/lever-place.ts` passes the same open-end flag as the server. This omitted caller is required
  to retain the existing prompt/server reach parity test; it changes no lever placement, ways, labels or signals.
- `test/railway-lines.test.ts`: original physical platform pins now check index 0; Railhead and island tuple
  expectations swap; the moving-head assertions check outbound and the explicit end override. No coordinates change.
- `test/railway-placement.test.ts`: the pinned Quarry south-side fixture asks +1 instead of -1, with the opposite
  request on the north side. Rider, malformed-input and distance checks are retained.
- `test/railway-jump.test.ts` keeps the same south-platform facing point at tuple index 0. Ring-layout buffer
  expectations swap indices because buffers follow track order; their coordinates are unchanged as a set.
- The generated halt-kit artifact changes only its catalog fingerprint. The prefab halt golden changes catalog
  tuple order and prompt targets under the new authority; all 284 mesh records, seven box-value groups, bodies,
  lever placements, plaques and platform data remain identical. The accepted-request fixture loses seven requests
  from old-way levers: this records the known step-4 integration gap, not a claim that those missing prompts are good.
- The rail-map artifact was regenerated for freshness only, without editing its step-6 generator. Its legacy
  `rail-network.ts` up/down index interpretation now produces spurious ring-up continuity findings. Step 6 must fix
  that consumer and regenerate the map; the additional diagnostic kinks are not changed physical geometry.
- No replay golden is repinned. The new running-side tests exercise both spatial validation and the existing request
  rule using played seeds. Far Head, Railhead and Ring Island retain their broad, overlapping reach circles: centre
  selection does not imply strict platform-side exclusion. Quarry centres are far enough apart to distinguish sides.
- `npm run inflight` failed before fetching because the sandbox could not open `FETCH_HEAD`; no retry was made
  because this task forbids external network use. Local worktree refs supplied the ownership check.
- The default review-stamp invocation also stopped at the sandbox's `FETCH_HEAD` write; the completed stamp uses
  `--no-fetch`. Required formatting was run on every changed file; the generated halt JSON was then regenerated
  into its compiler's canonical format so artifact freshness remains exact.
- `test:net` is deliberately left to the orchestrator, as explicitly requested.

## What steps 4 to 6 need

- **Step 4:** consume the new tuple and ring track order; put track 0 at lateral 0 and track 1 at the offset. Move
  all end easing/crossing logic to departing track 1, including the short turn after the Pier. Match main/second
  lever directions, chain states, live plaques, signals and physical end positions to the new authority. The
  `leverPlatform` helper already supplies the end override; `LINE_HALTS` still means original physical side, not
  homeward. Review `line2-path`, `train-view`, ring/railhead views, `halts-view`, halt attachments, kit board and
  voice; update the two view tests named in the plan. Inspect all three prescribed proof looks before shipping.
- **Step 5:** replace the Pier's two equal platforms with `[PIER_EAST, west platform]`, retain `only: -1`, and add
  the west platform, lever and crossing. The new `end` override already keeps homeward boarding on east until Q7;
  after Q7 it selects index 1. Prove level reach/gating and homeward asks there before review.
- **Step 6:** bots must select `haltPlatform` with current head and far-end status, not equate index 0 with west or
  index 1 with the original side. Audit level/rail-map/continuity/Home-bay tools and directional prose against the
  new mapping. Geometry names (`UP_LAT`, `UP_HALTS`, `RING_HALT.up/down`, `RING_JOINT_UP`) remain legacy names;
  their mechanical rename is a separate later commit. The future east bay's reach/routing needs its planned review.

## v45 scope so far

One shared save reset, still `WORLD_NS = 'v45'`: inherited rotunda steps 1a (table, stall, seam reach points, table
landing and 140-tick shunt rule) and 1b (the blockout); this step adds right-hand platform acceptance and ring-track
directional order. Running-side views/Pier/bots, turnouts and level-pacing's great tree are not added by this commit.
No migration, op/state shape change or additional namespace bump.

## Verification

Implementation commit: `ce0e4ea23d8348d4f75177e5e12c14a9fd542293`, tree
`42d322f49ce5652ff61ce2d6efa75617bb1f3ada`. The follow-up commit changes only this report and the plan checkbox.
Local logs and numbers: [verification manifest](../../.look/running-side-3/verification.json).

| Command | Timeout | Result |
| --- | --- | --- |
| Targeted running-side, lines, placement and existing lever parity tests | 180 s; 5 s per test | 28 passed, 0 failed; six new running-side tests |
| `npm run check` | 600 s | Exit 0; 2,053 passed, one existing TODO, zero failed; lint, typecheck, registry, level, assets, prefabs and build passed |
| `node dev/ship-check.ts` | 600 s | Exit 0; 164 affected files, 1,628 passed, one existing TODO, zero failed; 55 lint files |
| `npm run registry` | 180 s | Exit 0; 19 presence keys, nine message types, three ops, two states |
| `npm run loop -- run` before and after | 240 s each | Exit 0; four player counts and 20 order variants; whole output identical except wall-clock duration, including waits |
| `npm run level-check` | 180 s | Exit 0; 14 reports, 18 tracks, seven joins; zero timber/track, machine-clearance or grounding problems |
| `npm --prefix server test` | 300 s | 371 passed, zero failed |
| `npm run checkpoints` | 180 s | All 25 stages built through the host save path |

The one TODO is the existing `railway-install` longer-fleet wait bound (`b011e7`, 75%, 1,146 ticks against 1,050),
not a new failure. The first full check had six stale catalog/artifact expectations; the precise updates are listed
above and the repeated full check passed. The first targeted run had one overstrong cross-platform refusal
assertion at overlapping reach centres; it now tests distinct outer reach points without changing server reach.
No replay golden changed; the replay tests pass. Timings under load are not evidence.

**Independent review:** a fresh Astra high reviewer found no actionable step-3 defect. Its 30 targeted tests passed;
an independent temporary probe verified 110 server platform selections across seven played stages. This review
does not cover inherited rotunda work. Review-stamp output is preserved in
[step-3 output](../../.look/running-side-3/review-stamp.log) and
[combined-branch output](../../.look/running-side-3/review-stamp-main.log):

```text
review stamp 0f729781cf79 (14 files since v45/rotunda).
review stamp 28242de3f03a (35 files since origin/main).
```

The second stamp includes the inherited rotunda changes and is not a claim that this reviewer reviewed them.
The source was clean and unchanged throughout all broker runs; their outer manifests identify the worker commit
above and launcher harness `d87c05719`. Some inner look/scenario verdicts print the harness commit, so use the outer
manifest for worker provenance.

**Browser evidence (all through the supplied broker):**

- [Two-peer T2 manifest](../../.look/evidence/1794674475525-79452/evidence.json): exit 0. Both peers completed T2;
  hashes matched at 224 sampled server steps, no missed expected beat or graphics error. Opened `end-still.png` and
  `p2-end-still.png`: both players beside the completed T2 track and box. This is an opening segment, not a railway
  ride. The report flags peak warp-clock deficits of 4.035 and 11.279 game seconds (world-tick deficit 0.133 seconds
  each); completion/convergence passed, timing and smoothness are not established.
- [Quarry manifest](../../.look/evidence/1794674833802-83448/evidence.json): exit 0 using `--real`, a `trains-on`
  seed and a fixed overhead camera. Opened `quarry-step3-still.png` and `quarry-step3-motion.png`. Against the
  placement question, both staggered platforms, roofs and the plank crossing remain present; a train stands on
  the south track. This wide frame does not resolve lever text or verify pulling one, and the stationary two-second
  sheet does not establish train direction or feel. Mesh and collider equality supplies the exact placement check.
- [First look failure](../../.look/evidence/1794674427106-76644/evidence.json): the older launcher rejects
  `--clock-url` for solo warp before rendering. Retried with its supported `--real`; no harness bypass or edit.
- [World-inputs failure](../../.look/evidence/1794674475558-79456/evidence.json): one failed scenario, zero graphics
  errors. It times out waiting for `window.boogle.land.layout.trees`, before any parity assertions. Verified with
  `git show d87c05719:dev/scenarios/world-inputs.ts`: that trusted harness still requires the retired gifts layout;
  this checkout's existing scenario already uses the empty client registry. Opened `inputs-final-still.png`, which
  shows a rendered player by the Village platform. The orchestrator must restart the broker from reviewed current
  code and rerun `world-inputs`; it remains unverified here. No unrelated scenario code was changed.

No push or ship. `test:net` and the complete Village–Pier return ride remain for the orchestrator's combined
checkpoint. Step 4's three action proofs and step 5's west-Pier level/gating check remain with their owners.
Not tested on a device. Real-time feel and smoothness are unverified.
