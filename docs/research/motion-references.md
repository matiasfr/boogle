# Motion references: image-first experiment

> **Verdict:** Image-first motion references; generation step blocked in this job.
> **Top recommendations:** none; partial experiment record, generation step ran in later jobs.
> **Status:** partly adopted. See [rack-model-compare](rack-model-compare.md).

_5 November 2026. Partial experiment, not art approval. Work confined to `codex/motion-references`; no push or ship. DESIGN principles: **11. Show, don't tell**, **Small and readable**, and **Code first, images by approval** (generated work remains reference material)._

## Later results, 5 November

This job's generation step was blocked, so later jobs ran it, and the sections below describe that blocked run.

- **Modelling:** [rack-model-compare](rack-model-compare.md) built a recovery rack from text alone and from references. The owner preferred the reference-guided build, with the condition that previz stays steered to the game's look.
- **GIFs:** Images 2.6 lists GIF output, but `codex exec`'s image tool returned static 12-panel PNGs when asked twice. A native GIF from the Codex app is still being tested.
- **Keyframes:** six generated stills were useful as silhouettes, mainly low-hand ready and the shoulder cock. Blade direction in the strike and bite was wrong, and shoulders and feet drifted, so don't copy them as measurements.

## Result and blocking constraint

Captured real Buddy references in `/character/`, inspected an earlier two-handed chop comparison, and prepared the bounded motion/rack experiment. **No image generation was attempted, no generated GIF or frame sequence exists, and neither rack model was built.** There is no evidence yet that an image reference improves the mesh or animation.

The brief permits network access only to the local game server. OpenAI generation and live primary-source verification require external access. A narrow clarification was requested; without an explicit exception that restriction remains binding. No global tool update, API call, paid Meshy use, or external fetch was made. The frame-sequence fallback below is a prepared prompt, not a delivered generation.

The owner explicitly authorized starting this experiment ahead of the round-4 replay, assuming it goes well. That authorizes this isolated research, not a successful replay or deployment. [Owner calls](../agents/owner-calls.md) retain **Start animation simple** and record the experimental preference.

## What this CLI actually exposes

Local first-party sources inspected: installed `$imagegen` `SKILL.md`, `references/image-api.md`, and `scripts/image_gen.py` under `~/.codex/skills/.system/imagegen/`; `codex --version` and `codex features list`. These are local capability evidence, not verification of a new service release. Live official documentation and current pricing were not fetched.

| Route | Verified local capability | Model actually used here | Missing for native GIF |
| --- | --- | --- | --- |
| Built-in `image_gen` | Raster generation/edit tool with prompt, reference images and transparency; preferred by `$imagegen`; no API key required by the skill | None. Tool schema does not expose a model selector or promise a model ID | No documented animation/GIF output control, frame rate or duration contract in the exposed tool |
| Installed Codex CLI | `codex-cli 0.166.0`; `image_generation` enabled | No child generation launched | Feature flag alone does not establish native GIF support |
| Bundled `scripts/image_gen.py` | `generate`, `edit`, `generate-batch`; default `gpt-image-2`; output-format validator accepts PNG/JPEG/WebP | None; `gpt-image-2` is a **configured default**, not a generation receipt | No GIF output format or temporal generation command; also requires external access and an API key |
| Repository `npm run concepts` | [Source](../../dev/concepts/generate.ts) supports API and Codex routes; `refsheet` adds front/side/back at one scale | None. Its `--model` applies to API, not the spawned Codex image tool | Codex wrapper requests a PNG; API path requests/decodes still images |

This does **not** disprove the owner's account of GIF generation elsewhere. What is missing here is an authorized external route, fetched primary documentation establishing the native animation interface, and a returned multi-frame artifact with model/provenance and timing metadata. Do not update global tools to guess at it.

The wrapper currently appends **“style reference only … not its subject or composition”** to every `refs` input. That conflicts with preserving Buddy's identity or a rack's geometry. Use the preferred built-in `$imagegen` route with explicitly named image roles for that experiment; do not claim the current wrapper preserves identity. `refsheet`'s view specification can be carried into the prompt without rewriting the generator. Live product/source verification remains necessary before saying “new model” or quoting per-image prices.

