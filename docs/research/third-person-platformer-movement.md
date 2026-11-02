# Third-person platformer movement: controller and animation

*Research report, 1 November 2026. How third-person platformers known for their game feel build character movement and its animation. Ratchet & Clank (Insomniac, 2002 to Rift Apart) is the main reference; Super Mario 64 and Odyssey (with 3D Land and 3D World), A Hat in Time, Astro Bot and Fall Guys are secondary. The recommendations are for Boogle's short, round hero. Builds on [character-controller-feel.md](character-controller-feel.md) (jump shape, squash spring, ground snap), [procedural-animation.md](procedural-animation.md) (springs, few-pose characters, stepping feet) and [ratchet-and-clank-feel.md](ratchet-and-clank-feel.md) (movement chains, grinding, the second jump) without repeating them. Boogle's side was read from `main` at 5a7ae89: [src/physics/physics.ts](../../src/physics/physics.ts), [src/player/player.ts](../../src/player/player.ts), [src/player/avatars.ts](../../src/player/avatars.ts), [src/features/feel.ts](../../src/features/feel.ts), [src/proto/hero/index.ts](../../src/proto/hero/index.ts), [src/proto/moves/index.ts](../../src/proto/moves/index.ts), [src/netplay/net.ts](../../src/netplay/net.ts) and [assets/src/hero-rig.py](../../assets/src/hero-rig.py). **Insomniac has published no movement or animation numbers for Ratchet** (run speed, jump heights, turn rates, blend times), and no talk, interview or fan measurement found this session gives any. Every number below comes from Mario's decompiled code, Odyssey's community wiki, Celeste's released source, Hat Kid's wiki or Boogle's own code. Nothing was played or measured frame by frame. Recommendations only; nothing here is a decision.*

**Markers.** **[V]**: the page or code was fetched and the point matches it. **[S]**: seen only in a search summary, a review or a fan page; check before relying on it. **[C]**: computed here from Boogle's code or from a formula. Findings are paraphrased. **BH** means body heights: SM64 Mario is taken as about 160 units tall (the guest engine in [src/guest/](../../src/guest/) runs at 100 units per metre, so about 1.6 m) [S], Odyssey's Mario is 142 units [V], and Boogle's hero is about 1.7 m [C].

## Summary

