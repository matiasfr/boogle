> **Status:** planned 18 November 2026 (planner), not built. Base `origin/main` at `b0f4bb58`. Answers the open owner
> question "The railhead re-routes trains before the deck moves" on its recommendation: hold the re-route until the
> haul settles. Needs **`WORLD_NS` v60**. Not a port from Place.

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

- [ ] **1. The field, its tick, the re-route. Sim, high risk; Codex gpt-6.2-astra high.** Edit
      `railway-components.ts`, `railway-sys-ring.ts` (system, `ringFootSet`, comments), `railway-systems.ts`
      (`RAIL_TICK`), `railway-queries.ts`, `railway-queries-trains.ts`, `railway-check-ring.ts`, `railway-seed-ring.ts`.
      `test/railway-ring.test.ts`: `a pair leaves the trains' Railhead at the old head until the haul settles`; `at
      haulEnd a train standing at the old head leaves homeward; one running replans with no jump`; `a train arriving
      mid-haul stands its dwell at the old head`; `a pair inside the last haul's chock moves the stop once, at its own
      settle`; `a rivet struck before the last haul settles`; the 5,000-op fuzz checks the invariants.
      `test/railway-check-ring.test.ts`: each invariant refused. Verify: those, the re-pins, `node dev/ship-check.ts`.
      Review: a fresh Codex review delegate, gpt-6.2-astra high, a failing test per suspected defect.
- [ ] **2. Through a real server. Same row.** `server/test/railway-ring-host.test.ts`, real host, two sessions and
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
