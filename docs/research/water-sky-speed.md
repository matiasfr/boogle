> **Note (6 November):** `skySize`, `dev/look/beats/sky-size.ts` and the 512/256 comparison were removed with the summer-sky default; this page is historical.

# Water and sky speed investigation — 5 November 2026

**Partial.** The owner exception permits early work before the round-4 replay, on this branch only.
No push or ship. The water and default 1024 sky retain their existing look. No copy was edited;
no suspect Boogler lines were identified in this scope. No ROM data or new art assets.
Serves DESIGN.md **Small and readable**: measure submissions before changing geometry.

## Evening integration follow-up (5 November)

Rebased this branch onto local `origin/main` at `ab86ab75`, retaining the evening preparation/refactor.
The resolved sky uses stable texture sampling nodes and size-adjusted LODs together. Ordinary visits
still bake one 1024 cube; `evening=1` prepares day and evening at the same selected `skySize`, then selects
evening. No authored parameters, default mip expressions, water optics or transition behavior were retuned.

The fresh [six-variant queue](../../.look/shots/sky-evening-final/manifest.json) links every broker manifest:
[day 1024](../../.look/evidence/1793901751612-75220/evidence.json),
[evening 1024](../../.look/evidence/1793901789810-76172/evidence.json),
[day 512](../../.look/evidence/1793901821085-77227/evidence.json),
[evening 512](../../.look/evidence/1793901835535-77834/evidence.json),
[day 256](../../.look/evidence/1793901855294-78371/evidence.json), and
[evening 256](../../.look/evidence/1793901875744-78950/evidence.json).
All completed with no graphics errors and unchanged source during each run. The setup verifies actual
cube sizes, mip counts, one bake per cube, absence of an evening cube on ordinary visits, and idle evening
selection on opted-in visits. The runtime/fixtures match the final code; this evidence note was added afterward.

Opened all twelve `c0-v0.png`/`c1-v0.png` cells and both 1024 `board-c1.png` boards. At the same two cameras,
day retains turquoise water and pale clouds; evening has a gold sun reflection, warm clouds and darker bank.
Smaller cubes soften cloud edges, clearly at 256, so neither becomes the default. The stippled bank edge is
present in both looks. Reloaded wave states differ; these are not pixel-identical before/after-main images.
Capture success establishes execution health, not visual equivalence, timing, or smoothness.

Node 26 `npm run check` passed (330 tests, lint, types, registry, levels, assets, build), as did fresh
[world-inputs](../../.look/evidence/1793901741780-74968/evidence.json).
The first check caught a shot-list indexing type error; it was fixed before these final runs.
The earlier capture queue remains diagnostic only. No new bot run was requested; earlier bot and timing
evidence is historical, not verification of this rebased tree. No push, ship, network fetch, copy edit or
ROM data. No suspect Boogler lines identified. The original 568-call peak and +5.4% cause remain unresolved.
Not tested on a device.

## Draw attribution and the bounded change

`dev/look/evals/place-draws.ts` observes actual backend submissions in one completed game frame,
including zero-draw rejection, without an extra render. Rows preserve material names, scene paths,
positions and counts. The fixed town camera is `[939,27,30]` toward `[930,19,5]`.
All comparisons restore the same saved beats from the first bot's 71 checkpoints.

| State | Draws | Sun shadow draws | Evidence |
| --- | ---: | ---: | --- |
| First town arrival | 317 | 86 | [early](../../.look/evidence/1793899195734-1065/evidence.json) |
| Trains unlocked, before merging | 356 | 103 | [before](../../.look/evidence/1793899139103-99264/evidence.json) |
| Trains unlocked, merged | 341 | 97 | [first after](../../.look/evidence/1793899550609-7700/evidence.json) |
| Final attribution | 337 | 98 | [final](../../.look/evidence/1793900710746-37721/evidence.json) |

The before view has 243 standard-material submissions and 103 shadow submissions. The late scene
adds completed buildings, platforms, trains and cargo; trees, folk, track pieces and station framing
already use batches. The sky is one background draw, and the cube reports one loading bake, not
a late-run rebake. Draw counts do not measure the water's fill/compute cost.

The measured train passenger group contains eight chair-part draws plus eight shadow draws.
`seatMesh()` now shares one vertex-colored geometry and an owned material: those **16 submissions
become four**, a verified 12-draw reduction in this view. The same factory also supplies the workshop
chair. Each chair remains its own group with unchanged dimensions, materials' roughness, colors,
shadows, seating anchors, solids and authority. No simulation or wire change.

