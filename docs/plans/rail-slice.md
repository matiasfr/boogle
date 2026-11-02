# Plan: home and the first two rail eras

> **Proposal, awaiting owner approval — 2 November 2026.** Replaces
> [vertical-slice.md](../proposals/vertical-slice.md), which is historical. The audit picks and every later
> 2 November decision in [boogle-2.md](../proposals/boogle-2.md) win over older proposals and research.
> This commit writes no game code. Only milestone 1 may start before the entity migration's step 12;
> the real slice waits for step 12 **and its owner playtest**. All new game objects then use entities.
> All new dimensions, recipes, durations and counts below are **hypotheses**, not measurements or approved tuning.

## Goal

Make wood and steam a complete first chapter: hands-on work builds a railway across a home worth exploring,
its deliveries visibly grow the town, and that town supplies the next reach. Serves DESIGN.md **1, Toys before
chores; 4, Cooperation is automatic; 7, Telegraph everything; 8, Designed for drop-in, drop-out; and 9, Leave
something for the next visitor**. No principle change is proposed.

## Design

### Decisions and tests

Keep a steady back bundle, a haul for **every** track segment, preset links with a choice of order, junctions
that open network branches, 14 s laying, visible construction, automatic freight and ride-only timetabled
trains. Friends inherit the railway; solo players build to progress. No hazards, decay, upkeep, driving,
precision harvesting or shared spendable wallet. Thanks have no ranking. Mayor, opening days, som and knacks
stay parked; preserve every Boogler line. The venue plan is dropped.

The following labels apply wherever cited, including map, pacing and milestone dependencies:

| Test            | Depends on                                                                                             | If the answer goes the other way                                                                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D — supply**  | Owner's pending `?proto=net&v=depot` verdict: a supplied depot followed by a short carry is enjoyable. | Test a rack on the stopped freight flatbed at the last connected station, with the same load carried to each segment. Remove depot errands, never auto-fill the construction ring. If neither works, stop promotion and revise the delivery interaction. |
| **P — place**   | Milestone 1: Threefold's hub and first gorge make the repeated loop mean something.                    | Compress the first lobe/approach by about 25%, move the resource and town sightline, and retry the same gorge. A second no stops the home build; do not dress an unconvincing map or silently choose another island.                                     |
| **L — look**    | The pending sea pass on `?proto=crossing` works in motion against crossing-beauty shot 2.              | Keep the shot-2/Mario Sunshine target; retain the current sea temporarily and revise colour, filtered glints and contacts separately. Gameplay milestones may continue in greybox; visual acceptance stays open.                                         |
| **R — rewards** | A later owner decision about mini-game rewards; outside this slice.                                    | Whether rewards exist or not, rail progression and these costs are unchanged. Reserve land only; add no reward API, currencies or economic bonuses.                                                                                                      |
| **H — helpers** | A later owner decision about camp life.                                                                | Leave 6 × 8 m yards and clear paths at camps. If accepted, a separate brief adds inhabitants; if declined, moving machines/crates supply the life. No helper purchases, production multipliers or staffing dependencies here.                            |

Research used: [compounding infrastructure](../research/compounding-infrastructure.md), recommendations 1–3,
6–7 and 9–12; [Big Walk level design](../research/big-walk-level-design.md), 3–7, 9–10;
[level design](../research/level-design.md), 1, 3, 8–9, 13, 17–18;
[vast world scale](../research/vast-world-scale.md), 3–9, 11–12;
[harvest feel](../research/harvest-feel.md), 1–9;
[construction you can watch](../research/construction-you-can-watch.md), 1–3, 10, 12–15;
and [Sunshine look](../research/sunshine-look.md), 1–9. Their older eight-era, free-first-passage,
automatic-ring-fill, helper and venue suggestions are superseded, not additional requirements.

### Home: a small railway with actual destinations — Depends on P, D

Use **Threefold Reach**, section 3 of `/Users/matiasfranco/Developer/boogle/.look/previz/home-redesign/board.md`:
three lobes, two gorges and the central Needle Bell. Use **Two-Bay Weave**, shot 4 of
`/Users/matiasfranco/Developer/boogle/.look/previz/network-ring-chain/board.md`, for the surrounding topology.
These gitignored boards are references, not surveyed geometry. Replace their venues and eight-era labels.

North is **negative z**, east positive x, metres from the existing world origin; y is metres above sea.
Start with a 420 × 350 m envelope, roughly 60,000 m² dry land, a 55 m north ridge and a 22–30 m east table.
Keep all playable home geometry inside ±225 m so the current ±237 m soft boundary does not clip it.
The Y gorge is 16–24 m deep. The 105 m spire at `(0,0)` is orientation, never a climbing gate.
Paths are 4–6 m wide; stations have 20 m clear platforms; trestles have a 2.5 m walk/recovery strip.

**Move the town from the far east reserve to terraces west/northwest of the hub**, centred `(-125,5)`,
between y=24 and 32. Keep a 30 m wide view opening from arrival, the hub platform and the first trestle.
Its roofline stays below the spire; growth cannot close the gorge view. The freed eastern reserve remains
future town overflow/land, not six promised venues. The hub is the only fast-travel station on home;
there is nowhere to teleport until another hub exists in a later era.

