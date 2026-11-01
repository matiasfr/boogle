# Determinism, phone performance and fit with Boogle's code

## What breaks seed-determinism in a JS world generator, and how do others keep maps reproducible?

### Takeaway
Integer arithmetic, `Math.imul` hashing and seeded mulberry32 are reproducible everywhere; transcendental `Math` functions are not guaranteed to be. Generator code changes also change maps (mapgen4 says so explicitly), so a room must pin a generator version or persist its base heightfield.

### Cited Findings
- MDN: "Many Math functions have a precision that's implementation-dependent... different browsers can give a different result. Even the same JavaScript engine on a different OS or architecture can give different results!" — [MDN, Math](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math)
- Boogle already banned native trig in the shared sim because Math.sin/cos/atan2 differ between Firefox and Chrome — local commit 0b0b834 "Ban native trig in the deterministic shared sim" (AGENTS.md rule) — [AGENTS.md](../../../../AGENTS.md)
- mapgen4's April 2023 code changes mean maps "won't exactly match previously generated maps" — output depends on code version as well as seed — [Red Blob Games, mapgen4](https://www.redblobgames.com/maps/mapgen4/)
- mapgen2 reproduces a map from seed plus parameters stored in a share URL — [Red Blob Games, mapgen2](https://www.redblobgames.com/maps/mapgen2/)
- Priority-Flood is O(n) for integer heights vs O(n log n) for floats — integer grids are also faster for hydrology — [arXiv 1511.04463](https://ar5iv.labs.arxiv.org/html/1511.04463)
- Minecraft derives structure placement from world seed, position and an integer salt per structure set — [Minecraft Wiki, Structure set](https://minecraft.wiki/w/Structure_set)

### Inferences
- Boogle's current base terrain (`src/adapters/terrain.js` `naturalHeight`) uses `Math.exp` and `Math.hypot` plus float fbm, then `Math.round(h*100)` in `src/world/terrain-edits.js`. Today all peers compute the same single island, so a 1-ulp difference only matters if a value lands near a .5 cm rounding boundary; with per-room seeds the number of opportunities multiplies. A per-room generator should be integer-only end to end (as `hash2` in `src/math.ts` already is, though `valueNoise`/`fbm` interpolate in floats).
- Two safe designs: (a) every peer regenerates from `{seed, genVersion}` and the snapshot hash catches mismatches; (b) the host generates and the base heightfield (129² Int16 = ~33 KB raw, compressible) travels in the snapshot. (a) is cheaper on the wire and fits "sync edits, not state"; (b) is robust to generator edits. Recommended: (a) plus storing `genVersion` in the persisted snapshot so old rooms keep their island when the generator changes (keep old versions or fall back to (b) for them).

### Gaps
- No measurement of actual cross-browser divergence of Math.exp/hypot for Boogle's inputs.

## How fast can a full integer pipeline run at Boogle's grid size?

### Takeaway
At 129x129 (16,641 cells) a complete integer pipeline — shape + fbm, 50 iterations of Olsen thermal erosion, bucket-queue Priority-Flood, flow accumulation — measured ~7 ms warm in Node on an Apple M1 Max (first-run JIT ~21 ms). Even at 5-10x slower on a low-end phone this is well under 250 ms, so generation can run once at room creation on the main thread with no worker.

### Cited Findings
- Olsen 2004: base terrain + 50 iterations of erosion in <2 s at 512² (262k cells) on a 2004 PC; Tribal Trouble did synthesis + erosion for 512² maps in 2 s — [Olsen 2004](https://web.mit.edu/cesium/Public/terrain.pdf)
- Local prototype (scratchpad file, not committed; Node v24.11.1, Apple M1 Max): per seed — generate 0.8 ms, thermal x50 3.8-4.1 ms, Priority-Flood 0.5-1.8 ms, flow accumulation 2.0-2.3 ms, total 7.2-9.1 ms warm; first seed 21 ms including JIT warm-up; same seed twice produced identical hashes. (Own measurement; no URL.)
- An earlier naive version (re-sorting priority keys each pop, allocating neighbour arrays per cell) took 37-60 ms — data-structure choice matters more than algorithm choice at this size. (Own measurement.)
- Boogle grid facts: `GRID_RES = 129`, `GRID_SIZE = 160` m, so CELL = 1.25 m; heights stored in cm as Int16; water sim region is derived from base terrain below -150 cm — `src/constants.ts`, `src/world/water-world.js`, `src/world/terrain-edits.js` (local code)

### Inferences
- Phones: no external benchmark found; assume a 4-10x slowdown versus an M1 Max for scalar JS, giving ~30-90 ms. Acceptable once per room join.
- Avoid per-cell allocations and sorts; use typed arrays and bucket queues.

### Gaps
- No phone measurement was taken; the multiplier is an assumption.

## What in Boogle's code must change to support per-room islands?

### Takeaway
The island is baked at module import from constants, and several systems hard-code positions on it. Per-room generation needs (1) terrain built after the room seed is known, (2) layout anchors (court, spawn, garden patch, spring) produced by the generator instead of constants, and (3) validation that the generated island satisfies gameplay invariants.

### Cited Findings (local code, read-only inspection)
- `src/adapters/terrain.js` computes `heights[][]` at import time from `naturalHeight` (radial distance with fbm wobble, a Gaussian hill at (-12,-6), bumps, and a sea falloff) and flattens a court at `COURT` — local file
- `src/world/terrain-edits.js` quantises base to cm at import; editability = beach band `EDIT_MIN_CM..EDIT_MAX_CM` (-120..160 cm) or court, excluding the mushroom garden — local file
- `src/sim/mushrooms.ts` fixes `PATCH = { i0: 78, j0: 52, w: 10, h: 10 }`; `COURT`, `SPAWN`, `BALL_SPAWN`, `ISLAND_R` are constants used by `terrain.js`, `player.js`, `ball.js`, `props.js`, `boogler.js`, `main.js` — local files
- `src/world/sync.ts` holds `world.seed` (default 20261028) and snapshots carry `{tick, seed, epochMs, data}`; terrain state serialises only deltas, assuming every peer has the same base — local file
- DESIGN.md principles: determinism from day one (integers, seeded RNG, integer hashing for noise), sync edits not state, small and readable, measure before optimising, leave something for the next visitor — [DESIGN.md](../../../../DESIGN.md)

### Inferences
- Because the garden persists (principle 9), a room's island must never change under an existing garden: generate once from the room's seed and pin genVersion in the snapshot.
- The seed should be derived from the room name with an integer string hash (FNV-1a like `hashStr` in terrain-logic.js) so `?room=beach` always yields the same island and needs no lobby (principle 8). Keep `beach` mapped to today's hand-built island for continuity.

### Gaps
- Did not check `src/render/props.ts` and `src/boogler/boogler.js` in detail for every hard-coded coordinate.
