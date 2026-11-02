# Little guys

_Research report, 2 November 2026. Small ambient characters who make Boogle's stations and towns feel inhabited: readable behaviour, player reactions, cargo and construction, navigation, sound, multiplayer authority and rendering 5–100 residents on an M4 iPad Pro. Reads [DESIGN.md](../../DESIGN.md), the Characters and 2 November decisions in [boogle-2.md](../proposals/boogle-2.md), and [find-the-fun.md](../plans/find-the-fun.md). Builds on [creature-ai-and-ecosystems.md](creature-ai-and-ecosystems.md), [growing-towns.md](growing-towns.md), [characters.md](characters.md), [procedural-animation.md](procedural-animation.md), [comedy-in-games.md](comedy-in-games.md) and [npc-babble-voices.md](npc-babble-voices.md). Research and proposed experiments, not implemented features or new owner decisions._

**Verification.** **[V]** means a fetched source and its relevant text were checked; developer testimony establishes what the developer said, not independent access to the implementation. **[S]** means a secondary account, translated/reproduced interview, or search-only evidence. **[I]** means a Boogle hypothesis, design interpretation, calculation or proposed starting number. **[V, code]** means this checkout was inspected, at `76f20fee`. Live searches and source reads were performed for this report. No referenced game was newly played, talk video watched, character prototype built or M4 iPad benchmark performed. The performance numbers below are test budgets, not results.

## The bet

**[I] Five residents with recognisable intentions will make a station feel more alive than fifty aimless walkers.** The useful sequence is **notice → intend → act → acknowledge → resume**. At a distance, a destination and changing silhouette communicate it. Close up, a glance and a courteous sidestep tell the player the character noticed them. A resident using a newly built place makes the railway's effect legible after the construction animation ends.

The owner asked for little guys like a cuter Boogler, with the Boogler remaining the mayor. Helpers' duties are still open. [DESIGN.md](../../DESIGN.md) makes the boundary concrete: players connect places and still haul for each track segment; the network provides bulk supply. Residents can **embody what the connection achieved**. They should not harvest the next frontier, deliver the player's track materials, choose routes, demand feeding, or introduce a workforce-management screen. Serve principles **1, Toys before chores; 4, Cooperation is automatic; 5, Nothing is the antagonist; 7, Telegraph everything; and 9, Leave something for the next visitor**.

The owner's newer **what looks solid is solid** decision also matters. A cheap crowd the player walks through is not a harmless default. Reachable residents need a collision and yielding answer; distant decoration must not quietly turn intangible when approached. This report proposes a small solid cast first, and treats a hundred visible characters as a stress case, not a town-population target.

## What exists now

| Checked in this checkout | Consequence for this proposal |
| --- | --- |
| [The Boogler](../../src/boogler/boogler.ts) already wanders, visits places, faces nearby players while idle within 7 m and attends conversation within 5 m. His root uses the Host field `g`; he has a kinematic body players can bump into or stand on. | Reuse the idea of attention and shared roots. Do not copy his entire dialogue, friendship, wandering and collider machinery a hundred times. Preserve all his copy and his role. |
| [Buddy](../../src/player/buddy/body.ts) loads a skinned model, retargets authored clips, blends locomotion and advances its stride with distance. Each avatar has an `AnimationMixer`; its preparation-time variable `bakeMs` does **not** mean VAT animation. | The player has a settled visual direction. Ambient residents need their own approved silhouette; primitive figures can test behaviour but are not final art. Borrow stride discipline, not a second bespoke hero pipeline. |
| [Fish](../../src/features/critter-fish.ts), [gulls](../../src/features/critter-gulls.ts) and [fireflies](../../src/features/critter-fireflies.ts) already provide Local life. Fish use a pooled instanced view and TSL deformation; their small flock still uses pairwise neighbour work. | There is a real cheap-crowd precedent. Random movement alone has not answered the owner's complaint about inhabited places; fish-style flocking is not a resident's job system. |
| [`?proto=place`](../../src/proto/place/index.ts) is implemented now. `feedCrane()` removes a dock crate, animates a lift, then calls `crateIn()` and increments `s.people`; [the forge](../../src/proto/place/forge.ts) assembles ordered pieces and starts producing rails. The prototype stores Local progress. | The earlier growing-towns report's “no place implementation yet” statement is stale. Start at the existing crane/forge handoff. Neither the people counter nor a completed animation is a shared economic contract. |
| [NPC voice](../../src/render/npc-voice.ts) and the [audio mixer](../../src/render/audio.ts) are implemented, including a voice bus and ducking. | The earlier voice report is a design history, not a missing-implementation checklist. Reuse this sound path later; don't create a crowd of independently ducking speakers. |
| [Entity lifecycle](../../src/entity/entity.ts), [instance pools](../../src/render/instances.ts), [render contract](../../src/render/README.md), [Host/presence APIs](../../src/netplay/net.ts) and [world-rule recipe](../../src/world/rules/README.md) already establish ownership boundaries. | Build within those boundaries. A pooled crowd can be an entity, as fish demonstrate; a reachable resident can own its collider through an entity. Automatic local entity IDs are not persistent resident identities. |

## What the references actually offer

### Small bodies, large intentions: Pikmin, Bricktrons, Lemmings and soot sprites

