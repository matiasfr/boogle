# Looks comparison in the Dev dock

## Goal and approval

Build the owner's approved, Local five-look comparison on the existing procedural late-morning sky. Help choose a bright seaside toy world whose water remains rich, without changing ordinary visits. Serves **Show, don't tell**, **Understandable at a glance**, and **Small and readable**. The owner's explicit brief approves implementation; no additional approval gate is needed. Stop after evidence and local commits for owner review; do not push or ship.

## Sources and authority

Read the graphics route of the current-decision index and `Look` in `docs/proposals/boogle-2.md`: procedural sky remains preferred; toy sky stays opt-in and unused by this comparison. Read `color-sources.md`, `color-and-post.md`, `sunshine-sky.md`, and `dev-tools-agentic.md`'s grade section. `sunshine-rendering.md` is absent from this checkout but available locally as `git show 41f69fc5:docs/research/sunshine-rendering.md`; its water starting values are also repeated in the owner's brief. Do not restore its superseded toy-sky recommendation. No external networking is authorized. `npm run inflight` fetches, so inspect local refs instead; existing local branches are not proof of active ownership.

## Design

Everything here is **Local**: selected look, A/B slots, exposure lock and recorded trim, clipboard data, dock state and origin-local persistence. No Owner/Host/Lockstep state, messages, ops or sim changes. No action-registry entry is needed for a dock-only keyboard shortcut; ignore shortcuts in editable controls and provide the same action as a touch button. Existing game input remains authoritative outside the dock.

### Owners and loading

- `src/render/water/post.ts` owns the actual production-water HDR output, exposure meter and manual sRGB conversion. Extend this owner, never `renderer.toneMapping` or the legacy tone prototype. Keep the ordinary branch's shader graph and constants identical.
- `src/render/water/live.ts` provides existing Local bindings. Editable uniforms must be created on `newWaterEnabled && (tune=1 || devEnabled)` visits so Dev alone can use Looks. Ordinary visits still return constants, without loading UI or allocating comparison uniforms.
- Add a small `src/render/water/looks.ts` owner for immutable named presets, Local preference validation, selected/A/B/lock state, binding application and exported status. No debug dependency from this module. Read its saved preference synchronously before the initial post output is built; add its exact storage key to `src/dev-preferences.ts` cleanup.
- Add `src/debug/dev/looks.ts` implementing the existing `Tool` contract. Register it with `registerDockPanel` from the gated Dev startup; `tune=1` visits must get the dock as well, without two simultaneous Water UIs. Small changes in `src/features/dev-menu.ts` and `src/features/water-tuning.ts` may route standalone tuning into the dock. Preserve first-entry/loading UI and the existing Post sliders.
- Use one comparison output graph with uniform choice/strengths, built during existing loading warm-up. Toggling looks only changes uniforms and light/binding values: no `pipeline.outputNode` replacement or runtime shader reconstruction. The one graph includes AgX and installed Three Neutral, one meter, and one sRGB conversion. Uniform selection may execute extra ALU; measure rather than assume zero cost.
- Existing `warmDraw`/whole-scene startup draws materialize the output before reveal. If saved restoration needs async work, await it in the existing `warmUp(..., {beforeScene:true})` preparation, not after dock mount. Never import the panel just to restore values. Resolve saved Water-versus-Looks precedence explicitly: a saved named look wins for the keys it owns, and loading Water UI must not reapply stale saved values over it. Current restores shipped appearance values, not the last arbitrary panel state.

### Named looks

One click applies the whole named set, first restoring all comparison-owned water, post and optional fill keys to their shipped baseline. Snapshot baseline values before applying any saved override. Use stable IDs `current`, `clean`, `sunny`, `punchy`, `sunshine`. A gated `lookPreset=<id>` query may select a reproducible look for broker evidence; it must have no effect outside Dev/tuning and must not accidentally persist capture-only overrides.

