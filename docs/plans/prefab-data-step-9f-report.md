# Prefab step 9f: deterministic startup checks for shallow CI

Branch: `codex/prefab-data-step-9f`, in the original `prefab-data-step-9d` worktree.
Code/test tip: `12f13399d264df5e49a547f9645b27de47c22e94`, tree
`840c3fe6a73f654beb3751fe2695c2df2c50479f`. The report commit is documentation only.
Local main advanced during the audit; the existing work was rebased cleanly onto
`7c35b746641f9e340adeeec0d87771378d2e7a0a` before editing, on the requested new 9f branch.
Earlier branches and evidence remain preserved. No fetch, push or ship.

## Replacement for the failing CI test

The unit test that ran `git show origin/main:content/built/prefabs.json` and asserted a wall-clock delta is
removed. Its local success did not establish shallow-CI portability. There are now two deterministic checks:

1. **Actual imports under a validator spy.** A fresh Node child process with native module mocks imports all
   nine real prefab consumers. The actual catalogue JSON, loader, resolver, validator functions, consumer
   source and Node ESM cache execute; runtime boundary dependencies are stubbed so no browser, GPU, physics
   engine or network is needed. The spy records **one catalogue load/validation and zero direct catalogue
   revalidations**. A repeated catalogue import stays at one. The child receives the parent's import preloads,
   including the perturbed-math preload.
2. **Explicit size ceilings.** `MAX_PREFAB_RECORDS = 200` and `MAX_COMPILED_ARTIFACT_BYTES = 350_000`, against
   the current **181 records / 312,535 canonical bytes**. The byte budget covers catalogue plus level JSON,
   matching the compiler's total. This gives about 10–12% headroom. Both failures say **“Share prefabs through
   placements instead of duplicating definitions.”** Negative witnesses reject 367 additional definitions
   and an over-budget byte count.

The existing global structural ownership check remains as a second guard against new catalogue loaders.
No test in this replacement reads a Git ref, launches Git, reads a clock or compares elapsed time.
The child launches the current Node binary directly, not a shell. The portability suite also passed with
`PATH` pointing to no tools and `GIT_DIR` pointing to no repository:
[no-Git run](../../.look/step9f-no-git.log).

The startup fixture verifies the literal import list and real static dependency reachability for all nine
consumers before evaluating it. It imports rooms' pure `ROOM_CAM` export and reaches curio via the existing
`town/index.ts → view.ts → curio-shelf.ts` owner chain. Production flags are off in this isolated test, so
lifecycle construction is not invoked. This avoids acquiring new legacy constructor APIs just to inspect
startup. No constructor-importer count, registry exception, scanner exception or `UNFOLLOWED` allowance grows.
A direct-import draft tripped the importer ratchet; the final fixture uses the existing owner chain and passes it.

**Measured timings remain historical observations in [the 9e report](prefab-data-step-9e-report.md), not test
assertions or CI budgets.** No new timing measurement is made or claimed here. The old wall-clock threshold
is gone rather than relaxed. Per-placement validation, including rejection of a mutated record after load,
is unchanged.

## Audit scope and preservation

Searched the tests added or modified by this prefab branch, including the source adapters and helpers. The
removed portability test was the only added Git-ref or wall-clock gate; no other changed test needed such a
replacement. The broader checkout also contains pre-existing main tests of Git tooling/isolated Git fixtures
(`change-class`, `prefab-lint`, `prefab-review-4`, `review-stamp`, `scratch-git`) and explicitly approved
performance/transport/shutdown budget tests. Those separate main contracts were not rewritten in this prefab
CI correction. This is not a claim that the entire repository test suite is Git-free.

This correction changes tests and documentation only. All runtime source and compiled artifacts remain as
in the rebased 9e implementation. The catalogue still validates once, still has 181 records and 11 levels,
and still compiles to 312,535 bytes. All old-source fixtures remain byte-identical:

| Fixture | SHA-256 |
| --- | --- |
| `prefab-rooms.json` | `ad2343a722ae257d26420f0bbdfdd9cb894de71660ee37ae141bdb4067d37e1f` |
| `prefab-house.json` | `786a3c30a659f9a8b6226e16999a482d97571ecfb6e80052f57908e36e4b54e1` |
| `prefab-site-lifecycle.json` | `b584566e58d874dad883145d37d159cbd7e5b5e3c2936d8e876af820551187a0` |

