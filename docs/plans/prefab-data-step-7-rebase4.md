# Step 7: preserve step 8 across the rebase

Initially rebased on local `origin/main` **7c39307b7**, which includes moving-seat prefab step 8 (#1750), Boogler
step 5 and the latest owner call. Refreshed without conflicts onto **3c76e55b1** after its server-address fix landed
during captures. New branch: **codex/prefab-data-step-7-4**. Replayed implementation: **58b2636e4** (previously acb1c285e).
No fetch, push or ship. DESIGN.md: **Clear authority**, **Determinism from day one**.

## Conflicts and retained behavior

Three files conflicted while replaying the earlier branch:

- `src/prefab/instantiate.ts`: retained main's moving-platform parent/root/frame option and all of its seat
  behavior, alongside step 7's label text option and compound batching.
- `src/prefab/types.ts`: retained seat `idSuffix`, `group` and `anchorView`, alongside label `posts`.
- `content/built/prefabs.json`: regenerated with the compiler from both sets of records, rather than selecting
  either side's generated JSON. The later authored-operands commits replayed without additional conflicts.

Main's `track-machine.ts`, `train-view.ts`, `car-kit.ts`, seat service, Boogler files and both seat fixture files
have **no diff** from origin/main. No edits under sim/world/net/server, Home station or WORLD_NS.
Main's moving-parent transforms, availability, pitched visual frame, contention alternatives and disposal
behavior survive. Independent read-only review found no remaining issues.

## Step 8 portability conversion

The machine chair now authors `yawDegrees: 180`; the bench authors `yawDegrees: -side * 90`, inside the
record's `layout: { kind: 'seat-attachments', attach: ... }`. Other authored attachment values are unchanged.
`resolve-prefab.ts` derives radians in memory, dividing degrees by 180 before multiplying by Math.PI. For these
cardinal headings it preserves main's exact PI/PI/2 values, without any native transcendental call.
`loadPrefabArtifact` validates the JSON, resolves the attachment recipes, then applies the existing complete
record validator before allocation. Invalid/coercible degrees and duplicate radian/degree authority reject.

The compiler validates resolved records and their serialized round-trip, but serializes the **original authored
records**. Runtime instantiation and generated record coverage use the shared loader. This extends the existing
choice-A format to main's new seat records; it does not round or quantize values. The full-precision authored
round-trip and collider orthogonality/compensation tests remain intact. The long-number guard covers every
committed artifact. Final output: **10 records, four levels, 146,518 canonical bytes**.

Both resolved railway records deep-equal their numeric records on main, including every seat/group/anchor field:
[equivalence proof](../../.look/rebase4/main-equivalence.log). Both fixture files remain byte-identical to main:

| Fixture | SHA-256 |
| --- | --- |
| 31 seat ids | `ec45c81b12064e875435669b60919e0bb7b74d4b5833b2406ace337c232931fa` |
| Moving-seat poses | `28f83c64a7452e1a38e8e4fe74795e29b14861b34da57f2710919347a6227a36` |

The ID assertion stays byte-exact. Pose comparisons now use the established absolute `1e-9` / relative `1e-12`
tolerance, with exact array order, keys, strings and flags. Neither fixture was regenerated. Generated seat
clearance tests inspect resolved records, and the workshop harness receives the shared loader. The golden's
single fixture read is reused for both branches, retaining main's test-selector exception count of two.

Debt against main: colliders **105 files / 502 units → 104 / 500**; seats **11 / 15 → 11 / 15**.
No debt or exception budget grows.

## Final checks

After the last implementation edit and Prettier (canonical generated JSON restored through the compiler):

- Prefabs **195 passing** normally; **206** including the eleven unit-selection guards.
  [Normal log](../../.look/rebase4/prefabs-latest-main.log).
- Every prefab test with native sin/cos/atan2/hypot results shifted by one ULP, retaining exact zero/one
  identities: **195 passing**. [Runtime perturbation log](../../.look/rebase4/ulp-prefabs-latest-main.log).
- Actual compiler `--check` with the prior stronger `+1e-15` perturbation loaded **before** authoring:
  fresh, identical bytes. [Perturbed build](../../.look/rebase4/perturbed-build-latest-main.log),
  [normal freshness](../../.look/rebase4/fresh-latest-main.log). Linux itself was not run. Artifact independence is by
  construction: only authored operands serialize; native-derived runtime results never do.
- `npm run check`: **1,860 passing**, zero failures, one existing fleet-wait TODO; lint, types, registry,
  thirteen level reports, assets, prefab freshness and build pass. [Log](../../.look/rebase4/check-latest-main.log).
- `npm --prefix server test`: **344 passing** after the server-only rebase (296 beforehand).
  [Log](../../.look/rebase4/server-latest-main.log).
- `node dev/ship-check.ts origin/main HEAD`: **410 passing**, 44 affected test files, 37 lint files.
  [Log](../../.look/rebase4/ship-check-latest-main.log).
- Explicit [registry](../../.look/rebase4/registry-latest-main.log) and
  [level-check](../../.look/rebase4/level-check-latest-main.log) pass; **13 reports**.
- Review stamp **6df79dd94f4b**, 17 reviewed test/fixture files since origin/main.
  [Stamp](../../.look/rebase4/stamp-latest-main.log). Independent review here covered the merge and conversion; no new external
  Astra approval is claimed.

An initial global `+1e-15` runtime experiment changed exact sin(0)/cos(0) identities, introducing a rotation field
and breaking a large-scale numerical-boundary witness. No production validator or golden structure check was
weakened. Runtime variation instead uses adjacent floating results while preserving those exact identities;
the stronger compiler-only stress check remains. An accidental extra fixture-read site was fixed by reusing its
result, without increasing the selector exception.

## Images opened on the first main base

The first seven captures use the restarted broker and fingerprint clean implementation **acb1c285e**, tree
`bafe218ae0c215f699f1f074f1d48f076b4fd1d9`; every manifest says no changes during the run. The separately
identified trusted harness is d87c05719. No source changed while any run was pending or active.

- Bell [manifest](../../.look/evidence/1794617130499-61491/evidence.json),
  [opened PNG](../../.look/evidence/1794617130499-61491/prefab7-4-bell-still.png): the split rock, decks, ramp,
  pad outlines and signs look aligned. **304 draws / 292 without route meshes (+12)**, 75 boxes, 23 bodies
  including both rim trimeshes. Uses `gorge-reached`, `stack-at.ts`, `stack-draws.ts`.
- West [manifest](../../.look/evidence/1794617130488-61493/evidence.json),
  [opened PNG](../../.look/evidence/1794617130488-61493/prefab7-4-west-still.png): platforms, stair, parapets and
  board look intact against the cliff. **674 draws / 668 without route meshes (+6)**, 28 boxes, eight bodies.
  Uses the same seed and existing evals. Counts match the preceding implementation.
- Stool [corrected manifest](../../.look/evidence/1794617579879-73420/evidence.json),
  [opened PNG](../../.look/evidence/1794617579879-73420/prefab7-4-stool-v2-still.png): the real-input bot reaches
  **T1 seated at 104.2 seconds**; Buddy is visibly seated beside the cradle, supported at stool height with feet
  over the deck. The until condition requires both that exact beat and completed framing.
- Bench [final manifest](../../.look/evidence/1794618015294-80817/evidence.json),
  [opened PNG](../../.look/evidence/1794618015294-80817/prefab7-4-bench-v3-still.png): Buddy's hips are supported by
  the bench and feet lie over the passenger deck. Existing `railway-bench.ts` confirms the server-held seat
  `railway:train1-1-seat0`; its diagnostic reports `into: 0`. A local camera-only action
  [.look/rebase4/bench-profile.ts](../../.look/rebase4/bench-profile.ts) frames from the car's side after setup;
  it changes no player/game state and uses the normal broker action interface.

Capture health passed WebGPU, completed frames and console/graphics-error checks. That is separate from the
visual observations above. The first stool shot opened too early (`--warm 0`); the first two bench views were
cargo-obscured despite successful seat setup. All were opened and retained as unsuccessful visual attempts:
[stool first](../../.look/evidence/1794617130458-61490/evidence.json),
[bench first](../../.look/evidence/1794617130349-61489/evidence.json),
[bench wider](../../.look/evidence/1794617579940-73419/evidence.json).
Corrected runs answer the questions; no expected stool beat was missed in the corrected run. No full route was
played. Motion sheets/videos were not opened, so real-time movement/feel and smoothness remain unverified.
No quiet performance result is claimed. Not tested on a device. No external network use, push or ship.

## Fresh checks and images after the final server-only rebase

All checks above were repeated on **3c76e55b1**. The game, content, dev and test files are byte-identical to
the reviewed acb1c285e implementation; only main's server fix and its tests were added. That main change was
retained unmodified. The expanded server suite passes 344 tests; no further rebase conflicts occurred.

Both refreshed captures fingerprint clean **1ab744572** (58b2636e4 plus the first report), with no change during
either run. Both passed WebGPU/frame/error health checks; both PNGs were opened:

- [Bench manifest](../../.look/evidence/1794618588439-90869/evidence.json),
  [opened PNG](../../.look/evidence/1794618588439-90869/prefab7-4-bench-latest-still.png): the server confirms the
  same seat; hips remain supported at the bench, feet over the deck, with no visible displacement.
- [Bell manifest](../../.look/evidence/1794618589434-90870/evidence.json),
  [opened PNG](../../.look/evidence/1794618589434-90870/prefab7-4-bell-latest-still.png): rock, decks, ramp, pads and
  signs remain aligned. Draws stay 304/292 (+12).

West and the corrected T1 stool images above precede this server-only refresh; their game-source files are
unchanged. No full route, Linux run, motion/smoothness verdict or device test is claimed.
