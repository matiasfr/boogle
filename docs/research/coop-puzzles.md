# Environmental and co-op puzzles between stations

_Research report, 5 November 2026. Live web research across nine requested games, checked against repository documents at `68ee082d`. Covers solo-compatible cooperation, linked gates, carrying, ability keys, wordless teaching, recovery and an eight-hour difficulty curve. Research and proposals only: no code, new gameplay, device test or human playtest. The report does not approve its candidate places or prototype._

## Answer first

**Make puzzles change the railway's possibilities permanently.** A friend opens a shutter while you move a beam; you discover how to park it and operate the shutter alone; the delivered beam finally braces the passage open. The interesting friction is choosing a route, staging a load and seeing someone else's useful action. The result removes that friction for future deliveries.

Start with **one linked-gate freight yard**, using two opposed gates, a safe parking bay, a pedestrian service path and a final latch. Compare it with a simple single-gate version before building the Glasshouse or a general puzzle system. Keep ordinary carrying reliable, and let extra players help without becoming required keys.

This serves [DESIGN.md](../../DESIGN.md): **Toys before chores**, **Cooperation is automatic, not negotiated**, **Designed for drop-in, drop-out**, **Slapstick over precision**, **Telegraph everything** and **Show, don't tell**. “Automatic cooperation” permits a visible helpful action; it argues against requiring voice negotiation, assigned classes or simultaneous attendance to finish the railway.

## Authority, baseline and what this adds

