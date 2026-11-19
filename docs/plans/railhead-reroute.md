> **Status:** planned 18 November 2026 (planner); steps 1 to 3 built 18 November on branch `claude/railhead-reroute`
> (not shipped; as built: [steps 1 and 2](#steps-1-and-2-as-built-18-november-2026),
> [step 3](#step-3-as-built-18-november-2026)); they ship together (the independent review's condition).
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
- **Wire, save and `WORLD_NS`: yes, a bump, v60 → v61** (separate capacities took v60), its own commit: "the
  Aperture row carries the trains' Railhead bent, which moves when the haul settles; no migration". The column
  changes the replicated and saved shape, and a rule that moves pinned fixtures needs a bump anyway (state rule 15,
  owner call "Seed-only goldens"). Under "No old builds" it proceeds unless the owner is in a playtest; never
  mid-session. The server lands ~20 min after the client
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
- [x] **3. The views. Codex gpt-6.2-astra medium.** `halts-view.ts:728`, `riders-view.ts`.
      `test/railway-r4b-views.test.ts`: `the far crowd rides the drawn deck and stands on the new platform at settle`;
      `the map redraws at settle`; `the old platform's place is walkway at every tick of a haul`. Verify: a motion
      sheet from `dev/look/evals/railhead-move.ts` at `ring-set-3` with a train arriving mid-haul. Update
      `docs/game-design/place.md`, "The railhead and the gap".
- [x] **Checkpoint (1 to 3, one ship, v61 its own commit).** Once: `npm run test:net`; the ring bot
      (`railway-ring-bot.ts --rail-seed deck-laid`, all fourteen footings); the footing wagon trip by trip with every
      delivery tick (state rule 14); a two-tab look with a mid-haul arrival. Code review: fresh Codex delegate on the
      committed branch, gpt-6.2-astra medium. Visual review: main session.
      Run 18 November on main after #2218 ([record](#checkpoint-run-18-november-2026)).

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

**The greybox route's pacing gates, re-pinned at v61 (owner, 18 November: option (a), "re-measure and re-pin";
the slower route is the accepted cost of trains waiting for the deck).** `test/helpers/railway-route-rules.ts` runs
gates 12, 14 and 15 and "a redirected train gets 50 dwell ticks" on `ringRivetSequence`, which strikes the rivet
mid-haul on purpose. Under v61 the rivet comes 147 ticks later in that sequence (the wagon's dwells at the old head)
and the stop settles 77 ticks after it. **v60's rules started from v61's rivet world give every v61 figure below
exactly**, so none is a re-route defect: they are the fleet's phase at this workload's rivet (on v60's rules alone a
rivet 50 ticks later fails gate 15, 127 later gates 14 and 15 and four more, the Gorge at 5,372). Each failing bound
keeps v60's margin over the measured figure; a bound v61 still meets is kept.

| Gate | v60 figure | v61 figure | Bound v60 → v61 (margin) |
| --- | --- | --- | --- |
| 12: the last extra train joins, ticks after the first section lays | +653 (+18, +371) | +1,403 (+733, +1,121) | 1,050 → 1,800 (397) |
| 14: rivet to the Gorge, fed every tick | 3,623 | 3,919 | 3,700 → 3,996 (77) |
| 14: later frames idle, the most | 565 | 712 | 600 → 747 (35) |
| 14: first frame idle | 1,128 | 1,127 | 1,200 kept |
| 15: steel kit in the yard, leg idle and fed (an equality) | +650, +650 | +588, +588 | `BUILD2.yard` 650 → 588 (0) |
| 15: first steel home and the install, leg fed | +2,392 | +1,820 | `BUILD2.home` + 1,050 = 2,874 kept |

`BUILD2.yard` was build 2 alone's tick with the leg's rules absent (v31), which cannot be re-run; at v60 the idle-leg
figure equalled it exactly, so v61's idle-leg figure stands for it. Gate 12's third join at +1,403 is `fleetJoin`'s
existing behaviour from this phase (v60's rules give it too), worth a look if the extra trains' join ever matters.

"A redirected train gets 50 dwell ticks": the premise holds under the new rule (the lay's redirect is the leg's, not
the ring's), but its fixture lost its case: at v60 slot 4 stood at the old head's end when section 3 laid; at v61 nobody
does (slot 2, serving the ask, was running from the Village). The test now builds its premise: `REDIRECT` fills the
frame `LEG_TUNE.layTicks` before the fifth tick of a train's end stand there (found by running the fleet unfed) and
checks the redirect on the lay; it found slot 2, the frame filled 718 ticks after the kit was aboard. Every assertion
is v60's, on that slot.

## Step 3 as built (18 November 2026)

The independent review of steps 1 and 2 (clean) made step 3 a condition of shipping them, and asked for the lever and
its reach to agree.

- **The map** reads the trains' stop: `mapStageOf(w)` (`halt-map.ts`, `ringOpen(w).head`), so the boards and the
  island's table redraw at the settle, not about 12.7 s early at the pair.
- **The Railhead lever: the lever moves, not the reach.** Through a haul the trains still stop at the old head, and
  the server takes a lever ask at the stop's platform (`railCallPlatform`, unchanged since step 1). So the lever stands
  at `railheadLever(ringOpen(w).head)` instead of riding the drawn deck: once the deck slides off it, it steps down
  0.9 m onto the walkway at its foot (`railheadLeverUp`, eased at 3 m/s) and keeps offering its prompt, which the
  traveller's settle gate no longer hides; at the settle it slides out to the new head at 7 m/s (no prompt while it
  moves) and steps back up onto the platform. A player standing at the drawn lever can press it at every tick of a haul
  (tested: the server's position test at the lever, on the dais or the walkway). Moving the reach onto the deck was
  rejected: it would change `railCallPlatform` (shared by the server, the far crowd and the riders' stepping off), ask a
  train to a stop 20 m behind the asker, and race the moving deck with the press's latency. `railheadLeverOn` is gone.
- **The waiting little guys ride the deck:** while the build head is ahead of the stop, `riders-view.ts` stands the
  far crowd on `deckPlatform(railheadEnd())` (`railhead-shape.ts`: `RING_HEAD[k].platform`'s place at any deck end),
  which is the new head's platform exactly at the settle.
- **Tests** (`test/railway-r4b-views.test.ts`): the lever at the trains' stop, on what is drawn, its ask taken at every
  quarter tick of every haul; the old platform's place walkway at every tick; the far crowd's platform moving with no
  jump and settling on the new platform; the map, the riding test and the lever's platform tick by tick through a real
  room's haul (one redraw, at the settle). `prefab-halts.json`'s `gap-footed` Railhead lever is back to 235.6 (the
  lever now comes from `railheadLever`, as v60's fixture had it).
- **The host tests** no longer move a train's `depart` by hand: a train standing at the Railhead through a whole haul
  is not a state ordinary ops reach (its 50-tick dwell, even restarted once by a lever ask, ends before a haul that
  settles at least 127 ticks after the pair, which comes no earlier than the wagon's arrival; only the balanced hold
  keeps one there, by the fleet's phase). They now run the real fixture on until a line 2 train is 400 m or more short
  of the Railhead, still running at the settle, and assert its replan; the standing case stays the rule tests'.
- **Proof look:** `dev/look/evals/railhead-move.ts` gained `&train=1`: it holds the footing until a line 2 train is 30
  to 150 m short, sets it and frames the old head still. At `ring-set-3` train 3 arrived 3.5 s into the haul and stood
  its dwell at the old head (s 872 m) beside the walkway while the deck travelled from u 140 to 160, then left home;
  the one waiting little guy rode the deck out and boarded it; the lever held u 115.6, stepped down 0.9 m as the deck
  left it, and at the settle slid to u 135.6 and back up. The map's redraw was not in frame (the tests hold it). Not
  tested on a device.

## Checkpoint run (18 November 2026)

Runner: test sub-agent on HOTBOX (Windows, Node 26.13), branch `claude/railhead-reroute-checkpoint` from `origin/main`
`045fa1529` (the merge `b9f4dba09` plus bookkeeping; nothing under `src/sim`, `src/net`, `server/` or `dev/peer-test`
changed since the merge). Load stayed between 0.9 and 4.2 against HOTBOX's limit of 18; no run was `underLoad`.
Code review and visual review were met before the merge (three independent reviews of #2218); none was started here.

**1. `npm run test:net`: passed on the merge commit, not rerun.** CI run 44420528246 (`ci.yml`, `workflow_dispatch` on
`main` at `b9f4dba09`), job `net` 135212144083: `PASS: 237/237 checks passed`. The ship run on the branch head
`4696a3e` (44419387949) passed its `net` job too.

**2. The ring bot: passed, after three corrections to the bot (dev/look only).**
`npm run playthrough -- --from deck-laid --to ring-ride --stall 3000 --wall 2700` (`railFrom=ring`, the
`railway-ring-bot.ts` eval). The passing run, `reroute-ring6`: `verdict.json` `pass` on `cc8539ee1`, `dirty: 0`, load
1.42 → 1.14, `underLoad: false`, 389 s wall, 1,575 s of game. All fourteen bent footings shouldered and set by real
input (idle at the rack 135 s of server time), the glide landed dry on the brace platform (1416, 8.4, -660.1), the pawl,
the hook back, four weights, the leaf down, the rivet (joined, tick 11584), and the ride to the island halt: it ended
`ring ridden` at tick 12126 standing at (1417.8, 9.3, -819.7), not swimming. **No recovery** (the bot's end line says
"no recovery"; this route forbids it). Its checkpoints show the stop trailing the build head through the last haul
(`gap footed` at tick 11352: set 14, stop 6, head 6), then stop 7 from `gap glided` on.
Earlier runs failed on stale bot code, not the game:
- `reroute-ring` (`045fa1529`): after the fourteenth footing the bot ran up to `RING_HEAD[ringOpen().head]`, which under
  v61 is the trains' stop, still bent 6 mid-haul, so it jumped from a bent short and fell in the sea. Fix: wait for
  `ringOpen(rw()).head === ringHead(rw())` (the last haul settled) before the run-up.
- `reroute-ring2`: `rideToIsland` read the outbound lever eagerly; just after the rivet it did not stand. Fix: wait for it.
- `reroute-ring3` to `5`: the outbound lever flickered on and off after the rivet (the P3 finding below). Then the bot's
  wait spot was the lever knob on its raised platform, which the planner cannot reach (12 November's route used the
  joint's west platform). Fixes: wait until the lever has stood at rest for 100 server ticks; wait for the train where
  the rivet left the rider (`before` already walks to the lever and hops up).

**3. The footing wagon, trip by trip: the plan's figures exactly, on current main and at v60.** A scratch driver (not
committed) builds `railwayAtRing('deck-laid')` and applies the seeds' policy each tick (a footing on the railhead rack
is taken and set at once; the brace, the four weights and the rivet as soon as each is possible), logging every change
of the wagon's row and the `Aperture` row by rule tick. Run on this checkout (v61) and on `55c4827d9` (main before the
merge, `WORLD_NS` v60). Rule ticks, v60 / v61:

| Trip | Railhead arrival = delivery (6 footings) | Leaves the Railhead | Village | Works load | Stop moves (v61) |
| --- | --- | --- | --- | --- | --- |
| 1 | 8823 / 8823 | 8824 / 8873 | 9297 / 9346 | 9481 / 9530 | 9030 (0 to 3) |
| 2 | 9979 / 10028 | 9980 / 10078 | 10483 / 10581 | 10667 / 10765 | 10235 (3 to 6) |
| 3 | 11195 / 11293 (2 bents, 4 weights, rivet the same tick) | 11196 / 11343 | 11729 / 11876 | | 11420 (6 to 7) |
| after | Ring Island 12423 / 12570, Village 13117 / 13263 | | | | |

From each arrival to the next: v60 1,156 and 1,216 ticks, v61 1,205 and 1,265. **Each trip is exactly 49 ticks
longer, the same every trip; no trip's delay grows.** The 49 ticks are the wagon standing its own 50-tick dwell at the
old head. Under v60 a re-route sent it off the tick after it arrived; under v61 it leaves at arrival + 50 on all three
trips. So deliveries trail v60 by 0, 49 and 98 ticks, and later events by 147. That is a fixed cost per trip that adds
up, as recorded under steps 1 and 2, and no hidden wait: the wagon never stands past its dwell, and every haul had
settled before the next arrival. In the ring bot's own run the fourteenth footing was set at tick 11352, against
11293 under the seed policy, because the bot carries each footing at a person's pace. The bot does not log delivery
ticks trip by trip.

**4. Two-tab look with a mid-haul arrival: passed.** `dev/look/evals/railhead-move.ts` gained a watcher mode: the
second page waits for the first page's footing, then frames and flags the same haul. Commands:
`npm run look -- --players 2 --warp-speed 2 --rail-seed ring-set-3 --query 'debugcam=1&train=1' --eval
dev/look/evals/railhead-move.ts --until window.__railheadMove --frames 2 --seconds 4 --name reroute-2tab-a` (pass;
page 2's clock fell up to 2.1 s behind during setup and was back inside 1 s at the end), and the same with `--real --frames 3 --seconds 10
--name reroute-2tab-b` (pass). Two `--warp-speed 2` attempts at the 10 s capture stopped on the harness's clock check
(page 2 ended 2.4 and 4.2 s behind while world ticks agreed), which is not a game failure. Both pages logged the same state at every
half second of `reroute-2tab-b`:
- Train 3 set off 135 m short; the footing was set at tick 9011; the haul ends at 9138.
- From phase 25 to 65: `stop 1 build 2 standing 3 at 87200` (the old head) while the deck went from u 145.5 to 160.0.
- The lever held u 115.6 and stepped down from y 22.72 to 21.82 as the deck left it (phase 15 to 19).
- The one waiting little guy (`wait1` 1) was gone at phase 25, when the train stood.
- At phase 70 (settled): `stop 2` and nothing standing at stop 4. The lever slid from u 117.8 to 135.6 by phase 100
  and stepped back up (y 21.92).

`shownU` on the two pages differed by at most 0.06 m at matching log lines (each page logs on its own timer, not at
the same wall time). Stills, 1200 px:
- [Tab 1: told, 5 s, 10 s](../reports/railhead-reroute-checkpoint/1-tab1-told-mid-settled.png). Told: the deck at the
  old head, a little guy waiting on it, the lever on its dais. At 5 s: the deck hauled off, the old platform's place is
  walkway with the lever stepped down on it, and train 3 stands there. At 10 s, after the settle: the train moving off
  homeward and the lever out at the new head on the deck.
- [Tab 1, mid-haul](../reports/railhead-reroute-checkpoint/2-tab1-mid-haul.png) and
  [tab 2, mid-haul](../reports/railhead-reroute-checkpoint/3-tab2-mid-haul.png) (`reroute-2tab-a`): the train
  standing at the old head beside the walkway, the lever (red knob) stepped down on the walkway, the deck ahead.
- [Tab 2, after the settle](../reports/railhead-reroute-checkpoint/4-tab2-after-settle.png) (`reroute-2tab-b`): the
  train moving on homeward, the lever at the new head on the deck.

**Unseen.**
- The little guy riding the deck is in no still. At `ring-set-3` the train first logged standing about 1 s after the
  deck began to move (the deck 5.5 m out), and the eval's frames fall either side of that; the logs show only the waiting count.
- The lever's prompt text on the walkway was not captured (the tests check it).
- Sounds, the map's redraw, a third tab, and a reload mid-haul in a browser.
- **Checkpoint B's `&railLag=400` reading was not taken.** The machine was quiet enough, but `look --players 2` gives
  both pages the same `--query`, and `railLag` is read at boot. Lagging one tab needs a new harness flag, with review
  and a launcher restart, which is beyond this runner's remit.
- Not tested on a device.

**Finding, P3: the Railhead's outbound lever flickers after the rivet.** In every bot run the outbound lever in the
view (`ringLevers`, halt 4, `dir` 1, `on`) came and went several times before it held. `reroute-ring4`: on at 29
ticks after the joined checkpoint, off at 38, on at 50, off at 56, on at 63, steady from 68. `reroute-ring6`: five
flips between 72 and 82 ticks. Between flips it reads "Village", chained, and slides back. The sim's rule switches
once: from `deck-laid` with the seeds' policy, `railPlatformEnd(w, 1, 4, t)` and `railCallReady(+1)` hold their
end-of-line values from the rivet (11293) while the wagon keeps its retained end block, and switch for good at 11396.
So the flicker comes from the view (`halts-view.ts`, `mainWay` and `chained` on the tab's clock), not the rule. A
player who presses during it gets nothing. Reproduction: `npm run playthrough -- --from deck-laid --to ring-ride
--stall 3000 --wall 2700`, then read the `OUTBOUND LEVER` lines in `bot.txt`. It was not compared at v60, so it is not
known to come from the re-route. Not fixed here.

**Changed for the run (dev/look only):** `dev/look/bots/railway-ring.ts` (the three bot fixes above);
`dev/look/evals/railhead-move.ts` (the watcher page).

## Level findings and risks

- Nothing is placed or gated. A rider who steps off mid-haul lands on the old platform's walkway (step 3 asserts it).
- Room safety: no effect in `apply` (it writes less); no wall clock. Hotspots: `railway-sys-ring.ts`, `railway-queries.ts`,
  `halts-view.ts`; `railway-trains.ts` is not edited. In flight: `claude/forge-rack-move` shares only `docs/agent-calls.md`.
- A footing wagon arriving mid-haul unloads onto the rack's count while the rack rides away (prompts wait for settle).
- The map, buoys and crowd change about 12.7 s later each pair. Performance: one compare a tick.

## Open questions

1. **A train bound for the Railhead mid-haul: stand at the old head, or wait at the signal?** Recommended: the old head.
2. **Reset to v60 for this alone?** Recommended: yes, own commit, unless a playtest is on; nothing in flight bumps.
   (Answered 18 November: yes; the number is v61, since separate capacities took v60.)
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
