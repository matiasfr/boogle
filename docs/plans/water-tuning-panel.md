# Live production water tuning

## Goal

Let the owner dial in the real sea on the deployed place page, using the Ultra Water demo's familiar groups and names, and copy only changed settings back to an agent. Serves **Small and readable**, **Pick how each feature shares state**, and **11. Show, don't tell**. The owner explicitly requested implementation, verification and local commits; this plan records that authorized work rather than adding an approval stop.

## Design

- Everything is **Local**: this viewer owns preferences, DOM, rendering uniforms and optional explicit bakes. No room, save, presence, op, action, pad slot, keyboard binding or guide row. The shared world's movement and physics authority do not change.
- Use `tune=1` (no existing query reader found), together with the existing real-water gate: `?proto=place&water=new&tune=1`. A tiny eager loader dynamically imports the panel only for this flag; no panel CSS, DOM, preference reads or event listeners when off. Explain the `water=new` requirement if the panel is opened on the legacy path; do not silently change its route.
- Implement a dependency-free DOM panel under `src/debug/`, with JS-built CSS, collapsible groups, native numeric/range/color controls, group/all reset, JSON textarea, Copy settings and Apply settings. Give controls stable labels and `data-water-key` identifiers for the existing broker's eval/action scripts. Show operation/status errors in the panel rather than silently failing.
- Existing production objects in `tuning.ts`, `spectrum.ts`, `quality.ts` and owning runtime handles remain the values. Schema entries hold defaults, bounds and getters/setters; they are not a second mutable settings store. Snapshot defaults before restoring preferences. Store versioned changed-only JSON in `localStorage`; parse and validate the whole pasted object before applying, reject unknown keys/nonfinite or out-of-bounds values, and retain clipboard fallback as selected text. Reset removes relevant overrides and applies original defaults.
- In shaders replace exact numeric literals from existing settings with shared uniform handles, keeping defaults and operation order. Avoid changing the retained demo's explicit `look` and `shoreMotion` overrides. Changes to spectral shape rebake H0 on deliberate commit/debounce rather than on every pointer sample; preserve existing storage arrays/textures and queries. Sky changes explicitly rebake the existing sky and hemisphere irradiance, never add a sky cycle or frame-by-frame bake.
- Block pointer, wheel and keyboard propagation inside the panel, while preserving native text editing and tab navigation. Call existing `releaseInput()` when focus/pointer enters to release held game input. Audit window capture listeners such as pause: the existing `isTyping()` only recognizes inputs, textarea and contenteditable, so button/select focus also needs an explicit panel guard where required. Read `.claude/rules/state-consumers.md` before player edits. No modal pause: the world continues rendering.

## Reference mapping

Read reference `/Users/matiasfranco/Developer/boogle-codex/_refs/ultra-water/src/main.js:240-363` and the runnable copy at `../demo-run`. Keep these demo group/control labels where supported:

| Group | Controls and owning implementation |
| --- | --- |
| Waves | `windSpeed`, `windDirection`, `fetchKm`, `waveScale`, `spreadBlend`, `swellScale`, `swellDirection` from `OCEAN`/`ULTRA`; rebake H0. `choppiness` in FFT assembly, `timeScale` in source time, plus explicit per-cascade strengths. Keep geometry, slopes, variance, Jacobian/foam and queries consistent. |
| Shore waves | `amplitude`, `wavelength`, `speed`, `steepness` through shared `SHORE_WAVE` and shader nodes; `spray`, `spray size` through the existing bounded emitter. CPU spray's precomputed frequencies/direction must follow changes too. |
| Water | `scatter`, absorption RGB/clarity, `roughness`, `sssPeak`, `sssView`, `foamBias`, `foamScale`, `foamRecovery`, `shoreFoamBand`, `caustics`, `glitter`; use existing `LOOK`, `ULTRA`, FFT, receivers and shared `waterLighting()` so submerged water and snow agree. Expose existing reflection gain/cap/tint, foam tint/brightness, swell-depth/shallow-chop settings with clear names. |
| Floaters & underwater | `scattering`, `shafts`, `shaftRange`, `meniscus`, underwater exposure if provided through the existing output. Do not expose demo floater spawning or physics: these are unrelated to local cosmetic tuning. |
| Sun & sky | `elevation`, `azimuth`, `sunIntensity`, `cloudCoverage`, `turbidity` from `createWaterSky().params`, and time-of-day via the same fixed-direction calculation. Label explicit sky rebakes; synchronize actual sun, cube, water sun and hemi fill. |
| Post | `exposure comp` before existing AgX; expose existing metering/AgX parameters where practical without another pass. Name AgX as the active transform. Changes requiring a new transform graph should explicitly rebuild or be documented as unavailable. |
| Quality | Existing scene-pass `resolution` from `createWaterQuality()`; update its authoritative value instead of the captured immutable local. Preserve adaptive DPR ownership. |

