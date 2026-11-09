# Goofy physics co-op: helping, mishaps and coming back

> **Verdict:** Co-op parcel relay and golf hole first, picnic tray third.
> **Top recommendations:** 1. Start with a cooperative parcel relay. 2. Then a cooperative golf hole with adjustable ramps. 3. Keep a shared wobbling picnic tray as the third experiment.
> **Status:** open. No decision cites it yet.

_2 November 2026. Research for Boogle's co-op-only mini-games, cosmetic boxes and the old island as an endgame hangout. Live primary-source search, developer interviews, published research abstracts and a code audit at `3280c6ff`; recommendations, not implemented or playtested behaviour. Read the research index and both prerequisite reports before this pass. Sources are linked beside claims; fetched pages support the findings unless explicitly marked abstract-only. Numbers proposed for Boogle are starting hypotheses, not measurements from the reference games._

## Summary

The strongest fit is a reliable action that creates an awkward situation **someone else can improve**. The funny part is a visible plan going sideways, a friend improvising a save, and everybody understanding what happened. Randomly failing inputs, unexplained ownership corrections and repeatedly making the least experienced friend restart everybody are different problems.

Start with a cooperative parcel relay, then a cooperative golf hole with adjustable ramps. Keep a shared wobbling picnic tray as the more demanding third experiment. None needs player-to-player joints. Return appeal should come from familiar friends, new ways to help, small authored variations and generous personal cosmetic boxes whose results friends can see. No source here establishes a retention percentage for any of those choices.

## Scope and the decisions this builds on

- [Co-op physics: vehicles, riders and carried objects](coop-physics-vehicles-netcode.md) already covers deck-relative riders, ownership versus holding, interpolation, bandwidth and prediction. This report adds the implications of **simultaneous cooperation**, connected assemblies, round recovery and cosmetic outcomes; it does not propose another transport or vehicle system.
- [Mini-games and physics mini-games](minigames-and-physics-minigames.md) already covers toy-first verbs, short attempts, readability and spectating. Its competitive pips, solo-best emphasis, ball bump, topple and soapbox shortlist are not a current brief. The owner cut the bump, retired topple and removed the soapbox from this island in [decisions.md](../decisions.md).
- **The owner's instructions for this research settle its scope:** mini-games are co-op only and give cosmetic boxes; chained physics is not required in the main loop; the old island becomes an endgame hangout with little games for friends. The checkout's older open questions 15 and 17 in [decisions.md](../decisions.md) must not reopen those decisions. Box contents, payout tuning and the hangout's exact layout remain design work.
- [DESIGN.md](../../DESIGN.md) principles 1, 3, 4, 5, 6, 8 and 10 govern the proposals: toys first, optional activities, easy helping, no threats to progress, personal rewards, drop-in play and slapstick. [Round 4](../plans/round-4.md), step 7, also explicitly leaves required chains out. This research does not complete a prototype checkbox in [find-the-fun.md](../plans/find-the-fun.md).

**Co-op only needs a precise reading.** It rules out opponents, individual winners and racing friends for the payout; it does not require turning an empty venue off. Keep its toy usable alone, then let cooperative actions earn the cooperative completion. This reconciles the task with DESIGN.md's solo-first/drop-in requirements. If a particular challenge needs two contributors, it is an optional side activity, never an access or railway gate. A departing helper must not erase already accepted help or make the remaining player unable to finish the current attempt.

## What the reference games actually establish

### Human: Fall Flat: a permissive world gives awkward movement a purpose

