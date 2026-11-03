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