## Real reference captures

Captured source: `1b19093f8986b95098dd8e3d33e61b654bbb637b`, tree `6ce5e90cbeddbeb33887d0316372a45ba008c6c8`. Broker manifests retain before/after source and harness identities. No source changed during the captures.

All Buddy views use the actual built model and conductor hat, `Idle_Loop`, raw mode, paused at `t=0.4`, no cargo/reference Buddy/bounds, FOV 40, target `(0,0.9,0)`. Cameras: front `(0,1.1,4)`, side `(4,1.1,0)`, back `(0,1.1,-4)`, three-quarter `(3.4,1.55,2.5)`. These are perspective stage views, not orthographic modelling measurements.

The first studio captures had a directional shadow. For the four final flat references, a scratch copy of the existing `asset-stage.ts` eval mounts the same stage, walks from `stage.figure` to its scene root, sets all light intensities to zero except the single hemisphere, makes both hemisphere colours white at intensity 2, and hides the grid. Exposure remains 1. No rig, mesh or production lighting changes. The exact eval is retained in `.look/motion-references/flat-stage.ts`; the report's evidence index retains its hash.

| Opened reference | Manifest | Observation |
| --- | --- | --- |
| [Front](motion-references/buddy-flat-front.png) | [Flat front](../../.look/evidence/1793899295079-3065/evidence.json) | Large round head, broad mitts, short limbs and gold hat band remain clear; flat lighting removes surface depth |
| [Side](motion-references/buddy-flat-side.png) | [Flat side](../../.look/evidence/1793899326430-3538/evidence.json) | Hat brim and head depth read; far arm/leg overlap, so this alone cannot constrain both limbs |
| [Back](motion-references/buddy-flat-back.png) | [Flat back](../../.look/evidence/1793899360393-3991/evidence.json) | Back silhouette and hat band are clear; no invented rear decoration is needed |
| [Three-quarter](motion-references/buddy-flat-three.png) | [Flat three-quarter](../../.look/evidence/1793899405261-4941/evidence.json) | Brim and one eye establish facing; near/far mitt separation is weak in this idle pose |
| [Studio front](motion-references/buddy-studio-front.png) | [Studio front](../../.look/evidence/1793899156691-99793/evidence.json) | Supplemental depth/material reference; not flat lighting |

Also opened the [studio side](../../.look/evidence/1793899208635-1430/buddy-side-still.png). It supplies depth missing from the flat silhouette. Stage readiness reports 17 draw calls and bounds approximately `0.896 × 1.633 × 0.706 m` with the hat; those are runtime posed bounds, not canonical modelling dimensions. The draw count is the **pre-flattening readiness sample**, not a performance comparison. Capture health passed WebGPU/no page or graphics errors. Reported frame rates and wall times are not performance or feel evidence on this shared Mac.

## Motion: prior trial and transferable poses

Read `docs/research/tool-swing-animation.md` directly from branch `codex/tool-swing-animation`, resolved to `e74d862a12473bab424bf4369dbe47e13b725e69`. Its timing/pose recommendations are proposals: low hands, shoulder-side axe head, immediate preparation, short accelerating strike, 40 ms bite. It does not approve a side dock or a new default.

The current trial branch resolved to `b12c7fedfb00851cb97f65812e6a272fc293a27d`. Its retained review describes earlier commit `b19f14ca`, tree `b198863f69de711391592f3b1bf8c3e45f2bfb5e`. Later branch code restores the floating default and gates the two-handed path. Do not equate those identities. No branch switch, cherry-pick, chop edit or current-trial rerender was performed.

Opened the earlier [side comparison](motion-references/prior-trial-side.jpg), from `../chop-animation-timing/.look/chop-animation-timing/old-left-new-right-proper-bite-side-key-times.png`. In the right-hand trial panels, preparation places both hands close to the face and the blade above the forehead. Contact has a readable side silhouette. The early/release panels hide the tool. That prior example has no hat and is yellow; it cannot validate conductor-hat preservation in a new generation.

