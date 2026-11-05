# Graduate the water onto the real sea

## Goal

**4 November owner override — default Place only:** “Switch default instead”. For tonight's human replay,
new water is enabled on the default Place route and `proto=place` without a water flag. `water=old` explicitly
selects the legacy production sea; `water=new` remains an opt-in on classic home and other routes. Classic
home and other prototypes keep their defaults. The retained `proto=water` demo owns its separate sea and
continues to ignore the production-water selector; changing that demo would exceed this switch.
This is only the default-switch part of step 7: delete nothing, retain all old-sea/prototype seams, keep
Neutral, and leave the remainder of step 7 plus step 8 documentation/acceptance open. This supersedes the
earlier instruction to wait until after the replay. No terrain, gameplay, pacing or copy changes are included.

Replace the sea on the default Round 4 place and the classic home island with the water proved by `?proto=water`, including its waves, shore response and below-water treatment, using the real terrain. Serves DESIGN.md **Show, don't tell** (the visible surface is the water you enter), **Toys before chores** and **Small and readable**; physics remains **Owner**, never Lockstep.

**Approved through steps 1–6 on 3 November 2026.** Steps 7–8 await review. **4 November:** the owner chose Neutral for this route for now, superseding the metered AgX named next and below; AgX stays a comparison. Step 4 started that day behind `water=new`, and the default-sea switch waits until after that night's replay. The owner's subsequent call supersedes the original sky recommendation below: under `water=new`, bake the demo atmosphere **once behind loading**, frozen at late morning (`tod=0.24`), and use metered AgX from `render/tone.ts`. The real light follows that fixed sun. The old path retains Neutral and its 20-minute cycle. Retain `.25` spectral energy, mobile 0.6 world resolution and desktop high. No `scene.ts` edits, push, ship or external network access. Do not graduate or redesign Round 4 along with the water.

## Design

### Default-switch handoff (4 November 2026): startup and solo pass; co-op route failure

Implementation commit `4edc988d` shares the route selector in `proto/flags.ts`, re-exported through
`render/water/flags.ts`. Its consumers retain their existing new/legacy branches. The raw `water=new`
plunge check in `entities/player/state.ts` now also consumes this selector, so flagless Place gets the
existing automatic plunge behavior. The retained demo's explicit opt-in behavior is preserved. No force,
threshold, terrain, copy, pacing, tone or renderer setting was retuned; no old path was deleted.

The earlier legacy capture was a harness query mistake, now superseded. Verification restarted on clean
`9735fe20`, tree `4e8eb7656e9f69c8d14f1d13f44fecfc9e9ec1e3`, including the plunge-selector correction.
All new manifests record `changedDuringRun=false`; the trusted broker is `906ddad4`. No game source changed
in this follow-up. **Do not claim the full human replay is verified: check 3 failed after dry train arrival.**

**1. Startup and fallback passed.** [Literal `--query ''`](../../.look/evidence/1793836203868-22679/evidence.json)
selected Place, new water, Neutral enum 7 and production post `neutral`, ready at `tod=0.24` with exactly
one sky bake after loading and during play. Existing `main.play()` awaits `waterReady` before shader
warm-up/first play. First frame and interactive were **6157 ms**, with **316.6 ms** sky-bake CPU/submission
duration. [Explicit `--query 'proto=place&water=old'`](../../.look/evidence/1793836229069-23087/evidence.json)
selected Place, legacy water, Neutral and automatic output transform; first play was **2548 ms**.
These are individual local development loads, not phone timings or a cold-cache benchmark. Both runs had
advancing WebGPU frames and no page/console/graphics errors.

Opened `default-final-still.png` and `legacy-final-still.png`. Visual question: is replacement water visible
at the same readable Place bank? At `(972,22,55)` looking at `(1000,0,20)`, new water has transparent
turquoise shallows and caustic detail between the banks and support; legacy is a flat blue strip. This is
one bank angle, not all-angle acceptance. New water retains surface swimming, automatic high-fall plunges
and surfacing droplets; frozen daylight replaces the day/night cycle and night-triggered effects.

**2. Full solo comparison passed.** Both the [legacy baseline](../../.look/evidence/1793836253146-23448/evidence.json)
(`proto=place&shot=play&water=old`) and [new default](../../.look/evidence/1793836475510-26067/evidence.json)
(`proto=place&shot=play`) finished every expected beat. Read both complete reports and opened both
`run/end-still.png` images: dry players, banks and track supports remain readable, with the new sky/sea
visible behind the final avatar. Bot overlays obstruct part of each frame; these are completion evidence.
The existing offline `node dev/look/playthrough.ts --compare <legacy-run> <new-run>` produced
[the saved comparison](../../.look/evidence/1793836475510-26067/solo-compare.txt); it launches no browser.
No shared beat shifted beyond the harness's approximately one-minute noise band. Largest first-mark shift:
resident noticed, **18 s later**; pier completion **3 s earlier** (23:37 vs 23:40). Both had **zero water
falls, zero pushing time and zero errors**. Idle was 9:03 vs 9:21. One incidental tumble, one extra second
jump and one extra rumour mark occurred only in legacy; optional cosmetic rewards also differed. Neither
solo run marked a crystal or co-op moment; these were not expected-beat failures. Runtime was **4:59 vs
3:31 wall time** for about 27 game minutes: new water reduced accelerated throughput (about 5x vs 8x).
This is a measured harness-runtime increase, not a gameplay-pacing change or real-time frame benchmark.

**3. Continuous co-op failed after checkpoint 20.** Exact requested command:
`node .look/see-client.ts playthrough --players 2 --long --warp-speed 2 --query 'proto=place&shot=play'`.
[Manifest](../../.look/evidence/1793836793609-27730/evidence.json),
[full report](../../.look/evidence/1793836793609-27730/run/report.txt),
[checkpoints](../../.look/evidence/1793836793609-27730/run/checkpoints.json). **755.699 wall seconds**.
Both P2 reload after Q2 and P1 five-second leave/rejoin after Q4 returned as `already playing` and passed
the coordinator's identity/partner checks. Both rode to Far Head and arrived dry: P1 at page-clock
**399.2 s**, P2 at **573.2 s**. Q6 received all **32 logs / 32 rails**, but P2 then failed
`NEVER: dry co-op landing` before the next walk, at **640.9 s** of its resumed page clock. It was nearly
stationary at **(1372.365, 24.588, -180.404)** with `coyote=-32.067`; P1 was beside it and had reached
checkpoint 21, but that checkpoint was not jointly released. All four telemetry segments recorded **zero
water falls**; two segments each recorded a 2-second pushing interval. This is an actual route failure,
not the earlier query mistake, and its cause is not established as a water regression.

Opened `run/end-still.png` and `run/p2-end-still.png`: both avatars are visibly on the dry pier worksite,
close together. Static appearance does not establish the missing grounded contact. Both last-state files
have `ended=true`, one partner, matching stations/rack/shared rewards and contributions **158 / 164**,
but **both `atPier=false`**. The route never reached the three-sample final convergence check. Separate
last-state train positions were sampled at different times and are not a valid final train comparison.
The final synchronized warp sample had equal ticks **14734** and millimetre train-position differences;
sampled moving-train gaps peaked at **0.343 / 0.979 m**. Every segment averaged **2.00x**, with transient
clock deficits up to **11.370 s** in segment 0 and **2.534 s** in segment 2 that caught up by segment end.
These acceleration warnings remain part of the result. Graphics errors were **none**.

A [short staged contact diagnosis](../../.look/evidence/1793837634626-36051/evidence.json) placed both peers
once at their recorded positions through the existing broker eval seam, then observed real contacts.
Opened `pier-contact-still.png` and `p2-pier-contact-still.png`: both stand dry beside the worksite. They
shifted about 1–3 m during settling and regained `coyote=0.1` with upward contacts. The restored scene's
job was asleep and trains stopped, so this did **not** reproduce the failed completed-room state. It is
not a route pass, final-state comparison, or basis for a speculative grounding/bot-assertion change.
No small verified fix was established; no production physics threshold was changed to force a pass.

**4–6 remain unrun after the real route failure.** No new `world-inputs`, `smoke` or `caves` result or
scenario-runtime comparison is claimed. All five ordered runs plus the staged diagnosis reported **no
GPU errors**; no forced instance overflow was attempted. Mobile emulation was not reached, so mobile
load-to-first-play, frame cost and runtime quality selection remain unverified. Source still selects
`q=mobile` or coarse pointer at **0.6** world resolution. **A real iPhone is untested**, as are Safari,
physical gamepad/touch, Retina/mobile thermal performance and real-time feel.

Changed docs were passed through `npx prettier --write`; final `npm run check` **passed** lint, types,
**297 tests**, registry, levels, assets and build (log: `.look/water-followup-check.log`).
The implementation's existing physics replay matched **1108 frames**
within **0.01**; no physics source or fixture changed in this follow-up. No external network, push or ship;
remote `inflight` remains skipped under the local-only restriction. Classic/prototype defaults and the
water demo's separately owned sea remain unchanged; the demo still ignores the production `water=old`
selector. Step 7 remains partial, and step 8 documentation/acceptance remains open.

### Evidence and the starting point

Code inspected at `0fe0799b83742144e706aa26700e27e349b73d90`, 3 November 2026. Read AGENTS.md, DESIGN.md, [the decision log](../proposals/boogle-2.md), [find-the-fun](find-the-fun.md), the render contract and the following existing research:

- [Ultra Water](../research/ultra-water.md), especially shore fields, filtering, engine comparisons, wave queries, recommendations 2–4 and 7–8. Its earlier recommendation to defer FFT/underwater predates the owner's decision to start from the full demo and retain its features; it is not a reason to replace the now-built FFT with a smaller analytic sea.
- [Demo validation and cost follow-up](../research/water-demo-validation.md) and [wave diagnosis](../research/water-demo-diagnosis.md): source-shaped `.25` spectral energy, caustics/refraction, pass accounting and measurement limits. These are earlier evidence, not new measurements made for this plan.
- [As-built water prototype](../game-design/water-proto.md). Where it differs from code, code wins: `quality.ts` currently makes mobile **resolution 0.6 only**; `waterCaustics=cheap` and `waterTerrain=cheap` are diagnostics. Its older mobile counts and terrain/caustic defaults need correcting when that documentation is moved.

The default URL now selects `place`; `?classic=1` selects home. `main.ts` calls `createWaterMesh()` once. Today's `water-render.ts` owns a fixed 1300 m plane, packed home height texture, tiny sine displacement, eight ripple slots and sky uniforms. `place/index.ts` calls `buildLand()`, `dressSea()` and `extendSky()`: `crossing/sea.ts` patches that material and substitutes **14 m depth outside the home grid**, while `crossing/sky.ts` adds four flat outer rectangles. It does not sample the place's gorge bed.

One baseline was inspected through the supplied broker: [manifest](../../.look/evidence/1793728078608-29177/evidence.json), [still](../../.look/evidence/1793728078608-29177/water-plan-place-baseline-still.png), [motion sheet](../../.look/evidence/1793728078608-29177/water-plan-place-baseline-motion.png). Question: **Does the existing gorge water show shallows tied to the river bed and banks?** Camera `(972,22,55)` looking at `(1000,0,20)`, `proto=place&tod=0.3`, 1210×702. Both PNGs were opened: the river is a largely uniform blue strip with no visible bed or shallow colour transition against its green banks. That supports this integration target, not a verdict on the proposed water. Capture health passed: WebGPU, advancing completed frames, no page/console/gfx errors. The two-frame sheet establishes neither smoothness nor device performance. `look --at list` found no saved playthrough checkpoints; no bot or gameplay scenario was run. Artifacts are local and ignored, and describe the unchanged source tree before this documentation commit.

