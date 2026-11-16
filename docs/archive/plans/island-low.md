# Low home island comparison

## Goal

Build the owner's opt-in `&island=low` comparison: a recognisable home island with mostly gentle beaches and shallow shelves, lower rolling ground, and the lighthouse and cave massif as deliberate high points. Preserve the default island exactly. Serves **Show, don't tell**, **Small and readable**, and **Determinism from day one**; the owner's detailed task is the implementation scope.

## Design

The terrain is static Local geometry, shared by mesh, colliders and placement rather than synchronized as new state. Keep the existing source chain: `shape.ts` → `stamps.ts` → `ground.ts` centimetres → `heights.ts` → terrain/physics/props/shore field. Put the low branch before POI stamps, not in a mesh-only displacement or water-only shelf. Keep all POI x/z positions, court levelling, faceted materials and colours.

The low natural shape should retain the old zero contour: compress positive natural heights into low rolling ground; compress negative heights into a shallow shelf and use the existing noisy home/mainland distance envelopes to return smoothly to the original seabed outside a roughly 35–45 m shelf. Blend back toward today's relief around the north-west rocky headland if needed, leaving most bearings gentle. Existing lighthouse pad (11 m) and cave cover stamps supply two real high regions. Do not lower `PAD_Y` or cave network nodes merely to flatten the island; the lighthouse content uses fixed `PAD_Y`, and cave floors/ceilings are authored geometry. Tune any excessive lighthouse shoulder through its flagged stamp, preserving the pad and stair foot.

`baseCm` is explicitly **not** a lockstep input (`ground.ts`, world rules README). However, `scatterProps` accepts/rejects palms using height and slope; `features/log-sources.ts` fills `land.layout.trees` from those positions, and gifts fill `perches`. The server always loads `src/world/home-land.json`. **A separate room alone is insufficient:** pin low comparison's `land.layout.trees/perches` to that canonical data using the existing `features/walk-layout.ts` onStart mechanism, which runs after gifts and sources but before ticks. Keep its existing layout label restricted to actual layouts. Do not alter rules, ops, state shapes, persistence, or any file in `src/sim`, `src/world`, `src/net`, or `server`.

Force the effective room to `island-low` in `src/proto/flags.ts` when the raw query has `island=low`, even if another room was supplied; use the same effective query to choose low terrain. Reserve `room=island-low` so it also selects the low shape, preventing an unflagged current-build visitor seeing another terrain in the comparison room. The owner URL explicitly includes `classic=1` to select home rather than round 4. No new action, input, presence field, or lockstep state.

For graduation, choose the final geometry and prop placement, regenerate canonical home-land if palm/perch cells change, remove the comparison pin/room seam, and make a deliberate `WORLD_NS` bump with a dated history entry if changing saved cell meaning or static lockstep layout. Those changes are out of this task.

## Steps

- [x] 1. In `src/proto/flags.ts`, add a single effective low-island flag/room policy. Add the optional natural-shape branch in `src/island/shape.ts` (a small separate pure helper is acceptable if it keeps the existing shape readable). Preserve the old arithmetic and early-return path verbatim when off. Ensure selection is fixed at module initialization and works before cave site stamps read `naturalHeight`. Verify default samples are identical and measure low shore profiles headlessly.
- [x] 2. Extend `src/features/walk-layout.ts` to pin the low variant's tree/perch input exactly like the existing layout experiment. Read nested feature instructions and lifecycle/room contracts first. Inspect home palm/log alignment: low scattering may move palms while canonical bundles stay fixed. Preserve the default home palm x/z candidates for the low variant and project them onto its actual heightfield if this occurs; use a canonical/default placement sampler rather than modifying lockstep cells. Implementation retains and reprojects all scenery, which also avoids new rock/track overlaps. Document any remaining scenery issue. The parent validates the existing broker `world-inputs` scenario on low and inspects its report.
- [x] 3. Add explicit low selection to `dev/level/check.ts` before dynamically loading `level.ts`/sites, such as `--island=low` initializing a minimal location query. Avoid a global process-env read in shipped code or an independently approximated height function. Run `npm run level-check -- --island=low --all` and the normal baseline. Report every newly unreachable target, and whether an existing allowlist hides a physical cave-mouth or POI collision limitation. Do not grow the allowlist to hide the change. Correct flagged terrain/stamps where feasible. A variant-specific stale baseline allowance may be reported without rewriting the default allowance policy.
- [x] 4. Check all four cave mouths: their trenches sample natural height but their mouth floor and geometry are fixed; cover stamps must remain after the low natural layer. Check lighthouse base/stairs, windmill stamped plain, court, spawn, paths and seed stand. Follow the common heightfield for corrections. Update `docs/game-design/island.md` with the opt-in, shape and isolation limitations and graduation requirement; update relevant `src/island/README.md` statements so HOME_KEEP's default invariant is explicitly qualified for this experiment.

