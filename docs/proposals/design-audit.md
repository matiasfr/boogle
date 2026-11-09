# Standing design audit: the rail builds the world

*Proposal by Codex (GPT-6-Astra, xhigh), 2 November 2026. The owner answered its main questions on 2 November; those answers are in [decisions.md](../decisions.md). The rest of this file is a record and binds no one.*

- `SETTLED.md` still says “do not re-open” above the rejected wobbly haul stack and an unresolved promise that every system is ignorable.
- `PLAN.md` still advertises garden, tide, water and ball-led work; the current `DESIGN.md` explicitly replaces that core.
- `vertical-slice.md` still directs a haul-led evening on today's island, a 50-second lay and mayor ceremony; the rail-loop prototypes come first.
- `hub-and-minigames.md` still makes venues the reason to travel; the owner dropped the venue plan on 2 November.
- Eight mandatory eras, short sea gaps and lighthouse-line layouts lose to fewer eras, roughly eight hours, and the new home/network picks.
- “Play is the material,” som, knacks, frontier hauling and era triggers still need decisions; they are not permission to restore the old economy.
- The same decision log contains superseded bench and Tracklayer calls; later sitting and Buddy entries win within their stated scope.
- `visual-target.md`'s ipad/rim prescription loses to high and the Buddy's no-rim review; technical game examples still imply unbuilt tide/weather/crops.

## Scope and reading rules

Audited the local `codex/design-audit` branch at `d3535c30b1f3972f7fcb7878ff7150d56cafe849`. Dates below are dates recorded in the sources, including their 2026-11-02 entries; undated calls stay undated. SETTLED's “by 2026-10-31” is its repository recording date, not a claimed date of owner approval. No network, private concept page, running game, screenshot or device performance was inspected. Code presence and flag guards were inspected; those establish availability in this checkout, not live deployment, play quality or completed adoption.

The latest rail entries in `decisions.md` and the rewritten `DESIGN.md` core loop take precedence. A dated 2026-11-01-or-later direct owner quote defaults to **keep**, unless a 2 November entry explicitly supersedes it; that exception is named in the row. Proposal text, research recommendations, “leaning” notes and director suggestions are not owner decisions. Repeated calls share a row with multiple citations; distinct choices have separate rows. Every Decided, Parked and Open entry in `decisions.md` is covered, including explicit out-of-scope records below.

**Keep** retains a call or its stated parked/provisional status, not permission to implement every example. **Reword** proposes the exact replacement for the named call, not a patch to its whole source file. **Retire** removes a claim's authority as a current design instruction; it never means delete code, assets, history or The Boogler's lines. **Owner call** identifies a choice this audit cannot settle. This proposal changes none of the source documents. Source links and line numbers refer to the audited commit.

The technical refactor in `docs/plans/entity-architecture.md`, sync kinds, lockstep math and engineering contracts are out of scope and unchanged. Stale game examples inside technical text are listed separately. Existing dialogue, small talk, gift `line`s and HUD copy are protected, including fourth-melon, business-book, ball-insurance and boat references. Renaming Nintendo references and shipping ROM-derived data are also out of scope.

## Decisions that actually need the owner

- **Every system ignorable** (A5): May a non-builder simply share friends’ unlocked rail, or must a solo non-builder also get every destination and automatic progress?
- **Material and rewards** (A6, A241, A242): Confirm rail-produced goods versus play-produced goods, and whether som and knacks still earn their complexity.
- **Frontier work** (A68, A71, A76, A73): Choose manual work before connection, the role of helpers, and the goods model; retain the approved bundle feel.
- **Era structure** (A187, A44, A197): Choose the reduced era list and what actually advances an era: reach, town growth or a player-triggered event.
- **Mayor and opening days** (A205, A206, A209): Decide whether these survive before specifying a gathering timer, script or new lines. Existing copy stays intact.
- **World access and shape** (A158, A184, A192, A45): Choose first sea access, route freedom, link order/ring closure and home scale; the selected maps remain working picks.
- **Persistence boundaries** (A64, A65, A290, A261): Define what may expire, any environmental danger, how far unattended growth goes and how construction credit avoids ranking friends.
- **Optional content and audience** (A93, A236, A183): Set mini-game-pass timing, reconcile the guest with movement unlocks, and settle phone support without reopening the quoted provisional M4 target.
- **Narrative remains parked** (A218, A224, A223): Leave unchosen reveals and finales to collaborators after the loop works; this audit does not ask to rewrite existing lines.
- **Document authority** (A40, A25, A26, A28): Approve the proposed historical labels and merge accepted calls into the decision log/replanned rail slice; keep as-built facts separate and story briefs parked.

## Calls by topic

Rows beginning “Current” inventory source-present content. Keep preserves it as optional play or useful support; optional-scenery wording changes its design role, not its implementation. Questioned content remains in place. The later prototype and support rows account for the remaining `src/features` modules without mistaking tooling for old gameplay. The POI loader and all three POI families, the Boogler modules, mushroom/gift systems, critters and guest path were inspected.

### Core loop

