# Toon shading revisited: characters and environment

> **Verdict:** Three cheap `?toon=` candidates against today's look; at play distance the step barely shows, the cool shade (B) and the ink line (C) do.
> **Top recommendations:** 1. Pair B without its rim (`?toon=b&toonRim=0`) with the Odyssey-ish sea: a soft step and coloured shade, no draws, no pass. 2. Try C's line only if characters should pop at play distance; it is the one change you see at once, for about one draw per character mesh. 3. Keep the softness: the stronger bracket brings back the flattened dome turned down on 4 November.
> **Status:** superseded 10 November: the owner tried B live as the default and chose the baseline lighting ("I actually prefer the baseline"), so B, its `toon.*` tunables, the `?toon` flag and `dev/look/toon-board.ts` are removed ([decision](../decisions.md#look)). B had been picked earlier the same day; the research below is kept as it was run. Its file paths, flags and commands no longer exist on `main`.

2026-11-10. The owner's 9 November note ("we will also revisit toon shading on characters and env", recorded with the
Sunshine water call in [decisions](../decisions.md#decided)) asks for research and side-by-side boards first. It is one
look decision with the water, since both read the same sun and fill: the sea is now the Odyssey-ish preset of the new
sea ([water design](../game-design/water.md#the-sea-10-november-2026): "somewhere in the range of Mario odyssey and Mario
sunshine"). It starts from the two archived experiments: the Buddy diffuse ramp (`archive/buddy-light-ramp`,
[findings](buddy-light-ramp.md)) and the post looks (`archive/post-looks-round2`, [findings](post-look-round2.md)), and
from the earlier surveys [stylized-rendering-on-a-budget](stylized-rendering-on-a-budget.md) and
[bang-for-buck-aesthetics](bang-for-buck-aesthetics.md), which it does not repeat.

Owner calls that bind this: Buddy has **no rim light** (2 November); Buddy **kept Current** over a soft and a two-band
ramp (4 November: soft "added little", two-band "flattened his round head"); post outlines were **parked**, about 6 ms
on the M1 Max and crawling in motion (4 November); **Fresh** is every family's palette (6 November); cloud/warmth
cell 5 with surface gain .12, key 1.12, fill 3.2 (6 November). References are used by name, for the features they
show, never recreated (owner calls, "Use references by name").

## What the reference games do

Sources are labelled as in [sunshine-look](sunshine-look.md): **[V]** a primary source was checked in that or an
earlier doc here; **[I]** inferred from footage and community analysis, not a developer statement.

| Game | Characters | Environment | Ambient under the sky | Outlines |
| --- | --- | --- | --- | --- |
| **Super Mario Sunshine** | Smooth (Gouraud) light with a strong specular; not stepped **[I]** | Mostly baked vertex light; the look is colour, sun, haze and water **[I]** | Baked, flat per area; no image-based light **[I]** | None **[I]** |
| **Super Mario Odyssey** | Physically based, soft wrapped diffuse; a Fresnel sheen on Mario's cap and clothes **[I]** | Physically based with stylized albedo; per-kingdom grading **[I]** | Probes/sky light, soft; no bands to protect **[I]** | None **[I]** |
| **Wind Waker** | Two hard bands from a lookup ramp; dark lines on characters **[I]** | The same two-band ramp **[I]** | A flat per-area colour, so the bands stay crisp **[I]** | Characters only **[I]** |
| **Breath of the Wild** | Two bands on direct light, a rim only on the sun side **[S/I]** ([bang-for-buck](bang-for-buck-aesthetics.md)) | Same deferred cel pass **[S/I]** | Soft probe light added after the ramp; fog does the rest **[S/I]** | Thin, mostly none **[I]** |
| **Animal Crossing: New Horizons** | Soft wrapped diffuse and a rim on characters **[I]** | Soft, not stepped **[I]** | Soft sky light **[I]** | None **[I]** |
| **A Short Hike / Sable** | Flat colour; A Short Hike's line is "soft", Sable's fades with distance **[V]** ([stylized-rendering](stylized-rendering-on-a-budget.md)) | Same | Low-contrast flat fill | Soft or faded |

What follows for Boogle:

1. **Neither of the owner's two water references is a hard toon game.** Sunshine is smooth light on saturated colour,
   Odyssey is soft physically based light with a sheen. A "between Odyssey and Sunshine" world wants a **soft step**
   (a readable light/shade boundary with a smooth edge and some roundness kept on the lit side), not Wind Waker's
   two flat bands, which is exactly what flattened Buddy's head on 4 November.
2. **The ramp only reads if the ambient stops competing.** Every stepped game keeps its fill flat or low-contrast
   (Wind Waker's per-area colour, BotW's probes added after the cel pass). Ours is not: the frozen summer sky's
   hemisphere fill is 3.2× gain with its up colour about four times its down colour, plus the cube's image-based
   irradiance, so a round head already carries a strong top-to-bottom gradient that blurs any N·L step. A toon
   candidate here must **flatten the fill's normal dependence**, not just step the sun.
3. **The cheap stylized tools are inside the material**: the ramp and rim are arithmetic in the existing draw, and an
   inverted-hull line is one opaque draw per outlined mesh (Apple's tile GPUs reject hidden hull pixels cheaply,
   [stylized-rendering](stylized-rendering-on-a-budget.md)). A screen-space line pass is what cost ~6 ms last time.

## How it maps to WebGPU and TSL here

- **Stepped diffuse.** Wrap `PhysicalLightingModel.direct` (as `archive/buddy-light-ramp` did): let three build the
  unchanged BRDF and specular, collect this light's diffuse apart, divide out N·L and multiply by our response. Shadow
  attenuation is already in the light colour, so cast shadows join the same band. Swapping to `MeshToonNodeMaterial`
  (the old `?proto=look` lab's route, `src/debug/look-world.ts`) loses specular, PBR environment and every material's
  node patches, and needs a material clone per original; the wrapped model keeps all of them.
- **Ambient under the sky.** Wrap `indirectDiffuse`: before three applies the irradiance, add the difference between
  the hemisphere's colour at a fixed three-quarters-up weight and at the pixel's normal. That removes a share of the
  hemisphere's up/down gradient (the knob `toonFlat`) while flat sun-lit ground keeps nearly today's fill. The sky
  cube's own irradiance and the PBR specular are left alone.
- **One switch for every Standard material.** Patching `MeshStandardNodeMaterial.prototype.setupLightingModel` once
  at load reaches every Standard material, including the built-in `MeshStandardMaterial`s the renderer converts. A
  single `uniform().onObjectUpdate()` reads `userData.toonCharacter` per draw, so characters and the world can differ
  while sharing materials (the folk share theirs; no clones, no cache-key work). Water (`MeshBasicNodeMaterial` with
  its own sun and fill), sky, unlit ink and particles are untouched.
- **Rim.** Fresnel `1 − N·V`, masked to where the sun still reaches (BotW's sun-side rim), added to the direct
  diffuse response on characters only.
- **Outlines.** An inverted hull: a child of each character mesh sharing its geometry (and skeleton for the skinned
  Buddy, the instance matrix for the instanced folk), `BackSide`, `positionNode` pushing along the skinned normal,
  coloured a dark shade of the body's own colour (A Short Hike's soft line), widened gently with distance.

The water already shares the sun and fill (`water/surface.ts`: sun × (0.8 N·L + 0.2) + the hemisphere's up colour).
The sea is near flat, so a step on it would be a constant: no water change is needed for any candidate, but the sand
beside it must not jump in brightness, which is why the lit plateau (`toonLit`) is set near flat ground's N·L at this
sun.

## Candidates

All three are behind `?toon=a|b|c` (`src/features/toon-look.ts` lazily loads `src/debug/toon-shading.ts`): Local,
client-only, any build, no setting, no wire or save change. Today's look is the address without `toon`.

| Flag | What changes | Draws | Passes |
| --- | --- | --- | --- |
| (none) | Today: smooth N·L, full hemisphere gradient | — | — |
| `toon=a` | Soft step (edge N·L .22 ± .07, lit plateau .8 with 30% of the cosine kept), 55% flattened fill, and a cool shade side keeping 72% of the fill; on Buddy, remote Buddies and the folk only | +0 | +0 |
| `toon=b` | A on every Standard material, plus a soft sun-side rim (.35) on characters | +0 | +0 |
| `toon=c` | B plus an ink hull on characters: 2.5 cm up close, widening to 10 cm by 16 m, a dark shade of the body's colour | +1 per character mesh: +6 to +13 measured (Buddy's skins, eyes and hat; the folk's 4 instanced draws); shadow pass +0 | +0 |

Knobs for brackets, read once from the address: `toonEdge`, `toonSoft`, `toonLit`, `toonKeep`, `toonFlat`, `toonShade`,
`toonRim`, `toonWidth` (`toonRim=0` removes the rim from B and C; see the 2 November call). Character meshes are tagged in
`src/player/buddy/rig.ts` and `src/proto/place/folk.ts` (`userData.toonCharacter`, read only by this module).

## Boards

Four poses, the same seeded world (`crossing-done`), 800×500 native cells, today's look top left, then A, B, C. All
sixteen cells and the stronger bracket were opened and are described below. Live frames, not frozen: residents, trains and the
sea move between columns, so compare the shading, not who stands where. The sun is the frozen late-morning summer sun
(about 51° up); the game has no midday, so "midday at the pier" is that sun.

- [Buddy close at Home](toon-shading/home.png) (camera square to the sun, so lit and shade halves both show).
  **Today:** round, smooth, the shade side a gentle warm falloff. **A:** a soft step crosses the head and arms; the
  crown and left cheek read lit, the rest a slightly deeper, more orange shade; the body looks flatter but still
  round. **B:** the same on Buddy plus a thin light rim on the sun-side silhouette (arms, head); the ground and wall
  behind look unchanged. **C:** a dark-ochre line, about 4–5 px here, around head, arms and legs. It separates Buddy
  from the sand sharply, but it is heavy this close and opens small gaps at the feet and under the backpack straps
  (hull cracks at hard edges).
- [The village square](toon-shading/square.png) at play distance. **A** and **B** are hard to tell from today: at this
  distance and sun nearly every visible face is lit, and the ramp only changes shade faces. B's shaded wall faces
  (the museum's columns, the shop's side) go a touch bluer. **C** is the one change you notice at once: every little
  guy and Buddy get a line and pop out of the grass and path; the small folk's heads look dark-rimmed, slightly busy.
- [The sea and pier](toon-shading/pier.png). The sea is identical in all four (its own shader; a flat sea has one
  N·L). B and C cool the shaded pier legs and the islet's shade side very slightly. No foam, shallows or sparkle change.
- [A Works interior](toon-shading/bowl.png): inside the Split-rock bowl, looking out past the kiln (the finished forge
  workshop needs line 1's next arrival after the crossing, which no seed holds). **A** changes nothing (no
  character in frame). **B/C** turn the walls facing away from the sun a cooler, slightly darker grey; the sunlit walls
  keep their cream. It is the clearest environment effect in the set: a coloured shade, not a band.

**Bracket, stronger settings** (`toonShade=0.55&toonSoft=0.035&toonKeep=0.1&toonFlat=0.75`, same four candidates):
[home](toon-shading/strong-home.png), [square](toon-shading/strong-square.png), [bowl](toon-shading/strong-bowl.png).
Buddy's head now carries a crisp diagonal band, lit cap over an ochre face: exactly the "flattened dome" the owner
turned down on 4 November, so the defaults stay soft. The bowl's shade walls go clearly blue-grey, which reads well as
Sunshine-like coloured shade; the square still barely moves except C's lines.

What this says: **with a 3.2× sky fill and a high sun, a step on the sun's diffuse is a small change to the world**; the
visible levers are the shade colour (B) and the line (C). A on its own is a subtle character change, close to the soft
ramp already turned down.

## Cost

`npm run bench -- --no-load --rail-seed crossing-done --poses town,forge,pier`, 2560×1600 (DPR 2), MSAA 4, Apple
Metal-3, one sample per mode. **The machine was not quiet** (load average 16–27 during every run, other agents' bot
runs queued around these), so **the GPU and CPU times are unreliable**; the counts are the useful part. Raw reports
are in the run's scratch folder, not committed.

| Mode | Pose | Draw calls | Shadow calls | Triangles | Programs | Passes | CPU ms | GPU ms avg / p95 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Today | town | 396 | 108 | 1,033,924 | 220 | 3 | 19.1 | 22.9 / 28.6 |
| Today | forge | 375 | 133 | 1,051,548 | 243 | 3 | 18.0 | 21.2 / 25.6 |
| Today | pier | 173 | 87 | 635,418 | 253 | 3 | 11.9 | 12.3 / 14.2 |
| C | town | 402 | 108 | 1,075,304 | 228 | 3 | 19.1 | 32.6 / 27.7 |
| C | forge | 388 | 133 | 1,089,396 | 251 | 3 | 18.6 | 22.5 / 27.2 |
| C | pier | 175 | 87 | 641,398 | 261 | 3 | 12.7 | 13.2 / 15.0 |
| A | town | 453 | — | 1,049,068 | — | — | failed | failed |
| B | town | 498 | — | 1,060,028 | — | — | failed | failed |

C adds what the design says: no passes, no shadow draws, about six to thirteen draws where characters are in view (six
hull meshes in this scene: Buddy's body and face skins and the folk's four instanced draws; the sixth to ninth only
when Buddy's eyes and hat are visible), about 40,000 triangles at Home, and eight programs (the ink material per
source). Its GPU means are within this machine's noise: town's mean above its own p95 is one long stall, not a
steady cost. **A and B timed out** on the first pose ("No game frame in 30 s"), right after the bench turns the sun's shadow off,
which makes every lit material compile a no-shadow variant. C carries B's whole lighting model too and passed the same
step minutes later, so the likeliest cause is the loaded machine, not the candidates; that is not proven. A and B add
no draws by construction; their town counts differ from today's only by what was on screen. Rerun all four on a
quiet Mac before trusting any timing, and watch first-variant compile time there.

The ramp, flattening, shade and rim are arithmetic in fragments the scene already shades: one per-object uniform, two
smoothsteps and a few mixes per light per pixel, no texture read, no target, no pass. Patching the shared lighting model
gives every Standard material one more compile variant on first load (the same count as today, different code), so a
cold load compiles the same number of pipelines. C's hulls are opaque back faces that tile GPUs reject early where
the body covers them; their cost is vertices (Buddy's skin about 2,500 vertices, skinned twice) and the edge pixels.
Compare the archived screen-space ink: about 6 ms on the M1 Max ([round two](post-look-round2.md)).

## Limits

- Live stills from a shared, loaded Mac (load 16–22); no frozen exact-repeat check, no motion review. Ramp edges and
  the ink line can crawl in motion; that is unverified. No iPad or iPhone check.
- The hull cracks where a mesh has split normals (Buddy's feet, the folk's merged parts); a smoothed-normal attribute
  baked once per geometry would close them.
- Lambert and Physical materials (clouds, the fall stage's letters) are not patched; neither appears in these poses.
- The rim in B and C goes against the 2 November call ("no rim light" on Buddy); `toonRim=0` removes it.
- The `toon=off` flag is read once at load. The boards' tool is `dev/look/toon-board.ts` (before/after).

The candidates were made with `dev/look/toon-board.ts --modes base,a,b,c` and `npm run bench -- ... --query
'intro=0&toon=c'` on main at #1423; the A/B/C code is in history there.

## Outcome (10 November)

The owner: "Let's go with shading style B and clean up". B is the default on every Standard material with the rim at 0
(the [decision](../decisions.md#look) states that reading). It moved from a lazily loaded debug chunk, which rebuilt
already compiled materials, to a patch `scene.ts` installs before the renderer initialises, so nothing compiles twice.
The knobs keep their values as `toon.*` tunables; the hemisphere and key light are read from whichever scene renders,
so the item icons keep their own lights.

After, same seed, `?toon=off` against the default (boards `node dev/look/toon-board.ts`): Buddy at Home carries the
soft step and ochre shade, no rim; the square barely moves; the pier and sea are unchanged apart from a slightly
duller deck top; the bowl's shaded walls go cool blue-grey. A real-time walk with turns at Home showed the step's edge
following Buddy's form without crawling or shimmering in consecutive frames (encoded video, loaded Mac).

`npm run bench -- --no-load --rail-seed crossing-done --poses town,pier [--query toon=off]`, 2560×1600, M1 Max,
load 7–14 throughout (other agents' runs), so the times are not evidence:

| Mode | Pose | Draw calls | Shadow calls | Programs |
| --- | --- | ---: | ---: | ---: |
| `toon=off` | town | 398 | 109 | 220 |
| `toon=off` | pier | 175 | 88 | 253 |
| default | town | 398 | 109 | 220 |
| default | pier | 175 | 88 | 251 |

Two of three default runs missed the town timing sample after the bench's shadow toggle (one "No game frame in 30 s",
the A/B failure above; one zero-frame sample); both `toon=off` runs passed. A shadow on/off probe at the town and
overview cameras, logging new shader modules, found the WGSL identical on every rebuild (all repeats on the second
toggle) and 3–21 s toggle stalls in both modes (default 3 of 5 runs, `toon=off` 1 of 4) on this loaded machine. Not
proven either way: rerun the bench and a shadow toggle on a quiet Mac and on a phone, where the detail ladder turns
shadows off.

Reproduce:

```sh
node dev/look/toon-board.ts --modes off,on --poses home,square,pier,bowl --name toon-default
npm run bench -- --no-load --rail-seed crossing-done --poses town,pier --query toon=off
npm run bench -- --no-load --rail-seed crossing-done --poses town,pier
```

