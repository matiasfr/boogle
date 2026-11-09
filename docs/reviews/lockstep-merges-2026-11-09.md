# Review: six railway merges of 9 November 2026

Independent review of six commits that merged with only their author's checks. A first pass read them at b92ac15e but
was cut short by a restart; this pass completed it and re-checked every finding against origin/main at c481d37f. The
reviewed code (src/, server/, the touched dev/ and test/ files) is identical in both, so line numbers hold for either.

What was run (Node 26.13.0; the default shell node is 24, so `~/.nvm/versions/node/v26.13.0/bin` went first on PATH),
from the main checkout at origin/main plus one docs-only commit, with no file changed there:

| Command | Result |
| --- | --- |
| `node --test --test-timeout=5000 'test/**/*.test.ts'` (= `npm run test:unit`) | 598 pass, 0 fail |
| `cd server && node --test test/*.test.ts` (= `npm --prefix server test`) | 111 pass, 0 fail |
| `cd server && node --test test/railway-works-host.test.ts test/railway-line-host.test.ts test/railway-beam-absence.test.ts test/railway-host.test.ts` | 19 pass, 0 fail |
| `node --test` on the nine railway unit files (works, line2, line, boiler, train, railway, replicate, adapter, works-layout) | 106 pass, 0 fail |
| A three-case probe of the footing grace on the real host (scratch file, same harness as `railway-works-host.test.ts`, not committed) | 3 pass; results under finding 1 |

The 9efed0ad host test is `works host: a leaver's footing waits out the grace, then goes back to the Works rack` and
passes. No browser, GPU, bot or timing evidence was used.

## Coverage

| Commit | Status | Verdict |
| --- | --- | --- |
| 578d8d3d line 2 sweeps while the wagon fetches | reviewed, tests run | finding 3 (low, not worth fixing), finding 6 (cosmetic) |
| 0d3f4190 forge rack gives only what the cradle needs | reviewed, tests run, view offer checked | finding 2 (fix) |
| a67afce9 turntable holds while the wagon rolls out | reviewed, tests run | finding 5 refuted (the hold is bounded) |
| 9efed0ad a leaver's footing returns to the Works rack | reviewed: sim, predict, host maintenance, `requests.active` traced; host test run; probe run | finding 1 refuted as written, a narrower variant confirmed (low); finding 4 refuted (view draws 12) |
| 2afdbb86 one RAIL_STONE for the conservation checks | reviewed, tests run | finding 7 (confirmed, inert, pre-existing) |
| 6a41ab2b pure town facts | reviewed, tests run | clean |

No determinism defect: no Math.random, Date, native trig or unordered iteration in the touched sim code.
`railFootHolders` iterates `w.each`, but it is host-only maintenance whose order does not change the outcome (each
release only increments `Works.rack`). No wire or save shape changed in any of the six commits (none touches
`src/world/namespace.ts`, a component schema or a wire file), so no WORLD_NS bump was owed (still v22). `rail.footRelease`
is a host-run system, not an op, and replicates through the existing Account and Works components.

## Verdicts

| # | Commit | Finding | Verdict |
| --- | --- | --- | --- |
| 1 | 9efed0ad | a returning footing carrier loses the footing | refuted as written; a narrower variant (back for under one rule tick) confirmed by probe, very low |
| 2 | 0d3f4190 | forge rack gives a full back after the cradle is fitted | confirmed, including the view offer; fix |
| 3 | 578d8d3d | `fetching` stays true with nothing fetchable | confirmed, low; recommend not fixing |
| 4 | 9efed0ad | a released footing pushes the Works rack over six | overflow confirmed and intended; view impact refuted up to 12 |
| 5 | a67afce9 | the table held indefinitely without a wagon | refuted: the hold ends when the boiler is fitted |
| 6 | 578d8d3d | orphaned doc comment | confirmed, cosmetic; fold into the finding 2 fix |
| 7 | 2afdbb86 | load-row stone check omits renewal | confirmed, inert, pre-existing; optional one-token fix |

## Findings, most severe first

### 2. The forge rack gives a full back after the cradle is fitted (0d3f4190) - confirmed, fix

