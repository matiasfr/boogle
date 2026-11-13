# Prefab step 7: placed-collider review correction

Follow-up branch: `codex/prefab-data-step-7-2`. Rebased the existing job cleanly onto `f00736aec` (seat step 2,
v41) before editing. Implementation: `347e99cafad79efb9ce778b9fbcfa9b664cc33b8`; the following commit is documentation
only. No push or ship. No runtime, authored content, compiled JSON, schema, debt list or golden fixture changed
in this correction. The original step-7 work is retained.

## Finding and fix

The independent review's P2 was valid: `checkLeg2()` sampled Bell's prefab definition even when `bell.rock` was
absent or displaced in the compiled level. Before production edits, the baseline passed and both remove/move
mutation assertions failed: [red log](../../.look/step7-review-red.log).

- `dev/level/prefab-colliders.ts:62` resolves only existing compiled placements, composing placement TRS with
  collider-local offsets/rotations, dimensions and vertices. It produces world triangles for vertical support
  queries and transformed box volumes for clearance tests. It uses three.js math, with no renderer or physics body.
- `dev/level/route-leg2.ts:165` takes rim triangles from those placed colliders. Missing instances supply no
  triangles. Coverage checks support at the drawn rock height (within 0.1 m); a shifted top cannot count as its
  own nearest valid support. Missing, translated, raised, lowered, rotated and scaled rocks produce a failed
  assertion naming the **widest unsolid rim**.
- The other Bell, West and High Gorge checks no longer infer unit-box geometry from placement scale and a
  nonempty collider list. Their grids and reserve tests use actual collider extents, offsets, rotations and world
  transforms. Pad bounds include their placed scale; label clearance uses the placed attachment bounds.
- `dev/level/mover.ts` isolates the unchanged controller limits from the full island checker. `rules.ts` preserves
  its existing `MOVER` export. This keeps the regression test's dependency walk explicit without adding any
  `UNFOLLOWED` exemption or loading unrelated POI discovery.

The greybox runtime mounts every placement directly under an identity area owner, so the resolver rejects
parented placements rather than inventing a hierarchy that runtime would ignore. The physical query supports the
box/trimesh shapes these levels actually instantiate; other shapes fail explicitly. These are checker limits,
not changes to prefab schema or runtime.

## Mutation and golden proof

`test/prefab-leg2-level.test.ts:61` runs the real checker against in-memory mutations of the compiled JSON, leaving
production files untouched. Ten tests cover the unchanged report, six rim mutations, West/Gorge collider-width
mutation, pad scale, and composition of collider offsets/rotation/extents with placement TRS (including explicit
rejection of unsupported parents).

The unmodified report still matches `prefab-leg2-report.json` byte for byte: zero failures, 0.0 m unsolid rim.
All twelve original collider/placement/count/report fixtures remain byte-identical to the earlier job, including
Gorge and workshop. [Fresh fixture hashes](../../.look/step7-review-golden-proof.json).
Content and debt remain identical to original tip `819f809c`: collider debt stays 104 files / 500 units and seat
debt stays 13 / 20. All eight prefab records and four compiled levels remain fresh (90,982 bytes).

## Checks after the last code edit

- Prefab suite: **147 passing**; with the eleven test-selection guard tests, **158 passing**.
  [Log](../../.look/step7-review-prefabs.log).
- `npm run check`: **1,807 passing**, zero failures, one existing fleet-wait TODO; lint, types, registry, thirteen
  level reports, assets, prefab freshness and build pass. [Log](../../.look/step7-review-check.log).
- `node dev/ship-check.ts origin/main HEAD`: **362 passing assertions**, 42 affected test files, 25 lint files.
  [Log](../../.look/step7-review-ship-check.log).
- Explicit `npm run registry` and `npm run level-check`: pass; **13 reports**.
  [Registry](../../.look/step7-review-registry.log), [levels](../../.look/step7-review-level-check.log).
- `npm run review-stamp -- . --no-fetch --base origin/main`: **3cd906ad5e43**, eleven golden/test files marked
  `review`. [Stamp](../../.look/step7-review-stamp.log). Independent re-review is not claimed.
- Prettier ran on all five changed code/test files. The follow-up makes no changes under sim/world/net/server,
  seats, Home station or `WORLD_NS` relative to its v41 main base.

## Fresh browser observations

After the rebase and correction, used the restarted broker, `gorge-reached`, the existing `stack-at.ts` and
`stack-draws.ts`, and the prior Bell/West cameras. Both manifests fingerprint clean implementation `347e99ca`
with no tree changes during either run:

- Bell [manifest](../../.look/evidence/1794610602308-74478/evidence.json) and
  [opened still](../../.look/evidence/1794610602308-74478/step7-review-bell-still.png).
- West [manifest](../../.look/evidence/1794610607097-74510/evidence.json) and
  [opened still](../../.look/evidence/1794610607097-74510/step7-review-west-still.png).

Execution: both passed WebGPU, advancing-frame and console/graphics-error checks. Observation: Bell's split rock,
decks, ramp, pads and boards and West's platforms, stair, parapets and board appear intact. Draws remain 304/674,
with 12/6 added by named route meshes; static box counts remain 75/28. These stills verify presentation continuity,
not the checker mutation behavior (the tests above prove that). No capture failures or played bot route.
Motion sheets were not opened; real-time feel, quiet performance and device behavior remain unverified.
Not tested on a device. No external network use or departures in this follow-up.
