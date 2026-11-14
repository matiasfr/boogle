# Diagnose coplanar drawn surfaces

`npm run zfight` prints the ten largest candidates. `npm run zfight -- --all` prints every pair;
`npm run zfight -- --json` gives the ranked machine-readable report. `--strict` exits 1 when candidates exist;
without it, candidates do not fail the command. Tool/adapter errors still fail. `npm run level-check` includes
the count and worst five as a **report only**, including under `--json`.

The pure `src/geometry/zfight.ts` core compares outward-wound convex faces (normally actual buffer triangles)
from different pieces: normals dot at least `0.999999` (about 0.081 degrees), every vertex within **2 mm** of the
other plane, and at least **0.005 m²** overlapping exterior area. It clips polygons, subtracts closed convex
occluders and downward terrain prisms just outside both faces, aggregates triangles by pair/oriented plane,
then sorts by area. Opposite-facing joints and edge-only contact do not qualify. The coordinates are area-weighted
centroids, which can fall between fragments if an occluder cuts a hole. Separation is the worst vertex-plane distance.

These thresholds distinguish the reported exact overlaps (Home has about 0.01 mm of transformed-buffer noise)
from deliberate centimetre-scale layering already used by the yard's timbers (`yard-track.ts`). The area threshold
still catches Home's narrow 0.01 m² deck seams. They are diagnostic tolerances, not a depth-buffer precision guarantee
at every distance. The [14 November census](../../research/zfighting-2026-11-14.md) records the tested source and limits.

The offline adapter executes compiled placements and existing builders, the workshop's actual steps, Home's
station and yard collectors, the real baked track-kit GLB and default terrain mesh. It shares the level tools'
bounded source adapters; unsupported builder/import changes throw instead of silently returning a clean report.
Some legacy pads/walkways still use the existing `timberDecks` box adapter. The output names excluded content.
All completed assemblies are sampled, rather than asserting which progression state a person is currently seeing.

For a live spot, run the **Vite dev server**, open `?dev=1`, then **Dev → Z-fighting → Scan at crosshair**.
It samples opaque CPU triangles within 5 m of the first opaque hit on a 40 m centre ray (camera if none),
names scene meshes/instances and connected components, and tints the nearest three pairs. The screenshot banner
contains both ids, area, separation and coordinates. Use `boogle.dev.run('zfight', 'scan')` for the same snapshot;
`clear` removes it. Closing the panel clears the overlay. No tool chunk, scan, overlay or frame callback runs when
off. Tints draw through occluders deliberately; source materials and geometry are never replaced. This tool is
absent from production builds. Unnamed pieces retain exact scene/instance/component ids, which can be selected
with three.js `getObjectById`; match their coordinates to the offline report for source placement ids.

Limitations: local exterior exposure does not establish a playable camera viewpoint, flicker or visual severity.
Identical material/UV joins can be harmless. Open/non-convex meshes do not act
as solid occluders, so hidden contacts can remain. The live component splitter can join two authored pieces that
share a whole edge and miss their conflict; clipped neighbourhoods can also open an occluder. Skins, transparent
materials, shader displacement and animation are excluded. The static scan cannot replace a still at the spot.

## Placing pieces

Prefer **one owner of a shared exterior face**: stop the adjoining piece at it, remove its covered face, or inset
its side. Home's full platform foundation and the old kerb shared the same side plane; the forge's upper door
step shared the slab's top. Neither needs a rendering workaround. Insetting one side fixes side faces; changing
height alone does not fix coincident vertical sides.

For intentional visible layers, use **at least 1 cm of real separation** as the working placement convention,
following the existing yard-timber offset; inspect it from the near and far intended views. Do not use a sub-2-mm
nudge as the fix. Snap endpoints without overlapping area where possible. Do not use `polygonOffset` to hide
structural intersections: the rendering contract currently has no general structural exception. An intentional
decal must follow an explicitly documented material contract. This task changes no geometry or material settings.

To adopt a failing check later, review the ranked candidates first. Keep a small reasoned baseline keyed by stable
piece pair, oriented plane and rounded location, with maximum allowed area/separation; fail only on new or grown
contacts, and fail stale entries so fixes retire debt. Do not bless the whole current count or auto-update it.
The present `--strict` fails on every candidate; **no allowlist is silently active**.