| Place / stable ID                      | Centre `(x,z;y)`               | Work and reason to return                                                                                                            |
| -------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Hub `H`                                | `(-80,20;24)`                  | Arrival 12 m south; departures board, starter wood patch and town unloading apron. Ball/loose toys stay optional.                    |
| Mill / west junction `Jw`, camp `C1`   | `(-55,-20;25)`                 | Sawmill at `(-72,-24)`; logs and timber crates concurrently. Joins the mill siding to the gorge approach and home line.              |
| First trestle abutments `A`, `B`       | `(-25,-40;26)`, `(25,-55;28)`  | Look down to the old footbridge; the first high connection visibly replaces a valley detour.                                         |
| Ridge junction `Jn`                    | `(45,-85;30)`                  | Splits to quarry, north overlook and the future east crossing. A supplied work yard overlooks home.                                  |
| Quarry camp `C2`                       | `(20,-130;34)`                 | Stone and ballast crates concurrently, a split-rock yard and a path to the ridge. Reaching this by either route is the wood-era key. |
| North overlook `N`                     | `(-10,-165;43)`                | Optional return loop over the quarry; original home/port view, source pocket and broad downhill return. No race or reward gate.      |
| Second trestle `E`, east junction `Je` | `(90,-80;30)`, `(135,-45;26)`  | Reveals the east workshops and departure headland; separates works branch from coast approach.                                       |
| Ore camp `C3`                          | `(170,0;24)`                   | Ore and stone from exposed rock; coastal path returns below the second bridge.                                                       |
| Steamworks camp `C4`                   | `(125,45;22)`                  | Receives timber/ore automatically, makes fittings and timber packs; visible crane and assembly yard. No recipe menu or fuel upkeep.  |
| Quay junction `Jq`                     | `(145,100;18)`                 | Freight landing opens the eastern coastal route and reserves a southern return arm for the eventual Home–port closure.               |
| Coast cutting `K`, departure `D`       | `(200,-5;22)`, `(170,-135;24)` | Fold behind east bluff, then reveal Puffspring. D is the steam-era key and the next sea workfront.                                   |
| River ledge `R`                        | `(80,30;10)`                   | Optional low return connection under the high bridge; different view of the same town.                                               |

Those are **all four camps and four junctions** (`Jw/Jn/Je/Jq`) in this slice. Junctions open outgoing survey
stakes when connected; the player chooses which eligible segment to fund first. No manual signals or switching.
Two permanent low footbridges near `(-40,-95)` and `(65,55)` keep home explorable. Start with a roughly
250 m hub-to-ridge foot route and a 185 m rail chord; time both and include service waiting. The first rail
approach passes the mill, rather than ending at a decorative dead end.

Each row below is **one hauled segment and one 140-tick run**, even when several form one passenger leg.
Lengths are along proposed curves; endpoints alone do not define the final spline. Rings sit 5 m beside the
**connected** endpoint, with a viewing apron beyond them. A depot/rack is at the last connected station;
after each segment, its service can extend to a temporary railhead unloading pad. Test a 25–55 m final carry,
then 15–30 m after a junction connects (**Depends on D**; the flatbed alternative uses these same endpoints).

| ID  | Era / endpoints / length      | Recipe                  | What completion changes                                                                          |
| --- | ----------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| W1  | Wood: H → Jw, 50 m            | 12 timber               | Connect C1; first crates ride home. Raw logs count as timber for these simple wood builds.       |
| W2  | Wood: Jw → A, 40 m            | 24 timber               | Reach the near-bank work apron.                                                                  |
| W3  | Wood: A → B, 55 m             | 24 timber               | First gorge crossed; scaffold and deck build out from the near bank.                             |
| W4  | Wood: B → Jn, 40 m            | 24 timber               | Open quarry/overlook/east branches; town can supply the ridge.                                   |
| W5  | Wood: Jn → C2, 55 m           | 24 timber               | **End wood, start steam** on reaching C2; no ceremony trigger.                                   |
| S1  | Steam: Jn → E, 50 m           | 24 timber               | Reach the second crossing's staging shelf.                                                       |
| S2  | Steam: E → Je, 60 m           | 16 timber + 8 stone     | Second gorge; open both east camp branches.                                                      |
| S3  | Steam: Je → C3, 60 m          | 24 timber               | Connect ore and stone; first ore leaves by train.                                                |
| S4  | Steam: Je → C4, 95 m          | 16 timber + 8 stone     | Connect steamworks. S3/S4 may be done in either order; the works waits for ore service if first. |
| S5  | Steam: C4 → Jq, 65 m          | 12 timber + 12 stone    | Open quay and coastal workfront.                                                                 |
| S6  | Steam: Jq → K, 135 m          | 12 timber + 12 fittings | Raised coastal shelf via `(195,65)`; uses the works' longer-span kit.                            |
| S7  | Steam: K → D, 145 m           | 12 timber + 12 fittings | **End steam**; departure connection exposes the next island's build lead.                        |
| O1  | Wood optional: Jn → N, 100 m  | 24 timber               | High lookout/source pocket.                                                                      |
| O2  | Wood optional: N → C2, 60 m   | 24 timber               | Alternate C2 connection; closes the ridge loop if W5 exists. Either connected end can start it.  |
| O3  | Steam optional: Je → R, 100 m | 16 timber + 8 stone     | Lower gorge view and river landing.                                                              |
| O4  | Steam optional: R → H, 190 m  | 16 timber + 8 stone     | Close the home return loop via the southern low crossing.                                        |

