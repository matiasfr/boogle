# 6.26b Prototype: Ultra Water demo scene (`?proto=water`)

## Real-sea output (4 November 2026)

`water=new` uses Neutral after the underwater HDR composite, with the existing exposure meter and no extra
exposure trim. Keeping adaptation isolates the owner's tone-curve change from lighting and preserves the
surface/underwater exposure response. The two meter draws and history copy remain. Looks' **Current** matches
this output; **Sunny toys** and **AgX Punchy** retain AgX comparisons. The frozen late-morning sky, water
parameters, terrain and default legacy route are unchanged. The retained `proto=water` demo and explicit
`sky=toy` experiment keep their own output choices.

## Opt-in Sunshine sky comparison

`?proto=place&water=new&sky=toy&toyTone=neutral` selects original stylized sky art baked into the existing
1024² HDR cube: a blue gradient and six sparse cumulus groups. The same cube supplies background, fog,
environment and hemisphere fill; the physical late-morning sun direction/colour and cloud-alpha sun disc stay.
FFT waves, shore geometry, caustics, foam coverage, refraction and underwater features remain. Only local optical
tuning changes: cyan scatter/absorption, restrained reflection tint/cap, sun gain and foam/glitter brightness.
No room state or gameplay changes. No change without `water=new&sky=toy`; the demo is excluded.

`toyWater=off` isolates sky/fill from water tuning; omit `toyTone=neutral` for this experiment's retained AgX.
`toyVariant=soft|clear|punch` compares softer blue, the default clear balance, and stronger cyan water.
Neutral uses the same existing exposure meter and gain, with no per-curve exposure trim or second output pass.
The normal `tone=` flag remains inactive on new water. AgX Punchy is a separate experiment.
Optional `tune=1` keeps the existing controls and Copy/Apply settings; these reset to the selected experiment's
values on this route. Toy cloud shape/coverage is authored in code, so the physical sky's cloud-coverage control
does not reshape it. Saved tuning overrides can supersede the preset; use clean settings for comparisons.
See [Sunshine sky research](../research/sunshine-sky.md) for the visual verdict and settings. This is not graduation.

## Production water tuning

Open `?proto=place&water=new&tune=1` to tune the real sea on the place page, or append `&tune=1` to another
`water=new` room link. Dev visits also enable editable uniforms without `tune=1`. The dependency-free panel is dynamically imported into the Dev dock on the deployed build as well as locally.
Without Dev/tuning opt-in it loads no panel code, CSS, DOM or saved overrides. These preferences belong to this viewer;
they add no room state, messages, controls or gamepad slot. The cursor stays free on tuning visits; drag the scene
to look around. The game keeps running while the panel takes mouse and keyboard events aimed at its controls.

