# Review: six railway merges of 9 November 2026

Independent read-only review against origin/main at b92ac15e. Cut short by a restart: no unit tests were run, and
server/src/host/world-host.ts `requests.active` semantics were not traced. Line numbers are origin/main.

## Coverage

| Commit | Status | Verdict |
| --- | --- | --- |
| 578d8d3d line 2 sweeps while the wagon fetches | reviewed | findings 3, 6 (low) |
| 0d3f4190 forge rack gives only what the cradle needs | reviewed | finding 2 |
| a67afce9 turntable holds while the wagon rolls out | reviewed | finding 5 (low, plausible) |
| 9efed0ad a leaver's footing returns to the Works rack | partly reviewed (sim and predict read; host maintenance read but `requests.active` not traced; host test not run) | findings 1, 4 |
| 2afdbb86 one RAIL_STONE for the conservation checks | reviewed | finding 7 (low, pre-existing) |
| 6a41ab2b pure town facts | reviewed | clean |

No determinism defect found: no Math.random, Date, native trig or unordered iteration in the touched sim code.
`railFootHolders` iterates `w.each`, but it is host-only maintenance whose order does not change the outcome (each
release only increments `Works.rack`). No wire or save shape changed in any of the six commits, so no WORLD_NS bump
was owed (still v22).

## Findings, most severe first

### 1. A rejoining footing carrier can lose the footing if the release epoch is re-read rather than remembered (9efed0ad)

- Where: server/src/host/world-host.ts:407-425 (`maintainFeet`), src/sim/railway-systems.ts:1511-1525.
- Defect: `maintainFeet` passes the account's *current* epoch from `api.footHolders()` to `footRelease`, so the epoch
  guard in the sim never refuses anything: the only protection for a carrier who came back is `requests.active(pid)`.
  The doc comment ("the session epoch the host saw leave ... never once they are back in a new session") promises
  more than the code does.
- Scenario: B carries a footing, leaves, and reconnects after the grace has nearly run out. If B's new session has
  bumped the account epoch (rail.wake) but `requests.active('b')` is still false at the next maintenance (for
  example, no request in flight yet), the footing is taken off B's back and put on the Works rack while B is present.
  No softlock (it goes back on the rack), but the player loses what they were carrying.
- Confidence: plausible. It depends on when `requests.active` turns true for a new session, which I did not trace.
- Smallest fix: record the epoch in `footAway` when the absence starts (`footAway.set(pid, { at, epoch })`) and pass
  that remembered epoch to `api.footRelease`, so a new session's epoch makes the release a no-op.
- Test that should exist: a host test where the carrier reconnects with a new epoch after the grace starts but
  before it ends and sends no request, and still holds the footing after the grace.

### 2. The forge-rack cap lifts once the cradle is fitted and counts only the actor's own rails (0d3f4190)

- Where: src/sim/railway-systems.ts:633-648 (`forgeTake`).
- Defect: the cap applies only while `h.fitted < 0`. After fitting, nothing uses rails any more, but `rail.forgeTake`
  again gives a full back (16), which blocks Shoulder a footing (it needs an empty back): the same wall the commit
  removed, moved to after the fit. The cap also subtracts only `a.rails`, so two players can each take 8, or one
  player can drop a pile and take again.
- Scenario: Q6 laid, cradle fitted, the forge keeps pouring (`layLine2` pours while `f.lit >= 0` up to rackMax). A
  player presses Take rails at the forge on the way past, gets 16, and cannot take a footing at the pier until they
  drop all 16. Whether the view still offers Take rails after the fit was not checked.
- Confidence: confirmed by reading for the sim rule; the player-facing impact is plausible (depends on the offer).
- Smallest fix: when `qActive(w) < 0`, use `room = h.fitted >= 0 ? 0 : Math.min(room, WORKS.cradleRails -
  h.cradleRails - a.rails)`. Optionally count all carried rails, not just the actor's.
- Test that should exist: "after the cradle is fitted the forge rack gives nothing" in test/railway-works.test.ts.

### 3. `fetching` stays true when there is nothing the wagon can fetch (578d8d3d)

- Where: src/sim/railway-systems.ts:1134-1141.
- Defect: `pierOwed(w, r.foot) > 0` counts footings on players' backs, in ground piles, and not yet cast, so line 2
  ignores direct calls (sweeps instead) even when the Works rack is empty and stays empty.
- Scenario: all 16 cast, the last pier footing sits in a pile or on a leaver's back during the grace: every call on
  line 2 is served only on the sweep, slower than before. Not a softlock: the call still stands and is served.
- Confidence: confirmed by reading; severity low.
- Smallest fix: `fetching = slot === 1 && r.wagon && pierOwed(w, r.foot) > 0 && (works.rack > 0 || works.poured <
  WORKS.total)`.

### 4. A released footing can push the Works rack over rackCap (9efed0ad)

- Where: src/sim/railway-systems.ts:1511-1520.
- Defect: `footRelease` increments `Works.rack` with no cap; only `worksTick` (line 1219) checks `rackCap`. The host
  test itself notes "it may run over six". No invariant fails, and the kiln waits, so this is not a softlock.
- Scenario: rack at 6 when a leaver's footing is released: rack 7. Any view that draws a fixed six rack slots shows
  six. Not checked in the roundhouse view.
- Confidence: confirmed by reading (overflow); visual impact plausible.
- Smallest fix: none needed for correctness; check the rack view draws `rack` beyond six, or document the overflow at
  WORKS.rackCap.

### 5. The table can be held indefinitely if the wagon never couples (a67afce9)

- Where: src/sim/railway-systems.ts:838-852 (`turn`), 1095-1103 (coupling).
- Defect: with `ready >= 0` and no wagon, every turn is refused, and nothing else clears `ready`. Coupling needs line
  2 standing at stop 0 with trains on, which `trainStep` holds for. I found no state where trains are off once the
  shed is fitted, so this is only a note.
- Confidence: plausible, low.
- Smallest fix: none unless a path with `rail.trains < 0` after the fit exists.

### 6. Orphaned doc comment (578d8d3d)

- Where: src/sim/railway-systems.ts:1044-1046. The `wagonArrives` comment now sits above `pierOwed`'s. Cosmetic: move
  it below `pierOwed`.

### 7. The load-row stone check omits renewal (2afdbb86, pre-existing)

- Where: dev/peer-test/ws-railway.ts:517. `counts.stone!.total === RAIL_STONE` without `+ counts.stone.produced`,
  unlike the bot and validateRailLine. Fine while the load row runs shorter than a stone regrow; it would flake if it
  ever runs longer. Smallest fix: add `+ counts.stone!.produced`.

## Clean

- 6a41ab2b: `townReadOf` matches `townRead` (tested); `head`/`pier` by count is correct because Q stations complete in
  order (`qActive` takes the first incomplete one). No consumers yet.
- 2afdbb86: `RAIL_STONE` equals the seed (`railway-world.ts:249` spawns rocks from `r.initial`).
