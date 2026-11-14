# Diagnose coplanar drawn surfaces

`npm run zfight` prints counts for three classes and the twenty largest **class a** findings.
`npm run zfight -- --all` also lists b/c; `--json` gives a ranked machine-readable report (add `--all` for other classes).
`--strict` exits 1 only for class-a findings with **new member pairs since the committed baseline**. Without it,
candidates never fail the command. Tool/adapter errors still fail. Level-check includes the counts, worst five
class-a findings, and `new since baseline: N` as a **report only**, including under `--json`.

The pure `src/geometry/zfight.ts` core compares outward-wound convex faces (normally actual buffer triangles)
from different pieces: normals dot at least `0.999999` (about 0.081 degrees), every vertex within **2 mm** of the
other plane, and at least **0.005 m²** overlapping exterior area. It clips polygons, subtracts closed convex
occluders and downward terrain prisms just outside both faces, aggregates triangles by pair/oriented plane,
then sorts by area. Opposite-facing joints and edge-only contact do not qualify. The coordinates are area-weighted
centroids, which can fall between fragments if an occluder cuts a hole. Separation is the worst vertex-plane distance.

## Classes and grouping

The 14 November classified snapshot has **a 205, b 61, c 545 grouped findings** and **0 new since baseline**.
Home's reported base/kerb contact is **a, rank 4**; the forge door step is **a, rank 28**. Raw oriented counts are
**a 2,974, b 172, c 2,422**; raw counts include buried portions omitted by the old 3,151-row report.
Of the 205 class-a groups, **82 have unresolved appearance without a measured appearance-field difference**.
They are conservative suspects, not 82 confirmed visual defects. Eight class-a findings are recurring track patterns.

- **a likely visible:** material recipe, authored/instance colour, sampled vertex colour, texture/UV, or cast/receive
  shadow flags differ. Missing appearance or unresolved shader/procedural-grain effects also stay here. Triangle
  vertex colours and UVs are compared as interpolated fields, including three non-collinear samples;
  crossing gradients cannot become a harmless joint merely by matching at the centroid.
- **b joints:** all captured appearance fields agree, including shadow flags. These count but do not print by default.
  Being a track-kit piece alone is never sufficient: a steel/wood contact stays a.
- **c hidden:** the overlap is proved buried by the drawn terrain or a closed convex connected solid at a point
  2.1 mm outside both faces. Open/non-convex components cannot establish that proof. Every edge must close, all
  vertices must lie inside the half-spaces, and the oriented areas must balance. Other components of the same draw
  can occlude a contact. Downward direction alone does not prove camera inaccessibility. A partly exposed contact
  with different/unknown appearance stays a; uncertain player-camera accessibility stays a.

Opposite orientations of an exact piece pair group first, using the maximum face area rather than adding both
sides. One anchor against repeated instances of a declared part family groups next. Track assemblies additionally
group recurring pairs of kit-part families into one pattern. Each finding keeps a count and every original member,
position and reason; different assemblies stay separate. Pattern areas sum the piece-pair areas; the representative
coordinate remains on the largest contact. Reports distinguish grouped counts from raw oriented rows. The new
hidden rows include buried portions previously omitted by the geometry-only scan, so totals need not equal 3,151.

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
`clear` removes it. `scan` accepts `{all:true}` to include joints/hidden and `{at:[x,y,z]}` to inspect an exact world
coordinate. The dock has a second button for all classes. Closing the panel clears the overlay. No tool chunk,
scan, overlay or frame callback runs when
off. Tints draw through occluders deliberately; source materials and geometry are never replaced. This tool is
absent from production builds. Unnamed pieces retain exact scene/instance/component ids, which can be selected
with three.js `getObjectById`; match their coordinates to the offline report for source placement ids.

Limitations: local exterior exposure does not establish a playable camera viewpoint, flicker or visual severity.
The banner names each group's nearest actionable member, rather than the largest member used for offline ranking.
Its labelled group area still sums the group. This distinction matters at Home: the final reviewed scan identifies
the kerb/platform instance pair at `(930.12, 18.33, 5.94)`; the earlier largest-member selection showed neighbours instead.
An absent pair is not a clean bill of health: use the all-classes button and compare the source census and coordinates.
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

## Baseline maintenance

`dev/level/zfight-baseline.json` is an explicit snapshot of **class a only**, not an exemption from classification.
It stores each group id and its exposed actionable member-pair keys, representative coordinates and area. A new
member inside an existing pattern still increments `new since baseline`; broad grouping cannot absorb new debt.
The saved census is a backlog for owner review, not approval of its appearance.

After a fix, rerun the detector: the pair disappears from class a and appears in `staleBaselinePairs`. Remove that
pair from the corresponding baseline entry, deleting the entry if no pairs remain. Review the diff; do not remove
unrelated entries or refresh the file to hide a regression. `npm run zfight -- --write-baseline` explicitly rewrites
the snapshot and is for an intentional reviewed reset, including the initial baseline requested for this task.
No ordinary scan writes it. `--strict` already fails on new class-a member pairs only; level-check can later adopt
that same predicate as a failing assertion after the owner enables it. It presently reports, and fixes do not fail.
Keys identify piece pairs, not an area or plane budget: enlarging an existing pair's overlap does not count as a new
entry. The ranked area diff still needs review.

`node dev/level/zfight-captures.ts <classified-report.json>` runs the existing broker at each top-ten coordinate,
using the normal in-game scan. Stills contain tints; middle motion-sheet frames clear them, then rescan at 1.8 seconds. Inspect every PNG and
write observations in the census. A successful capture is not a visual verdict, and a still cannot show flicker.
Home uses the built `q6-done` stage, a 10-second warm-up and no player warp; an opening-stage shot has no built
platform to diagnose. The other sites use the same stage with a 3-second warm-up and the existing player pose helper.
