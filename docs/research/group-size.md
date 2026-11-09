# One railway for one to four friends

> **Verdict:** Fixed bills, friends shorten work; designed for one to three players.
> **Top recommendations:** 1. Keep bills, per-source yield and installed capacities independent of attendance. 2. Give four willing players usable space and several short-lived jobs around one outcome. 3. Make main-line puzzles sequentially solvable and permanently useful.
> **Status:** adopted. See [Progress and rewards](../decisions.md#progress-and-rewards).

_Note added 6 November 2026: the owner moved the main-game target to roughly six hours, a rough target rather than a rule, with solo and groups of two or three close together ([decision log](../decisions.md#the-shape-of-the-game)). Read eight-hour figures below as the earlier target._

_Note added 6 November 2026: the owner now designs and tunes for 1–3 players, tolerates 4 and doesn't design for more ([economy principles amended](../decisions.md#progress-and-rewards)). Read "one to four" below with that target. All progression is shared, so every upgrade and ability applies to everyone present._

_Research report, 5 November 2026. Costs, hauling, puzzles, pacing, rewards, abilities and changing attendance across 1–4 players. Live primary-source research on It Takes Two, Valheim, Deep Rock Galactic, Overcooked, Satisfactory, Minecraft, PEAK, Lethal Company and Animal Crossing; repository inspection and offline arithmetic at `68ee082d`. Research only: no gameplay changes, commercial-game play sessions, browser runs or device tests. Recommendations are proposals, not owner decisions._

## The answer to test

**Keep the railway's bills fixed and let friends shorten work. Make room for several useful actions, then bring people back together at the result.** Solo should solve the same places sequentially; a group can overlap gathering, carrying, preparing access and exploring. Do not preserve eight hours by multiplying invoices, slowing machines or making four people repeat every discovery.

The first unresolved question is whether a third and fourth willing helper can find something worthwhile to do. The existing paper model already predicts diminishing returns, but cannot distinguish happily riding beside a friend from waiting because the only interaction point is occupied. Start with that distinction before inventing multiplayer bonuses.

**Evidence:** **[V]** is fetched primary text or inspected repository material; **[S]** is indexed primary text or an unofficial transcript of developer speech; **[I]** is inference or a proposed Boogle experiment. Store descriptions establish offered mechanics, not retention, optimal balance or causal effects on fun. Historical developer accounts establish their design at that time. No exact commercial-game scaling formula is asserted without a primary source.

## What this adds to the existing research

The [research map](research-map.md) is the starting filter, not current implementation authority. This report extends the following work:

| Existing report                                                                        | Retain                                                                                              | Addition here / correction                                                                                                                                                     |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Shared construction](shared-construction.md)                                          | Fixed bills, readable common work, several approaches, no forced relay, departure safety            | Explicit 1/2/3/4 comparisons, saturated work sites, puzzle topology and per-player simulation outputs. Its 12-log carrying example and Local-only Place description are dated. |
| [Communal progression](communal-progression.md)                                        | Persistent changes belong to the place; cosmetics can remain personal                               | Its restoration/farming loop, minimum-player landmark wants, host persistence and copy cuts are superseded. Do not import them.                                                |
| [Sharing and joining](sharing-and-joining.md)                                          | Joining friction and correct room identity affect actual co-play time                               | Its teleport-to-friend proposal and old default room are superseded. Measure arrival-to-useful-action from the current arrival, without reopening invite services.             |
| [Eight-hour pacing](eight-hour-pacing.md), [rail economy model](rail-economy-model.md) | Separate divisible work, travel, authored activity and waiting                                      | Old era schedules are historical fixtures. Compare room time with each person's experience; inspect how much time is merely an authored placeholder.                           |
| [Upgrade economy](upgrade-economy.md), [next destinations](next-destinations.md)       | Conserved component stocks, several uses per material, purchase-order tests, a meaningful first use | Add attendance, unequal skills, resource contention, reward eligibility and solo-safe puzzle state to their proposed offline model. Do not select a route here.                |

**[V] Current constraints.** [DESIGN](../../DESIGN.md) requires automatic cooperation, pleasant solo play, optional side activities, shared world progress and personal rewards. Its broader target is 1–6; this brief and the offline tool cover 1–4, so this report does not establish five/six-player readiness. The [decision log](../decisions.md#the-shape-of-the-game) sets about eight hours, building/exploration/incremental growth together, a few main-line ability gates, materials instead of eras, and a return to the original island. The [progression brief](../brainstorms/progression.md) proposes big resource areas, smaller puzzle/ability stops and one material improving several systems. Its named destinations and first fibre build remain proposals.

The [production-core transaction contract](../plans/production-core.md#transaction-contract-every-unit-has-one-home) already specifies fixed bills, accepted transfers, individually owned raw cargo and completion of already-funded work while absent. Its [promotion slices](../plans/production-core.md#reviewable-promotion-slices) remain the implementation route. This report neither replaces that architecture nor approves new operations. The [current Place chapter](../game-design/place.md#the-run) records two fixed sitting slots on empty train cars; four-player transport must be checked using actual standing/deck access as well as seats, not assumed from a seat count.

**[V] Evidence is still uneven.** The [3 November co-op notes](../playtests.md) record an unexplained shared axe unlock, different local discovery presentations and unresolved co-carry experience. The latest dated entry is the owner's 4 November solo iPhone run, explicitly not the co-op replay. The [round-4 tracker](../plans/round-4-notes.md) records fixes and bot evidence, not a new human verdict. [Direction](../direction.md) is a dated derived view; the later owner exceptions in the decision log control work sequencing. Research is authorized now; this report starts no prototype or agent track.

## Nine games: what actually scales, and what transfers

### It Takes Two: complementarity bought with a fixed pair

**[S]** Hazelight/EA describe an adventure built for two, with changing character abilities and challenges requiring cooperation in the [official gameplay presentation](https://www.youtube.com/watch?v=GAWHzGNcTEw) (indexed description read; video not watched). This is authored interdependence, not automatic 1–4 scaling. **[V]** EA's [FAQ](https://www.ea.com/games/it-takes-two/it-takes-two/faq) says both online players must be present; a joining player's saved progress unlocks preceding chapters for later access. Friend's Pass lowers purchase friction, but does not remove the second-person requirement.

**[I] Boogle:** borrow two actions making one visible consequence, and vary the relationship between abilities. Reject a main-line switch that needs a permanently occupied second body. A solo player should be able to set a mechanism, leave it latched, traverse, and finish; a friend can operate it while the first travels. Three and four players need another useful approach or optional activity, not a second compulsory pair. Chapter access is a useful analogy for catch-up; it is not evidence that a late player understands an ability they never learned.

### Valheim: shared infrastructure and individual provisioning are different costs

**[V]** Iron Gate's [FAQ](https://www.valheimgame.com/faq/) describes solo/co-op play, biome-specific resources, refining stations, personal equipment, boats and bases. Its [dedicated-server guide](https://www.valheimgame.com/support/a-guide-to-dedicated-servers/) documents explicit world settings for resources, combat, raids, portals and no-build-cost, plus persistent access for friends. These are configured world policies; the guide does not establish automatic recipe inflation when someone joins. Exact nearby-player enemy multipliers and equipment-yield formulas were not verified here.

**[I] Boogle:** distinguish the one bridge everyone uses from four sets of personal gear. Even with unchanged unit recipes, buying each player a mandatory tool can multiply the effective campaign bill. Prefer a shared fitting that makes the capability available to present and later visitors. Resource-rich areas can support gathering apart and returning with useful loads, but four players stripping a finite grove can make the next solo session worse. Count depletion and reachable reserves, not only current throughput. Valheim's survival burden is not Boogle's pacing target.

### Deep Rock Galactic: scale pressure and compensate for missing capabilities

**[V]** In the historical developer post [“Making a 1–4 player co-op game”](https://www.deeprockgalactic.com/updatesold), Ghost Ship explains that it scaled enemy difficulty by player count instead of building human-like replacement bots; Bosco supports solo mining, combat and revival. The developers explicitly describe solo adaptation as difficult. The [official game description](https://store.steampowered.com/app/548430/Deep_Rock_Galactic/) supplies the complementary-class context. This is strong evidence for separate solo design work, not a formula for shared construction bills or proof of today's exact enemy/reward coefficients.

**[I] Boogle:** audit missing functions, not just missing hands. Can one player retrieve cargo, reach the control and open the path? A latch or reachable machine control may solve the problem more cheaply than a companion AI. Do not introduce classes that withhold hook, glider or basic building from some friends. Shared installed tools can create temporary, freely exchanged jobs. Enemy-pressure scaling is a poor justification for making a fixed bridge require more timber.

### Overcooked: geography creates jobs; thresholds require separate balancing

**[V]** In a [firsthand interview](https://www.gamedeveloper.com/design/road-to-the-igf-ghost-town-games-i-overcooked-i-), Ghost Town's Phil Duncan says the original game's levels have different score boundaries for one, two, three and four players, and that movement/chopping changes forced widespread retuning. Team17's [AYCE patch](https://www.team17.com/news/new-overcooked-all-you-can-eat-patch-improved-online-matchmaking-bug-fixes-and-more) fixes departure leaving the last player without a second chef. Its [Overcooked 2 explanation](https://www.team17.com/news/the-a-z-of-overcooked-2) describes ingredient throwing and separated kitchens; [AYCE Assist Mode](https://www.team17.com/news/overcooked-all-you-can-eat-updated-faqs) independently changes timers, recipe load and scoring. These are distinct levers, not one global multiplier.

**[I] Boogle:** preserve the lesson that routes, access and transfers determine teamwork. A narrow rack can turn a fourth friend into an obstruction even when there is plenty of material. Prefer several approaches and an optional short handoff with an ordinary walking route. Do not copy timed quotas or require one person to manage two avatars. Use separate party-size checks after movement, carrying or interaction-speed changes; a solo feel improvement can erase a group's remaining useful work.

### Satisfactory: automation determines throughput more than online headcount

**[V]** Coffee Stain's [description](https://store.steampowered.com/app/526870/Satisfactory/) presents solo/co-op construction, expeditions for new materials, and belts, trucks and trains that reduce manual labour. **[S]** Its developers discuss common rather than individual progression in a [January 2023 recording](https://www.youtube.com/watch?v=lCWS8kV4xDU), checked through the [unofficial transcript](https://archive.satisfactory.video/transcriptions/yt-lCWS8kV4xDU/); the video fetch was throttled. Treat that as historical supporting evidence, not a freshly inspected implementation. These sources do not establish automatic player-count scaling of recipes or vehicle capacity.

**[I] Boogle:** four gatherers do not make one freight service run four times faster. Once carrying is short, the bottleneck may move to supply, a rack or the machine. Make upgrades relieve the bottleneck the group actually encounters, with a visible before/after. Distinct local tasks can feed one shared outcome without class assignment. Do not transfer an open-ended factory's endless demand, player routing workload or total removal of Boogle's final hand carry into an eight-hour railway.

### Minecraft: fixed recipes, expandable work and an asynchronous place

**[V]** Mojang's [crafting guide](https://www.minecraft.net/en-us/article/how-craft) describes explicit input/output recipes: one wood block makes four planks; four planks make a crafting table. Its [Realms description](https://www.minecraft.net/en-us/realms) lets invited friends use the persistent world when its owner is absent. These document material transformation and asynchronous access, not a multiplayer inflation rule or guaranteed equal progress. No current loot/mob scaling formula was audited.

**[I] Boogle:** a useful shared place can contain several self-chosen tasks, and a late friend benefits from what is already built. However, Minecraft's unlimited building ambitions cannot be assumed for a finite authored campaign. Four Boogle players need legible nearby opportunities supplied by the area, not an instruction to invent their own fun while one player does the whole puzzle. Personal equipment recipes illustrate another hidden multiplier: fixed prices still become four bills if everyone must own one. Keep required world capabilities shared; expression can stay individual.

### PEAK: help changes the route without adding more mountain

**[V]** The [developer/publisher description](https://store.steampowered.com/app/3527290/PEAK/) offers solo or four-player climbing, helping friends up ledges, leaving ropes and climbing spikes, injury/stamina pressure and cosmetic badges. [Landfall's FAQ](https://landfall.se/faq/) confirms offline single-player. These sources establish assistance and solo availability; they do not establish a per-player food yield, topology multiplier or every current join-in-progress rule.

**[I] Boogle:** value the persistent foothold or shortcut a friend makes, not only their throughput. A completed route remains useful after its maker leaves. Keep forgiving recovery and universal access instead of importing stamina attrition or rescue as a mandatory social debt. Boogle's hook stays the accepted zip-line pull; the [5 November decision](../decisions.md#the-shape-of-the-game) rejects swinging. PEAK is a reference for helping, not authorization to reopen that mechanic.

### Lethal Company: splitting up works because the jobs change each other's options

**[V]** Zeekerss' [description](https://store.steampowered.com/app/1966720/Lethal_Company/) offers up to four players, scrap quotas, purchasable tools and a choice between entering together or guiding companions through radar and remote doors. Night makes returning cargo urgent. The page lists single-player, but does not prove solo is equally balanced. Current quota, scrap-yield and late-join formulas were not verified; none is used as a Boogle prescription.

**[I] Boogle:** a remote job is useful when it provides information or changes access, not merely because someone has been assigned to stay behind. A friend preparing a gate while another brings its fitting can matter. A compulsory dispatcher, fuel attendant or signal operator would make Boogle's automatic train service into a chore. Splitting may be efficient and still reduce shared memories; reunite at a useful delivery, opened route or first ride without a mandatory all-ready check. Preserve humour without debt, abandonment penalties or escalating quotas.

### Animal Crossing: personal expression survives shared progress, but authority can exclude

**[V]** Nintendo's [Party Play support](https://www.nintendo.com/en-za/Support/Purchases-Subscriptions/Games/What-Is-the-Difference-Between-the-Follower-and-Leader-Roles-Animal-Crossing-New-Horizons--1747987.html) gives the leader normal play while followers cannot access pockets or the NookPhone; their collected items go to the recycle box. This describes same-console Party Play, not all online visitors. **[S]** Nintendo's [Resident Representative article](https://en-americas-support.nintendo.com/app/answers/detail/a_id/54727/) says only the first resident can perform certain milestone tasks; search text was available, full fetch returned 406. Neither source establishes a population-dependent construction bill.

**[I] Boogle:** retain the shared place and distinct personal identity, but make the next required action available to any friend. No founder, first depositor or host should own campaign permission. Do not treat a fourth player as a follower with reduced controls. Separate a communal unlock from an individual reveal or cosmetic claim so helping first does not consume another person's opportunity. Real-day waits and leader-dependent progression would conflict with short, irregular Boogle sessions.

### A useful cross-check from GDC

**[V]** David Bowring's [GDC 2010 slides on Saints Row 2 co-op](https://media.gdcvault.com/gdc10/slides/Bowring_DesigningForCoopPlay.pdf), slides 6, 12, 16–17 and 39–43, distinguish untethered drop-in play, separate parallel goals that reconverge, and the complexity of guest progression. Slides were read; the talk was not watched. **[I]** Boogle can use a common destination with optional separation. It should not import the slides' mission teleports or prerequisite replay: current arrival and shared-capability decisions already answer those differently.

## Scaling policy for Boogle

All prescriptions below are **[I]**, except where explicitly anchored to an existing plan. “Automatic” means a direct result of participation or an already-funded service, not a hidden headcount bonus.

| Quantity                                           | Proposed policy for 1–4                                                                                                                     | Reason and failure case                                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Station, bridge, fitting and main-route bills      | Same authored recipe; never reprice on join/leave. Already required by production-core.                                                     | The structure has not changed. A late friend must not add debt or trigger a refund exploit.                                        |
| Yield from a specific tree, rock or material batch | Conserve the same total. More simultaneous workers increase collection rate only where supply and access allow.                             | Duplicating yield per participant creates attendance farming and conceals depletion.                                               |
| Source replenishment                               | Use the approved counted policy and material-specific tunables, independent of online count. Model reserve adequacy at four.                | Faster collection can exhaust the reachable pool. Solve proven starvation deliberately, not through unapproved respawn.            |
| Personal carry and tool power                      | Follow installed/unlocked progression, not current lobby size. Total available carrying grows naturally with active carriers.               | A full pack must not shrink on disconnect; joining must not invalidate quantities or instantly trivialize the next upgrade.        |
| Freight capacity, production and train speed       | Fixed physical capacities per installed upgrade; dispatch funded demand within those bounds. No join-triggered extra wagon or faster clock. | Visible cargo remains truthful; a freight queue exposes a useful upgrade. Keep passenger access separate from freight capacity.    |
| Passenger access and work-site space               | Author for four willing participants from the outset; preserve current two-seat direction and test standing/riding access.                  | Joining should not strand someone. More seats or passenger stock would be a distinct future design, not automatic cargo inflation. |
| Puzzle prerequisites                               | Same dependency graph, every essential state reachable solo, durable solved steps.                                                          | Fewer players may require sequential actions; never count bodies as irreplaceable keys.                                            |
| Puzzle optionality                                 | Offer concurrency and optional refinements at every party size, without spawning mandatory extra switches for a group.                      | Changing the puzzle when someone connects is confusing and can break a solution already underway.                                  |
| Shared capabilities                                | Available to all present/future visitors in that room when unlocked. No per-person mandatory material fee.                                  | The world should not be ready while one friend's progression is locked behind replay.                                              |
| Cosmetics and reveals                              | Personal eligible claims; participation must not divide a common prize pool. Preserve provenance and claim-once rules.                      | Four friends should not fight over the last log, but a snapshot must not award historical work repeatedly.                         |
| Required duration                                  | Allow crews to finish labour sooner. Keep approximately eight hours as a content hypothesis, not an equality constraint.                    | Padding bills, departures or machine animations erases help and makes solo worse.                                                  |

Do not stack automatic bill scaling and yield scaling. Multiplying a bill by `n` while keeping yield fixed roughly cancels the labour advantage of `n` workers. Also multiplying yield per action by `n` restores a speed advantage while changing both the invoice and each source's output for no visible reason. Scaling yield alone can make throughput grow faster than headcount and erase the manual limitation an upgrade is intended to relieve. Start with neither. A bigger later structure may have a bigger visible bill because of its authored design; it must still pass solo pacing.

## Splitting up, coming together and puzzles

**One shared objective need not mean one interaction point.** A big material area can expose a source approach, a return route, a fitting socket and a small optional traversal nearby. These are opportunities, not four mandatory jobs. The first completed route or working machine gives everyone a reason to converge. Do not open multiple commissioned railway projects merely to create work; keep the production plan's bounded funded work and the progression brief's single railway.

| Party | Desired experience                                                                                                                              | Failure to look for                                                                               |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1     | A complete sequence: gather, carry, set a mechanism, cross, use the result. Short returns; useful machine work can continue during exploration. | Repeating a long empty trip, waiting at a held switch, or needing another body.                   |
| 2     | Two jobs overlap naturally; either person can change roles. One shared payoff follows.                                                          | One expert directs and solves while the other becomes a permanent porter.                         |
| 3     | An uneven split is valid: two on construction and one exploring or preparing access.                                                            | A puzzle designed as two pairs excludes the odd player; everyone competes for the same last item. |
| 4     | Several usable approaches and tasks across a short area; voluntary reunion at the result.                                                       | Three spectators at a lever, a congested rack, or two pairs becoming unrelated expeditions.       |

### A main-line chamber that survives changing attendance

**Proposed example, not a selected destination:** a lever routes a movable platform between two landings. A player reaches the far landing, installs a brace and permanently opens the return path. Controls remain accessible from both safe sides, the platform can be recalled, and setting it does not require holding a button. Solo performs the sequence. Two players can overlap platform operation and travel. A third can bring a required fitting; a fourth can explore a nearby optional route or help with the next reachable source. Everyone can use every tool.

There must also be a valid four-player path when nobody wants the optional route. Test several people traversing, watching and discussing the same chamber; do not call every moment of spectating a defect. If one person's answer repeatedly leaves three willing players with no agency, shorten the serial solve or author independent manipulable parts. More switches with the same solution are not more agency.

**Puzzle review rules:** a disconnect releases temporary interaction safely without resetting solved facts; no essential object is trapped behind its own gate; a newcomer can reach the group with current world capabilities; no mandatory pressure plate requires a second person to remain behind. For an essential ability, include a short safe practice use that any newcomer can try after the room unlock. An optional co-op cosmetic challenge may require friends, consistent with owner direction, but must never be on the material/ability path.

This uses It Takes Two's complementary consequences, PEAK's reusable help and Overcooked's spatial jobs as hypotheses. It does not imply those games promise Boogle's drop-in or solo guarantees.

## Late joiners, absence and rewards

Follow [production-core's personal reward contract](../plans/production-core.md#personal-rewards-and-accepted-play) and the [progression brief's completion criteria](../brainstorms/progression.md#done-means). Shared access, understanding and personal recognition are three separate things.

| Arrival/departure                                   | Required experience / proposed test                                                                                                                              |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Join during a partially supplied bill               | Bill stays fixed. See delivered stock and a useful remaining action; do not send four people for the same already-covered need.                                  |
| Join during machine work                            | See current physical phase, reach a safe viewing/boarding position, or choose next reachable preparation. Do not replay every earlier deposit or force a camera. |
| First visit after an ability unlock                 | Gain room access immediately. Offer a visible example and safe practice opportunity near the route, not a personal replay prerequisite.                          |
| Return after a major area was completed             | Notice the new train/fitting/route and learn its use. Personal eligible rewards remain claimable; no fabricated contribution credit or automatic history dump.   |
| Friend leaves carrying raw resources                | Their owned balance persists under the approved plan. Verify the remaining player still has enough reachable/recoverable supply; do not confiscate it.           |
| Friend leaves with a communal beam or project claim | Use the plan's recovery rule; the remaining player can obtain the necessary object and finish alone.                                                             |
| All leave during funded work                        | Finish that work only. Returning players see its result and a new opportunity; no invisible campaign auto-completion.                                            |

A present enthusiast may progress while friends are away. Guaranteed solo freedom, unlimited progress and every absent friend seeing every first reveal cannot all be promised. Preserve the actual build, provide later use/reveal opportunities and let groups voluntarily agree to save a major discovery. Do not add attendance gates, contributor thresholds or an unrequested “wait for friends” lock.

Four players should each retain their eligible cosmetic opportunity rather than receive one quarter of a reward. That is four personal claims, **not four times the construction material**. Production-core approves a recoverable T1 reward for later visitors; extending that policy to later campaign boxes is a recommendation, not a claim that the full reward catalogue exists. Tools and abilities required for current travel should not be random or attendance-exclusive.

## What the paper simulation establishes today

**[V]** [dev/economy/model.ts](../../dev/economy/model.ts) accepts 1–4 active players. It schedules balanced partial loads for identical carriers, chooses the shortest estimated elapsed work, applies an optional interference multiplier, then advances serial construction and authored beats. Supply is whole-kit production followed by batches; it does not stream arrivals into ongoing work. `round4Cart` is explicitly a conservative cold-start comparison. Current universal finite trees, abilities and actual human exploration are not represented accurately by these historical fixtures.

The following were recomputed with Node `v26.13.0` on this checkout. Values are **model minutes, not playtest times**. `coordination=0.25` is a sensitivity assumption per additional active carrier, not measured social overhead.

| Fixture / option                  |      1 |      2 |      3 |      4 |
| --------------------------------- | -----: | -----: | -----: | -----: |
| Historical `round4`, default      |  24.50 |  17.50 |  14.58 |  14.39 |
| `round4`, coordination 0.25       |  24.50 |  19.98 |  17.33 |  17.49 |
| Historical `round4-cart`, default |  24.27 |  18.88 |  17.04 |  16.86 |
| Historical `eras`, default        | 484.40 | 481.08 | 480.92 | 480.81 |
| `eras`, content 0                 |  99.97 |  96.65 |  96.49 |  96.38 |

Three implications matter:

- **The fourth worker is not automatically useful.** At historical T1, three workers take 10.583 seconds of work, four take 10.023: about 0.56 seconds saved. Total person-work increases from 31.749 to 40.091 seconds because four partial loads require more travel/handling. An elapsed-time optimizer can assign busywork. This fixture starts with eight-unit backs; do not combine its results with the older research's twelve-unit example.
- **A freight improvement can change the bottleneck.** In this deliberately cold cart fixture, solo improves slightly while groups wait relatively more. This does not disprove the current cart; it demands tests of warm stock, overlap and per-player useful work instead of treating sequential arithmetic as a live verdict.
- **An eight-hour total can be circular evidence.** Removing authored content subtracts roughly 384.43 minutes from the era fixture. Nearly identical 1–4 totals mostly reflect assigned content time, not validated party-size balance. Those blocks need actual named activity with a parallelism policy; the era ladder itself is superseded.

Reproduction, with the repository's Node 26 selected:

```sh
node dev/economy/model.ts round4 --json
node dev/economy/model.ts round4 --coordination=0.25 --json
node dev/economy/model.ts round4-cart --json
node dev/economy/model.ts eras --json
node dev/economy/model.ts eras --content=0 --json
```

The report's compact results were obtained by importing `model`, `round4`, `round4Cart` and `eras` and selecting these same options. No model code or data was changed.

## What `dev/economy` should test next

Extend the stock/purchase/concurrent-delivery work already proposed by [upgrade-economy](upgrade-economy.md#what-deveconomymodelts-needs-to-simulate). Keep this as offline design arithmetic, with historical fixtures retained; no new runtime system is prescribed here.

### Inputs and outputs missing from a headcount multiplier

| Existing owner                   | Proposed addition                                                                                                          | Question it answers                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `model(table, players, options)` | Attendance timeline plus each agent's chosen task, movement/handling rate and available abilities                          | Is four connected people actually four workers? What survives 4→1?                            |
| `Station` and load scheduling    | Task dependencies, physical access slots, queue duration, optional jobs and an explicit sequential alternative             | Do helpers accelerate work or merely compete for the same socket?                             |
| `Beat` / `newThing`              | Named activity; serial/co-present/parallel classification; first useful use per participant                                | Was an eight-minute block played by everyone, overlapped, or merely assigned?                 |
| `Ingredient` / `Station.supply`  | Per-good conserved stocks, finite sources, processing, rack/vehicle capacities and overlapping shipments                   | Is material actually reachable at the time it is needed?                                      |
| `Link` upgrades                  | Before/after capability, changed trips/interactions, remaining uses and material spent                                     | Does the bigger pack or crane help at each party size, or arrive after its value disappeared? |
| `finds`                          | Separate eligible personal claims, reveals and shared access; zero material contribution from cosmetic copies              | Does a late arrival retain opportunity without duplicating goods or historical awards?        |
| Returned activity totals         | Per-player timeline, active person-minutes, unavoidable queue/wait, optional leisure, travel-to-friends and join-to-action | Did better room time hide one idle or overworked friend?                                      |

Count room elapsed time, each player's engaged time and total person-work separately. Never interpret high utilization as fun: chosen sightseeing is different from forced waiting. Preserve an explicit voluntary-leisure input and ask people which it was in the eventual playtest. Do not calculate a universal “co-op score.”

### Required comparison matrix

Run the **same authored area and bills** for all four sizes, then vary one factor at a time. Cover an opening before freight, a middle area with one material feeding two fittings, and a late area with upgraded travel. Test route alternatives from the progression brief without assuming any is selected.

| Case                             | 1 player                                                 | 2 players                                     | 3 players                  | 4 players                                                |
| -------------------------------- | -------------------------------------------------------- | --------------------------------------------- | -------------------------- | -------------------------------------------------------- |
| All build together               | Baseline trips, solo puzzle reachability                 | Shared access and useful overlap              | Odd-player agency          | Queue, collision/access proxy, excess trips              |
| Split construction / exploration | Sequential fallback and machine overlap                  | 1+1                                           | 2+1 and 1+2                | 2+2 and 3+1                                              |
| Mixed experience                 | Novice and experienced runs separately                   | Experienced builder + newcomer; reverse roles | One expert, two novices    | One expert, three novices; then reverse                  |
| Partial participation            | Voluntary sightseeing intervals                          | One active worker                             | One and two active workers | One, two and three active workers                        |
| Changing attendance              | 1→2→1                                                    | 2→1 mid-haul/mid-puzzle                       | 3→1; late third arrival    | 4→1; 1→4; 4→0→1                                          |
| Supply and upgrades              | All optional upgrades skipped; solo next-kit feasibility | Opposing purchase orders                      | Two simultaneous consumers | All optional-first, full racks, exhausted nearby sources |

Start with equal speeds, then one agent at 0.6× and one at 1.3× baseline as **sensitivity inputs**, not population estimates. Keep available abilities equal to the world's unlocks; “novice” changes execution/understanding, not entitlement. Sweep finite work-site access 1/2/4, near/far supply, cold/warm freight, no-overlap/overlap, and the existing coordination values 0/0.25. Physical crowding and human communication still require real play.

**Purchasing and accounting cases:** next-required-first, convenience-first, all-optional-first and no-optional; leave with a full personal pack; drop communal cargo; join immediately before and after the last deposit; reconnect after an eligible reward; finish funded work in an empty room; return after an ability was earned. Compare no-upgrade and upgraded runs for every party size. A tool can lose hauling value at four yet still make each strike more pleasant; arithmetic must flag the diminishing return without claiming to judge feel.

### Assertions and review thresholds

**Hard design failures:** an essential task needs more than one body; no reachable conserved supply can pay the next essential recipe; a disconnect traps the only required item; a bill/yield/capacity changes because headcount changes; a late visitor lacks required room capability; cosmetics create material; optional spending creates an unrecoverable main-route dead end. Follow production-core's actual account and recovery rules, including retained personal cargo.

**Provisional review flags, not approved tuning:** a willing player has over 30 seconds of unavoidable inactivity in a work beat; more than two mandatory identical solo supply trips before any changed consequence; a four-player run adds over 20% person-work while saving under 10% elapsed work; a joiner takes over two minutes to reach a useful action; an acquired capability has no meaningful use within the next ten active minutes. Report traces and reasons, not just red/green totals. The T1 calculation above triggers the person-work flag. Calibrate these flags from real play before making them acceptance requirements.

For the campaign, compare approximately eight active room-hours with per-area closure and actual authored activity. Use a two-player novice route as the **proposed reference**, retaining separate solo and four-player envelopes rather than promising exact equal duration. Do not reject a shorter four-player run merely for being shorter. Reject missing discoveries, unrewarding upgrades and repeated forced waiting. If the content is too short, report the gap; do not fill it with larger bills, cosmetic counts or longer train waits.

## Numbered recommendations for Boogle

1. **Keep bills, per-source yield and installed capacities independent of attendance.** Preserve [production-core's fixed transaction contract](../plans/production-core.md#transaction-contract-every-unit-has-one-home); test join/leave against `recipes`, `Link.carry` and `Station.supply` in [model.ts](../../dev/economy/model.ts). More friends supply more actions, never a larger invoice or duplicate tree yield.

2. **Give four willing players usable space and several short-lived jobs around one outcome.** Apply the [shared-construction access proposal](shared-construction.md#2-let-visible-work-and-access-divide-the-jobs) to the [progression brief](../brainstorms/progression.md#shape). Measure queue time and total person-work before adding a relay, class, dispatcher or another commissioned railway project.

3. **Make main-line puzzles sequentially solvable and permanently useful.** Extend [progression's solved-place rule](../brainstorms/progression.md#best-suggestions) with departure-safe latches, recalls and universal tool access. Test 1, 3 and 4 explicitly; a great two-person puzzle is not evidence for the other sizes.

4. **Let material upgrades relieve the bottleneck each crew actually meets.** Use [upgrade-economy's classified fittings](upgrade-economy.md) and the [progression brief's multi-use materials](../brainstorms/progression.md#best-suggestions). Compare carrying, handling, source supply and freight independently. Keep train cargo upgrades physical and passenger access distinct; never resize a wagon when a friend joins.

5. **Share required capabilities while preserving personal learning and reward opportunities.** Build on [production-core's personal rewards](../plans/production-core.md#personal-rewards-and-accepted-play) and its shared-unlock promotion slice. A late friend gets current access plus an optional practice/reveal; no founder privilege, per-player mandatory power fee, last-hit prize or replay debt.

6. **Allow faster crews; validate eight hours through named activity and per-player experience.** Replace the historical era/content placeholders through the [progression simulation proposal](../brainstorms/progression.md#shape) and `Beat`/`newThing` in [model.ts](../../dev/economy/model.ts). Preserve useful reunions without forced attendance, padded invoices or silent progress while everyone is away.

7. **Extend the existing offline model with attendance, task dependencies, stocks and per-player timelines.** Use the matrix above alongside [upgrade-economy's model extension](upgrade-economy.md#what-deveconomymodelts-needs-to-simulate). Report conservation, feasibility, elapsed time, person-work, forced wait, upgrade payoff and catch-up separately; include 4→1 and a nonworking spectator before claiming scaling.

8. **Prototype one shared station first, then one solo-safe chamber with a two-use material.** Reuse [shared-construction's baseline](shared-construction.md#1-establish-the-unchanged-shared-station-baseline) with the current accepted tuning after the relevant [production-core proofs](../plans/production-core.md#reviewable-promotion-slices). The chamber follows the [progression brief's smallest build](../brainstorms/progression.md#shape), after the first evidence and applicable owner gate. Stop at the owner's verdict before authoring more areas.

## First proof and stopping point

**Disposition: research now; bounded experiment proposed, no build started.** Production-core's durable shared path is a prerequisite for trustworthy departure/resource evidence. Its existing plan owns technical proofs; this report does not re-audit high-risk runtime folders or assert that the full path has landed. The [owner's current playtest rules and scoped exceptions](../agents/owner-calls.md#owners-standing-calls) still control when experiments may begin.

First, run the proposed paper matrix on one fixed station and one gate dependency. Then play the same station with 1, 2, 3 and 4 actual people, keeping bill, yield, speed and rewards constant. Compare the existing layout with a variant differing only in approach/access space. Observe the whole arrival→contribution→ride sequence; include a helper arriving halfway and leaving before the finish. Use current accepted capacities, not this report's historical fixtures. No new co-carry mechanic or reward is needed for that comparison.

**What's new:** “There is room for everyone to help build the same railway.” **Gut question:** “Did another friend make the job better, and could you find something you wanted to do?” Agents inspect conservation, queues, boarding and departure cases separately; the owner gets the short play question, not a survey. Stop if solo loses its pleasant loop or the fourth person repeatedly waits for permission. Improve the work's access or shape before changing its quantity.

If that earns a yes, the next proof is the proposed chamber plus one material demonstrated in two useful fittings. Validate it solo after a partner leaves, then with a late newcomer and four people. Only then decide whether more small stops, a different freight upgrade or genuinely complementary mechanics are needed across the campaign.

## Verification and limits

Primary developer/publisher material was read or indexed for all nine games, with firsthand Overcooked design testimony and the GDC slides supplying design rationale. Satisfactory's shared-progression statement remains an unofficial transcript of developer speech; Nintendo's representative rule and EA's trailer description were indexed only. Exact Valheim/DRG combat coefficients, PEAK/Lethal Company loot and live-joining rules, and commercial-game party-size completion curves were not established. No source supplies Boogle's provisional thresholds.

Repository work used the map, research index/map, named reports, current decision routing, progression brief, production plan, playtest tracker, as-built chapter and focused offline-model reads. There are no nested `AGENTS.md` files under `docs/` or `dev/`; no high-risk runtime folder was edited or reviewed. Other inflight branches also touch the research index; only this report's entry is added. Historical model results were recomputed; the proposed expanded simulation, physical crowding, human enjoyment and eight-hour campaign remain unverified. No code changed. Not tested on a device.

Serves DESIGN's **Toys before chores**, **Cooperation is automatic, not negotiated**, **Communal world, personal rewards**, **Designed for drop-in, drop-out** and **Show, don't tell**.