The [research map](research-map.md) was checked first. Its reuse guidance is useful, but its 2 November six-era framing is historical: [the current decision index and dated calls](../decisions.md#the-shape-of-the-game) replace eras with materials and upgrades. The [progression brainstorm](../brainstorms/progression.md) records the owner's big-material-area/small-puzzle-stop direction. Its three-area route, exact ability placement, upgrade vocabulary and first fibre proof remain **proposed**, with unanswered questions. This report uses Glasshouse → Split Shell → Exhibition as a comparison scaffold, not an accepted itinerary.

Relevant evidence and boundaries:

- [Round-4 notes](../plans/round-4-notes.md#no-job-yet) explicitly request one switch moving two gates and “fun friction”; the [3 November playtest](../playtests.md#2026-11-03-round-4-two-players-the-default-url) also records uncertainty about beam assistance and too little spacing between abilities. These are concrete reasons to research this facet.
- [Place's ancient technology](../game-design/place.md#ancient-technology-round-4-exploring) documents jump, hook and glider; shared ability/gate flags; a quarry lever and tower switch; and gates that block the track layer even when a person can walk around them. These establish reusable player concepts, not an existing linked-gate puzzle engine.
- [Beam weight](../plans/beam-weight.md) documents solo carry, optional assistance, release/departure behavior and a repaired reconnect duplication. Its evidence is branch-scoped and its human verdict remains open. Do not restart that experiment or describe its measured speed bonus as proven fun.
- The 5 November [owner decision](../decisions.md#the-shape-of-the-game) keeps the hook as a pull to its target and rejects swinging. No rope-swing dependency belongs in these puzzles. Double-jump relocation remains a progression question; bombs and a breach/sledge verb are not assumed available.
- [Production core](../plans/production-core.md) owns durable railway migration. [Progression's disposition](../brainstorms/progression.md#parked) places its first build after production core and replay. Early-work exceptions do not turn this research into permission to implement the campaign.

| Existing report | Retain | Increment here |
| --- | --- | --- |
| [Shared construction](shared-construction.md) | Fluid jobs, shared benefit, fixed work and late-join fairness | Spatial puzzles with complementary actions rather than another shared invoice |
| [Carrying and logistics](carrying-and-logistics-play.md) | Readable loads, action/trip counts, solo-safe assistance | Safe parking, route changes and awkward-object staging; not restored bundle sway |
| [Wordless onboarding](wordless-onboarding.md) | Show cause and effect, teach one relation at a time | A consistent switch/gate language and a silent partner test; not its old lobby or spawn proposals |
| [Eight-hour pacing](eight-hour-pacing.md) | Separate discovery, work, travel and waiting; budget authored content | Puzzle difficulty and minutes inside the new material structure; not six eras or twelve mandatory links |
| [Next destinations](next-destinations.md), [upgrade economy](upgrade-economy.md) | Local demonstration, export, several useful fittings, shared access | Which obstacles precede that demonstration and why solving them should stay enjoyable |

The two report-format references were shared construction and wordless onboarding. Repository claims above come from the owning documents, not a fresh runtime audit. No high-risk source folder is edited or reviewed; there is no nested `AGENTS.md` under `docs/` in this checkout.

## Evidence and limits

**[V]** means the relevant primary text was fetched: developer interviews, publisher descriptions or developer-authored commentary. **[I]** means indexed primary text only, with a failed page fetch. **[A]** means a GDC session abstract, not a watched talk. **[T]** means developer testimony available through a third-party transcript. Every Boogle design below is a **hypothesis**, including numbers and acceptance targets. Store pages establish mechanics, not enjoyment or retention. No shipped game was newly played for this report.

## What the reference games contribute

### It Takes Two: complementary tools, expensive novelty

**[V]** Josef Fares describes designing distinct player mechanics that combine, tying those mechanics to the story, and maintaining coherence while the activities change. He also explains the production consequence: encounters built for sap and matches cannot simply be reused for the hammer. [Fares interview, TheSixthAxis, 2021](https://www.thesixthaxis.com/2021/03/02/interview-josef-fares-on-it-takes-two-relationship-advice-co-operation-favourite-swear-words/).

**Boogle inference:** borrow two useful actions meeting in one result, such as positioning cargo and changing its route. Avoid permanent player-exclusive powers: Boogle must survive departures. Borrow thematic variety through the places and arrangements of familiar verbs, rather than Hazelight's volume of bespoke mechanics. One friend can still deduce both roles; asymmetric tools alone do not guarantee shared discovery.

### Portal 2 co-op: coordination needs a language and cheap retries

**[T]** Valve's commentary says the ping tool addressed the ambiguity of pointing verbally in 3D; contextual icons helped without voice. Its “Trust Puzzles” commentary reports both bonding and stress from intertwined roles. Lengthy death animations discouraged experimentation. Airlocks clarified where one puzzle ended; a flatter progression made it harder to guarantee prerequisite understanding. These are named developer statements transcribed by a community site, not audio independently checked here. [Valve commentary: Ping Tool, Ping Context, Trust Puzzles, Dying All The Time, Airlocks and Return To The Hub](https://theportalwiki.com/wiki/Portal_2_developer_commentary).

**Boogle inference:** make the target and consequence pointable, keep a room's causal boundary clear, and make an incorrect attempt cheap. Replace lethal trust with harmless delays and visible recovery. Do not import a two-player airlock or precision countdown into a drop-in railway.

**[I] Research caution:** Vaddi et al.'s *Validating Test Chambers to Study Cooperative Communication Mechanics in Portal 2* describes a planned study and chamber-difficulty evaluation. Its indexed text distinguishes voice and in-game communication conditions; the PDF fetch failed because of size. It supplies a useful test comparison, **not proof that pings eliminate domination**. [Author-hosted paper](https://rinawehbe.ca/wp-content/uploads/p721-vaddi.pdf).

### Unravel Two: preserve the same problem when alone

**[V]** Martin Sahlin says the game was conceived for two characters even when played alone. Players of the first, single-player game had already shared suggestions and traded the controller; that behavior helped motivate the sequel. [Sahlin interview, 2018](https://www.ps4blog.net/2018/06/ps4blog-net-interview-martin-sahlin-on-unravel-two/).

**Boogle inference:** design the solo procedure first, then let a friend perform part concurrently. A parked load and latched mechanism substitute for a second body without changing the rule when headcount changes. Do not require Boogle players to control a second avatar, and do not assume that controlling one of two characters prevents a more experienced friend from doing the thinking.

### Pikmin: a route and its work can be decomposed

**[V]** Nintendo's *Pikmin 3 Deluxe* description explicitly supports dividing tasks with a second player, selecting Pikmin by their abilities, and switching among captains when alone. [Nintendo's game description](https://www.nintendo.com/us/store/products/pikmin-3-deluxe-switch/). This is the relevant co-op comparison; *Pikmin 4* Story's helper-pointer mode is a different relationship, not equivalent second-captain control. [Nintendo's Pikmin 4 multiplayer description](https://pikmin4.nintendo.com/).

**[V]** The *Pikmin 4* developers describe Dandori as planning for efficient work and explain that rewind reduces the cost of a late mistake from replaying an entire morning to retrying a recent stretch. [Ask the Developer, chapter 2](https://www.nintendo.com/au/news-and-articles/ask-the-developer-vol-10-pikmin-4-chapter-2/).

**Boogle inference:** separate surveying, opening, transporting and using the route. Friends parallelize those jobs; one person sequences them. Carrying should expose the route's shape. Borrow short recovery, not mortality, a day timer, workforce quotas or a second worker-management economy.

### Zelda dungeons: visible affordances and useful keys

**[I]** In Nintendo's *Twilight Princess* interview, dungeon lead Koji Kitagawa uses a switch that appears to respond to weight as an example of meeting player expectations. The primary interview was indexed but returned an error when opened. [Iwata Asks: Twilight Princess, page 1](https://iwataasks.nintendo.com/interviews/wii/twilight_princess/0/0/).

**[I]** The *A Link Between Worlds* interview explicitly discusses players getting stuck behind a dungeon and rental items letting them attempt another. Search returned the interview text; the regional page redirected and the interview host failed. [Iwata Asks: Rethinking the Unquestioned](https://www.nintendo.com/en-za/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-A-Link-Between-Worlds/The-Legend-of-Zelda-A-Link-Between-Worlds/6-Rethinking-the-Unquestioned-/6-Rethinking-the-Unquestioned-832156.html).

**Boogle inference:** an ability should change an understandable physical possibility: the hook reaches a real anchor beyond the gap. Teach it beside a safe application, then reopen something remembered. Keep obscure deductions on optional branches; a required ability must not depend on a cosmetic mini-game, consumable rental or absent player's inventory.

### Tunic: knowledge can reopen an old place

**[A]** Andrew Shouldice's GDC 2023 abstract frames secrets as unresolved threads, including things hidden just beneath the surface. Only the abstract was inspected. [TUNIC: This Was Here the Whole Time](https://gdcvault.com/play/1029384/-TUNIC-This-Was-Here).

**[V]** In an interview with Shouldice and Kevin Regamey, Regamey describes becoming stuck on a critical path he had failed to notice, prompting a lighting adjustment. Their discussion distinguishes satisfying obscurity from accidental navigation failure. [Developer interview, MobileSyrup, 2022](https://mobilesyrup.com/2022/05/27/tunic-canadian-developers-andrew-shouldice-kevin-regamey-interview/).

**Boogle inference:** show an odd reachable-looking balcony before the player understands the hook route. Later understanding supplies a return invitation. A veteran's explanation can permanently spoil a knowledge puzzle, so do not make the main connection depend on every friend independently discovering the same secret. Optional secrets can remain personally surprising; shared transport cannot.

### The Witness: reserve visual emphasis for meaning

**[V]** Jonathan Blow describes conserving attention through art and rejecting machines with ambiguous mixtures of interactive and decorative controls. He also says he cut many puzzles because they were not good, rather than simply because they were difficult. [Blow interview, PlayStation Blog, 2015](https://blog.playstation.com/archive/2015/09/21/the-witness-creator-jonathan-blow-on-creating-one-of-2016s-most-intriguing-games/). **[A]** Luis Antonio's GDC abstract describes making visual language an extension of gameplay. [The Art of The Witness, 2014](https://www.gdcvault.com/play/1020552/The-Art-of-The).

**Boogle inference:** teach a tiny language of handles, moving links, stops and open passages. Introduce one relation, let players test it, then combine it with an old relation. Do not confuse “wordless” with “unexplained,” or borrow a solo puzzle island's sustained cognitive load for an eight-hour social railway.

### Captain Toad: small spaces, layered difficulty

**[V]** Director Shinya Hiratake and producer Koichi Hayashida explain that removing jumping kept diorama levels small. Early tests showed that walking alone became dull, leading to plucking as another action. Reaching the star was designed to be easier than collecting all gems and meeting bonus goals; stages have no time limit. [Developer interview, Nintendo Life, 2014](https://www.nintendolife.com/news/2014/12/interview_captain_toad_treasure_trackers_developers_talk_over_origins_and_the_contents_of_toads_backpack).

**Boogle inference:** make a small stop inspectable from several sides, with a clear main solution and an optional harder route. Boogle already jumps and glides, so an open diorama cannot rely on Toad's movement restrictions. Test the full unlocked movement kit; protect a freight route through physical cargo constraints, not arbitrary invisible walls.

### Lovers in a Dangerous Spacetime: let roles be chosen

**[V]** Adam Winkels reports that designing the AI pet's solo commands helped clarify human co-op tasks. Player-specific, color-coded power-ups proved confusing; the team let players gravitate to preferred roles instead. [Winkels interview, Game Developer, 2015](https://www.gamedeveloper.com/design/co-op-communication-in-i-lovers-in-a-dangerous-spacetime-i-).

**Boogle inference:** build recognizable places to help, with brief actions and permission to change jobs. A player who likes carrying should not be forced onto a lever for equal participation. Borrow station legibility and free role selection, not combat pressure, compulsory shouting or AI crew infrastructure.

## A puzzle vocabulary made from Boogle's verbs

These are **proposed arrangements**, not eight new player buttons. Baseline verbs are walking/jumping, interacting, carrying/dropping/depositing, chopping, hooking, gliding and building the line, as documented in [Place](../game-design/place.md). Carry assistance has the separate evidence boundary above. Gate relationships, parking sockets and new environmental machinery still need design and implementation.

| Form | Solo procedure | What a friend adds | Teaching and permanent result |
| --- | --- | --- | --- |
| **Reach and release** | Jump or hook to a visible handle; release the nearby barrier | Scout the route or move cargo through the opening | First switch and barrier share a sightline; opened passage stays open |
| **Park and switch** | Carry into a bay; put down; walk to a lever; change the freight route; collect | Operate the lever while the carrier stages the load | Two gates move oppositely along visible links; final brace latches both |
| **Complete two branches** | Reach two independently accessible catches in either order | Split up and see the other catch move across the space | Two physical bolts retract independently; each completed branch remains done |
| **Carry and clear** | Move the awkward object in stages; set it on broad rests to operate machinery | Help carry or clear the next obstruction | The object fits the path visibly; delivery installs it as a useful machine part |
| **Reach above, open below** | Hook upward, operate a hoist/route control, return via a shortcut | Bring freight underneath while the explorer works above | The vertical trip changes the ground route; nobody has to keep holding a control |
| **Launch and return** | Glide from a broad launch to a landing and open the return path | Spot the landing or begin supplying the revealed construction site | Misses return to a nearby safe approach; no moving-ring precision test |
| **Use the built route** | Carry a fitting over a just-completed span to release the next work area | Deliver fitting and local material concurrently | Construction is part of the solution; later trains use the cleared route normally |
| **Recognize and revisit** | Notice an old anchor/ledge now usable with a shared ability | Explore another clue or help point out a route | Optional shortcut/view/cosmetic; no compulsory cryptic secret |

An object placed in a **load-bearing socket** can supply a persistent condition; this is a candidate environmental interaction, not permission to make ordinary dropped resources arbitrary pressure-plate keys. If introduced, teach it with a visibly fitted cradle and an object that cannot be consumed elsewhere. Never require the beach ball, frisbee, an optional mushroom toy or a mini-game win to progress.

Keep only a few main-route ability checks. Separate **capability** (everyone in the room receives the unlock) from **practice** (each visitor can try a short safe route). Use remembered optional landmarks for further practice. A player arriving after the discovery needs access immediately, with a physical example nearby; neither a duplicate ability bill nor a replay of the group's completed gate is appropriate.

## Keep everyone involved without policing friendships

There are three different problems: one person understands first, one person performs every useful action, and one person orders everyone else around. A universal solo solution means the first two cannot be absolutely prevented. An informed friend can always explain a solution. The design target is **available agency**, not enforced equal work.

- **Give each branch a small choice.** A helper chooses the next safe rest or which latch to reach, rather than holding an input while someone else plays. Keep roles interchangeable and actions short.
- **Make contribution visible in space.** A catch moving, a load resting or a path opening tells a partner what changed. Each person can respond without a leader assigning jobs.
- **Let routes separate briefly and reconverge.** Two visible side approaches can be solved sequentially alone or concurrently together. Do not conceal essential information on private screens: that increases reliance on speech and makes departures dangerous.
- **Reserve optional difficulty for the eager solver.** A more intricate balcony route can keep a veteran interested while a newer friend tries the main handle. It must not secretly contain the only key.
- **Do not force participation by adding bodies.** No four-player plate, extra invoice, character-specific lever or attendance-scaled timer. With 3–6 friends, let people help, explore or watch; there need not be six mandatory jobs in a small chamber.

The existing [shared-construction report](shared-construction.md) owns contribution fairness. Here, observe whether a novice voluntarily tries an idea, whether a veteran can help without taking over, and how long anyone is captive to another player's action. Equal button counts or faster completion would not establish success.

## Readable without speech or explanatory panels

Use the existing action prompt and ability glyphs for **how to press**; explain **why it works** in geometry and motion. Wordless play need not remove accessible labels or input instructions.

| Meaning | Proposed world cue | Failure to avoid |
| --- | --- | --- |
| This is a control | Reachable handle with a clear travel arc; consistent placement | Decorative handles identical to usable ones |
| This control affects those gates | Continuous chain, shaft or conduit; both ends visible in the teaching example | A generic flash with an unseen distant consequence |
| Open versus closed | Different physical poses and an actual traversable gap | Color alone, especially teal/brass viewed in shadow |
| This setting will persist | Pawl dropping into a notch, handle remaining in position | A timed switch that looks like a permanent latch |
| Cargo should rest here | Broad cradle that matches its silhouette | An invisible trigger or a pixel-sized placement target |
| One part remains | One raised bolt beside another visibly released bolt | A floating numerical completion counter |
| The railway now fits | Clear rail bed, opened cargo clearance, a machine able to advance | Making the avatar's shortcut imply the train can also fit |

Show the first causal chain from normal play framing. Later, a moving linkage or intermediate repeater can lead attention around a corner. Sound reinforces movement but is never the only clue. Keep puzzle mechanisms visually distinct from nearby optional playthings without making every surface glow.

For the first test, use visible gestures and proximity. If partners still cannot refer to the same handle, evaluate a single contextual point/highlight before a command wheel or forced voice feature. A pointer may clarify attention; it can also make bossing easier. Test with voice muted and an inexperienced partner rather than claiming wordless success from an agent who knows the solution.

## Resetting, recoverability and pleasant friction

**Proposed invariant:** from every reachable unfinished arrangement, one remaining player can continue or locally recover without losing accepted construction. Solved access never re-closes because somebody leaves. This is a level-design requirement to take into [production core](../plans/production-core.md), not a new state-ownership design.

| Situation | Required player-facing recovery |
| --- | --- |
| Lever toggled at the wrong time | Cargo and avatar stop safely or the gate reopens; no crushing, vanished load or forced restart |
| Both players choose opposite switches | Show the resulting setting clearly; one bounded motion finishes before another begins; do not create a rapid flicker contest |
| Cargo blocks a doorway | A reachable Drop/rest option and pedestrian route permit repositioning; the gate is not the only exit |
| Load falls into water or unreachable terrain | Recover the same unconsumed object to a known nearby cradle under the owning recovery rules; never create a second spendable copy |
| Helper leaves | Carry remains possible alone; a completed latch remains done |
| Carrier leaves | Survivor can retrieve the required cargo through the approved recovery path; no private-key lock |
| Everyone leaves or server restarts | Return to retained accepted work and a safe arrangement; no mandatory re-chop or re-solving completed routes |
| New friend joins after completion | Open passage and shared ability are immediately usable; optional practice does not reset the world |
| A reset is requested while a friend works | Reset only the movable puzzle setup when safe; never rewind another player's delivered stock, completed catch or railway |

Prefer reversible controls and a local cargo-return mechanism to a global Reset button. A nearby broad recovery shelf is better than a dramatic failure animation followed by a walk across the island. Initial test target: after an execution mistake, the next meaningful attempt should normally be possible within **5–10 seconds**, excluding the player's new deliberation. This is a proposed friction budget, not a result from the references.

“Fun friction” should change a decision: which route, where to rest, when to clear an obstruction, whether to help or scout. Extra walking without a decision, untelegraphed slipping, fighting the camera and repeated attempts at a correct idea are costs to remove. A brief harmless jam can be funny when the remedy is visible. The ordinary bundle keeps the owner's steady-carry behavior.

## An eight-hour difficulty curve without eight hours of gates

The following **480-minute paper allocation** fits the brainstorm's three-area candidate, rather than silently combining it with next-destinations' four-material route. It includes building, exploring, exporting and riding; it is not an estimate validated with humans. All time boundaries are planning allowances, never unlock timers.

| Journey window | Candidate place/activity | Puzzle demand | Release and variety |
| --- | --- | --- | --- |
| 0:00–1:00 | Starter railway | One visible control/result; reliable carry; safe ability practice | Build and use the route; do not stack new ability lessons back-to-back |
| 1:00–2:30 | Glasshouse / fibre | Reach above and open below; stage one awkward load | A local crane fitting makes the former job easier; export supplies another fitting |
| 2:30–3:00 | Small stops and return | One known verb in a new arrangement | Optional view/secret and a low-demand ride |
| 3:00–4:30 | Split Shell / cement | Two independently completed vertical routes; recognize their common result | Permanently connect upper and lower freight access; avoid another opposed-gate centerpiece |
| 4:30–5:00 | Small stops | Ability discovery if approved, otherwise a new use of existing abilities | Safe practice, an obvious return path and a remembered optional lead |
| 5:00–6:30 | Exhibition / steel | One substantial linked-machine sequence, combining two learned relations | The oversized engine or fitting leaves by the route the group opened |
| 6:30–7:15 | Revisits and final approach | Familiar mechanics from a new approach; player-chosen parallel jobs | Upgrades visibly shorten old work; no new major puzzle language |
| 7:15–8:00 | Connection to the original island | Short synthesis and a clear finished result | Time for riding, arrival and the existing ending direction; no final mastery exam |

Initial content envelope: **three substantial puzzle sequences at 12–18 active minutes each, plus six small stops at 3–6 minutes each: 54–90 minutes of focused puzzle play**. The linked-gate first proof is part of this envelope, not an extra required stop. Teaching, experimenting and local retry time count inside those figures. These counts are proposals, not a quota to fill. The remaining **390–426 minutes** must be justified separately by observed construction, discovery, transport and payoff; if that activity is absent, reduce the campaign target or scope rather than inflate bills and walks.

Increase difficulty through **relationships**: visible one-step effect → staging → two independent branches → two familiar relations combined → a useful reinterpretation. Increase only one major demand at a time: spatial depth, memory, dependency length or coordination. Main-route execution stays generous; precise optional challenges do not set the railway's difficulty floor. A solo departure must not increase the logical complexity of a half-solved puzzle.

To avoid repetition, give every proposed stop a one-sentence new insight. “The gate is now red” is not one. Change topology, cargo purpose, direction of approach or which familiar object is the control. Reuse mechanisms and visual rules, then retire an arrangement once it has taught its idea. After a demanding sequence, let the next stretch emphasize riding, construction or a view. Do not reopen solved gates on routine material trips.

## Numbered recommendations for Boogle

1. **Prototype one linked-gate freight yard first.** It directly answers the [round-4 gate request](../plans/round-4-notes.md#trains-and-cart) and supplies the chamber proposed by [progression](../brainstorms/progression.md#shape). Compare a single gate with the linked pair; hold route, load and reward constant. The question is whether staging makes a friend's help satisfying, not whether two switches are harder.

2. **Require a solo continuation from every partial state.** Apply the recovery table to [progression's done criteria](../brainstorms/progression.md#done-means) and future puzzle work under [production core](../plans/production-core.md). Before owner review, try departure while holding cargo, during gate motion and after one catch is complete. Reject any arrangement that needs another player's return.

3. **Make roles voluntary and locally interesting.** Extend [shared construction's fluid-job direction](shared-construction.md) in the [progression chamber](../brainstorms/progression.md#shape): a carrier chooses rests, an explorer chooses a route, a helper clears access. Test a novice/veteran pair; if one only waits for orders, redesign the task before adding exclusive tools or player-count locks.

4. **Build one physical language for controls and consequences.** Apply it to the two existing gate concepts in [Place's ancient technology](../game-design/place.md#ancient-technology-round-4-exploring) when their owning work is authorized. First prove one lever, a visible linkage and two clearly different poses in muted play. Add contextual pointing only if spatial reference remains the problem.

5. **Make abilities shared keys and knowledge optional depth.** Feed [progression's ability-placement question](../brainstorms/progression.md#open-questions) with a discovery → safe practice → remembered revisit sequence. Keep hook pulling, guarantee late-join capability and place the most cryptic deductions off the main line. Test a newcomer after the group unlock, with no repeated purchase or mandatory lesson.

6. **Use co-carrying to change routing, then let machinery remove the job.** Build on [beam weight's bounded evidence](../plans/beam-weight.md) and [progression's local-material demonstration](../brainstorms/progression.md#best-suggestions). Try one broad rest and one clearance decision; retain solo carry and the reliable normal bundle. Only after the chamber feels good should fibre fit the local crane and a second installation at home.

7. **Budget puzzle difficulty separately from campaign duration.** Put the proposed 54–90 puzzle minutes and their dependency graph into [progression's paper simulation](../brainstorms/progression.md#done-means), using [eight-hour pacing's activity ledger](eight-hour-pacing.md#four-clocks-with-room-to-breathe). Measure solo and pairs; never scale required gates, timers or bills with attendance to preserve eight hours.

8. **Give each area a distinct puzzle idea and permanent useful aftermath.** Amend the candidate briefs in [progression's repeated-format tension](../brainstorms/progression.md#tensions): traversal/hoisting for Glasshouse, vertical connectivity for Shell, linked machinery for Exhibition. Reject a reskinned gate sequence without a new insight. A second visit should demonstrate what the first solve made easier.

## First prototype: the two-shutter freight yard

**Disposition:** a bounded experiment to schedule under the progression brief's production/replay gates. This report implements nothing. It does not reopen hook swinging, relocate abilities, or authorize a general puzzle framework.

**Space:** entrance → shutter A → broad parking bay → shutter B → receiver. A visible lever opens A while closing B, or vice versa. A pedestrian service path connects entrance, bay and exit in both settings, but its built opening is visibly too small for the load. A second accessible handle, if needed for readability, operates the same setting; it does not add another hidden rule. Cargo must genuinely obey that clearance: if current carried-object behavior cannot represent it, change the layout/prototype scope explicitly rather than pretending a decorative beam collides.

**Solo solution:** open A; carry into the bay; set the load down; take the service path to the lever; open B; retrieve and deliver the load. Delivery fits a brace that holds both shutters open permanently. No timer, pressure plate, required helper or consumable key. The service path keeps both controls and all parking positions reachable after a mistake.

**With friends:** one moves the load while another changes the setting once it is safely parked; they may swap. If the beam-assist integration is available in the chosen build, either can also help carry between rests. Friends save the control detour and can choose different useful jobs. A third friend can scout the receiver or prepare the next ordinary construction task; no additional mandatory shutter is spawned.

**Comparison:** A is the same yard with one simple latched gate; B uses the opposed shutters and parking step. Start at the load, use the same modest approach, receiver and completion feedback, and keep new material rewards out of the first comparison. The branch should make the question answerable in roughly **2–4 minutes**, a target rather than an observed duration. If the route adds only running back and forth, shorten or remove it.

**Builder evidence before owner review:** inspect the reachable states of A/B, cargo at entrance/bay/exit, and final latch; include a deliberate wrong toggle, dropped load, each player's departure, late join and reload. Use the existing verification workflow when implementation is authorized; do not create UI unit tests or a new scenario solely for feel. Record time to first causal discovery, unproductive retries, recovery time, forced waiting, volunteered role changes and whether the clear freight route stays useful. Observe a solo newcomer and a novice/veteran pair, including muted coordination. Small samples reveal failures; they do not establish population-wide enjoyment.

**Owner-facing question:** “Did opening the way for each other make moving the beam more fun?” **What's new:** “One lever swaps two shutters; park the beam or let a friend clear the way.” Stop at that verdict. A yes supports the local fitting/export follow-up already proposed in progression; a no calls for changing the interaction, not multiplying chambers or adding prizes.