Do not credit the whole 356→341 or 356→337 difference to merging. Trains, particles and other moving
content differ across reloads; the shadow region also follows the restored player. The iPhone's exact
568-call peak/camera has **not** been reproduced. These counts identify and reduce one contributor,
not a complete explanation of the phone's late-run resolution reduction.

## Visual evidence actually inspected

- Opened the before/after town stills and final `verified-counts-still.png`: town structures, tracks,
  water and sky retain the same visible composition; moving content is not frame-matched.
- Opened both [chair boards and all four cells](../../.look/evidence/1793899661300-10146/evidence.json).
  The baseline is the original four-box recipe from `1b19093f`; the candidate calls the real factory.
  Same frozen scene/cameras, switching visibility: teal back, amber seat, legs, edges and cast-shadow
  shape look unchanged. Front/back differences affect 98/23 of 307,200 pixels, mostly rasterized edges;
  maxima 52/99 channel levels mean these are **not pixel-identical**. Repeat and switch-back probes
  are identical. This is a rigid geometry comparison, not evidence of motion smoothness.
- The first chair fixture was at the world origin, outside the player-following shadow region.
  Its [boards](../../.look/evidence/1793899438362-5462/evidence.json) were opened, but the corrected
  player-relative fixture above supplies shadow evidence. An initial underground town framing
  `1793899060072-95903` was also opened and excluded from the visual comparison.
- Opened all nine sky cells (`c0-v0`, `c1-v0`, `c2-v0`) for
  [1024](../../.look/evidence/1793899463508-5945/evidence.json),
  [512](../../.look/evidence/1793899490327-6536/evidence.json), and
  [256](../../.look/evidence/1793899515830-7417/evidence.json).
  Matched cameras show shore reflections, sun/clouds and cloud horizon. Sun/glow and broad water color
  remain similar; 512 softens cloud detail, and 256 visibly blurs/changes small horizon clouds.
  **Neither smaller sky passes a strict look-neutral default replacement.** Keep 1024.
  Separate reloads freeze different wave states, so water pixels are not an exact before/after match.

## Smaller skies prepared during loading

`skySize=512|256` is an opt-in reload comparison; other values retain 1024. The same loading promise
and six-face bake run once. Shader LOD requests subtract one/two levels to preserve angular blur;
ambient samples the final mip. Default 1024 graph expressions and all water optics are unchanged.
The [queue manifest](../../.look/shots/sky-sizes/manifest.json) retains matched settings and source trees.

| Cube side | Mips | RGBA16F six-face mip payload | Observed bakes |
| --- | ---: | ---: | ---: |
| 1024 | 11 | 67,108,848 bytes (~64 MiB) | 1 |
| 512 | 10 | 16,777,200 bytes (~16 MiB) | 1 |
| 256 | 9 | 4,194,288 bytes (~4 MiB) | 1 |

These are texel payloads, excluding PMREM, atmosphere LUTs and allocation padding, not measured
total residency. A smaller loading bake is not automatically a lower steady-state frame cost.

## What the reported +5.4% establishes

