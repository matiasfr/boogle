# Prefab step 10 follow-up: freshness and deck kit

Branch `codex/prefab-data-step-10-2`; continued from `2d8a5078f`. No push or ship.

## Review fix

`d43a4f5b1` fixes the P2. The reviewer's one-metre `HALTS[1].lat` mutation was reproduced as a failing assertion
before the fix. The regression now compiles the actual halt level, substitutes its bytes into the committed
artifact map and runs the same `writeArtifacts(..., true)` freshness checker as `build --check`. Unchanged input
passes; the mutation fails with `prefab artifact differs: levels/halt-kit.json`; restoring it passes.

The level stores a SHA-256 fingerprint of all halt catalog rows, non-island platform rows, up-platform rows and
Home's authored heads, buffers, island dimensions, origin and axis bearing. Home's native-derived s/lat values
are excluded; their authored inputs are included. No quantization, catalog edit or namespace bump. Perturbed
native math leaves the compiled artifacts fresh.

## Whole-piece boundary

Seven deck records replace the deck segments, bright edges, land bases and over-water piles for the existing
kit everywhere in `halts-view.ts` and `up-platforms.ts`. This includes the single shared Home island deck,
Camp, Quarry, Far Head, Pier and both up platforms. Existing other-area platform builders remain outside this
kit conversion. They gain no invented decks or shelters. Total halt records: **26**, up from 19.

`halt-deck.ts` resolves the selected platform's dimensions and terrain support at runtime through the prefab
loader. The compiler stores only authored selectors; the fingerprint protects their source dependencies.
The builder returns the original drop-set parts; existing world frames, reveal order, merged draws, body order
and cleanup are preserved. Deck bodies precede the other kit bodies, including the up-platform bench-before-posts
order. The old fixture was captured in `98eb84ef0`, before any kit conversion, and already covers these decks.
It is not regenerated: SHA-256 `01df633cfac88285cb74171eb2d10c34b14bc6571cfb8e0c35be4c7ba9ecaef2`.

**Remaining:** ramps/crossings, request levers with plaques and interaction records, animated signal arms,
road plaques and map stands. Step 10 remains unchecked. The existing lever positions, doubled stack plaque
size, order, prompts and server reach inputs are unchanged; the old golden remains their proof here, not a
claim that the new lever-record conversion or its requested live reach test is complete.

Collider debt: **103 files / 488 → 103 / 481 units** in this follow-up (original main: 494).
`halts-view.ts` 12 → 9; `up-platforms.ts` 6 → 2. Seats and other lists do not grow.
No town room files, The Boogler, sim/world rules, seat rules or server changes.

## Unchanged suspect copy

`Request stop`, `Request stop: to <end>`, `Stop requested`, `Stack railhead`;
`Village`, `Camp`, `Village, line 2`, `Quarry`, `Far Head`, `Pier`, `Railhead`, `Ring Island`,
`Stack head 1`, `Stack head 2`, `Stack head 3`, `High Gorge`, `Bell Rock`, `Original Island`,
`West landing`, `Canopy Town`, `Lantern Notch`, `Saltpan Halt`, `Port Quay`.
None changed. Repeated names and the existing `, line 2` suffix removal remain exact.

## Rebase and verification

Rebased cleanly onto locally updated `origin/main` **`7c35b7466`**, on the requested new branch. The old-code
capture rebases to `746aebc7a`; freshness fix to `48f62cfb0`; deck conversion to `dfed253d0`. No external fetch.
The current local base contains the host split but **does not contain `src/prefab/catalogue.ts` or the rooms
conversion**. The shared implementation exists locally at `66b5738a7`, but that unmerged branch has not been
substituted for the requested current-main base. Shared-catalogue integration is therefore still outstanding.

The current source has five full loader call sites plus two direct raw validators in the other consumers;
the halt kit adds none, retaining only its level-reference check. This is not the requested one-pass startup
result. No final shared-loader median is claimed. A current-main ref containing the reviewed catalogue, or
permission to fetch it despite the earlier local-only network restriction, is needed to finish that integration.
The new runtime deck recipe should then resolve in the single shared catalogue exactly like existing recipes.

## Final checks and opened evidence

All accepted final runs use clean `6d9756f34`, tree `d57e3fd91295a44dc79870f03a1fb6b00385a68f`.
The last report commit changes documentation only. No source changed while a browser run was active.
Prettier ran on the changed files before the final code checks; compiler output is canonical JSON.