The 12-segment main route costs **276 units** (224 timber, 28 stone, 24 fittings); all four optional segments
add **96** (80 timber, 16 stone). Orders are choices within prerequisites, not random layouts. C1 supplies
W2–W5, C2 supplies the second gorge, C3+C4 supply the coast: no bridge requires the unreachable bank's goods.
O1+O2 may replace W5 for the C2 era key; all skipped links remain buildable in later eras.
Old rails persist and upgrade in place; keep a wood heritage service.

Outside this plan: Two-Bay's outer chain continues Home → Puffspring → Canopy → Whistle → Bottlewater →
Rattlebank → port, with later links through Reef Junction and the final **Home–port closure** fixed by the audit picks.
Six eras can
include multiple places; do not assign the board's eight labels one-for-one. Rotate its departure opening
as needed to meet Threefold's northeast headland, preserving the two bays and a southeast glimpse of port.
Reserve shoreline corridors and skyline proxies now; build neither those islands nor their links here.
The **later** crossing baseline remains about **1.2 km at 20 m/s, about a minute**. The short home trestles
are not substitutes for it. Era-3 streaming/LOD design belongs to entity step 22 before that crossing is built.

### Town and materials — Depends on P, D

Six permanent plots within the town terrace, with 5 m streets and one open unloading yard:
`T1(-112,10)`, `T2(-136,10)`, `T3(-112,-12)`, `T4(-136,-12)`, `T5(-112,-34)`, `T6(-136,-34)`.

| Stage             | Arrival that causes it                          | Visible change and practical return                                                                                                                                               |
| ----------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0: home camp      | Fresh world                                     | Two small huts at T1/T2, loading shelter, bare plots; no hidden metropolis.                                                                                                       |
| 1: timber village | C1 connected and first 12 timber delivered      | T3 workshop, T1 porch and roof; sends timber packs to the railhead. Target first response within 7 minutes.                                                                       |
| 2: steam village  | C2 connected and first 12 stone delivered       | T4 masonry workshop, T3 powered tool rack, 12 m water tower behind T4. Familiar trees become two strokes rather than three; stronger span kit enables S2.                         |
| 3: working town   | C3+C4 connected and first 12 fittings delivered | T5 assembly hall, T6 freight shed, upper rooms on T1/T2; supply S6/S7 and improve local service.                                                                                  |
| 4: departure town | S7 complete and its first returning service     | Add quay canopy and terrace street details, retaining the original hut. No further cost. A small busy town; later eras add density within reserved land, never a home metropolis. |

Stage thresholds consume earmarked freight once, never player wallets or repeating town needs. Each arrival
shows crates → scaffold → foundation/frame/roof → useful service. Ordinary additions take 5–8 s; a town stage
12–18 s with overlapping plots. Walking streets stay open, camera control stays with the player, late joins
reconstruct the completed phase without replaying rewards. **Depends on H:** yard activity may eventually
include helpers, but production already works without them. **Depends on R:** reserve two empty 25 × 20 m
pockets at `(-165,70)` and `(120,65)`; do not equip them as venues or count them toward required playtime.

**Replace `AGES`, not its multiplier.** Today's `src/sim/route.ts` has 60/180/550/1600/5000/15000/45000 and
helper costs at 0.6×. Use the explicit recipes above, an era key-connection table and concurrent material kinds;
remove `materialOf(age)` from the rail economy. Keep one kind per back bundle, capacity 24: wood takes one
carry, mixed builds at most two. Keep accepted 2-unit pours every 0.3 s initially (24 units = 3.6 s).
Rail ops enforce the 24-unit carry limit in previews; change the old global stack cap only at cutover.
No cost scales with era, player count or exploration time.

Wood: three accepted strokes × four units, 600 ms nominal cadence, 12 units per source. W1 needs one tree;
a 24-unit unassisted build needs two. Steam: two × six on the **same** source, still 12 units, not tougher trees.
Stone/ore use the same forgiving action with different fragments. C1/C2/C3 commission with one 12-unit
hands-on batch of timber/stone/ore respectively; feed it on site before or after connecting. Connection plus
commissioning starts bulk supply, and that batch becomes its first output. C1 makes timber, C2 stone/ballast,
C3 ore/stone. C4 receives 12 timber + 12 ore, then one 3 s hold at its clamp commissions the works and makes
24 fittings; later batches process automatically. The clamp uses the same forgiving interact action, with no
recipe menu. Ballast is decorative cargo backed by surplus stone, not another currency or mandatory recipe.

Start with one 12-unit crate per connected camp every **10 s while a selected project or town stage needs it**;
a wagon has eight slots. Queue the selected segment first, then the next town-stage shipment; halt when their
bounded demands are covered. Expand fittings demand into its timber/ore inputs, rounding to one 24-unit
batch and retaining the surplus; commissioning freight is a bounded demand too. Deliveries occur at scheduled
calls, never when a visual crate lands. Target
under 30 s between requesting a supplied load and its availability; a longer wait is a service/layout failure,
not an opportunity to add compulsory mini-games. A depot holds at most the selected project's remaining bill.
Unconnected source patches remain available for hands-on supply. No 20 s source refill timer: replenish finite
patches on completed segments, keep enough raw stock for the full currently reachable bill, and test that stock
can never strand progression. No declining yield, new durability or resource theft.

**Absence:** select one project at an eligible ring; the network can bank its remaining supply while everyone
is away, then stops. It never selects, hauls, starts or completes the next segment. Construction already started
can finish. An unclaimed project has no offline production. Town freight already in transit may arrive once;
no chain of new town stages is commissioned unattended.

### First two hours, solo — Depends on P, D