Extracted encoded frames 8–19 (zero-based) from the prior `final-proper-bite-side-realtime.webm` with ffmpeg, keeping all 12 consecutive encoded images and opening their [board](../../.look/motion-references/trial-video/consecutive.png). The hands remain near the face, then the axe appears and rotates through a high preparation. This is **existing rendered-game footage**, not generated motion and not the requested generated-frame fallback. The source capture used 0.25 playback; duplicate/held images and encoded indices do not establish presentation cadence. Its [original manifest](../../../chop-animation-timing/.look/evidence/1793873025218-74792/evidence.json) and stage curves remain prior evidence. No new frame-number timing claim is made.

Key poses worth transferring to the existing rig, after a reference is judged:

| Pose | Authored target time | What transfers |
| --- | --- | --- |
| Low ready / take hold | 0–40 ms | Immediate torso/hand response; mitts below chin; one rigid axe with fixed grip spacing |
| Shoulder cock | 100 ms | Axe head outside shoulder/head outline; low reachable hands; small torso turn, stable head and feet |
| Diagonal cut | 100–160 ms | Tool rotation through open side with acceleration late in strike; no arm stretching |
| Bite / brace | 160–200 ms | Reachable central contact, modest torso compression, unchanged 40 ms held bite |
| Pull free | 200–320 ms | Short withdrawal along entry direction; at 240 ms permit a new stroke from this pose, not an idle reset |
| Low settle | 320–720 ms | Hands/tool lower together; decreasing motion with clear head/hat clearance |
| Release | 720–900 ms | Blend to current idle/walk/carry; tool-appearance policy still belongs to the owner |

These numbers come from the branch research, not frame measurement. Preserve the actual rig/handle/grip dimensions; do not transfer model-generated anatomy or apparent joint locations as measurements.

## Prepared motion prompts: frame-sequence fallback, not executed

First inspect each input with `view_image`. Images 1–4: real flat Buddy front/side/back/three-quarter **identity and geometry references**. Image 5: studio front for surface depth. Image 6: real gameplay context for camera scale and readability. Image 7: the prior trial side strip for axe shape only; do not copy its raised-hand pose, yellow body or missing hat. No commercial character reference, ROM content, new costume or extra props.

Shared prompt (`stylized-concept`):

> Produce a two-handed axe chop motion reference of this exact Buddy, preserving head/body/limb proportions, turquoise colour, mitten hands and the conductor hat including brim, band and badge. One rigid axe; both mitts keep the same positions on its shaft throughout the held action. Low hands, axe head beside the shoulder, visibly immediate preparation, short accelerating diagonal strike, 40 ms bite, short withdrawal and low settle. Keep feet planted and the head aimed at the cut; no long-arm stretch or face/hat intersection. Fixed camera, full figure and whole tool visible, neutral flat light. This is pose reference, not a redesign.

Native GIF is the desired artifact **only if the route is documented and available**. Otherwise append:

> FRAME-SEQUENCE FALLBACK: make one 3×3 sheet of nine ordered poses, identical framing/scale/ground line. Cells in reading order correspond to intended 0, 40, 100, 140, 160, 200, 320, 720 and 900 ms. No labels or decorative panels. These are key poses, not equally spaced movie frames. Do not depict multiple independent characters per cell.

Generation 1: side view matched to the prior trial camera `(3.4,1.55,0.2)`, target `(0,0.95,0.2)`. Generation 2: three-quarter, matching `(3.4,1.55,2.5)`, target `(0,0.9,0)`. Numerical camera values are composition guidance to an image model, not a promise of camera calibration. Keep actual runtime comparison captures separately. No invented interpolated frames; any locally assembled preview must retain the uneven authored durations and be labelled as assembly of stills. A sheet cannot demonstrate acceleration or a 40 ms hold.

