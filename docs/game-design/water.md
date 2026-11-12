# 6.26b Water

The sea as it is now is [The sea (10 November 2026)](#the-sea-10-november-2026). Sections dated before 10 November
describe Ultra Water (FFT cascades, shore atlas, spray, contacts, underwater volume and lens), which was removed
that day and is kept in the local tag `archive/water-ultra-2026-11-09`; read them as history.

## Visual pipeline stages 0–1 (5 November 2026)

The iPhone follow-up (5 November, 23:45: clouds too bright and lighting too warm) is compared by
`dev/look/beats/cloud-warmth.ts` (a Place board, deleted at M13c; in git history) at the real first-visit landing camera and the existing town doorway.
Local authoring controls `sky.cloudBrightness` (1/.8/.6, cloud radiance before atmospheric compositing) and
`sky.lightColourProfile` (0=original, 1=neutral, 2=slightly cool) now default to .8 and 1: the owner selected
cell 5 on 6 November. The latter preserves
each light colour's linear luminance while replacing key, upper fill and ground fill chromaticity; profiles
are not measured Kelvin temperatures. Neutral uses equal linear RGB; cool uses RGB .9/.97/1.1 normalized
to the source luminance. Gain stays .12, key/fill gains stay 1.12/3.2, and no post white-balance grade is added.
Cloud edits rebake the sky cube and re-read hemisphere irradiance, affecting sky, haze and water reflections
together. Coverage and cloud shape stay fixed. `prepareFrozenLighting()` finishes the queued preparation
without advancing simulation or shader time; frozen capture waits for it before effective light readback.
Prepared evening visits do not expose the cloud edit. The separate first-visit 3D cloud deck and white
crossing overlay are unchanged: the fixture captures after landing and control release. Morning-reference
cell 1 reconstructs the recorded settings on the current build; accepted cell 5 is outlined. Device replay remains open.
The actual first gameplay camera points down, with no sky in frame. A separately labelled upward glance
from that same spawn position supplements its board; it is not presented as the first gameplay framing.

The owner comparison used `dev/look/beats/visual-pipeline.ts` (a Place board, deleted at M13c; in git history): fixed Neutral, bloom off and full fixed resolution,
surface gain 0.12/0.14/0.16 against current key/fill 1.12/3.2, softer 0.96/4, and stronger 1.28/2.4.
Calibration/Buddy, town/doorway and shore/horizon are authored fixtures, not played progression. Cell 1 rebuilds
the recorded morning settings on current source; it is not an archived morning screenshot. Defaults stay 0.12,
1.12/3.2 and underwater +0.81 EV, retained by the owner's 6 November town-cell-1 choice. This historical wedge
explicitly retains the original cloud/profile settings; `cloud-defaults.ts` compares the accepted combined look.
Material and later pipeline passes have not started.

The colour audit corrects missing sRGB tags on the coloured canvas textures for honk sparkles, the frisbee
twinkle and lighthouse halo. Their authored colours and alpha stay the same; RGB now decodes once into linear
light, like the existing physical-board and name-label textures. White-only alpha masks remain data textures.
The palette before/after control was `dev/look/beats/colour-textures.ts` (a Place board, deleted at M13c); it reproduced the texture RGB transfer,
not the live effects' motion or additive composition. Readable compensation remains scoped to existing ink and
reward owners; physical boards receive scene light and shadows.

## Agent tuning proof (5 November 2026)

`?proto=place&tune=1&t.post.centre=0.24` applies a Local surface gain after saved appearance restoration.
`boogle.dev.run('tunables', 'get', {id: 'post.centre'})` reports its resolved value and provenance; `set`
uses the existing uniform binding, with no new pass, draw call or frame scan. Unsupported routes report
reload-required. The value is transient, bounded to 0.01–2, and included with defaults, build and starting
setup in tuning snapshots and playtest data. Resetting it changes appearance only.

## Prepared evening preview (5 November 2026)

Local, off by default: `?proto=place&evening=1` opens the authored evening; `&evening=preview`
prepares both looks but opens in day. `setEveningLook(true | false)` from
`src/render/water/evening-transition.ts` is the single future milestone seam: it starts a 0.45 s cover,
exchanges the prepared package while fully covered, then reveals over 0.65 s. It returns false without
the opt-in sea or during an active fade. No room state, save, milestone trigger or night is implemented.
DESIGN.md 11, Show, don't tell: the future completed line earns a warmer view, without changing activities.

Following [research recommendations 1–4](../research/water-times-of-day.md#numbered-recommendations-for-boogle-d),
loading prepares the existing 1024-face day cube and a second 1024-face evening cube, both filtered environments
and both hemisphere fills. Evening uses 12° solar elevation, 255° azimuth, turbidity 3.2 and cloud coverage .3.
The same stable sampling nodes feed water, underwater, snow, fog and sky; the existing key and hemisphere lights
switch together. Water chemistry, FFT and caustic simulation stay intact. The 5 November colour defaults apply
surface gain 0.12, underwater +0.81 EV, key 1.12 and fill 3.2 to both prepared endpoints; evening's authored sky
values are unchanged. See [the rebased comparison](../research/color-defaults.md) for the resulting sign/shade readability.
The fade is a Local DOM veil owned/disposed by the sea, with no extra render pass or light. Authoring sky-rebake
controls are inactive while prepared evening is enabled. No sky allocation/bake is added on ordinary visits.
The two raw/filtered pairs model approximately 256 MiB before scratch/LUTs, not measured residency;
both prepared endpoints use the one 1024 size. Device memory acceptance remains separate work. The experiment makes no device budget claim.

### Evening verification (5 November)

Rendering code is committed at `6ae679d6`; these final manifests report that clean tree unchanged throughout:
[day](../../.look/evidence/1793899706630-10609/evidence.json),
[evening](../../.look/evidence/1793899707685-10662/evidence.json),
[fade](../../.look/evidence/1793899705251-10605/evidence.json),
[world-inputs](../../.look/evidence/1793899709238-10674/evidence.json),
[full evening bot](../../.look/evidence/1793899840118-18102/evidence.json).
`npm run check` passed, including 330 unit tests; repeated successfully with the installed Node 26.13.0.
The final bot completed every expected beat with 83 checkpoints and no page/graphics errors. Its report and
end still were read. The solo bot does not mark co-op or crystal collection; the latter was exercised in the
explicit visual fixture, not inferred from the bot.

Opened both final `station`, `town`, `shore`, `sign`, `crate`, `crystal` and `crystal-burst` PNGs.
The fixture stages Station 2; matched camera coordinates were checked in the logs. Actors, gifts and particles
are live, not pixel-frozen. Evening gives long warm shadows and a gold reflection over teal water. Station bills,
sign ink, crate glow and pale crystal particles remain distinct; shaded walls and the crate body are darker.
The bank's stippled edge exists in both looks and was not changed. No copy was edited, and no suspect Boogler
line was identified in this visual review.

Opened the fade motion sheet, end still, curves and a consecutive-frame strip decoded with ffmpeg from its
recorded video. The veil covers the exchange and day returns; a finished roof obstructs much of that camera.
The sampled day/evening/restored counts are **284/284/284 draws, five render passes and 92 textures**,
with one bake per sky throughout and exposure fixed at .16 / +.81 EV. These are counts, not timing evidence.
The [shore repeat](../../.look/evidence/1793899797008-16026/evidence.json) retains a clearer opened motion sheet,
stills and curves, and **320/320/320 draws**, five passes and 92 textures, but timed out at video export
(status 124, no video). It is a failed capture, not a substitute video pass.

Retained failures: [first bot](../../.look/evidence/1793898921105-89949/evidence.json) omitted `shot=play`;
[second bot](../../.look/evidence/1793899034816-94958/evidence.json) completed the pier but hit the ordinary
wall cutoff before the remaining visits. Their reports and end stills were inspected. The final `--long` run
above resolves completion without gameplay changes. Quiet reruns are still needed for transition smoothness,
load/first-switch timing and sustained GPU cost; mobile memory, device behavior and human feel are unverified.

Execution departures: `npm run inflight` fetched remote refs before its network behavior was noticed, contrary
to this task's local-only network constraint. No push or ship was performed. Initial commands and broker clients
used the shell's Node 24; the final full check used Node 26. No room-time, wire, milestone or night work was added.
Not tested on a device.

## Graduation scope (4 November 2026)

Place (including the default address) and crossing now own the replacement sea without a URL switch.
`water=new` and `water=old` are ignored; old links run their route normally. The demo is archived under
`archive/water`, and the replaced sea under `archive/old-sea`; both tags already existed. The water card is archived.
No demo island, teleport, CCD/soft-wall override, demo camera/sky/fog owner or crossing sea rectangles remain.
The parked sky prototype retains its clouds, but its obsolete water-horizon seam is removed.

**Classic-home exception:** classic and its home-based prototype clients retain the isolated `classic-sea.ts`.
The trial passed world-inputs, smoke and caves, but their local Metal times rose from 2.9/5.4/5.8 s to
5.2/13.8/9.1 s. Linux software-WebGPU CI cost could not be qualified through this Mac-only broker. Per the
owner's fallback, classic migration stops here. Its packed height texture and sine material are private and
allocated only when classic creates its sea; production exposes no old material-patch API. This is a route
choice, not an opt-in switch. Live tuning and Looks remain available on Place and crossing.

The [removal handoff](../plans/water-graduation.md#step-78-removal-handoff-4-november-2026) records
matched frame costs, opened views, final solo/co-op routes, retained failures and device limits.
The real iPhone and the owner's replay remain untested; the code is committed for review, not shipped.

The surface retains four 256² FFT cascades, `.25` spectral energy, real terrain bathymetry, shallow caustics,
swash, foam, spray, refraction, underwater shafts/snow and exit droplets. The frozen late-morning sky bakes
once behind loading at `tod=0.24`; Neutral remains the default output after underwater HDR and exposure.
Surface swimming and automatic high-fall plunges are unchanged; there is no new input or breath mechanic.
Desktop remains high and coarse-pointer/mobile quality remains 0.6 world resolution. Camera and fog ranges stay.

Place's visible seabed continues beyond its rectangular terrain grid along the shore atlas's smooth offshore
apron. A deeper render-only tail ends at 240 m below sea level, where even blue seabed transmission is below
0.05%, so refraction cannot expose another bright rectangle. The extension shares the terrain draw and material;
the authored shore, collider and bed-validity/query bounds are unchanged. Near-shore turquoise, Neutral output
and the frozen sky retain their existing parameters.
Submerged receivers skip swash samples below its existing −0.3 m cutoff and shore/caustic samples past
the existing 24 m caustic fade; wetness and absorption still apply, with no new draw or texture pass.
The optional cove sand profile keeps submerged pigment fully wet across that cutoff; only its exposed
beach follows backwash drying. This prevents a fixed angular dry-colour contour beneath moving water.

The bounded GPU query contract and cave composition are described in [island water](island.md); the force
values remain in [player swimming](player.md#swim). Research under `docs/research/` is historical evidence,
including obsolete demo addresses and paths. The original demo design/options remain in `archive/water`.
`public/THIRD_PARTY_NOTICES.md` retains Ultra Water, atmosphere, cloud, AgX and noise attribution in builds.

## Real-sea output (5 November 2026)

The default Place and crossing sea uses Neutral after the underwater HDR composite, with an authored fixed
surface gain **0.12** for the frozen late-morning lighting. The signed camera-depth signal adds **+0.81 EV**
through smoothstep over **0–1.5 m**, reaching **0.210385** submerged. The owner chose round two's scene lights
**for now** on 5 November: key gain **1.12**, fill gain **3.2**, with the round-five selective colour and lit boards.
This reuses `codex/color-vibrance-3`'s width-zero bounded output;
the meter is no longer constructed, so both meter draws and the history copy stop. HDR targets, sky,
and water optics retain their existing values. Looks' **Current** matches
this output; **Sunny toys** and **AgX Punchy** retain AgX comparisons. The frozen late-morning sky, water
parameters and terrain are unchanged. The earlier .16 calibration is retained in [measurements](../research/fixed-exposure.md) as history.
Dev Water/Post shows these new defaults and resets to them through the existing bindings.
Camera-facing scoped ink and new reward particles compensate the inverse surface gain; physical painted boards,
the price atlas, smoke and dust do not.

## The summer sky (6 November 2026)

The owner chose `summer` as the daytime sky ("I like the colors there"), so it is the sky of the real sea
(Place and crossing) with no flag. `water/sky-art.ts` bakes it through the same `createWaterSkyFor()` cube used by
water, fog, PBR reflections and hemisphere fill: original direction-space cumulus, thirteen uneven clusters with varied
aspect/size, soft bases and a saturated blue ramp with horizon haze. It keeps current water, production Neutral post,
surface gain .12, key/fill 1.12/3.2, cloud radiance .8 and neutral scene lights (owner cell 5); only cloud radiance
changes with the art, and the physical sun direction and water's solar lobe remain. The cube is 512 per face (owner,
9 November: "halving sky texture feels fine"), 16 MiB with mips against 64 MiB at 1024; its blur levels keep the
1024 cube's angles. Matched desktop stills of the horizon, sun, clouds and the water's reflection at Far Head and the
cove could not tell the two apart, so 512 is used everywhere; `skyCube=1024` brings back the old size to compare.
Recipe values live in `sky-art.ts`; edit and reload. Cube RGB contains no sun disc, and alpha remains sun
transmittance. `inspect()` reports the cube payload, bake count, CPU bake submission time and readiness; none establish
device residency or real-time smoothness. No shared state, network shapes or gameplay change.

Windpaint, the toy sky (`sky=toy`, `toyWater`, `toyTone`, `toyVariant`), the `sky=` selector and `skySize` are
archived and removed; the [skybox research](../research/skybox.md) and
[Sunshine sky](../research/sunshine-sky.md) keep their history. Classic keeps its own sea and day/night sky.
Evening is decided later: `evening=1|preview` still prepares the procedural evening atmosphere beside the summer day.
GOBI remains pending the actual pack and source-page licence verification.

## The sea (10 November 2026)

The owner's calls, verbatim:

- 9 November, the target: Super Mario Sunshine's water and grading, "really efficient for mobile without issue"
  ([plan](../plans/water-sunshine.md), [research](../research/water-sunshine.md)).
- 9 November, the pick: "Let's go with water B and fully clean up. also fix the geometry of the shallow bed so it
  matches the terrain more realistically than the sharp edges/squares it has today".
- 10 November: "since underwater doesn't matter, is that taken account for the water optimizations?"
- 10 November: "yeah no essentially we should rebuild the water from scratch, we don't need almost anything from
  ultra water and don't want to carry the perf baggage".
- 10 November: "I do like that the water has the lighter blue and foam near shore, so make sure something like
  that stays, it should still be cheap".
- 10 November: "the water should look somewhere in the range of Mario odyssey and Mario sunshine".

Ultra Water (the FFT sea, its shore atlas and per-shore travel solve, caustics producer passes, GPU height queries,
framebuffer colour copy, per-pixel contact loop, glitter, breakers and their spray, marine snow, the underwater
volume with its lens droplets, shafts and Snell window, and the underwater exposure offset) and candidate A were
removed on 10 November. The local tag `archive/water-ultra-2026-11-09` keeps them. There is no `water` setting and no
`?water=`.

**What is drawn.** One blended plane after the opaques (`src/render/water/surface.ts`): a polar grid of about 9,300
vertices around the camera (scaled with height, then one flat skirt to the far plane; 48 spokes on the phone ladder's
sea rung), lifted by four slow vertical sines (`swell.ts`, 0.05–0.12 m, still in the first 6 m of depth). Colour comes
from depth in three stops (#6fe0d0 shallow, #19b5cf, #1667b8 deep), lit by the same sun and fill as the sand. Two
scrolling samples of our own 128² wave cell (Worley lines, `art.ts`; the second at twice the weight) make the pattern;
a sparkle band where one pixel covers a few texels makes the mid-distance glitter, with the sun lane in it. The sand
shows through the first 2.5 m; a foam lip rides the waterline; the sky is a Fresnel reflection of a two-colour gradient (horizon and zenith read once from a healthy summer bake, so the sea reads no sky texture); impact
ripples ring out from splashes in the same draw. One opaque-depth copy gives white foam wherever anything meets the
water (rocks, legs, swimmers, floating things) and a soft waterline against rock. The light cyan shallows and the
foam lip are the owner's must-keeps: per sea pixel they cost one coast-texture read and a few multiply-adds.

**The coast texture** (`coast.ts`, RG16F, about 1 m a texel over every registered shore plus 120 m of sea, packed
as one row per region: Home and Place 2015 × 780, Ring Island's shore (`src/entities/ring-island/shore.ts`, since
R2b) 990 × 960, so 2015 × 1740 texels and **14.0 MB** (14,024,400 bytes, measured 10 November; 6.3 MB before the
island), baked in about 0.54 s at load on a loaded machine) is baked once per shore revision from the providers' own bed functions: G is the real bed (continued past
a grid's edge by the terrain's own offshore apron), which the swell's fade, the clear shallows and the foam lip read;
R is the bed the colour reads. In the shallows (to 4.5 m) R is the real bed; past them it is a shelf that falls away
from the shaped coast, gently off beaches (0.1 m per m) and fast under cliffs (0.7 m per m, by how high the land
stands in the 6 m behind the waterline, averaged over 30 m of coast), easing toward 34.5 m. So Place's flat 5 m
grid floor and its square edge no longer show as a cyan rectangle from the summit, the telescope or the trestle.
Swimming, plunges and floating things read the real bed on the CPU (`field.ts`); no terrain height changed.

**Seabed light.** One baked 256² caustic tile (`caustics.ts`, 0.35 MB with mips), sampled twice as it scrolls,
lights the ground under the shallows through the receivers (`receivers.ts`), which also darken wet ground and tint
it by the water above. Each web adds its own faint lines as well as their crossings, so the net reads up close.
The receivers' cost is per terrain pixel under or at the water: two tile reads and a few multiply-adds; no pass.

**Underwater** is one flat fog in the existing output quad (`underwater.ts`): the CPU water field says whether the
camera is under; if so, the scene's depth fogs toward the sea's deep colour (a cave pond's is near black). Dry
frames pay one uniform branch. From below there is no surface (the sea is front-face only), so looking up shows fog.

**Between Sunshine and Odyssey** (owner, 10 November: "the water should look somewhere in the range of Mario odyssey
and Mario sunshine"). One shader, two presets on one Dev-only value (`sun.look`, Water group on tuning visits; not a
player setting). 0, Sunshine-ish: flat readable colour in two smoothstep bands, crisp cells, a broken foam lip.
1, Odyssey-ish, **the default** (owner, 10 November, on seeing both: "Yeah ship the odyssey one if not already"): the same three colours along exponential falloffs (no band edge), sand clear for
longer (opacity 0.12 at the waterline, clear to 3.5 m), a soft rounded lip, mostly whole, 1.5 times wider and
breathing ±35% on a slow wave, a soft sun glint band on the swell itself, and cells 1.6 times larger with gentler
sparkle and softer lines. Both keep the cyan shallows, the sparkle and the foam lip. The difference costs only
arithmetic per sea pixel (two exponentials, one sine and a few mixes; the same five texture reads, one draw), and with
tuning off the value is a constant. Sunshine-ish is one constant away: `SUN.look` in `surface.ts`. No refraction,
colour copy, real reflections, FFT or Nintendo assets.

**The sky** (owner, 10 November: "do we still use sky? we can remove otherwise", then "Can we remove any of the fog
or lighing source if its not being used?"). The sea's reflection and haze and the scene's distance fog read two
colours taken once from a healthy summer bake (`skyGradient` in `sky-art.ts`; below the horizon, the horizon colour),
and the hemisphere fill is two constants from the same bake (`FILL` in `frozen-sky.ts`), so none of them reads the
cube. Matched stills at the cove, Far Head toward the sun, Far Head, the summit, Home and the museum look the same. The
cube remains the visible summer sky the owner chose on 6 November (the background: clouds, sun lane and haze) and
the PBR environment; the load still reads four of its texels to catch a black bake (9 November, iPhone) and fall back
to the flat sky, and the opt-in evening proof still reads its own fill. It is the 512 cube, about 16 MiB with mips,
baked once behind loading (atmosphere tables on the CPU, six face draws, a mip chain). Dev rebakes of the sky no
longer move the fill, fog or sea colours.

**Cost, Ultra (main at `f4481457`) against now**, same session, same five poses (cove, pier head, Far Head, summit,
telescope), 1180×820 on the Mac; counts, not timings (the machine was loaded, so no GPU times are claimed): render
passes 5–6 → 3; compute dispatches 13–14 → 1–2 (all now the shared particle pool's, none water's); framebuffer
copies 2 → 1 (the depth copy); triangles 1.10–1.65 M → 0.68–1.23 M (about 420 k fewer everywhere); GPU textures
212.9 → 128.8 MB, storage buffers 14.9 → 0.2 MB, total 265.1 → 158.3 MB. Draws read 11–29 higher now at every pose;
not explained here. The loaded water code is 30.4 kB (13.4 kB gzip) against 64.2 kB (28.0 kB) for Ultra's chunk
plus the candidates'; the Dev tuning panel 20.1 against 23.0 kB. Per-frame CPU: the swell phases, the field publish,
a shore-revision check and the camera's water lookup for the fog.

**Kept for gameplay:** the CPU water field (swimming, plunges, floating things, the camera), splash ripples in the
sea shader, splash droplets (`src/render/splash.ts`, the shared particle pool), and the telescope (no water code).

## Production water tuning

Open `?proto=place&tune=1` to tune the real sea on the place page, or append `&tune=1` to another
Place or crossing room link. Dev visits also enable editable uniforms without `tune=1`. The dependency-free panel is dynamically imported into the Dev dock on the deployed build as well as locally.
Without Dev/tuning opt-in it loads no panel code, CSS, DOM or saved overrides. These preferences belong to this viewer;
they add no room state, messages, controls or gamepad slot. The cursor stays free on tuning visits; drag the scene
to look around. The game keeps running while the panel takes mouse and keyboard events aimed at its controls.

Groups: **Water** (the sea's colours, depths, pattern, sparkle, foam, seabed light and absorption), **Sun & sky**,
**Light fill**, **Post** and **Quality**. Light fill adjusts the existing frozen-sky key/hemisphere without rebaking; fixed exposure keeps the gain stable while judging it. Each group and the whole panel can reset to production defaults.
Changes persist in localStorage only for Dev/tuning visits. A saved [Looks](dev-menu.md#looks) choice takes precedence over old Water overrides. **Copy settings** exports one JSON object containing only
overrides; **Apply settings** accepts the same block, so the owner can send a look back to an agent to make permanent.

The saved format is `{ "version": 1, "changes": { "sun.sparkle": 3, "post.centre": 0.12 } }`, under
`boogle.water-tuning.v1`. Pasting replaces current overrides after validating every key, range and RGB array;
saved keys of the removed Ultra controls are dropped on restore.
Colour pickers display sRGB; exported colour arrays are linear RGB. Absorption
is editable per channel in inverse metres. Invalid pasted data changes nothing; Copy leaves selectable JSON
when clipboard access is unavailable.

Every Water control is live. Sun elevation, azimuth, intensity, cloud coverage, turbidity and time of day rebake the existing sky cube and
matching sun/hemisphere lighting after editing; a brief stall is possible. This does not start a day/night cycle.
Post controls expose **fixed gain** (0.01–2, step .001), with a numeric field beside the slider; existing reset,
persistence and copied settings include it. Looks reports surface gain/EV; there is no adaptive lock to operate.
The old exposure-compensation, auto-exposure and key-value controls are retired. Contrast and saturation surround the
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
separate additive targets instead of attachment blending. Bloom does not influence the authored fixed gain.

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

The sea grid, the coast texture and the wave and caustic tiles are built once and are not live controls. MSAA and
automatic resolution belong to the shared renderer, and distance fog to the place/cave route. Additional uniforms
and grading arithmetic exist only on tuning visits; the flag-off shader graphs keep their constants and restore no
saved overrides. The home shore registers the finalized stamped heightfield; Place registers its 1 m cove bed. These
are Local rendering changes; Owner physics and all shared state keep their ownership and messages.