Budget the six-era game as **30 / 90 / 85 / 90 / 90 / 95 minutes = 480 minutes**: wood, steam, iron and harbour,
diesel and concrete, electric, future. Only the first 120 minutes are designed here. Later time buys islands,
new approaches and useful cross-links, not bigger bills. This is an exploratory first visit, not a speed limit.

Each cell below is the principal action for that **individual minute**, left to right; 0–4 means minutes
0, 1, 2, 3, 4. A build minute includes obtaining its load, carrying, pouring and the 14 s run where feasible;
longer approaches are explicitly separate. The player can always continue early. Watching, looking back and
trying a return route are invitations, never countdowns, objectives or disguised quotas.

| Minutes | +0                             | +1                              | +2                              | +3                           | +4                                            |
| ------- | ------------------------------ | ------------------------------- | ------------------------------- | ---------------------------- | --------------------------------------------- |
| 0–4     | Arrive; see town/rail/spire    | Chop first tree                 | Carry, pour, lay W1             | Ride to C1                   | Work its first batch                          |
| 5–9     | Follow crates home             | Watch T3 build                  | Walk village street             | Take supplied load           | Lay W2                                        |
| 10–14   | Enter gorge footpath           | Cross low bridge                | Look back under trestle         | Reach far-bank lookout       | Return to A with route understood             |
| 15–19   | Carry W3 supply                | Lay first trestle               | Ride over the old walk          | Explore north landing        | Carry and lay W4                              |
| 20–24   | Read Jn's three branches       | Walk quarry approach            | Try stone contact               | Return for W5 load           | Lay W5; steam begins                          |
| 25–29   | Work C2 batch                  | Ride stone home                 | Watch T4/tower build            | Try two-stroke old tree      | Read east-span kit; choose next excursion     |
| 30–34   | Ride back to Jn                | Scout overlook loop             | Work north source pocket        | Carry and lay optional O1    | Ride up to N                                  |
| 35–39   | Find quarry from above         | Walk the downhill return        | Take O2 load                    | Lay optional O2              | Ride completed ridge loop                     |
| 40–44   | Return to Jn supply yard       | Scout second gorge              | Carry and lay S1                | Descend east footpath        | See both abutments from below                 |
| 45–49   | Walk east approach             | Find return to E                | Carry timber for S2             | Carry stone; lay S2          | Ride through east reveal                      |
| 50–54   | Read Je's two branches         | Walk ore coast                  | Work an ore batch               | Return above coastal path    | Choose ore connection first                   |
| 55–59   | Take S3 supply                 | Carry and lay S3                | Watch C3 load train             | Ride ore toward home         | See its future works destination              |
| 60–64   | Walk to works shelf            | Explore crane yard/river exit   | Return for timber               | Haul stone and lay S4        | Work C4 commissioning batch                   |
| 65–69   | Follow first fittings          | Watch T5/T6 assembly            | Walk new town street            | Take mixed load from yard    | Ride back to works                            |
| 70–74   | Scout southern quay            | Carry S5 timber                 | Carry stone; lay S5             | Watch freight landing open   | Read Jq coast/return leads                    |
| 75–79   | Walk lower river route         | Look up at second bridge        | Carry O3 timber                 | Carry stone; lay optional O3 | Ride to river ledge                           |
| 80–84   | Follow old low crossing home   | View town through gorge         | Carry O4 timber                 | Carry stone; lay optional O4 | Ride full return loop                         |
| 85–89   | Visit changed hub              | Take coast kit                  | Ride via Jq                     | Walk shelf to cutting        | Compare foot bend with raised route           |
| 90–94   | Carry S6 timber                | Carry fittings; lay S6          | Ride new shelf                  | Explore cutting exit         | See departure ridge through notch             |
| 95–99   | Walk departure approach        | Look back to town/sea           | Return to supplied railhead     | Carry S7 timber              | Carry fittings to workfront                   |
| 100–104 | Lay S7; end steam              | Ride into departure             | See Puffspring sea lead         | Sit for return ride          | Follow first return freight                   |
| 105–109 | Watch stage-4 canopy           | Walk old hut/new street         | Revisit first chop patch        | Ride heritage train          | Use completed gorge shortcut                  |
| 110–114 | Choose a favourite return loop | Visit its camp                  | Watch two goods sharing freight | Ride with a crate            | Return to departure viewpoint                 |
| 115–119 | Inspect later sea workfront    | See existing project supply cap | Return home or leave here       | Read unranked thanks         | Leave the next connection for another sitting |

There are only **168 s of required laying**, or **56 s more** for the four optional runs. Raw harvesting,
carrying and pouring should stay around 10–20 minutes total, not fill two hours. The remaining budget is
learning and using the places. A focused first completion may take **45–70 minutes**; do not penalize it.
Record purposeful exploration, repeat trips, unchosen branches and idle time separately. If players exhaust
home early, report that the two-hour hypothesis failed: revise actual places/choices or accept a shorter
opening. Do not stretch this itinerary by adding costs, empty walks or mandatory leisure.

### Authority and the production seam

Follow [entity architecture](entity-architecture.md): `defineKind`, `spawn`, lifecycle methods and `dispose`
for camps, depots, construction, trains, town and screens; pools for crates/pieces. Features compose them;
state never imports view. As in that plan's primary-doc comparison, Unity uses component lifecycle methods,
Unreal Actors/components and Godot Nodes; Boogle uses plain entities and explicit orders without a scene
editor or ECS. Terrain stays a service. Engine-specific documentation and the water/terrain comparisons are
already cited in the linked research; this offline planning pass has not refreshed external sources.