Tomas Sakalauskas describes starting with independent hand control, then widening levels when testers preferred working around puzzles. This is a specific reason to allow alternate solutions, rather than assuming every unintended interaction is desirable. [Developer interview, Fanatical, 19 January 2018](https://www.fanatical.com/en/blog/human-fall-flat-stumbling-upon-a-physics-based-gem).

The creator of the official competition-winning **Golf** level describes composing views around upcoming goals, introducing/developing/twisting mechanics, and deliberately leaving ways around almost every obstacle. He also identifies unused central space and weak thematic fit as flaws. That is useful evidence for compact, coherent toy courses rather than an enormous field of unrelated physics props. [Level designer's portfolio and postmortem](https://www.simon-ia.com/humanfallflat).

Curve's game page confirms solo play, up to eight online players, multiple routes, customization, free levels and Steam Workshop content. These are concrete sources of fresh situations; the marketing page does not measure which causes players to return. [Publisher page](https://curvegames.com/our-games/human-fall-flat/).

**Boogle inference:** preserve the freedom to attempt a ridiculous shot or delivery shortcut. Make the next useful object and destination visible, so the group can interpret the accident. Take the permissive problem solving without replacing Boogle's Buddy controller with independently driven physical limbs. Eight supported players is evidence of a shipped capacity, not proof that one tiny interaction stays interesting for eight.

### PEAK: rescuing someone makes their predicament matter to you

Landfall describes helping friends over ledges, leaving ropes and climbing spikes, managing injuries that reduce stamina, and trying a map that rotates every 24 hours. Badges unlock cosmetics. The advertised party is four players, with solo play also supported. These mechanics create both immediate assistance and preparation that benefits someone arriving later. [Developer's PEAK page](https://landfall.se/peak).

**Boogle inference:** use a dropped parcel, an awkwardly tilted tray or a missed landing as an opportunity to help. Preserve the visible dependency and the gratitude. PEAK's injury spiral, lethal obstacles and long expedition losses conflict with Boogle's no-hazards direction; they are not necessary to borrow its rescue structure. An endgame toy should let a friend recover the situation without making the victim wait for permission to resume.

The same daily layout gives a group a shared subject and room to improve across attempts; a different layout supplies a new prompt next time. For Boogle, the hypothesis is a small selectable set of authored variations, with a suggested one when the group returns. This does not require daily expiry or procedural terrain.

Nick Kaman's GDC 2026 session, [Putting the “Friends” in Friendslop](https://gdcvault.com/play/1035941/Putting-the-Friends-in-Friendslop), was located and its abstract read. The recording was not reviewed; no detailed design claim here is attributed to having watched it.

### PICO PARK: design the exchange between players, not just the obstacle

Shunsuke Miyake says a level generally contains one to three cooperative situations and that he imagines the conversations its arrangement will produce. A giant controller operated together to drive a robot was rejected as tedious. He also identifies Photon Quantum as PICO PARK 2's networking choice, with difficult network bugs. This is not evidence for networking the same mechanics with independent Rapier owners. [Direct Q&A, Josh Hardy, 25 February 2025](https://www.joshhardy.co.uk/post/q-a-with-shunsuke-miyaki-director-of-pico-park-2).

In a separate interview, Miyake explains that the original cooperative aim was shared accomplishment; players also enjoyed teasing each other, which the sequel's harder Dark Mode deliberately amplified. He describes adding checkpoints to reduce repeated work and varying the experience rather than repeating the same kind of stage three times. These are translated paraphrases of his Japanese answers, not English quotations. [Famitsu interview, November 2024](https://www.famitsu.com/article/202411/20689).

The original game's publisher description specifies 2–8 players, keys, a shared exit that everyone reaches, and an Endless mode for cooperative high scores after the authored stages. [TECOPARK's Nintendo listing](https://ec.nintendo.com/NZ/en/titles/70010000019264).

**Boogle inference:** write a desired exchange first: “send it here,” “I'll hold this,” “we can still save it.” Give that exchange an obvious physical cause. Do not import everybody-must-execute-perfectly gates or surprise deaths. At eight players, multiply useful positions or independent jobs; do not multiply the number of people who must land the same timed jump.

### Heave Ho: the grip is legible; the body's result is comic

The original is a four-player couch game, also available through Steam Remote Play, built around gripping and swinging. Remote Play is not evidence of distributed physics. [Le Cartel/Devolver's store page](https://store.steampowered.com/app/905340/Heave_Ho/).

Le Cartel's patch notes are particularly useful: they enlarge assistance gloves, correct forces differing between keyboard and other controllers, polish item grabs, and fix a basketball held too close to the wrist. Those are interaction and readability repairs inside a deliberately awkward game. [Developer announcements, patches 1.3–1.6 and the August 2020 update](https://steamcommunity.com/app/905340/allnews/).

**Boogle inference:** the player needs to know which thing is held, whether a grab succeeded and what releasing will do. Make accidental entanglement an intelligible consequence of a committed action. Do not use ambiguous focus, missing input feedback or device-dependent force as comedy.

The sequel adds a particularly relevant technical precedent. **Coherence's first-party engineering case study** reports one client simulating the shared physics, sparse rope-node synchronization with local reconstruction and changing update rates, explicit teleport handling, and animation driven by a few values. It also describes keeping the group together across activities while retaining personal characters/achievements. This is a vendor's account of its own work with developer quotations, not an independent latency benchmark. [Physics Impossible: Bringing Heave Ho 2 online, 31 August 2026](https://coherence.io/blog/developer-interviews/heave-ho-2-case-study).

That supports testing one authority for a coupled toy. It does not establish that Boogle can cheaply add four articulated avatars, much less eight, or that a generic networking library removes the work.

### Totally Reliable Delivery Service: even a clumsy courier needs assistance

We're Five Games' accessibility devlog combines both arms under simpler lift/raise controls, adds autorun, draws nearby movable objects into the hands and confirms successful grabs visually. Its networking devlog prioritizes positional accuracy, response time, traffic and smoothing; it reports using PUN, packing data and reducing transmitted data by about half. That last number is the developers' comparison for their game, not a predicted Boogle saving. [Developer updates #1 and #2, January–February 2021](https://steamcommunity.com/app/1106850/allnews/).

The current store description contrasts responsive platform movement with collision-induced ragdolls and puts deliveries beside freeform toys. It currently says the player can join four friends, so the present advertised online group is five; older four-player descriptions should be dated. Its progression includes delivery earnings and unlockable areas, which Boogle's optional hangout should not inherit. [Developer/publisher store description](https://store.steampowered.com/app/1011670/Totally_Reliable_Delivery_Service/).

**Boogle inference:** a delivery gives physical chaos an understandable intention. The return path and recovery matter as much as the trip: a parcel outside the arena must come back, and a helper must be able to pick it up without a precision struggle. Keep the amusing package and awkward route; remove wages, damage bills and long mandatory hauling from this side activity.

### Octodad and Moving Out: distinguish expressive difficulty from friction

Young Horses explicitly separates enjoyable awkward control from technical flaws that made players feel cheated. Its Octodad changes include quicker leg response, resolving the case where pushing harder made stairs worse, checking overhead obstacles before trying to stand upright, and consistent arm transitions/height. The optional ability to collapse gives players agency over the performance. [Young Horses, All Under Control, 17 October 2012](https://younghorsesgames.com/allundercontrol/).

Team17 confirms that Moving Out makes heavy objects easier to carry alone and offers adjustable time limits and difficulty. Its launch description also includes skippable stages and removing dangers. These are concrete knobs for preserving the group when abilities differ. [Official FAQ](https://www.team17.com/news/moving-out-faq), [launch feature description](https://www.team17.com/news/moving-out-release-date-announcement).

**Boogle inference:** mastery can improve the performance without removing all wobble. A forgiving grip or broad catch zone leaves plenty of comedy in momentum and timing. Let someone choose the easier helper position without a lower reward tier. A player struggling with the camera must not become the compulsory bottleneck for everyone else's prize.

### What research supports about social bonds, and what it does not

**Abstract-only evidence:** Depping and Mandryk's CHI PLAY 2017 experiment used four versions of an online game with paired strangers to separate cooperation from interdependence. Both could improve social bonds; increased conversational turns explained the interdependence effect. [Cooperation and Interdependence](https://doi.org/10.1145/3116595.3116639). The primary abstract was available in live search; the DOI page returned 403 on opening.

**Abstract-only evidence:** the 2018 follow-up surveyed 234 players about their gaming communities; its abstract identifies interdependence and toxicity as strong predictors of in-game social capital, with cooperation less explanatory than common assumptions suggest. [Designing for Friendship](https://doi.org/10.1145/3242671.3242702), [authors' paper record and abstract](https://www.researchgate.net/publication/328549813_Designing_for_Friendship_Modeling_Properties_of_Play_In-Game_Social_Capital_and_Psychological_Well-being). The author's PDF timed out and the DOI page returned 403; no full-paper statistics are used here.

These studies concern social relationships, not Boogle retention, eight-person physics or cosmetic economies. The inference worth testing is narrower: **a common score alone is weaker design than a situation where my action visibly improves yours**. This need not require voice. Physical positioning, readable handles and pings can carry a simple exchange; talk can enrich it when friends are already talking.

## Design synthesis for the hangout

### The comedy has a sequence

Give the group an intention they understand, a brief anticipation, a physical reversal, a chance to intervene and a visible recovery. For example: a friend carefully aims a parcel at a basket; it clips the rim; a second friend chases it; the rescue accidentally sends it into the basket. The successful and unsuccessful trajectories both tell a story.

This is a synthesis of the examples above, not a universal formula for humor. It suggests five useful distinctions for implementation:

| Preserve                                         | Remove                                                         | Why it matters to the group                         |
| ------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------- |
| A parcel rotating after a recognizable bad throw | A throw that randomly ignores the input                        | Friends can understand and react to the former.     |
| An exaggerated spill onto a recoverable surface  | Losing already banked work or another player's item            | The accident remains an invitation to help.         |
| A player choosing to flop or attempt a trick     | A camera or animation that repeatedly takes control away       | The player can perform for friends and then resume. |
| A visibly ambitious shortcut                     | An invisible wall correcting the intended route                | Inventing a solution becomes shared knowledge.      |
| A comic near miss before success                 | A reversed score because another tab saw a different collision | Everybody needs the same outcome to share the joke. |

### Build levels from relations between familiar verbs

The reusable verbs are move, jump, pick up, carry, aim and throw. The reusable **relationships** are pass, receive, redirect, support and recover. A compact three-part course can introduce a safe pass, change the receiving angle, then combine a pass with a friend-operated redirector. Alter the arrangement before adding controls.

Keep two kinds of route: the obvious forgiving path that completes the shared objective, and an optional trick that makes a good story. Both pay the basic completion box. Separate a new physical idea from a new view: teach the redirector on flat ground before putting it around a bend. Retain banked deliveries between mishaps. Inspect each course from the helper's position, the thrower's camera and the recovery floor, not only from above.

### Two to eight is a design range, not one difficulty multiplier

PICO PARK and Human: Fall Flat demonstrate the requested upper range. PEAK, original Heave Ho and Moving Out mostly demonstrate groups of four; their readability and dependency patterns do not automatically double in capacity. Boogle's server cap is eight even though DESIGN.md's prose expects 1–6.

| Active helpers at this toy | Proposed arrangement                                                                                   | Avoid                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| 1                          | Free practice with the actual prop; accepted cooperative progress remains finishable after a departure | A locked arena or a demand to fill a lobby             |
| 2                          | Two complementary, swappable jobs, with both players seeing the goal                                   | One expert playing while the second only watches       |
| 3–4                        | A receiver/recovery position and one optional setup job; no compulsory extra steps                     | Raising the work quota in proportion to every arrival  |
| 5–8                        | Two to four loose pairs on adjacent lanes feeding the same visible objective; switch lanes freely      | Eight hands contesting one grab or a long serial queue |

Count participants at the toy, not everyone in the room. Keep the target fixed during an attempt. Add useful tools or lanes at a safe boundary; joining should never raise the target just as the group is about to finish. A late helper's first accepted action can join the reward roster; merely standing nearby does not. Retain that contribution and its eventual entitlement if the helper disconnects. A departure releases a handle and stops its force; it is not a team failure.

### Returning needs more than a fresh payout

The evidence provides several different mechanisms: learning alternate solutions (Human: Fall Flat), a new shared layout and visible badges (PEAK), authored surprises and endless cooperation (PICO PARK), and a group that persists between activities (Heave Ho 2). None proves long-term retention in isolation.

For Boogle, test three timescales separately:

- **Another attempt now:** a recoverable near miss, roles that can swap, a trick the group just discovered.
- **Another evening:** a small variation friends can understand immediately and a cosmetic they want to wear together.
- **After the railway is finished:** an inhabited, familiar place to gather with no debt or unfinished job insisting on attention.

Use the old island's court, palms, shore and lighthouse as recognizable meeting points. Keep the next toy visible from the last finish and leave room to stand around the box opening. Keep the room and avatars through activity changes. This is an endgame use of the old island, not a reinstatement of the abandoned six-venue plan for the new home.

The reward recommendation is generous: begin by testing one personal box per accepted cooperative completion, with the same entitlement for each eligible helper. Contents may differ; payout quality must not rank friends. Show a newcomer something worth wearing on the first clear. A short authored opening collection can avoid empty-feeling duplicates before a later rarity system is settled. A collection can persist without requiring daily attendance. No reward tuning here authorizes a power bonus, railway materials or limited-time exclusives.

## What works over Boogle's actual netcode

### Current code, not the older roadmap's eventual architecture

| Verified seam                                                                                                                                                                                                         | Consequence for these mini-games                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`engine.ts`](../../src/physics/engine.ts), [`backend-rapier.ts`](../../src/physics/backend-rapier.ts): fixed 60 Hz, at most four catch-up steps; dynamic CCD enabled; shape/material/damping API; no joint/motor API | Small rigid props fit. Articulated carry chains need facade work. More rendering frames do not give more authoritative network samples.                                       |
| [`constants.ts`](../../src/constants.ts): `SEND_MS = 50`, `INTERP_MS = 120`                                                                                                                                           | Presence is 20 Hz and remote bodies are displayed on a delayed timeline. Design receive windows and targets accordingly.                                                      |
| [`owner-sync.ts`](../../src/netplay/owner-sync.ts): highest epoch wins, lexical peer tie-break, owner snapshots, orphan adoption                                                                                      | This is client claim resolution, not server-approved exclusive grabbing. It is a building block, not a complete two-person manipulation protocol.                             |
| [`ball/state.ts`](../../src/entities/ball/state.ts): slow-ball contact claim, 400 ms reclaim guard, 150 ms extrapolation cap; [`ball/sync.ts`](../../src/entities/ball/sync.ts): `e/p/v/q/h`                          | Its handoff model is a starting point for discrete turns; simultaneous remote hits need not share one exact physical contact history. Its wire shape has no angular velocity. |
| [`net/README.md`](../../src/net/README.md), [`hosted-room.ts`](../../server/src/host/hosted-room.ts): relay, server world, separately elected lead tab, queued messages on reconnect                                  | “Server hosts the room” does not mean server Rapier simulates the toy. `room.send` reaches other tabs, not the sender. Apply the same intent handler locally for the owner.   |
| [`minis/golf.ts`](../../src/proto/minis/golf.ts), [`game-design/minis.md`](../game-design/minis.md): local attempts/bests, shared ball, another holder cancels the hole                                               | Cooperative golf requires new shared attempt semantics. It is not a score-label edit.                                                                                         |
| [`place/gifts.ts`](../../src/proto/place/gifts.ts): prototype crate opening and gift state                                                                                                                            | Reuse the presentation idea after extracting an appropriate helper; this is not a shipped room-wide, idempotent mini-game entitlement service.                                |

[Net roadmap](../plans/net-roadmap.md) phases 2–4 propose player storage and server simulation/validation. They are not prerequisites already delivered by this research, and their older survival framing is not the current game brief. The existing server lockstep machinery can accept discrete outcomes without simulating the physical flight in lockstep.

### What standard engines do, and the relevant difference

- **Unity Netcode for GameObjects 2.7:** non-authority rigidbodies are kinematic and follow the authority. Its current physics guide recommends attachable objects when independent child motion is unnecessary, reserving joints for genuinely independent physical parts. Boogle's dynamic/ghost split is similar, but its own helpers must implement round identity, resets and multi-user intent. [Unity physics guide](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.7/manual/advanced-topics/physics.html).
- **Unreal:** its networked physics guide distinguishes predictive interpolation from history-based resimulation. It explicitly notes worsening interactions at higher velocities and latency, and resimulation's CPU/memory costs. Boogle's owner computes its own action immediately; it has neither Unreal's server simulation nor its prediction history. A cinematic ragdoll is not a reason to introduce that architecture. [Epic networked physics overview](https://dev.epicgames.com/documentation/unreal-engine/networked-physics-overview?lang=en-US).
- **Godot:** `MultiplayerSynchronizer` replicates configured properties from an authority, with visibility and replication controls; peer-local objects and IDs are not portable state. That is a replication primitive, not an automatic solution to competing physics. Boogle similarly needs stable logical IDs and an explicit decision about who simulates the interaction. [Godot documentation](https://docs.godotengine.org/en/stable/classes/class_multiplayersynchronizer.html).

### Prefer discrete cooperation; treat a connected assembly as one simulation

**Low risk:** one person throws, another receives after flight; people set a ramp before the shot; several independent parcels reach one basket. Each physical prop has one owner at a time and the group combines discrete accepted results.

**Moderate risk:** several players steer or steady one tray. Keep one owner for the tray and every loose item whose contact with it matters. Helpers send bounded intent; they do not claim on every touch. The owner advances the coupled bodies together, judges deposits and publishes results. Receiving tabs draw those bodies from that owner. Attached decorations derive from the tray; a cup that rolls independently needs its own authoritative pose within the same assembly, not a rigid parent transform.

**High risk:** a hand-to-hand chain connecting separately owned avatars, fast mid-air catches requiring millisecond agreement, or a stack whose bodies constantly migrate to different owners. Delay changes the constraint each solver sees. Heave Ho 2 is evidence that coupled physics can work with deliberate engineering; its single-client simulation is a materially different commitment from independently authoritative Boogle players. Leave player chains out of the first three prototypes.

For a tray, derive its desired position/tilt from helper intents without physically constraining remote avatars. Hands can pose toward handles locally. Stop stretching the target beyond reach and release safely. This is a designed approximation whose limits must be seen in a two-client test; it is not a claim of physically reciprocal carrying.

### A minimal round and recovery contract

These are **proposed fields and rules**, not an API that exists today:

| State/action                                 | Authority and lifetime                                                             | Required behaviour                                                                                                                                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prop pose and velocity                       | Owner, presence                                                                    | One accepted epoch; non-owners interpolate; explicit reset generation prevents interpolating across a respawn. A tray may need angular velocity beyond the current ball wire.                             |
| Grab, release, redirect or steady intent     | Reliable room message, or expiring latest intent for sustained input               | Include round ID, object/assembly ID, authority epoch and sender sequence. Validate sender/reach/bounds, deduplicate, expire stale intent and rate-limit. Never replay an old shove after reconnect.      |
| Temporary objective and roster               | Host for a disposable prototype; server-stamped outcome state when payouts persist | The lead tab may differ from the physical owner. Only accepted owner reports advance the objective; no score from remote visual contacts. Late joiners receive the current state, not just event history. |
| Completed round and personal box entitlement | Durable server-accepted record, keyed by round and stable player ID                | Award once per eligible player. Broadcast effects after acceptance. Opening the visual box must not mint the entitlement.                                                                                 |
| Confetti, comic wobble, impact sounds        | Local presentation of accepted events                                              | Deduplicate the event; give immediate input feedback locally without pretending the shared result is confirmed.                                                                                           |

`createOwnerSync` does not arbitrate multi-user input or atomically transfer a set of bodies. For the first disposable prototype, the whole assembly can freeze and restart its current segment when its owner disappears. Preserve completed segments; do not rebuild joint state from each receiver's cosmetic pose. For promotion, transfer all simulation-relevant poses/velocities under one epoch and clear old intents. New wire shapes need new names or versions; do not silently extend the meaning of the ball's existing `b` field.

Visibility is a separate failure mode: an owner can remain connected while its browser is suspended. The existing orphan wait is not a simulation heartbeat. A promoted activity needs a stale-owner rule, a visible pause/recovery and a fresh authority generation; no late force burst after the tab wakes. The server relay's latest-wins queue reduces unsent presence backlog but cannot remove TCP head-of-line delay already in flight. Test pauses and bursty delivery, not only a constant artificial ping.

Durable box claims need only discrete validation: current round, allowed reporter, milestone order, participant eligibility and duplicate rejection. A server that does not simulate Rapier cannot prove a physically honest landing from an owner's assertion; acknowledge the existing friends-only trust model. Avoid demanding a server-physics rewrite to test the toy, and avoid treating a provisional Host score as a durable payout. Use the established `submitEdit`/`onApplied` boundary for any persistent rule, with server-bound identity; keep all Rapier and cosmetic math outside lockstep.

### Tune for the delay that exists

At 6 m/s, an object travels **0.72 m in the 120 ms interpolation offset alone** (`6 × 0.12`); transport and jitter can add more apparent separation. This is an illustrative calculation, not measured end-to-end latency. A tiny catch sphere evaluated against an interpolated ball will disagree with the owner's collision.

Start with a visible receiving area 2–3 m across and a handoff that can be prepared before arrival. Let the owner evaluate its overlap with an accepted receiver intent. No last-frame catch button, no need to seize ownership in mid-flight. Show an offer until a transfer is accepted; do not draw two confirmed holders. Whether this feels generous or automatic is a playtest question.

For ordinary props, use simple shapes and rounded visual edges, broad funnels, shallow ramps and explicit return areas. Keep Boogle's existing fixed step and CCD. [Rapier's rigidbody guide](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/) documents forces, damping and mass; [its JS changelog](https://github.com/dimforge/rapier.js/blob/master/CHANGELOG.md) documents per-body extra solver iterations affecting connected contacts/joints. They are tools, not a prescription to globally raise the solver budget. Boogle pins Rapier 0.19.3, and its facade currently exposes neither that iteration setting nor joints. Verify version/API support before any extension; newer web documentation is not evidence that a setting is already in the facade.

Provisional limits for the first tray: one tray, three cargo bodies, a walking-speed target of 2–3 m/s, a damped tilt capped near 15–20°, and one shallow bend. Start gentle enough that two helpers can intentionally tip it and then recover. Tune in this order: input recognition, reach/attachment, stable carrying, recovery, then stronger wobble and feedback. Do not vary mass or force randomly to manufacture accidents. No universal numeric mass/damping preset was verified for the reference games.

## Numbered recommendations for Boogle

Each recommendation names its implementation seam and smallest useful proof. The tests below are future acceptance work, not runs performed for this document.

1. **Make cooperation a visible assist with a shared finish.** A pass, redirect, recovery or shared carry must change what the other player can do. Do not simply total independent scores. Keep the main railway free of chains and the empty venue playable as a toy. Serves DESIGN.md 1, 3, 4 and 8; applies to [round-4.md](../plans/round-4.md), step 7, and the future mini-games pass in [decisions.md](../decisions.md). _Proof:_ two people can point to how each helped within their first attempt, without a role-selection screen.

2. **Keep the existing controls dependable and put the wobble in the prop.** Use [`hands.ts`](../../src/player/hands.ts) and [`controls.ts`](../../src/player/controls.ts): E / pad X to interact, click / RT to use or throw, existing movement. Preserve one thing in the hands and leave the empty-hand bump removed. Give focus, held and release states distinct feedback; use a clear silhouette as well as colour. Serves 7 and 10. _Proof:_ perform the same pickup/throw on keyboard, pad and touch; fix missed inputs before adding cosmetic motion. No independent-arm controller or avatar ragdoll rewrite for this pass.

3. **Make a mistake create a recovery job within seconds.** Bank completed subgoals; return escaped props to their latest safe point; let the affected player recover without another person's approval. Start with roughly two seconds to regain a useful action and no loss of existing cosmetics. Use explicit reset generations beside [`owner-sync.ts`](../../src/netplay/owner-sync.ts), not a long interpolation across the arena. Serves 5, 8 and 10. _Proof:_ deliberately miss, wedge a prop, leave during a carry and suspend the owner; all remaining players can keep playing or resume the segment without a full-round reset.

4. **Author short courses from setup, variation and a cooperative payoff.** Change a target's relation to the thrower/helper before adding a verb; allow a forgiving route and an optional trick. Rework [`src/proto/minis/`](../../src/proto/minis/) within its flag, and describe promoted play in [`game-design/minis.md`](../game-design/minis.md). Start around 60–90 seconds for a small course, then measure actual attempts. Serves 1, 7 and 10. _Proof:_ a newcomer reads the useful position from the scene; a fifth attempt still produces a new plan. Run `level-check` for any new static course.

5. **Scale from two collaborators to several loose pairs.** At five to eight players, add adjacent jobs sharing one result, not extra mandatory synchrony. Freeze an attempt's target; late arrivals help immediately and departures release reservations. Apply this to a future mini-game roster using [`net.ts`](../../src/netplay/net.ts) and [`identity.ts`](../../src/player/identity.ts). Serves 4, 6 and 8. _Proof:_ run 2, 3, 4 and 8 participants, including one novice and one person wandering away; nobody must sit out or become the identified reason friends lose a box.

6. **Give each tightly interacting contraption one stable physics owner.** Use [`engine.ts`](../../src/physics/engine.ts) and [`createOwnerSync`](../../src/netplay/owner-sync.ts) as seams, adding a scoped assembly protocol only when needed. Discrete handoffs come first; sustained helper inputs go to the assembly owner, never competing per-contact claims. Keep avatars independent. Serves clear authority and small/readable architecture. _Proof:_ two real clients disagree on neither the deposited cargo nor the owner, including under delay; prototype a segment restart on owner loss before attempting seamless assembly migration.

7. **Separate the funny collision from the durable cosmetic award.** Introduce a round ID, accepted milestones and once-per-player award receipt through the persistent rule pattern in [`world/rules/README.md`](../../src/world/rules/README.md); effects follow `onApplied`. The physical owner reports an outcome and the server validates the discrete claim, without lockstep Rapier. Keep a no-reward physics prototype until that path exists. Serves 6 and clear authority. _Proof:_ duplicate completion, reconnect, late join and lead change give the same participants one entitlement each, never zero or two. Pure rule tests are appropriate here; the toy itself gets seen and played.

8. **Make the next visit social, varied and visibly rewarding.** Test a personal box on every cooperative clear, a strong first reveal, equal payout eligibility across helper roles, a small selectable set of course variations and a place to show the result together. Reuse the presentation lessons in [`place/gifts.ts`](../../src/proto/place/gifts.ts), not its prototype state as a production award service. The old island's endgame role is the task decision recorded above. Serves 1, 6 and 9. _Proof:_ first test replay without boxes, then with boxes, then offer the same friends the hangout on a later evening; distinguish wanting the toy from only chasing its payout.

9. **Validate shared recovery and voluntary replay before expanding content.** Record attempts, accepted assists, recovery delays, ownership churn and voluntary restarts with [`proto/mark.ts`](../../src/proto/mark.ts) and the existing playtest tooling; never record conversation content. Inspect real-time motion using the existing `look` workflow and add a scenario only for a new sync contract. Test 80/150/250 ms added round-trip delay and bursty 250–500 ms stalls as laboratory cases, not claimed user-network percentiles. Test M1 Max quality and an M4 iPad session; use `load` for a full room if presence changes. Serves the repo's playtest-first practice. _Gut question:_ **Did helping your friend make you want another go?**

10. **Prototype Pass the Parcel first: an oversized package that friends keep rescuing.** Use the compact court-to-palms area as a test location, not a final layout commitment. Throw one soft, buoyant parcel through a broad hoop to a receiving mat, then into a picnic basket; a handoff between two distinct participants marks the cooperative clear. A miss stays in a shallow return area, and either friend can recover it. Two play thrower/receiver; three or four add recovery/setup; five to eight get parallel lanes feeding one shared delivery display, with no racing. Start with one parcel and one hoop, 6–8 m apart, and no clock. Solo can throw and retrieve the same toy without a cooperative award. Build a separate prop using the ball entity pattern, not by commandeering the public beach ball. Proposed flag: `?proto=parcel`, registered in [`protos.ts`](../../protos/protos.ts); promotion goes through [`entity.ts`](../../src/entity/entity.ts). One owner through flight; accepted catch transfers authority, and deliveries use recommendation 7. _What's new:_ a friend's receiving position makes a silly throw useful. _Gut question:_ **Was saving the bad throw the best bit?**

11. **Prototype Caddy Crew: build a ridiculous golf shot together.** Extend the wanted golf direction from [`minis/golf.ts`](../../src/proto/minis/golf.ts), replacing local stroke competition with a shared cup and two chunky redirectors that helpers set before the throw. Interact cycles a ramp through a few readable orientations; it latches, so nobody must hold a switch while waiting. Two players alternate setup and throw; three or four set two shots in a short course; five to eight use two adjacent lanes contributing to the same finish. Require an accepted setup contribution by someone other than the thrower for a cooperative clear, retaining it if they leave. Use a separate venue ball if the public ball is occupied; this requires a real multi-object lifecycle, not copying singleton hooks. Ramp state is accepted before the owner starts the shot, making the collision layout consistent; no twitch changes mid-flight. Keep only the unmet hole on a miss. Proposed flag: `?proto=caddy`. _What's new:_ your friend's ramp changes your shot. _Gut question:_ **Did you invent a shot together?**

12. **Prototype Wobble Picnic only after the first network proof: carry one tray, rescue the spill.** A separate optional clearing beside the palms contains one tray, three large soft food props and a picnic table 10–15 m away. Two handles steer a slow, gently stabilized tray; Interact attaches/releases a handle and normal movement supplies bounded carry intent. A third/fourth friend recovers spilled food, with roles freely swapped; five to eight use two trays and one shared table. Bank each delivered piece. No fragile crockery, damage bill, elimination or loss of previous deliveries. One authority simulates each tray and its cargo, with local hand posing and no avatar joints; pause/reset only the unbanked tray segment on owner loss. This is new co-carry behaviour, scoped behind proposed `?proto=picnic`, not a retrofit to normal hauling or the two-person beam in [round-4.md](../plans/round-4.md). _What's new:_ one person's wobble gives another a useful save. _Gut question:_ **Was the wobble funny while you still felt in control?**

## Limits and follow-through

- No game was newly played, no GDC recording watched and no network benchmark run in this documentation task. The shipped-game descriptions and developer accounts were read live; prototype feel remains unverified.
- Published physics constants, full ownership protocols and latency results were not found for Human: Fall Flat or PEAK. TRDS's devlog is a high-level engineering account, and the Heave Ho 2 case study is vendor-authored. Do not fill those gaps with assumed implementation details.
- The two social-research abstracts support a mechanism worth testing, not a causal claim about retention in established eight-person friend groups. Sales, positive reviews, stream views and content counts are not return-rate measurements.
- Reward frequency, the size of the cosmetic collection and variation cadence remain hypotheses. The research does not commit Boogle to operating a daily content service. A course that only earns replays after boxes are added has not yet passed Toys before chores.
- A production mini-game needs its own small implementation plan for shared outcomes and entitlements. Keep new wire shapes additive, use the existing control and entity boundaries, and update the as-built game-design file and prototype card when behaviour actually changes. This report itself changes no gameplay and ships no prototype.
