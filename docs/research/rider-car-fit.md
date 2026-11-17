# Rider-car fit, 16 November 2026

> **Status:** superseded (reconciled 17 November 2026). **Verdict:** Historical fit measurements, not current Home rework instructions.
> **Recommendation:** Use the [rider-coach plan](../plans/rider-coach.md), which records the later Home-keeps-track scope and shipped clearance work.

**Verdict: does not fit without level rework.** Scope: the [dedicated-car decision](../decisions-rail.md#d-2026-11-16-riders-get-a-dedicated-car). A dedicated coach can board beside the player car, but the longest existing consist plus any candidate fouls Home's spur/exit arrangement at its present mark. Recommend **2.90 × 1.60 m, immediately behind the player car** (new index 2); keep the four player seats. Before building art, redesign Home's road 2/link and move the Ring Island stop as below. This is a fit recommendation, not approval of boiler limits or Strong's consist.

Measured at `fd9cd961` after `git fetch origin && git rebase origin/main`, Node 26.13.0, local `npm ci`. No shipping game code changed. The [10 November study](../plans/passenger-car-previz.md#against-the-halts-and-the-layout-tests) is the source of the +0.10 m forward / +0.20 m backward failures: it grew the *existing* player car, on older geometry. [Fourth-car R2](../plans/fourth-car.md#7-level-findings) subsequently moved Home line 2 to s 18.25. Today's 16 m table supersedes that study's 9.6 m table.

**Length derivation (design estimates, not a built seat/door proof).** [Folk geometry](../../src/place/folk.ts) has a 0.584 m hat brim across, 0.564 m along, approximately 0.99 m crown. Four rows of two, 0.62 m pitch, need `3×0.62 + 0.564 + 2×0.20 = 2.824 m`; two 0.62 m places + 0.20 m aisle + two 0.08 m walls need 1.60 m width. The FR Heritage Group's [1864 Carriage 2](https://www.festipedia.org.uk/wiki/Carriage_2) records 12 ft × 6 ft 8 in: 1.8:1. Applying that compact period proportion gives `1.60×1.8 = 2.88 m`, rounded to **2.90 m**. This is a period-inspired envelope, not a scale replica or an absolute packing optimum. 2.40 m misses the seating allowance by 0.424 m; 3.20 m has 0.376 m spare. Assume roof ≤2.10 m above rail, all eaves within 1.60 m, and existing 2.20 m axle spacing; changing those needs another sweep.

Notation: metres; **negative = overhang/deficit**, positive = spare. Stop s is the *player car's centre*, not the engine. Existing [cars](../../src/entities/railway/cars.ts) are 3.20 m, pitch 3.70 m. The new coach adds `D = length + 0.50`: **2.90 / 3.40 / 3.70 m** for candidates **2.40 / 2.90 / 3.20 m**. Body spans exclude the terminal 0.20 m buffer; add it where a physical end matters.

Configurations: **A** = engine/player/kit; **W** = A + footing wagon; **S** = longer boiler + A + steel car; **WS** = S + wagon. At 2.90 m their spans relative to s are respectively **−8.70..+6.20**, **−12.40..+6.20**, **−12.40..+6.70**, **−16.10..+6.70** (14.90/18.60/19.10/22.80 m long). For 2.40 m subtract 0.50 from each length/tail reach; for 3.20 add 0.30. The ladder's 14→20 step changes no length; 25 adds S's nose and steel car. Planned Strong adds a whole cargo car: on an A-like future train it has W's envelope; **WS+Strong** would be −19.80..+6.70, but that combination is **not decided**: [garage choices](../plans/garage-choices.md#2-what-the-player-chooses-and-when) gives Strong to later lines, not line 2.

## 1. Every served halt and its platform

Sources: [stop catalogue](../../src/sim/railway-lines.ts), [Home/Place platforms](../../src/place/layout.ts), [Ring heads/halt](../../src/sim/railway-ring-layout.ts), [stack platforms](../../src/entities/route-greybox/leg-view.ts), [Gorge's 40 m platforms](../../src/content/levels/gorge.ts). Table shows **WS + 2.90 m**, except line 1 uses A. R/F = whole-body rear/front platform margins. P/R = smallest longitudinal platform margin of the **whole player/rider car**; both meet an edge even if P is negative. Non-Home straight spans use catalogue s arithmetic; curved projected results follow below. To require whole-body containment, extend each negative end by its absolute deficit (plus the terminal buffer if present); the decided cargo overhang makes those extensions optional unless a hard obstacle is involved.

| Halt, track/platform | Platform s0..s1; stop s | Whole R / F | Player / rider | Service and smallest fix |
| --- | --- | --- | --- | --- |
| Village line 1, island | 2.77..20.77; 14.00 | +2.53 / +0.57 | +5.17 / +6.23 | Both cars fully beside deck; no mark/board/depot move |
| Camp, terminal | 195..219; 207 | +3.30 / +5.80 | +10.40 / +7.00 | Both board; timber loads from kit's actual mesh |
| Village line 2, island | 5.70..23.70; 18.25 | **−3.55 / −1.25** | +3.85 / +7.55 | Spur foul; Home fix below. Cargo/stand/till positions need no move with that fix |
| Quarry outward / Works service | 166..186; 174 | −8.10 / +5.30 | +6.40 / +3.00 | Both board; rear freight may overhang, allowed. Kit/wagon targets move back D |
| Quarry homeward, offset | 154..174.50; 174 | +3.90 / −6.20 | **−1.10** / +2.60 | Both overlap edge; player car already overhangs today; see actual projection below |
| Far Head outward, including terminal | 513..535; 524 | −5.10 / +4.30 | +9.40 / +6.00 | Both board; no stop move; rear platform extension 5.10 only if whole-train containment wanted |
| Far Head homeward, offset | 513..535; 524 | −5.10 / +4.30 | +9.40 / +6.00 | Same; crossing ahead at 537.3..539.7 stays clear by 6.60 m to the nose |
| Pier terminal, east, before Q7 | 719..741; 726.50 | −8.60 / +7.80 | +5.90 / +2.50 | Both board; do not move stop toward parked layer; rear freight overhang permitted |
| Pier homeward, west, after Q7 | 719..741; 726.50 | −8.60 / +7.80 | +5.90 / +2.50 | Both board. Outward through-service deliberately does not stop here |
| Moving Railhead east, all 8 heads | `s−15..s+10`; 852, then +20/head | −1.10 / +3.30 | +8.40 / +10.00 | Both board; extend rear 1.10 only for whole-train containment; recheck drawn buffer nose, below |
| Joint homeward, west, once joined | 977..1002; 992 | −1.10 / +3.30 | +8.40 / +10.00 | Both board; no mark move |
| Ring Island, east + west | 1170..1210; 1190 | +3.90 / +13.30 | +18.40 / +15.00 | Nominal slab fits; ramp/crossing, not slab length, binds. Move stop **+3.40** |
| Stack head 1, while served | 1675.10..1700.10; 1690.10 | −1.10 / +3.30 | +8.40 / +10.00 | Both board; freight overhang allowed; closes behind after two sections |
| Stack head 2, while served | 2185.20..2210.20; 2200.20 | −1.10 / +3.30 | +8.40 / +10.00 | As head 1 |
| Stack head 3 / Stack halt | 2695.30..2720.30; 2710.30 | −1.10 / +3.30 | +8.40 / +10.00 | Remains a request stop; both cars beside deck |
| High Gorge, both sides | 3200.40..3240.40; 3230.40 | +13.90 / +3.30 | +8.40 / +25.00 | Both board; platform follows curve; no new stop shift proposed |
| Works at Home / Quarry / Ring | no additional passenger halt | use Village / Quarry / Ring rows | same | These are service locations, not omitted stop-table entries |

**All lengths/configurations from that table:** for 2.40 m add **0.50** to R and the rider's rear allowance; for 3.20 subtract **0.30**. F and player stay fixed. For line 2 A add **7.40** to R and **0.50** to F; W add **3.70 / 0.50**; S add **3.70 / 0**. Strong on an A-like later line uses W; hypothetical WS+Strong subtracts **3.70** from R. Thus this table covers each consist without implying all future boiler combinations are approved.

**Actual chord projection at curved Place halts**, using production `trainPlaces`/`deckAt`, not just s arithmetic: Camp A R/F **3.24/5.80**; Quarry outward WS **−8.08/+4.97**, rider min **3.02**; Quarry offset WS **+4.41/−6.97**, player front **−1.62**, rider front **+2.02**; Far Head WS R **−5.13** outward, **−5.12** homeward; Pier WS R **−8.61** terminal, **−8.60** homeward. Quarry's existing player car has about **1.69 m** of projected edge overlap. Full player-car containment there would need approximately **1.65 m** more platform at its forward end, but Q4's frame occupies that end's outer side: not a free extension. Boarding animation/each individual seat exit was not tested.

**Home fix, 2.90 m coach:** current WS tail s **2.15**, versus spur points **5.50**: **−3.35 m** (−3.55 including its buffer); nose **24.95**, straight end **25.00**, link points **26.00**. There is only **1.10 m** to distribute between tail/points and nose/link, versus **3.40 m** needed. Even optimally sliding the train leaves a **2.30 m body-fit deficit** between the two points. Shortening alone would require coach length ≤**0.60 m**, impossible for eight.

Move Home's mark **+D**, to **21.65**: kit, wagon (including its **WAGON_S 10.85** wait) and steel car return to their old world positions, so depot flights and coupling alignment remain. Player car still ends **0.45 m** inside the existing island. Nose becomes **28.35**: road 2's straight needs **at least +3.35 m**, link points **more than +2.35 m** (or +3.40 to retain the old 1.05 m nose gap). Relaying the link, arc-length joins and cart road needs a level design pass; this is not merely editing the stop constant. Alternatives: omit the added coach from WS, or remove another 3.20 m car from that train, an owner choice. Whole-train containment after this mark shift would additionally require platform extensions **0.15 m behind / 4.65 m ahead**; passenger boarding does not require them.

**Ring fix:** WS tail at u **431.90**, foot-crossing north edge **430.50**: **1.40 m** physical gap, **−1.60 m** against the existing 3 m rule; tail also overlaps the ramp-top interval ending **434.60** by **2.70 m**. Stop **+3.40** (s **1193.40**, u **451.40**) restores the old tail **435.30**, crossing gap **4.80**, ramp-top gap **0.70**, and all freight centres. Both passenger cars still fully meet the deck; nose remains **9.90 m** short of its north end. The steel loader's gantry spans u **436.90..444.30**, arm **440.40..440.80** ([geometry](../../src/entities/ring-steel/view.ts)): shifting freight aft without shifting the mark puts WS's steel centre at **433.50**, **3.40 m outside** the gantry. The proposed mark shift restores steel centres **440.60** (S) / **436.90** (WS), so no loader extension is needed. Boards, till and depots stay fixed; walking from the passenger door changes by D, while the served freight anchors are preserved.

## 2. Roundhouse, table, stalls and roll-out

Sources: [rotunda kit](../../src/place/rotunda.ts), [bridge](../../src/entities/railway/table-bridge.ts), [garage copy](../../src/entities/railway/garage-view.ts), [shunt](../../src/entities/railway/shunt-path.ts). The owner decided the passenger set **does not stand in the Roundhouse**; complete sets need measuring, but are not its current occupants.

| Object / consist with 2.90 m coach | Envelope / margin | Turns, parks, rolls out? Smallest fix |
| --- | --- | --- |
| Actual bridge | pit diameter 16.00; deck **15.70 × 3.20** | Measure against deck, not only pit diameter |
| Full A / W / S / WS | body lengths **14.90 / 18.60 / 19.10 / 22.80**; deck total spare **+0.80 / −2.90 / −3.40 / −7.10** | Add 0.20 m terminal buffer: A fits; W/S/WS cannot turn fully supported. WS needs ≥**23.00 m** deck (+7.30) if required there |
| Same full sets, 11 m stalls | body-length spare **−3.90 / −7.60 / −8.10 / −11.80** | None park; include terminal buffer, WS needs ≥23.00 m stall (+12.00). This would be a different Roundhouse plan |
| Actual works copy, long engine + player car | **8.50 m** over rear buffer; deck spare **7.20**, stall spare **2.50** | Fits; leave the new rider car off this fitting copy, unless the owner changes what it displays |
| Works copy also given rider coach | **11.90 m**; deck spare **3.80**, stall **−0.90** | Turns if recentered; needs stall +0.90 minimum, plus parking allowance |
| Actual shunter + wagon | bodies **6.90 m** incl 0.30 m gap; deck spare **8.80** | No extra coach rides this shunt; no change to stall/turn motion needed |
| Waiting wagon, Home | 9.25..12.45; old kit rear 12.95: **0.50 m** gap | At unchanged stop, shifted kit rear **9.55** overlaps waiting wagon by **2.90**. Home mark +D restores 0.50 |
| Home spur / cart-link points | longest set: **−3.35 / +1.05** at original mark | Does not stand clear; use Home fix, not a bigger table |
| 2.40 / 3.20 alternatives | full-set deck/stall margins **+0.50 / −0.30** relative to 2.90 | Neither cures the longest set; a Strong extra car consumes another **3.70 m** |

Stall width/height **3.60 × 4.60** leaves a 1.60 × 2.10 coach **1.00 m each side / 2.50 m overhead** on level rails. Passenger sets have no authored full-set spur/stall departure route; arithmetic fit of A on the bridge is not proof that it rolls through the points. Keep existing shunter and engine-only waiting-bay roles.

## 3. Curves, trackside clearance, passing and queuing

Swept production chord/spacing helpers every **0.25 m** along both first-island lines and Ring approach, both tracks; all three candidates, A on line 1, WS on line 2. Counterfactual queue conservatively places two WS consists (actual fleet has only one wagon train) **27.40 m apart**, independently of whether a seed currently queues there. Passing sweep offsets opposing cars by −5..+5 m in 0.50 m increments, away from shared terminal blocks. Sampled minima, not continuous collision proofs.

| Check | 2.40 / 2.90 / 3.20 m result or margin | Consequence |
| --- | --- | --- |
| Current tight track curves | level-check sampled radii: line 1 original **11.8 m**, line 2 original **16.7 m**, line 2 offset **14.1 m**; Home spur **15 m** by construction | Current data, superseding older Quarry-radius comments; no new curve authored |
| Coupled vehicles, decks and buffers | all sampled coupling slack ≥0; physical deck gap ≥**0.10**, buffers ≥**0.02** | Existing stretching handles added coach; no rigid-overlap failure sampled |
| Same-track queue, longest WS | **+1.42 / +0.93 / +0.63** body separation; worst line 2 offset at s 85 | Fits sampled bodies at today's spacing floor; do not claim spare coupling/roof hardware space from this alone |
| Opposing coach / 2.20 m freight car | **+1.95 / +1.92 / +1.92**, near Quarry s 170–171 | Fits sampled pass; terminal single tracks remain block-protected |
| Hypothetical WS + Strong, same floor | **−2.10 / −2.18 / −2.19** in the offset approach bend | Fails; no such line-2 Strong fit is approved. A future combined train needs larger spacing; do not copy 27.4 blindly |
| Reserved sim nose-to-tail at spacing floor | `27.4−8.2−(12.7+D)` = **3.60 / 3.10 / 2.80** | `TRAIN_EXTENT.behindCm` must grow for the added car; ahead stays conservative. On curves drawn s-reach is larger: 2.90 WS reaches **19.75 m behind** at s 85; audit block clearing too |
| Seven-train busy fleet | six on line 2 + one on line 1; quiet seed minimum same-track pose separation **222.86 m** | Four real seeds each stepped 12,000 ticks; quiet traffic does not exercise worst queues |
| Busy request/restore counterfactual | 2×12,000 ticks, seeds `5140/5141`, `gorge-reached`, heavy; 56 restores, no spacing exception; results **identical to controls** | In-memory tail extent 12.70→16.10, same 27.4 floor. Worst served waits **119.4 / 113.0 s**, pending asks at end retained; no claim of an improved wait distribution |
| Headway at High Gorge, six line-2 trains | **42.8 s at 20 m/s**, **35.1 s at 25**, as `headTicks`; unchanged by car count | Profile/cycle arithmetic has no mass term; larger blocks may change practical holds |
| Home canopy / open gate headstocks | assumed coach roof 2.10: **2.50 / 3.80** overhead | Car body narrower/shorter than existing 2.20 × 3.20 trailer swept at same axle pose; roof needs authoring inside declared envelope |
| Platform straight edge / bridge outer deck edge | rider side gaps **≥0.85 / 1.00**; Ring formation edge **1.00** | 1.65 m halt edge or 1.80 m bridge edge minus 0.80 half width; curved corners/furniture require final model check |
| Tunnels / place hull / furniture | no bored train tunnel on current first-island lines; smaller coach envelope is inside an existing trailer's at equal pose | Baseline level check passes, including platform/track and hull grounding checks; **not** a new coach-vs-every-mesh sweep. Later cave/portal massing is not clearance proof |
| Parked layer at Pier | nose unchanged at **733.20**; parked layer begins **734.40**: **+1.20**, only **+0.20** over the 1 m rule | Do not put coach ahead of player car or advance Pier's stop; candidate length does not consume this gap in recommended position |

The existing Ring/stack head stop leaves the conservative 8.2 m nose **1.80 m** short of the platform/end coordinate; drawn stack buffers stand **1.80 m before** that coordinate, giving zero reserved spare there, or **1.50 m** against the actual 6.7 m nose. Added rear coach does not reduce this front allowance. The current 15 planned/tentative track failures in `level-check` are not new rider-car failures; do not certify future Strong lines from this first-island result.

## 4. Car position and every production index assumption found

Position comparison: **after player** keeps the mark and four player seats, rider fully beside Pier (+2.50 m) and Quarry outward (+3.02 m projected). **After kit** preserves kit index 2 but leaves rider rear **1.20 m off Pier**, centre only **0.25 m** onto its deck. **Last after WS steel** leaves rider centre s **711.85 at Pier**, **7.15 m before** the deck: cannot board there. **Ahead of player** adds D to the nose: Pier layer clearance becomes **−2.20 m** at 2.90. Therefore recommend new sequence **engine 0, player 1, rider 2, kit 3, wagon 4 if present, steel last**; Strong's extra cargo comes after its defined cargo, pending that consist's design.

Audit: `rg -n 'cars\[|cars\.at\(|TRAIN_OFFSETS\[' src --glob '*.ts'`, plus offsets, wagon constants and builders. Row line numbers are at measured revision. Preserve player platform/seat IDs; do not insert blindly in shared machine arrays.

| Index assumption / source | Every relevant location / effect of inserting at 2 |
| --- | --- |
| [train-view](../../src/entities/railway/train-view.ts), construction | `WAGON=3` :123; `model.cars[n]` :134; engine `cars[0]` :149; kit mesh/body :167,172,174,256,286; player `n=1` :176 and `riderCar` :274. New rider needs its own mesh/car; kit becomes 3, wagon role becomes 4 |
| Same file, engine-only references | `model.cars[0]` / `tr.cars[0]` :217,226,235,240,409,744,764,765,792,803,886,896,915,917,929,992,1022,1054,1060,1080,1191. Keep engine at 0 |
| Same file, player/kit consumers | player :408,427; kit :640,643,929,1027,1128; :929 bounds end at kit instead of actual last car. Retarget kit, leave player at 1, derive full bounds from complete consist |
| Same file, posing/lifecycle | base slice and array creation :125–145; `offsets[n]` :485, `offsets[WAGON]` :486, steel :487; collections :338–343,853–874,921,932–943; coupling first-pair `n===1` :861. Include rider in rendering, carry, hiding, grow-in, requests and bounds |
| [cars](../../src/entities/railway/cars.ts) | `TRAIN_CARS`/`TRAIN_OFFSETS` :17–18; steel follows `[3]` wagon or `[2]` kit :24; tail :28. Recompute offsets/tail; `ridesOn` already scans a list |
| [garage-view](../../src/entities/railway/garage-view.ts) | first-car centering/engine :154,159,242,493; kit `[2]` :267,666; wagon `[3]` :269,274,276; steel offset :271. Keep copy's actual roles, not runtime indices accidentally shifted into the showroom |
| [look-kit](../../src/place/look-kit.ts), [wagon-look](../../src/render/wagon-look.ts) | constructors return `[loco,...beds]`; look-kit :817 uses `n===1` as travel reference; wagon-look :202 uses `n===0` for engine. Extend passenger train model without changing machine roles |
| [forge-finish](../../src/entities/railway/forge-finish.ts):20; [town view](../../src/entities/town/view.ts):130 | forge comment assumes last car is `[2]`; town `cars[0]` is the first observed train car used for hiding distance. Inspect comment/visibility if consist grows |
| Separate machine/prototype arrays | [machine-model](../../src/entities/railway/machine-model.ts):213,227; [track-machine](../../src/entities/railway/track-machine.ts):64–65; [crossing train](../../src/proto/crossing/train.ts):81,159–160. Index 0 loco / 1 machine flatbed; **do not reindex these** |
| Non-array limits and evidence mirrors | [car-spacing](../../src/entities/railway/car-spacing.ts):68 max vehicles **5→6** (7 only for hypothetical combined Strong); `WAGON_S`, shunt wait/ghost and [sim extent](../../src/sim/railway-lines.ts):119; [folk](../../src/place/folk.ts):39,256,263 and train-view :983–986 assume four riders. `dev/level/{rail-network,ring}.ts`, train/home/works/clearance tests and look fixtures mirror consist roles; refresh them with implementation |

## 5. Rules touched, not decided here

| Rule and owner | Train-wide rider-car consequence; no decision made |
| --- | --- |
| “A boiler sets top speed and how many cars”, 10 November; [garage data](../../src/entities/railway/garage-data.ts):239–242 | `BOILERS` advertises **3 / 3 / 4 pulled cars** for first/table/long boiler. Added rider makes corresponding maxima **4 / 4 / 5**, including wagon where present. Owner must decide if rider counts toward that allowance or each boiler allowance rises |
| Strong/Quick, [garage trade](../brainstorms/garage-line-trade.md) | Strong's one extra car remains a *cargo* benefit, not silently consumed by the coach every train gets. Future base consist and combined fits are not implemented; no line-2 Strong invented |
| [BOILER / profile](../../src/sim/railway-train.ts) | Built 14/20/25 m/s, acceleration 2.5/3.5/3.5, brake 3.5 m/s²: no car-count, weight, tractive-force or speed penalty. Added coach changes no kinematics unless owner chooses a new rule; 30 m/s and Strong rows are planned |
| Spacing, end blocks, fleet placement | Global `TRAIN_EXTENT`, `railEnd`, `within`, `retainedEndBlock`, `trainPlaces` and fixed `TRAIN.sepCm` must describe the new tail. Increasing separation to retain today's 6.5 m *reserved* gap would mean **30.8 m** at 2.90; not chosen here. Curved body poses still need checking, not just this subtraction |
| Riders and loads | `TRADE.seats` is **4** today, a separate S1 rule change; player seats stay 4. Eight visible riders do not create capacity by themselves. Freight/footing capacity is explicit per-car data, not automatically scaled by train length; proposed Works arm must target kit index 3, **3.40 m aft** at unchanged Quarry mark |

## Evidence, checks and limits

`npm run level-check`: **exit 0**, 17 reports, 0 new reported problems; its existing machine sweep is not a passenger-train sweep. Scratch `.look/rider-car-fit/{measure,seed-run,extent}.ts` imported real layout/spacing/seed code; none committed. `node dev/ship-check.ts`: **exit 0**, docs-only registry/agent gate, 46 tests passed. `git diff --check`: clean. `measure.ts` used production `line2Lat(..., smooth=true)`, chord poses, buffers and curve stretching. Seed runs used the repository's no-audit preload (same rules), no shipping edits. Heavy-run controls were byte-identical JSON; the test logs' pending asks are censored at the run boundary, not lost-request claims.

[Home current](rider-car-fit/home-current.png) and [Home proposed](rider-car-fit/home-proposed.png): opened both. Current shows works copy separate from running set; staged red/yellow footprints show longer WS occupying the stub/points, cyan marks proposed rider location. These are footprint overlays over the real level, **not built coaches or collision evidence**. Captures passed WebGPU, advancing completed frames and zero page/console errors. One overlay setup failed on a bare `three/webgpu` import, then was corrected and recaptured. [Ring proposed](rider-car-fit/ring-proposed.png): opened; the last footprint crowds the crossing ramp and sits south of the loader while both passenger locations remain beside the platform. Numeric margins come from geometry, not pixels.

**Not measured:** final mesh/eaves/steps, posed eight-rider knees and door/aisle access; each player seat exit at Quarry; continuous or pitched 3D train-vs-every-static-mesh sweep; post-fix Home link geometry/cart travel; full-set turn/stall/rollout route (none exists); live two-train collision/boarding, real-time motion, device/performance or owner approval. Later `ns/bay/cave` and West landing/Bell/Port stops have no serving train in these seeds; Strong's future trains and their tunnels/bridges are **not certified** by their greybox platform reservations. Future stops need their own fit pass once the consist and paths are authored. No Boogler copy changed or suspect line identified.
