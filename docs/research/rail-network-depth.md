# Rail network depth without a dispatching job

_Research report, 5 November 2026. Repository baseline `68ee082d`. Live primary-source research on Mini Metro, Sid Meier's Railroads!, Transport Fever 2, OpenTTD, Factorio, Satisfactory, Train Valley and Railbound. Scope: a possible later network layer, its smallest decision set, safe junctions, towns and resource hubs, cooperative editing, physical readability and an offline paper-model specification. Research only; no game or economy-model changes._

**Evidence:** **[V]** = fetched developer/manual text or inspected repository material; **[D]** = project-hosted community documentation; **[R]** = earlier Boogle research or recorded playtest, not reproduced; **[P]** = inference, proposed rule or illustrative arithmetic. All proposed numbers are hypotheses. No reference game was played, no video was watched and no Boogle playtest was run. The GDC source is its session abstract, not the talk. Not tested on a device.

## Answer first

**[P] Let friends choose what their railway connects and which physical bottleneck to improve; let the railway operate itself.** Start with two decisions: **which useful connection next**, and **which visible improvement next**. A third decision, a reversible service profile, must earn its place against an automatic good default. Do not start with manual signals, train orders, cargo filters, quotas, a scarce engine allocation screen or recurring dispatch work.

The smallest convincing network is a working trunk serving home, a material source and a frontier rack, with one optional branch or passing loop. Its improvement should change an observable delivery or journey. Connecting a material area should also enable upgrades outside the network, while smaller discovery/puzzle stops remain worthwhile without their own freight economy. This preserves the approximately eight-hour adventure rather than making railway administration its replacement.

