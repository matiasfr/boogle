# Shore seam diagnosis

3 November 2026, `codex/water-shore-seams`. DESIGN.md: **Show, don't tell**; **Small and readable**.
The required `codex/shore-water` branch was fast-forwarded first, to `cc9a85b6`. Baselines below include its
partial `V.y < 0` underside repair. This supersedes the earlier all-angle implication in
[shore-water validation](shore-water-validation.md); that report itself only established one angle.

## Causes and reference audit

1. **Wrong-side water faces:** Ultra Water's `OceanSurface.js:422` camera-side discard was absent. The earlier
   `!frontFacing && V.y < 0` test only changed shading; it still drew folds and was not a camera-volume test.
   Restore the reference's ±0.5 m side guard, driven by the already-computed GPU lens camera depth. Far above water
   the sleeping lens is explicitly ignored. No extra compute dispatch, CPU readback or change to the MSAA pass.
   The emitted WGSL uses `@builtin(front_facing) isFront` and the expected two comparisons before `discard`.
   The broker verified stored 4× MSAA and six GPU bed samples matching the CPU sampler (roundoff below 1e-14).
2. **Pale home shards:** they remain when the ocean mesh is hidden and disappear when receiver roughness alone
   is raised. They are glossy terrain facets, not missing ocean polygons, water foam, or the water's thin-film
   blend. The receiver had given flat dry-terrain normals a roughness of .26. Ultra Water's terrain uses smooth,
   rippled sand normals and .32 wet roughness. The patch keeps dry shading, gives the wet film continuous vertex
   normals, uses .32, and limits the gloss transition to ±.05 m as in the reference.
3. **Place's displaced bank:** its origin is correct (bounds x 740…1520, z −280…260), its 1024 m core has 2 m
   texels, and every audited near-bank point is valid. The problem is bed reconstruction: bilinear grid sampling,
   then texel-centre sampling/filtering, rounds the steep 2 m triangles into a different bed. The wave clamp and
   damping see this false bank. Keep the existing atlas allocation, store bed values at aligned terrain vertices,
   and reconstruct the same anti-diagonal triangles on GPU and CPU. Distance, travel and shelter remain filtered.
   No terrain mesh, collision, level layout or gameplay changes.

The reference is read-only at `_refs/ultra-water` beside these worktrees. Its shared `.85` shore pinch budget,
FFT depth damping, cell-size band limiting and displaced-position bed clamp were already ported. The budget
bounds the two trains' phase compression, **not** spatial changes in amplitude/direction or their sum with FFT.
A CPU mirror of the actual polar triangles at `(972,25,55)`, 61 times over 12 seconds, found up to 979 XZ folds;
FFT alone had zero, shore alone 970, and removing the vertical clamp still gave 979. Many are occluded by land;
these are geometry counts, not visible-defect counts. Correcting the bed does not eliminate every mathematical
fold. The source also explicitly describes dropping folded backfaces. This patch restores that missing contract;
it does not claim a globally invertible ocean mesh. The numerical mirror is a diagnostic, not a new unit test.
Damping is evaluated at the same undisplaced point for FFT and shore waves; the clamp samples the displaced
point, just as the reference does. Changing this order was not justified by the evidence.

Refraction was isolated by zeroing only its UV offset, capturing, then restoring it. The coarse bank contour
and small blue edge pixels persisted. The existing retreat/keep code already samples colour and thickness at
the same final UV; it does not account for the pale terrain shards. No refraction reduction is shipped.

## Measurements and evidence

Bed audit: 4,864 positions spaced .5 m across x 980…1030, z −30…60, restricted to actual mesh heights ±2 m.
Maximum absolute error **4.624503 → .001645 m**; p95 **1.547168 → .000743 m**; RMS **.667946 → .000361 m**;
invalid samples **0 → 0**. The remaining error is half-float quantization. Home's separate filtered field is unchanged.

The `.look/shore-pixels.ts` Node helper decodes ffmpeg PNGs and records per-frame navy and pale pixel counts.
Fixed ROIs exclude characters, trees and the pillar: home `(300,410,240,125)`, Place `(600,440,115,250)` at
1210×702. Navy means B>1.18R, B>1.06G, R<90, G<115, B<155; pale means R/G>160, B>150, channel spread<35.
These count colours, including legitimate highlights; they are not defect classifiers or visual acceptance scores.
The videos are sampled at 5 fps for over 18 seconds, more than two periods of the 30 m / 4.38 s shore train.

Initial repaired capture: home pale mean/max **380.77/562 → 18.23/90**; navy **0/0 → 0/0**. Place pale
**94.57/1417 → 35.20/500**; navy **.96/24 → 1.86/46**. The small Place navy count did not improve: do not present
it as proof that every blue pixel or every possible view is fixed. Large navy slits were already suppressed at
these high cameras by the prerequisite branch. Final multi-view and plunge evidence is recorded below after checks.

Baseline manifests:
- [Home high](../../.look/evidence/1793738150041-55846/evidence.json), [Place high](../../.look/evidence/1793738185653-56141/evidence.json).
- [Home four-view sweep](../../.look/evidence/1793738315353-57065/evidence.json), [Place four-view sweep](../../.look/evidence/1793738416930-58349/evidence.json).
- [Ocean hidden](../../.look/evidence/1793738451151-58590/evidence.json), [receiver gloss disabled](../../.look/evidence/1793738537199-59570/evidence.json).
- [No-refraction diagnostic](../../.look/evidence/1793738973877-64310/evidence.json), [GPU/4× MSAA audit](../../.look/evidence/1793739041251-64889/evidence.json).
- [Repaired home high](../../.look/evidence/1793738736106-62082/evidence.json), [repaired Place high](../../.look/evidence/1793738815368-62785/evidence.json).

Opened the originals and sweep sheets, the worst baseline frames, and both diagnostic stills. The pale blocky
row becomes a much thinner continuous wet sheen. Place still exposes its coarse, jagged terrain triangles and
steep dark submerged bank; this is not a smooth beach redesign. Real-time feel, mobile and exhaustive all-angle
acceptance remain unverified. All work stays behind `water=new`. No external network was used.
