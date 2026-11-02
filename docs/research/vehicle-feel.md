# Vehicle feel: driving the soapbox, riding the wagon

*Research report, 1 November 2026. How games make vehicles feel good to drive and to ride: handling models, grip and drift, boosts, speed feel, vehicle cameras, crash comedy, touch steering, and standing on moving trains. For the soapbox cart (`src/proto/soapbox/`, [soapbox.md](../game-design/soapbox.md)) and the timetabled wagon (`src/proto/wagon/`, `src/physics/platforms.ts`). Builds on [progression-feel-exploration.md](progression-feel-exploration.md) §3 (Lonely Mountains, Mario Kart Wii's integer charge, TotK, cannon-es maths), [vehicles.md](../proposals/vehicles.md) and [rail-as-play.md](rail-as-play.md); those findings are not repeated here. Recommendations only: nothing here is a design decision.*

**Markers.** *Verified*: fetched and read at the source (for slides, the text extracted from the PDF). *Secondary*: a wiki, review, forum or summary, not the developer. *Derived*: worked out for Boogle from the sources and the code, not stated by anyone.

## Summary: what matters most for Boogle

1. **Keep the soapbox's one-sphere model.** Rocket League's lead engineer cut mass, gears and longitudinal tyre friction and faked realism with visuals; the soapbox already does the same.
2. **Make grip a curve, not a cap.** Rocket League scales sideways friction by how sideways the car is moving and by the slope. That gives a "let go" moment that is readable and funny.
3. **Add the drift charge, short, with no timing window.** Mario Kart charges 5 a frame when the stick is held into the turn and 2 otherwise. On a 5 s run the thresholds need to be under half of Mario Kart's. Release on letting go (Mario Kart), not on a timed press (Crash Team Racing): slapstick over precision.
4. **Aim the camera at where the cart will be, not where it is**, and turn it the way the player turns. Keep the follow distance nearly fixed; distance lag is what hurts.
5. **Shake = trauma²**, from smooth noise, rotational only in 3D (Eiserloh, GDC 2016). Landings and crashes add trauma; rail joints barely do.
6. **Speed is heard and seen at the edges:** rolling-rumble pitch, wind, dust and a capped FOV widening. The FOV evidence is mixed, so cap it and test it.
7. **A crash is a show.** Hold the frame for a moment, keep the thrown rider in shot, scatter debris, and get back to the top quickly (Human Fall Flat: comedy comes from a "serious" world falling over).
8. **The wagon runs slower than you walk** (3 m/s against 5.6 walking). Try 5–6 m/s, between walking and sprinting, so catching it is a run and riding it beats walking.
9. **Standing on a moving vehicle breaks everything else first** (Uncharted 2's train: "If it works in train, it must work everywhere"). Test the ball, throws, jumping and remote riders on the deck before the wagon gets any faster.
10. **Measure re-runs and re-rides that nobody asked for**, wipeout rate, drift use and jump-off tumbles; these answer find-the-fun's questions 2 and 5.

## 1. Handling models

### Rocket League: simplify, then fake the rest (verified)

Jared Cone (Psyonix), ["It IS Rocket Science! The physics and networking of Rocket League"](https://media.gdcvault.com/gdc2018/presentations/Cone_Jared_It_Is_Rocket.pdf), GDC 2018 slides ([GDC Vault](https://www.gdcvault.com/play/1024972/It-IS-Rocket-Science-The)).

- Goals: "Fast, responsive vehicles", "Consistent, controllable physics". Tuning goals: "Fast acceleration and braking", "Sharp steering", "Stable driving, fast recovery".
- Physics runs on Bullet at a fixed 120 Hz. Lower rates mean bigger steps, deeper penetration and "inconsistent hits".
- The "Reduce complexity" slides:
  - no transmission ("Use force/accel curve instead");
  - mass "Keep constant", "Ignore when applying forces";
  - tyres: "Can live without longitudinal friction", "Simplify lateral friction".
- The friction model: `Ratio = SideSpeed / (SideSpeed + ForwardSpeed)`, `SlideFriction = Curve(Ratio)`, `GroundFriction = Curve(GroundNormal.Z)`, friction is their product.
- Rollover fixes: lower friction, limit steer angles, a "Stay upright" constraint, and "Apply forces at CM height".
- Wheel positions were first set by artists; a 2 cm shift changed handling. They moved to physics presets divorced from visuals ("Physics and visuals don't match").
- Summary slide: "Start simple or reduce complexity", "Fake realism with visuals", "Separate vehicle setup from visuals".

**For Boogle:** the soapbox (a frictionless sphere, grip and drag by hand, mesh posed on top) is this recipe already. The one piece it lacks is the friction curve: it cancels a constant 36 m/s² of sideways speed.

### Sphere controllers (verified, tutorial)

KidsCanCode's [Godot 4 arcade car](https://kidscancode.org/godot_recipes/4.x/3d/3d_sphere_car/index.html) is the common hobby form: one rigid-body sphere does the physics, a ray decides "grounded", which gates acceleration and steering, and the car mesh follows the sphere and aligns to the ray's normal. Its numbers: radius 1, gravity scale 5 ("less floaty"), bounce 0.1 (keep it under 0.5), no turning below 0.75 m/s, mesh slerps to the slope at 10/s. The soapbox matches all of this (it uses restitution 0.15 and a 0.5 m sphere).

### Raycast wheels (secondary)

Toyful Games' Very Very Valet uses one rigid body with a ray per tyre and three forces per tyre: a spring-damper, a sideways grip force and drive ([video](https://www.youtube.com/watch?v=CdPYlj5uZeI), [blog post](https://www.toyfulgames.com/blog/deep-dive-car-physics); the blog only says custom physics "allowed us to deeply adjust the settings for maximum fun"). A Unity forum thread praises it as a deep dive and notes it is not how real suspension works ([thread](https://discussions.unity.com/t/incredibly-good-deep-dive-into-car-physics/907520)). This is the model in [vehicles.md](../proposals/vehicles.md) (cannon-es RaycastVehicle); Boogle now runs Rapier through `src/physics/engine.ts`, so those cannon-es numbers would need re-deriving.

**Trade-off (derived):** raycast wheels give per-wheel contact (land on two wheels and wobble; one wheel catches a rock and the cart flips), which is slapstick. A sphere can't flip or catch a wheel, so it never stalls the fun. For a 5 s downhill run, the sphere is the cheaper toy; raycast wheels earn their cost when the cart should tip, for example on the land yacht.

## 2. Drift and boost

### Mario Kart 8 and 8 Deluxe: the charge counter (secondary)

From the [Super Mario Wiki](https://www.mariowiki.com/Mini-Turbo) and a [community drift guide](https://vikemk.com/drifting-guide) (both reverse engineering, not Nintendo):

- The counter rises 5 a frame when the stick is held into the turn and 2 otherwise; autodrift charges slower.
- MK8: blue sparks at 135 (cosmetic), Mini-Turbo at 270, Super at 570. MK8 Deluxe adds purple (Ultra), and thresholds vary with the kart's stat (Mini 200–280, Super 430–590, Ultra 660–900).
- At the best rate a Mini-Turbo is about 0.9 s of drifting, a Super about 2 s, an Ultra about 3 s.
- Boost lengths from Nintendo's own tutorial (cited by the wiki): about 0.62 s, 1.67 s and 2.63 s.
- A drift only starts once the kart lands from its hop; steering in the air costs speed.
- Smart Steering (an assist) disables the Ultra tier: assists and the top skill tier don't mix.
- Older games told the charge with smoke colour (MK64: white, yellow, orange) and spark colour (Double Dash: yellow, orange, blue).

### Crash Team Racing: the timed press (secondary)

Guides for Nitro-Fueled ([PowerPyx](https://www.powerpyx.com/crash-team-racing-nitro-fueled-boost-mechanics-explained/), [Pokde](https://pokde.net/blog/crash-team-racing-nitro-fueled-how-to-power-slide-and-turbo-boost-perfectly)):

- During a power slide you press the other shoulder button when the exhaust turns black (the gauge goes red at the same moment); up to three boosts per slide.
- Late presses backfire with a sound and no boost. Pokde advises timing by the exhaust colour, not by the on-screen "Perfect" text.
- Boost reserves stack across slides, and the fire colour shows how much you have.

**Difference that matters (derived):** Mario Kart rewards *holding* (release whenever after the threshold), Crash rewards *timing* a press inside a window. Holding is forgiving and readable; timing is precision play, which principle 10 warns against.

### Sonic & All-Stars Racing Transformed (secondary)

Reviews and [Wikipedia](https://en.wikipedia.org/wiki/Sonic_%26_All-Stars_Racing_Transformed): longer drifts give more boost, and tricks in the air give boost too. I found no designer interview (designer: Gareth Wilson). The idea worth keeping: *air time pays*, which suits a cart that leaves the ground on the hill's bumps.

## 3. Camera

### Juicing Your Cameras With Math (verified)

Squirrel Eiserloh, [GDC 2016 Math for Game Programmers slides](http://www.mathforgameprogrammers.com/gdc2016/GDC2016_Eiserloh_Squirrel_JuicingYourCameras.pdf):

- Keep a "trauma" level in [0, 1]. Hits add to it ("+= 0.2 or 0.5"), it decays linearly, and shake = trauma² or trauma³ (0.3, 0.6, 0.9 give 3%, 22%, 73%). Escalation is perceptible.
- In 3D: "Rotational: nice!", translational: "VERY BAD". In VR, "Tread carefully".
- "Use Perlin noise instead!" of random numbers: it feels better, works with pause and slow motion, and has an adjustable frequency.
- Smoothing: an asymptotic average (move a fraction of the way each frame; about 0.01 slow, 0.1 fast, 0.5 very fast at 60 fps). Horizontal and vertical, up and down, may use different weights ("Asymmetric").
- Framing: the player must never leave the view; points of interest bias the frame, feathered so nothing snaps.

### 50 Game Camera Mistakes (secondary)

John Nesky (Journey's camera designer), GDC 2014 ([video](https://www.youtube.com/watch?v=C7307qRmlMI)); seen only through summaries. Recurring points: the camera should turn where the player is turning, or they get frustrated; don't bounce the camera with the avatar's walk cycle; a simpler camera is nothing to be embarrassed about.

### Lonely Mountains: Downhill (fetched before; recap)

The camera aims at "an imaginary future position of the rider" ([80.lv](https://80.lv/articles/level-game-production-lonely-mountains-downhill)). A reviewer complains that left and right feel reversed when riding towards the camera (secondary, [search summary](https://www.gamereactor.eu/lonely-mountains-downhill-review/)): a fixed-ish camera trades control clarity for vistas.

### Practitioner chase cameras (secondary)

Open-source racing projects ([slamdemonium PR](https://github.com/huntergdavis/slamdemonium/pull/146), [Sand-N-Steel PR](https://github.com/mindoblivion/Sand-N-Steel/pull/9), [roadster issue](https://github.com/NeerajCodz/roadster-game/issues/140)) converge on:

- FOV widening with speed, capped (55° to 65°, or 70° to 85°);
- look-ahead along the velocity (`v × followTime`, or a look point at `4 + 0.9 × speed` m ahead);
- a critically damped follow spring, around 5 Hz;
- one measured finding: **distance lag does most of the damage**; FOV is the smaller effect and at least adds peripheral motion;
- a reduce-motion option that disables roll and strong shake.

### FOV and perceived speed (secondary, mixed)

Driving-simulator studies disagree. One line of work finds a wider geometric FOV raises perceived speed in third-person racing views ([Diels and colleagues](https://www.researchgate.net/publication/255730261_Geometric_field_of_view_manipulations_affect_perceived_speed_in_driving_simulators)); others find perceived speed falls with larger FOVs, or that it depends on the speed ([Hasselt paper](https://documentserver.uhasselt.be/bitstream/1942/32662/1/Published%20version.pdf), [ScienceDirect 2019](https://www.sciencedirect.com/science/article/pii/S1369847819301548)). I read abstracts only. Treat "more FOV = faster" as plausible, not settled.

## 4. Speed feel and sound

- **Burnout 3** (secondary, a review in [Codex Gamicus](https://gamicus.fandom.com/wiki/Burnout_3:_Takedown)): its motion effect gave "a fantastic sense of speed" but made oncoming obstacles hard to see. Speed effects cost readability. I found no Criterion source.
- **Engine audio** ([Designing Sound on Forza, Project CARS and REV](https://designingsound.org/2014/08/11/vehicle-engine-design-project-cars-forza-motorsport-5-and-rev/); [Lost Chocolate Lab](http://blog.lostchocolatelab.com/2012/05/racing-game-sound-study.html)): crossfaded loops pitch-bent by RPM are the cheap classic; pitch-shifting one sample too far sounds muddy low and "chipmunk" high. **For Boogle (derived):** the soapbox has no engine, so its speed sound is a rolling rumble plus wind. A two-layer crossfade (low rumble at 0–8 m/s, high rattle at 8 m/s and up), each pitched over a narrow range (about 0.8–1.3), avoids the chipmunk problem. The `audio-design` skill covers layers and buses.

## 5. Crashes and slapstick

- **Human Fall Flat** (verified, [TheGamer interview](https://www.thegamer.com/human-fall-flat-interview-tomas-sakalauskas/), Tomas Sakalauskas): the serious tone was deliberate, to "give the impression of a serious world and then hit the player with comedy". Independent arm control made "really messy controls", so they reworked it: messy outcomes, clean controls. In a [follow-up](https://www.thegamer.com/risky-human-fall-flat-big-games-simple-physics/) he says physics "can be a bit unpredictable", which is why big games avoid it. [Game Developer](https://www.gamedeveloper.com/production/-human-fall-flat-2-is-cancelled-we-are-making-human-fall-flat-3-no-brakes-games-founder-looks-back-on-a-defining-decade) reports the cancelled sequel lost the original's clumsiness by chasing the "wrong branch of physics".
- **Wreckfest** (secondary, [Corey Grigsby](https://medium.com/@CoreyDGrigsby/wreckfest-6b4a17f4a1b4), [PSU](https://www.psu.com/news/looking-forward-wreckfest/)): Bugbear's soft-body engine, with the stated aim to "have as much fun as possible" with damage. An early critic found the crashes impressive but lacking spectacle; debris and parts that come off fixed it. Spectacle is cosmetic, on top of the physics.
- **Descenders** (secondary, [Wikipedia](https://en.wikipedia.org/wiki/Descenders)): RageSquid spent the first months on bike physics alone, as "make or break". Tricks combine motions instead of button combos. Crashes cost one of four lives, which reviewers found harsh: a cost per crash makes crashes something to avoid, not enjoy.
- **Halo's Warthog** (secondary, [Game Developer, 2008](https://www.gamedeveloper.com/design/bungie-in-2008-reflecting-on-halo-3-moving-beyond); [PC Gamer](https://www.pcgamer.com/we-cant-decide-if-halo-infinites-warthog-is-beauty-or-beast/)): players launching Warthogs into the air is part of the series' emergent play. Halo Infinite's more car-like Warthog was criticised for losing its untameable feel. I found no Bungie tuning source.
- **Lonely Mountains** (secondary): on a crash the rider switches from the custom bike physics to a ragdoll, then respawns quickly.

## 6. Steering on touch and pads

- **Adam Telfer, [Touch Control Design: Less (Control) is More](https://mobilefreetoplay.com/touch-control-design-less-is-more/)** (verified): on Drag Racer, "Players don't need to control their speed, they just need to go forward!" Held inputs tie up a finger; one-finger play is the goal. Touch has no tactile edge, so players slide off controls without noticing.
- **Mario Kart Tour** (secondary, [Engadget](https://www.engadget.com/2019-09-25-mario-kart-tour-android-ios-impressions.html), [fan wiki](https://mario.fandom.com/wiki/Mario_Kart_Tour)): auto-accelerate, horizontal swipe steers or drifts, adjustable smart steering that pushes you off walls, optional gyro. Reviewers found it less precise than console but approachable.
- **Tilt or touch** (secondary, [MacKenzie, York University](https://www.yorku.ca/mack/ie2014.html)): touch usually performs best, tilt comes close and doesn't cover the screen. Tilt needs a dead zone.

## 7. Riding moving vehicles

### Uncharted 2's train (verified for the GDC report; secondary for the rest)

[Engadget on "Among Friends: An Uncharted 2 Post-mortem"](https://www.engadget.com/2010-03-12-gdc-among-friends-an-uncharted-2-post-mortem.html), GDC 2010:

- The train was a "headache for everyone involved": grenades bounced back into Nate's face, enemies' weapons flew off, aiming broke, and navigation got confused when the train "teleported".
- Fixing it improved effects, physics and animation across the game. Mantra: "If it works in train, it must work everywhere."
- Secondary ([Prima](https://primagames.com/games/uncharted-2-among-thieves/strategy/among-friends-how-naughty-dog-built-uncharted-2-10), [80.lv](https://80.lv/articles/the-secrets-of-the-train-level-in-uncharted-2)): Richard Lemarchand rejected the usual static train with scrolling ground; the cars really moved through streamed scenery, on a big loop, with cutscenes hiding the transitions. Aim ran a frame behind, which at train speed put the auto-aim about 2 m off.

### Red Dead Redemption 2 (secondary)

Rob Nelson, pre-release ([Wccftech](https://wccftech.com/rockstar-talks-about-rdr2-evolved-npcs/)): the goal was a world where you can leap onto a train at full speed, climb in, and slip off unseen. Intent, not shipped detail.

### Sea of Thieves (secondary)

A Rare programmer in an Insider AMA ([Wccftech](https://wccftech.com/rare-big-ambitions-ai-sea-of-thieves/)): the ship is one large physics object carrying many smaller ones, and physics updates are among the game's most expensive work. I found no talk on how players stand on the ship.

### Jumping off: how engines carry velocity (secondary)

Engine forums show the same bug everywhere: jump off a moving platform and you stop dead ([Unreal](https://forums.unrealengine.com/t/ue5-4-character-movement-not-inheriting-velocity-when-jumping-off-of-moving-object/1838175), [Roblox](https://devforum.roblox.com/t/characters-do-not-inherit-velocity-from-moving-platforms-they-are-standing-on/1484232)). Controllers offer three modes: no transfer, an initial transfer that fades, and a transfer kept until landing ([Unity gist](https://gist.github.com/zephjc/5641540)). Too much kept momentum bounces players off walls. Boogle's `platforms.ts` keeps the deck's speed through the air and bleeds it at 9 m/s² on landing, with a tumble above 3 m/s: the third mode plus a skid.

### Death Stranding and Tears of the Kingdom (secondary)

- I found no Kojima Productions source on vehicle handling. Players report vehicles that slide on braking and catch on rocks ([Steam thread](https://steamcommunity.com/app/1190460/discussions/0/3053988173725711307/)); [Top Gear](https://www.topgear.com/car-news/gaming/death-stranding-2-a-masterpiece-it-a-decent-driving-game) notes nobody discusses its handling despite 20-minute drives.
- TotK has no vehicle program at all: wheels, steering stick and boards are parts with their own behaviour ([Automaton](https://automaton-media.com/en/news/how-the-zelda-tears-of-the-kingdom-devs-accidentally-made-the-perfect-build-component/), secondary). Already covered in progression-feel-exploration §3.4.

### Not found

Mario Odyssey's moving platforms, Jak, Titanfall 2's ships, Trailmakers, GTA's handling, Gang Beasts' and TABS's designers on vehicles, and anything on getting in or out of a vehicle. Nothing verifiable turned up; the recommendations below on those topics are derived.

## What this means for Boogle

Recommendations with starting numbers. All are first guesses to tune in play; the soapbox values live in `T` (`src/proto/soapbox/index.ts`), the wagon's in `FEEL`/`VARIANTS` (`src/proto/wagon/index.ts`), `src/sim/wagon.ts` and `CARRY` (`src/physics/platforms.ts`).

### The soapbox

1. **Keep the sphere** (Rocket League's "reduce complexity"; the soapbox can't flip, so crashes never stall the fun). Revisit raycast wheels only if the playtest asks for tipping.
2. **Grip as a curve of slip ratio** (Rocket League's model). With `ratio = |vl| / (|vl| + |vf|)`:
   - full grip (`T.grip`, 36 m/s²) up to ratio 0.15;
   - falling linearly to 0.55 × grip at ratio 0.5, flat after;
   - multiply by a slope term: 1 at `n.y` ≥ 0.95, down to 0.7 at `n.y` 0.8 (steep side-slopes slide).
   - Effect: grip that "lets go" once you're properly sideways, instead of a constant cap. Keep `keepSlide` 0.6.
3. **Drift charge** (Mario Kart's counter, scaled to a 5 s run). Per fixed step while drifting: +5 with `|steer|` ≥ 0.7 into the slide, +2 otherwise.
   - Small sparks at 60 (0.2 s at best), "ready" sparks and a tick sound at 120 (0.4 s), bigger sparks at 240 (0.8 s).
   - Release on letting go of the handbrake. No timing window (not Crash's press).
   - Boost: ready gives +3 m/s forward over 0.35 s; big gives +5 m/s over 0.6 s (Mario Kart's mini boost is 0.62 s). Apply as acceleration so the drag curve takes it back, not as a raised cap: the cart has no cap.
   - Air time: +1 charge per step airborne for 0.3 s or more, kept for the next drift (Sonic Racing Transformed's "air pays"). Optional.
4. **Camera** (current: distance 8.5 m, yaw eases at 3.2/s towards the velocity above 3 m/s, FOV +0.6° per m/s over 6 m/s, max +9°).
   - **Look-ahead:** aim at the cart plus `v × 0.3 s`, capped at 4 m (Lonely Mountains' future position).
   - **Turn with the player:** add up to 0.25 rad of yaw bias in the steer direction, faded in over 0.3 s (Nesky).
   - **Distance:** keep 8.5 m nearly fixed; allow at most 0.5 m of pull-back with speed. Distance lag is the harmful part.
   - **FOV:** keep the ramp but cap at +12°, and ease back at a slower rate (2/s) than it opens (4/s), Eiserloh's asymmetric averaging.
   - **Shake (trauma):** +0.25 on a landing over 6 m/s of fall, +0.6 on a crash, decay 1.5 per second; shake = trauma², rotational only (max 2° yaw and pitch, 1° roll), smooth noise at about 12 Hz. Nothing while `reducedMotion`.
5. **Speed feel.** Rolling sound in two crossfaded layers, each pitched over 0.8–1.3; wind noise from 10 m/s; speed lines or streaking dust above 12 m/s (the run's top is about 15). Avoid blur: Burnout's speed effect cost visibility.
6. **Crash as a show.** Hit-stop of 60–80 ms on the crash frame; the camera follows the thrown rider, not the cart, until landing; one wheel pops off and bounces away (cosmetic, restored on the reset). Halve `returnAfter` to about 2 s, or offer "Back to the top" as soon as the rider lands. No cost per crash (Descenders' lives made crashes something to avoid).
7. **Boarding.** A 0.25 s hop arc into the seat and a sideways hop out, instead of a snap (derived; no source). Keep Interact as the only button.
8. **Touch.** Gravity is the throttle already (Telfer's "just go forward"). Steer from the left stick with a dead zone of about 10% of its radius; Jump is the handbrake, so drifting is one thumb each side. A light wall assist only on touch, if the playtest shows touch players hitting palms much more than keyboard players. Never pair an assist with the big boost tier (Mario Kart turns Ultra off under Smart Steering).

### The wagon ride

9. **Speed.** `WAGON_CRUISE` is 30 cm/tick (3 m/s), slower than walking (5.6) and much slower than sprinting (9.5). Try 50–60 cm/tick (5–6 m/s): riding beats walking, and catching it is a run. Keep acceleration gentle: `WAGON_ACCEL` 60–80 ticks (about 0.75 m/s² at 5–6 m/s), so a standing rider is never yanked. A heritage narrow-gauge feel (derived) is 15–25 km/h, 4–7 m/s.
10. **Fix the remote rider first.** At 3 m/s the remote rider shows about 0.3 m behind the deck (100 ms); at 6 m/s, 0.6 m, off the end of a 3.2 m flatbed. Send riders in the deck's frame (car index plus local position), as `src/proto/wagon/index.ts`'s header suggests, before raising the speed.
11. **"If it works on the train" checklist** (Uncharted 2): throw the ball on a moving deck, catch it, jump in place, walk the length of the train, jump between cars, ride the loco's boiler, and stand still through a corner (`carry.spin`). Any of these failing beats any feel tuning.
12. **Sway and clacks.**
    - Rail joints: real light rail comes in 9–12 m lengths (derived). At 5–6 m/s, joints 9 m apart give about 1.5 s between clacks per bogie, with the pair (two bogies 2.2 m apart) arriving 0.4 s apart: the "clickety-clack" rhythm. The current 4.5 m at 3 m/s gives 1.5 s too, so scale `joint` with the speed.
    - Roll: between calm and lively, about 0.035 rad (2°) per joint, on the car mesh only; the camera never rolls.
    - Vertical dip: 0.02–0.03 m per joint on the car mesh.
    - Camera while riding: trauma +0.05 per joint at most (shake 0.25%: in practice none). The lively variant's random translation jolt goes against Eiserloh's "3D: rotational only"; if any camera motion stays, make it a smooth-noise pitch nod.
13. **Boarding.**
    - The flatbed's deck is 0.7 m up, an easy hop; the loco's 1.75 m needs a full jump. Keep at least one deck reachable by walking up (a step or a low running board), so boarding is never a precision jump.
    - Keep `CARRY.boardS` at 0.12 s; landing on a moving deck must never jolt.
    - Telegraph departure (principle 7): raise `whistleS` from 1.2 s to about 2.5 s, add a bell at 4 s, so a walker 10 m away can run for it.
14. **Jumping off.** Keep the kept-until-landing carry. At 5–6 m/s every jump off is above `tumbleSpeed` (3 m/s): a tumble every time. That is slapstick, but if it becomes a chore raise `tumbleSpeed` to about 4.5 and let a jump off the back (moving against the train) land clean. RDR2's "leap on at full speed" is the fantasy to keep.

### What to measure in a playtest (solo-first)

Add counters to `window.__soapbox` and an equivalent for the wagon so a session can be read back afterwards.

- **Soapbox:**
  - runs started without being asked, and the gap between a finish or wipeout and the next run;
  - share of runs ending in a wipeout (a guess at a good range: 20–40%; well over half reads as frustrating, near zero as dull);
  - drifts per run, and time to the first drift that reaches "ready";
  - whether the player crashes on purpose (a good sign for principle 10);
  - best time over a session: does it keep falling?
- **Wagon:**
  - rides taken with no reason (find-the-fun question 2: "does anyone ride twice?");
  - time spent on the deck per ride, and time spent walking along the train;
  - jump-offs, and how many end in a tumble; missed boarding attempts;
  - any report of motion discomfort, with and without the lively variant;
  - whether the ball gets brought aboard.

## Sources

Verified (fetched and read):

- Jared Cone, [It IS Rocket Science!](https://media.gdcvault.com/gdc2018/presentations/Cone_Jared_It_Is_Rocket.pdf), GDC 2018 slides.
- Squirrel Eiserloh, [Juicing Your Cameras With Math](http://www.mathforgameprogrammers.com/gdc2016/GDC2016_Eiserloh_Squirrel_JuicingYourCameras.pdf), GDC 2016 slides.
- KidsCanCode, [Arcade-style car (Godot 4)](https://kidscancode.org/godot_recipes/4.x/3d/3d_sphere_car/index.html).
- Adam Telfer, [Touch Control Design: Less (Control) is More](https://mobilefreetoplay.com/touch-control-design-less-is-more/).
- TheGamer, [Human Fall Flat interview with Tomas Sakalauskas](https://www.thegamer.com/human-fall-flat-interview-tomas-sakalauskas/).
- Engadget, [GDC: Among Friends, an Uncharted 2 post-mortem](https://www.engadget.com/2010-03-12-gdc-among-friends-an-uncharted-2-post-mortem.html).
- Super Mario Wiki, [Mini-Turbo](https://www.mariowiki.com/Mini-Turbo); vikemk, [drifting guide](https://vikemk.com/drifting-guide) (both community reverse engineering).

Secondary (search summaries, reviews, wikis, forums): all other links above.

## Addendum, 1 November 2026: RC cars

*Why: the owner said "no" to the soapbox twice ("it needs to feel more like a suspensiony RC car maybe ... bumper/trigger for accelerating and braking makes a big difference in feel"). [boogle-2.md](../proposals/boogle-2.md) gives it one more try as an RC car. This addendum asks what makes small RC-style cars feel great, for suspension, traction, air control and the pad mapping. It amends recommendation 1 above ("keep the sphere") for the look of the ride, not its physics.*

### What the sources say

- **Raycast suspension, the arcade way** (secondary: forum code and specs, e.g. [roadster-game VEH-2](https://github.com/NeerajCodz/roadster-game/issues/67), [Roblox in-depth car physics](https://devforum.roblox.com/t/in-depth-scripted-car-physics/3915628), [Urho3D raycast vehicle](https://discourse-urho3d.github.io/t/raycast-vehicle/2982/), [Unity thread](https://discussions.unity.com/t/raycast-suspension/380902)): one ray per wheel from its mount down the body's axis, length = rest + travel + tyre radius; spring-damper `F = k·x + c·ẋ`, clamped at 0 so it never pulls the car down; push along the suspension axis, not the contact normal (that slides the car down slopes). The commonest bug is the damper's sign (it should oppose compression speed). Toyful Games' Very Very Valet (section 1) is the same model, tuned for fun.
- **Body tilt as its own layer** (secondary: Facepunch's s&box "Machines", `CarBodyTilt.cs`, [source](https://sbox.game/facepunch/machines/source?file=Player%2FCar%2FVisuals%2FCarBodyTilt.cs)): pitch back on throttle and forward on braking, roll from the turn, each through its own spring-damper, roll scaled down near standstill. Real active suspension tries to remove roll and pitch ([Wikipedia](https://en.wikipedia.org/wiki/Active_suspension)); a toy wants them exaggerated.
- **Re-Volt** (secondary: [Wikipedia](https://en.wikipedia.org/wiki/Re-Volt), [Re-Volt car body setup](https://re-volt.io/articles/car-body-details), [NeoGAF thread](https://www.neogaf.com/threads/lttp-re-volt-im-currently-playing-the-best-rc-car-game-ive-ever-played.484986/), [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/ReVolt)): praised for reproducing cheap RC cars; light cars flip and spin, heavier ones are more controllable; an "angular air resistance" setting (about 25–30) keeps cars from tumbling in the air, and below 0 they spin wildly. Criticised: a wide turning circle and no variable steering. So: light and lively, but damp the air rotation and steer sharply.
- **Mario Odyssey's RC car** (secondary: [Super Mario Wiki](https://www.mariowiki.com/RC_Car), [RC Car Challenge](https://www.mariowiki.com/RC_Car_Challenge), [GameFAQs](https://gamefaqs.gamespot.com/boards/200275-super-mario-odyssey/75951606)): left stick throttles and brakes, right stick steers (tank-like "real remote" mapping); players call it a nightmare to drive straight. The lesson is a negative one: don't make the player fight the remote; steer relative to the car, throttle on a separate input.
- **Real RC jumping** (secondary: [Axial, "Jump Properly"](https://www.axialadventure.com/axi-blog-archive-jump-properly.html), [RCTalk](https://www.rctalk.com/forum/threads/rc-jumping-teqnique-tips.32351/)): throttle in the air lifts the nose (the wheels' reaction torque), brake drops it; "only a tap" of brake is needed, too much flips it over. This is the RC car's own air control, and it maps straight onto the triggers.
- **Triggers are the convention** (secondary: [Liquipedia, Rocket League controls](https://liquipedia.net/rocketleague/Control_settings); [Mario Kart 8 Deluxe controls](https://outsidergaming.com/mario-kart-8-deluxe-complete-controls-guide/) ZR/ZL accelerate/brake, R to hop and drift; [GamesRadar on Fortnite cars](https://www.gamesradar.com/fortnite-cars-locations-how-to-drive/); [RaceRoom pad setup](https://solox.gg/raceroom-controller-settings/)): RT throttle, LT brake and reverse, a face button or bumper for the handbrake or drift. Pad guides suggest small dead zones and the full travel, and a linear or "snappy" curve for arcade racers.
- **Mario Kart's jump boost** (Nintendo's [MK8 manual](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/wii_u_6/mario_kart_8/ElectronicManual_WiiU_MarioKart8_EN.pdf), [Mario Kart wiki: Trick](https://mariokart.fandom.com/wiki/Trick)): a trick off a ramp lip pays a short boost on landing. Air pays.
- **Hot Wheels Unleashed** (secondary: [Prima drift guide](https://primagames.com/gaming/hot-wheels-unleashed-drift-guide), [Game Informer](https://gameinformer.com/review/hot-wheels-unleashed/hot-wheels-unleashed-review-simple-satisfying-speed), [God is a Geek preview](https://godisageek.com/2021/04/hot-wheels-unleashed-is-loads-of-fun-hands-on-preview/)): brake-to-drift that keeps more steering than Mario Kart's, drifting fills boost; one previewer never got comfortable steering mid-drift. Toy cars at toy scale, sold by the camera and the bounce.
- **Tears of the Kingdom** (secondary: [Game Developer on the GDC 2024 talk](https://gamedeveloper.com/programming/how-nintendo-did-the-impossible-with-tears-of-the-kingdom-s-physics-system), [Automaton: the Portable Pot as suspension](https://automaton-media.com/en/?p=19285), [Zelda Wiki: Big Wheels](https://zeldawiki.wiki/wiki/Big_Wheels)): no vehicle code at all, just parts and joints; players found a self-righting pot made wheels absorb shocks and grip better. Big wheels are slower but shrug off rough ground; small ones are fast and skittish.
- **Halo's Warthog** (secondary: [Halopedia](https://www.halopedia.org/Warthog), [Wikipedia](https://en.wikipedia.org/wiki/Warthog_(Halo))): long-travel independent suspension you can see working is half its character; critics call it "sloppy" and players love it anyway (section 5: the untameable feel).
- **Wreckfest** (secondary: [PC Gamer review](https://www.pcgamer.com/wreckfest-review/), [Steam page](https://store.steampowered.com/app/228380)): soft, heavy suspension and weight that changes handling sell every hit; tall cars tip.
- **Not found:** anything on Astro Bot's vehicles beyond reviews ([Kotaku](https://kotaku.com/astro-bot-ps5-hands-on-impressions-playstation-1851535387)), or on Micro Machines' handling, Rocket League's suspension numbers or Fortnite's current pad defaults from a developer.

### Recommendations for the soapbox as an RC car

1. **Keep the sphere for the physics, add a sprung chassis on top** (derived; Rocket League's "fake realism with visuals" plus the raycast-suspension recipe). Four rays from the wheel mounts each frame, a spring-damper per wheel, and a chassis with three degrees of freedom (heave, pitch, roll) that the springs hold up and the cart's own accelerations throw around. The wheels follow the ground on their own and the body floats over them: that is the "suspensiony" read, without a rigid body that can flip and stall the run.
2. **Make the tilt big.** Roll 6–12° in a hard turn, pitch 4–8° on throttle and brake, a landing squash that bottoms out and rebounds at least once. Damping ratio about 0.3–0.5 (one or two visible overshoots), never under 0.2 (it wobbles forever) or over 0.8 (it reads stiff and real).
3. **Let the suspension touch the handling a little:** grip times the share of wheels on the ground, so a bounce after a landing is briefly loose. Lateral weight transfer stays cosmetic: the sphere can't tip.
4. **Analog triggers:** RT throttle, LT brake and then reverse from a stop, read as 0–1 values with a 0.05 dead zone and the full travel. A face button keeps the handbrake drift (A, as now: Mario Kart's R is a shoulder, but A is free while seated and already labelled). Keyboard W/S and the left stick keep working.
5. **A motor, not just gravity:** an RC car pulls on the flat. Strong low-speed acceleration (about 10 m/s²) falling to nothing at the motor's top speed (about 13 m/s), so the start is snappy and the hill still adds speed.
6. **Air control from the throttle:** throttle in the air pitches the nose up, brake pitches it down (real RC technique), damped like Re-Volt's angular air resistance so it never tumbles. Land at a matching angle and the springs soak it up; land nose-first and the chassis slams.
7. **Variants that change one thing:** spring and damper (bouncy: soft, long travel; tight: stiff, short, more grip) and rear grip (drift). Compare in one sitting.
8. **Look the part:** bigger wheels, a visible gap and struts between body and wheels, so the travel can be seen from the chase camera.
