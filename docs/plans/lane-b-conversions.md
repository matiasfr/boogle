# Lane B conversions at Home

## Goal

A guest with a starter axe can help a friend finish a rail-only leg bill. Eight logs given at the Village yard make four rails at the lit forge when the bill needs four. The guest sees the forge puff, the train carry the rails, and the bill advance on delivery. This serves DESIGN principles 6, 8 and 11. The owner approved the rail pour on 28 November.

**Research.** Shared construction calls for one player's work to change what another can do next. Rail network depth recommends automatic service. Keep the existing gift train and give the guest a visible result at Home. [Shared construction](../research/shared-construction.md) · [Rail network depth](../research/rail-network-depth.md)

## Design

At Home, use the existing yard Interact on keyboard, pad or touch. A rail deposit goes into the Village yard's rail bin. A log deposit goes onto the existing recovery rack. Show the existing gift prompt and Thanks when the donated material can serve an eligible bill. When the log bill is full and rails are owed, a standing kit train takes available donated rails first. The forge converts pairs of rack logs for the remaining rail seats. A single log waits on the rack. A solo player may leave after the deposit. A friend can continue feeding the same frame by hand during transit.

Use the existing home-kit legs and stock-first exclusions. Keep each material's reservation per line and re-read the actual deficit on arrival. A full kit car can exchange ordinary rails for donated rails, returning the displaced rails to the forge rack. If the bill closes during transit, bring unspent gifted rails back to the Village rail bin. The line's carrier and deck limits apply throughout.

**Authority and wire.** Use the existing authenticated, reach-checked, predicted `rail.haltPut { yard, kind }` and its accepted quantity. The server owns deposits, train ticks, fills and checkpoints. Keep the forge's scheduled production separate from a saved cumulative conversion count on Rail. Save and replicate `Train.giftRails` as the subset of aboard rails reserved for direct delivery. Existing bins store the queue. Derive views from accepted rows, suppressing historical effects on initial snapshots. A refused or corrected prediction cannot cast a rail. No new controls or command.

**World and deploy.** The review fix rebased onto Lane C Part 6's v87 and takes v88 in src/world/namespace.ts. The saved bill identifier keeps returning cargo out of both the next frame's pour and its reservation. Existing live admission checks require matching world and build. The eventual ship runs the empty-production-room bump gate.

## Steps

- [x] 1. In src/sim/railway-components.ts, railway-queries-gift.ts, railway-queries-route.ts and railway-sys-route-kit.ts, extend reservation, loading, service stops, pouring and returns to both materials. At load, debit exactly two logs for each converted rail, after bounding by bill deficit, capacity and whole pairs. In railway-sys-yard.ts thank eligible donors. Use legFill for both materials and keep the barrier check. Exclude marked rails from ordinary rack and relay unloading. Audit declared system accesses. In railway-queries-line2.ts and railway-check-{route,line2,steel}.ts count twice the conversions as spent logs, and scheduled plus converted rails as produced. Track loaded rail credits through pours, returns and exchanges. Require integer marks bounded by cargo on leg-kit carriers. Add the world bump.
- [x] 2. Extend test/railway-gift.test.ts with eight logs to four rails, direct gifts, one odd log, a one-rail deficit, competing carriers, a full carrier, player feeding during transit, a shut barrier, branch-line delivery and restart with marked cargo. Assert every source and destination and run railwayCheck through delivery. In server/test/railway-host.test.ts drive a real r:edit at Home against a rails-only Stack bill. Check acceptance, remote refusal, duplicate request, both clients' snapshots and the bill after train arrival. Refresh schema, replay and seed hashes only after comparing op results, step order and marks. Run the full server suite and test:net.
- [x] 3. Extend src/sim/railway-seed-route.ts with an audited rails-only Stack fixture derived from gorge-open by feeding the existing log bill. Preserve ordinary seed inventories and grants. Check dev/look/bots/railway.ts and coop-unlock.ts against the actual yard prompt. Reuse the existing yard activity mark. Register any added mark in dev/loop/graph.ts. Run the loop through the ending and the affected bounded seeded segment.
- [x] 4. In the existing yard, forge and train views, show eligible rail gifts, one conversion puff per observed batch and visibly distinct rail cargo. Extend the frame arrival flight to rails. Update the halt-yard game-design section. Last, append the rail count to the station board's existing on-the-way list, coordinating with Lane A4. Take one look still framing the working forge during the eight-to-four conversion. Run node dev/ship-check.ts at each step and on the rebased tree.

**Desktop witness.** The `stack-gift` look seed feeds Stack’s log bill, gives eight logs at the Village and stops with four converted rails aboard. The Village board shows “4 rails to frame” while Ring Island’s separate steel bill still reads 0/12 rails. [Village board](lane-b-conversions/village-frame-rails.png)

**Checks.** The `stack-rails` seed starts at 20 logs and zero rails fed. The browser segment reached High Gorge. The host-rule loop reached the ending for one through four players. All 24 gift tests and 446 network checks passed. The full server suite passed 424 tests and skipped two. Across 8,620 host trace records, only 205 checkpoints and 5,679 status samples changed. The operation sequence and accepted quantities stayed the same.

## Level, seed and risks

The Village bin and forge already exist. There is no placement, movement change or new reach claim for level-check. The loop's stack-1 node requires the rivet and bills 20 logs and 20 rails. A seed with 20 logs fed and zero rails fed isolates the rail-only case without bypassing the rivet. A cold join should see the current cargo and bill. Replaying the forge puff on join would falsely signal a fresh conversion. Full kit cars and transfers while a carrier is away are the highest-risk conservation cases. The board list overlaps Lane A4.

## Design review (2026-11-28)

| Call | Kind | Source or recommendation |
| --- | --- | --- |
| Give credit by name on the room board | Decided | [Course change](../decisions-core-loop.md#d-2026-11-27-course-change) and the existing Thanks rule |
| Two logs cast one rail for an eligible rail-only bill | New | Requested Pass 2 item 1 and the [brief's question 4](../brainstorms/lane-b-any-work-counts.md). Use full pairs and leave the remainder. |
| Gifted rails, carried in or cast, pour on arrival | Decided | Owner, 28 November ([entry](../decisions-rewards.md#d-2026-11-28-gifted-rails-pour-too)): the November 27 exception extends to these rails. |
| Use donated rails before converting logs, return surplus rails to the Village bin | Default | A player can retrieve unspent gifts and the forge consumes only the logs needed. |
| Signal the accepted conversion with a forge puff and reuse the gift prompt | Default | The brief's physical cue shows a guest what their logs did. |

**Finding and owner question.** The Pass 2 brief measures success by the *rail bill* advancing while the guest stays at Home. Unloading rails as ordinary kit would still require a player at the frame and would duplicate kit already supplied. Step 1 therefore calls for a second material in the direct pour. The [November 27 decision](../decisions-rewards.md#d-2026-11-27-gifted-logs-pour-into-the-bill) explicitly limits its exception to “these logs only.” The [November 28 refill](../decisions-process.md#d-2026-11-28-empty-queue-is-refilled) selects Pass 2 for work but does not amend the material rule. **May rails given at Home, including rails cast from gifted logs, pour directly into eligible leg bills on train arrival?** Recommend yes. Other cargo and gates keep their existing handling. **Answered 28 November 2026: yes**, "rails can be gifted as well" ([entry](../decisions-rewards.md#d-2026-11-28-gifted-rails-pour-too)).

**Counts:** 1 Decided, 2 Default, 2 New. No new words proposed for the screen.