Groups follow the Ultra Water reference: **Sun & sky**, **Waves**, **Shore waves**, **Water**,
**Floaters & underwater**, **Light fill**, **Post** and **Quality**. Light fill adjusts the existing frozen-sky key/hemisphere without rebaking; use Looks' exposure lock to judge it. Each group and the whole panel can reset to production defaults.
Changes persist in localStorage only for Dev/tuning visits. A saved [Looks](dev-menu.md#looks) choice takes precedence over old Water overrides. **Copy settings** exports one JSON object containing only
overrides; **Apply settings** accepts the same block, so the owner can send a look back to an agent to make permanent.

The saved format is `{ "version": 1, "changes": { "wave.waveScale": 0.5, "post.exposure": 1.2 } }`, under
`boogle.water-tuning.v1`. Pasting replaces current overrides after validating every key, range and RGB array.
Colour pickers display sRGB; exported scatter, reflection tint and foam tint arrays are linear RGB. Absorption
is editable per channel in inverse metres. Invalid pasted data changes nothing; Copy leaves selectable JSON
when clipboard access is unavailable.

Spectrum controls rebake H0 in the existing FFT buffers after editing, without replacing textures used by queries.
`waveScale` scales energy (height follows its square root); each cascade also has an amplitude multiplier.
Wind, fetch, spread and swell shape rebake; choppiness, foam recovery and playback speed update live. Shore
amplitude, wavelength, speed and steepness update the shared surface/receiver motion and spray. Water optics,
foam, reflection gain/cap/tint, caustics, spray amount/size and underwater scattering/shafts/meniscus are live.
Sun elevation, azimuth, intensity, cloud coverage, turbidity and time of day rebake the existing sky cube and
matching sun/hemisphere lighting after editing; a brief stall is possible. This does not start a day/night cycle.
Post controls cover exposure compensation, automatic exposure, key value, contrast and saturation around the
selected tone curve, plus optional **bloom on**, **bloomStrength** (0–0.5, step .001) and **bloomThreshold**
(0–10, step .01). Bloom starts off on desktop and mobile; first enable uses the reference's .05 strength and
1.5 threshold. All three controls join Copy, Apply, group/all Reset and tuning-only persistence. The JSON keys
are `post.bloom` (0 or 1), `post.bloomStrength` and `post.bloomThreshold`. Quality resolution scales the shared
scene pass, retaining adaptive DPR ownership.

When an AgX comparison is selected in Looks, **AgX look** in Post selects **Current** (power 1.12 / saturation 1.3), **Stock AgX**
(1 / 1, no look), or **Punchy** (1.35 / 1.4). The `agxPower` (0.5–2) and `agxSaturation` (0–2)
sliders update the existing graph immediately; unmatched pairs display **Custom**. Slope stays 1.
These are `post.agxPower` and `post.agxSaturation` in Copy/Apply and tuning-only persistence; both
group and all Reset restore Current. The selector is derived from the numbers, so pasted and reloaded
settings cannot leave its name stale. Exposure compensation remains separate.

The look stays after the AgX contrast polynomial in its encoded/log domain, before outset, linearization
and conversion back to sRGB. Local three.js r187 (`ToneMappingFunctions.js` and
`tonemapping_pars_fragment.glsl.js`) confirms this insertion point and has no Punchy implementation.
The local Ultra Water `src/engine/PostFX.js` confirms the existing power-then-luminance/saturation
operation and 1.12 / 1.3 defaults. Punchy's 1.35 / 1.4 values follow the owner's supplied Minimal AgX /
Filament reference; those upstream implementations were not independently verified because this task
allowed no external network access. Golden is omitted. This is a preset for Boogle's existing graph,
not a claim of bit-for-bit Filament output.

Without Dev/tuning, the production Neutral graph uses literal constants; no tuning
uniforms or saved overrides enter the shader. These controls are Local viewer preferences, with no
shared state or lockstep changes.

Bloom ports Ultra Water `PostFX.js`'s six-level 13-tap downsample / nine-tap additive tent reconstruction to TSL,
including its per-tap 64-luminance clamp, half-threshold soft knee and first-level Karis weights. Three's BloomNode
uses five separable Gaussian levels and a different high-pass/weighting, so its .05 would not mean the same look.
This extends the one `pipeline.outputNode`: underwater HDR → bloom addition → exposure → selected tone curve → sRGB.
The reference's 11 filtering draws need one extra HDR materialization here because underwater is an expression;
there are **12 additional draws while enabled**, no second scene render, renderer or frame loop. Upsampling uses
separate additive targets instead of attachment blending. The exposure meter still reads the unbloomed scene.

The optional graph and native pipelines are built **when first enabled**, on the next real draw, which can briefly
stall. Saved tuning overrides restored before the loading warm-up are included in `precompile`'s normal frame
path. No bloom graph or targets exist at ordinary startup. Off and zero strength select the original cached output
graph, removing every bloom dependency and pass; positive strength/threshold edits change uniforms only. Previously
enabled targets remain allocated for reuse until water disposal, but do no work while disconnected. Without `tune=1`,
there are no bloom uniforms, restored overrides, passes or changes to the output shader's arithmetic.

### Bloom verification (3 November 2026)

On this M1 Max, hardware WebGPU/Metal, fixed DPR 1, full-resolution scene/output and stored 4× MSAA,
the place shoreline camera `(900,10,120) → (950,3,180)` was measured in two sessions per resolution.
Each session used off / .05 / off / .05 / enabled-with-zero-strength / off, three real seconds per segment.
These are **earliest GPU start to latest GPU end across render and compute**, not summed pass timers.
The capture corrects r187's resumed-pass timestamp ownership, following the shore-water measurement.
All 4,285 sampled frames had valid ranges, with no missing or partial timestamp coverage.

| Physical pixels | Off: segment means | .05 / 1.5: segment means | Zero strength: segment means | Off / on p95 ranges          |
| --------------- | ------------------ | ------------------------ | ---------------------------- | ---------------------------- |
| 1210×702        | 6.28–7.02 ms       | 6.79–9.04 ms             | 6.13–6.57 ms                 | 7.66–9.59 / 8.05–15.13 ms    |
| 2880×1800       | 10.89–21.19 ms     | 10.58–26.80 ms           | 10.89–13.90 ms               | 12.70–40.19 / 11.67–38.49 ms |

**Shared GPU, contended even on repeat:** other headless Chromium groups and WebKit GPU activity were observed.
The drift can exceed the bloom increment or reverse its sign; these samples do not establish isolated incremental
cost. They do establish the bypass: 7 renderer passes off/zero versus 19 on, with 12 additional fullscreen draws
and no additional scene draw. Raw per-frame spans and the measurement helper accompany the manifests:
[1210 first](../../.look/evidence/1793773333700-25988/evidence.json),
[1210 repeat](../../.look/evidence/1793774026144-55152/evidence.json),
[2880 first](../../.look/evidence/1793773413237-28023/evidence.json),
[2880 repeat](../../.look/evidence/1793773949850-53766/evidence.json).

Opened matching-camera off/.05/.2 stills of glints, sky, head stars and underwater, plus plain-shore and panel
stills. **.05 is visible on water glints**, as a faint soft glow; .2 is conspicuous and washes out contrast.
The sky already has an atmospheric sun halo, so .05 is barely perceptible there. The actual head-star sprites
remain dark: .2 mainly lifts surrounding haze, rather than making them glow. Their unlit texture is below the
useful threshold; bloom does not repair that material/exposure issue. The stars were held in a staged knockdown
pose with unchanged materials; the water spectrum was frozen for comparisons. At the plain shore, .05 lifts
the dark cliff slightly without an obvious bright edge rim. Underwater retains its caustics, scattering and
lens treatment without graphics errors; moving snow/droplets were not frozen.
Representative manifests: [glints](../../.look/evidence/1793773700407-43118/evidence.json),
[sky](../../.look/evidence/1793773729568-44242/evidence.json),
[stars](../../.look/evidence/1793773758343-45642/evidence.json),
[shore](../../.look/evidence/1793773896871-51831/evidence.json),
[underwater](../../.look/evidence/1793773865407-50410/evidence.json).

Copy/Apply, group/all Reset, invalid-toggle rejection and live zero bypass passed the
[panel exercise](../../.look/evidence/1793773588100-37314/evidence.json).
A [real saved-on reload](../../.look/evidence/1793774074306-56432/evidence.json) restored .05/1.5 and built bloom
pipelines at 5.13–5.94 s, before reveal at 5.98 s; no late pipelines were recorded. The
[same saved overrides without tune](../../.look/evidence/1793774114770-55150/evidence.json) produced no bloom
bindings or pipelines and no late pipelines. Enabling during play builds on that draw; toggling graphs can
rebuild native variants, while positive-strength/threshold edits stay uniform-only. No changes to `precompile.ts`.
The [full place bot](../../.look/evidence/1793774167853-60024/evidence.json) completed every expected beat
with .05 bloom, zero errors and 78 checkpoints; the solo run did not mark co-op. Its report and end still were
read. [Smoke and world-inputs](../../.look/evidence/1793774462698-60023/evidence.json) passed, as did `npm run check`.
Real-time feel, isolated GPU timing and mobile-device performance remain unverified.

### Other controls and limits

The panel lists the demo controls that are unavailable: camera presets and uncapped benchmark are demo tools;
floater spawn/drop/clear and drag/angularDrag/buoyancy belong to gameplay bodies; planar `reflections`,
`reflectionScale` and `reflectionDistort` have no production reflection target. Refraction distortion is adjustable
on the existing production path. Colour presets and clarity are
represented by the editable absorption, scatter and foam tint. Neutral is the production curve. MSAA and
automatic resolution belong to the shared renderer, and distance fog belongs to the place/cave route. FFT size,
cascade topology, polar mesh resolution, foam/shore bake dimensions, shaft steps and snow count require resource
rebuilds and are intentionally omitted. Additional uniforms and grading arithmetic are enabled only on tuning visits;
the flag-off shader graphs retain their constants and do not restore saved overrides.

Production `water=new` also serves the opt-in home shore slice (`classic=1&shore=smooth-detail&shoreRocks=1`).
Real registered rock/support contacts each retain eight world-fixed spray sites, including later-built supports;
the 512-contact registry bounds that list. Provider obstacles retain their separate 256-site cap. Spray still
uses the shared particle pool with at most 96 emissions per frame and 420 per rolling second, before particle upload.
Its receivers carry the demo-strength shallow caustic net, moving wetness and swash lace; contacts and bed data
follow the slice. Wet receiver sheen uses continuous vertex normals instead of turning dry terrain facets into
white triangles. The surface rejects faces on the wrong side of the camera, using the existing GPU lens-depth
query and the reference's half-metre transition band; genuine submerged views retain the underside.
See [shore seam validation](../research/water-shore-seams.md) for evidence and remaining limits.

Place's 2 m bed is stored on its actual terrain vertices and sampled on the same triangle diagonal. Wave damping,
bed clamping and receivers therefore follow the drawn bank, instead of a twice-filtered approximation. Travel-time
and shore-distance fields keep their smoothing. These are Local rendering/query changes; Owner physics and all
shared state retain their existing ownership and messages.

Ultra Water's scene, rewritten in TypeScript and TSL inside Boogle's single WebGPU renderer. The default starts
from the demo's Lagoon view; `&v=pop` keeps our previous colour grade over the same scene. The gut question is
**Does this look like the demo, here?** Serves DESIGN.md **Toys before chores** and **Show, don't tell**.

The owner's 2 November feedback is recorded under Look in [boogle-2.md](../proposals/boogle-2.md). The supplied
1210×702 desktop demo shots take precedence over an inferred look. Research and architecture comparison:
[ultra-water.md](../research/ultra-water.md); numerical diagnosis, source audit and reproducible measurements:
[water-demo-diagnosis.md](../research/water-demo-diagnosis.md). Adapted code is attributed in
`public/THIRD_PARTY_NOTICES.md`, including Ultra Water, Epic's Hillaire atmosphere, three.js clouds/AgX and Hoskins hashes.

## What you see and do

- The unscaled source island sits at world `(2400,0)`: 2400 m terrain, 384 segments, its mountain ridges and the
  seabed down to −34 m. A 512² shore field covers 1800 m. One height function feeds terrain, collider and shore bake.
- The source's 90 shore rocks and hero rock use its positions, RNG sequence and orientation; the hero scale is
  `(9,6,7.5)`, placed at ground height minus 1.6 m. The old toy terrain/tree branch is removed rather than maintained.
- The camera opens on the source Lagoon shot (50° FOV); movement returns to normal player follow. Walk, wade and
  swim as usual; Space / A / Jump swims up. Manual dive controls were removed on 3 November; the underwater look
  remains whenever the camera dips under. The automatic plunge is staged on `water=new` in the player controller.
  Rendering is Local; the existing Rapier player remains Owner.
- Four FFT cascades are the default. Source depth damping replaces long swell with shore waves near land, and
  troughs clamp above the bed at the displaced position. Shore wavelength is 30 m and amplitude .55 m.
- Actual opaque terrain and rock colour/depth are read **in-pass** using TSL `viewportTexture` and
  `viewportDepthTexture`. The colour snapshot uses `viewportTexture` so all refraction offsets reuse one copy
  per frame (r187's `viewportSharedTexture` repeats the copy for each sample node). Depth validation rejects
  refraction offsets into foreground objects; Beer–Lambert
  absorption colours the real bed. Actual obstacle depth drives contact foam. No synthesized bed remains.
- Wave-driven caustics refract the cubic-filtered 12 m FFT slope grid onto 1.5, 4 and 10 m depth planes. Additive
  area-ratio rasterization makes the bright sand net; it multiplies direct sunlight on both ground and rocks.
- Hillaire transmittance, multiple-scattering and sky-view LUTs plus clouds are baked into a mipmapped HDR cube
  when the sun changes. The cube feeds background, roughness-dependent water reflection, terrain ambient and fog.
- This **prototype's starting point** uses the source's metered exposure and AgX through `pipeline.outputNode`.
  Its curve and meter are shared from `src/render/tone.ts`; the optional `&tone=neutral|agx|agx-sat|aces`
  comparison changes the curve/exposure trim before the existing vignette and dither, retaining the underwater composite.
  **The game's standing Neutral choice is unchanged.** No edits to `src/render/scene.ts`, second renderer or
  second frame loop are needed. Bloom is omitted: the source's faint .05 bloom did not justify its 12 passes here.
- The source near/far planes are .5 / 80000 m. Terrain/water aerial fog uses 1/18000 m; source shadow bounds are
  ±900 m with a 4096 map. These settings apply only on this prototype page.
- Underwater treatment remains: Snell's window now transmits opaque objects, depth-dependent absorption,
  half-resolution light shafts, 6000 marine-snow sprites, a GPU near-plane waterline grid and wet-lens droplets.
  Shafts still use plain illumination rather than caustic or floater shadow modulation.

## Tuning and measurements

`ULTRA.waveScale = .25` is an **energy** multiplier, halving every source spectral amplitude without reshaping it.
The seeded field's deep-water significant height is **13.899 m before → 6.949 m after**; chopped RMS slope is
**.579 → .277**. This remains a large stylized swell, not a physical 9 m/s wind sea. The source itself measures
13.236 m with its PCG realization; its Gaussian/pair convention produces eight times the integrated directional
variance, and it adds a strong long-fetch swell. The wind-only JONSWAP integral is about 2.026 m Hs.

A .02 energy candidate gave 1.966 m Hs, but visibly erased the supplied demo's caustic net and fine-wave detail;
it also restored broad unresolved Cox–Munk roughness. The visual target won over that physical normalization.
The final source-shaped .25 setting is a measured art choice, not a claim that the source's spectrum is physically normalized.

In 601 samples over a minute, the sheltered Lagoon waterline's vertical range is **.058 → .044 m**; horizontal FFT
excursion is **.032 → .018 m**. Long-swell weight is exactly zero there. At .5/1/2/5 m Lagoon depths, full ranges
are **.327/.966/1.363/.882 m** after; exposed-coast ranges are larger. Full before/after tables and coordinates are
in the diagnosis. These are CPU mirrors of the rendered field, including half-float maps, LOD, horizontal inversion
and trough clamp; finite GPU triangulation and the 10 Hz sample interval limit their precision.

## Options

- `?proto=water`: demo scene and Lagoon opening; `&v=pop`: previous saturation/absorption/reflection grade.
- `&q=high|mobile`: touch devices start on mobile, the demo's 0.6 resolution; everything else on high. `q=` overrides.
  Mobile draws the world at 0.6 of the maximum device pixel ratio, normalized against adaptive resolution's
  current 0.6–1 ratio so the scales never multiply down to 0.36. AgX/output remains at the adaptive canvas size.
  Stored 4× MSAA, all four FFT bands, wave energy, 384-segment grid and the 4096 shadow map stay the same.
  Both profiles retain full caustic and terrain detail and omit bloom. The cheap caustic/terrain options below are
  diagnostics, not the mobile defaults.
- `&shot=lagoon|breakers|surf-rock|open-ocean`: source camera and sun presets, translated only by the island offset.
- `&waves=analytic`: earlier analytic wave diagnostic; it has no FFT caustics.
- `&n=128`, `&cascades=1..4`, `&band=0..3`: FFT cost diagnostics. Caustics require band 2.
- `&ocean=off`, `&grid=192`, `&groundFlat=1`, `&rockFlat=1`: visual/cost diagnostics.
- `&waterCopy=repeat`: the old redundant colour copies, for cost comparisons only.
- `&waterScale=0.6|1`, `&waterTerrain=full|cheap`, `&waterCaustics=full|cheap`: isolate the mobile settings.
  They do not change `q` or saved adaptive-resolution preferences. Timing and device requests are in the
  [validation report](../research/water-demo-validation.md).
- `raw` is no longer a distinct variant; toy terrain is not carried forward.

## Render budget and limits

- FFT: one compute pass containing 10 dispatches; no additional ocean simulation for caustics.
- Caustics: two 4× MSAA raster targets, three grid draws. High's mip chains add 17 internal reductions: **19 GPU
  passes / 20 draws** total. Mobile has 15 reductions: **17 passes / 18 draws**. Renderer counters omit these mip draws.
- Exposure: two tiny raster passes/draws (32² meter and 1² adaptation), plus a 16-byte history copy; AgX shares
  the existing fullscreen output draw. No CPU readback and no new full-screen composite.
- Refraction: opaque HDR colour and depth snapshot copies interrupt/resume the current scene pass, without
  drawing the scene again. The original 4× MSAA colour/depth store settings are preserved.
- Sky changes: CPU atmosphere LUT quadrature (about 1 s measured at the first sun), six 1024² cube draws, cube mips
  and native environment PMREM. None of this rebakes every frame.
- The source terrain remains one draw and rocks one instanced draw. The former toy trees are gone.
- Underwater: the existing 64×36 lens compute, one half-resolution shaft draw and one snow draw activate near
  or below water; the existing output composite handles lens drops. Far above water they add no draws.
- Remaining omissions are planar terrain/rock reflections, water-surface shadow sampling and floater shadows.
  Source PCG versus our mulberry32 gives different wave phases; reduced spectrum energy intentionally gives
  calmer ocean relief and somewhat weaker Lagoon caustic contrast. Terrain noise remains the existing filtered
  periodic bake rather than evaluating all source noise per fragment.

Final camera tables, comparison boards, consecutive recording frames and validation are recorded in
[water-demo-validation.md](../research/water-demo-validation.md). Captured frames are not real-time viewing:
feel, frame pacing and iPad performance remain unverified.

The staged [water graduation](../plans/water-graduation.md) makes this demo a client of the shared production
surface, FFT, spectrum, foam and shore bake under `src/render/water/`. Its wrapper supplies the same explicit demo
origin, look, reference sky, hero-rock foam and diagnostic settings. Its sky files, scene and `post.ts` remain;
`water=new` is ignored on this demo page, preventing a second FFT/sea instance. The default game still uses its old sea.
