# R2b.1 preflight: stopped on the Q7 clearance requirement

16 November 2026. Branch `t3/pier-west-crossing`, based on origin/main `a32bc4362`.
**R2b.1 is not built or ticked.** No game code, geometry, stop, train, catalog, saved data, copy or test assertion
changed. No push or ship. This report follows the task's instruction to stop when measured geometry misses a
plan clearance, rather than reinterpret the requirement or move something on the builder's authority.

## Finding and its runtime qualification

The [plan](../plans/rider-coach.md)'s designer addition requires every Q7 piece to stay at least 0.60 m from the
width of the crossing at its east end, without moving the site. The specified crossing is s 707.2–709.6,
ending east at lat +1.5.

[q7-site.ts](../../src/entities/railway/q7-site.ts) describes a 2.3 m shelf, but
[shelf-view.ts](../../src/entities/railway/shelf-view.ts) actually draws a **2.6 × 0.12 × 3.4 m** plank,
centred at s 706.2, lat +2.9, turned by the line heading plus π/2. Its along-line half extent is 1.3 m,
and lateral half extent 1.7 m. Projecting its actual world corners into the crossing's local track frame gives
s **704.894234–707.498491**, lat **1.196940–4.600195**. The shelf and proposed planks overlap in plan by about
0.30 m along and across the line. Their footprint distance is **0 m**, below 0.60 m. The world point at
s 707.35, lat 1.4 lies inside both footprints. The shelf underside is y 24.84, and the crossing top is y 24.52
(0.32 m vertically). These are authored geometry measurements, not a witnessed runtime collision.

**Important qualification found by opening the live still:** the shelf and log rack are absent at `deck-laid`.
[qActive](../../src/sim/railway-queries.ts) returns -1 after all Q jobs complete;
[shelf-view.ts](../../src/entities/railway/shelf-view.ts)'s `draw` hides the shelf with no active station;
[line2-view.ts](../../src/entities/railway/line2-view.ts)'s `drawDepot` hides the rack. The crossing appears only
after seven completed jobs ([halts-view.ts](../../src/entities/railway/halts-view.ts), `upWanted`). Thus the
measured shelf footprint conflict is **not proof of a simultaneous shelf/crossing collision**. The requested
unconditional clearance row still cannot pass without changing its meaning. I have not silently replaced it
with a phase-dependent rule.

## Smallest proposed resolution, not applied

Have the designer/orchestrator explicitly make the shelf/rack acceptance phase-aware: prove that those work
pieces are hidden before the crossing appears, including the completion transition, then retain the 0.60 m
geometric requirement for pieces that remain (frame, personal box), and verify the route to the east ramp.
That preserves the specified crossing, 9.4 m ramp, all Q7 positions and the existing minimum for simultaneous
obstacles. It is a change to the brief, not a builder-approved exception. Transition behavior is not yet proven.

If the requirement instead covers even hidden authored footprints, a smaller geometric candidate than moving
the site is to trim about 0.90 m from the crossing's south edge (s ~708.10–709.60, width ~1.50 m), keeping the
same ramp foot and both tail clearances. This changes the approved 2.4 m walking width, needs exact oriented
clearance and walking review, and is **not validated or applied**.

## Other preflight measurements and authority

The process-only probe used the production `q7Spot`, `lineAt`, `haltCrossing`, `RAIL_LINES` and `TRAIN_EXTENT`,
and the shelf dimensions read from its renderer. It temporarily set the in-memory crossing operand to 708.4,
then restored it; no source geometry was edited. Raw measurements (local-only: `rider-coach-r2b1/preflight.json`).
The local probe is retained at preflight.ts (local-only: `../../.look/rider-coach-r2b1/preflight.ts`); reproduce with
`node --import ./dev/sim/hooks.ts .look/rider-coach-r2b1/preflight.ts` under Node 26.

| Quantity | Proposed measurement | Required minimum / intended pin |
| --- | ---: | --- |
| Today's 12.70 m tail to crossing | 4.200000 m | ≥0.60 m; 4.20 ±0.01 m |
| Planned 16.10 m coach tail to crossing | 0.800000 m | ≥0.60 m; 0.80 ±0.01 m |
| Q7 shelf footprint to crossing | 0 m; footprints overlap | ≥0.60 m, unconditional as written |
| Ramp station interval | 9.400000 m | 9.4 m in the plan |
| Ramp world horizontal endpoint distance | 9.369222 m | Offset curved path makes this differ from the s interval |
| Ramp rise | 0.670000 m | 0.67 m in the plan |
| Ramp slope | 4.090301° | ≤15° and walkable normal; approximately 4.1° in plan |