- Where: src/sim/railway-systems.ts:642 (`forgeTake`); offer at src/entities/railway/line2-view.ts:1021-1028.
- The cap applies only while `h.fitted < 0`. Once the cradle is fitted nothing takes rails any more: every Q station is
  done (the breaker needs Q6, the stall needs the breaker, the cradle needs the stall, so `qActive(w) < 0` always holds
  after the fit), and the cradle is full (`rail.cradle`, 822-835). Yet `rail.forgeTake` gives `free(w, a)` again, up to
  a full back. The forge never goes out (`lit` is written only at 606) and keeps pouring to `FORGE.rackMax` 24 in
  `layLine2` (1153-1166). Rails on the back make `roomFor(w, a, FOOT)` 0 (113-114: a footing needs an empty back), so
  Shoulder a footing shows "Empty your back first" (works-view.ts:634): the wall the commit removed, moved to after the
  fit.
- The view still offers it: line2-view.ts:1021 pushes "Take rails" whenever `l.forge.rack > 0` and the player is within
  3 m of the forge rack, with no fitted check.
- The per-actor count is also confirmed: the cap subtracts only `a.rails`, so two players can each take eight before
  the fit and one is left with eight unusable rails. Not worth fixing by counting everyone's rails: an absent player's
  rails are never released (only the beam, boiler and footing are), so a leaver holding eight would then stop the
  cradle for good.
- An existing assertion pins the old behaviour: test/railway-works.test.ts:187 (`fitted once; the table needs the
  stall; a stale revision is 0`) expects `rail.forgeTake` on the `cradle-fitted` fixture to give more than 0.

### 1. A returning footing carrier and `requests.active` (9efed0ad) - refuted as written; narrow variant confirmed

When `requests.active(pid)` turns true, traced:

- It is `sessions.has(pid)` (server/src/host/railway-requests.ts:134). `sessions` is written in two places only: set on
  the server's handling of the client's `r:open` (railway-requests.ts:161-170) and deleted by `depart(sid)`
  (railway-requests.ts:136-142).
- `depart` is called by the room only after its reconnect grace (`reconnectGraceMs`, 1500 ms default,
  server/src/host/hosted-room.ts:91, 287-289) or at once when a newer tab of the same player joins (`dropOlder`,
  hosted-room.ts:313-326). A socket that comes back within the room's grace never departs, so `active` stays true
  throughout and no footing clock starts.
- After a real departure, `active` turns true again exactly when that player's next `r:open` is processed. In the same
  synchronous branch the account epoch is bumped through `api.session` (railway-requests.ts:166-168, into
  `railSession`, src/sim/railway-systems.ts:1335-1355). The account epoch has no other writer (1344 for an existing
  account, 1351 at spawn); `rail.wake` does not touch it. `r:open` is answered only while `available()`, which needs
  `running` (world-host.ts:365), and maintenance runs on every rule tick while running (world-host.ts:478-483).

So the scenario in the first pass (a new session has bumped the epoch while `requests.active` is still false) cannot
happen: the epoch bump and `active` becoming true are one step. `maintainFeet` (world-host.ts:410-425) deletes the
absence clock on the first rule tick that sees the carrier active (414-416). Probe 1 confirmed it: depart, return with
`r:open` 2 s before the grace ends, send no request, advance twice the grace: the footing stays.

The first pass's other point is confirmed but harmless: `maintainFeet` reads `api.footHolders()` and calls
`api.footRelease(pid, epoch)` in one synchronous loop (411-421), so the epoch passed is always current and the guard at
railway-systems.ts:1517 never refuses anything. The only protection is `requests.active`. The doc comment at
railway-systems.ts:1523-1524 ("the session `epoch` the host saw leave ... Never once they are back in a new session")
describes a check the code does not make. The boiler has the same shape (world-host.ts:403 passes the current
`b.epoch`).

What remains:

- Grace boundary (by design, probe 2): if the grace runs out on a rule tick between the returning socket's join and its
  `r:open`, the footing goes back to the rack. The carrier was away for the full grace; the beam and boiler behave the
  same.
- Stale absence start (confirmed, probe 3): `depart` keeps an existing entry (`!footAway.has(session.pid)`,
  world-host.ts:599), and only a maintenance pass that sees the carrier active clears it. A carrier who comes back
  (`r:open`) and departs again before the next rule tick keeps the first absence's start. The probe sent `r:open` and
  `depart` with no step between them after an absence of the grace less 1 s, then advanced 1.5 s: the footing went
  back to the rack after a 1.5 s second absence. In production a leave cannot do this (the room's 1.5 s reconnect
  grace covers about 15 maintenance passes); only `dropOlder` can, when a third tab of the same player joins within
  100 ms of the second tab's `r:open`, after the player was away for nearly the whole grace. Very low. The beam and
  boiler `??=` in `depart` (world-host.ts:592, 595) have the same pattern, from before these commits.

