# West-cove pilot assessment — 5 November 2026

> **Verdict:** First west-cove assessment; status replaced by the follow-up.
> **Top recommendations:** none; first-pass assessment, status replaced by the follow-up.
> **Status:** superseded by [terrain-pilot-followup](terrain-pilot-followup.md).

> Historical first-pass assessment. The [coordinator follow-up](terrain-pilot-followup.md) supersedes its current status,
> geometry counts and stopping limitation. Earlier captures and failed runs remain preserved below.

**Partial: implemented and locally committed; awaiting owner playtest, with a filmed stopping/sliding limitation. Not pushed or deployed.** The lower layered headland, pocket transition and submerged shelf occupy the research's positive-z west-cove shoulder. The existing heightfield remains; two small mesh batches provide face/cap/foot, three waterline rocks and three buried fragments. Water depth uses the finished triangle surface; wet substrate uses existing receivers; foam/contact uses existing shore obstacles. These remain separate inputs to the existing water system. No new texture, light, post pass or runtime erosion.

After coordinator merge, compare [sandstone](https://boogle.club/?proto=place&terrain=cove&room=proto-place-cove&fresh=1) with [grey box](https://boogle.club/?proto=place&fresh=1). These URLs are **not evidence of deployment**. Add `&coveView=shape` for clay without water or `&coveView=dry` for dry materials. Default terrain and catalogs are unchanged. The Boogler's copy is untouched; no ROM data is used.

## Sources and placement

- Specification: [terrain-art](terrain-art.md), phased plan and first pilot; [implementation plan](../plans/terrain-pilot.md).
- Opened the supplied board's `shot-1.png` through `shot-4.png` at `/Users/matiasfranco/Developer/boogle-daily/.look/previz/terrain-corner/`. Shot 4 supplied front/side construction intent; shot 3 supplied contact detail. The original [back/contact schematic](terrain-pilot-reference.svg) supplements these under the no-network constraint. Images are references, not shipped pixels.
- [cove.ts](../../src/place/cove.ts) owns the deterministic, metre-scale, Y-up recipe, vertex pigment and matching triangles. [cove-view.ts](../../src/place/cove-view.ts) creates the two meshes and fixed colliders. No external model export, generator or asset dependency.
- The face spans roughly 24 m along z 42–66. The blend extends to local x -216…-154, z 30…80 to join the old tall shoulder without a steep invisible backing wall. It exceeds the research's provisional search box. Landing, path shoulders, rail bed and catalog clearances take precedence over the blend.
- A flagged/unflagged grid comparison found 591 changed grid cells, **zero changed protected cells**, identical path masks and identical catalog snapshots. No route was moved.

## Counts and physical coverage

Matched fixed-camera captures use 960×600 internal pixels, DPR 1, 4× MSAA, the same water/light and Apple Metal-3 WebGPU adapter. These are work counts, **not device performance or timing evidence**.

| Metric                    |   Control |     Pilot | Added |
| ------------------------- | --------: | --------: | ----: |
| Total submitted draws     |       240 |       244 |     4 |
| Shadow draws              |        71 |        73 |     2 |
| Total submitted triangles | 1,246,399 | 1,248,847 | 2,448 |
| Shadow triangles          |   153,488 |   154,712 | 1,224 |
| Geometry objects          |       609 |       611 |     2 |

The source kit has **1,224 render and collision triangles, two bodies, two colour draws and two shadow draws**. This is below the research's 8,000 render / roughly 2,000 collision caps and within 2–4 material/spatial draws. Zero added texture bytes. Both captures report four render passes; compute counts fluctuate and are not attributed to the pilot. The provisional +1 ms p95 GPU limit is **unverified**.

The existing `level-check --place=place --physics --region=cove` adapter uses the actual finished heightfield and all kit triangles. Its [report](../../.look/level-check/3be8086a4355406fcfab129c503991d57c10b11b5b8a627a11183abda068f55d/cove/report.json) and [manifest](../../.look/level-check/3be8086a4355406fcfab129c503991d57c10b11b5b8a627a11183abda068f55d/cove/manifest.json) record 10,179 downward queries, maximum residual 0.000066 m and zero kit vertices inside protected envelopes. **544 exact-boundary queries required a 1 mm interior retry**; this is not proof of all seam contacts. Other creators, capsule sweeps, camera sweeps and dynamic cargo/ball contacts remain outside this bounded audit. The existing water atlas still samples at approximately 2 m; sub-grid wet/contact accuracy is not guaranteed.

## Visual and bot evidence

Question: does the lower sandstone headland connect the tall shoulder to the shelf while leaving a readable climb, and does Buddy's visible foot contact agree during approach and return?

| Evidence manifest                                                                                                                                                                                                                                                                    | Opened images and assessment                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Initial control](../../.look/evidence/1793919155149-82638/evidence.json), [clay](../../.look/evidence/1793919480210-87677/evidence.json), [dry](../../.look/evidence/1793919673068-93722/evidence.json), [wet intermediate](../../.look/evidence/1793919777598-98789/evidence.json) | Opened each still. Early slab-like shape, grey pigment and discontinuous sand prompted local corrections. These are process records, not final geometry proof.                                                                                                                                                                                                                                                                           |
| [Final control](../../.look/evidence/1793920251451-6811/evidence.json), [final wide](../../.look/evidence/1793920251451-6813/evidence.json)                                                                                                                                          | Opened both stills. Warm low beds, three waterline blocks and shallow turquoise shelf read separately. The uphill shoulder remains open. Bands are still regular beside the older tall slope; owner aesthetic acceptance is outstanding.                                                                                                                                                                                                 |
| [Reverse follow camera](../../.look/evidence/1793920251451-6812/evidence.json)                                                                                                                                                                                                       | Opened still: grass cap, gully and arrival water visible. This actually looks back toward landing/sea, not toward town as the capture question implied.                                                                                                                                                                                                                                                                                  |
| [Full solo Place bot](../../.look/evidence/1793920186110-4748/evidence.json)                                                                                                                                                                                                         | Read report and opened end still. Cove pocket and uphill-return beats pass without recovery, then the full normal place tour completes; errors 0, all expected beats. Crystal/co-op beats were not asserted or tested. Saved cove checkpoints are in `run/saves/`.                                                                                                                                                                       |
| [Real-time follow-camera capture](../../.look/evidence/1793920768347-29438/evidence.json)                                                                                                                                                                                            | Opened still, curves and [six consecutive encoded frames](../../.look/evidence/1793920768347-29438/consecutive-frames.png), extracted at video 1.4 s. Buddy visibly climbs the broken end, then descends. The action reaches its six dry waypoints, but **after stopping Buddy slides into the shallow channel**. The final still and height curve (-0.4…5 m) establish that limitation; the command's success is not visual acceptance. |

