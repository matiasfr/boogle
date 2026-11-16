# Independent review of 526db96dd

**Fix first.** Reviewed `526db96dd` against `0dfc13daa`, after the requested detached checkout.
Read AGENTS.md, the requested contracts/nested instructions and both prior reports. No production changes,
no push or ship. Review tests live on `review/heavy-load-526db96dd`.

## Findings

### P2 — Overflow can create a checkpoint that cannot reload

**Location: `src/sim/railway-sys-line1.ts:197`.**

Rail recovery adds a whole pile to `Forge.rack` without respecting the persisted domain:
`src/sim/railway-check.ts:255` accepts at most 4,096. Starting with a valid, conserved, reloadable world
containing 1,024 loose rails, a forge rack of 4,096 and one carried rail, an in-range one-rail drop is accepted.
It recovers eight rails, leaving the rack at **4,104**. The resulting snapshot fails actual JSON reload with
**`railway: line2 bounds`**. The units still exist in memory; the demonstrated failure is reloadability,
not arithmetic disappearance or a claimed observed production outage.

Failing test: **`review: overflow rail drop must leave the forge within the checkpoint domain`**
in `test/review-heavy-load-fix2.test.ts:39`. It verifies the initial invariant/round trip, server reach validation,
accepted result, final rack count and rejected reload before the failing safety assertion.

The boundary fixture is reachable, although far outside a normal small play session. Separately executed:
start at `q1-done`, take the pack, create 214 accounts, advance 150 production ticks per account and take
16 then eight forge rails on each. The invariant passes with all 214 holding 24. Drop eight rails per action
from those accounts: drop **641** leaves 128 loose piles and **4,104** in the forge rack, failing the invariant.
This requires many accumulated account inventories; it is not a one-to-three-player short-session claim.
The old timed recovery already shares this destination weakness; this diff introduces it into ordinary Drop,
including while players are nearby, so copying the old recovery transfer does not make the new path safe.

### P2 — Home rack/drop cycling can erase another player's active work-site stock

**Location: `src/sim/railway-sys-line1.ts:190–201` (selection at 195).**

With 1,024 loose logs, a player at a distant work site takes two from the oldest eight-log pile, leaving six.
Another player at Home takes eight recovery-rack logs and drops them locally. Overflow removes that just-used
six-log pile and sends it to Home: the victim's previously valid pickup target is now invalid. Repeating
rack-take/drop at Home removes **all 128 original remote piles**, without harvesting or visiting them.
All quantities remain conserved and the eight logs already on the victim's back remain there.

Failing test: **`review: remote rack/drop spam must not recycle a pile being actively collected`**
in `test/review-heavy-load-fix2.test.ts:55`. It demonstrates the in-range drop, target invalidation,
complete remote-stock recycling and conservation before failing on the victim pile's disappearance.
The initial stock is a conserved boundary fixture; the exploit itself uses accepted rules. No cadence bypass
is required: the same sequence can be spaced at the ordinary action cadence.

This is a **consequence of the documented overflow policy**, not a claim that the author accidentally omitted
its promised proximity check. That policy intentionally bypasses normal recovery's 12 m presence protection
and abandonment age (`server/src/host/host-supply.ts`, `railway-supply.ts`). The review objection is that a
renderer capacity repair also gives any player remote control over stock somebody is actively using.

## Other pile questions

- Logs and stone go to Home's recovery rack (`Rail.rack`, `Rail.stoneRack`); rails go to `Forge.rack`;
  footings go to `Works.rack`. No loss or duplication reproduced within the valid destination bounds.
- Current architecture is server-authoritative, not peer tick lockstep. Server replay and shared prediction
  agree in the exercised cases. New passing test **`review: interleaved cargo caps and oldest-first recovery
  survive reload`** fills logs, stone and rails simultaneously: each remains capped independently and a drop
  leaves both other kinds unchanged. Replay after a JSON reload produces the same hash and oldest victim.
- New passing test **`review: successive predictions recover temporary piles in server creation order`**
  runs 140 predicted take/drop pairs, exhausting the 128 confirmed piles and then recovering negative
  temporary ids. Server and prediction retain identical cargo rows, inventories and recovery counts.
- "Oldest" means entity creation order, not least recently used; partial collection does not protect a pile.
  The existing top-up tests protect the confirmed pile receiving that drop.
- Loose logs/rails/stone have no support colliders in `sources.ts`; removing them does not delete a physical
  platform somebody can stand on. A player standing at their position still loses the local material/prompt.
  Completed pickups remain on the carrier; a later take of a recovered id is refused.
