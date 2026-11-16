# First-town S1/V1: four rider places until coach A

16 November 2026. Branch `t3/first-town-rider-places`, rebased from `df17efe4c` onto `origin/main`
`0acc7d9e5` (the three prior commits became `41ee4ed4c`, `38fe8b3c2`, `22911abe3`). No push or ship.
This report supersedes the branch's earlier eight-place reports and failed count-readability trial.

## Rule, economy and world identity

The orchestrator's ruling is applied: today's car carries and draws **four** NPC riders. Eight arrive with
[coach A and its halt rework](../decisions-rail.md#d-2026-11-16-rider-coach-a-and-rework);
`docs/plans/rider-coach.md` did not exist in the rebased checkout, so the decision is the link target.
`TRADE.riderPlaces` remains separate from the four player seats, with every rule/view/model reader on it.
Plot 3 keeps base 800: **1,600** after two buys at 50%, **2,550** for all three purchases.

The boarding test is parameterised: `places + 1` waiting, exactly `places` board, one stays, a full train boards
nobody. The over-cap refusal, saved above-cap box, historical paid-price validity, price and capacity-never-falls
assertions remain. The q6 test now asserts the exact vector **[36, 54, 72, 72]** fares/minute for two, three, four,
five buildings, after a five-minute demand warm-up and over ten minutes. At four rider places the third added
house is capacity-limited; it does not raise landed fares beyond 72/minute. No assertion was removed or bypassed.
The existing Six-fit-out removal remains; both economy pages were regenerated with `riders.perCar = 4`.

**No world bump or fixture re-pin.** These four files are byte-identical to `origin/main` at `0acc7d9e5`:

- `src/world/namespace.ts` (`v54`, no added history line).
- `test/fixtures/railway-golden.json`.
- `test/railway-cart.test.ts` (including its original namespace assertion).
- `server/test/fixtures/world-host-trace.jsonl.gz`.

The trace test's added historical bump comment was also removed by restoring main's file. All **49** golden
stages, including the reviewer's **29** later stages, pass at the stage and after 1,200 ticks. The complete
8,600-record host trace passes unchanged. [Blob identities](../../.look/first-town-four/fixture-identity.json)
record the comparison against the fetched main tip. L1 takes the next free namespace after v54.
The town heading and its three links are back to v54; no old v55 town anchor remains in Markdown.

## Four visible places

Only the placement table and its comments changed in the runtime rider view in this rework. The previous
upright pose and update-after-car ordering remain. Four figures are drawn for four riders, with no counter,
new collider, scale change or car/seat/pet alteration. Rider capacity is never inferred from player seats.

Car-local metres, fill order (NPC facing convention: yaw 0 faces +z):

| Boards | x | z | Yaw | Place |
| --- | ---: | ---: | ---: | --- |
| 1 | −0.78 | −1.20 | −60° | Outer roomy end |
| 2 | +0.78 | +1.20 | +120° | Opposite outer end |
| 3 | −0.77 | −1.02 | −120° | Second rider at first end |
| 4 | +0.77 | +1.02 | +60° | Second rider at opposite end |

The first two alternate ends. Three adds a second head to one pair; four completes the other. The slight
outward splay clears hands that collided at a straight sideways stance. Bodies and hats still overlap within
each pair: this is temporary art, but I can count **two round hats per group, four total**, rather than reading
four colour bands as one head. The back faces are partly occluded; these are not four separated body silhouettes.

### Clearance method and limits

The diagnostic transforms actual rendered rider coat/hat, head and limb triangles into the car frame. It checks
recipe boxes for side/end panels, rails, posts, conservative knob bounds, bench seat/back/arms. It also reads the
visible posed Buddy meshes (including skinned vertices), maps the confirmed seat-1 pose to all four seat anchors,
and tests rider triangles against them, including arms and legs. The pet run does the same with the actual pet
mesh at all four perches. Invisible children are excluded. This checks the ordinary seated pose and pet in these
samples, not every possible costume or an exhaustive animation envelope.

Final `pet-splayed`, `count-4` and `seated` runs: **24 sampled poses, zero reported intersections**. The seated
run includes all four mapped player poses; the pet run includes those poses and all four mapped pet spots.
The complete rider bounds are approximately |x| ≤ 1.078 and |z| ≤ 1.486 (hats/hands included), inside the deck and
end fittings. [Probe](../../.look/first-town-four/clearance.ts),
[all final samples](../../.look/first-town-four/clearance-summary.json).

Two initial layouts failed, then one bounded snapshot search guided the final placement. The search tested
3,780 outward-facing candidates and found 150 with no contact in that single snapshot; it was a candidate
selector, not acceptance. The final candidate was then rendered and sampled as above. Its source and inputs
are retained in `.look/first-town-four/search.ts`, `geometry.json`, `safe-candidates.json` and `search.log`.

## Stills opened

All artifacts are in this checkout's `.look/first-town-four/`. The 1/2/4 views use the same fixed car-relative
camera: eye (−3.6, 8.5, 3.8), target (0, 1.1, 0), FOV 42, 960×600. The moving car changes the background.
These are local dressings of exactly the logged count over **three authoritative riders** in the seed, not
mirror edits; real four-place boarding/refusal is proved in the rule test. The pet is granted locally.

| Opened still | Observation |
| --- | --- |
| [count-1-still.png](../../.look/first-town-four/count-1-still.png) | One orange rider at the far roomy end, other end empty: one head plainly countable. |
| [count-2-still.png](../../.look/first-town-four/count-2-still.png) | Orange and purple riders at opposite ends: two heads plainly countable. |
| [count-4-still.png](../../.look/first-town-four/count-4-still.png) | Orange/red pair and blue/purple pair: two overlapping round hats per end, four heads countable, visibly fuller than two. Bodies still overlap. |
| [seated-still.png](../../.look/first-town-four/seated-still.png) | Seated red Buddy beside the blue/purple pair, all four rider heads visible. No player contact in the sampled posed-geometry check. |
| [pet-splayed-still.png](../../.look/first-town-four/pet-splayed-still.png) | Cyan seated Buddy and orange pet beside the blue/purple pair; all four hats visible. Pet and all mapped perches are clear in the probe. |
| [cars-final-still.png](../../.look/first-town-four/cars-final-still.png) | Actual Cars UI: numeric title and description, Seats 4 and Riders 4. |

Also opened the [deck-walk motion sheet](../../.look/first-town-four/walk-motion.png), which shows blue Buddy
starting at one end and finishing at the other while the riders remain with the car. The action log records
local z −1.5 → +1.574, still aboard, `figureCrossings: []` with the existing 0.55 m root-distance probe.
The walk uses the existing non-solid bench; this does not claim a new physical aisle through its geometry.
[Real-time recording](../../.look/first-town-four/walk-realtime.webm) retained, not claimed as watched in real time.
No smoothness or device-performance claim follows from these stills or the completed-frame health check.

## Copy and documentation

Player-seat count comes from the `railway.car-bench` prefab's attachment data; rider count comes from
`TRADE.riderPlaces`. New placeholders, shown now as:

- `4 seats, 4 riders`.
- `The knifeboard passenger car: 4 seats for players, places for 4 riders.`
- `Riders` (the separate stat row).

The Boogler's copy is untouched. S1/V1 are ticked with the four-place as-built note, future coach link, current
fare result and v54 identity. The owning town section and garage tile table match. Earlier rejected reports are
explicitly marked historical. No L1, L2, V2, A or R implementation; `till-view.ts` remains untouched.

## Checks and failures

Node 26.13.0. Paths below are relative to `.look/first-town-four/`.

| Command/check | Result |
| --- | --- |
| `git fetch origin && git rebase origin/main` | PASS, clean rebase onto `0acc7d9e5`. |
| `npm run map -- --kind feature-fix`; `npm run inflight`; `npm run checks-for` | PASS discovery. Selector includes the historical whole-branch diff plus restorations; there is no remaining server/world/fixture diff from main. |
| `node --import ./test/helpers/rail-no-audit.ts --test test/railway-golden-*.test.ts` | **107 PASS**, 0 failures/skips/todos; 49 stages and shard coverage. `goldens.log`. |
| `node --import ./test/helpers/rail-no-audit.ts --test --test-timeout=120000 server/test/world-host-trace.test.ts` | **1 PASS**, full ordered trace unchanged. `host-trace.log`. |
| `node --import ./test/helpers/rail-no-audit.ts --test test/railway-trade.test.ts test/railway-cart.test.ts test/town-buy-review.test.ts` | **69 PASS**, 0 failures/skips/todos. `rules.log`. |
| `node dev/economy/build-trade-page.ts`; `node dev/economy/build-prototype.ts` | PASS, both pages regenerated from four-place model. `build-trade.log`, `build-prototype.log`. |
| `node --import ./test/helpers/rail-no-audit.ts --test test/economy*.test.ts` | **50 PASS**, 0 failures/skips/todos, including monotonic capacity and generated-page hashes. `economy.log`. |
| `npm run loop -- run` | PASS, exit 0. `loop.log`. |
| `npx prettier --write` on five edited TS files | PASS. `format.log`. |
| Scoped `npm run lint --` on the same five files | PASS, 0 problems. `lint.log`. |
| `npm run typecheck` | PASS both initially and after edits. `types-initial.log`, `types.log`. |
| Final 1/2/4, seated, pet, Cars and deck-walk captures | PASS WebGPU, advancing completed frames, no page/console/graphics errors; opened and judged above. |
| Rendered-geometry aggregate | PASS, all 24 final samples have no hits; `clearance-summary.json`. |
| Fixture identity and old-anchor search | PASS: all four fixture/assertion files identical to main; no old town v55 anchor. |
| `git diff --check` | PASS before commit. |
| `node dev/ship-check.ts` | Final gate on the committed tip; exact result in the handoff and `ship-check.log`. |

Capture commands are preserved in full in the corresponding logs. The two rejected placement runs passed
capture health but failed geometry acceptance. Their complete contact-category sets are:

```text
pet.log:
["seated player all four spots:328","seated player all four spots:56","pet:700"]

pet-spaced.log:
["waist rail-:700:rider2","seated player all four spots:56:rider2","waist rail+:700:rider3","seated player all four spots:56:rider3","seated player all four spots:328:rider2","seated player all four spots:328:rider3"]
```

328 is coat/hat, 700 head, 56 limb. The first player probe included hidden children; the final probe uses
`traverseVisible`. The second rejection and the final acceptance use visible geometry. The first failure
remains rejected regardless. `geometry-export` also passed capture health but was only the search's input.
One Cars invocation had the wrong seed/completion flag and was deliberately stopped, then rerun correctly
with `wagon-on` and `window.__placeDone`; no product code changed to accommodate it. Full termination message:

```text
SIGINT: the run was stopped from outside; its verdict is "killed"
```

Initial routing discovery rejected `npm run map -- --kind sim`:

```text
Unknown task kind: sim; npm run map -- --kind lists them
```

It was followed by route discovery and the applicable existing-feature/rule contracts. There were no failing
unit, golden, host-trace, lint or type checks in this rework. No fixture recording flags were used.
