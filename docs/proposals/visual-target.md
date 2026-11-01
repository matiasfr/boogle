# Visual target: how good can the island look on an M4 iPad Pro?

*Proposal, 1 November 2026. A measured spike, not a change to the shipped look: everything here sits behind
`?proto=look` (the look lab, `src/debug/look-lab.ts`). No authored assets: code-built shapes, TSL materials and three's
own post nodes (three r187). Recommendations only; art direction is the group's call. It also tests the two directions
in [bang-for-buck-aesthetics.md](../research/bang-for-buck-aesthetics.md): A, the painted diorama (`diorama`), and B,
the toy box (`toybox`), plus its "one era row" palette test (`era=steam`).*

## The answer in three lines

- **Target the `ipad` preset:** haze, soft shadows, material detail, leaf sway, a grass field and a light grade on top
  of today's look, at the iPad's native resolution (2420x1668) and 60 fps. The painted `diorama` is the cheaper
  alternative (no grass, toon light, soft outlines): which of the two is art direction.
- **`ipad` costs about 1.8 ms a frame on this Mac (today: 1.0-1.3 ms), an estimated 5-6 ms on the M4 iPad** against a
  10 ms GPU budget (60 % of a 60 Hz frame, leaving room for heat, night lights and the game's own work); `diorama` about
  1.4 ms, 4-4.5 ms on the iPad. Adaptive resolution stays as the safety net.
- **Off-limits on the iPad:** SSGI, GTAO (so the `toybox` and `miniature` presets as built), per-pixel procedural
  noise, and anything that only shows at 120 Hz (Safari runs pages at 60 fps on ProMotion iPads unless the player
  changes a feature flag).

Try it: `?proto=look&look=ipad` (or `diorama`, `toybox`, `today`...), pick layers in the panel (top left), press
**Y** for the steam palette row, **Measure frame** for this device's ms.

## What the lab has

`?proto=look` adds a panel of layers, each a checkbox, and presets that are sets of them. URL: `&look=<preset>` then
`&fx=a,b,-c` to add or remove layers, `&era=steam` to start on the steam palette; `&lookpanel=0` hides the panel for
stills. `window.boogle.lookLab` drives it from the harness. Cascaded shadows can only be picked at load (three builds
the sun's shadow node once), so switching them reloads the page.

| Layer | What it does | How |
| --- | --- | --- |
| `haze` | Aerial perspective: height fog that thins with altitude and turns the distance sky-blue, plus forward scattering (towards the sun the haze takes its colour). Keeps today's 110-520 m fog and the caves' darkening. | `scene.fogNode` (TSL) |
| `skyfog` | The diorama's fog: the sky dome's own colour along the view ray (follows day, sunset and night), a low deeper-blue layer pooling under ~4 m over water and beaches. Wins over `haze`. | `scene.fogNode`, `skyU` from `sky.ts` |
| `soft` | Sun shadow map at twice the resolution (4096 on desktop, 2048 on touch), wider PCF filter. | `shadow.mapSize`, `shadow.radius` |
| `csm` | Three shadow cascades out to 160 m (today: a 72 m box around the player). | `CSMShadowNode` |
| `detail` | Grass gets sun-dried patches and clumps, sand fine grain, rock strata, read from today's vertex colours. | 3 taps of a 256 px baked noise texture in a `colorNode` patch |
| `sway` | Palm fronds and crowns drift with a gust and flutter; trunks and rocks stay put. | `positionNode` patch, green vertices only |
| `grass` | 80k blades in a 48 m square that wraps around the camera, on grassy, gentle ground off the court, garden and paths. | One instanced draw; ground height and grass mask from a texture baked from the terrain; wind in the vertex shader |
| `ao` | Ground-truth ambient occlusion, half resolution, multiplied into the scene colour. | `GTAONode` + MRT normals |
| `ssgi` | Screen-space GI and AO (bounce light). Forces TRAA. | `SSGINode` + MRT diffuse |
| `taa` | Temporal AA in place of 4x MSAA. | `TRAANode` + MRT velocity |
| `bloom` | Soft glow on the brightest highlights. | `BloomNode` |
| `grade` | A touch more saturation, warm highlights and cool shadows, a soft S-curve, a vignette. | TSL after tone mapping |
| `outline` | Black ink where depth jumps or normals turn; fades past 70 m. | TSL on MRT depth + normals |
| `softline` | The diorama's lines: silhouettes in a darker shade of the pixel's own colour, creases at half strength, gone by 45 m. | Same pass, tinted |
| `toon` | Four-step grey light ramp on every lit material. | `MeshToonNodeMaterial` swap |
| `paint` | Three-step ramp with a violet shade step and a warm lit step, on static decor only (characters, ball and water keep theirs). | `MeshToonNodeMaterial`, RGB ramp |
| `rim` | Toy treatment for things that move (players, The Boogler, ball, critters): warm rim on the silhouette, lifted shade side. | `emissiveNode` patch |
| `plastic` | Roughness capped at 0.5 on things that move. | material property |
| `tilt` | Tilt-shift miniature blur above and below a focus band. | `GaussianBlurNode`, half resolution |

Era row: **Y** (or the panel's *Steam era* button, or `&era=steam`) blends in ~1.5 s to a second palette row after
`sky.ts` sets the frame's own: browner horizon and sky, fog closing in (20-190 m), warmer and dimmer sun, duller
ambient, and 45 % less saturation through the grade (presets without `grade` get the light and fog only).

| Preset | Layers |
| --- | --- |
| `today` | none (the shipped look) |
| `mid` | haze, soft, detail, sway, bloom, grade |
| `ipad` | haze, soft, detail, sway, grass, grade (**recommended**) |
| `high` | mid + csm, grass, ao, taa |
| `toon` | haze, soft, detail, sway, grade, outline, toon |
| `diorama` | skyfog, soft, detail, sway, paint, softline, rim, grade (research direction A, with B's rim on characters) |
| `toybox` | haze, soft, detail, sway, rim, plastic, ao, grade (research direction B) |
| `miniature` | mid + ao, tilt (a photo-mode look) |
| `ultra` | mid + csm, grass, ssgi, taa (the ceiling) |

## How it was measured

`npm run scenario -- look-lab` (`dev/scenarios/look-lab.ts`; `LOOKLAB=stills` or `LOOKLAB=bench` for one half). Each
configuration gets a fresh page with the sky pinned (`window.boogle.sky.preview`): noon, sunset, night.

- **Frame cost:** a 1210x834 page at pixel ratio 2, so 2420x1668, the M4 iPad Pro 11" panel. `lookLab.bench()` renders
  20 frames back to back in one task (stepping three's node frame so every pass really redraws), waits for the GPU
  queue to drain and divides; median of 7 batches. That is the cost of a frame with vsync out of the way, CPU encoding
  and GPU together (encode alone, `cpuMs`, is 0.4-1.9 ms, so every row is GPU-bound). Timestamp queries were tried
  first and dropped: on Apple GPUs passes overlap, so summing per-pass spans counted bloom at 50 ms.
- **Machine:** MacBook Pro, M1 Max (32-core GPU), Chrome headless on Metal. Another agent's headless Chrome shared the
  GPU on every run: `today` read 1.00-1.13 ms (court) across runs, so treat cheap layers as ±0.15 ms and heavy ones as
  ±1 ms. Three full runs agreed within that.
- `npm run perf` reports draw calls and triangles but no frame time; the bench prints both counts for every row instead.

### Estimating the M4 iPad Pro

Assumption: **the iPad is about 3x slower than this Mac's GPU** (range 2.5-3.5x). The M1 Max's 32-core GPU has about
2.4x the M4's 10-core ALU throughput and 3.3x its memory bandwidth (400 vs 120 GB/s); post effects are
bandwidth-bound, so 3x, not 2.4x. The M4's newer GPU (dynamic caching) pulls the other way; Safari's WebGPU adds its
own overhead. Measure on the device before trusting any number in the iPad column.

## Cost and benefit

Mac ms a frame at 2420x1668 with the one layer on, court view / overview (`today`: 1.00-1.13 / 1.16-1.27).
iPad = 3x the Mac's added cost.

| Layer | Mac ms (alone) | iPad est. added | What it adds | Verdict |
| --- | --- | --- | --- | --- |
| haze | 1.12 / 1.34 | +0.1-0.3 | Depth from high up: far hills step back. Subtle at ground level. | **Yes** |
| skyfog | 1.28 / 1.53 | +0.3-0.8 | Fog that is exactly the sky: the island melts into it at every time of day; low layer over the sea. | **Yes** if diorama |
| soft | 1.31 / 1.58 (other runs 1.08 / 1.26) | +0.2-0.9 | Palm shadows lose their hard jaggies. | **Yes** |
| csm | 1.20 / 1.41 GPU, draw calls +110 / +80, CPU +0.35 | +0.5 GPU, CPU more | Shadows wherever the camera looks (the shore view has none today). | Later: doubles the draw calls |
| detail | 1.09 / 1.25 | +0.1 | Flat faces stop reading as flat colour: sand grain, mottled grass, banded rock. | **Yes**. Per-pixel `mx_noise` (first try) cost +1.0 / +1.3 ms: bake it. |
| sway | 1.02 / 1.21 | ~0 | Alive in motion (invisible in stills). | **Yes** |
| grass | 1.46 / 1.56, +400k triangles | +1.0-1.2 | The biggest single change at ground level: hills read as meadow. | **Yes, with care** (below) |
| ao | 4.77 / 2.08 | +3-11 | Contact darkening in creases. Little you'd miss on this palette. | **No** on the iPad: cost grows near the camera |
| ssgi | 6.84 / 7.93 | +17-20 | Coloured bounce (a pink glow under a pink player). Noisy without TRAA. | **Off-limits** |
| taa | 1.71 / 1.87 | +2 | Smoother fronds and grass in motion; softer image. MSAA does well already. | Not now; revisit if grass shimmers |
| bloom | 1.43 / 1.68 | +1-2.5 | Nothing in daylight, sunset or tonight's island is bright enough to bloom. | Later, with night lanterns |
| grade | 1.05 / 1.21 | ~0 | Warmer, punchier, a vignette that holds the eye; carries the era row's saturation. | **Yes** |
| outline | 1.29 / 1.46 | +0.6 | Characters and props pop. Grass inks into scribble. | Style (toon) |
| softline | 1.26 / 1.45 | +0.6 | Silhouettes read without the comic-book weight; gone in the distance. | **Yes** if diorama |
| toon | 0.85 / 0.93 | -0.7 | Banded light, flatter, brighter; cheaper than PBR. | Style |
| paint | 0.83 / 0.93 | -0.7 | Same saving; shade turns violet instead of grey, the island looks painted. | **Yes** if diorama |
| rim | 1.05 / 1.22 | ~0 | Players, ball and The Boogler pop off the ground; at night the biggest readability gain in the lab. | **Yes, in any look** |
| plastic | 1.00 / 1.15 | 0 | Slightly glossier players and ball. | Cheap, taste |
| tilt | 1.36 / 1.53 | +1 | Lovely miniature from above; blurs what you need at ground level. | Photo mode only |

| Preset | Mac ms (court / overview) | iPad est. | Draw calls | Triangles |
| --- | --- | --- | --- | --- |
| today | 1.00-1.13 / 1.16-1.27 | 3-4 | 115-128 | 170-200k |
| mid | 1.73 / 1.91 | 5-6 | 126-139 | 175-200k |
| **ipad** | **1.76 / 1.83** | **5-6** | 117-126 | 570-600k |
| diorama | 1.31 / 1.47 | 4-4.5 | 121-124 | 170-180k |
| diorama + steam row | 1.31 / 1.48 | 4-4.5 | 121-125 | 170-180k |
| toon | 1.25 / 1.42 | 4 | 113-123 | 170-200k |
| toybox | 5.05 / 2.41 | 7-15 | 120-126 | 170-180k |
| miniature | 5.98 / 3.37 | 10-18 | 127-143 | 170-200k |
| high | 5.40 / 4.70 | 14-16 | 217-245 | 750-815k |
| ultra | 8.97 / 10.02 | 27-30 | 217-244 | 750-810k |

`toybox` without AO (rim and plastic are free) costs what `mid` minus bloom does: the toy treatment is cheap, the
contact shadows are not.

## Stills

Same views, noon unless named, 960x600. Characters and The Boogler wander between shots.

Today (left) and `ipad` (right):

![pair-court](https://raw.githubusercontent.com/matiasfr/boogle/pr-shots/2026-11-01-100258-d7b2b60/pair-court.png)
![pair-shore](https://raw.githubusercontent.com/matiasfr/boogle/pr-shots/2026-11-01-100258-d7b2b60/pair-shore.png)
![pair-overview](https://raw.githubusercontent.com/matiasfr/boogle/pr-shots/2026-11-01-100258-d7b2b60/pair-overview.png)

The research directions: top row today, `diorama`; bottom row `toybox`, `ipad`. Court, shore, overview, sunset
(shore), night (court):

![abc-court](https://raw.githubusercontent.com/matiasfr/boogle/pr-shots/2026-11-01-100258-d7b2b60/abc-court.png)
![abc-shore](https://raw.githubusercontent.com/matiasfr/boogle/pr-shots/2026-11-01-100258-d7b2b60/abc-shore.png)
![abc-overview](https://raw.githubusercontent.com/matiasfr/boogle/pr-shots/2026-11-01-100258-d7b2b60/abc-overview.png)
![abc-sunset](https://raw.githubusercontent.com/matiasfr/boogle/pr-shots/2026-11-01-100258-d7b2b60/abc-sunset.png)
![abc-night](https://raw.githubusercontent.com/matiasfr/boogle/pr-shots/2026-11-01-100258-d7b2b60/abc-night.png)

The steam palette row: top row today, today + steam; bottom row `diorama`, `diorama` + steam:

![steam-court](https://raw.githubusercontent.com/matiasfr/boogle/pr-shots/2026-11-01-100258-d7b2b60/steam-court.png)
![steam-overview](https://raw.githubusercontent.com/matiasfr/boogle/pr-shots/2026-11-01-100258-d7b2b60/steam-overview.png)

Every other preset, top row today, mid, ipad, high; bottom row toon, miniature, ultra:

![sheet-court](https://raw.githubusercontent.com/matiasfr/boogle/pr-shots/2026-11-01-100258-d7b2b60/sheet-court.png)
![sheet-shore](https://raw.githubusercontent.com/matiasfr/boogle/pr-shots/2026-11-01-100258-d7b2b60/sheet-shore.png)
![sheet-overview](https://raw.githubusercontent.com/matiasfr/boogle/pr-shots/2026-11-01-100258-d7b2b60/sheet-overview.png)

Gut check:

- **Reads better:** grass (by far, at ground level); rim light on characters (at night players go from dark lumps to
  lit toys); the diorama's sky-coloured fog and violet shade from high up (it looks painted and sunnier than today);
  detail on sand and rock; soft shadows.
- **The steam row reads as a different time, not yet as a different era.** On the court it is clearly hazier, dustier
  and older (grey-brown sky, brown sand, muted greens, the windmills fading); from the overview it reads more like a
  hazy afternoon. Palette alone gets about half way; smoke, era props and the mainland silhouette would carry the rest.
- **Noise:** AO and SSGI on this flat, bright palette, bloom anywhere on today's island, tilt-shift at ground level,
  black outlines on grass. The diorama's `paint` and `toon` look much alike in daylight; the difference is in the
  shade colour and which objects keep PBR.
- **Watch:** grass 0.2-0.4 m tall can hide small things on the ground (seeds, gifts, shells), which bends DESIGN.md 7
  (telegraph everything). Before it ships: flatten it under items and players, keep it off paths and work sites, or
  shorten it. The lab already keeps it off the court, the garden and painted paths.

## Recommendation for the M4 iPad Pro

- **Preset:** `ipad` (haze, soft, detail, sway, grass, grade), **plus `rim`** on characters whatever the look: it is
  free and was the clearest win at night.
- **If the group prefers the research's painted direction:** `diorama` (+ grass, if a soft-line version that skips
  the blades is built) fits the same budget with room to spare; it is the cheaper of the two.
- **Frame budget:** 60 fps at native resolution, GPU at most 10 ms; `ipad` estimated 5-6 ms, `diorama` 4-4.5 ms, which
  leaves room for night lights, particles and heat. Adaptive resolution (0.6-1x) catches the rest.
- **120 Hz:** not a target. Safari renders pages at 60 fps on ProMotion iPads by default ("Prefer Page Rendering
  Updates near 60fps" in Settings > Safari > Advanced > Feature Flags). If that changes, `today`, `toon` and `diorama`
  fit an 8.3 ms frame and `ipad` probably does.
- **Off-limits on the iPad:** SSGI, GTAO (`toybox`'s contact shadows: keep its rim and plastic, drop the AO),
  per-pixel procedural noise (bake it), TRAA as a default, cascades until draw calls are cut, and screen-space
  reflections (skipped here: the sea is a transparent, stylised surface and the matte palette has nothing else to
  reflect).

### Measuring on the real iPad

`npm run hitches -- --url` drives desktop Chromium against a URL, not the iPad, so it can't give device numbers. On the
device:

1. Once this is on `main`, open `https://boogle.club/?proto=look&look=ipad` on the iPad (Safari 26), or the look entry
   on boogle.club/protos/. Pick a preset, wait a few seconds, tap **Measure frame**: the same bench as the Mac at the
   iPad's own 2x, printing ms a frame and draw calls. Do `today`, `ipad`, `diorama`, `toon` and `high`, in the shade
   and facing the sun.
2. Plug the iPad into the Mac, enable Web Inspector (Settings > Safari > Advanced), and in Safari on the Mac use
   Develop > (the iPad) > the Boogle tab. In the console, `await window.boogle.lookLab.bench()` returns the same
   numbers; the Timelines tab (Rendering Frames) shows real frame times while you walk around, and `?prof=1` overlays
   CPU per section.
3. Play 10 minutes on `ipad` to see whether heat drops it below 60 fps (adaptive resolution kicking in shows as a
   softer image).

## What would come next (not done here)

- Port the winners into a quality setting (PLAN.md, "Graphics quality tiers").
- Palette rows as data next to `sky.ts`'s `C` and `L` tables (one per era), with the fog and grade reading them.
- Grass that bends under players and the ball: a compute pass writing a small trample texture around the camera.
- Bloom and clustered lights together, for night.
