# Movement abilities and gated exploration

*Research report, 2 November 2026. Round 4 of `?proto=place`: double jump, hook shot, a Breath of the Wild-leaning glide, and reasons to revisit familiar paths. Live web research, a controller/input/camera/collision audit at `e402350a`, and inspection of the moves prototype before archive commit `98027243`. No game was played, implementation changed, or proposed route collision-tested for this report. Every Boogle tuning value and new placement below is a hypothesis, not an approved design or a measurement of another game.*

**Evidence:** **[V]** fetched primary source; **[S]** secondary source or indexed text whose full source could not be inspected; **[C]** repository fact or calculation from it; **[H]** proposed Boogle behaviour, number or inference. Sources are inline. GDC abstracts establish the subject of a talk, not that its full contents were watched.

## Scope and decision boundary

[Round 4](../plans/round-4.md) and the latest [playtests](../playtests.md) take precedence over older research: first a satisfying walkable connection, trains later; double jump from connecting, then hook targets up the middle tower to earn glide; one or two main-line gates, optional discoveries elsewhere, cosmetics in every area, and missed prizes available at home. The two-player round 3 liked the tedious path becoming a shortcut, wanted complexity after early deliveries, and found trains removed the friction too soon. Earlier notes liked the moves as **later unlocks**, disliked the hero's whole-body lean and aerial animation, and repeatedly found visible objects insufficiently solid. Those are requirements for this proposal, not reasons to add more chores [C].

This serves [DESIGN.md](../../DESIGN.md) **1, Toys before chores; 4, Cooperation is automatic; 7, Telegraph everything; and 10, Slapstick over precision**. Principle 3 keeps side activities out of compulsory chains. The owner's explicit allowance for a few traversal gates in [boogle-2.md](../proposals/boogle-2.md) is narrow: the two gates proposed here belong to the main exploration route; none of the eight secrets supplies a compulsory key. No stamina, damage, mandatory two-person stunt, rail grinding, or restoration of the archived moves prototype is proposed.

Read alongside [third-person-platformer-movement.md](third-person-platformer-movement.md), [character-controller-feel.md](character-controller-feel.md), [ratchet-and-clank-feel.md](ratchet-and-clank-feel.md), [discovery-progression.md](discovery-progression.md), [level-design.md](level-design.md) and [cross-device-input.md](cross-device-input.md). Their useful principles survive; their old avatar paths, pad layout, progression prerequisites and proposed grind do not all describe this checkout. This report and the Ratchet report use the house format; current code below is the authority for implementation facts.

## 1. What the references actually contribute

### Breath of the Wild: altitude becomes freedom

