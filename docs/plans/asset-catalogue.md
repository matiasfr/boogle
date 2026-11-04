# Browsable asset catalogue

## Goal and authority

Extend the shipped `/character/` stage into a compact visual catalogue of the assets Boogle actually uses: searchable thumbnail cards, type filters, direct links, health at a glance and isolated previews. This serves **Understandable at a glance**, **Show, don't tell**, **Small and readable**, and **Code first, images by approval**.

The owner's 4 November 2026 task explicitly requests implementation, verification and commits on this worktree's branch, with no shipping. That is the approval to execute this plan; the feature skill's normal intermediate approval pause is superseded for this scope. Do not push, ship, use external network, or run `inflight` (it needs the forbidden network). Existing stage architecture and research authority are in [asset-stage.md](asset-stage.md); this extends that inspector, not the art pipeline or gameplay.

## Design

All catalogue filters, selection, thumbnail cache, camera and inspector controls are **Local**, owned by the stage document, with no sync API. Native links/buttons, labelled search and select controls own keyboard/touch interaction; no game action, pad slot, input registry or guide row is added. Preserve existing asset/node/clip/view links and the stage's exact-time animation behavior.

### Membership and status

Keep `assets/built/manifest.json` plus `character/descriptors.ts` as built membership/context. Extend catalogue entries with type, source kind (`built` or `code`), source path, nullable triangle/clip facts and `reviewStatus: 'unreviewed'` as a future inbox seam. Do not implement review controls, persistence or automation. Existing manifest byte/texture budgets, source/output hashes, and missing-clip checks remain authoritative; no invented triangle budget or stale status for code factories. Unknown counts are labelled pending until measured from actual geometry.

Enumerate individual place-kit/scaffold-kit parts from their actual GLB node metadata rather than a handwritten duplicate list; each card retains the underlying asset and node selection. Keep whole-kit cards where useful. Generate card names from descriptor context or node names. The animation-only hero-clips entry remains browsable and uses its actual skeleton preview.

Code entries come from explicit side-effect-free descriptors with factory imports loaded only when needed. A descriptor supplies id, label, category, source path, review status and a factory producing an owned group plus disposal. Use a discriminated catalogue type so built-only facts are not faked for generated objects. Clone shared cached materials before preview modifications; never dispose shared game templates. Code previews have zero authored clips unless a real shared clip exists; procedural movement is not counted as an authored clip.

### Audited coverage and extraction seams

Implement broad coverage through these bounded shared seams. Extraction must move the actual implementation and update the game caller; never copy geometry into a second art source.

| Family | Source and practical coverage | Seam |
| --- | --- | --- |
| Built characters and animation | Buddy and hero-clips | Existing loader/Buddy adapter, unchanged |
| Built kit | Every mesh-bearing node in place-kit and scaffold-kit, plus whole kits | Read GLB metadata or loaded scene; shared authored source |
| Held props | Seed bag and frisbee | `src/player/item-models.ts` is already side-effect-free; export its builder ids for membership, use `itemModel` |
| Nature | Palm, broadleaf tree and rock | Move `addPart`/`mergeParts` to `src/render/geometry-parts.ts`; move the existing `addPalm`, `addBroadleaf`, `addRock` construction into `src/render/prop-models.ts`; runtime `props.ts` keeps spawning, placement, water registration and fade. Factories take explicit representative placement data, without generating an island |
| Buildings | House, tower and block constructions, including building/scaffold choices where practical | Move `sites.ts` lines 17–324 pure plan construction into `src/proto/place/building-plans.ts`; replace `H(x,z)` with explicit height input. Keep current `sites.ts` exports as wrappers injecting `H`, preserving all runtime constants/order. Stage dynamically imports this pure core, builds meshes from its actual Box records. Prefer existing building specs shared with game callers; label a generic factory example honestly if exact town room/interior remains coupled |
| POI | Windmill body and rotor, optionally whole windmill assembly | Move the existing dimensions, `millBody` and `rotorParts` from `src/pois/windmills/index.ts` lines 17–137 into `model.ts`, depending only on geometry helpers/three. Leave site placement, physics, clock and callbacks in index. Reuse this core for game and stage |
| Additional cheap pure families | Hut blueprint, soapbox/cart, capsule/hat or ball mesh where already isolated or a small clear extraction | Include only after inspecting actual dependencies; keep scope bounded and list actual result |