### 3. `fetching` stays true when there is nothing the wagon can fetch (578d8d3d) - confirmed, low, not fixing

- Where: src/sim/railway-systems.ts:1137-1141.
- `pierOwed(w, r.foot) > 0` also counts footings on backs, in ground piles, and not yet cast. So with the rack empty and
  nothing left to cast, line 2 serves calls only on its sweep. Reachable (the last footings on backs or in piles), but
  the call still stands and is served on the sweep, at most one sweep later. Not a softlock.
- Why not fix: footings on a leaver's back or in a pile come back to the rack (after the 180 s grace or the pile's
  recovery), and only the sweep then fetches them. The change saves part of a sweep in an edge state, and its test
  would need a hand-built state. If the code is touched anyway:
  `fetching = ... && pierOwed(w, r.foot) > 0 && (works.rack > 0 || works.poured < WORKS.total)`. This is safe because
  the wagon couples only after the fit, when the stall and cradle already hold their four footings.

### 4. A released footing can push the Works rack over rackCap (9efed0ad) - overflow intended; view refuted

- Where: src/sim/railway-systems.ts:1519; cap only at 1219 (`worksTick`).
- Confirmed but intended: the existing pile recovery does the same on purpose ("past its cap if it must", 1389), and
  the kiln waits while the rack is full. Saves stay loadable because validation bounds `rack` by `WORKS.total`
  (src/sim/railway-works.ts:87), not by `rackCap`.
- The view does draw more than six: src/entities/railway/works-view.ts:341-346 draws `Math.min(resting, 12)` footings,
  and `slotAt` (116-125) stacks a second layer of six 0.95 m up. Only a rack above 12 would be under-drawn. That needs
  at least seven footings returned onto a full rack at once (abandoned piles or leavers), which is contrived. Not
  worth fixing; if anyone is in that file anyway, `Math.min(resting, WORKS.total)` covers it.

### 5. The table can be held indefinitely if the wagon never couples (a67afce9) - refuted

- Where: src/sim/railway-systems.ts:845 (`turn` refuses while `ready >= 0` and no wagon), coupling at 1094-1103.
- The hold is bounded. The wagon is commissioned once the cradle is fitted and the table points at line 2 (766-770).
  Coupling needs line 2 running (`trainStep` returns while `trains < 0`, 1067-1068), and `trains` has one writer, the
  boiler fit (517), which never resets it. The boiler is fittable from Q5 on (railway-line2.ts:256-257). A state with
  the cradle fitted and trains still off looks reachable as far as the sim goes: neither the Q6 deposit (596-616) nor
  `fundQ` (560-570) checks trains, so Q6 could be finished by hand before the boiler goes in. But the hold then lasts only until the boiler is fitted, and the table
  is locked in the right position (line 2). Nothing to fix.

### 6. Orphaned doc comment (578d8d3d) - confirmed, cosmetic

- Where: src/sim/railway-systems.ts:1044-1045. The `wagonArrives` comment sits above `pierOwed`'s (1046) instead of
  above `wagonArrives` (1051).

### 7. The load-row stone check omits renewal (2afdbb86, pre-existing) - confirmed, inert

- Where: dev/peer-test/ws-railway.ts:517: `counts.stone!.total === RAIL_STONE` without `+ counts.stone!.produced`,
  unlike the bot (dev/look/bots/railway.ts:1310) and `validateRailLine` (src/sim/railway-line.ts:176). The omission
  predates 2afdbb86, which only replaced the literal 24. It cannot fail while a load row is shorter than a stone
  regrow (31 minutes).

## Fix briefs

### Brief A (finding 2, with finding 6 folded in): the forge rack gives nothing once the cradle is fitted

- Sim, src/sim/railway-systems.ts:642, replace the line with
  `if (qActive(w) < 0) room = h.fitted >= 0 ? 0 : Math.min(room, WORKS.cradleRails - h.cradleRails - a.rails);`
  and say in the comment above it that after the fit nothing uses rails. Prediction follows automatically: the client
  predicts with the same system (src/world/railway-predict.ts).