Judge each against proportions/hat, fixed grip and single axe, silhouette at actual game distance, timing, and utility as reachable rig poses. **All generated-output judgments are pending.** Reject a beautiful sheet that requires a new rig or cannot show the blade from the game camera.

## Rack experiment: frozen text control and view test

The requested object is the **safe recovery rack**, not a train-delivery rack or a new inventory design. [5 November supply direction](../decisions.md#the-shape-of-the-game) requires safe recovery and counted regrowth before slice 2; [solo design pass §11](solo-design-pass.md#11-recover-drops-and-regrow-trees-with-explicit-resource-accounting) contains proposed accounting details. Those proposals are not mesh requirements or authority to implement timers, capacity, ownership, saves or recovery interactions.

Freeze this text-only control brief before revealing a generated rack concept to its builder:

> A small freestanding, open-front recovery rack beside the existing path/work area. Chunky timber posts and broad shelves/cradles; plain dark metal restraint where needed. Stored shapes should remain visible from normal play distance. No roof, tiny hardware, text label, glow, coin motif, decorative story or mechanically moving parts. Empty rack first; it must read as accessible storage rather than a chest. Buddy is the scale anchor. Static motion declaration: none.

Experimental, inferred envelope for **both** builds: 1.6 m wide × 0.8 m deep × 1.1 m high, ground-centred origin, game +Y up/+Z open front, Blender `(x,-z,y)`, named posts/shelf/rear brace, closed-solid timber parts, no intentional open mesh surfaces. Proposed budget: ≤2,000 triangles, ≤3 materials, ≤100 KB built GLB, one initial blockout plus at most two diagnosed repairs. These are control settings, not verified production constraints or owner-approved dimensions. No collider or capacity is implied.

Generation 3: edit a real gameplay screenshot into a rack **previz**, keeping Buddy, camera, terrain, route and lighting; add only that rack in an accessible margin. This is an edit target, not style-only input. Preserve a clean path and avoid suggesting an already-integrated feature.

Generation 4: take the selected previz as **geometry identity reference**, use concept-art's `refsheet` specification: front, side, back, same scale/ground line, flat lighting, orthographic, plain background. Generation 5, only if useful: same rack plus separate three-quarter and top views. Keep the orthographic views fixed; crop/read F/S/B alone before revealing extra views so the view comparison does not silently redesign the rack.

Questions, not results: front should constrain opening/shelf height; side should constrain depth/reach; back should constrain bracing; three-quarter may clarify assembly but can hide dimensional conflicts; top may help footprint and cargo clearance. Reject cross-view contradictions rather than averaging incompatible geometry. **Which views actually help remains untested.**

After images are available, follow asset-author: two isolated scratch recipes, same brief/budget/Buddy pose/camera/light; build with `npm run assets -- --scratch`, inspect decoded GLB front/side/back/three-quarter in clay/parts/wire/material, then stage actual assets beside Buddy at close and game distance. Preserve source/build/tool hashes, triangles/materials/bytes/draws and diagnosed repairs. No paid Meshy. Do not call the image-first build better before opening both results. Neither build was started here because the required reference path is blocked; no placeholder is presented as a comparison.

## Generation ledger and recommendation

| Slot | Planned purpose | Status | Service cost incurred | Model/route receipt |
| --- | --- | --- | --- | --- |
| 1 | Side chop GIF or labelled pose-sheet fallback | Not attempted | $0 | None |
| 2 | Three-quarter chop | Not attempted | $0 | None |
| 3 | Screenshot-based rack previz | Not attempted | $0 | None |
| 4 | F/S/B `refsheet` | Not attempted | $0 | None |
| 5 | Additional three-quarter/top views | Not attempted | $0 | None |
| 6 | One targeted generation repair, if needed | Unused reserve | $0 | None |

Zero generations, zero API/Meshy spend. **Per-generation prices are unknown**, not zero. The subscription route's marginal billed cost cannot be inferred from an API price table; capture returned usage/cost where available and otherwise say unavailable. Keep the total at six, including failed/repair requests; fewer if the blocker persists. Local capture and agent work are not priced here.

Recommended workflow remains experimental: real screenshot and Buddy views → verify route/model/native-animation capability → one side motion proof and one three-quarter proof → screenshot previz → minimum useful turnaround → matched text-only/reference-built GLBs → stage and compare → owner quality/feel decision. A generated pose sequence supplies ideas; the rig, code clocks and quiet live play supply the actual motion. Ask whether the references improve the result, not whether checks turn green.

## Verification and handoff

`npx prettier --write` ran on all changed Markdown/JSON paths; the repository’s `.prettierignore` excludes `*.md` and `docs/research/`, so it left those files unchanged. `npm run check` passed on Node 26.13.0: lint (0 problems), typecheck, 330/330 unit tests, registry, level assertions, asset/catalogue checks and production build. New report/workflow links resolve and `git diff --check` passes. Only report text was finalized after the check; no executable source changed. No new tests or scenarios were added for documentation/reference work.

The corrected full bot request used `playthrough --query 'proto=place&shot=play' --stall 600`. It exited 1 at the harness's five-minute wall limit with arrival pending aboard a train. The [full report](../../.look/evidence/1793899574141-8341/run/report.txt) was read and its end still opened: Buddy is seated aboard, but the bot overlay obscures much of the scene. The [manifest](motion-references/manifests/bot-incomplete.json) retains the exact unchanged source. It records 18 chop marks, 30 deposits, eight stretches, three ability gains, and 72 saved checkpoints; no graphics/page errors. Those counts establish exercised paths, not completion. Unmarked activities include crystal, interior/shop/museum, try-on/take/swap and doing something together. No timing conclusion is drawn; a quiet rerun must establish completion.

Earlier setup failures are retained: `look --at list` before any playthrough had no saves; the broker rejected `playthrough --name`; a query missing `shot=play` selected the hat fixture and stalled with an empty bot log ([failed manifest](motion-references/manifests/bot-setup-failure.json)). That was a setup failure, not a diagnosed game regression. Corrected supported invocation above ran the actual bot. No harness changes.

The subsequent [forge-lit checkpoint capture](motion-references/manifests/gameplay.json) passed health checks and was opened. [Gameplay reference](motion-references/gameplay.jpg) shows Buddy, timber framing/scaffolding, an existing front cradle and open grass beside the path; a rack previz can use the grass while keeping the path clear. The scaffold is visibly present: the checkpoint name is not proof that every transient forge visual restored. The screenshot is real, not a rack concept or a restoration-equivalence test.

The committed [evidence index](motion-references/evidence-index.json) links copied broker manifests and original image hashes. Only selected report images are committed; full-resolution captures, video-frame extraction and curves remain in their evidence locations.


No gameplay/animation/model code, sync kind, wire/save contract or lockstep math changed. The scratch lighting is Local inspection state only. No game-design chapter needs an as-built update because no player-visible feature changed. No suspect Boogler lines identified in this scoped work; all copy retained. The bot's automated suggestions to cut text are not adopted.

`npm run inflight` was not executed because its first action is an external `git fetch`; cached local branches were inspected instead, including the separately owned chop and slice-2 tracks. This is not a fresh remote collision audit. Global tools/dependencies were not updated. Required final formatting/check results above refer to this worktree only.

Quiet rerun/owner work: native GIF capability and current primary sources/prices; actual generated identity/grip/camera/timing judgments; matched current-trial captures; both rack builds and view usefulness; normal-speed motion, feel and device performance. Neither captions, timing under load, stills nor bot success settle those. **not tested on a device**

## Owner images to open

Start with [Buddy flat front](motion-references/buddy-flat-front.png), [studio depth anchor](motion-references/buddy-studio-front.png), and [prior trial side poses](motion-references/prior-trial-side.jpg). Also open the [gameplay context](motion-references/gameplay.jpg). These are real/retained game images, not generated candidates. The experiment has no asset-quality verdict yet.
