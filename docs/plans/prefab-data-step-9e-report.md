# Prefab step 9e: share the catalogue and shell specifications

Branch: `codex/prefab-data-step-9e`, in the original `prefab-data-step-9d` worktree.
Code/test tip: `f1150358b02e514c8048aaa8f172b685b6047656`, tree
`8d1096a48a67f464df2c74f1056742f4aca67bab`. The report commit changes documentation only.
Rebased cleanly onto local `origin/main` `20004bc6eaabf9ab45bce19d782d343ed0c7c02f` before editing;
main's lead-tab deletion and v44 are inherited, with no edits to those systems. The earlier 9d branch is preserved.
No fetch, push or ship; `inflight` was omitted because it fetches.

**CI correction:** the timing test described below passed locally but failed in shallow CI without origin/main.
[Step 9f](prefab-data-step-9f-report.md) replaces it with deterministic import-count and content-budget checks.
The measurements below remain historical observations only.

This completes both accepted findings from the independent review. The old-code golden proof, house scope,
copy inventory and debt reduction in [9d](prefab-data-step-9d-report.md) remain valid. This report supersedes
its catalogue counts, startup cost and final-check/visual evidence for the revised build.

## One catalogue validation

`src/prefab/catalogue.ts` owns the only raw catalogue import and the only runtime full-catalogue load. It exports
the resolved `compiled` artifact and its `definitions`. ES-module evaluation shares those objects once per page.
All nine consumers use them: instantiate (including workshop/seats/Gorge placements), workshop-kit, shop,
curio shelf, museum, rooms, house, Gorge boxes and leg-2 drawing. Level validation continues at its existing
call sites; it does not revalidate the whole catalogue.

Before this fix there were seven `loadPrefabArtifact` calls, plus two direct `validateArtifact` calls in the
Gorge/leg-2 modules. The review's startup comparison measures the seven loader passes; the two additional
module validations may load lazily and were not independently observed at page boot. Both kinds now use the
same module: **one full pass total**, regardless of which of the nine consumers loads first.

The per-placement `validatePrefab`, `validatePlacement` and collider-world validation inside `instantiate()`
are unchanged. There is no record-validation cache or freeze that masks later mutations. The existing
“a record mutated after load is re-validated on every instantiation” test passes in both prefab modes.
Source adapters inject the same resolved catalogue, including the custom-data adapter used by mutation tests.

The review's temporary load test is ported into `test/prefab-portability.test.ts`, using repository-relative
imports and an alternating warmed main-five/shared-one comparison with its 30 ms regression threshold.
A structural regression test counts all loader/direct-validator calls and raw imports across `src`, requires
exactly one catalogue owner, and checks all nine consumers import it. Its source-directory URL makes the test
selection walker follow that scan explicitly; no scanner exception or `UNFOLLOWED` debt was added.

## Three shell prefabs

The **367 shell/scaffold definitions become three shared prefabs**, one per room specification. All 367 ordered
placements remain, retaining their exact IDs and positions; `phase` and `index` move into placement parameters.
`rooms.ts` preserves those parameters when adding the runtime world frame. The same shell builder returns the
same original construction parts. Collider, proxy, label, sign, interaction and site lifetime behavior is unchanged.

| Compiled data | Before 9e | After |
| --- | --- | --- |
| Shell/scaffold definitions | 367 | **3** |
| All prefab definitions | 545 | **181** |
| Levels | 11 | 11 |
| Total canonical artifact bytes | 499,127 | **312,535** |

This removes 364 definitions and 186,592 canonical bytes. The byte count is the compiler's sum across the
prefab catalogue and level artifacts. The room's authored placement parameters increase level JSON slightly;
the total still shrinks. Artifacts contain only authored operands, never generated construction matrices,
world positions or native-math results. Normal and pre-import additive-native-math freshness both pass.

## Headless validation timings

Final measurement runs the actual loader against main's artifact, the exact 9d artifact from `973e104bd`, and
the final 181-record artifact. Node 26.13.0, macOS arm64; 24 rotated/reversed alternating rounds, four warm-up
rounds, 20 retained samples per case, median at sorted index 10. Load average was 2.47 before / 3.07 after.
[Reproducible script](../../.look/step9e-startup-validation-benchmark.ts),
[raw samples and source identities](../../.look/step9e-startup-validation-benchmark.json),
[output](../../.look/step9e-startup-validation-benchmark.log).

| Input/path | Single loader pass | Loader passes in the review's startup comparison | Median total |
| --- | --- | --- | --- |
| Main, 90 records | 1.359 ms | 5 | 6.680 ms |
| Before fix, 545 records | 6.684 ms | 7 | 46.857 ms |
| Fixed, 181 records | **2.408 ms** | **1** | **2.408 ms** |

The final pass is below the requested **6.4 ms** ceiling and happens once total. An earlier paired run measured
main-five at 6.383 ms and 9d-seven at 43.635 ms, reproducing the review's approximately 6.4 / 43.8 ms figures;
those figures describe multi-pass startup aggregates, not the cost of each individual pass.

For completeness, executing the two additional raw module validators too measures main's seven all-consumer
calls at 8.604 ms and 9d's nine at 56.151 ms; the fixed shared path remains one pass at 2.408 ms. This is a
source-call comparison, not a claim those lazy modules execute on every initial page.

These are warmed validation-only measurements, excluding JSON parsing, room construction, rendering and
networking. They do not establish cold time-to-first-frame or quiet-machine device performance. The review's
approximately 8 ms construction delta was not remeasured or claimed removed; ordered placement count stays fixed.

## Golden, copy and debt proof

