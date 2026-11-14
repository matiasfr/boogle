# Step 7: portable authored artifacts

Follow-up to Linux x64 / Node 26.13.1 CI failing the Bell golden after the successful local arm64 run.
Implementation: `6f707ab2b`, branch `codex/prefab-data-step-7-3`, rebased onto local `origin/main`
`e8bcf7dda`. No fetch, push or ship; no forbidden source edits. This correction supersedes the earlier
byte-equality claims for **runtime-derived** goldens, not lossless serialization of authored numbers.

## CI diagnosis

Compared both JSON dumps from the supplied `prefab7-ci-fail.log`, removing log timestamps. The visible dumps
have exactly these differences in collider index 6 (Bell's ramp parapet), each one ULP, Linux minus Mac:

| Field | Linux actual | Mac expected | Difference |
| --- | --- | --- | --- |
| `[6].rotation[0]` | `0.24463630871500675` | `0.24463630871500672` | `2.7755575615628914e-17` |
| `[6].rotation[2]` | `0.007493084921739873` | `0.0074930849217398725` | `8.673617379884035e-19` |

The reporter truncated the dumps: 22 collider objects can be decoded completely; collider 23 is incomplete.
The comparison cannot establish whether an omitted suffix also differed. [Extracted differences](../../.look/ci-number-diff.json).

## Choice A and construction proof

Authored content now emits JSON recipe operands: frame origins/directions, local bounds, heights, span
endpoints and line-path offsets. `src/prefab/authoring.ts` constructs data without transcendental math.
`src/prefab/resolve-layout.ts:227` expands those operands when loading, preserving the existing placement,
body and batch order. Native yaw, pitch, normalization, rotated offsets and world quaternions never enter
committed artifacts. The compiler still serializes the original authored records, not its resolved validation
result. Workshop and prefab records were already authored short numbers and retain identical canonical bytes.
Bell, West and Gorge levels change representation. Eight records, four levels, **143,456 canonical bytes**.

`src/prefab/validate.ts:363` is the shared loader used by runtime and level checking. JSON validation precedes
recipe evaluation; strict finite operands, tuple lengths, vectors, names and flags reject coercion before math.
Expanded placements still undergo the existing full-basis orthogonality/determinant and shape checks before
any builder/body allocation. Tests retain the prior compensation, shear and round-trip witnesses. The generic
compiler preserves every finite authored JS number losslessly; no decimal quantization was added.

`dev/prefab/authored.ts` rejects committed numeric leaves with over 12 significant digits; build and tests both
apply it. This is a conservative tripwire, not a rounding rule. Future long authored literals require an explicit
representation/design review rather than silently shortening them. Native-derived outputs are absent by data
construction, even if a future native result happens to have fewer digits.

A test perturbs `sin`, `cos`, `atan2` and `hypot` by `1e-15` while compiling every current level/record and checks
committed bytes. A separate process preload perturbs them **before authoring modules load** and runs the actual
`dev/prefab/build.ts --check`: [normal freshness](../../.look/portability/fresh.log),
[perturbed freshness](../../.look/portability/perturbed-fresh.log). Both pass. These exercise the construction
argument; Linux itself was not run here. Only specified IEEE basic arithmetic and literal data contribute to
serialized recipe operands; platform native math contributes only to discarded preflight/runtime results.

## Runtime goldens and review

Every prefab runtime golden uses absolute `1e-9` / relative `1e-12` numeric tolerance. Array lengths/order,
object keys, strings, flags, counts and triangle indices stay exact. The level report remains byte-exact.
The former Float32 instance snapshots could amplify a double last-bit difference at a Float32 boundary, so
matrix **and colour** snapshots now record full-precision values passed to three.js. The three affected placement
fixtures were captured from the **old numeric compiled artifacts**, before recipe regeneration:
[old-data capture](../../.look/portability/golden-old.log). Collider/count/report/workshop fixture data did not
change; no runtime baseline was regenerated from new recipe output to conceal a geometry change.

The compiler precision/orthogonality tests remain intact. Added tests pin the CI delta tolerance, reject
material drift and structural/string/flag/order changes, catch long derived artifact numbers, preserve long
explicit authored round-trips, and reject malformed recipes. Both raw-authored and expanded placed-rock
remove/move mutations fail with a message naming the unsolid rim. Earlier raise/lower/rotate/scale, West/Gorge
clearance and pad-scale regressions still pass. Both rim trimeshes retain exactly their authored vertices and
indices. Independent read-only review found operand and extra-ID coercion; both reproductions now reject,
and its final review reported no remaining findings.

## Checks and fresh observations

After the last code edit and formatting:

- Prefab suite **156 passing**; with unit-selection guards **167 passing**. [Log](../../.look/portability/tests-final.log).
- `npm run check`: **1,821 passing**, zero failures, one existing fleet-wait TODO; lint, types, registry,
  level reports, assets, freshness and build pass. [Log](../../.look/portability/check-verified.log).
- Ship-check: **371 assertions**, 43 affected test files, 33 lint files, passing.
  [Log](../../.look/portability/ship-check.log).
- Explicit [registry](../../.look/portability/registry-final.log) and
  [level-check](../../.look/portability/level-check-final.log) pass, **13 reports**.
- Review stamp **`dd10de422b34`**, 16 files marked review since origin/main.
  [Stamp](../../.look/portability/stamp.log). This is not a new external Astra approval.
- Prettier ran on every changed file. Canonical compiler output was restored afterward for generated artifacts.
- Debt unchanged by this correction: colliders **104 files / 500 units**, seats **13 / 20**; step 7's original
  reduction from **105 / 502** remains. No new exception or test-selection debt.

The restarted broker captured clean implementation `6f707ab2b`, tree `7c68fa4d0ec8b0dac7d87d13c99e31e8757cbd22`,
with no changes during either run. It used `gorge-reached` plus existing `stack-at.ts` and `stack-draws.ts`.
The displayed harness commit is separately recorded in each manifest.

- Bell [manifest](../../.look/evidence/1794614742195-537/evidence.json),
  [opened still](../../.look/evidence/1794614742195-537/step7-portable-bell-still.png): the cut, rock, decks,
  ramp and pad/sign placement look aligned. **304 draws / 292 without route meshes; +12**. **75 boxes,
  23 bodies including two rim trimeshes**, six signs, one massing batch.
- West [manifest](../../.look/evidence/1794614630468-96534/evidence.json),
  [opened still](../../.look/evidence/1794614630468-96534/step7-portable-west-still.png): platforms meet the stair;
  parapets and board appear intact against the cliff. **674 draws / 668 without route meshes; +6**.
  **28 boxes, eight bodies**, one sign, one massing batch.

These counts match the earlier implementation captures. Gorge golden counts stay **86 placements, 84 visible
boxes, 55 bodies, one batch**. Capture execution passed WebGPU, advancing frames and error checks; the observations
above answer the separate visual continuity questions. No played bot route was run. `look --at list` found no
default saved checkpoint directory; explicit seeds worked. The first Bell command's unsupported `--cam=...`
syntax was rejected before capture; the corrected request passed. Motion sheets were not opened. Fine sign
legibility, real-time feel, quiet-machine performance and Linux execution remain unverified. Not tested on a device.

Placeholder copy remains unchanged in `leg2-layout.ts`: `Stall: High Gorge (placeholder)`, `Stall: Ring Island
(placeholder)`, `Stall: Home (placeholder)`, `Stall: Canopy Town (placeholder)`, `Stall: Port Quay (placeholder)`;
each paired with `Not connected yet`; `Market board (placeholder)`; `LINE TO BELL ROCK` / `UNDER CONSTRUCTION`.
These remain suspect placeholder copy for the owner. No Boogler copy or ROM data changed.