| Piece                                                                                              | Sync / authority / API                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Built segments, selected project, source work, goods, depot reservations, town arrivals and thanks | **Lockstep**, server stamps edits; `submitEdit`, eager rules, `onApplied`, `onAfterTick`, `onSnapshot`. Counts and IDs are integers.                                                                                                                                   |
| Timetable activation, line version and freight manifests                                           | **Lockstep** saved descriptors; train position is a pure tick function. No train-pose broadcasts and no Rapier in the simulation.                                                                                                                                      |
| Player movement, riding/seated attachment                                                          | **Owner**, existing movement plus new additive presence `railRide` with service/version/car and relative pose; `addPresenceField` + `onRemotePresence` + `createSnaps`, 20 Hz, sample at `now - INTERP_MS`. Missing field means off; remove remote views on departure. |
| Train decks/collision, source/structure colliders                                                  | **Local realization** of shared descriptors through `physics/engine.ts`; kinematic, no independently authoritative physics. Player contact remains Owner.                                                                                                              |
| Crate hops, tree recoil/fall, construction pieces, water, smoke, sounds, camera                    | **Local**, derived from accepted events/shared progress. `emit`, asset mixers, node materials, one pipeline. Never mint goods from animation callbacks.                                                                                                                |
| Existing Boogler                                                                                   | **Host**, unchanged. No new Host economy or helper authority. No new one-off message is needed.                                                                                                                                                                        |

Develop new rail rules in isolated `proto-rail-slice` rooms, then remove the obsolete economy at cutover.
Rules register eagerly everywhere but start inactive. Host-only `rail.activate {profile}` validates the room
profile through env and saves the activation in `railProjects`; inactive rail rules neither tick nor mint.
The new namespace activates Threefold by default at cutover. Each domain follows the four-file recipe:
`src/sim/<name>.ts`, `test/<name>.test.ts`,
`src/world/rules/<name>.ts`, `src/features/<name>.ts`, plus one appended `RULES` entry.
Names: **rail-projects, rail-supply, rail-service**. Shared adapters go in `src/adapters/rail-*.ts`, never
feature-to-feature imports. Register in that order: supply uses the earlier projects API to deposit and grant
town capabilities; service calls supply's `onArrival` API. Projects never reads supply/service, and supply
never reads service. Cross-state invariants check deposits, capability grants and manifests.
Static graph/recipes: `src/sim/rail-home.ts`; xyz geometry: `src/island/rail-home.ts`.

| State key      | Ops / saved responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `railProjects` | Per-ID recipe stock, activation/profile, run/completion ticks, contributors, selected project, era keys and granted town capabilities. `rail.plan {s}` selects an eligible project (first accepted wins; immutable once supplied); `rail.run {s}` requires full stock. Completion unlocks edges, never `open++`.                                                                                                                                                                                                                                                                            |
| `railSupply`   | Source remaining units/cuts, camp commissioning, bounded queues/manifests, project claims, town shipments/stage, absence cap and credited watermark. `rail.hit {id}` awards a whole fitting yield into existing `stacks`; `rail.feed {camp,k,n}` commissions/feeds from them; `rail.work {camp}` accepts each 600 ms clamp stroke (five for C4); `rail.take {s,k}` claims depot supply; `rail.stock {s,k,n}` transfers a raw stack or claim into the projects API; `rail.return {claim}` returns it. Host-only `rail.release {pid}` returns departing players' freight claims exactly once. |
| `railService`  | Stable service IDs, route/version, activation tick and pending next-stop transition; deterministic ticks, no client timetable op. Service ticks call supply's `onArrival`; it processes each `(service,version,lap,stop)` once.                                                                                                                                                                                                                                                                                                                                                             |

Raw stacks remain one-kind personal earnings. Freight claims are project-bound, separately counted in supply;
one can be carried only with an empty raw stack. They cannot feed another project or become public loot.
Disconnect returns claims to their project; reconnect cannot spend the old IDs. Raw stacks persist.
Append `stone`, `fittings` to `src/sim/materials.ts`; use existing logs/ore IDs, with logs serving
as timber. Ballast uses stone's ID, not a new material. Do not reshape the old catalog before cutover.

Automatic camp production is explicit minting/processing; all subsequent depot/claim/site and train/town
transfers conserve counts. First commissioning input supplies real output, not an extra toll. Bake route
samples/lengths in centimetres: fixed tick/order, seeded RNG if needed, arithmetic/`Math.sqrt` only;
yaw, wheels and physics stay outside the sim. Export `edits` for **every** op (valid actions plus `JUNK`),
and `invariants` for integer/nonnegative counts, recipe caps, unique claims/manifests, monotonic stages and
conservation including production/consumption. Test simultaneous last hit/pour/start, capacity races,
departing carriers, duplicate arrivals/wakes, all branch orders, bad IDs and serialize/load/replay.

Eligibility checks connected ends, era and town capability: S2 needs stage 2, S6/S7 stage 3; only one selected
project owns the supply queue, released on completion or cancellation before supply. No render fact is needed
for graph/recipes. Reach validation uses `setEnv({ railActorPosition })`:
client host reads poses; server reads validated presence. Missing/stale position rejects; `ctx.env` is
validate-only, and apply rechecks available stock. Server room membership stamps host-only
`rail.attendance {online}`; the last departure freezes one selected-project allowance and blocks new town
commissions. Rejoining resumes normal bounded demand. A host-only `rail.wake {throughMs}` advances an
absolute credited watermark, capped by that same remaining allowance: an empty ticking room and a restarted
server cannot both award it. Wire time enters via the stamped op, never `Date.now()` in apply. Supply owns
these fields; the existing server host supplies facts, with no new socket or client authority.

