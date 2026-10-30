# Character controller feel for a slapstick physics multiplayer game

Scope: acceleration curves, forgiveness timers (coyote, buffer), variable jump, slopes/steps, swimming, ledge/wall, landing squash, camera-relative input, procedural animation for limbless low-poly characters, and kinematic vs dynamic controllers in three.js/cannon-es. Boogle's current code was read directly (local file links below are repo paths).

## What does Boogle's controller do today?

### Takeaway
Boogle runs a dynamic cannon-es body (two stacked spheres, fixedRotation, zero friction) whose horizontal velocity is steered toward a camera-relative wish velocity with a capped velocity change per tick; it already has a 0.1 s ground grace, a 0.15 s jump buffer, buoyancy-based swimming and a render-only bob/lean/squash on a limbless capsule. It lacks variable jump height, a fall-gravity multiplier, separate turn/brake rates, landing squash, turn lean, ground snapping and any slope rule beyond "contact normal y > 0.55 counts as ground".

### Cited Findings
- The player body is `CANNON.Body` with mass 70, `fixedRotation: true`, two spheres of radius 0.45 (feet and head at +0.8), on a `playerMat` whose contact with ground has friction 0 and restitution 0 — [src/avatars.js](../../../../src/avatars.js), [src/physics.js](../../../../src/physics.js)
- Each preStep: target speed 5.6 m/s (9.5 sprint), x0.55 in water; the velocity delta toward `wish*speed` (+ 60% of the local stream current when wading) is clamped to `accel*FIXED` where accel = 70 m/s² when grounded (coyote > 0), 18 swimming, 14 airborne. The same rate is used for accelerating, braking and reversing — [src/physics.js](../../../../src/physics.js)
- Grounded is set in postStep when any contact normal has y > 0.55 (about 57 degrees), writing `me.coyote = 0.1`; coyote decays by FIXED each preStep — [src/physics.js](../../../../src/physics.js)
- Jump: Space / A / touch button sets `me.jumpQueued = 0.15` (a buffer that decays in `updateIntent`); if coyote > 0 the body gets `velocity.y = 7.6` (absolute set, not additive). Swimming jump sets `vy = max(vy, 4.5)`. GRAVITY = 18 m/s², FIXED = 1/60 — [src/physics.js](../../../../src/physics.js), [src/input.js](../../../../src/input.js), [src/constants.js](../../../../src/constants.js)
- Swimming: `depth = waterSurface - (y + 0.35)`; when > 0 an upward force `m*g*(1 + min(depth*2.2, 1.4)) - m*3*vy` (buoyancy plus vertical damping) is applied — [src/physics.js](../../../../src/physics.js)
- Wish direction is computed from `cam.yaw` each frame, normalized only if longer than 1 (so analog stick magnitude gives proportional speed); facing yaw eases to the wish direction with `1 - exp(-dt*12)`, or to the camera yaw while holding/charging — [src/player.js](../../../../src/player.js)
- Camera: fixed-distance orbit (3-12 m wheel/d-pad zoom), look target offset 0.55 m to the right shoulder, clamped above terrain and sea; no smoothing, no collision raycast beyond the height-floor clamp — [src/player.js](../../../../src/player.js)
- Avatar animation: capsule + eyes, no limbs. `animateAvatar` bobs `|sin(phase)|*0.09*moving`, leans forward up to -0.16 rad, volume-preserving squash `1 - |cos|*0.04` while walking and a fixed 1.05 stretch when airborne. The same function animates remote players from interpolated position deltas — [src/avatars.js](../../../../src/avatars.js), [src/main.js](../../../../src/main.js)
- Existing slapstick hooks: face-plant (fast ball to head: `me.down` 800 ms, avatar rotates flat, stars, camera shake, published as presence field `kd`), 55 ms hit-stop on catches, ball squash, mushroom bounce sets `velocity.y = BOUNCE_SPEED` — [src/features/impact.js](../../../../src/features/impact.js), [src/mushroom-garden.js](../../../../src/mushroom-garden.js)
- Gamepad stick deadzone 0.15 with rescale; sprint is a latch on L3 that ends when the stick rests — [src/features/gamepad.js](../../../../src/features/gamepad.js), [src/player.js](../../../../src/player.js)
- DESIGN.md principle 10: "Loose physics, splashes and collapsing sand walls are features. Prefer mechanics that produce funny moments between players over ones that reward precise execution." Player movement is client-authoritative — [DESIGN.md](../../../../DESIGN.md)

