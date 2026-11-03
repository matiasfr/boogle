# Water demo scene: visual validation

2026-11-03. Local branch `codex/water-demo-scene`; no push or deployment. Serves DESIGN.md **Toys before chores**
and **Show, don't tell**. The owner's supplied desktop screenshots are the target, ahead of source inference.
See [the numerical diagnosis](water-demo-diagnosis.md) for the spectrum audit and complete before/after shore tables,
and [the game-design entry](../game-design/water-proto.md) for current behaviour and limitations.

## Result

Four visual rounds, within the six-round limit. The final comparisons read as the same scene: source terrain and
rock placement, low shore crests, clear refracted sand, bright wave-driven caustics and the source sky/exposure.
The first round exposed an invalid fragment-storage exposure history; it was replaced with a one-texel GPU copy.
The .02 energy trial in round two was too smooth and lost the caustic net. Round three selected .25 energy
(half amplitude). Round four corrected double-applied rock vertex AO and removed the game's light grade from
this page. No additional rendering changes followed the final captures.

This is an image comparison judgement, not an owner playtest verdict. Open ocean is deliberately calmer than the
reference. The missing planar rock reflection is the clearest remaining feature gap in Surf rock.

## Exact views and local URLs

All captures use **1210×702**, **50° vertical FOV**, near **.5 m**, far **80000 m**, sun azimuth **205°**.
Positions are source `main.js` views translated by island offset `(2400,0,0)`. These recorded localhost ports
belonged to temporary capture servers; on a newly started server use the same query at its current port.
The default `/?room=proto-water&proto=water` starts at Lagoon; append `&v=pop` for the previous grade.

| Shot | Camera x,y,z | Look-at x,y,z | Sun elevation | Recorded capture URL |
| --- | --- | --- | ---: | --- |
| Lagoon | 2081.037438,16,88.248989 | 2059.019789,0,133.373518 | 50° | `http://127.0.0.1:53430/?proto=water&shot=lagoon` |
| Breakers | 2752.205328,10,-73.078089 | 2727.038942,0,-45.227541 | 38° | `http://127.0.0.1:53449/?proto=water&shot=breakers` |
| Surf rock | 2718.653987,14,-62.607002 | 2740.005891,0,-91.104304 | 40° | `http://127.0.0.1:53282/?proto=water&shot=surf-rock` |
| Open ocean | 2495.437023,9,-1496.960846 | 2552.699237,0,-1795.137354 | 14° | `http://127.0.0.1:53462/?proto=water&shot=open-ocean` |

## Inspected artifacts and visible differences

Every comparison board was made with `ffmpeg hstack`: **reference left, Boogle right**, each half 1210×702.
Reference directory: `/Users/matiasfranco/Developer/boogle-codex/demo-shots/`.
Artifact directory: `/Users/matiasfranco/Developer/boogle/.claude/worktrees/boogle-codex/water-demo-scene/.look/`.
These PNGs and recordings are local ignored artifacts, not committed or uploaded.

| Shot | Final still | Opened comparison board | Remaining visible difference |
| --- | --- | --- | --- |
| Lagoon | [still](../../.look/water-r4-lagoon-still.png) | [board](../../.look/water-r4-lagoon-board.png) | Weaker caustic contrast at the nearest sand and a smoother distant wave field; the source-shaped spectrum has half amplitude. |
| Breakers | [still](../../.look/water-r4-breakers-still.png) | [board](../../.look/water-r4-breakers-board.png) | Different crest positions and slightly sparser near waves. Different phase RNG and capture time prevent identical crests. Terrain shading retains the filtered periodic noise bake. |
| Surf rock | [still](../../.look/water-r4-surf-rock-still.png) | [board](../../.look/water-r4-surf-rock-board.png) | The rock's reflected silhouette and shadow on the water are absent; occasional glints are stronger. Rock geometry/placement and bright submerged caustics match closely. |
| Open ocean | [still](../../.look/water-r4-open-ocean-still.png) | [board](../../.look/water-r4-open-ocean-board.png) | Lower swell ridges and a wider sun lane over smaller waves. Sky/cloud/horizon colour is close; the faint source bloom is omitted. |

