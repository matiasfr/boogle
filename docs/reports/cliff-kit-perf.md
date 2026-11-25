# Cliff kit frame cost on HOTBOX

## Method

Use `6554a481e` (`origin/main`, with steps 0–3) and `fea68e113` (parent of `92a4c789d`, the first commit touching
`content/built/levels/canyon-kit.json`). The historical comparison includes other changes between the two builds. At the
shore it also includes the kit step's replacement of the sculpted cove face and changes to the heightfield and material.

Run `npm run perf -- --hardware --view census-<camera> --seconds 10 --query profui=0 --json <file> --verdict <file>`
from separate checkouts with Node 26.13.0. Use the canyon, shore landing, gorge rim, gorge mouth and summit cameras
and player stands from `dev/look/evals/cliff-counts.ts`. The temporary dev harness adds those views and stands and
reports the median of the profiler's existing samples. Both builds use the same harness and get a fresh room, the same
default viewport and six seconds to settle after the camera move. The GPU overlay's display is off during profiling.

HOTBOX runs Windows 11 Home (10.0.26200), an Intel i9-10900K with 20 logical CPUs, and an NVIDIA GeForce RTX 3080
(driver 610.88). The headed Edge WebGPU harness reports a non-fallback NVIDIA Ampere adapter. Windows verdicts express
load as busy logical CPUs. The requested limit is less than 2 before and after a run. The first pair exceeded it, so any
timing from those runs is exploratory. Raw results and verdicts are kept in `.look/cliff-perf/` in the measurement worktree.

not tested on a device