The [replay preparation report](round-4-replay-preparation.md#phone-profile-load-and-gpu) measured
**7.095→7.479 ms render spans (+5.4%) on Mac Chromium with a phone profile**, not iPhone GPU timings.
The [exposure follow-up](fixed-exposure-followup.md#serial-gpu-comparison) separately reports +5.01%.
Both span measurements include scheduling gaps and uncontrolled GPU contention/thermals.

Verified code paths explain why fewer draws do not prove a speedup: fixed exposure removes two tiny
meter draws/history copy while the full-output shader gains a guarded signed-depth dependency.
The phone fixture renders a 528×955 scene into an 880×1592 output. Its camera is at y=8, above the
sea's `nearHeight=4`; the existing guards skip both the underwater storage read and `exp2` there.
Therefore executed underwater arithmetic is **not an established cause** of that sample's regression.
Compiler/resource-binding effects, synchronization and scheduling remain hypotheses. No exposure
retuning was made. Quiet ABBA and per-pass GPU inspection are still needed for causal attribution.

## Checks and limitations

- `npx prettier --write` on changed files; final Node **26.13.0** `npm run check` passed:
  lint, types, 330 tests, registry, levels, assets and build. [Log](../../.look/water-sky-speed-check.log).
  Initial exploration/captures used the shell's Node 24; final checks and broker frontend used Node 26.
- [world-inputs](../../.look/evidence/1793899876641-18692/evidence.json) passed.
- [Initial bot](../../.look/evidence/1793898658469-82762/evidence.json) failed the ordinary five-minute
  cutoff after trains; report and end still opened. No graphics errors. A named final invocation was
  rejected by the broker before running (`--name` unsupported for playthrough); retried without it.
- [Final `playthrough --long`](../../.look/evidence/1793900090652-22030/evidence.json) passed every
  expected beat, including pier, town interiors and shop actions; 84 checkpoints, no graphics errors.
  Read report and opened end still: Buddy stands dry on the final optional ledge. Crystal discovery
  and doing something together remain unmarked; solo success does not establish multiplayer behavior.
- Early diagnostic `shadow` booleans included orthographic producer/output passes; the next attempt
  checked material type instead of name. Tables above use the preserved `ShadowMaterial` name.
  Final attribution correctly uses the r187 override's name and sums to all 337 draws.
- `inflight` failed writing fetch metadata and was not retried because external network is forbidden.
  Research used local reports, commit history and installed three.js source. No external research.

## Exact quiet reruns

Run only after other graphics jobs stop, with the existing broker alive. Keep the tab visible and
inspect effective viewport, DPR, MSAA, targets, camera, adapter and timestamp coverage in each manifest.
No timing values collected in this job are offered as performance evidence.

```sh
export PATH=/Users/matiasfranco/.nvm/versions/node/v26.13.0/bin:$PATH
node .look/see-client.ts playthrough --long
node .look/see-client.ts scenario world-inputs
node .look/see-client.ts shots dev/look/beats/chair-comparison.ts --name quiet-chair
node .look/see-client.ts shots dev/look/beats/sky-size.ts --name quiet-skies
node .look/see-client.ts shots dev/look/beats/sky-evening.ts --name quiet-sky-evening
node .look/see-client.ts look --at 'train unlocked' \
  --saves .look/evidence/1793898658469-82762/run/saves \
  --query 'proto=place&prof=1' --cam 939,27,30 --look 930,19,5 \
  --warm 5 --action dev/look/evals/tone-cost.ts --name quiet-late-town \
  --question 'Does the late town retain its geometry and shadows?'
```

Sky timing comparison, serial current/smaller/smaller/current. This uses the existing pre-boot phone
proxy and existing two-sample hardware measurement; compare counts and pixels before interpreting time.

```sh
for sky_size in 1024 512 512 1024; do
  BOOGLE_BOOT_FAULTS=1 node .look/see-client.ts look --production --real \
    --query "proto=place&phoneStartup=1&prof=1&skySize=$sky_size" --size 440x796 \
    --eval dev/look/evals/replay-phone-cost.ts --warm 1 \
    --question 'Does this sky preserve shore, sun and water appearance?'
done
```

Exposure isolation **reconstructed from commit history**, not a verified copy of the original shell
command: these are exactly the seven modified existing render/debug runtime files between
`19c4c94e` and replay `1599ed02`. They remained unchanged before the evening rebase; main now passes `dt`
to the frozen sky update in `water-render.ts`. The historical isolation recipe below has not been rerun
on this rebased tree and is for default day only, not the prepared evening transition. The unused new
`exposure.ts` may remain when restoring them. This holds today's sky and chair code constant.
Start clean; the trap restores only those seven files and never changes branch, index or main.

```sh
bash <<'SH'
set -euo pipefail
export PATH=/Users/matiasfranco/.nvm/versions/node/v26.13.0/bin:$PATH
test -z "$(git status --porcelain)"
fixed_ref=$(git rev-parse HEAD)
files=(src/debug/dev/looks.ts src/debug/water-tuning.ts src/render/readable-unlit.ts
       src/render/water-render.ts src/render/water/looks.ts src/render/water/post.ts
       src/render/water/underwater.ts)
trap 'git restore --source="$fixed_ref" --worktree -- "${files[@]}"' EXIT
for variant in fixed before before fixed; do
  ref=$fixed_ref
  if [ "$variant" = before ]; then ref=19c4c94e; fi
  git restore --source="$ref" --worktree -- "${files[@]}"
  BOOGLE_BOOT_FAULTS=1 node .look/see-client.ts look --production --real \
    --query 'proto=place&phoneStartup=1&prof=1' --size 440x796 \
    --eval dev/look/evals/replay-phone-cost.ts --warm 1 \
    --question 'Does the fixed shore camera preserve water, sky and sand?'
done
SH
```

Even a quiet whole-span difference does not identify a pass or instruction as its cause. Real-time
motion, cold loading, phone thermals and the exact iPhone peak remain unverified. Stop here for replay;
**not tested on a device**.