| Check | Result | Evidence |
| --- | --- | --- |
| Prefab tests, normal | 217/217 | [log](../../.look/step10-2-prefabs-final.log) |
| Prefab tests, pre-import native ULP perturbation | 217/217 | [log](../../.look/step10-2-perturbed-final.log) |
| Additive native perturbation, `build --check` | Fresh: 116 records, 8 levels, 214820 canonical bytes | [log](../../.look/step10-2-freshness-final.log) |
| `npm run check` | Pass: 1912 passed, one existing TODO, zero failures; build/assets/levels/registry included | [log](../../.look/step10-2-check-final.log) |
| Server tests | 371/371 | [log](../../.look/step10-2-server-final.log) |
| Direct `npm run test:net` | 190/190, including request-stop agreement | [log](../../.look/step10-2-net-final.log) |
| `node dev/ship-check.ts origin/main HEAD` | 451 assertions, 47 affected test files, 18 lint files, typecheck and registry pass | [log](../../.look/step10-2-ship-check-final.log) |
| Explicit registry | Pass, no debt growth | [log](../../.look/step10-2-registry-final.log) |
| Explicit level-check | Pass, 13 reports; existing planned/never-drawn continuity diagnostics retained | [log](../../.look/step10-2-level-final.log) |
| Review stamp, `--no-fetch --base origin/main` | `f69ab36320a6`, six test/fixture files | [log](../../.look/step10-2-stamp-final.log) |

The stamp identifies the review scope; this follow-up has not received another independent review.
The earlier compile/type failures were fixed (the resolved visual needs its builder guard, and the removed raw
body helper/import and shrink-only budgets needed pruning). All final checks above pass.

### Headless median: current path, not the missing shared path

The actual current loader was measured on Node 26.13.0/macOS arm64, 24 alternating rounds with four warm-ups
and 20 retained samples, median at sorted index 10. Single load: **2.061 ms**; source-call comparison of five
loads plus two direct raw validators: **13.802 ms**. [Raw samples, source identity and load averages](../../.look/step10-2-validation.json).
The one-minute machine load was about 19; these warmed validation-only numbers exclude parsing, construction,
rendering and networking. Lazy consumers need not run on initial boot: the seven source call sites are **not**
a measured startup call count. The requested one-validation-per-page integration is not achieved on this base.

### Fresh stills opened

The four new stills below were opened. All captures pass WebGPU health, advancing completed frames and zero
page/console/graphics errors. Those execution checks are separate from the placement/appearance observations.
The baseline stills are from the original `98eb84ef0` capture (production views identical to `20004bc6e`). A direct
Git comparison confirms `7c35b7466` has no changes in the halt views, place layout or halt catalog since that baseline;
the host rebase is not presented as a new baseline screenshot or a timing comparison.

| New manifest and opened PNG | Observation against the unchanged baseline view source |
| --- | --- |
| [Home road 1](../../.look/evidence/1794637579254-39488/evidence.json), `step10-2-home0-final-still.png` | Single continuous deck, tile/edge alignment, canopy posts and mast match; actual train at road 1. [Baseline](../../.look/evidence/1794634704990-68905/evidence.json). |
| [Home road 2](../../.look/evidence/1794637579251-39487/evidence.json), `step10-2-home1-final-still.png` | Same shared deck and opposite-edge train; no duplicate deck or shifted canopy/mast. [Baseline](../../.look/evidence/1794634824338-69654/evidence.json). |
| [Stack head](../../.look/evidence/1794637579252-39489/evidence.json), `step10-2-stack-final-still.png` | Deck and doubled plaques unchanged: Village homeward/left, Stack railhead outward/right; diagnostic distance 3.99 m. [Baseline](../../.look/evidence/1794634837168-71545/evidence.json). |
| [High Gorge](../../.look/evidence/1794637579257-39490/evidence.json), `step10-2-gorge-final-still.png` | Same deck edges, ramp junctions, train and lever positions. [Baseline](../../.look/evidence/1794634837132-71546/evidence.json). |

Water, particles and other moving vehicles vary; no pixel-equality or smoothness claim.
The [T1 bot](../../.look/evidence/1794637593127-39668/evidence.json) passed all expected beats, zero errors.
Its full report and verdict were read and `run/end-still.png` opened: Buddy wears the earned conductor hat beside
the production rack, with the completed segment overlay. The two still periods total 2 min 48 s of game time,
including the build wait; they do not establish render stalls. No full-route or new lever-record behavior is inferred.

The first pre-rebase browser clients/network request were cancelled while queued, then their broker requests
were allowed to drain before rebasing. They are not game failures or accepted evidence. Preserved cancelled
look outputs: [Home 1](../../.look/evidence/1794637306164-32934/evidence.json),
[Home 2](../../.look/evidence/1794637306193-32935/evidence.json),
[stack](../../.look/evidence/1794637306173-32936/evidence.json). Final reruns above pass.

Not tested on a device. Real-time feel, cold startup, Linux and the remaining kit conversions are unverified.