- View, src/entities/railway/line2-view.ts:1021: add `&& state.shed.fitted < 0` to the "Take rails" condition (the
  same `adapter.inspect()` state roundhouse-view.ts:280 reads `shed` from), so the offer disappears instead of
  answering a press with nothing. Hiding it needs no new player-facing copy.
- Tests, test/railway-works.test.ts:
  - Line 187 pins the old rule: change it to
    `assert.equal(act(fitted, 'b', 'rail.forgeTake'), 0, 'after the fit the forge rack gives nothing');`. The next
    line ("a full cradle takes no more rails") still holds, but with an empty back it is now trivially true. Keep it
    meaningful in the new test below.
  - New test `after the cradle is fitted the forge rack gives nothing`: from `railwayAtWorks('stall-done')`, `a` first
    sets the two cradle footings with an empty back (`rail.footTake { rack: 0 }` then `rail.footSet { site: 1 }`,
    `WORKS.cradle` times, as `ready only after fitted and turned` does). Advance until
    `forge.rack >= 2 * WORKS.cradleRails`; `a` and `b` each take `WORKS.cradleRails` (the per-actor cap allows both);
    `a`'s `rail.cradle` gives `WORKS.cradleRails` and fits the cradle. Then assert: `shed.fitted >= 0`; `b`'s
    `rail.cradle` is 0 with rails on its back; `rail.forgeTake` is 0 for `a` and for `b`; `forge.rack` is unchanged;
    `line2Rails(w.s) === forge.poured`. Both forgeTake assertions fail on main today.
- Finding 6: in the same file, move the `wagonArrives` comment (1044-1045) below `pierOwed` so it sits directly above
  `function wagonArrives`.
- Wire and save: none (no WORLD_NS bump). Mixed builds: an older client may predict a take the server now refuses; it
  comes back through `onCorrected`, which is fine under "assume current builds".
- Checks: `npm run test:unit` and the works bot's empty-back check after the cradle (dev/look/bots/railway-works.ts),
  unchanged.

### Brief B (finding 1 variant, optional, low): a returning carrier always gets a fresh grace

- Host, server/src/host/world-host.ts:596-602: drop `!footAway.has(session.pid) &&`, so a real departure always starts
  the clock now (`depart` returns a session only for a player who was back, so their new absence starts now). Apply
  the same change to `beamAway ??= now()` and `boilerAway ??= now()` (592, 595) to keep the three alike, or leave all
  three alone.
- Sim comment, src/sim/railway-systems.ts:1523-1524: say what protects a returned carrier (the host's live-session
  check) and that the epoch only refuses a release for a session that has since changed.
- Test, server/test/railway-works-host.test.ts, new test
  `works host: a carrier back for less than a rule tick still gets a fresh grace`: from `fixture('wagon-on')`, take a
  footing at `WORKS_RACK`; `r.h.depart('s')`; `await r.ticks(1)`; `r.later(grace() - 1000)`;
  `r.h.deliver({ t: 'r:open' }, 's')` and `r.h.depart('s')` with no tick between; `r.later(1500)`;
  `await r.ticks(1)`; assert the footing is still on the back; then `r.later(grace())`, `await r.ticks(1)`, and assert
  it is on the Works rack with `footingTotal(...) === works().poured`. It fails on main today (probe 3).
- Wire and save: none.

### Brief C (finding 7, optional, trivial)

- dev/peer-test/ws-railway.ts:517: `counts.stone!.total === RAIL_STONE + counts.stone!.produced`. Dev tooling only, no
  wire or save change; exercised by `npm run test:net`.

### Recommended not to fix

- 3: the sweep still serves every call, and footings away from the rack come back to it, where only the sweep fetches
  them; the gain is part of one sweep in an edge state.
- 4: the overflow is the existing return rule, saves load, and the view draws up to 12.
- 5: not a defect; the hold ends when the boiler goes in.

## Clean

- 6a41ab2b: `townReadOf` matches `townRead` (tested); `head`/`pier` by count is correct because Q stations complete in
  order (`qActive` takes the first incomplete one). No consumers yet.
- 2afdbb86: `RAIL_STONE` equals the seed (`railway-world.ts:249` spawns rocks from `r.initial`).
- 9efed0ad prediction: `rail.take` of a footing pile now reports `carried = a.foot`; `kind` reaches the server for
  `rail.take` (railway-requests.ts:61) and the adapter sends it (src/adapters/railway.ts:1076).