The [pop still](../../.look/water-r4-pop-still.png) was also opened: the same Lagoon scene has a visibly stronger
colour grade. No separate raw variant remains.

Consecutive real-time recording frames were extracted with `select=between(n\,30\,33),tile=4x1` and opened:
[Lagoon](../../.look/water-r4-lagoon-consecutive.png),
[Breakers](../../.look/water-r4-breakers-consecutive.png),
[Surf rock](../../.look/water-r4-surf-rock-consecutive.png).
The low crests advance over the sand and the caustic net changes underneath; adjacent frames show no terrain
dragging or contact jump. The matching `water-r4-<shot>-realtime.webm` recordings and `-motion.png` sheets are
in `.look/`. This is frame inspection, not watching real-time playback: smoothness, frame pacing and feel remain
unverified. Underwater, golden hour, aerial and iPad performance were not revalidated in this pass.

Reproduce a capture through the existing broker (do not start another):

```sh
BOOGLE_QUERY='proto=water&shot=lagoon' node dev/codex/see.ts --cam 2081.037438,16,88.248989 --look 2059.019789,0,133.373518 --size 1210x702 --fov 50 --name water-lagoon --video --seconds 3 --question 'Does this look like the demo, here?'
ffmpeg -hide_banner -loglevel error -y -i /Users/matiasfranco/Developer/boogle-codex/demo-shots/lagoon.png -i .look/water-lagoon-still.png -filter_complex hstack=inputs=2 .look/water-lagoon-board.png
```

## Passes, draws and MSAA

Steady new work is **four explicit raster passes / five draws**: caustics use two targets and three grid draws;
exposure uses two tiny targets and two draws. The caustic mip chains add **17 internal passes/draws**, making
the added total **21 passes / 22 draws**. FFT remains ten compute dispatches; AgX shares the existing output draw.
Opaque refraction uses colour/depth copies with scene-pass interruption/resumption, not another scene draw.
On a sun change only, the sky adds six 1024² cube draws, cube mips and native PMREM generation; CPU LUT baking
took about one second on this Mac. There is no per-frame sky rebake or added bloom chain.

The Surf rock action `dev/look/evals/water-counts.ts` measured **7 renderer contexts, 19 renderer draws,
833333 triangles, 2 compute contexts** after warmup. The renderer counter omits the 17 internal caustic mip
draws, so that frame accounts for at least 36 raster draws including them. This is a final-frame count, not a
measured net delta from the old scene (its trees were removed). Native environment regeneration is not included
in the steady count. GPU milliseconds were not measured on the shared GPU.

The same action confirmed render target **1210×702**, **samples=4**, actual GPU **depthSamples=4**,
`storeMultisampledColorBuffer=true`, and `storeMultisampledDepthBuffer=true`. No change to
`src/render/scene.ts` was necessary. The prototype's AgX output overrides only this page; the renderer's shared
Neutral choice stays intact.

## Checks and scope

- All four final shots and pop: WebGPU, advancing completed game frames, **gfx errors: none**, no page/console errors.
  The one-second samples ranged from 59.8 to 60.7 completed frames/s; the harness explicitly says these are not a GPU benchmark.
- Targeted `npx prettier --write` and `git diff --check` passed.
- `npm run check` passed: lint, typecheck, **292 tests passed / 0 failed**, registry, level-check, asset check and
  production build. The final production build printed `built in 15.80s`. Vite needed permission to write its
  temporary bundled config through the existing shared `node_modules` link; the rerun with that access passed.
- `npm run atlas -- --check` printed **0 problems**. The built third-party notice matches the source file byte for byte.
- No package installation, external network, push or ship. No edits to the reference checkouts, `src/proto/place/`,
  `src/render/scene.ts`, shared renderer settings outside the prototype, network or lockstep state.

