> **Status: proposed (2026-11-16).** Light brainstorm: one agent, three lenses. Docs only; no owner decisions recorded.
> Baseline: fetched/rebased main `4bde3a35f`, world v54. Supersedes no rules; follows [town-choice](../plans/town-choice.md).

# Eight plots, different towns?

## Pitch and gut question

Let each staked plot hold a chosen building: neighbours, source crew, or a place to spend fares.
Walking the Round shows what was given up. Serves [DESIGN 6, 7, 8 and 11](../../DESIGN.md).
**Gut question:** after both early plots are built, can friends point to a benefit they deliberately left out?
**Disposition: bounded experiment, not an eight-slot solution.** Compare **two houses versus house + loader yard**.

## Economy anchors and provenance

| Fact | Number and source |
| --- | --- |
| Physical space | **8** bought slots, plus **4** fixed buildings; [TOWN_SLOTS / TOWN_PLOTS](../../src/place/town-plan.ts). Fixed buildings do not consume these eight. Numeric plots 0/1/2 map to `plot3`/`plot2`/`plot1`; the first is beside the hall |
| Actually offered today | Only **3** priced plots; delivery thresholds **8/0, 24/0, 40/16** timber/stone; at most **2** staked unbought. [TRADE](../../src/sim/railway-trade-layout.ts); five further prices/thresholds do not exist |
| Land/building bill today | Bases **300, 800, 3,000** × `railPricePct=50%` × **2 per bought plot**: ascending purchases **150 + 800 + 6,000 = 6,950**. [plotPrice](../../src/sim/railway-queries-trade.ts), [tune](../../src/sim/tune.ts) |
| Passengers | **2** starting income buildings; each completed house adds **1 rider/minute at each end**, not one total; **4 seats/train**, crowds cap **24/end**. Completion **100 ticks = 10 s**. [TRADE](../../src/sim/railway-trade-layout.ts), [tradeTick / boarding](../../src/sim/railway-sys-trade.ts) |
| Fares and Till | Per trip: **2 + floor(distance metres / 100)** at fare 100%; paid on alighting. `Till.landed + lost` counts gross collected fares; only `landed` reaches the box. Box cap = max(**20 × demand income/min**, **1.5 × dearest staked offer**); one shared wallet. [queries](../../src/sim/railway-queries-trade.ts), [Till](../../src/sim/railway-components.ts) |
| Historical house payoff | [town-choice §2b](../plans/town-choice.md#2b-what-works-plot-2-is-the-loader-yard-a-works-building-and-the-loader-loads-every-train): about **36 → 52/min** at `q6-done`, hence **150 / 16 = 9.4 min** after completion; not a rate for every later house |
| Historical loader payoff | Same source, main `a71077c4b`: solo Pier **182 → 155 s (27 s)**, Ring **339 → 203 s (136 s)**. Trio **164 → 138**, **315 → 193 s**; trio carry pace was assumed, not human-measured |

The prior planner's accepted-rule runs have **no committed scratch scripts**: historical evidence, not rerun proofs.
[town-economy-visible](../plans/town-economy-visible.md)'s opening status is current; its v52 table is historical.
The offline [trade model](../../dev/economy/trade-model.ts) and [data](../../dev/economy/trade-data.ts) use stand-in
cycle times/percentage cuts, so cannot establish a new building's real savings.

## Four candidates, with the weak ones exposed

**Proposed price rule:** keep the plot's current bill `P(k,b)` above for its land/shell, regardless of type; add an
equipment premium **H 0 / L 250 / W 150 / M 100** at room 50%. Premiums are **estimates**, canonical bases twice those
values, scaled by `railPricePct` but not the town's doubling. All first purchases consume one plot and double later
land bills; retyping does not. This separates location from benefit without hiding the existing 6,000 gap.
Only H repeats; L/W/M are **one effective installation each**. Payback divisions are rate estimates, not buy timelines.

| Building | Benefit while it stands; first-plot price | Payback / opportunity cost | Read through objects and physical signs, no hovering explanation |
| --- | --- | --- | --- |
| **H: house** | +1 rider/min each end; **150** | Current Q6 first house **150/(54−36)=8.33 min** after completion; historical run **9.4 min**. Second ascending buy **800/18=44.4 min**. Income payback is **infinite if seats or box bind**; storage still grows below | Existing roof, door, rider silhouette and `+1/min each end` on its board; extra waiting and boarding figures |
| **L: loader yard** | At the Works, every eligible empty line 2 deck loads footings, up to **6**, as in town-choice; no riders; **400** | No Boogle repayment. First solo Pier+Ring saves **27+136=163 s** if built in time; **400/163=2.45 Boogles/s saved**. Versus H on the same plot the premium is **250**, and its rider stream is lost | Jib/footing silhouette in town; an arm at the Works visibly loads a second train; footing icon, **6**, train icons on board |
| **W: Works workshop** | Source rack **6 → 12** while staffed; no riders; **300** | Alone the old instant-carry probe saved **0 s**; **not worth a slot alone**. With L, solo Pier **155 → 139**, Ring **203 → 164**: **55 s** combined, **300/55=5.45 Boogles/s**. Conditional third type, not an independent early pick | Rack silhouette and two rows of six footing forms; physical **6 → 12** board at source and model at town workshop |
| **M: market** | Optional shared civic display: **50** buys **5 active minutes** of a pennant/display set on the green, only while M stands; no riders/materials/permanent unlock; **250** | **No cash repayment**; value is communal display, unmeasured. Recurring **10/min** sink; at historical 36/52 fares, 50 takes **1.39/0.96 min**. Does not solve route progression or prove a slot is desirable | Open stalls, sample pennants and a physical **50 / 5 min** board; set appears where people gather and packs away on expiry |

W is **source-side**: garage rules already require materials and allow free Quick/Strong swaps; those later steps are unbuilt.
M is a candidate civic sink, not priced outfits or Bell Rock's market. Neither is proven fun; this set fails the
stronger demand that all four types already be independently worth a plot.

## Dominance: eight slots do not themselves create scarcity

**New demand probe on this head**, Node 26.13.0: same saved route for each H count, **5 active minutes warm-up,
10 measured**, no purchases or work. Only in-memory `TRADE.startBuildings = 2+H` changes; this is a capacity
counterfactual, **not eight legal bought plots or an implemented loader**. Fares are **9** at Q6, **13** at Ring.
Values are sampled gross (`landed + lost`), not banked income; Ring's finite window includes arrival phase.

| Added houses H | Q6 demand / collected per min | Ring demand / collected per min |
| --- | --- | --- |
| 0 | **36 / 36** | **52 / 54.6** |
| 1 | **54 / 54** | **78 / 81.9** |
| 2 | **72 / 72** | **104 / 106.6** |
| 5 | **126 / 72** | **182 / 135.2** |
| 8 | **180 / 72** | **260 / 135.2** |

Reproduce from repo root; nothing writes game files (default room tunables):

```sh
node --import ./dev/sim/hooks.ts --input-type=module <<'NODE'
import { buildSeedWorld } from './src/sim/railway-seeds.ts';
import { advance } from './src/sim/railway-seed-route.ts';
import { restore } from './src/sim/railway-drive.ts';
import { TRADE } from './src/sim/railway-trade-layout.ts';
import { Till } from './src/sim/railway-components.ts';
for (const stage of ['q6-done', 'ring-joined']) {
  TRADE.startBuildings = 2;
  const seed = buildSeedWorld(stage);
  for (const H of [0, 1, 2, 5, 8]) {
    TRADE.startBuildings = 2;
    const s = { w: restore(seed.w), t: seed.t };
    TRADE.startBuildings = 2 + H;
    const gross = () => { const r = s.w.get(Till, s.w.single(Till)); return r.landed + r.lost; };
    advance(s, 3000); const before = gross(); advance(s, 6000);
    console.log(stage, H, (gross() - before) / 10);
  }
}
NODE
```

Let `K` be the common land bill for eight purchases in the same order. Its first three terms total **6,950**;
the other five are **unpriced**, so an eight-town acquisition time or total price would be invented. Compare final
allocations with that common cost held fixed; this is not a claim they can be bought in today's game.

| Allocation (8 occupied) | Purchase bill | Added demand each way | Till cap Q6 / Ring, all offers bought (derived: 20 × demand) | Solo Pier + Ring with timely services |
| --- | --- | --- | --- | --- |
| All houses: **8H** | `K` | **8/min** | **3,600 / 5,200** | No services: **182+339=521 s** |
| House-led, one of each: **5H+L+W+M** | `K+250+150+100 = K+500` | **5/min** | **2,520 / 3,640** | Loader + rack 12 + display: **139+164=303 s**, historical combined probe |
| Works-heavy: **2H+3L+2W+M** | `K+750+300+100 = K+1,150` | **2/min** | **1,440 / 2,080** | Same services: **303 s**; duplicates add **0**, not 3× faster |

**Result: no universal winner; the intended eight-slot scarcity is unproven.** 5H and 8H collect the same **72/min**
at Q6 and **135.2/min** at Ring. The mixed town fits every distinct service alongside enough income houses, but costs
**500 more** and stores **1,080 / 1,560 fewer Boogles**, so does **not** dominate all houses on cash or storage.
Storage-versus-services is a standing trade by formula, but no useful need for that extra storage is measured:
with offers remaining, **1.5 × dearest** already guarantees room for the next bill. Works-heavy is dominated by mixed:
**650 dearer**, same work/display, smaller box, same Q6 gross and **28.6/min less** at Ring. The flow-economy still
suggests “buy the useful services, then houses”, not more than eight competing useful instances; duplicate services
are redundant and L/W stop helping after the footing jobs. Do not promote this into a solved scarce-town design.

**What must change:** demonstrate useful marginal house income at the intended fleet/route, a desirable repeatable
fare sink, and more than eight **simultaneously useful** building instances. Source-specific crews at later hubs
could supply that competition, but “assign N trains to each yard” adds routing/quotas and is not recommended here.
Do not invent eight stackable speed tiers, withhold normal train seats or multiply footing bills to force scarcity.
The [garage trade](../decisions-core-loop.md#d-2026-11-15-garage-trade-answers) instead trades two useful capabilities
on one running line; a pair of repeatable, competing town services might ultimately be a better model.

## Changing your mind

Recommend **50 Boogles + max(0, new premium − old premium)** per rebuild, no refund; **10 s** construction, existing
plot entitlement kept. Estimates: H→L **300**, L→H **50**, H→M **150**. Flat fee alone is **1.39/0.96 min** at 36/52;
it discourages casual churn without permanent regret. Permanent buildings punish an uninformed shared purchase;
free instant rebuilds encourage H while idle, then L just before a train arrives.

The **slot invariant**, not the fee, prevents owning everything together: `H+L+W+M ≤ 8`; one active type per plot,
no stored building inventory/unlock. Disable old effects on acceptance; start new ones only at completion. M's
display stops on removal. W shrink must retain existing stock safely while draining to 6; cargo already aboard
still arrives, but L loads no more. Existing cash survives a cap fall; further fares cannot land above it.
Players can still **sequence** H then L and retain already earned money/delivered footings; no finite fee can erase
past payoffs. If that is also meant by “own everything eventually”, this rebuild rule does **not** solve it; permanent
plots or a service whose useful trade persists throughout play would be needed. Do not sell a rebuild fee as scarcity.

## Three lenses, ranked suggestions and tension

| Lens | Three strongest suggestions, ranked |
| --- | --- |
| Play designer | **1.** Compare 2H with H+L after both buys, not fixed H then L. **2.** Show the unchosen benefit before paying. **3.** Keep solo yard payoff and co-op parallel construction in the same proof |
| Systems architect | **1.** Derive services from completed typed Plot rows, not permanent upgrade flags. **2.** Keep price, staking, selection and replacement distinct. **3.** Add only the two early types before expanding the catalog |
| Creative director | **1.** Town silhouettes match the source operation. **2.** Turn the existing stake board into a physical two-sample chooser. **3.** Frame town and actual second-train delivery, with existing construction sound; details and character jokes later |

Tensions: W needs L; M's appeal is unproven; eight slots lack five bills. Recommend the **two-type experiment**, defer
W/M and eight-plot pricing. The [first-line fork](first-line-choice.md) and [crossing probe](../research/first-line-crossing-probe.md)
show why order alone is insufficient; [growing towns](../research/growing-towns.md) supplies cargo causality.

## Shape and rough change sizes (not a plan)

Shared choices, bills and benefits are **Server**; signs, silhouettes and arm motion are **Local views** over replicas.

| Change | Size | Rule/state owners and WORLD_NS |
| --- | --- | --- |
| Typed first buy, any type on either early plot | **M** | Add integer `kind`/`revision` to `Plot`; extend `rail.buy { id, kind }` through sim, intent adapter and server validation; complete mirror/save/hash schema. **Bump** for state/wire/catalog; allocate next free NS, not a promised v55 |
| Benefits follow completed buildings | **M** | `townBuildings`, `tillRate`, `plotPrice`, `boxCap`, trade/Works queries; distinguish rider houses from plot count; audit `town-facts.ts` against existing resident lines. Loader eligibility/owed counts as town-choice. **Same bump** when delivered together; later rule/catalog breaks bump again |
| In-place rebuild | **M** | Draft command with expected kind/revision; atomic Till debit, safe stock/cargo handling, `at` construction tick. Accumulate plot `paid` on rebuilds; preserve `Till.spent = sum(Plot.paid)`. M's spending would need its own ledger and revised invariant. **Bump** for new op/state meaning; no migration |
| Readable selection, construction and source payoff | **M** | `src/entities/town/plots.ts`, `town-read.ts`, existing site show, train/Works views, prefab records + compiled JSON. Keep `TOWN_PLOTS` order and freight staking; preserve shell hull/roof routes. **No extra bump** for Local views |
| Eight-slot catalog and W/M if justified | **L** | Author five missing bills/delivery gates, price-cap offers and service definitions; M needs saved active-time/expiry and spend. **Bump** for catalog/ops/state. No need to implement these to compare the first two slots |
| Evidence and owning docs | **S–M** | Extend headless economy/loop data, pure rule conservation/replay/race/save checks, two-client buy/rebuild contract, [as-built town section](../game-design/place.md#town-economy-in-the-live-game-16-november-2026-v54). **No bump** for tools/prose |

No `npm run inflight` job touches these docs. The orchestrator reviews; a planner writes a plan if the owner says yes.

## First slice and done means

**Two types on the first two plots**, same freight thresholds, positions and land doubling. H adds riders; L gives
no riders and supplies the all-train loader; max one useful L. Compare **2H** with **H+L** with both plots complete,
not “H then L” versus “L then H”. Keep plot 3's existing house offer and 6,000 bill visible: it eventually relaxes
the small-town constraint, so this slice tests a local decision, not the eight-slot promise. No W/M or new characters.
In fixed ascending plot order, **2H costs 950; H+L costs 1,200**, including the estimated premium. Q6 sampled gross
is **72 versus 54/min**: 2H costs **250 less** and projects **540 more over 30 active minutes** after both stand;
H+L buys the historical **163 s** of solo footing savings instead, if both jobs remain. This is a concrete two-slot
trade, with no Boogle conversion of the saved time; interleaved acquisition/work still needs measurement.

For the future builder: `look --rail-seed house-ready --eval <setup>` advances accepted fares to the compared price,
then builds each allocation with accepted typed commands; capture both boards from the hall and the town street.
`look --rail-seed wagon-on --eval <same bought allocation>` captures a second train carrying footings and the
missing rider stream; repeat at `deck-laid`, with solo and three-player handling. These typed setups **do not exist
yet**. Record gross, landed and lost fares separately and matched remaining bills, then reload/join and race a buy.
**Done:** visible chosen/missing benefit, one saved allocation, no double spend; measured 2H must earn more than H+L
while the latter reduces a real wait. If either marginal benefit is zero, report dominance and stop enlarging this fork.
The feeling question needs owner feedback; it does not hold the docs or subsequent authorized work.

## Conflicts and rules to retain

| Recorded words, linked | Assessment / recommendation |
| --- | --- |
| [“each next house in a town costs twice the last”](../decisions-rewards.md#d-2026-11-11-boogles-prices-are-stand-ins-to) | Typed plots and equipment premiums change the all-house model; counting all first plot purchases for doubling and not rebuilds is a **new recommendation**, not his call |
| [“the prototype's first buy is a house”](../decisions-rewards.md#d-2026-11-11-boogles-the-five-open-questions-answered) | L on plot 0 changes that; recommend allowing the alternative because 2H versus H+L is the test, state the exception explicitly |
| [“anything on rails costs materials”](../decisions-rewards.md#d-2026-11-10-boogles-build-houses-and-upgrade-sources) | Source loader/rack comply; a garage workshop discount, extra car or faster engine bought with Boogles would change it. Leave those out |
| [“with no routing or quotas”](../../DESIGN.md#the-core-loop) | A building/type choice is compatible; per-train allocation controls are a real conflict. Reject that extension on play complexity, not merely precedent |
| [“network-wide purchases and never sells materials”](../decisions-rewards.md#d-2026-11-12-market-hub-answered), [“the shop stays free”](../decisions-rewards.md#d-2026-11-10-open-calls-answered-riders-and-boogles) | M would be local civic display, not Bell Rock's market or paid outfits; new scope still needs his verdict |
| [“Signs in the world before hovering text”](../agents/owner-calls.md#world-signs), [“Mechanisms, then systems”](../agents/owner-calls.md#mechanisms-systems-greybox-details) | Physical boards and plain shells first; no new barks/residents/interiors as part of this slice. Preserve rooftop routes and the hall-first plot |

## Owner questions

1. **Recommended: test 2H versus H+L on the first two plots; do not call the full eight-slot design solved.** Accept this bounded slice, or require a lasting whole-town service trade first? Answer: ___
2. **Recommended: allow H or L on the hall's first plot**, replacing the first-house-only expectation, with the proposed 250 equipment premium. Keep that exception? Answer: ___
3. **Recommended: 50 plus positive premium difference to rebuild**, active benefits only; accept serial past payoffs. Or require permanent plots? Answer: ___
4. **Recommended: park W and M** until rack value and voluntary civic spending are demonstrated; later investigate source-specific ongoing services for eight-slot competition. Want that direction, or a garage-side candidate despite its unmeasured value? Answer: ___

**Parked:** later-hub source crews; civic display market; garage conveniences; permanent district identities.
**Placeholder strings for the owner:** “House”, “Loader yard”, “Works workshop”, “Market”, “Rebuild”, “50”,
“5 min”, “+1/min each end”, “6 → 12”; numeric prices/counts follow existing boards. No Boogler copy changed;
suspect existing town “new neighbours” triggers on non-houses need his review, not automatic rewriting.
**Not measured:** rebuilt loader/rack on this head (scratch unavailable); mixed freight/rider effects; new premiums,
rebuild behavior, market appeal, workshop/garage benefit, five later plot bills, human understanding, visuals/motion/devices.