**[V]** In Nintendo's [Pikmin 4 developer interview, part 1](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-10-pikmin-4-part-1/), the team traces the creatures to earlier experiments with thinking and emotion, discusses the tiny figure's recognisable plant detail, and describes flat character representations in the Nintendo 64 experiment before moving to 3D. The [official Pikmin 4 site](https://pikmin4.nintendo.com/) describes types with different carrying capabilities. These sources support deliberate readability and visible collective effort; they do not establish a particular shipped flocking algorithm.

**[I]** Borrow Pikmin's contrast between a little body and an outsized load: two residents manoeuvring one broad plank can communicate effort from a train window. Do not import the commander role, assignable labour squads, deaths or a numerical carrying gate. A player should understand the delivery without recruiting residents first.

**[V]** Sauropod's [Castle Story development updates](https://store.steampowered.com/news/posts/?appids=227860&enddate=1433528310) discuss facial-expression shaders and future event connections alongside fixes for workers, stockpiles and logs. The same charming visible work creates coordination and recovery problems. **[I]** Use **the stubby proportions and conspicuous carried objects of Castle Story's Bricktrons, as Boogle's own characters**. Their job-management system is a warning about scope, not a prerequisite for the look.

**[V]** Mike Dailly's [Lemmings development history](https://lemmings.info/lemmings-gamehistory/) describes the tiny animation experiment and the improvements to its walk before the game existed. **[I]** A few distinct poses and their timing can establish a character before facial detail does. Boogle can test a walk, a stop and a surprised lean at thumbnail size. Lemmings' lethal routes, compulsory blockers and rescue accounting conflict with this brief.

**[S]** Cari Callis's [analysis of Spirited Away](https://dspace.palermo.edu/ojs/index.php/cdc/article/download/3839/2129/) describes the soot sprites carrying coal for the bathhouse and Chihiro helping them. It is a film analysis, not an animation production breakdown. **[I]** The useful Ghibli reference is **a tiny creature, an unmistakable task and a burden large enough to change its whole pose**. Try a held anticipation, a wobbling carry and a pleased pause after placement. Candy wages and disappearing without work would turn Boogle's ambience into upkeep; leave those out.

### Life without a workforce: Tiny Glade, Townscaper and Animal Crossing

**[V]** Pounce Light's [Tiny Glade interview](https://80.lv/articles/exclusive-tiny-glade-developers-discuss-bevy-proceduralism-publishers-cozy-games) explicitly connects its calm appeal to the absence of combat/management pressure and the delight of goofy sheep details. It also describes considerable iteration behind apparently simple interactions. **[I]** A resident moving under an awning, looking at a new roof, or taking a seat can sell a place without producing anything. The key is a visible response to context, not simulated hunger. No claim here depends on an undocumented Tiny Glade sheep AI.

**[V]** [Townscaper's publisher description](https://rawfury.com/games/townscaper/) presents a building toy whose forms produce coherent architectural details, without a management objective. **[I]** It is a useful counterexample: life also comes from inviting spaces and evidence of use. Author a perch, a bench and a sheltered doorway before adding more walkers. A bird or resident placed where someone would actually stop contributes more than movement across an empty plaza; this is a composition hypothesis, not a claim about Townscaper's internals.

**[V]** Nintendo's [Animal Crossing: New Horizons update history](https://en-americas-support.nintendo.com/app/answers/detail/a_id/49112) documents plaza group stretching, the café and other shared places. It also records a fix for Brewster overlapping the player and preventing movement. **[I]** Borrow social destinations and optional togetherness: a pair facing each other, someone watching the water, a small group enjoying a finished building. Do not make Boogle's residents calendars of obligations. Even this polished reference demonstrates that a friendly NPC can become a collision bug.

### Memorable individuals: Wind Waker, Koroks, Yiga, Astro Bot and Odyssey

**[S, translated primary interview]** The [Nintendo Dream Wind Waker interview](https://goodblood.games/wind-waker-interview), translated with original scans, discusses Makar and incidental islander details, including the restless Dragon Roost character's later role. **[I]** Wind Waker's Koroks and islanders are useful for **a prop, a posture and a place that belong together**: one resident has a huge measuring stick, another always occupies the station lookout. The intended effect is recognition on return, not procedurally generated backstory.

**[S]** A [Tears of the Kingdom Korok-friend guide](https://www.gamerguides.com/the-legend-of-zelda-tears-of-the-kingdom/database/koroks/collectible/korok-friend/) describes an easily readable separation and destination. **[I]** Koroks' small reveals and clear wants suggest optional micro-encounters: a resident peeks around a post, then waves when noticed. An escort quest or repeatedly hauling the same lost resident would compete with railway work; don't make that the ambient default.

**[S, reproduced primary interview]** In the [Champions' Ballad interview reproduced from Nintendo Switch News](https://miketendo64.com/2017/12/14/interview-nintendo-talk-zelda-breath-of-the-wild-with-director-producer-about-champions-ballad-dlc/), Fujibayashi discusses the Yiga's banana fixation. **[I]** A single visible preference can make behaviour intelligible: our harmless equivalent is a resident distracted by a shiny bolt, who looks at it, remembers the plank in their hands, and resumes. Borrow the legible obsession, without ambushes, theft or sabotaging a delivery.

**[V]** In Team Asobi's [Astro Bot design interview](https://blog.playstation.com/2024/09/09/astro-bot-how-team-asobi-created-a-unified-vision-for-fun/), animation director Jamie Smith discusses childlike delight expressed through movement, while the team describes gameplay prototyping before the art treatment. **[I]** Boogle's bots-equivalent reaction should involve the body: a tiny hop after a beam seats, a leaning look before a wave. One strong response to what the player just did is preferable to constant background cheering.

**[S]** Prima's Odyssey guides describe [Bonneton's hat-centred identity](https://primagames.com/eguides/super-mario-odyssey-eguide/cap-kingdom/welcome-to-bonneton) and [Tostarena's dancing, tourists and visiting Bonneter](https://primagames.com/eguides/super-mario-odyssey-eguide/sand-kingdom/power-moon-locations). **[I]** Sand Kingdom folk and Cap Kingdom folk make their place recognisable through shared shape language and a few specific activities. Give a forge town chunky work props and a port town watching/arrival routines, with individual variations inside that family. Don't add costume gates, floating quest icons or a unique dialogue tree for every resident.

**[V]** [A Short Hike's own site](https://ashorthike.com/) places meeting other hikers alongside exploring trails and taking in the landscape. Adam Robinson-Yu's [GDC postmortem listing](https://gdcvault.com/play/1026613/Independent-Games-Summit-Crafting-A) describes a small initial project made within four months, with deliberate choices about visual style, level design and writing; only the listing was read, not the video. **[I]** A few encounters at places worth pausing can carry an island's social life. Try a resident watching the same distant landmark that draws the player onward, or another occupied with a harmless hobby at the end of a side path. Boogle need not populate every metre or make every meeting a task.

### Useful warnings: Palworld, Dwarf Fortress and Overcooked

**[V]** [Pocketpair's Palworld description](https://store.steampowered.com/app/1623730/Palworld/) makes working alongside creatures central. **[S, mirrored primary patch notes]** Its [1 February 2024 patch](https://steamdb.info/patchnotes/13312439/) addresses base-Pal behaviour including stuck situations and transport problems; the linked original Steam announcement returned no readable body during this research. These are historical fixes, not an assessment of today's build. **[I]** Borrow workers visibly belonging to a workstation. Avoid copying an economy that depends on their individual job selection, physical arrival and needs. That would make Boogle's player a supervisor of pathfinding failures.

**[V]** Bay 12's [Dwarf Fortress development log](https://www.bay12games.com/dwarves/index.html), notably 5 August 2026, describes tavern drinking fixes involving multiple barkeepers and personality, and disabling family-related behaviour until travel supports it. **[I]** Deep agents create stories, but dependencies between needs, jobs and reachable services expand the failure surface. Boogle can get recognition from a stable favourite seat and a characteristic gesture. It does not need hunger, grievances, family simulation or a failure to meet needs.

**[V]** In Ghost Town's [Overcooked IGF interview](https://www.gamedeveloper.com/design/road-to-the-igf-ghost-town-games-i-overcooked-i-), Phil Duncan describes working backwards from cooperative experiences and reducing ingredient combinations to make errors less frustrating. **[I]** Overcooked's chefs are players, not a cheap NPC-crowd solution. Transfer its readable stations and handoffs: take from here, carry that, place there. Keep Boogle's relaxed pace and right of way; kitchen congestion and timers would make residents antagonists.

### AI production evidence: schedules with exceptions beat invisible depth

**[V]** Rez Graham's Game AI Pro chapter, [Breathing Life into Your Background Characters](https://www.gameaipro.com/GameAIPro/GameAIPro_Chapter36_Breathing_Life_into_Your_Background_Characters.pdf), describes schedules and overrides, the limitations of undirected idle/wander behaviour, and staggering transitions rather than making everyone change activities at once. **[V]** Robert Zubek's [1000 NPCs at 60 FPS](https://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter34_1000_NPCs_at_60_FPS.pdf) describes Project Highrise's use of routines and one-off activities, and the cost of complexity that players could not understand. Its population is not evidence that 1,000 animated 3D residents fit Safari on an iPad.

**[I]** Use a small finite-state machine with authored activity sockets, periodic routines and a few priority reactions. Add a new state only for a distinction the player can see. A behaviour tree, utility system, GOAP planner or full ECS conversion is unnecessary for five residents walking known routes.

## What reads as life for the least cost

All costs and starting values in this section are **[I]**, relative engineering/art costs rather than measured milliseconds. Judge at the actual follow camera and from a moving train, not only in a model viewer.

| Behaviour | What the player reads | Cheap first implementation | Priority / failure to avoid |
| --- | --- | --- | --- |
| Travel to a visible destination, stop, do something, return | There is a reason to move | Two authored sockets, one route, one prop and a timed action | First. Endless loops with no outcome read as screensavers. |
| Carry a recognisable delivered object | My cargo belongs here | Attach a presentation prop; change posture and speed | First. Don't shrink the material until it disappears or count it twice. |
| Look at an arriving player or train, then look back | It noticed that | Target selection at a low rate; smooth bounded head/torso turn | First close-up reaction. Avoid constant nearest-player target switching. |
| Yield before a player arrives | It shares this space politely | Predict a short approach; reserve a nearby waiting pocket | First for reachable residents. Never require the player to negotiate a queue. |
| Wave after eye contact | It recognises me | One short clip, a cooldown and one greeter per encounter | Next. Five simultaneous waves feel like a trigger volume. |
| Briefly cheer at a completed placement | That mattered | Two nearby witnesses, staggered hop/arm pose, one event serial | Next. Save big group reactions for a genuine opening. |
| Pair activity: chat, inspect, compare an object | They have a life together | Two reserved sockets, shared start/end, varied gaze | High value after solo routines. No generated dialogue required. |
| Follow the player a few steps | It is curious about me | One volunteer, clear leash, stop outside the work lane | Optional experiment. Endless following becomes a tail, escort obligation or blocker. |
| Blink, shift weight, breathe, adjust grip | A held pose is not a statue | Local phase offsets and one idle variation | Supporting detail. At distance it cannot replace a purpose. |
| Fall, ragdoll, stack, get carried | A physical toy | Ownership transfer, contact recovery and animation transition | Later, separate toy decision. Much more expensive than ambient life. |

**[I] Reaction priority:** clearance/yield first, committed cargo action second, consequential event third, greeting fourth, routine last. Gaze can overlay most states. A builder should look at you without dropping the beam; a wave can wait until hands are free. Give attention a minimum hold around 1 s and a greeting cooldown around 20 s. Test noticing at roughly 6 m and a wave inside 3 m; these are experimental values, not replacements for the Boogler's tuning. Prefer the first approaching player until the encounter ends, with a deterministic tie-break for equally close visitors.

**[I] Distance changes the acting.** Far away, use path arcs, stops, paired loads and a clear up/down gesture. Midrange, use a turn before motion and a carry pose different from a walk. Near the player, eyes, a hand adjustment, foot contact and a quiet acknowledgement matter. Do not scale subtle eye motion into exaggerated whole-body flailing at a distance. An idler looking at the harbour is useful negative space; every resident need not run constantly.

**[I] Cute is a brief, not a mesh primitive.** Try a separate head, low centre of gravity, short limbs, readable eyes and slightly oversized work props: Bricktron proportions, Pikmin effort and soot-sprite timing, as Boogle's own residents. Keep the mayor's silhouette and Buddy's player silhouette distinguishable at a glance. Start near half to two-thirds of Buddy's height only as a comparison; avoid an unreadably tiny cast. The owner rejected earlier code-made hero looks and run cycles in [the character decisions](../proposals/boogle-2.md), so a successful bobbing greybox is not art approval. For final close-up residents, test authored locomotion and carry clips before prescribing procedural wobble.

## Make cargo's effect physical and honest

**[I] The strongest job is the last few metres of an already accepted delivery.** The player/network brings material; a resident receives it, visibly takes it to the adjacent worksite, helps seat a piece, then uses the changed place. The player still sources and hauls for the next connection. Workers are not a multiplier or a required resource.

A first sequence at [the existing forge](../../src/proto/place/forge.ts):

1. The train/crane brings the real crate to its receiving position. A lookout turns; one helper moves to a marked safe spot. The crane continues to do the heavy lifting it already does.
2. At a genuine handoff, the crate's presentation changes to an opened crate and a recognisable plank bundle. Two residents take one beam from it; the bundle and carried beam are two views of one accepted allocation, not additional inventory.
3. They carry it along a 4–8 m side route. An empty-hand return and a slower loaded trip make direction legible. The beam remains visible at the same scale and with the same identifying colour/material.
4. They hold it at a known assembly socket; it becomes part of the scaffolding/building. The construction piece appears at this contact, not on a simultaneous abstract counter elsewhere. A helper steps back to inspect it; one witness gives a small hop.
5. When the project is complete, a resident uses the new bench, doorway or station shelter. On later visits, that changed routine is the persistent evidence of the player's work.

**[I] Separate allocation, presentation and completion.** In a shared version, accepted delivery/allocation and the eventual building state belong to a versioned world rule. Adapters start presentation from `onApplied`; `submitEdit()` only queues. If construction has a duration, make its finish a shared tick-based fact, not a message from whichever character happened to reach a socket. A delivery ID and assembly step identify the visual event; late join/snapshot restore shows the appropriate current phase without replaying every cheer. Repeated notifications cannot create more cargo. Follow the [rules recipe](../../src/world/rules/README.md) and [sync contract](../../src/world/README.md); the current Local `feedCrane()` callback is not sufficient authority.

**[I] Do not let navigation become an economic dependency.** A safe receiving tray can hold paid material visibly while the lane is occupied. If helpers cannot approach, the existing crane seats the piece by the scheduled finish; residents acknowledge it from their waiting pockets. The fallback must preserve a visible, plausible handoff, not teleport a carried beam through a player or drop the earned construction. In the first greybox, keep the worker sequence inside the existing presentation duration and compare it with the crane-only version. Shorten the carry or overlap preparation with the crane if the proposed route cannot fit. If the sequence makes every delivery slower, it has failed even if the characters are charming.

## A small brain and routes that can recover

**[I] Suggested state set:** `idle-at-socket`, `travel`, `perform`, `yield`, `react`, `return`. A task record supplies destination, prop and action; carrying need not become its own planner. Each state has an exit and timeout. Store stable resident ID, home/activity sockets, route segment and progress, current action and its start tick/serial. Cosmetic gaze/blink need not be state. Prefer stable `place-id + resident-slot` identities; do not use spawn order as shared identity.

**[I] Author a tiny route graph in the place layout.** Start with six sockets: receiving tray, assembly point, two waiting pockets, bench and lookout. Give directed work lanes a width, occupancy capacity and a safe alternate. Reserve only the next constrained segment and destination, not an entire route; acquire in stable order and release on timeout/disconnect. Two carriers of one beam are one task with a shared path and fixed offsets, not two independent agents negotiating with each other. Use a spatial grid for nearby actors once counts warrant it, not every NPC against every other NPC each frame.

**[I] Players have right of way.** Predict the player's swept capsule roughly 0.6 s ahead and yield when that sweep conflicts, aiming for at least about 1.5 m clearance; hold until the crossing is clear. Fast approaches must trigger earlier in distance, not wait for a fixed proximity radius. Those numbers need testing against sprint speed, cargo width and network delay. Route NPCs along the side of the apron, never through the only approach to Interact, a track-laying site, train door or boarding platform. A narrow dead end needs a waiting pocket; steering cannot manufacture space.

The [Godot NavigationAgent3D contract](https://docs.godotengine.org/en/stable/classes/class_navigationagent3d.html) **[V]** separates avoidance from movement and warns about the cost of many avoidance-enabled agents. **[I]** A navmesh can route around static obstacles later; local avoidance can keep moving neighbours apart. Neither solves an occupied goal, a doorway too narrow for a plank, or a resident trapping a player. Don't add RVO before the five-character authored graph demonstrates a problem it actually solves.

**[I] Respect solidity without making contact the main interaction.** Give reachable residents simple kinematic bodies through entity lifecycle, modelled on the Boogler's physical contract. Their motion must check clearance; a kinematic body must not bulldoze players, loose cargo or trains. If a player stands on one, pause its ordinary travel until dismount or an explicitly designed safe response. Do not solve contact by disabling collision, snapping through an occupied position, moving the player, or deleting the resident in view. When uncertain, hold safely and choose another free activity. Fewer residents and better routes are acceptable fixes.

**[I] Recovery should be authored too.** After roughly 2 s without progress, release contested reservations, back into a verified free pocket and try one alternate; if no retreat is clear, hold the current safe position rather than snapping to an idle socket. Do not retry a failed path every frame. A distant resident can resume analytically at a later routine phase only when nobody can see or contact it. Moving buildings, changed town stages and disconnects invalidate affected routes/reservations explicitly. Agents should test sprinting across a carry, two players approaching opposite ends, standing on a resident, a parked ball, a stopped train, a missing goal and host departure themselves.

## Share the consequence; choose authority for the character

The four kinds in [DESIGN.md](../../DESIGN.md) are sufficient. **[I]** Neither “everything Local” nor “put a hundred bodies in lockstep” fits this brief.

| Piece | Proposed kind | Why and boundary |
| --- | --- | --- |
| Blinks, breathing, small head/eye offsets, gait phase, client audio | Local | No gameplay result depends on the exact pose. Keep held props/root contact aligned with shared actions. |
| Distant routine in a fixed place, with no contact or consequential interaction | Seed + shared tick, as the existing shared-schedule pattern | Derive identity, activity slot and route phase directly; no pose packets or replay from frame zero. Seed alone does not synchronise random calls, variable frame deltas or reactions to different local players. |
| Five reachable station residents, including whom they yield to and where they stand | Host root/action, Local animation | The lead tab chooses one shared root and action; other tabs sample snapshots. This is the Boogler precedent. Start small: Host is intended for a few dozen numbers, not an unrestricted crowd service. |
| A later resident/toy that a player can pick up or physically drive | Owner, with handover | Use [`createOwnerSync`](../../src/netplay/owner-sync.ts) for a shared object that changes hands. Merely being alive does not justify Owner. Do not bolt pickup onto every ambient resident. |
| Accepted material, built plots, durable town stage and resident roster changes | Lockstep | Persist/hash the few economic facts; derive population and schedules from them. No skeletal pose, Rapier result or cosmetic RNG enters the rule. |
| A one-off honk or optional acknowledgement with no lasting state | Validated room event when it must be shared | Use the [room API](../../src/net/README.md). Consequential construction reactions should derive from the accepted event, not an unverified client claim. |

**[I] For five residents**, try a single clearly named Host field containing compact root/action records, respecting the [registry](../../dev/registry/check.ts). Root position, heading and a small action code are enough for most animation; include a target identity only where a shared greeting needs one. Use [`createSnaps`](../../src/netplay/snaps.ts), not separate uncoordinated smoothers. A new lead can restart harmless routines from safe current positions; it must not repeat a paid delivery. On absent/stale Host data, stop speculative movement safely and recover/reseed after authority returns. An interpolated kinematic crowd still needs two-tab contact testing: a Host field is not a guarantee of convincing collisions at latency.

**[I] Bandwidth illustration:** six 32-bit numbers per resident at the current 20 Hz presence cadence would be 2.4 kB/s for five residents or 48 kB/s for a hundred, before IDs, framing and transport overhead. Relaying the latter to seven peers would copy 336 kB/s server-side. This is arithmetic for a hypothetical packed representation, not the current JSON wire size or a proposal to change the protocol. Measure actual bytes with [the load harness](../../dev/peer-test/ws-run.ts) before expanding Host state; send compact shared activity facts instead of bones. Bound incoming counts, IDs, positions and action values, and clear a stopped feature's presence field rather than leaving stale residents active.

**[I] At town scale**, first measure twelve reachable residents. Use seed/tick routines for background life and Host deviations only where players can interact, if needed. Promotion must depend on **any player's proximity**, with stable IDs and a coherent handoff of position/action, not each camera's frustum. Keep an active contact alive until clear, even when offscreen. If everyone gathers around all residents, that is the real worst case; do not enforce a budget by making some suddenly intangible. Limit spatial population or design additional safe routes instead. A hundred simultaneously physical, reactive residents may require authority work beyond this first feature and should not be promised by the rendering test.

**[I] Deterministic schedules are small, bounded calculations.** Compute a cycle/slot from the shared tick and a stable seed, then select a route and phase. Add stable offsets so everyone does not stand up together. If these decisions affect shared facts, use the allowed integer/deterministic math in `src/sim/`; TSL sine, gaze and foot embellishment remain presentation. A local random-walk simulation started with the same seed is not equivalent.

## Rendering and simulation from 5 to 100 on M4 iPad

### Compare the standard engine solutions

**[V] Unity's [GPU instancing documentation](https://docs.unity3d.com/6000.0/Documentation/Manual/GPUInstancing.html)** distinguishes ordinary mesh instancing from `SkinnedMeshRenderer`, which its standard automatic instancing path does not support. **[V] Unreal's [Animation Budget Allocator](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-budget-allocator-in-unreal-engine)** spends animation work according to significance, including reducing update frequency. **[V] Godot's [thousands-of-fish tutorial](https://docs.godotengine.org/en/stable/tutorials/performance/vertex_animation/animating_thousands_of_fish.html)** combines MultiMesh with per-instance data and vertex animation.

**[I] Boogle's equivalent is explicit and smaller:** pooled instanced meshes, TSL animation and a significance-based update schedule. three.js does not turn a collection of ordinary `SkinnedMesh` instances into one cheap draw automatically. We need not import an engine-scale crowd framework. Keep authoritative decisions in state and derive rendering from it; do not move brains to a compute shader just because vertex animation belongs there.

### Choose animation after proving the acting

| Technique | Good fit | Cost or limit to measure |
| --- | --- | --- |
| A few rigid parts, instanced by part; TSL bob/limb transforms | Five greybox residents; distant simplified bodies | Usually several draws per spatial batch, not one draw per whole person. Limited foot planting, grip and expressive posing. Do not mistake a cheap result for approved final art. |
| Authored skeletal clips on a few near characters | Close gaze, gestures, convincing two-hand carrying | Per-character animation/skeleton work, materials and shadows. Reuse clip/asset loading conventions, but do not clone the entire Buddy feature for NPCs. |
| Vertex animation textures (VAT), shared geometry and per-instance clip/phase | Many copies with a small, stable animation vocabulary | Texture memory/bandwidth, bake pipeline, deformation bounds, transitions, normals and attachment sockets. Root movement and AI still cost CPU. |
| Baked bone-transform textures / instanced GPU skinning | Many clips on a low-bone rig | Potentially less animation data than per-vertex baking, but more decoding/skin work and implementation burden. Benchmark against the simpler choices. |

**[V]** The current [three-vat project README](https://github.com/MikeFernandez-Pro/three-vat) documents a TSL/WebGPU entry point, shared geometry with draws per material, offline baking and rig encoding. Its current playback format includes crossfade data; an older blanket claim that it cannot crossfade is stale. Its CPU claim concerns animation playback, not pathfinding, root transforms, collision or upload costs. **[I]** It is a candidate to pin and test against Boogle's installed three r187, not an approved dependency or demonstrated iPad result. Check its actual TSL path, shadow deformation, loading stall, clip changes and attachment support before adopting it.

**[I] Illustrative memory arithmetic:** 1,000 vertices × 120 baked frames × 16 bytes for position plus normal in two RGBA16F texels = **1,920,000 bytes, about 1.83 MiB**, before padding, metadata and extra clips. Those 120 frames could be four one-second clips at 30 fps. All 100 instances share that atlas. Four times as many unique vertices or frames multiplies it accordingly. This is a format example, not three-vat's actual allocation. Measure the baked output and queried device limits; animation textures are numeric data, not sRGB art textures. A rigid hand prop needs a matching sampled socket/transform or a separate near rig: baking only vertex positions does not supply CPU hand bones for free.

**[I] Start with shared geometry/materials**, per-instance colour/phase/action and a few spatial batches, using [`createPool`](../../src/render/instances.ts). Do not make one giant town-wide bound or a unique material for every resident. The [three.js InstancedMesh contract](https://threejs.org/docs/pages/InstancedMesh.html) **[V]** requires updated instance data and appropriate bounds. **[I]** Existing pool bounds use rest geometry; enlarge them for head turns, carried loads and shader displacement, or characters will vanish at the screen edge. Check TSL coordinate space against [the render contract](../../src/render/README.md) rather than assuming `positionNode` is always local. Share a palette/face atlas, avoid layered transparent faces, and keep extra realtime lights out of the crowd.

### LOD the decisions as well as the mesh

**[I] Starting tiers**, selected by projected size with approximately 15% hysteresis; physical/contact activation is a separate decision:

| Visible size | Appearance | Decision work | Contact / rendering |
| --- | --- | --- | --- |
| Above about 80 px high | Full near body; authored carry/gesture, gaze and feet | Attention/routine choice around 10 Hz; interpolate every rendered frame | Reachable bodies remain on the physics step; cast shadows for the small near cast. |
| About 20–80 px | Simplified shared geometry and pose; keep prop silhouette | Route/activity choice around 5 Hz, staggered across residents | Preserve continuous root movement. Reduce secondary motion and shadow casters. |
| About 6–20 px | Low-detail body and broad activity pose | Analytic schedule or roughly 1–2 Hz decision refresh | No facial evaluation; no individual distant realtime shadow. Maintain sufficient geometry for the silhouette. |
| Below about 6 px / offscreen | Omit tiny detail; eventually omit the draw | No cosmetic updates; retain only required schedule/shared facts | Visibility never deletes a collider someone is touching. Resume from current time, not accumulated frame updates. |

These thresholds depend on resolution and camera. **[I]** For scale only: a 1 m figure, 900 px image height and 60° vertical FOV projects to about 156 px at 5 m, 31 px at 25 m and 13 px at 60 m. That makes hundreds of detailed faces at train-view distances wasteful. Tiny figures need stronger composition, not more bones. Keep near and far feet/root phase consistent across a transition; do not make the whole mesh jump from a 2 Hz transform.

### Measure the complete scene

**[I] Test populations 0, 5, 20, 50 and 100 in the same station/town view**, then the same counts spread across courtyards. Include a scene with all agents close enough to react and contact; do not report a scattered rendering-only test as a dense AI result. Compare ordinary near rigs, rigid/TSL instancing and VAT only if the first two establish a bottleneck.

Use [`npm run counts`](../../dev/look/counts.ts) for draw/shadow/program counts, [`npm run perf`](../../dev/look/perf.ts) and [`npm run hitches`](../../dev/look/hitches.ts) for local comparison, and real Safari on the M4 iPad for acceptance. The existing [`?buddies=8` debug view](../../src/debug/buddy-crowd.ts) is a useful avatar baseline, capped at 32, but exercises stationary jogging rather than NPC navigation, carry or crowd authority. The owner's phone observation in the decision log is not a 100-NPC iPad benchmark.

**[I] Provisional budget:** aim for a 60 Hz experience, roughly 16.7 ms per frame; seek crowd deltas below about **0.5 ms CPU and 1 ms GPU** in the representative 20-resident scene before considering 100. These are falsifiable targets, not available headroom. Record median/p95/p99 frame intervals, long frames, root/AI time, physics cost, draw/shadow counts, texture bytes and network bytes separately. When GPU timestamps are unavailable, say so and use controlled frame-time comparisons; do not label total frame time GPU time.

Use `?dpr=fixed` for comparable renders, then repeat with normal adaptive resolution to check the shipping experience. Record device/OS/browser, resolution, DPR and thermal conditions. Include first shader compilation, a moving camera, deliveries, eight players, two separated groups, 15 minutes of warmed play, background/resume and host departure. A Mac Metal or CI SwiftShader run cannot establish the M4 result. Run performance measurements with the shared GPU otherwise idle; use [webgpu-on-ipad.md](webgpu-on-ipad.md) for the broader device procedure. Reduce shadows, far animation and material count before stripping the near resident's reaction that makes the feature worthwhile.

## Sound should confirm attention, not announce population

**[I] Begin silent apart from existing world sounds.** The owner's [sound decisions](../proposals/boogle-2.md) cut several freight/vehicle sounds pending better references; the NPC feature should not restore them by another name. A handoff can use an already approved world sound when appropriate, but five simultaneous footsteps, tool taps and babble loops would obscure friends and the player's actions.

**[I] Then try one local audible foreground resident at a time**, within roughly 4–6 m, with an encounter cooldown around 15–30 s. Prefer a tiny acknowledgement after eye contact or a rare completion chirp; do not continuously feed ambient text into the [dialogue voice system](../../src/render/npc-voice.ts). Priority goes to actual dialogue and deliberate player actions, then one nearby reaction. Drop excess ambient vocal requests rather than queuing a chorus that plays after the event. Shared events can have locally selected audible participants. Crowd voices must not repeatedly duck music/ambience through independent calls. No per-resident distant chatter sources; at larger scales a quiet place-level texture is an optional, separately judged sound-design choice.

## Two suggested behaviour sets

Everything here is **[I]**, a playtest composition rather than an approved population/economy. Keep the same residents between visits; alter their activity when the place changes. These sets deliberately include people who are not working.

### One greybox station: five residents

Use the forge-side station in [`?proto=place`](../../src/proto/place/index.ts), with sockets/routes in [its layout](../../src/proto/place/layout.ts). Preserve the player's cargo and boarding approaches.

| Cast | Ordinary loop | Response to player / delivery |
| --- | --- | --- |
| Two carriers | Wait at receiving tray; carry one accepted beam together to assembly; return empty | Brief eye turn, early yielding; a shared set-down and inspection. No wandering while holding different ends of a load. |
| One site helper | Inspect scaffolding, adjust a prop, return to a work socket | Looks at the crane, seats/indicates the incoming piece, steps back. Does not generate construction resources. |
| One lookout | Watch the line from a safe side perch; occasionally visit the noticeboard | Turns before train arrival, waves once; attends a completion with one small hop. |
| One idler | Sit on a crate/bench, watch water, stretch, take a short side path | Looks at a nearby player; occasionally waves back, then resumes. No job quota. |

**What's new:** five residents notice you and physically acknowledge the material that builds the forge. **Gut question:** “Did this feel like a place people live in?”

Keep the first behaviour comparison silent and the route small. A solo Local greybox can answer the charm question, but mark it as such; the shared-root/contact experiment in recommendation 6 must answer multiplayer before promoting reachable residents. It is not necessary to build a new map, resource catalogue or staffing system to run this test.

### One town: twelve residents across three places

Twelve is an experimental next step, not a revision of [growing-towns.md](growing-towns.md)'s earlier proposed budgets. Keep the station cast's identity, moving the site helper into workshop street after construction, then add residents as the town gains public places.

| Place and cast | Readable activity | Change paid for by the railway |
| --- | --- | --- |
| Station, four | Two carriers, one greeter, one watcher; short arrival pulse followed by a lull | An awning gives the watcher shelter; a new receiving area changes the carriers' destination. |
| Workshop street, four | Two work/inspect residents and two who pause to compare an object or watch | Delivered timber becomes a bench or roof; iron changes a visible workshop prop. Materials need not map one-to-one to building types. |
| Plaza/waterfront, four | A pair sitting/talking, a solitary lookout and one curious short-route stroller | A completed public place gains users. An opening gets a brief shared reaction, then ordinary life returns. |

**[I]** Prefer a mix where roughly half are stationary at any instant, with a few trips and one focal event. Stagger starts; do not use one population-wide random timer. The route and poses should let someone say “that's the one who watches the trains” without a nameplate. An optional curious resident can follow 3–5 m, stop at the plaza edge and return; if that draws players into babysitting, remove the follow behaviour before adding sophistication.

**What's new:** three neighbourhoods have distinct routines that change when deliveries improve the town. **Gut question:** “Did you want to stop here on the way through?”

## Later meaning, without taking over play

**[I]** Give design more **relationships to places**, not more work to delegate: a favourite spot, a recognisable prop, a partner for a short routine, a reaction to a new landmark, a ride as a passenger, or an optional pointer toward something strange in the distance. A familiar resident watching a newly connected line can make progress personal. Persist only facts the player can recognise; don't save every blink or invent hidden needs to justify an idle animation.

**[I]** Local last-metre unloading, assembling already paid town pieces and operating a public amenity are compatible roles. Gathering frontier resources, carrying material to the next track segment, choosing the next connection, repairing decay and improving output through worker counts change the player's job. Those need a separate owner decision, not an ambient-character implementation detail. Gifts or friendship should remain optional and must not quietly reproduce the Boogler's unique relationship system. There is no resident happiness tax for leaving the game.

## Numbered recommendations

All recommendations are **[I]**, ordered as experiments. Each names the code/plan it would touch; those references are integration points, not permission to implement everything at once.

### 1. Prove five purposeful residents at the existing station

Use the station cast above in [place](../../src/proto/place/index.ts), serving Toys before chores and Telegraph everything. Give each a destination, a pause and a visible activity; keep an idler. Build on the already answered place/haul questions in [find-the-fun.md](../plans/find-the-fun.md), without reopening the world layout or ticking a new result before a playtest.

**Smallest prototype:** the existing forge apron with five greybox bodies, six activity sockets and one delivery cycle; compare with residents hidden. **Gut question:** “Does this place feel inhabited?”

### 2. Establish a cute, readable silhouette before adding variety

Use Bricktron proportions, Pikmin effort and soot-sprite timing by name; keep the mayor and player recognisable. Follow the [character decisions](../proposals/boogle-2.md) and [Buddy's authored-clip conventions](../../src/player/buddy/body.ts), without changing Buddy. A primitive behaviour test must be followed by a proper model/animation comparison before final art is chosen.

**Smallest prototype:** one resident walking empty and carrying a broad plank, seen close up and from the train; compare two proportions with identical acting. **Gut question:** “Would you stop to watch this little guy?”

### 3. Prioritise looking and yielding, then wave and cheer sparingly

Use [the Boogler's attention precedent](../../src/boogler/boogler.ts), but a much smaller reaction set. Let held work finish, give one greeter the encounter, and tie cheering to a visible result. Test short following separately; any optional invitation uses [existing Interact](../../src/player/hands.ts) or the existing honk flow rather than another key.

**Smallest prototype:** one resident notices an approach, steps aside, gives one wave, and resumes; two witnesses react to one placed beam. **Gut question:** “Did it notice you without getting in your way?”

### 4. Make residents reveal accepted cargo's last few metres

Extend the presentation around [`feedCrane()`](../../src/proto/place/index.ts) and [`crateIn()`](../../src/proto/place/forge.ts), preserving the crane's role. In a shared version, use accepted rule events and persistent construction facts through [the rules recipe](../../src/world/rules/README.md); animation completion never mints materials or authorises progress. This serves Telegraph everything and Leave something for the next visitor.

**Smallest prototype:** one identifiable beam moves from the delivered crate into one real building piece; compare against crane-only construction with equal completion time. **Gut question:** “Could you see what your delivery became?”

### 5. Author safe work routes and explicit recovery before general navigation

Add sockets, side lanes and waiting pockets alongside [place layout](../../src/proto/place/layout.ts). Reachable residents use [entity-owned bodies](../../src/entity/entity.ts); honour the [solidity decision](../proposals/boogle-2.md). Start with the six-state controller and one paired-carry task, with players having right of way. Geometry/layout changes go through [level-check](../../dev/level/check.ts), plus actual resident-contact inspection because the static checker does not prove crowd safety.

**Smallest prototype:** two carriers and one solid resident in a narrow approach with a safe passing pocket; agents exercise parked cargo, opposite approaches, sprinting and standing on a resident. **Gut question:** “Could you forget about navigating around them?”

### 6. Share reachable roots; keep cosmetic life Local and schedules seeded

Use a small Host cast via [`addHostField`](../../src/netplay/net.ts), [`createSnaps`](../../src/netplay/snaps.ts) and stable resident IDs; derive distant routines from shared tick/seed. Use Owner only for a later player-driven physical toy and Lockstep only for durable economic facts. Follow [DESIGN.md's sync table](../../DESIGN.md), not one authority choice for every part.

**Smallest prototype:** two tabs see the same five residents, one cargo handoff and one greeting target; leave the lead tab during a carry and join late. Add a scenario only for the resulting sync contract, per [AGENTS.md](../../AGENTS.md). **Gut question:** “Did it feel like we were visiting the same people?”

### 7. Start with shared meshes; adopt VAT only when a measured crowd needs it

Use [instance pools](../../src/render/instances.ts), [entity lifecycle](../../src/entity/entity.ts) and TSL under [the rendering contract](../../src/render/README.md). Compare a small near skeletal cast against rigid/TSL instances; if animation CPU dominates at scale, test a pinned VAT candidate with proper bounds, shadows, clip transitions and hand attachments. Don't convert the player's animation system to solve an unmeasured crowd problem.

**Smallest prototype:** render the same walk/carry/cheer on 20 identical residents with the two simplest paths; add the VAT variant only if needed. **Gut question:** “Do they still feel like characters when you get close?”

### 8. Measure 5, 20, 50 and 100 on the actual M4 iPad

Apply screen-size and decision-rate LOD, spatial batches and reduced distant shadows. Use [counts](../../dev/look/counts.ts), [perf](../../dev/look/perf.ts), [hitches](../../dev/look/hitches.ts) and the [iPad research procedure](webgpu-on-ipad.md); preserve contacted bodies regardless of visibility. A rendering-only hundred does not establish a hundred physical brains.

**Smallest prototype:** the fixed-view count sweep plus a dense near view on M4 Safari, then the representative count with eight players, deliveries and warmed play. Record visual losses alongside timing and memory. **Gut question:** “Does the busy town still feel effortless to move through?”

### 9. Give the crowd a silence budget before a voice palette

Start silent, then allow one nearby acknowledgement at a time through [NPC voice](../../src/render/npc-voice.ts) and [the mixer](../../src/render/audio.ts). Respect the owner's [existing sound decisions](../proposals/boogle-2.md); avoid per-agent chatter loops, repeated ducking and restored freight noises. Hearing a resident should correspond to something worth noticing.

**Smallest prototype:** compare the five-resident scene silent and with one rare greeting/completion chirp, including a Boogler conversation nearby. **Gut question:** “Was hearing them pleasant after the novelty wore off?”

### 10. Grow into place-specific routines, not a labour economy

Try the twelve-resident town set against [growing-towns.md](growing-towns.md) and [the helper decisions](../proposals/boogle-2.md). New deliveries should create places residents use; return visits should reveal familiar habits in a changed town. Frontier harvesting, track hauling, staffing bonuses and upkeep stay outside this feature unless the owner changes the design.

**Smallest prototype:** add one paid bench/shelter and move two familiar residents into a new routine there; leave the next player haul untouched. **Gut question:** “Did your work make this a nicer place to come back to?”
