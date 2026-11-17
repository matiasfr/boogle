# Trade

As built on main, 17 November 2026. This extends the town-economy section introduced by K2 (#1932), moved here
from Place rather than duplicated. The [slice plan](../plans/town-economy-visible.md) records its history.

## Freight grows the Village

Freight delivered by the running trains supplies the Village's plots. The Camp draws a brown timber stack and
the Quarry a grey stone stack, each with a goods-icon count board. Each pile draws at most eight crates in a
two-by-two-by-two layout; its board retains the exact stock count. The train's solid cargo deck draws replicated
freight in the slots left by kit cargo. At Home, freight disappears from the deck on the row change and the
delivered count supplies the plot piles below. There is no freight flight or carried journey from car to plot;
kit cargo keeps its separate unloading flights. These views add no shared state.
Sources: [yard stacks and boards](../../src/entities/railway/freight-view.ts),
[train view](../../src/entities/railway/train-view.ts), [trade rules](../../src/sim/railway-sys-trade.ts).

The unbought plots are empty outlined ground with door mats. Delivered materials grow a pile beside the next plot;
a complete delivery stakes its corners with red tops and string. Up to eight crates represent each pile, while its
board gives exact timber and stone have/need counts. The first priced plot is the one beside the hall (`plot3`),
then `plot2`, then `plot1`. Sources: [plots](../../src/entities/town/plots.ts),
[town layout](../../src/place/town-plan.ts), [blockout](../../src/place/town-blockout.ts).
These physical plot names are not offer numbers: the first board reads Plot 1. Cumulative deliveries for the
three offers are 8 timber; 24 timber; then 40 timber and 16 stone. At most two unbought plots are staked at once.
Freight opens offers; it does not buy them. [Numbers](../../src/sim/railway-trade-layout.ts).

## Riders and fares

Little guys wait beside the island and far platforms, board the trains and ride on them. At most twelve waiting
figures are drawn per end; larger crowds get a true-count board. Each passenger-route train carries up to **eight**
riders (`TRADE.riderPlaces`) in its dedicated coach immediately behind the four-seat players' car. Four riders sit
at distinct window openings on each side; places fill alternating sides. Riders no longer stand in the players' car.
Candidate A's Blender-built art keeps the blockout's 2.90 × 1.60 × 2.05 m envelope: a shallow dark arc roof,
red upper framing, four honey panels with contrasting bevelled frames and four honey-surrounded unglazed windows
per side, cream waist lining and solid ends with small inspection windows. Red lower outlines and brass handles
mark the outer door bays, with four separate folding steps. Only the actual platform-facing pair lowers while
standing (.25 s); it folds up over the same .25 s as movement starts. Steps have no collider. Players can stand on the unchanged flat roof collider but cannot enter; the
visual roof falls .12 m below that plane at its eaves. Eight exported seat landmarks preserve the blockout's
seating positions and alternating-side count order. Seating follows the coach's rendered pose; count changes happen
while the train stands at the route's Home or current far-end platform. This remains count-driven visibility,
without a door-walking animation. [R3 model and evidence](../research/rider-coach-r3.md). [R4 checkpoint and capture limits](../research/rider-coach-r4.md).
The timber train has no rider route and no coach; the garage's works copy also excludes it.
The Cars tile reads both numbers from data: "4 seats, 8 riders", with Seats 4 and Riders 8. Its description is the
placeholder "The knifeboard car seats 4 players; the riders' coach behind it seats 8." The coach does not consume a
boiler allowance; the existing boiler readouts now count 4 / 4 / 5 cars. [R2b measurements and evidence](../research/rider-coach-r2b.md).
The full six-train fleet keeps every car's wheels. Controller checks reach the coach roof at Home, Quarry and
Ring Island and while leaving Home. Quarry's canopy is also reachable from the existing cab; the tested exits
add no route. Held Home trains clear the turnouts, cart leg, quest frames and ridge trestle edges
([review measurements and proofs](../research/rider-coach-r2b-review-fixes.md)).
At the default rate, two starting buildings each generate one rider per minute in each direction. A completed
fare-raising house adds one rider per minute in each direction. Waiting riders are capped at 24 per end.
Each delivered rider pays 2 Boogles plus 1 per whole 100 m between the route ends, scaled and floored by the room's
fare percentage. More riders raise potential income, not the per-rider fare; capacity and service still limit what
arrives. The route follows line 2 to its current open far end; riders add no service stops in this slice.
[Rules and numbers](../../src/sim/railway-queries-trade.ts), [layout](../../src/sim/railway-trade-layout.ts).

## The till and strongbox

Fares fill the shared strongbox: inside the hall, against its north end wall, the ticket counter shows its balance and a coin
column proportional to its cap, with a fixed cap mark. Sources:
[riders](../../src/entities/railway/riders-view.ts), [till](../../src/entities/railway/till-view.ts),
[folk](../../src/place/folk.ts), [trade queries](../../src/sim/railway-queries-trade.ts).

At the defaults, the box cap is the larger of twenty minutes of calculated fare income and one and a half times
the dearest staked, unbought offer. Fares beyond the cap do not land. A reduced cap never removes an existing
balance. [Cap and rate queries](../../src/sim/railway-queries-trade.ts).

## The sack after time away

An empty hosted room pauses after its grace period. Its next wake applies the existing diminishing away-production
credit once. With trains running, away fares fill a separate sack, not the strongbox. New earnings stop at fifteen
minutes of calculated fare income; lowering the rate never cuts down an earned sack. The current default
house-built seed has a 42-Boogle/minute rate and an eight-hour absence fills its 630-Boogle sack. This is the
rule/seed result, not a completed empty-room/rejoin integration proof: see [K3](../reports/town-k3-checkpoint.md#away-host-proof).
Sources: [away system](../../src/sim/railway-sys-away.ts), [curve](../../src/sim/railway-away.ts),
[cap](../../src/sim/railway-queries-trade.ts), [seed](../../src/sim/railway-seed-trade.ts).

**The waiting sack (17 November 2026, town-economy-visible C2).** When the replicated till has away fares,
a tied coin sack stands beside the column on the counter. The board shows the box balance and `Sack <count>`;
within 3 m, one Interact press on `Empty` sends the existing sack intent. The sack, its count and the prompt
disappear only when the row reports the pour, and the column rises with the accepted balance. An empty sack
offers nothing; a joining player draws the waiting sack from the same row. The sack has no collider. The box's
existing balance display and column remain capped at its mark, even if a pour takes the actual balance above it.
The waiting sack's count is not clamped to the box cap.
`Empty` and `Sack <count>` are placeholders for the owner. No Boogler copy changed.
Sources: [till view and interaction](../../src/entities/railway/till-view.ts),
[sack prefab](../../src/prefab/builders/till-parts.ts),
[accepted sack-waiting seed](../../src/sim/railway-seed-trade.ts).

## Buying and building

When the box can afford a staked plot, a gold outline shows its house. Approach the board and hold Interact for one
second. Its board shows the benefit, price and box balance; an unaffordable offer gives the shortfall.
Only an accepted server purchase spends the shared box and starts construction. At the current 50 percent room
price, the first offer is 150 Boogles; after buying it the second rises from 400 to 800. The third offer's base is 800,
so after both earlier buys its price is 1,600. A box above a reduced cap retains its Boogles; further fares stop
landing until it has room. Historical `Plot.paid` values are preserved. The pile and board clear,
the house's floor, frame, walls and roof fall into place, and its closed shell stands after 100 ticks (10 seconds).
Little guys gather and use their existing town lines. A player inside the footprint is moved to its edge as the
hulls arrive. Reloads use the accepted purchase tick to resume or snap completed construction. Each completed
fare-raising house adds one rider per minute in each direction. Every bought building doubles the remaining prices
immediately, before construction finishes. Current main distinguishes the second offer (physical plot2): its board
shows `Every train`, its house shell still goes up and its loader jib enables at completion, but its riders value
is zero. The first and third offers each add one rider per minute in each direction. Loader completion marks its
Works benefit; carrying still waits for the wagon's commissioning. This is existing main behavior, not a K3 rule.
Sources:
[plot interaction and view](../../src/entities/town/plots.ts), [construction](../../src/place/sites.ts),
[buy rules](../../src/sim/railway-sys-trade.ts), [trade layout](../../src/sim/railway-trade-layout.ts),
[town facts](../../src/sim/town-facts.ts). Nothing on the main route requires this purchase.

## Copy and evidence

Placeholder copy, pending The Boogler: `Plot 1`, `Plot 2`, `Plot 3`, `Timber <have> / <need>`,
`Stone <have> / <need>`, `+1 rider / minute`, `Price <n>`, `Box <n>`, `Boogles`, `Waiting`,
`Hold to build`, `Hold <percent>%`, `Need <n> more Boogles`, `Waiting for town`.
Also retained for owner review: `Every train`, `Empty`, `Sack <count>`, `4 seats, 8 riders`, `Seats 4`,
`Riders 8` and the coach description quoted above. The existing residents' words and The Boogler's copy are preserved. Proof limits and commands:
[town checkpoint report](../reports/town-checkpoints-k1-k2.md).
The [17 November K1 evidence](../reports/town-k1-economy-seen.md) replaces that report's A1/still/unload gaps:
seven opened standing-height stills and a real-speed Home island arrival recording show the deck clearing and
the next plot's pile appearing. The motion sheet establishes the visible state change, not smoothness or feel.

[K3 checkpoint](../reports/town-k3-checkpoint.md): rooftop gaps, drawn-roof offsets, provisional performance and
the remaining away-host sack proof. Not tested on a device.
