# Characters: what reads, what feels good, what it costs on the web

_1 November 2026. Research for the open character-track question in [docs/proposals/boogle-2.md](../proposals/boogle-2.md) (question 7), covering the player and The Boogler. Sources are developer interviews, studio blogs, official specs and the three.js r187 source in `node_modules`. Many of the named games have never published how they build characters, and where only forum guesses exist this report says so. Budgets marked "starting point" are my proposals and haven't been measured on an iPad. Research only: no art, no decisions._

## Summary

1. Groups read each other by **silhouette first, colour second, face third**. Valve checked every Team Fortress 2 class as a flat black shape, and Boogle's capsule and The Boogler already pass that test against each other.
2. The party-game hits (Fall Guys, Among Us, Gang Beasts, Human Fall Flat) have one body shape for everyone. Players tell each other apart by colour, pattern and one costume slot, and the plain body is what lets the cosmetics carry identity.
3. Proportions come from the comedy. Fall Guys chose stubby legs because they trip, big arms because they flail, and a high centre of mass so falls are funny. Gang Beasts' look grew out of its physics.
4. Cute is measurable. A round face, a big forehead and big low-set eyes increase how cute something looks (Glocker 2009). Boogle's eyes sit high on a body that is all head, which is already the bean form.
5. Animation comes in three proven kinds. Toyful's pose-and-curve (about 50 poses for 6 characters, made by 2 people), physics-driven puppets (Landfall, Gang Beasts) and procedural springs on code shapes (Boogle today).
6. Full active ragdolls cost input reliability, CPU and per-limb network state. Peak is believed to send only hands and feet and let a spring-pulled body follow. That matches Boogle's "events, not poses" rule.
7. Faking states pays off most. Skids, spins, a "scramble" on reaching run speed and landing flourishes change no movement, and squash and stretch is "almost impossible to overdo" on small screens.
8. Skinning is cheap in three.js r187 WebGPU. Bones go in a uniform buffer (1024 at the spec-default 64 KiB), with 4 influences per vertex. Morph targets cost a loop over every target per vertex, so keep faces to a few shapes.
9. Agents can drive Blender: headless (`blender -b -P script.py`, `bpy.ops.export_scene.gltf`) or live through Blender MCP. Reviewers find it reliable for primitives and materials and weak at organic sculpting and rigging, so script parametric models and leave sculpting to people.
10. The cheapest proof is a code-only `?proto=bean`: today's capsule with the chosen proportions, two stubby spring feet, flailing nub hands, an eyelid blink and a hat socket. Prototype The Boogler's new animation the same way, all before any Blender work.

## What Boogle has today

- **Player** ([src/player/avatars.ts](../../src/player/avatars.ts)): a capsule 0.9 m wide and 1.7 m tall in one of eight colours, with two sphere eyes and pupils at 0.95 m. The face is high on a body that is all head. There are no limbs, and a name label sits above. The camera orbits at 6.5 m by default (4 or 10 m on R3), so most of the time you see other players from 5–20 m away.
- **Motion** ([src/features/feel.ts](../../src/features/feel.ts)): every avatar has a render-only spring layer, with landing squash scaled by fall speed, a take-off stretch and lean toward acceleration. Canned flops (splat, stomp, bonk) sync as one presence field `fl`. That is the "events, not poses" pattern from [character-controller-feel.md](character-controller-feel.md).
- **The Boogler** ([src/boogler/boogler.ts](../../src/boogler/boogler.ts)): a lavender ellipsoid 1.6 m wide and 0.54 m tall, with a painted face texture in six moods, sphere hands and feet, and a black top hat about 1.5 times his height. The hat has its own pivot, so it lags, wobbles and gets crushed flat. His silhouette (wide, low, one tall vertical) is the opposite of the players' (narrow, tall, rounded), which is the main readability job done.
- **Coming:** som (a personal coin) is "spent on looks" ([boogle-2.md](../proposals/boogle-2.md)), so cosmetics will exist. Hauled logs ride on the character's back ([haul.md](../game-design/haul.md)). The model pipeline is planned as glTF with meshopt plus KTX2 ([open-world.md](../plans/open-world.md), section 2). An asset-pipeline plan is being written in parallel and may land as `docs/plans/asset-pipeline.md`.

