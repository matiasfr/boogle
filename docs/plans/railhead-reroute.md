> **Status:** planned 18 November 2026 (planner); steps 1 and 2 built 18 November on branch
> `claude/railhead-reroute` (not shipped; [as built](#steps-1-and-2-as-built-18-november-2026)), step 3 not started.
> Answers the open owner question "The railhead re-routes trains before the deck moves" on its recommendation: hold the
> re-route until the haul settles. The reset is **`WORLD_NS` v61** (separate capacities took v60, #2152;
> [decision](../decisions-rail.md#d-2026-11-18-railhead-reroute-reset)). Not a port from Place.

# The railhead re-route waits for the deck

## Goal

Line 2's Railhead stop moves on a bent once the traveller has hauled and chocked at the new head, not when the pair's
second footing is accepted: the platform goes first, the trains follow. Serves DESIGN.md 7 (Telegraph everything) and
11 (What's on screen is true); bends none. **Research:** [coop-physics-vehicles-netcode](../research/coop-physics-vehicles-netcode.md)
recommendation 2 (timetabled things are a function of the tick): the deck stays derived; the re-route is a server
event at a tick derived from the replicated haul fields, written to the row so mirrors get it with the train rows.

## Current behaviour

- `ringFootSet` (`src/sim/railway-sys-ring.ts:45-71`), on a bent's second footing (line 58), stamps `from`/`moved`
  (59-60) and calls `stopMoved(trainMoveIO(w), LINE2, RAILHEAD, tick)` (61) in the same apply.
- The stop's place is `ringHead(w) = floor(set / 2)` (`src/sim/railway-queries.ts:122`), read through `ringOpen` (124)
  into `stopsOf` (130): the moment `set` ticks over, stop 4, its stub turnout, end block and signal (`endBlocks`,
  `src/sim/railway-trains.ts:98`) are at the new head, and so are the lever's accepted platform (`railCallPlatform`,
  `railway-queries-trains.ts:90`), the far crowd of waiting little guys (`riders-view.ts:66-78`), the halt map
  (`halts-view.ts:728`) and the buoys (`lookout/view.ts:209`). Rack and jib reach (`railway-server.ts:303,306`) too.
- `stopMoved` (`railway-trains.ts:654-667`): a train **standing** at stop 4 becomes a signal stand (`at`/`to` -1), keeps
  its pose, has no dwell left and leaves homeward when its way is clear (`endStanding`, 590); one **running** to stop 4
  is replanned from its pose to the new stop (`from`, `v0`, `dest`, `depart`). No hold or wait changes; the balanced
  hold stops matching a waiter left at the old signal (471-473).
- So a train between the heads, or bound for the Railhead anywhere, runs past the old platform and the bollard and
  stands on the new span about 7 s (`HAUL.after + ready`, 70 ticks) before the deck moves (the Checkpoint B finding).

## The change

**A stored field, not a derivation.** `Aperture` gains `stop: 'u8'` (default 0): the bent the trains' Railhead stands
at. Deriving it from `(set, moved, from, tick)` would thread a tick through every `stopsOf` caller, let each view flip
the stop on its own clock estimate before the matching train rows arrive, and still need an apply-time re-route when a
pair lands inside the last haul's 9-tick chock. A row field reaches mirrors in the same packet set as the rewritten
train rows.

- **Who applies it:** new tick system `ringStopTick` (`'rail.ringStop'`, phase `tick`, order 2.75, before `trainTick`
  at 3) in `railway-sys-ring.ts`: when `a.stop !== headOf(a)` and `haulSettled(a, tick)` (`headOf(a) =
  min(7, floor(set / 2))`), set `stop = headOf(a)` and run `stopMoved` once. The test is idempotent, with no exact-tick
  match, so a reload or a pair mid-haul cannot skip or repeat it. Server rule ticks are contiguous (`sync.ts:115`).
- `ringFootSet` stops calling `stopMoved` and drops `Train` from `writes`; it still stamps the haul.
- `ringOpen(w).head` reads `a.stop`: `stopsOf`, turnout, end block, signal and buoys follow it. `ringHead(w)` stays
  `floor(set / 2)` as the **build head** (rack, jib, their reach, `leverYield` at `halts-view.ts:570`), which moves at the
  pair as the traveller plan kept ("No new refusal"). `railCallPlatform` and the map (`halts-view.ts:728`) switch to
  `ringOpen(w).head`.
- **During the haul a train holds at the old head.** Nothing re-routes until `haulEnd`, about 12.7 s after the pair. A
  train bound for the Railhead stands at the old head as at any halt (riders off, footings onto the rack's count, asks
  served, its full dwell): the walkway holds the old platform's whole place (traveller step 4) and the 25 m deck
  overlaps it by at least 5 m all haul. At `haulEnd` one standing there becomes a signal stand and leaves homeward, as
  today at the pair; one running replans to the new head from its pose. **No train waits for the haul.**
- **Stop short, rejected:** holding arrivals at the signal from told to settle needs a new `blockFree` rule, adds up to
  12.7 s against line 2's 105 s bound ([16 November](../decisions-rail.md#d-2026-11-16-batch2-waits-use-owner-limits))
  and looks stuck.
- **Waiting little guys ride the deck.** The sim is unchanged: they wait for stop 4 (`Town.wait1`) and board any train
  standing there. While `ringHead(w) !== ringOpen(w).head`, `riders-view.ts` draws the far crowd offset by the drawn
  deck's travel (`railheadDrawn`), so they ride out and stand on the new platform at settle (today they jump 20 m).

## What it touches

- **Lockstep and replay:** integers and a compare in an already guarded file. The re-route moves from the pair to
  `haulEnd`, so train rows differ from the first pair on: re-pin `test/world-replay.test.ts`, the railway goldens
  (`GOLDEN=1`) and the frozen host trace, each naming the changed inputs (`Aperture.stop`; the re-route at `haulEnd`).
  `settleHaul` (`railway-seed-ring.ts:65`) must end with `stop === headOf(a)`; assert it.
- **Prediction:** `rail.footSet` predicts `ringFootSet`, which no longer writes trains; only the server re-routes.
- **Server:** its tick applies it. No op, message, presence field or server-image file.
- **Wire, save and `WORLD_NS`: yes, a bump, v59 → v60**, its own commit: "the Aperture row carries the trains' Railhead
  bent, which moves when the haul settles; no migration". The column changes the replicated and saved shape, and a
  rule that moves pinned fixtures needs a bump anyway (state rule 15, owner call "Seed-only goldens"). Under "No old
  builds" it proceeds unless the owner is in a playtest; never mid-session. The server lands ~20 min after the client
  (state rule 1): an old tab misdraws the stop meanwhile, accepted. No compatibility code.
- **Invariants** (`railway-check-ring.ts`): `stop <= headOf(a)`; settled implies `stop === headOf(a)`;
  `RING_HEAD[stop].u <= haulU(a, tick)` (the stop never ahead of the deck).

## Steps

Rows from `npm run models` (18 November). No new test files (state rule 8).

- [x] **1. The field, its tick, the re-route. Sim, high risk; Codex gpt-6.2-astra high.** Edit
      `railway-components.ts`, `railway-sys-ring.ts` (system, `ringFootSet`, comments), `railway-systems.ts`
      (`RAIL_TICK`), `railway-queries.ts`, `railway-queries-trains.ts`, `railway-check-ring.ts`, `railway-seed-ring.ts`.
      `test/railway-ring.test.ts`: `a pair leaves the trains' Railhead at the old head until the haul settles`; `at
      haulEnd a train standing at the old head leaves homeward; one running replans with no jump`; `a train arriving
      mid-haul stands its dwell at the old head`; `a pair inside the last haul's chock moves the stop once, at its own
      settle`; `a rivet struck before the last haul settles`; the 5,000-op fuzz checks the invariants.
      `test/railway-check-ring.test.ts`: each invariant refused. Verify: those, the re-pins, `node dev/ship-check.ts`.
      Review: a fresh Codex review delegate, gpt-6.2-astra high, a failing test per suspected defect.
- [x] **2. Through a real server. Same row.** `server/test/railway-ring-host.test.ts`, real host, two sessions and
      mirrors, `rail.footSet` as a real `r:edit` (state rule 23): `mirrors hold the old stop through the haul, then the
      new stop and re-routed trains in one packet set`; `a checkpoint mid-haul round-trips stop and re-routes once after
      reload`; `a mirror joining mid-haul sees the old head`. Verify: that file; `npm run loop -- run` (`bents` beat
      unchanged). Review: step 1's reviewer, driving a real server once.
- [ ] **3. The views. Codex gpt-6.2-astra medium.** `halts-view.ts:728`, `riders-view.ts`.
      `test/railway-r4b-views.test.ts`: `the far crowd rides the drawn deck and stands on the new platform at settle`;
      `the map redraws at settle`; `the old platform's place is walkway at every tick of a haul`. Verify: a motion
      sheet from `dev/look/evals/railhead-move.ts` at `ring-set-3` with a train arriving mid-haul. Update
      `docs/game-design/place.md`, "The railhead and the gap".
- [ ] **Checkpoint (1 to 3, one ship, v60 its own commit).** Once: `npm run test:net`; the ring bot
      (`railway-ring-bot.ts --rail-seed deck-laid`, all fourteen footings); the footing wagon trip by trip with every
      delivery tick (state rule 14); a two-tab look with a mid-haul arrival. Code review: fresh Codex delegate on the
      committed branch, gpt-6.2-astra medium. Visual review: main session.

## Steps 1 and 2 as built (18 November 2026)

Branch `claude/railhead-reroute`, not shipped. Built as written, with three refinements:

- **`checkRingStop` runs before the trains' check**, not inside `checkRing`: `checkTrains` reads the stop through
  `stopsOf`, so a bad `stop` is refused by name (`ring bounds`, `ring stop past the head`, `ring stop ahead of the
  deck`, `ring stop behind a settled haul`) instead of as a train fault or an out-of-range `RING_HEAD` index. The two
  tick invariants need the rule tick the world stands at (`railwayCheck(w, tick)`, as the server's load passes); with
  no tick (`RAILWAY_MAX_INT`, the seed and test drivers' `invariant`) only the bound and "not past the head" run.
- `haulHead(a)` (`railway-ring-haul.ts`) is the build head the plan calls `headOf(a)`; `ringHead` and `haulTarget` use it.
- `railCallPlatform` follows `ringOpen(w).head`, so the client's lever reach (`leverPlatform`) and the server's agree.

**Tests.** `test/railway-ring.test.ts`: the five named cases and the fuzz checking `railwayCheck(w, tick)` after every
op; `test/railway-check-ring.test.ts`: each of the three invariants refused (and the bound). Updated to the new rule:
`test/railway-r3b2-review.test.ts` (the burst and the balanced hold re-route at `haulEnd`; the rack and jib judged at
the build head, the lever at `stop`), the tick census (`rail.ringStop`, 2.75). Step 2:
`server/test/railway-ring-host.test.ts`, real host, two sessions, `rail.footSet` as `r:edit`: mirrors hold the old
stop through the haul and get the new stop with the re-routed train in the settle's packet set; a checkpoint
mid-haul round-trips `stop` and the stop moves and the train is re-routed once, at the settle, after the reload; a
mirror joining mid-haul sees the old head, then the new one.

**The footing wagon, trip by trip (state rule 14).** Driven from `deck-laid` with the seeds' policy (a footing set the
tick one is on the railhead rack, so each load's pairs land on its arrival tick), to the rivet and 3,000 ticks on;
rule ticks, v60 then v61:

| Trip | Railhead arrival and delivery (6 footings) | Leaves the Railhead | Village | Works load | Stop moves |
| --- | --- | --- | --- | --- | --- |
| 1 | 8823 / 8823 | 8824 / 8873 | 9297 / 9346 | 9481 / 9530 | at the pairs 8823 / 9030 (0 to 3) |
| 2 | 9979 / 10028 | 9980 / 10078 | 10483 / 10581 | 10667 / 10765 | 9979 / 10235 (3 to 6) |
| 3 | 11195 / 11293 (the fourteenth and the four weights, the rivet) | 11196 / 11343 | 11729 / 11876 | | 11195 / 11420 (6 to 7) |
| after | Ring Island 12423 / 12570, Village 13117 / 13263 | | | | |

The first delivery is unchanged; **every later delivery moved, 49 ticks per earlier trip** (+4.9 s, +9.8 s, then
+14.7 s after the rivet). Why: under v60 the pair on the wagon's arrival tick re-routed it at once (a signal stand
with no dwell left), so it left the next tick; now the stop holds through the haul and the wagon stands its own
50-tick dwell at the old head, as the plan's design says ("No train waits for the haul" holds: it never waits past
its dwell). It is the seed policy's instant pair that made v60's release happen every trip; a player carrying a
footing 15 m from rack to jib rarely completes a pair inside the 5 s dwell. No wagon trip waited for a haul, and the
haul distances matched trip for trip (the stop had settled before each next arrival).

**Pinned fixtures, re-pinned under v61 by their own writers, each keyed against v60.** A control tree (v61's column,
v60's re-route at the pair) separates the column from the rule.

- Schema (`rail-schema.json`): only `Aperture.stop` (`u8`) and `worldNs`.
- Seed golden: 46 of 56 stages are v60's state with a zero `stop` column (`deck-laid` included: its seed sets no pair);
  the 10 built on the ring's footings move by the rule: `gap-footed` and `leaf-raised` (+98 ticks), `ring-joined`
  (+98), `steel-kit` and `steel-lit` (+147), `steel-home`, `boiler-long`, `gorge-open`, `gorge-mid` and
  `gorge-reached` (+80 or +81), their trains, line, town, yard and clocks rows following.
- Op-stream golden: 279 records, every name and result exact; every hash moves (the column).
- Tick-order heads: re-recorded (`rail.ringStop` in the sequence, the hashes).
- M12 trace: 82 traces, no frame count changes; the column moves every hash, the rule only `ring-joined` a, b and c.
- Host trace: 8,604 records; only 205 checkpoint namespaces, hashes and checksums with the zero column and 5,671
  `snapBytes` samples; the control is byte-identical to v61 (the rule changes nothing in it).
- `prefab-halts.json`: the rule moves three lever lamps (`calling`: Camp at `gap-footed` and `ring-joined`, the Village
  at `stack-3`, the trains' phase at those seeds' ticks); the writer also records the `gap-footed` Railhead lever's `u`
  as 235.60000000000002 for 235.6, which the column-only control reproduces (inside `prefabGolden`'s numeric tolerance).

**Not passing: the greybox route's pacing gates (a wall for the owner).** `test/helpers/railway-route-rules.ts` runs
gates 12, 14 and 15 and "a redirected train gets 50 dwell ticks" on `ringRivetSequence`, which strikes the rivet
mid-haul on purpose and is pinned so "those measured bounds are not silently loosened". Under v61 the rivet comes 147
ticks later in that sequence (the wagon's dwells) and the stop settles 77 ticks after it: gate 14's rivet to the Gorge
is 3,919 ticks (bound 3,700, v60 3,623) and one later frame idles 712 (bound 600); gate 15's steel kit reaches the
yard at +588 against its pinned build-2 +650; gate 12's third join misses 1,050 ticks; the dwell test's slot changes.
The same gates fail on v60's rules when only the rivet moves: 50 ticks later fails gate 15, 127 later fails gates 14
and 15 and four more (the Gorge at 5,372). So they measure the fleet's phase at this one workload's rivet; whether to
re-measure them at v61's phase, loosen them, or change the workload is the owner's call, not this build's.

## Level findings and risks

- Nothing is placed or gated. A rider who steps off mid-haul lands on the old platform's walkway (step 3 asserts it).
- Room safety: no effect in `apply` (it writes less); no wall clock. Hotspots: `railway-sys-ring.ts`, `railway-queries.ts`,
  `halts-view.ts`; `railway-trains.ts` is not edited. In flight: `claude/forge-rack-move` shares only `docs/agent-calls.md`.
- A footing wagon arriving mid-haul unloads onto the rack's count while the rack rides away (prompts wait for settle).
- The map, buoys and crowd change about 12.7 s later each pair. Performance: one compare a tick.

## Open questions

1. **A train bound for the Railhead mid-haul: stand at the old head, or wait at the signal?** Recommended: the old head.
2. **Reset to v60 for this alone?** Recommended: yes, own commit, unless a playtest is on; nothing in flight bumps.
3. **Little guys waiting there: ride the deck out, or wait on the walkway and appear at settle?** Recommended: ride.

## Design review (2026-11-18)

Planner, same context: DESIGN.md 7, 8, 10, 11; rail Current rules (14, 16 November); the traveller plan and review.

| Call | Kind | Source or recommendation |
| --- | --- | --- |
| Players on the deck are carried through the haul | Decided | [14 November](../decisions-rail.md#d-2026-11-14-gap-readability-answered) |
| The trains' Railhead moves at `haulEnd` (about 12.7 s after the pair) | New | Recommended: the platform goes first (7, 11); the settle bell cues the trains |
| A train bound for the Railhead mid-haul stands its dwell at the old head | Default | No new hold; walkway and deck are real platform |
| No train waits for the haul; one at the old head at settle leaves with no further dwell | Default | Today's rule, moved to settle; the 105 s bound is untouched |
| Waiting little guys ride the deck in the view and board any train at stop 4 | Default | View only; removes today's 20 m jump |
| The map and buoys change at settle; rack and jib still move at the pair | Default | They follow the trains' stop; build reach as the traveller plan |

**Findings.** (1) Solo and first meeting: the player has just set the footing, so they ride the deck, then see the
next train come to the new head: cause before effect. (2) Co-op: a friend arriving mid-haul steps off onto the walkway
behind the deck and walks on (lift-aboard takes only those ahead); step 3 asserts the walkway. (3) Little guys may board
at the old head while drawn on the deck: at most 20 m for about 6 s, only if a train arrives then; accepted over a new
boarding rule. No strings; no Boogler copy.