| ID  | Call                                             | Source                                                                                                                                                                                                                                                                                                                               | When known                                        | Recommendation | Reason tied to the rail loop                                                                                                                                                                                                            | Exact proposed wording                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Rail connections compound                        | [DESIGN.md:3-11](../../DESIGN.md#L3-L11)<br>[docs/proposals/boogle-2.md:72](../../docs/proposals/boogle-2.md#L72)<br>[docs/proposals/progression-paths.md:7](../../docs/proposals/progression-paths.md#L7)                                                                                                                           | 2026-11-02                                        | keep           | Latest quoted owner direction wins: connected camps automatically supply towns; town upgrades extend the network; no routing or quotas.                                                                                                 | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A2  | Toys before chores                               | [DESIGN.md:15-18](../../DESIGN.md#L15-L18)<br>[docs/proposals/boogle-2.md:27](../../docs/proposals/boogle-2.md#L27)<br>[docs/proposals/hub-and-minigames.md:15-19](../../docs/proposals/hub-and-minigames.md#L15-L19)<br>[docs/game-design.md:35](../../docs/game-design.md#L35)                                                     | Current; owner thread 2026-10-29 to 2026-11-01    | keep           | Track building and riding must be enjoyable before rewards; the rail loop does not license repetitive chores.                                                                                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A3  | Physics toys are optional                        | [DESIGN.md:20-22](../../DESIGN.md#L20-L22)<br>[docs/proposals/boogle-2.md:111](../../docs/proposals/boogle-2.md#L111)<br>[docs/research/0.1/SETTLED.md:19](../../docs/research/0.1/SETTLED.md#L19)<br>[docs/game-design.md:36](../../docs/game-design.md#L36)                                                                        | Current; reaffirmed 2026-11-02                    | keep           | Ball, frisbee and mushrooms remain available without feeding income or requiring every rail feature to involve them.                                                                                                                    | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A4  | Side activities never gate progress              | [DESIGN.md:24-26](../../DESIGN.md#L24-L26)<br>[docs/proposals/boogle-2.md:109](../../docs/proposals/boogle-2.md#L109)<br>[docs/proposals/vertical-slice.md:42](../../docs/proposals/vertical-slice.md#L42)<br>[docs/game-design.md:37](../../docs/game-design.md#L37)                                                                | Current                                           | keep           | Rail growth must not require farming, mini-game scores or toy mastery.                                                                                                                                                                  | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A5  | Every system is ignorable                        | [docs/research/0.1/SETTLED.md:20-23](../../docs/research/0.1/SETTLED.md#L20-L23)<br>[docs/proposals/boogle-2.md:108](../../docs/proposals/boogle-2.md#L108)<br>[docs/proposals/vertical-slice.md:25](../../docs/proposals/vertical-slice.md#L25)<br>[docs/proposals/boogle-2.md:107-108](../../docs/proposals/boogle-2.md#L107-L108) | By 2026-10-31; retained before rail revision      | owner call     | Conflict: unrestricted access without anyone building rail undermines the frontier; DESIGN.md:24-26 only exempts side activities. Decide whether non-builders share others' unlocks or a solo non-builder also gets automatic progress. | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A6  | Play is the material                             | [docs/proposals/boogle-2.md:99-101](../../docs/proposals/boogle-2.md#L99-L101)<br>[docs/proposals/boogle-2.md:211](../../docs/proposals/boogle-2.md#L211)<br>[docs/proposals/vertical-slice.md:37](../../docs/proposals/vertical-slice.md#L37)                                                                                       | Round 2; reopened 2026-11-02                      | owner call     | Open question 12 explicitly leaves reversal to the owner; rail-produced goods now drive growth, while mini-games can remain personal rewards.                                                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A7  | Telegraph everything in 30–60 seconds            | [DESIGN.md:39-40](../../DESIGN.md#L39-L40)<br>[docs/game-design.md:41](../../docs/game-design.md#L41)                                                                                                                                                                                                                                | Unknown; current text                             | reword         | The universal wave warning comes from the retired tide; rail goals need visible destinations and change, not a compulsory countdown.                                                                                                    | Make the next connection and its payoff visible in the world. Announce consequential changes before they happen; choose the warning length for the event rather than imposing a universal countdown.                                                                                                                                                                                                                |
| A8  | Slapstick over precision                         | [DESIGN.md:48-49](../../DESIGN.md#L48-L49)<br>[docs/proposals/hub-and-minigames.md:18](../../docs/proposals/hub-and-minigames.md#L18)<br>[docs/game-design.md:44](../../docs/game-design.md#L44)                                                                                                                                     | Unknown; current text                             | keep           | Funny movement and toys suit rail travel; this does not require train operation or precision chores.                                                                                                                                    | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A9  | Mechanics before narrative                       | [docs/proposals/boogle-2.md:28-32](../../docs/proposals/boogle-2.md#L28-L32)<br>[docs/proposals/boogle-2.md:195](../../docs/proposals/boogle-2.md#L195)<br>[docs/proposals/boogle-2.md:234](../../docs/proposals/boogle-2.md#L234)                                                                                                   | 2026-11-01                                        | keep           | Keep narrative parked until building connections and seeing towns grow are fun; collaborators retain story choices.                                                                                                                     | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A10 | Ambitious, varied technology and construction    | [docs/proposals/boogle-2.md:29-31](../../docs/proposals/boogle-2.md#L29-L31)                                                                                                                                                                                                                                                         | Owner thread, 2026-10-29 to 2026-11-01            | keep           | Visible construction, exploration and distinct eras support the rail payoff; ambition does not restore a material grind or eight mandatory eras.                                                                                        | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A11 | Old roadmap goal                                 | [PLAN.md:3-5](../../PLAN.md#L3-L5)                                                                                                                                                                                                                                                                                                   | Unknown; introduction includes 2026-10-30 history | reword         | Conflict: DESIGN.md:9 wins over the ball-centred roadmap and its invitation to redesign farming and tide.                                                                                                                               | Goal: prove a drop-in rail loop in which connecting camps grows towns and unlocks greater reach. Existing physics toys are optional; the removed water sim, digging and unbuilt crops are historical context, not pending core systems.                                                                                                                                                                             |
| A12 | Mini-games are reasons to go places              | [docs/proposals/hub-and-minigames.md:3-9](../../docs/proposals/hub-and-minigames.md#L3-L9)<br>[docs/proposals/hub-and-minigames.md:109](../../docs/proposals/hub-and-minigames.md#L109)                                                                                                                                              | 2026-10-30                                        | retire         | Conflict: boogle-2.md:56,77 drops island-to-mini-game mapping and the venue plan; camps and towns now motivate travel.                                                                                                                  | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A13 | Emporium idle bazaar as core                     | [docs/proposals/directions.md:20-34](../../docs/proposals/directions.md#L20-L34)                                                                                                                                                                                                                                                     | 2026-10-29/30                                     | retire         | A gift-fed Boat Fund competes with the rail-fed town loop; preserve the existing Emporium dialogue.                                                                                                                                     | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A14 | Raft exploration as core                         | [docs/proposals/directions.md:36-51](../../docs/proposals/directions.md#L36-L51)                                                                                                                                                                                                                                                     | 2026-10-29/30                                     | retire         | Rail is the connective spine; a boat remains an open first-arrival option, not the selected world loop.                                                                                                                                 | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A15 | Knowledge and sand patterns as progression       | [docs/proposals/directions.md:53-68](../../docs/proposals/directions.md#L53-L68)                                                                                                                                                                                                                                                     | 2026-10-29/30                                     | retire         | Pattern solving and removed sand tools cannot be mandatory prerequisites to connecting rail.                                                                                                                                            | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A16 | Physics contraptions as core                     | [docs/proposals/directions.md:70-82](../../docs/proposals/directions.md#L70-L82)                                                                                                                                                                                                                                                     | 2026-10-29/30                                     | retire         | An open-ended hinges-and-water sandbox is an alternative game direction, not a rail-loop commitment.                                                                                                                                    | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A17 | Coconut Post as core                             | [docs/proposals/directions.md:84-98](../../docs/proposals/directions.md#L84-L98)                                                                                                                                                                                                                                                     | 2026-10-29/30                                     | retire         | Asynchronous traces may complement rail, but scheduled coconut mail is not its progression spine.                                                                                                                                       | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A18 | Stay tiny, no progression                        | [docs/proposals/directions.md:100-112](../../docs/proposals/directions.md#L100-L112)                                                                                                                                                                                                                                                 | 2026-10-29/30                                     | retire         | Conflict: the selected rail loop explicitly grows towns and reach over an approximately eight-hour arc.                                                                                                                                 | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A19 | Storm tide as world's clock                      | [docs/proposals/directions.md:114-125](../../docs/proposals/directions.md#L114-L125)<br>[docs/proposals/boogler-tech-tree.md:29](../../docs/proposals/boogler-tech-tree.md#L29)<br>[PLAN.md:105-113](../../PLAN.md#L105-L113)                                                                                                        | 2026-10-29/30                                     | retire         | Conflict: DESIGN.md:11 removes water from the core; recurrent floods and two-pusher crates must not return as rail requirements.                                                                                                        | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A20 | Restore landmarks through varied wants           | [docs/proposals/directions.md:127-138](../../docs/proposals/directions.md#L127-L138)<br>[docs/proposals/boogler-tech-tree.md:24](../../docs/proposals/boogler-tech-tree.md#L24)                                                                                                                                                      | 2026-10-29/30                                     | retire         | Fruit, mushrooms and three-friend bells would make toys gates; rail deliveries now cause visible town growth.                                                                                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A21 | Mix the eight old directions                     | [docs/proposals/directions.md:142-162](../../docs/proposals/directions.md#L142-L162)                                                                                                                                                                                                                                                 | 2026-10-29/30                                     | retire         | The comparison and six hybrid recipes are historical alternatives; none overrides the chosen rail direction.                                                                                                                            | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A22 | Find-the-fun order and pass criteria             | [docs/proposals/boogle-2.md:217-234](../../docs/proposals/boogle-2.md#L217-L234)                                                                                                                                                                                                                                                     | 2026-11-01; superseded in part 2026-11-02         | reword         | Conflict: later Open 9 and Decided rail entries win over wobbly hauling, spill tuning and a 50-second laying test.                                                                                                                      | Keep earlier haul, ride, laying, era and soapbox experiments as playtest history. The next design tests are the rail-fed town loop and the long crossing; plan the slice and home redesign from those results. Narrative and rewards remain deferred.                                                                                                                                                               |
| A23 | Vertical slice is next                           | [docs/proposals/boogle-2.md:177](../../docs/proposals/boogle-2.md#L177)<br>[docs/proposals/boogle-2.md:208](../../docs/proposals/boogle-2.md#L208)<br>[docs/proposals/vertical-slice.md:6-17](../../docs/proposals/vertical-slice.md#L6-L17)                                                                                         | 2026-11-01; replaced 2026-11-02                   | reword         | Conflict: resolved Open 9 wins; a haul-led slice on today's island is not the next deliverable.                                                                                                                                         | Prototype the rail loop and crossing first. Then plan the first-era slice together with the new home layout, retaining the already recorded technical prerequisites without changing them.                                                                                                                                                                                                                          |
| A24 | Keep DESIGN as principles authority              | [DESIGN.md:5](../../DESIGN.md#L5)<br>[DESIGN.md:106-109](../../DESIGN.md#L106-L109)                                                                                                                                                                                                                                                  | Current                                           | keep           | DESIGN defines principles; newer owner decisions in boogle-2 win over older design calls; approving this audit alone changes neither.                                                                                                   | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A25 | PLAN document status                             | [PLAN.md:1-11](../../PLAN.md#L1-L11)<br>[PLAN.md:49-158](../../PLAN.md#L49-L158)                                                                                                                                                                                                                                                     | Mixed historical roadmap                          | reword         | Its unchecked garden, tide and stretch items still look executable; rail prototype sequencing must be the active roadmap.                                                                                                               | Status: historical iteration ledger through the 0.1 testbed. Do not implement its unchecked gameplay items. Current design decisions are in docs/decisions.md; current rail experiments are tracked in docs/plans/find-the-fun.md. Keep completed technical history as history.                                                                                                                            |
| A26 | SETTLED document status                          | [docs/research/0.1/SETTLED.md:1-41](../../docs/research/0.1/SETTLED.md#L1-L41)                                                                                                                                                                                                                                                       | Recorded by 2026-10-31                            | reword         | The title 'do not re-open' falsely outranks recent rail decisions and explicit owner reversals.                                                                                                                                         | Status: historical 0.1 design snapshot, not standing instructions. docs/decisions.md and DESIGN.md supersede it. Preserve this record; migrate only explicitly retained calls into the current decision log.                                                                                                                                                                                               |
| A27 | Decision-log status and stale links              | [docs/proposals/boogle-2.md:3-21](../../docs/proposals/boogle-2.md#L3-L21)<br>[docs/proposals/boogle-2.md:180-189](../../docs/proposals/boogle-2.md#L180-L189)                                                                                                                                                                       | 2026-11-01/02                                     | reword         | The active record must distinguish current rail calls from superseded slice and era briefs without erasing owner history.                                                                                                               | This is the current design decision log. Later dated owner decisions supersede earlier conflicting entries. Label replaced entries as superseded and old proposal links as historical; preserve quotes and the Changed record. No decision here is proof of shipped behavior.                                                                                                                                       |
| A28 | Vertical-slice document status                   | [docs/proposals/vertical-slice.md:1-8](../../docs/proposals/vertical-slice.md#L1-L8)<br>[docs/proposals/vertical-slice.md:58-145](../../docs/proposals/vertical-slice.md#L58-L145)                                                                                                                                                   | 2026-10-31/11-01                                  | reword         | Old milestones would build the rejected lighthouse route, manual haul loop and premature ceremony.                                                                                                                                      | Status: superseded build brief; do not execute S1–S7. Replan the first-era slice after the rail-loop and crossing prototypes and the home greybox. Carry forward only owner-confirmed decisions from decisions.md.                                                                                                                                                                                                   |
| A29 | Hub proposal document status                     | [docs/proposals/hub-and-minigames.md:1-9](../../docs/proposals/hub-and-minigames.md#L1-L9)<br>[docs/proposals/hub-and-minigames.md:123-137](../../docs/proposals/hub-and-minigames.md#L123-L137)                                                                                                                                     | 2026-10-30                                        | reword         | The venue-centred game has been dropped; keep candidate toys for the later mini-games pass.                                                                                                                                             | Status: historical hub direction, not a roadmap. The rail loop determines camps, towns and travel; mini-games are optional and get a separate later pass. This document's first slice and economy are not approved work.                                                                                                                                                                                            |
| A30 | Progression-paths document status                | [docs/proposals/progression-paths.md:1-3](../../docs/proposals/progression-paths.md#L1-L3)<br>[docs/proposals/progression-paths.md:29-43](../../docs/proposals/progression-paths.md#L29-L43)                                                                                                                                         | 2026-10-30                                        | reword         | The useful reach/build ideas should inform rail design, while discovery gates and the water-first order stay historical.                                                                                                                | Status: historical alternatives, none approved here. Carry visible shared progress and movement-changing unlocks into the rail brief; do not implement the proposed hybrid or first-prototype list.                                                                                                                                                                                                                 |
| A31 | Story proposal document status                   | [docs/proposals/story-and-finale.md:1-3](../../docs/proposals/story-and-finale.md#L1-L3)<br>[docs/proposals/story-and-finale.md:94-99](../../docs/proposals/story-and-finale.md#L94-L99)                                                                                                                                             | 2026-10-30                                        | reword         | Narrative waits for the rail loop; its ceremonies, eight-era gags and finales are options, not obligations.                                                                                                                             | Status: parked story options for collaborators. The rail loop and retained eras must settle before selecting ceremonies, gags or a finale. Existing Boogler copy remains protected by AGENTS.md.                                                                                                                                                                                                                    |
| A32 | Fourth-melon document status                     | [docs/proposals/fourth-melon.md:3](../../docs/proposals/fourth-melon.md#L3)<br>[docs/proposals/fourth-melon.md:62-77](../../docs/proposals/fourth-melon.md#L62-L77)                                                                                                                                                                  | 2026-11-01                                        | reword         | A parked writers' brief must not authorize rewriting protected lines during rail cleanup.                                                                                                                                               | Status: parked new-story options. No reveal is chosen. Existing dialogue, backstory and gift lines are out of scope for cleanup; any proposed change belongs in a separate owner-led writing decision.                                                                                                                                                                                                              |
| A33 | Tech-tree document status                        | [docs/proposals/boogler-tech-tree.md:1-5](../../docs/proposals/boogler-tech-tree.md#L1-L5)<br>[docs/proposals/boogler-tech-tree.md:230-236](../../docs/proposals/boogler-tech-tree.md#L230-L236)                                                                                                                                     | 2026-10-29/30                                     | reword         | The 45-page restoration book is a displaced progression model, not a second rail roadmap.                                                                                                                                               | Status: historical alternative to rail progression. Do not implement page gates, the Boat Fund, seasons or its first slice. Keep existing Boogler lines intact; collaborators may later reuse unbuilt story ideas explicitly.                                                                                                                                                                                       |
| A34 | Directions document status                       | [docs/proposals/directions.md:1-7](../../docs/proposals/directions.md#L1-L7)<br>[docs/proposals/directions.md:164-174](../../docs/proposals/directions.md#L164-L174)                                                                                                                                                                 | 2026-10-29/30                                     | reword         | Eight alternatives should stop sending agents back to pre-rail choices.                                                                                                                                                                 | Status: historical direction exploration. The owner selected the rail-builds-the-world direction in decisions.md; none of A–H or their combinations is an active plan.                                                                                                                                                                                                                                               |
| A35 | Vehicles document status                         | [docs/proposals/vehicles.md:3](../../docs/proposals/vehicles.md#L3)<br>[docs/proposals/vehicles.md:109-113](../../docs/proposals/vehicles.md#L109-L113)                                                                                                                                                                              | 2026-10-29/30                                     | reword         | Old cannon-es guesses, ball mandates and gravity-only routes must not override the accepted RC soapbox or transport-only train.                                                                                                         | Status: historical vehicle research and untested starting values. Follow current owner playtest decisions for the RC soapbox and trains. Reuse feel observations only after checking the current vehicle; no listed vehicle or number is an implementation mandate.                                                                                                                                                 |
| A36 | Island-layout document status                    | [docs/proposals/island-layout.md:3-5](../../docs/proposals/island-layout.md#L3-L5)<br>[docs/proposals/island-layout.md:127-132](../../docs/proposals/island-layout.md#L127-L132)                                                                                                                                                     | 2026-11-01                                        | reword         | Conflict: boogle-2.md:66-78 parks the old layout lab and picks new home/network candidates.                                                                                                                                             | Status: historical layout lab on the old island. Lighthouse line is rejected; West Cove and East Bay are parked. Threefold Reach and Two-Bay Weave are the current working picks, subject to a greybox and the crossing scale test.                                                                                                                                                                                 |
| A37 | Visual-target document status                    | [docs/proposals/visual-target.md:3-19](../../docs/proposals/visual-target.md#L3-L19)<br>[docs/proposals/visual-target.md:179-216](../../docs/proposals/visual-target.md#L179-L216)                                                                                                                                                   | 2026-11-01                                        | reword         | Old measured research remains evidence, but its ipad/rim prescription conflicts with newer high/Buddy choices.                                                                                                                          | Status: historical rendering experiment and estimates, not the selected art direction. Use the owner's high preset target and current Buddy guidance in decisions.md; device estimates require measurement and do not overrule those choices.                                                                                                                                                                        |
| A38 | As-built document status                         | [docs/game-design.md:3-9](../../docs/game-design.md#L3-L9)                                                                                                                                                                                                                                                                           | Current index                                     | keep           | Keep the as-built inventory separate from rail ambition; repair verified inaccuracies without claiming prototypes are the shipped loop.                                                                                                 | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A39 | As-built overview still describes toy-first loop | [docs/game-design.md:15-22](../../docs/game-design.md#L15-L22)<br>[src/features/log-sources.ts:1-3](../../src/features/log-sources.ts#L1-L3)<br>[src/features/proto-net.ts:1-14](../../src/features/proto-net.ts#L1-L14)<br>[src/features/proto-crossing.ts:1-6](../../src/features/proto-crossing.ts#L1-L6)                         | Observed at audited commit                        | reword         | The old overview says palms are shaken for logs and calls the toy inventory the loop; rail growth is currently flagged prototype work.                                                                                                  | The base game contains optional physics toys, mushrooms, The Boogler, caves and the 0.1 rail testbed. Logs currently come from Take logs bundles at palms, not chopping or shaking. The working design is rail-fed town growth; that loop currently lives behind ?proto=net, with long-distance travel tested behind ?proto=crossing. Crops, shared water simulation and sand shaping are not built into this loop. |
| A40 | Which documents become active or historical      | [docs/proposals/boogle-2.md:3-21](../../docs/proposals/boogle-2.md#L3-L21)<br>[PLAN.md:9-11](../../PLAN.md#L9-L11)                                                                                                                                                                                                                   | Audit recommendation                              | owner call     | Approve one living decision log plus DESIGN principles, a replanned rail slice, and an accurate as-built index; mark the older alternatives historical, retaining story briefs parked and merging only accepted calls.                  | —                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A41 | Stuck-page book is the tech tree                 | [docs/proposals/boogler-tech-tree.md:13-17](../../docs/proposals/boogler-tech-tree.md#L13-L17)                                                                                                                                                                                                                                       | 2026-10-29/30 proposal                            | retire         | A mandatory book/blueprint interface is a displaced progression model; rail camps, deliveries and town changes now show progress directly.                                                                                              | —                                                                                                                                                                                                                                                                                                                                                                                                                   |

### Progression

| ID  | Call                                           | Source                                                                                                                                                                                                                      | When known                                  | Recommendation | Reason tied to the rail loop                                                                                                                                                           | Exact proposed wording                                                                                                                                                          |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A42 | Eight-hour target, fewer eras                  | [docs/proposals/boogle-2.md:43](../../docs/proposals/boogle-2.md#L43)<br>[docs/proposals/boogle-2.md:209](../../docs/proposals/boogle-2.md#L209)                                                                            | 2026-11-02                                  | keep           | Quoted owner decision and resolved Open 10 replace four hours and multiple evenings per era; rail compounding needs a finite, testable arc.                                            | —                                                                                                                                                                               |
| A43 | Four hours or 1–3 evenings per era             | [docs/research/0.1/SETTLED.md:9](../../docs/research/0.1/SETTLED.md#L9)<br>[docs/proposals/boogle-2.md:58](../../docs/proposals/boogle-2.md#L58)<br>[docs/proposals/boogle-2.md:182](../../docs/proposals/boogle-2.md#L182) | By 2026-11-01; superseded 2026-11-02        | retire         | Conflict: boogle-2.md:43 wins with roughly eight hours total, not eight separate long grinds.                                                                                          | —                                                                                                                                                                               |
| A44 | Discoveries advance ages, not stations         | [docs/research/0.1/SETTLED.md:8](../../docs/research/0.1/SETTLED.md#L8)                                                                                                                                                     | By 2026-10-31                               | owner call     | Rail-fed town growth now supplies upgrades, but no latest decision specifies what ends an era; do not silently retain discovery gates.                                                 | —                                                                                                                                                                               |
| A45 | Preset railway built in short sections         | [docs/research/0.1/SETTLED.md:4](../../docs/research/0.1/SETTLED.md#L4)<br>[docs/proposals/boogle-2.md:68](../../docs/proposals/boogle-2.md#L68)                                                                            | By 2026-10-31; network direction 2026-11-01 | owner call     | A stepping-stone network is retained, but fixed sockets versus player-chosen paths and branch unlocks remain unchosen.                                                                 | —                                                                                                                                                                               |
| A46 | Stations bring characters; stones reveal route | [docs/research/0.1/SETTLED.md:5](../../docs/research/0.1/SETTLED.md#L5)                                                                                                                                                     | By 2026-10-31; stones explicitly leaning    | owner call     | Readable rail destinations fit; automatic NPC rewards and rising ancient stones are unconfirmed presentation choices.                                                                  | —                                                                                                                                                                               |
| A47 | Station miniature is display-only              | [docs/research/0.1/SETTLED.md:7](../../docs/research/0.1/SETTLED.md#L7)                                                                                                                                                     | By 2026-10-31                               | keep           | A Big Walk-style overview can show the growing network without becoming another required progression system.                                                                           | —                                                                                                                                                                               |
| A48 | Any K of M gates                               | [docs/proposals/progression-paths.md:11](../../docs/proposals/progression-paths.md#L11)                                                                                                                                     | 2026-10-30 proposal                         | retire         | No such gate is approved; camp connections should prove the loop before adding multi-task era checklists.                                                                              | —                                                                                                                                                                               |
| A49 | Find-it blueprint leads                        | [docs/proposals/progression-paths.md:20](../../docs/proposals/progression-paths.md#L20)                                                                                                                                     | 2026-10-30 proposal                         | retire         | Three-of-five discovery gates make unrelated toy tricks prerequisites for the rail frontier.                                                                                           | —                                                                                                                                                                               |
| A50 | Reach-it track progression                     | [docs/proposals/progression-paths.md:21](../../docs/proposals/progression-paths.md#L21)                                                                                                                                     | 2026-10-30 proposal                         | reword         | Reaching resources survives, but closing a decorative loop is not the chosen economic trigger.                                                                                         | Connect resource camps to the rail network; their deliveries grow towns and unlock greater reach. A closed loop is not required unless a later prototype establishes that rule. |
| A51 | Island-notices silhouette                      | [docs/proposals/progression-paths.md:22](../../docs/proposals/progression-paths.md#L22)                                                                                                                                     | 2026-10-30 proposal                         | reword         | Visible feedback fits town growth; counting deep-water cells belongs to the removed water direction.                                                                                   | Show the effect of delivered goods in the town's buildings and activity, with the next useful connection readable in the world.                                                 |
| A52 | Era noticeboard tasks                          | [docs/proposals/progression-paths.md:23](../../docs/proposals/progression-paths.md#L23)                                                                                                                                     | 2026-10-30 proposal                         | retire         | Six-of-nine slapstick tasks would replace rail-led progression with chores and split attention from shared connections.                                                                | —                                                                                                                                                                               |
| A53 | Tinkerers' combinations                        | [docs/proposals/progression-paths.md:24](../../docs/proposals/progression-paths.md#L24)                                                                                                                                     | 2026-10-30 proposal                         | retire         | Junk-combination discovery is an alternative progression model, not a prerequisite for rail upgrades.                                                                                  | —                                                                                                                                                                               |
| A54 | Restore-it varied deliveries                   | [docs/proposals/progression-paths.md:25](../../docs/proposals/progression-paths.md#L25)                                                                                                                                     | 2026-10-30 proposal                         | retire         | A shopping list of manual offerings conflicts with automatic camp output and no quotas.                                                                                                | —                                                                                                                                                                               |
| A55 | Discovery → blueprint → varied cargo hybrid    | [docs/proposals/progression-paths.md:29-37](../../docs/proposals/progression-paths.md#L29-L37)                                                                                                                              | 2026-10-30 proposal                         | retire         | Conflict: boogle-2.md:72 wins; track connections cause growth without first solving discovery leads.                                                                                   | —                                                                                                                                                                               |
| A56 | Water-first prototype order                    | [docs/proposals/progression-paths.md:41-43](../../docs/proposals/progression-paths.md#L41-L43)                                                                                                                              | 2026-10-30 proposal                         | retire         | Watering by standing water, windmill discovery and handcar pumping are not the current rail-loop experiments.                                                                          | —                                                                                                                                                                               |
| A57 | Movement-changing unlocks                      | [docs/proposals/progression-paths.md:13-14](../../docs/proposals/progression-paths.md#L13-L14)                                                                                                                              | 2026-10-30 proposal                         | keep           | New reach and visible persistent changes are precisely the payoff of each rail connection.                                                                                             | —                                                                                                                                                                               |
| A58 | Double jump and glide unlock later             | [docs/proposals/boogle-2.md:95](../../docs/proposals/boogle-2.md#L95)<br>[src/features/proto-moves.ts:1-4](../../src/features/proto-moves.ts#L1-L4)                                                                         | 2026-11-01                                  | keep           | Quoted owner decision retained: expanded movement should feel earned; which town or rail milestone grants it remains open.                                                             | —                                                                                                                                                                               |
| A59 | Regulars gate book chapters                    | [docs/proposals/boogler-tech-tree.md:37](../../docs/proposals/boogler-tech-tree.md#L37)<br>[docs/proposals/directions.md:167](../../docs/proposals/directions.md#L167)                                                      | 2026-10-29/30 proposal                      | retire         | Counting friends or three return days stalls solo rail progress; current solo-first and drop-in principles win.                                                                        | —                                                                                                                                                                               |
| A60 | Friend level opens the progression book        | [docs/proposals/boogler-tech-tree.md:74-76](../../docs/proposals/boogler-tech-tree.md#L74-L76)                                                                                                                              | 2026-10-29/30 proposal                      | retire         | Personal friendship must not gate communal rail reach; retain friendship itself and its existing lines.                                                                                | —                                                                                                                                                                               |
| A61 | Seeded chapter order                           | [docs/proposals/boogler-tech-tree.md:64](../../docs/proposals/boogler-tech-tree.md#L64)                                                                                                                                     | 2026-10-29/30 proposal                      | retire         | A shuffled restoration tech tree is not the chosen rail frontier; network branch choices need their own design.                                                                        | —                                                                                                                                                                               |
| A62 | Four seasons over weeks                        | [docs/proposals/boogler-tech-tree.md:25](../../docs/proposals/boogler-tech-tree.md#L25)<br>[docs/proposals/boogler-tech-tree.md:203-212](../../docs/proposals/boogler-tech-tree.md#L203-L212)                               | 2026-10-29/30 proposal                      | retire         | Conflict: boogle-2.md:43's approximately eight-hour arc wins over four restoration seasons and real-week gating.                                                                       | —                                                                                                                                                                               |
| A63 | No timers as gates or pay-to-skip              | [docs/proposals/boogler-tech-tree.md:38](../../docs/proposals/boogler-tech-tree.md#L38)<br>[docs/research/0.1/SETTLED.md:10](../../docs/research/0.1/SETTLED.md#L10)                                                        | By 2026-10-31                               | reword         | Rail rides and visible construction have duration; the intended protection is against waiting as progression friction.                                                                 | Do not gate rail progress on real-day attendance, cooldown chores or pay-to-skip. Travel and construction may take time when that time feels good in play.                      |
| A64 | No decay, breakage or repair                   | [docs/research/0.1/SETTLED.md:10](../../docs/research/0.1/SETTLED.md#L10)<br>[docs/proposals/boogle-2.md:110](../../docs/proposals/boogle-2.md#L110)<br>[src/sim/gifts.ts:7](../../src/sim/gifts.ts#L7)                     | By 2026-10-31; retained 2026-11-01          | owner call     | Protect rail and town gains; the literal 'nothing decays' conflicts with thrown gifts expiring after 6,000 ticks. Decide whether transient cleanup is exempt; no code change proposed. | —                                                                                                                                                                               |
| A65 | No hazards                                     | [docs/research/0.1/SETTLED.md:10](../../docs/research/0.1/SETTLED.md#L10)<br>[DESIGN.md:32-34](../../DESIGN.md#L32-L34)                                                                                                     | By 2026-10-31                               | owner call     | SETTLED forbids hazards while DESIGN permits environmental threats; keep rail progress safe and decide whether any optional environmental danger remains.                              | —                                                                                                                                                                               |
| A66 | Persist progress and show return changes       | [DESIGN.md:45-46](../../DESIGN.md#L45-L46)<br>[docs/proposals/boogler-tech-tree.md:27-39](../../docs/proposals/boogler-tech-tree.md#L27-L39)<br>[docs/game-design.md:43](../../docs/game-design.md#L43)                     | Current principle; older examples           | keep           | A visitor should see rail and town growth left by others; no revival of Boat Fund, crops or scheduled letters is implied.                                                              | —                                                                                                                                                                               |

### Resources and hauling

| ID  | Call                                        | Source                                                                                                                                                                                                                                  | When known                                | Recommendation | Reason tied to the rail loop                                                                                                                                                 | Exact proposed wording                                                                                                                                                |
| --- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A67 | Light resources; hotbar provisional         | [docs/proposals/boogle-2.md:92](../../docs/proposals/boogle-2.md#L92)                                                                                                                                                                   | 2026-11-01                                | keep           | Retain the owner's non-survival direction and provisional hotbar; automatic rail supply makes inventory pressure less useful.                                                | —                                                                                                                                                                     |
| A68 | Harvest rather than collect resources       | [docs/proposals/boogle-2.md:93](../../docs/proposals/boogle-2.md#L93)                                                                                                                                                                   | 2026-11-01, direction only                | owner call     | Conflict: 2 November replaces manual resource management with camp automation; decide whether chopping survives only before rail reaches the frontier.                       | —                                                                                                                                                                     |
| A69 | Back bundle remains the hauling form        | [docs/proposals/boogle-2.md:94](../../docs/proposals/boogle-2.md#L94)<br>[docs/proposals/boogle-2.md:97](../../docs/proposals/boogle-2.md#L97)                                                                                          | 2026-11-01                                | keep           | Quoted owner approval remains: a compact, steady bundle with no sway or jump spill; 2 November questions its role, not its accepted feel.                                    | —                                                                                                                                                                     |
| A70 | Automatic pickup magnet elsewhere           | [docs/proposals/boogle-2.md:93-94](../../docs/proposals/boogle-2.md#L93-L94)                                                                                                                                                            | 2026-11-01                                | keep           | Retain the liked button-free magnet as a pickup direction; it is not a reason to add mandatory resource gathering to connected camps.                                        | —                                                                                                                                                                     |
| A71 | Hauling after automation, Open 11           | [docs/proposals/boogle-2.md:210](../../docs/proposals/boogle-2.md#L210)                                                                                                                                                                 | 2026-11-02                                | owner call     | Decide whether wood-age setup and an unconnected frontier need hand hauling; the director's suggestion is not an owner decision.                                             | —                                                                                                                                                                     |
| A72 | Wobbly stack, soft cap 20, jump spill       | [docs/research/0.1/SETTLED.md:13](../../docs/research/0.1/SETTLED.md#L13)<br>[PLAN.md:133](../../PLAN.md#L133)<br>[docs/proposals/boogle-2.md:221-222](../../docs/proposals/boogle-2.md#L221-L222)                                      | By 2026-10-31; rejected 2026-11-01        | retire         | Conflict: boogle-2.md:97 and Changed:187 explicitly replace wobble and spill with the steady back bundle.                                                                    | —                                                                                                                                                                     |
| A73 | One material per age, real names            | [docs/research/0.1/SETTLED.md:13](../../docs/research/0.1/SETTLED.md#L13)<br>[docs/research/0.1/SETTLED.md:19](../../docs/research/0.1/SETTLED.md#L19)                                                                                  | By 2026-10-31                             | owner call     | Real material names are harmless, but camp types and fewer eras may need simultaneous goods; do not inherit one-material-per-age as a rail constraint.                       | —                                                                                                                                                                     |
| A74 | Manual wagon loading begins at diesel       | [docs/research/0.1/SETTLED.md:14](../../docs/research/0.1/SETTLED.md#L14)                                                                                                                                                               | By 2026-10-31                             | retire         | Conflict: boogle-2.md:72 makes connected installations load goods automatically; automation cannot wait for diesel.                                                          | —                                                                                                                                                                     |
| A75 | Pour by walking into work ring              | [docs/research/0.1/SETTLED.md:15](../../docs/research/0.1/SETTLED.md#L15)<br>[src/features/work-sites.ts:1-4](../../src/features/work-sites.ts#L1-L4)                                                                                   | By 2026-10-31; source-present             | keep           | Retain the simple existing interaction wherever hand hauling is eventually retained; it does not settle how much hauling the rail loop needs.                                | —                                                                                                                                                                     |
| A76 | Track-versus-helper investment              | [docs/research/0.1/SETTLED.md:15-17](../../docs/research/0.1/SETTLED.md#L15-L17)<br>[src/features/helper-bank.ts:1-4](../../src/features/helper-bank.ts#L1-L4)                                                                          | By 2026-10-31; source-present             | owner call     | The existing helper economy overlaps camp automation; decide whether huts survive as rail installations or remain historical testbed machinery.                              | —                                                                                                                                                                     |
| A77 | Visible workers and one-section offline cap | [docs/research/0.1/SETTLED.md:16](../../docs/research/0.1/SETTLED.md#L16)<br>[docs/game-design/haul.md:98-107](../../docs/game-design/haul.md#L98-L107)                                                                                 | By 2026-10-31                             | owner call     | Visible workers are proposed, the bank exists; rail output and offline town growth need a chosen cap rather than inheriting helper-only limits.                              | —                                                                                                                                                                     |
| A78 | Own stack, fixed costs, more players faster | [docs/research/0.1/SETTLED.md:18](../../docs/research/0.1/SETTLED.md#L18)                                                                                                                                                               | By 2026-10-31                             | keep           | Personal carrying and shared fixed projects let drop-ins help without spending others' inventory; new rail costs still require playtesting.                                  | —                                                                                                                                                                     |
| A79 | No spraying currency or ball income         | [docs/research/0.1/SETTLED.md:19](../../docs/research/0.1/SETTLED.md#L19)<br>[docs/research/0.1/SETTLED.md:26-28](../../docs/research/0.1/SETTLED.md#L26-L28)                                                                           | By 2026-10-31                             | keep           | Rail installations supply useful goods; arbitrary coins from bopping toys would turn optional play into farming.                                                             | —                                                                                                                                                                     |
| A80 | No timer-driven groves                      | [docs/research/0.1/SETTLED.md:27](../../docs/research/0.1/SETTLED.md#L27)                                                                                                                                                               | By 2026-10-31                             | reword         | Literal prohibition conflicts with automatic camp output over time; forbid waiting chores rather than the new network simulation.                                            | Do not add harvest cooldown chores or timer-gated groves. Connected camps may produce automatically over time as part of the rail loop.                               |
| A81 | Old 60-log testbed cost                     | [docs/proposals/boogle-2.md:222](../../docs/proposals/boogle-2.md#L222)<br>[docs/game-design/haul.md:54](../../docs/game-design/haul.md#L54)<br>[docs/game-design/net.md:22-23](../../docs/game-design/net.md#L22-L23)                  | 0.1; prototype revised 2026-11-02         | reword         | The rail prototype already tries 24 logs; neither that nor 60 is an approved final economy.                                                                                  | The 0.1 testbed costs 60 logs per wood section; the rail-loop prototype tries 24. Final costs follow the rail prototype and the owner's decision on frontier hauling. |
| A82 | Current bundles, piles and stacks           | [src/features/log-sources.ts:1-5](../../src/features/log-sources.ts#L1-L5)<br>[src/features/piles.ts:1-3](../../src/features/piles.ts#L1-L3)<br>[src/features/haul-stack.ts:1-4](../../src/features/haul-stack.ts#L1-L4)                | Observed at audited commit                | owner call     | Question the long-term resource loop while retaining the accepted bundle feel; these are source-present testbed systems, not proof of harvesting or a finished rail economy. | —                                                                                                                                                                     |
| A83 | Current work sites and helper bank          | [src/features/work-sites.ts:1-4](../../src/features/work-sites.ts#L1-L4)<br>[src/features/helper-bank.ts:1-4](../../src/features/helper-bank.ts#L1-L4)<br>[src/features/hut-build.ts:1-4](../../src/features/hut-build.ts#L1-L4)        | Observed at audited commit                | owner call     | Question permanent helper rings/bank; keep the piece-by-piece construction treatment for camps and towns, whose supply replaces repetitive hauling.                          | —                                                                                                                                                                     |
| A84 | Watch construction; crates ride             | [docs/proposals/boogle-2.md:65](../../docs/proposals/boogle-2.md#L65)<br>[docs/proposals/boogle-2.md:83-84](../../docs/proposals/boogle-2.md#L83-L84)<br>[src/features/track-machine.ts:1-4](../../src/features/track-machine.ts#L1-L4) | 2026-11-01 owner approval; source-present | keep           | Quoted construction approval and visible cargo make cause and effect legible: connecting a camp visibly grows the destination.                                               | —                                                                                                                                                                     |
| A85 | Quick laying, about 14 seconds              | [docs/proposals/boogle-2.md:64](../../docs/proposals/boogle-2.md#L64)<br>[docs/proposals/vertical-slice.md:48](../../docs/proposals/vertical-slice.md#L48)<br>[docs/game-design/haul.md:93-96](../../docs/game-design/haul.md#L93-L96)  | 2026-11-01                                | keep           | Quoted owner approval wins over the slice's 50-second crawl; preserve the request to fix the animation-end jump, not the old duration.                                       | —                                                                                                                                                                     |
| A86 | Per-era laying machine, anyone starts       | [docs/research/0.1/SETTLED.md:6](../../docs/research/0.1/SETTLED.md#L6)<br>[docs/proposals/vertical-slice.md:32](../../docs/proposals/vertical-slice.md#L32)                                                                            | By 2026-10-31                             | keep           | A shared visible run fits rail construction; machine looks follow the reduced era list rather than committing to seven or eight asset sets.                                  | —                                                                                                                                                                     |

### Toys and side activities

| ID   | Call                                         | Source                                                                                                                                                                                                                                                                                                                                                               | When known                                | Recommendation | Reason tied to the rail loop                                                                                                                                    | Exact proposed wording                                                                                                                                                             |
| ---- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A87  | Water and farming are not core               | [DESIGN.md:11](../../DESIGN.md#L11)<br>[PLAN.md:59-113](../../PLAN.md#L59-L113)<br>[docs/research/0.1/SETTLED.md:29](../../docs/research/0.1/SETTLED.md#L29)<br>[docs/proposals/directions.md:169](../../docs/proposals/directions.md#L169)                                                                                                                          | Removed 2026-10-30; reaffirmed 2026-11-02 | keep           | Keep removed digging/water and unbuilt crops out of the rail roadmap; swimming and splash scenery can remain.                                                   | —                                                                                                                                                                                  |
| A88  | Crop hydration and offline growth            | [PLAN.md:95-98](../../PLAN.md#L95-L98)                                                                                                                                                                                                                                                                                                                               | Old plan; on hold by 2026-10-30           | retire         | Soil hydration, planting/harvesting crops and timestamp growth are not unfinished pieces of the rail loop.                                                      | —                                                                                                                                                                                  |
| A89  | Visitor watering bonus and shared harvest    | [PLAN.md:99-103](../../PLAN.md#L99-L103)                                                                                                                                                                                                                                                                                                                             | Old plan; on hold by 2026-10-30           | retire         | Different-player bonuses remain a principle, but farming bonuses and island harvest totals should not become rail gates.                                        | —                                                                                                                                                                                  |
| A90  | Reservoir weather and erosion                | [PLAN.md:140](../../PLAN.md#L140)<br>[PLAN.md:144](../../PLAN.md#L144)                                                                                                                                                                                                                                                                                               | Undated stretch ideas                     | retire         | Rain, drought, wet-sand slowdown and plant-anchored erosion depend on the displaced water/farm direction.                                                       | —                                                                                                                                                                                  |
| A91  | Ball-powered water wheel                     | [PLAN.md:142](../../PLAN.md#L142)<br>[docs/proposals/directions.md:72](../../docs/proposals/directions.md#L72)                                                                                                                                                                                                                                                       | Undated stretch; 2026-10-29/30            | retire         | Requiring the ball to move water restores an obsolete core dependency instead of optional toy play.                                                             | —                                                                                                                                                                                  |
| A92  | Timed r/place garden                         | [PLAN.md:143](../../PLAN.md#L143)                                                                                                                                                                                                                                                                                                                                    | Undated stretch idea                      | retire         | One seed per interval is a different long-term activity, not a task for the rail progression pass.                                                              | —                                                                                                                                                                                  |
| A93  | Mini-games get a later pass                  | [docs/proposals/boogle-2.md:175](../../docs/proposals/boogle-2.md#L175)<br>[docs/proposals/boogle-2.md:178](../../docs/proposals/boogle-2.md#L178)<br>[docs/proposals/boogle-2.md:200](../../docs/proposals/boogle-2.md#L200)                                                                                                                                        | 2026-11-01; Open 2 still open             | owner call     | Keep the later-pass boundary; owner must choose when it starts, after the rail loop has answered rather than as a prerequisite.                                 | —                                                                                                                                                                                  |
| A94  | Topple cut; hop leads; golf wanted           | [docs/proposals/boogle-2.md:175](../../docs/proposals/boogle-2.md#L175)<br>[src/features/proto-minis.ts:1-4](../../src/features/proto-minis.ts#L1-L4)                                                                                                                                                                                                                | 2026-11-01                                | keep           | Recent owner verdict wins over the old court/soapbox/tide-first shortlist; hop and golf remain optional toys awaiting real mini-game design.                    | —                                                                                                                                                                                  |
| A95  | Court ball                                   | [docs/proposals/hub-and-minigames.md:45](../../docs/proposals/hub-and-minigames.md#L45)<br>[docs/proposals/vertical-slice.md:115](../../docs/proposals/vertical-slice.md#L115)                                                                                                                                                                                       | 2026-10-30; deferred 2026-11-01           | keep           | Keep as a parked optional candidate, not an implemented scored sport or a rail-material source.                                                                 | —                                                                                                                                                                                  |
| A96  | RC soapbox stays, drive beyond hill          | [docs/proposals/boogle-2.md:174](../../docs/proposals/boogle-2.md#L174)<br>[src/features/proto-soapbox.ts:1-5](../../src/features/proto-soapbox.ts#L1-L5)                                                                                                                                                                                                            | 2026-11-01                                | keep           | Quoted 'pretty fun' verdict wins over gravity-only downhill plans; races are later ideas and transport by rail does not depend on racing.                       | —                                                                                                                                                                                  |
| A97  | Gravity-only soapbox, lighthouse race        | [docs/proposals/vehicles.md:32-49](../../docs/proposals/vehicles.md#L32-L49)<br>[docs/proposals/vertical-slice.md:107-111](../../docs/proposals/vertical-slice.md#L107-L111)<br>[docs/proposals/boogler-tech-tree.md:124](../../docs/proposals/boogler-tech-tree.md#L124)<br>[docs/proposals/hub-and-minigames.md:46](../../docs/proposals/hub-and-minigames.md#L46) | 2026-10-29 to 2026-11-01                  | retire         | Conflict: accepted RC driving and redesigned home win; the old no-engine vehicle and fixed lighthouse course are not binding.                                   | —                                                                                                                                                                                  |
| A98  | Melon regatta and raft                       | [docs/proposals/hub-and-minigames.md:47](../../docs/proposals/hub-and-minigames.md#L47)<br>[docs/proposals/boogler-tech-tree.md:127](../../docs/proposals/boogler-tech-tree.md#L127)<br>[docs/proposals/vehicles.md:87-94](../../docs/proposals/vehicles.md#L87-L94)                                                                                                 | 2026-10-29/30 proposal                    | owner call     | Park the capsizing toy; whether any boat is needed for first sea access remains Open 13, not a commitment to melon cargo or a storm tide.                       | —                                                                                                                                                                                  |
| A99  | Sandcastle versus tide                       | [docs/proposals/hub-and-minigames.md:48](../../docs/proposals/hub-and-minigames.md#L48)                                                                                                                                                                                                                                                                              | 2026-10-30 proposal                       | retire         | It depends on removed terrain/water play and cannot dictate the new rail world or restore the venue plan.                                                       | —                                                                                                                                                                                  |
| A100 | Boogler rodeo score                          | [docs/proposals/hub-and-minigames.md:49](../../docs/proposals/hub-and-minigames.md#L49)                                                                                                                                                                                                                                                                              | 2026-10-30 proposal                       | owner call     | Existing ride/launch play can stay; timed endurance and distance scoring need a separate optional mini-game decision.                                           | —                                                                                                                                                                                  |
| A101 | Mine-cart coin run                           | [docs/proposals/hub-and-minigames.md:50](../../docs/proposals/hub-and-minigames.md#L50)                                                                                                                                                                                                                                                                              | 2026-10-30 proposal                       | owner call     | A cave toy is optional; leaning and coin collection are not requirements for riding the main transport train.                                                   | —                                                                                                                                                                                  |
| A102 | Timed coconut shy                            | [docs/proposals/hub-and-minigames.md:51](../../docs/proposals/hub-and-minigames.md#L51)<br>[docs/research/0.1/SETTLED.md:32](../../docs/research/0.1/SETTLED.md#L32)                                                                                                                                                                                                 | 2026-10-30 proposal; stale 0.1 snapshot   | retire         | Ball-driven fruit income conflicts with the no-income rule, and current gift sources no longer implement the advertised palm-fruit loop.                        | —                                                                                                                                                                                  |
| A103 | Water polo in dug pond                       | [docs/proposals/hub-and-minigames.md:52](../../docs/proposals/hub-and-minigames.md#L52)<br>[PLAN.md:141](../../PLAN.md#L141)                                                                                                                                                                                                                                         | 2026-10-30 proposal                       | retire         | Dug ponds and sand goals require removed mechanics; optional swimming does not approve their return.                                                            | —                                                                                                                                                                                  |
| A104 | Mushroom hop and trick points                | [docs/proposals/hub-and-minigames.md:53](../../docs/proposals/hub-and-minigames.md#L53)<br>[docs/proposals/boogle-2.md:175](../../docs/proposals/boogle-2.md#L175)                                                                                                                                                                                                   | 2026-10-30; owner preference 2026-11-01   | reword         | Hop survives as an owner-favoured toy; trick points were never selected and must not feed rail progress.                                                        | Keep mushroom hop as an optional platforming toy. Decide scoring and rewards in the later mini-games pass; no rail progress depends on it.                                         |
| A105 | Haggle rhythm toy                            | [docs/proposals/hub-and-minigames.md:54](../../docs/proposals/hub-and-minigames.md#L54)<br>[docs/proposals/boogler-tech-tree.md:91](../../docs/proposals/boogler-tech-tree.md#L91)                                                                                                                                                                                   | 2026-10-29/30 proposal                    | owner call     | An optional Boogler interaction can be reconsidered later; it must not finance town growth or alter protected lines as cleanup.                                 | —                                                                                                                                                                                  |
| A106 | Shared verbs include dig and pile            | [docs/proposals/hub-and-minigames.md:17](../../docs/proposals/hub-and-minigames.md#L17)                                                                                                                                                                                                                                                                              | 2026-10-30 proposal                       | reword         | Reusing controls fits rail play, but removed sand verbs are not standing requirements.                                                                          | Optional mini-games reuse the current move, jump, throw, push and ride interactions where appropriate. Do not restore digging or sand piling merely to satisfy an old venue brief. |
| A107 | Vehicles must serve the ball                 | [docs/proposals/vehicles.md:18](../../docs/proposals/vehicles.md#L18)<br>[docs/proposals/boogler-tech-tree.md:41](../../docs/proposals/boogler-tech-tree.md#L41)<br>[docs/proposals/hub-and-minigames.md:99](../../docs/proposals/hub-and-minigames.md#L99)                                                                                                          | 2026-10-29/30                             | retire         | Conflict: DESIGN.md:20-22 explicitly lets rail and vehicles leave physics toys alone.                                                                           | —                                                                                                                                                                                  |
| A108 | Stable, readable, simple vehicles            | [docs/proposals/vehicles.md:7-17](../../docs/proposals/vehicles.md#L7-L17)                                                                                                                                                                                                                                                                                           | 2026-10-29/30 research recommendations    | keep           | Forgiving recovery, clear motion and contextual controls suit optional driving; do not turn the rail train into a precision driving challenge.                  | —                                                                                                                                                                                  |
| A109 | Puff Boost, drift charge and juice           | [docs/proposals/vehicles.md:51-70](../../docs/proposals/vehicles.md#L51-L70)<br>[docs/proposals/boogler-tech-tree.md:125](../../docs/proposals/boogler-tech-tree.md#L125)                                                                                                                                                                                            | 2026-10-29/30 proposal                    | owner call     | The RC soapbox verdict does not approve a friendship-gated boost or these charge numbers; retain only as optional later vehicle ideas.                          | —                                                                                                                                                                                  |
| A110 | Sand-wall shortcuts and wheel ruts           | [docs/proposals/vehicles.md:72-77](../../docs/proposals/vehicles.md#L72-L77)<br>[docs/proposals/vehicles.md:106](../../docs/proposals/vehicles.md#L106)<br>[docs/proposals/boogler-tech-tree.md:132](../../docs/proposals/boogler-tech-tree.md#L132)                                                                                                                 | 2026-10-29/30 proposal                    | retire         | Removed terrain editing cannot be assumed for routes or vehicle traces in the rail world.                                                                       | —                                                                                                                                                                                  |
| A111 | Land yacht and wind skill                    | [docs/proposals/vehicles.md:79-85](../../docs/proposals/vehicles.md#L79-L85)<br>[docs/proposals/boogler-tech-tree.md:126](../../docs/proposals/boogler-tech-tree.md#L126)                                                                                                                                                                                            | 2026-10-29/30 proposal                    | owner call     | Keep parked as an optional vehicle; neither wind simulation nor tacking is needed for automatic rail transport.                                                 | —                                                                                                                                                                                  |
| A112 | Melon pushcart                               | [docs/proposals/vehicles.md:96-98](../../docs/proposals/vehicles.md#L96-L98)<br>[docs/proposals/boogler-tech-tree.md:123](../../docs/proposals/boogler-tech-tree.md#L123)                                                                                                                                                                                            | 2026-10-29/30 proposal                    | owner call     | A co-op cart could be a toy, but it must not recreate mandatory bulk hauling behind connected rail.                                                             | —                                                                                                                                                                                  |
| A113 | Buggy Ball with dug goals                    | [docs/proposals/boogler-tech-tree.md:128](../../docs/proposals/boogler-tech-tree.md#L128)                                                                                                                                                                                                                                                                            | 2026-10-29/30 proposal                    | retire         | The removed sand-goal dependency and ball tie-in do not follow from the accepted RC soapbox.                                                                    | —                                                                                                                                                                                  |
| A114 | Qozon carrying toy                           | [docs/proposals/boogler-tech-tree.md:156](../../docs/proposals/boogler-tech-tree.md#L156)                                                                                                                                                                                                                                                                            | 2026-10-29/30 proposal                    | owner call     | Park the cave pot as optional slapstick; it must never become a two-player rail progression gate.                                                               | —                                                                                                                                                                                  |
| A115 | Coconut Osh joke item                        | [docs/proposals/boogler-tech-tree.md:157](../../docs/proposals/boogler-tech-tree.md#L157)                                                                                                                                                                                                                                                                            | 2026-10-29/30 proposal                    | owner call     | Park new cooking interactions until the rail loop works; existing Boogler food lines remain intact.                                                             | —                                                                                                                                                                                  |
| A116 | Sand-built Tandir and flying bread           | [docs/proposals/boogler-tech-tree.md:158](../../docs/proposals/boogler-tech-tree.md#L158)                                                                                                                                                                                                                                                                            | 2026-10-29/30 proposal                    | retire         | The mechanical recipe depends on removed sand shaping; keep its draft prose as history, not a rail prerequisite.                                                | —                                                                                                                                                                                  |
| A117 | Sumalak Night stirring event                 | [docs/proposals/boogler-tech-tree.md:159](../../docs/proposals/boogler-tech-tree.md#L159)                                                                                                                                                                                                                                                                            | 2026-10-29/30 proposal                    | owner call     | An optional gathering can complement travel; timed attendance rewards and distinct-stirrer requirements need consent, not inheritance.                          | —                                                                                                                                                                                  |
| A118 | Apricot grows over real weeks                | [docs/proposals/boogler-tech-tree.md:160](../../docs/proposals/boogler-tech-tree.md#L160)                                                                                                                                                                                                                                                                            | 2026-10-29/30 proposal                    | retire         | A real-week growth commitment is mismatched to the roughly eight-hour rail arc; preserve the tree's existing lore.                                              | —                                                                                                                                                                                  |
| A119 | Suzani scraps collection                     | [docs/proposals/boogler-tech-tree.md:170](../../docs/proposals/boogler-tech-tree.md#L170)                                                                                                                                                                                                                                                                            | 2026-10-29/30 proposal                    | owner call     | Optional exploration collectibles may decorate rail destinations, but are not an approved new progression system.                                               | —                                                                                                                                                                                  |
| A120 | Pattern stones and daily magic               | [docs/proposals/boogler-tech-tree.md:166-172](../../docs/proposals/boogler-tech-tree.md#L166-L172)<br>[docs/proposals/directions.md:172](../../docs/proposals/directions.md#L172)                                                                                                                                                                                    | 2026-10-29/30 proposal                    | retire         | Daily pattern gates, fruit/water effects and mandatory knowledge belong to the displaced mystery loop.                                                          | —                                                                                                                                                                                  |
| A121 | Blue tile plaza and learned patterns         | [docs/proposals/boogler-tech-tree.md:172-174](../../docs/proposals/boogler-tech-tree.md#L172-L174)                                                                                                                                                                                                                                                                   | 2026-10-29/30 proposal                    | owner call     | Optional decoration could suit growing towns; the pattern-learning unlock and terrain-paint system remain unselected.                                           | —                                                                                                                                                                                  |
| A122 | Pointless joke pages as a principle          | [docs/proposals/boogler-tech-tree.md:42](../../docs/proposals/boogler-tech-tree.md#L42)<br>[docs/proposals/boogler-tech-tree.md:40](../../docs/proposals/boogler-tech-tree.md#L40)                                                                                                                                                                                   | 2026-10-29/30 proposal                    | keep           | Keep room for purposeless humour beside rail progression; this does not require a joke feature in every chapter or authorize changing any lines.                | —                                                                                                                                                                                  |
| A123 | Current ball, bump, impact and rest          | [src/physics/ball.ts:1](../../src/physics/ball.ts#L1)<br>[src/features/bump.ts:1-3](../../src/features/bump.ts#L1-L3)<br>[src/features/impact.ts:1-4](../../src/features/impact.ts#L1-L4)<br>[src/features/ball-rest.ts:1-3](../../src/features/ball-rest.ts#L1-L3)<br>[PLAN.md:51-57](../../PLAN.md#L51-L57)                                                        | Observed at audited commit                | keep           | Keep as optional physics toys; their presence does not require the rail loop to produce new ball interactions or income.                                        | —                                                                                                                                                                                  |
| A124 | Current throwing, hotbar and gifts           | [src/features/hotbar.ts:1-3](../../src/features/hotbar.ts#L1-L3)<br>[src/features/gifts.ts:1-10](../../src/features/gifts.ts#L1-L10)<br>[src/physics/flight.ts:1](../../src/physics/flight.ts#L1)<br>[src/sim/gift-catalog.ts:1](../../src/sim/gift-catalog.ts#L1)<br>[PLAN.md:120-121](../../PLAN.md#L120-L121)                                                     | Observed at audited commit                | keep           | Keep optional throwable objects, frisbee and protected gift lines; the provisional hotbar need not become a resource-management chore.                          | —                                                                                                                                                                                  |
| A125 | Current mushrooms and stall                  | [src/features/mushroom-garden.ts:1-8](../../src/features/mushroom-garden.ts#L1-L8)<br>[src/main.ts:34](../../src/main.ts#L34)<br>[docs/game-design/mushrooms.md:3-19](../../docs/game-design/mushrooms.md#L3-L19)<br>[PLAN.md:96](../../PLAN.md#L96)                                                                                                                 | Observed at audited commit                | keep           | Keep planting, can watering and bouncing as optional toys; no crops, harvest economy or rail gate follows from them.                                            | —                                                                                                                                                                                  |
| A126 | Current fish, gulls and fireflies            | [src/features/critter-fish.ts:1-6](../../src/features/critter-fish.ts#L1-L6)<br>[src/features/critter-gulls.ts:1-4](../../src/features/critter-gulls.ts#L1-L4)<br>[src/features/critter-fireflies.ts:1-3](../../src/features/critter-fireflies.ts#L1-L3)                                                                                                             | Observed at audited commit                | reword         | Make these optional scenery that gives camps, towns and journeys life; do not invent resource or quest obligations.                                             | Fish, gulls and fireflies are optional ambient life. They may react to players and toys, but do not produce resources or gate rail progress.                                       |
| A127 | Current swimming, splashes and movement feel | [src/features/splash.ts:1-3](../../src/features/splash.ts#L1-L3)<br>[src/features/feel.ts:1-11](../../src/features/feel.ts#L1-L11)<br>[src/physics/water-field.ts:1](../../src/physics/water-field.ts#L1)                                                                                                                                                            | Observed at audited commit                | keep           | Keep swimming, ripples, jumps and flops as pleasant traversal and play; a visible sea is not evidence of the removed shared water simulation.                   | —                                                                                                                                                                                  |
| A128 | Wave sound remains pending playtest          | [docs/proposals/boogle-2.md:130](../../docs/proposals/boogle-2.md#L130)                                                                                                                                                                                                                                                                                              | 2026-11-01                                | keep           | Retain the owner's undecided sound verdict without inferring a playable storm-tide system for rail.                                                             | —                                                                                                                                                                                  |
| A129 | Synthesized groove loop cut                  | [docs/proposals/boogle-2.md:131](../../docs/proposals/boogle-2.md#L131)<br>[docs/proposals/boogle-2.md:185](../../docs/proposals/boogle-2.md#L185)                                                                                                                                                                                                                   | 2026-11-01                                | keep           | Keep silence until approved music exists; rail progression does not revive the rejected five-take placeholder.                                                  | —                                                                                                                                                                                  |
| A130 | Rejected mechanical sounds stay silent       | [docs/proposals/boogle-2.md:132](../../docs/proposals/boogle-2.md#L132)<br>[docs/proposals/vertical-slice.md:74-82](../../docs/proposals/vertical-slice.md#L74-L82)                                                                                                                                                                                                  | 2026-11-01                                | keep           | Owner sound audit wins over old whistle/clack/stoke/grind/soapbox/opening-day effects; mechanics can remain while replacement sounds await references.          | —                                                                                                                                                                                  |
| A131 | Accepted interaction sounds                  | [docs/proposals/boogle-2.md:133](../../docs/proposals/boogle-2.md#L133)                                                                                                                                                                                                                                                                                              | 2026-11-01                                | keep           | Prompt, deny, haul count direction, honk, mini-game sounds, hut build, board whoosh and track machine remain feedback; accepted sounds do not revive cut games. | —                                                                                                                                                                                  |
| A132 | Sound tweaks require named references        | [docs/proposals/boogle-2.md:134](../../docs/proposals/boogle-2.md#L134)                                                                                                                                                                                                                                                                                              | 2026-11-01                                | keep           | Retain Fortnite/Ratchet & Clank references and requested subtlety; tune retained interactions without treating their old systems as rail requirements.          | —                                                                                                                                                                                  |
| A133 | Honks make chords automatically              | [docs/proposals/boogle-2.md:135](../../docs/proposals/boogle-2.md#L135)<br>[PLAN.md:137](../../PLAN.md#L137)<br>[src/features/honk.ts:1-4](../../src/features/honk.ts#L1-L4)                                                                                                                                                                                         | 2026-11-01                                | keep           | Automatic harmony makes rail travel social without requiring a three-player progression ritual.                                                                 | —                                                                                                                                                                                  |
| A134 | Coin per Bonk tally                          | [docs/proposals/boogler-tech-tree.md:77](../../docs/proposals/boogler-tech-tree.md#L77)                                                                                                                                                                                                                                                                              | 2026-10-29/30 proposal                    | owner call     | A no-income bonk counter is harmless optional play, but remains unbuilt and unselected; it must not become rail currency.                                       | —                                                                                                                                                                                  |
| A135 | Seashell Consulting arrangement toy          | [docs/proposals/boogler-tech-tree.md:92](../../docs/proposals/boogler-tech-tree.md#L92)                                                                                                                                                                                                                                                                              | 2026-10-29/30 proposal                    | owner call     | Park the self-resetting shell arrangement as optional humour; it is not part of rail construction, and its draft Boogler line stays.                            | —                                                                                                                                                                                  |

### World and islands

| ID   | Call                                             | Source                                                                                                                                                                                                                                                                        | When known                                     | Recommendation | Reason tied to the rail loop                                                                                                                                 | Exact proposed wording                                                                                                                                                                                          |
| ---- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A136 | Home grows, mainland stays final                 | [docs/proposals/boogle-2.md:54-55](../../docs/proposals/boogle-2.md#L54-L55)                                                                                                                                                                                                  | 2026-11-01                                     | keep           | Quoted owner decision retained: the distant port is visible early and walkable late; growth effort belongs to home and other reached towns.                  | —                                                                                                                                                                                                               |
| A137 | Islands independent of mini-games                | [docs/proposals/boogle-2.md:56](../../docs/proposals/boogle-2.md#L56)                                                                                                                                                                                                         | 2026-11-01                                     | keep           | Quoted owner decision retained: places serve varied exploration and the rail network, not one mini-game per island.                                          | —                                                                                                                                                                                                               |
| A138 | Current island and line rejected                 | [docs/proposals/boogle-2.md:66](../../docs/proposals/boogle-2.md#L66)                                                                                                                                                                                                         | 2026-11-01                                     | keep           | Quoted owner verdict overrides any slice or layout brief treating the current court-to-lighthouse route as the target.                                       | —                                                                                                                                                                                                               |
| A139 | Home is a ground-up redesign                     | [docs/proposals/boogle-2.md:67](../../docs/proposals/boogle-2.md#L67)                                                                                                                                                                                                         | 2026-11-01                                     | keep           | Quoted owner decision retained: Big Walk-inspired folds, reveals, traversal unlocks and future land support walking and rail together.                       | —                                                                                                                                                                                                               |
| A140 | Stepping-stone chain with branches and loops     | [docs/proposals/boogle-2.md:68](../../docs/proposals/boogle-2.md#L68)                                                                                                                                                                                                         | 2026-11-01                                     | keep           | Quoted owner direction retained: a legible mainland frontier with shortcuts behind it; ring closure and link order remain open.                              | —                                                                                                                                                                                                               |
| A141 | No empty ring interior                           | [docs/proposals/boogle-2.md:68](../../docs/proposals/boogle-2.md#L68)<br>[docs/proposals/boogle-2.md:74](../../docs/proposals/boogle-2.md#L74)                                                                                                                                | 2026-11-01/02                                  | keep           | Retain the owner's objection to a sparse middle; long crossings do not authorize an empty world between mandatory destinations.                              | —                                                                                                                                                                                                               |
| A142 | Environment previz in real renderer              | [docs/proposals/boogle-2.md:69](../../docs/proposals/boogle-2.md#L69)<br>[docs/proposals/boogle-2.md:170](../../docs/proposals/boogle-2.md#L170)                                                                                                                              | 2026-11-01                                     | keep           | Quoted owner preference retained: high-preset captures at game camera make new rail routes and town visibility assessable.                                   | —                                                                                                                                                                                                               |
| A143 | Wagon is transportation; extra verbs cut         | [docs/proposals/boogle-2.md:70](../../docs/proposals/boogle-2.md#L70)<br>[docs/proposals/boogle-2.md:183](../../docs/proposals/boogle-2.md#L183)                                                                                                                              | 2026-11-01                                     | keep           | Quoted owner verdict retained: snatch, stoke and grind are cut; rail payoff is greater reach, not compulsory ride chores.                                    | —                                                                                                                                                                                                               |
| A144 | Show and bench variants cut                      | [docs/proposals/boogle-2.md:71](../../docs/proposals/boogle-2.md#L71)<br>[docs/proposals/boogle-2.md:207](../../docs/proposals/boogle-2.md#L207)                                                                                                                              | 2026-11-02                                     | reword         | Same-day conflict: the later quoted seat decision at line 76 wins narrowly; show and side-on camera remain cut.                                              | The wagon show and bench variants are retired. The later train-sitting decision restores a safe seated pose on the deck through Interact, not trackside show scenes or a side-on camera.                        |
| A145 | Train sitting returns                            | [docs/proposals/boogle-2.md:76](../../docs/proposals/boogle-2.md#L76)<br>[docs/proposals/vertical-slice.md:81](../../docs/proposals/vertical-slice.md#L81)                                                                                                                    | 2026-11-02                                     | keep           | Quoted owner decision supersedes the earlier bench cut and no-Interact assumption; relaxed travel is part of rail's payoff.                                  | —                                                                                                                                                                                                               |
| A146 | Towns visible from hub and line                  | [docs/proposals/boogle-2.md:73](../../docs/proposals/boogle-2.md#L73)                                                                                                                                                                                                         | 2026-11-02                                     | keep           | Quoted owner decision retained: home and reached towns visibly grow from deliveries; the mainland metropolis remains fixed.                                  | —                                                                                                                                                                                                               |
| A147 | Vast gaps and much faster trains                 | [docs/proposals/boogle-2.md:74](../../docs/proposals/boogle-2.md#L74)                                                                                                                                                                                                         | 2026-11-02                                     | keep           | Quoted owner direction retained as a prototype target; old 200 m islands and 20–45 s rides are starting points only.                                         | —                                                                                                                                                                                                               |
| A148 | Default crossing 1.2 km at 20 m/s                | [docs/proposals/boogle-2.md:75](../../docs/proposals/boogle-2.md#L75)                                                                                                                                                                                                         | 2026-11-02                                     | keep           | Quoted playtest verdict wins over old map scales: about a minute by default; 4 km is novelty and 50 m/s belongs later.                                       | —                                                                                                                                                                                                               |
| A149 | Venue plan dropped                               | [docs/proposals/boogle-2.md:77](../../docs/proposals/boogle-2.md#L77)<br>[docs/proposals/hub-and-minigames.md:34-36](../../docs/proposals/hub-and-minigames.md#L34-L36)<br>[docs/proposals/hub-and-minigames.md:118-120](../../docs/proposals/hub-and-minigames.md#L118-L120) | 2026-11-02                                     | keep           | Quoted owner decision wins: retain useful land, replace the six-venue organising scheme with camps, towns and frontier.                                      | —                                                                                                                                                                                                               |
| A150 | Threefold Reach and Two-Bay Weave                | [docs/proposals/boogle-2.md:78](../../docs/proposals/boogle-2.md#L78)                                                                                                                                                                                                         | 2026-11-02                                     | keep           | Quoted acceptance makes these working picks, not final maps; greybox, distance scaling and visible home town still need validation.                          | —                                                                                                                                                                                                               |
| A151 | Archipelago, varied island sizes, physical links | [docs/proposals/boogle-2.md:80](../../docs/proposals/boogle-2.md#L80)                                                                                                                                                                                                         | 2026-11-01                                     | keep           | Keep the stepping-stone world with walkable/drivable physical connections; home being dense need not mean reusing the small current island.                  | —                                                                                                                                                                                                               |
| A152 | Each new island is an era payoff                 | [docs/proposals/boogle-2.md:80](../../docs/proposals/boogle-2.md#L80)<br>[docs/proposals/island-layout.md:105-112](../../docs/proposals/island-layout.md#L105-L112)                                                                                                           | 2026-11-01                                     | owner call     | Fewer eras and several rail-fed towns may break the one-island-per-era correspondence; retain anticipation, ask before locking the mapping.                  | —                                                                                                                                                                                                               |
| A153 | Ride-only timetabled trains                      | [docs/proposals/boogle-2.md:82](../../docs/proposals/boogle-2.md#L82)                                                                                                                                                                                                         | Owner thread, by 2026-11-01                    | keep           | Automatic trains fit no-routing camp delivery and relaxed transport; technical implementation remains out of scope.                                          | —                                                                                                                                                                                                               |
| A154 | Pole signs at small stops                        | [docs/proposals/boogle-2.md:85](../../docs/proposals/boogle-2.md#L85)                                                                                                                                                                                                         | 2026-11-01                                     | keep           | Quoted owner acceptance retained: minimal signs at small stops, plaque variant dropped; this does not remove contribution credit plaques.                    | —                                                                                                                                                                                                               |
| A155 | Only hubs fast travel                            | [docs/proposals/boogle-2.md:86](../../docs/proposals/boogle-2.md#L86)<br>[docs/proposals/boogle-2.md:184](../../docs/proposals/boogle-2.md#L184)<br>[docs/proposals/hub-and-minigames.md:37](../../docs/proposals/hub-and-minigames.md#L37)                                   | 2026-11-01                                     | keep           | Owner verdict wins over every-stop or every-venue teleport; major hubs get departures boards and minor stops preserve riding's value.                        | —                                                                                                                                                                                                               |
| A156 | Rails from wood age                              | [docs/proposals/boogle-2.md:87](../../docs/proposals/boogle-2.md#L87)<br>[docs/proposals/vertical-slice.md:141-143](../../docs/proposals/vertical-slice.md#L141-L143)                                                                                                         | By 2026-11-01                                  | keep           | Light rails introduce the core loop immediately; no plank-road pre-game or material grind before rail exists.                                                | —                                                                                                                                                                                                               |
| A157 | Rail spike proves riding first                   | [docs/proposals/boogle-2.md:88](../../docs/proposals/boogle-2.md#L88)                                                                                                                                                                                                         | By 2026-11-01                                  | reword         | The riding spike is earlier evidence, not an instruction to restart before today's camp/town experiment.                                                     | Retain riding feel as a requirement. The current experiments test whether rail-fed town growth compounds and whether long crossings reward taking the train.                                                    |
| A158 | First arrival across vast sea, Open 13           | [docs/proposals/boogle-2.md:212](../../docs/proposals/boogle-2.md#L212)                                                                                                                                                                                                       | 2026-11-02                                     | owner call     | Decide whether the rail reaches first or a boat scouts ahead; 'walk it before the rail does' cannot settle a kilometre of sea.                               | —                                                                                                                                                                                                               |
| A159 | Old layout Open 6                                | [docs/proposals/boogle-2.md:204](../../docs/proposals/boogle-2.md#L204)<br>[docs/proposals/island-layout.md:57-89](../../docs/proposals/island-layout.md#L57-L89)                                                                                                             | 2026-11-01; replaced 2026-11-02                | reword         | Conflict: later home redesign and working picks win over the old lab's A/B/C choice.                                                                         | The original island-layout question is superseded by the ground-up home redesign. Threefold Reach and Two-Bay Weave are working picks; greybox validation, town visibility, scale and ring closure remain open. |
| A160 | Lighthouse line recommended                      | [docs/proposals/island-layout.md:57-71](../../docs/proposals/island-layout.md#L57-L71)<br>[docs/proposals/island-layout.md:129-132](../../docs/proposals/island-layout.md#L129-L132)                                                                                          | 2026-11-01                                     | retire         | Conflict: boogle-2.md:66 explicitly rejects lighthouse-line; its research-check score cannot override the owner.                                             | —                                                                                                                                                                                                               |
| A161 | West Cove and East Bay options                   | [docs/proposals/island-layout.md:73-89](../../docs/proposals/island-layout.md#L73-L89)                                                                                                                                                                                        | 2026-11-01                                     | retire         | Retire as active candidates, retain as parked historical options; new home and network picks win.                                                            | —                                                                                                                                                                                                               |
| A162 | Fixed spawn, court and garden                    | [docs/proposals/island-layout.md:31-32](../../docs/proposals/island-layout.md#L31-L32)                                                                                                                                                                                        | 2026-11-01 lab constraint                      | retire         | A safety limit of the old lab is not a design restriction on the ground-up rail home.                                                                        | —                                                                                                                                                                                                               |
| A163 | 25-second home, 150–300 m islands                | [docs/proposals/island-layout.md:37-50](../../docs/proposals/island-layout.md#L37-L50)<br>[docs/proposals/island-layout.md:116-120](../../docs/proposals/island-layout.md#L116-L120)                                                                                          | 2026-11-01 estimates                           | retire         | Conflict: the larger home and accepted 1.2 km crossing win; do not use old measurements as new-world caps.                                                   | —                                                                                                                                                                                                               |
| A164 | Named island-to-era map                          | [docs/proposals/island-layout.md:105-112](../../docs/proposals/island-layout.md#L105-L112)                                                                                                                                                                                    | 2026-11-01 placeholders                        | retire         | Mine Isle, Gary's Yard, Melon Isle, Outer Isles and Flats were placeholders, not approved destinations or required eight-era content.                        | —                                                                                                                                                                                                               |
| A165 | Mainland skyline readable through distance       | [docs/proposals/island-layout.md:121-125](../../docs/proposals/island-layout.md#L121-L125)<br>[docs/proposals/boogle-2.md:54](../../docs/proposals/boogle-2.md#L54)                                                                                                           | 2026-11-01                                     | keep           | A visible destination makes long rail progress legible; the technical fog solution is not decided by this audit.                                             | —                                                                                                                                                                                                               |
| A166 | In-island venues versus elevators                | [docs/proposals/hub-and-minigames.md:21-38](../../docs/proposals/hub-and-minigames.md#L21-L38)<br>[docs/proposals/hub-and-minigames.md:134](../../docs/proposals/hub-and-minigames.md#L134)                                                                                   | 2026-10-30 proposal                            | owner call     | Choose optional mini-game placement in its later pass; the dropped venue plan does not choose room transitions or override hub-only fast travel.             | —                                                                                                                                                                                                               |
| A167 | Tiny nearby islets by raft or sandbar            | [docs/proposals/boogler-tech-tree.md:186-188](../../docs/proposals/boogler-tech-tree.md#L186-L188)<br>[docs/proposals/directions.md:38](../../docs/proposals/directions.md#L38)                                                                                               | 2026-10-29/30 proposal                         | retire         | The main world now uses varied islands and long rail links; tide sandbars/currents and tiny-only islands are not standing travel rules.                      | —                                                                                                                                                                                                               |
| A168 | Current lighthouse and frisbee perch             | [src/pois/lighthouse/index.ts:1-6](../../src/pois/lighthouse/index.ts#L1-L6)<br>[src/pois/lighthouse/index.ts:31-34](../../src/pois/lighthouse/index.ts#L31-L34)<br>[src/features/gifts.ts:1-10](../../src/features/gifts.ts#L1-L10)                                          | Observed at audited commit                     | reword         | Keep as optional landmark and toy stop, without forcing the redesigned home or first line to terminate there.                                                | The lighthouse is an optional lookout and frisbee destination. Preserve its play value while choosing its location from the new rail layout; it is not a mandatory restoration or first-era endpoint.           |
| A169 | Current windmills                                | [src/pois/windmills/index.ts:1-2](../../src/pois/windmills/index.ts#L1-L2)<br>[src/pois/windmills/index.ts:168-180](../../src/pois/windmills/index.ts#L168-L180)                                                                                                              | Observed at audited commit                     | reword         | Make them optional scenery with retained sail bonks; a working windmill model does not approve crop production, power requirements or restoration gates.     | Windmills are optional landmarks and physical toys. Their sails may keep batting toys and players; no rail progress requires fruit, repairs, wind power or a windmill challenge.                                |
| A170 | Current caves, mine, pond and wine cellar        | [src/pois/caves/index.ts:1-11](../../src/pois/caves/index.ts#L1-L11)<br>[src/pois/caves/decor.ts:1](../../src/pois/caves/decor.ts#L1)<br>[src/features/pois.ts:5-10](../../src/features/pois.ts#L5-L10)                                                                       | Observed at audited commit                     | keep           | Keep caves as optional exploration and scenery, consistent with the earlier keep-caves call; a decorative mine is not already a rail resource camp.          | —                                                                                                                                                                                                               |
| A171 | Current court and garden footprint               | [docs/game-design/pois.md:5-7](../../docs/game-design/pois.md#L5-L7)<br>[src/main.ts:29-34](../../src/main.ts#L29-L34)                                                                                                                                                        | Observed at audited commit                     | owner call     | Keep their optional activities available, but question fixed central land allocation: the redesigned home must foreground town, hub and line.                | —                                                                                                                                                                                                               |
| A172 | Moonlit night; no sun/moon faces                 | [docs/proposals/boogle-2.md:145](../../docs/proposals/boogle-2.md#L145)<br>[src/features/day-night.ts:1-5](../../src/features/day-night.ts#L1-L5)                                                                                                                             | 2026-11-01                                     | keep           | Quoted owner decision retained: readable night travel and less cartoon sky faces suit the rail world; no new hazard clock implied.                           | —                                                                                                                                                                                                               |
| A173 | Look is okay now; improve later                  | [docs/proposals/boogle-2.md:139-140](../../docs/proposals/boogle-2.md#L139-L140)                                                                                                                                                                                              | 2026-11-01/02                                  | keep           | Both quoted owner decisions coexist: preserve today's acceptable look while reserving a later beauty pass for the expanding rail world.                      | —                                                                                                                                                                                                               |
| A174 | High preset is the graphics target               | [docs/proposals/boogle-2.md:142](../../docs/proposals/boogle-2.md#L142)<br>[docs/proposals/visual-target.md:11-19](../../docs/proposals/visual-target.md#L11-L19)<br>[docs/proposals/visual-target.md:181-193](../../docs/proposals/visual-target.md#L181-L193)               | 2026-11-01                                     | keep           | Owner selection wins over the earlier ipad-preset recommendation; old estimates remain measurements/estimates, not permission to downgrade rail previz.      | —                                                                                                                                                                                                               |
| A175 | Generated rendered title/loading art             | [docs/proposals/boogle-2.md:141](../../docs/proposals/boogle-2.md#L141)                                                                                                                                                                                                       | 2026-11-01                                     | keep           | Quoted rejection of flat vector/CSS scenes stands; preview candidates in the real screen and use a small animated accent.                                    | —                                                                                                                                                                                                               |
| A176 | UI that answers promoted                         | [docs/proposals/boogle-2.md:143](../../docs/proposals/boogle-2.md#L143)                                                                                                                                                                                                       | 2026-11-01                                     | keep           | Quoted approval stands; responsive prompts and feedback help make rail construction and return changes understandable.                                       | —                                                                                                                                                                                                               |
| A177 | No universal character rim light                 | [docs/proposals/visual-target.md:114](../../docs/proposals/visual-target.md#L114)<br>[docs/proposals/visual-target.md:181-182](../../docs/proposals/visual-target.md#L181-L182)<br>[docs/proposals/boogle-2.md:118](../../docs/proposals/boogle-2.md#L118)                    | 2026-11-01 experiment; 2026-11-02 owner review | reword         | Conflict: the latest Buddy review explicitly says no rim; an older universal rendering recommendation loses.                                                 | Rim lighting is an optional look-lab experiment, not a requirement. Do not apply it to the Buddy; evaluate any other use separately against the current character and world direction.                          |
| A178 | Diorama/toybox as alternate targets              | [docs/proposals/visual-target.md:5-7](../../docs/proposals/visual-target.md#L5-L7)<br>[docs/proposals/visual-target.md:183-184](../../docs/proposals/visual-target.md#L183-L184)                                                                                              | 2026-11-01 experiment                          | reword         | Alternatives remain references, while the owner selected high and wants comparison with the separate character-session toybox.                               | Keep diorama and lab toybox as comparison studies. The current target is high; compare it with the owner's character-session toybox before proposing a replacement.                                             |
| A179 | Grass, detail, sway and readable paths           | [docs/proposals/visual-target.md:98-104](../../docs/proposals/visual-target.md#L98-L104)<br>[docs/proposals/visual-target.md:175-177](../../docs/proposals/visual-target.md#L175-L177)                                                                                        | 2026-11-01 experiment                          | keep           | Retain useful visual observations, especially that grass must not hide pickups, work sites or the railhead; no rendering implementation is prescribed.       | —                                                                                                                                                                                                               |
| A180 | Moonlight and style effects are experiments      | [docs/proposals/visual-target.md:105-116](../../docs/proposals/visual-target.md#L105-L116)<br>[docs/proposals/visual-target.md:164-174](../../docs/proposals/visual-target.md#L164-L174)                                                                                      | 2026-11-01 experiment                          | keep           | Historical judgements about AO, bloom, outlines, plastic and photo-mode tilt are evidence only; new rail settings require their own visual check.            | —                                                                                                                                                                                                               |
| A181 | Do not over-index on iPad                        | [docs/proposals/boogle-2.md:164](../../docs/proposals/boogle-2.md#L164)                                                                                                                                                                                                       | 2026-11-01                                     | keep           | Owner direction retained: desktop and iPad both matter; rail scale and art should not be constrained by speculative device estimates.                        | —                                                                                                                                                                                                               |
| A182 | M4 iPad Pro tentative floor                      | [docs/proposals/boogle-2.md:165](../../docs/proposals/boogle-2.md#L165)                                                                                                                                                                                                       | 2026-11-01                                     | keep           | Keep the quoted owner's 'likely' M4 target as provisional, not confirmed device performance; rail design should not inherit the old 2021 iPad/Android floor. | —                                                                                                                                                                                                               |
| A183 | Phone support, Open 4                            | [docs/proposals/boogle-2.md:202](../../docs/proposals/boogle-2.md#L202)                                                                                                                                                                                                       | Open after 2026-11-01                          | owner call     | Decide whether phones remain supported at lower quality or are dropped; the quoted tentative M4 floor stays kept and does not settle this audience question. | —                                                                                                                                                                                                               |
| A184 | Network closure and link order                   | [docs/proposals/boogle-2.md:68](../../docs/proposals/boogle-2.md#L68)<br>[docs/proposals/boogle-2.md:78](../../docs/proposals/boogle-2.md#L78)                                                                                                                                | Explicitly open 2026-11-01/02                  | owner call     | Choose which branches appear when and whether the chain closes; the director's direct Home-to-port final link is a recommendation, not an owner pick.        | —                                                                                                                                                                                                               |
| A185 | Keep counters out of sight                       | [docs/proposals/boogler-tech-tree.md:43](../../docs/proposals/boogler-tech-tree.md#L43)<br>[docs/game-design/net.md:42](../../docs/game-design/net.md#L42)                                                                                                                    | 2026-10-29/30 proposal; rail prototype current | reword         | Visible rail/town change is useful; a blanket numerical ban could obscure the remaining frontier-haul choice.                                                | Show network progress through cargo, construction and town growth. Use a count only where it helps a player understand a concrete action; do not add a separate score for communal progress.                    |

### Eras

| ID   | Call                                     | Source                                                                                                                                                                                                                                         | When known                                    | Recommendation | Reason tied to the rail loop                                                                                                                                                     | Exact proposed wording                                                                                                                                                                                                       |
| ---- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A186 | Eight named eras as mandatory sequence   | [docs/proposals/boogle-2.md:44-52](../../docs/proposals/boogle-2.md#L44-L52)<br>[docs/research/0.1/SETTLED.md:4](../../docs/research/0.1/SETTLED.md#L4)<br>[docs/proposals/story-and-finale.md:3](../../docs/proposals/story-and-finale.md#L3) | Earlier rounds; superseded 2026-11-02         | reword         | Conflict: the quoted fewer-eras decision at boogle-2.md:43 wins; eight or seven asset suites are no longer commitments.                                                          | Wood, steam, iron/coal, steel/harbour, diesel/concrete, electric, monorail and maglev are historical candidates. Build only the smaller era set the owner selects for the roughly eight-hour rail arc.                       |
| A187 | Which eras remain, Open 14               | [docs/proposals/boogle-2.md:213](../../docs/proposals/boogle-2.md#L213)                                                                                                                                                                        | 2026-11-02                                    | owner call     | Six is a working list, not approved: wood, steam, iron/harbour, diesel/concrete, electric bullet trains, future train; the owner is unsure about diesel despite liking its look. | —                                                                                                                                                                                                                            |
| A188 | Steam early and improving                | [docs/proposals/boogle-2.md:53](../../docs/proposals/boogle-2.md#L53)                                                                                                                                                                          | Earlier rounds; updated 2026-11-02            | keep           | Retain early steam and goofy industrial grime as rail progression identity; train upgrades can show growing capability.                                                          | —                                                                                                                                                                                                                            |
| A189 | Electric need not clear the air          | [docs/proposals/boogle-2.md:53](../../docs/proposals/boogle-2.md#L53)                                                                                                                                                                          | 2026-11-02                                    | keep           | Quoted owner reversal wins over the old pollution-to-clean-electric story; electric rail can change technology without mandatory clean skies.                                    | —                                                                                                                                                                                                                            |
| A190 | Old lines upgrade; heritage loco remains | [docs/proposals/boogle-2.md:57](../../docs/proposals/boogle-2.md#L57)                                                                                                                                                                          | Owner thread, by 2026-11-01                   | keep           | Retained rail visibly compounds rather than becoming disposable; the heritage train preserves history without prescribing eight eras.                                            | —                                                                                                                                                                                                                            |
| A191 | Reclaimed land and rising islands        | [docs/proposals/boogle-2.md:44](../../docs/proposals/boogle-2.md#L44)<br>[docs/proposals/island-layout.md:118-120](../../docs/proposals/island-layout.md#L118-L120)                                                                            | Earlier rounds                                | owner call     | Rail expansion survives, but whether land appears or pre-existing islands become reachable needs a choice consistent with visible distant destinations.                          | —                                                                                                                                                                                                                            |
| A192 | Home late size and monorail city         | [docs/proposals/boogle-2.md:55](../../docs/proposals/boogle-2.md#L55)<br>[docs/proposals/boogle-2.md:78](../../docs/proposals/boogle-2.md#L78)                                                                                                 | 2026-11-01/02, explicitly open                | owner call     | Decide how large home becomes and what its final technology means; keep the mainland fixed and the growing home town visible.                                                    | —                                                                                                                                                                                                                            |
| A193 | Era review waits for level depth         | [docs/proposals/boogle-2.md:176](../../docs/proposals/boogle-2.md#L176)                                                                                                                                                                        | 2026-11-01                                    | keep           | Quoted owner verdict retained: palette swaps alone cannot prove that towns and journeys look meaningfully better at each age.                                                    | —                                                                                                                                                                                                                            |
| A194 | Painted concept plus kits for every era  | [docs/proposals/boogle-2.md:126](../../docs/proposals/boogle-2.md#L126)<br>[docs/proposals/visual-target.md:169-171](../../docs/proposals/visual-target.md#L169-L171)                                                                          | Earlier rounds; later previz rules 2026-11-01 | reword         | Conflict: renderer-led previz and fewer eras win over mandatory painted concepts and eight building/vehicle kits.                                                                | After the retained eras are chosen, prove each one's town, train and landscape in renderer-led previz. Commission only the building and vehicle kits that the rail slice actually needs; painted concepts remain references. |
| A195 | Era palette rows prove progression       | [docs/proposals/visual-target.md:53-55](../../docs/proposals/visual-target.md#L53-L55)<br>[docs/proposals/visual-target.md:214](../../docs/proposals/visual-target.md#L214)                                                                    | 2026-11-01 experiment                         | reword         | The report itself finds palette alone insufficient; rail-fed construction must carry the visible payoff, with no automatic clean-electric row.                                   | Era palette rows are supporting art experiments. Distinct town growth, trains and construction must make each retained era readable; electric does not automatically clear the air.                                          |
| A196 | Wood-age name and camp look              | [docs/proposals/vertical-slice.md:31](../../docs/proposals/vertical-slice.md#L31)<br>[docs/proposals/vertical-slice.md:141](../../docs/proposals/vertical-slice.md#L141)                                                                       | 2026-11-01 round 7                            | keep           | Use 'wood age' in-game; 'castaway camp' describes an old visual direction, not a required narrative or island layout.                                                            | —                                                                                                                                                                                                                            |
| A197 | Era ends at last section and ceremony    | [docs/proposals/vertical-slice.md:33-35](../../docs/proposals/vertical-slice.md#L33-L35)<br>[docs/proposals/vertical-slice.md:64-65](../../docs/proposals/vertical-slice.md#L64-L65)                                                           | 2026-10-31/11-01 proposal                     | owner call     | Decide whether rail reach, town growth or an optional celebration advances an era; the old three-section sequence cannot silently define the new loop.                           | —                                                                                                                                                                                                                            |
| A198 | Steam slice ends before iron sources     | [docs/proposals/vertical-slice.md:55-56](../../docs/proposals/vertical-slice.md#L55-L56)<br>[docs/proposals/vertical-slice.md:133-136](../../docs/proposals/vertical-slice.md#L133-L136)                                                       | 2026-10-31/11-01                              | retire         | Replan slice scope around a complete camp → delivery → town → reach cycle; an era-2 prop swap alone does not prove compounding.                                                  | —                                                                                                                                                                                                                            |

### Characters and story

| ID   | Call                                          | Source                                                                                                                                                                                                                                                                                                                                                                                                                   | When known                                       | Recommendation | Reason tied to the rail loop                                                                                                                                                                  | Exact proposed wording                                                                                                                                                                                                               |
| ---- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A199 | Base before outfits                           | [docs/proposals/boogle-2.md:115](../../docs/proposals/boogle-2.md#L115)<br>[docs/proposals/boogle-2.md:117](../../docs/proposals/boogle-2.md#L117)                                                                                                                                                                                                                                                                       | 2026-11-01/02                                    | keep           | Retain a settled bare body and modular head/body/hands/feet wear; optional looks must not distract from readable rail movement.                                                               | —                                                                                                                                                                                                                                    |
| A200 | Direct mannequin controls and hand-made clips | [docs/proposals/boogle-2.md:116](../../docs/proposals/boogle-2.md#L116)                                                                                                                                                                                                                                                                                                                                                  | 2026-11-02                                       | keep           | Quoted owner enthusiasm wins: direct control, closer camera and humanoid clips are the accepted movement direction; polish/appearance remain.                                                 | —                                                                                                                                                                                                                                    |
| A201 | Buddy is current player direction             | [docs/proposals/boogle-2.md:119](../../docs/proposals/boogle-2.md#L119)                                                                                                                                                                                                                                                                                                                                                  | 2026-11-02                                       | keep           | Quoted 'liking this a lot' and the explicit supersession of Tracklayer customization make Buddy the working rail-world avatar; no final-art claim.                                            | —                                                                                                                                                                                                                                    |
| A202 | Buddy gaze, shoulders and conductor hat       | [docs/proposals/boogle-2.md:118](../../docs/proposals/boogle-2.md#L118)                                                                                                                                                                                                                                                                                                                                                  | 2026-11-02                                       | keep           | Retain no rim, forward idle gaze, soft shoulders and straight brass-trim conductor cap; readable railway identity matches the loop.                                                           | —                                                                                                                                                                                                                                    |
| A203 | Tracklayer is the player                      | [docs/proposals/boogle-2.md:120](../../docs/proposals/boogle-2.md#L120)                                                                                                                                                                                                                                                                                                                                                  | 2026-11-02; displaced within the same record     | reword         | Explicit conflict: the Buddy entry at line 119 wins as current direction and makes Tracklayer's role open; do not restart its customization rationale.                                        | The Tracklayer remains a fixed character design. The Buddy is the current player direction; whether the Tracklayer is an alternate player or a separate character remains an owner decision. Preserve the chosen name and reference. |
| A204 | Character-look track, Open 7                  | [docs/proposals/boogle-2.md:205](../../docs/proposals/boogle-2.md#L205)                                                                                                                                                                                                                                                                                                                                                  | Proposed 2026-11-01; advanced 2026-11-02         | reword         | Buddy and mannequin decisions supersede the yes/no question about starting a player track; Boogler redesign is still not selected.                                                            | The player look track is underway with the Buddy on the accepted mannequin clips. Keep prototypes separate from claims about the base game. The Boogler's new model and the Tracklayer's role still need explicit choices.           |
| A205 | Boogler becomes mayor in era 2                | [docs/proposals/boogle-2.md:121](../../docs/proposals/boogle-2.md#L121)<br>[docs/proposals/vertical-slice.md:99-103](../../docs/proposals/vertical-slice.md#L99-L103)<br>[docs/proposals/story-and-finale.md:12](../../docs/proposals/story-and-finale.md#L12)                                                                                                                                                           | Earlier rounds, recorded by 2026-11-01           | owner call     | Decide whether a mayor adds to visible town growth after the rail loop works; the personal friendship ladder stays separate and copy stays untouched.                                         | —                                                                                                                                                                                                                                    |
| A206 | Opening days end every era                    | [docs/proposals/boogle-2.md:122-125](../../docs/proposals/boogle-2.md#L122-L125)<br>[docs/proposals/vertical-slice.md:88-97](../../docs/proposals/vertical-slice.md#L88-L97)<br>[docs/proposals/story-and-finale.md:17-23](../../docs/proposals/story-and-finale.md#L17-L23)                                                                                                                                             | Earlier rounds, recorded by 2026-11-01           | owner call     | Decide whether celebrations are optional or progression gates; town growth should not secretly depend on a scripted mayor ceremony.                                                           | —                                                                                                                                                                                                                                    |
| A207 | Any player may start a ceremony               | [docs/proposals/vertical-slice.md:90](../../docs/proposals/vertical-slice.md#L90)<br>[docs/proposals/vertical-slice.md:142](../../docs/proposals/vertical-slice.md#L142)<br>[docs/proposals/boogle-2.md:123](../../docs/proposals/boogle-2.md#L123)                                                                                                                                                                      | 2026-11-01 round 7                               | keep           | If opening days survive, retain solo initiation and no head count; rail progress must never wait for a full group.                                                                            | —                                                                                                                                                                                                                                    |
| A208 | Shared scene, physics comedy                  | [docs/proposals/boogle-2.md:124-125](../../docs/proposals/boogle-2.md#L124-L125)<br>[docs/proposals/vertical-slice.md:91-92](../../docs/proposals/vertical-slice.md#L91-L92)                                                                                                                                                                                                                                             | By 2026-11-01                                    | keep           | If ceremonies survive, a shared readable event with incidental slapstick fits the rail world; this does not approve the old script or timing.                                                 | —                                                                                                                                                                                                                                    |
| A209 | Gathering call and bell, Open 1               | [docs/proposals/boogle-2.md:199](../../docs/proposals/boogle-2.md#L199)<br>[docs/proposals/vertical-slice.md:49-54](../../docs/proposals/vertical-slice.md#L49-L54)                                                                                                                                                                                                                                                      | Open; research suggestion by 2026-11-01          | owner call     | Choose whether opening days survive before choosing 45-second gathering, 10-second bell or 40-second scene; sound cuts at boogle-2.md:132 still apply.                                        | —                                                                                                                                                                                                                                    |
| A210 | Mundane stakes, absurd causes                 | [docs/proposals/story-and-finale.md:9-12](../../docs/proposals/story-and-finale.md#L9-L12)                                                                                                                                                                                                                                                                                                                               | 2026-10-30 proposal                              | keep           | Ordinary town growth and player/Boogler comedy fit the rail premise without a save-the-world narrative obligation.                                                                            | —                                                                                                                                                                                                                                    |
| A211 | Moments first, systems second                 | [docs/proposals/story-and-finale.md:13](../../docs/proposals/story-and-finale.md#L13)                                                                                                                                                                                                                                                                                                                                    | 2026-10-30 proposal                              | reword         | Conflict: mechanics-before-narrative at boogle-2.md:28 wins; comedy should emerge from the rail loop, not dictate its systems.                                                                | Once the rail loop works, draft funny moments around its construction, arrivals and town changes. Add story-specific mechanics only when they improve that play.                                                                     |
| A212 | Music narrates eras and ceremonies            | [docs/proposals/story-and-finale.md:20-25](../../docs/proposals/story-and-finale.md#L20-L25)                                                                                                                                                                                                                                                                                                                             | 2026-10-30 proposal                              | owner call     | Adaptive music remains an option; the owner's later sound audit cuts placeholder groove and ceremony sounds, so no soundtrack is approved by this brief.                                      | —                                                                                                                                                                                                                                    |
| A213 | Escalating mayor speeches                     | [docs/proposals/story-and-finale.md:33](../../docs/proposals/story-and-finale.md#L33)<br>[docs/proposals/vertical-slice.md:124](../../docs/proposals/vertical-slice.md#L124)                                                                                                                                                                                                                                             | 2026-10-30/11-01 proposal                        | owner call     | Park long speeches and three-honk interruption until mayor/era structure is chosen; rail travel should not wait on an eight-era gag schedule.                                                 | —                                                                                                                                                                                                                                    |
| A214 | Always just missing Gary                      | [docs/proposals/story-and-finale.md:34](../../docs/proposals/story-and-finale.md#L34)<br>[docs/proposals/vertical-slice.md:121-122](../../docs/proposals/vertical-slice.md#L121-L122)                                                                                                                                                                                                                                    | 2026-10-30/11-01 proposal                        | owner call     | Park new cameo beats for rail destinations; existing Gary gift lines survive regardless of the selected finale.                                                                               | —                                                                                                                                                                                                                                    |
| A215 | Fourth-melon clues each era                   | [docs/proposals/story-and-finale.md:35](../../docs/proposals/story-and-finale.md#L35)<br>[docs/proposals/fourth-melon.md:24-35](../../docs/proposals/fourth-melon.md#L24-L35)<br>[docs/proposals/boogler-tech-tree.md:175](../../docs/proposals/boogler-tech-tree.md#L175)                                                                                                                                               | 2026-10-30/11-01 proposal                        | owner call     | Clues may reward optional exploration, but fewer eras and parked narrative mean no mandatory per-era reveal schedule.                                                                         | —                                                                                                                                                                                                                                    |
| A216 | Coconut mail evolves by era                   | [docs/proposals/story-and-finale.md:36](../../docs/proposals/story-and-finale.md#L36)<br>[docs/proposals/vertical-slice.md:123](../../docs/proposals/vertical-slice.md#L123)                                                                                                                                                                                                                                             | 2026-10-30/11-01 proposal                        | owner call     | Rail-delivered correspondence could fit later; coconut-to-maglev escalation and Oyijon's new replies remain collaborators' choices.                                                           | —                                                                                                                                                                                                                                    |
| A217 | Town hall from crate to dome                  | [docs/proposals/story-and-finale.md:37](../../docs/proposals/story-and-finale.md#L37)                                                                                                                                                                                                                                                                                                                                    | 2026-10-30 proposal                              | owner call     | A persistent visual callback could enrich rail-fed town growth, but the mayor and eight-stage prop sequence are unapproved.                                                                   | —                                                                                                                                                                                                                                    |
| A218 | Fourth melon parked                           | [docs/proposals/boogle-2.md:193](../../docs/proposals/boogle-2.md#L193)<br>[docs/proposals/fourth-melon.md:3](../../docs/proposals/fourth-melon.md#L3)                                                                                                                                                                                                                                                                   | 2026-11-01                                       | keep           | Keep reveal and new melon story choices with collaborators; parked status does not authorize changing existing lines for the rail revision.                                                   | —                                                                                                                                                                                                                                    |
| A219 | Fourth-melon reveal A: plain balancing        | [docs/proposals/fourth-melon.md:41-46](../../docs/proposals/fourth-melon.md#L41-L46)                                                                                                                                                                                                                                                                                                                                     | 2026-11-01 draft                                 | owner call     | A warm anticlimax is a parked writing option, not a rail milestone or selected ending.                                                                                                        | —                                                                                                                                                                                                                                    |
| A220 | Fourth-melon reveal B: Boogler as baby        | [docs/proposals/fourth-melon.md:48-53](../../docs/proposals/fourth-melon.md#L48-L53)                                                                                                                                                                                                                                                                                                                                     | 2026-11-01 draft                                 | owner call     | The family reveal remains unchosen; do not make character art or rail destination requirements from it.                                                                                       | —                                                                                                                                                                                                                                    |
| A221 | Fourth-melon reveal C: friends carry it       | [docs/proposals/fourth-melon.md:55-60](../../docs/proposals/fourth-melon.md#L55-L60)                                                                                                                                                                                                                                                                                                                                     | 2026-11-01 draft                                 | owner call     | Cooperation can fit rail building, but the manual-haul moral no longer defines the game; collaborators choose the joke.                                                                       | —                                                                                                                                                                                                                                    |
| A222 | Melon replacement rewrites existing copy      | [docs/proposals/fourth-melon.md:64-70](../../docs/proposals/fourth-melon.md#L64-L70)<br>[docs/proposals/fourth-melon.md:77](../../docs/proposals/fourth-melon.md#L77)<br>[AGENTS.md:12](../../AGENTS.md#L12)                                                                                                                                                                                                             | 2026-11-01 proposal; standing protection current | retire         | Retire this as cleanup authorization: AGENTS.md and the task win. Existing mom0, melon backstory and gift lines are out of scope, not candidates to trim.                                     | —                                                                                                                                                                                                                                    |
| A223 | Reveal place and clue medium                  | [docs/proposals/fourth-melon.md:74-76](../../docs/proposals/fourth-melon.md#L74-L76)                                                                                                                                                                                                                                                                                                                                     | 2026-11-01 open questions                        | owner call     | Choose later whether a gag pays off at the mainland or earlier and through props, letters or both; it cannot prescribe rail gating now.                                                       | —                                                                                                                                                                                                                                    |
| A224 | Ending remains open and parked                | [docs/proposals/boogle-2.md:60](../../docs/proposals/boogle-2.md#L60)<br>[docs/proposals/boogle-2.md:194](../../docs/proposals/boogle-2.md#L194)<br>[docs/proposals/story-and-finale.md:96](../../docs/proposals/story-and-finale.md#L96)                                                                                                                                                                                | By 2026-11-01                                    | keep           | The rail loop may promise a mainland destination without selecting a finale or reopening parked writing work.                                                                                 | —                                                                                                                                                                                                                                    |
| A225 | Grand Parade finale                           | [docs/proposals/story-and-finale.md:63-70](../../docs/proposals/story-and-finale.md#L63-L70)                                                                                                                                                                                                                                                                                                                             | 2026-10-30 proposal                              | owner call     | Trains can celebrate the built network, but the Grand Loop, driver roles and eight train sets are unchosen and partly conflict with ride-only trains.                                         | —                                                                                                                                                                                                                                    |
| A226 | Last train to mainland finale                 | [docs/proposals/story-and-finale.md:72-77](../../docs/proposals/story-and-finale.md#L72-L77)                                                                                                                                                                                                                                                                                                                             | 2026-10-30 proposal                              | owner call     | Best direct fit to the current destination, but Oyijon, four melons, dinner and save-reactive praise remain parked choices.                                                                   | —                                                                                                                                                                                                                                    |
| A227 | Melon moon launch finale                      | [docs/proposals/story-and-finale.md:79-86](../../docs/proposals/story-and-finale.md#L79-L86)                                                                                                                                                                                                                                                                                                                             | 2026-10-30 proposal                              | owner call     | Optional epilogue only if chosen; mixed-play cargo and a new moon must not replace rail-fed growth or override the newer sky direction.                                                       | —                                                                                                                                                                                                                                    |
| A228 | Finale calendar vote and attendance           | [docs/proposals/story-and-finale.md:58-61](../../docs/proposals/story-and-finale.md#L58-L61)<br>[docs/proposals/story-and-finale.md:98](../../docs/proposals/story-and-finale.md#L98)                                                                                                                                                                                                                                    | 2026-10-30 proposal                              | owner call     | Multi-day scheduling conflicts with drop-in eight-hour play if it gates progress; prefer a later decision about voluntary gatherings and replays.                                             | —                                                                                                                                                                                                                                    |
| A229 | Absent friends represented; replay later      | [docs/proposals/story-and-finale.md:61](../../docs/proposals/story-and-finale.md#L61)<br>[docs/proposals/story-and-finale.md:70](../../docs/proposals/story-and-finale.md#L70)<br>[docs/proposals/story-and-finale.md:77-84](../../docs/proposals/story-and-finale.md#L77-L84)                                                                                                                                           | 2026-10-30 proposal                              | keep           | As a conditional finale requirement, echoes and traces let rail collaborators miss a session without losing the payoff.                                                                       | —                                                                                                                                                                                                                                    |
| A230 | Finale reacts to each friend's history        | [docs/proposals/story-and-finale.md:67](../../docs/proposals/story-and-finale.md#L67)<br>[docs/proposals/story-and-finale.md:99](../../docs/proposals/story-and-finale.md#L99)                                                                                                                                                                                                                                           | 2026-10-30 proposal                              | owner call     | Decide whether the narrative needs delivered colours, hats or knacks; no unchosen reward ledger should drive rail implementation now.                                                         | —                                                                                                                                                                                                                                    |
| A231 | Book ending: leave and return with Oyijon     | [docs/proposals/boogler-tech-tree.md:197](../../docs/proposals/boogler-tech-tree.md#L197)                                                                                                                                                                                                                                                                                                                                | 2026-10-29/30 proposal                           | owner call     | Park this older option; removing Boogler for real days is not implied by an eight-hour rail arc.                                                                                              | —                                                                                                                                                                                                                                    |
| A232 | Book ending: island is a blob                 | [docs/proposals/boogler-tech-tree.md:198](../../docs/proposals/boogler-tech-tree.md#L198)                                                                                                                                                                                                                                                                                                                                | 2026-10-29/30 proposal                           | retire         | Steering the whole island toward Uzbekistan is an alternative world model, not the selected fixed archipelago and mainland rail goal.                                                         | —                                                                                                                                                                                                                                    |
| A233 | Book ending: bring Samarqand here             | [docs/proposals/boogler-tech-tree.md:199](../../docs/proposals/boogler-tech-tree.md#L199)                                                                                                                                                                                                                                                                                                                                | 2026-10-29/30 proposal                           | owner call     | Keep as parked story inspiration for growing towns, not an approved replacement for reaching the mainland.                                                                                    | —                                                                                                                                                                                                                                    |
| A234 | No petting Boogler                            | [docs/proposals/boogle-2.md:151](../../docs/proposals/boogle-2.md#L151)<br>[PLAN.md:117](../../PLAN.md#L117)                                                                                                                                                                                                                                                                                                             | 2026-11-01                                       | keep           | Quoted owner decision wins over PLAN's pet-for-friendship description; retained friendship should remain respectful optional play.                                                            | —                                                                                                                                                                                                                                    |
| A235 | Current Boogler friendship, talk and launches | [src/features/boogler.ts:1-18](../../src/features/boogler.ts#L1-L18)<br>[src/boogler/play.ts:299-320](../../src/boogler/play.ts#L299-L320)<br>[src/boogler/friendship.ts:1](../../src/boogler/friendship.ts#L1)<br>[src/boogler/talk.ts:119](../../src/boogler/talk.ts#L119)<br>[docs/proposals/boogler-tech-tree.md:23](../../docs/proposals/boogler-tech-tree.md#L23)<br>[PLAN.md:118-119](../../PLAN.md#L118-L119)    | Observed at audited commit                       | keep           | Keep him and his personal relationship as optional character play; mayor status and an economic tech tree are not established by the code.                                                    | —                                                                                                                                                                                                                                    |
| A236 | Current dino and guest                        | [src/features/dino.ts:1-9](../../src/features/dino.ts#L1-L9)<br>[docs/game-design/dino-and-guest.md:3-25](../../docs/game-design/dino-and-guest.md#L3-L25)                                                                                                                                                                                                                                                               | Observed at audited commit                       | owner call     | Question how the optional guest's full movement coexists with Buddy and later movement unlocks; keep the dino as optional scenery pending that choice, with no renaming or ROM-data proposal. | —                                                                                                                                                                                                                                    |
| A237 | Existing Boogler narrative references         | [src/boogler/lines.ts:317-330](../../src/boogler/lines.ts#L317-L330)<br>[src/boogler/lines.ts:677](../../src/boogler/lines.ts#L677)<br>[src/boogler/lines.ts:695](../../src/boogler/lines.ts#L695)<br>[src/boogler/lines.ts:832](../../src/boogler/lines.ts#L832)<br>[src/sim/gift-catalog.ts:1](../../src/sim/gift-catalog.ts#L1)<br>[docs/proposals/fourth-melon.md:7-20](../../docs/proposals/fourth-melon.md#L7-L20) | Observed at audited commit                       | keep           | Fourth melon, book, ball insurance and boat ambitions are protected character copy, not implementation instructions for the rail economy.                                                     | —                                                                                                                                                                                                                                    |
| A238 | Boogler narrates every progression page       | [docs/proposals/boogler-tech-tree.md:18](../../docs/proposals/boogler-tech-tree.md#L18)                                                                                                                                                                                                                                                                                                                                  | 2026-10-29/30 proposal                           | owner call     | Park new narration until the rail loop works; the existing character voice stays, but each connection need not require a book chapter or speech.                                              | —                                                                                                                                                                                                                                    |
| A239 | The ending is already written in the lore     | [docs/proposals/boogler-tech-tree.md:19](../../docs/proposals/boogler-tech-tree.md#L19)                                                                                                                                                                                                                                                                                                                                  | 2026-10-29/30 proposal                           | retire         | Conflict: boogle-2.md:60,194 explicitly leave the finale open; existing boat and Oyijon lines are aspirations, not binding rail-ending requirements.                                          | —                                                                                                                                                                                                                                    |

### Rewards

| ID   | Call                                        | Source                                                                                                                                                                                                                                                          | When known                          | Recommendation | Reason tied to the rail loop                                                                                                                                       | Exact proposed wording |
| ---- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| A240 | Communal network, personal earnings         | [DESIGN.md:36-37](../../DESIGN.md#L36-L37)<br>[docs/proposals/boogle-2.md:102-105](../../docs/proposals/boogle-2.md#L102-L105)<br>[docs/game-design.md:40](../../docs/game-design.md#L40)                                                                       | Current principle                   | keep           | Rail and town progress belong to the room; earned looks belong to the player, with no shared spendable wallet.                                                     | —                      |
| A241 | Som personal cosmetic coin                  | [docs/proposals/boogle-2.md:104](../../docs/proposals/boogle-2.md#L104)<br>[docs/proposals/hub-and-minigames.md:70](../../docs/proposals/hub-and-minigames.md#L70)<br>[docs/proposals/hub-and-minigames.md:135](../../docs/proposals/hub-and-minigames.md#L135) | Earlier rounds; named by 2026-11-01 | owner call     | Decide whether som is still needed alongside rail progression; if retained it buys looks only, never rail access, and the old naming question is already answered. | —                      |
| A242 | Knacks per activity                         | [docs/proposals/boogle-2.md:105](../../docs/proposals/boogle-2.md#L105)<br>[docs/proposals/hub-and-minigames.md:68](../../docs/proposals/hub-and-minigames.md#L68)<br>[docs/proposals/hub-and-minigames.md:74](../../docs/proposals/hub-and-minigames.md#L74)   | Earlier rounds, by 2026-11-01       | owner call     | Options-not-power remains a useful limit, but per-activity levels and a 1.07–1.15 cost curve are not required for the rail loop.                                   | —                      |
| A243 | Mini-games pay personal rewards only        | [docs/proposals/boogle-2.md:100](../../docs/proposals/boogle-2.md#L100)<br>[docs/proposals/vertical-slice.md:140](../../docs/proposals/vertical-slice.md#L140)<br>[docs/proposals/progression-paths.md:12](../../docs/proposals/progression-paths.md#L12)       | 2026-11-01 round 7                  | keep           | Keep the no-prize-piles slice decision; the old occasional-progress bonus conflicts with unresolved 'play is the material' and must not bypass rail supply.        | —                      |
| A244 | Earned cosmetics, no real-money shop        | [docs/proposals/hub-and-minigames.md:66](../../docs/proposals/hub-and-minigames.md#L66)<br>[PLAN.md:101](../../PLAN.md#L101)                                                                                                                                    | 2026-10-30 proposal                 | keep           | Optional hats, colours and vehicle looks can reward play without monetizing or gating the rail network; no catalog is approved.                                    | —                      |
| A245 | Personal beach hut and furnishing           | [docs/proposals/hub-and-minigames.md:67](../../docs/proposals/hub-and-minigames.md#L67)<br>[docs/proposals/hub-and-minigames.md:75](../../docs/proposals/hub-and-minigames.md#L75)                                                                              | 2026-10-30 proposal                 | owner call     | An online-only personal hut and idle coconut press compete for land and attention with growing communal towns; they are not current commitments.                   | —                      |
| A246 | Matching hats for repeat partners           | [docs/proposals/hub-and-minigames.md:69](../../docs/proposals/hub-and-minigames.md#L69)<br>[docs/proposals/hub-and-minigames.md:136](../../docs/proposals/hub-and-minigames.md#L136)                                                                            | 2026-10-30 proposal                 | owner call     | Choose whether repeated-pair rewards create attendance pressure; rail cooperation already benefits everyone without tracking friendships.                          | —                      |
| A247 | No daily quests or absence penalties        | [docs/proposals/hub-and-minigames.md:76](../../docs/proposals/hub-and-minigames.md#L76)<br>[docs/proposals/boogler-tech-tree.md:27](../../docs/proposals/boogler-tech-tree.md#L27)                                                                              | 2026-10-29/30 proposal              | keep           | Returning to improved rail and towns should feel welcoming, not like recovering missed chores or lost progress.                                                    | —                      |
| A248 | Party attendance earns exclusive items      | [docs/proposals/hub-and-minigames.md:90-92](../../docs/proposals/hub-and-minigames.md#L90-L92)                                                                                                                                                                  | 2026-10-30 proposal                 | owner call     | Optional gatherings and unstaffed play props can fit; exclusive attendance items need a decision compatible with drop-in play and absent rail builders.            | —                      |
| A249 | Party donations fund Gary's boat            | [docs/proposals/hub-and-minigames.md:93](../../docs/proposals/hub-and-minigames.md#L93)<br>[docs/proposals/hub-and-minigames.md:115](../../docs/proposals/hub-and-minigames.md#L115)                                                                            | 2026-10-30 proposal                 | retire         | A som-fed communal Boat Fund conflicts with the personal-looks-only economy and replaces rail as the shared progression thread.                                    | —                      |
| A250 | Rotating Emporium shop                      | [docs/proposals/hub-and-minigames.md:115](../../docs/proposals/hub-and-minigames.md#L115)                                                                                                                                                                       | 2026-10-30 proposal                 | owner call     | A cosmetic shop is optional if som survives; rotating stock must not become a return timer or rail gate.                                                           | —                      |
| A251 | Book becomes mini-game stamp book           | [docs/proposals/hub-and-minigames.md:116](../../docs/proposals/hub-and-minigames.md#L116)                                                                                                                                                                       | 2026-10-30 proposal                 | owner call     | Park optional collection rather than promoting an unchosen activity ledger to the new rail brief.                                                                  | —                      |
| A252 | Partner card grants cosmetics               | [docs/proposals/boogler-tech-tree.md:35](../../docs/proposals/boogler-tech-tree.md#L35)                                                                                                                                                                         | 2026-10-29/30 proposal              | owner call     | Decide whether construction credit earns personal looks; a 45-page restoration card is not implied by communal rail progress.                                      | —                      |
| A253 | Boat Fund is not a shared wallet loophole   | [docs/proposals/boogler-tech-tree.md:36](../../docs/proposals/boogler-tech-tree.md#L36)<br>[docs/proposals/boogler-tech-tree.md:94-112](../../docs/proposals/boogler-tech-tree.md#L94-L112)                                                                     | 2026-10-29/30 proposal              | retire         | Having an NPC spend the pot still creates a competing economy; rail deliveries now grow the world, with existing money-related lines preserved.                    | —                      |
| A254 | Stall built from driftwood and a regular    | [docs/proposals/boogler-tech-tree.md:86](../../docs/proposals/boogler-tech-tree.md#L86)                                                                                                                                                                         | 2026-10-29/30 proposal              | retire         | Retire this book-page gate; rail-fed town construction replaces a prescribed 10-driftwood stall project, while its draft line stays intact.                        | —                      |
| A255 | Boat Fund 15% curve and visitor multipliers | [docs/proposals/boogler-tech-tree.md:96-100](../../docs/proposals/boogler-tech-tree.md#L96-L100)                                                                                                                                                                | 2026-10-29/30 tuning guesses        | retire         | Exponential purchases, daily visitor rates and a 12-hour cap are unselected idle-economy rules, not rail-town tuning.                                              | —                      |
| A256 | Ball Insurance pays coins                   | [docs/proposals/boogler-tech-tree.md:111](../../docs/proposals/boogler-tech-tree.md#L111)                                                                                                                                                                       | 2026-10-29/30 proposal              | retire         | Conflict: DESIGN.md:22 and boogle-2.md:111 prohibit ball income; keep the existing Ball Insurance dialogue untouched.                                              | —                      |
| A257 | Pattern skins and doppi embroidery          | [docs/proposals/boogler-tech-tree.md:174](../../docs/proposals/boogler-tech-tree.md#L174)                                                                                                                                                                       | 2026-10-29/30 proposal              | owner call     | Optional personal patterns fit, but the discarded pattern puzzle should not automatically become their unlock method.                                              | —                      |
| A258 | No sponsor plaques                          | [docs/proposals/boogle-2.md:106](../../docs/proposals/boogle-2.md#L106)                                                                                                                                                                                         | Owner thread, by 2026-11-01         | keep           | Rail work may receive positive credit; nobody buys naming rights or ownership of the communal line.                                                                | —                      |
| A259 | Contribution tiers grant personal upgrades  | [docs/research/0.1/SETTLED.md:17](../../docs/research/0.1/SETTLED.md#L17)<br>[docs/proposals/vertical-slice.md:39](../../docs/proposals/vertical-slice.md#L39)                                                                                                  | By 2026-10-31                       | owner call     | Tiers are retained data only, while towns now grant reach upgrades; decide whether any tier reward remains and keep it from gating the shared network.             | —                      |
| A260 | No contribution label on players            | [docs/proposals/boogle-2.md:153](../../docs/proposals/boogle-2.md#L153)<br>[src/features/haul-stack.ts:1-3](../../src/features/haul-stack.ts#L1-L3)                                                                                                             | 2026-11-01                          | keep           | Quoted owner rejection of 'Porter' wins; no visible work rank or moral score belongs on a drop-in rail builder.                                                    | —                      |
| A261 | Top-four credit plaques                     | [docs/game-design/haul.md:60-65](../../docs/game-design/haul.md#L60-L65)<br>[docs/research/0.1/SETTLED.md:23](../../docs/research/0.1/SETTLED.md#L23)                                                                                                           | Source-described current testbed    | owner call     | Current top-four ordering can still read as ranking despite positive-only intent; decide how rail contributions are thanked without shaming non-builders.          | —                      |
| A262 | Soapbox completion awards era hat           | [docs/proposals/vertical-slice.md:119](../../docs/proposals/vertical-slice.md#L119)                                                                                                                                                                             | 2026-10-31/11-01 proposal           | owner call     | A cosmetic hat can remain optional, but do not bind the new rail slice to a race or assume straw/brass-goggle rewards were playtested.                             | —                      |
| A263 | Post-finale open toy box                    | [docs/proposals/boogle-2.md:59](../../docs/proposals/boogle-2.md#L59)<br>[docs/proposals/story-and-finale.md:91](../../docs/proposals/story-and-finale.md#L91)                                                                                                  | By 2026-11-01                       | keep           | Built rail, towns and toys remain enjoyable after the finite arc; this does not mandate one operational train for every discarded era.                             | —                      |
| A264 | Completion museum of us                     | [docs/proposals/story-and-finale.md:92](../../docs/proposals/story-and-finale.md#L92)                                                                                                                                                                           | 2026-10-30 proposal                 | owner call     | A no-ranking history display could celebrate shared rail, but all-project completion and recorded best moments are not selected requirements.                      | —                      |
| A265 | Gifts converted into Boat Fund coins        | [docs/proposals/boogler-tech-tree.md:87](../../docs/proposals/boogler-tech-tree.md#L87)                                                                                                                                                                         | 2026-10-29/30 proposal              | retire         | Automatic camp goods replace gift conversion as the shared economy; retain the existing Pricing joke and gift lines.                                               | —                      |
| A266 | Signage requires paint and two regulars     | [docs/proposals/boogler-tech-tree.md:88](../../docs/proposals/boogler-tech-tree.md#L88)                                                                                                                                                                         | 2026-10-29/30 proposal              | retire         | A material-and-attendance gate for a shop sign does not serve rail reach; preserve positive credit and the draft line without inheriting its recipe.               | —                      |
| A267 | Passive income after three regulars         | [docs/proposals/boogler-tech-tree.md:90](../../docs/proposals/boogler-tech-tree.md#L90)                                                                                                                                                                         | 2026-10-29/30 proposal              | retire         | Rail connections, not a visitor-count gate, should start automatic supply; the Passive Income joke remains protected text.                                         | —                      |
| A268 | Raft turns into hat joke                    | [docs/proposals/boogler-tech-tree.md:122](../../docs/proposals/boogler-tech-tree.md#L122)                                                                                                                                                                       | 2026-10-29/30 proposal              | owner call     | A harmless personal hat is a parked option; it neither chooses how to cross the sea nor commits a rail slice to crafting.                                          | —                      |

### Co-op

| ID   | Call                                        | Source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | When known                                            | Recommendation | Reason tied to the rail loop                                                                                                                         | Exact proposed wording                                                                                                                                                               |
| ---- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A269 | Automatic cooperation                       | [DESIGN.md:28-30](../../DESIGN.md#L28-L30)<br>[docs/game-design.md:38](../../docs/game-design.md#L38)                                                                                                                                                                                                                                                                                                                                                                                                              | Current principle                                     | keep           | Any useful connection helps everyone; different-player bonuses may encourage company but must not become attendance gates.                           | —                                                                                                                                                                                    |
| A270 | Protect other players' progress             | [DESIGN.md:32-34](../../DESIGN.md#L32-L34)<br>[docs/game-design.md:39](../../docs/game-design.md#L39)                                                                                                                                                                                                                                                                                                                                                                                                              | Current principle                                     | keep           | Keep rail and towns safe from theft or destruction; this principle permits environmental threats but does not require adding them.                   | —                                                                                                                                                                                    |
| A271 | Solo pleasant, random arrivals              | [DESIGN.md:42-43](../../DESIGN.md#L42-L43)<br>[docs/proposals/boogle-2.md:34](../../docs/proposals/boogle-2.md#L34)<br>[docs/proposals/boogle-2.md:168](../../docs/proposals/boogle-2.md#L168)                                                                                                                                                                                                                                                                                                                     | Current; reaffirmed 2026-11-01                        | keep           | Every rail experiment must work solo; helpers make it better without a full lobby, minimum count or coordinated start.                               | —                                                                                                                                                                                    |
| A272 | Design for 1–6 versus room cap 8            | [DESIGN.md:43](../../DESIGN.md#L43)<br>[docs/game-design.md:15](../../docs/game-design.md#L15)                                                                                                                                                                                                                                                                                                                                                                                                                     | Current documents                                     | reword         | Distinguish intended social scale from the implemented room cap; neither makes rail progress require six or eight players.                           | Design for a pleasant solo session and a small group that can join and leave freely. The current room cap is eight; no rail milestone requires a particular player count.            |
| A273 | Solo-first playtest order                   | [PLAN.md:11](../../PLAN.md#L11)<br>[docs/proposals/vertical-slice.md:12](../../docs/proposals/vertical-slice.md#L12)<br>[docs/proposals/vertical-slice.md:128](../../docs/proposals/vertical-slice.md#L128)<br>[DESIGN.md:106](../../DESIGN.md#L106)                                                                                                                                                                                                                                                               | Old 2–4-player instructions; reversed 2026-11-01      | reword         | Conflict: current DESIGN and boogle-2.md:168 win over required group testing as the first proof of rail fun.                                         | Prove each rail question with one player first, then check that friends joining and leaving improve the experience. Group attendance is not a prerequisite for the first playtest.   |
| A274 | Build prototypes in parallel, test in order | [docs/proposals/boogle-2.md:172](../../docs/proposals/boogle-2.md#L172)                                                                                                                                                                                                                                                                                                                                                                                                                                            | 2026-11-01                                            | reword         | Keep independent iteration, but an old hauling verdict no longer determines every later prototype; the latest rail questions lead.                   | Independent prototypes may be built in parallel. Evaluate the current rail-loop and crossing questions in the agreed order, and let their results shape the slice and home redesign. |
| A275 | Scores avoid splitting friends              | [docs/proposals/hub-and-minigames.md:58](../../docs/proposals/hub-and-minigames.md#L58)<br>[docs/proposals/hub-and-minigames.md:104](../../docs/proposals/hub-and-minigames.md#L104)                                                                                                                                                                                                                                                                                                                               | 2026-10-30 proposal                                   | keep           | If optional games gain scores, favour personal bests, team results and shared bonuses; rail contributions should not become a competition.           | —                                                                                                                                                                                    |
| A276 | Honk and ping remain social tools           | [src/features/honk.ts:1-4](../../src/features/honk.ts#L1-L4)<br>[src/features/ping.ts:1-4](../../src/features/ping.ts#L1-L4)<br>[docs/research/0.1/SETTLED.md:40](../../docs/research/0.1/SETTLED.md#L40)                                                                                                                                                                                                                                                                                                          | Observed at audited commit                            | keep           | Keep spontaneous signals during construction and journeys; they communicate without requiring chat or granting material.                             | —                                                                                                                                                                                    |
| A277 | Three-person honk gate and little bell      | [docs/proposals/boogler-tech-tree.md:28](../../docs/proposals/boogler-tech-tree.md#L28)<br>[docs/proposals/boogler-tech-tree.md:89](../../docs/proposals/boogler-tech-tree.md#L89)<br>[docs/game-design.md:38](../../docs/game-design.md#L38)                                                                                                                                                                                                                                                                      | 2026-10-29/30; stale pillar example                   | reword         | Automatic harmony survives, but a three-player gate and required attendance conflict with solo rail play.                                            | Honk chords and any optional bell are social feedback, not progression gates. Rail construction and celebrations must be available to one player; no three-person chord is required. |
| A278 | Era-specific whistles, flares and radios    | [docs/proposals/story-and-finale.md:43-50](../../docs/proposals/story-and-finale.md#L43-L50)                                                                                                                                                                                                                                                                                                                                                                                                                       | 2026-10-30 proposal                                   | owner call     | Larger rail distances may need signals, but none of these tools is approved and wagon whistle audio was subsequently cut.                            | —                                                                                                                                                                                    |
| A279 | Folk communication games                    | [docs/proposals/story-and-finale.md:51](../../docs/proposals/story-and-finale.md#L51)                                                                                                                                                                                                                                                                                                                                                                                                                              | 2026-10-30 proposal                                   | owner call     | Charades and blindfolded handcar directions can only be optional games; the rail loop must remain usable without negotiated coordination.            | —                                                                                                                                                                                    |
| A280 | Traces of where friends went                | [docs/proposals/story-and-finale.md:52](../../docs/proposals/story-and-finale.md#L52)<br>[docs/proposals/boogler-tech-tree.md:39](../../docs/proposals/boogler-tech-tree.md#L39)                                                                                                                                                                                                                                                                                                                                   | 2026-10-29/30 proposal                                | keep           | Visible built track and town changes already support asynchronous gratitude; extra lamps/liveries are examples, not required new systems.            | —                                                                                                                                                                                    |
| A281 | Coconut letters, three exchanges, keepsakes | [docs/proposals/boogler-tech-tree.md:140-141](../../docs/proposals/boogler-tech-tree.md#L140-L141)<br>[docs/proposals/hub-and-minigames.md:121](../../docs/proposals/hub-and-minigames.md#L121)                                                                                                                                                                                                                                                                                                                    | 2026-10-29/30 proposal                                | owner call     | Optional messages could enrich returning visits, but no coconut delivery system or text-policy choice follows from the rail loop.                    | —                                                                                                                                                                                    |
| A282 | Lighthouse post-office restoration          | [docs/proposals/boogler-tech-tree.md:142](../../docs/proposals/boogler-tech-tree.md#L142)<br>[docs/proposals/hub-and-minigames.md:117](../../docs/proposals/hub-and-minigames.md#L117)                                                                                                                                                                                                                                                                                                                             | 2026-10-29/30 proposal                                | retire         | Fruit, shell, mushroom and three-friend requirements would gate shared services behind side activities; preserve lighthouse exploration.             | —                                                                                                                                                                                    |
| A283 | Seagull courier and ball recovery           | [docs/proposals/boogler-tech-tree.md:143](../../docs/proposals/boogler-tech-tree.md#L143)                                                                                                                                                                                                                                                                                                                                                                                                                          | 2026-10-29/30 proposal                                | owner call     | A comic courier remains optional; existing cosmetic gulls do not establish a rail delivery or ball-recovery mechanic.                                | —                                                                                                                                                                                    |
| A284 | Smiles protect sand creations               | [docs/proposals/boogler-tech-tree.md:144](../../docs/proposals/boogler-tech-tree.md#L144)                                                                                                                                                                                                                                                                                                                                                                                                                          | 2026-10-29/30 proposal                                | retire         | Sand and tide persistence is obsolete; rail progress must be protected regardless of collecting enough likes.                                        | —                                                                                                                                                                                    |
| A285 | Oyijon letters every real days              | [docs/proposals/boogler-tech-tree.md:145](../../docs/proposals/boogler-tech-tree.md#L145)                                                                                                                                                                                                                                                                                                                                                                                                                          | 2026-10-29/30 proposal                                | retire         | Real-day cadence should not dictate an eight-hour rail story; existing letter dialogue remains untouched.                                            | —                                                                                                                                                                                    |
| A286 | Ocean Spam wash-ups                         | [docs/proposals/boogler-tech-tree.md:146](../../docs/proposals/boogler-tech-tree.md#L146)                                                                                                                                                                                                                                                                                                                                                                                                                          | 2026-10-29/30 proposal                                | retire         | The wash-up system was removed; preserve its gift copy without treating it as a scheduled rail-world feature.                                        | —                                                                                                                                                                                    |
| A287 | Free-text versus phrase-picker mail         | [docs/proposals/boogler-tech-tree.md:148](../../docs/proposals/boogler-tech-tree.md#L148)<br>[docs/proposals/directions.md:166](../../docs/proposals/directions.md#L166)                                                                                                                                                                                                                                                                                                                                           | 2026-10-29/30 open question                           | owner call     | Only choose audience/moderation and message input if optional mail is commissioned; it is not a blocker for rail prototypes.                         | —                                                                                                                                                                                    |
| A288 | King-tide crate needs two pushers           | [docs/proposals/boogler-tech-tree.md:185](../../docs/proposals/boogler-tech-tree.md#L185)                                                                                                                                                                                                                                                                                                                                                                                                                          | 2026-10-29/30 proposal                                | retire         | A mandatory two-player crate and storm-tide boat parts contradict solo rail progress and the removed water loop.                                     | —                                                                                                                                                                                    |
| A289 | Gary's boat from pooled fund                | [docs/proposals/boogler-tech-tree.md:189](../../docs/proposals/boogler-tech-tree.md#L189)                                                                                                                                                                                                                                                                                                                                                                                                                          | 2026-10-29/30 proposal                                | retire         | The Boat Fund is not the selected shared arc; any first-island boat must be chosen for rail access, not inherited from this chain.                   | —                                                                                                                                                                                    |
| A290 | Offline growth cap                          | [docs/proposals/directions.md:170](../../docs/proposals/directions.md#L170)<br>[docs/research/0.1/SETTLED.md:16](../../docs/research/0.1/SETTLED.md#L16)                                                                                                                                                                                                                                                                                                                                                           | 2026-10-29/30; 0.1 cap later                          | owner call     | Choose how rail deliveries and town growth behave while absent; neither twelve real hours nor one helper section automatically answers the new loop. | —                                                                                                                                                                                    |
| A291 | Rooms for friend groups                     | [PLAN.md:157](../../PLAN.md#L157)<br>[docs/game-design.md:27](../../docs/game-design.md#L27)                                                                                                                                                                                                                                                                                                                                                                                                                       | Old open question; source-described room URLs current | reword         | The old global-island question is stale; distinguish shared progress within a room from one universal rail world.                                    | The current game has named rooms via ?room=. Rail progress is communal within the room; no change to room scope is proposed here.                                                    |
| A292 | Interact X/Square; B back                   | [docs/proposals/boogle-2.md:149](../../docs/proposals/boogle-2.md#L149)<br>[AGENTS.md:43](../../AGENTS.md#L43)                                                                                                                                                                                                                                                                                                                                                                                                     | 2026-11-01                                            | keep           | Quoted owner decision wins over AGENTS' stale pad-B example; consistent interaction helps boarding, stations and NPCs without new controls.          | —                                                                                                                                                                                    |
| A293 | First visit differs from return             | [docs/proposals/boogle-2.md:154](../../docs/proposals/boogle-2.md#L154)<br>[src/features/welcome-back.ts:1-4](../../src/features/welcome-back.ts#L1-L4)<br>[src/features/identity.ts:1-4](../../src/features/identity.ts#L1-L4)                                                                                                                                                                                                                                                                                    | 2026-11-01                                            | keep           | Retain saved identity, direct return and visible changes; they make other players' rail work apparent when rejoining.                                | —                                                                                                                                                                                    |
| A294 | Current entry, prompts, pause and gamepad   | [src/features/first-run.ts:1-4](../../src/features/first-run.ts#L1-L4)<br>[src/features/prompt.ts:1-4](../../src/features/prompt.ts#L1-L4)<br>[src/features/pause.ts:1-4](../../src/features/pause.ts#L1-L4)<br>[src/features/gamepad.ts:1-4](../../src/features/gamepad.ts#L1-L4)<br>[src/features/home-app.ts:1-4](../../src/features/home-app.ts#L1-L4)<br>[src/features/welcome-back.ts:1-4](../../src/features/welcome-back.ts#L1-L4)<br>[src/features/identity.ts:1-4](../../src/features/identity.ts#L1-L4) | Observed at audited commit                            | keep           | Keep general access and control support for rail and optional play; these features do not encode the old farming or venue progression.               | —                                                                                                                                                                                    |

### Technical examples (only)

Only example language and historical framing are considered here. No authority, protocol, math, renderer or entity recommendation follows from these rows.

| ID   | Call                                                  | Source                                                                                                                                                                                                                                                                                                                                                                                                                                           | When known                                  | Recommendation | Reason tied to the rail loop                                                                                                                                                               | Exact proposed wording                                                                                                                                                                                                                    |
| ---- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A295 | Existing toy sync examples                            | [DESIGN.md:58-61](../../DESIGN.md#L58-L61)<br>[DESIGN.md:67](../../DESIGN.md#L67)<br>[DESIGN.md:85-89](../../DESIGN.md#L85-L89)<br>[AGENTS.md:32-35](../../AGENTS.md#L32-L35)                                                                                                                                                                                                                                                                    | Current technical text                      | keep           | Avatar, ball, Boogler, mushrooms, gifts, hotbar and friendship are valid existing examples; examples describe ownership, not priority in the rail design.                                  | —                                                                                                                                                                                                                                         |
| A296 | Ball splash and NPC planting edits                    | [DESIGN.md:65-66](../../DESIGN.md#L65-L66)                                                                                                                                                                                                                                                                                                                                                                                                       | Older game examples                         | reword         | The crossing-kinds rule stays untouched; splash-as-sim-edit and NPC planting imply removed or unbuilt gameplay.                                                                            | Physics remains outside Lockstep. A physical actor can read shared state and request a change through an edit; a thrown item's landing is an existing example. Cosmetic splashes do not imply a shared water simulation.                  |
| A297 | Tide and weather presented as existing                | [DESIGN.md:68](../../DESIGN.md#L68)<br>[DESIGN.md:77](../../DESIGN.md#L77)                                                                                                                                                                                                                                                                                                                                                                       | Older game examples                         | reword         | Do not let deterministic example events reintroduce the old tide/farm core; retain the technical pure-function rule.                                                                       | Tick-and-seed functions can drive shared schedules without stored state. Tide and weather here are historical examples, not built systems or requirements for the rail loop.                                                              |
| A298 | Plant, water, toss, harvest, splash list              | [DESIGN.md:80](../../DESIGN.md#L80)                                                                                                                                                                                                                                                                                                                                                                                                              | Older game examples                         | reword         | Planting/watering mushrooms and tossing gifts exist; harvest and shared-water splash imply the discarded farming loop.                                                                     | For lockstep systems, clients send small edit events, such as planting or watering a mushroom and tossing or taking a gift, over the reliable channel. These examples do not make toys part of rail progression.                          |
| A299 | Garden, gifts, weather authority example              | [DESIGN.md:87](../../DESIGN.md#L87)                                                                                                                                                                                                                                                                                                                                                                                                              | Older game examples                         | reword         | Keep authority unchanged; distinguish the built mushroom garden from crops and unbuilt weather.                                                                                            | Mushrooms, gifts and work sites are existing shared-world examples; crops and weather are not current gameplay systems.                                                                                                                   |
| A300 | PeerJS and host-migration narration                   | [docs/game-design.md:25-26](../../docs/game-design.md#L25-L26)<br>[docs/game-design.md:42](../../docs/game-design.md#L42)<br>[docs/proposals/hub-and-minigames.md:29](../../docs/proposals/hub-and-minigames.md#L29)<br>[PLAN.md:156](../../PLAN.md#L156)                                                                                                                                                                                        | Historical network descriptions             | reword         | Conflict with current DESIGN.md:93; flag narration separately without revisiting the entity or networking refactor.                                                                        | For current room hosting and persistence, use DESIGN.md and the multiplayer implementation docs. The older PeerJS and browser-host migration descriptions are historical, not constraints on the rail design.                             |
| A301 | Snapshot deployment and catch-up prerequisites        | [docs/proposals/directions.md:9-16](../../docs/proposals/directions.md#L9-L16)<br>[docs/proposals/directions.md:171](../../docs/proposals/directions.md#L171)<br>[docs/proposals/boogler-tech-tree.md:26](../../docs/proposals/boogler-tech-tree.md#L26)<br>[docs/proposals/boogler-tech-tree.md:232](../../docs/proposals/boogler-tech-tree.md#L232)<br>[docs/proposals/hub-and-minigames.md:84](../../docs/proposals/hub-and-minigames.md#L84) | 2026-10-29/30 historical assumptions        | reword         | The old server-not-deployed claims are not a current rail blocker; technical plans remain authoritative and are not audited here.                                                          | These deployment and catch-up prerequisites describe an earlier networking version. Check current technical plans for implementation status; do not start infrastructure work from this historical design proposal.                       |
| A302 | Survival framing in net roadmap, Open 5               | [docs/proposals/boogle-2.md:203](../../docs/proposals/boogle-2.md#L203)                                                                                                                                                                                                                                                                                                                                                                          | Open by 2026-11-01                          | reword         | Address only its framing, as the owner requested; no networking or entity changes follow from replacing the game premise.                                                                  | Gameplay framing: Boogle's current direction is rail-connected camps feeding growing towns. Creature and survival examples are historical illustrations, not standing design requirements; this note does not alter technical milestones. |
| A303 | Removed dig action and legacy vehicle engine examples | [docs/proposals/vehicles.md:14](../../docs/proposals/vehicles.md#L14)<br>[docs/proposals/vehicles.md:20-28](../../docs/proposals/vehicles.md#L20-L28)<br>[docs/proposals/vehicles.md:100-107](../../docs/proposals/vehicles.md#L100-L107)<br>[docs/proposals/boogler-tech-tree.md:31](../../docs/proposals/boogler-tech-tree.md#L31)                                                                                                             | 2026-10-29/30 historical examples           | reword         | Keep input/physics/sync contracts out of scope; old pile-to-dive, cannon-es numbers and sand ruts must not be interpreted as current rail requirements.                                    | Historical implementation examples only: pile-to-dive, cannon-es tuning and sand ruts refer to an older game. Use current engine and control contracts for any approved vehicle; this document does not specify a technical migration.    |
| A304 | AGENTS interact pad-B example                         | [AGENTS.md:43](../../AGENTS.md#L43)<br>[docs/proposals/boogle-2.md:149](../../docs/proposals/boogle-2.md#L149)<br>[src/features/prompt.ts:1-4](../../src/features/prompt.ts#L1-L4)                                                                                                                                                                                                                                                               | Standing example; owner changed 2026-11-01  | reword         | Only the example glyph is stale: quoted owner X/Square decision wins; the interact registry rule stays unchanged.                                                                          | Interact button (E, pad X/Square, touch action): use registerInteractable. B/Circle is back or cancel.                                                                                                                                    |
| A305 | Technical PLAN history and renderer tiers             | [PLAN.md:13-47](../../PLAN.md#L13-L47)<br>[PLAN.md:145-156](../../PLAN.md#L145-L156)<br>[docs/proposals/visual-target.md:69-132](../../docs/proposals/visual-target.md#L69-L132)<br>[docs/proposals/visual-target.md:185-216](../../docs/proposals/visual-target.md#L185-L216)                                                                                                                                                                   | Mixed historical and current technical text | keep           | Out of design scope: do not change hosting, dependencies, fluid algorithms, performance budgets or renderer plans to reconcile the rail premise; only stale game framing is flagged above. | —                                                                                                                                                                                                                                         |

### Protected and process (out of design scope)

These rows acknowledge standing calls and the decision-log entries that must remain outside this gameplay audit. “Keep” here means leave the existing instruction untouched.

| ID   | Call                                      | Source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | When known                        | Recommendation | Reason tied to the rail loop                                                                                                                                     | Exact proposed wording |
| ---- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| A306 | Protect all Boogler copy                  | [AGENTS.md:12](../../AGENTS.md#L12)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Standing owner call; date unknown | keep           | Out of scope: never trim or reword dialogue, small talk, gift lines or HUD lines, even if they mention old rail alternatives or removed systems.                 | —                      |
| A307 | Nintendo names stay; no ROM data          | [AGENTS.md:13](../../AGENTS.md#L13)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Standing owner call; date unknown | keep           | Out of scope: no renaming Nintendo references and no ROM data or extracted assets in repo/build; evaluating guest gameplay does not change this boundary.        | —                      |
| A308 | Name references and borrow features       | [AGENTS.md:14](../../AGENTS.md#L14)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Standing owner call; date unknown | keep           | Keep Death Stranding, Big Walk, Ratchet, Bricktrons and Mario named where relevant; make Boogle's own rail world and characters.                                 | —                      |
| A309 | Research before deep facets               | [AGENTS.md:15](../../AGENTS.md#L15)<br>[docs/proposals/boogle-2.md:36](../../docs/proposals/boogle-2.md#L36)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Reaffirmed 2026-11-01             | keep           | The rail direction changes gameplay priorities, not the requirement to research deep design/build work; this audit invents no new implementation.                | —                      |
| A310 | Compare standard engines                  | [AGENTS.md:16](../../AGENTS.md#L16)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Standing owner call; date unknown | keep           | Technical principle is explicitly out of scope; no rail-design recommendation changes architecture comparisons.                                                  | —                      |
| A311 | Owner decisions live in repo              | [AGENTS.md:17](../../AGENTS.md#L17)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Standing owner call; date unknown | keep           | Accepted rail decisions must become shared repository guidance; this proposal records choices for review, not silent policy changes.                             | —                      |
| A312 | Button-page decision workflow             | [docs/proposals/boogle-2.md:33](../../docs/proposals/boogle-2.md#L33)<br>[docs/proposals/island-layout.md:16](../../docs/proposals/island-layout.md#L16)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Owner thread; by 2026-11-01       | keep           | Standalone audit rows support the owner's pick workflow; retain existing concept/layout storage keys when their pages are edited later.                          | —                      |
| A313 | Concept images are references             | [docs/proposals/boogle-2.md:37](../../docs/proposals/boogle-2.md#L37)<br>[DESIGN.md:101-102](../../DESIGN.md#L101-L102)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Current art process               | keep           | Keep approval, prompts and reference-only concepts; renderer-led rail previz and the later generated title-art choice do not license unapproved shipped imagery. | —                      |
| A314 | Entities have methods                     | [docs/proposals/boogle-2.md:158](../../docs/proposals/boogle-2.md#L158)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 2026-11-02                        | keep           | Explicitly excluded technical decision; preserve entity methods and the recorded test exception without opening docs/plans/entity-architecture.md.               | —                      |
| A315 | No automatic rollback yet                 | [docs/proposals/boogle-2.md:159](../../docs/proposals/boogle-2.md#L159)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 2026-11-02                        | keep           | Quoted owner decision remains; deployment recovery is outside a read-only rail design audit.                                                                     | —                      |
| A316 | Migrate entities before slice             | [docs/proposals/boogle-2.md:160](../../docs/proposals/boogle-2.md#L160)<br>[docs/proposals/boogle-2.md:201](../../docs/proposals/boogle-2.md#L201)<br>[docs/proposals/boogle-2.md:208](../../docs/proposals/boogle-2.md#L208)                                                                                                                                                                                                                                                                                                                                                                                                                               | 2026-11-01/02                     | keep           | Quoted owner decision and technical Open 3 are excluded, not re-decided; preserve recorded prerequisites while the rail slice is replanned.                      | —                      |
| A317 | Start asset pipeline now                  | [docs/proposals/boogle-2.md:162](../../docs/proposals/boogle-2.md#L162)<br>[docs/proposals/boogle-2.md:188](../../docs/proposals/boogle-2.md#L188)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 2026-11-01                        | keep           | Retain the newer pipeline timing; art for towns/trains may use it, but no glTF, compression or lifecycle architecture is audited here.                           | —                      |
| A318 | One playtest path, server verdicts        | [docs/proposals/boogle-2.md:167](../../docs/proposals/boogle-2.md#L167)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 2026-11-01                        | keep           | Quoted owner workflow remains useful for rail experiments; local-switch variants, chapters and copy fallback are not redesign targets.                           | —                      |
| A319 | Fast iteration and lighter tests          | [docs/proposals/boogle-2.md:35](../../docs/proposals/boogle-2.md#L35)<br>[docs/proposals/boogle-2.md:169](../../docs/proposals/boogle-2.md#L169)<br>[DESIGN.md:107](../../DESIGN.md#L107)                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 2026-11-01                        | keep           | Retain the current test diet and later entity exception; this audit needs no new gameplay tests or browser scenario.                                             | —                      |
| A320 | Agents inspect their own results          | [docs/proposals/boogle-2.md:171](../../docs/proposals/boogle-2.md#L171)<br>[docs/proposals/boogle-2.md:189](../../docs/proposals/boogle-2.md#L189)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 2026-11-01                        | keep           | Preserve the implementation-review workflow; this task changes no visible game and makes no runtime rail-fun claim.                                              | —                      |
| A321 | Current technical support features        | [src/features/world.ts:1-3](../../src/features/world.ts#L1-L3)<br>[src/features/updates.ts:1-4](../../src/features/updates.ts#L1-L4)<br>[src/features/telemetry.ts:1-4](../../src/features/telemetry.ts#L1-L4)<br>[src/features/adaptive-res.ts:1-4](../../src/features/adaptive-res.ts#L1-L4)<br>[src/features/wake-lock.ts:1-4](../../src/features/wake-lock.ts#L1-L4)<br>[src/features/controls-check.ts:1-4](../../src/features/controls-check.ts#L1-L4)<br>[docs/proposals/hub-and-minigames.md:78-84](../../docs/proposals/hub-and-minigames.md#L78-L84)<br>[docs/proposals/hub-and-minigames.md:137](../../docs/proposals/hub-and-minigames.md#L137) | Observed at audited commit        | keep           | Keep general infrastructure outside design disposition; rail priorities do not justify removing world sync, updates, reports, controls checks or device support. | —                      |
| A322 | Current debug and prototype scaffolding   | [src/features/debug-cam.ts:1-3](../../src/features/debug-cam.ts#L1-L3)<br>[src/features/debug-handle.ts:1-4](../../src/features/debug-handle.ts#L1-L4)<br>[src/features/prof.ts:1-4](../../src/features/prof.ts#L1-L4)<br>[src/features/syncsafety.ts:1-3](../../src/features/syncsafety.ts#L1-L3)<br>[src/features/walk-layout.ts:1-4](../../src/features/walk-layout.ts#L1-L4)<br>[src/features/proto-bar.ts:1](../../src/features/proto-bar.ts#L1)                                                                                                                                                                                                       | Observed at audited commit        | keep           | Retain inspection and flag infrastructure; old layout content can be historical without removing the tools used to test rail.                                    | —                      |
| A323 | Flagged experiments are not base gameplay | [src/features/proto-net.ts:1-14](../../src/features/proto-net.ts#L1-L14)<br>[src/features/proto-crossing.ts:1-6](../../src/features/proto-crossing.ts#L1-L6)<br>[src/features/proto-wagon.ts:1-4](../../src/features/proto-wagon.ts#L1-L4)<br>[src/features/proto-era.ts:1-4](../../src/features/proto-era.ts#L1-L4)<br>[src/features/proto-haul.ts:1-4](../../src/features/proto-haul.ts#L1-L4)<br>[src/features/proto-lay.ts:1-4](../../src/features/proto-lay.ts#L1-L4)<br>[src/features/proto-board.ts:1-4](../../src/features/proto-board.ts#L1-L4)                                                                                                    | Observed at audited commit        | keep           | Keep prototype status explicit: rail/town, distance, wagon, era, haul, laying and board code are evidence of experiments, not final adoption.                    | —                      |
| A324 | Look, assets, hero and moves experiments  | [src/features/proto-look.ts:1-4](../../src/features/proto-look.ts#L1-L4)<br>[src/features/proto-assets.ts:1-4](../../src/features/proto-assets.ts#L1-L4)<br>[src/features/proto-hero-rig.ts:1-4](../../src/features/proto-hero-rig.ts#L1-L4)<br>[src/features/proto-hero.ts:1-4](../../src/features/proto-hero.ts#L1-L4)<br>[src/features/proto-moves.ts:1-4](../../src/features/proto-moves.ts#L1-L4)<br>[src/features/blob-shadows.ts:1-3](../../src/features/blob-shadows.ts#L1-L3)                                                                                                                                                                      | Observed at audited commit        | keep           | Keep look/character experiments and readability support distinct from approved base-game art; the audit does not promote prototypes or change the rail renderer. | —                      |

## Machine-readable rows

The array matches the tables one-for-one. `source` contains repository-relative file/line references and the recorded date qualification. `wording` is `null` except for exact proposed rewrites. Recommendations are proposals awaiting owner selection, not applied changes.

```json
[
  {
    "id": "A1",
    "topic": "core loop",
    "call": "Rail connections compound",
    "source": "DESIGN.md:3-11; docs/proposals/boogle-2.md:72; docs/proposals/progression-paths.md:7 (when: 2026-11-02)",
    "recommendation": "keep",
    "reason": "Latest quoted owner direction wins: connected camps automatically supply towns; town upgrades extend the network; no routing or quotas.",
    "wording": null
  },
  {
    "id": "A2",
    "topic": "core loop",
    "call": "Toys before chores",
    "source": "DESIGN.md:15-18; docs/proposals/boogle-2.md:27; docs/proposals/hub-and-minigames.md:15-19; docs/game-design.md:35 (when: Current; owner thread 2026-10-29 to 2026-11-01)",
    "recommendation": "keep",
    "reason": "Track building and riding must be enjoyable before rewards; the rail loop does not license repetitive chores.",
    "wording": null
  },
  {
    "id": "A3",
    "topic": "core loop",
    "call": "Physics toys are optional",
    "source": "DESIGN.md:20-22; docs/proposals/boogle-2.md:111; docs/research/0.1/SETTLED.md:19; docs/game-design.md:36 (when: Current; reaffirmed 2026-11-02)",
    "recommendation": "keep",
    "reason": "Ball, frisbee and mushrooms remain available without feeding income or requiring every rail feature to involve them.",
    "wording": null
  },
  {
    "id": "A4",
    "topic": "core loop",
    "call": "Side activities never gate progress",
    "source": "DESIGN.md:24-26; docs/proposals/boogle-2.md:109; docs/proposals/vertical-slice.md:42; docs/game-design.md:37 (when: Current)",
    "recommendation": "keep",
    "reason": "Rail growth must not require farming, mini-game scores or toy mastery.",
    "wording": null
  },
  {
    "id": "A5",
    "topic": "core loop",
    "call": "Every system is ignorable",
    "source": "docs/research/0.1/SETTLED.md:20-23; docs/proposals/boogle-2.md:108; docs/proposals/vertical-slice.md:25; docs/proposals/boogle-2.md:107-108 (when: By 2026-10-31; retained before rail revision)",
    "recommendation": "owner call",
    "reason": "Conflict: unrestricted access without anyone building rail undermines the frontier; DESIGN.md:24-26 only exempts side activities. Decide whether non-builders share others' unlocks or a solo non-builder also gets automatic progress.",
    "wording": null
  },
  {
    "id": "A6",
    "topic": "core loop",
    "call": "Play is the material",
    "source": "docs/proposals/boogle-2.md:99-101; docs/proposals/boogle-2.md:211; docs/proposals/vertical-slice.md:37 (when: Round 2; reopened 2026-11-02)",
    "recommendation": "owner call",
    "reason": "Open question 12 explicitly leaves reversal to the owner; rail-produced goods now drive growth, while mini-games can remain personal rewards.",
    "wording": null
  },
  {
    "id": "A7",
    "topic": "core loop",
    "call": "Telegraph everything in 30–60 seconds",
    "source": "DESIGN.md:39-40; docs/game-design.md:41 (when: Unknown; current text)",
    "recommendation": "reword",
    "reason": "The universal wave warning comes from the retired tide; rail goals need visible destinations and change, not a compulsory countdown.",
    "wording": "Make the next connection and its payoff visible in the world. Announce consequential changes before they happen; choose the warning length for the event rather than imposing a universal countdown."
  },
  {
    "id": "A8",
    "topic": "core loop",
    "call": "Slapstick over precision",
    "source": "DESIGN.md:48-49; docs/proposals/hub-and-minigames.md:18; docs/game-design.md:44 (when: Unknown; current text)",
    "recommendation": "keep",
    "reason": "Funny movement and toys suit rail travel; this does not require train operation or precision chores.",
    "wording": null
  },
  {
    "id": "A9",
    "topic": "core loop",
    "call": "Mechanics before narrative",
    "source": "docs/proposals/boogle-2.md:28-32; docs/proposals/boogle-2.md:195; docs/proposals/boogle-2.md:234 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Keep narrative parked until building connections and seeing towns grow are fun; collaborators retain story choices.",
    "wording": null
  },
  {
    "id": "A10",
    "topic": "core loop",
    "call": "Ambitious, varied technology and construction",
    "source": "docs/proposals/boogle-2.md:29-31 (when: Owner thread, 2026-10-29 to 2026-11-01)",
    "recommendation": "keep",
    "reason": "Visible construction, exploration and distinct eras support the rail payoff; ambition does not restore a material grind or eight mandatory eras.",
    "wording": null
  },
  {
    "id": "A11",
    "topic": "core loop",
    "call": "Old roadmap goal",
    "source": "PLAN.md:3-5 (when: Unknown; introduction includes 2026-10-30 history)",
    "recommendation": "reword",
    "reason": "Conflict: DESIGN.md:9 wins over the ball-centred roadmap and its invitation to redesign farming and tide.",
    "wording": "Goal: prove a drop-in rail loop in which connecting camps grows towns and unlocks greater reach. Existing physics toys are optional; the removed water sim, digging and unbuilt crops are historical context, not pending core systems."
  },
  {
    "id": "A12",
    "topic": "core loop",
    "call": "Mini-games are reasons to go places",
    "source": "docs/proposals/hub-and-minigames.md:3-9; docs/proposals/hub-and-minigames.md:109 (when: 2026-10-30)",
    "recommendation": "retire",
    "reason": "Conflict: boogle-2.md:56,77 drops island-to-mini-game mapping and the venue plan; camps and towns now motivate travel.",
    "wording": null
  },
  {
    "id": "A13",
    "topic": "core loop",
    "call": "Emporium idle bazaar as core",
    "source": "docs/proposals/directions.md:20-34 (when: 2026-10-29/30)",
    "recommendation": "retire",
    "reason": "A gift-fed Boat Fund competes with the rail-fed town loop; preserve the existing Emporium dialogue.",
    "wording": null
  },
  {
    "id": "A14",
    "topic": "core loop",
    "call": "Raft exploration as core",
    "source": "docs/proposals/directions.md:36-51 (when: 2026-10-29/30)",
    "recommendation": "retire",
    "reason": "Rail is the connective spine; a boat remains an open first-arrival option, not the selected world loop.",
    "wording": null
  },
  {
    "id": "A15",
    "topic": "core loop",
    "call": "Knowledge and sand patterns as progression",
    "source": "docs/proposals/directions.md:53-68 (when: 2026-10-29/30)",
    "recommendation": "retire",
    "reason": "Pattern solving and removed sand tools cannot be mandatory prerequisites to connecting rail.",
    "wording": null
  },
  {
    "id": "A16",
    "topic": "core loop",
    "call": "Physics contraptions as core",
    "source": "docs/proposals/directions.md:70-82 (when: 2026-10-29/30)",
    "recommendation": "retire",
    "reason": "An open-ended hinges-and-water sandbox is an alternative game direction, not a rail-loop commitment.",
    "wording": null
  },
  {
    "id": "A17",
    "topic": "core loop",
    "call": "Coconut Post as core",
    "source": "docs/proposals/directions.md:84-98 (when: 2026-10-29/30)",
    "recommendation": "retire",
    "reason": "Asynchronous traces may complement rail, but scheduled coconut mail is not its progression spine.",
    "wording": null
  },
  {
    "id": "A18",
    "topic": "core loop",
    "call": "Stay tiny, no progression",
    "source": "docs/proposals/directions.md:100-112 (when: 2026-10-29/30)",
    "recommendation": "retire",
    "reason": "Conflict: the selected rail loop explicitly grows towns and reach over an approximately eight-hour arc.",
    "wording": null
  },
  {
    "id": "A19",
    "topic": "core loop",
    "call": "Storm tide as world's clock",
    "source": "docs/proposals/directions.md:114-125; docs/proposals/boogler-tech-tree.md:29; PLAN.md:105-113 (when: 2026-10-29/30)",
    "recommendation": "retire",
    "reason": "Conflict: DESIGN.md:11 removes water from the core; recurrent floods and two-pusher crates must not return as rail requirements.",
    "wording": null
  },
  {
    "id": "A20",
    "topic": "core loop",
    "call": "Restore landmarks through varied wants",
    "source": "docs/proposals/directions.md:127-138; docs/proposals/boogler-tech-tree.md:24 (when: 2026-10-29/30)",
    "recommendation": "retire",
    "reason": "Fruit, mushrooms and three-friend bells would make toys gates; rail deliveries now cause visible town growth.",
    "wording": null
  },
  {
    "id": "A21",
    "topic": "core loop",
    "call": "Mix the eight old directions",
    "source": "docs/proposals/directions.md:142-162 (when: 2026-10-29/30)",
    "recommendation": "retire",
    "reason": "The comparison and six hybrid recipes are historical alternatives; none overrides the chosen rail direction.",
    "wording": null
  },
  {
    "id": "A22",
    "topic": "core loop",
    "call": "Find-the-fun order and pass criteria",
    "source": "docs/proposals/boogle-2.md:217-234 (when: 2026-11-01; superseded in part 2026-11-02)",
    "recommendation": "reword",
    "reason": "Conflict: later Open 9 and Decided rail entries win over wobbly hauling, spill tuning and a 50-second laying test.",
    "wording": "Keep earlier haul, ride, laying, era and soapbox experiments as playtest history. The next design tests are the rail-fed town loop and the long crossing; plan the slice and home redesign from those results. Narrative and rewards remain deferred."
  },
  {
    "id": "A23",
    "topic": "core loop",
    "call": "Vertical slice is next",
    "source": "docs/proposals/boogle-2.md:177; docs/proposals/boogle-2.md:208; docs/proposals/vertical-slice.md:6-17 (when: 2026-11-01; replaced 2026-11-02)",
    "recommendation": "reword",
    "reason": "Conflict: resolved Open 9 wins; a haul-led slice on today's island is not the next deliverable.",
    "wording": "Prototype the rail loop and crossing first. Then plan the first-era slice together with the new home layout, retaining the already recorded technical prerequisites without changing them."
  },
  {
    "id": "A24",
    "topic": "core loop",
    "call": "Keep DESIGN as principles authority",
    "source": "DESIGN.md:5; DESIGN.md:106-109 (when: Current)",
    "recommendation": "keep",
    "reason": "DESIGN defines principles; newer owner decisions in boogle-2 win over older design calls; approving this audit alone changes neither.",
    "wording": null
  },
  {
    "id": "A25",
    "topic": "core loop",
    "call": "PLAN document status",
    "source": "PLAN.md:1-11; PLAN.md:49-158 (when: Mixed historical roadmap)",
    "recommendation": "reword",
    "reason": "Its unchecked garden, tide and stretch items still look executable; rail prototype sequencing must be the active roadmap.",
    "wording": "Status: historical iteration ledger through the 0.1 testbed. Do not implement its unchecked gameplay items. Current design decisions are in docs/decisions.md; current rail experiments are tracked in docs/plans/find-the-fun.md. Keep completed technical history as history."
  },
  {
    "id": "A26",
    "topic": "core loop",
    "call": "SETTLED document status",
    "source": "docs/research/0.1/SETTLED.md:1-41 (when: Recorded by 2026-10-31)",
    "recommendation": "reword",
    "reason": "The title 'do not re-open' falsely outranks recent rail decisions and explicit owner reversals.",
    "wording": "Status: historical 0.1 design snapshot, not standing instructions. docs/decisions.md and DESIGN.md supersede it. Preserve this record; migrate only explicitly retained calls into the current decision log."
  },
  {
    "id": "A27",
    "topic": "core loop",
    "call": "Decision-log status and stale links",
    "source": "docs/proposals/boogle-2.md:3-21; docs/proposals/boogle-2.md:180-189 (when: 2026-11-01/02)",
    "recommendation": "reword",
    "reason": "The active record must distinguish current rail calls from superseded slice and era briefs without erasing owner history.",
    "wording": "This is the current design decision log. Later dated owner decisions supersede earlier conflicting entries. Label replaced entries as superseded and old proposal links as historical; preserve quotes and the Changed record. No decision here is proof of shipped behavior."
  },
  {
    "id": "A28",
    "topic": "core loop",
    "call": "Vertical-slice document status",
    "source": "docs/proposals/vertical-slice.md:1-8; docs/proposals/vertical-slice.md:58-145 (when: 2026-10-31/11-01)",
    "recommendation": "reword",
    "reason": "Old milestones would build the rejected lighthouse route, manual haul loop and premature ceremony.",
    "wording": "Status: superseded build brief; do not execute S1–S7. Replan the first-era slice after the rail-loop and crossing prototypes and the home greybox. Carry forward only owner-confirmed decisions from decisions.md."
  },
  {
    "id": "A29",
    "topic": "core loop",
    "call": "Hub proposal document status",
    "source": "docs/proposals/hub-and-minigames.md:1-9; docs/proposals/hub-and-minigames.md:123-137 (when: 2026-10-30)",
    "recommendation": "reword",
    "reason": "The venue-centred game has been dropped; keep candidate toys for the later mini-games pass.",
    "wording": "Status: historical hub direction, not a roadmap. The rail loop determines camps, towns and travel; mini-games are optional and get a separate later pass. This document's first slice and economy are not approved work."
  },
  {
    "id": "A30",
    "topic": "core loop",
    "call": "Progression-paths document status",
    "source": "docs/proposals/progression-paths.md:1-3; docs/proposals/progression-paths.md:29-43 (when: 2026-10-30)",
    "recommendation": "reword",
    "reason": "The useful reach/build ideas should inform rail design, while discovery gates and the water-first order stay historical.",
    "wording": "Status: historical alternatives, none approved here. Carry visible shared progress and movement-changing unlocks into the rail brief; do not implement the proposed hybrid or first-prototype list."
  },
  {
    "id": "A31",
    "topic": "core loop",
    "call": "Story proposal document status",
    "source": "docs/proposals/story-and-finale.md:1-3; docs/proposals/story-and-finale.md:94-99 (when: 2026-10-30)",
    "recommendation": "reword",
    "reason": "Narrative waits for the rail loop; its ceremonies, eight-era gags and finales are options, not obligations.",
    "wording": "Status: parked story options for collaborators. The rail loop and retained eras must settle before selecting ceremonies, gags or a finale. Existing Boogler copy remains protected by AGENTS.md."
  },
  {
    "id": "A32",
    "topic": "core loop",
    "call": "Fourth-melon document status",
    "source": "docs/proposals/fourth-melon.md:3; docs/proposals/fourth-melon.md:62-77 (when: 2026-11-01)",
    "recommendation": "reword",
    "reason": "A parked writers' brief must not authorize rewriting protected lines during rail cleanup.",
    "wording": "Status: parked new-story options. No reveal is chosen. Existing dialogue, backstory and gift lines are out of scope for cleanup; any proposed change belongs in a separate owner-led writing decision."
  },
  {
    "id": "A33",
    "topic": "core loop",
    "call": "Tech-tree document status",
    "source": "docs/proposals/boogler-tech-tree.md:1-5; docs/proposals/boogler-tech-tree.md:230-236 (when: 2026-10-29/30)",
    "recommendation": "reword",
    "reason": "The 45-page restoration book is a displaced progression model, not a second rail roadmap.",
    "wording": "Status: historical alternative to rail progression. Do not implement page gates, the Boat Fund, seasons or its first slice. Keep existing Boogler lines intact; collaborators may later reuse unbuilt story ideas explicitly."
  },
  {
    "id": "A34",
    "topic": "core loop",
    "call": "Directions document status",
    "source": "docs/proposals/directions.md:1-7; docs/proposals/directions.md:164-174 (when: 2026-10-29/30)",
    "recommendation": "reword",
    "reason": "Eight alternatives should stop sending agents back to pre-rail choices.",
    "wording": "Status: historical direction exploration. The owner selected the rail-builds-the-world direction in decisions.md; none of A–H or their combinations is an active plan."
  },
  {
    "id": "A35",
    "topic": "core loop",
    "call": "Vehicles document status",
    "source": "docs/proposals/vehicles.md:3; docs/proposals/vehicles.md:109-113 (when: 2026-10-29/30)",
    "recommendation": "reword",
    "reason": "Old cannon-es guesses, ball mandates and gravity-only routes must not override the accepted RC soapbox or transport-only train.",
    "wording": "Status: historical vehicle research and untested starting values. Follow current owner playtest decisions for the RC soapbox and trains. Reuse feel observations only after checking the current vehicle; no listed vehicle or number is an implementation mandate."
  },
  {
    "id": "A36",
    "topic": "core loop",
    "call": "Island-layout document status",
    "source": "docs/proposals/island-layout.md:3-5; docs/proposals/island-layout.md:127-132 (when: 2026-11-01)",
    "recommendation": "reword",
    "reason": "Conflict: boogle-2.md:66-78 parks the old layout lab and picks new home/network candidates.",
    "wording": "Status: historical layout lab on the old island. Lighthouse line is rejected; West Cove and East Bay are parked. Threefold Reach and Two-Bay Weave are the current working picks, subject to a greybox and the crossing scale test."
  },
  {
    "id": "A37",
    "topic": "core loop",
    "call": "Visual-target document status",
    "source": "docs/proposals/visual-target.md:3-19; docs/proposals/visual-target.md:179-216 (when: 2026-11-01)",
    "recommendation": "reword",
    "reason": "Old measured research remains evidence, but its ipad/rim prescription conflicts with newer high/Buddy choices.",
    "wording": "Status: historical rendering experiment and estimates, not the selected art direction. Use the owner's high preset target and current Buddy guidance in decisions.md; device estimates require measurement and do not overrule those choices."
  },
  {
    "id": "A38",
    "topic": "core loop",
    "call": "As-built document status",
    "source": "docs/game-design.md:3-9 (when: Current index)",
    "recommendation": "keep",
    "reason": "Keep the as-built inventory separate from rail ambition; repair verified inaccuracies without claiming prototypes are the shipped loop.",
    "wording": null
  },
  {
    "id": "A39",
    "topic": "core loop",
    "call": "As-built overview still describes toy-first loop",
    "source": "docs/game-design.md:15-22; src/features/log-sources.ts:1-3; src/features/proto-net.ts:1-14; src/features/proto-crossing.ts:1-6 (when: Observed at audited commit)",
    "recommendation": "reword",
    "reason": "The old overview says palms are shaken for logs and calls the toy inventory the loop; rail growth is currently flagged prototype work.",
    "wording": "The base game contains optional physics toys, mushrooms, The Boogler, caves and the 0.1 rail testbed. Logs currently come from Take logs bundles at palms, not chopping or shaking. The working design is rail-fed town growth; that loop currently lives behind ?proto=net, with long-distance travel tested behind ?proto=crossing. Crops, shared water simulation and sand shaping are not built into this loop."
  },
  {
    "id": "A40",
    "topic": "core loop",
    "call": "Which documents become active or historical",
    "source": "docs/proposals/boogle-2.md:3-21; PLAN.md:9-11 (when: Audit recommendation)",
    "recommendation": "owner call",
    "reason": "Approve one living decision log plus DESIGN principles, a replanned rail slice, and an accurate as-built index; mark the older alternatives historical, retaining story briefs parked and merging only accepted calls.",
    "wording": null
  },
  {
    "id": "A41",
    "topic": "core loop",
    "call": "Stuck-page book is the tech tree",
    "source": "docs/proposals/boogler-tech-tree.md:13-17 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "A mandatory book/blueprint interface is a displaced progression model; rail camps, deliveries and town changes now show progress directly.",
    "wording": null
  },
  {
    "id": "A42",
    "topic": "progression",
    "call": "Eight-hour target, fewer eras",
    "source": "docs/proposals/boogle-2.md:43; docs/proposals/boogle-2.md:209 (when: 2026-11-02)",
    "recommendation": "keep",
    "reason": "Quoted owner decision and resolved Open 10 replace four hours and multiple evenings per era; rail compounding needs a finite, testable arc.",
    "wording": null
  },
  {
    "id": "A43",
    "topic": "progression",
    "call": "Four hours or 1–3 evenings per era",
    "source": "docs/research/0.1/SETTLED.md:9; docs/proposals/boogle-2.md:58; docs/proposals/boogle-2.md:182 (when: By 2026-11-01; superseded 2026-11-02)",
    "recommendation": "retire",
    "reason": "Conflict: boogle-2.md:43 wins with roughly eight hours total, not eight separate long grinds.",
    "wording": null
  },
  {
    "id": "A44",
    "topic": "progression",
    "call": "Discoveries advance ages, not stations",
    "source": "docs/research/0.1/SETTLED.md:8 (when: By 2026-10-31)",
    "recommendation": "owner call",
    "reason": "Rail-fed town growth now supplies upgrades, but no latest decision specifies what ends an era; do not silently retain discovery gates.",
    "wording": null
  },
  {
    "id": "A45",
    "topic": "progression",
    "call": "Preset railway built in short sections",
    "source": "docs/research/0.1/SETTLED.md:4; docs/proposals/boogle-2.md:68 (when: By 2026-10-31; network direction 2026-11-01)",
    "recommendation": "owner call",
    "reason": "A stepping-stone network is retained, but fixed sockets versus player-chosen paths and branch unlocks remain unchosen.",
    "wording": null
  },
  {
    "id": "A46",
    "topic": "progression",
    "call": "Stations bring characters; stones reveal route",
    "source": "docs/research/0.1/SETTLED.md:5 (when: By 2026-10-31; stones explicitly leaning)",
    "recommendation": "owner call",
    "reason": "Readable rail destinations fit; automatic NPC rewards and rising ancient stones are unconfirmed presentation choices.",
    "wording": null
  },
  {
    "id": "A47",
    "topic": "progression",
    "call": "Station miniature is display-only",
    "source": "docs/research/0.1/SETTLED.md:7 (when: By 2026-10-31)",
    "recommendation": "keep",
    "reason": "A Big Walk-style overview can show the growing network without becoming another required progression system.",
    "wording": null
  },
  {
    "id": "A48",
    "topic": "progression",
    "call": "Any K of M gates",
    "source": "docs/proposals/progression-paths.md:11 (when: 2026-10-30 proposal)",
    "recommendation": "retire",
    "reason": "No such gate is approved; camp connections should prove the loop before adding multi-task era checklists.",
    "wording": null
  },
  {
    "id": "A49",
    "topic": "progression",
    "call": "Find-it blueprint leads",
    "source": "docs/proposals/progression-paths.md:20 (when: 2026-10-30 proposal)",
    "recommendation": "retire",
    "reason": "Three-of-five discovery gates make unrelated toy tricks prerequisites for the rail frontier.",
    "wording": null
  },
  {
    "id": "A50",
    "topic": "progression",
    "call": "Reach-it track progression",
    "source": "docs/proposals/progression-paths.md:21 (when: 2026-10-30 proposal)",
    "recommendation": "reword",
    "reason": "Reaching resources survives, but closing a decorative loop is not the chosen economic trigger.",
    "wording": "Connect resource camps to the rail network; their deliveries grow towns and unlock greater reach. A closed loop is not required unless a later prototype establishes that rule."
  },
  {
    "id": "A51",
    "topic": "progression",
    "call": "Island-notices silhouette",
    "source": "docs/proposals/progression-paths.md:22 (when: 2026-10-30 proposal)",
    "recommendation": "reword",
    "reason": "Visible feedback fits town growth; counting deep-water cells belongs to the removed water direction.",
    "wording": "Show the effect of delivered goods in the town's buildings and activity, with the next useful connection readable in the world."
  },
  {
    "id": "A52",
    "topic": "progression",
    "call": "Era noticeboard tasks",
    "source": "docs/proposals/progression-paths.md:23 (when: 2026-10-30 proposal)",
    "recommendation": "retire",
    "reason": "Six-of-nine slapstick tasks would replace rail-led progression with chores and split attention from shared connections.",
    "wording": null
  },
  {
    "id": "A53",
    "topic": "progression",
    "call": "Tinkerers' combinations",
    "source": "docs/proposals/progression-paths.md:24 (when: 2026-10-30 proposal)",
    "recommendation": "retire",
    "reason": "Junk-combination discovery is an alternative progression model, not a prerequisite for rail upgrades.",
    "wording": null
  },
  {
    "id": "A54",
    "topic": "progression",
    "call": "Restore-it varied deliveries",
    "source": "docs/proposals/progression-paths.md:25 (when: 2026-10-30 proposal)",
    "recommendation": "retire",
    "reason": "A shopping list of manual offerings conflicts with automatic camp output and no quotas.",
    "wording": null
  },
  {
    "id": "A55",
    "topic": "progression",
    "call": "Discovery → blueprint → varied cargo hybrid",
    "source": "docs/proposals/progression-paths.md:29-37 (when: 2026-10-30 proposal)",
    "recommendation": "retire",
    "reason": "Conflict: boogle-2.md:72 wins; track connections cause growth without first solving discovery leads.",
    "wording": null
  },
  {
    "id": "A56",
    "topic": "progression",
    "call": "Water-first prototype order",
    "source": "docs/proposals/progression-paths.md:41-43 (when: 2026-10-30 proposal)",
    "recommendation": "retire",
    "reason": "Watering by standing water, windmill discovery and handcar pumping are not the current rail-loop experiments.",
    "wording": null
  },
  {
    "id": "A57",
    "topic": "progression",
    "call": "Movement-changing unlocks",
    "source": "docs/proposals/progression-paths.md:13-14 (when: 2026-10-30 proposal)",
    "recommendation": "keep",
    "reason": "New reach and visible persistent changes are precisely the payoff of each rail connection.",
    "wording": null
  },
  {
    "id": "A58",
    "topic": "progression",
    "call": "Double jump and glide unlock later",
    "source": "docs/proposals/boogle-2.md:95; src/features/proto-moves.ts:1-4 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted owner decision retained: expanded movement should feel earned; which town or rail milestone grants it remains open.",
    "wording": null
  },
  {
    "id": "A59",
    "topic": "progression",
    "call": "Regulars gate book chapters",
    "source": "docs/proposals/boogler-tech-tree.md:37; docs/proposals/directions.md:167 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "Counting friends or three return days stalls solo rail progress; current solo-first and drop-in principles win.",
    "wording": null
  },
  {
    "id": "A60",
    "topic": "progression",
    "call": "Friend level opens the progression book",
    "source": "docs/proposals/boogler-tech-tree.md:74-76 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "Personal friendship must not gate communal rail reach; retain friendship itself and its existing lines.",
    "wording": null
  },
  {
    "id": "A61",
    "topic": "progression",
    "call": "Seeded chapter order",
    "source": "docs/proposals/boogler-tech-tree.md:64 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "A shuffled restoration tech tree is not the chosen rail frontier; network branch choices need their own design.",
    "wording": null
  },
  {
    "id": "A62",
    "topic": "progression",
    "call": "Four seasons over weeks",
    "source": "docs/proposals/boogler-tech-tree.md:25; docs/proposals/boogler-tech-tree.md:203-212 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "Conflict: boogle-2.md:43's approximately eight-hour arc wins over four restoration seasons and real-week gating.",
    "wording": null
  },
  {
    "id": "A63",
    "topic": "progression",
    "call": "No timers as gates or pay-to-skip",
    "source": "docs/proposals/boogler-tech-tree.md:38; docs/research/0.1/SETTLED.md:10 (when: By 2026-10-31)",
    "recommendation": "reword",
    "reason": "Rail rides and visible construction have duration; the intended protection is against waiting as progression friction.",
    "wording": "Do not gate rail progress on real-day attendance, cooldown chores or pay-to-skip. Travel and construction may take time when that time feels good in play."
  },
  {
    "id": "A64",
    "topic": "progression",
    "call": "No decay, breakage or repair",
    "source": "docs/research/0.1/SETTLED.md:10; docs/proposals/boogle-2.md:110; src/sim/gifts.ts:7 (when: By 2026-10-31; retained 2026-11-01)",
    "recommendation": "owner call",
    "reason": "Protect rail and town gains; the literal 'nothing decays' conflicts with thrown gifts expiring after 6,000 ticks. Decide whether transient cleanup is exempt; no code change proposed.",
    "wording": null
  },
  {
    "id": "A65",
    "topic": "progression",
    "call": "No hazards",
    "source": "docs/research/0.1/SETTLED.md:10; DESIGN.md:32-34 (when: By 2026-10-31)",
    "recommendation": "owner call",
    "reason": "SETTLED forbids hazards while DESIGN permits environmental threats; keep rail progress safe and decide whether any optional environmental danger remains.",
    "wording": null
  },
  {
    "id": "A66",
    "topic": "progression",
    "call": "Persist progress and show return changes",
    "source": "DESIGN.md:45-46; docs/proposals/boogler-tech-tree.md:27-39; docs/game-design.md:43 (when: Current principle; older examples)",
    "recommendation": "keep",
    "reason": "A visitor should see rail and town growth left by others; no revival of Boat Fund, crops or scheduled letters is implied.",
    "wording": null
  },
  {
    "id": "A67",
    "topic": "resources and hauling",
    "call": "Light resources; hotbar provisional",
    "source": "docs/proposals/boogle-2.md:92 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Retain the owner's non-survival direction and provisional hotbar; automatic rail supply makes inventory pressure less useful.",
    "wording": null
  },
  {
    "id": "A68",
    "topic": "resources and hauling",
    "call": "Harvest rather than collect resources",
    "source": "docs/proposals/boogle-2.md:93 (when: 2026-11-01, direction only)",
    "recommendation": "owner call",
    "reason": "Conflict: 2 November replaces manual resource management with camp automation; decide whether chopping survives only before rail reaches the frontier.",
    "wording": null
  },
  {
    "id": "A69",
    "topic": "resources and hauling",
    "call": "Back bundle remains the hauling form",
    "source": "docs/proposals/boogle-2.md:94; docs/proposals/boogle-2.md:97 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted owner approval remains: a compact, steady bundle with no sway or jump spill; 2 November questions its role, not its accepted feel.",
    "wording": null
  },
  {
    "id": "A70",
    "topic": "resources and hauling",
    "call": "Automatic pickup magnet elsewhere",
    "source": "docs/proposals/boogle-2.md:93-94 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Retain the liked button-free magnet as a pickup direction; it is not a reason to add mandatory resource gathering to connected camps.",
    "wording": null
  },
  {
    "id": "A71",
    "topic": "resources and hauling",
    "call": "Hauling after automation, Open 11",
    "source": "docs/proposals/boogle-2.md:210 (when: 2026-11-02)",
    "recommendation": "owner call",
    "reason": "Decide whether wood-age setup and an unconnected frontier need hand hauling; the director's suggestion is not an owner decision.",
    "wording": null
  },
  {
    "id": "A72",
    "topic": "resources and hauling",
    "call": "Wobbly stack, soft cap 20, jump spill",
    "source": "docs/research/0.1/SETTLED.md:13; PLAN.md:133; docs/proposals/boogle-2.md:221-222 (when: By 2026-10-31; rejected 2026-11-01)",
    "recommendation": "retire",
    "reason": "Conflict: boogle-2.md:97 and Changed:187 explicitly replace wobble and spill with the steady back bundle.",
    "wording": null
  },
  {
    "id": "A73",
    "topic": "resources and hauling",
    "call": "One material per age, real names",
    "source": "docs/research/0.1/SETTLED.md:13; docs/research/0.1/SETTLED.md:19 (when: By 2026-10-31)",
    "recommendation": "owner call",
    "reason": "Real material names are harmless, but camp types and fewer eras may need simultaneous goods; do not inherit one-material-per-age as a rail constraint.",
    "wording": null
  },
  {
    "id": "A74",
    "topic": "resources and hauling",
    "call": "Manual wagon loading begins at diesel",
    "source": "docs/research/0.1/SETTLED.md:14 (when: By 2026-10-31)",
    "recommendation": "retire",
    "reason": "Conflict: boogle-2.md:72 makes connected installations load goods automatically; automation cannot wait for diesel.",
    "wording": null
  },
  {
    "id": "A75",
    "topic": "resources and hauling",
    "call": "Pour by walking into work ring",
    "source": "docs/research/0.1/SETTLED.md:15; src/features/work-sites.ts:1-4 (when: By 2026-10-31; source-present)",
    "recommendation": "keep",
    "reason": "Retain the simple existing interaction wherever hand hauling is eventually retained; it does not settle how much hauling the rail loop needs.",
    "wording": null
  },
  {
    "id": "A76",
    "topic": "resources and hauling",
    "call": "Track-versus-helper investment",
    "source": "docs/research/0.1/SETTLED.md:15-17; src/features/helper-bank.ts:1-4 (when: By 2026-10-31; source-present)",
    "recommendation": "owner call",
    "reason": "The existing helper economy overlaps camp automation; decide whether huts survive as rail installations or remain historical testbed machinery.",
    "wording": null
  },
  {
    "id": "A77",
    "topic": "resources and hauling",
    "call": "Visible workers and one-section offline cap",
    "source": "docs/research/0.1/SETTLED.md:16; docs/game-design/haul.md:98-107 (when: By 2026-10-31)",
    "recommendation": "owner call",
    "reason": "Visible workers are proposed, the bank exists; rail output and offline town growth need a chosen cap rather than inheriting helper-only limits.",
    "wording": null
  },
  {
    "id": "A78",
    "topic": "resources and hauling",
    "call": "Own stack, fixed costs, more players faster",
    "source": "docs/research/0.1/SETTLED.md:18 (when: By 2026-10-31)",
    "recommendation": "keep",
    "reason": "Personal carrying and shared fixed projects let drop-ins help without spending others' inventory; new rail costs still require playtesting.",
    "wording": null
  },
  {
    "id": "A79",
    "topic": "resources and hauling",
    "call": "No spraying currency or ball income",
    "source": "docs/research/0.1/SETTLED.md:19; docs/research/0.1/SETTLED.md:26-28 (when: By 2026-10-31)",
    "recommendation": "keep",
    "reason": "Rail installations supply useful goods; arbitrary coins from bopping toys would turn optional play into farming.",
    "wording": null
  },
  {
    "id": "A80",
    "topic": "resources and hauling",
    "call": "No timer-driven groves",
    "source": "docs/research/0.1/SETTLED.md:27 (when: By 2026-10-31)",
    "recommendation": "reword",
    "reason": "Literal prohibition conflicts with automatic camp output over time; forbid waiting chores rather than the new network simulation.",
    "wording": "Do not add harvest cooldown chores or timer-gated groves. Connected camps may produce automatically over time as part of the rail loop."
  },
  {
    "id": "A81",
    "topic": "resources and hauling",
    "call": "Old 60-log testbed cost",
    "source": "docs/proposals/boogle-2.md:222; docs/game-design/haul.md:54; docs/game-design/net.md:22-23 (when: 0.1; prototype revised 2026-11-02)",
    "recommendation": "reword",
    "reason": "The rail prototype already tries 24 logs; neither that nor 60 is an approved final economy.",
    "wording": "The 0.1 testbed costs 60 logs per wood section; the rail-loop prototype tries 24. Final costs follow the rail prototype and the owner's decision on frontier hauling."
  },
  {
    "id": "A82",
    "topic": "resources and hauling",
    "call": "Current bundles, piles and stacks",
    "source": "src/features/log-sources.ts:1-5; src/features/piles.ts:1-3; src/features/haul-stack.ts:1-4 (when: Observed at audited commit)",
    "recommendation": "owner call",
    "reason": "Question the long-term resource loop while retaining the accepted bundle feel; these are source-present testbed systems, not proof of harvesting or a finished rail economy.",
    "wording": null
  },
  {
    "id": "A83",
    "topic": "resources and hauling",
    "call": "Current work sites and helper bank",
    "source": "src/features/work-sites.ts:1-4; src/features/helper-bank.ts:1-4; src/features/hut-build.ts:1-4 (when: Observed at audited commit)",
    "recommendation": "owner call",
    "reason": "Question permanent helper rings/bank; keep the piece-by-piece construction treatment for camps and towns, whose supply replaces repetitive hauling.",
    "wording": null
  },
  {
    "id": "A84",
    "topic": "resources and hauling",
    "call": "Watch construction; crates ride",
    "source": "docs/proposals/boogle-2.md:65; docs/proposals/boogle-2.md:83-84; src/features/track-machine.ts:1-4 (when: 2026-11-01 owner approval; source-present)",
    "recommendation": "keep",
    "reason": "Quoted construction approval and visible cargo make cause and effect legible: connecting a camp visibly grows the destination.",
    "wording": null
  },
  {
    "id": "A85",
    "topic": "resources and hauling",
    "call": "Quick laying, about 14 seconds",
    "source": "docs/proposals/boogle-2.md:64; docs/proposals/vertical-slice.md:48; docs/game-design/haul.md:93-96 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted owner approval wins over the slice's 50-second crawl; preserve the request to fix the animation-end jump, not the old duration.",
    "wording": null
  },
  {
    "id": "A86",
    "topic": "resources and hauling",
    "call": "Per-era laying machine, anyone starts",
    "source": "docs/research/0.1/SETTLED.md:6; docs/proposals/vertical-slice.md:32 (when: By 2026-10-31)",
    "recommendation": "keep",
    "reason": "A shared visible run fits rail construction; machine looks follow the reduced era list rather than committing to seven or eight asset sets.",
    "wording": null
  },
  {
    "id": "A87",
    "topic": "toys and side activities",
    "call": "Water and farming are not core",
    "source": "DESIGN.md:11; PLAN.md:59-113; docs/research/0.1/SETTLED.md:29; docs/proposals/directions.md:169 (when: Removed 2026-10-30; reaffirmed 2026-11-02)",
    "recommendation": "keep",
    "reason": "Keep removed digging/water and unbuilt crops out of the rail roadmap; swimming and splash scenery can remain.",
    "wording": null
  },
  {
    "id": "A88",
    "topic": "toys and side activities",
    "call": "Crop hydration and offline growth",
    "source": "PLAN.md:95-98 (when: Old plan; on hold by 2026-10-30)",
    "recommendation": "retire",
    "reason": "Soil hydration, planting/harvesting crops and timestamp growth are not unfinished pieces of the rail loop.",
    "wording": null
  },
  {
    "id": "A89",
    "topic": "toys and side activities",
    "call": "Visitor watering bonus and shared harvest",
    "source": "PLAN.md:99-103 (when: Old plan; on hold by 2026-10-30)",
    "recommendation": "retire",
    "reason": "Different-player bonuses remain a principle, but farming bonuses and island harvest totals should not become rail gates.",
    "wording": null
  },
  {
    "id": "A90",
    "topic": "toys and side activities",
    "call": "Reservoir weather and erosion",
    "source": "PLAN.md:140; PLAN.md:144 (when: Undated stretch ideas)",
    "recommendation": "retire",
    "reason": "Rain, drought, wet-sand slowdown and plant-anchored erosion depend on the displaced water/farm direction.",
    "wording": null
  },
  {
    "id": "A91",
    "topic": "toys and side activities",
    "call": "Ball-powered water wheel",
    "source": "PLAN.md:142; docs/proposals/directions.md:72 (when: Undated stretch; 2026-10-29/30)",
    "recommendation": "retire",
    "reason": "Requiring the ball to move water restores an obsolete core dependency instead of optional toy play.",
    "wording": null
  },
  {
    "id": "A92",
    "topic": "toys and side activities",
    "call": "Timed r/place garden",
    "source": "PLAN.md:143 (when: Undated stretch idea)",
    "recommendation": "retire",
    "reason": "One seed per interval is a different long-term activity, not a task for the rail progression pass.",
    "wording": null
  },
  {
    "id": "A93",
    "topic": "toys and side activities",
    "call": "Mini-games get a later pass",
    "source": "docs/proposals/boogle-2.md:175; docs/proposals/boogle-2.md:178; docs/proposals/boogle-2.md:200 (when: 2026-11-01; Open 2 still open)",
    "recommendation": "owner call",
    "reason": "Keep the later-pass boundary; owner must choose when it starts, after the rail loop has answered rather than as a prerequisite.",
    "wording": null
  },
  {
    "id": "A94",
    "topic": "toys and side activities",
    "call": "Topple cut; hop leads; golf wanted",
    "source": "docs/proposals/boogle-2.md:175; src/features/proto-minis.ts:1-4 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Recent owner verdict wins over the old court/soapbox/tide-first shortlist; hop and golf remain optional toys awaiting real mini-game design.",
    "wording": null
  },
  {
    "id": "A95",
    "topic": "toys and side activities",
    "call": "Court ball",
    "source": "docs/proposals/hub-and-minigames.md:45; docs/proposals/vertical-slice.md:115 (when: 2026-10-30; deferred 2026-11-01)",
    "recommendation": "keep",
    "reason": "Keep as a parked optional candidate, not an implemented scored sport or a rail-material source.",
    "wording": null
  },
  {
    "id": "A96",
    "topic": "toys and side activities",
    "call": "RC soapbox stays, drive beyond hill",
    "source": "docs/proposals/boogle-2.md:174; src/features/proto-soapbox.ts:1-5 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted 'pretty fun' verdict wins over gravity-only downhill plans; races are later ideas and transport by rail does not depend on racing.",
    "wording": null
  },
  {
    "id": "A97",
    "topic": "toys and side activities",
    "call": "Gravity-only soapbox, lighthouse race",
    "source": "docs/proposals/vehicles.md:32-49; docs/proposals/vertical-slice.md:107-111; docs/proposals/boogler-tech-tree.md:124; docs/proposals/hub-and-minigames.md:46 (when: 2026-10-29 to 2026-11-01)",
    "recommendation": "retire",
    "reason": "Conflict: accepted RC driving and redesigned home win; the old no-engine vehicle and fixed lighthouse course are not binding.",
    "wording": null
  },
  {
    "id": "A98",
    "topic": "toys and side activities",
    "call": "Melon regatta and raft",
    "source": "docs/proposals/hub-and-minigames.md:47; docs/proposals/boogler-tech-tree.md:127; docs/proposals/vehicles.md:87-94 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "Park the capsizing toy; whether any boat is needed for first sea access remains Open 13, not a commitment to melon cargo or a storm tide.",
    "wording": null
  },
  {
    "id": "A99",
    "topic": "toys and side activities",
    "call": "Sandcastle versus tide",
    "source": "docs/proposals/hub-and-minigames.md:48 (when: 2026-10-30 proposal)",
    "recommendation": "retire",
    "reason": "It depends on removed terrain/water play and cannot dictate the new rail world or restore the venue plan.",
    "wording": null
  },
  {
    "id": "A100",
    "topic": "toys and side activities",
    "call": "Boogler rodeo score",
    "source": "docs/proposals/hub-and-minigames.md:49 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "Existing ride/launch play can stay; timed endurance and distance scoring need a separate optional mini-game decision.",
    "wording": null
  },
  {
    "id": "A101",
    "topic": "toys and side activities",
    "call": "Mine-cart coin run",
    "source": "docs/proposals/hub-and-minigames.md:50 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "A cave toy is optional; leaning and coin collection are not requirements for riding the main transport train.",
    "wording": null
  },
  {
    "id": "A102",
    "topic": "toys and side activities",
    "call": "Timed coconut shy",
    "source": "docs/proposals/hub-and-minigames.md:51; docs/research/0.1/SETTLED.md:32 (when: 2026-10-30 proposal; stale 0.1 snapshot)",
    "recommendation": "retire",
    "reason": "Ball-driven fruit income conflicts with the no-income rule, and current gift sources no longer implement the advertised palm-fruit loop.",
    "wording": null
  },
  {
    "id": "A103",
    "topic": "toys and side activities",
    "call": "Water polo in dug pond",
    "source": "docs/proposals/hub-and-minigames.md:52; PLAN.md:141 (when: 2026-10-30 proposal)",
    "recommendation": "retire",
    "reason": "Dug ponds and sand goals require removed mechanics; optional swimming does not approve their return.",
    "wording": null
  },
  {
    "id": "A104",
    "topic": "toys and side activities",
    "call": "Mushroom hop and trick points",
    "source": "docs/proposals/hub-and-minigames.md:53; docs/proposals/boogle-2.md:175 (when: 2026-10-30; owner preference 2026-11-01)",
    "recommendation": "reword",
    "reason": "Hop survives as an owner-favoured toy; trick points were never selected and must not feed rail progress.",
    "wording": "Keep mushroom hop as an optional platforming toy. Decide scoring and rewards in the later mini-games pass; no rail progress depends on it."
  },
  {
    "id": "A105",
    "topic": "toys and side activities",
    "call": "Haggle rhythm toy",
    "source": "docs/proposals/hub-and-minigames.md:54; docs/proposals/boogler-tech-tree.md:91 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "An optional Boogler interaction can be reconsidered later; it must not finance town growth or alter protected lines as cleanup.",
    "wording": null
  },
  {
    "id": "A106",
    "topic": "toys and side activities",
    "call": "Shared verbs include dig and pile",
    "source": "docs/proposals/hub-and-minigames.md:17 (when: 2026-10-30 proposal)",
    "recommendation": "reword",
    "reason": "Reusing controls fits rail play, but removed sand verbs are not standing requirements.",
    "wording": "Optional mini-games reuse the current move, jump, throw, push and ride interactions where appropriate. Do not restore digging or sand piling merely to satisfy an old venue brief."
  },
  {
    "id": "A107",
    "topic": "toys and side activities",
    "call": "Vehicles must serve the ball",
    "source": "docs/proposals/vehicles.md:18; docs/proposals/boogler-tech-tree.md:41; docs/proposals/hub-and-minigames.md:99 (when: 2026-10-29/30)",
    "recommendation": "retire",
    "reason": "Conflict: DESIGN.md:20-22 explicitly lets rail and vehicles leave physics toys alone.",
    "wording": null
  },
  {
    "id": "A108",
    "topic": "toys and side activities",
    "call": "Stable, readable, simple vehicles",
    "source": "docs/proposals/vehicles.md:7-17 (when: 2026-10-29/30 research recommendations)",
    "recommendation": "keep",
    "reason": "Forgiving recovery, clear motion and contextual controls suit optional driving; do not turn the rail train into a precision driving challenge.",
    "wording": null
  },
  {
    "id": "A109",
    "topic": "toys and side activities",
    "call": "Puff Boost, drift charge and juice",
    "source": "docs/proposals/vehicles.md:51-70; docs/proposals/boogler-tech-tree.md:125 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "The RC soapbox verdict does not approve a friendship-gated boost or these charge numbers; retain only as optional later vehicle ideas.",
    "wording": null
  },
  {
    "id": "A110",
    "topic": "toys and side activities",
    "call": "Sand-wall shortcuts and wheel ruts",
    "source": "docs/proposals/vehicles.md:72-77; docs/proposals/vehicles.md:106; docs/proposals/boogler-tech-tree.md:132 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "Removed terrain editing cannot be assumed for routes or vehicle traces in the rail world.",
    "wording": null
  },
  {
    "id": "A111",
    "topic": "toys and side activities",
    "call": "Land yacht and wind skill",
    "source": "docs/proposals/vehicles.md:79-85; docs/proposals/boogler-tech-tree.md:126 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "Keep parked as an optional vehicle; neither wind simulation nor tacking is needed for automatic rail transport.",
    "wording": null
  },
  {
    "id": "A112",
    "topic": "toys and side activities",
    "call": "Melon pushcart",
    "source": "docs/proposals/vehicles.md:96-98; docs/proposals/boogler-tech-tree.md:123 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "A co-op cart could be a toy, but it must not recreate mandatory bulk hauling behind connected rail.",
    "wording": null
  },
  {
    "id": "A113",
    "topic": "toys and side activities",
    "call": "Buggy Ball with dug goals",
    "source": "docs/proposals/boogler-tech-tree.md:128 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "The removed sand-goal dependency and ball tie-in do not follow from the accepted RC soapbox.",
    "wording": null
  },
  {
    "id": "A114",
    "topic": "toys and side activities",
    "call": "Qozon carrying toy",
    "source": "docs/proposals/boogler-tech-tree.md:156 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "Park the cave pot as optional slapstick; it must never become a two-player rail progression gate.",
    "wording": null
  },
  {
    "id": "A115",
    "topic": "toys and side activities",
    "call": "Coconut Osh joke item",
    "source": "docs/proposals/boogler-tech-tree.md:157 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "Park new cooking interactions until the rail loop works; existing Boogler food lines remain intact.",
    "wording": null
  },
  {
    "id": "A116",
    "topic": "toys and side activities",
    "call": "Sand-built Tandir and flying bread",
    "source": "docs/proposals/boogler-tech-tree.md:158 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "The mechanical recipe depends on removed sand shaping; keep its draft prose as history, not a rail prerequisite.",
    "wording": null
  },
  {
    "id": "A117",
    "topic": "toys and side activities",
    "call": "Sumalak Night stirring event",
    "source": "docs/proposals/boogler-tech-tree.md:159 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "An optional gathering can complement travel; timed attendance rewards and distinct-stirrer requirements need consent, not inheritance.",
    "wording": null
  },
  {
    "id": "A118",
    "topic": "toys and side activities",
    "call": "Apricot grows over real weeks",
    "source": "docs/proposals/boogler-tech-tree.md:160 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "A real-week growth commitment is mismatched to the roughly eight-hour rail arc; preserve the tree's existing lore.",
    "wording": null
  },
  {
    "id": "A119",
    "topic": "toys and side activities",
    "call": "Suzani scraps collection",
    "source": "docs/proposals/boogler-tech-tree.md:170 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "Optional exploration collectibles may decorate rail destinations, but are not an approved new progression system.",
    "wording": null
  },
  {
    "id": "A120",
    "topic": "toys and side activities",
    "call": "Pattern stones and daily magic",
    "source": "docs/proposals/boogler-tech-tree.md:166-172; docs/proposals/directions.md:172 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "Daily pattern gates, fruit/water effects and mandatory knowledge belong to the displaced mystery loop.",
    "wording": null
  },
  {
    "id": "A121",
    "topic": "toys and side activities",
    "call": "Blue tile plaza and learned patterns",
    "source": "docs/proposals/boogler-tech-tree.md:172-174 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "Optional decoration could suit growing towns; the pattern-learning unlock and terrain-paint system remain unselected.",
    "wording": null
  },
  {
    "id": "A122",
    "topic": "toys and side activities",
    "call": "Pointless joke pages as a principle",
    "source": "docs/proposals/boogler-tech-tree.md:42; docs/proposals/boogler-tech-tree.md:40 (when: 2026-10-29/30 proposal)",
    "recommendation": "keep",
    "reason": "Keep room for purposeless humour beside rail progression; this does not require a joke feature in every chapter or authorize changing any lines.",
    "wording": null
  },
  {
    "id": "A123",
    "topic": "toys and side activities",
    "call": "Current ball, bump, impact and rest",
    "source": "src/physics/ball.ts:1; src/features/bump.ts:1-3; src/features/impact.ts:1-4; src/features/ball-rest.ts:1-3; PLAN.md:51-57 (when: Observed at audited commit)",
    "recommendation": "keep",
    "reason": "Keep as optional physics toys; their presence does not require the rail loop to produce new ball interactions or income.",
    "wording": null
  },
  {
    "id": "A124",
    "topic": "toys and side activities",
    "call": "Current throwing, hotbar and gifts",
    "source": "src/features/hotbar.ts:1-3; src/features/gifts.ts:1-10; src/physics/flight.ts:1; src/sim/gift-catalog.ts:1; PLAN.md:120-121 (when: Observed at audited commit)",
    "recommendation": "keep",
    "reason": "Keep optional throwable objects, frisbee and protected gift lines; the provisional hotbar need not become a resource-management chore.",
    "wording": null
  },
  {
    "id": "A125",
    "topic": "toys and side activities",
    "call": "Current mushrooms and stall",
    "source": "src/features/mushroom-garden.ts:1-8; src/main.ts:34; docs/game-design/mushrooms.md:3-19; PLAN.md:96 (when: Observed at audited commit)",
    "recommendation": "keep",
    "reason": "Keep planting, can watering and bouncing as optional toys; no crops, harvest economy or rail gate follows from them.",
    "wording": null
  },
  {
    "id": "A126",
    "topic": "toys and side activities",
    "call": "Current fish, gulls and fireflies",
    "source": "src/features/critter-fish.ts:1-6; src/features/critter-gulls.ts:1-4; src/features/critter-fireflies.ts:1-3 (when: Observed at audited commit)",
    "recommendation": "reword",
    "reason": "Make these optional scenery that gives camps, towns and journeys life; do not invent resource or quest obligations.",
    "wording": "Fish, gulls and fireflies are optional ambient life. They may react to players and toys, but do not produce resources or gate rail progress."
  },
  {
    "id": "A127",
    "topic": "toys and side activities",
    "call": "Current swimming, splashes and movement feel",
    "source": "src/features/splash.ts:1-3; src/features/feel.ts:1-11; src/physics/water-field.ts:1 (when: Observed at audited commit)",
    "recommendation": "keep",
    "reason": "Keep swimming, ripples, jumps and flops as pleasant traversal and play; a visible sea is not evidence of the removed shared water simulation.",
    "wording": null
  },
  {
    "id": "A128",
    "topic": "toys and side activities",
    "call": "Wave sound remains pending playtest",
    "source": "docs/proposals/boogle-2.md:130 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Retain the owner's undecided sound verdict without inferring a playable storm-tide system for rail.",
    "wording": null
  },
  {
    "id": "A129",
    "topic": "toys and side activities",
    "call": "Synthesized groove loop cut",
    "source": "docs/proposals/boogle-2.md:131; docs/proposals/boogle-2.md:185 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Keep silence until approved music exists; rail progression does not revive the rejected five-take placeholder.",
    "wording": null
  },
  {
    "id": "A130",
    "topic": "toys and side activities",
    "call": "Rejected mechanical sounds stay silent",
    "source": "docs/proposals/boogle-2.md:132; docs/proposals/vertical-slice.md:74-82 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Owner sound audit wins over old whistle/clack/stoke/grind/soapbox/opening-day effects; mechanics can remain while replacement sounds await references.",
    "wording": null
  },
  {
    "id": "A131",
    "topic": "toys and side activities",
    "call": "Accepted interaction sounds",
    "source": "docs/proposals/boogle-2.md:133 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Prompt, deny, haul count direction, honk, mini-game sounds, hut build, board whoosh and track machine remain feedback; accepted sounds do not revive cut games.",
    "wording": null
  },
  {
    "id": "A132",
    "topic": "toys and side activities",
    "call": "Sound tweaks require named references",
    "source": "docs/proposals/boogle-2.md:134 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Retain Fortnite/Ratchet & Clank references and requested subtlety; tune retained interactions without treating their old systems as rail requirements.",
    "wording": null
  },
  {
    "id": "A133",
    "topic": "toys and side activities",
    "call": "Honks make chords automatically",
    "source": "docs/proposals/boogle-2.md:135; PLAN.md:137; src/features/honk.ts:1-4 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Automatic harmony makes rail travel social without requiring a three-player progression ritual.",
    "wording": null
  },
  {
    "id": "A134",
    "topic": "toys and side activities",
    "call": "Coin per Bonk tally",
    "source": "docs/proposals/boogler-tech-tree.md:77 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "A no-income bonk counter is harmless optional play, but remains unbuilt and unselected; it must not become rail currency.",
    "wording": null
  },
  {
    "id": "A135",
    "topic": "toys and side activities",
    "call": "Seashell Consulting arrangement toy",
    "source": "docs/proposals/boogler-tech-tree.md:92 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "Park the self-resetting shell arrangement as optional humour; it is not part of rail construction, and its draft Boogler line stays.",
    "wording": null
  },
  {
    "id": "A136",
    "topic": "world and islands",
    "call": "Home grows, mainland stays final",
    "source": "docs/proposals/boogle-2.md:54-55 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted owner decision retained: the distant port is visible early and walkable late; growth effort belongs to home and other reached towns.",
    "wording": null
  },
  {
    "id": "A137",
    "topic": "world and islands",
    "call": "Islands independent of mini-games",
    "source": "docs/proposals/boogle-2.md:56 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted owner decision retained: places serve varied exploration and the rail network, not one mini-game per island.",
    "wording": null
  },
  {
    "id": "A138",
    "topic": "world and islands",
    "call": "Current island and line rejected",
    "source": "docs/proposals/boogle-2.md:66 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted owner verdict overrides any slice or layout brief treating the current court-to-lighthouse route as the target.",
    "wording": null
  },
  {
    "id": "A139",
    "topic": "world and islands",
    "call": "Home is a ground-up redesign",
    "source": "docs/proposals/boogle-2.md:67 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted owner decision retained: Big Walk-inspired folds, reveals, traversal unlocks and future land support walking and rail together.",
    "wording": null
  },
  {
    "id": "A140",
    "topic": "world and islands",
    "call": "Stepping-stone chain with branches and loops",
    "source": "docs/proposals/boogle-2.md:68 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted owner direction retained: a legible mainland frontier with shortcuts behind it; ring closure and link order remain open.",
    "wording": null
  },
  {
    "id": "A141",
    "topic": "world and islands",
    "call": "No empty ring interior",
    "source": "docs/proposals/boogle-2.md:68; docs/proposals/boogle-2.md:74 (when: 2026-11-01/02)",
    "recommendation": "keep",
    "reason": "Retain the owner's objection to a sparse middle; long crossings do not authorize an empty world between mandatory destinations.",
    "wording": null
  },
  {
    "id": "A142",
    "topic": "world and islands",
    "call": "Environment previz in real renderer",
    "source": "docs/proposals/boogle-2.md:69; docs/proposals/boogle-2.md:170 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted owner preference retained: high-preset captures at game camera make new rail routes and town visibility assessable.",
    "wording": null
  },
  {
    "id": "A143",
    "topic": "world and islands",
    "call": "Wagon is transportation; extra verbs cut",
    "source": "docs/proposals/boogle-2.md:70; docs/proposals/boogle-2.md:183 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted owner verdict retained: snatch, stoke and grind are cut; rail payoff is greater reach, not compulsory ride chores.",
    "wording": null
  },
  {
    "id": "A144",
    "topic": "world and islands",
    "call": "Show and bench variants cut",
    "source": "docs/proposals/boogle-2.md:71; docs/proposals/boogle-2.md:207 (when: 2026-11-02)",
    "recommendation": "reword",
    "reason": "Same-day conflict: the later quoted seat decision at line 76 wins narrowly; show and side-on camera remain cut.",
    "wording": "The wagon show and bench variants are retired. The later train-sitting decision restores a safe seated pose on the deck through Interact, not trackside show scenes or a side-on camera."
  },
  {
    "id": "A145",
    "topic": "world and islands",
    "call": "Train sitting returns",
    "source": "docs/proposals/boogle-2.md:76; docs/proposals/vertical-slice.md:81 (when: 2026-11-02)",
    "recommendation": "keep",
    "reason": "Quoted owner decision supersedes the earlier bench cut and no-Interact assumption; relaxed travel is part of rail's payoff.",
    "wording": null
  },
  {
    "id": "A146",
    "topic": "world and islands",
    "call": "Towns visible from hub and line",
    "source": "docs/proposals/boogle-2.md:73 (when: 2026-11-02)",
    "recommendation": "keep",
    "reason": "Quoted owner decision retained: home and reached towns visibly grow from deliveries; the mainland metropolis remains fixed.",
    "wording": null
  },
  {
    "id": "A147",
    "topic": "world and islands",
    "call": "Vast gaps and much faster trains",
    "source": "docs/proposals/boogle-2.md:74 (when: 2026-11-02)",
    "recommendation": "keep",
    "reason": "Quoted owner direction retained as a prototype target; old 200 m islands and 20–45 s rides are starting points only.",
    "wording": null
  },
  {
    "id": "A148",
    "topic": "world and islands",
    "call": "Default crossing 1.2 km at 20 m/s",
    "source": "docs/proposals/boogle-2.md:75 (when: 2026-11-02)",
    "recommendation": "keep",
    "reason": "Quoted playtest verdict wins over old map scales: about a minute by default; 4 km is novelty and 50 m/s belongs later.",
    "wording": null
  },
  {
    "id": "A149",
    "topic": "world and islands",
    "call": "Venue plan dropped",
    "source": "docs/proposals/boogle-2.md:77; docs/proposals/hub-and-minigames.md:34-36; docs/proposals/hub-and-minigames.md:118-120 (when: 2026-11-02)",
    "recommendation": "keep",
    "reason": "Quoted owner decision wins: retain useful land, replace the six-venue organising scheme with camps, towns and frontier.",
    "wording": null
  },
  {
    "id": "A150",
    "topic": "world and islands",
    "call": "Threefold Reach and Two-Bay Weave",
    "source": "docs/proposals/boogle-2.md:78 (when: 2026-11-02)",
    "recommendation": "keep",
    "reason": "Quoted acceptance makes these working picks, not final maps; greybox, distance scaling and visible home town still need validation.",
    "wording": null
  },
  {
    "id": "A151",
    "topic": "world and islands",
    "call": "Archipelago, varied island sizes, physical links",
    "source": "docs/proposals/boogle-2.md:80 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Keep the stepping-stone world with walkable/drivable physical connections; home being dense need not mean reusing the small current island.",
    "wording": null
  },
  {
    "id": "A152",
    "topic": "world and islands",
    "call": "Each new island is an era payoff",
    "source": "docs/proposals/boogle-2.md:80; docs/proposals/island-layout.md:105-112 (when: 2026-11-01)",
    "recommendation": "owner call",
    "reason": "Fewer eras and several rail-fed towns may break the one-island-per-era correspondence; retain anticipation, ask before locking the mapping.",
    "wording": null
  },
  {
    "id": "A153",
    "topic": "world and islands",
    "call": "Ride-only timetabled trains",
    "source": "docs/proposals/boogle-2.md:82 (when: Owner thread, by 2026-11-01)",
    "recommendation": "keep",
    "reason": "Automatic trains fit no-routing camp delivery and relaxed transport; technical implementation remains out of scope.",
    "wording": null
  },
  {
    "id": "A154",
    "topic": "world and islands",
    "call": "Pole signs at small stops",
    "source": "docs/proposals/boogle-2.md:85 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted owner acceptance retained: minimal signs at small stops, plaque variant dropped; this does not remove contribution credit plaques.",
    "wording": null
  },
  {
    "id": "A155",
    "topic": "world and islands",
    "call": "Only hubs fast travel",
    "source": "docs/proposals/boogle-2.md:86; docs/proposals/boogle-2.md:184; docs/proposals/hub-and-minigames.md:37 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Owner verdict wins over every-stop or every-venue teleport; major hubs get departures boards and minor stops preserve riding's value.",
    "wording": null
  },
  {
    "id": "A156",
    "topic": "world and islands",
    "call": "Rails from wood age",
    "source": "docs/proposals/boogle-2.md:87; docs/proposals/vertical-slice.md:141-143 (when: By 2026-11-01)",
    "recommendation": "keep",
    "reason": "Light rails introduce the core loop immediately; no plank-road pre-game or material grind before rail exists.",
    "wording": null
  },
  {
    "id": "A157",
    "topic": "world and islands",
    "call": "Rail spike proves riding first",
    "source": "docs/proposals/boogle-2.md:88 (when: By 2026-11-01)",
    "recommendation": "reword",
    "reason": "The riding spike is earlier evidence, not an instruction to restart before today's camp/town experiment.",
    "wording": "Retain riding feel as a requirement. The current experiments test whether rail-fed town growth compounds and whether long crossings reward taking the train."
  },
  {
    "id": "A158",
    "topic": "world and islands",
    "call": "First arrival across vast sea, Open 13",
    "source": "docs/proposals/boogle-2.md:212 (when: 2026-11-02)",
    "recommendation": "owner call",
    "reason": "Decide whether the rail reaches first or a boat scouts ahead; 'walk it before the rail does' cannot settle a kilometre of sea.",
    "wording": null
  },
  {
    "id": "A159",
    "topic": "world and islands",
    "call": "Old layout Open 6",
    "source": "docs/proposals/boogle-2.md:204; docs/proposals/island-layout.md:57-89 (when: 2026-11-01; replaced 2026-11-02)",
    "recommendation": "reword",
    "reason": "Conflict: later home redesign and working picks win over the old lab's A/B/C choice.",
    "wording": "The original island-layout question is superseded by the ground-up home redesign. Threefold Reach and Two-Bay Weave are working picks; greybox validation, town visibility, scale and ring closure remain open."
  },
  {
    "id": "A160",
    "topic": "world and islands",
    "call": "Lighthouse line recommended",
    "source": "docs/proposals/island-layout.md:57-71; docs/proposals/island-layout.md:129-132 (when: 2026-11-01)",
    "recommendation": "retire",
    "reason": "Conflict: boogle-2.md:66 explicitly rejects lighthouse-line; its research-check score cannot override the owner.",
    "wording": null
  },
  {
    "id": "A161",
    "topic": "world and islands",
    "call": "West Cove and East Bay options",
    "source": "docs/proposals/island-layout.md:73-89 (when: 2026-11-01)",
    "recommendation": "retire",
    "reason": "Retire as active candidates, retain as parked historical options; new home and network picks win.",
    "wording": null
  },
  {
    "id": "A162",
    "topic": "world and islands",
    "call": "Fixed spawn, court and garden",
    "source": "docs/proposals/island-layout.md:31-32 (when: 2026-11-01 lab constraint)",
    "recommendation": "retire",
    "reason": "A safety limit of the old lab is not a design restriction on the ground-up rail home.",
    "wording": null
  },
  {
    "id": "A163",
    "topic": "world and islands",
    "call": "25-second home, 150–300 m islands",
    "source": "docs/proposals/island-layout.md:37-50; docs/proposals/island-layout.md:116-120 (when: 2026-11-01 estimates)",
    "recommendation": "retire",
    "reason": "Conflict: the larger home and accepted 1.2 km crossing win; do not use old measurements as new-world caps.",
    "wording": null
  },
  {
    "id": "A164",
    "topic": "world and islands",
    "call": "Named island-to-era map",
    "source": "docs/proposals/island-layout.md:105-112 (when: 2026-11-01 placeholders)",
    "recommendation": "retire",
    "reason": "Mine Isle, Gary's Yard, Melon Isle, Outer Isles and Flats were placeholders, not approved destinations or required eight-era content.",
    "wording": null
  },
  {
    "id": "A165",
    "topic": "world and islands",
    "call": "Mainland skyline readable through distance",
    "source": "docs/proposals/island-layout.md:121-125; docs/proposals/boogle-2.md:54 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "A visible destination makes long rail progress legible; the technical fog solution is not decided by this audit.",
    "wording": null
  },
  {
    "id": "A166",
    "topic": "world and islands",
    "call": "In-island venues versus elevators",
    "source": "docs/proposals/hub-and-minigames.md:21-38; docs/proposals/hub-and-minigames.md:134 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "Choose optional mini-game placement in its later pass; the dropped venue plan does not choose room transitions or override hub-only fast travel.",
    "wording": null
  },
  {
    "id": "A167",
    "topic": "world and islands",
    "call": "Tiny nearby islets by raft or sandbar",
    "source": "docs/proposals/boogler-tech-tree.md:186-188; docs/proposals/directions.md:38 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "The main world now uses varied islands and long rail links; tide sandbars/currents and tiny-only islands are not standing travel rules.",
    "wording": null
  },
  {
    "id": "A168",
    "topic": "world and islands",
    "call": "Current lighthouse and frisbee perch",
    "source": "src/pois/lighthouse/index.ts:1-6; src/pois/lighthouse/index.ts:31-34; src/features/gifts.ts:1-10 (when: Observed at audited commit)",
    "recommendation": "reword",
    "reason": "Keep as optional landmark and toy stop, without forcing the redesigned home or first line to terminate there.",
    "wording": "The lighthouse is an optional lookout and frisbee destination. Preserve its play value while choosing its location from the new rail layout; it is not a mandatory restoration or first-era endpoint."
  },
  {
    "id": "A169",
    "topic": "world and islands",
    "call": "Current windmills",
    "source": "src/pois/windmills/index.ts:1-2; src/pois/windmills/index.ts:168-180 (when: Observed at audited commit)",
    "recommendation": "reword",
    "reason": "Make them optional scenery with retained sail bonks; a working windmill model does not approve crop production, power requirements or restoration gates.",
    "wording": "Windmills are optional landmarks and physical toys. Their sails may keep batting toys and players; no rail progress requires fruit, repairs, wind power or a windmill challenge."
  },
  {
    "id": "A170",
    "topic": "world and islands",
    "call": "Current caves, mine, pond and wine cellar",
    "source": "src/pois/caves/index.ts:1-11; src/pois/caves/decor.ts:1; src/features/pois.ts:5-10 (when: Observed at audited commit)",
    "recommendation": "keep",
    "reason": "Keep caves as optional exploration and scenery, consistent with the earlier keep-caves call; a decorative mine is not already a rail resource camp.",
    "wording": null
  },
  {
    "id": "A171",
    "topic": "world and islands",
    "call": "Current court and garden footprint",
    "source": "docs/game-design/pois.md:5-7; src/main.ts:29-34 (when: Observed at audited commit)",
    "recommendation": "owner call",
    "reason": "Keep their optional activities available, but question fixed central land allocation: the redesigned home must foreground town, hub and line.",
    "wording": null
  },
  {
    "id": "A172",
    "topic": "world and islands",
    "call": "Moonlit night; no sun/moon faces",
    "source": "docs/proposals/boogle-2.md:145; src/features/day-night.ts:1-5 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted owner decision retained: readable night travel and less cartoon sky faces suit the rail world; no new hazard clock implied.",
    "wording": null
  },
  {
    "id": "A173",
    "topic": "world and islands",
    "call": "Look is okay now; improve later",
    "source": "docs/proposals/boogle-2.md:139-140 (when: 2026-11-01/02)",
    "recommendation": "keep",
    "reason": "Both quoted owner decisions coexist: preserve today's acceptable look while reserving a later beauty pass for the expanding rail world.",
    "wording": null
  },
  {
    "id": "A174",
    "topic": "world and islands",
    "call": "High preset is the graphics target",
    "source": "docs/proposals/boogle-2.md:142; docs/proposals/visual-target.md:11-19; docs/proposals/visual-target.md:181-193 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Owner selection wins over the earlier ipad-preset recommendation; old estimates remain measurements/estimates, not permission to downgrade rail previz.",
    "wording": null
  },
  {
    "id": "A175",
    "topic": "world and islands",
    "call": "Generated rendered title/loading art",
    "source": "docs/proposals/boogle-2.md:141 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted rejection of flat vector/CSS scenes stands; preview candidates in the real screen and use a small animated accent.",
    "wording": null
  },
  {
    "id": "A176",
    "topic": "world and islands",
    "call": "UI that answers promoted",
    "source": "docs/proposals/boogle-2.md:143 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted approval stands; responsive prompts and feedback help make rail construction and return changes understandable.",
    "wording": null
  },
  {
    "id": "A177",
    "topic": "world and islands",
    "call": "No universal character rim light",
    "source": "docs/proposals/visual-target.md:114; docs/proposals/visual-target.md:181-182; docs/proposals/boogle-2.md:118 (when: 2026-11-01 experiment; 2026-11-02 owner review)",
    "recommendation": "reword",
    "reason": "Conflict: the latest Buddy review explicitly says no rim; an older universal rendering recommendation loses.",
    "wording": "Rim lighting is an optional look-lab experiment, not a requirement. Do not apply it to the Buddy; evaluate any other use separately against the current character and world direction."
  },
  {
    "id": "A178",
    "topic": "world and islands",
    "call": "Diorama/toybox as alternate targets",
    "source": "docs/proposals/visual-target.md:5-7; docs/proposals/visual-target.md:183-184 (when: 2026-11-01 experiment)",
    "recommendation": "reword",
    "reason": "Alternatives remain references, while the owner selected high and wants comparison with the separate character-session toybox.",
    "wording": "Keep diorama and lab toybox as comparison studies. The current target is high; compare it with the owner's character-session toybox before proposing a replacement."
  },
  {
    "id": "A179",
    "topic": "world and islands",
    "call": "Grass, detail, sway and readable paths",
    "source": "docs/proposals/visual-target.md:98-104; docs/proposals/visual-target.md:175-177 (when: 2026-11-01 experiment)",
    "recommendation": "keep",
    "reason": "Retain useful visual observations, especially that grass must not hide pickups, work sites or the railhead; no rendering implementation is prescribed.",
    "wording": null
  },
  {
    "id": "A180",
    "topic": "world and islands",
    "call": "Moonlight and style effects are experiments",
    "source": "docs/proposals/visual-target.md:105-116; docs/proposals/visual-target.md:164-174 (when: 2026-11-01 experiment)",
    "recommendation": "keep",
    "reason": "Historical judgements about AO, bloom, outlines, plastic and photo-mode tilt are evidence only; new rail settings require their own visual check.",
    "wording": null
  },
  {
    "id": "A181",
    "topic": "world and islands",
    "call": "Do not over-index on iPad",
    "source": "docs/proposals/boogle-2.md:164 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Owner direction retained: desktop and iPad both matter; rail scale and art should not be constrained by speculative device estimates.",
    "wording": null
  },
  {
    "id": "A182",
    "topic": "world and islands",
    "call": "M4 iPad Pro tentative floor",
    "source": "docs/proposals/boogle-2.md:165 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Keep the quoted owner's 'likely' M4 target as provisional, not confirmed device performance; rail design should not inherit the old 2021 iPad/Android floor.",
    "wording": null
  },
  {
    "id": "A183",
    "topic": "world and islands",
    "call": "Phone support, Open 4",
    "source": "docs/proposals/boogle-2.md:202 (when: Open after 2026-11-01)",
    "recommendation": "owner call",
    "reason": "Decide whether phones remain supported at lower quality or are dropped; the quoted tentative M4 floor stays kept and does not settle this audience question.",
    "wording": null
  },
  {
    "id": "A184",
    "topic": "world and islands",
    "call": "Network closure and link order",
    "source": "docs/proposals/boogle-2.md:68; docs/proposals/boogle-2.md:78 (when: Explicitly open 2026-11-01/02)",
    "recommendation": "owner call",
    "reason": "Choose which branches appear when and whether the chain closes; the director's direct Home-to-port final link is a recommendation, not an owner pick.",
    "wording": null
  },
  {
    "id": "A185",
    "topic": "world and islands",
    "call": "Keep counters out of sight",
    "source": "docs/proposals/boogler-tech-tree.md:43; docs/game-design/net.md:42 (when: 2026-10-29/30 proposal; rail prototype current)",
    "recommendation": "reword",
    "reason": "Visible rail/town change is useful; a blanket numerical ban could obscure the remaining frontier-haul choice.",
    "wording": "Show network progress through cargo, construction and town growth. Use a count only where it helps a player understand a concrete action; do not add a separate score for communal progress."
  },
  {
    "id": "A186",
    "topic": "eras",
    "call": "Eight named eras as mandatory sequence",
    "source": "docs/proposals/boogle-2.md:44-52; docs/research/0.1/SETTLED.md:4; docs/proposals/story-and-finale.md:3 (when: Earlier rounds; superseded 2026-11-02)",
    "recommendation": "reword",
    "reason": "Conflict: the quoted fewer-eras decision at boogle-2.md:43 wins; eight or seven asset suites are no longer commitments.",
    "wording": "Wood, steam, iron/coal, steel/harbour, diesel/concrete, electric, monorail and maglev are historical candidates. Build only the smaller era set the owner selects for the roughly eight-hour rail arc."
  },
  {
    "id": "A187",
    "topic": "eras",
    "call": "Which eras remain, Open 14",
    "source": "docs/proposals/boogle-2.md:213 (when: 2026-11-02)",
    "recommendation": "owner call",
    "reason": "Six is a working list, not approved: wood, steam, iron/harbour, diesel/concrete, electric bullet trains, future train; the owner is unsure about diesel despite liking its look.",
    "wording": null
  },
  {
    "id": "A188",
    "topic": "eras",
    "call": "Steam early and improving",
    "source": "docs/proposals/boogle-2.md:53 (when: Earlier rounds; updated 2026-11-02)",
    "recommendation": "keep",
    "reason": "Retain early steam and goofy industrial grime as rail progression identity; train upgrades can show growing capability.",
    "wording": null
  },
  {
    "id": "A189",
    "topic": "eras",
    "call": "Electric need not clear the air",
    "source": "docs/proposals/boogle-2.md:53 (when: 2026-11-02)",
    "recommendation": "keep",
    "reason": "Quoted owner reversal wins over the old pollution-to-clean-electric story; electric rail can change technology without mandatory clean skies.",
    "wording": null
  },
  {
    "id": "A190",
    "topic": "eras",
    "call": "Old lines upgrade; heritage loco remains",
    "source": "docs/proposals/boogle-2.md:57 (when: Owner thread, by 2026-11-01)",
    "recommendation": "keep",
    "reason": "Retained rail visibly compounds rather than becoming disposable; the heritage train preserves history without prescribing eight eras.",
    "wording": null
  },
  {
    "id": "A191",
    "topic": "eras",
    "call": "Reclaimed land and rising islands",
    "source": "docs/proposals/boogle-2.md:44; docs/proposals/island-layout.md:118-120 (when: Earlier rounds)",
    "recommendation": "owner call",
    "reason": "Rail expansion survives, but whether land appears or pre-existing islands become reachable needs a choice consistent with visible distant destinations.",
    "wording": null
  },
  {
    "id": "A192",
    "topic": "eras",
    "call": "Home late size and monorail city",
    "source": "docs/proposals/boogle-2.md:55; docs/proposals/boogle-2.md:78 (when: 2026-11-01/02, explicitly open)",
    "recommendation": "owner call",
    "reason": "Decide how large home becomes and what its final technology means; keep the mainland fixed and the growing home town visible.",
    "wording": null
  },
  {
    "id": "A193",
    "topic": "eras",
    "call": "Era review waits for level depth",
    "source": "docs/proposals/boogle-2.md:176 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted owner verdict retained: palette swaps alone cannot prove that towns and journeys look meaningfully better at each age.",
    "wording": null
  },
  {
    "id": "A194",
    "topic": "eras",
    "call": "Painted concept plus kits for every era",
    "source": "docs/proposals/boogle-2.md:126; docs/proposals/visual-target.md:169-171 (when: Earlier rounds; later previz rules 2026-11-01)",
    "recommendation": "reword",
    "reason": "Conflict: renderer-led previz and fewer eras win over mandatory painted concepts and eight building/vehicle kits.",
    "wording": "After the retained eras are chosen, prove each one's town, train and landscape in renderer-led previz. Commission only the building and vehicle kits that the rail slice actually needs; painted concepts remain references."
  },
  {
    "id": "A195",
    "topic": "eras",
    "call": "Era palette rows prove progression",
    "source": "docs/proposals/visual-target.md:53-55; docs/proposals/visual-target.md:214 (when: 2026-11-01 experiment)",
    "recommendation": "reword",
    "reason": "The report itself finds palette alone insufficient; rail-fed construction must carry the visible payoff, with no automatic clean-electric row.",
    "wording": "Era palette rows are supporting art experiments. Distinct town growth, trains and construction must make each retained era readable; electric does not automatically clear the air."
  },
  {
    "id": "A196",
    "topic": "eras",
    "call": "Wood-age name and camp look",
    "source": "docs/proposals/vertical-slice.md:31; docs/proposals/vertical-slice.md:141 (when: 2026-11-01 round 7)",
    "recommendation": "keep",
    "reason": "Use 'wood age' in-game; 'castaway camp' describes an old visual direction, not a required narrative or island layout.",
    "wording": null
  },
  {
    "id": "A197",
    "topic": "eras",
    "call": "Era ends at last section and ceremony",
    "source": "docs/proposals/vertical-slice.md:33-35; docs/proposals/vertical-slice.md:64-65 (when: 2026-10-31/11-01 proposal)",
    "recommendation": "owner call",
    "reason": "Decide whether rail reach, town growth or an optional celebration advances an era; the old three-section sequence cannot silently define the new loop.",
    "wording": null
  },
  {
    "id": "A198",
    "topic": "eras",
    "call": "Steam slice ends before iron sources",
    "source": "docs/proposals/vertical-slice.md:55-56; docs/proposals/vertical-slice.md:133-136 (when: 2026-10-31/11-01)",
    "recommendation": "retire",
    "reason": "Replan slice scope around a complete camp → delivery → town → reach cycle; an era-2 prop swap alone does not prove compounding.",
    "wording": null
  },
  {
    "id": "A199",
    "topic": "characters and story",
    "call": "Base before outfits",
    "source": "docs/proposals/boogle-2.md:115; docs/proposals/boogle-2.md:117 (when: 2026-11-01/02)",
    "recommendation": "keep",
    "reason": "Retain a settled bare body and modular head/body/hands/feet wear; optional looks must not distract from readable rail movement.",
    "wording": null
  },
  {
    "id": "A200",
    "topic": "characters and story",
    "call": "Direct mannequin controls and hand-made clips",
    "source": "docs/proposals/boogle-2.md:116 (when: 2026-11-02)",
    "recommendation": "keep",
    "reason": "Quoted owner enthusiasm wins: direct control, closer camera and humanoid clips are the accepted movement direction; polish/appearance remain.",
    "wording": null
  },
  {
    "id": "A201",
    "topic": "characters and story",
    "call": "Buddy is current player direction",
    "source": "docs/proposals/boogle-2.md:119 (when: 2026-11-02)",
    "recommendation": "keep",
    "reason": "Quoted 'liking this a lot' and the explicit supersession of Tracklayer customization make Buddy the working rail-world avatar; no final-art claim.",
    "wording": null
  },
  {
    "id": "A202",
    "topic": "characters and story",
    "call": "Buddy gaze, shoulders and conductor hat",
    "source": "docs/proposals/boogle-2.md:118 (when: 2026-11-02)",
    "recommendation": "keep",
    "reason": "Retain no rim, forward idle gaze, soft shoulders and straight brass-trim conductor cap; readable railway identity matches the loop.",
    "wording": null
  },
  {
    "id": "A203",
    "topic": "characters and story",
    "call": "Tracklayer is the player",
    "source": "docs/proposals/boogle-2.md:120 (when: 2026-11-02; displaced within the same record)",
    "recommendation": "reword",
    "reason": "Explicit conflict: the Buddy entry at line 119 wins as current direction and makes Tracklayer's role open; do not restart its customization rationale.",
    "wording": "The Tracklayer remains a fixed character design. The Buddy is the current player direction; whether the Tracklayer is an alternate player or a separate character remains an owner decision. Preserve the chosen name and reference."
  },
  {
    "id": "A204",
    "topic": "characters and story",
    "call": "Character-look track, Open 7",
    "source": "docs/proposals/boogle-2.md:205 (when: Proposed 2026-11-01; advanced 2026-11-02)",
    "recommendation": "reword",
    "reason": "Buddy and mannequin decisions supersede the yes/no question about starting a player track; Boogler redesign is still not selected.",
    "wording": "The player look track is underway with the Buddy on the accepted mannequin clips. Keep prototypes separate from claims about the base game. The Boogler's new model and the Tracklayer's role still need explicit choices."
  },
  {
    "id": "A205",
    "topic": "characters and story",
    "call": "Boogler becomes mayor in era 2",
    "source": "docs/proposals/boogle-2.md:121; docs/proposals/vertical-slice.md:99-103; docs/proposals/story-and-finale.md:12 (when: Earlier rounds, recorded by 2026-11-01)",
    "recommendation": "owner call",
    "reason": "Decide whether a mayor adds to visible town growth after the rail loop works; the personal friendship ladder stays separate and copy stays untouched.",
    "wording": null
  },
  {
    "id": "A206",
    "topic": "characters and story",
    "call": "Opening days end every era",
    "source": "docs/proposals/boogle-2.md:122-125; docs/proposals/vertical-slice.md:88-97; docs/proposals/story-and-finale.md:17-23 (when: Earlier rounds, recorded by 2026-11-01)",
    "recommendation": "owner call",
    "reason": "Decide whether celebrations are optional or progression gates; town growth should not secretly depend on a scripted mayor ceremony.",
    "wording": null
  },
  {
    "id": "A207",
    "topic": "characters and story",
    "call": "Any player may start a ceremony",
    "source": "docs/proposals/vertical-slice.md:90; docs/proposals/vertical-slice.md:142; docs/proposals/boogle-2.md:123 (when: 2026-11-01 round 7)",
    "recommendation": "keep",
    "reason": "If opening days survive, retain solo initiation and no head count; rail progress must never wait for a full group.",
    "wording": null
  },
  {
    "id": "A208",
    "topic": "characters and story",
    "call": "Shared scene, physics comedy",
    "source": "docs/proposals/boogle-2.md:124-125; docs/proposals/vertical-slice.md:91-92 (when: By 2026-11-01)",
    "recommendation": "keep",
    "reason": "If ceremonies survive, a shared readable event with incidental slapstick fits the rail world; this does not approve the old script or timing.",
    "wording": null
  },
  {
    "id": "A209",
    "topic": "characters and story",
    "call": "Gathering call and bell, Open 1",
    "source": "docs/proposals/boogle-2.md:199; docs/proposals/vertical-slice.md:49-54 (when: Open; research suggestion by 2026-11-01)",
    "recommendation": "owner call",
    "reason": "Choose whether opening days survive before choosing 45-second gathering, 10-second bell or 40-second scene; sound cuts at boogle-2.md:132 still apply.",
    "wording": null
  },
  {
    "id": "A210",
    "topic": "characters and story",
    "call": "Mundane stakes, absurd causes",
    "source": "docs/proposals/story-and-finale.md:9-12 (when: 2026-10-30 proposal)",
    "recommendation": "keep",
    "reason": "Ordinary town growth and player/Boogler comedy fit the rail premise without a save-the-world narrative obligation.",
    "wording": null
  },
  {
    "id": "A211",
    "topic": "characters and story",
    "call": "Moments first, systems second",
    "source": "docs/proposals/story-and-finale.md:13 (when: 2026-10-30 proposal)",
    "recommendation": "reword",
    "reason": "Conflict: mechanics-before-narrative at boogle-2.md:28 wins; comedy should emerge from the rail loop, not dictate its systems.",
    "wording": "Once the rail loop works, draft funny moments around its construction, arrivals and town changes. Add story-specific mechanics only when they improve that play."
  },
  {
    "id": "A212",
    "topic": "characters and story",
    "call": "Music narrates eras and ceremonies",
    "source": "docs/proposals/story-and-finale.md:20-25 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "Adaptive music remains an option; the owner's later sound audit cuts placeholder groove and ceremony sounds, so no soundtrack is approved by this brief.",
    "wording": null
  },
  {
    "id": "A213",
    "topic": "characters and story",
    "call": "Escalating mayor speeches",
    "source": "docs/proposals/story-and-finale.md:33; docs/proposals/vertical-slice.md:124 (when: 2026-10-30/11-01 proposal)",
    "recommendation": "owner call",
    "reason": "Park long speeches and three-honk interruption until mayor/era structure is chosen; rail travel should not wait on an eight-era gag schedule.",
    "wording": null
  },
  {
    "id": "A214",
    "topic": "characters and story",
    "call": "Always just missing Gary",
    "source": "docs/proposals/story-and-finale.md:34; docs/proposals/vertical-slice.md:121-122 (when: 2026-10-30/11-01 proposal)",
    "recommendation": "owner call",
    "reason": "Park new cameo beats for rail destinations; existing Gary gift lines survive regardless of the selected finale.",
    "wording": null
  },
  {
    "id": "A215",
    "topic": "characters and story",
    "call": "Fourth-melon clues each era",
    "source": "docs/proposals/story-and-finale.md:35; docs/proposals/fourth-melon.md:24-35; docs/proposals/boogler-tech-tree.md:175 (when: 2026-10-30/11-01 proposal)",
    "recommendation": "owner call",
    "reason": "Clues may reward optional exploration, but fewer eras and parked narrative mean no mandatory per-era reveal schedule.",
    "wording": null
  },
  {
    "id": "A216",
    "topic": "characters and story",
    "call": "Coconut mail evolves by era",
    "source": "docs/proposals/story-and-finale.md:36; docs/proposals/vertical-slice.md:123 (when: 2026-10-30/11-01 proposal)",
    "recommendation": "owner call",
    "reason": "Rail-delivered correspondence could fit later; coconut-to-maglev escalation and Oyijon's new replies remain collaborators' choices.",
    "wording": null
  },
  {
    "id": "A217",
    "topic": "characters and story",
    "call": "Town hall from crate to dome",
    "source": "docs/proposals/story-and-finale.md:37 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "A persistent visual callback could enrich rail-fed town growth, but the mayor and eight-stage prop sequence are unapproved.",
    "wording": null
  },
  {
    "id": "A218",
    "topic": "characters and story",
    "call": "Fourth melon parked",
    "source": "docs/proposals/boogle-2.md:193; docs/proposals/fourth-melon.md:3 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Keep reveal and new melon story choices with collaborators; parked status does not authorize changing existing lines for the rail revision.",
    "wording": null
  },
  {
    "id": "A219",
    "topic": "characters and story",
    "call": "Fourth-melon reveal A: plain balancing",
    "source": "docs/proposals/fourth-melon.md:41-46 (when: 2026-11-01 draft)",
    "recommendation": "owner call",
    "reason": "A warm anticlimax is a parked writing option, not a rail milestone or selected ending.",
    "wording": null
  },
  {
    "id": "A220",
    "topic": "characters and story",
    "call": "Fourth-melon reveal B: Boogler as baby",
    "source": "docs/proposals/fourth-melon.md:48-53 (when: 2026-11-01 draft)",
    "recommendation": "owner call",
    "reason": "The family reveal remains unchosen; do not make character art or rail destination requirements from it.",
    "wording": null
  },
  {
    "id": "A221",
    "topic": "characters and story",
    "call": "Fourth-melon reveal C: friends carry it",
    "source": "docs/proposals/fourth-melon.md:55-60 (when: 2026-11-01 draft)",
    "recommendation": "owner call",
    "reason": "Cooperation can fit rail building, but the manual-haul moral no longer defines the game; collaborators choose the joke.",
    "wording": null
  },
  {
    "id": "A222",
    "topic": "characters and story",
    "call": "Melon replacement rewrites existing copy",
    "source": "docs/proposals/fourth-melon.md:64-70; docs/proposals/fourth-melon.md:77; AGENTS.md:12 (when: 2026-11-01 proposal; standing protection current)",
    "recommendation": "retire",
    "reason": "Retire this as cleanup authorization: AGENTS.md and the task win. Existing mom0, melon backstory and gift lines are out of scope, not candidates to trim.",
    "wording": null
  },
  {
    "id": "A223",
    "topic": "characters and story",
    "call": "Reveal place and clue medium",
    "source": "docs/proposals/fourth-melon.md:74-76 (when: 2026-11-01 open questions)",
    "recommendation": "owner call",
    "reason": "Choose later whether a gag pays off at the mainland or earlier and through props, letters or both; it cannot prescribe rail gating now.",
    "wording": null
  },
  {
    "id": "A224",
    "topic": "characters and story",
    "call": "Ending remains open and parked",
    "source": "docs/proposals/boogle-2.md:60; docs/proposals/boogle-2.md:194; docs/proposals/story-and-finale.md:96 (when: By 2026-11-01)",
    "recommendation": "keep",
    "reason": "The rail loop may promise a mainland destination without selecting a finale or reopening parked writing work.",
    "wording": null
  },
  {
    "id": "A225",
    "topic": "characters and story",
    "call": "Grand Parade finale",
    "source": "docs/proposals/story-and-finale.md:63-70 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "Trains can celebrate the built network, but the Grand Loop, driver roles and eight train sets are unchosen and partly conflict with ride-only trains.",
    "wording": null
  },
  {
    "id": "A226",
    "topic": "characters and story",
    "call": "Last train to mainland finale",
    "source": "docs/proposals/story-and-finale.md:72-77 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "Best direct fit to the current destination, but Oyijon, four melons, dinner and save-reactive praise remain parked choices.",
    "wording": null
  },
  {
    "id": "A227",
    "topic": "characters and story",
    "call": "Melon moon launch finale",
    "source": "docs/proposals/story-and-finale.md:79-86 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "Optional epilogue only if chosen; mixed-play cargo and a new moon must not replace rail-fed growth or override the newer sky direction.",
    "wording": null
  },
  {
    "id": "A228",
    "topic": "characters and story",
    "call": "Finale calendar vote and attendance",
    "source": "docs/proposals/story-and-finale.md:58-61; docs/proposals/story-and-finale.md:98 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "Multi-day scheduling conflicts with drop-in eight-hour play if it gates progress; prefer a later decision about voluntary gatherings and replays.",
    "wording": null
  },
  {
    "id": "A229",
    "topic": "characters and story",
    "call": "Absent friends represented; replay later",
    "source": "docs/proposals/story-and-finale.md:61; docs/proposals/story-and-finale.md:70; docs/proposals/story-and-finale.md:77-84 (when: 2026-10-30 proposal)",
    "recommendation": "keep",
    "reason": "As a conditional finale requirement, echoes and traces let rail collaborators miss a session without losing the payoff.",
    "wording": null
  },
  {
    "id": "A230",
    "topic": "characters and story",
    "call": "Finale reacts to each friend's history",
    "source": "docs/proposals/story-and-finale.md:67; docs/proposals/story-and-finale.md:99 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "Decide whether the narrative needs delivered colours, hats or knacks; no unchosen reward ledger should drive rail implementation now.",
    "wording": null
  },
  {
    "id": "A231",
    "topic": "characters and story",
    "call": "Book ending: leave and return with Oyijon",
    "source": "docs/proposals/boogler-tech-tree.md:197 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "Park this older option; removing Boogler for real days is not implied by an eight-hour rail arc.",
    "wording": null
  },
  {
    "id": "A232",
    "topic": "characters and story",
    "call": "Book ending: island is a blob",
    "source": "docs/proposals/boogler-tech-tree.md:198 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "Steering the whole island toward Uzbekistan is an alternative world model, not the selected fixed archipelago and mainland rail goal.",
    "wording": null
  },
  {
    "id": "A233",
    "topic": "characters and story",
    "call": "Book ending: bring Samarqand here",
    "source": "docs/proposals/boogler-tech-tree.md:199 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "Keep as parked story inspiration for growing towns, not an approved replacement for reaching the mainland.",
    "wording": null
  },
  {
    "id": "A234",
    "topic": "characters and story",
    "call": "No petting Boogler",
    "source": "docs/proposals/boogle-2.md:151; PLAN.md:117 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted owner decision wins over PLAN's pet-for-friendship description; retained friendship should remain respectful optional play.",
    "wording": null
  },
  {
    "id": "A235",
    "topic": "characters and story",
    "call": "Current Boogler friendship, talk and launches",
    "source": "src/features/boogler.ts:1-18; src/boogler/play.ts:299-320; src/boogler/friendship.ts:1; src/boogler/talk.ts:119; docs/proposals/boogler-tech-tree.md:23; PLAN.md:118-119 (when: Observed at audited commit)",
    "recommendation": "keep",
    "reason": "Keep him and his personal relationship as optional character play; mayor status and an economic tech tree are not established by the code.",
    "wording": null
  },
  {
    "id": "A236",
    "topic": "characters and story",
    "call": "Current dino and guest",
    "source": "src/features/dino.ts:1-9; docs/game-design/dino-and-guest.md:3-25 (when: Observed at audited commit)",
    "recommendation": "owner call",
    "reason": "Question how the optional guest's full movement coexists with Buddy and later movement unlocks; keep the dino as optional scenery pending that choice, with no renaming or ROM-data proposal.",
    "wording": null
  },
  {
    "id": "A237",
    "topic": "characters and story",
    "call": "Existing Boogler narrative references",
    "source": "src/boogler/lines.ts:317-330; src/boogler/lines.ts:677; src/boogler/lines.ts:695; src/boogler/lines.ts:832; src/sim/gift-catalog.ts:1; docs/proposals/fourth-melon.md:7-20 (when: Observed at audited commit)",
    "recommendation": "keep",
    "reason": "Fourth melon, book, ball insurance and boat ambitions are protected character copy, not implementation instructions for the rail economy.",
    "wording": null
  },
  {
    "id": "A238",
    "topic": "characters and story",
    "call": "Boogler narrates every progression page",
    "source": "docs/proposals/boogler-tech-tree.md:18 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "Park new narration until the rail loop works; the existing character voice stays, but each connection need not require a book chapter or speech.",
    "wording": null
  },
  {
    "id": "A239",
    "topic": "characters and story",
    "call": "The ending is already written in the lore",
    "source": "docs/proposals/boogler-tech-tree.md:19 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "Conflict: boogle-2.md:60,194 explicitly leave the finale open; existing boat and Oyijon lines are aspirations, not binding rail-ending requirements.",
    "wording": null
  },
  {
    "id": "A240",
    "topic": "rewards",
    "call": "Communal network, personal earnings",
    "source": "DESIGN.md:36-37; docs/proposals/boogle-2.md:102-105; docs/game-design.md:40 (when: Current principle)",
    "recommendation": "keep",
    "reason": "Rail and town progress belong to the room; earned looks belong to the player, with no shared spendable wallet.",
    "wording": null
  },
  {
    "id": "A241",
    "topic": "rewards",
    "call": "Som personal cosmetic coin",
    "source": "docs/proposals/boogle-2.md:104; docs/proposals/hub-and-minigames.md:70; docs/proposals/hub-and-minigames.md:135 (when: Earlier rounds; named by 2026-11-01)",
    "recommendation": "owner call",
    "reason": "Decide whether som is still needed alongside rail progression; if retained it buys looks only, never rail access, and the old naming question is already answered.",
    "wording": null
  },
  {
    "id": "A242",
    "topic": "rewards",
    "call": "Knacks per activity",
    "source": "docs/proposals/boogle-2.md:105; docs/proposals/hub-and-minigames.md:68; docs/proposals/hub-and-minigames.md:74 (when: Earlier rounds, by 2026-11-01)",
    "recommendation": "owner call",
    "reason": "Options-not-power remains a useful limit, but per-activity levels and a 1.07–1.15 cost curve are not required for the rail loop.",
    "wording": null
  },
  {
    "id": "A243",
    "topic": "rewards",
    "call": "Mini-games pay personal rewards only",
    "source": "docs/proposals/boogle-2.md:100; docs/proposals/vertical-slice.md:140; docs/proposals/progression-paths.md:12 (when: 2026-11-01 round 7)",
    "recommendation": "keep",
    "reason": "Keep the no-prize-piles slice decision; the old occasional-progress bonus conflicts with unresolved 'play is the material' and must not bypass rail supply.",
    "wording": null
  },
  {
    "id": "A244",
    "topic": "rewards",
    "call": "Earned cosmetics, no real-money shop",
    "source": "docs/proposals/hub-and-minigames.md:66; PLAN.md:101 (when: 2026-10-30 proposal)",
    "recommendation": "keep",
    "reason": "Optional hats, colours and vehicle looks can reward play without monetizing or gating the rail network; no catalog is approved.",
    "wording": null
  },
  {
    "id": "A245",
    "topic": "rewards",
    "call": "Personal beach hut and furnishing",
    "source": "docs/proposals/hub-and-minigames.md:67; docs/proposals/hub-and-minigames.md:75 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "An online-only personal hut and idle coconut press compete for land and attention with growing communal towns; they are not current commitments.",
    "wording": null
  },
  {
    "id": "A246",
    "topic": "rewards",
    "call": "Matching hats for repeat partners",
    "source": "docs/proposals/hub-and-minigames.md:69; docs/proposals/hub-and-minigames.md:136 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "Choose whether repeated-pair rewards create attendance pressure; rail cooperation already benefits everyone without tracking friendships.",
    "wording": null
  },
  {
    "id": "A247",
    "topic": "rewards",
    "call": "No daily quests or absence penalties",
    "source": "docs/proposals/hub-and-minigames.md:76; docs/proposals/boogler-tech-tree.md:27 (when: 2026-10-29/30 proposal)",
    "recommendation": "keep",
    "reason": "Returning to improved rail and towns should feel welcoming, not like recovering missed chores or lost progress.",
    "wording": null
  },
  {
    "id": "A248",
    "topic": "rewards",
    "call": "Party attendance earns exclusive items",
    "source": "docs/proposals/hub-and-minigames.md:90-92 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "Optional gatherings and unstaffed play props can fit; exclusive attendance items need a decision compatible with drop-in play and absent rail builders.",
    "wording": null
  },
  {
    "id": "A249",
    "topic": "rewards",
    "call": "Party donations fund Gary's boat",
    "source": "docs/proposals/hub-and-minigames.md:93; docs/proposals/hub-and-minigames.md:115 (when: 2026-10-30 proposal)",
    "recommendation": "retire",
    "reason": "A som-fed communal Boat Fund conflicts with the personal-looks-only economy and replaces rail as the shared progression thread.",
    "wording": null
  },
  {
    "id": "A250",
    "topic": "rewards",
    "call": "Rotating Emporium shop",
    "source": "docs/proposals/hub-and-minigames.md:115 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "A cosmetic shop is optional if som survives; rotating stock must not become a return timer or rail gate.",
    "wording": null
  },
  {
    "id": "A251",
    "topic": "rewards",
    "call": "Book becomes mini-game stamp book",
    "source": "docs/proposals/hub-and-minigames.md:116 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "Park optional collection rather than promoting an unchosen activity ledger to the new rail brief.",
    "wording": null
  },
  {
    "id": "A252",
    "topic": "rewards",
    "call": "Partner card grants cosmetics",
    "source": "docs/proposals/boogler-tech-tree.md:35 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "Decide whether construction credit earns personal looks; a 45-page restoration card is not implied by communal rail progress.",
    "wording": null
  },
  {
    "id": "A253",
    "topic": "rewards",
    "call": "Boat Fund is not a shared wallet loophole",
    "source": "docs/proposals/boogler-tech-tree.md:36; docs/proposals/boogler-tech-tree.md:94-112 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "Having an NPC spend the pot still creates a competing economy; rail deliveries now grow the world, with existing money-related lines preserved.",
    "wording": null
  },
  {
    "id": "A254",
    "topic": "rewards",
    "call": "Stall built from driftwood and a regular",
    "source": "docs/proposals/boogler-tech-tree.md:86 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "Retire this book-page gate; rail-fed town construction replaces a prescribed 10-driftwood stall project, while its draft line stays intact.",
    "wording": null
  },
  {
    "id": "A255",
    "topic": "rewards",
    "call": "Boat Fund 15% curve and visitor multipliers",
    "source": "docs/proposals/boogler-tech-tree.md:96-100 (when: 2026-10-29/30 tuning guesses)",
    "recommendation": "retire",
    "reason": "Exponential purchases, daily visitor rates and a 12-hour cap are unselected idle-economy rules, not rail-town tuning.",
    "wording": null
  },
  {
    "id": "A256",
    "topic": "rewards",
    "call": "Ball Insurance pays coins",
    "source": "docs/proposals/boogler-tech-tree.md:111 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "Conflict: DESIGN.md:22 and boogle-2.md:111 prohibit ball income; keep the existing Ball Insurance dialogue untouched.",
    "wording": null
  },
  {
    "id": "A257",
    "topic": "rewards",
    "call": "Pattern skins and doppi embroidery",
    "source": "docs/proposals/boogler-tech-tree.md:174 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "Optional personal patterns fit, but the discarded pattern puzzle should not automatically become their unlock method.",
    "wording": null
  },
  {
    "id": "A258",
    "topic": "rewards",
    "call": "No sponsor plaques",
    "source": "docs/proposals/boogle-2.md:106 (when: Owner thread, by 2026-11-01)",
    "recommendation": "keep",
    "reason": "Rail work may receive positive credit; nobody buys naming rights or ownership of the communal line.",
    "wording": null
  },
  {
    "id": "A259",
    "topic": "rewards",
    "call": "Contribution tiers grant personal upgrades",
    "source": "docs/research/0.1/SETTLED.md:17; docs/proposals/vertical-slice.md:39 (when: By 2026-10-31)",
    "recommendation": "owner call",
    "reason": "Tiers are retained data only, while towns now grant reach upgrades; decide whether any tier reward remains and keep it from gating the shared network.",
    "wording": null
  },
  {
    "id": "A260",
    "topic": "rewards",
    "call": "No contribution label on players",
    "source": "docs/proposals/boogle-2.md:153; src/features/haul-stack.ts:1-3 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted owner rejection of 'Porter' wins; no visible work rank or moral score belongs on a drop-in rail builder.",
    "wording": null
  },
  {
    "id": "A261",
    "topic": "rewards",
    "call": "Top-four credit plaques",
    "source": "docs/game-design/haul.md:60-65; docs/research/0.1/SETTLED.md:23 (when: Source-described current testbed)",
    "recommendation": "owner call",
    "reason": "Current top-four ordering can still read as ranking despite positive-only intent; decide how rail contributions are thanked without shaming non-builders.",
    "wording": null
  },
  {
    "id": "A262",
    "topic": "rewards",
    "call": "Soapbox completion awards era hat",
    "source": "docs/proposals/vertical-slice.md:119 (when: 2026-10-31/11-01 proposal)",
    "recommendation": "owner call",
    "reason": "A cosmetic hat can remain optional, but do not bind the new rail slice to a race or assume straw/brass-goggle rewards were playtested.",
    "wording": null
  },
  {
    "id": "A263",
    "topic": "rewards",
    "call": "Post-finale open toy box",
    "source": "docs/proposals/boogle-2.md:59; docs/proposals/story-and-finale.md:91 (when: By 2026-11-01)",
    "recommendation": "keep",
    "reason": "Built rail, towns and toys remain enjoyable after the finite arc; this does not mandate one operational train for every discarded era.",
    "wording": null
  },
  {
    "id": "A264",
    "topic": "rewards",
    "call": "Completion museum of us",
    "source": "docs/proposals/story-and-finale.md:92 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "A no-ranking history display could celebrate shared rail, but all-project completion and recorded best moments are not selected requirements.",
    "wording": null
  },
  {
    "id": "A265",
    "topic": "rewards",
    "call": "Gifts converted into Boat Fund coins",
    "source": "docs/proposals/boogler-tech-tree.md:87 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "Automatic camp goods replace gift conversion as the shared economy; retain the existing Pricing joke and gift lines.",
    "wording": null
  },
  {
    "id": "A266",
    "topic": "rewards",
    "call": "Signage requires paint and two regulars",
    "source": "docs/proposals/boogler-tech-tree.md:88 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "A material-and-attendance gate for a shop sign does not serve rail reach; preserve positive credit and the draft line without inheriting its recipe.",
    "wording": null
  },
  {
    "id": "A267",
    "topic": "rewards",
    "call": "Passive income after three regulars",
    "source": "docs/proposals/boogler-tech-tree.md:90 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "Rail connections, not a visitor-count gate, should start automatic supply; the Passive Income joke remains protected text.",
    "wording": null
  },
  {
    "id": "A268",
    "topic": "rewards",
    "call": "Raft turns into hat joke",
    "source": "docs/proposals/boogler-tech-tree.md:122 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "A harmless personal hat is a parked option; it neither chooses how to cross the sea nor commits a rail slice to crafting.",
    "wording": null
  },
  {
    "id": "A269",
    "topic": "co-op",
    "call": "Automatic cooperation",
    "source": "DESIGN.md:28-30; docs/game-design.md:38 (when: Current principle)",
    "recommendation": "keep",
    "reason": "Any useful connection helps everyone; different-player bonuses may encourage company but must not become attendance gates.",
    "wording": null
  },
  {
    "id": "A270",
    "topic": "co-op",
    "call": "Protect other players' progress",
    "source": "DESIGN.md:32-34; docs/game-design.md:39 (when: Current principle)",
    "recommendation": "keep",
    "reason": "Keep rail and towns safe from theft or destruction; this principle permits environmental threats but does not require adding them.",
    "wording": null
  },
  {
    "id": "A271",
    "topic": "co-op",
    "call": "Solo pleasant, random arrivals",
    "source": "DESIGN.md:42-43; docs/proposals/boogle-2.md:34; docs/proposals/boogle-2.md:168 (when: Current; reaffirmed 2026-11-01)",
    "recommendation": "keep",
    "reason": "Every rail experiment must work solo; helpers make it better without a full lobby, minimum count or coordinated start.",
    "wording": null
  },
  {
    "id": "A272",
    "topic": "co-op",
    "call": "Design for 1–6 versus room cap 8",
    "source": "DESIGN.md:43; docs/game-design.md:15 (when: Current documents)",
    "recommendation": "reword",
    "reason": "Distinguish intended social scale from the implemented room cap; neither makes rail progress require six or eight players.",
    "wording": "Design for a pleasant solo session and a small group that can join and leave freely. The current room cap is eight; no rail milestone requires a particular player count."
  },
  {
    "id": "A273",
    "topic": "co-op",
    "call": "Solo-first playtest order",
    "source": "PLAN.md:11; docs/proposals/vertical-slice.md:12; docs/proposals/vertical-slice.md:128; DESIGN.md:106 (when: Old 2–4-player instructions; reversed 2026-11-01)",
    "recommendation": "reword",
    "reason": "Conflict: current DESIGN and boogle-2.md:168 win over required group testing as the first proof of rail fun.",
    "wording": "Prove each rail question with one player first, then check that friends joining and leaving improve the experience. Group attendance is not a prerequisite for the first playtest."
  },
  {
    "id": "A274",
    "topic": "co-op",
    "call": "Build prototypes in parallel, test in order",
    "source": "docs/proposals/boogle-2.md:172 (when: 2026-11-01)",
    "recommendation": "reword",
    "reason": "Keep independent iteration, but an old hauling verdict no longer determines every later prototype; the latest rail questions lead.",
    "wording": "Independent prototypes may be built in parallel. Evaluate the current rail-loop and crossing questions in the agreed order, and let their results shape the slice and home redesign."
  },
  {
    "id": "A275",
    "topic": "co-op",
    "call": "Scores avoid splitting friends",
    "source": "docs/proposals/hub-and-minigames.md:58; docs/proposals/hub-and-minigames.md:104 (when: 2026-10-30 proposal)",
    "recommendation": "keep",
    "reason": "If optional games gain scores, favour personal bests, team results and shared bonuses; rail contributions should not become a competition.",
    "wording": null
  },
  {
    "id": "A276",
    "topic": "co-op",
    "call": "Honk and ping remain social tools",
    "source": "src/features/honk.ts:1-4; src/features/ping.ts:1-4; docs/research/0.1/SETTLED.md:40 (when: Observed at audited commit)",
    "recommendation": "keep",
    "reason": "Keep spontaneous signals during construction and journeys; they communicate without requiring chat or granting material.",
    "wording": null
  },
  {
    "id": "A277",
    "topic": "co-op",
    "call": "Three-person honk gate and little bell",
    "source": "docs/proposals/boogler-tech-tree.md:28; docs/proposals/boogler-tech-tree.md:89; docs/game-design.md:38 (when: 2026-10-29/30; stale pillar example)",
    "recommendation": "reword",
    "reason": "Automatic harmony survives, but a three-player gate and required attendance conflict with solo rail play.",
    "wording": "Honk chords and any optional bell are social feedback, not progression gates. Rail construction and celebrations must be available to one player; no three-person chord is required."
  },
  {
    "id": "A278",
    "topic": "co-op",
    "call": "Era-specific whistles, flares and radios",
    "source": "docs/proposals/story-and-finale.md:43-50 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "Larger rail distances may need signals, but none of these tools is approved and wagon whistle audio was subsequently cut.",
    "wording": null
  },
  {
    "id": "A279",
    "topic": "co-op",
    "call": "Folk communication games",
    "source": "docs/proposals/story-and-finale.md:51 (when: 2026-10-30 proposal)",
    "recommendation": "owner call",
    "reason": "Charades and blindfolded handcar directions can only be optional games; the rail loop must remain usable without negotiated coordination.",
    "wording": null
  },
  {
    "id": "A280",
    "topic": "co-op",
    "call": "Traces of where friends went",
    "source": "docs/proposals/story-and-finale.md:52; docs/proposals/boogler-tech-tree.md:39 (when: 2026-10-29/30 proposal)",
    "recommendation": "keep",
    "reason": "Visible built track and town changes already support asynchronous gratitude; extra lamps/liveries are examples, not required new systems.",
    "wording": null
  },
  {
    "id": "A281",
    "topic": "co-op",
    "call": "Coconut letters, three exchanges, keepsakes",
    "source": "docs/proposals/boogler-tech-tree.md:140-141; docs/proposals/hub-and-minigames.md:121 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "Optional messages could enrich returning visits, but no coconut delivery system or text-policy choice follows from the rail loop.",
    "wording": null
  },
  {
    "id": "A282",
    "topic": "co-op",
    "call": "Lighthouse post-office restoration",
    "source": "docs/proposals/boogler-tech-tree.md:142; docs/proposals/hub-and-minigames.md:117 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "Fruit, shell, mushroom and three-friend requirements would gate shared services behind side activities; preserve lighthouse exploration.",
    "wording": null
  },
  {
    "id": "A283",
    "topic": "co-op",
    "call": "Seagull courier and ball recovery",
    "source": "docs/proposals/boogler-tech-tree.md:143 (when: 2026-10-29/30 proposal)",
    "recommendation": "owner call",
    "reason": "A comic courier remains optional; existing cosmetic gulls do not establish a rail delivery or ball-recovery mechanic.",
    "wording": null
  },
  {
    "id": "A284",
    "topic": "co-op",
    "call": "Smiles protect sand creations",
    "source": "docs/proposals/boogler-tech-tree.md:144 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "Sand and tide persistence is obsolete; rail progress must be protected regardless of collecting enough likes.",
    "wording": null
  },
  {
    "id": "A285",
    "topic": "co-op",
    "call": "Oyijon letters every real days",
    "source": "docs/proposals/boogler-tech-tree.md:145 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "Real-day cadence should not dictate an eight-hour rail story; existing letter dialogue remains untouched.",
    "wording": null
  },
  {
    "id": "A286",
    "topic": "co-op",
    "call": "Ocean Spam wash-ups",
    "source": "docs/proposals/boogler-tech-tree.md:146 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "The wash-up system was removed; preserve its gift copy without treating it as a scheduled rail-world feature.",
    "wording": null
  },
  {
    "id": "A287",
    "topic": "co-op",
    "call": "Free-text versus phrase-picker mail",
    "source": "docs/proposals/boogler-tech-tree.md:148; docs/proposals/directions.md:166 (when: 2026-10-29/30 open question)",
    "recommendation": "owner call",
    "reason": "Only choose audience/moderation and message input if optional mail is commissioned; it is not a blocker for rail prototypes.",
    "wording": null
  },
  {
    "id": "A288",
    "topic": "co-op",
    "call": "King-tide crate needs two pushers",
    "source": "docs/proposals/boogler-tech-tree.md:185 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "A mandatory two-player crate and storm-tide boat parts contradict solo rail progress and the removed water loop.",
    "wording": null
  },
  {
    "id": "A289",
    "topic": "co-op",
    "call": "Gary's boat from pooled fund",
    "source": "docs/proposals/boogler-tech-tree.md:189 (when: 2026-10-29/30 proposal)",
    "recommendation": "retire",
    "reason": "The Boat Fund is not the selected shared arc; any first-island boat must be chosen for rail access, not inherited from this chain.",
    "wording": null
  },
  {
    "id": "A290",
    "topic": "co-op",
    "call": "Offline growth cap",
    "source": "docs/proposals/directions.md:170; docs/research/0.1/SETTLED.md:16 (when: 2026-10-29/30; 0.1 cap later)",
    "recommendation": "owner call",
    "reason": "Choose how rail deliveries and town growth behave while absent; neither twelve real hours nor one helper section automatically answers the new loop.",
    "wording": null
  },
  {
    "id": "A291",
    "topic": "co-op",
    "call": "Rooms for friend groups",
    "source": "PLAN.md:157; docs/game-design.md:27 (when: Old open question; source-described room URLs current)",
    "recommendation": "reword",
    "reason": "The old global-island question is stale; distinguish shared progress within a room from one universal rail world.",
    "wording": "The current game has named rooms via ?room=. Rail progress is communal within the room; no change to room scope is proposed here."
  },
  {
    "id": "A292",
    "topic": "co-op",
    "call": "Interact X/Square; B back",
    "source": "docs/proposals/boogle-2.md:149; AGENTS.md:43 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted owner decision wins over AGENTS' stale pad-B example; consistent interaction helps boarding, stations and NPCs without new controls.",
    "wording": null
  },
  {
    "id": "A293",
    "topic": "co-op",
    "call": "First visit differs from return",
    "source": "docs/proposals/boogle-2.md:154; src/features/welcome-back.ts:1-4; src/features/identity.ts:1-4 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Retain saved identity, direct return and visible changes; they make other players' rail work apparent when rejoining.",
    "wording": null
  },
  {
    "id": "A294",
    "topic": "co-op",
    "call": "Current entry, prompts, pause and gamepad",
    "source": "src/features/first-run.ts:1-4; src/features/prompt.ts:1-4; src/features/pause.ts:1-4; src/features/gamepad.ts:1-4; src/features/home-app.ts:1-4; src/features/welcome-back.ts:1-4; src/features/identity.ts:1-4 (when: Observed at audited commit)",
    "recommendation": "keep",
    "reason": "Keep general access and control support for rail and optional play; these features do not encode the old farming or venue progression.",
    "wording": null
  },
  {
    "id": "A295",
    "topic": "technical examples (only)",
    "call": "Existing toy sync examples",
    "source": "DESIGN.md:58-61; DESIGN.md:67; DESIGN.md:85-89; AGENTS.md:32-35 (when: Current technical text)",
    "recommendation": "keep",
    "reason": "Avatar, ball, Boogler, mushrooms, gifts, hotbar and friendship are valid existing examples; examples describe ownership, not priority in the rail design.",
    "wording": null
  },
  {
    "id": "A296",
    "topic": "technical examples (only)",
    "call": "Ball splash and NPC planting edits",
    "source": "DESIGN.md:65-66 (when: Older game examples)",
    "recommendation": "reword",
    "reason": "The crossing-kinds rule stays untouched; splash-as-sim-edit and NPC planting imply removed or unbuilt gameplay.",
    "wording": "Physics remains outside Lockstep. A physical actor can read shared state and request a change through an edit; a thrown item's landing is an existing example. Cosmetic splashes do not imply a shared water simulation."
  },
  {
    "id": "A297",
    "topic": "technical examples (only)",
    "call": "Tide and weather presented as existing",
    "source": "DESIGN.md:68; DESIGN.md:77 (when: Older game examples)",
    "recommendation": "reword",
    "reason": "Do not let deterministic example events reintroduce the old tide/farm core; retain the technical pure-function rule.",
    "wording": "Tick-and-seed functions can drive shared schedules without stored state. Tide and weather here are historical examples, not built systems or requirements for the rail loop."
  },
  {
    "id": "A298",
    "topic": "technical examples (only)",
    "call": "Plant, water, toss, harvest, splash list",
    "source": "DESIGN.md:80 (when: Older game examples)",
    "recommendation": "reword",
    "reason": "Planting/watering mushrooms and tossing gifts exist; harvest and shared-water splash imply the discarded farming loop.",
    "wording": "For lockstep systems, clients send small edit events, such as planting or watering a mushroom and tossing or taking a gift, over the reliable channel. These examples do not make toys part of rail progression."
  },
  {
    "id": "A299",
    "topic": "technical examples (only)",
    "call": "Garden, gifts, weather authority example",
    "source": "DESIGN.md:87 (when: Older game examples)",
    "recommendation": "reword",
    "reason": "Keep authority unchanged; distinguish the built mushroom garden from crops and unbuilt weather.",
    "wording": "Mushrooms, gifts and work sites are existing shared-world examples; crops and weather are not current gameplay systems."
  },
  {
    "id": "A300",
    "topic": "technical examples (only)",
    "call": "PeerJS and host-migration narration",
    "source": "docs/game-design.md:25-26; docs/game-design.md:42; docs/proposals/hub-and-minigames.md:29; PLAN.md:156 (when: Historical network descriptions)",
    "recommendation": "reword",
    "reason": "Conflict with current DESIGN.md:93; flag narration separately without revisiting the entity or networking refactor.",
    "wording": "For current room hosting and persistence, use DESIGN.md and the multiplayer implementation docs. The older PeerJS and browser-host migration descriptions are historical, not constraints on the rail design."
  },
  {
    "id": "A301",
    "topic": "technical examples (only)",
    "call": "Snapshot deployment and catch-up prerequisites",
    "source": "docs/proposals/directions.md:9-16; docs/proposals/directions.md:171; docs/proposals/boogler-tech-tree.md:26; docs/proposals/boogler-tech-tree.md:232; docs/proposals/hub-and-minigames.md:84 (when: 2026-10-29/30 historical assumptions)",
    "recommendation": "reword",
    "reason": "The old server-not-deployed claims are not a current rail blocker; technical plans remain authoritative and are not audited here.",
    "wording": "These deployment and catch-up prerequisites describe an earlier networking version. Check current technical plans for implementation status; do not start infrastructure work from this historical design proposal."
  },
  {
    "id": "A302",
    "topic": "technical examples (only)",
    "call": "Survival framing in net roadmap, Open 5",
    "source": "docs/proposals/boogle-2.md:203 (when: Open by 2026-11-01)",
    "recommendation": "reword",
    "reason": "Address only its framing, as the owner requested; no networking or entity changes follow from replacing the game premise.",
    "wording": "Gameplay framing: Boogle's current direction is rail-connected camps feeding growing towns. Creature and survival examples are historical illustrations, not standing design requirements; this note does not alter technical milestones."
  },
  {
    "id": "A303",
    "topic": "technical examples (only)",
    "call": "Removed dig action and legacy vehicle engine examples",
    "source": "docs/proposals/vehicles.md:14; docs/proposals/vehicles.md:20-28; docs/proposals/vehicles.md:100-107; docs/proposals/boogler-tech-tree.md:31 (when: 2026-10-29/30 historical examples)",
    "recommendation": "reword",
    "reason": "Keep input/physics/sync contracts out of scope; old pile-to-dive, cannon-es numbers and sand ruts must not be interpreted as current rail requirements.",
    "wording": "Historical implementation examples only: pile-to-dive, cannon-es tuning and sand ruts refer to an older game. Use current engine and control contracts for any approved vehicle; this document does not specify a technical migration."
  },
  {
    "id": "A304",
    "topic": "technical examples (only)",
    "call": "AGENTS interact pad-B example",
    "source": "AGENTS.md:43; docs/proposals/boogle-2.md:149; src/features/prompt.ts:1-4 (when: Standing example; owner changed 2026-11-01)",
    "recommendation": "reword",
    "reason": "Only the example glyph is stale: quoted owner X/Square decision wins; the interact registry rule stays unchanged.",
    "wording": "Interact button (E, pad X/Square, touch action): use registerInteractable. B/Circle is back or cancel."
  },
  {
    "id": "A305",
    "topic": "technical examples (only)",
    "call": "Technical PLAN history and renderer tiers",
    "source": "PLAN.md:13-47; PLAN.md:145-156; docs/proposals/visual-target.md:69-132; docs/proposals/visual-target.md:185-216 (when: Mixed historical and current technical text)",
    "recommendation": "keep",
    "reason": "Out of design scope: do not change hosting, dependencies, fluid algorithms, performance budgets or renderer plans to reconcile the rail premise; only stale game framing is flagged above.",
    "wording": null
  },
  {
    "id": "A306",
    "topic": "protected and process (out of design scope)",
    "call": "Protect all Boogler copy",
    "source": "AGENTS.md:12 (when: Standing owner call; date unknown)",
    "recommendation": "keep",
    "reason": "Out of scope: never trim or reword dialogue, small talk, gift lines or HUD lines, even if they mention old rail alternatives or removed systems.",
    "wording": null
  },
  {
    "id": "A307",
    "topic": "protected and process (out of design scope)",
    "call": "Nintendo names stay; no ROM data",
    "source": "AGENTS.md:13 (when: Standing owner call; date unknown)",
    "recommendation": "keep",
    "reason": "Out of scope: no renaming Nintendo references and no ROM data or extracted assets in repo/build; evaluating guest gameplay does not change this boundary.",
    "wording": null
  },
  {
    "id": "A308",
    "topic": "protected and process (out of design scope)",
    "call": "Name references and borrow features",
    "source": "AGENTS.md:14 (when: Standing owner call; date unknown)",
    "recommendation": "keep",
    "reason": "Keep Death Stranding, Big Walk, Ratchet, Bricktrons and Mario named where relevant; make Boogle's own rail world and characters.",
    "wording": null
  },
  {
    "id": "A309",
    "topic": "protected and process (out of design scope)",
    "call": "Research before deep facets",
    "source": "AGENTS.md:15; docs/proposals/boogle-2.md:36 (when: Reaffirmed 2026-11-01)",
    "recommendation": "keep",
    "reason": "The rail direction changes gameplay priorities, not the requirement to research deep design/build work; this audit invents no new implementation.",
    "wording": null
  },
  {
    "id": "A310",
    "topic": "protected and process (out of design scope)",
    "call": "Compare standard engines",
    "source": "AGENTS.md:16 (when: Standing owner call; date unknown)",
    "recommendation": "keep",
    "reason": "Technical principle is explicitly out of scope; no rail-design recommendation changes architecture comparisons.",
    "wording": null
  },
  {
    "id": "A311",
    "topic": "protected and process (out of design scope)",
    "call": "Owner decisions live in repo",
    "source": "AGENTS.md:17 (when: Standing owner call; date unknown)",
    "recommendation": "keep",
    "reason": "Accepted rail decisions must become shared repository guidance; this proposal records choices for review, not silent policy changes.",
    "wording": null
  },
  {
    "id": "A312",
    "topic": "protected and process (out of design scope)",
    "call": "Button-page decision workflow",
    "source": "docs/proposals/boogle-2.md:33; docs/proposals/island-layout.md:16 (when: Owner thread; by 2026-11-01)",
    "recommendation": "keep",
    "reason": "Standalone audit rows support the owner's pick workflow; retain existing concept/layout storage keys when their pages are edited later.",
    "wording": null
  },
  {
    "id": "A313",
    "topic": "protected and process (out of design scope)",
    "call": "Concept images are references",
    "source": "docs/proposals/boogle-2.md:37; DESIGN.md:101-102 (when: Current art process)",
    "recommendation": "keep",
    "reason": "Keep approval, prompts and reference-only concepts; renderer-led rail previz and the later generated title-art choice do not license unapproved shipped imagery.",
    "wording": null
  },
  {
    "id": "A314",
    "topic": "protected and process (out of design scope)",
    "call": "Entities have methods",
    "source": "docs/proposals/boogle-2.md:158 (when: 2026-11-02)",
    "recommendation": "keep",
    "reason": "Explicitly excluded technical decision; preserve entity methods and the recorded test exception without opening docs/plans/entity-architecture.md.",
    "wording": null
  },
  {
    "id": "A315",
    "topic": "protected and process (out of design scope)",
    "call": "No automatic rollback yet",
    "source": "docs/proposals/boogle-2.md:159 (when: 2026-11-02)",
    "recommendation": "keep",
    "reason": "Quoted owner decision remains; deployment recovery is outside a read-only rail design audit.",
    "wording": null
  },
  {
    "id": "A316",
    "topic": "protected and process (out of design scope)",
    "call": "Migrate entities before slice",
    "source": "docs/proposals/boogle-2.md:160; docs/proposals/boogle-2.md:201; docs/proposals/boogle-2.md:208 (when: 2026-11-01/02)",
    "recommendation": "keep",
    "reason": "Quoted owner decision and technical Open 3 are excluded, not re-decided; preserve recorded prerequisites while the rail slice is replanned.",
    "wording": null
  },
  {
    "id": "A317",
    "topic": "protected and process (out of design scope)",
    "call": "Start asset pipeline now",
    "source": "docs/proposals/boogle-2.md:162; docs/proposals/boogle-2.md:188 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Retain the newer pipeline timing; art for towns/trains may use it, but no glTF, compression or lifecycle architecture is audited here.",
    "wording": null
  },
  {
    "id": "A318",
    "topic": "protected and process (out of design scope)",
    "call": "One playtest path, server verdicts",
    "source": "docs/proposals/boogle-2.md:167 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Quoted owner workflow remains useful for rail experiments; local-switch variants, chapters and copy fallback are not redesign targets.",
    "wording": null
  },
  {
    "id": "A319",
    "topic": "protected and process (out of design scope)",
    "call": "Fast iteration and lighter tests",
    "source": "docs/proposals/boogle-2.md:35; docs/proposals/boogle-2.md:169; DESIGN.md:107 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Retain the current test diet and later entity exception; this audit needs no new gameplay tests or browser scenario.",
    "wording": null
  },
  {
    "id": "A320",
    "topic": "protected and process (out of design scope)",
    "call": "Agents inspect their own results",
    "source": "docs/proposals/boogle-2.md:171; docs/proposals/boogle-2.md:189 (when: 2026-11-01)",
    "recommendation": "keep",
    "reason": "Preserve the implementation-review workflow; this task changes no visible game and makes no runtime rail-fun claim.",
    "wording": null
  },
  {
    "id": "A321",
    "topic": "protected and process (out of design scope)",
    "call": "Current technical support features",
    "source": "src/features/world.ts:1-3; src/features/updates.ts:1-4; src/features/telemetry.ts:1-4; src/features/adaptive-res.ts:1-4; src/features/wake-lock.ts:1-4; src/features/controls-check.ts:1-4; docs/proposals/hub-and-minigames.md:78-84; docs/proposals/hub-and-minigames.md:137 (when: Observed at audited commit)",
    "recommendation": "keep",
    "reason": "Keep general infrastructure outside design disposition; rail priorities do not justify removing world sync, updates, reports, controls checks or device support.",
    "wording": null
  },
  {
    "id": "A322",
    "topic": "protected and process (out of design scope)",
    "call": "Current debug and prototype scaffolding",
    "source": "src/features/debug-cam.ts:1-3; src/features/debug-handle.ts:1-4; src/features/prof.ts:1-4; src/features/syncsafety.ts:1-3; src/features/walk-layout.ts:1-4; src/features/proto-bar.ts:1 (when: Observed at audited commit)",
    "recommendation": "keep",
    "reason": "Retain inspection and flag infrastructure; old layout content can be historical without removing the tools used to test rail.",
    "wording": null
  },
  {
    "id": "A323",
    "topic": "protected and process (out of design scope)",
    "call": "Flagged experiments are not base gameplay",
    "source": "src/features/proto-net.ts:1-14; src/features/proto-crossing.ts:1-6; src/features/proto-wagon.ts:1-4; src/features/proto-era.ts:1-4; src/features/proto-haul.ts:1-4; src/features/proto-lay.ts:1-4; src/features/proto-board.ts:1-4 (when: Observed at audited commit)",
    "recommendation": "keep",
    "reason": "Keep prototype status explicit: rail/town, distance, wagon, era, haul, laying and board code are evidence of experiments, not final adoption.",
    "wording": null
  },
  {
    "id": "A324",
    "topic": "protected and process (out of design scope)",
    "call": "Look, assets, hero and moves experiments",
    "source": "src/features/proto-look.ts:1-4; src/features/proto-assets.ts:1-4; src/features/proto-hero-rig.ts:1-4; src/features/proto-hero.ts:1-4; src/features/proto-moves.ts:1-4; src/features/blob-shadows.ts:1-3 (when: Observed at audited commit)",
    "recommendation": "keep",
    "reason": "Keep look/character experiments and readability support distinct from approved base-game art; the audit does not promote prototypes or change the rail renderer.",
    "wording": null
  }
]
```
