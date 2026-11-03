# Home shore with graduated water

3 November 2026. Local work on `codex/shore-water`; no push. DESIGN.md: **Show, don't tell**, **Small and readable**.
This follows the existing shore-slice and Ultra Water research; no external network was used.

The shore-slice branch was fast-forwarded into this checkout. Its rock dispatch had an unmatched `else` after
the water-contact integration; that startup syntax error is repaired. Both smooth materials and the deformed
rocks now register as receivers. The new path omits the slice's static wet tint, adds moving swash lace, restores
caustics on matching bed heights, and uses the demo's shallow 1.35 contrast taper. Clear-water absorption and
the saturated sand/grass palette remain unchanged. Rock contact bounds come from their transformed vertices.

The slice's exact triangle mesh replaces the original collider inside its rectangle. Four unchanged heightfields
surround it. A cached triangle sampler serves local ground queries and the home shore provider; original authored
heights, lockstep data and player dive code are untouched. The mode switch restores the original collision too.

## Bank slit diagnosis

At the same Place camera `(972,22,55) → (1000,0,20)`, the blue strip disappears when a capture-only diagnostic
culls water backfaces, leaving the bank geometry unchanged. It is the underwater colour branch on locally
folded, horizontally displaced ocean triangles, not a terrain hole or lack of sand subdivision. The repair uses
that branch only for a backface viewed upward; a downward view gets top-side optics even if local winding flips.
It leaves genuine underwater viewing available. Choppy geometry can still fold; this is an optical-side repair.
The fixed Place capture shows continuous green water beside the unchanged coarse bank.

## Contact audit

547 sampled positions, including the previous worst point `(32.5,25)`: no missing mesh/collider intersections.
Maximum mesh/query discrepancy 0.000000553 m; maximum mesh/collider discrepancy 0.000001916 m. The initial
audit accidentally included scenery colliders and reported ray origins inside props as a 10 cm discrepancy;
the corrected audit temporarily masks those props, restores their masks, and tests the terrain alone.
The raw shore provider uses that same mesh sampler. The retained filtered 1 m bake is approximate: maximum
near-waterline discrepancy 0.05963 m over 156 samples. No claim of submillimetre baked wave-field precision.
Rock colliders retain their old simple shapes; only the sand's reported 12 cm contact gap is fixed.

## Evidence and acceptance

Final board paths, manifests, GPU spans and verification results are recorded below after the final captures.
Visual acceptance here is an agent's still/frame inspection, not the owner's playtest or real-time feel verdict.
