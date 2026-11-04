# Proposal: cart first, then trains

**Bounded experiment; owner decision needed. Nothing here is approved.** Reviewed 4 November 2026 against `326dda13`. Serves [DESIGN.md](../../DESIGN.md) **1. Toys before chores** and **11. Show, don't tell**. Goal: want the train before repairing it, then keep using what it makes possible.

## Recommendation and evidence

Make the first vehicle an unmistakable **open timber work cart**, pushed by the little guys: low flat deck, exposed wheels and visible logs/rails, no locomotive cab, boiler or chimney. Keep its useful service. Reserve the engine silhouette, steam wake, passenger stops and bulk consists for the train. Reuse the existing cargo/deck behavior; this is not a new driving simulation.

The [direction view](../direction.md) and [worked answer](../research/game-direction.md#2-we-want-a-cart-first-then-trains) propose this comparison, not adoption. Their old “trees in progress” status is superseded by the [as-built run](../game-design/place.md#the-run): ordinary trees are finite and choppable everywhere; the cart brings rails from Line 2 station 4 (Q4), with the existing 13 m/s bonus when manually loaded and ridden in co-op, versus 9 m/s automatic service. The [tracker](round-4-notes.md#trains-and-cart) still needs the owner's replay.

**The train's job is sustained bulk supply, visible town growth and comfortable return travel across the network.** It is no longer the first way to get rails delivered. Keep the cart's frontier service and final hand carry; the 20 m/s train finishes the forge, grows the town and brings the pier's 32 logs/32 rails in eight crates. Speed alone is a weak promise: the recorded Far Head trip takes 36–68 s including waiting, versus 57 s sprinting ([measurements](../game-design/place.md#measured)). A train can lose that race while still being the wanted upgrade.

“Another train” needs an **unmet destination**, visible before repair: stage the existing pier kit beside the dormant outbound service, show its route toward the empty Far Head receiver, and make the boiler's matching engine socket readable. Then let loading, departure and unloading demonstrate that promise. This is a proposed presentation change; the current kit only explains itself after dispatch. No new objective arrow, explanatory speech or timer spectacle. Both lines currently unlock together: do not invent a separate second-train purchase.

## Smallest proof, then useful time

1. **After the corrected-loop replay and approval**, compare cart and train over the same existing village–Far Head route, with identical starting stock, deliveries, bills and other unlocks. Use their existing speeds/capacities as the explicitly tested capability difference; do not nerf the cart or increase bills. Observe anticipation before the boiler, and actual use of the larger delivery afterward. One line on what's new: “A little work cart becomes a bulk cargo train on the same route.” One gut question: **“was the train an upgrade you wanted?”**
2. **Only after that answer**, test fitting the boiler after Q3 rather than after Far Head. Keep the walking shortcut, axe, pack and cart rungs first. Let trains supply Q4/Q5 over laid track only; pier dispatch still waits for Far Head. Hold bills fixed and finish at the same pier, giving trains useful jobs without padding the ending. Partial-line service needs verification. The owner run allowed 3:19 after trains; the latest documented bot allows only **2:49.72** (18:01.81 to 20:51.53). Its **23:54** includes an optional tour.
3. Verify solo completion, partner departure, dependable cargo/decks and the visible promise before an owner playtest; then stop. Reuse the place bot and broker stills of the cart, dormant engine/kit and actual delivery. These are future checks, not evidence collected here. Owning implementation areas: `src/proto/place/{depot,cargo,props,rail,run}.ts` and the as-built place chapter.

Landed rails/trees/ride bonus: **met**. Integrated human relief and transport desire: **missing**. Earlier unlock preserving the cart's value: **unknown**. If the answer is no or unclear, revisit the train's purpose; do not add another tier. Keep the ability baseline fixed during this comparison. Roundhouse, fuel, driving and more areas remain deferred. The approved [production core](production-core.md) still starts with T1, without trains, after the replay; this proposal does not reorder it.

## Exact owner questions

- **Run the fixed-bill cart/train comparison after the corrected-loop replay?** Recommend yes; alternative: retain today's vehicles until that replay identifies a different problem.
- **If the upgrade is wanted, test boiler repair after Q3 so trains serve Q4/Q5 and the pier?** Recommend yes; alternative: keep the late unlock and accept that this slice only previews train play. Neither answer authorizes implementation until recorded.