List every omitted demo control in the panel's limitations section and docs. In particular the production renderer has no demo planar-reflection target (`reflections`, `reflectionScale`, `reflectionDistort`), separate bloom pass (`bloomStrength`, `bloomThreshold`), demo floater management/physics, or demo camera/benchmark toggle. Do not add these systems. Explain actual support for refraction, auto exposure/key value, contrast/saturation, and underwater exposure after inspecting their existing graph seams; never present inert knobs. FFT size/band topology, mesh resolution, shaft step count and baked texture dimensions should be omitted with a rebuild-cost note rather than introduce full live resource recreation. Spectrum rebake and sky bake are supported explicit work, not hidden reloads.

## Steps

1. - [x] **Runtime seams** — production subsystems bind their existing values through `live.ts`; no extra water-render facade is needed. H0 rebakes retain texture bindings, sky rebakes serialize readbacks, and flag-off graphs retain their constants. Typecheck and lint pass.
2. - [x] **Panel and preferences** — lazy DOM, validated sparse JSON, persistence and resets implemented. Panel events release held input and block game handlers. The eager flag gate keeps the cursor free before lobby entry, restoring its prior state on disposal or load failure; existing drag-to-look remains available.
3. - [x] **Documentation** — game-design describes the URL, groups, bakes, omissions and JSON. The proposal records the requested lower-island preference. Registry route budgets pass.
4. - [x] **Evidence** — offshore before/after/reset stills show higher waves, orange scatter, brighter exposure and restored defaults. Copy, reload, valid/invalid paste, reset and input isolation pass. Flag-off production requests no panel chunk. `world-inputs` passes. The initial 180-second bot cutoff stopped early; the standard-cutoff run completed every expected beat with no errors and 78 saved checkpoints. No real-time feel, physical-device or co-op verdict is claimed. Repeat affected captures after the cursor fix and retain manifests in the broker handoff.
5. - [x] **Review** — diff reviewed against ownership, renderer, input and test-diet contracts; changed sources formatted and `npm run check` passed. Make small imperative commits with DESIGN principles, without push or ship, and retain final-tree verification in the handoff. The final report records the accidental remote activity from `inflight`, rather than claiming compliance with the local-only network constraint.

## Risks

- Default-off pixels must remain unchanged: do not restore viewer overrides until the flag is on; preserve default uniforms, original graph branches and retained demo options. Extra uniform multiplication/branches that cannot be eliminated cost runtime work and need explicit disclosure or flag-only construction.
- H0 updates must mark the real GPU attribute dirty and reset foam history; merely mutating `OCEAN` does nothing because its band snapshot is currently module-level. Keep wave sampling and query textures bound to the same source.
- Sky bake/readback races and sea disposal must not free resources in flight. Coalesce changes and display busy/error state.
- Input propagation includes window capture listeners and stuck held keys, not only textarea keydown bubbling.
- No room-safety or mixed-build changes are planned. `src/main.ts`, `src/style.css`, `index.html`, sim and world stay untouched unless a one-line loading seam is required; prefer feature autoload.
- Parent already ran inflight; no additional network use. Existing concurrent branches are not permission to alter their files.

## Open questions

None blocking. Structural controls may be omitted with explicit panel notes as the owner authorized. Real-time smoothness and device testing remain separately unverified by stills; deployed behavior is designed into production imports but this branch will not be deployed in this task.