Nintendo's [Explorer's Guide](https://media.nintendo.com/zelda/breath-of-the-wild/assets/ExplorersGuide.pdf) describes the four Plateau shrines, return to the Old Man, and paraglider reward; the Plateau retains things to discover after departure [S, indexed official guide]. The useful structure is a bounded place that demonstrates several verbs, lets players choose routes between demonstrations, then gives a new way to read the whole place. It is not a requirement for four shrines, a long tutorial, or a task checklist [H]. Nintendo's [Change and Constant GDC session](https://www.gdcvault.com/play/1024562/Change-and-Constant-Breaking-Conventions) is a primary talk listing; its full presentation was not inspected here.

There is one usable quantitative source: McKee, Goodwin, Horton, James and Mander's 2019 University of Leicester student paper, [*Paragliding through Hyrule*](https://journals.le.ac.uk/index.php/pst/article/view/3330), with the [two-page PDF](https://journals.le.ac.uk/index.php/pst/article/download/3330/3017/8787) downloaded and read. They estimate a **70 m descent in 22 s**, about **3.2 m/s down**, while **not moving horizontally**. They observe settling to descent speed within **2–4 frames at 30 fps**, about **67–133 ms** [V]. This is an observational measurement with approximate world scale, not Nintendo's controller constants; it provides no error bars. It does not establish braking time after opening at terminal free-fall speed, horizontal speed, turn rate, or moving-flight sink. Their real-aerodynamics calculations and assumed gravity are not appropriate Boogle constants.

**Copy:** fast deployment, a legible steady descent, generous directional correction, free looking, a large destination visible below, and the satisfaction that climbing bought travel. **Drop:** stamina depletion, rain-related obstruction, mandatory updraft puzzles and aerodynamic simulation. Keep gravity's price: opening must never create height, and repeated closing/opening must not pump velocity [H]. Start at **8 m/s forward, 2.5 m/s sink**, and compare **3.2 m/s sink** as the evidence-anchored variant. These are Boogle hypotheses, not “BotW's numbers.”

### Mario 64 and Odyssey: several expressive moves, one readable intention

The [Super Mario 64 manual](https://m1.nintendo.net/docvc/NUS/EUR/NSMP/NSMP_E.pdf) describes consecutive jumps timed on landing, running/crouching into a long jump, and wall kicks [S, indexed official manual]. Its “double jump” is a second **ground launch**, not the once-per-flight aerial jump Boogle needs. Odyssey's [Nintendo description](https://www.nintendo.com/en-ca/store/products/super-mario-odyssey-105880/) identifies cap throw, cap jump and capture [V]; the [Prima control guide](https://primagames.com/eguides/super-mario-odyssey-eguide/a-kingdom-travelers-guide/control-schemes) documents chaining cap throw, dive and cap bounce [S]. The takeaway is immediate composition and an extra chance to correct a landing, not copying a large move vocabulary or importing unit conversions from a decompilation.

Nintendo's developers explain accepting midair directional control because it makes the intended action feel right in [Iwata Asks: “What Is Stomping?”](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-SUPER-MARIO-3D-LAND/Vol-2-The-producers/4-What-Is-Stomping-/4-What-Is-Stomping-215798.html) [V]. For Boogle, double jump should fix both height and a slightly wrong heading; an extra vertical kick with weak steering is only half the reward [H].

### A Hat in Time: recovery and readable anchors

The community [movement reference](https://ahatintime.wiki.gg/wiki/Movement) describes a second aerial jump, dive cancellation and a sprint jump that sacrifices the double jump; the [Hookshot Badge reference](https://ahatintime.wiki.gg/wiki/Hookshot_Badge) describes dedicated hook points, an availability cue, holding to swing and release into renewed movement [S]. These are secondary gameplay descriptions, not verified engine values. Borrow a visibly distinct second jump and forgiving continuation after a hook. Do not add the dive, a hold/release pendulum, or resets on every airborne latch to this first version. Resetting the second jump on a latch would create an unbounded height ladder unless every interaction were separately constrained [H].

### A Short Hike: the hill is a reward machine

Adam Robinson-Yu describes using landmarks and collectables to tempt departures from paths, making movement enjoyable, and composing terrain around exploration in his [Road to the IGF interview](https://www.gamedeveloper.com/business/road-to-the-igf-adam-robinson-yu-s-i-a-short-hike-i-) [V]. His [PlayStation release post](https://blog.playstation.com/2021/11/13/the-award-winning-a-short-hike-hits-ps4-november-16/) stresses freedom to explore without invisible walls and intrusive cutscenes [V]. The [GDC postmortem](https://www.gdcvault.com/play/1026613/) was available as an abstract, not watched.

Golden feathers increase the reserve used for climbing and extra flaps; standing restores it, and ordinary gliding does not consume that reserve [S, [gameplay guide](https://www.neoseeker.com/a-short-hike/walkthrough)]. The useful lesson is that a power changes which route looks inviting and makes the return trip playful. Boogle already chose discrete abilities: do not make eight secrets into eight mandatory feather-equivalents. Offer cosmetic finds and advantageous approaches; do not sell glide duration [H].

### Tunic, Metroid and Hollow Knight: remember the obstruction, understand the return

Andrew Shouldice describes hidden mechanics that existed before the player understood them, and making essential manual information more explicit than peripheral mysteries, in [this Tunic developer interview](https://www.gamedeveloper.com/business/how-tunic-weaves-wondrous-unknowable-worlds-inspired-by-inscrutable-nes-manuals) [V]. Borrow “that was here all along” for optional places: a familiar wall's slit becomes the entrance, a distant bell explains a hollow under the bridge. Do not hide the mandatory hook button behind a riddle [H].

Nintendo's [Metroid Dread exploration pointers](https://www.nintendo.com/au/news-and-articles/metroid-dread-report-vol-11-power-through-with-these-pointers-for-exploration-and-combat/) discuss hidden routes, visual/audio hints and map information that helps connect a new power to old obstacles [V]. Repeat a small visual grammar: the same hook-ring silhouette at the tutorial and the trestle secret. Avoid a rainbow of unexplained lock types or a need to test every wall [H].

Team Cherry describe starting from an ability order, then loosening hard gates and accepting alternate routes, in [their map-design interview](https://www.pcgamer.com/how-to-design-a-great-metroidvania-map/) [V, direct developer quotations in a reported interview]. Boogle should distinguish a progression prerequisite from the route most players will take: keep the two critical beats understandable, welcome a clever early secret, and let a permanent shortcut erase a challenge once understood [H].

### Zelda and Ratchet & Clank: an authored destination beats an ambiguous rope

The [Ocarina of Time manual](https://m1.nintendo.net/docvc/NUS/USA/CZLE/CZLE_E.pdf) says the hook catches certain objects and uses an aiming dot to communicate range [S, indexed official manual]. The important contract is specificity: “that is a target, it is reachable, this is where I will go.” Boogle's target should have shape, a spool/ring animation and a sound, with colour as a redundant cue [H].

Insomniac's [Rift Apart introduction](https://blog.playstation.com/2021/05/18/welcome-to-zurkon-jr-s-almost-launch-party-for-ratchet-clank-rift-apart/) distinguishes the Rift Tether from other traversal powers [V]. Its [accessibility documentation](https://support.insomniac.games/hc/en-us/articles/46716208107795-What-Accessibility-options-does-Ratchet-Clank-Rift-Apart-feature) offers swing hold/toggle, Auto Glide, flight assistance and adjustable prompts [V]. A swing and a pull are different toys. Start Boogle with a **one-press fixed-target pull ending on a platform**; reserve a pendulum for a separate decision. A safe arrival and intelligible targeting matter more than simulating rope tension [H].

### Astro Bot and short secret-rich games

Team Asobi's [developer interview](https://blog.playstation.com/2024/09/09/astro-bot-how-team-asobi-created-a-unified-vision-for-fun/) describes building art around gameplay scenarios and developing primitive prototypes into polished interactions [V]. The [official hands-on report](https://blog.playstation.com/2024/06/12/astro-bot-hands-on-report/) describes jump/hover and conspicuous situational powers [V]. Borrow a short sequence that makes one power shine, a broad landing and a reward you can see reacting; do not equate expressive animation with delayed input [H].

I could not identify a unique title or developer meant by “Good Game Itch.” This report interprets it as the itch of short, dense hidden-secret exploration, not a verified named reference. Siactro's own [Super Kiwi 64 page](https://siactro.itch.io/super-kiwi-64) describes eight small worlds, jumping/gliding/wall sticking, non-linear completion and hidden history [V]. It is a closer scale reference than a full Metroidvania: let a small route contain more than one discovery, and make a completed area worth looking at differently. A new colour of crate at every stop will not achieve that [H].

## 2. Current Boogle: the movement budget we actually have

| System | Verified current behaviour | Consequence |
| --- | --- | --- |
| Controller | [Player state](../../src/entities/player/state.ts), re-exported by [player.ts](../../src/player/player.ts): walk 5.6 m/s, sprint 9.5; ground acceleration 70, braking 115, air steering 14 m/s² (`?air=35` override). | Air correction is the first tuning comparison; changing ground locomotion is unnecessary. |
| Body and clock | [Constants](../../src/constants.ts): two radius-0.45 m spheres 0.8 m apart, total height 1.7 m, mass 70 kg; gravity 18 m/s²; 60 Hz fixed steps. [Rapier backend](../../src/physics/backend-rapier.ts) enables CCD for dynamic bodies. | Check a body-sized corridor, not just the hook's ray. The older “no CCD” comment in the physics wrapper is stale. |
| Jump | Launch adds 7.6 m/s to positive vertical velocity capped at 6; 150 ms press buffer, 100 ms coyote; rising release gravity ×2.5, near-apex gravity ×0.5 below 1.6 m/s, falling gravity ×1.7; fall speed capped at 20. | An airborne jump must participate explicitly in arc shaping; it cannot just edit velocity after the controller. |
| Grounding | Walkable normal y ≥0.55, about 56.6°; snap gap ≤0.45 m. Coyote is grace, not evidence of a new landing. Platform carry is accounted for in steering. | Refresh an air charge on genuine ground contact; do not double-add train velocity or snap a rising air jump to a floor. |
| Ordering | [Player headless entity](../../src/entities/player/headless.ts): jump shaping fixedPre order 30; controller fixedPre 40; grounding fixedPost 20. | Decide the active movement mode before forces are accumulated. No second frame loop or force applied after integration. |
| Camera | [Camera entity](../../src/entities/camera/index.ts): distance 5.2 m, shoulder 0.55 m, body look height 1.35 m, forward aim look-ahead; collision arm snaps in, holds 120 ms and eases out with 0.3 s time constant. | Preserve the existing wall response. `camConstraints` bypasses the normal arm; it is not a safe shortcut to a new traversal camera. |
| Place | [Layout](../../src/proto/place/layout.ts) is off-origin at x=1000; [land](../../src/proto/place/land.ts) has a heightfield and separately drawn bridges/tower. | Today's origin-centred terrain checks do not certify this prototype's tower. |

All rows [C]. With the shaped held jump, a level-ground rise is approximately **1.676 m in 0.511 s**: `(7.6²−1.6²)/(2×18) + 1.6²/(2×9)`. Falling back takes about 0.331 s at 30.6 m/s², giving **0.842 s** total. Ignoring acceleration and contact details, that means 4.72 m at walking speed or 8.00 m at sprint [C]. These are continuous-time estimates, not guaranteed reachable ledges: discretisation, early release, radius, slope, overhead clearance and initial velocity all matter.

### What the archived prototype did, and what to retain

Read with `git show 98027243^:src/proto/moves/index.ts`; `98027243` is “Archive the board, moves and groove prototypes.” Its double jump consumed a leftover queued press, set `vy = max(vy, 0) + 6`, and refreshed flags while coyote time, swimming or seating was active. The comment about avoiding a super-jump did not match that additive formula. It added 6 m/s even while rising. Its held glide applied force towards **−4 m/s** with **0.12 s** easing, plus gravity compensation; it supplied no distinct horizontal flight, ability progression, hook target system or remote ability mode. Feedback was a small puff/noise and glide wisps [C].

Keep the immediate response, modest puff and fast fall arrest. Replace additive altitude pumping, coyote-based reset and reliance on whichever jump press the controller leaves behind. The archive establishes what the owner tried, not an approved controller implementation to resurrect.

## 3. Handling recipes

Everything in this section is **[H]**, with calculations marked **[C]**. Metres are Boogle world units. Implement eventually through the current player entity and [physics facade](../../src/physics/engine.ts); do not import Rapier into a feature or add a competing body/controller.

### Double jump: a second decision and a clean rescue

| Parameter | First value | Reason / comparison |
| --- | --- | --- |
| Charges | One per real take-off; usable after walking off a ledge | Recovery is part of the ability. |
| Second launch | `vy = max(vy, 6.8)` m/s | Arrest a fall and launch predictably; preserve a stronger existing rise without adding another impulse to it. |
| Arc | Normal gravity 18; apex gravity 9 below +1.6; falling 30.6 | Same family as the existing jump. Start with a full second arc independent of release; compare a cut later if players want precision. |
| Horizontal steering | Trial 35 m/s² in ordinary air; compare 25 and existing 14 | At 35, a walk-speed reversal takes ~0.32 s instead of 0.80 s. Preserve 5.6/9.5 speed targets. |
| Input | A fresh press edge; existing 150 ms queue; first valid action consumes it | Holding the first jump never spends the second; no repeated launch from a held touch. |
| Feedback | Puff at feet, 80–120 ms knee tuck, quiet dry pop | Instantly legible even from another camera; no flip that hides the landing. |

Ground/coyote launch has priority over the airborne charge, but leaving ground must mark that launch immediately: remaining coyote time must not permit repeated ground jumps. On contact with a standable surface and non-rising relative motion, refresh the charge once. A hook latch, a wall scrape and a ceiling hit do not refresh it. Swimming/seating/guest-avatar control, knockdown, teleport/reset and a modal input takeover must clear pending presses and active flight modes; a later genuine take-off starts a new flight. Never turn entering water into an extra jump loop.

At the first jump's apex, a 6.8 m/s second launch adds about **1.356 m**, producing a maximum rise of **3.031 m**, about **1.423 s** airtime, and ideal flat-ground travel of **7.97 m walking / 13.52 m sprinting** [C]. Pressing the second jump at 0.20 s gives roughly 2.52 m rise; at 0.30 s, 2.83 m. This supports a **2.2 m main gate**, with a broad face and landing, instead of a 3.0 m maximum-height test. A very early press intentionally buys little extra height: the visual pulse must show the charge was spent. High inherited vertical velocity remains a toy; main progression must not rely on proving every physics-assisted sequence break impossible.

Preserve moving-platform departure momentum exactly once. Use the current carry-relative steering convention; do not attach a second “train boost” in the ability. Maddy Thorson's [Celeste forgiveness article](https://maddymakesgames.com/articles/celeste_and_forgiveness/index.html) supports coyote time, buffering, apex leniency and stored moving-platform momentum [V], not these Boogle constants. The [Platformer Toolkit implementation notes](https://gmtk.itch.io/platformer-toolkit/devlog/395523/behind-the-code) support deriving a controller from desired height/time rather than guessing unrelated impulses [V].

### Hook shot: choose, zip, stand

| Parameter | First value | Contract |
| --- | --- | --- |
| Range | 24 m, full 3D distance from player to ring | Show “too far” differently from an available target; no firing into an invisible range wall. |
| Selection | On-screen ring within 25° of view centre; LOS; favour angular closeness, then distance | Keep current selection until a competitor is 20% better for 150 ms. No target behind the camera. |
| Target size | 0.9 m visible ring; 4 × 4 m clear landing | Shape remains recognisable before the ability is owned. Input assistance is larger than a pixel-perfect hit test. |
| Pull | 16 m/s cruise, 60 m/s² acceleration, 70 m/s² braking | About 0.267 m per fixed step at cruise. Begin response on the next fixed step; rope extension is presentation, not a delay. |
| Arrival | Brake by remaining path distance: `speed ≤ sqrt(2 × 70 × remaining)`; settle within 0.35 m | End above a safe landing surface, not embedded in the hook ring. No timed release. |
| Cancel | Hook again or existing Back; Jump may cancel into the unused air jump | Keep actual velocity, but cap exit horizontal speed at sprint and upward speed at 3 m/s; no hidden slingshot. Compare this damping in motion. |

Each target needs an **anchor**, an explicit **body arrival point**, an optional **above-lip waypoint**, and a landing footprint. A ring is not itself a destination for the player's centre. Select only a candidate whose path is clear for the whole 1.7 m body; lock that target on press so turning the camera cannot switch it mid-flight. A failed press gives one small blocked/range cue and moves nothing. A 150 ms buffered press may acquire a newly valid visible target, but must expire if context changes.

The pull owns locomotion until arrival/cancel; suppress ordinary steering, jump shaping and ground snap while it runs. Drive the existing dynamic body towards the path, with gravity compensation once, bounded acceleration and continuous collision checks. Do not teleport to a tweened position, turn collisions off or model a rope joint first. Limit intended motion using sweeps of **both body-sphere centres** and stop/cancel if blocked; preserve contacts as the final guard. [Current `sweepSphere`](../../src/physics/engine.ts) sees static bodies, skips initial overlap and separates thin surfaces with filter options: test both thin and ordinary collision categories, handle initial overlap, and abort on unexpected dynamic obstruction. CCD is an additional guard, not target clearance. [Rapier's CCD documentation](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/#continuous-collision-detection) describes swept-motion protection [V].

No mid-pull retarget, stamina, enemy grapple, player towing or moving train target in this version. Rest platforms reset the air jump through real contact; touching the ring in flight does not. The pleasure should be a decisive little mechanical tug, a readable route above, and a moment to look around after each pull.

### Glide: spend height, choose the landing

| Parameter | First value | Contract |
| --- | --- | --- |
| Horizontal target | Stick magnitude ×8 m/s, camera-relative while the stick is active | Neutral brakes towards zero; rotating the camera alone does not steer a neutral glider. |
| Steering / braking | 18 / 12 m/s² | Direction changes stay useful without instantly reversing at top speed; try 24 if corrections feel heavy. |
| Vertical target | −2.5 m/s; compare −3.2 | Nominal moving glide ratio 3.2:1 at the first setting. No lift or altitude gain. |
| Fall arrest | 0.12 s time constant, net upward acceleration cap 80 m/s² | Fast rescue, but no promise that opening one metre above ground is safe. |
| Deployment | Toggle once airborne; opening while rising arms the glide until `vy ≤ 0` | Preserve the earned jump height; no upward kick. Opening/closing cannot reset the jump charge. |
| Closing | Same button; landing, water, seating or reset closes it automatically | Gravity resumes normally. Reopening never adds speed or height. |

During descending glide, compute desired net vertical acceleration as `(−2.5 − vy) × (1 − exp(−dt/0.12)) / dt`, clamp it to **[−18, +80] m/s²**, and apply `mass × (18 + desiredAcceleration)` as the glide force **instead of** jump-shaping forces. This compensates Rapier gravity once and converges without overshooting into lift. Presentation can open over 80–120 ms without delaying physical rescue. Opening at −20 m/s is a different test from opening at the apex; measure its lost height before placing a last-second rescue landing.

At 8/2.5, a 10 m descent gives 32 m ideal travel. Reserve at least **2 m of height plus 20% horizontal margin** for a first taught crossing: `(heightDifference − 2) × 3.2 × 0.8`, before accounting for entry acceleration [C/H]. The 102.4 m summit to the 18 m village gives about **270 m** ideal range, enough to reinterpret much of this island. [FAR](../../src/proto/place/layout.ts) is over a kilometre away; this glide cannot replace the next sea railway. Do not add a stamina bar or invisible midair stop to enforce that.

Keep carry capacity and ground speed progression meaningful, but start with abilities working while carrying the current bundle. The glider must visually fit the back load. Disabling a newly earned toy whenever the player does the main activity would recreate the chore; if collision or silhouette requires an attachment change, solve that directly. A later cargo-specific restriction would need its own decision.

### Why this stays in our dynamic controller

[Unity's Character Controller](https://docs.unity3d.com/6000.0/Documentation/Manual/class-CharacterController.html), [Godot's CharacterBody3D](https://docs.godotengine.org/en/stable/classes/class_characterbody3d.html) and [Rapier's character controller](https://rapier.rs/docs/user_guides/javascript/character_controller/) expose authored movement with collision/slope/step handling rather than a physically simulated humanoid [V]. [Unreal's Character Movement Component](https://dev.epicgames.com/documentation/en-us/unreal-engine/understanding-networked-movement-in-the-character-movement-component-for-unreal-engine) has explicit movement modes and its own client/server prediction/correction system [V]. Borrow **one movement mode deciding forces and transitions**; do not infer that every engine requires a rigid-body replacement or that Unreal's replication should be copied. Boogle already uses a dynamic two-sphere body for toys and moving decks, with Owner movement. A controller migration is outside this facet. New powers should use that facade and explicit mode precedence: external takeover → hook → descending glide → normal jump/fall.

## 4. Controls, camera and animation

### Inputs within the actual registry

The checked [input](../../src/player/input.ts) and [controls registry](../../src/player/controls.ts), corroborated by `npm run registry -- --json`, currently put **Jump on A, Interact on X/Square, Use on RT, Back on B, honk on Y, ping on D-pad left, guest crouch on LT and sprint on L3**. Interact is not B as in an older AGENTS example. LB and RB are available in core code; D-pad up must remain available to Updates. Re-run the registry when implementing because other agents ship concurrently [C].

| Action | Pad | Keyboard | Touch | Registration |
| --- | --- | --- | --- | --- |
| Double jump | Fresh A press in flight | Fresh Space press | Tap existing Jump again | Same jump action and common press dispatcher. |
| Hook / cancel pull | RB | F | Contextual Hook button when a ring is relevant | New `registerAction`, group `move`, free RB slot; one press, no hold. |
| Open / close glide | LB | Q | Glide toggle while airborne; keep its location stable | New `registerAction`, group `move`, free LB slot. |
| World latch, gift, NPC | X / Square | E | Existing action | `registerInteractable`; do not steal a new action for a gate. |

This deliberately gives glide its own input: the second jump should not unpredictably open a glider after its charge is spent. It also allows looking while gliding without holding a face button. [XAG 107](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107) supports alternatives to sustained holds and complex simultaneous inputs [V]. Touch retains the movement thumb and frees the other thumb to look after a single activation. Use a generous 56 CSS px starting hit area with separation; never make movement + camera + held ability require three thumbs [H].

Use `wrapAction` if extending a registered action. **That alone is insufficient for Jump:** Space and the touch button call `pressJump` directly. Put semantic dispatch at that common player entry point so all three paths agree, and clear holds/queues on `pointercancel`, focus loss and modal ownership. Do not patch `actionById(...).down`. Existing pause/guide rows must come from the registrations, not duplicated labels.

The live [WebKit shoulder-button bug, 311151](https://bugs.webkit.org/show_bug.cgi?id=311151), remains relevant [V]; the owner's latest iPad/Home Screen notes also report a Backbone failure [C]. RB/LB availability in the registry does not prove browser delivery. Verify both shoulders in Safari browser/fullscreen and the Home Screen mode actually used. Retain visible touch actions when needed; do not tell the owner that installing the web app fixes this. A future alternate pad binding needs a free registered slot, not a key-only workaround.

### Camera profiles, not cutscenes

All camera values below [H], implemented eventually in the existing camera entity, with collision still active and no second camera loop.

| Ability | Framing and response | What to avoid |
| --- | --- | --- |
| Double jump | Keep current horizontal follow and distance; try a 1.0 m vertical dead zone, vertical follow time constant 0.12–0.16 s and maximum lag 1.2 m. Ease onto the new landing height. | Twice jerking upward, a forced roll/flip, or losing the feet at a ledge. |
| Hook | After commitment, blend framing over 0.15 s to contain player and next landing; initially retain 5.2 m distance. Stop automated framing on deliberate look input. Place main-route targets at roughly 30–45° elevation; show the next ring from each rest landing. | Automatically spinning around the tower, aiming at an anchor hidden above the frame, or bypassing wall collision. |
| Glide | Ease to 6.5 m distance over 0.3 s, stable horizon, about 3 m of movement-direction framing; let the player look down independently. Ease back on landing. | FOV pumping, banking the camera, turning the character just because the camera moved, or hiding the landing behind a canopy/load. |

Current input limits pitch to approximately −71.6° to +51.6° [C]. A hook directly overhead is not fixed by a larger target icon: author staggered landings whose anchors enter the reachable view. Test each pull with the right stick untouched after acquisition; on the rest landing, allow a deliberate look towards the next ring. The climb can turn around the tower without forcing a camera orbit during flight. Existing wall snap/hold/ease stays authoritative over these preferred distances. The separate [third-person-camera report](third-person-camera.md) is the place to consolidate shared camera tuning rather than add per-feature follow code.

### No new rig

[Buddy body](../../src/player/buddy/body.ts) already retargets `hero-clips.glb` onto `buddy.glb`, samples `Jump_Start` past its wind-up and blends air/ground transitions quickly. [Buddy life](../../src/player/buddy/life.ts) applies post-mixer additive poses to named limbs/spine and provides attachment sockets; [feel](../../src/features/feel.ts) supplies outer squash [C]. Extend those presentation layers; do not import a feature into another feature or compete with the body's per-frame scale reset.

- **Second jump:** reuse the jump pose with an additive knee tuck and arms opening, 80–120 ms compression/release; keep the head upright. A foot puff from the shared particle emitter distinguishes it from the first launch. No new clip and no full-body somersault [H].
- **Hook:** reach the existing hand towards the selected ring; elbows bend at arrival, legs trail, spine leans at most about 10° locally. Draw a simple cable from the hand socket to the fixed anchor. The root follows actual physics; a 50–80 ms visual tug must not hold movement [H].
- **Glide:** both arms raised into a broad silhouette, knees relaxed; a roughly 2.4 m wide code-built frame/canopy attached using existing sockets, rendered with node materials. Start with a rigid or slightly vertex-deformed canopy, no cloth solver. Blend in/out over about 0.1 s; back cargo must remain visible and separate [H].

[Toyful's animation account](https://www.toyfulgames.com/blog/character-animations) shows how few poses, strong curves and readable squash can carry a toy character; it also describes abandoning secondary motion that did not read [V]. Start with silhouette and action timing. The owner's dislike of the old lean is stronger evidence than a desire to add more wobble. Sound is a quiet pop, spool catch and soft canopy opening; haptics are optional, never the only readiness cue.

## 5. Teach on a little Great Plateau

The teaching pattern is **see a promise → receive a verb through useful work → try it safely → recognise it elsewhere → choose a new route**. Each ability gets one small contextual control hint that fades after success; no persistent objective panel, forced tutorial room, mandatory secret or camera lock [H].

| Beat | First safe use | Transfer / earned payoff |
| --- | --- | --- |
| Before a connection | Walk past a ledge with a visible hat, an unmistakable unused hook ring, and the tower's folded canopy silhouette. Each obstacle is visible from the ordinary path. | The player forms a question before receiving an answer. No “ability required” wall of text. |
| First timber connection opens | Grant double jump to everyone when the **walkable connection** is complete; put a 2.2 m shelf and broad low fallback beside its destination. A small rising puff and matching ledge marks suggest the extra press. | A nearby optional ledge rewards the new verb immediately; the quarry survey gate later asks for it in a new place. Trains are not a prerequisite. |
| Quarry connection opens | Grant hook to everyone; present a first ring across an 8–10 m gap with solid ground below, at eye-to-upward viewing height. A reachable ring unfolds when aimed at. | The same ring shape leads to the tower. Longer pulls are variations of the known action, not new button sequences. |
| Tower top | Interacting with the canopy unlocks glide for the room. Offer a broad practice terrace only 3–4 m below, then an optional visible village roof/balcony. | The owner chooses a destination on a place already walked; arriving home is the reveal. No compulsory third glide gate. |

Misses cost seconds and a funny landing, not inventory or damage. Give the tower intermediate rest landings and an unlocked return route/checkpoint ladder or lift from the last reached rest; author that fallback rather than invent an invisible teleport. A newcomer can rehearse at ground-level copies near the hub even when the room already owns all abilities. Shared progression must not consume their chance to learn.

## 6. Concrete layout: two main gates, eight optional secrets

All positions in this section use **`(x, z, y)`**, matching `Pt` in [layout.ts](../../src/proto/place/layout.ts). They are **local metres**: world x = local x + 1000; world z is unchanged. North is −z. **y is the proposed standing-surface elevation**, not the lower player-sphere centre (normally surface +0.45). New coordinates, geometry and sightlines are **[H]**, not surveyed clear space. Existing path coordinates are [C].

The proposal uses the current timber and quarry connections as round-4 equivalents of the first island connections. It does not claim this single prototype already contains multiple playable islands. Spawn is near `(−97,14,18)`; timber ends near `(−14,−154,30)` and quarry near `(92,45,24)`. Keep both long base paths useful; the first unlocked shortcut should still feel earned before a train runs.

### Main-line gates

**G1 — quarry survey apron, double jump.** Beside `PATHS[1].pts[13] = (92,45,24)`, add a broad apron at **`(98,47,26.2)`**, 2.2 m above approach height. Put the survey latch on it and show the cargo ramp it will lower. The quarry camp remains around `(98,52,24)`; reaching its surroundings is not locked. A short enclosing retaining wall prevents simply walking around this demonstration, with the exact jump face ≥4 m wide. One successful jump and ordinary Interact lowers a **permanent shared ramp**, enabling the connection work without repeated jumping with cargo. This is the only double-jump gate. Keep first-connection resources accessible without it; never place the unlock for this gate behind itself.

**G2 — the tower, hook shot.** Completing the quarry connection supplies the hook. Add a spur from the quarry rail's existing `(8,30,…)` vicinity to a **new** entry deck `(8,8,24)` on the south side of `SPIRE = (8,−10,105)`. Neither that deck nor its approach currently exists. Below it, place the safe short hook lesson on a walkway. The reward at the summit is glide; the rest of exploration and every secret is optional. Hook is the gate for the exploration main line, not a requirement to jump the same tower every time cargo moves.

The current tower's five visible drums rise to about 105 m (the accumulated placement offset ends at 104.5 m). Its small summit deck is centred around `(16,−11,102.1)`, top surface **102.4 m**. But [land.ts](../../src/proto/place/land.ts) supplies only a roughly **50 m tall tapered central collider**; the upper drums and summit deck do not have corresponding support collision [C]. The deck's centre also intersects the final rock drum: use an exterior landing and extend the deck, rather than aim the player at its centre. Build accurate static colliders and real gantry platforms before judging the climb. Do not treat the visible summit as already walkable.

| Landing | Proposed surface `(x,z,y)` | Approximate travel from previous landing | Purpose |
| --- | --- | --- | --- |
| T0 | `(8,8,24)` | New spur from quarry line | Broad south entry, first target visible. |
| T1 | `(−7.6,−1,37)` | 22.2 m | First full pull after safe lesson; catch platform below. |
| T2 | `(−7.6,−19,50)` | 22.2 m | West rest terrace, village visible across the gorge. |
| T3 | `(8,−28,63)` | 22.2 m | North landing; optional side nook visible. |
| T4 | `(23.6,−19,76)` | 22.2 m | East rest terrace; a short walkway changes the rhythm. |
| T5 | `(23.6,−1,89)` | 22.2 m | Turn back towards the village and southern view. |
| T6 | `(8,8,102.4)` | 22.4 m | Top south gantry; reveal the return destinations. |
| Summit | `(16,−7,102.4)` | New 17 m supported top walkway to an exterior deck extension | Join the south edge of the existing visual deck, canopy reward and practice terrace; keep the rock centre blocked. |

Travel estimates are surface-to-surface, **not validated ring-to-body distances** [C/H]. Put rings roughly 1 m above their landings and adjust exact take-off/arrival points so full body clearance, ≤24 m range and camera pitch still pass. The ascent makes one turn around the spire at roughly 18 m radius: adjacent anchors are about 18 m apart horizontally, with a 13 m rise (about 36° elevation before ring offset). Their plan-view chords pass about 15.6 m from the base centre, outside its 11 m base radius; the leaning upper drums still need explicit clearance checks. A spiral lets each rest offer a different view and avoids repeated 180° direction reversals. The final high walkway needs its own supports and colliders. A 4 m platform is a minimum clear landing, with 6 m rest terraces. Leave enough deck for two arrivals. Do not add a gate if a player finds a clever skip between these points. The challenge is reading and enjoying the route, not proving they touched every ring.

### Eight secrets, six different kinds of clue

Each has a clue from a route the player already walks, an optional payoff and a return. Suggested cosmetics are briefs, not existing assets. Two knowledge-only discoveries establish that secrets are not all ability locks; the others mix intended ability approaches with tolerated alternative routes.

| ID / area | Proposed find and approach | Clue on the familiar route | Reward and return |
| --- | --- | --- | --- |
| S1 — village, no ability | A tiny courtyard behind the existing cottage near `(−113,11,18)`; enter a side gap on foot. | A washing line continues around the corner; a resident's hat is visible above it from the spawn-to-yard route. | A domestic hat and a visual joke; loop out beside the same cottage. Check the actual cottage footprint before cutting the gap. |
| S2 — timber river, knowledge | A recessed shelf at roughly `(−49,−82.5,1.7)` beside the bridge between `PATHS[0].pts[8]` and `.pts[9]`, reached along a new dry bank. | A reflected glint and a quiet bell under the deck, visible/heard on the first crossing. | A little bridge-maker token for the museum; walk out the other bank. No underwater search or required swimming. |
| S3 — old lookout, double jump | New 2.2 m shelf at `(−134,−119,19.2)` near the path bend at `(−130,−125,17)`. | A scarf on a branch protrudes above the shelf when descending the first long route. | A scarf; drop onto a broad 17 m terrace and rejoin the bend. |
| S4 — north ascent, double jump | New shelf at `(−78,−164,24.2)`, just off `PATHS[0].pts[12] = (−82,−165,22)`. | Two boot marks and the underside of a small hanging sign; the prize is partly occluded until the second jump. | A timber-worker cosmetic and a fresh view of the line; safe drop to the 22 m path. |
| S5 — old trestle, hook | A new alcove/catwalk at `(−38,−82,12)`, approached from `(−56,−77,1.7)` at `PATHS[0].pts[8]`; about 21.3 m in 3D before anchor offsets. | The same hook-ring silhouette seen overhead on the first river walk; its bell is distinct from S2's glint clue. | A cable-worker badge; hook back to a low return ring or descend a short bank stair. Must cut a real alcove/collision opening; no heightfield overhang assumption. |
| S6 — tower side, hook | Side platform `(−6,−29,63)`, about 14 m level travel from T3; its ring is hidden by a hanging cloth until viewed from T2/T3. | Cloth flutter and a glimpse of feet from the rest terrace; no hidden pixel target. | A tiny resident scene and tower pennant; hook back to T3. This detour never unlocks glide. |
| S7 — village return, glide | New balcony at `(−88,27,24)`, near the wooden hall `(−88,31)`; main approach from summit. | A canopy-shaped weather vane seen at ground level on early work trips; at the summit it points home. | Village aviator hat; open an ordinary return stair from inside. Treat this as a soft ability secret if someone reaches it by another clever route. |
| S8 — quarry bank, glide | New lower terrace `(46,118,8)`, approached from `PATHS[1].pts[11] = (70,100,24)`. Horizontal span 30 m, drop 16 m; conservative glide budget `(16−2)×3.2×0.8 = 35.8 m` before acceleration. | A bright picnic cloth visible from the old low crossing and a matching windsock on the table. | Quarry picnic cosmetic; a walkable switchback rejoins the lower quarry route. Check entry acceleration and widen the landing; the return does not require gliding uphill. |

S8 has about 5.8 m of horizontal allowance beyond its 30 m span under the conservative budget, before entry acceleration: **do not certify it from the formula**. S7's summit trip is roughly 110 m horizontally with 78 m of drop, comfortably inside the proposed envelope; its pleasure is recognising home, not grazing a maximum-distance edge [C/H].

Avoid eight identical reward boxes: courtyard scene, reflective clue, branch/shelf, concealed sign, hook alcove, tiny resident, roof landing, picnic. Give each a return in seconds; do not require replaying a five-minute loop after a miss. Record personal cosmetic claims and offer missed prizes in the hub once their area is connected, as the owner requested. Finding the original location still earns the scene and the route. Do not quietly add compulsory currency, a secret counter permanently covering the HUD, or a checklist tour.

## 7. What the second player sees and owns

**Progression is shared; execution is Owner; presentation is local.** One player completing a connection gives the ability to everyone in that room, including a later joiner. The first valid survey-latch activation opens the ramp for all; one summit activation unlocks glide for all. Each player can claim their own cosmetic; finding it must not remove the other player's reward. Notify a distant friend with a short unlock cue and a retained small guide entry, without moving their camera or stopping their work [H].

The existing [place co-op adapter](../../src/proto/place/coop.ts) is an explicitly temporary protocol with an authority and periodic full snapshots, not production lockstep. Its own comments make gifts/crates/finds personal. Do not silently graduate that whole architecture to add three powers. For the round-4 prototype, add explicitly validated, versioned progression to that isolated contract or derive unlocks from its already-confirmed connection state; rejoin and authority handoff must retain it. The survey latch/summit activation need idempotent shared facts. For production, use the existing lockstep rule recipe for persistent connection/unlock/gate facts, with version/migration or the authorised namespace break. Never put the player's Rapier flight in lockstep [H].

The [remote-player entity](../../src/entities/remote-player/index.ts) already draws smoothed movement. Add a small, descriptive, registry-checked presence field for active movement presentation: mode, hook target ID while pulling, and a bounded local action serial if a second-jump puff needs edge detection. Return `null` when inactive. Do not send another continuous position stream; read the normal 20 Hz position/yaw at the same interpolation time (currently 120 ms behind). Validate modes/IDs/numbers, ignore unknown targets safely, clear missing fields and dispose cable/canopy views on peer removal. A serial is presentation-only, never a shared-world counter [H].

From the ground, a friend should see the second jump's tuck/puff, a cable that ends at the same tower ring, and a stable open canopy. Infer ordinary falling from motion, but do not infer a glide solely from a low vertical speed: a platform or network pause can look the same. Late observers see an already-open canopy without replaying an unlock celebration. Two players can use one static ring simultaneously; no ownership queue or platform occupancy puzzle. A player standing in the arrival footprint may force the traveller to brake/abort safely, never become a catapult. Test a loaded carrier and two simultaneous landings. Co-op-only rewards may be added elsewhere per round 4, but none of these two gates or eight secrets requires a second body.

## 8. Level-check and the smallest honest proof

[dev/level/rules.ts](../../dev/level/rules.ts) currently uses `JUMP_SPEED² / (2 × GRAVITY)` (~1.60 m), a slope/flood grid, today's island and [layout-file composition](../../dev/level/level.ts). It does not model the shaped jump, a second press, hook corridors, glide landings, overlapping vertical decks or all POI colliders. [check.ts](../../dev/level/check.ts) does not automatically ingest `src/proto/place/layout.ts` [C]. A green current `level-check` alone would say almost nothing about this tower.

Proposed extension [H]: retain the ordinary terrain flood, then add authored **surface nodes and traversal edges** for this off-origin place. Node positions include height, collision footprint and standable area; edges carry the required ability and actual action parameters. Keep data close to layout/site definitions so render geometry and checks cannot drift. Check four progress states: base, double jump, hook, glide. Each state's reachable set should include all previously reachable compulsory places, and every acquired ability must be reachable in the preceding state. A gate lowering a ramp adds a permanent walk edge. Do not increase global jump height to 3 m to make every check pass.

- **Jump edge:** evaluate launch/landing heights, horizontal distance, both body spheres, overhead clearance, a generous range of second-press times, and a safe miss route. A 2.2 m rise is not proof that the usable landing lies inside the arc.
- **Hook edge:** check full 3D range including ring offsets, camera-visible acquisition, swept-body clearance over all waypoints, arrival support and return. Include thin rails/decks and initial overlap; a central ray through a hole is insufficient.
- **Glide edge:** account for entry speed, deployment lost height, descent/turning, approach reserve and landing dimensions. No slope flood can certify an aerial corridor.
- **Static place:** export all tower/gantry/roof support colliders and reach targets, apply ORIGIN exactly once, retain grade/overlap/bounds checks, and include dry exits below teaching attempts. Do not add these intended gates to `allow.ts` as unexplained unreachable-land exceptions.

Use the existing [headless simulation harness](../../dev/sim/README.md) for movement envelopes where it can exercise the real player/Rapier path, and `npm run sim -- replay` when player physics changes. Dynamic train departure and ambiguous hook arrivals require the real game too. Do not add feature unit tests or a new visual scenario just to mirror implementation. A new scenario is justified for the **shared unlock/rejoin/gate contract**, per AGENTS, when that code is built.

The smallest implementation proof is the **G1 shelf, one safe hook plus one 20 m tower segment, and one 30 m glide landing**, using the current buddy and a second tab. It answers mechanics before all eight secrets are built. For actual round 4, finish the whole route after the mechanics pass; this research is not a reason to hand the owner an incomplete run.

Agent validation, not an owner checklist: buffer near landing, press after coyote, release immediately, walk off ledge, ceiling scrape, loaded departure from a moving deck, low-speed and terminal-speed glide opening, camera against tower rock, failed/occluded/moving obstruction hook, two arrivals, inactive/missing presence, late join, authority handoff, duplicate unlock, touch cancellation and the iPad's actual controller mode. Observe motion in real time through the existing `look` workflow, open its stills, and check WebGPU advancing frames/no graphics or console errors. A still cannot prove pull smoothness. Judge on the M1 Max first and verify the M4 iPad floor; no performance numbers were measured here.

## 9. Numbered recommendations for Boogle

Each is a recommendation **[H]**, not an implementation commitment. The smallest proof is for agents; the owner gets one line on what changed and one gut question.

1. **Award shared abilities at useful connection milestones:** timber walkable shortcut → double jump, quarry connection → hook, tower summit → glide; do not wait for trains or charge secrets as keys ([round-4.md](../plans/round-4.md), [place co-op](../../src/proto/place/coop.ts)). Smallest proof: a distant and a late-joining player both receive the right ability. Gut: did the new connection give you something you wanted to use?
2. **Replace the archive's additive kick with one bounded second launch at `max(vy, 6.8)`:** retain buffers, real-contact recharge and a full readable second arc; compare air steering 14/25/35 before choosing ([player state](../../src/entities/player/state.ts)). Smallest proof: a 2.2 m shelf and an intentionally missed landing. Gut: did the extra jump rescue the move you meant to make?
3. **Make hook a one-press 24 m fixed-target pull at up to 16 m/s:** explicit arrival footprints, body sweeps, braking and safe cancellation; no rope simulation or latch-based air-charge refill ([physics facade](../../src/physics/engine.ts), [place layout](../../src/proto/place/layout.ts)). Smallest proof: one 8 m lesson and one 20 m ascent beside a wall. Gut: did you trust where it would put you?
4. **Start glide at 8 m/s horizontal and 2.5 m/s down, comparing 3.2 m/s sink:** fast bounded fall arrest, independent looking, no stamina and no redeploy lift ([player state](../../src/entities/player/state.ts), [constants](../../src/constants.ts)). Smallest proof: a 30 m return landing and a high-speed opening. Gut: did height feel like freedom to choose a destination?
5. **Use exactly two main gates and eight varied optional finds in this first layout:** the quarry's 2.2 m survey apron and the hook tower; reveal old-path secrets through shape, sound and sightlines, with permanent short returns ([layout](../../src/proto/place/layout.ts), [discovery research](discovery-progression.md)). Smallest proof: S2 seen before, S5 understood after, S7 recognised from above. Gut: did you remember somewhere you now wanted to revisit?
6. **Teach each ability beside its reward with a safe trial and a nearby optional use:** preserve path-before-train pacing and remove the hint after success ([round-4.md](../plans/round-4.md), [latest playtests](../playtests.md)). Smallest proof: the first jump/hook/glide works with a brief device-correct prompt and no camera lock. Gut: did you know what to try without feeling instructed through a checklist?
7. **Keep A/Space/touch Jump common, register RB/F Hook and LB/Q Glide, and use toggles on touch:** reserve the Updates slot, keep X/Square Interact, and verify iPad shoulder delivery ([input](../../src/player/input.ts), [controls](../../src/player/controls.ts)). Smallest proof: identical ability transitions on keyboard, pad and two-thumb touch. Gut: could you look and move without fighting the buttons?
8. **Give each ability a restrained profile in the existing collision-aware camera:** damp jump height, frame hook landings and ease glide distance to 6.5 m, always yielding to intentional look ([camera entity](../../src/entities/camera/index.ts)). Smallest proof: a wall-adjacent ascent and a glide landing with minimal right-stick correction. Gut: could you see the place you wanted to land?
9. **Animate with the existing buddy rig, additive limb poses and simple attached cable/canopy geometry:** make the second jump and glide readable without another full-body lean ([buddy body](../../src/player/buddy/body.ts), [life](../../src/player/buddy/life.ts)). Smallest proof: a loaded local/remote pair at normal play distance. Gut: did the character look like it was doing what your hands were doing?
10. **Share permanent unlock/gate facts and only the small active ability mode in presence:** retain Owner physics, personal cosmetics, idempotent awards and safe missing-field cleanup ([co-op adapter](../../src/proto/place/coop.ts), [remote player](../../src/entities/remote-player/index.ts), [world recipe](../../src/world/rules/README.md)). Smallest proof: simultaneous unlock, rejoin and two hook arrivals. Gut: did your friend's discovery feel like something you gained together?
11. **Build real tower collision and ability-aware reach checks before calling the route playable:** include off-origin transforms, multiple heights, swept corridors and reverse exits rather than raising the flood's global jump allowance ([land](../../src/proto/place/land.ts), [level rules](../../dev/level/rules.ts)). Smallest proof: every proposed compulsory surface has support and a valid route in its intended progression state. Gut: did every place that looked solid behave solidly?
12. **Verify the small movement course, then finish and look at the complete return loop before handing over round 4:** use real-time motion, replay for player physics and the justified shared-state scenario; record actual envelope/clearance results beside these hypotheses ([round-4.md](../plans/round-4.md), [sim harness](../../dev/sim/README.md)). Smallest proof: connect, climb, glide home, find an old-path secret with a friend. Gut: did coming back make this small island feel richer?

## Gaps and follow-up evidence

No Nintendo forward-glide speed, acceleration, turn rate or camera constants were verified; the 3.2 m/s observation is stationary and approximate. A Hat in Time mechanics and A Short Hike feather details rely on secondary gameplay references. The GDC talks were not watched. “Good Game Itch” remains an interpretation. No animation, touch layout, collision route, 3D target visibility, network implementation or performance was exercised for this report. All new coordinates need terrain and sightline checks, especially S5's alcove, S8's landing and the final tower walkway. The report changes no plan checkboxes: round 4's combined research-and-pictures and exploring tracks are not completed by a written proposal alone.
