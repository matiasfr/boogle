# Erosion, rivers, lakes and springs

## Which erosion methods fit an integer grid and a phone budget?

### Takeaway
Olsen's 2004 speed-optimised thermal erosion and his "inverted" variant are tiny cellular automata (lowest Von Neumann neighbour, in place, move half the excess) that map one-to-one onto integers and onto Boogle's own water rule; ~50 iterations suffice. Particle (Beyer) and pipe-model (Mei) hydraulic erosion look better but are float-heavy; stream-power methods (Cordonnier, Tzathas) are the state of the art for large terrains and overkill here.

### Cited Findings
- Thermal erosion (Musgrave et al. 1989): material on a slope steeper than talus angle T moves downhill; reference version distributes `c*(dmax-T)*di/dtotal` to all lower Moore neighbours with c≈0.5 to avoid oscillation — [Olsen 2004, Realtime Procedural Terrain Generation](https://web.mit.edu/cesium/Public/terrain.pdf)
- Olsen's four speed changes: Von Neumann instead of Moore neighbourhood; move material only to the lowest neighbour; move more per step (Δh = dmax/2); write the heightmap in place rather than via a difference map. Result: 6x faster (500 iterations on 512² in 10 s vs 60 s on 2004 hardware) with ~5% lower erosion score — [Olsen 2004](https://web.mit.edu/cesium/Public/terrain.pdf)
- "No more than 50 iterations" are needed to show thermal erosion's distinct effects; hydraulic erosion needs ~100 — [Olsen 2004](https://web.mit.edu/cesium/Public/terrain.pdf)
- Olsen's new algorithm: identical to optimised thermal erosion but with the check inverted (`if 0 < dmax <= T`), so steep slopes stay and gentle areas level out — producing flat buildable areas plus cliffs; 50 iterations from scratch in <2 s for 512² (2004 PC); the paper calls this fast enough for runtime generation — [Olsen 2004](https://web.mit.edu/cesium/Public/terrain.pdf)
- Base terrain (noise + Voronoi, perturbed) synthesised in 0.83 s at 512², 2.7 s at 1024² — [Olsen 2004](https://web.mit.edu/cesium/Public/terrain.pdf)
- Playability: guaranteeing every seed meets criteria needs an iterate-and-test loop, judged too costly at runtime; instead tune the generator until criteria hold "in, say, 99% of the cases" statistically. Used in shipped game Tribal Trouble (maps up to 512², synthesis + erosion in 2 s) — [Olsen 2004](https://web.mit.edu/cesium/Public/terrain.pdf)
- Mei, Decaudin & Hu 2007 (Pacific Graphics): hydraulic erosion on GPU via a "virtual pipes" shallow-water model; textures store terrain height, water height, sediment, outflow flux and velocity — [hgpu.org listing](https://hgpu.org/?p=2256); [Jákó & Tóth 2011 extension](https://diglib.eg.org/items/0a286bee-1fc3-4e22-a717-81a5301a7e9b/full)
- Particle/droplet erosion: Hans Theobald Beyer's thesis "Implementation of a method for hydraulic erosion"; implementations expose particle count, lifetime, erosion radius, inertia, capacity, evaporation rate — [erodr README](https://github.com/henrikglass/erodr)
- Cordonnier et al. 2016 (Eurographics, CGF 35(2)): combines tectonic uplift and fluvial erosion via the stream power equation over a stream graph covering the domain, then blends landform kernels into a DEM; claims large realistic terrains at low cost — [Eurographics DL](https://diglib.eg.org/handle/10.1111/cgf12820)
- Tzathas, Gailleton, Steer, Cordonnier 2024 (Eurographics): analytical solutions of the stream power law make time a parameter, so one can jump to any erosion stage without iterating; extended from 1D to 2D heightmaps with a multigrid-accelerated iteration — [Eurographics DL](https://diglib.eg.org/handle/10.1111/cgf15033)

### Inferences
- Olsen's optimised rule is the same shape as Boogle's `src/sim/water.js` rule (Gauss-Seidel, fixed scan order, move at most half the difference so pairs never swap). An integer "sand slump" pass with talus in cm reuses that proven design and its determinism argument.
- Stream-power and particle erosion are worth borrowing only as ideas (carve a river valley along a drainage path) rather than full sims.

### Gaps
- Could not retrieve Beyer's thesis or Mei's paper text; cost numbers for those are not stated.

## How should rivers, lakes and springs be placed so water actually behaves?

### Takeaway
Fill or breach depressions with Priority-Flood (O(n) on integer heights, ~20 lines), compute steepest-descent receivers and flow accumulation, then pick a spring high on a long drainage path. This guarantees that the spring's stream reaches the sea or a deliberate lake in Boogle's water sim instead of pooling in a noise pit.

### Cited Findings
- Priority-Flood (Barnes, Lehman, Mulla 2014): push edge cells into a priority queue by elevation; pop lowest; raise each unvisited neighbour to at least the popped height; result has no pits or digital dams — [arXiv 1511.04463](https://ar5iv.labs.arxiv.org/html/1511.04463)
- Complexity: O(n) for integer DEMs (optimal), O(n log n) for floats; pseudocode "only 20 lines", C++ reference "under a hundred lines"; works on 4-, 8- and n-connected grids — [arXiv 1511.04463](https://ar5iv.labs.arxiv.org/html/1511.04463); code [r-barnes/Barnes2013-Depressions](https://github.com/r-barnes/Barnes2013-Depressions)
- Priority-Flood+ε raises cells by the smallest representable increment so every cell has a strictly descending path to the edge (no flats); a watershed-labelling variant gives each outlet's catchment a label — [arXiv 1511.04463](https://ar5iv.labs.arxiv.org/html/1511.04463)
- mapgen2 drainage: each corner points to its lowest neighbour; seeds and traversal order pick among many valid graphs; rivers are a random subset of streams starting from filtered potential sources (elevation, slope, rainfall); drainage through lakes is routed so "any drainage leading into a lake will eventually lead out" — [Red Blob Games, Polygon map generation](https://www.redblobgames.com/maps/polygon-map-generation/)
- Red Blob's rivers page lists gravity (downhill) and tributaries as the properties usually implemented — [Red Blob Games, rivers](https://www.redblobgames.com/maps/rivers/)
- mapgen4 simulates evaporation, wind and rainfall to place rivers and biomes on a painted map; a `lg_min_flow` slider controls how many small streams appear — [Red Blob Games, mapgen4](https://www.redblobgames.com/maps/mapgen4/)

### Inferences
- In Boogle the integer water sim is the ground truth for where water goes. Worldgen only needs to (1) guarantee a descending path from spring to sea or to an intended lake, and (2) seed the spring source. Integer Priority-Flood with an array-of-buckets queue gives that; with integers, "+ε" becomes +1 cm per step, which Boogle's water rule tolerates (diff 1 never moves, so a 1 cm stair can stall a stream — use a minimum 2 cm drop per cell along the carved path).
- A local prototype (scratchpad, not in repo) filled every pit on a noisy 129² island and got ~800-1300 lake cells per seed — too many flat lakes. Better: breach small pits (carve) and keep only the one or two largest depressions as intended lakes/ponds.

### Gaps
- No source found on spring placement specifically in games; the recommendation (high cell with long downstream path) is inference from drainage literature.
