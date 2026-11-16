# C5: counts everywhere — 15 November 2026

Implemented on `t3/grant-c5-counts`, based on `origin/main` at `3ccfdc3c2`. Not shipped.

Owner ruling: [counts everywhere](../agents/owner-calls.md#counts-everywhere). Grant's [G14](round-4-notes.md), queue [C5](grant-1114-queue.md).

The carry HUD's square grid is replaced with material icons and counts in the stock boards' heavy cream Figtree style. The total uses comfortable capacity (8 or 16), remains uncapped above it, and turns amber when heavy. Existing warnings and the hold/fade remain. Beam, boiler and footing each show 1 with their name. Pile/recovery-rack prompts gain stock counts; garage car capacity loses its pips. Depot/forge boards, construction bills, cart shipment/owed counts and footing rack/wagon counts were already numeric. Physical cargo and wardrobe/map selection markers stay.

No simulation, capacity, physics, accepted effects, wire or save changes. The Boogler's copy is untouched. Draft numeric labels: `1 Great beam`, `1 Boiler`, `1 Footing`, `N logs`, `N stone`, `N rails`, `1 footing`.

## Visual evidence

Question: can the player read empty, partial, comfortable-full and heavy loads without counting squares, at desktop and phone width?

Setup: `dev/look/evals/grant-c5-carry.ts` stages the existing Local carry presentation seam in the running production scene. It does not mutate accepted inventory or prove a played acquisition. Same seed (`awake`), camera, staged amounts and viewport before/after. Independent sessions randomize Buddy's colour; no colour comparison is claimed. Captures use the normal WebGPU session harness. Machine load gate disabled for these layout stills (`BOOGLE_BOT_MAX_LOAD=0`), queue ownership retained. No timing, motion, real-phone or performance claim.

All stills are under `.look/session/` in this worktree. Names: `c5-{before,after}-{desktop,phone}-{empty,part,full,overflow,packed}-still.png`. Desktop is 960×600, phone width 390×844. State amounts are 0, 3, 8, 12 with comfort 8, then 24 with comfort 16. Additional after `mixed` shows logs 4, rails 12 and stone 8 (the seam stages the HUD; only the log bundle is staged on Buddy), and `phone-footing` shows the singleton readout.

Before observations: twelve empty squares even when empty; three brown squares part-full; eight brown squares with a comfortable-limit warning; twelve brown squares with a heavy warning; packed overflow fills six rows. At phone width the grid docks upper-left.

After observations: separate icon counts and explicit 0/8, 3/8, 8/8, amber 12/8 and amber 24/16; warning text stays below and fits. The mixed desktop readout shows 4, 12, 8 and total 24/16.

## Validation

- `npm run check` **passed**, Node 26.13.0: lint, typecheck, unit suite (2,227 passed, 65 skipped, 1 todo, 0 failed), registry, levels, assets and production build. Log: `.look/c5-check-final.log`. The first attempt stopped at registry because the carry eval lacked the required command header; fixed before the passing full run.
- Owning tests **33/33 passed**: `garage-data`, `garage-selection`, `railway-heavy-load`, `review-heavy-load`, `review-heavy-load-fix3`. Log: `.look/c5-owning-tests.log`.
- `node dev/look/playthrough.ts --to t1-done` **passed**: real chop, three eight-log loads, deposits, T1 construction and reward. Zero reported errors; read `report.txt`, `verdict.json` and opened `end-still.png` under `.look/playthrough/3ccfdc3c2/`. This is the short T1 route, not the complete game.
- Live readout probe **passed**: five accepted logs with two in flight show 3/8 while the accessible accepted readout says five; landing updates to 5/8; dropping updates to 0/8; no slot nodes and no horizontal clipping at 390 px. `.look/c5-readout-probe.log`.
- Garage capture **passed** via the existing `open=api` camera-only option; opened `.look/c5-garage-api-still.png`: "Cars it pulls" reads `3 → 4`, matching the other numeric rows. Its first Interact-at-post setup failed to open; `.look/c5-garage-verdict.json` retains that failure. The passing camera-only capture does not establish the post interaction.
- Accepted pile capture **passed**, real chop/drop with teleport positioning. Opened `.look/session/c5-pile-framed-still.png`: two visible logs, `2 logs` over Pick up, and empty 0/8 carry readout. The first look had a healthy capture and correct prompt but its default camera replaced the setup camera, so its still did not frame the pile; the session still is the visual evidence.
- `npm run review-stamp -- . --no-fetch`: **no review stamp needed**; no changed sim/net/world/ecs/server source or tests.
- `git diff --check` passed. No new UI unit tests, no push, no ship. Not tested on a physical device; real-time motion/feel unverified.

All 20 matched before/after stills and the three supplementary carry stills were opened. At phone width the material counts, 24/16 total and warning fit upper-left with no clipping. `1 Footing` also fits; this singleton shot stages the readout only and still has the prior mock log bundle, so it is not footage of acquiring a footing. Pile and garage supplemental stills and T1's end still were also opened.

## Still paths

Relative to this worktree (absolute root is `/Users/matiasfranco/.t3/worktrees/boogle/t3-bff6a37b-de66406688512435`). The interactive local gallery is `.look/c5-gallery.html`.

| State | Desktop before / after | Phone before / after |
| --- | --- | --- |
| Empty 0/8 | [before](../../.look/session/c5-before-desktop-empty-still.png) / [after](../../.look/session/c5-after-desktop-empty-still.png) | [before](../../.look/session/c5-before-phone-empty-still.png) / [after](../../.look/session/c5-after-phone-empty-still.png) |
| Part-full 3/8 | [before](../../.look/session/c5-before-desktop-part-still.png) / [after](../../.look/session/c5-after-desktop-part-still.png) | [before](../../.look/session/c5-before-phone-part-still.png) / [after](../../.look/session/c5-after-phone-part-still.png) |
| Comfortable-full 8/8 | [before](../../.look/session/c5-before-desktop-full-still.png) / [after](../../.look/session/c5-after-desktop-full-still.png) | [before](../../.look/session/c5-before-phone-full-still.png) / [after](../../.look/session/c5-after-phone-full-still.png) |
| Overflow 12/8 | [before](../../.look/session/c5-before-desktop-overflow-still.png) / [after](../../.look/session/c5-after-desktop-overflow-still.png) | [before](../../.look/session/c5-before-phone-overflow-still.png) / [after](../../.look/session/c5-after-phone-overflow-still.png) |
| Packed overflow 24/16 | [before](../../.look/session/c5-before-desktop-packed-still.png) / [after](../../.look/session/c5-after-desktop-packed-still.png) | [before](../../.look/session/c5-before-phone-packed-still.png) / [after](../../.look/session/c5-after-phone-packed-still.png) |

Additional stills: `.look/session/c5-after-desktop-mixed-still.png`, `.look/session/c5-after-phone-mixed-still.png`, `.look/session/c5-after-phone-footing-still.png`, `.look/session/c5-pile-framed-still.png`, `.look/c5-garage-api-still.png`.