Do not import `src/features/*`, entity index modules, `src/proto/place/index.ts`, `sites.ts`, `rooms.ts`, `house.ts`, `look-kit.ts`, or POI index modules into the stage. The audit found they reach scene, physics, player state, water, frame callbacks or gameplay. `house.ts` is furniture/lifecycle, whereas `sites.ts` contains the reusable building plans. `look-kit.ts` depends on scene/frame/land; use its existing GLB source parts rather than importing it.

Explicitly document remaining exclusions with reasons in the as-built coverage section: complete town interiors/furniture and exact room cutaways remain coupled to room/growth/interaction; full lighthouse and cave environments remain coupled to terrain, collision, ambient and light services unless a small pure seam proves available; folk/critter behavior, particles, water/sky and live effects require clocks/pools/world context; guest models require external runtime data and are outside this request. These are exclusions, not claims that all game objects are covered. Add further safe existing models if inexpensive, without turning this into a runtime refactor.

### Lightweight coverage check

Add `dev/assets/catalogue-check.ts` (or a small check called by assets) using existing source metadata and descriptor ids. Check every manifest asset has descriptor context, every exported item builder id and supported prop-model key has a descriptor, descriptor source paths exist, and GLB kit nodes generate their cards. Narrow checks over explicit factory registries are cheap and low-noise. Do not use a regex demanding a descriptor for every `new Mesh` or every feature file; that confuses effects/helpers with assets. Document exactly what the check catches and that it cannot discover arbitrary embedded geometry. Prefer exporting keys from the real model registries to a second list. Keep source import traversal checks scoped to stage reachability, rejecting behavior entrypoints without banning harmless shared render cores.

### Compact browsing and thumbnails

Replace/complement the asset select with a grid managed by `character/browser.ts`. Cards show thumbnail, name, source badge, triangles, clip count and concise warning indicators with accessible detail. Search matches name/id/source; type filters reflect actual entries (characters, props, buildings, nature, kit, POIs; effects only if covered). Empty results remain clear and the selected stage asset stays loaded. Native buttons/anchors support Enter/Space as appropriate, visible focus, generous touch targets and a real per-asset href; selecting keeps the page in place and updates the URL. Back/forward should restore selection if supported without widening state plumbing.

Keep the viewport large: bounded desktop catalogue pane and collapsed inspector `details` sections; phone layout uses a compact bounded browsing drawer/panel with a clearly available viewport and selection summary. Playback can remain a compact toolbar. Avoid a long permanently expanded stack of controls. Preserve the selectable Copy view URL fallback.

Use lazy browser-rendered thumbnails, cached in memory/session by asset/node/source fingerprint. This keeps committed binaries and first-load downloads light and avoids a separate capture pipeline. `IntersectionObserver` schedules visible cards only; deduplicate queued work and bound cache size. Use the current stage renderer with a small offscreen target, explicit temporary scene/camera and tone output, preserving renderer target/clear state; no second renderer or requestAnimationFrame loop. `src/player/item-icons.ts` is the existing HDR/readback pattern but imports the game renderer, so reuse its technique through an explicit renderer helper rather than importing that module. Serialize thumbnail work with stage drawing; stale loads cannot replace newer selection. Dispose temporary preview groups/targets and revoke object URLs when evicted. Errors show a labelled placeholder and do not block selecting the asset.

## Steps

- [x] 1. Audit and add pure preview seams in `src/render/geometry-parts.ts`, `src/render/prop-models.ts`, `src/proto/place/building-plans.ts`, `src/pois/windmills/model.ts`, with narrow runtime caller edits and item builder metadata. Read the nested render/entities/features instructions and state-consumer rule wherever affected. Preserve geometry/material constants and game behavior. Format, lint/typecheck, then keep `npm run check` green.
- [x] 2. Extend `character/descriptors.ts`, `catalogue.ts`, `dev/assets/manifest.ts`/`vite-plugin.ts` and virtual declarations as needed. Add isolated code descriptor/factory modules and the narrow catalogue check. Generate built kit part entries from actual GLB nodes. Exercise the check and report counts and excluded families. No new unit tests or scenarios: test diet applies.
- [x] 3. Add `character/browser.ts` and `thumbnails.ts`; update `main.ts`, `index.html`, and `character.css` for grid, search/type filters, source/health facts, direct links and collapsed inspector. Adapt `choose`/generic preview to code groups while preserving existing built/Buddy links. Expose stable `data-asset` selectors and `assetStage.select(id)` plus catalogue metadata for broker evaluation. Verify loaded geometry statistics, empty-search behavior, rapid selection disposal and camera fit.
- [x] 4. Update `docs/game-design/asset-stage.md` with actual controls, coverage table, exclusions, thumbnail/cache policy, health scopes and review placeholder. Record the next step here: **one command for a new asset that builds, checks budgets, captures standard poses and hands the owner a link**. Do not implement that command or a review inbox now.
- [x] 5. Parent reviews/simplifies the full diff and runs broker verification below, with no edits while a run is active. Fix identified issues, rerun affected evidence and checks for the final tree, `npx prettier --write` changed files, then `npm run check`. Commit in small imperative commits with the served DESIGN principle in each body; do not push/ship. Mark plan checkboxes accurately.