**Disposition: paper proof first; gameplay deferred.** The owner's brief explicitly asks to simulate the network on paper first. [Progression's Simulation first and Disposition](../brainstorms/progression.md#shape) place that work after production core and the replay. This report specifies the experiment and checks a small arithmetic example; it does not implement or run that proposed simulation, select the campaign route, or clear either gate. Serves [DESIGN](../../DESIGN.md): **Toys before chores**, **Cooperation is automatic, not negotiated**, **Telegraph everything**, **Designed for drop-in, drop-out** and **Show, don't tell**.

## Baseline and what this adds to existing research

**[V]** The [decision index](../proposals/boogle-2.md#current-decision-index) routes this to the Design Table and later progression decisions: materials replace global eras; the opening path precedes trains; building, exploration and incremental growth share the game. [DESIGN's core loop](../../DESIGN.md#the-core-loop) says connecting installations supplies the line automatically, without routing or quotas. The owner's later free-track direction is not a complete construction specification. Authored corridors below are a bounded first test, not a permanent rejection of free track.

**[V]** [Progression](../brainstorms/progression.md) proposes big material areas, smaller ability/puzzle stops and cross-system fittings. Its specific Glasshouse/Shell/Exhibition route and open questions remain proposals. This report uses material names as examples, not adopted destinations. [Production core](../plans/production-core.md#reviewable-promotion-slices) owns the durable railway conversion. Its approved slices do not authorize this new management layer. The [4 November iPhone playtest](../playtests.md#2026-11-04-owner-solo-on-iphone-the-default-url) explicitly was not the co-op replay; the older [direction view](../direction.md) must not be read as current verification.

| Earlier work                                                                           | Keep and build on                                                                             | New question here / superseded assumptions                                                                                                                              |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Research map](research-map.md), recommendation 10                                     | Test a physical upgrade against automatic good service before management                      | Its 2 November six-era/ring summary predates the material-based direction; it is not today's campaign specification                                                     |
| [Rail as play](rail-as-play.md)                                                        | Player composes; system runs; forgiving placement and visible results                         | Its sand/tide, handcar, last-second switch and own-piece deletion proposals do not bind today's game. Here: no live service can be casually redirected beneath a friend |
| [Roundhouse management](roundhouse-management.md)                                      | Complete service profiles, physical fittings, safe activation, no appointed manager           | Do not repeat the building/engine catalogue. Test whether topology and congestion add value beyond its already-proposed Swift/Hauler comparison                         |
| [Rail economy model](rail-economy-model.md)                                            | Integer loads, actual trip thresholds, separate work/wait, honest content debt                | Replace its single-kit, serial supply approximation only in a later offline model; it cannot currently establish network performance                                    |
| [Upgrade economy](upgrade-economy.md) and [progression](../brainstorms/progression.md) | Materials unlock several kinds of improvement; keep manual work until its replacement is felt | Network fittings are one branch among carrying, abilities, town services and construction, not a new global era or an eight-hour quota                                  |

## Eight references: where their depth comes from

### Mini Metro: few objects, many relationships

**[V]** Dinosaur Polo Club describes drawing lines to meet changing city demand, with upgrades and distinct challenge/creative modes. The developers' postmortem records unexpectedly difficult balancing and an interface redesign that expanded into a complete visual overhaul. Jamie Churchman's GDC 2017 abstract frames visual language and subtraction as ways to support intrinsic reward. These support the method, not a claim that minimalism is cheap. [Developer press kit](https://dinopoloclub.com/press/mini-metro/), [developer postmortem](https://www.gamedeveloper.com/audio/postmortem-dinosaur-polo-club-s-i-mini-metro-i-), [GDC abstract](https://gdcvault.com/play/1024250/-Mini-Metro-When-Less).

**[P]** Borrow local interventions with a readable network-wide consequence: a shorter connection or capacity where cargo visibly queues. Do not borrow an ever-growing demand curve as Boogle's antagonist. Once automatic service and finite projects remove that pressure, fleet allocation may cease to be interesting. That is a question for the paper test, not a reason to introduce artificial scarcity. Radial Games' Switch edition advertises cooperative network building; it does not establish persistent online conflict handling or drop-in fairness. [Port developer](https://minimetro.radialgames.com/).

### Sid Meier's Railroads!: automate signals, retain service and place

**[V]** The original manual describes automatically placed signals at branches and stations, repeating routes with loading/unloading, train priorities, and parallel track construction. Cargo handled by cities and industries advances their growth; neglected places can shrink. Train Table removes money, maintenance and competition. Its routing difficulty is a crucial qualification: Easy and Medium can let trains pass through one another; Hard instead requires the player to fix a blockage. Automatic signalling alone is not its guarantee against jams. [Original manual, printed pp. 11, 17, 21, 24–29 and 39](https://cdn1.macgamestore.com/d2/manuals/railroads_manual.pdf).

**[P]** This is the strongest direct precedent for hiding signal installation while keeping a railway worth changing. Borrow a visible second track and a town altered by arrivals. Leave out per-stop car manifests, business competition, neglect decay and priority micromanagement. A town that remains built lets an absent friend enjoy the group's work. Automation removes a task; it does not prove that every junction layout is safe or that players will enjoy the remaining decisions.

### Transport Fever 2: topology, service and cargo destination are different layers

**[V]** Urban Games' manual distinguishes a line's ordered stops from its assigned vehicles. Alternative terminals can improve station throughput, but must be reachable from the train's terminal decision point. All railway signals are path signals; the manual still documents single-track deadlocks. Cargo selects a reachable destination through available lines, with filters able to restrict that selection. Town growth responds to reachable destinations and goods supply, among other factors. [Lines/vehicles](https://wiki.transportfever2.com/gamemanual/linesvehicles.html), [signals](https://wiki.transportfever2.com/doku.php?id=gamemanual:railwaysignals), [cargo](https://wiki.transportfever2.com/gamemanual/industriescargos.html), [towns](https://wiki.transportfever2.com/doku.php?id=gamemanual:towns).

**[P]** A connected rail does not itself establish a useful service: a train, loadable cargo, a reachable receiver and room to unload must agree. Boogle can generate those arrangements from authored connections and active project needs. Make a passing loop or receiving crane improve that complete chain. Avoid making players diagnose catchment, platform assignments or filters. Keep the useful distinction internally so the paper model never treats connectivity as infinite instantaneous delivery.

### OpenTTD: simplify the interface around the safest abstraction

**[V]** OpenTTD's developers explain why version 12 hid block signals by default: path signals generally produce fewer player problems. A reserved path can allow nonconflicting movements through an area instead of excluding every train from the whole block. The post explicitly distinguishes this from specialized, tightly optimized networks. [Developer explanation](https://www.openttd.org/news/2021/11/06/explaining-signals-ui-change).

**[D]** The project-hosted manual explains shared orders: editing one linked schedule changes every vehicle using it. Its signals guide emphasizes safe waiting positions. These are documentation evidence, not a source audit or a fresh playthrough. [Orders](https://wiki.openttd.org/en/Manual/Orders), [signals](https://wiki.openttd.org/en/Manual/Signals).

**[P]** Boogle should simplify further: present the complete junction, not a catalogue of signal types. Keep a single service definition when multiple trains genuinely share it, but show the affected services before an edit. “Shared” must not mean a small local change unexpectedly alters the whole room. Do not inherit OpenTTD's economic dashboard or expert railway throughput as the success criterion.

### Factorio: reserve the exit, and do not mistake automation for fairness

**[V]** Wube's chain-signal explanation separates deciding a train's destination from preventing collisions and blocked junctions. A chain signal checks that the relevant exit is free before admitting a train. Later, Wube documents two instructive failures: disabling a destination could strand an en-route train, and generic pooled trains could neglect remote mines. The announced solutions retain en-route commitments and add dispatch priority. [Friday Facts 81](https://www.factorio.com/blog/post/fff-81), [Friday Facts 395](https://www.factorio.com/blog/post/fff-395).

**[P]** Borrow the safety semantics without exposing the programming language. Protect a train's current journey and reserve somewhere its whole length can wait. Initially use complete, protected services rather than a universal pool that requires priorities to rescue neglected branches. If shared dispatch is ever justified, measure oldest unserved demand and maximum wait, not just total delivered cargo. A busy-looking railway can still be failing one friend at the frontier.

### Satisfactory: embodied machines do not make management lightweight

**[V]** Coffee Stain's Update 5 announcement distinguishes a single train on its own track from shared-track setups requiring signals. Block signals exclude other trains from a section; path signals reserve routes through intersections. The update also adds collisions, rerailing, timed/full-load stop conditions and cargo filters. This is specifically the developer's Update 5 description, not a claim that all release details are unchanged today. [Developer announcement, Trains](https://store.steampowered.com/news/posts/?appgroupname=Satisfactory&appids=526870&enddate=1638304636&feed=steam_community_announcements).

**[P]** Borrow seeing and riding the machine that does your work. Reject derailment repair as Boogle's network problem: it can stop everyone while only one player understands the cause. Freight that waits for a full load must not trap passengers. Signals should visibly explain waiting, while the safe layout and scheduler prevent the fault. Co-op availability alone says nothing about how simultaneous edits are resolved; that contract needs its own test.

### Train Valley: small scale can still demand continuous attention

**[V]** Flazm's original Train Valley press kit describes crossings, switches and figure-eight layouts, precise train control to avoid accidents, and building/scheduling while paused. The studio says player feedback led to a sandbox without time or money limits and a colour-blind mode. These are claims about the original Train Valley, not Train Valley 2 or World. [Developer press kit](https://flazm.com/pr-train-valley).

**[P]** Take the easily grasped local traffic problem and the visible pleasure of two services passing. Leave behind reaction-time dispatch and global pause. Boogle friends must be able to explore while the railway works; a player examining a turnout cannot freeze another player's jump. A local, disconnected puzzle siding could later use deliberate switching, but it must neither obstruct communal service nor become mandatory maintenance. This report does not propose building that side activity now.

### Railbound: prepare, run, understand, revise

**[V]** Afterburn's founder describes a limited-piece puzzle in which the player prepares the field and then watches it unfold. Apple's developer interview emphasizes forgiving undo and a deliberately malleable, one-finger track-painting interaction; ordered carriage connections, switches and gates provide complexity. [Afterburn interview](https://gameworldobserver.com/2022/06/03/afterburn-railbound-making-of-interview), [Apple's Behind the Design](https://developer.apple.com/news/?id=0x08hncy).

**[P]** This is the best model for the paper exercise: change one arrangement, predict it, then watch the consequences. Use a short ghost preview for a future junction edit, not trial-and-error damage to the live network. Borrow reversible experimentation, not a puzzle with one correct ordering for every material delivery. Shared persistent construction cannot simply reset like a puzzle board; only a local preview is freely erasable.

## The smallest decision set that might earn its place

All proposals below are **[P]**. Meaningful depth is a choice between useful consequences, not the number of settings. Scarcity can be the group's attention and construction order; it need not be a contested inventory of essential trains.

| Decision                                 | Concrete Boogle choice                                                          | Honest consequence                                                               | Automate or cut                                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **1. Which connection next?**            | A discovered source spur versus a shortcut between already useful places        | New material capabilities versus less repeated travel; both eventually buildable | Automatic trains, routing and cargo acceptance. If the shortcut sees no repeat trips, there is no meaningful choice               |
| **2. Which bottleneck to improve?**      | A wagon fitting, a passing loop or a receiving crane at the observed constraint | Fewer delivery batches, less opposing-traffic wait or faster unloading           | No fuel, maintenance, signalling or station staffing. If one fitting dominates every situation, make it a straightforward upgrade |
| **3. Optional: which service emphasis?** | A complete Swift/Hauler profile on an already adequately served line            | A visible ride-time versus batch-size difference                                 | Defer until decisions 1–2 work. No sliders, full-load switches or allocation that removes another line's basic service            |

Try **two useful choices visible at once**, not three management menus. Both friends can work on different projects using their own donated materials. Network improvements belong to the room. A new engine joins as useful capacity or expression; it is not an excuse to withdraw the previous service. Automatic service does not mean a free engine per connection: extend a validated route or include the required capacity in the connection's authored build. Keep fixed bills independent of headcount, and do not require everyone to approve each improvement.

For an eight-hour game, introduce network depth after a player has experienced an ordinary delivery and a repeat journey. A new material may unlock a new kind of railway fitting, but every big area need not add another rule. Optional small stops can attach to existing passenger service without generating another commodity or timetable. An hour of maintaining a solved network is not an hour of adventure content. Preserve the [rail-economy report's content warning](rail-economy-model.md#answer-first).

## Signals and junctions without a signalling course

**[P] Choose complete physical layouts, with automatic operation.** The first catalogue needs only a branch with a safe holding pocket and a passing loop. Defer arbitrary crossings, yards, multi-platform sorting and unconstrained free-track operations until those patterns show value. A siding must be longer than the longest admitted consist, including clearance; a newly unlocked longer wagon cannot silently invalidate it.

The internal rule should be explainable in ordinary language: **a train enters a shared section only when its entire path to a safe waiting place is reserved**. The visible turnout points and semaphore then show that accepted movement. Players do not place signals, flip a live switch at the last second or choose block versus path semantics. This takes safety ideas from Factorio/OpenTTD without pretending their implementations are interchangeable.

Model the following separately:

- **Conflict:** two routes use the same rail or cross physically. Nonconflicting movements may proceed together; the smallest prototype can conservatively admit only one.
- **Clearance:** the tail, not just the engine, must leave before a conflicting reservation is released. A full receiving berth prevents admission before the junction.
- **Fairness:** an older ready movement eventually goes before recurring newer movements. Give the initial service a bounded schedule; do not expose priority numbers to fix starvation.
- **Liveness:** safe local reservations alone do not prove a whole ring cannot deadlock. Fully occupied destination berths can form a cycle. Keep spare receiving capacity, bound admitted trains and reject an unsupported layout/service combination before activation.
- **Revision:** preserve the old valid route until trains have cleared the changed section. Additive branches can open sooner than replacement sections; there is no universal whole-network shutdown.

For the small authored network, compare a validated repeating schedule with a simple event-driven reservation model on paper. A repeating schedule is the preferred first candidate because departures stay predictable. Variable dwell and new train conflicts must still be represented. Do not claim that arbitrary congestion remains a pose derived solely from tick and static topology: either it is encoded in a valid schedule or it needs saved operational state. This report makes no runtime scheduler selection.

If the player must see “deadlock,” “no path” or a signal tutorial to keep ordinary deliveries working, the proposed scope has failed. Those belong in developer diagnostics. A short visible wait can be understandable; a permanent stop requiring rescue is not a funny failure for a drop-in railway.

## Towns, resource hubs and physical readability

**[P] Use a demand graph of specific useful projects, not a population-maintenance economy.** For example, a fibre source exports bundles to home: one installation improves the carrying sling, another fits the unloading crane, while awnings make the town's change visible. The same material could improve a traversal tool. These are examples from [progression](../brainstorms/progression.md#best-suggestions), not a selected route or final recipes. A frontier rack accepts the kit for the next hand-built segment. Earlier hubs remain useful ingredients in later mixed-material recipes.

Connection automatically registers eligible destinations. The player funds physical projects; the network determines their ordinary delivery, without per-good priorities. Existing commitments retain their cargo. For the first comparison, finish the oldest funded request before a later request, with a protected passenger service; test whether this creates unreasonable waiting before adopting it. Completed towns neither shrink nor demand recurrent upkeep. At full storage, production waits rather than deleting counted goods or inventing somewhere to sell them.

Offline work respects the recorded bounded-project direction: finish already committed work, then stop expanding. Represent which project is eligible and what stock is already reserved. Do not reinterpret “whatever you kicked off finishes” as unlimited remote resource accumulation or automatically chosen future construction. Where multiple simultaneous projects would exceed that cap, retain their queues for return rather than guessing an expanded offline policy.

| Fact the model counts         | Physical evidence the player can read                                       | Useful fallback when occluded                                                               |
| ----------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Material available / missing  | Distinct bundles in shaped rack sockets; a genuinely empty matching space   | Focused material icon and count, not a permanent dashboard                                  |
| Cargo reserved and travelling | The corresponding loaded wagon, destination symbol repeated at its receiver | On-focus destination and next arrival; do not show the same units as spendable at both ends |
| Passing / waiting             | Whole trains in visible pockets; points aligned with the accepted route     | Short reason attached to the stopped train, with direction and shape as well as colour      |
| Added capacity                | An actual wagon or larger rack with additional occupied positions           | Before/after number only while inspecting the fitting                                       |
| A town project completed      | Pieces arrive, scaffold changes, a useful door or machine opens             | Quiet durable changed state for a late visitor, not a replayed collision-blocking ceremony  |
| A connection planned / active | Transparent local preview versus solid completed track                      | Clear pending/accepted state; a ghost train is explicitly a preview                         |

Read this from Buddy height, the arrival platform and the train deck. Separate passenger boarding from freight unloading; keep a walking route beside queues so a late delivery never traps a visitor. Use destination silhouettes, pictograms and names with colour, not colour alone. A closer supply rack can be a better network reward than a faster engine because it removes the last repeated walk. An optional schematic at the junction may help inspect a preview, but it is not authority to start the deferred map/fast-travel feature.

[Owner calls](../agents/owner-calls.md#owners-standing-calls) require counted work to take physical form and machine motion to be designed before its shell. A later visual proof therefore needs the points, full consist, cargo and unloading sequence visible together; a pretty overhead network screenshot cannot establish third-person readability. WebGPU/TSL is the presentation layer, not a reason to simulate economics in meshes. No renderer changes are proposed here.

## Co-op editing without a manager or silent overwrites

**[P] Friends collaborate by adding service and infrastructure; conflicts are resolved on the smallest affected object.** Reuse the [roundhouse's per-line revision idea](roundhouse-management.md#several-players-one-railway-nobody-appointed-manager) and [production-core transaction contract](../plans/production-core.md#transaction-contract-every-unit-has-one-home), not a global editor lock. Previewing is local and consumes nothing. Once a shared change is accepted, its pending state is visible to everybody.

| Concurrent case                                       | Proposed result to model                                                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Two players fund the same frame                       | Accept only its remaining need; excess stays with the contributor. Both can help without negotiation                                |
| Two incompatible edits to one junction revision       | First valid ordered request wins; the other refreshes to the accepted layout with no spend and no automatic retry                   |
| Edits to distinct junctions                           | Both may proceed if their affected routes and reservations do not conflict; separate IDs alone do not prove independence            |
| A rider crosses during an accepted change             | Finish that movement on the old geometry; activate the new configuration at a declared safe boundary                                |
| Someone leaves with a preview or pending installation | Preview disappears; an accepted funded installation belongs to the room and completes without its initiator                         |
| Undo after a friend uses the new connection           | Cancel an uncommitted preview freely. Do not roll back another person's cargo or remove the last service; propose a new safe change |
| Reconnect repeats a request or arrival                | Same request/transfer identity cannot spend or deliver twice; snapshot restores pending work without replaying its old effects      |

Avoid a queue of opposing configuration requests: one pending change per affected component, then re-evaluate. The roundhouse report's “complete one trip before another fitting” is a useful candidate for preventing thrashing, not a global cooldown law. No shared-wallet spending, owner-only controls, compulsory votes or whole-room pause. A friend who never opens the editor must still be able to build, ride and understand the result.

**[V] Engine comparison:** Unity's Netcode documentation, displaying version 2.4.2 when fetched, distinguishes late-join synchronized variables from one-off RPCs; Epic describes the server as authoritative in networked play; Godot distinguishes authority RPCs from client-callable input requests. These do not automatically provide semantic conflict resolution or durable saves. [Unity NetworkVariables](https://mp-docs.dl.it.unity3d.com/netcode/current/basics/networkvariable/), [Unreal networking overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-overview-for-unreal-engine), [Godot high-level multiplayer](https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html).

**[P] Boogle fit:** preserve the repository's [sync contract](../agents/sync.md), server-stamped durable edits and accepted-result effects. Mesh motion and Rapier are not authoritative cargo. A future implementation must decide saved route/configuration revisions, activation ticks, manifest/transfer IDs and reservations within the existing railway owner, following [mixed-build rules](../agents/mixed-builds.md). This is an application of existing contracts, not a new protocol proposal or permission to modify production core.

## What the paper simulation must model

### Existing tool: useful baseline, insufficient network model

**[V]** After `npm run map -- dev/economy`, focused reads of [`model.ts`](../../dev/economy/model.ts) found `Table.links`, sequential station work, `Station.supply`, integer recipes and capacity thresholds, and a 1–4-active-player limit. Its supply calculation is:

```text
batches = ceil(suppliedUnits / batchCapacity)
ready = max(0, suppliedUnits / productionRate - productionLead)
      + (2*batches - 1) * completedRailLength / trainSpeed
      + batches * dwell
wait = max(0, ready - permittedApproachOverlap)
```

It reserves one station kit, produces before transporting, and advances a serial clock. It has no explicit rail graph, train occupancy, contention, receiver queues, partial streaming, joint project stock ledger or editing events. Increasing its supply-rate multiplier cannot test a junction. Its historical `eras` table remains a fixture, not current campaign direction. [`place-level.ts`](../../dev/economy/place-level.ts) is identified by the map as the existing progression checker; this research does not audit it or propose replacing it with economic optimization.

**[P] Later extension:** retain the current calculations as baseline fixtures and add an offline event model under `dev/economy`, importing no renderer or live room code. Do not commit a parallel game simulation before knowing which variables matter. The initial paper cards and event ledger should use the same units and inputs the later tool would need:

| Model object           | Minimum facts                                                                                                                     | Failure invisible without it                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Places and connections | Stable node/edge IDs; built/locked/pending; direction; length or measured run time; material prerequisites                        | A shortcut already assumed open, or a resource required to reach itself    |
| Track conflicts        | Shared-section IDs, allowed simultaneous paths, full-train berth lengths/capacity, tail clearance                                 | Opposing trains pass through each other or wait inside a junction          |
| Service and train      | Stable IDs, route, complete profile, cargo capacity, passenger access, departure phase, dwell, current leg                        | Extra trains create fake throughput; upgrading teleports an occupied train |
| Material ledger        | Per-good integer stock at source, wagon, hub, rack, player and committed installation; reservations are a subset, not extra stock | Double spending, ghost freight or two projects claiming one bundle         |
| Production and recipes | Per-good production intervals, inputs/outputs, source/output limits and starvation                                                | One pooled rate hides the missing slow ingredient                          |
| Receivers              | Remaining project bill, unloading duration, available storage and safe berth                                                      | Freight arrives but cannot become useful                                   |
| Human work             | Active workers over time, approach, carry capacity, distance, deposit and build work; distinguish busy from connected             | Two friends halve a train wait or six idle peers multiply output           |
| Project choices        | Which connection/fitting is started, dependencies, fixed cost, construction time and activation                                   | Benefits counted before the upgrade exists; no opportunity cost            |
| Edits and departures   | Request order, expected affected revisions, acceptance/rejection, safe activation and leave/rejoin                                | A superficially valid solo layout is unusable cooperatively                |
| Campaign and absence   | Named discoveries/abilities, capped committed offline project, persistent capabilities, session attendance                        | An eight-hour total made of waiting, or infinite progress while away       |

Use integer pieces and integer time units. Keep unit conversions explicit: one physical bundle represents a specified number of material units, not an unlabelled “crate equivalent.” Recipe conversion records both consumed input and produced output. Stock reserved for an installation remains in exactly one location until moved or consumed; a reservation is a claim on that stock.

### Event order and measurements

**[P]** One model step at a timestamp should: finish already scheduled arrivals and transfers once; release cleared resources; apply ordered player/project requests; finish production if its destination buffer has room; choose eligible loads; reserve a complete movement to a safe berth; schedule departure/arrival events. Use stable IDs to resolve ties. Load/unload takes time, so an arrival is not instant spendable inventory. Record the order as part of the fixture rather than letting collection iteration decide winners.

Save enough model state to resume halfway through a delivery or pending junction change. This is an offline correctness question, not a wire-format design. Detect a dependency dead end separately from temporary waiting; detect a wait-for cycle separately from low production. Check material accounting including consumed recipe inputs, route reachability, capacity, safe occupancy and monotonic once-only delivery identities.

Report **time to first useful load, time to complete the active project, player travel/wait/handling, useful cargo delivered, oldest unserved request, maximum passenger wait, blocked-section time, storage peaks, rejected edits and manual interventions**. Include where each fitting changes those outputs. Total throughput alone rewards sending cargo nobody needs. Report campaign minutes by activity and named new experience; do not count overlapping delivery and exploration twice.

For each resource flow:

```text
cycle = outward run + return run + both terminal dwells + conflict waits
transport ceiling per minute = 60 * cargo capacity / cycle
useful rate <= min(source output, transport ceiling, receiver capacity, remaining demand rate)
```

This is a diagnostic bound, not the event model. A finite project often benefits from crossing a batch threshold even when its long-run average rate does not change. Conversely, adding a train can increase conflict wait enough to reduce useful deliveries.

### Worked paper case: distinguish a wagon upgrade from a siding

**[P, arithmetic only]** Two terminals S (source) and H (home), each with off-mainline berths for two whole trains. One single-track corridor takes **60 s** each way, with **10 s** dwell at each terminal. Train A carries **8 units** S→H and returns empty. Start at `t=0` ready to depart, already loaded; source stock is sufficient for a **12-unit** home project. Ignore acceleration and tail-clearance time only in this illustrative calculation. “Arrival” below precedes the 10 s unloading dwell, which is included in project-ready time.

| Arrangement                                   | A's first two loaded arrivals at H | All 12 units unloaded |      Saturated A delivery ceiling |
| --------------------------------------------- | ---------------------------------- | --------------------: | --------------------------------: |
| One train, 8 units                            | 60 s, 200 s                        |                 210 s |     8 × 60 / 140 = 3.43 units/min |
| One train, 12-unit wagon fitting              | 60 s, 200 s; second unnecessary    |                  70 s |    12 × 60 / 140 = 5.14 units/min |
| One train, shortcut reducing each run to 45 s | 45 s, 155 s                        |                 165 s |     8 × 60 / 110 = 4.36 units/min |
| Add opposing shuttle B; no passing loop       | 60 s, 300 s                        |                 310 s |     8 × 60 / 240 = 2.00 units/min |
| Same A+B with a midpoint passing loop         | 60 s, 200 s                        |                 210 s | 3.43 units/min for A; B also runs |

For the fourth row, B begins ready at H. Oldest-ready admission, A winning the initial tie, produces corridor use **A S→H 0–60; B H→S 60–120; A H→S 120–180; B S→H 180–240; A S→H 240–300**. A is ready to return at 70 but waits until 120. Both terminal pockets are essential; without them a waiting train could obstruct the arriving train. With the passing loop, both trains leave at 0, pass at 30, reach the other terminal at 60, dwell to 70 and return by 130; A loads and leaves again at 140. The two half-corridors are independently reserved and the loop accommodates both full trains.

**Interpretation:** the wagon fitting removes a second batch; the siding fixes interference, but does nothing for the one-train case. Neither deserves a universal “+throughput” buff. At a steady source rate of **2 units/min**, the first three arrangements are all source-limited in the long run; their different nominal ceilings do not create extra material. The preloaded 12-unit case must not be used as a cold-start forecast. Include production and loading from empty in the actual model.

These times exclude constructing the fitting/shortcut/loop. Add each project's actual material and work cost before comparing completion or payback. A loop saving 100 s on the second delivery can still be a poor next build if it takes longer and no further traffic uses it. No fleet count, speed or timing here is proposed as production tuning. The calculation is a hand-checkable fixture, not evidence of fun or an executed simulation.

### Required comparisons and rejection cases

**[P]** Use the same discovered places, bills and capabilities for every variant:

- **Automatic baseline / topology only / topology plus fitting / optional profile:** compare incrementally; do not bundle a shorter route, more cargo and reduced bills and attribute the result to “management.”
- **Demand regimes:** source-limited, transport-limited, unloading-limited, then a mixed recipe missing one ingredient. Include exhausted demand and full receivers; improvements may legitimately have no current value.
- **Network shapes:** trunk plus spur, optional shortcut, two opposing trains and passing loop, then a ring with all receiving berths occupied. Reject unsupported admissions before a player can create a permanent jam.
- **Attendance:** one, two, four and six active workers, then 4→1 and a late joiner. The current tool only accepts up to four; six requires an explicit later extension. Costs stay fixed and nobody's departure removes shared capability.
- **Conflict cases:** simultaneous incompatible junction edits; separate edits sharing a downstream conflict section; partial donations racing a purchase; disconnect during fitting; duplicate delivery after resume. Count both refused actions and whether the player can understand the result.
- **Absence and pacing:** resume before an arrival, after an arrival and after the bounded offline project finishes. No auto-selection of the next project. Vary traffic demand, production, dwell and travel by 0.5×/1×/2×; mark any conclusion that changes sign.

A candidate survives the arithmetic screen only if it produces **at least two situations with different useful improvements**, keeps service running unattended, preserves all material, and needs no manual dispatch repairs. A numerical win is insufficient: the player must predict the improvement from the physical problem and want to make it. If capacity or profile changes do not alter a useful load or journey, remove the choice rather than enlarging bills to rescue it.

## Numbered recommendations and the smallest proof for each

All are **[P]**, ordered by what the later prototype must establish. They do not authorize implementation.

1. **Keep connection order and bottleneck upgrades as the initial two decisions.** Touches [progression's material/system upgrades](../brainstorms/progression.md#best-suggestions) and [DESIGN's core loop](../../DESIGN.md#the-core-loop). **Proof:** on the same paper map, compare automatic service with one source spur versus one useful shortcut. If one is always obligatory or irrelevant, remove the apparent choice.

2. **Package junctions as safe authored constructions with automatic signals.** Touches [production-core's later railway scope](../plans/production-core.md#reviewable-promotion-slices) and the [rail-as-play alternatives](rail-as-play.md#three-variants-from-light-to-deep). **Proof:** opposing trains, a full receiver and the longest consist traverse a branch/loop fixture with zero manual recovery; unsupported combinations are refused before activation. Free-track expansion waits for its own design.

3. **Give each new material several useful destinations and every connection automatic service.** Touches [progression](../brainstorms/progression.md#best-suggestions) and [upgrade economy](upgrade-economy.md). **Proof:** one source supplies a home fitting and a frontier kit; both become visibly useful without cargo filters or a shared wallet. Towns retain completed growth and smaller stops need no new commodity.

4. **Make co-op edits local in scope, atomic in cost and safe for occupied trains.** Touches [production-core transactions](../plans/production-core.md#transaction-contract-every-unit-has-one-home) and [roundhouse cooperation](roundhouse-management.md#several-players-one-railway-nobody-appointed-manager). **Proof:** model two racing edits, a rider, a disconnect and duplicate delivery; preserve cargo, current journeys and one accepted revision without global locks or privileged players.

5. **Make the bottleneck readable at player height.** Touches [owner calls on physical machines](../agents/owner-calls.md#owners-standing-calls) and [progression's first fitting](../brainstorms/progression.md#done-means). **Proof after paper success:** one visible queue, one fitted improvement and its next delivery, inspected from platform and deck. The owner should identify what improved without opening statistics; no art pass precedes this test.

6. **Extend the offline economy model with graph events and material accounts before a network implementation.** Touches [`dev/economy/model.ts`](../../dev/economy/model.ts) and [rail-economy assumptions](rail-economy-model.md#the-working-model). **Proof:** reproduce the worked trace, then test source/transport/receiver limits, mixed recipes, concurrent projects, bounded absence and 1–6 workers. Report useful delivery and player wait, not only throughput.

7. **Defer service profiles until an automatic default loses a meaningful comparison.** Touches [roundhouse's decision set](roundhouse-management.md#the-smallest-honest-decision-set). **Proof:** add Swift/Hauler to the otherwise identical paper fixture only after topology/fittings work. Cut the choice if a profile dominates, requires constant retuning, or makes a friend's ordinary ride worse than the protected baseline.

8. **Prototype one paper junction first, then stop for the owner's verdict.** Touches [progression's simulation gate](../brainstorms/progression.md#shape), [find-the-fun rules](../plans/find-the-fun.md#rules-for-every-prototype) and [owner playtest calls](../agents/owner-calls.md#owners-standing-calls). **Proof:** the short exercise below; a later playable prototype requires the gameplay brainstorm and existing production/replay prerequisites, not just favorable numbers.

## First prototype: a ten-minute paper railway

**[P]** Prepare one sheet with **home, one material source, one frontier rack and one small discovery stop**; three working connections; two train tokens; cargo pieces; and one optional shortcut/passing-loop card. Use source, storage, service and project cards from the model specification. The discovery stop gives a reason to ride, not another production chain. Show two funded-project opportunities with different consequences, not a global menu of upgrades.

First the facilitator operates a good automatic baseline for a few departures. The owner predicts and tries one connection or bottleneck change, then watches the same departures again. Only after the solo question works, let a second person fund another project and submit one conflicting edit without chat. The facilitator resolves transport and conflicts; the player should not be doing bookkeeping. Do not enact the whole eight-hour campaign or ask a long survey.

**New:** “Your junction lets the supply train and your ride keep moving.” **Gut question:** **“Did changing the railway make you want to improve it again, or did it feel like managing chores?”** Record the choice, prediction, useful deliveries, confusing waits and interventions separately from that verdict. Stop if the owner prefers automatic service, cannot read the consequence, or wants only the physical fitting. Retain the satisfying upgrade and drop the extra management. After a positive verdict and the existing gates, brainstorm one embodied junction proof; paper cannot establish movement, co-op feel or fun across eight hours.

## Verification and limits

Live sources above were fetched on 5 November 2026. Primary evidence includes developer manuals/posts, the Mini Metro postmortem, Railbound developer interviews and a GDC abstract. OpenTTD wiki material is marked **[D]**; its developer signalling article is **[V]**. The Railroads! manual is original publisher/developer material hosted by a retailer. Satisfactory evidence is pinned to the 2021 Update 5 announcement. Unity's displayed documentation version is recorded because its older documentation site warns that it is being archived; it is not a latest-package claim. No reference-game mechanics are inferred from Steam user tags or reviews.

Repository work read the research map before following related reports, used the house format in roundhouse and rail-economy research, and mapped `dev/economy` before focused code inspection. There is no nested `AGENTS.md` under `docs/` or `dev/economy`; no high-risk runtime source folder was edited or audited. Runtime examples in earlier reports were not re-verified here. The arithmetic table is an illustrative fixture, not measured gameplay or output from a new tool. No claim is made about current railway migration completion, collision-free arbitrary graphs, rendering cost, owner approval or shipped network management.

Documentation validation: Prettier with the Markdown ignore overridden, the repository's scoped lint command, and all 39 local link targets and their heading fragments checked. No browser, runtime tests or full build were needed for these two documentation changes. No push or deployment is part of this task.