1. **Current:** exact shipped water AgX (`power=1.12`, `saturation=1.3`), exposure trim 1 / 0 EV, normal adaptive meter, contrast/saturation 1, bloom off and shipped water optics. Do not use the older board's 0.771116 AgX trim. Capture a true unflagged control separately.
2. **Clean toys:** installed `toneMapping(NeutralToneMapping, 1, vec4(exposedHdr, 1)).rgb` at the same owner. Start the recorded trim at `1 / 0.771116` (+about 0.375 EV) relative to the untrimmed production reference, then calibrate visibly against Buddy/cream walls with exposure locked. This is a starting grey match, not proof of a correct final subject exposure.
3. **Sunny toys:** current AgX with a recorded exposure trim and 0.08 starting chroma lift, constrained to the owner's 0.05–0.12 range. Apply in display-linear colour before sRGB, around luminance, with smooth shadow/highlight protection; keep near-white glints neutral and avoid clipped oversaturated output. No blanket 30% saturation increase.
4. **AgX Punchy:** reuse the existing Post panel's values (`power=1.35`, `saturation=1.4`), not an invented encoded-space contrast grade. Record its trim independently.
5. **Sunshine water:** Clean toys plus water saturation 1.1, reflection gain 0.9/cap 0.8, foam brightness 0.8, glitter 0.6 and unchanged FFT energy 0.25. Tune existing scatter/absorption against sand within up to three inspected rounds. Do not add another depth tint or change FFT/shore/caustics/foam systems. Optional warm key/cool readable fill uses `frozen-sky.ts`'s existing sun/hemi, Local bounded tint/gain controls, and no new light, cube, bake or pass. Restore exact baseline for every other look. Consider this only with exposure locked; omit it if it flattens forms or no improvement is visible.

### Exposure, A/B and copy

Expose chosen A/B look selectors and one touch-sized toggle, plus a documented dock keyboard key. Store selected look/A/B preferences locally and validate against the five IDs. Exposure lock must freeze the existing GPU adaptation history, not substitute exposure 1. The current meter already takes `dt`; after its startup settling frames, passing 0 while locked makes its adaptation rates zero. Keep per-look trim explicit and separately report it; unlock resumes the same history. A saved lock settles during loading before freezing. Provide a bounded agent command to set looks/slots/lock/trim for repeatable evidence, through `boogle.dev.run('looks', ...)`, plus a snapshot containing effective settings and trim.

`Copy look` emits versioned JSON with look ID, build, procedural sky identity, curve/power/saturation, midtone lift, trim factor/EV, locked/adaptive state, and all effective post/water/fill values needed for an agent to promote it. State explicitly that this is Local preview, not a changed default. Use the established selectable-text fallback when clipboard is unavailable. User edits in the Water/Post panel must remain usable and be represented honestly as modified settings rather than falsely labelled an untouched named preset.

### Tile board decision

Defer the optional live grid. The final pre-tone underwater output is a composed graph; remapping it safely requires a materialized full-resolution HDR texture/pass. Sunshine's water/fill changes also cannot be represented by regrading one shared HDR image. Deliver same-camera labelled capture boards instead; distinguish sequential captures from a same-time shared-HDR board and record wave/star phase differences. No repeated scene/simulation/meter per tile is added.

## Steps

- [x] 1. Add the gated Local preset/output owner in `src/render/water/looks.ts`, `live.ts`, `post.ts` and the exact preference cleanup key in `src/dev-preferences.ts`. Keep production branch unchanged and avoid runtime output reconstruction. Verify formatting, lint/typecheck, off-route graph review and named value snapshots.
- [x] 2. Add `src/debug/dev/looks.ts`, register via `registerDockPanel`, route tune-only visits into the dock, and reconcile saved Water/Looks restoration before loading completes. Include one-click presets, A/B selectors/button/key, lock, recorded trim and Copy look. Verify DOM/API agree, invalid saved JSON is ignored, Dev Off clears the preference, and ordinary visits load no panel/comparison work.
- [x] 3. If visual evidence justifies it, add only bounded Local frozen-sky key/fill bindings in `src/render/water/frozen-sky.ts`; no sky replacement or runtime rebake for A/B. Keep default arithmetic and normal-route branch unchanged. Verify Current resets to shipped values and exposure stays locked during the judgment.
- [x] 4. Root captures the current and candidate looks through `.look/see-client.ts`, with one fixed camera per shore, open water, trees, town, player/stars and bright-glints row. Named question: which keeps toys inviting and water luminous without a plastic flat sheen? Open the PNGs and assembled board. Iterate at most three rounds; record final trims and water settings. No source edits during runs.
- [x] 5. Verify A/B repeatedly after warm-up, saved Sunshine reload under `startup=1`, no late comparison pipelines after reveal, and explicit Current versus an unflagged shipped reference. Measure additional CPU/GPU/pass/target cost using broker-supported diagnostics, fixed pixels and matching view; label GPU contention and unavailable timestamp coverage. No direct Chromium or new harness.
- [x] 6. Update `docs/game-design/dev-menu.md` and relevant `graphics.md`/water description with scope, controls, Local storage, output transform, exact presets and live-grid departure. Run `npx prettier --write` on changed files, changed-file ESLint and `npm run check`; fix failures. Run broker full place bot once with the appropriate `proto=place&shot=play` route, read its report even on failure and open its end PNG. Repeat affected checks after subsequent code edits.
- [x] 7. Root reviews/simplifies the diff and verifies manifests match the final tree. Make small imperative local commits with the served DESIGN principle in each body. No push/ship. Final report under about 150 words names actual opened images, observations, bot failures, cost limits and full evidence-manifest links, ending with the requested JSON outcome block.

