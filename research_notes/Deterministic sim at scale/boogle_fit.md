# Boogle's shared sim today (codebase read, read-only)

## What does Boogle's deterministic pipeline already do?

### Takeaway
Boogle already runs a Factorio-style host-stamped lockstep with automatic resync: 10 ticks/s, edits stamped 3 ticks ahead, one combined uint32 hash every 20 ticks, chunked JSON snapshots with pending edits for late joiners, and an active-cell water sim. Gaps are diagnosability (single combined hash), full-scan hashing, and full-snapshot-only recovery.

### Cited Findings
- `TICK_MS = 100`, `DELAY = 3` (host stamps edits 3 ticks ahead), `HASH_EVERY = 20` (2 s), `LAG = 1.5`, `LEAD = 2` (< DELAY so stamped edits arrive in time), `MAX_STEPS = 5` ticks per frame, `CHUNK = 7000` chars per snapshot message (16 KB cap), `MAX_CHUNKS = 400`. — [src/world/sync.js](../../src/world/sync.js) lines 20-30
- Wire protocol: `w:edit`, `w:need`, `w:edits {ht, list:[{tick,seq,e}]}`, `w:c`, `w:hash {tick,h,ht}`, `w:snap` chunks of JSON `{snap, pend, seq, ht}` where `pend` are stamped-but-unapplied edits so a joiner misses none. A client that gets an edit for a past tick, or a hash mismatch, sends `w:need` and replaces its whole state. — [src/world/sync.js](../../src/world/sync.js) header comment
- `worldHash()` folds `world.tick` and every registered state's `hash()` into one uint32 with an FNV-style multiply; the wire carries only that combined value, so a mismatch does not say which state diverged. Resync requests are throttled to 1/s per client, snapshot serving to once per 1.5 s per peer. — [src/world/sync.js](../../src/world/sync.js) lines 190-240
- Snapshots are `JSON.stringify` of `{tick, seed, epochMs, data}`; water serializes as a sparse `[idx, depth, ...]` list. — [src/world/sync.js](../../src/world/sync.js); [src/sim/water.js](../../src/sim/water.js)
- Water hash is FNV-1a over every non-zero cell (index + depth) plus sources: an O(N) scan of the full grid each time it is called. — [src/sim/water.js](../../src/sim/water.js) `hash()`
- Water already sleeps settled cells: `act[c]` quiet-tick countdown (`quietTicks = 6`), movers wake neighbours, external changes must call `wake()`, and `load()` waking everything is claimed state-equivalent to an uninterrupted run. Sweep order alternates with tick parity. — [src/sim/water.js](../../src/sim/water.js) header
- Grid is `GRID_RES = 129` (129x129 = 16,641 cells); the simulated water region is a padded bounding box of land above a threshold, so open ocean is not simulated. — [src/constants.js](../../src/constants.js); [src/sim/water-region.js](../../src/sim/water-region.js)
- Principles: integers, fixed order, fixed tick, mulberry32; "Measure before optimizing; when you do optimize the sim, sleep settled regions (active-cell lists) before reaching for workers or the GPU." Players 1-6, drop-in/out. — [DESIGN.md](../../DESIGN.md)
- Ball physics (cannon-es floats) is owner-authoritative and state-synced, outside the deterministic sim. — [DESIGN.md](../../DESIGN.md) "Clear authority"

### Inferences
- Boogle's split (deterministic integer grid + state-synced float physics) is the same hybrid Teardown landed on in 2026.
- At 16,641 cells the full-scan hash every 2 s is negligible; it becomes the thing to fix only if the grid grows (e.g. 513x513 = 263k cells) or hashing moves to every tick.

### Gaps
- No profiling data was gathered for this note (read-only task); per-tick cost of water.step at current size is unknown here.