1. **Ratchet's feel comes from fast transitions and authored animation, not from published physics.** Insomniac describes the series as a platformer first, with keyframed squash and stretch central to its appeal [V], and says Rift Apart's core movement is faster and more responsive, with quicker transitions from move to move [V]. Most of Rift Apart's motion is hand-animated, with some procedural parts [V]. No numbers exist publicly.
2. **Boogle's controller is already quicker than the references.** It reaches walk speed in 0.08 s and sprint in 0.14 s (ground acceleration 70 m/s²) [C]. Celeste takes 0.09 s [V]; SM64 Mario takes about 1.6 s to reach top speed and 0.6 s to reach half of it [V, C]. Coyote time (0.1 s) matches Odyssey (6 frames) and Celeste (0.1 s) [V], and the 0.15 s jump buffer matches Odyssey's 9-frame triple-jump window [V]. The gaps are elsewhere: air control is 0.2 of ground control (Celeste uses 0.65 [V]), and the jump is shorter relative to the body (0.38–0.99 BH against Odyssey's 0.74–1.82 [V, C]).
3. **The references make input win by rule, not by luck.** SM64 snaps Mario's facing to the stick when he starts walking, cuts upward speed to a quarter when A is released while rising faster than 20 units per frame, and plays the run cycle at a rate set by the larger of stick tilt and actual speed, so the legs answer the stick before the body has sped up [V]. Odyssey starts running after one standing frame and pivots instead when the stick is more than 95° away [V]. Hat Kid's dive can be cancelled at any time by jump or crouch, and she gets two air actions per airtime [V]. Cooper's game-animation rule: mark the frame where control returns before the end of a move's follow-through [V].
4. **Turning is rate-limited with a skid past about 100°.** SM64 turns Mario at most 11.25° per frame (337°/s) and goes into a turn-around skid when the stick is more than about 100° behind him at half speed or more [V]. Odyssey caps turning at 6.5° per frame (390°/s) below top speed, with angular acceleration [V]. Boogle's facing eases toward the stick at 12/s (more than 2000°/s at first) [C]. That's fine for a toy, but Boogle has no skid *pose*, and a skid pose is what reads as weight.
5. **Run cycles are speed-matched and change gait with hysteresis.** SM64 scales animation playback with speed (speed / 4) and switches walk to run above 22 units per frame and back below 18 [V]. Unreal's distance matching and Paragon's stride warping pick poses by distance travelled so feet don't slide [V, S]. Toyful's Very Very Valet drives a "wheel" of two poses and briefly speeds the cycle up (a "scramble") when a character crosses into running [V].
6. **Boogle's hero cycle has three concrete defects** [C]:
   - **The feet skate about 2×.** The stride is fixed at 2.0 m per cycle, but a ±40° thigh swing on a 0.36 m leg covers only 0.46 m per step, against 1.0 m of ground travel.
   - **The body bob isn't locked to the steps.** It runs on its own phase in [avatars.ts](../../src/player/avatars.ts): 4.1 bounces per second against 5.6 steps per second at walk, and 6.1 against 9.5 at sprint.
   - **The lean tips the whole figure like a skittle.** It pitches the entire avatar around a point 0.45 m above the soles. A 0.35 rad lean slides the feet 0.15 m and lifts them off the ground, and it saturates on every start and stop, because Boogle's 70–115 m/s² accelerations are 4–6 times gravity. That is the most likely reason the lean "doesn't feel right".
7. **A short-legged body should take shorter, faster steps that lengthen with speed.** Alexander's dynamic-similarity relation (stride = 2.3 × hip height × Froude^0.3) gives the hero a 1.6 m cycle at walk and 2.2 m at sprint, 7.0 and 8.7 steps per second, against today's fixed 2.0 m [V, C]. A human at Boogle's walk speed takes about 3.7 steps per second [C]. The hero's "walk" is already a run by any physical measure (Froude 8.9, against the 0.5 where people switch to running [V]), so it should read as a scurry: quick feet, a bounce on every step, an upright face, and lean coming from the body bone rather than the whole figure.
8. **The references add moves without adding buttons.** Odyssey and SM64 derive the long jump, backflip and side flip from context (crouch plus jump, or jump during a skid) [V]. Hat Kid's sprint jump covers twice the distance of a normal jump and takes away her double jump [V]. Rift Apart glides when you hold jump in the air and does a melee slam [V]. Boogle can do the same with sprint plus jump, a skid plus jump, and the bump button in the air.
9. **Secondary motion only pays where the camera can see it.** Toyful dropped secondary animation because it didn't read at their game camera, and pushed squash past what looks right up close [V]. Fall Guys' team says losing the ragdoll quality loses the comedy [V]. For Boogle that means a few big secondary elements (mittens, feet, hat, whatever rides on the back), not many small ones.
10. **Nearly all of it can be derived from motion for remote players.** Speed, vertical velocity, acceleration, skids (facing against velocity), double jumps (vertical speed rising in the air) and glides (a steady slow fall) all come from the 20 Hz position and yaw. A side flip, a long jump and a slam's wind-up can't be told apart from motion cleanly; they need one small presence field (rec 13).

## Findings by source

### Ratchet & Clank (Insomniac)

- **A platformer first.** The 2016 remake's postmortem calls the original "a platformer first and a shooter second" and says keyframed animation, including squash and stretch, was central to the series' appeal and expensive to make. Children aged 7–9 tested from preproduction, ignored the right stick, and levels lost sharp turns as a result [V, [Game Developer postmortem](https://www.gamedeveloper.com/design/-i-ratchet-clank-2016-i-postmortem)].
- **Faster transitions.** Mike Daly (Rift Apart's director) says the core movement is faster and more responsive than in earlier games, with faster and smoother transitions between moves, which allowed more complex platforming [V, [GamingBolt reporting GamesRadar](https://gamingbolt.com/ratchet-and-clank-rift-aparts-core-movement-is-faster-and-more-responsive-than-previous-games)]. Players criticised older entries for wide turning arcs and long skids [S, reviews seen in search results]. Insomniac tightened exactly what Boogle already has tight.
- **Authored first.** Lindsay Thompson (lead cinematic animator) says most of the game's motion is animated, with some procedural; animators prototype ideas quickly in Maya with designers and programmers; the tether and wall-run built on Sunset Overdrive and Spider-Man work [V, [interview](https://www.feed4gamers.com/game-news/275074/lindsay-thompson-on-animating-ratchet-rivet-and-spider-man.htm)]. Insomniac's own write-up gives procedural locomotion to Glitch (spider legs fitted to walls) but nothing on Ratchet's locomotion [V, [PlayStation Blog](https://blog.playstation.com/2021/09/02/deconstructing-the-impeccable-animation-of-ratchet-clank-rift-apart/)]. Thompson's GDC 2022 talk exists, but its content is members-only [V, [GDC Vault](https://gdcvault.com/play/1027743/Animation-Summit-The-Animated-World)].
- **Rift Apart's move list.** Jump; hold jump in the air to glide; a melee slam; Phantom Dash (a dodge); hoverboots (a held button); swingshot and rift tether at fixed points; accessibility options that automate gliding and swinging [V, [gamepressure controls](https://www.gamepressure.com/ratchet-clank-rift-apart/controls/z4e852)]. Wall-runs only on marked plates, and grinding, are in [ratchet-and-clank-feel.md](ratchet-and-clank-feel.md).
- **The older move set** [S, fan wiki and speedrun guides via search; the pages refused fetching]: double jump; high jump (crouch, then jump); long jump (crouch while running, then jump); side flip and backflip from strafe plus jump; Heli-Pack hover after the jump; the hyper strike (a wrench slam from the air). Speedrunners gain speed by chaining long jumps, which shows the long jump carries more horizontal speed than running.
- **Sunset Overdrive's locomotion talks** (Grossman and Vasquez on animation; Quebe and Higa on a modular, limb-based movement system with 9 footstep behaviours and 6 shoe types) exist only as listings [V, [Game Anim](https://www.gameanim.com/?p=19915), [Game Developer](https://gamedeveloper.com/design/video-how-audio-and-movement-were-synced-in-i-sunset-overdrive-i-)].

### Super Mario 64 (decompiled source)

The decompilation is the most precise public source on any 3D platformer's controller, and the same engine runs in Boogle as the dino's guest ([src/features/dino.ts](../../src/features/dino.ts)). Values are per frame at 30 fps; metres use the guest's 100 units per metre [C].

| | SM64 | In metres at the guest's scale |
|---|---|---|
| Top run speed | 32 u/f (48 absolute cap) [V] | 9.6 m/s, about 6 BH/s |
| Acceleration | +1.1 − v/43 per frame [V] | half speed in about 0.6 s, top speed in about 1.6 s [C] |
| Turn rate | at most 0x800 per frame (11.25°) [V] | 337°/s |
| Turn-around skid | stick more than about 100° behind, at 16 u/f or more [V] | brakes at 2 u/f², about 18 m/s²: a 2.6 m skid from top speed [C] |
| Gravity | 4 u/f², terminal −75 [V] | 36 m/s², 22.5 m/s |
| Jump | 42 + speed/4, forward speed × 0.8 [V] | 2.2 m standing, 3.1 m at a run (1.4–1.9 BH) [C] |
| Double / triple jump | 52 + speed/4 / 69 [V] | 3.4–4.5 m / 6 m [C] |
| Backflip, side flip | 62; backflip sets −16 u/f, side flip 8 u/f and faces the stick [V] | 4.8 m [C] |
| Long jump | 30, forward × 1.5 (cap 48), **half gravity** [V] | 2.25 m high, about 1 s airborne, ~14 m long [C] |
| Jump release | rising faster than 20 u/f with A up: vertical speed ÷ 4 [V] | a tap hop of a few tens of cm [C] |

Sources: [mario.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario.c), [mario_actions_moving.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_moving.c), [mario_step.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_step.c).

- **The cycle is speed-matched, and stick tilt drives it.** The walk and run play at a rate of `max(stick tilt, speed) / 4`, so the legs speed up on the frame the stick tilts, while the body takes 0.6 s to reach half speed. Gaits switch with hysteresis: tiptoe below 5, run above 22, back to walking below 18 [V].
- **Facing snaps when a move starts.** Starting to walk sets facing to the stick at once, and so does a side flip; turning while already running is rate-limited [V].

### Super Mario Odyssey, 3D Land and 3D World

- **Running** [V, [smo.wiki Running](https://smo.wiki/Running)]:
  - Top speed is 14 units per frame at 60 fps at full tilt (11 × tilt + 3), about 5.9 BH/s [C].
  - Right after braking and running the other way, the cap is 17 for a moment.
  - Turning is capped at 6.5° per frame below 14 u/f and 8.5° above 16, with angular acceleration of 1/20 of the cap per frame within 45° of facing and 1/5 of it between 45° and 95°. Past 95°, Mario pivots instead.
  - Coyote time is 6 frames after running off a ledge, falling at a constant 7 u/f.
- **Jumps** [V, [Jump](https://smo.wiki/Jump), [Triple jump](https://smo.wiki/Triple_jump), [Backflip](https://smo.wiki/Backflip), [Long jump](https://smo.wiki/Long_jump), [Unit](https://smo.wiki/Unit)]:

  | Jump | Height | In body heights [C] |
  |---|---|---|
  | Single (tap to full hold) | 105–258 u; up to 312 at speed | 0.74–1.82; up to 2.2 |
  | Triple | 325–550 u | 2.3–3.9 |
  | Backflip, side flip | 496 u | 3.5 |
  | Long jump | 144 u | 1.0 |

  A triple jump needs at least 13.84 u/f, the jumps within 45° of each other, and no more than 9 frames on the ground between them.
- **Input overrides.** Throwing the cap turns Mario to the stick at once, which allows hairpin turns and stalls in the air; a dive cuts a jump short [V, [Critical Points review](https://critpoints.net/2017/12/23/mario-odyssey-review/)].
- **Fudge the physics.** Miyamoto first opposed letting Mario change direction in mid-air, then accepted it: impossible in reality, but it made stomping feel right. Hayashida traces it to Tanooki Mario in SMB3 [V, [Iwata Asks: 3D Land](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-SUPER-MARIO-3D-LAND/Vol-2-The-producers/4-What-Is-Stomping-/4-What-Is-Stomping-215798.html)]. The same interview calls the long jump the most advanced move in 3D Mario [S].

### Celeste (released source; 2D, for timing only)

`Player.cs` [V, [source](https://raw.githubusercontent.com/NoelFB/Celeste/master/Source/Player/Player.cs)]:

- Run speed 90 with acceleration 1000, so top speed in 0.09 s; slowing down at 400 when over speed or with no input.
- Air control at 0.65 of ground.
- Gravity 900, halved near the apex (|vy| < 40) while jump is held.
- Jump grace (coyote) 0.1 s; the variable-jump window is 0.2 s.
- Fall cap 160, or 240 when fast-falling.
- Dash 240 for 0.15 s.

The forgiveness article adds a 2-pixel wall-jump leniency and corner correction [V, [Maddy Thorson](https://maddymakesgames.com/articles/celeste_and_forgiveness/index.html)].

### A Hat in Time

Gears for Breakfast's designer names Mario 64, Sunshine and Psychonauts as its models [S, [player2 interview](https://www.player2.net.au/2017/03/interview-jonas-kaerlev-a-hat-in-time/)]. The community wiki documents the moves [V, [Movement](https://ahatintime.wiki.gg/wiki/Movement)]:

- **Two air actions per airtime:** double jump and dive. Springs, balloons, hookpoints and enemy bounces restore them.
- **Dive** (crouch while moving): a burst of speed with slow steering. In the air it briefly slows the fall. Uncancelled, it lands into a slide and leaves her prone until jump or crouch. Jump or crouch cancels it at any time, and a jump-cancel in the air briefly slows the fall again. A cancel just after landing is a "dive boost" front flip that outruns the Sprint Hat.
- **Wall run:** jumping at a wall runs her up it, once per wall until she touches another wall or the ground.
- **Sprint jump:** about double a normal jump's distance, with no double jump afterwards.
- **Homing attack:** a prompt when above an enemy.
- **Hard falls** knock her prone, and pressing jump recovers faster.
- A console guide gives the default gravity as −750 Unreal units/s², about 1.44× UE3's default [S, [console guide](https://www.yekbot.com/a-hat-in-time-developer-console/)].

### Astro Bot (Team Asobi)

- **Proportions.** Nicolas Doucet says the key point of Astro's design is his bottom: a plump, nappy-like shape and a toddler's unsteady walk that make players want to touch him. A big head and round belly stayed constant. Once he ran and jumped, his gait became more confident, and joints were added for crouching and arm movement [V, [Famitsu](https://www.famitsu.com/article/202406/7939)].
- **Joy and prototyping.** Animation director Jamie Smith takes children's joy (jumping up and down) as the model; gameplay is prototyped primitive-first and polished only once it is fun [V, [PlayStation Blog](https://blog.playstation.com/2024/09/09/astro-bot-how-team-asobi-created-a-unified-vision-for-fun/)].
- **Controls.** Hold jump in the air to hover on laser thrusters, which also damage things below; the hover lasts a couple of seconds, with a visual cue on Astro [S, [Shacknews](https://shacknews.com/article/141300/controls-moves-abilities-astro-bot)]. Asobi's GDC 2025 talks cover haptics and the game's history, not the controller [V, [GDC Vault](https://www.gdcvault.com/play/1035347/Feel-the-World-The-DualSense)].

### Fall Guys (Mediatonic)

- **Ragdoll is the joke.** Joe Walsh says the hardest part was the floppy, ragdoll feel at 60 players: every simulated part is multiplied by 60, and losing the ragdoll quality loses the comedy [V, [GamesBeat](https://gamesbeat.com/fall-guys-ultimate-knockout-how-mediatonic-crafted-a-cute-battle-royale/)].
- **Lore and rig.** The beans are officially about 6 feet tall [S, PC Gamer headline]. A concept artist compares their skeleton to the Minions', which is why they wiggle when they run [S, search summary].

### Animation craft

- **Cooper, *Game Anim*** [V, [book excerpt](https://gamedeveloper.com/production/the-12-principles-of-animation-in-video-games)]:
  - Anticipation is the contested principle: designers want it short, animators long; too little makes moves weightless, too much makes them unresponsive.
  - Set the frame where control returns before the end of the follow-through.
  - Squash and stretch is often done with poses (stretched limbs on takeoff and landing), since many engines don't scale bones.
  - Movement that reaches full speed instantly reads as weightless unless a pose or push-off sells it.
  - Overlapping parts arrive at different times.
- **A pose on the first frame.** Game animators commonly answer the anticipation problem by starting the jump on an extreme pose, so the eye reads a wind-up without the delay [S, r/gamedev discussion].
- **Swink, *Game Feel*** [V, [Game Developer](https://www.gamedeveloper.com/design/game-feel-the-secret-ingredient), [Principles of Virtual Sensation](https://www.gamedeveloper.com/design/principles-of-virtual-sensation)]:
  - Steering and jumping is what a Mario 64 player does most of the time.
  - Polish (squash, particles, shake) fakes the perception of weight; it doesn't simulate it.
  - New Super Mario Bros.' run cycle speeding up and slowing down with dust is his example of animation selling motion.
  - Motion that ramps reads as more fluid than motion that switches on and off.
- **Toyful Games** (Very Very Valet) [V, [blog](https://www.toyfulgames.com/blog/character-animations)]:
  - About 50 single-frame poses, blended by curves; a run cycle is two poses on a "wheel" whose radius sets the gait.
  - Crossing into a run triggers a "scramble" (the cycle runs fast for a moment, with more dust).
  - Skid, fast-stick spin and landing flourish are visual only.
  - Squash goes past what looks right up close.
  - Secondary animation was dropped because it didn't read at their camera.
- **Little Polygon, procedural locomotion** (beyond what [procedural-animation.md](procedural-animation.md) covered) [V, [part 1](https://blog.littlepolygon.com/posts/loco1/), [part 2](https://blog.littlepolygon.com/posts/loco2/)]:
  - Each foot swings for half its phase and is pinned in world space for the other half (re-pinned at touchdown).
  - The landing target is pushed ahead by 0.15 s × velocity.
  - The swing arc is a cubic ease-out, `9.48 · (1−x)³ · x`, which glides the foot down instead of stomping it.
  - The facing spring is 0.1 s, and the hip roll runs at half the bob frequency.
- **Distance matching.** Unreal picks a start, stop or pivot pose by the distance travelled rather than by time, and scales play rate to speed so feet don't slide [V, [Epic docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/distance-matching-in-unreal-engine)]. Stride warping stretches the legs to cover the speeds between authored clips; it comes from Paragon (Delayen, nucl.ai 2016) [S].

### Biomechanics: short legs, fast feet

- **Dynamic similarity.** Animals of different sizes move alike at equal Froude numbers, `Fr = v² / (g · leg length)`. People switch from walking to running near Fr 0.5 [V, [Wikipedia](https://en.wikipedia.org/wiki/Transition_from_walking_to_running)]. Running is any gait where each foot is on the ground less than half the stride (duty factor under 0.5) [S, [Frontiers](https://www.frontiersin.org/articles/10.3389/fphys.2022.1044363)].
- **Stride length.** Alexander's 1976 relation for speed from stride λ and hip height h is `u = 0.25 · g^0.5 · λ^1.67 · h^−1.17` [V, quoted in [Prescott et al. 2025](https://researchonline.ljmu.ac.uk/id/eprint/26667/1/Speed%20from%20fossil%20trackways%20calculations%20not%20validated%20by%20extant%20birds%20on%20compliant%20substrates.pdf)]. Rearranged, `λ / h = 2.3 · Fr^0.3` [C]: stride grows with speed^0.6 and cycle rate with speed^0.4. It was fitted on mostly mammalian data and overestimates speed on soft ground (the same paper); Boogle's hero runs far beyond its data, so treat it as a shape, not a law.
- **Boogle's hero** [C]:
  - Its hips are 0.36 m above its soles: a 9 cm thigh, a 9 cm shin and an 18 cm foot ([hero-rig.py](../../assets/src/hero-rig.py)).
  - At walk (5.6 m/s), Fr = 8.9; at sprint (9.5 m/s), 25.6 (with g = 9.81). Both are deep in running.
  - Alexander gives a cycle of 1.59 m at walk (3.5 cycles/s, 7.0 steps/s) and 2.19 m at sprint (4.3 cycles/s, 8.7 steps/s). Today's cycle is a fixed 2.0 m: 5.6 steps/s at walk and 9.5 at sprint, too slow at walk and too fast at sprint.
  - With the game's 18 m/s² gravity in place of 9.81 the numbers rise to 8.4 and 10.4 steps/s, which sets the upper end of the range.
  - A human with 0.9 m legs at 5.6 m/s takes about 3.7 steps/s. The hero should step about twice as often as a person running beside it.
- **Lean.** A body accelerating at *a* balances at a lean of `atan(a / g)`, whatever its height [C, statics]. Boogle accelerates at 70 m/s² and brakes at 115 m/s² under 18 m/s² gravity: "balanced" leans of 76° and 81°. Any lean proportional to acceleration has to be scaled down hard and capped. In practice it then switches between 0 and the cap.

## How Boogle's movement compares

Boogle's numbers are from [player.md](../game-design/player.md), [physics.ts](../../src/physics/physics.ts) and [feel.ts](../../src/features/feel.ts); BH for the hero is 1.7 m.

| | Boogle today | SM64 | Odyssey | Celeste |
|---|---|---|---|---|
| Top speed | 3.3 BH/s walk, 5.6 sprint | ~6 BH/s | ~5.9 BH/s | — |
| Time to top speed | 0.08 s walk, 0.14 sprint | ~1.6 s | not given | 0.09 s |
| Air control / ground | 14/70 = 0.2 | small; mostly drift [S] | — | 0.65 |
| Turn | exponential, 12/s (over 2000°/s at first) | 337°/s, skid past ~100° | 390–510°/s, pivot past 95° | instant (2D) |
| Skid from top speed | 0.08 s, 0.4 m at 115 m/s² | 0.53 s, 2.6 m | not given | 0.18 s to reverse |
| Jump height | 0.38 BH tap to 0.99 BH held [C] | 1.4–1.9 BH | 0.74–1.82 BH | — |
| Airtime, held jump | 0.84 s (0.51 up, 0.33 down) [C] | 0.7 s standing | — | — |
| Coyote / buffer | 0.1 s / 0.15 s | — | 6 frames (0.1 s) / 9-frame chain window | 0.1 s / buffered |
| Fall vs rise gravity | 1.7×, 2.5× after release, 0.5× at apex | release ÷ 4 above 20 u/f | — | half at apex when held |

## The hero's animation today, read closely

Each item is computed from the code [C].

1. **The stride is distance-locked but the legs are too short for it.** `RUN.stride = 2.0` m per cycle and `thigh = 40°` ([proto/hero/index.ts](../../src/proto/hero/index.ts)). A 0.36 m leg swinging ±40° moves the foot 0.46 m relative to the hip, but the body travels 1.0 m per step. The sine drives both halves of the cycle the same, so there is no planted phase: the feet slide at roughly twice their own speed.
2. **Two phases fight.** [avatars.ts](../../src/player/avatars.ts) bobs `inner` by `|sin(phase)| · 0.09` with `phase += dt · (4 + 1.6 · speed)`, independently of the hero's step phase. At walk it bounces 4.1 times a second against 5.6 steps, at sprint 6.1 against 9.5. Its squash (`|cos| · 0.04`) runs on the same unsynced phase.
3. **Three leans stack, all around one pivot above the soles.** `inner` pitches forward 0.16 rad with speed ([avatars.ts](../../src/player/avatars.ts)). The whole avatar pitches up to 0.35 rad toward acceleration ([feel.ts](../../src/features/feel.ts), `leanK 0.022` rad per m/s², so it saturates at 16 m/s²). The hero's body bone rolls 4° per step.
   - The pitch pivot is the avatar origin, 0.45 m above the soles. At the combined 0.51 rad the feet swing about 0.22 m back and lift 0.06 m, and the face moves about 0.4 m forward.
   - Boogle reaches walk speed in 0.08 s, so a start is a 0.08 s burst of 70 m/s². The lean jumps to its cap and drops back within about 0.15 s, a nod of the whole skittle. A brake (115 m/s²) rocks it back the same way.
4. **The air pose is one pose.** A single `airborne` pose (arms up and out, one knee tucked) is eased in over 0.1 s. Takeoff, apex, fall and landing look the same, and the landing relies on the capsule's squash spring alone.
5. **Remote players get the same thing.** Speed comes from interpolated position, airborne from the `s` flag ([net.ts](../../src/netplay/net.ts)), and `feel.ts` already estimates vertical speed and acceleration from the smoothed position. Every fix below that uses only speed, vertical speed, acceleration and the facing-vs-velocity angle works for remotes with no new presence.

## What this means for Boogle

Starting values for a playtest, behind flags on `?proto=hero` (Local, render-only) unless a recommendation says it touches the controller. Each names the [DESIGN.md](../../DESIGN.md) principle it serves. The order is the order to try them.

1. **Lean from the body bone, small and short, and bank into turns.** For the hero skin, stop pitching the whole avatar: zero `inner.rotation.x` and the `feel.ts` pitch, and put the lean on the `body` bone, so it pivots 0.52 m up and the feet stay planted. Three terms:
   - **Speed lean:** 0.6° per m/s, capped at 6° (3.4° at walk, 5.7° at sprint): upright enough that the face stays the read.
   - **Acceleration kick:** feed acceleration into a spring (`springStep` in [motion.ts](../../src/render/motion.ts), about 3 Hz, ζ 0.45) rather than setting the angle, so a start gives one forward dip of about 8° and a brake one rock back of about 12° that settles in about 0.3 s. Clamp the acceleration fed in to ±25 m/s² so starts and stops differ in direction, not in size.
   - **Bank:** roll toward lateral acceleration, `0.4 · atan(a_lat / 18)`, capped at 10°, pivoting at the soles. This term may tip the whole figure, because a bank reads as a turn.

   Keep the capsule's current lean for non-hero avatars. *Smallest prototype:* `?proto=hero&lean=bone` against `&lean=old`, with `/look` motion sheets of a start, a stop and a figure-eight. *Gut question:* does it look like the hero leans, or like the hero tips over? Serves 1 (moving around is a toy).

2. **A stride that grows with speed, and planted feet.** In [proto/hero/index.ts](../../src/proto/hero/index.ts):
   - **Stride:** replace the fixed `RUN.stride = 2.0` with `stride = 0.566 · v^0.6` m per cycle (Alexander, hip 0.36 m): 1.59 m at walk, 2.19 at sprint, 0.57 m at 1 m/s.
   - **Duty factor:** give each foot a stance phase of `DF` of the cycle, about 0.5 below 1.5 m/s, 0.35 at walk and 0.25 at sprint. During stance, pin the foot in world space (Little Polygon) and solve the thigh angle from the pin with `asin(dx / 0.36)`; the 9 cm shin needs no IK.
   - **Swing:** move the foot on Little Polygon's cubic arc, lifted 0.10 m at walk and 0.14 m at sprint, landing at the rest spot plus 0.15 s × velocity.
   - **Thigh range:** at these strides the stance sweep is about ±50°, so raise `RUN.thigh` to 50–55.

   Remotes advance phase by distance as now. *Smallest prototype:* `&stride=alex` against today's, with a `/look` motion sheet from the side at walk and sprint, checking the feet for slide. Serves 1.

3. **Lock bob, squash and roll to the steps.** When the hero skin is on, the skin's `animate` sets `inner.position.y`, `inner.scale` and the roll itself, from its own phase, overriding the bob in [avatars.ts](../../src/player/avatars.ts).
   - **Bob:** two bounces per cycle, lowest at each foot contact and highest mid-flight. Amplitude 0.04 m at walk and 0.07 m at sprint (0.11–0.19 leg lengths), scaled by `min(1, v/1.5)`.
   - **Squash:** 5 % volume-preserving at each contact (stretch 3 % at mid-flight).
   - **Roll:** toward the planted foot, 4° at walk to 6° at sprint, once per cycle (Little Polygon's half-frequency roll).

   *Smallest prototype:* part of `&stride=alex`. Serves 1.

4. **Gaits with hysteresis, and a scramble.** Four gaits:
   - **Idle** below 0.3 m/s: the current sway, feet planted.
   - **Shuffle-walk** at low stick tilt: DF 0.55 to 0.6, no flight, a small bob. Switch up to the run above 1.8 m/s and back down below 1.3 m/s, around Fr 0.5 (1.3 m/s at Earth gravity, 1.8 at the game's), with hysteresis as SM64 has at 22/18.
   - **Run** at walk speed.
   - **Scurry** at sprint: arms pumping higher, knees tucked more.

   When sprint starts, play Toyful's scramble: the cycle at 1.4× rate for 0.25 s and 3–4 dust puffs from `emit`. For your own avatar, drive the cycle rate from `max(stick tilt × top speed, speed)` as SM64 does, so the legs answer the stick on the frame it tilts. Remotes use speed; their ramp is only 0.08 s anyway. *Smallest prototype:* `&gaits=1`. Serves 1 and 10 (a scramble is funny).

5. **A skid pose, from motion alone.** When the angle between facing and horizontal velocity is over 100° and speed is over 4 m/s, on the ground, show a skid:
   - The body bone pitched back 15°, the leading foot planted forward, both arms flung forward and out 50°.
   - Dust as `feel.ts` already emits; hold the pose until speed falls below 2 m/s or facing and velocity agree within 60°.

   The SM64 thresholds scaled to Boogle: 100°, and half of top speed. Remotes compute the same from yaw and smoothed velocity, so no presence is needed. Don't slow the brake (115 m/s²): Insomniac's stated direction is faster transitions, players disliked the old games' long skids [S], and the pose can sell the weight on its own. *Smallest prototype:* `&skid=1`, with a `/look` sheet of a sprint reversal. Serves 10.

6. **More air control.** Raise air acceleration in [physics.ts](../../src/physics/physics.ts) from 14 to 35 m/s² (0.5 of ground; Celeste uses 0.65) so a jump can be steered onto a mushroom or a friend, as Miyamoto accepted for stomping. Facing in the air already follows the stick. It touches the controller for everyone, so test it as `?air=35` on any page first, comparing 25, 35 and 45 on the mushroom chain and the lighthouse steps. *Gut question:* can you land where you meant to? Serves 10 (it makes landing on friends easy).

7. **Air poses keyed by vertical speed, starting on an extreme.** Replace the single `airborne` pose with four:
   - **Takeoff** (vy > 3): stretched, arms up 30°, legs trailing. Reached in 2 frames (ease 0.03 s), so the first frame is already the pose and no anticipation delays the jump.
   - **Apex** (|vy| < 1.6, the same band as `JUMP.apexSpeed`): knees tucked 60°, arms out 70°.
   - **Fall** (vy < −3): legs reaching down, arms up and out with a 2.5 Hz flutter of ±8°.
   - **Land:** the squash spring already takes the hit; add knees bent 45° and arms down for 0.12 s. Leave it the moment the stick moves (blend 0.05 s), Cooper's control-return frame.

   All come from vertical speed, which `feel.ts` already estimates for remotes. *Smallest prototype:* `&airpose=1`, with a `/look` motion sheet of one held jump. Serves 1.

8. **The second jump and glide need their own poses, and a redirect.** Three changes for [src/proto/moves/index.ts](../../src/proto/moves/index.ts):
   - **Redirect:** on the second jump, turn horizontal velocity 70 % of the way toward the stick (the side flip and cap-throw rule: the stick wins in the air). Keep +6.0 m/s up.
   - **Flip:** a forward flip of the body bone, 360° over 0.35 s with knees tucked. The jump's height already reads, so the flip is for joy (Astro's model).
   - **Glide:** arms straight out, the body bone pitched 15° forward, legs dangling with a 3 Hz kick, and at least 4 m/s of forward speed while gliding, so it travels instead of parachuting.

   Remotes see the second jump as vy rising by more than 4 m/s while airborne, and the glide as an airborne fall held between −3.5 and −4.5 m/s for over 0.15 s: no presence needed. *Smallest prototype:* the existing `&jump2=1&glide=1` page with these poses when `proto=hero`. Serves 1.

9. **Sprint long jump: a new move on existing buttons.** In [src/proto/moves/index.ts](../../src/proto/moves/index.ts), a jump taken while sprinting over 8.5 m/s becomes a long jump:
   - **Launch:** vy 5.0 m/s, horizontal speed × 1.35 (capped at 13 m/s).
   - **Gravity:** 0.6× for the whole jump, SM64's halved long-jump gravity softened.
   - **No second jump after it,** Hat Kid's rule, so it isn't a super-jump.
   - **Pose:** the body bone pitched 35° forward, arms swept back, legs together.

   About 1.2 m of rise, 0.93 s in the air and about 12 m of travel [C], against about 8 m for a plain sprint jump (0.84 s at 9.5 m/s). *Smallest prototype:* `&long=1`. *Gut question:* do you sprint-jump everywhere now? Serves 1 and 10 (it ends in a skid or a splat).

10. **Skid side flip.** A jump during the skid state (rec 5):
    - **Launch:** vy 1.35× the normal jump (10.3 m/s, about 3 m of rise held [C]; SM64's side flip is 1.48× its jump), facing snapped to the stick, 3 m/s along it.
    - **Pose:** a 360° roll about the body's forward axis over 0.6 s.

    It needs the skid pose first, so remotes need rec 13. *Smallest prototype:* `&sideflip=1`, behind `&skid=1`. Serves 10.

11. **Slam on the bump button in the air.** Bump (RT, V) does nothing in the air today. When airborne with the ball out of reach:
    - **Wind-up:** hang 0.18 s (cancel gravity, rise 1 m/s, tuck and spin 360° on the body bone).
    - **Drop:** fall at 20 m/s (`MAX_FALL`).
    - **Land:** squash 0.5, a ring of 14 dust puffs, and a 3 m/s upward kick to the ball and loose physics toys within 2 m.

    That gives the toys a new thing to do: the series' wrench slam and Mario's ground pound, as a toy verb. The fall and landing can be derived from motion; the wind-up hang can't (rec 13). *Smallest prototype:* `&slam=1`, wrapping the action with `wrapAction('bump', …)` from `onStart`. Serves 2 (physics toys first).

12. **Few big secondary parts.** Toyful's lesson: only what the camera reads.
    - **Mittens:** lag the forearms on a spring (about 4 Hz, ζ 0.4), so a stop throws the hands forward and a start trails them.
    - **On the back:** whatever rides there (the ball on your back, `carryPosition` in [player.ts](../../src/player/player.ts); the haul bundle) lags in pitch, about 0.15 s with one overshoot, Clank-style.
    - **Hat:** the castaway outfit's brim bounces 2–3° on each foot contact.

    Nothing smaller than a hand. *Smallest prototype:* `&overlap=1` in [proto/hero/index.ts](../../src/proto/hero/index.ts). Serves 1.

13. **One small presence field for moves motion can't show.** Add `mv: [kind, msLeft]`, a new key under the same stale-repeat and append-only rules as `fl` in [feel.ts](../../src/features/feel.ts). It covers kinds 0 long jump, 1 side flip and 2 slam wind-up, and is `null` when idle. Everything else (skid, gait, double jump, glide, air poses) stays derived. It costs a couple of numbers at 20 Hz for a few hundred ms per move. Add it only when recs 9–11 graduate from a solo prototype. Serves 8 (drop-in: everyone sees the same move).

14. **A pose library from Blender, blended by code.** The Toyful and Overgrowth split, for when the code-posed cycle is right but its look isn't. Author about 10 single-frame poses as clips in [hero-rig.py](../../assets/src/hero-rig.py):
    - run contact left and right, and passing;
    - scurry contact;
    - takeoff, apex tuck, fall reach and land crouch;
    - skid and glide.

    Code samples them by phase and vertical speed (rec 7) instead of hand-written angles, and keeps the stance-phase foot pin (rec 2) on top. *Smallest prototype:* only the two run contacts plus passing, against the code cycle, with a `/look` side-by-side. Serves 1. Small and readable: the pose numbers move from code into the asset script.

15. **Keep the controller's speed; measure against the guest.** Don't add an acceleration ramp: Boogle's 0.08–0.14 s already matches Celeste and beats SM64's 1.6 s, and Ratchet's improvement was faster transitions, not slower physics. To compare feel side by side, the SM64 guest by the cave runs the reference controller in the same island (its numbers are in the table above). *Smallest prototype:* a `/look` motion sheet of the hero and the guest doing the same sprint, reversal and jump. Serves 1.

### The five to try first

1. **Lean from the body bone** (rec 1): `?proto=hero&lean=bone`. This is the owner's complaint, and it is cheap.
2. **Stride and planted feet** (rec 2) with **bob locked to steps** (rec 3): `&stride=alex`. This is the "walk/run isn't up to par" complaint.
3. **Air poses** (rec 7): `&airpose=1`.
4. **Skid pose** (rec 5): `&skid=1`.
5. **Air control 35** (rec 6): `?air=35`, the one controller change.

## Not verified

- **Every Ratchet number:** run speed, acceleration, turn rate, jump and double-jump heights, glide fall speed, long and high jump values, Phantom Dash distance, blend times. No developer talk, interview or frame analysis found gives them. Thompson's GDC 2022 talk and Grossman and Vasquez's GDC 2015 Sunset Overdrive locomotion talk are members-only; their content is unknown.
- **The older Ratchet move inputs** (crouch-jump high jump, crouch-while-running long jump, strafe flips, hyper strike) come from fan wikis and speedrun guides seen only in search summaries; those pages refused fetching. **Rift Apart's dash and hoverboot timings** are unknown.
- **Odyssey's** ground acceleration, braking rate and ground-pound timings are not on the wiki pages read; the "Odyssey Movement Data" spreadsheet they cite wasn't found.
- **SM64 air control** (forward/back drag and a capped sideways drift): only the 0.15 units/frame² air acceleration figure was seen. **SM64 Mario's height** of about 160 units is assumed, not checked.
- **A Hat in Time:** Hat Kid's speeds and jump heights; the −750 gravity is from a community console guide.
- **Astro Bot's** hover length ("a couple of seconds") is from a guide. **Fall Guys'** "Minions skeleton" claim is from a search summary; no Fall Guys animation talk was found.
- **Running duty factors** of about 0.35 at a jog and about 0.25 at a sprint are typical textbook values, not fetched; only "under 0.5" was seen. **Classical cartoon timings** (a walk on twelves, runs on sixes and fours) were not checked against Williams.
- **The claim that Ratchet, Astro and the Fall Guys run nearly upright** is from memory of footage, not measured; rec 1 rests on the pivot and statics argument [C], not on it.
- **Swink's often-quoted 100 ms response threshold** wasn't found in the articles read.
- **Alexander's relation** is applied far outside the range it was fitted on (Froude 9–26). It sets the trend (stride ∝ v^0.6), not exact numbers; the playtest decides.