## Risks and limits

- Render and feature nested AGENTS were read. `post.ts`, gated startup and `dev-menu.ts` are shared owners; keep edits narrow. No room-safety or mixed-build change is needed because nothing goes over the wire.
- The precompile deadline can still escape on slow cold GPUs; only recorded reload evidence can support the no-late-pipeline claim. Saved restoration after reveal would violate the task even if switching looks later is smooth.
- Uniform AgX/Neutral selection can execute both transforms; added ALU and boot pipeline time are opt-in costs and must be reported. No new fullscreen pass is approved merely to obtain the optional grid.
- Current must reset prior Sunshine optics and post overrides. Existing sky/bloom saved values need explicit precedence; never claim an exact production reference while inheriting those edits.
- Existing knockdown-star radiance may remain muddy in every curve. This task compares it; do not silently alter gameplay effects to manufacture a better result.
- No UI unit tests/new scenarios under the test diet. No sim, transport or player-controller changes. Real-time smoothness and device performance remain unverified unless separately observed; stills and curves do not prove them.

## Open questions

None blocking the approved implementation. Final look selection and promotion to default belong to the owner after this comparison. The optional live grid is deliberately deferred for the concrete cost/fidelity reasons above.

## Completed review

Implemented in `a4229988`, `d3a1a35d`, and `edc9a652`. The 30-capture board, bot, final reload, off-route check and timing samples test the clean `edc9a652` implementation tree. This completion update changes documentation only.

Sunshine water leads: richer turquoise shallows and warmer sand, with visible wave troughs and broken reflections. Clean toys is close. Neutral makes the town and trees brighter while preserving shaded faces; the purple player and gold knockdown stars remain distinct. Its whiter glints are noticeably glossier, but the inspected water does not become a flat plastic sheet. Sunny is subtle; Punchy is darker than preferred. Keep the calibrated Neutral trim at +0.374980 EV, absorption `[0.48, 0.055, 0.032]` and scatter `[0, 0.06, 0.1]`. A warm-key/cool-fill trial did not earn its complexity in the inspected views, so presets retain identity light tint/gain.

Prettier and `npm run check` passed (293 tests, zero failures, build passed). The full place bot passed every expected beat with zero errors and 78 checkpoints; it did not mark co-op activity. A/B button/key and Copy worked at desktop and phone widths, with zero new pipelines during repeated switching. Saved Sunshine reloaded before reveal: 144 pipelines, none late or pending. Ordinary visits loaded no comparison/UI modules or bindings. The normal shader branch remains unchanged; animated captures are not a pixel-hash equality test. Malformed preference guards and Dev Off cleanup were reviewed in code, not separately exercised in the browser.

All timing samples used 960×600, DPR 1, MSAA 4 and Apple Metal, with 300 complete GPU samples. Every route retained 7 render passes, 11 observed render targets and 214 programs. Final ordinary / opt-in Current / Sunshine GPU render averages were 8.99 / 13.31 / 10.10 ms; an earlier ordinary sample was 14.78 ms. Shared-machine contention and reference drift prevent an isolated added-cost claim. No full-screen pass or render target was added. Actual device performance and subjective real-time smoothness remain unverified.

Evidence lives in `.look/evidence`: bot `1793781950106-83300`, final saved reload `1793782433426-97948`, ordinary route `1793782295186-92532`, phone A/B `1793781861596-81481`, motion/curves/video `1793782357967-95396`. The labelled board and provenance retain all 30 source manifests. Each capture independently settles Current exposure and then locks it before selecting the candidate; waves, NPCs and stars can differ in phase. Recorded meter gain varies up to about 5.2% (0.073 EV) within the shore row; the live A/B control uses one shared frozen meter. The optional shared-HDR live grid is deferred for the cost/fidelity reasons above. One early capture hit a hidden-lobby-button timeout before testing a look; retry passed. No push or ship; stop for the owner's review/playtest.