### What graduates, and what does not

| Piece                 | Source and decision                                                                                                                                                                                                                                                                                                                                  | Order                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Shore bake            | `shore.ts`'s bed/SDF/gradient, travel-time/direction/shoaling and shelter fields; parameterize bounds, validity, sea level and obstacles. Remove the demo island dependency.                                                                                                                                                                         | First, before the visible switch.                                                            |
| Surface and FFT       | `surface.ts`, `fft.ts`, `spectrum.ts`, `foam.ts`, `shore-nodes.ts`: the polar grid, four 256² bands (600/85/12/2.1 m), filtered moments/glints, shore attenuation, horizontal displacement inversion, trough clamp and impact rings. Keep `.25` energy as the comparison baseline, not a new claim about safe gameplay swell size.                   | Together; no shipped interim flat sea beneath a moving shader.                               |
| Refraction and foam   | Keep the single opaque HDR colour snapshot and depth snapshot, absorption/scatter, underwater underside, crest history, residual breakers, swash/contact foam and shared foam texture. The eikonal shore refraction and optical screen refraction are different systems; retain both. Replace `ROCK` special cases with explicit real obstacle data. | With the surface; wet-ground receivers next.                                                 |
| Caustics              | `caustics.ts`, driven by the existing FFT band 2 moments, applied to real submerged receivers through `patchNode`. No second ocean simulation.                                                                                                                                                                                                       | After real depths and materials are connected.                                               |
| Spray                 | `spray.ts`'s crest-timed emitters through shared `emit()`, with sites generated from each registered coast/obstacle. No second particle pool.                                                                                                                                                                                                        | After foam and its shore clock agree.                                                        |
| Underwater            | `underwater.ts` and `snow.ts`: GPU lens grid, waterline, absorption, Snell window, half-resolution shafts, wet-lens exit and bounded snow field.                                                                                                                                                                                                     | After wave queries, camera and cave exclusions; required before calling graduation complete. |
| Sky, terrain and post | Demo `height.ts`, `island.ts`, `ground.ts`, `views.ts`, `atmosphere.ts`, `sky.ts` and metered AgX `post.ts` are **not** the production world's sky, terrain or tone-mapping implementation. Extract only reusable wetness/caustic receiver logic and resolution policy.                                                                              | Preserve in the water archive, remove from runtime after the replacement.                    |

Do not add planar reflections, floater shadows, a current simulation, tides, flood rules, boats, breath/drowning, terrain deformation or new progression. The demo's missing rock reflection and surface-shadow sampling remain known limits; they are not silently included in graduation.

### Engine comparison and ownership

These comparisons reuse the primary documentation already recorded in [Ultra Water](../research/ultra-water.md); no external network research was performed for this plan.