The real-time WebM is preserved beside its manifest. Inspecting consecutive frames is not a watched real-time playtest: smoothness, shimmer, fun and real-time feel remain unverified. Camera distance in that capture was 5.62–5.95 m; this does not establish complete camera clearance. No low-water variant, deliberate swim/recovery loop, pushed-ball seam test or named mobile test was completed. **Not tested on a device.** Timing under load is not evidence.

Earlier failed bot reports were read and their end stills opened: [first recovery/stall](../../.look/evidence/1793919922986-683/evidence.json), [strict backing-slope failure](../../.look/evidence/1793920060961-2736/evidence.json). The latter prompted the broader inland blend and a dry contour route. Earlier motion fixtures also failed: [planner stall](../../.look/evidence/1793920197182-5269/evidence.json), [short timeout during capture stall](../../.look/evidence/1793920674928-27175/evidence.json). They are retained, not silently replaced. The final motion fixture avoids shadow pipeline toggling; it still lacks a post-stop assertion, which is why its success does not cover the observed slide.

## Reproduction and provenance

Use the existing broker, never direct Chromium:

```sh
node .look/see-client.ts playthrough --query 'proto=place&terrain=cove&fresh=1&shot=play' --stall 600 --long
node .look/see-client.ts look --query 'proto=place&terrain=cove&fresh=1&coveShot=wide' --eval dev/look/evals/terrain-cove.ts --warm 5 --name terrain-review
node .look/see-client.ts look --query 'proto=place&terrain=cove&fresh=1&coveWalk=1' --eval dev/look/evals/terrain-cove.ts --action dev/look/evals/place-act.ts --warm 5 --video 12 --curves --frames 2 --name terrain-walk-review
npm run level-check -- --place=place --physics --region=cove
```

Production geometry is committed in `00dde6d785356fe44deef904e2d5d640df4589b8`. Final wide/control/bot manifests record the preceding dirty checkout; their production files are the same content as that commit. Subsequent changes only add verification tooling, format the reference SVG and document results. The final motion manifest records that production commit with dirty verification tooling. No source changed during a broker run. Do not reinterpret old manifests as clean final-commit captures.

`npm run check` passed: lint, types, 353 tests, registry, six level reports, assets and build. Changed files were formatted with Prettier. No multiplayer protocol/state change; `world-inputs` was not run because this is static terrain and local presentation. Code inspection plus a solo pass does not establish multiplayer parity.

Departures: locally drawn back reference instead of generated art under the network restriction; larger bounded inland blend; corrective physical work continued beyond the initial three art comparisons after bot failures. Stop here for coordinator/owner review. The stopping slide and unverified device/contact checks prevent declaring the pilot fully accepted or extending this grammar around the coast.
