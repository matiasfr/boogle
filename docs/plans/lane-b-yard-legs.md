# Yard legs

At Home a guest gives logs using the existing Village bin. Line 2 takes a strapped bundle to High Gorge. The first incline frame stands at that stop, so the feeder can pour there on arrival. For incline section two and the causeway, a north�south train collects the marked logs at the Gorge and pours them at the railhead or Bell Rock. The guest can stay at Home. A friend can supply rails and open the barrier while the bundle travels. This extends DESIGN principles 6, 8 and 11 along the existing freight route.

## State and delivery

The authenticated, reach-checked and predicted rail.haltPut command still moves the accepted quantity off the guest's back. Existing receipts correct refused predictions. The server's train tick owns every subsequent transfer. Save, hash and replicate an integer LegYard.gift subset of yard logs. Track each marked log exactly once across both fleets and the yard in Rail.giftOut. Reserve against the actual open section only. Recheck room on arrival, refund excess, respect carrier limits and permit a marked load to replace minted cargo when carriers are full. Use legFill so a full bill still waits for its barrier. No additional action, control, activity mark or grant.

Main d0075e83b uses v83. The schema takes v84 with a dated entry. Live admission checks the server build and world before joining. The eventual release needs the existing empty-room gate. Recheck the namespace at rebase.

## Steps and risks

- [x] Extend railway-components, railway-queries-{gift,route}, railway-sys-route-kit and railway-check-route. Test the three destinations from incline-open, incline-mid and causeway-open with exact bills, yard and train balances. At a full car exchange ordinary cargo, with its production and loaded credits, to leave room for a gift. Check the first incline before branch trains can run and the causeway after kit has already arrived.
- [x] In server/test/railway-host.test.ts send a real guest deposit at the Village and check the resulting name and quantity. Refresh schema-dependent hashes and compare seed stages, op results and tick order. The existing seed grants and bot interaction IDs continue to apply. Run the full server suite, test:net and the headless loop.
- [x] Reuse the bin, board and deck reads. Adapt gift-deck's frame flight for the first incline's feeder. Count logs waiting in the relay on the board. Update the halt-yard design chapter. Capture one proof still and run ship-check.

The first incline is the only co-located feeder/frame. Treating every feeder stop as a pour would complete the delivery to Bell Rock remotely. Check partial hand feeds and gifts left at completion so the cleanup cannot refund a minted log as a player's gift. Existing halts, frame sites, keyboard, pad and touch interactions carry over. There is no new placement or copy.

## Design review (2026-11-28)

| Call | Kind | Basis |
| --- | --- | --- |
| Pour only logs against the open frame bill, retain barrier and hand-fed kit | Decided | [27 November gift decision](../decisions-rewards.md#d-2026-11-27-gifted-logs-pour-into-the-bill) |
| Carry the bundle over both train services for remote yard frames | New | Lane B Pass 2 item 2. The automatic relay preserves the shared-construction payoff without a dispatch chore. |
| Pour directly at the first incline when the feeder reaches the frame | Default | The incline-1 loop shows the frame at High Gorge and the branch opens after that lay. Waiting for the branch would strand the gift. |

Review finding incorporated in steps one and three: the first incline and the causeway both have zero sections laid when they open, but only the incline frame is at the feeder stop. Compare their actual stops. No owner question. The conversions plan's rail pour is independent.

## Built and checked

The incline-open and incline-mid witnesses each deliver eight logs. At causeway-open the six-log bill draws six from an eight-log gift. Reloading a snapshot with those six in the Gorge yard and feeding the frame by hand returns the reserved logs to Home. The host accepts a guest's Village deposit under their own name.

All 85 seed stages start on the same ticks. The scripted op labels and results, tick-order sequences and M12 frame and mark counts match the previous fixtures. The headless loop reaches the ending and the network suite passes 411 checks. Existing station-board step types already cover both legs. The look-only incline-gift seed saves the world after the guest's delivery. [First incline frame after delivery](lane-b-yard-legs/incline-gift.png).