The scene is ready for the owner's next playtest. Further visual development stops here pending those notes.

## GPU cost follow-up — 3 November 2026

Branch `codex/water-cost`, starting at `29ec9ec9`. This owner-requested follow-up serves DESIGN.md
**Small and readable**: remove redundant rendering work and expose two local presentation profiles.
The high look is retained. **The 8 ms high target at 1920×1200 was not reliably met.** Mobile provides the
larger reduction, with visible softness confined to that profile. Nothing was pushed or deployed.

### Measurement and its limits

All numbers below are **M1 Max measurements**, Lagoon camera above, using the existing browser broker,
`prof=1`, fixed DPR 1, real time and three 3-second `hardwareTiming(3)` windows (about 180 completed frames
each). Component comparisons use baseline / changed / baseline in one tab with 1.5 seconds to settle.
The frame cap stayed in place. No exclusive GPU reservation or GPU clock telemetry was available.
The same mobile build ranged from 4.60 to 6.94 ms between runs: clock/shared-machine variation is material.
Reported ± values are half the difference between the surrounding baseline means, **not confidence intervals**.

There is a measurement trap in the installed three.js r187 backend: the profiler sums overlapping render and
compute intervals. Nested passes also share a mutable `timestampWrites` descriptor; after a shadow pass,
resuming the main pass for a viewport copy can write into the shadow's timestamp slot. The ignored capture
helper [water-ranges.ts](../../.look/water-ranges.ts) records the actual query ranges and, with
`timestampFix=1`, restores only the resumed pass's own end slot. This is capture instrumentation, **not a
production backend patch**. It adds no queries, GPU passes, fences or second frame loop.

The metric used here is the elapsed **GPU span from the earliest observed render/compute start to the latest
end in that completed frame**, including intervening gaps. It avoids adding overlapping intervals, but is not
presentation latency or a calibrated external GPU trace. For example, final high's summed timers report
24.58–27.46 ms while its GPU spans are 7.78–8.56 ms and presentation remains near 60 Hz. Do not describe the
owner's earlier rough 17.0 ms as having fallen to 8 ms: these are different measurements. The paired copy
comparison below is the attributable saving; the target needs confirmation with a trusted device trace.

Reproduce through the existing broker (the helper is a local capture artifact, not a new scenario):

```sh
node .look/see-client.ts look --query 'proto=water&q=high&prof=1&timestampFix=1&cost=copy' --size 1920x1200 --cam 2081.037438,16,88.248989 --look 2059.019789,0,133.373518 --fov 50 --real --warm 1 --eval .look/water-ranges.ts --frames 2 --seconds 1 --name water-copy-cost --question 'What does repeating the opaque colour copy cost?'
```

