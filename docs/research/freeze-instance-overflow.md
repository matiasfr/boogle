# Round 4 freeze: instance-count audit

## Finding

The forge rail rack can reproduce the reported **25 draws from 24 matrices (1536 bytes)**. This is a demonstrated bug, not proof that this was Grant's particular failing batch: the session records neither mesh identity nor reconciliation snapshots.

In `coop.ts`, soft `reconcile` calls `applyShared` after four volatile-state mismatches, without clearing trips. The forge slice restores `forge.rails` and resets `inFlight` to zero. A rail already sent by `updateForge` retains its landing callback in `pieces.ts`. Landing then decrements the reset counter and increments the restored stock. A restored full rack becomes 25; a non-full rack can subsequently overproduce because reservations became negative. Full reconciliation clears trips and does not have this race.

The browser regression uses the real forge, slice loader and flight updater: start with 23 rails, launch one, replace the shared forge with 24, then land the old flight. Before the fix it reports `rails=25, expected=24` and one mesh at `25/24`. The affected production code matches build `b19c6ba3a5fa` (no diff in forge, stations, look-kit, depot or pieces against the audited checkout).

The fix gives local pours a generation. Replacing or resetting forge state invalidates old callbacks before they can credit stock or decrement current reservations. The replacement also redraws the rack immediately. This keeps existing shared-state ownership, message shapes, saved shapes and production timing. A separate draw bound protects the GPU; it is not the accounting fix.

Session evidence: `/Users/matiasfranco/Developer/boogle-daily/.look/playtest/mw1kz9dd-y00icjb2.jsonl`: rails taken at 13.2 s, **logs** deposited into Q1 at 16.6 s, validation error at 19.1 s. Although filed under the November 3 playtest, the JSONL timestamps are November 4 UTC. These timings fit a refill interrupted by reconciliation; they do not establish that reconciliation occurred then.

## Capacity and count audit

All `InstancedMesh`, `kitBatch`, `kitLogs`, `logStackMesh`, dynamic `.count` assignments and count increments under `src/proto/place` were inspected. No nested AGENTS.md exists under `src/proto` in this checkout.

| Batch | Capacity and conclusion |
| --- | --- |
| Forge rack | `TUNE.rackMax = 24`. Reproduced overflow via surviving landing callback. Fixed accounting and bounded draw/write loop. |
| Train wheels | 24; allocated at startup even before trains unlock. Two lines × three cars × four wheels = 24, allocated once; motion only updates matrices. No normal path to 25. Added allocation guard. Machine wheels similarly bounded at 8. |
| Cart logs | `CART.load = 24`. Load assignment takes `min(CART.load, ...)`; restored load validates against 24; unloading resets it to zero. No incrementing arrival callback on this batch. Added draw/write bound. Cart rails likewise bounded at 16. |
| Q5 station rails | Bill allocates 24. Station log meshes allocate **56**, including T1/F1/Q2/Q5 whose log bills say 24. Q1 rails allocate 6, not 24. Snapshot stock validation allows up to 400, so oversized Q5 stock was another possible 24-slot overflow, though no such state is recorded here. Bounded station log/rail/stone counts and writes; stock collider uses the displayed log height. Logical stock is retained. |
| Track parts and static scenery | Track batches derive capacity from the exact kind histogram and route each matrix to a unique index. Trees, rocks, land trees, rings/posts, chains, buoys and greybox rollers allocate from their loop lengths; no later count growth. Any derived 24 here remains fixed at allocation. |
| Station kit parts and pictograms | 64 per part, 256 rollers, 16 pictograms. Added guards before count increments and writes. |
| Carried rails and stone | 16 each (`PACK.carry`), not 24. Counts now bounded independently of inventory. |
| Crystals | 7, not 24. Restored lists filter valid indices but can contain duplicates. Bound the displayed count; no saved-shape change. |
| Folk and gift fragments | 53 heads/coats, 212 limbs, 106 held items; 14 gift boards. Normal population/fragment construction already fits. Added guards before packed instance writes/count growth. |
| Other dynamic counts | Flight pools (96 logs/rails, 32 stones), dropped piles (64 each), survey stakes (80), lamps (120), blobs (4096), museum bits (720), machine cradle (40) and rail rack (12), depot rack (48 logs/40 rails) already bound their loops/counts. |

## Verification and limits

Regression: `dev/look/evals/place-forge-reconcile.ts`, through the existing look broker with `proto=place&coop=1`. It asserts full-snapshot cancellation, old/new flights together, refill stopping at 24 and reset during flight; each check also scans scene instance counts. No new browser harness or unit-test suite.

Evidence manifests (relative to this checkout):

- `.look/evidence/1793767560692-52171/evidence.json`: expected before-fix regression failure, before GPU submission.
- `.look/evidence/1793767720117-56454/evidence.json`: all four regression assertions passed; no scene overflow or graphics errors; completed game frames advanced. Opened `forge-after-still.png` and `forge-after-motion.png`: the full rail stack remains visible in front of the forge across the sampled frames. This answers the rack-visibility question, not real-time smoothness.
- `.look/evidence/1793767853667-63764/evidence.json`: full place bot passed every expected beat in 33 minutes of game time (113 seconds wall time), with 78 checkpoints and no errors. Opened `run/end-still.png`: avatar and completed-world scenery render at the end, with the bot's completion log visible. This was solo; the optional together beat was not marked.
- `.look/evidence/1793767783163-60852/evidence.json`: an initial invocation omitted `shot=play` and started the preview instead; timed out without running the bot. Its report and end still were inspected.
- `.look/evidence/1793767819447-63130/evidence.json`: the next invocation used an overly short 120-game-second stall limit and stopped during T3 delivery. Its report and end still were inspected: player and Station 3 stock still rendered, no graphics errors. The normal-limit run above completed T3 and all subsequent expected beats.

`npx prettier --write` ran on every changed file; `npm run check` passed (lint, typecheck, unit tests, registry, level, assets and production build). All runs held source stable, and production source was unchanged afterward; this report was completed after verification. Grant's Safari device, exact saved room/timing, two-peer reconciliation over the network and real-time feel remain unverified.

`npm run inflight` was not run because it fetches from GitHub, contrary to this task's local-network-only restriction. Cached remote refs were inspected instead. No push or ship is authorized or performed. DESIGN.md principle: **8. Designed for drop-in, drop-out**.