## Parent validation checklist

The final shelf refinement follows the aerial comparison: replace the saturated flat -0.455 m shelf with a
gentle seaward fall and broad low sand bars, retaining the original shoreline factor, cliff exception and all
positive ground. Headless checks place 1 m depth at 48.0, 66.1, 45.6 and 46.8 m for bearings 20, 95, 170 and 250;
the 320-degree cliff stays at 0.5 m. The flagged level check still reports no new issues. Final imagery and GPU
spans are collected only after this source is frozen.

Implementation above is complete; browser validation and final assessment are recorded in the broker evidence and handoff, rather than mutating tracked documentation during captures.

- 5. Parent agent captures through the provided broker only. Name the question: does the coast read as beach and low rolling island, with cliffs concentrated around deliberate high regions, while landmarks remain grounded and reachable? Capture matched labelled today-left/low-right boards under `water=new`: whole aerial, sea-facing coast, avatar beach, interior hilltop looking out, lighthouse, cave mouth; also aerial under today's sea. Open every board. Walk the player with `--action`, save curves/consecutive video frames, and inspect falls, grounding and traversal. Iterate at most three rounds, without editing source during active captures. Run the full place bot as an unflagged regression and read its report even if failed; distinguish its round-4 coverage from home-island traversal.
- 6. Record the same five-bearing height/depth/slope table as shore-compare; record waterline navy-pixel comparison if its exact method is available, and GPU spans if there is a measurable cost change. List board paths in requested order, reports/manifests, defects fixed and unresolved limits. Run `npx prettier --write` on changed files, `npm run check`, and fix failures; no new unit tests for terrain tuning. Review/simplify the diff and make small imperative commits with the relevant DESIGN.md principle and inspected evidence path in each body. Do not push or ship.

## Risks and verification limits

- Do not assume room isolation fixes different server land inputs. Pin before tick 1 and check the existing world-inputs scenario.
- A raw `island=low` flag plus conflicting effective query can create mismatched rooms; centralize selection.
- `level-check` sees heightfield, prop colliders and reach targets, but not POI-built walls, cave collision masks or actual mouth holes. Its flood-fill result alone is not cave traversal evidence.
- Cave cover and the farm's fixed 3.2 m stamp may still create abrupt edges near the shoreline; inspect those edges and preserve required structure.
- `scatterProps` changes its random sequence after a rejected point: terrain changes can move more props than expected. Canonical log bundles must still make visual sense beside their palms.
- New geometry is baked once; no new draw pass, mesh topology or GPU algorithm is intended. The shelf may expose more underwater terrain tiles under `water=new`; compare renderer/GPU spans rather than claiming zero cost.
- No network research or `npm run inflight` was run: `dev/inflight.ts` unconditionally fetches and queries GitHub, forbidden by the task. The local Ultra Water height reference and existing island/shore research are the allowed research basis.
- Production URL is a future comparison link until this unpushed commit is deployed by the caller; do not call it live. Real-time feel and other devices remain unverified by stills.

## Open questions

None block the authorized comparison. The owner decides whether the low shape graduates after playing it.