Runtime golden numbers retain the shared absolute `1e-9` / relative `1e-12` tolerance; IDs, counts, strings,
flags and order remain exact. Copy, Sleeves, The Boogler and protected sim/world/net/server/seat/finds/wardrobe,
Home layout and namespace source have no new edits. No ROM data. Debt is unchanged: colliders **103/490**
(main: 103/494), seats **11/15**, legacy construction exports/importer counts **62/79**, raw signs **8/17**,
raw interactions **8/16**.

## Checks after the final test edit

- Prettier and scoped lint pass on all three changed test/helper files.
- Actual unit-selection and change-class guards, plus portability: **67/67**, no scanner/debt additions.
  [Log](../../.look/step9f-guards-final.log).
- Prefab tests: **221/221 normal and 221/221 perturbed**, zero failures.
  [Normal](../../.look/step9f-prefabs-tip.log), [perturbed](../../.look/step9f-perturbed-tip.log).
- Pre-import additive native-math artifact check: fresh, **181 records / 11 levels / 312,535 bytes**.
  [Log](../../.look/step9f-artifact-perturbed.log).
- `npm run check`: **1,916 passes, zero failures, one existing fleet-wait TODO** (1,917 cases), including lint,
  types, source-load guard, registry, asset/freshness/level checks and production build.
  [Log](../../.look/step9f-check-final.log).
- `node dev/ship-check.ts origin/main HEAD`: **455 passing assertions**, 46 affected test files, 29 lint files.
  [Log](../../.look/step9f-ship-final.log).
- Explicit registry: pass, no debt growth. [Log](../../.look/step9f-registry-final.log).
- Explicit level-check: **13 reports**, 18 tracks/seven joins continuous; pre-existing planned/never-drawn
  track findings remain. [Log](../../.look/step9f-level-final.log).
- Review stamp: **`a9039140a034`**, eleven fixture/test files since main.
  [Log](../../.look/step9f-stamp-final.log). This identifies review scope, not independent approval.

A focused read-only review found no concrete issue with mock isolation, the real consumer import graph,
validation count, preload forwarding, budget witnesses or debt preservation. The existing fleet-wait TODO's
printed assertion remains a TODO, not a new passing fleet claim. Remote CI has not been rerun by this job.

## Fresh browser evidence opened

These runs use clean `12f13399d` through the restarted broker; no source changed while queued or running.
Execution success establishes WebGPU, advancing completed frames and no graphics/page/console errors; the
visual observations below come from opening the PNGs separately. No pixel-equality or timing claim.

| Manifest | PNG actually opened; observation |
| --- | --- |
| [House](../../.look/evidence/1794638442210-56019/evidence.json) | `step9f-house-final-still.png`: both wall courses, doorway bottom course, bed/quilt, chair, rug, desk/lamp, cabinet, JOBS plaque and stove/kettle retain the accepted framing and positions. Pip's animation phase differs. |
| [Museum](../../.look/evidence/1794638443291-56040/evidence.json) | `step9f-museum-final-still.png`: wall courses, floor, split crystal, table/rim/drawers, bench and plaques align. The existing left-edge bark clips as before. Both residents' E/Talk and real doorway out/in walks pass, with 592 table bits restored. |
| [T1 bot](../../.look/evidence/1794638444568-56044/evidence.json) | `run/end-still.png`: Buddy wears the conductor hat at the producer. Read full report and verdict: all expected T1 beats arrive, zero errors, 20 saves. No town visit occurred in this short segment. |

No bot failure occurred. The bot's two still periods total 2 min 35 s of game time, including construction
waiting, not a measured render hitch. Motion sheets/videos were not opened. Earlier evidence is retained as
historical/reference material; these manifests provide fresh execution proof for the corrected test tree.

Linux/remote CI, device behavior, real-time feel/smoothness, quiet-machine performance, cold startup and full
campaign/multiplayer behavior remain unverified. **Not tested on a device.**
