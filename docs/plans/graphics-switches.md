# Graphics cost switches

Owner-approved scope, 4 November 2026: build order steps 1–2 from
[graphics settings](../research/graphics-settings.md). Implementation is authorized by the task; no new
approval gate. Principles: **Small and readable — measure before optimizing**, **Clear authority**, and
**Pick how each feature shares state**. No Pause Graphics page, presets, geometry/wave/query experiments,
new look, network use, push or ship.

## Goal

Give the Dev dock real, reversible switches for cosmetic rendering work and matched measurements on the
place/new-water page. Normal play keeps its current appearance and loads no Graphics panel code.

## Design and ownership

All values, adapters, measurement sessions and persistence are **Local**. No networking API, room edits,
presence, saves, simulation or gameplay state changes. Existing water queries, FFT, wave timing and
waterline/medium classification keep running, including on frames skipped by a render cap.

- `src/graphics-settings.ts`: a small renderer-independent registry. Descriptors have bounded choices,
  route baseline/default, audience, `scope: 'Local'`, availability/reason, persistence, cost category,
  `applyMode: 'live' | 'rebuild' | 'reload'`, skipped-work description and hitch warning. Owners supply
  `read`, `apply`, optional `prepare`, and unregister/disposal. Expose registration, validated override,
  baseline restore and serializable requested/effective/pending snapshots. No imports from debug.
- Preserve baseline/override distinction. Dev overrides use a separate versioned Dev key, are validated,
  and are only read when `devEnabled`; clearing Dev clears them. Player choices remain reserved for later
  `boogle.graphics.v1`; no presets or unrequested player controls. Catch storage failures. Closing the
  dock is not resetting graphics. A one-click baseline restore removes Dev overrides, restores each
  owner's baseline, and identifies any pending reload.
- `src/render/quality.ts` owns final DPR/scene scale and render-cap decision. Adaptive resolution sends
  its requested ratio here; water sends its ceiling. Preserve today's effective
  `min(adaptiveRatio, waterCeiling)` and full-output post behavior. Explicit Dev resolution overrides are
  bounded and fixed while measuring. Only this owner writes DPR/scene resolution after initialization.
  The cap gates the output render, never the game loop; capped callbacks still update gameplay, physics,
  input, queries and networking. Adaptive observations use uncapped callback timing. Display is baseline.
- Renderer resources stay in their current owners. No registry-driven scene traversal or blanket light
  hiding. Owned setters are imported/registered without eagerly loading Dev modules.
- `src/debug/dev/graphics.ts` implements the Tool contract; `registerDockPanel` registers its lazy loader
  from the existing Dev-only module. It lists available and unavailable switches, exact removed work,
  live/rebuild/reload, hitch warnings, requested/effective/pending and baseline restore. Bounded agent
  commands share the same implementation as UI: `read`, `set {id,value}`, `reset`,
  `measure {id,seconds?,warmSeconds?}`, `copy`. No arbitrary evaluator.

### Switches

| ID          | Owner and behavior                                                                                                                     | Mode / caveat                                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shadows     | `scene.ts`: disable actual shadow rendering, preserving the owner's default and sun/sky state; do not merely zero darkness             | Rebuild if changing the shadow node/pipelines; label first-use hitch. Restore correctly after sky updates.                                                                 |
| msaa        | `scene.ts` / scene pass: choose stored 4x or 1x scene samples; preserve the Safari stored-MSAA rule                                    | Reload is acceptable if safe runtime replacement cannot be demonstrated; never silently claim a live toggle. Pending reload cannot be timed as applied.                    |
| caustics    | `water/caustics.ts`: flatten the output once on disable, then skip the producer's recurring draws/mips; enable resumes                 | Live; receiver remains, but no stale moving caustic image.                                                                                                                 |
| spray       | `water/spray.ts`: skip optional shore/rock spray scans and emissions; retain impact cues/shared particle pool                          | Live; already emitted particles drain before the warmed sample.                                                                                                            |
| snow        | `water/snow.ts`: hide instanced mesh and skip its update                                                                               | Live, 6000-sprite draw removed.                                                                                                                                            |
| shafts      | `water/underwater.ts`: stop shaft target updates and branch around shaft composition                                                   | Live uniform branch, no strength-zero claim; underwater colour/boundary retained.                                                                                          |
| lens        | `water/underwater.ts`: branch around optional wet-droplet/distortion fragment evaluation                                               | Live; shared 64x36 depth/wet-state kernel remains because waterline and surface culling consume it. Explicitly label this retained work.                                   |
| bloom       | `water/post.ts`: use its existing lazy bloom graph and bypass it entirely when off                                                     | Rebuild; first enable can compile. Keep edits here narrow for concurrent look-compare work.                                                                                |
| meter       | `render/tone.ts`, minimal `water/post.ts` adapter: stop meter update/save passes and hold last valid exposure                          | Live where possible; holding exposure is not the same as setting exposure to one.                                                                                          |
| lights      | `render/lights.ts`: stop pool selection and remove the two point lights from lit work, retaining source glows and source registrations | Rebuild; light-count change may compile materials. No sun/sky/day-clock changes.                                                                                           |
| foliage     | `debug/look-world.ts`: existing decorative grass draw and update only, never resource trees/collidable scenery                         | Rebuild first creation, otherwise live; unavailable on place if that owner is absent. Do not import lab to make it applicable.                                             |
| lab effects | `debug/look-lab.ts` / `look-post.ts`: use its existing layer ownership to bypass actual post graphs on the lab route                   | Rebuild/reload per existing owner; unavailable on place, never install a second post owner. Strength-only material options must say so and cannot be sold as work removed. |

