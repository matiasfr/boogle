# Independent review of f83e49fa8

**Fix first.** Reviewed `f83e49fa8` against `a767f2eb6`, after detaching at the requested head.
Read both requested plans, root/nested instructions and applicable contracts. No production edits, push or ship.
Review additions live on `review/heavy-load-f83e49fa8`.

## Findings

### P2 — Accepted overflow cargo disappears from the renderer

**Location:** `src/sim/railway-sys-line1.ts:183-185`.

Removing the pile ceiling allows more cargo than the existing client buffers can display. The three pile
batches in `src/entities/railway/sources.ts:253-274` still allocate `128 * 8` instances. Logs pass through
`commitPieces`, which clamps the draw to that capacity; save validation now accepts the larger state.

Reproduced using 129 eight-log piles built through accepted chop/drop rules, serialized through the real
host, then opened as a new WebGPU client. The client had **129 piles / 1,032 logs**, but the actual visible
`place kit log` mesh drew **1,024 / capacity 1,024**. The last eight logs have no rendered representation.
No page, console or graphics error reported this loss. Reload preserves it. This is not a speculative
unbounded-growth complaint: the first overflow is reproduced. The material remains in authoritative state.

Failing repro assertion: **`review: every accepted log remains visible after reload`**.

```sh
node --import ./test/helpers/rail-no-audit.ts dev/look/review-heavy-load-piles.ts
```

It fails with `1024 !== 1032`. The repro uses rule-generated seed state, not a human-paced harvesting run.
Recoverable storage and render capacity must agree without reintroducing the heavy-carrier trap.

### P2 — Q2's moved full log rack intersects the running track

**Location:** `src/entities/railway/line2-view.ts:297-298`.

Moving the rack ten metres backward along the frame tangent places it across the existing curved running
track. In `q1-done`, wait for the cart to unload all 24 logs: the running rail crosses the upper portion of
the log stack/rack at approximately **(950.759, 17.521, -6.411)** (rack bearer position, metres).
The tangent offset alone does not preserve clearance around this curve.

Precise repro: **`review-heavy-load-q2.ts`**, with the full stack settled before capture:

```sh
npm run look -- --real --rail-seed q1-done \
  --eval dev/look/evals/review-heavy-load-q2.ts \
  --cam 945,22,-12 --look 951,18.5,-6 --warm 2 --hud \
  --name review-heavy-q2-final
```

Inspected still: `.look/review-heavy-q2-final-still.png`.
A separate loaded walk from this rack to the frame succeeds without jumping. The finding is the actual
track/prop intersection, not a claim that the rack's collider blocks the train or the player.

### P3 — Q5's rail shelf overlaps its log rack and sign

**Location:** `src/entities/railway/shelf-view.ts:106-107`.

The shelf now shares the rack's longitudinal position, only 1.5 m to its side. Its 3.4 m transverse plank
and the rack's 1.6 m transverse footprint overlap by roughly **1 m**. The live view confirms the shelf
extending into the logs/rack and the log sign in front of the rail pile. Centers are
**(1158.399, -22.696)** for logs and **(1157.561, -23.941)** for rails in world x/z metres.
Both pickup targets remain selectable from their respective centers; this is not a progression softlock.

Precise repro: **`review-heavy-load-placement.ts`**.

```sh
npm run look -- --real --rail-seed q5-shelved \
  --eval dev/look/evals/review-heavy-load-placement.ts \
  --cam 1151.4,32.4,-12.7 --look 1158.4,25,-22.7 --warm 2 --hud \
  --name review-heavy-q5-framed
```

Inspected still: `.look/review-heavy-q5-framed-still.png`. Both captures used WebGPU with advancing frames
and no page/console/graphics errors. The initial unframed Q5 capture was rejected as visual evidence.

## Train race, reload and late join

No additional reproduced train defect.

- The unchanged deliberate-overfill regression passes at **3,615 ticks**, idle samples
  **1,129 / 560 / 363 / 363**, preserving the 3,700 bound.
- `review-heavy-load-arrival.test.ts` sweeps **966 fixture combinations**: every integer extension offset
  **-80 through +80 ticks** relative to arrival, at all three leg-owned stubs, with one and two loaded
  trains. It checks row validity and spacing every tick, JSON round trips immediately around arrival,
  eventual arrival at the new head, and no homeward detour if extension occurs before departure.
  After the ordinary dwell has expired, an already-departed train may legitimately make its circuit.
- **65 real-rule cases** delay the second frame's mixed-overfill funding by 0–64 ticks. All complete
  High Gorge. They reload during laying and immediately before the second lay/arrival boundary, then
  initialize a late client's mirror through real replication packets and compare every replicated row.
- The fixture's extension setup repeats the existing standing-stub redirect from `lay()`; its moving
  arrivals, block rules and replans execute production `trainStepLine`. The real-route sweep separately
  exercises production `lay()` through accepted commands.

```sh
node --import ./test/helpers/rail-no-audit.ts --test test/review-heavy-load-arrival.test.ts
```

All **68 tests** pass, including the pile stress case below. Early fixture-construction mistakes (an asleep
clock and a train stood at a closed halt) were corrected; they are not product findings.

## Other checks and limits

- **105 existing tests passed:** heavy-load, both earlier review suites, route rules, trains, halt golden.
- **42 existing tests passed:** server steel-host timing, world-host trace, railway replication,
  read-session and set-down.
- **2,048 one-log piles:** conservation, JSON save/reload and complete late-client replication pass.
  Snapshot **49,229 bytes**; initial transfer **168,781 JSON characters** across **15 packets**, largest
  **11,994**. This checks state integrity and packet chunking, not frame-rate or long-session performance.
  Nearby piles can remain beyond their recovery age; there is no new count ceiling. No separate corruption
  or transport failure was reproduced at this measured size.
- New speed math uses only fixed arithmetic and min/max over integer cargo. Every packed/unpacked overload
  count keeps its speed through save/session renewal; matching prediction and replay tests pass.
- **Halt snapshot:** exactly `/states/6/halts/2/calling` changes false → true: `stack-3`, Village on line 2.
  At the new seed tick **14,760**, train slot 2 stands at Village on track 0 (arrived **14,739**), satisfying
  the existing signal predicate. The old seed sampled tick **14,758** with that train still running home.
  Loading the old train implementation read-only with the new seed inputs produces the same new train rows:
  the flag follows the comfortable-load seed schedule, not the arrival-rule fix. No geometry snapshot changed.
- `npm run level-check` passed (15 reports); these checks did not catch the two dynamic rack intersections.
  Both rack views already lack their own static colliders/little-guy avoidance footprints; this change did
  not add or relocate such registrations. No new footprint/collider failure is claimed without a repro.
- The Q2 real-input walk carried 12 logs uphill to unloading reach without jumping. Q5's two interaction
  targets were checked at runtime. These do not establish every approach or moving-train clearance.
- `npm run loop -- run`, scoped Prettier/lint, typecheck and whitespace checks passed.
- No fresh full-suite, live two-client reload, device or human-feel claim. The train reload/late-join proof
  is at the state/replication layer. No new UI scenario was added; committed browser files are review repros.