| Engine precedent                                                                                                                                                                                                                                                                                                                                                                                                         | Boogle's corresponding choice and difference                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Unity HDRP](https://docs.unity.com/en-us/engine/6000.0/manual/render-pipelines/choose-a-render-pipeline/feature-comparison) separates compute water rendering from CPU simulation/GPU readback used for gameplay. HDRP water is not an iOS performance precedent.                                                                                                                                                       | One Local FFT/shore renderer and a separate synchronous physics-query interface backed by bounded asynchronous results. Rapier and existing per-object ownership keep authority; no shared ocean state.                                                                                                 |
| [Unreal Single Layer Water](https://dev.epicgames.com/documentation/en-us/unreal-engine/single-layer-water-shading-model-in-unreal-engine) reads opaque scene colour/depth and accounts for water in a dedicated rendering path, with simpler mobile options. [Its buoyancy component](https://dev.epicgames.com/documentation/en-us/unreal-engine/water-buoyancy-component-in-unreal-engine) uses a few volume samples. | Retain Boogle's in-pass opaque snapshots and one RenderPipeline, not Unreal's tile/reflection pipeline. Query the existing player's/ball's required points and apply bounded Rapier forces; do not import a new floater integrator. Measure copies, resumptions, mips and compute, not just mesh draws. |
| [Godot screen-reading shaders](https://docs.godotengine.org/en/stable/tutorials/shaders/screen-reading_shaders.html) capture opaque 3D content before transparents, so transparent objects are absent.                                                                                                                                                                                                                   | Explicit opaque-only refraction: terrain, opaque characters and structures are eligible; particles/glass/other transparent water are not promised through the snapshot. Keep water ordering and depth writes deliberate and test objects crossing it.                                                   |

`src/render/water-render.ts` stays the **single public production entry** and owns `createWaterMesh()` and the sea entity's lifecycle. Extract implementation into `src/render/water/`, retaining plain modules, no new dependency, no static production import from `src/proto/`. Keep the existing `main.ts` call; do not add another automatic sea spawn. The entity owns its mesh, GPU resources and cleanup; `createSnow()` becomes another entity, and spray gets an entity method instead of its prototype `onFrame`. Follow `src/entities/ball/index.ts` for lifecycle, not the prototype's `scene.add` calls.

- `water/state.ts`: clock, lighting handles and eight ripple slots, with no scene/terrain import. Re-export established `seaU`/`seaRipples` handles from the facade while migrating real consumers. Delete obsolete handles once their consumers are gone. `sky.ts` must not import a module that imports `sky.ts` back.
- `water/shore.ts`, `shore-nodes.ts`, `shore-providers.ts`: bake, CPU/GPU lookup and provider lifetime; no dependency on an island's index module. Terrain owners register, water consumes.
- `water/{surface,fft,spectrum,foam,tuning,tsl}.ts`: one renderer, one common phase origin/clock, one set of FFT textures for every island and far sea. Tuning becomes explicit settings, not prototype URL reads at module evaluation.
- `water/{receivers,caustics,spray,underwater,snow,quality,queries}.ts`: bounded effects/query resources owned by the sea, with teardown and precompile. Keep these components callable; they do not install independent animation loops or overwrite each other's output nodes.
- `src/physics/water-field.ts`: renderer-free water sampling contract and pond/volume composition. It never imports TSL, scene, an entity view or a prototype.

Create CPU resources before the first sea is visible; GPU work waits for `rendererReady`, as the existing main call precedes renderer initialization. Use the normal precompile/loading path. Essential surface/FFT/shore work is eager; below-water resources may be prepared lazily well before entry, without a first-dive compile stall. Teardown releases targets, buffers, textures, callbacks and query generations.

### Real ground, multiple islands and far water

Add `registerShoreProvider({ id, bounds, seaLevel, revision, bedAt, obstacles })` returning an unregister function. `bedAt(worldX, worldZ)` returns `{ valid, height }`; invalid is never a clamped edge texel. Bounds are world metres with explicit positive-z texture rows, and baking subtracts `seaLevel` from heights. Sea level remains `SEA = 0`, read from existing constants, not redefined in world state.

**Home:** use the finalized `heights` exported by `src/island/terrain.ts`, preferably through its scene-free owner `src/island/heights.ts`. The 409×409 grid spans 510 m at 1.25 m cells: `x = i*CELL-HALF`, `z = HALF-j*CELL`. Register from the sea's home setup before its first bake. Sample the actual stamped grid, including court/POI ground, not a second evaluation of the natural island formula. Return invalid outside its domain; beyond the known seabed transition use the explicit open-sea fallback.

**Place:** add `src/proto/place/water.ts` and one registration call alongside `buildLand()` in `src/proto/place/index.ts`. It imports the finalized `H(worldX,worldZ)`/height grid from `terrain.ts` (re-exported by `land.ts`), with bounds from `layout.ts`: local x −260..520, z −280..260, 2 m cells, offset `(1000,0)`. `H` returns −6 outside the grid; that is **not proof of validity**. Register only the grid bounds. Use the finished padded/path-cut heights, not `ground()` before stamps, a mesh raycast, bridge decks, tracks or the building collision hulls. Minimal `land.ts` material attachment is separate from terrain generation. Round 4 owns the data and revision; a changed revision invalidates only that provider's bake. Its current fields are static, not rebaked each frame or chop.

Start with one padded region per source: 512 m core / 512² samples for home, 1024 m / 512² for place, centred on each source's bounds, plus halo sampling for distance/travel calculations. This is roughly 1 m and 2 m per texel; it cannot resolve a narrow piling. Preserve validity inside those regions, do not invent a square coastline at their edges, and handle all-wet/all-dry distance-transform inputs without infinities. Blend to the explicit deep fallback only in a known-water apron, never across a coast. Verify that edges of the actual data are below the sea; where they are not, require an adjacent ground provider rather than fading land away.

Use texture-array layers and a bounded table of world transforms/valid bounds (initial capacity eight simultaneously resident shore regions). Solve travel/shelter over a whole connected coastline with a halo before packing it; do not restart wave phase at arbitrary tile edges. World-space FFT, foam noise and breaker phase use one immutable phase origin, never the tile centre or camera position. For adjoining ground providers, resolve the shared bed/obstacles before the bake and use identical halo values; select one coherent shore/travel tuple in overlaps rather than blending unrelated travel times. A fully separate island has its own coast, with the shared world phase.

One FFT, foam texture and caustic set serve all regions. Retain coarse bed coverage for visible distant islands; load detailed shore regions near their shores, not a 512² texture over the entire archipelago. Do not silently evict a still-visible detailed shore when capacity is exceeded: report the capacity and add a coarser regional bake or raise the measured bound deliberately. This is a bounded rendering registry, not a new world-streaming or save system. The place's `buildFar()` cones are scenery without an `H` provider; do not claim they have playable bathymetry. When such an island becomes reachable, its ground owner must register real bed data.

Remove the hard-coded `(2400,0)` offset everywhere: FFT samples, shore nodes/noise, caustic receiver coordinates, spray and surface queries. Real rocks/pilings may register projected circle/box obstacles: bed/coast stays the actual terrain, while wave shelter sees the obstacle top. The demo hero `ROCK` and `SWASH_ROCKS` do not graduate as invisible obstacles. Screen-depth foam supplies visible contacts; sub-texel supports use explicit obstacle distance, not higher resolution across the entire world. The gorge receives shallow-water attenuation and shelter; do not label its shore travel field a downstream flow solver.

### Camera range, depth and what follows the camera

| Route now                 | Near / far                              | Other relevant bounds                                                                                                    |
| ------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Classic game (`scene.ts`) | 0.1 / 1500 m; FOV 62°                   | Fog 110–520 m; sky sphere radius 700 m.                                                                                  |
| Place via `extendSky()`   | 0.25 / 4680 m (3600×1.3); FOV stays 62° | Place overrides fog to 320–1700 m. Crossing variants derive their own far range.                                         |
| Water demo                | 0.5 / 80000 m; FOV 50°                  | Polar detail nominally to 3000 m, last ring at 77600 m; camera-height grid scale can expand detail. Fog density 1/18000. |

Keep the **existing per-route clip distances and gameplay FOV** first. The near/far ratios are 15000, 18720 and 160000 respectively: copying the demo's near plane does not establish equivalent precision at its far extent. Ordinary perspective depth loses world-distance resolution quadratically with distance; near matters strongly, and a near-plane increase can clip characters, held objects, cave walls and room cameras. The renderer currently opts into neither reverse nor logarithmic depth. Do not add either without a separate, justified renderer proposal and approval.

Parameterize grid creation with the active camera range: detail radius at most `min(3000, 0.5*far)`, outer skirt below `0.97*far`, with monotonically ordered rings after altitude scaling. Blend displacement to zero before the skirt and fog to the current horizon before clipping. Rebuild geometry only when the route/range changes, not every frame; rerun the overlap/depth tests at high fall/glider cameras. The demo's `0.04 + distance²*2e-7` trough clearance is a heuristic tied to its view: remeasure at real near/far values instead of retaining metres of artificial clearance at long distances.

Only the polar mesh's sampling footprint follows camera **x/z** and its grid density follows camera height; wave phase, shore fields, rocks and foam stay world-locked. Lens grid and shafts follow the camera; marine snow wraps in its bounded 24 m box; spray culls to the camera but its emission sites remain world-fixed. Keep the game's sky/cloud follow and shadow anchoring in their current owners. Do not copy the demo's camera-following 2000 m sun, ±900 m shadow camera or global 4096 shadow-map override. Remove the four crossing sea rectangles once the polar sea covers their range.

**`src/render/scene.ts` need not change for the recommended plan.** Existing `scenePass`, `pipeline`, `rendererReady` and camera exports suffice, as they did in the validated prototype. Keep one linear HDR scene pass, stored 4× MSAA colour/depth and one final tone-map/sRGB output. The underwater module should return an HDR node to the water coordinator instead of assigning `pipeline.outputNode` behind another effect's back. Compose from the existing HDR chain once and restore it on teardown. Any need to change renderer construction, depth mode, MSAA storage, global tone mapping or boot ownership is a new approval item, not a reason to quietly expand this plan.

### Sun, moon and the separate tone decision (historical recommendation)

**Superseded on 3 November:** the owner selected the single frozen demo-sky bake and metered AgX described above. The following paragraphs preserve the reasoning for the original recommendation, not the operative implementation direction.

`water/sky.ts` currently compares an exact string of all sky parameters. A changed sun rebuilds atmosphere LUTs on the CPU (about one second in the recorded initial bake), renders six 1024² cube faces, generates mips and invalidates native PMREM. The demo pins its sun after `day-night.ts`; the game continuously updates sun/moon from `worldMs(dt)`. Passing that continuously changing angle to `demoSky.update()` would turn an infrequent demo bake into recurring frame stalls.

Recommended solution: retain the owner's **original sky and faceted clouds**. Extract the existing sky's directional colour/glow calculation into `src/render/sky-radiance.ts`, sharing uniform handles with `sky.ts`; provide `skyAt(direction, roughness)`, `ambient(normal)` and light colour to water using that inexpensive live node evaluation. Broaden the analytic glow with roughness rather than running the demo atmosphere/cube/PMREM path. This changes water's reflection source to the actual game sky; it does not import the demo sky or the parked `?proto=sky` look. Compare the glint lane and horizon under that difference explicitly.

Direct highlight direction/colour follows the game's active key light, including moonlight, each frame. Solar caustics and sun shafts use the actual sun-above-horizon/day factor, so switching to the moon does not produce noon caustics. Cave attenuation is additional to day/night. Keep `updateSky`'s exposure/night readability and place's existing light grade. No freezing time, per-frame atmosphere baking, or fighting scene background/environment assignments.

If the owner later requests the demo atmosphere too, plan it separately: precomputed or worker-baked LUTs, bounded update cadence, cached/double-buffered cubes, coherent face publication and transitions need measured approval. Merely throttling a one-second synchronous bake is not a fix. This plan does not carry `installDemoPost()` into production: Neutral remains until the separate character side-by-side selects otherwise. Whatever wins, tone mapping happens once, after underwater HDR composition.

### Moving water, authority, swimming and caves

| State                                                                   | Sync kind / authority / API                                                                                                                                      |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FFT, fields, foam history, caustics, spray, snow, lens wetness, quality | **Local**, computed by each tab; entity methods and renderer resources, no network API or persistence.                                                           |
| Player swim/dive forces                                                 | **Owner**, only this tab's existing Rapier player; existing avatar presence already carries the resulting pose.                                                  |
| Ball buoyancy/drift                                                     | **Owner with transfer**, only `ball.mine && !ball.held`; retain existing `createOwnerSync` and `b` presence shape. No changes to `sync.ts` or owner arbitration. |
| Remote splashes                                                         | **Local**, derived from displayed poses as today; no new message or presence field.                                                                              |
| Sun schedule                                                            | Read existing `sky.ts` state/clock only. No new Host/Lockstep state, op, state key, migration or namespace bump.                                                 |

The prototype **does not install a moving `waterField` provider**. `Ocean.heightAt` is a GPU node for the lens, not a callable CPU height function. `waterField.surfaceAt` defaults to `SEA`; caves wrap it with their higher pond. Player swim/jump shape and `physics/flight.ts` read it. `ball/state.ts` separately adds the old sine waves and decides a pond is any surface above `SEA + .06`: a real crest would be misclassified as a still pond. `splash.ts` compares yesterday's bottom against today's water height and checks home `groundHeight`, which is wrong for a moving surface and for place.

Choose the FFT-compatible query path from the research, not a synchronous GPU wait or a full CPU FFT every physics tick:

- Add a bounded `water/queries.ts` batch using the same `heightAt` displacement inversion, shore attenuation and trough clamp, for the local player, owned ball and registered observed bodies. Use a fixed-capacity request table (64 points initially) and at most two pending storage-buffer readbacks through `getArrayBufferAsync()`. Retain request position, sample time, monotonically increasing sequence and a consumer generation; map the ball generation to changes in ownership/held state and teleport events. Never apply results inside a Promise callback: publish completed results at the next pre-physics boundary.
- Extend the renderer-free `waterField` contract with `sampleAt(id, { x, y, z })` returning `{ height, verticalVelocity, bedHeight, body, valid, age }`, plus provider installation/removal and named still-water volumes. The query position includes height so a 3D cave exclusion can distinguish a body under the roof from one outside above it; the ocean kernel itself samples x/z. Calls return synchronously and request the next sample. Migrate physics/splash consumers to stable IDs. Keep `surfaceAt(x,z)` as the non-authoritative compatibility lookup for incidental fish/gull decoration, using nearby valid cached samples or mean sea/pond; document that fallback rather than pretending it is an exact FFT evaluation.
- Reject out-of-order results, generations from before a transfer/teleport, samples older than 100 ms or farther than 0.5 m from their request position. These are initial tuning limits to verify in the query captures. Short extrapolation uses bounded surface vertical velocity; invalid/late samples ease to the provider's mean level, and cannot emit entry splashes. Teleport/ownership changes clear interpolation immediately. No `await` in physics/frame hooks and no new networking code.
- Maintain one Local water clock derived from the existing frame elapsed time. Set it before physics/splash work and use its unwrapped elapsed value for breakers, spray cycles, query timestamps and ripple ages; derive modulo-300 s phase only for the FFT's quantized periodic spectrum. Wrapping shore waves or ripple ages at 300 s would introduce a visible jump. Different tabs may have different cosmetic phases, as today; only the owning tab applies forces. Reset delayed samples at a true local clock discontinuity. Do not add a lockstep water clock to make decoration identical.
- In `player/state.ts`, preserve buoyancy/drag and make dive an input to that controller instead of cancelling a copied force formula at order 1001. Keep `SWIM_DEPTH = .35` and Space/A swim-up. In `ball/state.ts`, use the sampled height and explicit `body === 'pond'`, remove the duplicate sine sea, and keep forces bounded. Replace origin-radial sea drift near place with the registered coast's normal/tangent; this is the existing gentle wash-in toy, not a new current system. Update camera sea-floor constraints, thrown-item preview and impact/ping water contacts where they assume `SEA`; land return safety may keep mean sea level as its deliberate static rule.
- Track previous **signed submersion** and water-body identity in `splash.ts`, use relative downward speed against the sampled surface, preserve cooldown/teleport guards and remote cleanup, and use the registered bed or `groundProbe.under(x,y,z)` for cave floors. Send sea impact rings only to sea water; pond splashes do not seed invisible ocean rings below the pond. A rising crest crossing a stationary body must not repeatedly fire a landing splash.

Near-camera optical state remains **current-frame GPU evaluation**, including a near-plane grid; it must not wait for the delayed physics readback. Measure query/display error near the player and ball: start with a target of at most 0.15 m vertical mismatch at accessible shores in ordinary motion, recording high-percentile/max error and rejected sample age. Triangle/LOD filtering and four-iteration inverse error mean exact agreement is not promised. If the delay cannot meet this target, stop for a query/force design revision before default enablement; a flat physics sea beneath metre-scale visible crests is not acceptable.

**Controls (owner revision, 3 November):** remove `water-dive`, `KeyC`, its D-pad right claim, touch button/CSS, guide row and renderer-free intent. Step 5 now uses automatic high-fall plunges in the existing player buoyancy controller. Surface swimming is the default, with no input needed to return after a plunge; Space/A retains swim-up. The earlier instruction above to add a dive input is superseded. Underwater optics, droplets and marine snow remain camera-driven.

Core-free slots remain `lb, rb, r3, up, down, right`; place uses LB/RB/R3 for its moves, the prototype bar uses Down, and updates reserves Up at runtime. Right is released by removing Dive. Recheck runtime `freeSlots()`; retain Up free for updates. No replacement key-only binding or rewriting another action's handler.

**Caves:** replace the load-order-sensitive `surfaceAt` wrapper in `pois/caves/index.ts` with a named pond provider using its existing ellipse (`q < .81`) and `POND.level`, with explicit still-water identity. Preserve higher-water composition where sea is physically exposed, but let the cave's existing 3D `inCave` predicate exclude ocean waves under its roof; do not interpret the heightfield above a cave as its pond bed. Export/register that predicate through a callback, not a reverse import from water to caves. Keep cave mesh, pond surface, masks, collision groups, `groundProbe`, camera constraints and `atmosphere.underground` intact. Underwater effects query the actual water body/volume: no marine snow, sun shafts or ocean fog in a dry below-sea room; the pond uses its flat level with restrained absorption and no outdoor surf/solar caustics. Review its surface/volume mask at the ellipse edge. The current fixed `UNDER.nearHeight = 4` and snow `y <= 0` tests are not sufficient for a raised pond or high crest; parameterize them by body level/envelope and GPU water height.

### Budget and acceptance

M1 Max is the **average** target, M4 iPad Pro the **floor**. Keep high's four bands, 384 angular segments, curved crests and filtered glints initially; the previous 192-segment trial visibly squared off Breakers without a clean measured gain. Keep mobile's 0.6 world-resolution starting policy and desktop high, with an override. Move resolution scaling out of AgX `post.ts` into `water/quality.ts`; normalize against adaptive DPR exactly once, apply after adaptive resolution updates, and restore on disposal. This scales the shared scene, not just water: inspect characters and UI at actual world/output dimensions. Do not quietly turn diagnostic cheap caustics/terrain into defaults.

The owner's iPad report is **60 fps at 2178×1346 for five seconds standing still on the prototype**. Treat that as encouraging reported evidence, not a sustained full-game budget; internal world target size, moving cameras, day/night rebuilds, underwater, thermal stability and busy co-op are not established by it. The recorded M1 Max high GPU-span windows at 1920×1200 were 7.78–8.56 ms means with 11.22–12.32 ms p95; those cover the demo frame, not water's incremental cost in place. The instrumentation had overlapping/nested timestamp caveats; do not sum render and compute times or equate GPU span with presentation latency.

Initial acceptance: sustained 60 fps target in the actual game, report mean/p95 and >33 ms frame gaps, measured before/after water deltas and remaining headroom under 16.7 ms. Leave margin for future graphics; the exact margin/quality tradeoff is the owner's call. Measure at matching output **and world** resolutions, with the GPU otherwise idle, fixed views followed by 20/50 m/s travel, turns, glides, underwater entry/exit, sunset/night and ten-minute device play. Record adapter, browser, DPR, MSAA storage, dynamic resolution, active layers, target memory, startup bake time, queries and draw/pass counts. Broker capture FPS is not a benchmark.

Account for the ten FFT dispatches; high caustics' two raster targets, three splat draws and 17 internal mip draws; one colour and one depth snapshot plus pass resumptions; and near-water lens compute, one half-resolution shaft draw and one snow draw. The new query compute/readback is additional and must be measured. The two exposure passes and atmosphere cube/PMREM work do not graduate under the recommended sky/tone path. No savings are promised until measured in place. If insufficient, first tune measured resolution/effect costs with visible comparisons; do not lower wave energy, mesh quality or MSAA just to meet a guessed budget.

## Steps

Step 7 is partial under the 4 November override above; its original removal scope below is **not authorized**
for this replay switch. Step 8 remains open. Current switch verification is recorded separately below.

Every numbered item is an implementation commit or small group of commits **after approval**, leaves `npm run check` green, formats only changed files, and updates affected as-built docs in the same commit. No new unit tests or scenarios for this Local rendering/feel work. Use existing diagnostics and harnesses; no source edits during a capture.

- [x] **1. Establish the production water contract and real shore providers.** Create `src/render/water/{state,shore,shore-nodes,shore-providers,tuning,tsl}.ts`, extracting the existing bake and removing fixed demo coordinates; add `src/proto/place/water.ts` and its minimal registration in `place/index.ts`. Register home from finalized `island/heights.ts` data through the water facade. Keep the current renderer active until the replacement is complete. Verify axis orientation, known home/place bed samples, invalid exterior, wet/dry-only regions, paired region borders and obstacle-vs-bed separation with inspection/diagnostic outputs; inspect the gorge and home shore in the broker. Run `npm run check`.
- [x] **2. Move the surface/FFT/refraction/foam into one owned sea and lighting adapter.** Move reusable `surface.ts`, `fft.ts`, `spectrum.ts`, `foam.ts` into `src/render/water/`; keep the prototype scene temporarily as a client of those same modules, with explicit demo settings. Make `water-render.ts` the resource/lifecycle facade; keep one sea instance and update ordering, no duplicate FFT or particle pools. Create `sky-radiance.ts` and adjust `sky.ts` to share its existing sky calculation, without changing its look or scene.ts. Verify reference Lagoon/Breakers and real-bank captures, one colour/depth copy, shader health and resource disposal; run `npm run check` and record a before/after performance baseline on an idle GPU. New real-world rendering can remain a local debug opt-in until step 7.
- [x] **3. Connect moving-water queries to swimming, the ball, splashes and cave volumes.** Create `water/queries.ts`; edit `physics/water-field.ts`, `entities/player/state.ts`, `entities/ball/state.ts`, `render/splash.ts`, `physics/flight.ts`, `pois/caves/index.ts`, `entities/camera/index.ts`, and the fixed-SEA contact readers in `features/impact.ts`, `features/ping.ts`, `player/throw.ts`. Preserve ownership APIs and existing wire data. Exercise jumps, entry, a stationary crest, fast throws, teleport, ownership/held changes, late readbacks, and the cave pond with captured query-age/error readings. Run `npm run sim -- replay` because player/ball physics changed; explain intended replay differences rather than silently replacing fixtures. Run existing broker `scenario caves` on the classic route (make that existing scenario select `classic=1` if needed) and `scenario smoke` for two-player ball authority, plus `npm run check`.
- [x] **4. Apply caustics, swash/wetness and spray to real receivers.** Create `water/{receivers,caustics,spray}.ts`; minimally attach receiver patches in `island/terrain.ts` and `proto/place/land.ts`/`look.ts`, retaining terrain colour, roughness, shadow and cave mask nodes through `patchNode`. Register real contact obstacles, generate world-fixed emitter sites, and spawn a spray entity before the shared particle upload. Gate receiver light by depth, orientation, daylight and shelter; verify no caustics shine through dry bridges or cave roofs. Compare a bank, rock/support and beach at dawn/noon/night; inspect stills and consecutive recorded frames, count mip work and run `npm run check`.
- [x] **5. Integrate underwater composition and automatic high-fall plunges (owner revision, 3 November 2026).** Keep production `underwater.ts`/`snow.ts`, their body masks, HDR output and surfacing droplets. Remove the entire manual dive action (C, D-pad right, touch button/CSS, generated guide row and controller intent). Swimming defaults to the surface; entry at ≥14 m/s retains downward momentum, faster falls go deeper (existing 20 m/s fall cap), and buoyancy floats the player up without input or breath mechanics. Slow entries limit downward speed to 1 m/s relative to the surface; downward drag 1.2/s, upward drag 3/s, passive ascent cap 2.5 m/s with gain 8/s. Keep Rapier collisions and existing Owner pose delivery; old sea forces stay unchanged without `water=new`. Verify high drops and a low-bank jump using broker `--action --video --curves`, extract consecutive frames and report measured depths. Check controls are absent and camera-only submersion still shows the underwater look. Run `npm run sim -- replay` and `npm run check`. Real-time feel remains for the owner. The earlier manual-dive evidence below is historical, superseded by this revision.
- [x] **6. Fit route ranges, day/night and quality without changing scene.ts.** Add range/quality helpers under `src/render/water/`; adapt `crossing/sky.ts` and the small place setup to use one polar surface at existing clip ranges, removing rectangle creation and obsolete sea-only colour writes. Retain unrelated crossing fog/day behavior and place's lighting. Extract only the mobile resolution normalization from `proto/water/post.ts`. Inspect horizon, region transitions, Far Head, 20/50 m/s train views, high fall/glide, near-face/held-object views, rooms/caves, sunset/moonlight and resize/resume. Run `npm run check` and matched M1 Max before/after `npm run perf`; use the supplied broker for browser work when running in a launched task, never another Chromium.
- [ ] **7. Switch the real sea and remove the replaced prototype/seams.** Enable the completed water for default place and classic home in `water-render.ts`; delete `dressSea()` imports/calls and `src/proto/crossing/sea.ts` after checking every caller. Tag the last intact demo `archive/water`, then remove `src/proto/water/` and `features/proto-water.ts`, retire the local opt-in switch, and mark the water card `archived` in `protos/protos.ts` with its graduation destination. Update its playlist entry. Remove the old packed home texture, sine material, `seaDepth`/`seaFoam`/`seaRings` material-patch API, hidden-old-sea traversal, demo teleport/CCD/soft-wall overrides, camera/sun/fog overrides and superseded diagnostics/URL options. Migrate reusable `dev/water-diagnose.ts` and `dev/look/evals/water-*.ts` imports; archive demo-only diagnostics with the tag instead of leaving broken imports. The parked sky prototype must stop depending on the removed water horizon seam: remove `water-render.ts`'s `protoOn('sky')`/`uHaze` branch and its write in `proto/sky/index.ts`, without graduating or deleting that unrelated prototype. Prune only removed ESLint suppressions. Search all references to old exports, `ISLAND_AT`, `ROCK`, `dressSea`, `proto=water` and old module paths; classify documentation/archive references explicitly. Run `npm run check`.
- [ ] **8. Document, verify the real round, and hand it to the owner.** Move/replace `docs/game-design/water-proto.md` with `docs/game-design/water.md`; update the index, island/player/ball/place/crossing/cave/control entries that changed, `src/render/README.md`, the related find-the-fun checkbox and `docs/atlas/stories/` water story. Keep research as historical evidence and retain `public/THIRD_PARTY_NOTICES.md` attribution in the built output. Run the supplied broker's full `playthrough`, read its report even on failure, inspect saved relevant shore/train/dive views, and run existing `world-inputs`, `caves` and `smoke` scenarios with the appropriate route. Run `npm run check`, `npm run atlas -- --check` (advisory), final matched perf/device checks and a diff simplification review. No `check:full` solely for rendering; protected network/world files should be unchanged. Stop when ready for the owner's playtest; do not start additional development/check-in loops while waiting. One line: “The new water now meets our real shores and you can dive into it.” One question: “Does this water feel at home here, from the bank and when you jump in?”

### Step 1 evidence (3 November 2026)

`npm run check` passed (292 unit tests, registry, five levels, assets and build). Diagnostics found finite all-wet/all-dry
fields, exact home grid samples with correct z orientation, valid endpoints and invalid exterior, matching paired-region
border bed/distance, and obstacle top 2 m retaining bed −4 m. At place `(1000,20)`, source bed is −2.200000 m and the
half-float atlas reads −2.198242 m. The atlas retains 80 halo texels around each 512² core: 672² resident layers,
capacity eight, 72,253,440 texture bytes. Browser CPU bake/upload preparation measured about 1.08 s for home and 2.26 s
for home plus place; this cost is absent from the default old sea.

Opened home still/motion ([manifest](../../.look/evidence/1793729382663-62006/evidence.json)) and gorge still/motion
([manifest](../../.look/evidence/1793729416317-63044/evidence.json)): the original sea and shores remain visible and
unchanged in treatment, with no graphics errors. Home includes the avatar; the gorge avatar is occluded, so step 2 must
improve that framing. This step establishes bathymetry, not the new surface's appearance or real-time feel.

### Step 2 evidence (3 November 2026)

The new sea is local opt-in `?water=new`; default and demo routes retain their selection. Surface, FFT, spectrum and
foam now share production modules. One sea owns four 256² FFT bands, shore atlas, opaque snapshots and disposal.
The existing sky calculation is shared through `skyAt`; Neutral, scene.ts, demo sky and post remain untouched.
`npm run check` passed (292 tests, registry, levels, assets and build). The first two capture rounds exposed TSL
scope and cross-stage uniform problems; the third fixed both. All final captures report no graphics/page errors.

Opened PNGs: home still/motion ([manifest](../../.look/evidence/1793730279387-82512/evidence.json)); place bank
still, curves and four consecutive video frames ([manifest](../../.look/evidence/1793730297930-82769/evidence.json));
Lagoon and Breakers stills ([Lagoon](../../.look/evidence/1793730314252-83049/evidence.json),
[Breakers](../../.look/evidence/1793730489854-85927/evidence.json)); default still
([manifest](../../.look/evidence/1793730522844-86291/evidence.json)); lifecycle still
([manifest](../../.look/evidence/1793730549214-86590/evidence.json)); mobile bank still
([manifest](../../.look/evidence/1793730562350-86753/evidence.json)). Clear shallow colour follows real ground;
the avatar is visible at both banks, Lagoon retains refracted sand, and Breakers retains curved foam crests.
The default gorge stays flat blue. A thin dark water/terrain edge and missing receiver effects remain for step 4.
Consecutive frames show advancing water detail without an obvious jump; real-time smoothness remains unverified.

GPU-span method from water-demo-validation, matching 1210×702 world/output, DPR 1, stored 4× MSAA, Metal-3 adapter,
HeadlessChrome 156: old means **3.947 / 3.666 / 3.572 ms**, p95 **4.505 / 4.162 / 4.094 ms**
([baseline](../../.look/evidence/1793728982475-52995/evidence.json)); opt-in means **5.387 / 5.135 / 5.017 ms**,
p95 **6.402 / 5.699 / 5.668 ms** ([gorge still and cost manifest](../../.look/evidence/1793730505873-86152/evidence.json)).
The apparent mean delta is about **+1.45 ms**, with 11.3 ms to the 16.7 ms frame budget in these stationary windows.
No exclusive GPU reservation or clock telemetry: this is provisional, not sustained device acceptance. Broker runs
did not overlap. Neither set had >33 ms frame gaps. New sea counts: 234 draws, five native raster passes, one colour
and one depth copy; old: 237 draws, three passes, no copies. New FFT contributes ten dispatches.

Disposal removed the sea entity and about 113.76 MB of reported GPU resources; recreation restored one sea and
the same geometry/storage/program counts, with a 36-byte reported residual needing lifecycle follow-up.
Mobile confirmed 726×421 world / 1210×702 output, four bands and unchanged camera clips; softer edges remain readable.
No swimming/ball wave agreement, cave integration, long travel, iPad or ten-minute device test is claimed by step 2.

### Step 3 evidence (3 November 2026)

The opt-in now publishes bounded GPU water samples before physics, preserving existing Owner APIs and wire data.
Swimming, the owned ball, splashes and camera constraints use the shared surface; previews use nearby cached/mean
water. Cave pond identity and the cave's 3D ocean exclusion replace the load-order wrapper. The default player/ball
replay is unchanged: **1,103 frames match both the trace and recorded browser session within 0.01**, with no fixture
replacement. `npm run check` passed: 292 tests, registry, levels, assets and production build.

Opened home still, motion, curves and consecutive recorded frames
([manifest](../../.look/evidence/1793731328146-99907/evidence.json)): the swimmer and owned ball bob at the real
shallow shore, with sand visible below. Opened the confirmed-wet place still, curves and consecutive frames
([manifest](../../.look/evidence/1793731470957-1895/evidence.json)): the avatar is in the gorge beside the bank,
with body height varying from −0.8 to −0.2 m. Earlier framing attempts put the home camera behind a bank and the
place avatar on dry ground; those are not swimming acceptance. No rendering/physics fix was needed for those poses.
Ordinary consumed query age p95/max was **16.7/16.8 ms at home**, **16.8/16.8 ms at place**. Matching-time/position
GPU-kernel prediction error p95/max was **0.00133/0.02145 m at home**, **0.00138/0.01413 m at place**. These satisfy
the 0.15 m initial query target in those captures; they do **not** establish exact rasterized triangle agreement.

Opened action curves ([manifest](../../.look/evidence/1793731422793-1344/evidence.json)): a stationary ball had four
water-height zero crossings, two suppressed crest entries and **zero new landing splashes**; drop entry, swim jump,
held state, release and teleport recovered. This diagnostic's first fast-throw attempt was blocked after its delayed
hand setup; a separate immediate grab/throw actually launched at **25 m/s**, stayed finite and owner-simulated
([manifest](../../.look/evidence/1793731647856-3879/evidence.json)). The jump/drop action's maximum prediction error
was 0.122 m; the separate throw's was 0.059 m.

Artificially delayed and reordered existing readback promises exercised rejection and recovery
([manifest](../../.look/evidence/1793731505918-2644/evidence.json), recovered still opened): **47 age**, **50 position**,
**3 generation**, **104 order** and **20 capacity** rejections, no readback failures. Rejected samples reached 200.1 ms;
the table stopped at 64 and pending readbacks at two. Stale player/ball heights eased to zero, then recovered to fresh
wave samples; both force consumers remained valid when observer capacity was exhausted.

Existing broker **caves and smoke passed** ([manifest](../../.look/evidence/1793731357856-271/evidence.json)). Opened
pond/hub and Bob stills: the pond stays flat, the hub is dry and both avatars render. Caves walked all 11 route points
with no stuck point and 0.01 m maximum floor sinking; eight hard throws stayed safe and the ball settled at 3.17 m
on the 3 m pond. Smoke verified two-client ball authority, toss delivery and all world hashes. No bot failure; the
full Round 4 playthrough belongs to step 8 and was not run here.

Opened the larger pond still ([manifest](../../.look/evidence/1793731541407-2978/evidence.json)): swimmer and ball
share its flat surface. Three new pond entries left all sea ripple slots unchanged; pond samples have zero age and
velocity. Height-aware diagnostics ([manifest](../../.look/evidence/1793731677444-4173/evidence.json)) identify the
hub as dry, the pond and inside ellipse as still water, the outside ellipse as dry, and above the roof as outdoor.
The first diagnostic used points inside the solid floor at the hub/ellipse edge; the corrected volume check samples
the actual room interior above that floor.

Matched gorge GPU-span means with queries were **5.071 / 4.965 / 4.811 ms**, p95 **5.510 / 5.389 / 5.265 ms**
([manifest](../../.look/evidence/1793731572570-3499/evidence.json)); same 1210×702 world/output, DPR 1 and stored
4× MSAA as step 2. No >33 ms gaps in these stationary windows. Five native raster passes, 234 draws and one colour/depth
copy each remain; queries add one compute dispatch to the ten FFT dispatches. Shared-machine drift exceeds the
apparent difference from step 2, so this does not isolate query milliseconds or prove a saving. About 11.6 ms remains
to 16.7 ms in the slowest mean window; future receiver/underwater work and sustained device testing are still ahead.

The source review simplified duplicated demo tuning into shared constants. Teardown testing with two delayed
readbacks found no stale callback into live state and removed the provider/readback buffers. It also identified two
1×1 viewport clones retained by shader precompilation (12 bytes per recreation), beyond the active snapshot and seed:
[allocation audit](../../.look/evidence/1793731753045-5499/evidence.json). The final lifecycle correction owns every
clone of each explicit sea snapshot seed. Final teardown/recreation twice, including disposal with two pending
readbacks, passed ([manifest](../../.look/evidence/1793731886322-7464/evidence.json), recreated still opened): texture
count/bytes return to **54 / 155,480,211** on both recreations, and to **43 / 63,249,455** on both disposals. Readback
storage returns from 2,048 to zero bytes; one sea becomes zero and the moving provider is removed. The tiny first
recompile program-text variation is 24 bytes and does not grow on the second cycle. No stale callback or graphics error.

Final affected-build rechecks were opened: [default still](../../.look/evidence/1793731887485-7507/evidence.json)
retains the original flat blue sea; [Lagoon](../../.look/evidence/1793731904330-8164/evidence.json) retains clear sand;
[Breakers](../../.look/evidence/1793731905599-8325/evidence.json) retains curved foamy crests; and
[home contact](../../.look/evidence/1793731906646-8371/evidence.json) retains swimmer/ball contact. All report no graphics
or page errors. Final home query prediction p95/max is 0.00131/0.03373 m, with 16.7/16.8 ms consumed age p95/max.
Full checks passed again after the lifecycle fix. Only lifecycle ownership changed after the earlier physics/scenario
and cost runs; no further rendering, forces or query-kernel change was made.

Remaining limits: shore-edge/refraction tears are visible in some frames, beyond a thin seam at the bank; real receiver
materials and submerged-mesh inclusion belong to step 4. Body bobbing is visible in curves, but real-time feel and
smoothness cannot be established from these stills/consecutive frames. Underwater composition, dive controls, exact
triangle/query error, long travel, sustained M1/iPad performance and the final sky choice remain unverified or deferred.
No protected source, tone switch, demo sky or post file changed. Steps 4–8 remain unchecked, and no push/ship occurred.

## Risks

- **Round 4 collisions:** `GIT_ALLOW_PROTOCOL=file npm run inflight` was attempted and stopped with `fatal: transport 'https' not allowed`, before network access. `inflight` unconditionally fetches and consults GitHub PRs, forbidden in this task. Cached branch inspection is not a live unmerged-work report. Local `codex/round4-simplify`, `codex/round4-whole-run`, `claude/walker-isolate` and `codex/default-round4` were inspected as coordination candidates and are already ancestors of this checkout. The local **`codex/tone-compare` advanced during this planning session to `abede2eb`**, outside this checkout's history; its committed diff was inspected without fetching or modifying that worktree. Cached ship refs can be squash-merged history, so their presence alone is not evidence they remain active. The caller reports Round 4 in flight: refresh real inflight status before implementation in a network-authorized session.
- **Concrete shared files:** Round 4's job, exploring, town and co-op tracks own `place/{index,land,terrain,layout,look,moves,moves-view,rooms,coop}.ts`; water touches the first few for registration/materials, consumes final terrain and shares pad/camera behavior. Its implementation must coordinate those minimal integration hunks, not freeze an earlier H/layout or port the whole place. **`abede2eb` directly changes `src/proto/water/index.ts`, `post.ts` and `docs/game-design/water-proto.md`, and adds shared `src/render/tone.ts` plus `src/proto/tone.ts`; it also changes `src/debug/look-post.ts` and `src/proto/place/look-gtao.ts`.** It leaves scene.ts/default tone mapping unchanged. Reuse its shared tone/exposure helpers if that track lands; do not delete them as demo-only code or compose underwater after its display transform. Sky work also overlaps `render/water-render.ts`, `render/sky.ts` and `proto/sky/index.ts`; preserve the owner's original-sky decision and only remove obsolete sea seams. No remote merge/deploy state was verified.
- **Shallow geography and deep water:** home seabed is −7.5 m and place's gorge is around −2.2 m, unlike the demo's deep basin. Its measured deep-water Hs is about 6.949 m even at `.25` energy. Actual bed attenuation/shelter must make banks, piers and routes calm without clamping an entire offshore ocean by guesswork. Newly transparent water can expose missing seabed geometry: home skips tiles below `SEABED + 1.2`; place skips triangles below −3.5. Render real submerged ground within the visible absorption range, with culling, rather than copying the demo island or fabricating a refraction colour to hide holes. This narrowly scoped mesh inclusion change belongs to step 4 and needs level-check/perf inspection.
- **Depth and visibility:** screen refraction cannot see off-screen/transparent content; flat far skirts, dry cave volumes and shallow triangles need explicit masks. Cave pond water must not take ocean waves through an underground roof. No hard-coded world-y thresholds for wet optics.
- **Synchronization:** no edits to `src/net/`, `src/netplay/`, `src/world/`, `src/sim/` or `server/`, no wire-shape change or WORLD_NS bump. Existing state/rng constants may be read; GPU/trigonometric values never enter apply/ticks/saves. Query freshness and ball ownership changes must be handled locally. Physics outcomes still use existing Owner presence. Do not “fix” visual phase disagreement by adding persistent water state.
- **Lifecycle and startup:** no imports forming a sky↔water or terrain↔water cycle, no extra `scene.add`/`onFrame` suppressions, no GPU work before initialization, no stale async callback into disposed state, no duplicate opaque snapshots or tone maps. `src/main.ts` is a hotspot and should need no change; any necessary loader tweak is at most a line or two. Boogler copy stays untouched.
- **Verification limits:** there is no new-water-on-real-terrain build yet. Earlier demo images, the one gorge baseline and the reported short stationary iPad result cannot approve motion, query latency, cave behavior, sustained performance or the final art integration. Follow the three-round inspect/fix limit and identify remaining uncertainty; do not present a successful capture as a visual verdict or a push as a deployment.

### Neutral output evidence (4 November 2026)

Production `water=new` and Looks' Current now use Neutral. The existing meter remains: identical gain isolates
the tone-curve change, preserves surface/underwater adaptation, and keeps the existing comparison exposure lock
meaningful. No exposure correction or water/sky retune was needed. Sunny toys and AgX Punchy remain AgX comparisons;
the retained demo and explicit toy-sky experiment keep their choices. The legacy route never installs this post graph.

Opened all six before/after stills: shore
([before](../../.look/evidence/1793817735400-60734/evidence.json),
[Neutral](../../.look/evidence/1793817888222-62253/evidence.json)), player on the bank
([before](../../.look/evidence/1793817736741-60746/evidence.json),
[Neutral](../../.look/evidence/1793817889421-62384/evidence.json)), and underwater
([before](../../.look/evidence/1793817737823-60750/evidence.json),
[Neutral](../../.look/evidence/1793817890581-62531/evidence.json)). Neutral gives stronger greens/sand and a deeper
water colour while retaining readable avatar shading and the moving caustic net. Dry cliff faceting, strong caustic
contrast and broader colour preference remain for the owner; no terrain adoption is implied. All captures were
healthy WebGPU. `npm run check` passed. Early captures without explicit `proto=place` hit the look harness's classic
fallback and were rejected as Place evidence. The frozen sky makes dawn/noon/night comparisons inapplicable here.


Opened side-by-side boards (AgX left, Neutral right):
[shore](../../.look/evidence/1793817888222-62253/bank-agx-neutral.png),
[player bank](../../.look/evidence/1793817889421-62384/player-agx-neutral.png),
[underwater](../../.look/evidence/1793817890581-62531/underwater-agx-neutral.png).
The existing enabled Looks preset `tune=1&lookPreset=sunny` still reports AgX; opened its
[still](../../.look/evidence/1793818905927-86180/sunny-preset-still.png)
([manifest](../../.look/evidence/1793818905927-86180/evidence.json)). A first preset probe omitted `tune=1`
and correctly stayed Neutral; it is not used as AgX evidence.

### Step 4 receiver follow-up (4 November 2026; historical partial)

At this checkpoint step 4 remained **unchecked**; the spray follow-up below closes its remaining gap. Existing receiver patches show moving caustics and a thin wet/swash edge on real
ground, and the observed dry bridge/cave roof remain unlit by caustics. However, neither the lee-rock nor the
exposed-rock recordings gives convincing visual proof of airborne crest spray. The remaining step-4 work is to
qualify or repair that visibility on real contacts, then inspect consecutive frames again. Counts alone do not
close it. No water retune, terrain adoption, gameplay/copy edit, default switch, or step 7/8 work was made.

The code change removes a second, accidental 256-site limit on registered contacts. The contact registry already
caps at 512; all eight sites per registered contact now survive, while provider-obstacle and actual particle caps
remain. Emission stays before shared particle upload, at late order -21 versus -20, bounded at 96/frame and
420/rolling second. The [constructed-trestle capture](../../.look/evidence/1793818277715-72764/evidence.json)
registered 123 contacts / **984 sites**, versus 32 sites for four home rocks. Opened its still: dry support tops
remain plain and water surrounds the legs. Spray entity CPU mean/p95/max was **0.238/0.3/0.4 ms** in that capture;
this is not a maximum-512-contact stress or GPU benchmark.

Opened the [bank still, curves and four consecutive recorded frames](../../.look/evidence/1793818021893-65039/evidence.json),
[rock still/motion and four consecutive frames](../../.look/evidence/1793818023080-65115/evidence.json), and
[beach still and four consecutive frames](../../.look/evidence/1793818024254-65121/evidence.json).
The net advances across submerged ground, rock tops remain gray, and the beach has a narrow darker wet edge.
There is no saturated blue slit at the matched bank angle; coarse bank faceting and all-angle integrity are not
resolved by this view. Opened [dry bridge](../../.look/evidence/1793818058965-67203/evidence.json) and
[dry cave hub](../../.look/evidence/1793818060156-67207/evidence.json) stills: no caustic projection on deck/roof.
The existing albedo patch also modulates ambient light; this is not a claim of strictly sun-only illumination.
The frozen late-morning sky (`tod=.24`, one bake) supersedes dawn/noon/night comparisons on this route.

For spray, opened the lee-rock detail cycle and four native consecutive frames
([manifest](../../.look/evidence/1793818122638-68464/evidence.json)), then the exposed rock's still, full cycle sheet,
and four consecutive frames ([manifest](../../.look/evidence/1793818472230-77088/evidence.json)). Shared soft-particle
counts rose/fell, but they cannot attribute visible droplets to this rock. Opened four consecutive frames from the
[post-rebase rock recording](../../.look/evidence/1793818556767-81817/evidence.json): moving caustics remain, without
convincing airborne spray. Real-time feel/smoothness remain unverified; no visual tuning followed these rounds.

Performance follows water-demo-validation's follow-up: earliest GPU start to latest GPU end, never sums of
overlapping timers; three ~180-frame windows, Apple Metal-3 / Chrome 156, DPR 1, stored 4x MSAA and 2048-square
shadows. Same place camera `(972,22,55) -> (1000,0,20)`, 1920x1200 output. All cost stills were opened.

| Window set | World size | Mean spans (ms) | p95 spans (ms) |
| --- | --- | --- | --- |
| [AgX baseline](../../.look/evidence/1793817739000-60752/evidence.json) | 1920x1200 | 9.74 / 8.46 / 9.60 | 12.56 / 12.35 / 12.14 |
| [Neutral + contact fix](../../.look/evidence/1793818061310-67216/evidence.json) | 1920x1200 | 8.96 / 9.65 / 9.94 | 11.59 / 12.42 / 12.24 |
| [Mobile](../../.look/evidence/1793818062442-67272/evidence.json) | 1152x720 | 7.64 / 7.59 / 7.50 | 9.08 / 9.26 / 9.30 |
| [High after promise-handling rebase](../../.look/evidence/1793818541760-80913/evidence.json) | 1920x1200 | 7.27 / 7.25 / 7.24 | 8.49 / 8.14 / 8.14 |
| [Mobile after rebase](../../.look/evidence/1793818555678-81666/evidence.json) | 1152x720 | 5.93 / 5.95 / 5.90 | 6.75 / 6.87 / 6.84 |

All sampled windows have zero missing span frames and max animation interval 16.8 ms. Both qualities retain
512-square and 256-square caustic targets, three caustic draws and **9+8=17 actual mip draws**: 26 native raster
passes, 240 direct draws, 17 mip bundle executions and one opaque colour/depth copy pair per frame. The meter
retains two tiny draws and its one-texel history copy. Mobile changes world resolution only (0.6), retaining four
FFT bands and caustic detail. The smallest observed Neutral high p95 budget margin is 4.28 ms against 16.7 ms.

The apparent first matched mean delta is +0.25 ms, smaller than window variation. Later runs were substantially
lower without a relevant graphics algorithm change, so no speedup/regression is attributed to the patch. Historical
demo follow-up means (high 7.78-8.56 ms, mobile 4.60-6.94 ms) used a different, much lighter scene; they are context,
not a subtractable receiver baseline. Existing receivers were already active before this task. No exclusive GPU
reservation/clock telemetry, sustained ten-minute run, native mobile/iPad result or real-time feel is claimed.
Capture-only timestamp descriptor repair and native pass/mip counters are preserved as `cost-probe.ts` and raw
`cost.json` beside each cost manifest; they add no GPU pass or wait and restore wrappers afterward.

The tested upstream base is `3791b4f6`; the earlier promise-handling rebase is `6159ae0d`. The later co-op/entry commits
change neither render/receiver nor terrain source (verified by a path diff), so the refreshed graphics evidence
above describes the final graphics code. Repeated `npm run check` passed all 298 tests, lint/type checks, registry,
levels, assets and build. [Final world-inputs, smoke and caves](../../.look/evidence/1793818888884-85965/evidence.json)
all passed; opened both peer stills and cave hub/pond stills. Those trusted scenarios explicitly use classic legacy
water; new-water cave exclusion is the separate dry-hub capture above. No co-op default-round acceptance is claimed.

Literal default-route evidence: both baseline and final commands used `playthrough --query '' --eval .look/default-play.ts`.
The eval starts the existing trusted Place bot without changing the query and logs the water state.
The [baseline](../../.look/evidence/1793817445362-55870/evidence.json) and
[final repeat](../../.look/evidence/1793819130131-88009/evidence.json) both complete all expected beats.
Final diagnostics: **legacy water, Neutral enum 7, zero registered contacts, zero active spray entities**;
source review confirms this route does not create receiver/caustic work. Full reports were read and end stills opened.
The offline `playthrough --compare` [output](../../.look/evidence/1793819130131-88009/compare.txt)
shows all first-beat shifts at most **10 game seconds**, each named objective duration within **1 second**,
zero errors/pushing/water falls, 77 saves and the same 26-minute round. Optional repeat counts differ (12 versus
14 second jumps and three versus two overheard rumours); no gameplay or copy source changed. Neither solo run marks
found-a-crystal/did-something-together, which are not required beats here.

Keep the failures/outliers: the first broker default eval selected its hat shot and
[stalled](../../.look/evidence/1793817351397-52332/evidence.json); its report and still were inspected, then the
explicit trusted-bot eval above corrected the harness selection. A later
[successful but faster run](../../.look/evidence/1793818874452-85597/evidence.json) finished about 80 seconds early;
Q4 bill gathering took 42.9 rather than 116.8 seconds. It exceeded the noise allowance, so it was rerun unchanged;
the final repeat above returned within noise. The comparison is evidence of no observed pacing change, not a claim
of deterministic bot timings. Broker rejects `--compare`, so the existing browser-free comparison path was invoked
locally after broker runs; no second browser was launched. No push, ship or external network access was performed. Local `origin/main` advanced afterward to `f2dc0afa`
with unrelated building-plan/production-harness changes and no overlap in these six changed files; this handoff
remains pinned to the tested `3791b4f6` base, not a claim about that later tree.

### Step 4 spray visibility follow-up (4 November 2026)

**Step 4 is checked**, combining the receiver/exclusion evidence above with these real-place spray views.
No default switch or step 7/8 work. This supersedes the earlier incomplete qualifications, not their all-angle
limitations. Only `render/water/spray.ts` changed: breakers emit three separated drops on the existing fresh-crest
event, with stronger opacity, 20% larger size and enough launch height/upward speed to clear the visible lip.
Contact launches, crest/energy gates, quiet periods, shared pool and 96/frame + 420/second caps remain unchanged.

Diagnosis: the shared pool works. An exposed constructed trestle already produces visible contact droplets in the
[baseline](../../.look/evidence/1793820394983-9286/evidence.json). Real contacts use eight sites each; the retained
demo uses 128 incoming-face sites and samples upstream of its baked rock. Its setup is not the calm home lee-rock.
At the actual breaking-bank site `(1220.906,43.082)`, uploads previously showed one small drop per 4.38-second crest;
a stronger-opacity first iteration still did not separate clearly from the sea. Raising the short ballistic arc
made separation visible. The crest timer was firing; counts could not prove visibility, particularly because
nominal particle lifetimes outlast GPU floor kills. A remote debug camera also fades emissions when the player is
far away; the final bank view puts the player nearby, away from the inspected site.

Visual question: **do detached droplets rise at a real contact and breaking shore, then stop between crests?**
Opened final stills, motion sheets and every `crest-01..04.png` consecutive native 30-fps frame:

- [Breaking bank](../../.look/evidence/1793820892900-18930/evidence.json): zero-based recorded frames **14–17**,
  **0.467–0.567 s**, show small gray-blue dots above the foam lip near pixels `(570–600,315–335)`, at the site above.
  `quiet.png` at 2 s has no detached dots there. Upload probe records three bursts of three drops in 12 seconds.
- [Constructed trestle](../../.look/evidence/1793820894023-19077/evidence.json): frames **66–69**, **2.200–2.300 s**,
  show separated rising drops left of the near-shore support row, foremost contact `(1201.68,-42.82)`.
  `quiet.png` at 4.1 s shows its foot clear; the motion sheet repeats bursts near 2.18, 6.55 and 10.91 s.
  This uses the existing `place-job.ts` trestle staging, real supports and the production contact registry.
- [Retained demo rock](../../.look/evidence/1793820114283-1646/evidence.json): opened its proper surf-rock camera
  still, cycle sheet and frames **60–63** (2.0–2.1 s). Strong foam/crests cross the rock, but detached dots are not
  convincing in those frames. The comparison does not establish identical spray art; demo/wave/colour/terrain
  settings were not retuned. Production droplets remain modest, not a constant fountain.

Three visual rounds used: baseline, opacity/cluster change, then crest clearance. Launch height approximates the
combined crest; universal FFT-phase clearance and real-time feel/smoothness remain unverified.

Cost: earliest GPU start to latest end (not timer sums), three ~180-frame windows, Apple M1 Max 32-core / Metal 3,
Chrome 156, DPR 1, stored 4x MSAA, 2048-square shadows. Same camera `(972,22,55) -> (1000,0,20)`, 1920x1200 output;
all four cost stills opened. Mobile changes world resolution only, not the physical device.

| Window set | World size | Mean spans (ms) | p95 spans (ms) |
| --- | --- | --- | --- |
| [High baseline](../../.look/evidence/1793820122482-1655/evidence.json) | 1920x1200 | 9.46 / 9.22 / 9.17 | 10.75 / 10.86 / 10.78 |
| [High final](../../.look/evidence/1793820905376-19377/evidence.json) | 1920x1200 | 10.65 / 10.80 / 10.60 | 11.02 / 11.24 / 11.10 |
| [Mobile baseline](../../.look/evidence/1793820123694-1686/evidence.json) | 1152x720 | 5.33 / 5.52 / 5.52 | 6.20 / 6.68 / 6.71 |
| [Mobile final](../../.look/evidence/1793820906538-19386/evidence.json) | 1152x720 | 7.77 / 7.68 / 7.80 | 8.33 / 8.34 / 8.42 |

Final counters: 26 native raster passes, 248 direct draws, 17 mip bundle executions / actual mip draws,
one opaque colour/depth copy pair; zero missing span frames, max sampled animation interval 16.8 ms, none >33 ms.
Worst high p95 leaves 5.46 ms against 16.7 ms. Mean deltas are about +1.40 ms high / +2.29 ms mobile, but without
exclusive GPU reservation or clock telemetry these are observed whole-scene changes, not isolated spray cost.
Raw `cost.json` and the restoring capture-only timestamp/counter probe accompany each cost manifest.
No sustained ten-minute or physical-mobile performance claim.

Literal default safeguard, run before and after:
`node .look/see-client.ts playthrough --query '' --eval .look/default-play.ts`.
[Baseline](../../.look/evidence/1793819962693-830/evidence.json) and
[final](../../.look/evidence/1793820908862-19402/evidence.json) both pass every expected beat, with legacy water,
tone 7, zero contacts/spray, 77 saves, no errors/pushing/water falls. Both reports read and end stills opened.
The [offline comparison](../../.look/evidence/1793820908862-19402/compare.txt) has identical rounded objective
durations, 8m17s idle, 23:00 end beat and first-beat shifts at most three game seconds. Optional rumour count differs
(3 vs 2); neither solo run marks crystal/co-op beats, which are not required. Gameplay/copy/default code is unchanged.

`npm run check` passes (298 tests), and trusted [world-inputs](../../.look/evidence/1793820907698-19394/evidence.json)
passes without graphics errors. Final captures share source tree fingerprint `84930768d31cf6781e7751d54e36c5ee61f5aaeb`
on base `0ccf98b1`, unchanged during each run; subsequent edits only document this evidence.
Setup failures were corrected, not counted as visual passes: unsupported broker flags, a duplicate-export eval,
a demo camera aimed elsewhere, and a restored checkpoint with no built contacts. The existing trestle staging
replaced that checkpoint. No bot failure, external network use, push or ship in this task; `inflight` stopped locally
on FETCH_HEAD permissions. Local evidence replaces an uploaded PR still because networking/shipping is forbidden.

### Step 4 evidence (3 November 2026)

Real submerged home/place triangles now remain in the opaque depth/colour snapshot. Refraction retreats from foreground samples, re-reads depth at its final UV, fades distortion in thin water and preserves opaque bank coverage at the resolved water edge. Real terrain materials receive reversible caustic/wetness patches; real rocks and only constructed place legs register bounded contact sites. Coast spray shares the particle pool and cleans up its preparation callback. Caustics retain two targets, three draws and 17 mip passes. Receiver modulation preserves masks and standard lighting/shadows, but modulates ambient albedo too: it is not strictly sun-only illumination.

Three look/fix rounds were used. Opened the baseline home, repaired home, old-water diagnostic, step4 home and place stills, and all four consecutive home video frames. The broad diagonal home wedge also exists with old water: it is faceted terrain shading. The caustic net moves across submerged sand; wet banks darken while dry sand and the avatar remain readable. Final [bank manifest](../../.look/evidence/1793733062979-27833/evidence.json) shows the earlier saturated blue right-bank slit removed. The overhead [cost manifest](../../.look/evidence/1793733100803-28698/evidence.json) still leaves a narrow ragged orange/dark bank strip whose relation to refracted terrain faceting is uncertain; no claim of tear-free results at every angle. Earlier [home and consecutive frames](../../.look/evidence/1793732857441-23415/evidence.json) and [place](../../.look/evidence/1793732875480-23577/evidence.json) show caustics and the avatar.

Final overhead GPU **span** means were 6.23/6.49/6.77 ms, with the last p95 7.31 ms, at 1210×702, world/output DPR 1, stored 4× MSAA. There were 24 native raster passes, 237 direct draws plus 17 bundle executions, one colour and one depth copy. This camera differs from the live before capture, so no matched delta is claimed. No gfx errors or >33 ms sampled frame gaps. `npm run check` passed. Physical-device performance, real-time motion feel, dense fully built support cost and all-angle bank integrity remain unverified. Dawn/night receiver comparisons are superseded by the owner's fixed late-morning production direction; final cave/bridge exclusions are checked with steps 5–6.

### Step 4 final qualification: visual acceptance remains incomplete

Implementation landed in `89d6b4c2`, but **leave step 4 unchecked**. After its three look/fix rounds, the final frozen-sky place view still shows a narrow blue slit on the right bank (roughly pixels 680–810, 390–515 at 1210×702): [still](../../.look/evidence/1793734525702-87856/step6-place-still.png), [manifest](../../.look/evidence/1793734525702-87856/evidence.json). The [final overhead still](../../.look/evidence/1793734804864-96163/step6-cost-still.png) also shows a dark/blue strip at the left bank. Both were opened. The earlier corrected small slit was a local improvement, not proof that shore/refraction tears were solved. These residual artifacts block visual acceptance and any claim that this is ready to switch by default. No further shore tuning was attempted after the three-round limit.

### Step 5 original implementation and evidence (3 November 2026; manual controls superseded)

Shared `water/underwater.ts` and `snow.ts` now serve production and thin retained-demo adapters. The sea entity owns HDR composition, lens compute, shafts and snow lifetime; no independent loop, scene render or particle pool was added. The 64×36 lens grid evaluates the current GPU wave function at the near plane. Flat pond level/ellipse metadata comes from the renderer-free water field, including a padded CPU selection and per-pixel ellipse mask. Dry caves exclude the sea. The pond transmits locally lit cave colour through absorption without outdoor sky/sun in-scatter, shafts or marine snow; surfacing retains the wet-lens exit.

C, free D-pad right and a swimming-only touch Dive button use the action registry. The existing Owner player body targets −2.5 m/s while diving; release caps passive ascent at +2.5 m/s, and intentional swim-up wins. Blur, hidden documents, pause, leaving water, held/seated/down state and respawn release intent. Up remains free for the runtime update action. The old prototype action and late force cancellation were removed in the same work; no new presence or lockstep state was added.

Three look/fix rounds: initial underwater shader smoke was healthy but the camera overlapped the avatar; the second round exposed a deep-release launch and a cyan faceted terrain highlight. The controller cap removed the launch, and submerged terrain now retains its original roughness while the wet shore stays glossy. The third round's [confirmed dive](../../.look/evidence/1793734129357-69568/evidence.json) reached y=−5.748 m (`full=true`) and returned to y=−0.389 m. Opened its still, curves, **all four** `deep-01..04.png` consecutive frames and **all four** `rise-01..04.png` frames. The body/bed remained readable, the cyan fan was gone, and exit droplets were visible. The curves show the +2.5 m/s ascent cap and no previous large launch. Normal wave-following bob remains. Recorded frames do not establish real-time feel.

Final pond/cave views after the sky integration: [submerged pond](../../.look/evidence/1793734685404-93705/evidence.json), [dry cave](../../.look/evidence/1793734732000-94180/evidence.json), both stills opened. The pond no longer has the outdoor cyan wash; cave/crystal detail returns, without sea particles or shafts. The dry cave has no underwater treatment or reflected outdoor clouds. An outside-ellipse camera at y=2.9 m clipped the rising floor and was rejected as a valid optical acceptance view; the ellipse edge at arbitrary camera angles remains unverified.

The [final input probe](../../.look/evidence/1793734926087-99122/evidence.json) passed keyboard, polled synthetic standard-pad, touch hold/cancel, blur, leaving-water/hidden-button, swim-up (vy=3.65 m/s while dive was held) and respawn assertions. It clicks the real Resume button and asserts that the modal closed and Dive did not restart; root opened its still. The prior probe's synthetic Escape did not perform native dialog cancellation, so [that run](../../.look/evidence/1793734174649-72344/evidence.json) was not accepted as resume proof. Earlier [failed input probe](../../.look/evidence/1793733612336-49824/evidence.json) omitted `.gamepad` from a synthetic connection event; corrected [rerun](../../.look/evidence/1793733755710-56977/evidence.json) passed without page errors. These exercise browser input paths, not physical controllers or touch hardware. An early dive setup requested bed below −9 m although home seabed is −7.5 m, and another pressed C before the wave-dependent swimming state was true; neither is dive proof. The confirmed final action begins submerged and asserts accepted intent.

Step-5-stage dry overhead GPU spans, [isolated manifest](../../.look/evidence/1793733809805-60150/evidence.json): means **6.396 / 6.407 / 6.726 ms**, p95 **8.267 / 8.413 / 8.455 ms**. Same overhead camera as step 4, 1210×702 world/output, DPR 1, stored 4× colour/depth. Native raster passes 24; 237 direct draws plus 17 mip bundle executions; one opaque colour/depth pair. No >33 ms gaps. This measures the dry branch before final sky integration, not submerged cost. Discard the overlapping run `1793733725584-53800`; it was rerun alone. Final underwater cost is recorded with step 6 below.

Replay passed all **1,103** frames within the existing 0.01 tolerance after controls and after the ascent correction; no fixture updates. `npm run check` passed. Remaining: physical input hardware, timing-at-waterline usability, actual chase-camera dive feel, arbitrary pond-edge views and sustained device performance.

### Step 6 implementation and evidence (3 November 2026)

The owner's override replaces the original sky recommendation only under `water=new`: reusable demo atmosphere/sky factories live in production, with thin retained-demo wrappers. `createFrozenWaterSky()` bakes exactly once at tod=0.24; `main.play()` explicitly awaits `waterReady` before starting the eight-second shader deadline. No play update calls the bake. The matching real sun stays fixed, the toon dome/billboards/faceted clouds and legacy clock overrides are bypassed, and the route clip distances/fog ranges remain. The owner decision and current index are updated in `boogle-2.md`.

The production post uses `render/tone.ts`'s AgX and exposure meter after underwater HDR, disabling the pipeline's automatic output transform only for that composition and restoring it on disposal. Diagnostic `tone=` and `sky=demo` cannot override the production path. The old route retains its original renderer/clock/tone behavior. **`src/render/scene.ts` is untouched.** Crossing skips the four outer rectangles with the new range-fitted polar sea, and actual viaduct pillars register conservative contacts. Mobile stays 0.6 world resolution and desktop high, normalized once against adaptive DPR.

[Literal default-page proof](../../.look/evidence/1793734945762-994/evidence.json), invoked with `--query ''`, passed: effective route place, legacy water, Neutral tone enum 7, automatic output transform true, no environment cube or Dive action, and advancing `DAY.u`. Root opened its still and saw the original flat blue water/sky. This specifically checks the actual default page, not the harness's implicit classic route.

Three sky-integration look/fix rounds: the first revealed outdoor cloud reflections in the cave pond; the second removed outdoor environment contribution with the existing underground transition but exposed sky-lit underwater in-scatter amplified by the cave exposure; the third gives ponds absorption of their local scene only. No further visual changes follow this round. Residual shore slits remain as qualified above.

Opened [home still](../../.look/evidence/1793734039742-66962/step6-home-still.png) and [place still](../../.look/evidence/1793734525702-87856/step6-place-still.png), plus `/Users/matiasfranco/Developer/boogle-codex/demo-shots/board.png`. The frozen cloud sky, transparent green/turquoise water, net caustics, wet band and avatar/ball are visible on the real home shore. Place's avatar and support remain readable above its actual submerged bed. Compared with the board, real terrain is visibly more faceted and its green/brown palette less uniformly turquoise; this is not a claim of identical art quality. The final place bank slit is a confirmed remaining defect.

[Mobile/layout and one-bake proof](../../.look/evidence/1793734761049-94442/evidence.json): opened its still, showing the Dive button beside Grab and above Jump, with its guide row. `q=mobile` plus a diagnostic touch layout is explicitly emulated, not physical coarse-pointer hardware. Logs show 0.6 world scale at unchanged 1210×702 output/DPR 1, tod=0.24, AgX, no visible legacy discs, matching real-sun direction and **bakes=1** before and after a legacy midnight preview, a real canvas ResizeObserver change to 640×420 and back, and simulated focus/visibility events. Physical background/resume and actual viewport/device resizing remain unverified.

GPU measurement: `system_profiler` identifies the host as a **32-core Apple M1 Max**. All costs below use earliest observed GPU start to latest observed GPU end per frame, never sums of overlapping timers. Three ~180-frame windows each, 1210×702 scene/output, DPR 1, stored 4× MSAA, fixed 2048² shadow map; no sampled >33 ms gaps or gfx errors. Scene composition differs between place and home, so submerged cost is not a direct subtraction from the place view.

| Final view | Mean GPU spans (ms) | p95 spans (ms) | Native raster / direct draws / mip bundle executions |
| --- | --- | --- | --- |
| [Place overhead](../../.look/evidence/1793734804864-96163/evidence.json), camera (972,22,55) → (1000,0,20) | 7.079 / 7.016 / 6.724 | 8.321 / 8.386 / 7.885 | 26 / 240 / 17 |
| [Home submerged](../../.look/evidence/1793734856641-96652/evidence.json), camera (58,−4.8,−9) → (55,−4.5,−12) | 6.383 / 6.438 / 6.767 | 7.319 / 7.114 / 7.353 | 27 / 136 / 17 |

Both cost stills were opened. The underwater view shows the bed/caustics and surface underside without the cyan terrain fan. Both retain one opaque colour/depth snapshot pair; the exposure meter also maintains its one-texel history copy. Underwater adds its 605×351 shaft target and lens compute; shader dispatch counts are 12 dry / 13 submerged in these samples. These are steady-state spans, not a startup sky-bake GPU benchmark, full-round contact stress measurement, native Retina/DPR-2 result or M4 iPad acceptance.

Final implementation checks: changed TS/docs formatted; `npm run lint -- --prune-suppressions` made no suppression growth; `git diff --check` clean; latest full `npm run check` log `.look/final-optics-check.log` passed 292 tests, registry, levels, assets and build (5.22 s). The final broker checks and local commits are recorded below. No push, ship, external network use, step-7 switch/removal or step-8 graduation was performed. The initial restricted `inflight` attempt rejected HTTPS transport; live remote inflight state remains unverified.


### Final step 4–6 review checks (3 November 2026)

Steps 5 and 6 are implemented behind `water=new`; their ticks record that implementation and the verification below, not physical-device or all-view acceptance. Step 4 remains partial because the shore/refraction slit is still visible. Steps 7–8 have not started. The one-bake owner call replaces step 4's dawn/night comparison and step 6's sunset/moonlight cycle checks on this path: only late morning is active. No additional sky times were implemented.

- [Full place bot](../../.look/evidence/1793735253455-12880/evidence.json): passed, 33 minutes of game in 4 min 7 s; all expected beats arrived, zero errors, 78 saved checkpoints. Read the full [report](../../.look/evidence/1793735253455-12880/run/report.txt) and opened `run/end-still.png`. The end still has the bot/log and verdict overlays, so it is completion evidence rather than a clean water acceptance image. It marked no “did something together” event in this solo run; 4 min 57 s idle and 2 s pushing were recorded, with no water falls. This does not establish co-op progression or player dive feel.
- [Checkpoint inventory](../../.look/evidence/1793735539407-16973/evidence.json) lists all 78 saved beats. Opened the [Far Head still restored from `run ended`](../../.look/evidence/1793735569640-17642/final-far-head-still.png), [manifest](../../.look/evidence/1793735569640-17642/evidence.json): the avatar, track and actual trestle supports are readable, with continuous open sea to the horizon. This does not prove the invisible shoreline from this elevated angle.
- [20 m/s viaduct](../../.look/evidence/1793735028278-6667/evidence.json) and [50 m/s express](../../.look/evidence/1793735072784-7385/evidence.json): opened both stills and three consecutive `train-01..03.png` video frames from each; also opened the express curves. The horizon has no old rectangle seam or visible clip edge, and the dry deck has no caustics. The actual ride probe reported 240/240 frames on deck at 20.002 and 49.997 m/s, with 32 mm vertical spread and no lateral drift. The later express curves reach the slowing end approach; these captures do not prove real-time smoothness or the longer `vast` route.
- [Retained Lagoon demo](../../.look/evidence/1793734998002-4585/evidence.json): opened `final-demo-lagoon-still.png` at the demo's actual Lagoon camera, showing its transparent turquoise shallows, net caustics, foam line and cloud sky. The earlier generic-camera demo run `1793734961318-2960` was healthy but did not frame Lagoon, so it was not used as visual proof.
- [Caves](../../.look/evidence/1793735480679-16019/evidence.json): all checks passed on `classic=1&water=new`; opened both hub and pond stills. The player crossed 11/11 route points with no stuck points, maximum floor intrusion 0.01 m, hard throws stayed in the cave or exited a mouth, and the ball floated at y=3.36 for pond level 3. The stills show readable dry chambers and a pond without outdoor-cloud reflection.
- [Two-player smoke](../../.look/evidence/1793735523673-16574/evidence.json): all checks passed on the new path, including mutual visibility, item delivery, thrown-ball ownership and matching state hashes. Opened Alice and Bob stills. No world or graphics errors. This is the existing render-pipeline GPU trigger, run through the supplied broker against this worktree's local server.
- [World inputs](../../.look/evidence/1793735538226-16906/evidence.json): passed grid, state/op ordering and tree/perch layout against the trusted harness fixtures; no fixture updates or graphics errors. The scenario runs the trusted harness's fixture files against this worktree's running game, as the manifest records.

Every final run records `changedDuringRun=false`, the final game source fingerprint `0f2931f94f2c4e2cb85843a33c0eed0d8a151491` with base commit `89d6b4c2`, and the trusted harness fingerprint. Only report/as-built wording and local commit organization followed these runs; game source did not change. `src/render/scene.ts`, network/world/server code, prototype cards and the step-7 default switch/removal are unchanged. Place edits are small guards and receiver/contact attachments, preserving the active round's flow.

Remaining acceptance limits: the confirmed shore/refraction slit; real-time feel and physical pad/touch/coarse-pointer devices; full viewport/background/resume behavior; M4 iPad, Retina/DPR-2 and sustained GPU performance; an isolated matched pre/post sky GPU delta; arbitrary pond-edge views; specifically framed near-face/held-object and high-fall/glide water views. The bot exercised gliding and rooms, but its marks alone do not verify their visual quality. The late-morning bake's CPU/submission duration is not a GPU-span startup benchmark. No further gameplay or visual tuning was started after this review boundary.

## Historical open questions (resolved scope superseded by the approval above)

1. **Approve this graduation scope and sequence?** In particular, real-world surface/FFT, caustics, foam/spray, Owner wave-following and dive/underwater graduate together before the default switch; the demo scene is tagged and removed at completion. This approval is the build gate.
2. **Water look and motion on the actual banks:** retain the demo `.25` energy baseline and let real bathymetry shelter it, then judge any further reduction in offshore swell, swash or grade from the character/shore views. No storm, drowning or breath mechanic is implied.
3. **Reflection/sky scope:** recommendation is to keep the already-chosen game sky/clouds and use their live radiance, omitting the demo atmosphere/cube system. Confirm that water graduation may differ from the demo's reflected environment; requesting that atmosphere would require a separate scope/performance plan.
4. **Performance/quality tradeoff:** mobile starts at 0.6 world resolution and desktop high, preserving the owner-selected split. Decide the desired headroom for future graphics and whether softer whole-world mobile rendering is acceptable after the real round/device captures; five seconds at 60 fps does not settle this.
5. **Neutral versus AgX:** the separate side-by-side with characters owns this decision. This plan leaves Neutral and `scene.ts` unchanged. Any renderer/depth/global output change needs explicit approval of its concrete diff; approving water alone does not choose AgX.

Coordination prerequisite, not an art decision: identify who owns the current Round 4 integration hunks and refresh `inflight` before building. Stop after committing this plan; no push or ship in this task.


### Shore-slice follow-up (3 November 2026)

[Shore-water validation](../research/shore-water-validation.md) narrows the residual bank slit above:
a front-face-only diagnostic removes it without changing the coarse terrain. Folded, horizontally displaced
water triangles selected the dark underside optics from above. Commit `f8faab2f` restricts those optics to
backfaces viewed upward; the matched Place bank and a genuine underwater view were inspected successfully.
Finer terrain alone was not the repair. This supersedes the slit observation at that tested angle, not every
view or the outstanding owner/device acceptance gates. Keep step 4 partial. The follow-up includes all six
shore/rock combinations, demo comparison boards, exact sand collision, bed-bake limits and GPU spans.