**Cutover:** bump `WORLD_NS` from the then-current value (currently `v04`), with a dated history line for new
home/source identities and retired economy. Remove old `sites/sources/bank/tune/opening` registrations and
`site.*/src.take/bank.wake/tune.*/open.*` callers after migrating or retiring their prototypes. Replace
`AGES`, `materialOf(age)` use, helper rings and ranked plaques; retain stacks/piles/roster/toys and all
Boogler copy. No old-progress migration. Before cutover, new states start at version 0; changed shapes require
`version` + `migrate` or another namespace bump. RULES stays append-only within each namespace.

**Controls:** existing `interact` via `registerInteractable`: E, pad `x` (X/Square), touch action and its guide
row; newer owner/code mapping supersedes AGENTS' older B text. No slot added (`up` currently free; preserve
updates' runtime slot). Shared hands press/hold/release, not a pad-only wrapper: 2.2 m acquire, 2.5 m retain,
600 ms repeat, one pending hit/buffered tap. Release, movement, focus loss, full stack or depletion cancels
without falling into throw/talk. Interact on the deck sits; repeat/move stands, with Buddy clips/free camera.

### What graduates, and what gets rebuilt

| Existing work                                                   | Keep / rebuild boundary                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/proto/net/{camps,crates,boxes,stages,town}.ts`             | Extract kit/phase tables, instancing and hop/settle presentation into entity views. Reauthor town scale/plots. Rebuild localStorage economy, frame-time production, `tune.fill`, and the no-collision blocks.                                                                                                 |
| `net/depot.ts`, `net/timetable.ts`                              | Keep depot/flatbed comparison and next-stop transition idea (**Depends on D**). Replace moved palm charges, reload-stocked heaps, local activation history and per-tab phases with claims/shared descriptors.                                                                                                 |
| `src/sim/wagon.ts`, `src/physics/platforms.ts`, wagon prototype | Reuse analytic acceleration and platform-relative carry; separate passenger stops from construction joints. Promote to train entities; do not import production code from `src/proto/`.                                                                                                                       |
| `src/proto/crossing/`                                           | Keep explicit rail height/arc-length sampling, broad bend/deck proportions, instanced supports, free camera and recovery idea. Rebuild local elapsed clock, direct `rb.enableCcd`, velocity undo of the soft wall and duplicate sea shader. Future long crossing needs an engine-facade fix, not those hacks. |
| Haul, machine, `hut-blueprint.ts`, asset loader                 | Keep compact bundle, magnet presentation, 14 s script and phased assembly. Entity-own bodies/meshes and fix the laying endpoint jump; replace linear-site assumptions and ranked plaques.                                                                                                                     |

Start local services at 12 m/s wood, 16 m/s steam, with 4 m/s approaches and 6 s dwells. For the initial
185 m H–Jn leg, acceleration 4 m/s² gives about 18.4 s running at 12 m/s. Two shuttles on physically separate
directional lanes give about 24.4 s headway: roughly 36.6 s including 6 s access and mean wait, versus 44.6 s
walking 250 m (sprinting is still faster). Seek a bigger shortcut or better frequency before claiming rail
beats sprint. Once branches open, use short H–Jn and Jn–Je/works services with real passing sidings and
precomputed conflict-free calls; never send opposing trains through each other. Tune whole-trip times in play.

### Terrain and look — Depends on P, L

Today's **510 m / 409 × 409 / 1.25 m** terrain has tiled rendering and one Rapier heightfield.
`src/island/layout.ts` moves POIs and only three horizontal ROUTE entries; it cannot load new landforms,
raised rails or extra links, and leaves spawn/court/garden fixed. Extend previews with typed `homeProfile`
and `railGraph` references; do not mistake layout JSON for the terrain redesign.

Milestone 1 is a Local `?proto=threefold` chapter in `proto-threefold`: slabs, walls, bridge colliders,
coarse spire/town, fake load and local train. Scene masking/spawn changes stay flag-scoped; no live-save
writes. After P, shape the three lobes with `shape.ts`/`stamps.ts`/`ground.ts`, keep the grid, and replace
HOME_KEEP only for the new profile. Preview source IDs/plant masks are separate from today's pinned land.
At default cutover relocate arrival/court/toys and regenerate `home-land.json` via world-inputs so client,
server and tests agree. Heightfields handle single-valued land; gorge faces, bridges, underpasses and spire
get fixed mesh/primitive colliders through the facade. River ribbons are cosmetic, not a revived water sim.

Explicit rail y must not sample the gorge floor. Author paths, resource IDs and clearance/view masks before
seeded decor. Keep home collision resident; no giant sea heightfield or streaming framework. Reject future
out-of-bounds edits rather than clamping them into home. Entity step 20's validator may consume this data
later. Standard engines separate scene/cell residency and terrain geometry (Unity additive scenes, Unreal
World Partition, Godot background loading, documented in vast-world-scale); Boogle deliberately needs only
one resident home now, with separate bridge geometry. Step 22 precedes later island streaming.

Art target: **crossing-beauty shot 2 / Mario Sunshine**—blue depth, honey timber, cream stone, open cool
shadows, broad roofs/fronds, stable glints; shots 3/5 are moods. Promote only the sea pass that earns L into
shared TSL node materials and the existing Neutral HDR pipeline. Preserve coherent water/physics heights;
no wholesale look-lab high or ROM-derived assets. Blender supplies silhouettes/clips; code supplies terrain,
rail repetition, colliders and timing. Sunshine-look's Unity/Unreal/Godot comparison supports separate
surface/mask controls; Boogle approximates these in one sea material, without their larger water systems.

## Steps

Each number is **one PR**, awaiting plan approval. Production milestones require entity **10–12 plus
step 12's owner playtest**; no dependency on finishing 13–22. Every PR formats/lints its changed code and
passes `npm run check`; player-visible changes update `docs/game-design/` in the same commit. Add `rail.md`
and its index line with the system, update haul/island/player as they change, and keep prototype findings
labelled in net/crossing. Tick find-the-fun boxes only for completed playtests, never the parked opening day.

Every visible PR gets a named-question `look`, opened still/motion sheet and real-time observation for feel;
iterate up to three times and include a seen still in its PR. New unit tests: lockstep only. Add one scenario
for the new freight/claim/late-join contract; otherwise reuse existing checks. Run check:full and code review
for touched net/sync/game-world/server; check:gpu for networking/render-pipeline; load before/after presence
or room changes; perf for many meshes/lights/tick work with the GPU free. Update the rail Atlas story.

**Art/review budget:** one recommended result, at most two alternatives, same camera; batch wood, steam,
then character/train reviews. Art is cheap; the owner's attention is the limit. Follow
[asset-pipeline.md](asset-pipeline.md): Blender `.blend`/existing script sources, metres/named nodes,
headless `npm run assets`, meshopt GLB, KTX2 above 256 px, committed outputs/manifest, `assets -- --check`.
Start at 1 MB/asset, 12 MB total; measure before increasing. Flat colours first, code colliders, all new
source/tool modules `.ts`. Generated shipped images require the owner's contact-sheet pick.

- [ ] **1. Greybox hub/first gorge.** New `src/features/proto-threefold.ts`,
      `src/proto/threefold/{index,layout,ride}.ts`, `dev/look/evals/threefold.ts`; update prototype
      flags/playlist, `protos/protos.ts`, `docs/game-design/threefold.md` + index. Only H/Jw/A/B/Jn,
      low walk, rail chord, coarse town/spire and one source→haul→build cycle.
      **Entity dependency:** none; may precede 12. **Depends on P (test itself), D** (flatbed alternative).
      **Art:** code boxes. **Question:** “Does building this crossing make you want to use the line and
      reach the next place?” Look at both directions, missed departure, town sightline, clearance/recovery.
      A second no stops production.
- [ ] **2. Author Threefold ground.** Edit `src/island/{layout,shape,stamps,ground}.ts`; add
      `src/island/rail-home.ts`, `src/entities/home-structures/`. Preview arrival/source masks separately;
      defer court/grid and pinned home-land replacement to cutover. **Entity dependency:** 10–12;
      coordinate with 14's POIs. **Depends on P. Art:** one Blender spire/gorge kit after P passes.
      **Question:** “Can you learn the three places and see home changing from them?” Verify source cells,
      slopes, paths/underpasses and resident collision; look/perf before and after.
- [ ] **3. Graph and project bills.** Add `rail-projects` four-file set, sim `rail-home.ts`, rules entry,
      `src/entities/rail-worksite/`; register `?proto=rail-slice`, restricted to its isolated room.
      **Entity dependency:** 10–12, coordinate machine/hut step 14. **Depends on P, D. Art:** existing scaffold
      kit, code rails/signs. **Question:** “Is finishing a chosen segment satisfying before its reward?”
      Test eligibility, simultaneous pours/starts, caps, snapshots; look at 140-tick run/endpoint jump.
      Add `rail.md`, index and Atlas story.
- [ ] **4. The chop action.** Add source portion of `rail-supply` four-file set and
      `src/entities/rail-source/`; common hold contract in `src/player/hands.ts`, Buddy animation adapter.
      **Entity dependency:** 12. **Art:** Blender cut-tree/axe/upper-body clip, rock split, impact sound.
      **Question:** “Would you chop again with nothing to earn?” Follow harvest recs 1–9: 33 ms pose hold,
      50 ms final, 650 ms cosmetic fall, immediate swing readiness/earlier automatic magnet, no ordinary
      shake. Contact/notch/yield follow acceptance. Measure online scheduling delay (~450 ms possible);
      an unsatisfying confirmed hit blocks promotion pending a separate prediction design. Test A/B/A=8/4,
      capacity races/no timed refill; look at tap/hold/release on all controls. Version subsequent schema changes.
- [ ] **5. Shared train schedule.** Add `rail-service` four-file set and `src/entities/rail-train/`;
      reuse `src/sim/wagon.ts` arithmetic/platform facade. **Entity dependency:** 10–12 (18 optional).
      **Depends on P. Art:** existing greybox cars. **Question:** “Is this useful, dependable transport?”
      Test reload/late-join phase, next-stop upgrades, real passing geometry and stop/segment separation;
      observe both gorges in real time, adapting existing wagon-riders checks.
- [ ] **6. Counted freight.** Complete supply commissioning/queues/manifests/claims; add
      `src/entities/{rail-camp,rail-depot,rail-cargo}/` and adapters/server release/reach wiring.
      **Entity dependency:** 10–12. **Depends on D, P; H reserves only. Art:** net's code crates/racks/assembly.
      **Question:** “Does the last connection make this haul easier?” Test conservation, claim races,
      exactly-once arrivals; one sync scenario for two haulers, departure and late join. Full checks/review.
- [ ] **7. Wood town.** Add `src/entities/rail-town/`, stage consumption/tables, W1–W5 and C1/C2.
      **Entity dependency:** 10–12. **Depends on P, D; H optional. Art:** Blender wood kit, at most twelve
      modules for huts/workshop/mill/quarry; reuse scaffolding. **Question:** “Does town growth make you
      want the next connection?” Test one-time stage consumption; inspect hub/train/street views and walking
      during assembly; perf. Preserve old hut and usable streets.
- [ ] **8. Steam and loops.** Fill S1–S7/O1–O4, C3/C4 and town tables; two-stroke sources store remaining
      units so a partially worked tree cannot gain extra yield. **Entity dependency:** 10–12 (20 optional).
      **Depends on P, D; R land only; H yards only. Art:** Blender steam attachments, ore/works/quay, tower/truss kit.
      **Question:** “Does steam add places and choices instead of repeating wood?” Test branch order,
      alternate C2 key and late optional builds; look at both reveals/full solo route; perf.
- [ ] **9. Absence and thanks.** Complete `rail.attendance/rail.wake`, watermark and claim recovery in
      supply/server; equal-weight contributor view and welcome-back. **Entity dependency:** 10–12,
      coordinate UI step 14. **Depends on D. Art:** existing signs. **Question:** “Returning, is there help
      and still work for you?” Test empty live room, restart/repeated wake, departed carrier, no selected
      project. Full checks/review. All contributors visible without totals, rank or starter bonus.
- [ ] **10. Fit Buddy and the train.** Train/character/remote-player adapters, additive `railRide` presence.
      **Entity dependency:** 12, coordinate remote-player step 14; 18 optional. **Art:** Blender steam loco,
      two flatbeds/crate slots, heritage variant, fitted carry/chop/sit clips; no character redesign/rim light.
      **Question:** “Would you sit and ride again?” Observe boarding, sit/stand/jump, corners, remote riders,
      disconnect/background resume. Load before/after presence; full/GPU checks and asset perf.
- [ ] **11. Chosen daylight.** Accepted crossing sea graph into shared `src/render/` and home sea/sky views.
      **Entity dependency:** 12, coordinate step 14's sea/sky. **Depends on L, P. Art:** one shot-2 palette
      review, shoreline kit and two broad-frond palms. **Question:** “Is ordinary travel as inviting as the
      Sunshine reference?” Inspect seams/glints/contacts in motion. Desktop and M4 iPad, fixed pixel count,
      warm and 20-minute run; hypothesis 1.44 MP/p95 GPU ≤10 ms. Report unavailable GPU timing honestly.
      Render changes get perf/GPU checks; failed L keeps greybox visual acceptance open.
- [ ] **12. Cut over.** Default boot/arrival, old haul/site callers, rules registry/namespace, court/grid,
      `home-land.json` via world-inputs; retire superseded proto cards, update haul/island/player/rail docs
      and Atlas. Keep crossing diagnostic for later sea work. **Entity dependency:** 12 owner acceptance,
      not 13–22. **Depends on P, D, L; R/H parked. Art:** accepted kits only.
      **Question:** “After two hours, do you want to build toward the next island?” Check/review, full checks
      for touched sync/server paths, world-inputs, freight scenario, snapshot-size limit, observed solo run
      and friend joining mid-era. Report real duration/dead time; revise places/service, never inflate bills.

## Risks

- **Pacing/approval:** sixteen builds cannot alone fill two hours; stop after two supply cycles if the loop
  repeats without a new reason. D/P/L stay unresolved. Do not dress a failed prototype.
- **Authority:** queued edits may reject/drop. No speculative goods/fracture/spending; effects in `onApplied`,
  quiet snapshot reconstruction, verified-save guards retained. Hit-stop never pauses physics/world time.
- **Cutover:** audit old prototype/tune/era/haul callers and fixtures; preserve toys and Boogler lines.
  Temporary rule coexistence is isolated to prototype rooms; production never imports prototype modules.
- **Geometry/service:** the grid fits the envelope, not overhangs. Test rail y, camera/collider clearance and
  real passing geometry. Don't promote crossing's CCD/soft-wall hacks. Bound/instance crates and kit pieces;
  no whole-home shadow map or detailed distant city. Device budgets need measurement.
- **Coordination:** read at `ef43edce`; entity checklist lags code, so verify actual step-12 acceptance.
  Inflight fetches unconditionally and cannot refresh offline. Cached
  `ship/matias-franco-9fcb797` touches boogle-2.md; live PR state is unknown. Recheck before building,
  especially entity/terrain/render overlap. This task neither pushes nor ships and cannot see the game.

## Open questions for the owner

1. Does the depot playtest earn **D**, or should milestone 1 use the freight-flatbed rack alternative?
2. Does the first Threefold gorge earn **P**, including moving the town to the west terraces in the hub's view?
3. Does the crossing sea pass earn **L** against shot 2 in motion, or does it need another isolated look pass?
4. If the complete, enjoyable home run takes closer to an hour than two, should the remaining opening budget
   move to the next island, or should we design another consequential home branch before extending it?
5. Are the four camp identities, stage-2 tool/span capability and stage-3 works supply a good wood→steam
   distinction, before spending your review time on their Blender kits?