Other one-at-a-time capture switches are `cost=resolution|detail|shadow|ocean|terrain|sky|caustics|adaptive`.
Shadow, ocean, flat terrain, sky and caustic disabling are diagnostics, not shipped quality settings. The permanent diagnostic
URL options are documented in [water-proto.md](../game-design/water-proto.md#options).

### Kept changes and measured savings

Savings are milliseconds of GPU span at a 1920×1200 canvas. They are not additive across runs.

| Change | Saving and noise | Rendering work / visual verdict |
| --- | --- | --- |
| Reuse one opaque colour snapshot for all water samples | **0.41 ms**, baseline drift ±0.18; optimized 7.35 / repeated copies 7.94 / optimized 7.71; per-window p95 9.39–9.99 | `viewportTexture()` keys updates by the shared texture; the old shared-node clones copied colour three times. One colour plus one depth copy remain. **28 → 26 native raster passes**, draws unchanged. All four high boards retained the look. [Paired evidence](../../.look/evidence/1793694627416-3909/evidence.json). |
| Mobile world resolution 0.6, normalized against adaptive DPR | **1.81 ms**, baseline drift ±0.27; high 7.78 / scale 0.6 6.25 / high 8.33 | 1920×1200 world → 1152×720, full adaptive-size output. Pass/draw counts unchanged. The main mobile saving; visibly softer fine detail. [Paired evidence](../../.look/evidence/1793695676273-15358/evidence.json). |
| Mobile omits the finest sand ripple octave and rock bump octave | Apparent **0.06 ms**, drift ±0.06: **no resolved saving at Lagoon** | Same passes/draws. Kept as the requested cheaper terrain profile; macro shading and the first ripple octave remain. High keeps both octaves. [Paired evidence](../../.look/evidence/1793695705073-15626/evidence.json). |
| Mobile halves caustic targets and splat-grid dimensions | **No attributable ms result**: full-size targets 4.89–5.03 vs reduced targets 4.60–6.94 across runs; between-run drift exceeds the apparent ~0.20 ms difference in the quieter samples | Targets 512²/256² → 256²/128²; grids 128/64/32 → 64/32/16. Mips **17 → 15 passes/draws**, quarter as many splat cells. Bright caustic net retained with softer fine structure. [Full-target evidence](../../.look/evidence/1793695732374-15804/evidence.json), [reduced targets](../../.look/evidence/1793695165024-10406/evidence.json). |
| No bloom in mobile | **0 ms newly saved** | Bloom was already absent in high and remains absent in both profiles. Do not credit the source demo's omitted twelve bloom passes as a new saving. |

Both profiles retain stored **4× MSAA colour and depth**, all four 256² FFT bands, wave energy, the 384-segment
polar grid, per-frame caustic updates and the dynamic 4096² shadow map. The source demo's coarse-pointer selection
and 0.6 mobile resolution are adapted from `_refs/ultra-water/src/main.js`; its 2× mobile MSAA is deliberately
not adopted. Every device defaults to high (changed after the owner's iPad held 60 fps on it); `q=mobile` asks for mobile.

### Final counts and timings

| Work counted | Original | Final high | Final mobile |
| --- | ---: | ---: | ---: |
| Added steady water raster passes / draws (caustics, their mips, exposure) | 21 / 22 | 21 / 22 | 19 / 20 |
| Whole-frame native raster passes, including copy resumptions and mips | 28 | 26 | 24 |
| Whole-frame raster draws, including one draw in each mip bundle | 35–36 | 35–36 | 33–34 |
| Backend render contexts (not native passes) | 7 | 7 | 7 |
| Water FFT dispatches | 10 | 10 | 10 |
| Opaque colour / depth snapshots | 3 / 1 | 1 / 1 | 1 / 1 |

Native counters wrap command encoders during capture. Direct draws are 18–19 plus 17 high / 15 mobile mip-bundle
draws; the extra occasional draw and eleventh compute dispatch belong to existing game work. Sky regeneration on
sun changes is excluded from steady counts. Removing a copy resumes fewer passes; it does not remove a scene draw.

| Setting / canvas | World target | Final GPU-span window means | Window p95 range | Evidence |
| --- | --- | --- | --- | --- |
| High, 1920×1200 | 1920×1200 | **7.78–8.56 ms** (six unchanged-baseline windows, mean 8.31) | **11.22–12.32 ms** | [resolution pair](../../.look/evidence/1793695676273-15358/evidence.json), [shadow pair](../../.look/evidence/1793695755109-17003/evidence.json), [surface pair](../../.look/evidence/1793695782387-17604/evidence.json) |
| Mobile, 1920×1200 | 1152×720 | **4.60–6.94 ms** (seven unchanged-baseline windows across three runs) | **6.06–7.69 ms** | [first](../../.look/evidence/1793695165024-10406/evidence.json), [terrain pair](../../.look/evidence/1793695705073-15626/evidence.json), [DPR pair](../../.look/evidence/1793695853382-18481/evidence.json) |
| High, 1210×702 | 1210×702 | **6.87 / 6.37 / 6.75 ms** | **7.52–7.66 ms** | [three windows](../../.look/evidence/1793695809664-17983/evidence.json) |
| Mobile, 1210×702 | 726×421 | **5.31 / 5.23 / 4.64 ms** | **5.26–5.87 ms** | [three windows](../../.look/evidence/1793695831524-18215/evidence.json) |

The DPR diagnostic changed the renderer from 1 to 0.6 and back: the world stayed **1152×720**, with scene scale
0.6 → 1 → 0.6. It never fell to a compounded 0.36 scale. All windows confirmed samples=4 and both storage flags.
This verifies normalization, not the adaptive controller's long-term response on a tablet. The counterintuitive
cross-run timing overlap between smaller and larger views is another reason not to claim precision below the noise.

### Rejected experiments and remaining options

| Experiment / candidate | Evidence and decision |
| --- | --- |
| Skip zero-mask ripples and swash samples; branch out of foam/above-water caustics; move coarsest variance to a varying | Trial 8.04 / original work 8.11 / trial 8.20 ms: essentially **0.00 ms**, baseline drift ±0.08. Reverted the extra shader branches and complexity. [Evidence](../../.look/evidence/1793694780007-5925/evidence.json). |
| 192-segment polar grid | Means 7.80 / 7.31 / 7.45 ms were not a clean gain over the nearby full-grid run. All four trial boards were opened; Breakers acquired visibly straighter, angular crests. Rejected for high and mobile. The source's aerial tier is an option for a separate high-camera test, not a saving for these 9–16 m cameras. [Evidence](../../.look/evidence/1793694898764-7471/evidence.json), [Breakers board](../../.look/water-grid192-breakers-board.png). |
| Replace terrain shading with a flat material | Diagnostic ceiling: 9.02 / flat 6.64 / 9.50 ms, **2.62 ms ±0.24**. Destroys the beach/rock look, so not a quality setting. Terrain remains worth further targeted investigation. [Evidence](../../.look/evidence/1793694301820-97867/evidence.json). |
| Hide the ocean surface | 8.56 / hidden 4.42 / 8.35 ms: surface plus its snapshots accounts for **4.04 ms ±0.11** in that run. FFT and caustic generation still run; this is not the cost of the entire water system. Diagnostic only. [Evidence](../../.look/evidence/1793695782387-17604/evidence.json). |
| Freeze the shadow map | **0.11 ms ±0.014** baseline drift, with per-frame p95 around 11.5 ms. Removes a pass and 5–6 draws but would need correct invalidation for moving casters. Not worth leaving stale shadows; keep 4096² dynamic. [Evidence](../../.look/evidence/1793695755109-17003/evidence.json). |
| Throttle caustics/mips or exposure | Not kept or assigned a saving. Caustics visibly move through the four views; skipped updates risk stepping. Exposure is already two tiny targets and AgX shares the output draw. Any cadence change needs its own temporal comparison. |
| Sky cube / MSAA | Sky already bakes only when the sun changes; no steady saving to claim. Stored 4× MSAA remains required. No MSAA-removal benchmark was passed off as an acceptable optimization. |

### Opened comparison boards and motion evidence

Visual question: **Do shallows, sand ripples, foam, rock shading and distant glints retain the Ultra Water demo look?**
Each board has the supplied reference on the left and Boogle on the right at 1210×702 per half. All four baseline,
single-copy, rejected-grid and final-high boards were opened; all four final-mobile boards were opened too.
The final production source is the same as the source recorded in these manifests; subsequent edits only document it.

| View | Final high board / manifest | Final mobile board / manifest | Observation |
| --- | --- | --- | --- |
| Lagoon | [board](../../.look/water-high-lagoon-board.png) / [manifest](../../.look/evidence/1793695294744-11567/evidence.json) | [board](../../.look/water-mobile-lagoon-board.png) / [manifest](../../.look/evidence/1793695421056-12320/evidence.json) | High keeps the clear sand and caustic net; mobile softens its finest lines. The weaker nearest-sand contrast against the source predates this cost pass. |
| Breakers | [board](../../.look/water-high-breakers-board.png) / [manifest](../../.look/evidence/1793695319834-11783/evidence.json) | [board](../../.look/water-mobile-breakers-board.png) / [manifest](../../.look/evidence/1793695446019-12793/evidence.json) | Curved foam fronts, beach colour and rock placement remain. Mobile softens terrain and distant detail; unlike the rejected grid, crest geometry is unchanged. |
| Surf rock | [board](../../.look/water-high-surf-rock-board.png) / [manifest](../../.look/evidence/1793695343460-11952/evidence.json) | [board](../../.look/water-mobile-surf-rock-board.png) / [manifest](../../.look/evidence/1793695470835-13729/evidence.json) | Rock silhouette and bright submerged net remain. Mobile is softer. The missing planar reflected silhouette is an existing gap. |
| Open ocean | [board](../../.look/water-high-open-ocean-board.png) / [manifest](../../.look/evidence/1793695367707-12123/evidence.json) | [board](../../.look/water-mobile-open-ocean-board.png) / [manifest](../../.look/evidence/1793695494930-14020/evidence.json) | Sky/horizon, rolling surface and sun lane remain. Smaller swells and broader glints relative to the source predate this work; mobile blurs the finest highlights. |

Also opened all eight `water-{high,mobile}-{lagoon,breakers,surf-rock,open-ocean}-consecutive.png` strips in `.look/`,
extracted from real-time recordings at frames 30–33, plus both Lagoon curve PNGs. Adjacent frames show the caustic
net and crests advancing without an obvious jump; this short inspection does **not** establish real-time smoothness.
Curves show a stationary camera and roughly 16.7 ms presentation, with screenshot stalls. Different phases prevent
pixel-identical wave comparisons. Every final board capture passed WebGPU/completed-frame/error checks.

No place bot or gameplay scenario was run for this isolated rendering change, so there is no bot verdict.
One initial diagnostic eval failed because a bare `three/webgpu` import could not resolve in the browser; the local
Vite module import fixed it, and subsequent captures passed. Underwater, aerial and tablet motion remain unverified.

### Requests for the owner's M4 iPad Pro

No iPad performance number is claimed. On the owner's device, record:

1. Safari/iPadOS version, orientation, CSS viewport, device DPR, actual canvas/world dimensions, frame cap and Low
   Power Mode. Confirm coarse-pointer default mobile, explicit `q=high`, and stored 4× colour/depth MSAA.
2. Lagoon at both settings: several warm 5-second GPU samples with mean/p95, then repeat after ten minutes for
   thermal stability. Use a trustworthy GPU trace when timestamp queries are unavailable or overlapping; report
   unavailable GPU timing explicitly. Compare water visible/hidden in the same session and retain the error log.
3. The same four views at `q=mobile`, then high: judge caustic softness, curved foam, rock shading and sun glints.
   Gut question: **does mobile still feel like the same water?**
4. Adaptive resolution over sustained play, rotation and background/resume: record canvas/world sizes and ensure
   world resolution stays at the intended 0.6 bound, without compounded scaling, blank targets or refraction seams.
5. Waterline crossings, underwater shafts/droplets, a fast camera turn, a sun-preset change and exposure adaptation:
   record real-time motion, GPU spikes and errors. The above-water desktop boards do not validate those cases.

### Follow-up checks and scope

- Targeted `npx prettier --write`, ESLint, `git diff --check` and **`npm run check` passed**, including unit tests,
  registry, level-check, asset check and the production build (`built in 4.48s`). No new unit tests or scenarios.
- Read and simplified the production diff. No changes to shared renderer code, `src/proto/place/`, network,
  lockstep state, dependencies or reference files. All committed changes are in `src/proto/water/` and its two docs.
- Captures ran sequentially through the supplied broker; no source was edited during a capture. The temporary
  measurement helpers and boards remain local ignored evidence. No external network, push or ship.
- This is ready for the owner's device/feel check. No further visual development is implied by the remaining options.