- The current production railway bot does not target loose pile ids. No bot-specific hang was reproduced;
  a consumer retaining such an id would encounter the same failed target validation as the second repro.
- No old-build compatibility or migration tests were added. The existing unshipped v48 break is documented.

## Racks and integration geometry

`npm run level-check` **passed, 15 reports**, with existing report-only diagnostics. Dynamic rack geometry
is not fully represented by that checker, so targeted browser repros were also run through the look workflow.

- **Q2:** full 24-log rack at `(958.1655, 17.3447, -11.4252)`, nearest cart-track centreline **5.7345 m**,
  horizontal haul exactly **10 m**. Inspected `.look/review-526-q2-real-still.png`: rack stands clear beyond
  the curved tracks, with open ground between it and the running rail. WebGPU, advancing frames, no
  page/console/graphics errors. Passed under load; no timing or feel claim.
- **Q5:** log rack `(1158.3988, 24.3671, -22.6957)`, rail shelf
  `(1156.1580, 23.4988, -26.0104)`, horizontal separation approximately **4 m**. Both centre-position pickup
  assertions select their distinct `railway-depot-logs` / `railway-depot-rails` targets. Inspected
  `.look/review-526-q5-still.png`: separate full stacks and signs. WebGPU, advancing frames, no errors.
- First Q2 attempt used accelerated warm-up and failed waiting for 24 cart logs. The required `--real`
  rerun passed. No product finding is inferred from that first harness timeout.

Fetched main and inspected exact integration refs: **`origin/main=babe209207`** (forge hand-off),
**`t3/glider-first-sea-gate=df97aebd89`**, and the requested visual commit **`2576bf70e`**.
Their relevant crane/rack anchors, gate geometry and sea-switch coordinates were read from source.
A source-based horizontal bounding-circle calculation covers each moved rack/shelf **and its sign** with a
3.5 m radius; the crane's entire rotating jib is bounded by 17.1 m, the new rack board by 0.8 m, the sea-jamb
landing/collar/cradle/ring by 3.5 m, and the gate slab/jambs/headstock by 7.3 m.

All pairwise gaps are positive. The closest relevant bounds are:

- Q2 rack/sign to main's entire crane sweep: **11.079 m** clear.
- Q2 rack/sign to main's new rack board: **41.516 m** clear.
- Q5 logs/sign to sea gate slab/jambs/headstock: **12.212 m** clear.
- Q5 rails/sign to the new far-jamb assembly: **13.599 m** clear.

Thus those pieces do not geometrically intersect the moved racks at the examined revisions. This is conservative
source geometry plus the reviewed-head rack captures, **not a merged-branch browser or playthrough claim**.
No merge or branch modifications were made to the integration refs.

## Commands and results

Run with Node 26.13.0 and checkout-local `npm ci` dependencies.

```sh
node --import ./test/helpers/rail-no-audit.ts --test test/review-heavy-load-fix2.test.ts
# 2 intentional failures above; 2 passing ordering/mixed-kind tests

node --import ./test/helpers/rail-no-audit.ts --test \
  test/railway-heavy-load.test.ts test/review-heavy-load-arrival.test.ts
# 81 passed: includes 966 arrival fixtures, 65 delayed-funding cases and 2,048-drop replication stress

node --import ./test/helpers/rail-no-audit.ts --test \
  test/railway-supply.test.ts test/railway-replicate.test.ts \
  test/railway-set-down.test.ts test/review-heavy-load-route.test.ts
# 27 passed; overfill route still completes at tick 3,615

npm run level-check
npm run loop -- run
node --import ./test/helpers/rail-no-audit.ts dev/look/review-heavy-load-piles.ts
# Pass: 128 piles, 1,024 logs drawn / 1,024 capacity, eight recovered, total 1,032; no graphics errors

npm run look -- --real --rail-seed q1-done \
  --eval dev/look/evals/review-heavy-load-q2.ts --cam 943,27,15 --look 950,18,1 \
  --warm 2 --hud --name review-526-q2-real
npm run look -- --real --rail-seed q5-shelved \
  --eval dev/look/evals/review-heavy-load-placement.ts \
  --cam 1151.4,32.4,-12.7 --look 1158.4,25,-22.7 --warm 2 --hud --name review-526-q5

npm run lint -- test/review-heavy-load-fix2.test.ts
npm run typecheck
# Pass; lint's existing conservative dynamic-import notices remain informational
```

Scoped Prettier and whitespace checks pass. No fresh full suite, live two-client run, device performance or
human-feel claim. The mixed-kind, replay, prediction and late-client tests establish rule/replication behavior,
not network timing. Production files and Boogler copy remain unchanged.
