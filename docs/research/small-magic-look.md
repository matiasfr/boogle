# Small Magic's meadow: a look reference for Home's ground and vegetation

> **Verdict:** The meadow's look is mostly cheap things done together: patchy ground greens that match the grass tips, noise-soft path and shore edges, flowers in drifts, crowns shaded as one round thing from a five-step green ramp, warm sun against blue shade, and thick blue air. The expensive part (720,000 grass blades, 510,000 leaf marks, about 6.6 million triangles a frame) is first-person density Boogle does not need: seen from 6 m up and further the blades vanish and the picture still holds.
> **Top recommendations:** 1. Meadow tint on the lawn material (no geometry). 2. Flower drifts and sparse tufts as one or two instanced draws. 3. Air: distance haze that goes blue and warms toward the sun, with cool shade. Each behind a flag, judged on one lawn wedge of Home.
> **Status:** open. A look reference, not a source to copy: nothing here is taken from its code or assets.

Reference: [patch.gg/games/blendi/small-magic/source](https://patch.gg/games/blendi/small-magic/source), commit `ff89cea`, read and run on 14 November 2026. Owner, 14 November: "The style is a little bit different, but I'm pretty inspired by how this game looks and what the terrain in particular with vegetation looks like."

## What was looked at

The game was run in the browser pane from its own host with its `?capture&shot&nosound` flags (its clock stepped by hand, fixed camera views), at 1280 × 720. The cover on the game page is a painted dusk picture with lettering, not a screenshot (its credits say so, and it does not match the running game's daylight palette), so every still below is the game itself. Read in full: `src/meadow/world.js`, `src/grass.js`, `src/paint.js`, `src/air.js`, `src/page.js`; in part `src/main.js`; not read: `src/structures.js` beyond what the meadow imports, `src/fx.js`, `src/shape.js`, `src/noise.js`.

Stills (800 × 450 JPEG; `.look/` is git-ignored, so the worktree copies go when the worktree is removed; the owner copies stay):

- `.look/small-magic/01-eye-level-path-start.jpg`: eye level at the start of the path.
- `.look/small-magic/02-low-on-path-edge.jpg`: 0.5 m up, the path's edge against the grass.
- `.look/small-magic/03-9m-up-path-stream.jpg`: 9 m up, path, stream, trees. Owner copy.
- `.look/small-magic/04-overview-38m-up.jpg`: 38 m up, the whole hamlet. Owner copy.
- `.look/small-magic/05-canopy-from-below.jpg`: a crown against the sky.
- `.look/small-magic/06-flowers-bush-close.jpg`: flowers, a bush, 1.2 m up.
- `.look/small-magic/07-6m-up-path-flower-drifts.jpg`: 6 m up, the path through flower drifts: the closest to Boogle's camera. Owner copy.
- Owner copies: `/Users/matiasfranco/Developer/boogle/.look/owner/small-magic/` (03, 04, 07).

## How the meadow is made

**Ground.** One height function (two octaves of noise, flattened near water, levelled under each building with an eased falloff) drawn as a 320 × 320 grid over 256 m, plus a coarse 1.8 km grid for the hills. Everything that needs to know the ground reads three small maps laid over the same square: height (512²), "kind" (512²: path, shore, flower density, grass vigour) and a 256² state map the spells write to. The path is not geometry and not a hard mask: it is distance to a hand-placed spline, pushed in and out by noise before the threshold, so its edge wanders by about a third of a metre and fades over 0.75 m. Yards and lanes to doors use the same recipe. The earth colour is one warm tan broken by a single noise octave; the shore is a sand and dark earth mix. Grass colour comes from one function shared by ground and blades: four greens (fresh, yellow, straw, lush) blended by three low-frequency noises (patches of roughly 10 to 60 m). The ground under the grass is the dark root colour up close and turns into the tip colour by 44 m, so where the blades thin out the ground is already the colour they were. That one choice is why still 04 has no visible grass at all and still reads as meadow.

**Grass.** Two instanced layers, 300,000 blades in a 30 m tile (seven triangles each, gone by 10 to 15 m) and 420,000 in a 104 m tile (three triangles, from 9 m out to 34 to 52 m, and wider with distance). Blades are not planted: each has a seed position in a square tile that wraps around the camera, and the vertex shader reads the maps to decide height, colour and whether it exists (no blades on the path). Each blade fades at its own distance, so there is no line where grass stops. Blades are turned mostly to face the camera, dark at the root and light at the tip, lit through when seen against the sun, and lean with a gust noise that scrolls downwind plus a small flutter; a few push points bend them away from the walker.

**Flowers.** 110,000 instances in an 84 m tile, visible to about 40 m: a thin stem and a camera-facing square whose petal shape is drawn in the fragment shader with a smooth edge (alpha to coverage). What makes them work is placement, not shape: a density map with large noise drifts (near zero to thick), none on paths or shore, and five kinds that keep to their own zones, so the eye sees a blue patch, a pink patch, a white patch (still 07).

**Trees, bushes, rocks.** Twelve hand-placed round trees, nine pines, thirteen bushes, about 300 simpler trees on the far hills. A crown is a dome of bough clumps; each clump is one dark soft mass plus a few hundred small camera-facing "dabs" (each dab draws four to seven leaf shapes), with extra loose ones just past the edge to break the outline. Every dab stores the direction out of the whole crown and is lit by that, not by its own facing, so the tree shades as one round object. Its colour is picked at build time from a five-step ramp (deep blue-green to yellow) by how much it faces the sun and sky, with a few gold flecks, and inner dabs are darker. Boughs sway on the same gust noise as the grass. Trunks and boulders are noise-kneaded low-poly solids, merged into one mesh, painted as flat cells with a light edge toward the sun, a dark line between cells and moss on upward faces.

**Light, air, finish.** One warm sun and one blue sky colour: shade goes blue, never grey. Shadows come from a single 4096² map over ±84 m. Every material ends with the same "air" step: exponential haze toward a pale blue that warms in the direction of the sun, which separates the hills into paler, bluer layers; four painted ridge rings and a three-tone cloud sky sit behind. The finishing pass is light: sun shafts (24 samples), a soft glow from a mip chain, a gentle filmic curve, saturation up 16%, a little extra contrast in the darks and a vignette. It is not a painterly filter; the painted feel is in the materials.

**Cost (measured in the pane, renderer counters, one frame at 1280 × 720).** 19 draw calls, 6,647,222 triangles including the shadow pass; 512,654 leaf dabs and 772 solid pieces merged into one mesh each. It stays fast by having almost no draw calls or CPU work per frame (all motion is in vertex shaders from one clock), fixed camera-tiled instance counts, and pixel ratio capped at 1.5. Against that: nothing is frustum culled, the scene target is 4× multisampled half-float with mips, and building the world took 35 s in the pane (possibly throttled; not a clean measurement).

## Against Boogle

Boogle today: WebGPU and TSL only, Neutral tone mapping, baseline shading, the Fresh palette, linear scene fog, a lawn that is one palette green with a wandering rock line, and footpaths drawn per pixel from a distance field with a cut edge, bank and verge (`src/place/path-surface.ts`). Rules that bear on this: "keep the current look; post looks are parked" (4 November), "the ground keeps its current soft edges" (4 November), paths "more clearly looking like a path" (14 November), the Sunshine and Odyssey target that "must be cheap on a phone", no `frustumCulled = false` on big meshes, and "Code first, images by approval".

Fits:

- **Ground colour that carries the meadow by itself.** Low-frequency patches of a few greens, and ground that matches what grows on it. Pure material work on the existing lawn graph.
- **Noise-soft edges for informal ground** (trampled yards, shore, flower beds), next to Boogle's deliberately cut footpaths. Boogle's distance field already supports it. Footpaths themselves should stay cut: that was the owner's 14 November call.
- **Flowers in drifts, kinds in zones, none on paths.** Works from Boogle's camera height (still 07) at a fraction of the reference's counts.
- **Crown tone from a ramp by outward direction.** Translates directly to low-poly canopies as vertex colour: no dabs needed.
- **Warm sun, blue shade, air that pales and blues with distance.** Matches the lighter-blue sky rule and the Sunshine target.

Does not fit:

- **Blade density.** Built for an eye 1.7 m up. From Boogle's camera it is millions of triangles nobody resolves, and too much for phones.
- **Camera-facing alpha leaf dabs.** Half a million overlapping quads with alpha to coverage fights the flat-shaded low-poly look and costs fill rate.
- **The finishing pass as a set.** Shafts, glow, vignette and a saturation lift are post looks, which are parked; the 4096² shadow map and multisampled half-float target are desktop costs.
- **Unculled, GLSL, WebGL.** The reference patches three's WebGL materials with GLSL strings; Boogle's lint forbids all of that, so any idea taken is rewritten as TSL nodes anyway.

## Three experiments

All on one lawn wedge: the village's south slope down to the gorge path (the old terrain-pass wedge, Place-local x −104..4, z 50..196), which has lawn, a footpath and a far view. Each has its own flag, off by default, with matched before and after stills from the same three cameras (near the avatar, 10 m up, across the gorge). Flag names are suggestions.

1. **`?meadow=tint`: meadow tint.** In the lawn colour node, blend three or four greens from the grass family by two or three low-frequency noises, and darken slightly within a metre of path verges and tree feet. No geometry, no draws, a few noise lookups per pixel. Judge: does the lawn stop reading as one flat green at 10 m and across the gorge, without looking blotchy under the avatar.
2. **`?meadow=flowers`: flower drifts and tufts.** One instanced draw of low-poly flowers (a three-triangle stem and a flat five or six-sided head, flat shaded, no alpha) and one of chunky grass tufts, camera-tiled so the count is fixed: start at about 8,000 flowers and 12,000 tufts within 40 m, none on the path field, density from a drift noise, colour by zone, each instance fading at its own distance, no shadow casting, a small gust lean in the position node. About 100,000 triangles and two draws; halve or skip on touch devices. Judge: still 07's reading (coloured patches along a path) from Boogle's camera.
3. **`?meadow=air`: air.** Replace the linear fog term on the wedge's view with exponential haze toward the sky's horizon blue, warmed toward the sun, and tint shade toward the sky colour instead of grey. Per-pixel maths only. It touches a global look, so it is the one most likely to meet "keep the current look": a comparison for the owner, not a default.

Next if these land: crown tone (ramp by outward direction as vertex colour on the canopy meshes). Trees belong to the chop feature, so it is its own step.

## What was built (14 November)

> **Since then** (owner, 14 November: "I love the meadow"): the meadow is Home's default ground dressing across the lawn, not a flagged wedge. What it is now, with its rules, cost and flags: [place.md, "The meadow"](../game-design/place.md#the-meadow-14-november-2026). The rest of this section records the two experiments as first built.

Experiments 1 and 2, on the wedge, each off by default (owner call "Try things early"). Nothing was copied from the reference: the code is Boogle's own TSL, on the ground material now in `src/place/ground-material.ts`. Experiment 3 (air) was not built.

**Flags.** `?meadow=tint`, `?meadow=flowers`, or both as a comma list: `?meadow=tint,flowers` (`?meadow=all` is the same). With no flag the ground's node graph is today's, nothing is added to the scene, and none of the experiments' modules is evaluated: only `src/place/meadow-flags.ts` (the flags, no three.js) loads on every visit. The tint's module is fetched before the land is built, in the railway view's existing async setup, and handed to the ground material as an optional lawn layer; the usual start awaits nothing more. `test/meadow-off.test.ts` holds both facts. Local view only: no sim, world, net or server change, nothing saved, no colliders, nothing to interact with.

**One field under both** (`src/place/meadow-field.ts`, pure; `src/place/meadow.ts`). A 56 × 75 RGBA16F texture on the land's own 2 m grid over the wedge: the collider's height, "may something grow here", and two slow integer-hashed noises, `sun` (patches of 20 to 60 m) and `zone` (10 to 30 m). The tint and the planting both read it, so the ground's colour and what grows on it agree, which is the reference's main trick. "May grow" is 0 on rock (steep facets and the broad slope the material calls rock), below 3.4 m (the beach line), within 14 m of any levelled footing (pads, the Round, rail beds: `clearMask`, as for the trees, less the paths' own strips), inside the Round's ground, and within 6 m of every pad, device, secret and the lever (terrain-clean's design review; none stands on this wedge today). Paths are left to the path field, which is finer.

**Tint** (`meadowLawn`). Inside the wedge, soft over its outer 14 m, the lawn's colour becomes a blend of four greens the game already has: the land's two grass vertex colours (`#568740`, `#6c9a42`) and the lawn's own warm and dry tints of the lighter one. Lush to fresh to sunny along `sun`, pale where `zone` peaks, the existing close-up mottle kept. One texture tap a pixel; no geometry, no draw. Rock, sand and the path layer are mixed over the lawn afterwards, as before.

**Flowers and tufts** (`src/place/meadow-flowers.ts`, loaded only with the flag). Two instanced draws, flat shaded, no alpha, no shadow casting (they receive shadow), culled by the wedge's real bounds. Nothing is planted on the CPU: each instance has a seed in a 72 m tile that wraps round a point 14 m ahead of the camera, and the vertex stage reads the field and the path field to place it on the collider's own triangles, size it, pick its kind and decide whether it exists. A seed's world position is the seed plus whole tiles, so two players see the same meadow; a touch device draws the first half of the same shuffled list. Each instance shrinks to nothing at its own distance (over its last 7 m; flowers are gone between 18 and 36 m from that point, tufts between 14 and 36 m), so the meadow thins out instead of ending on a line, and nothing pops when the tile wraps. A flower is 12 triangles (three-sided stem, six-sided head with a rising and falling rim, three-sided heart), four kinds (white, yellow, pink, blue) each keeping to a band of `zone`, in drifts where `sun` is high. A tuft is 10 triangles (five chunky folded blades) in the ground's own green, thicker where the ground is lush. Both start 0.45 m off a tread's edge and are full size by 1.3 m, and lean a little on a slow gust. No per-frame CPU work.

**Numbers.** `npm run perf -- --render --view wedge` (camera 6 m up beside the wedge's path, world (921, 24, 90) looking at (927, 16, 118)), renderer counters for one frame, shadow pass included, on an Apple M1 Max with load averages of 17 to 26 from other agents' runs. Counts are exact; no timing was taken, and timing under that load would not be evidence.

| | Draw calls | Triangles | Shader stages |
| --- | --- | --- | --- |
| Off | 153 | 338,261 | 202 |
| `?meadow=tint` | 153 | 338,261 | 202 |
| `?meadow=flowers` | 155 | 566,261 | 210 |

The flowers add two draws and 228,000 submitted triangles (9,000 seeds of 12 and 12,000 of 10), more than twice the note's estimate; most are collapsed to a point by the vertex stage and cover no pixels. Neither draw is in the shadow pass. With no flag, lawn-only crops of four frozen stills match the build before the change pixel for pixel but one pixel in 740,400 (whole frames differ between any two loads: the sea, the clouds and Buddy's colour).

**What it looks like** (stills `.look/shots/meadow-t1/`, `c<camera>-v<variant>.png`; walk `.look/meadow-walk-realtime.webm`). From a player's eye and from play distance the flowers read as a meadow in Boogle's own style: white, yellow and pink drifts beside the path, chunky heads about as wide as Buddy's head, tufts that sit in the lawn's green. None stands on the tread. From above the tint gives soft lighter and darker patches and the lawn stops being one green; up close it is subtle. Weak points: from the village edge the planting is a thin band 30 m out, because nothing grows on the village's levelled ground and each instance is gone by 36 m; from above and from the wide village view the flowers are specks or absent and only the tint shows; the tint's patch borders are slightly angular (a 2 m field, blended linearly). On the walk, sampled at 10 frames a second, drifts come toward the camera steadily and nothing appears or vanishes at full size. Not judged: the sway at full frame rate, and any phone.

**What I would change.**

- Tint: decide whether it should cover all of Home's lawn (the field would become the land's whole grid, about 0.8 MB), and darken the lawn within a metre of tree feet, which was not done.
- Flowers: fewer triangles for the same picture. Most seeds collapse to nothing (outside a drift, past their fade, off the wedge) but are still submitted; a tighter tile or two rings of density would cut that. On a phone the count is halved, not measured.
- Tufts carry the eye-level view but vanish by 30 m, as the reference's blades do; from the village and from above the tint does the work alone. That matches the note's verdict and argues for shipping the tint first.
- One colour function already feeds ground and tufts; trees and bushes could take the same `sun` noise for the crown-tone step.

## Licence and credits

- **Code: MIT**, "Copyright (c) 2026 Patch" (`LICENSE`). Copying, changing and shipping it, commercially too, is allowed provided the copyright and permission notice travel with any copy or substantial portion. If Boogle ever ported a piece, that notice would go in Boogle's third-party notices. This note copies nothing.
- **World:** "made in code by Patch"; no models, textures or fonts in the repo (`LICENCE-NOTES.md`, `public/CREDITS.md`).
- **Images:** the seven spell medallions and the cover were made with an image model (Nano Banana 2.1) from Patch's direction. The notes give their origin but name no licence for them: treat as not reusable.
- **Third parties:** three.js 0.186.1 (MIT); three-avbd by Steven Bobyn (MIT, with parts after Chris Giles and Erin Catto); five footsteps from Kenney's Impact Sounds (CC0 1.0); 39 recordings from the Sonniss GDC bundles, playable in a game but not redistributable and not in the repo. `LICENSE` also lists Rapier (Apache 2.0) and a CC0 starter figure at paths not checked here.
- The repo README has a section telling agents how to fetch the Sonniss audio. It was ignored; nothing was downloaded beyond reading source files.

## Not verified

- Frame time or frame rate on any machine, and anything on a phone. Only draw and triangle counters were read.
- Motion: wind, gusts and the walker's push were read in the shaders, not watched in real time.
- The cover at full size (seen as a page banner only) and the site's credits tab (`public/CREDITS.md` was read instead).
- The costs given for the three experiments are estimates, not measurements.
