# Points of interest, secrets and wave function collapse

## How do games place POIs and secrets deterministically and evenly?

### Takeaway
Use blue-noise placement (Poisson disc, or Minecraft-style jittered grid with spacing/separation and a per-feature salt) with every random draw coming from a seeded RNG, then filter candidates by terrain rules. Salting per feature keeps one feature's layout stable when another feature is added.

### Cited Findings
- Blue noise suits object placement because it avoids dense clusters and sparse gaps; generation options include Lloyd relaxation, Poisson disc sampling ("simpler if no Voronoi library"), recursive Wang tiles, precomputed blue-noise textures — [Red Blob Games, Noise functions and map generation](https://www.redblobgames.com/articles/noise/introduction.html)
- Bridson 2007: modified dart throwing gives Poisson disk samples in O(N), easy in any dimension — [Bridson, SIGGRAPH 2007 sketch](https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf)
- Minecraft `random_spread` structure placement: grid of attempts every `spacing` chunks; each attempt offset in 0..spacing-separation-1 per axis (linear or triangular); `separation` sets minimum distance; integer `salt` randomises per structure set; `frequency` is the chance per attempt; `exclusion_zone` keeps sets apart; terrain/biome can still veto — [Minecraft Wiki, Structure set](https://minecraft.wiki/w/Structure_set)
- `concentric_rings` places a fixed count of structures in rings around the origin, then searches nearby for a preferred biome — [Minecraft Wiki, Structure set](https://minecraft.wiki/w/Structure_set)
- Olsen: guaranteeing per-seed playability requires analyse-and-retry; instead tune so criteria hold statistically (~99%) — [Olsen 2004](https://web.mit.edu/cesium/Public/terrain.pdf)

### Inferences
- For a 129² island, Bridson with a mulberry32 stream is cheap (tens of points). A jittered grid is even simpler and its result is independent of iteration order, which is attractive for determinism and for adding features later.
- Secrets fit Boogle's "Leave something for the next visitor" and "Toys before chores": e.g. buried items in diggable sand placed by a per-feature salted RNG, only in cells the dig mask allows (`EDIT_MIN_CM..EDIT_MAX_CM` in `src/world/terrain-logic.js`).
- Using a fixed retry budget with deterministic rerolls (seed+attempt) instead of open-ended loops keeps generation time bounded on phones.

### Gaps
- No primary source found on how specific games hide "secrets" procedurally; recommendations are inference.

## Is wave function collapse (Stålberg, Bad North, Townscaper) a fit for Boogle's islands?

### Takeaway
WFC is a local constraint solver: great at making hand-made tiles fit together (Bad North dioramas, Townscaper's marching-cubes-on-irregular-grid), weak at large-scale structure, and it can hit contradictions. For Boogle's smooth sand heightfield it is a poor fit for the terrain itself, but a reasonable fit for small decorative layers (rock clusters, boardwalks, hut props) placed on top.

### Cited Findings
- WFC alternates observation (collapse the lowest-entropy cell, weighted by pattern frequency) and propagation; contradictions (a cell with no valid states) stop it; deciding solvability is NP-hard but contradictions are "surprisingly rare" — [mxgmn/WaveFunctionCollapse](https://github.com/mxgmn/WaveFunctionCollapse)
- Bad North used a heuristic favouring tiles that keep the observed zone navigable; Townscaper combined WFC with marching cubes on irregular grids; Caves of Qud applies WFC in multiple passes — [mxgmn/WaveFunctionCollapse](https://github.com/mxgmn/WaveFunctionCollapse)
- Stålberg's 2018 Everything Procedural talk covers WFC theory, implementation and tooling for Bad North's island dioramas built from handcrafted tilesets — [80.lv](https://80.lv/articles/using-wave-function-collapse-algorithm-for-dioramas); video referenced in a course handout as https://www.youtube.com/watch?v=0bcZb-SsnrA — [Telecom Paris lecture PDF](https://perso.telecom-paris.fr/kum/lecture/2020-21/igr205/WaveFunctionCollapse-EM.pdf)
- Townscaper is "the latest instalment in an ongoing exploration of tile-based procedural generation" — [MCV/Develop](https://www.mcvuk.com/business-news/when-we-made-townscaper/)
- Dual-grid / marching-squares tiling (popularised by Stålberg): tiles sit on a half-cell-offset grid and pick their look from the four corner states, so binary terrain needs at most 2⁴ = 16 tiles (sources disagree on reduced counts, e.g. 14→5 vs 47→15) — [TileWorldCreator docs](https://giantgrey.gitbook.io/tileworldcreator-v4-documentation/dual-and-standard-grid); [Boris the Brave, Sylves marching squares](https://boristhebrave.com/docs/sylves/1/articles/tutorials/marching_squares.html)
- Boris the Brave: basic WFC skips backtracking because it is rarely needed; propagation uses a queue and support counts; because constraints are local, WFC "rarely produces large-scale structure", so pair it with another technique for macro layout — [Boris the Brave, WFC explained](https://www.boristhebrave.com/2020/04/13/wave-function-collapse-explained/)

### Inferences
- If WFC is used, determinism requires: integer weights, a seeded RNG, a fixed tie-break for equal entropy (lowest index), and a deterministic recovery on contradiction (restart with seed+1, bounded attempts). Float Shannon entropy can be replaced with "fewest remaining options" (Boris's equal-weight case) to stay integer.
- Boogle's DESIGN.md values slapstick, smooth diggable sand and water flow; tile-based terrain would fight dig/pile edits at cell resolution. Macro shape should come from fields + erosion; WFC only for optional prop clusters.

### Gaps
- Could not access Stålberg's talk transcript; Bad North generation order, tileset size and contradiction handling are unverified.