The original room/house fixtures were committed before conversion at `20859568b` (rebased capture `778b5c7d4`);
the site lifecycle fixture preceded its production hook (`939c26662`, rebased `8f3ce62c6`). None was regenerated:

| Fixture | Unchanged SHA-256 |
| --- | --- |
| `prefab-rooms.json` | `ad2343a722ae257d26420f0bbdfdd9cb894de71660ee37ae141bdb4067d37e1f` |
| `prefab-house.json` | `786a3c30a659f9a8b6226e16999a482d97571ecfb6e80052f57908e36e4b54e1` |
| `prefab-site-lifecycle.json` | `b584566e58d874dad883145d37d159cbd7e5b5e3c2936d8e876af820551187a0` |

The actual room source adapter additionally checks every placement ID and order against the old plan lengths,
and each shared shell reference with its exact phase/index operands. Runtime parts, plans, complete proxy/stake
geometry, hulls, world bodies, flags, copy, readiness, cutaway and lifecycle outputs still match the old goldens.
All 16 house fact masks remain covered. Runtime numbers use the same absolute `1e-9` / relative `1e-12`
tolerance; identifiers, lengths, order, counts, flags and strings remain exact.

All eight referenced room/house strings remain unchanged in `town-lines.ts`: `FINE PRICES`, `COMING SOON`,
`A MUSEUM`, `ONCE THERE IS SOMETHING TO SHOW`, `PIP`, `OPEN TO OFFERS`, `JOBS`, `none yet`.
The previous suspect-placeholder list (`COMING SOON`, `ONCE THERE IS SOMETHING TO SHOW`, `none yet`) is
preserved for the owner without editing. Sleeves and The Boogler's copy/code are untouched. No ROM data.

Debt is unchanged by this follow-up: colliders **103 files / 490 units** (main: 103/494), seats **11/15**,
legacy constructor/importer counts **62/79**, raw signs **8/17**, raw interactions **8/16**.
No list, count, public-surface exception, suppression or test-selection allowance grew. Protected sim/world/net,
server, seat/finds/wardrobe rules, Home layout constants and namespace have no diff from current origin/main.

## Checks after the final code/test edit

- Prettier ran on all changed files; generated artifacts were then restored to canonical compiler output.
- Prefab suite: **220/220 normal, 220/220 perturbed**, zero failures.
  [Normal](../../.look/step9e-prefabs-final.log), [perturbed](../../.look/step9e-perturbed-final.log).
- Pre-import additive native-math artifact freshness: **181 records, 11 levels, 312,535 bytes, fresh**.
  [Log](../../.look/step9e-artifact-perturbed.log). The original authored-number tripwire remains active.
- `npm run check`: **1,915 pass, zero failures, one existing fleet-wait TODO** (1,916 cases), including lint,
  types, source-load guard, registry, assets, level reports, freshness and production build.
  [Log](../../.look/step9e-check-fixed.log).
- `node dev/ship-check.ts origin/main HEAD`: **454 assertions**, 46 affected test files, 27 lint files, pass.
  [Log](../../.look/step9e-ship-fixed.log).
- Explicit registry: pass, no debt growth. [Log](../../.look/step9e-registry-fixed.log).
- Explicit level-check: **13 reports**, continuity OK for 18 tracks/seven joins; the existing planned/never-drawn
  track findings remain. [Log](../../.look/step9e-level-fixed.log).
- Review stamp: **`7a0c32bf91b6`**, nine fixture/test files relative to main.
  [Log](../../.look/step9e-stamp-fixed.log). This names the caller's review scope, not independent approval.

The first full check and ship-check failed because the new global source scan was not visible to the test
selection walker. `f1150358b` declares its source-folder URL dependency; actual unit-select tests pass 11/11,
without changing the scanner or adding an exemption. Full/ship checks then passed. The existing fleet-wait
TODO's printed assertion is not a new passing fleet claim. A focused read-only review found no further issue
with catalogue sharing, preserved mutable-record validation or shell placement parameters.

## Fresh browser evidence actually opened

All three accepted runs use clean `f1150358b`, through the restarted broker; no source changed while queued
or running. Earlier 9d stills are comparison references only, not execution proof for this follow-up.

| Manifest | PNG opened and observation |
| --- | --- |
| [House](../../.look/evidence/1794634372922-64622/evidence.json) | `step9e-house-final-still.png`: both wall courses, doorway bottom course, bed/quilt, senior chair, rug, desk/lamp, cabinet, plaque and stove/kettle align with the accepted fresh no-action framing. |
| [Museum](../../.look/evidence/1794634374217-64646/evidence.json) | `step9e-museum-final-still.png`: wall courses, tiled floor, crystal halves, table/rim/drawers, bench and both plaques align. The existing left-edge bark clips as before. Both Moss/Wren E/Talk actions and real walking out/in through the doorway pass; the table resumes with 592 bits. |
| [T1 bot](../../.look/evidence/1794634375214-64648/evidence.json) | `run/end-still.png`: Buddy wears the conductor hat at the producer. Read full report and verdict: every expected T1 beat arrives, zero errors, 20 saved checkpoints. No town visit is inferred from this short segment. |

All report WebGPU, advancing completed frames and no graphics/page/console errors. These execution checks are
separate from the visual alignment observations above; no pixel-equality claim. The bot's two still periods
total 2 min 52 s of game time, including its construction wait, not a measured render hitch. No bot failure.
The broker waited for load to fall (139 s on the bot request); capture load remained about 26–30, so the stills
are not performance evidence. Motion sheets/videos were not opened or used to claim smoothness.

Cold startup/construction timing, real-time feel, quiet-machine performance, Linux, multiplayer, full-campaign
completion and device behavior remain unverified. **Not tested on a device.**
