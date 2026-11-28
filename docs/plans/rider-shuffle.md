# Rider shuffle

At a busy line 2 halt, a little guy rises from the bench, turns into the aisle, walks through the nearest platform-side doorway and steps down. They walk away past the queue. In the other direction a waiting figure leaves its place, climbs the lowered step, turns down the aisle and sits at its assigned window. The moving feet explain the change from either player's viewpoint. Principle 11, Show, don't tell.

## Build

The 27 November build signal moved implementation ahead of the lap join. Rebase after the join lands and repeat a stop still on the joined line.

1. Read the rebased train pose and queue code again. Today railway-sys-trains calls ridersArrive on arrival and ridersBoard while standing. railway-trains can turn and invoke both in one tick. Drive only the observed net difference in Train.riders across a continuous live arrival or stand. Equal counts show no exchange. Use the last occupied seat slots for departures and the next vacant slots for boarders. First observation, restore, skipped stop history or a discontinuous snapshot establishes the current seats and queue immediately, including a full coach. A continuously observed multi-seat delta can walk as a group.
2. Put the walk in src/entities/railway/rider-shuffle.ts. Copy actual queue positions from riders-view.ts's crowd.at (it returns a reused point). Match the existing platform and selected coachStepSide, then pick the nearest hinge along that side for each seat in COACH_SEATS. Pass through the aisle, threshold, lowered tread and platform edge in order. Resolve coach landmarks through the rider car's rock matrix and platform positions in world space. Use folk.ts's existing steer for the platform leg. Reserve each moving figure once across the queue, walk and seat poses in the existing folk pool, including when both railway views update in the opposite order. Restore or disposal releases reservations.
3. Use the first quarter-second of the normal 50-tick (5 s) dwell for the existing step to lower. Start groups in seat order with a small stagger, let walkers overlap, and aim to settle the last rider by the fourth second. An extended hold can show a fresh observed boarding delta. Departure immediately settles everyone to the replicated occupancy before the coach moves. Reduced motion, a camera beyond the folk draw distance, or a queue on a moving deck disconnected from the stopped coach uses the same instant settlement. Coming back into range shows today's seats.
4. Keep the two busy files small. Expected additions to halts-view.ts: zero lines. riders-view.ts owns the queue and will supply the queue samples. In train-view.ts replace the rider-count-only update with the following per-frame call, plus one call in restore. Expose these through the existing folk facade in folk.ts, where the walk pose must take precedence over the seated transform. Keep the existing cleanup through setRiders(slot, 0, null).

       folk.folk.updateRiderShuffle(tr.slot, riders, tr.riderCar, row, tr.coachSteps, tr.coachStepSide, tick, dt);
       folk.folk.resetRiderShuffle();

5. Verify the new helper against arrival, unchanged count, partial/full exchange, interrupted walk, late join, reload, far camera and reduced motion. Check exact final seat and waiting counts against both rows. Update docs/game-design/trade.md with observed behavior. At a busy Home halt with two clients, frame the queue, step and windows clear of the canopy post. Capture one still sequence across real count decreases and increases (use consecutive visits if necessary): before, threshold, foot on tread, after. Make one real-time clip of the exchange through departure. Verify the second viewer's doorway side and final counts. Use `--warp-speed 2` for two-player warp looks and normal playback for the clip. Check feet, duplicate figures and any rider left behind. R4 showed seat counts and folding steps but its post and bench obscured foot contact. These captures address that gap for NPCs. Device playback, player boarding and performance under load need separate evidence.

## Implementation notes

The platform leg uses the queued figure's actual spot and the existing `outOf` footprint clearance for its walk-away endpoint. Folk's `steer` also pulls the walker toward terrain height. The shuffle instead samples the elevated platform and the coach's hinged tread in world coordinates. Queue slots use the remaining replicated waiting count so an update to the train can run before the halt's redraw. A normal crossing takes three seconds after the step delay and seat stagger.

Two WebGPU clients watched live arrivals at Home from seeded busy platforms. Both saw eight boarders walk. On the return capture six of eight riders started stepping off, then one seat filled during the stand. The reduced-motion client showed two seated, then three, with zero walkers throughout. Both counted three seated at departure. The upper row of the [still sequence](rider-shuffle/home-exchange.jpg) follows boarding and the lower row follows alighting. At this angle the crowd sometimes hides individual boots. The local real-time clips are `.look/rider-shuffle/boarding.webm` and `.look/rider-shuffle/shuffle-exit/exchange.webm`.

A client reloaded during boarding and rejoined after departure with eight seated. A separate Home headway-hold fixture kept the same train at the same stop across a full page reload: arrival tick 5795 before and after, eight seated and zero walkers on the first ready read. The 32 seat, side and direction combinations reached the nearest tread and finished within four seconds in the path check. Device playback and timing under load are unverified.

## Design review (2026-11-27)

| Call | Kind | Basis |
| --- | --- | --- |
| Walk during observed rider changes at existing stops. | Decided | Owner's 27 November [backlog row](../backlog.md), scoped to presentation. |
| Seat riders in the dedicated coach at the existing windows. | Decided | [Dedicated coach and seat allocation, 16 November](../decisions-rail.md#d-2026-11-16-rider-coach-a-and-rework). |
| Use the nearest lowered doorway, stagger the group within four seconds and let leavers clear the queue. | Default | A visible tread crossing and a second to read the settled coach before normal departure. |
| Settle instantly on interruption, snapshot discontinuity, reduced motion, a distant camera or a disconnected queue. | Default | A returning observer or late friend sees the same occupancy without replaying a missed stop. |

Findings incorporated above: step 1 handles a same-tick exchange without inventing rider identities. Step 2 uses the queue's actual owner. Step 5 requires an unobstructed tread in response to the [R4 evidence](../research/rider-coach-r4.md). Solo and co-op use the same figures and counts. Riders gain no dialogue. Two Decided, two Default, zero New. No owner question.