## Findings by source

### Readability and silhouette

- **Team Fortress 2** ([Mitchell, Francke and Eng, NPAR 2007](https://www.cs.princeton.edu/courses/archive/fall07/cos597B/papers/mitchell-team-fortress.pdf)). Players must identify each other "very quickly at a variety of distances". The nine classes were checked as pure black silhouettes during concept work, and body proportions, footwear, hats and clothing folds were chosen to make each one unique. Interior detail echoes the silhouette, high-frequency detail is left out, and silhouettes are lifted with rim light rather than dark outlines. Team colour sits on a muted base with small saturated areas. Hats are named as a silhouette tool, which matters for Boogle's cosmetics.
- **Among Us** ([Game Developer on the early concepts](https://gamedeveloper.com/art/early-i-among-us-i-character-concepts-depict-the-birth-of-the-bean)). Innersloth "settled pretty fast" on a bean with stubby legs, a backpack and a faceless visor; six sketches were the whole concept phase. The visor works as the face: replace it and the character's expression changes. When Innersloth added colours it said it wanted colour-blind players to still tell crewmates apart ([Screen Rant](https://screenrant.com/among-us-update-new-colors-crewmates-impostors-innersloth/)). The list has since grown to 18 colours, plus hats, so colour alone isn't the only key.
- **Splatoon** (fan wikis only, e.g. [Inkipedia](https://splatoonwiki.org/wiki/Player_Settings)). Opposing teams always get contrasting ink pairs, and a character's hair is their ink colour. I found no Nintendo interview on readability. The useful idea is that the identity colour sits on the part of the body that moves and is seen most.

### Shape, proportion and faces

- **Fall Guys** ([ESPN interview with Joe Walsh and Rob Jackson](https://www.espn.com/gaming/story/_/id/29734365/meet-minds-fall-guys-costumes)). The best documented case:
  - Proportions came from the comedy. Short legs "trip over" easily, big arms flail, the centre of gravity is high and the body is bouncy so ragdoll impacts are funnier. The team studied clips of real people falling.
  - The look is a vinyl toy, plain enough to take big prints and mascot suits.
  - Colours were drawn from sweets and food.
  - Customisation has four slots (face, colour and pattern, top, bottom), which already makes thousands of combinations.
  - Rendering about 60 characters at once forced the team to scale customisation back. Every costume has to be "funny enough to add".
- **Kirby** ([Wikipedia, citing Iwata](https://en.wikipedia.org/wiki/Kirby_(character))). He is a circle "so that anyone would be able to draw him", and round set him apart from angular heroes. Drawability is a real goal for a game whose players will doodle their friends.
- **Human: Fall Flat** ([Fanatical interview with Tomas Sakalauskas](https://www.fanatical.com/en/blog/human-fall-flat-stumbling-upon-a-physics-based-gem)). Bob is a clip-art figure, abstract so he stays out of the player's way. Painting him in your own colours makes players feel they are Bob ([PC Gamer](https://pcgamer.com/seven-ways-human-fall-flat-will-make-you-smile)).
- **Big Walk** ([But Why Tho preview](https://butwhytho.net/2026/03/big-walk-preview-house-house/); [Kotaku interview](https://kotaku.com/the-creators-of-big-walk-break-down-the-goty-contenders-development-puzzles-and-stunning-ending-2000725133)). House House again uses simple round bodies with legs and no mouths: circles on the head move with your voice. Players pick each other up, sit and slide. That is a face driven by events, not by a rig.
- **Untitled Goose Game** ([Game Developer, Road to the IGF](https://www.gamedeveloper.com/game-platforms/road-to-the-igf-house-house-s-i-untitled-goose-game-i-); [Shacknews](https://www.shacknews.com/article/107642/untitled-goose-game-interview-house-house-dev-nico-disseldorp-talks-being-a-jerk)). Low-poly, flat-coloured, untextured models. The goose's verbs are what a goose does (honk, run, neck, flap), and the team kept adding ways for it to be funny. Character design followed from the verbs.
- **A Short Hike** ([GDC postmortem](https://gdcvault.com/play/1026613/Independent-Games-Summit-Crafting-A); [80.lv summary](https://80.lv/articles/gdc-a-short-hike-postmortem)). Robinson-Yu tested how few pixels a 3D world needs to stay readable, using low-poly characters, a reference-sampled palette and custom light ramps. Pixel size is a player setting because some disliked it. Small characters on a big island hold up when the palette and lighting do the work.
- **Cuteness** ([Glocker et al. 2009, Ethology 115(3)](https://repository.upenn.edu/cog_neuro_pubs/11)). Raising "baby schema" features in photos (round face, high forehead, big eyes) raised cuteness ratings. Lorenz's 1943 idea now has experimental support. For Boogle: a big head (or all head), with eyes low enough to leave a forehead, reads as cute.
- **Animal Crossing, Pikmin.** I found no primary source on villager proportions or Pikmin's colour-coding, so neither is used as evidence here.

### Colour and cosmetics for groups

- Fall Guys has four slots, with colours and patterns as separate unlocks; over 300 unlockables at the time of the interview ([ESPN](https://www.espn.com/gaming/story/_/id/29734365/meet-minds-fall-guys-costumes)). Gang Beasts has full-body costumes plus hair, hats and accessories ([CogConnected review](https://cogconnected.com/review/gang-beasts-review/)). Wobbly Life lists over 500 clothing items on one simple body ([App Store](https://apps.apple.com/us/app/wobbly-life/id6764310415)).
- **Roblox** publishes the most formal spec of any of these ([body specifications](https://create.roblox.com/docs/art/characters/specifications); [dynamic heads](https://create.roblox.com/docs/art/characters/facial-animation/creating-basic-heads)):
  - 15 parts and 16 bones, with up to 37 optional extra bones;
  - at most 4 bone influences per vertex;
  - about 10.7k triangles for a whole body (4k of them for the head);
  - an outer "cage" per part, so layered clothing can wrap any body;
  - face rigs: under 50 face bones recommended, driven by FACS poses.

  That's the ceiling for a user-generated-content platform, far beyond what Boogle needs. The lesson is the cage idea: fix the attachment points and the outer envelope, and cosmetics fit every body.
- **Pattern:** one body shape, a palette that includes value and pattern differences (not just hue), and one or two big silhouette-changing slots (hat, back). Boogle's eight colours differ mainly in hue, so a coral and an orange player, or a teal and a blue one, will blur at 15 m in sun or for a colour-blind player. Hats and patterns fix that better than more colours.

### How characters move

- **Toyful Games, Very Very Valet** ([blog](https://www.toyfulgames.com/blog/character-animations)). The practical template for a small team:
  - Every animation is single-frame poses joined by curves: a 30-frame run is 2 key poses and a curve, and the cast totals about 50 poses for 6 characters, made by 2 people.
  - Frame-by-frame was dropped because it felt "loose, robotic".
  - Squash and stretch was pushed past excessive and then backed off.
  - Secondary motion was cut because it didn't read from the game camera.
  - An emote layer uses blend shapes, particles and dynamic eyes (lid shape, pupil).
  - States are faked: a run "scramble", a skid, a spin on fast stick rotation and a landing flourish.
  - Rigs go from Blender (Rigify) to Unity.
- **Landfall** ([Game Developer](https://www.gamedeveloper.com/design/how-landfall-games-finds-the-fun-in-physics-engines)). The physics puppet: torque on ragdoll legs from animation curves, a step handler, a standing handler that pushes the head up to a height, and a balance rule ("if both feet are in front of the body's centre of mass one of them needs to move backwards"). It's modular: legless snakes drop the standing script. The team accepts less polish as the style.
- **Gang Beasts** ([MCV interview](https://mcvuk.com/business-news/when-we-first-started-we-didnt-really-know-what-we-were-doing-how-gang-beasts-became-an-international-success/)). There was no animator, so the team used physics, and the physics dictated the character design. The game was rebuilt three times, and one engine update broke all the physics.
- **Active ragdoll mechanics** (developer devlogs, not studio sources: [jacasch on Medium](https://medium.com/@jacasch/balancing-of-active-ragdolls-in-games-367f146b25fb); [jacasch on itch.io](https://jacasch.itch.io/real-guys-wear-ties/devlog/85804/active-ragdoll-system)). An animated rig sets target poses that a physical rig chases with joint forces. Balance comes from external forces on the pelvis or chest, and a fall starts when the centre of mass leaves the feet.
- **Peak** ([Unity forum thread](https://discussions.unity.com/t/how-does-character-controller-work-in-peak-game/1683399); unconfirmed). The most specific guess is that the player is controlled as hands and feet, and the visible body is a passive ragdoll pulled toward poses by springs. Another poster thinks it's mostly keyframed. Neither claim is confirmed, but the first is the shape that fits a networked game: sync four points and let every client's springs do the rest.
- **Lethal Company** ([fan port notes, Steam Workshop](https://steamcommunity.com/sharedfiles/filedetails/?id=3091530697)). People porting the player model describe its animations as "very simple". It's a low-poly hit whose comedy comes from voice and situation, not animation.
- **Second-order dynamics** (via [character-controller-feel.md](character-controller-feel.md)). A spring with a frequency, a damping and an initial response is how code-driven bodies get inertia and overshoot. Boogle's feel layer already uses one. Substep it when `dt` is large.
- **Spring bones** ([three-vrm VRMC_springBone](https://pixiv.github.io/three-vrm/docs/interfaces/types-vrmc-springbone-1.0.VRMCSpringBone.html); [VirtualCast wiki](https://wiki.virtualcast.jp/wiki/en/vrm/setting/spring)). This is the web standard for hair and costume sway: a Verlet chain per joint with sphere colliders. Two tips: reset the velocity after sudden pose changes, and clamp `dt` (about 0.05 s) so a tab switch doesn't explode it. Copy the idea for hats, antennae and The Boogler's jiggle; the library isn't needed.

### Rigging and the web pipeline

- **three.js r187 skinning** (`node_modules/three/src/nodes/accessors/Skinning.js`). Bone matrices go in a uniform buffer while `bones × 64 B` fits `maxUniformBufferBindingSize`, which is 64 KiB by spec default, so 1024 bones. Beyond that they move to a bone texture. The shader reads exactly 4 influences per vertex (`skinIndex.xyzw`). Bone count is not the constraint for Boogle. Draws are: skinned meshes don't instance, so each avatar's skinned mesh is its own draw, plus one more in the shadow pass.
- **three.js r187 morph targets** (`Morph.js`). All targets of a geometry are packed into a `DataArrayTexture`, one layer per target, and the vertex shader loops over every target for every vertex, skipping only zero-weight ones at runtime. Cost grows with the target count, so a face built on 50 FACS shapes is the wrong design for 8 players on an iPad, while 4–8 shapes is fine. Skinning and morphing combine (there is an official example).
- **Blender's glTF exporter** ([Khronos glTF-Blender-IO docs](https://github.com/KhronosGroup/glTF-Blender-IO/blob/main/docs/blender_docs/scene_gltf2.rst)):
  - influences default to 4 per vertex (8 optional; "all" breaks many viewers);
  - shape keys export as morph targets, and a bone-driven shape key needs the mesh to be a direct child of the armature;
  - animation modes: Actions (default; the active action plus actions stashed in NLA tracks, unstashed ones skipped), Active Actions merged, NLA Tracks, Scene;
  - "Deformation bones only" bakes away control bones, which is the switch that makes a Rigify rig web-sized;
  - compression is Draco or meshopt; Boogle's plan prefers meshopt.
- **Headless Blender** ([Jake Lazaroff's TIL](https://til.jakelazaroff.com/blender/export-a-blender-file-to-glb-from-the-command-line/); [batch gist](https://gist.github.com/NanoDano/8bcdfee0effc3a258c9a8eca5f1c6a84)). `blender -b file.blend --python-expr "import bpy; bpy.ops.export_scene.gltf(filepath='out.glb')"`, or `blender --background --python build.py -- args`. A model can be a checked-in Python script that builds the mesh, rig and actions from numbers, so it can be diffed, reviewed and rebuilt by an agent.
- **Blender MCP** ([ahujasid/blender-mcp, now "MCP for Blender"](https://github.com/ahujasid/blender-mcp); [review](https://hysenlabs.com/projects/ahujasid-blender-mcp)):
  - Tools: `execute_blender_code` (any Python in the live session), `look` (renders the viewport, a camera, several angles or animation frames), `get_scene_info`, and asset search and AI generation (Poly Haven, Sketchfab, Tripo, Meshy and others).
  - The add-on listens on an unauthenticated TCP socket (localhost:9876), so keep it local. A safe mode screens risky scripts.
  - Complex requests time out, so work in small steps.
  - A reviewer found it reliable for primitives, placement, multi-object scenes and basic materials, but weak at organic geometry, precise dimensions and rigging.

## What this means for Boogle

### Holds for every direction

- **Keep the two silhouettes opposite.** Players are tall, narrow, rounded and all head; The Boogler is wide, low and topped by one tall vertical. Valve's black-shape test is the acceptance test for any concept sheet: fill both characters black at 15 m, and you must still tell player from Boogler and see which way each faces.
- **Identity:** colour first, plus one silhouette slot (a hat on the head socket) and one value or pattern difference. Revisit the eight colours for value spread and colour-blind pairs before adding more. This serves "Understandable at a glance" for players and is where som gets spent.
- **Proportions follow the slapstick** (DESIGN.md 10), as in Fall Guys: a high centre of mass, tiny feet that can visibly trip, nub hands that flail, and big eyes low enough to leave a forehead.
- **Sync events, never poses.** Whatever drives the body, the wire stays at today's position, velocity and `fl` flops. Each client's springs or poses perform them. This rules out per-limb ragdoll sync.
- **Attachment sockets are the contract**: `head` (hats), `back` (the haul bundle), `handL`/`handR` (held items, the ball), `face` (eyes and mouth). Code shapes and a future glTF must expose the same sockets, so cosmetics and carried things survive a model swap. This is Roblox's cage idea at Boogle's size.
- **Faked states are the animation budget.** Skid, scramble, spin, landing flourish, blink, look-at. Each is render-only, costs no wire, and works on code shapes and rigged models alike.

### Direction A: Toy bean, all code

- **Player:**
  - Silhouette: today's capsule, slightly pear-shaped (wider low, for weight).
  - Limbs: two stubby foot ellipsoids and two floating nub hands with no arms (Rayman-style), placed every frame by code.
  - Face: eyes with lids (a scaled half-sphere for blinks and moods) and a mouth decal for emotes.
- **The Boogler:** unchanged shape and hat. His feet step instead of slide, his hands gesture while he talks, and his body jiggles on a spring.
- **Animation:**
  - Procedural throughout. Feet use the "step when stranded" rule with ground snapping.
  - Hands swing opposite to the feet, flail while airborne and reach toward targets.
  - Second-order springs drive the body (already built) and secondary parts (hat, hands), with faked states on top.
- **Code vs model:** all code. A cosmetic is a small code-built or glTF prop on a socket.
- **Cost:** low, about 2–4 agent sessions for both characters. It extends `avatars.ts`, `feel.ts` and `boogler.ts` with no pipeline and no new dependencies.
- **Risk:** the ceiling. Primitives look like a prototype next to authored art, and a painted or built world may outgrow them. Floating hands are also an acquired taste. It is also the most reversible option, since everything it adds (sockets, springs, faked states) carries over to B and C.

### Direction B: Vinyl toy, modelled and lightly rigged

- **Player:**
  - Silhouette: a modelled bean like Fall Guys, with short legs, short arms and an all-head body.
  - Rig: about 15–20 deform bones (root, hips, spine, head, 2 × arm (2) + hand, 2 × leg (2) + foot, a hat bone).
  - Face: 4–6 morph targets (blink, smile, O, frown), or a face texture swap like today's Boogler.
- **The Boogler:** modelled as the same blob, with a body bone that squashes, two hand chains, feet, a hat bone and his six moods as morphs or textures.
- **Animation:**
  - Toyful's pose-and-curve: about 15–25 single poses per character (idle, run A/B, jump, fall, land, carry, push, wave, flop and emotes), blended by code curves rather than baked clips.
  - The feel springs keep driving squash, lean and the hat.
  - Feet get a short IK reach to the ground on slopes.
- **Code vs model:** shape and rig come from Blender (sculpt or scripted), poses are glTF actions, timing and blending are code.
- **Cost:** medium to high. It needs concept sheets, the asset pipeline (`npm run assets`, meshopt and KTX2) and a GLTF loading path in the avatar module, then one model and rig per character and a pose set. Agents can script the export and the pose-blend code; the sculpt and the rig weights want a person, or an artist's day.
- **Risk:**
  - The pipeline has to exist first.
  - Rigging is the step the Blender MCP review says agents do worst.
  - Every cosmetic must fit a skinned body.
  - Mixed builds: an old tab draws the capsule and a new one the model, which is harmless because the wire doesn't change.

### Direction C: Wobble puppet

- **Player:**
  - Silhouette: a bean body with dangly, longer arms and short legs (Gang Beasts or Human: Fall Flat).
  - Rig: a code or light glTF rig whose limbs are spring chains (Verlet, like spring bones), pulled toward a few target poses.
  - Face: as in A or B.
- **The Boogler:** his whole body is a soft-body jelly, a few spring points or a vertex wobble in TSL, with arms as spring chains. Riding him squashes the jelly.
- **Animation:**
  - Peak's model as reported: the controller owns the body point, and the hands and feet get targets (plant, swing, grab).
  - A spring-chain body follows on each client, so flops and bonks become real wobbles from impulses, not canned poses.
  - The physics stays the existing capsule; the limbs are render-only and never touch Rapier.
- **Code vs model:** mostly code. The mesh can be primitives (A) or a skinned model (B).
- **Cost:** medium. Spring chains and Verlet are small, but tuning them to look intentional rather than broken takes many iterations (Gang Beasts rebuilt three times).
- **Risk:**
  - It can read as jank rather than slapstick.
  - Arms that go limp argue with "carry a bundle", and hands that miss their target look wrong.
  - Remote players show different wobbles on each screen, which is acceptable because it is cosmetic.

These directions aren't exclusive. A is the trunk: sockets, spring layer and faked states survive into B or C. B changes the art; C changes how limbs move. A likely end state is B's look with C's spring limbs on top.

### Recommended first step: `?proto=bean`

A code-only prototype that proves the proportions and the feel before any concept sheet or Blender file. It serves DESIGN.md 10 and 1, takes about one agent session per bullet, and stays behind a flag as the find-the-fun steps do:

1. **Proportion knobs:** body height, width and pear taper; eye size, height and spacing; foot size; hand size and offset. They live in `__bean` for live tuning, plus three presets (current, Fall Guys-ish, chibi with a big top) so the owner can compare with `/look` stills at 4, 6.5 and 15 m.
2. **Spring feet:** two foot ellipsoids per avatar that step when stranded (stride scales with speed), snap to the ground and tuck while airborne. Remote avatars run the same code from interpolated motion, with nothing new on the wire.
3. **Nub hands:** they swing against the feet, flail in the air, rise on take-off, hold on the haul bundle and reach toward an interact target.
4. **Face:** eyelid blinks every 2–6 s, a squint on landing, wide eyes in the air and pupils that look at the nearest player or The Boogler.
5. **Hat socket:** one test hat (a beanie, and a tall hat to check silhouette) on a lagging spring pivot, copied from The Boogler's hat.
6. **The Boogler:** the same feet and hands code driving his existing limbs, plus a body jiggle spring. He keeps his shape, hat and face texture.

The playtest question: *does a friend running past at 15 m read as a funny little person, and does a flop make you laugh harder than with the bare capsule?* If yes, concept sheets start from the winning knob values. If no twice, the fix is proportions or timing, not a model.

### Rigging and pipeline constraints on an M4 iPad Pro

Starting points to measure with `npm run perf` and on the device, not measured limits:

| Item | Budget | Why |
|---|---|---|
| Player mesh | ≤ 3k triangles, 1 material (+ eyes) | 8 players + The Boogler + shadows. Roblox allows 10.7k for a whole UGC body; Boogle wants a fraction of that. |
| Deform bones | ≤ 24 per character | Uniform-buffer path (1024 max); fewer bones also means less CPU per frame for 9 skeletons. |
| Influences | 4 per vertex (exporter default) | The three.js shader reads exactly 4. |
| Morph targets | ≤ 8 per character, faces only | The shader loops every target per vertex. Body squash stays a root scale, as today. |
| Draws | 1 skinned mesh per character + sockets | Skinned meshes don't instance, and each also draws into the shadow map. Merge the body into one mesh. |
| Textures | none, or one ≤ 512 px KTX2 atlas | Vertex colour or flat material reads best from 6.5 m (Goose, A Short Hike). The colour is a material uniform, not a texture. |
| Animation | poses (glTF actions of 1–2 keys) + code curves | The Toyful model: tiny files, all timing tunable in code. |
| Export | glTF binary, deform bones only, meshopt via the planned `npm run assets` | Rigify control rigs bake away. |
| Secondary motion | code springs on sockets, not physics bodies | Render-only, Local sync kind, no Rapier cost. |

Bones never touch Rapier: the physics body stays the two-sphere capsule whatever the visible shape is, so collisions, the ball and the server's presence handling are unaffected.

### How agents could build models

- **Scripted models in the repo.** For example, a `tools/blender/bean.py` that builds mesh, armature, weights and pose actions from numbers and exports with `bpy.ops.export_scene.gltf`. Run headless, it's reviewable and reproducible, and it suits blobby primitive-based characters (metaballs or subdivided primitives with automatic weights). This is the agent's strong suit.
- **Blender MCP for looking and tweaking.** Use its `look` renders as the visual check, the way `/look` works for the game, with the socket kept on localhost.
- **People sculpt and weight-paint** a hero model when B is chosen. Agents shouldn't be the critical path for organic shape or weights.
- **`/concept-art` makes turnaround sheets** (front, side, back at the chosen proportions) as modelling reference. That's the first art step after the bean prototype picks proportions.

### Open questions for the owner

1. Which proportions win the bean playtest: a tall bean (today), a Fall Guys bean with legs, or a big-top chibi?
2. Limbs: floating nub hands (A), short attached arms (B), or dangly spring arms (C)?
3. Faces: painted textures (as The Boogler has now), modelled lids and pupils, or mouthless like Big Walk and Among Us?
4. Should The Boogler keep his exact silhouette (wide blob plus tall hat)? This report argues yes.
5. What does som buy first: hats only, or hats, patterns and a back slot?