The tail minimum is the existing [ring.ts](../../dev/level/ring.ts) `checkRing` rule, cited by
[rider-coach-audit.ts](../../dev/level/rider-coach-audit.ts) and the plan's Pier audit row. The 0.60 m site minimum
comes from the designer's R2b revision. **No level rows or pins were installed.** The ramp's slope-surface
endpoint distance is about 9.39315 m; distinguish that and the actual horizontal run from the nominal s interval
when writing pins. The rest of the Q7 footprints, full route clearance, trestle/rail clearance and roof-bypass
row have not been revalidated for a built change.

The no-bump claim is supported by the inspected boundaries: the crossing and ramp are runtime Place/prefab
recipes; the server's fixed `PIER_WEST` remains x 139565, z -35815, y 2502, reach 1260 cm in
[railway-lines.ts](../../src/sim/railway-lines.ts). `PIER_EAST`, stop s 726.50 m, train extents and Q7's server
frame point are untouched. No server-owned collider/catalog/reach point or saved value moved, and `WORLD_NS`
remains v56. This report does not claim a completed implementation audit. Also reconnect
[timber-track.ts](../../dev/level/timber-track.ts)'s duplicated six-metre head-ramp geometry when building;
updating only the prefab would leave that level-check representation stale. Its data is local analysis, not
a server-owned catalog.

## Evidence opened

- [Main, overhead over Q7 and the crossing](rider-coach-r2b1/main-q7-deck.jpg): unmodified `a32bc4362`,
  `deck-laid`, camera `[1404,45,-334]`, target `[1404,24.3,-337]`, 1280×900. Opened: the old crossing meets
  the equal-length ramps; Q7's frame and personal box stand on the east deck; the shelf and rack are absent.
  This is a diagnostic before still, not the requested full s 700–745 before/after pair.
- Motion sheet (local-only: `../../.look/rider-coach-r2b1/main-q7-deck-motion.png`): opened; same static framing with the
  player standing beside the frame. It proves no walking route or motion quality.
- Capture verdict (local-only: `rider-coach-r2b1/capture-verdict.json`): pass, WebGPU, advancing completed frames,
  no page/console/graphics errors. The exact capture command is in the verdict.

No after stills, lever-to-Home view, east-end eye view, standing players' car view, south approach view,
`boiler-long` tail view or real-time walking clip were made after the stop. Ramp readability, natural walking,
the return route and homeward boarding remain unverified.

## Checks and omissions

- `git fetch origin && git rebase origin/main`: passed; the revision landed before preflight finished.
- Node 26.13.0 `npm ci`: passed, including server dependencies; no symlinked dependencies.
- `npm run map -- --kind poi` and `npm run inflight`: passed. Initial map attempt before install failed as quoted below.
- Read-only geometry probe: executed successfully; acceptance failure text in full:
  `FAIL: Q7 shelf/plank footprints overlap; 0 m separation, required >= 0.60 m.`
- Targeted `npm run look`: passed capture-health checks; inspection qualification above.
- `node dev/ship-check.ts` on the report/evidence diff: passed (exit 0): registry, 0 lint files,
  typecheck, 19 affected test files / 165 tests passed, 0 failures; 27.20 s.
  Full log (local-only: `../../.look/rider-coach-r2b1/report-ship-check.log`).
- `git diff --check`: passed.
- **Not run after stopping:** implementation `npm run level-check`; Pier tests and their complete files;
  `npm run loop -- run`; Pier-stage checkpoints; production bot's Q7 work, lever and homeward boarding;
  prefab compile/freshness; standalone lint and types (typecheck did run through the ship gate).
  No implementation exists to certify.
- No test assertions changed. R2b.2 and R2b.3 untouched. No game-design as-built update or completed plan tick.

Initial setup failure (recovered by installing dependencies under Node 26):

```text
node:internal/modules/package_json_reader:316
  throw new ERR_MODULE_NOT_FOUND(packageName, fileURLToPath(base), null);
        ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'oxc-parser' imported from /Users/matiasfranco/.t3/worktrees/boogle/t3-b6310eac-63a166c3506c3ec2/dev/scan/read.ts
    at Object.getPackageJSONURL (node:internal/modules/package_json_reader:316:9)
    at packageResolve (node:internal/modules/esm/resolve:768:81)
    at moduleResolve (node:internal/modules/esm/resolve:858:18)
    at defaultResolve (node:internal/modules/esm/resolve:990:11)
    at #cachedDefaultResolve (node:internal/modules/esm/loader:737:20)
    at ModuleLoader.resolve (node:internal/modules/esm/loader:714:38)
    at ModuleLoader.getModuleJobForImport (node:internal/modules/esm/loader:293:38)
    at #link (node:internal/modules/esm/module_job:208:49) {
  code: 'ERR_MODULE_NOT_FOUND'
}

Node.js v24.11.1
```