## Verification and ownership

The implementer owns source, catalogue, UI, coverage check and as-built docs. Parent owns broker eval files, captures, final checks/review and commits. Both work in this checkout and preserve each other's changes.

Visual question: **Can the owner recognize and select varied real assets quickly while the viewport stays useful on desktop and phone?** At 1440×900 and phone width, browse the grid; filter nature/buildings/kit, search a specific part and a no-results string, open Buddy, a tree, a house, a windmill and multiple kit parts. Capture selected models plus the filtered grid, inspect actual PNGs, and verify health/status counts agree with geometry/build facts. Exercise keyboard activation, direct-link reload and native touch-sized controls; physical touch and real-time smoothness remain unverified.

Use only `node .look/see-client.ts` through the started broker. As documented by asset-stage's existing plan, the harness is game-root based: supported eval creates the same-origin full-viewport `/character/` iframe, hides outer UI, and asserts the iframe's own WebGPU readiness/completed frames. This capture workaround starts an enclosing game but must not compromise stage isolation. Inspect PNGs using `view_image`; no successful command substitutes for visual review. Up to three visual rounds. Since shared factory extraction touches game callers, run the existing full place bot, read its report even on failure, and open an affected nature/building/POI checkpoint when available. No new scenario is justified by Local catalogue changes. No `check:full` trigger is expected.

## Risks and open questions

Implementation required one additional pure seam: `src/proto/net/box-plan.ts` now owns box records/transforms with explicit height, while `boxes.ts` retains the terrain-injecting runtime wrapper. Without it, building-plan previews would import the game scene. Final coverage is 48 cards (4 built roots, 32 generated kit parts, 12 code examples). House/tower/block entries are labelled factory examples rather than exact named town instances; as-built coverage and exclusions live in `docs/game-design/asset-stage.md`.

No owner choice blocks this requested work. Building plans have render-only trig, not lockstep math; avoid touching `src/sim`, world/net/server. Pure factories must not transitively import game startup. Maintain existing preview generation-token protection and explicit disposal, especially when rendering thumbnails concurrently with selection. No fake budgets, animation clips, review approvals or provenance. Browser caches are disposable optimization, not another catalogue/art source. Current source fingerprints must invalidate stale thumbnails. A catalogue is useful only if the coverage/exclusions are honest; report partial families rather than claiming whole-game completeness.

## Verification outcome

The catalogue has 48 cards: four built roots, 32 generated kit parts and twelve code previews. Formatting and `npm run check` passed (297 tests, registry, five levels, asset coverage/freshness and production build). A temporary in-memory extra item key was correctly rejected by the coverage guard. Static import traversal and the browser's resource list found no feature, game scene, physics or room startup reachable from the stage.

Broker browsing opened all twelve code previews plus Buddy, the animation library, log, rail and animated plank. Filters, empty search retaining selection, native card focus/click, finite model bounds, generated thumbnails and copied-link reload passed. Opened desktop house, nature and plank stills and a 390×844 windmill still: models and source/geometry facts were readable, with a 1080×900 desktop viewport and 55% phone viewport. Review corrected cropped tall thumbnails and added kit names to distinguish identically named parts. Final manifests and inspected artifacts accompany the launcher's handoff.

The full place bot reached every expected beat, entered the house/shop/museum, and saved 78 checkpoints with no graphics/page errors. Its solo run did not mark “did something together” and recorded about seven minutes stationary in warped game time. The enclosing game is only a broker capture workaround; the stage's own completed WebGPU frames were checked. Physical touch devices, real-time smoothness and subjective feel remain unverified. No review inbox, pipeline automation, push or ship was added.