Unavailable effects are rows with a reason and no fabricated zero-cost result. The place page cannot produce
a meaningful lab-effect or lab-foliage cost without changing its route/scene; report this limitation rather
than installing the laboratory over production water.

### Measurement

`src/debug/dev/performance.ts` exports the shared matched-sample runner used by Graphics. It calls existing
`hardwareTiming`, not a second loop or direct `renderFrame`. Require profiling enabled at renderer startup;
missing timestamps are unavailable. Serialize one measurement at a time, lock controls during it, capture
route/camera/internal pixels/device/settings before and after, warm both settings, then matched on/off
samples (default two-second warm-up and three-second samples in counterbalanced ABBA order; bounded
duration arguments, and repeat when contended). Always restore the pre-measurement overrides in
`finally`. Copy JSON with selectable fallback. Report frame interval, CPU submission and GPU span separately.

Parent agent owns `src/debug/prof-overlay.ts`: extend its raw timestamp observation to expose GPU span
`max(end)-min(start)` by renderer frame, with missing/partial coverage marked unavailable. Per-context duration
sums are not the feature's GPU cost. No fake clock, extra draws, fences or claimed physical presentation timing.
Use the existing `hardwareTiming().gpu.span` result from this work; coordinate its exact type before finishing
`performance.ts`.

## Steps

- [x] 1. Add the registry and unified owner (`src/graphics-settings.ts`, `src/render/quality.ts`); adapt
      `src/features/adaptive-res.ts`, `src/render/water/quality.ts`, `src/render/scene.ts`, and the minimal render
      gate in `src/main.ts`. Update `src/render/reference/frame.md` for the single resolution owner. Read nested
      render/features instructions first. Verify typecheck/lint and baseline `npm run check`; inspect cap ordering
      to prove water queries and gameplay still run.
- [x] 2. Add owned switches in the files named above, with registration disposal and exact availability.
      Avoid permutations for every checkbox: producer skips, visibility and bounded uniform branches first;
      prewarm genuinely new pipeline variants through existing precompile hooks where possible. Read materials/TSL
      contracts for affected graph edits. Verify baseline rendering and individual apply/restore paths with the
      broker, checking no console/graphics errors. Keep `water/post.ts` changes to narrow hooks/setters.
- [x] 3. Add the lazy Graphics Tool, register it through `registerDockPanel`, and add Dev preference cleanup.
      Add matched sample orchestration to `src/debug/dev/performance.ts`; parent supplies GPU span instrumentation.
      Verify input isolation, bounded commands, baseline reset, storage failure behavior and no-Dev lazy loading.
      `npm run check` remains green; no new feature/UI unit tests or scenarios.
- [x] 4. With no source edits during runs, use only `node .look/see-client.ts` to measure every applicable switch
      on place/new water at verified 1440x900 internal-pixel equivalence, fixed resolution and frozen camera.
      Warmed on/off means and sampling conditions go in `docs/research/graphics-switch-costs.md`; include unavailable,
      inactive, noise and contention rather than a savings claim. Label shared-Mac contention and repeat affected
      samples. Use separate shore, underwater and wet-lens poses as required; within each pair camera/settings match.
- [x] 5. Capture/open panel and applicable on/off PNGs. Visual question: does the named cosmetic effect disappear
      while geometry, water boundary and framing remain intact, and does Restore baseline bring it back? Inspect
      up to three rounds. Inactive/absent effects are explicitly unverified, not visually passed. Run the place
      playthrough once, read its report even if it fails, and open its end still/checkpoints needed for the verdict.
- [x] 6. Update `docs/game-design/graphics.md` with built behavior and limitations. Format every changed file via
      `npx prettier --write`, run `npm run check`, repair failures, reread/simplify the diff, and repeat affected
      evidence after any code change. Make small imperative commits with the DESIGN principle in the body. No push,
      ship or screenshot upload (network forbidden). Final report links local full report/evidence manifests and
      states which PNGs were opened, bot results, remaining limits, and required fenced outcome JSON.

## Risks and coordination

- `src/main.ts` is a hotspot: only import plus render gating, with no frame/physics reordering. Existing
  `endFrame` means completed rendered frame; preserve that meaning when the cap skips an output render.
- Shader changes, sample-count changes, light membership and first bloom enable can hitch despite warm-up;
  the 16-second startup escape and late-pipeline caveats in `water-metal-cold.md` remain. No universal stall-free claim.
- Frame cap does not eliminate offscreen query/FFT work needed for gameplay; document that limit honestly.
- Concurrent `look-compare` owns output looks and a Looks panel. No tone selection or grading changes here.
- Parent owns `prof-overlay.ts`; implementer owns all other implementation paths. Both share this worktree
  and must preserve each other's edits. Parent owns final evidence/review/commits unless delegated explicitly.
- No wire changes, room-safety mutations, lockstep math edits, collider disposal or interaction cue removal.
- `inflight` was already run by the parent and fetched GitHub contrary to the local-only instruction; do not
  repeat it or perform any other external network action. Record that departure in the final report.

## Open questions

None blocking the approved implementation. Unavailable route-specific effects and physical GPU contention
are evidence limits to report, not new gameplay/look decisions. Stop after the requested commit for review.

## Execution result

Implemented and checked; [full results and manifests](../research/graphics-switch-costs.md). Final source
`ea476b5e` passed `npm run check` (293 tests) and the corrected place bot. MSAA is reload-only after live
replacement failed browser validation. Every available place switch has repeated warmed timing evidence;
lab-only rows are unavailable on place. Some visual effects remain unverified after targeted stills, and
contention prevents isolated cost claims. OS clipboard permission was unavailable, so the selectable copy
fallback was exercised. Storage denial and mobile browsers were not tested. The ticked steps record work
performed with these explicit evidence limits, not universal validation. Owner review/playtest is next.
