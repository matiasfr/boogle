# Water demo: numerical diagnosis

2026-11-02. Serves DESIGN.md **Toys before chores** and **Show, don't tell**. This is Local cosmetic water;
the wave field is never lockstep state or read back into the simulation. Reference: Ultra Water commit
`30ea65ecb0a66b137aa200d099965634bdd84d51`, read from the owner's local reference checkout. The owner's
`demo-shots/board.png` and its individual Lagoon, Breakers, Surf rock and Open ocean images are the visual target.
The existing [Ultra Water investigation](ultra-water.md) records the rendering architecture and engine comparison.
No network, reference build, dependency installation or reference browser was used for these measurements.

Reproduce with `node dev/water-diagnose.ts` (about one minute of CPU work), `--coast=lagoon` for that source
view's coast, or `--spectrum-only` for the spectrum numbers. Full outputs from this revision are
`.look/water-diagnosis.txt` and `.look/water-diagnosis-lagoon.txt`. The tool uses the production `bakeH0`,
inverse FFT, shore bake and current unscaled height function. It retains the former island/grade numbers only to
make the before measurement reproducible. It is an inspection tool, not an added test suite.

## 1. Wave size: source-faithful, but far above a 9 m/s wind sea

The `after` values use the selected **energy .25** calibration (half the source's amplitude), chosen against the
supplied GPU demo shots. The initial .02 calibration reached physical wind-sea height but looked too smooth and
lost the refracted caustic net. The scene reference takes priority over that physical estimate.

`Hs = 4 sqrt(variance)`. The before field's phase-averaged spatial variance is measured by Parseval from the actual
seeded H0 coefficients; slope moments at t=0 are measured by the production CPU inverse FFT and choppy-coordinate
correction. Cascade 3 contributes slopes, but no geometry.

| Cascade | Length m | Hs before m | Hs after m | Raw mean square slope before | Raw mean square slope after | Chopped RMS slope before | Chopped RMS slope after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 600 | 13.804176 | 6.902088 | 0.094466 | 0.023616 | 0.328877 | 0.156537 |
| 1 | 85 | 1.604158 | 0.802079 | 0.115838 | 0.028959 | 0.367387 | 0.174223 |
| 2 | 12 | 0.201841 | 0.100921 | 0.084229 | 0.021057 | 0.301073 | 0.146067 |
| 3 | 2.1 | 0.008106 | 0.004053 | 0.001611 | 0.000403 | 0.041038 | 0.020507 |
| Sum of variances | | **13.898539** | **6.949270** | **0.296143** | **0.074036** | **0.579191** | **0.276791** |

The chopped summed mean square slope is **0.335462 before**, **0.076613 after**. Cox-Munk at 9 m/s is
**0.049080** (RMS 0.221540). The raw, unchopped spectrum is the approximately 0.30 mentioned in the brief;
choppy-coordinate division increases it further. The Cox-Munk unresolved-variance term remains clamped at zero
for this spectrum. It would add BRDF roughness, not geometry, if the field carried less variance than Cox-Munk.

The source's frequency-only JONSWAP integral for 9 m/s, 120 km is variance **0.256530 m²**, Hs **2.025952 m**:
approximately the upper end of the owner's 1.5–2 m reference. But the source also adds a 7 m/s, 900 km swell at
energy scale 0.7; that term alone integrates to variance **1.058547 m²**, Hs **4.115428 m**, before its Gaussian/pair
convention. The combined directional, band-limited grid integrates to **1.390001 m²**. Directional spreading,
discrete frequency samples and short-wave fading explain why it is not exactly the sum of the two 1D integrals.

Both implementations use

```text
h0(k) = complexGaussian * sqrt(2 * S(k) * dω/dk / |k| * Δk²)
h(k,t) = h0(k) exp(iωt) + conj(h0(-k)) exp(-iωt)
E|complexGaussian|² = 2
```

Thus the expected evolved variance is **8 times** the integrated directional spectrum: **11.120004 m²**.
The actual Boogle seed gives **12.073087 m²** (8.57% above that ensemble expectation). The different seeded draw
is important in the long-wave band, where a few modes carry much of the energy. A CPU transcription of the
source's PCG draw gives Hs **13.236201 m**, confirming that the source also has this very large deep-water sea.
This is not an extra factor accidentally introduced by the TSL FFT port. The source uses PCG2D; Boogle has always
used mulberry32, with the same Gaussian distribution rather than the same phases.

The selected calibration uses the requested knob in `tuning.ts`: **`ULTRA.waveScale = 0.25`**, with exactly
the source parameter's energy semantics. Every H0 coefficient is multiplied by `sqrt(0.25)` before evolution;
the spectral shape, wind/swell ratio, wavelengths and choppiness remain unchanged. Displacements, slopes,
Jacobians and foam history all derive from that scaled field. No post-shading slope reduction or guessed wave
shape is introduced. `bakeH0` defaults to scale 1 so the source diagnosis remains reproducible.

For comparison, the rejected .02 candidate measured Hs **1.965550 m**, raw mean square slope **0.005923**,
chopped mean square slope **0.005992** and RMS **0.077407**. It introduced about .043 unresolved Cox-Munk
roughness while shrinking the visible slopes and caustic folds. Its full measurement remains in
`.look/water-diagnosis-scale-002.txt`; it is not the selected scene tuning. The chosen 6.95 m deep-water Hs is still
well above a 9 m/s wind sea: this is the demo's additional swell and amplitude convention, artistically reduced.

## 2. Source-to-port audit

Every numerical block in `OceanSim.js` was compared to `spectrum.ts`/`fft.ts`, including the render-frame caller:

| Source block | Port | Finding |
| --- | --- | --- |
| `OceanSim.js` lines 12–19, lengths/dispersion/loop | `CASCADE_LENGTHS`, `FFT.loop`, `rows` | 600/85/12/2.1 m; g=9.81; surface tension 7.4e-5; 300 s loop; same quantisation and reduced phase. |
| `INIT_FRAG` Gaussian | `bakeH0` | PCG2D versus mulberry32 is the intentional phase difference; both have unit normal real/imaginary parts. |
| `jonswap`, `normalisation`, `directional` | same named helpers and `spectrumCellVariance` | Same coefficients, exponents, scale, spread and two spectra. The broad cos² term integrates over the full circle; this was not silently normalised. |
| `h0`, band cutoffs | `spectrumCellVariance`, `bakeH0` | Same cutoffs at six fundamentals of the next band; same fade and factor 2 inside the square root; same conjugate index. New energy multiplier is explicit tuning. |
| `EVOLVE_FRAG` | compute `rows` | Same complex pair, signs, two-real-field packing and derivative multipliers. |
| `FFT_FRAG` | `transform` | Same Stockham indices, twiddles, inverse sign and no 1/N factor. Source writes half float after every stage; port keeps float32 in shared memory and rounds the final atlas to half. This reduces intermediate rounding, not amplitude. |
| `ASSEMBLE_FRAG` | compute `columns` | Same checkerboard sign, lambda=0.85, Jacobian, slope denominator floor 0.2 and foam recovery. First-frame foam is explicitly neutral; subsequent frames read the previous parity only for foam history. |
| Output mip generation | compute mip pyramid | Both average final half-float displacement/slope moments. Port rounds each generated mip, with no sampled/write overlap. |
| `OceanSurface.waterDisplacement` and vertex LOD | `fftWaves.displace`, `surface.positionNode` | Three geometry cascades; `max(log2(cell*N/L)+1,0)`; capillary band slopes only. Lower LOD clamp is now explicit rather than relying on sampler clamping. |
| `cascadeDamp` | `surface.cascadeDamp` | Exact: long swell `smoothstep(2,26,depth)`; chop `smoothstep(-.4,2,depth)*mix(.55,1,smoothstep(0,10,depth))`. |
| Vertex trough clamp | `surface.positionNode` | Exact: sample the bed at the **horizontally displaced** xz and clamp negative height to `min(bed+.04+2e-7*distance²,0)`. No need to replace this logic. |
| `main.js` lines 389–392 and `surface.update` | prototype frame hook / `simulation.update` | Source computes ocean, then caustics, then draws the updated textures. Port texture samples reference the base TextureNode, so swapping `.value` supplies the newly computed parity in the same draw. |
| Boogle clock/camera ordering | prototype frame hook | **Port issue found and fixed:** world-phase update read `seaU.uTime` before that clock is assigned at late 3010, and read the camera before the debug camera's late update. Confirmed in `index.ts`: late 1100 now computes ocean with current `elapsed`, then caustics, then underwater, after the debug camera at 1000. This was a one-frame lag, not the large amplitude. |
| Source coordinates | FFT and shore phase helpers | The new page subtracts `ISLAND_AT` before periodic sampling/noise, so relocating the scene does not change phases. Former world x=2400 happened to wrap bands 0 and 2 exactly, but not bands 1 and 3. |

The four-band simulation still uses **10 compute dispatches per frame** (row evolution/FFT, column FFT/assembly,
eight mip levels); these changes add **zero render passes and zero draws**. They expose the same moments and
displacement texture nodes for the caustics renderer rather than computing a second ocean.

## 3. One-minute shore measurement

The probe is on the exposed -35° radial coast, away from the hero rock. The script finds exact requested depths in
the half-float, bilinearly filtered shore bake, then samples t=0..60 seconds inclusive at 10 Hz. It follows the source's
four-step horizontal inverse query, with a 0.25 m mesh cell and the trough-clamp clearance for a camera 30 m away.
This is a numerical rendering-field measurement, not a claim to have watched real-time motion. It uses a CPU FFT
with the same half-float atlas/mip rounding (`Math.f16round` after float32 conversion, matching WGSL's
round-to-nearest instead of three's truncating CPU `DataUtils.toHalfFloat`). Float32 FFT shader arithmetic and
finite mesh triangulation can differ.
Four fixed-point iterations also retain the source query's approximation near sharply compressed crests. The
temporal sample interval can miss an intervening extremum.

Before: .45 island xz scale, .55 positive-height scale, 1400 m shore bake, shore amplitude .7 m, wavelength 22 m,
world-space phase and energy 1. After: the source's full island, 1800 m bake, .55 m amplitude, 30 m wavelength,
island-local phase and energy .25. Both bakes are 512². All points below are island-local; world x adds 2400 m.

| Depth m | Before x,z m | After x,z m | Full surface range before m | Full surface range after m | FFT-only range before m | FFT-only range after m |
| ---: | --- | --- | ---: | ---: | ---: | ---: |
| 0, waterline | 112.036,-78.449 | 250.229,-175.212 | 0.316 | 0.295 | 0.081 | 0.036 |
| 0.5 | 115.361,-80.777 | 256.383,-179.521 | 1.235 | 1.119 | 0.365 | 0.223 |
| 1 | 123.148,-86.230 | 272.907,-191.092 | 2.181 | 1.818 | 0.990 | 0.355 |
| 2 | 130.189,-91.159 | 288.952,-202.326 | 2.813 | 1.669 | 1.245 | 0.671 |
| 5 | 143.978,-100.814 | 319.436,-223.671 | 3.087 | 1.978 | 1.869 | 0.689 |

At the exact waterline long-swell damping is **zero**, before and after. Maximum horizontal FFT excursion there
falls from **0.0391 m to 0.0197 m**; it is not dragging the shoreline by metres. The terrain's swash run-up at that
point reaches **0.334 m before, 0.235 m after**. The roughly 0.29 m vertical range is predominantly the source's
travelling shore-wave/swash treatment. The original long-swell damping was already correct at the waterline;
the large visible motion was the combined wave field on a compressed island, not a missing damping formula.
The exposed 2–5 m shelf still has up to about 2 m total range across a full minute, because the source's shoaling
and two shore trains remain.

The Lagoon measurement follows `main.js`'s `sunBearing()-1.48` radial coast (-199.798°), with the same sampling
settings. This isolates the sheltered water that the spawn camera looks across, rather than treating the exposed
coast as representative of every view:

| Depth m | Before x,z m | After x,z m | Full surface range before m | Full surface range after m | FFT-only range before m | FFT-only range after m |
| ---: | --- | --- | ---: | ---: | ---: | ---: |
| 0, waterline | -139.541,50.232 | -310.770,111.870 | 0.058 | 0.044 | 0.071 | 0.047 |
| 0.5 | -143.085,51.507 | -317.689,114.361 | 0.495 | 0.327 | 0.417 | 0.162 |
| 1 | -154.518,55.623 | -342.835,123.413 | 1.422 | 0.966 | 0.846 | 0.453 |
| 2 | -178.085,64.106 | -395.034,142.204 | 1.741 | 1.364 | 1.479 | 0.749 |
| 5 | -219.357,78.964 | -486.714,175.206 | 1.572 | 0.882 | 1.295 | 0.817 |

At the Lagoon waterline, maximum horizontal FFT excursion is **0.0316 m before, 0.0178 m after**; the swash
run-up reaches **0.0262 m before, 0.0422 m after**. The latter increases slightly because the source-scale shore
map and its local phase have different shelter and timing than the compressed island. Both are centimetres,
not swell-height excursions. At 0.5 m depth the complete surface spans **-0.143 to +0.184 m** over the minute.
The more distant 1–5 m probes span larger ranges; they should not be described as a physically calm wind-only sea.

## Recommendations

1. Keep the source spectrum and make amplitude a visible, measured tuning choice. Do not disguise its eightfold
   variance convention as a TSL bug or change the spectral shape to quiet the scene.
2. Keep the exact source damping and bed clamp. Judge shoreline contact from consecutive captured frames at the
   four source views; small FFT excursion alone cannot establish that the rendered contact is convincing.
3. Keep phase coordinates local to the demo island and update the source before caustics/underwater/rendering with
   the current frame's clock and camera. This is independent of the artistic amplitude choice.
4. Compare the clear bed and caustic net before increasing glint or foam. The target images show low rounded surf;
   extra white coverage would hide the most distinctive part of the scene.