### Inferences
- Jump apex = 7.6²/(2*18) = 1.60 m, time to apex 0.42 s, total symmetric air time 0.84 s. Symmetric parabola with no fall multiplier: the shape secondary sources call "floaty".
- Ground accel 70 m/s² reaches 5.6 m/s in 0.08 s and sprint 9.5 m/s in 0.14 s: essentially instant, Celeste-like. Air control 14 m/s² is 20% of ground — reasonable.
- `velocity.y = 7.6` absolute set means jumping while already rising off a slope or mushroom loses upward momentum; the GMTK code adds/subtracts current vy instead.
- Ground-normal threshold 0.55 is quite permissive (57 deg); with zero friction the player slides down any slope while idle only to the extent gravity's tangential component exceeds nothing holding it — with friction 0 the body should drift downhill on slopes when wish is zero, countered only by the 70 m/s² velocity steering toward zero. That steering acts as "friction", so idle slide is mostly cancelled on ground.

### Gaps
- Did not playtest; numbers are read from code, not measured feel.

## How do the reference games tune acceleration, coyote time, buffering and variable jump height?

### Takeaway
The canonical toolkit (Celeste, GMTK Platformer Toolkit, Pittman's "Building a Better Jump") is: separate accel / decel / turn rates, coyote time around 0.1-0.2 s, a jump buffer, gravity derived from designer jump height and time to apex, heavier gravity on the way down, and a gravity multiplier when the button is released early (jump cut). Celeste adds half gravity at the apex while jump is held.

### Cited Findings
- Celeste forgiveness list (Maddy Thorson): coyote time ("you can still jump for a short time after leaving a ledge"), jump buffering (jump fires on the exact landing frame if pressed shortly before), half gravity at the jump peak while jump is held, jump corner correction (bonking a corner wiggles you around it), dash corner correction, lift momentum storage for "a few frames" after a moving platform stops, wall jump allowed from 2 px away (quarter tile), super wall jump about 5 px — [Celeste & Forgiveness, Maddy Thorson](https://maddymakesgames.com/articles/celeste_and_forgiveness/index.html)
- Thorson said they did not invent these techniques — [Gigazine summary of the thread](https://gigazine.net/gsc_news/en/20200317-celeste-action-feel-things)
- No primary source found for Celeste's exact coyote frame count (a tutorial claims 6 frames) — [search summary; unverified](https://gigazine.net/gsc_news/en/20200317-celeste-action-feel-things)
- Pittman's GDC 2016 "Math for Game Programmers: Building a Better Jump" builds jump arcs from designer inputs (height, distance) and extends them to variable-height jumps and fast falls; it states the jump trajectory underpins all other control feel — [GDC Vault](https://gdcvault.com/play/1023148/Math-for-Game-Programmers-Building)
- Secondary summary: a pure parabola feels "floaty"; Swink's Game Feel describes Mario raising gravity at the apex; fast-fall, double jump and variable height all use piecewise parabolas — [Traversing Virtual blog](https://traversingvirtual.blogspot.com/2024/07/designing-platformer-player-controls.html)
- GMTK Platformer Toolkit implementation: rate chosen per tick — turn speed if input opposes current velocity, acceleration if same direction, deceleration with no input; separate air acceleration; `MoveTowards(velocity, desired, maxSpeedChange)` — [GMTK "Behind the code"](https://gmtk.itch.io/platformer-toolkit/devlog/395523/behind-the-code)
- GMTK gravity from design: `g = -2*jumpHeight / timeToApex²`; jump speed `sqrt(2*g*jumpHeight)`, with current vertical velocity subtracted if rising / added if falling to keep jumps consistent off springs; downward gravity multiplier applied when vy < -0.01; jumpCutoff gravity multiplier while rising if the button is released; coyote counter typical ~0.2 s; buffered desiredJump cleared only after jumpBuffer elapses. Commenters report a "super jump" bug when jumping right before landing in the partial code — [GMTK "Behind the code"](https://gmtk.itch.io/platformer-toolkit/devlog/395523/behind-the-code)
- The toolkit exposes 30+ movement variables including max speed, jump height, squash and stretch, coyote time — [GMTK Platformer Toolkit](https://gmtk.itch.io/platformer-toolkit)
- GMTK's video "Why Does Celeste Feel So Good to Play?" (July 2019) covers these controls — [Amara listing](https://amara.org/v/C3BEJ/)
- A developer comment claims Celeste has seemingly no acceleration/deceleration while Super Meat Boy has very little (forum claim) — [GMTK toolkit comments](https://gmtk.itch.io/platformer-toolkit/comments?after=238)
- Super Mario 64's walking action branches on forward speed: braking at high speed on flat floor, otherwise decelerating; walking speed vs time depends on floor slope — [Ukikipedia Walking](https://ukikipedia.net/wiki/Special:MobileDiff/17638...18181)

### Inferences
- Boogle already has coyote (0.1 s) and buffer (0.15 s). It is missing the jump cut, the fall multiplier and the apex hang — the cheapest three lines of feel available, all local to the client body so no sync impact.
- For slapstick, a long floaty hang is partly a feature (time to be funny mid-air, line up a header on the ball). Celeste's "half gravity at apex while held" gives hang only on demand, which suits both camps.

### Gaps
- Pittman's slides were not accessible (GDC Vault login); formulas come via GMTK code and secondary summaries.
- No primary numbers for Mario 64 accel/turn found in the time budget.

## Kinematic vs dynamic controller, slopes and steps

### Takeaway
Dynamic bodies interact with physics objects for free but are less predictable; kinematic controllers are precise but need hand-written pushing. A middle path popular for physics-toy games is the "floating capsule": a dynamic body held above the ground by a raycast spring-damper, which gives free step-up, ground snapping and pushable interaction. Kinematic controllers in Rapier default to 45-degree climb/slide limits and snap-to-ground at 0.2 of character size.

### Cited Findings
- Godot docs: dynamic controllers interact with other physics objects seamlessly but not always predictably; kinematic controllers are more predictable and easier to program but cannot interact with physics objects unless done in code — [Godot Kinematic character 2D](https://docs.godotengine.org/en/3.5/tutorials/physics/kinematic_character_2d.html)
- Unity's Character Controller package offers SimulateDynamicBody: the character applies forces to itself and other rigidbodies using a mass ratio — [Unity dynamic body interaction](https://docs.unity3d.com/Packages/com.unity.charactercontroller@1.1/manual/dynamic-body-interaction.html)
- Forum report: force-driven rigidbody controller felt "swimmy" and hard to tweak — [gamedev.net thread](https://gamedev.net/forums/topic/696521-character-controller-rigidbody-vs-kinematics/)
- Rapier KCC: max slope climb angle default 45 deg, min slope slide angle default 45 deg, snap-to-ground default 0.2 relative length; autostep disabled by default from v0.19 because it is "very computationally expensive" — [Rapier slopes guide](https://rapier.rs/docs/user_guides/bevy_plugin/character_controller_slopes/); [Rapier source](https://git.nea.moe/github/rapier.git/plain/src/control/character_controller.rs)
- Floating capsule approach was devised by Toyful Games (Very Very Valet); a re-creation notes Toyful's video gives partial snippets, no source — [Joe Binns, Stylised Character Controller](https://joebinns.itch.io/stylised-character-controller)
- pmndrs Ecctrl (three.js / react-three-rapier): character floats on a spring + damping force from a ground shapecast/raycast, with a center fallback ray for steep slopes, follows moving platforms, and applies counter-forces to the body it stands on (counter mass, counter move impulse, downward impulse on jump); exposes isOnGround, moveSpeed, isFalling for animation — [pmndrs/ecctrl](https://github.com/pmndrs/ecctrl)
- Toyful's own blog post on animation is not about the controller: they animate only key poses and interpolate along curves (a 30-frame run becomes 2 keys + a curve, ~50 poses for six characters), add visual-only skid on direction change, spin on fast stick rotation, a landing flourish, and push squash and stretch until excessive up close because it reads well in motion on small screens — [Toyful Games, character animations](https://www.toyfulgames.com/blog/character-animations)

### Inferences
- Boogle's current setup is already the hybrid most physics-toy games want: dynamic (so the ball and other players bounce off you, PLAN principle 10) but velocity-steered (so input is crisp). A full kinematic rewrite would lose ball shoving for free; not worth it.
- The heightfield ground means steps are mostly sand ridges from digging/piling; the lower sphere rolls over small ridges with zero friction already. The real missing piece is ground snapping on downhill / ridge crests (the player launches off dug ridges at sprint) and a slope rule. A downward raycast against `groundHeight(x,z)` (cheap — analytic height lookup, no physics query) can implement both snap and slope.
- Ecctrl's counter-impulse on jump is a nice slapstick idea for jumping off another player's head (they get pushed down).

### Gaps
- No Toyful primary numbers for spring/damper; Ecctrl defaults not on README.
- No cannon-es-specific character controller reference found; cannon-es has no built-in KCC (from code knowledge, not cited).

## Swimming, diving and surfacing

### Takeaway
Practitioners split water into a surface-float state and an underwater state, using buoyancy relative to drag to make the character rise or sink, a depth probe near the chest to choose the state, and camera-pitch-aware movement only when submerged. No rigorous design analysis was found.

### Cited Findings
- Two states, surface float and underwater swim; underwater turn off the float force and raise damping — [Leadwerks forum](https://www.leadwerks.com/community/topic/8915-leadwerks-25-implementing-swimming/)
- Buoyancy > 1 relative to fluid friction lifts to surface, < 1 sinks — [Unreal forum](https://forums.unrealengine.com/t/how-do-i-make-a-swimming-character-in-third-person/282858)
- Mario-64-style swim in Godot: a chest-height probe measures depth; near the surface the character floats up gently, deep it switches to an underwater state; velocity also gates transitions — [Godot forums](https://godotforums.org/d/28047-how-to-do-3rd-person-swimming-diving-3d)
- Open-source Godot controller: underwater movement uses both camera yaw and pitch; at the surface only horizontal swimming; adds a charged "surge" burst and swim up/down inputs — [selgesel/godot4-third-person-controller](https://github.com/selgesel/godot4-third-person-controller)

### Inferences
- Boogle's single buoyancy force (stronger with depth) already floats players to the surface. A dive is a natural slapstick verb (dive under a wave, surface under the ball) but needs a pad slot; Boogle's pad is crowded (A jump, X use, B respawn, LB shovel, RT/LT/RB dig/pile/flatten, L3 sprint, d-pad zoom). Reusing an existing button contextually in water (e.g. dig button = dive when swimming, since you cannot dig underwater) avoids a new slot.
- Surfacing jump at 4.5 m/s from water gives ~0.56 m rise: hard to climb out onto a beach ledge. A "breach" bonus when surfacing fast would add a dolphin-leap moment.

### Gaps
- No GDC/GMTK source on swim feel located in budget.

## Procedural animation for limbless low-poly characters and active ragdolls

### Takeaway
The cheap, robust tool is second-order dynamics (spring with frequency, damping, initial response) applied to visual transforms: it adds inertia, overshoot and anticipation to any procedural target. IK legs work by moving world-space foot targets that step when they stray too far from a predicted landing point, alternating groups. Full active ragdolls (Gang Beasts, Human Fall Flat, Peak, Wobbledogs) are physics-driven and deliberately unpredictable, which is the comedy, but they are costly and documented mostly anecdotally.

### Cited Findings
- t3ssel8r's 2022 video "Giving Personality to Procedural Animations using Math": procedural motion lacks keyframe inertia; extend y = x to a second-order system with three intuitive parameters — frequency (response speed), damping (settling), initial response (values > 1 overshoot, negative anticipates by moving backward first) — [Recapio digest](https://recapio.com/digest/giving-personality-to-procedural-animations-using-math-by-t3ssel8r); [VRChat second-order docs](https://chemicalcrux.github.io/vrc-docs/docs/code/best.crux.animator-dynamics/sources/second-order-dynamics)
- Solver is semi-implicit Euler; too-large timesteps blow up; the author derives a minimum safe timestep from eigenvalues and substeps or clamps — [Hackaday](https://hackaday.com/2022/06/30/a-math-based-personality-for-games)
- Procedural IK legs (Godot 4.5 spider): IK solver only chases marker targets; each leg has a raycast step sensor; a step triggers when the foot is too far from its predicted landing point; legs move in diagonal groups, only one group at a time — [80.lv](https://80.lv/articles/ik-driven-procedural-spider-locomotion-in-godot-4-5)
- Unity wall-walking spider positions legs to surroundings without any animations — [PhilS94 GitHub](https://www.Github.com/PhilS94/Unity-Procedural-IK-Wall-Walking-Spider)
- David Rosen (Wolfire) GDC 2014 "An Indie Approach to Procedural Animation": simple procedural techniques for fluid interactive animation with very few keyframes (Overgrowth, Receiver, Black Shades) — [GDC Vault](https://gdcvault.com/play/1020049/Animation-Bootcamp-An-Indie-Approach); a forum post says only 13 keyframes total (secondhand) — [Unity discussions](https://discussions.unity.com/t/an-indie-approach-to-procedural-animation-gdc-video-talk/538228)
- Active ragdoll: plays an animation but constrains it to what physics allows; avoids limp ragdolls, handles contact better, costs more CPU — [Wikipedia, Ragdoll physics](https://en.wikipedia.org/wiki/Ragdoll_physics)
- Gang Beasts: anecdotal forum claim that it is "full on ragdoll" driven by forces — [Unity discussions](https://discussions.unity.com/t/how-to-blend-ragdoll-physics-with-animation/734320) (unconfirmed)
- Human Fall Flat: Sakalauskas prototyped physics-based controls with independent arm control on sticks, found it messy and reworked it; the character had to feel right before puzzles; playtests showed players enjoyed physics more than puzzles so puzzles became looser; he first thought physics made online play impossible — [Wikipedia, Human: Fall Flat](https://en.wikipedia.org/wiki/Human:_Fall_Flat); [Annual Pardon interview reprint](https://annualpardon.pages.dev/posts/human-fall-flat-was-originally-designed-to-be-portal-meets-limbo-673184)
- Peak (Aggro Crab + Landfall, Unity, June 2025): reviewers describe slapstick ragdoll flops on missteps; no technical write-up found — [Wikipedia, Peak](https://en.wikipedia.org/wiki/Peak_(video_game)); [FinalBoss review](https://finalboss.io/peak-is-a-cooperative-climbing-game-about-failing)
- Wobbledogs: the developer chose physics over baked animation on a budget; movement is nondeterministic ("can't guarantee an arbitrary dog will be able to route to an arbitrary location"), so AI became distraction-based — [Game Developer](https://gamedeveloper.com/design/behind-the-ai-and-physics-of-i-wobbledogs-i-procedurally-goofy-wobbledogs)
- Commercial self-balancing ragdoll: shifts center of mass so the character leans into movement and recovers when hit, predicts foot placement — [80.lv](https://80.lv/articles/make-your-characters-feel-alive-with-this-self-balancing-active-ragdoll-system)

### Inferences
- Boogle's avatar is a capsule with eyes: no legs to IK. Highest-value procedural layer is a spring-driven "jelly" pose on `inner`: tilt opposite to acceleration (lean into turns, rock back when braking), squash on landing proportional to impact vy, stretch on takeoff, eyes/pupils lagging. All render-only, already runs for remotes from interpolated motion — no network cost.
- Little stubby feet (two small spheres) stepped with the Godot-style "step when target strays" rule would add a lot of charm cheaply; they can be cosmetic and snap to `groundHeight`.
- A full active ragdoll conflicts with client-authoritative small presence packets and DESIGN's "small and readable"; the face-plant already delivers the ragdoll joke as a canned flop. Extending it (a tumble with spin on mushroom bounce or a sprint-trip) gets most of the comedy.
- Wobbledogs' lesson matters for Boogle's ball: physical unpredictability must stay in the cosmetic layer for the player, never in input response.

### Gaps
- No primary technical documentation of Gang Beasts, Human Fall Flat or Peak internals was found.
- A Short Hike's GDC talk (Crafting A Tiny Open World) covers style, level design and writing per the abstract; no controller specifics found — [GDC Vault](https://gdcvault.com/play/1026613/Independent-Games-Summit-Crafting-A); [80.lv summary](https://80.lv/articles/gdc-a-short-hike-postmortem)
