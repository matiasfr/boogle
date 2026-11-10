# Sunshine water: plan

Owner's direction, 9 November 2026: a water "a lot more inexpensive instead of ultra water, that also fits the style of the game better", with Super Mario Sunshine as the visual target, liking "the lighting/grading there too", and "really efficient for mobile without issue". Research: [water-sunshine](../research/water-sunshine.md); reference board: [water-sunshine.html](../research/water-sunshine.html).

Serves DESIGN.md's look principles through [bang-for-buck aesthetics](../research/bang-for-buck-aesthetics.md) (spend on light, air and colour, not surfaces) and the principles **Small and readable — measure before optimizing** and **Clear authority**. Status: **A and B built behind `?water=` (9 November); C not built; awaiting the owner's pick.** Results: [water design](../game-design/water.md#sunshine-water-candidates-9-november-2026) and "Build notes" below.

## Goal

Put two or three cheaper waters next to Ultra behind `?water=`, with the same gameplay contract, so the owner can choose by eye at the shore, the pier head, Far Head and the summit, and on his friend's phone. Ultra stays the default until he picks.

**Done means:** each candidate loads behind its flag; swimming, plunges, underwater, ripples, floaters and the telescope behave as today; the candidates' stills, clips and `npm run perf` rows exist at the four places; the phone checklist has been run on one candidate; the owner has picked.

**Out of scope:** the sky, the grade and toon shading (sequenced in [owner questions](#owner-questions)); fixes to the freeze, draw calls or render targets that the measurement job owns; ponds' look (they use the same surface today and follow whatever the sea picks); a `WORLD_NS` bump (none is needed: nothing here is saved or sent).

## What stays fixed

- **The water contract is Local.** `waterField` is "renderer-free Local water" ([water-field.ts](../../src/physics/water-field.ts)); the flag changes one client's look and its own swimming feel, never the wire, saves or the room. Two players on different flags see different swell under each other's swimmer, at most a few centimetres; the remote swimmer's height comes from presence, so nothing desyncs. Mean sea level stays `SEA`, which gifts (lost below the surface), buoys (their own sine) and the ball's still-water test rely on.
- **Shared parts stay shared.** Frozen sky, underwater (lens, tint, droplets, snow), the output-pass composite, ripples (`seaRipples`), splash and impact spray, receivers' wetness and the graphics registry. Each candidate replaces only the surface and the parts the surface fed: FFT, queries, caustics producer, shore atlas fields.
- **The `Ocean` interface** in [surface.ts](../../src/render/water/surface.ts): `mesh`, `heightAt(xz)` in TSL, `setCameraDepth`, `setDetail`, `setFarSea`, `update`, `dispose`. Underwater and snow already consume only this and `WaterSky`.
- **Fixed exposure and Neutral.** Water colours are scene-referred and lit by the frozen sky's sun and ambient, not display-range unlit colours (the 5 November regression came from exposure on display-range materials; [dark-unlit-exposure](../research/dark-unlit-exposure.md)).
- **Room-safety:** all new code is cosmetic or Local; nothing in `src/sim`, no new ops, no catalog or wire change.

## The candidates

The three differ in what the surface is allowed to read: **A** reads nothing from the screen, **B** reads the depth once, **C** keeps today's reads but strips the rest. Pixel counts below: the owner's Mac at 5.72 MP with 50–70% of pixels on water at sea-facing poses (2.9–4.0 MP of water); the iPhone Air at 0.55 MP scene pixels with the same share (0.27–0.39 MP). The iPhone Air's GPU is taken as 4–6× slower than the M1 Max per pixel **[E]**. Estimates are for the water alone, **from code, not measured**; the derivation is in [How the estimates are made](#how-the-estimates-are-made).

| | Ultra (today) | **A: Sunshine plane** | **B: Sunshine plus depth** | **C: Ultra lite** |
| --- | --- | --- | --- | --- |
| Screen reads | colour + depth copies | none | depth copy | colour + depth copies |
| Pass splits added | 2 | **0** | 1 | 2 |
| Extra render passes | 2 caustic + mips | 0 | 0 | 0 (static caustic texture) |
| Compute per frame | 10 FFT, 1 query, 1 lens | 1 lens | 1 lens | 4 FFT (one 128² cascade), 1 query, 1 lens |
| Fetches per water pixel | 23–35 + contact loop | **4–6** | 6–8 | 12–16 |
| ALU per water pixel | ~1,000+ plus N contacts | 60–100 | 80–130 | 300–450 |
| Vertices | 193k (51k on low) | 10–20k | 10–20k | 51k |
| Draws | 1 sea + 3 caustic | 1 (+1 far disc) | 1 (+1 far disc) | 1 |
| Water-owned memory | ~170 MB + copies | **~6–12 MB** | ~6–12 MB + depth copy (23 MB Mac, 2.2 MB phone) | ~80–100 MB + copies |
| **GPU estimate, Mac 5.7 MP** | 4–15 ms | **0.4–2.5 ms** | 0.9–4.5 ms | 2–9 ms |
| **GPU estimate, iPhone Air** | 3–9 ms | **0.2–1.0 ms** | 0.3–1.3 ms | 1–3.5 ms |

### A: Sunshine plane (`?water=sun`)

One blended plane drawn after opaques, as Sunshine's `_umi`. A small displaced patch follows the camera (a 128×128 grid over about 160 m, finer near the centre) inside a flat far disc to the camera's far plane, so 10–20k vertices instead of 193k. The vertex height is a CPU-mirrored swell of three or four long Gerstner waves of 0.1–0.3 m, the same function in TypeScript (answering `waterField` with no GPU readback or latency) and TSL (for `heightAt` and the vertices), faded to flat within 80 m of the shore so the bed clamp is not needed. The pixel shader does what Sunshine's TEV did, with our own textures: two samples of one 128² wave-cell texture at two scrolls and scales, the second added at about twice the weight; a **sparkle band** chosen from the computed texture footprint, so it survives DPR, the 0.6 ceiling, the telescope and the summit; an alpha test leaving bright texels in the band and soft "cling-film" outside it; colour from **bed depth** (one sample of a slim coast texture: bed depth in one channel, baked contact distance in the other) on a three-stop ramp; blending for clear shallows over the sand; a foam lip where bed depth is under about 0.4 m, broken by the wave texture; foam rings around trestle legs, rocks and the gate from the baked contact channel; an analytic sky band for reflection, a sun lane (a narrow cone around the reflected sun direction multiplying the sparkle), and analytic haze to the summer horizon colour. Ripples stay analytic. Under the surface, the same plane drawn from below with the underwater tint; the lens, droplets and snow are shared.

**Budget:** 0 extra passes and targets; 1 draw plus the far disc; 4–6 fetches (2 wave, 1 coast, 0–1 foam detail, 0–1 macro variation) and 60–100 ALU per pixel; 10–20k vertices with 0 fetches each; one 128² RGBA8 wave texture with mips (~85 KB), the coast texture at 1 m per texel over the shore providers' bounds (expected at most 2048², 8 MB as RG16F; confirm at build). On the phone, about 0.3–0.4 MP of water at ~5 fetches is under 2 M fetches a frame.

**At the four places.** *Shore (west cove):* sand shows through the first 2–3 m, a turquoise band, then blue; the foam lip sits on the waterline without swash wave trains, so the shore reads calm (receivers' wet band stays, driven by the swell instead of breaking trains). *Pier head:* rings at each leg from the baked channel; no refraction wobble under the deck; the band of sparkle sits beyond the pier, which is where the owner's eye goes. *Far Head:* open sea to the horizon is the cheapest case (one plane, haze); the band moves with the camera during the rocket pull-out; legs ring as at the pier. *Summit:* looking down from 100 m the footprint is large, so most of the sea is in the calm far levels and the band lies a few hundred metres out; a single low-frequency macro tint (one sample or analytic) breaks tiling; haze does the rest. **What it loses:** refraction, true contact foam for moving things (swimmers, the ball and gifts get splash ripples only), sun glitter as individual stars, breaking waves.

### B: Sunshine plus depth (`?water=sun-depth`)

A, plus one copy of the opaque depth before the water (the colour is never copied). The depth difference gives intersection foam on anything that meets the water, moving or not (swimmers, the ball, gifts, buoys, new props without registering), and a soft edge where the water meets rock. Optionally, a half-size colour copy (Sunshine's own trade, 16-bit at half width and height) for a refraction shimmer near shore; off by default and measured separately.

**Budget:** 1 pass split (on the Mac at 4× MSAA that stores and reloads about 275 MB, roughly 0.8–2 ms; on the phone without MSAA about 0.1–0.3 ms); the depth copy 23 MB on the Mac (more if the samples are copied), 2.2 MB on the phone; 6–8 fetches (A's plus 1–2 depth) and 80–130 ALU per pixel. The shimmer copy, if enabled, adds a second split and 1.1 MB on the phone.

**At the four places.** *Shore:* the same as A plus a soft fade where water meets rock and a foam outline on boulders. *Pier head:* rings on legs, the pier deck's shadow edge does not show, but a swimmer under the pier gets a foam ring. *Far Head:* as A; the split costs the most here on the Mac because the view is mostly sea at full resolution. *Summit:* as A; depth adds nothing visible at that distance, which is the case for turning it off by distance (not possible per pass, so it is paid anyway).

### C: Ultra lite (`?water=lite`)

Today's water with the expensive parts removed: one 128² FFT cascade instead of four 256² ones (4 dispatches), no Poisson glitter (a smooth sun lobe instead), one retreat tap instead of three, the static caustic texture instead of the producer, the baked contact channel instead of the loop, the 51k-vertex grid everywhere, shafts and snow off on touch, and a 512 sky cube on touch. It keeps the colour and depth copies, refraction, Beer–Lambert colour and the shore wave trains.

**Budget:** 2 pass splits; 12–16 fetches and 300–450 ALU per pixel; 51k vertices with 4–8 fetches each; about 80–100 MB owned (the atlas stays because the wave trains need its travel time; the cube shrinks on touch only).

**At the four places.** It looks like today's water with less glitter and calmer swell everywhere; the shore keeps breaking waves; the pier and Far Head keep refraction under the deck and around the legs. **Its problem is the brief:** it is still a photographic water, so it does not move toward Sunshine, and it still pays both splits, the atlas memory and the load-time solve. It exists as the fallback if the owner prefers the current look at a lower cost.

### How the estimates are made

- **Anchor:** the only measurements of this view are whole-frame: shore camera 6.3–7.0 ms at 1210×702 and 10.9–21 ms at 2880×1800 on the M1 Max ([bloom verification](../game-design/water.md#bloom-verification-3-november-2026)); the difference implies **1.1–3.3 ms of pixel-proportional work per megapixel** for that view. Taking the water as 50–70% of the per-pixel work at sea-facing poses gives today's water **3.5–13 ms at 5.72 MP**; adding the fixed parts (FFT, caustics, queries, vertices: the phone ladder's 0.4–0.8 ms "simpler sea" saving is the vertex share) gives **4–15 ms**.
- **Scaling the candidates:** per-pixel cost scaled by fetches and ALU against today's (A at roughly 1/6–1/8 of today's per-pixel work, B 1/4–1/5, C 1/2), plus each pass split at 0.8–2 ms on the Mac (275 MB stored and reloaded at 140–350 GB/s effective) and 0.1–0.3 ms on the phone.
- **The phone:** 10–15× fewer water pixels than the Mac and a 4–6× slower GPU, so per-pixel work costs about 0.3–0.6× the Mac's; splits cost less (no MSAA); vertex and compute work are fixed per frame and cost more relative to the Mac.
- **Wide ranges on purpose:** the contact loop's cost depends on how many legs are registered within 180 m, which nobody has counted (see the research's [measurement list](../research/water-sunshine.md#what-the-measurement-job-should-confirm)). **The missing number** is frame GPU time with the sea hidden and shown at the four poses on the Mac and a phone; once the measurement job has it, the table is rescaled from it and the ranges narrow.

## Art it needs

All original and generated in code, as [texturing](../research/texturing.md) adopted (procedural tiles baked to small textures); no textures taken or traced from Sunshine or any other game.

1. **Wave cell, 128² RGBA8, tiling.** Baked at load (as `bakeFoam` is today) from tiled Worley noise: the distance to the second-nearest cell point minus the nearest gives bright, slightly rounded cell borders; two octaves at different cell counts; a soft threshold so borders are lines of 1.5–3 texels. R holds the cell lines, G a blurred version for the far levels, B a low-frequency blotch for macro variation, A unused. Tuned in `?tune` by cell count, line width and contrast.
2. **The sparkle band.** Computed in the shader from the footprint `log2(texels per pixel)`, with tunable near, peak and far levels and a peak brightness; this is resolution-proof. **The authored-mip variant** (for comparison only): the same baker writes a mip chain by hand, level 0 nearly empty, level 1 medium, level 2 brightest, below that fading to calm, uploaded through `DataTexture.mipmaps`; it shows what Sunshine's trick looks like at our resolutions, including its shifting with DPR.
3. **Coast texture, RG16F.** R: bed depth below sea level, sampled from the shore providers' height functions at 1 m per texel at load (no eikonal solve; this also removes about 0.9 s of load per shore). G: distance to the nearest registered water contact, a CPU brute-force distance transform within 6 m of each contact at registration, rebuilt only when contacts change.
4. **Colour ramp, three stops plus foam,** tuned against the Fresh palette in the sRGB colours an artist thinks in and converted to linear: shallow `#6fe0d0`, middle `#19b5cf`, deep `#1667b8`, foam white with a cyan shadow; horizon blends to the summer sky's horizon (0.62, 0.76, 0.88, linear). These are starting values, an interpretation of Sunshine's range, not sampled from it.
5. **Seabed caustic texture** for the receivers (replacing the producer in A, B and C): one 256² R8 tile baked from the same Worley noise at a different scale, sampled twice with scrolling, as today's receivers already sample caustics twice.

## How it sits with the Fresh palette and the lighting

- **Colour against the land.** Fresh sand `#ddc08c`, grass `#589351`, timber `#9b784d`, stone `#c3b08c`, walls `#f5f3eb`, roofs `#ccb789` are all warm and mid-light; the water ramp is cool and saturated, so the coastline reads by temperature contrast, as Sunshine's cyan against warm plaster does ([sunshine-look](../research/sunshine-look.md): cool water, warm stone). The shallow stop is kept lighter than the sand's value would make muddy: turquoise over tan, not green-grey.
- **Light.** The water's base colour is multiplied by the frozen sky's sun colour × the fixed gain × a soft wrap term and by the sky's ambient, so the noon look matches the ramp and the evening sky still warms the sea. The sparkle band and sun lane are tinted by the sun colour, which gives Sirena-like yellow at evening for free.
- **Tone.** The ramp is calibrated so that, through Neutral at the fixed 0.12 gain, the deep stop lands near `#1667b8` and the band does not clip to white except in the sun lane. If the owner's lighting answer (question 2) changes the grade, the ramp is retuned once after it.

## Build steps

Each step is small, passes its tight checks and ships on its own; nothing waits for a playtest. Candidate code lives under `src/render/water/sun/` and is lazy-loaded only when chosen, so Ultra's bundle and load stay as they are.

1. [x] **The seam.** Split `createRealSea` in [water-render.ts](../../src/render/water-render.ts) into a shared core (frozen sky, quality, underwater, snow, post, ripples, spray, the `waterField` install) and a surface factory returning `{ocean, provider, receiversField, causticSample, dispose}`. Register a `water` graphics setting (choices `ultra`, `sun`, `sun-depth`, `lite`; default `ultra`; `applyMode: 'reload'`; scope Local; Dev audience) and accept `?water=<id>` as shorthand for `?graphics=water:<id>`, added to the Dev flags in [dev-preferences.ts](../../src/dev-preferences.ts). Ultra is the only factory. **Check:** `npm run check` and the water tests; an Ultra still at the shore matches before and after.
2. [x] **The swell.** `water/sun/swell.ts`: three or four Gerstner waves, one function in TypeScript and TSL, with a unit test that the two agree to 1 mm on a grid and that the mean height is `SEA`. A `waterField` provider from it (synchronous, `moving: true`). **Check:** player swim and plunge tests; the ball and gift float tests.
3. [x] **The coast texture and baked contacts.** `water/sun/coast.ts` builds the RG16F texture from the providers and `waterContacts()`. **Check:** a unit test on a synthetic shore (depth monotonic off a slope; contact distance zero at a leg); load time at the cove measured with `npm run perf` (should fall by the eikonal solve).
4. [x] **Candidate A.** The wave-cell baker, the near patch plus far disc, the surface material and its underside, receivers fed by the coast texture and the static caustic tile. `?tune` sliders for the ramp, band levels, scroll speeds and foam. **Check:** stills and clips at the four places; perf rows; the underwater dip still at the cove.
5. [x] **Candidate B.** One `viewportDepthTexture` read in A's material behind the `sun-depth` choice; intersection foam and the soft edge; the half-size shimmer copy as a separate tunable, off. **Check:** as step 4, plus a still of a swimmer under the pier.
6. [ ] **Candidate C.** Ultra's factory with a `lite` option set: one 128² cascade, no glitter, one retreat tap, static caustics, baked contacts, 51k grid, touch-only shafts and snow off and 512 cube. **Check:** as step 4.
7. [ ] **The comparison.** (partly: poses done) Four named poses in [dev/look/lib.ts](../../dev/look/lib.ts) and a `water` sheet that renders each pose under each `?water=` choice with the same seed and time (frozen clock), side by side; a Dev dock button to reload into each. **Check:** the sheet renders; perf rows for every pose and choice.
8. [ ] **The owner's pick, then cleanup** (a separate change after he chooses): the pick becomes the default; the others stay one release behind the flag, then Ultra is archived on a tag if he agrees (question 5), and the decision is logged in [decisions](../decisions.md#look).

## Verification

Per the owner's call "Tight tests per change; the full loop once a day" ([owner-calls](../agents/owner-calls.md)).

**Per change:** `npm run check`, the touched module's tests, and one seeded still at the pose the change affects.

**The four places,** each as a seeded still (frozen clock, fixed seed, same sky) and a 6–8 s real-time clip, for every choice. World positions from the 9 November playdata, to be framed in step 7:

| Pose | Where | What to judge |
| --- | --- | --- |
| `cove` | the west cove's beach, about (800, 3, 60), looking out | sand through the shallows, the foam lip, wet sand, the band |
| `pier-head` | the pier head, about (1400, 8, −345), looking out to sea | leg rings, the deck over water, the band, spray |
| `far-head` | Far Head, about (1392, 26, −170), facing open sea, and during the rocket pull-out | open-sea fill, the band in motion, trestle legs |
| `summit` | the summit, (1015, 104, −6), looking down to the coast | tiling, haze, the band from altitude |
| `telescope` | the telescope at full zoom across the sea | band coherence when zoomed, no crawl |

Plus one clip riding a train across the trestle at 20 m/s (sparkle must not crawl) and one underwater dip and surfacing at the cove.

**Performance:** `npm run perf -- --render --view <pose> --query 'water=<id>'` for each pose and choice (counts: passes, draws, triangles), and `npm run perf -- --hardware --view <pose> --query 'water=<id>' --size 2712x2110` for frame timings at the owner's resolution, comparing against `water=ultra` in the same run. Each candidate's row is judged against the measurement job's sea-hidden number at the same pose.

**Two-minute phone check** (the friend's iPhone Air, or any iPhone on Safari 27, on boogle.club or a LAN build with `?water=<id>`):

1. Load the place; note the time to the first playable frame.
2. Walk to the cove shore and look out for 15 s: steady, no hitch.
3. Swim out; jump in from height (the pier) so the fall carries you under; surface: the underwater tint and droplets show.
4. Ride the train over the trestle to Far Head: no freeze, the sky stays.
5. Stand at the pier head facing the sea for 30 s with `?prof` on: note p95.
6. Lock the phone, unlock, return to the game: the sky and water are intact.
7. Report the p95, any hitch and a screenshot at the pier head.

## Build notes (9 November)

A and B are built; the look, costs and losses are in [water design](../game-design/water.md#sunshine-water-candidates-9-november-2026). The owner questions were taken on their recommended answers and logged as open calls in [agent-calls](../agent-calls.md).

**The missing number** (sea hidden vs shown, `?viewWater=off` through the `view.water` binding, rail seed `q6-done`, 1180×820, Dev, the tree before the seam). Hiding Ultra's surface removes one draw, about 387,000 triangles and both framebuffer copies at every pose (cove: 307 → 306 draws, 1.43 M → 1.05 M triangles, 6 render passes either way; pier head, Far Head, summit and telescope alike). The FFT, caustics producer, queries and their 312 MB of GPU memory keep running when only the draw is hidden, so the hidden number is a floor for Ultra, not a sea-free scene; A's own row (3–4 passes, 2–3 dispatches, no copies, 212 MB) is the better "sea gone" reference. After the seam, `water=ultra` measured the same counts and memory as before it.

**GPU times: none.** `npm run perf -- --hardware --view cove --query water=ultra --size 2712x2110` returned "unavailable: no completed frames" in its 5 s window and failed on two resource 404s (load 24.5 → 25.4 on ten cores, not flagged as under load); the remaining fourteen runs were stopped rather than spend the shared bot queue on the same result. Frame timings are owed, on an idle machine or the phone.

**Coast bake:** about 200 ms on the main thread in Node for Place's shore alone (1,020 × 780 texels, machine load 13); in the game the home island's provider widens the texture to 2,015 × 780, so expect roughly twice that once at load, and again only when a shore provider's revision changes.

**Deviations from the steps:**

- The swell is four vertical-only sines, not Gerstner waves: sideways motion would make every CPU height a root-find for swimmers and floaters, and at 0.05–0.12 m it doesn't show (logged).
- `?water=` works without Dev (logged), and is a separate flag, not added to `dev-preferences.ts`.
- The coast texture is RGBA16F (bed, contact distance, signed waterline distance), 12.6 MB at Place, not RG16F; contacts bake into 1 m texels and read as soft blobs; the swash on the sand is driven by the coast's normal with no travel field.
- The vertex reads the coast once per vertex for the swell's depth fade.
- Spray keeps only the impact crowns (no shore atlas, so no breaker or rock spray).
- The far sea is a single skirt ring, not a separate far disc; `setFarSea` and the half-size shimmer copy (B) are not built.
- Step 7 has its poses (`cove`, `pier-head`, `far-head`, `summit`, `telescope` in `dev/look/lib.ts`) but no `water` sheet or Dev dock button; the comparison stills were taken with `npm run look`'s session (`session reload water=<id>`) and stitched by hand.

**Phone check:** not tested on a device. All seven items are owed for `?water=sun` and `?water=sun-depth`:

1. Time to the first playable frame: not tested on a device.
2. Cove shore, 15 s, steady: not tested on a device.
3. Swim, plunge from the pier, surface; tint and droplets: not tested on a device.
4. Train over the trestle to Far Head, no freeze, sky stays: not tested on a device.
5. Pier head, 30 s with `?prof`, p95: not tested on a device.
6. Lock, unlock, return; sky and water intact: not tested on a device.
7. Report p95, hitches and a pier-head screenshot: not tested on a device.

## Recommendation

**Build A and B, compare them with Ultra, and expect A to win.** A is the only one that changes the style toward Sunshine and removes every screen read, so the phone's relief is real even with its resolution pinned at the floor; its estimate is a tenth of today's or better. B costs one flag and a depth read on top of A and answers the only thing A lacks that players notice (foam where swimmers and moving things meet the water); on the Mac it pays one split, which the owner can judge at the pier head directly. Build C only if the owner wants the current look kept at lower cost after seeing A and B. Fix the contact loop in Ultra anyway if the measurement job confirms it, since Ultra stays the default until the pick.

## Owner questions

Recommended answer first.

1. **Should the sand show through the shallows?** *Recommended: yes, in the first 2–3 m only, by blending,* as Sunshine's near-clear water; deeper than that the water is solid colour. Alternative: opaque water everywhere (cheaper still on Apple GPUs, since the seabed is then never shaded), with depth shown by colour bands only, as A Short Hike.
2. **What should "lighting/grading like Sunshine" change beyond the water?** *Recommended: one lighting board after the water pick that changes the sky ramp toward a deeper blue zenith and paler horizon, warms the sun and lifts the ambient toward cyan so shadows are light and blue, keeps Neutral and the fixed exposure, and offers a gentle Sunshine grade (saturation and a slightly lifted toe) as one Look to compare.* Alternative: leave the lighting until the toon pass, and take the water alone now.
3. **How should the toon-shading revisit be sequenced?** *Recommended: after the water pick and the lighting board, environment first (terrain, rocks, buildings: a two- or three-band ramp in the shared material presets), Buddy and the characters last,* because Buddy's light ramp was declined on 4 November and the environment carries most of the screen. Alternative: characters and environment together in one comparison.
4. **How far should underwater be simplified?** *Recommended: keep the tint, exposure offset, droplets and marine snow (your 3 November call) and replace the moving caustic net on the seabed with a scrolling texture.* Alternative: keep underwater exactly as it is, including the caustic producer, on desktop only.
5. **What happens to Ultra after the pick?** *Recommended: keep it behind `?water=ultra` for one release, then archive it on a tag,* so there is one water to maintain. Alternative: keep it as a High setting for desktops.
