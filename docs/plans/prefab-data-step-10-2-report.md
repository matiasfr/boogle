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

Full checks and new browser evidence for the rebased deck boundary are recorded below when complete.

Not tested on a device. Real-time feel, cold startup, Linux and the remaining kit conversions are unverified.
